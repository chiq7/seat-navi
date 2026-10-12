export type EventDaySource = { id: string; title: string; url: string; checkedAt: string };
export type EventDayActionKind = "goods" | "cd" | "fc-lottery" | "fc-benefits" | "check-in" | "member-lottery" | "other";
/** [] means no additional requirement; null means not confirmed yet. */
type ActionRequirements = { conditions: string[] | null; preparation: string[] | null };
export type DayBooth = {
  id: string; kind: EventDayActionKind; number: number; label: string; hours: string | null; place: string | null; floor: string | null;
  color: string; sourceIds: string[];
  map: { venueMapId: string; x: number; y: number; status: "reconstructed"; sourceId: string } | null;
} & ActionRequirements;
export type DayRemoteAction = {
  id: string; kind: EventDayActionKind; label: string; hours: string | null; place: string | null; sourceIds: string[];
} & ActionRequirements;
export type DayDeadline = {
  id: string; actionId: string; kind: "lottery" | "exchange" | "reception";
  label: string; time: string | null; note: string; sourceIds: string[]; derived?: boolean;
};
export type DayActivity = { id: string; actionId: string; kind: EventDayActionKind; label: string; detail: string; sourceIds: string[] };
export type DayReminder = { id: string; actionIds: string[]; kind: EventDayActionKind; label: string; detail: string; sourceIds: string[] };
export type EventDaySummary = {
  id: string; artist: string; tour: string; venue: string; venueSlug: string; eventHref?: string;
  date: string; dateLabel: string; state: "past-example" | "past" | "upcoming";
  open: string | null; start: string | null; scheduleSourceId: string;
  venueMapId: string | null; hashtags: string[];
  booths: DayBooth[];
  remoteActions: DayRemoteAction[];
  deadlines: DayDeadline[];
  activities: DayActivity[];
  reminders: DayReminder[];
  sources: EventDaySource[];
};

/** Stable IDs, not source-array positions, join the reader and the exported sheet. */
export function getEventDayActions(day: EventDaySummary) {
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
  const local = day.booths.map(b => ({ ...b, locationType: "booth" as const }));
  const remote = day.remoteActions.map(a => ({ ...a, locationType: "area" as const,
    floor: null, map: null, number: null, color: null }));
  return [...local, ...remote].map(action => ({ ...action,
    deadlines: day.deadlines.filter(d => d.actionId === action.id).sort(byId),
    benefits: day.activities.filter(a => a.actionId === action.id).sort(byId),
    reminders: day.reminders.filter(r => r.actionIds.includes(action.id)).sort(byId),
  }));
}

export function eventDayDeadlineLabel(kind: DayDeadline["kind"]) {
  return kind === "exchange" ? "引換締切" : kind === "lottery" ? "抽選締切" : "受付締切";
}

export function eventDayActionHours(action: ReturnType<typeof getEventDayActions>[number]) {
  return action.hours ?? (action.locationType === "booth" ? "未発表" : "未確認");
}

/** Example drafts never include unpublished links. Public summaries use an approved canonical URL. */
export function eventDayShareText(day: EventDaySummary): string {
  return [
    day.state === "past-example" ? "【過去公演の当日まとめ見本】" : day.state === "past" ? "【終了した公演の当日まとめ】" : "【公演当日まとめ】",
    `${day.artist} ${day.tour}`,
    `${day.dateLabel} ${day.venue}`,
    `開場 ${day.open ?? "未発表"} / 開演 ${day.start ?? "未発表"}`,
    ...day.deadlines.filter(d => d.time).map(d => `${d.label} ${d.time}まで`),
    day.hashtags.join(" "),
  ].filter(Boolean).join("\n");
}

export function eventDayXHref(day: EventDaySummary): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(eventDayShareText(day))}`;
}

export function eventDayFilename(day: EventDaySummary): string {
  return `tixrepo-event-day-${day.id}.png`;
}

export function eventDayDescription(day: EventDaySummary): string {
  return [
    `${day.artist} ${day.dateLabel} ${day.venue}。${day.state === "past-example" ? "終了済み公演の見本。" : day.state === "past" ? "終了した公演の案内。" : ""}`,
    `開場${day.open ?? "未発表"}、開演${day.start ?? "未発表"}。`,
    ...getEventDayActions(day).map(a => [a.label, a.hours ?? (a.locationType === "booth" ? "時間未発表" : ""),
      a.floor ?? "", a.place ?? "場所未確認",
      a.conditions === null ? "対象条件未確認" : a.conditions.join("・"),
      a.preparation === null ? "準備物未確認" : a.preparation.join("・")].filter(Boolean).join("、") + "。"),
    ...day.deadlines.map(d => `${d.label} ${d.time === null ? "時刻未発表" : `${d.time}まで`}。${d.note}。`),
    ...day.activities.map(a => `${a.label}：${a.detail}。`),
    ...day.reminders.map(r => `${r.label}：${r.detail}。`),
    day.venueMapId ? "地図はブースの位置関係図。" : "地図は未掲載。",
    "一般入場ゲートはチケットの指定を確認。",
  ].join(" ");
}

/** Used in tests/editorial review before a summary can be linked to a real event. */
export function validateEventDaySummary(day: EventDaySummary): string[] {
  const errors: string[] = [];
  if (day.eventHref && !/^\/events\/[a-zA-Z0-9-]+$/.test(day.eventHref)) errors.push("公演リンクの形式");
  const sources = new Set(day.sources.map(s => s.id));
  const sourceRefs = [day.scheduleSourceId, ...day.booths.flatMap(b => b.sourceIds),
    ...day.remoteActions.flatMap(a => a.sourceIds),
    ...day.deadlines.flatMap(d => d.sourceIds), ...day.activities.flatMap(a => a.sourceIds),
    ...day.reminders.flatMap(r => r.sourceIds), ...day.booths.flatMap(b => b.map ? [b.map.sourceId] : [])];
  for (const id of sourceRefs) if (!sources.has(id)) errors.push(`出典なし: ${id}`);
  for (const source of day.sources) if (!source.url.startsWith("https://")) errors.push(`出典URL: ${source.id}`);
  for (const value of [day.open, day.start, ...day.deadlines.map(d => d.time)]) {
    if (value !== null && !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value)) errors.push(`時刻: ${value}`);
  }
  const numbers = day.booths.map(b => b.number);
  if (new Set(numbers).size !== numbers.length) errors.push("地図番号が重複");
  const actions = [...day.booths, ...day.remoteActions];
  const actionIds = new Set(actions.map(a => a.id));
  if (actionIds.size !== actions.length) errors.push("用事IDが重複");
  for (const [name, entries] of [["出典", day.sources], ["締切", day.deadlines], ["特典", day.activities], ["注意", day.reminders]] as const) {
    if (new Set(entries.map(e => e.id)).size !== entries.length) errors.push(`${name}IDが重複`);
  }
  for (const d of day.deadlines) if (!actionIds.has(d.actionId)) errors.push(`締切の用事なし: ${d.id}`);
  for (const a of day.activities) if (!actionIds.has(a.actionId)) errors.push(`特典の用事なし: ${a.id}`);
  for (const r of day.reminders) for (const id of r.actionIds) if (!actionIds.has(id)) errors.push(`注意の用事なし: ${r.id}/${id}`);
  for (const tag of day.hashtags) if (!/^#[\p{L}\p{N}_]+$/u.test(tag)) errors.push(`タグの形式: ${tag}`);
  for (const b of day.booths) if (b.map) {
    if (!Number.isFinite(b.map.x) || !Number.isFinite(b.map.y) || b.map.x < 0 || b.map.x > 1 || b.map.y < 0 || b.map.y > 1) errors.push(`地図座標: ${b.id}`);
    if (!day.venueMapId || b.map.venueMapId !== day.venueMapId) errors.push(`地図の会場不一致: ${b.id}`);
  }
  return errors;
}

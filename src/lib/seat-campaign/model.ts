export type SeatKind = "arena" | "stand" | "other";
export const SEAT_KINDS: Record<SeatKind, string> = { arena: "アリーナ", stand: "スタンド", other: "その他" };
export type CampaignEvent = { id: string; title: string; venue: string; date: string; session: string; sourceUrl: string; venueId?: string; accepting?: boolean };
export type SeatInput = { eventId: string; date: string; session: string; seatType: SeatKind; block: string; row: string; number: string };
export type CampaignReport = SeatInput & { id: string; createdAt: string; source: "self" | "external"; status: "received" | "accepted" | "withdrawn" | "rejected"; sourceUrl?: string; originId?: string };
export type KnownBlock = { seatType: SeatKind; block: string; sourceUrl: string };
export type CampaignRow = { key: string; seatType: SeatKind; block: string; row: string; numbers: string[]; acceptedNumbers?: string[] };
export type CampaignSummary = { event: CampaignEvent; updatedAt: string; selfSubmissions: number; selfLocations: number; rows: CampaignRow[]; externalLocations: number; external: CampaignReport[]; excluded: number; missingBlocks: KnownBlock[]; keys: string[]; revision: string; acceptedLocations?: number; acceptedKeys?: string[] };
export type CampaignBaseline = { eventId: string; date: string; session: string; keys: string[]; savedAt: string };
export const UNREPORTED_NOTE = "報告がない場所は未確認です。席がないことを示すものではありません。";
export function normalizeLabel(value: string): string { return value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase(); }
function shortLabel(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`${name}を入力してください。`);
  const text = normalizeLabel(value);
  if (!text || text.length > 32 || /[\u0000-\u001f<>]/.test(text)) throw new Error(`${name}は32文字以内で入力してください。`);
  return text;
}
export function parseSeatInput(value: unknown, event: CampaignEvent): SeatInput {
  if (!value || typeof value !== "object") throw new Error("入力を確認してください。");
  const v = value as Record<string, unknown>;
  if (v.eventId !== event.id || v.date !== event.date || v.session !== event.session) throw new Error("公演・日付・開演回が一致しません。ページを開き直してください。");
  if (typeof v.seatType !== "string" || !Object.hasOwn(SEAT_KINDS, v.seatType)) throw new Error("席種を選んでください。");
  const block = shortLabel(v.block, "ブロック／階"), rawRow = shortLabel(v.row, "列");
  const row = /^\d+$/.test(rawRow) ? String(Number(rawRow)) : rawRow;
  if (!/^(?:[1-9]\d{0,3}|[A-Z]{1,3})$/.test(row)) throw new Error("列は1つだけ入力してください（数字または英字）。範囲では登録できません。");
  const rawNumber = shortLabel(v.number, "番号").replace(/[〜～~－–—]/g, "-");
  if (!/^\d{1,5}(?:-\d{1,5})?$/.test(rawNumber)) throw new Error("番号は数字1つ、または10-19のような範囲で入力してください。");
  const parts = rawNumber.split("-").map(Number);
  if (parts.some(n => n < 1)) throw new Error("番号は1以上で入力してください。");
  if (parts.length === 2 && parts[0] >= parts[1]) throw new Error("番号の範囲は小さい番号から入力してください。");
  return { eventId: event.id, date: event.date, session: event.session, seatType: v.seatType as SeatKind, block, row, number: parts.join("-") };
}
export function samePerformance(v: Pick<SeatInput, "eventId" | "date" | "session">, event: CampaignEvent) { return v.eventId === event.id && v.date === event.date && v.session === event.session; }
export function locationKey(v: SeatInput) { return JSON.stringify([v.seatType, v.block, v.row, v.number]); }
const order = (a: string, b: string) => a.localeCompare(b, "ja", { numeric: true });
export function numberLabel(n: string) { return n.includes("-") ? `${n.replace("-", "〜")}番（範囲報告）` : `${n}番`; }
export function rowText(row: CampaignRow) { return `${SEAT_KINDS[row.seatType]} ${row.block} / ${row.row}列 / ${row.numbers.map(numberLabel).join("・")}`; }
export function summarizeCampaign(event: CampaignEvent, reports: CampaignReport[], updatedAt: string, knownBlocks: KnownBlock[] = []): CampaignSummary {
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error("更新日時を確認できません。");
  const self = new Map<string, SeatInput>(), external = new Map<string, CampaignReport>(), ids = new Set<string>();
  let selfSubmissions = 0, excluded = 0;
  const accepted = new Set<string>();
  for (const report of reports) {
    if (!samePerformance(report, event) || ids.has(report.id) || !["received", "accepted"].includes(report.status)) { excluded++; continue; }
    ids.add(report.id);
    let seat: SeatInput;
    try { seat = parseSeatInput(report, event); } catch { excluded++; continue; }
    if (report.source === "self") { selfSubmissions++; self.set(locationKey(seat), seat); if(report.status === "accepted")accepted.add(locationKey(seat)); }
    else if (report.source === "external" && report.status === "accepted" && report.originId && /^https:\/\//.test(report.sourceUrl ?? "")) {
      external.set(JSON.stringify([report.originId, locationKey(seat)]), { ...report, ...seat });
    } else excluded++;
  }
  const groups = new Map<string, CampaignRow>();
  for (const seat of self.values()) {
    const key = JSON.stringify([seat.seatType, seat.block, seat.row]);
    const group = groups.get(key) ?? { key, seatType: seat.seatType, block: seat.block, row: seat.row, numbers: [], acceptedNumbers: [] };
    group.numbers.push(seat.number); if(accepted.has(locationKey(seat)))(group.acceptedNumbers ??= []).push(seat.number); groups.set(key, group);
  }
  const rows = [...groups.values()].sort((a, b) => order(a.seatType, b.seatType) || order(a.block, b.block) || order(a.row, b.row));
  rows.forEach(row => row.numbers.sort(order));
  const missingBlocks = knownBlocks.filter(b => /^https:\/\//.test(b.sourceUrl) && !rows.some(r => r.seatType === b.seatType && r.block === normalizeLabel(b.block)));
  const keys = [...self.keys()].sort();
  return { event, updatedAt, acceptedLocations: accepted.size, acceptedKeys: [...accepted].sort(), selfSubmissions, selfLocations: self.size, rows, externalLocations: external.size, external: [...external.values()], excluded, missingBlocks, keys, revision: JSON.stringify([event.id, event.date, event.session, keys, selfSubmissions, [...external.keys()].sort(), updatedAt]) };
}
export function campaignChanges(summary: CampaignSummary, baseline: CampaignBaseline | null) {
  if (!baseline || !samePerformance(baseline, summary.event)) return null;
  const before = new Set(baseline.keys), current = new Set(summary.keys);
  return { added: summary.keys.filter(key => !before.has(key)).length, removed: baseline.keys.filter(key => !current.has(key)).length };
}
export function campaignDrafts(summary: CampaignSummary, baseline: CampaignBaseline | null, links: { form: string; summary: string }, localOnly = false) {
  const e = summary.event, header = `${localOnly ? "【動作確認用・未公開／実際の募集に使用しない】\n" : ""}${e.title}\n${e.date} ${e.session} ${e.venue}`;
  const updated = `更新：${new Date(summary.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })} JST`;
  const counts = `本人入力 ${summary.selfSubmissions}件・重複をまとめた座席情報 ${summary.selfLocations}組（未照合を含みます）`;
  const lines = summary.rows.slice(0, 4).map(rowText);
  const reportText = lines.length ? `報告された内容：\n${lines.join("\n")}${summary.rows.length > 4 ? "\n続きは集計ページへ" : ""}` : "まだ座席報告はありません。";
  const changes = campaignChanges(summary, baseline);
  const delta = changes ? `比較の基準から座席情報が${changes.added}組追加・${changes.removed}組除外されました。` : "比較の基準がないため、増減はまだ表示しません。";
  const missing = summary.missingBlocks.length ? `存在の根拠がある区画で、まだ本人入力がない区画：\n${summary.missingBlocks.slice(0, 8).map(b => `${SEAT_KINDS[b.seatType]} ${b.block}`).join("・")}` : "券面で確認できる座席情報をお待ちしています。未確認の区画名は指定していません。";
  return [
    { kind: "募集開始", text: `${header}\n座席情報を集めています。券面で座席が分かった方は、席種・ブロック／階・列・番号を教えてください。集計結果を順次公開します。\n入力：${links.form}` },
    { kind: "途中速報", text: `${header}\n${updated}\n${counts}\n${reportText}\n${UNREPORTED_NOTE}\n集計：${links.summary}\n追加入力：${links.form}` },
    { kind: "追加募集", text: `${header}\n${missing}\n${UNREPORTED_NOTE}\n入力：${links.form}` },
    { kind: "更新報告", text: `${header}\n${updated}\n${counts}\n${delta}\n予想図の変更とは別の集計更新です。配置・方向はこの集計から推定していません。\n${UNREPORTED_NOTE}\n集計：${links.summary}` },
  ];
}

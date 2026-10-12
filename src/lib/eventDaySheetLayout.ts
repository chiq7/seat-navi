import { getEventDayActions, eventDayActionHours, eventDayDeadlineLabel, type EventDaySummary } from "./eventDaySummary";
import { getEventDayMap } from "./eventDayMap";

/** Conservative widths; the self-contained SVG needs neither canvas nor DOM measurements. */
export function eventDayTextWidth(text: string, size: number) {
  return Array.from(text).reduce((sum, c) => sum + size * (/\s/u.test(c) ? .4 : /[\x20-\x7e–]/u.test(c) ? .67 : 1), 0);
}

export function wrapEventDayText(text: string, width: number, size: number): string[] {
  const lines: string[] = [];
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  for (const paragraph of text.split("\n")) {
    // The dictionary can split loanwords such as スク / ラッチ. Keep consecutive kana together.
    const units = Array.from(segmenter.segment(paragraph), part => part.segment).reduce<string[]>((result, unit) => {
      const last = result[result.length - 1];
      if (last && /^[ァ-ヺー]+$/u.test(last) && /^[ァ-ヺー]+$/u.test(unit)) result[result.length - 1] += unit;
      else result.push(unit);
      return result;
    }, []);
    let line = "";
    for (const unit of units.flatMap(u => eventDayTextWidth(u, size) > width - size ? Array.from(u) : [u])) {
      if (line && eventDayTextWidth(line + unit, size) > width - size && !/^[、。！？：；）】」』,.:;!?]/u.test(unit)) {
        if (/[（【「『]$/u.test(line)) { const last = line.slice(-1); lines.push(line.slice(0, -1)); line = last; }
        else { lines.push(line.trimEnd()); line = ""; }
      }
      line += unit;
    }
    lines.push(line.trim());
  }
  return lines;
}

type Action = ReturnType<typeof getEventDayActions>[number];
export type SheetFact = { text: string; tone: "normal" | "hours" | "deadline" | "note" | "strong" };
export function getEventDaySheetFacts(action: Action): SheetFact[] {
  const facts: SheetFact[] = [
    { text: `${action.locationType === "booth" ? "営業時間" : "受付時間"} ${eventDayActionHours(action)}`, tone: "hours" },
    { text: `場所 ${[action.floor, action.place ?? "未確認"].filter(Boolean).join(" ")}`, tone: "normal" },
  ];
  for (const d of action.deadlines) {
    facts.push({ text: `${eventDayDeadlineLabel(d.kind)} ${d.time ?? "未発表"}${d.time ? "まで" : ""}`, tone: "deadline" });
    if (d.note) facts.push({ text: d.note, tone: "note" });
  }
  for (const [label, values] of [["対象", action.conditions], ["準備", action.preparation]] as const) {
    if (values === null) facts.push({ text: `${label} 未確認`, tone: "normal" });
    else for (const value of values) facts.push({ text: `${label} ${value}`, tone: "normal" });
  }
  for (const b of action.benefits) facts.push({ text: b.detail, tone: "normal" });
  for (const r of action.reminders) facts.push({ text: r.label, tone: "strong" }, { text: r.detail, tone: "note" });
  return facts;
}

/** Fact edits identify a new edition, without a fabricated current confirmation timestamp. */
export function eventDayImageVersion(day: EventDaySummary) {
  let hash = 2166136261;
  for (const c of JSON.stringify(day)) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `v2-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function getEventDaySheetLayout(day: EventDaySummary) {
  const width = 720, margin = 30, contentWidth = 660, cardWidth = 320;
  let y = 98;
  const header = [{ text: day.artist, size: 38, step: 46 }, { text: day.tour, size: 24, step: 32 },
    { text: `${day.dateLabel} · ${day.venue}`, size: 22, step: 30 }].flatMap(({ text, size, step }) => {
    const lines = wrapEventDayText(text, 648, size).map(line => { const result = { text: line, size, y }; y += step; return result; });
    y += 4; return lines;
  });
  const timesY = y + 2;
  y = timesY + 94;
  const model = getEventDayMap(day);
  const mapTitleY = y + 28, mapY = y + 44;
  const pinText = (pin: NonNullable<typeof model>["top"][number], cellWidth: number) => ({
    ...pin, lines: wrapEventDayText(pin.booth.label, cellWidth - 54, 24),
  });
  const top = model?.top.map(pin => pinText(pin, 330 / Math.max(1, model.top.length))) ?? [];
  const bottom = model?.bottom.map(pin => pinText(pin, 660 / Math.max(1, model.bottom.length))) ?? [];
  const topHeight = Math.max(100, ...top.map(p => 70 + p.lines.length * 30));
  const bottomHeight = Math.max(100, ...bottom.map(p => 70 + p.lines.length * 30));
  const drawingY = topHeight + 12;
  const mapHeight = model ? drawingY + model.base.height + bottomHeight + 12 : 54;
  y = mapY + mapHeight + 28;
  const actionsTitleY = y + 28;
  y += 46;
  const actions = getEventDayActions(day);
  const cards: { action: Action; x: number; y: number; height: number; heading: string[];
    facts: { lines: string[]; tone: SheetFact["tone"]; size: number; y: number }[] }[] = [];
  for (let i = 0; i < actions.length; i += 2) {
    const pair = actions.slice(i, i + 2).map((action, column) => {
      const heading = wrapEventDayText(action.label, cardWidth - 72, 28);
      let localY = 36 + heading.length * 34;
      const facts = getEventDaySheetFacts(action).map(fact => {
        const size = fact.tone === "deadline" ? 24 : fact.tone === "note" ? 20 : 22;
        const lines = wrapEventDayText(fact.text, cardWidth - 36, size);
        const item = { lines, tone: fact.tone, size, y: localY };
        localY += lines.length * 30 + (fact.tone === "note" ? 8 : 12);
        return item;
      });
      return { action, x: margin + column * 340, y, height: localY + 10, heading, facts };
    });
    const rowHeight = Math.max(...pair.map(card => card.height));
    cards.push(...pair.map(card => ({ ...card, height: rowHeight })));
    y += rowHeight + 20;
  }
  if (!actions.length) y += 54;
  const footerY = y + 18;
  return { width, height: Math.max(1500, footerY + 82), contentWidth, cardWidth, header, timesY,
    mapTitleY, mapY, mapHeight, drawingY, topHeight, bottomHeight, model, top, bottom,
    actionsTitleY, cards, footerY, version: eventDayImageVersion(day) };
}

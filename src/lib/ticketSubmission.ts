/** Same-page retry state: keep the original IDs and payload after either write starts. */
export type TicketSubmission = {
  ticket: Record<string, unknown>;
  seat: Record<string, unknown> | null;
  ticketSaved: boolean;
  seatSaved: boolean;
};
export type TicketInsert = (table: "event_ticket_results" | "seat_reports", row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;

export type TicketFields = {
  area: string; block: string; row: string; number: string; direction: string; floor: string;
  otherSeat: string; lottery: string; ticketType: string; count: string; upgrade: string;
  fcHistory: string; payment: string; comment: string;
};

const lotteries: Record<string, string> = {
  "FC1次": "fc1", "FC2次": "fc2", "一般": "general", "アップグレード": "upgrade",
  "復活当選": "revival", "制作開放": "production",
};
const histories: Record<string, string> = {
  "1年未満": "under_1_year", "1〜3年": "one_to_three_years", "3年以上": "over_3_years",
};
const upgradeResults: Record<string, string> = { "未申込": "not_applied", "当選": "applied_won", "落選": "applied_lost" };

export function makeTicketSubmission(
  id: string, eventId: string, userId: string | null, result: "won" | "lost", fields: TicketFields,
): TicketSubmission {
  const won = result === "won";
  const area = won ? fields.area : "";
  const arena = area === "アリーナ";
  const stand = area === "スタンド";
  const block = arena ? fields.block.normalize("NFKC").trim().toUpperCase().replace(/ブロック$/, "") : "";
  const row = area ? fields.row.normalize("NFKC").trim().replace(/列$/, "") : "";
  const number = area ? fields.number.normalize("NFKC").trim().replace(/番$/, "") : "";
  const common = { id, event_id: eventId, user_id: userId, payment_method: fields.payment || null, comment: fields.comment.trim() || null };
  const ticket = {
    ...common, result, lost_application_count: won ? 0 : 1, ticket_count: fields.count ? Number(fields.count) : null,
    lottery_type: fields.lottery === "FC1次" ? "1次抽選" : fields.lottery === "FC2次" ? "2次抽選" : fields.lottery ? "その他" : null,
    fc_history: fields.fcHistory || null, upgrade_result: won ? upgradeResults[fields.upgrade] ?? null : null,
    seat_type: won && fields.ticketType === "条件付き" ? "restricted" : arena ? "arena" : stand ? "stand" : null,
    seat_block: block || null, seat_row: row || null, seat_number: number || null,
    stand_direction: stand ? fields.direction.trim() || null : null, stand_floor: stand ? fields.floor.trim() || null : null,
    other_seat_info: area && !arena && !stand ? [area === "その他" ? "" : area, fields.otherSeat.trim()].filter(Boolean).join(" ") || area : null,
  };
  // The seat map requires actual arena coordinates and a known lottery type.
  // A partial location remains attached to the ticket result.
  const lottery = lotteries[fields.lottery];
  const positiveInteger = (value: string) => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647;
  const seat = arena && block && positiveInteger(row) && positiveInteger(number) && lottery
    ? { ...common, block, row_num: Number(row), seat_num: Number(number), lottery_type: lottery, fc_history: histories[fields.fcHistory] ?? null }
    : null;
  return { ticket, seat, ticketSaved: false, seatSaved: false };
}

export async function submitTicketRecords(pending: TicketSubmission, insert: TicketInsert): Promise<void> {
  if (!pending.ticketSaved) {
    const { error } = await insert("event_ticket_results", pending.ticket);
    if (error) throw new Error(error.message);
    pending.ticketSaved = true;
  }
  if (pending.seat && !pending.seatSaved) {
    const { error } = await insert("seat_reports", pending.seat);
    if (error) throw new Error(error.message);
    pending.seatSaved = true;
  }
}

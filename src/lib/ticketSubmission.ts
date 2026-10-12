/** Same-page retry state: keep the original IDs and payload after either write starts. */
export type TicketSubmission = {
  ticket: Record<string, unknown>;
  seat: Record<string, unknown> | null;
  ticketSaved: boolean;
  seatSaved: boolean;
};
export type TicketInsert = (table: "event_ticket_results" | "seat_reports", row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;

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

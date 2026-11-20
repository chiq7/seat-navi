import assert from "node:assert/strict";
import test from "node:test";
import { makeTicketSubmission, submitTicketRecords, type TicketFields } from "../src/lib/ticketSubmission.ts";
import { completionResultCard } from "../src/lib/resultCardCompletion.ts";

const blank: TicketFields = { area:"", block:"", row:"", number:"", direction:"", floor:"", otherSeat:"",
  lottery:"", ticketType:"", count:"", upgrade:"", fcHistory:"", payment:"", comment:"" };
const make = (fields: Partial<TicketFields>, result: "won" | "lost" = "won") =>
  makeTicketSubmission("stable-id", "evening-event", null, result, { ...blank, ...fields });

test("a guest reports only a performance and outcome, without manufacturing seat or application data", () => {
  for (const result of ["won","lost"] as const) {
    const { ticket, seat } = make({}, result);
    assert.equal(ticket.event_id, "evening-event");
    assert.equal(ticket.result, result);
    for (const key of ["user_id","seat_type","ticket_count","upgrade_result","lottery_type","comment"]) assert.equal(ticket[key],null);
    assert.equal(seat, null);
    const card = completionResultCard({ event: { id:"e", title:"Show", venue:"Venue", date:null },
      result, lotteryLabel:"", area:"", block:"", standDirection:"", standFloor:"" });
    assert.equal(card.seat, undefined);
  }
});

test("a partial location stays on its ticket; leftover fields never become a location for a loss", () => {
  const fields = { area:"アリーナ", block:"Ａ３ブロック", row:"１１列", number:"１５", comment:" 前方でした " };
  const rough = make(fields);
  assert.deepEqual([rough.ticket.seat_type,rough.ticket.seat_block,rough.ticket.seat_row,rough.ticket.seat_number,rough.ticket.comment],
    ["arena","A3","11","15","前方でした"]);
  assert.equal(rough.seat,null);
  assert.equal(make({...fields,lottery:"その他"}).seat,null);
  assert.equal(make({...fields,row:"3B",lottery:"FC1次"}).seat,null);
  const lost = make({...fields,lottery:"FC1次",upgrade:"当選"}, "lost");
  for (const key of ["seat_type","upgrade_result","seat_block","seat_row","seat_number"]) assert.equal(lost.ticket[key],null);
  assert.equal(lost.seat,null);
  assert.equal(make({area:"2階席以上"}).ticket.other_seat_info,"2階席以上");
});

test("a map seat needs exact coordinates and lottery type; a retry repeats only the missing record", async () => {
  const submission = make({area:"アリーナ",block:"Ｂ４",row:"１２",number:"５",lottery:"FC1次"});
  assert.deepEqual([submission.seat?.id,submission.seat?.event_id,submission.seat?.row_num,submission.seat?.seat_num,submission.seat?.lottery_type],
      ["stable-id","evening-event",12,5,"fc1"]);
  const writes:string[] = [];
  const insert = async (table:string,row:Record<string,unknown>) => {
    writes.push(table + "/" + row.id);
    return { error: writes.length === 2 ? {message:"interrupted"} : null };
  };
  await assert.rejects(submitTicketRecords(submission,insert));
  await submitTicketRecords(submission,insert);
  assert.deepEqual(writes, ["event_ticket_results/stable-id","seat_reports/stable-id","seat_reports/stable-id"]);
});

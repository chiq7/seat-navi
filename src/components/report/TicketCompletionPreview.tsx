"use client";

import { useRef, useState } from "react";
import { ResultCardCompletion } from "./ResultCardCompletion";
import { completionResultCard } from "@/lib/resultCardCompletion";
import { submitTicketRecords, type TicketSubmission } from "@/lib/ticketSubmission";

const EVENT = { id: "42f4c61d6af9abb78c60", title: "World Tour〈RUN IT JAPAN〉", venue: "京セラドーム大阪", date: "2026-09-20" };

/** Development-only route; no Supabase client/import/network write exists in this harness. */
export default function TicketCompletionPreview() {
  const [scenario, setScenario] = useState("won");
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState("");
  const [attempts, setAttempts] = useState({ ticket: 0, seat: 0 });
  const pending = useRef<TicketSubmission | null>(null);
  const locked = useRef(false);
  const card = completionResultCard({ event: EVENT, artistName: "Stray Kids", result: scenario === "lost" ? "lost" : "won", lotteryLabel: "FC1次", area: "アリーナ", block: "D11", standDirection: "", standFloor: "" });
  function reset(value = scenario) { setScenario(value); setDone(false); setStatus(""); setAttempts({ ticket: 0, seat: 0 }); pending.current = null; }
  async function simulate() {
    if (locked.current) return;
    locked.current = true;
    if (!pending.current) pending.current = { ticket: { id: "local-only", result: card.result }, seat: card.result === "won" ? { id: "local-only" } : null, ticketSaved: false, seatSaved: false };
    const counts = { ...attempts };
    try {
      await submitTicketRecords(pending.current, async table => {
        const part = table === "event_ticket_results" ? "ticket" : "seat";
        counts[part]++;
        const fail = (scenario === "ticket-failure" && part === "ticket") || (scenario === "seat-failure" && part === "seat");
        return { error: fail && counts[part] === 1 ? { message: "テスト用の保存失敗" } : null };
      });
      setDone(true);
    } catch { setStatus(pending.current.ticketSaved ? "当落は保存済み。座席だけ再試行します。" : "当落が未保存のため、完了画像はまだ表示しません。"); }
    finally { setAttempts(counts); locked.current = false; }
  }
  if (done) return <ResultCardCompletion card={card} eventId={EVENT.id} artistSlug="stray-kids" sample onOther={() => reset()} />;
  return <main className="mx-auto max-w-md px-4 py-6"><p className="text-xs font-bold text-pink-600">ローカル動作確認・DB書込みなし</p><h1 className="mt-3 text-xl font-bold">投稿 → 結果画像を試す</h1><label className="mt-5 block text-sm">保存パターン<select className="mt-2 min-h-12 w-full rounded-lg border bg-white p-2" value={scenario} onChange={e => reset(e.target.value)}><option value="won">当選・正常保存</option><option value="lost">落選・正常保存</option><option value="ticket-failure">当落保存に失敗 → 再試行</option><option value="seat-failure">座席反映に失敗 → 座席だけ再試行</option></select></label><p className="my-4 text-sm">Stray Kids／京セラ 9.20／{scenario === "lost" ? "落選" : "アリーナ D11"}</p><button className="min-h-12 w-full rounded-lg bg-pink-600 px-3 font-bold text-white" type="button" onClick={simulate}>{status ? "同じ報告を再試行" : "保存成功後の画面を見る"}</button><p role="status" className="mt-4 text-sm">{status}</p><p className="mt-4 text-xs">テスト内の保存呼出し：当落 {attempts.ticket}回／座席 {attempts.seat}回</p></main>;
}

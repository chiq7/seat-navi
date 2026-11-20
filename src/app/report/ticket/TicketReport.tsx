"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { Header } from "@/components/common/Header";
import { FormActionButton } from "@/components/common/FormActions";
import { ReportPerformancePicker, useReportEventSelection } from "@/components/report/ReportPerformancePicker";
import type { ReportOptions } from "@/lib/reportEventSelection";
import { ResultCardCompletion } from "@/components/report/ResultCardCompletion";
import { completedSeatReportId } from "@/lib/arena-map/seatMapNavigation";
import { trackEvent } from "@/lib/analytics";
import { resolveArtist } from "@/lib/artists";
import { completionResultCard } from "@/lib/resultCardCompletion";
import type { PublicResultCard } from "@/lib/resultCard";
import { getPostingContext } from "@/lib/supabase/client";
import { makeTicketSubmission, submitTicketRecords, type TicketFields, type TicketSubmission } from "@/lib/ticketSubmission";

const emptyFields: TicketFields = {
  area: "", block: "", row: "", number: "", direction: "", floor: "", otherSeat: "",
  lottery: "", ticketType: "", count: "", upgrade: "", fcHistory: "", payment: "", comment: "",
};
const inputClass = "zr-focus mt-1 min-h-11 w-full rounded-xl border border-[#ded2d8] bg-white px-3 text-base text-[#45363e]";
type Result = "won" | "lost";
type Pending = { writes: TicketSubmission; card: PublicResultCard; eventId: string; artistSlug: string | null };

function seatAreas(venue: string) {
  if (/Zepp|ライブハウス/i.test(venue)) return ["指定席", "スタンディング", "整理番号", "その他"];
  if (/ドーム|アリーナ|スタジアム|Dome|Arena|Stadium|大阪城ホール|ガイシホール|クロコくんホール|日本武道館/i.test(venue)) return ["アリーナ", "スタンド", "その他"];
  if (/ホール|劇場|シアター|Hall|Theat[er]+/i.test(venue)) return ["1階席", "2階席以上", "バルコニー", "その他"];
  return ["アリーナ", "スタンド", "その他"];
}

export function TicketReport({ initial }: { initial?: ReportOptions }) {
  const selection = useReportEventSelection(initial, !initial);
  const { selectedEventRow: event } = selection;
  const [result, setResult] = useState<Result | null>(null);
  const [fields, setFields] = useState<TicketFields>(emptyFields);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const reportHref = event ? `/report?event=${encodeURIComponent(event.id)}` : "/report";

  function reset() {
    setResult(null);
    setFields(emptyFields);
    setError("");
    setSubmitted(false);
    setPending(null);
  }

  function field(name: keyof TicketFields, value: string) {
    setFields(previous => name === "area" && previous.area !== value
      ? { ...previous, area: value, block: "", row: "", number: "", direction: "", floor: "", otherSeat: "" }
      : { ...previous, [name]: value });
  }

  function choice(name: keyof TicketFields, label: string, options: string[]) {
    return <label className="block text-sm font-bold">{label}
      <select className={inputClass} value={fields[name]} onChange={e => field(name, e.target.value)}>
        <option value="">{name === "fcHistory" ? "未加入・回答しない" : "選択しない"}</option>
        {options.map(option => <option key={option} value={option}>{option}{name === "count" ? "枚" : ""}</option>)}
      </select>
    </label>;
  }

  function textField(name: keyof TicketFields, label: string, example: string, numeric = false) {
    return <label className="block text-sm font-bold">{label}
      <input className={inputClass} value={fields[name]} maxLength={40}
        inputMode={numeric ? "numeric" : "text"} placeholder={example}
        onChange={e => field(name, numeric ? e.target.value.normalize("NFKC").replace(/[^0-9]/g, "") : e.target.value)} />
    </label>;
  }

  async function submit(formEvent?: FormEvent) {
    formEvent?.preventDefault();
    if (lock.current || submitted || (!pending && (!event || !result))) return;
    lock.current = true;
    setSubmitting(true);
    setError("");
    let current = pending;
    try {
      const { client, userId } = await getPostingContext();
      if (!current && event && result) {
        const artist = resolveArtist(event);
        current = {
          writes: makeTicketSubmission(crypto.randomUUID(), event.id, userId, result, fields),
          eventId: event.id, artistSlug: artist?.slug ?? null,
          card: completionResultCard({ event, artistName: artist?.name, result, lotteryLabel: fields.lottery,
            area: fields.area, block: fields.block, standDirection: fields.direction, standFloor: fields.floor }),
        };
        setPending(current);
      }
      if (!current) return;
      if (current.writes.ticket.user_id !== userId) throw new Error("投稿を始めた時と同じログイン状態で再試行してください。");
      // The same UUID identifies a retry, including a save whose HTTP response was lost.
      await submitTicketRecords(current.writes, (table, data) =>
        client.from(table).upsert(data, { onConflict: "id", ignoreDuplicates: true }));
      setSubmitted(true);
      try { trackEvent("report_submit", { report_type: "ticket", event_id: current.eventId, result: current.card.result,
        has_comment: Boolean(current.writes.ticket.comment), has_seat: Boolean(current.card.seat) }); } catch { /* Save already completed. */ }
    } catch {
      setError(current?.writes.ticketSaved
        ? "当落は保存できました。座席表への反映だけを再試行できます。"
        : "送信を確認できませんでした。入力内容を保持しているので、もう一度送れます。");
    } finally {
      setSubmitting(false);
      lock.current = false;
    }
  }

  if (submitted && pending) {
    return <ResultCardCompletion onOther={reset} artistSlug={pending.artistSlug} eventId={pending.eventId}
      card={pending.card} savedSeatReportId={completedSeatReportId(pending.writes)} />;
  }

  return <div className="community-page pb-16 font-sans">
    <Header breadcrumbParents={[{ href: reportHref, label: "レポートを投稿" }]} title="当落・座席を報告" backHref={reportHref} backLabel="報告メニューへ戻る" />
    <main>
      <div className="zr-container pt-5">
        <h1 className="artist-heading">当落・座席を報告</h1>
        <p className="mt-1 text-sm text-[#67545f]">ログイン不要。公演と当落を選ぶだけで投稿できます。</p>
      </div>
      <fieldset disabled={submitting || Boolean(pending)}><ReportPerformancePicker selection={selection} onSelect={reset} /></fieldset>
      <form className="zr-container space-y-4" onSubmit={submit}>
        <fieldset disabled={submitting || Boolean(pending)} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-base font-bold">抽選結果</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["won","lost"] as const).map(value => {
                const Icon = value === "won" ? CheckCircle2 : XCircle;
                return <button key={value} type="button" aria-pressed={value === result}
                  className={`zr-focus flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 text-base font-bold ${result === value ? "border-[#ab285d] bg-[#fff0f6] text-[#8c2050]" : "border-[#e6d8df] bg-white text-[#574650]"}`}
                  onClick={() => setResult(value)}><Icon size={19} aria-hidden="true" />{value === "won" ? "当選" : "落選"}</button>;
              })}
            </div>
          </fieldset>
          {result === "won" && <details className="rounded-xl border border-[#e6d8df] bg-white px-3">
            <summary className="zr-focus cursor-pointer py-3 text-sm font-bold">座席の位置を追加（任意）</summary>
            <div className="space-y-3 pb-4">
              {choice("area", "大まかな座席位置", seatAreas(event?.venue ?? ""))}
              {fields.area === "アリーナ" && textField("block", "ブロック", "例：A3")}
              {fields.area === "スタンド" && <div className="grid grid-cols-2 gap-2">
                {textField("direction","方向・区画","例：1塁側")}{textField("floor","階","例：2階")}
              </div>}
              {fields.area && !["スタンド","アリーナ"].includes(fields.area) && textField("otherSeat","席種・位置","例：2階後方")}
              {fields.area && <div className="grid grid-cols-2 gap-2">{textField("row","列","例：3")}{textField("number","席番号","例：15",true)}</div>}
              {fields.area === "アリーナ" && <p className="text-xs leading-5 text-[#67545f]">ブロック、数字の列・席番号、抽選種別（「その他」を除く）まで分かると、公演の座席図にも反映できます。</p>}
            </div>
          </details>}
          <details className="rounded-xl border border-[#e6d8df] bg-white px-3">
            <summary className="zr-focus cursor-pointer py-3 text-sm font-bold">申込情報・ひとことを追加（任意）</summary>
            <div className="space-y-3 pb-4">
              {choice("lottery", "抽選種別", ["FC1次", "FC2次", "一般", "アップグレード", "復活当選", "制作開放", "その他"])}
              {choice("count", "申込枚数", ["1", "2", "3", "4"])}
              {result === "won" && <>{choice("ticketType", "申込席種", ["通常", "条件付き"])}
                {choice("upgrade", "アップグレード", ["未申込", "当選", "落選"])}</>}
              {choice("fcHistory", "FC歴", ["1年未満", "1〜3年", "3年以上"])}
              {choice("payment", "支払い方法", ["クレカ", "その他"])}
              <label className="block text-sm font-bold">ひとことコメント
                <textarea className={`${inputClass} py-2`} rows={2} value={fields.comment}
                  placeholder="例：初めて当選しました" maxLength={200} onChange={e => field("comment", e.target.value)} />
              </label>
            </div>
          </details>
        </fieldset>
        {error && <p role="alert" className="text-sm text-[#962448]">{error}</p>}
        <FormActionButton type="submit" disabled={submitting || (!pending && (!event || !result))}>
          <Send size={16} aria-hidden="true" />{submitting ? "送信中…" : pending ? "同じ報告を再試行" : "報告を送信"}
        </FormActionButton>
      </form>
    </main>
  </div>;
}


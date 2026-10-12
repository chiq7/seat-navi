"use client";

import { useState } from "react";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { discoveryDateLabel, summarizeDiscovery, type SeatDiscoveryData } from "@/lib/seatDiscovery";
import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";

export function DotMapPreviewClient({ realData, sampleReports, sampleExternal }: { realData: SeatDiscoveryData; sampleReports: SeatReport[]; sampleExternal: ExternalSeatObservation[] }) {
  const realSummary = summarizeDiscovery(realData);
  const [source, setSource] = useState<"real" | "sample">(realData.status === "ready" && realSummary.hasMap ? "real" : "sample");
  const real = source === "real";
  const [added, setAdded] = useState<SeatReport[]>([]);
  const [message, setMessage] = useState("");
  const reports = real ? realData.reports.filter(report => realData.events.some(event => event.id === report.event_id)) : [...sampleReports, ...added];
  const externalObservations = real ? realSummary.external : sampleExternal;
  const lastAdded = added.at(-1);
  const detailEvents = real ? realData.events : [{ id: "dot-map-local-sample", date: "2026-09-19" }, { id: "dot-map-local-sample-day2", date: "2026-09-20" }];
  const hasMap = real ? realData.status === "ready" && realSummary.hasMap : true;
  const eventId = real ? realData.selectedEventId : "dot-map-sample";
  const eventLabel = realData.events.length > 0
    ? `${realData.artistName} · ${realData.events[0].venue} · ${realData.events.map((event) => discoveryDateLabel(event.date)).join("・")}`
    : "Stray Kids · 京セラ9月公演";
  const realCountLabel = [
    realSummary.reportCount > 0 ? `座席記録${realSummary.reportCount}件（由来未確認）` : null,
    realSummary.externalCount > 0 ? `別管理の外部参考${realSummary.externalCount}件` : null,
  ].filter(Boolean).join(" · ") || "座席位置の記録はまだありません";

  return (
    <>
      <p className="text-[10px] font-black tracking-[0.1em] text-[#c12d69]">ローカル限定・比較試作</p>
      <h1 className="mt-1 text-[20px] font-black leading-tight">ブロックを選ぶ → 点を見る</h1>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#f0e9ed] p-1" role="group" aria-label="表示データを切り替える">
        <button type="button" aria-pressed={real} onClick={() => setSource("real")} className={`zr-focus min-h-11 rounded-lg text-[12px] font-bold ${real ? "bg-white text-[#ba2864] shadow-sm" : "text-[#62545d]"}`}>実データ</button>
        <button type="button" aria-pressed={!real} onClick={() => setSource("sample")} className={`zr-focus min-h-11 rounded-lg text-[12px] font-bold ${!real ? "bg-white text-[#ba2864] shadow-sm" : "text-[#62545d]"}`}>操作テスト</button>
      </div>

      <div className="mt-3 min-h-10 border-b border-[#e4dce1] pb-2 text-[11px] leading-5 text-[#62545d]" aria-live="polite">
        {real ? (
          <>
            <p className="font-bold text-[#332b31]">{eventLabel}</p>
            {realData.status === "ready" ? (
              <p>{realCountLabel}{realData.limited ? " · 各情報源の最新500件まで" : ""}</p>
            ) : <p>実データを取得できません。0件とは扱いません。</p>}
          </>
        ) : <p>架空の報告・外部参考。D1の1列3番は別日2件。実際の公演データではありません。</p>}
      </div>

      <section className="mt-3" aria-label="ズームする座席図">
        {hasMap ? (
          <ArenaReportMap
            key={`${source}-${real ? "real" : lastAdded?.id ?? "sample"}`}
            eventId={eventId}
            reports={reports}
            externalObservations={externalObservations}
            hideShareSection
            mapFullBleed
            explorePreview
            positionOnlyPreview
            seatDetailPreview
            seatConditionsUnverifiedPreview={real}
            detailEvents={detailEvents}
            initialSeatPreview={!real && lastAdded ? { block: lastAdded.block, row: lastAdded.row_num, seat: lastAdded.seat_num } : undefined}
          />
        ) : <p className="py-12 text-center text-[13px] font-bold text-[#71636c]">{realData.status === "ready" ? "この公演の座席位置はまだありません" : "実データを表示できません"}</p>}
      </section>

      {!real && <details className="mt-3 rounded-xl border border-[#ded8dc] bg-white p-3">
        <summary className="zr-focus cursor-pointer text-[13px] font-bold">＋ 座席追加を試す（保存なし）</summary>
        <form className="mt-3 space-y-2" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const block = String(form.get("block")).trim().toUpperCase();
          const row = Number(form.get("row")); const seat = Number(form.get("seat"));
          if (!/^[A-Z]{1,2}[1-9]\d?$/.test(block) || ![row, seat].every(value => Number.isInteger(value) && value >= 1 && value <= 200)) { setMessage("ブロック・列・番号を確認してください"); return; }
          const eventId = String(form.get("event"));
          if (!detailEvents.some(item => item.id === eventId)) return;
          const report: SeatReport = { id: `local-added-${added.length}`, event_id: eventId, block, row_num: row, seat_num: seat, lottery_type: "general", lottery_name: "抽選条件未入力（操作テスト）", lottery_round: null, payment_method: null, fc_history: null, comment: null, created_at: new Date().toISOString() };
          setAdded(previous => [...previous, report]);
          setMessage(`${block} ${row}列${seat}番を図に追加しました。DB保存はしていません。`);
        }}>
          <label className="block text-[12px] font-bold">公演日<select aria-label="公演日" name="event" className="zr-focus mt-1 min-h-11 w-full rounded-lg border border-[#ded8dc] px-2">{detailEvents.map(event => <option key={event.id} value={event.id}>{discoveryDateLabel(event.date)}</option>)}</select></label>
          <div className="grid grid-cols-3 gap-2">{[{ name: "block", label: "ブロック", value: "D1" }, { name: "row", label: "列", value: "2" }, { name: "seat", label: "番号", value: "10" }].map(field => <label key={field.name} className="text-[12px] font-bold">{field.label}<input required name={field.name} defaultValue={field.value} type={field.name === "block" ? "text" : "number"} min={1} max={200} maxLength={4} className="zr-focus mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[#ded8dc] px-2" /></label>)}</div>
          <button type="submit" className="zr-focus min-h-11 w-full rounded-lg bg-[#bd2865] text-[13px] font-bold text-white">図に追加する（保存なし）</button>
          <p role="status" className="text-[12px] leading-5 text-[#62545d]">{message || "この画面内だけのテスト。再読込みで消えます。"}</p>
        </form>
      </details>}

      {hasMap && (
        <details className="mt-5 border-t border-[#e4dce1] pt-3">
          <summary className="zr-focus cursor-pointer py-2 text-[12px] font-bold text-[#62545d]">以前の横スクロール表示と比べる</summary>
          <div className="mt-2">
            <ArenaReportMap key={`old-${source}`} eventId={`${eventId}-current`} reports={reports} externalObservations={externalObservations} hideShareSection mapFullBleed positionOnlyPreview={real} />
          </div>
        </details>
      )}
    </>
  );
}

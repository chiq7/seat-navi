"use client";

import { useCallback, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Info, MapPin, Plus, Map } from "lucide-react";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { discoveryDateLabel, discoveryLotterySummary, seatDiscoveryLinks, summarizeDiscovery, type SeatDiscoveryData } from "@/lib/seatDiscovery";
import styles from "./SeatDiscoveryCard.module.css";
import { EventPredictionSwitch } from "@/components/arena-map/EventPredictionSwitch";
import { isEventPredictionEnabled } from "@/lib/arena-map/eventPredictionInput";
import { predictionDetailHref, type PredictionView } from "@/lib/arena-map/predictionNavigation";

const ignoreAddress = () => {};

export default function SeatDiscoveryCard({ data, favoriteControl, preview = false, historical = false, sourceNote }: { data: SeatDiscoveryData; favoriteControl?: ReactNode; preview?: boolean; historical?: boolean; sourceNote?: string }) {
  const [eventId, setEventId] = useState(data.selectedEventId);
  const [showInfo, setShowInfo] = useState(false);
  const [view, setView] = useState<(PredictionView & { eventId: string }) | undefined>();
  const onViewChange = useCallback((next: PredictionView) => setView({ ...next, eventId }), [eventId]);
  // The normal upcoming and historical cards stay light: only the explicit local preview opts in.
  const predictionPreview = preview && isEventPredictionEnabled(eventId);
  const summary = summarizeDiscovery({ ...data, selectedEventId: eventId });
  const links = seatDiscoveryLinks(data.artistSlug, eventId);
  const mapHref = predictionPreview ? predictionDetailHref(eventId, view?.eventId === eventId ? view : undefined) : links.map;
  const event = data.events.find(item => item.id === eventId);
  const tourTitle = event?.title.startsWith(data.artistName) ? event.title.slice(data.artistName.length).trim() : event?.title;
  const ready = data.status === "ready";
  const lottery = discoveryLotterySummary(data);
  const pendingRates = !lottery;
  const instanceId = data.artistSlug + "-" + data.selectedEventId + (preview ? "-preview" : "");
  const infoId = "seat-info-" + instanceId;

  return (
    <article id={preview ? "seat-card-preview" : undefined} aria-label={data.artistName + "の座席情報"} className={styles.card + (!summary.hasMap ? " " + styles.compactCard : "")}>
      <header className={styles.header}>
        <div className={styles.avatar}><Image src={data.image} alt="" fill sizes="44px" className="object-cover" /></div>
        <div className={styles.identity}>
          <Link href={links.artist} className={"zr-focus " + styles.title}>{data.artistName}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          <p className={styles.tour}>{summary.hasMap ? tourTitle || "公演の座席情報" : ready ? "座席情報を募集中" : "読込みできません"}</p>
        </div>
        {favoriteControl}
      </header>

        <div className={styles.metaRow}>{event && <div className={styles.meta}>
        <p><MapPin size={15} aria-hidden="true" /><strong>{event.venue}</strong></p>
        <p className={styles.dateRow}><CalendarDays size={15} aria-hidden="true" /><span>{historical && <><strong className={styles.pastLabel}>過去公演</strong>{event.date.slice(0, 4)}年 · </>}{data.events.map(item => discoveryDateLabel(item.date)).join("・")}</span>{!summary.hasMap && <Link href={links.map} className={"zr-focus " + styles.inlineMap} aria-label={data.artistName + "の座席表を見る"}>座席表<ArrowUpRight size={14} aria-hidden="true" /></Link>}</p>
      </div>}<button type="button" className={"zr-focus " + styles.infoButton} aria-label="集計・表示の説明" aria-expanded={showInfo} aria-controls={infoId} onClick={() => setShowInfo(value => !value)}><Info size={19} aria-hidden="true" /></button></div>

      <div className={styles.previewRow + (pendingRates ? " " + styles.pendingPreview : "")}>
        {ready && summary.hasMap && <div className={styles.figure}>
          <p className={styles.figureLabel}>座席表</p>
          {predictionPreview ? <div className={styles.map}>
            <EventPredictionSwitch key={eventId} eventId={eventId} reports={data.reports} external={data.externalObservations}
              events={data.events} compact onAddressChange={ignoreAddress} onViewChange={onViewChange}
              readState={data.status === "ready" ? "ready" : "unavailable"} limited={data.limited}>
              <ArenaReportMap eventId={eventId} reports={summary.seats} externalObservations={summary.external} variant="compact" positionOnlyPreview highlightPositionsPreview hideShareSection />
            </EventPredictionSwitch>
          </div> : <Link href={mapHref} aria-label={data.artistName + "の座席表を詳しく見る"} className={"zr-focus " + styles.map}>
              <ArenaReportMap eventId={eventId} reports={summary.seats} externalObservations={summary.external} variant="compact" positionOnlyPreview highlightPositionsPreview hideShareSection />
            </Link>}
          {summary.blocks.length > 0 && <p className={styles.blocks}><span aria-hidden="true" className={styles.dot} />{summary.blocks.slice(0, 6).join(" · ")}{summary.blocks.length > 6 && " …"}</p>}
        </div>}
        <div className={styles.stats + (pendingRates ? " " + styles.pendingStats : "")}>
          <Link href={links.lottery} aria-label="当落データを見る（アーティスト全公演）" className={"zr-focus " + styles.lotteryLink}>
            {[
              { label: "チケット当選率", lines: ["チケット", "当選率"], value: lottery?.percent },
              { label: "通常アリーナ率", lines: ["通常", "アリーナ率"], value: lottery?.normalArenaPercent },
              { label: "アプグレ当選率", lines: ["アプグレ", "当選率"], value: lottery?.upgradePercent },
            ].map(metric => <span className={styles.rateItem} key={metric.label}>
              {pendingRates ? <span className={styles.statLabel} aria-label={metric.label}><span>{metric.lines[0]}</span><span className={styles.pendingValue}>{metric.lines[1]} <strong>—</strong></span></span> : <><span className={styles.statLabel} aria-label={metric.label}>{metric.lines.map(line => <span key={line}>{line}</span>)}</span><span className={styles.metrics}><strong className={styles.count}>{metric.value ?? "—"}</strong>{metric.value != null && <span>%</span>}</span></>}
            </span>)}
          </Link>
        </div>
      </div>

      <div className={styles.actions}>
        {summary.hasMap && <Link href={mapHref} className={"zr-focus " + styles.primary}><Map size={17} aria-hidden="true" />座席表を見る<ArrowUpRight size={16} aria-hidden="true" /></Link>}
        {data.events.length > 0 && <div className={styles.reportRow}>
          <label htmlFor={"seat-day-" + instanceId} className={styles.srOnly}>報告する公演日</label>
          <select id={"seat-day-" + instanceId} value={eventId} onChange={e => setEventId(e.target.value)} className={"zr-focus " + styles.select}>
            {data.events.map(item => <option key={item.id} value={item.id}>{discoveryDateLabel(item.date)}</option>)}
          </select>
          <Link href={links.report} className={"zr-focus " + styles.secondary}><Plus size={16} aria-hidden="true" />座席を報告</Link>
        </div>}
      </div>

      <div id={infoId} hidden={!showInfo} className={styles.infoPanel}>
        {!summary.hasMap && tourTitle && <p>{tourTitle}</p>}
        {sourceNote && <p>{sourceNote}</p>}
        {data.limited && <p>{isEventPredictionEnabled(eventId) ? "読込みが未完了のため、予想は表示しません。" : "表示対象：各情報源の最新500件まで"}</p>}
        <p>率はこの会場・日程の報告内。詳細では全公演を確認できます。</p>
        {lottery && <p>{lottery.scopeLabel} · {lottery.lotteryLabel} · 当選{lottery.won}／申込結果{lottery.total}件</p>}
        {ready && <p>座席記録{summary.reportCount}件{summary.externalCount > 0 && <> · 外部参考情報 {summary.externalCount}件</>}</p>}
        <p>図は座席位置の模式図。上記日程を合算しています。</p>
        <p>当選率は報告内の割合。—は集計できるデータなし。</p>
        <p>チケット：当選／申込結果。通常アリーナ：アプグレ当選を除く座席判明済みの当選報告内。アプグレ：申込報告内。—は集計できるデータなし。</p>
        {lottery && <p>通常アリーナ {lottery.normalArena?.won ?? 0}／{lottery.normalArena?.total ?? 0}件 · アプグレ {lottery.upgrade?.won ?? 0}／{lottery.upgrade?.total ?? 0}件</p>}
        {ready && summary.reportCount > summary.seatCount && <p>重複位置を除くと{summary.seatCount}席</p>}
        {summary.blocks.length > 0 && <p>報告ブロック：{summary.blocks.join("・")}</p>}
        {summary.externalCount > 0 && <p>範囲情報は確定席数に含めません。</p>}
      </div>
    </article>
  );
}

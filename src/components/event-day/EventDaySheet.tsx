"use client";

import type { Ref } from "react";
import type { EventDaySummary } from "@/lib/eventDaySummary";
import { eventDayDescription } from "@/lib/eventDaySummary";
import { getEventDaySheetLayout } from "@/lib/eventDaySheetLayout";
import { EVENT_DAY_GATE_NOTE } from "@/lib/eventDayMap";
import { EVENT_DAY_ACTION_ICONS } from "./eventDayIcons";

const INK = "#302c35", PINK = "#aa2f66", MUTED = "#6c5d68";
const FONT = '"Yu Gothic", Meiryo, sans-serif';

/** Output only, with presentation attributes. No external image, CSS or fixed action count. */
export function EventDaySheet({ day, svgRef }: { day: EventDaySummary; svgRef?: Ref<SVGSVGElement> }) {
  const layout = getEventDaySheetLayout(day);
  const { model } = layout;
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${layout.width} ${layout.height}`}
    width={layout.width} height={layout.height} role="img" aria-label={`${day.artist} ${day.dateLabel} 当日まとめ`}
    data-sheet-version={layout.version} fontFamily={FONT} fill={INK} style={{ display: "block", width: "100%", height: "auto" }}>
    <title>{`${day.artist} ${day.dateLabel} 当日まとめ`}</title><desc>{eventDayDescription(day)}</desc>
    <rect width={layout.width} height={layout.height} fill="white" />
    <rect width={layout.width} height="8" fill={PINK} />
    <text x="30" y="48" fontSize="26" fontWeight="800" fill={PINK}>ちけレポ / 当日まとめ</text>
    {day.state === "past-example" && <text x="690" y="48" textAnchor="end" fontSize="20" fill={MUTED}>終了済み・見本</text>}
    {day.state === "past" && <text x="690" y="48" textAnchor="end" fontSize="20" fill={MUTED}>終了した公演</text>}
    {layout.header.map((line, i) => <text key={i} x="36" y={line.y} fontSize={line.size} fontWeight={i === 0 ? "800" : "600"}>{line.text}</text>)}
    <g transform={`translate(30 ${layout.timesY})`}>
      <rect width="660" height="76" rx="12" fill="#fff0f6" />
      <text x="24" y="46" fontSize="22" fill={PINK}>開場</text><text x="94" y="50" fontSize="34" fontWeight="800">{day.open ?? "未発表"}</text>
      <text x="354" y="46" fontSize="22" fill={PINK}>開演</text><text x="424" y="50" fontSize="34" fontWeight="800">{day.start ?? "未発表"}</text>
    </g>
    <text x="30" y={layout.mapTitleY} fontSize="28" fontWeight="800">ブースの場所</text>
    <text x="690" y={layout.mapTitleY} textAnchor="end" fontSize="20" fill={MUTED}>位置関係図</text>
    <g transform={`translate(30 ${layout.mapY})`} data-sheet-map="true">
      {model ? <>
        <text x="0" y="44" fontSize="22" fill={MUTED}>{model.base.stationLabel}</text>
        {[...layout.top, ...layout.bottom].map(pin => {
          const top = pin.side === "top", count = top ? layout.top.length : layout.bottom.length;
          const cellWidth = (top ? 330 : 660) / count;
          const x = pin.callout.x - cellWidth / 2 + 5, y = top ? 0 : layout.drawingY + model.base.height;
          const Icon = EVENT_DAY_ACTION_ICONS[pin.booth.kind];
          return <g key={pin.booth.id} transform={`translate(${x} ${y})`}>
            <rect width={cellWidth - 10} height={top ? layout.topHeight : layout.bottomHeight} rx="10" fill="white" stroke="#dfbecf" strokeWidth="2" />
            <Icon x={(cellWidth - 38) / 2} y="12" width="28" height="28" color={PINK} />
            {pin.lines.map((line, i) => <text key={i} x={(cellWidth - 10) / 2} y={62 + i * 30} textAnchor="middle" fontSize="24" fontWeight="700">{line}</text>)}
            <text x={(cellWidth - 10) / 2} y={84 + (pin.lines.length - 1) * 30} textAnchor="middle" fontSize="20" fill={MUTED}>{pin.booth.floor ?? "階未確認"}</text>
          </g>;
        })}
        <g transform={`translate(0 ${layout.drawingY})`} data-sheet-drawing="true">
          <path d={model.base.road} stroke="#c3b9c2" strokeWidth="8" /><path d={model.base.road} stroke="white" strokeWidth="2" strokeDasharray="7 10" />
          <ellipse {...model.base.dome} fill="#fff8fb" stroke="#d9cbd4" strokeWidth="2" /><ellipse {...model.base.innerDome} fill="white" />
          {[...model.top, ...model.bottom].map(pin => <g key={pin.booth.id} data-sheet-point-id={pin.booth.id}>
            <line x1={pin.point.x} y1={pin.point.y} x2={pin.callout.x} y2={pin.callout.y} stroke="#8d7a86" strokeWidth="2" />
            <circle cx={pin.point.x} cy={pin.point.y} r="9" fill={pin.booth.color} stroke="white" strokeWidth="3" />
          </g>)}
          {model.base.labels.map(label => <text key={label.id} x={label.x} y={label.y + (label.id === "dome" ? 8 : 18)}
            textAnchor={label.anchor} fontSize={label.id === "dome" ? 26 : 20} fontWeight={label.id === "dome" ? "700" : "400"} fill={label.id === "dome" ? INK : MUTED}>
            {label.lines.map((line, i) => <tspan key={line} x={label.x} dy={i === 0 ? 0 : 24}>{line}</tspan>)}
          </text>)}
        </g>
      </> : <text x="0" y="32" fontSize="22" fill={MUTED}>案内図は未掲載です。各用事の場所を確認してください。</text>}
    </g>
    <text x="30" y={layout.actionsTitleY} fontSize="28" fontWeight="800">時間・場所・やること</text>
    {layout.cards.length === 0 && <text x="30" y={layout.actionsTitleY + 44} fontSize="22">用事の案内はまだありません。</text>}
    {layout.cards.map(card => { const Icon = EVENT_DAY_ACTION_ICONS[card.action.kind]; return <g key={card.action.id}
      transform={`translate(${card.x} ${card.y})`} data-sheet-action-id={card.action.id}>
      <rect width={layout.cardWidth} height={card.height} rx="12" fill="white" stroke="#eadde5" strokeWidth="2" />
      <Icon x="18" y="16" width="28" height="28" color={PINK} />
      {card.heading.map((line, i) => <text key={i} x="58" y={38 + i * 34} fontSize="28" fontWeight="800" fill={PINK}>{line}</text>)}
      {card.facts.map((fact, i) => <g key={i}>
        {fact.tone === "deadline" && <rect x="12" y={fact.y - 26} width={layout.cardWidth - 24} height={fact.lines.length * 30 + 6} rx="5" fill="#fff0f6" />}
        {fact.lines.map((line, j) => <text key={j} x="18" y={fact.y + j * 30} fontSize={fact.size}
          fontWeight={["hours", "deadline", "strong"].includes(fact.tone) ? "700" : "400"}
          fill={fact.tone === "deadline" ? PINK : fact.tone === "note" ? MUTED : INK}>{line}</text>)}
      </g>)}
    </g>; })}
    <path d={`M30 ${layout.footerY - 12}h660`} stroke="#eadde5" />
    <text x="30" y={layout.footerY + 16} fontSize="20" fill={MUTED}>{EVENT_DAY_GATE_NOTE}</text>
    <text x="30" y={layout.footerY + 50} fontSize="18" fill={MUTED}>{`tixrepo.com · 画像版 ${layout.version} · 更新後は再保存`}</text>
  </svg>;
}

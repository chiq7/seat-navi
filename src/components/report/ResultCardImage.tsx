"use client";
import { useId } from "react";
import type { PublicResultCard, ResultPhrase } from "@/lib/resultCard";
import styles from "./ResultCardPreview.module.css";

const FONT = '"Yu Gothic", Meiryo, sans-serif';
const PINK = "#ee3379";
const INK = "#251e2a";

/** Replaceable ticket mascot. Public facts and map do not depend on this artwork. */
function TicketMascot({ lost, x, y, scale = 1 }: { lost: boolean; x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 30Q-4 10 4 0M110 30q24-20 22-30M38 96l-12 19M88 96l14 19" fill="none" />
    <path d="M16 10h96v24q-17 10 0 20v38H16V54q17-10 0-20z" fill={lost ? "#ede7f3" : "#ffe1eb"} />
    <path d="M94 16v15m0 32v22" stroke={PINK} strokeDasharray="3 7" strokeWidth="3" />
    {lost ? <><path d="M36 38l13 6m22-6-13 6M48 70q10-12 21 0" fill="none" /><path d="M39 52q-12 17 0 17t0-17" fill="#a1c6ea" strokeWidth="2" /></> : <><path d="M34 46q7-13 15 0m10 0q7-13 15 0" fill="none" /><path d="M44 61q14 26 29 0z" fill={PINK} strokeWidth="3" /></>}
  </g>;
}

/** All winning variants include their seat; showSeat only remains for existing callers. */
export function ResultCardImage({ card, phrase, svgRef, sample = true }: {
  card: PublicResultCard;
  showSeat?: boolean;
  phrase: ResultPhrase | null;
  svgRef?: React.Ref<SVGSVGElement>;
  sample?: boolean;
}) {
  const id = useId();
  const lost = card.result === "lost";
  const seat = lost ? undefined : card.seat;
  const height = phrase ? 710 : 562;
  const headline = lost ? `${card.lossStreak ? `${card.lossStreak}連続` : ""}落選` : card.previousLosses ? `${card.previousLosses + 1}回目で当選` : "当選！";
  const blocks = ["A", "B", "C", "D", "E", "F"];
  const hasMap = sample && seat?.layout === "sample" && seat.area === "アリーナ" && blocks.includes(seat.block);
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 600 ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} className={styles.image} fontFamily={FONT} fill={INK}>
    <title id={`${id}-title`}>{`${sample ? "サンプル：" : ""}${card.artist} ${headline}${seat ? ` ${seat.area} ${seat.block}` : ""}`}</title>
    <desc id={`${id}-desc`}>{`${card.venue} ${card.dateLabel}。${sample ? "架空の結果・プレビュー用。" : "本人の報告結果。"}${hasMap ? "配置は架空サンプル。" : ""}列・席番号は非表示。${phrase?.join("") ?? ""}`}</desc>
    <rect width="600" height={height} fill="#fffcfa" />
    <text x="30" y="50" fontFamily="Arial, sans-serif" fontSize={Math.min(36, 540 / Math.max(card.artist.length, 1))} fontWeight="800">{card.artist}</text>
    <text x="30" y="83" fontSize={Math.min(23, 390 / Math.max(card.venue.length, 1))} fontWeight="600">{card.venue}</text>
    <text x="570" y="83" textAnchor="end" fontSize="23" fontFamily="Arial, sans-serif">{card.dateLabel}</text>
    <text x="30" y="181" fontSize={headline.length > 7 ? 65 : 80} fontWeight="900" letterSpacing="-3" fill={lost ? INK : PINK}>{headline}</text>
    {card.lotteryLabel && <text x="32" y="214" fontSize="23" fill="#6f6271">{card.lotteryLabel}</text>}
    {lost ? <>
      <TicketMascot lost x={175} y={280} scale={1.8} />
      <path d="M112 285l-18-15m390 24 18-15" fill="none" stroke={PINK} strokeWidth="7" strokeLinecap="round" />
    </> : <>
      <text x="30" y="269" fontSize={Math.min(42, 540 / Math.max(`${seat?.area ?? ""} ${seat?.block ?? ""}`.length, 1))} fontWeight="900">{seat ? `${seat.area} ${seat.block}` : "座席情報なし"}</text>
      {hasMap ? <g aria-label={`架空配置の${seat?.block}ブロック`}>
        <rect x="146" y="290" width="308" height="30" rx="4" fill={INK} />
        <text x="300" y="313" textAnchor="middle" fill="white" fontSize="21" fontFamily="Arial, sans-serif" fontWeight="700">STAGE</text>
        {blocks.map((block, i) => {
          const selected = block === seat?.block;
          const x = 44 + i % 3 * 174;
          const y = 334 + Math.floor(i / 3) * 66;
          return <g key={block}>
            <rect x={x} y={y} width="164" height="56" rx="5" fill={selected ? PINK : "#eae5ea"} stroke={selected ? INK : "none"} strokeWidth="3" />
            <text x={x + 82} y={y + 37} textAnchor="middle" fontSize={selected ? 27 : 29} fontWeight="800" fill={selected ? "white" : "#796f7b"}>{selected ? `${block} ← ここ！` : block}</text>
          </g>;
        })}
        <text x="300" y="491" textAnchor="middle" fontSize="22" fill="#6f6271">架空配置・実際の公演とは異なります</text>
      </g> : <g>
        <rect x="30" y="293" width="540" height="180" rx="8" fill="#f2edf2" />
        <text x="300" y="380" textAnchor="middle" fontSize="24" fill="#6f6271">配置確認前のため、位置は非表示</text>
        <text x="300" y="416" textAnchor="middle" fontSize="22" fill="#6f6271">座席エリアはそのまま共有できます</text>
      </g>}
    </>}
    {phrase && <g>
      <path d="M30 517h540" stroke="#ded4de" strokeWidth="2" />
      {!lost && <TicketMascot lost={false} x={455} y={548} scale={.8} />}
      {phrase.map((line, i) => <text key={i} x="30" y={565 + i * 49} fontSize={Math.min(lost ? 39 : 34, (lost ? 540 : 415) / Math.max(line.length, 1))} fontWeight="900" fill={i === 1 ? PINK : INK}>{line}</text>)}
    </g>}
    <text x="30" y={height - 23} fontSize="20" fill="#786d78">{sample ? "SAMPLE · 架空の結果" : "当落・座席レポ"}</text>
    <text x="570" y={height - 23} textAnchor="end" fontSize="22" fontWeight="800">ちけレポ · tixrepo.com</text>
  </svg>;
}

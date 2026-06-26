"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const RATING_IMAGES: Record<number, string> = {
  5: "/images/reports/overall-rating/rating-5-kamiseki.png",
  4: "/images/reports/overall-rating/rating-4-ryoseki.png",
  3: "/images/reports/overall-rating/rating-3-futsu.png",
  2: "/images/reports/overall-rating/rating-2-bimyo.png",
  1: "/images/reports/overall-rating/rating-1-kyomu.png",
};

const METER_ICONS: Record<string, string> = {
  "メインステージ": "/images/reports/local-report-detail/main-stage-icon.png",
  "センステ": "/images/reports/local-report-detail/center-stage-icon.png",
  "トロッコ": "/images/reports/local-report-detail/trolley-icon.png",
  "客降り": "/images/reports/local-report-detail/aisle-walk-icon.png",
};

const DEMO = {
  overallRating: 5,
  tourName: "乃木坂46 真夏の全国ツアー 2026",
  date: "2026.8.15(土)",
  venue: "東京ドーム",
  seatArea: "アリーナ",
  block: "Aブロック",
  row: "3列",
  seatNo: "12番",
  photoZoom: "等倍",
  comment:
    "メインステージは少し距離がありましたが、センステに来た時はかなり見やすかったです。トロッコも近くを通って、肉眼でも表情が分かるくらいでした！花道も目の前を通り、推しメンと目が合った気がして最高でした。次のツアーもこのブロックを狙いたいと思います。全体的に非常に満足度の高い席でした。",
  meters: [
    { label: "メインステージ", value: 5, color: "#FF6B9D", text: "見やすい" },
    { label: "センステ", value: 5, color: "#A78BFA", text: "見やすい" },
    { label: "トロッコ", value: 4, color: "#FB7185", text: "近い" },
    { label: "客降り", value: 3, color: "#2DD4BF", text: "近い" },
  ],
  relatedReports: [
    {
      area: "アリーナ",
      block: "Aブロック",
      row: "5列",
      seat: "8番",
      comment: "センステがかなり近く、双眼鏡不要でした。",
      tags: ["等倍", "見やすい"],
    },
    {
      area: "アリーナ",
      block: "Aブロック",
      row: "4列",
      seat: "20番",
      comment: "全体的に見えやすい席でした！",
      tags: ["等倍", "良席"],
    },
  ],
};

function Sparkle({
  size = 8,
  color = "#FF6B9D",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2L13.8 9.2L21 10.5L13.8 12.5L12 20L10.2 12.5L3 10.5L10.2 9.2L12 2Z" />
    </svg>
  );
}


export default function LiveReportDetailPage() {
  const d = DEMO;
  const ratingImg = RATING_IMAGES[d.overallRating];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      <div className="mx-auto w-full max-w-[390px] bg-[#FAFAFA] pb-36">

        {/* ヘッダー */}
        <header className="sticky top-0 z-30 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white">
          <Link
            href="/report"
            className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
          <h1 className="text-[13px] font-bold tracking-wide text-gray-900">現地レポ詳細</h1>
        </header>

        {/* ライブ情報 */}
        <section className="bg-white px-4 pb-3.5 pt-3">
          <div className="flex items-start gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
              <rect x="9" y="2" width="6" height="11" rx="3" fill="#FF6B9D" />
              <path d="M5 10a7 7 0 0014 0" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" fill="none" />
              <line x1="12" y1="17" x2="12" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="22" x2="16" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2 className="flex-1 text-[14px] font-bold leading-snug text-gray-900">{d.tourName}</h2>
            <Sparkle size={9} color="#FBBF24" className="mt-0.5" />
          </div>

          <div className="mt-2 flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-[#FFF1F6] px-2.5 py-1 text-[11px] font-semibold text-[#FF6B9D]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="#FF6B9D" strokeWidth="2.2" />
                <path d="M8 2v4M16 2v4M3 10h18" stroke="#FF6B9D" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              {d.date}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#6B7280" opacity="0.75" />
                <circle cx="12" cy="9" r="2.5" fill="white" />
              </svg>
              {d.venue}
            </span>
          </div>
        </section>

        {/* ステージ写真 */}
        <section className="px-4 pt-3">
          <div
            className="relative h-[190px] w-full overflow-hidden rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, #1a0533 0%, #2d1b69 28%, #5b21b6 58%, #c026d3 80%, #f472b6 100%)",
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="h-1.5 w-36 rounded-full bg-white/10" />
              <div className="h-14 w-52 rounded-lg border border-white/10 bg-white/5" />
            </div>
            <div className="absolute bottom-0 left-[28%] h-3/4 w-1.5 origin-bottom -rotate-[18deg] bg-gradient-to-t from-pink-400/25 to-transparent blur-[3px]" />
            <div className="absolute bottom-0 left-1/2 h-full w-2 bg-gradient-to-t from-purple-400/35 to-transparent blur-[4px]" />
            <div className="absolute bottom-0 right-[28%] h-3/4 w-1.5 origin-bottom rotate-[18deg] bg-gradient-to-t from-pink-300/25 to-transparent blur-[3px]" />
            <div className="absolute bottom-3 left-0 right-0 flex flex-wrap justify-center gap-px px-6 opacity-25">
              {Array.from({ length: 90 }).map((_, i) => (
                <div key={i} className="h-1 w-1 rounded-full bg-white" />
              ))}
            </div>
          </div>
        </section>

        {/* この席の見え方カード */}
        <section className="mt-3 px-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#FECDD3] shadow-[0_2px_12px_rgba(255,107,157,0.06)]">
            {/* 背景画像（カード全体） */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url('/images/reports/local-report-detail/review-section-bg.png')",
                backgroundSize: "100% 100%",
                opacity: 1,
                outline: "2px solid red",
              }}
            />

            {/* コンテンツ */}
            <div className="relative z-10">
              {/* カードタイトル */}
              <div className="flex items-center justify-center gap-2 px-4 pb-2.5 pt-3.5">
                <Sparkle size={9} color="#FBBF24" />
                <h3 className="text-[13px] font-bold text-gray-900">この席の見え方</h3>
                <Sparkle size={9} color="#FBBF24" />
              </div>

              {/* 座席情報 + 総合評価（横並び） */}
              <div className="flex items-center justify-center gap-4 px-4 pb-3.5 pt-1">
                <div>
                  <p className="text-[17px] font-bold tracking-wide text-gray-900">
                    {d.seatArea} {d.block}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-gray-500">
                    {d.row} / {d.seatNo}
                  </p>
                </div>
                <div className="w-[96px] shrink-0">
                  <Image
                    src={ratingImg}
                    alt={`総合評価 ${d.overallRating}`}
                    width={96}
                    height={48}
                    className="h-auto w-full object-contain"
                  />
                </div>
              </div>

              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#FECDD3] to-transparent" />

              {/* 見え方・見やすさ + メーター */}
              <div className="px-6 pb-3 pt-3">
                <p className="mb-3 text-center text-[10px] font-bold tracking-wide text-gray-400">
                  見え方・見やすさ
                </p>
                <div className="space-y-3">
                  {d.meters.map((m) => (
                    <div
                      key={m.label}
                      className="grid items-center gap-x-2"
                      style={{ gridTemplateColumns: "36px 90px 1fr 52px" }}
                    >
                      <div className="flex items-center justify-center">
                        <Image
                          src={METER_ICONS[m.label] ?? ""}
                          alt=""
                          width={38}
                          height={38}
                          className="object-contain"
                        />
                      </div>
                      <span className="whitespace-nowrap text-[11px] font-semibold text-gray-700">
                        {m.label}
                      </span>
                      <div className="flex gap-[3px]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-[9px] w-[17px] rounded-full"
                            style={{ backgroundColor: i < m.value ? m.color : "#E5E7EB" }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-right text-[11px] font-bold"
                        style={{ color: m.color }}
                      >
                        {m.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#FECDD3] to-transparent" />

              {/* コメント */}
              <div className="px-4 pb-4 pt-3">
                <p className="mb-2 text-center text-[10px] font-bold tracking-wide text-gray-400">コメント</p>
                <div className="rounded-xl border border-pink-100 bg-white/80 px-3 py-2.5">
                  <p className="break-words text-center text-[12px] leading-relaxed text-gray-700">{d.comment}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 同じブロックの他レポ */}
        <section className="mt-4 px-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-gray-900">同じブロックの他レポ</h3>
            <button
              type="button"
              className="flex items-center gap-0.5 text-[11px] font-semibold text-[#FF6B9D] active:opacity-70"
            >
              もっと見る
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {d.relatedReports.map((r, i) => (
              <button
                key={i}
                type="button"
                className={`flex w-full items-center gap-3 p-3 active:bg-gray-50 ${i > 0 ? "border-t border-gray-100" : ""}`}
              >
                <div
                  className="h-[54px] w-[72px] shrink-0 rounded-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #1a0533 0%, #2d1b69 45%, #c026d3 100%)",
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <p className="text-[12px] font-bold text-gray-900">
                    {r.area} {r.block} / {r.row} / {r.seat}
                  </p>
                  <p className="line-clamp-1 text-left text-[10px] text-gray-500">{r.comment}</p>
                  <div className="flex gap-1">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={14} className="shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        </section>

        {/* アリーナ予想図リンク */}
        <section className="mt-3 px-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-gray-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" stroke="#6366F1" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                <path d="M9 3v15M15 6v15" stroke="#6366F1" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-gray-900">アリーナ予想図を見る</p>
              <p className="text-[10px] text-gray-400">{d.venue}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-gray-300" />
          </button>
        </section>
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 px-4 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, white 72%, rgba(255,255,255,0))" }}
      >
        <button
          type="button"
          className="flex h-[54px] w-full flex-col items-center justify-center rounded-full bg-[#FF6B9D] shadow-[0_8px_24px_rgba(255,107,157,0.35)] active:opacity-90"
        >
          <span className="text-[14px] font-bold text-white">自分も現地レポを投稿する</span>
          <span className="mt-0.5 text-[10px] text-white/75">あなたの座席情報もシェアしよう</span>
        </button>
      </div>
    </div>
  );
}

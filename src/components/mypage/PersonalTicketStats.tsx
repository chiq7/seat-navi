"use client";

import { useMemo, useState } from "react";
import { Download, Share2 } from "lucide-react";
import TrendSection from "@/components/artist-page/TrendSection";
import { findArtistBySlug } from "@/lib/artists";
import {
  computeArenaDetailStats,
  computeTicketResultStats,
  computeUpgradeDetailStats,
} from "@/lib/artistPageStats";
import type { TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { CrawledEvent } from "@/lib/types";

type Props = {
  ticketPosts: TicketResultAnalytics[];
  eventMap: Map<string, CrawledEvent>;
  displayName?: string | null;
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createShareImage({ name, scope, rate, won, lost, total }: {
  name: string;
  scope: string;
  rate: number | null;
  won: number;
  lost: number;
  total: number;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("画像を作成できませんでした。"));

  const gradient = context.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, "#FFF5F9");
  gradient.addColorStop(1, "#FFE0EC");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1200, 630);
  context.fillStyle = "rgba(255,255,255,0.94)";
  context.beginPath();
  context.roundRect(70, 55, 1060, 520, 42);
  context.fill();
  context.fillStyle = "#FF6B9D";
  context.font = "700 34px sans-serif";
  context.fillText("ちけレポ", 120, 125);
  context.fillStyle = "#111827";
  context.font = "700 42px sans-serif";
  context.fillText(`${name}の当選データ`, 120, 195);
  context.fillStyle = "#6B7280";
  context.font = "500 25px sans-serif";
  context.fillText(scope, 120, 240);
  context.fillStyle = "#FF6B9D";
  context.font = "800 128px sans-serif";
  context.fillText(rate === null ? "--" : `${rate}%`, 120, 405);
  context.fillStyle = "#6B7280";
  context.font = "600 27px sans-serif";
  context.fillText("当選率", 128, 450);
  [["当選", String(won)], ["落選", String(lost)], ["申込", String(total)]].forEach(([label, value], index) => {
    const x = 620 + index * 165;
    context.fillStyle = "#111827";
    context.font = "800 54px sans-serif";
    context.textAlign = "center";
    context.fillText(value, x, 380);
    context.fillStyle = "#6B7280";
    context.font = "600 22px sans-serif";
    context.fillText(label, x, 425);
  });
  context.textAlign = "left";
  context.fillStyle = "#9CA3AF";
  context.font = "500 19px sans-serif";
  context.fillText("自分が投稿した当落レポから集計", 120, 530);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像を作成できませんでした。"))), "image/png");
  });
}

export function PersonalTicketStats({ ticketPosts, eventMap, displayName }: Props) {
  const [artistFilter, setArtistFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const artistOptions = useMemo(() => {
    const slugs = new Set<string>();
    ticketPosts.forEach((post) => {
      const slug = eventMap.get(post.event_id)?.artist_slug;
      if (slug) slugs.add(slug);
    });
    return [...slugs]
      .map((slug) => ({ slug, name: findArtistBySlug(slug)?.name ?? slug }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [eventMap, ticketPosts]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    ticketPosts.forEach((post) => {
      const year = eventMap.get(post.event_id)?.date?.slice(0, 4);
      if (year) years.add(year);
    });
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [eventMap, ticketPosts]);

  const filteredPosts = useMemo(() => ticketPosts.filter((post) => {
    const event = eventMap.get(post.event_id);
    const artistMatches = artistFilter === "all" || event?.artist_slug === artistFilter;
    const yearMatches = yearFilter === "all" || event?.date?.startsWith(yearFilter);
    return artistMatches && yearMatches;
  }), [artistFilter, eventMap, ticketPosts, yearFilter]);

  const ticketStats = useMemo(() => computeTicketResultStats(filteredPosts), [filteredPosts]);
  const arenaStats = useMemo(() => computeArenaDetailStats(filteredPosts), [filteredPosts]);
  const upgradeStats = useMemo(() => computeUpgradeDetailStats(filteredPosts), [filteredPosts]);
  const artistLabel = artistFilter === "all" ? "全アーティスト" : (findArtistBySlug(artistFilter)?.name ?? artistFilter);
  const scopeLabel = `${artistLabel}・${yearFilter === "all" ? "全期間" : `${yearFilter}年`}`;
  const name = displayName?.trim() || "わたし";

  async function handleShare() {
    setSharing(true);
    setShareMessage("");
    try {
      const blob = await createShareImage({ name, scope: scopeLabel, rate: ticketStats.rate, won: ticketStats.won, lost: ticketStats.lost, total: ticketStats.total });
      const file = new File([blob], "ticket-report-win-rate.png", { type: "image/png" });
      const shareData = {
        title: `${name}の当選データ`,
        text: `${scopeLabel}の当選率は${ticketStats.rate === null ? "--" : `${ticketStats.rate}%`}でした。 #ちけレポ`,
        files: [file],
      };
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setShareMessage("共有しました。");
      } else {
        downloadBlob(blob, file.name);
        setShareMessage("SNS用画像を保存しました。投稿に添付して使えます。");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage(error instanceof Error ? error.message : "共有できませんでした。");
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-[#FF6B9D]">MY TICKET DATA</p>
            <h2 className="mt-0.5 text-[17px] font-extrabold text-gray-900">わたしの当選データ</h2>
          </div>
          <button type="button" onClick={handleShare} disabled={sharing || ticketStats.total === 0} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#FF6B9D] px-3 text-[11px] font-bold text-white disabled:opacity-40">
            {sharing ? <Download size={14} /> : <Share2 size={14} />}
            {sharing ? "作成中" : "SNSで見せる"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[9px] font-bold text-gray-500">アーティスト
            <select value={artistFilter} onChange={(event) => setArtistFilter(event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-800 outline-none focus:border-[#FF6B9D]">
              <option value="all">すべて</option>
              {artistOptions.map((artist) => <option key={artist.slug} value={artist.slug}>{artist.name}</option>)}
            </select>
          </label>
          <label className="text-[9px] font-bold text-gray-500">期間
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="mt-1 h-9 w-full rounded-xl border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-800 outline-none focus:border-[#FF6B9D]">
              <option value="all">全期間</option>
              {yearOptions.map((year) => <option key={year} value={year}>{year}年</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF4F8] to-[#FFE6EF] p-4">
          <p className="truncate text-[10px] font-bold text-gray-500">{scopeLabel}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div><p className="text-[9px] font-semibold text-gray-400">当選率</p><p className="text-[42px] font-extrabold leading-none text-[#FF6B9D]">{ticketStats.rate === null ? "--" : `${ticketStats.rate}%`}</p></div>
            <div className="grid grid-cols-3 gap-3 pb-1 text-center">
              <div><p className="text-[17px] font-extrabold text-gray-800">{ticketStats.won}</p><p className="text-[8px] text-gray-400">当選</p></div>
              <div><p className="text-[17px] font-extrabold text-gray-800">{ticketStats.lost}</p><p className="text-[8px] text-gray-400">落選</p></div>
              <div><p className="text-[17px] font-extrabold text-gray-800">{ticketStats.total}</p><p className="text-[8px] text-gray-400">申込</p></div>
            </div>
          </div>
        </div>
        {shareMessage && <p className="mt-2 text-[10px] text-gray-500">{shareMessage}</p>}
      </div>
      <TrendSection title={scopeLabel} ticketStats={ticketStats} arenaStats={arenaStats} upgradeStats={upgradeStats} />
    </section>
  );
}

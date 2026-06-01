"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

export default function ArtistReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router   = useRouter();
  const artist   = findArtistBySlug(slug);

  const [ticketWon,    setTicketWon]    = useState(0);
  const [ticketLost,   setTicketLost]   = useState(0);
  const [upgradeWon,   setUpgradeWon]   = useState(0);
  const [upgradeLost,  setUpgradeLost]  = useState(0);
  const [ctaEventId,   setCtaEventId]   = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!artist) return;
    (async () => {
      const orFilter = artist.keywords.map(kw => `title.ilike.%${kw}%`).join(",");

      const [voteRes, eventRes] = await Promise.all([
        supabase
          .from("ticket_result_votes")
          .select("vote_type, result")
          .eq("artist_slug", slug),
        supabase
          .from("events")
          .select("id, title, date")
          .or(orFilter)
          .order("date", { ascending: true })
          .limit(50),
      ]);

      if (voteRes.data) {
        let tw = 0, tl = 0, uw = 0, ul = 0;
        for (const row of voteRes.data) {
          if (row.vote_type === "ticket") {
            if (row.result === "won")       tw++;
            else if (row.result === "lost") tl++;
          } else {
            if (row.result === "won")       uw++;
            else if (row.result === "lost") ul++;
          }
        }
        setTicketWon(tw);
        setTicketLost(tl);
        setUpgradeWon(uw);
        setUpgradeLost(ul);
      }

      if (eventRes.data && eventRes.data.length > 0) {
        const today    = new Date().toISOString().split("T")[0];
        const allEvs   = eventRes.data as CrawledEvent[];
        const upcoming = allEvs.filter(ev => ev.date && ev.date >= today);
        setCtaEventId((upcoming.length > 0 ? upcoming[0] : allEvs[allEvs.length - 1])?.id ?? null);
      }

      setLoading(false);
    })();
  }, [artist, slug]);

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: "#eef3f7" }}>
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
        <Link href="/" className="rounded-full px-5 py-2.5 text-xs font-bold text-white" style={{ background: "#006876" }}>ホームに戻る</Link>
      </div>
    );
  }

  const ticketTotal  = ticketWon + ticketLost;
  const upgradeTotal = upgradeWon + upgradeLost;
  const ticketRate   = ticketTotal  > 0 ? Math.round(ticketWon  / ticketTotal  * 100) : null;
  const upgradeRate  = upgradeTotal > 0 ? Math.round(upgradeWon / upgradeTotal * 100) : null;

  return (
    <div className="min-h-screen" style={{ background: "#e8edf0" }}>
      <div className="mx-auto w-full max-w-[430px] min-h-screen relative shadow-2xl" style={{ background: "#f3f6f8" }}>

        {/* ヘッダー */}
        <header
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex justify-between items-center px-4 h-14"
          style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center active:scale-95 transition-transform rounded-full"
            style={{ background: "rgba(0,104,118,0.06)" }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <h1 className="text-[16px] font-bold tracking-tight" style={{ color: "#006876" }}>当選詳細・現地レポート</h1>
          <div className="w-10" />
        </header>

        <main className="pt-14 pb-24">

          {/* アーティスト名カード */}
          <div className="px-4 pt-4">
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 shadow-sm">
              <p className="font-bold text-base text-gray-900">{artist.name}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">当選状況や現地の会場情報をまとめています</p>
            </div>
          </div>

          {/* 当選状況サマリー */}
          <section className="mt-4 px-4">
            <h3 className="text-[17px] font-semibold mb-2" style={{ color: "#1c2b30" }}>当選状況サマリー</h3>
            <div className="bg-white border border-gray-100 rounded-xl px-4 pt-3.5 pb-4 shadow-sm">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: "#006876", borderTopColor: "transparent" }} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl" style={{ background: "rgba(0,104,118,0.06)" }}>
                      <p className="text-[10px] font-bold text-gray-500 mb-0.5">チケット当選率</p>
                      <p className="text-2xl font-bold leading-none mt-1" style={{ color: "#006876" }}>
                        {ticketRate !== null ? `${ticketRate}%` : "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{ticketTotal}票</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)" }}>
                      <p className="text-[10px] font-bold text-gray-500 mb-0.5">アプグレ当選率</p>
                      <p className="text-2xl font-bold leading-none mt-1 text-amber-500">
                        {upgradeRate !== null ? `${upgradeRate}%` : "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{upgradeTotal}票</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-200 cursor-not-allowed"
                    style={{ background: "#f9fafb" }}
                  >
                    詳しい当落報告は準備中
                  </button>
                </>
              )}
            </div>
          </section>

          {/* 詳細当選状況 */}
          <section className="mt-4 px-4">
            <h3 className="text-[17px] font-semibold mb-2" style={{ color: "#1c2b30" }}>詳細当選状況</h3>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-5 shadow-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,104,118,0.08)" }}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500">公演別・応募枠別の当選データ</p>
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  近日公開予定。みなさんの投票が増えるほど精度が上がります！
                </p>
              </div>
            </div>
          </section>

          {/* 現地レポート */}
          <section className="mt-4 px-4">
            <h3 className="text-[17px] font-semibold mb-2" style={{ color: "#1c2b30" }}>現地レポート</h3>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {[
                {
                  label: "入場・グッズ列情報",
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                },
                {
                  label: "場内・ステージ構成",
                  icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
                },
                {
                  label: "交通・アクセス情報",
                  icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                },
              ].map(({ label, icon }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,104,118,0.07)" }}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,104,118,0.08)", color: "#006876" }}>準備中</span>
                </div>
              ))}
            </div>
          </section>

          {/* 報告導線 */}
          <section className="mt-4 px-4">
            <h3 className="text-[17px] font-semibold mb-2" style={{ color: "#1c2b30" }}>報告する</h3>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {/* 当落報告 → アーティストページ */}
              <Link
                href={`/artists/${slug}`}
                className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,104,118,0.07)" }}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">当落報告</p>
                    <p className="text-[11px] text-gray-400">アーティストページで投票できます</p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* 現地レポート → 準備中 */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">現地レポート投稿</p>
                    <p className="text-[11px] text-gray-400">準備中</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">準備中</span>
              </div>

              {/* 座席報告 → events/[id] */}
              {ctaEventId && (
                <Link
                  href={`/events/${ctaEventId}`}
                  className="flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,104,118,0.07)" }}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">座席報告</p>
                      <p className="text-[11px] text-gray-400">座席が決まったら報告しよう</p>
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </section>

        </main>

        {/* ボトムナビ */}
        <nav
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100"
          style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            <Link
              href={`/artists/${slug}`}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400">集計まとめ</span>
            </Link>

            <div className="flex flex-col items-center gap-0.5 px-4 py-1.5">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="text-[10px] font-bold" style={{ color: "#006876" }}>座席予想</span>
            </div>

            <Link
              href={ctaEventId ? `/events/${ctaEventId}/after-report` : "#"}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400">現地レポ</span>
            </Link>

            <Link
              href={`/artists/${slug}/setlist`}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400">セトリ</span>
            </Link>
          </div>
        </nav>

      </div>
    </div>
  );
}

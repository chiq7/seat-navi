"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ARTISTS, findArtistByKeyword, type Artist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

const ACCENT = "#006a63";

const TEXT = {
  all: "\u3059\u3079\u3066",
  femaleIdol: "\u5973\u6027\u30a2\u30a4\u30c9\u30eb",
  maleIdol: "\u7537\u6027\u30a2\u30a4\u30c9\u30eb",
  pending: "\u6e96\u5099\u4e2d",
  latestEvent: "\u6700\u65b0\u516c\u6f14",
  seatPrediction: "\u5ea7\u5e2d\u4e88\u60f3",
  accepting: "\u53d7\u4ed8\u4e2d",
  winRate: "\u5f53\u9078\u7387",
  aggregating: "\u96c6\u8a08\u4e2d",
  afterReport: "\u73fe\u5730\u30ec\u30dd",
  normal: "\u901a\u5e38",
  setlist: "\u30bb\u30c8\u30ea",
  exists: "\u3042\u308a",
  koenNow: "\u516c\u6f14\u306a\u3046",
  searchPlaceholder: "\u30a2\u30fc\u30c6\u30a3\u30b9\u30c8\u3001\u30a4\u30d9\u30f3\u30c8\u540d\u3067\u691c\u7d22",
  clear: "\u30af\u30ea\u30a2",
  bannerTitle: "\u30e9\u30a4\u30d6\u306e\u77e5\u308a\u305f\u3044\u304c\u96c6\u307e\u308b",
  bannerLine1: "\u5f53\u9078\u30c7\u30fc\u30bf\u3068\u30d5\u30a1\u30f3\u306e\u5831\u544a\u304b\u3089\u3001",
  bannerLine2: "\u5ea7\u5e2d\u4e88\u60f3\u30fb\u30bb\u30c8\u30ea\u30fb\u73fe\u5730\u30ec\u30dd\u3092\u66f4\u65b0\u4e2d\uff01",
  upcoming: "\u958b\u50ac\u304c\u8fd1\u3044\u516c\u6f14",
  notFound: "\u516c\u6f14\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093",
  retry: "\u691c\u7d22\u30ef\u30fc\u30c9\u3084\u30b8\u30e3\u30f3\u30eb\u3092\u5909\u3048\u3066\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  seeAll: "\u3059\u3079\u3066\u898b\u308b",
  home: "\u30db\u30fc\u30e0",
  search: "\u691c\u7d22",
  report: "\u5831\u544a",
  myPage: "\u30de\u30a4\u30da\u30fc\u30b8",
} as const;

const GENRE_CHIPS = [
  { key: "all", label: TEXT.all, genres: null },
  { key: "female_idol", label: TEXT.femaleIdol, genres: ["female_idol"] },
  { key: "male_idol", label: TEXT.maleIdol, genres: ["male_idol", "johnnys"] },
  { key: "kpop", label: "K-POP", genres: ["kpop"] },
  { key: "jpop", label: "J-POP", genres: ["other"] },
] as const;

const PUBLISHED_EVENT_ARTIST_SLUGS = new Set(["nogizaka46", "sakurazaka46", "niziu", "equal-love", "fruits-zipper"]);

type TopEventCard = {
  id: string;
  artist: Artist;
  title: string;
  date: string;
  dateLabel: string;
  href: string;
  hasAfterReportNew: boolean;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return TEXT.pending;
  const [, month, day] = dateStr.split("-").map(Number);
  if (!month || !day) return TEXT.pending;
  return `${month}/${day}`;
}

function normalizeEventTitle(event: CrawledEvent, artist: Artist) {
  const matchedKeyword = artist.keywords
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((keyword) => event.title.toLowerCase().startsWith(keyword.toLowerCase()));

  const title = matchedKeyword
    ? event.title.slice(matchedKeyword.length).trim()
    : event.title.replace(new RegExp(`^${artist.name}\\s*`, "i"), "").trim();

  return title && title !== artist.name ? title : TEXT.latestEvent;
}

function EventCard({ card }: { card: TopEventCard }) {
  return (
    <Link
      href={card.href}
      className="flex min-h-[198px] w-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition active:scale-[0.99] sm:min-h-[220px]"
    >
      <div className="min-w-0 bg-gradient-to-b from-cyan-50 to-white px-3.5 pb-2.5 pt-3 sm:px-4 sm:pt-3.5">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold" style={{ color: ACCENT }}>
              {card.artist.name}
            </p>
            {card.title && (
              <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-snug text-slate-950 sm:text-base">
                {card.title}
              </h3>
            )}
          </div>
          <span className="shrink-0 rounded-full border border-cyan-100 bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
            {card.dateLabel}
          </span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-200 px-3.5 pb-3.5 pt-3.5 sm:px-4 sm:pb-4">
        {[
          { label: TEXT.seatPrediction, value: TEXT.accepting, className: "border-teal-200 bg-teal-50 text-teal-700" },
          { label: TEXT.winRate, value: TEXT.aggregating, className: "border-cyan-100 bg-cyan-50 text-cyan-700" },
          {
            label: TEXT.afterReport,
            value: card.hasAfterReportNew ? "NEW" : TEXT.normal,
            className: card.hasAfterReportNew
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-slate-200 bg-slate-50 text-slate-700",
          },
          { label: TEXT.setlist, value: TEXT.exists, className: "border-slate-200 bg-slate-50 text-slate-700" },
        ].map((chip) => (
          <div key={chip.label} className={`rounded-xl border px-2.5 py-2 ${chip.className}`}>
            <p className="text-[9px] font-bold leading-none text-slate-400 sm:text-[10px]">{chip.label}</p>
            <p className="mt-1.5 text-[11px] font-extrabold leading-none sm:text-xs">{chip.value}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function Home() {
  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(300);

      if (error) console.error("Supabase fetch error:", error);
      setEvents((data as CrawledEvent[]) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  const cards = useMemo(() => {
    const eventByArtist = new Map<string, CrawledEvent>();

    events.forEach((event) => {
      const artist = findArtistByKeyword(event.title);
      if (!artist || eventByArtist.has(artist.slug)) return;
      eventByArtist.set(artist.slug, event);
    });

    return ARTISTS.flatMap((artist) => {
      if (!PUBLISHED_EVENT_ARTIST_SLUGS.has(artist.slug)) return [];
      const event = eventByArtist.get(artist.slug);
      if (!event?.date) return [];
      return {
        id: event?.id ?? `artist-${artist.slug}`,
        artist,
        title: normalizeEventTitle(event, artist),
        date: event.date,
        dateLabel: formatDate(event.date),
        href: `/artists/${artist.slug}`,
        hasAfterReportNew: true,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const chip = GENRE_CHIPS.find((item) => item.key === activeGenre);

    return cards.filter((card) => {
      if (chip?.genres && !(chip.genres as readonly CrawledEvent["genre"][]).includes(card.artist.genre)) return false;
      if (!q) return true;
      return (
        card.artist.name.toLowerCase().includes(q) ||
        card.artist.keywords.some((keyword) => keyword.toLowerCase().includes(q)) ||
        card.title.toLowerCase().includes(q)
      );
    });
  }, [activeGenre, cards, search]);

  return (
    <div className="min-h-screen bg-white pb-20 text-slate-950 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-extrabold tracking-tight" style={{ color: ACCENT }}>
            {TEXT.koenNow}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <section>
          <div className="rounded-[26px] bg-gradient-to-b from-cyan-50 to-white p-4 sm:p-6">
            <div className="rounded-[22px] border border-cyan-100 bg-white p-2 shadow-sm">
              <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-4 py-3.5">
                <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={TEXT.searchPlaceholder}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-xs font-bold text-slate-400">
                    {TEXT.clear}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ARTISTS.map((artist, index) => {
                const className =
                  index === 0
                    ? "shrink-0 rounded-full px-4 py-2 text-xs font-extrabold text-white shadow-sm"
                    : "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600";
                const style = index === 0 ? { background: ACCENT } : undefined;

                return (
                  <Link key={artist.slug} href={`/artists/${artist.slug}`} className={className} style={style}>
                    {artist.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="rounded-[26px] bg-gradient-to-br from-[#006a63] via-[#2fb8b0] to-[#dff8ff] px-5 py-5 text-center text-white shadow-sm sm:px-8 sm:py-6">
            <p className="text-xl font-extrabold leading-snug sm:text-2xl">{TEXT.bannerTitle}</p>
            <p className="mx-auto mt-2 max-w-2xl text-xs font-semibold leading-6 text-white/90 sm:text-sm">
              <span>{TEXT.bannerLine1}</span>
              <span className="block">{TEXT.bannerLine2}</span>
            </p>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3">
            <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">{TEXT.upcoming}</h1>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GENRE_CHIPS.map((chip) => {
              const active = activeGenre === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setActiveGenre(chip.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                    active ? "border-transparent text-white" : "border-slate-200 bg-white text-slate-500"
                  }`}
                  style={active ? { background: ACCENT } : undefined}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div id="events">
            {loading ? (
              <div className="grid w-full grid-cols-2 gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-[216px] animate-pulse rounded-[22px] bg-slate-100" />
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="rounded-[22px] border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-700">{TEXT.notFound}</p>
                <p className="mt-1 text-xs text-slate-400">{TEXT.retry}</p>
              </div>
            ) : (
              <div className="grid w-full grid-cols-2 gap-3">
                {filteredCards.map((card) => (
                  <EventCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-center">
            <Link
              href="#events"
              className="rounded-full border border-cyan-100 bg-white px-5 py-2.5 text-xs font-extrabold shadow-sm"
              style={{ color: ACCENT }}
            >
              {TEXT.seeAll}
            </Link>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 px-2 py-2">
          {[
            [TEXT.home, "M3 12l9-9 9 9M5 10v10h14V10"],
            [TEXT.search, "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"],
            [TEXT.report, "M12 4v16m8-8H4"],
            [TEXT.myPage, "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 20c0-2.5 3.6-4.5 8-4.5s8 2 8 4.5"],
          ].map(([label, d], index) => (
            <button
              key={label}
              type="button"
              className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-bold ${
                index === 0 ? "text-teal-700" : "text-slate-400"
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

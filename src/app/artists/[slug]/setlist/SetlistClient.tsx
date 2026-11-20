"use client";

import { use, useEffect, useRef, useState, useMemo, type SetStateAction } from "react";
import Image from "next/image";
import ArtistGroupPhoto from "@/components/common/ArtistGroupPhoto";
import { getArtistGroupImage } from "@/lib/artistGroupImages";
import Link from "next/link";
import { Film, ListEnd, ListStart, MessageCircle, Mic2, Music2, Plus, Sparkles, Star, Zap } from "lucide-react";
import { anonymousSupabase, supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { MISSING_PERFORMANCE_MESSAGE } from "@/lib/requestedPerformance";
import { parseEventTitle } from "@/lib/eventTitle";
import { trackEvent } from "@/lib/analytics";
import type { InitialSetlist } from "@/lib/publicArtistContent";
import type { CrawledEvent } from "@/lib/types";
import { type EditableItem, computeSongNumbers, hasSetlistSongs, readSetlistReviewSource } from "@/lib/setlistHelpers";
import { AccountLink } from "@/components/auth/AccountLink";
import { BottomNav } from "@/components/common/BottomNav";
import { CompactEventPickerSection } from "@/components/common/CompactEventPickerSection";
import { ShareButton } from "@/components/common/ShareButton";
import { Header } from "@/components/common/Header";
import { SetlistItemsSection } from "@/components/setlist/SetlistItemsSection";
import { SetlistArchive, type ArchiveEvent } from "@/components/setlist/SetlistArchive";
import archiveCounts from "@/lib/artistSetlistArchiveCounts.json";
import { DEFAULT_ARTIST_HERO_IMAGE, resolveArtistHeroImage, getJstDateString } from "@/lib/artistPageData";
import { canSaveSetlist } from "@/lib/searchContentGuides";
import { getEventDisplayVenueName, getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { eventVenueHref } from "@/lib/eventVenueHref";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

const MAKUHARI_20260606_UNSPECIFIED_EVENT = "731b731eacce4c94b500";

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SetlistClient({
  params,
  initialEvents: events,
  initialSetlist,
  unavailableEvent,
  hasPublishedSetlists,
  archivePreview,
  performanceLinks = [],
}: {
  params: Promise<{ slug: string }>;
  initialEvents: CrawledEvent[];
  initialSetlist: InitialSetlist;
  unavailableEvent: boolean;
  hasPublishedSetlists: boolean;
  archivePreview: ArchiveEvent[];
  performanceLinks?: { href: string; date: string; label: string; recording: boolean }[];
}) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialSetlist.eventId);
  const [toast, setToast]                     = useState<string | null>(null);
  const [setlistItems, setSetlistItems]       = useState<EditableItem[]>(initialSetlist.items);
  const [reviewSource, setReviewSource]       = useState(initialSetlist.source);
  const [searchQuery, setSearchQuery]         = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveStatus, setSaveStatus]           = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError]             = useState<string | null>(null);
  const [heroImageSrc, setHeroImageSrc]       = useState(() => resolveArtistHeroImage(artist?.heroImage));
  const autoSaveTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedEventId                         = useRef<string | null>(initialSetlist.eventId);
  const dirtyEventId                          = useRef<string | null>(null);
  const activeEventId                         = useRef(selectedEventId);
  const editRevision                          = useRef(0);
  const [readStatus, setReadStatus]           = useState<"loading" | "ready" | "error">("ready");
  const lastTrackedSetlistEvent               = useRef<string | null>(null);

  // ─── セトリ読み込み（イベント切替時） ─────────────────────────────────────────

  useEffect(() => {
    if (!selectedEventId || loadedEventId.current === selectedEventId) return;
    let cancelled = false;
    loadedEventId.current = null;
    dirtyEventId.current = null;
    activeEventId.current = selectedEventId;
    setReadStatus("loading");
    setSetlistItems([]);
    supabase
      .from("setlists")
      .select("items, review_source")
      .eq("event_id", selectedEventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setSaveStatus("idle");
        setSaveError(null);
        if (error) { setReadStatus("error"); return; }
        loadedEventId.current = selectedEventId;
        setReviewSource(readSetlistReviewSource(data?.review_source));
        setReadStatus("ready");
        if (data?.items && Array.isArray(data.items)) {
          setSetlistItems(data.items as EditableItem[]);
        } else {
          setSetlistItems([]);
        }
      });
    return () => { cancelled = true; };
  }, [selectedEventId]);

  // ─── 自動保存 ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canSaveSetlist(selectedEventId, loadedEventId.current, dirtyEventId.current)) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveSetlist();
    }, 800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setlistItems, selectedEventId]);

  // ─── 派生値 ──────────────────────────────────────────────────────────────────

  const today = getJstDateString();

  const archivedShows = (archiveCounts as Record<string, number>)[slug] ?? 0;
  const songNumbers = useMemo(() => computeSongNumbers(setlistItems), [setlistItems]);

  const selectedEvent = useMemo(
    () => events.find(ev => ev.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const { tourName, isTestData } = selectedEvent
    ? parseEventTitle(selectedEvent.title, artist?.name)
    : { tourName: "", isTestData: false };
  const venueSeatGuideHref = selectedEvent
    ? getPublicVenueSeatGuideHref(selectedEvent.venue_id, selectedEvent.venue)
    : null;
  const latestDatedShow = events.reduce((last, event) => event.date && event.date > last ? event.date : last, "");
  const pastLabel = selectedEvent?.date === latestDatedShow ? "直近の過去公演を表示中" : "過去公演を表示中";
  const makuhariPerformances = selectedEventId === MAKUHARI_20260606_UNSPECIFIED_EVENT
    ? events.filter(event => event.date === selectedEvent?.date
      && event.venue_id === selectedEvent?.venue_id && /（\d+部・開演\d{2}:\d{2}）$/.test(event.title))
    : [];

  // 曲名サジェストは未実装（将来アーティストごとの楽曲データを持たせて汎用化する）
  const filteredSuggestions: string[] = [];

  // ─── アクション ──────────────────────────────────────────────────────────────

  function selectEvent(id: string | null) {
    if (id === activeEventId.current) return;
    if (id) {
      const url = new URL(window.location.href);
      url.searchParams.set("event", id);
      window.history.replaceState(window.history.state, "", url);
    }
    activeEventId.current = id;
    loadedEventId.current = null;
    dirtyEventId.current = null;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSetlistItems([]);
    setReviewSource(null);
    setReadStatus("loading");
    setSelectedEventId(id);
  }

  function editItems(update: SetStateAction<EditableItem[]>) {
    if (reviewSource || !selectedEventId || loadedEventId.current !== selectedEventId) return;
    dirtyEventId.current = selectedEventId;
    editRevision.current += 1;
    setSetlistItems(update);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addSong(title?: string) {
    const t = (title ?? searchQuery).trim();
    if (!t) return;
    editItems(prev => [...prev, { id: newId(), type: "song" as const, title: t }]);
    showToast(`「${t}」を追加しました`);
    setSearchQuery("");
    setShowSuggestions(false);
  }

  function addMC() {
    editItems(prev => [...prev, { id: newId(), type: "mc" as const }]);
  }

  function addEncore() {
    editItems(prev => [...prev, { id: newId(), type: "encore" as const }]);
  }

  function addSeparator(label: string) {
    editItems(prev => [...prev, { id: newId(), type: "separator" as const, label }]);
  }

  function addTag(label: string) {
    editItems(prev => [...prev, { id: newId(), type: "tag" as const, label }]);
  }

  function moveItem(index: number, dir: "up" | "down") {
    editItems(prev => {
      const next = [...prev];
      const to = dir === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function removeItem(id: string) {
    editItems(prev => prev.filter(item => item.id !== id));
  }

  async function saveSetlist() {
    if (reviewSource || !canSaveSetlist(selectedEventId, loadedEventId.current, dirtyEventId.current)) return;
    const revision = editRevision.current;
    setSaveStatus("saving");
    setSaveError(null);
    const { error } = await anonymousSupabase
      .from("setlists")
      .upsert(
        { event_id: selectedEventId, items: setlistItems, updated_at: new Date().toISOString() },
        { onConflict: "event_id" },
      );
    if (activeEventId.current !== selectedEventId) return;
    if (error) {
      console.error("setlist save error:", error);
      setSaveStatus("error");
      setSaveError("保存に失敗しました。時間をおいて再度お試しください。");
    } else {
      if (revision === editRevision.current) dirtyEventId.current = null;
      if (setlistItems.length > 0 && lastTrackedSetlistEvent.current !== selectedEventId) {
        lastTrackedSetlistEvent.current = selectedEventId;
        trackEvent("report_submit", {
          report_type: "setlist",
          event_id: selectedEventId,
          item_count: setlistItems.length,
        });
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  // ─── 未対応アーティスト ───────────────────────────────────────────────────────

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
        <Link
          href="/"
          className="rounded-full bg-[#FF6B9D] px-5 py-2.5 text-xs font-bold text-white"
        >
          ホームに戻る
        </Link>
      </div>
    );
  }



  const quickActions = [
    { label: "MC", icon: Mic2, action: addMC },
    { label: "トーク", icon: MessageCircle, action: () => addSeparator("トーク") },
    { label: "VCR", icon: Film, action: () => addTag("VCR") },
    { label: "メドレー開始", icon: ListStart, action: () => addSeparator("メドレー開始") },
    { label: "メドレー終了", icon: ListEnd, action: () => addSeparator("メドレー終了") },
    { label: "ダンスチャレンジ", icon: Zap, action: () => addTag("ダンスチャレンジ") },
    { label: "ラストMC", icon: Star, action: () => addTag("ラストMC") },
    { label: "アンコール", icon: Sparkles, action: addEncore },
  ];

  // ─── セトリ追加フォーム ─────────────────────────────────────────────────────

  const addFormNode = (
  <div className="community-panel p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <label htmlFor="setlist-song-title" className="mb-2 block text-[9px] font-black tracking-[0.18em] text-[#817981]">SONG TITLE</label>
          <input
            id="setlist-song-title"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={e => { if (e.key === "Enter") addSong(); }}
            placeholder="曲名を入力"
            className="community-input h-12 w-full px-3 text-[14px] font-bold"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden border border-[#ded8dc] bg-white shadow-lg">
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onPointerDown={e => { e.preventDefault(); addSong(s); }}
                  className="zr-focus flex min-h-11 w-full items-center gap-2.5 border-b border-[#ded8dc] px-3 text-left transition-colors last:border-b-0 hover:bg-[#f7f5f6]"
                >
                  <Music2 size={15} className="shrink-0 text-[#f43679]" aria-hidden="true" />
                  <span className="text-[13px] font-bold text-[#1c171b]">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => addSong()}
          disabled={!searchQuery.trim()}
          className="zr-focus mt-[26px] flex h-12 w-12 shrink-0 items-center justify-center bg-[#f43679] text-white transition-opacity disabled:opacity-35"
          aria-label="曲を追加"
        >
          <Plus size={21} aria-hidden="true" />
        </button>
      </div>

      <p className="mb-2 mt-5 text-[9px] font-black tracking-[0.18em] text-[#817981]">LIVE MOMENT</p>
        <div className="grid grid-cols-2 gap-2">
        {quickActions.map(({ label, icon: Icon, action }) => (
            <button key={label} type="button" onClick={action} className="community-card zr-focus flex min-h-12 items-center gap-2 px-3 text-left text-[10px] font-black text-[#2b252b] transition-colors hover:bg-[#fff0f5]">
            <Icon size={15} strokeWidth={1.8} className="shrink-0 text-[#f43679]" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="community-page font-sans">
      <section className={getArtistGroupImage(slug) ? "relative overflow-hidden bg-[#8d6578] text-white" : "relative flex min-h-[274px] flex-col overflow-hidden bg-[#8d6578] text-white sm:min-h-[348px]"}>
        {!getArtistGroupImage(slug) && <><Image
          src={heroImageSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 26%" }}
          onError={() => {
            if (heroImageSrc !== DEFAULT_ARTIST_HERO_IMAGE) setHeroImageSrc(DEFAULT_ARTIST_HERO_IMAGE);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#765065]/48 via-[#8d6578]/18 to-[#8d6578]/92" />
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-[#8d6578] via-[#8d6578]/84 to-transparent" /></>}
        <Header
          title="セトリ"
          breadcrumbParents={[{ href: `/artists/${slug}`, label: artist.name }]}
          backHref={`/artists/${slug}`}
          backLabel={`${artist.name}へ戻る`}
          rightSlot={
            <div className="flex items-center">
              <AccountLink iconSize={22} />
              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/artists/${slug}/setlist${selectedEventId ? `?event=${encodeURIComponent(selectedEventId)}` : ""}`}
                text={`${artist.name} のセットリスト🎤 #ちけレポ`}
                className="zr-focus flex h-11 w-11 items-center justify-center rounded-full text-[#665761] transition-colors active:bg-[#fff0f5]"
              />
            </div>
          }
        />
        {getArtistGroupImage(slug) && <ArtistGroupPhoto key={slug} slug={slug} name={artist.name} variant="hero" priority />}
        <div className={`zr-container relative z-10 pb-5 pt-5 sm:pb-7 ${getArtistGroupImage(slug) ? "" : "mt-auto"}`}>
          <p className="text-[10px] font-black tracking-[0.24em] text-[#ffb1cb]">SETLIST ARCHIVE</p>
          <h1 className="mt-2 text-[29px] font-black leading-[1.2] tracking-[-0.05em] sm:text-[44px]">{artist.name}のセトリ</h1>
          <p className="mt-2 text-[11px] font-bold text-white/76 sm:text-[13px]">{artist.name}</p>
        </div>
      </section>

      <main className="pb-20">
        {unavailableEvent && !selectedEventId && <p role="alert" className="zr-container pt-3 text-sm font-bold text-[#952c45]">{MISSING_PERFORMANCE_MESSAGE}</p>}
        {events.length > 0 && <CompactEventPickerSection
          headingId="setlist-event-title"
          title="公演を選ぶ"
          events={events}
          selectedEventId={selectedEventId}
          onSelect={selectEvent}
          artistName={artist.name}
          today={today}
          eyebrow={selectedEvent?.date && selectedEvent.date < today ? pastLabel : "公演日を選ぶ"}
          showVenueDay={false}
          includeTitle
          wrapSelectedLabel
          footer={selectedEvent ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="min-w-0 text-[12px] font-bold leading-5 text-[#665861]">
                <p>{tourName || selectedEvent.title}{isTestData ? "（テストデータ）" : ""}</p>
                <p>
                  {selectedEvent.date && <time dateTime={selectedEvent.date}>{selectedEvent.date.replaceAll("-", "/")}</time>}
                  {selectedEvent.date && " · "}{getEventDisplayVenueName(selectedEvent.venue_id, selectedEvent.venue)}
                </p>
              </div>
              <Link
                href={venueSeatGuideHref ? eventVenueHref(venueSeatGuideHref, selectedEvent.id) : `/events/${selectedEvent.id}`}
                className="zr-focus inline-flex min-h-11 items-center rounded-full border border-[#eadfe4] bg-white px-3 text-sm font-bold text-[#84234f]"
              >
                {venueSeatGuideHref ? "会場の座席表" : "公演ページ"}
              </Link>
            </div>
          ) : null}
        />}

        {performanceLinks.length > 0 && (
          <section className="zr-container pb-4">
            <details className="rounded-xl border border-[#eadfe4] bg-white p-3">
              <summary className="zr-focus cursor-pointer text-sm font-bold text-[#84234f]">確認済みの公演別セトリ（{performanceLinks.length}件）</summary>
              <ul className="mt-2 divide-y divide-[#eadfe4]">
                {performanceLinks.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} prefetch={false} className="zr-focus flex min-h-11 items-center px-2 text-sm underline">
                      {link.label}{link.recording ? "（公式映像収録版）" : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}
        <SetlistArchive key={slug} slug={slug} count={archivedShows} initialEvents={archivePreview} />
        {!hasPublishedSetlists && !hasSetlistSongs(setlistItems) && !unavailableEvent &&
          <div className="zr-container py-4 text-sm" data-setlist-list-empty>
            <p>このアーティストの公開セトリはまだありません。</p>
            <div className="flex flex-wrap gap-x-4">
              <Link href={`/artists/${slug}#artist-events`} className="zr-focus inline-flex min-h-11 items-center font-bold text-[#84234f] underline">公演一覧を見る</Link>
              <Link href={venueSeatGuideHref && selectedEvent ? eventVenueHref(venueSeatGuideHref, selectedEvent.id) : "/venues"} className="zr-focus inline-flex min-h-11 items-center font-bold text-[#84234f] underline">
                {venueSeatGuideHref ? "この会場の座席表を見る" : "会場の座席表を探す"}
              </Link>
            </div>
          </div>}
        <section className="zr-container pb-12">
          <div className="mb-3 min-h-5">
            {saveStatus !== "idle" && (
              <p aria-live="polite" className={`text-right text-[10px] font-black ${saveStatus === "error" ? "text-red-500" : "text-[#817981]"}`}>
                {saveStatus === "saving" && "保存中..."}
                {saveStatus === "saved" && "保存しました ✓"}
                {saveStatus === "error" && (saveError ?? "保存に失敗しました")}
              </p>
            )}
          </div>
          {readStatus === "loading" && selectedEventId && <p role="status" className="mb-4 text-sm text-[#665861]">この公演の投稿セットリストを読み込み中です。</p>}
          {readStatus === "error" && <p role="status" className="mb-4 text-sm text-[#665861]">投稿セットリストを読み込めませんでした。時間をおいて再度開いてください。</p>}
          {selectedEventId && readStatus === "ready" && <>
          {makuhariPerformances.length > 0 && (
            <div className="mb-4 rounded-xl border border-[#eadfe4] bg-[#fff6fa] p-3">
              <p className="text-sm font-black text-[#84234f]">開演時刻を選んでセトリを見る</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {makuhariPerformances.map(event => (
                  <Link key={event.id} className="zr-focus inline-flex min-h-11 items-center rounded-full border border-[#eadfe4] bg-white px-3 text-sm font-bold text-[#84234f]"
                    href={`/artists/${slug}/setlist?event=${event.id}`}>
                    {event.title.match(/（(\d+部・開演\d{2}:\d{2})）$/)?.[1]}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {reviewSource && (
            <div data-setlist-source={reviewSource.kind} className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eadfe4] bg-[#fff6fa] px-3 py-2">
              <div>
                <p className="text-sm font-black text-[#84234f]">{reviewSource.kind === "official_recording" ? "公式映像収録版" : "出典確認済み"}</p>
                {reviewSource.kind === "official_recording" && <p className="mt-1 text-xs text-[#665861]">DVD・Blu-rayの収録順です。</p>}
              </div>
              {reviewSource.url && <a className="zr-focus inline-flex min-h-11 items-center px-2 text-xs font-bold text-[#84234f] underline" href={reviewSource.url} target="_blank" rel="noopener noreferrer">出典を見る</a>}
            </div>
          )}
          <fieldset disabled={!selectedEventId || readStatus !== "ready"} className="min-w-0 disabled:opacity-60">
          <legend className="sr-only">公演ごとの投稿セットリスト</legend>
          <SetlistItemsSection
            key={selectedEventId}
            readOnly={Boolean(reviewSource)}
            setlistItems={setlistItems}
            songNumbers={songNumbers}
            onMove={moveItem}
            onRemove={removeItem}
            addFormNode={addFormNode}
          />
          </fieldset>
          </>}
        </section>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 max-w-[calc(100%_-_32px)] -translate-x-1/2 rounded-full border border-[#d8c2ce] bg-[#704e60] px-4 py-3 text-[11px] font-black text-white shadow-xl">
          {toast}
        </div>
      )}

      <BottomNav active="setlist" artistSlug={slug} eventId={selectedEventId ?? undefined} />
    </div>
  );
}

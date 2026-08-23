"use client";

import { use, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { Film, ListEnd, ListStart, MessageCircle, Mic2, Music2, Plus, Sparkles, Star, Zap } from "lucide-react";
import { anonymousSupabase, supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { parseEventTitle } from "@/lib/eventTitle";
import { trackEvent } from "@/lib/analytics";
import type { CrawledEvent } from "@/lib/types";
import { type EditableItem, computeSongNumbers } from "@/lib/setlistHelpers";
import { AccountLink } from "@/components/auth/AccountLink";
import { BottomNav } from "@/components/common/BottomNav";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { ShareButton } from "@/components/common/ShareButton";
import { Header } from "@/components/common/Header";
import { SetlistItemsSection } from "@/components/setlist/SetlistItemsSection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function selectInitialEventId(events: CrawledEvent[]): string | null {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = events
    .filter((event) => event.date && event.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  return (upcoming[0] ?? events[0])?.id ?? null;
}

export function SetlistClient({
  params,
  initialEvents,
}: {
  params: Promise<{ slug: string }>;
  initialEvents: CrawledEvent[];
}) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents]                   = useState<CrawledEvent[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => selectInitialEventId(initialEvents));
  const [toast, setToast]                     = useState<string | null>(null);
  const [setlistItems, setSetlistItems]       = useState<EditableItem[]>([]);
  const [searchQuery, setSearchQuery]         = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveStatus, setSaveStatus]           = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError]             = useState<string | null>(null);
  const [showAddForm, setShowAddForm]         = useState(false);
  const autoSaveTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave                          = useRef(false);
  const lastTrackedSetlistEvent               = useRef<string | null>(null);

  // ─── イベント一覧取得 ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!artist) return;
    if (initialEvents.length > 0) return;
    getEventsForArtist(artist.slug).then((evs) => {
      setEvents(evs);
      setSelectedEventId(selectInitialEventId(evs));
    });
  }, [artist, initialEvents]);

  // ─── セトリ読み込み（イベント切替時） ─────────────────────────────────────────

  useEffect(() => {
    if (!selectedEventId) return;
    skipNextSave.current = true;
    setShowAddForm(false);
    supabase
      .from("setlists")
      .select("items")
      .eq("event_id", selectedEventId)
      .maybeSingle()
      .then(({ data }) => {
        setSaveStatus("idle");
        setSaveError(null);
        if (data?.items && Array.isArray(data.items)) {
          setSetlistItems(data.items as EditableItem[]);
        } else {
          setSetlistItems([]);
        }
      });
  }, [selectedEventId]);

  // ─── 自動保存 ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!selectedEventId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveSetlist();
    }, 800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setlistItems]);

  // ─── 派生値 ──────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split("T")[0];

  const nextEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? events[0],
    [events, today],
  );

  const songNumbers = useMemo(() => computeSongNumbers(setlistItems), [setlistItems]);

  const selectedEvent = useMemo(
    () => events.find(ev => ev.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const { tourName, isTestData } = selectedEvent
    ? parseEventTitle(selectedEvent.title, artist?.name)
    : { tourName: "", isTestData: false };

  // 曲名サジェストは未実装（将来アーティストごとの楽曲データを持たせて汎用化する）
  const filteredSuggestions: string[] = [];

  // ─── アクション ──────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addSong(title?: string) {
    const t = (title ?? searchQuery).trim();
    if (!t) return;
    setSetlistItems(prev => [...prev, { id: newId(), type: "song" as const, title: t }]);
    showToast(`「${t}」を追加しました`);
    setSearchQuery("");
    setShowSuggestions(false);
  }

  function addMC() {
    setSetlistItems(prev => [...prev, { id: newId(), type: "mc" as const }]);
  }

  function addEncore() {
    setSetlistItems(prev => [...prev, { id: newId(), type: "encore" as const }]);
  }

  function addSeparator(label: string) {
    setSetlistItems(prev => [...prev, { id: newId(), type: "separator" as const, label }]);
  }

  function addTag(label: string) {
    setSetlistItems(prev => [...prev, { id: newId(), type: "tag" as const, label }]);
  }

  function moveItem(index: number, dir: "up" | "down") {
    setSetlistItems(prev => {
      const next = [...prev];
      const to = dir === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function removeItem(id: string) {
    setSetlistItems(prev => prev.filter(item => item.id !== id));
  }

  async function saveSetlist() {
    if (!selectedEventId) return;
    setSaveStatus("saving");
    setSaveError(null);
    const { error } = await anonymousSupabase
      .from("setlists")
      .upsert(
        { event_id: selectedEventId, items: setlistItems, updated_at: new Date().toISOString() },
        { onConflict: "event_id" },
      );
    if (error) {
      console.error("setlist save error:", error);
      setSaveStatus("error");
      setSaveError("保存に失敗しました。時間をおいて再度お試しください。");
    } else {
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
      <section className="community-hero">
        <Header
          title="セトリ"
          backHref={`/artists/${slug}`}
          backLabel={`${artist.name}へ戻る`}
          rightSlot={
            <div className="flex items-center">
              <AccountLink iconSize={22} />
              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/artists/${slug}/setlist`}
                text={`${artist.name} のセットリスト🎤 #ちけレポ`}
                className="zr-focus flex h-11 w-11 items-center justify-center rounded-full text-[#665761] transition-colors active:bg-[#fff0f5]"
              />
            </div>
          }
        />
        <div className="zr-container pb-10 pt-5 sm:pb-14 sm:pt-9">
          <Music2 size={29} strokeWidth={1.5} className="text-[#8165bb]" aria-hidden="true" />
          <p className="community-eyebrow mt-6">SETLIST ARCHIVE</p>
          <h1 className="community-title mt-3">ライブの記憶を、<br /><span className="text-[#8165bb]">曲順で残す。</span></h1>
          <p className="community-subtitle mt-5">{artist.name}のセトリをみんなで編集。曲、MC、演出まで自動保存されます。</p>
        </div>
      </section>

      <main className="pb-20">
        <section className="zr-container py-8 sm:py-12" aria-labelledby="setlist-event-title">
          <div className="pb-4">
            <p className="artist-kicker">Select Live</p>
            <h2 id="setlist-event-title" className="artist-heading">公演を選ぶ</h2>
          </div>
          {selectedEvent && (
          <div className="community-panel py-5 px-4">
              <p className="text-[10px] font-black tracking-[0.12em] text-[#f43679]">NOW EDITING</p>
              <p className="mt-2 text-[16px] font-black leading-6">{tourName || selectedEvent.title}</p>
              <p className="mt-1 text-[11px] font-bold text-[#817981]">{selectedEvent.date ?? "日程未定"} / {selectedEvent.venue}</p>
              {isTestData && <span className="mt-2 inline-block border border-[#ded8dc] px-2 py-1 text-[9px] font-black text-[#817981]">テストデータ</span>}
            </div>
          )}
          <div className="mt-5">
            <EventCarouselPicker
              events={events}
              selectedEventId={selectedEventId}
              onSelect={setSelectedEventId}
              artistName={artist.name}
              today={today}
            />
          </div>
        </section>

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
          <SetlistItemsSection
            setlistItems={setlistItems}
            songNumbers={songNumbers}
            onMove={moveItem}
            onRemove={removeItem}
            showAddForm={showAddForm}
            onOpenAddForm={() => setShowAddForm(true)}
            addFormNode={addFormNode}
          />
        </section>
      </main>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 max-w-[calc(100%_-_32px)] -translate-x-1/2 rounded-full border border-[#d8c2ce] bg-[#704e60] px-4 py-3 text-[11px] font-black text-white shadow-xl">
          {toast}
        </div>
      )}

      <BottomNav active="setlist" artistSlug={slug} eventId={nextEvent?.id} />
    </div>
  );
}

"use client";

import { use, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { parseEventTitle } from "@/lib/eventTitle";
import type { CrawledEvent } from "@/lib/types";
import { type EditableItem, computeSongNumbers } from "@/lib/setlistHelpers";
import { BottomNav } from "@/components/common/BottomNav";
import { Header } from "@/components/common/Header";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { EventInfoRow } from "@/components/common/EventInfoRow";
import { ShareButton } from "@/components/common/ShareButton";
import { SetlistItemsSection } from "@/components/setlist/SetlistItemsSection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SetlistClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents]                   = useState<CrawledEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [toast, setToast]                     = useState<string | null>(null);
  const [setlistItems, setSetlistItems]       = useState<EditableItem[]>([]);
  const [searchQuery, setSearchQuery]         = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveStatus, setSaveStatus]           = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError]             = useState<string | null>(null);
  const [showAddForm, setShowAddForm]         = useState(false);
  const autoSaveTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave                          = useRef(false);

  // ─── イベント一覧取得 ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!artist) return;
    getEventsForArtist(artist.slug).then((evs) => {
      setEvents(evs);
      const t = new Date().toISOString().split("T")[0];
      const upcoming = evs
        .filter(ev => ev.date && ev.date >= t)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      const def = upcoming[0] ?? evs[0];
      if (def) setSelectedEventId(def.id);
    });
  }, [artist]);

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
    const { error } = await supabase
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



  // ─── セトリ追加フォーム（既存UIそのまま。表示位置と表示/非表示のみ切替） ──────────

  const addFormNode = (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
      {/* 曲名入力 + 追加ボタン */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={e => { if (e.key === "Enter") addSong(); }}
            placeholder="曲名を入力"
            className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[13px] outline-none transition-colors focus:border-[#FF6B9D]"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onPointerDown={e => { e.preventDefault(); addSong(s); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-gray-100 hover:bg-gray-50"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <span className="text-[13px] text-gray-700">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => addSong()}
          disabled={!searchQuery.trim()}
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[#FF6B9D]/30 bg-[#FFF1F6] px-2.5 text-[11px] font-semibold text-[#FF6B9D] transition-opacity disabled:opacity-40 active:opacity-75"
        >
          <Image src="/images/setlist/icons/setlist-song.png" alt="" width={16} height={16} className="object-contain" />
          <span className="whitespace-nowrap">曲を追加</span>
        </button>
      </div>

      {/* 特殊項目チップ（横スクロール） */}
      <div
        className="-mx-3 flex gap-1.5 overflow-x-auto px-3"
        style={{ scrollbarWidth: "none" }}
      >
        <button type="button" onClick={addMC}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-mc.png" alt="" width={16} height={16} className="object-contain" />MC
        </button>
        <button type="button" onClick={() => addSeparator("トーク")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-talk.png" alt="" width={16} height={16} className="object-contain" />トーク
        </button>
        <button type="button" onClick={() => addTag("VCR")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-vcr.png" alt="" width={16} height={16} className="object-contain" />VCR
        </button>
        <button type="button" onClick={() => addSeparator("メドレー開始")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-medley-start.png" alt="" width={16} height={16} className="object-contain" />メドレー開始
        </button>
        <button type="button" onClick={() => addSeparator("メドレー終了")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-medley-end.png" alt="" width={16} height={16} className="object-contain" />メドレー終了
        </button>
        <button type="button" onClick={() => addTag("ダンスチャレンジ")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-dance-challenge.png" alt="" width={16} height={16} className="object-contain" />ダンスチャレンジ
        </button>
        <button type="button" onClick={() => addTag("ラストMC")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-50">
          <Image src="/images/setlist/icons/setlist-mc.png" alt="" width={16} height={16} className="object-contain" />ラストMC
        </button>
        <button type="button" onClick={addEncore}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[#FF6B9D]/20 bg-[#FFF8FB] px-2 py-0.5 text-[10px] font-medium text-[#FF6B9D] active:bg-[#FFF1F6]">
          <Image src="/images/setlist/icons/setlist-encore.png" alt="" width={16} height={16} className="object-contain" />アンコール
        </button>
      </div>
    </div>
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FFF8FB] font-sans">
      <div className="min-h-screen w-full bg-white">

        {/* ヘッダー */}
        <Header
          title={`${artist.name} セトリ・曲順`}
          backHref={`/artists/${slug}`}
          rightSlot={
            <ShareButton
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/artists/${slug}/setlist`}
              text={`${artist.name} のセットリスト🎤 #ちけレポ`}
            />
          }
        />

        <main className="pb-24">

          {/* 公演日選択 */}
          <div className="px-3 pt-0.5">
            {selectedEvent && (
              <>
                <EventInfoRow
                  title={tourName}
                  artistName={artist.name}
                  isTestData={isTestData}
                />
                <div className="mb-1 mt-0.5 border-t border-gray-100" />
              </>
            )}
            <EventCarouselPicker
              events={events}
              selectedEventId={selectedEventId}
              onSelect={setSelectedEventId}
              artistName={artist.name}
              today={today}
            />
          </div>

          {/* セトリリスト */}
          <section className="mt-3 space-y-3 px-3 pb-4">

            {/* 自動保存ステータス */}
            {saveStatus !== "idle" && (
              <p className={`text-right text-[10px] font-medium ${saveStatus === "error" ? "text-red-400" : "text-gray-400"}`}>
                {saveStatus === "saving" && "保存中..."}
                {saveStatus === "saved" && "保存しました ✓"}
                {saveStatus === "error" && (saveError ?? "保存に失敗しました")}
              </p>
            )}

            {/* セトリ一覧（+ セトリを追加ボタン／フォーム） */}
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

        {/* トースト */}
        {toast && (
          <div
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-800 px-4 py-2.5 text-[11px] font-semibold text-white shadow-lg"
            style={{ maxWidth: "calc(100% - 32px)" }}
          >
            {toast}
          </div>
        )}

        <BottomNav active="setlist" artistSlug={slug} eventId={nextEvent?.id} />

      </div>
    </div>
  );
}

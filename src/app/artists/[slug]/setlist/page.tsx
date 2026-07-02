"use client";

import { use, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { type EditableItem, computeSongNumbers } from "@/lib/setlistHelpers";
import { BottomNav } from "@/components/common/BottomNav";
import { EventDateTabs } from "@/components/setlist/EventDateTabs";
import { SetlistItemsSection } from "@/components/setlist/SetlistItemsSection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetlistPage({ params }: { params: Promise<{ slug: string }> }) {
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
  const autoSaveTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave                          = useRef(false);

  // ─── イベント一覧取得 ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!artist) return;
    const orFilter = artist.keywords.map(kw => `title.ilike.%${kw}%`).join(",");
    supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .or(orFilter)
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const evs = data as CrawledEvent[];
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

  const sortedEvents = useMemo(() => {
    const upcoming = events
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const past = events
      .filter(ev => !ev.date || ev.date < today)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return [...upcoming, ...past];
  }, [events, today]);

  const nextEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? events[0],
    [events, today],
  );

  const songNumbers = useMemo(() => computeSongNumbers(setlistItems), [setlistItems]);

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



  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="mx-auto min-h-screen w-full max-w-[390px] bg-white">

        {/* ヘッダー */}
        <header className="sticky top-0 z-30 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white">
          <Link
            href={`/artists/${slug}`}
            className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
          <div className="text-center">
            <p className="text-[13px] font-bold text-gray-900">{artist.name}</p>
            <p className="text-[10px] text-gray-400">セトリ・曲順</p>
          </div>
        </header>

        <main className="pb-24">

          {/* 公演日選択 */}
          <EventDateTabs
            sortedEvents={sortedEvents}
            selectedEventId={selectedEventId}
            today={today}
            onSelect={setSelectedEventId}
          />

          {/* フォーム + セトリリスト */}
          <section className="mt-4 space-y-3 px-4 pb-4">

            {/* セトリ追加カード */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <p className="mb-3 text-[13px] font-bold text-gray-900">セトリを追加</p>

              {/* 曲名入力 + 追加ボタン */}
              <div className="mb-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onKeyDown={e => { if (e.key === "Enter") addSong(); }}
                    placeholder="曲名を入力"
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-[13px] outline-none transition-colors focus:border-[#FF6B9D]"
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
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#FF6B9D]/30 bg-[#FFF1F6] px-3 text-[11px] font-semibold text-[#FF6B9D] transition-opacity disabled:opacity-40 active:opacity-75"
                >
                  <Image src="/images/setlist/icons/setlist-song.png" alt="" width={20} height={20} className="object-contain" />
                  <span className="whitespace-nowrap">曲を追加</span>
                </button>
              </div>

              {/* 特殊項目チップ（横スクロール） */}
              <div
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-0.5"
                style={{ scrollbarWidth: "none" }}
              >
                <button type="button" onClick={addMC}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-mc.png" alt="" width={20} height={20} className="object-contain" />MC
                </button>
                <button type="button" onClick={() => addSeparator("トーク")}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-talk.png" alt="" width={20} height={20} className="object-contain" />トーク
                </button>
                <button type="button" onClick={() => addTag("VCR")}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-vcr.png" alt="" width={20} height={20} className="object-contain" />VCR
                </button>
                <button type="button" onClick={() => addSeparator("メドレー開始")}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-medley-start.png" alt="" width={20} height={20} className="object-contain" />メドレー開始
                </button>
                <button type="button" onClick={() => addSeparator("メドレー終了")}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-medley-end.png" alt="" width={20} height={20} className="object-contain" />メドレー終了
                </button>
                <button type="button" onClick={() => addTag("ダンスチャレンジ")}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-dance-challenge.png" alt="" width={20} height={20} className="object-contain" />ダンスチャレンジ
                </button>
                <button type="button" onClick={() => addTag("ラストMC")}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 active:bg-gray-50">
                  <Image src="/images/setlist/icons/setlist-mc.png" alt="" width={20} height={20} className="object-contain" />ラストMC
                </button>
                <button type="button" onClick={addEncore}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-[#FF6B9D]/20 bg-[#FFF8FB] px-2.5 py-1 text-[10px] font-medium text-[#FF6B9D] active:bg-[#FFF1F6]">
                  <Image src="/images/setlist/icons/setlist-encore.png" alt="" width={20} height={20} className="object-contain" />アンコール
                </button>
              </div>
            </div>

            {/* 自動保存ステータス */}
            {saveStatus !== "idle" && (
              <p className={`text-right text-[10px] font-medium ${saveStatus === "error" ? "text-red-400" : "text-gray-400"}`}>
                {saveStatus === "saving" && "保存中..."}
                {saveStatus === "saved" && "保存しました ✓"}
                {saveStatus === "error" && (saveError ?? "保存に失敗しました")}
              </p>
            )}

            {/* セトリ一覧 */}
            <SetlistItemsSection
              setlistItems={setlistItems}
              songNumbers={songNumbers}
              onMove={moveItem}
              onRemove={removeItem}
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

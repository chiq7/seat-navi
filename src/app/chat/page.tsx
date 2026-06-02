"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { ChatBubble, TypingIndicator } from "@/components/chat-bubble";
import { SAMPLE_EVENTS } from "@/lib/sample-data";
import { starRating, atsumariLabel } from "@/lib/utils";
import type { Event } from "@/lib/types";

type ChatPhase = "select_event" | "summary" | "chat";

export default function ChatPage() {
  const router = useRouter();
  const { messages, isTyping, input, setInput, sendMessage } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Phase management
  const [phase, setPhase] = useState<ChatPhase>("select_event");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (phase === "chat") inputRef.current?.focus();
  }, [phase]);

  // Filter events for search
  const filteredEvents = searchQuery.trim()
    ? SAMPLE_EVENTS.filter(
        (e) =>
          e.event_name.includes(searchQuery) ||
          e.artist_name.includes(searchQuery) ||
          e.venue_name.includes(searchQuery)
      )
    : SAMPLE_EVENTS;

  // Handle event selection → show summary
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setPhase("summary");
  };

  // After summary, go to chat mode
  const handleStartChat = () => {
    setPhase("chat");
    // Send initial context message to AI
    sendMessage(
      `「${selectedEvent!.event_name}（${selectedEvent!.venue_name}）」の配席傾向を知りたい`
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 text-sm">
              🎀
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">公演なうAI</div>
              <div className="text-[10px] text-green-500">オンライン</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content by phase */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* ====== Phase 1: 公演選択 ====== */}
        {phase === "select_event" && (
          <div className="fade-in-up">
            {/* AI greeting */}
            <div className="mb-6 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 text-sm">
                🎀
              </div>
              <div className="rounded-2xl rounded-tl-md bg-gray-100 px-4 py-3">
                <p className="text-sm leading-relaxed text-gray-800">
                  どの公演の座席予想、知りたい？
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="公演名・アーティスト名で検索"
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            {/* Event selection cards */}
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleSelectEvent(event)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-[var(--accent)] hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 text-lg">
                    🎤
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-900">
                      {event.artist_name}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {event.event_name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{event.venue_name}</span>
                      <span>·</span>
                      <span className="text-amber-500">
                        {starRating(event.atsumari_score)}
                      </span>
                    </div>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====== Phase 2: 要約表示 + ボタン ====== */}
        {phase === "summary" && selectedEvent && (
          <div className="fade-in-up">
            {/* AI summary bubble */}
            <div className="mb-4 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 text-sm">
                🎀
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-gray-100 px-4 py-3">
                <p className="text-sm font-bold text-gray-900">
                  {selectedEvent.artist_name}の{selectedEvent.event_name}ね！
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">集まり度</span>
                  <span className="text-sm font-bold text-amber-500">
                    {starRating(selectedEvent.atsumari_score)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {atsumariLabel(selectedEvent.atsumari_score)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {selectedEvent.atsumari_score >= 3.5
                    ? "報告がかなり集まってきてるよ。FC一次はアリーナ前方寄り、一般はスタンドに多い傾向。"
                    : selectedEvent.atsumari_score >= 2
                      ? "報告が少しずつ集まってきてる。まだ傾向は固まりきってないけど、参考にはなるかも。"
                      : "まだ報告が少なめだから、予想はこれからって感じかな。報告してくれると嬉しい！"}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="ml-11 space-y-2.5">
              <button
                type="button"
                onClick={() => router.push(`/venue/${selectedEvent.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition-all hover:bg-blue-100 active:scale-[0.99]"
              >
                <span className="text-lg">🗺️</span>
                <div>
                  <div className="text-sm font-bold text-blue-900">予想マップを見る</div>
                  <div className="text-[10px] text-blue-600">ブロック別の配席傾向をチェック</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/venue/${selectedEvent.id}/section/new/post`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50 p-4 text-left transition-all hover:bg-pink-100 active:scale-[0.99]"
              >
                <span className="text-lg">✍️</span>
                <div>
                  <div className="text-sm font-bold text-pink-900">当選席を報告する</div>
                  <div className="text-[10px] text-pink-600">30秒で完了・予想精度が上がるよ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleStartChat}
                className="flex w-full items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left transition-all hover:bg-purple-100 active:scale-[0.99]"
              >
                <span className="text-lg">💬</span>
                <div>
                  <div className="text-sm font-bold text-purple-900">もっと詳しく聞く</div>
                  <div className="text-[10px] text-purple-600">AIに質問してみる</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhase("select_event");
                  setSelectedEvent(null);
                }}
                className="mt-2 text-xs text-gray-400 underline hover:text-gray-600"
              >
                ← 別の公演を選ぶ
              </button>
            </div>
          </div>
        )}

        {/* ====== Phase 3: チャット ====== */}
        {phase === "chat" && (
          <>
            {/* Selected event context badge */}
            {selectedEvent && (
              <div className="mb-4 flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-[10px] text-gray-500">
                <span>🎤</span>
                <span className="font-medium">{selectedEvent.artist_name}</span>
                <span>·</span>
                <span>{selectedEvent.venue_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("select_event");
                    setSelectedEvent(null);
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  変更
                </button>
              </div>
            )}

            {/* Quick suggestion chips (選択式8割) */}
            {messages.length <= 2 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  "FC一次ってどのへん来やすい？",
                  "アプグレの配席傾向は？",
                  "一般でアリーナ行ける？",
                  "クレカ払いで良席来る？",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          </>
        )}

        <div ref={endRef} className="h-4" />
      </div>

      {/* Input area (only in chat phase) */}
      {phase === "chat" && (
        <div className="fixed bottom-12 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-end gap-2 rounded-full border border-gray-200 bg-white py-2 pl-4 pr-2 shadow-sm transition-all focus-within:border-[var(--accent)] focus-within:shadow-md">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              rows={1}
              className="min-h-[20px] max-h-24 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-5 text-gray-900 outline-none placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all hover:bg-[var(--accent-dark)] active:scale-95 disabled:opacity-40"
              aria-label="送信"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white/90 backdrop-blur-md">
        <Link href="/" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-gray-400">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-medium">ホーム</span>
        </Link>
        <Link href="/chat" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[var(--accent)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-medium">AIチャット</span>
        </Link>
      </nav>
    </div>
  );
}

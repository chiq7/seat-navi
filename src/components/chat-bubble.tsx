"use client";

import type { ChatMessage } from "@/lib/types";

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} fade-in-up`}>
      {!isUser && (
        <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 text-sm">
          🎀
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-[var(--accent)] text-white"
            : "border border-gray-100 bg-gray-50 text-gray-800"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start fade-in-up">
      <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 text-sm">
        🎀
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
        <div className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <div className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <div className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </div>
    </div>
  );
}

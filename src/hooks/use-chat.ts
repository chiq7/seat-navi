"use client";

import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");

  const sendMessage = useCallback(
    async (
      content: string,
      context?: { sectionId?: string; venueId?: string }
    ) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            section_id: context?.sectionId ?? null,
            venue_id: context?.venueId ?? null,
            history: [...messages, userMessage].slice(-10),
          }),
        });

        const data = (await res.json()) as { response: string };

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.response ?? "ごめん、うまく返せなかった。もう一回聞いて？",
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-error-${Date.now()}`,
            role: "assistant",
            content: "通信エラーだった...もう一回試してみて？",
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [messages]
  );

  return {
    messages,
    isTyping,
    input,
    setInput,
    sendMessage,
    setMessages,
  };
}

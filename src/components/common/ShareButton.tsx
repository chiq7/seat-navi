"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export type ShareButtonProps = {
  /** 共有する絶対URL */
  url: string;
  /** 共有文（Web Share APIのtext / X投稿文として使用） */
  text: string;
  /** 未指定時はグレーのデフォルトスタイルを使用。指定時はボタンのスタイルを丸ごと置き換える */
  className?: string;
};

const DEFAULT_BUTTON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition-colors active:bg-gray-100";

/** アイコン型の共有ボタン。navigator.share対応時はOS共有シートを、非対応時（主にPC）はX共有/URLコピーのメニューを表示する */
export function ShareButton({ url, text, className }: ShareButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    setCopied(false);
  }

  async function handleButtonClick() {
    if (menuOpen) {
      closeMenu();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        trackEvent("share", { method: "web_share", content_url: url });
      } catch (err) {
        // ユーザーが共有シートを閉じた場合(AbortError)は何もしない。実際の共有エラー時のみPC用メニューへ
        if (err instanceof Error && err.name === "AbortError") return;
        setMenuOpen(true);
      }
      return;
    }
    setMenuOpen(true);
  }

  function handleTweet() {
    trackEvent("share", { method: "x", content_url: url });
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
    closeMenu();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      trackEvent("share", { method: "copy", content_url: url });
      setCopied(true);
      setTimeout(closeMenu, 1500);
    } catch {
      // クリップボードアクセス不可時は何もしない
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleButtonClick}
        aria-label="共有"
        className={className ?? DEFAULT_BUTTON_CLASS}
      >
        <Share2 size={18} strokeWidth={2} />
      </button>

      {menuOpen && (
        <div
          className="absolute top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-lg"
          style={{ right: 0 }}
        >
          {copied ? (
            <p className="px-3 py-2.5 text-center text-[12px] font-semibold text-gray-600">
              コピーしました
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTweet}
                className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 active:bg-gray-50"
              >
                Xで共有
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="block w-full border-t border-gray-100 px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 active:bg-gray-50"
              >
                URLをコピー
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";

const HIGHLIGHT_KEY = "highlight_report";

/**
 * 報告完了後にマップに戻ったとき、自分のドットをハイライトする hook
 *
 * - 報告完了時: markForHighlight(blockName) を呼ぶ
 * - マップ側: highlightBlock を取得、1秒後に自動クリア
 */
export function useHighlightDot() {
  const [highlightBlock, setHighlightBlock] = useState<string | null>(null);
  const [showHighlight, setShowHighlight] = useState(false);

  // マップ側: ページ表示時にチェック
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIGHLIGHT_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHighlightBlock(saved);
         
        setShowHighlight(true);
        localStorage.removeItem(HIGHLIGHT_KEY);

        // 1秒後にフェードアウト、2秒後に完全消去
        const fadeTimer = setTimeout(() => setShowHighlight(false), 1500);
        const clearTimer = setTimeout(() => setHighlightBlock(null), 2500);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(clearTimer);
        };
      }
    } catch {
      // ignore
    }
  }, []);

  // 報告完了時: ブロック名を保存
  const markForHighlight = useCallback((blockName: string) => {
    try {
      localStorage.setItem(HIGHLIGHT_KEY, blockName);
    } catch {
      // ignore
    }
  }, []);

  return { highlightBlock, showHighlight, markForHighlight };
}

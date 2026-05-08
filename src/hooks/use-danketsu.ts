"use client";

import { useEffect, useState, useCallback } from "react";

const DANKETSU_KEY_PREFIX = "danketsu_";
const GATE_KEY = "gate_unlocked";

/** 端末IDを取得（なければ生成） */
function getDeviceId(): string {
  const key = "device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/** 今日の日付文字列 (YYYY-MM-DD) */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 団結Lv hook
 * - 1端末1日1回の押下制限
 * - Lvは雰囲気表示のみ（実数は出さない）
 */
export function useDanketsu(eventId: string) {
  const [danketsuLv, setDanketsuLv] = useState(0);
  const [pushedToday, setPushedToday] = useState(false);
  const [pushAnimation, setPushAnimation] = useState(false);

  useEffect(() => {
    // Load saved Lv
    try {
      const saved = localStorage.getItem(`${DANKETSU_KEY_PREFIX}lv_${eventId}`);
      if (saved) setDanketsuLv(parseInt(saved) || 0);

      // Check if already pushed today
      const todayPushed = localStorage.getItem(
        `${DANKETSU_KEY_PREFIX}${eventId}_${todayKey()}`
      );
      setPushedToday(todayPushed === "1");
    } catch {
      // ignore
    }
  }, [eventId]);

  const pushDanketsu = useCallback(() => {
    if (pushedToday) return false;

    try {
      const deviceId = getDeviceId();
      // Mark today as pushed
      localStorage.setItem(
        `${DANKETSU_KEY_PREFIX}${eventId}_${todayKey()}`,
        "1"
      );
      // Increment Lv
      const newLv = danketsuLv + 1;
      localStorage.setItem(`${DANKETSU_KEY_PREFIX}lv_${eventId}`, String(newLv));
      setDanketsuLv(newLv);
      setPushedToday(true);
      setPushAnimation(true);
      setTimeout(() => setPushAnimation(false), 600);

      // TODO: Send to Supabase (eventId, deviceId, todayKey)
      console.log("[Danketsu] Push:", { eventId, deviceId, date: todayKey() });

      return true;
    } catch {
      return false;
    }
  }, [eventId, danketsuLv, pushedToday]);

  /** 表示用Lv (1-5) */
  const displayLv = Math.min(5, Math.max(1, Math.ceil(danketsuLv / 3)));

  /** ゲージ文字列 ■■■□□ */
  const gauge = "■".repeat(displayLv) + "□".repeat(5 - displayLv);

  /** 煽り文言 */
  const danketsuMessage = pushedToday
    ? "今日の団結、入れた！"
    : danketsuLv === 0
      ? "まだ誰も入れてないよ"
      : "今日の団結、入れとこ";

  return {
    danketsuLv,
    displayLv,
    gauge,
    pushedToday,
    pushAnimation,
    danketsuMessage,
    pushDanketsu,
  };
}

/**
 * 詳細解放ゲート hook
 * 解放条件: 当選報告 / 当落報告 / 今日の団結 のどれか1つ
 */
export function useGate(eventId: string) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${GATE_KEY}_${eventId}`);
      setUnlocked(saved === "1");
    } catch {
      // ignore
    }
  }, [eventId]);

  const unlock = useCallback(
    (method: "report" | "result" | "danketsu") => {
      try {
        localStorage.setItem(`${GATE_KEY}_${eventId}`, "1");
        setUnlocked(true);
        console.log("[Gate] Unlocked by:", method);
      } catch {
        // ignore
      }
    },
    [eventId]
  );

  return { unlocked, unlock };
}

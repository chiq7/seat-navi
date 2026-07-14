import { supabase } from "@/lib/supabase/client";
import type { AfterReportCard } from "@/lib/artistPageTypes";

export function withSuffix(v: string | null | undefined, suffix: string): string | null {
  if (!v) return null;
  return v.endsWith(suffix) ? v : `${v}${suffix}`;
}

/** 一覧カード表示用の短縮エリアラベル（「スタンド」の文字は出さない） */
export const SEAT_AREA_SHORT_LABELS: Record<string, string> = {
  arena: "アリーナ",
  stand_1f: "1階",
  stand_2f: "2階",
  stand_3f_or_higher: "3階以上",
  other_unknown: "その他",
};

export function seatAreaShortLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return SEAT_AREA_SHORT_LABELS[type] ?? type;
}

/** 座席エリア(短縮)+ブロックを1トークンに連結し、列・番号と半角スペースでつなぐ */
export function blockRowText(report: AfterReportCard): string | null {
  const location = [seatAreaShortLabel(report.seat_area_type), report.seat_block].filter(Boolean).join("");
  const parts = [
    location || null,
    withSuffix(report.seat_row, "列"),
    withSuffix(report.seat_number, "番"),
  ].filter((v): v is string => Boolean(v));
  return parts.length > 0 ? parts.join(" ") : null;
}

export function getReportPhotoUrl(report: AfterReportCard): string | null {
  const path = report.seat_view_photo_paths?.[0];
  if (!path) return null;
  return supabase.storage.from("after-report-photos").getPublicUrl(path).data.publicUrl;
}

/** "1"〜"5" を数値化。"なし"・未入力は評価なし(null)扱い */
export function ratingLevel(raw: string | null | undefined): number | null {
  if (!raw || raw === "なし") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

/** 総合評価バッジ: メインステージとセンステの高い方が5→神席、4→良席。それ以外は非表示 */
export function overallBadgeLabel(report: AfterReportCard): string | null {
  const mainLevel = ratingLevel(report.main_stage);
  const centerLevel = ratingLevel(report.center_stage);
  if (mainLevel === null && centerLevel === null) return null;
  const level = Math.max(mainLevel ?? 0, centerLevel ?? 0);
  if (level === 5) return "神席";
  if (level === 4) return "良席";
  return null;
}

/** センステ/トロッコ/客降りのうち回答済み("なし"以外)のものをバッジ表示 */
export function structureBadgeLabels(report: AfterReportCard): string[] {
  return [
    report.center_stage && report.center_stage !== "なし" ? "センステ" : null,
    report.torokko && report.torokko !== "なし" ? "トロッコ" : null,
    report.kyakukudari && report.kyakukudari !== "なし" ? "客降り" : null,
  ].filter((v): v is string => Boolean(v));
}

/**
 * サンプルデータ — Supabase未接続時のフォールバック
 * 「会場」ではなく「公演」中心
 */
import type { Event, Section, Report } from "./types";

export const SAMPLE_EVENTS: Event[] = [
  { id: "e1", artist_name: "Snow Man", event_name: "Snow Man LIVE TOUR 2026", venue_name: "東京ドーム", event_date: "2026-03-15", genre: "johnnys", atsumari_score: 4.2, hype_count: 1240, created_at: "2026-01-01" },
  { id: "e2", artist_name: "Snow Man", event_name: "Snow Man LIVE TOUR 2026", venue_name: "京セラドーム大阪", event_date: "2026-03-22", genre: "johnnys", atsumari_score: 3.5, hype_count: 890, created_at: "2026-01-01" },
  { id: "e3", artist_name: "SEVENTEEN", event_name: "SEVENTEEN TOUR 'FOLLOW' AGAIN", venue_name: "日産スタジアム", event_date: "2026-04-05", genre: "kpop", atsumari_score: 3.0, hype_count: 2100, created_at: "2026-01-01" },
  { id: "e4", artist_name: "乃木坂46", event_name: "乃木坂46 真夏の全国ツアー2026", venue_name: "さいたまスーパーアリーナ", event_date: "2026-07-20", genre: "female_idol", atsumari_score: 2.8, hype_count: 760, created_at: "2026-01-01" },
  { id: "e5", artist_name: "ENHYPEN", event_name: "ENHYPEN WORLD TOUR 2026", venue_name: "横浜アリーナ", event_date: "2026-05-10", genre: "kpop", atsumari_score: 3.8, hype_count: 1580, created_at: "2026-01-01" },
  { id: "e6", artist_name: "SixTONES", event_name: "SixTONES LIVE 2026 UNLIMITED", venue_name: "東京ドーム", event_date: "2026-04-12", genre: "johnnys", atsumari_score: 4.5, hype_count: 1890, created_at: "2026-01-01" },
  { id: "e7", artist_name: "JO1", event_name: "JO1 ARENA TOUR 2026", venue_name: "マリンメッセ福岡", event_date: "2026-06-01", genre: "male_idol", atsumari_score: 2.2, hype_count: 430, created_at: "2026-01-01" },
  { id: "e8", artist_name: "King & Prince", event_name: "King & Prince Concert 2026", venue_name: "バンテリンドーム ナゴヤ", event_date: "2026-05-25", genre: "johnnys", atsumari_score: 3.2, hype_count: 1050, created_at: "2026-01-01" },
  { id: "e9", artist_name: "日向坂46", event_name: "日向坂46 全国おひさまツアー2026", venue_name: "大阪城ホール", event_date: "2026-08-10", genre: "female_idol", atsumari_score: 1.8, hype_count: 380, created_at: "2026-01-01" },
  { id: "e10", artist_name: "Stray Kids", event_name: "Stray Kids 5TH WORLD TOUR", venue_name: "幕張メッセ", event_date: "2026-06-15", genre: "kpop", atsumari_score: 3.4, hype_count: 1720, created_at: "2026-01-01" },
  { id: "e11", artist_name: "BE:FIRST", event_name: "BE:FIRST ARENA TOUR 2026", venue_name: "日本武道館", event_date: "2026-07-05", genre: "male_idol", atsumari_score: 2.6, hype_count: 620, created_at: "2026-01-01" },
  { id: "e12", artist_name: "LE SSERAFIM", event_name: "LE SSERAFIM JAPAN TOUR", venue_name: "ぴあアリーナMM", event_date: "2026-05-18", genre: "kpop", atsumari_score: 4.0, hype_count: 1340, created_at: "2026-01-01" },
];

export const SAMPLE_SECTIONS: Record<string, Section[]> = {
  "e1": [
    { id: "s-e1-01", event_id: "e1", name: "A1ブロック", description: "アリーナ最前方。ステージに最も近い。", fc_rate: 0.65, general_rate: 0.10, upgrade_rate: 0.15, revival_rate: 0.05, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e1-02", event_id: "e1", name: "A2ブロック", description: "アリーナ前方左寄り。", fc_rate: 0.55, general_rate: 0.20, upgrade_rate: 0.12, revival_rate: 0.08, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e1-03", event_id: "e1", name: "A3ブロック", description: "アリーナ前方右寄り。", fc_rate: 0.50, general_rate: 0.22, upgrade_rate: 0.18, revival_rate: 0.05, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e1-04", event_id: "e1", name: "B1ブロック", description: "アリーナ中央エリア。", fc_rate: 0.40, general_rate: 0.30, upgrade_rate: 0.15, revival_rate: 0.10, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e1-05", event_id: "e1", name: "B2ブロック", description: "アリーナ中央左。", fc_rate: 0.38, general_rate: 0.35, upgrade_rate: 0.12, revival_rate: 0.10, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e1-06", event_id: "e1", name: "B3ブロック", description: "アリーナ中央右。", fc_rate: 0.35, general_rate: 0.32, upgrade_rate: 0.15, revival_rate: 0.10, production_rate: 0.08, created_at: "2026-01-01" },
    { id: "s-e1-07", event_id: "e1", name: "C1ブロック", description: "アリーナ後方エリア。", fc_rate: 0.25, general_rate: 0.40, upgrade_rate: 0.10, revival_rate: 0.15, production_rate: 0.10, created_at: "2026-01-01" },
    { id: "s-e1-08", event_id: "e1", name: "1塁側スタンド", description: "スタンド席1塁側。", fc_rate: 0.20, general_rate: 0.35, upgrade_rate: 0.05, revival_rate: 0.20, production_rate: 0.20, created_at: "2026-01-01" },
    { id: "s-e1-09", event_id: "e1", name: "3塁側スタンド", description: "スタンド席3塁側。", fc_rate: 0.18, general_rate: 0.38, upgrade_rate: 0.04, revival_rate: 0.20, production_rate: 0.20, created_at: "2026-01-01" },
    { id: "s-e1-10", event_id: "e1", name: "バックネット裏", description: "ステージ正面のスタンド。", fc_rate: 0.15, general_rate: 0.40, upgrade_rate: 0.05, revival_rate: 0.20, production_rate: 0.20, created_at: "2026-01-01" },
  ],
  "e6": [
    { id: "s-e6-01", event_id: "e6", name: "A1ブロック", description: "アリーナ最前方。", fc_rate: 0.72, general_rate: 0.08, upgrade_rate: 0.12, revival_rate: 0.04, production_rate: 0.04, created_at: "2026-01-01" },
    { id: "s-e6-02", event_id: "e6", name: "A2ブロック", description: "アリーナ前方。", fc_rate: 0.60, general_rate: 0.15, upgrade_rate: 0.15, revival_rate: 0.05, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e6-03", event_id: "e6", name: "B1ブロック", description: "アリーナ中央。", fc_rate: 0.42, general_rate: 0.28, upgrade_rate: 0.15, revival_rate: 0.10, production_rate: 0.05, created_at: "2026-01-01" },
    { id: "s-e6-04", event_id: "e6", name: "1塁側スタンド", description: "スタンド席1塁側。", fc_rate: 0.22, general_rate: 0.38, upgrade_rate: 0.05, revival_rate: 0.18, production_rate: 0.17, created_at: "2026-01-01" },
    { id: "s-e6-05", event_id: "e6", name: "3塁側スタンド", description: "スタンド席3塁側。", fc_rate: 0.20, general_rate: 0.40, upgrade_rate: 0.05, revival_rate: 0.18, production_rate: 0.17, created_at: "2026-01-01" },
  ],
};

export const SAMPLE_REPORTS: Report[] = [
  { id: "r1", section_id: "s-e1-03", event_id: "e1", lottery_type: "fc_first", payment_method: "credit", applied_count: 2, block_name: "A3", row_number: "5", fc_years: 3, applied_events: 4, is_first_choice: true, has_companion: true, comment: "FC一次クレカ2枚でA3の5列目！前方来れた", has_spoiler: false, created_at: "2026-03-15" },
  { id: "r2", section_id: "s-e1-03", event_id: "e1", lottery_type: "fc_first", payment_method: "convenience", applied_count: 2, block_name: "A3", row_number: "12", fc_years: 1, applied_events: 2, is_first_choice: true, has_companion: true, comment: "コンビニ払いだったけどA3来れた。FC歴浅くても行ける", has_spoiler: false, created_at: "2026-03-15" },
  { id: "r3", section_id: "s-e1-04", event_id: "e1", lottery_type: "general", payment_method: "credit", applied_count: 1, block_name: "B1", row_number: null, fc_years: null, applied_events: 1, is_first_choice: true, has_companion: false, comment: "一般1枚でB1。中央だけど十分近い", has_spoiler: false, created_at: "2026-03-15" },
  { id: "r4", section_id: "s-e1-07", event_id: "e1", lottery_type: "upgrade", payment_method: "credit", applied_count: 2, block_name: "C1", row_number: "3", fc_years: null, applied_events: 1, is_first_choice: null, has_companion: true, comment: "アプグレでC1の3列目。アプグレにしては前方だと思う", has_spoiler: false, created_at: "2026-03-15" },
  { id: "r5", section_id: "s-e1-08", event_id: "e1", lottery_type: "revival", payment_method: "convenience", applied_count: 1, block_name: "1塁側スタンド", row_number: "22", fc_years: null, applied_events: 1, is_first_choice: null, has_companion: false, comment: "復活当選でスタンド。まあ入れただけ感謝", has_spoiler: false, created_at: "2026-03-15" },
];

/** Get sections for an event (fallback) */
export function getSampleSections(eventId: string): Section[] {
  return SAMPLE_SECTIONS[eventId] ?? [];
}

/** Get reports for a section (fallback) */
export function getSampleReports(sectionId: string): Report[] {
  return SAMPLE_REPORTS.filter((r) => r.section_id === sectionId);
}

/** Get all reports for an event (fallback) */
export function getSampleReportsByEvent(eventId: string): Report[] {
  return SAMPLE_REPORTS.filter((r) => r.event_id === eventId);
}

// ========== Database Types ==========

/** 公演（トップの単位 = 会場ではなく公演） */
export type Event = {
  id: string;
  artist_name: string;
  event_name: string;       // 例: "Snow Man LIVE TOUR 2026"
  venue_name: string;       // 例: "東京ドーム"
  event_date: string;       // 例: "2026-03-15"
  genre: "kpop" | "johnnys" | "female_idol" | "male_idol" | "other";
  /** 集まり度: 1-5 (報告数ベースだがユーザーには星のみ表示) */
  atsumari_score: number;
  /** 期待度 (❤️連打の合計) */
  hype_count: number;
  created_at: string;
};

/** セクション / ブロック (各公演の配席エリア) */
export type Section = {
  id: string;
  event_id: string;
  name: string;             // 例: "A3ブロック"
  description: string | null;
  /** 抽選種別ごとの報告比率 */
  fc_rate: number;          // FC一次の割合
  general_rate: number;     // 一般の割合
  upgrade_rate: number;     // アップグレードの割合
  revival_rate: number;     // 復活当選の割合
  production_rate: number;  // 制作開放の割合
  created_at: string;
};

/** 当選報告 (投稿) */
export type Report = {
  id: string;
  section_id: string;
  event_id: string;
  /** 抽選種別 */
  lottery_type: "fc_first" | "fc_second" | "general" | "upgrade" | "revival" | "production";
  /** 支払い方法 */
  payment_method: "credit" | "convenience" | "other";
  /** 申込枚数 */
  applied_count: number;    // 1, 2, 3+
  /** ブロック名 (自由入力 or 候補) */
  block_name: string;
  /** 列 (任意) */
  row_number: string | null;
  /** 任意フィールド */
  fc_years: number | null;         // FC歴
  applied_events: number | null;   // 何公演申し込んだか
  is_first_choice: boolean | null; // 第一希望か
  has_companion: boolean | null;   // 同行あり/なし
  comment: string | null;
  has_spoiler: boolean;
  created_at: string;
};

export type AiConversation = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  related_section_id: string | null;
  created_at: string;
};

// ========== UI Types ==========

export type GenreLabel = {
  key: Event["genre"];
  label: string;
  color: string;
};

export const GENRES: GenreLabel[] = [
  { key: "kpop", label: "K-POP", color: "#A855F7" },
  { key: "johnnys", label: "ジャニーズ", color: "#3B82F6" },
  { key: "female_idol", label: "女性アイドル", color: "#EC4899" },
  { key: "male_idol", label: "男性アイドル", color: "#06B6D4" },
  { key: "other", label: "その他", color: "#6B7280" },
];

/** 抽選種別ラベル */
export const LOTTERY_TYPES = [
  { key: "fc_first", label: "FC一次" },
  { key: "fc_second", label: "FC二次" },
  { key: "general", label: "一般" },
  { key: "upgrade", label: "アップグレード" },
  { key: "revival", label: "復活当選" },
  { key: "production", label: "制作開放" },
] as const;

/** 支払い方法ラベル */
export const PAYMENT_METHODS = [
  { key: "credit", label: "クレジットカード" },
  { key: "convenience", label: "コンビニ払い" },
  { key: "other", label: "その他" },
] as const;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/** 会場クロールで収集したイベント (eventsテーブル) */
export type CrawledEvent = {
  id: string;
  title: string;
  venue: string;
  venue_id: string;
  date: string | null;
  genre: Event["genre"];
};

/** 同会場の過去公演座席実績 (historical_patternsテーブル) */
export type HistoricalPattern = {
  block:    string;
  max_row:  number | null;
  max_seat: number | null;
  event_name: string;
};

/** 座席報告 (seat_reportsテーブル) */
export type SeatReport = {
  id: string;
  event_id: string;
  block: string;
  row_num: number;
  seat_num: number;
  lottery_type: "fc1" | "fc2" | "general" | "upgrade" | "revival" | "production";
  comment: string | null;
  created_at: string;
};

/** 会場予想レイアウト画像 (event_layoutsテーブル) */
export type EventLayout = {
  id: string;
  event_id: string;
  image_url: string;
  created_at: string;
};

export const SEAT_LOTTERY_OPTIONS = [
  { value: "fc1",        label: "FC1次" },
  { value: "fc2",        label: "FC2次" },
  { value: "general",    label: "一般" },
  { value: "upgrade",    label: "アプグレ" },
  { value: "revival",    label: "復活当選" },
  { value: "production", label: "制作開放" },
] as const;

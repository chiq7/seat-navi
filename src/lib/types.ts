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
  lottery_types?: string[];
  artist_slug?: string | null;
};

/** 答え合わせ報告 (after_reportsテーブル) */
export type AfterReport = {
  id: string;
  event_id: string;
  photo_paths: string[];
  hanamichi: "yes" | "no" | "unknown" | null;
  hanamichi_blocks: string[];
  torokko: "yes" | "no" | "unknown" | null;
  torokko_route: string | null;
  center_stage: "yes" | "no" | "unknown" | null;
  center_stage_pos: string | null;
  kyakukudari: "yes" | "no" | "unknown" | null;
  kyakukudari_blocks: string[];
  silver_tape_rows: number | null;
  visibility: number | null;
  fansa: boolean | null;
  satisfaction: number | null;
  memo: string | null;
  created_at: string;
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
  lottery_round: string | null;
  lottery_name: string | null;
  payment_method?: string | null;
  fc_history?: string | null;
  comment: string | null;
  created_at: string;
};

/** event_id 単位の当落結果 (event_ticket_resultsテーブル) */
export type EventTicketResult = {
  id: string;
  event_id: string;
  result: "won" | "lost";
  lost_application_count: number;
  ticket_count: number | null;
  lottery_type: "1次抽選" | "2次抽選" | "その他" | null;
  fc_history: "1年未満" | "1〜3年" | "3年以上" | null;
  payment_method: "クレカ" | "その他" | null;
  seat_type?: "arena" | "stand" | "seated" | "restricted" | "obstructed" | "unknown" | null;
  upgrade_result?: "not_applied" | "applied_lost" | "applied_won" | null;
  comment?: string | null;
  seat_block?: string | null;
  seat_row?: string | null;
  seat_number?: string | null;
  stand_direction?: string | null;
  stand_floor?: string | null;
  other_seat_info?: string | null;
  created_at: string;
};

/** 会場予想レイアウト画像 (event_layoutsテーブル) */
export type EventLayout = {
  id: string;
  event_id: string;
  image_url: string;
  created_at: string;
};

/** ファン投稿の座席予想 (fan_seat_predictionsテーブル) */
export type FanSeatPrediction = {
  id: string;
  event_id: string;
  image_path: string;
  comment: string | null;
  prediction_tags: string[];
  display_name: string | null;
  approved: boolean;
  created_at: string;
};

/** X（Twitter）由来の座席予想図・結果図・答え合わせ投稿 (x_seat_postsテーブル) */
export type XSeatPost = {
  id: string;

  // 公演情報
  artist_name: string;
  tour_name: string | null;
  venue_name: string;
  performance_date: string | null;   // "YYYY-MM-DD"

  // X投稿ソース
  post_type: "prediction" | "result" | "after_report" | "unknown";
  source_account: string | null;
  source_post_url: string | null;
  posted_at: string | null;          // ISO 8601

  // 画像
  image_url: string | null;
  image_summary: string | null;

  // 会場構造
  stage_position: string | null;
  hanamichi_position: string | null;
  center_stage_position: string | null;
  trolley_route: string | null;
  audience_walkway: string | null;
  silver_tape_area: string | null;

  // ブロック配列
  blocks_detected: string[];
  stage_near_blocks: string[];
  hanamichi_candidate_blocks: string[];
  center_stage_candidate_blocks: string[];
  actual_hanamichi_blocks: string[];
  actual_center_stage_blocks: string[];
  upgrade_blocks: string[];
  fc1_blocks: string[];
  fc2_blocks: string[];
  general_blocks: string[];

  // 予想 vs 結果の紐づけ・精度評価
  prediction_post_url: string | null;
  result_post_url: string | null;
  matched_points: string | null;
  missed_points: string | null;
  prediction_vs_result_summary: string | null;
  source_reasoning_summary: string | null;

  notes: string | null;
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

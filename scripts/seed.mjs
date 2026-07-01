import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EVENT_ID = "svtn-tokyo-dome-20260405";

// ① イベント
const { error: evErr } = await supabase.from("events").upsert({
  id:       EVENT_ID,
  title:    "SEVENTEEN FOLLOW AGAIN TOUR 東京ドーム",
  venue:    "東京ドーム",
  venue_id: "tokyo-dome",
  date:     "2026-04-05",
  genre:    "kpop",
});
if (evErr) { console.error("events:", evErr.message); process.exit(1); }
console.log("✓ event inserted");

// ② seat_reports
const reports = [
  // A1
  { id:"r-a1-01", block:"A1", row_num:1,  seat_num:3,  lottery_type:"fc1" },
  { id:"r-a1-02", block:"A1", row_num:1,  seat_num:4,  lottery_type:"fc1" },
  { id:"r-a1-03", block:"A1", row_num:2,  seat_num:2,  lottery_type:"fc1" },
  { id:"r-a1-04", block:"A1", row_num:2,  seat_num:5,  lottery_type:"fc2" },
  { id:"r-a1-05", block:"A1", row_num:3,  seat_num:1,  lottery_type:"fc1" },
  { id:"r-a1-06", block:"A1", row_num:3,  seat_num:6,  lottery_type:"fc2" },
  { id:"r-a1-07", block:"A1", row_num:4,  seat_num:3,  lottery_type:"fc1" },
  { id:"r-a1-08", block:"A1", row_num:5,  seat_num:4,  lottery_type:"fc1" },
  { id:"r-a1-09", block:"A1", row_num:6,  seat_num:2,  lottery_type:"general" },
  { id:"r-a1-10", block:"A1", row_num:7,  seat_num:5,  lottery_type:"fc1" },
  // A2
  { id:"r-a2-01", block:"A2", row_num:1,  seat_num:2,  lottery_type:"fc1" },
  { id:"r-a2-02", block:"A2", row_num:1,  seat_num:7,  lottery_type:"fc2" },
  { id:"r-a2-03", block:"A2", row_num:2,  seat_num:4,  lottery_type:"fc1" },
  { id:"r-a2-04", block:"A2", row_num:3,  seat_num:1,  lottery_type:"fc2" },
  { id:"r-a2-05", block:"A2", row_num:3,  seat_num:8,  lottery_type:"fc1" },
  { id:"r-a2-06", block:"A2", row_num:4,  seat_num:5,  lottery_type:"fc2" },
  { id:"r-a2-07", block:"A2", row_num:5,  seat_num:3,  lottery_type:"fc1" },
  { id:"r-a2-08", block:"A2", row_num:6,  seat_num:6,  lottery_type:"general" },
  { id:"r-a2-09", block:"A2", row_num:7,  seat_num:4,  lottery_type:"fc1" },
  { id:"r-a2-10", block:"A2", row_num:8,  seat_num:2,  lottery_type:"upgrade" },
  // A3 — 同一行で席番号に大きな隙間 → 花道検出
  { id:"r-a3-01", block:"A3", row_num:1,  seat_num:1,  lottery_type:"fc1" },
  { id:"r-a3-02", block:"A3", row_num:1,  seat_num:2,  lottery_type:"fc1" },
  { id:"r-a3-03", block:"A3", row_num:1,  seat_num:9,  lottery_type:"fc2" },
  { id:"r-a3-04", block:"A3", row_num:2,  seat_num:1,  lottery_type:"fc1" },
  { id:"r-a3-05", block:"A3", row_num:2,  seat_num:10, lottery_type:"fc2" },
  { id:"r-a3-06", block:"A3", row_num:3,  seat_num:2,  lottery_type:"general" },
  { id:"r-a3-07", block:"A3", row_num:3,  seat_num:8,  lottery_type:"general" },
  { id:"r-a3-08", block:"A3", row_num:4,  seat_num:1,  lottery_type:"fc1" },
  { id:"r-a3-09", block:"A3", row_num:5,  seat_num:3,  lottery_type:"fc2" },
  { id:"r-a3-10", block:"A3", row_num:6,  seat_num:9,  lottery_type:"fc1" },
  // A4
  { id:"r-a4-01", block:"A4", row_num:1,  seat_num:4,  lottery_type:"general" },
  { id:"r-a4-02", block:"A4", row_num:2,  seat_num:3,  lottery_type:"general" },
  { id:"r-a4-03", block:"A4", row_num:2,  seat_num:7,  lottery_type:"fc2" },
  { id:"r-a4-04", block:"A4", row_num:3,  seat_num:5,  lottery_type:"general" },
  { id:"r-a4-05", block:"A4", row_num:4,  seat_num:2,  lottery_type:"fc1" },
  { id:"r-a4-06", block:"A4", row_num:4,  seat_num:8,  lottery_type:"general" },
  { id:"r-a4-07", block:"A4", row_num:5,  seat_num:4,  lottery_type:"general" },
  { id:"r-a4-08", block:"A4", row_num:6,  seat_num:6,  lottery_type:"fc2" },
  { id:"r-a4-09", block:"A4", row_num:7,  seat_num:3,  lottery_type:"general" },
  { id:"r-a4-10", block:"A4", row_num:8,  seat_num:5,  lottery_type:"upgrade" },
  // A5
  { id:"r-a5-01", block:"A5", row_num:1,  seat_num:2,  lottery_type:"fc1" },
  { id:"r-a5-02", block:"A5", row_num:2,  seat_num:5,  lottery_type:"fc1" },
  { id:"r-a5-03", block:"A5", row_num:3,  seat_num:1,  lottery_type:"upgrade" },
  { id:"r-a5-04", block:"A5", row_num:3,  seat_num:7,  lottery_type:"fc1" },
  { id:"r-a5-05", block:"A5", row_num:4,  seat_num:3,  lottery_type:"fc2" },
  { id:"r-a5-06", block:"A5", row_num:5,  seat_num:6,  lottery_type:"fc1" },
  { id:"r-a5-07", block:"A5", row_num:6,  seat_num:4,  lottery_type:"upgrade" },
  { id:"r-a5-08", block:"A5", row_num:7,  seat_num:2,  lottery_type:"fc1" },
  { id:"r-a5-09", block:"A5", row_num:8,  seat_num:5,  lottery_type:"fc2" },
  { id:"r-a5-10", block:"A5", row_num:9,  seat_num:3,  lottery_type:"fc1" },
  // B2
  { id:"r-b2-01", block:"B2", row_num:3,  seat_num:5,  lottery_type:"general" },
  { id:"r-b2-02", block:"B2", row_num:4,  seat_num:8,  lottery_type:"fc2" },
  { id:"r-b2-03", block:"B2", row_num:5,  seat_num:3,  lottery_type:"general" },
  { id:"r-b2-04", block:"B2", row_num:6,  seat_num:10, lottery_type:"general" },
  { id:"r-b2-05", block:"B2", row_num:7,  seat_num:6,  lottery_type:"fc1" },
  { id:"r-b2-06", block:"B2", row_num:8,  seat_num:4,  lottery_type:"general" },
  { id:"r-b2-07", block:"B2", row_num:9,  seat_num:9,  lottery_type:"fc2" },
  { id:"r-b2-08", block:"B2", row_num:10, seat_num:7,  lottery_type:"general" },
  // B4
  { id:"r-b4-01", block:"B4", row_num:4,  seat_num:6,  lottery_type:"general" },
  { id:"r-b4-02", block:"B4", row_num:5,  seat_num:4,  lottery_type:"general" },
  { id:"r-b4-03", block:"B4", row_num:6,  seat_num:9,  lottery_type:"fc2" },
  { id:"r-b4-04", block:"B4", row_num:7,  seat_num:2,  lottery_type:"general" },
  { id:"r-b4-05", block:"B4", row_num:8,  seat_num:7,  lottery_type:"general" },
  { id:"r-b4-06", block:"B4", row_num:9,  seat_num:5,  lottery_type:"fc1" },
  { id:"r-b4-07", block:"B4", row_num:10, seat_num:3,  lottery_type:"general" },
  { id:"r-b4-08", block:"B4", row_num:11, seat_num:8,  lottery_type:"general" },
  // B5
  { id:"r-b5-01", block:"B5", row_num:3,  seat_num:4,  lottery_type:"fc1" },
  { id:"r-b5-02", block:"B5", row_num:4,  seat_num:7,  lottery_type:"general" },
  { id:"r-b5-03", block:"B5", row_num:5,  seat_num:2,  lottery_type:"general" },
  { id:"r-b5-04", block:"B5", row_num:6,  seat_num:9,  lottery_type:"fc2" },
  { id:"r-b5-05", block:"B5", row_num:7,  seat_num:5,  lottery_type:"general" },
  { id:"r-b5-06", block:"B5", row_num:8,  seat_num:3,  lottery_type:"general" },
  { id:"r-b5-07", block:"B5", row_num:9,  seat_num:8,  lottery_type:"fc1" },
  { id:"r-b5-08", block:"B5", row_num:10, seat_num:6,  lottery_type:"general" },
  // C1
  { id:"r-c1-01", block:"C1", row_num:5,  seat_num:6,  lottery_type:"general" },
  { id:"r-c1-02", block:"C1", row_num:7,  seat_num:4,  lottery_type:"general" },
  { id:"r-c1-03", block:"C1", row_num:8,  seat_num:9,  lottery_type:"general" },
  { id:"r-c1-04", block:"C1", row_num:10, seat_num:2,  lottery_type:"general" },
  { id:"r-c1-05", block:"C1", row_num:11, seat_num:11, lottery_type:"general" },
  { id:"r-c1-06", block:"C1", row_num:13, seat_num:5,  lottery_type:"fc2" },
  { id:"r-c1-07", block:"C1", row_num:15, seat_num:8,  lottery_type:"general" },
  { id:"r-c1-08", block:"C1", row_num:17, seat_num:3,  lottery_type:"general" },
  // C2
  { id:"r-c2-01", block:"C2", row_num:6,  seat_num:5,  lottery_type:"general" },
  { id:"r-c2-02", block:"C2", row_num:8,  seat_num:8,  lottery_type:"fc2" },
  { id:"r-c2-03", block:"C2", row_num:10, seat_num:3,  lottery_type:"general" },
  { id:"r-c2-04", block:"C2", row_num:12, seat_num:10, lottery_type:"general" },
  { id:"r-c2-05", block:"C2", row_num:14, seat_num:6,  lottery_type:"general" },
  { id:"r-c2-06", block:"C2", row_num:16, seat_num:4,  lottery_type:"general" },
  { id:"r-c2-07", block:"C2", row_num:18, seat_num:7,  lottery_type:"fc2" },
  { id:"r-c2-08", block:"C2", row_num:20, seat_num:2,  lottery_type:"general" },
  // C4
  { id:"r-c4-01", block:"C4", row_num:5,  seat_num:7,  lottery_type:"general" },
  { id:"r-c4-02", block:"C4", row_num:7,  seat_num:5,  lottery_type:"general" },
  { id:"r-c4-03", block:"C4", row_num:9,  seat_num:9,  lottery_type:"general" },
  { id:"r-c4-04", block:"C4", row_num:11, seat_num:3,  lottery_type:"general" },
  { id:"r-c4-05", block:"C4", row_num:13, seat_num:8,  lottery_type:"fc2" },
  { id:"r-c4-06", block:"C4", row_num:15, seat_num:4,  lottery_type:"general" },
  { id:"r-c4-07", block:"C4", row_num:17, seat_num:6,  lottery_type:"general" },
  { id:"r-c4-08", block:"C4", row_num:19, seat_num:10, lottery_type:"general" },
  // C5
  { id:"r-c5-01", block:"C5", row_num:6,  seat_num:4,  lottery_type:"general" },
  { id:"r-c5-02", block:"C5", row_num:8,  seat_num:7,  lottery_type:"upgrade" },
  { id:"r-c5-03", block:"C5", row_num:10, seat_num:2,  lottery_type:"general" },
  { id:"r-c5-04", block:"C5", row_num:12, seat_num:9,  lottery_type:"general" },
  { id:"r-c5-05", block:"C5", row_num:14, seat_num:5,  lottery_type:"fc2" },
  { id:"r-c5-06", block:"C5", row_num:16, seat_num:3,  lottery_type:"general" },
  { id:"r-c5-07", block:"C5", row_num:18, seat_num:8,  lottery_type:"general" },
  { id:"r-c5-08", block:"C5", row_num:20, seat_num:6,  lottery_type:"upgrade" },
  // SS1〜SS4 (疎ブロック: 花道/候補 表示テスト)
  { id:"r-ss1-01", block:"SS1", row_num:1, seat_num:8,  lottery_type:"fc1" },
  { id:"r-ss1-02", block:"SS1", row_num:2, seat_num:12, lottery_type:"fc2" },
  { id:"r-ss2-01", block:"SS2", row_num:1, seat_num:5,  lottery_type:"general" },
  { id:"r-ss3-01", block:"SS3", row_num:1, seat_num:10, lottery_type:"fc1" },
  { id:"r-ss3-02", block:"SS3", row_num:1, seat_num:15, lottery_type:"fc2" },
  { id:"r-ss4-01", block:"SS4", row_num:2, seat_num:7,  lottery_type:"general" },
];

const withEventId = reports.map(r => ({ ...r, event_id: EVENT_ID }));

const { error: repErr } = await supabase
  .from("seat_reports")
  .upsert(withEventId, { onConflict: "id" });

if (repErr) { console.error("seat_reports:", repErr.message); process.exit(1); }
console.log(`✓ ${withEventId.length} seat_reports inserted`);

// ③ historical_patterns（東京ドームのブロックサイズ）
// B1, B3, C3 は報告ゼロ想定 → 花道/候補として表示される
const histPatterns = [
  // A列 (前方アリーナ)
  {id:"00000000-0000-0000-0000-000000000a01", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"A1", max_row:12, max_seat:18},
  {id:"00000000-0000-0000-0000-000000000a02", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"A2", max_row:12, max_seat:18},
  {id:"00000000-0000-0000-0000-000000000a03", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"A3", max_row:12, max_seat:18},
  {id:"00000000-0000-0000-0000-000000000a04", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"A4", max_row:12, max_seat:18},
  {id:"00000000-0000-0000-0000-000000000a05", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"A5", max_row:12, max_seat:18},
  // B列 (中アリーナ) ← B1, B3 は花道候補
  {id:"00000000-0000-0000-0000-000000000b01", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"B1", max_row:16, max_seat:22},
  {id:"00000000-0000-0000-0000-000000000b02", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"B2", max_row:16, max_seat:22},
  {id:"00000000-0000-0000-0000-000000000b03", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"B3", max_row:16, max_seat:22},
  {id:"00000000-0000-0000-0000-000000000b04", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"B4", max_row:16, max_seat:22},
  {id:"00000000-0000-0000-0000-000000000b05", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"B5", max_row:16, max_seat:22},
  // C列 (後方アリーナ) ← C3 は花道候補
  {id:"00000000-0000-0000-0000-000000000c01", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"C1", max_row:22, max_seat:28},
  {id:"00000000-0000-0000-0000-000000000c02", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"C2", max_row:22, max_seat:28},
  {id:"00000000-0000-0000-0000-000000000c03", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"C3", max_row:22, max_seat:28},
  {id:"00000000-0000-0000-0000-000000000c04", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"C4", max_row:22, max_seat:28},
  {id:"00000000-0000-0000-0000-000000000c05", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"C5", max_row:22, max_seat:28},
  // SS列 (センステ周辺)
  {id:"00000000-0000-0000-0000-000000005501", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"SS1", max_row:10, max_seat:14},
  {id:"00000000-0000-0000-0000-000000005502", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"SS2", max_row:10, max_seat:14},
  {id:"00000000-0000-0000-0000-000000005503", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"SS3", max_row:10, max_seat:14},
  {id:"00000000-0000-0000-0000-000000005504", venue:"東京ドーム", event_name:"参照公演", artist:"参照", block:"SS4", max_row:10, max_seat:14},
];

const { error: hpErr } = await supabase
  .from("historical_patterns")
  .upsert(histPatterns, { onConflict: "id" });
if (hpErr) { console.error("historical_patterns:", hpErr.message); process.exit(1); }
console.log(`✓ ${histPatterns.length} historical_patterns inserted`);

console.log(`\n確認URL: http://localhost:3000/events/${EVENT_ID}`);

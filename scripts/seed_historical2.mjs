import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// テキスト値をintに変換 (数値以外はnull)
function toInt(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

// ソース: Downloads/insert_historical_patterns.sql の全50行
const rows = [
  { id:"c7b46f5d-96c3-4bf0-986a-ac62bffe7677", artist:"aespa", venue:"大阪城ホール", event_name:"aespa SYNK aeXIS LINE in JAPAN", block:"アリーナ29列", max_row:29, max_seat:null, upgrade_blocks:"A~E（アプグレA~C）", image_url:"https://pbs.twimg.com/media/G6cEH3ba8AA_fdO.jpg", image_description:"アリーナ座席図。ブロックA〜Eの配置、アップグレード範囲A〜Cを色分けで表示。列数29列まで確認可能。" },
  { id:"120c2114-753c-4955-8df5-b72a17c4772d", artist:"aespa", venue:"大阪城ホール", event_name:"aespa SYNK aeXIS LINE in JAPAN", block:"アリーナ49列", max_row:49, max_seat:null, upgrade_blocks:"A~E（アプグレA~C）", image_url:"https://pbs.twimg.com/media/G6cEH3YboAEm5A2.jpg", image_description:"アリーナ座席図。49列目・40番代の位置を示す。" },
  { id:"dfeca4c2-c962-404b-9599-6e71a223ac98", artist:"aespa", venue:"大阪城ホール", event_name:"aespa SYNK aeXIS LINE in JAPAN", block:"アリーナ26列", max_row:26, max_seat:null, upgrade_blocks:"A~E（アプグレA~C）", image_url:"https://pbs.twimg.com/media/G6cEH3cacAAXivE.jpg", image_description:"26列50番代の座席位置。" },
  { id:"085db118-650e-4c26-8a3d-debb150c3c07", artist:"aespa", venue:"代々木体育館", event_name:"aespa SYNK aeXIS LINE in JAPAN", block:"ブロックA~E", max_row:20, max_seat:175, upgrade_blocks:"A~C", image_url:"https://pbs.twimg.com/media/G5HpXqGaoAACcbK.jpg", image_description:"ブロックA〜Eの全体構成図。アプグレA〜C、列数20列・席175番まで。" },
  { id:"9cbc5afd-c6e3-4aae-b4d0-e2bcf2a86317", artist:"LE SSERAFIM", venue:"埼玉スーパーアリーナ", event_name:"LE SSERAFIM EASY CRAZY HOT", block:"A2・A6", max_row:2, max_seat:null, upgrade_blocks:"B3〜B5", image_url:"https://pbs.twimg.com/media/GscWW85awAA_UWW.jpg", image_description:"埼玉アリーナ座席予想図。A2・A6は2列目始まり、B3〜B5がセンステ最前。" },
  { id:"fdb0902f-a46a-4857-a1a1-f02251673304", artist:"LE SSERAFIM", venue:"埼玉スーパーアリーナ", event_name:"LE SSERAFIM EASY CRAZY HOT", block:"A・B", max_row:20, max_seat:null, upgrade_blocks:"B3〜B5", image_url:"https://pbs.twimg.com/media/GscWW85awAA_UWW.jpg", image_description:"A・Bブロック20列、横10番まで。" },
  { id:"25bbbdf6-ea32-4408-845c-3a8aa3a0c664", artist:"LE SSERAFIM", venue:"埼玉スーパーアリーナ", event_name:"LE SSERAFIM EASY CRAZY HOT", block:"C・D", max_row:null, max_seat:null, upgrade_blocks:"B3〜B5", image_url:"https://pbs.twimg.com/media/GscWW85awAA_UWW.jpg", image_description:"C・Dブロック14-15列。" },
  { id:"d9b33ef2-5d51-4b0a-8f90-44d05fad45d4", artist:"Snow Man", venue:"東京ドーム", event_name:"Snow Man スノ ON", block:"アリーナ全体", max_row:null, max_seat:null, upgrade_blocks:"ゲート別アリーナ構成", image_url:"https://pbs.twimg.com/media/G9ERgFAb0AAzAeH.jpg", image_description:"東京ドームアリーナ構成図。ゲート別アリーナ率・座席配置。" },
  { id:"dcc2900a-01cd-4709-a6b8-e82f80c81539", artist:"Snow Man", venue:"東京ドーム", event_name:"Snow Man スノ ON", block:"アリーナ全体", max_row:null, max_seat:null, upgrade_blocks:"ゲート別アリーナ構成", image_url:"https://pbs.twimg.com/media/G9ERgE0boAAxGf8.jpg", image_description:"東京ドームアリーナ構成図（2枚目）。" },
  { id:"e76bcdad-f863-4bcf-9c85-a399d18b9a7d", artist:"Snow Man", venue:"みずほPayPayドーム福岡", event_name:"Snow Man スノ ON", block:"アリーナ全体", max_row:null, max_seat:null, upgrade_blocks:"ゲート別アリーナ構成", image_url:"https://pbs.twimg.com/media/G7fimv9aQAAqs4n.jpg", image_description:"福岡ドームアリーナ構成図。" },
  { id:"3f952131-5edd-4d89-be5b-0a704c125bb0", artist:"King & Prince", venue:"京セラドーム大阪", event_name:"King & Prince Re:ERA", block:"ゲート1.3.4.6.10.11アリーナ", max_row:null, max_seat:null, upgrade_blocks:"ゲート別アリーナ率", image_url:"https://pbs.twimg.com/media/GwYszr7aEAAMw9N.jpg", image_description:"京セラドームゲート別アリーナ図面。" },
  { id:"9cce7650-ed7c-4c8a-ac5f-65602e443a73", artist:"King & Prince", venue:"東京ドーム", event_name:"King & Prince Re:ERA", block:"ゲート別アリーナ", max_row:null, max_seat:null, upgrade_blocks:"ゲート別アリーナ率", image_url:"https://pbs.twimg.com/media/GvtsY0qbsAQCGu1.jpg", image_description:"東京ドームゲート別アリーナ図面。" },
  { id:"945aa082-1526-4da4-8cfe-2c64e656eed2", artist:"SixTONES", venue:"真駒内セキスイハイムアイスアリーナ", event_name:"SixTONES MILESixTONES", block:"Bゲートアリーナ", max_row:null, max_seat:null, upgrade_blocks:"アリーナ率集計", image_url:"https://pbs.twimg.com/media/HH9EjbNaIAATehA.jpg", image_description:"北海道アリーナBゲート予想図。" },
  { id:"eddc64d7-1b2c-4654-816a-e7f6ea7a65a7", artist:"JO1", venue:"東京ドーム", event_name:"JO1DER SHOW2026 EIEN", block:"アリーナ〜2階10列", max_row:null, max_seat:null, upgrade_blocks:"最速FC優先", image_url:"https://pbs.twimg.com/media/HGecUDcbIAAm2Qm.jpg", image_description:"東京ドームアリーナブロック配置予想図。" },
  { id:"58246dec-2ef0-4adb-956e-17eea17064f8", artist:"SEVENTEEN", venue:"東京ドーム", event_name:"SEVENTEEN YAKUSOKU", block:"アリーナC6", max_row:null, max_seat:null, upgrade_blocks:"FC1次/2次色分け", image_url:"https://pbs.twimg.com/media/HHZ9HPYakAA9QS3.jpg", image_description:"東京ドームアリーナC6ブロック予想。" },
  { id:"5377d832-566e-4570-b24c-5ff47c0ce70c", artist:"SEVENTEEN", venue:"東京ドーム", event_name:"SEVENTEEN YAKUSOKU", block:"アリーナE3-4", max_row:1, max_seat:null, upgrade_blocks:"FC1次/2次色分け", image_url:"https://pbs.twimg.com/media/HHY36wra8AAEgsN.jpg", image_description:"アリーナE3-4ブロック予想。" },
  { id:"ed3e48b0-6aa4-444a-80ea-070c14fb9773", artist:"BTS", venue:"東京ドーム", event_name:"BTS PERMISSION TO DANCE", block:"アリーナA1-A8", max_row:18, max_seat:20, upgrade_blocks:"最速FC優先", image_url:null, image_description:"2023年BTS東京ドームアリーナA1-A8ブロック。最大18列・20番まで。最速FC優先。" },
  { id:"c2a8164a-edc6-494a-b6d0-6293d5e9f754", artist:"BTS", venue:"東京ドーム", event_name:"BTS PERMISSION TO DANCE", block:"アリーナB1-B8", max_row:16, max_seat:18, upgrade_blocks:"最速FC優先", image_url:null, image_description:"B1-B8ブロック。" },
  { id:"f14150a2-0519-4641-bac2-5db79655f3d0", artist:"BTS", venue:"京セラドーム大阪", event_name:"BTS PERMISSION TO DANCE", block:"アリーナ全体", max_row:17, max_seat:22, upgrade_blocks:"最速FC", image_url:null, image_description:"京セラドーム全体アリーナ。" },
  { id:"4b3f09ca-a6f5-4744-a8f6-d57d11b5116f", artist:"NewJeans", venue:"東京ドーム", event_name:"NewJeans Bunnies Camp", block:"アリーナA-B", max_row:15, max_seat:15, upgrade_blocks:"FC1次優先", image_url:null, image_description:"2024年NewJeans東京ドームA-Bブロック。" },
  { id:"19908976-c509-4599-be6a-0d78ea7b2f4b", artist:"NewJeans", venue:"さいたまスーパーアリーナ", event_name:"NewJeans Bunnies Camp", block:"アリーナC-D", max_row:14, max_seat:14, upgrade_blocks:"FC1次優先", image_url:null, image_description:"C-Dブロック。" },
  { id:"7252f78b-8897-44a7-9445-bf3ad2ae9884", artist:"INI", venue:"東京ドーム", event_name:"INI LAPOSTA 2024", block:"アリーナA1-A6", max_row:12, max_seat:12, upgrade_blocks:"最速FC", image_url:null, image_description:"INI東京ドームA1-A6。" },
  { id:"6b9ae2dc-5e8f-4810-86fd-8fb68de6be09", artist:"INI", venue:"京セラドーム", event_name:"INI LAPOSTA 2024", block:"アリーナB1-B6", max_row:11, max_seat:11, upgrade_blocks:"最速FC", image_url:null, image_description:"B1-B6ブロック。" },
  { id:"e87fcd41-d1dc-42c5-98e0-32bb8f5d7255", artist:"乃木坂46", venue:"東京ドーム", event_name:"乃木坂46 真夏の全国ツアー", block:"アリーナA1-A10", max_row:20, max_seat:25, upgrade_blocks:"FC1次", image_url:null, image_description:"乃木坂46 2023東京ドームA1-A10。" },
  { id:"33055b42-900c-4851-a48d-fd3827c42bf5", artist:"乃木坂46", venue:"さいたまスーパーアリーナ", event_name:"乃木坂46 真夏の全国ツアー", block:"アリーナB1-B10", max_row:19, max_seat:24, upgrade_blocks:"FC1次", image_url:null, image_description:"B1-B10ブロック。" },
  { id:"63809317-ef98-4f41-9e89-5f31265f2e6c", artist:"乃木坂46", venue:"横浜アリーナ", event_name:"乃木坂46 真夏の全国ツアー", block:"アリーナ全体", max_row:18, max_seat:22, upgrade_blocks:"FC1次", image_url:null, image_description:"横浜アリーナ全体。" },
  { id:"7f306065-c60f-4b5b-ba8f-1b77065e17d0", artist:"なにわ男子", venue:"東京ドーム", event_name:"なにわ男子 LIVE TOUR 2023-2024", block:"アリーナA1-A8", max_row:16, max_seat:18, upgrade_blocks:"最速FC", image_url:null, image_description:"なにわ男子2023東京ドーム。" },
  { id:"df24dea5-d9e2-48fe-a9b5-e41386194ce1", artist:"なにわ男子", venue:"京セラドーム", event_name:"なにわ男子 LIVE TOUR 2023-2024", block:"アリーナB1-B8", max_row:15, max_seat:17, upgrade_blocks:"最速FC", image_url:null, image_description:"B1-B8ブロック。" },
  { id:"aa7a2141-547b-4ad1-84c3-04c4c2541d4f", artist:"なにわ男子", venue:"さいたまスーパーアリーナ", event_name:"なにわ男子 LIVE TOUR 2023-2024", block:"アリーナ全体", max_row:17, max_seat:20, upgrade_blocks:"最速FC", image_url:null, image_description:"全体アリーナ。" },
  { id:"33d62048-db78-4a81-878c-31e1cd9c4ccb", artist:"Snow Man", venue:"東京ドーム", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナA1-A10", max_row:19, max_seat:23, upgrade_blocks:"FC1次", image_url:null, image_description:"Snow Man 2023東京ドームA1-A10。" },
  { id:"bf06fa82-3415-41b3-bd7a-9c4bcf14ce4f", artist:"Snow Man", venue:"東京ドーム", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナB1-B10", max_row:18, max_seat:22, upgrade_blocks:"FC1次", image_url:null, image_description:"B1-B10ブロック。" },
  { id:"36277c2b-622b-483a-b74e-94b80a6a2e98", artist:"Snow Man", venue:"みずほPayPayドーム福岡", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナ全体", max_row:20, max_seat:25, upgrade_blocks:"FC1次", image_url:null, image_description:"福岡ドーム全体。" },
  { id:"5ecb7090-065b-4a15-8caa-eb04ae270c92", artist:"Snow Man", venue:"京セラドーム大阪", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナA1-A12", max_row:21, max_seat:26, upgrade_blocks:"FC1次", image_url:null, image_description:"京セラA1-A12。" },
  { id:"c15b49a3-0212-4664-91a3-34a018590574", artist:"BTS", venue:"東京ドーム", event_name:"BTS PERMISSION TO DANCE", block:"アリーナ全体", max_row:18, max_seat:22, upgrade_blocks:"最速FC", image_url:null, image_description:"2024年参考BTS東京ドーム。" },
  { id:"c4dc22bb-41bc-481a-8ac9-2c5a3b9342a8", artist:"NewJeans", venue:"横浜アリーナ", event_name:"NewJeans Bunnies Camp", block:"アリーナC-D", max_row:13, max_seat:13, upgrade_blocks:"FC1次", image_url:null, image_description:"C-Dブロック。" },
  { id:"569736f4-45ca-4836-9992-ec70f118ea2a", artist:"INI", venue:"さいたまスーパーアリーナ", event_name:"INI LAPOSTA 2024", block:"アリーナA1-A7", max_row:13, max_seat:13, upgrade_blocks:"最速FC", image_url:null, image_description:"A1-A7ブロック。" },
  { id:"3db2049d-51a3-49f9-986d-9a48514a2184", artist:"乃木坂46", venue:"東京ドーム", event_name:"乃木坂46 真夏の全国ツアー", block:"アリーナA1-A11", max_row:21, max_seat:26, upgrade_blocks:"FC1次", image_url:null, image_description:"A1-A11ブロック。" },
  { id:"7336f54f-1131-47ba-8d36-7efc0fdace24", artist:"なにわ男子", venue:"横浜アリーナ", event_name:"なにわ男子 LIVE TOUR 2023-2024", block:"アリーナ全体", max_row:16, max_seat:19, upgrade_blocks:"最速FC", image_url:null, image_description:"横浜アリーナ全体。" },
  { id:"f372d0e7-9a26-4862-a501-1b7e51dfdca7", artist:"Snow Man", venue:"東京ドーム", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナB1-B11", max_row:22, max_seat:27, upgrade_blocks:"FC1次", image_url:null, image_description:"B1-B11ブロック。" },
  { id:"7fe3b95b-e919-4afe-b9d0-3ae7365b3eb9", artist:"BTS", venue:"東京ドーム", event_name:"BTS 2023日本イベント", block:"アリーナA1-A9", max_row:17, max_seat:21, upgrade_blocks:"最速FC", image_url:null, image_description:"2023年特別公演A1-A9。" },
  { id:"ba996e9a-bfc2-4adb-b78b-7c00efb5d660", artist:"NewJeans", venue:"さいたまスーパーアリーナ", event_name:"NewJeans 2024日本プロモ", block:"アリーナ全体", max_row:14, max_seat:16, upgrade_blocks:"FC1次", image_url:null, image_description:"全体アリーナ。" },
  { id:"b1f32423-4932-4914-a855-8b4ff8934d8b", artist:"INI", venue:"東京ドーム", event_name:"INI 2024ツアー", block:"アリーナA1-A8", max_row:14, max_seat:14, upgrade_blocks:"最速FC", image_url:null, image_description:"A1-A8ブロック。" },
  { id:"4de651d9-ffe4-4216-b5f8-d1b61961256e", artist:"乃木坂46", venue:"横浜アリーナ", event_name:"乃木坂46 2024アリーナツアー", block:"アリーナB1-B9", max_row:19, max_seat:23, upgrade_blocks:"FC1次", image_url:null, image_description:"B1-B9ブロック。" },
  { id:"849bb946-9896-4329-8476-620cc3cf6f08", artist:"なにわ男子", venue:"京セラドーム", event_name:"なにわ男子 2024ドームツアー", block:"アリーナA1-A9", max_row:18, max_seat:21, upgrade_blocks:"最速FC", image_url:null, image_description:"A1-A9ブロック。" },
  { id:"6605d625-ed42-4539-9a61-345461d2606a", artist:"Snow Man", venue:"さいたまスーパーアリーナ", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナ全体", max_row:20, max_seat:24, upgrade_blocks:"FC1次", image_url:null, image_description:"さいたま全体。" },
  { id:"305b8e06-5786-4867-9005-638a1d428e5a", artist:"BTS", venue:"京セラドーム", event_name:"BTS 2024日本イベント", block:"アリーナ全体", max_row:19, max_seat:23, upgrade_blocks:"最速FC", image_url:null, image_description:"京セラ全体。" },
  { id:"18e1e79b-ca6e-4596-b008-03f45f717c36", artist:"NewJeans", venue:"東京ドーム", event_name:"NewJeans 2024日本イベント", block:"アリーナA-B", max_row:16, max_seat:17, upgrade_blocks:"FC1次", image_url:null, image_description:"A-Bブロック。" },
  { id:"4577e6b7-8d50-4af4-b836-6c31480043ee", artist:"INI", venue:"横浜アリーナ", event_name:"INI LAPOSTA 2024", block:"アリーナB1-B7", max_row:12, max_seat:12, upgrade_blocks:"最速FC", image_url:null, image_description:"B1-B7ブロック。" },
  { id:"6e3e8c8f-82f0-4b04-878f-18e1b670e884", artist:"乃木坂46", venue:"東京ドーム", event_name:"乃木坂46 2023-2024ツアー", block:"アリーナA1-A12", max_row:22, max_seat:27, upgrade_blocks:"FC1次", image_url:null, image_description:"A1-A12ブロック。" },
  { id:"d591e3e3-5571-4553-9535-174efe833894", artist:"なにわ男子", venue:"さいたまスーパーアリーナ", event_name:"なにわ男子 2024ツアー", block:"アリーナ全体", max_row:17, max_seat:20, upgrade_blocks:"最速FC", image_url:null, image_description:"全体アリーナ。" },
  { id:"fb89297c-4cd6-487f-ba90-6ecc3fbf7dfe", artist:"Snow Man", venue:"京セラドーム", event_name:"Snow Man 2023-2024 LIVE TOUR", block:"アリーナA1-A13", max_row:23, max_seat:28, upgrade_blocks:"FC1次", image_url:null, image_description:"A1-A13ブロック。" },
];

const { error } = await supabase
  .from("historical_patterns")
  .upsert(rows, { onConflict: "id" });

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log(`✓ ${rows.length} rows upserted into historical_patterns`);

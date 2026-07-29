import assert from "node:assert/strict";
import test from "node:test";
import { parseStartoLivePage } from "@/lib/officialTourSources";

test("STARTOの構造化日程からツアー名・会場・日付を抽出し、昼夜公演を日単位へまとめる", () => {
  const html = `
    <h1>We're timelesz LIVE TOUR 2026 episode 2 MOMENTUM</h1>
    <script>
      const live_info_item = [
        { "str_itemDate":"2026-07-31", "str_itemPlace":"大阪城ホール", "str_itemTime":\`18:00\` },
        { "str_itemDate":"2026-08-01", "str_itemPlace":"大阪城ホール", "str_itemTime":\`13:00\` },
        { "str_itemDate":"2026-08-01", "str_itemPlace":"大阪城ホール", "str_itemTime":\`17:30\` },
        { "str_itemDate":"2026-08-30", "str_itemPlace":"セキスイハイムスーパーアリーナ", "str_itemTime":\`17:30\` }
      ];
    </script>`;

  const parsed = parseStartoLivePage(html);
  assert.equal(parsed.title, "We're timelesz LIVE TOUR 2026 episode 2 MOMENTUM");
  assert.deepEqual(parsed.items, [
    { date: "2026-07-31", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
    { date: "2026-08-01", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
    { date: "2026-08-30", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
  ]);
});

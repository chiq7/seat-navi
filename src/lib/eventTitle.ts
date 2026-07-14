const TEST_DATA_TAG = "【テストデータ】";

export type ParsedEventTitle = {
  /** アーティスト名の重複部分のみ除去した文字列（【テストデータ】等のタグは残る）。
   * 既存の過去公演グルーピングキーと同一の値を再現するための互換用。 */
  rawStripped: string;
  /** rawStrippedから【テストデータ】タグも取り除いた、表示用の純粋なツアー名。 */
  tourName: string;
  /** タイトルに【テストデータ】タグが含まれていたか。 */
  isTestData: boolean;
};

/** イベントタイトルからアーティスト名の重複部分と【テストデータ】タグを分離する。 */
export function parseEventTitle(
  title: string,
  artistName?: string | null,
): ParsedEventTitle {
  let rawStripped = title;
  if (artistName && title.startsWith(artistName)) {
    const rest = title.slice(artistName.length).trim();
    rawStripped = rest || title;
  }

  const isTestData = rawStripped.includes(TEST_DATA_TAG);
  const cleaned = isTestData
    ? rawStripped.split(TEST_DATA_TAG).join("").trim()
    : rawStripped;
  const tourName = cleaned || rawStripped;

  return { rawStripped, tourName, isTestData };
}

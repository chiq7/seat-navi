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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 会場カレンダーの短縮タイトルを、正式なツアー名と誤認しないための比較キー。 */
function normalizedTitleKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[\s　「」『』“”‘’"'【】()[\]（）]/g, "")
    .trim();
}

/**
 * 例: title="なにわ男子" / artistName="なにわ男子" のような、
 * ツアー名が欠けた短縮タイトルを判定する。
 */
export function isArtistOnlyEventTitle(title: string, artistName?: string | null): boolean {
  if (!artistName?.trim()) return false;
  const normalizedTitle = normalizedTitleKey(title);
  return Boolean(normalizedTitle) && normalizedTitle === normalizedTitleKey(artistName);
}

/**
 * イベントタイトルから先頭付近のアーティスト名と【テストデータ】タグを分離する。
 * アーティスト名より前に許容するのは西暦表記だけで、タイトル途中の名称は削除しない。
 */
export function parseEventTitle(
  title: string,
  artistName?: string | null,
): ParsedEventTitle {
  const isTestData = title.includes(TEST_DATA_TAG);
  const cleanedTitle = title.split(TEST_DATA_TAG).join("").trim() || title;
  let rawStripped = cleanedTitle;

  if (artistName) {
    const escapedName = escapeRegExp(artistName.trim());
    const leadingPattern = new RegExp(
      `^(?<prefix>\\s*(?:(?:19|20)\\d{2}(?:年)?[\\s.:：/_\\-–—|]*)?)(?<artist>${escapedName})(?=$|[\\s:：/_\\-–—|「『\"'【(])`,
      "i",
    );
    const match = cleanedTitle.match(leadingPattern);
    if (match?.groups) {
      const rest = cleanedTitle.slice(match[0].length).trim();
      const prefix = match.groups.prefix.trim();
      const candidate = [prefix, rest].filter(Boolean).join(" ").trim();
      rawStripped = candidate || cleanedTitle;
    }
  }

  const tourName = rawStripped.trim() || cleanedTitle || title;

  return { rawStripped, tourName, isTestData };
}

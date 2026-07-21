/**
 * アーティストkeywordsと公演タイトルの照合ロジックを一元化するモジュール。
 * src/lib/artists.ts の findArtistByKeyword と src/lib/events.ts の
 * getEventsForArtist の両方から利用する（判定基準を1箇所に集約）。
 */

const SHORT_KEYWORD_MAX_LEN = 4;

function isAsciiAlnum(ch: string | undefined): boolean {
  return !!ch && /[a-z0-9]/i.test(ch);
}

/**
 * NFKC正規化 + 小文字化 + 前後空白除去。
 * 全角英数字(ＥＸＯ→exo)・全角記号(＝→=)・全角スペース(U+3000→半角スペース)を
 * 統一的に半角へ寄せたうえで比較できるようにする。
 */
export function normalizeForMatch(s: string): string {
  return s.normalize("NFKC").toLowerCase().trim();
}

/**
 * 純ASCII英数字(末尾の"."は除いて判定)で構成され、かつ短い(4文字以下)keywordは、
 * 単純な部分一致だと別の単語の内部にたまたま出現して誤爆する
 * (例: "EXO"→"EXOFIRE", "IVE"→"LIVE", "INI"→"HAEINISM")。
 * 該当する場合のみ、英数字境界判定(前後が英数字でない位置でのみ一致)を適用する。
 * 日本語名や5文字以上の固有名はこれまで通り単純部分一致のまま。
 */
function isBoundarySensitive(keywordNormalized: string): boolean {
  const core = keywordNormalized.replace(/\.+$/, "");
  return /^[a-z0-9]+$/.test(core) && core.length > 0 && core.length <= SHORT_KEYWORD_MAX_LEN;
}

/** keywordNormalized が titleNormalized 内に「英数字境界」を満たす位置で出現するか。 */
function includesWithBoundary(titleNormalized: string, keywordNormalized: string): boolean {
  const kLen = keywordNormalized.length;
  if (kLen === 0) return false;

  const startEdgeAlnum = isAsciiAlnum(keywordNormalized[0]);
  const endEdgeAlnum = isAsciiAlnum(keywordNormalized[kLen - 1]);

  let fromIndex = 0;
  while (true) {
    const pos = titleNormalized.indexOf(keywordNormalized, fromIndex);
    if (pos === -1) return false;

    const before = pos > 0 ? titleNormalized[pos - 1] : undefined;
    const after = pos + kLen < titleNormalized.length ? titleNormalized[pos + kLen] : undefined;

    // keyword自体の端が英数字でない(例: "imp."の末尾"."、"=love"の先頭"=")場合、
    // その側の境界チェックは不要(記号自体がすでに単語区切りとして機能する)。
    const beforeOk = !startEdgeAlnum || !isAsciiAlnum(before);
    const afterOk = !endEdgeAlnum || !isAsciiAlnum(after);
    if (beforeOk && afterOk) return true;

    fromIndex = pos + 1;
  }
}

/**
 * 1件のkeywordがtitleに一致するかを判定する共通関数。
 * 従来の findArtistByKeyword のロジック(完全一致 / keywordがtitleで始まる / titleがkeywordを含む)
 * を踏襲しつつ、「titleがkeywordを含む」の判定だけを、短いASCII英数字keywordについて
 * 英数字境界判定つきに置き換えている。
 */
export function keywordMatchesTitle(keyword: string, title: string): boolean {
  const k = normalizeForMatch(keyword);
  const t = normalizeForMatch(title);
  if (!k || !t) return false;

  if (k === t) return true;
  if (k.startsWith(t)) return true;

  if (isBoundarySensitive(k)) {
    return includesWithBoundary(t, k);
  }
  return t.includes(k);
}

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

const SEARCH_SEPARATORS = /[\s\-‐‑‒–—―_.・･:：/\\'’"“”()[\]{}]+/g;

/**
 * 検索欄向けの正規化。照合用のNFKC・小文字化に加えて、ひらがな/カタカナと
 * 名前中の区切り記号を揃える（例: "にじゅー" → "ニジュー"、"Nizi U" → "NiziU"）。
 */
export function normalizeForSearch(s: string): string {
  return normalizeForMatch(s)
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(SEARCH_SEPARATORS, "");
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

/**
 * ユーザー検索専用の一致度。crawlerの厳格な紐付け判定とは分離し、短い英字でも
 * 候補名の先頭なら部分入力を許可する（Nizi → NiziU）。一方、語中の偶然一致
 * （IVE → LIVE）は従来どおり英数字境界で除外する。
 */
export function searchTextScore(query: string, candidate: string): number {
  const q = normalizeForMatch(query);
  const c = normalizeForMatch(candidate);
  if (!q || !c) return 0;

  if (q === c) return 100;
  if (c.startsWith(q)) return 90;

  const compactQuery = normalizeForSearch(query);
  const compactCandidate = normalizeForSearch(candidate);
  if (!compactQuery || !compactCandidate) return 0;
  // 1文字からひらがな/カタカナ変換を広げると候補が多すぎるため、表記ゆれ検索は2文字以上。
  const allowCompactMatch = [...compactQuery].length >= 2;
  if (allowCompactMatch && compactQuery === compactCandidate) return 95;
  if (allowCompactMatch && compactCandidate.startsWith(compactQuery)) return 85;

  if (isBoundarySensitive(q)) {
    return includesWithBoundary(c, q) ? 70 : 0;
  }

  if (c.includes(q)) return 60;
  if (allowCompactMatch && compactCandidate.includes(compactQuery)) return 50;
  return 0;
}

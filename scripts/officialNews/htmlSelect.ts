// 依存ライブラリなし(cheerio等未導入)で動く、最小限のCSSセレクタ風HTML抽出ユーティリティ。
// Tier2 (static_html) 専用。フルCSSセレクタ仕様には対応しない、意図的に限定された実装。
//
// 対応するセレクタ構文(これ以外は非対応):
//   - タグ名            例: "article"
//   - クラス            例: ".news-item"
//   - id                例: "#list"
//   - タグ+クラス       例: "div.news-item"
//   - 子孫結合子(空白区切りのみ。 > や + 等の結合子は非対応)
//     例: ".news-list .item a.title"
//
// 複雑なサイトはTier2で無理に対応せず、Tier3(special)の専用実装に倒す想定。

type SimpleSelector = { tag: string | null; cls: string | null; id: string | null };

function parseSimpleSelector(s: string): SimpleSelector {
  const clsMatch = /\.([a-zA-Z0-9_-]+)/.exec(s);
  const idMatch = /#([a-zA-Z0-9_-]+)/.exec(s);
  const tagMatch = /^[a-zA-Z][a-zA-Z0-9]*/.exec(s);
  return {
    tag: tagMatch ? tagMatch[0].toLowerCase() : null,
    cls: clsMatch ? clsMatch[1] : null,
    id: idMatch ? idMatch[1] : null,
  };
}

export function parseSelector(selector: string): SimpleSelector[] {
  return selector
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseSimpleSelector);
}

const VOID_TAGS = new Set(["br", "img", "input", "hr", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]);

/** htmlの中から、simple selectorにマッチする最初の開始タグ位置を探し、その要素の
 * 開始タグ・終了タグ・内側HTMLを返す(タグの深さを数えて対応する終了タグを特定する)。
 * 複数マッチがある場合は全件を返す。 */
function findElements(html: string, sel: SimpleSelector, fromIndex = 0): { outerHTML: string; innerHTML: string; tagName: string; start: number; end: number }[] {
  const results: { outerHTML: string; innerHTML: string; tagName: string; start: number; end: number }[] = [];
  const openTagRe = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  openTagRe.lastIndex = fromIndex;
  let m: RegExpExecArray | null;
  while ((m = openTagRe.exec(html)) !== null) {
    const [fullOpenTag, tagName, attrs] = m;
    if (sel.tag && tagName.toLowerCase() !== sel.tag) continue;
    if (sel.cls) {
      const classAttr = /class="([^"]*)"/.exec(attrs);
      const classes = (classAttr?.[1] ?? "").split(/\s+/);
      if (!classes.includes(sel.cls)) continue;
    }
    if (sel.id) {
      const idAttr = /id="([^"]*)"/.exec(attrs);
      if (idAttr?.[1] !== sel.id) continue;
    }

    const tagLower = tagName.toLowerCase();
    if (VOID_TAGS.has(tagLower) || fullOpenTag.endsWith("/>")) {
      results.push({ outerHTML: fullOpenTag, innerHTML: "", tagName: tagLower, start: m.index, end: m.index + fullOpenTag.length });
      continue;
    }

    // 深さを数えて対応する終了タグを特定する(同名タグのネストに対応するため)。
    const searchRe = new RegExp(`<${tagLower}\\b[^>]*>|</${tagLower}>`, "gi");
    searchRe.lastIndex = m.index + fullOpenTag.length;
    let depth = 1;
    let endIdx = -1;
    let sm: RegExpExecArray | null;
    while ((sm = searchRe.exec(html)) !== null) {
      if (sm[0].startsWith("</")) {
        depth--;
        if (depth === 0) {
          endIdx = sm.index;
          break;
        }
      } else if (!sm[0].endsWith("/>")) {
        depth++;
      }
    }
    if (endIdx === -1) continue; // 終了タグが見つからない(壊れたHTML) -> スキップ

    const innerStart = m.index + fullOpenTag.length;
    const innerHTML = html.slice(innerStart, endIdx);
    const outerEnd = endIdx + `</${tagLower}>`.length;
    results.push({ outerHTML: html.slice(m.index, outerEnd), innerHTML, tagName: tagLower, start: m.index, end: outerEnd });
    openTagRe.lastIndex = outerEnd;
  }
  return results;
}

/** セレクタ(子孫結合子つき)にマッチする要素のinnerHTML一覧を返す。 */
export function selectAll(html: string, selector: string): string[] {
  const steps = parseSelector(selector);
  let contexts = [html];
  for (const step of steps) {
    const next: string[] = [];
    for (const ctx of contexts) {
      for (const el of findElements(ctx, step)) {
        next.push(el.innerHTML || el.outerHTML);
      }
    }
    contexts = next;
  }
  return contexts;
}

/** 最終要素の属性も参照したい一覧item向けに、マッチ要素のouterHTMLを返す。 */
export function selectAllOuter(html: string, selector: string): string[] {
  const steps = parseSelector(selector);
  let contexts = [html];
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const isLast = index === steps.length - 1;
    const next: string[] = [];
    for (const ctx of contexts) {
      for (const el of findElements(ctx, step)) next.push(isLast ? el.outerHTML : (el.innerHTML || el.outerHTML));
    }
    contexts = next;
  }
  return contexts;
}

/** セレクタにマッチする最初の要素のテキスト内容(タグ除去済み)を返す。 */
export function selectText(html: string, selector: string): string | null {
  return selectTextAt(html, selector, 0);
}

/** セレクタにマッチする指定位置の要素からテキスト内容を返す。 */
export function selectTextAt(html: string, selector: string, index: number): string | null {
  const matches = selectAll(html, selector);
  if (index < 0 || index >= matches.length) return null;
  const text = matches[index]
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

/** セレクタにマッチする最初の要素から属性値を取得する(例: hrefやdatetime属性)。 */
export function selectAttr(html: string, selector: string, attr: string): string | null {
  const steps = parseSelector(selector);
  if (steps.length === 0) return null;
  const lastStep = steps[steps.length - 1];
  const parentSteps = steps.slice(0, -1);

  let contexts = [html];
  for (const step of parentSteps) {
    const next: string[] = [];
    for (const ctx of contexts) {
      for (const el of findElements(ctx, step)) next.push(el.innerHTML || el.outerHTML);
    }
    contexts = next;
  }

  for (const ctx of contexts) {
    const els = findElements(ctx, lastStep);
    if (els.length === 0) continue;
    const attrRe = new RegExp(`${attr}="([^"]*)"`, "i");
    const am = attrRe.exec(els[0].outerHTML);
    if (am) return am[1];
  }
  return null;
}

/** exclude指定された要素を本文抽出前に取り除く(ナビ・フッター・SNSシェアボタン等)。 */
export function removeSelectors(html: string, selectors: string[] | undefined): string {
  if (!selectors || selectors.length === 0) return html;
  let out = html;
  for (const sel of selectors) {
    const steps = parseSelector(sel);
    if (steps.length !== 1) continue; // 除外指定は単純セレクタのみ対応
    for (const el of findElements(out, steps[0])) {
      out = out.slice(0, el.start) + out.slice(el.end);
      break; // 1回除去したらインデックスがずれるため、呼び出し側で繰り返し呼ぶ想定
    }
  }
  return out;
}

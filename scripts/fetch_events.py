#!/usr/bin/env python3
"""
fetch_events.py — 主要会場スケジュールページからコンサート/ライブ情報を取得しSupabaseに保存

使い方:
  cd seat-navi
  python scripts/fetch_events.py
  python scripts/fetch_events.py --dry-run  # DB保存なし

必要パッケージ:
  pip install -r scripts/requirements.txt

必要な環境変数 (.env.local):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  ANTHROPIC_API_KEY
"""

from dotenv import load_dotenv
load_dotenv(dotenv_path=".env.local")

import hashlib
import json
import logging
import os
import random
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional, TypedDict, Union
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

import anthropic
import requests
from bs4 import BeautifulSoup
from supabase import create_client

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# --- ロギング設定 ---
log_path = Path(__file__).parent / "fetch_events.log"
DRY_RUN = "--dry-run" in sys.argv
log_handlers: list[logging.Handler] = [logging.StreamHandler()]
if not DRY_RUN:
    log_handlers.append(logging.FileHandler(log_path, encoding="utf-8"))
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=log_handlers,
)
log = logging.getLogger(__name__)


class SingleUrlVenue(TypedDict):
    id: str
    name: str
    type: Literal["single_url"]
    url: str


class MonthlyPatternVenue(TypedDict):
    id: str
    name: str
    type: Literal["monthly_pattern"]
    url_pattern: str


class FollowMonthLinksVenue(TypedDict):
    id: str
    name: str
    type: Literal["follow_month_links"]
    start_url: str


class DisabledVenue(TypedDict):
    id: str
    name: str
    type: Literal["disabled"]
    reason: str


VenueConfig = Union[SingleUrlVenue, MonthlyPatternVenue, FollowMonthLinksVenue, DisabledVenue]

# --- 会場リスト（Vercel Cron 側と同じ定義） ---
VENUES: list[VenueConfig] = [
    # ドーム
    {"id": "tokyo-dome", "name": "東京ドーム", "type": "single_url", "url": "https://www.tokyo-dome.co.jp/en/dome/event/schedule.html"},
    {"id": "kyocera-dome", "name": "京セラドーム大阪", "type": "single_url", "url": "https://www.kyoceradome-osaka.jp/schedule/"},
    {"id": "vantelin-dome", "name": "バンテリンドームナゴヤ", "type": "single_url", "url": "https://www.nagoya-dome.co.jp/sp/eventcalen.php"},
    {"id": "paypay-dome", "name": "福岡PayPayドーム", "type": "single_url", "url": f"https://www.softbankhawks.co.jp/stadium/event_schedule/{datetime.now(ZoneInfo('Asia/Tokyo')).year}/"},
    {"id": "sapporo-dome", "name": "札幌ドーム", "type": "single_url", "url": "https://www.sapporo-dome.co.jp/schedule/"},
    {"id": "belluna-dome", "name": "ベルーナドーム", "type": "single_url", "url": "https://bellunadome.seibulions.co.jp/schedule/"},
    {"id": "zozo-marine", "name": "ZOZOマリンスタジアム", "type": "single_url", "url": "https://www.marines.co.jp/stadium/schedule/"},
    {"id": "koshien", "name": "阪神甲子園球場", "type": "monthly_pattern", "url_pattern": "https://koshien.hanshin.co.jp/event/{YYYYMM}.html"},
    {"id": "mufg-stadium", "name": "MUFGスタジアム", "type": "monthly_pattern", "url_pattern": "https://jns-e.com/event/page/{YYYYMM}/"},
    # 月切替リンクが ?m=x(次月) / ?m=a(翌々月) という不透明な値のため、リンクを辿って年月を判定する
    {"id": "nissan-stadium", "name": "日産スタジアム", "type": "follow_month_links", "start_url": "https://www.nissan-stadium.jp/calendar/"},
    # アリーナ（関東）
    {"id": "saitama-super-arena", "name": "さいたまスーパーアリーナ", "type": "single_url", "url": "https://www.saitama-arena.co.jp/schedule/"},
    {"id": "yokohama-arena", "name": "横浜アリーナ", "type": "single_url", "url": "https://www.yokohama-arena.co.jp/event"},
    {"id": "pia-arena-mm", "name": "ぴあアリーナMM", "type": "single_url", "url": "https://pia-arena-mm.jp/"},
    # 月切替リンクが next/two/three/last という相対スラッグのため、リンクを辿って年月を判定する
    {"id": "ariake-arena", "name": "有明アリーナ", "type": "follow_month_links", "start_url": "https://ariake-arena.tokyo/event/"},
    {"id": "budokan", "name": "日本武道館", "type": "disabled", "reason": "公式に一般公演の統一一覧が存在しない"},
    {"id": "yoyogi", "name": "代々木第一体育館", "type": "single_url", "url": "https://www.jpnsport.go.jp/yoyogi/event/tabid/59/default.aspx"},
    {"id": "makuhari-messe", "name": "幕張メッセ", "type": "single_url", "url": "https://www.m-messe.co.jp/event/"},
    {"id": "k-arena", "name": "Kアリーナ横浜", "type": "single_url", "url": "https://k-arena.com/en/schedule/"},
    {"id": "tokyo-garden-theater", "name": "東京ガーデンシアター", "type": "monthly_pattern", "url_pattern": "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/schedule/?date={YYYY-MM}"},
    # アリーナ（関西・地方）
    {"id": "osaka-jo-hall", "name": "大阪城ホール", "type": "single_url", "url": "https://www.osaka-johall.com/event/"},
    {"id": "edion-arena", "name": "大阪エディオンアリーナ", "type": "disabled", "reason": "2027年1月末まで休館"},
    {"id": "marine-messe", "name": "マリンメッセ福岡", "type": "single_url", "url": "https://www.marinemesse.or.jp/messe/event"},
    {"id": "miyagi-arena", "name": "セキスイハイムスーパーアリーナ", "type": "single_url", "url": "https://www.mspf.jp/grande21/"},
    {"id": "hiroshima-arena", "name": "広島グリーンアリーナ", "type": "single_url", "url": "https://h-jigyoudan.or.jp/sports-center/center-events/"},
    {"id": "gaishi-hall", "name": "名古屋ガイシホール", "type": "single_url", "url": "https://www.nespa.or.jp/hall/"},
    {"id": "toki-messe", "name": "朱鷺メッセ", "type": "single_url", "url": "https://www.tokimesse.com/sp/visitor/event/index"},
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

MAX_TEXT_CHARS = 80_000  # Claude APIに送るテキストの上限（ページ単位。安全弁として維持）
CLAUDE_MODEL = "claude-haiku-4-5-20251001"  # 低コスト・高速
CLAUDE_CONCURRENCY = 3  # Claude呼び出しの同時実行数上限
MAX_FOLLOW_PAGES = 20  # follow_month_links型が辿る最大ページ数（安全上限）
MONTH_OFFSET_RANGE = range(-1, 13)  # 前月〜12ヶ月先

# 本番DBに残る旧venue_idのエイリアス（TS版 eventCrawlerConfig.ts と同一定義）。
# 重複判定（dry-run / upsert前の既存確認）にのみ使用する。
# 新規保存は常に正式ID（キーの側）で行い、旧IDでは保存しない。
# 座席マップ等のvenue_idグルーピングには適用しない。
VENUE_ID_ALIASES: dict[str, list[str]] = {
    "paypay-dome": ["paypay-dome", "fukuoka-paypay-dome"],
    "vantelin-dome": ["vantelin-dome", "nagoya-dome"],
    "saitama-super-arena": ["saitama-super-arena", "saitama-arena"],
    "mufg-stadium": ["mufg-stadium"],
}


def get_venue_id_aliases(venue_id: str) -> list[str]:
    return VENUE_ID_ALIASES.get(venue_id, [venue_id])

EXTRACT_PROMPT = """\
以下は「{venue_name}」のスケジュールページから抽出したテキストです。

このテキストから「コンサート・ライブ公演」のみを抽出し、JSONのみを返してください（前後の説明文・コードブロック不要）。

出力フォーマット:
[
  {{
    "title": "イベントタイトル（アーティスト名を含む完全な名称）",
    "date": "YYYY-MM-DD（複数日程なら初日。不明なら null）",
    "genre": "kpop | johnnys | female_idol | male_idol | other"
  }}
]

ジャンル分類:
- kpop: 韓国K-POPアーティスト（BTS, TWICE, aespa, SEVENTEEN 等）
- johnnys: ジャニーズ/STARTO系（Snow Man, SixTONES, King & Prince 等）
- female_idol: 日本女性アイドル（乃木坂46, AKB48, NiziU 等）
- male_idol: 日本男性アイドル（BE:FIRST, JO1, BOYS AND MEN 等）
- other: バンド, 演歌, クラシック, スポーツイベント, 展示会, 会議 等

注意:
- スポーツ試合・展示会・会議・卒業式等はコンサート/ライブではないので除外
- コンサート/ライブが一件もなければ空配列 [] を返す
- タイトルが空の場合はスキップ

テキスト:
{text}"""


# ---------------------------------------------------------------------------
# 日時 / 月レンジ
# ---------------------------------------------------------------------------

def now_jst(now: Optional[datetime] = None) -> datetime:
    current = now or datetime.now(ZoneInfo("Asia/Tokyo"))
    if current.tzinfo is None:
        return current.replace(tzinfo=ZoneInfo("Asia/Tokyo"))
    return current.astimezone(ZoneInfo("Asia/Tokyo"))


def target_months(now: Optional[datetime] = None) -> list[tuple[int, int]]:
    """前月〜12ヶ月先の (year, month) タプルのリスト"""
    current = now_jst(now)
    months = []
    for offset in MONTH_OFFSET_RANGE:
        idx = current.year * 12 + current.month - 1 + offset
        year, zero_based_month = divmod(idx, 12)
        months.append((year, zero_based_month + 1))
    return months


def make_event_id(venue_id: str, date: Optional[str], title: str) -> str:
    raw = f"{venue_id}::{date or ''}::{title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


def generate_monthly_pages(venue: MonthlyPatternVenue, now: Optional[datetime] = None) -> list[tuple[int, int, str]]:
    """monthly_pattern 会場の (year, month, url) リストを生成（重複URL除去）"""
    seen_urls: set[str] = set()
    result: list[tuple[int, int, str]] = []
    for year, month in target_months(now):
        url = (venue["url_pattern"]
               .replace("{YYYYMM}", f"{year:04d}{month:02d}")
               .replace("{YYYY-MM}", f"{year:04d}-{month:02d}"))
        if url in seen_urls:
            continue
        seen_urls.add(url)
        result.append((year, month, url))
    return result


# ---------------------------------------------------------------------------
# フェッチ / HTML健全性チェック
# ---------------------------------------------------------------------------

def fetch_page(url: str) -> dict:
    """HTMLページを取得する。Accept-Encoding は requests 標準（gzip, deflate）に任せる。
    brotli / brotlicffi が未インストールの環境で br を手動指定すると、
    圧縮バイト列がそのまま resp.text に渡り文字化けするため、明示指定はしない。"""
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
    }
    t0 = time.monotonic()
    try:
        resp = requests.get(url, headers=headers, timeout=20, allow_redirects=True)
        elapsed_ms = round((time.monotonic() - t0) * 1000)
        content_type = resp.headers.get("Content-Type", "")
        content_encoding = resp.headers.get("Content-Encoding", "")
        log.info(
            f"    GET {url} -> {resp.status_code} ({elapsed_ms}ms) "
            f"Content-Type={content_type or '(none)'} Content-Encoding={content_encoding or '(none)'}"
        )
        if not resp.ok:
            return {"url": url, "status": resp.status_code, "html": None, "chars": 0,
                     "error": f"HTTP {resp.status_code}", "content_type": content_type,
                     "content_encoding": content_encoding, "elapsed_ms": elapsed_ms}
        resp.encoding = resp.apparent_encoding or "utf-8"
        text = resp.text
        return {"url": url, "status": resp.status_code, "html": text, "chars": len(text),
                 "error": None, "content_type": content_type, "content_encoding": content_encoding,
                 "elapsed_ms": elapsed_ms}
    except requests.RequestException as e:
        elapsed_ms = round((time.monotonic() - t0) * 1000)
        log.info(f"    GET {url} -> ERROR ({elapsed_ms}ms): {e}")
        return {"url": url, "status": "ERROR", "html": None, "chars": 0, "error": str(e),
                 "content_type": "", "content_encoding": "", "elapsed_ms": elapsed_ms}


CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_MARKUP_HINTS = ("<html", "<!doctype", "<body", "<div", "<a ", "<a>", "<table", "<p>", "<p ", "<span", "<ul", "<li")


def check_html_sanity(text: str) -> tuple[bool, str]:
    """展開後の本文がバイナリ・文字化けしていないか確認する。
    <html> タグが無いだけの断片HTMLは許容し、即エラーにはしない。"""
    if not text or not text.strip():
        return False, "本文が空です"

    sample = text[:20_000]
    n = len(sample)
    control_ratio = len(CONTROL_CHAR_RE.findall(sample)) / n
    replacement_ratio = sample.count("�") / n

    if control_ratio > 0.02:
        return False, f"制御文字比率が異常です({control_ratio:.1%})"
    if replacement_ratio > 0.01:
        return False, f"文字化け(置換文字U+FFFD)比率が異常です({replacement_ratio:.1%})"

    lowered = sample.lower()
    has_markup = any(tag in lowered for tag in _MARKUP_HINTS)
    if not has_markup:
        printable_ratio = sum(1 for c in sample if c.isprintable() or c in "\n\r\t") / n
        if printable_ratio < 0.9:
            return False, "HTMLタグが検出できず印字可能文字比率も低いため異常な本文です"

    return True, ""


def apply_sanity_check(page: dict) -> None:
    """page を直接書き換える（html=Noneにしてエラーを設定）。未来月未公開404には影響しない。"""
    if page["html"] is None:
        return
    ok, reason = check_html_sanity(page["html"])
    if not ok:
        log.warning(f"    [{page['url']}] 本文異常のためスキップ: {reason}")
        page["html"] = None
        page["error"] = f"本文異常: {reason}"


# ---------------------------------------------------------------------------
# 404の扱い（monthly_pattern。例: 甲子園の未来月未公開）
# ---------------------------------------------------------------------------

def classify_monthly_404s(pages: list[dict], now: Optional[datetime] = None) -> bool:
    """pages は year/month が既に設定済み。未来月の404は正常（status_kind=future_unpublished）とし
    error をクリアする。当月・過去月の404はエラーのまま残す。全月404なら設定異常として True を返す。"""
    current = now_jst(now)
    current_ym = (current.year, current.month)
    all_404 = bool(pages) and all(p["status"] == 404 for p in pages)

    for p in pages:
        if p["status"] != 404:
            continue
        ym = (p.get("year"), p.get("month"))
        if all_404:
            p["status_kind"] = "config_error"
            continue
        if ym[0] is not None and ym > current_ym:
            p["status_kind"] = "future_unpublished"
            p["error"] = None
        else:
            p["status_kind"] = "error"

    return all_404


# ---------------------------------------------------------------------------
# follow_month_links: 月切替リンクを辿るクローラ（有明アリーナ・日産スタジアム）
# ---------------------------------------------------------------------------

MONTH_TEXT_RE_JP = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月")
MONTH_TEXT_RE_EN = re.compile(r"(\d{4})\s+(\d{1,2})\s+[A-Za-z]{3,}")


def parse_month_from_text(text: str) -> Optional[tuple[int, int]]:
    text = text.strip()
    m = MONTH_TEXT_RE_JP.search(text)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = MONTH_TEXT_RE_EN.search(text)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None


def _soup(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")


def _extract_links(html: str, base_url: str) -> list[tuple[str, str]]:
    soup = _soup(html)
    links = []
    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True)
        abs_url = urljoin(base_url, a["href"])
        links.append((abs_url, text))
    return links


def follow_month_links(venue: FollowMonthLinksVenue, now: Optional[datetime] = None) -> dict:
    """一覧ページ内の月切替リンクをBFSで辿る。
    - visited setで同一URLの再取得を防止
    - 同一ドメインのみ辿る（相対URLは基準ページで絶対URL化）
    - 最大 MAX_FOLLOW_PAGES ページまで
    - リンクの表示テキストから年月が判定できるリンクのみ辿る（前月〜12ヶ月先の範囲内）
    - 開始ページ自身の年月は、自己参照リンクのテキスト、無ければページ本文から判定する
    """
    target_set = set(target_months(now))
    domain = urlparse(venue["start_url"]).netloc

    visited: set[str] = set()
    queue: list[tuple[str, Optional[tuple[int, int]]]] = [(venue["start_url"], None)]
    pages: list[dict] = []
    month_to_url: dict[tuple[int, int], str] = {}

    while queue and len(visited) < MAX_FOLLOW_PAGES:
        url, known_month = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        page = fetch_page(url)
        apply_sanity_check(page)

        month = known_month
        candidate_links: list[tuple[str, Optional[tuple[int, int]]]] = []

        if page["html"] is not None:
            for abs_url, text in _extract_links(page["html"], url):
                if urlparse(abs_url).netloc != domain:
                    continue  # 同一公式ドメイン外は辿らない
                m = parse_month_from_text(text)
                if abs_url == url and m and month is None:
                    month = m
                candidate_links.append((abs_url, m))

            if month is None:
                # 自己参照リンクで判定できない場合はページ内の表示年月から判定する
                page_text = _soup(page["html"]).get_text("\n", strip=True)
                pm = MONTH_TEXT_RE_JP.search(page_text) or MONTH_TEXT_RE_EN.search(page_text)
                if pm:
                    month = (int(pm.group(1)), int(pm.group(2)))

        page["year"], page["month"] = month if month else (None, None)
        pages.append(page)

        if page["html"] is not None and month is not None and month in target_set:
            month_to_url.setdefault(month, url)

        if page["html"] is not None:
            for abs_url, m in candidate_links:
                if m is None:
                    continue  # 月を判定できないリンクは辿らない（詳細ページ等を自然に除外）
                if m not in target_set:
                    continue  # 前月〜取得可能な未来月の範囲外
                if abs_url in visited:
                    continue
                if any(q_url == abs_url for q_url, _ in queue):
                    continue
                queue.append((abs_url, m))

    reachable = sorted(month_to_url.keys())
    unreachable = sorted(target_set - set(reachable))
    return {
        "pages": pages,
        "month_to_url": month_to_url,
        "reachable_months": reachable,
        "unreachable_months": unreachable,
        "visited_count": len(visited),
    }


# ---------------------------------------------------------------------------
# HTML -> テキスト / 空ページ判定
# ---------------------------------------------------------------------------

def html_to_text(html: str) -> str:
    """HTMLからテキストを抽出し、不要な空白を整理する"""
    soup = _soup(html)

    for tag in soup(["script", "style", "meta", "link", "noscript",
                     "img", "svg", "iframe", "header", "footer", "nav"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return "\n".join(lines)


DATE_LIKE_RE = re.compile(r"\d{4}[-/年]\d{1,2}([-/月]\d{0,2})?|\d{1,2}[/月]\d{1,2}日?")
EVENT_KEYWORDS = ("公演", "LIVE", "ライブ", "コンサート", "concert", "Concert", "CONCERT",
                   "TOUR", "ツアー", "開催", "チケット", "出演")
EXPLICIT_EMPTY_KEYWORDS = ("予定はございません", "公演の予定はありません", "開催予定はありません",
                            "該当する情報はありません", "イベントはありません", "情報がありません",
                            "現在、開催予定はありません")


def page_has_event_content(stripped_text: str) -> bool:
    """単純な文字数だけでなく、日付・イベント関連キーワードの有無で空ページを判定する"""
    if len(stripped_text) < 30:
        return False
    if any(kw in stripped_text for kw in EXPLICIT_EMPTY_KEYWORDS):
        return False
    has_date = bool(DATE_LIKE_RE.search(stripped_text))
    has_keyword = any(kw in stripped_text for kw in EVENT_KEYWORDS)
    return has_date or has_keyword


# ---------------------------------------------------------------------------
# Claude抽出
# ---------------------------------------------------------------------------

class BrokenJsonError(Exception):
    pass


def _parse_events_json(raw: str) -> list[dict]:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```[a-z]*\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise BrokenJsonError(f"{e} — raw: {cleaned[:200]!r}") from e
    if not isinstance(parsed, list):
        raise BrokenJsonError("レスポンスがリストではありません")
    return parsed


JSON_RETRY_INSTRUCTION = (
    "\n\n重要: 有効なJSONのみを返してください。前回の応答はJSONとして壊れていました。"
    "タイトル文字列内に二重引用符(\")が含まれる場合は必ず \\\" にエスケープしてください。"
)


def extract_events_from_text(text: str, venue: VenueConfig, claude: anthropic.Anthropic) -> tuple[list[dict], Optional[str], int]:
    truncated = text[:MAX_TEXT_CHARS]
    if len(text) > MAX_TEXT_CHARS:
        log.warning(f"  [{venue['name']}] ページ本文が{MAX_TEXT_CHARS:,}文字を超過したため切り詰めました"
                    f"({len(text):,}→{MAX_TEXT_CHARS:,})")

    base_prompt = EXTRACT_PROMPT.format(venue_name=venue["name"], text=truncated)
    t0 = time.monotonic()

    def call_claude(prompt: str) -> str:
        msg = claude.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    try:
        raw = call_claude(base_prompt)
        try:
            events = _parse_events_json(raw)
            return events, None, round((time.monotonic() - t0) * 1000)
        except BrokenJsonError as e:
            # 壊れたJSONの場合だけ、より厳格な指示を添えて1回だけ再試行する
            log.warning(f"  [{venue['name']}] Claude応答のJSON解析に失敗したため1回だけ再試行します: {e}")
            retry_raw = call_claude(base_prompt + JSON_RETRY_INSTRUCTION)
            try:
                events = _parse_events_json(retry_raw)
                return events, None, round((time.monotonic() - t0) * 1000)
            except BrokenJsonError as e2:
                elapsed_ms = round((time.monotonic() - t0) * 1000)
                return [], f"Claude抽出エラー(再試行後も壊れたJSON): {e2}", elapsed_ms
    except anthropic.APIError as e:
        elapsed_ms = round((time.monotonic() - t0) * 1000)
        return [], f"Claude APIエラー: {e}", elapsed_ms
    except Exception as e:
        elapsed_ms = round((time.monotonic() - t0) * 1000)
        return [], f"Claude抽出エラー: {e}", elapsed_ms


def prepare_rows(events: list[dict], venue: VenueConfig) -> list[dict]:
    valid_genres = {"kpop", "johnnys", "female_idol", "male_idol", "other"}
    rows = []
    for ev in events:
        title = (ev.get("title") or "").strip()
        if not title:
            continue
        date = ev.get("date") or None
        if date and not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            date = None
        genre = ev.get("genre", "other")
        if genre not in valid_genres:
            genre = "other"
        rows.append({
            "id": make_event_id(venue["id"], date, title),
            "title": title,
            "venue": venue["name"],
            "venue_id": venue["id"],
            "date": date,
            "genre": genre,
        })

    return rows


def normalize_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKC", title).strip()
    normalized = re.sub(r"[「」『』“”‘’\"']", "", normalized)
    return re.sub(r"\s+", " ", normalized)


def dedupe_rows(rows: list[dict]) -> list[dict]:
    """同一 venue_id / date / 正規化title の完全一致のみを重複とみなす"""
    seen: set[tuple[str, Optional[str], str]] = set()
    result = []
    for row in rows:
        key = (row["venue_id"], row["date"], normalize_title(row["title"]))
        if key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result


def upsert_events(rows: list[dict], sb) -> tuple[int, Optional[str]]:
    if not rows:
        return 0, None
    try:
        sb.table("events").upsert(rows, on_conflict="id").execute()
        return len(rows), None
    except Exception as e:
        return 0, f"DB保存エラー: {e}"


def find_duplicate_candidates(rows: list[dict], venue_id: str, sb) -> tuple[list[dict], Optional[str]]:
    if not rows:
        return [], None
    try:
        # 重複判定のみ、本番DBに残る旧venue_idエイリアスも含めて既存レコードを見る。
        # 新規保存(upsert_events)は常に正式ID(venue_id)で行われ、ここでは変更しない。
        alias_ids = get_venue_id_aliases(venue_id)
        response = sb.table("events").select("id,title,date,venue_id").in_("venue_id", alias_ids).execute()
        existing = response.data or []
        candidates = []
        for row in rows:
            normalized = normalize_title(row["title"])
            match = next((event for event in existing
                          if event.get("date") == row["date"]
                          and normalize_title(event.get("title") or "") == normalized), None)
            if match:
                candidates.append({
                    "extracted": {"title": row["title"], "date": row["date"]},
                    "existing": match,
                })
        return candidates, None
    except Exception as e:
        return [], f"重複候補取得エラー: {e}"


# ---------------------------------------------------------------------------
# 会場単位の処理
# ---------------------------------------------------------------------------

def process_venue(venue: VenueConfig, sb, claude: anthropic.Anthropic, executor: ThreadPoolExecutor,
                   dry_run: bool, now: Optional[datetime] = None) -> dict:
    t_venue0 = time.monotonic()
    unreachable_months: list[tuple[int, int]] = []
    config_anomaly = False

    if venue["type"] == "single_url":
        page = fetch_page(venue["url"])
        page["year"] = page["month"] = None
        apply_sanity_check(page)
        pages = [page]

    elif venue["type"] == "monthly_pattern":
        pages = []
        for year, month, url in generate_monthly_pages(venue, now):
            p = fetch_page(url)
            p["year"], p["month"] = year, month
            pages.append(p)
        config_anomaly = classify_monthly_404s(pages, now)
        for p in pages:
            apply_sanity_check(p)

    elif venue["type"] == "follow_month_links":
        crawl = follow_month_links(venue, now)
        pages = crawl["pages"]
        unreachable_months = crawl["unreachable_months"]

    else:
        raise AssertionError("disabledはprocess_venueに渡らない")

    successful_pages = [p for p in pages if p["html"] is not None]
    errors = [f"{p['url']}: {p['error']}" for p in pages if p.get("error")]
    if config_anomaly:
        errors.append("全対象月が404でした（URLパターン設定を確認してください）")

    # ページ別の空判定 + Claude抽出（同時実行数を制限）
    page_reports: list[dict] = []
    pending: list[tuple[dict, str]] = []
    for p in pages:
        if p["html"] is None:
            if p.get("status_kind") == "future_unpublished":
                label = "未来月未公開(404) - 正常"
            elif p["status"] == 404:
                label = "404エラー"
            elif p["status"] == "ERROR":
                label = f"取得エラー: {p.get('error')}"
            else:
                label = f"取得エラー: HTTP {p['status']}"
            page_reports.append({"page": p, "events": [], "status_label": label, "elapsed_ms": 0, "error": None})
            continue

        stripped = html_to_text(p["html"])
        if not page_has_event_content(stripped):
            page_reports.append({"page": p, "events": [], "status_label": "掲載情報なし", "elapsed_ms": 0, "error": None})
        else:
            pending.append((p, stripped))

    futures = {executor.submit(extract_events_from_text, stripped, venue, claude): p for p, stripped in pending}
    for future in futures:
        p = futures[future]
        events, err, elapsed_ms = future.result()
        page_reports.append({"page": p, "events": events, "status_label": f"{len(events)}件",
                              "elapsed_ms": elapsed_ms, "error": err})
        if err:
            errors.append(f"{p['url']}: {err}")

    order = {p["url"]: i for i, p in enumerate(pages)}
    page_reports.sort(key=lambda r: order.get(r["page"]["url"], 0))

    all_events = [ev for r in page_reports for ev in r["events"]]
    rows = prepare_rows(all_events, venue)
    rows = dedupe_rows(rows)

    duplicates: list[dict] = []
    saved = 0
    if dry_run:
        duplicates, dup_error = find_duplicate_candidates(rows, venue["id"], sb)
        if dup_error:
            errors.append(dup_error)
    else:
        saved, save_error = upsert_events(rows, sb)
        if save_error:
            errors.append(save_error)

    venue_elapsed_ms = round((time.monotonic() - t_venue0) * 1000)
    failed = (not successful_pages) or config_anomaly or any(
        any(marker in msg for marker in ("Claude", "JSON", "DB")) for msg in errors
    )

    return {
        "venue_id": venue["id"],
        "venue_name": venue["name"],
        "type": venue["type"],
        "page_reports": page_reports,
        "unreachable_months": unreachable_months,
        "all_events_count": len(all_events),
        "rows": rows,
        "duplicates": duplicates,
        "saved": saved,
        "errors": errors,
        "failed": failed,
        "elapsed_ms": venue_elapsed_ms,
    }


# ---------------------------------------------------------------------------
# メイン
# ---------------------------------------------------------------------------

def main() -> None:
    dry_run = DRY_RUN
    run_start = time.monotonic()
    now = datetime.now(ZoneInfo("Asia/Tokyo"))
    log.info("=" * 60)
    log.info(f"fetch_events.py 開始: {now.strftime('%Y-%m-%d %H:%M:%S')} / dry-run={dry_run}")
    log.info("=" * 60)

    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    total_saved = 0
    failed_venues: list[str] = []
    reports: list[dict] = []

    with ThreadPoolExecutor(max_workers=CLAUDE_CONCURRENCY) as executor:
        for i, venue in enumerate(VENUES, 1):
            log.info(f"[{i:02d}/{len(VENUES)}] {venue['name']} ({venue['type']})")

            if venue["type"] == "disabled":
                log.info(f"  disabled: {venue['reason']}")
                reports.append({"venue_id": venue["id"], "venue_name": venue["name"],
                                "type": "disabled", "skipped": True, "error": venue["reason"]})
                continue

            result = process_venue(venue, sb, claude, executor, dry_run, now)
            total_saved += result["saved"]
            if result["failed"]:
                failed_venues.append(venue["name"])

            for r in result["page_reports"]:
                p = r["page"]
                month_label = f"{p['year']}-{p['month']:02d}" if p.get("year") else "-"
                claude_suffix = f" (抽出{r['elapsed_ms']}ms)" if r["elapsed_ms"] else ""
                log.info(
                    f"    [{month_label}] {p['url']} HTTP={p['status']} "
                    f"({p.get('elapsed_ms', 0)}ms) 文字数={p['chars']:,} → {r['status_label']}{claude_suffix}"
                )
            if result["unreachable_months"]:
                labels = ", ".join(f"{y}-{m:02d}" for y, m in result["unreachable_months"])
                log.info(f"    未取得月(サイト未掲載): {labels}")

            log.info(
                f"  会場合計: 取得試行ページ={len(result['page_reports'])}"
                f" / 全期間抽出={result['all_events_count']} / 重複除外後保存予定={len(result['rows'])}"
                f" / DB保存={result['saved']} / 所要時間={result['elapsed_ms']:,}ms"
                f" / エラー={' | '.join(result['errors']) or 'なし'}"
            )
            if dry_run:
                titles = [row["title"] for row in result["rows"]]
                log.info(f"  抽出タイトル一覧: {json.dumps(titles, ensure_ascii=False)}")
                log.info(f"  重複候補: {json.dumps(result['duplicates'], ensure_ascii=False)}")

            reports.append({
                "venue_id": venue["id"],
                "venue_name": venue["name"],
                "type": venue["type"],
                "elapsed_ms": result["elapsed_ms"],
                "pages": [
                    {
                        "url": r["page"]["url"],
                        "year": r["page"].get("year"),
                        "month": r["page"].get("month"),
                        "status": r["page"]["status"],
                        "chars": r["page"]["chars"],
                        "fetch_elapsed_ms": r["page"].get("elapsed_ms", 0),
                        "claude_result": r["status_label"],
                        "claude_elapsed_ms": r["elapsed_ms"],
                    }
                    for r in result["page_reports"]
                ],
                "unreachable_months": [f"{y}-{m:02d}" for y, m in result["unreachable_months"]],
                "all_events_count": result["all_events_count"],
                "planned_saves": len(result["rows"]) if dry_run else None,
                "titles": [row["title"] for row in result["rows"]],
                "duplicate_candidates": result["duplicates"] if dry_run else None,
                "db_saved": result["saved"],
                "errors": result["errors"],
            })

            time.sleep(random.uniform(2.5, 4.5))

    total_elapsed_ms = round((time.monotonic() - run_start) * 1000)
    log.info("=" * 60)
    log.info(f"完了: {total_saved} 件保存 / 総実行時間={total_elapsed_ms:,}ms ({total_elapsed_ms / 1000:.1f}秒)")
    if failed_venues:
        log.warning(f"取得失敗 ({len(failed_venues)} 会場): {', '.join(failed_venues)}")
    if dry_run:
        log.info(f"dry-run 完了: 保存予定合計 {sum(r.get('planned_saves') or 0 for r in reports):,} 件 / DB書き込み 0 件")
        report_path = Path(__file__).parent / "fetch_events_dry_run_report.json"
        report_path.write_text(
            json.dumps({"generated_at": now.isoformat(), "reports": reports,
                        "failed": failed_venues, "total_elapsed_ms": total_elapsed_ms},
                       ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.info(f"詳細レポート: {report_path}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()

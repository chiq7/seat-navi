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
from datetime import date, datetime, timedelta
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
    "date": "公演日。元ページの表記のままで構いません（例: 2026-10-31 / 2026年10月31日 / 10/31 / 10.31）。不明なら null",
    "genre": "kpop | johnnys | female_idol | male_idol | other"
  }}
]

ジャンル分類:
- kpop: 韓国K-POPアーティスト（BTS, TWICE, aespa, SEVENTEEN 等）
- johnnys: ジャニーズ/STARTO系（Snow Man, SixTONES, King & Prince 等）
- female_idol: 日本女性アイドル（乃木坂46, AKB48, NiziU 等）
- male_idol: 日本男性アイドル（BE:FIRST, JO1, BOYS AND MEN 等）
- other: バンド, 演歌, クラシック, スポーツイベント, 展示会, 会議 等

複数日程の扱い（重要）:
- 同一公演が複数の日付で開催される場合（例: 10/31・11/1の2日間公演）、1つのオブジェクトに日付をまとめず、日付ごとに別々のオブジェクトとして出力してください。
- その際、titleは全ての日付で同じ文字列にしてください。
- 例:
  入力（ページ内テキストの一部）: "10.31 Sat 開場16:00/開演17:00　11.1 Sun 開場15:00/開演16:00　Mr.Children Tour 2026"
  出力:
  [
    {{ "title": "Mr.Children Tour 2026", "date": "10.31", "genre": "other" }},
    {{ "title": "Mr.Children Tour 2026", "date": "11.1", "genre": "other" }}
  ]

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


# ---------------------------------------------------------------------------
# 日付正規化（YYYY-MM-DD統一・複数日程の展開）
# ---------------------------------------------------------------------------

def is_valid_calendar_date(year: int, month: int, day: int) -> bool:
    try:
        date(year, month, day)
        return True
    except ValueError:
        return False


def reference_year_month(page_year: Optional[int], page_month: Optional[int],
                          now: Optional[datetime] = None) -> tuple[int, int]:
    """ページ固有の年月(monthly_pattern/follow_month_links)が無ければ、Asia/Tokyo基準のnow年月を使う"""
    if page_year is not None and page_month is not None:
        return page_year, page_month
    current = now_jst(now)
    return current.year, current.month


def nearest_year_for_month_day(month: int, day: int, ref_year: int, ref_month: int,
                                now: Optional[datetime] = None) -> int:
    """年なし月日(例: 10/31)の年を補完する。
    イベントカレンダーは常に前方(未来方向)へ掲載される前提で、
    「now基準で過去45日を超えない範囲での直近の未来」を最優先する。
    (例: 7月クロール時に単一ページ内の"1.11"が2027年1月を指す長期先行掲載でも、
     従来の「基準年月に最も近い年」判定だと誤って前年寄りの年を選んでしまうため)
    該当候補が無い場合のみ、従来通り基準年月(ref_year/ref_month)に最も近い年へフォールバックする。"""
    current = now_jst(now)
    now_date = current.date()
    grace = timedelta(days=45)
    ref_date = date(ref_year, ref_month, 1)

    best_future: Optional[tuple[int, date]] = None
    best_overall: Optional[tuple[int, int]] = None

    for y in (ref_year - 1, ref_year, ref_year + 1, ref_year + 2):
        if not is_valid_calendar_date(y, month, day):
            continue
        candidate = date(y, month, day)
        if candidate >= now_date - grace:
            if best_future is None or candidate < best_future[1]:
                best_future = (y, candidate)
        diff = abs((candidate - ref_date).days)
        if best_overall is None or diff < best_overall[1]:
            best_overall = (y, diff)

    if best_future is not None:
        return best_future[0]
    if best_overall is not None:
        return best_overall[0]
    return ref_year


_FULL_DATE_PATTERNS = [
    re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?"),
    re.compile(r"(\d{4})[./](\d{1,2})[./](\d{1,2})"),
    re.compile(r"(\d{4})-(\d{1,2})-(\d{1,2})"),
]
_EN_DATE_PATTERN = re.compile(r"\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b")
_EN_MONTHS: dict[str, int] = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
_NO_YEAR_PATTERNS = [
    re.compile(r"(\d{1,2})[./](\d{1,2})(?!\d)"),
    re.compile(r"(\d{1,2})\s*月\s*(\d{1,2})\s*日"),
]


def split_date_tokens(raw_date: Optional[str], page_year: Optional[int], page_month: Optional[int],
                       now: Optional[datetime] = None) -> list[str]:
    """Claude抽出のdate文字列から、含まれる日付を全て「YYYY-MM-DD」として抽出する。
    複数日程が1つの文字列にまとまっている場合(例: "10.31・11.1")も、それぞれ別の日付として返す。
    年なし月日は page_year/page_month（無ければ now基準のAsia/Tokyo年月）で年を補完する。
    無効な日付・解釈できない文字列は結果に含めない(呼び出し側で0件ならdate=Noneとして扱う)。"""
    if not raw_date:
        return []
    text = raw_date
    found: list[tuple[int, int, str]] = []  # (start, end, date_str)

    for pattern in _FULL_DATE_PATTERNS:
        for m in pattern.finditer(text):
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if is_valid_calendar_date(y, mo, d):
                found.append((m.start(), m.end(), f"{y:04d}-{mo:02d}-{d:02d}"))

    # 英語表記「Month D, YYYY」/「Month D YYYY」(4桁年つき。月名を限定して誤検出を防止)
    for m in _EN_DATE_PATTERN.finditer(text):
        month_num = _EN_MONTHS.get(m.group(1).lower())
        if not month_num:
            continue
        d, y = int(m.group(2)), int(m.group(3))
        if is_valid_calendar_date(y, month_num, d):
            found.append((m.start(), m.end(), f"{y:04d}-{month_num:02d}-{d:02d}"))

    # 消費済み範囲をマスクしてから、年なしの月日系(MM/DD, MM.DD, MM月DD日)を拾う
    masked = list(text)
    for start, end, _ in sorted(found, key=lambda t: -t[0]):
        for i in range(start, end):
            masked[i] = " "
    masked_text = "".join(masked)

    ref_year, ref_month = reference_year_month(page_year, page_month, now)
    for pattern in _NO_YEAR_PATTERNS:
        for m in pattern.finditer(masked_text):
            mo, d = int(m.group(1)), int(m.group(2))
            y = nearest_year_for_month_day(mo, d, ref_year, ref_month, now)
            if is_valid_calendar_date(y, mo, d):
                found.append((m.start(), m.end(), f"{y:04d}-{mo:02d}-{d:02d}"))

    found.sort(key=lambda t: t[0])
    result: list[str] = []
    for _, _, date_str in found:
        if date_str not in result:
            result.append(date_str)
    return result


def prepare_rows(events: list[dict], venue: VenueConfig, page_year: Optional[int] = None,
                  page_month: Optional[int] = None, now: Optional[datetime] = None,
                  source_url: str = "") -> tuple[list[dict], list[dict], list[dict]]:
    """Claude抽出結果(events)をEventRow行へ変換する。
    日付が1件も解釈できないイベントは行を作らずinvalid_datesへ回す(保存対象から除外)。
    1イベントから2件以上の日付が展開された場合はmulti_day_expansionsに記録する(調査用)。
    戻り値: (rows, invalid_dates, multi_day_expansions)"""
    valid_genres = {"kpop", "johnnys", "female_idol", "male_idol", "other"}
    rows: list[dict] = []
    invalid_dates: list[dict] = []
    multi_day_expansions: list[dict] = []

    for ev in events:
        title = (ev.get("title") or "").strip()
        if not title:
            continue
        genre = ev.get("genre", "other")
        if genre not in valid_genres:
            genre = "other"

        raw_date = ev.get("date")
        dates = split_date_tokens(raw_date, page_year, page_month, now)

        if not dates:
            # YYYY-MM-DDへ正規化できない(不明/無効)場合は保存対象にせず、invalid_datesとして報告する
            invalid_dates.append({
                "title": title, "venue": venue["name"], "venue_id": venue["id"],
                "raw_date": raw_date, "source_url": source_url,
            })
            continue

        if len(dates) > 1:
            multi_day_expansions.append({
                "title": title, "venue_id": venue["id"], "raw_date": raw_date,
                "expanded_dates": dates, "source_url": source_url,
            })

        for d in dates:
            rows.append({
                "id": make_event_id(venue["id"], d, title),
                "title": title,
                "venue": venue["name"],
                "venue_id": venue["id"],
                "date": d,
                "genre": genre,
            })

    return rows, invalid_dates, multi_day_expansions


def normalize_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKC", title).strip()
    normalized = re.sub(r"[「」『』“”‘’\"']", "", normalized)
    return re.sub(r"\s+", " ", normalized)


def normalize_title_ignoring_spacing(title: str) -> str:
    """同一venue_id+date時の第二判定用: normalize_title後にUnicode空白を全て除去した比較キー。
    「第123 回」と「第123回」のような空白の入り方だけが異なる表記揺れを同一視するために使う。
    normalize_title()自体の定義・保存するtitle自体は変更しない。"""
    return re.sub(r"\s+", "", normalize_title(title))


def dedupe_rows(rows: list[dict]) -> list[dict]:
    """同一 venue_id / date は、正規化title後さらに空白を除去した比較キーで重複とみなす"""
    seen: set[tuple[str, Optional[str], str]] = set()
    result = []
    for row in rows:
        key = (row["venue_id"], row["date"], normalize_title_ignoring_spacing(row["title"]))
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


def classify_against_existing(rows: list[dict], venue_id: str, sb) -> tuple[list[dict], list[dict], list[dict], Optional[str]]:
    """保存前に「会場IDエイリアス + date完全一致 + normalize_title(空白除去後)一致」で既存eventsと照合する。
    dry-run・本番upsertの両方の経路から共通で呼ばれる(本番でも書き込み前に必ず照合する)。

    戻り値: (new_rows, matched_existing, skipped_ambiguous, error)
      0件一致 → new_rows (現行make_event_idのidのまま新規保存対象)
      1件一致 → matched_existing (既存公演として扱い、保存対象から外す。既存idへの差し替えはしない=既存行は一切更新しない)
      2件以上 → skipped_ambiguous (どれを既存とするか自動選択せず、保存対象から外して要確認とする)
    """
    if not rows:
        return [], [], [], None
    try:
        alias_ids = get_venue_id_aliases(venue_id)
        response = sb.table("events").select("id,title,date,venue_id").in_("venue_id", alias_ids).execute()
        existing = response.data or []
    except Exception as e:
        # 既存照合ができない場合は安全側に倒し、この会場のどの行も新規/既存判定せず保留する(=保存しない)。
        return [], [], [], f"既存公演照合エラー(DB): {e}"

    new_rows: list[dict] = []
    matched_existing: list[dict] = []
    skipped_ambiguous: list[dict] = []

    for row in rows:
        normalized = normalize_title_ignoring_spacing(row["title"])
        matches = [
            event for event in existing
            if event.get("date") == row["date"] and normalize_title_ignoring_spacing(event.get("title") or "") == normalized
        ]

        if len(matches) == 0:
            new_rows.append(row)
        elif len(matches) == 1:
            match = matches[0]
            matched_existing.append({
                "extracted_title": row["title"],
                "existing_title": match.get("title"),
                "date": row["date"],
                "extracted_venue_id": row["venue_id"],
                "existing_venue_id": match.get("venue_id"),
                "existing_id": match.get("id"),
            })
        else:
            skipped_ambiguous.append({
                "extracted_title": row["title"],
                "date": row["date"],
                "extracted_venue_id": row["venue_id"],
                "matches": [
                    {"id": m.get("id"), "title": m.get("title"), "venue_id": m.get("venue_id")}
                    for m in matches
                ],
            })

    return new_rows, matched_existing, skipped_ambiguous, None


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
    # ページごとのyear/month(monthly_pattern/follow_month_links)を使って年なし日付を補完するため、
    # ページ単位でprepare_rowsを呼んでから連結する(single_urlはyear=month=Noneでnow基準補完になる)。
    rows: list[dict] = []
    invalid_dates: list[dict] = []
    multi_day_expansions: list[dict] = []
    for r in page_reports:
        page_rows, page_invalid, page_multi = prepare_rows(
            r["events"], venue, r["page"].get("year"), r["page"].get("month"), now, r["page"]["url"]
        )
        rows.extend(page_rows)
        invalid_dates.extend(page_invalid)
        multi_day_expansions.extend(page_multi)
    rows = dedupe_rows(rows)

    # dry-run・本番upsertの両方で、書き込み前に必ず既存公演と照合する。
    new_rows, matched_existing, skipped_ambiguous, classify_error = classify_against_existing(rows, venue["id"], sb)
    if classify_error:
        errors.append(classify_error)

    saved = 0
    if not dry_run:
        # 一致0件(new_rows)のみを保存する。一致1件(matched_existing)は既存行なので保存も更新もしない。
        # 一致2件以上(skipped_ambiguous)は自動判定せず保存しない。
        saved, save_error = upsert_events(new_rows, sb)
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
        "new_rows": new_rows,
        "matched_existing": matched_existing,
        "skipped_ambiguous": skipped_ambiguous,
        "invalid_dates": invalid_dates,
        "multi_day_expansions": multi_day_expansions,
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
    total_extracted = 0
    total_new_rows = 0
    total_matched_existing = 0
    total_skipped_ambiguous = 0
    total_invalid_dates = 0
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
            total_extracted += result["all_events_count"]
            total_new_rows += len(result["new_rows"])
            total_matched_existing += len(result["matched_existing"])
            total_skipped_ambiguous += len(result["skipped_ambiguous"])
            total_invalid_dates += len(result["invalid_dates"])
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
                f" / 全期間抽出={result['all_events_count']} / 新規保存予定={len(result['new_rows'])}"
                f" / 既存一致={len(result['matched_existing'])} / 要確認(複数一致)={len(result['skipped_ambiguous'])}"
                f" / 日付不明・無効(除外)={len(result['invalid_dates'])}"
                f" / DB保存={result['saved']} / 所要時間={result['elapsed_ms']:,}ms"
                f" / エラー={' | '.join(result['errors']) or 'なし'}"
            )
            if dry_run:
                titles = [row["title"] for row in result["rows"]]
                log.info(f"  抽出タイトル一覧: {json.dumps(titles, ensure_ascii=False)}")
                log.info(f"  既存一致(matched_existing): {json.dumps(result['matched_existing'], ensure_ascii=False)}")
                log.info(f"  要確認(skipped_ambiguous): {json.dumps(result['skipped_ambiguous'], ensure_ascii=False)}")
                log.info(f"  日付不明・無効のため除外(invalid_dates): {json.dumps(result['invalid_dates'], ensure_ascii=False)}")
                log.info(f"  複数日展開(multi_day_expansions): {json.dumps(result['multi_day_expansions'], ensure_ascii=False)}")

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
                "extracted_count": result["all_events_count"],
                "new_rows_count": len(result["new_rows"]),
                "matched_existing_count": len(result["matched_existing"]),
                "skipped_ambiguous_count": len(result["skipped_ambiguous"]),
                # 保存予定件数には new_rows のみを含める(既存一致・要確認は含めない)
                "planned_saves": len(result["new_rows"]) if dry_run else None,
                "titles": [row["title"] for row in result["rows"]],
                "matched_existing": result["matched_existing"],
                "skipped_ambiguous": result["skipped_ambiguous"],
                "invalid_dates_count": len(result["invalid_dates"]),
                "invalid_dates": result["invalid_dates"],
                "multi_day_expansions": result["multi_day_expansions"],
                "db_saved": result["saved"],
                "errors": result["errors"],
                "failed": result["failed"],
            })

            time.sleep(random.uniform(2.5, 4.5))

    total_elapsed_ms = round((time.monotonic() - run_start) * 1000)
    log.info("=" * 60)
    log.info(
        f"完了: {total_saved} 件保存 / 全期間抽出={total_extracted} / 新規={total_new_rows}"
        f" / 既存一致={total_matched_existing} / 要確認(複数一致)={total_skipped_ambiguous}"
        f" / 日付不明・無効(除外)={total_invalid_dates}"
        f" / 総実行時間={total_elapsed_ms:,}ms ({total_elapsed_ms / 1000:.1f}秒)"
    )
    if failed_venues:
        log.warning(f"取得失敗 ({len(failed_venues)} 会場): {', '.join(failed_venues)}")
    if dry_run:
        log.info(
            f"dry-run 完了: 全期間抽出合計={total_extracted:,} / 新規保存予定合計={total_new_rows:,}"
            f" / 既存一致合計={total_matched_existing:,} / 要確認(複数一致)合計={total_skipped_ambiguous:,}"
            f" / 日付不明・無効(除外)合計={total_invalid_dates:,}"
            f" / DB書き込み 0 件"
        )
        report_path = Path(__file__).parent / "fetch_events_dry_run_report.json"
        report_path.write_text(
            json.dumps({"generated_at": now.isoformat(), "reports": reports,
                        "failed": failed_venues, "total_elapsed_ms": total_elapsed_ms,
                        "total_extracted": total_extracted, "total_new_rows": total_new_rows,
                        "total_matched_existing": total_matched_existing,
                        "total_skipped_ambiguous": total_skipped_ambiguous,
                        "total_invalid_dates": total_invalid_dates},
                       ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.info(f"詳細レポート: {report_path}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()

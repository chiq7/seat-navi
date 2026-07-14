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
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional, TypedDict, Union
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


class DisabledVenue(TypedDict):
    id: str
    name: str
    type: Literal["disabled"]
    reason: str


VenueConfig = Union[SingleUrlVenue, MonthlyPatternVenue, DisabledVenue]

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
    {"id": "nissan-stadium", "name": "日産スタジアム", "type": "single_url", "url": "https://www.nissan-stadium.jp/calendar/"},
    # アリーナ（関東）
    {"id": "saitama-super-arena", "name": "さいたまスーパーアリーナ", "type": "single_url", "url": "https://www.saitama-arena.co.jp/schedule/"},
    {"id": "yokohama-arena", "name": "横浜アリーナ", "type": "single_url", "url": "https://www.yokohama-arena.co.jp/event"},
    {"id": "pia-arena-mm", "name": "ぴあアリーナMM", "type": "single_url", "url": "https://pia-arena-mm.jp/"},
    {"id": "ariake-arena", "name": "有明アリーナ", "type": "single_url", "url": "https://ariake-arena.tokyo/event/"},
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

MAX_TEXT_CHARS = 80_000  # Claude APIに送るテキストの上限
CLAUDE_MODEL = "claude-haiku-4-5-20251001"  # 低コスト・高速

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


def make_event_id(venue_id: str, date: Optional[str], title: str) -> str:
    raw = f"{venue_id}::{date or ''}::{title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


def generate_venue_urls(venue: VenueConfig, now: Optional[datetime] = None) -> list[str]:
    if venue["type"] == "disabled":
        return []
    if venue["type"] == "single_url":
        return [venue["url"]]

    current = now or datetime.now(ZoneInfo("Asia/Tokyo"))
    if current.tzinfo is None:
        current = current.replace(tzinfo=ZoneInfo("Asia/Tokyo"))
    else:
        current = current.astimezone(ZoneInfo("Asia/Tokyo"))
    urls = []
    for offset in range(-1, 13):
        month_index = current.year * 12 + current.month - 1 + offset
        year, zero_based_month = divmod(month_index, 12)
        month = zero_based_month + 1
        url = (venue["url_pattern"]
               .replace("{YYYYMM}", f"{year:04d}{month:02d}")
               .replace("{YYYY-MM}", f"{year:04d}-{month:02d}"))
        if url not in urls:
            urls.append(url)
    return urls


def fetch_page(url: str) -> dict:
    ua = random.choice(USER_AGENTS)
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=20, allow_redirects=True)
        resp.encoding = resp.apparent_encoding or "utf-8"
        if not resp.ok:
            return {"url": url, "status": resp.status_code, "html": None,
                    "chars": 0, "error": f"HTTP {resp.status_code}"}
        return {"url": url, "status": resp.status_code, "html": resp.text,
                "chars": len(resp.text), "error": None}
    except requests.RequestException as e:
        return {"url": url, "status": "ERROR", "html": None,
                "chars": 0, "error": str(e)}


def html_to_text(html: str) -> str:
    """HTMLからテキストを抽出し、不要な空白を整理する"""
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "meta", "link", "noscript",
                     "img", "svg", "iframe", "header", "footer", "nav"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return "\n".join(lines)


def extract_events(html: str, venue: VenueConfig, claude: anthropic.Anthropic) -> tuple[list[dict], Optional[str]]:
    text = html_to_text(html)
    truncated = text[:MAX_TEXT_CHARS]

    prompt = EXTRACT_PROMPT.format(venue_name=venue["name"], text=truncated)

    try:
        msg = claude.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()

        # コードブロックが含まれていた場合に除去
        raw = re.sub(r"^```[a-z]*\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        raw = raw.strip()

        # JSON配列の抽出（前後にテキストがある場合に対応）
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            raw = match.group(0)

        events = json.loads(raw)
        if not isinstance(events, list):
            raise ValueError("レスポンスがリストではありません")

        return events, None

    except json.JSONDecodeError as e:
        return [], f"JSONパースエラー: {e} — raw: {raw[:200]!r}"
    except anthropic.APIError as e:
        return [], f"Claude APIエラー: {e}"
    except Exception as e:
        return [], f"Claude抽出エラー: {e}"


def prepare_rows(events: list[dict], venue: VenueConfig) -> list[dict]:
    valid_genres = {"kpop", "johnnys", "female_idol", "male_idol", "other"}
    rows = []
    for ev in events:
        title = (ev.get("title") or "").strip()
        if not title:
            continue
        date = ev.get("date") or None
        # YYYY-MM-DD 形式かチェック
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


def upsert_events(rows: list[dict], sb) -> tuple[int, Optional[str]]:
    if not rows:
        return 0, None

    try:
        sb.table("events").upsert(rows, on_conflict="id").execute()
        return len(rows), None
    except Exception as e:
        return 0, f"DB保存エラー: {e}"


def normalize_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKC", title).strip()
    normalized = re.sub(r"[「」『』“”‘’\"']", "", normalized)
    return re.sub(r"\s+", " ", normalized)


def find_duplicate_candidates(rows: list[dict], venue_id: str, sb) -> tuple[list[dict], Optional[str]]:
    if not rows:
        return [], None
    try:
        response = sb.table("events").select("id,title,date").eq("venue_id", venue_id).execute()
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


def main() -> None:
    dry_run = DRY_RUN
    log.info("=" * 60)
    log.info(f"fetch_events.py 開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} / dry-run={dry_run}")
    log.info("=" * 60)

    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    total_saved = 0
    failed: list[str] = []
    reports: list[dict] = []

    for i, venue in enumerate(VENUES, 1):
        log.info(f"[{i:02d}/{len(VENUES)}] {venue['name']}")

        if venue["type"] == "disabled":
            log.info(f"  disabled: {venue['reason']}")
            reports.append({"venue_id": venue["id"], "venue_name": venue["name"],
                            "type": "disabled", "skipped": True, "error": venue["reason"]})
            continue

        urls = generate_venue_urls(venue)
        pages = [fetch_page(url) for url in urls]
        successful_pages = [page for page in pages if page["html"] is not None]
        errors = [f"{page['url']}: {page['error']}" for page in pages if page["error"]]
        html = "\n\n".join(page["html"] for page in successful_pages)

        events: list[dict] = []
        rows: list[dict] = []
        duplicates: list[dict] = []
        saved = 0
        if html:
            events, extract_error = extract_events(html, venue, claude)
            if extract_error:
                errors.append(extract_error)
            rows = prepare_rows(events, venue)
            if dry_run:
                duplicates, duplicate_error = find_duplicate_candidates(rows, venue["id"], sb)
                if duplicate_error:
                    errors.append(duplicate_error)
            else:
                saved, save_error = upsert_events(rows, sb)
                if save_error:
                    errors.append(save_error)

        if not successful_pages or any(error.startswith(("Claude", "JSON", "DB")) for error in errors):
            failed.append(venue["name"])
        total_saved += saved

        report = {
            "venue_id": venue["id"],
            "venue_name": venue["name"],
            "type": venue["type"],
            "page_count": len(successful_pages),
            "requested_page_count": len(urls),
            "http_statuses": [{"url": page["url"], "status": page["status"]} for page in pages],
            "fetched_chars": sum(page["chars"] for page in pages),
            "claude_extracted": len(events),
            "titles": [event.get("title") for event in events if event.get("title")],
            "duplicate_candidates": duplicates if dry_run else None,
            "planned_saves": len(rows) if dry_run else None,
            "db_saved": saved,
            "errors": errors,
        }
        reports.append(report)
        log.info(
            f"  HTTP={','.join(str(page['status']) for page in pages)} / "
            f"取得ページ={len(successful_pages)}/{len(urls)} / 文字数={report['fetched_chars']:,} / "
            f"Claude抽出={len(events)} / DB保存={saved} / エラー={' | '.join(errors) or 'なし'}"
        )
        if dry_run:
            log.info(f"  抽出タイトル: {json.dumps(report['titles'], ensure_ascii=False)}")
            log.info(f"  重複候補: {json.dumps(duplicates, ensure_ascii=False)}")
            log.info(f"  保存予定件数: {len(rows)}")

        # レート制限・ブロック回避のため待機
        time.sleep(random.uniform(2.5, 4.5))

    log.info("=" * 60)
    log.info(f"完了: {total_saved} 件保存")
    if failed:
        log.warning(f"取得失敗 ({len(failed)} 会場): {', '.join(failed)}")
    if dry_run:
        log.info(f"dry-run 完了: 保存予定合計 {sum(report.get('planned_saves') or 0 for report in reports)} 件 / DB書き込み 0 件")
    log.info("=" * 60)


if __name__ == "__main__":
    main()

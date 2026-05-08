#!/usr/bin/env python3
"""
fetch_events.py — 主要会場スケジュールページからコンサート/ライブ情報を取得しSupabaseに保存

使い方:
  cd seat-navi
  python scripts/fetch_events.py

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
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import anthropic
import requests
from bs4 import BeautifulSoup
from supabase import create_client

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

# --- ロギング設定 ---
log_path = Path(__file__).parent / "fetch_events.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_path, encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# --- 会場リスト ---
VENUES = [
    # ドーム
    {"id": "tokyo-dome",    "name": "東京ドーム",             "url": "https://www.tokyo-dome.co.jp/en/dome/event/schedule.html"},
    {"id": "kyocera-dome",  "name": "京セラドーム大阪",       "url": "https://www.kyoceradome-osaka.jp/schedule/"},
    {"id": "vantelin-dome", "name": "バンテリンドームナゴヤ", "url": "https://www.nagoya-dome.co.jp/sp/eventcalen.php"},
    {"id": "paypay-dome",   "name": "福岡PayPayドーム",       "url": f"https://www.softbankhawks.co.jp/stadium/event_schedule/{datetime.now().year}/"},
    {"id": "sapporo-dome",  "name": "札幌ドーム",             "url": "https://www.sapporo-dome.co.jp/schedule/"},
    {"id": "belluna-dome",  "name": "ベルーナドーム",         "url": "https://bellunadome.seibulions.co.jp/schedule/"},
    {"id": "zozo-marine",   "name": "ZOZOマリンスタジアム",   "url": "https://www.marines.co.jp/stadium/schedule/"},
    {"id": "koshien",       "name": "阪神甲子園球場",         "url": "https://koshien.hanshin.co.jp/event/"},
    # アリーナ（関東）
    {"id": "saitama-super-arena", "name": "さいたまスーパーアリーナ", "url": "https://www.saitama-arena.co.jp/schedule/"},
    {"id": "yokohama-arena",      "name": "横浜アリーナ",             "url": "https://www.yokohama-arena.co.jp/event"},
    {"id": "pia-arena-mm",        "name": "ぴあアリーナMM",           "url": "https://pia-arena-mm.jp/"},
    {"id": "ariake-arena",        "name": "有明アリーナ",             "url": "https://ariake-arena.com/schedule/"},
    {"id": "budokan",             "name": "日本武道館",               "url": "https://www.nipponbudokan.or.jp/schedule/"},
    {"id": "yoyogi",              "name": "代々木第一体育館",         "url": "https://www.jpnsport.go.jp/yoyogi/event/tabid/59/default.aspx"},
    {"id": "makuhari-messe",      "name": "幕張メッセ",               "url": "https://www.m-messe.co.jp/event/"},
    {"id": "k-arena",             "name": "Kアリーナ横浜",            "url": "https://k-arena.com/en/schedule/"},
    # アリーナ（関西・地方）
    {"id": "osaka-jo-hall",   "name": "大阪城ホール",               "url": "https://www.osaka-johall.com/event/"},
    {"id": "edion-arena",     "name": "大阪エディオンアリーナ",     "url": "https://www.furitutaiikukaikan.ne.jp/"},
    {"id": "marine-messe",    "name": "マリンメッセ福岡",           "url": "https://www.marinemesse.or.jp/messe/"},
    {"id": "miyagi-arena",    "name": "セキスイハイムスーパーアリーナ", "url": "https://www.mspf.jp/grande21/"},
    {"id": "hiroshima-arena", "name": "広島グリーンアリーナ",       "url": "https://h-jigyoudan.or.jp/sports-center/center-events/"},
    {"id": "gaishi-hall",     "name": "名古屋ガイシホール",         "url": "https://www.nespa.or.jp/hall/"},
    {"id": "toki-messe",      "name": "朱鷺メッセ",                 "url": "https://www.tokimesse.com/sp/visitor/event/index"},
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


def fetch_html(venue: dict) -> Optional[str]:
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
        resp = requests.get(venue["url"], headers=headers, timeout=20, allow_redirects=True)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or "utf-8"
        log.info(f"  HTTP {resp.status_code} ({len(resp.text):,} chars)")
        return resp.text
    except requests.HTTPError as e:
        log.warning(f"  HTTPエラー: {e.response.status_code} {venue['url']}")
        return None
    except requests.RequestException as e:
        log.warning(f"  取得失敗: {e}")
        return None


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


def extract_events(html: str, venue: dict, claude: anthropic.Anthropic) -> list[dict]:
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

        log.info(f"  Claude抽出: {len(events)} 件")
        return events

    except json.JSONDecodeError as e:
        log.warning(f"  JSONパースエラー: {e} — raw: {raw[:200]!r}")
        return []
    except anthropic.APIError as e:
        log.warning(f"  Claude APIエラー: {e}")
        return []
    except Exception as e:
        log.warning(f"  予期しないエラー: {e}")
        return []


def upsert_events(events: list[dict], venue: dict, sb) -> int:
    if not events:
        return 0

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

    if not rows:
        return 0

    try:
        sb.table("events").upsert(rows, on_conflict="id").execute()
        log.info(f"  Supabase upsert: {len(rows)} 件")
        return len(rows)
    except Exception as e:
        log.error(f"  Supabase upsertエラー: {e}")
        return 0


def main() -> None:
    log.info("=" * 60)
    log.info(f"fetch_events.py 開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info("=" * 60)

    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    total_saved = 0
    failed: list[str] = []

    for i, venue in enumerate(VENUES, 1):
        log.info(f"[{i:02d}/{len(VENUES)}] {venue['name']}")

        html = fetch_html(venue)
        if html is None:
            failed.append(venue["name"])
            time.sleep(2)
            continue

        events = extract_events(html, venue, claude)
        saved = upsert_events(events, venue, sb)
        total_saved += saved

        # レート制限・ブロック回避のため待機
        time.sleep(random.uniform(2.5, 4.5))

    log.info("=" * 60)
    log.info(f"完了: {total_saved} 件保存")
    if failed:
        log.warning(f"取得失敗 ({len(failed)} 会場): {', '.join(failed)}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()

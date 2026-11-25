"""Draw the share pictures (OGP, 1200x630 JPEG) for venue pages and shareable seat blocks.

usage (from the repository root):
  node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/og-images/manifest.mts > og-manifest.json
  python -I scripts/og-images/render.py og-manifest.json <version>
Writes public/og/venues/<venue>.jpg, public/og/seats/<venue>/<block>.jpg (blocks with photos; every K-Arena block),
src/data/ogImages.json (what exists, for the pages) and src/data/seatShareNames.json (block names for the share page).
Existing pictures are kept; pass --redraw to draw them all again (then change the version).
Only the seat drawing and text are used: fans' X photos are never put into these pictures.
Needs Python Playwright (Chromium) and network access for the Google font.
"""
import html, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
version = sys.argv[2]
PINK, NAVY = '#ef2d62', '#141a33'

CSS = """
@import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&display=block');
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;position:relative;font-family:'M PLUS Rounded 1c',sans-serif;color:#141a33;
  background:linear-gradient(120deg,#ffffff 0%,#fff5f8 55%,#ffe3ec 100%)}
.wave{position:absolute;inset:auto 0 0 0;height:240px}
.logo{position:absolute;left:58px;top:44px;display:flex;align-items:center;gap:14px;color:#ef2d62;font-weight:900;font-size:46px;letter-spacing:1px}
.left{position:absolute;left:62px;top:140px;width:520px;bottom:56px;display:flex;flex-direction:column}
.fit{white-space:nowrap}
.card{position:absolute;right:50px;top:60px;width:560px;height:510px;border-radius:30px;background:#fff;
  box-shadow:0 18px 40px rgba(170,40,80,.16),0 2px 6px rgba(170,40,80,.08);display:flex;align-items:center;justify-content:center;flex-direction:column;padding:26px}
.stage{width:200px;height:42px;border-radius:10px;background:#8a8fa8;color:#fff;font-weight:800;font-size:22px;letter-spacing:4px;display:grid;place-items:center;margin-bottom:10px}
.pill{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;padding:8px 22px;border-radius:999px;font-weight:900}
.under{background:linear-gradient(transparent 70%,#ffc7d7 70%)}
"""
LOGO = f"""<div class="logo"><svg width="70" height="52" viewBox="0 0 70 52"><g transform="rotate(-12 35 26)"><rect x="4" y="8" width="62" height="36" rx="8" fill="{PINK}"/>
<circle cx="4" cy="26" r="6" fill="#fff"/><circle cx="66" cy="26" r="6" fill="#fff"/><path d="M48 12v28" stroke="#fff" stroke-width="3" stroke-dasharray="4 4"/>
<path d="M26 16l3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1z" fill="#fff"/></g></svg>ちけレポ</div>"""
WAVE = '<svg class="wave" viewBox="0 0 1200 240" preserveAspectRatio="none"><path d="M0 240V170C300 120 620 210 1200 60V240Z" fill="#ffd9e5" opacity=".55"/><path d="M0 240V205C380 170 760 230 1200 130V240Z" fill="#ffc2d4" opacity=".6"/></svg>'
FIT = """<script>for (const el of document.querySelectorAll('.fit')) { let s = parseFloat(getComputedStyle(el).fontSize); const max = +el.dataset.max;
  while (el.scrollWidth > max && s > 18) { s -= 1; el.style.fontSize = s + 'px'; } }</script>"""
PIN = '<path d="M0-46c-14 0-25 11-25 25 0 19 25 43 25 43s25-24 25-43c0-14-11-25-25-25z" fill="{pink}" stroke="#fff" stroke-width="5"/><circle cy="-21" r="9" fill="#fff"/>'

def seatmap(venue, selected=None):
    vb = venue['viewBox']; pad = max(vb[2], vb[3]) * .03
    unit = max(vb[2], vb[3]) / 520  # one screen pixel in map units (the card is ~520px)
    paths = []
    for b in venue['blocks']:
        if b['id'] == selected: continue
        fill = '#eedfe6' if selected else b['color']
        paths.append(f'<path d="{b["path"]}" fill="{fill}" stroke="#fff" stroke-width="{1.2 * unit:.2f}" fill-rule="evenodd"/>')
    extra = ''
    if selected:
        sel = next(b for b in venue['blocks'] if b['id'] == selected)
        # A white halo and a thick outline keep even a thin block visible at this size.
        paths.append(f'<path d="{sel["path"]}" fill="none" stroke="#fff" stroke-width="{14 * unit:.2f}" stroke-linejoin="round"/>')
        paths.append(f'<path d="{sel["path"]}" fill="{PINK}" stroke="{PINK}" stroke-width="{6 * unit:.2f}" stroke-linejoin="round" fill-rule="evenodd"/>')
        x, y = sel['center']
        # The pin stands just above the block (its tip on the block's centre), so it never hides the block.
        extra = f'<g transform="translate({x} {y - 30 * unit:.1f}) scale({unit * .95:.3f})">{PIN.format(pink=PINK)}</g>'
    box = f'{vb[0] - pad} {vb[1] - pad - (60 * unit if selected else 0)} {vb[2] + 2 * pad} {vb[3] + 2 * pad + (60 * unit if selected else 0)}'
    height = 400 if venue['stageUp'] else 450
    return f'<svg viewBox="{box}" width="500" height="{height}" preserveAspectRatio="xMidYMid meet">{"".join(paths)}{extra}</svg>'

def page(left, venue, selected=None):
    stage = '<div class="stage">STAGE</div>' if venue['stageUp'] else ''
    return f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body>{WAVE}{LOGO}<div class="left">{left}</div><div class="card">{stage}{seatmap(venue, selected)}</div>{FIT}</body>'

def venue_left(v):
    count = f'<span style="color:{PINK}">{v["photos"]}枚</span>' if v['photos'] >= 20 else ''
    return (f'<div class="fit" data-max="520" style="font-size:58px;font-weight:900;line-height:1.25">{html.escape(v["name"])}</div>'
            f'<div style="font-size:150px;font-weight:900;line-height:1.1;letter-spacing:-4px;margin-top:8px">座席表</div>'
            f'<div class="fit" data-max="520" style="margin-top:auto;font-size:40px;font-weight:900"><span class="under">席からの見え方写真</span> {count}</div>')

def seat_left(v, s):
    level, *rest = s['title'].split('・')
    short = s['short'].split('・')[0]
    note = '写真あり　この席からの見え方' if s['photos'] else 'この席の場所'
    return (f'<div class="fit" data-max="520" style="font-size:44px;font-weight:900;line-height:1.25">{html.escape(v["name"])}</div>'
            f'<div class="pill" style="margin-top:22px;background:{NAVY};color:#fff;font-size:34px">{html.escape(level)}</div>'
            f'<div class="fit" data-max="520" style="font-size:118px;font-weight:900;line-height:1.1;letter-spacing:-2px;margin-top:8px">{html.escape(short)}</div>'
            f'<div style="font-size:38px;font-weight:800;color:#5a5f78">{html.escape(s["rows"])}</div>'
            f'<div class="pill" style="margin-top:auto;background:#ffe3ec;color:{PINK};font-size:30px">{note}</div>')

venues_out = ROOT / 'public/og/venues'; venues_out.mkdir(parents=True, exist_ok=True)
seats_done = {}
with sync_playwright() as p:
    browser = p.chromium.launch(); tab = browser.new_page(viewport={'width': 1200, 'height': 630})
    def shoot(markup, path):
        tab.set_content(markup, wait_until='networkidle'); tab.evaluate('document.fonts.ready'); tab.wait_for_timeout(80)
        tab.screenshot(path=str(path), type='jpeg', quality=86)
    for v in manifest['venues']:
        target = venues_out / f'{v["id"]}.jpg'
        if not target.exists() or '--redraw' in sys.argv: shoot(page(venue_left(v), v), target)
    for venue_id, blocks in manifest['seats'].items():
        v = next(x for x in manifest['venues'] if x['id'] == venue_id)
        out = ROOT / 'public/og/seats' / venue_id; out.mkdir(parents=True, exist_ok=True)
        drawn = [s for s in blocks if s['photos'] or venue_id == 'k-arena']
        for s in drawn:
            target = out / f'{s["id"]}.jpg'
            if not target.exists() or '--redraw' in sys.argv: shoot(page(seat_left(v, s), v, s['id']), target)
        seats_done[venue_id] = [s['id'] for s in drawn]
    browser.close()
(ROOT / 'src/data/ogImages.json').write_text(json.dumps({'version': version, 'venues': [v['id'] for v in manifest['venues']],
    'shareDiagrams': {v['id']: v['diagram'] for v in manifest['venues']}, 'seats': seats_done}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
names = {v['id']: {'name': v['name'], 'mode': v['mode'], 'blocks': {s['id']: s['title'] for s in manifest['seats'][v['id']]}} for v in manifest['venues']}
(ROOT / 'src/data/seatShareNames.json').write_text(json.dumps(names, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('venues', len(manifest['venues']), 'seats', sum(len(x) for x in seats_done.values()))

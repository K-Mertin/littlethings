#!/usr/bin/env python3
"""Build the hall's mini-game list for MW 大街 from minigames/index.html.

Usage (from the repo root, with a local server running there):
  python3 -m http.server 8765 &
  python3 street/tools/build_minigames.py http://localhost:8765/minigames/index.html street/assets

Writes:
  minigames.json        [{id, name, cat, desc}]  (cat = react | puzzle | play)
  minigames-atlas.webp  8 x N grid of 256x160 thumbnails (the cards' own SVG art)
Needs: pip install playwright pillow  (and a Chromium for playwright)
"""
import sys, json, asyncio, io, re, os
from playwright.async_api import async_playwright
from PIL import Image

URL, OUT = sys.argv[1], sys.argv[2]
TW, TH, COLS = 256, 160, 8

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': TW * COLS, 'height': 1200})
        await pg.goto(URL)
        await pg.wait_for_timeout(1500)
        games = await pg.evaluate("""() => {
          const out = [];
          for (const sec of document.querySelectorAll('section')) {
            for (const a of sec.querySelectorAll('a.g')) {
              const id = a.getAttribute('href').replace('.html', '');
              if (out.find(g => g.id === id)) continue;
              const t = a.querySelector('.t');
              const svg = a.querySelector('svg');
              out.push({ id, name: t ? t.innerText.split('\\n')[0].trim() : id, desc: a.title || '', svg: svg ? svg.outerHTML : '' });
            }
          }
          return out;
        }""")
        cats = await pg.evaluate("""() => { const m = {}; for (const g of (window.GAMES || [])) m[g.id] = g.cat; return m; }""")
        if not cats:  # GAMES is a script-level const: read it from the page source instead
            src = await pg.content()
            for m in re.finditer(r"\{ id: '([\w-]+)', cat: '(\w+)'", src): cats[m.group(1)] = m.group(2)
        # render all thumbnails in one grid and screenshot it
        rows = (len(games) + COLS - 1) // COLS
        html = '<html><body style="margin:0;background:#fff"><div style="display:grid;grid-template-columns:repeat(%d,%dpx);grid-auto-rows:%dpx">' % (COLS, TW, TH)
        html += ''.join('<div style="width:%dpx;height:%dpx;overflow:hidden">%s</div>' % (TW, TH, g['svg'].replace('<svg ', f'<svg width="{TW}" height="{TH}" preserveAspectRatio="xMidYMid slice" ', 1)) for g in games)
        html += '</div></body></html>'
        await pg.set_viewport_size({'width': TW * COLS, 'height': TH * rows})
        await pg.set_content(html)
        await pg.wait_for_timeout(500)
        png = await pg.screenshot(clip={'x': 0, 'y': 0, 'width': TW * COLS, 'height': TH * rows})
        Image.open(io.BytesIO(png)).convert('RGB').save(os.path.join(OUT, 'minigames-atlas.webp'), 'WEBP', quality=88, method=6)
        def short(d):
            parts = re.split(r'(?<=[！。!？])', d)
            out = ''
            for p in parts:
                if len(out) >= 14: break
                out += p
            out = out.strip()
            return out if len(out) <= 48 else out[:46] + '…'
        data = [{'id': g['id'], 'name': g['name'], 'cat': cats.get(g['id'], 'play'), 'desc': short(g['desc'])} for g in games]
        json.dump(data, open(os.path.join(OUT, 'minigames.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
        print(len(data), 'games', {c: sum(1 for g in data if g['cat'] == c) for c in set(g['cat'] for g in data)})
        await b.close()

asyncio.run(main())

// Bakes every texture in textures.js to WebP files in assets/tex/ (hi = 1024 px for desktops,
// lo = 512 px for phones), plus assets/tex/index.json listing them. Uses Chromium via Playwright to
// run the generator and encode WebP.
//   node cobblekeep/tools/bake-textures.cjs [http://localhost:PORT/cobblekeep/tools/texbake.html] [name ...]
// Serve the repo root over HTTP first (e.g. python3 -m http.server).
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const OUT = path.join(__dirname, '..', 'assets', 'tex');
(async () => {
  const url = process.argv[2] || 'http://localhost:8000/cobblekeep/tools/texbake.html', only = process.argv.slice(3);
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}); const p = await b.newPage(); await p.goto(url); await p.waitForFunction(() => window.READY);
  const names = await p.evaluate(() => TEX.NAMES), manPath = path.join(OUT, 'index.json'), man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath)) : {};
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of names) {
    if (only.length && !only.includes(name)) continue;
    const t0 = Date.now();
    for (const [lod, N] of [['hi', 1024], ['lo', 512]]) {
      const r = await p.evaluate(([name, N]) => { const R = TEX.render(name, N), half = document.createElement('canvas'); half.width = half.height = N / 2; half.getContext('2d').drawImage(R.r, 0, 0, N / 2, N / 2);
        return { c: R.c.toDataURL('image/webp', .86), n: R.n.toDataURL('image/webp', .9), r: half.toDataURL('image/webp', .8), e: R.e && R.e.toDataURL('image/webp', .85), wall: R.wall }; }, [name, N]);
      for (const k of ['c', 'n', 'r', 'e']) if (r[k]) fs.writeFileSync(path.join(OUT, `${name}.${lod}.${k}.webp`), Buffer.from(r[k].split(',')[1], 'base64'));
      man[name] = { e: !!r.e, wall: r.wall };
    }
    console.log(name, Date.now() - t0, 'ms');
  }
  fs.writeFileSync(manPath, JSON.stringify(man));
  await b.close();
})();

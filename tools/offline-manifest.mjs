// 產生 offline/manifest.json（索引）和 offline/packs/<遊戲>.json（完整清單）：每款遊戲離線版要存的檔案（路徑、雜湊、大小）和外部套件網址。
// Cloudflare 每次部署前會自動跑（wrangler.jsonc 的 build.command），所以遊戲改了、加了新遊戲都不用手動更新。
// 本機：node tools/offline-manifest.mjs
// 這支程式出錯也不能讓部署失敗：任何錯誤都只印出來，最後一律 exit 0。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'offline', 'manifest.json');
// 這些遊戲不做離線包：遊戲小屋有自己的離線機制；兩個多人專區本來就要網路
const SKIP = new Set(['minigames', 'party', 'link']);
const SKIP_DIRS = new Set(['tools', 'src', 'node_modules', '.wrangler', '.git', '.worktrees']);
const SKIP_FILE = /(^\.|\.md$|\.zip$|\.py$|\.sh$|\.mjs\.map$|^hall_shot\.jpg$)/i;
const CODE = /\.(html|js|mjs|css|json|webmanifest)$/i;

const sha = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
function walk(dir, rel, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(path.join(dir, e.name), rel + e.name + '/', out); }
    else if (e.isFile() && !SKIP_FILE.test(e.name)) out.push(rel + e.name);
  }
  return out;
}
function entry(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  return [rel, sha(buf), buf.length];
}
// 外部套件：程式裡寫死的 jsdelivr／unpkg 網址，加上 importmap 的 three/addons/… 子模組
function cdnOf(files) {
  const urls = new Set();
  let addons = null;
  const texts = files.filter(f => CODE.test(f)).map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  for (const t of texts) {
    for (const m of t.matchAll(/https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)\/[^\s"'`()<>\\]+/g)) {
      const u = m[0].replace(/[.,;]+$/, '');
      if (u.endsWith('/')) { if (/three\/addons\/?$|examples\/jsm\/$/.test(u) || t.includes('"three/addons/"')) addons = addons || u; continue; }
      if (!u.includes('${')) urls.add(u);
    }
    const map = t.match(/"three\/addons\/"\s*:\s*"([^"]+)"/);
    if (map) addons = map[1];
  }
  if (addons) for (const t of texts) for (const m of t.matchAll(/['"]three\/addons\/([^'"]+\.js)['"]/g)) urls.add(addons + m[1]);
  return [...urls].sort();
}
function pack(name, files) {
  const list = files.map(entry);
  const cdn = cdnOf(files);
  const v = sha(Buffer.from(list.map(x => x[0] + ':' + x[1]).join('\n') + '\n' + cdn.join('\n')));
  return { name, v, size: list.reduce((a, x) => a + x[2], 0), files: list, cdn };
}

try {
  const hall = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const games = {};
  for (const m of hall.matchAll(/<a class="game[^"]*" href="([^"\/]+)\/index\.html">([\s\S]*?)<\/a>/g)) {
    const slug = m[1];
    if (SKIP.has(slug) || !fs.existsSync(path.join(ROOT, slug))) continue;
    const name = ((m[2].match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || slug).replace(/<[^>]+>/g, '').trim();
    try { games[slug] = pack(name, walk(path.join(ROOT, slug), slug + '/', [])); } catch (e) { console.log('offline-manifest: skip', slug, e.message); }
  }
  // 大廳本身：首頁、小幫手、圖示、每張卡片的截圖
  const hallFiles = ['index.html', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'offline/offline.js']
    .concat(fs.existsSync(path.join(ROOT, 'helper')) ? walk(path.join(ROOT, 'helper'), 'helper/', []) : [])
    .concat([...hall.matchAll(/<img src="([^"]+\/hall_shot\.jpg)"/g)].map(m => m[1]))
    .filter(f => fs.existsSync(path.join(ROOT, f)));
  // manifest.json 只放小索引（每頁都會抓）；完整檔案清單分開放 offline/packs/<遊戲>.json，要下載時才抓
  const all = Object.assign({ hall: pack('遊戲大廳', hallFiles) }, games);
  const brief = g => ({ name: g.name, v: g.v, size: g.size });
  const out = { built: new Date().toISOString(), hall: brief(all.hall), games: Object.fromEntries(Object.entries(games).map(([k, g]) => [k, brief(g)])) };
  const PACKS = path.join(path.dirname(OUT), 'packs');
  fs.rmSync(PACKS, { recursive: true, force: true });
  fs.mkdirSync(PACKS, { recursive: true });
  for (const [k, g] of Object.entries(all)) fs.writeFileSync(path.join(PACKS, k + '.json'), JSON.stringify({ v: g.v, files: g.files, cdn: g.cdn }));
  fs.writeFileSync(OUT, JSON.stringify(out));
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  console.log(`offline-manifest: ${Object.keys(games).length} games → ${path.relative(ROOT, OUT)}`);
  for (const [k, g] of Object.entries(games)) console.log(`  ${k.padEnd(11)} ${String(g.files.length).padStart(5)} files ${mb(g.size).padStart(9)}  cdn ${g.cdn.length}`);
} catch (e) {
  console.log('offline-manifest: failed (deploy continues without offline packs):', e && e.message);
}
process.exit(0);

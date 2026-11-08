// 版本號與更新紀錄（release notes）
//
// 每款遊戲：<遊戲>/releases.json；大廳自己的：根目錄 releases.json。格式（新的在最前面）：
//   [{ "v": "1.4.0", "at": "2026-11-08T09:30Z", "notes": ["新增第 6 段", "九九翻翻樂"] }, …]
//
// 用法：
//   node tools/release.mjs <遊戲|hall> <minor|patch|major> "更新內容" ["更新內容" …]
//       在最前面加一筆，版本自動往上加。遊戲小屋（minigames）的版本直接讀 minigames/mini.js 的 VERSION，第二個參數照填但不使用。
//       新內容（新關卡、新玩法、新功能）→ minor；修 bug、調整、補語音 → patch；整個改版 → major。
//   node tools/release.mjs --check
//       檢查哪些遊戲改了程式卻沒有加更新紀錄（最後一個非合併 commit 比最新一筆紀錄晚 30 分鐘以上）。有的話 exit 1。
//   node tools/release.mjs --build
//       部署時自動跑（wrangler.jsonc 的 build.command）：產生 /whatsnew.json 給大廳用。出錯不會擋部署。
//
// 大廳顯示的版本 = 大廳自己最新的版本，第三碼再加上「之後每一筆遊戲更新」的數量。
// 所以任何一款遊戲加了更新紀錄，大廳版本就會自動往上跳，不用另外改大廳。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rel = p => path.join(ROOT, p);
const fileOf = slug => slug === 'hall' ? rel('releases.json') : rel(slug + '/releases.json');
const read = slug => { try { return JSON.parse(fs.readFileSync(fileOf(slug), 'utf8')); } catch { return []; } };
const write = (slug, list) => fs.writeFileSync(fileOf(slug), JSON.stringify(list, null, 1) + '\n');
const vnum = v => String(v || '0.0.0').split('.').map(Number);
const cmpv = (a, b) => { const x = vnum(a), y = vnum(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const bump = (v, kind) => { const [a, b, c] = vnum(v); return kind === 'major' ? `${a + 1}.0.0` : kind === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`; };
const nowZ = () => new Date().toISOString().slice(0, 16) + 'Z';

// 大廳卡片：slug 和名稱（順序就是大廳的順序）
function cards() {
  const hall = fs.readFileSync(rel('index.html'), 'utf8');
  const out = [];
  for (const m of hall.matchAll(/<a class="game[^"]*" href="([a-z0-9]+)\/index\.html"[^>]*>([\s\S]*?)<\/a>/g)) {
    const name = ((m[2].match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || m[1]).replace(/<[^>]+>/g, '').trim();
    out.push({ slug: m[1], name });
  }
  return out;
}
const mgVersion = () => { try { return (fs.readFileSync(rel('minigames/mini.js'), 'utf8').match(/VERSION = '([\d.]+)'/) || [])[1]; } catch { return null; } };

function add(slug, kind, notes) {
  if (!slug || !['major', 'minor', 'patch'].includes(kind) || !notes.length) {
    console.error('用法：node tools/release.mjs <遊戲|hall> <minor|patch|major> "更新內容" …'); process.exit(2);
  }
  if (slug !== 'hall' && !fs.existsSync(rel(slug))) { console.error('找不到資料夾 ' + slug); process.exit(2); }
  const list = read(slug);
  // 大廳：從「目前顯示的版本」（含之後的遊戲更新）往上加，版本才不會倒退
  let v = bump(slug === 'hall' ? hallVersion() : list[0] ? list[0].v : '0.0.0', list[0] ? kind : 'major');
  if (slug === 'minigames') {
    v = mgVersion();
    if (list[0] && cmpv(v, list[0].v) <= 0) { console.error(`minigames/mini.js 的 VERSION（${v}）要先往上加`); process.exit(2); }
  }
  list.unshift({ v, at: nowZ(), notes });
  write(slug, list);
  console.log(`${slug} → v${v}`);
}

function lastCodeChange(paths) {
  try {
    const out = execFileSync('git', ['log', '-1', '--no-merges', '--format=%aI', '--', ...paths], { cwd: ROOT, encoding: 'utf8' }).trim();
    return out ? new Date(out) : null;
  } catch { return null; }
}
function check() {
  const bad = [];
  const ex = s => [`:(exclude)${s}/releases.json`, `:(exclude)${s}/hall_shot.jpg`, `:(exclude)${s}/*.md`, `:(exclude)${s}/tools`];
  const targets = cards().map(c => ({ slug: c.slug, paths: [c.slug, ...ex(c.slug)] }));
  targets.push({ slug: 'hall', paths: ['index.html', 'helper', 'sw.js', 'offline/offline.js'] });
  for (const t of targets) {
    const list = read(t.slug);
    if (!list.length) { bad.push(`${t.slug}：沒有 releases.json`); continue; }
    const code = lastCodeChange(t.paths);
    if (code && code - new Date(list[0].at) > 30 * 60e3) bad.push(`${t.slug}：${code.toISOString().slice(0, 16)} 改過，但最新的更新紀錄是 ${list[0].at}（v${list[0].v}）`);
  }
  const mg = mgVersion(), mgl = read('minigames')[0];
  if (mg && mgl && mg !== mgl.v) bad.push(`minigames：mini.js 是 v${mg}，releases.json 最新是 v${mgl.v}`);
  if (bad.length) { console.log('這些還沒有更新紀錄（node tools/release.mjs <遊戲> <minor|patch> "內容"）：\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log('版本與更新紀錄都對得上。');
}

function hallVersion() {
  const base = read('hall')[0] || { v: '1.0.0', at: '2000-01-01T00:00Z' };
  let after = 0;
  for (const c of cards()) after += read(c.slug).filter(r => r.at > base.at).length;
  const [a, b, c] = vnum(base.v);
  return `${a}.${b}.${c + after}`;
}
function build() {
  const hallList = read('hall');
  const base = hallList[0] || { v: '1.0.0', at: '2000-01-01T00:00Z' };
  const games = {}, feed = [];
  for (const c of cards()) {
    const list = read(c.slug);
    if (!list.length) continue;
    games[c.slug] = { name: c.name, v: list[0].v, at: list[0].at, list: list.slice(0, 20) };
    for (const r of list) feed.push({ slug: c.slug, name: c.name, ...r });
  }
  for (const r of hallList) feed.push({ slug: 'hall', name: '遊戲大廳', ...r });
  feed.sort((a, b) => b.at.localeCompare(a.at));
  const out = { built: nowZ(), hall: { v: hallVersion(), at: feed[0] ? feed[0].at : base.at }, games, feed: feed.slice(0, 80) };
  fs.writeFileSync(rel('whatsnew.json'), JSON.stringify(out));
  console.log(`release: 大廳 v${out.hall.v}，${Object.keys(games).length} 款遊戲有更新紀錄 → whatsnew.json`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === '--check') check();
else if (cmd === '--build') { try { build(); } catch (e) { console.log('release: 產生 whatsnew.json 失敗（部署照常）：', e && e.message); } process.exit(0); }
else add(cmd, rest[0], rest.slice(1));

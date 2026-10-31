// 大軍對決模擬：node siege/tools/clashsim.js [policy=smart|lazy|center] [runs] [stages=1-6] [up]
// 環境變數 K='{"kill":0.6}' 可以試平衡係數（CL_K）
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, localStorage: { getItem() { return null; }, setItem() { } } };
vm.createContext(ctx);
vm.runInContext(['core.js', 'levels.js', 'game.js', 'defense.js', 'clash.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') +
  '\n;this.api={newClash,clashStep,clLaunchCharge,clColX,clFrontAt,CSTAGES,CL_K,CL_NC,CL_COR,get G(){return G}};', ctx);
const A = ctx.api;
if (process.env.K) Object.assign(A.CL_K, JSON.parse(process.env.K));
// FEED='[30,38,…]' 試每關紅軍的量
if (process.env.FEED) JSON.parse(process.env.FEED).forEach((v, i) => { if (v && A.CSTAGES[i]) A.CSTAGES[i].feed = v; });
const policy = process.argv[2] || 'smart', runs = +(process.argv[3] || 5);
const [s0, s1] = (process.argv[4] || '1-' + A.CSTAGES.length).split('-').map(Number);
const upL = +(process.argv[5] || 0);
const NC = A.CL_NC;

function corridorN(G, side) {
  const col = side < 0 ? 0 : NC - 1;
  let n = G.squadN;
  const gs = G.gates.filter(g => g.side === side).sort((a, b) => a.z - b.z);
  for (const g of gs) { if (g.z >= G.f[col] - 0.2) break; if (g.k === 'add') n += g.v; else if (g.k === 'mul') n *= g.v; else if (g.k === 'kill' && g.shut) return 0; }
  return n;
}
function decide(G) {
  const urg = c => 1 + 12 / (G.f[c] + 2) + Math.max(0, G.r[c] - G.b[c] * G.pow) / 40 + (G.surge && Math.abs(G.surge.c - c) <= 1 ? 2 : 0);
  let avg = 0; for (let c = 0; c < NC; c++) avg += urg(c) / NC;
  let best = -1, bx = 0;
  for (const side of [-1, 1]) {
    const v = corridorN(G, side) * (urg(side < 0 ? 0 : NC - 1) * 0.6 + avg * 0.4);
    if (v > best) { best = v; bx = side * A.CL_COR; }
  }
  for (let c = 0; c < NC; c++) {
    const x = A.clColX(c), m = G.mid;
    const hitMid = Math.abs(m.x - x) <= m.w * 0.8 && m.z < A.clFrontAt(G.f, m.x) - 0.2;
    const v = (G.squadN + (hitMid ? m.v : 0)) * (urg(c) * 0.7 + avg * 0.3);
    if (v > best) { best = v; bx = x; }
  }
  return bx;
}

let all = { w: 0, n: 0 };
for (let s = s0; s <= s1; s++) {
  let w = 0, tt = 0, cs = 0, bl = 0;
  for (let r = 0; r < runs; r++) {
    A.newClash(s, { sim: true, up: { rate: upL, wall: upL, power: upL, giant: upL } });
    let G = A.G, t = 0, tx = 0, thinkT = 0;
    while (G.st !== 'win' && G.st !== 'lost' && t < 400) {
      thinkT -= 1 / 60;
      if (thinkT <= 0) {
        thinkT = policy === 'lazy' ? 3 : 0.4;
        if (policy === 'center') tx = 0;
        else if (policy === 'lazy') tx = [-A.CL_COR, A.CL_COR, 0, -1.5, 1.5][Math.floor(Math.random() * 5)];
        else tx = decide(G);
      }
      if (policy !== 'center') A.clLaunchCharge();
      A.clashStep(1 / 60, { abs: tx });
      G = A.G; t += 1 / 60;
    }
    if (G.st === 'win') { w++; cs += G.castle / G.castleMax; } else bl += G.base.hp / G.base.max;
    tt += t;
  }
  all.w += w; all.n += runs;
  console.log(`C${s} ${policy} win ${w}/${runs} castle ${w ? Math.round(100 * cs / w) : '-'}% t ${(tt / runs).toFixed(0)}s baseLeft ${runs - w ? Math.round(100 * bl / (runs - w)) : '-'}%`);
}
console.log(`total ${policy} ${all.w}/${all.n}`);

// 兵種價值測試：node siege/tools/unitbench.js [人數=100] [紅軍=600]
// 把同樣人數分別當一般兵、弓箭手、騎兵、盾兵送進中間那一路，看 20 秒內殺了多少紅軍、戰線推多遠、自己剩多少
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, localStorage: { getItem() { return null; }, setItem() { } } };
vm.createContext(ctx);
vm.runInContext(['core.js', 'levels.js', 'game.js', 'defense.js', 'clash.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') +
  '\n;this.api={newClash,clashStep,CSTAGES,CL_NC,clColX,get G(){return G}};', ctx);
const A = ctx.api;
const N = +(process.argv[2] || 100), RED = +(process.argv[3] || 600);
for (const u of [null, 'arch', 'cav', 'shield']) {
  A.newClash(1, { sim: true });
  const G = A.G, c = 3;
  G.L.C = Object.assign({}, G.L.C, { feed: 0, surge: 0, brute: 0, rain: 0, wall: 0, flip: 0 });
  G.fireAcc = -1e9;   // 不射
  for (let i = 0; i < A.CL_NC; i++) { G.b[i] = 0; G.r[i] = 0; G.f[i] = 20; }
  G.r[c] = RED; G.r[c - 1] = RED * 0.5; G.r[c + 1] = RED * 0.5;
  G.t = 30; G.inRate = 0;
  G.blobs.push({ x: A.clColX(c), z: 19.5, n: N, lane: 0, col: c, ph: 0, pop: 0, u });
  const k0 = G.kills, f0 = G.f[c];
  G.castle = G.castleMax = 1e9;
  let t = 0;
  let fmax = f0;
  while (t < 20) { A.clashStep(1 / 60, { abs: 0 }); t += 1 / 60; fmax = Math.max(fmax, G.f[c]); }
  console.log(`${(u || 'plain').padEnd(6)} 殺 ${Math.round(G.kills - k0)}（每人 ${((G.kills - k0) / N).toFixed(2)}）  戰線最遠 ${(fmax - f0).toFixed(1)}m  藍剩 ${Math.round(G.b.reduce((a, b) => a + b, 0) + G.ar.reduce((a, b) => a + b, 0))}`);
}

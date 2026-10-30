// 萬軍守城模擬：node siege/tools/defsim.js [policy=smart|lazy|center] [runs] [stages=1-12] [up]
// 環境變數 K='{"flow":1.1}' 可以試平衡係數；GAME=1 只跑遊戲裡真正用的那個種子
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, localStorage: { getItem() { return null; }, setItem() { } } };
vm.createContext(ctx);
vm.runInContext(['core.js', 'levels.js', 'game.js', 'defense.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') +
  '\n;this.api={newDefense,defStep,defLaunchGiant,defPathGain,defPickCard,DEF_K,get G(){return G}};', ctx);
const A = ctx.api;
if (process.env.K) Object.assign(A.DEF_K, JSON.parse(process.env.K));
const policy = process.argv[2] || 'smart', runs = +(process.argv[3] || 5);
const [s0, s1] = (process.argv[4] || '1-12').split('-').map(Number);
const upL = +(process.argv[5] || 0);
const pickCard = (G) => {
  const c = G.card;
  if (policy === 'center') return c[0];
  if (policy === 'lazy') return c[Math.floor(Math.random() * c.length)];
  if (c.includes('fix') && G.castle < G.castleMax * 0.6) return 'fix';
  for (const k of ['squad', 'rate', 'armor', 'gate', 'giant', 'fix']) if (c.includes(k)) return k;
};
let all = { w: 0, n: 0 };
for (let s = s0; s <= s1; s++) {
  let w = 0, tt = 0, cs = 0, bl = 0, to = 0;
  const n = runs;
  for (let r = 0; r < n; r++) {
    A.newDefense(s, { sim: true, seed: process.env.GAME ? undefined : 900 + r * 31 + s, up: { rate: upL, wall: upL, power: upL, giant: upL, card: Math.min(4, upL) } });
    let G = A.G, t = 0, tx = 0, thinkT = 0;
    while (G.st !== 'win' && G.st !== 'lost' && t < 300) {
      if (G.card) { A.defPickCard(pickCard(G)); continue; }
      thinkT -= 1 / 60;
      if (thinkT <= 0) {
        thinkT = policy === 'lazy' ? 1.6 : 0.3;
        const gates = G.objs.filter(o => o.t === 'gate');
        let best = -1, bx = 0;
        // 有怪物快到城了就過去擋
        let ex = null, ez = 1e9;
        for (const e of G.objs) if (e.t === 'en' && !e.dead && e.z < (policy === 'lazy' ? 7 : 12) && e.z < ez) { ez = e.z; ex = e.x; }
        const bombs = G.objs.filter(o => o.t === 'lob' && o.def);
        for (let x = -3.6; x <= 3.61; x += 0.3) {
          let v = A.defPathGain(gates, x, G.t + 1.5);
          if (G.objs.some(o => o.t === 'dwall' && Math.abs(x - o.x) < o.w)) v *= 0.4;
          if (policy === 'lazy') v = A.defPathGain(gates, x, G.t) + Math.random() * 2;
          if (ex != null) v = v / (1 + Math.abs(x - ex) * (policy === 'lazy' ? 0.8 : 1.5));
          if (policy === 'smart') for (const b of bombs) if (Math.abs(b.tx - x) < b.rad + 0.3) v *= 0.5;
          if (v > best) { best = v; bx = x; }
        }
        tx = policy === 'center' ? 0 : bx;
      }
      if (G.giant >= G.giantMax) A.defLaunchGiant();
      A.defStep(1 / 60, { abs: tx });
      G = A.G; t += 1 / 60;
    }
    if (G.st === 'win') { w++; cs += G.castle / G.castleMax; } else { bl += G.base.hp / G.base.max; if (t >= 300) to++; }
    tt += t;
  }
  all.w += w; all.n += n;
  console.log(`D${String(s).padStart(2, "0")} ${policy} win ${w}/${n} castle ${w ? Math.round(100 * cs / w) : '-'}% t ${(tt / n).toFixed(0)}s lostBase ${n - w ? Math.round(100 * bl / (n - w)) : '-'}% timeout ${to}`);
}
console.log(`total ${policy} ${all.w}/${all.n}`);

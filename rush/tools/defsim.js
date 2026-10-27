// 守城模式模擬：node rush/tools/defsim.js [policy=smart|lazy] [runs] [stages=1-8] [up]
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, localStorage: { getItem() { return null; }, setItem() { } } };
vm.createContext(ctx);
vm.runInContext(['core.js', 'levels.js', 'game.js', 'defense.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') +
  '\n;this.api={newDefense,defStep,defLaunchGiant,defPathGain,get G(){return G}};', ctx);
const A = ctx.api;
const policy = process.argv[2] || 'smart', runs = +(process.argv[3] || 5);
const [s0, s1] = (process.argv[4] || '1-8').split('-').map(Number);
const upL = +(process.argv[5] || 0);
for (let s = s0; s <= s1; s++) {
  let w = 0, tt = 0, cs = 0, bl = 0;
  for (let r = 0; r < runs; r++) {
    A.newDefense(s, { sim: true, seed: 900 + r * 31 + s, up: { men: upL, dmg: upL, rate: upL } });
    let G = A.G, t = 0, tx = 0, thinkT = 0;
    while (G.st !== 'win' && G.st !== 'lost' && t < 300) {
      thinkT -= 1 / 60;
      if (thinkT <= 0) {
        thinkT = policy === 'lazy' ? 2.5 : 0.35;
        const gates = G.objs.filter(o => o.t === 'gate');
        let best = -1, bx = 0;
        // 先看有沒有怪物快到了
        let ex = null, ez = 1e9;
        for (const e of G.objs) if (e.t === 'en' && !e.dead && e.z < 9 && e.z < ez) { ez = e.z; ex = e.x; }
        for (let x = -3.6; x <= 3.61; x += 0.3) {
          let v = A.defPathGain(gates, x, G.t + 1.5);
          if (ex != null && policy === 'smart') v = v / (1 + Math.abs(x - ex) * 1.5);
          if (policy === 'lazy') v = A.defPathGain(gates, x, G.t) + Math.random() * 2;
          if (v > best) { best = v; bx = x; }
        }
        tx = policy === 'center' ? 0 : bx;
      }
      if (G.giant >= G.giantMax) A.defLaunchGiant();
      A.defStep(1 / 60, { abs: tx });
      G = A.G; t += 1 / 60;
    }
    if (G.st === 'win') { w++; cs += G.castle / G.castleMax; } else bl += G.base.hp / G.base.max;
    tt += t;
  }
  console.log(`D${s} ${policy} win ${w}/${runs} castle ${w ? Math.round(100 * cs / w) : '-'}% t ${(tt / runs).toFixed(0)}s baseLeft(lost) ${runs - w ? Math.round(100 * bl / (runs - w)) : '-'}%`);
}

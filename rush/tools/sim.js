// 無頭模擬器：node rush/tools/sim.js [policy=smart|random|bad] [runs] [stages=1-12] [up=0]
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js');
const ctx = { console, Math, JSON, localStorage: { getItem() { return null; }, setItem() { } } };
vm.createContext(ctx);
const src = ['core.js', 'levels.js', 'game.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') +
  '\n;this.api={todayKey,newGame,step,get G(){return G},WEAPONS,genDps,ROAD,LV_MAX,get LOSS(){return LOSS}};';
vm.runInContext('var LOSS={};' + src.replace('function setN(n, why) {', 'function setN(n, why) { if (n < G.N) LOSS[why] = (LOSS[why] || 0) + (G.N - n);'), ctx);
const A = ctx.api;

const policy = process.argv[2] || 'smart';
const runs = +(process.argv[3] || 6);
const [s0, s1] = (process.argv[4] || '1-12').split('-').map(Number);
const upL = +(process.argv[5] || 0);

function gateVal(G, g) {
  const d = lv => A.genDps(G.wid, lv);
  if (g.k === 'add') return Math.max(0, G.N + g.v) * d(G.lv);
  if (g.k === 'mul') return G.N * g.v * d(G.lv);
  if (g.k === 'div') return Math.ceil(G.N / g.v) * d(G.lv);
  if (g.k === 'wpn') return G.N * A.genDps(g.v, G.lv);
  if (g.k === 'lv') return G.N * d(Math.min(A.LV_MAX, G.lv + 1));
  return 0;
}

const G_boss = r => r.bossT0 != null;
const LOSSLOG = process.env.LOSSLOG ? {} : null;
const MODE = process.env.MODE || 'stage';
function play(s, seed) {
  A.newGame(s, { sim: true, seed, mode: MODE, up: { men: upL, dmg: upL, rate: upL } });
  let G = A.G;
  const dt = 1 / 60;
  const choice = new Map();
  let t = 0;
  while ((G.st === 'play' || G.st === 'lose' || (G.boss && G.boss.dead && G.st !== 'win')) && t < (MODE === 'endless' ? 1500 : 400)) {
    // 找下一對門
    let next = null;
    for (const o of G.objs) if (o.t === 'gate' && !o.pair.used && o.z > -0.5 && (!next || o.z < next.z)) next = o;
    let tx = 0;
    if (next && next.pair.n === 2) {
      const pair = G.objs.filter(o => o.t === 'gate' && o.pair === next.pair);
      if (!choice.has(next.pair.id) || policy === 'smart') {
        let side;
        if (policy === 'smart') { const a = pair.find(o => o.side < 0), b = pair.find(o => o.side > 0); side = gateVal(G, a) >= gateVal(G, b) ? -1 : 1; }
        else if (policy === 'bad') { const a = pair.find(o => o.side < 0), b = pair.find(o => o.side > 0); side = gateVal(G, a) < gateVal(G, b) ? -1 : 1; }
        else side = Math.random() < 0.5 ? -1 : 1;
        choice.set(next.pair.id, side);
      }
      tx = choice.get(next.pair.id) * A.ROAD / 2;
    }
    // 像真人一樣：門還遠的時候，先把部隊帶到前面敵人最多的地方開槍
    if (policy !== 'still') {
      let sw = 0, sx = 0, nearZ = 1e9;
      for (const o of G.objs) if ((o.t === 'en' || o.t === 'boss' || o.t === 'crate') && !o.dead && o.z > 0 && o.z < 30) { const w = (o.t === 'crate' ? o.hp * 2 : o.hp) / Math.max(1, o.z); sw += w; sx += w * o.x; nearZ = Math.min(nearZ, o.z); }
      if (sw > 0 && (!next || next.z > nearZ + 4)) tx = Math.max(-3.6, Math.min(3.6, sx / sw));
      if (next && next.pair.n === 1) {
        // 會動的門：算好到達時門在哪
        const v = G.scroll ? G.spd : 0.001, T = next.z / v;
        if (next.z < 22) tx = next.slide.cx + next.slide.amp * Math.sin((G.t + T) * next.slide.f + next.slide.ph);
      }
      if (next && next.roul && next.z < 12) {
        // 轉盤門：挑到達時比較好的那一邊
        const v = G.scroll ? G.spd : 0.001, T = next.z / v;
        let bestSide = 0, bestV = -1e9;
        for (const o of G.objs) if (o.t === 'gate' && o.pair === next.pair) {
          const r = o.roul; const steps = Math.floor((r.t + T) / r.per); const g = r.vals[(r.i + steps) % r.vals.length];
          const val = gateVal(G, g); if (val > bestV) { bestV = val; bestSide = o.side; }
        }
        tx = bestSide * A.ROAD / 2;
      }
      // 危險：刀鋸、尖刺、紅圈
      const cr = { rx: 0.3 * Math.sqrt(Math.min(64, G.N) + 0.6) + 0.25 };
      const danger = x => {
        let d = 0;
        for (const o of G.objs) {
          if (o.t === 'saw' && o.z > -1 && o.z < 7) { const T = Math.max(0, o.z) / Math.max(0.1, G.spd); const sx = o.cx + o.amp * Math.sin((G.t + T) * o.f + o.ph); if (Math.abs(sx - x) < cr.rx + o.r + 0.3) d += 3; }
          if (o.t === 'spike' && o.z < 5 && o.z + o.len > -1 && x + cr.rx > o.x0 && x - cr.rx < o.x1) d += 2;
          if (o.t === 'lob' && o.T - o.age < 1.0 && Math.abs(o.tx - x) < o.rad + cr.rx * 0.6 + 0.3) d += 4;
          if (o.t === 'boss' && o.strike && Math.abs(o.strike.x - x) < 1.25 + cr.rx * 0.5 + 0.3) d += 5;
        }
        return d;
      };
      if (danger(tx) > 0) {
        let bx = tx, bd = 1e9;
        for (let x = -3.6; x <= 3.61; x += 0.3) { const dd = danger(x) * 10 + Math.abs(x - tx) + (next && next.z < 10 && next.pair.n === 2 && Math.sign(x || 1) !== Math.sign(tx || 1) ? 6 : 0); if (dd < bd) { bd = dd; bx = x; } }
        tx = bx;
      }
    }
    const n0 = G.N;
    A.step(dt, { abs: tx });
    G = A.G;
    if (LOSSLOG && G.N < n0 && G.q.length === 0) { }
    if (G.boss && G.bossN0 == null) { G.bossN0 = G.N; G.bossT0 = G.t; }
    t += dt;
  }
  if (MODE !== 'stage') console.log('  ', MODE, 'seed', seed, G.st, 'dist', Math.round(G.dist), 'leg', G.leg, 'N', G.N, 'peak', G.peak);
  return { bossT0: G.bossT0, bossLoss: G.bossN0 ? 1 - G.N / G.bossN0 : 0, bossT: G.bossT0 != null ? G.t - G.bossT0 : 0, win: G.st === 'win', N: G.N, peak: G.peak, t: G.t, lost: G.lost, stars: G.st === 'win' ? (G.N >= G.peak * 0.75 ? 3 : G.N >= G.peak * 0.45 ? 2 : 1) : 0, bossHpLeft: G.boss ? G.boss.hp / G.boss.max : 1, dist: G.dist, len: G.L.len, expN: G.L.expN };
}

for (let s = s0; s <= s1; s++) {
  let bl = 0, bt = 0, w = 0, st = 0, tt = 0, Ns = [], peaks = [], fails = [];
  for (let r = 0; r < runs; r++) {
    const res = play(s, 1000 + r * 77 + s);
    if (res.win) { w++; st += res.stars; bl += res.bossLoss; bt += res.bossT; Ns.push(res.N); } else fails.push((res.dist / res.len).toFixed(2) + (G_boss(res) ? 'B' + res.bossHpLeft.toFixed(2) : ''));
    tt += res.t; peaks.push(res.peak);
  }
  if (process.env.LOSS) { const L = A.LOSS; const tot = Object.values(L).reduce((a, b) => a + b, 0) || 1; console.log('   loss%', Object.entries(L).map(([k, v]) => k + ':' + Math.round(100 * v / tot)).join(' ')); for (const k in L) delete L[k]; }
  console.log(`S${String(s).padStart(2)} exp${Math.round(play(s,1).expN)} ${policy} win ${w}/${runs} stars ${(st / Math.max(1, w)).toFixed(1)} t ${(tt / runs).toFixed(0)}s peak~${Math.round(peaks.reduce((a, b) => a + b, 0) / runs)} endN~${Ns.length ? Math.round(Ns.reduce((a, b) => a + b, 0) / Ns.length) : '-'} boss ${(bt / Math.max(1, w)).toFixed(1)}s -${Math.round(100 * bl / Math.max(1, w))}% ${fails.length ? 'fail@' + fails.join(',') : ''}`);
}

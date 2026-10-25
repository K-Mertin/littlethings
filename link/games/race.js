'use strict';
/* 腦力快手 — everyone gets the same little challenge at the same moment on their own phone and solves it
   with their own hands; the fastest correct answer scores most.
   Host: builds a plan of 8 (kid) / 10 (adult) rounds, generates each challenge with its answer, sends the same
   challenge data to everyone, times every answer on the host clock and validates it (never trusts the client).
   Round phases: ready (title card) → show (記憶 only: sequence visible) → go (answer) → reveal (answer + scores). */
(() => {
  const R = n => Math.random() * n | 0;
  const pick = a => a[R(a.length)];
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const r1 = x => Math.round(x * 10) / 10;
  const r2 = x => Math.round(x * 100) / 100;
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- challenge types ---------------- */
  const INK = { r: ['紅', '#ef4444'], b: ['藍', '#2563eb'], g: ['綠', '#16a34a'], y: ['黃', '#eab308'], p: ['紫', '#9333ea'] };
  const T = {
    odd: { ic: '🔍', n: '找不同', c: '#8b5cf6', kid: '找出不一樣的那一個', ad: '找出唯一不一樣的那一個（很像喔！）', demo: [['🍎', '🍎', '🍌', '🍎'], 2] },
    count: { ic: '🧮', n: '數一數', c: '#0ea5e9', kid: '數一數有幾個', ad: '數清楚有幾個，小心長得很像的', demo: [['🐟', '🐟', '🐟', '➜', '3'], 4] },
    math: { ic: '➕', n: '心算', kn: '加一加', c: '#f59e0b', kid: '加起來是多少？', ad: '心算出答案，用數字鍵輸入', demo: [['🍎', '＋', '🍎🍎', '＝', '3'], 4] },
    memo: { ic: '🧠', n: '記憶', c: '#ec4899', kid: '看清楚，再照順序按', ad: '記住順序，消失後照順序輸入', demo: [['🐶', '🐱', '🐰', '➜', '👆'], 4] },
    react: { ic: '🚦', n: '反應', c: '#22c55e', kid: '變綠色就按！', ad: '變綠色就馬上按！太早按算犯規（−30）', demo: [['🔴', '➜', '🟢', '👆'], 3] },
    stroop: { ic: '🎨', n: '顏色字', c: '#ef4444', kid: '', ad: '按「墨水的顏色」，不是字的意思', demo: [[`<b style="color:${INK.b[1]}">紅</b>`, '➜', `<b style="color:${INK.b[1]}">藍</b>`], 2] },
    order: { ic: '👆', n: '按順序', c: '#14b8a6', kid: '從 1 開始照順序按', ad: '從 1 開始照順序按，按錯會停 1 秒', demo: [['1', '➜', '2', '➜', '3'], 4] },
    big: { ic: '⚖️', n: '比大小', c: '#f97316', kid: '哪一邊比較多？', ad: '', demo: [['3', '🆚', '8'], 2] }
  };
  const KID_ODD = [['🍎', '🍌'], ['🐶', '🐱'], ['🌞', '🌙'], ['🚗', '🚀'], ['🐸', '🐷'], ['⭐', '❤️'], ['🍓', '🍇'], ['🐟', '🐢'], ['🌸', '🍀'], ['🎈', '⚽'], ['🐰', '🐻'], ['🍦', '🍩']];
  const AD_ODD = [['😀', '😃'], ['😃', '😄'], ['😐', '😑'], ['😗', '😙'], ['😮', '😯'], ['😺', '😸'], ['🕐', '🕑'], ['🕔', '🕕'], ['🌖', '🌗'], ['🌒', '🌓'], ['🔉', '🔊'], ['😚', '😙'], ['📕', '📙']];
  const KID_CNT = ['🐟', '🐞', '🍎', '⭐', '🐣', '🎈', '🍓', '🦋', '🐸', '🌸'];
  const AD_CNT = [['🐟', '🐠'], ['🍎', '🍅'], ['⭐', '🌟'], ['🐥', '🐤'], ['🌼', '🌻'], ['🔴', '🟠'], ['💙', '💜']];
  const KID_PAL = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🐶', '🐱', '🐰', '🐻', '🐸', '🐷'];
  const AD_PAL = ['🍎', '🍋', '🍇', '🥝', '🍑', '🍒', '🍐', '🍊', '🍉', '🍌'];
  const KID_MANY = ['🍓', '🐥', '⭐', '🍪', '🎈', '🐞'];

  /* jittered grid: n non-overlapping spots in a square, as % positions */
  function scatter(n, jit) {
    const g = Math.ceil(Math.sqrt(n * 1.45)), j = jit == null ? 0.36 : jit;
    const cells = shuf([...Array(g * g).keys()]).slice(0, n);
    const at = k => r1(5 + (k + 0.5 + (Math.random() - 0.5) * j) / g * 90);   // keep a 5% margin inside the board
    return { g, pos: cells.map(c => [at(c % g), at(c / g | 0)]) };
  }
  function evalP(p) {   // [a, op, b, op, c] with × before + −
    const t = p.slice();
    for (let i = 1; i < t.length; i += 2) if (t[i] === '×') { t.splice(i - 1, 3, t[i - 1] * t[i + 1]); i -= 2; }
    let v = t[0]; for (let i = 1; i < t.length; i += 2) v = t[i] === '+' ? v + t[i + 1] : v - t[i + 1];
    return v;
  }
  const GEN = {
    odd(kid, lv) {
      const cols = kid ? (lv ? 4 : 3) : (lv ? 7 : 6), pr = pick(kid ? KID_ODD : AD_ODD), [a, b] = Math.random() < 0.5 ? pr : [pr[1], pr[0]];
      const n = cols * cols, i = R(n), cells = Array(n).fill(a); cells[i] = b;
      return { ch: { cols, cells }, sol: i, dur: 12 };
    },
    count(kid, lv) {
      let tgt, not = null, n, d = 0;
      if (kid) { tgt = pick(KID_CNT); n = lv ? 5 + R(6) : 3 + R(5); if (lv) { not = pick(KID_CNT.filter(e => e !== tgt)); d = 2 + R(3); } }
      else { const pr = pick(AD_CNT); tgt = pr[0]; not = pr[1]; n = lv ? 12 + R(7) : 8 + R(7); d = lv ? 10 + R(6) : 7 + R(6); }
      const sc = scatter(n + d), kinds = shuf(Array(n).fill(1).concat(Array(d).fill(0)));
      const items = sc.pos.map((p, i) => [kinds[i] ? 1 : 0, p[0], p[1], R(41) - 20]);
      return { ch: { tgt, not, g: sc.g, items }, sol: n, dur: 15 };
    },
    math(kid, lv) {
      let p;
      if (kid) { const a = 1 + R(5), b = 1 + R(lv ? 5 : 4); return { ch: { p: [a, '+', b], e: pick(['🍎', '🍓', '🐥', '⭐', '🍪']) }, sol: a + b, dur: 12 }; }
      const f = lv ? R(2) + 3 : R(3);
      if (f === 0) p = [23 + R(67), '+', 19 + R(71)];
      else if (f === 1) { const a = 51 + R(49); p = [a, '−', 12 + R(Math.min(38, a - 13))]; }
      else if (f === 2) p = [11 + R(9), '×', 3 + R(7)];
      else if (f === 3) p = [3 + R(7), '×', 4 + R(6), '+', 11 + R(39)];
      else p = [31 + R(60), '+', 12 + R(40), '−', 11 + R(30)];
      const q = p.map(x => x === '−' ? '-' : x);
      return { ch: { p }, sol: evalP(q), dur: 12 };
    },
    memo(kid, lv) {
      if (kid) {
        const pal = shuf(KID_PAL.slice()).slice(0, 6), len = lv ? 4 : 3, seq = shuf(pal.slice()).slice(0, len);
        return { ch: { k: 'e', len, pal, seq }, sol: seq, show: lv ? 3.5 : 3, dur: 12 };
      }
      if (!lv) { const len = 6, seq = Array.from({ length: len }, () => String(R(10))); return { ch: { k: 'd', len, seq }, sol: seq, show: 2.5, dur: 10 }; }
      const pal = shuf(AD_PAL.slice()).slice(0, 8), len = 5, seq = Array.from({ length: len }, () => pick(pal));
      return { ch: { k: 'e', len, pal, seq }, sol: seq, show: 3, dur: 10 };
    },
    react(kid, lv) { return { ch: {}, sol: null, wait: (kid ? 1.8 : 1.5) + Math.random() * 2.6, dur: kid ? 3 : 2.5 }; },
    stroop(kid, lv) {
      const ks = Object.keys(INK), w = pick(ks), k = pick(ks.filter(x => x !== w));
      const opts = shuf([w, k].concat(shuf(ks.filter(x => x !== w && x !== k)).slice(0, 2)));
      const ch = { w, k, opts };
      if (lv) ch.bi = opts.map(o => pick(ks.filter(x => x !== o)));   // buttons written in misleading inks
      return { ch, sol: k, dur: 6 };
    },
    order(kid, lv) {
      const N = kid ? (lv ? 6 : 5) : (lv ? 12 : 10), sc = scatter(N, 0.22);
      return { ch: { N, g: sc.g, pos: sc.pos }, sol: N, dur: kid ? 12 : 15 };
    },
    big(kid, lv) {
      const many = lv ? true : Math.random() < 0.5;
      let L, Rr;
      if (many) { do { L = 1 + R(9); Rr = 1 + R(9); } while (Math.abs(L - Rr) < 2); }
      else { do { L = 1 + R(9); Rr = 1 + R(9); } while (L === Rr); }
      return { ch: { k: many ? 'm' : 'n', L, R: Rr, e: pick(KID_MANY) }, sol: L > Rr ? 0 : 1, dur: 8 };
    }
  };
  const CHECK = {
    odd: (a, s) => (a | 0) === s,
    count: (a, s) => +a === s,
    math: (a, s) => +a === s,
    memo: (a, s) => Array.isArray(a) && a.length === s.length && a.every((x, i) => String(x) === s[i]),
    stroop: (a, s) => a === s,
    big: (a, s) => (a | 0) === s
  };

  function makePlan(kid) {
    const pool = kid ? ['odd', 'count', 'math', 'memo', 'react', 'order', 'big'] : ['odd', 'count', 'math', 'memo', 'react', 'stroop', 'order'];
    const total = kid ? 8 : 10;
    let list;
    for (let tries = 0; tries < 80; tries++) {
      list = shuf(pool.concat(shuf(pool.slice()).slice(0, total - pool.length)));
      if (list.every((t, i) => i === 0 || list[i - 1] !== t)) break;
    }
    const seen = {};
    return list.map(t => { const lv = seen[t] ? 1 : 0; seen[t] = 1; return { t, lv }; });
  }

  /* ---------------- styles ---------------- */
  const CSS = `
.rk{position:absolute;inset:0;display:flex;flex-direction:column;container:rk/size;overflow:hidden;
  background:radial-gradient(700px 400px at 0% 0%,#fff 0,transparent 70%),radial-gradient(700px 500px at 100% 100%,#ffeede 0,transparent 70%),#eef4ff}
.rk *{box-sizing:border-box}
.rk-top{flex:none;display:flex;align-items:center;gap:10px;padding:8px 12px 6px}
.rk-rd{font-family:var(--round);font-weight:700;font-size:15px;color:var(--mute);white-space:nowrap}
.rk-ty{display:inline-flex;align-items:center;gap:6px;font-weight:900;font-size:16px;color:#fff;background:var(--tc,#5b5bf7);padding:4px 12px 4px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,.12)}
.rk-bar{flex:1;height:14px;border-radius:99px;background:#dfe6fb;overflow:hidden;min-width:40px}
.rk-bar i{display:block;height:100%;width:100%;border-radius:99px;background:linear-gradient(90deg,#22c26a,#7ee08a);transform-origin:left;transition:background .3s}
.rk-bar.warn i{background:linear-gradient(90deg,#ff7a45,#ffb37a)}
.rk-bar.crit i{background:linear-gradient(90deg,#ef4444,#ff8080);animation:rkPulse .5s infinite alternate}
.rk-sec{font-family:var(--round);font-weight:700;font-size:20px;min-width:28px;text-align:right}
.rk-mid{flex:1;min-height:0;display:flex;gap:12px;padding:0 12px 8px}
.rk-body{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px}
.rk-q{flex:none;text-align:center;font-weight:900;font-size:19px;line-height:1.3;min-height:0}
.rk-q:empty{display:none}
.rk-ch{flex:1;min-height:0;container-type:size;position:relative;display:flex;align-items:center;justify-content:center}
.rk-in{flex:none;display:flex;flex-direction:column;gap:8px}
.rk-in:empty{display:none}
.rk-st{flex:none;min-height:34px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:900;font-size:18px;border-radius:14px;padding:4px 10px;transition:background .2s}
.rk-st.ok{background:#dcfce7;color:#11703c}.rk-st.bad{background:#fee2e2;color:#b91c1c}.rk-st.info{color:var(--mute)}
.rk-who{flex:none;display:flex;align-items:center;gap:6px;padding:0 12px 10px;min-height:52px}
.rk-who .lb{font-size:13px;font-weight:900;color:var(--mute);white-space:nowrap}
.rk-av{position:relative;width:40px;height:40px;flex:none;animation:rkPop .45s cubic-bezier(.3,1.6,.5,1) both}
.rk-av img{width:100%;height:100%}
.rk-av b{position:absolute;right:-4px;bottom:-4px;background:var(--ink);color:#fff;font-family:var(--round);font-size:11px;min-width:18px;height:18px;border-radius:9px;display:grid;place-items:center;padding:0 4px}
.rk-av.ok b{background:#22c26a}
.rk-side{display:none}
.rk-ov{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:12px;pointer-events:none}
.rk-ov:empty{display:none}
.rk-ov.dim{background:rgba(238,244,255,.82);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.rk-ov>*{pointer-events:auto}

/* ready card */
.rk-ready{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;background:#fff;border-radius:28px;padding:22px 26px;
  box-shadow:0 14px 40px rgba(60,70,140,.18);max-width:94%;animation:rkIn .45s cubic-bezier(.3,1.5,.5,1) both}
.rk-rno{font-family:var(--round);font-weight:700;color:var(--mute);font-size:16px;letter-spacing:.08em}
.rk-ric{font-size:min(24cqmin,130px);line-height:1;animation:rkBob 1s ease-in-out infinite alternate;filter:drop-shadow(0 6px 0 rgba(0,0,0,.08))}
.rk-rname{font-weight:900;font-size:min(9cqmin,46px);color:var(--tc)}
.rk-demo{display:flex;align-items:center;gap:8px;font-size:min(8cqmin,40px);font-weight:900;background:#f6f8ff;border-radius:18px;padding:8px 16px}
.rk-demo span{display:inline-block}
.rk-demo .hi{animation:rkHi 1s ease-in-out infinite;border-radius:12px;box-shadow:0 0 0 4px var(--tc)}
.rk-rhint{font-weight:700;color:var(--ink);font-size:16px;max-width:420px;line-height:1.5}
.rk-rcnt{font-family:var(--round);font-weight:700;font-size:min(12cqmin,60px);color:var(--acc);line-height:1}

/* boards */
.rk-board{position:relative;width:min(100cqw,100cqh);height:min(100cqw,100cqh);background:#fff;border-radius:22px;box-shadow:0 3px 0 var(--line),0 10px 30px rgba(60,70,140,.08)}
.rk-it{position:absolute;transform:translate(-50%,-50%) rotate(var(--rt,0deg));font-size:calc(min(100cqw,100cqh) / var(--g) * .54);line-height:1;animation:rkPop .4s cubic-bezier(.3,1.6,.5,1) both}
.rk-grid{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:min(1.2cqmin,8px);width:min(100cqw,100cqh);height:min(100cqw,100cqh);padding:min(1.6cqmin,10px);background:#fff;border-radius:22px;box-shadow:0 3px 0 var(--line),0 10px 30px rgba(60,70,140,.08)}
.rk-grid button{display:grid;place-items:center;font-size:calc(min(100cqw,100cqh) / var(--cols) * .55);line-height:1;border-radius:14px;background:#f4f6fd;transition:transform .12s,background .2s;animation:rkPop .35s cubic-bezier(.3,1.6,.5,1) both}
.rk-grid button:active{transform:scale(.9)}
.rk-grid button.pk{background:#ffe7c2}
.rk-grid button.hit{background:#bbf7d0;box-shadow:0 0 0 4px #22c26a inset;animation:rkHi .8s ease-in-out infinite}
.rk-grid button.no{background:#fecaca}
.rk-dot{position:absolute;transform:translate(-50%,-50%);width:calc(min(100cqw,100cqh) / var(--g) * .66);height:calc(min(100cqw,100cqh) / var(--g) * .66);min-width:48px;min-height:48px;border-radius:50%;
  display:grid;place-items:center;font-family:var(--round);font-weight:700;font-size:calc(min(100cqw,100cqh) / var(--g) * .32);color:#fff;background:var(--dc,#5b5bf7);box-shadow:0 4px 0 rgba(0,0,0,.18);transition:transform .15s,opacity .3s,background .2s;animation:rkPop .4s cubic-bezier(.3,1.6,.5,1) both}
.rk-dot.dn{background:#cbd5e1;box-shadow:none;transform:translate(-50%,-50%) scale(.82);color:#fff}
.rk-dot.nx{box-shadow:0 4px 0 rgba(0,0,0,.18),0 0 0 4px #ffd166}

/* questions */
.rk-math{display:flex;align-items:center;justify-content:center;gap:min(3cqmin,18px);flex-wrap:wrap;font-family:var(--round);font-weight:700;font-size:min(16cqw,30cqh,110px);color:var(--ink);text-align:center}
.rk-math .op{color:var(--tc)}
.rk-math .q{color:#fff;background:var(--tc);border-radius:20px;padding:0 .3em;min-width:1.2em}
.rk-kmath{display:flex;flex-direction:column;align-items:center;gap:min(3cqh,14px)}
.rk-kmath .grp{display:flex;align-items:center;gap:min(3cqmin,16px)}
.rk-kmath .set{display:flex;flex-wrap:wrap;justify-content:center;max-width:min(36cqw,260px);font-size:min(10cqw,13cqh,58px);background:#fff;border-radius:18px;padding:6px 10px;box-shadow:0 3px 0 var(--line)}
.rk-kmath .num{font-family:var(--round);font-weight:700;font-size:min(9cqw,12cqh,56px);text-align:center}
.rk-word{font-weight:900;font-size:min(40cqw,60cqh,240px);line-height:1;background:#fff;border-radius:30px;padding:.12em .3em;box-shadow:0 4px 0 var(--line),0 12px 30px rgba(60,70,140,.1);animation:rkPop .35s cubic-bezier(.3,1.6,.5,1) both}
.rk-seq{display:flex;flex-wrap:wrap;justify-content:center;gap:min(2cqmin,12px);max-width:100%}
.rk-seq span{display:grid;place-items:center;font-family:var(--round);font-weight:700;width:min(15cqw,30cqh,120px);height:min(15cqw,30cqh,120px);font-size:min(10cqw,20cqh,80px);background:#fff;border-radius:18px;box-shadow:0 4px 0 var(--line);animation:rkPop .4s cubic-bezier(.3,1.6,.5,1) both}
.rk-seq span.em{border:3px dashed #c9d3f0;box-shadow:none;background:#f6f8ff}
.rk-seq span.f{border:3px solid var(--tc);background:#fff}
.rk-peek{font-size:min(7cqmin,30px);font-weight:900;color:var(--mute);text-align:center}
.rk-react{position:relative;width:100%;height:100%;border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;font-weight:900;
  background:#ef4444;box-shadow:0 6px 0 #b91c1c;transition:background .08s;font-size:min(12cqmin,64px);text-align:center;touch-action:manipulation}
.rk-react .e{font-size:min(30cqmin,170px);line-height:1}
.rk-react.g{background:#22c55e;box-shadow:0 6px 0 #15803d}
.rk-react.x{background:#64748b;box-shadow:0 6px 0 #334155}
.rk-react small{font-size:min(5cqmin,22px);opacity:.9}
.rk-two{display:flex;gap:min(3cqmin,16px);width:100%;height:100%}
.rk-two button{flex:1;border-radius:26px;background:#fff;box-shadow:0 5px 0 var(--line);display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:2px;padding:10px;transition:transform .12s,background .2s}
.rk-two button:active{transform:scale(.95)}
.rk-two .bn{font-family:var(--round);font-weight:700;font-size:min(30cqw,50cqh,220px);line-height:1;width:100%;text-align:center}
.rk-two .bd{font-size:min(7cqw,8cqh,40px);line-height:1.1}
.rk-two button.hit{background:#bbf7d0;box-shadow:0 0 0 5px #22c26a inset}
.rk-two button.no{background:#fee2e2}

/* inputs */
.rk-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rk-pad button,.rk-nums button,.rk-pal button,.rk-opts button{min-height:50px;height:min(7.4cqh,66px);border-radius:16px;background:#fff;font-family:var(--round);font-weight:700;font-size:min(7cqh,30px);
  box-shadow:0 4px 0 var(--line);border:2px solid var(--line);color:var(--ink);transition:transform .08s}
.rk-pad button:active,.rk-nums button:active,.rk-pal button:active,.rk-opts button:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}
.rk-pad .okb{background:var(--acc);color:#fff;border-color:var(--accd);box-shadow:0 4px 0 var(--accd)}
.rk-pad .dl{background:#f1f3fb}
.rk-disp{height:min(9cqh,62px);min-height:46px;border-radius:16px;background:#fff;border:3px solid var(--line);display:flex;align-items:center;justify-content:center;font-family:var(--round);font-weight:700;font-size:min(7cqh,36px);letter-spacing:.08em}
.rk-disp:empty::before{content:'？';color:#c3cbe6}
.rk-nums{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.rk-nums button{height:min(11cqh,76px);font-size:min(8cqh,40px)}
.rk-pal{display:grid;grid-template-columns:repeat(var(--pc,3),1fr);gap:8px}
.rk-pal button{height:min(10cqh,72px);font-size:min(7cqh,38px);font-family:inherit}
.rk-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rk-opts button{height:min(13cqh,90px);font-family:var(--sans);font-weight:900;font-size:min(8cqh,40px)}
.rk-in.off{opacity:.45;pointer-events:none;filter:grayscale(.4)}
.rk-shake{animation:rkShake .4s}

/* stamp over challenge when done */
.rk-stamp{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,.72);
  backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);border-radius:22px;animation:rkFade .25s both;text-align:center}
.rk-stamp .e{font-size:min(26cqmin,110px);line-height:1;animation:rkPop .5s cubic-bezier(.3,1.6,.5,1) both}
.rk-stamp .t{font-weight:900;font-size:min(9cqmin,36px)}
.rk-stamp .s{font-weight:700;color:var(--mute);font-size:min(5.5cqmin,20px)}
.rk-stamp.ok .t{color:#15803d}.rk-stamp.bad .t{color:#b91c1c}

/* reveal */
.rk-rev{width:min(100%,560px);max-height:100%;overflow:auto;background:#fff;border-radius:26px;padding:16px;box-shadow:0 14px 40px rgba(60,70,140,.18);display:flex;flex-direction:column;gap:10px;animation:rkIn .4s cubic-bezier(.3,1.4,.5,1) both}
.rk-ans{display:flex;flex-direction:column;align-items:center;gap:4px;background:#f6f8ff;border-radius:18px;padding:10px}
.rk-ans .lb{font-size:13px;font-weight:900;color:var(--mute)}
.rk-ansv{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;font-family:var(--round);font-weight:700;font-size:34px;line-height:1.15;text-align:center}
.rk-ansv b{color:var(--tc)}
.rk-ansv .vs{font-family:var(--sans);font-size:16px;color:var(--mute);font-weight:900}
.rk-ansv .sw{display:inline-block;width:34px;height:34px;border-radius:10px;vertical-align:middle}
.rk-ansv .tk{display:inline-grid;place-items:center;min-width:44px;height:44px;background:#fff;border-radius:12px;box-shadow:0 3px 0 var(--line);padding:0 6px}
.rk-ansv .lo{opacity:.35}
.rk-fast{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:900;font-size:17px;text-align:center}
.rk-fast img{width:38px;height:38px}
.rk-mine{text-align:center;font-weight:900;font-size:24px;border-radius:16px;padding:8px;animation:rkPop .5s .15s cubic-bezier(.3,1.6,.5,1) both}
.rk-mine.ok{background:#dcfce7;color:#11703c}.rk-mine.bad{background:#fee2e2;color:#b91c1c}.rk-mine.mid{background:#f1f5f9;color:#475569}
.rk-sb{display:flex;flex-direction:column;gap:6px}
.rk-row{display:grid;grid-template-columns:22px 34px minmax(40px,auto) 1fr minmax(62px,auto) auto;align-items:center;gap:8px;font-weight:900;font-size:15px}
.rk-row .rkn{font-family:var(--round);color:var(--mute);text-align:center}
.rk-row img{width:34px;height:34px}
.rk-row .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:6.5em}
.rk-row .trk{height:20px;background:#eef1fb;border-radius:10px;overflow:hidden;position:relative}
.rk-row .trk i{position:absolute;left:0;top:0;bottom:0;border-radius:10px;background:var(--pc);transition:width 1.1s cubic-bezier(.3,1,.4,1)}
.rk-row .sv{font-family:var(--round);font-weight:700;min-width:44px;text-align:right}
.rk-row .gn{font-family:var(--round);font-size:13px;color:#15803d;text-align:right;line-height:1.1;animation:rkPop .5s .6s cubic-bezier(.3,1.6,.5,1) both;white-space:nowrap}
.rk-row.me .nm{color:var(--pri)}
.rk-row .gn.neg{color:#b91c1c}
.rk-row .gn small{color:var(--mute);font-size:11px}
.rk.tv .rk-row .gn small{font-size:17px}
.rk-nx{text-align:center;font-size:13px;font-weight:900;color:var(--mute)}

/* landscape phone: challenge left, answer pad right */
@container rk (aspect-ratio > 1.25) {
  .rk.me .rk-body{display:grid;grid-template-columns:1fr minmax(260px,44%);grid-template-rows:auto 1fr auto;column-gap:14px}
  .rk.me .rk-q{grid-column:1;grid-row:1}
  .rk.me .rk-ch{grid-column:1;grid-row:2 / 4}
  .rk.me .rk-in{grid-column:2;grid-row:1 / 3;justify-content:center}
  .rk.me .rk-st{grid-column:2;grid-row:3}
  .rk.me .rk-body:has(.rk-in:empty){display:flex;flex-direction:column}
  .rk-rev{width:min(100%,820px);display:grid;grid-template-columns:1fr 1.2fr;align-items:start}
  .rk-rev .rk-sb{grid-column:2;grid-row:1 / 5}
  .rk-rev .rk-nx{grid-column:1 / 3}
}
@container rk (max-height: 520px) {
  .rk-ready{padding:10px 22px;gap:3px;max-height:100%}
  .rk-ric{font-size:15cqh}
  .rk-rname{font-size:8cqh}
  .rk-demo{font-size:7cqh;padding:4px 12px}
  .rk-rhint{font-size:14px}
  .rk-rcnt{font-size:9cqh}
  .rk-q{font-size:16px}
}
@container rk (aspect-ratio > 1.25) and (max-height: 420px) {
  .rk-who{display:none}
  .rk-top{padding:4px 10px}
}

/* public view (big screen / watchers) */
.rk.pub .rk-side{display:flex;flex-direction:column;gap:8px;width:clamp(240px,23cqw,380px);flex:none}
.rk-side .ps{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;background:#fff;border-radius:18px;padding:8px 12px;box-shadow:0 3px 0 var(--line);transition:transform .3s,background .3s}
.rk-side .ps img{width:48px;height:48px}
.rk-side .ps .nm{font-weight:900;font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rk-side .ps .sub2{font-size:14px;font-weight:700;color:var(--mute)}
.rk-side .ps .sv{font-family:var(--round);font-weight:700;font-size:26px}
.rk-side .ps.dn{background:#eefcf3}
.rk-side .ps .bd{display:inline-grid;place-items:center;min-width:26px;height:26px;border-radius:13px;background:var(--ink);color:#fff;font-family:var(--round);font-size:14px;padding:0 6px;margin-left:4px}
.rk-side .ps.off{opacity:.45}
.rk-side .hd{font-weight:900;color:var(--mute);font-size:15px;padding:0 4px}
@container rk (aspect-ratio < 1) {
  .rk.pub .rk-mid{flex-direction:column}
  .rk.pub .rk-side{width:auto;flex-direction:row;flex-wrap:wrap}
  .rk.pub .rk-side .hd{display:none}
  .rk.pub .rk-side .ps{padding:4px 8px;gap:6px}
  .rk.pub .rk-side .ps img{width:30px;height:30px}
  .rk.pub .rk-side .ps .nm{font-size:14px}.rk.pub .rk-side .ps .sv{font-size:16px}.rk.pub .rk-side .ps .sub2{display:none}
}
.rk.tv .rk-top{padding:16px 24px 10px;gap:18px}
.rk.tv .rk-rd{font-size:26px}
.rk.tv .rk-ty{font-size:28px;padding:6px 20px 6px 14px}
.rk.tv .rk-bar{height:22px}
.rk.tv .rk-sec{font-size:36px;min-width:52px}
.rk.tv .rk-mid{padding:0 24px 12px;gap:22px}
.rk.tv .rk-q{font-size:38px}
.rk.tv .rk-who{min-height:84px;padding:0 24px 16px;gap:12px}
.rk.tv .rk-who .lb{font-size:22px}
.rk.tv .rk-av{width:64px;height:64px}
.rk.tv .rk-av b{font-size:16px;min-width:26px;height:26px;border-radius:13px}
.rk.tv .rk-ready{padding:40px 60px;gap:14px}
.rk.tv .rk-rno{font-size:28px}
.rk.tv .rk-rhint{font-size:30px;max-width:900px}
.rk.tv .rk-rev{width:min(96%,1300px);padding:28px;gap:16px}
.rk.tv .rk-ans .lb{font-size:22px}
.rk.tv .rk-ansv{font-size:72px;gap:18px}
.rk.tv .rk-ansv .vs{font-size:30px}
.rk.tv .rk-ansv .sw{width:70px;height:70px;border-radius:18px}
.rk.tv .rk-ansv .tk{min-width:84px;height:84px;border-radius:18px}
.rk.tv .rk-fast{font-size:30px}
.rk.tv .rk-fast img{width:64px;height:64px}
.rk.tv .rk-row{grid-template-columns:34px 60px minmax(80px,auto) 1fr minmax(130px,auto) auto;font-size:28px;gap:14px}
.rk.tv .rk-row img{width:60px;height:60px}
.rk.tv .rk-row .trk{height:36px;border-radius:18px}
.rk.tv .rk-row .trk i{border-radius:18px}
.rk.tv .rk-row .gn{font-size:20px}
.rk.tv .rk-row .sv{min-width:80px}
.rk.tv .rk-nx{font-size:22px}
.rk.tv .rk-react{font-size:80px}

/* kid mode: rounder, bigger */
.rk.kid .rk-nums button{border-radius:22px}
.rk.kid .rk-st{font-size:22px}

@keyframes rkPop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
.rk-it,.rk-dot,.rk-grid button{animation-name:rkPopC}
.rk-grid button.hit{animation-name:rkHi}
@keyframes rkPopC{0%{opacity:0;scale:.3}100%{opacity:1;scale:1}}
@keyframes rkIn{0%{transform:translateY(30px) scale(.9);opacity:0}100%{transform:none;opacity:1}}
@keyframes rkFade{from{opacity:0}to{opacity:1}}
@keyframes rkBob{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(-10px) rotate(6deg)}}
@keyframes rkHi{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes rkPulse{from{opacity:1}to{opacity:.55}}
@keyframes rkShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}
`;
  function injectCSS() {
    if (document.getElementById('rk-css')) return;
    const s = document.createElement('style'); s.id = 'rk-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  const DOTC = ['#5b5bf7', '#ff7a45', '#22c26a', '#ec4899', '#0ea5e9', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#64748b', '#a855f7', '#10b981'];

  LGAMES.push({
    id: 'race', name: '腦力快手', icon: '⚡', col: '#ff7a45', blurb: '同一題同時出現在每支手機，比誰又快又對', players: [1, 6],
    rules: kid => kid ? [
      '👀 每一題大家的手機會同時出現',
      '🔍 找不同、🧮 數一數、➕ 加一加、🧠 記一記、🚦 變綠色就按…',
      '⚡ 又快又對分數最多',
      '按錯沒關係，再試一次！'
    ] : [
      '每一題同時出現在每個人的手機上，各自作答',
      '題型：找不同、數一數、心算、記憶、反應、顏色字、按順序',
      '答對 100 分＋速度加分最多 100，第一個答對再加 ⚡50',
      '答錯就鎖住等下一題；反應題太早按扣 30 分'
    ],

    host(ctx) {
      const kid = ctx.kid, ids = ctx.players.map(p => p.id), now = () => ctx.now();
      const plan = makePlan(kid);
      const score = {}, okN = {}, firstN = {};
      ids.forEach(id => { score[id] = 0; okN[id] = 0; firstN[id] = 0; });
      const READY = kid ? 3 : 2.5, REVEAL = kid ? 5.5 : 5;
      let ri = -1, ph = 'ready', tEnd = 0, tOpen = 0, dur = 0, cur = null, st = {}, okCount = 0, doneOrder = [], green = false, greenAt = 0, res = null, prevSc = null, over = false;

      const next = () => {
        ri++;
        if (ri >= plan.length) { over = true; return; }
        const it = plan[ri];
        cur = GEN[it.t](kid, it.lv); cur.t = it.t;
        st = {}; ids.forEach(id => st[id] = { st: '', t: 0, pts: 0, wn: 0, cool: 0, prog: 0, frz: 0, rank: 0, first: 0, rt: 0, early: 0 });
        okCount = 0; doneOrder = []; green = false; res = null;
        ph = 'ready'; dur = READY; tEnd = now() + READY; ctx.push();
      };
      const open = () => {
        ph = 'go'; tOpen = now(); dur = cur.dur;
        if (cur.t === 'react') { greenAt = tOpen + cur.wait; tEnd = greenAt + cur.dur; }
        else tEnd = tOpen + dur;
        ctx.push();
      };
      const finished = s => s.st === 'ok' || s.st === 'out';
      const allDone = () => { const on = ids.filter(id => ctx.online(id)); return on.length > 0 && on.every(id => finished(st[id])); };
      const correct = (id, t) => {
        const s = st[id]; okCount++;
        s.st = 'ok'; s.t = r2(t); s.rank = okCount;
        s.pts = 100 + Math.round(100 * cl(1 - t / dur, 0, 1));
        if (okCount === 1) { s.first = 1; s.pts += 50; }
        doneOrder.push(id);
      };
      const wrong = id => {
        const s = st[id]; s.wn++;
        if (kid) { s.st = 'wrong'; s.cool = now() + 0.8; }
        else { s.st = 'out'; doneOrder.push(id); }
      };
      const reveal = () => {
        ph = 'reveal'; prevSc = Object.assign({}, score);
        if (cur.t === 'react') {
          ids.filter(id => st[id].st === 'ok').sort((a, b) => st[a].rt - st[b].rt).forEach((id, i) => {
            const s = st[id]; s.rank = i + 1; s.pts = 100 + Math.round(100 * cl((900 - s.rt) / 700, 0, 1)); s.first = i === 0 ? 1 : 0; if (s.first) s.pts += 50;
          });
        }
        ids.forEach(id => {
          const s = st[id];
          if (s.st === 'ok') { score[id] += s.pts; okN[id]++; if (s.first) firstN[id]++; }
          else if (s.early && !kid) { s.pts = -30; score[id] = Math.max(0, score[id] - 30); }
          else s.pts = 0;
        });
        res = ids.map(id => { const s = st[id]; return { id, ok: s.st === 'ok' ? 1 : 0, t: s.st === 'ok' ? s.t : null, rk: s.rank, pts: s.pts, f: s.first, e: s.early }; })
          .sort((a, b) => (b.ok - a.ok) || (a.ok ? a.rk - b.rk : 0));
        dur = REVEAL; tEnd = now() + REVEAL; ctx.push();
      };
      next();

      const chView = () => {
        if (ph === 'ready' || !cur) return null;
        if (cur.t === 'memo' && ph === 'go') { const c = Object.assign({}, cur.ch); delete c.seq; return c; }
        return cur.ch;
      };

      return {
        get over() { return over; },
        tick() {
          if (over || !cur) return;
          const t = now();
          if (ph === 'ready') { if (t >= tEnd) { if (cur.show) { ph = 'show'; dur = cur.show; tEnd = t + dur; ctx.push(); } else open(); } }
          else if (ph === 'show') { if (t >= tEnd) open(); }
          else if (ph === 'go') {
            if (cur.t === 'react' && !green && t >= greenAt) { green = true; tOpen = greenAt; ctx.push(); }
            if (t >= tEnd || allDone()) reveal();
          }
          else if (ph === 'reveal') { if (t >= tEnd) next(); }
        },
        view(id) {
          if (!cur || over) return { ph: 'end' };
          const t = now(), v = { ph, r: ri, n: plan.length, ty: cur.t, lv: plan[ri].lv, dur: r1(dur), sc: score };
          v.left = cur.t === 'react' && ph === 'go' && !green ? null : r1(Math.max(0, tEnd - t));
          v.ch = chView();
          if (ph === 'go' || ph === 'reveal') v.done = doneOrder.slice();
          if (cur.t === 'order' && ph !== 'ready') { v.prog = {}; ids.forEach(i => v.prog[i] = st[i].prog); }
          if (cur.t === 'react') v.green = green;
          if (ph === 'reveal') { v.sol = cur.sol; v.res = res; v.prev = prevSc; v.last = ri === plan.length - 1; }
          if (id && st[id]) { const s = st[id]; v.my = { st: s.st, pts: s.pts, rk: s.rank, wn: s.wn, prog: s.prog, frz: s.frz > t ? r1(s.frz - t) : 0, t: s.t, rt: s.rt, e: s.early }; }
          return v;
        },
        msg(id, d) {
          const s = st[id];
          if (!s || !d || ph !== 'go' || d.r !== ri || finished(s)) return;
          const t = now();
          if (kid && s.cool > t) return;
          if (cur.t === 'react') {
            if (!d.tap) return;
            if (!green) {
              s.early = 1; s.wn++;
              if (kid) { s.st = 'early'; s.cool = t + 1; } else { s.st = 'out'; doneOrder.push(id); }
              return;
            }
            const hostMs = (t - greenAt) * 1000;
            let rt = +d.rt; if (!isFinite(rt)) rt = hostMs;
            rt = Math.round(cl(rt, 100, Math.max(100, hostMs + 30)));   // can't be faster than humanly possible, nor slower than the host saw
            s.rt = rt; s.early = 0; s.st = 'ok'; s.t = r2(rt / 1000); doneOrder.push(id); okCount++;
            return;
          }
          if (cur.t === 'order') {
            const n = d.a | 0;
            if (s.frz > t || n < 1 || n > cur.ch.N || n <= s.prog) return;
            if (n === s.prog + 1) { s.prog++; if (s.prog === cur.ch.N) correct(id, t - tOpen); }
            else { s.wn++; if (!kid) s.frz = t + 1; }
            return;
          }
          if (CHECK[cur.t](d.a, cur.sol)) correct(id, t - tOpen); else wrong(id);
        },
        leave() { ctx.push(); },
        results() {
          return {
            rows: ids.map(id => ({ id, key: score[id], line: `${score[id]} 分 · 答對 ${okN[id]}/${plan.length} 題${firstN[id] ? ` · ⚡最快 ${firstN[id]} 次` : ''}` })),
            sub: kid ? '每個人都好棒！🎉' : ''
          };
        }
      };
    },

    client(root, api) {
      injectCSS();
      const pub = api.me == null, kid = api.kid, tv = api.isTable;
      root.innerHTML = `<div class="rk ${pub ? 'pub' : 'me'} ${tv ? 'tv' : ''} ${kid ? 'kid' : ''}">
        <div class="rk-top"><span class="rk-rd"></span><span class="rk-ty"></span><div class="rk-bar"><i></i></div><span class="rk-sec"></span></div>
        <div class="rk-mid"><div class="rk-body"><div class="rk-q"></div><div class="rk-ch"></div><div class="rk-in"></div>${pub ? '' : '<div class="rk-st"></div>'}</div>${pub ? '<div class="rk-side"></div>' : ''}</div>
        <div class="rk-who"></div>
        <div class="rk-ov"></div></div>`;
      const el = root.firstElementChild, q = s => el.querySelector(s);
      const E = { rd: q('.rk-rd'), ty: q('.rk-ty'), bar: q('.rk-bar'), barI: q('.rk-bar i'), sec: q('.rk-sec'), qq: q('.rk-q'), ch: q('.rk-ch'), inp: q('.rk-in'), st: q('.rk-st'), who: q('.rk-who'), side: q('.rk-side'), ov: q('.rk-ov') };
      let V = null, key = '', deadline = 0, durMs = 1, raf = 0, lastSec = -1, prevMy = null, pend = 0, local = {}, whoSeen = new Set(), greenT = 0, frzUntil = 0, stamped = '';
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const avatar = (id, s) => api.avatar(P(id), s || 96);
      const send = d => { if (V) api.send(Object.assign({ r: V.r }, d)); };
      const ty = () => T[V.ty] || T.odd;
      const canAct = () => !pub && V && V.ph === 'go' && V.my && V.my.st !== 'ok' && V.my.st !== 'out' && performance.now() > pend;
      const shake = n => { if (!n) return; n.classList.remove('rk-shake'); void n.offsetWidth; n.classList.add('rk-shake'); };
      const setSt = (txt, cls) => { if (!E.st) return; E.st.className = 'rk-st' + (cls ? ' ' + cls : ''); E.st.innerHTML = txt || ''; };

      /* ---------- builders ---------- */
      function buildReady() {
        const t = ty(), [toks, hi] = t.demo;
        const name = kid && t.kn ? t.kn : t.n;
        E.ov.innerHTML = `<div class="rk-ready"><div class="rk-rno">第 ${V.r + 1} / ${V.n} 題</div><div class="rk-ric">${t.ic}</div><div class="rk-rname">${name}</div>
          <div class="rk-demo">${toks.map((x, i) => `<span class="${i === hi ? 'hi' : ''}">${x}</span>`).join('')}</div>
          <div class="rk-rhint">${H(kid ? t.kid : t.ad)}</div><div class="rk-rcnt"></div></div>`;
        E.ch.innerHTML = ''; E.inp.innerHTML = ''; E.qq.innerHTML = ''; setSt('');
      }
      function numpad(onOk, max) {
        E.inp.innerHTML = `<div class="rk-disp"></div><div class="rk-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button class="dl" data-n="d">⌫</button><button data-n="0">0</button><button class="okb" data-n="ok">${onOk ? 'OK' : '⌫⌫'}</button></div>`;
        const disp = E.inp.querySelector('.rk-disp');
        local.num = '';
        E.inp.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
          if (!canAct()) return;
          const n = b.dataset.n;
          if (n === 'd') local.num = local.num.slice(0, -1);
          else if (n === 'ok') { if (onOk) { if (!local.num) { shake(disp); return; } onOk(local.num); } else local.num = ''; }
          else if (local.num.length < max) { local.num += n; api.sfx('tick'); }
          disp.textContent = local.num;
          if (local.onNum) local.onNum(local.num);
        });
        local.disp = disp;
      }
      function kidNums(onPick) {
        E.inp.innerHTML = `<div class="rk-nums">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-n="${n}" style="color:${DOTC[n - 1]}">${n}</button>`).join('')}</div>`;
        E.inp.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { if (!canAct()) return; local.picked = b; b.style.background = '#ffe7c2'; onPick(+b.dataset.n); });
      }
      const submit = a => { pend = performance.now() + 1200; send({ a }); api.sfx('pop'); };

      function buildChallenge() {
        const c = V.ch || {}, t = ty(), me = !pub;
        E.ch.innerHTML = ''; E.inp.innerHTML = ''; E.qq.innerHTML = ''; local = {}; stamped = '';
        switch (V.ty) {
          case 'odd': {
            E.qq.textContent = kid ? '👆 哪一個不一樣？' : '找出不一樣的那一個';
            E.ch.innerHTML = `<div class="rk-grid" style="--cols:${c.cols}">${c.cells.map((e, i) => `<button data-i="${i}" style="animation-delay:${(i % c.cols + (i / c.cols | 0)) * 18}ms">${e}</button>`).join('')}</div>`;
            if (me) E.ch.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
              if (!canAct()) return;
              E.ch.querySelectorAll('.pk').forEach(x => x.classList.remove('pk')); b.classList.add('pk'); local.picked = b; submit(+b.dataset.i);
            });
            break;
          }
          case 'count': {
            E.qq.innerHTML = kid ? `有幾個 <span style="font-size:1.5em">${c.tgt}</span> ？` : `有幾個 <span style="font-size:1.4em">${c.tgt}</span> ？${c.not ? `<span style="color:var(--mute);font-size:.85em">（不算 ${c.not}）</span>` : ''}`;
            E.ch.innerHTML = `<div class="rk-board" style="--g:${c.g}">${c.items.map((it, i) => `<span class="rk-it" style="left:${it[1]}%;top:${it[2]}%;--rt:${it[3]}deg;animation-delay:${i * 15}ms">${it[0] ? c.tgt : c.not}</span>`).join('')}</div>`;
            if (me) { if (kid) kidNums(n => submit(n)); else numpad(s => submit(+s), 3); }
            break;
          }
          case 'math': {
            const p = c.p;
            if (kid) {
              E.ch.innerHTML = `<div class="rk-kmath"><div class="grp"><div><div class="set">${c.e.repeat(p[0])}</div><div class="num">${p[0]}</div></div>
                <div class="num" style="color:var(--tc)">＋</div><div><div class="set">${c.e.repeat(p[2])}</div><div class="num">${p[2]}</div></div></div>
                <div class="rk-math"><span class="op">＝</span><span class="q">？</span></div></div>`;
              if (me) kidNums(n => submit(n));
            } else {
              E.ch.innerHTML = `<div class="rk-math">${p.map(x => typeof x === 'number' ? `<span>${x}</span>` : `<span class="op">${x}</span>`).join('')}<span class="op">=</span><span class="q" id="rkMq">？</span></div>`;
              if (me) { numpad(s => submit(+s), 4); E.inp.querySelector('.rk-disp').remove(); local.onNum = s => { const m = E.ch.querySelector('#rkMq'); if (m) m.textContent = s || '？'; }; }
            }
            break;
          }
          case 'memo': {
            if (V.ph === 'show') {
              E.qq.innerHTML = kid ? '👀 看清楚！' : '記住這個順序！';
              E.ch.innerHTML = `<div class="rk-seq">${c.seq.map((x, i) => `<span style="animation-delay:${i * 90}ms">${x}</span>`).join('')}</div>`;
              break;
            }
            E.qq.innerHTML = kid ? '👆 照順序按出來' : '照順序輸入剛剛的' + (c.k === 'd' ? '數字' : '圖案');
            local.seq = [];
            const slots = () => { E.ch.innerHTML = `<div class="rk-seq">${Array.from({ length: c.len }, (_, i) => local.seq[i] != null ? `<span class="f">${local.seq[i]}</span>` : '<span class="em"></span>').join('')}</div>` + (pub ? `<div class="rk-peek" style="position:absolute;bottom:4%">🧠 大家正在回想…</div>` : ''); };
            local.slots = slots; slots();
            if (!me) break;
            const add = x => {
              if (!canAct() || local.seq.length >= c.len) return;
              local.seq.push(x); slots(); api.sfx('tick');
              if (local.seq.length === c.len) submit(local.seq.slice());
            };
            if (c.k === 'd') {
              numpad(null, 99);
              E.inp.querySelector('.rk-disp').remove();
              E.inp.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
                const n = b.dataset.n; if (!canAct()) return;
                if (n === 'd') { local.seq.pop(); slots(); } else if (n === 'ok') { local.seq = []; slots(); } else add(n);
              });
              E.inp.querySelector('.okb').textContent = '清除';
            } else {
              E.inp.innerHTML = `<div class="rk-pal" style="--pc:${c.pal.length > 6 ? 4 : 3}">${c.pal.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>` +
                (kid ? '' : `<div class="rk-pad" style="grid-template-columns:1fr"><button class="dl" data-u="1" style="height:48px;font-size:18px;font-family:var(--sans)">⌫ 退一格</button></div>`);
              E.inp.querySelectorAll('[data-e]').forEach(b => b.onclick = () => add(b.dataset.e));
              const u = E.inp.querySelector('[data-u]'); if (u) u.onclick = () => { if (canAct()) { local.seq.pop(); slots(); } };
            }
            break;
          }
          case 'react': {
            E.ch.innerHTML = `<button class="rk-react"><span class="e">✋</span><span class="tx">${kid ? '等一下…' : '等變綠色…'}</span><small>${me ? (kid ? '變綠色就按我！' : '太早按會犯規') : '大家的手指準備好了嗎？'}</small></button>`;
            const pad = E.ch.querySelector('.rk-react');
            if (me) pad.addEventListener('pointerdown', e => {
              e.preventDefault();
              if (!canAct() || local.tapped) return;
              local.tapped = 1; pend = performance.now() + 900;
              if (greenT) { send({ tap: 1, rt: Math.round(performance.now() - greenT) }); api.sfx('pop'); api.vibrate(30); }
              else { send({ tap: 1 }); }
            });
            else pad.style.pointerEvents = 'none';
            greenT = 0;
            break;
          }
          case 'stroop': {
            E.qq.textContent = '這個字是用什麼顏色寫的？';
            E.ch.innerHTML = `<div class="rk-word" style="color:${INK[c.k][1]}">${INK[c.w][0]}</div>`;
            if (me) {
              E.inp.innerHTML = `<div class="rk-opts">${c.opts.map((o, i) => `<button data-o="${o}" style="color:${c.bi ? INK[c.bi[i]][1] : 'var(--ink)'}">${INK[o][0]}色</button>`).join('')}</div>`;
              E.inp.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { if (!canAct()) return; local.picked = b; b.style.background = '#ffe7c2'; submit(b.dataset.o); });
            } else E.inp.innerHTML = `<div class="rk-opts" style="pointer-events:none">${c.opts.map((o, i) => `<button style="color:${c.bi ? INK[c.bi[i]][1] : 'var(--ink)'}">${INK[o][0]}色</button>`).join('')}</div>`;
            break;
          }
          case 'order': {
            E.qq.innerHTML = kid ? '👆 1 ➜ 2 ➜ 3 …' : `從 1 按到 ${c.N}`;
            E.ch.innerHTML = `<div class="rk-board" style="--g:${c.g}">${c.pos.map((p, i) => `<button class="rk-dot" data-n="${i + 1}" style="left:${p[0]}%;top:${p[1]}%;--dc:${DOTC[i % DOTC.length]};animation-delay:${i * 30}ms">${i + 1}</button>`).join('')}</div>`;
            local.prog = 0;
            if (me) E.ch.querySelectorAll('[data-n]').forEach(b => b.onpointerdown = e => {
              e.preventDefault();
              if (!canAct() || performance.now() < frzUntil) return;
              const n = +b.dataset.n;
              if (n <= local.prog) return;
              if (n === local.prog + 1) { local.prog = n; b.classList.add('dn'); api.sfx('eat', n); send({ a: n }); markOrder(); }
              else { shake(b); api.sfx('wrong'); api.vibrate(60); send({ a: n }); if (!kid) { frzUntil = performance.now() + 1000; setSt('⛔ 按錯了！停 1 秒', 'bad'); setTimeout(() => { if (V && V.ph === 'go' && V.my && V.my.st !== 'ok') setSt(''); }, 1000); } }
            });
            else E.ch.querySelectorAll('.rk-dot').forEach(b => b.style.pointerEvents = 'none');
            markOrder();
            break;
          }
          case 'big': {
            const side = n => c.k === 'n' ? `<span class="bn">${n}</span><span class="bd">${'●'.repeat(n)}</span>` : `<span class="bd" style="font-size:min(${n > 6 ? 9 : 12}cqw,14cqh,64px)">${c.e.repeat(n)}</span>`;
            E.qq.innerHTML = c.k === 'n' ? (kid ? '👆 哪個數字比較大？' : '哪個比較大？') : '👆 哪一邊比較多？';
            E.ch.innerHTML = `<div class="rk-two"><button data-s="0">${side(c.L)}</button><button data-s="1">${side(c.R)}</button></div>`;
            if (me) E.ch.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { if (!canAct()) return; local.picked = b; submit(+b.dataset.s); });
            else E.ch.querySelectorAll('button').forEach(b => b.style.pointerEvents = 'none');
            break;
          }
        }
        if (pub) E.inp.style.pointerEvents = 'none';
      }
      function markOrder() {
        if (V.ty !== 'order') return;
        const p = pub ? 0 : Math.max(local.prog || 0, (V.my && V.my.prog) || 0);
        local.prog = p;
        E.ch.querySelectorAll('.rk-dot').forEach(b => { const n = +b.dataset.n; b.classList.toggle('dn', n <= p); b.classList.toggle('nx', !pub && kid && n === p + 1); });
      }

      function answerHTML() {
        const c = V.ch || {}, s = V.sol;
        switch (V.ty) {
          case 'odd': { const other = c.cells[s === 0 ? 1 : 0]; return `<span class="tk">${c.cells[s]}</span><span class="vs">${kid ? '不一樣' : '不是'}</span><span class="tk lo">${other}</span><span class="vs">第 ${(s / c.cols | 0) + 1} 排第 ${s % c.cols + 1} 個</span>`; }
          case 'count': return `<span>${c.tgt}</span><span class="vs">×</span><b>${s}</b>`;
          case 'math': return kid ? `${c.p[0]} ＋ ${c.p[2]} ＝ <b>${s}</b>` : `${c.p.join(' ')} = <b>${s}</b>`;
          case 'memo': return s.map(x => `<span class="tk">${x}</span>`).join('');
          case 'react': { const f = (V.res || []).find(r => r.ok); return f ? `🟢 <b>${f.t.toFixed(2)}</b><span class="vs">秒</span>` : '🟢'; }
          case 'stroop': return `<span class="sw" style="background:${INK[s][1]}"></span><b style="color:${INK[s][1]}">${INK[s][0]}色</b><span class="vs">（字寫的是「${INK[c.w][0]}」）</span>`;
          case 'order': return `1 <span class="vs">➜</span> <b>${c.N}</b>`;
          case 'big': { const sd = (n, w) => `<span class="tk ${w ? '' : 'lo'}">${c.k === 'n' ? n : c.e + '×' + n}</span>`; return sd(c.L, s === 0) + '<span class="vs">🆚</span>' + sd(c.R, s === 1); }
        }
        return '';
      }
      function buildReveal() {
        E.qq.innerHTML = ''; E.inp.innerHTML = '';
        const res = V.res || [], f = res.find(r => r.ok);
        const tsec = r => r.t != null ? r.t.toFixed(V.ty === 'react' ? 2 : 1) + ' 秒' : '';
        const fast = f ? `⚡ 最快 <img alt="" src="${avatar(f.id)}"> ${H(P(f.id).name)} <span style="color:var(--acc)">${tsec(f)}</span>` : (kid ? '下一題加油！💪' : '這題沒有人答對 😅');
        let mine = '';
        if (!pub && V.my) {
          const m = res.find(r => r.id === api.me) || {};
          if (m.ok) mine = `<div class="rk-mine ok">${m.f ? '⚡ ' : '🎉 '}${kid ? '好棒！' : '答對了！'}第 ${m.rk} 快 · +${m.pts}</div>`;
          else if (m.e && !kid) mine = `<div class="rk-mine bad">🚫 偷跑犯規 −30</div>`;
          else if (V.my.st === 'out') mine = `<div class="rk-mine bad">❌ 答錯了</div>`;
          else mine = `<div class="rk-mine mid">⏰ ${kid ? '下次再快一點！' : '時間到'}</div>`;
        }
        const ids = api.players().map(p => p.id), sc = V.sc || {}, pv = V.prev || sc;
        const order = ids.slice().sort((a, b) => (sc[b] || 0) - (sc[a] || 0));
        const mx = Math.max(1, ...ids.map(i => sc[i] || 0));
        const gain = {}; res.forEach(r => gain[r.id] = r);
        const rows = order.map((id, i) => {
          const p = P(id), cc = api.color(p), g = gain[id] || {};
          const gt = g.pts > 0 ? `+${g.pts}${g.f ? '⚡' : ''}` : g.pts < 0 ? `${g.pts}` : '';
          return `<div class="rk-row ${id === api.me ? 'me' : ''}"><span class="rkn">${i + 1}</span><img alt="" src="${avatar(id)}"><span class="nm">${H(p.name)}</span>
            <div class="trk"><i style="--pc:${cc.c};width:${(pv[id] || 0) / mx * 100}%" data-w="${(sc[id] || 0) / mx * 100}"></i></div><span class="gn ${g.pts < 0 ? 'neg' : ''}">${gt}${gt && g.t != null && !kid ? '<br><small>' + tsec(g) + '</small>' : ''}</span><span class="sv">${sc[id] || 0}</span></div>`;
        }).join('');
        E.ov.innerHTML = `<div class="rk-rev" style="--tc:${ty().c}"><div class="rk-ans"><div class="lb">${ty().ic} 答案</div><div class="rk-ansv">${answerHTML()}</div></div>
          <div class="rk-fast">${fast}</div>${mine}<div class="rk-sb">${rows}</div><div class="rk-nx">${V.last ? '🏁 最後結果馬上揭曉…' : '下一題準備…'}</div></div>`;
        requestAnimationFrame(() => requestAnimationFrame(() => E.ov.querySelectorAll('.trk i').forEach(i => i.style.width = i.dataset.w + '%')));
      }

      /* ---------- live updates ---------- */
      function drawWho() {
        if (!V || (V.ph !== 'go' && V.ph !== 'reveal') || V.ty === undefined) { E.who.innerHTML = ''; whoSeen.clear(); return; }
        if (V.ph === 'reveal') return;
        const done = V.done || [];
        if (!E.who.firstChild && done.length) E.who.innerHTML = `<span class="lb">${kid ? '✅' : '已作答'}</span>`;
        done.forEach((id, i) => {
          if (whoSeen.has(id)) return; whoSeen.add(id);
          const d = document.createElement('span'); d.className = 'rk-av' + (kid ? ' ok' : '');
          d.innerHTML = `<img alt="" src="${avatar(id)}"><b>${i + 1}</b>`;
          E.who.appendChild(d);
          if (pub || id !== api.me) api.sfx('pop');
        });
      }
      function drawSide() {
        if (!E.side || !V) return;
        const ids = api.players().map(p => p.id), sc = V.sc || {};
        const order = ids.slice().sort((a, b) => (sc[b] || 0) - (sc[a] || 0));
        const done = V.done || [];
        E.side.innerHTML = `<div class="hd">🏆 分數</div>` + order.map(id => {
          const p = P(id), di = done.indexOf(id);
          let sub = '';
          if (V.ph === 'go') sub = V.ty === 'order' && V.prog ? `${V.prog[id] || 0} / ${V.ch.N}` : di >= 0 ? '已作答 ✋' : (p.online === false ? '離線' : '想想看…');
          return `<div class="ps ${di >= 0 && V.ph === 'go' ? 'dn' : ''} ${p.online === false ? 'off' : ''}"><img alt="" src="${avatar(id)}"><div style="min-width:0"><div class="nm">${H(p.name)}${di >= 0 && V.ph === 'go' ? `<span class="bd">${di + 1}</span>` : ''}</div><div class="sub2">${sub}</div></div><span class="sv">${sc[id] || 0}</span></div>`;
        }).join('');
      }
      function stamp(kind, e, t, s) {
        const k = kind + t; if (stamped === k) return; stamped = k;
        const old = E.ch.querySelector('.rk-stamp'); if (old) old.remove();
        const d = document.createElement('div'); d.className = 'rk-stamp ' + kind;
        d.innerHTML = `<div class="e">${e}</div><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}`;
        E.ch.appendChild(d);
      }
      function drawMine() {
        if (pub || !V.my || V.ph !== 'go') return;
        const m = V.my, pm = prevMy || {};
        if (V.ty === 'react') {
          const pad = E.ch.querySelector('.rk-react');
          if (pad && V.green && !greenT && m.st !== 'out') { greenT = performance.now(); pad.classList.add('g'); pad.querySelector('.e').textContent = '👆'; pad.querySelector('.tx').textContent = '按！'; api.sfx('go'); api.vibrate(40); }
          if (m.st === 'early' && m.wn !== pm.wn) {
            api.sfx('buzz'); api.vibrate(150); local.tapped = 0; pend = performance.now() + 1000;
            if (pad) { pad.classList.add('x'); pad.querySelector('.tx').textContent = '太早了！'; shake(pad); setTimeout(() => { if (pad.isConnected && !greenT) { pad.classList.remove('x'); pad.querySelector('.tx').textContent = '等一下…'; } else if (pad.isConnected) pad.classList.remove('x'); }, 1000); }
            setSt('🙈 太早了！等綠色再按', 'bad');
          }
          if (m.st === 'out' && m.e && pm.st !== 'out') { api.sfx('buzz'); api.vibrate(200); if (pad) { pad.classList.remove('g'); pad.classList.add('x'); pad.querySelector('.e').textContent = '🚫'; pad.querySelector('.tx').textContent = '偷跑犯規！'; } setSt('🚫 太早按了，這題 −30', 'bad'); }
          if (m.st === 'ok' && pm.st !== 'ok') { stamp('ok', '⚡', (m.rt / 1000).toFixed(3) + ' 秒', kid ? '好快！🎉' : '等大家按完就知道名次'); setSt('👍 按到了！', 'ok'); }
          return;
        }
        if (V.ty === 'order') { markOrder(); if (m.frz && !kid) frzUntil = Math.max(frzUntil, performance.now() + m.frz * 1000); }
        if (m.st === 'ok' && pm.st !== 'ok') {
          pend = 0;
          if (local.picked) local.picked.classList.add('hit');
          api.sfx(m.rk === 1 ? 'star' : 'right'); api.vibrate(m.rk === 1 ? [40, 40, 80] : 60);
          const txt = kid ? '好棒！🎉' : '答對了！';
          stamp('ok', m.rk === 1 ? '⚡' : '✅', txt, `第 ${m.rk} 快 · +${m.pts}`);
          setSt(`${m.rk === 1 ? '⚡ ' : ''}${txt} 第 ${m.rk} 快 · +${m.pts}`, 'ok');
          E.inp.classList.add('off');
        } else if (m.st === 'out' && pm.st !== 'out') {
          pend = 0;
          if (local.picked) local.picked.classList.add('no');
          api.sfx('wrong'); api.vibrate(200);
          stamp('bad', '🔒', '答錯了', '等下一題再加油');
          setSt('❌ 答錯了，等下一題', 'bad');
          E.inp.classList.add('off');
        } else if (m.wn > (pm.wn || 0) && m.st === 'wrong') {
          pend = performance.now() + 800;
          api.sfx('wrong'); api.vibrate(120);
          shake(local.picked || E.ch.firstElementChild); shake(E.inp);
          if (local.picked) { const pk = local.picked; pk.classList.add('no'); setTimeout(() => { pk.classList.remove('no', 'pk'); pk.style.background = ''; }, 800); }
          if (local.seq) { setTimeout(() => { local.seq = []; local.slots && local.slots(); }, 500); }
          local.num = ''; if (local.disp) local.disp.textContent = ''; if (local.onNum) local.onNum('');
          setSt('😊 不對喔，再試一次！', 'bad');
          setTimeout(() => { if (V && V.my && V.my.st === 'wrong') setSt(''); }, 1400);
        } else if (m.wn > (pm.wn || 0) && V.ty === 'order' && kid) { setSt('找 ' + (m.prog + 1) + ' 喔！', 'info'); }
      }
      function drawHeader() {
        const t = ty();
        el.style.setProperty('--tc', t.c);
        E.rd.textContent = `${V.r + 1} / ${V.n}`;
        E.ty.innerHTML = `<span>${t.ic}</span>${kid && t.kn ? t.kn : t.n}`;
        E.bar.style.visibility = (V.ph === 'go' || V.ph === 'show') && !(V.ty === 'react' && !V.green) ? '' : 'hidden';
        E.sec.style.visibility = E.bar.style.visibility;
      }
      function phaseSound() {
        if (V.ph === 'ready') api.sfx('turn');
        else if (V.ph === 'show') api.sfx('flip');
        else if (V.ph === 'go' && V.ty !== 'react') { api.sfx('go'); }
        else if (V.ph === 'reveal') api.sfx(V.last ? 'end' : 'coin');
      }

      function loop() {
        raf = requestAnimationFrame(loop);
        if (!V) return;
        const now = performance.now();
        const left = deadline ? Math.max(0, deadline - now) : 0;
        if (V.ph === 'go' || V.ph === 'show') {
          const live = !(V.ty === 'react' && !V.green);
          const fr = live ? cl(left / durMs, 0, 1) : 1;
          E.barI.style.transform = `scaleX(${fr})`;
          E.bar.classList.toggle('warn', live && fr < 0.5 && fr >= 0.25);
          E.bar.classList.toggle('crit', live && fr < 0.25);
          const sec = live ? Math.ceil(left / 1000) : '';
          if (E.sec.textContent !== String(sec)) E.sec.textContent = sec;
          if (live && V.ph === 'go' && sec !== lastSec) { lastSec = sec; if (sec > 0 && sec <= 3 && (pub || (V.my && V.my.st !== 'ok' && V.my.st !== 'out'))) api.sfx('tick'); }
        } else if (V.ph === 'ready') {
          const c = E.ov.querySelector('.rk-rcnt'), s = Math.ceil(left / 1000);
          if (c && c.textContent !== String(s)) { c.textContent = s > 0 ? s : 'GO!'; }
        }
      }
      raf = requestAnimationFrame(loop);

      return {
        view(v) {
          if (!v || v.ph === 'end' || !v.ty) return;
          const k = v.ph + ':' + v.r, changed = k !== key;
          V = v;
          if (changed) { key = k; prevMy = null; pend = 0; frzUntil = 0; lastSec = -1; E.inp.classList.remove('off'); E.inp.style.pointerEvents = ''; if (v.ph !== 'reveal') { E.who.innerHTML = ''; whoSeen.clear(); } }
          if (v.left != null) {
            const d = performance.now() + v.left * 1000;
            if (changed || !deadline || Math.abs(d - deadline) > 600 || (v.ty === 'react' && v.ph === 'go' && durMs !== v.dur * 1000)) deadline = d;
            durMs = Math.max(1, v.dur * 1000);
          } else if (changed) deadline = 0;
          if (changed) {
            drawHeader();
            if (v.ph === 'ready') { E.ov.classList.add('dim'); buildReady(); }
            else if (v.ph === 'reveal') { E.ov.classList.add('dim'); buildReveal(); }
            else { E.ov.innerHTML = ''; E.ov.classList.remove('dim'); buildChallenge(); setSt(v.ph === 'show' ? (kid ? '👀 記住它！' : '👀 記住順序…') : (kid ? '👆 快！' : '⚡ 開始！'), 'info'); }
            phaseSound();
            if (v.ph === 'go' && !pub) api.vibrate(25);
          }
          if (pub && v.ty === 'react' && v.ph === 'go' && v.green) {
            const pad = E.ch.querySelector('.rk-react');
            if (pad && !pad.classList.contains('g')) { pad.classList.add('g'); pad.querySelector('.e').textContent = '👆'; pad.querySelector('.tx').textContent = '按！'; api.sfx('go'); }
          }
          if (v.ty === 'react' && v.ph === 'go' && v.green && E.bar.style.visibility) drawHeader();
          drawMine(); drawWho(); drawSide();
          prevMy = v.my ? Object.assign({}, v.my) : null;
        },
        destroy() { cancelAnimationFrame(raf); }
      };
    },

    bot(v, api) {
      if (!v || !v.my || !v.ch) return;
      const mem = api.__rk || (api.__rk = {});
      if (v.ph === 'show' && v.ch.seq) mem.seq = { r: v.r, s: v.ch.seq.slice() };
      if (v.ph !== 'go') return;
      const m = v.my, c = v.ch;
      if (m.st === 'ok' || m.st === 'out') return;
      if (v.ty === 'react') {
        if (!v.green) { if (Math.random() < 0.02) api.send({ r: v.r, tap: 1 }); return; }
        if (Math.random() < 0.5) api.send({ r: v.r, tap: 1, rt: 180 + Math.random() * 420 });
        return;
      }
      if (Math.random() < 0.55) return;   // think a little
      const good = Math.random() < (api.kid ? 0.7 : 0.6);
      let a;
      switch (v.ty) {
        case 'odd': { const cnt = {}; c.cells.forEach(e => cnt[e] = (cnt[e] || 0) + 1); a = good ? c.cells.findIndex(e => cnt[e] === 1) : R(c.cells.length); break; }
        case 'count': { const n = c.items.filter(i => i[0]).length; a = good ? n : n + (Math.random() < 0.5 ? 1 : -1); break; }
        case 'math': { const n = evalP(c.p.map(x => x === '−' ? '-' : x)); a = good ? n : n + 1 + R(3); break; }
        case 'memo': { const s = mem.seq && mem.seq.r === v.r ? mem.seq.s : null; a = good && s ? s : Array.from({ length: c.len }, () => c.k === 'd' ? String(R(10)) : c.pal[R(c.pal.length)]); break; }
        case 'stroop': a = good ? c.k : c.opts[R(c.opts.length)]; break;
        case 'order': a = good ? m.prog + 1 : 1 + R(c.N); break;
        case 'big': a = good ? (c.L > c.R ? 0 : 1) : R(2); break;
        default: return;
      }
      api.send({ r: v.r, a });
    }
  });
})();

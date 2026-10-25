'use strict';
/* 貪食蛇大戰 — real-time arena: every phone's camera follows its own snake across a big garden.
   Host simulates at ~30 Hz, sends each player only what is near them at 15 Hz; clients interpolate. */
(() => {
  const TAU = Math.PI * 2;
  const START = 12, MAXSEG = 150, RESPAWN = 3;
  const segsFor = len => Math.max(4, Math.min(MAXSEG, Math.round(START + (len - START) * 0.6)));
  const rad = len => 11 + Math.min(15, Math.sqrt(Math.max(1, len)) * 0.9);
  const wrapA = a => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
  const angD = (a, b) => wrapA(a - b);
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const rr = (a, b) => a + Math.random() * (b - a);
  const FOODC = ['#ff5d73', '#ffb020', '#ffe14d', '#5ee07a', '#3fc8ff', '#8b8bff', '#ff7ad9', '#ffffff'];
  const FOODR = [5.5, 7.5, 10], FOODV = [1, 2, 3];
  const TREATS = ['🍎', '🍓', '🍒', '🍉', '🧁', '🍩', '🍇', '🍌'];
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };

  const CSS = `
.sn-root{position:absolute;inset:0;overflow:hidden;background:#5e9e4a;touch-action:none}
.sn-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
.sn-hud{position:absolute;inset:0;pointer-events:none;font-family:var(--sans)}
.sn-chip{position:absolute;background:rgba(255,255,255,.88);border-radius:16px;box-shadow:0 3px 0 rgba(40,80,30,.25);padding:6px 12px}
.sn-me{left:10px;top:10px;display:flex;align-items:center;gap:8px}
.sn-me img{width:38px;height:38px}
.sn-me .big{font-family:var(--round);font-weight:700;font-size:30px;line-height:1;color:#1f2346}
.sn-me .big small{font-family:var(--sans);font-size:13px;font-weight:900;color:#6b7196;margin-left:2px}
.sn-me .sm{font-size:12px;font-weight:900;color:#6b7196;line-height:1.3}
.sn-me .rk{display:inline-block;background:#ffd166;color:#7a4c00;border-radius:999px;padding:0 8px;font-size:12.5px;margin-right:4px}
.sn-time{right:10px;top:10px;font-family:var(--round);font-weight:700;font-size:24px;color:#1f2346;min-width:78px;text-align:center}
.sn-time.hot{background:#ff5d73;color:#fff;animation:sn-pulse .5s infinite alternate}
@keyframes sn-pulse{to{transform:scale(1.08)}}
.sn-lb{right:10px;top:62px;padding:6px 8px;display:flex;flex-direction:column;gap:2px;min-width:118px}
.sn-lb .r{display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:900;color:#1f2346;line-height:1.25}
.sn-lb .r img{width:20px;height:20px}
.sn-lb .r .n{flex:1;max-width:62px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.sn-lb .r .v{font-family:var(--round);font-weight:700}
.sn-lb .r.me{color:#3a36c4}
.sn-lb .r.dead{opacity:.45}
.sn-mm{position:absolute;left:10px;bottom:12px;border-radius:12px;box-shadow:0 3px 0 rgba(40,80,30,.25);background:rgba(255,255,255,.55)}
.sn-boost{position:absolute;right:16px;bottom:22px;width:92px;height:92px;border-radius:50%;pointer-events:auto;touch-action:none;
  background:radial-gradient(circle at 35% 30%,#ffb38a,#ff7a45 60%,#d65a26);color:#fff;font-weight:900;font-size:21px;
  box-shadow:0 6px 0 #a8441b,0 10px 20px rgba(0,0,0,.2);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;
  -webkit-user-select:none;user-select:none;transition:transform .08s}
.sn-boost small{font-size:11px;font-weight:700;opacity:.9}
.sn-boost.on{transform:translateY(4px) scale(.96);box-shadow:0 2px 0 #a8441b}
.sn-boost.off{filter:grayscale(.8);opacity:.6}
.sn-dead{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);background:rgba(31,35,70,.82);color:#fff;border-radius:24px;padding:16px 26px;text-align:center;
  font-weight:900;font-size:20px;white-space:nowrap;animation:sn-pop .3s ease-out}
.sn-dead b{display:block;font-family:var(--round);font-size:64px;line-height:1.05;color:#ffd166}
@keyframes sn-pop{from{transform:translate(-50%,-50%) scale(.6);opacity:0}}
.sn-hint{position:absolute;left:50%;bottom:130px;transform:translateX(-50%);background:rgba(31,35,70,.75);color:#fff;border-radius:999px;padding:9px 16px;
  font-weight:900;font-size:15px;white-space:nowrap;transition:opacity .6s;animation:sn-bob 1.2s ease-in-out infinite alternate}
@keyframes sn-bob{to{transform:translateX(-50%) translateY(-6px)}}
.sn-big{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-family:var(--round);font-weight:700;font-size:64px;color:#fff;
  text-shadow:0 4px 0 rgba(0,0,0,.25);animation:sn-pop .3s ease-out}
.sn-side{position:absolute;right:0;top:0;bottom:0;background:linear-gradient(#fffdf4,#f3ffe9);box-shadow:-4px 0 0 rgba(40,80,30,.25);padding:18px 16px;
  display:flex;flex-direction:column;gap:12px;overflow:hidden}
.sn-side h3{margin:0;font-weight:900;font-size:26px;color:#2f6b28;text-align:center}
.sn-side .tm{font-family:var(--round);font-weight:700;font-size:56px;text-align:center;color:#1f2346;line-height:1}
.sn-side .tm.hot{color:#ff3b54;animation:sn-pulse .5s infinite alternate}
.sn-side .md{text-align:center;font-weight:900;color:#6b7196;font-size:15px}
.sn-side .rows{display:flex;flex-direction:column;gap:8px}
.sn-side .r{display:flex;align-items:center;gap:10px;background:#fff;border-radius:16px;padding:6px 10px;box-shadow:0 3px 0 #dfe9d4;transition:transform .3s}
.sn-side .r img{width:46px;height:46px}
.sn-side .r .k{font-family:var(--round);font-weight:700;font-size:22px;width:24px;text-align:center;color:#9aa0c0}
.sn-side .r.first{background:#fff4d6}
.sn-side .r.first .k{color:#e0a100}
.sn-side .r .n{flex:1;min-width:0;font-weight:900;font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sn-side .r .n small{display:block;font-size:12.5px;color:#6b7196;font-weight:700}
.sn-side .r .v{font-family:var(--round);font-weight:700;font-size:28px;color:#2f6b28}
.sn-side .r.dead{opacity:.5}
.sn-pubtop{left:10px;right:10px;top:10px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font-weight:900;font-size:14px}
`;
  function injectCSS() {
    if (document.getElementById('sn-style')) return;
    const s = document.createElement('style'); s.id = 'sn-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ---------- tiny seeded random for decorations (same on every screen) ---------- */
  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- sprites (made once, reused) ---------- */
  const SPR = {};
  function sprites() {
    if (SPR.ok) return SPR;
    const mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
    SPR.dot = FOODC.map(col => mk(48, 48, (g) => {
      const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, col); gr.addColorStop(0.42, col); gr.addColorStop(0.5, col + 'aa'); gr.addColorStop(0.7, col + '33'); gr.addColorStop(1, col + '00');
      g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(20, 19, 3, 0, TAU); g.fill();
    }));
    const emo = (e, px, glow) => mk(80, 80, (g) => {
      if (glow) { const gr = g.createRadialGradient(40, 40, 6, 40, 40, 40); gr.addColorStop(0, 'rgba(255,255,200,.95)'); gr.addColorStop(.55, 'rgba(255,240,150,.45)'); gr.addColorStop(1, 'rgba(255,240,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 80, 80); }
      g.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 40, 43);
    });
    SPR.treat = TREATS.map(e => emo(e, 44, true));
    SPR.deco = ['🌷', '🌼', '🍄', '🌿', '🌻', '🌸'].map(e => emo(e, 54, false));
    SPR.flower = ['#ffffff', '#ffd6e8', '#fff2a8'].map(c => mk(40, 40, (g) => {
      g.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(20 + Math.cos(a) * 8, 20 + Math.sin(a) * 8, 6.5, 0, TAU); g.fill(); }
      g.fillStyle = '#ffb703'; g.beginPath(); g.arc(20, 20, 5, 0, TAU); g.fill();
    }));
    SPR.stone = mk(64, 48, (g) => {
      g.fillStyle = 'rgba(40,70,30,.25)'; g.beginPath(); g.ellipse(32, 36, 26, 9, 0, 0, TAU); g.fill();
      g.fillStyle = '#b9bdc9'; g.beginPath(); g.ellipse(32, 27, 24, 16, 0, 0, TAU); g.fill();
      g.fillStyle = '#d9dce5'; g.beginPath(); g.ellipse(26, 22, 13, 7, -0.3, 0, TAU); g.fill();
    });
    // grass tile: 256 px = 128 world units
    SPR.tile = mk(256, 256, (g) => {
      g.fillStyle = '#a7dd80'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#9fd679'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
      const R = seeded(77);
      g.strokeStyle = '#88c463'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 26; i++) { const x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 9); g.moveTo(x + 3, y); g.lineTo(x + 5, y - 8); g.stroke(); }
      for (let i = 0; i < 8; i++) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.7)' : 'rgba(255,230,120,.8)'; g.beginPath(); g.arc(R() * 256, R() * 256, 2.5, 0, TAU); g.fill(); }
    });
    SPR.ok = true; return SPR;
  }

  LGAMES.push({
    id: 'snake', name: '貪食蛇大戰', icon: '🐍', col: '#22c26a',
    blurb: '每人一條小蛇，吃光點點變超長！', players: [1, 6],
    rules: kid => kid ? [
      '👆 手指按住螢幕拖一拖，小蛇就往那邊爬',
      '🍎 吃亮亮的點點和水果，越吃越長',
      '💫 撞到別人只會「咚」一下彈開，不會輸',
      '⏱ 2 分鐘結束時，最長的小蛇贏！'
    ] : [
      '👆 手指按住拖曳（電腦用方向鍵或滑鼠）控制方向',
      '🍎 吃點點變長；按住「加速」會衝刺，但會變短',
      '💥 頭撞到別人的身體或牆壁就出局，變成一地點點，3 秒後復活',
      '🏆 2 分半內「最長曾到多長」決勝負，讓別人撞上你也有記錄'
    ],

    /* =================================================================== HOST */
    host(ctx) {
      const kid = ctx.kid, N = ctx.players.length;
      const W = Math.round((kid ? 1800 : 2100) + N * 100), H = Math.round(W * 0.7);
      const C = kid
        ? { speed: 112, turn: 4.6, time: 120, treat: 0.14, magnet: 20, food: cl(Math.round(W * H / 11000), 200, 300) }
        : { speed: 150, turn: 4.0, time: 150, treat: 0.06, magnet: 8, food: cl(Math.round(W * H / 15000), 180, 260) };
      let timeLeft = C.time, over = false, endT = 0, fid = 1, evq = 0, pubN = 0, t = 0;
      const foods = [], evs = [];
      const snakes = ctx.players.map((p, i) => ({
        id: p.id, i, name: p.name, col: p.col, animal: p.animal,
        x: 0, y: 0, a: 0, ta: 0, len: START, best: START, kills: 0, deaths: 0, pts: [],
        dead: 0, stun: 0, bcd: 0, boost: false, wantBoost: false, dropT: 0, aiT: 0,
        bx0: 0, by0: 0, bx1: 0, by1: 0, vw: 330, vh: 600, dx: 0, dy: 0, off: false
      }));
      const byId = {}; snakes.forEach(s => byId[s.id] = s);
      const ev = (k, x, y, i) => { evs.push({ q: ++evq, k, x: Math.round(x), y: Math.round(y), i, t }); };
      const addFood = (x, y, k, v) => {
        foods.push({ id: fid, x: cl(x, 12, W - 12), y: cl(y, 12, H - 12), k, v });
        fid = fid >= 99999 ? 1 : fid + 1;
      };
      const randFood = () => {
        const x = rr(30, W - 30), y = rr(30, H - 30);
        if (Math.random() < C.treat) addFood(x, y, 100 + (Math.random() * TREATS.length | 0), kid ? 4 : 5);
        else { const big = Math.random() < (kid ? 0.25 : 0.15) ? 1 : 0; addFood(x, y, (Math.random() * 8 | 0) + big * 8, FOODV[big]); }
      };
      const build = (s, x, y, a) => {
        s.x = x; s.y = y; s.a = s.ta = a; s.len = START; s.stun = 0; s.bcd = 1; s.boost = false; s.dropT = 0;
        const sp = rad(START) * 0.42, p = [];
        for (let k = 0; k < START; k++) p.push(x - Math.cos(a) * sp * k, y - Math.sin(a) * sp * k);
        s.pts = p; bbox(s);
      };
      const bbox = s => {
        const p = s.pts; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let k = 0; k < p.length; k += 2) { const x = p[k], y = p[k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        s.bx0 = x0; s.by0 = y0; s.bx1 = x1; s.by1 = y1;
      };
      const spawn = s => {
        let best = null, bestD = -1;
        for (let k = 0; k < 24; k++) {
          const x = rr(260, W - 260), y = rr(260, H - 260);
          let d = 1e9;
          for (const o of snakes) {
            if (o === s || o.dead > 0) continue;
            const ddx = Math.max(o.bx0 - x, 0, x - o.bx1), ddy = Math.max(o.by0 - y, 0, y - o.by1);
            d = Math.min(d, Math.hypot(ddx, ddy));
          }
          if (d > bestD) { bestD = d; best = [x, y]; }
          if (d > 400) break;
        }
        build(s, best[0], best[1], Math.atan2(H / 2 - best[1], W / 2 - best[0]) + rr(-0.7, 0.7));
      };
      // first spawn: around a ring, all heading the same way round
      snakes.forEach((s, i) => {
        const k = i / N * TAU + 0.4, x = W / 2 + Math.cos(k) * W * 0.3, y = H / 2 + Math.sin(k) * H * 0.3;
        build(s, N === 1 ? W / 2 : x, N === 1 ? H / 2 : y, N === 1 ? 0 : k + Math.PI / 2);
      });
      for (let k = 0; k < C.food; k++) randFood();

      const kill = (s, by) => {
        s.dead = RESPAWN; s.deaths++; s.dx = s.x; s.dy = s.y; s.boost = false; s.wantBoost = false;
        const p = s.pts, segs = p.length / 2, cnt = cl(Math.round(s.len * 0.45), 6, 45), val = s.len * 0.75 / cnt;
        const size = val >= 2.5 ? 2 : val >= 1.5 ? 1 : 0, r = rad(s.len);
        for (let c = 0; c < cnt && foods.length < 460; c++) {
          const j = Math.min(segs - 1, Math.floor(c / cnt * segs)) * 2;
          addFood(p[j] + rr(-r, r), p[j + 1] + rr(-r, r), (Math.random() * 8 | 0) + size * 8, FOODV[size]);
        }
        ev(1, s.x, s.y, s.i);
        ctx.sound(s.id, 'boom');
        if (by) {
          by.kills++;
          ctx.sound(by.id, 'star');
          ctx.toast(by.id, `💥 ${s.name} 撞到你了！擊倒 +1`);
          ctx.toast(s.id, `撞到 ${by.name} 的身體了！`);
        } else ctx.toast(s.id, '撞到牆壁了！');
        s.pts = [];
      };
      const ai = (s, dt) => {
        s.aiT -= dt; s.wantBoost = false;
        const m = 260;
        if (s.x < m || s.x > W - m || s.y < m || s.y > H - m) s.ta = Math.atan2(H / 2 - s.y, W / 2 - s.x);
        else if (s.aiT <= 0) { s.aiT = rr(0.8, 2.2); s.ta = wrapA(s.a + rr(-1.4, 1.4)); }
      };
      const move = (s, dt) => {
        s.off = !ctx.online(s.id);
        if (s.off) ai(s, dt);
        s.bcd = Math.max(0, s.bcd - dt);
        let r = rad(s.len), v = C.speed * (1 - Math.min(0.15, (s.len - START) / 2000));
        if (s.stun > 0) { s.stun -= dt; v *= 0.5; }
        else {
          const tr = C.turn * Math.pow(14 / r, 0.35) * dt;
          s.a = wrapA(s.a + cl(angD(s.ta, s.a), -tr, tr));
        }
        s.boost = !kid && s.wantBoost && s.len > START + 1 && s.stun <= 0;
        if (s.boost) {
          v *= 1.85; s.len = Math.max(START, s.len - 5 * dt); s.dropT -= dt;
          if (s.dropT <= 0) { s.dropT = 0.25; const p = s.pts; if (foods.length < 460) addFood(p[p.length - 2] + rr(-4, 4), p[p.length - 1] + rr(-4, 4), s.col % 8, 1); }
        }
        s.x += Math.cos(s.a) * v * dt; s.y += Math.sin(s.a) * v * dt;
        if (kid) {
          let hit = false;
          if (s.x < r) { s.x = r; s.a = wrapA(Math.PI - s.a); hit = true; }
          if (s.x > W - r) { s.x = W - r; s.a = wrapA(Math.PI - s.a); hit = true; }
          if (s.y < r) { s.y = r; s.a = -s.a; hit = true; }
          if (s.y > H - r) { s.y = H - r; s.a = -s.a; hit = true; }
          if (hit) { s.ta = s.a; s.stun = Math.max(s.stun, 0.25); ev(2, s.x, s.y, s.i); }
        } else if (s.x < r * 0.6 || s.y < r * 0.6 || s.x > W - r * 0.6 || s.y > H - r * 0.6) { kill(s, null); return; }
        // body follows the head like a rope
        const p = s.pts, sp = r * 0.42; p[0] = s.x; p[1] = s.y;
        let x0 = s.x, y0 = s.y, x1 = s.x, y1 = s.y;
        for (let k = 2; k < p.length; k += 2) {
          const ddx = p[k - 2] - p[k], ddy = p[k - 1] - p[k + 1], d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d > sp) { const q = (d - sp) / d; p[k] += ddx * q; p[k + 1] += ddy * q; }
          const x = p[k], y = p[k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        s.bx0 = x0; s.by0 = y0; s.bx1 = x1; s.by1 = y1;
        const want = 2 * segsFor(s.len);
        while (p.length < want) p.push(p[p.length - 2], p[p.length - 1]);
        if (p.length > want) p.length = want;
      };
      const eat = s => {
        const r = rad(s.len), R = r + 8 + C.magnet, R2 = R * R;
        let got = 0;
        for (let k = foods.length - 1; k >= 0; k--) {
          const f = foods[k], ddx = f.x - s.x; if (ddx > R || ddx < -R) continue;
          const ddy = f.y - s.y; if (ddy > R || ddy < -R) continue;
          if (ddx * ddx + ddy * ddy < R2) { got += f.v; foods[k] = foods[foods.length - 1]; foods.pop(); }
        }
        if (got) { s.len += got; if (s.len > s.best) s.best = s.len; }
      };
      const collide = () => {
        const hits = [];
        for (const a of snakes) {
          if (a.dead > 0 || (kid && a.bcd > 0)) continue;
          const ra = rad(a.len);
          for (const b of snakes) {
            if (b === a || b.dead > 0) continue;
            const rb = rad(b.len), m = ra + rb;
            if (a.x < b.bx0 - m || a.x > b.bx1 + m || a.y < b.by0 - m || a.y > b.by1 + m) continue;
            const lim = (ra * 0.7 + rb * 0.85), L2 = lim * lim, p = b.pts;
            for (let k = 0; k < p.length; k += 2) {
              const ddx = a.x - p[k], ddy = a.y - p[k + 1];
              if (ddx * ddx + ddy * ddy < L2) { hits.push([a, b, p[k], p[k + 1]]); break; }
            }
            if (hits.length && hits[hits.length - 1][0] === a) break;
          }
        }
        for (const [a, b, px, py] of hits) {
          if (kid) {
            let aw = Math.atan2(a.y - py, a.x - px);
            if (!isFinite(aw)) aw = a.a + Math.PI;
            a.a = a.ta = wrapA(aw + rr(-0.35, 0.35));
            a.x += Math.cos(a.a) * 10; a.y += Math.sin(a.a) * 10;
            a.stun = 0.55; a.bcd = 0.75;
            ev(2, (a.x + px) / 2, (a.y + py) / 2, a.i);
          } else if (a.dead <= 0) kill(a, b);
        }
      };

      const api = {
        rate: 15,
        get over() { return over; },
        tick(dt) {
          if (over) return;
          t += dt;
          if (timeLeft > 0) {
            timeLeft -= dt;
            if (timeLeft <= 0) { timeLeft = 0; endT = 1.2; ctx.sound('*', 'end'); ctx.toast('*', '⏱ 時間到！'); }
          } else { endT -= dt; if (endT <= 0) over = true; return; }
          const steps = dt > 0.05 ? 2 : 1, h = dt / steps;
          for (let st = 0; st < steps; st++) {
            for (const s of snakes) {
              if (s.dead > 0) { s.dead -= h; if (s.dead <= 0) { s.dead = 0; spawn(s); ev(3, s.x, s.y, s.i); ctx.sound(s.id, 'pop'); } continue; }
              move(s, h);
            }
            collide();
            for (const s of snakes) if (s.dead <= 0) eat(s);
          }
          for (let k = 0; k < 4 && foods.length < C.food; k++) randFood();
          while (evs.length && t - evs[0].t > 1.5) evs.shift();
        },
        msg(id, d) {
          const s = byId[id]; if (!s || !d) return;
          if (typeof d.a === 'number' && isFinite(d.a)) s.ta = wrapA(d.a);
          if (d.b !== undefined) s.wantBoost = !kid && !!d.b;
          if (typeof d.vw === 'number' && isFinite(d.vw)) s.vw = cl(d.vw, 150, 1100);
          if (typeof d.vh === 'number' && isFinite(d.vh)) s.vh = cl(d.vh, 150, 1100);
        },
        leave(id) { const s = byId[id]; if (s) s.wantBoost = false; },
        view(id) {
          const me = id == null ? null : byId[id];
          const pub = !me;
          let x0 = -50, y0 = -50, x1 = W + 50, y1 = H + 50;
          if (me) {
            const cx = me.dead > 0 ? me.dx : me.x, cy = me.dead > 0 ? me.dy : me.y, m = 150;
            x0 = cx - me.vw - m; x1 = cx + me.vw + m; y0 = cy - me.vh - m; y1 = cy + me.vh + m;
          }
          const S = [];
          for (const s of snakes) {
            if (s.dead > 0 || !s.pts.length) continue;
            const r = rad(s.len);
            if (s.bx1 + r < x0 || s.bx0 - r > x1 || s.by1 + r < y0 || s.by0 - r > y1) continue;
            const p = s.pts, n = p.length / 2, k = Math.max(2, Math.ceil(n / (pub ? 36 : 48))), out = [];
            let m = 0;
            for (let j = 0; j < n; j += k) { out.push(Math.round(p[2 * j]), Math.round(p[2 * j + 1])); m++; }
            if ((n - 1) % k) out.push(Math.round(p[2 * n - 2]), Math.round(p[2 * n - 1]));
            S.push({ i: s.i, a: Math.round(s.a * 100) / 100, r: Math.round(r * 10) / 10, f: (s.boost ? 1 : 0) | (s.stun > 0 ? 2 : 0) | (s.off ? 4 : 0), k, m, p: out });
          }
          let F;
          if (!pub || (pubN++ % 3 === 0)) {
            F = [];
            for (const f of foods) if (f.x > x0 && f.x < x1 && f.y > y0 && f.y < y1) F.push(f.id, Math.round(f.x), Math.round(f.y), f.k);
          }
          const mm = [], lb = [], E = [];
          for (const s of snakes) {
            mm.push(s.dead > 0 ? -1 : Math.round(s.x / 10), s.dead > 0 ? -1 : Math.round(s.y / 10));
            lb.push(Math.floor(s.len), Math.floor(s.best), s.kills, Math.ceil(s.dead * 10));
          }
          for (const e of evs) if (e.x > x0 && e.x < x1 && e.y > y0 && e.y < y1) E.push(e.q, e.k, e.x, e.y, e.i);
          const v = { t: Math.round(ctx.now() * 1000) / 1000, W, H, kid, tl: Math.ceil(timeLeft), ids: snakes.map(s => s.id), me: me ? me.i : null, s: S, mm, lb, ev: E };
          if (F) v.f = F;
          return v;
        },
        results() {
          return {
            rows: snakes.map(s => kid
              ? { id: s.id, key: Math.floor(s.len), line: `🐍 長到 ${Math.floor(s.len)} 節` }
              : { id: s.id, key: Math.floor(s.best), line: `最長 ${Math.floor(s.best)} 節 · 擊倒 ${s.kills} · 出局 ${s.deaths}` }),
            sub: kid ? '比一比誰的小蛇最長！' : '用「最長曾到多長」排名'
          };
        }
      };
      return api;
    },

    /* =================================================================== CLIENT */
    client(root, api) {
      injectCSS(); const SP = sprites();
      const pub = api.me == null, kid = api.kid, tv = api.isTable;
      root.innerHTML = `<div class="sn-root"><canvas class="sn-cv"></canvas><div class="sn-hud"></div></div>`;
      const box = root.firstChild, cv = box.querySelector('.sn-cv'), hud = box.querySelector('.sn-hud'), g = cv.getContext('2d');
      let cw = 0, ch = 0, dpr = 1, side = 0, raf = 0, alive = true;
      let W = 0, H = 0, decos = [], pattern = null, bgCache = null, bgKey = '';
      const snaps = []; let off = null, foods = new Map(), eaten = [], parts = [], bubbles = [], lastQ = 0;
      let cam = { x: 0, y: 0, z: 1 }, heads = {}, meI = null, mySnake = null;
      let inputA = null, sentA = null, sentT = 0, boostOn = false, sentView = [0, 0], sentViewT = 0;
      let hsx = 0, hsy = 0, steerPtr = null, lastFrame = performance.now(), hintGone = false, prevMy = null, eatT = 0, combo = 0, lastTl = null;
      let pl = [];

      /* ---------- HUD ---------- */
      let el = {};
      if (pub) {
        hud.innerHTML = `<div class="sn-side" hidden><h3>🐍 貪食蛇大戰</h3><div class="tm">0:00</div><div class="md">${kid ? '🧒 小朋友模式 · 比長度' : '🧑 大人模式 · 比最長紀錄'}</div><div class="rows"></div></div>
          <div class="sn-chip sn-pubtop" hidden></div><div class="sn-bigwrap"></div>`;
        el.side = hud.querySelector('.sn-side'); el.tm = hud.querySelector('.tm'); el.rows = hud.querySelector('.rows'); el.top = hud.querySelector('.sn-pubtop'); el.bw = hud.querySelector('.sn-bigwrap');
      } else {
        hud.innerHTML = `<div class="sn-chip sn-me"></div><div class="sn-chip sn-time">0:00</div><div class="sn-chip sn-lb"></div>
          <canvas class="sn-mm"></canvas>${kid ? '' : '<button class="sn-boost">加速<small>會變短</small></button>'}
          <div class="sn-hint">👆 按住螢幕拖一拖，小蛇就往那邊爬</div><div class="sn-deadwrap"></div><div class="sn-bigwrap"></div>`;
        el.me = hud.querySelector('.sn-me'); el.tm = hud.querySelector('.sn-time'); el.lb = hud.querySelector('.sn-lb');
        el.mm = hud.querySelector('.sn-mm'); el.boost = hud.querySelector('.sn-boost'); el.hint = hud.querySelector('.sn-hint');
        el.dead = hud.querySelector('.sn-deadwrap'); el.bw = hud.querySelector('.sn-bigwrap');
        if (matchMedia('(hover:hover) and (pointer:fine)').matches) el.hint.textContent = kid ? '🖱 移動滑鼠或按方向鍵控制小蛇' : '🖱 滑鼠／方向鍵控制，按住左鍵或空白鍵加速';
      }
      const cache = {};
      const setHTML = (k, node, html) => { if (cache[k] !== html) { cache[k] = html; node.innerHTML = html; } };

      /* ---------- input ---------- */
      const hideHint = () => { if (!hintGone && el.hint) { hintGone = true; el.hint.style.opacity = 0; setTimeout(() => { if (el.hint) el.hint.hidden = true; }, 700); } };
      setTimeout(hideHint, 7000);
      const aimAt = (cx, cy) => {
        const b = cv.getBoundingClientRect(), dx = cx - b.left - hsx, dy = cy - b.top - hsy;
        if (dx * dx + dy * dy < 64) return;
        inputA = Math.atan2(dy, dx);
      };
      const setBoost = on => {
        if (kid || pub) return; on = !!on;
        if (on === boostOn) return; boostOn = on; api.send({ b: on ? 1 : 0 });
        if (el.boost) el.boost.classList.toggle('on', on);
        if (on) { api.sfx('whoosh'); api.vibrate(15); }
      };
      const onDown = e => {
        if (pub) return;
        e.preventDefault();
        if (e.pointerType === 'mouse') { aimAt(e.clientX, e.clientY); if (e.button === 0) setBoost(true); hideHint(); return; }
        if (steerPtr == null) { steerPtr = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (er) { } aimAt(e.clientX, e.clientY); hideHint(); }
      };
      const onMove = e => {
        if (pub) return;
        if (e.pointerType === 'mouse') { aimAt(e.clientX, e.clientY); return; }
        if (e.pointerId === steerPtr) aimAt(e.clientX, e.clientY);
      };
      const onUp = e => {
        if (e.pointerType === 'mouse') { setBoost(false); return; }
        if (e.pointerId === steerPtr) steerPtr = null;
      };
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
      cv.addEventListener('contextmenu', e => e.preventDefault());
      if (el.boost) {
        el.boost.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { el.boost.setPointerCapture(e.pointerId); } catch (er) { } setBoost(true); });
        const up = e => { e.preventDefault(); setBoost(false); };
        el.boost.addEventListener('pointerup', up); el.boost.addEventListener('pointercancel', up); el.boost.addEventListener('lostpointercapture', up);
      }
      const keys = {};
      const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
      const keyDir = () => {
        const x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), y = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (x || y) inputA = Math.atan2(y, x);
      };
      const onKey = e => {
        if (pub) return;
        const down = e.type === 'keydown';
        if (e.code === 'Space') { e.preventDefault(); setBoost(down); return; }
        const k = KEYMAP[e.code]; if (!k) return;
        e.preventDefault(); keys[k] = down; if (down) { keyDir(); hideHint(); }
      };
      addEventListener('keydown', onKey); addEventListener('keyup', onKey);

      /* ---------- world setup ---------- */
      const setupWorld = () => {
        const R = seeded(W * 7 + H), n = Math.round(W * H / 55000);
        decos = [];
        for (let k = 0; k < n; k++) {
          const tpe = R(), x = 40 + R() * (W - 80), y = 40 + R() * (H - 80);
          if (tpe < 0.45) decos.push({ x, y, s: 16 + R() * 8, img: SP.flower[R() * 3 | 0] });
          else if (tpe < 0.58) decos.push({ x, y, s: 40 + R() * 20, img: SP.stone, h: 0.75 });
          else decos.push({ x, y, s: 30 + R() * 14, img: SP.deco[R() * SP.deco.length | 0] });
        }
        pattern = g.createPattern(SP.tile, 'repeat');
        try { pattern.setTransform(new DOMMatrix().scale(0.5)); } catch (er) { }
      };
      const drawBorder = (gg, x0, y0, x1, y1, minR) => {
        const step = 58, br = Math.max(30, minR || 0);
        gg.fillStyle = '#4c8f3b';
        gg.beginPath();
        const bush = (x, y) => { if (x > x0 - br && x < x1 + br && y > y0 - br && y < y1 + br) { gg.moveTo(x + br, y); gg.arc(x, y, br, 0, TAU); } };
        for (let x = 0; x <= W; x += step) { bush(x, -10); bush(x, H + 10); }
        for (let y = step; y < H; y += step) { bush(-10, y); bush(W + 10, y); }
        gg.fill();
        gg.fillStyle = '#62a84c'; gg.beginPath();
        const hl = (x, y) => { if (x > x0 - br && x < x1 + br && y > y0 - br && y < y1 + br) { gg.moveTo(x + br * 0.55 - 6, y - 8); gg.arc(x - 6, y - 8, br * 0.55, 0, TAU); } };
        for (let x = 0; x <= W; x += step) { hl(x, -10); hl(x, H + 10); }
        for (let y = step; y < H; y += step) { hl(-10, y); hl(W + 10, y); }
        gg.fill();
      };
      const drawGround = (gg, x0, y0, x1, y1, decoMin) => {
        gg.fillStyle = pattern || '#a7dd80';
        const ax = Math.max(0, x0), ay = Math.max(0, y0), bx = Math.min(W, x1), by = Math.min(H, y1);
        if (bx > ax && by > ay) gg.fillRect(ax, ay, bx - ax, by - ay);
        for (const d of decos) {
          const s = Math.max(d.s, decoMin || 0), h = s * (d.h || 1);
          if (d.x + s < x0 || d.x - s > x1 || d.y + s < y0 || d.y - s > y1) continue;
          gg.drawImage(d.img, d.x - s / 2, d.y - h / 2, s, h);
        }
        drawBorder(gg, x0, y0, x1, y1);
      };

      /* ---------- views ---------- */
      const player = i => pl[i] || null;
      const colOf = i => { const p = player(i); return p ? p.col : i; };
      const updateFoods = (F, now) => {
        const nm = new Map();
        for (let k = 0; k < F.length; k += 4) {
          const id = F[k], o = foods.get(id);
          if (o) { o.x = F[k + 1]; o.y = F[k + 2]; nm.set(id, o); }
          else nm.set(id, { x: F[k + 1], y: F[k + 2], k: F[k + 3], t0: now, id });
        }
        for (const [id, o] of foods) if (!nm.has(id)) {
          let best = null, bd = 1e9;
          for (const i in heads) { const h = heads[i], d = Math.hypot(h.x - o.x, h.y - o.y); if (d < h.r + 70 && d < bd) { bd = d; best = +i; } }
          if (best != null && eaten.length < 60) eaten.push({ x: o.x, y: o.y, k: o.k, t: now, i: best, id });
        }
        foods = nm;
      };
      const burst = (x, y, col, n, spd) => {
        const c = PARTY_COLORS[col % 6];
        for (let k = 0; k < n && parts.length < 160; k++) {
          const a = Math.random() * TAU, v = spd * (0.4 + Math.random() * 0.8);
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.5 + Math.random() * 0.4, c: Math.random() < 0.5 ? c.c : FOODC[Math.random() * 8 | 0], r: 4 + Math.random() * 5 });
        }
      };
      const onEvents = (E, now) => {
        for (let k = 0; k < E.length; k += 5) {
          const q = E[k]; if (q <= lastQ) continue;
          const kind = E[k + 1], x = E[k + 2], y = E[k + 3], i = E[k + 4];
          if (kind === 1) { burst(x, y, colOf(i), 22, 260); bubbles.push({ x, y, t: now, txt: '💥', big: 1 }); if (i !== meI && near(x, y)) api.sfx('pop'); }
          else if (kind === 2) { if (!bubbles.some(b => !b.big && now - b.t < 0.3 && Math.abs(b.x - x) + Math.abs(b.y - y) < 80)) bubbles.push({ x, y, t: now, txt: '咚！' }); burst(x, y, colOf(i), 6, 120); if (i === meI) { api.sfx('flip'); api.sfx('pop'); api.vibrate(40); } }
          else if (kind === 3) { burst(x, y, colOf(i), 12, 160); bubbles.push({ x, y, t: now, txt: '✨', big: 1 }); }
        }
        for (let k = 0; k < E.length; k += 5) if (E[k] > lastQ) lastQ = E[k];
      };
      const near = (x, y) => Math.abs(x - cam.x) < 700 && Math.abs(y - cam.y) < 900;

      const updateHud = v => {
        const n = v.ids.length, lb = v.lb, now = performance.now() / 1000;
        const order = [...Array(n).keys()].sort((a, b) => lb[b * 4] - lb[a * 4] || a - b);
        const tl = v.tl, hot = tl <= 10 && tl > 0;
        if (lastTl !== null && tl !== lastTl && tl <= 5 && tl > 0) api.sfx('tick');
        if (lastTl !== null && tl !== lastTl && tl === 10) showBig('最後 10 秒！');
        lastTl = tl;
        if (pub) {
          const wide = cw >= 700;
          el.side.hidden = !wide; el.top.hidden = wide;
          if (wide) {
            side = Math.min(340, Math.max(240, cw * 0.22)); el.side.style.width = side + 'px';
            setHTML('tm', el.tm, fmtT(tl)); el.tm.classList.toggle('hot', hot);
            setHTML('rows', el.rows, order.map((i, r) => {
              const p = player(i), dead = lb[i * 4 + 3] > 0;
              return `<div class="r ${r === 0 ? 'first' : ''} ${dead ? 'dead' : ''}"><span class="k">${r === 0 ? '👑' : r + 1}</span><img alt="" src="${api.avatar(p, 96)}"><div class="n">${esc(p ? p.name : '?')}<small>${dead ? '💥 復活中…' : kid ? '小蛇長度' : `最長 ${lb[i * 4 + 1]} · 擊倒 ${lb[i * 4 + 2]}`}</small></div><span class="v">${lb[i * 4]}</span></div>`;
            }).join(''));
          } else {
            side = 0;
            setHTML('top', el.top, `<span>⏱ ${fmtT(tl)}</span>` + order.slice(0, 4).map((i, r) => `<span>${r === 0 ? '👑' : r + 1 + '.'}${esc(player(i) ? player(i).name : '?')} ${lb[i * 4]}</span>`).join(''));
          }
          return;
        }
        const i = meI, len = lb[i * 4], best = lb[i * 4 + 1], kills = lb[i * 4 + 2], dead = lb[i * 4 + 3];
        const rank = order.indexOf(i) + 1, me = player(i);
        setHTML('me', el.me, `<img alt="" src="${api.avatar(me, 96)}"><div><div class="big">${len}<small>節</small></div><div class="sm">${n > 1 ? `<span class="rk">第 ${rank} 名</span>` : ''}${kid ? '' : `最長 ${best} · 💥${kills}`}</div></div>`);
        setHTML('tm', el.tm, '⏱ ' + fmtT(tl)); el.tm.classList.toggle('hot', hot);
        if (n > 1) setHTML('lb', el.lb, order.slice(0, 6).map(j => { const p = player(j); return `<div class="r ${j === i ? 'me' : ''} ${lb[j * 4 + 3] > 0 ? 'dead' : ''}"><img alt="" src="${api.avatar(p, 48)}"><span class="n">${esc(p ? p.name : '?')}</span><span class="v">${lb[j * 4]}</span></div>`; }).join(''));
        else el.lb.hidden = true;
        if (el.boost) el.boost.classList.toggle('off', len <= START + 1);
        setHTML('dead', el.dead, dead > 0 ? `<div class="sn-dead">💥 撞到了！<b>${Math.ceil(dead / 10)}</b>秒後復活，再來一次！</div>` : '');
        // feedback from my own state changes
        if (prevMy) {
          if (len > prevMy.len && dead === 0) {
            const gain = len - prevMy.len;
            if (now - eatT < 0.5) combo = Math.min(10, combo + 1); else combo = 0;
            eatT = now;
            if (gain >= 4) { api.sfx('coin'); api.vibrate(20); } else api.sfx('eat', combo);
          }
          if (dead > 0 && prevMy.dead === 0) { api.vibrate(250); setBoost(false); }
          if (!kid && kills > prevMy.kills) api.vibrate(60);
        }
        prevMy = { len, dead, kills };
      };
      const showBig = txt => {
        const d = document.createElement('div'); d.className = 'sn-big'; d.textContent = txt; el.bw.appendChild(d);
        setTimeout(() => d.remove(), 1600);
      };

      /* ---------- interpolation ---------- */
      // render a little in the past and blend between the two views around that moment;
      // the delay follows the measured network jitter, and a short gap is bridged by extrapolating
      let jit = 0.03, rclock = null;
      const snakesAt = rt => {
        if (!snaps.length) return [];
        let A = snaps[0], B = null;
        for (let k = snaps.length - 1; k >= 0; k--) if (snaps[k].t <= rt) { A = snaps[k]; B = snaps[k + 1] || null; break; }
        const out = [];
        if (!B && snaps.length >= 2 && A === snaps[snaps.length - 1]) { B = A; A = snaps[snaps.length - 2]; rt = Math.min(rt, B.t + 0.2); }
        if (!B) { for (const s of A.s) out.push({ i: s.i, a: s.a, r: s.r, f: s.f, p: s.p }); return out; }
        const al = cl((rt - A.t) / (B.t - A.t || 1), 0, 2.5);
        for (const sb of B.s) {
          const sa = A.byI[sb.i];
          if (!sa || sa.k !== sb.k) { out.push({ i: sb.i, a: sb.a, r: sb.r, f: sb.f, p: sb.p }); continue; }
          const P = sb.p.slice(), m = Math.min(sa.m, sb.m) * 2, pa = sa.p;
          // a big jump means the snake respawned: don't slide across the map
          if (Math.abs(pa[0] - P[0]) + Math.abs(pa[1] - P[1]) > 200) { out.push({ i: sb.i, a: sb.a, r: sb.r, f: sb.f, p: sb.p }); continue; }
          for (let k = 0; k < m; k++) P[k] = pa[k] + (P[k] - pa[k]) * al;
          out.push({ i: sb.i, a: wrapA(sa.a + angD(sb.a, sa.a) * al), r: sa.r + (sb.r - sa.r) * al, f: sb.f, p: P });
        }
        return out;
      };

      /* ---------- drawing ---------- */
      const circlesAlong = (P, step) => {
        // positions every `step` along the polyline, starting at the head
        const out = [P[0], P[1]];
        let carry = 0;
        for (let k = 2; k < P.length; k += 2) {
          const x0 = P[k - 2], y0 = P[k - 1], dx = P[k] - x0, dy = P[k + 1] - y0, d = Math.sqrt(dx * dx + dy * dy);
          let s = step - carry;
          while (s <= d) { out.push(x0 + dx * s / d, y0 + dy * s / d); s += step; if (out.length > 1200) return out; }
          carry = d - (s - step);
        }
        return out;
      };
      const drawBody = (sn, vis, rect, minR) => {
        const P = sn.p, r = Math.max(sn.r, minR), col = colOf(sn.i), C = PARTY_COLORS[col % 6], light = mixCol(C.c, 0.38);
        if (sn.f & 1) {   // boosting: a soft glowing trail
          g.save(); g.globalAlpha = 0.35; g.strokeStyle = light; g.lineWidth = r * 2 + 16; g.lineCap = g.lineJoin = 'round';
          g.beginPath(); g.moveTo(P[0], P[1]); for (let k = 2; k < P.length; k += 2) g.lineTo(P[k], P[k + 1]); g.stroke(); g.restore();
        }
        const pos = circlesAlong(P, r * 0.78), n = pos.length / 2;
        for (let j = n - 1; j >= 1; j--) {
          const x = pos[2 * j], y = pos[2 * j + 1];
          if (x < rect[0] - r || x > rect[2] + r || y < rect[1] - r || y > rect[3] + r) continue;
          const tail = j > n - 4 ? 0.62 + (n - 1 - j) * 0.12 : 1, rj = r * tail;
          g.fillStyle = C.d; g.beginPath(); g.arc(x, y, rj, 0, TAU); g.fill();
          g.fillStyle = (j >> 1) % 2 ? light : C.c; g.beginPath(); g.arc(x - rj * 0.08, y - rj * 0.1, rj * 0.8, 0, TAU); g.fill();
        }
      };
      const drawHead = (sn, isMe, z, minR) => {
        const P = sn.p, r = Math.max(sn.r, minR), p = player(sn.i), col = colOf(sn.i), animal = p ? p.animal : sn.i;
        let face = sn.a;
        if (isMe && inputA != null && !(sn.f & 2)) face = inputA;   // eyes follow your finger instantly
        const hr = Math.max(r * 1.45, minR * 1.55);
        drawCritter(g, P[0], P[1] - hr * 0.1, hr, col, animal, { face, noShadow: true, stun: !!(sn.f & 2), moving: true });
        if (sn.f & 2) {   // dizzy stars
          const t = performance.now() / 1000;
          g.fillStyle = '#ffd400';
          for (let k = 0; k < 3; k++) { const a = t * 5 + k * TAU / 3; g.beginPath(); g.arc(P[0] + Math.cos(a) * hr * 0.9, P[1] - hr * 1.2 + Math.sin(a) * hr * 0.3, hr * 0.14, 0, TAU); g.fill(); }
        }
        if (isMe && inputA != null && !pub) {   // a little arrow that points where you steer
          const ax = P[0] + Math.cos(inputA) * hr * 1.9, ay = P[1] + Math.sin(inputA) * hr * 1.9, s = hr * 0.35;
          g.save(); g.translate(ax, ay); g.rotate(inputA); g.globalAlpha = 0.7; g.fillStyle = '#fff';
          g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * 0.6, -s * 0.8); g.lineTo(-s * 0.2, 0); g.lineTo(-s * 0.6, s * 0.8); g.closePath(); g.fill(); g.restore();
        }
        if (!isMe || pub) {
          const fs = (tv ? 17 : 13) / z, y = P[1] - hr * 1.3 - 4 / z;
          g.font = `900 ${fs}px "Noto Sans TC",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
          const name = (p ? p.name : '?') + (sn.f & 4 ? ' 💤' : '');
          g.lineWidth = 4 / z; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineJoin = 'round'; g.strokeText(name, P[0], y);
          g.fillStyle = PARTY_COLORS[col % 6].d; g.fillText(name, P[0], y);
        }
      };
      const foodR = k => k >= 100 ? 15 : FOODR[k >> 3];
      const drawFood = (rect, now, minPx, z) => {
        const minW = minPx / z;
        for (const o of foods.values()) {
          if (o.x < rect[0] - 20 || o.x > rect[2] + 20 || o.y < rect[1] - 20 || o.y > rect[3] + 20) continue;
          const age = now - o.t0, grow = age < 0.35 ? age / 0.35 : 1, pulse = 1 + Math.sin(now * 4 + o.id) * 0.12;
          if (o.k >= 100) {
            const s = Math.max(40, minW * 2.6) * grow * (1 + Math.sin(now * 3 + o.id) * 0.06);
            g.drawImage(SP.treat[(o.k - 100) % SP.treat.length], o.x - s / 2, o.y - s / 2, s, s);
          } else {
            const s = Math.max(FOODR[o.k >> 3], minW) * 4.4 * grow * pulse;
            g.drawImage(SP.dot[o.k & 7], o.x - s / 2, o.y - s / 2, s, s);
          }
        }
        for (let k = eaten.length - 1; k >= 0; k--) {
          const e = eaten[k], q = (now - e.t) / 0.18, h = heads[e.i];
          if (q >= 1 || !h) { eaten.splice(k, 1); continue; }
          const x = e.x + (h.x - e.x) * q, y = e.y + (h.y - e.y) * q, s = (e.k >= 100 ? 40 : Math.max(foodR(e.k), minW) * 4.4) * (1 - q * 0.8);
          g.drawImage(e.k >= 100 ? SP.treat[(e.k - 100) % SP.treat.length] : SP.dot[e.k & 7], x - s / 2, y - s / 2, s, s);
        }
      };
      const drawFx = (dt, now, z) => {
        for (let k = parts.length - 1; k >= 0; k--) {
          const p = parts[k]; p.t += dt; if (p.t >= p.life) { parts.splice(k, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
          g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, Math.max(p.r, 2.5 / z), 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let k = bubbles.length - 1; k >= 0; k--) {
          const b = bubbles[k], q = (now - b.t) / 0.9; if (q >= 1) { bubbles.splice(k, 1); continue; }
          const s = (b.big ? 34 : 28) / Math.max(z, 0.5) * (q < 0.15 ? q / 0.15 * 1.2 : 1 + (0.15 - q) * 0.2);
          g.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
          g.font = `900 ${s}px "Noto Sans TC",system-ui,sans-serif`;
          const y = b.y - 30 - q * 40;
          if (!b.big) { g.lineWidth = s * 0.22; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.strokeText(b.txt, b.x, y); g.fillStyle = '#ff5d73'; }
          g.fillText(b.txt, b.x, y);
        }
        g.globalAlpha = 1;
      };
      let mmT = 0;
      const drawMinimap = v => {
        const c = el.mm; if (!c) return;
        const mw = Math.min(110, cw * 0.28), mh = Math.round(mw * H / W), pr = Math.min(2, devicePixelRatio || 1);
        if (c.width !== Math.round(mw * pr)) { c.width = Math.round(mw * pr); c.height = Math.round(mh * pr); c.style.width = mw + 'px'; c.style.height = mh + 'px'; }
        const m = c.getContext('2d'), sx = c.width / W, sy = c.height / H;
        m.clearRect(0, 0, c.width, c.height);
        m.fillStyle = 'rgba(120,190,90,.55)'; m.fillRect(0, 0, c.width, c.height);
        // camera window
        const vw = cw / cam.z, vh = ch / cam.z;
        m.strokeStyle = 'rgba(255,255,255,.9)'; m.lineWidth = pr; m.strokeRect((cam.x - vw / 2) * sx, (cam.y - vh / 2) * sy, vw * sx, vh * sy);
        for (let i = 0; i < v.ids.length; i++) {
          const x = v.mm[i * 2], y = v.mm[i * 2 + 1]; if (x < 0) continue;
          const C = PARTY_COLORS[colOf(i) % 6], me = i === meI;
          m.fillStyle = me ? '#fff' : C.d; m.beginPath(); m.arc(x * 10 * sx, y * 10 * sy, (me ? 5 : 3.5) * pr, 0, TAU); m.fill();
          m.fillStyle = C.c; m.beginPath(); m.arc(x * 10 * sx, y * 10 * sy, (me ? 3.5 : 2.5) * pr, 0, TAU); m.fill();
        }
      };

      const frame = () => {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        const nowMs = performance.now(), dt = Math.min(0.1, (nowMs - lastFrame) / 1000), now = nowMs / 1000; lastFrame = nowMs;
        const w = box.clientWidth, h = box.clientHeight;
        if (!w || !h) return;
        const pr = Math.min(tv ? 1.5 : 2, devicePixelRatio || 1);
        if (w !== cw || h !== ch || pr !== dpr) { cw = w; ch = h; dpr = pr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); bgKey = ''; }
        const v = snaps[snaps.length - 1];
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#5e9e4a'; g.fillRect(0, 0, cv.width, cv.height);
        if (!v) return;
        const target = now - (off || 0) - cl(1 / 15 + jit + 0.02, 0.09, 0.3);
        if (rclock == null || Math.abs(target - rclock) > 0.6) rclock = target;
        else { rclock += dt; rclock += (target - rclock) * Math.min(1, dt * 2); }
        const rt = rclock;
        const list = snakesAt(rt);
        heads = {}; mySnake = null;
        for (const s of list) { heads[s.i] = { x: s.p[0], y: s.p[1], r: s.r }; if (s.i === meI) mySnake = s; }

        // camera
        let z, ax, ay, minR = 0;
        if (pub) {
          const aw = cw - side, pad = 24;
          z = Math.min((aw - pad * 2) / (W + 80), (ch - pad * 2 - (side ? 0 : 40)) / (H + 80));
          cam.x = W / 2; cam.y = H / 2; ax = aw / 2; ay = side ? ch / 2 : ch / 2 + 20;
          minR = 10 / z;
        } else {
          const r = mySnake ? mySnake.r : 14;
          z = Math.min(cw, ch) / ((kid ? 480 : 540) * (1 + Math.max(0, r - 14) / 30));
          cam.z += (z - cam.z) * Math.min(1, dt * 3); if (!cam.ok) cam.z = z; z = cam.z;
          let tx, ty;
          if (mySnake) { tx = mySnake.p[0]; ty = mySnake.p[1]; }
          else { const mx = v.mm[meI * 2]; if (mx >= 0) { tx = mx * 10; ty = v.mm[meI * 2 + 1] * 10; } else { tx = cam.x; ty = cam.y; } }
          if (!cam.ok) { cam.x = tx; cam.y = ty; cam.ok = true; }
          else if (mySnake) { cam.x = tx; cam.y = ty; }
          else { cam.x += (tx - cam.x) * Math.min(1, dt * 4); cam.y += (ty - cam.y) * Math.min(1, dt * 4); }
          ax = cw / 2; ay = ch / 2;
          hsx = ax; hsy = ay;
          // tell the host how much world this screen shows
          const hw = Math.round(cw / 2 / z), hh = Math.round(ch / 2 / z);
          if ((Math.abs(hw - sentView[0]) > 25 || Math.abs(hh - sentView[1]) > 25) && now - sentViewT > 0.5) { sentView = [hw, hh]; sentViewT = now; api.send({ vw: hw, vh: hh }); }
          // steering
          if (inputA != null) {
            const ch2 = sentA == null || Math.abs(angD(inputA, sentA)) > 0.03;
            if ((ch2 && now - sentT > 0.07) || now - sentT > 1) { sentA = inputA; sentT = now; api.send({ a: Math.round(inputA * 100) / 100 }); }
          }
        }
        const k = dpr * z, ox = ax - cam.x * z, oy = ay - cam.y * z;
        const rect = [-ox / z, -oy / z, (cw - ox) / z, (ch - oy) / z];
        // ground
        if (pub) {
          const key = cw + 'x' + ch + '/' + side + '/' + dpr;
          if (bgKey !== key) {
            bgKey = key; bgCache = document.createElement('canvas'); bgCache.width = cv.width; bgCache.height = cv.height;
            const bg = bgCache.getContext('2d'); bg.fillStyle = '#5e9e4a'; bg.fillRect(0, 0, bgCache.width, bgCache.height);
            bg.setTransform(k, 0, 0, k, ox * dpr, oy * dpr);
            const pt = bg.createPattern(SP.tile, 'repeat'); try { pt.setTransform(new DOMMatrix().scale(0.5)); } catch (er) { }
            const keep = pattern; pattern = pt; drawGround(bg, rect[0], rect[1], rect[2], rect[3], 22 / z); pattern = keep;
          }
          g.drawImage(bgCache, 0, 0);
        }
        g.setTransform(k, 0, 0, k, ox * dpr, oy * dpr);
        if (!pub) drawGround(g, rect[0], rect[1], rect[2], rect[3]);
        drawFood(rect, now, pub ? 4.5 : 0, z);
        // bodies (mine last so it is on top), then all heads
        for (const s of list) if (s.i !== meI) drawBody(s, true, rect, minR);
        if (mySnake) drawBody(mySnake, true, rect, minR);
        for (const s of list) if (s.i !== meI) drawHead(s, false, z, minR);
        if (mySnake) drawHead(mySnake, true, z, minR);
        if (pub && v.ids.length > 1) {   // crown over the longest snake
          let bi = -1, bl = -1; for (let i = 0; i < v.ids.length; i++) if (v.lb[i * 4] > bl) { bl = v.lb[i * 4]; bi = i; }
          const h = heads[bi];
          if (h) { const s = 26 / z; g.font = `${s}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('👑', h.x, h.y - Math.max(h.r * 1.45, minR * 1.55) * 2.2 - 14 / z); }
        }
        drawFx(dt, now, z);
        if (!pub && now - mmT > 0.15) { mmT = now; drawMinimap(v); }
      };
      raf = requestAnimationFrame(frame);

      return {
        view(v) {
          if (!v || !v.ids) return;
          const now = performance.now() / 1000;
          pl = v.ids.map(id => api.player(id));
          if (!W || v.W !== W || v.H !== H) { W = v.W; H = v.H; setupWorld(); bgKey = ''; }
          meI = v.me;
          const d = now - v.t;
          if (off == null || d < off) off = d; else off += (d - off) * 0.005;
          const late = d - off; jit = late > jit ? late : jit + (late - jit) * 0.02;
          v.byI = {}; for (const s of v.s) v.byI[s.i] = s;
          if (snaps.length && v.t <= snaps[snaps.length - 1].t) snaps.length = 0;
          snaps.push(v); if (snaps.length > 6) snaps.shift();
          if (v.f) updateFoods(v.f, now);
          if (v.ev && v.ev.length) onEvents(v.ev, now);
          updateHud(v);
        },
        destroy() {
          alive = false; cancelAnimationFrame(raf);
          removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
        }
      };
    },

    bot(v, api) {
      if (!v || v.me == null) return;
      const my = (v.s || []).find(s => s.i === v.me); if (!my) return;
      const x = my.p[0], y = my.p[1], m = 300;
      let a = null;
      if (x < m || y < m || x > v.W - m || y > v.H - m) a = Math.atan2(v.H / 2 - y, v.W / 2 - x) + (Math.random() - 0.5) * 0.8;
      else if (v.f && v.f.length && Math.random() < 0.35) { const k = (Math.random() * (v.f.length / 4) | 0) * 4; a = Math.atan2(v.f[k + 2] - y, v.f[k + 1] - x); }
      else if (Math.random() < 0.3) a = my.a + (Math.random() - 0.5) * 2.4;
      if (a != null) api.send({ a: Math.round(wrapA(a) * 100) / 100 });
      if (!v.kid) { if (Math.random() < 0.07) api.send({ b: 1 }); else if (Math.random() < 0.3) api.send({ b: 0 }); }
    }
  });
})();

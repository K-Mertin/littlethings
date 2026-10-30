'use strict';
// ================= 平衡調整＋機體相性＋關卡進度條 =================
// 1) 武器平衡：每種武器對「頭目／大型目標」與「一般小兵」各有一個倍率，讓各武器的長處更明顯
//    火神砲＝全能、擴散清場；雷射＝最強的單體輸出；電漿＝自動追蹤、連鎖；
//    波動砲＝穿透清場王，打頭目較弱；穿甲光槍＝爆發穿刺，要瞄準；迴旋光刃＝貼近研磨，越近越痛。
// 2) 機體相性：每架機體拿不同武器的強度不一樣（取代舊的整體火力倍率 dmgk）。
// 3) 關卡進度條：畫面右側顯示這一關打到哪裡、中頭目在哪、還有多遠到魔王。
// 傷害來源靠 hurt(e, d, 來源) 的第三個參數；沒標來源的（炸彈、副武器以外的特效）不套武器倍率。

// ---------- 武器平衡 ----------
const WBAL = {
  //        頭目/大型  一般
  red:    { boss: 1.15, small: 1.15 },
  blue:   { boss: 1.27, small: 1.0 },
  purple: { boss: 1.05, small: 1.15 },
  wave:   { boss: L => 0.9 - L * 0.022, small: 0.95 },   // 低等時打頭目不至於太弱
  rail:   { boss: L => 0.85 - L * 0.025, small: 1.1 },
  blade:  { boss: 0.6, small: 1.25 },
  sub:    { boss: 1, small: 1 },
};

// ---------- 機體相性（1＝標準）----------
const AFF = {
  falcon:  { red: 1.05, blue: 1.05, purple: 1.05, wave: 1.05, rail: 1.05, blade: 1.05, sub: 1.35 },
  raptor:  { red: 1.3, blue: 0.95, purple: 1.0, wave: 1.15, rail: 0.9, blade: 1.3, sub: 1 },
  aegis:   { red: 0.9, blue: 1.25, purple: 1.05, wave: 0.95, rail: 1.25, blade: 0.85, sub: 1 },
  phantom: { red: 1.0, blue: 0.95, purple: 1.3, wave: 1.2, rail: 1.0, blade: 1.15, sub: 1 },
};
const AFF_WS = ['red', 'blue', 'purple', 'wave', 'rail', 'blade'];
const AFF_SHORT = { red: '火神', blue: '雷射', purple: '電漿', wave: '波動', rail: '光槍', blade: '光刃', sub: '副武器' };
function affOf(ship, w) { return ((AFF[ship] || AFF.falcon)[w]) || 1; }
function affMark(k) { return k >= 1.2 ? '◎' : k >= 1.04 ? '○' : k >= 0.97 ? '－' : '△'; }

// 舊的整體火力倍率改由相性表處理
for (const k in SHIPS) SHIPS[k].dmgk = 1;
SHIPS.falcon.note = '平衡型。每種武器都順手，副武器（飛彈）特別強。炸彈會清光整個畫面的子彈。';
SHIPS.raptor.note = '高速強襲型。速度快，擅長火神砲、迴旋光刃這類近身猛攻，但被打中的判定比較大。炸彈是正前方的烈焰巨柱。';
SHIPS.aegis.note = '重裝防禦型。比較慢但判定很小，有自動充能的護盾。擅長雷射、穿甲光槍這類精準武器。炸彈變成長時間防護罩。';
SHIPS.phantom.note = '擦彈型。擦彈累積幻影量表，滿了進入幻影模式（火力 +40%、分身一起開火）。擅長電漿與波動砲。炸彈是吸走子彈的黑洞。';

hurt = (function (base) {
  return function (e, d, src) {
    if (src && e && !e.dead) {
      const B = WBAL[src];
      if (B) { const m = (e.boss || (ET[e.type] && ET[e.type].big)) ? B.boss : B.small; d *= typeof m === 'function' ? m(P.lvl) : m; }
      d *= affOf(G.ship, src);
    }
    base(e, d);
  };
})(hurt);

// 主武器射出的子彈（火神砲、火龍彈…）標上來源；僚機的子彈不算
firePrimary = (function (base) {
  return function (dt) {
    const n0 = G.pb.length, w = P.w;
    base(dt);
    for (let i = n0; i < G.pb.length; i++) if (!G.pb[i].ws && !G.pb[i].opt) G.pb[i].ws = w;
  };
})(firePrimary);
fireOpts = (function (base) {
  return function (dt) {
    const n0 = G.pb.length;
    base(dt);
    for (let i = n0; i < G.pb.length; i++) G.pb[i].opt = 1;
  };
})(fireOpts);
fireSub = (function (base) {
  return function () {
    const n0 = G.pb.length;
    base();
    for (let i = n0; i < G.pb.length; i++) if (!G.pb[i].ws) G.pb[i].ws = 'sub';
  };
})(fireSub);

// 撿到新武器時顯示相性
collect = (function (base) {
  return function (it) {
    const before = P.w;
    base(it);
    if (it.kind === 'P' && P.w !== before) {
      const k = affOf(G.ship, P.w);
      if (k >= 1.2) popText(P.x, P.y - 44, '相性 ◎ 拿手武器！', '#7dffb0');
      else if (k < 0.97) popText(P.x, P.y - 44, '相性 △', '#9fb3c8');
    }
  };
})(collect);

// 選機畫面：在機體說明下面列出各武器相性
refreshTitle = (function (base) {
  return function () {
    base();
    const n = $('shipNote'); if (!n || shipLocked(G.ship)) return;
    const S = SHIPS[G.ship]; if (!S || !n.querySelector('.st')) return;
    const cells = AFF_WS.map(w => { const k = affOf(G.ship, w); return `<i style="color:${ITEM_COL[w][0]}">${AFF_SHORT[w]}${affMark(k)}</i>`; });
    if (affOf(G.ship, 'sub') >= 1.2) cells.push(`<i style="color:#ffd23f">${AFF_SHORT.sub}◎</i>`);
    const box = document.createElement('span'); box.className = 'aff'; box.innerHTML = '<b>武器相性</b>' + cells.join('');
    n.appendChild(box);
  };
})(refreshTitle);

// ---------- 關卡進度條 ----------
// 進關時把這一關的波次「試跑」一遍（不真的生敵機），估出每一波多長、哪幾波有中頭目。
const Prog = {
  st: null,
  build() {
    const S = STAGES[G.stage], seq = S.seq, durs = [], mids = [];
    const realSpawn = spawn;
    let found = null;
    spawn = function (type) { if (MID_INFO[type]) found = type; return { type, x: 0, y: 0, vx: 0, vy: 0, t: 0, hp: 1, maxhp: 1, r: 1, o: {}, dead: false, hidden: false }; };
    const qG = { queue: G.queue.length, enemies: G.enemies.length };
    try {
      seq.forEach((name, i) => {
        found = null;
        let d = 3;
        try {
          const fns = [];
          d = +WAVES[name]((t, fn) => fns.push(fn)) || 3;
          for (const fn of fns) { try { fn(); } catch (err) { /* 試跑失敗就略過 */ } }
        } catch (err) { d = 3; }
        durs.push(Math.max(0.5, d) + 0.3);
        if (found) mids.push(i);
      });
    } finally { spawn = realSpawn; }
    // 保險：試跑不該留下任何東西
    G.queue.length = Math.min(G.queue.length, qG.queue); G.enemies.length = Math.min(G.enemies.length, qG.enemies);
    const cum = [0]; for (const d of durs) cum.push(cum[cum.length - 1] + d);
    this.st = { stage: G.stage, durs, cum, total: cum[cum.length - 1], mids, ws: G.st, we: G.st, skip: false, shown: 0 };
  },
  frac() {
    const p = this.st; if (!p || !p.total) return 0;
    if (G.phase !== 'fight') return 1;
    const i = G.seqI - 1; if (i < 0) return 0;
    if (i >= p.durs.length) return 1;
    const f = clamp((G.st - p.ws) / Math.max(0.01, p.we - p.ws), 0, 1);
    return Math.min(0.995, (p.cum[i] + p.durs[i] * f) / p.total);
  },
};
runScript = (function (base) {
  return function (dt) {
    const si = G.seqI, ph = G.phase;
    if (ph === 'fight' && (!Prog.st || Prog.st.stage !== G.stage || si < Prog.st.lastI || (si === 0 && Prog.st.lastI !== 0))) { Prog.build(); Prog.st.lastI = si; if (si >= STAGES[G.stage].seq.length) Prog.st.skip = true; }
    base(dt);
    const p = Prog.st; if (!p) return;
    if (G.seqI > si) {
      if (G.seqI - si > 1) p.skip = true; // 頭目連戰等：直接跳到魔王，不顯示
      else { p.ws = G.st; p.we = G.nextWave; }
    }
    p.lastI = G.seqI;
  };
})(runScript);

drawHUD = (function (base) {
  return function (c) {
    base(c);
    const p = Prog.st;
    if (!p || p.skip || p.stage !== G.stage || G.bossOnly || G.state !== 'play' || !p.total) return;
    if (G.phase === 'clear' || G.phase === 'down') return;
    const target = Prog.frac();
    p.shown += (target - p.shown) * 0.15; if (Math.abs(target - p.shown) < 0.001) p.shown = target;
    const f = p.shown;
    const x = W - 7, y0 = H - 74, y1 = 96, len = y0 - y1; // 上方留給暫停鈕
    c.save();
    // 軌道
    c.fillStyle = 'rgba(0,0,0,.42)'; c.fillRect(x - 3, y1 - 2, 6, len + 4);
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#5ad1ff'); g.addColorStop(1, '#ffd23f');
    c.fillStyle = g; c.globalAlpha = 0.85; c.fillRect(x - 1.5, y0 - len * f, 3, len * f); c.globalAlpha = 1;
    // 中頭目刻度
    for (const i of p.mids) {
      const yy = y0 - len * (p.cum[i] / p.total), done = f * p.total >= p.cum[i] + 0.5;
      c.fillStyle = done ? 'rgba(255,154,58,.45)' : '#ff9a3a';
      c.beginPath(); c.moveTo(x - 5, yy); c.lineTo(x, yy - 4); c.lineTo(x + 5, yy); c.lineTo(x, yy + 4); c.closePath(); c.fill();
    }
    // 魔王
    const pul = G.phase === 'warn' || G.phase === 'boss' ? 0.5 + 0.5 * Math.sin(G.t * 10) : 0;
    c.fillStyle = pul ? `rgba(255,${80 + 100 * pul | 0},80,1)` : '#ff5a5a';
    c.beginPath(); c.arc(x, y1 - 7, 5, 0, TAU); c.fill();
    c.fillStyle = '#300'; c.fillRect(x - 2.5, y1 - 8.5, 1.6, 2); c.fillRect(x + 0.9, y1 - 8.5, 1.6, 2); c.fillRect(x - 2, y1 - 5, 4, 1.2);
    // 自機記號
    const py = y0 - len * f;
    c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, py - 5); c.lineTo(x + 4.5, py + 4); c.lineTo(x, py + 2); c.lineTo(x - 4.5, py + 4); c.closePath(); c.stroke(); c.fill();
    c.restore();
  };
})(drawHUD);

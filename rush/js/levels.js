// 千軍突圍 — 場景與關卡產生器
'use strict';

const THEMES = [
  { id: 'meadow', name: '綠野',
    sky: ['#7cc8ff', '#c9ecff', '#f4fbff'], far: '#7fb08a', far2: '#5f9a70',
    side: ['#6cbf4f', '#62b247'], road: ['#5a6472', '#535c69'], kerb: ['#f4f4f4', '#e8453c'], line: '#f6f1d0',
    decor: ['tree', 'tree', 'bush', 'flower', 'rock', 'windmill'], fog: 'rgba(225,245,255,', bgm: 0 },
  { id: 'desert', name: '沙漠',
    sky: ['#ffb26b', '#ffd9a1', '#fff1d6'], far: '#d99a5b', far2: '#c4824a',
    side: ['#e8c07a', '#e0b56c'], road: ['#7a6656', '#715e4f'], kerb: ['#fff3dd', '#d9532b'], line: '#fff0c4',
    decor: ['cactus', 'cactus', 'rock', 'skull', 'palm', 'mesa'], fog: 'rgba(255,230,190,', bgm: 1 },
  { id: 'snow', name: '雪原',
    sky: ['#9fb8de', '#d3e2f5', '#f3f8ff'], far: '#c5d6ec', far2: '#a8bedb',
    side: ['#eef4fb', '#e2ebf6'], road: ['#6a7a8f', '#627186'], kerb: ['#ffffff', '#3a7bd5'], line: '#dff3ff',
    decor: ['pine', 'pine', 'snowman', 'ice', 'rock', 'pine'], fog: 'rgba(235,243,255,', bgm: 2 },
  { id: 'night', name: '霓虹夜城',
    sky: ['#0d0b2a', '#2a1550', '#5a2a6e'], far: '#1c1740', far2: '#2a2058',
    side: ['#2b2f45', '#262a3e'], road: ['#2f3442', '#2a2f3c'], kerb: ['#ff4fd8', '#3ff2ff'], line: '#ffe14f',
    decor: ['lamp', 'building', 'building', 'sign', 'lamp', 'building'], fog: 'rgba(60,30,90,', bgm: 3, dark: true },
];

const STAGES = [
  { name: '綠野小路',   boss: 'golem' },
  { name: '風車農場',   boss: 'golem' },
  { name: '森林關口',   boss: 'golem' },
  { name: '沙丘公路',   boss: 'scorpion' },
  { name: '紅岩峽谷',   boss: 'scorpion' },
  { name: '沙暴遺跡',   boss: 'scorpion' },
  { name: '雪原隧道',   boss: 'yeti' },
  { name: '冰湖大道',   boss: 'yeti' },
  { name: '極光山口',   boss: 'yeti' },
  { name: '霓虹大道',   boss: 'mech' },
  { name: '港口夜色',   boss: 'mech' },
  { name: '最終要塞',   boss: 'mech' },
];

const BOSSES = {
  golem:    { name: '巨石魔像', r: 1.9, h: 4.2 },
  scorpion: { name: '沙暴蠍王', r: 2.3, h: 3.4 },
  yeti:     { name: '冰霜巨人', r: 2.0, h: 4.6 },
  mech:     { name: '機械魔王', r: 2.2, h: 4.8 },
};

const startN = s => 6 + s * 2;
const themeOf = s => THEMES[Math.min(THEMES.length - 1, Math.floor((s - 1) / 3))];

// 預期的每位士兵每秒傷害（不含強化）
function genDps(wid, lv) { const w = WEAPONS[wid]; return w.rate * w.dmg * (w.n > 1 ? w.n * 0.8 : 1) * (1 + (w.eff - 1) * 0.5) * lvMult(lv); }

// 產生一關。回傳事件清單（依距離排序）
function genStage(s, seed) {
  const R = rng(seed || (s * 7919 + 1301));
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = a => a[Math.floor(R() * a.length)];
  const ev = [];
  const len = 400 + s * 28;
  const spd = 7 + s * 0.12;
  // 「選得好」的預期狀態，用來決定後面敵人有多強
  let N = startN(s), wid = 'rifle', lv = 1;
  const dps = () => N * genDps(wid, lv);
  let d = 42, cyc = 0, wpnGiven = 0, lastGate = '';
  const rnd5 = v => v >= 40 ? Math.round(v / 5) * 5 : Math.round(v);

  const gateStep = () => Math.max(2, dps() * 0.55); // 打多少傷害 +1

  function addPair(L, Rg, extra) {
    const swap = R() < 0.5;
    const e = { d, type: 'gates', L: swap ? Rg : L, R: swap ? L : Rg, step: gateStep() };
    Object.assign(e, extra || {});
    ev.push(e);
    // 預期選最好的那邊
    const val = g => {
      if (g.k === 'add') return Math.max(0, N + g.v) * genDps(wid, lv);
      if (g.k === 'mul') return N * g.v * genDps(wid, lv);
      if (g.k === 'div') return Math.ceil(N / g.v) * genDps(wid, lv);
      if (g.k === 'wpn') return N * genDps(g.v, lv);
      if (g.k === 'lv') return N * genDps(wid, Math.min(LV_MAX, lv + 1));
      return 0;
    };
    const best = val(e.L) >= val(e.R) ? e.L : e.R;
    if (best.k === 'add') N = Math.max(1, N + best.v);
    else if (best.k === 'mul') N = N * best.v;
    else if (best.k === 'div') N = Math.ceil(N / best.v);
    else if (best.k === 'wpn') wid = best.v;
    else if (best.k === 'lv') lv = Math.min(LV_MAX, lv + 1);
  }

  function gates() {
    let types;
    if (s === 1 && cyc < 4) types = [['plusMinus', 'mulAdd', 'weapon', 'plusPlus'][cyc]];
    else {
      types = ['plusMinus', 'plusMinus', 'plusPlus', 'mulAdd', 'mulAdd', 'mulDiv'];
      if (s >= 3) types.push('minusMinus', 'mulAdd');
      if (s >= 5) types.push('minusMinus', 'mulMul');
      if (cyc % 3 === 2 && wpnGiven < 3) types = ['weapon'];
    }
    let t = pick(types);
    if (t === lastGate && t !== 'weapon') t = pick(types);
    lastGate = t;
    const a = rnd5(Math.max(3, N * (0.35 + R() * 0.5) + ri(2, 6)));
    if (t === 'plusMinus') addPair({ k: 'add', v: a }, { k: 'add', v: -rnd5(Math.max(2, N * (0.2 + R() * 0.35) + ri(1, 4))) });
    else if (t === 'plusPlus') addPair({ k: 'add', v: a }, { k: 'add', v: rnd5(Math.max(1, a * (0.35 + R() * 0.3))) });
    else if (t === 'mulAdd') {
      // ×2 和 +a 很接近，要快速心算
      const m = (N > 30 && R() < 0.3) ? 3 : 2;
      const near = rnd5(Math.max(3, N * (m - 1) * (0.75 + R() * 0.5)));
      addPair({ k: 'mul', v: m }, { k: 'add', v: near });
    }
    else if (t === 'mulDiv') addPair({ k: 'mul', v: 2 }, R() < 0.5 ? { k: 'div', v: 2 } : { k: 'add', v: -rnd5(Math.max(2, N * 0.3)) });
    else if (t === 'mulMul') addPair({ k: 'mul', v: 2 }, { k: 'mul', v: 3 });
    else if (t === 'minusMinus') addPair({ k: 'add', v: -rnd5(Math.max(2, N * (0.12 + R() * 0.1))) }, { k: 'add', v: -rnd5(Math.max(4, N * (0.35 + R() * 0.2))) });
    else if (t === 'weapon') {
      const opts = WPN_ORDER.filter(w => w !== wid && (s >= 2 || w !== 'rocket'));
      const w = s === 1 ? 'smg' : pick(opts);
      const other = (lv < LV_MAX && R() < 0.5) ? { k: 'lv', v: 1 } : (R() < 0.5 && s > 1 ? { k: 'wpn', v: pick(opts.filter(x => x !== w)) } : { k: 'add', v: rnd5(Math.max(3, N * 0.25)) });
      addPair({ k: 'wpn', v: w }, other);
      wpnGiven++;
    }
  }

  function wave(T, guard) {
    const H = dps() * T;
    const sHP = dps() / N; // 一名士兵等值
    const kinds = [];
    const ng = ri(7, 12) + Math.min(8, s);
    for (let i = 0; i < ng; i++) kinds.push('grunt');
    if (s >= 2) for (let i = ri(0, 2 + Math.floor(s / 3)); i > 0; i--) kinds.push('runner');
    if (s >= 3 && R() < 0.35 + s * 0.05) for (let i = ri(1, 1 + Math.floor(s / 5)); i > 0; i--) kinds.push('brute');
    if (s >= 6 && R() < 0.45) for (let i = ri(1, 3); i > 0; i--) kinds.push('shield');
    let W = 0; for (const k of kinds) W += ENEMIES[k].hpK;
    const h = H / W;
    const list = [];
    const rows = Math.ceil(kinds.length / 5);
    kinds.sort(() => R() - 0.5);
    kinds.forEach((k, i) => {
      const row = Math.floor(i / 5);
      const x = guard != null ? clamp(guard + (R() - 0.5) * 3, -PX_MAX, PX_MAX) : (R() * 2 - 1) * (ROAD - 0.7);
      list.push({ k, x, dz: row * 1.6 + R() * 1.1 + (k === 'brute' ? 1.5 : 0), hp: h * ENEMIES[k].hpK });
    });
    const e = { d, type: 'wave', list, sHP, exp: dps() };
    if (s >= 2 && R() < 0.35 && guard == null) {
      e.barrels = [];
      const nb = ri(1, 2);
      for (let i = 0; i < nb; i++) e.barrels.push({ x: (R() * 2 - 1) * (ROAD - 1.2), dz: -2 - R() * 2, hp: H * 0.05, boom: H * 0.35 });
    }
    ev.push(e);
    N = Math.max(1, Math.round(N * (0.9 - s * 0.003)));
    return rows;
  }

  while (d < len - 75) {
    // 有時候好門前面有怪守著
    const guarded = s >= 2 && R() < 0.22 + s * 0.02;
    if (guarded) {
      const side = R() < 0.5 ? -1 : 1;
      wave(0.7 + s * 0.04, side * ROAD / 2);
      d += 12;
    }
    gates();
    d += 32 + R() * 8;
    const rows = wave(2.6 + s * 0.03 + R() * 0.6);
    d += 30 + rows * 2 + R() * 10;
    cyc++;
  }
  const bk = STAGES[s - 1].boss;
  const tier = (s - 1) % 3;
  const bossT = 10 + s * 0.25;
  ev.push({ d: len, type: 'boss', k: bk, tier, hp: dps() * bossT, eat: Math.max(1, N * 0.05), sHP: dps() / N, exp: dps() });
  ev.sort((a, b) => a.d - b.d);
  return { s, len, spd, ev, theme: themeOf(s), name: STAGES[s - 1].name, expN: N };
}

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
  { name: '綠野小路',   boss: 'golem',    rule: 'none',  feats: [] },
  { name: '風車農場',   boss: 'golem',    rule: 'crate', feats: ['crate'] },
  { name: '森林關口',   boss: 'golem',    rule: 'slide', feats: ['crate', 'slide'] },
  { name: '沙丘公路',   boss: 'scorpion', rule: 'wall',  feats: ['wall', 'slide', 'crate'] },
  { name: '紅岩峽谷',   boss: 'scorpion', rule: 'saw',   feats: ['saw', 'wall', 'crate'] },
  { name: '沙暴遺跡',   boss: 'scorpion', rule: 'fog',   feats: ['saw', 'slide', 'wall'] },
  { name: '雪原隧道',   boss: 'yeti',     rule: 'ice',   feats: ['crate', 'slide', 'saw'] },
  { name: '冰湖大道',   boss: 'yeti',     rule: 'spike', feats: ['spike', 'saw', 'wall'] },
  { name: '極光山口',   boss: 'yeti',     rule: 'horde', feats: ['crate', 'slide', 'spike'] },
  { name: '霓虹大道',   boss: 'mech',     rule: 'dark',  feats: ['spike', 'wall', 'crate'] },
  { name: '港口夜色',   boss: 'mech',     rule: 'roul',  feats: ['roul', 'saw', 'slide'] },
  { name: '最終要塞',   boss: 'mech',     rule: 'final', feats: ['wall', 'saw', 'spike', 'slide', 'roul', 'crate'] },
];

// 每關的特殊規則
const RULES = {
  none:  { name: '基本訓練', desc: '選對門、閃開怪物，打倒最後的頭目' },
  crate: { name: '補給充足', desc: '路上有很多補給箱，打開就有士兵或火力' },
  slide: { name: '會動的門', desc: '有些門會左右移動，看準時機穿過去' },
  wall:  { name: '破牆前進', desc: '把牆打破才拿得到獎勵；沒打破會撞掉士兵' },
  saw:   { name: '刀鋸陷阱', desc: '旋轉刀鋸打不壞，只能閃開' },
  fog:   { name: '沙暴', desc: '風沙很大，門要靠近才看得清楚' },
  ice:   { name: '冰面路滑', desc: '路面結冰，部隊移動會滑一下才停' },
  spike: { name: '尖刺陷阱', desc: '地上的尖刺一下升起一下降下，看準了再過' },
  horde: { name: '大軍來襲', desc: '怪物多了一倍，但每隻比較弱' },
  dark:  { name: '停電了', desc: '城市停電，只看得到部隊前面一點點' },
  roul:  { name: '轉盤門', desc: '轉盤門會一直換數字，看準時機穿過' },
  final: { name: '最終決戰', desc: '所有陷阱都會出現' },
};

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
function genStage(s, seed, opts) {
  opts = opts || {};
  const R = rng(seed || (s * 7919 + 1301));
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = a => a[Math.floor(R() * a.length)];
  const ev = [];
  const L = { rule: opts.rule || STAGES[s - 1].rule, feats: opts.feats || STAGES[s - 1].feats };
  const len = opts.len || 400 + s * 28;
  const spd = 7 + s * 0.12;
  // 「選得好」的預期狀態，用來決定後面敵人有多強
  let N = opts.startN || startN(s), wid = opts.wid || 'rifle', lv = opts.lv || 1;
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

  function gates(second) {
    const fx = L.feats;
    // 會動的門：只有一扇，對準了才拿得到
    if (!second && fx.includes('slide') && cyc > 0 && R() < 0.3) {
      const g = N < 25 ? { k: 'add', v: rnd5(Math.max(8, N * (0.9 + R() * 0.5))) } : { k: 'mul', v: R() < 0.3 ? 3 : 2 };
      const e = { d, type: 'gates', slide: { amp: 2.3 + R() * 0.3, f: 1.0 + R() * 0.7 + s * 0.03, ph: R() * 6 }, L: g, step: gateStep() };
      ev.push(e);
      const got = g.k === 'mul' ? N * g.v : N + g.v;
      N = Math.round(N * 0.3 + got * 0.7);
      lastGate = 'slide';
      return;
    }
    // 轉盤門：兩邊都會換數字
    if (!second && fx.includes('roul') && cyc > 0 && R() < 0.4) {
      const mk = () => {
        const vals = [{ k: 'mul', v: 2 }, { k: 'add', v: rnd5(Math.max(4, N * 0.5)) }, { k: 'add', v: -rnd5(Math.max(3, N * 0.3)) }, R() < 0.5 ? { k: 'div', v: 2 } : { k: 'mul', v: 3 }];
        return vals.sort(() => R() - 0.5);
      };
      ev.push({ d, type: 'gates', roul: [{ vals: mk(), per: 0.75 + R() * 0.3 }, { vals: mk(), per: 0.75 + R() * 0.3 }], step: gateStep() });
      N = Math.round(N * 1.6);
      lastGate = 'roul';
      return;
    }
    let types;
    if (s === 1 && cyc < 4) types = [['plusMinus', 'mulAdd', 'weapon', 'plusPlus'][cyc]];
    else {
      types = ['plusMinus', 'plusMinus', 'plusPlus', 'mulAdd', 'mulAdd', 'mulDiv'];
      if (s >= 3) types.push('minusMinus', 'mulAdd');
      if (s >= 5) types.push('minusMinus', 'mulMul');
      if (cyc % 3 === 2 && wpnGiven < 3 && !second) types = ['weapon'];
      if (L.rule === 'horde') types.push('plusPlus', 'mulAdd');
    }
    let t = pick(types);
    if (t === lastGate && t !== 'weapon') t = pick(types);
    lastGate = t;
    const a = rnd5(Math.max(3, N * (0.35 + R() * 0.5) + ri(2, 6)));
    if (t === 'plusMinus') addPair({ k: 'add', v: a }, { k: 'add', v: -rnd5(Math.max(3, N * (0.35 + R() * 0.3) + ri(1, 4))) });
    else if (t === 'plusPlus') addPair({ k: 'add', v: a }, { k: 'add', v: rnd5(Math.max(1, a * (0.35 + R() * 0.3))) });
    else if (t === 'mulAdd') {
      // ×2 和 +a 很接近，要快速心算
      const m = (N > 30 && R() < 0.3) ? 3 : 2;
      const near = rnd5(Math.max(3, N * (m - 1) * (0.75 + R() * 0.5)));
      addPair({ k: 'mul', v: m }, { k: 'add', v: near });
    }
    else if (t === 'mulDiv') addPair({ k: 'mul', v: 2 }, R() < 0.5 ? { k: 'div', v: 2 } : { k: 'add', v: -rnd5(Math.max(2, N * 0.3)) });
    else if (t === 'mulMul') addPair({ k: 'mul', v: 2 }, { k: 'mul', v: 3 });
    else if (t === 'minusMinus') addPair({ k: 'add', v: -rnd5(Math.max(2, N * (0.12 + R() * 0.1))) }, { k: 'add', v: -rnd5(Math.max(4, N * (0.45 + R() * 0.2))) });
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
    if (s >= 4 && guard == null && R() < 0.3 + s * 0.03) for (let i = ri(1, s >= 9 ? 2 : 1); i > 0; i--) kinds.push('thrower');
    if (s >= 7 && R() < 0.5) for (let i = ri(1, 2 + (s >= 10 ? 1 : 0)); i > 0; i--) kinds.push('splitter');
    if (L.rule === 'horde') { const n0 = kinds.length; for (let i = 0; i < n0; i++) if (kinds[i] === 'grunt' || kinds[i] === 'runner') kinds.push(kinds[i]); }
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
    // 補給箱
    const crateP = L.feats.includes('crate') ? (L.rule === 'crate' ? 0.75 : 0.35) : 0;
    if (guard == null && R() < crateP) {
      e.crates = [];
      const nc = L.rule === 'crate' && R() < 0.4 ? 2 : 1;
      for (let i = 0; i < nc; i++) {
        const rw = lv < LV_MAX && R() < 0.3 ? { k: 'lv', v: 1 } : { k: 'add', v: rnd5(Math.max(4, N * (0.18 + R() * 0.15))) };
        e.crates.push({ x: (R() * 2 - 1) * (ROAD - 1), dz: -3 - R() * 3, hp: dps() * (0.35 + R() * 0.2), rw });
        if (rw.k === 'lv') lv = Math.min(LV_MAX, lv + 1); else N += Math.round(rw.v * 0.6);
      }
    }
    if (s >= 2 && R() < 0.35 && guard == null) {
      e.barrels = [];
      const nb = ri(1, 2);
      for (let i = 0; i < nb; i++) e.barrels.push({ x: (R() * 2 - 1) * (ROAD - 1.2), dz: -2 - R() * 2, hp: H * 0.05, boom: H * 0.35 });
    }
    ev.push(e);
    N = Math.max(1, Math.round(N * (0.9 - s * 0.003)));
    return rows;
  }

  // 兩波之間的陷阱或牆
  function cross() {
    const n = 5 + Math.min(6, s) + ri(0, 3);
    const dir = R() < 0.5 ? 1 : -1;
    const H = dps() * (0.9 + s * 0.05);
    ev.push({ d, type: 'cross', n, dir, spd: 2.2 + R() * 1.2 + s * 0.05, hp: H / n, sHP: dps() / N, exp: dps() });
  }

  function fork() {
    const len2 = 30;
    const kinds = ['gate', 'crate', 'weapon', 'safe'];
    const a = pick(kinds); let b = pick(kinds); if (b === a) b = pick(kinds.filter(k => k !== a));
    const lane = (kind) => {
      if (kind === 'gate') return { gate: N < 25 ? { k: 'add', v: rnd5(Math.max(8, N)) } : { k: 'mul', v: R() < 0.35 ? 3 : 2 }, guard: 0.9 + s * 0.06 };
      if (kind === 'crate') return { crates: 2, saw: true, gate: { k: 'add', v: rnd5(Math.max(4, N * 0.35)) } };
      if (kind === 'weapon') return { gate: lv < LV_MAX && R() < 0.5 ? { k: 'lv', v: 1 } : { k: 'wpn', v: pick(WPN_ORDER.filter(w => w !== wid && (s >= 2 || w !== 'rocket'))) }, guard: 0.6 + s * 0.04 };
      return { gate: { k: 'add', v: rnd5(Math.max(4, N * 0.45)) } };
    };
    const L1 = lane(a), L2 = lane(b);
    const H = dps();
    for (const Lx of [L1, L2]) {
      if (Lx.guard) Lx.guardHp = H * Lx.guard;
      if (Lx.crates) Lx.crateHp = H * 0.4;
      Lx.crateRw = { k: 'add', v: rnd5(Math.max(3, N * 0.15)) };
    }
    ev.push({ d, type: 'fork', len: len2, L: L1, R: L2, sHP: dps() / N, exp: dps() });
    // 預期：選比較好的那條
    const gain = Lx => Lx.gate.k === 'mul' ? N * (Lx.gate.v - 1) : Lx.gate.k === 'add' ? Lx.gate.v : N * 0.25;
    N += Math.round(Math.max(gain(L1), gain(L2)) * 0.8);
    d += len2 + 26;
  }

  function feature() {
    const opts = L.feats.filter(f => f === 'wall' || f === 'saw' || f === 'spike');
    if (!opts.length || d > len - 110) return;
    const main = { wall: 'wall', saw: 'saw', spike: 'spike' }[L.rule];
    if (R() > (main ? 0.75 : 0.5)) return;
    const f = main && R() < 0.6 ? main : pick(opts);
    if (f === 'wall') {
      const rw = R() < 0.45 ? { k: 'mul', v: 2 } : lv < LV_MAX && R() < 0.3 ? { k: 'lv', v: 1 } : { k: 'add', v: rnd5(Math.max(8, N * (0.6 + R() * 0.4))) };
      ev.push({ d, type: 'wall', hp: dps() * (1.3 + R() * 0.6 + s * 0.03), rw, sHP: dps() / N, expN: N });
      if (rw.k === 'mul') N = Math.round(N * 1.7); else if (rw.k === 'lv') lv = Math.min(LV_MAX, lv + 1); else N += Math.round(rw.v * 0.8);
      d += 16;
    } else if (f === 'saw') {
      const n = ri(1, s >= 8 ? 3 : 2);
      const list = [];
      for (let i = 0; i < n; i++) list.push({ dz: i * 5.5, cx: (R() * 2 - 1) * 2.2, amp: R() < 0.6 ? 1.2 + R() * 1.6 : 0, f: 1 + R() * 1.2, ph: R() * 6 });
      ev.push({ d, type: 'saw', list });
      d += 10 + n * 5.5;
    } else if (f === 'spike') {
      const n = ri(1, 2);
      const list = [];
      for (let i = 0; i < n; i++) {
        const side = R() < 0.5 ? -1 : 1, w = 4.2 + R() * 2;
        const x0 = side < 0 ? -ROAD : ROAD - w;
        list.push({ dz: i * 5, x0, x1: x0 + w, per: 2.2 - Math.min(0.6, s * 0.04), ph: R() * 2 });
      }
      ev.push({ d, type: 'spike', list });
      d += 10 + n * 5;
    }
  }

  while (d < len - 75) {
    // 有時候好門前面有怪守著
    const guarded = s >= 2 && R() < 0.22 + s * 0.02;
    if (guarded) {
      const side = R() < 0.5 ? -1 : 1;
      wave(0.7 + s * 0.04, side * ROAD / 2);
      d += 12;
    }
    // 岔路：中間有隔牆，左右兩條路的東西不一樣，要先決定走哪邊
    if (s >= 3 && cyc > 0 && R() < 0.22 + s * 0.01 && d < len - 140) { fork(); cyc++; continue; }
    gates();
    // 連續門：第二對門緊接在後面
    if (s >= 4 && R() < 0.22) { d += 10; gates(true); }
    d += 32 + R() * 8;
    const rows = wave((4.0 + R() * 0.6) * (s === 1 ? 0.8 : 1));
    d += 30 + rows * 2 + R() * 10;
    // 橫越的怪物：一排怪從路邊走過去
    if (s >= 2 && R() < 0.3) { cross(); d += 16; }
    feature();
    cyc++;
  }
  const bk = opts.boss || STAGES[s - 1].boss;
  const tier = opts.tier != null ? opts.tier : (s - 1) % 3;
  const bossT = (11 + s * 0.15) * (opts.bossK || 1);
  ev.push({ d: len, type: 'boss', k: bk, tier, hp: dps() * bossT, eat: Math.max(1, N * 0.05), sHP: dps() / N, exp: dps() });
  ev.sort((a, b) => a.d - b.d);
  return { s, len, spd, ev, theme: opts.theme || themeOf(s), name: opts.name || STAGES[s - 1].name, expN: N, rule: L.rule, feats: L.feats };
}

// ---- 無盡模式：一段一段接下去，每段尾巴有頭目 ----
const THEME_RULES = {
  meadow: ['crate', 'slide', 'wall', 'saw', 'horde', 'roul'],
  desert: ['wall', 'saw', 'fog', 'slide', 'crate', 'horde'],
  snow:   ['ice', 'spike', 'horde', 'saw', 'crate', 'slide'],
  night:  ['dark', 'roul', 'spike', 'wall', 'saw', 'horde'],
};
const BOSS_OF_THEME = { meadow: 'golem', desert: 'scorpion', snow: 'yeti', night: 'mech' };
function featsOf(rule) { const st = STAGES.find(x => x.rule === rule); return st ? st.feats : []; }

function legStage(leg, seed, carry) {
  const R = rng((seed || 1) * 131 + leg * 977 + 7);
  const theme = THEMES[leg % THEMES.length];
  const list = THEME_RULES[theme.id];
  const rule = leg === 0 ? 'crate' : list[Math.floor(R() * list.length)];
  const sv = Math.min(12, 2 + leg * 2);
  return genStage(sv, (seed || 1) * 7 + leg * 101, { rule, feats: featsOf(rule), boss: BOSS_OF_THEME[theme.id], theme, name: `第 ${leg + 1} 段 · ${theme.name}`, len: 330 + Math.min(leg, 6) * 25, tier: Math.min(2, Math.floor(leg / 4)), bossK: 0.8, startN: carry && carry.N, wid: carry && carry.wid, lv: carry && carry.lv });
}

// ---- 每日挑戰：用日期當種子，每天一關不一樣 ----
function todayKey(d) { d = d || new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function dailyStage(key) {
  const R = rng(key * 31 + 17);
  const theme = THEMES[Math.floor(R() * THEMES.length)];
  const list = THEME_RULES[theme.id];
  const rule = list[Math.floor(R() * list.length)];
  const sv = 5 + Math.floor(R() * 5);
  const L = genStage(sv, key, { rule, feats: featsOf(rule), boss: BOSS_OF_THEME[theme.id], theme, name: '每日挑戰' });
  L.daily = key;
  return L;
}

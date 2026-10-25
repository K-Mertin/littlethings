'use strict';
// 第 7 章：鐘錶工房
(() => {
  const WALL = { c: '#8a6a48', pat: 'gear', wain: '#5a3a24', trim: '#f0dcb8', floor: 'wood', fc: ['#7a5a3a', '#6a4a2e'] };
  // 標準答案：黑板（太陽對準的數字、四個圖案）、齒輪鏈（四根軸上的齒輪號碼）、齒輪放在哪裡
  const CANON = { k: 3, msg: [3, 2, 4, 1], chain: [6, 3, 7, 4], wb: 7, east: 5 };
  const V = s => (s && s.v) || CANON;
  const MSG_ = s => V(s).msg, CODE = s => MSG_(s).map(m => (m + V(s).k) % 10).join('');
  const U = 9, MS = 5; // 每一號＝半徑 9；發條與時鐘都是 5 號
  const GC = { 3: '#e2c27a', 4: '#d9b56a', 5: '#c9a14a', 6: '#bf9442', 7: '#b8903a' };
  const decoy = s => [3, 4, 5, 6, 7].find(n => !V(s).chain.includes(n));
  const cab = s => [3, 4, 5, 6, 7].filter(n => n !== V(s).wb && n !== V(s).east);
  // 依照答案算出每根軸的位置（相鄰兩軸的距離＝兩個齒輪半徑和）
  function layout(s) {
    const ch = V(s).chain, sizes = [MS, ...ch, MS], pts = [[0, 330]];
    for (let i = 1; i < sizes.length; i++) { const d = (sizes[i - 1] + sizes[i]) * U, a = (i % 2 ? -1 : 1) * 0.42; pts.push([pts[i - 1][0] + d * Math.cos(a), pts[i - 1][1] + d * Math.sin(a)]); }
    const off = 376 - pts[pts.length - 1][0] / 2; pts.forEach(p => p[0] += off);
    return { pts, dist: sizes.slice(1).map((n, i) => sizes[i] + n) };
  }

  Object.assign(ITEMS, {
    innerRing: { n: '密碼內圈', d: '一個小圓盤，邊緣畫著十個圖案。', ic: () => `<circle cx="50" cy="50" r="30" fill="#f6e2b8" ${SW}/>${[0, 2, 4, 6, 8].map(i => A.sym(i, 50 + Math.sin(i * 0.628) * 20, 50 - Math.cos(i * 0.628) * 20, 0.38)).join('')}` },
    outerRing: { n: '密碼外圈', d: '一個黃銅大圓環，上面刻著 0～9。中間是空的，好像能放進什麼。', ic: () => `<circle cx="50" cy="50" r="40" fill="url(#brass)" ${SW}/><circle cx="50" cy="50" r="24" fill="#5a3a24" ${SW2}/>${[0, 3, 6].map(d => A.txt(50 + Math.sin(d * 0.628) * 32, 55 - Math.cos(d * 0.628) * 32, d, 11, '#4a3222', 'middle', 900)).join('')}` },
    cwheel: { n: '密碼轉盤', d: '外圈是數字，內圈是圖案，內圈可以轉動。', ic: () => `<circle cx="50" cy="50" r="42" fill="url(#brass)" ${SW}/><circle cx="50" cy="50" r="28" fill="#f6e2b8" ${SW2}/>${A.sym(0, 50, 30, 0.4)}${A.sym(3, 68, 56, 0.4)}${A.sym(1, 32, 56, 0.4)}<circle cx="50" cy="50" r="4" fill="#4a3222"/>`, insp: C => openWheel(C) },
    screwdriver: { n: '螺絲起子', d: '黃色握把的十字螺絲起子。', ic: () => `<g transform="rotate(-40 50 50)"><rect x="40" y="52" width="20" height="40" rx="8" fill="#f2c232" ${SW}/><path d="M50 52V10" stroke="#4a3222" stroke-width="8" stroke-linecap="round"/><path d="M50 52V10" stroke="#c9cfd6" stroke-width="4" stroke-linecap="round"/></g>` },
    ...Object.fromEntries([3, 4, 5, 6, 7].map(n => ['gear' + n, { n: n + ' 號齒輪', d: `黃銅齒輪，中間刻著「${n}」號。號碼越大，齒輪越大。`, ic: () => A.gear(50, 50, 14 + n * 4, GC[n], n * 2 + 2) + `<circle cx="50" cy="50" r="11" fill="#fff6dc" ${SW2}/>` + A.txt(50, 56, n, 16, '#6a3d10', 'middle', 900) }])),
  });
  Object.assign(MEMO, {
    m8: { t: '第七章 · 糖紙', d: '黑板角落夾著一張<b>薄荷糖的糖紙</b>，還是新的。和 X 字條上的薄荷味一樣。' },
  });

  // 機關是否接通：每一對相鄰齒輪的號碼和，要剛好等於軸上刻的間距
  function chain(s) {
    const L = layout(s), g = s.peg;
    if (g.some(x => !x)) return { ok: false, full: false, bad: [] };
    const sizes = [MS, ...g, MS], bad = [];
    for (let i = 0; i < sizes.length - 1; i++) if (sizes[i] + sizes[i + 1] !== L.dist[i]) bad.push(i);
    return { ok: !bad.length, full: true, bad };
  }
  const gearG = (x, y, n, fill, num, cls) => `<g${cls ? ` class="${cls}" style="animation-duration:${n * 0.7}s"` : ''}><path d="${A.gearPath(x, y, n * U, n * 2 + 4)}" fill="${fill}" fill-rule="evenodd" ${SW}/><circle cx="${x}" cy="${y}" r="${n * U * 0.6}" fill="none" stroke="#6a3d10" stroke-opacity=".35" stroke-width="2"/></g><circle cx="${x}" cy="${y}" r="10" fill="#fff6dc" ${SW2}/>${A.txt(x, y + 5, num, 13, '#6a3d10', 'middle', 900)}`;
  const mech = (s, run, T) => {
    const L = layout(s), P = L.pts, ch = chain(s);
    let o = `<rect x="56" y="150" width="640" height="340" rx="16" fill="#3b2a1f" ${SW}/><rect x="56" y="150" width="640" height="340" rx="16" fill="url(#p-gear)" opacity=".5"/>`;
    let lab = '';
    for (let i = 0; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2 + (i % 2 ? 78 : -78); o += `<path d="M${P[i][0]} ${P[i][1]}L${P[i + 1][0]} ${P[i + 1][1]}" stroke="#f0dcb8" stroke-opacity=".25" stroke-width="2" stroke-dasharray="4 6"/>`; lab += `<path d="M${mx} ${my + (i % 2 ? -14 : 12)}L${(P[i][0] + P[i + 1][0]) / 2} ${(P[i][1] + P[i + 1][1]) / 2}" stroke="#f0dcb8" stroke-width="2" stroke-dasharray="3 4"/><rect x="${mx - 30}" y="${my - 15}" width="60" height="28" rx="6" fill="#f0dcb8" ${SW2}/>` + A.txt(mx, my + 5, '間距 ' + L.dist[i], 13, '#4a3222', 'middle', 900); }
    const fx = [];
    P.forEach((p, i) => {
      const end = i === 0 || i === P.length - 1, n = end ? MS : s.peg[i - 1];
      if (n) { const g = gearG(p[0], p[1], n, end ? '#9aa6b0' : GC[n], n); if (run) { o += `<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="#4a3222"/>`; fx.push(gearG(p[0], p[1], n, end ? '#9aa6b0' : GC[n], n, i % 2 ? 'spinr' : 'spin')); } else o += g; }
      else o += `<circle cx="${p[0]}" cy="${p[1]}" r="22" fill="none" stroke="#f0dcb8" stroke-width="3" stroke-dasharray="5 5"/><circle cx="${p[0]}" cy="${p[1]}" r="7" fill="#c9cfd6" ${SW2}/>` + A.txt(p[0], p[1] + 44, '軸 ' + i, 13, '#f0dcb8', 'middle', 700);
      if (end) o += A.txt(p[0], p[1] + (i ? -62 : 70), i ? '時鐘' : '發條', 16, '#f0dcb8', 'middle', 900);
    });
    o += lab;
    if (ch.full && !ch.ok && !run) ch.bad.forEach(i => { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; o += `<g transform="translate(${mx} ${my})"><circle r="13" fill="#e0432d" stroke="#fff" stroke-width="3"/><path d="M-5-5l10 10M5-5l-10 10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></g>`; });
    if (fx.length) A.fx(`<g transform="${T}">${fx.join('')}</g>`);
    return o;
  };
  const panel = (x, y, sc, s) => `<g transform="translate(${x} ${y}) scale(${sc})">` + (s.panelOff ? `<g transform="translate(-370 -320)">${mech(s, s.mechOk, `translate(${x} ${y}) scale(${sc}) translate(-370 -320)`)}</g>` : `<rect x="-280" y="-150" width="560" height="300" rx="16" fill="#a8703f" ${SW}/><rect x="-260" y="-130" width="520" height="260" rx="10" fill="#b98050" ${SW2}/>${[[-250, -120], [250, -120], [-250, 120], [250, 120]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="10" fill="#c9cfd6" ${SW2}/><path d="M${a - 6} ${b}h12M${a} ${b - 6}v12" stroke="#4a3222" stroke-width="2"/>`).join('')}${A.txt(0, 10, '機關室', 40, '#7a4a2a', 'middle', 900)}`) + '</g>';
  const cuckoo = (x, y, s) => `<g transform="translate(${x} ${y})"><path d="M-70 0l70-50 70 50z" fill="#7a4a2a" ${SW}/><rect x="-56" y="0" width="112" height="110" fill="#a8703f" ${SW}/><rect x="-20" y="10" width="40" height="34" rx="4" fill="${s.mechOk ? '#2a1a10' : '#7a4a2a'}" ${SW2}/>${s.mechOk ? `<g transform="translate(0 30)"><circle cx="20" cy="0" r="16" fill="#f2c232" ${SW2}/><path d="M34 -2l14 4-14 4z" fill="#e0703f" ${SW2}/><circle cx="24" cy="-4" r="3" fill="#2a1a10"/></g>` : ''}<circle cx="0" cy="76" r="26" fill="#fffaf0" ${SW2}/><path d="M0 76v-16M0 76l10 6" ${SW2}/><path d="M-20 110v50M20 110v70" stroke="#4a3222" stroke-width="2"/><path d="M-26 160h12l-6 16zM14 180h12l-6 16z" fill="url(#brass)" ${SW2}/><path d="M-58 -2l58-42 58 42M-44 -12l44-32 44 32M-30 -22l30-22 30 22" stroke="#5a3420" stroke-width="1" fill="none"/>${[-1, 1].map(d => `<path d="M${d * 70} 0q${d * 10} 10 ${d * 2} 22q${-d * 4} -10 ${-d * 2} -22zM${d * 64} 2q${d * 18} 2 ${d * 16} 14" fill="#5f8a4a" stroke="#3f5a2e" stroke-width=".8"/>`).join('')}<path d="M-50 4h100" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/><path d="M-56 100h112" stroke="#5a3420" stroke-width="1"/><path d="M-40 106l10 -6 10 6 10 -6 10 6 10 -6 10 6 10 -6" stroke="#5a3420" stroke-width="1" fill="none"/>${[...Array(12)].map((_, i) => { const a = i * Math.PI / 6; return `<circle cx="${(Math.sin(a) * 20).toFixed(1)}" cy="${(76 - Math.cos(a) * 20).toFixed(1)}" r="${i % 3 ? 0.9 : 1.6}" fill="#4a3222"/>`; }).join('')}<circle cx="0" cy="76" r="26" fill="url(#glassR)"/><path d="M-26 164h12M-26 168h12M14 184h12M14 188h12" stroke="#7a4a14" stroke-width=".8"/></g>`;
  const board = (x, y, sc, s) => {
    let o = `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="0" y="0" width="360" height="250" rx="8" fill="#8c5634" ${SW}/><rect x="14" y="14" width="332" height="222" rx="4" fill="#2f4a3a"/>`;
    o += `<rect x="14" y="14" width="332" height="222" fill="url(#p-noise)"/>` + A.txt(180, 54, '把內圈的', 22, '#f4f0e6', 'middle', 700) + `<g>${A.sym(0, 266, 46, 1.25)}</g>` + A.txt(180, 92, '對準外圈的　' + V(s).k, 22, '#f4f0e6', 'middle', 700);
    MSG_(s).forEach((k, i) => o += `<rect x="${52 + i * 66}" y="120" width="56" height="56" rx="8" fill="none" stroke="#f4f0e6" stroke-width="2" stroke-dasharray="4 4"/>` + A.sym(k, 80 + i * 66, 148, 1.15));
    o += `<path d="M30 230q60-6 120 2t160-4" stroke="#fff" stroke-opacity=".12" stroke-width="8" fill="none"/><path d="M40 40q40-10 90 4M220 186q50-10 100 6" stroke="#fff" stroke-opacity=".08" stroke-width="14" fill="none" stroke-linecap="round"/><rect x="6" y="242" width="348" height="10" rx="3" fill="#7a4a2a" ${SW2}/><path d="M4 4h352" stroke="#fff" stroke-opacity=".2" stroke-width="1.4"/>`;
    o += A.txt(180, 214, '＝ 工具櫃的密碼', 20, '#f2c46b', 'middle', 700);
    o += `<g transform="translate(310 220) rotate(20)"><rect x="-14" y="-8" width="28" height="16" rx="3" fill="#bff0d8" ${SW2}/><path d="M-14-8l-8 8 8 8M14-8l8 8-8 8" fill="#9ae0c0" ${SW2}/></g>`;
    return o + '</g>';
  };

  ROOMS.push({
    id: 'r7', no: 7, name: '鐘錶工房', en: 'THE CLOCKWORK WORKSHOP', mood: 'night', par: 720, walls: ['n', 'e', 's', 'w'],
    init: () => ({ peg: [null, null, null, null], cw: 0 }),
    canon: CANON,
    vary: r => {
      let ch; do { ch = shuffle([3, 4, 5, 6, 7], r).slice(0, 4); } while (ch.join() === '6,3,7,4');
      const all = shuffle([3, 4, 5, 6, 7], r);
      let k, msg; do { k = rInt(r, 0, 9); msg = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, 4); } while (k === 3);
      return { k, msg, chain: ch, wb: all[0], east: all[1] };
    },
    // 舊存檔（三根軸、大中小齒輪）換成新的齒輪機關
    migrate: C => {
      const s = C.s; if (s.peg && s.peg.length === 4) return;
      s.peg = [null, null, null, null];
      C.inv = C.inv.filter(x => !/^gear[SML]$/.test(x));
      if (!s.mechOk) { if (s.gSLTaken) cab(s).forEach(n => C.inv.includes('gear' + n) || C.inv.push('gear' + n)); if (s.gMTaken) C.inv.includes('gear' + V(s).wb) || C.inv.push('gear' + V(s).wb); }
    },
    note: { v: 's', x: 820, y: 132, s: 0.85 },
    amb: v => v === 'e' ? '' : '',
    intro: [
      '滴答、滴答、滴答……牆上掛滿了大大小小的時鐘，卻每一個都停在不同的時間。',
      '這裡是爺爺的鐘錶工房。工作台上散落著螺絲、彈簧和齒輪。',
      { w: 'mochi', t: '喵～', sfx: 'meow' },
      '麻糬抬頭看著門上的布穀鳥鐘。鐘停了，小鳥躲在裡面不肯出來。',
    ],
    outro: [
      { t: '「咕咕！咕咕！」布穀鳥跳出來報時，整間工房的時鐘一起動了起來！', sfx: 'chime' },
      '門鎖彈開，門後是一道往上的旋轉樓梯。樓梯頂端……就是這棟房子最高的地方。',
    ],
    views: {
      n: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${panel(400, 300, 0.92, s)}</g>` + `<g filter="url(#ds)">${A.box(720, 360, 240, 110, '#7a4a2a')}</g>` +
          (s.innerTaken ? '' : `<path d="M760 360v-50h50v50" fill="#9fb0c2" ${SW}/><ellipse cx="785" cy="310" rx="25" ry="6" fill="#c9d4de" ${SW2}/>${A.sparkle(820, 300, 0.6)}`) + (s.gMTaken ? '' : `<g transform="translate(840 300) scale(.7)">${ITEMS['gear' + V(s).wb].ic()}</g>`) + A.pool(905, 362, 110, 22, 0.8) + A.lamp(905, 352, '#f2b632') + A.light(),
        hot: s => [
          { id: 'panel', r: [140, 160, 520, 290], on: C => { if (!s.panelOff) G.toast('一塊用四顆十字螺絲鎖住的木板，上面寫著「機關室」。'); else C.go('mech'); }, use: { screwdriver: C => { s.panelOff = 1; Snd.play('click'); G.toast('轉轉轉……四顆螺絲都卸下來了！木板後面是齒輪機關。'); } } },
          { id: 'tin', r: [740, 280, 90, 90], on: C => { if (!s.innerTaken) { s.innerTaken = 1; C.give('innerRing'); } else G.toast('空罐子。'); } },
          { id: 'gearM', r: [835, 285, 90, 80], on: C => { if (!s.gMTaken) { s.gMTaken = 1; C.give('gear' + V(s).wb); } } },
        ],
      },
      mech: {
        back: 'n', title: '齒輪機關',
        draw: s => A.closeBg('#8a6a48', 'gear') + `<g transform="translate(-40 -160) scale(1.4)" filter="url(#ds)">${mech(s, s.mechOk, 'translate(-40 -160) scale(1.4)')}</g>` + A.txt(500, 36, '相鄰兩個齒輪的號碼加起來，要剛好等於刻著的「間距」。', 23, '#fff3dc', 'middle', 700, 'stroke="#3b2a1f" stroke-width="5" paint-order="stroke"') + A.light(),
        hot: s => layout(s).pts.slice(1, 5).map((p, i) => ({ id: 'peg' + i, c: [-40 + p[0] * 1.4, -160 + p[1] * 1.4, 46], on: C => { if (s.mechOk) return; if (s.peg[i]) { C.give('gear' + s.peg[i], true); s.peg[i] = null; Snd.play('select'); } else G.toast('一根空的軸。拿著齒輪點這裡就能裝上去。'); }, use: Object.fromEntries([3, 4, 5, 6, 7].map(n => ['gear' + n, C => { if (s.mechOk) return; if (s.peg[i]) { C.give('gear' + s.peg[i], true); } C.take('gear' + n); s.peg[i] = n; Snd.play('click'); checkMech(C); }])) })),
      },
      e: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)"><rect x="180" y="90" width="640" height="320" rx="10" fill="#d9b88a" ${SW}/><rect x="180" y="90" width="640" height="320" rx="10" fill="url(#p-noise)"/>${[...Array(60)].map((_, i) => `<circle cx="${210 + (i % 15) * 42}" cy="${120 + Math.floor(i / 15) * 76}" r="4" fill="#8a6a48"/><path d="M${206 + (i % 15) * 42} ${118 + Math.floor(i / 15) * 76}a4 4 0 0 1 7 0" stroke="#5a3a24" stroke-width="1" fill="none"/>`).join('')}<rect x="188" y="98" width="624" height="304" rx="6" fill="none" stroke="#b8946a" stroke-width="1.4"/>${[[196, 106], [804, 106], [196, 394], [804, 394]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="4" fill="url(#silver)" ${SW2}/><path d="M${a - 2.5} ${b}h5" stroke="#4a3222" stroke-width=".8"/>`).join('')}</g>` +
          (s.outerTaken ? '' : `<path d="M300 120v20" ${SW2}/><circle cx="300" cy="200" r="58" fill="none" stroke="url(#brass)" stroke-width="22"/><circle cx="300" cy="200" r="69" fill="none" ${SW2}/><circle cx="300" cy="200" r="47" fill="none" ${SW2}/>${A.sparkle(360, 140, 0.7)}`) +
          (s.sdTaken ? '' : `<g transform="translate(430 140) scale(1.5)">${ITEMS.screwdriver.ic()}</g>`) + (s.gETaken ? '' : `<path d="M300 296v14" ${SW2}/><g transform="translate(250 290) scale(1)">${ITEMS['gear' + V(s).east].ic()}</g>`) +
          `<g transform="translate(600 130)"><path d="M0 0v140" stroke="#9aa6b0" stroke-width="16" stroke-linecap="round"/><path d="M0 0v140" ${SW2}/><path d="M-30 -10a30 30 0 1 0 60 0l-14 0v14h-32v-14z" fill="#9aa6b0" ${SW}/></g><g transform="translate(720 140)"><rect x="-10" y="0" width="20" height="150" rx="6" fill="#a8703f" ${SW}/><rect x="-40" y="-20" width="80" height="34" rx="6" fill="#9aa6b0" ${SW}/></g>` +
          `<g filter="url(#ds)">${A.box(200, 420, 600, 60, '#7a4a2a', 12)}</g>` + A.light(),
        hot: s => [
          { id: 'outer', r: [220, 120, 160, 160], on: C => { if (!s.outerTaken) { s.outerTaken = 1; C.give('outerRing'); } } },
          { id: 'sd', r: [410, 110, 130, 150], on: C => { if (!s.sdTaken) { s.sdTaken = 1; C.give('screwdriver'); } } },
          { id: 'tools', r: [560, 100, 220, 210], t: '扳手和槌子。看起來用不到。' },
          { id: 'gearE', r: [250, 286, 100, 100], on: C => { if (!s.gETaken) { s.gETaken = 1; C.give('gear' + V(s).east); } } },
        ],
      },
      s: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)"><rect x="330" y="160" width="340" height="320" rx="10" fill="#4f6a5a" ${SW}/><rect x="350" y="180" width="145" height="280" rx="6" fill="${s.cabOpen ? '#2a1a10' : '#5f7a6a'}" ${SW2}/><rect x="505" y="180" width="145" height="280" rx="6" fill="#5f7a6a" ${SW2}/>${s.cabOpen ? '' : `<rect x="362" y="194" width="121" height="252" rx="4" fill="none" stroke="#3f5a4a" stroke-width="1.2"/><path d="M364 444V196h117" stroke="#8aa89a" stroke-width="1" fill="none"/>`}<rect x="517" y="194" width="121" height="252" rx="4" fill="none" stroke="#3f5a4a" stroke-width="1.2"/><path d="M519 444V196h117" stroke="#8aa89a" stroke-width="1" fill="none"/>${[200, 430].map(y => `<rect x="342" y="${y}" width="8" height="20" rx="2" fill="url(#silver)" ${SW2}/><rect x="650" y="${y}" width="8" height="20" rx="2" fill="url(#silver)" ${SW2}/>`).join('')}<rect x="560" y="200" width="40" height="18" rx="2" fill="url(#brass)" ${SW2}/><path d="M566 209h28" stroke="#7a4a14" stroke-width="1"/><path d="M336 166h328" stroke="#fff" stroke-opacity=".25" stroke-width="1.4"/><path d="M340 480l-6 10h20l2-10M660 480l6 10h-20l-2-10" fill="#3f5a4a" ${SW2}/>` +
          (s.cabOpen ? (s.gSLTaken ? '' : cab(s).map((n, i) => `<g transform="translate(${358 + (i % 2) * 40} ${200 + i * 80}) scale(.85)">${ITEMS['gear' + n].ic()}</g>`).join('')) : `<rect x="455" y="290" width="90" height="44" rx="6" fill="url(#brass)" ${SW2}/>${[0, 1, 2, 3].map(i => `<rect x="${462 + i * 20}" y="298" width="16" height="28" rx="2" fill="#fffaf0"/>`).join('')}`) + `</g>` +
          [[140, 200, '#e98a5a'], [180, 340, '#6f9fb8'], [820, 190, '#f2c232'], [860, 330, '#9fd08a']].map(([x, y, c], i) => `<circle cx="${x}" cy="${y}" r="${44 - i * 4}" fill="${c}" ${SW}/><circle cx="${x}" cy="${y}" r="${32 - i * 4}" fill="#fffaf0" ${SW2}/><path d="M${x} ${y}l${[0, 12, -10, 8][i]} ${[-18, 0, -12, 14][i]}M${x} ${y}l${[10, -4, 6, -14][i]} ${[4, -14, 8, 2][i]}" ${SW2}/>`).join('') + A.light(),
        hot: s => [
          { id: 'cab', r: [330, 160, 340, 320], on: C => { if (!s.cabOpen) W.wheels(C, { id: 'cab', title: '工具櫃的密碼鎖', sub: '四位數字的密碼鎖。', wheels: [0, 1, 2, 3].map(() => ({ vals: '0123456789'.split('') })), check: (i, v) => v.join('') === CODE(s), ok: () => { s.cabOpen = 1; G.toast('工具櫃打開了！裡面有三個齒輪。'); } }); else if (!s.gSLTaken) { s.gSLTaken = 1; cab(s).forEach(n => C.give('gear' + n, true)); Snd.play('pick'); G.toast(`拿到「<b>${cab(s).join('、')} 號齒輪</b>」。`); } else G.toast('櫃子裡只剩下油罐和抹布。'); } },
          { id: 'clocks', r: [80, 140, 200, 260], t: '牆上的時鐘全都停了，每一個停在不同的時間。' },
        ],
      },
      w: {
        draw: s => A.wall(WALL) + `<g filter="url(#ds)">${board(80, 120, 1, s)}</g>` + `<g filter="url(#ds)">${A.door(600, 210, 190, 260, '#5a3a24', { open: s.mechOk })}</g>` + `<g filter="url(#ds)">${cuckoo(695, 40, s)}</g>` + A.light(),
        hot: s => [
          { id: 'board', r: [80, 120, 360, 250], on: () => { s.readBoard = 1; G.read('黑板', `<div style="text-align:center">把內圈的 <svg viewBox="-18 -18 36 36" width="34" height="34" style="vertical-align:middle">${A.sym(0, 0, 0, 1)}</svg> 對準外圈的 <b style="font-size:24px">${V(s).k}</b>\n\n${MSG_(s).map(k => `<svg viewBox="-18 -18 36 36" width="54" height="54">${A.sym(k, 0, 0, 1)}</svg>`).join('　')}\n\n＝ 工具櫃的密碼</div>\n黑板角落還夾著一張薄荷糖的糖紙。`); G.memoAdd('m8'); } },
          { id: 'door', r: [600, 210, 190, 260], on: C => { if (s.mechOk) C.win(); else G.toast('門上沒有鎖孔。門上的布穀鳥鐘停住了，好像跟門是連在一起的。'); } },
          { id: 'cuckoo', r: [620, 0, 150, 160], t: '布穀鳥鐘停住了。後面有一條線，一直連到北邊的「機關室」。' },
        ],
      },
    },
    combos: [{ a: 'innerRing', b: 'outerRing', f: C => { C.s.wheelMade = 1; C.take('innerRing'); C.take('outerRing'); C.give('cwheel', true); G.toast('把內圈嵌進外圈──做成了「<b>密碼轉盤</b>」！點兩下可以拿起來轉。'); } }],
    steps: [
      { goal: '找到能解讀黑板的工具', done: s => s.innerTaken && s.outerTaken, h: ['西邊黑板上提到「內圈」和「外圈」。', '北邊工作台的罐子裡有內圈；東邊的洞洞板上掛著外圈。', '點北邊的鐵罐拿到密碼內圈，點東邊的黃銅圓環拿到密碼外圈。'] },
      { goal: '做出密碼轉盤', done: s => s.wheelMade, h: ['內圈和外圈可以合在一起。', '在道具欄點內圈拿在手上，再點外圈。', '組合成「密碼轉盤」，再點兩下轉盤就能轉動它。'] },
      { goal: '打開工具櫃', done: s => s.cabOpen, h: [s => `黑板寫著：把內圈的太陽對準外圈的 ${V(s).k}，下面有四個圖案。`, s => `打開密碼轉盤，轉到太陽對準 ${V(s).k}，再看${MSG_(s).map(m => A.SYM[m]).join('、')}各自對到哪個數字。`, s => `${MSG_(s).map(m => A.SYM[m] + ' ' + (m + V(s).k) % 10).join('、')}，工具櫃密碼是 ${CODE(s)}。`] },
      { goal: '收集五個齒輪', done: s => s.gSLTaken && s.gMTaken && s.gETaken, h: ['工具櫃裡有齒輪，北邊工作台和東邊洞洞板上也各有一個。', '點打開的工具櫃，再點北邊工作台上和東邊洞洞板左下的齒輪。', s => `${cab(s).join('、')} 號在工具櫃，${V(s).wb} 號在北邊工作台，${V(s).east} 號在東邊洞洞板。`] },
      { goal: '打開機關室', done: s => s.panelOff, h: ['北邊的木板用十字螺絲鎖住。', '東邊洞洞板上有螺絲起子。', '拿螺絲起子點北邊「機關室」木板。'] },
      { goal: '讓齒輪機關轉起來', done: s => s.mechOk, h: ['四根軸各放一個齒輪。相鄰兩個齒輪的號碼加起來，要等於它們之間刻的「間距」。有一個齒輪用不到。', s => `發條是 5 號，第一個間距是 ${layout(s).dist[0]}，所以軸 1 要放 ${layout(s).dist[0] - 5} 號；再用下一個間距減掉它，就是軸 2……一路算下去。`, s => `軸 1～4 依序放：${V(s).chain.join('、')} 號（${decoy(s)} 號用不到）。`] },
    ],
  });

  function checkMech(C) {
    const s = C.s, r = chain(s);
    if (!r.full) return;
    if (r.ok) { s.mechOk = 1; Snd.play('gear'); C.render(); setTimeout(() => Snd.play('chime'), 600); C.give('g7', true); G.toast('齒輪咬合了！機關轉起來，布穀鳥鐘「咕咕」叫著，吐出了「<b>音符齒輪 Ⅶ</b>」！'); C.render(); C.win(); }
    else { Snd.play('wrong'); G.toast('喀、喀……有齒輪沒有咬好（紅色 ✕ 的地方），機關轉不動。點齒輪可以拿下來換位置。'); }
  }
  function openWheel(C) {
    const s = C.s;
    const draw = () => {
      let o = `<svg class="wsvg" viewBox="-160 -160 320 320" style="max-width:360px;margin:0 auto"><circle r="150" fill="url(#brass)" ${SW}/><circle r="104" fill="#5a3a24" ${SW2}/>`;
      for (let d = 0; d < 10; d++) { const a = d * 36 * Math.PI / 180; o += A.txt(Math.sin(a) * 127, -Math.cos(a) * 127 + 10, d, 28, '#4a3222', 'middle', 900) + `<path d="M${Math.sin(a + 0.314) * 104} ${-Math.cos(a + 0.314) * 104}L${Math.sin(a + 0.314) * 150} ${-Math.cos(a + 0.314) * 150}" stroke="#a8742a" stroke-width="2"/>`; }
      o += `<g><circle r="100" fill="#f6e2b8" ${SW}/>`;
      for (let i = 0; i < 10; i++) { const a = (i + s.cw) * 36 * Math.PI / 180; o += A.sym(i, Math.sin(a) * 76, -Math.cos(a) * 76, 1.1) + `<path d="M${Math.sin(a + 0.314) * 54} ${-Math.cos(a + 0.314) * 54}L${Math.sin(a + 0.314) * 100} ${-Math.cos(a + 0.314) * 100}" stroke="#d9c49a" stroke-width="2"/>`; }
      o += `<circle r="22" fill="url(#brass)" ${SW2}/></g></svg>`;
      return o;
    };
    const body = G.modal(`<h3>密碼轉盤</h3><p class="sub">外圈的數字固定不動，按按鈕轉動內圈的圖案。</p><div class="cwv">${draw()}</div><div class="btnRow"><button class="sec" data-r="-1">↺ 往左轉</button><button class="sec" data-r="1">往右轉 ↻</button></div>`, { w: 440 });
    body.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; s.cw = (s.cw + (+b.dataset.r) + 10) % 10; Snd.play('click'); body.querySelector('.cwv').innerHTML = draw(); C.save(); };
  }
})();

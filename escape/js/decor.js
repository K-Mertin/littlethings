'use strict';
// 場景佈置：每個房間的牆面小擺設（畫在牆和家具之間），讓房間更有生活感。不影響謎題。
const Deco = {
  sconce(x, y, c = '#fbe3a8') { return A.pool(x, y + 6, 70, 70, 0.55) + `<path d="M${x} ${y + 40}v-26" stroke="url(#brass)" stroke-width="6"/><rect x="${x - 12}" y="${y + 36}" width="24" height="10" rx="3" fill="url(#brass)" ${SW2}/><path d="M${x - 22} ${y + 14}h44l-10-34h-24z" fill="${c}" ${SW}/><path d="M${x - 22} ${y + 14}h44l-10-34h-24z" fill="url(#cyl)" opacity=".5"/>`; },
  floorLamp(x, fy = 488, c = '#e9a85a') { A.fx(`<circle class="flick" cx="${x}" cy="${fy - 250}" r="120" fill="url(#lampG)" style="${A.ad(3.3)}"/>`); return A.sh(x, fy + 4, 40, 8) + `<path d="M${x} ${fy}V${fy - 230}" stroke="#4a3222" stroke-width="7"/><path d="M${x} ${fy}V${fy - 230}" stroke="#8a5a34" stroke-width="3"/><ellipse cx="${x}" cy="${fy}" rx="28" ry="7" fill="#6b4a33" ${SW2}/><path d="M${x - 40} ${fy - 228}h80l-16-56h-48z" fill="${c}" ${SW}/><path d="M${x - 40} ${fy - 228}h80l-16-56h-48z" fill="url(#cyl)" opacity=".6"/><path d="M${x - 38} ${fy - 228}h76l-5 6h-66z" fill="#fff6c8"/>`; },
  bookStack(x, y, n = 4, seed = 1) { const cols = ['#c9583c', '#3f7f8f', '#e0a43a', '#6f8f4a', '#8a5a9a', '#4f6aa8']; let o = A.sh(x, y + 2, 46, 6); for (let i = 0; i < n; i++) { const w = 70 - ((i * 7 + seed) % 3) * 8, c = cols[(i + seed) % cols.length], dx = ((i * 5 + seed) % 3 - 1) * 5; o += `<rect x="${x - w / 2 + dx}" y="${y - (i + 1) * 13}" width="${w}" height="13" rx="2" fill="${c}" ${SW2}/><path d="M${x - w / 2 + dx + 5} ${y - (i + 1) * 13 + 4}h${w - 10}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`; } return o; },
  jar(x, y, c, lid = '#b07644', h = 50) { return `<rect x="${x - 17}" y="${y - h - 8}" width="34" height="10" rx="3" fill="${lid}" ${SW2}/><path d="M${x - 18} ${y - h}h36v${h - 6}q0 6-6 6h-24q-6 0-6-6z" fill="${c}" ${SW2}/><path d="M${x - 18} ${y - h}h36v${h - 6}q0 6-6 6h-24q-6 0-6-6z" fill="url(#cyl)" opacity=".6"/><rect x="${x - 11}" y="${y - h * 0.62}" width="22" height="14" rx="2" fill="#fffdf3" opacity=".9"/>`; },
  jarShelf(x, y, w, cols) { let o = A.shelf(x, y, w); cols.forEach((c, i) => o += this.jar(x + 30 + i * ((w - 60) / Math.max(1, cols.length - 1)), y, c)); return o; },
  hangPlant(x, len, c = '#c9763f', leaf = '#5f9e5a') {
    let o = `<path d="M${x} 0V${len}M${x} ${len}l-22 18M${x} ${len}l22 18" stroke="#6b4a33" stroke-width="2.5" fill="none"/>`;
    o += `<path d="M${x - 26} ${len + 18}h52l-8 30h-36z" fill="${c}" ${SW}/><path d="M${x - 26} ${len + 18}h52l-8 30h-36z" fill="url(#cyl)"/>`;
    for (let i = 0; i < 5; i++) { const dx = -24 + i * 12; o += `<path d="M${x + dx} ${len + 22}q${(i - 2) * 6} ${30 + i % 2 * 26} ${(i - 2) * 3} ${56 + (i % 3) * 18}" stroke="${shade(leaf, -0.15)}" stroke-width="3" fill="none"/>`; for (let k = 1; k < 4; k++) o += `<ellipse cx="${x + dx + (i - 2) * 2 * k / 3}" cy="${len + 22 + k * (18 + i % 3 * 5)}" rx="7" ry="4" fill="${k % 2 ? leaf : shade(leaf, 0.15)}" ${SW2} transform="rotate(${(i - 2) * 25 + k * 20} ${x + dx} ${len + 22 + k * 18})"/>`; }
    return A.fx(`<g class="pend" style="animation-duration:6s;${A.ad(6)}">${o}</g>`);
  },
  beams(op = 0.18) { return A.shaft('120 0L330 0L560 488L300 488', op) + A.shaft('520 0L640 0L820 488L700 488', op * 0.8); },
  bunting(y = 46) {
    const cols = ['#e0504a', '#f2c232', '#4f9e9a', '#e57aa8', '#4f8ad8', '#6fae5a'];
    let o = `<path d="M44 ${y}Q500 ${y + 40} 956 ${y}" stroke="#7a5a40" stroke-width="2.5" fill="none"/>`;
    for (let i = 0; i < 17; i++) { const t = (i + 0.5) / 17, x = 44 + t * 912, yy = y + 80 * t * (1 - t) + 1; o += `<path d="M${x - 16} ${yy}h32l-16 26z" fill="${cols[i % 6]}" ${SW2}/>`; }
    return o;
  },
  utensils(x, y) { let o = `<path d="M${x} ${y}h300" stroke="#8a96a4" stroke-width="7" stroke-linecap="round"/><path d="M${x} ${y}h300" ${SW2} fill="none"/>`; const it = [(px) => `<path d="M${px} ${y}v70" stroke="#a8703f" stroke-width="6"/><ellipse cx="${px}" cy="${y + 82}" rx="12" ry="14" fill="url(#silver)" ${SW2}/>`, (px) => `<path d="M${px} ${y}v62" stroke="#a8703f" stroke-width="6"/><rect x="${px - 12}" y="${y + 60}" width="24" height="26" rx="4" fill="url(#silver)" ${SW2}/>`, (px) => `<path d="M${px} ${y}v40" stroke="#8a96a4" stroke-width="5"/><path d="M${px} ${y + 40}q-14 30 0 46q14-16 0-46" fill="none" stroke="#8a96a4" stroke-width="3"/><path d="M${px} ${y + 40}q-6 30 0 46q6-16 0-46" fill="none" stroke="#8a96a4" stroke-width="3"/>`, (px) => `<path d="M${px} ${y}v8" ${SW2}/><circle cx="${px}" cy="${y + 34}" r="26" fill="#c9cfd6" ${SW}/><circle cx="${px}" cy="${y + 34}" r="18" fill="#3b3a40" ${SW2}/><path d="M${px} ${y + 60}v40" stroke="#4a3222" stroke-width="7" stroke-linecap="round"/>`]; [0, 1, 2, 3, 0].forEach((k, i) => { o += `<circle cx="${x + 30 + i * 60}" cy="${y}" r="4" fill="#4a3222"/>` + it[k](x + 30 + i * 60); }); return o; },
  metronome(x, y, sc = 1) {
    const base = `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 2, 30, 5)}<path d="M-26 0l14-90h24l14 90z" fill="#7a3a2a" ${SW}/><path d="M-26 0l14-90h24l14 90z" fill="url(#cyl)"/><path d="M-14-12h28" stroke="#c9a14a" stroke-width="3"/></g>`;
    A.fx(`<g class="metro" style="${A.ad(1.6)}"><g transform="translate(${x} ${y - 14 * sc}) scale(${sc})"><path d="M0 0V-80" stroke="#e8d8b8" stroke-width="4"/><rect x="-7" y="-60" width="14" height="12" rx="2" fill="url(#brass)" ${SW2}/></g></g>`);
    return base;
  },
  cobweb(x, y, s = 1, flip) { return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" opacity=".5" stroke="#fff" stroke-width="1.4" fill="none"><path d="M0 0L70 0M0 0L0 70M0 0L52 52M0 0L66 28M0 0L28 66"/><path d="M20 0Q16 10 0 20M40 0Q34 22 0 40M60 0Q50 34 0 60"/></g>`; },
  roofBeams() { return `<path d="M0 150L210 0H260L0 186z" fill="#5a3a24" ${SW}/><path d="M1000 150L790 0H740L1000 186z" fill="#5a3a24" ${SW}/><path d="M0 186L260 0" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>`; },
};

(() => {
  const R = id => ROOMS.find(r => r.id === id);
  R('r1').deco = (v) => ({
    w: () => Deco.sconce(500, 170),
    s: () => Deco.sconce(320, 160) + Deco.sconce(680, 160),
    e: () => A.frame(640, 150, 70, 90, `<rect width="100" height="100" fill="#f6e2b8"/><circle cx="50" cy="40" r="22" fill="#f6d2b0"/><path d="M20 100q30-50 60 0z" fill="#4f8a5a"/><path d="M30 34q20-26 40 0" fill="#f4f1ea"/>`, { fc: '#c9895a' }),
  })[v]?.() || '';
  R('r2').deco = (v) => ({
    n: () => Deco.bookStack(230, 488, 5, 2) + Deco.bookStack(760, 488, 3, 4),
    e: () => Deco.floorLamp(925, 488, '#e9a85a') + Deco.bookStack(600, 488, 4, 1),
    s: () => Deco.bookStack(880, 488, 6, 3),
    w: () => Deco.bookStack(560, 488, 4, 5) + Deco.sconce(910, 170),
  })[v]?.() || '';
  R('r3').deco = (v) => Deco.beams(0.22) + ({
    n: () => Deco.hangPlant(660, 60, '#d9774b') + Deco.hangPlant(180, 90, '#4f9e9a'),
    e: () => Deco.hangPlant(480, 70, '#e0a43a'),
    s: () => Deco.hangPlant(150, 80, '#4f9e9a') + Deco.hangPlant(860, 60, '#d9774b'),
    w: () => Deco.hangPlant(780, 70, '#c9763f'),
  }[v]?.() || '');
  R('r4').deco = (v) => ({
    n: () => Deco.utensils(340, 80),
    e: () => Deco.jarShelf(370, 170, 260, ['#f6d08a', '#e98a8a', '#9fd08a', '#f4ead8']),
    s: () => Deco.jarShelf(110, 160, 620, ['#e0504a', '#f2c232', '#9fd08a', '#c9895a', '#f6d08a', '#e98a8a', '#b8d65a']),
    w: () => A.wallClock(870, 150, 34, '#e98a8a') + Deco.utensils(300, 70),
  })[v]?.() || '';
  R('r5').deco = (v, s) => ({
    n: () => Deco.sconce(200, 300 - 40) + Deco.sconce(800, 300 - 40) + Deco.metronome(640, 186, 0.9),
    e: () => Deco.floorLamp(930, 488, '#e98a8a'),
    s: () => A.frame(820, 110, 110, 110, `<rect width="100" height="100" fill="#2a2228"/><circle cx="50" cy="50" r="40" fill="#3a3238"/><circle cx="50" cy="50" r="14" fill="#f2c232"/><circle cx="50" cy="50" r="3" fill="#2a2228"/>`) + Deco.sconce(160, 180),
    w: () => Deco.floorLamp(940, 488, '#f2c46b') + Deco.floorLamp(60, 488, '#f2c46b'),
  })[v]?.() || '';
  R('r6').deco = (v) => Deco.bunting() + ({
    e: () => `<g transform="translate(620 530)">${A.sh(0, 22, 40, 7)}<circle r="30" fill="#e0504a" ${SW}/><path d="M-30 0q30 16 60 0M0-30q-16 30 0 60" stroke="#fff" stroke-width="6" fill="none"/><circle r="30" fill="url(#ballG)"/></g>`,
    s: () => `<g transform="translate(880 488)">${[0, 1, 2].map(i => `<rect x="${-50 + i * 34}" y="-34" width="32" height="32" rx="4" fill="${['#e0504a', '#4f8ad8', '#f2c232'][i]}" ${SW2}/>`).join('')}<rect x="-33" y="-66" width="32" height="32" rx="4" fill="#5fae5a" ${SW2}/></g>`,
    w: () => `<g transform="translate(420 140) rotate(-12)"><path d="M0-60L40 0 0 60-40 0z" fill="#f2c232" ${SW}/><path d="M0-60V60M-40 0H40" ${SW2}/><path d="M0 60q-20 40 10 70t-10 60" stroke="#7a5a40" stroke-width="2" fill="none"/>${[0, 1, 2].map(i => `<path d="M${-6 + i * 4} ${90 + i * 30}l12 6-12 6z" fill="#e0504a"/>`).join('')}</g>`,
    n: () => '',
  }[v]?.() || '');
  R('r7').deco = (v) => ({
    n: () => A.wallClock(820, 140, 30, '#7a4a2a') + A.wallClock(920, 210, 22, '#a8703f'),
    w: () => A.wallClock(920, 150, 34, '#5a3a24') + A.wallClock(520, 120, 24, '#a8703f'),
    e: () => Deco.sconce(900, 160),
    s: () => Deco.sconce(500, 70),
  })[v]?.() || '';
  const planet = (x, len, c, ring) => A.fx(`<g class="pend" style="animation-duration:${5 + x % 3}s;${A.ad(6)}"><path d="M${x} 0V${len}" stroke="#c9b48a" stroke-width="1.5"/><circle cx="${x}" cy="${len + 16}" r="16" fill="${c}" ${SW2}/><circle cx="${x}" cy="${len + 16}" r="16" fill="url(#ballG)"/>${ring ? `<ellipse cx="${x}" cy="${len + 16}" rx="28" ry="7" fill="none" stroke="#e0c27a" stroke-width="3"/>` : ''}</g>`);
  R('r8').deco = (v) => v === 'n' ? planet(140, 120, '#e0604a') + planet(220, 70, '#f2c232', 1) + planet(800, 90, '#4f8ad8') + planet(870, 150, '#a8a8b0') + Deco.bookStack(250, 488, 5, 2) : Deco.roofBeams() + Deco.cobweb(46, 40, 0.8) + Deco.cobweb(954, 40, 0.8, 1);
})();

// ---------- 第二輪：把比較空的房間（溫室、鐘錶工房、地下室）佈置得更豐富 ----------
Object.assign(Deco, {
  crate(x, y, w = 90, h = 70, c = '#a8784a') { return A.sh(x + w / 2, y + 3, w * 0.6, 8) + `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW}/><path d="M${x} ${y - h * 0.5}h${w}" stroke="${shade(c, -0.3)}" stroke-width="3"/><path d="M${x + 6} ${y - h + 6}L${x + w - 6} ${y - 6}" stroke="${shade(c, -0.2)}" stroke-width="7"/><rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="3" fill="url(#p-wood)"/><path d="M${x + 4} ${y - h + 4}h${w - 8}" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>`; },
  sack(x, y, c = '#c9a878', sc = 1) { return `<g transform="translate(${x} ${y}) scale(${sc})">${A.sh(0, 2, 40, 7)}<path d="M-34 0q-8-50 10-70l-6-12q24 8 40 0l-4 12q22 18 14 70z" fill="${c}" ${SW}/><path d="M-20-70q20 6 34 0" stroke="${shade(c, -0.3)}" stroke-width="3" fill="none"/><path d="M-26-10q4-30 2-50" stroke="#fff" stroke-opacity=".2" stroke-width="6" fill="none"/></g>`; },
  herbs(x, len, c = '#7a9a5a') { return `<path d="M${x} 40V${len}" stroke="#8a6a4a" stroke-width="2"/><g transform="translate(${x} ${len})">${[-10, -4, 2, 8].map((dx, i) => `<path d="M0 0q${dx} 20 ${dx * 1.4} ${40 + i * 4}" stroke="${shade(c, i % 2 ? 0.15 : -0.1)}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}<rect x="-6" y="-4" width="12" height="8" rx="2" fill="#c9a14a" ${SW2}/></g>`; },
  garlic(x, len) { let o = `<path d="M${x} 40V${len + 60}" stroke="#c9b48a" stroke-width="3"/>`; for (let i = 0; i < 4; i++) o += `<g transform="translate(${x + (i % 2 ? 8 : -8)} ${len + i * 16})"><path d="M0-8q-10 4-9 12q4 8 9 8t9-8q1-8-9-12z" fill="#f4ead8" stroke="#8a7a5a" stroke-width="1.6"/><path d="M0-8v-6" stroke="#8a7a5a" stroke-width="1.6"/></g>`; return o; },
  wineRack(x, y, cols = 4, rows = 4) { let o = `<rect x="${x - 8}" y="${y - 8}" width="${cols * 34 + 16}" height="${rows * 34 + 16}" rx="4" fill="#5a3a24" ${SW}/>`; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const cx = x + 17 + c * 34, cy = y + 17 + r * 34, full = hash(r * 7 + c + x) > 0.25; o += `<rect x="${cx - 16}" y="${cy - 16}" width="32" height="32" fill="#3a2416"/>` + (full ? `<circle cx="${cx}" cy="${cy}" r="12" fill="${hash(c * 3 + r) > 0.5 ? '#3a5a3a' : '#5a2a3a'}" stroke="#1a0e08" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="5" fill="#c9a14a"/><circle cx="${cx - 4}" cy="${cy - 4}" r="2.5" fill="#fff" opacity=".35"/>` : ''); } return A.sh(x + cols * 17, y + rows * 34 + 10, cols * 20, 8) + o; },
  barWindow(x, y, w = 110, h = 60) { return `<rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" rx="4" fill="#5a5048" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#skyNight)"/><circle cx="${x + w * 0.7}" cy="${y + h * 0.4}" r="9" fill="#fff6d0"/>${[1, 2, 3, 4].map(i => `<path d="M${x + i * w / 5} ${y}v${h}" stroke="#2a2a30" stroke-width="5"/>`).join('')}` + A.shaft(`${x} ${y + h}L${x + w} ${y + h}L${x + w * 1.6} ${y + h + 260}L${x + w * 0.2} ${y + h + 260}`, 0.12); },
  ceilBeam(c = '#4a3222') { return `<rect y="34" width="1000" height="26" fill="${c}"/><rect y="34" width="1000" height="6" fill="#fff" opacity=".08"/><rect y="60" width="1000" height="14" fill="url(#aoDn)" opacity=".6"/>` + [120, 380, 620, 880].map(x => `<rect x="${x - 10}" y="36" width="20" height="22" rx="2" fill="#2a2a30" opacity=".7"/><circle cx="${x}" cy="47" r="3" fill="#8a96a4"/>`).join(''); },
  pipes(d, c = '#8a96a4') { return `<path d="${d}" stroke="#2a2420" stroke-width="16" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="${c}" stroke-width="10" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="#fff" stroke-opacity=".25" stroke-width="3" fill="none" transform="translate(-2 -2)"/>`; },
  // 牆上的大齒輪組（裝飾用，慢慢轉；跟謎題的小齒輪不一樣，沒有號碼）
  gearTrain(x, y, sc = 1) {
    const g = (gx, gy, r, n, cls, d) => A.fx(`<g class="${cls}" style="animation-duration:${d}s;${A.ad(d)}"><g transform="translate(${x} ${y}) scale(${sc})">${A.gear(gx, gy, r, '#b08a4a', n)}<circle cx="${gx}" cy="${gy}" r="${r * 0.22}" fill="#5a3a24" ${SW2}/></g></g>`);
    g(0, 0, 54, 14, 'spin', 28); g(86, 26, 36, 10, 'spinr', 20); g(-70, 40, 28, 8, 'spinr', 16);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${[[0, 0, 60], [86, 26, 42], [-70, 40, 34]].map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r}" fill="#1e0d04" opacity=".18"/>`).join('')}</g>`;
  },
  toolShelf(x, y) { let o = A.sh(x + 55, y + 4, 60, 8) + `<rect x="${x}" y="${y - 300}" width="110" height="300" rx="4" fill="#7a4a2a" ${SW}/><rect x="${x + 8}" y="${y - 292}" width="94" height="284" fill="#5a3420"/>`; [0, 1, 2, 3].forEach(i => { const sy = y - 292 + 70 * (i + 1); o += `<rect x="${x + 4}" y="${sy - 6}" width="102" height="8" fill="#8c5634" ${SW2}/>`; }); o += Deco.jar(x + 30, y - 228, '#c9cfd6', '#8a96a4', 34) + Deco.jar(x + 76, y - 228, '#f6d08a', '#8a96a4', 30); o += `<circle cx="${x + 34}" cy="${y - 176}" r="18" fill="#fffaf0" ${SW2}/><path d="M${x + 34} ${y - 176}v-11M${x + 34} ${y - 176}l7 5" ${SW2}/><rect x="${x + 62}" y="${y - 192}" width="34" height="30" rx="4" fill="#4f6a8a" ${SW2}/>`; o += `<path d="M${x + 16} ${y - 80}h30l-4-26h-22z" fill="#c9cfd6" ${SW2}/><path d="M${x + 60} ${y - 80}q0-30 16-30t16 30z" fill="#c4683f" ${SW2}/>`; o += `<rect x="${x + 16}" y="${y - 48}" width="80" height="34" rx="4" fill="#3a5a8a" ${SW2}/><rect x="${x + 50}" y="${y - 40}" width="12" height="6" rx="2" fill="#c9cfd6"/>`; return o; },
  stool(x, y, c = '#a8703f') { return A.sh(x, y + 2, 34, 7) + `<path d="M${x - 22} ${y}l6-44M${x + 22} ${y}l-6-44M${x} ${y + 2}v-46" stroke="#4a3222" stroke-width="7" stroke-linecap="round"/><path d="M${x - 22} ${y}l6-44M${x + 22} ${y}l-6-44" stroke="${shade(c, -0.15)}" stroke-width="3"/><ellipse cx="${x}" cy="${y - 46}" rx="30" ry="9" fill="${c}" ${SW}/><path d="M${x - 16} ${y - 18}h32" stroke="#4a3222" stroke-width="4"/>`; },
  oilCan(x, y) { return A.sh(x, y + 2, 22, 5) + `<path d="M${x - 16} ${y}v-26q0-8 16-8t16 8v26z" fill="#c4502c" ${SW2}/><path d="M${x + 12} ${y - 26}l26-22" stroke="#4a3222" stroke-width="5" stroke-linecap="round"/><path d="M${x + 12} ${y - 26}l26-22" stroke="#c9cfd6" stroke-width="2.5" stroke-linecap="round"/><rect x="${x - 6}" y="${y - 40}" width="12" height="8" rx="2" fill="#8a96a4" ${SW2}/>`; },
  // 溫室：玻璃牆外面的花園（淡淡的）＋玻璃格線
  outside(wy = 392) {
    let o = `<g opacity=".55"><path d="M0 ${wy - 70}q120-60 260-30t280 0t260-20t200 10V${wy}H0z" fill="#9fd08a"/><path d="M0 ${wy - 30}q160-40 320-10t340-10t340 0V${wy}H0z" fill="#7ab86a"/>`;
    [[90, 240, 46], [240, 210, 60], [700, 220, 54], [880, 250, 44], [470, 260, 36]].forEach(([x, y, r]) => o += `<path d="M${x} ${wy}v-${wy - y - r * 0.5}" stroke="#7a5a3a" stroke-width="10"/><circle cx="${x}" cy="${y}" r="${r}" fill="#5f9e5a"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.5}" fill="#8cc47a"/>`);
    o += `</g>`;
    for (let x = 0; x <= 1000; x += 125) o += `<path d="M${x} 34V${wy - 10}" stroke="#f4fbf6" stroke-width="8"/><path d="M${x + 4} 34V${wy - 10}" stroke="#8aa8a0" stroke-width="2" opacity=".5"/>`;
    for (let y = 159; y < wy - 10; y += 125) o += `<path d="M0 ${y}H1000" stroke="#f4fbf6" stroke-width="7"/>`;
    for (let x = 30; x < 1000; x += 250) o += `<path d="M${x} ${70}l60-36M${x + 10} ${110}l90-54" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;
    return o;
  },
  etagere(x, y) { let o = A.sh(x, y + 3, 70, 9) + `<path d="M${x - 60} ${y}l14-210M${x + 60} ${y}l-14-210" stroke="#4a3222" stroke-width="9" stroke-linecap="round"/><path d="M${x - 60} ${y}l14-210M${x + 60} ${y}l-14-210" stroke="#f4fbf6" stroke-width="5" stroke-linecap="round"/>`; [[0, 64, 3], [1, 52, 3], [2, 40, 2]].forEach(([i, w, n]) => { const sy = y - 30 - i * 76; o += `<rect x="${x - w}" y="${sy}" width="${w * 2}" height="8" rx="3" fill="#f4fbf6" ${SW2}/>`; for (let k = 0; k < n; k++) { const px = x - w + 20 + k * ((w * 2 - 40) / Math.max(1, n - 1)); o += `<path d="M${px - 13} ${sy}h26l-4 -20h-18z" fill="${['#d9774b', '#4f9e9a', '#e0a43a'][(i + k) % 3]}" ${SW2}/>` + [[-8, -40], [0, -48], [8, -40], [-4, -34], [5, -32]].map(([dx, dy], j) => `<ellipse cx="${px + dx}" cy="${sy + dy + 6}" rx="5" ry="9" fill="${j % 2 ? '#6fae5a' : '#5f9e5a'}" transform="rotate(${dx * 4} ${px + dx} ${sy + dy + 6})" stroke="#2a5a3a" stroke-width="1.2"/>`).join('') + ((i + k) % 2 ? `<circle cx="${px}" cy="${sy - 44}" r="5" fill="#f2648a" ${SW2}/>` : ''); } }); return o; },
  roseTrellis(x, y, w = 120, h = 240) { let o = `<g opacity=".95">`; for (let i = 0; i <= 4; i++) o += `<path d="M${x + i * w / 4} ${y}v-${h}" stroke="#f4fbf6" stroke-width="5"/>`; for (let j = 0; j <= 6; j++) o += `<path d="M${x} ${y - j * h / 6}h${w}" stroke="#f4fbf6" stroke-width="4"/>`; o += `<path d="M${x + 10} ${y}q40-60 0-110t30-120M${x + w - 10} ${y}q-50-80 10-140t-30-90" stroke="#4f8a4a" stroke-width="5" fill="none"/>`; for (let i = 0; i < 16; i++) { const px = x + 10 + (i * 37) % (w - 20), py = y - 20 - (i * 53) % (h - 30); o += `<ellipse cx="${px}" cy="${py}" rx="8" ry="5" fill="#5f9e5a" transform="rotate(${i * 40} ${px} ${py})" stroke="#2a5a3a" stroke-width="1.2"/>`; if (i % 3 === 0) o += `<circle cx="${px + 6}" cy="${py - 4}" r="7" fill="#e0504a" ${SW2}/><path d="M${px + 3} ${py - 5}q3-4 6 0" stroke="#a8323a" stroke-width="1.5" fill="none"/>`; } return o + `</g>`; },
  potStack(x, y) { let o = A.sh(x, y + 2, 40, 7); [[0, 0, 1], [-18, -2, 0.8], [18, -2, 0.8], [0, -28, 0.75]].forEach(([dx, dy, s]) => { o += `<path d="M${x + dx - 22 * s} ${y + dy - 30 * s}h${44 * s}l-6 ${30 * s}h${-32 * s}z" fill="#d9774b" ${SW2}/><rect x="${x + dx - 24 * s}" y="${y + dy - 34 * s}" width="${48 * s}" height="${8 * s}" rx="2" fill="#e98a5f" ${SW2}/>`; }); return o; },
  fern(x, y, sc = 1, pot = '#4f9e9a') { let o = A.sh(x, y + 2, 40 * sc, 8 * sc) + `<g transform="translate(${x} ${y}) scale(${sc})">`; for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.12 + i * 0.095), L = 80 + (i % 3) * 16, ex = Math.cos(a) * L, ey = Math.sin(a) * L - 40; o += `<path d="M0 -40Q${ex * 0.5} ${ey * 0.7 - 20} ${ex} ${ey}" stroke="#3f7a4a" stroke-width="3" fill="none"/>`; for (let k = 1; k < 6; k++) { const t = k / 6, px = ex * t, py = -40 + (ey + 40) * t - Math.sin(t * Math.PI) * 18; o += `<ellipse cx="${px}" cy="${py}" rx="9" ry="3.5" fill="${k % 2 ? '#6fae5a' : '#5f9e5a'}" transform="rotate(${(a * 180 / Math.PI) + 60} ${px} ${py})"/>`; } } o += `<path d="M-30 -42h60l-8 42h-44z" fill="${pot}" ${SW}/><path d="M-30 -42h60l-8 42h-44z" fill="url(#cyl)"/><rect x="-34" y="-48" width="68" height="10" rx="4" fill="${shade(pot, 0.12)}" ${SW}/></g>`; return o; },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  // 溫室
  const r3old = R('r3').deco;
  R('r3').deco = (v, s) => Deco.outside(392) + ({
    n: () => Deco.roseTrellis(862, 392, 110, 250) + Deco.fern(760, 488, 0.9, '#d9774b'),
    e: () => Deco.potStack(60, 488) + Deco.sack(920, 488, '#b89a6a', 0.9) + Deco.sack(880, 488, '#c9a878', 0.75),
    s: () => Deco.etagere(70, 488) + Deco.fern(930, 488, 1.05),
    w: () => Deco.potStack(330, 488),
  }[v]?.() || '') + r3old(v, s);
  // 鐘錶工房
  const r7old = R('r7').deco;
  R('r7').deco = (v, s) => ({
    n: () => Deco.gearTrain(420, 92, 0.85) + Deco.toolShelf(10, 486) + Deco.stool(680, 548),
    e: () => Deco.stool(150, 560) + Deco.oilCan(880, 520) + Deco.crate(840, 488, 100, 64),
    s: () => Deco.gearTrain(160, 110, 0.7) + Deco.crate(40, 488, 96, 62) + Deco.oilCan(760, 520) + Deco.stool(860, 560),
    w: () => Deco.gearTrain(300, 76, 0.6) + Deco.stool(500, 560) + Deco.crate(860, 488, 100, 70),
  }[v]?.() || '') + r7old(v, s);
  // 地下室
  R('r9').deco = (v) => Deco.ceilBeam() + Deco.cobweb(46, 60, 0.9) + Deco.cobweb(954, 60, 0.9, 1) + ({
    s: () => Deco.herbs(600, 110, '#8aa85a') + Deco.garlic(680, 90) + Deco.herbs(760, 120, '#a8885a') + Deco.crate(890, 488, 90, 66) + Deco.crate(900, 422, 70, 50, '#b8885a') + Deco.sack(470, 488, '#c9a878', 0.85),
    w: () => Deco.barWindow(450, 80) + Deco.herbs(300, 100) + Deco.garlic(700, 90) + Deco.herbs(860, 110, '#a8885a'),
    n: () => Deco.wineRack(282, 230, 4, 6) + Deco.pipes('M220 80H262V40') + Deco.sack(895, 488, '#c9a878', 0.8),
    e: () => Deco.pipes('M750 110V60H980') + Deco.herbs(560, 100) + Deco.crate(30, 488, 70, 50),
  }[v]?.() || '');
})();
Object.assign(Deco, {
  dollhouse(x, y) { return A.sh(x, y + 3, 90, 9) + `<g filter="url(#ds2)"><rect x="${x - 80}" y="${y - 130}" width="160" height="130" fill="#f6e2c0" ${SW}/><path d="M${x - 92} ${y - 128}L${x} ${y - 200}L${x + 92} ${y - 128}z" fill="#e57aa8" ${SW}/><path d="M${x - 80} ${y - 66}h160" stroke="#c9a87f" stroke-width="5"/>${[[-56, -112], [12, -112], [-56, -48]].map(([dx, dy]) => `<rect x="${x + dx}" y="${y + dy}" width="40" height="34" rx="3" fill="#cfeaf2" ${SW2}/><path d="M${x + dx + 20} ${y + dy}v34M${x + dx} ${y + dy + 17}h40" stroke="#fff" stroke-width="3"/>`).join('')}<rect x="${x + 16}" y="${y - 52}" width="34" height="52" rx="14" fill="#c4683f" ${SW2}/><circle cx="${x + 42}" cy="${y - 26}" r="3" fill="url(#brass)"/><circle cx="${x}" cy="${y - 158}" r="12" fill="#fff6c8" ${SW2}/></g>`; },
  drum(x, y) { return A.sh(x, y + 2, 40, 7) + `<rect x="${x - 34}" y="${y - 44}" width="68" height="44" fill="#e0504a" ${SW}/><path d="M${x - 34} ${y - 44}l17 44M${x - 17} ${y - 44}l17 44M${x} ${y - 44}l17 44M${x + 17} ${y - 44}l17 44" stroke="#f2c232" stroke-width="3"/><ellipse cx="${x}" cy="${y - 44}" rx="34" ry="9" fill="#fffaf0" ${SW}/><ellipse cx="${x}" cy="${y}" rx="34" ry="9" fill="none" ${SW}/><path d="M${x + 20} ${y - 60}l26-26M${x + 30} ${y - 54}l30-18" stroke="#a8703f" stroke-width="5" stroke-linecap="round"/>`; },
  xylo(x, y) { let o = A.sh(x, y + 2, 60, 6) + `<path d="M${x - 60} ${y - 6}l10-20h100l10 20z" fill="#a8703f" ${SW2}/>`; ['#e0504a', '#f08a3a', '#f2c232', '#6fae5a', '#4f8ad8', '#9a6ac8'].forEach((c, i) => o += `<rect x="${x - 50 + i * 17}" y="${y - 34 + i * 1.5}" width="14" height="${30 - i * 2}" rx="3" fill="${c}" ${SW2}/>`); return o; },
  starMap(x, y, w = 150, h = 110) { let inner = `<rect width="100" height="100" fill="#1a2250"/>`; for (let i = 0; i < 18; i++) inner += `<circle cx="${(i * 37) % 100}" cy="${(i * 59) % 100}" r="${0.8 + (i % 3) * 0.5}" fill="#fff8d8"/>`; inner += `<path d="M14 70L30 52L48 58L62 40L80 30" stroke="#c9d4ee" stroke-width="1.2" fill="none" opacity=".7"/><circle cx="50" cy="50" r="40" fill="none" stroke="#c9a14a" stroke-width="1" opacity=".6"/>`; return A.frame(x, y, w, h, inner, { fc: '#8a6a3a' }); },
  paperStars(y = 70) { let o = `<path d="M60 ${y}Q500 ${y + 50} 940 ${y}" stroke="#c9b48a" stroke-width="2" fill="none"/>`; for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, x = 60 + t * 880, yy = y + 100 * t * (1 - t) * 0.5 + 10; o += `<path d="M${x} ${yy - 12}v12" stroke="#c9b48a" stroke-width="1.5"/>` + A.star(x, yy + 4, 10, ['#f2c232', '#fff6c8', '#e0a43a'][i % 3], 'stroke="#8a5a1a" stroke-width="1.5"'); } return o; },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const r6old = R('r6').deco;
  R('r6').deco = (v, s) => r6old(v, s) + ({ n: () => Deco.drum(860, 556) + Deco.xylo(320, 560) }[v]?.() || '');
  const r8old = R('r8').deco;
  R('r8').deco = (v, s) => r8old(v, s) + ({ w: () => Deco.starMap(796, 150, 120, 90) + Deco.paperStars(64) + Deco.floorLamp(80, 488, '#9a6ac8'), e: () => Deco.paperStars(64) }[v]?.() || '');
})();

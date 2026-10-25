'use strict';
// 場景佈置：每個房間的牆面小擺設（畫在牆和家具之間），讓房間更有生活感。不影響謎題。
const Deco = {
  sconce(x, y, c = '#fbe3a8') { return A.pool(x, y + 6, 70, 70, 0.55) + `<path d="M${x} ${y + 40}v-26" stroke="#c9963a" stroke-width="6"/><path d="M${x - 1.5} ${y + 40}v-26" stroke="#fff0b8" stroke-width="1.4" opacity=".8"/><rect x="${x - 12}" y="${y + 36}" width="24" height="10" rx="3" fill="url(#brass)" ${SW2}/><path d="M${x - 22} ${y + 14}h44l-10-34h-24z" fill="${c}" ${SW}/><path d="M${x - 22} ${y + 14}h44l-10-34h-24z" fill="url(#cyl)" opacity=".5"/>`; },
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
    // 遠山、樹林剪影、近處的樹（一團一團的葉子，有亮面和暗面）、花叢、小白籬笆
    let o = `<g opacity=".6"><path d="M0 ${wy - 120}l60-30 70 22 90-46 80 34 60-20 90 40 100-50 90 36 80-24 90 30 90-20V${wy}H0z" fill="#b9d6d0"/><path d="M0 ${wy - 70}q120-60 260-30t280 0t260-20t200 10V${wy}H0z" fill="#9fd08a"/>`;
    let sil = ''; for (let x = -10; x < 1010; x += 34) { const h = 18 + hash(x) * 22; sil += `M${x} ${wy - 64}q6-${h} 17-${h}t17 ${h}`; }
    o += `<path d="${sil}V${wy}H-10z" fill="#86bb78"/><path d="M0 ${wy - 30}q160-40 320-10t340-10t340 0V${wy}H0z" fill="#7ab86a"/>`;
    [[90, 240, 46], [240, 210, 60], [700, 220, 54], [880, 250, 44], [470, 260, 36]].forEach(([x, y, r], k) => {
      o += `<path d="M${x} ${wy}v-${wy - y - r * 0.5}M${x} ${y + r * 0.8}l${-r * 0.4} ${-r * 0.4}M${x} ${y + r * 0.95}l${r * 0.45} ${-r * 0.35}" stroke="#7a5a3a" stroke-width="${(r * 0.18).toFixed(1)}" stroke-linecap="round"/>`;
      const cl = [[0, 0, 1, '#5f9e5a'], [-0.55, 0.25, 0.62, '#4f8a4a'], [0.55, 0.2, 0.6, '#57964f'], [-0.3, -0.45, 0.55, '#72ae62'], [0.3, -0.4, 0.5, '#7ab86a'], [0, 0.35, 0.6, '#4a8445'], [-0.15, -0.2, 0.36, '#9fd08a']];
      cl.forEach(([dx, dy, rr, c]) => o += `<circle cx="${(x + dx * r).toFixed(1)}" cy="${(y + dy * r).toFixed(1)}" r="${(rr * r).toFixed(1)}" fill="${c}"/>`);
      let lv = ''; for (let i = 0; i < 9; i++) { const a = hash(k * 13 + i) * 6.28, d = r * (0.3 + hash(k * 7 + i) * 0.6); lv += `M${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}q3-4 6 0`; }
      o += `<path d="${lv}" stroke="#c4e4a8" stroke-width="1.6" fill="none"/>`;
    });
    let fl = ''; for (let x = 10; x < 1000; x += 26) { const c = ['#f2b6b0', '#fff6c8', '#e98a8a', '#f6d06a', '#c9b0e8'][Math.floor(hash(x * 3) * 5)]; o += `<circle cx="${x}" cy="${wy - 14 - hash(x) * 10}" r="${9 + hash(x + 1) * 6}" fill="#5f9e5a"/>`; fl += `<circle cx="${x - 4}" cy="${wy - 20 - hash(x) * 10}" r="2.6" fill="${c}"/><circle cx="${x + 5}" cy="${wy - 15 - hash(x) * 8}" r="2.2" fill="${c}"/>`; }
    let fence = ''; for (let x = 6; x < 1000; x += 22) fence += `M${x} ${wy - 4}v-28l3-4 3 4v28`;
    o += fl + `<path d="${fence}" fill="#fffaf0" opacity=".85"/><path d="M0 ${wy - 22}h1000M0 ${wy - 10}h1000" stroke="#fffaf0" stroke-width="3" opacity=".85"/></g>`;
    for (let x = 0; x <= 1000; x += 125) o += `<path d="M${x} 34V${wy - 10}" stroke="#f4fbf6" stroke-width="8"/><path d="M${x - 2.5} 34V${wy - 10}" stroke="#fff" stroke-width="1.2"/><path d="M${x + 3.5} 34V${wy - 10}" stroke="#8aa8a0" stroke-width="1.2" opacity=".6"/>`;
    for (let y = 159; y < wy - 10; y += 125) o += `<path d="M0 ${y}H1000" stroke="#f4fbf6" stroke-width="7"/><path d="M0 ${y + 3}H1000" stroke="#8aa8a0" stroke-width="1" opacity=".5"/>`;
    for (let x = 30; x < 1000; x += 250) o += `<path d="M${x} ${70}l60-36M${x + 10} ${110}l90-54" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/><path d="M${x + 24} ${118}l70-42" stroke="#fff" stroke-opacity=".2" stroke-width="1.6" stroke-linecap="round"/>`;
    let dew = ''; for (let i = 0; i < 40; i++) dew += `<circle cx="${(hash(i * 3.7) * 1000).toFixed(0)}" cy="${(250 + hash(i * 5.1) * (wy - 270)).toFixed(0)}" r="${(0.8 + hash(i) * 1.4).toFixed(1)}" fill="#fff" opacity=".5"/>`;
    return o + dew;
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

// ---------- 第三輪：更精緻的小擺設（全部畫在牆與家具之間，不影響謎題、不擋熱點） ----------
Object.assign(Deco, {
  // 牆上的掛畫：0 風景、1 靜物、2 海景、3 側影、4 植物圖鑑、5 地圖
  pic(x, y, w, h, kind = 0, fc) {
    const P = [
      `<rect width="100" height="100" fill="#cfe6f0"/><rect width="100" height="45" fill="#e8f2f4"/><circle cx="72" cy="26" r="9" fill="#fff4c8"/><path d="M0 58l18-16 12 8 20-20 18 14 14-8 18 12V100H0z" fill="#9db8c8"/><path d="M0 70q30-12 60-2t40-4V100H0z" fill="#8cbf7a"/><path d="M0 84q40-8 100 0V100H0z" fill="#6fa25e"/><path d="M14 84v-14" stroke="#5a4a3a" stroke-width="1.6"/><circle cx="14" cy="66" r="7" fill="#4f8a4a"/><circle cx="11" cy="63" r="3" fill="#7ab86a"/><path d="M60 76h22M64 79h14" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/>`,
      `<rect width="100" height="100" fill="#3e3236"/><rect y="78" width="100" height="22" fill="#6a4a38"/><path d="M0 78h100" stroke="#8a6a50" stroke-width="1"/><path d="M40 78q-6-20 4-30h12q10 10 4 30z" fill="#4f7a9a"/><path d="M44 52q2 14 0 22" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/><path d="M50 48q-4-12-10-18M50 48q2-12 8-22M50 48q8-6 16-10M50 48q-10-2-16-6" stroke="#5f8a4a" stroke-width="1.3" fill="none"/><circle cx="40" cy="30" r="7.5" fill="#e9a0a0"/><circle cx="58" cy="26" r="8.5" fill="#f2d07a"/><circle cx="50" cy="16" r="6.5" fill="#f6f0e6"/><circle cx="66" cy="38" r="5.5" fill="#e9a0a0"/><circle cx="34" cy="42" r="5.5" fill="#c4683f"/><g fill="#fff" opacity=".4"><circle cx="38" cy="28" r="2"/><circle cx="56" cy="23" r="2.4"/><circle cx="48" cy="14" r="1.8"/></g><circle cx="78" cy="86" r="5" fill="#d9a548"/><circle cx="22" cy="88" r="4" fill="#c4502c"/>`,
      `<rect width="100" height="100" fill="#f6e2c0"/><rect width="100" height="58" fill="#cfe2ee"/><circle cx="24" cy="24" r="10" fill="#fff0c0"/><path d="M60 20h14M64 16h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><rect y="58" width="100" height="42" fill="#5f8fb0"/><path d="M0 66q10-3 20 0t20 0t20 0t20 0t20 0M0 78q10-3 20 0t20 0t20 0t20 0t20 0M0 90q10-3 20 0t20 0t20 0t20 0t20 0" stroke="#cfe6f2" stroke-width="1" fill="none"/><path d="M50 56V22l18 30z" fill="#fffaf0"/><path d="M48 56V30l-14 22z" fill="#f2d0b0"/><path d="M50 22v36" stroke="#5a3a24" stroke-width="1.2"/><path d="M32 58h36l-6 7H38z" fill="#7a4a2a"/>`,
      `<rect width="100" height="100" fill="#e8d8c0"/><ellipse cx="50" cy="50" rx="40" ry="46" fill="#f4e8d4"/><ellipse cx="50" cy="50" rx="40" ry="46" fill="none" stroke="#c9a87f" stroke-width="1"/><path d="M30 100q2-30 22-34q-10-6-10-22q0-18 14-20q16 0 18 16l4 8-4 2q2 8-4 10l-2 6q10 4 14 34z" fill="#4a3a4a"/><path d="M44 30q8-10 20-4" stroke="#6a5a6a" stroke-width="1.4" fill="none"/>`,
      `<rect width="100" height="100" fill="#f6efdc"/><path d="M50 92V16" stroke="#5f8a4a" stroke-width="1.6"/>${[28, 42, 56, 70].map((y, i) => `<path d="M50 ${y}q${i % 2 ? 22 : -22} -12 ${i % 2 ? 30 : -30} 2q${i % 2 ? -14 : 14} 10 ${i % 2 ? -30 : 30} -2z" fill="#8cbf7a" stroke="#4f7a3a" stroke-width=".8"/><path d="M50 ${y}l${i % 2 ? 24 : -24} -3" stroke="#4f7a3a" stroke-width=".6"/>`).join('')}<circle cx="50" cy="14" r="5" fill="#e9a0a0" stroke="#a8494a" stroke-width=".6"/><path d="M24 94h52" stroke="#7a5a3a" stroke-width=".8"/><path d="M32 97h36" stroke="#b8a888" stroke-width=".6"/>`,
      `<rect width="100" height="100" fill="#f0e2c0"/><path d="M10 30q20-14 36-4t30-8t18 10q-4 20 6 30t-14 28q-20 4-34-6t-30 2q-10-20-4-30t-8-22z" fill="#cfe0a8" stroke="#8a7a4a" stroke-width=".8"/><path d="M30 40q14 10 24 4t20 12" stroke="#5f8fb0" stroke-width="1.4" fill="none"/><path d="M20 70l50-40" stroke="#c4502c" stroke-width=".9" stroke-dasharray="3 2"/><circle cx="70" cy="30" r="2.4" fill="#c4502c"/><path d="M84 84l4-10 4 10-4-3z" fill="#4a3222"/><path d="M4 4h92v92H4z" fill="none" stroke="#a8946a" stroke-width=".8"/>`,
    ];
    return A.frame(x, y, w, h, P[kind % P.length], { fc: fc || '#c9a14a' });
  },
  // 牆上的小層板：書、花瓶
  wallShelf(x, y, w, seed = 1, vase = '#4f9e9a') {
    let o = A.shelf(x, y, w, '#9a6a3f');
    o += A.books(x + 10, y - 58, Math.max(2, Math.floor((w - 70) / 28)), 58, seed);
    const vx = x + w - 28;
    o += `<path d="M${vx - 9} ${y}q-6-18 4-26v-6h10v6q10 8 4 26z" fill="${vase}" ${SW2}/><path d="M${vx - 9} ${y}q-6-18 4-26v-6h10v6q10 8 4 26z" fill="url(#cyl)"/><path d="M${vx} ${y - 32}q-6-14-14-16M${vx} ${y - 32}q2-16 10-20M${vx} ${y - 32}q8-6 16-4" stroke="#5f8a4a" stroke-width="1.3" fill="none"/>` + [[-14, -48, '#f2b6b0', 4], [10, -52, '#f2d07a', 4.5], [16, -36, '#fffaf0', 3.5]].map(([dx, dy, c, r]) => `<circle cx="${vx + dx}" cy="${y + dy}" r="${r}" fill="${c}" ${SW2}/><circle cx="${vx + dx}" cy="${y + dy}" r="${r * 0.35}" fill="#e0a43a"/>`).join('');
    return o;
  },
  // 橢圓鏡子
  mirror(x, y, rx = 40, ry = 54) {
    return `<ellipse cx="${x + 3}" cy="${y + 6}" rx="${rx + 12}" ry="${ry + 12}" fill="url(#shG)" opacity=".4"/><ellipse cx="${x}" cy="${y}" rx="${rx + 8}" ry="${ry + 8}" fill="url(#brass)" ${SW}/><ellipse cx="${x}" cy="${y}" rx="${rx + 4.5}" ry="${ry + 4.5}" fill="none" stroke="#7a4a14" stroke-width=".8" stroke-dasharray="2 2.5"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#cfe0e2" ${SW2}/><ellipse cx="${x}" cy="${y + ry * 0.3}" rx="${rx * 0.9}" ry="${ry * 0.6}" fill="#a8b8b4" opacity=".5"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#glassR)"/><path d="M${x - rx * 0.5} ${y - ry * 0.2}l${rx * 0.5} ${-ry * 0.5}M${x - rx * 0.4} ${y + ry * 0.05}l${rx * 0.75} ${-ry * 0.75}" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/><circle cx="${x}" cy="${y - ry - 10}" r="5" fill="url(#brass)" ${SW2}/>`;
  },
  // 掛鉤橫木＋掛著的東西（帽子、圍巾、提袋）
  hookRail(x, y, w, items = ['hat', 'scarf', 'bag']) {
    let o = `<rect x="${x}" y="${y}" width="${w}" height="14" rx="3" fill="#a8703f" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="14" rx="3" fill="url(#p-grainH)"/><path d="M${x + 3} ${y + 3}h${w - 6}" stroke="#fff" stroke-opacity=".35" stroke-width="1"/><rect x="${x + 4}" y="${y + 14}" width="${w - 8}" height="8" fill="url(#aoDn)" opacity=".5"/>`;
    const n = items.length;
    items.forEach((k, i) => {
      const hx = x + w * (i + 0.5) / n;
      o += `<path d="M${hx} ${y + 7}q0 10 6 12" stroke="url(#brass)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="${hx}" cy="${y + 7}" r="3" fill="url(#brass)" ${SW2}/>`;
      if (k === 'hat') o += `<g transform="translate(${hx + 4} ${y + 20})"><path d="M-26 22q26-10 52 0q-4 6-26 6t-26-6z" fill="#8a6a4a" ${SW2}/><path d="M-16 20q-2-24 16-24t16 24z" fill="#9a7a5a" ${SW2}/><path d="M-16 14q16 4 32 0v5q-16 4-32 0z" fill="#c4502c"/><path d="M-10 0q6-6 14-4" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/></g>`;
      if (k === 'scarf') o += `<g transform="translate(${hx + 4} ${y + 18})"><path d="M-10 0q10-6 20 0l-2 70h-8l-2-50-2 56h-8z" fill="#c9583c" ${SW2}/><path d="M-10 0q10-6 20 0l-2 70h-8l-2-50-2 56h-8z" fill="url(#p-knit)"/><path d="M-9 14h18M-9 30h17M-8 46h8" stroke="#f2c46b" stroke-width="2.4"/><path d="M-6 76v6M-3 76v7M0 70v6M3 70v7M6 70v6" stroke="#c9583c" stroke-width="1.2"/></g>`;
      if (k === 'bag') o += `<g transform="translate(${hx + 6} ${y + 18})"><path d="M-12 22q0-22 12-22t12 22" stroke="#7a4a2a" stroke-width="2.4" fill="none"/><path d="M-22 22h44l-4 40h-36z" fill="#d9b88a" ${SW2}/><path d="M-22 22h44l-4 40h-36z" fill="url(#p-weave)"/><path d="M-20 34h40" stroke="#a8742a" stroke-width="1.2" stroke-dasharray="3 2"/><circle cx="0" cy="44" r="5" fill="#6f9fb8" ${SW2}/></g>`;
      if (k === 'keys') o += `<g transform="translate(${hx + 6} ${y + 18})"><circle r="6" fill="none" stroke="url(#brass)" stroke-width="2.4"/><path d="M0 6v18h5M0 18h4" stroke="url(#brass)" stroke-width="3" fill="none"/><path d="M-4 5l-6 16h4" stroke="#9aa6b4" stroke-width="2.6" fill="none"/></g>`;
      if (k === 'apron') o += `<g transform="translate(${hx + 4} ${y + 18})"><path d="M-8 0q8 10 16 0" stroke="#e98a8a" stroke-width="2" fill="none"/><path d="M-16 8h32l4 60h-40z" fill="#fbe0e0" ${SW2}/><path d="M-16 8h32l4 60h-40z" fill="url(#p-weave)"/><rect x="-9" y="36" width="18" height="14" rx="2" fill="none" stroke="#e98a8a" stroke-width="1.4"/><path d="M-18 60h36" stroke="#e98a8a" stroke-width="2" stroke-dasharray="3 3"/></g>`;
    });
    return o;
  },
  // 編織籃（可以裝東西）
  basket(x, y, w = 70, h = 44, fill = 'yarn') {
    let o = A.sh(x, y + 2, w * 0.55, 6);
    if (fill === 'yarn') o += [[-w * 0.2, '#e57aa8'], [w * 0.12, '#6fae9a'], [-w * 0.02, '#f2c46b']].map(([dx, c], i) => `<circle cx="${x + dx}" cy="${y - h + 4 - i * 3}" r="${w * 0.17}" fill="${c}" ${SW2}/><path d="M${x + dx - w * 0.12} ${y - h + 2 - i * 3}q${w * 0.12} -${w * 0.08} ${w * 0.24} 0M${x + dx - w * 0.14} ${y - h + 8 - i * 3}q${w * 0.14} -${w * 0.08} ${w * 0.28} 0" stroke="${shade(c, -0.25)}" stroke-width="1" fill="none"/>`).join('') + `<path d="M${x + w * 0.1} ${y - h - 6}q20-14 26 6" stroke="#8a6a4a" stroke-width="1.4" fill="none"/>`;
    if (fill === 'towel') o += `<rect x="${x - w * 0.36}" y="${y - h - 8}" width="${w * 0.72}" height="18" rx="8" fill="#f4f0e6" ${SW2}/><path d="M${x - w * 0.3} ${y - h - 2}h${w * 0.6}" stroke="#6f9fb8" stroke-width="2"/>`;
    let wv = ''; for (let i = 1; i < 5; i++) wv += `M${x - w / 2 + 2} ${y - h + i * h / 5}h${w - 4}`;
    let vt = ''; for (let i = 1; i < 9; i++) vt += `M${x - w / 2 + i * w / 9} ${y - h}l${(i - 4.5) * 0.6} ${h}`;
    o += `<path d="M${x - w / 2} ${y - h}h${w}l-5 ${h}h${-w + 10}z" fill="#c9a06a" ${SW2}/><path d="${wv}" stroke="#8a6a3a" stroke-width="1.4" stroke-dasharray="5 3"/><path d="${vt}" stroke="#a8804a" stroke-width=".8"/><path d="M${x - w / 2} ${y - h}h${w}l-5 ${h}h${-w + 10}z" fill="url(#cyl)" opacity=".7"/><rect x="${x - w / 2 - 2}" y="${y - h - 4}" width="${w + 4}" height="7" rx="3.5" fill="#b8905a" ${SW2}/>`;
    return o;
  },
  // 小盆花
  flowerPot(x, y, c = '#e98a8a', pot = '#d9774b', s = 1) {
    let o = A.sh(x, y + 2, 22 * s, 5 * s) + `<g transform="translate(${x} ${y}) scale(${s})">`;
    [[-10, -58, -14], [2, -66, 4], [12, -54, 16], [-2, -50, -4]].forEach(([fx, fy, a], i) => {
      o += `<path d="M0 -24Q${fx * 0.5} ${fy * 0.6} ${fx} ${fy}" stroke="#4f7a3a" stroke-width="1.6" fill="none"/><path d="M${fx * 0.4} ${fy * 0.55}q${a * 0.6} -6 ${a} 0q${-a * 0.6} 6 ${-a} 0z" fill="#6fa25e" stroke="#3f6a2e" stroke-width=".7"/>`;
      o += [0, 72, 144, 216, 288].map(r => `<ellipse cx="${fx}" cy="${fy - 4}" rx="2.8" ry="4.5" fill="${i % 2 ? shade(c, 0.2) : c}" stroke="${shade(c, -0.35)}" stroke-width=".6" transform="rotate(${r + i * 20} ${fx} ${fy})"/>`).join('') + `<circle cx="${fx}" cy="${fy}" r="2.2" fill="#f6d06a"/>`;
    });
    o += `<path d="M-16 -24h32l-5 24h-22z" fill="${pot}" ${SW2}/><path d="M-16 -24h32l-5 24h-22z" fill="url(#cyl)"/><rect x="-18" y="-28" width="36" height="7" rx="2" fill="${shade(pot, 0.12)}" ${SW2}/><path d="M-12 -14h24" stroke="${shade(pot, 0.35)}" stroke-width="1.4" stroke-dasharray="2 2"/></g>`;
    return o;
  },
  // 長方形地毯（有透視、花紋邊框、流蘇）
  rugRect(cx, y, w, d, c = '#a8494a', c2 = '#f2c46b') {
    const t = 0.86, a = cx - w * t / 2, b = cx + w * t / 2, L = cx - w / 2, Rr = cx + w / 2;
    const q = (k, kk) => `M${a + (L - a) * kk + w * t * k / 2 * (1 - kk) + w * k / 2 * kk - (w * t * k / 2 * (1 - kk) + w * k / 2 * kk) * 0} ${y}`;
    let fr = ''; for (let i = 0; i <= 24; i++) { const f = i / 24; fr += `M${(L + (Rr - L) * f).toFixed(1)} ${y + d}v6M${(a + (b - a) * f).toFixed(1)} ${y}v-4`; }
    const P = (inset) => { const ix = inset, iy = inset * 0.45; return `M${a + ix * t} ${y + iy}L${b - ix * t} ${y + iy}L${Rr - ix} ${y + d - iy}L${L + ix} ${y + d - iy}z`; };
    return `<path d="M${a - 6} ${y + 4}L${b + 6} ${y + 4}L${Rr + 10} ${y + d + 8}L${L - 10} ${y + d + 8}z" fill="#1e0d04" opacity=".18"/><path d="${fr}" stroke="${shade(c2, -0.1)}" stroke-width="1.3"/><path d="${P(0)}" fill="${c}" ${SW}/><path d="${P(0)}" fill="url(#p-knit)"/><path d="${P(10)}" fill="none" stroke="${c2}" stroke-width="5" stroke-dasharray="9 4 2 4"/><path d="${P(18)}" fill="none" stroke="${shade(c, -0.25)}" stroke-width="1.2"/><path d="${P(24)}" fill="${shade(c, -0.1)}" opacity=".6"/><path d="M${cx - w * 0.2} ${y + d / 2}L${cx} ${y + d * 0.22}L${cx + w * 0.2} ${y + d / 2}L${cx} ${y + d * 0.78}z" fill="none" stroke="${c2}" stroke-width="2"/><path d="M${cx - w * 0.1} ${y + d / 2}L${cx} ${y + d * 0.36}L${cx + w * 0.1} ${y + d / 2}L${cx} ${y + d * 0.64}z" fill="${c2}" opacity=".8"/><path d="${P(0)}" fill="url(#fm)"/>`;
  },
  // 有齒飾的小邊桌，上面可以放東西
  sideTable(x, y, top = '') {
    return A.sh(x, y + 3, 44, 7) + `<path d="M${x - 26} ${y}l4-60M${x + 26} ${y}l-4-60" stroke="#4a3222" stroke-width="6" stroke-linecap="round"/><path d="M${x - 26} ${y}l4-60M${x + 26} ${y}l-4-60" stroke="#9a6a3f" stroke-width="3.4" stroke-linecap="round"/><path d="M${x - 22} ${y - 22}h44" stroke="#7a4a2a" stroke-width="3"/><ellipse cx="${x}" cy="${y - 62}" rx="38" ry="9" fill="#b07644" ${SW}/><ellipse cx="${x}" cy="${y - 62}" rx="38" ry="9" fill="url(#p-grainH)"/><path d="M${x - 38} ${y - 62}v5q38 12 76 0v-5" fill="#8c5634" ${SW2}/><ellipse cx="${x - 8}" cy="${y - 64}" rx="20" ry="3" fill="#fff" opacity=".2"/>` + top;
  },
  // 燭台
  candle(x, y, n = 1) {
    let o = `<ellipse cx="${x}" cy="${y}" rx="${10 + n * 4}" ry="4" fill="url(#brass)" ${SW2}/>`;
    for (let i = 0; i < n; i++) { const cx = x + (i - (n - 1) / 2) * 12, h = 26 - Math.abs(i - (n - 1) / 2) * 6; o += `<rect x="${cx - 3.5}" y="${y - h}" width="7" height="${h}" rx="1.5" fill="#fbf3e0" ${SW2}/><path d="M${cx + 1.5} ${y - h + 2}v${h - 4}" stroke="#e8d8b8" stroke-width="1.4"/>`; A.fx(`<g class="flick" style="${A.ad(2.2 + i * 0.3)}"><ellipse cx="${cx}" cy="${y - h - 6}" rx="3" ry="6" fill="#ffd36a"/><ellipse cx="${cx}" cy="${y - h - 5}" rx="1.4" ry="3" fill="#fff8d8"/><circle cx="${cx}" cy="${y - h - 6}" r="14" fill="url(#lampG)" opacity=".7"/></g>`); }
    return o;
  },
  // 小仙人掌
  cactus(x, y, s = 1) {
    return A.sh(x, y + 2, 18 * s, 4 * s) + `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-8 -20v-32q0-10 8-10t8 10v32z" fill="#6fae7a" ${SW2}/><path d="M8 -36h6q6 0 6-8v-8" fill="none" stroke="#4a3222" stroke-width="7.4" stroke-linecap="round"/><path d="M8 -36h6q6 0 6-8v-8" fill="none" stroke="#6fae7a" stroke-width="4.6" stroke-linecap="round"/><path d="M-3 -58v34M3 -56v32" stroke="#4f8a5a" stroke-width=".8"/><path d="M-6 -50l-3-1M-6 -40l-3-1M6 -46l3-1M6 -32l3-1" stroke="#fffaf0" stroke-width=".8"/><circle cx="0" cy="-63" r="3" fill="#f08ab0"/><path d="M-13 -20h26l-3 20h-20z" fill="#e0a43a" ${SW2}/><path d="M-13 -20h26l-3 20h-20z" fill="url(#cyl)"/></g>`;
  },
  // 牆面頂端的花邊飾帶（壁紙邊）
  frieze(c, y = 40, h = 16) { return `<rect y="${y}" width="1000" height="${h}" fill="${shade(c, -0.12)}"/><rect y="${y}" width="1000" height="${h}" fill="url(#p-frieze)"/><path d="M0 ${y + 0.6}h1000M0 ${y + h - 0.6}h1000" stroke="#fff" stroke-opacity=".35" stroke-width="1"/><path d="M0 ${y + h + 0.6}h1000" stroke="#1e0d04" stroke-opacity=".18" stroke-width="1.2"/>`; },
});
// ---------- 第四輪：每個房間再添一些有細節的擺設 ----------
Object.assign(Deco, {
  shoes(x, y, c = '#7a4a2a') { return A.sh(x + 14, y + 2, 34, 5) + [0, 26].map(dx => `<path d="M${x + dx - 12} ${y}q-2-10 6-12l6-8h8q4 8 6 20z" fill="${c}" ${SW2}/><path d="M${x + dx - 6} ${y - 12}l14 0" stroke="${shade(c, 0.3)}" stroke-width="1"/><path d="M${x + dx - 12} ${y - 1}h26" stroke="#2a1a10" stroke-width="2"/><path d="M${x + dx - 2} ${y - 18}l4 2M${x + dx} ${y - 15}l4 2" stroke="#fffaf0" stroke-width=".9"/>`).join(''); },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r1', {
    n: () => Deco.shoes(318, 494, '#5f8fa8'),
    e: () => Deco.rugRect(480, 492, 300, 64, '#4f8a7a', '#f2c46b'),
    s: () => Deco.hookRail(700, 184, 210, ['hat', 'scarf', 'keys']),
    w: () => Deco.pic(70, 150, 110, 140, 0, '#c9895a') + Deco.basket(505, 496, 70, 42, 'yarn'),
  });
})();
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r2', {
    n: () => Deco.pic(722, 78, 104, 112, 5, '#b07a3a'),
    e: () => Deco.rugRect(330, 500, 360, 70, '#7a3a2a', '#e0b048'),
    s: () => Deco.wallShelf(232, 160, 196, 3, '#c9583c'),
    w: () => Deco.sideTable(478, 488, Deco.flowerPot(478, 424, '#f2b6b0', '#4f9e9a', 0.9)),
  });
})();
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r3', {
    n: () => Deco.flowerPot(236, 520, '#e98a8a', '#d9774b', 1) + Deco.cactus(650, 506, 1),
    e: () => Deco.flowerPot(505, 486, '#c9b0e8', '#4f9e9a', 1.1),
    s: () => Deco.flowerPot(380, 534, '#f6d06a', '#d9774b', 0.95) + Deco.cactus(620, 530, 1.05),
    w: () => Deco.flowerPot(770, 500, '#f2b6b0', '#c9763f', 1),
  });
})();
Object.assign(Deco, {
  teapot(x, y, c = '#6f9fb8') { return A.sh(x, y + 2, 34, 5) + `<g transform="translate(${x} ${y})"><path d="M26 -22q16-4 20-18l4 2q-2 22-22 26z" fill="${c}" ${SW2}/><path d="M-26 -30q-16 2-14 14q2 8 12 6" fill="none" stroke="#4a3222" stroke-width="6"/><path d="M-26 -30q-16 2-14 14q2 8 12 6" fill="none" stroke="${c}" stroke-width="3.4"/><path d="M-28 0q-6-34 28-38q34 4 28 38z" fill="${c}" ${SW}/><path d="M-28 0q-6-34 28-38q34 4 28 38z" fill="url(#cyl)"/><path d="M-22 -14q22 8 44 0" stroke="#fffaf0" stroke-width="3" fill="none"/>${[-14, 0, 14].map(dx => `<circle cx="${dx}" cy="-12" r="2.2" fill="#e98a8a"/>`).join('')}<ellipse cx="0" cy="-38" rx="16" ry="4" fill="${shade(c, 0.15)}" ${SW2}/><circle cx="0" cy="-44" r="4" fill="${shade(c, 0.15)}" ${SW2}/><path d="M-18 -30q4-4 10-5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".6"/></g>`; },
  breadBoard(x, y) { return `<g transform="translate(${x} ${y})"><rect x="-44" y="-10" width="88" height="10" rx="4" fill="#c9895a" ${SW2}/><path d="M50 -5h10a4 4 0 0 1 0 8h-10" fill="none" stroke="#4a3222" stroke-width="1.4"/><path d="M-34 -10q0-24 34-24t34 24z" fill="#e0a45a" ${SW}/><path d="M-20 -26l8 12M-4 -32l8 14M12 -30l8 12" stroke="#b8742a" stroke-width="2" stroke-linecap="round"/><path d="M-26 -18q10-10 22-12" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`; },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r4', {
    e: () => Deco.teapot(890, 300, '#e98a8a'),
    s: () => Deco.rugRect(420, 506, 420, 64, '#6f9fb8', '#fffaf0'),
    w: () => Deco.basket(340, 504, 74, 42, 'towel') + Deco.hookRail(860, 236, 100, ['apron']),
  });
})();
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r5', {
    n: () => Deco.rugRect(500, 500, 560, 74, '#5a2a3a', '#e0b048'),
    e: () => Deco.pic(758, 86, 104, 128, 3, '#c9a14a') + Deco.rugRect(660, 500, 380, 64, '#3b4a6a', '#e0b048'),
    s: () => Deco.rugRect(470, 500, 420, 70, '#3b4a6a', '#e0b048') + Deco.wallShelf(40, 300, 200, 6, '#e0b048'),
    w: () => Deco.rugRect(500, 496, 300, 60, '#5a2a3a', '#e0b048'),
  });
})();
Object.assign(Deco, {
  toyShelf(x, y, w = 150) { // 牆上的小層架：繪本、小木馬、小陀螺
    let o = A.shelf(x, y, w, '#e0b88a');
    const cols = ['#e0504a', '#4f8ad8', '#f2c232', '#5fae5a', '#e57aa8'];
    for (let i = 0; i < 4; i++) { const bx = x + 12 + i * 15, h = 40 + (i % 2) * 6; o += `<rect x="${bx}" y="${y - h}" width="13" height="${h}" rx="2" fill="${cols[i]}" ${SW2}/><path d="M${bx + 3} ${y - h + 6}h7M${bx + 3} ${y - 8}h7" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>`; }
    const hx = x + w - 44;
    o += `<g transform="translate(${hx} ${y})"><path d="M-24 0q24-12 48 0" stroke="#4a3222" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-24 0q24-12 48 0" stroke="#c9895a" stroke-width="2.6" fill="none"/><path d="M-12 -6l2-14M10 -6l-2-14" stroke="#c9895a" stroke-width="3"/><path d="M-16 -20h30q6-12-2-20l-6 4q-4-4-12 0z" fill="#f6e2c8" ${SW2}/><circle cx="12" cy="-34" r="1.6" fill="#2a1a10"/><path d="M4 -40q-6 4-8 14" stroke="#e0504a" stroke-width="3" fill="none"/></g>`;
    o += `<g transform="translate(${x + 82} ${y})"><path d="M-10 -4l10-20 10 20z" fill="#9a6ac8" ${SW2}/><path d="M-7 -10h14" stroke="#f2c232" stroke-width="2.4"/><path d="M0 -24v-6" stroke="#4a3222" stroke-width="2"/></g>`;
    return o;
  },
  starLamp(x, y) { // 床邊的星星夜燈
    A.fx(`<circle class="flick" cx="${x}" cy="${y - 30}" r="60" fill="url(#lampG)" style="${A.ad(4)}"/>`);
    return A.sh(x, y + 2, 20, 4) + `<rect x="${x - 14}" y="${y - 10}" width="28" height="10" rx="3" fill="#f6dce6" ${SW2}/>` + A.star(x, y - 30, 20, '#fff2a8', SW) + `<circle cx="${x - 5}" cy="${y - 34}" r="3" fill="#fff" opacity=".8"/>`;
  },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r6', {
    n: () => Deco.rugRect(570, 500, 300, 66, '#f6b0c0', '#fffaf0'),
    e: () => Deco.toyShelf(820, 214, 150) + Deco.starLamp(560, 486),
    s: () => Deco.toyShelf(700, 210, 170) + Deco.pic(300, 100, 100, 80, 2, '#e0b88a'),
    w: () => Deco.pic(814, 110, 110, 110, 0, '#e0b88a') + `<g transform="translate(882 488) scale(.7) translate(-882 -488)">${Deco.dollhouse(882, 488)}</g>`,
  });
})();
Object.assign(Deco, {
  blueprint(x, y, w = 150, h = 110) { // 釘在牆上的齒輪設計圖
    let inner = `<rect width="100" height="100" fill="#2f5a8a"/><path d="M0 20h100M0 40h100M0 60h100M0 80h100M20 0v100M40 0v100M60 0v100M80 0v100" stroke="#fff" stroke-opacity=".12" stroke-width=".6"/>`;
    inner += `<g fill="none" stroke="#e8f2ff" stroke-width=".9"><path d="${A.gearPath(34, 50, 20, 12, 0.3)}"/><path d="${A.gearPath(68, 36, 13, 9, 0.3)}"/><circle cx="34" cy="50" r="27" stroke-dasharray="2 2" opacity=".5"/><path d="M8 88h40M8 86v4M48 86v4M70 60v30M66 90h8" opacity=".8"/></g>`;
    inner += A.txt(74, 82, 'Nº7', 8, '#e8f2ff', 'middle', 700);
    return `<g transform="rotate(-2 ${x + w / 2} ${y + h / 2})"><rect x="${x + 3}" y="${y + 4}" width="${w}" height="${h}" fill="#1e0d04" opacity=".22"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none">${inner}</svg><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-noise)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${SW2}/>${A.pin(x + 10, y + 8, '#e0b048')}${A.pin(x + w - 10, y + 8, '#e0b048')}</g>`;
  },
  watchBoard(x, y) { // 掛著懷錶的小木板
    let o = `<rect x="${x}" y="${y}" width="150" height="70" rx="5" fill="#7a4a2a" ${SW}/><rect x="${x}" y="${y}" width="150" height="70" rx="5" fill="url(#p-grainH)"/><path d="M${x + 3} ${y + 3}h144" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>`;
    [0, 1, 2].forEach(i => { const cx = x + 30 + i * 45, cy = y + 42 + (i % 2) * 6; o += `<circle cx="${cx}" cy="${y + 10}" r="2.4" fill="url(#brass)" ${SW2}/><path d="M${cx} ${y + 12}l-3 ${cy - y - 28}M${cx} ${y + 12}l3 ${cy - y - 28}" stroke="#e0c27a" stroke-width="1" stroke-dasharray="1.6 1.2"/><circle cx="${cx}" cy="${cy - 17}" r="3" fill="none" stroke="url(#brass)" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="14" fill="url(#brass)" ${SW2}/><circle cx="${cx}" cy="${cy}" r="10.5" fill="#fffaf0" stroke="#7a4a14" stroke-width=".7"/><path d="M${cx} ${cy}v-7M${cx} ${cy}l${4 + i} 3" stroke="#2a1a10" stroke-width="1.1" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="10.5" fill="url(#glassR)"/>`; });
    return o;
  },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r7', {
    n: () => Deco.rugRect(420, 506, 360, 60, '#5a4a3a', '#c9a14a'),
    e: () => Deco.blueprint(832, 236, 108, 88),
    s: () => Deco.watchBoard(720, 380 - 0) + Deco.rugRect(500, 500, 300, 56, '#4f6a5a', '#c9a14a'),
    w: () => Deco.blueprint(462, 300, 96, 80),
  });
})();
Object.assign(Deco, {
  trunk(x, y) { // 舊旅行箱
    return A.sh(x, y + 2, 70, 8) + `<g transform="translate(${x} ${y})"><rect x="-64" y="-56" width="128" height="56" rx="6" fill="#6a4a7a" ${SW}/><rect x="-64" y="-56" width="128" height="56" rx="6" fill="url(#p-weave)"/><path d="M-64-40h128" stroke="#3a2a4a" stroke-width="2"/><rect x="-66" y="-60" width="132" height="14" rx="6" fill="#7a5a8a" ${SW2}/>${[-44, 44].map(dx => `<rect x="${dx - 6}" y="-60" width="12" height="60" fill="#a8742a" ${SW2}/>`).join('')}<rect x="-10" y="-50" width="20" height="14" rx="2" fill="url(#brass)" ${SW2}/><circle cx="0" cy="-43" r="2" fill="#4a3222"/><circle cx="-30" cy="-26" r="10" fill="#f2c46b" opacity=".85"/><path d="M-36-26h12" stroke="#a8494a" stroke-width="1.4"/><rect x="18" y="-34" width="26" height="16" rx="2" fill="#cfe2ea" opacity=".85" transform="rotate(-8 31 -26)"/></g>`;
  },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r8', {
    n: () => Deco.rugRect(500, 504, 460, 70, '#3b4a7a', '#e0c27a'),
    e: () => Deco.trunk(250, 500) + Deco.flowerPot(720, 500, '#c9b0e8', '#4f6aa8', 0.9),
    s: () => Deco.trunk(860, 492) + Deco.rugRect(500, 504, 400, 64, '#3b4a7a', '#e0c27a'),
    w: () => Deco.rugRect(500, 500, 460, 70, '#5a3a6a', '#e0c27a'),
  });
})();
Object.assign(Deco, {
  bottles(x, y) { // 架子上的幾瓶果汁
    return [0, 1, 2].map(i => { const bx = x + i * 22, c = ['#7a2a4a', '#4f7a3a', '#a8494a'][i]; return `<path d="M${bx - 7} ${y}v-30q0-6 4-10v-10h6v10q4 4 4 10v30z" fill="${c}" ${SW2}/><rect x="${bx - 3.5}" y="${y - 52}" width="7" height="4" fill="#c9a14a"/><rect x="${bx - 6}" y="${y - 24}" width="12" height="12" fill="#f4ead8" opacity=".85"/><path d="M${bx - 4} ${y - 34}v28" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`; }).join('');
  },
  candleShelf(x, y) { return A.shelf(x, y, 120, '#6a4a32') + Deco.bottles(x + 22, y) + `<rect x="${x + 88}" y="${y - 18}" width="10" height="18" rx="2" fill="#f4ead8" ${SW2}/><path d="M${x + 93} ${y - 18}v-4" stroke="#2a1a10" stroke-width="1.4"/>`; },
});
(() => {
  const R = id => ROOMS.find(r => r.id === id);
  const add = (id, f) => { const old = R(id).deco || (() => ''); R(id).deco = (v, s) => old(v, s) + (f[v] ? f[v](s) : ''); };
  add('r9', {
    w: () => Deco.candleShelf(250, 270),
    n: () => Deco.candleShelf(480, 300),
    e: () => Deco.candleShelf(40, 250),
  });
})();

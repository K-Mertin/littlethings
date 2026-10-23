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
    A.fx(`<g transform="translate(${x} ${y - 14 * sc}) scale(${sc})"><g class="metro" style="${A.ad(1.6)}"><path d="M0 0V-80" stroke="#e8d8b8" stroke-width="4"/><rect x="-7" y="-60" width="14" height="12" rx="2" fill="url(#brass)" ${SW2}/></g></g>`);
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

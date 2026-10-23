'use strict';
// 美術：所有場景都用 SVG 字串畫出來。統一的深棕描邊、暖色、柔和光影。
const K = '#4a3222';           // 描邊色
const SW = 'stroke="#4a3222" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const SW2 = 'stroke="#4a3222" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function shade(h, a) { // a>0 變亮，a<0 變暗
  const [r, g, b] = hex2rgb(h), f = v => Math.round(a > 0 ? v + (255 - v) * a : v * (1 + a));
  return '#' + [f(r), f(g), f(b)].map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
}

const A = {
  defs() {
    return `
<filter id="ds" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3b2010" flood-opacity=".28"/></filter>
<filter id="ds2" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3b2010" flood-opacity=".3"/></filter>
<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="lt" cx="50%" cy="10%" r="75%"><stop offset="0" stop-color="#fff6dc" stop-opacity=".42"/><stop offset=".6" stop-color="#fff6dc" stop-opacity=".05"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#2a1408" stop-opacity="0"/><stop offset="1" stop-color="#2a1408" stop-opacity=".45"/></radialGradient>
<radialGradient id="lampG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff2b8" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<radialGradient id="sunG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe0" stop-opacity="1"/><stop offset=".5" stop-color="#ffe9a0" stop-opacity=".6"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3f0"/><stop offset="1" stop-color="#e6f6ff"/></linearGradient>
<linearGradient id="skyEve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7fc8"/><stop offset=".55" stop-color="#f3a27a"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
<linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141c44"/><stop offset="1" stop-color="#36407a"/></linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="fshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1408" stop-opacity=".22"/><stop offset=".25" stop-color="#2a1408" stop-opacity="0"/><stop offset="1" stop-color="#2a1408" stop-opacity=".25"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".5" stop-color="#e2ae4c"/><stop offset="1" stop-color="#a8742a"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d0" stop-opacity=".55"/><stop offset="1" stop-color="#fff7d0" stop-opacity="0"/></linearGradient>
<pattern id="p-stripe" width="44" height="40" patternUnits="userSpaceOnUse"><rect width="22" height="40" fill="#fff" opacity=".13"/><rect x="21" width="2" height="40" fill="#fff" opacity=".18"/></pattern>
<pattern id="p-dots" width="46" height="46" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="4" fill="#fff" opacity=".28"/><circle cx="34" cy="34" r="4" fill="#fff" opacity=".28"/></pattern>
<pattern id="p-flower" width="70" height="70" patternUnits="userSpaceOnUse"><g fill="#fff" opacity=".26"><circle cx="17" cy="12" r="5"/><circle cx="23" cy="18" r="5"/><circle cx="17" cy="24" r="5"/><circle cx="11" cy="18" r="5"/></g><circle cx="17" cy="18" r="3.4" fill="#ffe6a8" opacity=".55"/><path d="M52 47q5-9 0-15q-5 6 0 15" fill="#fff" opacity=".2"/><circle cx="52" cy="53" r="2.5" fill="#fff" opacity=".3"/></pattern>
<pattern id="p-star" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M20 10l3 7 7 1-5 5 1.5 7-6.5-3.5-6.5 3.5 1.5-7-5-5 7-1z" fill="#fff" opacity=".32"/><circle cx="60" cy="55" r="3" fill="#fff" opacity=".35"/><circle cx="45" cy="22" r="1.8" fill="#fff" opacity=".35"/><path d="M62 66a8 8 0 1 0 0-1" fill="none"/></pattern>
<pattern id="p-diamond" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M28 2L54 28 28 54 2 28z" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/><circle cx="28" cy="28" r="3" fill="#ffe2a0" opacity=".35"/></pattern>
<pattern id="p-tile" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><rect x="2" y="2" width="20" height="10" fill="#fff" opacity=".12"/></pattern>
<pattern id="p-gear" width="90" height="90" patternUnits="userSpaceOnUse"><g fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="5"><circle cx="25" cy="25" r="11"/><path d="M25 7v6M25 37v6M7 25h6M37 25h6M12 12l4 4M34 34l4 4M12 38l4-4M34 16l4-4"/></g><circle cx="68" cy="68" r="5" fill="#fff" opacity=".14"/></pattern>
<pattern id="p-glass" width="125" height="125" patternUnits="userSpaceOnUse"><rect width="125" height="125" fill="none" stroke="#e9f6f0" stroke-width="6"/><path d="M14 30l30-18M18 52l50-30" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/></pattern>
<pattern id="p-wood" width="200" height="30" patternUnits="userSpaceOnUse"><path d="M0 15q50-6 100 0t100 0" fill="none" stroke="#000" stroke-opacity=".07" stroke-width="2"/></pattern>
<pattern id="p-knit" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8q4-6 8 0t8 0" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/></pattern>
<clipPath id="cpScene"><rect width="1000" height="625"/></clipPath>
`;
  },

  // ---------- 牆面與地板 ----------
  wall(o) {
    const c = o.c || '#f3e3c3', trim = o.trim || '#f8efe0', fy = o.fy || 488;
    let s = `<rect width="1000" height="${fy}" fill="${c}"/>`;
    if (o.pat) s += `<rect width="1000" height="${fy}" fill="url(#p-${o.pat})"/>`;
    s += `<rect width="1000" height="30" fill="${trim}"/><rect y="30" width="1000" height="7" fill="${shade(trim, -0.12)}"/><path d="M0 37h1000" stroke="${shade(c, -0.3)}" stroke-opacity=".35" stroke-width="2"/>`;
    if (o.wain) {
      const wy = o.wy || 360;
      s += `<rect y="${wy}" width="1000" height="${fy - wy}" fill="${o.wain}"/>`;
      for (let x = 18; x < 1000; x += 128) s += `<rect x="${x}" y="${wy + 22}" width="104" height="${fy - wy - 50}" rx="4" fill="${shade(o.wain, 0.08)}" stroke="${shade(o.wain, -0.25)}" stroke-width="2"/>`;
      s += `<rect y="${wy - 8}" width="1000" height="14" fill="${trim}"/><path d="M0 ${wy + 6}h1000" stroke="${shade(trim, -0.3)}" stroke-width="2"/>`;
    }
    s += `<rect y="${fy - 20}" width="1000" height="22" fill="${shade(trim, -0.08)}"/><path d="M0 ${fy - 20}h1000" stroke="${shade(trim, -0.35)}" stroke-width="2"/>`;
    s += this.floor(o.floor || 'wood', o.fc || ['#c98d5a', '#b97c4b'], fy);
    return s;
  },
  floor(kind, fc, fy = 488) {
    let s = `<rect y="${fy}" width="1000" height="${625 - fy}" fill="${fc[0]}"/>`;
    const vx = 500, Y = [fy, fy + 24, fy + 54, fy + 92, 625 + 20];
    const px = (x, y) => vx + (x - vx) * (1 + (y - fy) * 0.0062);
    if (kind === 'wood') {
      for (let x = -700; x <= 1700; x += 96) s += `<path d="M${x} ${fy}L${px(x, 625)} 625" stroke="${shade(fc[0], -0.22)}" stroke-width="2" opacity=".7"/>`;
      Y.slice(1, 4).forEach((y, i) => { for (let x = -700 + (i % 2) * 48; x <= 1700; x += 192) { const a = px(x, y), b = px(x + 96, y); s += `<path d="M${a} ${y}L${b} ${y}" stroke="${shade(fc[0], -0.18)}" stroke-width="2" opacity=".6"/>`; } });
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-wood)"/>`;
    } else if (kind === 'check' || kind === 'tile') {
      for (let r = 0; r < 4; r++) for (let x = -700, k = 0; x <= 1700; x += 80, k++) {
        const y0 = Y[r], y1 = Y[r + 1];
        if ((k + r) % 2 || kind === 'tile') s += `<path d="M${px(x, y0)} ${y0}L${px(x + 80, y0)} ${y0}L${px(x + 80, y1)} ${y1}L${px(x, y1)} ${y1}z" fill="${(k + r) % 2 ? fc[1] : fc[0]}" stroke="${kind === 'tile' ? shade(fc[0], -0.15) : 'none'}" stroke-width="2"/>`;
      }
    } else if (kind === 'carpet') {
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-knit)"/>`;
    }
    s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#fshade)"/>`;
    return s;
  },
  light(extra = '') { return `<rect width="1000" height="625" fill="url(#lt)"/>${extra}<rect width="1000" height="625" fill="url(#vig)"/>`; },
  closeBg(c, pat, extra = '') { // 特寫背景
    return `<rect width="1000" height="625" fill="${c}"/>${pat ? `<rect width="1000" height="625" fill="url(#p-${pat})"/>` : ''}${extra}`;
  },

  // ---------- 基本形狀 ----------
  rr(x, y, w, h, r, fill, o = '') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${SW} ${o}/>`; },
  box(x, y, w, h, fill, top = 16, o = '') { // 有頂面的立體櫃子
    return `<path d="M${x} ${y}L${x + 12} ${y - top}H${x + w - 12}L${x + w} ${y}z" fill="${shade(fill, 0.18)}" ${SW}/>` + this.rr(x, y, w, h, 4, fill, o);
  },
  sh(cx, cy, rx, ry, o = 0.22) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2a1408" opacity="${o}"/>`; },
  txt(x, y, s, size = 20, fill = K, anchor = 'middle', w = 700, extra = '') { return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${w}" ${extra}>${s}</text>`; },
  gl(x, y, w, h, r = 6) { return `<rect x="${x + 4}" y="${y + 4}" width="${w * 0.5}" height="${h * 0.5}" rx="${r}" fill="url(#shine)" pointer-events="none"/>`; },
  star(cx, cy, r, fill, o = '') {
    let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); }
    return `<path d="${d}z" fill="${fill}" ${o}/>`;
  },
  gearPath(cx, cy, r, n = 10, inner = 0.35) {
    let d = ''; const t = r * 0.18;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI / n * 0.5, a2 = a0 + Math.PI / n, a3 = a0 + Math.PI / n * 1.5;
      const p = (a, rr) => (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
      d += (i ? 'L' : 'M') + p(a0, r - t) + 'L' + p(a1, r + t * 0.2) + 'L' + p(a2, r + t * 0.2) + 'L' + p(a3, r - t);
    }
    d += 'z';
    const ir = r * inner;
    d += `M${cx + ir} ${cy}a${ir} ${ir} 0 1 0 ${-ir * 2} 0a${ir} ${ir} 0 1 0 ${ir * 2} 0z`;
    return d;
  },
  gear(cx, cy, r, fill = 'url(#brass)', n = 10, o = '') { return `<path d="${this.gearPath(cx, cy, r, n)}" fill="${fill}" fill-rule="evenodd" ${SW} ${o}/>`; },

  // ---------- 家具與物件 ----------
  door(x, y, w, h, c, o = {}) {
    const fr = o.frame || '#f8efe0';
    let s = `<rect x="${x - 16}" y="${y - 16}" width="${w + 32}" height="${h + 16}" rx="6" fill="${fr}" ${SW}/>`;
    if (o.open) {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff4d6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sunG)" opacity=".9"/>`;
      s += `<path d="M${x} ${y}L${x - w * 0.42} ${y + 24}V${y + h + 18}L${x} ${y + h}z" fill="${c}" ${SW}/>`;
      return s + (o.glowText ? this.txt(x + w / 2, y + h / 2, o.glowText, 22, '#c08a3a') : '');
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW}/>`;
    const pw = (w - 42) / 2;
    if (o.win) s += `<rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h * 0.3}" rx="${(w - 36) / 2}" fill="url(#sky)" ${SW2}/><path d="M${x + w / 2} ${y + 18}v${h * 0.3}" ${SW2}/>`;
    else { s += `<rect x="${x + 14}" y="${y + 18}" width="${pw}" height="${h * 0.36}" rx="4" fill="${shade(c, 0.1)}" ${SW2}/><rect x="${x + 28 + pw}" y="${y + 18}" width="${pw}" height="${h * 0.36}" rx="4" fill="${shade(c, 0.1)}" ${SW2}/>`; }
    s += `<rect x="${x + 14}" y="${y + h * 0.48}" width="${pw}" height="${h * 0.44}" rx="4" fill="${shade(c, 0.1)}" ${SW2}/><rect x="${x + 28 + pw}" y="${y + h * 0.48}" width="${pw}" height="${h * 0.44}" rx="4" fill="${shade(c, 0.1)}" ${SW2}/>`;
    if (o.knob !== false) s += `<circle cx="${x + w - 20}" cy="${y + h * 0.5}" r="9" fill="url(#brass)" ${SW2}/>`;
    else s += `<circle cx="${x + w - 20}" cy="${y + h * 0.5}" r="6" fill="#2a1a10"/>`;
    if (o.keyhole) s += `<path d="M${x + w - 20} ${y + h * 0.5 + 18}a5 5 0 1 1 0.1 0l4 14h-8z" fill="#2a1a10"/>`;
    return s;
  },
  win(x, y, w, h, o = {}) {
    const sky = o.sky || 'sky', fr = o.frame || '#fffaf0';
    let s = `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="6" fill="${fr}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${sky})" ${SW2}/>`;
    if (o.scene) s += o.scene;
    else if (sky === 'sky') s += `<circle cx="${x + w * 0.75}" cy="${y + h * 0.25}" r="${w * 0.08}" fill="#fff6c8"/><path d="M${x + 10} ${y + h * 0.8}q${w * 0.2}-${h * 0.25} ${w * 0.45} 0t${w * 0.5}-${h * 0.04}V${y + h}H${x + 10}z" fill="#9fd08a"/><path d="M${x + w * 0.15} ${y + h * 0.35}h${w * 0.18}a8 8 0 0 0 0-14a12 12 0 0 0-20-4a9 9 0 0 0-${w * 0.12} 10z" fill="#fff" opacity=".9"/>`;
    else if (sky === 'skyNight') { for (let i = 0; i < 9; i++) s += `<circle cx="${x + 10 + (i * 37) % (w - 20)}" cy="${y + 10 + (i * 53) % (h - 20)}" r="${1.5 + (i % 3)}" fill="#fff8d0"/>`; }
    s += `<path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${fr}" stroke-width="8"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" ${SW2} fill="none"/>`;
    s += `<rect x="${x - 18}" y="${y + h + 8}" width="${w + 36}" height="12" rx="3" fill="${fr}" ${SW}/>`;
    if (o.curtain) {
      const c = o.curtain;
      s += `<path d="M${x - 30} ${y - 26}h${w * 0.32 + 30}q-${w * 0.12} ${h * 0.5} -${w * 0.02} ${h + 30}h-${w * 0.32 - 10}z" fill="${c}" ${SW}/><path d="M${x + w + 30} ${y - 26}h-${w * 0.32 + 30}q${w * 0.12} ${h * 0.5} ${w * 0.02} ${h + 30}h${w * 0.32 - 10}z" fill="${c}" ${SW}/>`;
      s += `<path d="M${x - 10} ${y - 20}q8 ${h * 0.5} 4 ${h + 20}M${x + w + 10} ${y - 20}q-8 ${h * 0.5} -4 ${h + 20}" stroke="${shade(c, -0.25)}" stroke-width="3" fill="none"/>`;
      s += `<rect x="${x - 44}" y="${y - 34}" width="${w + 88}" height="12" rx="6" fill="#a87443" ${SW}/>`;
    }
    return s;
  },
  frame(x, y, w, h, inner, o = {}) {
    const fc = o.fc || '#d9a548';
    return `<g filter="url(#ds2)"><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="5" fill="${fc}" ${SW}/><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="3" fill="${shade(fc, -0.2)}" ${SW2}/></g>` +
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${o.vw || 100} ${o.vh || 100}" preserveAspectRatio="${o.par || 'none'}">${inner}</svg><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${SW2}/>`;
  },
  book(x, y, w, h, c, o = {}) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW2}/><rect x="${x + 3}" y="${y + h * 0.15}" width="${w - 6}" height="5" fill="${shade(c, 0.35)}"/><rect x="${x + 3}" y="${y + h * 0.8}" width="${w - 6}" height="4" fill="${shade(c, 0.35)}"/>`;
    if (o.num !== undefined) s += `<circle cx="${x + w / 2}" cy="${y + h * 0.48}" r="${Math.min(w * 0.38, 15)}" fill="#fff3d0" ${SW2}/>` + this.txt(x + w / 2, y + h * 0.48 + Math.min(w * 0.38, 15) * 0.42, o.num, Math.min(w * 0.55, 22), '#7a3d14', 'middle', 900);
    return s;
  },
  books(x, y, n, h, seed = 1) {
    const cols = ['#c9583c', '#3f7f8f', '#e0a43a', '#6f8f4a', '#8a5a9a', '#b9774a', '#d9776e', '#4f6aa8'];
    let s = '', xx = x;
    for (let i = 0; i < n; i++) { const w = 18 + ((i * 7 + seed * 3) % 4) * 5, hh = h - ((i * 11 + seed) % 4) * 9; s += this.book(xx, y + h - hh, w, hh, cols[(i * 3 + seed) % cols.length]); xx += w + 2; }
    return s;
  },
  shelf(x, y, w, c = '#a8703f') { return `<rect x="${x}" y="${y}" width="${w}" height="12" rx="3" fill="${c}" ${SW}/><path d="M${x + 20} ${y + 12}l10 18h10l-6-18M${x + w - 20} ${y + 12}l-10 18h-10l6-18" fill="${shade(c, -0.15)}" ${SW2}/>`; },
  table(x, y, w, h, c = '#b07644', o = {}) {
    let s = this.sh(x + w / 2, y + h + 4, w * 0.55, 12);
    s += `<path d="M${x + 14} ${y + 14}v${h - 14}M${x + w - 14} ${y + 14}v${h - 14}" stroke="${shade(c, -0.2)}" stroke-width="12" stroke-linecap="round"/><path d="M${x + 14} ${y + 14}v${h - 14}M${x + w - 14} ${y + 14}v${h - 14}" ${SW} fill="none" opacity=".0"/>`;
    s += `<rect x="${x + 8}" y="${y + 14}" width="12" height="${h - 14}" rx="5" fill="${shade(c, -0.15)}" ${SW2}/><rect x="${x + w - 20}" y="${y + 14}" width="12" height="${h - 14}" rx="5" fill="${shade(c, -0.15)}" ${SW2}/>`;
    s += `<path d="M${x} ${y}L${x + 12} ${y - 12}H${x + w - 12}L${x + w} ${y}z" fill="${shade(c, 0.2)}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="${c}" ${SW}/>`;
    if (o.cloth) s += `<path d="M${x + 12} ${y - 12}H${x + w - 12}L${x + w + 6} ${y}l8 ${o.cloth}q-${(w + 28) / 4} 10 -${(w + 28) / 2} 0t-${(w + 28) / 2} 0l8 -${o.cloth}z" fill="${o.clothC || '#f4f0e6'}" ${SW}/>`;
    return s;
  },
  plant(x, y, s = 1, pot = '#d9774b', leaf = '#5f9e5a') {
    let o = this.sh(x, y + 2, 40 * s, 8 * s);
    o += `<g transform="translate(${x} ${y}) scale(${s})">`;
    [[-30, -110, -0.5], [0, -130, 0], [30, -110, 0.5], [-48, -70, -0.9], [46, -74, 0.9], [-12, -96, -0.2], [16, -100, 0.25]].forEach(([dx, dy, r], i) => {
      o += `<path d="M0 -40Q${dx * 0.3} ${dy * 0.6} ${dx} ${dy}Q${dx * 0.9 + 14 * Math.sign(r || 1)} ${dy * 0.6} 0 -40z" fill="${i % 2 ? shade(leaf, 0.12) : leaf}" ${SW2}/>`;
    });
    o += `<path d="M-30 -42h60l-8 42h-44z" fill="${pot}" ${SW}/><rect x="-35" y="-48" width="70" height="12" rx="4" fill="${shade(pot, 0.12)}" ${SW}/></g>`;
    return o;
  },
  lamp(x, y, c = '#f3b860', on = true) {
    return (on ? `<circle cx="${x}" cy="${y - 50}" r="120" fill="url(#lampG)"/>` : '') +
      `<path d="M${x} ${y - 40}V${y}" ${SW}/><path d="M${x - 26} ${y}h52l-6 8h-40z" fill="#8a5a34" ${SW2}/><path d="M${x - 36} ${y - 40}h72l-14-46h-44z" fill="${c}" ${SW}/><path d="M${x - 18} ${y - 82}l-8 36" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>`;
  },
  rug(cx, cy, rx, ry, c, c2) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" ${SW}/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.7}" fill="none" stroke="${c2 || shade(c, 0.3)}" stroke-width="6" stroke-dasharray="14 8"/>`;
  },
  paper(x, y, w, h, rot = 0, c = '#fffdf3', lines = 3) {
    let s = `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW2}/>`;
    for (let i = 0; i < lines; i++) s += `<path d="M${x + 8} ${y + 14 + i * (h - 20) / Math.max(1, lines)}h${w - 16 - (i === lines - 1 ? w * 0.3 : 0)}" stroke="#9fb89a" stroke-width="3" stroke-linecap="round"/>`;
    return s + '</g>';
  },
  pin(x, y, c = '#e05a4a') { return `<circle cx="${x}" cy="${y}" r="6" fill="${c}" ${SW2}/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".7"/>`; },
  sparkle(x, y, s = 1) { return `<g transform="translate(${x} ${y}) scale(${s})" class="spk"><path d="M0-14L3-3 14 0 3 3 0 14-3 3-14 0-3-3z" fill="#fff6c8" stroke="#e0a43a" stroke-width="1.5"/></g>`; },
  arrowHint(x, y) { return `<g opacity=".8"><circle cx="${x}" cy="${y}" r="16" fill="#fff6c8" stroke="#e0a43a" stroke-width="3"/><path d="M${x - 6} ${y}h12M${x} ${y - 6}v12" stroke="#c07a2a" stroke-width="3" stroke-linecap="round"/></g>`; },

  // 解碼轉盤與黑板上用的 10 個圖案
  SYM: ['太陽', '星星', '月亮', '愛心', '花朵', '葉子', '水滴', '雲朵', '鈴鐺', '小魚'],
  sym(i, cx, cy, s = 1, fill = null) {
    const f = fill || ['#f2b632', '#f2c94c', '#e8d36a', '#e0605a', '#e57aa8', '#6fae5a', '#4fa3d8', '#9fb7d0', '#d9a548', '#f08a5d'][i];
    const g = (b) => `<g transform="translate(${cx} ${cy}) scale(${s})">${b}</g>`;
    const st = 'stroke="#4a3222" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
    switch (i) {
      case 0: { let r = ''; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; r += `M${(Math.cos(a) * 11).toFixed(1)} ${(Math.sin(a) * 11).toFixed(1)}L${(Math.cos(a) * 16).toFixed(1)} ${(Math.sin(a) * 16).toFixed(1)}`; } return g(`<path d="${r}" ${st}/><circle r="8" fill="${f}" ${st}/>`); }
      case 1: return g(this.star(0, 1, 15, f, st));
      case 2: return g(`<path d="M4-14a14 14 0 1 0 10 22a11 11 0 1 1-10-22z" fill="${f}" ${st}/>`);
      case 3: return g(`<path d="M0 13C-18 1-13-13-5-12C-2-12 0-9 0-7C0-9 2-12 5-12C13-13 18 1 0 13z" fill="${f}" ${st}/>`);
      case 4: return g(`${[0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos(a * Math.PI / 180 - 1.57) * 8).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180 - 1.57) * 8).toFixed(1)}" r="6.5" fill="${f}" ${st}/>`).join('')}<circle r="5" fill="#ffd36a" ${st}/>`);
      case 5: return g(`<path d="M-12 12C-14-6 0-14 14-14C14 2 4 14-12 12zM-12 12L6-6" fill="${f}" ${st}/>`);
      case 6: return g(`<path d="M0-15C6-6 11 0 11 5a11 11 0 0 1-22 0C-11 0-6-6 0-15z" fill="${f}" ${st}/>`);
      case 7: return g(`<path d="M-14 8a7 7 0 0 1 1-13a9 9 0 0 1 16-4a8 8 0 0 1 11 9a6 6 0 0 1-1 8z" fill="#fff" ${st}/>`);
      case 8: return g(`<path d="M-11 8C-11-2-9-12 0-12S11-2 11 8h3v4h-28v-4z" fill="${f}" ${st}/><circle cy="14" r="3.5" fill="${f}" ${st}/>`);
      case 9: return g(`<path d="M-14 0C-8-9 6-9 10 0C6 9-8 9-14 0zM10 0l7-7v14z" fill="${f}" ${st}/><circle cx="-6" cy="-1" r="1.8" fill="#4a3222"/>`);
    }
  },
  // 小貓「麻糬」
  cat(x, y, s = 1, pose = 'sit') {
    const c = '#fff8ee', st = SW;
    let b = `<g transform="translate(${x} ${y}) scale(${s})">` + this.sh(0, 4, 40, 7);
    if (pose === 'sit') {
      b += `<path d="M26 0q30-6 22-34q-4 14-22 22" fill="${c}" ${st}/>`;
      b += `<path d="M-28 0q-6-40 10-54h36q16 14 10 54z" fill="${c}" ${st}/>`;
      b += `<path d="M-30-62l4-30 18 16zM30-62l-4-30-18 16z" fill="${c}" ${st}/><path d="M-26-70l2-14 9 8zM26-70l-2-14-9 8z" fill="#f4b8b0"/>`;
      b += `<ellipse cx="0" cy="-62" rx="34" ry="28" fill="${c}" ${st}/><path d="M-12-88q12-8 24 0q-12 8-24 0" fill="#e8b46a" opacity=".9"/>`;
      b += `<path d="M-15-64q4-4 8 0M7-64q4-4 8 0" ${SW2} fill="none"/><path d="M-3-55l3 3 3-3" ${SW2} fill="#f08a8a"/><circle cx="-20" cy="-54" r="5" fill="#f6b0a8" opacity=".6"/><circle cx="20" cy="-54" r="5" fill="#f6b0a8" opacity=".6"/>`;
      b += `<path d="M-14 0v-14M14 0v-14" ${SW2}/>`;
    } else { // 趴著
      b += `<ellipse cx="0" cy="-16" rx="52" ry="20" fill="${c}" ${st}/><path d="M48-14q30 2 26 18" fill="none" stroke="#4a3222" stroke-width="12" stroke-linecap="round"/><path d="M48-14q30 2 26 18" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
      b += `<path d="M-60-38l2-24 16 14zM-24-38l-2-24-14 14z" fill="${c}" ${st}/><ellipse cx="-42" cy="-28" rx="26" ry="21" fill="${c}" ${st}/><path d="M-54-30q4-3 8 0M-38-30q4-3 8 0" ${SW2} fill="none"/><path d="M-45-22l3 2 3-2" ${SW2}/>`;
    }
    return b + '</g>';
  },
};

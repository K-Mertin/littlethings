'use strict';
// 美術：所有場景都用 SVG 字串畫出來。統一的深棕描邊、暖色、柔和光影。
// 場景分兩層：#art（靜態，畫一次）與 #fx（會動的環境動畫：灰塵、窗簾、貓咪、燈光閃爍……）
const K = '#4a3222';           // 描邊色
const SW = 'stroke="#4a3222" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const SW2 = 'stroke="#4a3222" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function shade(h, a) { // a>0 變亮，a<0 變暗
  if (!h || h[0] !== '#') return h;
  const [r, g, b] = hex2rgb(h), f = v => Math.round(a > 0 ? v + (255 - v) * a : v * (1 + a));
  return '#' + [f(r), f(g), f(b)].map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
}
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

const A = {
  // ---------- 環境動畫層 ----------
  _fx: [],
  fx(m) { this._fx.push(m); return ''; },
  flush() { const s = this._fx.join(''); this._fx = []; return s; },
  still() { const s = this.flush(); return s ? `<g class="still">${s}</g>` : ''; }, // 不會動的版本（縮圖、背景）
  ad(d) { return `animation-delay:-${((performance.now() / 1000) % d).toFixed(2)}s`; }, // 重畫時動畫不跳回開頭
  motes(x, y, w, h, n = 14, seed = 1, c = '#fff6d0') {
    let o = '';
    for (let i = 0; i < n; i++) {
      const k = seed * 31 + i, d = 7 + hash(k) * 9;
      this.fx(`<circle class="mote${i % 2 ? ' m2' : ''}" cx="${(x + hash(k + 1) * w).toFixed(0)}" cy="${(y + hash(k + 2) * h).toFixed(0)}" r="${(1.2 + hash(k + 3) * 2.2).toFixed(1)}" fill="${c}" style="animation-duration:${d.toFixed(1)}s;${this.ad(d)}"/>`);
    }
    return '';
  },
  shaft(pts, op = 0.32) { // 從窗戶斜斜照進來的光
    return `<path d="M${pts}z" fill="url(#shaftG)" opacity="${op}" style="mix-blend-mode:screen" pointer-events="none"/>`;
  },
  twinkle(x, y, r = 2, c = '#fff8d0') { const d = 2 + hash(x * 7 + y) * 3; return this.fx(`<circle class="twk" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="animation-duration:${d.toFixed(1)}s;${this.ad(d)}"/>`); },

  defs() {
    return `
<filter id="ds" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#2a1205" flood-opacity=".32"/></filter>
<filter id="ds2" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#3b2010" flood-opacity=".3"/></filter>
<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="lt" cx="50%" cy="8%" r="80%"><stop offset="0" stop-color="#fff6dc" stop-opacity=".40"/><stop offset=".55" stop-color="#fff6dc" stop-opacity=".05"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="45%" r="78%"><stop offset=".5" stop-color="#1e0d04" stop-opacity="0"/><stop offset=".85" stop-color="#1e0d04" stop-opacity=".28"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".55"/></radialGradient>
<radialGradient id="lampG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff2b8" stop-opacity=".75"/><stop offset=".45" stop-color="#ffd98a" stop-opacity=".3"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<radialGradient id="sunG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe0" stop-opacity="1"/><stop offset=".5" stop-color="#ffe9a0" stop-opacity=".6"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<radialGradient id="spot" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#fff8e6" stop-opacity=".38"/><stop offset=".6" stop-color="#fff8e6" stop-opacity=".06"/><stop offset="1" stop-color="#fff8e6" stop-opacity="0"/></radialGradient>
<radialGradient id="gloss" cx="50%" cy="20%" r="60%"><stop offset="0" stop-color="#fffbe8" stop-opacity=".28"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></radialGradient>
<radialGradient id="ballG" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc8ec"/><stop offset=".7" stop-color="#cdeefb"/><stop offset="1" stop-color="#f4fbff"/></linearGradient>
<linearGradient id="skyEve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d5ea8"/><stop offset=".45" stop-color="#b886a8"/><stop offset=".7" stop-color="#f3a27a"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
<linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1638"/><stop offset=".7" stop-color="#2a3470"/><stop offset="1" stop-color="#45508a"/></linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".35" stop-color="#fff" stop-opacity=".04"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="fshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e0d04" stop-opacity=".38"/><stop offset=".22" stop-color="#1e0d04" stop-opacity=".05"/><stop offset=".7" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".3"/></linearGradient>
<linearGradient id="wshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e0d04" stop-opacity=".42"/><stop offset=".18" stop-color="#1e0d04" stop-opacity=".1"/><stop offset=".45" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".12"/></linearGradient>
<linearGradient id="corners" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e0d04" stop-opacity=".34"/><stop offset=".12" stop-color="#1e0d04" stop-opacity="0"/><stop offset=".88" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".34"/></linearGradient>
<linearGradient id="aoUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1e0d04" stop-opacity=".42"/><stop offset="1" stop-color="#1e0d04" stop-opacity="0"/></linearGradient>
<linearGradient id="aoDn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e0d04" stop-opacity=".4"/><stop offset="1" stop-color="#1e0d04" stop-opacity="0"/></linearGradient>
<linearGradient id="bevel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
<linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".3" stop-color="#f0c460"/><stop offset=".6" stop-color="#d49a3a"/><stop offset="1" stop-color="#9a6420"/></linearGradient>
<linearGradient id="silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfd6de"/><stop offset="1" stop-color="#8a96a4"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d0" stop-opacity=".55"/><stop offset="1" stop-color="#fff7d0" stop-opacity="0"/></linearGradient>
<linearGradient id="shaftG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf" stop-opacity=".95"/><stop offset=".6" stop-color="#fff2c0" stop-opacity=".35"/><stop offset="1" stop-color="#fff2c0" stop-opacity="0"/></linearGradient>
<pattern id="p-noise" width="160" height="160" patternUnits="userSpaceOnUse"><image href="${this.noiseURL()}" width="160" height="160"/></pattern>
<pattern id="p-stripe" width="44" height="40" patternUnits="userSpaceOnUse"><rect width="22" height="40" fill="#fff" opacity=".11"/><rect x="21" width="2" height="40" fill="#fff" opacity=".16"/><rect x="43" width="1" height="40" fill="#000" opacity=".06"/></pattern>
<pattern id="p-dots" width="46" height="46" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="4" fill="#fff" opacity=".28"/><circle cx="34" cy="34" r="4" fill="#fff" opacity=".28"/><circle cx="34" cy="11" r="1.5" fill="#c08a3a" opacity=".2"/></pattern>
<pattern id="p-flower" width="70" height="70" patternUnits="userSpaceOnUse"><g fill="#fff" opacity=".24"><circle cx="17" cy="12" r="5"/><circle cx="23" cy="18" r="5"/><circle cx="17" cy="24" r="5"/><circle cx="11" cy="18" r="5"/></g><circle cx="17" cy="18" r="3.4" fill="#ffe6a8" opacity=".55"/><path d="M52 47q5-9 0-15q-5 6 0 15" fill="#fff" opacity=".2"/><circle cx="52" cy="53" r="2.5" fill="#fff" opacity=".3"/><path d="M40 62q8-4 14 2" stroke="#2a6a5a" stroke-opacity=".12" stroke-width="2" fill="none"/></pattern>
<pattern id="p-star" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M20 10l3 7 7 1-5 5 1.5 7-6.5-3.5-6.5 3.5 1.5-7-5-5 7-1z" fill="#fff" opacity=".3"/><circle cx="60" cy="55" r="3" fill="#fff" opacity=".33"/><circle cx="45" cy="22" r="1.8" fill="#fff" opacity=".33"/></pattern>
<pattern id="p-diamond" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M28 2L54 28 28 54 2 28z" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/><circle cx="28" cy="28" r="3" fill="#ffe2a0" opacity=".35"/></pattern>
<pattern id="p-tile" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><rect x="2" y="2" width="20" height="10" fill="#fff" opacity=".14"/><path d="M48 3v45H3" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="2"/></pattern>
<pattern id="p-gear" width="90" height="90" patternUnits="userSpaceOnUse"><g fill="none" stroke="#fff" stroke-opacity=".13" stroke-width="5"><circle cx="25" cy="25" r="11"/><path d="M25 7v6M25 37v6M7 25h6M37 25h6M12 12l4 4M34 34l4 4M12 38l4-4M34 16l4-4"/></g><circle cx="68" cy="68" r="5" fill="#fff" opacity=".13"/></pattern>
<pattern id="p-glass" width="125" height="125" patternUnits="userSpaceOnUse"><rect width="125" height="125" fill="none" stroke="#e9f6f0" stroke-width="6"/><path d="M14 30l30-18M18 52l50-30" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/></pattern>
<pattern id="p-wood" width="200" height="30" patternUnits="userSpaceOnUse"><path d="M0 15q50-6 100 0t100 0" fill="none" stroke="#000" stroke-opacity=".07" stroke-width="2"/><path d="M0 6q60 4 120-1t80 2" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width="2"/></pattern>
<pattern id="p-knit" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8q4-6 8 0t8 0" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/></pattern>
<pattern id="p-brick" width="80" height="44" patternUnits="userSpaceOnUse"><path d="M0 22h80M0 44h80M40 0v22M0 22v22M80 22v22" stroke="#000" stroke-opacity=".18" stroke-width="3"/><path d="M2 2h36M42 24h36" stroke="#fff" stroke-opacity=".1" stroke-width="2"/></pattern>
<pattern id="p-stone" width="120" height="70" patternUnits="userSpaceOnUse"><path d="M0 35q30-4 60 0t60 0M40 0v35M90 35v35" stroke="#000" stroke-opacity=".15" stroke-width="3" fill="none"/><circle cx="20" cy="15" r="2" fill="#fff" opacity=".12"/><circle cx="75" cy="52" r="3" fill="#000" opacity=".08"/></pattern>
<clipPath id="cpScene"><rect width="1000" height="625"/></clipPath>
`;
  },
  noiseURL() { // 細細的紙紋／灰泥質感（只產生一次）
    if (this._nz) return this._nz;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const x = c.getContext('2d'), d = x.createImageData(160, 160);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random(); const w = v > 0.5 ? 255 : 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = w; d.data[i + 3] = Math.floor(Math.abs(v - 0.5) * 30); }
      x.putImageData(d, 0, 0); this._nz = c.toDataURL();
    } catch (e) { this._nz = ''; }
    return this._nz;
  },

  // ---------- 牆面與地板 ----------
  wall(o) {
    const c = o.c || '#f3e3c3', trim = o.trim || '#f8efe0', fy = o.fy || 488;
    let s = `<rect width="1000" height="${fy}" fill="${c}"/>`;
    if (o.pat) s += `<rect width="1000" height="${fy}" fill="url(#p-${o.pat})"/>`;
    s += `<rect width="1000" height="${fy}" fill="url(#p-noise)"/>`;
    s += `<rect width="1000" height="${fy}" fill="url(#wshade)"/>`;
    // 天花板線板
    s += `<rect width="1000" height="34" fill="${trim}"/><rect y="0" width="1000" height="10" fill="${shade(trim, -0.18)}"/><rect y="20" width="1000" height="4" fill="#fff" opacity=".5"/><rect y="30" width="1000" height="8" fill="${shade(trim, -0.15)}"/><path d="M0 38h1000" stroke="${shade(c, -0.4)}" stroke-opacity=".35" stroke-width="2"/><rect y="38" width="1000" height="26" fill="url(#aoDn)" opacity=".55"/>`;
    if (o.wain) {
      const wy = o.wy || 360, wc = o.wain;
      s += `<rect y="${wy}" width="1000" height="${fy - wy}" fill="${wc}"/><rect y="${wy}" width="1000" height="${fy - wy}" fill="url(#p-noise)"/>`;
      for (let x = 18; x < 1000; x += 128) {
        const ph = fy - wy - 50;
        s += `<rect x="${x}" y="${wy + 22}" width="104" height="${ph}" rx="4" fill="${shade(wc, -0.12)}"/><rect x="${x + 4}" y="${wy + 26}" width="96" height="${ph - 8}" rx="3" fill="${shade(wc, 0.07)}"/><path d="M${x + 4} ${wy + 26 + ph - 8}V${wy + 26}H${x + 100}" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/><path d="M${x + 100} ${wy + 26}V${wy + 18 + ph}H${x + 4}" stroke="#000" stroke-opacity=".14" stroke-width="2" fill="none"/>`;
      }
      s += `<rect y="${wy}" width="1000" height="18" fill="url(#aoDn)" opacity=".5"/><rect y="${wy - 10}" width="1000" height="16" fill="${trim}"/><rect y="${wy - 10}" width="1000" height="4" fill="#fff" opacity=".55"/><rect y="${wy + 2}" width="1000" height="4" fill="${shade(trim, -0.25)}"/>`;
    }
    // 踢腳板
    s += `<rect y="${fy - 24}" width="1000" height="26" fill="${shade(trim, -0.1)}"/><rect y="${fy - 24}" width="1000" height="4" fill="#fff" opacity=".45"/><rect y="${fy - 6}" width="1000" height="8" fill="${shade(trim, -0.28)}"/><path d="M0 ${fy - 24}h1000" stroke="${shade(trim, -0.4)}" stroke-width="2"/>`;
    s += this.floor(o.floor || 'wood', o.fc || ['#c98d5a', '#b97c4b'], fy);
    // 左右兩側的牆（透視），讓房間有深度
    const side = (L) => {
      const X = L ? 0 : 1000, d = L ? 1 : -1, w = 44, b = fy + 70;
      const P = `M${X} 0L${X + d * w} 38V${fy}L${X} ${b}z`;
      let q = `<path d="${P}" fill="${shade(c, -0.22)}"/>` + (o.pat ? `<path d="${P}" fill="url(#p-${o.pat})" opacity=".5"/>` : '');
      if (o.wain) { const wy = o.wy || 360; q += `<path d="M${X} ${wy + (b - fy) * (wy / fy)}L${X + d * w} ${wy}V${fy}L${X} ${b}z" fill="${shade(o.wain, -0.25)}"/>`; }
      q += `<path d="M${X} 0L${X + d * w} 38" stroke="${shade(trim, -0.3)}" stroke-width="10"/><path d="M${X} ${b}L${X + d * w} ${fy}" stroke="${shade(trim, -0.3)}" stroke-width="12"/><path d="M${X + d * w} 38V${fy}" stroke="#1e0d04" stroke-opacity=".35" stroke-width="2"/><path d="${P}" fill="#1e0d04" opacity=".18"/>`;
      return q;
    };
    s += side(true) + side(false);
    s += `<rect width="1000" height="625" fill="url(#corners)"/><!--DECO-->`;
    return s;
  },
  floor(kind, fc, fy = 488) {
    let s = `<rect y="${fy}" width="1000" height="${625 - fy}" fill="${fc[0]}"/>`;
    const vx = 500, Y = [fy, fy + 24, fy + 54, fy + 92, 625 + 20];
    const px = (x, y) => vx + (x - vx) * (1 + (y - fy) * 0.0062);
    if (kind === 'wood') {
      for (let x = -700, k = 0; x <= 1700; x += 96, k++) {
        const t = (hash(k) - 0.5) * 0.12;
        s += `<path d="M${x} ${fy}L${x + 96} ${fy}L${px(x + 96, 645)} 645L${px(x, 645)} 645z" fill="${shade(fc[0], t)}"/>`;
        s += `<path d="M${x} ${fy}L${px(x, 625)} 625" stroke="${shade(fc[0], -0.3)}" stroke-width="2" opacity=".75"/><path d="M${x + 2} ${fy}L${px(x + 2, 625) + 2} 625" stroke="#fff" stroke-width="1" opacity=".12"/>`;
      }
      Y.slice(1, 4).forEach((y, i) => { for (let x = -700 + (i % 2) * 48; x <= 1700; x += 192) { const a = px(x, y), b = px(x + 96, y); s += `<path d="M${a} ${y}L${b} ${y}" stroke="${shade(fc[0], -0.22)}" stroke-width="2" opacity=".6"/>`; } });
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-wood)"/>`;
    } else if (kind === 'check' || kind === 'tile') {
      for (let r = 0; r < 4; r++) for (let x = -700, k = 0; x <= 1700; x += 80, k++) {
        const y0 = Y[r], y1 = Y[r + 1];
        if ((k + r) % 2 || kind === 'tile') s += `<path d="M${px(x, y0)} ${y0}L${px(x + 80, y0)} ${y0}L${px(x + 80, y1)} ${y1}L${px(x, y1)} ${y1}z" fill="${(k + r) % 2 ? fc[1] : fc[0]}" stroke="${kind === 'tile' ? shade(fc[0], -0.18) : 'none'}" stroke-width="2"/>`;
      }
    } else if (kind === 'carpet') {
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-knit)"/>`;
    } else if (kind === 'stone') {
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-stone)"/>`;
    }
    s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-noise)"/>`;
    s += `<ellipse cx="500" cy="${fy + 70}" rx="420" ry="70" fill="url(#gloss)"/>`;
    s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#fshade)"/>`;
    return s;
  },
  light(extra = '') { this.motes(120, 140, 760, 380, 6, 7); return `<rect width="1000" height="625" fill="url(#lt)"/>${extra}<rect width="1000" height="625" fill="url(#vig)"/>`; },
  pool(x, y, rx, ry = rx * 0.35, op = 0.5) { return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#lampG)" opacity="${op}" pointer-events="none"/>`; },
  // 天花板吊燈（會輕輕晃）
  pendant(x, len = 70, c = '#e9a85a', floorY = 560) {
    this.fx(`<g class="pend" style="${this.ad(7)}"><path d="M${x} 0V${len}" stroke="#4a3222" stroke-width="3"/><path d="M${x - 34} ${len + 30}q0-30 34-30t34 30z" fill="${c}" ${SW}/><path d="M${x - 34} ${len + 30}q0-30 34-30t34 30z" fill="url(#cyl)" opacity=".6"/><ellipse cx="${x}" cy="${len + 31}" rx="34" ry="6" fill="#fff4c0" ${SW2}/><circle class="flick" cx="${x}" cy="${len + 40}" r="70" fill="url(#lampG)" style="${this.ad(3.3)}"/></g>`);
    return `<path d="M${x - 30} ${len + 34}L${x - 150} ${floorY}H${x + 150}L${x + 30} ${len + 34}z" fill="url(#shaftG)" opacity=".12" pointer-events="none"/>` + this.pool(x, floorY + 10, 170, 34, 0.55);
  },
  // 牆上的掛鐘（秒針會走）
  wallClock(x, y, r = 34, c = '#a8703f') {
    let o = `<circle cx="${x + 3}" cy="${y + 5}" r="${r + 6}" fill="#1e0d04" opacity=".2"/><circle cx="${x}" cy="${y}" r="${r + 6}" fill="${c}" ${SW}/><circle cx="${x}" cy="${y}" r="${r}" fill="#fffaf0" ${SW2}/>`;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o += `<circle cx="${(x + Math.sin(a) * r * 0.8).toFixed(1)}" cy="${(y - Math.cos(a) * r * 0.8).toFixed(1)}" r="${i % 3 ? 1.5 : 2.6}" fill="#4a3222"/>`; }
    o += `<path d="M${x} ${y}l${r * 0.3} ${-r * 0.35}M${x} ${y}l${-r * 0.1} ${-r * 0.6}" ${SW}/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#glass)"/>`;
    this.fx(`<g class="tick" style="${this.ad(60)}"><g transform="translate(${x} ${y})"><circle r="${r * 0.8}" fill="none"/><path d="M0 4V${-r * 0.78}" stroke="#c4502c" stroke-width="1.6"/><circle r="2.6" fill="#c4502c"/></g></g>`);
    return o;
  },
  closeBg(c, pat, extra = '') { // 特寫背景：桌面般的質感＋聚光
    return `<rect width="1000" height="625" fill="${shade(c, -0.12)}"/>${pat ? `<rect width="1000" height="625" fill="url(#p-${pat})" opacity=".8"/>` : ''}<rect width="1000" height="625" fill="url(#p-noise)"/><ellipse cx="500" cy="300" rx="560" ry="380" fill="url(#spot)"/>${extra}<rect width="1000" height="625" fill="url(#corners)" opacity=".8"/>`;
  },

  // ---------- 基本形狀 ----------
  rr(x, y, w, h, r, fill, o = '') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${SW} ${o}/>`; },
  bev(x, y, w, h, r = 4, k = 'bevel', op = 1) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${k})" opacity="${op}" pointer-events="none"/>`; },
  box(x, y, w, h, fill, top = 16, o = '') { // 有頂面的立體櫃子
    return `<path d="M${x} ${y}L${x + 12} ${y - top}H${x + w - 12}L${x + w} ${y}z" fill="${shade(fill, 0.2)}" ${SW}/><path d="M${x + 14} ${y - top + 3}H${x + w - 14}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>` + this.rr(x, y, w, h, 4, fill, o) + `<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" rx="3" fill="url(#cyl)" opacity=".55" pointer-events="none"/>` + this.sh(x + w / 2, y + h + 2, w * 0.56, 9, 0.2);
  },
  sh(cx, cy, rx, ry, o = 0.24) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#1e0d04" opacity="${o}"/>`; },
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
  gear(cx, cy, r, fill = 'url(#brass)', n = 10, o = '') {
    return `<path d="${this.gearPath(cx, cy, r, n)}" fill="${fill}" fill-rule="evenodd" ${SW} ${o}/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="#7a4a10" stroke-opacity=".35" stroke-width="${Math.max(1, r * 0.06)}" ${o}/><path d="M${cx - r * 0.5} ${cy - r * 0.5}a${r * 0.72} ${r * 0.72} 0 0 1 ${r * 0.9} -${r * 0.15}" stroke="#fff" stroke-opacity=".5" stroke-width="${Math.max(1.2, r * 0.08)}" fill="none" stroke-linecap="round" ${o}/>`;
  },

  // ---------- 家具與物件 ----------
  door(x, y, w, h, c, o = {}) {
    const fr = o.frame || '#f8efe0';
    let s = `<rect x="${x - 22}" y="${y - 22}" width="${w + 44}" height="${h + 22}" rx="6" fill="${fr}" ${SW}/><rect x="${x - 22}" y="${y - 22}" width="${w + 44}" height="${h + 22}" rx="6" fill="url(#bevel)"/><rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 10}" rx="3" fill="${shade(fr, -0.12)}" ${SW2}/>`;
    if (o.open) {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff4d6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sunG)" opacity=".9"/>`;
      s += `<path d="M${x + 8} ${y + h}L${x - 30} ${y + h + 140}H${x + w + 40}L${x + w - 8} ${y + h}z" fill="#fff4c8" opacity=".35"/>`;
      s += `<path d="M${x} ${y}L${x - w * 0.42} ${y + 24}V${y + h + 18}L${x} ${y + h}z" fill="${c}" ${SW}/><path d="M${x} ${y}L${x - w * 0.42} ${y + 24}V${y + h + 18}L${x} ${y + h}z" fill="url(#cyl)" opacity=".7"/>`;
      return s + (o.glowText ? this.txt(x + w / 2, y + h / 2, o.glowText, 22, '#c08a3a') : '');
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-wood)" opacity=".8"/>`;
    const pw = (w - 42) / 2;
    const panel = (px, py, pw2, ph) => `<rect x="${px}" y="${py}" width="${pw2}" height="${ph}" rx="4" fill="${shade(c, -0.14)}" ${SW2}/><rect x="${px + 5}" y="${py + 5}" width="${pw2 - 10}" height="${ph - 10}" rx="3" fill="${shade(c, 0.1)}"/><path d="M${px + 5} ${py + ph - 5}V${py + 5}H${px + pw2 - 5}" stroke="#fff" stroke-opacity=".4" stroke-width="2" fill="none"/>`;
    if (o.win) s += `<rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h * 0.3}" rx="${(w - 36) / 2}" fill="url(#sky)" ${SW2}/><rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h * 0.3}" rx="${(w - 36) / 2}" fill="url(#glass)"/><path d="M${x + w / 2} ${y + 18}v${h * 0.3}" ${SW2}/>`;
    else s += panel(x + 14, y + 18, pw, h * 0.36) + panel(x + 28 + pw, y + 18, pw, h * 0.36);
    s += panel(x + 14, y + h * 0.48, pw, h * 0.44) + panel(x + 28 + pw, y + h * 0.48, pw, h * 0.44);
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#cyl)" opacity=".5"/>`;
    if (o.knob !== false) s += `<circle cx="${x + w - 20}" cy="${y + h * 0.5 + 2}" r="11" fill="#1e0d04" opacity=".25"/><circle cx="${x + w - 20}" cy="${y + h * 0.5}" r="10" fill="url(#brass)" ${SW2}/><circle cx="${x + w - 23}" cy="${y + h * 0.5 - 3}" r="3" fill="#fff" opacity=".7"/>`;
    else s += `<circle cx="${x + w - 20}" cy="${y + h * 0.5}" r="7" fill="#2a1a10"/><circle cx="${x + w - 20}" cy="${y + h * 0.5}" r="11" fill="none" stroke="url(#brass)" stroke-width="3"/>`;
    if (o.keyhole) s += `<rect x="${x + w - 30}" y="${y + h * 0.5 + 12}" width="20" height="30" rx="5" fill="url(#brass)" ${SW2}/><path d="M${x + w - 20} ${y + h * 0.5 + 20}a4 4 0 1 1 0.1 0l3 12h-6z" fill="#2a1a10"/>`;
    return s + `<rect x="${x - 6}" y="${y + h - 2}" width="${w + 12}" height="10" fill="url(#aoDn)" opacity=".6"/>`;
  },
  win(x, y, w, h, o = {}) {
    const sky = o.sky || 'sky', fr = o.frame || '#fffaf0';
    let s = `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="6" fill="${fr}" ${SW}/><rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="6" fill="url(#bevel)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${sky})" ${SW2}/>`;
    if (o.scene) s += o.scene;
    else if (sky === 'sky') {
      s += `<circle cx="${x + w * 0.75}" cy="${y + h * 0.25}" r="${w * 0.12}" fill="#fffbe0" opacity=".5"/><circle cx="${x + w * 0.75}" cy="${y + h * 0.25}" r="${w * 0.07}" fill="#fff6c8"/><path d="M${x} ${y + h * 0.78}q${w * 0.25}-${h * 0.18} ${w * 0.5} -${h * 0.04}t${w * 0.5} -${h * 0.06}V${y + h}H${x}z" fill="#b6dc9a"/><path d="M${x} ${y + h * 0.86}q${w * 0.3}-${h * 0.2} ${w * 0.6} -${h * 0.02}t${w * 0.4} 0V${y + h}H${x}z" fill="#8cc47a"/>`;
      s += `<circle cx="${x + w * 0.18}" cy="${y + h * 0.8}" r="${w * 0.07}" fill="#6fae5a"/><circle cx="${x + w * 0.26}" cy="${y + h * 0.78}" r="${w * 0.06}" fill="#5f9e4a"/>`;
      s += this.fx(`<g class="cloud" style="${this.ad(30)}"><path d="M${x + w * 0.1} ${y + h * 0.36}h${w * 0.2}a8 8 0 0 0 0-14a12 12 0 0 0-20-4a9 9 0 0 0-${w * 0.12} 10z" fill="#fff" opacity=".92"/></g>`);
    } else if (sky === 'skyNight') {
      for (let i = 0; i < 9; i++) { const cx = x + 10 + (i * 37) % (w - 20), cy = y + 10 + (i * 53) % (h - 20); s += `<circle cx="${cx}" cy="${cy}" r="${1 + (i % 3) * 0.6}" fill="#fff8d0"/>`; if (i % 3 === 0) this.twinkle(cx, cy, 2.4); }
      s += `<circle cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="${w * 0.09}" fill="#fff6d0"/><circle cx="${x + w * 0.75}" cy="${y + h * 0.28}" r="${w * 0.08}" fill="url(#${sky})"/>`;
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass)"/>`;
    s += `<path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${fr}" stroke-width="8"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" ${SW2} fill="none"/>`;
    s += `<rect x="${x - 20}" y="${y + h + 8}" width="${w + 40}" height="14" rx="3" fill="${fr}" ${SW}/><rect x="${x - 20}" y="${y + h + 22}" width="${w + 40}" height="12" fill="url(#aoDn)" opacity=".6"/>`;
    if (sky === 'sky' && o.shaft !== false) s += this.shaft(`${x} ${y + h}L${x + w} ${y + h}L${x + w * 1.6} ${y + h + 260}L${x + w * 0.3} ${y + h + 260}`, 0.22) + this.motes(x, y + h, w * 1.4, 240, 6, x);
    if (o.curtain) {
      const c = o.curtain, ad = this.ad(6);
      const L = `<path d="M${x - 30} ${y - 26}h${w * 0.32 + 30}q-${w * 0.12} ${h * 0.5} -${w * 0.02} ${h + 30}h-${w * 0.32 - 10}z" fill="${c}" ${SW}/><path d="M${x - 10} ${y - 20}q8 ${h * 0.5} 4 ${h + 20}M${x + w * 0.1} ${y - 20}q6 ${h * 0.5} 0 ${h + 22}" stroke="${shade(c, -0.25)}" stroke-width="3" fill="none"/><path d="M${x - 22} ${y - 20}q6 ${h * 0.5} 2 ${h + 24}" stroke="#fff" stroke-opacity=".3" stroke-width="5" fill="none"/>`;
      const R = `<path d="M${x + w + 30} ${y - 26}h-${w * 0.32 + 30}q${w * 0.12} ${h * 0.5} ${w * 0.02} ${h + 30}h${w * 0.32 - 10}z" fill="${c}" ${SW}/><path d="M${x + w + 10} ${y - 20}q-8 ${h * 0.5} -4 ${h + 20}M${x + w * 0.9} ${y - 20}q-6 ${h * 0.5} 0 ${h + 22}" stroke="${shade(c, -0.25)}" stroke-width="3" fill="none"/>`;
      this.fx(`<g class="sway" style="${ad}">${L}</g><g class="sway s2" style="${ad}">${R}</g><rect x="${x - 44}" y="${y - 34}" width="${w + 88}" height="12" rx="6" fill="#a87443" ${SW}/><circle cx="${x - 46}" cy="${y - 28}" r="9" fill="url(#brass)" ${SW2}/><circle cx="${x + w + 46}" cy="${y - 28}" r="9" fill="url(#brass)" ${SW2}/>`);
    }
    return s;
  },
  frame(x, y, w, h, inner, o = {}) {
    const fc = o.fc || '#d9a548';
    return `<g filter="url(#ds2)"><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="5" fill="${fc}" ${SW}/><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="5" fill="url(#bevel)"/><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="3" fill="${shade(fc, -0.25)}" ${SW2}/></g>` +
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${o.vw || 100} ${o.vh || 100}" preserveAspectRatio="${o.par || 'none'}">${inner}</svg><rect x="${x}" y="${y}" width="${w}" height="10" fill="url(#aoDn)" opacity=".5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass)" opacity=".7"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${SW2}/>`;
  },
  book(x, y, w, h, c, o = {}) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW2}/><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="2" fill="url(#cyl)" opacity=".8"/><rect x="${x + 3}" y="${y + h * 0.15}" width="${w - 6}" height="5" fill="${shade(c, 0.35)}"/><rect x="${x + 3}" y="${y + h * 0.8}" width="${w - 6}" height="4" fill="${shade(c, 0.35)}"/>`;
    if (o.num !== undefined) s += `<circle cx="${x + w / 2}" cy="${y + h * 0.48}" r="${Math.min(w * 0.38, 15)}" fill="#fff3d0" ${SW2}/>` + this.txt(x + w / 2, y + h * 0.48 + Math.min(w * 0.38, 15) * 0.42, o.num, Math.min(w * 0.55, 22), '#7a3d14', 'middle', 900);
    return s;
  },
  books(x, y, n, h, seed = 1) {
    const cols = ['#c9583c', '#3f7f8f', '#e0a43a', '#6f8f4a', '#8a5a9a', '#b9774a', '#d9776e', '#4f6aa8'];
    let s = '', xx = x;
    for (let i = 0; i < n; i++) { const w = 18 + ((i * 7 + seed * 3) % 4) * 5, hh = h - ((i * 11 + seed) % 4) * 9; s += this.book(xx, y + h - hh, w, hh, cols[(i * 3 + seed) % cols.length]); xx += w + 2; }
    return s;
  },
  shelf(x, y, w, c = '#a8703f') { return `<rect x="${x}" y="${y}" width="${w}" height="12" rx="3" fill="${c}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="12" rx="3" fill="url(#bevel)"/><rect x="${x + 6}" y="${y + 12}" width="${w - 12}" height="12" fill="url(#aoDn)" opacity=".7"/><path d="M${x + 20} ${y + 12}l10 18h10l-6-18M${x + w - 20} ${y + 12}l-10 18h-10l6-18" fill="${shade(c, -0.15)}" ${SW2}/>`; },
  table(x, y, w, h, c = '#b07644', o = {}) {
    let s = this.sh(x + w / 2, y + h + 4, w * 0.58, 13, 0.28);
    s += `<rect x="${x + 8}" y="${y + 14}" width="12" height="${h - 14}" rx="5" fill="${shade(c, -0.15)}" ${SW2}/><rect x="${x + w - 20}" y="${y + 14}" width="12" height="${h - 14}" rx="5" fill="${shade(c, -0.15)}" ${SW2}/><rect x="${x + 9}" y="${y + 14}" width="10" height="${h - 14}" fill="url(#cyl)" opacity=".7"/><rect x="${x + w - 19}" y="${y + 14}" width="10" height="${h - 14}" fill="url(#cyl)" opacity=".7"/>`;
    s += `<path d="M${x} ${y}L${x + 12} ${y - 12}H${x + w - 12}L${x + w} ${y}z" fill="${shade(c, 0.22)}" ${SW}/><path d="M${x + 14} ${y - 9}H${x + w - 14}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="${c}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="16" rx="3" fill="url(#p-wood)"/><rect x="${x + 10}" y="${y + 16}" width="${w - 20}" height="10" fill="url(#aoDn)" opacity=".6"/>`;
    if (o.cloth) s += `<path d="M${x + 12} ${y - 12}H${x + w - 12}L${x + w + 6} ${y}l8 ${o.cloth}q-${(w + 28) / 4} 10 -${(w + 28) / 2} 0t-${(w + 28) / 2} 0l8 -${o.cloth}z" fill="${o.clothC || '#f4f0e6'}" ${SW}/><path d="M${x + w * 0.25} ${y}v${o.cloth + 4}M${x + w * 0.5} ${y}v${o.cloth + 6}M${x + w * 0.75} ${y}v${o.cloth + 4}" stroke="#000" stroke-opacity=".07" stroke-width="5"/>`;
    return s;
  },
  plant(x, y, s = 1, pot = '#d9774b', leaf = '#5f9e5a') {
    let o = this.sh(x, y + 2, 44 * s, 9 * s, 0.28);
    o += `<g transform="translate(${x} ${y}) scale(${s})">`;
    [[-30, -110, -0.5], [0, -130, 0], [30, -110, 0.5], [-48, -70, -0.9], [46, -74, 0.9], [-12, -96, -0.2], [16, -100, 0.25]].forEach(([dx, dy, r], i) => {
      const cl = i % 2 ? shade(leaf, 0.14) : leaf;
      o += `<path d="M0 -40Q${dx * 0.3} ${dy * 0.6} ${dx} ${dy}Q${dx * 0.9 + 14 * Math.sign(r || 1)} ${dy * 0.6} 0 -40z" fill="${cl}" ${SW2}/><path d="M0 -42Q${dx * 0.45} ${dy * 0.62} ${dx * 0.92} ${dy * 0.95}" stroke="${shade(leaf, -0.3)}" stroke-width="1.6" fill="none" opacity=".7"/>`;
    });
    o += `<path d="M-30 -42h60l-8 42h-44z" fill="${pot}" ${SW}/><path d="M-30 -42h60l-8 42h-44z" fill="url(#cyl)"/><rect x="-35" y="-48" width="70" height="12" rx="4" fill="${shade(pot, 0.12)}" ${SW}/><rect x="-35" y="-48" width="70" height="12" rx="4" fill="url(#bevel)"/></g>`;
    return o;
  },
  lamp(x, y, c = '#f3b860', on = true) {
    if (on) this.fx(`<circle class="flick" cx="${x}" cy="${y - 50}" r="130" fill="url(#lampG)" style="${this.ad(3.3)}"/>`);
    return `<path d="M${x} ${y - 40}V${y}" ${SW}/><path d="M${x - 26} ${y}h52l-6 8h-40z" fill="#8a5a34" ${SW2}/><path d="M${x - 36} ${y - 40}h72l-14-46h-44z" fill="${c}" ${SW}/><path d="M${x - 36} ${y - 40}h72l-14-46h-44z" fill="url(#cyl)" opacity=".6"/>${on ? `<path d="M${x - 34} ${y - 40}h68l-6 6h-56z" fill="#fff6c8" opacity=".9"/>` : ''}<path d="M${x - 18} ${y - 82}l-8 36" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>`;
  },
  rug(cx, cy, rx, ry, c, c2) {
    let s = `<ellipse cx="${cx}" cy="${cy + 4}" rx="${rx + 4}" ry="${ry + 3}" fill="#1e0d04" opacity=".18"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" ${SW}/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#p-knit)"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.7}" fill="none" stroke="${c2 || shade(c, 0.3)}" stroke-width="6" stroke-dasharray="14 8"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.5}" ry="${ry * 0.42}" fill="${shade(c, -0.08)}" opacity=".6"/>`;
    return s;
  },
  paper(x, y, w, h, rot = 0, c = '#fffdf3', lines = 3) {
    let s = `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x + 2}" y="${y + 3}" width="${w}" height="${h}" rx="3" fill="#1e0d04" opacity=".18"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" ${SW2}/>`;
    for (let i = 0; i < lines; i++) s += `<path d="M${x + 8} ${y + 14 + i * (h - 20) / Math.max(1, lines)}h${w - 16 - (i === lines - 1 ? w * 0.3 : 0)}" stroke="#9fb89a" stroke-width="3" stroke-linecap="round"/>`;
    return s + '</g>';
  },
  pin(x, y, c = '#e05a4a') { return `<circle cx="${x + 1}" cy="${y + 2}" r="6" fill="#1e0d04" opacity=".25"/><circle cx="${x}" cy="${y}" r="6" fill="${c}" ${SW2}/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".7"/>`; },
  sparkle(x, y, s = 1) { return this.fx(`<g class="spk" style="${this.ad(2.4)}"><g transform="translate(${x} ${y}) scale(${s})"><path d="M0-14L3-3 14 0 3 3 0 14-3 3-14 0-3-3z" fill="#fff6c8" stroke="#e0a43a" stroke-width="1.5"/></g></g>`); },
  arrowHint(x, y) { return `<g opacity=".8"><circle cx="${x}" cy="${y}" r="16" fill="#fff6c8" stroke="#e0a43a" stroke-width="3"/><path d="M${x - 6} ${y}h12M${x} ${y - 6}v12" stroke="#c07a2a" stroke-width="3" stroke-linecap="round"/></g>`; },
  // 隱藏的小音符（收集品）
  hiddenNote(x, y, s = 1, found) {
    if (found) return '';
    return this.fx(`<g class="hnote" style="${this.ad(4)}"><g transform="translate(${x} ${y}) scale(${s})"><circle r="15" fill="#fff6c8" opacity=".25"/><path d="M-3 7V-11l10 3v4l-7-2v13" fill="none" stroke="#c08a2a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="-6" cy="8" rx="5" ry="4" fill="#e0a43a" stroke="#8a5a1a" stroke-width="1.5" transform="rotate(-20 -6 8)"/></g></g>`);
  },

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
  // 會動的人物（推理事件的現場）：身體一層（呼吸、晃動）、眼皮一層（眨眼），都只用 transform／opacity，手機上很省
  // x,y 是左上角；o.full=全身（高 330）否則半身（高 240）；o.e 表情；o.hop 被點到時跳一下；o.front 畫在人物前面的東西（櫃台等）
  person(who, x, y, sc = 1, o = {}) {
    const P = PEOPLE[who]; if (!P) return '';
    const H = o.full ? 330 : 240, e = o.e || 'n', d = (o.d || (3.4 + hash(who.length * 13 + x) * 1.8)).toFixed(2), bd = (3.6 + hash(x + y) * 2.4).toFixed(2);
    const box = `<rect width="200" height="${H}" fill="none"/>`, svg = inner => `<svg x="${x}" y="${y}" width="${200 * sc}" height="${H * sc}" viewBox="0 0 200 ${H}" overflow="visible">${box}${inner}</svg>`;
    const now = performance.now() / 1000, dl = k => `-${(now % k).toFixed(2)}s`;
    const kind = o.full ? 'pidle' : 'pidleB', hop = (o.hop || (typeof G !== 'undefined' && G._hop === who)) ? ',phop .55s 1' : '';
    this.fx(`<g class="${kind}" style="animation:${kind} ${d}s ease-in-out ${dl(d)} infinite${hop}">${svg(o.full ? Face.fig(P, e) : Face.body(P, e))}</g>`);
    const lid = Face.lids(P, e);
    if (lid) this.fx(`<g class="${kind} plid" style="animation:${kind} ${d}s ease-in-out ${dl(d)} infinite,plid ${bd}s step-end ${dl(bd)} infinite${hop}">${svg(lid)}</g>`);
    if (o.front) this.fx(o.front);
    return '';
  },
  // 小貓「麻糬」：在場景裡會甩尾巴、眨眼睛（畫在動畫層）。inline=true 時直接回傳（頭像、標題）
  cat(x, y, s = 1, pose = 'sit', inline = false) {
    const c = '#fff8ee', c2 = '#efe2cf', st = SW, ad = this.ad(3.2), ad2 = this.ad(5.5);
    const T = inner => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;
    // 會動的部分各自一層（只動 transform），不會讓整隻貓每一格重畫
    const parts = [];
    const L = (cls, style, inner) => parts.push(inline ? `<g transform="translate(${x} ${y}) scale(${s})"><g class="${cls}" style="${style}">${inner}</g></g>` : `<g class="${cls}" style="${style}">${T(inner)}</g>`);
    const S = inner => parts.push(T(inner));
    if (pose === 'sit') {
      S(this.sh(0, 4, 46, 8, 0.28));
      L('tail', ad, `<path d="M24 -2q34-4 26-38q-2-10 6-14" fill="none" stroke="#4a3222" stroke-width="15" stroke-linecap="round"/><path d="M24 -2q34-4 26-38q-2-10 6-14" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/><path d="M50 -44q-2-6 6-10" fill="none" stroke="#e8b46a" stroke-width="9" stroke-linecap="round"/>`);
      L('ear', ad2, `<path d="M-30-62l4-30 18 16z" fill="${c}" ${st}/><path d="M-26-70l2-14 9 8z" fill="#f4b8b0"/>`);
      let b = `<path d="M-28 0q-6-40 10-54h36q16 14 10 54z" fill="${c}" ${st}/><path d="M-22-4q-4-30 6-44" stroke="${c2}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-6-40q6 8 12 0" stroke="#f4d0c0" stroke-width="5" fill="none" opacity=".7"/>`;
      b += `<path d="M30-62l-4-30-18 16z" fill="${c}" ${st}/><path d="M26-70l-2-14-9 8z" fill="#f4b8b0"/>`;
      b += `<ellipse cx="0" cy="-62" rx="34" ry="28" fill="${c}" ${st}/><ellipse cx="0" cy="-56" rx="28" ry="16" fill="#fff" opacity=".6"/><path d="M-12-88q12-8 24 0q-12 8-24 0" fill="#e8b46a" opacity=".9"/><path d="M14-84q8 2 10 10" stroke="#e8b46a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`;
      b += `<path d="M-3-55l3 3 3-3z" fill="#f08a8a" ${SW2}/><path d="M0-52q-4 6-9 3M0-52q4 6 9 3" ${SW2} fill="none"/><path d="M-22-54h-14M-22-50l-13 4M22-54h14M22-50l13 4" stroke="#c9b8a4" stroke-width="1.6"/><circle cx="-20" cy="-54" r="5" fill="#f6b0a8" opacity=".55"/><circle cx="20" cy="-54" r="5" fill="#f6b0a8" opacity=".55"/>`;
      b += `<path d="M-16 0v-14M16 0v-14" ${SW2}/><ellipse cx="-14" cy="-2" rx="9" ry="5" fill="${c}" ${SW2}/><ellipse cx="14" cy="-2" rx="9" ry="5" fill="${c}" ${SW2}/>`;
      S(b);
      L('blinkc', ad, `<ellipse cx="-12" cy="-64" rx="4.2" ry="5.5" fill="#3a2a1e"/><ellipse cx="12" cy="-64" rx="4.2" ry="5.5" fill="#3a2a1e"/><circle cx="-10.5" cy="-66" r="1.6" fill="#fff"/><circle cx="13.5" cy="-66" r="1.6" fill="#fff"/>`);
    } else { // 趴著
      S(this.sh(0, 4, 46, 8, 0.28));
      L('tail2', ad, `<path d="M48-14q30 2 26 18" fill="none" stroke="#4a3222" stroke-width="13" stroke-linecap="round"/><path d="M48-14q30 2 26 18" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`);
      L('breathe', ad2, `<ellipse cx="0" cy="-16" rx="52" ry="20" fill="${c}" ${st}/><path d="M-20-30q20-8 50 0" stroke="#e8b46a" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`);
      S(`<path d="M-60-38l2-24 16 14zM-24-38l-2-24-14 14z" fill="${c}" ${st}/><path d="M-56-44l1-12 8 7z" fill="#f4b8b0"/><ellipse cx="-42" cy="-28" rx="26" ry="21" fill="${c}" ${st}/><path d="M-54-30q4-3 8 0M-38-30q4-3 8 0" ${SW2} fill="none"/><path d="M-45-22l3 2 3-2" ${SW2}/><circle cx="-58" cy="-22" r="4" fill="#f6b0a8" opacity=".55"/><circle cx="-28" cy="-22" r="4" fill="#f6b0a8" opacity=".55"/>`);
      L('zz', this.ad(3), this.txt(-20, -60, 'z', 14, '#8a7ab0', 'middle', 900));
    }
    if (inline) return parts.join('');
    parts.forEach(p => this.fx(p));
    return '';
  },
};

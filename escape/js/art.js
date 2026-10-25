'use strict';
// 美術：所有場景都用 SVG 字串畫出來。統一的深棕描邊、暖色、柔和光影。
// 場景分兩層：#art（靜態，畫一次）與 #fx（會動的環境動畫：灰塵、窗簾、貓咪、燈光閃爍……）
const K = '#4a3222';           // 描邊色
// 線條：外輪廓稍粗、內部細節更細（不同粗細的線，畫面才會「精緻」而不是一律粗框）
const SW = 'stroke="#4a3222" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"';
const SW2 = 'stroke="#4a3222" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"';

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
<linearGradient id="brass" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff6cc"/><stop offset=".16" stop-color="#f4cf72"/><stop offset=".4" stop-color="#cf9636"/><stop offset=".52" stop-color="#fbe6a6"/><stop offset=".62" stop-color="#d9a446"/><stop offset=".84" stop-color="#9a6420"/><stop offset="1" stop-color="#6e4210"/></linearGradient>
<linearGradient id="silver" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#d6dde5"/><stop offset=".46" stop-color="#9aa6b4"/><stop offset=".56" stop-color="#f4f7fa"/><stop offset=".8" stop-color="#a4afbc"/><stop offset="1" stop-color="#6e7a88"/></linearGradient>
<linearGradient id="fm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbea" stop-opacity=".26"/><stop offset=".22" stop-color="#fffbea" stop-opacity=".06"/><stop offset=".6" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".24"/></linearGradient>
<linearGradient id="fmL" x1="0" y1="0" x2="1" y2=".55"><stop offset="0" stop-color="#fffbea" stop-opacity=".28"/><stop offset=".3" stop-color="#fffbea" stop-opacity=".04"/><stop offset=".62" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".28"/></linearGradient>
<linearGradient id="fmR" x1="1" y1="0" x2="0" y2=".55"><stop offset="0" stop-color="#fffbea" stop-opacity=".28"/><stop offset=".3" stop-color="#fffbea" stop-opacity=".04"/><stop offset=".62" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".28"/></linearGradient>
<radialGradient id="keyL" cx="10%" cy="12%" r="110%"><stop offset="0" stop-color="#fff0c4" stop-opacity=".34"/><stop offset=".38" stop-color="#fff0c4" stop-opacity=".03"/><stop offset=".7" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".24"/></radialGradient>
<radialGradient id="keyR" cx="90%" cy="12%" r="110%"><stop offset="0" stop-color="#fff0c4" stop-opacity=".34"/><stop offset=".38" stop-color="#fff0c4" stop-opacity=".03"/><stop offset=".7" stop-color="#1e0d04" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".24"/></radialGradient>
<radialGradient id="keyB" cx="50%" cy="16%" r="80%"><stop offset="0" stop-color="#fff2c8" stop-opacity=".36"/><stop offset=".5" stop-color="#fff2c8" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".16"/></radialGradient>
<linearGradient id="keyF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d0" stop-opacity=".1"/><stop offset=".5" stop-color="#fff4d0" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".08"/></linearGradient>
<radialGradient id="shG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1e0d04" stop-opacity=".9"/><stop offset=".55" stop-color="#1e0d04" stop-opacity=".45"/><stop offset="1" stop-color="#1e0d04" stop-opacity="0"/></radialGradient>
<linearGradient id="cove" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e0d04" stop-opacity=".3"/><stop offset=".7" stop-color="#1e0d04" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>
<linearGradient id="foldG" x1="0" y1="0" x2=".18" y2="0" spreadMethod="reflect"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1e0d04" stop-opacity=".26"/></linearGradient>
<linearGradient id="glassR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".18" stop-color="#fff" stop-opacity=".08"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".22"/><stop offset=".47" stop-color="#fff" stop-opacity="0"/><stop offset=".53" stop-color="#fff" stop-opacity=".12"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#cfe6ff" stop-opacity=".1"/></linearGradient>
<radialGradient id="irisG" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
<radialGradient id="skinG" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="#fff6ec" stop-opacity=".3"/><stop offset=".45" stop-color="#fff6ec" stop-opacity="0"/><stop offset=".8" stop-color="#a0502a" stop-opacity=".06"/><stop offset="1" stop-color="#a0502a" stop-opacity=".2"/></radialGradient>
<linearGradient id="varnish" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8e0" stop-opacity=".22"/><stop offset=".4" stop-color="#fff8e0" stop-opacity="0"/><stop offset="1" stop-color="#3a1e08" stop-opacity=".22"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d0" stop-opacity=".55"/><stop offset="1" stop-color="#fff7d0" stop-opacity="0"/></linearGradient>
<linearGradient id="shaftG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf" stop-opacity=".95"/><stop offset=".6" stop-color="#fff2c0" stop-opacity=".35"/><stop offset="1" stop-color="#fff2c0" stop-opacity="0"/></linearGradient>
<pattern id="p-noise" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${this.noiseURL()}" width="256" height="256"/></pattern>
<pattern id="p-plaster" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${this.plasterURL()}" width="256" height="256"/></pattern>
<pattern id="p-grainH" width="260" height="40" patternUnits="userSpaceOnUse"><path d="M0 5q65-4 130 0t130 0M0 13q50 3 100 0t90-2t70 2M0 22q70-5 140-1t120 1M0 30q40 2 80-1t100 2t80-1M0 36.5q90-3 180 0t80 0" fill="none" stroke="#2a1405" stroke-opacity=".16" stroke-width=".8"/><path d="M0 9q80 3 160-1t100 1M0 26q60-3 120 0t140 0" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.3"/><path d="M146 18q16-9 32 0q-16 8-32 0zM150 18q12-5 24 0q-12 4-24 0z" fill="none" stroke="#2a1405" stroke-opacity=".16" stroke-width=".7"/><ellipse cx="162" cy="18" rx="4" ry="1.4" fill="#2a1405" opacity=".2"/></pattern>
<pattern id="p-grainV" width="260" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><path d="M0 5q65-4 130 0t130 0M0 13q50 3 100 0t90-2t70 2M0 22q70-5 140-1t120 1M0 30q40 2 80-1t100 2t80-1M0 36.5q90-3 180 0t80 0" fill="none" stroke="#2a1405" stroke-opacity=".16" stroke-width=".8"/><path d="M0 9q80 3 160-1t100 1M0 26q60-3 120 0t140 0" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.3"/><path d="M46 18q16-9 32 0q-16 8-32 0z" fill="none" stroke="#2a1405" stroke-opacity=".14" stroke-width=".7"/></pattern>
<pattern id="p-weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 1.5h6M0 4.5h6" stroke="#fff" stroke-opacity=".09" stroke-width="1"/><path d="M1.5 0v6M4.5 0v6" stroke="#1e0d04" stroke-opacity=".08" stroke-width="1"/></pattern>
<pattern id="p-twill" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 1h4" stroke="#fff" stroke-opacity=".06" stroke-width=".7"/><path d="M0 3h4" stroke="#1e0d04" stroke-opacity=".05" stroke-width=".7"/></pattern>
<pattern id="p-canvas" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 .75h3M.75 0v3" stroke="#fff" stroke-opacity=".07" stroke-width=".5"/><path d="M0 2.25h3M2.25 0v3" stroke="#000" stroke-opacity=".05" stroke-width=".5"/></pattern>
<pattern id="p-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v7" stroke="#1e0d04" stroke-opacity=".12" stroke-width="1"/></pattern>
<pattern id="p-stripe" width="48" height="96" patternUnits="userSpaceOnUse"><rect width="20" height="96" fill="#fff" opacity=".08"/><path d="M1 0v96M19 0v96" stroke="#fff" stroke-opacity=".22" stroke-width=".9"/><path d="M3.5 0v96M16.5 0v96" stroke="#fff" stroke-opacity=".12" stroke-width=".6"/><path d="M34 0v96" stroke="#000" stroke-opacity=".07" stroke-width="5"/><path d="M34 0v96" stroke="#fff" stroke-opacity=".1" stroke-width=".6"/><g fill="#f6e2a8" opacity=".28"><path d="M10 18l3.2 5.5-3.2 5.5-3.2-5.5z"/><path d="M10 66l3.2 5.5-3.2 5.5-3.2-5.5z"/></g><path d="M10 40q-4 4 0 8q4-4 0-8zM6 44h8" fill="none" stroke="#f6e2a8" stroke-opacity=".25" stroke-width=".8"/></pattern>
<pattern id="p-dots" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="4.2" fill="#fff" opacity=".3"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#c08a3a" stroke-opacity=".2" stroke-width=".7"/><circle cx="10.8" cy="10.8" r="1.4" fill="#fff" opacity=".5"/><circle cx="36" cy="36" r="4.2" fill="#fff" opacity=".3"/><circle cx="36" cy="36" r="4.2" fill="none" stroke="#c08a3a" stroke-opacity=".2" stroke-width=".7"/><g transform="translate(36 12)" opacity=".32"><circle cx="0" cy="-2.6" r="1.8" fill="#e98a6a"/><circle cx="2.5" cy="0" r="1.8" fill="#e98a6a"/><circle cx="0" cy="2.6" r="1.8" fill="#e98a6a"/><circle cx="-2.5" cy="0" r="1.8" fill="#e98a6a"/><circle r="1.2" fill="#f6d06a"/></g><path d="M12 36q4-5 9-4M12 36q-2-5 1-8" stroke="#6f9a5a" stroke-opacity=".3" stroke-width=".9" fill="none"/></pattern>
<pattern id="p-flower" width="84" height="84" patternUnits="userSpaceOnUse"><path d="M21 21q14 10 21 21t21 21M63 21q-10 14-21 21t-21 21" fill="none" stroke="#2a6a5a" stroke-opacity=".14" stroke-width="1"/><g transform="translate(21 21)"><g fill="#fff" fill-opacity=".26" stroke="#2a6a5a" stroke-opacity=".22" stroke-width=".7"><ellipse cx="0" cy="-5.5" rx="3.6" ry="5"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(72)"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(144)"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(216)"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(288)"/></g><circle r="2.6" fill="#ffe6a8" opacity=".7"/><circle r="1" fill="#c08a3a" opacity=".5"/></g><g transform="translate(63 63) scale(.8)"><g fill="#fff" fill-opacity=".22" stroke="#2a6a5a" stroke-opacity=".2" stroke-width=".8"><ellipse cx="0" cy="-5.5" rx="3.6" ry="5"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(72)"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(144)"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(216)"/><ellipse cx="0" cy="-5.5" rx="3.6" ry="5" transform="rotate(288)"/></g><circle r="2.6" fill="#f4b8b0" opacity=".6"/></g><path d="M34 32q6-6 10-1q-6 4-10 1zM50 54q-6 5-10 0q6-4 10 0z" fill="#fff" fill-opacity=".2" stroke="#2a6a5a" stroke-opacity=".18" stroke-width=".6"/><circle cx="63" cy="21" r="1.6" fill="#fff" opacity=".35"/><circle cx="21" cy="63" r="1.6" fill="#fff" opacity=".35"/><circle cx="42" cy="0" r=".9" fill="#fff" opacity=".35"/><circle cx="0" cy="42" r=".9" fill="#fff" opacity=".35"/></pattern>
<pattern id="p-star" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M22 10l2.8 6.6 7 .7-5.3 4.7 1.6 7-6.1-3.7-6.1 3.7 1.6-7-5.3-4.7 7-.7z" fill="#fff" fill-opacity=".26" stroke="#fff" stroke-opacity=".3" stroke-width=".6"/><path d="M66 52a9 9 0 1 0 7 12a7 7 0 1 1-7-12z" fill="#fff6c8" opacity=".22"/><circle cx="50" cy="22" r="1.6" fill="#fff" opacity=".4"/><circle cx="12" cy="62" r="1.1" fill="#fff" opacity=".35"/><circle cx="80" cy="12" r=".9" fill="#fff" opacity=".4"/><circle cx="38" cy="78" r="1.3" fill="#fff" opacity=".3"/><path d="M38 44v6M35 47h6" stroke="#fff" stroke-opacity=".3" stroke-width=".8"/></pattern>
<pattern id="p-diamond" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M28 2L54 28 28 54 2 28z" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.2"/><path d="M28 6L50 28 28 50 6 28z" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".7"/><g fill="#ffe2a0" opacity=".38"><circle cx="28" cy="24.5" r="2.3"/><circle cx="28" cy="31.5" r="2.3"/><circle cx="24.5" cy="28" r="2.3"/><circle cx="31.5" cy="28" r="2.3"/></g><circle cx="28" cy="28" r="1.4" fill="#a8494a" opacity=".5"/><circle cx="0" cy="0" r="2" fill="#ffe2a0" opacity=".3"/><circle cx="56" cy="0" r="2" fill="#ffe2a0" opacity=".3"/><circle cx="0" cy="56" r="2" fill="#ffe2a0" opacity=".3"/><circle cx="56" cy="56" r="2" fill="#ffe2a0" opacity=".3"/></pattern>
<pattern id="p-tile" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M0 .8h50M0 25.8h50M.8 0v25M25.8 25v25" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/><path d="M0 24.2h50M0 49.2h50M49.2 0v25M24.2 25v25" stroke="#000" stroke-opacity=".08" stroke-width="1.2"/><rect x="3" y="3" width="22" height="5" rx="2" fill="#fff" opacity=".2"/><rect x="28" y="28" width="18" height="5" rx="2" fill="#fff" opacity=".2"/></pattern>
<pattern id="p-gear" width="96" height="96" patternUnits="userSpaceOnUse"><path d="M0 48h96M48 0v96" stroke="#fff" stroke-opacity=".05" stroke-width=".8"/><g fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="1.4"><circle cx="26" cy="26" r="12"/><circle cx="26" cy="26" r="4"/><path d="M26 8v5M26 39v5M8 26h5M39 26h5M13.3 13.3l3.5 3.5M35.2 35.2l3.5 3.5M13.3 38.7l3.5-3.5M35.2 16.8l3.5-3.5"/></g><g fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="1"><circle cx="70" cy="70" r="8"/><circle cx="70" cy="70" r="2.5"/><path d="M70 58v4M70 78v4M58 70h4M78 70h4"/></g><circle cx="70" cy="26" r="1.5" fill="#fff" opacity=".14"/></pattern>
<pattern id="p-glass" width="125" height="125" patternUnits="userSpaceOnUse"><rect width="125" height="125" fill="none" stroke="#e9f6f0" stroke-width="5"/><rect x="2.5" y="2.5" width="120" height="120" fill="none" stroke="#8aa8a0" stroke-opacity=".35" stroke-width=".8"/><path d="M14 30l30-18M18 52l50-30" stroke="#fff" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/><path d="M24 58l60-36" stroke="#fff" stroke-opacity=".2" stroke-width="1.2" stroke-linecap="round"/></pattern>
<pattern id="p-wood" width="260" height="40" patternUnits="userSpaceOnUse"><path d="M0 8q65-4 130 0t130 0M0 18q50 3 100 0t90-2t70 2M0 29q70-5 140-1t120 1" fill="none" stroke="#2a1405" stroke-opacity=".13" stroke-width=".9"/><path d="M0 13q80 3 160-1t100 1M0 35q60-3 120 0t140 0" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="1.3"/></pattern>
<pattern id="p-frieze" width="60" height="16" patternUnits="userSpaceOnUse"><path d="M0 4q15 12 30 0t30 0" stroke="#fff" stroke-opacity=".38" stroke-width="1.1" fill="none"/><path d="M0 6q15 10 30 0t30 0" stroke="#1e0d04" stroke-opacity=".12" stroke-width=".8" fill="none"/><circle cx="0" cy="4" r="2.6" fill="#fff" opacity=".45"/><circle cx="30" cy="4" r="2.6" fill="#fff" opacity=".45"/><circle cx="60" cy="4" r="2.6" fill="#fff" opacity=".45"/><circle cx="15" cy="12.5" r="1.3" fill="#fff" opacity=".4"/><circle cx="45" cy="12.5" r="1.3" fill="#fff" opacity=".4"/></pattern>
<pattern id="p-knit" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5q2.5-4 5 0t5 0" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.1"/><path d="M0 10q2.5-4 5 0t5 0" fill="none" stroke="#1e0d04" stroke-opacity=".08" stroke-width="1"/></pattern>
<pattern id="p-brick" width="160" height="88" patternUnits="userSpaceOnUse"><g fill="#1e0d04"><rect x="1.5" y="1.5" width="77" height="19" rx="2" opacity=".06"/><rect x="81.5" y="1.5" width="77" height="19" rx="2" opacity="0"/><rect x="-38.5" y="23.5" width="77" height="19" rx="2" opacity=".1"/><rect x="41.5" y="23.5" width="77" height="19" rx="2" opacity=".02"/><rect x="121.5" y="23.5" width="77" height="19" rx="2" opacity=".1"/><rect x="1.5" y="45.5" width="77" height="19" rx="2" opacity=".03"/><rect x="81.5" y="45.5" width="77" height="19" rx="2" opacity=".12"/><rect x="-38.5" y="67.5" width="77" height="19" rx="2" opacity=".0"/><rect x="41.5" y="67.5" width="77" height="19" rx="2" opacity=".08"/><rect x="121.5" y="67.5" width="77" height="19" rx="2" opacity=".0"/></g><path d="M0 22h160M0 44h160M0 66h160M0 88h160M80 0v22M40 22v22M120 22v22M0 44v22M80 44v22M40 66v22M120 66v22M160 0v22M160 44v22" stroke="#2a1a10" stroke-opacity=".28" stroke-width="2.4"/><path d="M3 3h74M83 3h74M43 25h74M3 47h74M83 47h74M43 69h74" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="#1e0d04" opacity=".16"><circle cx="20" cy="12" r="1.2"/><circle cx="104" cy="35" r="1"/><circle cx="60" cy="56" r="1.4"/><circle cx="140" cy="78" r="1"/></g></pattern>
<pattern id="p-stone" width="150" height="90" patternUnits="userSpaceOnUse"><path d="M0 44q38-5 76 0t74-2M48 0q-3 22 0 44M110 44q4 22 0 46M18 44q-2 22 2 46" stroke="#1e0d04" stroke-opacity=".2" stroke-width="2.2" fill="none"/><path d="M2 3q36-3 44 0M52 3q30-2 96 0M4 47q8-2 12 0M22 47q40-3 86 0M114 47q20-1 34 0" stroke="#fff" stroke-opacity=".12" stroke-width="1.2" fill="none"/><g fill="#1e0d04"><ellipse cx="24" cy="18" rx="12" ry="7" opacity=".05"/><ellipse cx="90" cy="64" rx="18" ry="9" opacity=".06"/><circle cx="130" cy="20" r="1.6" opacity=".14"/><circle cx="64" cy="70" r="1.2" opacity=".14"/></g></pattern>
<clipPath id="cpScene"><rect width="1000" height="625"/></clipPath>
`;
  },
  plasterURL() { // 低頻的灰泥斑駁（無縫，只產生一次）
    if (this._pl) return this._pl;
    try {
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
      const x = c.getContext('2d'), d = x.createImageData(N, N), T = Math.PI * 2 / N;
      const W = [[1, 2, 0.9, 1], [3, 1, 2.1, 0.7], [2, 5, 4.2, 0.5], [6, 3, 1.3, 0.35], [9, 7, 5.5, 0.22], [13, 4, 0.4, 0.15]];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        let v = 0; for (const [a, b, p, w] of W) v += Math.sin((a * i + b * j) * T + p) * w + Math.sin((b * i - a * j) * T + p * 1.7) * w * 0.6;
        v /= 3.2; const k = (j * N + i) * 4, wv = v > 0 ? 255 : 30;
        d.data[k] = wv; d.data[k + 1] = v > 0 ? 248 : 16; d.data[k + 2] = v > 0 ? 230 : 6; d.data[k + 3] = Math.min(26, Math.floor(Math.abs(v) * 22));
      }
      x.putImageData(d, 0, 0); this._pl = c.toDataURL();
    } catch (e) { this._pl = ''; }
    return this._pl;
  },
  noiseURL() { // 細細的紙紋＋低頻的灰泥斑駁（同一張無縫貼圖，只產生一次）
    if (this._nz) return this._nz;
    try {
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
      const x = c.getContext('2d'), d = x.createImageData(N, N), T = Math.PI * 2 / N;
      const W = [[1, 2, 0.9, 1], [3, 1, 2.1, 0.7], [2, 5, 4.2, 0.5], [6, 3, 1.3, 0.35], [9, 7, 5.5, 0.22], [13, 4, 0.4, 0.15]];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        let v = 0; for (const [a, b, p, w] of W) v += Math.sin((a * i + b * j) * T + p) * w + Math.sin((b * i - a * j) * T + p * 1.7) * w * 0.6;
        v = v / 3.2 * 0.5 + (Math.random() - 0.5) * 0.9;
        const k = (j * N + i) * 4, up = v > 0;
        d.data[k] = up ? 255 : 30; d.data[k + 1] = up ? 248 : 16; d.data[k + 2] = up ? 232 : 6; d.data[k + 3] = Math.min(34, Math.floor(Math.abs(v) * 26));
      }
      x.putImageData(d, 0, 0); this._nz = c.toDataURL();
    } catch (e) { this._nz = ''; }
    return this._nz;
  },

  // 主光源方向（每個房間一個固定的光源；轉向時光從左、右、正面或背後來）
  // L＝光從左邊來、R＝右邊、B＝面對光源（窗戶就在這面牆）、F＝光在背後／特寫
  KEYS: { r1: 'e', r2: 'n', r3: 'n', r4: 'n', r5: 'w', r6: 'e', r7: 'n', r8: 'n', r9: 'n' },
  key: 'F',
  setKey(R, v) {
    const kw = R && this.KEYS[R.id], W = R && R.walls;
    if (!kw || !W || !W.includes(v)) { this.key = 'F'; return; }
    const n = W.length, d = (W.indexOf(kw) - W.indexOf(v) + n) % n;
    this.key = d === 0 ? 'B' : d === n - 1 ? 'L' : d === 1 ? 'R' : 'F';
  },
  // ---------- 材質後處理 ----------
  // 畫好的場景放進畫面後，把每個有輪廓線的色塊加上「受光」漸層（光從哪邊來就亮哪邊），
  // 木頭色的大色塊再疊一層木紋。漸層／木紋都是事先定義好的（defs），每個只多一個不吃效能的平面圖層，不用濾鏡。
  _hsl(h) {
    if (!h || h[0] !== '#' || h.length !== 7) return null;
    const [r, g, b] = hex2rgb(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1)); let H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; if (H < 0) H += 360;
    return [H, s, l];
  },
  enrich(root, key) {
    if (!root || root.dataset && root.dataset.fine === '0') return;
    const fm = { L: 'fmL', R: 'fmR' }[key || this.key] || 'fm';
    const els = root.querySelectorAll('rect,path,circle,ellipse,polygon');
    const NS = 'http://www.w3.org/2000/svg', GEO = ['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'points', 'transform', 'fill-rule'];
    const add = [];
    for (let i = 0; i < els.length; i++) {
      const el = els[i], st = el.getAttribute('stroke');
      if (st !== '#4a3222') continue;
      const f = el.getAttribute('fill');
      if (!f || f[0] !== '#' || f.length !== 7) continue;
      const op = el.getAttribute('opacity'), fo = el.getAttribute('fill-opacity');
      if ((op && +op < 0.9) || (fo && +fo < 0.9)) continue;
      let w, h;
      const tg = el.tagName;
      if (tg === 'rect') { w = +el.getAttribute('width'); h = +el.getAttribute('height'); }
      else if (tg === 'circle') { w = h = 2 * +el.getAttribute('r'); }
      else if (tg === 'ellipse') { w = 2 * +el.getAttribute('rx'); h = 2 * +el.getAttribute('ry'); }
      else { let b; try { b = el.getBBox(); } catch (e) { continue; } w = b.width; h = b.height; }
      if (!(w * h > 260) || w < 7 || h < 7) continue;
      const nx = el.nextElementSibling;
      const sameGeo = nx && nx.getAttribute('fill') && nx.getAttribute('fill').startsWith('url(') && (tg === 'path' ? nx.getAttribute('d') === el.getAttribute('d') : nx.getAttribute('x') === el.getAttribute('x') && nx.getAttribute('y') === el.getAttribute('y') && nx.getAttribute('cx') === el.getAttribute('cx') && nx.getAttribute('width') === el.getAttribute('width'));
      const hs = this._hsl(f);
      const wood = hs && hs[0] >= 12 && hs[0] <= 42 && hs[1] > 0.22 && hs[1] <= 0.6 && hs[2] > 0.12 && hs[2] < 0.7 && w * h > 1400 && w * h < 120000;
      const fills = [];
      if (wood) fills.push(h > w * 1.6 ? 'p-grainV' : 'p-grainH');
      if (!sameGeo) fills.push(fm);
      if (!fills.length) continue;
      add.push([el, fills]);
    }
    for (const [el, fills] of add) {
      let ref = el;
      for (const f of fills) {
        const c = document.createElementNS(NS, el.tagName);
        for (const a of GEO) { const v = el.getAttribute(a); if (v !== null) c.setAttribute(a, v); }
        c.setAttribute('fill', `url(#${f})`); c.setAttribute('pointer-events', 'none');
        ref.after(c); ref = c;
      }
    }
  },
  // 天花板線板：多層線腳＋一排小齒飾
  crown(c, trim) {
    const K2 = shade(c, -0.45), tD = shade(trim, -0.18), tDD = shade(trim, -0.34);
    let dent = ''; for (let x = 3; x < 1000; x += 13) dent += `M${x} 24h7v6h-7z`;
    return `<rect width="1000" height="40" fill="${trim}"/><rect width="1000" height="7" fill="${tDD}"/><rect y="7" width="1000" height="12" fill="url(#cove)"/><rect y="18.5" width="1000" height="2.2" fill="#fff" opacity=".75"/><path d="M0 22.5h1000" stroke="${tD}" stroke-width="1"/><path d="${dent}" fill="${tD}"/><path d="M0 30.5h1000" stroke="${tDD}" stroke-width=".8" opacity=".7"/><rect y="31" width="1000" height="3" fill="#fff" opacity=".45"/><rect y="34" width="1000" height="5" fill="${shade(trim, -0.1)}"/><path d="M0 39.2h1000" stroke="${K2}" stroke-opacity=".55" stroke-width="1"/><rect y="40" width="1000" height="34" fill="url(#aoDn)" opacity=".5"/>`;
  },
  // ---------- 牆面與地板 ----------
  wall(o) {
    const c = o.c || '#f3e3c3', trim = o.trim || '#f8efe0', fy = o.fy || 488, K2 = shade(c, -0.45);
    const tD = shade(trim, -0.18), tDD = shade(trim, -0.34);
    let s = `<rect width="1000" height="${fy}" fill="${c}"/>`;
    if (o.pat) s += `<rect width="1000" height="${fy}" fill="url(#p-${o.pat})"/>`;
    s += `<rect width="1000" height="${fy}" fill="url(#p-noise)"/><rect width="1000" height="${fy}" fill="url(#wshade)"/>`;
    s += this.crown(c, trim);
    if (['flower', 'stripe', 'dots', 'diamond', 'star'].includes(o.pat) && o.frieze !== false) s += `<rect y="40" width="1000" height="15" fill="${shade(c, -0.14)}"/><rect y="40" width="1000" height="15" fill="url(#p-frieze)"/><path d="M0 55.6h1000" stroke="#fff" stroke-opacity=".3" stroke-width="1"/><path d="M0 56.8h1000" stroke="#1e0d04" stroke-opacity=".2" stroke-width="1"/>`;
    if (o.wain) {
      const wy = o.wy || 360, wc = o.wain, ph = fy - wy - 50, wD = shade(wc, -0.16), wL = shade(wc, 0.08), wh = this._hsl(wc), woody = wh && wh[2] < 0.55;
      s += `<rect y="${wy}" width="1000" height="${fy - wy}" fill="${wc}"/>${woody ? `<rect y="${wy}" width="1000" height="${fy - wy}" fill="url(#p-grainH)"/>` : ''}<rect y="${wy}" width="1000" height="${fy - wy}" fill="url(#p-noise)"/>`;
      let hl = '', dk = '';
      for (let x = 18; x < 1000; x += 128) {
        s += `<rect x="${x}" y="${wy + 22}" width="104" height="${ph}" rx="3" fill="${wD}"/><rect x="${x + 5}" y="${wy + 27}" width="94" height="${ph - 10}" rx="2" fill="${wL}"/>${woody ? `<rect x="${x + 5}" y="${wy + 27}" width="94" height="${ph - 10}" rx="2" fill="url(#p-grainV)"/>` : ''}<rect x="${x + 14}" y="${wy + 36}" width="76" height="${Math.max(4, ph - 28)}" rx="2" fill="none" stroke="#1e0d04" stroke-opacity=".13" stroke-width="1"/>`;
        hl += `M${x + 5} ${wy + 17 + ph}V${wy + 27}H${x + 99}M${x + 15} ${wy + 37 + Math.max(4, ph - 28)}H${x + 90}V${wy + 37}`;
        dk += `M${x + 99} ${wy + 27}V${wy + 17 + ph}H${x + 5}M${x} ${wy + 22}h104`;
      }
      s += `<path d="${hl}" stroke="#fff" stroke-opacity=".34" stroke-width="1.3" fill="none"/><path d="${dk}" stroke="#1e0d04" stroke-opacity=".24" stroke-width="1.3" fill="none"/>`;
      // 腰線（chair rail）
      s += `<rect y="${wy}" width="1000" height="22" fill="url(#aoDn)" opacity=".5"/><rect y="${wy - 30}" width="1000" height="20" fill="url(#aoUp)" opacity=".16"/><rect y="${wy - 10}" width="1000" height="16" fill="${trim}"/><rect y="${wy - 10}" width="1000" height="16" fill="url(#p-grainH)" opacity=".5"/><rect y="${wy - 9}" width="1000" height="3" fill="#fff" opacity=".6"/><path d="M0 ${wy - 3.5}h1000" stroke="${tD}" stroke-width="1"/><path d="M0 ${wy - 2.2}h1000" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/><rect y="${wy + 2}" width="1000" height="4" fill="${shade(trim, -0.28)}"/><path d="M0 ${wy - 10.4}h1000" stroke="#1e0d04" stroke-opacity=".3" stroke-width="1"/>`;
    }
    // 踢腳板
    s += `<rect y="${fy - 32}" width="1000" height="8" fill="url(#aoUp)" opacity=".3"/><rect y="${fy - 24}" width="1000" height="26" fill="${shade(trim, -0.1)}"/><rect y="${fy - 24}" width="1000" height="26" fill="url(#p-grainH)" opacity=".6"/><rect y="${fy - 24}" width="1000" height="3" fill="#fff" opacity=".5"/><path d="M0 ${fy - 19.5}h1000" stroke="${tDD}" stroke-opacity=".5" stroke-width=".8"/><path d="M0 ${fy - 18.6}h1000" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/><rect y="${fy - 6}" width="1000" height="8" fill="${shade(trim, -0.28)}"/><rect y="${fy - 6}" width="1000" height="1.6" fill="#fff" opacity=".22"/><path d="M0 ${fy - 24}h1000" stroke="${shade(trim, -0.42)}" stroke-width="1.2"/>`;
    s += this.floor(o.floor || 'wood', o.fc || ['#c98d5a', '#b97c4b'], fy);
    // 左右兩側的牆（透視），讓房間有深度
    const side = (L) => {
      const X = L ? 0 : 1000, d = L ? 1 : -1, w = 44, b = fy + 70;
      const P = `M${X} 0L${X + d * w} 40V${fy}L${X} ${b}z`;
      let q = `<path d="${P}" fill="${shade(c, -0.22)}"/>` + (o.pat ? `<path d="${P}" fill="url(#p-${o.pat})" opacity=".5"/>` : '');
      if (o.wain) { const wy = o.wy || 360; q += `<path d="M${X} ${wy + (b - fy) * (wy / fy)}L${X + d * w} ${wy}V${fy}L${X} ${b}z" fill="${shade(o.wain, -0.25)}"/><path d="M${X} ${wy - 10 + (b - fy) * (wy / fy)}L${X + d * w} ${wy - 10}" stroke="${shade(trim, -0.2)}" stroke-width="7"/>`; }
      q += `<path d="M${X} 0L${X + d * w} 40" stroke="${shade(trim, -0.3)}" stroke-width="10"/><path d="M${X} 2L${X + d * w} 41" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/><path d="M${X} ${b}L${X + d * w} ${fy}" stroke="${shade(trim, -0.3)}" stroke-width="12"/><path d="M${X + d * w} 40V${fy}" stroke="#1e0d04" stroke-opacity=".4" stroke-width="1.4"/><path d="${P}" fill="#1e0d04" opacity="${(this.key === 'L') === L ? 0.1 : 0.24}"/>`;
      return q;
    };
    s += side(true) + side(false);
    s += `<rect width="1000" height="625" fill="url(#corners)"/><!--DECO-->`;
    return s;
  },
  floor(kind, fc, fy = 488) {
    let s = `<rect y="${fy}" width="1000" height="${625 - fy}" fill="${fc[0]}"/>`;
    const vx = 500, Y = [fy, fy + 24, fy + 54, fy + 92, 625 + 20];
    const px = (x, y) => +(vx + (x - vx) * (1 + (y - fy) * 0.0062)).toFixed(1);
    const B = 645;
    if (kind === 'wood') {
      let seam = '', seamL = '', gd = '', gl = '', jt = '', nails = '';
      for (let x = -700, k = 0; x <= 1700; x += 96, k++) {
        const t = (hash(k) - 0.5) * 0.14;
        s += `<path d="M${x} ${fy}L${x + 96} ${fy}L${px(x + 96, B)} ${B}L${px(x, B)} ${B}z" fill="${shade(fc[0], t)}"/>`;
        seam += `M${x} ${fy}L${px(x, 625)} 625`; seamL += `M${x + 1.5} ${fy}L${px(x + 1.5, 625) + 1.5} 625`;
        [0.2, 0.43, 0.61, 0.83].forEach((f, i) => { const xx = x + 96 * f + (hash(k * 5 + i) - 0.5) * 8; const seg = `M${xx.toFixed(1)} ${fy}L${px(xx + (hash(k + i) - 0.5) * 3, 625)} 625`; if (i % 2) gl += seg; else gd += seg; });
        [1, 2, 3].forEach(r => { if (hash(k * 3 + r) < 0.55) return; const y = Y[r] + (hash(k + r * 7) - 0.5) * 8, a = px(x, y), b = px(x + 96, y); jt += `M${a} ${y.toFixed(1)}L${b} ${y.toFixed(1)}`; nails += `M${(a + 5).toFixed(1)} ${(y + 3).toFixed(1)}h1.6M${(b - 7).toFixed(1)} ${(y + 3).toFixed(1)}h1.6`; });
      }
      s += `<path d="${gd}" stroke="#2a1405" stroke-opacity=".12" stroke-width=".8" fill="none"/><path d="${gl}" stroke="#fff" stroke-opacity=".06" stroke-width="1.2" fill="none"/>`;
      s += `<path d="${seam}" stroke="${shade(fc[0], -0.38)}" stroke-width="1.5" opacity=".8"/><path d="${seamL}" stroke="#fff" stroke-width=".8" opacity=".14"/><path d="${jt}" stroke="${shade(fc[0], -0.35)}" stroke-width="1.3" opacity=".75"/><path d="${nails}" stroke="#2a1405" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (kind === 'check' || kind === 'tile') {
      let hi = '', gr = '', gl = '';
      for (let r = 0; r < 4; r++) for (let x = -700, k = 0; x <= 1700; x += 80, k++) {
        const y0 = Y[r], y1 = Y[r + 1], c0 = (k + r) % 2 ? fc[1] : fc[0], v = (hash(k * 13 + r * 3) - 0.5) * 0.06;
        const a = px(x, y0), b = px(x + 80, y0), cc = px(x + 80, y1), dd = px(x, y1);
        if ((k + r) % 2 || kind === 'tile' || Math.abs(v) > 0.015) s += `<path d="M${a} ${y0}L${b} ${y0}L${cc} ${y1}L${dd} ${y1}z" fill="${shade(c0, v)}"/>`;
        hi += `M${a + 2} ${y0 + 1.2}L${b - 2} ${y0 + 1.2}`;
        gr += `M${a} ${y0}L${dd} ${y1}`;
        const gx = a + (b - a) * 0.12, gy = y0 + (y1 - y0) * 0.18; gl += `M${gx.toFixed(1)} ${gy.toFixed(1)}l${((b - a) * 0.3).toFixed(1)} 0l-6 ${((y1 - y0) * 0.16).toFixed(1)}l${(-(b - a) * 0.3).toFixed(1)} 0z`;
      }
      Y.slice(1, 4).forEach(y => gr += `M-700 ${y}H1700`);
      s += `<path d="${gl}" fill="#fff" opacity=".07"/><path d="${hi}" stroke="#fff" stroke-opacity=".28" stroke-width=".9" fill="none"/><path d="${gr}" stroke="${shade(fc[0], -0.3)}" stroke-opacity="${kind === 'tile' ? 0.7 : 0.28}" stroke-width="${kind === 'tile' ? 1.6 : 1}" fill="none"/>`;
    } else if (kind === 'carpet') {
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-knit)"/>`;
    } else if (kind === 'stone') {
      let jt = '', hi = '';
      for (let r = 0; r < 4; r++) {
        const y0 = Y[r], y1 = Y[r + 1];
        for (let x = -700 + hash(r * 9) * 60, k = 0; x <= 1700; k++) {
          const w = 70 + hash(r * 31 + k) * 90, v = (hash(r * 17 + k * 3) - 0.5) * 0.14;
          const a = px(x, y0), b = px(x + w, y0), cc = px(x + w, y1), dd = px(x, y1);
          s += `<path d="M${a} ${y0}L${b} ${y0}L${cc} ${y1}L${dd} ${y1}z" fill="${shade(fc[k % 2], v)}"/>`;
          jt += `M${a} ${y0}L${dd} ${y1}`; hi += `M${a + 3} ${y0 + 1.5}L${b - 3} ${y0 + 1.5}`;
          x += w;
        }
        jt += `M-700 ${y0}H1700`;
      }
      s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-stone)" opacity=".7"/><path d="${hi}" stroke="#fff" stroke-opacity=".14" stroke-width="1.2" fill="none"/><path d="${jt}" stroke="#1e0d04" stroke-opacity=".4" stroke-width="2.2" fill="none"/>`;
    }
    s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#p-noise)"/>`;
    s += `<ellipse cx="${this.key === 'L' ? 400 : this.key === 'R' ? 600 : 500}" cy="${fy + 70}" rx="420" ry="70" fill="url(#gloss)"/>`;
    s += `<rect y="${fy}" width="1000" height="${625 - fy}" fill="url(#fshade)"/><rect y="${fy}" width="1000" height="16" fill="url(#aoDn)" opacity=".45"/>`;
    return s;
  },
  light(extra = '') { this.motes(120, 140, 760, 380, 6, 7); const k = this.key || 'F'; return `<rect width="1000" height="625" fill="url(#${k === 'F' ? 'lt' : 'key' + k})"/>${extra}<rect width="1000" height="625" fill="url(#vig)"/>`; },
  pool(x, y, rx, ry = rx * 0.35, op = 0.5) { return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#lampG)" opacity="${op}" pointer-events="none"/>`; },
  pendant(x, len = 70, c = '#e9a85a', floorY = 560) {
    let chain = ''; for (let yy = 4; yy < len - 4; yy += 9) chain += `<ellipse cx="${x}" cy="${yy + 4}" rx="2.2" ry="4.2" fill="none" stroke="#5a3a24" stroke-width="1.4"/>`;
    this.fx(`<g class="pend" style="${this.ad(7)}">${chain}<rect x="${x - 6}" y="${len - 6}" width="12" height="8" rx="2" fill="url(#brass)" ${SW2}/><path d="M${x - 34} ${len + 30}q0-30 34-30t34 30z" fill="${c}" ${SW}/><path d="M${x - 34} ${len + 30}q0-30 34-30t34 30z" fill="url(#cyl)" opacity=".6"/><path d="M${x - 22} ${len + 28}q2-20 22-24M${x} ${len + 28}v-26M${x + 22} ${len + 28}q-2-20-22-24" stroke="${shade(c, -0.3)}" stroke-width=".9" fill="none" opacity=".6"/><path d="M${x - 26} ${len + 22}q6-18 20-22" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M${x - 35} ${len + 30}h70" stroke="url(#brass)" stroke-width="3"/><ellipse cx="${x}" cy="${len + 31}" rx="33" ry="6" fill="#fff4c0" ${SW2}/><ellipse cx="${x}" cy="${len + 31}" rx="12" ry="3" fill="#fff"/><circle class="flick" cx="${x}" cy="${len + 40}" r="70" fill="url(#lampG)" style="${this.ad(3.3)}"/></g>`);
    return `<path d="M${x - 30} ${len + 34}L${x - 150} ${floorY}H${x + 150}L${x + 30} ${len + 34}z" fill="url(#shaftG)" opacity=".12" pointer-events="none"/>` + this.pool(x, floorY + 10, 170, 34, 0.55);
  },
  // 牆上的掛鐘（秒針會走）
  wallClock(x, y, r = 34, c = '#a8703f') {
    let o = `<circle cx="${x + 3}" cy="${y + 5}" r="${r + 7}" fill="url(#shG)" opacity=".55"/><circle cx="${x}" cy="${y}" r="${r + 6}" fill="${c}" ${SW}/><circle cx="${x}" cy="${y}" r="${r + 6}" fill="url(#p-grainH)"/><circle cx="${x}" cy="${y}" r="${r + 6}" fill="url(#bevel)"/><circle cx="${x}" cy="${y}" r="${r + 1.6}" fill="none" stroke="url(#brass)" stroke-width="2.6"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fffaf0" ${SW2}/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#p-noise)"/>`;
    let tk = ''; for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i * Math.PI / 30; tk += `M${(x + Math.sin(a) * r * 0.86).toFixed(1)} ${(y - Math.cos(a) * r * 0.86).toFixed(1)}L${(x + Math.sin(a) * r * 0.91).toFixed(1)} ${(y - Math.cos(a) * r * 0.91).toFixed(1)}`; }
    o += `<path d="${tk}" stroke="#4a3222" stroke-width=".6"/>`;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; o += `<path d="M${(x + Math.sin(a) * r * 0.74).toFixed(1)} ${(y - Math.cos(a) * r * 0.74).toFixed(1)}L${(x + Math.sin(a) * r * 0.9).toFixed(1)} ${(y - Math.cos(a) * r * 0.9).toFixed(1)}" stroke="#4a3222" stroke-width="${i % 3 ? 1.3 : 2.4}"/>`; }
    o += `<path d="M${x} ${y}l${r * 0.3} ${-r * 0.35}" stroke="#2a1a10" stroke-width="${Math.max(1.6, r * 0.07)}" stroke-linecap="round"/><path d="M${x} ${y}l${-r * 0.1} ${-r * 0.62}" stroke="#2a1a10" stroke-width="${Math.max(1.2, r * 0.045)}" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="${Math.max(1.6, r * 0.07)}" fill="url(#brass)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#glassR)"/>`;
    this.fx(`<g class="tick" style="${this.ad(60)}"><g transform="translate(${x} ${y})"><circle r="${r * 0.8}" fill="none"/><path d="M0 4V${-r * 0.78}" stroke="#c4502c" stroke-width="1.2"/><circle r="2" fill="#c4502c"/></g></g>`);
    return o;
  },
  closeBg(c, pat, extra = '') { // 特寫背景：桌面般的質感＋聚光
    return `<rect width="1000" height="625" fill="${shade(c, -0.12)}"/>${pat ? `<rect width="1000" height="625" fill="url(#p-${pat})" opacity=".8"/>` : ''}<rect width="1000" height="625" fill="url(#p-noise)"/><ellipse cx="500" cy="300" rx="560" ry="380" fill="url(#spot)"/>${extra}<rect width="1000" height="625" fill="url(#keyL)" opacity=".7"/><rect width="1000" height="625" fill="url(#corners)" opacity=".8"/>`;
  },
  // ---------- 基本形狀 ----------
  rr(x, y, w, h, r, fill, o = '') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${SW} ${o}/>`; },
  bev(x, y, w, h, r = 4, k = 'bevel', op = 1) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${k})" opacity="${op}" pointer-events="none"/>`; },
  box(x, y, w, h, fill, top = 16, o = '') { // 有頂面的立體櫃子
    return `<path d="M${x} ${y}L${x + 12} ${y - top}H${x + w - 12}L${x + w} ${y}z" fill="${shade(fill, 0.2)}" ${SW}/><path d="M${x} ${y}L${x + 12} ${y - top}H${x + w - 12}L${x + w} ${y}z" fill="url(#p-grainH)"/><path d="M${x + 14} ${y - top + 2.5}H${x + w - 14}" stroke="#fff" stroke-opacity=".35" stroke-width="1.4"/>` + this.rr(x, y, w, h, 4, fill, o) + `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="3" fill="url(#p-grainH)" pointer-events="none"/><rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h - 3}" rx="3" fill="url(#cyl)" opacity=".55" pointer-events="none"/><path d="M${x + 3} ${y + 2.5}H${x + w - 3}" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>` + this.sh(x + w / 2, y + h + 2, w * 0.56, 9, 0.2);
  },
  // 柔和的接觸陰影：外圈大而淡、貼地處小而深；會稍微往背光的方向偏
  sh(cx, cy, rx, ry, o = 0.24) {
    const k = this.key, dx = k === 'L' ? rx * 0.14 : k === 'R' ? -rx * 0.14 : 0;
    return `<ellipse cx="${(cx + dx).toFixed(1)}" cy="${(cy + ry * 0.15).toFixed(1)}" rx="${(rx * 1.22).toFixed(1)}" ry="${(ry * 1.5).toFixed(1)}" fill="url(#shG)" opacity="${Math.min(1, o * 1.4).toFixed(2)}"/><ellipse cx="${cx}" cy="${cy}" rx="${(rx * 0.9).toFixed(1)}" ry="${(ry * 0.72).toFixed(1)}" fill="url(#shG)" opacity="${Math.min(1, o * 2.3).toFixed(2)}"/>`;
  },
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
    const fr = o.frame || '#f8efe0', frD = shade(fr, -0.3);
    let s = `<rect x="${x - 22}" y="${y - 22}" width="${w + 44}" height="${h + 22}" rx="4" fill="${fr}" ${SW}/><rect x="${x - 22}" y="${y - 22}" width="${w + 44}" height="${h + 22}" rx="4" fill="url(#p-grainV)" opacity=".6"/><rect x="${x - 22}" y="${y - 22}" width="${w + 44}" height="${h + 22}" rx="4" fill="url(#bevel)"/>`;
    s += `<path d="M${x - 18} ${y + h}V${y - 18}H${x + w + 18}V${y + h}" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" fill="none"/><path d="M${x - 15} ${y + h}V${y - 15}H${x + w + 15}V${y + h}" stroke="${frD}" stroke-opacity=".55" stroke-width=".8" fill="none"/>`;
    s += [x - 22, x + w + 4].map(px => `<rect x="${px}" y="${y - 22}" width="18" height="18" rx="2" fill="${shade(fr, -0.05)}" stroke="${frD}" stroke-width=".9"/><circle cx="${px + 9}" cy="${y - 13}" r="5" fill="none" stroke="${frD}" stroke-width=".8"/><circle cx="${px + 9}" cy="${y - 13}" r="1.8" fill="${frD}" opacity=".6"/>`).join('');
    s += `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 10}" rx="2" fill="${shade(fr, -0.14)}" ${SW2}/><rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="16" fill="url(#aoDn)" opacity=".4"/>`;
    if (o.open) {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff4d6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sunG)" opacity=".9"/>`;
      s += `<path d="M${x + 8} ${y + h}L${x - 30} ${y + h + 140}H${x + w + 40}L${x + w - 8} ${y + h}z" fill="#fff4c8" opacity=".35"/>`;
      s += `<path d="M${x} ${y}L${x - w * 0.42} ${y + 24}V${y + h + 18}L${x} ${y + h}z" fill="${c}" ${SW}/><path d="M${x} ${y}L${x - w * 0.42} ${y + 24}V${y + h + 18}L${x} ${y + h}z" fill="url(#p-grainV)"/><path d="M${x} ${y}L${x - w * 0.42} ${y + 24}V${y + h + 18}L${x} ${y + h}z" fill="url(#cyl)" opacity=".7"/><path d="M${x - w * 0.08} ${y + h * 0.12}L${x - w * 0.34} ${y + h * 0.15}V${y + h * 0.45}L${x - w * 0.08} ${y + h * 0.44}zM${x - w * 0.08} ${y + h * 0.54}L${x - w * 0.34} ${y + h * 0.56}V${y + h * 0.92}L${x - w * 0.08} ${y + h * 0.92}z" fill="none" stroke="#1e0d04" stroke-opacity=".3" stroke-width="1.2"/>`;
      return s + (o.glowText ? this.txt(x + w / 2, y + h / 2, o.glowText, 22, '#c08a3a') : '');
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-grainV)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-noise)"/>`;
    const pw = (w - 42) / 2, cD = shade(c, -0.2), cL = shade(c, 0.1);
    const panel = (px, py, pw2, ph) => `<rect x="${px}" y="${py}" width="${pw2}" height="${ph}" rx="2" fill="${cD}"/><path d="M${px} ${py}h${pw2}l-6 6h${-pw2 + 12}v${ph - 12}l-6 6z" fill="#1e0d04" opacity=".18"/><path d="M${px + pw2} ${py + ph}h${-pw2}l6-6h${pw2 - 12}v${-ph + 12}l6-6z" fill="#fff" opacity=".16"/><rect x="${px + 6}" y="${py + 6}" width="${pw2 - 12}" height="${ph - 12}" rx="2" fill="${cL}"/><rect x="${px + 6}" y="${py + 6}" width="${pw2 - 12}" height="${ph - 12}" rx="2" fill="url(#p-grainV)"/><rect x="${px + 12}" y="${py + 12}" width="${Math.max(2, pw2 - 24)}" height="${Math.max(2, ph - 24)}" rx="2" fill="none" stroke="#1e0d04" stroke-opacity=".14" stroke-width=".9"/><path d="M${px + 6} ${py + ph - 6}V${py + 6}H${px + pw2 - 6}" stroke="#fff" stroke-opacity=".4" stroke-width="1.2" fill="none"/><rect x="${px}" y="${py}" width="${pw2}" height="${ph}" rx="2" fill="none" ${SW2}/>`;
    if (o.win) s += `<rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h * 0.3 + 4}" rx="${(w - 32) / 2}" fill="${cD}"/><rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h * 0.3}" rx="${(w - 36) / 2}" fill="url(#sky)" ${SW2}/><path d="M${x + 18} ${y + 18 + h * 0.22}q${(w - 36) * 0.3} -${h * 0.06} ${(w - 36) * 0.55} -${h * 0.01}t${(w - 36) * 0.45} -${h * 0.02}V${y + 18 + h * 0.3}H${x + 18}z" fill="#9fcf8a" opacity=".8"/><rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h * 0.3}" rx="${(w - 36) / 2}" fill="url(#glassR)"/><path d="M${x + w / 2} ${y + 18}v${h * 0.3}M${x + 18} ${y + 18 + h * 0.17}h${w - 36}" stroke="${shade(c, 0.15)}" stroke-width="4"/><path d="M${x + w / 2} ${y + 18}v${h * 0.3}" ${SW2}/>`;
    else s += panel(x + 14, y + 18, pw, h * 0.36) + panel(x + 28 + pw, y + 18, pw, h * 0.36);
    s += panel(x + 14, y + h * 0.48, pw, h * 0.44) + panel(x + 28 + pw, y + h * 0.48, pw, h * 0.44);
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#cyl)" opacity=".45"/><path d="M${x + 2} ${y + 2}h${w - 4}" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>`;
    // 鉸鏈
    s += [0.12, 0.82].map(f => `<rect x="${x - 3}" y="${y + h * f}" width="8" height="24" rx="2" fill="url(#brass)" ${SW2}/><path d="M${x + 1} ${y + h * f + 3}v18" stroke="#7a4a14" stroke-width=".7"/>`).join('');
    const ky = y + h * 0.5;
    if (o.knob !== false) s += `<rect x="${x + w - 29}" y="${ky - 20}" width="18" height="42" rx="9" fill="url(#brass)" ${SW2}/><circle cx="${x + w - 18}" cy="${ky + 3}" r="11" fill="url(#shG)" opacity=".5"/><circle cx="${x + w - 20}" cy="${ky}" r="9.5" fill="url(#brass)" ${SW2}/><circle cx="${x + w - 20}" cy="${ky}" r="5.5" fill="none" stroke="#7a4a14" stroke-opacity=".5" stroke-width=".8"/><circle cx="${x + w - 23}" cy="${ky - 3}" r="2.6" fill="#fff" opacity=".8"/>`;
    else s += `<circle cx="${x + w - 20}" cy="${ky}" r="7" fill="#2a1a10"/><circle cx="${x + w - 20}" cy="${ky}" r="11" fill="none" stroke="url(#brass)" stroke-width="3"/><circle cx="${x + w - 20}" cy="${ky}" r="12.5" fill="none" stroke="#4a3222" stroke-width=".8"/>`;
    if (o.keyhole) s += `<path d="M${x + w - 30} ${ky + 16}q10-6 20 0v24q-10 4-20 0z" fill="url(#brass)" ${SW2}/><path d="M${x + w - 20} ${ky + 22}a4 4 0 1 1 0.1 0l3 12h-6z" fill="#2a1a10"/><circle cx="${x + w - 27}" cy="${ky + 20}" r="1" fill="#7a4a14"/><circle cx="${x + w - 13}" cy="${ky + 20}" r="1" fill="#7a4a14"/>`;
    return s + `<rect x="${x - 14}" y="${y + h - 4}" width="${w + 28}" height="6" rx="2" fill="${shade(fr, -0.3)}" ${SW2}/><rect x="${x - 6}" y="${y + h + 2}" width="${w + 12}" height="10" fill="url(#aoDn)" opacity=".6"/>`;
  },
  // 窗外的風景：遠山、近丘、一排樹、小籬笆
  view(x, y, w, h, seed = 1) {
    let s = `<circle cx="${x + w * 0.76}" cy="${y + h * 0.24}" r="${w * 0.16}" fill="#fffbe0" opacity=".45"/><circle cx="${x + w * 0.76}" cy="${y + h * 0.24}" r="${w * 0.075}" fill="#fff6c8"/>`;
    s += `<path d="M${x} ${y + h * 0.66}l${w * 0.18} -${h * 0.12}l${w * 0.14} ${h * 0.06}l${w * 0.2} -${h * 0.14}l${w * 0.22} ${h * 0.1}l${w * 0.26} -${h * 0.05}V${y + h}H${x}z" fill="#b8cfe0" opacity=".85"/>`;
    s += `<path d="M${x} ${y + h * 0.78}q${w * 0.25}-${h * 0.18} ${w * 0.5} -${h * 0.04}t${w * 0.5} -${h * 0.06}V${y + h}H${x}z" fill="#b6dc9a"/><path d="M${x} ${y + h * 0.86}q${w * 0.3}-${h * 0.2} ${w * 0.6} -${h * 0.02}t${w * 0.4} 0V${y + h}H${x}z" fill="#8cc47a"/>`;
    let fence = ''; for (let i = 0; i < 9; i++) fence += `M${(x + w * (0.08 + i * 0.11)).toFixed(1)} ${(y + h * 0.95).toFixed(1)}v-${(h * 0.07).toFixed(1)}`;
    s += `<path d="${fence}M${x} ${y + h * 0.915}h${w}" stroke="#fffaf0" stroke-width="1.4" opacity=".8"/>`;
    [[0.16, 0.8, 0.075], [0.25, 0.77, 0.06], [0.88, 0.8, 0.06]].forEach(([fx, fy, fr]) => {
      const cx = x + w * fx, cy = y + h * fy, r = w * fr;
      s += `<path d="M${cx} ${cy + r * 0.6}v${r * 0.9}" stroke="#7a5a3a" stroke-width="${Math.max(1.5, r * 0.22)}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#5f9e4a"/><circle cx="${cx - r * 0.45}" cy="${cy + r * 0.2}" r="${r * 0.6}" fill="#4f8a3e"/><circle cx="${cx + r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.55}" fill="#7ab86a"/><circle cx="${cx - r * 0.1}" cy="${cy - r * 0.45}" r="${r * 0.3}" fill="#9fd08a" opacity=".8"/>`;
    });
    return s;
  },
  win(x, y, w, h, o = {}) {
    const sky = o.sky || 'sky', fr = o.frame || '#fffaf0', frD = shade(fr, -0.3);
    let s = `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="4" fill="${fr}" ${SW}/><rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="4" fill="url(#p-grainV)" opacity=".5"/><rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="4" fill="url(#bevel)"/><rect x="${x - 7}" y="${y - 7}" width="${w + 14}" height="${h + 14}" rx="2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1"/><rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="2" fill="none" stroke="${frD}" stroke-opacity=".6" stroke-width=".9"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${sky})" ${SW2}/>`;
    if (o.scene) s += o.scene;
    else if (sky === 'sky') {
      s += this.view(x, y, w, h);
      s += this.fx(`<g class="cloud" style="${this.ad(30)}"><path d="M${x + w * 0.1} ${y + h * 0.36}h${w * 0.2}a8 8 0 0 0 0-14a12 12 0 0 0-20-4a9 9 0 0 0-${w * 0.12} 10z" fill="#fff" opacity=".92"/><path d="M${x + w * 0.1} ${y + h * 0.36}h${w * 0.2}" stroke="#c9dcea" stroke-width="2" opacity=".7"/></g>`);
    } else if (sky === 'skyNight') {
      for (let i = 0; i < 16; i++) { const cx = x + 8 + (i * 37) % (w - 16), cy = y + 8 + (i * 53) % (h - 16); s += `<circle cx="${cx}" cy="${cy}" r="${0.7 + (i % 3) * 0.5}" fill="#fff8d0"/>`; if (i % 4 === 0) this.twinkle(cx, cy, 2.4); }
      s += `<circle cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="${w * 0.15}" fill="#fff6d0" opacity=".12"/><circle cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="${w * 0.09}" fill="#fff6d0"/><circle cx="${x + w * 0.75}" cy="${y + h * 0.28}" r="${w * 0.08}" fill="url(#${sky})"/>`;
      s += `<path d="M${x} ${y + h * 0.84}q${w * 0.2}-${h * 0.1} ${w * 0.42} -${h * 0.02}t${w * 0.58} -${h * 0.05}V${y + h}H${x}z" fill="#1e2448"/><path d="M${x + w * 0.62} ${y + h}v-${h * 0.2}l${w * 0.06} -${h * 0.07}l${w * 0.06} ${h * 0.07}v${h * 0.2}z" fill="#141a38"/><rect x="${x + w * 0.66}" y="${y + h * 0.86}" width="${w * 0.03}" height="${h * 0.04}" fill="#f6d27a"/>`;
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glassR)"/><rect x="${x}" y="${y}" width="${w}" height="8" fill="url(#aoDn)" opacity=".5"/>`;
    s += `<path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${fr}" stroke-width="8"/><path d="M${x + w / 2 - 2.5} ${y}v${h}M${x} ${y + h / 2 - 2.5}h${w}" stroke="#fff" stroke-opacity=".6" stroke-width="1"/><path d="M${x + w / 2 + 3.5} ${y}v${h}M${x} ${y + h / 2 + 3.5}h${w}" stroke="${frD}" stroke-opacity=".7" stroke-width="1"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${SW2}/>`;
    s += `<rect x="${x - 20}" y="${y + h + 8}" width="${w + 40}" height="14" rx="2" fill="${fr}" ${SW}/><rect x="${x - 20}" y="${y + h + 8}" width="${w + 40}" height="14" rx="2" fill="url(#p-grainH)"/><path d="M${x - 18} ${y + h + 10.5}h${w + 36}" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><path d="M${x - 10} ${y + h + 22}l4 10h10l2-10M${x + w + 10} ${y + h + 22}l-4 10h-10l-2-10" fill="${shade(fr, -0.1)}" ${SW2}/><rect x="${x - 20}" y="${y + h + 22}" width="${w + 40}" height="12" fill="url(#aoDn)" opacity=".6"/>`;
    if (sky === 'sky' && o.shaft !== false) s += this.shaft(`${x} ${y + h}L${x + w} ${y + h}L${x + w * 1.6} ${y + h + 260}L${x + w * 0.3} ${y + h + 260}`, 0.22) + this.motes(x, y + h, w * 1.4, 240, 6, x);
    if (o.curtain) {
      const c = o.curtain, ad = this.ad(6), cD = shade(c, -0.28);
      const Lp = `M${x - 30} ${y - 26}h${w * 0.32 + 30}q-${w * 0.12} ${h * 0.5} -${w * 0.02} ${h + 30}h-${w * 0.32 - 10}z`;
      const Rp = `M${x + w + 30} ${y - 26}h-${w * 0.32 + 30}q${w * 0.12} ${h * 0.5} ${w * 0.02} ${h + 30}h${w * 0.32 - 10}z`;
      const fold = (P) => `<path d="${P}" fill="url(#foldG)"/><path d="${P}" fill="url(#p-weave)"/>`;
      const L = `<path d="${Lp}" fill="${c}" ${SW}/>${fold(Lp)}<path d="M${x - 10} ${y - 20}q8 ${h * 0.5} 4 ${h + 20}M${x + w * 0.1} ${y - 20}q6 ${h * 0.5} 0 ${h + 22}M${x - 20} ${y - 20}q4 ${h * 0.5} 0 ${h + 24}" stroke="${cD}" stroke-width="1.3" fill="none" opacity=".8"/><path d="M${x - 22} ${y - 20}q6 ${h * 0.5} 2 ${h + 24}M${x + w * 0.04} ${y - 20}q6 ${h * 0.5} 2 ${h + 22}" stroke="#fff" stroke-opacity=".28" stroke-width="3" fill="none"/><path d="M${x - 30} ${y + h + 4}h${w * 0.3 + 30}" stroke="${shade(c, 0.25)}" stroke-width="4" stroke-dasharray="2 3" opacity=".7"/>`;
      const R = `<path d="${Rp}" fill="${c}" ${SW}/>${fold(Rp)}<path d="M${x + w + 10} ${y - 20}q-8 ${h * 0.5} -4 ${h + 20}M${x + w * 0.9} ${y - 20}q-6 ${h * 0.5} 0 ${h + 22}M${x + w + 20} ${y - 20}q-4 ${h * 0.5} 0 ${h + 24}" stroke="${cD}" stroke-width="1.3" fill="none" opacity=".8"/><path d="M${x + w * 0.96} ${y - 20}q-6 ${h * 0.5} -2 ${h + 22}" stroke="#fff" stroke-opacity=".22" stroke-width="3" fill="none"/><path d="M${x + w * 0.7} ${y + h + 4}h${w * 0.3 + 30}" stroke="${shade(c, 0.25)}" stroke-width="4" stroke-dasharray="2 3" opacity=".7"/>`;
      let rings = ''; for (let i = 0; i < 6; i++) rings += `<circle cx="${(x - 24 + i * (w * 0.32 + 20) / 5).toFixed(1)}" cy="${y - 28}" r="4.5" fill="none" stroke="url(#brass)" stroke-width="2"/><circle cx="${(x + w + 24 - i * (w * 0.32 + 20) / 5).toFixed(1)}" cy="${y - 28}" r="4.5" fill="none" stroke="url(#brass)" stroke-width="2"/>`;
      this.fx(`<g class="sway" style="${ad}">${L}</g><g class="sway s2" style="${ad}">${R}</g><rect x="${x - 44}" y="${y - 33}" width="${w + 88}" height="9" rx="4.5" fill="#a87443" ${SW2}/><rect x="${x - 44}" y="${y - 33}" width="${w + 88}" height="9" rx="4.5" fill="url(#cyl)"/>${rings}<circle cx="${x - 48}" cy="${y - 28.5}" r="8" fill="url(#brass)" ${SW2}/><circle cx="${x - 50}" cy="${y - 31}" r="2.2" fill="#fff" opacity=".7"/><circle cx="${x + w + 48}" cy="${y - 28.5}" r="8" fill="url(#brass)" ${SW2}/><circle cx="${x + w + 46}" cy="${y - 31}" r="2.2" fill="#fff" opacity=".7"/>`);
    }
    return s;
  },
  frame(x, y, w, h, inner, o = {}) {
    const fc = o.fc || '#d9a548', fL = shade(fc, 0.4), fD = shade(fc, -0.4);
    let orn = ''; [[x - 14, y - 14], [x + w + 14, y - 14], [x - 14, y + h + 14], [x + w + 14, y + h + 14]].forEach(([cx, cy]) => { orn += `<circle cx="${cx + (cx < x ? 6 : -6)}" cy="${cy + (cy < y ? 6 : -6)}" r="3.6" fill="${fL}" stroke="${fD}" stroke-width=".8"/><circle cx="${cx + (cx < x ? 6 : -6)}" cy="${cy + (cy < y ? 6 : -6)}" r="1.3" fill="${fD}" opacity=".7"/>`; });
    let beads = ''; for (let i = 8; i < w + 20; i += 7) beads += `M${x - 10 + i} ${y - 11.5}h2.4M${x - 10 + i} ${y + h + 11.5}h2.4`;
    return `<rect x="${x - 15}" y="${y - 11}" width="${w + 32}" height="${h + 32}" rx="6" fill="#1e0d04" opacity=".1"/><rect x="${x - 13}" y="${y - 12}" width="${w + 28}" height="${h + 29}" rx="4" fill="#1e0d04" opacity=".14"/><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="3" fill="${fc}" ${SW}/><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="3" fill="url(#bevel)"/><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="3" fill="url(#varnish)"/><rect x="${x - 10.5}" y="${y - 10.5}" width="${w + 21}" height="${h + 21}" rx="2" fill="none" stroke="${fL}" stroke-width="1.2"/><path d="${beads}" stroke="${fD}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>${orn}<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="1" fill="${shade(fc, -0.28)}" ${SW2}/><path d="M${x - 6} ${y + h + 6}V${y - 6}H${x + w + 6}" stroke="${fD}" stroke-width="1" fill="none"/>` +
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${o.vw || 100} ${o.vh || 100}" preserveAspectRatio="${o.par || 'none'}">${inner}</svg><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#p-canvas)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#varnish)"/><rect x="${x}" y="${y}" width="${w}" height="10" fill="url(#aoDn)" opacity=".55"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#glass)" opacity=".6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${SW2}/>`;
  },
  book(x, y, w, h, c, o = {}) {
    const k = Math.floor(hash(x * 3.1 + h) * 4), cL = shade(c, 0.35), cD = shade(c, -0.3), gold = '#f0cf7a';
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}" ${SW2}/><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="1.5" fill="url(#cyl)" opacity=".8"/><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" fill="url(#p-weave)"/>`;
    const band = (yy, th) => `<rect x="${x + 1}" y="${yy}" width="${w - 2}" height="${th}" fill="${cD}" opacity=".7"/><path d="M${x + 2} ${yy + 0.6}h${w - 4}M${x + 2} ${yy + th - 0.6}h${w - 4}" stroke="${gold}" stroke-width=".7" opacity=".85"/>`;
    s += band(y + h * 0.1, 4.5) + band(y + h * 0.84, 4);
    if (k === 1 || k === 3) s += band(y + h * 0.2, 2.6);
    if (o.num === undefined) {
      if (k === 0 || k === 1) s += `<rect x="${x + w * 0.2}" y="${y + h * 0.32}" width="${w * 0.6}" height="${h * 0.22}" rx="1" fill="${k ? '#f8eccc' : cL}" opacity=".9"/><path d="M${x + w * 0.3} ${y + h * 0.38}h${w * 0.4}M${x + w * 0.34} ${y + h * 0.43}h${w * 0.32}M${x + w * 0.38} ${y + h * 0.48}h${w * 0.24}" stroke="${k ? '#7a4a2a' : cD}" stroke-width=".9" stroke-linecap="round" opacity=".75"/>`;
      else s += `<path d="M${x + w / 2} ${y + h * 0.36}v${h * 0.3}" stroke="${gold}" stroke-width="${Math.max(1, w * 0.08)}" stroke-dasharray="${(h * 0.04).toFixed(1)} ${(h * 0.03).toFixed(1)}" opacity=".75"/><circle cx="${x + w / 2}" cy="${y + h * 0.3}" r="${Math.min(2.4, w * 0.12)}" fill="${gold}" opacity=".8"/>`;
    }
    s += `<path d="M${x + 1.5} ${y + 1.2}h${w - 3}" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`;
    if (o.num !== undefined) s += `<circle cx="${x + w / 2}" cy="${y + h * 0.48}" r="${Math.min(w * 0.38, 15)}" fill="#fff3d0" ${SW2}/><circle cx="${x + w / 2}" cy="${y + h * 0.48}" r="${Math.min(w * 0.38, 15) - 2.5}" fill="none" stroke="${gold}" stroke-width="1"/>` + this.txt(x + w / 2, y + h * 0.48 + Math.min(w * 0.38, 15) * 0.42, o.num, Math.min(w * 0.55, 22), '#7a3d14', 'middle', 900);
    return s;
  },
  books(x, y, n, h, seed = 1) {
    const cols = ['#c9583c', '#3f7f8f', '#e0a43a', '#6f8f4a', '#8a5a9a', '#b9774a', '#d9776e', '#4f6aa8', '#7a3a2a', '#2f5a4a'];
    let s = '', xx = x;
    for (let i = 0; i < n; i++) { const w = 18 + ((i * 7 + seed * 3) % 4) * 5, hh = h - ((i * 11 + seed) % 4) * 9; s += this.book(xx, y + h - hh, w, hh, cols[(i * 3 + seed) % cols.length]); xx += w + 2; }
    return s;
  },
  shelf(x, y, w, c = '#a8703f') { return `<rect x="${x + 6}" y="${y + 12}" width="${w - 12}" height="14" fill="url(#aoDn)" opacity=".7"/><path d="M${x + 20} ${y + 12}q0 14 10 18h10q-8-6-6-18M${x + w - 20} ${y + 12}q0 14-10 18h-10q8-6 6-18" fill="${shade(c, -0.15)}" ${SW2}/><rect x="${x}" y="${y}" width="${w}" height="12" rx="2" fill="${c}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="12" rx="2" fill="url(#p-grainH)"/><rect x="${x}" y="${y}" width="${w}" height="12" rx="2" fill="url(#bevel)"/><path d="M${x + 2} ${y + 2}h${w - 4}" stroke="#fff" stroke-opacity=".4" stroke-width="1"/><path d="M${x + 2} ${y + 8.5}h${w - 4}" stroke="#1e0d04" stroke-opacity=".18" stroke-width=".8"/>`; },
  table(x, y, w, h, c = '#b07644', o = {}) {
    let s = this.sh(x + w / 2, y + h + 4, w * 0.58, 13, 0.28);
    const cD = shade(c, -0.15), leg = (lx) => { const t = y + 14, b = y + h; return `<path d="M${lx + 1} ${t}h10v${(h - 14) * 0.12}q3 4 0 8q-3 ${(h - 14) * 0.2} -1 ${(h - 14) * 0.5}l-1 ${(h - 14) * 0.3 - 10}q1 4-1 4h-6q-2 0-1-4l-1 ${-((h - 14) * 0.3 - 10)}q2 ${-(h - 14) * 0.3} -1 ${-(h - 14) * 0.5}q-3-4 0-8z" fill="${cD}" ${SW2}/><path d="M${lx + 3} ${t + 4}v${h - 22}" stroke="#fff" stroke-opacity=".22" stroke-width="2"/><path d="M${lx + 9} ${t + 4}v${h - 22}" stroke="#1e0d04" stroke-opacity=".2" stroke-width="2"/>`; };
    s += leg(x + 8) + leg(x + w - 20);
    s += `<path d="M${x} ${y}L${x + 12} ${y - 12}H${x + w - 12}L${x + w} ${y}z" fill="${shade(c, 0.22)}" ${SW}/><path d="M${x} ${y}L${x + 12} ${y - 12}H${x + w - 12}L${x + w} ${y}z" fill="url(#p-grainH)"/><path d="M${x + 14} ${y - 9.5}H${x + w - 14}" stroke="#fff" stroke-opacity=".38" stroke-width="1.3"/><rect x="${x}" y="${y}" width="${w}" height="16" rx="2" fill="${c}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="16" rx="2" fill="url(#p-grainH)"/><path d="M${x + 2} ${y + 2.5}h${w - 4}" stroke="#fff" stroke-opacity=".3" stroke-width="1"/><path d="M${x + 2} ${y + 11}h${w - 4}" stroke="#1e0d04" stroke-opacity=".2" stroke-width=".8"/><rect x="${x + 10}" y="${y + 16}" width="${w - 20}" height="10" fill="url(#aoDn)" opacity=".6"/>`;
    if (o.cloth) s += `<path d="M${x + 12} ${y - 12}H${x + w - 12}L${x + w + 6} ${y}l8 ${o.cloth}q-${(w + 28) / 4} 10 -${(w + 28) / 2} 0t-${(w + 28) / 2} 0l8 -${o.cloth}z" fill="${o.clothC || '#f4f0e6'}" ${SW}/><path d="M${x + 12} ${y - 12}H${x + w - 12}L${x + w + 6} ${y}l8 ${o.cloth}q-${(w + 28) / 4} 10 -${(w + 28) / 2} 0t-${(w + 28) / 2} 0l8 -${o.cloth}z" fill="url(#p-weave)"/><path d="M${x + w * 0.25} ${y}v${o.cloth + 4}M${x + w * 0.5} ${y}v${o.cloth + 6}M${x + w * 0.75} ${y}v${o.cloth + 4}" stroke="#000" stroke-opacity=".07" stroke-width="5"/><path d="M${x - 2} ${y + o.cloth - 2}q${(w + 28) / 4} 10 ${(w + 28) / 2} 0t${(w + 28) / 2} 0" stroke="${shade(o.clothC || '#f4f0e6', -0.2)}" stroke-width="1" stroke-dasharray="3 3" fill="none"/>`;
    return s;
  },
  plant(x, y, s = 1, pot = '#d9774b', leaf = '#5f9e5a') {
    let o = this.sh(x, y + 2, 44 * s, 9 * s, 0.28);
    o += `<g transform="translate(${x} ${y}) scale(${s})">`;
    const lD = shade(leaf, -0.32);
    [[-30, -110, -0.5], [0, -130, 0], [30, -110, 0.5], [-48, -70, -0.9], [46, -74, 0.9], [-12, -96, -0.2], [16, -100, 0.25], [-40, -92, -0.7], [38, -94, 0.7], [-6, -116, -0.1], [8, -82, 0.1]].forEach(([dx, dy, r], i) => {
      const cl = i % 3 === 1 ? shade(leaf, 0.16) : i % 3 === 2 ? shade(leaf, -0.08) : leaf, sg = Math.sign(r || 1);
      let veins = ''; for (let t = 0.3; t < 0.9; t += 0.18) { const mx = dx * 0.45 * t * 2, my = -40 + (dy * 0.62 + 40) * t * 1.1; veins += `M${mx.toFixed(1)} ${my.toFixed(1)}l${(sg * 6).toFixed(1)} ${(-5).toFixed(1)}`; }
      o += `<path d="M0 -40Q${dx * 0.3} ${dy * 0.6} ${dx} ${dy}Q${dx * 0.9 + 14 * sg} ${dy * 0.6} 0 -40z" fill="${cl}" stroke="${lD}" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 -40Q${dx * 0.3} ${dy * 0.6} ${dx} ${dy}Q${dx * 0.9 + 14 * sg} ${dy * 0.6} 0 -40z" fill="url(#fm)"/><path d="M0 -42Q${dx * 0.45} ${dy * 0.62} ${dx * 0.92} ${dy * 0.95}" stroke="${lD}" stroke-width="1" fill="none" opacity=".75"/><path d="M1 -44Q${dx * 0.3 + 2} ${dy * 0.55} ${dx * 0.8} ${dy * 0.86}" stroke="#fff" stroke-opacity=".25" stroke-width="1.4" fill="none"/>`;
    });
    o += `<ellipse cx="0" cy="-43" rx="28" ry="4" fill="#4a3020"/><path d="M-30 -42h60l-8 42h-44z" fill="${pot}" ${SW}/><path d="M-30 -42h60l-8 42h-44z" fill="url(#cyl)"/><path d="M-27 -26h54M-25 -16h50" stroke="${shade(pot, -0.25)}" stroke-width="1" opacity=".6"/><path d="M-26 -21h52" stroke="${shade(pot, 0.3)}" stroke-width="2.2" stroke-dasharray="4 3" opacity=".7"/><path d="M-22 -36l-4 32" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/><rect x="-35" y="-48" width="70" height="12" rx="3" fill="${shade(pot, 0.12)}" ${SW}/><rect x="-35" y="-48" width="70" height="12" rx="3" fill="url(#bevel)"/><path d="M-32 -45.5h64" stroke="#fff" stroke-opacity=".45" stroke-width="1"/><path d="M-26 0h52" stroke="#1e0d04" stroke-opacity=".3" stroke-width="1.2"/></g>`;
    return o;
  },
  lamp(x, y, c = '#f3b860', on = true) {
    if (on) this.fx(`<circle class="flick" cx="${x}" cy="${y - 50}" r="130" fill="url(#lampG)" style="${this.ad(3.3)}"/>`);
    let pl = ''; for (let i = 1; i < 8; i++) { const t = i / 8; pl += `M${(x - 22 + 44 * t).toFixed(1)} ${y - 86}L${(x - 36 + 72 * t).toFixed(1)} ${y - 40}`; }
    return `<path d="M${x} ${y - 40}V${y}" stroke="#d4a043" stroke-width="4"/><path d="M${x - 1} ${y - 40}V${y}" stroke="#fff3c0" stroke-width="1" opacity=".7"/><path d="M${x} ${y - 40}V${y}" stroke="#4a3222" stroke-width=".8" opacity=".5"/><ellipse cx="${x}" cy="${y - 20}" rx="5" ry="3.5" fill="url(#brass)" ${SW2}/><path d="M${x - 26} ${y}h52l-6 8h-40z" fill="#8a5a34" ${SW2}/><path d="M${x - 26} ${y}h52l-6 8h-40z" fill="url(#p-grainH)"/><path d="M${x - 24} ${y + 1.5}h48" stroke="#fff" stroke-opacity=".35" stroke-width="1"/><path d="M${x - 36} ${y - 40}h72l-14-46h-44z" fill="${c}" ${SW}/><path d="M${x - 36} ${y - 40}h72l-14-46h-44z" fill="url(#p-weave)"/><path d="${pl}" stroke="${shade(c, -0.25)}" stroke-width=".8" opacity=".55"/><path d="M${x - 36} ${y - 40}h72l-14-46h-44z" fill="url(#cyl)" opacity=".6"/>${on ? `<path d="M${x - 34} ${y - 40}h68l-6 6h-56z" fill="#fff6c8" opacity=".9"/><path d="M${x - 20} ${y - 84}h40" stroke="#fff6c8" stroke-width="2" opacity=".7"/>` : ''}<path d="M${x - 36} ${y - 41}h72M${x - 22} ${y - 85}h44" stroke="${shade(c, -0.35)}" stroke-width="2.2"/><path d="M${x - 18} ${y - 80}l-8 34" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>`;
  },
  rug(cx, cy, rx, ry, c, c2) {
    const c3 = c2 || shade(c, 0.3), cD = shade(c, -0.22);
    let fr = ''; for (let a = 0; a < 360; a += 4) { const t = a * Math.PI / 180, x0 = cx + Math.cos(t) * rx, y0 = cy + Math.sin(t) * ry; fr += `M${x0.toFixed(1)} ${y0.toFixed(1)}l${(Math.cos(t) * 7).toFixed(1)} ${(Math.sin(t) * 4).toFixed(1)}`; }
    let s = `<ellipse cx="${cx}" cy="${cy + 4}" rx="${rx + 10}" ry="${ry + 6}" fill="url(#shG)" opacity=".35"/><path d="${fr}" stroke="${shade(c3, -0.1)}" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" ${SW}/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#p-knit)"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.88}" ry="${ry * 0.84}" fill="none" stroke="${cD}" stroke-width="1.4"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.7}" fill="none" stroke="${c3}" stroke-width="5" stroke-dasharray="10 5 3 5"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.7}" ry="${ry * 0.6}" fill="none" stroke="${cD}" stroke-width="1"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.5}" ry="${ry * 0.42}" fill="${shade(c, -0.08)}" opacity=".7"/><path d="M${cx - rx * 0.3} ${cy}L${cx} ${cy - ry * 0.3}L${cx + rx * 0.3} ${cy}L${cx} ${cy + ry * 0.3}z" fill="none" stroke="${c3}" stroke-width="2"/><path d="M${cx - rx * 0.16} ${cy}L${cx} ${cy - ry * 0.16}L${cx + rx * 0.16} ${cy}L${cx} ${cy + ry * 0.16}z" fill="${c3}" opacity=".75"/><circle cx="${cx - rx * 0.4}" cy="${cy}" r="${ry * 0.08}" fill="${c3}"/><circle cx="${cx + rx * 0.4}" cy="${cy}" r="${ry * 0.08}" fill="${c3}"/>`;
    return s + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#fm)"/>`;
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

'use strict';
// 雲霄戰機：共用常數、數學、雜訊、存檔、輸入
const W = 360, H = 640, TAU = Math.PI * 2;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const pick = a => a[(Math.random() * a.length) | 0];

function hash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi, s), hash(xi + 1, yi, s), u), lerp(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
}
function fbm(x, y, s) {
  return vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.28 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.12;
}
function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = lerp(pa >> 16, pb >> 16, t) | 0, g = lerp((pa >> 8) & 255, (pb >> 8) & 255, t) | 0, bl = lerp(pa & 255, pb & 255, t) | 0;
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

const Store = {
  data: { hi: { easy: 0, normal: 0, hard: 0 }, reached: 1, auto: true, music: true, sfx: true },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('sky.v1') || 'null');
      if (d) { Object.assign(this.data, d); this.data.hi = Object.assign({ easy: 0, normal: 0, hard: 0 }, d.hi || {}); }
    } catch (e) { /* 私密模式等情況沒有存檔也能玩 */ }
  },
  save() { try { localStorage.setItem('sky.v1', JSON.stringify(this.data)); } catch (e) { } },
};

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'KeyJ', 'KeyK']);
const Input = {
  keys: Object.create(null), edge: Object.create(null),
  ptr: null, bombTap: false, touchUI: false, el: null,
  pad: { x: 0, y: 0, fire: false, bomb: false, start: false, pb: false, ps: false, bombEdge: false, startEdge: false },
  init(el) {
    this.el = el;
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest('input,textarea')) return;
      if (!this.keys[e.code]) this.edge[e.code] = true;
      this.keys[e.code] = true;
      if (GAME_KEYS.has(e.code) && G.state === 'play') e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = Object.create(null); this.ptr = null; });
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('button,a,.ov')) return;
      if (e.pointerType === 'touch') this.setTouchUI(true);
      if (this.ptr && this.ptr.id !== e.pointerId) { this.bombTap = true; return; }
      const p = this.toGame(e);
      this.ptr = { id: e.pointerId, lx: p.x, ly: p.y, dx: 0, dy: 0 };
      try { el.setPointerCapture(e.pointerId); } catch (_) { }
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('pointermove', e => {
      if (!this.ptr || this.ptr.id !== e.pointerId) return;
      const p = this.toGame(e);
      this.ptr.dx += p.x - this.ptr.lx; this.ptr.dy += p.y - this.ptr.ly;
      this.ptr.lx = p.x; this.ptr.ly = p.y;
      e.preventDefault();
    }, { passive: false });
    const up = e => { if (this.ptr && this.ptr.id === e.pointerId) this.ptr = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  },
  setTouchUI(on) {
    if (this.touchUI === on) return;
    this.touchUI = on; document.body.classList.toggle('touch', on);
  },
  toGame(e) {
    const r = document.getElementById('cv').getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  },
  hit(code) { const v = this.edge[code]; this.edge[code] = false; return !!v; },
  pollPad() {
    const p = this.pad; p.x = 0; p.y = 0; p.fire = false; p.bomb = false; p.start = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of pads) {
      if (!g || !g.connected) continue;
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      p.x = Math.abs(ax) > 0.2 ? ax : 0; p.y = Math.abs(ay) > 0.2 ? ay : 0;
      const b = i => g.buttons[i] && g.buttons[i].pressed;
      if (b(14)) p.x = -1; if (b(15)) p.x = 1; if (b(12)) p.y = -1; if (b(13)) p.y = 1;
      p.fire = b(0) || b(2) || b(7); p.bomb = b(1) || b(3) || b(6); p.start = b(9);
      break;
    }
    p.bombEdge = p.bomb && !p.pb; p.startEdge = p.start && !p.ps;
    p.pb = p.bomb; p.ps = p.start;
  },
  endFrame() { this.edge = Object.create(null); this.bombTap = false; },
};

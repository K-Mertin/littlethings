// 沒有 WebGPU 時的相容模式：同一套規則用 JavaScript 在 CPU 上跑（格子比較少），畫在 2D canvas
// 規則和 shaders.js 一一對應；改其中一邊，另一邊也要跟著改。
import { M } from './mats.js';

const LOCK = 0x4000000;
const DIRB = 0x1000000;
const { EMPTY, WALL, SAND, WATER, LAVA, WOOD, PLANT, SEED, FIRE, STEAM, SMOKE, STONE, OIL, EMBER, ICE, FLOWER, SPOUT, VOID } = M;
const DENS = new Int8Array(32).fill(99);
DENS[EMPTY] = 0; DENS[SAND] = 5; DENS[WATER] = 2; DENS[LAVA] = 3; DENS[SEED] = 4; DENS[FIRE] = -1; DENS[STEAM] = -2; DENS[SMOKE] = -2; DENS[OIL] = 1;
const MOV = new Uint8Array(32); [EMPTY, SAND, WATER, LAVA, SEED, FIRE, STEAM, SMOKE, OIL].forEach((t) => { MOV[t] = 1; });
const LIQ = new Uint8Array(32); [WATER, LAVA, OIL].forEach((t) => { LIQ[t] = 1; });
const GAS = new Uint8Array(32); [FIRE, STEAM, SMOKE].forEach((t) => { GAS[t] = 1; });
const BURN = new Float32Array(32); BURN[WOOD] = 0.025; BURN[PLANT] = 0.015; BURN[SEED] = 0.08; BURN[OIL] = 0.3; BURN[FLOWER] = 0.05;

const rnd = Math.random;
const ty = (c) => c & 255;
const life = (c) => (c >>> 16) & 255;
const setLife = (c, l) => ((c & ~(255 << 16)) | (Math.min(l, 255) << 16)) >>> 0;
function mk(t) {
  let l = 0;
  if (t === FIRE) l = 25 + ((rnd() * 45) | 0);
  else if (t === STEAM) l = 90 + ((rnd() * 160) | 0);
  else if (t === SMOKE) l = 30 + ((rnd() * 50) | 0);
  else if (t === ICE) l = 40;
  else if (t === LAVA) l = 200;
  return (t | (((rnd() * 255) | 0) << 8) | (l << 16) | (rnd() < 0.5 ? DIRB : 0)) >>> 0;
}

function emberOf(q) {
  const l = q === WOOD ? 120 + ((rnd() * 80) | 0) : q === PLANT ? 30 + ((rnd() * 30) | 0) : q === SEED ? 20 : 40;
  return setLife(mk(EMBER), l);
}

// 顏色表（和 DRAW shader 大致一樣，少了發光）
function rgbOf(c, x, y, cells, w, tm) {
  const t = c & 255, v = ((c >>> 8) & 255) / 255;
  switch (t) {
    case WALL: { const k = (y % 4 === 0 || (x + ((y >> 2) % 2) * 4) % 8 === 0) ? 0.72 : 1; return [(0.34 + v * 0.05) * k, (0.37 + v * 0.05) * k, (0.45 + v * 0.05) * k]; }
    case SAND: return [0.95 - 0.15 * v, 0.82 - 0.19 * v, 0.52 - 0.17 * v];
    case WATER: { const top = y === 0 || (cells[(y - 1) * w + x] & 255) !== WATER; return top ? [0.5, 0.75, 0.98] : [0.13 + 0.07 * v, 0.42 + 0.11 * v, 0.88 + 0.08 * v]; }
    case LAVA: { const h = Math.min(1, life(c) / 200), k = (0.5 + 0.5 * Math.sin(tm * 2 + v * 6.28 + x * 0.15 - y * 0.1)) * h, m = Math.min(1, h / 0.6); return [0.45 + 0.5 * m + 0.05 * k, 0.07 + 0.21 * m + 0.44 * k, 0.02 + 0.02 * m + 0.11 * k]; }
    case WOOD: { const s = 0.05 * Math.sin(y * 1.7 + v * 3); return [0.47 + s + v * 0.04, 0.30 + s + v * 0.04, 0.15 + s + v * 0.04]; }
    case PLANT: return life(c) > 0 ? [0.45, 0.85, 0.36] : [0.16 + 0.17 * v, 0.56 + 0.21 * v, 0.2 + 0.07 * v];
    case SEED: return [0.58 * (0.8 + v * 0.35), 0.43 * (0.8 + v * 0.35), 0.22 * (0.8 + v * 0.35)];
    case FIRE: { const k = Math.min(life(c) / 60, 1); return [0.95 + 0.05 * k, 0.22 + 0.7 * k, 0.05 + 0.35 * k]; }
    case STEAM: return [0.5, 0.54, 0.62];
    case SMOKE: return [0.2, 0.21, 0.27];
    case STONE: return [0.26 + v * 0.08, 0.24 + v * 0.08, 0.27 + v * 0.08];
    case EMBER: { const k = 0.5 + 0.5 * Math.sin(tm * 9 + v * 25); return [0.55 + 0.45 * k, 0.08 + 0.47 * k, 0.02 + 0.1 * k]; }
    case ICE: return [0.68, 0.86, 0.98];
    case FLOWER: return [[1, 0.45, 0.7], [1, 0.85, 0.25], [0.75, 0.5, 1], [1, 0.98, 0.95], [1, 0.3, 0.3]][Math.min(4, (v * 5) | 0)];
    case SPOUT: return [0.7, 0.75, 0.82];
    case VOID: return [0.3, 0.12, 0.5];
    case OIL: return [0.24 + v * 0.05, 0.15 + v * 0.05, 0.22 + v * 0.05];
    default: return null;
  }
}

export class CpuSim {
  constructor(canvas) {
    this.kind = 'cpu'; this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.c = new Uint32Array(4); this.moved = new Uint8Array(4); this.frameNo = 0;
  }
  resize(w, h) {
    this.w = w; this.h = h; this.cells = new Uint32Array(w * h);
    this.canvas.width = w; this.canvas.height = h;
    this.img = this.ctx.createImageData(w, h);
  }
  load(arr) { this.cells.set(arr); }

  stamp(stamps) {
    const { w, h, cells } = this;
    for (const s of stamps) {
      const minx = Math.max(0, Math.floor(Math.min(s.x0, s.x1) - s.r)), maxx = Math.min(w - 1, Math.ceil(Math.max(s.x0, s.x1) + s.r));
      const miny = Math.max(0, Math.floor(Math.min(s.y0, s.y1) - s.r)), maxy = Math.min(h - 1, Math.ceil(Math.max(s.y0, s.y1) + s.r));
      const abx = s.x1 - s.x0, aby = s.y1 - s.y0, ab2 = Math.max(abx * abx + aby * aby, 1e-4);
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5 - s.x0, py = y + 0.5 - s.y0;
        const t = Math.min(1, Math.max(0, (px * abx + py * aby) / ab2));
        const dx = px - abx * t, dy = py - aby * t;
        if (dx * dx + dy * dy > s.r * s.r || rnd() >= s.prob) continue;
        const i = y * w + x, cur = cells[i], ct = cur & 255, locked = (cur & LOCK) !== 0;
        if (s.mode === 0) { if (ct === EMPTY || GAS[ct]) cells[i] = mk(s.mat); }
        else if (s.mode === 1) { if (!locked) cells[i] = s.mat === EMPTY ? 0 : mk(s.mat); }
        else if (s.mode === 2) { if (BURN[ct] > 0) cells[i] = emberOf(ct); else if (ct === EMPTY) cells[i] = mk(FIRE); else if (ct === ICE && rnd() < 0.25) cells[i] = mk(WATER); }
        else if (s.mode === 3) { if (!locked && ct !== WALL && ct !== STONE) cells[i] = 0; }
      }
    }
  }

  frame({ stamps = [], passes = 2, time = 0 }) {
    if (stamps.length) this.stamp(stamps);
    const OFF = [[0, 0], [1, 1], [1, 0], [0, 1]];
    for (let p = 0; p < passes; p++) { const o = OFF[(this.frameNo + p) % 4]; this.pass(o[0], o[1]); this.flow(o[0]); }
    this.frameNo++;
    this.draw(time);
  }

  pass(ox, oy) {
    const { w, h, cells, c } = this;
    const ids = [0, 0, 0, 0], ins = [false, false, false, false];
    for (let y0 = -oy; y0 < h; y0 += 2) for (let x0 = -ox; x0 < w; x0 += 2) {
      let any = false;
      for (let k = 0; k < 4; k++) {
        const x = x0 + (k & 1), y = y0 + (k >> 1);
        ins[k] = x >= 0 && y >= 0 && x < w && y < h;
        ids[k] = ins[k] ? y * w + x : 0;
        c[k] = ins[k] ? cells[ids[k]] : (WALL | LOCK);
        if (ins[k] && (c[k] & 255) !== EMPTY && (c[k] & 255) !== WALL) any = true;
      }
      if (!any) continue;   // 全空或全是牆：跳過（CPU 版的省力小技巧）
      const mir = this.mir = rnd() < 0.5;
      if (mir) { let t = c[0]; c[0] = c[1]; c[1] = t; t = c[2]; c[2] = c[3]; c[3] = t; }
      this.react(0, 1); this.react(1, 0); this.react(2, 3); this.react(3, 2);
      this.react(0, 2); this.react(2, 0); this.react(1, 3); this.react(3, 1);
      this.react(0, 3); this.react(3, 0); this.react(1, 2); this.react(2, 1);
      for (let k = 0; k < 4; k++) this.age(k);
      this.physics();
      if (mir) { let t = c[0]; c[0] = c[1]; c[1] = t; t = c[2]; c[2] = c[3]; c[3] = t; }
      for (let k = 0; k < 4; k++) if (ins[k]) cells[ids[k]] = c[k];
    }
  }

  // 液體橫流（對應 shaders.js 的 FLOW）
  flow(ox) {
    const { w, h, cells } = this;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x0 = -ox; x0 < w; x0 += 2) {
        const mir = rnd() < 0.5, xi = mir ? x0 + 1 : x0, xj = mir ? x0 : x0 + 1;
        if (xi < 0 || xj < 0 || xi >= w || xj >= w) continue;
        const a = cells[row + xi], ta = a & 255;
        if (!LIQ[ta] || ((a & DIRB) !== 0) !== mir) continue;
        const b = cells[row + xj], tb = b & 255;
        if (MOV[tb] && DENS[tb] < DENS[ta]) {
          if (y + 1 < h) { const tu = cells[row + w + xi] & 255; if (MOV[tu] && DENS[tu] < DENS[ta]) continue; }
          if (rnd() < (ta === WATER ? 0.97 : ta === OIL ? 0.9 : 0.12)) { cells[row + xi] = b; cells[row + xj] = a; }
        } else if (rnd() < 0.5) cells[row + xi] = (a ^ DIRB) >>> 0;
      }
    }
  }

  react(i, j) {
    const c = this.c, p = c[i] & 255, q = c[j] & 255;
    // 岩漿／石頭／冰的冷熱規則：和 shaders.js 的 react() 一樣
    if (p === LAVA) {
      if (q === WATER) { c[i] = setLife(mk(STONE), 60); c[j] = mk(STEAM); return; }
      if (q === ICE) { if (rnd() < 0.3) { const h = life(c[i]); c[i] = h <= 50 ? setLife(mk(STONE), 40) : setLife(c[i], h - 50); } return; }
      if (q === STONE) {
        const ch = life(c[j]);
        if (ch > 3 && rnd() < 0.15) { const tr = ch >> 1; c[j] = setLife(c[j], ch - tr); const h = life(c[i]); c[i] = h <= tr * 3 ? setLife(mk(STONE), tr) : setLife(c[i], h - tr * 3); }
        return;
      }
      if (q === LAVA) { const a = life(c[i]), b = life(c[j]); if (a > b + 6 && rnd() < 0.3) { const d = ((a - b) / 3) | 0; c[i] = setLife(c[i], a - d); c[j] = setLife(c[j], b + d); } return; }
    }
    if (p === STONE) {
      if (q === WATER) { if (life(c[i]) < 60 && rnd() < 0.08) c[i] = setLife(c[i], 60); return; }
      if (q === ICE) { if (life(c[i]) < 80 && rnd() < 0.08) c[i] = setLife(c[i], 80); return; }
      if (q === STONE) { const a = life(c[i]), b = life(c[j]); if (a > b + 4 && rnd() < 0.25) { const d = (a - b) >> 1; c[i] = setLife(c[i], a - d); c[j] = setLife(c[j], b + d); } return; }
      return;
    }
    if (p === ICE) {
      if (q === FIRE || q === LAVA || q === EMBER) { if (rnd() < 0.3) { c[i] = mk(WATER); if (q === FIRE) c[j] = mk(STEAM); } return; }
      if (q === WATER) {
        const l = life(c[i]);
        if (l >= 12 && rnd() < 0.006) { const h = l >> 1; c[i] = setLife(c[i], h); c[j] = setLife(mk(ICE), h); }
        else if (rnd() < 0.05) { if (l > 0) c[i] = setLife(c[i], l - 1); else if (rnd() < 0.15) c[i] = mk(WATER); }
        return;
      }
      if (q === ICE) { const a = life(c[i]), b = life(c[j]); if (a > b + 3 && rnd() < 0.1) { const d = (a - b) >> 1; c[i] = setLife(c[i], a - d); c[j] = setLife(c[j], b + d); } return; }
      if (q === STEAM) { if (rnd() < 0.1) c[j] = mk(WATER); return; }
      return;
    }
    if (p === SPOUT && q === EMPTY) { if (rnd() < ((j >> 1) > (i >> 1) ? 0.35 : 0.06)) c[j] = mk(WATER); return; }
    if (p === VOID) { if (q !== EMPTY && MOV[q] && rnd() < 0.9) c[j] = 0; return; }
    if ((p === FIRE || p === LAVA || p === EMBER) && BURN[q] > 0) { if (rnd() < BURN[q] * (p === LAVA ? 3 : p === EMBER ? 1 : 1)) c[j] = emberOf(q); return; }
    if (p === EMBER && q === WATER) { if (rnd() < 0.5) { c[i] = mk(SMOKE); if (rnd() < 0.5) c[j] = mk(STEAM); } return; }
    if (p === EMBER && q === EMPTY) {
      const ri = i >> 1, rj = j >> 1, gw = rj < ri ? ((i & 1) === (j & 1) ? 1 : 0.5) : rj === ri ? 0.15 : 0;
      if (rnd() < 0.12 * gw) c[j] = mk(FIRE);
      return;
    }
    if (p === FIRE && q === WATER) { if (rnd() < 0.4) { c[i] = mk(STEAM); if (rnd() < 0.2) c[j] = mk(STEAM); } return; }
    if (p === SEED && q === WATER) { if (rnd() < 0.05) { c[i] = setLife(mk(PLANT), 40); c[j] = 0; } return; }
    if (p === PLANT && q === WATER) { if (rnd() < 0.04) { c[i] = setLife(c[i], life(c[i]) + 12); c[j] = 0; } return; }
    if (p === PLANT && q === EMPTY) {
      const l = life(c[i]);
      const ri = i >> 1, rj = j >> 1;
      const gw = rj < ri ? ((i & 1) === (j & 1) ? 1 : 0.5) : rj === ri ? 0.15 : 0;
      if (l > 0 && rnd() < 0.05 * gw) { c[j] = l < 30 && rnd() < 0.045 ? mk(FLOWER) : setLife(mk(PLANT), l - 1); if (rnd() < 0.85) c[i] = setLife(c[i], 0); }
    }
  }

  age(i) {
    const c = this.c, t = c[i] & 255;
    if (t !== FIRE && t !== SMOKE && t !== STEAM && t !== EMBER) return;
    const l = life(c[i]);
    const dec = (t === STEAM || t === EMBER) && rnd() < 0.5 ? 0 : 1;
    if (l <= dec) {
      if (t === FIRE || t === EMBER) c[i] = rnd() < 0.3 ? mk(SMOKE) : 0;
      else if (t === SMOKE) c[i] = 0;
      else c[i] = rnd() < 0.35 ? mk(WATER) : 0;
    } else c[i] = setLife(c[i], l - dec);
  }

  physics() {
    const c = this.c, m = this.moved; m.fill(0);
    const sw = (i, j) => { const t = c[i]; c[i] = c[j]; c[j] = t; m[i] = m[j] = 1; };
    for (let col = 0; col < 2; col++) {
      const tt = c[col] & 255, tb = c[col + 2] & 255;
      if (MOV[tt] && MOV[tb] && DENS[tt] > DENS[tb]) {
        let p;
        if (DENS[tt] > 0) p = (tt === SAND || tt === SEED) ? (LIQ[tb] ? 0.5 : 1) : (tt === WATER || tt === OIL) ? 0.98 : tt === LAVA ? 0.7 : 1;
        else p = tb === FIRE ? 0.9 : 0.75;
        if (rnd() < p) sw(col, col + 2);
      }
    }
    if (!m[0] && !m[3]) {
      const t0 = c[0] & 255, t1 = c[1] & 255, t2 = c[2] & 255, t3 = c[3] & 255, d0 = DENS[t0];
      if (MOV[t0] && d0 > 0 && MOV[t3] && d0 > DENS[t3] && (!MOV[t2] || DENS[t2] >= d0) && (!MOV[t1] || DENS[t1] < d0)) {
        const p = (t0 === SAND || t0 === SEED) ? 0.75 : t0 === LAVA ? 0.4 : 0.95;
        if (rnd() < p) sw(0, 3);
      }
    }
    if (!m[2] && !m[1]) {
      const t2 = c[2] & 255, t1 = c[1] & 255, t0 = c[0] & 255;
      if (GAS[t2] && MOV[t1] && DENS[t1] > DENS[t2] && (!MOV[t0] || DENS[t0] <= DENS[t2]) && rnd() < 0.6) sw(2, 1);
    }
    for (let row = 0; row < 2; row++) {
      const i = row * 2, j = i + 1;
      if (m[i] || m[j]) continue;
      const ti = c[i] & 255, tj = c[j] & 255;
      if (LIQ[ti]) {
        const goLeft = (c[i] & DIRB) !== 0;
        if (MOV[tj] && DENS[tj] < DENS[ti]) { if (rnd() < (ti === WATER ? 0.97 : ti === OIL ? 0.9 : 0.12) * (goLeft === this.mir ? 1 : 0.08)) sw(i, j); }
        else if (goLeft === this.mir && rnd() < 0.5) c[i] = (c[i] ^ DIRB) >>> 0;
      }
      else if (GAS[ti] && tj === EMPTY) { if (rnd() < 0.5) sw(i, j); }
    }
  }

  draw(tm) {
    const { w, h, cells, img } = this, d = img.data;
    for (let y = 0; y < h; y++) {
      const by = 0.05 + 0.03 * y / h, bgG = 0.07 + 0.03 * y / h, bgB = 0.13 + 0.06 * y / h;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, o = i * 4, c = cells[i];
        const rgb = (c & 255) ? rgbOf(c, x, y, cells, w, tm) : null;
        if (rgb) { d[o] = rgb[0] * 255; d[o + 1] = rgb[1] * 255; d[o + 2] = rgb[2] * 255; }
        else { const g = (x % 16 === 0 || y % 16 === 0) ? 0.015 : 0; d[o] = (by + g) * 255; d[o + 1] = (bgG + g) * 255; d[o + 2] = (bgB + g * 2) * 255; }
        d[o + 3] = 255;
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }

  count(regions) {
    const { w, cells } = this;
    return Promise.resolve(regions.map((r) => {
      let n = 0; const mask = r.mats.reduce((m, t) => m | (1 << t), 0);
      for (let y = Math.max(0, Math.floor(r.y0)); y < Math.min(this.h, Math.ceil(r.y1)); y++)
        for (let x = Math.max(0, Math.floor(r.x0)); x < Math.min(w, Math.ceil(r.x1)); x++) if ((mask >> (cells[y * w + x] & 255)) & 1) n++;
      return n;
    }));
  }

  async snapshot() { return this.ctx.getImageData(0, 0, this.w, this.h); }
  async readCells() { return this.cells.slice(); }
}

'use strict';
// 曉鐘傳說：地圖移動、繪製、事件觸發、遇敵
const F = k => !!(typeof G !== "undefined" && G && G.flags[k]);
const SOLID_WORLD = new Set(['~', '^', 'M', 'C']);
const PASS_LOCAL = new Set(['.', ',', ';', '_', 'o', '+', 'R', '<', '>', 'E', 'i', '%', ':', '*', 'j', 'u']);
const WALLISH = new Set(['#', 'k', '!', 'D']);
const LOCS = { V: 'maple', P: 'port', S: 'sand', F: 'snow', c: 'cave1', m: 'mine1', L: 'tower1', p: 'tomb1', i: 'ice1', K: 'castle1' };

const Field = {
  id: null, def: null, w: 0, h: 0, grid: null, baked: null, npcs: [], party: [], busy: false, enc: 20, t: 0,
  banner: null, fadeA: 0, slideDir: null, dirty: false,
  musicName() { return this.def ? (typeof this.def.music === 'function' ? this.def.music() : this.def.music) : 'field'; },
  load(id, x, y, dir = 'down', o = {}) {
    const def = MAPS[id]; this.id = id; this.def = def;
    const rows = MAP_ROWS[def.rows || id];
    this.h = rows.length; this.w = Math.max(...rows.map(r => r.length));
    this.grid = rows.map(r => r.padEnd(this.w, def.kind === 'world' ? '~' : '#').split(''));
    this.applyDynamic();
    this.npcs = (def.npcs || []).map(n => ({ d: n, x: n.x, y: n.y, dir: n.dir || 'down', ox: 0, oy: 0, mv: null, wt: rnd(1, 4), hx: n.x, hy: n.y }));
    this.refreshNpcs();
    const n = G.party.length;
    this.party = G.party.map(() => ({ x, y, fx: x, fy: y, dir, t: 1 }));
    this.bake();
    G.map = id; G.x = x; G.y = y; G.dir = dir;
    this.enc = this.encReset();
    this.slideDir = null;
    this.banner = (!o.quiet && def.name && def.kind !== 'world') ? { text: def.name, t: 0 } : null;
    Music.play(this.musicName());
    if (def.kind === 'town') { if (!G.towns.includes(id)) G.towns.push(id); G.home = id; }
    if (def.onEnter) def.onEnter(o);
  },
  applyDynamic() {
    const d = this.def;
    if (d.kind === 'world') {
      // 依旗標改變世界地圖（倒木、關卡、彩虹橋）
    }
    for (const k in d.chests || {}) { const [x, y] = k.split(',').map(Number); if (this.grid[y]) this.grid[y][x] = 'C'; }
  },
  refreshNpcs() { for (const n of this.npcs) n.hidden = n.d.if ? !n.d.if() : false; },
  chestOpen(x, y) { return F('c:' + this.id + ':' + x + ',' + y); },
  tile(x, y) { return (this.grid[y] && this.grid[y][x]) || (this.def.kind === 'world' ? '~' : '#'); },
  isWorld() { return this.def.kind === 'world'; },
  passable(x, y, who) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this.def.kind === 'town' ? 'edge' : false;
    const c = this.tile(x, y);
    if (this.isWorld()) {
      if (c === 'Y') return F('d1'); if (c === 'G') return F('gate'); if (c === 'b') return F('bridge');
      return !SOLID_WORLD.has(c);
    }
    if (c === 'D') return this.def.kind === 'town' ? true : F('door:' + this.id + ':' + x + ',' + y);
    if (!PASS_LOCAL.has(c)) return false;
    for (const n of this.npcs) if (!n.hidden && !n.d.ghost && ((n.x === x && n.y === y) || (n.mv && n.mv.tx === x && n.mv.ty === y))) return false;
    return true;
  },
  npcAt(x, y) { return this.npcs.find(n => !n.hidden && (n.x === x && n.y === y || (n.d.big && Math.abs(n.x - x) <= 0 && n.y - y <= 1 && n.y - y >= 0))); },

  // ───── 地圖烘焙 ─────
  groundAt(x, y) {
    const c = this.tile(x, y);
    if (':Cp'.includes(c)) return 'sand'; if ('*AM'.includes(c)) return 'snow'; if (c === 'w' || c === 'K') return 'wither';
    if (x >= 40 && y >= 23) return 'sand'; if (x >= 40 && y < 23) return 'snow';
    if (x >= 28 && x < 40 && y < 16) return 'wither';
    return 'grass';
  },
  waterMask(x, y, liquidSet) {
    const land = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) return false; const c = this.tile(xx, yy); return !liquidSet.includes(c) && !(c === 'b' && this.isWorld()); };
    return (land(x, y - 1) ? 1 : 0) | (land(x + 1, y) ? 2 : 0) | (land(x, y + 1) ? 4 : 0) | (land(x - 1, y) ? 8 : 0);
  },
  cellCanvas(x, y, fr) {
    const c = this.tile(x, y), v = (hash2(x, y, 7) * 4) | 0, seed = v + 1;
    if (this.isWorld()) {
      const ground = this.groundAt(x, y);
      let kind, info = { seed, ground, frame: fr };
      switch (c) {
        case '.': kind = ground; break; case ',': kind = 'flowers'; break; case 'T': kind = 'forest'; break; case 'h': kind = 'hills'; break;
        case ':': kind = 'sand'; break; case '*': kind = 'snow'; break; case 'A': kind = 'pines'; info.ground = 'snow'; break; case 'M': kind = 'snowmtn'; break;
        case '^': kind = 'mountain'; break; case 'C': kind = 'cactus'; break; case ';': kind = 'road'; break; case 'w': kind = 'wither'; break;
        case '~': kind = 'water'; info.mask = this.waterMask(x, y, '~db'); info.seed = 0; break;
        case 'b': if (F('bridge')) { kind = 'rainbow'; info.seed = 0; } else { kind = 'water'; info.mask = this.waterMask(x, y, '~db'); info.seed = 0; } break;
        case 'V': kind = 'town'; info.roof = '#d84a3a'; break; case 'P': kind = 'town'; info.roof = '#3a6ad8'; break; case 'S': kind = 'town'; info.roof = '#e0902a'; info.wallc = '#f8e8c0'; break; case 'F': kind = 'town'; info.roof = '#8a4ac8'; info.wallc = '#e8e0f0'; break;
        case 'c': case 'm': kind = 'cave'; break; case 'L': kind = 'lighthouse'; info.lit = F('d2'); break; case 'p': kind = 'pyramid'; break; case 'i': kind = 'tower'; break;
        case 'K': kind = 'castle'; break; case 'a': kind = 'altar'; info.lit = F('bridge'); break; case 'd': kind = 'dock'; info.seed = 0; break;
        case 'Y': kind = F('d1') ? 'road' : 'log'; break; case 'G': kind = 'gate'; info.open = F('gate'); break;
        default: kind = ground;
      }
      const key = ['W', kind, info.ground, info.seed, info.mask || 0, info.roof || '', info.lit ? 1 : 0, info.open ? 1 : 0, (kind === 'water' || kind === 'rainbow' || kind === 'dock') ? fr : 0].join('|');
      return tileCanvas(key, g => drawTileKind(g, kind, info));
    }
    const th = THEMES[this.def.theme];
    const town = this.def.kind === 'town';
    const outdoorGround = th.ground;
    const key = (k, extra = '') => ['L', this.def.theme, k, seed, extra].join('|');
    const groundFn = g => town ? drawGround(g, outdoorGround, seed) : drawFloor(g, th, seed);
    const indoor = () => { for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const n = this.tile(x + dx, y + dy); if (n === 'o' || n === 'R') return true; } return false; };
    switch (c) {
      case '.': return tileCanvas(key('.'), groundFn);
      case ',': return tileCanvas(key(','), g => drawTileKind(g, 'flowers', { seed, ground: outdoorGround }));
      case ';': return tileCanvas(key(';'), g => drawTileKind(g, 'road', { seed, ground: outdoorGround === 'cobble' ? 'grass' : outdoorGround }));
      case '_': return tileCanvas(key('_'), g => drawGround(g, 'cobble', seed));
      case ':': return tileCanvas(key(':'), g => drawGround(g, 'sand', seed));
      case '*': return tileCanvas(key('*'), g => drawGround(g, 'snow', seed));
      case 'o': return tileCanvas(key('o'), g => drawFloor(g, th, seed, 'wood'));
      case '#': case '!': {
        const below = this.tile(x, y + 1), face = !WALLISH.has(below) && y + 1 < this.h;
        if (c === '!' && face) return tileCanvas(key('!'), g => drawObj(g, 'torch', th, { seed }));
        const edgeS = !face && !WALLISH.has(below);
        return tileCanvas(key('#', (face ? 'f' : 't') + (edgeS ? 's' : '')), g => drawWall(g, th, face, seed, { edgeS }));
      }
      case 'k': return tileCanvas(key('k'), g => drawObj(g, 'shelf', th, { seed }));
      case '~': { const m = this.waterMask(x, y, '~'); return tileCanvas(key('~', m + ':' + fr), g => drawWater(g, fr, m, th.liquid)); }
      case 'D':
        if (town) return tileCanvas(key('Dk', fr), g => drawTileKind(g, 'dock', { frame: fr }));
        if (F('door:' + this.id + ':' + x + ',' + y)) return tileCanvas(key('.'), groundFn);
        return tileCanvas(key('D'), g => drawObj(g, 'lockdoor', th, { seed }));
      case 'C': { const open = this.chestOpen(x, y); return tileCanvas(key('C', open ? 1 : 0), g => drawObj(g, 'chest', th, { seed, open, wood: town })); }
      case '%': return tileCanvas(key('%', fr), g => drawObj(g, 'swamp', th, { seed, frame: fr }));
      case 'H': return tileCanvas(key('H', fr), g => drawObj(g, 'spring', th, { seed, frame: fr }));
      case 'Z': { const carpet = this.tile(x, y + 1) === 'R'; return tileCanvas(key('Z', carpet ? 1 : 0), g => drawObj(g, 'throne', th, { seed, carpet, wood: town })); }
      default: {
        const map = { '+': 'door', '=': 'counter', b: 'bed', t: 'table', B: 'barrel', p: 'pot', X: 'crate', R: 'carpet', Y: 'altarT', Q: 'bell', w: 'well', f: 'fence', s: 'sign', T: 'tree', P: 'palm', A: 'pine', h: 'bush', F: 'fountain', L: 'lamp', K: 'anvil', G: 'grave', '<': 'stairsUp', '>': 'stairsDown', E: 'exit', S: 'statue', O: 'pillar', i: 'ice', r: 'rock', c: 'crystal', n: 'coffin', j: 'rail' };
        const kind = map[c];
        if (!kind) return tileCanvas(key('.'), groundFn);
        if (kind === 'tree' || kind === 'palm' || kind === 'pine') return tileCanvas(key(c), g => drawTileKind(g, kind, { seed, ground: outdoorGround === 'cobble' ? 'grass' : outdoorGround }));
        const wood = town && (c === '+' || indoor());
        return tileCanvas(key(c, wood ? 'w' : ''), g => drawObj(g, kind, town && !wood ? Object.assign({}, th, { floor: GROUND[outdoorGround] ? [GROUND[outdoorGround][0], ...GROUND[outdoorGround][1]] : th.floor }) : th, { seed, wood }));
      }
    }
  },
  bake() {
    const W = this.w * TS, H = this.h * TS;
    this.baked = [0, 1].map(fr => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.drawImage(this.cellCanvas(x, y, fr), x * TS, y * TS);
      return c;
    });
  },
  rebake() { this.bake(); },

  // ───── 移動 ─────
  leader() { return this.party[0]; },
  encReset() {
    const d = DIFFS[G.diff] || DIFFS.normal;
    return ri(this.isWorld() ? 16 : 13, this.isWorld() ? 30 : 24) * d.enc;
  },
  tryMove(dir) {
    const p = this.leader(), [dx, dy] = DIRS[dir];
    p.dir = dir;
    const nx = p.x + dx, ny = p.y + dy;
    const ok = this.passable(nx, ny);
    if (ok === 'edge') { this.leaveTown(); return true; }
    if (!ok) {
      this.bumpT = (this.bumpT || 0);
      if (this.t - this.bumpT > 0.3) { Snd.play('bump'); this.bumpT = this.t; }
      // 碰到有說明的地形
      if (this.isWorld()) { const c = this.tile(nx, ny); if (c === 'Y' || c === 'G') { this.run(() => worldBlock(c)); } }
      return false;
    }
    // 隊伍跟隨
    for (let i = this.party.length - 1; i >= 1; i--) {
      const f = this.party[i], prev = this.party[i - 1];
      f.fx = f.x; f.fy = f.y;
      if (prev.x !== f.x || prev.y !== f.y) { f.dir = prev.x > f.x ? 'right' : prev.x < f.x ? 'left' : prev.y > f.y ? 'down' : 'up'; }
      f.x = prev.x; f.y = prev.y; f.t = 0;
    }
    p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 0;
    this.stepCount = (this.stepCount || 0) + 1;
    return true;
  },
  moving() { return this.leader().t < 1; },
  update(dt) {
    this.t += dt;
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.6) this.banner = null; }
    const spd = (this.slideDir ? 11 : 6.2) * (window.__speed || 1);
    let arrived = false;
    for (const p of this.party) if (p.t < 1) { p.t = Math.min(1, p.t + dt * spd); if (p === this.leader() && p.t >= 1) arrived = true; }
    this.updateNpcs(dt);
    if (arrived) { this.onStep(); return; }
    if (this.busy || UI.busy() || this.moving() || Game.fading) return;
    if (this.slideDir) { const d = this.slideDir; this.slideDir = null; if (this.tryMove(d)) { this.sliding = true; return; } }
    this.sliding = false;
    if (Input.pressed.cancel) { this.run(() => fieldMenu()); return; }
    if (Input.pressed.ok) { this.interact(); return; }
    const d = Input.dir;
    if (d) this.tryMove(d);
  },
  updateNpcs(dt) {
    for (const n of this.npcs) {
      if (n.hidden) continue;
      if (n.mv) { n.mv.t += dt * 3.2; if (n.mv.t >= 1) { n.x = n.mv.tx; n.y = n.mv.ty; n.mv = null; } continue; }
      if (!n.d.wander || this.busy || UI.busy()) continue;
      n.wt -= dt;
      if (n.wt <= 0) {
        n.wt = rnd(1.2, 3.5);
        const dir = pick(['up', 'down', 'left', 'right']), [dx, dy] = DIRS[dir];
        const tx = n.x + dx, ty = n.y + dy;
        n.dir = dir;
        const L0 = this.leader();
        if (Math.abs(tx - n.hx) > 2 || Math.abs(ty - n.hy) > 2) continue;
        if (!this.passable(tx, ty) || this.passable(tx, ty) === 'edge') continue;
        if (this.party.some(p => (p.x === tx && p.y === ty) || (p.fx === tx && p.fy === ty && p.t < 1)) || (L0.x === tx && L0.y === ty)) continue;
        n.mv = { tx, ty, t: 0 };
      }
    }
  },
  leaveTown() { const w = this.def.world, d = this.leader().dir; this.run(() => Game.go('world', w[0], w[1], d === 'up' ? 'up' : d)); },
  // 走到新的一格
  onStep() {
    const p = this.leader(), x = p.x, y = p.y, c = this.tile(x, y);
    G.x = x; G.y = y; G.dir = p.dir; G.steps++;
    if (this.sliding && c === 'i') { this.slideDir = p.dir; Snd.play('slide'); return; }
    if (this.isWorld()) {
      if (LOCS[c]) { const id = LOCS[c], e = MAPS[id].entry; this.run(() => Game.go(id, e[0], e[1], e[2] || 'up', { from: 'world' })); return; }
      if (c === 'a') { this.run(() => altarEvent()); return; }
      if (c === 'd') { this.run(() => dockEvent()); return; }
    } else {
      const ex = (this.def.exits || []).find(e => e.x === x && e.y === y);
      if (ex) { Snd.play(c === 'E' ? 'door' : 'stairs'); this.run(() => Game.go(ex.to, ex.tx, ex.ty, ex.dir || p.dir)); return; }
      if (c === 'E') { const w = this.def.world; Snd.play('door'); this.run(() => Game.go('world', w[0], w[1], 'down')); return; }
      const tr = (this.def.triggers || []).find(t => t.x === x && t.y === y && (!t.if || t.if()));
      if (tr) { this.run(() => tr.run()); return; }
      if (c === '%') { Snd.play('swamp'); Game.flashRed = 0.25; for (const m of G.party) if (m.hp > 0) m.hp = Math.max(1, m.hp - Math.max(2, Math.round(Party.stats(m).mhp * 0.03))); }
    }
    // 中毒：每走一步扣血
    if (G.party.some(m => m.st.poison && m.hp > 0)) {
      for (const m of G.party) if (m.st.poison && m.hp > 1) m.hp -= 1;
      if (G.steps % 2 === 0) { Game.flashRed = 0.12; }
    }
    if (G.repel > 0) G.repel--;
    if (c === 'i') { this.slideDir = p.dir; this.sliding = true; return; }
    this.encounterStep(c);
  },
  zone() {
    if (!this.isWorld()) return this.def.enc || null;
    const p = this.leader(), x = p.x, y = p.y;
    if (x >= 28 && x < 40 && y < 16) return 'z5';
    if (x >= 40) return y >= 23 ? 'z3' : 'z4';
    if (y < 17) return 'z1';
    if (y >= 37 || x >= 22) return 'z2s';
    return 'z2';
  },
  encounterStep(c) {
    const z = this.zone(); if (!z || window.__noEnc) return;
    let f = 1;
    if ('TAh'.includes(c) && this.isWorld()) f = 1.4;
    if (c === ';' && this.isWorld()) f = 0.6;
    if (G.repel > 0) f *= 0.5;
    this.enc -= f;
    if (this.enc > 0) return;
    this.enc = this.encReset();
    const Z = ZONES[z];
    if (G.repel > 0) { const avg = G.party.reduce((s, m) => s + m.lv, 0) / G.party.length; if (avg >= (Z.lv || 0) + 2) return; }
    const ids = rollFormation(Z);
    this.run(async () => {
      Snd.play('encounter'); await Game.swirl();
      const r = await runBattle(ids, { bg: this.isWorld() && c === 'T' ? 'forest' : Z.bg });
      if (r === 'lose') await Game.wipe();
    });
  },
  interact() {
    const p = this.leader(), [dx, dy] = DIRS[p.dir];
    let tx = p.x + dx, ty = p.y + dy;
    let n = this.npcAt(tx, ty);
    if (!n && this.tile(tx, ty) === '=') { n = this.npcAt(tx + dx, ty + dy); }
    if (n && n.d.talk) {
      if (!n.d.fixed && !n.d.mon) n.dir = OPP[p.dir];
      this.run(async () => { await n.d.talk(n); this.refreshNpcs(); });
      return;
    }
    const c = this.tile(tx, ty), key = tx + ',' + ty;
    if (c === 'C' && this.def.chests && this.def.chests[key]) { this.run(() => openChest(tx, ty)); return; }
    if (c === 's' && this.def.signs && this.def.signs[key]) { this.run(() => UI.say(this.def.signs[key])); return; }
    if (c === 'S') { this.run(() => statueSave()); return; }
    if (c === 'H') { this.run(() => springHeal()); return; }
    if (c === 'Q') { this.run(() => UI.say('曉鐘靜靜地垂掛著。', '鐘身裡本來應該嵌著五顆音石的位置……' + (countStones() ? `現在已經放回了 ${countStones()} 顆。` : '現在全都空了。'))); return; }
    if (c === 'D' && !this.passable(tx, ty)) { this.run(() => lockedDoor(tx, ty)); return; }
    if (c === 'L' && this.id === 'tower3') { this.run(() => UI.say(F('d2') ? '燈塔的大燈溫暖地亮著，照亮了整片海面。' : '巨大的燈台熄滅了，裡面只剩冷冷的灰。')); return; }
    if (this.isWorld() && (c === 'Y' || c === 'G')) { this.run(() => worldBlock(c)); return; }
  },
  async run(fn) {
    if (this.busy) return;
    this.busy = true;
    try { await fn(); } catch (e) { console.error(e); }
    this.busy = false;
    this.refreshNpcs();
    Input.consume();
  },

  // ───── 繪製 ─────
  cam() {
    const V = L.V, k = L.k, T = TS * k, p = this.leader();
    const lx = lerp(p.fx, p.x, p.t) * T + T / 2, ly = lerp(p.fy, p.y, p.t) * T + T / 2;
    const MW = this.w * T, MH = this.h * T;
    let cx = MW <= V.w ? (MW - V.w) / 2 : clamp(lx - V.w / 2, 0, MW - V.w);
    let cy = MH <= V.h ? (MH - V.h) / 2 : clamp(ly - V.h / 2, 0, MH - V.h);
    return { cx: Math.round(cx / k) * k, cy: Math.round(cy / k) * k, T };
  },
  draw(g) {
    const V = L.V, k = L.k;
    const { cx, cy, T } = this.cam();
    g.fillStyle = this.isWorld() ? '#1a3a7a' : '#06040c'; g.fillRect(V.x, V.y, V.w, V.h);
    g.save(); g.beginPath(); g.rect(V.x, V.y, V.w, V.h); g.clip();
    g.imageSmoothingEnabled = false;
    const fr = Math.floor(this.t * 1.6) % 2, img = this.baked[fr];
    // 只畫看得到的部分
    const sx = Math.max(0, cx / k), sy = Math.max(0, cy / k), sw = Math.min(img.width - sx, V.w / k), sh = Math.min(img.height - sy, V.h / k);
    g.drawImage(img, sx, sy, sw, sh, V.x + (sx * k - cx), V.y + (sy * k - cy), sw * k, sh * k);
    // 角色（依 y 排序）
    const ents = [];
    for (const n of this.npcs) if (!n.hidden) {
      const px = n.mv ? lerp(n.x, n.mv.tx, n.mv.t) : n.x, py = n.mv ? lerp(n.y, n.mv.ty, n.mv.t) : n.y;
      ents.push({ y: py, draw: () => this.drawNpc(g, n, V.x + px * T - cx, V.y + py * T - cy, T) });
    }
    for (let i = this.party.length - 1; i >= 0; i--) {
      const p = this.party[i];
      if (i > 0 && p.x === this.leader().x && p.y === this.leader().y && p.t >= 1) continue;
      if (i > 0 && this.party.slice(0, i).some(q => q.x === p.x && q.y === p.y && q.t >= 1 && p.t >= 1)) continue;
      const px = lerp(p.fx, p.x, p.t), py = lerp(p.fy, p.y, p.t);
      ents.push({ y: py - i * 0.001, draw: () => this.drawChar(g, CHARS[G.party[i].id] ? G.party[i].id : 'hero', p.dir, p.t < 1 || (this.t * 2 % 1 < 0.5 && false), V.x + px * T - cx, V.y + py * T - cy, T, p, G.party[i].hp <= 0) });
    }
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
    // 迷宮的黑暗
    if (this.def.dark) {
      const p = this.leader(), lx = V.x + (lerp(p.fx, p.x, p.t) + 0.5) * T - cx, ly = V.y + (lerp(p.fy, p.y, p.t) + 0.5) * T - cy;
      const r = T * (this.def.dark === 2 ? 4.2 : 5.5);
      const gr = g.createRadialGradient(lx, ly, r * 0.35, lx, ly, r);
      gr.addColorStop(0, 'rgba(6,4,14,0)'); gr.addColorStop(1, 'rgba(6,4,14,.82)');
      g.fillStyle = gr; g.fillRect(V.x, V.y, V.w, V.h);
    }
    if (this.isWorld() && !F('nox')) { g.fillStyle = 'rgba(40,24,90,.13)'; g.fillRect(V.x, V.y, V.w, V.h); }
    if (Game.dawn !== undefined && this.id === 'maple') { const d = Game.dawn; g.fillStyle = `rgba(${Math.round(lerp(20, 255, d))},${Math.round(lerp(20, 170, d))},${Math.round(lerp(70, 80, d))},${lerp(0.55, 0.12, d)})`; g.fillRect(V.x, V.y, V.w, V.h); }
    if (this.def.tint) { g.fillStyle = this.def.tint; g.fillRect(V.x, V.y, V.w, V.h); }
    g.restore();
    // 地名
    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t * 3, (2.6 - b.t) * 2), fs = L.FS;
      g.globalAlpha = Math.max(0, a);
      g.font = `700 ${fs * 1.2}px ${FONT}`; const w = g.measureText(b.text).width + fs * 3, h = fs * 2.3;
      const x = V.x + (V.w - w) / 2, y = V.y + fs * 1.2;
      UI.win(g, x, y, w, h, { alpha: 0.8 }); UI.text(g, b.text, x + w / 2, y + h / 2, '#ffe9a8', fs * 1.2, 'center', 'middle', 700);
      g.globalAlpha = 1;
    }
  },
  drawChar(g, id, dir, walking, x, y, T, p, dead) {
    const sh = sheet(SPRITES[id] ? id : 'hero');
    const row = { down: 0, up: 1, left: 2, right: 3 }[dir] || 0;
    const step = Math.floor(this.t * 4) % 2;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + T / 2, y + T * 0.92, T * 0.3, T * 0.09, 0, 0, TAU); g.fill();
    if (dead) { g.globalAlpha = 0.45; }
    g.drawImage(sh, step * 16, row * 16, 16, 16, x, y - T * 0.12, T, T);
    g.globalAlpha = 1;
  },
  drawNpc(g, n, x, y, T) {
    if (n.d.mon) {
      const art = MonArt.get(MONS[n.d.mon]), s = (n.d.scale || (MONS[n.d.mon].boss ? 1.9 : 1.15)) * T;
      const bob = Math.sin(this.t * 3 + n.x) * T * 0.05;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + T / 2, y + T * 0.92, s * 0.3, s * 0.08, 0, 0, TAU); g.fill();
      g.drawImage(art.img, x + T / 2 - s / 2, y + T - s + bob, s, s);
      return;
    }
    const sh = sheet(n.d.spr);
    const row = { down: 0, up: 1, left: 2, right: 3 }[n.dir] || 0;
    const step = Math.floor(this.t * 2.5 + n.x) % 2;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + T / 2, y + T * 0.92, T * 0.3, T * 0.09, 0, 0, TAU); g.fill();
    g.drawImage(sh, step * 16, row * 16, 16, 16, x, y - T * 0.12, T, T);
  },
};

function rollFormation(Z) {
  const n = ri(Z.n[0], Z.n[1]);
  const wsum = Z.w.reduce((a, b) => a + b, 0);
  const one = () => { let r = Math.random() * wsum; for (let i = 0; i < Z.mons.length; i++) { r -= Z.w[i]; if (r < 0) return Z.mons[i]; } return Z.mons[0]; };
  const a = one(), b = one();
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(i < Math.ceil(n / 2) || Math.random() < 0.4 ? a : b);
  // 金屬怪物只會單獨或兩隻出現
  if (ids.includes('cmole')) return ids.filter(i => i === 'cmole').slice(0, 2).concat(ids.filter(i => i !== 'cmole').slice(0, 1));
  return ids;
}

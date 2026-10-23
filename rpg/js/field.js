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
    this.bake(); FieldFx.reset();
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
  bake() {
    this.props = []; this.builds = []; this.lights = []; this.spots = []; this.lightLayer = null;
    if (this.isWorld()) { this.baked = WorldBake.get(this); return; }
    const r = LocalBake.bake(this);
    // 保留屋頂淡出的狀態
    const old = this.buildsPrev && this.buildsPrevId === this.id ? this.buildsPrev : null;
    this.baked = r.frames; this.props = r.props; this.builds = r.builds; this.lights = r.lights; this.spots = r.fx;
    if (old) this.builds.forEach((b, i) => { if (old[i]) b.alpha = old[i].alpha; });
    else { const p = this.leader && this.leader(); if (p) for (const b of this.builds) b.alpha = this.inBuild(b, p.x, p.y) ? 0 : 1; }
    this.buildsPrev = this.builds; this.buildsPrevId = this.id;
  },
  inBuild(b, x, y) { return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1; },
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
      f.x = prev.x; f.y = prev.y; f.t = 0; f.n = (f.n || 0) + 1;
    }
    p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 0; p.n = (p.n || 0) + 1;
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
    FieldFx.update(dt, this);
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
      if (n.mv) { n.mv.t += dt * 3.2; if (n.mv.t >= 1) { n.x = n.mv.tx; n.y = n.mv.ty; n.mv = null; n.n = (n.n || 0) + 1; } continue; }
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
    const ids = (window.rollFormationRare || rollFormation)(Z, z);
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
      this.run(async () => { UI.talkSpr = n.d.spr; try { await n.d.talk(n); } finally { UI.talkSpr = null; } this.refreshNpcs(); });
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
    if (typeof Extra !== 'undefined' && G) Extra.check();
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
  // 環境光：黯王被打倒前天色昏暗
  ambient() {
    if (this.def.kind === 'dungeon') return null;
    if (!F('nox')) return { col: '40,24,90', a: this.isWorld() ? 0.16 : 0.2, dim: 1 };
    return null;
  },
  // 地圖先畫在「原生解析度」（1 圖塊 = 16 像素）的小畫布上，色調、光暈、黑暗都在小畫布上合成，
  // 最後只做一次放大貼圖：手機上全螢幕的混色次數從 5～6 次降到 1 次
  draw(g) {
    const V0 = L.V, k0 = L.k, w = Math.ceil(V0.w / k0), h = Math.ceil(V0.h / k0);
    if (!this.fb || this.fb.width !== w || this.fb.height !== h) { this.fb = document.createElement('canvas'); this.fb.width = w; this.fb.height = h; this.fbg = this.fb.getContext('2d'); }
    const fg = this.fbg;
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over'; fg.imageSmoothingEnabled = false;
    L.V = { x: 0, y: 0, w, h }; L.k = 1;
    try { this.drawScene(fg); } finally { L.V = V0; L.k = k0; }
    g.save(); g.beginPath(); g.rect(V0.x, V0.y, V0.w, V0.h); g.clip();
    let shx = 0, shy = 0;
    if (this.shakeT > 0) { this.shakeT = Math.max(0, this.shakeT - 1 / 60); const a = Math.min(1, this.shakeT / 0.3) * k0 * 1.5; shx = Math.round(Math.sin(this.t * 83) * a); shy = Math.round(Math.cos(this.t * 61) * a * 0.6); }
    g.imageSmoothingEnabled = false; g.drawImage(this.fb, V0.x + shx, V0.y + shy, w * k0, h * k0);
    this.drawOverlay(g);
    g.restore();
    // 地名
    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t * 3, (2.6 - b.t) * 2), fs = L.FS;
      g.globalAlpha = Math.max(0, a);
      UI.banner(g, b.text, V0.x + V0.w / 2, V0.y + fs * 2.4, fs);
      g.globalAlpha = 1;
    }
  },
  // ───── 演出：表情泡泡、電影黑邊、震動 ─────
  emotes: [], cine: 0, cineT: 0,
  ring(x, y, col = '255,230,150', r = 9, dur = 1.6) { (this.rings || (this.rings = [])).push({ x, y, col, r, dur, t: 0 }); },
  shake(t = 0.4) { this.shakeT = Math.max(this.shakeT || 0, t); },
  emote(who, ch, dur = 1.4) { this.emotes = this.emotes.filter(e => e.who !== who); this.emotes.push({ who, ch, t: 0, dur }); },
  emotePos(who) {
    if (who === 'leader' || typeof who === 'number') { const p = this.party[who === 'leader' ? 0 : who]; if (!p) return null; return { x: lerp(p.fx, p.x, p.t), y: lerp(p.fy, p.y, p.t) }; }
    if (who && who.d) { if (who.hidden) return null; const big = who.d.mon ? (MONS[who.d.mon].boss ? 1.2 : 0.4) : 0; return { x: who.mv ? lerp(who.x, who.mv.tx, who.mv.t) : who.x, y: (who.mv ? lerp(who.y, who.mv.ty, who.mv.t) : who.y) - big }; }
    return null;
  },
  drawOverlay(g) {
    const V = L.V, fs = L.FS, dt = 1 / 60;
    // 電影黑邊
    this.cine = lerp(this.cine, this.cineT, 0.12); if (Math.abs(this.cine - this.cineT) < 0.01) this.cine = this.cineT;
    if (this.cine > 0.01) { const bh = Math.round(V.h * 0.085 * this.cine); g.fillStyle = '#05060f'; g.fillRect(V.x, V.y, V.w, bh); g.fillRect(V.x, V.y + V.h - bh, V.w, bh); }
    // 表情泡泡
    for (const e of this.emotes) {
      e.t += dt * (window.__speed || 1);
      const p = this.emotePos(e.who); if (!p) continue;
      const sp = this.toScreen(p.x, p.y), T = sp.T, pop = e.t < 0.18 ? e.t / 0.18 : 1, fade = Math.min(1, (e.dur - e.t) * 4);
      if (fade <= 0) continue;
      const s = fs * 1.5 * (0.6 + 0.4 * pop) * (pop < 1 ? 1 : 1 + Math.max(0, 0.12 - (e.t - 0.18)) * 1.2), x = sp.x + T * 0.5, y = sp.y - T * 0.55 - s * 0.55 + Math.sin(e.t * 6) * fs * 0.06;
      g.globalAlpha = fade;
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, x - s / 2 + 2, y - s / 2 + 3, s, s * 0.9, s * 0.3); g.fill();
      g.fillStyle = '#fffaf0'; rr(g, x - s / 2, y - s / 2, s, s * 0.9, s * 0.3); g.fill();
      g.beginPath(); g.moveTo(x - s * 0.15, y + s * 0.38); g.lineTo(x + s * 0.02, y + s * 0.62); g.lineTo(x + s * 0.18, y + s * 0.38); g.fill();
      g.strokeStyle = '#2a1a3a'; g.lineWidth = Math.max(1.5, fs * 0.09); rr(g, x - s / 2, y - s / 2, s, s * 0.9, s * 0.3); g.stroke();
      const col = { '！': '#e0303a', '？': '#3a6ad8', '♪': '#2a9a5a', '♥': '#e04a7a', '…': '#4a4060' }[e.ch] || '#2a1a3a';
      UI.text(g, e.ch, x, y - s * 0.04, col, s * 0.62, 'center', 'middle', 900);
      g.globalAlpha = 1;
    }
    this.emotes = this.emotes.filter(e => e.t < e.dur);
    // 鐘聲的光環
    for (const r of this.rings || []) {
      r.t += dt * (window.__speed || 1);
      const sp = this.toScreen(r.x, r.y), k = r.t / r.dur, rad = (0.5 + k * r.r) * sp.T;
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = `rgba(${r.col},${(1 - k) * 0.8})`; g.lineWidth = Math.max(2, sp.T * 0.18 * (1 - k));
      g.beginPath(); g.ellipse(sp.x + sp.T / 2, sp.y + sp.T / 2, rad, rad * 0.62, 0, 0, TAU); g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
    if (this.rings) this.rings = this.rings.filter(r => r.t < r.dur);
    if (this.overlayHook) this.overlayHook(g);
  },
  // 地圖上一點在螢幕上的位置（給對話泡泡、表情符號用）
  toScreen(x, y) { const { cx, cy, T } = this.cam(), k = L.k; return { x: L.V.x + (x * T - cx), y: L.V.y + (y * T - cy), T }; },
  drawScene(g) {
    const V = L.V, k = L.k;
    const { cx, cy, T } = this.cam();
    const sx0 = V.x - cx, sy0 = V.y - cy; // 地圖原點在螢幕上的位置
    g.fillStyle = this.isWorld() ? '#1f5cb4' : '#06040c'; g.fillRect(V.x, V.y, V.w, V.h);
    g.save(); g.beginPath(); g.rect(V.x, V.y, V.w, V.h); g.clip();
    g.imageSmoothingEnabled = false;
    const nf = this.baked.length, fr = Math.floor(this.t * (nf > 2 ? 3.2 : 1.6)) % nf, img = this.baked[fr];
    const sx = Math.max(0, cx / k), sy = Math.max(0, cy / k), sw = Math.min(img.width - sx, V.w / k), sh = Math.min(img.height - sy, V.h / k);
    g.drawImage(img, sx, sy, sw, sh, V.x + (sx * k - cx), V.y + (sy * k - cy), sw * k, sh * k);
    // 寶箱閃光
    for (const s of this.spots) if (s.kind === 'glint') { const ph = (this.t * 0.7 + s.x * 0.013) % 1; if (ph < 0.25) { const a = Math.sin(ph / 0.25 * Math.PI); g.fillStyle = `rgba(255,255,230,${a})`; const x = sx0 + (s.x + ph * 24) * k, y = sy0 + s.y * k; g.fillRect(x, y, k, k * 3 * a); g.fillRect(x - k, y + k, k * 3 * a, k); } }
    // 依 y 排序繪製：角色、立體物件、建築外觀
    const ents = [];
    const vis = (x, y) => { const X = sx0 + x * T, Y = sy0 + y * T; return X > -T * 3 && Y > -T * 3 && X < V.x + V.w + T * 3 && Y < V.y + V.h + T * 3; };
    for (const n of this.npcs) if (!n.hidden) {
      const px = n.mv ? lerp(n.x, n.mv.tx, n.mv.t) : n.x, py = n.mv ? lerp(n.y, n.mv.ty, n.mv.t) : n.y;
      if (!vis(px, py)) continue;
      ents.push({ y: py, draw: () => this.drawNpc(g, n, sx0 + px * T, sy0 + py * T, T) });
    }
    for (const v of this.vehicles || []) { const vy = v.y; if (vis(v.x, vy)) ents.push({ y: vy + 0.3, draw: () => v.draw(g, sx0 + v.x * T, sy0 + vy * T, T) }); }
    for (let i = this.party.length - 1; i >= 0; i--) {
      if (this.hideParty) break;
      const p = this.party[i];
      if (i > 0 && p.x === this.leader().x && p.y === this.leader().y && p.t >= 1) continue;
      if (i > 0 && this.party.slice(0, i).some(q => q.x === p.x && q.y === p.y && q.t >= 1 && p.t >= 1)) continue;
      const px = lerp(p.fx, p.x, p.t), py = lerp(p.fy, p.y, p.t);
      ents.push({ y: py - i * 0.001, draw: () => this.drawChar(g, CHARS[G.party[i].id] ? G.party[i].id : 'hero', p.dir, p.t < 1, sx0 + px * T, sy0 + py * T, T, p, G.party[i].hp <= 0) });
    }
    for (const pr of this.props) if (vis(pr.x, pr.y)) ents.push({ y: pr.y + 0.02, draw: () => g.drawImage(pr.img, sx0 + pr.ox * k, sy0 + pr.oy * k, pr.img.width * k, pr.img.height * k) });
    const L0 = this.leader();
    for (const b of this.builds) {
      const inside = this.inBuild(b, L0.x, L0.y) || (L0.t < 1 && this.inBuild(b, L0.fx, L0.fy) && this.inBuild(b, L0.x, L0.y));
      b.alpha = clamp(b.alpha + (inside ? -1 : 1) * 0.12 * (window.__speed || 1), 0, 1);
      if (b.alpha <= 0.01) continue;
      ents.push({ y: b.key, draw: () => { g.globalAlpha = b.alpha; g.drawImage(b.img, sx0 + b.ox * k, sy0 + b.oy * k, b.img.width * k, b.img.height * k); g.globalAlpha = 1; } });
    }
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
    // 室內時把外面調暗
    const inB = this.builds.find(b => b.alpha < 0.5);
    if (inB) { const a = 0.5 * (1 - inB.alpha); g.fillStyle = `rgba(8,6,20,${a})`; const bx = sx0 + inB.x0 * T, by = sy0 + inB.y0 * T, bw = (inB.x1 - inB.x0 + 1) * T, bh = (inB.y1 - inB.y0 + 1) * T; g.fillRect(V.x, V.y, V.w, by - V.y); g.fillRect(V.x, by + bh, V.w, V.y + V.h - by - bh); g.fillRect(V.x, by, bx - V.x, bh); g.fillRect(bx + bw, by, V.x + V.w - bx - bw, bh); }
    FieldFx.drawWorldFx(g, this, sx0, sy0, k, T);
    // 環境光
    const amb = this.ambient();
    if (amb) { g.fillStyle = `rgba(${amb.col},${amb.a})`; g.fillRect(V.x, V.y, V.w, V.h); }
    if (Game.dawn !== undefined && this.id === 'maple') { const d = Game.dawn; g.fillStyle = `rgba(${Math.round(lerp(20, 255, d))},${Math.round(lerp(20, 170, d))},${Math.round(lerp(70, 80, d))},${lerp(0.55, 0.12, d)})`; g.fillRect(V.x, V.y, V.w, V.h); }
    if (this.def.tint) { g.fillStyle = this.def.tint; g.fillRect(V.x, V.y, V.w, V.h); }
    FieldFx.drawLights(g, this, sx0, sy0, k, T, amb);
    g.restore();
  },
  // 大張的怪物圖縮小成地圖用的尺寸（平滑縮小後再加外框，避免最近鄰縮小的破碎感）
  smallArt(art, n) {
    const key = 's' + n; if (art[key]) return art[key];
    const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(art.img, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n), a = d.data;
    for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 110 ? 255 : 0;
    g.putImageData(d, 0, 0);
    return (art[key] = c);
  },
  walkPhase(o, t) { return t < 1 ? (((o.n || 0) & 1) * 2 + (t < 0.5 ? 1 : 2)) & 3 : 0; },
  drawChar(g, id, dir, walking, x, y, T, p, dead) {
    if (LOOKS[id]) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + T / 2, y + T * 0.94, T * 0.32, T * 0.1, 0, 0, TAU); g.fill();
      drawWalker(g, id, dir, this.walkPhase(p, p.t), x, y - T * 0.06, T, dead ? 0.45 : 1);
      return;
    }
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
      g.drawImage(this.smallArt(art, Math.round(s)), Math.round(x + T / 2 - s / 2), Math.round(y + T - s + bob), Math.round(s), Math.round(s));
      return;
    }
    if (LOOKS[n.d.spr]) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + T / 2, y + T * 0.94, T * 0.32, T * 0.1, 0, 0, TAU); g.fill();
      drawWalker(g, n.d.spr, n.dir, this.walkPhase(n, n.mv ? n.mv.t : 1), x, y - T * 0.06, T, LOOKS[n.d.spr].alpha || 1);
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

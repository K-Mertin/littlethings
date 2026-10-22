'use strict';
/* ------------------------------ animal heroes ------------------------------
   阿甲（穿山甲）、水水（水獺）、小鹿（梅花鹿）、跳跳（兔子）. Their looks live in looks.js
   (BEASTS); here are their moves, roster entries and how they are unlocked. */

/* ---------- small helpers ---------- */
function foesNear(f, rx, rz) { return W.fighters.filter(v => v.team !== f.team && !v.dead && !v.invisible && Math.abs(v.x - f.x) < rx && Math.abs(v.z - f.z) < rz); }
function petals(x, y, z, n, col) { for (let i = 0; i < n; i++) addPart('petal', x + rnd(-20, 20), y + rnd(-10, 10), z + rnd(-6, 6), { vx: rnd(-2, 2), vy: rnd(0.5, 2.5), life: 40, col: col || ['#ff8ab3', '#fff6e6', '#ffd0e0'][i % 3] }); }

Object.assign(SKILLS, {
  /* ---- 阿甲 ---- */
  rollball: { name: '滾滾球', cost: 80, dur: 46, start(f) { f.superT = 36; f.hitSet.clear(); Sound.play('jump', 0.6); },
    tick(f, t) {
      if (t >= 6 && t <= 36) { f.vx = f.face * 8.5; if (t % 8 === 6) f.hitSet.clear(); f.meleeHit({ rx: [-14, 34], hy: [0, 46], dz: 18, dmg: 30, kb: 4, kbY: 5, launch: true, sfx: 'heavy' }); if (t % 3 === 0) addPart('dust', f.x - f.face * 12, 2, f.z, {}); }
      else f.vx *= 0.75;
    },
    pose(P, t) { const k = clamp((t - 4) / 4, 0, 1) * (t > 38 ? clamp((44 - t) / 6, 0, 1) : 1); P.rot = t > 4 && t < 40 ? (t - 4) * 0.55 : 0; P.rc = 26; P.ll = [0.9 * k, 2.2 * k]; P.lr = [1.3 * k, 2.4 * k]; P.al = [1.4 * k, 1.8 * k + 1.9 * (1 - k)]; P.ar = [1.6 * k, 1.8 * k + 2 * (1 - k)]; P.lean = 0.9 * k; P.by = 10 * k; } },
  scaleguard: { name: '鱗片反彈', cost: 90, dur: 30, start(f) { f.counterT = 70; Sound.play('block'); addPart('ring', f.x, 40, f.z, { r: 22, grow: 2, life: 18 }); },
    pose(P) { P.ar = [1.6, 2.4]; P.al = [1.4, 2.4]; P.lean = 0.25; P.ht = 0.25; P.by = 4; P.face = 'power'; } },
  megaball: { name: '巨石滾滾', ult: true, cost: 0, dur: 60, start(f) { f.invul = 70; Sound.play('power'); },
    tick(f, t) {
      if (t === 18) { spawnProj(f, 'megaball', { dx: 30, y: 0, vx: 8, dmg: 66, kb: 5, kbY: 9, launch: true, sfx: 'heavy', life: 230, r: 52, dz: 70, tall: true, pierce: true, bounces: 2, noUlt: true, unblock: true }); W.shake = 8; Sound.play('quake', 0.6); }
      if (t < 18 && t % 3 === 0) addPart('dust', f.x + rnd(-20, 20), 2, f.z, {});
    }, pose: raisePose },
  /* ---- 水水 ---- */
  shellrang: { name: '貝殼迴力鏢', cost: 70, dur: 26, tick(f, t) { if (t === 9) { spawnProj(f, 'shell', { dx: 24, y: 44, vx: 8.5, dmg: 30, kb: 2, stun: 20, fall: 30, life: 90, r: 12, boomer: true }); Sound.play('throw'); } }, pose(P, t) { castPose(P, t, 8, 14); } },
  bellyslide: { name: '肚子滑水', cost: 90, dur: 44, start(f) { f.invul = 10; f.hitSet.clear(); Sound.play('wave', 0.5); },
    tick(f, t) {
      if (t >= 6 && t <= 32) { f.vx = f.face * 10; f.meleeHit({ rx: [-6, 44], hy: [-4, 36], dz: 20, dmg: 50, kb: 4, kbY: 6, launch: true, sfx: 'heavy' }); if (t % 2 === 0) addPart('bubbleP', f.x - f.face * 18, rnd(2, 14), f.z + rnd(-8, 8), { vx: -f.face * rnd(1, 3), vy: rnd(1, 3) }); }
      else f.vx *= 0.75;
    },
    pose(P, t) { const k = clamp((t - 2) / 5, 0, 1) * (t > 36 ? clamp((44 - t) / 8, 0, 1) : 1); P.rot = 1.35 * k; P.rc = 24; P.drop = 14 * k; P.ar = [lerp(0.6, 3.0, k), 0.2]; P.al = [lerp(0.4, 2.8, k), 0.2]; P.ll = [-0.2, 0.2]; P.lr = [0.2, 0.2]; P.face = 'happy'; } },
  surf: { name: '衝浪大浪板', ult: true, cost: 0, dur: 84, start(f) { f.invul = 92; f.hitSet.clear(); f.surfT = 84; Sound.play('wave'); },
    tick(f, t) {
      if (t === 10) { spawnProj(f, 'surfwave', { dx: -40, y: 0, vx: 0.001, noHit: true, life: 66 }); f.wave = W.projs[W.projs.length - 1]; }
      if (t >= 12 && t <= 74) {
        const edge = f.face > 0 ? W.camX + Wv - 40 : W.camX + 40; f.vx = (edge - f.x) * f.face > 10 ? f.face * 11 : 0; f.y = Math.max(f.y, 26); f.vy = 0;
        if (f.wave) { f.wave.x = f.x - f.face * 30; f.wave.z = f.z; }
        if (t % 2 === 0) addPart('bubbleP', f.x - f.face * 40 + rnd(-20, 20), rnd(10, 60), f.z + rnd(-20, 20), { vx: -f.face * 2, vy: rnd(1, 3) });
        for (const v of foesNear(f, 70, 70)) if (!f.hitSet.has(v)) { f.hitSet.add(v); hitFoe(f, v, { dmg: 58, kb: 7, kbY: 9, launch: true, sfx: 'heavy' }); W.shake = 6; }
        if (t === 40) { f.face = -f.face; f.hitSet.clear(); }              // ride back the other way
      }
      if (t === 76) { f.vx = 0; f.y = Math.max(f.y, 1); }
    },
    pose(P, t) { P.ar = [2.2, 0.4]; P.al = [-0.6, 0.6]; P.ll = [-0.5, 0.3]; P.lr = [0.6, 0.4]; P.lean = 0.15; P.face = 'happy'; } },
  /* ---- 小鹿 ---- */
  petalshot: { name: '花瓣飛刀', cost: 70, dur: 28, tick(f, t) { if (t === 9) { [-1.6, -0.8, 0, 0.8, 1.6].forEach(vz => spawnProj(f, 'petal', { dx: 26, y: 54, vx: 7.5, vz, dmg: 13, kb: 1.2, stun: 16, fall: 40, life: 80, r: 10 })); Sound.play('wind', 0.5); } }, pose(P, t) { castPose(P, t, 8, 15); } },
  vines: { name: '藤蔓纏繞', cost: 100, dur: 32, tick(f, t) { if (t === 10) { spawnProj(f, 'vine', { dx: 24, y: 2, vx: 6, ground: true, dmg: 20, kb: 0, stun: 70, fall: 0, vine: true, life: 70, r: 14, pierce: true }); Sound.play('pop', 0.6); } }, pose(P, t) { castPose(P, t, 9, 16); P.lean = 0.25; } },
  forest: { name: '森林之心', ult: true, cost: 0, dur: 92, start(f) { f.invul = 100; Sound.play('power'); },
    tick(f, t) {
      if (t % 2 === 0) petals(W.camX + rnd(Wv), rnd(60, 260), rnd(FLOOR_D), 1);
      if (t === 24) { Sound.play('drink'); for (const v of W.fighters) if (v.team === f.team && !v.dead) { v.healT = 150; addPart('ring', v.x, 10, v.z, { r: 14, grow: 4, life: 24 }); } }
      if (t === 52) { W.flashT = 6; W.shake = 14; Sound.play('quake');
        for (const v of foesOf(f)) { for (let k = 0; k < 4; k++) addPart('spike', v.x + rnd(-24, 24), 0, v.z + rnd(-8, 8), { h: rnd(50, 80), col: 'root' }); hitFoe(f, v, { dmg: 125, kb: 3, kbY: 11, launch: true, sfx: 'heavy' }); } }
    }, pose: raisePose },
  /* ---- 跳跳 ---- */
  moonhop: { name: '月亮高跳', cost: 90, dur: 80, start(f) { f.hopped = 0; },
    tick(f, t) {
      if (t === 5) { const g = nearestFoe(f, 360); const dx = g ? g.x - f.x : f.face * 160; f.face = sgn(dx) || f.face; f.vy = 12; f.vx = clamp(dx / 48, -7.5, 7.5); f.vz = g ? clamp((g.z - f.z) / 48, -2, 2) : 0; Sound.play('jump'); }
      if (t > 10 && f.y <= 0 && !f.hopped) {
        f.hopped = t; f.vx = 0; f.vz = 0; W.shake = 8; Sound.play('heavy'); addPart('ring', f.x, 0, f.z, { r: 14, grow: 6, life: 20 });
        for (const v of foesNear(f, 70, 30)) applyHit(f, v, { dmg: 46, kb: 3, kbY: 9, launch: true, sfx: 'heavy' }, sgn(v.x - f.x) || f.face, true);
      }
      if (f.hopped && t > f.hopped + 10) return 'end';
    },
    pose(P, t, f) { if (!f.hopped) { if (t < 5) { P.by = 8; P.lean = 0.3; } else { P.ll = [-0.2, 0.3]; P.lr = [0.3, 0.3]; P.ar = [2.8, 0.2]; P.al = [2.6, 0.2]; P.face = 'happy'; } } else { P.by = 8; P.ll = [-0.6, 1.0]; P.lr = [0.8, 1.2]; P.lean = 0.4; } } },
  kickflurry: { name: '兔兔連環踢', cost: 110, dur: 50,
    tick(f, t) {
      if (t < 40) f.vx = f.face * 2.4; else f.vx *= 0.8;
      if (t >= 6 && t <= 36 && t % 5 === 1) { f.hitSet.clear(); f.meleeHit({ rx: [2, 46], hy: [8, 60], dz: 17, dmg: 10, kb: 0.5, stun: 12, fall: 0, stop: 2 }); Sound.play('whiff', 0.6); }
      if (t === 40) { f.hitSet.clear(); f.meleeHit({ rx: [2, 52], hy: [10, 70], dz: 18, dmg: 30, kb: 6, kbY: 7, launch: true, sfx: 'heavy' }); }
    },
    pose(P, t) { const a = (t / 5 | 0) & 1; P.lean = -0.2; P.ar = [0.2, 1.6]; P.al = [-0.4, 1.4]; if (t >= 38) { P.lr = [1.9, 0]; P.ll = [-0.3, 0.3]; P.lean = -0.45; } else if (a) { P.lr = [1.6, 0.05]; P.ll = [-0.1, 0.3]; } else { P.ll = [1.5, 0.05]; P.lr = [0.1, 0.3]; } } },
  carrots: { name: '胡蘿蔔流星雨', ult: true, cost: 0, dur: 90, start(f) { f.invul = 100; f.carN = 0; Sound.play('power'); },
    tick(f, t) {
      if (t === 6) { f.vy = 10; Sound.play('jump'); }
      if (t >= 16 && t <= 70 && t % 6 === 4) { // every foe on screen gets its own rain: ten carrots and a big one
        const foes = foesOf(f), last = t >= 70;
        for (const v of foes.length ? foes : [null]) {
          const x = v ? v.x + rnd(-14, 14) : W.camX + rnd(60, Wv - 60), z = v ? v.z + rnd(-4, 4) : rnd(FLOOR_D);
          W.projs.push({ kind: 'carrot', owner: f, team: f.team, x, y: 360, z, vx: 0, vy: -12, vz: 0, t: 0, hit: new Set(), face: 1, dmg: last ? 30 : 10, kb: last ? 5 : 1, kbY: last ? 8 : 0, launch: last, stun: 14, fall: last ? 0 : 30, life: 46, r: 16, dz: 20, noUlt: true, unblock: true, last });
        }
        Sound.play('star', 0.5);
      }
    },
    pose(P, t) { const e = (t >> 2) & 1; P.ar = [e ? 2.7 : 1.6, 0.2]; P.al = [e ? 1.6 : 2.7, 0.2]; P.ll = [-0.3, 1.2]; P.lr = [0.6, 1.4]; P.face = 'happy'; } }
});

/* ---------- roster ---------- */
const BEAST_DEF = {
  jia: { blurb: '穿山甲。縮成球滾過去撞人、鱗片擋一下再反彈，大絕招巨石滾滾在畫面上彈來彈去。', hp: 540, spd: 0.95, pow: 0.95, stats: [3, 2, 3], skills: ['rollball', 'scaleguard', 'megaball'], unlockKos: 150 },
  otto: { blurb: '水獺。貝殼迴力鏢會飛回來、肚子滑水把人鏟倒，大絕招踩著浪板來回衝兩趟。', hp: 490, spd: 1.08, pow: 1.0, stats: [2, 3, 3], skills: ['shellrang', 'bellyslide', 'surf'], unlockWins: 10 },
  lulu: { blurb: '梅花鹿。花瓣飛刀一次五片、藤蔓把敵人纏住，大絕招森林之心幫隊友補血、樹根刺全場。', hp: 420, spd: 1.0, pow: 0.84, stats: [2, 3, 2], skills: ['petalshot', 'vines', 'forest'], unlockKos: 300, magic: true },
  bunny: { blurb: '兔子。跳很高再踩下來、連環踢，大絕招胡蘿蔔從天上一直掉下來。', hp: 450, spd: 1.1, pow: 1.0, stats: [3, 3, 1], skills: ['moonhop', 'kickflurry', 'carrots'], unlockKos: 50 }
};
for (const id in BEAST_DEF) CHARS[id] = Object.assign({ name: BEASTS[id].name, en: BEASTS[id].en, look: BEASTS[id].look, combo: ['jab', 'cross', 'kick'], beast: true }, BEAST_DEF[id]);
HEROES.push('bunny', 'jia', 'otto', 'lulu');
Object.assign(CHARS.feng, { hp: 520, pow: 1.18 });   // round-robin balance
HERO_GROUPS.push(['動物', '動物英雄', ['bunny', 'jia', 'otto', 'lulu']]);
/* a third kind of unlock: monsters knocked out in total (any mode, by any human player) */
const _heroUnlocked = heroUnlocked;
heroUnlocked = function (id) { const d = CHARS[id]; if (d && d.unlockKos) return store.get('koTotal', 0) >= d.unlockKos || store.get('unlockAll', false); return _heroUnlocked(id); };
const _unlockText = unlockText;
unlockText = function (id) { const d = CHARS[id]; if (d && d.unlockKos) return `累計打倒 ${d.unlockKos} 隻怪獸解鎖（${Math.min(store.get('koTotal', 0), d.unlockKos)}/${d.unlockKos}）`; return _unlockText(id); };

/* ---------- status effects: 藤蔓, 鱗片反彈 ---------- */
const _applyHit = applyHit;
applyHit = function (att, v, A, dir, area) {
  if (v.counterT > 0 && att && att !== v && !v.dead && !A.noUlt && v.face === -dir) { // scales take the hit and bounce it back
    v.counterT = 0; Sound.play('block'); Sound.play('heavy', 0.6); addPart('spark', v.x + v.face * 14, v.y + 40, v.z, { col: '#ffd34d' }); addPart('ring', v.x, 40, v.z, { r: 18, grow: 5, life: 16 });
    if (!att.dead && Math.abs(att.x - v.x) < 120) _applyHit(v, att, { dmg: 45 + A.dmg * 0.5, kb: 5, kbY: 7, launch: true, sfx: 'heavy', unblock: true }, -dir, true);
    return true;
  }
  const r = _applyHit(att, v, A, dir, area);
  if (r && A.vine && v.state === 'hurt' && !v.def.boss) { v.vineT = 70; v.vx = 0; }
  return r;
};
const _update = Fighter.prototype.update;
Fighter.prototype.update = function () {
  if (this.counterT > 0) this.counterT--;
  if (this.vineT > 0) { this.vineT--; if (this.state !== 'hurt') this.vineT = 0; else { this.vx = 0; this.vz = 0; } }
  if (this.surfT > 0) this.surfT--;
  return _update.call(this);
};

/* ---------- drawing ---------- */
const _drawFighter = drawFighter;
drawFighter = function (c, f) {
  const gy = FLOOR_TOP + f.z, sy = gy - f.y;
  if (f.surfT > 0 && f.state === 'skill') { c.save(); c.translate(f.x, sy + 2); c.scale(f.face, 1); c.beginPath(); c.ellipse(0, 0, 34, 6, 0, 0, TAU); c.fillStyle = '#ff8a3d'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fff6e6'; c.fillRect(-26, -1.5, 52, 3); c.restore(); }
  _drawFighter(c, f);
  if (f.counterT > 0 && !f.dead) { c.save(); c.globalAlpha = 0.4 + Math.sin(f.clock * 0.4) * 0.2; c.strokeStyle = '#ffd34d'; c.lineWidth = 3; c.beginPath(); c.arc(f.x + f.face * 18, sy - 40, 30, -1.1, 1.1); c.stroke(); c.restore(); }
  if (f.vineT > 0 && !f.dead) { // green vines wound around the legs
    c.save(); c.strokeStyle = '#2f8a4a'; c.lineWidth = 3.4; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { c.beginPath(); for (let i = 0; i <= 10; i++) { const yy = gy - i * 4.5, xx = f.x + Math.sin(i * 0.9 + k * 2.1) * (14 - i * 0.3); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
    c.fillStyle = '#5fd08a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(f.x - 12 + k * 8, gy - 10 - (k % 2) * 18, 4, 2, 0.6, 0, TAU); c.fill(); }
    c.restore();
  }
};
const _drawPart = drawPart;
drawPart = function (c, p) {
  if (p.kind === 'petal') { const k = p.t / p.life, x = p.x, y = FLOOR_TOP + p.z - p.y; c.save(); c.globalAlpha = 1 - k; c.translate(x, y); c.rotate(p.t * 0.2 + p.x); c.fillStyle = p.col; c.beginPath(); c.ellipse(0, 0, 4.5, 2.4, 0, 0, TAU); c.fill(); c.restore(); return; }
  if (p.kind === 'spike' && p.col === 'root') { const k = p.t / p.life, x = p.x, gy = FLOOR_TOP + p.z, h = p.h * Math.min(1, p.t / 5) * (1 - Math.max(0, k - 0.7) / 0.3);
    c.save(); c.fillStyle = '#7a5434'; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 7, gy); c.quadraticCurveTo(x - 3, gy - h * 0.6, x + 2, gy - h); c.quadraticCurveTo(x + 2, gy - h * 0.5, x + 7, gy); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5fd08a'; c.beginPath(); c.ellipse(x + 4, gy - h * 0.6, 4, 2, -0.5, 0, TAU); c.fill(); c.restore(); return; }
  _drawPart(c, p);
};
Object.assign(PROJ2, {
  shell(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 9, 3, 0, 0, TAU); c.fill(); c.save(); c.translate(x, y); c.rotate(p.t * 0.5);
    c.beginPath(); c.moveTo(0, 10); for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.1 + i * 0.133); c.quadraticCurveTo(Math.cos(a - 0.07) * 14, Math.sin(a - 0.07) * 14, Math.cos(a) * 12, Math.sin(a) * 12); } c.closePath();
    c.fillStyle = '#ffd0b0'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.strokeStyle = 'rgba(200,110,90,.8)'; c.lineWidth = 1.3; c.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI * (1.2 + i * 0.15); c.moveTo(0, 8); c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); } c.stroke(); c.restore(); },
  petal(c, p, x, gy, y) { c.save(); c.translate(x, y); c.rotate(p.t * 0.35); c.fillStyle = p.t & 2 ? '#ff8ab3' : '#ffc2d6'; c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(0, -7, 9, 0); c.quadraticCurveTo(0, 7, -9, 0); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#c2407a'; c.stroke(); c.restore(); },
  vine(c, p, x, gy) { c.save(); c.strokeStyle = '#2f8a4a'; c.lineWidth = 4; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - p.face * 30, gy); c.quadraticCurveTo(x - p.face * 10, gy - 20 - k * 6 + Math.sin(p.t * 0.4 + k) * 4, x + p.face * (6 + k * 4), gy - 8 - k * 10); c.stroke(); }
    c.fillStyle = '#5fd08a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x - p.face * k * 9, gy - 6 - (k % 2) * 8, 5, 2.5, 0.5 * p.face, 0, TAU); c.fill(); } c.restore(); },
  carrot(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 12, 3.5, 0, 0, TAU); c.fill(); const s = p.last ? 1.8 : 1; c.save(); c.translate(x, y); c.scale(s, s); c.rotate(Math.PI);
    c.beginPath(); c.moveTo(-7, -10); c.quadraticCurveTo(0, -13, 7, -10); c.lineTo(1, 16); c.lineTo(-1, 16); c.closePath(); c.fillStyle = '#ff8a3d'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = 'rgba(160,70,20,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5, -3); c.lineTo(-1, -3); c.moveTo(1, 4); c.lineTo(4, 4); c.stroke();
    c.fillStyle = '#4fae5a'; for (const a of [-0.5, 0, 0.5]) { c.save(); c.translate(0, -11); c.rotate(a); c.beginPath(); c.ellipse(0, -6, 2.6, 7, 0, 0, TAU); c.fill(); c.lineWidth = 1.4; c.stroke(); c.restore(); } c.restore(); },
  megaball(c, p, x, gy) { // 阿甲 rolled into a giant scaly ball
    const r = 46, y = gy - r; c.fillStyle = 'rgba(20,16,40,.28)'; c.beginPath(); c.ellipse(x, gy, r * 1.1, 10, 0, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#f0a94a'; c.fill(); c.save(); c.clip(); c.rotate(p.x / r);
    for (let ring = 0; ring < 4; ring++) for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + ring * 0.3, rr = r * (1 - ring * 0.24); c.beginPath(); c.arc(Math.cos(a) * rr * 0.85, Math.sin(a) * rr * 0.85, r * 0.2, a - 1.2, a + 1.2); c.fillStyle = ring & 1 ? '#d98a2e' : '#e89a3a'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = 'rgba(28,26,46,.6)'; c.stroke(); }
    c.restore(); softShade(c, 0, 0, r, r); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.lineWidth = 3; c.strokeStyle = INK; c.stroke(); c.restore();
    if (p.t % 3 === 0) addPart('dust', x - sgn(p.vx) * r, 2, p.z, {});
  },
  surfwave(c, p, x, gy) { c.save(); c.translate(x, gy); c.scale(sgn(p.owner ? p.owner.face : 1), 1); const s = Math.sin(p.t * 0.4) * 4;
    const g = c.createLinearGradient(0, -110, 0, 10); g.addColorStop(0, '#bff0ff'); g.addColorStop(0.5, '#3fa9ff'); g.addColorStop(1, '#2366c8');
    c.beginPath(); c.moveTo(-120, 10); c.quadraticCurveTo(-60, -30, -10, -70 + s); c.quadraticCurveTo(20, -100, 40, -80); c.quadraticCurveTo(30, -60, 50, -30); c.quadraticCurveTo(60, -10, 70, 10); c.closePath();
    c.globalAlpha = 0.85; c.fillStyle = g; c.fill(); c.globalAlpha = 1; c.lineWidth = 3; c.strokeStyle = '#1c3f8a'; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(-80, -10); c.quadraticCurveTo(-30, -50, 0, -78 + s); c.stroke(); c.restore(); }
});
/* the giant ball bounces off the edges of the screen a couple of times */
const _updateProjs = updateProjs;
updateProjs = function () {
  for (const p of W.projs) if (p.kind === 'megaball' && p.bounces > 0 && ((p.vx > 0 && p.x > W.camX + Wv - 50) || (p.vx < 0 && p.x < W.camX + 50))) { p.vx = -p.vx; p.bounces--; p.hit.clear(); W.shake = 8; Sound.play('heavy', 0.7); }
  _updateProjs();
};

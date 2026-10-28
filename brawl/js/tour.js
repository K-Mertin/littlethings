'use strict';
/* ------------------------------ 第二部：環島大冒險 ------------------------------
   Stages 5–8: 九份山城、日月潭、阿里山、台北 101. New monsters (白鼻心、獨角仙、白鷺鷥、
   虎頭蜂、赤腹松鼠), four bosses (黃魚鴞、曲腰魚王、虎頭蜂女王、雲豹大王), stage hazards
   (遊艇浪、滾木、煙火), backgrounds, music and the story scenes. */

/* ---------- small helpers ---------- */
const nearFoes = (f, rx, rz) => W.fighters.filter(v => v.team !== f.team && !v.dead && !v.invisible && Math.abs(v.x - f.x) < rx && Math.abs(v.z - f.z) < rz);
function tourPuffs(x, y, z, n, col) { for (let i = 0; i < n; i++) addPart('smoke', x + rnd(-16, 16), y + rnd(-8, 8), z, { vx: rnd(-1.2, 1.2), vy: rnd(0.3, 1.4), col }); }

/* ------------------------------ monsters ------------------------------ */
Object.assign(CHARS, {
  civet: { name: '白鼻心', hp: 125, spd: 1.2, pow: 0.75, enemy: true,
    look: mkLook({ style: 'civet', animal: true, skin: '#d9cbb8', hair: '#3a302c', shirt: '#8a7a6a', pants: '#7a6a5a', shoe: '#3a302c', glove: '#3a302c', sleeve: 'none', tail: 'long', belly: '#cfc0aa', angry: true, build: 'slim' }),
    combo: ['jab', 'cross'], skills: ['stink'] },
  squirrel: { name: '赤腹松鼠', hp: 105, spd: 1.15, pow: 0.7, enemy: true, ranged: true,
    look: mkLook({ style: 'squirrel', animal: true, skin: '#e6c9a0', hair: '#7a5a46', shirt: '#7a6a5e', pants: '#c8643c', shoe: '#4a3a30', glove: '#7a6a5e', sleeve: 'none', tail: 'bushy', belly: '#d0703f', angry: true, build: 'slim' }),
    combo: ['jab', 'cross'], skills: ['cone'] },
  beetle: { name: '獨角仙', hp: 230, spd: 0.8, pow: 0.95, size: 1.1, heavy: true, enemy: true, draw: 'beetle',
    look: mkLook({ style: 'beetle', animal: true, shirt: '#7a3a22', skin: '#2b1a14', pants: '#7a3a22' }),
    combo: ['pinch', 'butt'], skills: ['hornlift'] },
  egret: { name: '白鷺鷥', hp: 100, spd: 1.15, pow: 0.75, enemy: true, fly: true, draw: 'egret',
    look: mkLook({ style: 'egret', animal: true, shirt: '#ffffff', skin: '#ffd23f', pants: '#ffffff' }),
    combo: ['bite'], skills: ['swoop'] },
  hornet: { name: '虎頭蜂', hp: 80, spd: 1.25, pow: 0.7, enemy: true, fly: true, draw: 'hornet',
    look: mkLook({ style: 'hornet', animal: true, shirt: '#ffb81c', skin: '#e8732a', pants: '#2b2018' }),
    combo: ['bite'], skills: ['sting'] },
  /* bosses */
  owl: { name: '黃魚鴞', hp: 1500, spd: 0.9, pow: 1.1, size: 1.5, heavy: true, enemy: true, boss: true, fly: true, draw: 'owl',
    look: mkLook({ style: 'owl', animal: true, shirt: '#a8763e', skin: '#f2dcb0', pants: '#8a5e30', acc: '#ffcc33' }),
    combo: ['bite', 'bite'], skills: ['feathers', 'owldive', 'screech'] },
  bigfish: { name: '曲腰魚王', hp: 1700, spd: 0.7, pow: 1.15, size: 1.7, heavy: true, enemy: true, boss: true, draw: 'fish',
    look: mkLook({ style: 'fish', animal: true, shirt: '#9ab4c8', skin: '#e8f2f8', pants: '#5f86a8', crown: true }),
    combo: ['butt', 'sweep1'], skills: ['watergun', 'flop', 'whirl'] },
  queen: { name: '虎頭蜂女王', hp: 1600, spd: 1.0, pow: 1.1, size: 1.6, heavy: true, enemy: true, boss: true, fly: true, draw: 'hornet',
    look: mkLook({ style: 'hornet', animal: true, shirt: '#ffb81c', skin: '#d8551a', pants: '#2b2018', crown: true }),
    combo: ['bite', 'bite'], skills: ['stingdive', 'honey', 'swarm'] },
  leopard: { name: '雲豹大王', hp: 2000, spd: 1.12, pow: 1.15, size: 1.55, heavy: true, enemy: true, boss: true,
    look: mkLook({ style: 'leopard', animal: true, build: 'big', skin: '#f2e2c0', hair: '#4a3a2c', shirt: '#d8b07a', pants: '#c49a62', shoe: '#4a3a2c', glove: '#f2e2c0', sleeve: 'none', tail: 'leopard', belly: '#f6ead2', angry: true, eyeRing: true, spots: '#5a4636' }),
    combo: ['jab', 'cross', 'upper'], skills: ['clawdash', 'leap', 'phantom'] }
});

/* ------------------------------ monster moves ------------------------------ */
Object.assign(SKILLS, {
  /* 白鼻心: a stinky cloud that makes you slow and woozy */
  stink: { name: '臭臭煙', cost: 140, dur: 40, tick(f, t) { if (t === 16) { spawnProj(f, 'gas', { dx: 10, y: 30, vx: 3.2, dmg: 8, stun: 22, fall: 0, stink: true, life: 80, r: 20, dz: 20, pierce: true }); Sound.play('poof'); } },
    pose(P, t) { const e = clamp(t / 12, 0, 1); P.lean = 0.5 * e; P.ht = 0.2; P.ar = [-0.6, 0.6]; P.al = [-0.9, 0.6]; P.lr = [0.6, 0.8]; } },
  /* 赤腹松鼠: lobs a pine cone */
  cone: { name: '丟松果', cost: 0, dur: 34, tick(f, t) { if (t === 16) { spawnProj(f, 'cone', { dx: 22, y: 62, vx: 6.2, vy: 4.2, grav: true, dmg: 20, kb: 2, stun: 20, fall: 50, life: 140, r: 10 }); Sound.play('throw'); } },
    pose(P, t) { const e = clamp((t - 6) / 10, 0, 1); P.ar = [lerp(-2.6, 1.7, e), 0.3]; P.lean = lerp(-0.25, 0.3, e); } },
  /* 獨角仙: charges and flips you up with its horn */
  hornlift: { name: '大角頂', cost: 120, dur: 44, start(f) { f.superT = 36; f.hitSet.clear(); },
    tick(f, t) { if (t >= 10 && t <= 30) { f.vx = f.face * 5.8; f.meleeHit({ rx: [-4, 40], hy: [0, 50], dz: 17, dmg: 26, kb: 2.5, kbY: 9, launch: true, sfx: 'heavy' }); if (t % 3 === 0) addPart('dust', f.x - f.face * 12, 2, f.z, {}); } else f.vx *= 0.8; } },
  /* 虎頭蜂: a straight dash with the stinger; stings poison */
  sting: { name: '螫針', cost: 110, dur: 40, start(f) { f.hitSet.clear(); Sound.play('zap', 0.4); },
    tick(f, t) { if (t >= 10 && t <= 26) { f.vx = f.face * 8; f.swoopY = 18; f.meleeHit({ rx: [-4, 30], hy: [-30, 40], dz: 15, dmg: 14, kb: 2, stun: 20, fall: 40, poison: true }); } else { f.vx *= 0.8; f.swoopY = 0; } } },
  /* ---- 黃魚鴞 ---- */
  feathers: { name: '羽毛飛鏢', cost: 80, dur: 40, tick(f, t) { if (t === 18) { [-2, -1, 0, 1, 2].forEach(k => spawnProj(f, 'feather', { dx: 24, y: f.y + 40, vx: 7, vz: k * 0.9, dmg: 20, kb: 2, stun: 18, fall: 40, life: 90, r: 10 })); Sound.play('slash'); } } },
  owldive: { name: '俯衝抓', cost: 110, dur: 70, start(f) { f.hitSet.clear(); f.diveT = nearestFoe(f, 600); f.superT = 60; },
    tick(f, t) {
      if (t < 22) { f.swoopY = -t * 3; f.vx *= 0.8; return; }                       // rise up high
      if (t === 22) { const g = f.diveT; f.diveX = g && !g.dead ? g.x : f.x + f.face * 160; f.diveZ = g && !g.dead ? g.z : f.z; f.face = sgn(f.diveX - f.x) || f.face; Sound.play('wind'); }
      if (t > 22 && t <= 44) { const k = (t - 22) / 22; f.swoopY = lerp(-66, 30, k); f.vx = clamp((f.diveX - f.x) * 0.18, -9, 9); f.z += clamp(f.diveZ - f.z, -2, 2);
        f.meleeHit({ rx: [-16, 34], hy: [-40, 40], dz: 18, dmg: 40, kb: 4, kbY: 6, launch: true, sfx: 'heavy' }); }
      if (t === 45) { f.vx = 0; W.shake = 8; addPart('ring', f.x, 0, f.z, { r: 12, grow: 6, life: 20 }); f.areaHit({ rx: 90, dz: 34, dmg: 22, kb: 3, kbY: 5, launch: true, groundOnly: true, once: true }); Sound.play('heavy'); }
      if (t > 50) f.swoopY = lerp(f.swoopY, 0, 0.2);
    } },
  screech: { name: '咕咕大叫', cost: 120, dur: 54, start(f) { f.superT = 50; },
    tick(f, t) {
      if (t === 16) { Sound.play('roar'); Sound.play('zap', 0.6); W.shake = 8; addPart('ring', f.x, 60, f.z, { r: 20, grow: 10, life: 24 }); addPart('ring', f.x, 60, f.z, { r: 4, grow: 8, life: 28 });
        for (const v of nearFoes(f, 200, 70)) { if (v.invul > 0) continue; v.vx = sgn(v.x - f.x) * 4; if (v.canAct() || v.state === 'defend' || v.state === 'atk') { v.set('dizzy'); v.st = 34; } } }
    } },
  /* ---- 曲腰魚王 ---- */
  watergun: { name: '水柱砲', cost: 80, dur: 40, tick(f, t) { if (t === 18) { spawnProj(f, 'water', { dx: 40, y: 50, vx: 9.5, dmg: 34, kb: 4, kbY: 4, launch: true, life: 90, r: 18, pierce: true }); Sound.play('wave', 0.6); } } },
  flop: { name: '肚子拍地', cost: 100, dur: 84, start(f) { f.slammed = false; f.superT = 70; },
    tick(f, t) {
      if (t === 10) { const g = nearestFoe(f, 500); f.vy = 11; f.vx = g ? clamp((g.x - f.x) / 44, -5, 5) : f.face * 3; Sound.play('jump'); }
      if (t > 12 && f.y <= 0 && !f.slammed) { f.slammed = t; f.vx = 0; Sound.play('quake'); Sound.play('wave', 0.5); W.shake = 14;
        f.areaHit({ rx: 150, dz: 52, dmg: 40, kb: 5, kbY: 7, launch: true, groundOnly: true, sfx: 'heavy' });
        addPart('ring', f.x, 0, f.z, { r: 14, grow: 8, life: 24 }); for (let i = 0; i < 16; i++) addPart('bubbleP', f.x + rnd(-80, 80), rnd(4, 40), f.z + rnd(-20, 20), { vy: rnd(1, 4), vx: rnd(-3, 3) }); }
      if (f.slammed && t > f.slammed + 18) return 'end';
    } },
  whirl: { name: '大漩渦', cost: 140, dur: 80, start(f) { f.superT = 76; Sound.play('wave'); },
    tick(f, t) {
      if (t % 3 === 0) { const a = t * 0.4; addPart('bubbleP', f.x + Math.cos(a) * 110, 6, f.z + Math.sin(a) * 40, { vx: -Math.cos(a) * 2, vy: 0.5 }); }
      if (t >= 10 && t <= 62) for (const v of nearFoes(f, 240, 80)) if (v.y < 30 && v.state !== 'lying' && v.invul <= 0) { v.x += sgn(f.x - v.x) * 1.3; v.z += sgn(f.z - v.z) * 0.5; }
      if (t === 66) { W.shake = 10; Sound.play('wave'); f.areaHit({ rx: 110, dz: 44, dmg: 36, kb: 5, kbY: 8, launch: true, sfx: 'heavy' }); addPart('ring', f.x, 0, f.z, { r: 20, grow: 7, life: 22 }); }
    } },
  /* ---- 虎頭蜂女王 ---- */
  stingdive: { name: '女王螫針', cost: 100, dur: 56, start(f) { f.hitSet.clear(); f.diveT = nearestFoe(f, 600); f.superT = 50; },
    tick(f, t) {
      if (t < 16) { f.swoopY = -t * 2.5; f.vx *= 0.8; return; }
      if (t === 16) { const g = f.diveT; f.face = g && !g.dead ? sgn(g.x - f.x) || f.face : f.face; Sound.play('zap'); }
      if (t > 16 && t <= 36) { f.vx = f.face * 10; f.swoopY = lerp(-40, 30, (t - 16) / 20); f.meleeHit({ rx: [-10, 36], hy: [-40, 50], dz: 18, dmg: 30, kb: 4, kbY: 5, launch: true, poison: true, sfx: 'heavy' }); }
      if (t > 36) { f.vx *= 0.8; f.swoopY = lerp(f.swoopY, 0, 0.2); }
    } },
  honey: { name: '蜂蜜彈', cost: 80, dur: 40, tick(f, t) { if (t === 18) { [-1.4, 0, 1.4].forEach((vz, k) => spawnProj(f, 'honey', { dx: 20, y: f.y + 60, vx: 4.5 + k * 0.9, vy: 3.5, vz, grav: true, dmg: 18, stun: 24, fall: 40, sticky: true, life: 150, r: 14 })); Sound.play('pop'); } } },
  swarm: { name: '叫蜂群', cost: 170, dur: 40, tick(f, t) {
      if (t === 20 && W.fighters.filter(x => x.id === 'hornet' && !x.dead).length < 4) { for (const side of [-1, 1]) { const h = new Fighter('hornet', f.team, f.x + side * 90, clamp(f.z + rnd(-30, 30), 20, FLOOR_D - 20), new AICtl()); h.y = 120; W.fighters.push(h); smoke(h); } Sound.play('zap'); }
    } },
  /* ---- 雲豹大王 ---- */
  clawdash: { name: '雲豹連爪', cost: 90, dur: 50, start(f) { f.superT = 44; f.hitSet.clear(); Sound.play('slash'); },
    tick(f, t) {
      if (t >= 6 && t <= 34) { f.vx = f.face * 7 * (f.rage ? 1.2 : 1); if (t % 7 === 6) { f.hitSet.clear(); f.meleeHit({ rx: [-6, 42], hy: [10, 80], dz: 18, dmg: 12, kb: 1, stun: 14, fall: 0, stop: 2 }); addPart('slash', f.x + f.face * 30, 50, f.z, { face: f.face }); Sound.play('slash', 0.5); } }
      else f.vx *= 0.75;
      if (t === 38) { f.hitSet.clear(); f.meleeHit({ rx: [-6, 50], hy: [10, 90], dz: 20, dmg: 34, kb: 5.5, kbY: 6, launch: true, sfx: 'heavy' }); }
    },
    pose(P, t) { const a = (t / 7 | 0) & 1; P.lean = 0.55; P.ll = [-0.8, 0.3]; P.lr = [0.8, 0.7]; if (a) { P.ar = [1.7, 0.1]; P.al = [0.5, 1.8]; } else { P.al = [1.7, 0.1]; P.ar = [0.5, 1.8]; } } },
  leap: { name: '飛撲', cost: 100, dur: 90, start(f) { f.hopped = 0; f.superT = 80; },
    tick(f, t) {
      if (t === 12) { const g = nearestFoe(f, 520); const dx = g ? g.x - f.x : f.face * 200; f.face = sgn(dx) || f.face; f.vy = 10.5; f.vx = clamp(dx / 42, -8, 8); f.vz = g ? clamp((g.z - f.z) / 42, -2, 2) : 0; Sound.play('roar', 0.5); }
      if (t > 14 && f.y <= 0 && !f.hopped) { f.hopped = t; f.vx = 0; f.vz = 0; W.shake = 10; Sound.play('heavy'); addPart('ring', f.x, 0, f.z, { r: 14, grow: 7, life: 20 });
        f.areaHit({ rx: 95, dz: 36, dmg: 40, kb: 4, kbY: 7, launch: true, groundOnly: true, sfx: 'heavy', once: true }); }
      if (f.hopped && t > f.hopped + 14) return 'end';
    },
    pose(P, t, f) { if (t < 12) { P.by = 8; P.lean = 0.5; } else if (!f.hopped) { P.lean = 0.6; P.ar = [2.2, 0.2]; P.al = [2.0, 0.3]; P.ll = [-1.0, 0.4]; P.lr = [0.4, 1.0]; } else { P.by = 8; P.lean = 0.5; P.ar = [1.2, 0.2]; P.al = [1.0, 0.2]; } } },
  phantom: { name: '雲影瞬身', cost: 130, dur: 46,
    start(f) { f.invul = 26; f.stepTgt = nearestFoe(f, 600); smoke(f); },
    tick(f, t) {
      if (t === 1) f.invisible = true;
      if (t === 14) {
        const g = f.stepTgt;
        if (g && !g.dead) { f.x = clamp(g.x - g.face * 44, W.minX + 10, W.maxX - 10); f.z = g.z; f.face = sgn(g.x - f.x) || f.face; }
        f.invisible = false; smoke(f); f.hitSet.clear(); Sound.play('slash');
      }
      if (t >= 20 && t <= 26) { f.meleeHit({ rx: [-6, 56], hy: [0, 90], dz: 20, dmg: 44, kb: 5, kbY: 6, launch: true, sfx: 'heavy' }); if (t === 20) addPart('slash', f.x + f.face * 30, 50, f.z, { face: f.face }); }
    },
    pose(P, t) { if (t < 20) { P.by = 6; P.lean = 0.4; } else { P.ar = [lerp(2.6, 1.0, clamp((t - 20) / 4, 0, 1)), 0.1]; P.al = [0.4, 1.6]; P.lean = 0.5; P.ll = [-0.6, 0.2]; P.lr = [0.9, 0.9]; } } }
});

/* status effects from the new monsters: stink (slow, green fumes), poison (hp drips away), honey (stuck) */
{
  const _hit = applyHit;
  applyHit = function (att, v, A, dir, area) {
    const r = _hit(att, v, A, dir, area);
    if (r && !v.dead && v.state !== 'defend') {
      if (A.stink) { v.inkT = Math.max(v.inkT || 0, 150); v.stinkT = 150; }
      if (A.poison && !v.def.enemy) v.poisonT = 150;
      if (A.sticky) { v.inkT = Math.max(v.inkT || 0, 120); v.honeyT = 120; }
    }
    return r;
  };
  const _up = Fighter.prototype.update;
  Fighter.prototype.update = function () {
    if (this.stinkT > 0) { this.stinkT--; if (this.stinkT % 12 === 0) addPart('stinkP', this.x + rnd(-10, 10), 70 + rnd(0, 20), this.z, { vy: 0.6, life: 30 }); }
    if (this.honeyT > 0) this.honeyT--;
    if (this.poisonT > 0) { this.poisonT--; if (this.poisonT % 15 === 0 && !this.dead && !this.dying && this.hp > 1) { this.hp = Math.max(1, this.hp - 3); this.cap = Math.max(this.hp, this.cap - 1); this.flash = 2; addPart('stinkP', this.x + rnd(-8, 8), 50, this.z, { vy: 1, life: 24, col: '#9be564' }); } }
    // 雲豹大王 gets angry at half health: faster, with a red glow, and calls for help
    if (this.id === 'leopard' && !this.rage && !this.dead && this.hp < this.maxHp * 0.5) { this.rage = true; this.spd *= 1.18; this.pow *= 1.08; this.auraT = 22; message('雲豹大王生氣了！', '動作變快了，小心！', 90); Sound.play('roar'); W.shake = 10; }
    if (this.rage && this.clock % 50 === 0) this.auraT = 22;
    return _up.call(this);
  };
  const _ink = inkSplat;
  inkSplat = function (c, f) { if (f.stinkT > 0 || f.honeyT > 0) return; _ink(c, f); };
}

/* ------------------------------ drawing: heads on the shared skeleton ------------------------------ */
{
  const _hair = drawHair;
  drawHair = function (c, L, back, f, P) {
    const R = HR, t = f ? f.clock : 0;
    switch (L.style) {
      case 'civet': { // 白鼻心: dark mask, white stripe down the nose, round ears
        if (back) { blob(c, -6, -R + 3, 5, 5, shade(L.fur, -0.2)); return; }
        blob(c, 3, -R + 1, 4.6, 4.6, L.fur); c.beginPath(); c.arc(3, -R + 1, 2.2, 0, TAU); c.fillStyle = '#d9b0a0'; c.fill();
        c.fillStyle = L.hair; c.beginPath(); c.ellipse(R * 0.42, -1, 8.5, 5.2, -0.1, 0, TAU); c.fill();
        c.fillStyle = '#fbf6ee'; c.beginPath(); c.moveTo(-2, -R + 1); c.quadraticCurveTo(R * 0.5, -6, R + 3, 2); c.lineTo(R + 2, 5); c.quadraticCurveTo(R * 0.5, -2, -4, -R + 3); c.closePath(); c.fill();
        blob(c, R * 0.78, 5, 6, 4.5, L.skin); c.fillStyle = INK; c.beginPath(); c.ellipse(R * 0.78 + 5, 3.6, 2.2, 1.7, 0, 0, TAU); c.fill();
        c.fillStyle = '#fbf6ee'; c.beginPath(); c.arc(R * 0.45, 4.5, 1.6, 0, TAU); c.fill();
        if (P.mouth) { c.beginPath(); c.ellipse(R * 0.7, 9.5, 3, 2.2, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); }
        return;
      }
      case 'squirrel': { // 赤腹松鼠: tufted ears, cheeks full of nuts
        if (back) { c.beginPath(); c.moveTo(-9, -R + 5); c.lineTo(-7, -R - 8); c.lineTo(-2, -R + 2); c.closePath(); c.fillStyle = shade(L.fur, -0.2); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); return; }
        c.beginPath(); c.moveTo(-1, -R + 2); c.lineTo(2, -R - 9); c.lineTo(7, -R + 3); c.closePath(); c.fillStyle = L.fur; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
        c.beginPath(); c.moveTo(1, -R - 6); c.lineTo(2, -R - 12); c.lineTo(4, -R - 6); c.fillStyle = L.hair; c.fill();
        blob(c, R * 0.55, 5.5, 7, 5.5, L.skin); c.fillStyle = INK; c.beginPath(); c.arc(R * 0.55 + 6, 3, 1.5, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.fillRect(R * 0.55 + 2, 7.5, 2.2, 3); c.strokeStyle = INK; c.lineWidth = 0.8; c.strokeRect(R * 0.55 + 2, 7.5, 2.2, 3);
        return;
      }
      case 'leopard': { // 雲豹大王: big cat with cloud-shaped patches and a crown
        if (back) { [[-8, -R + 4], [3, -R + 1]].forEach(([x, y], k) => { blob(c, x, y, 5.5, 5.5, k ? L.fur : shade(L.fur, -0.15)); }); return; }
        c.save(); c.beginPath(); c.arc(0, 0, R + 0.4, 0, TAU); c.clip();
        c.fillStyle = L.spots; c.globalAlpha = 0.85;
        for (const [x, y, r] of [[-7, -6, 3.6], [-2, -10, 2.6], [-9, 3, 3], [-3, 4, 2.2]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.7, 0.4, 0, TAU); c.fill(); c.fillStyle = L.fur; c.beginPath(); c.ellipse(x + 0.4, y, r * 0.45, r * 0.3, 0.4, 0, TAU); c.fill(); c.fillStyle = L.spots; }
        c.restore();
        blob(c, 4, -R + 1, 4.6, 4.6, L.fur); c.beginPath(); c.arc(4, -R + 1, 2, 0, TAU); c.fillStyle = L.spots; c.fill();
        blob(c, R * 0.74, 5, 7, 5, L.skin); c.fillStyle = '#c96a6a'; c.beginPath(); c.moveTo(R * 0.74 + 3, 1.8); c.lineTo(R * 0.74 + 8, 1.8); c.lineTo(R * 0.74 + 5.5, 5); c.closePath(); c.fill();
        c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(R * 0.74 + 5, 6); c.lineTo(R + 9, 4); c.moveTo(R * 0.74 + 5, 7.4); c.lineTo(R + 9, 8.6); c.stroke();
        if (P.mouth) { c.beginPath(); c.ellipse(R * 0.7, 10, 3.6, 2.6, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); c.fillStyle = '#fff'; c.fillRect(R * 0.62, 8, 1.4, 2.2); }
        // a little golden crown
        c.beginPath(); c.moveTo(-8, -R + 1); c.lineTo(-7, -R - 8); c.lineTo(-3, -R - 3); c.lineTo(0, -R - 10); c.lineTo(3, -R - 3); c.lineTo(7, -R - 8); c.lineTo(7, -R + 1); c.closePath();
        c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); blob(c, 0, -R - 2, 1.6, 1.6, '#3fa9ff');
        return;
      }
    }
    return _hair(c, L, back, f, P);
  };
  const _tail = drawTail;
  drawTail = function (c, L, hip, f) {
    const t = f ? f.clock : 0, y = hip.y;
    if (L.tail === 'bushy') { const w = Math.sin(t * 0.09) * 3; c.beginPath(); c.moveTo(-5, y + 2); c.quadraticCurveTo(-30, y + 6, -26, y - 22 + w); c.quadraticCurveTo(-22, y - 38 + w, -8, y - 32 + w); c.quadraticCurveTo(-16, y - 22, -6, y - 4); c.closePath(); c.fillStyle = L.fur; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.strokeStyle = shade(L.fur, 0.25); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-12, y - 2); c.quadraticCurveTo(-24, y - 14, -16, y - 28 + w); c.stroke(); return; }
    if (L.tail === 'leopard') { const w = Math.sin(t * 0.08) * 4; seg(c, [P2(-4, y + 2), P2(-20, y + 8), P2(-36, y - 2 + w), P2(-40, y - 18 + w)], 6, L.fur); c.fillStyle = L.spots; for (let k = 0; k < 4; k++) { const p = k / 3; c.beginPath(); c.arc(lerp(-12, -39, p), lerp(y + 6, y - 14 + w, p), 2.6, 0, TAU); c.fill(); } return; }
    return _tail(c, L, hip, f);
  };
}

/* ------------------------------ drawing: custom monsters ------------------------------ */
function tourDown(f) { return f.state === 'lying' || f.state === 'dead'; }
function tourHurt(f) { return f.state === 'hurt' || f.state === 'fall' || tourDown(f); }
function tourEyes(c, pts, r, hurt, col) {
  for (const [x, y] of pts) {
    if (hurt) { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r * 0.7, y - r * 0.7); c.lineTo(x + r * 0.7, y + r * 0.7); c.moveTo(x + r * 0.7, y - r * 0.7); c.lineTo(x - r * 0.7, y + r * 0.7); c.stroke(); continue; }
    blob(c, x, y, r, r * 1.1, col || '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(x + r * 0.3, y, r * 0.5, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + r * 0.5, y - r * 0.3, r * 0.2, 0, TAU); c.fill();
  }
}
function drawBeetle(c, f) {
  const t = f.clock, L = f.look, hurt = tourHurt(f), walk = f.state === 'walk' || f.state === 'run' || f.state === 'skill' ? Math.sin(t * 0.5) : 0;
  const lift = f.state === 'skill' && f.st > 8 && f.st < 34 ? 1 : f.state === 'atk' ? ext(f.st, 1, f.atk.on, f.atk.off, f.atk.dur) : 0;
  c.save(); if (tourDown(f)) { c.translate(0, -14); c.rotate(Math.PI); c.translate(0, 16); } else if (f.state === 'fall') c.rotate(-0.6);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) seg(c, [P2(-10 + k * 9, -12), P2(-12 + k * 9 + sd * 3, -4 + (k & 1 ? walk : -walk) * 2), P2(-14 + k * 10 + sd * 4, 0)], 2.4, L.skin);
  // body (dark under-part) and the glossy shell
  blob(c, 2, -16, 24, 12, L.skin);
  c.beginPath(); c.moveTo(-26, -14); c.quadraticCurveTo(-24, -38, 2, -38); c.quadraticCurveTo(20, -36, 22, -16); c.closePath(); c.fillStyle = L.shirt; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
  c.strokeStyle = 'rgba(28,26,46,.5)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2, -37); c.lineTo(-4, -15); c.stroke();
  c.fillStyle = 'rgba(255,220,180,.45)'; c.beginPath(); c.ellipse(-8, -30, 9, 3.5, -0.3, 0, TAU); c.fill();
  // head and horn
  blob(c, 24, -20, 10, 9, L.skin);
  c.save(); c.translate(26, -26); c.rotate(-0.3 - lift * 0.7);
  c.beginPath(); c.moveTo(-2, 2); c.quadraticCurveTo(14, -4, 22, -20); c.lineTo(26, -26); c.lineTo(24, -16); c.lineTo(30, -18); c.lineTo(24, -10); c.quadraticCurveTo(14, 2, 6, 6); c.closePath(); c.fillStyle = shade(L.shirt, -0.2); c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.restore();
  tourEyes(c, [[28, -21]], 2.6, hurt, '#ffcc33');
  c.restore();
}
function drawEgret(c, f) {
  const t = f.clock, L = f.look, down = tourHurt(f) || f.state === 'getup', flap = down ? 0.2 : Math.sin(t * (f.state === 'skill' ? 0.9 : 0.42));
  c.save(); c.translate(0, -12);
  if (tourDown(f)) { c.translate(0, 8); c.rotate(Math.PI * 0.85); } else if (f.state === 'hurt' || f.state === 'fall') c.rotate(-0.5); else if (f.state === 'skill') c.rotate(0.35);
  c.lineJoin = 'round'; c.lineCap = 'round';
  seg(c, [P2(-2, 6), P2(-4, 18)], 2, '#2b2733'); seg(c, [P2(4, 6), P2(4, 18)], 2, '#2b2733');
  const wing = (dy, col) => { c.save(); c.rotate(-flap * 0.8); c.beginPath(); c.moveTo(-6, dy); c.quadraticCurveTo(-14, dy - 30, 6, dy - 36); c.quadraticCurveTo(10, dy - 14, 6, dy); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.restore(); };
  wing(-2, '#e6e6ee');
  blob(c, 0, 0, 14, 9, L.shirt);
  c.beginPath(); c.moveTo(-12, 2); c.lineTo(-24, 6); c.lineTo(-12, 7); c.fillStyle = '#f2f2f6'; c.fill();
  seg(c, [P2(8, -4), P2(12, -14), P2(10, -22)], 5, L.shirt);
  blob(c, 12, -24, 6.5, 6, L.shirt);
  c.beginPath(); c.moveTo(16, -25); c.lineTo(32, -22); c.lineTo(16, -21); c.closePath(); c.fillStyle = L.skin; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
  seg(c, [P2(8, -27), P2(0, -30), P2(-6, -26)], 1.6, '#ffffff');
  tourEyes(c, [[14, -26]], 1.8, down, '#ffd23f');
  wing(-1, L.shirt);
  c.restore();
}
function drawHornet(c, f) {
  const t = f.clock, L = f.look, down = tourHurt(f) || f.state === 'getup', queen = L.crown;
  c.save(); c.translate(0, -14);
  if (tourDown(f)) { c.translate(0, 8); c.rotate(Math.PI * 0.85); } else if (f.state === 'hurt' || f.state === 'fall') c.rotate(-0.5); else if (f.state === 'skill' && (f.skill === 'sting' || f.skill === 'stingdive') && f.vx) c.rotate(0.25);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // wings: a blur of two transparent ovals
  if (!tourDown(f)) { const w = Math.sin(t * 1.6) * 0.3; c.save(); c.globalAlpha = 0.55; for (const [dx, a] of [[-4, -0.9 + w], [2, -0.6 - w]]) { c.save(); c.translate(dx, -10); c.rotate(a); c.beginPath(); c.ellipse(0, -10, 6, 13, 0, 0, TAU); c.fillStyle = '#e8f6ff'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = '#7a8ca8'; c.stroke(); c.restore(); } c.restore(); }
  // striped abdomen with the stinger
  c.save(); c.translate(-12, 2); c.rotate(0.35); c.beginPath(); c.ellipse(0, 0, 12, 8, 0, 0, TAU); c.fillStyle = L.shirt; c.fill();
  c.save(); c.clip(); c.fillStyle = L.pants; for (const x of [-7, -1, 5]) c.fillRect(x, -9, 3, 18); c.restore(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(-11, -2); c.lineTo(-19, 1); c.lineTo(-11, 3); c.closePath(); c.fillStyle = '#2b2018'; c.fill(); c.restore();
  blob(c, 2, -2, 7, 6.5, L.pants);
  blob(c, 11, -6, 8, 7.5, L.skin);
  c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(15, -2, 4, 2.5, 0, 0, TAU); c.fill();
  seg(c, [P2(10, -12), P2(12, -20), P2(16, -21)], 1.4, '#2b2018'); seg(c, [P2(13, -12), P2(17, -18), P2(21, -18)], 1.4, '#2b2018');
  tourEyes(c, [[14, -8]], 2.3, down, '#2b2018');
  if (!down) { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(11, -12.5); c.lineTo(16, -11); c.stroke(); }
  for (const [x, a] of [[0, 0.3], [4, 0.1]]) seg(c, [P2(x, 3), P2(x - 2 + Math.sin(t * 0.3 + a) * 1.5, 10)], 1.6, '#2b2018');
  if (queen) { c.beginPath(); c.moveTo(6, -13); c.lineTo(7, -22); c.lineTo(10, -16); c.lineTo(12, -24); c.lineTo(14, -16); c.lineTo(17, -22); c.lineTo(17, -12); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); }
  c.restore();
}
function drawOwl(c, f) {
  const t = f.clock, L = f.look, down = tourHurt(f) || f.state === 'getup';
  const screech = f.state === 'skill' && f.skill === 'screech' && f.st > 10 && f.st < 40, diving = f.state === 'skill' && f.skill === 'owldive' && f.st > 22 && f.st < 46;
  const flap = down ? 0.15 : Math.sin(t * (diving ? 0.2 : f.state === 'skill' ? 0.7 : 0.3));
  c.save(); c.translate(0, -18);
  if (tourDown(f)) { c.translate(0, 12); c.rotate(-Math.PI / 2); c.translate(16, 0); } else if (f.state === 'hurt' || f.state === 'fall') c.rotate(-0.35); else if (diving) c.rotate(0.6);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const wing = (back) => { c.save(); c.translate(back ? -6 : -2, -20); c.rotate(diving ? -1.1 : -0.25 - flap * 0.6); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-26, -6, -34, 14); c.lineTo(-26, 12); c.lineTo(-28, 22); c.lineTo(-18, 18); c.lineTo(-16, 28); c.quadraticCurveTo(-4, 20, 4, 12); c.closePath(); c.fillStyle = back ? shade(L.shirt, -0.25) : shade(L.shirt, -0.08); c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = 'rgba(28,26,46,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, 4); c.lineTo(-22, 14); c.moveTo(-6, 10); c.lineTo(-14, 22); c.stroke(); c.restore(); };
  wing(true);
  // talons
  for (const x of [-4, 6]) { seg(c, [P2(x, 2), P2(x, 10)], 3, '#e8b84a'); c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 3, 12); c.lineTo(x, 9); c.lineTo(x + 3, 12); c.stroke(); }
  // body with streaky chest
  c.beginPath(); c.ellipse(0, -18, 20, 23, 0, 0, TAU); c.fillStyle = L.shirt; c.fill();
  c.save(); c.clip(); c.fillStyle = L.skin; c.beginPath(); c.ellipse(5, -12, 12, 16, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(122,82,40,.7)'; c.lineWidth = 1.5;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-2 + k * 6, -22 + r * 7); c.lineTo(-1 + k * 6, -18 + r * 7); c.stroke(); } c.restore();
  c.beginPath(); c.ellipse(0, -18, 20, 23, 0, 0, TAU); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
  // head: ear tufts, facial disc, big yellow eyes
  for (const [x, a] of [[-10, -0.5], [8, 0.35]]) { c.save(); c.translate(x, -50); c.rotate(a); c.beginPath(); c.moveTo(-4, 4); c.lineTo(0, -10); c.lineTo(5, 4); c.closePath(); c.fillStyle = shade(L.shirt, -0.15); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.restore(); }
  blob(c, 0, -40, 18, 15, L.shirt);
  c.beginPath(); c.ellipse(5, -39, 13, 11, 0, 0, TAU); c.fillStyle = shade(L.skin, -0.05); c.fill();
  if (down) tourEyes(c, [[0, -41], [12, -41]], 4.4, true);
  else { for (const x of [0, 12]) { blob(c, x, -41, 5.6, 5.6, L.acc); c.fillStyle = INK; c.beginPath(); c.arc(x + 1, -41, screech ? 1.8 : 3, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 2, -43, 1.1, 0, TAU); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-5, -49); c.lineTo(5, -45); c.moveTo(17, -49); c.lineTo(8, -45); c.stroke(); }
  c.beginPath(); c.moveTo(4, -36); c.lineTo(10, -36); c.lineTo(7, screech ? -28 : -31); c.closePath(); c.fillStyle = '#5a5a66'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
  if (screech) { c.beginPath(); c.ellipse(7, -31, 3, 2.4, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); }
  wing(false);
  c.restore();
}
function drawFish(c, f) {
  const t = f.clock, L = f.look, hurt = tourHurt(f), walk = f.state === 'walk' || f.state === 'run' ? Math.sin(t * 0.35) : 0;
  const gun = f.state === 'skill' && f.skill === 'watergun' && f.st > 10 && f.st < 30, flop = f.state === 'skill' && f.skill === 'flop' && f.st > 10, spin = f.state === 'skill' && f.skill === 'whirl' && f.st < 66;
  c.save();
  if (tourDown(f)) { c.translate(0, -8); c.rotate(-Math.PI / 2); c.translate(18, 0); } else if (f.state === 'fall') c.rotate(-0.5); else if (flop) c.rotate(f.y > 4 ? -0.4 : 0.9);
  if (spin) c.scale(Math.cos(t * 0.5) > 0 ? 1 : -1, 1);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // two fin feet that waddle
  for (const [x, ph] of [[-8, 0], [8, Math.PI]]) { c.save(); c.translate(x, -3); c.rotate(Math.sin(t * 0.35 + ph) * 0.3 * Math.abs(walk) + 0.1); c.beginPath(); c.moveTo(-6, -4); c.quadraticCurveTo(0, 4, 9, 2); c.lineTo(6, -6); c.closePath(); c.fillStyle = L.pants; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.restore(); }
  // tail fin behind
  c.save(); c.translate(-18, -26); c.rotate(Math.sin(t * 0.15) * 0.2); c.beginPath(); c.moveTo(0, 0); c.lineTo(-18, -16); c.quadraticCurveTo(-12, 0, -18, 16); c.closePath(); c.fillStyle = L.pants; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.restore();
  // fat silvery body, curved back (曲腰)
  c.beginPath(); c.moveTo(-22, -24); c.quadraticCurveTo(-18, -54, 6, -54); c.quadraticCurveTo(28, -52, 30, -30); c.quadraticCurveTo(30, -8, 6, -6); c.quadraticCurveTo(-18, -6, -22, -24); c.closePath();
  const g = c.createLinearGradient(0, -54, 0, -6); g.addColorStop(0, L.shirt); g.addColorStop(1, L.skin); c.fillStyle = g; c.fill(); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
  c.save(); c.clip(); c.strokeStyle = 'rgba(80,110,140,.35)'; c.lineWidth = 1.2; for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-12 + k * 8 + (r & 1) * 4, -40 + r * 8, 4, 0.2, Math.PI - 0.2); c.stroke(); } c.restore();
  // dorsal and side fins
  c.beginPath(); c.moveTo(-6, -53); c.quadraticCurveTo(0, -66, 12, -60); c.lineTo(10, -53); c.closePath(); c.fillStyle = L.pants; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.save(); c.translate(6, -26); c.rotate(Math.sin(t * 0.2) * 0.3 + (gun ? -0.6 : 0)); c.beginPath(); c.ellipse(-4, 4, 8, 4, 0.6, 0, TAU); c.fillStyle = L.pants; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); c.restore();
  // face: eye and big pouty lips
  tourEyes(c, [[18, -38]], 4.4, hurt);
  if (!hurt) { c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath(); c.moveTo(13, -46); c.lineTo(23, -43); c.stroke(); }
  c.beginPath(); c.ellipse(31, -26, gun ? 4.5 : 3.2, gun ? 5 : 3.6, 0, 0, TAU); c.fillStyle = gun ? '#5a1e28' : '#ff9a8a'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke();
  if (L.crown) { c.beginPath(); c.moveTo(-4, -54); c.lineTo(-3, -66); c.lineTo(2, -60); c.lineTo(6, -70); c.lineTo(10, -60); c.lineTo(15, -66); c.lineTo(15, -53); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); blob(c, 6, -58, 2, 2, '#ff4d3d'); }
  c.restore();
}
Object.assign(DRAWERS, { beetle: drawBeetle, egret: drawEgret, hornet: drawHornet, owl: drawOwl, fish: drawFish });
for (const k of ['beetle', 'egret', 'hornet', 'owl', 'fish']) { const d = DRAWERS[k]; DRAWERS[k] = (c, f) => withLines(c, () => d(c, f)); }

/* projectiles of the new monsters */
Object.assign(PROJ2, {
  gas(c, p, x, gy, y) { c.save(); c.globalAlpha = Math.min(1, (p.life - p.t) / 20) * 0.75; for (let k = 0; k < 5; k++) { const a = p.t * 0.08 + k * 1.3; c.beginPath(); c.arc(x + Math.cos(a) * 10, y + Math.sin(a) * 6, 11 + (k % 2) * 4, 0, TAU); c.fillStyle = k & 1 ? '#a9d66a' : '#c6e88a'; c.fill(); } c.restore(); },
  cone(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 8, 2.5, 0, 0, TAU); c.fill(); c.save(); c.translate(x, y); c.rotate(p.t * 0.3); blob(c, 0, 0, 7, 10, '#9a6a3a'); c.strokeStyle = 'rgba(60,36,20,.7)'; c.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-6, k * 5); c.lineTo(6, k * 5 + 2); c.stroke(); } c.restore(); },
  feather(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.18)'; c.beginPath(); c.ellipse(x, gy, 9, 2.5, 0, 0, TAU); c.fill(); c.save(); c.translate(x, y); c.scale(p.face, 1); c.beginPath(); c.moveTo(14, 0); c.quadraticCurveTo(0, -7, -12, -2); c.lineTo(-12, 2); c.quadraticCurveTo(0, 7, 14, 0); c.fillStyle = '#c99a5a'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); seg(c, [P2(-16, 0), P2(12, 0)], 1.2, '#5a3a20'); c.restore(); },
  water(c, p, x, gy, y) { c.save(); c.translate(x, y); c.scale(p.face, 1); const g = c.createLinearGradient(-40, 0, 20, 0); g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(1, 'rgba(160,225,255,.95)'); c.fillStyle = g; c.beginPath(); c.moveTo(-50, -6); c.quadraticCurveTo(10, -16, 22, 0); c.quadraticCurveTo(10, 16, -50, 6); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-30, -3); c.quadraticCurveTo(4, -8, 16, 0); c.stroke(); c.restore(); if (p.t % 2 === 0) addPart('bubbleP', x - p.vx * 2, y - gy + FLOOR_TOP + p.z, p.z, {}); },
  honey(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 10, 3, 0, 0, TAU); c.fill(); c.save(); c.translate(x, y); blob(c, 0, 0, 10, 9, '#ffb81c'); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-3, -4, 3, 2, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-4, 8); c.quadraticCurveTo(-3, 14, -1, 8); c.fillStyle = '#ffb81c'; c.fill(); c.restore(); }
});
{
  const _part = drawPart;
  drawPart = function (c, p) {
    if (p.kind === 'stinkP') { const k = p.t / p.life, x = p.x, y = FLOOR_TOP + p.z - p.y; c.save(); c.globalAlpha = 1 - k; c.strokeStyle = p.col || '#8fc95a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y + 8); c.quadraticCurveTo(x - 5, y + 3, x, y); c.quadraticCurveTo(x + 5, y - 3, x, y - 8); c.stroke(); c.restore(); return; }
    if (p.kind === 'smoke' && p.col && p.col[0] === '#') { const k = p.t / p.life; c.save(); c.globalAlpha = 0.7 * (1 - k); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, FLOOR_TOP + p.z - p.y, 8 + k * 12, 0, TAU); c.fill(); c.restore(); return; }
    if (p.kind === 'fwork') { // a firework burst: sparks flying out from a centre
      const k = p.t / p.life, x = p.x, y = FLOOR_TOP + p.z - p.y; c.save(); c.globalAlpha = 1 - k * k; c.strokeStyle = p.col; c.lineWidth = 2.6; c.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + p.a0, r0 = 6 + k * p.r * 0.7, r1 = 10 + k * p.r; c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 + k * k * 20); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 + k * k * 24); c.stroke(); }
      c.restore(); return;
    }
    return _part(c, p);
  };
  const _fighter = drawFighter;
  drawFighter = function (c, f) {
    _fighter(c, f);
    if (f.dead || f.invisible) return;
    const sz = f.def.size || 1, sy = FLOOR_TOP + f.z - f.y;
    if (f.honeyT > 0) { c.save(); c.globalAlpha = 0.7; c.fillStyle = '#ffb81c'; for (const [dx, dy, r] of [[-8, -6, 7], [6, -4, 6], [0, -30, 6], [10, -46, 4]]) { c.beginPath(); c.ellipse(f.x + dx * sz, sy + dy * sz, r * sz, r * 0.7 * sz, 0, 0, TAU); c.fill(); } c.restore(); }
    if (f.poisonT > 0 && (f.clock >> 3) & 1) { c.save(); c.fillStyle = '#9be564'; c.font = '900 13px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = INK; c.strokeText('中毒', f.x, sy - 98 * sz); c.fillText('中毒', f.x, sy - 98 * sz); c.restore(); }
    if (f.rage && !f.dead) { c.save(); c.globalAlpha = 0.18 + Math.sin(f.clock * 0.2) * 0.08; c.fillStyle = '#ff4d3d'; c.beginPath(); c.ellipse(f.x, sy - 44 * sz, 34 * sz, 52 * sz, 0, 0, TAU); c.fill(); c.restore(); }
  };
}

/* ------------------------------ backgrounds ------------------------------ */
Object.assign(FLOOR_MAT, { jiufen: ['slab', 0.85], lake: ['planks', 0.8], forest: ['dirt', 0.8], city: ['tile', 0.65] });
Object.assign(LIGHT, {
  jiufen: { rim: 'rgba(255,170,110,.9)', sun: 'rgba(255,150,80,.18)', shade: 'rgba(30,20,70,.3)' },
  lake: { rim: 'rgba(230,250,255,.9)', sun: 'rgba(255,240,190,.2)', shade: 'rgba(20,60,90,.16)' },
  forest: { rim: 'rgba(220,255,220,.85)', sun: 'rgba(255,245,200,.22)', shade: 'rgba(20,50,40,.24)' },
  city: { rim: 'rgba(160,210,255,.95)', sun: 'rgba(255,120,200,.12)', shade: 'rgba(10,10,50,.34)' }
});
/* a band of layered hills: k = parallax, amp = height, base = y of the foot */
function hills(c, k, col, base, amp, seed, f1 = 0.005, f2 = 0.013) {
  const cx = W.camX; c.fillStyle = col; c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP);
  for (let s = -4; s <= Wv + 24; s += 16) { const wx = s + cx * k + seed; c.lineTo(cx + s, base - amp - Math.sin(wx * f1) * amp - Math.sin(wx * f2 + 1) * amp * 0.5); }
  c.lineTo(cx + Wv + 24, FLOOR_TOP); c.closePath(); c.fill();
}
/* 九份: dusk on the hillside, stacked teahouses hung with red lanterns, the sea far below */
function drawJiufen(c) {
  const cx = W.camX;
  drawSky(c, -100, 250, ['#2a2a6a', '#7a4a8a', '#f08a5a', '#ffd08a']);
  c.fillStyle = 'rgba(255,240,200,.85)'; c.beginPath(); c.arc(cx + Wv * 0.2 - cx * 0.02, 60, 16, 0, TAU); c.fill();
  // 基隆山 and the sea
  c.fillStyle = '#4a4a7a'; c.beginPath(); c.moveTo(cx + 120 - cx * 0.04, 230); c.quadraticCurveTo(cx + 260 - cx * 0.04, 110, cx + 420 - cx * 0.04, 230); c.closePath(); c.fill();
  c.fillStyle = '#5a6aa0'; c.fillRect(cx - 4, 222, Wv + 8, 20); c.strokeStyle = 'rgba(255,210,150,.5)'; c.lineWidth = 2; for (let x = cx - 20; x < cx + Wv; x += 60) { c.beginPath(); c.moveTo(x + (W.t * 0.3) % 60, 230); c.lineTo(x + 24 + (W.t * 0.3) % 60, 230); c.stroke(); }
  hills(c, 0.12, '#3a3a5e', 250, 30, 200);
  // far houses on the slope, windows lit
  for (let i = Math.floor((cx * 0.3) / 70) - 1; i < (cx * 0.3 + Wv) / 70 + 1; i++) {
    const x = cx + i * 70 - cx * 0.3, h = 26 + hash(i) * 30, y = 236 - hash(i + 3) * 30;
    c.fillStyle = '#2e2e4e'; c.fillRect(x, y - h, 60, h + 20); c.fillStyle = '#25253f'; c.beginPath(); c.moveTo(x - 6, y - h); c.lineTo(x + 30, y - h - 12); c.lineTo(x + 66, y - h); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,200,110,.75)'; for (let k = 0; k < 3; k++) if (hash(i * 7 + k) > 0.35) c.fillRect(x + 8 + k * 17, y - h + 10, 8, 7);
  }
  // near teahouses: wooden facades, balconies, lantern strings
  for (let i = Math.floor(cx / 520) - 1; i < cx / 520 + Wv / 520 + 2; i++) {
    const x = i * 520 + 60, w = 300, top = 120 + hash(i) * 30; c.strokeStyle = INK; c.lineWidth = 2;
    paint(c, 'plaster', '#6a3a2a', x, top, w, FLOOR_TOP - top - 4, 0.6); c.strokeRect(x, top, w, FLOOR_TOP - top - 4);
    for (let f = 0; f < 3; f++) { const y = top + 18 + f * 58;
      c.fillStyle = '#3a2a2a'; c.fillRect(x + 10, y, w - 20, 34); c.fillStyle = 'rgba(255,200,110,.85)';
      for (let k = 0; k < 6; k++) { c.fillRect(x + 18 + k * 46, y + 6, 32, 22); } c.strokeStyle = '#2a1a14'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x + 34 + k * 46, y + 6); c.lineTo(x + 34 + k * 46, y + 28); c.stroke(); }
      c.fillStyle = '#8a4a2a'; c.fillRect(x - 6, y + 36, w + 12, 6); c.strokeStyle = INK; c.strokeRect(x - 6, y + 36, w + 12, 6); }
    c.fillStyle = '#2a2a3a'; c.beginPath(); c.moveTo(x - 20, top + 4); c.quadraticCurveTo(x + w / 2, top - 8, x + w + 20, top + 4); c.lineTo(x + w + 8, top - 14); c.lineTo(x - 8, top - 14); c.closePath(); c.fill(); c.stroke();
    // signboard
    c.fillStyle = '#c0392b'; c.fillRect(x + w / 2 - 50, top + 2, 100, 16); c.strokeRect(x + w / 2 - 50, top + 2, 100, 16); c.fillStyle = '#ffe28a'; c.font = '900 12px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['茶樓', '芋圓', '老街', '草仔粿'][wrap(i, 4)], x + w / 2, top + 10);
    // lantern strings swinging gently
    for (let r = 0; r < 2; r++) { const y0 = top + 70 + r * 70; c.strokeStyle = '#2a1a14'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 10, y0); c.quadraticCurveTo(x + w / 2, y0 + 18, x + w + 10, y0); c.stroke();
      for (let k = 0; k < 7; k++) { const t = (k + 0.5) / 7, lx = lerp(x - 10, x + w + 10, t), ly = y0 + 4 * t * (1 - t) * 18 + 6 + Math.sin(W.t * 0.03 + k) * 1.5; drawLantern(c, lx, ly, 0.7); } }
  }
  // stone steps and railings at the back of the floor
  c.fillStyle = '#7a7280'; c.fillRect(cx - 4, FLOOR_TOP - 10, Wv + 8, 14);
  floorFill(c, 'jiufen', '#a39a96', cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.strokeStyle = 'rgba(40,30,50,.25)'; c.lineWidth = 2;
  for (let z = 0; z <= FLOOR_D; z += 32) { c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP + z); c.lineTo(cx + Wv + 4, FLOOR_TOP + z); c.stroke(); }
  for (let z = 0; z < FLOOR_D; z += 32) for (let x = Math.floor(cx / 90) * 90 + (z % 64 ? 45 : 0); x < cx + Wv + 90; x += 90) { c.beginPath(); c.moveTo(x, FLOOR_TOP + z); c.lineTo(x, FLOOR_TOP + z + 32); c.stroke(); }
  // warm lantern glow pools on the stones
  for (let i = Math.floor(cx / 260) - 1; i < cx / 260 + Wv / 260 + 2; i++) { const x = i * 260 + 130; const g = c.createRadialGradient(x, FLOOR_TOP + 30, 4, x, FLOOR_TOP + 30, 90); g.addColorStop(0, 'rgba(255,170,90,.28)'); g.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g; c.fillRect(x - 90, FLOOR_TOP - 60, 180, 180); }
  c.fillStyle = '#5a5260'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
/* 日月潭: green mountains around the lake, the pagoda on the hill, boats, a wooden pier */
function drawLake(c) {
  const cx = W.camX;
  drawSky(c, -100, 220, ['#5fb0f0', '#a8d8f8', '#eaf6ff']);
  for (let i = 0; i < 4; i++) { const x = cx + ((i * 380 - cx * 0.05) % (Wv + 300) + Wv + 300) % (Wv + 300) - 150, y = 50 + hash(i + 9) * 50; c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(x, y, 60, 13, 0, 0, TAU); c.ellipse(x + 26, y - 8, 30, 11, 0, 0, TAU); c.fill(); }
  hills(c, 0.04, '#9cc4c8', 200, 40, 0);
  hills(c, 0.08, '#6faa8c', 214, 34, 300);
  // 慈恩塔 on a hilltop
  { const x = cx + 620 - cx * 0.08; c.fillStyle = '#5f9a78'; c.beginPath(); c.ellipse(x, 214, 110, 46, 0, Math.PI, 0); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const w = 18 - k * 2, y = 168 - k * 10; c.fillStyle = '#f2ead8'; c.fillRect(x - w / 2, y, w, 10); c.strokeRect(x - w / 2, y, w, 10); c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(x - w / 2 - 4, y); c.lineTo(x + w / 2 + 4, y); c.lineTo(x + w / 2, y - 3); c.lineTo(x - w / 2, y - 3); c.closePath(); c.fill(); }
    c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(x, 105, 3, 0, TAU); c.fill(); }
  // the lake
  const lg = c.createLinearGradient(0, 214, 0, FLOOR_TOP); lg.addColorStop(0, '#3a8fb8'); lg.addColorStop(1, '#5fb8d8'); c.fillStyle = lg; c.fillRect(cx - 4, 212, Wv + 8, FLOOR_TOP - 212);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (let r = 0; r < 5; r++) { const y = 224 + r * 20; c.beginPath(); for (let x = cx - 20; x < cx + Wv + 20; x += 44) { const o = Math.sin((x + W.t * (0.4 + r * 0.15)) * 0.05) * 3; c.moveTo(x, y + o); c.lineTo(x + 16, y + o); } c.stroke(); }
  // 拉魯島 and little boats
  c.fillStyle = '#4f8f5c'; c.beginPath(); c.ellipse(cx + 260 - cx * 0.12, 236, 40, 9, 0, Math.PI, 0); c.fill(); c.fillStyle = '#3f7a4c'; c.beginPath(); c.arc(cx + 254 - cx * 0.12, 228, 9, 0, TAU); c.arc(cx + 268 - cx * 0.12, 230, 7, 0, TAU); c.fill();
  for (let i = Math.floor(cx / 560) - 1; i < cx / 560 + Wv / 560 + 2; i++) {
    const x = i * 560 + 220 + Math.sin(W.t * 0.008 + i) * 30, y = 268 + Math.sin(W.t * 0.05 + i) * 2, col = ['#ff5a4a', '#ffcc33', '#3fa9ff'][wrap(i, 3)];
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 44, y - 12); c.lineTo(x + 46, y - 12); c.lineTo(x + 34, y + 4); c.lineTo(x - 36, y + 4); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.fillStyle = col; c.fillRect(x - 40, y - 8, 80, 4); c.fillStyle = '#fff6e6'; c.fillRect(x - 22, y - 30, 40, 18); c.strokeRect(x - 22, y - 30, 40, 18); c.fillStyle = col; c.fillRect(x - 26, y - 34, 48, 5); c.strokeRect(x - 26, y - 34, 48, 5);
    c.fillStyle = '#5a8ab0'; c.fillRect(x - 16, y - 26, 10, 8); c.fillRect(x + 2, y - 26, 10, 8);
  }
  // reeds along the shore and the pier floor
  c.fillStyle = '#5a9a5a'; c.fillRect(cx - 4, FLOOR_TOP - 12, Wv + 8, 14);
  c.strokeStyle = '#3f7a3f'; c.lineWidth = 2; for (let x = Math.floor(cx / 23) * 23; x < cx + Wv + 23; x += 23) { const h = 10 + hash(x) * 16, s = Math.sin(W.t * 0.03 + x) * 2; c.beginPath(); c.moveTo(x, FLOOR_TOP - 2); c.quadraticCurveTo(x + s, FLOOR_TOP - h / 2, x + s * 2, FLOOR_TOP - h); c.stroke(); }
  floorFill(c, 'lake', '#c09a6a', cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.strokeStyle = 'rgba(70,45,20,.32)'; c.lineWidth = 2;
  for (let x = Math.floor(cx / 46) * 46; x < cx + Wv + 46; x += 46) { c.beginPath(); c.moveTo(x, FLOOR_TOP); c.lineTo(x, FLOOR_TOP + FLOOR_D); c.stroke(); }
  for (let x = Math.floor(cx / 46) * 46; x < cx + Wv + 46; x += 46) for (let z = 12 + (x / 46 % 2) * 40; z < FLOOR_D; z += 80) { c.fillStyle = 'rgba(70,45,20,.4)'; c.beginPath(); c.arc(x + 23, FLOOR_TOP + z, 1.6, 0, TAU); c.fill(); }
  c.fillStyle = '#6a4c2c'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
  for (let i = Math.floor(cx / 230) - 1; i < cx / 230 + Wv / 230 + 2; i++) { const x = i * 230 + 40; c.fillStyle = '#5a3e22'; c.fillRect(x - 7, FLOOR_TOP + FLOOR_D - 4, 14, 30); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(x - 7, FLOOR_TOP + FLOOR_D - 4, 14, 30); }
  // the wake of a passing boat washes over the pier (hazard)
  if (W.tide > 0) {
    const edge = FLOOR_TOP + W.tide * 75;
    c.fillStyle = 'rgba(80,170,215,.55)'; c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP - 12);
    for (let x = cx - 4; x <= cx + Wv + 8; x += 16) c.lineTo(x, edge + Math.sin((x + W.t * 3) * 0.05) * 5);
    c.lineTo(cx + Wv + 8, FLOOR_TOP - 12); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.beginPath(); for (let x = cx - 4; x <= cx + Wv + 8; x += 16) c.lineTo(x, edge + Math.sin((x + W.t * 3) * 0.05) * 5); c.stroke();
  }
}
/* 阿里山: giant cypress trunks, a sea of clouds, the little red forest train on its track */
function drawForest(c) {
  const cx = W.camX;
  drawSky(c, -100, 200, ['#8fc8e8', '#cfe8ef', '#f4fbf6']);
  hills(c, 0.03, '#a8c4c0', 150, 40, 50);
  // sea of clouds
  c.fillStyle = 'rgba(255,255,255,.92)'; for (let i = -1; i < 12; i++) { const x = cx - ((cx * 0.06 + W.t * 0.1) % 120) + i * 120; c.beginPath(); c.arc(x, 176 + (i % 3) * 4, 40, Math.PI, 0); c.fill(); }
  hills(c, 0.09, '#5f8f6a', 214, 26, 700, 0.008, 0.02);
  // far cypress trees (pointed)
  for (let i = Math.floor(cx * 0.25 / 46) - 1; i < (cx * 0.25 + Wv) / 46 + 1; i++) { const x = cx + i * 46 - cx * 0.25, h = 60 + hash(i + 40) * 40; c.fillStyle = hash(i) > 0.5 ? '#2f6a4a' : '#3a7a52'; c.beginPath(); c.moveTo(x - 16, 236); c.lineTo(x, 236 - h); c.lineTo(x + 16, 236); c.closePath(); c.fill(); }
  // the forest train on its track, rolling slowly through
  c.fillStyle = '#7a6a5a'; c.fillRect(cx - 4, 262, Wv + 8, 6); c.fillStyle = '#5a4a3a'; for (let x = Math.floor(cx / 18) * 18; x < cx + Wv + 18; x += 18) c.fillRect(x, 266, 10, 4);
  { const period = 2400, tx = ((W.t * 2.2) % period) - 600, base = cx - 300;
    for (let k = 0; k < 4; k++) { const x = base + tx + k * 96; if (x < cx - 120 || x > cx + Wv + 120) continue; c.strokeStyle = INK; c.lineWidth = 2;
      c.fillStyle = k === 0 ? '#2b2733' : '#c0392b'; c.fillRect(x, 222, 88, 40); c.strokeRect(x, 222, 88, 40);
      if (k) { c.fillStyle = '#ffe9b8'; for (let w = 0; w < 4; w++) c.fillRect(x + 8 + w * 20, 230, 14, 12); c.fillStyle = '#ffcc33'; c.fillRect(x, 248, 88, 4); }
      else { c.fillRect(x + 60, 206, 14, 18); c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(x + 82, 244, 5, 0, TAU); c.fill(); c.fillStyle = 'rgba(240,240,240,.75)'; for (let p = 0; p < 4; p++) { const ph = ((W.t * 0.8 + p * 12) % 48) / 48; c.beginPath(); c.arc(x + 67 - ph * 30, 200 - ph * 40, 5 + ph * 9, 0, TAU); c.fill(); } }
      c.fillStyle = '#2b2733'; c.beginPath(); c.arc(x + 18, 263, 6, 0, TAU); c.arc(x + 70, 263, 6, 0, TAU); c.fill(); }
  }
  // giant trunks (神木) in the mid ground
  for (let i = Math.floor(cx / 640) - 1; i < cx / 640 + Wv / 640 + 2; i++) {
    const x = i * 640 + 380, w = 70 + hash(i) * 30;
    c.fillStyle = '#6a4a34'; c.beginPath(); c.moveTo(x - w / 2 - 14, FLOOR_TOP); c.quadraticCurveTo(x - w / 2, FLOOR_TOP - 30, x - w / 2 + 4, -120); c.lineTo(x + w / 2 - 4, -120); c.quadraticCurveTo(x + w / 2, FLOOR_TOP - 30, x + w / 2 + 16, FLOOR_TOP); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(40,24,14,.5)'; c.lineWidth = 2.5; for (let k = 0; k < 5; k++) { const xx = x - w / 2 + 10 + k * (w - 20) / 4; c.beginPath(); c.moveTo(xx, -100); c.quadraticCurveTo(xx + Math.sin(k) * 6, 120, xx + (k - 2) * 3, FLOOR_TOP - 6); c.stroke(); }
    c.fillStyle = 'rgba(90,150,80,.8)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x - w / 2 + hash(i + k) * w, 40 + k * 40, 6 + hash(k + i * 3) * 6, 0, TAU); c.fill(); }
    if (i % 2 === 0) { c.fillStyle = '#fff6e6'; c.fillRect(x - 26, 150, 52, 22); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x - 26, 150, 52, 22); c.fillStyle = '#2f6a4a'; c.font = '900 13px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('神木', x, 161); }
  }
  // ferns at the back of the path, then the dirt path with roots
  for (let x = Math.floor(cx / 40) * 40; x < cx + Wv + 40; x += 40) { const h = 14 + hash(x) * 14; c.fillStyle = hash(x + 1) > 0.5 ? '#3f8a4c' : '#4f9a5a'; c.beginPath(); c.ellipse(x, FLOOR_TOP, 26, h, 0, Math.PI, 0); c.fill(); }
  floorFill(c, 'forest', '#b8956a', cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.strokeStyle = 'rgba(90,60,30,.35)'; c.lineWidth = 3; for (let x = Math.floor(cx / 170) * 170; x < cx + Wv + 170; x += 170) { const z = 20 + hash(x) * 120; c.beginPath(); c.moveTo(x - 40, FLOOR_TOP + z); c.quadraticCurveTo(x, FLOOR_TOP + z - 8, x + 40, FLOOR_TOP + z + 4); c.stroke(); }
  c.fillStyle = 'rgba(80,140,70,.5)'; for (let x = Math.floor(cx / 37) * 37; x < cx + Wv + 37; x += 37) { if (hash(x) < 0.6) continue; c.beginPath(); c.ellipse(x, FLOOR_TOP + 10 + hash(x + 3) * 140, 5, 2.5, 0, 0, TAU); c.fill(); }
  c.fillStyle = '#4f8a52'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
/* 台北 101: the city at night, the tower glowing, fireworks bursting in the sky */
function drawCity(c) {
  const cx = W.camX;
  drawSky(c, -100, 280, ['#0e0c32', '#2a1e5a', '#5a3a7a']);
  c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 30; i++) { const x = cx + ((hash(i) * 2000 - cx * 0.02) % (Wv + 20) + Wv + 20) % (Wv + 20), y = -80 + hash(i + 50) * 200; c.fillRect(x, y, 2, 2); }
  // background fireworks
  for (let i = 0; i < 3; i++) { const ph = (W.t + i * 90) % 270; if (ph > 70) continue; const k = ph / 70, x = cx + Wv * (0.2 + 0.3 * i) + Math.sin(i * 7) * 60, y = 20 + i * 24, r = 20 + k * 50, col = ['#ff5a7a', '#ffcc33', '#5fd0ff'][i];
    c.save(); c.globalAlpha = 1 - k * k; c.strokeStyle = col; c.lineWidth = 2; for (let a = 0; a < 14; a++) { const an = a * TAU / 14; c.beginPath(); c.moveTo(x + Math.cos(an) * r * 0.6, y + Math.sin(an) * r * 0.6 + k * 10); c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r + k * 14); c.stroke(); } c.restore(); }
  skyline(c, 0.12, '#1e1a46', 'rgba(255,214,120,.35)', 150, 70, 11);
  // Taipei 101: stacked segments, slow parallax so it stays in view
  { const x = cx + Wv * 0.62 - cx * 0.02, base = 250; c.strokeStyle = '#5fd0a0'; c.lineWidth = 2;
    const tg = c.createLinearGradient(x - 30, 0, x + 30, 0); tg.addColorStop(0, '#2a6a6a'); tg.addColorStop(0.5, '#4fa0a0'); tg.addColorStop(1, '#2a5a6a');
    c.fillStyle = tg; c.fillRect(x - 26, base - 40, 52, 40); c.strokeRect(x - 26, base - 40, 52, 40);
    for (let k = 0; k < 8; k++) { const y = base - 40 - (k + 1) * 19; c.beginPath(); c.moveTo(x - 20, y + 19); c.lineTo(x - 26, y); c.lineTo(x + 26, y); c.lineTo(x + 20, y + 19); c.closePath(); c.fillStyle = tg; c.fill(); c.stroke(); c.fillStyle = 'rgba(255,230,140,.5)'; for (let w = -2; w <= 2; w++) c.fillRect(x + w * 8 - 2, y + 5, 4, 8); }
    const ty = base - 40 - 8 * 19; c.fillStyle = tg; c.fillRect(x - 12, ty - 24, 24, 24); c.strokeRect(x - 12, ty - 24, 24, 24); c.beginPath(); c.moveTo(x, ty - 24); c.lineTo(x, ty - 70); c.stroke();
    c.fillStyle = (W.t >> 5) & 1 ? '#ff5a4a' : '#ffcc33'; c.beginPath(); c.arc(x, ty - 70, 3, 0, TAU); c.fill(); }
  skyline(c, 0.22, '#2a2456', 'rgba(255,230,150,.55)', 110, 90, 23);
  // plaza edge: hedges, lamp posts, a big LED screen
  c.fillStyle = '#2a4a3a'; c.fillRect(cx - 4, FLOOR_TOP - 16, Wv + 8, 18);
  for (let i = Math.floor(cx / 700) - 1; i < cx / 700 + Wv / 700 + 2; i++) { const x = i * 700 + 300; c.fillStyle = '#1a1830'; c.fillRect(x - 70, 196, 140, 80); c.strokeStyle = '#5a5a8a'; c.lineWidth = 3; c.strokeRect(x - 70, 196, 140, 80);
    const g = c.createLinearGradient(x - 64, 0, x + 64, 0); const h = (W.t * 2 + i * 60) % 360; g.addColorStop(0, `hsl(${h},80%,60%)`); g.addColorStop(1, `hsl(${(h + 80) % 360},80%,55%)`); c.fillStyle = g; c.fillRect(x - 64, 202, 128, 68);
    c.fillStyle = '#fff'; c.font = '900 22px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['新年快樂', '台北 101', '一起看煙火'][wrap(i, 3)], x, 236); c.fillStyle = '#3a3a5a'; c.fillRect(x - 4, 276, 8, 40); }
  floorFill(c, 'city', '#5a5878', cx - 4, FLOOR_TOP, Wv + 8, 540);
  c.strokeStyle = 'rgba(200,200,255,.12)'; c.lineWidth = 1.5;
  for (let z = 0; z <= FLOOR_D; z += 40) { c.beginPath(); c.moveTo(cx - 4, FLOOR_TOP + z); c.lineTo(cx + Wv + 4, FLOOR_TOP + z); c.stroke(); }
  const mid = cx + Wv / 2; for (let x = Math.floor((cx - 200) / 80) * 80; x < cx + Wv + 200; x += 80) { c.beginPath(); c.moveTo(x, FLOOR_TOP); c.lineTo(x + (x - mid) * 0.25, FLOOR_TOP + FLOOR_D); c.stroke(); }
  // neon reflections on the tiles
  for (let i = Math.floor(cx / 300) - 1; i < cx / 300 + Wv / 300 + 2; i++) { const x = i * 300 + 150; c.fillStyle = ['rgba(255,90,170,.12)', 'rgba(90,210,255,.12)'][wrap(i, 2)]; c.fillRect(x - 30, FLOOR_TOP + 4, 60, FLOOR_D - 8); }
  c.fillStyle = '#3a3858'; c.fillRect(cx - 4, FLOOR_TOP + FLOOR_D + 2, Wv + 8, 540);
}
Object.assign(THEMES, { jiufen: drawJiufen, lake: drawLake, forest: drawForest, city: drawCity });
Object.assign(FG, {
  fern(c, x) { c.fillStyle = 'rgba(20,50,34,.9)'; for (let k = -3; k <= 3; k++) { c.save(); c.translate(x, VH + 6); c.rotate(k * 0.28); c.beginPath(); c.ellipse(0, -60, 9, 62, 0, 0, TAU); c.fill(); c.restore(); } },
  trunk(c, x) { c.fillStyle = FG_INK; c.beginPath(); c.moveTo(x - 60, VH + 10); c.quadraticCurveTo(x - 40, VH - 80, x - 34, -140); c.lineTo(x + 34, -140); c.quadraticCurveTo(x + 40, VH - 80, x + 62, VH + 10); c.closePath(); c.fill(); },
  reeds(c, x) { c.strokeStyle = FG_INK; c.lineWidth = 5; c.lineCap = 'round'; for (let k = 0; k < 9; k++) { const xx = x - 60 + k * 15, h = 70 + hash(k + x) * 60; c.beginPath(); c.moveTo(xx, VH + 6); c.quadraticCurveTo(xx + 6, VH - h / 2, xx + 12 + Math.sin(W.t * 0.03 + k) * 4, VH - h); c.stroke(); } },
  stairrail(c, x) { c.fillStyle = FG_INK; c.fillRect(x - 120, VH - 62, 240, 8); for (let i = -120; i <= 120; i += 40) c.fillRect(x + i - 4, VH - 62, 8, 70); c.fillStyle = 'rgba(255,90,60,.8)'; c.beginPath(); c.ellipse(x - 80, VH - 84, 10, 13, 0, 0, TAU); c.fill(); }
});
Object.assign(FOREGROUNDS, {
  jiufen: { every: 560, list: ['lanterns', 'stairrail', 'plant'] },
  lake: { every: 620, list: ['reeds', 'bollard', 'reeds'] },
  forest: { every: 540, list: ['fern', 'trunk', 'fern'] },
  city: { every: 640, list: ['lamp', 'plant', 'lamp'] }
});

/* ------------------------------ hazards ------------------------------ */
Object.assign(HAZARDS, {
  /* 日月潭: a tour boat's wake washes over the pier and pushes everyone forward */
  wake(W) {
    const H = W.hz || (W.hz = { next: 420, t: 0 });
    if (H.t > 0) {
      H.t--; const k = H.t > 150 ? (240 - H.t) / 90 : H.t > 90 ? 1 : H.t / 90; W.tide = k;
      if (H.t > 90) for (const f of W.fighters) if (!f.dead && f.y < 20 && f.z < k * 75 + 6 && !f.def.fly && !f.def.boss) { f.z = Math.min(FLOOR_D - 6, f.z + 1.8); if (f.canAct() && f.state !== 'run') f.vx *= 0.6; }
      if (H.t === 0) { W.tide = 0; H.next = rnd(560, 820) | 0; }
      return;
    }
    if (--H.next <= 0) { H.t = 240; Sound.play('wave'); Sound.play('honk', 0.5); message('遊艇開過去，浪來了！', '', 60); }
  },
  /* 阿里山: logs come rolling down the path; jump over them or step out of their lane */
  logs(W) {
    const H = W.hz || (W.hz = { next: 300, warn: 0, label: '滾木來了' });
    if (H.warn > 0) {
      if (--H.warn === 0) { W.hazEnts.push({ kind: 'log', x: H.dir > 0 ? W.camX - 90 : W.camX + Wv + 90, z: H.z, vx: H.dir * 6.4, hit: new Set(), rot: 0 }); H.next = rnd(380, 620) | 0; Sound.play('quake', 0.5); }
      return;
    }
    if (--H.next <= 0) {
      const hs = W.players.filter(p => !p.dead); H.dir = pick([-1, 1]);
      H.z = clamp((hs.length ? pick(hs).z : rnd(30, FLOOR_D - 30)) + rnd(-12, 12), 20, FLOOR_D - 20); H.warn = 80; Sound.play('fall', 0.6);
    }
  },
  /* 台北 101: fireworks aimed at the plaza; the circles on the floor show where they land */
  fireworks(W) {
    const H = W.hz || (W.hz = { next: 260 });
    if (--H.next > 0) return;
    H.next = rnd(300, 470) | 0; Sound.play('throw', 0.6);
    const targets = W.players.filter(p => !p.dead).map(p => [p.x + rnd(-40, 40), p.z + rnd(-20, 20)]);
    targets.push([W.camX + rnd(120, Wv - 120), rnd(20, FLOOR_D - 20)]);
    for (const [x, z] of targets.slice(0, 4)) W.hazEnts.push({ kind: 'mark', x: clamp(x, W.camX + 40, W.camX + Wv - 40), z: clamp(z, 14, FLOOR_D - 14), vx: 0, t: 0, fuse: 84, hit: new Set(), col: pick(['#ff5a7a', '#ffcc33', '#5fd0ff', '#7dff9a']) });
  }
});
updateHazards = function () {
  for (let i = W.hazEnts.length - 1; i >= 0; i--) {
    const h = W.hazEnts[i];
    if (h.kind === 'mark') { // a firework lands when the fuse runs out
      if (++h.t < h.fuse) continue;
      W.hazEnts.splice(i, 1); Sound.play('pop'); Sound.play('heavy', 0.7); W.shake = Math.max(W.shake, 6);
      addPart('fwork', h.x, 40, h.z, { col: h.col, r: 70, a0: rnd(TAU), life: 26 }); addPart('fwork', h.x, 50, h.z, { col: '#fff6e6', r: 40, a0: rnd(TAU), life: 20 }); addPart('ring', h.x, 0, h.z, { r: 10, grow: 5, life: 16 });
      for (const v of W.fighters) if (!v.dead && Math.abs(v.x - h.x) < 50 && Math.abs(v.z - h.z) < 24 && v.y < 60) applyHit(null, v, { dmg: 26, kb: 4, kbY: 6, launch: true, unblock: true, sfx: 'heavy' }, sgn(v.x - h.x || 1), true);
      continue;
    }
    h.x += h.vx; if (h.kind === 'log') h.rot += h.vx * 0.05;
    const R = h.kind === 'log' ? 40 : 34, Y = h.kind === 'log' ? 26 : 30, Z = h.kind === 'log' ? 20 : 18, dmg = h.kind === 'log' ? 28 : 30;
    for (const v of W.fighters) {
      if (v.dead || h.hit.has(v) || v.y > Y || Math.abs(v.z - h.z) > Z || Math.abs(v.x - h.x) > R) continue;
      h.hit.add(v); applyHit(null, v, { dmg, kb: 6, kbY: 6, launch: true, unblock: true, sfx: 'heavy' }, sgn(h.vx), true);
    }
    if (h.x < W.camX - 300 || h.x > W.camX + Wv + 300) W.hazEnts.splice(i, 1);
  }
};
/* drawHazard and drawWarning live in ui.js, which loads after this file: wrap them once every script has run */
function tourLateDraw() {
  const _dh = drawHazard;
  drawHazard = function (c, h) {
    const gy = FLOOR_TOP + h.z;
    if (h.kind === 'log') {
      c.fillStyle = 'rgba(20,16,40,.28)'; c.beginPath(); c.ellipse(h.x, gy, 40, 7, 0, 0, TAU); c.fill();
      c.save(); c.translate(h.x, gy - 18); c.fillStyle = '#8a5a34'; c.fillRect(-36, -16, 72, 32); c.strokeStyle = INK; c.lineWidth = 2.4; c.strokeRect(-36, -16, 72, 32);
      c.strokeStyle = 'rgba(50,28,12,.6)'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const o = ((h.rot * 12 + k * 22) % 66 + 66) % 66 - 33; c.beginPath(); c.moveTo(o, -16); c.lineTo(o + 4, 16); c.stroke(); }
      for (const sx of [-36, 36]) { c.beginPath(); c.ellipse(sx, 0, 8, 16, 0, 0, TAU); c.fillStyle = '#d9b07a'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.strokeStyle = 'rgba(120,80,40,.7)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(sx, 0, 4, 9, 0, 0, TAU); c.stroke(); }
      c.restore(); if (W.t % 4 === 0) addPart('dust', h.x - sgn(h.vx) * 36, 2, h.z, {});
      return;
    }
    if (h.kind === 'mark') {
      const k = h.t / h.fuse, r = 46, blink = k > 0.7 && (W.t >> 2) & 1;
      c.save(); c.strokeStyle = blink ? '#fff' : h.col; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.ellipse(h.x, gy, r, r * 0.42, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = h.col; c.globalAlpha = 0.18 + k * 0.3; c.beginPath(); c.ellipse(h.x, gy, r * k, r * 0.42 * k, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      // the rocket coming down for the last part of the fuse
      if (k > 0.55) { const ry = gy - 40 - (1 - k) / 0.45 * 420; c.strokeStyle = 'rgba(255,240,180,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(h.x, ry - 30); c.lineTo(h.x, ry); c.stroke(); blob(c, h.x, ry, 4, 6, h.col); }
      c.restore(); return;
    }
    return _dh(c, h);
  };
  const _dw = drawWarning;
  drawWarning = function (c, H) {
    if (!H.label) return _dw(c, H);
    const x = H.dir > 0 ? W.camX + 40 : W.camX + Wv - 40, y = FLOOR_TOP + H.z - 30;
    c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x + 24, y + 16); c.lineTo(x - 24, y + 16); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    c.fillStyle = INK; c.font = '900 24px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y + 2);
    c.font = '900 14px "Noto Sans TC",sans-serif'; c.lineWidth = 4; c.strokeStyle = INK; c.fillStyle = '#fff6e6'; c.strokeText(H.label, x + (H.dir > 0 ? 44 : -44), y - 24); c.fillText(H.label, x + (H.dir > 0 ? 44 : -44), y - 24);
    c.strokeStyle = 'rgba(255,204,51,.55)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(W.camX, FLOOR_TOP + H.z); c.lineTo(W.camX + Wv, FLOOR_TOP + H.z); c.stroke(); c.setLineDash([]);
  };
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', tourLateDraw); else setTimeout(tourLateDraw, 0);
/* hazards can also belong to a part of a story stage */
{
  const _sl = stageLogic;
  stageLogic = function () {
    _sl();
    const A = W.stage && W.stage.areas[W.areaIdx];
    if (W.hzArea !== W.areaIdx) { W.hzArea = W.areaIdx; W.hz = null; W.tide = 0; }
    if (A && A.hazard && !W.over && !W.go && W.fighters.some(f => f.team !== 1 && !f.dead && !f.entering)) HAZARDS[A.hazard](W);
    else if (W.tide > 0) W.tide = Math.max(0, W.tide - 0.02);
  };
}

/* ------------------------------ stages 5–8 ------------------------------ */
STAGES.push({
  name: '第五關', title: '九份山城夜', theme: 'jiufen', music: 'jiufen', bossMusic: 'boss2', bossLine: '山上的貓頭鷹醒來了！', part: 2,
  areas: [
    { to: 1200, waves: [['civet', 'civet'], ['civet', 'boar:L', 'bat']], items: [['slipper', 700, 110], ['milk', 1000, 40]] },
    { to: 2400, waves: [['civet', 'monkey', 'civet:L'], ['bat', 'civet', 'cat:L', 'bat']], items: [['stick', 1500, 80], ['cracker', 2000, 120]] },
    { to: 3600, waves: [['bear', 'civet:L'], ['civet', 'civet:L', 'monkey', 'cat']], items: [['umbrella', 2700, 60], ['juice', 3100, 110]] },
    { to: 4800, boss: true, waves: [['owl', 'civet', 'civet:L']], items: [['chicken', 3800, 70], ['stone', 4100, 110], ['cracker', 4300, 40]], reinforce: ['civet', 'bat:L', 'bat'] }
  ]
}, {
  name: '第六關', title: '日月潭大浪', theme: 'lake', music: 'lake', bossMusic: 'boss2', bossLine: '潭底的大魚跳上來了！', part: 2,
  areas: [
    { to: 1200, waves: [['egret', 'boar'], ['egret', 'egret:L', 'boar']], items: [['stick', 800, 80]] },
    { to: 2400, hazard: 'wake', waves: [['beetle', 'egret'], ['crab', 'egret:L', 'beetle']], items: [['umbrella', 1600, 120], ['milk', 2000, 60]] },
    { to: 3600, hazard: 'wake', waves: [['beetle', 'beetle:L', 'egret'], ['octopus', 'egret', 'crab:L', 'magpie']], items: [['stone', 2800, 100], ['chicken', 3200, 50]] },
    { to: 4800, boss: true, waves: [['bigfish', 'crab', 'egret:L']], items: [['juice', 3800, 120], ['slipper', 4000, 60], ['cracker', 4200, 100]], reinforce: ['beetle', 'egret:L'] }
  ]
}, {
  name: '第七關', title: '阿里山森林', theme: 'forest', music: 'forest', bossMusic: 'boss2', bossLine: '虎頭蜂女王飛來了！', part: 2,
  areas: [
    { to: 1200, waves: [['squirrel', 'monkey'], ['squirrel', 'squirrel:L', 'hornet']], items: [['stick', 700, 100], ['juice', 1000, 50]] },
    { to: 2400, hazard: 'logs', waves: [['hornet', 'beetle', 'squirrel:L'], ['hornet', 'hornet:L', 'monkey', 'squirrel']], items: [['umbrella', 1500, 60], ['milk', 2100, 120]] },
    { to: 3600, hazard: 'logs', waves: [['bear', 'squirrel:L', 'hornet'], ['beetle', 'squirrel', 'hornet:L', 'civet']], items: [['cracker', 2700, 40], ['chicken', 3300, 110]] },
    { to: 4800, boss: true, waves: [['queen', 'squirrel', 'squirrel:L']], items: [['umbrella', 3800, 100], ['milk', 4100, 40], ['slipper', 4300, 120]], reinforce: ['beetle', 'squirrel:L'] }
  ]
}, {
  name: '第八關', title: '101 跨年決戰', theme: 'city', music: 'city', bossMusic: 'final', bossLine: '傳說中的雲豹大王現身了！', part: 2,
  areas: [
    { to: 1200, waves: [['cat', 'civet'], ['civet', 'cat:L', 'hornet', 'boar']], items: [['slipper', 800, 60], ['milk', 1050, 120]] },
    { to: 2400, hazard: 'fireworks', waves: [['beetle', 'egret', 'civet:L'], ['squirrel', 'cat', 'civet:L', 'hornet']], items: [['stick', 1500, 90], ['juice', 2000, 40]] },
    { to: 3600, hazard: 'fireworks', waves: [['bear', 'beetle:L', 'squirrel'], ['crab', 'octopus:L', 'magpie', 'civet', 'cat']], items: [['umbrella', 2700, 110], ['chicken', 3200, 60]] },
    { to: 4800, boss: true, hazard: 'fireworks', waves: [['leopard', 'cat', 'civet:L']], items: [['chicken', 3800, 110], ['cracker', 4000, 50], ['milk', 4300, 120]], reinforce: ['cat', 'civet:L', 'squirrel', 'hornet'] }
  ]
});
Object.assign(STORY, {
  intro4: [['hero', '大章魚說，最近台灣各地的動物都怪怪的。'], ['buddy', '我們搭火車去九份看看吧！'], ['civet', '嘻嘻！九份的芋圓和草仔粿，全部都是我們的！'], ['hero', '又來了……想吃要排隊，不可以搶！']],
  outro4: [['owl', '咕咕……對不起，晚上燈籠太亮，我睡不著才那麼生氣。'], ['owl', '我在山頂看到，日月潭的大魚也在鬧脾氣，把船都掀翻了。'], ['hero', '那我們去日月潭！']],
  intro5: [['hero', '日月潭好漂亮……咦，湖面怎麼一直起大浪？'], ['egret', '嘎！大魚王說，誰都不准坐船！'], ['buddy', '小心！遊艇開過去的時候浪會打上碼頭！']],
  outro5: [['bigfish', '噗噗……我只是想讓大家看看我跳得多高。'], ['bigfish', '可是阿里山的虎頭蜂女王，說要把森林裡的花蜜全部搬走！'], ['hero', '花蜜被搬走，森林會生病的！快去阿里山！']],
  intro6: [['hero', '阿里山的神木好高！小火車還在冒煙呢。'], ['hornet', '嗡嗡！女王說誰都不准上山！'], ['buddy', '小心！上面有木頭滾下來了，跳起來或是閃開！']],
  outro6: [['queen', '嗡……其實不是我想搬，是雲豹大王說要辦一場超大的派對……'], ['queen', '牠要在台北 101 上面，讓全台灣的人都看到牠！'], ['hero', '雲豹？大家不是說，已經好久沒有人看過雲豹了嗎？'], ['buddy', '去台北看看就知道了！']],
  intro7: [['hero', '台北 101 到了！天上一直在放煙火！'], ['leopard', '呵呵……你們終於來了。'], ['leopard', '大家都說找不到我，慢慢就把我忘記了。今天，我要讓所有人都看見我！'], ['hero', '我們沒有忘記你！可是不能把大家的跨年弄得亂七八糟！']],
  outro7: [['leopard', '……你們真的好厲害。'], ['leopard', '原來只要說出來，就會有朋友願意陪我。'], ['hero', '對呀！以後山上、海邊、夜市，我們都一起去！'], ['buddy', '倒數開始囉！大家一起看跨年煙火吧！']]
});

/* ------------------------------ music ------------------------------ */
Object.assign(SONGS, {
  jiufen: { bpm: 100, leadInst: 'soft', leadVol: 0.19,   // 九份: a nostalgic evening tune
    lead: ['E5 . D5 C5 A4 . C5 D5 E5 - - . G5 E5 D5 . C5 . A4 C5 D5 . E5 D5 C5 - A4 - - . . .',
           'A4 . C5 D5 E5 . G5 E5 D5 . C5 A4 G4 - - . A4 C5 D5 . C5 A4 G4 E4 A4 - - - . . . .'],
    bass: ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'A2'], bassPat: 'R...F...', bassVol: 0.14,
    drums: { block: 'x...x.x.', hat: '..x...x.' }, drumVol: { block: 0.3, hat: 0.4 } },
  lake: { bpm: 96, leadInst: 'soft', leadVol: 0.2,       // 日月潭: gentle, rocking like a boat
    lead: ['C5 . E5 . G5 . A5 - G5 . E5 . D5 . E5 - - . C5 . D5 . E5 . G5 . E5 D5 C5 - - - . .',
           'A4 . C5 . D5 . E5 - D5 . C5 . A4 . G4 - - . A4 . C5 . D5 . E5 G5 E5 D5 C5 - - .'],
    bass: ['C3', 'A2', 'F2', 'G2'], bassPat: 'R..F..R.', bassVol: 0.14, drums: { hat: '..x...x.', kick: 'x.......' }, drumVol: { hat: 0.4, kick: 0.4 } },
  forest: { bpm: 118, leadInst: 'pluck', leadVol: 0.12,  // 阿里山: bright mountain folk
    lead: ['D5 . F#5 A5 . F#5 E5 D5 B4 . D5 . E5 - - . A4 B4 D5 . E5 F#5 E5 D5 B4 - A4 - - . . .',
           'F#5 . A5 B5 . A5 F#5 E5 D5 . E5 F#5 E5 D5 B4 . A4 . B4 D5 E5 . D5 B4 D5 - - - . . . .'],
    bass: ['D3', 'B2', 'G2', 'A2', 'D3', 'B2', 'A2', 'D3'], bassPat: 'R.F.R.FR',
    drums: { kick: 'x...x...', hat: '.x.x.x.x', block: 'x..x..x.' }, drumVol: { kick: 0.6, hat: 0.4, block: 0.3 } },
  city: { bpm: 150, leadInst: 'pluck', leadVol: 0.12,    // 台北: city lights
    lead: ['C5 C5 E5 G5 . E5 G5 A5 G5 . E5 . D5 C5 D5 . E5 E5 G5 A5 . G5 E5 D5 C5 - - - . . . .',
           'A5 . G5 E5 G5 . A5 C6 A5 G5 E5 . D5 E5 G5 . E5 D5 C5 D5 E5 . D5 C5 C5 - - - . . . .'],
    bass: ['C3', 'A2', 'F2', 'G2', 'C3', 'A2', 'G2', 'C3'], bassPat: 'R.RFR.RO',
    drums: { kick: 'x...x...', snare: '..x...x.', hat: 'xxxxxxxx' }, drumVol: { kick: 0.7, snare: 0.5, hat: 0.3 } },
  final: { bpm: 166, leadInst: 'suona', leadVol: 0.08,   // 雲豹大王: the last fight, 嗩吶 and drums
    lead: ['A4 C5 D5 E5 . E5 D5 C5 D5 . A4 . G4 A4 C5 . E5 E5 G5 E5 D5 C5 D5 E5 A5 - - - G5 - E5 .',
           'D5 D5 E5 G5 A5 . G5 E5 D5 E5 C5 A4 C5 . . . A4 C5 D5 E5 G5 E5 D5 C5 A4 - - - . . . .'],
    bass: ['A2', 'A2', 'F2', 'G2', 'A2', 'C3', 'G2', 'E2'], bassPat: 'RRFRRRFO',
    drums: { kick: 'x.x.x.x.', snare: '..x...x.', tanggu: 'x..x..x.', cymbal: '....x...' }, drumVol: { kick: 0.7, snare: 0.55, tanggu: 0.6, cymbal: 0.4 } }
});

/* ------------------------------ more versus arenas ------------------------------ */
Object.assign(ARENAS, {
  jiufen: { name: '九份老街', theme: 'jiufen', music: 'jiufen', width: 1000, items: ['milk', 'cracker', 'slipper', 'stick', 'chicken', 'juice'] },
  lake: { name: '日月潭碼頭', theme: 'lake', music: 'lake', hazard: 'wake', items: ['umbrella', 'stone', 'milk', 'juice', 'slipper'] },
  forest: { name: '阿里山', theme: 'forest', music: 'forest', hazard: 'logs', items: ['stick', 'stone', 'milk', 'juice', 'umbrella'] },
  city: { name: '101 廣場', theme: 'city', music: 'city', hazard: 'fireworks', items: ['cracker', 'chicken', 'milk', 'slipper', 'stick'] }
});

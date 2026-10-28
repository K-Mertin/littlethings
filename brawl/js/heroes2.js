'use strict';
/* ------------------------------ 台灣味 heroes ------------------------------
   阿獅（舞獅少年）、鈴鈴（扯鈴少女）、阿棒（棒球少年）. Kids with something very
   Taiwanese: the lion dance at the temple fair, the diabolo, and baseball.
   Their looks are drawn here too (new head styles, held props, chest emblems). */

/* ---------- moves ---------- */
Object.assign(SKILLS, {
  /* ---- 阿獅 ---- */
  silkball: { name: '繡球滾滾', cost: 70, dur: 28, tick(f, t) { if (t === 10) { spawnProj(f, 'silkball', { dx: 28, y: 16, vx: 6.8, dmg: 46, kb: 4, kbY: 6, launch: true, life: 100, r: 16, dz: 17, ground: true }); Sound.play('drum'); } },
    pose(P, t) { const e = clamp((t - 2) / 8, 0, 1); P.ar = [lerp(-0.4, 1.3, e), 0.2]; P.al = [lerp(-0.2, 1.1, e), 0.3]; P.lean = lerp(-0.1, 0.45, e); P.by = 4 * e; P.lr = [0.7, 0.9]; } },
  lionpounce: { name: '獅子撲', cost: 100, dur: 62, start(f) { f.hitSet.clear(); f.superT = 50; f.pounced = 0; },
    tick(f, t) {
      if (t === 8) { const g = nearestFoe(f, 360); if (g) { f.face = sgn(g.x - f.x) || f.face; f.vz = clamp((g.z - f.z) / 30, -2.2, 2.2); } f.vy = 7.5; f.vx = f.face * 7.5; Sound.play('jump'); Sound.play('drum', 0.7); }
      if (t > 8 && !f.pounced) { f.meleeHit({ rx: [-4, 42], hy: [0, 80], dz: 18, dmg: 34, kb: 3, kbY: 6, launch: true, sfx: 'heavy' }); if (f.y <= 0 && t > 12) { f.pounced = t; f.vx = 0; f.vz = 0; W.shake = 6; addPart('ring', f.x + f.face * 20, 0, f.z, { r: 10, grow: 5, life: 16 }); f.hitSet.clear(); } }
      if (f.pounced && t === f.pounced + 6) { f.meleeHit({ rx: [-4, 50], hy: [0, 70], dz: 20, dmg: 30, kb: 5, kbY: 6, launch: true, sfx: 'heavy' }); Sound.play('drum'); }
      if (f.pounced && t > f.pounced + 18) return 'end';
    },
    pose(P, t, f) { if (t < 8) { P.by = 8; P.lean = 0.4; P.ar = [1.0, 1.4]; P.al = [0.8, 1.4]; } else { P.lean = 0.55; P.ar = [1.8, 0.2]; P.al = [1.6, 0.3]; P.ll = [-0.9, 0.4]; P.lr = [0.5, 1.1]; P.face = 'power'; } } },
  liondance: { name: '醒獅大鬧', ult: true, cost: 0, dur: 96, start(f) { f.invul = 104; Sound.play('gong'); },
    tick(f, t) {
      if (t % 6 === 0 && t < 80) Sound.play('drum', 0.9);
      if (t === 14) { spawnProj(f, 'biglion', { dx: -60, y: 0, vx: 7.5, dmg: 56, kb: 5, kbY: 8, launch: true, sfx: 'heavy', life: 190, r: 60, dz: 90, tall: true, pierce: true, noUlt: true, unblock: true }); W.shake = 8; }
      if (t === 70) { W.shake = 12; Sound.play('heavy'); for (let k = 0; k < 4; k++) setTimeout(() => Sound.play('pop'), k * 60);
        for (const v of foesOf(f)) { for (let k = 0; k < 10; k++) addPart('spark', v.x + rnd(-30, 30), rnd(10, 70), v.z, { col: pick(['#ffcc33', '#ff5a4a', '#fff6b0']) }); hitFoe(f, v, { dmg: 46, kb: 3, kbY: 9, launch: true, sfx: 'heavy' }); } }
    },
    pose(P, t) { const k = (t >> 3) & 1; P.ar = [k ? 2.8 : 1.6, 0.3]; P.al = [k ? 1.6 : 2.8, 0.3]; P.by = k ? 6 : 0; P.ll = [-0.5, k ? 1 : 0.3]; P.lr = [0.6, k ? 0.3 : 1]; P.face = 'happy'; } },
  /* ---- 鈴鈴 ---- */
  diabolo: { name: '扯鈴飛盤', cost: 65, dur: 26, tick(f, t) { if (t === 9) { spawnProj(f, 'diabolo', { dx: 26, y: 46, vx: 8.5, dmg: 24, kb: 1.6, stun: 22, fall: 34, life: 84, r: 12, boomer: true }); Sound.play('throw'); } },
    pose(P, t) { const e = clamp((t - 1) / 7, 0, 1); P.ar = [lerp(-0.4, 1.7, e), lerp(1.6, 0.1, e)]; P.al = [lerp(1.4, 0.2, e), 1.2]; P.lean = lerp(-0.1, 0.25, e); } },
  diabolotoss: { name: '高空拋鈴', cost: 100, dur: 46, start(f) { f.tossTgt = nearestFoe(f, 520); },
    tick(f, t) {
      if (t === 10) { spawnProj(f, 'diabolo', { dx: 6, y: 70, vx: 0.001, vy: 12, noHit: true, life: 26 }); Sound.play('jump'); }
      if (t === 34) {
        const g = f.tossTgt && !f.tossTgt.dead ? f.tossTgt : nearestFoe(f, 520), x = g ? g.x : f.x + f.face * 160, z = g ? g.z : f.z;
        W.projs.push({ kind: 'diabolo', big: true, owner: f, team: f.team, x, y: 380, z, vx: 0, vy: -13, vz: 0, t: 0, hit: new Set(), face: f.face, dmg: 48, kb: 2.5, kbY: 8, launch: true, sfx: 'heavy', life: 40, r: 26, dz: 24, slam: true });
        Sound.play('star');
      }
    },
    pose(P, t) { const e = clamp((t - 2) / 8, 0, 1); P.ar = [lerp(1.2, 3.0, e), 0.2]; P.al = [lerp(1.0, 2.8, e), 0.3]; P.by = t < 10 ? 6 * (1 - e) : 0; P.face = t > 20 ? 'happy' : 'n'; } },
  bellstorm: { name: '千鈴大陣', ult: true, cost: 0, dur: 96, start(f) { f.invul = 104; Sound.play('power'); f.bellN = 0; },
    tick(f, t) {
      if (t < 30 && t % 3 === 0) addPart('ring', f.x, 40 + t, f.z, { r: 14, grow: 3, life: 14 });
      if (t >= 24 && t <= 72 && t % 8 === 0) {
        const foes = foesOf(f); if (!foes.length) return;
        for (const v of foes) { const a = rnd(TAU); W.projs.push({ kind: 'diabolo', owner: f, team: f.team, x: f.x + Math.cos(a) * 40, y: 60 + Math.sin(a) * 20, z: f.z, vx: Math.cos(a) * 4, vy: 3, vz: 0, t: 0, hit: new Set(), face: f.face, dmg: 18, kb: 1, stun: 18, fall: 0, life: 70, r: 16, dz: 20, seek: v, noUlt: true, unblock: true, tall: true }); }
        Sound.play('star', 0.6);
      }
      if (t === 84) { W.flashT = 6; for (const v of foesOf(f)) hitFoe(f, v, { dmg: 34, kb: 4, kbY: 8, launch: true, sfx: 'heavy' }); Sound.play('heavy'); }
    },
    pose(P, t) { const s = Math.sin(t * 0.5); P.ar = [2.4 + s * 0.4, 0.3]; P.al = [2.4 - s * 0.4, 0.3]; P.face = 'happy'; P.by = -Math.abs(s) * 3; } },
  /* ---- 阿棒 ---- */
  fastball: { name: '快速直球', cost: 60, dur: 28, tick(f, t) { if (t === 12) { spawnProj(f, 'baseball', { dx: 26, y: 52, vx: 12, dmg: 30, kb: 2, stun: 30, fall: 40, life: 70, r: 9 }); Sound.play('throw'); Sound.play('whiff'); } },
    pose(P, t) { if (t < 10) { const e = t / 10; P.ar = [lerp(0.6, -2.6, e), 0.4]; P.al = [lerp(0.4, 1.6, e), 0.6]; P.lean = -0.25 * e; P.lr = [lerp(0.4, 1.4, e), lerp(0.4, 1.2, e)]; } else { const e = clamp((t - 10) / 4, 0, 1); P.ar = [lerp(-2.6, 1.8, e), 0.2]; P.al = [-0.6, 0.6]; P.lean = lerp(-0.25, 0.5, e); P.ll = [-0.6, 0.3]; P.lr = [0.8, 0.5]; } } },
  homerun: { name: '全壘打', cost: 110, dur: 50, start(f) { f.hitSet.clear(); f.batT = 50; },
    tick(f, t) {
      if (t === 6) Sound.play('power', 0.5);
      if (t === 22) { f.superT = 10; Sound.play('slash'); f.vx = f.face * 2; }
      if (t >= 22 && t <= 28) {
        f.meleeHit({ rx: [-10, 64], hy: [0, 90], dz: 20, dmg: 50, kb: 8, kbY: 9, launch: true, sfx: 'heavy' });
        // a good swing hits flying things straight back
        for (const p of W.projs) if (p.team !== f.team && !p.noHit && Math.abs(p.x - (f.x + f.face * 36)) < 52 && Math.abs(p.z - f.z) < 22 && p.y < 110) {
          p.team = f.team; p.owner = f; p.vx = f.face * Math.max(8, Math.abs(p.vx) * 1.4); p.vy = Math.max(0, p.vy); p.face = f.face; p.hit = new Set(); p.t = 0; p.life = Math.max(p.life || 60, 70); p.dmg = (p.dmg || 20) * 1.5;
          addPart('burst', p.x, p.y, p.z, { word: '打回去！', r: 30, col: '#fff27a' }); Sound.play('heavy', 0.7);
        }
      }
      if (t === 23 && f.hitSet.size) addPart('callout', f.x, 110, f.z, { txt: '全壘打', life: 40, col: '#ffcc33' });
    },
    pose(P, t) { if (t < 22) { const e = clamp(t / 12, 0, 1); P.ar = [lerp(0.6, -2.4, e), 0.5]; P.al = [lerp(0.4, -2.2, e), 0.5]; P.lean = -0.25 * e; P.lr = [lerp(0.4, 1.2, e), lerp(0.4, 1.0, e)]; P.face = 'power'; } else { const e = clamp((t - 22) / 5, 0, 1); P.ar = [lerp(-2.4, 2.0, e), 0.1]; P.al = [lerp(-2.2, 1.8, e), 0.2]; P.lean = lerp(-0.25, 0.5, e); P.ll = [-0.7, 0.3]; P.lr = [0.8, 0.4]; } } },
  grandslam: { name: '滿壘全壘打', ult: true, cost: 0, dur: 100, start(f) { f.invul = 108; f.batT = 100; f.slamTg = foesOf(f).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x)).slice(0, 8); Sound.play('power'); },
    tick(f, t) {
      const k = t >= 18 ? (t - 18) / 9 : -1;
      if (k >= 0 && k === Math.floor(k) && k < Math.max(3, f.slamTg.length)) {
        const v = f.slamTg[k % Math.max(1, f.slamTg.length)];
        W.projs.push({ kind: 'baseball', fire: true, owner: f, team: f.team, x: f.x + f.face * 30, y: 60, z: f.z, vx: f.face * 6, vy: 2, vz: 0, t: 0, hit: new Set(), face: f.face, dmg: k < f.slamTg.length ? 70 : 40, kb: 6, kbY: 10, launch: true, sfx: 'heavy', life: 90, r: 14, dz: 22, seek: v && !v.dead ? v : null, noUlt: true, unblock: true, tall: true });
        Sound.play('slash'); Sound.play('heavy', 0.5); W.shake = 5;
      }
      if (t === 90) addPart('callout', f.x, 120, f.z, { txt: '滿壘全壘打', life: 46, col: '#ffcc33' });
    },
    pose(P, t) { const ph = t < 18 ? -1 : (t - 18) % 9; if (ph < 0) { P.ar = [3.0, 0.2]; P.al = [-2.2, 0.5]; P.face = 'power'; } else if (ph < 4) { P.ar = [-2.4, 0.5]; P.al = [-2.2, 0.5]; P.lean = -0.2; } else { P.ar = [2.0, 0.1]; P.al = [1.8, 0.2]; P.lean = 0.45; P.face = 'happy'; } } }
});
/* diabolos and baseballs that chase their target, and the diabolo that slams down from the sky */
{
  const _up = updateProjs;
  updateProjs = function () {
    for (const p of W.projs) {
      if (p.seek) { const g = p.seek; if (g.dead) p.seek = null; else { const dx = g.x - p.x, dz = g.z - p.z, dy = g.y + 40 - p.y, d = Math.hypot(dx, dz, dy) || 1, sp = p.kind === 'baseball' ? 13 : 9; p.vx += (dx / d * sp - p.vx) * 0.25; p.vz += (dz / d * sp - p.vz) * 0.25; p.vy += (dy / d * sp - p.vy) * 0.25; p.face = sgn(p.vx) || p.face; } }
      if (p.slam && p.y <= 0 && !p.landed) { p.landed = true; p.life = p.t + 6; p.vy = 0; p.vx = 0; W.shake = 8; Sound.play('heavy'); addPart('ring', p.x, 0, p.z, { r: 10, grow: 6, life: 18 });
        if (p.owner) for (const v of W.fighters) if (v.team !== p.team && !v.dead && !p.hit.has(v) && Math.abs(v.x - p.x) < 64 && Math.abs(v.z - p.z) < 30 && v.y < 40) { p.hit.add(v); applyHit(p.owner, v, { dmg: p.dmg, kb: 3, kbY: 8, launch: true, sfx: 'heavy' }, sgn(v.x - p.x || 1), true); } }
    }
    _up();
  };
}

/* ---------- roster ---------- */
Object.assign(CHARS, {
  shi: { name: '阿獅', en: 'Shi', blurb: '舞獅少年。繡球在地上滾過去、獅子撲上去咬兩口，大絕招醒獅大鬧整個畫面，最後鞭炮一起炸開。', hp: 560, spd: 0.96, pow: 1.06, stats: [3, 2, 3], unlockStage: 4, unlock: '打通第五關解鎖',
    look: mkLook({ style: 'lionhat', skin: '#f1c29b', hair: '#2b2018', acc: '#e8432f', shirt: '#ffcc33', trim: '#e8432f', pants: '#e8432f', shoe: '#2b2733', belt: '#e8432f', stripe: '#ffcc33', eye: '#7a3a14', emblem: 'ball', emblemCol: '#e8432f', wrap: '#ffcc33' }),
    combo: ['jab', 'cross', 'kick'], skills: ['silkball', 'lionpounce', 'liondance'] },
  ling: { name: '鈴鈴', en: 'Ling', blurb: '扯鈴少女。扯鈴丟出去會飛回來，往天上一拋砸在敵人頭上，大絕招千鈴大陣追著每個敵人打。', hp: 450, spd: 1.06, pow: 0.94, stats: [2, 3, 2], unlockStage: 6, unlock: '打通第七關解鎖',
    look: mkLook({ style: 'ponytail', skin: '#f8d6bd', hair: '#3a2418', acc: '#ff5aa0', shirt: '#3fc6b8', trim: '#ffffff', pants: '#2f8a9a', shoe: '#ff5aa0', stripe: '#ffffff', shorts: true, eye: '#2f8a8a', lash: true, emblem: 'bell', emblemCol: '#ff5aa0', prop: 'diabolo' }),
    combo: ['jab', 'cross', 'kick'], skills: ['diabolo', 'diabolotoss', 'bellstorm'] },
  slugger: { name: '阿棒', en: 'Slugger', blurb: '棒球少年。快速直球讓人麻一下，全壘打把人和飛過來的東西一起打回去，大絕招滿壘全壘打。', hp: 470, spd: 1.0, pow: 0.98, stats: [4, 2, 2], unlockTower: 10,
    look: mkLook({ style: 'cap', skin: '#e8b48a', hair: '#2b2018', acc: '#2f5fd1', shirt: '#f6f6fa', trim: '#2f5fd1', pants: '#e8e8f0', shoe: '#2b2733', stripe: '#2f5fd1', belt: '#2b2733', eye: '#4a3020', emblem: 'num', emblemCol: '#2f5fd1', glove: '#f1c29b' }),
    combo: ['jab', 'cross', 'kick'], skills: ['fastball', 'homerun', 'grandslam'] }
});
HEROES.push('shi', 'ling', 'slugger');
HERO_GROUPS.push(['台灣味', '舞獅、扯鈴、棒球', ['shi', 'ling', 'slugger']]);
{
  const _hu = heroUnlocked;
  heroUnlocked = function (id) { const d = CHARS[id]; if (d && d.unlockTower) return store.get('towerBest', 0) >= d.unlockTower || store.get('unlockAll', false); return _hu(id); };
  const _ut = unlockText;
  unlockText = function (id) { const d = CHARS[id]; if (d && d.unlockTower) return `挑戰塔爬到第 ${d.unlockTower} 層解鎖（${Math.min(store.get('towerBest', 0), d.unlockTower)}/${d.unlockTower}）`; return _ut(id); };
}

/* ---------- looks ---------- */
{
  const _hair = drawHair;
  drawHair = function (c, L, back, f, P) {
    const R = HR, t = f ? f.clock : 0;
    switch (L.style) {
      case 'lionhat': { // a little 獅頭 worn like a hat, with a mane down the back
        if (back) { const w = Math.sin(t * 0.15) * 2; for (let i = 0; i < 5; i++) { const a = -1.4 - i * 0.38; c.beginPath(); c.moveTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2)); c.quadraticCurveTo(Math.cos(a) * (R + 10) - 4, Math.sin(a) * (R + 10) + w, Math.cos(a - 0.2) * (R + 6) - 6, Math.sin(a - 0.2) * (R + 6) + 4 + w); c.lineTo(Math.cos(a - 0.3) * (R - 3), Math.sin(a - 0.3) * (R - 3)); c.closePath(); c.fillStyle = i & 1 ? '#ffcc33' : '#ff7a3d'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); } return; }
        // hair peeking out under the hat
        c.beginPath(); c.moveTo(R + 1, -2); c.quadraticCurveTo(R, -R + 2, 0, -R + 3); c.quadraticCurveTo(-R, -R + 4, -R + 1, 4); c.lineTo(-3, 0); c.lineTo(3, -4); c.lineTo(8, -2); c.closePath(); c.fillStyle = L.hair; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
        c.save(); c.translate(1, -R - 2); const bob = Math.sin(t * 0.2) * 0.6;
        c.beginPath(); c.ellipse(0, 0, R + 2, R * 0.72, 0, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fillStyle = '#e8432f'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
        c.fillStyle = '#ffcc33'; c.fillRect(-R - 1, -2, R * 2 + 4, 3.4); c.strokeRect(-R - 1, -2, R * 2 + 4, 3.4);
        for (let i = 0; i < 6; i++) blob(c, -R + 2 + i * 5, -1.5, 2.2, 2.2, '#fff6e6');
        blob(c, 6, -6 + bob, 4, 3.6, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(7.2, -6 + bob, 2, 0, TAU); c.fill();
        c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(2, -10.5); c.quadraticCurveTo(6, -12.5, 10.5, -10); c.stroke();
        c.beginPath(); c.moveTo(-2, -R * 0.7 + 1); c.lineTo(0, -R * 0.7 - 6); c.lineTo(3, -R * 0.7 + 1); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 1.6; c.stroke();
        blob(c, R + 1, -3, 3, 2.6, '#ff8a3d');
        c.restore();
        return;
      }
      case 'ponytail': { // 鈴鈴: a high ponytail with a ribbon that swings as she moves
        if (back) { const w = Math.sin(t * 0.14) * 4; c.beginPath(); c.moveTo(-3, -R + 1); c.quadraticCurveTo(-R - 10, -R - 6 + w * 0.3, -R - 12, 4 + w); c.quadraticCurveTo(-R - 4, 0 + w, -R + 2, -R + 6); c.closePath(); c.fillStyle = L.hair; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); return; }
        c.beginPath(); c.moveTo(R + 1, -1); c.quadraticCurveTo(R + 1, -R - 3, -2, -R - 1); c.quadraticCurveTo(-R - 2, -R + 3, -R + 1, 7); c.lineTo(-4, 3); c.lineTo(1, -5); c.lineTo(5, -2); c.lineTo(8, -6); c.lineTo(11, -2); c.closePath();
        c.fillStyle = L.hair; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
        c.save(); c.translate(-R + 1, -R + 3); c.rotate(-0.4); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 6, -4); c.lineTo(s * 6, 4); c.closePath(); c.fillStyle = L.acc; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); } blob(c, 0, 0, 2, 2, shade(L.acc, -0.2)); c.restore();
        return;
      }
      case 'cap': { // 阿棒: a baseball cap, brim to the front
        if (back) return;
        c.beginPath(); c.moveTo(R + 1, -1); c.quadraticCurveTo(R, -6, 4, -7); c.lineTo(-R, -2); c.lineTo(-R, 5); c.lineTo(-R + 4, 2); c.closePath(); c.fillStyle = L.hair; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
        c.beginPath(); c.arc(0, -3, R + 1.5, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fillStyle = L.acc; c.fill(); c.lineWidth = 2.2; c.stroke();
        c.beginPath(); c.moveTo(R - 2, -5.5); c.quadraticCurveTo(R + 8, -6.5, R + 11, -3); c.quadraticCurveTo(R + 4, -2, R - 2, -3); c.closePath(); c.fillStyle = shade(L.acc, -0.2); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.font = '900 8px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('T', 3, -R + 1.5);
        blob(c, -1, -R - 4, 1.8, 1.4, shade(L.acc, -0.2));
        return;
      }
    }
    return _hair(c, L, back, f, P);
  };
  // no hair strands or shine drawn over a hat
  const _hl = hairLocks, _hs = hairSheen, HAT = new Set(['cap', 'lionhat']);
  hairLocks = function (c, L) { if (!HAT.has(L.style)) _hl(c, L); };
  hairSheen = function (c, L) { if (!HAT.has(L.style)) _hs(c, L); };
  const _emb = drawEmblem;
  drawEmblem = function (c, kind, x, y, col) {
    if (kind === 'ball') { c.save(); c.translate(x, y); blob(c, 0, 0, 3.6, 3.6, col); c.strokeStyle = '#ffcc33'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, -1); c.lineTo(3, 1); c.moveTo(-1, -3); c.lineTo(1, 3); c.stroke(); c.restore(); return; }
    if (kind === 'bell') { c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 4, -3); c.lineTo(s * 4, 3); c.closePath(); c.fill(); c.stroke(); } c.restore(); return; }
    if (kind === 'num') { c.save(); c.translate(x, y); c.fillStyle = col; c.font = '900 8px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('10', 0, 0.5); c.restore(); return; }
    return _emb(c, kind, x, y, col);
  };
  /* props in the hand: the bat while swinging, the diabolo sticks the rest of the time */
  const _held = drawHeld;
  drawHeld = function (c, it, g) {
    if (it.kind === 'bbat') {
      const dx = Math.sin(g.s2), dy = Math.cos(g.s2), ex = g.h.x + dx * 40, ey = g.h.y + dy * 40;
      seg(c, [P2(g.h.x - dx * 6, g.h.y - dy * 6), P2(g.h.x + dx * 20, g.h.y + dy * 20)], 4, '#c8945a');
      seg(c, [P2(g.h.x + dx * 18, g.h.y + dy * 18), P2(ex, ey)], 7.5, '#d9a66a');
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(ex - dx * 6, ey - dy * 6, 1.6, 0, TAU); c.fill();
      blob(c, g.h.x, g.h.y, 6, 6, '#f1c29b'); return;
    }
    if (it.kind === 'diaboloProp') {
      const dx = Math.sin(g.s2), dy = Math.cos(g.s2), t = it.t || 0;
      seg(c, [P2(g.h.x - dx * 4, g.h.y - dy * 4), P2(g.h.x + dx * 18, g.h.y + dy * 18)], 2.4, '#8a5a2f');
      const tx = g.h.x + dx * 18, ty = g.h.y + dy * 18, bx = tx + 10, by = ty + 14 + Math.sin(t * 0.2) * 2;
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx, by); c.lineTo(tx + 20, ty + 2); c.stroke();
      c.save(); c.translate(bx, by); c.rotate(Math.sin(t * 0.1) * 0.2); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 6, -4.5); c.lineTo(s * 6, 4.5); c.closePath(); c.fillStyle = '#ff5aa0'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); } c.restore();
      blob(c, g.h.x, g.h.y, 6, 6, '#f8d6bd'); return;
    }
    return _held(c, it, g);
  };
  const BAT = { kind: 'bbat' };
  const _df = drawFighter;
  drawFighter = function (c, f) {
    if (f.hold || f.dead) return _df(c, f);
    let prop = null;
    if (f.batT > 0 && f.state === 'skill') prop = BAT;
    else if (f.look.prop === 'diabolo' && f.state !== 'skill' && f.state !== 'throw') prop = { kind: 'diaboloProp', t: f.clock };
    if (!prop) return _df(c, f);
    f.hold = prop; try { return _df(c, f); } finally { f.hold = null; }
  };
  const _upd = Fighter.prototype.update;
  Fighter.prototype.update = function () { if (this.batT > 0) this.batT--; return _upd.call(this); };
}
/* projectiles */
Object.assign(PROJ2, {
  silkball(c, p, x, gy, y) { // a red embroidered ball with ribbons, hopping along the floor
    const hop = Math.abs(Math.sin(p.t * 0.25)) * 12, yy = gy - 16 - hop; c.fillStyle = 'rgba(20,16,40,.25)'; c.beginPath(); c.ellipse(x, gy, 14, 4, 0, 0, TAU); c.fill();
    c.save(); c.translate(x, yy); c.rotate(p.t * 0.3 * p.face); blob(c, 0, 0, 14, 14, '#e8432f'); c.strokeStyle = '#ffcc33'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(0, 0, 14, 5, k * Math.PI / 3, 0, TAU); c.stroke(); } c.restore();
    c.strokeStyle = '#ffcc33'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - p.face * 10, yy); c.quadraticCurveTo(x - p.face * 22, yy - 6 + Math.sin(p.t * 0.4) * 4, x - p.face * 30, yy + 2); c.stroke(); },
  biglion(c, p, x, gy) { // 醒獅: a big dancing lion head with its tail cloth behind
    const bob = Math.sin(p.t * 0.4) * 8, y = gy - 70 + bob, s = 2.2;
    c.fillStyle = 'rgba(20,16,40,.28)'; c.beginPath(); c.ellipse(x, gy, 70, 12, 0, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.scale(p.face * s, s);
    c.beginPath(); c.moveTo(-14, -4); c.quadraticCurveTo(-40, -10 + bob * 0.3, -56, 6); c.quadraticCurveTo(-40, 20, -12, 14); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = '#e8432f'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-20 - k * 9, -4 + k); c.lineTo(-22 - k * 9, 12 - k); c.stroke(); }
    for (const lx of [-30, -8]) { seg(c, [P2(lx, 14), P2(lx + Math.sin(p.t * 0.4 + lx) * 4, 30)], 4, '#e8432f'); blob(c, lx + Math.sin(p.t * 0.4 + lx) * 4, 31, 5, 3, '#2b2733'); }
    c.beginPath(); c.ellipse(0, 0, 22, 18, 0, 0, TAU); c.fillStyle = '#e8432f'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
    for (let i = 0; i < 9; i++) { const a = -2.4 + i * 0.5; blob(c, Math.cos(a) * 22, Math.sin(a) * 18, 4.5, 4.5, i & 1 ? '#fff6e6' : '#ffcc33'); }
    blob(c, 10, -6, 6, 5.5, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(12, -6, 3, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(13, -7.5, 1, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0, -18); c.lineTo(3, -28); c.lineTo(7, -17); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
    const open = (p.t >> 3) & 1; c.beginPath(); c.moveTo(8, 6); c.quadraticCurveTo(20, 4 + open * 4, 24, 8); c.quadraticCurveTo(18, 14 + open * 4, 8, 10); c.closePath(); c.fillStyle = '#7a1f2a'; c.fill(); c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#fff'; c.fillRect(12, 6, 3, 3); c.fillRect(17, 6, 3, 3);
    blob(c, 20, -1, 4, 3.4, '#ff8a3d');
    c.restore(); },
  diabolo(c, p, x, gy, y) { const s = p.big ? 2 : 1; c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 10 * s, 3 * s, 0, 0, TAU); c.fill(); c.save(); c.translate(x, y); c.scale(s, s); c.rotate(p.t * 0.6);
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(sd * 9, -7); c.lineTo(sd * 9, 7); c.closePath(); c.fillStyle = sd > 0 ? '#ff5aa0' : '#ff8ac0'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); }
    blob(c, 0, 0, 2.2, 2.2, '#ffcc33'); c.restore();
    if (p.t % 3 === 0 && !p.noHit) addPart('star', x, p.y, p.z, { life: 10 }); },
  baseball(c, p, x, gy, y) { c.fillStyle = 'rgba(20,16,40,.2)'; c.beginPath(); c.ellipse(x, gy, 8, 2.5, 0, 0, TAU); c.fill();
    if (p.fire) { c.save(); c.globalAlpha = 0.6; c.fillStyle = '#ffcc33'; c.beginPath(); c.moveTo(x - sgn(p.vx) * 30, y - 6); c.lineTo(x, y - 9); c.lineTo(x, y + 9); c.lineTo(x - sgn(p.vx) * 30, y + 6); c.closePath(); c.fill(); c.restore(); }
    else { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - sgn(p.vx) * 22, y); c.lineTo(x - sgn(p.vx) * 8, y); c.moveTo(x - sgn(p.vx) * 18, y - 5); c.lineTo(x - sgn(p.vx) * 8, y - 4); c.stroke(); }
    c.save(); c.translate(x, y); c.rotate(p.t * 0.5); blob(c, 0, 0, p.fire ? 11 : 8, p.fire ? 11 : 8, '#fff'); c.strokeStyle = '#e8432f'; c.lineWidth = 1.4; c.beginPath(); c.arc(-9, 0, 7, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(9, 0, 7, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); c.restore(); }
});

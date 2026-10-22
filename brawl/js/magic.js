'use strict';
/* -------------------- second skill set, ultimates and the magic heroes --------------------
   Every hero has two everyday specials (blue 氣) and one 大絕招 (ultimate) that runs on the
   gold 絕招能量 meter instead: it fills when you hit or get hit, and when it is full the
   third button glows. An ultimate freezes the world for a short cut-in, makes the caster
   untouchable while it plays, and hits most or all of the screen. */
const ULT_MAX = 100;
function foesOf(f, onScreen = true) {
  return W.fighters.filter(v => v.team !== f.team && !v.dead && !v.invisible && !(v.def.pet && v.team === f.team) &&
    (!onScreen || (v.x > W.camX - 40 && v.x < W.camX + Wv + 40)));
}
const ULT = { noUlt: true, unblock: true };           // ultimate hits: can't be blocked and don't refill the meter
function hitFoe(f, v, A) { return applyHit(f, v, Object.assign({}, ULT, A), sgn(v.x - f.x || f.face), true); }
function raisePose(P, t) { const e = clamp(t / 10, 0, 1); P.ar = [lerp(0.6, 2.9, e), 0.2]; P.al = [lerp(0.4, 2.7, e), 0.2]; P.lean = -0.1 * e; P.face = 'power'; }
function wandPose(P, t, a = 8, b = 15) { castPose(P, t, a, b); P.al = [0.3, 1.6]; }

Object.assign(SKILLS, {
  /* ---- 阿烈 ---- */
  flamekick: { name: '火焰旋風腳', cost: 100, dur: 46, start(f) { f.superT = 34; f.kickDir = f.face; f.hitSet.clear(); Sound.play('fire'); },
    tick(f, t) {
      if (t >= 4 && t <= 34) {
        const near = W.fighters.some(v => v.team !== f.team && !v.dead && Math.abs(v.z - f.z) < 18 && (v.x - f.x) * f.kickDir > -10 && (v.x - f.x) * f.kickDir < 34);
        f.vx = near ? f.kickDir * 0.8 : f.kickDir * 6.2; if (t % 4 === 0) f.face = -f.face;
        if (t % 6 === 0) { f.hitSet.clear(); f.meleeHit({ rx: [-20, 42], hy: [0, 72], dz: 18, dmg: 13, kb: 0.8, stun: 14, fall: 0, stop: 2 }); }
        addPart('fire', f.x + rnd(-24, 24), rnd(10, 50), f.z, { vx: rnd(-1, 1), vy: rnd(0.5, 2) });
      }
      if (t === 36) { f.face = f.kickDir; f.vx = 0; f.hitSet.clear(); f.meleeHit({ rx: [-34, 50], hy: [0, 76], dz: 20, dmg: 34, kb: 5.5, kbY: 6, launch: true, sfx: 'heavy' }); }
    },
    pose(P, t) { const s = (t >> 1) & 1; P.lr = [1.65, 0]; P.ll = [-0.2, 0.9]; P.lean = s ? -0.25 : -0.4; P.ar = [-0.8, 1]; P.al = [2.4, 0.6]; P.by = -6; } },
  phoenix: { name: '火鳳凰', ult: true, cost: 0, dur: 64, start(f) { f.invul = 70; },
    tick(f, t) {
      if (t === 16) {
        spawnProj(f, 'phoenix', { dx: -10, y: 60, vx: 8.5, dmg: 125, kb: 7, kbY: 9, launch: true, sfx: 'heavy', life: 170, r: 56, dz: 90, tall: true, pierce: true, noUlt: true, unblock: true });
        Sound.play('fire'); Sound.play('power'); W.shake = 10;
      }
      if (t < 16 && t % 2 === 0) addPart('fire', f.x + rnd(-30, 30), rnd(0, 90), f.z, { vy: rnd(1, 3) });
    }, pose: raisePose },
  /* ---- 小雪 ---- */
  iceslide: { name: '冰滑道', cost: 100, dur: 42, start(f) { f.invul = 14; f.hitSet.clear(); Sound.play('ice'); },
    tick(f, t) {
      if (t >= 4 && t <= 30) { f.vx = f.face * 9; f.meleeHit({ rx: [-8, 40], hy: [-4, 40], dz: 20, dmg: 44, kb: 3, kbY: 6, launch: true, sfx: 'heavy' }); if (t % 2 === 0) addPart('ice', f.x - f.face * 10, 2, f.z + rnd(-8, 8), { vy: 0.3 }); }
      else f.vx *= 0.75;
    },
    pose(P) { P.lean = -0.55; P.lr = [1.4, 0.05]; P.ll = [0.9, 0.6]; P.ar = [-1.2, 0.6]; P.al = [2.2, 0.4]; P.by = 10; P.face = 'happy'; } },
  snowstorm: { name: '暴風雪', ult: true, cost: 0, dur: 92, start(f) { f.invul = 100; Sound.play('ice'); },
    tick(f, t) {
      for (let i = 0; i < 4; i++) addPart('snow', W.camX + rnd(Wv), rnd(20, 300), rnd(FLOOR_D), { vx: rnd(-4, -2), vy: rnd(-2, -0.5), life: 50 });
      if (t % 10 === 0) Sound.play('wind', 0.5);
      if (t === 50) { W.flashT = 8; for (const v of foesOf(f)) hitFoe(f, v, { dmg: 90, freeze: true, kb: 0.5 }); Sound.play('shatter'); }
    }, pose: raisePose },
  /* ---- 阿岩 ---- */
  boulder: { name: '舉大石', cost: 110, dur: 48, start(f) { f.superT = 30; },
    tick(f, t) {
      if (t === 6) { Sound.play('heavy', 0.6); for (let i = 0; i < 6; i++) addPart('rock', f.x + rnd(-20, 20), 2, f.z, { vx: rnd(-2, 2), vy: rnd(2, 4) }); }
      if (t === 28) { spawnProj(f, 'boulder', { dx: 16, y: 90, vx: 6.5, vy: 2, grav: true, dmg: 72, kb: 6, kbY: 7, launch: true, sfx: 'heavy', life: 160, r: 24 }); Sound.play('throw'); }
    },
    pose(P, t) { if (t < 28) { P.ar = [3.0, 0.5]; P.al = [2.8, 0.5]; P.by = t < 10 ? 6 : 0; P.face = 'power'; } else { const e = clamp((t - 28) / 6, 0, 1); P.ar = [lerp(3, 1.6, e), 0.3]; P.al = [lerp(2.8, 1.4, e), 0.3]; P.lean = 0.35 * e; } } },
  quake: { name: '大地震', ult: true, cost: 0, dur: 90, start(f) { f.invul = 100; f.quaked = 0; },
    tick(f, t) {
      if (t === 6) { f.vy = 11; f.vx = 0; Sound.play('jump'); }
      if (t > 12 && f.y <= 0 && !f.quaked) {
        f.quaked = t; W.shake = 26; Sound.play('quake'); Sound.play('gong');
        for (let k = 0; k < 4; k++) addPart('ring', f.x, 0, f.z, { r: 10 + k * 30, grow: 10, life: 30 });
        for (const v of foesOf(f)) if (v.y < 40 || v.def.fly) hitFoe(f, v, { dmg: 120, kb: 3, kbY: 11, launch: true, sfx: 'heavy' });
      }
      if (f.quaked) { if (t % 3 === 0) addPart('rock', W.camX + rnd(Wv), 300, rnd(FLOOR_D), { vx: rnd(-1, 1), vy: -2 }); if (t > f.quaked + 34) return 'end'; }
    },
    pose(P, t, f) { if (!f.quaked) { P.ar = [3.0, 0.3]; P.al = [2.8, 0.3]; P.ll = [-0.3, 1.0]; P.lr = [0.7, 1.3]; P.face = 'power'; } else { P.ar = [1.0, 0.1]; P.al = [0.8, 0.1]; P.by = 10; P.lean = 0.6; P.ll = [-0.6, 1.0]; P.lr = [0.9, 1.5]; } } },
  /* ---- 小飛 ---- */
  clone: { name: '分身術', cost: 110, dur: 26, tick(f, t) { if (t === 10) { f.cloneT = 420; for (const dz of [-24, 24]) smoke({ x: f.x - f.face * 20, z: f.z + dz }); Sound.play('poof'); } },
    pose(P, t) { P.ar = [1.2, 2.4]; P.al = [1.1, 2.4]; P.face = 'power'; P.by = 2; } },
  shurikenRain: { name: '千本手裡劍', ult: true, cost: 0, dur: 74, start(f) { f.invul = 80; f.rainN = 0; },
    tick(f, t) {
      if (t === 6) { f.vy = 9; Sound.play('jump'); }
      if (t >= 14 && t <= 62 && t % 3 === 0) {
        const foes = foesOf(f); const v = foes.length ? foes[f.rainN++ % foes.length] : null;
        const x = v ? v.x + rnd(-18, 18) : W.camX + rnd(Wv), z = v ? v.z + rnd(-6, 6) : rnd(FLOOR_D);
        W.projs.push({ kind: 'star', owner: f, team: f.team, x, y: 340, z, vx: 0, vy: -13, vz: 0, t: 0, hit: new Set(), face: 1, dmg: 20, kb: 1, stun: 12, fall: 25, life: 40, r: 12, noUlt: true, unblock: true });
        if (t % 9 === 0) Sound.play('star', 0.6);
      }
    },
    pose(P, t) { const e = (t >> 2) & 1; P.ar = [e ? 2.6 : 1.4, 0.1]; P.al = [e ? 1.4 : 2.6, 0.1]; P.ll = [-0.3, 1.2]; P.lr = [0.6, 1.4]; P.face = 'power'; } },
  /* ---- 小雷 ---- */
  chain: { name: '連鎖閃電', cost: 100, dur: 34,
    tick(f, t) {
      if (t !== 10) return;
      const pts = [{ x: f.x + f.face * 20, y: 50, z: f.z }], hit = new Set(); let from = f, range = 330;
      for (let k = 0; k < 4; k++) {
        let best = null, bd = range;
        for (const v of W.fighters) if (v.team !== f.team && !v.dead && !hit.has(v) && Math.abs(v.z - from.z) < 70) { const d = Math.abs(v.x - from.x) + Math.abs(v.z - from.z); if (d < bd) { bd = d; best = v; } }
        if (!best) break;
        hit.add(best); pts.push({ x: best.x, y: best.y + 40, z: best.z });
        applyHit(f, best, { dmg: 38, stun: 40, fall: 0, kb: 1, shock: true, unblock: true }, sgn(best.x - from.x || f.face), true);
        from = best; range = 250;
      }
      addPart('chain', 0, 0, f.z, { pts, life: 16 }); Sound.play('zap'); if (pts.length > 1) Sound.play('thunder', 0.5);
    }, pose(P, t) { castPose(P, t, 9, 18); } },
  thunderGod: { name: '雷神降臨', ult: true, cost: 0, dur: 96, start(f) { f.invul = 100; W.stormT = 96; Sound.play('thunder'); },
    tick(f, t) {
      const k = [24, 46, 68].indexOf(t);
      if (k >= 0) {
        W.flashT = 5; W.shake = 10; Sound.play('thunder');
        for (const v of foesOf(f)) { addPart('strike', v.x, 0, v.z, { life: 14 }); hitFoe(f, v, { dmg: 42, kb: k === 2 ? 4 : 1, kbY: k === 2 ? 8 : 0, launch: k === 2, stun: 30, fall: 0, shock: true, sfx: 'heavy' }); }
      }
    }, pose(P, t) { P.ar = [3.0, 0.1]; P.al = [2.8, 0.1]; P.face = 'power'; P.by = -Math.min(10, t); } },
  /* ---- 阿風 ---- */
  superTornado: { name: '超級龍捲風', ult: true, cost: 0, dur: 50, start(f) { f.invul = 60; Sound.play('wind'); },
    tick(f, t) { if (t === 14) { spawnProj(f, 'bigtornado', { dx: 50, y: 0, vx: 3.4, dmg: 12, stun: 16, fall: 0, kb: 0, multi: 40, lift: true, life: 190, r: 60, dz: 90, tall: true, noUlt: true, unblock: true, finale: { dmg: 50, kb: 5, kbY: 11, launch: true } }); Sound.play('wind'); W.shake = 6; } },
    pose(P) { P.ar = [2.4, 0.2]; P.al = [2.2, 0.2]; P.by = -4; P.face = 'power'; } },
  /* ---- 小咪 ---- */
  parade: { name: '動物大遊行', ult: true, cost: 0, dur: 70, start(f) { f.invul = 80; f.paradeN = 0; Sound.play('woof'); },
    tick(f, t) {
      if (t >= 12 && t <= 56 && t % 4 === 0) {
        const lane = [20, 60, 100, 140][f.paradeN % 4], kinds = ['dog', 'cat', 'boar', 'dog', 'monkey'];
        const x0 = f.face > 0 ? W.camX - 60 : W.camX + Wv + 60;
        W.projs.push({ kind: 'animal', who: kinds[f.paradeN % kinds.length], owner: f, team: f.team, x: x0, y: 0, z: lane + rnd(-8, 8), vx: f.face * rnd(9, 11), vy: 0, vz: 0, t: 0, hit: new Set(), face: f.face, dmg: 38, kb: 5, kbY: 6, launch: true, sfx: 'heavy', life: 170, r: 26, dz: 22, tall: true, pierce: true, noUlt: true, unblock: true });
        f.paradeN++; if (t % 8 === 0) Sound.play(f.paradeN % 2 ? 'woof' : 'pop', 0.6);
      }
    }, pose(P, t) { const k = Math.sin(t * 0.4); P.ar = [2.6 + k * 0.3, 0.3]; P.al = [2.6 - k * 0.3, 0.3]; P.face = 'happy'; P.by = -Math.abs(k) * 4; } },
  /* ---- 小月 (星星魔法) ---- */
  starshot: { name: '星星彈', cost: 70, dur: 28, tick(f, t) { if (t === 10) { [-1.2, 0, 1.2].forEach(vz => spawnProj(f, 'mstar', { dx: 26, y: 50, vx: 5.5, vz, dmg: 22, kb: 1.5, stun: 18, fall: 40, life: 130, r: 11, home: true })); Sound.play('star'); } }, pose(P, t) { wandPose(P, t, 9, 16); } },
  frog: { name: '變變變', cost: 110, dur: 30, tick(f, t) { if (t === 10) { spawnProj(f, 'spell', { dx: 28, y: 46, vx: 8, dmg: 12, kb: 0.5, stun: 10, fall: 0, frog: true, life: 90, r: 13 }); Sound.play('zap', 0.6); } }, pose(P, t) { wandPose(P, t, 9, 16); } },
  meteor: { name: '流星雨', ult: true, cost: 0, dur: 100, start(f) { f.invul = 110; f.metN = 0; Sound.play('power'); },
    tick(f, t) {
      if (t >= 16 && t <= 76 && t % 10 === 6) {
        const foes = foesOf(f); const v = foes.length ? foes[f.metN++ % foes.length] : null;
        const x = v ? v.x + rnd(-20, 20) : W.camX + rnd(80, Wv - 80), z = v ? v.z : rnd(20, FLOOR_D - 20);
        W.projs.push({ kind: 'meteor', owner: f, team: f.team, x: x - 120, y: 420, z, vx: 3, vy: -11, vz: 0, t: 0, hit: new Set(), face: 1, dmg: 0, life: 80, r: 24, noHit: true, last: t > 70 });
      }
    }, pose(P, t) { const e = (t >> 3) & 1; P.ar = [2.9, 0.2]; P.al = [e ? 2.4 : 2.9, 0.4]; P.face = 'power'; } },
  /* ---- 波波 (泡泡魔法) ---- */
  bubble: { name: '泡泡', cost: 80, dur: 30, tick(f, t) { if (t === 10) { spawnProj(f, 'bubble', { dx: 30, y: 44, vx: 4.6, dmg: 8, kb: 0, stun: 0, fall: 0, bubble: true, life: 150, r: 16 }); Sound.play('pop'); } }, pose(P, t) { wandPose(P, t, 9, 16); } },
  shield: { name: '水之盾', cost: 100, dur: 26, tick(f, t) { if (t === 10) { f.shieldHits = 3; f.shieldT = 600; Sound.play('pop'); for (let i = 0; i < 10; i++) addPart('bubbleP', f.x + rnd(-30, 30), rnd(10, 80), f.z, { vy: rnd(0.5, 1.5) }); } },
    pose(P) { P.ar = [1.8, 2.2]; P.al = [1.6, 2.2]; P.face = 'happy'; } },
  tsunami: { name: '大海嘯', ult: true, cost: 0, dur: 64, start(f) { f.invul = 70; Sound.play('wave'); },
    tick(f, t) { if (t === 16) { spawnProj(f, 'wave', { dx: -160, y: 0, vx: 8, dmg: 125, kb: 8, kbY: 7, launch: true, sfx: 'heavy', life: 190, r: 70, dz: 120, tall: true, pierce: true, noUlt: true, unblock: true }); Sound.play('wave'); W.shake = 8; } },
    pose: raisePose }
});
/* buffs to the specials that stay */
SKILLS.fireball.tick = (f, t) => { if (t === 10) { spawnProj(f, 'fire', { dx: 30, y: 42, vx: 8, dmg: 50, kb: 4, kbY: 5, launch: true, life: 110, r: 16, pierce: true }); Sound.play('fire'); } };
SKILLS.shuriken.tick = (f, t) => {
  if (t !== 7) return;
  const lanes = f.cloneT > 0 ? [-24, 0, 24] : [0];
  for (const dz of lanes) [-1.4, 0, 1.4].forEach(vz => { spawnProj(f, 'star', { dx: 26, y: 46, vx: 9.5, vz, dmg: 24, kb: 1.5, stun: 18, fall: 40, life: 70, r: 9 }); W.projs[W.projs.length - 1].z = clamp(f.z + dz, 4, FLOOR_D - 4); });
  Sound.play('star');
};
SKILLS.bolt.cost = 70;
SKILLS.windjump.cost = 90;
SKILLS.pet.cost = 100;
SKILLS.cheer.cost = 120;

/* the heroes' new skill sets */
Object.assign(CHARS.rex, { skills: ['fireball', 'flamekick', 'phoenix'], blurb: '火焰少年。火焰波穿過一排，旋風腳邊轉邊燒，大絕招是燒過全畫面的火鳳凰。' });
Object.assign(CHARS.yuki, { skills: ['iceball', 'iceslide', 'snowstorm'], blurb: '冰之少女。冰球把人凍住、冰滑道把人鏟倒，大絕招暴風雪凍住全場。' });
Object.assign(CHARS.gan, { skills: ['charge', 'boulder', 'quake'], blurb: '大力士。猛牛衝撞、舉起大石頭丟，大絕招大地震把地上的人全部震飛。' });
Object.assign(CHARS.kite, { skills: ['shuriken', 'clone', 'shurikenRain'], blurb: '忍者少年。飛鏢連發、叫出兩個影分身一起打，大絕招下起手裡劍雨。' });
Object.assign(CHARS.zap, { skills: ['bolt', 'chain', 'thunderGod'], blurb: '雷電少年。雷電球麻痺、連鎖閃電一次電四個，大絕招雷神降臨劈全場三次。' });
Object.assign(CHARS.feng, { skills: ['tornado', 'windjump', 'superTornado'], blurb: '風之少年。旋風彈把人捲起來、跳最高再俯衝，大絕招超級龍捲風橫掃畫面。' });
Object.assign(CHARS.mimi, { skills: ['pet', 'cheer', 'parade'], blurb: '召喚少女。叫小狗豆豆幫忙、幫大家補血，大絕招動物大遊行衝過畫面。' });
/* the two magic heroes */
CHARS.moon = { name: '小月', en: 'Luna', blurb: '星星魔法少女。追蹤星星彈、把敵人變成小青蛙，大絕招流星雨。', hp: 440, spd: 1.04, pow: 0.9, stats: [2, 3, 2], magic: true,
  look: mkLook({ style: 'witch', skin: '#f8d6bd', hair: '#ffd56b', acc: '#8a5cf6', shirt: '#8a5cf6', trim: '#ffd23f', pants: '#5b3cc4', shoe: '#ffd23f', sleeve: 'long', wand: 'star', scarf: null }),
  combo: ['jab', 'cross', 'kick'], skills: ['starshot', 'frog', 'meteor'] };
CHARS.bobo = { name: '波波', en: 'Bobo', blurb: '泡泡魔法師。用泡泡把敵人包起來飄走、泡泡盾擋攻擊，大絕招大海嘯。', hp: 470, spd: 1.0, pow: 0.92, stats: [2, 2, 3], magic: true,
  look: mkLook({ style: 'bubblecap', skin: '#f1c29b', hair: '#3b6fd1', acc: '#5fd0ff', shirt: '#3fa9ff', trim: '#ffffff', pants: '#2a4f9a', shoe: '#ffffff', sleeve: 'long', wand: 'bubble' }),
  combo: ['jab', 'cross', 'kick'], skills: ['bubble', 'shield', 'tsunami'] };
/* menu order: three groups of three. How each one is earned is in unlockStage / unlockWins. */
HEROES.length = 0; HEROES.push('rex', 'gan', 'kite', 'yuki', 'zap', 'feng', 'mimi', 'moon', 'bobo');
const HERO_GROUPS = [['拳腳', '靠拳頭和力氣', ['rex', 'gan', 'kite']], ['元素', '冰、雷、風', ['yuki', 'zap', 'feng']], ['魔法', '召喚和魔法', ['mimi', 'moon', 'bobo']]];
Object.assign(CHARS.moon, { unlockStage: 3, unlock: '打通第四關解鎖' });
Object.assign(CHARS.bobo, { unlockWins: 5 });
function unlockText(id) {
  const d = CHARS[id];
  if (d.unlockWins) return `對戰模式贏 ${d.unlockWins} 場解鎖（${Math.min(store.get('battleWins', 0), d.unlockWins)}/${d.unlockWins}）`;
  return d.unlock || '';
}

/* balance (from computer-vs-computer round robins) */
Object.assign(CHARS.feng, { hp: 480, pow: 1.02 });
Object.assign(CHARS.gan, { hp: 570, pow: 1.1 });
CHARS.yuki.hp = 480;
SKILLS.tornado.tick = (f, t) => { if (t === 10) { spawnProj(f, 'tornado', { dx: 30, y: 6, vx: 5, tall: true, dmg: 16, kb: 0, kbY: 0, stun: 14, fall: 0, multi: 8, life: 90, r: 18, lift: true }); Sound.play('wind'); } };
SKILLS.bolt.tick = (f, t) => { if (t === 9) { spawnProj(f, 'bolt', { dx: 30, y: 44, vx: 10, dmg: 40, stun: 44, fall: 0, shock: true, life: 80, r: 12 }); Sound.play('zap'); } };
SKILLS.iceball.tick = (f, t) => { if (t === 11) { spawnProj(f, 'ice', { dx: 30, y: 42, vx: 6.5, dmg: 36, freeze: true, life: 120, r: 12 }); Sound.play('ice'); } };
Object.assign(CHARS.gan, { hp: 540, pow: 1.0 });
Object.assign(CHARS.feng, { pow: 1.1 });
Object.assign(CHARS.yuki, { pow: 1.0 });
Object.assign(CHARS.mimi, { pow: 0.95, hp: 460 });
Object.assign(CHARS.moon, { pow: 0.85 });
Object.assign(CHARS.rex, { pow: 0.95 });
Object.assign(CHARS.feng, { hp: 500 });

/* finer details: iris colour, chest emblem, eyelashes */
[['rex', '#7a3a14', 'flame', '#ffd34d'], ['yuki', '#3fa9ff', 'flake', '#ffffff', 1], ['gan', '#4a3020', 'power', '#ffcc33'], ['kite', '#3f4ea8', 'shuriken', '#c9ced8'],
 ['zap', '#d49a00', 'bolt', '#ffd23f'], ['feng', '#2f8a5a', 'swirl', '#ffffff'], ['mimi', '#c2407a', 'paw', '#ffffff', 1], ['moon', '#8a5cf6', 'star', '#ffd23f', 1], ['bobo', '#2a6fd1', 'drop', '#bff0ff']]
  .forEach(([id, eye, emblem, col, lash]) => Object.assign(CHARS[id].look, { eye, emblem, emblemCol: col, lash: !!lash }));

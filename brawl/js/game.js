'use strict';
/* ----------------------------- roster ----------------------------- */
function mkLook(o) {
  const L = Object.assign({ skin: '#f4c6a0', hair: '#2b2018', acc: '#ff4d3d', shirt: '#ff5a4a', pants: '#2f3a63', shoe: '#2a2633', sleeve: 'short' }, o);
  if (L.animal) { L.fur = L.shirt; L.sleeve = 'long'; }
  L.skinD = shade(L.skin, -0.18); L.shirtD = shade(L.shirt, -0.25); L.pantsD = shade(L.pants, -0.25);
  return L;
}
const CHARS = {
  rex: { name: '阿烈', en: 'Rex', blurb: '火拳少年。出拳快、連段順，火焰波可以遠攻。', hp: 500, spd: 1, pow: 1, stats: [3, 3, 2],
    look: mkLook({ style: 'spiky', hair: '#3b2417', acc: '#ff3b2f', shirt: '#ff5a4a', trim: '#ffd34d', pants: '#2f3a63', shoe: '#f2efe6' }),
    combo: ['jab', 'cross', 'kick'], skills: ['fireball', 'uppercut', 'flurry'] },
  yuki: { name: '小雪', en: 'Yuki', blurb: '冰之少女。冰球會把敵人凍成冰塊，再打一下就碎。', hp: 460, spd: 1.03, pow: 0.92, stats: [2, 3, 2],
    look: mkLook({ style: 'long', skin: '#f8d6bd', hair: '#d6efff', acc: '#3fa9ff', shirt: '#6fbfff', trim: '#ffffff', pants: '#2f6fd1', shoe: '#ffffff', shorts: true, sleeve: 'long' }),
    combo: ['jab', 'cross', 'kick'], skills: ['iceball', 'icespikes', 'blizzard'] },
  gan: { name: '阿岩', en: 'Gan', blurb: '大力士。動作慢但很耐打，衝撞和震地拳打一大片。', hp: 600, spd: 0.86, pow: 1.22, stats: [4, 1, 4],
    look: mkLook({ style: 'flattop', build: 'big', skin: '#d9a27a', hair: '#1f1a17', acc: '#38d39f', shirt: '#3a8f5c', sleeve: 'none', pants: '#5a4632', shoe: '#3a2a20', belt: '#ffcc33' }),
    combo: ['jab', 'cross', 'kick'], skills: ['charge', 'slam', 'iron'] },
  kite: { name: '小飛', en: 'Kite', blurb: '忍者少年。跑得最快，飛鏢、瞬步、疾風斬，打了就跑。', hp: 440, spd: 1.16, pow: 0.9, stats: [2, 4, 1],
    look: mkLook({ style: 'hood', skin: '#f1c29b', hair: '#2a3266', acc: '#ff4d3d', shirt: '#323c78', sleeve: 'long', pants: '#323c78', shoe: '#1c1a2e', belt: '#ff4d3d' }),
    combo: ['jab', 'cross', 'kick'], skills: ['shuriken', 'shadowstep', 'gale'] },
  /* monsters: animal heads on the same skeleton; fur colours fill shirt/pants */
  boar: { name: '野豬仔', hp: 150, spd: 0.9, pow: 0.75, enemy: true,
    look: mkLook({ style: 'boar', animal: true, skin: '#a8714a', hair: '#5a3a22', shirt: '#a8714a', trim: null, pants: '#8c5c3a', shoe: '#4a3020', sleeve: 'none', glove: '#7a5034', angry: true, tail: 'curly', belly: '#d8b08a' }),
    combo: ['jab', 'butt'], skills: ['tackle'] },
  monkey: { name: '彈弓猴', hp: 120, spd: 1.0, pow: 0.75, enemy: true, ranged: true,
    look: mkLook({ style: 'monkey', animal: true, skin: '#f3d2b0', hair: '#8a5a3c', shirt: '#8a5a3c', pants: '#7a4c30', shoe: '#5a3a24', sleeve: 'none', glove: '#f3d2b0', tail: 'long', belly: '#e6c09a', sling: true, build: 'slim' }),
    combo: ['jab', 'cross'], skills: ['sling'] },
  bear: { name: '大笨熊', hp: 360, spd: 0.72, pow: 1.2, size: 1.25, heavy: true, enemy: true,
    look: mkLook({ style: 'bear', animal: true, build: 'big', skin: '#8a5a34', hair: '#6a4426', shirt: '#8a5a34', pants: '#7a4e2c', shoe: '#4a3020', sleeve: 'none', glove: '#6a4426', tail: 'stub', belly: '#d9b48a', angry: true }),
    combo: ['cross', 'upper'], skills: [null, 'stomp'] },
  bat: { name: '小蝙蝠', hp: 90, spd: 1.1, pow: 0.7, enemy: true, fly: true,
    look: mkLook({ style: 'bat', animal: true, skin: '#7d5ab8', hair: '#5a3d8f', shirt: '#7d5ab8', pants: '#7d5ab8' }),
    combo: ['bite'], skills: ['swoop'] },
  dragon: { name: '岩甲龍', hp: 1200, spd: 0.8, pow: 1.15, size: 1.45, heavy: true, enemy: true, boss: true,
    look: mkLook({ style: 'dragon', animal: true, build: 'big', skin: '#62b05c', hair: '#ff8a3d', acc: '#ffd34d', shirt: '#62b05c', pants: '#549c4e', shoe: '#3f7a3a', sleeve: 'none', glove: '#549c4e', tail: 'dragon', belly: '#f4e3a0', angry: true }),
    combo: ['jab', 'cross', 'upper'], skills: ['spit', 'stomp', 'charge'] }
};
const HEROES = ['rex', 'yuki', 'gan', 'kite'];

/* frame data: on/off = active frames, rx = reach in front, hy = height band */
const ATK = {
  jab: { pose: 'jab', dur: 16, on: 4, off: 8, rx: [4, 36], hy: [28, 64], dz: 14, dmg: 16, kb: 1.4, stun: 16, fall: 28 },
  cross: { pose: 'cross', dur: 19, on: 5, off: 9, rx: [4, 38], hy: [28, 64], dz: 14, dmg: 18, kb: 1.8, stun: 18, fall: 30 },
  kick: { pose: 'kick', dur: 26, on: 8, off: 13, rx: [6, 46], hy: [12, 52], dz: 15, dmg: 26, kb: 4.2, kbY: 5, launch: true, stun: 20, sfx: 'heavy' },
  upper: { pose: 'upper', dur: 28, on: 9, off: 14, rx: [4, 40], hy: [20, 80], dz: 15, dmg: 28, kb: 2.5, kbY: 8, launch: true, sfx: 'heavy' },
  swing1: { pose: 'swing1', dur: 20, on: 6, off: 10, rx: [6, 60], hy: [10, 70], dz: 16, dmg: 26, kb: 2.4, stun: 18, fall: 40, weapon: true },
  swing2: { pose: 'swing2', dur: 20, on: 6, off: 10, rx: [6, 60], hy: [20, 80], dz: 16, dmg: 26, kb: 2.4, stun: 18, fall: 40, weapon: true },
  swing3: { pose: 'swing3', dur: 28, on: 9, off: 14, rx: [6, 64], hy: [0, 70], dz: 16, dmg: 36, kb: 4.5, kbY: 5, launch: true, weapon: true, sfx: 'heavy' },
  butt: { pose: 'butt', dur: 24, on: 8, off: 12, rx: [2, 38], hy: [26, 70], dz: 15, dmg: 20, kb: 3, stun: 20, fall: 45 },
  bite: { pose: 'bite', dur: 22, on: 7, off: 11, rx: [-4, 30], hy: [-40, 26], dz: 15, dmg: 12, kb: 1.5, stun: 16, fall: 30 },
  runAtk: { dur: 28, on: 3, off: 18, rx: [-4, 38], hy: [10, 58], dz: 15, dmg: 30, kb: 5, kbY: 5, launch: true, sfx: 'heavy' },
  jumpAtk: { on: 0, off: 999, rx: [-4, 36], hy: [-14, 44], dz: 15, dmg: 24, kb: 3.5, kbY: 4, fall: 70 }
};

/* ------------------------------ skills ------------------------------ */
function castPose(P, t, a, b) { const e = ext(t, 0, a, b, b + 10); P.ar = [lerp(0.6, 1.6, e), lerp(2, 0.05, e)]; P.al = [lerp(0.35, 1.5, e), lerp(1.9, 0.15, e)]; P.lean = 0.08 + e * 0.15; P.lr = [0.55, 0.5]; P.ll = [-0.4, 0.1]; }
const SKILLS = {
  fireball: { name: '火焰波', cost: 75, dur: 28, tick(f, t) { if (t === 10) { spawnProj(f, 'fire', { dx: 30, y: 42, vx: 7.5, dmg: 45, kb: 4, kbY: 5, launch: true, life: 110, r: 14 }); Sound.play('fire'); } }, pose(P, t) { castPose(P, t, 9, 16); } },
  uppercut: { name: '升龍拳', cost: 100, dur: 70,
    start(f) { f.invul = 12; },
    tick(f, t) {
      if (t === 5) { f.vy = 9; f.vx = f.face * 2.6; Sound.play('fire', 0.7); }
      if (t >= 5 && t <= 26) { if (t % 6 === 5) f.hitSet.clear(); f.meleeHit({ rx: [-2, 32], hy: [10, 100], dz: 17, dmg: 22, kb: 2, kbY: 8, launch: true, sfx: 'heavy' }); if (t % 2) addPart('fire', f.x + f.face * 14, f.y + 70, f.z, { vx: rnd(-1, 1), vy: rnd(1, 2) }); }
      if (t > 8 && f.y <= 0) return 'end';
    },
    pose(P, t, f) { if (t < 5) { P.by = 6; P.ar = [0.4, 2.2]; P.lean = 0.3; } else { P.ar = [3.0, 0.1]; P.al = [0.6, 1.6]; P.ll = [-0.2, 1.4]; P.lr = [0.9, 1.8]; P.lean = -0.1; } } },
  flurry: { name: '百裂拳', cost: 150, dur: 52,
    tick(f, t) {
      if (t < 42) f.vx = f.face * 2.2; else f.vx *= 0.8;
      if (t >= 6 && t <= 38 && t % 4 === 2) { f.hitSet.clear(); f.meleeHit({ rx: [2, 42], hy: [20, 66], dz: 17, dmg: 8, kb: 0.4, stun: 10, fall: 0, stop: 2 }); Sound.play('whiff', 0.6); }
      if (t === 42) { f.hitSet.clear(); f.meleeHit({ rx: [2, 46], hy: [20, 70], dz: 18, dmg: 30, kb: 5.5, kbY: 5, launch: true, sfx: 'heavy' }); }
    },
    pose(P, t) { const a = (t >> 2) & 1; P.lean = 0.3; P.ll = [-0.5, 0.2]; P.lr = [0.6, 0.6]; if (t >= 40) { P.ar = [1.6, 0]; P.al = [0.2, 1.8]; P.lean = 0.45; } else if (a) { P.ar = [1.6, 0.05]; P.al = [0.6, 2]; } else { P.al = [1.6, 0.05]; P.ar = [0.6, 2]; } } },
  iceball: { name: '冰球', cost: 75, dur: 30, tick(f, t) { if (t === 11) { spawnProj(f, 'ice', { dx: 30, y: 42, vx: 6.2, dmg: 32, freeze: true, life: 120, r: 12 }); Sound.play('ice'); } }, pose(P, t) { castPose(P, t, 10, 17); } },
  icespikes: { name: '冰柱陣', cost: 125, dur: 36, tick(f, t) { if (t === 10) { spawnProj(f, 'spikes', { dx: 24, y: 0, vx: 7, dmg: 38, kb: 2, kbY: 8, launch: true, life: 40, r: 18, ground: true }); Sound.play('ice'); } },
    pose(P, t) { const e = ext(t, 0, 8, 20, 32); P.ar = [lerp(0.6, 0.9, e), 0.1]; P.al = [lerp(0.35, 0.7, e), 0.1]; P.by = 7 * e; P.lean = 0.4 * e; P.ll = [-0.5, 0.9]; P.lr = [0.7, 1.3]; } },
  blizzard: { name: '冰霜旋風', cost: 175, dur: 74, start(f) { f.superT = 74; Sound.play('ice'); },
    tick(f, t) {
      if (t % 6 === 0) f.face = -f.face;
      for (let i = 0; i < 2; i++) { const a = rnd(TAU); addPart('snow', f.x + Math.cos(a) * rnd(20, 80), rnd(10, 80), f.z + Math.sin(a) * 30, { vx: -Math.sin(a) * 2, vy: rnd(-0.5, 0.5) }); }
      if (t >= 8 && t <= 60 && t % 8 === 0) { f.areaHit({ rx: 82, dz: 34, dmg: 9, kb: -1.2, stun: 14, fall: 0, stop: 2, pull: true }); Sound.play('ice', 0.4); }
      if (t === 66) f.areaHit({ rx: 86, dz: 36, dmg: 20, freeze: true });
    },
    pose(P, t) { P.ar = [1.65, 0.1]; P.al = [1.45, 0.1]; P.lean = 0; P.by = -2; P.face = 'happy'; } },
  charge: { name: '猛牛衝', cost: 75, dur: 40, start(f) { f.superT = 34; f.hitSet.clear(); },
    tick(f, t) { if (t >= 6 && t <= 32) { f.vx = f.face * 8; f.meleeHit({ rx: [-4, 40], hy: [0, 70], dz: 18, dmg: 40, kb: 6, kbY: 5, launch: true, sfx: 'heavy' }); if (t % 3 === 0) addPart('dust', f.x - f.face * 10, 2, f.z, {}); } else f.vx *= 0.8; },
    pose(P, t, f) { const p = f.clock * 0.4, sw = Math.sin(p); P.lean = 0.65; P.ar = [1.1, 0.6]; P.al = [0.7, 1.4]; P.ll = [-sw * 0.9, 0.3 + Math.max(0, -Math.cos(p)) * 1.2]; P.lr = [sw * 0.9, 0.3 + Math.max(0, Math.cos(p)) * 1.2]; P.ht = -0.3; } },
  slam: { name: '震地拳', cost: 100, dur: 90, start(f) { f.slammed = false; f.superT = 20; },
    tick(f, t) {
      if (t === 4) { f.vy = 9.5; f.vx = f.face * 1.6; Sound.play('jump'); }
      if (t > 6 && f.y <= 0 && !f.slammed) {
        f.slammed = true; f.slamAt = t; f.vx = 0; Sound.play('quake'); W.shake = 12;
        f.areaHit({ rx: 125, dz: 48, dmg: 42, kb: 5, kbY: 7, launch: true, groundOnly: true, sfx: 'heavy' });
        addPart('ring', f.x, 0, f.z, { r: 10, grow: 7, life: 22 });
        for (let i = 0; i < 14; i++) addPart('rock', f.x + rnd(-60, 60), 2, f.z + rnd(-20, 20), { vx: rnd(-3, 3), vy: rnd(3, 7) });
      }
      if (f.slammed && t > f.slamAt + 16) return 'end';
    },
    pose(P, t, f) { if (!f.slammed) { if (t < 4) { P.by = 6; } P.ar = [3.0, 0.3]; P.al = [2.8, 0.3]; P.ll = [-0.3, 1.0]; P.lr = [0.7, 1.3]; } else { P.ar = [1.0, 0.1]; P.al = [0.8, 0.1]; P.by = 10; P.lean = 0.6; P.ll = [-0.6, 1.0]; P.lr = [0.9, 1.5]; } } },
  iron: { name: '鋼鐵之軀', cost: 150, dur: 32, tick(f, t) { if (t === 10) { f.armorT = 480; Sound.play('power'); for (let i = 0; i < 16; i++) addPart('spark', f.x, 40, f.z, { vx: rnd(-4, 4), vy: rnd(-4, 4), col: '#ffd34d' }); } },
    pose(P, t) { const e = ext(t, 0, 8, 24, 32); P.ar = [lerp(0.6, 2.3, e), lerp(2, 2.6, e)]; P.al = [lerp(0.35, 2.1, e), lerp(1.9, 2.6, e)]; P.by = 3 * e; P.face = 'happy'; } },
  shuriken: { name: '三連鏢', cost: 50, dur: 22, tick(f, t) { if (t === 7) { [-1.4, 0, 1.4].forEach(vz => spawnProj(f, 'star', { dx: 26, y: 46, vx: 9, vz, dmg: 18, kb: 1.5, stun: 16, fall: 40, life: 70, r: 8 })); Sound.play('star'); } },
    pose(P, t) { const e = clamp((t - 1) / 6, 0, 1); P.ar = [lerp(-0.6, 1.7, e), lerp(1.8, 0.1, e)]; P.lean = lerp(-0.1, 0.25, e); P.lr = [0.6, 0.5]; } },
  shadowstep: { name: '影步斬', cost: 100, dur: 34,
    start(f) { f.invul = 20; f.stepTgt = nearestFoe(f, 420); smoke(f); },
    tick(f, t) {
      if (t === 1) f.invisible = true;
      if (t === 9) {
        const g = f.stepTgt;
        if (g && !g.dead) { f.x = clamp(g.x - g.face * 36, W.minX + 10, W.maxX - 10); f.z = g.z; f.face = sgn(g.x - f.x); }
        else f.x = clamp(f.x + f.face * 130, W.minX + 10, W.maxX - 10);
        f.invisible = false; smoke(f); f.hitSet.clear(); Sound.play('slash');
      }
      if (t >= 11 && t <= 17) { f.meleeHit({ rx: [-6, 48], hy: [0, 80], dz: 18, dmg: 48, kb: 4, kbY: 6, launch: true, sfx: 'heavy' }); if (t === 11) addPart('slash', f.x + f.face * 24, 40, f.z, { face: f.face }); }
    },
    pose(P, t) { if (t < 11) { P.by = 5; P.lean = 0.4; } else { P.ar = [lerp(2.6, 1.0, clamp((t - 11) / 4, 0, 1)), 0.1]; P.lean = 0.45; P.ll = [-0.6, 0.2]; P.lr = [0.9, 0.9]; } } },
  gale: { name: '疾風斬', cost: 125, dur: 36, start(f) { f.invul = 28; f.hitSet.clear(); Sound.play('slash'); },
    tick(f, t) {
      if (t >= 4 && t <= 22) { f.vx = f.face * 11; f.meleeHit({ rx: [-26, 32], hy: [0, 80], dz: 20, dmg: 40, kb: 3, kbY: 6, launch: true, sfx: 'heavy' }); if (t % 2 === 0) addPart('ghost', f.x, f.y, f.z, { f, life: 12 }); }
      else f.vx *= 0.7;
    },
    pose(P, t) { P.lean = 0.55; P.ar = [1.75, 0]; P.al = [-0.6, 0.6]; P.ll = [-0.9, 0.3]; P.lr = [0.9, 0.7]; P.by = 4; } },
  tackle: { name: '衝撞', cost: 120, dur: 36, start(f) { f.hitSet.clear(); },
    tick(f, t) { if (t >= 8 && t <= 28) { f.vx = f.face * 6.5; f.meleeHit({ rx: [-4, 34], hy: [10, 64], dz: 16, dmg: 26, kb: 5, kbY: 4, launch: true, sfx: 'heavy' }); if (t % 3 === 0) addPart('dust', f.x - f.face * 10, 2, f.z, {}); } else f.vx *= 0.8; },
    pose(P, t, f) { const p = f.clock * 0.45, sw = Math.sin(p); P.lean = t < 8 ? -0.1 : 0.75; P.ht = -0.5; P.ar = [0.6, 1.2]; P.al = [0.3, 1.3]; P.ll = [-sw * 0.9, 0.3 + Math.max(0, -Math.cos(p)) * 1.2]; P.lr = [sw * 0.9, 0.3 + Math.max(0, Math.cos(p)) * 1.2]; } },
  sling: { name: '彈弓', cost: 0, dur: 36, tick(f, t) { if (t === 18) { spawnProj(f, 'fruit', { dx: 26, y: 46, vx: 8, dmg: 20, kb: 2, stun: 20, fall: 55, life: 100, r: 9 }); Sound.play('throw'); } },
    pose(P, t) { const e = clamp(t / 14, 0, 1); P.ar = [1.57, 0]; P.al = [1.45, lerp(0.2, 2.7, e)]; P.lean = -0.05; P.lr = [0.55, 0.3]; P.ll = [-0.45, 0.1]; } },
  stomp: { name: '跺地', cost: 100, dur: 60, start(f) { f.stomped = false; f.superT = 30; },
    tick(f, t) {
      if (t === 18 && !f.stomped) {
        f.stomped = true; Sound.play('quake'); W.shake = 10;
        f.areaHit({ rx: 110 * (f.def.size || 1), dz: 44, dmg: 30, kb: 4, kbY: 6, launch: true, groundOnly: true, sfx: 'heavy' });
        addPart('ring', f.x + f.face * 10, 0, f.z, { r: 10, grow: 6, life: 22 });
        for (let i = 0; i < 10; i++) addPart('rock', f.x + rnd(-50, 50), 2, f.z + rnd(-20, 20), { vx: rnd(-3, 3), vy: rnd(3, 6) });
      }
    },
    pose(P, t) { if (t < 18) { const e = clamp(t / 14, 0, 1); P.lr = [lerp(0.3, 1.5, e), lerp(0.3, 1.4, e)]; P.ar = [lerp(0.6, 2.8, e), 0.4]; P.al = [lerp(0.4, 2.6, e), 0.4]; P.lean = -0.2 * e; } else { P.lr = [0.6, 0.2]; P.by = 4; P.ar = [1.2, 0.2]; P.al = [1.0, 0.3]; P.lean = 0.3; } } },
  swoop: { name: '俯衝', cost: 90, dur: 44, start(f) { f.hitSet.clear(); },
    tick(f, t) { if (t >= 8 && t <= 34) { f.vx = f.face * 6; f.swoopY = 34 * Math.sin((t - 8) / 26 * Math.PI); f.meleeHit({ rx: [-6, 26], hy: [-30, 30], dz: 16, dmg: 18, kb: 3, kbY: 4, launch: true }); } else f.vx *= 0.8; } },
  spit: { name: '吐石彈', cost: 70, dur: 40, tick(f, t) { if (t === 20) { spawnProj(f, 'rock', { dx: 34, y: 92, vx: 7, vy: 3.5, grav: true, dmg: 38, kb: 4, kbY: 5, launch: true, life: 160, r: 16 }); Sound.play('throw'); Sound.play('fall', 0.5); } },
    pose(P, t) { const e = clamp((t - 8) / 10, 0, 1); P.lean = lerp(-0.35, 0.3, e); P.ht = lerp(-0.4, 0.25, e); P.mouth = t > 14 && t < 30; P.ar = [0.8, 1.4]; P.al = [0.6, 1.4]; } },
  arrow: { name: '射箭', cost: 0, dur: 38, tick(f, t) { if (t === 20) { spawnProj(f, 'arrow', { dx: 28, y: 46, vx: 8.5, dmg: 24, kb: 2, stun: 20, fall: 60, life: 100, r: 10 }); Sound.play('arrow'); } },
    pose(P, t) { const e = clamp(t / 16, 0, 1); P.ar = [1.57, 0]; P.al = [1.45, lerp(0.2, 2.7, e)]; P.lean = -0.05; P.lr = [0.55, 0.3]; P.ll = [-0.45, 0.1]; } },
  rock: { name: '丟大石', cost: 60, dur: 40, tick(f, t) { if (t === 18) { spawnProj(f, 'rock', { dx: 20, y: 80, vx: 6.5, vy: 5, grav: true, dmg: 40, kb: 4, kbY: 5, launch: true, life: 160, r: 16 }); Sound.play('throw'); } },
    pose(P, t) { const e = clamp((t - 10) / 8, 0, 1); P.ar = [lerp(-2.7, 1.7, e), 0.3]; P.al = [lerp(-2.5, 1.2, e), 0.4]; P.lean = lerp(-0.3, 0.35, e); } }
};

/* ------------------------------ world ------------------------------ */
let W = null;                    // current match
const DIFF = [
  { name: '簡單', react: 30, maxEng: 1, block: 0.04, combo: 0.12, skill: 0.25, dodge: 0.1, atkCd: 74, eDmg: 0.45, eHp: 0.8, gap: 75, windup: 24, comboMax: 0 },
  { name: '普通', react: 18, maxEng: 2, block: 0.18, combo: 0.35, skill: 0.45, dodge: 0.3, atkCd: 56, eDmg: 0.5, eHp: 1, gap: 38, windup: 12, comboMax: 1 },
  { name: '困難', react: 10, maxEng: 3, block: 0.35, combo: 0.6, skill: 0.7, dodge: 0.55, atkCd: 34, eDmg: 0.85, eHp: 1.2, gap: 22, windup: 7, comboMax: 2 }
];

function addPart(kind, x, y, z, o = {}) {
  if (!W || W.parts.length > 420) return;
  W.parts.push(Object.assign({ kind, x, y, z, vx: 0, vy: 0, life: o.life || ({ spark: 12, dust: 22, fire: 22, snow: 30, ice: 24, smoke: 26, text: 40, ring: 20, rock: 50, slash: 12, ghost: 12, spike: 26, star: 22, bonk: 18 })[kind] || 20, t: 0 }, o));
}
function smoke(f) { for (let i = 0; i < 12; i++) addPart('smoke', f.x + rnd(-14, 14), rnd(5, 60), f.z, { vx: rnd(-1.5, 1.5), vy: rnd(0, 1.5) }); }
function nearestFoe(f, maxD = 1e9) {
  let best = null, bd = maxD;
  for (const g of W.fighters) if (g.team !== f.team && !g.dead) { const d = Math.abs(g.x - f.x) + Math.abs(g.z - f.z) * 1.5; if (d < bd) { bd = d; best = g; } }
  return best;
}
function spawnProj(f, kind, o) {
  W.projs.push(Object.assign({ kind, owner: f, team: f.team, x: f.x + f.face * (o.dx || 20), y: o.y || 40, z: f.z, vx: f.face * (o.vx || 6), vy: o.vy || 0, vz: o.vz || 0, t: 0, hit: new Set(), face: f.face }, o, { vx: f.face * (o.vx || 6) }));
}

class Fighter {
  constructor(id, team, x, z, ctl) {
    const d = CHARS[id]; this.id = id; this.def = d; this.look = d.look; this.team = team; this.ctl = ctl; if (ctl) ctl.f = this;
    const hpMul = d.enemy && W && W.mode === 'stage' ? W.D.eHp * (W.hpScale || 1) : 1;
    this.maxHp = this.hp = this.cap = Math.round(d.hp * hpMul); this.regenT = 0; this.hpLag = this.hp; this.maxMp = 500; this.mp = d.enemy ? 500 : 200;
    this.pow = d.pow; this.spd = d.spd; this.x = x; this.y = 0; this.z = z; this.vx = this.vy = this.vz = 0; this.face = 1;
    this.state = 'idle'; this.st = 0; this.clock = (Math.random() * 100) | 0; this.freeze = 0; this.invul = 0; this.flash = 0; this.armorT = 0; this.superT = 0;
    this.fallMeter = 0; this.guard = 100; this.combo = 0; this.comboT = 0; this.queued = false; this.hitSet = new Set(); this.hold = null; this.dead = false; this.dying = false;
    this.stun = 0; this.bounced = false; this.atk = null; this.skill = null; this.didAirAtk = false; this.shakeT = 0; this.dmgDone = 0; this.kos = 0;
  }
  get inp() { return this.ctl ? this.ctl.inp : NULL_INPUT; }
  set(s) { this.state = s; this.st = 0; }
  get grounded() { return this.y <= 0 && this.vy <= 0; }
  canAct() { return this.state === 'idle' || this.state === 'walk' || this.state === 'run' || this.state === 'brake' || this.state === 'land'; }

  startAttack(name) { this.atk = ATK[name]; this.atkName = name; this.set('atk'); this.hitSet.clear(); this.queued = false; Sound.play('whiff', 0.7); }
  comboList() { return this.hold && this.hold.kind === 'stick' ? ['swing1', 'swing2', 'swing3'] : this.def.combo; }
  doAttack() {
    const it = this.hold;
    if (it && it.kind === 'stone') return this.startThrow();
    if (!it) { const near = this.nearItem(); if (near) return this.pickUp(near); }
    const list = this.comboList();
    if (this.comboT <= 0) this.combo = 0;
    this.startAttack(list[this.combo % list.length]); this.combo++;
  }
  trySkill(n) {
    const id = this.def.skills[n - 1]; if (!id) return false; const S = SKILLS[id];
    if (this.mp < S.cost) { if (this.ctl && this.ctl.human) this.flashMp = 20; return false; }
    this.mp -= S.cost; this.skill = id; this.set('skill'); this.hitSet.clear(); this.vx = 0;
    if (this.inp.mx) this.face = sgn(this.inp.mx);
    if (S.start) S.start(this);
    return true;
  }
  nearItem() {
    for (const it of W.items) if (!it.holder && !it.fly && it.y <= 1 && Math.abs(it.x - this.x) < 26 && Math.abs(it.z - this.z) < 14) return it;
    return null;
  }
  pickUp(it) {
    this.set('pickup'); this.vx = this.vz = 0; Sound.play('pick');
    if (it.kind === 'milk' || it.kind === 'juice') { W.items.splice(W.items.indexOf(it), 1); this.drinkKind = it.kind; this.pendingDrink = true; }
    else { it.holder = this; this.hold = it; }
  }
  dropItem(throwIt) {
    const it = this.hold; if (!it) return; this.hold = null; it.holder = null;
    it.x = this.x + this.face * 10; it.z = this.z; it.y = 20; it.vx = this.face * rnd(-1, 1.5); it.vy = 3;
  }
  startThrow() { this.set('throw'); this.vx *= 0.3; }

  /* melee hitbox against every foe; each victim once per hitSet */
  meleeHit(A) {
    let any = false;
    const s = this.def.size || 1;
    const x0 = this.x + this.face * A.rx[0] * s, x1 = this.x + this.face * A.rx[1] * s, lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    const hy0 = this.y + A.hy[0] * s, hy1 = this.y + A.hy[1] * s;
    for (const v of W.fighters) {
      if (v === this || v.team === this.team || v.dead || this.hitSet.has(v)) continue;
      const vs = v.def.size || 1;
      if (v.x + 12 * vs < lo || v.x - 12 * vs > hi) continue;
      if (Math.abs(v.z - this.z) > A.dz) continue;
      const lying = v.state === 'lying';
      if (hy1 < v.y - (v.def.fly ? 8 : 0) || hy0 > v.y + (lying ? 20 : v.def.fly ? 34 : 72 * vs)) continue;
      if (applyHit(this, v, A, this.face)) { this.hitSet.add(v); any = true; }
    }
    return any;
  }
  areaHit(A) {
    for (const v of W.fighters) {
      if (v === this || v.team === this.team || v.dead) continue;
      if (Math.abs(v.x - this.x) > A.rx || Math.abs(v.z - this.z) > A.dz) continue;
      if (A.groundOnly && v.y > 30) continue;
      const dir = sgn(v.x - this.x);
      const B = Object.assign({}, A); if (A.pull) { B.kb = 0; v.vx += -dir * 1.2; }
      applyHit(this, v, B, dir, true);
    }
  }

  update() {
    this.clock++;
    if (this.freeze > 0) { this.freeze--; return; }
    const I = this.inp;
    if (this.invul > 0) this.invul--; if (this.flash > 0) this.flash--; if (this.armorT > 0) this.armorT--; if (this.superT > 0) this.superT--; if (this.shakeT > 0) this.shakeT--;
    if (this.comboT > 0) this.comboT--;
    if (this.state !== 'hurt' && this.state !== 'fall') this.fallMeter = Math.max(0, this.fallMeter - 0.8);
    if (this.state !== 'defend') this.guard = Math.min(100, this.guard + 0.25);
    if (!this.dead) this.mp = Math.min(this.maxMp, this.mp + (this.def.enemy ? 0.5 : 0.14 + (1 - this.hp / this.maxHp) * 0.12));
    if (!this.def.enemy && !this.dead && !this.dying) { if (this.regenT > 0) this.regenT--; else if (this.hp < this.cap) this.hp = Math.min(this.cap, this.hp + 0.12); }
    this.hpLag = this.hpLag > this.hp ? Math.max(this.hp, this.hpLag - 2.5) : this.hp;
    this.st++;
    const spd = this.spd;
    let air = this.y > 0 || this.vy > 0;

    switch (this.state) {
      case 'idle': case 'walk': case 'brake': case 'land': {
        if (this.state === 'brake') { this.vx *= 0.82; if (this.st < 9) break; }
        if (this.state === 'land' && this.st < 5) { this.vx *= 0.6; this.vz *= 0.6; break; }
        if (this.pendingWin) { this.set('win'); break; }
        if (I.skill && this.trySkill(I.skill)) break;
        if (I.atk) { if (I.mx) this.face = sgn(I.mx); this.doAttack(); break; }
        if (I.jmp) { this.jump(I.mx * 2.6 * spd, I.mz * 1.7); break; }
        if (I.def) { this.set('defend'); this.vx = this.vz = 0; if (I.mx) this.face = sgn(I.mx); break; }
        if (I.run && I.mx) { this.face = sgn(I.mx); this.set('run'); break; }
        this.vx = I.mx * 2.4 * spd; this.vz = I.mz * 1.6 * spd;
        if (I.mx) this.face = sgn(I.mx);
        const moving = Math.abs(I.mx) > 0.05 || Math.abs(I.mz) > 0.05;
        if (moving && this.state !== 'walk') this.set('walk'); else if (!moving && this.state !== 'idle') this.set('idle');
        break;
      }
      case 'run': {
        this.vx = this.face * 5.2 * spd; this.vz = I.mz * 1.3;
        if (this.st % 9 === 0) addPart('dust', this.x - this.face * 8, 1, this.z, { vx: -this.face });
        if (I.skill && this.trySkill(I.skill)) break;
        if (I.atk) {
          if (this.hold && this.hold.kind !== 'stone') { this.startThrow(); break; }
          if (this.hold) { this.startThrow(); break; }
          this.set('runAtk'); this.atk = ATK.runAtk; this.hitSet.clear(); this.vy = 2.5; Sound.play('whiff'); break;
        }
        if (I.jmp) { this.jump(this.face * 6.5 * spd, I.mz * 1.5); this.vy = 7.8; break; }
        if (I.defP || I.def) { this.set('roll'); this.invul = 20; break; }
        if (!I.run || sgn(I.mx) !== this.face || !I.mx) { this.set('brake'); }
        break;
      }
      case 'jump': {
        if (I.atk && !this.didAirAtk) {
          if (this.hold) { this.startThrow(); break; }
          this.didAirAtk = true; this.set('jumpAtk'); this.atk = ATK.jumpAtk; this.hitSet.clear(); Sound.play('whiff');
        }
        if (I.skill && this.def.skills[I.skill - 1] === 'shuriken' && this.trySkill(I.skill)) break;
        if (I.mx) this.vx = clamp(this.vx + I.mx * 0.12, -6.5 * spd, 6.5 * spd);
        break;
      }
      case 'jumpAtk': { this.meleeHit(this.atk); break; }
      case 'atk': {
        const A = this.atk;
        if (this.st === 1 && I.mx) this.face = sgn(I.mx);
        this.vx *= 0.75; this.vz *= 0.6;
        if (this.st === A.on) this.vx += this.face * (A.weapon ? 1.2 : 1.6);
        if (this.st >= A.on && this.st <= A.off) {
          if (this.meleeHit(A) && this.hold && this.hold.kind === 'stick' && A.weapon) { if (--this.hold.dur <= 0) { breakItem(this.hold); this.hold = null; } }
        }
        if (I.atk && this.st > 3) this.queued = true;
        if (this.queued && this.st >= A.off + 2) { this.comboT = 30; this.doAttack(); break; }
        if (this.st >= A.dur) { this.comboT = 24; this.set('idle'); }
        break;
      }
      case 'runAtk': {
        if (this.st < 18) this.meleeHit(this.atk); this.vx *= 0.96;
        if (this.st > 6 && !air) { this.vx *= 0.8; if (this.st >= this.atk.dur) this.set('idle'); }
        break;
      }
      case 'defend': {
        this.vx *= 0.7; this.vz *= 0.7;
        if (I.skill && this.trySkill(I.skill)) break;
        if (I.atk) { this.doAttack(); break; }
        if (I.jmp) { this.jump(I.mx * 2.6 * spd, I.mz * 1.7); break; }
        if (!I.def && this.st > 8) this.set('idle');
        break;
      }
      case 'roll': { this.vx = this.face * 5.5 * spd * (1 - this.st / 30); if (this.st >= 22) { this.set('idle'); this.invul = 0; } break; }
      case 'hurt': { this.vx *= 0.86; this.vz *= 0.8; if (this.st >= this.stun) this.set('idle'); break; }
      case 'dizzy': { this.vx *= 0.8; if (this.st >= 80) this.set('idle'); break; }
      case 'frozen': { this.vx *= 0.9; if (this.st % 7 === 0) addPart('ice', this.x + rnd(-14, 14), rnd(10, 70), this.z, { vy: rnd(0.5, 1.2) }); if (this.st >= 110) { this.set('idle'); this.invul = 20; Sound.play('shatter', 0.5); for (let i = 0; i < 8; i++) addPart('ice', this.x, rnd(10, 70), this.z, { vx: rnd(-3, 3), vy: rnd(1, 4) }); } break; }
      case 'fall': {
        if (!air && this.st > 2) {
          if (!this.bounced && Math.abs(this.vyLast) > 4) { this.bounced = true; this.vy = 3; this.vx *= 0.5; Sound.play('fall'); W.shake = Math.max(W.shake, 4); addPart('dust', this.x, 0, this.z, { vx: 2 }); addPart('dust', this.x, 0, this.z, { vx: -2 }); }
          else { this.set(this.dying ? 'dead' : 'lying'); this.vx = 0; this.vz = 0; if (this.dying) this.die(); }
        }
        break;
      }
      case 'lying': { this.vx *= 0.7; if (this.st >= 34) { this.set('getup'); this.invul = 999; } break; }
      case 'getup': { if (this.st >= 20) { this.set('idle'); this.invul = this.def.enemy ? 30 : 60; this.fallMeter = 0; } break; }
      case 'dead': { this.vx *= 0.8; if (this.def.enemy && this.st === 22) { smoke(this); for (let i = 0; i < 6; i++) addPart('star', this.x, 20, this.z, { vx: rnd(-3, 3), vy: rnd(2, 5) }); this.invisible = true; Sound.play('poof'); } break; }
      case 'pickup': {
        if (this.st >= 10) { if (this.pendingDrink) { this.pendingDrink = false; this.set('drink'); Sound.play('drink'); } else this.set('idle'); }
        break;
      }
      case 'drink': {
        if (this.drinkKind === 'milk') { this.hp = Math.min(this.maxHp, this.hp + 2.6); this.cap = Math.max(this.cap, this.hp); this.mp = Math.min(this.maxMp, this.mp + 0.8); }
        else { this.mp = Math.min(this.maxMp, this.mp + 4.5); this.hp = Math.min(this.maxHp, this.hp + 0.6); }
        if (this.st % 8 === 0) addPart('text', this.x, 86, this.z, { txt: this.drinkKind === 'milk' ? '+' : '+', col: this.drinkKind === 'milk' ? '#ff6f9a' : '#5ab8ff', life: 26 });
        if (this.st >= 46 || I.atk || I.jmp) this.set('idle');
        break;
      }
      case 'throw': {
        this.vx *= 0.85;
        if (this.st === 7 && this.hold) {
          const it = this.hold; this.hold = null; it.holder = null; it.fly = true; it.owner = this; it.team = this.team;
          it.x = this.x + this.face * 20; it.y = this.y + 60; it.z = this.z; it.vx = this.face * (it.kind === 'stone' ? 8.5 : 10); it.vy = it.kind === 'stone' ? 3.5 : 2; it.vz = this.inp.mz * 0.8; it.hit = new Set(); it.spin = 0;
          Sound.play('throw');
        }
        if (this.st >= 18) this.set(air ? 'jump' : 'idle');
        break;
      }
      case 'skill': {
        const S = SKILLS[this.skill]; const r = S.tick ? S.tick(this, this.st) : null;
        if (r === 'end' || this.st >= S.dur) { this.invisible = false; this.set(this.y > 0 ? 'jump' : 'idle'); this.didAirAtk = true; }
        break;
      }
      case 'win': this.vx = 0; this.vz = 0; break;
    }

    // physics
    const hover = this.def.fly && FLY_STATES.has(this.state);
    if (hover) { const ty = 34 + Math.sin(this.clock * 0.07) * 5 - (this.state === 'skill' ? (this.swoopY || 0) : 0); this.y += (ty - this.y) * 0.15; this.vy = 0; }
    const wasAir = !hover && (this.y > 0 || this.vy > 0);
    if (wasAir) { this.vyLast = this.vy; this.vy -= GRAV; this.y += this.vy; if (this.y <= 0) { this.y = 0; this.vyLast = this.vy; this.vy = 0; this.onLand(); } }
    else if (!this.canAct() && this.state !== 'run' && this.state !== 'skill' && this.state !== 'roll' && this.state !== 'atk' && this.state !== 'runAtk') { this.vx *= 0.88; }
    this.x += this.vx; this.z += this.vz;
    if (!this.entering) this.x = clamp(this.x, W.minX + 14, W.maxX - 14);
    else if (this.x > W.minX + 30 && this.x < W.maxX - 30) this.entering = false;
    this.z = clamp(this.z, 6, FLOOR_D - 6);
  }
  jump(vx, vz) { if (this.def.fly) { this.set('idle'); return; } this.set('jump'); this.vy = 8.6; this.vx = vx; this.vz = vz; this.didAirAtk = false; Sound.play('jump'); }
  onLand() {
    if (this.state === 'jump' || this.state === 'jumpAtk' || this.state === 'runAtk' && this.st > 6) {
      if (this.state !== 'runAtk') { this.set('land'); Sound.play('land', 0.6); addPart('dust', this.x, 0, this.z, {}); }
    }
    if (this.state === 'throw') this.set('idle');
  }
  die() {
    this.dead = true; this.dropItem(); this.deaths = (this.deaths || 0) + 1;
    if (this.lives > 1) { this.lives--; this.respawnT = 130; } else this.lives = 0;
    if (this.lastHitBy) { this.lastHitBy.kos++; if (this.lastHitBy.ctl && this.lastHitBy.ctl.human) W.kos++; }
    Sound.play('ko'); if (this.def.boss) Sound.play('gong');
  }
}
const NULL_INPUT = new Input();
const FLY_STATES = new Set(['idle', 'walk', 'run', 'brake', 'land', 'atk', 'skill', 'hurt', 'defend', 'dizzy', 'pickup', 'throw']);

/* the heart of combat */
function applyHit(att, v, A, dir, area) {
  if (v.dead || v.invul > 0 || v.state === 'getup' || v.invisible) return false;
  if (att && att.def.enemy && v.ctl && v.ctl.human && v.state === 'fall') return false; // monsters never juggle you
  if (v.state === 'lying' && !A.launch) return false;
  if (v.state === 'lying') return false;
  let dmg = A.dmg * (att ? att.pow : 1);
  if (att && att.def.enemy && W.mode === 'stage') dmg *= W.D.eDmg;
  const human = att && att.ctl && att.ctl.human;
  if (att) { att.mp = Math.min(att.maxMp, att.mp + 3 + dmg * 0.08); }
  // block: only from the front and only on the ground
  if (v.state === 'defend' && v.face === -dir && !A.unblock && !A.freeze) {
    v.hp -= dmg * 0.08; v.guard -= dmg * 1.5; v.vx = dir * 2.6; v.freeze = 3; if (att) att.freeze = 3;
    Sound.play('block'); addPart('spark', v.x - dir * 10, v.y + 44, v.z, { col: '#8fd0ff', n: 1 });
    if (v.guard <= 0) { v.guard = 30; v.set('dizzy'); Sound.play('hit'); }
    if (v.hp <= 0) { v.hp = 1; }
    return true;
  }
  if (v.armorT > 0) dmg *= 0.5;
  v.hp -= dmg; if (!v.def.enemy) { v.cap = Math.max(v.hp, v.cap - dmg / 3); v.regenT = 100; } v.flash = 5; v.shakeT = 8; v.lastHitBy = att;
  if (att) { att.dmgDone += dmg; if (human) W.score += Math.round(dmg); }
  const stop = A.stop || (A.launch ? 6 : 4); v.freeze = stop; if (att && !area) att.freeze = stop;
  Sound.play(A.sfx || 'hit', 0.9);
  addPart('spark', v.x - dir * 6, v.y + clamp((A.hy ? (A.hy[0] + A.hy[1]) / 2 : 40), 20, 60), v.z + 1, { col: A.freeze ? '#bfe9ff' : '#fff6b0' });
  addPart('text', v.x, v.y + 84 * (v.def.size || 1), v.z, { txt: Math.round(dmg) + '', col: human ? '#ffd34d' : '#ffffff' });
  if (A.launch || dmg >= 30) W.shake = Math.max(W.shake, A.launch ? 5 : 3);
  const armored = (v.armorT > 0 || v.superT > 0);
  if (v.hp <= 0) { v.hp = 0; v.dying = true; v.dropItem(); knock(v, dir, Math.max(A.kb || 3, 4), Math.max(A.kbY || 0, 6.5)); return true; }
  if (v.state === 'frozen') { Sound.play('shatter'); for (let i = 0; i < 12; i++) addPart('ice', v.x, rnd(10, 70), v.z, { vx: rnd(-4, 4), vy: rnd(1, 5) }); knock(v, dir, 4, 6.5); return true; }
  if (A.freeze && !armored && v.y <= 0) { v.frozenPose = v.lastPose; v.set('frozen'); v.vx = dir * 1; v.dropItem(); Sound.play('ice'); return true; }
  if (armored) return true;
  const heavy = v.def.heavy;
  v.fallMeter += A.fall !== undefined ? A.fall : A.launch ? 100 : 30;
  const air = v.y > 0 && v.state !== 'skill';
  const launch = heavy ? (v.fallMeter >= 150 || (A.launch && dmg >= 34)) : (A.launch || v.fallMeter >= 100 || air);
  if (launch) { knock(v, dir, A.kb || 3, A.kbY || 5); return true; }
  if (heavy && v.fallMeter < 55 && (v.state === 'atk' || v.state === 'skill')) return true; // tough guys shrug off light hits mid-swing
  v.set('hurt'); v.stun = (A.stun || 16) * (heavy ? 0.6 : 1); v.vx = dir * (A.kb || 1.5) * (heavy ? 0.5 : 1); if (v.hold && Math.random() < 0.25) v.dropItem();
  if (v.state === 'hurt') v.face = -dir;
  return true;
}
function knock(v, dir, kb, kbY) {
  v.set('fall'); v.vx = dir * kb; v.vy = kbY; v.y = Math.max(v.y, 1); v.face = -dir; v.fallMeter = 0; v.bounced = false; v.invisible = false;
  if (v.hold) v.dropItem();
}
function breakItem(it) {
  const i = W.items.indexOf(it); if (i >= 0) W.items.splice(i, 1);
  for (let k = 0; k < 6; k++) addPart('rock', it.x, it.y + 30, it.z, { vx: rnd(-3, 3), vy: rnd(2, 5), col: it.kind === 'stick' ? '#b07a3d' : '#9a9aa8', r: 3 });
}

/* ------------------------- projectiles & items ------------------------- */
function updateProjs() {
  for (let i = W.projs.length - 1; i >= 0; i--) {
    const p = W.projs[i]; p.t++;
    if (p.grav) p.vy -= 0.28;
    p.x += p.vx; p.y += p.vy; p.z = clamp(p.z + p.vz, 4, FLOOR_D - 4);
    let dead = p.t > p.life || p.x < W.minX - 200 || p.x > W.maxX + 200;
    if (p.kind === 'fire' && p.t % 2 === 0) addPart('fire', p.x - p.vx, p.y + rnd(-6, 6), p.z, { vx: -p.vx * 0.2, vy: rnd(0, 1) });
    if (p.kind === 'ice' && p.t % 3 === 0) addPart('snow', p.x - p.vx, p.y + rnd(-6, 6), p.z, { vx: -p.vx * 0.15 });
    if (p.kind === 'spikes' && p.t % 3 === 0) addPart('spike', p.x, 0, p.z + rnd(-6, 6), { h: rnd(26, 42) });
    if (p.kind === 'rock' && p.y <= 0) { dead = true; W.shake = 4; Sound.play('fall', 0.6); for (let k = 0; k < 8; k++) addPart('rock', p.x, 4, p.z, { vx: rnd(-3, 3), vy: rnd(2, 5) }); }
    // projectiles cancel each other
    if (!dead && (p.kind === 'fire' || p.kind === 'ice' || p.kind === 'star' || p.kind === 'arrow' || p.kind === 'fruit')) {
      for (const q of W.projs) if (q !== p && q.team !== p.team && !q.dead && (q.kind === 'fire' || q.kind === 'ice' || q.kind === 'star' || q.kind === 'arrow' || q.kind === 'fruit') && Math.abs(q.x - p.x) < p.r + q.r && Math.abs(q.z - p.z) < 14 && Math.abs(q.y - p.y) < 24) {
        q.dead = true; dead = true; smoke({ x: p.x, z: p.z }); Sound.play('block');
      }
    }
    if (!dead) for (const v of W.fighters) {
      if (v.team === p.team || v.dead || p.hit.has(v)) continue;
      if (Math.abs(v.z - p.z) > 15 || Math.abs(v.x - p.x) > p.r + 12 * (v.def.size || 1)) continue;
      if (p.ground ? v.y > 24 : (p.y < v.y - 6 || p.y > v.y + 76 * (v.def.size || 1))) continue;
      if (v.state === 'lying' || v.invul > 0 || v.invisible) continue;
      const ok = applyHit(p.owner, v, p, sgn(p.vx), true); p.hit.add(v);
      if (ok && p.kind !== 'spikes') { dead = true; if (p.kind === 'fire') for (let k = 0; k < 10; k++) addPart('fire', p.x, p.y, p.z, { vx: rnd(-3, 3), vy: rnd(-2, 3) }); break; }
    }
    if (dead || p.dead) W.projs.splice(i, 1);
  }
}
function updateItems() {
  for (let i = W.items.length - 1; i >= 0; i--) {
    const it = W.items[i];
    if (it.holder) { if (it.holder.dead) it.holder.dropItem(); continue; }
    if (it.drop && it.y > 0) { it.vy -= 0.25; it.y += it.vy; if (it.y <= 0) { it.y = 0; it.vy = 0; it.drop = false; Sound.play('land', 0.5); addPart('dust', it.x, 0, it.z, {}); } continue; }
    if (it.fly) {
      it.vy -= 0.22; it.x += it.vx; it.y += it.vy; it.z = clamp(it.z + it.vz, 4, FLOOR_D - 4); it.spin += 0.4 * sgn(it.vx);
      for (const v of W.fighters) {
        if (v.team === it.team || v.dead || it.hit.has(v) || v.invul > 0 || v.state === 'lying') continue;
        if (Math.abs(v.z - it.z) > 15 || Math.abs(v.x - it.x) > 22 || it.y < v.y - 4 || it.y > v.y + 76) continue;
        it.hit.add(v);
        applyHit(it.owner, v, { dmg: it.kind === 'stone' ? 45 : 32, kb: 4, kbY: 5, launch: true, sfx: 'heavy' }, sgn(it.vx), true);
        if (it.kind === 'stone') { breakItem(it); it.gone = true; } else { it.vx *= -0.3; it.vy = 3; }
        break;
      }
      if (it.gone) continue;
      if (it.y <= 0) {
        it.y = 0;
        if (it.kind === 'stone' || --it.dur <= 0) { breakItem(it); continue; }
        it.fly = false; it.vx = 0; it.vy = 0; it.vz = 0; it.spin = 0; Sound.play('land', 0.5);
      }
      if (it.x < W.minX - 100 || it.x > W.maxX + 100) W.items.splice(i, 1);
    }
  }
}
function spawnItem(kind, x, z, fromSky) {
  W.items.push({ kind, x, z, y: fromSky ? 420 : 0, vx: 0, vy: 0, vz: 0, drop: !!fromSky, dur: kind === 'stick' ? 10 : 1, holder: null, fly: false, spin: 0 });
}
function updateParts() {
  for (let i = W.parts.length - 1; i >= 0; i--) {
    const p = W.parts[i]; p.t++;
    if (p.kind === 'rock' || p.kind === 'ice') { p.vy -= 0.3; if (p.y + p.vy < 0) { p.vy *= -0.4; p.vx *= 0.6; } }
    if (p.kind === 'fire' || p.kind === 'smoke') p.vy += 0.05;
    if (p.kind === 'text') p.vy = 1.0 * (1 - p.t / p.life);
    p.x += p.vx; p.y += p.vy;
    if (p.t >= p.life) W.parts.splice(i, 1);
  }
}


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
    look: mkLook({ style: 'spiky', hair: '#3b2417', acc: '#ff3b2f', shirt: '#ff5a4a', trim: '#ffd34d', pants: '#2f3a63', shoe: '#f2efe6', scarf: '#ffcc33' }),
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
  /* unlockable heroes (clear the stage named in unlockStage) */
  zap: { name: '小雷', en: 'Zap', blurb: '雷電少年。雷電球會麻痺敵人，閃電衝穿過一排，落雷從天而降。', hp: 470, spd: 1.08, pow: 0.95, stats: [3, 3, 2], unlockStage: 0, unlock: '打通第一關解鎖',
    look: mkLook({ style: 'zap', hair: '#ffd23f', acc: '#2b2733', shirt: '#2b2733', trim: '#ffd23f', pants: '#ffd23f', shoe: '#2b2733', shorts: true }),
    combo: ['jab', 'cross', 'kick'], skills: ['bolt', 'thunderdash', 'thunder'] },
  feng: { name: '阿風', en: 'Feng', blurb: '風之少年。旋風彈把人捲起來，跳得最高，龍捲風把周圍的人全部吹飛。', hp: 450, spd: 1.12, pow: 0.9, stats: [2, 4, 2], unlockStage: 1, unlock: '打通第二關解鎖',
    look: mkLook({ style: 'breeze', hair: '#3f9a6a', acc: '#ffffff', shirt: '#7fd6b8', trim: '#ffffff', pants: '#2f6f5a', shoe: '#ffffff', sleeve: 'long' }),
    combo: ['jab', 'cross', 'kick'], skills: ['tornado', 'windjump', 'cyclone'] },
  mimi: { name: '小咪', en: 'Mimi', blurb: '召喚少女。叫小狗豆豆來幫忙，丟會飛回來的骨頭，還能幫大家補血。', hp: 440, spd: 1.02, pow: 0.85, stats: [2, 3, 2], unlockStage: 2, unlock: '打通第三關解鎖',
    look: mkLook({ style: 'buns', skin: '#f8d6bd', hair: '#ff8ab3', acc: '#ffcc33', shirt: '#ffb3cf', trim: '#ffffff', pants: '#b06ad9', shoe: '#ffffff', shorts: true }),
    combo: ['jab', 'cross', 'kick'], skills: ['pet', 'bone', 'cheer'] },
  dog: { name: '豆豆', hp: 160, spd: 1.25, pow: 0.7, enemy: false, draw: 'dog', pet: true,
    look: mkLook({ style: 'dog', animal: true, shirt: '#e8b878', skin: '#fff6e6', pants: '#e8b878' }),
    combo: ['bite'], skills: [] },
  dummy: { name: '稻草人', hp: 260, spd: 0, pow: 0.4, enemy: true, draw: 'dummy', heavy: false,
    look: mkLook({ style: 'dummy', animal: true, shirt: '#d9b45a', pants: '#d9b45a' }),
    combo: ['pinch'], skills: ['toss'] },
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
    combo: ['jab', 'cross', 'upper'], skills: ['spit', 'stomp', 'charge'] },
  /* stage 2-4 monsters */
  cat: { name: '石虎', hp: 130, spd: 1.25, pow: 0.75, enemy: true,
    look: mkLook({ style: 'cat', animal: true, skin: '#f4e6c8', hair: '#5a3a22', shirt: '#c99a5a', pants: '#b5874a', shoe: '#6a4426', glove: '#f4e6c8', tail: 'long', belly: '#f4e6c8', angry: true, spots: '#5a3a22' }),
    combo: ['jab', 'cross'], skills: ['pounce'] },
  crab: { name: '螃蟹兵', hp: 170, spd: 0.85, pow: 0.8, enemy: true, draw: 'crab', shell: true,
    look: mkLook({ style: 'crab', animal: true, shirt: '#e8432f', skin: '#ffd2b8', pants: '#e8432f' }),
    combo: ['pinch', 'pinch'], skills: [] },
  octopus: { name: '小章魚', hp: 120, spd: 0.8, pow: 0.7, enemy: true, ranged: true, draw: 'octo',
    look: mkLook({ style: 'octo', animal: true, shirt: '#b06ad9', skin: '#e6c2f2', pants: '#b06ad9' }),
    combo: ['pinch'], skills: ['ink'] },
  magpie: { name: '台灣藍鵲', hp: 100, spd: 1.2, pow: 0.75, enemy: true, fly: true, draw: 'magpie',
    look: mkLook({ style: 'magpie', animal: true, shirt: '#2f6fd1', skin: '#1c1a2e', pants: '#2f6fd1' }),
    combo: ['bite'], skills: ['swoop'] },
  raccoon: { name: '狸貓大王', hp: 1300, spd: 0.85, pow: 1.1, size: 1.45, heavy: true, enemy: true, boss: true,
    look: mkLook({ style: 'raccoon', animal: true, build: 'big', skin: '#f4e6c8', hair: '#3a2a22', shirt: '#9a7a5a', pants: '#7a5c40', shoe: '#3a2a22', glove: '#3a2a22', tail: 'ringed', belly: '#f4e6c8', angry: true, acc: '#e8432f', eyeRing: true }),
    combo: ['jab', 'cross', 'upper'], skills: ['buns', 'belly', 'drum'] },
  blackbear: { name: '黑熊王', hp: 1500, spd: 0.8, pow: 1.2, size: 1.6, heavy: true, enemy: true, boss: true,
    look: mkLook({ style: 'bear', animal: true, build: 'big', skin: '#2b2733', hair: '#1c1a2e', shirt: '#2b2733', pants: '#24212c', shoe: '#1c1a2e', glove: '#1c1a2e', tail: 'stub', belly: '#fff6e6', vmark: true, angry: true, eyeRing: true }),
    combo: ['cross', 'upper', 'cross'], skills: ['roar', 'slam', 'charge'] },
  bigocto: { name: '大章魚', hp: 1500, spd: 0.5, pow: 1.15, size: 2.1, heavy: true, enemy: true, boss: true, draw: 'octo',
    look: mkLook({ style: 'octo', animal: true, shirt: '#e8432f', skin: '#ffb3a9', pants: '#e8432f', crown: true }),
    combo: ['sweep1'], skills: ['inkspray', 'sweep', 'summon'] }
};
const HEROES = ['rex', 'yuki', 'gan', 'kite', 'zap', 'feng', 'mimi'];

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
  pinch: { pose: 'jab', dur: 22, on: 7, off: 11, rx: [2, 36], hy: [0, 44], dz: 15, dmg: 14, kb: 1.6, stun: 18, fall: 34 },
  sweep1: { pose: 'jab', dur: 34, on: 12, off: 18, rx: [-10, 70], hy: [0, 40], dz: 20, dmg: 22, kb: 4, kbY: 4, launch: true, sfx: 'heavy' },
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
  pounce: { name: '撲擊', cost: 80, dur: 50, start(f) { f.hitSet.clear(); },
    tick(f, t) { if (t === 8) { f.vy = 6.5; f.vx = f.face * 7; Sound.play('whiff'); } if (t > 8) { f.meleeHit({ rx: [-4, 34], hy: [0, 60], dz: 16, dmg: 22, kb: 3, kbY: 4, launch: true }); if (f.y <= 0) return 'end'; } },
    pose(P, t) { if (t < 8) { P.by = 8; P.lean = 0.5; } else { P.lean = 0.6; P.ar = [1.7, 0.1]; P.al = [1.5, 0.2]; P.ll = [-0.9, 0.4]; P.lr = [0.4, 1.2]; } } },
  ink: { name: '噴墨', cost: 0, dur: 40, tick(f, t) { if (t === 20) { spawnProj(f, 'ink', { dx: 22, y: 30, vx: 6.5, dmg: 10, stun: 14, fall: 30, ink: true, life: 110, r: 11 }); Sound.play('pop'); } } },
  buns: { name: '丟包子', cost: 80, dur: 46, tick(f, t) { if (t === 20) { [-1.5, 0, 1.5].forEach((vz, k) => spawnProj(f, 'bun', { dx: 30, y: 90, vx: 5 + k * 0.8, vy: 4.5, vz, grav: true, dmg: 26, kb: 3, kbY: 4, launch: true, life: 160, r: 12 })); Sound.play('throw'); } },
    pose(P, t) { const e = clamp((t - 10) / 10, 0, 1); P.ar = [lerp(-2.6, 1.7, e), 0.3]; P.al = [lerp(-2.4, 1.4, e), 0.3]; P.lean = lerp(-0.3, 0.3, e); } },
  belly: { name: '肚子彈', cost: 90, dur: 46, start(f) { f.superT = 40; f.hitSet.clear(); },
    tick(f, t) { if (t >= 10 && t <= 36) { f.vx = f.face * 7; if (t === 10) { f.vy = 3; } f.meleeHit({ rx: [-6, 42], hy: [0, 80], dz: 20, dmg: 34, kb: 6, kbY: 5, launch: true, sfx: 'heavy' }); } else f.vx *= 0.8; },
    pose(P, t) { P.lean = t < 10 ? -0.3 : -0.45; P.ar = [-0.6, 0.4]; P.al = [-0.9, 0.4]; P.by = t < 10 ? 6 : 0; P.ll = [-0.3, 0.8]; P.lr = [0.5, 1.2]; } },
  drum: { name: '敲肚皮', cost: 120, dur: 64, start(f) { f.stomped = false; f.superT = 40; },
    tick(f, t) { if (t % 12 === 6 && t < 44) { Sound.play('drum', 1); W.shake = 4; } if (t === 46) { Sound.play('quake'); W.shake = 10; f.areaHit({ rx: 150, dz: 50, dmg: 32, kb: 5, kbY: 6, launch: true, groundOnly: true, sfx: 'heavy' }); addPart('ring', f.x, 0, f.z, { r: 10, grow: 8, life: 24 }); } },
    pose(P, t) { const k = (t >> 2) & 1; P.ar = [k ? 1.2 : 0.6, 1.6]; P.al = [k ? 0.6 : 1.2, 1.6]; P.lean = -0.15; P.face = 'happy'; } },
  roar: { name: '大吼', cost: 100, dur: 56, start(f) { f.superT = 50; },
    tick(f, t) {
      if (t === 16) { Sound.play('roar'); W.shake = 12; addPart('ring', f.x + f.face * 30, 60, f.z, { r: 20, grow: 9, life: 22 });
        for (const v of W.fighters) { if (v.team === f.team || v.dead || Math.abs(v.x - f.x) > 190 || Math.abs(v.z - f.z) > 60) continue; v.vx = sgn(v.x - f.x) * 6; if (v.canAct() || v.state === 'defend' || v.state === 'atk') { v.set('dizzy'); v.st = 30; } } }
    },
    pose(P, t) { const e = clamp((t - 6) / 10, 0, 1); P.lean = lerp(0.1, -0.35, e); P.ht = -0.4 * e; P.ar = [lerp(0.6, 2.5, e), 0.4]; P.al = [lerp(0.4, 2.3, e), 0.4]; P.mouth = t > 12; } },
  inkspray: { name: '噴墨汁', cost: 70, dur: 50, tick(f, t) { if (t === 24) { [-1.3, 0, 1.3].forEach(vz => spawnProj(f, 'ink', { dx: 40, y: 50, vx: 6.5, vz, dmg: 16, stun: 16, fall: 40, ink: true, life: 120, r: 14 })); Sound.play('pop'); } } },
  sweep: { name: '觸手掃', cost: 90, dur: 56, start(f) { f.hitSet.clear(); },
    tick(f, t) { if (t === 24) { Sound.play('slash'); W.shake = 6; } if (t >= 24 && t <= 34) f.areaHit({ rx: 190, dz: 40, dmg: 30, kb: 6, kbY: 4, launch: true, groundOnly: true, sfx: 'heavy', once: true }); } },
  summon: { name: '叫螃蟹', cost: 160, dur: 50, tick(f, t) {
      if (t === 25 && W.fighters.filter(x => x.id === 'crab' && !x.dead).length < 3) { for (const side of [-1, 1]) { const c = new Fighter('crab', f.team, f.x + side * 120, clamp(f.z + rnd(-30, 30), 20, FLOOR_D - 20), new AICtl()); c.y = 200; c.set('jump'); W.fighters.push(c); } Sound.play('pop'); }
    } },
  /* 小雷 */
  bolt: { name: '雷電球', cost: 75, dur: 26, tick(f, t) { if (t === 9) { spawnProj(f, 'bolt', { dx: 30, y: 44, vx: 10, dmg: 34, stun: 44, fall: 0, shock: true, life: 80, r: 12 }); Sound.play('zap'); } }, pose(P, t) { castPose(P, t, 8, 15); } },
  thunderdash: { name: '閃電衝', cost: 100, dur: 34, start(f) { f.invul = 26; f.hitSet.clear(); Sound.play('zap'); },
    tick(f, t) { if (t >= 4 && t <= 20) { f.vx = f.face * 12; f.meleeHit({ rx: [-24, 30], hy: [0, 80], dz: 20, dmg: 30, kb: 2, stun: 40, fall: 0, shock: true }); if (t % 2 === 0) addPart('zap', f.x, rnd(20, 70), f.z, {}); } else f.vx *= 0.7; },
    pose(P) { P.lean = 0.6; P.ar = [1.6, 0]; P.al = [1.4, 0.2]; P.ll = [-0.9, 0.3]; P.lr = [0.7, 0.8]; P.by = 3; } },
  thunder: { name: '落雷', cost: 150, dur: 60, start(f) { f.superT = 30; f.strikes = W.fighters.filter(v => v.team !== f.team && !v.dead && Math.abs(v.x - f.x) < 420).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x)).slice(0, 3); },
    tick(f, t) {
      if (t === 10) Sound.play('power');
      const k = [18, 28, 38].indexOf(t);
      if (k >= 0) {
        const v = f.strikes[k] || null, x = v ? v.x : f.x + f.face * (100 + k * 80), z = v ? v.z : f.z;
        addPart('strike', x, 0, z, { life: 14 }); Sound.play('thunder'); W.shake = 8;
        for (const u of W.fighters) if (u.team !== f.team && !u.dead && Math.abs(u.x - x) < 40 && Math.abs(u.z - z) < 24) applyHit(f, u, { dmg: 40, kb: 2, kbY: 7, launch: true, sfx: 'heavy', unblock: true }, sgn(u.x - f.x || 1), true);
      }
    },
    pose(P, t) { P.ar = [3.0, 0.1]; P.al = [2.8, 0.1]; P.face = t > 15 ? 'happy' : 'n'; P.lean = -0.1; } },
  /* 阿風 */
  tornado: { name: '旋風彈', cost: 75, dur: 28, tick(f, t) { if (t === 10) { spawnProj(f, 'tornado', { dx: 30, y: 6, vx: 5, dmg: 9, kb: 0, kbY: 0, stun: 12, fall: 0, multi: 8, life: 90, r: 18, lift: true }); Sound.play('wind'); } }, pose(P, t) { castPose(P, t, 9, 16); } },
  windjump: { name: '風之跳', cost: 90, dur: 80, start(f) { f.hitSet.clear(); f.dived = false; },
    tick(f, t) {
      if (t === 4) { f.vy = 13; f.vx = f.face * 3; Sound.play('wind'); for (let k = 0; k < 8; k++) addPart('wind', f.x + rnd(-20, 20), 4, f.z, { vy: rnd(1, 3) }); }
      if (t > 14 && !f.dived && f.vy < 2) { f.dived = true; f.vy = -12; f.vx = f.face * 7; }
      if (f.dived) { f.meleeHit({ rx: [-10, 36], hy: [-20, 50], dz: 18, dmg: 40, kb: 4, kbY: 6, launch: true, sfx: 'heavy' }); if (f.y <= 0) { W.shake = 6; addPart('ring', f.x, 0, f.z, { r: 8, grow: 6, life: 16 }); return 'end'; } }
    },
    pose(P, t, f) { if (!f.dived) { P.ll = [-0.2, 1.4]; P.lr = [0.9, 1.8]; P.ar = [2.8, 0.2]; P.al = [2.6, 0.2]; } else { P.lr = [1.2, 0]; P.ll = [0.4, 1.6]; P.lean = 0.3; P.ar = [1.2, 0.4]; } } },
  cyclone: { name: '龍捲風', cost: 160, dur: 80, start(f) { f.superT = 80; Sound.play('wind'); },
    tick(f, t) {
      if (t % 5 === 0) f.face = -f.face;
      for (let i = 0; i < 2; i++) { const a = rnd(TAU); addPart('wind', f.x + Math.cos(a) * rnd(20, 90), rnd(10, 100), f.z + Math.sin(a) * 30, { vx: -Math.sin(a) * 3, vy: rnd(0.5, 2) }); }
      if (t >= 10 && t <= 60 && t % 8 === 0) { f.areaHit({ rx: 95, dz: 38, dmg: 8, kb: 0, stun: 14, fall: 0, stop: 2, pull: true }); Sound.play('wind', 0.4); }
      if (t === 68) f.areaHit({ rx: 100, dz: 40, dmg: 26, kb: 4, kbY: 10, launch: true, sfx: 'heavy' });
    },
    pose(P, t) { P.ar = [2.4, 0.2]; P.al = [2.2, 0.2]; P.by = -4; P.lean = 0; } },
  /* 小咪 */
  pet: { name: '叫豆豆', cost: 120, dur: 30, tick(f, t) {
      if (t === 14) {
        if (f.pet && !f.pet.dead) { f.pet.lifeT = 900; f.pet.hp = f.pet.maxHp; smoke(f.pet); }
        else { const d = new Fighter('dog', f.team, f.x + f.face * 40, f.z, new AICtl()); d.owner = f; d.lifeT = 900; d.ally = true; d.face = f.face; d.lives = 0; f.pet = d; W.fighters.push(d); smoke(d); }
        Sound.play('woof');
      }
    }, pose(P, t) { P.ar = [lerp(0.6, 2.4, clamp(t / 10, 0, 1)), 0.6]; P.face = 'happy'; } },
  bone: { name: '骨頭飛盤', cost: 60, dur: 24, tick(f, t) { if (t === 8) { spawnProj(f, 'bone', { dx: 24, y: 44, vx: 9, dmg: 22, kb: 2, stun: 20, fall: 50, life: 100, r: 12, boomer: true }); Sound.play('throw'); } },
    pose(P, t) { const e = clamp((t - 1) / 6, 0, 1); P.ar = [lerp(-0.6, 1.7, e), lerp(1.8, 0.1, e)]; P.lean = lerp(-0.1, 0.25, e); } },
  cheer: { name: '加油打氣', cost: 150, dur: 50, tick(f, t) {
      if (t === 12) { Sound.play('drink'); for (const v of W.fighters) if (v.team === f.team && !v.dead && Math.abs(v.x - f.x) < 260 && Math.abs(v.z - f.z) < 80) { v.healT = 120; } }
      if (t % 6 === 0) addPart('heart', f.x + rnd(-30, 30), rnd(40, 90), f.z, { vy: 1 });
    }, pose(P, t) { const k = Math.sin(t * 0.4); P.ar = [2.6 + k * 0.3, 0.3]; P.al = [2.6 - k * 0.3, 0.3]; P.face = 'happy'; P.by = -Math.abs(k) * 4; } },
  /* practice dummy: tosses a soft ball so you can practise blocking */
  toss: { name: '丟球', cost: 0, dur: 30, tick(f, t) { if (t === 14) { spawnProj(f, 'ball', { dx: 20, y: 46, vx: 6, dmg: 4, kb: 1, stun: 10, fall: 0, life: 120, r: 9 }); Sound.play('throw', 0.6); } } },
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
  W.parts.push(Object.assign({ kind, x, y, z, vx: 0, vy: 0, life: o.life || ({ spark: 12, dust: 22, fire: 22, snow: 30, ice: 24, smoke: 26, text: 40, ring: 20, burst: 22, puff: 28, callout: 46, rock: 50, slash: 12, ghost: 12, spike: 26, star: 22, bonk: 18 })[kind] || 20, t: 0 }, o));
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
  comboList() { return this.hold && ITEMS[this.hold.kind].type !== 'food' ? ['swing1', 'swing2', 'swing3'] : this.def.combo; }
  doAttack() {
    const list = this.comboList();
    if (this.comboT <= 0) this.combo = 0;
    this.startAttack(list[this.combo % list.length]); this.combo++;
  }
  trySkill(n) {
    const id = this.def.skills[n - 1]; if (!id) return false; const S = SKILLS[id];
    if (this.mp < S.cost) { if (this.ctl && this.ctl.human) this.flashMp = 20; return false; }
    this.mp -= S.cost; this.skill = id; this.set('skill'); this.hitSet.clear(); this.vx = 0; this.auraT = 22;
    addPart('callout', this.x, 100 * (this.def.size || 1), this.z, { txt: S.name, life: 46, col: this.def.enemy ? '#ff7a6b' : '#fff27a' });
    if (this.inp.mx) this.face = sgn(this.inp.mx);
    if (S.start) S.start(this);
    return true;
  }
  nearItem() {
    for (const it of W.items) if (!it.holder && !it.fly && !it.fuse && it.y <= 1 && Math.abs(it.x - this.x) < 34 && Math.abs(it.z - this.z) < 18) return it;
    return null;
  }
  pickUp(it) {
    this.set('pickup'); this.vx = this.vz = 0; Sound.play('pick');
    if (ITEMS[it.kind].type === 'food') { W.items.splice(W.items.indexOf(it), 1); this.drinkKind = it.kind; this.pendingDrink = true; }
    else { it.holder = this; this.hold = it; }
  }
  dropItem(throwIt) {
    const it = this.hold; if (!it) return; this.hold = null; it.holder = null;
    it.x = this.x + this.face * 10; it.z = this.z; it.y = 20; it.vx = 0; it.vy = 3; it.drop = true;   // falls to the floor (it used to hang in the air and could never be picked up again)
  }
  startThrow() { this.set('throw'); this.vx *= 0.3; }
  /* the item button: pick up what is underfoot, or throw what is in hand */
  useItem() {
    if (this.hold) { this.startThrow(); return true; }
    const near = this.nearItem(); if (near) { this.pickUp(near); return true; }
    return false;
  }

  /* melee hitbox against every foe; each victim once per hitSet */
  meleeHit(A) {
    let any = false;
    const s = this.def.size || 1;
    const reach = A.weapon && this.hold ? (ITEMS[this.hold.kind].reach || 1) : 1;
    const x0 = this.x + this.face * A.rx[0] * s, x1 = this.x + this.face * A.rx[1] * s * reach, lo = Math.min(x0, x1), hi = Math.max(x0, x1);
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
      if (A.once && this.hitSet.has(v)) continue;
      if (Math.abs(v.x - this.x) > A.rx || Math.abs(v.z - this.z) > A.dz) continue;
      if (A.groundOnly && v.y > 30) continue;
      const dir = sgn(v.x - this.x);
      const B = Object.assign({}, A); if (A.pull) { B.kb = 0; v.vx += -dir * 1.2; }
      if (applyHit(this, v, B, dir, true) && A.once) this.hitSet.add(v);
    }
  }

  update() {
    this.clock++;
    if (this.freeze > 0) { this.freeze--; return; }
    const I = this.inp;
    // the item button is remembered for a moment, so a press during an attack or a step too far away still counts
    if (I.item) this.itemBuf = 12; else if (this.itemBuf > 0) this.itemBuf--;
    const wantItem = this.itemBuf > 0;
    if (this.invul > 0) this.invul--; if (this.flash > 0) this.flash--; if (this.armorT > 0) this.armorT--; if (this.superT > 0) this.superT--; if (this.shakeT > 0) this.shakeT--;
    if (this.comboT > 0) this.comboT--;
    if (this.state !== 'hurt' && this.state !== 'fall') this.fallMeter = Math.max(0, this.fallMeter - 0.8);
    if (this.state !== 'defend') this.guard = Math.min(100, this.guard + 0.25);
    if (!this.dead) this.mp = Math.min(this.maxMp, this.mp + (this.def.enemy ? 0.5 : 0.14 + (1 - this.hp / this.maxHp) * 0.12));
    if (!this.def.enemy && !this.dead && !this.dying) { if (this.regenT > 0) this.regenT--; else if (this.hp < this.cap) this.hp = Math.min(this.cap, this.hp + 0.12); }
    this.hpLag = this.hpLag > this.hp ? Math.max(this.hp, this.hpLag - 2.5) : this.hp;
    this.st++;
    if (this.inkT > 0) this.inkT--;
    if (this.healT > 0) { this.healT--; this.hp = Math.min(this.maxHp, this.hp + 1); this.cap = Math.max(this.cap, this.hp); if (this.healT % 10 === 0) addPart('heart', this.x + rnd(-12, 12), 80, this.z, { vy: 1 }); }
    if (this.lifeT > 0 && --this.lifeT === 0 && !this.dead) { smoke(this); this.dead = true; this.invisible = true; this.lives = 0; this.set('dead'); this.st = 200; }
    if (this.shockT > 0) { this.shockT--; if (this.shockT % 4 === 0) addPart('zap', this.x + rnd(-14, 14), rnd(20, 70), this.z, {}); }
    const spd = this.spd * (this.inkT > 0 ? 0.6 : 1);
    let air = this.y > 0 || this.vy > 0;

    switch (this.state) {
      case 'idle': case 'walk': case 'brake': case 'land': {
        if (this.state === 'brake') { this.vx *= 0.82; if (this.st < 9) break; }
        if (this.state === 'land' && this.st < 5) { this.vx *= 0.6; this.vz *= 0.6; break; }
        if (this.pendingWin) { this.set('win'); break; }
        if (I.skill && this.trySkill(I.skill)) break;
        if (wantItem && this.useItem()) { this.itemBuf = 0; break; }
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
        if (wantItem && this.hold) { this.itemBuf = 0; this.startThrow(); break; }
        if (wantItem && this.nearItem()) { this.itemBuf = 0; this.pickUp(this.nearItem()); break; }
        if (I.atk) {
          this.set('runAtk'); this.atk = ATK.runAtk; this.hitSet.clear(); this.vy = 2.5; Sound.play('whiff'); break;
        }
        if (I.jmp) { this.jump(this.face * 6.5 * spd, I.mz * 1.5); this.vy = 7.8; break; }
        if (I.defP || I.def) { this.set('roll'); this.invul = 20; break; }
        if (!I.run || sgn(I.mx) !== this.face || !I.mx) { this.set('brake'); }
        break;
      }
      case 'jump': {
        if (wantItem && this.hold && !this.didAirAtk) { this.itemBuf = 0; this.didAirAtk = true; this.startThrow(); break; }
        if (I.atk && !this.didAirAtk) {
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
          if (this.meleeHit(A) && this.hold && ITEMS[this.hold.kind].type === 'weapon' && A.weapon) { if (--this.hold.dur <= 0) { breakItem(this.hold); this.hold = null; } }
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
        if (wantItem && this.useItem()) { this.itemBuf = 0; break; }
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
          if (!this.bounced && Math.abs(this.vyLast) > 4) { this.bounced = true; this.vy = 3; this.vx *= 0.5; Sound.play('fall'); W.shake = Math.max(W.shake, 4); addPart('puff', this.x, 0, this.z + 1, { s: (this.def.size || 1) * clamp(Math.abs(this.vyLast) / 7, 0.7, 1.3) }); for (let i = 0; i < 3; i++) addPart('star', this.x, 30, this.z, { vx: rnd(-2.5, 2.5), vy: rnd(2, 4) }); }
          else { this.set(this.dying ? 'dead' : 'lying'); this.vx = 0; this.vz = 0; if (this.dying) this.die(); }
        }
        break;
      }
      case 'lying': { this.vx *= 0.7; if (this.st >= 34) { this.set('getup'); this.invul = 999; } break; }
      case 'getup': { if (this.st >= 20) { this.set('idle'); this.invul = this.def.enemy ? 30 : 60; this.fallMeter = 0; } break; }
      case 'dead': { this.vx *= 0.8; if (this.def.enemy && this.st === 22) { smoke(this); for (let i = 0; i < 6; i++) addPart('star', this.x, 20, this.z, { vx: rnd(-3, 3), vy: rnd(2, 5) }); this.invisible = true; Sound.play('poof'); } break; }
      case 'pickup': {
        if (this.st >= 6) { if (this.pendingDrink) { this.pendingDrink = false; this.set('drink'); Sound.play('drink'); } else this.set('idle'); }
        break;
      }
      case 'drink': {
        const F = ITEMS[this.drinkKind];
        this.hp = Math.min(this.maxHp, this.hp + F.hp); this.cap = Math.max(this.cap, this.hp); this.mp = Math.min(this.maxMp, this.mp + F.mp);
        if (this.st % 8 === 0) addPart('text', this.x, 86, this.z, { txt: '+', col: F.hp > F.mp ? '#ff6f9a' : '#5ab8ff', life: 26 });
        if (this.st >= (F.time || 46) || I.atk || I.jmp) this.set('idle');
        break;
      }
      case 'throw': {
        this.vx *= 0.85;
        if (this.st === 7 && this.hold) {
          const it = this.hold; this.hold = null; it.holder = null; it.fly = true; it.owner = this; it.team = this.team;
          it.x = this.x + this.face * 20; it.y = this.y + 60; it.z = this.z; const T = ITEMS[it.kind]; it.vx = this.face * (T.speed || 10); it.vy = T.vy || 2; it.vz = this.inp.mz * 0.8; it.hit = new Set(); it.spin = 0;
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
    if (this.lives > 1) { this.lives--; this.respawnT = this.home ? 50 : 130; } else this.lives = 0;
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
  // crabs block hits from the front with their shell unless caught mid-attack (hit them from behind or from above)
  if (v.def.shell && v.face === -dir && !area && (v.state === 'idle' || v.state === 'walk') && Math.random() < 0.75 && !(att && att.y > 20)) {
    v.vx = dir * 2; Sound.play('block'); addPart('spark', v.x - dir * 14, v.y + 26, v.z, { col: '#ffd2b8' }); if (att) att.freeze = 3; return true;
  }
  if (A.ink && !(v.state === 'defend' && v.face === -dir)) { v.inkT = 160; }
  if (A.shock) v.shockT = 40;
  if (v.state === 'defend' && v.face === -dir && v.hold && v.hold.kind === 'umbrella') {
    v.blocks = (v.blocks || 0) + 1;
    v.vx = dir * 1.5; Sound.play('block'); addPart('spark', v.x - dir * 18, v.y + 50, v.z, { col: '#8fd0ff' }); return true;
  }
  if (v.state === 'defend' && v.face === -dir && !A.unblock && !A.freeze) {
    v.blocks = (v.blocks || 0) + 1;
    v.hp -= dmg * 0.08; v.guard -= dmg * 1.5; v.vx = dir * 2.6; v.freeze = 3; if (att) att.freeze = 3;
    Sound.play('block'); addPart('spark', v.x - dir * 10, v.y + 44, v.z, { col: '#8fd0ff', n: 1 });
    if (v.guard <= 0) { v.guard = 30; v.set('dizzy'); Sound.play('hit'); }
    if (v.hp <= 0) { v.hp = 1; }
    return true;
  }
  if (v.armorT > 0) dmg *= 0.5;
  v.hp -= dmg; if (!v.def.enemy) { v.cap = Math.max(v.hp, v.cap - dmg / 3); v.regenT = 100; } v.flash = 5; v.shakeT = 8; v.lastHitBy = att;
  if (att) { att.dmgDone += dmg; if (human) W.score += Math.round(dmg); }
  // heavy hits (launchers, finishers, big damage) get the full treatment: longer hit-stop, a white flash, a comic "砰！"
  const big = !!(A.launch || dmg >= 30);
  const stop = A.stop || (big ? 8 : 4); v.freeze = stop; if (att && !area) att.freeze = stop;
  if (big) {
    v.whiteT = 5; W.shake = Math.max(W.shake, A.launch ? 7 : 5);
    addPart('burst', v.x - dir * 4, v.y + clamp((A.hy ? (A.hy[0] + A.hy[1]) / 2 : 46), 26, 66) * (v.def.size || 1), v.z + 2, { word: pick(['砰！', '啪！', '碰！', '咚！']), r: 32 + Math.min(14, dmg * 0.2), col: A.freeze ? '#cdeeff' : '#fff27a' });
  }
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
/* after-images: kept while flying after a big hit, while dashing in a special move, and while rolling */
function trackGhosts(f) {
  if (f.whiteT > 0) f.whiteT--; if (f.auraT > 0) f.auraT--;
  const fast = (f.state === 'fall' && f.y > 4 && Math.abs(f.vx) > 3.2) || (f.state === 'skill' && Math.abs(f.vx) > 4.5) || (f.state === 'run' && f.superT > 0);
  if (!f.ghosts) f.ghosts = [];
  if (fast && W.t % 3 === 0 && f.lastPose) { f.ghosts.push({ x: f.x, y: f.y, z: f.z, face: f.face, P: f.lastPose, life: 12 }); if (f.ghosts.length > 3) f.ghosts.shift(); }
  for (const g of f.ghosts) g.life--; while (f.ghosts.length && f.ghosts[0].life <= 0) f.ghosts.shift();
}
function knock(v, dir, kb, kbY) {
  v.set('fall'); v.vx = dir * kb; v.vy = kbY; v.y = Math.max(v.y, 1); v.face = -dir; v.fallMeter = 0; v.bounced = false; v.invisible = false;
  if (v.hold) v.dropItem();
}
/* Items: weapons are swung (and thrown while running), throwables are thrown with attack, food is eaten. */
const ITEMS = {
  stick: { name: '木棍', type: 'weapon', dur: 10, chip: '#b07a3d' },
  umbrella: { name: '雨傘', type: 'weapon', dur: 14, reach: 1.15, shield: true, chip: '#3fa9ff' },
  stone: { name: '石頭', type: 'throw', dmg: 45, breaks: true, speed: 8.5, vy: 3.5 },
  slipper: { name: '拖鞋', type: 'throw', dmg: 20, launch: false, stun: 26, dur: 5, speed: 11, vy: 2, chip: '#3fa9ff' },
  cracker: { name: '鞭炮', type: 'throw', explode: true, speed: 7, vy: 5 },
  milk: { name: '珍珠奶茶', type: 'food', hp: 2.6, mp: 0.8 },
  juice: { name: '冬瓜茶', type: 'food', hp: 0.6, mp: 4.5 },
  chicken: { name: '雞排', type: 'food', hp: 4.6, mp: 0.6, time: 60 }
};
/* firecrackers pop a few times, then burst and knock everyone nearby over */
function explode(it) {
  const i = W.items.indexOf(it); if (i >= 0) W.items.splice(i, 1);
  for (let k = 0; k < 4; k++) setTimeout(() => Sound.play('pop'), k * 70);
  Sound.play('heavy'); W.shake = Math.max(W.shake, 8);
  for (let k = 0; k < 18; k++) addPart('spark', it.x + rnd(-40, 40), rnd(5, 50), it.z + rnd(-14, 14), { col: pick(['#ffcc33', '#ff5a4a', '#fff6b0']) });
  addPart('ring', it.x, 0, it.z, { r: 8, grow: 5, life: 16 });
  for (const v of W.fighters) {
    if (v.dead) continue;
    if (Math.abs(v.x - it.x) > 75 || Math.abs(v.z - it.z) > 34 || v.y > 60) continue;
    applyHit(it.owner || null, v, { dmg: 36, kb: 4, kbY: 6, launch: true, sfx: 'heavy', unblock: true }, sgn(v.x - it.x || 1), true);
  }
}
function breakItem(it) {
  const i = W.items.indexOf(it); if (i >= 0) W.items.splice(i, 1);
  for (let k = 0; k < 6; k++) addPart('rock', it.x, it.y + 30, it.z, { vx: rnd(-3, 3), vy: rnd(2, 5), col: ITEMS[it.kind].chip || '#9a9aa8', r: 3 });
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
    if (p.boomer) { if (p.t === 30) { p.vx = -p.vx; p.hit.clear(); } if (p.t > 30 && p.owner && Math.abs(p.x - p.owner.x) < 20) dead = true; }
    if (p.kind === 'tornado' && p.t % 2 === 0) addPart('wind', p.x + rnd(-10, 10), rnd(5, 60), p.z, { vy: 1.5 });
    if (p.kind === 'bolt' && p.t % 2 === 0) addPart('zap', p.x, p.y, p.z, {});
    if (p.kind === 'bun' && p.y <= 0) { dead = true; addPart('dust', p.x, 0, p.z, {}); Sound.play('land', 0.4); }
    if (p.kind === 'ink' && p.t % 3 === 0) addPart('smoke', p.x - p.vx, p.y, p.z, { col: 'ink', life: 14 });
    if (p.kind === 'rock' && p.y <= 0) { dead = true; W.shake = 4; Sound.play('fall', 0.6); for (let k = 0; k < 8; k++) addPart('rock', p.x, 4, p.z, { vx: rnd(-3, 3), vy: rnd(2, 5) }); }
    // projectiles cancel each other
    if (!dead && (p.kind === 'fire' || p.kind === 'ice' || p.kind === 'star' || p.kind === 'arrow' || p.kind === 'fruit')) {
      for (const q of W.projs) if (q !== p && q.team !== p.team && !q.dead && (q.kind === 'fire' || q.kind === 'ice' || q.kind === 'star' || q.kind === 'arrow' || q.kind === 'fruit') && Math.abs(q.x - p.x) < p.r + q.r && Math.abs(q.z - p.z) < 14 && Math.abs(q.y - p.y) < 24) {
        q.dead = true; dead = true; smoke({ x: p.x, z: p.z }); Sound.play('block');
      }
    }
    if (!dead) for (const v of W.fighters) {
      if (v.team === p.team || v.dead || p.hit.has(v)) continue;
      if (p.cool && p.cool.has(v) && p.t - p.cool.get(v) < 10) continue;
      if (Math.abs(v.z - p.z) > 15 || Math.abs(v.x - p.x) > p.r + 12 * (v.def.size || 1)) continue;
      if (p.ground ? v.y > 24 : (p.y < v.y - 6 || p.y > v.y + 76 * (v.def.size || 1))) continue;
      if (v.state === 'lying' || v.invul > 0 || v.invisible) continue;
      const ok = applyHit(p.owner, v, p, sgn(p.vx), true); p.hit.add(v);
      if (p.multi) { p.hit.delete(v); (p.cool || (p.cool = new Map())).set(v, p.t); if (ok) { p.multi--; if (p.lift && v.y < 30 && v.state !== 'fall') { v.vy = 4; v.y = Math.max(v.y, 1); v.set('hurt'); v.stun = 18; } } if (p.multi > 0) continue; }
      if (ok && p.kind !== 'spikes' && !p.multi && !p.boomer) { dead = true; if (p.kind === 'fire') for (let k = 0; k < 10; k++) addPart('fire', p.x, p.y, p.z, { vx: rnd(-3, 3), vy: rnd(-2, 3) }); break; }
    }
    if (dead || p.dead) W.projs.splice(i, 1);
  }
}
function updateItems() {
  for (let i = W.items.length - 1; i >= 0; i--) {
    const it = W.items[i];
    if (it.holder) { if (it.holder.dead) it.holder.dropItem(); continue; }
    if (it.fuse > 0) { if (it.fuse % 4 === 0) addPart('spark', it.x, 10, it.z, { col: '#ffcc33' }); if (--it.fuse === 0) explode(it); continue; }
    if (it.drop && it.y > 0) { it.vy -= 0.25; it.y += it.vy; if (it.y <= 0) { it.y = 0; it.vy = 0; it.drop = false; Sound.play('land', 0.5); addPart('dust', it.x, 0, it.z, {}); } continue; }
    if (it.fly) {
      it.vy -= 0.22; it.x += it.vx; it.y += it.vy; it.z = clamp(it.z + it.vz, 4, FLOOR_D - 4); it.spin += 0.4 * sgn(it.vx);
      for (const v of W.fighters) {
        if (v.team === it.team || v.dead || it.hit.has(v) || v.invul > 0 || v.state === 'lying') continue;
        if (Math.abs(v.z - it.z) > 15 || Math.abs(v.x - it.x) > 22 || it.y < v.y - 4 || it.y > v.y + 76) continue;
        it.hit.add(v);
        const T = ITEMS[it.kind];
        if (T.explode) { explode(it); it.gone = true; break; }
        applyHit(it.owner, v, { dmg: T.dmg || 32, kb: T.launch === false ? 2 : 4, kbY: 5, launch: T.launch !== false, stun: T.stun, fall: T.launch === false ? 40 : undefined, sfx: T.launch === false ? 'hit' : 'heavy' }, sgn(it.vx), true);
        it.vx *= -0.3; it.vy = 3;                                // bounce off and land, so it can be picked up again
        break;
      }
      if (it.gone) continue;
      if (it.y <= 0) {
        it.y = 0;
        if (ITEMS[it.kind].explode) { it.fly = false; it.vx = it.vy = it.vz = 0; it.fuse = 26; continue; }
        it.fly = false; it.vx = 0; it.vy = 0; it.vz = 0; it.spin = 0; Sound.play('land', 0.5);
      }
      if (it.x < W.minX + 10 || it.x > W.maxX - 10) { it.x = clamp(it.x, W.minX + 10, W.maxX - 10); it.vx *= -0.3; }   // bounce off the edges of the area
    }
  }
}
function spawnItem(kind, x, z, fromSky) {
  W.items.push({ kind, x, z, y: fromSky ? 420 : 0, vx: 0, vy: 0, vz: 0, drop: !!fromSky, dur: ITEMS[kind].dur || 1, holder: null, fly: false, spin: 0 });
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


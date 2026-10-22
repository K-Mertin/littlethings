'use strict';
// 關卡：每關由一串「敵機波次」組成，最後出現頭目
const STAGES = [
  { name: '綠野河谷', en: 'GREEN VALLEY', boss: 'boss1',
    seq: ['droneL', 'droneR', 'tanks3', 'carrierP', 'fDown', 'chop2', 'droneW', 'fSwoopL', 'fSwoopR', 'boats', 'carrierS', 'tanks3', 'fDive', 'trucks', 'chop3', 'carrierP', 'bomber', 'droneL', 'fSine', 'tanks3', 'carrierB', 'fDown', 'droneW'] },
  { name: '碧海艦隊', en: 'BLUE FLEET', boss: 'boss2',
    seq: ['fDown', 'boats', 'droneL', 'carrierP', 'cruiser', 'fSwoopL', 'fSwoopR', 'chop2', 'boats', 'carrierS', 'droneW', 'fDive', 'cruiser', 'chop3', 'carrierP', 'bomber', 'fSine', 'boats', 'carrierB', 'fDown', 'droneW', 'chop2'] },
  { name: '鋼鐵都市', en: 'STEEL CITY', boss: 'boss3',
    seq: ['droneW', 'tanks3', 'fDown', 'carrierP', 'jetsUp', 'chop2', 'trucks', 'fSwoopL', 'fSwoopR', 'tanks3', 'carrierS', 'chop3', 'jetsUp', 'fDive', 'bomber', 'carrierP', 'fSine', 'tanks3', 'droneW', 'carrierB', 'jetsUp', 'chop3', 'fDown'] },
  { name: '黃沙要塞', en: 'SAND FORTRESS', boss: 'boss4',
    seq: ['fDown', 'tanks3', 'chop2', 'carrierP', 'fSwoopL', 'fSwoopR', 'tanks3', 'jetsUp', 'bomber', 'carrierS', 'droneW', 'fDive', 'tanks3', 'chop3', 'carrierP', 'fSine', 'jetsUp', 'tanks3', 'carrierB', 'bomber', 'fDown', 'chop3'] },
  { name: '雲端決戰', en: 'ABOVE THE CLOUDS', boss: 'boss5',
    seq: ['droneW', 'fDown', 'fSwoopL', 'fSwoopR', 'carrierP', 'chop3', 'jetsUp', 'fDive', 'bomber', 'carrierS', 'droneW', 'fSine', 'fDown', 'chop3', 'carrierP', 'jetsUp', 'fSwoopL', 'fSwoopR', 'bomber', 'carrierB', 'fDive', 'droneW'] },
];

function groundX(pref, kind) {
  const v = -30 - H - G.scroll;
  return Terrain.findX(pref, v, kind);
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }

const WAVES = {
  droneL: q => { for (let i = 0; i < 6; i++) q(i * 0.22, () => spawn('drone', 110, -14, { amp: 70 })); return 2.6; },
  droneR: q => { for (let i = 0; i < 6; i++) q(i * 0.22, () => spawn('drone', 250, -14, { amp: 70, ph: Math.PI })); return 2.6; },
  droneW: q => { for (let i = 0; i < 5; i++) { q(i * 0.25, () => spawn('drone', 90, -14, { amp: 55 })); q(i * 0.25, () => spawn('drone', 270, -14, { amp: 55, ph: Math.PI })); } return 3; },
  fDown: q => { shuffle([50, 115, 180, 245, 310]).forEach((x, i) => q(i * 0.28, () => spawn('fighter', x, -16, { path: 'down' }))); return 2.4; },
  fSwoopL: q => { for (let i = 0; i < 5; i++) q(i * 0.3, () => spawn('fighter', 36, -16, { path: 'swoop', dir: 1 })); return 2.8; },
  fSwoopR: q => { for (let i = 0; i < 5; i++) q(i * 0.3, () => spawn('fighter', 324, -16, { path: 'swoop', dir: -1 })); return 2.8; },
  fDive: q => { [70, 290, 130, 230].forEach((x, i) => q(i * 0.55, () => spawn('fighter', x, -16, { path: 'dive', stop: rnd(110, 200) }))); return 3.4; },
  fSine: q => { for (let i = 0; i < 4; i++) { q(i * 0.4, () => spawn('fighter', 110, -16, { path: 'sine', amp: 40 })); q(i * 0.4 + 0.2, () => spawn('fighter', 250, -16, { path: 'sine', amp: 40 })); } return 3; },
  chop2: q => { q(0, () => spawn('chopper', 110, -20)); q(0.5, () => spawn('chopper', 250, -20)); return 4; },
  chop3: q => { [70, 180, 290].forEach((x, i) => q(i * 0.6, () => spawn('chopper', x, -20, { stop: 110 + i * 40 }))); return 4.6; },
  tanks3: q => {
    shuffle([rnd(40, 120), rnd(140, 220), rnd(240, 320)]).forEach((x, i) => q(i * 0.5, () => {
      const road = G.stage === 2;
      let gx = groundX(x, road ? 'road' : 'land');
      if (gx === null) gx = groundX(x, 'land');
      if (gx !== null) spawn('tank', gx, -30, { vy: road ? 24 : rnd(4, 16) });
    }));
    return 3;
  },
  boats: q => {
    const n = G.stage === 0 ? 2 : 3;
    for (let i = 0; i < n; i++) q(i * 0.7, () => { const x = groundX(rnd(60, 300), 'water'); if (x !== null) spawn('boat', x, -30); });
    return 3;
  },
  cruiser: q => { q(0, () => { const x = groundX(rnd(120, 240), 'water'); if (x !== null) spawn('cruiser', x, -100); }); return 6; },
  trucks: q => {
    for (let i = 0; i < 3; i++) q(i * 0.45, () => { const gx = groundX(180, 'road'); if (gx !== null) spawn('truck', gx, -20); });
    return 3;
  },
  jetsUp: q => {
    if (G.diff === 'easy') return WAVES.fSine(q);
    for (let i = 0; i < 3; i++) q(i * 0.5, () => spawn('jet', clamp(P.x + rnd(-50, 50), 40, W - 40), H + 30));
    return 3;
  },
  carrierP: q => { q(0, () => spawn('carrier', rnd(90, 270), -20, { drop: 'P' })); return 2; },
  carrierS: q => { q(0, () => spawn('carrier', rnd(90, 270), -20, { drop: 'S' })); return 2; },
  carrierB: q => { q(0, () => spawn('carrier', rnd(90, 270), -20, { drop: 'B' })); return 2; },
  bomber: q => { q(0, () => spawn('bomber', 180, -60)); return 9; },
};

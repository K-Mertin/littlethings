// MW 大街的場景：商店街、MW 遊戲大廳大樓（外觀＋室內）、機台
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, mbox, mplane, mat4, pbr, std, canvasTex, FONT, SERIF, roundRect, fitText, rand, pick, TAU } from './kit.js';
import { STREET, PARTY, ZONES } from './games.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ layout (meters)
export const L = {
  streetHalf: 8,        // shop fronts at x = ±8
  shopZ0: 6, shopZ1: 70, // shops along the street
  gateZ: 62,            // 牌樓
  startZ: 65,           // player start
  endZ: 67.5,           // can't go further than this
  plazaHalf: 15,
  hallFront: -2, hallBack: -30, hallHalf: 15, hallCeil: 6,
  ground: 4.4, floor: 3.3,
};

const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loadGLB = (url) => new Promise((res, rej) => gl.load(url, (g) => res(g.scene), undefined, rej));

// ------------------------------------------------------------------ shops
const SHOPS = [
  { id: 'coffee', zh: '小島咖啡', en: 'ISLAND COFFEE', bg: '#1f4d3a', fg: '#f4ead5', awn: ['#1f4d3a', '#f4ead5'], wall: '#7a5a43' },
  { id: 'tea', zh: '珍珠奶茶', en: 'BUBBLE TEA', bg: '#f2c14e', fg: '#4a2c12', awn: ['#f2c14e', '#fff6dc'], wall: '#f8e9c8' },
  { id: 'books', zh: '好讀書店', en: 'BOOKSTORE', bg: '#22313f', fg: '#ffffff', awn: ['#22313f', '#d8dde3'], wall: '#d9c7a5' },
  { id: 'bakery', zh: '麵包香', en: 'BAKERY', bg: '#b5562b', fg: '#fff3e0', awn: ['#b5562b', '#fff3e0'], wall: '#f3dfc3' },
  { id: 'flowers', zh: '花見花店', en: 'FLOWERS', bg: '#f7f3ee', fg: '#c2185b', awn: ['#7cb342', '#f7f3ee'], wall: '#eef5e6' },
  { id: 'ice', zh: '大街剉冰', en: 'SHAVED ICE', bg: '#3fa7d6', fg: '#ffffff', awn: ['#3fa7d6', '#ffffff'], wall: '#dff3fb' },
  { id: 'toys', zh: '玩具屋', en: 'TOY HOUSE', bg: '#e53935', fg: '#fff59d', awn: ['#e53935', '#fff59d'], wall: '#fff3d6' },
  { id: 'stationery', zh: '文具小舖', en: 'STATIONERY', bg: '#5c6bc0', fg: '#ffffff', awn: ['#5c6bc0', '#eceff9'], wall: '#f1f2fa' },
  { id: 'noodles', zh: '牛肉麵', en: 'BEEF NOODLES', bg: '#8e1b1b', fg: '#ffe082', awn: ['#8e1b1b', '#ffe9b0'], wall: '#e9d4b2' },
  { id: 'records', zh: '大街唱片行', en: 'RECORDS', bg: '#111111', fg: '#ff4fa3', awn: ['#222222', '#ff4fa3'], wall: '#2b2b33' },
  { id: 'sports', zh: '運動用品', en: 'SPORTS', bg: '#00897b', fg: '#ffffff', awn: ['#00897b', '#e0f2f1'], wall: '#e7f0ef' },
  { id: 'mart', zh: '大街超商', en: '24H MART', bg: '#ffffff', fg: '#e65100', awn: ['#ff8f00', '#ffffff'], wall: '#fbfbfb' },
];
const VSIGNS = ['牙醫診所', '補習班', '美語教室', '眼鏡行', '鐘錶行', '照相館', '中醫診所', '旅行社', '理髮廳', '手機館', '鋼琴教室', '早餐店'];
const VSIGN_COL = [['#c62828', '#fff'], ['#1565c0', '#fff'], ['#ffffff', '#c62828'], ['#2e7d32', '#fff'], ['#f9a825', '#3e2723'], ['#4527a0', '#fff']];

function drawInterior(g, w, h, s) {
  // back wall
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, s.wall); grd.addColorStop(1, shade(s.wall, -0.25));
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // ceiling lights glow
  for (let i = 0; i < 4; i++) {
    const x = w * (0.15 + i * 0.23);
    const rg = g.createRadialGradient(x, 0, 2, x, 0, 120); rg.addColorStop(0, 'rgba(255,240,210,.9)'); rg.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = rg; g.fillRect(x - 120, 0, 240, 120);
  }
  const shelf = (y, col) => { g.fillStyle = col; g.fillRect(20, y, w - 40, 8); };
  const r = rand;
  const items = {
    books: () => { for (let row = 0; row < 4; row++) { const y = 40 + row * 50; shelf(y + 40, '#5d4037'); let x = 24; while (x < w - 30) { const bw = 6 + r() * 8; g.fillStyle = `hsl(${r() * 360},45%,${35 + r() * 25}%)`; g.fillRect(x, y + 40 - (24 + r() * 14), bw, 24 + r() * 14); x += bw + 1; } } },
    bakery: () => { for (let row = 0; row < 3; row++) { const y = 70 + row * 55; shelf(y + 22, '#8d6e63'); for (let x = 40; x < w - 40; x += 34) { g.fillStyle = `hsl(${28 + r() * 10},${60 + r() * 20}%,${40 + r() * 20}%)`; g.beginPath(); g.ellipse(x, y + 12, 14, 9, 0, 0, TAU); g.fill(); } } },
    flowers: () => { for (let k = 0; k < 160; k++) { const x = 20 + r() * (w - 40), y = 90 + r() * (h - 110); g.fillStyle = pick(['#e91e63', '#ffeb3b', '#ff7043', '#ab47bc', '#ffffff', '#f48fb1']); g.beginPath(); g.arc(x, y, 4 + r() * 6, 0, TAU); g.fill(); } g.fillStyle = 'rgba(76,175,80,.55)'; g.fillRect(0, h - 70, w, 70); },
    coffee: () => { g.fillStyle = '#3e2723'; g.fillRect(0, h - 90, w, 90); g.fillStyle = '#212121'; roundRect(g, w * 0.55, 30, w * 0.35, 80, 6); g.fill(); g.fillStyle = '#fff'; g.font = `700 16px ${FONT}`; ['拿鐵 70', '美式 60', '可可 65'].forEach((t, i) => g.fillText(t, w * 0.58, 58 + i * 20)); for (let x = 40; x < w * 0.5; x += 30) { g.fillStyle = '#fafafa'; g.fillRect(x, h - 110, 16, 20); } },
    tea: () => { g.fillStyle = '#6d4c41'; g.fillRect(0, h - 80, w, 80); for (let x = 30; x < w - 30; x += 26) { g.fillStyle = pick(['#d7b48a', '#f5deb3', '#c8a27a', '#ffcc80']); g.fillRect(x, h - 118, 16, 34); g.fillStyle = '#3e2723'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + 4 + k * 3, h - 90, 2.2, 0, TAU); g.fill(); } } g.fillStyle = '#4a2c12'; g.font = `900 30px ${FONT}`; g.fillText('珍奶 55', 30, 60); },
    ice: () => { g.fillStyle = '#90caf9'; g.fillRect(0, h - 80, w, 80); for (let x = 40; x < w - 40; x += 46) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, h - 110, 16, Math.PI, 0); g.fill(); g.fillStyle = pick(['#e57373', '#81c784', '#ffd54f', '#ba68c8']); g.beginPath(); g.arc(x, h - 116, 9, 0, TAU); g.fill(); } g.fillStyle = '#0d47a1'; g.font = `900 30px ${FONT}`; g.fillText('冰 · ICE', 30, 60); },
    toys: () => { for (let row = 0; row < 3; row++) { const y = 60 + row * 60; shelf(y + 30, '#ef5350'); for (let x = 36; x < w - 36; x += 30) { g.fillStyle = `hsl(${r() * 360},75%,55%)`; if (r() < .5) { g.beginPath(); g.arc(x, y + 18, 11, 0, TAU); g.fill(); } else g.fillRect(x - 10, y + 6, 20, 24); } } },
    stationery: () => { for (let row = 0; row < 4; row++) { const y = 40 + row * 48; shelf(y + 34, '#9fa8da'); for (let x = 26; x < w - 26; x += 9) { g.fillStyle = `hsl(${r() * 360},70%,55%)`; g.fillRect(x, y + 6, 5, 28); } } },
    noodles: () => { g.fillStyle = '#5d4037'; g.fillRect(0, h - 70, w, 70); for (let x = 50; x < w - 50; x += 80) { g.fillStyle = '#8d6e63'; g.fillRect(x - 30, h - 95, 60, 25); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, h - 100, 18, 7, 0, 0, TAU); g.fill(); } g.fillStyle = '#c62828'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(60 + i * 90, 30, 14, 18, 0, 0, TAU); g.fill(); } },
    records: () => { for (let row = 0; row < 3; row++) { const y = 60 + row * 60; shelf(y + 40, '#ff4fa3'); for (let x = 26; x < w - 26; x += 22) { g.fillStyle = `hsl(${r() * 360},60%,${30 + r() * 30}%)`; g.fillRect(x, y, 18, 40); } } },
    sports: () => { for (let x = 40; x < w - 40; x += 60) { g.fillStyle = pick(['#ff7043', '#fff', '#1e88e5']); g.beginPath(); g.arc(x, h - 60, 18, 0, TAU); g.fill(); } for (let x = 30; x < w - 30; x += 40) { g.fillStyle = `hsl(${r() * 360},60%,50%)`; g.fillRect(x, 50, 26, 70); } },
    mart: () => { for (let row = 0; row < 4; row++) { const y = 40 + row * 48; shelf(y + 34, '#b0bec5'); for (let x = 24; x < w - 24; x += 14) { g.fillStyle = `hsl(${r() * 360},70%,${45 + r() * 20}%)`; g.fillRect(x, y + 10 + r() * 6, 10, 24); } } },
  };
  (items[s.id] || items.mart)();
  // floor reflection / depth darkening at the bottom
  const fg = g.createLinearGradient(0, h * 0.75, 0, h); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = fg; g.fillRect(0, 0, w, h);
}
function shade(hex, k) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k))); return '#' + c.getHexString();
}

// window glass with a hint of curtains / rooms behind
function windowTex(seed) {
  return canvasTex(128, 192, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, w, h); sky.addColorStop(0, '#8fa6b8'); sky.addColorStop(0.5, '#3c4b58'); sky.addColorStop(1, '#1e262e');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const cur = ['#e8dcc4', '#c9d6c5', '#e3c7c0', '#d8d8e8', '#f2e6b8'][seed % 5];
    if (seed % 3 !== 0) { g.fillStyle = cur; g.globalAlpha = .55; g.fillRect(0, 0, w * (0.25 + (seed % 4) * 0.1), h); g.fillRect(w * 0.8, 0, w * 0.2, h); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(w * .1, h); g.lineTo(w * .45, 0); g.lineTo(w * .6, 0); g.lineTo(w * .25, h); g.fill();
  });
}

// ------------------------------------------------------------------ the builder
export async function buildWorld(scene, opts) {
  const { shots, quality } = opts;
  const root = new THREE.Group(); scene.add(root);
  const B = new Batch();
  const colliders = [];   // {x0,x1,z0,z1,y0,y1,cam}
  const interact = [];
  const animated = [];
  const solid = (x0, x1, z0, z1, y0 = 0, y1 = 3, cam = true) => colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, cam });

  // ---------------- materials
  const M = {
    paving: pbr('paving', { tile: 2.4, env: .5 }),
    paving2: pbr('paving2', { tile: 1.6, color: 0xd8d8d8, env: .5 }),
    brick: pbr('brick', { tile: 1.6, env: .4 }),
    brick2: pbr('brick2', { tile: 1.6, env: .4 }),
    concrete: pbr('concrete', { tile: 3, env: .5 }),
    concrete2: pbr('concrete2', { tile: 3, env: .5 }),
    curb: pbr('concrete2', { tile: 1, color: 0xb9b9b9 }),
    facade: pbr('facade', { tile: 9, env: .6, rough: .9 }),
    carpet: pbr('carpet', { tile: 2.2, env: .15, color: 0xb0b0b0 }),
    tiles: pbr('tiles', { tile: 1.2, env: .35, rough: .55 }),
    checker: pbr('checker', { tile: 1.6, env: .4, rough: .5 }),
    hallPanel: pbr('concrete2', { tile: 4, color: 0x5a616c, rough: .5, metal: .4, env: .9 }),
    hallWallIn: pbr('plaster', { tile: 3, color: 0x2a2734, env: .15 }),
    ceiling: std(0x15141b, .9, 0, { envMapIntensity: .05 }),
    darkMetal: std(0x22252b, .45, .6),
    steel: std(0x9aa1a8, .3, .9),
    blackPlastic: std(0x111114, .45, 0, { envMapIntensity: .3 }),
    wood: std(0x8a5a35, .7),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fb4c2, roughness: .05, metalness: .1, transparent: true, opacity: .22, envMapIntensity: 1.4, depthWrite: false }),
    shopGlass: new THREE.MeshStandardMaterial({ color: 0xbcd0dc, roughness: .04, metalness: .1, transparent: true, opacity: .16, envMapIntensity: 1.6, depthWrite: false }),
    frame: std(0x2e2e2e, .5, .5),
    whiteFrame: std(0xe8e8e8, .5, .1),
    trunk: std(0x5b4636, .9),
    soil: std(0x3b2e22, 1),
    lampHead: std(0xfff4d6, .4, 0, { emissive: 0xffe2a8, emissiveIntensity: .6 }),
    ac: std(0xdedede, .6, .1),
    redPillar: std(0xa52a1e, .55),
    gold: std(0xd4a640, .35, .8),
    roofTile: std(0x3d4a3a, .8),
  };
  const plasterCol = [0xf1e6d2, 0xe9d6cc, 0xdde4d6, 0xf4f1ea, 0xe6dccb, 0xd9dfe6, 0xf0d9b5];
  const plasterMats = plasterCol.map((c) => pbr('plaster', { tile: 3, color: c, env: .4 }));
  const wallMats = [M.brick, M.brick2, M.concrete, ...plasterMats];

  // ---------------- ground
  const ground = new THREE.Mesh(mplane(120, 140), M.paving2); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 30); ground.receiveShadow = true;
  // world uv for the ground (plane uv in meters already)
  root.add(ground);
  const center = new THREE.Mesh(mplane(9, L.endZ + 12 - L.shopZ0), M.paving); center.rotation.x = -Math.PI / 2;
  center.position.set(0, 0.003, (L.endZ + 12 + L.shopZ0) / 2); center.receiveShadow = true; root.add(center);
  // drain lines along the center paving
  for (const sx of [-4.6, 4.6]) B.add(mbox(0.18, 0.02, L.endZ + 12 - L.shopZ0), M.darkMetal, mat4(sx, 0.006, (L.endZ + 12 + L.shopZ0) / 2), { noCast: true });
  // plaza
  const plaza = new THREE.Mesh(mplane(30, 8.4), M.paving); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.003, 1.9); plaza.receiveShadow = true; root.add(plaza);

  // ---------------- shop buildings along the street
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  await fonts;
  const blocks = [];
  let si = 0, vi = 0;
  for (const side of [-1, 1]) {
    let z = L.shopZ0;
    while (z < L.shopZ1 + 10) {
      const w = pick([8.5, 9, 9.5, 10, 10.5]);
      blocks.push({ side, z0: z, z1: z + w, shop: SHOPS[si++ % SHOPS.length], floors: 2 + Math.floor(rand() * 3), wall: pick(wallMats), vsign: rand() < 0.55 ? VSIGNS[vi++ % VSIGNS.length] : null });
      z += w;
    }
  }
  {
    const inner = (s) => blocks.filter((b) => b.side === s && b.z1 <= L.gateZ - 0.5 && b.z0 >= L.shopZ0).sort((a, b) => b.z0 - a.z0);
    const Lb = inner(-1), Rb = inner(1), order = [];
    for (let k = 0; k < Math.max(Lb.length, Rb.length); k++) { if (Rb[k]) order.push(Rb[k]); if (Lb[k]) order.push(Lb[k]); }
    STREET.forEach((g, k) => { if (order[k]) { order[k].game = g; order[k].vsign = null; } });
  }
  const winTexs = [0, 1, 2, 3, 4, 5].map(windowTex);
  const winMats = winTexs.map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: .08, metalness: .2, envMapIntensity: 1.3 }));

  // ---- 可以進去玩的店：門框霓虹燈、伸出來的「進來玩」圓形燈牌、門口地上會呼吸的光圈＋箭頭
  const playSignTex = canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.arc(w / 2, h / 2, 236, 0, Math.PI * 2); g.fillStyle = '#14121c'; g.fill();
    g.lineWidth = 22; g.strokeStyle = '#ffffff'; g.shadowColor = '#ffffff'; g.shadowBlur = 24; g.stroke();
    g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.beginPath(); g.moveTo(205, 120); g.lineTo(205, 230); g.lineTo(300, 175); g.closePath(); g.fill();
    g.font = `900 104px ${FONT}`; g.fillText('進來玩', w / 2, 318);
    g.font = `700 54px "Silkscreen", ${FONT}`; g.fillText('PLAY', w / 2, 400);
  });
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const rg = g.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 124);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(.72, 'rgba(255,255,255,.95)'); rg.addColorStop(.82, 'rgba(255,255,255,.25)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.95)';
    for (const y of [40, 88]) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + 34, y + 34); g.lineTo(w / 2 + 18, y + 34); g.lineTo(w / 2, y + 16); g.lineTo(w / 2 - 18, y + 34); g.lineTo(w / 2 - 34, y + 34); g.closePath(); g.fill(); }
  });
  const neonOf = (s) => { const c = new THREE.Color(s.neon || s.bg); const hsl = {}; c.getHSL(hsl); if (hsl.s < 0.2 || hsl.l < 0.12) { c.set(s.fg); c.getHSL(hsl); } c.setHSL(hsl.h, Math.max(hsl.s, 0.85), 0.55); return c; };
  function playableMarks(b, base, W, iw, s) {
    const neon = neonOf(s);
    const nm = std(0x000000, .4, 0, { emissive: neon.getHex(), emissiveIntensity: 4 });
    const put = (geo, mat, x, y, z, o = {}) => B.add(geo, mat, base.clone().multiply(mat4(x, y, z, o.ry || 0, o.rx || 0, o.rz || 0)), o);
    // neon door frame around the glass
    const gh = L.ground - 1.0;
    put(mbox(iw + 0.14, 0.11, 0.1), nm, 0, gh + 0.07, -0.05, { noShadow: true });
    put(mbox(0.11, gh, 0.1), nm, -iw / 2 - 0.03, gh / 2, -0.05, { noShadow: true });
    put(mbox(0.11, gh, 0.1), nm, iw / 2 + 0.03, gh / 2, -0.05, { noShadow: true });
    // light strip under the sign board
    put(mbox(Math.min(W - 1.6, 7), 0.05, 0.05), nm, 0, L.ground - 1.14, 0.2, { noShadow: true });
    // round "進來玩" blade sign sticking out of the facade, both faces, pulsing
    const sm = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: neon, emissiveMap: playSignTex, emissiveIntensity: 2.2, alphaMap: playSignTex, transparent: true, alphaTest: 0.05, roughness: .5 });
    const x = W / 2 - 0.85;
    for (const ry of [Math.PI / 2, -Math.PI / 2]) {   // two one-sided faces so the text reads correctly from both directions
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), sm);
      disc.applyMatrix4(base.clone().multiply(mat4(x + (ry > 0 ? 0.01 : -0.01), L.ground + 0.95, 0.95, ry))); root.add(disc);
    }
    put(mbox(0.05, 0.05, 0.95), M.darkMetal, x, L.ground + 1.85, 0.48);
    put(mbox(0.04, 0.12, 0.04), M.darkMetal, x, L.ground + 1.78, 0.95);
    // sidewalk A-frame board at eye level
    const boardTex = canvasTex(256, 384, (g, w, h) => {
      g.fillStyle = '#' + neon.getHexString(); g.fillRect(0, 0, w, h);
      g.fillStyle = '#14121c'; roundRect(g, 14, 14, w - 28, h - 28, 18); g.fill();
      g.fillStyle = '#' + neon.getHexString(); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.beginPath(); g.moveTo(98, 60); g.lineTo(98, 150); g.lineTo(176, 105); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.font = `900 58px ${FONT}`; g.fillText('進來玩', w / 2, 210);
      g.font = `700 30px "Silkscreen", ${FONT}`; g.fillStyle = '#' + neon.getHexString(); g.fillText('PLAY', w / 2, 262);
      g.fillStyle = '#ffffff'; const fs = fitText(g, s.zh, w - 50, 34, 700); g.font = `700 ${fs}px ${FONT}`; g.fillText(s.zh, w / 2, 318);
    });
    const bm = new THREE.MeshStandardMaterial({ map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: .55, roughness: .6, side: THREE.DoubleSide });
    const bx = -(iw / 2 - 0.55), bz = 1.0, bt = 0.2;
    for (const sgn of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.95), bm);
      m.applyMatrix4(base.clone().multiply(mat4(bx, 0.47, bz + sgn * 0.09, sgn > 0 ? 0 : Math.PI, sgn > 0 ? -bt : -bt)));
      m.castShadow = true; root.add(m);
    }
    { const p = new THREE.Vector3(bx, 0, bz).applyMatrix4(base); solid(p.x - 0.35, p.x + 0.35, p.z - 0.35, p.z + 0.35, 0, 1, false); }
    // glowing ring + arrows on the ground in front of the door
    const fm = new THREE.MeshBasicMaterial({ map: floorTex, color: neon.clone().multiplyScalar(1.4), transparent: true, opacity: .9, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), fm);
    ring.applyMatrix4(base.clone().multiply(mat4(0, 0.02, 1.15, 0, -Math.PI / 2))); root.add(ring);
    const ph = rand() * 6;
    animated.push((dt, t) => {
      const k = 0.5 + 0.5 * Math.sin(t * 2.6 + ph);
      sm.emissiveIntensity = 1.6 + 1.2 * k;
      fm.opacity = 0.55 + 0.45 * k;
    });
  }
  for (const b of blocks) buildShop(b);
  function buildShop(b) {
    const W = b.z1 - b.z0, cz = (b.z0 + b.z1) / 2;
    const H = L.ground + b.floors * L.floor, D = 12;
    // local frame: facade faces +z_local; world: left side faces +x
    const ry = b.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const fx = b.side * L.streetHalf;
    const base = new THREE.Matrix4().makeTranslation(fx, 0, cz).multiply(new THREE.Matrix4().makeRotationY(ry));
    const put = (geo, mat, x, y, z, o = {}) => B.add(geo, mat, base.clone().multiply(mat4(x, y, z, o.ry || 0, o.rx || 0, o.rz || 0)), o);
    // upper body
    put(mbox(W, H - L.ground, D), b.wall, 0, L.ground + (H - L.ground) / 2, -D / 2);
    // floor band between ground and upper floors
    put(mbox(W, 0.35, 0.25), M.concrete2, 0, L.ground + 0.1, 0.08);
    // cornice / parapet
    put(mbox(W, 0.5, 0.35), M.concrete2, 0, H + 0.25, 0.05);
    // ground floor: pillars + shop box
    put(mbox(0.6, L.ground, 0.7), b.wall, -W / 2 + 0.3, L.ground / 2, -0.1);
    put(mbox(0.6, L.ground, 0.7), b.wall, W / 2 - 0.3, L.ground / 2, -0.1);
    put(mbox(W, L.ground, D - 2.4), b.wall, 0, L.ground / 2, -2.4 - (D - 2.4) / 2, { noCast: true });
    solid(b.side < 0 ? fx - D : fx - 0.3, b.side < 0 ? fx + 0.3 : fx + D, b.z0, b.z1, 0, H, true);
    // shop interior (seen through the glass): floor, ceiling, side walls, painted back wall
    const iw = W - 1.2;
    const s = b.game ? { id: 'game', zh: b.game.title, en: b.game.en, ...b.game.shop } : b.shop;
    if (b.game) {
      // game shop: the back wall is a big screen showing the game, with the title above
      put(mplane(iw, L.ground - 0.6, false), std(shade(s.wall, -0.35), .9), 0, (L.ground - 0.6) / 2, -2.38, { noShadow: true });
      const sw = Math.min(iw - 1.0, 4.2), sh = sw * 9 / 16;
      put(mbox(sw + 0.16, sh + 0.16, 0.06), M.blackPlastic, 0, 1.95, -2.33, { noCast: true });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: shots[b.game.id], emissiveIntensity: 1.1, roughness: .25 }));
      scr.applyMatrix4(base.clone().multiply(mat4(0, 1.95, -2.29))); root.add(scr);
      // a small counter with two demo pads
      put(mbox(Math.min(iw - 1.4, 3), 0.9, 0.5), std(shade(s.bg, -0.05), .5, .1), 0, 0.45, -1.0);
      put(mbox(Math.min(iw - 1.4, 3) + 0.06, 0.04, 0.56), std(0xf2f2f2, .3), 0, 0.92, -1.0);
      const spot = new THREE.Vector3(0, 0, 1.5).applyMatrix4(base);
      const n = new THREE.Vector3(0, 0, 1).transformDirection(base);
      const focus = new THREE.Vector3(0, 1.95, -2.29).applyMatrix4(base);
      interact.push({ game: { ...b.game, zone: 'street' }, spot, face: Math.atan2(-n.x, -n.z), focus, normal: n, screen: scr, radius: 1.9, street: true, side: b.side });
      playableMarks(b, base, W, iw, s);
    } else {
      const intTex = canvasTex(512, 256, (g, w, h) => drawInterior(g, w, h, b.shop));
      const intMat = new THREE.MeshBasicMaterial({ map: intTex, color: 0xdddddd });
      put(mplane(iw, L.ground - 0.6, false), intMat, 0, (L.ground - 0.6) / 2, -2.38, { noShadow: true });
    }
    put(mbox(iw, 0.05, 2.3), M.tiles, 0, 0.0, -1.2, { noCast: true });
    put(mbox(iw, 0.05, 2.3), std(0xf5efe6, .9, 0, { emissive: 0xfff2d8, emissiveIntensity: .25 }), 0, L.ground - 0.6, -1.2, { noShadow: true });
    put(mbox(0.05, L.ground - 0.6, 2.3), std(shade(s.wall, -0.05), .9), -iw / 2, (L.ground - 0.6) / 2, -1.2, { noShadow: true });
    put(mbox(0.05, L.ground - 0.6, 2.3), std(shade(s.wall, -0.05), .9), iw / 2, (L.ground - 0.6) / 2, -1.2, { noShadow: true });
    // fascia above the glass + sign board
    put(mbox(W - 1.2, 0.6, 0.3), b.wall, 0, L.ground - 0.3, -0.15);
    const signTex = canvasTex(1024, 160, (g, w, h) => {
      g.fillStyle = s.bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = s.fg; g.globalAlpha = .35; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20); g.globalAlpha = 1;
      g.fillStyle = s.fg; g.textBaseline = 'middle';
      const zs = fitText(g, s.zh, w * 0.62, 96, 900, FONT); g.font = `900 ${zs}px ${FONT}`;
      const zw = g.measureText(s.zh).width;
      g.font = `700 34px ${FONT}`; const ew = g.measureText(s.en).width;
      const x0 = (w - zw - 30 - ew) / 2;
      g.font = `900 ${zs}px ${FONT}`; g.fillText(s.zh, x0, h / 2 + 4);
      g.font = `700 34px ${FONT}`; g.globalAlpha = .85; g.fillText(s.en, x0 + zw + 30, h / 2 + 8); g.globalAlpha = 1;
    });
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: .35, roughness: .5 });
    const signW = Math.min(W - 1.6, 7);
    put(mbox(signW + 0.1, 1.0, 0.18), M.frame, 0, L.ground - 0.62, 0.12);
    put(mplane(signW - 0.04, 0.88, false), signMat, 0, L.ground - 0.62, 0.215, { noShadow: true });
    // glass front with mullions and a door
    put(mplane(iw, L.ground - 1.0, false), M.shopGlass, 0, (L.ground - 1.0) / 2, -0.15, { noShadow: true });
    for (let k = 0; k <= 4; k++) put(mbox(0.07, L.ground - 1.0, 0.1), M.frame, -iw / 2 + k * iw / 4, (L.ground - 1.0) / 2, -0.15);
    put(mbox(iw, 0.08, 0.12), M.frame, 0, L.ground - 1.0, -0.15);
    put(mbox(iw, 0.25, 0.14), M.frame, 0, 0.12, -0.15);
    // awning (striped, tilted)
    const awnTex = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = s.awn[i % 2]; g.fillRect(i * w / 8, 0, w / 8, h); } g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, h - 6, w, 6); });
    awnTex.wrapS = THREE.RepeatWrapping; awnTex.repeat.set(Math.round(signW / 2), 1);
    const awnMat = new THREE.MeshStandardMaterial({ map: awnTex, roughness: .85, side: THREE.DoubleSide });
    const awnD = 1.3, awnT = 0.42;
    put(new THREE.PlaneGeometry(signW, awnD), awnMat, 0, L.ground - 1.35 - Math.sin(awnT) * awnD / 2, Math.cos(awnT) * awnD / 2, { rx: -Math.PI / 2 + awnT });
    put(new THREE.PlaneGeometry(signW, 0.22), awnMat, 0, L.ground - 1.35 - Math.sin(awnT) * awnD - 0.11, Math.cos(awnT) * awnD, { noCast: true });
    // upper floor windows
    const nWin = Math.max(2, Math.floor((W - 1) / 2.2));
    for (let f = 0; f < b.floors; f++) {
      const y = L.ground + f * L.floor + 1.55;
      for (let k = 0; k < nWin; k++) {
        const x = -W / 2 + (k + 0.5) * W / nWin;
        const ww = 1.25, wh = 1.55;
        put(mplane(ww, wh, false), winMats[(f * 3 + k + Math.floor(cz)) % winMats.length], x, y, 0.01, { noShadow: true });
        const fm = b.wall === M.brick || b.wall === M.brick2 ? M.whiteFrame : M.frame;
        put(mbox(ww + 0.12, 0.08, 0.12), fm, x, y + wh / 2, 0.04);
        put(mbox(ww + 0.26, 0.08, 0.22), M.concrete2, x, y - wh / 2 - 0.02, 0.09);
        put(mbox(0.07, wh, 0.12), fm, x - ww / 2, y, 0.04);
        put(mbox(0.07, wh, 0.12), fm, x + ww / 2, y, 0.04);
        put(mbox(0.05, wh, 0.08), fm, x, y, 0.03);
        // air conditioner under some windows (very Taiwan)
        if ((k + f + si) % 3 === 0) {
          put(mbox(0.8, 0.52, 0.36), M.ac, x + 0.1, y - wh / 2 - 0.45, 0.2);
          put(mbox(0.82, 0.04, 0.4), M.darkMetal, x + 0.1, y - wh / 2 - 0.73, 0.2);
        }
        // iron window guard on some floors
        if ((f + k) % 4 === 1) for (let r = 0; r < 6; r++) put(mbox(0.025, wh + 0.1, 0.025), M.darkMetal, x - ww / 2 + 0.1 + r * (ww - 0.2) / 5, y, 0.22);
        if ((f + k) % 4 === 1) { put(mbox(ww + 0.1, 0.03, 0.3), M.darkMetal, x, y - wh / 2, 0.12); put(mbox(ww + 0.1, 0.03, 0.3), M.darkMetal, x, y + wh / 2, 0.12); }
      }
    }
    // vertical sign (直立招牌)
    if (b.vsign) {
      const col = VSIGN_COL[vi % VSIGN_COL.length]; vi++;
      const t = canvasTex(128, 512, (g, w, h) => {
        g.fillStyle = col[0]; g.fillRect(0, 0, w, h); g.strokeStyle = col[1]; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
        g.fillStyle = col[1]; g.textAlign = 'center'; g.textBaseline = 'middle';
        const chars = [...b.vsign]; const step = (h - 40) / chars.length; const fs = Math.min(92, step * 0.82);
        g.font = `900 ${fs}px ${FONT}`; chars.forEach((c, i) => g.fillText(c, w / 2, 20 + step * (i + 0.5)));
      });
      const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .4, roughness: .5 });
      const h = Math.min(4.2, b.floors * L.floor - 0.6), x = (rand() < .5 ? -1 : 1) * (W / 2 - 0.9);
      const y = L.ground + 0.6 + h / 2;
      put(mbox(0.22, h + 0.1, 1.0), M.frame, x, y, 0.75);
      put(mplane(1.0 * 0.97, h, false), m, x - 0.115, y, 0.75, { ry: -Math.PI / 2, noShadow: true });
      put(mplane(1.0 * 0.97, h, false), m, x + 0.115, y, 0.75, { ry: Math.PI / 2, noShadow: true });
    }
  }

  // ---------------- distant skyline (fills the sky above the shop roofs)
  const skyline = [];
  for (const side of [-1, 1]) for (let z = -40; z < 100; z += 14 + rand() * 8) skyline.push({ x: side * (26 + rand() * 18), z, w: 12 + rand() * 10, d: 12 + rand() * 8, h: 22 + rand() * 30 });
  for (let x = -40; x <= 40; x += 16) skyline.push({ x: x + rand() * 4, z: -48 - rand() * 10, w: 14, d: 12, h: 30 + rand() * 25 });
  for (let x = -40; x <= 40; x += 16) skyline.push({ x: x + rand() * 4, z: 95 + rand() * 10, w: 14, d: 12, h: 26 + rand() * 25 });
  for (const s of skyline) B.add(mbox(s.w, s.h, s.d), M.facade, mat4(s.x, s.h / 2, s.z), { noCast: true });
  // backs of the shop rows (rooftops seen from the hall) – flat roofs with water tanks
  for (const b of blocks) {
    const H = L.ground + b.floors * L.floor;
    const x = b.side * (L.streetHalf + 6), cz = (b.z0 + b.z1) / 2;
    if (rand() < .45) { B.add(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12), M.steel, mat4(x + b.side * 2, H + 0.9, cz)); B.add(mbox(1.6, 0.3, 1.6), M.darkMetal, mat4(x + b.side * 2, H + 0.15, cz)); }
  }

  // ---------------- street furniture
  // lamps
  const lampZ = []; for (let z = 10; z < L.endZ; z += 11) lampZ.push(z);
  for (const z of lampZ) for (const sx of [-1, 1]) {
    const x = sx * 5.4;
    B.add(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 10), M.darkMetal, mat4(x, 2.3, z));
    B.add(new THREE.CylinderGeometry(0.16, 0.2, 0.35, 10), M.darkMetal, mat4(x, 0.17, z));
    B.add(mbox(0.06, 0.06, 0.9), M.darkMetal, mat4(x - sx * 0.4, 4.55, z, Math.PI / 2));
    B.add(new THREE.CylinderGeometry(0.26, 0.3, 0.22, 12), M.darkMetal, mat4(x - sx * 0.8, 4.5, z));
    B.add(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 12), M.lampHead, mat4(x - sx * 0.8, 4.38, z), { noShadow: true });
    solid(x - .15, x + .15, z - .15, z + .15, 0, 4.6, false);
  }
  // benches (wood slats + steel legs) + planters with small trees, along the middle
  const benchMat = std(0x9b6a43, .75);
  const leafMats = [std(0x4f7a2a, .85), std(0x5d8a33, .85), std(0x3f6b2a, .85), std(0x6e9a3a, .85)];
  // leaf-card canopy: many alpha-tested quads with normals pointing out of the crown (reads much softer than solid blobs)
  const leafTex = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#4b3a28'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .5, h); g.quadraticCurveTo(w * .45, h * .5, w * .5, h * .1); g.stroke();
    for (let i = 0; i < 70; i++) {
      const a = rand() * TAU, r = 20 + rand() * 95, x = w / 2 + Math.cos(a) * r * 0.9, y = h / 2 + Math.sin(a) * r * 0.85;
      g.save(); g.translate(x, y); g.rotate(rand() * TAU);
      const l = 36 + rand() * 16;
      g.fillStyle = `hsl(${88 + rand() * 30},${38 + rand() * 25}%,${22 + rand() * 22}%)`;
      g.beginPath(); g.ellipse(0, 0, l * 0.5, l * 0.2, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-l * .45, 0); g.lineTo(l * .45, 0); g.stroke();
      g.restore();
    }
  });
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: .8, envMapIntensity: .5 });
  const crownMat = std(0x2f4a1e, .9);
  function crown(cx, cy, cz, rad) {
    const pos = [], nrm = [], uv = [], q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), c = new THREE.Vector3(cx, cy, cz);
    const N = Math.round(46 * rad * rad);
    for (let i = 0; i < N; i++) {
      const u = rand() * 2 - 1, th = rand() * TAU, rr = rad * (0.55 + 0.45 * Math.cbrt(rand()));
      const p = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th), u * 0.8, Math.sqrt(1 - u * u) * Math.sin(th)).multiplyScalar(rr).add(c);
      const n = p.clone().sub(c).normalize(); n.y += 0.35; n.normalize();
      e.set(rand() * TAU, rand() * TAU, rand() * TAU); q.setFromEuler(e);
      const S = 0.85 + rand() * 0.5;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const quad = corners.map(([a, b]) => v.set(a * S / 2, b * S / 2, 0).applyQuaternion(q).add(p).toArray());
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...quad[k]); nrm.push(n.x, n.y, n.z); uv.push((corners[k][0] + 1) / 2, (corners[k][1] + 1) / 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    B.add(g, leafMat);
    const core = new THREE.IcosahedronGeometry(rad * 0.62, 1);
    B.add(core, crownMat, mat4(cx, cy, cz, 0, 0, 0, 1, 0.8, 1));
  }
  function tree(x, z, s = 1) {
    B.add(new THREE.CylinderGeometry(0.08 * s, 0.13 * s, 2.7 * s, 8), M.trunk, mat4(x, 1.35 * s + 0.45, z));
    for (let k = 0; k < 3; k++) {
      const a = rand() * TAU, r = k === 0 ? 0 : 0.5 * s;
      B.add(new THREE.CylinderGeometry(0.03 * s, 0.05 * s, 1.0 * s, 6), M.trunk, mat4(x + Math.cos(a) * r * 0.5, 2.9 * s + 0.45, z + Math.sin(a) * r * 0.5, 0, Math.cos(a) * 0.5, Math.sin(a) * 0.5));
      crown(x + Math.cos(a) * r, (3.35 + rand() * 0.5) * s + 0.4, z + Math.sin(a) * r, (k === 0 ? 1.15 : 0.85) * s);
    }
    solid(x - 1.3, x + 1.3, z - 1.3, z + 1.3, 2.3 * s, 4.9 * s, true);
  }
  function planter(x, z) {
    B.add(mbox(1.6, 0.5, 1.6), M.concrete, mat4(x, 0.25, z));
    B.add(mbox(1.45, 0.05, 1.45), M.soil, mat4(x, 0.48, z), { noCast: true });
    tree(x, z);
    solid(x - .8, x + .8, z - .8, z + .8, 0, 0.6, false);
  }
  function bench(x, z, ry) {
    const m = mat4(x, 0, z, ry);
    const add = (g, mat, lx, ly, lz) => B.add(g, mat, m.clone().multiply(mat4(lx, ly, lz)));
    for (let k = 0; k < 4; k++) add(mbox(1.8, 0.04, 0.09), benchMat, 0, 0.45, -0.2 + k * 0.12);
    for (let k = 0; k < 3; k++) add(mbox(1.8, 0.09, 0.035), benchMat, 0, 0.6 + k * 0.12, -0.27);
    for (const lx of [-0.75, 0.75]) { add(mbox(0.06, 0.45, 0.5), M.darkMetal, lx, 0.22, -0.05); add(mbox(0.06, 0.4, 0.05), M.darkMetal, lx, 0.65, -0.3); }
    const c = Math.abs(Math.cos(ry)) > .5;
    solid(x - (c ? .95 : .35), x + (c ? .95 : .35), z - (c ? .35 : .95), z + (c ? .35 : .95), 0, 0.9, false);
  }
  for (let z = 14; z < 60; z += 16) {
    planter(0, z);
    bench(-1.4, z + 4, -Math.PI / 2); bench(1.4, z + 4, Math.PI / 2);
  }
  // plaza: planters at the sides
  planter(-11.5, 2.5); planter(11.5, 2.5); planter(-11.5, -0.6 + 0.0); planter(11.5, -0.6);

  // street gate 牌樓 "MW 大街"
  {
    const z = L.gateZ;
    for (const x of [-6.2, 6.2]) {
      B.add(mbox(0.7, 6.4, 0.7), M.redPillar, mat4(x, 3.2, z));
      B.add(mbox(1.1, 0.5, 1.1), M.concrete2, mat4(x, 0.25, z));
      solid(x - .55, x + .55, z - .55, z + .55, 0, 6.4, false);
    }
    B.add(mbox(14.4, 0.5, 0.9), M.redPillar, mat4(0, 6.4, z));
    B.add(mbox(15.4, 0.3, 1.6), M.roofTile, mat4(0, 7.4, z));
    const roof = new THREE.CylinderGeometry(0.01, 1.3, 15.6, 4, 1); roof.rotateZ(Math.PI / 2); roof.rotateX(Math.PI / 4);
    B.add(roof, M.roofTile, mat4(0, 7.55, z, 0, 0, 0, 1, 0.55, 1));
    const gateTex = canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = '#7a1a12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c165'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#f3d27a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 150px ${SERIF}`; g.fillText('M W 大 街', w / 2, h / 2 + 6);
    });
    const gm = new THREE.MeshStandardMaterial({ map: gateTex, roughness: .4, metalness: .2, emissive: 0xffffff, emissiveMap: gateTex, emissiveIntensity: .15 });
    B.add(mbox(6.4, 1.7, 0.3), M.gold, mat4(0, 5.6, z));
    for (const sgn of [1, -1]) B.add(mplane(6.1, 1.5, false), gm, mat4(0, 5.6, z + sgn * 0.16, sgn > 0 ? 0 : Math.PI), { noShadow: true });
  }
  // the end of the street behind the start: a row of bollards
  for (let x = -7; x <= 7; x += 1.4) B.add(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 10), M.darkMetal, mat4(x, 0.45, L.endZ + 0.6));
  solid(-20, 20, L.endZ + 0.4, L.endZ + 3, 0, 1, false);
  // shops side walls of the plaza boundary
  solid(-L.plazaHalf - 2, -L.plazaHalf, L.hallFront - 1, L.shopZ0, 0, 8, true);
  solid(L.plazaHalf, L.plazaHalf + 2, L.hallFront - 1, L.shopZ0, 0, 8, true);
  // plaza side walls (shop row ends) facing the plaza
  for (const sx of [-1, 1]) {
    B.add(mbox(L.plazaHalf - L.streetHalf, 9, 0.4), M.concrete, mat4(sx * (L.streetHalf + L.plazaHalf) / 2, 4.5, L.shopZ0 + 0.2));
    B.add(mbox(0.4, 9, L.shopZ0 - L.hallFront + 1), M.concrete, mat4(sx * (L.plazaHalf + 0.2), 4.5, (L.shopZ0 + L.hallFront) / 2));
    solid(sx * L.streetHalf, sx * L.plazaHalf, L.shopZ0, L.shopZ0 + 0.4, 0, 9, true);
  }

  // ---------------- MW GAME HALL (facade)
  const hall = buildHall();
  function buildHall() {
    const zf = L.hallFront, zb = L.hallBack, hw = L.hallHalf, H = 13, C = L.hallCeil;
    // front wall pieces (z = zf-0.4 .. zf)
    const fw = (x0, x1, y0, y1) => B.add(mbox(x1 - x0, y1 - y0, 0.4), M.hallPanel, mat4((x0 + x1) / 2, (y0 + y1) / 2, zf - 0.2));
    fw(-hw, -6.5, 0, C); fw(6.5, hw, 0, C);
    fw(-6.5, 6.5, 5.2, C);
    fw(-hw, hw, C, H);
    solid(-hw, -6.5, zf - 0.4, zf, 0, H, true); solid(6.5, hw, zf - 0.4, zf, 0, H, true);
    // glass curtain wall + mullions, door gap at |x| < 2
    for (const [x0, x1] of [[-6.5, -2], [2, 6.5]]) {
      B.add(mplane(x1 - x0, 5.2, false), M.glass, mat4((x0 + x1) / 2, 2.6, zf - 0.2), { noShadow: true });
      solid(x0, x1, zf - 0.35, zf - 0.05, 0, 5.2, false);
    }
    for (const x of [-6.5, -4.25, -2, 2, 4.25, 6.5]) B.add(mbox(0.12, 5.2, 0.2), M.darkMetal, mat4(x, 2.6, zf - 0.2));
    B.add(mbox(13, 0.16, 0.24), M.darkMetal, mat4(0, 5.15, zf - 0.2));
    B.add(mbox(4, 0.2, 0.24), M.darkMetal, mat4(0, 3.0, zf - 0.2));
    // sliding doors (animated)
    const doorMat = M.glass;
    const doors = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      const pane = new THREE.Mesh(mplane(2, 2.95, false), doorMat); pane.position.set(0, 1.5, 0); g.add(pane);
      const fr = new THREE.Mesh(mbox(2, 0.08, 0.06), M.steel); fr.position.y = 0.04; g.add(fr);
      const fr2 = fr.clone(); fr2.position.y = 2.96; g.add(fr2);
      const fr3 = new THREE.Mesh(mbox(0.06, 2.95, 0.06), M.steel); fr3.position.set(-s * 0.97, 1.5, 0); g.add(fr3);
      const handle = new THREE.Mesh(mbox(0.04, 0.8, 0.05), M.steel); handle.position.set(-s * 0.85, 1.1, 0.06); g.add(handle);
      g.position.set(s * 1, 0, zf - 0.22); g.userData = { s, open: 0 };
      root.add(g); doors.push(g);
    }
    // canopy over the entrance with downlights
    B.add(mbox(9, 0.3, 3.2), M.darkMetal, mat4(0, 5.35, zf + 1.4));
    for (let x = -3.6; x <= 3.6; x += 1.8) B.add(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12), M.lampHead, mat4(x, 5.19, zf + 1.4), { noShadow: true });
    // vertical fins on the upper facade
    for (const x of [-14.2, 14.2]) B.add(mbox(0.18, H - 0.6, 0.5), M.darkMetal, mat4(x, (H + 0.6) / 2, zf + 0.2));
    // roof slab + rear building mass
    B.add(mbox(hw * 2, H - C, -zb + zf), M.hallPanel, mat4(0, (H + C) / 2, (zf + zb) / 2 - 0.2), { noCast: false });
    B.add(mbox(hw * 2 + 0.4, 0.5, 0.6), M.steel, mat4(0, H + 0.25, zf));
    // side + back walls (outside + inside skin)
    B.add(mbox(0.4, C, -zb + zf), M.hallPanel, mat4(-hw - 0.2, C / 2, (zf + zb) / 2));
    B.add(mbox(0.4, C, -zb + zf), M.hallPanel, mat4(hw + 0.2, C / 2, (zf + zb) / 2));
    B.add(mbox(hw * 2, C, 0.4), M.hallPanel, mat4(0, C / 2, zb - 0.2));
    solid(-hw - 0.4, -hw + 0.4, zb, zf, 0, H, true); solid(hw - 0.4, hw + 0.4, zb, zf, 0, H, true); solid(-hw, hw, zb - 0.4, zb + 0.4, 0, H, true);
    // interior skins
    B.add(mplane(-zb + zf - 0.4, C, true), M.hallWallIn, mat4(-hw + 0.02, C / 2, (zf + zb) / 2 - 0.2, Math.PI / 2));
    B.add(mplane(-zb + zf - 0.4, C, true), M.hallWallIn, mat4(hw - 0.02, C / 2, (zf + zb) / 2 - 0.2, -Math.PI / 2));
    B.add(mplane(hw * 2, C, true), M.hallWallIn, mat4(0, C / 2, zb + 0.02));
    B.add(mplane(hw * 2 - 13, C, true), M.hallWallIn, mat4(-(hw + 6.5) / 2, C / 2, zf - 0.42, Math.PI), {});
    B.add(mplane(hw * 2 - 13, C, true), M.hallWallIn, mat4((hw + 6.5) / 2, C / 2, zf - 0.42, Math.PI), {});
    // floor: lobby tiles, carpet in the play area
    const lobby = new THREE.Mesh(mplane(hw * 2, 6.6), M.checker); lobby.rotation.x = -Math.PI / 2; lobby.position.set(0, 0.006, zf - 0.4 - 3.3); lobby.receiveShadow = true; root.add(lobby);
    const carpet = new THREE.Mesh(mplane(hw * 2, -zb + zf - 7), M.carpet); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.006, (zf - 7 + zb) / 2); carpet.receiveShadow = true; root.add(carpet);
    // ceiling with light panels and neon strips
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, -zb + zf), M.ceiling); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, C, (zf + zb) / 2); root.add(ceil);
    const panel = std(0xffffff, .5, 0, { emissive: 0xfff6e8, emissiveIntensity: 1.6 });
    for (let x = -10; x <= 10; x += 5) for (let z = -5.5; z > zb + 2; z -= 4.5) B.add(mbox(1.6, 0.04, 0.6), panel, mat4(x, C - 0.03, z), { noShadow: true });
    const neonA = std(0x000000, .4, 0, { emissive: 0xff3fb4, emissiveIntensity: 3 });
    const neonB = std(0x000000, .4, 0, { emissive: 0x2fd8ff, emissiveIntensity: 3 });
    for (const sx of [-1, 1]) {
      B.add(mbox(0.05, 0.05, -zb + zf - 9), sx < 0 ? neonA : neonB, mat4(sx * 2.9, C - 0.08, (zf - 8 + zb) / 2), { noShadow: true });
      B.add(mbox(0.04, 0.06, -zb + zf - 1), sx < 0 ? neonB : neonA, mat4(sx * (hw - 0.05), C - 0.6, (zf + zb) / 2), { noShadow: true });
    }
    B.add(mbox(hw * 2 - 0.2, 0.06, 0.04), neonA, mat4(0, C - 0.6, zb + 0.05), { noShadow: true });

    // big neon sign on the facade
    const signTex = canvasTex(2048, 360, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 210px "Silkscreen", ${FONT}`;
      g.shadowColor = '#ff5ac8'; g.shadowBlur = 30; g.fillStyle = '#ffe3f6'; g.fillText('MW · GAME HALL', w / 2, h / 2 - 20);
      g.shadowBlur = 0;
    });
    const signMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 2.4, transparent: true, alphaMap: signTex, roughness: 1, depthWrite: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.5), signMat); sign.position.set(0, 11.2, zf + 0.06); root.add(sign);
    const zhTex = canvasTex(1024, 220, (g, w, h) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 150px ${FONT}`;
      g.shadowColor = '#3fe0ff'; g.shadowBlur = 24; g.fillStyle = '#dcfbff'; g.fillText('遊 戲 大 廳', w / 2, h / 2 + 6);
    });
    const zhMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: zhTex, emissiveIntensity: 2.2, transparent: true, alphaMap: zhTex, depthWrite: false });
    const zh = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.95), zhMat); zh.position.set(0, 8.4, zf + 0.06); root.add(zh);
    // LED screen at the side of the facade, cycling the games
    // LED walls cycle through the mini-games inside (cropping the thumbnail atlas)
    const { mini: MINI, atlas: ATLAS } = opts;
    const AR = Math.ceil(MINI.length / 8);
    const ledTex = [ATLAS.clone(), ATLAS.clone()];
    const setTile = (t, i) => { t.repeat.set(1 / 8, 1 / AR); t.offset.set((i % 8) / 8, 1 - (Math.floor(i / 8) + 1) / AR); t.needsUpdate = true; };
    ledTex.forEach((t, k) => setTile(t, k * 7));
    const led = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.5), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: ledTex[0], emissiveIntensity: 1.2, roughness: .3 }));
    led.position.set(-10.2, 7.5, zf + 0.12); root.add(led);
    B.add(mbox(6, 3.9, 0.25), M.blackPlastic, mat4(-10.2, 7.5, zf + 0.0));
    const led2 = new THREE.Mesh(led.geometry, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: ledTex[1], emissiveIntensity: 1.2, roughness: .3 }));
    led2.position.set(10.2, 7.5, zf + 0.12); root.add(led2);
    B.add(mbox(6, 3.9, 0.25), M.blackPlastic, mat4(10.2, 7.5, zf + 0.0));
    let ledI = -1;
    animated.push((dt, t) => {
      const k = Math.floor(t / 3);
      if (k !== ledI) { ledI = k; setTile(ledTex[0], (k * 5) % MINI.length); setTile(ledTex[1], (k * 5 + 23) % MINI.length); }
    });
    // LED light lines across the facade + a fascia band above the glass
    const ledPink = std(0x000000, .4, 0, { emissive: 0xff4fb8, emissiveIntensity: 3.2 });
    const ledCyan = std(0x000000, .4, 0, { emissive: 0x3fe0ff, emissiveIntensity: 3.2 });
    B.add(mbox(hw * 2, 0.08, 0.08), ledCyan, mat4(0, C + 0.05, zf + 0.04), { noShadow: true });
    B.add(mbox(hw * 2, 0.08, 0.08), ledPink, mat4(0, H - 0.25, zf + 0.04), { noShadow: true });
    for (const x of [-hw + 0.1, hw - 0.1]) B.add(mbox(0.08, H, 0.08), ledPink, mat4(x, H / 2, zf + 0.04), { noShadow: true });
    B.add(mbox(hw * 2, 0.7, 0.3), M.steel, mat4(0, C - 0.4, zf + 0.12));
    // vending machines + photo booth outside next to the doors
    const vend = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#e9eef2'; g.fillRect(0, 0, w, h); g.fillStyle = '#c62828'; g.fillRect(0, 0, w, 70);
      g.fillStyle = '#fff'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText('飲料', w / 2, 50);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { g.fillStyle = `hsl(${(r * 5 + c) * 47 % 360},70%,55%)`; roundRect(g, 18 + c * 45, 90 + r * 80, 30, 58, 8); g.fill(); g.fillStyle = '#333'; g.fillRect(18 + c * 45, 150 + r * 80, 30, 8); }
      g.fillStyle = '#222'; g.fillRect(30, h - 70, w - 60, 46);
    });
    const vm = new THREE.MeshStandardMaterial({ map: vend, emissive: 0xffffff, emissiveMap: vend, emissiveIntensity: .45, roughness: .3 });
    for (const x of [8.2, 9.3]) {
      B.add(mbox(1.0, 1.9, 0.8), std(0xc62828, .4, .2), mat4(x, 0.95, zf + 0.55));
      B.add(mplane(0.86, 1.72, false), vm, mat4(x, 0.98, zf + 0.96), { noShadow: true });
      solid(x - .5, x + .5, zf + .1, zf + 1, 0, 1.9, true);
    }
    // "OPEN" welcome mat
    const matTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#1b1b22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff4fa3'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 72px ${FONT}`; g.fillText('歡迎光臨', w / 2, h / 2 - 20); g.font = `700 34px "Silkscreen", ${FONT}`; g.fillStyle = '#ff9bd2'; g.fillText('WELCOME', w / 2, h / 2 + 50); });
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshStandardMaterial({ map: matTex, roughness: .95 })); wm.rotation.x = -Math.PI / 2; wm.position.set(0, 0.012, zf + 1.4); wm.receiveShadow = true; root.add(wm);
    return { doors };
  }

  // ---------------- interior: lobby, zone signs, cabinets, decor
  const zf = L.hallFront, zb = L.hallBack;
  // reception counter
  {
    const x = 10.5, z = zf - 4.6;
    B.add(mbox(4.2, 1.05, 0.8), std(0x2b2b38, .5, .3), mat4(x, 0.525, z));
    B.add(mbox(4.4, 0.06, 0.95), std(0xe9e4dc, .3), mat4(x, 1.08, z));
    B.add(mbox(4.2, 0.08, 0.04), std(0x000000, .4, 0, { emissive: 0x2fd8ff, emissiveIntensity: 2.5 }), mat4(x, 0.2, z + 0.41), { noShadow: true });
    solid(x - 2.2, x + 2.2, z - .5, z + .5, 0, 1.1, false);
    const t = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#18161f'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = `900 92px ${FONT}`; g.fillText('MW 遊戲大廳', w / 2, 100); g.fillStyle = '#ff9bd2'; g.font = `700 44px ${FONT}`; g.fillText('走到機台前面就可以開始玩', w / 2, 190); });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .6 }));
    wall.position.set(L.hallHalf - 0.03, 2.6, z); wall.rotation.y = -Math.PI / 2; root.add(wall);
  }
  // zone signs hanging from the ceiling
  function zoneSign(zone, x, z, ry = 0) {
    const zd = ZONES[zone];
    const t = canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = '#0d0c12'; roundRect(g, 4, 4, w - 8, h - 8, 40); g.fill();
      g.strokeStyle = zd.color; g.lineWidth = 10; roundRect(g, 16, 16, w - 32, h - 32, 32); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = zd.color; g.shadowColor = zd.color; g.shadowBlur = 20;
      g.font = `900 112px ${FONT}`; g.fillText(zd.name, w / 2 - 120, h / 2 + 6);
      g.font = `700 64px "Silkscreen", ${FONT}`; g.fillText(zd.en, w / 2 + 230, h / 2 + 8);
    });
    const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.4, roughness: .6 });
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), m); a.position.z = 0.03; g.add(a);
    const b = a.clone(); b.rotation.y = Math.PI; b.position.z = -0.03; g.add(b);
    const box = new THREE.Mesh(mbox(3.45, 0.9, 0.05), M.blackPlastic); g.add(box);
    for (const sx of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, L.hallCeil - 4.3, 4), M.steel); w.position.set(sx, (L.hallCeil - 4.3) / 2 + 0.45, 0); g.add(w); }
    g.position.set(x, 3.9, z); g.rotation.y = ry; root.add(g);
  }

  // ---------------- 噗噗的遊戲小屋：每款小遊戲一台機台（三個分區，一排排背對背）＋派對區
  const { mini, atlas } = opts;
  const aRows = Math.ceil(mini.length / 8);
  const tileUV = (i) => { const c = i % 8, r = Math.floor(i / 8); return [c / 8, 1 - (r + 1) / aRows, (c + 1) / 8, 1 - r / aRows]; };
  const CAT_ROWS = { react: [-10.0, -10.95], puzzle: [-14.2, -15.15], play: [-18.4, -19.35] };
  const PALETTE = { react: ['#ff5a6e', '#ff8a3d', '#ffc93b', '#ff6fb5'], puzzle: ['#4aa8ff', '#7a6dff', '#29c4c4', '#5ee0a0'], play: ['#ffb14a', '#f7a8c9', '#c77dff', '#7bd66b'] };
  for (const [cat, rows] of Object.entries(CAT_ROWS)) {
    const zc = (rows[0] + rows[1]) / 2;
    zoneSign(cat, 0, zc, 0); zoneSign(cat, -5.2, zc, 0); zoneSign(cat, 5.2, zc, 0);
  }
  zoneSign('party', 0, -22.6, 0);

  const cabMats = { metal: M.steel, black: M.blackPlastic, bezel: std(0x050507, .3, 0), coin: std(0x6b6b6b, .35, .8), coinLit: std(0x000000, .5, 0, { emissive: 0xff3030, emissiveIntensity: 2 }) };
  const btnCols = [0xff3b3b, 0xffd23f, 0x3bd16f, 0x3b8bff];
  const btnMats = btnCols.map((c) => std(c, .35, 0, { emissive: c, emissiveIntensity: .35 }));
  // marquee atlas: 4 x 32 slots of 512 x 64
  const MQ = 4, MQR = 32;
  const marqueeAtlas = canvasTex(2048, 2048, (g, w, h) => {
    mini.forEach((m, i) => {
      const x = (i % MQ) * 512, y = Math.floor(i / MQ) * 64, col = ZONES[m.cat].color;
      const gr = g.createLinearGradient(x, 0, x + 512, 0); gr.addColorStop(0, '#0b0b10'); gr.addColorStop(.5, '#1c1a26'); gr.addColorStop(1, '#0b0b10');
      g.fillStyle = gr; g.fillRect(x, y, 512, 64);
      g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(x + 4, y + 4, 504, 56);
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 10; g.fillStyle = '#fff';
      const fs = fitText(g, m.name, 470, 40, 900); g.font = `900 ${fs}px ${FONT}`; g.fillText(m.name, x + 256, y + 34); g.restore();
    });
  });
  const mqUV = (i) => { const c = i % MQ, r = Math.floor(i / MQ); return [c / MQ, 1 - (r + 1) / MQR, (c + 1) / MQ, 1 - r / MQR]; };
  const planeUV = (w, h, uv) => { const g = new THREE.PlaneGeometry(w, h); const a = g.attributes.uv; for (let k = 0; k < a.count; k++) a.setXY(k, a.getX(k) ? uv[2] : uv[0], a.getY(k) ? uv[3] : uv[1]); return g; };
  const screenGeos = [], marqueeGeos = [];
  const prof = new THREE.Shape();
  prof.moveTo(-0.45, 0); prof.lineTo(0.42, 0); prof.lineTo(0.42, 0.86); prof.lineTo(0.5, 0.92); prof.lineTo(0.42, 1.02);
  prof.lineTo(0.16, 1.05); prof.lineTo(0.06, 1.62); prof.lineTo(0.22, 1.66); prof.lineTo(0.22, 1.95); prof.lineTo(-0.45, 1.95); prof.lineTo(-0.45, 0);
  const sideGeo = new THREE.ExtrudeGeometry(prof, { depth: 0.04, bevelEnabled: false }); sideGeo.rotateY(-Math.PI / 2);
  const tilt = Math.atan2(0.1, 0.57);
  function miniCab(i, color, x, z, face) {
    const base = mat4(x, 0, z, face);
    const put = (geo, mat, lx, ly, lz, rx = 0, o = {}) => B.add(geo, mat, base.clone().multiply(mat4(lx, ly, lz, 0, rx)), o);
    const W = 0.86, inner = W - 0.08, side = std(color, .45, .15);
    put(sideGeo, side, W / 2, 0, 0); put(sideGeo, side, -W / 2 + 0.04, 0, 0);
    put(mbox(inner, 0.86, 0.86), cabMats.black, 0, 0.43, -0.01);
    put(mbox(inner, 0.06, 0.38), cabMats.black, 0, 0.98, 0.29, -0.2);
    put(mbox(inner, 0.02, 0.36), std(color, .5), 0, 1.015, 0.29, -0.2);
    put(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), cabMats.metal, -0.2, 1.08, 0.3);
    put(new THREE.SphereGeometry(0.03, 8, 6), btnMats[i % 4], -0.2, 1.13, 0.3);
    for (let k = 0; k < 4; k++) put(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8), btnMats[k], 0.02 + (k % 2) * 0.08 + Math.floor(k / 2) * 0.03, 1.04, 0.3 + (Math.floor(k / 2) - 0.5) * 0.08, 0, { noCast: true });
    put(mbox(inner, 0.6, 0.5), cabMats.black, 0, 1.33, -0.17);
    put(mbox(inner, 0.6, 0.02), cabMats.bezel, 0, 1.335, 0.11, -tilt);
    put(mbox(inner, 0.28, 0.5), cabMats.black, 0, 1.81, -0.03);
    put(mbox(0.32, 0.36, 0.02), cabMats.coin, 0, 0.5, 0.425);
    for (const cx of [-0.07, 0.07]) put(mbox(0.05, 0.07, 0.01), cabMats.coinLit, cx, 0.58, 0.437, 0, { noCast: true });
    screenGeos.push(planeUV(0.68, 0.425, tileUV(i)).applyMatrix4(base.clone().multiply(mat4(0, 1.335, 0.125, 0, -tilt))));
    marqueeGeos.push(planeUV(inner - 0.02, 0.24, mqUV(i)).applyMatrix4(base.clone().multiply(mat4(0, 1.81, 0.225))));
    const fx = Math.sin(face), fz = Math.cos(face);
    solid(x - (Math.abs(fx) > .5 ? .47 : .45), x + (Math.abs(fx) > .5 ? .47 : .45), z - (Math.abs(fx) > .5 ? .45 : .47), z + (Math.abs(fx) > .5 ? .45 : .47), 0, 2, true);
    return { spot: new THREE.Vector3(x + fx * 1.05, 0, z + fz * 1.05), focus: new THREE.Vector3(x + fx * 0.125, 1.335, z + fz * 0.125), normal: new THREE.Vector3(fx, 0, fz), face: face + Math.PI };
  }
  // slot x positions: center aisle |x| < 1.45, up to 6 cabinets per side
  const SLOTS = []; for (let j = 0; j < 6; j++) SLOTS.push(-(1.9 + j * 1.02), 1.9 + j * 1.02);
  const miniItems = [];
  for (const [cat, rows] of Object.entries(CAT_ROWS)) {
    const list = mini.map((m, i) => ({ m, i })).filter((o) => o.m.cat === cat);
    const half = Math.ceil(list.length / 2);
    [list.slice(0, half), list.slice(half)].forEach((part, r) => {
      const xs = SLOTS.slice(0, part.length).sort((a, b) => a - b);
      part.forEach(({ m, i }, k) => {
        const face = r === 0 ? 0 : Math.PI;            // front row faces the lobby, back row faces the next aisle
        const x = r === 0 ? xs[k] : xs[xs.length - 1 - k];
        const pal = PALETTE[cat];
        const c = miniCab(i, pal[k % pal.length], x, rows[r], face);
        miniItems.push({ i, m, ...c });
      });
    });
  }
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 1.05, roughness: .2 });
  const screens = new THREE.Mesh(mergeGeometries(screenGeos), screenMat); root.add(screens);
  const marquees = new THREE.Mesh(mergeGeometries(marqueeGeos), new THREE.MeshStandardMaterial({ map: marqueeAtlas, emissive: 0xffffff, emissiveMap: marqueeAtlas, emissiveIntensity: 1.3 }));
  root.add(marquees);
  // screens were merged in the order of miniItems: two triangles per screen
  miniItems.forEach((o, k) => {
    const g = { id: 'mini-' + o.m.id, path: `minigames/${o.m.id}.html`, title: o.m.name, genre: '噗噗的遊戲小屋', desc: o.m.desc, tags: [], zone: o.m.cat, tile: o.i };
    interact.push({ game: g, spot: o.spot, face: o.face, focus: o.focus, normal: o.normal, screen: screens, screenIndex: k, radius: 1.0 });
  });

  // party screen on the back wall
  {
    const c = { x: 0, z: zb + 0.4 };
    const add = (geo, mat, x, y, z) => B.add(geo, mat, mat4(c.x + x, y, c.z + z));
    add(mbox(5.4, 3.1, 0.12), cabMats.black, 0, 2.55, 0.06);
    add(mbox(3.6, 0.45, 0.5), std(0x3b2a20, .6), 0, 0.225, 0.4);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.925), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: shots.party, emissiveIntensity: 1.1, roughness: .2 }));
    screen.position.set(c.x, 2.55, c.z + 0.125); root.add(screen);
    solid(c.x - 2.7, c.x + 2.7, c.z - 0.1, c.z + 0.7, 0, 1, false);
    interact.push({ game: { ...PARTY, zone: 'party' }, spot: new THREE.Vector3(0, 0, c.z + 6.35), face: Math.PI, focus: new THREE.Vector3(0, 2.55, c.z + 0.125), normal: new THREE.Vector3(0, 0, 1), screen, radius: 2.6 });
  }

  // party lounge: sofas, table, rug
  const [sofa, table, trash, ubox, wet, plant] = await Promise.all(['sofa_02', 'round_wooden_table_02', 'metal_trash_can', 'utility_box_01', 'WetFloorSign_01', 'potted_plant_04'].map((n) => loadGLB(`assets/props/${n}.glb`)));
  const place = (obj, x, z, ry = 0, s = 1) => { const o = obj.clone(); o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s); o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; if (m.material) m.material.envMapIntensity = 0.35; } }); root.add(o); return o; };
  place(sofa, -1.6, -24.6, Math.PI, 1.05); place(sofa, 1.6, -24.6, Math.PI, 1.05);
  solid(-2.6, 2.6, -25.1, -24.1, 0, 0.8, false);
  place(table, 0, -26.2, 0, 0.9);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), std(0x5a2a6e, .95)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, -26); rug.receiveShadow = true; root.add(rug);
  place(wet, -1.6, zf - 2.2, 0.4);
  solid(-1.8, -1.4, zf - 2.4, zf - 2.0, 0, 0.6, false);
  // outside props
  // trash cans: keep only one can of the pair
  const can = place(trash, 7.0, 4.2, 0, 1); can.traverse((m) => { if (m.isMesh && m.position.x < 0) m.visible = false; });
  place(ubox, 13.6, 4.8, -Math.PI / 2);
  for (const z of [20, 40]) { const c2 = place(trash, -7.3, z, Math.PI / 2, 1); c2.traverse((m) => { if (m.isMesh && m.position.x < 0) m.visible = false; }); }

  // claw machines along the right wall (decor)
  const plushCols = [0xffb3c7, 0xfff0a0, 0xa0e8ff, 0xc8f7a0, 0xffc8a0, 0xd8b8ff];
  for (let k = 0; k < 3; k++) {
    const x = 13.4, z = -9 - k * 1.5;
    const col = [0xff5a8a, 0x3bc9ff, 0xffc93b][k];
    B.add(mbox(1.2, 0.95, 1.2), std(col, .4, .2), mat4(x, 0.475, z));
    B.add(mbox(1.2, 0.3, 1.2), std(col, .4, .2), mat4(x, 2.15, z));
    B.add(mbox(1.18, 0.02, 1.18), std(0x000000, .5, 0, { emissive: 0xffffff, emissiveIntensity: 1.5 }), mat4(x, 1.99, z), { noShadow: true });
    B.add(mbox(1.2, 1.05, 1.2), M.glass, mat4(x, 1.475, z), { noShadow: true });
    for (const cx of [-0.58, 0.58]) for (const cz of [-0.58, 0.58]) B.add(mbox(0.04, 1.05, 0.04), M.steel, mat4(x + cx, 1.475, z + cz));
    for (let p = 0; p < 14; p++) B.add(new THREE.SphereGeometry(0.1 + rand() * 0.04, 10, 8), std(pick(plushCols), .9), mat4(x - 0.4 + rand() * 0.8, 1.05 + rand() * 0.15, z - 0.4 + rand() * 0.8));
    B.add(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), M.steel, mat4(x, 1.75, z));
    B.add(new THREE.ConeGeometry(0.08, 0.12, 3, 1, true), M.steel, mat4(x, 1.52, z, 0, Math.PI));
    solid(x - 0.65, x + 0.65, z - 0.65, z + 0.65, 0, 2.3, true);
  }
  // posters of the games on the walls
  const posterFrame = std(0x111111, .4, .3);
  const posters = STREET;
  posters.forEach((g, i) => {
    const left = i < 5;
    const k = left ? i : i - 5;
    const x = left ? -L.hallHalf + 0.06 : L.hallHalf - 0.06;
    const z = -11 - k * 3.3;
    if (!left && z > -14) return;
    B.add(mbox(0.04, 1.3, 2.2), posterFrame, mat4(x, 2.4, z));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.15), new THREE.MeshStandardMaterial({ map: shots[g.id], emissive: 0xffffff, emissiveMap: shots[g.id], emissiveIntensity: .12, roughness: .3 }));
    m.position.set(x + (left ? 0.03 : -0.03), 2.4, z); m.rotation.y = left ? Math.PI / 2 : -Math.PI / 2; root.add(m);
  });
  // lounge benches at the side walls
  for (const z of [-17.5, -25]) { bench(-12.6, z, Math.PI / 2); }
  for (const p of [[-13.6, zf - 1.5], [13.6, -26.5], [-13.6, -28.5], [6.5, zf - 1.2], [-6.5, zf - 1.2]]) { const o = place(plant, p[0], p[1], rand() * 3, 4.2); }

  // interior lights (no shadows)
  const ilights = [
    [0, 4.6, -9, 0xfff1dd, 18], [0, 4.6, -18, 0xfff1dd, 18], [0, 4.6, -26, 0xd9b8ff, 14],
    [-9, 4.6, -14, 0xffd9ec, 10], [9, 4.6, -14, 0xd8f4ff, 10], [10, 4.6, -5, 0xfff1dd, 10], [-9, 4.6, -24, 0xffe7c4, 10],
  ];
  const nL = quality === 'low' ? 3 : ilights.length;
  for (let i = 0; i < nL; i++) {
    const [x, y, z, c, I] = ilights[i];
    const pl = new THREE.PointLight(c, I * (quality === 'low' ? 1.6 : 1), 16, 1.6); pl.position.set(x, y, z); root.add(pl);
  }

  // ---------------- finish
  B.build(root);
  root.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });

  const area = (p) => (p.z < L.hallFront - 0.3 ? 'hall' : p.z < L.shopZ0 ? 'plaza' : 'street');
  return {
    root, colliders, interact,
    doors: hall.doors,
    update(dt, t, playerPos) {
      for (const f of animated) f(dt, t);
      for (const d of hall.doors) {
        const near = Math.abs(playerPos.x) < 3.5 && Math.abs(playerPos.z - (L.hallFront - 0.2)) < 3.6;
        d.userData.open += ((near ? 1 : 0) - d.userData.open) * Math.min(1, dt * 4);
        d.position.x = d.userData.s * (1 + d.userData.open * 1.9);
      }
    },
    area,
    spawn: { x: 0, z: L.startZ, heading: Math.PI },
  };
}

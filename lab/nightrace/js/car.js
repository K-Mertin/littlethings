// 車子：外形（程式拼的小跑車）、街機式物理（濕地抓地力比較差、水窪更滑、手煞車甩尾）、電腦車手
import * as THREE from 'three';
import { vec3, uniform, uv, smoothstep, float, normalView, positionView, attribute, mix, color as tcolor } from 'three/tsl';
import { ROAD_W } from './track.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const CAR_COLORS = [0xffcf2e, 0xff4d6d, 0x3fa9ff, 0x7dff6a, 0xff8a2b, 0xc77dff, 0xf5f5f5, 0x2be6d2];

// 側面輪廓（z 往前、y 往上），用曲線畫出圓滑的車身，再擠出成 3D；玻璃用小一點的輪廓、稍微寬一點，側面和前後才看得到
function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.2, 0.3); s.lineTo(2.05, 0.3);
  s.quadraticCurveTo(2.34, 0.32, 2.32, 0.5);       // 車頭下巴
  s.quadraticCurveTo(2.3, 0.68, 2.0, 0.72);        // 車頭
  s.lineTo(1.05, 0.85);                            // 引擎蓋
  s.quadraticCurveTo(0.62, 1.1, 0.22, 1.26);       // 擋風玻璃
  s.quadraticCurveTo(-0.3, 1.34, -0.86, 1.3);      // 車頂
  s.quadraticCurveTo(-1.42, 1.2, -1.82, 0.98);     // 後窗
  s.lineTo(-2.16, 0.94);                           // 行李箱
  s.quadraticCurveTo(-2.32, 0.9, -2.29, 0.6);      // 車尾
  s.lineTo(-2.2, 0.3);
  return s;
}
function glassShape() {
  const s = new THREE.Shape();
  s.moveTo(1.0, 0.84); s.quadraticCurveTo(0.6, 1.08, 0.24, 1.23); s.quadraticCurveTo(-0.3, 1.31, -0.85, 1.27);
  s.quadraticCurveTo(-1.38, 1.17, -1.72, 0.96); s.lineTo(-1.62, 0.86); s.lineTo(1.0, 0.84);
  return s;
}
function extrude(shape, width, bevel) {
  let g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 4, curveSegments: 8 });
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);   // 合併頂點再算法線 → 圓滑的光影（不會一面一面的）
  g.translate(0, 0, -width / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals();
  return g;
}
// ---------------------------------------------------------------- 車身：用「斷面」一圈一圈接起來（loft）
// 側面輪廓決定每個位置的頂和底；俯視時車頭、車尾收窄；斷面下半部是車身（腰線以下微微鼓起、底角圓），
// 腰線以上是車窗（往內收的 tumblehome）。輪子的位置把車底挖成圓弧（輪拱）。
// 每個頂點帶 part：0 車漆、1 玻璃、2 黑色飾條（A／B／C 柱、窗框）、3 輪拱裡面（暗）
const WHEELS = [[1.4, 0.34], [-1.35, 0.34]];   // [z, 半徑]
function profileYs(z) {
  // 從原本的側面輪廓（polygon）求這個 z 的頂和底
  const pts = bodyShape().getPoints(24);
  let top = -1, bot = 9;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if ((a.x - z) * (b.x - z) > 0 || a.x === b.x) continue;
    const t = (z - a.x) / (b.x - a.x), y = a.y + (b.y - a.y) * t;
    top = Math.max(top, y); bot = Math.min(bot, y);
  }
  return [top, bot];
}
function halfW(z) {
  let w = 0.96;
  if (z > 1.5) w -= 0.2 * ((z - 1.5) / 0.84) ** 2;
  if (z < -1.7) w -= 0.13 * ((-1.7 - z) / 0.6) ** 2;
  return w;
}
function loftBody() {
  const NZ = 72, z0 = -2.29, z1 = 2.33, BELT = 0.86;
  const rows = [];
  for (let iz = 0; iz <= NZ; iz++) {
    // 兩端多取幾個點（圓弧收尾）
    const u = iz / NZ, zz = z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(Math.PI * u));
    let [top, bot] = profileYs(zz);
    if (top < 0) { top = 0.6; bot = 0.5; }
    // 輪拱：車底在輪子上方挖成圓弧
    let arch = 0;
    for (const [wz, wr] of WHEELS) { const R = wr + 0.05, d = zz - wz; if (Math.abs(d) < R) arch = Math.max(arch, wr + Math.sqrt(R * R - d * d) - bot); }
    arch = Math.max(0, Math.min(arch, top - bot - 0.22));   // 輪拱上面至少留一點車身
    const w = halfW(zz), green = top > BELT + 0.06 && zz > -1.8 && zz < 1.08;
    // 斷面右半邊：從底部中間 → 底角 → 側面 → 腰線 → 車窗 → 車頂中間
    const ring = [];
    const yb = bot + arch, rb = arch > 0 ? 0.05 : 0.1, yt = top;   // 輪拱的地方整個斷面底部抬高（從側面看就是一個圓拱）
    const low = Math.min(yt, BELT);
    const pushP = (x, y, part) => ring.push([x, y, part]);
    pushP(0, yb, arch > 0 ? 3 : 0);
    for (let k = 0; k <= 4; k++) { const a = -Math.PI / 2 + k / 4 * Math.PI / 2; pushP(w - rb + Math.cos(a) * rb, yb + rb + Math.sin(a) * rb, arch > 0 && k < 3 ? 3 : 0); }   // 底角圓
    const nSide = 7;
    const ys0 = yb + rb, ys1 = Math.max(ys0 + 0.01, low - (green ? 0 : 0.1));
    for (let k = 1; k <= nSide; k++) {
      const y = ys0 + (ys1 - ys0) * k / nSide;
      const bulge = 1 + 0.035 * Math.sin(Math.PI * (y - yb) / Math.max(0.1, low - yb));   // 側面微微鼓起
      pushP(w * bulge, y, 0);
    }
    if (green) {
      // 車窗：往內收，車頂邊緣圓角
      const nG = 6, tw = w * 0.7;
      for (let k = 1; k <= nG; k++) { const t = k / nG, y = BELT + (yt - 0.05 - BELT) * t; pushP(w * 0.99 - (w * 0.99 - tw) * t, y, 1); }
      for (let k = 1; k <= 3; k++) { const a = k / 3 * Math.PI / 2; pushP(tw - 0.05 + Math.cos(a) * 0.05 - (1 - Math.cos(a)) * 0.04, yt - 0.05 + Math.sin(a) * 0.05, 0); }
      pushP(tw * 0.5, yt + 0.005, 0);
    } else {
      // 引擎蓋、行李箱：上面的圓角比較大，中間稍微拱起
      for (let k = 1; k <= 4; k++) { const a = k / 4 * Math.PI / 2; pushP(w - 0.1 + Math.cos(a) * 0.1, yt - 0.1 + Math.sin(a) * 0.1, 0); }
      pushP(w * 0.5, yt + 0.012, 0);
    }
    pushP(0, yt + (green ? 0.008 : 0.018), 0);
    rows.push({ z: zz, ring, arch, w, green, top: yt });
  }
  // 每一圈的點數要一樣：重新取樣成固定數量（照弧長）
  const K = 30;
  const res = rows.map((r) => {
    const P = r.ring, L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const out = [];
    for (let k = 0; k < K; k++) {
      const s2 = L[L.length - 1] * k / (K - 1); let i = 1; while (i < L.length - 1 && L[i] < s2) i++;
      const t = (s2 - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), a = P[i - 1], b = P[i];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, t < 0.5 ? a[2] : b[2]]);
    }
    return { ...r, ring: out };
  });
  // 拼成網格（右半邊＋左半邊鏡像）
  const pos = [], part = [], idx = [];
  const W2 = K * 2 - 1;   // 右邊 K 個＋左邊 K−1 個（中間底部那點共用）
  for (const r of res) {
    const ring = [...r.ring.slice().reverse().map(([x, y, pt]) => [-x, y, pt]), ...r.ring.slice(1)];   // 從頂部中間繞左邊到底部，再繞右邊回頂部
    for (const [x, y, pt] of ring) {
      let pp = pt;
      // 擋風玻璃、後窗：斜的那一段車頂本身就是玻璃
      if (pp === 0 && y > 0.9 && ((r.z > 0.22 && r.z < 1.02) || (r.z > -1.72 && r.z < -1.02))) pp = 1;
      // 柱子和窗框：擋風玻璃兩側（A 柱）、側窗中間（B 柱）、後窗兩側（C 柱）、車頂不是玻璃
      if (pp === 1) {
        const ax = Math.abs(x) / Math.max(0.01, r.w);
        if (r.z > 0.32 && ax > 0.62) pp = 2;
        if (Math.abs(r.z + 0.4) < 0.07 && ax > 0.55) pp = 2;
        if (r.z < -1.3 && ax > 0.6) pp = 2;
        if (r.z > -1.0 && r.z < 0.2 && y > r.top - 0.08) pp = 0;
      }
      pos.push(x, y, r.z); part.push(pp);
    }
  }
  for (let iz = 0; iz < res.length - 1; iz++) for (let k = 0; k < W2 - 1; k++) {
    const a = iz * W2 + k, b = a + 1, c = a + W2, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  // 前後封口
  for (const [iz, flip] of [[0, true], [res.length - 1, false]]) {
    const base = iz * W2, cz = res[iz].z;
    const ci = pos.length / 3; pos.push(0, (res[iz].top + res[iz].ring[0][1]) / 2, cz); part.push(0);
    for (let k = 0; k < W2 - 1; k++) flip ? idx.push(ci, base + k + 1, base + k) : idx.push(ci, base + k, base + k + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('part', new THREE.Float32BufferAttribute(part, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
let GEO = null;
const DBG = typeof location !== 'undefined' && location.search.includes('dbg');
function geos() {
  if (GEO) return GEO;
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 18); wg.rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 5); hub.rotateZ(Math.PI / 2);   // 五角輪框
  GEO = { body: loftBody(), wheel: wg, hub };
  void extrude; void glassShape;
  return GEO;
}

export function carMesh(color, { lights = false, ghost = false } = {}) {
  const G = geos();
  const g = new THREE.Group();
  // 車漆：清漆感（低粗糙度），反射環境貼圖的城市燈光
  const paint = ghost ? new THREE.MeshStandardNodeMaterial({ color, roughness: 0.3, metalness: 0.4 }) : new THREE.MeshPhysicalNodeMaterial({ color, roughness: 0.32, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.06 });
  // 車身：同一個網格，依頂點的 part 分成車漆／玻璃／黑色飾條／輪拱內側
  const bodyM = ghost ? paint : new THREE.MeshPhysicalNodeMaterial({ clearcoat: 1, clearcoatRoughness: 0.05 });
  if (!ghost) {
    const pt = attribute('part', 'float').add(0.5).floor();
    const isG = pt.equal(1).select(float(1), float(0)), isT = pt.equal(2).select(float(1), float(0)), isW = pt.equal(3).select(float(1), float(0));
    const pc = new THREE.Color(color);
    let col = mix(vec3(pc.r, pc.g, pc.b), vec3(0.02, 0.03, 0.04), isG);
    col = mix(col, vec3(0.015, 0.015, 0.017), isT); col = mix(col, vec3(0.01, 0.01, 0.01), isW);
    bodyM.colorNode = DBG ? mix(mix(mix(vec3(0.8, 0.8, 0.8), vec3(0, 1, 1), isG), vec3(0, 0, 1), isT), vec3(0, 1, 0), isW) : col;
    bodyM.roughnessNode = mix(mix(float(0.32), float(0.03), isG), float(0.9), isW);
    bodyM.metalnessNode = mix(float(0.45), float(0.1), isG.add(isT).add(isW).min(1));
    bodyM.clearcoatNode = float(1).sub(isW);
  }
  const dark = new THREE.MeshStandardNodeMaterial({ color: 0x15161a, roughness: 0.6 });
  const glass = new THREE.MeshStandardNodeMaterial({ color: 0x0e1824, roughness: 0.04, metalness: 0.5 });
  const body = new THREE.Mesh(G.body, bodyM);
  void glass;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.07, 0.42), dark); wing.position.set(0, 1.2, -2.0);
  const wl = [-0.7, 0.7].map((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.25), dark); p.position.set(x, 1.04, -1.98); return p; });

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.05), dark); grille.position.set(0, 0.45, 2.33);
  const mirrors = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), paint); m.position.set(s * 1.02, 0.98, 0.72); return m; });
  // 車頂的賽車號碼條紋
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 4.0), new THREE.MeshStandardNodeMaterial({ color: 0xf2f2f2, roughness: 0.3 }));
  stripe.position.set(0, 0.86, 0.15); stripe.visible = false;
  g.add(body, wing, ...wl, grille, ...mirrors);
  // 車燈：前白、後面一整條紅燈（煞車時更亮）
  const brake = uniform(0);
  const head = new THREE.MeshStandardNodeMaterial({ color: 0xffffff }); head.emissiveNode = vec3(1, 0.97, 0.88).mul(9);
  const tail = new THREE.MeshStandardNodeMaterial({ color: 0x550000 }); tail.emissiveNode = vec3(1, 0.06, 0.04).mul(brake.mul(9).add(3));
  for (const x of [-0.68, 0.68]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), head); h.position.set(x, 0.66, 2.24); h.rotation.x = -0.15; g.add(h); }
  const tb = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.05), tail); tb.position.set(0, 0.8, -2.26); g.add(tb);
  // 車底的接觸陰影：讓車子「貼」在地上
  const ao = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const q = uv().sub(0.5).mul(2);
  ao.colorNode = vec3(0); ao.opacityNode = smoothstep(1, 0.35, q.x.mul(q.x).add(q.y.mul(q.y)).sqrt()).mul(0.75);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 5.2), ao);
  under.rotation.x = -Math.PI / 2; under.position.y = 0.03; under.renderOrder = 1; g.add(under);
  // 車燈打在雨裡的光束（加法混色的長錐體，只在車頭前面）
  const beamM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const bv = uv().y;   // 0 在遠端、1 在燈的位置
  // 邊緣淡掉（看穿光束中間最亮、側面看過去就變淡），才不會出現硬硬的三角形
  const soft = normalView.dot(positionView.normalize()).abs().pow(1.6);
  beamM.colorNode = vec3(1, 0.95, 0.82).mul(bv.pow(2.2).mul(0.05)).mul(soft);
  for (const x of [-0.68, 0.68]) {
    const cg = new THREE.ConeGeometry(2.4, 16, 16, 1, true); cg.translate(0, -8, 0); cg.rotateX(-Math.PI / 2 - 0.04);
    const beam = new THREE.Mesh(cg, beamM); beam.position.set(x, 0.66, 2.26); g.add(beam);
  }
  // 輪子
  const rim = new THREE.MeshStandardNodeMaterial({ color: 0xb8bec8, metalness: 0.85, roughness: 0.25 });
  const wheels = [];
  for (const [x, z] of [[-0.9, 1.4], [0.9, 1.4], [-0.9, -1.35], [0.9, -1.35]]) {
    const w = new THREE.Group(); w.position.set(x, 0.36, z);
    w.add(new THREE.Mesh(G.wheel, dark), new THREE.Mesh(G.hub, rim)); g.add(w); wheels.push(w);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  under.castShadow = false; g.traverse((o) => { if (o.material === beamM) o.castShadow = false; });
  g.userData = { wheels, brake };
  if (ghost) {
    // 幽靈車：半透明、發一點藍光，不投影子
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material === beamM || o.material === ao) { o.visible = false; return; }   // 幽靈沒有光束和影子
      o.castShadow = false; o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.3; o.material.depthWrite = false;
      if (o.material.isMeshStandardMaterial) o.material.emissiveNode = vec3(0.2, 0.5, 1).mul(0.25);
    });
  }
  if (lights) {
    // 玩家的車：真的車燈（投射陰影）
    const spot = new THREE.SpotLight(0xfff3dd, 240, 70, 0.55, 0.45, 1.3);
    spot.position.set(0, 0.8, 2.6); const tgt = new THREE.Object3D(); tgt.position.set(0, -0.6, 22); g.add(spot, tgt); spot.target = tgt;
    g.userData.spot = spot;
    // 車內（車內視角才看得到）：儀表板、方向盤、車門內側、車頂內襯、A 柱
    const inner = new THREE.Group(); inner.visible = false;
    const trim = new THREE.MeshStandardNodeMaterial({ color: 0x202228, roughness: 0.7 });
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.5), trim); dash.position.set(0, 0.8, 0.85);
    const gauges = new THREE.MeshStandardNodeMaterial({ color: 0x000000 }); gauges.emissiveNode = vec3(0.2, 0.85, 1).mul(1.6);
    const gz = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.09), gauges); gz.position.set(-0.38, 0.915, 0.66); gz.rotation.x = -1.2;
    const wheelG = new THREE.Group(); wheelG.position.set(-0.38, 0.9, 0.45); wheelG.rotation.x = -0.45;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 6, 20), trim);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), trim);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), new THREE.MeshBasicNodeMaterial({ color: 0xff3a3a })); mark.position.y = 0.16;
    wheelG.add(ring, spoke, mark);
    const doors = [-1, 1].map((s) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 2.0), trim); d.position.set(s * 0.86, 0.9, -0.1); return d; });
    const liner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.8), trim); liner.position.set(0, 1.26, -0.5);
    const pillars = [-1, 1].map((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), trim); p.position.set(s * 0.8, 1.06, 0.63); p.rotation.x = 0.5; return p; });
    inner.add(dash, gz, wheelG, ...doors, liner, ...pillars);
    g.add(inner);
    g.userData.inner = inner; g.userData.steerWheel = wheelG;
    void stripe;
  }
  return g;
}

// ---------------------------------------------------------------- 物理
const VMAX = 56;        // 公尺／秒（約 200 km/h）
export class Car {
  constructor(track, mesh, { ai = null, startIdx = 0, lane = 0 } = {}) {
    this.track = track; this.mesh = mesh; this.ai = ai;
    const p = track.ahead(startIdx, 0, lane);
    this.pos = new THREE.Vector3(p.x, 0, p.z);
    const t = track.Tn[startIdx];
    this.hd = Math.atan2(t.x, t.z);
    this.vel = new THREE.Vector3(); this.speed = 0; this.slip = 0; this.idx = startIdx; this.steer = 0;
    this.lap = 0; this.dist = 0; this.lapStart = 0; this.lapTimes = []; this.finished = false; this.halfway = false;
    this.input = { gas: 0, brake: 0, steer: 0, hand: 0 };
    this.vmax = VMAX; this.hit = 0; this.inPuddle = 0;
    if (ai) { this.laneOff = lane; this.laneT = Math.random() * 10; }
    this.place();
  }
  // 現在在賽道上的總距離（圈數＋這圈的位置）
  get progress() { return this.lap * this.track.length + this.track.S[this.idx]; }

  update(dt, wet, puddleAt, t) {
    const tr = this.track, inp = this.input;
    if (this.ai && !this.finished) this.drive(dt, wet);
    const fwd = new THREE.Vector3(Math.sin(this.hd), 0, Math.cos(this.hd));
    let sp = this.vel.dot(fwd);
    // 油門、煞車、倒車
    let acc = 0;
    if (inp.gas > 0) acc += 15 * inp.gas * Math.max(0, 1 - sp / this.vmax);
    if (inp.brake > 0) acc -= sp > 0.5 ? 26 * inp.brake : 7 * inp.brake * Math.max(0, 1 + sp / 12);
    acc -= sp * 0.06 + Math.sign(sp) * 0.4 * (inp.gas ? 0 : 1);
    sp += acc * dt;
    // 轉向：速度越快能轉越少
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 8);
    const turn = this.steer * 1.9 * Math.min(1, Math.abs(sp) / 8) * (1 - 0.42 * Math.min(1, Math.abs(sp) / VMAX)) * Math.sign(sp || 1);
    this.hd -= turn * dt * (inp.hand ? 1.35 : 1);
    // 抓地力：車子的速度往車頭方向靠攏；濕地、水窪、手煞車都會比較滑
    this.inPuddle = puddleAt(this.pos);
    let grip = 7.5 * (1 - 0.28 * wet) * (1 - 0.45 * this.inPuddle);
    if (inp.hand) grip *= 0.22;
    const nf = new THREE.Vector3(Math.sin(this.hd), 0, Math.cos(this.hd));
    // 前後方向：直接加速；左右方向（側滑）：靠抓地力慢慢消掉
    const vf = this.vel.dot(nf) + (sp - this.vel.dot(fwd));
    const side = this.vel.clone().addScaledVector(nf, -this.vel.dot(nf)).multiplyScalar(Math.max(0, 1 - grip * dt));
    this.vel.copy(nf).multiplyScalar(vf).add(side);
    this.slip = side.length();
    this.pos.addScaledVector(this.vel, dt);
    // 護欄
    this.idx = tr.nearest(this.pos, this.idx);
    const lat = tr.lateral(this.pos, this.idx), lim = ROAD_W / 2 + 1.3 - 1.05;
    this.hit = Math.max(0, this.hit - dt);
    if (Math.abs(lat) > lim) {
      const N = tr.Nn[this.idx], s = Math.sign(lat);
      this.pos.addScaledVector(N, (lim - Math.abs(lat)) * s);
      const vn = this.vel.dot(N);
      if (vn * s > 0) { this.vel.addScaledVector(N, -vn * 1.35); this.vel.multiplyScalar(0.86); if (Math.abs(vn) > 4) this.hit = 0.3 + Math.min(0.7, Math.abs(vn) / 20); }
    }
    this.speed = this.vel.dot(nf);
    // 圈數
    const s = tr.S[this.idx];
    if (s > tr.length * 0.45 && s < tr.length * 0.55) this.halfway = true;
    if (this.halfway && s < 40 && this.prevS > tr.length - 60) {
      this.halfway = false; this.lap++; this.lapTimes.push(t - this.lapStart); this.lapStart = t;
      if (this.onLap) this.onLap(this);
    }
    this.prevS = s;
    this.place(dt);
  }

  place(dt = 0) {
    const m = this.mesh;
    m.position.copy(this.pos);
    m.rotation.set(0, this.hd, 0);
    m.rotateZ(-this.steer * Math.min(1, Math.abs(this.speed) / 30) * 0.05);
    const ud = m.userData;
    if (ud.wheels) {
      const spin = (this.speed * dt) / 0.36;
      ud.wheels.forEach((w, i) => { w.children[0].rotation.x += spin; w.children[1].rotation.x += spin; if (i < 2) w.rotation.y = -this.steer * 0.45; });
      if (ud.steerWheel) ud.steerWheel.rotation.z = this.steer * 1.6;
      ud.brake.value = this.input.brake > 0 ? 1 : 0;
    }
  }

  // ---------------- 電腦車手：看前面的彎道決定速度，往前方的目標點打方向盤
  drive(dt, wet) {
    const tr = this.track, ai = this.ai;
    this.laneT = (this.laneT || 0) + dt * 0.25; this.laneOff = this.laneOff || 0;
    const lane = this.laneOff * 0.6 + Math.sin(this.laneT) * 1.6;
    // 前面 15～70 公尺最彎的地方決定要開多快
    // 前面每一段的過彎速度，加上「來得及煞車」的距離，取最小的
    const latA = ai.grip * (1 - 0.2 * wet);
    let vt = this.vmax * ai.top;
    for (let m = 0; m <= 90; m += 4.5) {
      const k = tr.K[(this.idx + Math.round(m / 1.5)) % tr.n];
      const vc = Math.sqrt(latA / Math.max(k, 1e-4));
      vt = Math.min(vt, Math.sqrt(vc * vc + 2 * 13 * m));
    }
    const tgt = tr.ahead(this.idx, 9 + Math.abs(this.speed) * 0.45, lane);
    const want = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    let d = want - this.hd; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.input.steer = Math.max(-1, Math.min(1, -d * 2.4));
    const dv = vt - this.speed;
    this.input.gas = dv > 0 ? Math.min(1, dv / 4) : 0;
    this.input.brake = dv < -2 ? Math.min(1, -dv / 8) : 0;
    this.input.hand = 0;
  }
}

// 車子互相碰撞：推開＋交換一點速度
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j], d = b.pos.clone().sub(a.pos), L = d.length();
    if (L < 2.4 && L > 0.01) {
      d.divideScalar(L); const push = (2.4 - L) / 2;
      a.pos.addScaledVector(d, -push); b.pos.addScaledVector(d, push);
      const rel = b.vel.clone().sub(a.vel).dot(d);
      if (rel < 0) { a.vel.addScaledVector(d, rel * 0.5); b.vel.addScaledVector(d, -rel * 0.5); a.bump = b.bump = Math.min(1, -rel / 10); }
    }
  }
}

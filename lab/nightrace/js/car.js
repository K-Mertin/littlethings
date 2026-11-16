// 車子：外形（程式拼的小跑車）、街機式物理（濕地抓地力比較差、水窪更滑、手煞車甩尾）、電腦車手
import * as THREE from 'three';
import { vec3, uniform } from 'three/tsl';
import { ROAD_W } from './track.js';

export const CAR_COLORS = [0xffcf2e, 0xff4d6d, 0x3fa9ff, 0x7dff6a, 0xff8a2b, 0xc77dff, 0xf5f5f5, 0x2be6d2];

export function carMesh(color, { lights = false } = {}) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.25, metalness: 0.55 });
  const dark = new THREE.MeshStandardNodeMaterial({ color: 0x15161a, roughness: 0.6 });
  const glass = new THREE.MeshStandardNodeMaterial({ color: 0x1b2a3a, roughness: 0.05, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.3), paint); body.position.y = 0.55;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.3, 0.9), paint); nose.position.set(0, 0.42, 2.3);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.0), glass); cab.position.set(0, 1.05, -0.25);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.5), paint); roof.position.set(0, 1.32, -0.35);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), dark); wing.position.set(0, 1.12, -2.0);
  const wl = [-0.75, 0.75].map((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.3), dark); p.position.set(x, 0.92, -2.0); return p; });
  g.add(body, nose, cab, roof, wing, ...wl);
  // 車燈：前白、後紅（煞車時更亮）
  const brake = uniform(0);
  const head = new THREE.MeshStandardNodeMaterial({ color: 0xffffff }); head.emissiveNode = vec3(1, 0.97, 0.88).mul(9);
  const tail = new THREE.MeshStandardNodeMaterial({ color: 0x550000 }); tail.emissiveNode = vec3(1, 0.06, 0.04).mul(brake.mul(9).add(3));
  for (const x of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), head); h.position.set(x, 0.58, 2.76); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.06), tail); t.position.set(x, 0.66, -2.16); g.add(t);
  }
  // 輪子
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14); wg.rotateZ(Math.PI / 2);
  const rim = new THREE.MeshStandardNodeMaterial({ color: 0x9aa0aa, metalness: 0.8, roughness: 0.3 });
  const wheels = [];
  for (const [x, z] of [[-0.92, 1.45], [0.92, 1.45], [-0.92, -1.35], [0.92, -1.35]]) {
    const w = new THREE.Group(); w.position.set(x, 0.36, z);
    const tire = new THREE.Mesh(wg, dark); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8).rotateZ(Math.PI / 2), rim);
    w.add(tire, hub); g.add(w); wheels.push(w);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  g.userData = { wheels, brake };
  if (lights) {
    // 玩家的車：真的車燈（投射陰影）
    const spot = new THREE.SpotLight(0xfff3dd, 240, 70, 0.55, 0.45, 1.3);
    spot.position.set(0, 0.8, 2.6); const tgt = new THREE.Object3D(); tgt.position.set(0, -0.6, 22); g.add(spot, tgt); spot.target = tgt;
    g.userData.spot = spot;
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

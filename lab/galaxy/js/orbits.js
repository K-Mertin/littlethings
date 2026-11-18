// 軌道任務：太陽系尺度的小模擬（CPU，幾個天體），在 xz 平面上，鏡頭從上往下看
// 玩法：在要發射的東西上按住、往後拉（像彈弓），放開就發射；拉的時候會畫出預測軌道。
import * as THREE from 'three';
import { vec3, uv, smoothstep, mix, billboarding, float } from 'three/tsl';

const EPS2 = 0.09;
const V2 = (x, z) => new THREE.Vector3(x, 0, z);

function glowSprite(color, size, k = 3) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const c = new THREE.Color(color), f = smoothstep(0.5, 0.0, uv().sub(0.5).length());
  m.colorNode = vec3(c.r, c.g, c.b).mul(f.pow(2.4).mul(k));
  m.opacityNode = f;
  m.vertexNode = billboarding();
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); s.scale.setScalar(size); s.renderOrder = 2;
  return s;
}
function ball(color, r, emissive = 0.25) {
  const m = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.6 });
  const c = new THREE.Color(color); m.emissiveNode = vec3(c.r, c.g, c.b).mul(emissive);
  return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
}
function line(color, n, opacity = 1) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setDrawRange(0, 0);
  const l = new THREE.Line(g, new THREE.LineBasicNodeMaterial({ color, transparent: opacity < 1, opacity })); l.frustumCulled = false;
  return l;
}
function setLine(l, pts) {
  const a = l.geometry.attributes.position, n = Math.min(pts.length, a.count);
  for (let i = 0; i < n; i++) a.setXYZ(i, pts[i].x, 0.05, pts[i].z);
  a.needsUpdate = true; l.geometry.setDrawRange(0, n);
}

export class Orbits {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    const sun = new THREE.PointLight(0xfff0d0, 3, 0, 0); this.group.add(sun); this.sunLight = sun;
    this.group.add(new THREE.AmbientLight(0x8090b0, 0.6));
  }

  load(M) {
    this.M = M;
    for (const c of [...this.group.children]) if (!c.isLight) this.group.remove(c);
    this.bodies = M.bodies.map((b) => {
      const o = new THREE.Group(); o.add(ball(b.color, b.r, b.glow ? 1.6 : 0.2));
      if (b.glow) o.add(glowSprite(b.color, b.r * 9, 2.2));
      this.group.add(o);
      const label = makeLabel(b.name); label.position.set(0, 0, b.r + 2.2); o.add(label);
      return { ...b, o, p: V2(0, 0), v: V2(0, 0) };
    });
    const P = M.player;
    this.pObj = new THREE.Group(); this.pObj.add(ball(P.color, P.r, 0.5)); this.pObj.add(glowSprite(P.color, P.r * 6, 1.2));
    this.group.add(this.pObj);
    this.trail = line(P.color, 6000, 0.85); this.group.add(this.trail);
    this.pred = line(0xffffff, 1500, 0.35); this.group.add(this.pred);
    this.arrow = line(0xffd447, 2); this.group.add(this.arrow);
    // 起點的拉動提示圈
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 40), new THREE.MeshBasicNodeMaterial({ color: 0xffd447, transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2; this.handle = ring; this.group.add(ring);
    if (M.ring) {
      const r = new THREE.Mesh(new THREE.RingGeometry(M.ring - 0.15, M.ring + 0.15, 96), new THREE.MeshBasicNodeMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.45 }));
      r.rotation.x = -Math.PI / 2; this.group.add(r);
    }
    if (P.comet) {
      // 彗星尾巴：一片朝「背對太陽」方向拉長的漸層
      const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const u = uv();
      m.colorNode = mix(vec3(0.2, 0.4, 1), vec3(0.7, 0.92, 1), u.y).mul(u.y.pow(1.5)).mul(smoothstep(0.5, 0.0, u.x.sub(0.5).abs())).mul(1.6);   // uv.y = 1 在彗星那一頭
      m.opacityNode = u.y;
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0, 0.5);   // 從原點往 +z 長出去
      this.tail = new THREE.Mesh(g, m); this.group.add(this.tail);
    } else this.tail = null;
    this.reset();
  }

  reset() {
    const M = this.M;
    this.t = 0; this.phase = 'aim'; this.result = null;
    this.placeBodies(0);
    // 多顆行星（設計太陽系）：已經發射出去的放在 extra，繼續跟著模擬
    for (const e of this.extra || []) { this.group.remove(e.obj); this.group.remove(e.trail); }
    this.extra = []; this.k = 0; this.lost = 0;
    if (M.multi) { const c0 = M.colors[0]; this.pObj.clear(); this.pObj.add(ball(c0, M.player.r, 0.5)); this.pObj.add(glowSprite(c0, M.player.r * 6, 1.2)); this.trail.material.color.set(c0); }
    this.p = V2(...(M.multi ? M.multi[0] : M.player.pos)); this.v = V2(0, 0); this.v0 = 0;
    this.aimV = null; this.sweep = 0; this.sweepRel = 0; this.minR = Infinity; this.maxR = 0;
    this.trailPts = [this.p.clone()]; setLine(this.trail, this.trailPts); setLine(this.pred, []); setLine(this.arrow, []);
    this.pObj.position.copy(this.p); this.handle.visible = true; this.handle.position.copy(this.p).setY(0.02);
    if (this.tail) this.tail.visible = false;
  }

  placeBodies(t) {
    for (const b of this.bodies) {
      if (b.rail) { const [x, z, vx, vz] = b.rail(t); b.p.set(x, 0, z); b.v.set(vx, 0, vz); }
      b.o.position.copy(b.p);
    }
  }
  body(id) { return this.bodies.find((b) => b.id === id); }
  rel() { return this.M.player.relTo ? this.body(this.M.player.relTo) : null; }

  accAt(p, t, out) {
    out.set(0, 0, 0);
    for (const b of this.bodies) {
      let bx = b.p.x, bz = b.p.z;
      if (b.rail) { const r = b.rail(t); bx = r[0]; bz = r[1]; }
      const dx = bx - p.x, dz = bz - p.z, r2 = dx * dx + dz * dz + EPS2, k = b.gm / (r2 * Math.sqrt(r2));
      out.x += dx * k; out.z += dz * k;
    }
    return out;
  }

  // 拉動：drag 是「從物體指到手指」的向量（世界座標），發射方向相反
  aim(drag) {
    if (this.phase !== 'aim') return;
    const max = this.M.player.max, k = 0.32;
    const v = drag.clone().multiplyScalar(-k);
    if (v.length() > max) v.setLength(max);
    this.aimV = v;
    const base = this.rel() ? this.rel().v.clone() : V2(0, 0);
    const vel = v.clone().add(base);
    // 預測線：往後模擬 1400 步
    const pts = [], p = this.p.clone(), vv = vel.clone(), a = new THREE.Vector3(), h = 1 / 30;
    let t = this.t;
    for (let i = 0; i < 1400; i++) {
      this.accAt(p, t, a); vv.addScaledVector(a, h); p.addScaledVector(vv, h); t += h;
      if (i % 2 === 0) pts.push(p.clone());
      if (this.bodies.some((b) => { const r = b.rail ? b.rail(t) : [b.p.x, b.p.z]; return Math.hypot(r[0] - p.x, r[1] - p.z) < b.r; }) || p.length() > 200) break;
    }
    setLine(this.pred, pts);
    setLine(this.arrow, [this.p, this.p.clone().addScaledVector(v.clone().normalize(), 3 + v.length() * 2)]);
    return v.length();
  }
  cancelAim() { this.aimV = null; setLine(this.pred, []); setLine(this.arrow, []); }

  launch() {
    if (this.phase !== 'aim' || !this.aimV || this.aimV.length() < 0.05) { this.cancelAim(); return false; }
    const base = this.rel() ? this.rel().v.clone() : V2(0, 0);
    this.v = this.aimV.clone().add(base); this.v0 = this.aimV.length();
    setLine(this.arrow, []);
    const M = this.M;
    if (M.multi && (M.sandbox ? this.extra.length < 11 : this.k < M.multi.length - 1)) {
      // 這顆變成「已發射」，下一顆在下一個起點等著
      const col = M.colors[this.k % M.colors.length];
      const obj = new THREE.Group(); obj.add(ball(col, M.player.r, 0.5)); obj.add(glowSprite(col, M.player.r * 6, 1.2)); obj.position.copy(this.p); this.group.add(obj);
      const trail = line(col, 3000, 0.7); this.group.add(trail);
      this.extra.push({ p: this.p.clone(), v: this.v.clone(), obj, trail, pts: [this.p.clone()], sweep: 0, dead: false });
      this.k++;
      const nc = M.colors[this.k % M.colors.length];
      this.pObj.clear(); this.pObj.add(ball(nc, M.player.r, 0.5)); this.pObj.add(glowSprite(nc, M.player.r * 6, 1.2));
      this.p = V2(...M.multi[this.k % M.multi.length]); this.v.set(0, 0, 0); this.aimV = null;
      this.pObj.position.copy(this.p); this.handle.position.copy(this.p).setY(0.02);
      this.trailPts = [this.p.clone()]; setLine(this.trail, this.trailPts); this.trail.material.color.set(nc);
      setLine(this.pred, []);
      return true;
    }
    this.phase = 'fly'; this.handle.visible = false;
    return true;
  }
  // 已發射的行星：一起受重力，掉進太陽或飛走就消失
  stepExtra(dt) {
    const sub = 8, h = dt / sub, a = new THREE.Vector3();
    const wrap = (d) => (d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d);
    for (const e of this.extra) {
      if (e.dead) continue;
      for (let k = 0; k < sub; k++) {
        const a0 = Math.atan2(e.p.z, e.p.x);
        this.accAt(e.p, this.t + h * k, a); e.v.addScaledVector(a, h); e.p.addScaledVector(e.v, h);
        e.sweep += wrap(Math.atan2(e.p.z, e.p.x) - a0);
      }
      const r = e.p.length();
      if (r < 3.6 || r > 90) { e.dead = r < 3.6 ? 'sun' : 'away'; e.obj.visible = false; this.lost++; continue; }
      e.obj.position.copy(e.p);
      const last = e.pts[e.pts.length - 1];
      if (last.distanceTo(e.p) > 0.3) { e.pts.push(e.p.clone()); if (e.pts.length > 3000) e.pts.shift(); setLine(e.trail, e.pts); }
    }
  }
  // 設計太陽系的勝負：全部的行星都要活著，而且每一顆都繞了 2 圈
  multiCheck() {
    const M = this.M;
    const dead = this.extra.find((e) => e.dead);
    if (M.sandbox) return null;
    if (dead) return { lose: dead.dead === 'sun' ? '有一顆行星掉進太陽了！' : '有一顆行星飛出太陽系了！' };
    if (this.phase !== 'fly') return null;
    const r = this.p.length();
    if (r < 3.6) return { lose: '最後一顆掉進太陽了！' };
    if (r > 90) return { lose: '最後一顆飛出太陽系了！' };
    const need = Math.PI * 2 * (M.laps || 2);
    if (Math.abs(this.sweep) >= need && this.extra.every((e) => Math.abs(e.sweep) >= need)) return { win: `${M.multi.length} 顆行星都穩穩地繞著太陽轉！你設計了一個太陽系。` };
    return null;
  }
  stable() { return this.extra.filter((e) => !e.dead && Math.abs(e.sweep) >= Math.PI * 2).length + (this.phase === 'fly' && Math.abs(this.sweep) >= Math.PI * 2 ? 1 : 0); }

  // dt：模擬時間
  update(dt) {
    if (this.M.multi && this.extra.length && this.phase !== 'done') {
      this.stepExtra(dt);
      if (this.phase === 'aim') { this.t += dt; this.placeBodies(this.t); const res = this.multiCheck(); if (res) { this.phase = 'done'; this.result = res; } return res; }
    }
    if (this.phase === 'aim') { this.placeBodies(this.t); return null; }
    if (this.phase !== 'fly') return null;
    const sub = 8, h = dt / sub, a = new THREE.Vector3();
    for (let k = 0; k < sub; k++) {
      const ang0 = Math.atan2(this.p.z, this.p.x);
      const rb = this.rel(), relAng0 = rb ? Math.atan2(this.p.z - rb.p.z, this.p.x - rb.p.x) : 0;
      this.accAt(this.p, this.t, a); this.v.addScaledVector(a, h); this.p.addScaledVector(this.v, h); this.t += h;
      this.placeBodies(this.t);
      const wrap = (d) => (d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d);
      this.sweep += wrap(Math.atan2(this.p.z, this.p.x) - ang0);
      if (rb) this.sweepRel += wrap(Math.atan2(this.p.z - rb.p.z, this.p.x - rb.p.x) - relAng0);
      this.minR = Math.min(this.minR, this.p.length()); this.maxR = Math.max(this.maxR, this.p.length());
    }
    const last = this.trailPts[this.trailPts.length - 1];
    if (last.distanceTo(this.p) > 0.25) { this.trailPts.push(this.p.clone()); if (this.trailPts.length > 6000) this.trailPts.shift(); setLine(this.trail, this.trailPts); }
    this.pObj.position.copy(this.p);
    if (this.tail) {
      const r = this.p.length(), k = Math.min(1, 240 / (r * r));
      this.tail.visible = k > 0.03;
      this.tail.position.copy(this.p);
      this.tail.rotation.y = Math.atan2(this.p.x, this.p.z);   // +z 指向背對太陽
      this.tail.scale.set(0.8 + k * 2.5, 1, 2 + k * 26);
    }
    const st = { p: this.p, v: this.v, v0: this.v0, t: this.t, sweep: Math.abs(this.sweep), sweepRel: Math.abs(this.sweepRel), minR: this.minR, maxR: this.maxR, body: (id) => this.body(id) };
    const res = this.M.multi ? this.multiCheck() : this.M.check(st);
    if (res) { this.phase = 'done'; this.result = res; }
    return res;
  }

  // 現在的狀態（給測試）
  info() { return { phase: this.phase, t: +this.t.toFixed(1), sweep: +Math.abs(this.sweep).toFixed(2), sweepRel: +Math.abs(this.sweepRel).toFixed(2), minR: +this.minR.toFixed(1), speed: +this.v.length().toFixed(2), r: +this.p.length().toFixed(1) }; }
}

// 天體名字的小標籤（canvas 貼圖）
function makeLabel(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.font = 'bold 34px system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicNodeMaterial({ map: tex, transparent: true, depthWrite: false });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.25), m); s.rotation.x = -Math.PI / 2;
  return s;
}

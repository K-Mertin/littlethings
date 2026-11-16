// 大量行人（WebGPU 版大街）
// 一般做法每個路人都要在 CPU 上算骨架動畫，十個就很吃力。這裡改成：
// 1. 開場時把男生、女生角色的「走路」和「待機」動作，一格一格算好每個頂點的位置和法線，存成貼圖（頂點動畫貼圖，VAT）。
//    身體和衣服先用 meshoptimizer 減面，貼圖只存用得到的頂點。
// 2. 每個路人的位置、方向、速度、要不要停下來看櫥窗，全部在 GPU 的 compute shader 裡算（也會互相讓路、讓開玩家）。
// 3. 畫的時候一個部位一次 draw call 畫完所有人（instancing），頂點從動畫貼圖讀，再依各自的位置、方向擺好；衣服、頭髮顏色每個人不一樣。
// CPU 每 0.25 秒把路人位置讀回來一次，只用來讓玩家撞到人會被擋住。
import * as THREE from 'three';
import {
  Fn, uniform, float, int, ivec2, vec2, vec3, vec4, attribute, textureLoad, instancedArray, instanceIndex, hash, deltaTime, If, Loop,
  normalLocal, mix, clamp, cos, sin, sign, abs, max, min, select, materialColor, smoothstep, floor, fract, mod, atan, PI, time,
} from 'three/tsl';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const W = 1024;              // 動畫貼圖寬度
const CLIPS = [['walk', 24], ['idle', 24]];
// 走路的路線（x 範圍）：避開中間的花台長椅、兩側的路燈
const LANES = [[-7.3, -6.0], [-4.6, -2.5], [2.5, 4.6], [6.0, 7.3]];
const Z0 = 8.5, Z1 = 58.5;

// ------------------------------------------------------------------ 烘焙
async function bake(gltf, Character, high) {
  await MeshoptSimplifier.ready;
  const ch = new Character(gltf);
  const root = ch.root;
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const kind = o.material.userData.kind;
    if (kind === 'eyes' || kind === 'brow' || kind === 'lash') return;   // 遠遠看不到，省掉
    const shoes = /shoes/.test(o.material.name);
    parts.push({ mesh: o, kind: shoes ? 'shoes' : kind });
  });
  // 減面＋只留用得到的頂點
  for (const p of parts) {
    const g = p.mesh.geometry;
    let idx = new Uint32Array(g.index.array);
    const pos = g.attributes.position.array instanceof Float32Array ? g.attributes.position.array : new Float32Array(g.attributes.position.array);
    const ratio = p.kind === 'skin' ? (high ? 0.32 : 0.22) : p.kind === 'cloth' ? (high ? 0.45 : 0.3) : 1;
    if (ratio < 1) {
      const target = Math.floor(idx.length * ratio / 3) * 3;
      idx = MeshoptSimplifier.simplify(idx, pos, 3, target, 0.02, ['LockBorder'])[0];
    }
    const [remap, count] = MeshoptSimplifier.compactMesh(idx);   // idx 改寫成新編號；remap[舊] = 新
    const src = new Int32Array(count);                            // src[新] = 舊
    for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) src[remap[i]] = i;
    p.src = src; p.count = count; p.index = idx;
  }
  // 一格一格算頂點位置與法線
  const mixer = ch.mixer, acts = ch.actions;
  let frames = 0; const clipInfo = {};
  for (const [name, n] of CLIPS) { clipInfo[name] = { start: frames, n, dur: acts[name].getClip().duration }; frames += n; }
  for (const p of parts) {
    p.rows = Math.ceil(p.count / W);
    p.pos = new Float32Array(W * p.rows * frames * 4);
    p.nrm = new Float32Array(W * p.rows * frames * 4);
  }
  const v = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3(), m3 = new THREE.Matrix3();
  for (const [name, nf] of CLIPS) {
    for (const k of Object.keys(acts)) { acts[k].setEffectiveWeight(k === name ? 1 : 0); acts[k].enabled = k === name; }
    const info = clipInfo[name];
    for (let f = 0; f < nf; f++) {
      acts[name].time = (f / nf) * info.dur;
      mixer.update(0);
      root.updateMatrixWorld(true);
      for (const p of parts) {
        const mesh = p.mesh, g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal;
        m3.getNormalMatrix(mesh.matrixWorld);
        const base = (info.start + f) * p.rows * W * 4;
        for (let i = 0; i < p.count; i++) {
          const s = p.src[i];
          b.fromBufferAttribute(P, s);
          v.copy(b); mesh.applyBoneTransform(s, v); v.applyMatrix4(mesh.matrixWorld);
          n.fromBufferAttribute(N, s).multiplyScalar(0.02).add(b); mesh.applyBoneTransform(s, n); n.applyMatrix4(mesh.matrixWorld);
          n.sub(v).normalize();
          const o = base + i * 4;
          p.pos[o] = v.x; p.pos[o + 1] = v.y; p.pos[o + 2] = v.z; p.pos[o + 3] = 1;
          p.nrm[o] = n.x; p.nrm[o + 1] = n.y; p.nrm[o + 2] = n.z; p.nrm[o + 3] = 0;
        }
      }
      if ((f & 3) === 3) await new Promise((r) => setTimeout(r, 0));   // 讓畫面有機會更新進度
    }
  }
  // 貼圖與幾何
  for (const p of parts) {
    const mk = (data) => { const t = new THREE.DataTexture(data, W, p.rows * frames, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true; return t; };
    p.posTex = mk(p.pos); p.nrmTex = mk(p.nrm); p.pos = p.nrm = null;
    const g = new THREE.BufferGeometry();
    const uvSrc = p.mesh.geometry.attributes.uv, uvs = new Float32Array(p.count * 2), vid = new Float32Array(p.count), dummy = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { uvs[i * 2] = uvSrc.getX(p.src[i]); uvs[i * 2 + 1] = uvSrc.getY(p.src[i]); vid[i] = i; }
    g.setAttribute('position', new THREE.BufferAttribute(dummy, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(p.count * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setAttribute('vid', new THREE.BufferAttribute(vid, 1));
    g.setIndex(new THREE.BufferAttribute(p.index, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 30, 0), 60);
    p.geo = g;
  }
  return { parts, clipInfo, frames, speeds: gltf.scene.userData.speeds || { walk: 1.05 } };
}

// ------------------------------------------------------------------ 群眾
export class Crowd {
  constructor({ renderer, scene, high, webgpu }) {
    Object.assign(this, { renderer, scene, high, webgpu });
    this.max = webgpu ? (high ? 220 : 90) : 48;
    this.u = { player: uniform(new THREE.Vector3(0, 0, 999)), nb: uniform(0), ng: uniform(0), half: uniform(0) };
    this.meshes = [];
    this.positions = new Float32Array(0);
  }
  async build(avatars, Character, onProgress) {
    const N = this.max;
    const S = this.state = instancedArray(N, 'vec4');   // x, z, heading, speed
    const T = this.ctrl = instancedArray(N, 'vec4');    // dir(±1), laneX, pause, walkPhase
    const A = this.anim = instancedArray(N, 'vec4');    // idlePhase, walkWeight, targetHeading, scale
    const u = this.u;
    const half = Math.ceil(N / 2);
    u.half.value = half;
    // 有在畫的才模擬：男生 [0, nb)、女生 [half, half + ng)
    const active = (j) => j.lessThan(u.nb).or(j.greaterThanEqual(u.half).and(j.lessThan(u.half.add(u.ng))));
    // 初始：隨機的路線、位置、速度
    this.init = Fn(() => {
      const i = instanceIndex, s = S.element(i), t = T.element(i), a = A.element(i);
      const r1 = hash(i.add(11)), r2 = hash(i.add(23)), r3 = hash(i.add(37)), r4 = hash(i.add(51));
      const lane = floor(r1.mul(4));
      const lo = select(lane.lessThan(1), float(LANES[0][0]), select(lane.lessThan(2), float(LANES[1][0]), select(lane.lessThan(3), float(LANES[2][0]), float(LANES[3][0]))));
      const hi = select(lane.lessThan(1), float(LANES[0][1]), select(lane.lessThan(2), float(LANES[1][1]), select(lane.lessThan(3), float(LANES[2][1]), float(LANES[3][1]))));
      const lx = mix(lo, hi, r2);
      const dir = select(r3.lessThan(0.5), float(-1), float(1));
      s.assign(vec4(lx, mix(float(Z0), float(Z1), r4), select(dir.greaterThan(0), float(0), float(Math.PI)), 0));
      t.assign(vec4(dir, lx, 0, r1.mul(9)));
      a.assign(vec4(r2.mul(9), 1, s.z, mix(0.93, 1.07, hash(i.add(77)))));
    })().compute(N);

    // 每一格：走路、轉身、停下來看櫥窗、讓路
    this.stepNode = Fn(() => {
      const i = instanceIndex, s = S.element(i), t = T.element(i), a = A.element(i);
      If(active(i), () => {
        const dt = min(deltaTime, 0.05);
        const x = s.x.toVar(), z = s.y.toVar();
        const speedWant = mix(0.95, 1.35, hash(i.add(91))).toVar();
        const pause = t.z.toVar(), dir = t.x.toVar(), lane = t.y.toVar();
        const rnd = hash(i.add(time.mul(7.13).floor()).add(1777));
        // 停下來（看櫥窗或等人）
        If(pause.greaterThan(0), () => { pause.subAssign(dt); speedWant.assign(0); })
          .ElseIf(rnd.lessThan(dt.mul(0.04)), () => { pause.assign(hash(i.add(time)).mul(5).add(2)); });
        // 走到盡頭：回頭，偶爾換一條路
        If(z.greaterThan(Z1).and(dir.greaterThan(0)), () => { dir.assign(-1); pause.assign(hash(i.add(time).add(5)).mul(2)); })
          .ElseIf(z.lessThan(Z0).and(dir.lessThan(0)), () => { dir.assign(1); pause.assign(hash(i.add(time).add(9)).mul(2)); });
        // 讓開玩家：玩家在前方 2 公尺內就往旁邊閃
        const px = u.player.x.sub(x), pz = u.player.z.sub(z);
        const ahead = pz.mul(dir);
        const sidestep = float(0).toVar();
        If(ahead.greaterThan(-0.3).and(ahead.lessThan(2.2)).and(abs(px).lessThan(0.9)), () => {
          sidestep.assign(select(px.greaterThan(0), float(-1), float(1)).mul(1.2));
          speedWant.mulAssign(0.6);
        });
        // 和其他路人保持距離（只看同方向、前面那個就放慢，旁邊太近就分開）
        const push = float(0).toVar(), slow = float(1).toVar();
        Loop(N, ({ i: j }) => {
          If(j.notEqual(i).and(active(j)), () => {
            const o = S.element(j);
            const dx = o.x.sub(x), dz = o.y.sub(z), d2 = dx.mul(dx).add(dz.mul(dz));
            If(d2.lessThan(0.64), () => { push.subAssign(sign(dx).mul(float(0.64).sub(d2))); });
            If(abs(dx).lessThan(0.45).and(dz.mul(dir).greaterThan(0)).and(dz.mul(dir).lessThan(1.1)), () => { slow.assign(min(slow, dz.mul(dir).div(1.1))); });
          });
        });
        speedWant.mulAssign(slow);
        const sp = s.w.add(speedWant.sub(s.w).mul(min(dt.mul(3), 1)));
        z.addAssign(dir.mul(sp).mul(dt));
        const wantX = lane.add(sidestep);
        x.addAssign(wantX.sub(x).mul(min(dt.mul(1.5), 1)).add(push.mul(dt).mul(2)));
        // 朝向：走的時候朝前；停下來看櫥窗時轉向最近的店
        const faceShop = select(x.greaterThan(0), float(Math.PI / 2), float(-Math.PI / 2));
        const tgt = select(pause.greaterThan(0.6).and(abs(x).greaterThan(5.5)), faceShop, select(dir.greaterThan(0), float(0), float(Math.PI)));
        const diff = mod(tgt.sub(a.z).add(Math.PI), Math.PI * 2).sub(Math.PI);
        const hd = a.z.add(diff.mul(min(dt.mul(4), 1)));
        // 動畫：走路的步伐跟著速度
        const walkPhase = t.w.add(dt.mul(sp).div(1.08));
        const idlePhase = a.x.add(dt.div(4));
        const ww = a.y.add(smoothstep(0.08, 0.5, sp).sub(a.y).mul(min(dt.mul(6), 1)));
        s.assign(vec4(x, z, hd, sp));
        t.assign(vec4(dir, lane, pause, fract(walkPhase)));
        a.assign(vec4(fract(idlePhase), ww, hd, a.w));
      });
    })().compute(N);
    this.renderer.compute(this.init);

    // 兩種角色各自烘焙
    const ids = ['boy', 'girl'];
    this.baked = {};
    for (let k = 0; k < ids.length; k++) {
      this.baked[ids[k]] = await bake(avatars[ids[k]], Character, this.high);
      onProgress && onProgress((k + 1) / ids.length);
    }
    // 衣服、頭髮顏色
    const shirts = [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0x16a085, 0xecf0f1, 0x34495e, 0xd35400, 0xff7eb6, 0x6d4c41].map((c) => new THREE.Color(c));
    const hairs = [0x1a1210, 0x2b1d14, 0x3d2817, 0x0e0e0e, 0x5a3a22, 0x7a5230].map((c) => new THREE.Color(c));
    const palette = (list, seed) => {
      const idx = floor(hash(instanceIndex.add(seed)).mul(list.length));
      let c = vec3(list[0].r, list[0].g, list[0].b);
      for (let q = 1; q < list.length; q++) c = select(idx.equal(q), vec3(list[q].r, list[q].g, list[q].b), c);
      return c;
    };
    this.split = half;
    ids.forEach((id, k) => {
      const B = this.baked[id], offset = k === 0 ? 0 : half;
      for (const p of B.parts) {
        const src = p.mesh.material;
        const mat = new THREE.MeshStandardNodeMaterial({
          map: src.map, color: src.color, roughness: src.roughness, metalness: src.metalness, normalMap: null,
          alphaTest: src.alphaTest, alphaToCoverage: src.alphaToCoverage, transparent: false, side: src.side, envMapIntensity: src.envMapIntensity,
        });
        const rowsPerFrame = p.rows;
        const pick = (tex, frame) => {
          const vid = int(attribute('vid', 'float'));
          return textureLoad(tex, ivec2(vid.mod(W), vid.div(W).add(int(frame).mul(rowsPerFrame)))).xyz;
        };
        const ii = instanceIndex.add(offset);
        mat.positionNode = Fn(() => {
          const s = S.element(ii), t = T.element(ii), a = A.element(ii);
          const wi = B.clipInfo.walk, id_ = B.clipInfo.idle;
          const wf = t.w.mul(wi.n), wf0 = floor(wf), wk = fract(wf);
          const if_ = a.x.mul(id_.n), if0 = floor(if_), ik = fract(if_);
          const w0 = wf0.add(wi.start), w1 = mod(wf0.add(1), wi.n).add(wi.start);
          const i0 = if0.add(id_.start), i1 = mod(if0.add(1), id_.n).add(id_.start);
          const pw = mix(pick(p.posTex, w0), pick(p.posTex, w1), wk), pi = mix(pick(p.posTex, i0), pick(p.posTex, i1), ik);
          const nw = mix(pick(p.nrmTex, w0), pick(p.nrmTex, w1), wk), ni = mix(pick(p.nrmTex, i0), pick(p.nrmTex, i1), ik);
          const lp = mix(pi, pw, a.y).mul(a.w), ln = mix(ni, nw, a.y).normalize();
          const c = cos(s.z), sn = sin(s.z);
          const rot = (q) => vec3(q.x.mul(c).add(q.z.mul(sn)), q.y, q.z.mul(c).sub(q.x.mul(sn)));
          normalLocal.assign(rot(ln));
          return rot(lp).add(vec3(s.x, 0, s.y));
        })();
        // 衣服只染淺色的部分（白上衣），牛仔褲之類深色的保留原色
        if (p.kind === 'cloth') { const lum = materialColor.dot(vec3(0.3, 0.59, 0.11)); mat.colorNode = mix(materialColor, materialColor.mul(palette(shirts, 400)).mul(1.15), smoothstep(0.35, 0.7, lum)); }
        if (p.kind === 'hair') mat.colorNode = materialColor.mul(palette(hairs, 900).mul(3.2));
        if (p.kind === 'skin') mat.colorNode = materialColor.mul(mix(0.82, 1.08, hash(ii.add(1300))));
        const mesh = new THREE.Mesh(p.geo, mat);
        mesh.count = k === 0 ? half : N - half;
        mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.part = { id, offset };
        this.scene.add(mesh); this.meshes.push(mesh);
      }
    });
  }
  setCount(n) {
    n = Math.min(this.max, n);
    // 男生用前半、女生用後半的名額，各畫 n/2 個
    const half = this.split, nb = Math.min(half, Math.ceil(n / 2)), ng = Math.min(this.max - half, Math.floor(n / 2));
    for (const m of this.meshes) { m.count = m.userData.part.offset === 0 ? nb : ng; m.visible = m.count > 0; }
    this.u.nb.value = nb; this.u.ng.value = ng;
    this._drawN = n;
  }
  update(dt, playerPos) {
    if (!this.stepNode || !this.meshes.length) return;
    this.u.player.value.copy(playerPos);
    this.renderer.compute(this.stepNode);
    // 每 0.25 秒把位置讀回來（給玩家碰撞用），不等它
    this._rb = (this._rb || 0) - dt;
    if (this._rb <= 0 && !this._reading) {
      this._rb = 0.25; this._reading = true;
      this.renderer.getArrayBufferAsync(this.state.value).then((buf) => { this.positions = new Float32Array(buf); this._reading = false; }).catch(() => { this._reading = false; });
    }
  }
  // 玩家碰撞：只看實際有畫出來的人
  forEachVisible(fn) {
    const P = this.positions, half = this.split, n = this._drawN || 0;
    if (!P.length) return;
    const nb = Math.min(half, Math.ceil(n / 2)), ng = Math.floor(n / 2);
    for (let i = 0; i < nb; i++) fn(P[i * 4], P[i * 4 + 1]);
    for (let i = half; i < half + ng; i++) fn(P[i * 4], P[i * 4 + 1]);
  }
}

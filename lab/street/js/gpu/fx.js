// 粒子特效（WebGPU 版大街）：全部在 GPU 的 compute shader 裡算，CPU 只送「玩家在哪、時間」這幾個數字
// - 落葉：從每棵行道樹的樹冠飄下來，左右搖擺、翻轉，落地後停一會兒再回到樹上
// - 噴水池：廣場左邊，上千顆水珠噴起、落回水池
// - 鴿子：廣場右邊一群鴿子在地上走來走去；玩家靠近就一起飛起來，在天上繞幾圈再降落
import * as THREE from 'three';
import {
  Fn, uniform, float, vec2, vec3, vec4, mix, smoothstep, hash, instancedArray, instanceIndex, deltaTime, If, uv, billboarding,
  positionGeometry, attribute, sin, cos, min, max, abs, length, normalize, time, fract, select, step, PI, atan, normalLocal, sign, cross, dot, int,
} from 'three/tsl';

const FOUNTAIN = new THREE.Vector3(-6.6, 0, 2.2);
const PIGEONS = new THREE.Vector3(6.4, 0, 2.0);

export class FX {
  constructor({ renderer, scene, world, high, webgpu, env }) {
    Object.assign(this, { renderer, scene, world, high, webgpu, env });
    this.u = { player: uniform(new THREE.Vector3(0, 0, 999)), wind: uniform(0.4), rain: env ? env.u.rain : uniform(0) };
    this.computes = [];
    this.leaves();
    this.fountain();
    this.pigeons();
  }

  // ------------------------------------------------------------ 落葉
  leaves() {
    const trees = this.world.gpu.trees;
    const N = this.webgpu ? (this.high ? 3000 : 1200) : 600;
    const T = trees.length;
    const treeArr = new Float32Array(T * 4); trees.forEach((t, i) => treeArr.set([t.x, t.y, t.z, 0], i * 4));
    const treeBuf = instancedArray(treeArr, 'vec4');
    const P = instancedArray(N, 'vec4');   // xyz, 落地後剩下的時間（<0 表示還在飄）
    const V = instancedArray(N, 'vec4');   // 旋轉軸 xyz、翻轉速度
    const u = this.u;
    const spawn = (i, p, seed) => {
      const tr = treeBuf.element(int(hash(i.add(seed)).mul(T - 0.001)));
      const a = hash(i.add(seed).add(1)).mul(Math.PI * 2), r = hash(i.add(seed).add(2)).mul(1.3);
      p.assign(vec4(tr.x.add(cos(a).mul(r)), tr.y.add(hash(i.add(seed).add(3)).mul(1.2).sub(0.4)), tr.z.add(sin(a).mul(r)), -1));
    };
    const init = Fn(() => {
      const i = instanceIndex, p = P.element(i), v = V.element(i);
      spawn(i, p, 0);
      p.y = p.y.sub(hash(i.add(9)).mul(4));   // 一開始就散在空中的各個高度
      v.assign(vec4(normalize(vec3(hash(i.add(4)).sub(0.5), hash(i.add(5)).sub(0.5), hash(i.add(6)).sub(0.5))), hash(i.add(7)).mul(5).add(2)));
    })().compute(N);
    const update = Fn(() => {
      const i = instanceIndex, p = P.element(i);
      const dt = min(deltaTime, 0.05);
      If(p.w.lessThan(0), () => {
        const ph = time.mul(1.7).add(hash(i).mul(20));
        p.x = p.x.add(sin(ph).mul(0.55).add(u.wind).mul(dt));
        p.z = p.z.add(cos(ph.mul(0.8)).mul(0.35).mul(dt));
        p.y = p.y.sub(mix(0.55, 2.2, u.rain).mul(dt));
        If(p.y.lessThan(0.012), () => { p.y = 0.012; p.w = hash(i.add(time)).mul(10).add(4); });
      }).Else(() => {
        p.w = p.w.sub(dt);
        If(p.w.lessThan(0), () => { spawn(i, p, time.mul(13.7).floor()); });
      });
    })().compute(N);
    this.renderer.compute(init); this.computes.push(update);

    const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.75 });
    const p = P.element(instanceIndex), v = V.element(instanceIndex);
    mat.positionNode = Fn(() => {
      // 在空中翻轉、落地後平躺
      const ang = select(p.w.lessThan(0), time.mul(v.w).add(hash(instanceIndex).mul(9)), float(Math.PI / 2));
      const ax = select(p.w.lessThan(0), v.xyz, vec3(1, 0, 0));
      const q = positionGeometry, c = cos(ang), s = sin(ang);
      const rq = q.mul(c).add(cross(ax, q).mul(s)).add(ax.mul(dot(ax, q)).mul(float(1).sub(c)));   // Rodrigues
      normalLocal.assign(vec3(0, 0, 1).mul(c).add(cross(ax, vec3(0, 0, 1)).mul(s)).add(ax.mul(ax.z).mul(float(1).sub(c))));
      return rq.add(p.xyz);
    })();
    const h = hash(instanceIndex.add(55));
    mat.colorNode = select(h.lessThan(0.45), vec3(0.42, 0.55, 0.16), select(h.lessThan(0.75), vec3(0.85, 0.6, 0.15), select(h.lessThan(0.92), vec3(0.75, 0.3, 0.1), vec3(1, 0.72, 0.8))));
    // 葉子形狀：橢圓
    mat.opacityNode = smoothstep(0.5, 0.45, uv().sub(0.5).mul(vec2(1, 1.7)).length());
    mat.alphaTest = 0.5;
    const g = new THREE.PlaneGeometry(0.09, 0.06);
    const m = new THREE.Mesh(g, mat); m.count = N; m.frustumCulled = false; m.castShadow = false;
    this.scene.add(m);
  }

  // ------------------------------------------------------------ 噴水池
  fountain() {
    const B = new THREE.Group(); B.position.copy(FOUNTAIN); this.scene.add(B);
    const stone = new THREE.MeshStandardNodeMaterial({ color: 0xb9b2a6, roughness: 0.7 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.45, 40, 1, true), stone); rim.position.y = 0.225;
    const rimTop = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.55, 40), stone); rimTop.rotation.x = -Math.PI / 2; rimTop.position.y = 0.451;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.45, 40, 1, true), stone); inner.position.y = 0.225; inner.material = stone.clone(); inner.material.side = THREE.BackSide;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.3, 16), stone); pillar.position.y = 0.65;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.22, 0.22, 28), stone); bowl.position.y = 1.32;
    for (const o of [rim, rimTop, inner, pillar, bowl]) { o.castShadow = o.receiveShadow = true; B.add(o); }
    // 水面：會動的波紋（法線用兩層移動的雜訊做）
    const water = new THREE.MeshStandardNodeMaterial({ color: 0x3f7f8f, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.85 });
    const w = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), water); w.rotation.x = -Math.PI / 2; w.position.y = 0.36; B.add(w);
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28), water); w2.rotation.x = -Math.PI / 2; w2.position.y = 1.42; B.add(w2);
    this.world.solid(FOUNTAIN.x - 1.55, FOUNTAIN.x + 1.55, FOUNTAIN.z - 1.55, FOUNTAIN.z + 1.55, 0, 0.5, false);

    const N = this.webgpu ? (this.high ? 4000 : 1600) : 800;
    const P = instancedArray(N, 'vec4'), V = instancedArray(N, 'vec4');
    const C = vec3(FOUNTAIN.x, 1.55, FOUNTAIN.z);
    const shoot = (i, p, v, seed) => {
      const a = hash(i.add(seed)).mul(Math.PI * 2), k = hash(i.add(seed).add(1));
      const top = k.lessThan(0.55);   // 中間往上的主水柱 / 碗邊往外流的水
      p.assign(vec4(select(top, C, C.add(vec3(cos(a).mul(0.6), -0.12, sin(a).mul(0.6)))), 0));
      const sp = select(top, vec3(cos(a).mul(0.25), hash(i.add(seed).add(2)).mul(0.9).add(2.6), sin(a).mul(0.25)), vec3(cos(a).mul(0.55), 0.1, sin(a).mul(0.55)));
      v.assign(vec4(sp, 0));
    };
    const init = Fn(() => {
      const i = instanceIndex, p = P.element(i), v = V.element(i);
      shoot(i, p, v, 0);
      p.w = hash(i.add(3)).mul(-1.5);   // 錯開出發時間
    })().compute(N);
    const update = Fn(() => {
      const i = instanceIndex, p = P.element(i), v = V.element(i);
      const dt = min(deltaTime, 0.05);
      p.w = p.w.add(dt);
      If(p.w.greaterThan(0), () => {
        v.y = v.y.sub(dt.mul(9.8));
        p.xyz = p.xyz.add(v.xyz.mul(dt));
        // 落到碗裡或池子裡
        const r = length(p.xz.sub(C.xz));
        const floorY = select(r.lessThan(0.6), float(1.42), float(0.36));
        If(p.y.lessThan(floorY).and(v.y.lessThan(0)), () => { shoot(i, p, v, time.mul(31.7).floor()); });
      });
    })().compute(N);
    this.renderer.compute(init); this.computes.push(update);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const p = P.element(instanceIndex);
    mat.positionNode = positionGeometry.add(select(p.w.greaterThan(0), p.xyz, vec3(0, -50, 0)));
    mat.vertexNode = billboarding();
    mat.colorNode = vec3(0.85, 0.94, 1.0);
    mat.opacityNode = smoothstep(0.5, 0.1, uv().sub(0.5).length()).mul(0.55);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.035), mat); m.count = N; m.frustumCulled = false;
    this.scene.add(m);
  }

  // ------------------------------------------------------------ 鴿子
  pigeons() {
    const N = this.high ? 36 : 20;
    const P = instancedArray(N, 'vec4');   // xyz, heading
    const V = instancedArray(N, 'vec4');   // vel xyz, state（0 地上、>0 飛行剩下的時間）
    const u = this.u, home = vec3(PIGEONS.x, 0, PIGEONS.z);
    const init = Fn(() => {
      const i = instanceIndex, p = P.element(i), v = V.element(i);
      p.assign(vec4(home.x.add(hash(i).sub(0.5).mul(5)), 0, home.z.add(hash(i.add(1)).sub(0.5).mul(3.5)), hash(i.add(2)).mul(6.28)));
      v.assign(vec4(0, 0, 0, 0));
    })().compute(N);
    const update = Fn(() => {
      const i = instanceIndex, p = P.element(i), v = V.element(i);
      const dt = min(deltaTime, 0.05);
      const toPlayer = u.player.xz.sub(p.xz), dP = length(toPlayer);
      If(v.w.lessThanEqual(0), () => {
        // 地上：慢慢走、轉頭；玩家靠近 2.6 公尺就飛走
        const ph = time.mul(0.6).add(hash(i).mul(40));
        const go = step(0.55, fract(ph));                      // 走一下、停一下
        const hd = p.w.add(sin(ph.mul(2.3)).mul(dt).mul(1.4));
        const toHome = home.xz.sub(p.xz);
        const back = smoothstep(2.4, 3.6, length(toHome));
        const dir = mix(vec2(sin(hd), cos(hd)), normalize(toHome), back);
        p.xz = p.xz.add(dir.mul(go).mul(0.35).mul(dt));
        p.w = atan(dir.x, dir.y);
        p.y = 0;
        If(dP.lessThan(2.6).or(u.rain.greaterThan(0.6).and(hash(i.add(time.floor())).lessThan(0.002))), () => {
          const away = normalize(p.xz.sub(u.player.xz).add(vec2(hash(i.add(time)).sub(0.5), 0.3)));
          v.assign(vec4(away.x.mul(3), 4.2, away.y.mul(3), hash(i.add(time).add(5)).mul(6).add(6)));
        });
      }).Else(() => {
        // 飛行：往上、繞著廣場上空轉；時間到就降落回原處附近
        v.w = v.w.sub(dt);
        const c = vec3(home.x, 6.5, home.z.add(1));
        const rel = p.xyz.sub(c);
        const tangent = normalize(vec3(rel.z.negate(), 0, rel.x));
        const landing = v.w.lessThan(2.5);
        const tgtLand = vec3(home.x.add(hash(i.add(17)).sub(0.5).mul(5)), 0, home.z.add(hash(i.add(19)).sub(0.5).mul(3.5)));
        const want = select(landing, normalize(tgtLand.sub(p.xyz)).mul(3.2), tangent.mul(4.5).add(normalize(rel.negate()).mul(length(rel).sub(5).mul(0.6))).add(vec3(0, sin(time.add(hash(i).mul(9))).mul(0.6), 0)));
        v.xyz = v.xyz.add(want.sub(v.xyz).mul(min(dt.mul(1.8), 1)));
        p.xyz = p.xyz.add(v.xyz.mul(dt));
        p.w = atan(v.x, v.z);
        If(landing.and(p.y.lessThan(0.05)), () => { p.y = 0; v.assign(vec4(0, 0, 0, 0)); });
        If(v.w.lessThan(0), () => { v.w = 0; p.y = 0; });
      });
    })().compute(N);
    this.renderer.compute(init); this.computes.push(update);

    // 鴿子模型：身體（扁長八面體）、頭、尾巴、兩片翅膀；wing 屬性 = 翅膀的拍動量
    const pos = [], wing = [], col = [];
    const tri = (a, b, c, w = [0, 0, 0], k = 0) => { pos.push(...a, ...b, ...c); wing.push(...w); col.push(k, k, k); };
    const body = [[0, 0.11, 0.16], [0.07, 0.12, 0], [0, 0.17, 0], [-0.07, 0.12, 0], [0, 0.08, 0], [0, 0.1, -0.16]];
    const [f, r, t, l, b, k] = body;
    tri(f, r, t); tri(f, t, l); tri(f, l, b); tri(f, b, r); tri(k, t, r); tri(k, l, t); tri(k, b, l); tri(k, r, b);
    const hd = [[0, 0.2, 0.2], [0.03, 0.17, 0.13], [-0.03, 0.17, 0.13], [0, 0.22, 0.12]];
    tri(hd[0], hd[1], hd[3], undefined, 1); tri(hd[0], hd[3], hd[2], undefined, 1); tri(hd[0], hd[2], hd[1], undefined, 1);
    tri([0, 0.11, -0.14], [0.05, 0.11, -0.26], [-0.05, 0.11, -0.26], undefined, 2);
    for (const s of [1, -1]) { tri([0.05 * s, 0.14, 0.06], [0.05 * s, 0.14, -0.08], [0.24 * s, 0.13, -0.04], [0, 0, 1], 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('wing', new THREE.Float32BufferAttribute(wing, 1));
    g.setAttribute('part', new THREE.Float32BufferAttribute(col, 1));
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
    const p = P.element(instanceIndex), v = V.element(instanceIndex);
    mat.positionNode = Fn(() => {
      const q = positionGeometry.toVar();
      const flying = v.w.greaterThan(0);
      const flap = select(flying, sin(time.mul(22).add(hash(instanceIndex).mul(6))).mul(0.16), sin(time.mul(1.5).add(hash(instanceIndex))).mul(0.005));
      q.y = q.y.add(attribute('wing', 'float').mul(flap).mul(abs(q.x).mul(4)));
      // 地上啄食：頭上下
      const peck = select(flying, float(0), max(sin(time.mul(5).add(hash(instanceIndex).mul(30))), 0).mul(0.05));
      q.y = q.y.sub(select(attribute('part', 'float').equal(1), peck, float(0)));
      const c = cos(p.w), s = sin(p.w);
      return vec3(q.x.mul(c).add(q.z.mul(s)), q.y, q.z.mul(c).sub(q.x.mul(s))).add(p.xyz);
    })();
    const part = attribute('part', 'float');
    mat.colorNode = select(part.equal(1), vec3(0.32, 0.36, 0.42), select(part.equal(2), vec3(0.42, 0.45, 0.52), vec3(0.55, 0.57, 0.62)));
    const m = new THREE.Mesh(g, mat); m.count = N; m.frustumCulled = false; m.castShadow = true;
    this.scene.add(m);
  }

  update(dt, playerPos) {
    this.u.player.value.copy(playerPos);
    for (const c of this.computes) this.renderer.compute(c);
  }
}

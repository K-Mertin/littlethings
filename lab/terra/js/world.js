// 畫面：一開始的島（程式產生的地形）、地面和水的材質（高度從模擬的貼圖讀）、外海、天空、樹
import * as THREE from 'three';
import { Fn, textureLoad, ivec2, positionGeometry, vec3, vec2, float, normalize, smoothstep, mix, max, min, abs, varyingProperty, normalLocal, mx_noise_float, mx_fractal_noise_float, positionWorld, time, clamp, round, select, length } from 'three/tsl';

// ---------------------------------------------------------------- 產生一座島：好幾層噪聲疊起來，越外面越低（變成海）
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export function makeIsland(N, seed = 7) {
  const R = rng(seed), G = 64, grid = Array.from({ length: 6 }, () => Float32Array.from({ length: G * G }, () => R()));
  const vn = (oct, x, y) => {   // 平滑的格子噪聲（值噪聲）
    const g = grid[oct], xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const at = (a, b) => g[((b % G + G) % G) * G + ((a % G + G) % G)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy;
  };
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    let f = 0, a = 1, fr = 3, sum = 0;
    for (let o = 0; o < 6; o++) { f += vn(o, u * fr + o * 7.3, v * fr + o * 3.1) * a; sum += a; a *= 0.5; fr *= 2; }
    f /= sum;
    const ridge = 1 - Math.abs(vn(2, u * 4 + 11, v * 4 + 5) * 2 - 1);   // 山脊
    const dx = u - 0.5 + (vn(1, u * 2, v * 2) - 0.5) * 0.22, dy = v - 0.5 + (vn(3, u * 2 + 9, v * 2) - 0.5) * 0.22;
    const r = Math.hypot(dx, dy) / 0.5;
    const fall = 1 - Math.min(1, Math.max(0, (r - 0.45) / 0.5)) ** 1.6;
    H[y * N + x] = ((f * 30 + ridge * ridge * 12 - 5) * fall - 8 * (1 - fall) - 1.5) * Math.max(0.7, N / 256);   // 格子少的時候山也矮一點，比例才一樣
  }
  return H;
}

// ---------------------------------------------------------------- 地面與水
export class World {
  constructor(scene, N, tex, { high }) {
    this.N = N; const half = (N - 1) / 2;
    const T = (dx, dy) => { const x = clamp(round(positionGeometry.x.add(half + dx)), 0, N - 1), y = clamp(round(positionGeometry.z.add(half + dy)), 0, N - 1); return textureLoad(tex, ivec2(x, y), 0); };
    const geo = new THREE.PlaneGeometry(N - 1, N - 1, N - 1, N - 1); geo.rotateX(-Math.PI / 2);

    // ---------------- 地面：沙灘、草地、森林、岩石、雪；濕的地方比較暗；被水沖下來的泥沙偏黃褐
    const vH = varyingProperty('float', 'vH'), vW = varyingProperty('float', 'vW'), vS = varyingProperty('float', 'vS'), vSl = varyingProperty('float', 'vSlope'), vSp = varyingProperty('float', 'vSp');
    const tm = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
    tm.positionNode = Fn(() => {
      const c = T(0, 0), l = T(-1, 0).x, r = T(1, 0).x, t = T(0, -1).x, b = T(0, 1).x;
      const n = normalize(vec3(l.sub(r), 2, t.sub(b)));
      normalLocal.assign(n);
      vH.assign(c.x); vW.assign(c.y); vS.assign(c.z); vSl.assign(float(1).sub(n.y)); vSp.assign(c.w);
      return vec3(positionGeometry.x, c.x, positionGeometry.z);
    })();
    tm.colorNode = Fn(() => {
      const p = positionWorld, n1 = mx_noise_float(p.xz.mul(0.08)).mul(0.5).add(0.5), n2 = mx_noise_float(p.xz.mul(0.6)).mul(0.5).add(0.5);
      const sand = vec3(0.8, 0.7, 0.48), grass = mix(vec3(0.24, 0.45, 0.13), vec3(0.36, 0.55, 0.18), n1), forest = vec3(0.12, 0.28, 0.1);
      const rock = mix(vec3(0.42, 0.39, 0.36), vec3(0.55, 0.52, 0.48), n2), snow = vec3(0.95, 0.96, 0.98), mud = vec3(0.45, 0.36, 0.24);
      let c = mix(sand, grass, smoothstep(0.6, 2.2, vH));
      c = mix(c, forest, smoothstep(0.45, 0.65, n1).mul(smoothstep(3, 6, vH)).mul(smoothstep(22, 16, vH)).mul(0.8));
      c = mix(c, rock, max(smoothstep(0.28, 0.5, vSl), smoothstep(22, 30, vH)));
      c = mix(c, snow, smoothstep(31, 36, vH.add(n2.mul(3))).mul(smoothstep(0.55, 0.35, vSl)));
      c = mix(c, mud, smoothstep(0.005, 0.05, vS).mul(0.7));                                    // 水帶著泥沙經過的地方
      c = c.mul(mix(float(1), float(0.62), smoothstep(0.005, 0.08, vW)));                     // 濕的地面比較暗
      c = mix(c, vec3(0.75, 0.68, 0.5).mul(0.7), smoothstep(-0.2, -1.5, vH));                // 海底
      return c.mul(n2.mul(0.12).add(0.94));
    })();
    tm.roughnessNode = mix(float(0.92), float(0.35), smoothstep(0.005, 0.08, vW));
    this.terrain = new THREE.Mesh(geo, tm); this.terrain.receiveShadow = true; this.terrain.castShadow = high; this.terrain.frustumCulled = false;
    scene.add(this.terrain);

    // ---------------- 水：位置＝地面＋水深；淺的地方透明偏綠、深的地方藍；急流有白沫、帶泥沙變黃濁
    const wW = varyingProperty('float', 'wW'), wS = varyingProperty('float', 'wS'), wSp = varyingProperty('float', 'wSp'), wH = varyingProperty('float', 'wH');
    const wm = new THREE.MeshPhysicalNodeMaterial({ transparent: true, roughness: 0.15, metalness: 0, specularIntensity: 0.35, depthWrite: false });
    wm.envMapIntensity = 0.45;   // 很淺的一層水在斜斜的角度會把天空反射得太白（像雪），調弱一點
    wm.positionNode = Fn(() => {
      const c = T(0, 0);
      const s = (dx, dy) => { const q = T(dx, dy); return q.x.add(q.y); };
      const n0 = normalize(vec3(s(-1, 0).sub(s(1, 0)), 2, s(0, -1).sub(s(0, 1))));
      // 很淺的一層水：水面跟著底下坑坑洞洞的地形，法線亂七八糟會到處反光（看起來像雪）→ 淺水的法線偏向正上方
      const n = normalize(mix(vec3(0, 1, 0), n0, smoothstep(0.15, 1.2, c.y).mul(0.8).add(0.2)));
      normalLocal.assign(n);
      wW.assign(c.y); wS.assign(c.z); wSp.assign(c.w); wH.assign(c.x);
      // 幾乎沒有水、或是海（地面低於海平面：外海那一大片已經畫了）的地方藏到地面下面
      return vec3(positionGeometry.x, select(c.y.greaterThan(0.004).and(c.x.greaterThan(-0.15)), c.x.add(c.y), c.x.sub(0.3)), positionGeometry.z);
    })();
    const ripple = Fn(() => mx_fractal_noise_float(vec3(positionWorld.xz.mul(0.7), time.mul(0.6)), 3, 2, 0.5).mul(0.5).add(0.5))();
    wm.colorNode = Fn(() => {
      const deep = vec3(0.02, 0.16, 0.32), shallow = vec3(0.1, 0.5, 0.52), muddy = vec3(0.45, 0.36, 0.2);
      let c = mix(shallow, deep, smoothstep(0.2, 4, wW));
      c = mix(c, muddy, smoothstep(0.01, 0.2, wS).mul(0.75));
      const foam = smoothstep(5, 8, wSp).mul(ripple).mul(smoothstep(0.3, 0.8, wW)).mul(0.6);   // 有一點深度的急流才有白沫（很淺的一層水流得快只是濕濕亮亮的）
      return mix(c, vec3(0.95, 0.97, 1), clamp(foam, 0, 1));
    })();
    wm.opacityNode = Fn(() => clamp(smoothstep(0.01, 0.6, wW).mul(0.72).add(smoothstep(0.5, 3, wW).mul(0.23)).add(smoothstep(5, 8, wSp).mul(smoothstep(0.3, 0.8, wW)).mul(0.2)), 0, 0.95))();
    this.water = new THREE.Mesh(geo.clone(), wm); this.water.frustumCulled = false; this.water.renderOrder = 2; scene.add(this.water);

    // ---------------- 外海：格子外面的一大片海，水面高度 0
    const sea = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.08, clearcoat: 1, transparent: true });
    sea.colorNode = mix(vec3(0.03, 0.2, 0.34), vec3(0.02, 0.12, 0.25), mx_noise_float(positionWorld.xz.mul(0.02)).mul(0.5).add(0.5));
    sea.opacityNode = float(0.96);
    sea.normalNode = Fn(() => { const e = 0.6, f = (dx, dz) => mx_noise_float(vec3(positionWorld.x.add(dx).mul(0.25), positionWorld.z.add(dz).mul(0.25), time.mul(0.5))); return normalize(vec3(f(-e, 0).sub(f(e, 0)), 4, f(0, -e).sub(f(0, e)))); })();
    const ring = new THREE.RingGeometry(half - 0.5, half * 8, 64, 1); ring.rotateX(-Math.PI / 2);
    // 圓環內圈換成方形的洞：直接用很大的平面，中間被島的水面蓋住就好（外海比島的水面低一點點）
    const seaP = new THREE.Mesh(new THREE.PlaneGeometry(N * 10, N * 10).rotateX(-Math.PI / 2), sea); seaP.position.y = -0.05; seaP.renderOrder = 1; scene.add(seaP);
    // 外海的海底：和島的邊緣一樣高、一樣顏色，才看不出格子的邊
    const fc = new THREE.Color(0.525, 0.476, 0.35);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * 10, N * 10).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: fc, roughness: 1 })); floor.position.y = -9.5 * Math.max(0.7, N / 256) - 0.05; scene.add(floor);
    void ring; void length; void vec2; void min; void abs;
  }
}

// ---------------------------------------------------------------- 樹：長在平緩、乾的草地上（每隔一陣子用讀回來的高度重新決定哪些樹在）
export class Trees {
  constructor(scene, N, count = 900) {
    this.N = N; const R = rng(99);
    this.cells = Array.from({ length: count }, () => [Math.floor(R() * N), Math.floor(R() * N), 0.7 + R() * 0.8, R() * 6.28]);
    const trunk = new THREE.CylinderGeometry(0.08, 0.12, 0.8, 5); trunk.translate(0, 0.4, 0);
    const crown = new THREE.ConeGeometry(0.55, 1.6, 7); crown.translate(0, 1.45, 0);
    const g = mergeG([trunk, crown], [0x5a3d22, 0x2f5e25]);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85 }), count);
    this.mesh.castShadow = true; this.mesh.count = 0; scene.add(this.mesh);
    this.s = new Float32Array(count); this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.Y = new THREE.Vector3(0, 1, 0);
  }
  update(H, W, dt) {
    if (!H) return;
    const N = this.N, half = (N - 1) / 2; let n = 0;
    this.cells.forEach(([x, y, sc, rot], k) => {
      const i = y * N + x, h = H[i];
      const sl = x > 0 && x < N - 1 && y > 0 && y < N - 1 ? Math.hypot(H[i + 1] - H[i - 1], H[i + N] - H[i - N]) * 0.5 : 9;
      const ok = h > 1.6 && h < 22 && sl < 0.5 && W[i] < 0.02;
      this.s[k] = Math.max(0, Math.min(1, this.s[k] + (ok ? dt * 0.4 : -dt * 2)));   // 慢慢長大；被淹或被挖走就倒下消失
      if (this.s[k] <= 0.01) return;
      this.Q.setFromAxisAngle(this.Y, rot);
      this.M.compose(new THREE.Vector3(x - half, h - 0.1, y - half), this.Q, new THREE.Vector3(sc, sc, sc).multiplyScalar(this.s[k]));
      this.mesh.setMatrixAt(n++, this.M);
    });
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}
function mergeG(list, colors) {
  const pos = [], nor = [], col = [], c = new THREE.Color();
  list.forEach((g0, k) => { const g = g0.index ? g0.toNonIndexed() : g0; c.set(colors[k]); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}

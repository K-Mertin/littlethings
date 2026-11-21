// 彈幕：每一顆子彈的位置都是「公式」算出來的（發射器參數＋時間），不用一顆一顆存。
// 顯示卡在頂點 shader 裡用同一條公式算幾萬顆子彈的位置；CPU 也用同一條公式，只是拿來判斷有沒有打到玩家。
//
// 發射器（emitter）= 一串「每隔 interval 秒、一次射 ring 顆」的子彈，最多 PER 顆：
//   v0: 起點 x, z, 起點移動速度 vx, vz（敵人一邊走一邊射）
//   v1: 開始時間 t0, 結束時間 t1, 間隔 interval, 一次幾顆 ring
//   v2: 第一發角度 a0, 每一發轉多少 spin, 扇形間隔 spread（0 = 平均分成一整圈）, 速度 speed
//   v3: 加速度 accel（負的＝先減速）, 轉彎 curve（每秒轉幾弧度）, 顏色＋大小 look, 被炸彈消掉的時間 cancel
import * as THREE from 'three';
import { Fn, uniformArray, uniform, instanceIndex, positionGeometry, vec3, vec4, float, int, sin, cos, floor, select, smoothstep, uv, mix, max, min, abs, PI, varyingProperty } from 'three/tsl';

export const NE = 48, PER = 512;   // 發射器數量（WebGL 相容模式的 uniform 上限，不要再多）、每個最多幾顆
export const FIELD = { x: 12, z: 16 };
// 子彈顏色（look 的個位數）與大小（look 的十位數：0 小 1 中 2 大）
export const COLORS = [[1, 0.25, 0.4], [0.3, 0.7, 1], [1, 0.8, 0.2], [0.6, 1, 0.4], [0.85, 0.45, 1], [1, 1, 1], [1, 0.5, 0.15]];
export const SIZES = [0.32, 0.5, 0.85];

export class Bullets {
  constructor(scene) {
    this.E = Array.from({ length: NE * 4 }, () => new THREE.Vector4(0, 0, 0, 0));
    for (let e = 0; e < NE; e++) this.E[e * 4 + 1].set(1e9, -1, 1, 1);   // 沒在用：開始時間很大
    this.free = Array.from({ length: NE }, (_, i) => i); this.t = 0;
    this.used = new Set();
    this.graze = Array.from({ length: NE }, () => new Uint8Array(PER));
    this.now = uniform(0); this.gain = uniform(1);   // gain：子彈很多的時候調暗（加法混色疊太多會整片白）
    const E = uniformArray(this.E, 'vec4');
    const now = this.now;

    // ---------------- 顯示：每顆子彈一個平躺的正方形，中間白、外圈有顏色，加法混色（再加泛光就會發亮）
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });   // 平面的 xy 對應到世界的 xz，正反面會反過來，所以兩面都畫
    // 頂點 shader 算的東西要傳給像素 shader：用 varying（不能直接用 toVar，那只在頂點 shader 裡有效）
    const look = varyingProperty('float', 'vLook'), alive = float(0).toVar(), fade = float(0).toVar();
    mat.positionNode = Fn(() => {
      // 注意：要先 floor 再轉成整數當索引（整數除法在 TSL 裡會被當成浮點數，不會自己捨去）
      const ef = floor(float(instanceIndex).div(PER)), k = float(instanceIndex).sub(ef.mul(PER)), e4 = int(ef).mul(4);
      const v0 = E.element(e4), v1 = E.element(e4.add(1)), v2 = E.element(e4.add(2)), v3 = E.element(e4.add(3));
      const ring = max(v1.w, 1), s = floor(k.div(ring)), m = k.sub(s.mul(ring));
      const tf = v1.x.add(s.mul(v1.z)), a = now.sub(tf);
      const step2 = select(v2.z.lessThanEqual(0), PI.mul(2).div(ring), v2.z);
      const center = select(v2.z.lessThanEqual(0), float(0), ring.sub(1).mul(0.5));
      const ang = v2.x.add(s.mul(v2.y)).add(m.sub(center).mul(step2)).add(v3.y.mul(a).mul(0.5));
      // 減速：速度降到 4 成以後就固定
      const aStop = select(v3.x.lessThan(0), v2.w.mul(0.6).div(v3.x.negate()), float(1e9));
      const ac = min(a, aStop);
      const d = v2.w.mul(ac).add(v3.x.mul(0.5).mul(ac).mul(ac)).add(max(a.sub(aStop), 0).mul(v2.w.mul(0.4)));
      const ox = v0.x.add(v0.z.mul(tf.sub(v1.x))), oz = v0.y.add(v0.w.mul(tf.sub(v1.x)));
      const px = ox.add(sin(ang).mul(d)), pz = oz.add(cos(ang).mul(d));
      const inF = abs(px).lessThan(FIELD.x + 2).and(abs(pz).lessThan(FIELD.z + 2));
      const ok = tf.lessThanEqual(v1.y).and(a.greaterThanEqual(0)).and(now.lessThan(v3.w).or(tf.greaterThanEqual(v3.w))).and(inF);
      alive.assign(select(ok, float(1), float(0)));
      look.assign(v3.z);
      fade.assign(smoothstep(0, 0.12, a).mul(smoothstep(FIELD.z + 2, FIELD.z, abs(pz))).mul(smoothstep(FIELD.x + 2, FIELD.x, abs(px))));   // 剛射出來從小變大；快飛出戰場時慢慢變小，不會有一條硬邊
      const sz = select(look.greaterThanEqual(20), float(SIZES[2]), select(look.greaterThanEqual(10), float(SIZES[1]), float(SIZES[0]))).mul(fade).mul(alive);
      return vec3(px.add(positionGeometry.x.mul(sz)), 0.2, pz.add(positionGeometry.y.mul(sz)));
    })();
    const ci = look.sub(floor(look.div(10)).mul(10));
    let col = vec3(...COLORS[0]);
    for (let i = 1; i < COLORS.length; i++) col = select(ci.equal(i), vec3(...COLORS[i]), col);
    const r = uv().sub(0.5).length().mul(2);
    const core = smoothstep(0.42, 0.12, r), rim = smoothstep(1, 0.55, r);
    mat.colorNode = mix(col.mul(rim).mul(2.4), vec3(1, 1, 1).mul(1.5), core).mul(this.gain);   // 外圈是鮮豔的顏色、中間一小點白
    mat.opacityNode = rim;
    const geo = new THREE.PlaneGeometry(1, 1);
    // InstancedMesh：矩陣都是單位矩陣，位置全部在 positionNode 裡算
    const im = new THREE.InstancedMesh(geo, mat, NE * PER); im.frustumCulled = false; im.renderOrder = 5;
    this.mesh = im;
    scene.add(im);
    void vec4;
  }

  // 開一個發射器；回傳 id（滿了就回收最舊的）
  fire(p) {
    let id = this.free.pop();
    if (id === undefined) { id = [...this.used][0]; this.used.delete(id); }
    this.used.add(id);
    const e = id * 4, t = p.t0 ?? this.t;
    const ring = Math.max(1, Math.min(PER, p.ring || 1));
    const maxShots = Math.floor(PER / ring);
    const t1 = Math.min(p.t1 ?? t, t + (maxShots - 1) * (p.interval || 1));
    this.E[e].set(p.x, p.z, p.vx || 0, p.vz || 0);
    this.E[e + 1].set(t, t1, p.interval || 1, ring);
    this.E[e + 2].set(p.a0 || 0, p.spin || 0, p.spread || 0, p.speed || 5);
    this.E[e + 3].set(p.accel || 0, p.curve || 0, (p.color || 0) + 10 * (p.size ?? 1), 1e9);
    this.graze[id].fill(0);
    return id;
  }
  // 敵人死掉：發射器停止（已經射出去的還在飛）
  stop(id) { if (id == null) return; const v = this.E[id * 4 + 1]; v.y = Math.min(v.y, this.t - 1e-4); }
  // 炸彈：現在畫面上所有子彈消失
  cancelAll() { for (const id of this.used) { this.E[id * 4 + 3].w = this.t; this.E[id * 4 + 1].y = Math.min(this.E[id * 4 + 1].y, this.t - 1e-4); } }
  clear() { for (const id of [...this.used]) this.release(id); }
  release(id) { this.used.delete(id); this.free.push(id); this.E[id * 4 + 1].set(1e9, -1, 1, 1); this.E[id * 4 + 3].w = 1e9; }

  // 和 shader 一樣的公式：第 k 顆子彈現在在哪（不存在回傳 null）
  pos(id, k, out) {
    const E = this.E, v0 = E[id * 4], v1 = E[id * 4 + 1], v2 = E[id * 4 + 2], v3 = E[id * 4 + 3], now = this.t;
    const ring = Math.max(v1.w, 1), s = Math.floor(k / ring), m = k - s * ring;
    const tf = v1.x + s * v1.z, a = now - tf;
    if (tf > v1.y || a < 0) return null;
    if (!(now < v3.w || tf >= v3.w)) return null;
    const step = v2.z <= 0 ? Math.PI * 2 / ring : v2.z, center = v2.z <= 0 ? 0 : (ring - 1) * 0.5;
    const ang = v2.x + s * v2.y + (m - center) * step + v3.y * a * 0.5;
    const aStop = v3.x < 0 ? v2.w * 0.6 / -v3.x : 1e9, ac = Math.min(a, aStop);
    const d = v2.w * ac + v3.x * 0.5 * ac * ac + Math.max(a - aStop, 0) * v2.w * 0.4;
    const ox = v0.x + v0.z * (tf - v1.x), oz = v0.y + v0.w * (tf - v1.x);
    out.x = ox + Math.sin(ang) * d; out.z = oz + Math.cos(ang) * d;
    if (Math.abs(out.x) > FIELD.x + 2 || Math.abs(out.z) > FIELD.z + 2) return null;
    out.r = SIZES[Math.floor(v3.z / 10)] * 0.36;
    return out;
  }

  // 每格：更新時間、回收已經全部飛出去的發射器、檢查有沒有打到玩家／擦彈
  update(t, px, pz, hitR, grazeR) {
    this.t = t; this.now.value = t;
    let hit = false, grazed = 0, live = 0;
    const p = { x: 0, z: 0, r: 0 };
    for (const id of [...this.used]) {
      const v1 = this.E[id * 4 + 1], ring = Math.max(1, v1.w);
      if (v1.x > t) continue;
      const shots = Math.min(Math.floor((Math.min(t, v1.y) - v1.x) / v1.z) + 1, Math.floor(PER / ring));
      const n = shots * ring;
      let any = false;
      const gz = this.graze[id];
      for (let k = 0; k < n; k++) {
        if (!this.pos(id, k, p)) continue;
        any = true; live++;
        const dx = p.x - px, dz = p.z - pz, d2 = dx * dx + dz * dz;
        if (d2 < (hitR + p.r) ** 2) hit = true;
        else if (!gz[k] && d2 < (grazeR + p.r) ** 2) { gz[k] = 1; grazed++; }
      }
      // 射完了、而且畫面上一顆都不剩 → 回收
      if (!any && t > v1.y + 0.5) this.release(id);
    }
    this.live = live;
    return { hit, grazed };
  }
}

// 城市夜賽的賽道：一條封閉的曲線（路面、路緣、護欄、人行道），兩旁是大樓（窗戶亮燈）、路燈、霓虹招牌
// 物理用的資料：每 1.5 公尺一個取樣點（位置、切線、法線、彎曲程度、累積距離）
import * as THREE from 'three';
import {
  Fn, uniform, float, cameraPosition, exp, vec2, vec3, mix, smoothstep, step, fract, floor, abs, sin, hash, uv, positionWorld, normalWorld, mx_noise_float, time, select, max, texture,
} from 'three/tsl';

export const ROAD_W = 14;   // 路寬
// 兩條賽道：控制點（x, z）、護欄燈條顏色、水窪亂數種子
export const TRACKS = [
  { id: 'city', name: '霓虹市區', ctrl: [[0, 0], [150, -4], [205, 22], [222, 92], [196, 150], [130, 160], [95, 205], [10, 222], [-70, 205], [-118, 160], [-122, 92], [-82, 60], [-100, 24], [-62, -14]], glow: [0x35d6ff, 0xff4fa3], seed: 9 },
  { id: 'harbor', name: '港灣大道', ctrl: [[0, 0], [190, 0], [245, 38], [238, 112], [176, 126], [124, 88], [66, 96], [34, 166], [-58, 178], [-142, 128], [-156, 46], [-96, -8]], glow: [0xffb02e, 0x3fffa6], seed: 23 },
];

export class Track {
  constructor(def = TRACKS[0], wet = uniform(1)) {
    this.def = def; this.wet = wet;
    const CTRL = def.ctrl;
    this.curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    const L = this.length = this.curve.getLength();
    const n = this.n = Math.round(L / 1.5);
    this.P = []; this.Tn = []; this.Nn = []; this.S = new Float32Array(n); this.K = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / n, p = this.curve.getPointAt(u), t = this.curve.getTangentAt(u).setY(0).normalize();
      this.P.push(p); this.Tn.push(t); this.Nn.push(new THREE.Vector3(-t.z, 0, t.x));   // 法線指向賽道左邊
      this.S[i] = u * L;
    }
    // 水窪：沿著賽道的一張小圖（長 × 寬 16 格），shader 和物理用同一份
    const PW = 1024, PH = 16, pd = new Uint8Array(PW * PH), R = rng(def.seed);
    const spots = Array.from({ length: 70 }, () => ({ u: R(), v: 0.12 + R() * 0.76, ru: (4 + R() * 9) / L, rv: 0.08 + R() * 0.16 }));
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const u = x / PW, v = (y + 0.5) / PH; let k = 0;
      for (const s of spots) { let du = Math.abs(u - s.u); du = Math.min(du, 1 - du); const e = (du / s.ru) ** 2 + ((v - s.v) / s.rv) ** 2; if (e < 1) k = Math.max(k, 1 - e); }
      pd[y * PW + x] = Math.min(255, k * 2.2 * 255);
    }
    this.pud = { data: pd, W: PW, H: PH };
    this.pudTex = new THREE.DataTexture(pd, PW, PH, THREE.RedFormat, THREE.UnsignedByteType);
    this.pudTex.wrapS = THREE.RepeatWrapping; this.pudTex.magFilter = this.pudTex.minFilter = THREE.LinearFilter; this.pudTex.needsUpdate = true;
    for (let i = 0; i < n; i++) {   // 彎曲程度：方向每公尺轉幾弧度
      const a = this.Tn[(i - 3 + n) % n], b = this.Tn[(i + 3) % n];
      this.K[i] = Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) / 9;
    }
  }
  // 從上次的位置附近找最近的取樣點
  nearest(p, hint = -1) {
    const n = this.n; let best = 0, bd = Infinity;
    if (hint >= 0) { for (let k = -40; k <= 40; k++) { const i = (hint + k + n) % n, d = this.P[i].distanceToSquared(p); if (d < bd) { bd = d; best = i; } } }
    if (hint < 0 || bd > 400) { for (let i = 0; i < n; i++) { const d = this.P[i].distanceToSquared(p); if (d < bd) { bd = d; best = i; } } }
    return best;
  }
  // 某個位置有多少水（0～1）
  puddleAt(p, i) {
    const u = this.S[i] / this.length, v = 0.5 + this.lateral(p, i) / ROAD_W;   // 路面 uv.x：0 在右邊、1 在左邊
    if (v < 0 || v > 1) return 0;
    const x = Math.floor(u * this.pud.W) % this.pud.W, y = Math.min(this.pud.H - 1, Math.floor(v * this.pud.H));
    return this.pud.data[y * this.pud.W + x] / 255;
  }
  lateral(p, i) { return (p.x - this.P[i].x) * this.Nn[i].x + (p.z - this.P[i].z) * this.Nn[i].z; }
  at(i) { return this.P[((i % this.n) + this.n) % this.n]; }
  // 比 i 往前 k 公尺、往左 off 公尺的點
  ahead(i, meters, off = 0) { const j = (((i + Math.round(meters / 1.5)) % this.n) + this.n) % this.n; return this.P[j].clone().addScaledVector(this.Nn[j], off); }

  build(scene, { high }) {
    const G = new THREE.Group(); scene.add(G);
    const n = this.n;
    // 帶狀網格：沿著曲線、從 a 到 b（相對中心線的左右距離）、高度 y
    const ribbon = (a, b, y, y2 = y, vScale = 1) => {
      const pos = [], uvs = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const k = i % n, p = this.P[k], N = this.Nn[k];
        pos.push(p.x + N.x * a, y, p.z + N.z * a, p.x + N.x * b, y2, p.z + N.z * b);
        const v = (i === n ? this.length : this.S[k]) / vScale; uvs.push(0, v, 1, v);
        if (i < n) { const o = i * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    // 路面：瀝青＋白線；濕的時候變暗、變亮滑，有水窪
    const road = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
    const u = uv(), across = u.x, along = u.y;
    const edge = step(across, 0.035).add(step(0.965, across)).clamp(0, 1).mul(step(0.012, across)).mul(step(across, 0.988));
    const dash = step(abs(across.sub(0.5)), 0.006).mul(step(fract(along.div(9)), 0.5));
    const lanes = step(abs(across.sub(0.25)), 0.004).add(step(abs(across.sub(0.75)), 0.004)).mul(step(fract(along.div(9).add(0.25)), 0.35));
    const paint = edge.add(dash).add(lanes).clamp(0, 1);
    const n1 = mx_noise_float(positionWorld.mul(0.6)).mul(0.5).add(0.5), n2 = mx_noise_float(positionWorld.mul(0.08)).mul(0.5).add(0.5);
    const puddle = texture(this.pudTex, vec2(along.div(this.length), across)).r.mul(this.wet).mul(mix(0.85, 1, n2));
    const asphalt = mix(vec3(0.075, 0.075, 0.085), vec3(0.11, 0.11, 0.12), n1);
    road.colorNode = mix(mix(asphalt, asphalt.mul(0.55), this.wet), vec3(0.75, 0.75, 0.7), paint.mul(0.85));
    road.roughnessNode = mix(mix(float(0.82), float(0.28), this.wet), float(0.04), puddle).sub(paint.mul(0.1));
    const roadMesh = new THREE.Mesh(ribbon(-ROAD_W / 2, ROAD_W / 2, 0, 0, 1), road); roadMesh.receiveShadow = true; G.add(roadMesh);
    this.puddleK = puddle;
    // 路緣：紅白相間
    const curbM = new THREE.MeshStandardNodeMaterial({ roughness: 0.5 });
    curbM.colorNode = mix(vec3(0.85, 0.12, 0.1), vec3(0.92, 0.92, 0.92), step(0.5, fract(uv().y.div(4))));
    for (const s of [-1, 1]) { const g = ribbon(s * ROAD_W / 2, s * (ROAD_W / 2 + 0.9), 0.04, 0.04); G.add(new THREE.Mesh(g, curbM)); }
    // 護欄（水泥牆＋上面一條發光的線）
    const wallM = new THREE.MeshStandardNodeMaterial({ color: 0x8a8d94, roughness: 0.8 });
    const glowM = new THREE.MeshBasicNodeMaterial({ color: this.def.glow[0] });
    const W2 = ROAD_W / 2 + 1.3;
    for (const s of [-1, 1]) {
      const inner = ribbon(s * W2, s * W2, 0, 1.0); const m = new THREE.Mesh(inner, wallM); m.material.side = THREE.DoubleSide; m.castShadow = true; m.receiveShadow = true; G.add(m);
      const top = ribbon(s * W2, s * (W2 + 0.35), 1.0, 1.0); G.add(new THREE.Mesh(top, wallM));
      const line = ribbon(s * (W2 - 0.02), s * (W2 - 0.02), 0.82, 0.92); G.add(new THREE.Mesh(line, s > 0 ? glowM : new THREE.MeshBasicNodeMaterial({ color: this.def.glow[1] })));
    }
    // 人行道與遠處地面
    const walk = new THREE.MeshStandardNodeMaterial({ color: 0x3a3c44, roughness: 0.4 });
    for (const s of [-1, 1]) G.add(new THREE.Mesh(ribbon(s * (W2 + 0.35), s * (W2 + 9), 0.12, 0.12), walk));
    const groundM = new THREE.MeshStandardNodeMaterial({ color: 0x1c1d22, roughness: 0.6 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), groundM); ground.rotation.x = -Math.PI / 2; ground.position.set(50, -0.05, 100); ground.receiveShadow = true; G.add(ground);

    // ---------------- 大樓：沿著賽道兩邊排；不能擋到路
    const R = rng(77 + this.def.seed), builds = [];
    const okSpot = (x, z, r) => { for (let i = 0; i < n; i += 4) { const p = this.P[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < (r + ROAD_W / 2 + 9) ** 2) return false; } for (const b of builds) if ((b.x - x) ** 2 + (b.z - z) ** 2 < (r + b.r) ** 2) return false; return true; };
    for (let i = 0; i < n; i += 9) {
      for (const s of [-1, 1]) {
        const w = 10 + R() * 16, d = 10 + R() * 14, r = Math.hypot(w, d) / 2;
        const off = ROAD_W / 2 + 10 + r + R() * 4;
        const x = this.P[i].x + this.Nn[i].x * off * s, z = this.P[i].z + this.Nn[i].z * off * s;
        if (!okSpot(x, z, r)) continue;
        const h = 12 + R() * R() * 70;
        builds.push({ x, z, r, w, d, h, rot: Math.atan2(this.Tn[i].x, this.Tn[i].z) });
      }
    }
    // 外圍再加幾排比較高的，讓天際線熱鬧一點
    for (let k = 0; k < 140; k++) {
      const a = R() * Math.PI * 2, rr = 290 + R() * 220, x = 50 + Math.cos(a) * rr, z = 100 + Math.sin(a) * rr, w = 18 + R() * 25, d = 18 + R() * 25;
      builds.push({ x, z, r: Math.hypot(w, d) / 2, w, d, h: 30 + R() * 110, rot: R() * 3 });
    }
    const bm = new THREE.MeshStandardNodeMaterial({ roughness: 0.7, metalness: 0.2 });
    // 窗戶：依世界座標畫格子，隨機亮燈（暖黃、冷白）
    const wpp = positionWorld, nw = normalWorld;
    const side = select(abs(nw.x).greaterThan(abs(nw.z)), wpp.z, wpp.x);
    const cell = vec2(side.div(3.1), wpp.y.div(3.4));
    const inWin = step(0.22, fract(cell.x)).mul(step(fract(cell.x), 0.78)).mul(step(0.25, fract(cell.y))).mul(step(fract(cell.y), 0.75)).mul(step(abs(nw.y), 0.5)).mul(step(2.5, wpp.y));
    const hid = hash(floor(cell.x).add(floor(cell.y).mul(57.3)).add(floor(wpp.x.div(40)).mul(13.1)).add(floor(wpp.z.div(40)).mul(7.7)));
    const lit = step(0.55, hid);
    // 每扇窗亮度不一樣，有的拉了窗簾（暗一點）；樓層之間有一條橫的水泥帶、窗與窗之間有窗框
    const bright = hash(hid.mul(91.7)).mul(0.75).add(0.25);
    const winCol = mix(vec3(1, 0.74, 0.42), vec3(0.72, 0.86, 1), step(0.8, hid)).mul(bright);
    const band = step(fract(cell.y), 0.12).mul(step(abs(nw.y), 0.5));
    const facade = mix(vec3(0.11, 0.115, 0.135), vec3(0.17, 0.165, 0.16), hash(floor(wpp.x.div(40)).add(floor(wpp.z.div(40)).mul(3.3))));
    bm.colorNode = mix(mix(facade, facade.mul(1.5), band), vec3(0.03, 0.035, 0.05), inWin);
    bm.roughnessNode = mix(float(0.85), float(0.12), inWin);   // 玻璃窗會反光
    // 泛光只吃「自發光」那一層、不會被霧蓋掉 → 遠方的窗戶要自己按距離變暗，不然天空會出現一團團灰霧
    const fogK = exp(positionWorld.distance(cameraPosition).mul(-0.011));
    bm.emissiveNode = winCol.mul(inWin.mul(lit).mul(0.75)).mul(fogK);
    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(box, bm, builds.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    builds.forEach((b, i) => { Q.setFromAxisAngle(Y, b.rot); Sc.set(b.w, b.h, b.d); M.compose(new THREE.Vector3(b.x, 0, b.z), Q, Sc); im.setMatrixAt(i, M); });
    im.castShadow = false; im.receiveShadow = true; G.add(im);
    this.builds = builds;

    // ---------------- 霓虹招牌：貼在靠路那一面
    const words = [['MW', '#ff4fd8'], ['GAME HALL', '#3fe0ff'], ['夜市', '#ffd23f'], ['拉麵', '#ff6a3d'], ['電玩', '#7dff6a'], ['甜點', '#ff8fd0'], ['ABC', '#5fb2ff'], ['123', '#ffe14d'], ['HOTEL', '#c08bff'], ['咖啡', '#ffb36b'], ['書店', '#8fffe0'], ['NIGHT GP', '#ff4f6d'], ['卡拉OK', '#ff5ac8'], ['24H', '#3fffa6']];
    this.signs = [];
    builds.slice(0, 120).forEach((b, k) => {
      if (k % 2) return;
      const [txt, col] = words[(k / 2) % words.length | 0];
      const tex = neonTex(txt, col);
      const c = new THREE.Color(col);
      const mat = new THREE.MeshBasicNodeMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      mat.color = new THREE.Color(2.4, 2.4, 2.4);
      const sw = Math.min(b.w * 0.8, 3 + txt.length * 1.6), sh = sw * 0.35;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat);
      // 朝向最近的路
      const i = this.nearest(new THREE.Vector3(b.x, 0, b.z));
      const toRoad = this.P[i].clone().sub(new THREE.Vector3(b.x, 0, b.z)).normalize();
      sign.position.set(b.x + toRoad.x * (b.r * 0.72), Math.min(b.h - sh, 6 + (k % 5) * 3), b.z + toRoad.z * (b.r * 0.72));
      sign.lookAt(sign.position.clone().add(toRoad));
      G.add(sign); this.signs.push({ mesh: sign, col: c });
    });

    // ---------------- 路燈（燈頭發光；真的光只給離車最近的幾盞）
    const lamps = [];
    for (let i = 0; i < n; i += 24) for (const s of [-1, 1]) {
      const off = (W2 + 1.6) * s, p = this.P[i].clone().addScaledVector(this.Nn[i], off);
      lamps.push({ p, arm: this.Nn[i].clone().multiplyScalar(-s) });
    }
    const poleG = new THREE.CylinderGeometry(0.1, 0.14, 8, 6); poleG.translate(0, 4, 0);
    const headG = new THREE.BoxGeometry(1.4, 0.18, 0.5);
    const pm = new THREE.MeshStandardNodeMaterial({ color: 0x2b2d33, roughness: 0.5, metalness: 0.6 });
    const hm = new THREE.MeshStandardNodeMaterial({ color: 0xffe9c0 }); hm.emissiveNode = vec3(1, 0.85, 0.6).mul(6);
    const poles = new THREE.InstancedMesh(poleG, pm, lamps.length), heads = new THREE.InstancedMesh(headG, hm, lamps.length);
    lamps.forEach((l, i) => {
      M.compose(l.p, Q.identity(), Sc.set(1, 1, 1)); poles.setMatrixAt(i, M);
      const hp = l.p.clone().addScaledVector(l.arm, 1.6).setY(8);
      Q.setFromAxisAngle(Y, Math.atan2(l.arm.x, l.arm.z) + Math.PI / 2); M.compose(hp, Q, Sc.set(1, 1, 1)); heads.setMatrixAt(i, M);
      l.light = hp.clone().setY(7.6);
    });
    G.add(poles, heads);
    this.lamps = lamps;

    // ---------------- 起跑線（黑白格）＋門架
    const i0 = 0, p0 = this.P[i0], t0 = this.Tn[i0], n0 = this.Nn[i0];
    const sfM = new THREE.MeshStandardNodeMaterial({ roughness: 0.5 });
    sfM.colorNode = mix(vec3(0.05), vec3(0.95), step(0.5, fract(uv().x.mul(14))).sub(step(0.5, fract(uv().y.mul(2)))).abs());
    const sf = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 2), sfM); sf.rotation.x = -Math.PI / 2; sf.rotation.z = Math.atan2(t0.x, t0.z); sf.position.copy(p0).setY(0.02); G.add(sf);
    const gm = new THREE.MeshStandardNodeMaterial({ color: 0x23252b, metalness: 0.6, roughness: 0.4 });
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), gm); leg.position.copy(p0).addScaledVector(n0, s * (W2 + 0.4)).setY(3.5); G.add(leg); }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W + 3, 1.8), new THREE.MeshBasicNodeMaterial({ map: neonTex('MW NIGHT GP', '#ffd23f', 1024), transparent: true, side: THREE.DoubleSide }));
    banner.material.color = new THREE.Color(2, 2, 2);
    banner.position.copy(p0).setY(6.6); banner.lookAt(p0.clone().sub(t0).setY(6.6)); G.add(banner);
    this.group = G;
    void sin; void time; void max; void floor;
  }
}

export function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function neonTex(text, color, W = 512) {
  const c = document.createElement('canvas'); c.width = W; c.height = W * 0.35;
  const x = c.getContext('2d'); const H = c.height;
  let fs = H * 0.62;
  x.font = `900 ${fs}px system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif`;
  const tw = x.measureText(text).width; if (tw > W * 0.84) fs *= W * 0.84 / tw;   // 字太長就縮小，免得被切掉
  x.font = `900 ${fs}px system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = H * 0.18; x.fillStyle = color;
  for (let k = 0; k < 3; k++) x.fillText(text, W / 2, H / 2);
  x.shadowBlur = 0; x.fillStyle = '#ffffff'; x.globalAlpha = 0.85; x.fillText(text, W / 2, H / 2);
  x.globalAlpha = 1; x.strokeStyle = color; x.lineWidth = H * 0.05; x.shadowBlur = H * 0.15; x.strokeRect(H * 0.08, H * 0.1, W - H * 0.16, H * 0.8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

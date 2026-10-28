// 千軍突圍 — 3D 捏模型：用 Three.js 做出立體角色，從遊戲鏡頭的角度拍成精靈圖。
// 遊戲本體還是 2D 畫布；Three.js 載入失敗（沒網路、舊手機）就繼續用原本的 2D 圖。
'use strict';

const Bake = {
  ready: false, busy: false, failed: false, T: null, C: null, ms: 0, n: 0,
  boss: Object.create(null), bossBusy: Object.create(null),
  onReady: [],
  async init() {
    if (this.busy || this.ready) return;
    this.busy = true;
    const t0 = performance.now();
    try {
      const T = await import('three');
      const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      this.T = T;
      const R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      R.setPixelRatio(1); R.setClearColor(0x000000, 0);
      R.outputColorSpace = T.SRGBColorSpace;
      R.toneMapping = T.NoToneMapping;
      R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
      const scene = new T.Scene();
      const pm = new T.PMREMGenerator(R);
      scene.environment = pm.fromScene(new RoomEnvironment(R), 0.04).texture;
      pm.dispose();
      scene.add(new T.HemisphereLight(0xe8f2ff, 0x5a5048, 0.85));
      const key = new T.DirectionalLight(0xfff0dc, 2.7);
      key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015; key.shadow.radius = 3;
      scene.add(key); scene.add(key.target);
      const rim = new T.DirectionalLight(0xcfe2ff, 1.5); scene.add(rim); scene.add(rim.target);
      const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
      this.C = { T, R, scene, cam, key, rim, RB: RoundedBoxGeometry, K: makeKit3(T, RoundedBoxGeometry) };
      // 先烤最常看到的，烤好一組就換上一組
      const only = window.BAKE_ONLY;
      for (const [name, job] of bakeJobs()) {
        if (only && !only.some(o => name.startsWith(o))) continue;
        try { await job(); } catch (e) { console.warn('3D 烘焙失敗', e); }
        await new Promise(r => setTimeout(r, 0));
      }
      this.ready = true;
      this.ms = performance.now() - t0;
      for (const f of this.onReady) try { f(); } catch (e) { }
    } catch (e) {
      this.failed = true;
      console.warn('3D 模型略過，改用 2D 圖：', e && e.message);
    }
    this.busy = false;
  },
  // 頭目很大張，用到才烤（每關開始時）
  async prepBoss(k) {
    if (!this.C || this.boss[k] || this.bossBusy[k]) return;
    this.bossBusy[k] = true;
    try {
      const out = await bakeBoss3(k);
      for (const kk in this.boss) if (kk !== k) delete this.boss[kk]; // 只留目前的頭目，省記憶體
      this.boss[k] = out;
    } catch (e) { console.warn('頭目烘焙失敗', e); }
    this.bossBusy[k] = false;
  },
};

// 一組圖（同一個角色的幾格動作）：先量出所有格子的範圍，再用同一個框拍，腳底位置才不會跳
// o.ppu 每公尺幾像素、o.th 鏡頭俯角、o.rotY 轉身、o.scale 放大
async function bakeSet(build, args, o) {
  // 共用一個 WebGL 畫布，一次只能烤一組
  const prev = Bake._q || Promise.resolve(); let done; Bake._q = new Promise(r => done = r);
  await prev;
  try { return await bakeSetNow(build, args, o); } finally { done(); }
}
async function bakeSetNow(build, args, o) {
  const { T, R, scene, cam, key, rim, K } = Bake.C;
  const ppu = o.ppu || 160;
  const th = (o.th ?? 38) * Math.PI / 180;
  cam.position.set(0, Math.sin(th) * 60, Math.cos(th) * 60); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const make = arg => {
    const root = new T.Group();
    K.reset(root);
    build(K, arg);
    if (o.rotY) root.rotation.y = o.rotY;
    if (o.scale) root.scale.setScalar(o.scale);
    root.updateMatrixWorld(true);
    return root;
  };
  const kill = root => { root.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); };
  // 量範圍（鏡頭座標）
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const box = new T.Box3(), v = new T.Vector3();
  for (const arg of args) {
    const root = make(arg);
    root.traverse(m => {
      if (!m.isMesh) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.copy(m.geometry.boundingBox);
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        v.applyMatrix4(m.matrixWorld).applyMatrix4(cam.matrixWorldInverse);
        if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
      }
    });
    kill(root);
  }
  const m = 0.03 + (o.olpx || 2) / ppu;
  const hx = Math.max(-x0, x1) + m; y0 -= m; y1 += m;
  const wu = hx * 2, hu = y1 - y0;
  const W = Math.max(4, Math.round(wu * ppu)), H = Math.max(4, Math.round(hu * ppu));
  R.setSize(W, H, false);
  cam.left = -hx; cam.right = hx; cam.bottom = y0; cam.top = y1; cam.updateProjectionMatrix();
  // 燈：主光從左上前方，冷色輪廓光從右後方
  const span = Math.max(wu, hu) * 1.3;
  key.position.set(-0.55 * 40, 1.0 * 40, 0.75 * 40); key.target.position.set(0, hu * 0.3, 0);
  const sc = key.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = 120; sc.updateProjectionMatrix();
  key.intensity = (o.key ?? 2.7) * 0.72;
  rim.position.set(0.8 * 40, 0.7 * 40, -1 * 40); rim.intensity = (o.rim ?? 1.5) * 0.7;
  const outs = [];
  for (const arg of args) {
    const root = make(arg);
    root.traverse(mm => { if (mm.isMesh) { mm.castShadow = o.shadow !== false; mm.receiveShadow = o.shadow !== false; } });
    scene.add(root);
    R.render(scene, cam);
    const out = mkCanvas(W, H);
    out.getContext('2d').drawImage(R.domElement, 0, 0);
    scene.remove(root);
    kill(root);
    K.flush();
    Bake.n++;
    const res = o.ol ? outlined(out, o.ol, o.olpx || 2) : out;
    res.foot = -y0 / hu; res.wh = hu; // 腳底在圖的哪裡、整張圖幾公尺高
    outs.push(res);
    await new Promise(r => setTimeout(r, 0)); // 每張之間讓遊戲畫面喘口氣
  }
  return outs;
}
const bake3 = async (build, o) => (await bakeSet(build, [o.arg], o))[0];

// ---------- 建模工具：公尺、y 朝上、角色面向 +z（鏡頭這邊）----------
function makeKit3(T, RB) {
  const K = { T, g: null, root: null, mats: new Map() };
  const V = (a) => new T.Vector3(a[0], a[1], a[2]);
  K.reset = (root) => { K.root = root; K.g = root; };
  K.flush = () => { for (const m of K.mats.values()) m.dispose(); K.mats.clear(); };
  // 材質：o.r 粗糙度、o.m 金屬度、o.cc 亮漆、o.e 自發光
  K.M = (c, o = {}) => {
    const key = c + '|' + JSON.stringify(o);
    let m = K.mats.get(key);
    if (m) return m;
    if (o.glow) m = new T.MeshBasicMaterial({ color: c, toneMapped: false });
    else m = new T.MeshPhysicalMaterial({
      color: c, roughness: o.r ?? 0.55, metalness: o.m ?? 0, clearcoat: o.cc ?? 0, clearcoatRoughness: 0.25,
      envMapIntensity: (o.env ?? 0.55) * 0.6, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
      flatShading: !!o.flat, transparent: o.op != null, opacity: o.op ?? 1, side: o.ds ? T.DoubleSide : T.FrontSide,
    });
    K.mats.set(key, m);
    return m;
  };
  K.mesh = (geo, mat, p, r, s) => {
    const m = new T.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    if (s != null) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
    K.g.add(m); return m;
  };
  // 子群組（關節）：在 fn 裡加的東西都掛在這個關節下面
  K.grp = (p, r, fn, s) => {
    const g = new T.Group();
    if (p) g.position.set(p[0], p[1], p[2]);
    if (r) g.rotation.set(r[0], r[1], r[2]);
    if (s != null) { if (typeof s === 'number') g.scale.setScalar(s); else g.scale.set(s[0], s[1], s[2]); }
    const prev = K.g; K.g.add(g); K.g = g;
    fn && fn(g);
    K.g = prev; return g;
  };
  K.sph = (r, p, mat, rot, seg = 24) => {
    const geo = new T.SphereGeometry(1, seg, Math.max(8, seg * 0.66 | 0));
    const s = Array.isArray(r) ? r : [r, r, r];
    return K.mesh(geo, mat, p, rot, s);
  };
  // 半球（頭盔、圓頂）：開口朝下
  K.dome = (r, p, mat, rot, part = 0.5) => {
    const geo = new T.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * part);
    const s = Array.isArray(r) ? r : [r, r, r];
    return K.mesh(geo, mat, p, rot, s);
  };
  K.box = (w, h, d, p, mat, rad = 0.02, rot) => {
    const rr = Math.min(rad, w / 2.05, h / 2.05, d / 2.05);
    const geo = rr > 0.0005 ? new RB(w, h, d, 3, rr) : new T.BoxGeometry(w, h, d);
    return K.mesh(geo, mat, p, rot);
  };
  K.cyl = (r1, r2, h, p, mat, rot, seg = 20, open) => K.mesh(new T.CylinderGeometry(r1, r2, h, seg, 1, !!open), mat, p, rot);
  K.cone = (r, h, p, mat, rot, seg = 16) => K.mesh(new T.ConeGeometry(r, h, seg), mat, p, rot);
  K.tor = (R0, r, p, mat, rot, arc = Math.PI * 2, seg = 32) => K.mesh(new T.TorusGeometry(R0, r, 10, seg, arc), mat, p, rot);
  K.lathe = (prof, p, mat, rot, seg = 24) => K.mesh(new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(Math.max(0.0005, r), y)), seg), mat, p, rot);
  // 膠囊：從 a 點到 b 點（四肢、骨頭）
  K.cap = (a, b, r, mat, r2) => {
    const A = V(a), B = V(b), d = B.clone().sub(A), L = d.length();
    let geo;
    if (r2 != null && Math.abs(r2 - r) > 1e-4) {
      // 粗細不同的四肢：圓錐柱 + 兩端球
      geo = new T.CylinderGeometry(r2, r, L, 16, 1, true);
      const m = K.mesh(geo, mat, [(A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2]);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
      K.sph(r, a, mat, null, 14); K.sph(r2, b, mat, null, 14);
      return m;
    }
    geo = new T.CapsuleGeometry(r, Math.max(0.0001, L), 6, 14);
    const m = K.mesh(geo, mat, [(A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2]);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  // 尖角（彎角、爪、刺）：沿曲線一節一節變細
  K.horn = (pts, r0, mat, r1 = 0.002) => {
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
      const A = V(pts[i]), B = V(pts[i + 1]), d = B.clone().sub(A), L = d.length();
      const m = K.mesh(new T.CylinderGeometry(rb, ra, L, 12, 1, false), mat, [(A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2]);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
      if (i < n - 1) K.sph(rb, pts[i + 1], mat, null, 10);
    }
  };
  // 平面輪廓往前擠出（盾牌、刀片、旗子）：pts 是 [x,y] 交錯，厚度 d
  K.ext = (pts, d, p, mat, rot, bev = 0.01) => {
    const s = new T.Shape(); s.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], pts[i + 1]);
    s.closePath();
    const geo = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 10 });
    geo.translate(0, 0, -d / 2);
    return K.mesh(geo, mat, p, rot);
  };
  K.shape = (fn, d, p, mat, rot, bev = 0.01) => {
    const s = new T.Shape(); fn(s);
    const geo = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 14 });
    geo.translate(0, 0, -d / 2);
    return K.mesh(geo, mat, p, rot);
  };
  // 眼睛：白眼球 + 黑眼珠 + 亮點，朝 +z
  K.eye = (p, r, pupil = 0x1a1020, look = [0, 0], white = 0xffffff) => {
    K.sph(r, p, K.M(white, { r: 0.2, cc: 1 }));
    K.sph([r * 0.55, r * 0.6, r * 0.4], [p[0] + look[0] * r * 0.3, p[1] + look[1] * r * 0.3, p[2] + r * 0.72], K.M(pupil, { r: 0.15, cc: 1 }));
    K.sph(r * 0.17, [p[0] - r * 0.22, p[1] + r * 0.28, p[2] + r * 0.95], K.M(0xffffff, { glow: 1 }), null, 8);
  };
  return K;
}

// 走路：四格的相位
const walk3 = f => { const a = f / 4 * Math.PI * 2; return { a, s: Math.sin(a), c: Math.cos(a), up: Math.abs(Math.cos(a)) * 0.02 }; };

// ---------- 要烤哪些圖（照順序，常看到的先烤）----------
const SOLDIER_TH = 40, ENEMY_TH = 36;
const ENEMY3 = {
  grunt:    { fn: grunt3,    w: 1.4, ol: 'rgba(36,10,70,.9)' },
  runner:   { fn: runner3,   w: 1.05, ol: 'rgba(70,10,4,.9)' },
  brute:    { fn: brute3,    w: 3.0, ol: 'rgba(14,40,10,.9)' },
  shield:   { fn: shield3,   w: 1.05, ol: 'rgba(20,24,40,.9)' },
  thrower:  { fn: thrower3,  w: 1.15, ol: 'rgba(70,30,0,.9)' },
  splitter: { fn: splitter3, w: 1.7, ol: 'rgba(10,50,14,.9)', sc: 1.3 },
};
async function bakeSoldiers(wid) {
  const o = { ppu: 190, th: SOLDIER_TH, rotY: Math.PI, scale: 1.12, ol: 'rgba(14,22,48,.85)', olpx: 1.6 };
  const args = [];
  for (const v of [0, 1, 2]) { for (const f of [0, 1, 2, 3]) args.push({ f, v, wid }); args.push({ f: 0, v, wid, idle: 1 }); }
  const all = await bakeSet(soldier3, args, o);
  const W = [0, 1, 2].map(v => all.slice(v * 5, v * 5 + 4)), I = [0, 1, 2].map(v => all[v * 5 + 4]);
  ART.soldierW = ART.soldierW || {}; ART.soldierIdleW = ART.soldierIdleW || {};
  ART.soldierW[wid] = W; ART.soldierIdleW[wid] = I;
  if (wid === 'rifle') { ART.soldierV = W; ART.soldierIdle = I; }
}
async function bakeEnemy(k) {
  const E = ENEMY3[k];
  const fr = await bakeSet(E.fn, [0, 1, 2, 3].map(f => ({ f })), { ppu: k === 'brute' ? 130 : 150, th: ENEMY_TH, scale: 1.12 * (E.sc || 1), ol: E.ol, olpx: 1.8 });
  const tag = (c, s) => { c.foot = s.foot; c.wh = s.wh; return c; };
  ART[k] = { fr, fl: fr.map(s => tag(flashOf(s), s)), red: fr };
}
function bakeJobs() {
  const J = [];
  J.push(['soldier', () => bakeSoldiers('rifle')]);
  for (const k in ENEMY3) J.push(['enemy', () => bakeEnemy(k)]);
  for (const w of ['smg', 'shotgun', 'laser', 'rocket']) J.push(['soldier', () => bakeSoldiers(w)]);
  if (typeof propJobs3 === 'function') J.push(...propJobs3());
  if (typeof sceneJobs3 === 'function') J.push(...sceneJobs3());
  if (typeof defJobs3 === 'function') J.push(...defJobs3());
  return J;
}

// 千軍突圍 — 3D 捏模型：用 Three.js 做出立體角色，從遊戲鏡頭的角度拍成精靈圖。
// 遊戲本體還是 2D 畫布；Three.js 載入失敗（沒網路、舊手機）就繼續用原本的 2D 圖。
'use strict';

// 烤好的圖存在 IndexedDB，第二次開就直接讀，不用再烤；模型改了就把版本號加一
const BAKE_VER = 2;
const Store = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('rush3d', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('s');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = r.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
  },
  req(mode, fn) {
    return new Promise(res => {
      if (!this.db) return res(null);
      try { const q = fn(this.db.transaction('s', mode).objectStore('s')); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); }
      catch (e) { res(null); }
    });
  },
  get(k) { return this.req('readonly', st => st.get(k)); },
  put(k, v) { return this.req('readwrite', st => st.put(v, k)); },
  keys() { return this.req('readonly', st => st.getAllKeys()); },
  del(k) { return this.req('readwrite', st => st.delete(k)); },
};
const toBlob = c => new Promise(r => { try { c.toBlob(b => r(b), 'image/png'); } catch (e) { r(null); } });
async function fromBlob(b) {
  if (typeof createImageBitmap === 'function') return await createImageBitmap(b);
  const url = URL.createObjectURL(b), im = new Image();
  await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url; });
  const c = mkCanvas(im.width, im.height); c.getContext('2d').drawImage(im, 0, 0); URL.revokeObjectURL(url);
  return c;
}
async function saveSet(key, imgs) {
  if (!Store.db) return;
  const rec = [];
  for (const c of imgs) { const b = await toBlob(c); if (!b) return; rec.push({ b, foot: c.foot, wh: c.wh }); }
  await Store.put(key, rec);
}
async function loadSet(key) {
  const rec = await Store.get(key);
  if (!rec || !rec.length) return null;
  try {
    return await Promise.all(rec.map(async r => { const bm = await fromBlob(r.b); bm.foot = r.foot; bm.wh = r.wh; return bm; }));
  } catch (e) { return null; }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const Bake = {
  ready: false, busy: false, failed: false, T: null, C: null, ms: 0, n: 0, total: 0, done: 0, baking: false,
  boss: Object.create(null), bossBusy: Object.create(null),
  onReady: [],
  // 玩的時候不烤（會卡），等回到選單、暫停、結算畫面再烤
  idle() { return typeof UI === 'undefined' || UI.mode !== 'play' || window.BAKE_ANYTIME; },
  async waitIdle() { while (!this.idle()) await sleep(300); },
  async three() {
    if (this.C) return this.C;
    const T = await import('three');
    const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    this.T = T;
    const R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
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
    return this.C;
  },
  async init() {
    if (this.busy || this.ready) return;
    this.busy = true;
    const t0 = performance.now();
    try {
      await Store.open();
      // 清掉舊版本的圖
      const ks = await Store.keys();
      if (ks) for (const k of ks) if (!String(k).startsWith('v' + BAKE_VER + ':')) await Store.del(k);
      const only = window.BAKE_ONLY;
      const jobs = bakeJobs().filter(j => !only || only.some(o => j.name.startsWith(o)));
      // 1) 先讀存好的
      const miss = [], have = new Set(ks || []);
      await Promise.all(jobs.map(async j => {
        if (j.lazy) { if (Store.db && !have.has(j.key)) miss.push(j); return; }
        const imgs = window.BAKE_FRESH || !have.has(j.key) ? null : await loadSet(j.key);
        if (imgs) j.apply(imgs); else miss.push(j);
      }));
      const order = new Map(jobs.map((j, i) => [j, i])); miss.sort((a, b) => order.get(a) - order.get(b));
      this.cacheMs = performance.now() - t0;
      // 2) 沒有的才烤：只在不玩的時候烤
      if (miss.length) {
        this.total = miss.length; this.done = 0; this.baking = true;
        await this.three();
        for (const j of miss) {
          await this.waitIdle();
          try {
            const imgs = await j.make();
            if (!j.lazy) j.apply(imgs);
            await saveSet(j.key, imgs);
          } catch (e) { console.warn('3D 烘焙失敗', j.key, e); }
          this.done++;
          await sleep(0);
        }
        this.baking = false;
      }
      this.ready = true;
      this.ms = performance.now() - t0;
      for (const f of this.onReady) try { f(); } catch (e) { }
    } catch (e) {
      this.failed = true; this.baking = false;
      console.warn('3D 模型略過，改用 2D 圖：', e && e.message);
    }
    this.busy = false;
  },
  // 頭目：從存檔讀（很快）；沒存到（例如無痕模式）就等不玩的時候再烤
  async prepBoss(k) {
    if (this.boss[k] || this.bossBusy[k]) return;
    this.bossBusy[k] = true;
    try {
      let fr = await loadSet(bossKey(k));
      if (!fr && this.idle() && !this.failed) {
        await this.three();
        fr = await bakeBoss3(k);
        saveSet(bossKey(k), fr);
      }
      if (fr) {
        for (const kk in this.boss) if (kk !== k) delete this.boss[kk]; // 只留目前的頭目，省記憶體
        this.boss[k] = { n: fr.slice(0, 7), r: fr.slice(7) };
      }
    } catch (e) { console.warn('頭目載入失敗', e); }
    this.bossBusy[k] = false;
  },
};
const bossKey = k => 'v' + BAKE_VER + ':boss:' + k;

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
    if (!Bake.idle()) { await Bake.waitIdle(); R.setSize(W, H, false); cam.left = -hx; cam.right = hx; cam.bottom = y0; cam.top = y1; cam.updateProjectionMatrix(); }
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
// 從背後看不到手上的槍，只有火箭筒（扛在肩上）看得出來，其他武器共用步槍那套
function applySoldiers(wid, all) {
  const W = [0, 1, 2].map(v => all.slice(v * 5, v * 5 + 4)), I = [0, 1, 2].map(v => all[v * 5 + 4]);
  ART.soldierW = ART.soldierW || {}; ART.soldierIdleW = ART.soldierIdleW || {};
  const ws = wid === 'rifle' ? ['rifle', 'smg', 'shotgun', 'laser'] : [wid];
  for (const w of ws) { ART.soldierW[w] = W; ART.soldierIdleW[w] = I; }
  if (wid === 'rifle') { ART.soldierV = W; ART.soldierIdle = I; }
}
function soldierJob(wid) {
  const o = { ppu: 150, th: SOLDIER_TH, rotY: Math.PI, scale: 1.12, ol: 'rgba(14,22,48,.85)', olpx: 1.4 };
  const args = [];
  for (const v of [0, 1, 2]) { for (const f of [0, 1, 2, 3]) args.push({ f, v, wid }); args.push({ f: 0, v, wid, idle: 1 }); }
  return job('soldier', 'soldier:' + wid, () => bakeSet(soldier3, args, o), all => applySoldiers(wid, all));
}
function enemyJob(k) {
  const E = ENEMY3[k];
  return job('enemy', 'enemy:' + k, () => bakeSet(E.fn, [0, 1, 2, 3].map(f => ({ f })), { ppu: k === 'brute' ? 105 : 125, th: ENEMY_TH, scale: 1.12 * (E.sc || 1), ol: E.ol, olpx: 1.6 }), fr => {
    const tag = (c, s) => { c.foot = s.foot; c.wh = s.wh; return c; };
    ART[k] = { fr, fl: fr.map(s => tag(flashOf(s), s)), red: fr };
  });
}
const job = (name, key, make, apply, lazy) => ({ name, key: 'v' + BAKE_VER + ':' + key, make, apply, lazy });
function bakeJobs() {
  const J = [soldierJob('rifle')];
  for (const k in ENEMY3) J.push(enemyJob(k));
  J.push(soldierJob('rocket'));
  if (typeof propJobs3 === 'function') J.push(...propJobs3());
  if (typeof sceneJobs3 === 'function') J.push(...sceneJobs3());
  // 頭目只先烤好存起來，用到才讀
  for (const k in BOSSES) J.push({ name: 'boss', key: bossKey(k), lazy: true, make: () => bakeBoss3(k), apply: () => { } });
  return J;
}

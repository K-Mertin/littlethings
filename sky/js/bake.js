'use strict';
// 3D 預渲染：用 Three.js 做出立體模型、金屬打光和發光燈條，
// 再從正上方「拍照」烘焙成精靈圖給 2D 遊戲用。載入失敗就繼續用 2D 圖。
const Bake = {
  ready: false, busy: false, S: 3, imgs: Object.create(null),
  has(n) { return !!this.imgs[n]; },
  async init(S) {
    if (this.busy || this.ready) return;
    this.busy = true; this.S = S;
    try {
      const T = await import('three');
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      const R = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      R.setPixelRatio(1); R.setClearColor(0x000000, 0);
      R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
      const scene = new T.Scene();
      const pm = new T.PMREMGenerator(R);
      scene.environment = pm.fromScene(new RoomEnvironment(R), 0.04).texture;
      const sun = new T.DirectionalLight(0xfff2dc, 2.8); sun.position.set(-60, 100, -55); scene.add(sun);
      const rim = new T.DirectionalLight(0x8fbaff, 0.9); rim.position.set(90, 30, 90); scene.add(rim);
      scene.add(new T.HemisphereLight(0xe4f0ff, 0x2a2420, 0.45));
      const cam = new T.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
      cam.position.set(0, 300, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
      const K = makeKit(T);
      const ctx = { T, R, scene, cam, K };
      for (const item of bakeList()) {
        const [name, w, h, build, opt] = item;
        try { this.imgs[name] = bakeOne(ctx, w, h, build, opt || {}); }
        catch (e) { console.warn('bake ' + name + ' failed', e); }
        await new Promise(r => setTimeout(r, 0));
      }
      pm.dispose(); R.dispose();
      this.ready = true;
      Art.cache = Object.create(null);
    } catch (e) {
      console.warn('3D 預渲染略過，改用 2D 圖：', e && e.message);
    }
    this.busy = false;
  },
};

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function bakeOne({ T, R, scene, cam, K }, w, h, build, opt) {
  const S = Bake.S, pad = opt.pad ?? 6, lw = w + pad * 2, lh = h + pad * 2;
  const pw = Math.ceil(lw * S), ph = Math.ceil(lh * S);
  R.setSize(pw, ph, false);
  cam.left = -lw / 2; cam.right = lw / 2; cam.top = lh / 2; cam.bottom = -lh / 2; cam.updateProjectionMatrix();
  const outer = new T.Group(), inner = new T.Group();
  outer.add(inner); K.g = inner;
  build(K, opt);
  if (opt.roll) inner.rotation.z = opt.roll;
  if (opt.rot) outer.rotation.y = opt.rot;
  scene.add(outer);
  R.render(scene, cam);
  const out = mkCanvas(pw, ph);
  out.getContext('2d').drawImage(R.domElement, 0, 0);
  // 發光暈：只畫發光材質（其他變黑擋住），模糊後疊上去
  const meshes = []; outer.traverse(o => { if (o.isMesh) meshes.push(o); });
  if (meshes.some(m => m.material.userData.glow)) {
    const black = new T.MeshBasicMaterial({ color: 0x000000, toneMapped: false }), gm = {}, saved = new Map();
    for (const m of meshes) {
      saved.set(m, m.material);
      const c = m.material.userData.glow;
      m.material = c ? (gm[c] || (gm[c] = new T.MeshBasicMaterial({ color: c, toneMapped: false }))) : black;
    }
    R.render(scene, cam);
    for (const m of meshes) m.material = saved.get(m);
    halo(out, R.domElement, pw, ph, opt.glow ?? 1);
    black.dispose(); Object.values(gm).forEach(m => m.dispose());
  }
  scene.remove(outer);
  outer.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  out.lw = lw; out.lh = lh;
  return out;
}
function halo(out, src, pw, ph, k) {
  const t = mkCanvas(pw, ph), tg = t.getContext('2d');
  tg.drawImage(src, 0, 0);
  const id = tg.getImageData(0, 0, pw, ph), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.max(d[i], d[i + 1], d[i + 2]);
    if (m) { const f = 255 / m; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; }
    d[i + 3] = m;
  }
  tg.putImageData(id, 0, 0);
  const oc = out.getContext('2d');
  oc.save(); oc.globalCompositeOperation = 'lighter'; oc.imageSmoothingEnabled = true;
  let prev = t;
  for (const [div, a] of [[3, 0.75], [7, 0.6], [14, 0.45]]) {
    const s = mkCanvas(Math.max(2, Math.round(pw / div)), Math.max(2, Math.round(ph / div)));
    const sg = s.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(prev, 0, 0, s.width, s.height);
    oc.globalAlpha = a * k; oc.drawImage(s, 0, 0, pw, ph);
    prev = s;
  }
  oc.restore();
}

// ---------- 建模工具（座標：x 往右、z 往下＝畫面下方、y 往上＝朝鏡頭）----------
function makeKit(T) {
  const K = { T, g: null };
  K.M = (c, o = {}) => {
    const m = new T.MeshPhysicalMaterial({
      color: c, metalness: (o.m ?? 0.55) * 0.75, roughness: Math.max(0.3, o.r ?? 0.38), clearcoat: (o.cc ?? 0.5) * 0.45, clearcoatRoughness: 0.3,
      envMapIntensity: o.env ?? 0.42, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, flatShading: !!o.flat,
    });
    m.userData.panel = o.panel !== false;
    return m;
  };
  // 面板接縫貼圖：擠出面的 UV 是遊戲座標，旋轉體的 UV 是一圈一圈
  const panelTex = (seed) => {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
    let a = seed; const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
    const rows = [0, 150, 270, 410, N];
    for (let i = 0; i < rows.length - 1; i++) {
      let x = 0;
      while (x < N) {
        const w = Math.min(N - x, 120 + Math.floor(r() * 5) * 40); const wq = (N - x - w) < 90 ? N - x : w;
        const v = 236 + Math.floor(r() * 19);
        g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, rows[i], wq, rows[i + 1] - rows[i]);
        g.fillStyle = 'rgba(0,0,0,.36)'; g.fillRect(x, rows[i], 4, rows[i + 1] - rows[i]);
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 5, rows[i], 2, rows[i + 1] - rows[i]);
        if (r() < 0.3) { g.fillStyle = 'rgba(0,0,0,.22)'; for (let k = 14; k < wq - 8; k += 26) { g.beginPath(); g.arc(x + k, rows[i] + 12, 3, 0, Math.PI * 2); g.fill(); } }
        if (r() < 0.15) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x + 20, rows[i] + 30, Math.max(8, wq - 50), 12); }
        x += wq;
      }
      g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(0, rows[i], N, 5);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, rows[i] + 5, N, 2);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  K.texE = panelTex(7); K.texE.repeat.set(1 / 70, 1 / 70);
  K.texL = panelTex(11); K.texL.repeat.set(4, 1.5);
  K.pv = (mat, kind) => {
    if (!mat.userData || !mat.userData.panel || mat.map) return mat;
    const k = 'v_' + kind;
    if (!mat.userData[k]) { const m = mat.clone(); m.map = kind === 'ext' ? K.texE : K.texL; m.userData = {}; m.needsUpdate = true; mat.userData[k] = m; }
    return mat.userData[k];
  };
  K.G = (c, i = 2.4) => { const m = new T.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i, roughness: 0.4 }); m.userData.glow = c; return m; };
  K.glass = (tint = 0x0b2a40, e = 0x000000) => new T.MeshPhysicalMaterial({ color: tint, metalness: 0.3, roughness: 0.08, clearcoat: 1, envMapIntensity: 0.9, emissive: e, emissiveIntensity: 0.7 });
  K.add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); K.g.add(m); return m; };
  // 平面輪廓（畫面座標 x,y 交錯）往上擠出厚度 h
  K.ext = (pts, h, mat, y0 = 0, bev = 0.5) => {
    const s = new T.Shape(); s.moveTo(pts[0], -pts[1]);
    for (let i = 2; i < pts.length; i += 2) s.lineTo(pts[i], -pts[i + 1]);
    s.closePath();
    const geo = new T.ExtrudeGeometry(s, { depth: Math.max(0.02, h - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 8 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, y0 + bev, 0);
    return K.add(geo, h > 0.6 ? K.pv(mat, 'ext') : mat);
  };
  K.extM = (pts, h, mat, y0, bev) => { K.ext(pts, h, mat, y0, bev); K.ext(pts.map((v, i) => i % 2 ? v : -v), h, mat, y0, bev); };
  K.rbox = (w, d, h, x, z, y0, mat, bev = 0.6) => K.ext([x - w / 2, z - d / 2, x + w / 2, z - d / 2, x + w / 2, z + d / 2, x - w / 2, z + d / 2], h, mat, y0, Math.min(bev, w / 3, d / 3, h / 2.2));
  // 旋轉體：沿 z 軸（機身），prof = [[半徑, z], ...]
  K.lathe = (prof, mat, o = {}) => {
    const geo = new T.LatheGeometry(prof.map(([r, z]) => new T.Vector2(Math.max(0.001, r), z)), o.seg ?? 32);
    geo.rotateX(Math.PI / 2); geo.scale(o.sx ?? 1, o.sy ?? 1, 1); geo.translate(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    return K.add(geo, K.pv(mat, 'lathe'));
  };
  // 直立旋轉體（圓頂、碟形），prof = [[半徑, 高度], ...]
  K.latheV = (prof, mat, x = 0, y = 0, z = 0) => {
    const geo = new T.LatheGeometry(prof.map(([r, hh]) => new T.Vector2(Math.max(0.001, r), hh)), 36);
    return K.add(geo, mat, x, y, z);
  };
  K.box = (w, h, d, x, y, z, mat) => K.add(new T.BoxGeometry(w, h, d), mat, x, y, z);
  K.cyl = (r1, r2, len, x, y, z, mat, seg = 24) => { const geo = new T.CylinderGeometry(r1, r2, len, seg); geo.rotateX(Math.PI / 2); return K.add(geo, mat, x, y, z); };
  K.cylV = (r1, r2, h, x, y, z, mat, seg = 32) => K.add(new T.CylinderGeometry(r1, r2, h, seg), mat, x, y + h / 2, z);
  K.sph = (rx, ry, rz, x, y, z, mat) => { const geo = new T.SphereGeometry(1, 28, 18); geo.scale(rx, ry, rz); return K.add(geo, mat, x, y, z); };
  K.torus = (r, tube, x, y, z, mat) => { const geo = new T.TorusGeometry(r, tube, 10, 48); geo.rotateX(Math.PI / 2); return K.add(geo, mat, x, y, z); };
  K.bar = (x1, z1, x2, z2, y, w, h, mat) => {
    const L = Math.hypot(x2 - x1, z2 - z1), m = K.add(new T.BoxGeometry(L, h, w), mat, (x1 + x2) / 2, y, (z1 + z2) / 2);
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1); return m;
  };
  K.barM = (x1, z1, x2, z2, y, w, h, mat) => { K.bar(x1, z1, x2, z2, y, w, h, mat); K.bar(-x1, z1, -x2, z2, y, w, h, mat); };
  K.oct = (a, b, c) => [-a + c, -b, a - c, -b, a, -b + c, a, b - c, a - c, b, -a + c, b, -a, b - c, -a, -b + c];
  return K;
}

// ---------- 模型 ----------
const MODELS = {
  // 玩家：白色珍珠漆、青色發光、紅色機鼻（機頭朝上）
  player(K) {
    const W1 = K.M(0xeef2f7, { m: 0.25, r: 0.28, cc: 1 }), GR = K.M(0x56616f, { m: 0.85, r: 0.3 }), DK = K.M(0x1f242b, { m: 0.9, r: 0.42 });
    const RD = K.M(0xd8322b, { m: 0.3, r: 0.3, cc: 1 }), CY = K.G(0x3fdcff, 2.6), GL = K.glass(0x0a2a44, 0x0b5a8a);
    K.extM([2, -1, 16, 8, 18.5, 11.5, 15, 13.2, 3, 11], 1.5, W1, 0, 0.5);
    K.extM([5, 4.5, 13, 9.6, 13.3, 11.6, 5, 10.2], 0.3, GR, 1.42, 0);
    K.extM([14.6, 8.3, 18.5, 11.5, 15.9, 12.7], 0.45, RD, 1.38, 0);
    K.extM([2.5, -13.5, 8.5, -9.6, 8.5, -8.3, 2.5, -9.6], 0.9, W1, 0.9, 0.3);
    K.lathe([[0, -22], [1.2, -20], [2.4, -16], [3.5, -10], [4.4, -3], [4.8, 6], [4.4, 14], [3.4, 18], [0.2, 18.6]], W1, { sy: 0.85, y: 1.8 });
    K.lathe([[0, -22.3], [1.3, -20], [2.55, -16.4], [2.95, -15], [0.2, -14.9]], RD, { sy: 0.92, y: 1.84 });
    K.sph(2.3, 2.1, 5.8, 0, 4.4, -7.5, GL);
    K.bar(0, -1, 0, 11, 4.9, 1.6, 0.5, GR);
    for (const s of [-1, 1]) {
      K.cyl(2.5, 2.25, 11, s * 3.7, 1.3, 12.6, DK);
      K.cyl(1.95, 1.95, 0.7, s * 3.7, 1.3, 18.3, CY);
      const f = K.box(0.8, 5.2, 7, s * 5.4, 4.2, 13.6, W1); f.rotation.z = -s * 0.38;
      const t = K.box(0.9, 1.2, 2.4, s * 6.3, 6.4, 15.6, RD); t.rotation.z = -s * 0.38;
    }
    K.barM(4.2, 0.6, 15.6, 9.3, 1.75, 0.7, 0.3, CY);
    K.barM(3.2, -11, 7.6, -8.6, 1.85, 0.5, 0.3, CY);
  },
  // 敵機：深鐵灰＋暗紅、紅色發光（建模時機頭朝上，烘焙時轉 180 度）
  fighter(K) {
    const H = K.M(0x3c4350, { m: 0.85, r: 0.3 }), H2 = K.M(0x22262e, { m: 0.9, r: 0.4 }), AC = K.M(0xa01c2c, { m: 0.4, r: 0.3, cc: 1 });
    const RG = K.G(0xff2d4a, 2.8), GL = K.glass(0x2a0508, 0x6a0012);
    K.extM([1.5, -3, 13, 6, 13.6, 9, 11, 10.2, 1.5, 7], 1.3, H, 0, 0.4);
    K.extM([9, 5.4, 13, 6, 13.6, 9, 10.5, 9.5], 0.32, AC, 1.22, 0);
    K.extM([1.5, 6, 6.2, 11, 6.2, 12.6, 1.5, 11], 0.8, H2, 0.2, 0.3);
    K.lathe([[0, -13], [1.6, -10], [3, -4], [3.4, 3], [3, 10], [0.2, 12]], H, { sy: 0.8, y: 1.3 });
    K.sph(1.7, 1.6, 3.7, 0, 3.4, -4.5, GL);
    K.barM(2, -2.6, 12.6, 6.2, 1.5, 0.6, 0.3, RG);
    K.cyl(1.6, 1.6, 0.6, 0, 1.3, 11.9, K.G(0xff7a3a, 2.8));
  },
  jet(K) {
    const H = K.M(0x283a6a, { m: 0.75, r: 0.3, cc: 0.8 }), H2 = K.M(0x1a2440, { m: 0.9, r: 0.4 }), OG = K.G(0xffa53a, 2.8), GL = K.glass(0x2a1a05, 0x6a3a00);
    K.extM([2, 2, 11, -3, 12.6, -1, 6, 9, 2, 8], 1.2, H, 0, 0.4);
    K.extM([2, 9, 6.2, 14, 6.2, 15.6, 2, 14], 0.7, H2, 0.2, 0.3);
    K.lathe([[0, -16], [1.4, -12], [2.8, -5], [3.2, 4], [2.8, 12], [0.2, 14.6]], H, { sy: 0.8, y: 1.2 });
    K.sph(1.6, 1.5, 3.7, 0, 3.2, -5, GL);
    K.barM(2.5, 2, 11.2, -2.6, 1.4, 0.6, 0.3, OG);
    K.cyl(1.5, 1.5, 0.6, 0, 1.2, 14.6, K.G(0xffc060, 3));
  },
  drone(K) {
    const H = K.M(0x30353f, { m: 0.9, r: 0.28 }), AC = K.M(0xa01c2c, { m: 0.4, r: 0.3, cc: 1 });
    K.latheV([[0.01, -1.5], [8, -1], [10, 0.2], [8.6, 1.4], [5, 2.5], [0.01, 2.9]], H);
    K.torus(7.2, 0.6, 0, 2.0, 0, K.G(0xff3cac, 2.8));
    K.sph(3, 1.7, 3, 0, 2.7, 0, K.G(0xffb02e, 3));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; K.box(2.6, 1.4, 2.6, Math.cos(a) * 9.4, 0.5, Math.sin(a) * 9.4, AC); }
  },
  chopper(K) {
    const H = K.M(0x434f40, { m: 0.6, r: 0.38, cc: 0.4 }), H2 = K.M(0x23281f, { m: 0.85, r: 0.4 }), GL = K.glass(0x2a0508, 0x5a0010), RG = K.G(0xff3040, 2.8);
    K.lathe([[0, -12], [3.5, -10.5], [6.5, -5], [7.5, 2], [6, 8], [2.6, 12], [1.3, 20], [0.2, 21]], H, { sy: 0.72, y: 2 });
    K.sph(4.2, 3, 4.6, 0, 4.3, -6.5, GL);
    K.rbox(27, 3.6, 1.4, 0, 1.6, 1.6, H2, 0.4);
    for (const s of [-1, 1]) { K.cyl(1.7, 1.7, 8.5, s * 12.5, 1.3, 1.5, H2); K.cyl(1.2, 1.2, 0.5, s * 12.5, 1.3, -2.9, RG); }
    K.box(0.8, 4, 4.5, 0, 3.4, 19.5, H);
    K.cylV(2.2, 2.2, 1.6, 0, 5.5, 0, H2);
  },
  carrier(K) {
    const WH = K.M(0xf3f3ee, { m: 0.15, r: 0.32, cc: 1 }), OR = K.M(0xf08a24, { m: 0.25, r: 0.3, cc: 1 }), DK = K.M(0x2b2f36, { m: 0.8, r: 0.4 });
    const YG = K.G(0xffd23f, 2.6), GL = K.glass(0x0b3a52, 0x0a5f80);
    K.lathe([[0, -13], [6, -11.5], [10.5, -4], [11.2, 3], [9.2, 9], [4.2, 13], [2, 19], [0.2, 20]], WH, { sy: 0.7, y: 2 });
    K.ext([-10.6, -3.5, 10.6, -3.5, 10.6, 0.5, -10.6, 0.5], 0.3, OR, 9.6, 0);
    K.ext([-9.5, 3.5, 9.5, 3.5, 9.5, 5.3, -9.5, 5.3], 0.3, OR, 9.4, 0);
    K.sph(5, 2.6, 3.6, 0, 6.2, -8.5, GL);
    for (const s of [-1, 1]) { K.bar(s * 10.5, -6, s * 10.5, 8, 0.4, 1, 0.8, DK); K.sph(1, 0.8, 1, s * 11.2, 3, 0, YG); }
    K.cylV(2.2, 2.2, 1.6, 0, 9.6, 0, DK);
  },
  bomber(K) {
    const H = K.M(0x434b5c, { m: 0.8, r: 0.33, cc: 0.6 }), H2 = K.M(0x2a303c, { m: 0.9, r: 0.4 }), AC = K.M(0xa01c2c, { m: 0.4, r: 0.3, cc: 1 });
    const OG = K.G(0xff7a2a, 3), RG = K.G(0xff2d4a, 2.8), GL = K.glass(0x2a0508, 0x5a0010);
    K.extM([4, -34, 62, 8, 63, 16, 42, 18, 22, 14, 4, 24], 3.4, H, 0, 1);
    K.extM([10, -20, 48, 7, 48, 11, 10, 11], 0.4, H2, 3.3, 0);
    K.extM([52, 8.5, 62, 9, 62.6, 14, 52, 13], 0.4, AC, 3.3, 0);
    K.lathe([[0, -44], [4, -40], [9, -26], [11, -8], [10.5, 14], [7, 30], [0.2, 34]], H, { sy: 0.7, y: 2.4 });
    K.sph(4, 2.6, 7, 0, 8.6, -30, GL);
    for (const x of [24, 42]) for (const s of [-1, 1]) { K.cyl(4, 4.6, 22, s * x, 2, 3, H2); K.cyl(3.3, 3.3, 0.8, s * x, 2, 14.3, OG); }
    K.barM(8, -26, 58, 6, 3.6, 0.7, 0.3, RG);
    for (const s of [-1, 1]) K.sph(1.7, 1.1, 1.7, s * 60, 3.8, 12, RG);
  },
  tank(K) {
    const AR = K.M(0x7f7c58, { m: 0.5, r: 0.45, cc: 0.3 }), AR2 = K.M(0x9c9870, { m: 0.45, r: 0.45, cc: 0.3 }), DK = K.M(0x24252a, { m: 0.6, r: 0.7 }), RIB = K.M(0x3d3e44, { m: 0.7, r: 0.5 });
    for (const s of [-1, 1]) {
      K.rbox(7, 31, 3.6, s * 10, 0, 0, DK, 0.6);
      for (let k = 0; k < 11; k++) K.box(6.6, 0.5, 0.7, s * 10, 3.65, -13.6 + k * 2.72, RIB);
      K.bar(s * 13.6, -11, s * 13.6, 11, 1.9, 0.5, 0.7, K.G(0xff6a2a, 2.2));
    }
    K.ext([-8, -13, 8, -13, 9.2, -9, 9.2, 11, 7, 14, -7, 14, -9.2, 11, -9.2, -9], 4.6, AR, 0.8, 0.9);
    K.ext([-6, -10, 6, -10, 7, -7, 7, 9, 5, 11.5, -5, 11.5, -7, 9, -7, -7], 0.4, AR2, 5.4, 0);
    for (let k = 0; k < 3; k++) K.box(5, 0.4, 0.8, 0, 5.9, 7 + k * 1.6, DK);
  },
  tankTur(K) {
    const AR = K.M(0x9c9870, { m: 0.5, r: 0.4, cc: 0.4 }), DK = K.M(0x2c2d30, { m: 0.85, r: 0.35 });
    K.latheV([[0.01, 0], [6.6, 0], [6.3, 2], [4.6, 3.7], [0.01, 4.1]], AR, 0, 6, 0);
    K.cyl(1.3, 1.3, 11, 0, 8, 8.5, DK);
    K.cyl(1.9, 1.9, 2.2, 0, 8, 14.2, DK);
    K.sph(1.8, 0.8, 1.8, -2, 10, -1.8, DK);
    K.sph(0.9, 0.6, 0.9, 2.4, 9.8, -2.2, K.G(0xff3040, 2.6));
  },
  pad(K) {
    const CO = K.M(0x9a9e9a, { m: 0.12, r: 0.78, cc: 0 }), ST = K.M(0x454a52, { m: 0.8, r: 0.35 }), YL = K.M(0xe0b030, { m: 0.2, r: 0.5 });
    K.ext(K.oct(16, 16, 6.5), 2.6, CO, 0, 0.9);
    K.ext(K.oct(12, 12, 5), 0.4, ST, 2.6, 0);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; K.box(2.2, 0.3, 1.2, Math.cos(a) * 14, 2.75, Math.sin(a) * 14, i % 2 ? YL : ST).rotation.y = -a; }
    for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) K.sph(0.9, 0.6, 0.9, x, 2.9, z, K.G(0xff9a2a, 2.6));
  },
  gunTur(K) {
    const ST = K.M(0x8c949e, { m: 0.8, r: 0.3, cc: 0.6 }), DK = K.M(0x2a2e34, { m: 0.9, r: 0.35 });
    K.latheV([[0.01, 0], [7, 0], [7, 1.6], [5.6, 3.6], [0.01, 4.1]], ST, 0, 3, 0);
    for (const s of [-1, 1]) { K.cyl(0.95, 0.95, 12, s * 2.3, 5.2, 7.5, DK); K.cyl(1.3, 1.3, 1.6, s * 2.3, 5.2, 13.6, DK); }
    K.rbox(5.2, 3, 1.2, 0, -2.6, 7, DK, 0.3);
    K.sph(0.9, 0.6, 0.9, 0, 8.3, -2.6, K.G(0xff3040, 2.8));
  },
  truck(K) {
    const AR = K.M(0x6a7650, { m: 0.45, r: 0.45, cc: 0.4 }), DK = K.M(0x26282c, { m: 0.7, r: 0.6 }), RIB = K.M(0x535d3e, { m: 0.4, r: 0.5 });
    K.rbox(12.5, 24, 1.6, 0, 0, 0, DK, 0.4);
    K.rbox(12, 15, 4.5, 0, 3, 1.4, AR, 0.7);
    for (let k = 0; k < 5; k++) K.box(11.6, 0.4, 0.6, 0, 6, -3 + k * 3, RIB);
    K.rbox(11, 7, 4, 0, -8, 1.4, AR, 1);
    K.bar(-4, -11.8, 4, -11.8, 4.2, 0.8, 1, K.glass(0x0b2a40, 0x103040));
    for (const s of [-1, 1]) K.sph(0.9, 0.7, 0.6, s * 4.4, 2.5, -12, K.G(0xfff0b0, 2.6));
  },
  boat(K) {
    const HU = K.M(0x667480, { m: 0.6, r: 0.35, cc: 0.5 }), DE = K.M(0x8a8676, { m: 0.1, r: 0.75 }), WH = K.M(0xe3e8ea, { m: 0.2, r: 0.32, cc: 1 }), DK = K.M(0x2a2e34, { m: 0.85, r: 0.4 });
    K.ext([0, -22, 6, -14, 8, -2, 8, 14, 6.5, 21, -6.5, 21, -8, 14, -8, -2, -6, -14], 3, HU, 0, 0.8);
    K.ext([0, -18, 4.6, -12, 6.2, -2, 6.2, 13, 5, 18.6, -5, 18.6, -6.2, 13, -6.2, -2, -4.6, -12], 0.4, DE, 3, 0);
    K.rbox(9, 11, 3.4, 0, 3, 3.3, WH, 0.8);
    K.bar(-3.4, -2.3, 3.4, -2.3, 6.5, 1, 0.6, K.glass(0x0b2a40, 0x0a3550));
    K.cylV(2.6, 2.8, 1.4, 0, 3.4, -11, DK); K.cyl(0.7, 0.7, 5, 0, 5.2, -14.5, DK);
    K.sph(0.7, 0.6, 0.7, -6.6, 3.2, 8, K.G(0xff3040, 2.4)); K.sph(0.7, 0.6, 0.7, 6.6, 3.2, 8, K.G(0x40ff70, 2.4));
  },
  cruiser(K) {
    const HU = K.M(0x58646e, { m: 0.65, r: 0.35, cc: 0.5 }), DE = K.M(0x7f7c6e, { m: 0.1, r: 0.78 }), WH = K.M(0xc5cdd2, { m: 0.3, r: 0.32, cc: 0.8 }), DK = K.M(0x2a2e34, { m: 0.85, r: 0.4 });
    const hull = [0, -87, 16, -66, 24, -36, 26, 0, 26, 40, 23, 70, 16, 86, -16, 86, -23, 70, -26, 40, -26, 0, -24, -36, -16, -66];
    K.ext(hull, 5, HU, 0, 1.2);
    K.ext(hull.map((v, i) => i % 2 ? v * 0.92 : v * 0.8), 0.5, DE, 5, 0);
    K.rbox(22, 30, 6, 0, 3, 5.5, WH, 1);
    K.rbox(14, 10, 3, 0, -4, 11.5, WH, 0.6);
    K.bar(-5.5, -9.3, 5.5, -9.3, 13.4, 0.9, 0.8, K.glass(0x0b2a40, 0x0a3a5a));
    K.cylV(0.6, 0.6, 7, 0, 14.5, 6, DK); K.box(7, 0.5, 1, 0, 20.5, 6, DK);
    for (const z of [-52, -30, 42]) K.cylV(8, 8.6, 1.2, 0, 5.5, z, DK);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) K.box(3, 0.8, 3, -6 + c * 4, 5.9, 22 + r * 4, DK);
    K.cylV(9.5, 9.5, 0.2, 0, 5.5, 64, K.M(0x4b4f55, { m: 0.3, r: 0.6 }));
    K.torus(9, 0.45, 0, 5.8, 64, K.G(0xf2e8b0, 1.6));
    for (const z of [-60, -20, 20, 60]) for (const s of [-1, 1]) K.sph(0.8, 0.6, 0.8, s * 24, 5, z, K.G(0x45d8ff, 2.4));
  },

  // ---------- 頭目（直接用畫面方向建模）----------
  b1(K) {
    const AR = K.M(0x5f5e46, { m: 0.65, r: 0.4, cc: 0.35 }), AR2 = K.M(0x8c8962, { m: 0.55, r: 0.42, cc: 0.35 }), DK = K.M(0x23242a, { m: 0.75, r: 0.55 });
    const RIB = K.M(0x3e3f45, { m: 0.75, r: 0.45 }), OG = K.G(0xff6a2a, 2.6);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      K.rbox(24, 64, 9, sx * 54, sy * 42, 0, DK, 1.5);
      for (let k = 0; k < 10; k++) K.box(22, 0.6, 1.3, sx * 54, 9.1, sy * 42 - 28.8 + k * 6.4, RIB);
      K.bar(sx * 66.5, sy * 42 - 24, sx * 66.5, sy * 42 + 24, 4, 0.8, 1.2, OG);
    }
    K.ext([-44, -72, 44, -72, 46, 52, 30, 76, -30, 76, -46, 52], 12, AR, 3, 2.2);
    K.ext([-37, -64, 37, -64, 38.5, 44, 24, 64, -24, 64, -38.5, 44], 2.4, AR2, 15, 1);
    for (let k = 0; k < 5; k++) { K.rbox(8, 18, 1.5, -26 + k * 13, -56, 17.3, DK, 0.3); K.bar(-26 + k * 13, -63, -26 + k * 13, -49, 18.5, 1.4, 0.4, OG); }
    for (const s of [-1, 1]) K.cylV(10, 11, 2.4, s * 42, 17.2, 34, DK);
    K.cylV(29, 30, 1.8, 0, 17.2, -6, DK);
    for (const z of [-40, 18, 52]) K.bar(-36, z, 36, z, 17.5, 0.7, 0.3, DK);
    for (const s of [-1, 1]) K.sph(2.2, 1.2, 2.2, s * 34, 17.6, -60, K.G(0xff3030, 2.6));
  },
  b1tur(K) {
    const AR = K.M(0x9a976c, { m: 0.55, r: 0.38, cc: 0.5 }), DK = K.M(0x2a2b2e, { m: 0.85, r: 0.35 });
    K.latheV([[0.01, 0], [25, 0], [24.5, 3], [20, 7], [10, 9.5], [0.01, 10]], AR, 0, 20, 0);
    for (const s of [-1, 1]) { K.cyl(2.8, 2.8, 40, s * 6, 25, 30, DK); K.rbox(8, 6, 6.5, s * 6, 51, 21.5, DK, 0.8); }
    K.rbox(16, 10, 2.6, 0, -10, 29.5, DK, 0.6);
    K.sph(2, 1, 2, 9, 30, -4, K.G(0xff3040, 2.8));
  },
  b2(K) {
    const HU = K.M(0x4b5866, { m: 0.7, r: 0.35, cc: 0.5 }), DE = K.M(0x7f7c6e, { m: 0.1, r: 0.78 }), WH = K.M(0xb9c2c8, { m: 0.35, r: 0.3, cc: 0.8 }), DK = K.M(0x262a30, { m: 0.85, r: 0.4 });
    const hull = [0, -158, 20, -138, 34, -112, 44, -80, 50, -40, 52, 0, 52, 40, 51, 80, 48, 110, 42, 135, 32, 152, -32, 152, -42, 135, -48, 110, -51, 80, -52, 40, -52, 0, -50, -40, -44, -80, -34, -112, -20, -138];
    K.ext(hull, 7, HU, 0, 2);
    K.ext(hull.map((v, i) => i % 2 ? v * 0.94 : v * 0.86), 0.6, DE, 7, 0);
    K.rbox(48, 92, 7, 0, -8, 7.6, WH, 1.4);
    K.rbox(32, 42, 5, 0, -28, 14.6, WH, 1);
    K.bar(-12, -50, 12, -50, 17.5, 1.4, 1.2, K.glass(0x0b2a40, 0x0a3a5a));
    K.cylV(7, 7.5, 3, 0, 19.6, -5, DK); K.latheV([[0.01, 0], [6, 1.6], [6.3, 2.4]], WH, 0, 22.6, -5);
    K.rbox(9, 22, 7, 0, 22, 14.6, DK, 1);
    for (const z of [-112, -84, 70, 100]) K.cylV(10, 11, 1.4, 0, 7.6, z, DK);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) K.rbox(8, 12, 3, s * 34, k * 20 - 10, 7.6, DK, 0.5);
    K.cylV(13, 13, 0.3, 0, 7.6, 128, K.M(0x3d4249, { m: 0.3, r: 0.6 }));
    K.torus(13, 0.6, 0, 8.1, 128, K.G(0xf2e8b0, 1.8));
    for (const z of [-120, -60, 0, 60, 120]) for (const s of [-1, 1]) K.sph(1, 0.8, 1, s * 49, 6.8, z, K.G(0x45d8ff, 2.6));
  },
  b3(K) {
    const H = K.M(0x2c323b, { m: 0.85, r: 0.3, cc: 0.6 }), H2 = K.M(0x48515e, { m: 0.8, r: 0.32 }), WH = K.M(0xd9dee4, { m: 0.3, r: 0.3 });
    const GL = K.glass(0x2a1a05, 0x8a4a00), RG = K.G(0xff3040, 2.8);
    K.rbox(140, 14, 4, 0, -9, 3, H2, 1.2);
    for (const s of [-1, 1]) {
      K.lathe([[0, -22], [8, -18], [13, -6], [13, 6], [9, 16], [0.2, 20]], H, { sy: 0.7, x: s * 56, y: 3, z: -8 });
      K.cylV(4.5, 4.5, 2.4, s * 56, 11, -8, H2);
      for (let k = 0; k < 3; k++) { K.cyl(1.5, 1.5, 12, s * (34 + k * 5), 1.6, 6, WH); K.cyl(1.1, 1.1, 0.6, s * (34 + k * 5), 1.6, 12.3, RG); }
      K.cyl(1.4, 1.4, 10, s * 20, 3, 38, H2);
    }
    K.lathe([[0, -38], [10, -34], [20, -20], [26, 0], [24, 20], [16, 34], [8, 42], [0.2, 44]], H, { sy: 0.72, y: 4, z: 4 });
    K.sph(11, 6, 10, 0, 17, 30, GL);
    K.rbox(8, 40, 4, 0, -50, 5, H, 1);
    K.rbox(32, 6, 2, 0, -71, 7, H2, 0.6);
    K.sph(2, 1.2, 2, 0, 22, -10, RG);
    K.barM(10, -20, 22, 10, 22, 0.8, 0.3, K.G(0xffb03a, 2.2));
  },
  b4(K) {
    const SA = K.M(0xb7a173, { m: 0.3, r: 0.58, cc: 0.25 }), SA2 = K.M(0x9c8960, { m: 0.3, r: 0.6, cc: 0.2 }), DK = K.M(0x2a2822, { m: 0.75, r: 0.55 });
    const RIB = K.M(0x4a463c, { m: 0.7, r: 0.5 }), YL = K.M(0xe0b030, { m: 0.2, r: 0.45 }), OG = K.G(0xff7a2a, 2.6);
    for (const s of [-1, 1]) {
      K.rbox(24, 160, 8, s * 104, 0, 0, DK, 1.5);
      for (let k = 0; k < 22; k++) K.box(22, 0.6, 1.3, s * 104, 8.1, -75 + k * 7.1, RIB);
    }
    K.ext(K.oct(98, 72, 26), 14, SA, 0, 2.5);
    K.ext(K.oct(80, 56, 22), 3, SA2, 14, 1);
    for (let x = -76; x < 76; x += 14) { K.box(7, 0.5, 3, x + 3.5, 14.2, -68, YL); K.box(7, 0.5, 3, x + 10.5, 14.2, 68, YL); }
    for (let k = 0; k < 4; k++) { K.rbox(20, 8, 1.4, -54 + k * 36, -42, 17, DK, 0.3); K.bar(-62 + k * 36, -42, -46 + k * 36, -42, 18.5, 1.6, 0.4, OG); }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.cylV(16, 17, 3, sx * 86, 14, sy * 52, DK);
    K.cylV(37, 38, 2, 0, 17, 0, DK);
    K.cylV(1, 1, 10, -64, 17, 30, DK); K.latheV([[0.01, 0], [7, 2.5], [7.4, 3.4]], K.M(0xd8d8d0, { m: 0.4, r: 0.3 }), -64, 27, 30);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) K.sph(1.6, 1, 1.6, sx * 72, 17.5, sy * 62, K.G(0xff3030, 2.6));
  },
  b4tur(K) {
    const SA = K.M(0xd3c39a, { m: 0.4, r: 0.45, cc: 0.4 }), DK = K.M(0x2e2a22, { m: 0.85, r: 0.4 });
    K.latheV([[0.01, 0], [32, 0], [31, 4], [25, 10], [12, 13.5], [0.01, 14]], SA, 0, 19, 0);
    K.rbox(14, 50, 10, 0, 39, 22, DK, 2);
    K.rbox(19, 8, 12, 0, 62, 21, DK, 2);
    K.cylV(8, 8, 1, 0, 33, 10, K.G(0xff5050, 1.2));
  },
  b5(K) {
    const H = K.M(0x2a3554, { m: 0.8, r: 0.3, cc: 0.7 }), H2 = K.M(0x4a5a86, { m: 0.75, r: 0.3, cc: 0.7 }), DK = K.M(0x161c2e, { m: 0.9, r: 0.35 });
    const CY = K.G(0x6fd0ff, 2.2), BL = K.G(0x6fd0ff, 3.2);
    K.ext([0, 72, 170, -14, 166, -30, 60, -40, 0, -60, -60, -40, -166, -30, -170, -14], 8, H, 0, 2);
    K.ext([0, 52, 110, -8, 100, -22, 50, -30, 0, -46, -50, -30, -100, -22, -110, -8], 4, H2, 8, 1.2);
    for (const ex of [-120, -60, 60, 120]) { K.rbox(18, 20, 6, ex, -36, 4, DK, 1); K.cyl(6, 6, 1, ex, 7, -46.5, BL); }
    for (const s of [-1, 1]) {
      K.latheV([[0.01, 0], [16, 0], [15, 3], [10, 6], [0.01, 7]], H2, s * 100, 8, 0); K.torus(11, 0.9, s * 100, 13.2, 0, CY);
      K.rbox(10, 18, 4, s * 140, -11, 8, H2, 0.8);
    }
    K.torus(26, 2.2, 0, 12.6, 6, K.M(0x9fb0e0, { m: 0.9, r: 0.25 }));
    K.cylV(24, 24, 0.8, 0, 12, 6, K.glass(0x1a1040, 0x2a1060));
    K.rbox(4, 22, 3, 0, 45, 12, K.G(0xffd23f, 2.2), 0.5);
    K.barM(30, -33, 160, -22, 8.4, 0.9, 0.3, CY);
    K.barM(24, 30, 108, -4, 12.2, 0.8, 0.3, CY);
    for (const s of [-1, 1]) K.sph(2, 1.2, 2, s * 166, 8, -20, K.G(0xff3040, 2.8));
  },
};

function bakeList() {
  const L = [
    ['player', 38, 44, MODELS.player],
    ['fighter', 28, 28, MODELS.fighter, { rot: Math.PI }],
    ['jet', 26, 32, MODELS.jet],
    ['drone', 22, 22, MODELS.drone],
    ['chopper', 30, 42, MODELS.chopper, { rot: Math.PI }],
    ['carrier', 34, 40, MODELS.carrier, { rot: Math.PI }],
    ['bomber', 128, 92, MODELS.bomber, { rot: Math.PI }],
    ['tank', 28, 34, MODELS.tank, { rot: Math.PI }],
    ['tankTur', 30, 30, MODELS.tankTur],
    ['pad', 34, 34, MODELS.pad],
    ['gunTur', 30, 30, MODELS.gunTur],
    ['truck', 14, 26, MODELS.truck, { rot: Math.PI }],
    ['boat', 20, 46, MODELS.boat],
    ['cruiser', 60, 176, MODELS.cruiser],
    ['b1', 136, 160, MODELS.b1, { glow: 0.8 }],
    ['b1tur', 56, 108, MODELS.b1tur],
    ['b2', 110, 320, MODELS.b2, { glow: 0.8 }],
    ['b3', 150, 124, MODELS.b3, { glow: 0.8 }],
    ['b4', 236, 172, MODELS.b4, { glow: 0.8 }],
    ['b4tur', 70, 136, MODELS.b4tur],
    ['b5', 344, 150, MODELS.b5, { glow: 0.8 }],
  ];
  for (let i = 1; i <= 3; i++) {
    L.splice(1, 0, ['player_r' + i, 38, 44, MODELS.player, { roll: -0.28 * i }], ['player_l' + i, 38, 44, MODELS.player, { roll: 0.28 * i }]);
  }
  return L;
}

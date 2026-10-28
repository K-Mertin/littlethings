'use strict';
// 守塔奇兵：地形。每張地圖畫成一張快取背景（地面、道路、水、懸崖），
// 高的裝飾物（樹、石頭、墓碑…）另外做成精靈，跟塔和敵人一起依 y 排序。

const Terrain = (() => {
  const { TAU, shade, mix, rgba, ell, circ, rrect, poly, lgrad, rgrad, fbm, vnoise } = Gfx;
  const OUT = 'rgba(30,20,32,.8)';
  const SNOWY = th => th === 'snow' || th === 'tundra' || th === 'glacier' || th === 'fortress' || th === 'aurora';

  // ───────── 每個主題的調色盤 ─────────
  const PAL = {
    meadow: { g: ['#5ea83c', '#74bd48', '#8fd058', '#a8dc6c'], tuft: ['#4c9634', '#6cb848', '#9ad866'], dirt: '#9a7a4a', path: '#dcbc86', pathD: '#b08a56', pathL: '#f0d8a8', edge: '#6a4a2a', cliff: ['#9a7a54', '#6e5236', '#4e3a26'], out: '#3a6a30', outD: '#24461f', water: ['#5fd0f0', '#2f9ad0', '#1f6aa0'], flowers: ['#fff3a8', '#ff9ec7', '#ffffff', '#ffd36b'], amb: 'meadow', leaf: '#8fd058', tree: ['#4fa840', '#6cc04c', '#3a8a34'], dark: 0 },
    forest: { g: ['#3f8a3a', '#4f9c42', '#62ae4c', '#78bc58'], tuft: ['#2f7230', '#4a9640', '#78c058'], dirt: '#7a5a38', path: '#c09a6a', pathD: '#8a6a44', pathL: '#d8b88a', edge: '#4a3420', cliff: ['#7a6248', '#56442e', '#3a2c1e'], out: '#1e4026', outD: '#122a18', water: ['#5ac8d8', '#2f8aa8', '#1f5a78'], flowers: ['#ffe066', '#c9f2ff', '#ffffff'], amb: 'forest', leaf: '#d8a040', tree: ['#2f7a3a', '#3f8f44', '#246030'], dark: 0, tint: 'rgba(20,60,40,.08)' },
    desert: { g: ['#d8a862', '#e6be7c', '#f0d094', '#f6dfaa'], tuft: ['#b8a050', '#c8b060', '#9a9a4a'], dirt: '#c08a50', path: '#f4e2b8', pathD: '#cfa66c', pathL: '#fff2d2', edge: '#a07040', cliff: ['#d08a4a', '#a8662e', '#7a4420'], out: '#b07a40', outD: '#8a5a2c', water: ['#6ae0f0', '#2fb4d8', '#1f86b0'], flowers: ['#ffb36b', '#ff7f9a'], amb: 'desert', leaf: '#e8c070', tree: ['#4caf6a', '#5fc070', '#3a8a50'], dark: 0, tint: 'rgba(255,170,80,.06)' },
    snow: { g: ['#b4cce2', '#d0e2f2', '#e8f2fb', '#fbfdff'], tuft: ['#a8bccc', '#b8ccdc', '#8fa8b8'], dirt: '#9aaabb', path: '#a8b6c4', pathD: '#7a8a9c', pathL: '#c8d4de', edge: '#5a6a7c', cliff: ['#8aa4b8', '#5e7890', '#3e5468'], out: '#56728c', outD: '#3a5068', water: ['#9fe0f8', '#5ab4e0', '#3a8ac0'], flowers: ['#ffffff', '#c9f2ff'], amb: 'snow', leaf: '#ffffff', tree: ['#3f7a5a', '#4f8a68', '#2f6048'], cobble: true, dark: 0, tint: 'rgba(120,170,255,.06)' },
    swamp: { g: ['#5e7a3e', '#6e8c48', '#7e9c52', '#90ac5e'], tuft: ['#4a6630', '#6a8a40', '#9ab860'], dirt: '#5a4a30', path: '#9a845a', pathD: '#6e5a3a', pathL: '#b49c70', edge: '#3e3020', cliff: ['#6a5a3e', '#4a3e2a', '#30281a'], out: '#2a3a22', outD: '#1a2614', water: ['#7aa878', '#4a7a58', '#2e5440'], flowers: ['#d7ff8a', '#b9a6ff'], amb: 'swamp', leaf: '#a8c060', tree: ['#5a7a3a', '#6e8e44', '#46602e'], dark: 0, darkC: '#1a2a20', tint: 'rgba(50,80,60,.12)' },
    volcano: { g: ['#3e302c', '#4c3c36', '#5a4840', '#6a5850'], tuft: ['#2e2422', '#5a4a40', '#7a6050'], dirt: '#2a1e1a', path: '#7a6a5e', pathD: '#4e403a', pathL: '#968676', edge: '#1e1614', cliff: ['#4a3830', '#2e221e', '#1a1210'], out: '#1c1210', outD: '#100a08', water: ['#ffe27a', '#ff8a2a', '#c83a12'], flowers: ['#ff8a3a'], amb: 'volcano', leaf: '#ff8a3a', tree: ['#3a3030', '#4a3a36', '#2a2222'], cobble: true, dark: 0.32, darkC: '#2a0e08', tint: 'rgba(255,90,30,.07)' },
    coast: { g: ['#6cbc4c', '#80cc5a', '#94da68', '#acE47c'], tuft: ['#58a840', '#78c458', '#a0dc74'], dirt: '#c8a86a', path: '#ecd6a2', pathD: '#c4a46a', pathL: '#fbeccc', edge: '#9a7a4a', cliff: ['#c8b08a', '#9a8264', '#6e5a44'], out: '#1e86b8', outD: '#14628e', water: ['#7ae4f4', '#2fb0e0', '#1a78b0'], flowers: ['#ffffff', '#ffd1e6', '#ffe66b'], amb: 'coast', leaf: '#94da68', tree: ['#3fa84a', '#56bc58', '#2e8a3c'], dark: 0, tint: 'rgba(255,220,160,.04)' },
    autumn: { g: ['#a8843a', '#bc9446', '#d0a854', '#e2bc66'], tuft: ['#8a7030', '#b89040', '#d8b058'], dirt: '#8a6a3a', path: '#e0c48e', pathD: '#b08a56', pathL: '#f2dcaa', edge: '#6a4a2a', cliff: ['#9a7a54', '#6e5236', '#4e3a26'], out: '#5a4020', outD: '#3a2814', water: ['#6ad0e0', '#2f9ac0', '#1f6a90'], flowers: ['#ff8a3a', '#ffd36b', '#ffffff'], amb: 'autumn', leaf: '#e0782a', tree: ['#e0782a', '#d84a2a', '#f0a830'], dark: 0, tint: 'rgba(255,140,40,.06)' },
    canyon: { g: ['#a85a34', '#bc6c42', '#cc8052', '#dc9666'], tuft: ['#8a6a3a', '#a8884a', '#7a7a3a'], dirt: '#8a4a2a', path: '#f0cc9e', pathD: '#c09060', pathL: '#ffe6c4', edge: '#7a3a1e', cliff: ['#b05a32', '#843c1e', '#5a2410'], out: '#6a2e18', outD: '#401808', water: ['#6ae0f0', '#2fb4d8', '#1f86b0'], flowers: ['#ffd36b', '#ffffff'], amb: 'desert', leaf: '#e8a070', tree: ['#7aa84a', '#8aba5a', '#5a8a3a'], dark: 0, tint: 'rgba(255,90,40,.06)' },
    night: { g: ['#323c66', '#3a4674', '#445282', '#506090'], tuft: ['#28305a', '#3e4a7c', '#6070a8'], dirt: '#2a2a48', path: '#6c6a8c', pathD: '#4a4866', pathL: '#8c8aaa', edge: '#1e1c34', cliff: ['#3a3e60', '#262a46', '#16182e'], out: '#0c0f24', outD: '#060816', water: ['#5a7ad8', '#3a52a8', '#24347a'], flowers: ['#9ef0ff', '#d7a8ff'], amb: 'night', leaf: '#8a7ab8', tree: ['#2a4a5a', '#345a68', '#1e3644'], cobble: true, dark: 0.5, darkC: '#0a0c26', tint: 'rgba(90,110,255,.06)' },
    sky: { g: ['#7cc458', '#90d468', '#a8e07c', '#c4ec98'], tuft: ['#6ab84c', '#8cd068', '#b8e890'], dirt: '#b8a070', path: '#f2e8cc', pathD: '#c8b490', pathL: '#fffaea', edge: '#8a7a5a', cliff: ['#d8d0c0', '#a89a88', '#7a6e62'], out: '#8acdf2', outD: '#5aa8e0', water: ['#e8f6ff', '#b8e0fa', '#8ac8f0'], flowers: ['#ffffff', '#ffd1e6', '#c9f2ff', '#fff3a8'], amb: 'sky', leaf: '#c4ec98', tree: ['#58b850', '#6ccc5c', '#44a040'], cobble: true, dark: 0, tint: 'rgba(200,230,255,.06)' },
    cave: { g: ['#2e2e40', '#383a4e', '#44465c', '#50546a'], tuft: ['#3a4a5a', '#4a5e6e', '#5a7a88'], dirt: '#26263a', path: '#7a7266', pathD: '#4e483e', pathL: '#9a9282', edge: '#1a1a26', cliff: ['#3a3a4e', '#24243a', '#141420'], out: '#101018', outD: '#08080e', water: ['#9ffcf0', '#3ad8d0', '#1a8a98'], flowers: ['#9ef0ff', '#ff9ef0'], amb: 'cave', leaf: '#9ef0ff', tree: ['#3a5a6a', '#4a6a7a', '#2a4a5a'], cobble: true, dark: 0.45, darkC: '#06061a', tint: 'rgba(80,120,255,.06)' },
    ruins: { g: ['#c8a468', '#d8b87a', '#e6ca90', '#f0daa8'], tuft: ['#a89a50', '#b8a860', '#8a8a4a'], dirt: '#b08a50', path: '#d8ccb0', pathD: '#a89a7a', pathL: '#f0e6cc', edge: '#8a6a40', cliff: ['#c89a5a', '#9a6e38', '#6a4a22'], out: '#c89050', outD: '#9a6a30', water: ['#6ae0f0', '#2fb4d8', '#1f86b0'], flowers: ['#ffb36b', '#ff7f9a'], amb: 'desert', leaf: '#e8c070', tree: ['#4caf6a', '#5fc070', '#3a8a50'], cobble: true, dark: 0, tint: 'rgba(255,160,60,.07)' },
    deep: { g: ['#24707e', '#2c808e', '#36909c', '#44a0aa'], tuft: ['#1e6a5a', '#2a8a6a', '#3aa87a'], dirt: '#1a5a66', path: '#d8d0b0', pathD: '#a89c7a', pathL: '#f0ead2', edge: '#14404a', cliff: ['#2a6a78', '#1a4a58', '#0e2e3a'], out: '#0c3a58', outD: '#06203a', water: ['#2a7a9a', '#14506e', '#0a2e48'], flowers: ['#ff9ad0', '#ffd36b', '#9ef0ff'], amb: 'deep', leaf: '#3aa87a', tree: ['#e86a8a', '#f08a5a', '#c84a9a'], dark: 0.12, darkC: '#04182e', tint: 'rgba(40,140,200,.12)' },
    bamboo: { g: ['#4f9a3e', '#62ae4a', '#78c058', '#92d26c'], tuft: ['#3f8a34', '#5aa844', '#8ad064'], dirt: '#8a6a3e', path: '#dcc490', pathD: '#a88a58', pathL: '#f0dcaa', edge: '#5a4428', cliff: ['#8a7a58', '#62543a', '#443a28'], out: '#1e4a2a', outD: '#10301a', water: ['#8ae8e0', '#4ac0c8', '#2a8aa0'], flowers: ['#ffd1e6', '#ffffff', '#ffb3c8'], amb: 'forest', leaf: '#9ad86a', tree: ['#58a848', '#6cbc58', '#449a3c'], dark: 0, tint: 'rgba(120,220,140,.05)' },
    harbor: { g: ['#2c3e52', '#34485e', '#3e546a', '#4a6278'], tuft: ['#2a3c4a', '#3a5060', '#5a7488'], dirt: '#26303e', path: '#7a7a7e', pathD: '#4e4e56', pathL: '#9a9aa0', edge: '#1a2230', cliff: ['#3a4656', '#262e3c', '#161c28'], out: '#0a1424', outD: '#050a14', water: ['#3a6a8a', '#1e4a6a', '#10304a'], flowers: ['#9ef0ff', '#ffe08a'], amb: 'night', leaf: '#5a7a8a', tree: ['#2a4a5a', '#345a68', '#1e3644'], cobble: true, dark: 0.62, darkC: '#06101e', tint: 'rgba(90,140,200,.08)' },
    river: { g: ['#5aa848', '#6cba54', '#82cc64', '#9adc78'], tuft: ['#4a9a3c', '#68b850', '#94d470'], dirt: '#8a7048', path: '#e2d0a0', pathD: '#b09868', pathL: '#f4e6c0', edge: '#6a5434', cliff: ['#9a8862', '#6e6044', '#4a402e'], out: '#1e5a46', outD: '#0e3a2c', water: ['#8ef0e0', '#3ac0b8', '#1a8a90'], flowers: ['#ffffff', '#ffe066', '#ff9ec7'], amb: 'forest', leaf: '#9adc78', tree: ['#4aa850', '#5cbc5c', '#3a9244'], dark: 0, tint: 'rgba(80,220,200,.05)' },
    plateau: { g: ['#7a7a52', '#8a8a5e', '#9c9c6a', '#b0ae7a'], tuft: ['#6a6a44', '#8a8a5a', '#b0b07a'], dirt: '#6a5a40', path: '#d4c4a0', pathD: '#a8987a', pathL: '#ece0c4', edge: '#5a4a34', cliff: ['#8a7e6a', '#62584a', '#423a30'], out: '#2a2a3c', outD: '#16161f', water: ['#9ac8f0', '#5a8ab8', '#3a5a8a'], flowers: ['#d7c8ff', '#ffffff', '#ffe08a'], amb: 'desert', leaf: '#b0ae7a', tree: ['#6a8a4a', '#7a9a5a', '#5a7a3a'], dark: 0.08, darkC: '#14142a', tint: 'rgba(120,110,200,.08)' },
    amber: { g: ['#5a3a22', '#6a4628', '#7a5430', '#8a643a'], tuft: ['#4a3420', '#6a4a2a', '#9a7040'], dirt: '#3a2414', path: '#c8a070', pathD: '#8a6a44', pathL: '#e0c090', edge: '#2a1a0e', cliff: ['#6a4a2e', '#4a3220', '#2a1c12'], out: '#160c06', outD: '#0a0603', water: ['#ffe08a', '#ffb03a', '#c8701a'], flowers: ['#ffc84a', '#ff9a3a'], amb: 'cave', leaf: '#ffc84a', tree: ['#8a6a3a', '#9a7a4a', '#6a4a2a'], cobble: true, dark: 0.38, darkC: '#1a0a02', tint: 'rgba(255,160,60,.08)' },
    spire: { g: ['#3e3266', '#483a74', '#544684', '#625496'], tuft: ['#342a58', '#4a3c78', '#6a5aa0'], dirt: '#2a2048', path: '#b8acd4', pathD: '#7a6e9a', pathL: '#d8ccec', edge: '#1e163a', cliff: ['#4a3e6e', '#30284e', '#1c1632'], out: '#0c0820', outD: '#060410', water: ['#b89aff', '#7a5ae8', '#4a32a8'], flowers: ['#ffd36b', '#c8a8ff'], amb: 'night', leaf: '#c8a8ff', tree: ['#4a3a7a', '#5a4a8a', '#3a2a6a'], cobble: true, dark: 0.22, darkC: '#0a0620', tint: 'rgba(200,140,255,.07)' },
    tundra: { g: ['#c4d6e6', '#d8e6f2', '#eaf2fa', '#fafdff'], tuft: ['#9ab0c0', '#b4c6d4', '#7a94a8'], dirt: '#a8b8c8', path: '#b8c8d8', pathD: '#8094a8', pathL: '#dae4ee', edge: '#5a6e82', cliff: ['#98b0c4', '#6a8298', '#44586c'], out: '#4a6884', outD: '#2e4660', water: ['#e0f6ff', '#9ed8f2', '#5aa8d8'], flowers: ['#ffffff', '#cfefff'], amb: 'snow', leaf: '#ffffff', tree: ['#3a6a58', '#4a7a66', '#2a5444'], cobble: true, dark: 0, tint: 'rgba(130,180,255,.07)' },
    forge: { g: ['#3a302c', '#463a34', '#54463e', '#62544a'], tuft: ['#2e2622', '#4a3e36', '#6a5a4c'], dirt: '#2a201c', path: '#8a7a6a', pathD: '#5a4a3e', pathL: '#a8988a', edge: '#1e1612', cliff: ['#5a4a40', '#3a2e28', '#221a16'], out: '#1a120e', outD: '#0c0806', water: ['#ffe27a', '#ff8a2a', '#c83a12'], flowers: ['#ff9a3a', '#ffd36b'], amb: 'volcano', leaf: '#ff9a3a', tree: ['#3a3030', '#4a3a36', '#2a2222'], cobble: true, dark: 0.3, darkC: '#1e0c04', tint: 'rgba(255,120,40,.07)' },
    glacier: { g: ['#7ab0c8', '#8ec0d6', '#a8d2e4', '#c4e4f2'], tuft: ['#6a9ab4', '#8ab8d0', '#b8dcec'], dirt: '#6a94ac', path: '#dce9f2', pathD: '#9ab4c8', pathL: '#f4faff', edge: '#3e6a88', cliff: ['#6a9ab8', '#46728e', '#2a4a64'], out: '#0e2238', outD: '#06121e', water: ['#c8f0ff', '#5ab8e0', '#1e6a98'], flowers: ['#c8f0ff', '#d8c8ff'], amb: 'snow', leaf: '#dff6ff', tree: ['#3a6a7a', '#4a7a8a', '#2a5a6a'], dark: 0.2, darkC: '#04142a', tint: 'rgba(120,200,255,.08)' },
    fortress: { g: ['#7a8088', '#8a9098', '#9aa0a8', '#b4bac2'], tuft: ['#6a7078', '#8a9098', '#c8d0d8'], dirt: '#6a6a70', path: '#b8b0a0', pathD: '#7a7468', pathL: '#d8d0c0', edge: '#3a3e44', cliff: ['#7a7e86', '#54585e', '#34383e'], out: '#2a3038', outD: '#161a20', water: ['#a8d8f0', '#5a8ab8', '#2a5a88'], flowers: ['#ffffff'], amb: 'snow', leaf: '#ffffff', tree: ['#3a6a58', '#4a7a66', '#2a5444'], cobble: true, dark: 0.12, darkC: '#0e1420', tint: 'rgba(160,180,220,.06)' },
    rift: { g: ['#2e3a4e', '#38465c', '#44546a', '#52627a'], tuft: ['#2a3444', '#4a5a70', '#7a8ea8'], dirt: '#222a38', path: '#9a9aa4', pathD: '#5a5a66', pathL: '#babac4', edge: '#141a26', cliff: ['#3a4658', '#262e3c', '#161c28'], out: '#121824', outD: '#080c14', water: ['#ffe27a', '#ff8a2a', '#c83a12'], flowers: ['#ff9a3a', '#9fe6ff'], amb: 'volcano', leaf: '#ff9a3a', tree: ['#2a4a5a', '#345a68', '#1e3644'], cobble: true, dark: 0.3, darkC: '#0a0a1a', tint: 'rgba(120,150,255,.06)' },
    aurora: { g: ['#2a4660', '#34526e', '#3e5e7c', '#4c6e8c'], tuft: ['#2a4258', '#4a6a88', '#8ab0c8'], dirt: '#22364a', path: '#b8c8d8', pathD: '#7a8aa0', pathL: '#dce6f0', edge: '#142030', cliff: ['#3a5670', '#263c54', '#16263a'], out: '#060c1a', outD: '#02040c', water: ['#d8f8ff', '#7ad0f0', '#2a7aa8'], flowers: ['#9fffd8', '#d8c8ff'], amb: 'night', leaf: '#9fffd8', tree: ['#2a4a5a', '#345a68', '#1e3644'], cobble: true, dark: 0.42, darkC: '#040a1c', tint: 'rgba(120,255,200,.05)' },
  };
  const pal = th => PAL[th] || PAL.meadow;

  // ───────── 道具（裝飾物）美術 ─────────
  function canopy(x, cx, cy, r, c, rng) {
    // 一團樹冠：數個圓疊起來，下暗上亮
    const blobs = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + rng() * 0.5; blobs.push([cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.42, r * (0.5 + rng() * 0.15)]); }
    blobs.push([cx, cy - r * 0.15, r * 0.62]);
    x.beginPath(); for (const [bx, by, br] of blobs) { x.moveTo(bx + br, by); x.arc(bx, by, br, 0, TAU); }
    x.fillStyle = shade(c, -0.25); x.fill();
    for (const [bx, by, br] of blobs) { circ(x, bx - br * 0.12, by - br * 0.15, br * 0.85, c); }
    for (const [bx, by, br] of blobs) if (by < cy) circ(x, bx - br * 0.3, by - br * 0.35, br * 0.42, shade(c, 0.22));
    circ(x, cx - r * 0.3, cy - r * 0.45, r * 0.18, shade(c, 0.4));
  }
  function propDraw(x, k, u, v, th) {
    const P = pal(th), rng = mkRng(Math.floor(v * 9973) + 7);
    switch (k) {
      case 'tree': {
        const sz = 0.8 + v * 0.45;
        ell(x, u * 0.04, 0, u * 0.36 * sz, u * 0.13 * sz, 'rgba(0,0,0,.22)');
        x.beginPath(); x.moveTo(-u * 0.06 * sz, 0); x.lineTo(-u * 0.045 * sz, -u * 0.4 * sz); x.lineTo(u * 0.045 * sz, -u * 0.4 * sz); x.lineTo(u * 0.07 * sz, 0); x.closePath();
        x.fillStyle = lgrad(x, -u * 0.06, 0, u * 0.06, 0, ['#9a6a3e', '#6a4424']); x.fill();
        canopy(x, 0, -u * 0.55 * sz, u * 0.36 * sz, P.tree[v < 0.5 ? 0 : 1], rng);
        if (th === 'meadow' && v > 0.7) for (let i = 0; i < 4; i++) circ(x, (rng() - 0.5) * u * 0.5 * sz, -u * (0.4 + rng() * 0.35) * sz, u * 0.035, '#ff5a4a');
        if (th === 'forest' && v > 0.6) for (let i = 0; i < 3; i++) circ(x, (rng() - 0.5) * u * 0.5 * sz, -u * (0.4 + rng() * 0.35) * sz, u * 0.03, '#ffe066');
        break;
      }
      case 'pine': case 'spine': {
        const sz = 0.85 + v * 0.45, g = SNOWY(th) || k === 'spine' ? '#3f7a5e' : (v < 0.5 ? '#2f7a44' : '#3a8a4c');
        ell(x, u * 0.04, 0, u * 0.3 * sz, u * 0.11 * sz, 'rgba(0,0,0,.22)');
        x.fillStyle = '#6b4a30'; x.fillRect(-u * 0.04 * sz, -u * 0.2 * sz, u * 0.08 * sz, u * 0.2 * sz);
        for (let i = 0; i < 4; i++) {
          const yy = -u * (0.15 + i * 0.2) * sz, w = u * (0.36 - i * 0.07) * sz, h = u * 0.34 * sz;
          x.beginPath(); x.moveTo(-w, yy); for (let j = 0; j <= 6; j++) x.lineTo(-w + j * w / 3, yy + (j % 2 ? -u * 0.03 : u * 0.02)); x.lineTo(0, yy - h); x.closePath();
          x.fillStyle = lgrad(x, -w, 0, w, 0, [shade(g, 0.18), g, shade(g, -0.3)]); x.fill();
          if (SNOWY(th) || k === 'spine') { x.beginPath(); x.moveTo(-w * 0.55, yy - h * 0.45); x.quadraticCurveTo(0, yy - h * 0.25, w * 0.5, yy - h * 0.5); x.lineTo(0, yy - h); x.closePath(); x.fillStyle = '#f4faff'; x.fill(); }
        }
        break;
      }
      case 'bush': {
        const sz = 0.8 + v * 0.3;
        ell(x, u * 0.03, 0, u * 0.3 * sz, u * 0.1 * sz, 'rgba(0,0,0,.2)');
        canopy(x, 0, -u * 0.15 * sz, u * 0.22 * sz, P.tree[2] || '#3d8f3a', rng);
        if (v > 0.5) for (let i = 0; i < 5; i++) circ(x, (rng() - 0.5) * u * 0.36, -u * (0.08 + rng() * 0.2), u * 0.03, P.flowers[i % P.flowers.length]);
        break;
      }
      case 'rock': case 'pebble': {
        const big = k === 'rock', sz = (big ? 0.85 : 0.45) + v * 0.35;
        const c = th === 'cave' ? '#5a5a74' : th === 'deep' ? '#5a8a90' : th === 'sky' ? '#c8c4bc' : th === 'volcano' || th === 'forge' ? '#4a3a36' : SNOWY(th) ? '#90a4b8' : th === 'desert' || th === 'ruins' ? '#c49060' : th === 'canyon' ? '#b0603a' : th === 'night' ? '#5a5a7a' : '#9aa0a6';
        ell(x, u * 0.04, 0, u * 0.32 * sz, u * 0.1 * sz, 'rgba(0,0,0,.25)');
        const pts = [-0.32, 0.02, -0.28, -0.2, -0.1, -0.36, 0.14, -0.34, 0.3, -0.16, 0.32, 0.02].map(n => n * u * sz);
        x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath();
        x.fillStyle = lgrad(x, -u * 0.3, -u * 0.36, u * 0.3, 0, [shade(c, 0.3), c, shade(c, -0.3)]); x.fill();
        poly(x, [-0.28 * u * sz, -0.2 * u * sz, -0.1 * u * sz, -0.36 * u * sz, 0.14 * u * sz, -0.34 * u * sz, 0.0, -0.18 * u * sz], shade(c, 0.35));
        x.strokeStyle = rgba('#000000', 0.25); x.lineWidth = Math.max(1, u * 0.012); x.beginPath(); x.moveTo(0.02 * u * sz, -0.3 * u * sz); x.lineTo(0.08 * u * sz, -0.1 * u * sz); x.stroke();
        if (SNOWY(th)) { x.beginPath(); x.ellipse(-0.06 * u * sz, -0.3 * u * sz, 0.16 * u * sz, 0.06 * u * sz, -0.1, 0, TAU); x.fillStyle = '#ffffff'; x.fill(); }
        if ((th === 'meadow' || th === 'forest' || th === 'swamp') && v > 0.5) { x.beginPath(); x.ellipse(-0.12 * u * sz, -0.24 * u * sz, 0.1 * u * sz, 0.05 * u * sz, -0.5, 0, TAU); x.fillStyle = rgba('#5aa83c', 0.8); x.fill(); }
        break;
      }
      case 'mush': {
        const cap = th === 'swamp' ? (v < 0.5 ? '#c86ad8' : '#e5484d') : (v < 0.5 ? '#e5484d' : '#9b6bff');
        const ms = [[0, 0, 1], [u * 0.17, u * 0.05, 0.6], [-u * 0.15, u * 0.06, 0.5]];
        ell(x, u * 0.02, u * 0.04, u * 0.3, u * 0.08, 'rgba(0,0,0,.2)');
        for (const [mx, my, f] of ms) {
          rrect(x, mx - u * 0.04 * f, my - u * 0.22 * f, u * 0.08 * f, u * 0.22 * f, u * 0.03 * f); x.fillStyle = '#f2e6cf'; x.fill();
          x.beginPath(); x.ellipse(mx, my - u * 0.22 * f, u * 0.16 * f, u * 0.12 * f, 0, Math.PI, 0); x.lineTo(mx + u * 0.16 * f, my - u * 0.2 * f); x.lineTo(mx - u * 0.16 * f, my - u * 0.2 * f); x.closePath();
          x.fillStyle = lgrad(x, 0, my - u * 0.34 * f, 0, my - u * 0.2 * f, [shade(cap, 0.25), cap]); x.fill();
          circ(x, mx - u * 0.06 * f, my - u * 0.28 * f, u * 0.025 * f, '#fff'); circ(x, mx + u * 0.05 * f, my - u * 0.3 * f, u * 0.02 * f, '#fff');
        }
        break;
      }
      case 'cactus': {
        const c = '#4caf6a', sz = 0.85 + v * 0.35;
        ell(x, u * 0.04, 0, u * 0.24 * sz, u * 0.08 * sz, 'rgba(0,0,0,.22)');
        const arm = (ax, ay, w, h) => { rrect(x, ax - w / 2, ay - h, w, h, w / 2); x.fillStyle = lgrad(x, ax - w / 2, 0, ax + w / 2, 0, [shade(c, 0.25), c, shade(c, -0.3)]); x.fill(); };
        arm(0, 0, u * 0.18 * sz, u * 0.62 * sz);
        arm(-u * 0.18 * sz, -u * 0.18 * sz, u * 0.11 * sz, u * 0.24 * sz); x.fillStyle = shade(c, -0.1); x.fillRect(-u * 0.18 * sz, -u * 0.22 * sz, u * 0.12 * sz, u * 0.08 * sz);
        arm(u * 0.17 * sz, -u * 0.26 * sz, u * 0.11 * sz, u * 0.22 * sz); x.fillRect(u * 0.06 * sz, -u * 0.3 * sz, u * 0.12 * sz, u * 0.08 * sz);
        x.strokeStyle = rgba('#ffffff', 0.5); x.lineWidth = 1;
        for (let i = 0; i < 6; i++) { const yy = -u * (0.1 + i * 0.08) * sz; x.beginPath(); x.moveTo(-u * 0.03, yy); x.lineTo(-u * 0.05, yy - u * 0.02); x.moveTo(u * 0.03, yy - u * 0.03); x.lineTo(u * 0.05, yy - u * 0.05); x.stroke(); }
        if (v > 0.5) { circ(x, 0, -u * 0.63 * sz, u * 0.05, '#ff7fbf'); circ(x, 0, -u * 0.63 * sz, u * 0.02, '#ffe066'); }
        break;
      }
      case 'palm': {
        const sz = 0.9 + v * 0.35;
        ell(x, u * 0.25 * sz, 0, u * 0.36 * sz, u * 0.1 * sz, 'rgba(0,0,0,.2)');
        x.lineCap = 'round';
        x.strokeStyle = '#7a5a34'; x.lineWidth = u * 0.1 * sz; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(u * 0.18 * sz, -u * 0.45 * sz, u * 0.08 * sz, -u * 0.85 * sz); x.stroke();
        x.strokeStyle = '#b08a5a'; x.lineWidth = u * 0.06 * sz; x.stroke();
        x.strokeStyle = rgba('#5a3a1e', 0.6); x.lineWidth = Math.max(1, u * 0.015);
        for (let i = 1; i < 8; i++) { const f = i / 8, px = 2 * (1 - f) * f * u * 0.18 * sz + f * f * u * 0.08 * sz, py = -f * u * 0.85 * sz; x.beginPath(); x.moveTo(px - u * 0.04, py); x.lineTo(px + u * 0.04, py - u * 0.01); x.stroke(); }
        const lx = u * 0.08 * sz, ly = -u * 0.86 * sz;
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.55 + (v - 0.5) * 0.4, L = u * (0.42 + (i % 2) * 0.08) * sz;
          const ex = lx + Math.cos(a) * L, ey = ly + Math.sin(a) * L * 0.6 + L * 0.35;
          x.strokeStyle = shade('#3fa84a', i % 2 ? -0.15 : 0.05); x.lineWidth = u * 0.07 * sz;
          x.beginPath(); x.moveTo(lx, ly); x.quadraticCurveTo(lx + Math.cos(a) * L * 0.6, ly + Math.sin(a) * L * 0.6 - L * 0.15, ex, ey); x.stroke();
        }
        circ(x, lx - u * 0.04, ly + u * 0.05, u * 0.045, '#7a4a20'); circ(x, lx + u * 0.04, ly + u * 0.06, u * 0.045, '#6a3e18');
        x.lineCap = 'butt';
        break;
      }
      case 'dead': {
        const sz = 0.85 + v * 0.35, c = th === 'volcano' ? '#2a1a14' : th === 'night' ? '#3a3448' : '#5b4a42';
        ell(x, u * 0.04, 0, u * 0.24 * sz, u * 0.08 * sz, 'rgba(0,0,0,.22)');
        x.lineCap = 'round'; x.strokeStyle = c;
        const br = (x0, y0, a, L, w, d) => { if (d > 3 || L < u * 0.05) return; const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); br(x1, y1, a - 0.5 - rng() * 0.3, L * 0.62, w * 0.65, d + 1); br(x1, y1, a + 0.4 + rng() * 0.3, L * 0.58, w * 0.62, d + 1); };
        br(0, 0, -Math.PI / 2, u * 0.38 * sz, u * 0.09 * sz, 0);
        x.lineCap = 'butt';
        break;
      }
      case 'crystal': {
        const c = th === 'volcano' || th === 'amber' ? (v < 0.5 ? '#ff9a4a' : '#ffd36b') : th === 'spire' ? (v < 0.5 ? '#c8a8ff' : '#ffd36b') : (v < 0.5 ? '#7fe8ff' : '#c49bff');
        ell(x, u * 0.03, 0, u * 0.28, u * 0.09, 'rgba(0,0,0,.25)');
        for (const [cx, w, h, t] of [[-0.12, 0.08, 0.36, -0.3], [0.12, 0.07, 0.3, 0.35], [0, 0.11, 0.55, 0.0], [0.2, 0.05, 0.18, 0.6]]) Art.crystal(x, cx * u, 0, w * u, h * u, c, u, t);
        break;
      }
      case 'grave': {
        ell(x, u * 0.03, 0, u * 0.24, u * 0.08, 'rgba(0,0,0,.25)');
        x.beginPath(); x.ellipse(0, -u * 0.01, u * 0.2, u * 0.06, 0, 0, TAU); x.fillStyle = '#4a4a5a'; x.fill();
        rrect(x, -u * 0.13, -u * 0.42, u * 0.26, u * 0.42, [u * 0.13, u * 0.13, u * 0.01, u * 0.01]);
        x.fillStyle = lgrad(x, -u * 0.13, 0, u * 0.13, 0, ['#b0b4c8', '#8b8fa6', '#5a5e72']); x.fill();
        x.fillStyle = '#5a5e72'; x.fillRect(-u * 0.02, -u * 0.32, u * 0.04, u * 0.17); x.fillRect(-u * 0.07, -u * 0.27, u * 0.14, u * 0.04);
        x.fillStyle = rgba('#5aa83c', 0.7); x.beginPath(); x.ellipse(-u * 0.08, -u * 0.02, u * 0.08, u * 0.04, 0, 0, TAU); x.fill();
        break;
      }
      case 'ruin': {
        const c = th === 'desert' ? '#e2c8a0' : th === 'night' ? '#7a7a98' : '#c8c2b4';
        ell(x, u * 0.04, 0, u * 0.3, u * 0.1, 'rgba(0,0,0,.22)');
        rrect(x, -u * 0.13, -u * 0.06, u * 0.26, u * 0.08, u * 0.01); x.fillStyle = shade(c, -0.15); x.fill();
        x.beginPath(); x.moveTo(-u * 0.09, -u * 0.06); x.lineTo(-u * 0.09, -u * 0.5); x.lineTo(-u * 0.02, -u * 0.44); x.lineTo(u * 0.04, -u * 0.55); x.lineTo(u * 0.09, -u * 0.38); x.lineTo(u * 0.09, -u * 0.06); x.closePath();
        x.fillStyle = lgrad(x, -u * 0.09, 0, u * 0.09, 0, [shade(c, 0.2), c, shade(c, -0.25)]); x.fill();
        x.strokeStyle = rgba('#000000', 0.18); x.lineWidth = 1; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * u * 0.05, -u * 0.08); x.lineTo(i * u * 0.05, -u * 0.42); x.stroke(); }
        rrect(x, u * 0.1, -u * 0.08, u * 0.16, u * 0.1, u * 0.02); x.fillStyle = shade(c, -0.05); x.fill();
        x.fillStyle = rgba('#5aa83c', 0.7); x.beginPath(); x.ellipse(-u * 0.05, -u * 0.06, u * 0.1, u * 0.03, 0, 0, TAU); x.fill();
        break;
      }
      case 'lamp': {
        ell(x, u * 0.03, 0, u * 0.12, u * 0.05, 'rgba(0,0,0,.25)');
        x.fillStyle = '#2a2a3a'; x.fillRect(-u * 0.025, -u * 0.6, u * 0.05, u * 0.6);
        x.fillStyle = '#3a3a4e'; x.fillRect(-u * 0.06, -u * 0.04, u * 0.12, u * 0.04);
        rrect(x, -u * 0.07, -u * 0.74, u * 0.14, u * 0.15, u * 0.02); x.fillStyle = '#ffd36b'; x.fill();
        x.strokeStyle = '#2a2a3a'; x.lineWidth = Math.max(1, u * 0.02); x.stroke();
        poly(x, [-u * 0.09, -u * 0.74, u * 0.09, -u * 0.74, 0, -u * 0.84], '#2a2a3a');
        break;
      }
      case 'reed': {
        x.lineCap = 'round';
        for (let i = 0; i < 6; i++) { const px = (i - 2.5) * u * 0.05, h = u * (0.25 + rng() * 0.2); x.strokeStyle = shade('#6a8a3a', rng() * 0.3 - 0.15); x.lineWidth = Math.max(1, u * 0.025); x.beginPath(); x.moveTo(px, 0); x.quadraticCurveTo(px + u * 0.03, -h * 0.6, px + (rng() - 0.5) * u * 0.08, -h); x.stroke(); if (i % 2) { x.strokeStyle = '#6a4a2a'; x.lineWidth = Math.max(2, u * 0.04); x.beginPath(); x.moveTo(px + u * 0.005, -h * 0.85); x.lineTo(px + u * 0.01, -h * 0.65); x.stroke(); } }
        x.lineCap = 'butt';
        break;
      }
      case 'stump': {
        ell(x, u * 0.03, 0, u * 0.18, u * 0.06, 'rgba(0,0,0,.22)');
        rrect(x, -u * 0.12, -u * 0.14, u * 0.24, u * 0.14, u * 0.02); x.fillStyle = lgrad(x, -u * 0.12, 0, u * 0.12, 0, ['#9a6a3e', '#6a4424']); x.fill();
        x.beginPath(); x.ellipse(0, -u * 0.14, u * 0.12, u * 0.045, 0, 0, TAU); x.fillStyle = '#d8b07a'; x.fill();
        x.strokeStyle = '#9a6a3e'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, -u * 0.14, u * 0.06, u * 0.022, 0, 0, TAU); x.stroke();
        break;
      }
      case 'crate': {
        ell(x, u * 0.03, 0, u * 0.2, u * 0.07, 'rgba(0,0,0,.22)');
        rrect(x, -u * 0.13, -u * 0.22, u * 0.22, u * 0.22, u * 0.01); x.fillStyle = '#b07a44'; x.fill();
        x.strokeStyle = '#6a4424'; x.lineWidth = Math.max(1, u * 0.02); x.strokeRect(-u * 0.12, -u * 0.21, u * 0.2, u * 0.2); x.beginPath(); x.moveTo(-u * 0.12, -u * 0.21); x.lineTo(u * 0.08, -u * 0.01); x.stroke();
        // 木桶
        x.beginPath(); x.ellipse(u * 0.16, -u * 0.02, u * 0.08, u * 0.03, 0, 0, Math.PI); x.lineTo(u * 0.08, -u * 0.17); x.ellipse(u * 0.16, -u * 0.17, u * 0.08, u * 0.03, 0, Math.PI, 0, true); x.closePath();
        x.fillStyle = lgrad(x, u * 0.08, 0, u * 0.24, 0, ['#a8743e', '#7a4a22']); x.fill();
        x.fillStyle = '#4b4f58'; x.fillRect(u * 0.08, -u * 0.13, u * 0.16, u * 0.02); x.fillRect(u * 0.08, -u * 0.06, u * 0.16, u * 0.02);
        x.beginPath(); x.ellipse(u * 0.16, -u * 0.17, u * 0.08, u * 0.03, 0, 0, TAU); x.fillStyle = '#c8945a'; x.fill();
        break;
      }
      case 'fence': {
        x.strokeStyle = '#8a5a2e'; x.lineWidth = Math.max(1.5, u * 0.035);
        for (let i = -1; i <= 1; i++) { x.fillStyle = '#9a6a3a'; x.fillRect(i * u * 0.16 - u * 0.025, -u * 0.24, u * 0.05, u * 0.24); }
        x.beginPath(); x.moveTo(-u * 0.22, -u * 0.17); x.lineTo(u * 0.22, -u * 0.17); x.moveTo(-u * 0.22, -u * 0.08); x.lineTo(u * 0.22, -u * 0.08); x.stroke();
        break;
      }
      case 'pillar': {
        const c = '#e2d2aa', sz = 0.85 + v * 0.3, broken = v < 0.55;
        ell(x, u * 0.05, 0, u * 0.3 * sz, u * 0.1 * sz, 'rgba(0,0,0,.25)');
        rrect(x, -u * 0.17 * sz, -u * 0.08 * sz, u * 0.34 * sz, u * 0.08 * sz, u * 0.01); x.fillStyle = shade(c, -0.2); x.fill();
        const h = u * (broken ? 0.42 : 0.72) * sz, w = u * 0.11 * sz;
        x.beginPath(); x.moveTo(-w, -u * 0.08 * sz); x.lineTo(-w, -h); if (broken) { x.lineTo(-w * 0.3, -h + u * 0.06); x.lineTo(w * 0.2, -h - u * 0.05); x.lineTo(w, -h + u * 0.03); } else x.lineTo(w, -h); x.lineTo(w, -u * 0.08 * sz); x.closePath();
        x.fillStyle = lgrad(x, -w, 0, w, 0, [shade(c, 0.25), c, shade(c, -0.3)]); x.fill();
        x.strokeStyle = rgba('#6a5030', 0.35); x.lineWidth = Math.max(1, u * 0.012);
        for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * w * 0.55, -u * 0.1 * sz); x.lineTo(i * w * 0.55, -h + u * 0.04); x.stroke(); }
        if (!broken) { rrect(x, -w * 1.5, -h - u * 0.07 * sz, w * 3, u * 0.07 * sz, u * 0.01); x.fillStyle = shade(c, 0.1); x.fill(); }
        else { rrect(x, w * 1.2, -u * 0.1 * sz, u * 0.16 * sz, u * 0.1 * sz, u * 0.02); x.fillStyle = shade(c, -0.1); x.fill(); }
        x.fillStyle = rgba('#c8a868', 0.6); x.beginPath(); x.ellipse(0, -u * 0.03, u * 0.2 * sz, u * 0.04, 0, 0, TAU); x.fill();
        break;
      }
      case 'coral': {
        const cs = [['#ff7aa8', '#c84a7a'], ['#ffa25a', '#c86a2a'], ['#b88aff', '#7a4ac8']][Math.floor(v * 3) % 3], sz = 0.8 + v * 0.4;
        ell(x, u * 0.03, 0, u * 0.28 * sz, u * 0.09 * sz, 'rgba(0,0,0,.25)');
        x.lineCap = 'round';
        const br = (x0, y0, a, L, w, d) => { if (d > 3) return; const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; x.strokeStyle = cs[1]; x.lineWidth = w + 2; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.strokeStyle = cs[0]; x.lineWidth = w; x.stroke(); br(x1, y1, a - 0.45 - rng() * 0.3, L * 0.7, w * 0.75, d + 1); br(x1, y1, a + 0.45 + rng() * 0.3, L * 0.65, w * 0.75, d + 1); if (d === 3) circ(x, x1, y1, w * 0.7, shade(cs[0], 0.35)); };
        br(0, 0, -Math.PI / 2, u * 0.2 * sz, u * 0.07 * sz, 0);
        x.lineCap = 'butt';
        break;
      }
      case 'shell': {
        ell(x, u * 0.03, 0, u * 0.2, u * 0.07, 'rgba(0,0,0,.25)');
        x.beginPath(); x.moveTo(0, -u * 0.02); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; x.lineTo(Math.cos(a) * u * 0.17, -u * 0.04 + Math.sin(a) * u * 0.17); } x.closePath();
        x.fillStyle = lgrad(x, 0, -u * 0.2, 0, 0, ['#fff4e8', '#f0c8b0', '#d8987a']); x.fill();
        x.strokeStyle = rgba('#a86a4a', 0.6); x.lineWidth = Math.max(1, u * 0.012); for (let i = 1; i < 8; i++) { const a = Math.PI + i / 8 * Math.PI; x.beginPath(); x.moveTo(0, -u * 0.03); x.lineTo(Math.cos(a) * u * 0.16, -u * 0.04 + Math.sin(a) * u * 0.16); x.stroke(); }
        circ(x, u * 0.18, -u * 0.03, u * 0.04, '#ffffff'); circ(x, u * 0.17, -u * 0.04, u * 0.015, '#ffe9f0');
        break;
      }
      case 'bamboo': {
        // 一叢竹子：粗細不一、有竹節的竹竿，頂端一團團細長竹葉
        const sz = 0.85 + v * 0.4;
        ell(x, u * 0.04, 0, u * 0.32 * sz, u * 0.1 * sz, 'rgba(0,0,0,.22)');
        const n = 4 + Math.floor(v * 3), stalks = [];
        for (let i = 0; i < n; i++) stalks.push({ bx: (i - (n - 1) / 2) * u * 0.075 + (rng() - 0.5) * u * 0.04, h: u * (0.75 + rng() * 0.45) * sz, lean: (rng() - 0.5) * 0.16, w: u * (0.045 + rng() * 0.02), g: ['#6aae44', '#7ac04e', '#5a9a3a'][i % 3] });
        const leafy = (cx, cy, r, c) => { for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42 + (rng() - 0.5) * 0.2, l = r * (0.8 + rng() * 0.5); x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = shade(c, (rng() - 0.5) * 0.25); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(l * 0.5, -l * 0.16, l, 0); x.quadraticCurveTo(l * 0.5, l * 0.12, 0, 0); x.fill(); x.restore(); } };
        for (const st2 of stalks) {
          x.save(); x.translate(st2.bx, 0); x.rotate(st2.lean);
          const { h, w, g } = st2;
          x.fillStyle = lgrad(x, -w / 2, 0, w / 2, 0, [shade(g, 0.3), g, shade(g, -0.32)]); x.fillRect(-w / 2, -h, w, h);
          for (let k = 1; k < 6; k++) { const ny = -h * k / 6; x.fillStyle = shade(g, -0.4); x.fillRect(-w * 0.6, ny - u * 0.009, w * 1.2, u * 0.018); x.fillStyle = rgba('#ffffff', 0.35); x.fillRect(-w * 0.5, ny - u * 0.02, w * 0.9, u * 0.007); }
          leafy(0, -h * 0.98, u * 0.2 * sz, '#5aae42');
          if (h > u * 0.85) leafy((rng() - 0.5) * u * 0.05, -h * 0.68, u * 0.15 * sz, '#68bc4e');
          x.restore();
        }
        break;
      }
      case 'stonelamp': {
        // 石燈籠
        ell(x, u * 0.03, 0, u * 0.16, u * 0.06, 'rgba(0,0,0,.25)');
        const c = '#a8a498';
        rrect(x, -u * 0.1, -u * 0.06, u * 0.2, u * 0.06, u * 0.01); x.fillStyle = shade(c, -0.2); x.fill();
        x.fillStyle = lgrad(x, -u * 0.035, 0, u * 0.035, 0, [shade(c, 0.2), shade(c, -0.25)]); x.fillRect(-u * 0.035, -u * 0.3, u * 0.07, u * 0.25);
        rrect(x, -u * 0.08, -u * 0.44, u * 0.16, u * 0.14, u * 0.015); x.fillStyle = lgrad(x, -u * 0.08, 0, u * 0.08, 0, [shade(c, 0.15), shade(c, -0.25)]); x.fill();
        x.fillStyle = '#ffd36b'; x.fillRect(-u * 0.04, -u * 0.41, u * 0.08, u * 0.08); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(-u * 0.025, -u * 0.4, u * 0.02, u * 0.05);
        poly(x, [-u * 0.15, -u * 0.44, u * 0.15, -u * 0.44, u * 0.06, -u * 0.53, -u * 0.06, -u * 0.53], shade(c, 0.05));
        circ(x, 0, -u * 0.56, u * 0.03, shade(c, 0.1));
        break;
      }
      case 'mast': {
        // 港口：木樁碼頭與纜繩、繫船柱
        ell(x, u * 0.03, 0, u * 0.22, u * 0.08, 'rgba(0,0,0,.25)');
        for (const [px, h] of [[-0.12, 0.42], [0.1, 0.32]]) { x.fillStyle = lgrad(x, px * u - u * 0.04, 0, px * u + u * 0.04, 0, ['#8a6a4a', '#4a3424']); x.fillRect(px * u - u * 0.04, -h * u, u * 0.08, h * u); x.fillStyle = '#5a4a3a'; x.beginPath(); x.ellipse(px * u, -h * u, u * 0.04, u * 0.015, 0, 0, TAU); x.fill(); x.fillStyle = rgba('#a8c8b0', 0.5); x.fillRect(px * u - u * 0.04, -u * 0.08, u * 0.08, u * 0.05); }
        x.strokeStyle = '#d8c08a'; x.lineWidth = Math.max(1, u * 0.015); x.beginPath(); x.moveTo(-u * 0.12, -u * 0.36); x.quadraticCurveTo(0, -u * 0.22, u * 0.1, -u * 0.28); x.stroke();
        x.beginPath(); x.ellipse(-u * 0.12, -u * 0.3, u * 0.05, u * 0.02, 0, 0, TAU); x.stroke();
        break;
      }
      case 'obelisk': {
        // 方尖碑（高原＝灰石＋雷紋、王座＝紫晶石＋金紋）
        const sz = 0.85 + v * 0.3, c = th === 'spire' ? '#4a3a7a' : '#8a8478', gl = th === 'spire' ? '#ffd36b' : '#9ad0ff';
        ell(x, u * 0.04, 0, u * 0.2 * sz, u * 0.07 * sz, 'rgba(0,0,0,.25)');
        rrect(x, -u * 0.13 * sz, -u * 0.07 * sz, u * 0.26 * sz, u * 0.07 * sz, u * 0.01); x.fillStyle = shade(c, -0.2); x.fill();
        const h = u * 0.7 * sz, w = u * 0.08 * sz;
        poly(x, [-w, -u * 0.07 * sz, -w * 0.7, -h, 0, -h - w * 1.2, 0, -u * 0.07 * sz], shade(c, 0.18));
        poly(x, [w, -u * 0.07 * sz, w * 0.7, -h, 0, -h - w * 1.2, 0, -u * 0.07 * sz], shade(c, -0.22));
        x.strokeStyle = gl; x.lineWidth = Math.max(1, u * 0.014);
        x.beginPath(); x.moveTo(-w * 0.4, -h * 0.3); x.lineTo(-w * 0.1, -h * 0.45); x.lineTo(-w * 0.45, -h * 0.55); x.lineTo(-w * 0.1, -h * 0.72); x.stroke();
        break;
      }
      case 'snowman': {
        ell(x, u * 0.03, 0, u * 0.18, u * 0.06, 'rgba(0,0,0,.18)');
        circ(x, 0, -u * 0.12, u * 0.13, '#f4faff'); circ(x, 0, -u * 0.32, u * 0.09, '#ffffff');
        circ(x, -u * 0.03, -u * 0.34, u * 0.012, '#2a2a3a'); circ(x, u * 0.03, -u * 0.34, u * 0.012, '#2a2a3a');
        poly(x, [0, -u * 0.31, u * 0.09, -u * 0.3, 0, -u * 0.29], '#ff8a2a');
        x.fillStyle = '#e5484d'; x.fillRect(-u * 0.08, -u * 0.25, u * 0.16, u * 0.03);
        break;
      }
    }
  }
  function propSprite(k, u, v, th, dpr) {
    const vq = Math.round(v * 6) / 6;
    const W = u * 1.6, H = u * 1.8;
    return Gfx.sprite(`pr:${k}:${th}:${Math.round(u * 4) / 4}:${vq}`, W, H, W / 2, H * 0.86, dpr, x => propDraw(x, k, u, vq, th), Math.max(0.8, u * 0.018));
  }
  const SWAY = { tree: 0.03, pine: 0.02, spine: 0.02, palm: 0.05, bush: 0.02, reed: 0.08, dead: 0.01, bamboo: 0.025 };
  const GLOW = { crystal: 1, lamp: 1, stonelamp: 1 };

  // 從格子的裝飾產生一群道具實例（世界座標）
  function genProps(G) {
    const out = [], th = G.L.theme, rng = mkRng(G.L.seed * 4241 + 9);
    const add = (k, wx, wy, v) => out.push({ k, wx, wy, v: v === undefined ? rng() : v, ph: rng() * 6.28 });
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = G.grid[y][x];
      if (!c.deco) continue;
      const cx = x + 0.5, cy = y + 0.6, v = c.dv;
      switch (c.deco) {
        case 'tree': add('tree', cx - 0.08, cy - 0.12, v); if (v > 0.35) add(v > 0.7 ? 'bush' : 'tree', cx + 0.25, cy + 0.22, rng() * 0.4); else add('rock', cx + 0.28, cy + 0.25, 0.1); break;
        case 'pine': case 'spine': add(c.deco, cx - 0.12, cy - 0.15, v); add(c.deco, cx + 0.22, cy + 0.2, rng() * 0.4); if (SNOWY(th) && v > 0.85) add('snowman', cx - 0.25, cy + 0.25, 0.5); break;
        case 'bush': add('bush', cx, cy, v); if (v > 0.55) add(th === 'meadow' || th === 'coast' ? 'fence' : 'stump', cx + 0.15, cy + 0.28, 0.5); break;
        case 'rock': add(v > 0.82 && th !== 'volcano' ? 'ruin' : 'rock', cx - 0.05, cy - 0.05, v); add('pebble', cx + 0.28, cy + 0.22, rng()); break;
        case 'mush': add('mush', cx, cy, v); if (v > 0.5) add('stump', cx - 0.25, cy - 0.2, 0.5); break;
        case 'cactus': add('cactus', cx, cy - 0.05, v); if (v > 0.5) add('pebble', cx + 0.3, cy + 0.2, rng()); break;
        case 'palm': add('palm', cx - 0.1, cy, v); if (v > 0.4) add('bush', cx + 0.25, cy + 0.2, 0.2); break;
        case 'dead': add('dead', cx, cy, v); if (v > 0.5) add('pebble', cx - 0.25, cy + 0.2, rng()); break;
        case 'crystal': add('crystal', cx, cy, v); break;
        case 'pillar': add('pillar', cx, cy, v); if (v > 0.4) add('pebble', cx + 0.28, cy + 0.2, rng()); break;
        case 'coral': add('coral', cx - 0.1, cy - 0.05, v); if (v > 0.45) add(v > 0.8 ? 'shell' : 'coral', cx + 0.25, cy + 0.22, rng()); break;
        case 'shell': add('shell', cx, cy, v); add('rock', cx - 0.25, cy - 0.15, 0.1); break;
        case 'grave': add('grave', cx - 0.08, cy - 0.05, v); if (v > 0.4) add(v > 0.75 ? 'lamp' : 'grave', cx + 0.26, cy + 0.2, rng()); break;
        case 'bamboo': add('bamboo', cx - 0.08, cy - 0.1, v); if (v > 0.4) add(v > 0.8 ? 'stonelamp' : 'bamboo', cx + 0.24, cy + 0.2, rng() * 0.5); break;
        case 'stonelamp': add('stonelamp', cx, cy, v); add('bush', cx + 0.26, cy + 0.2, 0.2); break;
        case 'mast': add('mast', cx, cy, v); if (v > 0.5) add('crate', cx + 0.25, cy + 0.22, rng()); break;
        case 'crate': add('crate', cx - 0.05, cy, v); if (v > 0.5) add('crate', cx + 0.24, cy + 0.2, rng()); break;
        case 'obelisk': add('obelisk', cx, cy, v); if (v > 0.5) add('pebble', cx + 0.28, cy + 0.22, rng()); break;
        case 'lamp': add('lamp', cx, cy + 0.05, 0.5); break;
        case 'reed': add('reed', cx, cy, v); add('reed', cx + 0.25, cy + 0.2, rng()); if (v > 0.6) add('pebble', cx - 0.25, cy + 0.15, rng()); break;
      }
    }
    // 水邊的蘆葦
    for (const [wx, wy, ww, wh] of (G.L.water || [])) {
      if (th === 'volcano' || th === 'sky' || th === 'cave') continue;
      const n = Math.max(2, Math.round((ww + wh) * 0.8));
      for (let i = 0; i < n; i++) {
        const side = rng() < 0.5, px = side ? wx + rng() * ww : (rng() < 0.5 ? wx - 0.05 : wx + ww + 0.05), py = side ? (rng() < 0.5 ? wy - 0.05 : wy + wh + 0.05) : wy + rng() * wh;
        if (px < 0.2 || py < 0.2 || px > COLS - 0.2 || py > ROWS - 0.2) continue;
        const gx = Math.floor(px), gy = Math.floor(py);
        if (G.grid[gy] && G.grid[gy][gx] && (G.grid[gy][gx].path || (!G.grid[gy][gx].water && !G.grid[gy][gx].block))) continue;
        add(th === 'desert' || th === 'coast' || th === 'ruins' ? 'pebble' : th === 'deep' ? 'shell' : 'reed', px, py, rng());
      }
    }
    return out;
  }

  // ───────── 道路幾何 ─────────
  function offsetLine(pts, off) {
    // 折線往法線方向偏移（斜接）
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      let nx = 0, ny = 0;
      if (a) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy); nx += -dy / l; ny += dx / l; }
      if (c) { const dx = c.x - b.x, dy = c.y - b.y, l = Math.hypot(dx, dy); nx += -dy / l; ny += dx / l; }
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const cos = a && c ? Math.max(0.5, Math.abs(((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) / (Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - b.x, c.y - b.y)))) : 1;
      const m = a && c ? 1 / Math.sqrt((1 + cos) / 2) : 1;
      out.push({ x: b.x + nx * off * m, y: b.y + ny * off * m });
    }
    return out;
  }
  function strokeWorld(x, V, lines, w) {
    x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round';
    for (const pts of lines) { x.beginPath(); pts.forEach((p, i) => { const [a, b] = V.P(p.x, p.y); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke(); }
  }
  function walk(pts, step, fn) {
    let carry = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = carry; d < L; d += step) fn(a.x + (b.x - a.x) * d / L, a.y + (b.y - a.y) * d / L, (b.x - a.x) / L, (b.y - a.y) / L);
      carry = (carry - L) % step; if (carry < 0) carry += step;
    }
  }

  // ───────── 水域形狀 ─────────
  function waterShape(V, rect, s, seed) {
    let [wx, wy, ww, wh] = rect;
    // 碰到地圖邊緣就往外延伸，避免邊緣看到岸
    const ex = 0.8;
    let x0 = wx, y0 = wy, x1 = wx + ww, y1 = wy + wh;
    if (x0 <= 0) x0 -= ex; if (y0 <= 0) y0 -= ex; if (x1 >= COLS) x1 += ex; if (y1 >= ROWS) y1 += ex;
    const ins = 0.08, r = Math.min(0.55, (x1 - x0) / 2 - 0.05, (y1 - y0) / 2 - 0.05);
    x0 += ins; y0 += ins; x1 -= ins; y1 -= ins;
    const pts = [];
    const per = 2 * ((x1 - x0) + (y1 - y0)), N = Math.max(24, Math.round(per * 10));
    // 沿著圓角矩形取點，加雜訊
    for (let i = 0; i < N; i++) {
      const t = i / N * per;
      let px, py, nx, ny;
      const W = x1 - x0, H = y1 - y0;
      if (t < W) { px = x0 + t; py = y0; nx = 0; ny = -1; }
      else if (t < W + H) { px = x1; py = y0 + (t - W); nx = 1; ny = 0; }
      else if (t < 2 * W + H) { px = x1 - (t - W - H); py = y1; nx = 0; ny = 1; }
      else { px = x0; py = y1 - (t - 2 * W - H); nx = -1; ny = 0; }
      // 圓角
      const cx = clamp(px, x0 + r, x1 - r), cy = clamp(py, y0 + r, y1 - r);
      const dx = px - cx, dy = py - cy, dl = Math.hypot(dx, dy);
      if (dl > r) { px = cx + dx / dl * r; py = cy + dy / dl * r; nx = dx / dl; ny = dy / dl; }
      const n = (vnoise(px * 2.2, py * 2.2, seed) - 0.5) * 0.22;
      pts.push(V.P(px + nx * n, py + ny * n));
    }
    const p2 = new Path2D();
    pts.forEach(([a, b], i) => i ? p2.lineTo(a, b) : p2.moveTo(a, b)); p2.closePath();
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const [a, b] of pts) { bx0 = Math.min(bx0, a); by0 = Math.min(by0, b); bx1 = Math.max(bx1, a); by1 = Math.max(by1, b); }
    return { path: p2, pts, box: [bx0, by0, bx1, by1] };
  }

  // ───────── 主背景 ─────────
  function paint(ctx, V, G, W, H, opts) {
    opts = opts || {};
    const th = G.L.theme, P = pal(th), s = V.s;
    const mx = V.ox, my = V.oy, mw = V.w, mh = V.h;
    const rng = mkRng(G.L.seed * 999 + 3);
    // 1. 地圖外的景色
    backdrop(ctx, V, G, W, H, P, th, opts);
    // 2. 懸崖（地圖是一塊高台）
    const ch = s * 0.55;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = s * 0.8; ctx.shadowOffsetY = s * 0.3;
    rrect(ctx, mx, my, mw, mh + ch, s * 0.3); ctx.fillStyle = P.cliff[2]; ctx.fill();
    ctx.restore();
    ctx.save();
    rrect(ctx, mx, my, mw, mh + ch, s * 0.3); ctx.clip();
    ctx.fillStyle = lgrad(ctx, 0, my + mh - s * 0.2, 0, my + mh + ch, [P.cliff[0], P.cliff[1], P.cliff[2]]); ctx.fillRect(mx, my + mh - s * 0.3, mw, ch + s * 0.4);
    // 岩層紋
    const cr = mkRng(G.L.seed + 77);
    for (let i = 0; i < mw / (s * 0.18); i++) {
      const px = mx + i * s * 0.18 + cr() * s * 0.1, top = my + mh, hh = ch * (0.3 + cr() * 0.7);
      ctx.fillStyle = rgba('#000000', 0.08 + cr() * 0.12); ctx.fillRect(px, top, Math.max(1, s * 0.02), hh);
      if (cr() < 0.4) { ctx.fillStyle = rgba('#ffffff', 0.08); ctx.fillRect(px + s * 0.03, top + cr() * ch * 0.5, s * 0.06, s * 0.03); }
    }
    for (let j = 1; j < 3; j++) { ctx.fillStyle = rgba('#000000', 0.1); ctx.fillRect(mx, my + mh + ch * j / 3, mw, Math.max(1, s * 0.02)); }
    ctx.restore();
    // 3. 地面
    ctx.save();
    rrect(ctx, mx, my, mw, mh, s * 0.3); ctx.clip();
    groundNoise(ctx, mx, my, mw, mh, P, G.L.seed, s, th);
    // 大塊明暗斑
    for (let i = 0; i < 14; i++) {
      const cx = mx + rng() * mw, cy = my + rng() * mh, r = s * (1.2 + rng() * 2.4);
      ctx.fillStyle = rgrad(ctx, cx, cy, 0, r, [rng() < 0.5 ? rgba(P.g[3], 0.22) : rgba(P.g[0], 0.25), rgba(P.g[0], 0)]);
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // 泥土斑
    for (let i = 0; i < 6; i++) {
      const gx = Math.floor(rng() * COLS), gy = Math.floor(rng() * ROWS);
      if (G.grid[gy][gx].path || G.grid[gy][gx].water) continue;
      const [cx, cy] = V.P(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6), r = s * (0.25 + rng() * 0.3);
      ctx.fillStyle = rgrad(ctx, cx, cy, 0, r, [rgba(P.dirt, 0.55), rgba(P.dirt, 0.3), rgba(P.dirt, 0)]);
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.7, rng() * 3, 0, TAU); ctx.fill();
      for (let k = 0; k < 4; k++) { const px = cx + (rng() - 0.5) * r, py = cy + (rng() - 0.5) * r * 0.6; ell(ctx, px, py, s * 0.03, s * 0.02, rgba(shade(P.dirt, -0.3), 0.6)); }
    }
    themeGround(ctx, V, G, P, th, rng, s);
    // 4. 水 / 岩漿
    const waters = [];
    (G.L.water || []).forEach((rect, i) => {
      const sh = waterShape(V, rect, s, G.L.seed + i * 13);
      sh.lava = !!G.T.lava; sh.swamp = th === 'swamp'; sh.void = !!G.T.void; sh.deep = th === 'deep';
      waters.push(sh);
      drawWaterBase(ctx, sh, P, s, rng, th);
    });
    // 河道：路線上坐船的那幾段畫成河
    const rivers = [].concat(...G.paths.map(riverRuns));
    if (rivers.length) {
      const seen = new Set();
      for (const [a, b] of rivers) {
        const key = [a.x, a.y, b.x, b.y].join(','); if (seen.has(key)) continue; seen.add(key);
        // 往前後多延伸一點，接上兩端的水域
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        const pts = [{ x: a.x - dx * 0.5, y: a.y - dy * 0.5 }, { x: b.x + dx * 0.5, y: b.y + dy * 0.5 }];
        ctx.save(); ctx.strokeStyle = rgba(P.cliff[1], 0.9); strokeWorld(ctx, V, [pts], s * 1.08); ctx.strokeStyle = '#d8c08a'; strokeWorld(ctx, V, [pts], s * 1.0);
        ctx.strokeStyle = P.water[1]; strokeWorld(ctx, V, [pts], s * 0.86); ctx.strokeStyle = rgba(P.water[2], 0.6); strokeWorld(ctx, V, [pts], s * 0.4); ctx.restore();
        const w = { path: new Path2D(), box: [0, 0, 0, 0], river: true, pts };
        const [ax, ay] = V.P(pts[0].x, pts[0].y), [bx, by] = V.P(pts[1].x, pts[1].y), hw = s * 0.43;
        const x0 = Math.min(ax, bx) - (ax === bx ? hw : 0), x1 = Math.max(ax, bx) + (ax === bx ? hw : 0), y0 = Math.min(ay, by) - (ay === by ? hw : 0), y1 = Math.max(ay, by) + (ay === by ? hw : 0);
        w.path.rect(x0, y0, x1 - x0, y1 - y0); w.box = [x0, y0, x1, y1];
        waters.push(w);
      }
    }
    // 5. 道路
    drawPaths(ctx, V, G, P, s, rng, th);
    // 地道洞口
    for (const PP of G.paths) for (const sg of PP.seg) if (sg.tn) for (const [pt, d] of [[sg.a, 1], [sg.b, -1]]) {
      const [a, b] = V.P(pt.x + sg.dx * d * 0.12, pt.y + sg.dy * d * 0.12), r = s * 0.42;
      ctx.save();
      ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(a, b + s * 0.04, r * 1.15, r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lgrad(ctx, a - r, b - r, a + r, b + r, [shade(P.cliff[0], 0.15), P.cliff[1], P.cliff[2]]); ctx.beginPath(); ctx.ellipse(a, b, r, r * 0.68, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgrad(ctx, a, b + r * 0.1, 0, r * 0.8, ['#050302', '#140c06', rgba('#2a1a0e', 0.9)]); ctx.beginPath(); ctx.ellipse(a, b + r * 0.08, r * 0.72, r * 0.46, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 7; i++) { const an = Math.PI * (1.05 + i * 0.13), px = a + Math.cos(an) * r * 0.92, py = b + Math.sin(an) * r * 0.62; ell(ctx, px, py, s * 0.07, s * 0.05, shade(P.cliff[0], (i % 3) * 0.1 - 0.05)); ell(ctx, px - s * 0.02, py - s * 0.015, s * 0.03, s * 0.02, rgba('#ffffff', 0.18)); }
      ctx.restore();
    }
    // 水晶基座
    for (const [px, py] of (G.L.pads || [])) drawPad(ctx, V, px, py, s);
    // 6. 草叢、小花
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = G.grid[y][x];
      if (c.path || c.water) continue;
      const n = th === 'desert' || th === 'volcano' || th === 'ruins' || th === 'forge' || th === 'rift' ? 1 : SNOWY(th) || th === 'cave' ? 2 : 6;
      for (let i = 0; i < n; i++) {
        const [px, py] = V.P(x + rng(), y + rng());
        tuft(ctx, px, py, s * (0.08 + rng() * 0.07), P.tuft[Math.floor(rng() * P.tuft.length)], rng);
      }
      if (rng() < (th === 'volcano' || th === 'cave' || th === 'forge' || th === 'rift' ? 0.06 : SNOWY(th) ? 0.15 : 0.35)) {
        const [px, py] = V.P(x + 0.15 + rng() * 0.7, y + 0.15 + rng() * 0.7);
        const fc = P.flowers[Math.floor(rng() * P.flowers.length)];
        for (let k = 0; k < 3; k++) flower(ctx, px + (rng() - 0.5) * s * 0.25, py + (rng() - 0.5) * s * 0.18, s * 0.035, fc);
      }
    }
    // 7. 地圖邊緣：內陰影＋草邊
    const eg = s * 0.5;
    for (const [x0, y0, x1, y1] of [[mx, my, mx, my + eg], [mx, my, mx + eg, my], [mx + mw, my, mx + mw - eg, my]]) {
      ctx.fillStyle = lgrad(ctx, x0, y0, x1, y1, ['rgba(0,0,0,.22)', 'rgba(0,0,0,0)']); ctx.fillRect(mx, my, mw, mh);
    }
    ctx.fillStyle = lgrad(ctx, 0, my + mh - s * 0.12, 0, my + mh, ['rgba(255,255,255,0)', rgba(P.g[3], 0.35)]); ctx.fillRect(mx, my + mh - s * 0.12, mw, s * 0.12);
    ctx.restore();
    // 草皮懸垂在懸崖邊
    grade(ctx, V, P, s);
    const lr = mkRng(G.L.seed + 31);
    for (let px = mx + s * 0.2; px < mx + mw - s * 0.2; px += s * 0.12) {
      const h = s * (0.05 + lr() * 0.08);
      ctx.fillStyle = shade(P.g[1], -0.1 - lr() * 0.1); ctx.beginPath(); ctx.moveTo(px - s * 0.07, my + mh - 1); ctx.quadraticCurveTo(px, my + mh + h * 1.4, px + s * 0.07, my + mh - 1); ctx.fill();
    }
    rrect(ctx, mx + 0.5, my + 0.5, mw - 1, mh - 1, s * 0.3); ctx.strokeStyle = rgba(P.g[3], 0.25); ctx.lineWidth = 1; ctx.stroke();
    return { waters };
  }
  // 調色（整張地圖的色調），在畫完地面後呼叫
  function grade(ctx, V, P, s) {
    if (!P.tint) return;
    ctx.save(); rrect(ctx, V.ox, V.oy, V.w, V.h, s * 0.3); ctx.clip(); ctx.fillStyle = P.tint; ctx.fillRect(V.ox, V.oy, V.w, V.h); ctx.restore();
  }
  function tuft(x, px, py, h, c, rng) {
    x.strokeStyle = c; x.lineWidth = Math.max(1, h * 0.22); x.lineCap = 'round';
    x.beginPath();
    for (let i = 0; i < 3; i++) { const dx = (i - 1) * h * 0.35; x.moveTo(px + dx * 0.5, py); x.quadraticCurveTo(px + dx, py - h * 0.5, px + dx * 1.6 + (rng() - 0.5) * h * 0.3, py - h * (i === 1 ? 1 : 0.75)); }
    x.stroke(); x.lineCap = 'butt';
  }
  function flower(x, px, py, r, c) {
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; circ(x, px + Math.cos(a) * r * 0.7, py + Math.sin(a) * r * 0.55, r * 0.55, c); }
    circ(x, px, py, r * 0.4, '#ffd84a');
  }
  function groundNoise(ctx, mx, my, mw, mh, P, seed, s, th) {
    // 低解析度的雜訊色塊，放大後變成柔和的地面
    const q = 3, w = Math.ceil(mw / q), h = Math.ceil(mh / q);
    const c = Gfx.canvas(w, h), x = c.getContext('2d');
    const img = x.createImageData(w, h), d = img.data;
    const G = P.g.map(Gfx.hex);
    const f1 = 1 / (s * 2.2), f2 = 1 / (s * 0.45);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = i * q, Y = j * q;
      let n = fbm(X * f1, Y * f1, seed, 3) * 0.75 + vnoise(X * f2, Y * f2, seed + 5) * 0.25;
      n = clamp((n - 0.28) * 1.9, 0, 0.999);
      const t = n * 3, k = Math.floor(t), u = t - k, A = G[k], B = G[Math.min(3, k + 1)];
      const o = (j * w + i) * 4;
      d[o] = A[0] + (B[0] - A[0]) * u; d[o + 1] = A[1] + (B[1] - A[1]) * u; d[o + 2] = A[2] + (B[2] - A[2]) * u; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, mx, my, w * q, h * q);
  }
  function themeGround(ctx, V, G, P, th, rng, s) {
    const free = () => { for (let t = 0; t < 20; t++) { const gx = Math.floor(rng() * COLS), gy = Math.floor(rng() * ROWS); const c = G.grid[gy][gx]; if (!c.path && !c.water) return [gx, gy]; } return null; };
    if (th === 'ruins') {
      // 古老的石板地磚，半埋在沙裡
      for (let i = 0; i < 26; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + rng(), f[1] + rng()), w = s * (0.22 + rng() * 0.18); ctx.fillStyle = rgba('#cfc0a0', 0.55); ctx.strokeStyle = rgba('#8a7050', 0.45); ctx.lineWidth = 1; rrect(ctx, px - w / 2, py - w * 0.35, w, w * 0.7, s * 0.03); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = rgba('#ffffff', 0.16); ctx.lineWidth = Math.max(1, s * 0.025);
      for (let i = 0; i < 30; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); const w = s * (0.4 + rng() * 0.5); ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - s * 0.08, px + w, py); ctx.stroke(); }
    } else if (th === 'cave') {
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i++) { const f = free(); if (!f) continue; let [px, py] = V.P(f[0] + rng(), f[1] + rng()); ctx.strokeStyle = rgba('#7fe8ff', 0.35); ctx.lineWidth = Math.max(1, s * 0.025); ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (rng() - 0.5) * s * 0.4; py += (rng() - 0.5) * s * 0.3; ctx.lineTo(px, py); } ctx.stroke(); }
      for (let i = 0; i < 80; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); circ(ctx, px, py, Math.max(0.6, s * 0.012), rgba(rng() < 0.5 ? '#9ef0ff' : '#e0b0ff', 0.5)); }
    } else if (th === 'deep') {
      ctx.strokeStyle = rgba('#a8f0ff', 0.12); ctx.lineWidth = Math.max(1, s * 0.03);
      for (let i = 0; i < 36; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); const w = s * (0.3 + rng() * 0.4); ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - s * 0.08, px + w, py); ctx.stroke(); }
      for (let i = 0; i < 12; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5); ctx.strokeStyle = rgba('#2a8a5a', 0.7); ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(px + (k - 1) * s * 0.08, py); ctx.quadraticCurveTo(px + (k - 1) * s * 0.12 + s * 0.08, py - s * 0.2, px + (k - 1) * s * 0.06, py - s * (0.3 + rng() * 0.15)); ctx.stroke(); } }
    } else if (th === 'sky') {
      for (let i = 0; i < 10; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5); for (let k = 0; k < 4; k++) flower(ctx, px + (rng() - 0.5) * s * 0.6, py + (rng() - 0.5) * s * 0.4, s * 0.04, P.flowers[Math.floor(rng() * P.flowers.length)]); }
    } else if (th === 'desert' || th === 'canyon') {
      // 沙丘紋
      ctx.strokeStyle = rgba('#ffffff', 0.18); ctx.lineWidth = Math.max(1, s * 0.025);
      for (let i = 0; i < 40; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); const w = s * (0.4 + rng() * 0.5); ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - s * 0.08, px + w, py); ctx.stroke(); }
      ctx.strokeStyle = rgba('#a87a40', 0.18);
      for (let i = 0; i < 30; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); const w = s * (0.3 + rng() * 0.4); ctx.beginPath(); ctx.moveTo(px - w, py + s * 0.03); ctx.quadraticCurveTo(px, py - s * 0.05, px + w, py + s * 0.03); ctx.stroke(); }
    } else if (th === 'snow') {
      for (let i = 0; i < 8; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.3 + rng() * 0.3); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#a8d8f0', 0.5), rgba('#c8e8f8', 0.3), rgba('#ffffff', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 160; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); circ(ctx, px, py, Math.max(0.6, s * 0.012), rgba('#ffffff', 0.9)); }
    } else if (th === 'volcano') {
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const f = free(); if (!f) continue;
        let [px, py] = V.P(f[0] + rng(), f[1] + rng());
        ctx.strokeStyle = rgba('#ff6a1a', 0.55); ctx.lineWidth = Math.max(1, s * 0.03);
        ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = s * 0.15;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += (rng() - 0.5) * s * 0.4; py += (rng() - 0.5) * s * 0.3; ctx.lineTo(px, py); }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      for (let i = 0; i < 60; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); ell(ctx, px, py, s * 0.04, s * 0.025, rgba('#1a1210', 0.5)); }
    } else if (th === 'swamp') {
      for (let i = 0; i < 7; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.25 + rng() * 0.2); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#3e4a2a', 0.7), rgba('#4e5a34', 0.4), rgba('#4e5a34', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); ell(ctx, px - r * 0.2, py - r * 0.1, r * 0.2, r * 0.08, rgba('#ffffff', 0.12)); }
    } else if (th === 'night') {
      for (let i = 0; i < 18; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); const r = s * (0.2 + rng() * 0.3); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#6a5aa8', 0.25), rgba('#6a5aa8', 0)]); ctx.fillRect(px - r, py - r, r * 2, r * 2); }
    } else if (th === 'bamboo') {
      for (let i = 0; i < 40; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + rng(), f[1] + rng()); ctx.save(); ctx.translate(px, py); ctx.rotate(rng() * 6.28); ell(ctx, 0, 0, s * 0.07, s * 0.018, rgba(rng() < 0.5 ? '#c8b060' : '#8ab84a', 0.6)); ctx.restore(); }
      for (let i = 0; i < 6; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.25 + rng() * 0.2); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#3a7a30', 0.4), rgba('#3a7a30', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
    } else if (th === 'harbor') {
      for (let i = 0; i < 14; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + rng(), f[1] + rng()), r = s * (0.15 + rng() * 0.2); ctx.fillStyle = rgba('#1a2a3a', 0.45); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.45, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba('#9ac8e8', 0.25); ctx.lineWidth = Math.max(1, s * 0.015); ctx.beginPath(); ctx.ellipse(px - r * 0.2, py - r * 0.1, r * 0.5, r * 0.15, 0, 3.4, 5.6); ctx.stroke(); }
      ctx.strokeStyle = rgba('#000000', 0.18); ctx.lineWidth = Math.max(1, s * 0.02);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = G.grid[y][x]; if (c.path || c.water || rng() < 0.6) continue; const [px, py] = V.P(x + 0.5, y + 0.5); ctx.strokeRect(px - s * 0.3, py - s * 0.2, s * 0.6, s * 0.4); }
    } else if (th === 'river') {
      for (let i = 0; i < 12; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5); for (let k = 0; k < 3; k++) flower(ctx, px + (rng() - 0.5) * s * 0.5, py + (rng() - 0.5) * s * 0.35, s * 0.035, P.flowers[Math.floor(rng() * P.flowers.length)]); }
    } else if (th === 'plateau') {
      ctx.strokeStyle = rgba('#4a4030', 0.3); ctx.lineWidth = Math.max(1, s * 0.02); ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) { const f = free(); if (!f) continue; let [px, py] = V.P(f[0] + rng(), f[1] + rng()); ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (rng() - 0.5) * s * 0.35; py += (rng() - 0.5) * s * 0.2; ctx.lineTo(px, py); } ctx.stroke(); }
      for (let i = 0; i < 10; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5); for (let k = 0; k < 4; k++) flower(ctx, px + (rng() - 0.5) * s * 0.5, py + (rng() - 0.5) * s * 0.35, s * 0.03, '#c8b8ff'); }
    } else if (th === 'amber') {
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const f = free(); if (!f) continue; let [px, py] = V.P(f[0] + rng(), f[1] + rng()); ctx.strokeStyle = rgba('#ffb03a', 0.45); ctx.lineWidth = Math.max(1, s * 0.03); ctx.shadowColor = '#ff9a2a'; ctx.shadowBlur = s * 0.12; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (rng() - 0.5) * s * 0.4; py += (rng() - 0.5) * s * 0.3; ctx.lineTo(px, py); } ctx.stroke(); ctx.shadowBlur = 0; }
      // 六角蜂巢紋
      ctx.strokeStyle = rgba('#2a1608', 0.25); ctx.lineWidth = Math.max(1, s * 0.015);
      for (let i = 0; i < 18; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * 0.12; for (let k = 0; k < 3; k++) { const cx = px + (k - 1) * r * 1.75, cy = py + (k % 2) * r * 0.9; ctx.beginPath(); for (let j = 0; j < 6; j++) { const an = j / 6 * TAU; ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.7); } ctx.closePath(); ctx.stroke(); } }
    } else if (th === 'spire') {
      for (let i = 0; i < 8; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.25 + rng() * 0.15); ctx.strokeStyle = rgba('#c8a8ff', 0.25); ctx.lineWidth = Math.max(1, s * 0.02); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.55, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(px, py, r * 0.6, r * 0.33, 0, 0, TAU); ctx.stroke(); }
      for (let i = 0; i < 90; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); circ(ctx, px, py, Math.max(0.6, s * 0.012), rgba(rng() < 0.5 ? '#ffd36b' : '#e0c8ff', 0.55)); }
    } else if (th === 'tundra') {
      // 風吹出來的雪紋＋淡藍色的冰面
      ctx.strokeStyle = rgba('#ffffff', 0.5); ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); const w = s * (0.3 + rng() * 0.5); ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - s * 0.07, px + w, py + s * 0.02); ctx.stroke(); }
      for (let i = 0; i < 7; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.3 + rng() * 0.3); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#a8d8f0', 0.55), rgba('#c8e8f8', 0.3), rgba('#ffffff', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 200; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); circ(ctx, px, py, Math.max(0.6, s * 0.012), rgba('#ffffff', 0.9)); }
    } else if (th === 'forge') {
      // 鐵板地磚、鉚釘、熔岩裂縫
      ctx.strokeStyle = rgba('#000000', 0.28); ctx.lineWidth = Math.max(1, s * 0.02);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = G.grid[y][x]; if (c.path || c.water || rng() < 0.45) continue; const [px, py] = V.P(x + 0.5, y + 0.5); ctx.strokeRect(px - s * 0.42, py - s * 0.42, s * 0.84, s * 0.84); for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) circ(ctx, px + ox * s * 0.34, py + oy * s * 0.34, Math.max(0.8, s * 0.025), rgba('#8a7a6a', 0.7)); }
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const f = free(); if (!f) continue; let [px, py] = V.P(f[0] + rng(), f[1] + rng()); ctx.strokeStyle = rgba('#ff7a1a', 0.55); ctx.lineWidth = Math.max(1, s * 0.03); ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = s * 0.15; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (rng() - 0.5) * s * 0.4; py += (rng() - 0.5) * s * 0.3; ctx.lineTo(px, py); } ctx.stroke(); ctx.shadowBlur = 0; }
    } else if (th === 'glacier') {
      // 冰面裂紋＋透出的極光反光
      ctx.lineCap = 'round';
      for (let i = 0; i < 22; i++) { const f = free(); if (!f) continue; let [px, py] = V.P(f[0] + rng(), f[1] + rng()); ctx.strokeStyle = rgba('#ffffff', 0.45); ctx.lineWidth = Math.max(1, s * 0.022); ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (rng() - 0.5) * s * 0.5; py += (rng() - 0.5) * s * 0.35; ctx.lineTo(px, py); } ctx.stroke(); }
      for (let i = 0; i < 8; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS), r = s * (1 + rng() * 1.5); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba(rng() < 0.5 ? '#7affc8' : '#b88aff', 0.16), rgba('#7affc8', 0)]); ctx.fillRect(px - r, py - r, r * 2, r * 2); }
      for (let i = 0; i < 120; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); circ(ctx, px, py, Math.max(0.6, s * 0.012), rgba('#ffffff', 0.7)); }
    } else if (th === 'fortress') {
      // 石板廣場＋積雪
      ctx.strokeStyle = rgba('#3a3e44', 0.3); ctx.lineWidth = Math.max(1, s * 0.02);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = G.grid[y][x]; if (c.path || c.water || rng() < 0.35) continue; const [px, py] = V.P(x + 0.5, y + 0.5); ctx.strokeRect(px - s * 0.45, py - s * 0.45, s * 0.45, s * 0.45); ctx.strokeRect(px, py, s * 0.45, s * 0.45); }
      for (let i = 0; i < 10; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.35 + rng() * 0.3); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#ffffff', 0.85), rgba('#eef4fa', 0.5), rgba('#ffffff', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
    } else if (th === 'rift') {
      // 一半結冰一半裂出熔岩
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) { const f = free(); if (!f) continue; let [px, py] = V.P(f[0] + rng(), f[1] + rng()); const hot = f[0] > COLS / 2; ctx.strokeStyle = hot ? rgba('#ff7a1a', 0.6) : rgba('#bff0ff', 0.6); ctx.lineWidth = Math.max(1, s * 0.03); ctx.shadowColor = hot ? '#ff6a1a' : '#7fd8ff'; ctx.shadowBlur = s * 0.15; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (rng() - 0.5) * s * 0.4; py += (rng() - 0.5) * s * 0.3; ctx.lineTo(px, py); } ctx.stroke(); ctx.shadowBlur = 0; }
      for (let i = 0; i < 8; i++) { const f = free(); if (!f || f[0] > COLS / 2) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.3 + rng() * 0.25); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#cfefff', 0.5), rgba('#cfefff', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
    } else if (th === 'aurora') {
      for (let i = 0; i < 10; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS), r = s * (1 + rng() * 1.8); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba(rng() < 0.6 ? '#7affc8' : '#b88aff', 0.14), rgba('#7affc8', 0)]); ctx.fillRect(px - r, py - r, r * 2, r * 2); }
      for (let i = 0; i < 8; i++) { const f = free(); if (!f) continue; const [px, py] = V.P(f[0] + 0.5, f[1] + 0.5), r = s * (0.3 + rng() * 0.3); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#e8f6ff', 0.55), rgba('#e8f6ff', 0)]); ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 140; i++) { const [px, py] = V.P(rng() * COLS, rng() * ROWS); circ(ctx, px, py, Math.max(0.6, s * 0.012), rgba(rng() < 0.3 ? '#9fffd8' : '#ffffff', 0.7)); }
    } else if (th === 'coast') {
      // 靠海的沙灘
      for (const [wx, wy, ww, wh] of (G.L.water || [])) {
        const [a, b] = V.P(wx - 0.4, wy - 0.4), [c2, d2] = V.P(wx + ww + 0.4, wy + wh + 0.4);
        const x0 = Math.min(a, c2), y0 = Math.min(b, d2), w = Math.abs(c2 - a), h = Math.abs(d2 - b);
        ctx.save(); ctx.globalAlpha = 0.9;
        rrect(ctx, x0, y0, w, h, s * 0.6); ctx.fillStyle = '#efd9a0'; ctx.fill();
        ctx.restore();
        for (let i = 0; i < 40; i++) circ(ctx, x0 + rng() * w, y0 + rng() * h, Math.max(0.6, s * 0.012), rgba('#c8a868', 0.7));
      }
    }
  }
  function drawPad(ctx, V, gx, gy, s) {
    const [a, b] = V.P(gx + 0.5, gy + 0.55);
    const w = s * 0.42, h = s * 0.24;
    ctx.save();
    ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = s * 0.35;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + TAU / 12; ctx.lineTo(a + Math.cos(an) * w, b + Math.sin(an) * h); } ctx.closePath();
    ctx.fillStyle = lgrad(ctx, a - w, b - h, a + w, b + h, ['#d8fbff', '#6fd8f0', '#2a8ab0']); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#1a4a6a'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + TAU / 12; ctx.lineTo(a + Math.cos(an) * w * 0.6, b + Math.sin(an) * h * 0.6); } ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, s * 0.025); ctx.stroke();
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + TAU / 12; ctx.beginPath(); ctx.moveTo(a + Math.cos(an) * w * 0.6, b + Math.sin(an) * h * 0.6); ctx.lineTo(a + Math.cos(an) * w, b + Math.sin(an) * h); ctx.stroke(); }
    ctx.restore();
  }
  function drawWaterBase(ctx, sh, P, s, rng, th) {
    const [x0, y0, x1, y1] = sh.box;
    if (sh.void) {
      // 浮島之間的天空：看下去是藍天和雲
      ctx.save();
      ctx.strokeStyle = 'rgba(120,96,70,.9)'; ctx.lineWidth = s * 0.3; ctx.lineJoin = 'round'; ctx.stroke(sh.path);
      ctx.clip(sh.path);
      ctx.fillStyle = lgrad(ctx, 0, y0, 0, y1, ['#5aa8e8', '#9fd4f8', '#d8f0ff']); ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
      for (let i = 0; i < 5; i++) { const px = x0 + rng() * (x1 - x0), py = y0 + (0.4 + rng() * 0.6) * (y1 - y0), r = s * (0.3 + rng() * 0.3); circ(ctx, px, py, r, 'rgba(255,255,255,.75)'); circ(ctx, px + r * 0.7, py + r * 0.15, r * 0.7, 'rgba(255,255,255,.7)'); }
      // 懸崖內壁
      ctx.fillStyle = lgrad(ctx, 0, y0, 0, y0 + s * 0.6, ['rgba(110,86,62,1)', 'rgba(110,86,62,0)']); ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, s * 0.6);
      ctx.restore();
      return;
    }
    ctx.save();
    // 岸
    ctx.lineJoin = 'round';
    if (sh.lava) { ctx.strokeStyle = '#1a100c'; ctx.lineWidth = s * 0.26; ctx.stroke(sh.path); ctx.strokeStyle = '#3a221a'; ctx.lineWidth = s * 0.16; ctx.stroke(sh.path); }
    else { ctx.strokeStyle = rgba(sh.swamp ? '#3a3020' : SNOWY(th) ? '#e8f4fc' : '#d8c08a', 0.9); ctx.lineWidth = s * 0.24; ctx.stroke(sh.path); ctx.strokeStyle = rgba(sh.swamp ? '#2a2418' : '#8a7a5a', 0.45); ctx.lineWidth = s * 0.12; ctx.stroke(sh.path); }
    ctx.clip(sh.path);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(x1 - x0, y1 - y0) * 0.65;
    ctx.fillStyle = rgrad(ctx, cx, cy, 0, R, [P.water[2], P.water[1], P.water[0]]);
    ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    // 岸邊淺水
    ctx.strokeStyle = rgba(P.water[0], 0.7); ctx.lineWidth = s * 0.3; ctx.stroke(sh.path);
    if (sh.lava) {
      // 岩漿上的硬殼
      for (let i = 0; i < (x1 - x0) * (y1 - y0) / (s * s) * 3; i++) {
        const px = x0 + rng() * (x1 - x0), py = y0 + rng() * (y1 - y0), r = s * (0.12 + rng() * 0.18);
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rng() * 0.4, rr = r * (0.7 + rng() * 0.4); ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.7); } ctx.closePath();
        ctx.fillStyle = rgba('#3a1a10', 0.75); ctx.fill(); ctx.strokeStyle = rgba('#ffd36b', 0.6); ctx.lineWidth = Math.max(1, s * 0.02); ctx.stroke();
      }
    } else if (sh.swamp) {
      for (let i = 0; i < 6; i++) { const px = x0 + rng() * (x1 - x0), py = y0 + rng() * (y1 - y0), r = s * (0.1 + rng() * 0.06); ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, 0.4, TAU - 0.2); ctx.closePath(); ctx.fillStyle = '#5a9a4a'; ctx.fill(); ctx.strokeStyle = '#3a6a30'; ctx.lineWidth = 1; ctx.stroke(); if (rng() < 0.4) circ(ctx, px + r * 0.3, py - r * 0.2, r * 0.25, '#ff9ad0'); }
    } else {
      // 水底的石頭陰影
      for (let i = 0; i < 6; i++) ell(ctx, x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0), s * 0.15, s * 0.08, rgba(P.water[2], 0.35));
    }
    ctx.restore();
  }
  function drawPaths(ctx, V, G, P, s, rng, th) {
    const lines = [].concat(...G.paths.map(P => pathRuns(P, true)));
    const mw = Math.ceil(V.w + 2), mh = Math.ceil(V.h + 2), ox = V.ox - 1, oy = V.oy - 1;
    const dpr = ctx.getTransform ? ctx.getTransform().a : 1;
    // 遮罩
    const mk = () => { const c = Gfx.canvas(mw * dpr, mh * dpr), x = c.getContext('2d'); x.scale(dpr, dpr); x.translate(-ox, -oy); return [c, x]; };
    // 柔和的路邊
    ctx.save();
    ctx.strokeStyle = rgba(P.edge, 0.06);
    for (let i = 0; i < 6; i++) strokeWorld(ctx, V, lines, s * (1.12 - i * 0.045));
    ctx.restore();
    const [tex, tx] = mk();
    tx.fillStyle = P.path; tx.fillRect(ox, oy, mw, mh);
    // 路面雜色
    for (let i = 0; i < mw * mh / (s * s) * 30; i++) {
      const px = ox + rng() * mw, py = oy + rng() * mh, r = s * (0.03 + rng() * 0.12);
      tx.fillStyle = rgba(rng() < 0.5 ? P.pathD : P.pathL, 0.12 + rng() * 0.15);
      tx.beginPath(); tx.ellipse(px, py, r, r * (0.5 + rng() * 0.5), rng() * 3, 0, TAU); tx.fill();
    }
    if (P.cobble) {
      // 鵝卵石：不規則的多邊形石塊
      const st = s * 0.19;
      tx.fillStyle = rgba(P.pathD, 0.9); tx.fillRect(ox, oy, mw, mh);
      for (let yy = oy; yy < oy + mh + st; yy += st * 0.82) for (let xx = ox + ((Math.round((yy - oy) / (st * 0.82))) % 2 ? st * 0.5 : 0); xx < ox + mw + st; xx += st) {
        const cx = xx + (rng() - 0.5) * st * 0.25, cy = yy + (rng() - 0.5) * st * 0.2, rr = st * (0.4 + rng() * 0.12), n = 6, a0 = rng() * TAU;
        tx.beginPath();
        for (let k = 0; k < n; k++) { const an = a0 + k / n * TAU, q = rr * (0.82 + rng() * 0.25); tx.lineTo(cx + Math.cos(an) * q, cy + Math.sin(an) * q * 0.85); }
        tx.closePath();
        const base = shade(P.path, (rng() - 0.5) * 0.3);
        tx.fillStyle = lgrad(tx, cx - rr, cy - rr, cx + rr, cy + rr, [shade(base, 0.18), base, shade(base, -0.18)]); tx.fill();
      }
      if (SNOWY(th)) for (let i = 0; i < mw * mh / (s * s) * 6; i++) { const px = ox + rng() * mw, py = oy + rng() * mh, r = s * (0.08 + rng() * 0.18); tx.fillStyle = rgba('#f4faff', 0.15 + rng() * 0.2); tx.beginPath(); tx.ellipse(px, py, r, r * 0.6, rng() * 3, 0, TAU); tx.fill(); }
    }
    const [mask, mx] = mk();
    mx.strokeStyle = '#fff'; strokeWorld(mx, V, lines, s * 0.86);
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(mask, 0, 0);
    ctx.drawImage(tex, ox, oy, mw, mh);
    // 車轍與中間磨亮
    const [rut, rx] = mk();
    if (!P.cobble) {
      rx.strokeStyle = '#000'; strokeWorld(rx, V, lines.map(l => offsetLine(l, 0.17)).concat(lines.map(l => offsetLine(l, -0.17))), s * 0.07);
      ctx.globalAlpha = 0.13; ctx.drawImage(rut, ox, oy, mw, mh); ctx.globalAlpha = 1;
    }
    const [mid, mdx] = mk();
    mdx.strokeStyle = P.pathL; strokeWorld(mdx, V, lines, s * 0.3);
    ctx.globalAlpha = P.cobble ? 0.1 : 0.18; ctx.drawImage(mid, ox, oy, mw, mh); ctx.globalAlpha = 1;
    // 路面內側陰影（靠邊暗一點）
    const [edge, ex] = mk();
    ex.strokeStyle = '#000'; strokeWorld(ex, V, lines, s * 0.86);
    ex.globalCompositeOperation = 'destination-out'; strokeWorld(ex, V, lines, s * 0.66);
    ctx.globalAlpha = 0.16; ctx.drawImage(edge, ox, oy, mw, mh); ctx.globalAlpha = 1;
    // 小石子
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!G.grid[y][x].path) continue;
      for (let i = 0; i < 4; i++) {
        const [px, py] = V.P(x + 0.12 + rng() * 0.76, y + 0.12 + rng() * 0.76), r = s * (0.018 + rng() * 0.025);
        ell(ctx, px + r * 0.3, py + r * 0.4, r, r * 0.7, rgba('#000000', 0.2));
        ell(ctx, px, py, r, r * 0.75, shade(P.pathD, rng() * 0.3));
      }
    }
    // 路邊石頭與草
    const seen = new Set();
    for (const l of lines) for (const sd of [-1, 1]) {
      walk(offsetLine(l, sd * 0.47), 0.26, (wx, wy) => {
        if (wx < 0.1 || wy < 0.1 || wx > COLS - 0.1 || wy > ROWS - 0.1) return;
        const key = Math.round(wx * 4) + ',' + Math.round(wy * 4);
        if (seen.has(key)) return; seen.add(key);
        const gx = Math.floor(wx), gy = Math.floor(wy), c = G.grid[gy] && G.grid[gy][gx];
        // 落在別條路裡面就跳過（十字路口）
        let inside = false;
        for (const P2 of G.paths) for (const sg of P2.seg) if (!sg.tp && segDist2(wx, wy, sg.a.x, sg.a.y, sg.b.x, sg.b.y) < 0.4 * 0.4) inside = true;
        if (inside || (c && c.water)) return;
        const [px, py] = V.P(wx + (rng() - 0.5) * 0.08, wy + (rng() - 0.5) * 0.08);
        const r0 = rng();
        if (r0 < 0.35) {
          const r = s * (0.04 + rng() * 0.04), c0 = th === 'cave' ? '#3a3a50' : th === 'volcano' || th === 'forge' ? '#3a2e2a' : SNOWY(th) ? '#a8b8c8' : th === 'night' ? '#5a5878' : '#a8a296';
          ell(ctx, px + r * 0.2, py + r * 0.45, r * 1.1, r * 0.7, rgba('#000000', 0.25));
          ell(ctx, px, py, r, r * 0.75, c0); ell(ctx, px - r * 0.3, py - r * 0.3, r * 0.45, r * 0.3, shade(c0, 0.35));
        } else if (r0 < 0.8 && th !== 'volcano' && th !== 'cave' && th !== 'forge' && th !== 'rift') {
          tuft(ctx, px, py + s * 0.04, s * (0.09 + rng() * 0.07), P.tuft[Math.floor(rng() * P.tuft.length)], rng);
        }
      });
    }
  }

  // ───────── 地圖外的景色 ─────────
  function backdrop(ctx, V, G, W, H, P, th, opts) {
    const s = V.s, rng = mkRng(G.L.seed + 5);
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, H, [P.out, P.outD]); ctx.fillRect(0, 0, W, H);
    if (opts.thumb) return;
    if (th === 'coast') {
      // 大海
      ctx.strokeStyle = rgba('#ffffff', 0.18); ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineCap = 'round';
      for (let i = 0; i < W * H / (s * s) * 0.8; i++) { const px = rng() * W, py = rng() * H, w = s * (0.15 + rng() * 0.25); ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - s * 0.08, px + w, py); ctx.stroke(); }
      ctx.lineCap = 'butt';
    } else if (th === 'sky') {
      ctx.fillStyle = lgrad(ctx, 0, 0, 0, H, ['#7ac4f4', '#a8dcfa', '#e4f4ff']); ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < W * H / (s * s) * 0.5; i++) { const px = rng() * W, py = rng() * H, r = s * (0.4 + rng() * 0.8); ctx.globalAlpha = 0.5 + rng() * 0.4; circ(ctx, px, py, r, '#ffffff'); circ(ctx, px + r * 0.8, py + r * 0.2, r * 0.7, '#ffffff'); circ(ctx, px - r * 0.7, py + r * 0.25, r * 0.6, '#f4faff'); ctx.globalAlpha = 1; }
      return;
    } else if (th === 'cave') {
      for (let i = 0; i < W * H / (s * s) * 1.2; i++) { const px = rng() * W, py = rng() * H, r = s * (0.3 + rng() * 0.6); circ(ctx, px, py, r, rgba('#1c1c2a', 0.8)); circ(ctx, px - r * 0.2, py - r * 0.25, r * 0.6, rgba('#26263a', 0.8)); }
      for (let i = 0; i < 26; i++) { const px = rng() * W, py = rng() * H; ctx.globalAlpha = 0.6; Art.crystal(ctx, px, py, s * 0.1, s * (0.25 + rng() * 0.3), rng() < 0.5 ? '#7fe8ff' : '#c49bff', s, (rng() - 0.5) * 0.8); ctx.globalAlpha = 1; }
    } else if (th === 'deep') {
      for (let i = 0; i < 9; i++) { const px = rng() * W; ctx.fillStyle = lgrad(ctx, px, 0, px + s * 2, H, ['rgba(160,230,255,.18)', 'rgba(160,230,255,0)']); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px + s * 0.8, 0); ctx.lineTo(px + s * 3, H); ctx.lineTo(px + s * 1.5, H); ctx.closePath(); ctx.fill(); }
      for (let i = 0; i < W * H / 1600; i++) { const r = 1 + rng() * 3; ctx.strokeStyle = rgba('#cff4ff', 0.25 + rng() * 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rng() * W, rng() * H, r, 0, TAU); ctx.stroke(); }
    } else if (th === 'night' || th === 'spire') {
      if (th === 'spire') for (let i = 0; i < 5; i++) { const px = rng() * W, py = rng() * H, r = s * (2 + rng() * 3); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba(rng() < 0.5 ? '#8a4ad8' : '#d84a9a', 0.22), rgba('#8a4ad8', 0)]); ctx.fillRect(px - r, py - r, r * 2, r * 2); }
      for (let i = 0; i < W * H / 900; i++) circ(ctx, rng() * W, rng() * H, rng() < 0.1 ? 1.4 : 0.7, rgba(th === 'spire' && rng() < 0.3 ? '#ffd36b' : '#ffffff', 0.3 + rng() * 0.6));
    } else if (th === 'harbor') {
      ctx.strokeStyle = rgba('#9ac8e8', 0.12); ctx.lineWidth = Math.max(1, s * 0.03); ctx.lineCap = 'round';
      for (let i = 0; i < W * H / (s * s) * 0.8; i++) { const px = rng() * W, py = rng() * H, w = s * (0.15 + rng() * 0.25); ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - s * 0.06, px + w, py); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { const px = rng() * W, py = rng() * H; ctx.fillStyle = lgrad(ctx, px, py, px, py + s * 1.5, [rgba('#ffcf7a', 0.25), rgba('#ffcf7a', 0)]); ctx.fillRect(px - s * 0.05, py, s * 0.1, s * 1.5); circ(ctx, px, py, s * 0.06, rgba('#ffe08a', 0.8)); }
      ctx.lineCap = 'butt';
    } else if (th === 'amber') {
      ctx.strokeStyle = rgba('#3a200c', 0.8); ctx.lineWidth = Math.max(1.5, s * 0.04);
      const hr = s * 0.6;
      for (let yy = 0, j = 0; yy < H + hr; yy += hr * 1.5, j++) for (let xx = (j % 2) * hr * 0.87; xx < W + hr; xx += hr * 1.74) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + TAU / 12; ctx.lineTo(xx + Math.cos(an) * hr, yy + Math.sin(an) * hr); } ctx.closePath(); ctx.fillStyle = rgba(rng() < 0.15 ? '#c8701a' : '#2a1608', rng() < 0.15 ? 0.5 : 0.6); ctx.fill(); ctx.stroke(); }
    } else if (th === 'plateau') {
      for (let i = 0; i < W * H / (s * s) * 0.6; i++) { const px = rng() * W, py = rng() * H, r = s * (0.6 + rng() * 1.2); circ(ctx, px, py, r, rgba('#3a3a52', 0.5)); circ(ctx, px - r * 0.3, py - r * 0.25, r * 0.7, rgba('#4a4a66', 0.45)); }
    } else if (th === 'bamboo') {
      for (let i = 0; i < W / (s * 0.25); i++) { const px = rng() * W, w = s * (0.06 + rng() * 0.05); ctx.fillStyle = rgba(rng() < 0.5 ? '#2a5a2e' : '#1e4a24', 0.8); ctx.fillRect(px, 0, w, H); for (let y = rng() * s; y < H; y += s * (0.7 + rng() * 0.3)) { ctx.fillStyle = rgba('#10301a', 0.8); ctx.fillRect(px - w * 0.2, y, w * 1.4, s * 0.03); } }
    } else if (th === 'volcano' || th === 'forge' || th === 'rift') {
      if (th === 'forge') { ctx.strokeStyle = rgba('#000000', 0.35); ctx.lineWidth = Math.max(1.5, s * 0.04); for (let yy = 0; yy < H; yy += s * 0.6) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); for (let xx = ((yy / (s * 0.6)) % 2) * s * 0.6; xx < W; xx += s * 1.2) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + s * 0.6); ctx.stroke(); } } }
      for (let i = 0; i < 12; i++) { const px = rng() * W, py = rng() * H, r = s * (1 + rng() * 2); ctx.fillStyle = rgrad(ctx, px, py, 0, r, [rgba('#ff5a1a', 0.25), rgba('#ff5a1a', 0)]); ctx.fillRect(px - r, py - r, r * 2, r * 2); }
    } else if (th === 'glacier' || th === 'aurora') {
      // 夜空中的極光帶
      for (let i = 0; i < W * H / 900; i++) circ(ctx, rng() * W, rng() * H, rng() < 0.1 ? 1.4 : 0.7, rgba('#ffffff', 0.3 + rng() * 0.5));
      for (let k = 0; k < 3; k++) { const y0 = H * (0.1 + k * 0.28 + rng() * 0.1), col = k % 2 ? '#b88aff' : '#6affc0'; ctx.lineCap = 'round'; for (let j = 0; j < 6; j++) { ctx.strokeStyle = rgba(col, 0.05); ctx.lineWidth = s * (0.8 + j * 0.5); ctx.beginPath(); ctx.moveTo(-s, y0); for (let xx = 0; xx <= W + s; xx += s * 2) ctx.lineTo(xx, y0 + Math.sin(xx / (s * 3) + k * 2) * s * 0.8); ctx.stroke(); } }
    } else {
      // 遠方樹冠 / 雪堆 / 沙丘
      const c = SNOWY(th) || th === 'tundra' ? '#7a96b0' : th === 'desert' || th === 'ruins' ? '#c08a4a' : th === 'swamp' ? '#34482a' : shade(P.out, 0.1);
      for (let i = 0; i < W * H / (s * s) * 1.4; i++) {
        const px = rng() * W, py = rng() * H, r = s * (0.3 + rng() * 0.5);
        circ(ctx, px, py + r * 0.2, r, rgba(shade(c, -0.3), 0.6)); circ(ctx, px - r * 0.15, py, r * 0.9, rgba(c, 0.8)); circ(ctx, px - r * 0.35, py - r * 0.3, r * 0.4, rgba(shade(c, 0.2), 0.5));
      }
    }
    // 暗角
    ctx.fillStyle = rgrad(ctx, W / 2, H / 2, Math.min(W, H) * 0.3, Math.max(W, H) * 0.8, ['rgba(0,0,0,0)', 'rgba(0,0,0,.45)']); ctx.fillRect(0, 0, W, H);
  }

  return { PAL, pal, paint, genProps, propSprite, propDraw, SWAY, GLOW };
})();

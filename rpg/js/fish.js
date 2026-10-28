'use strict';
// 曉鐘傳說：第四輪追加——釣魚小遊戲、隊伍編成（待命夥伴）、月汐之戰、圖鑑委託追加、成就

// ───── 魚 ─────
// at：棲息地　w：出現權重　sz：體長範圍（公分）　d：難度 1～5　pt：釣魚點數
const FISH = [
  { id: 'sardine', name: '沙丁魚', at: ['sea', 'tide'], w: 5, sz: [12, 20], d: 1, pt: 1, col: ['#8ab0d8', '#e8f0ff'] },
  { id: 'aji', name: '竹莢魚', at: ['sea', 'tide'], w: 4, sz: [18, 32], d: 1, pt: 2, col: ['#7a9ab8', '#f0e8c0'] },
  { id: 'snapper', name: '真鯛', at: ['sea', 'tide'], w: 2, sz: [30, 62], d: 2, pt: 4, col: ['#e86a7a', '#ffe0e0'] },
  { id: 'marlin', name: '旗魚', at: ['sea'], w: 0.6, sz: [120, 240], d: 4, pt: 12, col: ['#3a5ab8', '#c8d8f0'] },
  { id: 'catfish', name: '沙漠鯰魚', at: ['oasis'], w: 4, sz: [30, 70], d: 2, pt: 3, col: ['#8a7a5a', '#e0d0a0'] },
  { id: 'goldcarp', name: '黃金鯉', at: ['oasis'], w: 0.8, sz: [40, 80], d: 3, pt: 10, col: ['#f2c14e', '#fff4c0'] },
  { id: 'icefish', name: '冰魚', at: ['ice'], w: 5, sz: [10, 18], d: 1, pt: 2, col: ['#c8e8f8', '#ffffff'] },
  { id: 'snowtrout', name: '雪鱒', at: ['ice'], w: 1, sz: [40, 70], d: 3, pt: 8, col: ['#d8a0b0', '#f8f0f4'] },
  { id: 'moonfish', name: '月鱗魚', at: ['tide'], w: 3, sz: [25, 45], d: 2, pt: 5, col: ['#b8a8f0', '#f4f0ff'] },
  { id: 'grouper', name: '星斑石斑', at: ['tide'], w: 1, sz: [50, 90], d: 3, pt: 10, col: ['#6a5a3a', '#f0e0a0'] },
  { id: 'angelfish', name: '珊瑚神仙魚', at: ['coral'], w: 4, sz: [15, 25], d: 2, pt: 4, col: ['#ffb040', '#3a6ad8'] },
  { id: 'lanternfish', name: '燈籠魚', at: ['coral', 'abyss'], w: 2, sz: [20, 35], d: 3, pt: 7, col: ['#2a3a5a', '#a8f0ff'] },
  { id: 'anglerfish', name: '深淵鮟鱇', at: ['abyss'], w: 2, sz: [40, 90], d: 4, pt: 14, col: ['#3a2a4a', '#ffe060'] },
  { id: 'nushi', name: '海之主', at: ['tidepier'], w: 0.6, sz: [380, 520], d: 5, pt: 50, col: ['#4a6a9a', '#d8e8f0'], boss: 1 },
];
const FISH_SPOT = { port: 'sea', world: 'sea', isles: 'tide', tide: 'tide', sand: 'oasis', snow: 'ice', coral1: 'coral', coral2: 'coral', coral3: 'abyss' };
const fishKinds = () => FISH.filter(f => !f.boss && G.fish && G.fish[f.id]).length;
const fishTotal = () => FISH.filter(f => !f.boss).length;

function fishIcon(f) {
  return LSpr.get('fishic' + f.id, 20, 12, p => {
    const [a, b] = f.col;
    p.E(9, 6, 7.5, 4, (x, y, nx, ny) => (ny > 0.25 ? b : ny < -0.5 ? lighten(a, 0.3) : a));
    for (let y = 1; y <= 10; y++) { const w = Math.abs(y - 5.5); if (w < 4.5) p.P(17 + Math.round(w * 0.5), y, a); }
    p.R(16, 3, 2, 6, a); p.P(4, 5, '#1a1020'); p.P(4, 4, '#ffffff');
    if (f.id === 'marlin') p.L(1, 6, -2, 6, a);
    if (f.id === 'anglerfish' || f.id === 'lanternfish') { p.L(5, 2, 2, -1, '#5a4a3a'); p.P(2, 0, b); }
  });
}

// ───── 釣魚小遊戲 ─────
const Fishing = {
  ptr: false,
  init() {
    cv.addEventListener('pointerdown', () => { this.ptr = true; });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) cv.addEventListener(ev, () => { this.ptr = false; });
  },
  roll(spot) {
    const pier = spot === 'tide' && Field.id === 'tide' && Bag.has('rod2');
    const pool = FISH.filter(f => f.at.includes(spot) || (pier && f.at.includes('tidepier') && !F('nushi')));
    if (Math.random() < 0.06) return null; // 舊靴子
    const sum = pool.reduce((s, f) => s + f.w, 0);
    let r = Math.random() * sum;
    for (const f of pool) { r -= f.w; if (r < 0) return f; }
    return pool[0];
  },
  // 回傳 { result: 'catch'|'escape'|'early'|'miss', fish, size }
  play(spot) {
    return new Promise(res => {
      const fish = this.roll(spot), rod2 = Bag.has('rod2');
      const d = fish ? fish.d : 1;
      const S = { st: 'wait', t: 0, bite: rnd(1.4, 4.2), z: 0.5, zv: 0, f: 0.5, fv: 0, ft: 0, prog: 0.32, msg: '等魚上鉤……（咬餌時按 A）', shake: 0 };
      const zw = clamp(0.3 - d * 0.035 + (rod2 ? 0.05 : 0) + (Bag.has('anglerring') || G.party.some(m => m.eq.x === 'anglerring') ? 0.03 : 0), 0.14, 0.34);
      const lay = { modal: true };
      const end = (result, extra = {}) => { UI.remove(lay); res(Object.assign({ result, fish }, extra)); };
      lay.update = dt => {
        dt = Math.min(0.05, dt); S.t += dt; S.shake = Math.max(0, S.shake - dt);
        const auto = window.__autoFish;
        const pressed = Input.pressed.ok || lay.tapA, held = Input.held.ok || this.ptr || (auto && S.st === 'reel' && S.z < S.f);
        lay.tapA = false;
        if (Input.pressed.cancel && S.st !== 'reel') { end('miss'); return; }
        if (S.st === 'wait') {
          if (pressed && !auto) { S.st = 'done'; S.msg = '太早拉竿了……魚被嚇跑了。'; Snd.play('cancel'); setTimeout(() => end('early'), 700); return; }
          if (S.t >= S.bite) { S.st = 'bite'; S.t = 0; S.shake = 0.5; Snd.play('ok'); S.msg = '！ 咬餌了！快按 A！'; }
        } else if (S.st === 'bite') {
          if (pressed || (auto && S.t > 0.2)) {
            if (!fish) { S.st = 'done'; S.msg = '……釣到了一隻舊靴子。'; Snd.play('bump'); setTimeout(() => end('junk'), 900); return; }
            S.st = 'reel'; S.reeled = true; S.t = 0; Snd.play('attack'); S.msg = fish.boss ? '好、好重！是巨大的魚！' : '上鉤了！按住 A 收線，讓魚待在綠色的框裡！';
          } else if (S.t > 0.95) { S.st = 'done'; S.msg = '魚把餌吃掉，游走了……'; Snd.play('cancel'); setTimeout(() => end('escape'), 800); return; }
        } else if (S.st === 'reel') {
          // 魚的動作：越難的魚越會亂竄
          S.ft -= dt;
          if (S.ft <= 0) { S.ft = rnd(0.4, 1.2) / (0.7 + d * 0.15); S.fv = rnd(-1, 1) * (0.18 + d * 0.1); }
          S.f = clamp(S.f + S.fv * dt * 2, 0.02, 0.98); if (S.f <= 0.02 || S.f >= 0.98) S.fv = -S.fv;
          // 玩家的框：按住往右，放開往左
          S.zv += (held ? 2.6 : -2.2) * dt; S.zv *= Math.pow(0.12, dt); S.z = clamp(S.z + S.zv * dt, zw / 2, 1 - zw / 2);
          if ((S.z <= zw / 2 && S.zv < 0) || (S.z >= 1 - zw / 2 && S.zv > 0)) S.zv *= -0.3;
          const inZ = Math.abs(S.f - S.z) < zw / 2;
          S.prog += (inZ ? 0.34 - d * 0.02 : -(0.12 + d * 0.03)) * dt;
          if (auto) S.prog += 0.2 * dt;
          if (inZ && Math.random() < dt * 6) Snd.play('cursor');
          if (S.prog >= 1) { S.st = 'done'; const size = Math.round(rnd(fish.sz[0], fish.sz[1])); Snd.play('chest'); S.msg = `釣到了${fish.name}！（${size} 公分）`; setTimeout(() => end('catch', { size }), 900); return; }
          if (S.prog <= 0) { S.st = 'done'; S.msg = fish.boss ? '釣線被扯斷了……那到底是什麼？' : '啪！釣線鬆了……魚逃走了。'; Snd.play('cancel'); setTimeout(() => end('escape'), 900); return; }
        }
      };
      lay.draw = g => {
        const fs = L.FS, pad = L.pad, V = L.V;
        const w = Math.min(V.w - pad * 2, fs * 24), h = Math.min(V.h - pad * 2, fs * 15), x = V.x + (V.w - w) / 2, y = V.y + (V.h - h) / 2;
        UI.win(g, x, y, w, h);
        UI.banner(g, '釣魚', x + w / 2, y, fs);
        // 水面
        const wx = x + pad * 1.5, wy = y + fs * 1.6, ww = w - pad * 3, wh = h * 0.42;
        const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#3a8ad8'); gr.addColorStop(1, '#14306a'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
        g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 12; i++) { const xx = wx + ((i * 97 + S.t * 18 * (i % 3 + 1)) % ww), yy = wy + 6 + (i * 37 % (wh - 12)); g.fillRect(xx, yy, fs * 0.8, Math.max(1, fs * 0.08)); }
        // 浮標
        const bx = wx + ww * 0.55, by = wy + wh * 0.35 + (S.st === 'bite' ? Math.sin(S.t * 40) * fs * 0.25 + fs * 0.3 : Math.sin(S.t * 2.5) * fs * 0.08);
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = Math.max(1, fs * 0.05); g.beginPath(); g.moveTo(wx + ww * 0.95, wy - fs * 0.6); g.quadraticCurveTo(bx + ww * 0.2, wy - fs * 0.2, bx, by - fs * 0.35); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(bx - fs * 0.18, by - fs * 0.35, fs * 0.36, fs * 0.3); g.fillStyle = '#e83a3a'; g.fillRect(bx - fs * 0.18, by - fs * 0.05, fs * 0.36, fs * 0.25);
        if (S.st === 'bite') { UI.text(g, '！', bx, by - fs * 1.4, '#ffe040', fs * 1.6, 'center', 'middle', 900); g.strokeStyle = 'rgba(255,255,255,.7)'; for (let i = 1; i <= 2; i++) { g.beginPath(); g.ellipse(bx, by + fs * 0.15, fs * 0.5 * i * (1 + S.t), fs * 0.15 * i * (1 + S.t), 0, 0, TAU); g.stroke(); } }
        if (S.reeled) {
          // 拉扯條
          const ry = wy + wh + fs * 0.9, rh = fs * 1.5, rx = wx, rw = ww;
          g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, rx, ry, rw, rh, fs * 0.25); g.fill();
          g.fillStyle = 'rgba(110,240,140,.55)'; rr(g, rx + (S.z - zw / 2) * rw, ry + 2, zw * rw, rh - 4, fs * 0.2); g.fill();
          g.strokeStyle = '#9affb0'; g.lineWidth = Math.max(1, fs * 0.08); rr(g, rx + (S.z - zw / 2) * rw, ry + 2, zw * rw, rh - 4, fs * 0.2); g.stroke();
          const ic = fishIcon(fish), is = rh * 0.9; g.imageSmoothingEnabled = false; g.drawImage(ic, rx + S.f * rw - is * 0.85, ry + rh * 0.05 + Math.sin(S.t * 14) * fs * 0.06, is * 1.66, is);
          // 進度
          const py = ry + rh + fs * 0.5;
          g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(rx, py, rw, fs * 0.45);
          g.fillStyle = S.prog > 0.6 ? '#ffe070' : S.prog > 0.3 ? '#9affb0' : '#ff8a6a'; g.fillRect(rx, py, rw * clamp(S.prog, 0, 1), fs * 0.45);
        }
        UI.text(g, S.msg, x + w / 2, y + h - fs * 3.4, '#ffffff', fs * 0.9, 'center', 'top', 700);
        // 按鈕（觸控用）
        const bw = (w - pad * 5) / 2, bh = fs * 1.9, bty = y + h - bh - pad * 0.8;
        UI.win(g, x + pad * 2, bty, bw, bh, { border: '#ffd76a' }); UI.text(g, S.st === 'reel' ? '按住收線' : '拉竿（A）', x + pad * 2 + bw / 2, bty + bh / 2, '#ffe070', fs * 0.95, 'center', 'middle', 900);
        UI.win(g, x + pad * 3 + bw, bty, bw, bh); UI.text(g, '收起釣竿', x + pad * 3 + bw * 1.5, bty + bh / 2, S.st === 'reel' ? '#7a7f9a' : '#fff', fs * 0.95, 'center', 'middle', 700);
        UI.hit(x + pad * 2, bty, bw, bh, () => { lay.tapA = true; });
        UI.hit(x + pad * 3 + bw, bty, bw, bh, () => { if (S.st !== 'reel') end('miss'); });
        UI.hit(x, y, w, bty - y, () => { lay.tapA = true; });
      };
      UI.push(lay);
    });
  },
  async session(spot) {
    for (;;) {
      Snd.play('ok');
      const r = await this.play(spot);
      if (r.result === 'miss') return;
      if (r.result === 'catch') {
        const f = r.fish;
        if (f.boss) { await nushiBattle(); return; }
        const rec = G.fish[f.id] || (G.fish[f.id] = { n: 0, max: 0 });
        const best = r.size > rec.max, first = !rec.n;
        rec.n++; if (best) rec.max = r.size;
        G.fishPts = (G.fishPts || 0) + f.pt + (best && !first ? 1 : 0);
        Music.jingle('item');
        await UI.say(`釣到了${f.name}！\n體長 ${r.size} 公分${first ? '　【第一次釣到！】' : best ? '　【新紀錄！】' : ''}　釣魚點數 +${f.pt}`);
        Extra.check();
      }
      if (!await UI.yesno('要繼續釣魚嗎？')) return;
    }
  },
};
addEventListener('DOMContentLoaded', () => Fishing.init());
async function nushiBattle() {
  Field.shake(0.8); Snd.play('roar');
  await UI.say('釣線被一股巨大的力量往海底拖去——', '海面裂開了！一條比船還大的魚衝了出來！', '海之主：「……能把我拉上來的，五十年來你是第一個。來吧！」');
  if (await S.boss(['nushi'], { bg: 'isles' })) {
    G.flags.nushi = true;
    const rec = G.fish.nushi || (G.fish.nushi = { n: 0, max: 0 }); rec.n++; rec.max = Math.max(rec.max, ri(380, 520));
    G.fishPts = (G.fishPts || 0) + 50;
    await UI.say('海之主：「好力氣……我認輸了。」', '巨大的魚甩了甩尾巴，留下一片閃亮的鱗片，游回了深海。');
    await S.get('nushiscale', 1, '得到了主之鱗！');
    Extra.check();
  }
}
// 面向水邊時釣魚；白帆港的月帆船
{
  const int0 = Field.interact.bind(Field);
  Field.interact = function () {
    const p = this.leader(), [dx, dy] = DIRS[p.dir], tx = p.x + dx, ty = p.y + dy, c = this.tile(tx, ty);
    if (this.id === 'port' && F('eve') && Math.abs(tx - 30.4) <= 1.5 && Math.abs(ty - 13) <= 1 && (c === '~' || c === 'D')) {
      this.run(async () => { if (await UI.yesno('伊芙的月帆船。要出發前往月汐群島嗎？')) await sailToIsles(); });
      return;
    }
    const spot = FISH_SPOT[this.id];
    if (spot && c === '~' && !this.npcAt(tx, ty) && this.tile(p.x, p.y) !== '~') {
      if (Bag.has('rod')) { this.run(() => Fishing.session(spot)); return; }
      if (F('tide1') && !this.isWorld()) { this.run(() => UI.say('水裡好像有魚在游。', '（月汐港的漁夫岡瑟也許有多的釣竿……）')); return; }
    }
    return int0();
  };
}
async function fisherTalk() {
  if (!Bag.has('rod')) {
    await UI.say('漁夫岡瑟：「喲，你們就是伊芙帶回來的勇者？」', '漁夫岡瑟：「太陽不下山以後，魚都躲到深海去了，我也閒得發慌。」', '漁夫岡瑟：「這根舊釣竿給你們吧。面向水邊按 A 就能釣魚。」');
    await S.get('rod', 1, '得到了釣竿！');
    await UI.say('漁夫岡瑟：「咬餌的時候馬上拉竿，然後按住 A 收線，讓魚待在綠框裡。放開的話框會往回跑。」', '漁夫岡瑟：「港口、白帆港、沙漠的綠洲、雪國的池塘、還有洞窟裡的水潭……每個地方的魚都不一樣喔！」');
    return;
  }
  const n = fishKinds(), got = G.flags.fishgot || 0;
  const R = [[4, 'moonwater', 3, '月露'], [8, 'rod2', 1, '名人釣竿'], [fishTotal(), 'anglerring', 1, '釣手戒指']];
  for (const [need, id, cnt] of R) if (n >= need && got < need) {
    G.flags.fishgot = need;
    await S.get(id, cnt, `漁夫岡瑟：「已經釣到 ${need} 種魚了？了不起！這個送你。」\n得到了${itemInfo(id).name}${cnt > 1 ? ' ×' + cnt : ''}！`);
    if (id === 'rod2') await UI.say('漁夫岡瑟：「用這根釣竿，在月汐港的碼頭釣魚的話……說不定能遇到傳說中的「海之主」。」');
  }
  for (;;) {
    const i = await UI.menu({ items: [{ t: '用點數換獎品', r: `${G.fishPts || 0} 點` }, { t: '釣魚的訣竅' }, { t: '離開' }], title: `漁夫岡瑟（${n} / ${fishTotal()} 種）`, pos: mpos() });
    if (i < 0 || i === 2) break;
    if (i === 1) { const nx = R.find(r => r[0] > (G.flags.fishgot || 0)); await UI.say('漁夫岡瑟：「越大越兇的魚，綠框越小、跑得越快。先讓框慢慢靠過去，再輕輕地點。」', nx ? `漁夫岡瑟：「釣到 ${nx[0]} 種魚的話，我送你${nx[3]}。」` : '漁夫岡瑟：「你已經是釣魚名人了！」', F('nushi') ? '漁夫岡瑟：「你竟然真的釣到了海之主……我服了。」' : Bag.has('rod2') ? '漁夫岡瑟：「海之主只在月汐港的碼頭出沒。耐心點！」' : '漁夫岡瑟：「傳說月汐港的海底住著一條大魚，叫「海之主」……」'); continue; }
    const prizes = [['moonwater', 8], ['elixir', 15], ['lifefruit', 40], ['magicfruit', 40], ['powerfruit', 40], ['swiftfruit', 40]];
    const k = await UI.menu({ items: prizes.map(([id, c]) => ({ t: itemInfo(id).name, r: c + '點', dis: (G.fishPts || 0) < c })), title: `換獎品（${G.fishPts || 0} 點）`, pos: mpos(L.FS * 3, L.FS * 2), allowDis: true });
    if (k < 0) continue;
    const [id, c] = prizes[k];
    if ((G.fishPts || 0) < c) { await UI.say('點數不夠喔。'); continue; }
    if (await UI.yesno(`要用 ${c} 點換${itemInfo(id).name}嗎？`)) { G.fishPts -= c; Bag.add(id); Music.jingle('item'); await UI.say(`換到了${itemInfo(id).name}！`); }
  }
  await UI.say('漁夫岡瑟：「好天氣就是釣魚天！」');
}
async function fishBookTalk() {
  await UI.say('娜拉：「我是岡瑟的老婆。他釣到的魚，我都記在這本冊子上。你的也幫你記吧！」');
  await fishBook();
}
function fishBook() {
  return new Promise(res => {
    let scroll = 0;
    const lay = { modal: true };
    lay.update = () => {
      if (Input.dirPress === 'down') scroll++; if (Input.dirPress === 'up') scroll = Math.max(0, scroll - 1);
      if (Input.pressed.ok || Input.pressed.cancel || lay.tap) { UI.remove(lay); Snd.play('cancel'); res(); }
    };
    const WHERE = { sea: '海邊', tide: '群島', oasis: '綠洲', ice: '雪國的池塘', coral: '珊瑚洞窟', abyss: '深淵', tidepier: '月汐港的碼頭（名人釣竿）' };
    lay.draw = g => {
      const fs = L.FS, pad = L.pad, V = L.V;
      const w = Math.min(V.w - pad * 2, fs * 26), h = V.h - pad * 2, x = V.x + (V.w - w) / 2, y = V.y + pad;
      UI.win(g, x, y, w, h);
      UI.text(g, `釣魚記錄　${fishKinds()} / ${fishTotal()} 種　點數 ${G.fishPts || 0}`, x + pad * 1.4, y + pad, '#ffd76a', fs * 0.9, 'left', 'top', 700);
      const rh = fs * 2.2, vis = Math.floor((h - fs * 2.6) / rh); scroll = Math.min(scroll, Math.max(0, FISH.length - vis));
      FISH.slice(scroll, scroll + vis).forEach((f, j) => {
        const rec = G.fish && G.fish[f.id], yy = y + fs * 2.3 + j * rh;
        g.fillStyle = rec ? 'rgba(120,200,255,.10)' : 'rgba(0,0,0,.2)'; rr(g, x + pad, yy, w - pad * 2, rh - fs * 0.25, fs * 0.25); g.fill();
        g.imageSmoothingEnabled = false; g.save(); if (!rec) g.globalAlpha = 0.25; g.drawImage(fishIcon(f), x + pad * 1.6, yy + rh * 0.18, fs * 2.2, fs * 1.32); g.restore();
        UI.text(g, rec ? f.name : '？？？', x + pad * 1.6 + fs * 2.7, yy + rh * 0.28, rec ? (f.boss ? '#ff9a9a' : '#fff') : '#8a90b0', fs * 0.9, 'left', 'middle', 700);
        UI.text(g, rec ? `${rec.n} 條　最大 ${rec.max} 公分` : '出沒：' + f.at.map(a => WHERE[a]).join('、'), x + pad * 1.6 + fs * 2.7, yy + rh * 0.65, rec ? '#cfe0ff' : '#6a7090', fs * 0.72, 'left', 'middle');
      });
      if (scroll + vis < FISH.length) UI.cursor(g, x + w / 2, y + h - pad * 0.8, fs * 0.7, 'down');
      UI.hit(x, y, w, h * 0.8, () => { lay.tap = true; });
      UI.hit(x, y + h * 0.8, w, h * 0.2, () => { scroll++; });
    };
    UI.push(lay);
  });
}

// ───── 隊伍編成：最多 4 人出場，其他夥伴待命 ─────
function syncFieldParty() {
  const L0 = Field.leader();
  Field.party = G.party.map(() => ({ x: L0.x, y: L0.y, fx: L0.x, fy: L0.y, dir: L0.dir, t: 1 }));
}
{
  const order0 = orderMenu;
  orderMenu = async function () {
    if (!(G.reserve || []).length) return order0();
    const i = await UI.menu({ items: [{ t: '換位置' }, { t: '換人', r: `待命 ${G.reserve.length}` }], title: '隊伍', pos: mpos(L.FS * 5.5, L.FS * 4) });
    if (i === 0) return order0();
    if (i === 1) return formationMenu();
  };
}
async function formationMenu() {
  for (;;) {
    const all = G.party.map(m => ({ m, on: 1 })).concat(G.reserve.map(m => ({ m, on: 0 })));
    const items = all.map(({ m, on }) => { const s = Party.stats(m); return { t: Party.name(m), r: `${on ? '出場' : '待命'}　Lv${m.lv}　HP ${m.hp}/${s.mhp}`, rcol: on ? '#ffe9a8' : '#9aa6d8', col: m.hp <= 0 ? '#ff9aa8' : undefined }; });
    const i = await UI.menu({ items, title: '要讓誰上場或下場？', pos: mpos(L.FS * 3, L.FS * 1.5) });
    if (i < 0) return;
    const a = all[i];
    if (a.on) {
      if (a.m.id === 'hero') { await UI.say('洛恩是隊伍的領隊，不能下場。'); continue; }
      if (!G.reserve.length) continue;
      const j = await UI.menu({ items: G.reserve.map(m => ({ t: Party.name(m), r: 'Lv' + m.lv })).concat([{ t: '只讓他下場' }]), title: `和誰交換？`, pos: mpos(L.FS * 8, L.FS * 3) });
      if (j < 0) continue;
      const k = G.party.indexOf(a.m);
      if (j === G.reserve.length) { if (G.party.length <= 1) continue; G.party.splice(k, 1); G.reserve.push(a.m); await UI.say(`${Party.name(a.m)}到後方待命了。`); }
      else { const b = G.reserve[j]; G.party[k] = b; G.reserve[j] = a.m; await UI.say(`${Party.name(b)}上場，${Party.name(a.m)}到後方待命。`); }
    } else {
      if (G.party.length < 4) { G.reserve.splice(G.reserve.indexOf(a.m), 1); G.party.push(a.m); await UI.say(`${Party.name(a.m)}加入了隊伍！`); }
      else {
        const cand = G.party.filter(m => m.id !== 'hero');
        const j = await UI.menu({ items: cand.map(m => ({ t: Party.name(m), r: 'Lv' + m.lv })), title: `要讓誰換下來？`, pos: mpos(L.FS * 8, L.FS * 3) });
        if (j < 0) continue;
        const out = cand[j], k = G.party.indexOf(out), r = G.reserve.indexOf(a.m);
        G.party[k] = a.m; G.reserve[r] = out;
        await UI.say(`${Party.name(a.m)}上場，${Party.name(out)}到後方待命。`);
      }
    }
    syncFieldParty(); Snd.play('ok');
  }
}
// 待命的夥伴：分到六成經驗值；旅店、泉水、全滅後也會恢復
{
  const rw0 = Battle.rewards.bind(Battle);
  Battle.rewards = function (B) { const r = rw0(B); Battle.lastRw = r; return r; };
  const rb0 = runBattle;
  runBattle = async function (ids, o) {
    Battle.lastRw = null;
    const r = await rb0(ids, o);
    if (r === 'win' && G.reserve && G.reserve.length && Battle.lastRw) {
      const n = Math.round(Battle.lastRw.exp * 0.6);
      for (const m of G.reserve) for (const x of Party.gainExp(m, n)) if (x.gains) UI.toast(`${Party.name(m)}（待命）升到了第 ${x.lv} 級！`, 2.6);
    }
    return r;
  };
  const healR = () => { for (const m of G.reserve || []) { const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st = {}; } };
  const inn0 = inn;
  inn = async function (price, keeper) { const g0 = G.gold; await inn0(price, keeper); if (G.gold < g0) healR(); };
  const sp0 = springHeal;
  springHeal = async function () { healR(); return sp0(); };
  addEventListener('DOMContentLoaded', () => { const wipe0 = Game.wipe.bind(Game); Game.wipe = async function () { healR(); return wipe0(); }; });
  // 二周目：待命的夥伴也一起帶過去
  const ng0 = startNGPlus;
  startNGPlus = async function () {
    if (!await UI.yesno('曉鐘的聲音在心中迴盪……要帶著現在的力量，從頭開始新的旅程嗎？（二周目：敵人更強，獎勵更多）')) return;
    const keep = UI.yesno; UI.yesno = async () => true;
    const old = G;
    try { G.party = G.party.concat(G.reserve || []); G.reserve = []; await ng0(); } finally { UI.yesno = keep; }
    if (G !== old) { G.fish = old.fish || {}; G.fishPts = old.fishPts || 0; if (old.flags.fishgot) G.flags.fishgot = old.flags.fishgot; for (const k of ['rod', 'rod2']) if (old.items[k]) G.items[k] = 1; if (G.slot) Game.save(G.slot); }
  };
  const mig0 = Extra.migrate.bind(Extra);
  Extra.migrate = function (g) {
    g = mig0(g); g.reserve = g.reserve || []; g.fish = g.fish || {}; g.fishPts = g.fishPts || 0;
    for (const m of g.reserve) { m.bonus = m.bonus || {}; m.st = m.st || {}; }
    return g;
  };
}
// 手冊：釣魚記錄
{
  const fm0 = fieldMenu;
  fieldMenu = async function () {
    const keepMenu = UI.menu.bind(UI);
    // 在「冒險手冊」的子選單裡加上「釣魚記錄」
    UI.menu = function (o) {
      if (o && o.title === '冒險手冊' && G && Bag.has('rod')) {
        const items = o.items.concat([{ t: '釣魚記錄', r: fishKinds() + '/' + fishTotal() }]);
        return keepMenu(Object.assign({}, o, { items })).then(async j => { if (j === items.length - 1) { await fishBook(); return -1; } return j; });
      }
      return keepMenu(o);
    };
    try { return await fm0(); } finally { UI.menu = keepMenu; }
  };
}

// ───── 大鬥技場：月汐之戰 ─────
ARENA.push({ id: 'arena5', name: '月汐之戰', lv: 46, post: 1, rounds: [['abyssknight', 'deepeel', 'deepjelly'], ['sunknight', 'sunpriest', 'flamesp', 'sunknight'], ['kingcrab', 'phoenix'], ['vesper', 'karkino']], prize: 'duskcrown', prize2: 'tome_starfall', gold: 12000, again: 3000 });
{
  const ar0 = arenaRun;
  arenaRun = async function (a) {
    if (a.id === 'arena5' && !F('dusk')) return UI.say('主持人：「「月汐之戰」的對手都來自南方的月汐群島。」', '主持人：「等那邊的暮鐘響起以後，再來挑戰吧！」');
    return ar0(a);
  };
}

// ───── 圖鑑委託追加 ─────
{
  const sch = MAPS.maple.npcs.find(n => n.spr === 'scholar' && n.x === 12 && n.y === 8);
  if (sch) {
    const t0 = sch.talk;
    sch.talk = async () => {
      await t0();
      const n = Extra.bookCount(), got = G.flags.bookreq || 0;
      if (got < 45) return;
      const R = [[60, 'lifefruit', 3, '生命果實'], [75, 'angelwing', 1, '天使之翼']];
      for (const [need, id, cnt] of R) if (n >= need && (G.flags.bookreq2 || 0) < need) { G.flags.bookreq2 = need; await S.get(id, cnt, `研究員：「${need} 種！連南方群島的魔物都記錄了嗎？這是追加的謝禮！」\n得到了${itemInfo(id).name}${cnt > 1 ? ' ×' + cnt : ''}！`); }
      const nx = R.find(r => r[0] > (G.flags.bookreq2 || 0));
      if (nx) await UI.say(`研究員：「追加委託：打倒 ${nx[0]} 種不同的怪物，我就送你${nx[3]}。（目前 ${n} 種）」`);
    };
  }
}

ACHS.push(
  ['fish5', '釣魚入門', '釣到 5 種魚', () => fishKinds() >= 5],
  ['fishall', '釣魚名人', `釣到全部 ${FISH.filter(f => !f.boss).length} 種魚`, () => fishKinds() >= fishTotal()],
  ['nushi', '海之主', '釣起海之主並打倒牠', () => F('nushi')],
  ['arena5', '月汐鬥士', '制霸月汐之戰', () => F('arena5')],
);
SIDEQUESTS.push({ name: '小遊戲：釣魚', state: () => !Bag.has('rod') ? (F('tide1') ? '月汐港碼頭的漁夫岡瑟在找人陪他釣魚。' : null) : `釣到 ${fishKinds()} / ${fishTotal()} 種魚，點數 ${G.fishPts || 0}。（手冊→釣魚記錄）` });

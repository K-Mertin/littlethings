'use strict';
// 分歧路線：打完第 12 關可以選 A「霓虹夜城」或 B「叢林神殿」（第 13 關），兩條路都會到第 14 關「楓紅古都」，最後是第 15 關「時空裂隙」
// 存檔：rs = 到過的關（索引），cs = 打倒過頭目的關（索引）；舊存檔用 reached／cleared 補上
const ROUTE_AT = 11, ROUTE_A = 12, ROUTE_B = 13, ROUTE_JOIN = 14;
{
  const d = Store.data;
  if (!Array.isArray(d.rs)) d.rs = [];
  if (!Array.isArray(d.cs)) d.cs = [];
  for (let i = 0; i < Math.min(12, d.reached || 1); i++) if (!d.rs.includes(i)) d.rs.push(i);
  for (let i = 0; i < Math.min(12, d.cleared || 0); i++) if (!d.cs.includes(i)) d.cs.push(i);
}
const canStartAt = i => Store.data.rs.includes(i);
const canPracAt = i => Store.data.cs.includes(i);
nextStageOf = function (n) { return n === ROUTE_A || n === ROUTE_B ? ROUTE_JOIN : n + 1; };
// 第 13 關 A／B 只要走過其中一條，第 14 關以後就算數
rushList = function (from) {
  const L = [];
  for (let i = from; i < STAGES.length; i++) if (canPracAt(i)) L.push(i);
  return L.length ? L : [from];
};
afterClear = (function (base) {
  return function () {
    if (G.stage === ROUTE_AT && STAGES.length > ROUTE_B) { showRoute(); return; }
    if (G.stage === ROUTE_A || G.stage === ROUTE_B) { if (STAGES.length > ROUTE_JOIN) startStage(ROUTE_JOIN); else showEnding(); return; }
    base();
  };
})(afterClear);
startStage = (function (base) {
  return function (n) {
    base(n);
    const d = Store.data; if (!d.rs.includes(n)) { d.rs.push(n); Store.save(); }
  };
})(startStage);
bossDown = (function (base) {
  return function (e) {
    base(e);
    const d = Store.data; if (!d.cs.includes(G.stage)) { d.cs.push(G.stage); Store.save(); }
  };
})(bossDown);

// ---------- 選路線畫面 ----------
const ROUTES = [
  { st: ROUTE_A, tag: 'A', note: '雨夜裡的超大城市。探照燈塔照到你就會叫來增援，小心霓虹巷道裡衝出來的警車。', diff: 4, col: '#ff4fd8' },
  { st: ROUTE_B, tag: 'B', note: '藏在雨林裡的古代神殿。成對的符文圖騰會拉出光柵，石像鬼要等牠張開翅膀才打得動。', diff: 4, col: '#7dffb0' },
];
let routeT = null, routeSel = 0;
function showRoute() {
  G.state = 'route'; P.auto = 0;
  const box = $('routes'); box.innerHTML = '';
  ROUTES.forEach((R, i) => {
    const S = STAGES[R.st], b = document.createElement('button');
    b.className = 'route'; b.style.setProperty('--rc', R.col);
    b.innerHTML = `<span class="rtag">${R.tag}</span><canvas width="276" height="192"></canvas><b>${S.name}</b><small>${S.en}</small><span class="rnote">${R.note}</span><i>頭目　${ET[S.boss].name}</i>`;
    b.onclick = () => chooseRoute(i);
    b.onpointerenter = () => { routeSel = i; markRoute(); };
    box.appendChild(b);
    const cv2 = b.querySelector('canvas'), g = cv2.getContext('2d'), sil = BossIntro.silhouette(S.boss);
    g.fillStyle = 'rgba(20,60,90,.45)'; g.fillRect(0, 0, 276, 192);
    g.strokeStyle = 'rgba(120,220,255,.18)'; g.lineWidth = 1;
    for (let x = 0; x <= 276; x += 23) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 192); g.stroke(); }
    for (let y = 0; y <= 192; y += 24) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(276, y + 0.5); g.stroke(); }
    if (sil) g.drawImage(sil, 6, 8, 264, 176);
  });
  routeSel = 0; markRoute();
  showOv('route'); document.body.classList.remove('playing');
  let n = 20; $('routeT').textContent = n;
  clearInterval(routeT);
  routeT = setInterval(() => { n--; $('routeT').textContent = Math.max(0, n); if (n <= 0) chooseRoute(routeSel); }, 1000);
  Music.play('title');
}
function markRoute() { [...$('routes').children].forEach((b, i) => b.classList.toggle('on', i === routeSel)); }
function chooseRoute(i) {
  if (G.state !== 'route') return;
  clearInterval(routeT);
  Snd.init(); Snd.play('start');
  G.state = 'play'; showOv(null); document.body.classList.add('playing');
  startStage(ROUTES[i].st);
}
addEventListener('keydown', e => {
  if (G.state !== 'route') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowUp') { routeSel = 0; markRoute(); Snd.play('select'); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowDown') { routeSel = 1; markRoute(); Snd.play('select'); }
  if (e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'Space') { e.preventDefault(); chooseRoute(routeSel); }
});
// 手把
update = (function (base) {
  return function (dt) {
    base(dt);
    if (G.state === 'route') {
      const p = Input.pad;
      if (p.x < -0.5) { routeSel = 0; markRoute(); } else if (p.x > 0.5) { routeSel = 1; markRoute(); }
      if (p.startEdge || p.bombEdge) chooseRoute(routeSel);
    }
  };
})(update);
toTitle = (function (base) { return function () { clearInterval(routeT); base(); }; })(toTitle);

// ---------- 標題畫面：分歧關卡要真的到過才能選 ----------
refreshTitle = (function (base) {
  return function () {
    base();
    const prac = G.mode !== 'arcade';
    const ok = i => prac ? canPracAt(i) : canStartAt(i);
    if (!ok(G.startFrom)) {
      let k = G.startFrom; while (k > 0 && !ok(k)) k--;
      if (k !== G.startFrom) { G.startFrom = k; return refreshTitle(); }
    }
    document.querySelectorAll('#stages .stg').forEach((b, i) => { b.disabled = !ok(i); b.classList.toggle('route', i >= ROUTE_A); });
  };
})(refreshTitle);
refreshTitle();
window.__sky.route = { showRoute, chooseRoute, ROUTES };

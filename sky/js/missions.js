'use strict';
// 任務挑戰：用已經通過的關卡玩不同規則
// - 頭目連戰：滿火力，連續打頭目，不能接關，計時
// - 封印炸彈：整關不能用炸彈（炸彈道具變成分數），不能接關
// - 獎章連鎖：獎章越吃越值錢，漏掉一個或被打下就斷掉；敵人更常掉獎章
// - 一命到底：只有一架飛機

const MISSIONS = {
  rush: { name: '頭目連戰', short: '連戰', col: '#ff8a6a',
    note: '從選的關開始，一路連打每一關的頭目（打到你通過的最後一關）。滿火力出發，不能接關，看你能打倒幾隻、花多少時間。' },
  nobomb: { name: '封印炸彈', short: '無炸彈', col: '#ffb43a',
    note: '整關都不能放炸彈，吃到炸彈道具會變成 5000 分。被打下還能繼續，但不能接關。打倒頭目就成功。' },
  chain: { name: '獎章連鎖', short: '連鎖', col: '#ffd23f',
    note: '每吃一個獎章就更值錢（最高 10000 分）。讓獎章掉出畫面或被打下，連鎖就會中斷。敵人比較常掉獎章，挑戰最高分！' },
  onelife: { name: '一命到底', short: '一命', col: '#7dffb0',
    note: '只有一架飛機，被打中一次就失敗，也不會加命。小心閃過每一顆子彈，打倒頭目就成功。' },
};
{
  const d = Store.data;
  if (!d.mis || typeof d.mis !== 'object') d.mis = {};
}
G.mission = null; G.misType = 'rush';
const misKey = (type, st) => type + ':' + st + ':' + G.diff;
const misRec = (type, st) => Store.data.mis[misKey(type, st)] || null;
const fmtT = s => { s = Math.max(0, s | 0); return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
// 頭目連戰的順序（之後如果有分歧路線，也從這裡決定下一關）
function rushList(from) {
  const L = [], last = Math.max(from, Math.min(STAGES.length, Store.data.cleared) - 1);
  for (let s = from; s <= last; s = nextStageOf(s, true)) { L.push(s); if (s >= STAGES.length - 1) break; }
  return L;
}
// 一般流程的下一關（route.js 會改寫）
function nextStageOf(n) { return n + 1; }

// ---------- 開始 ----------
newGame = (function (base) {
  return function (from) {
    const m = G.mode === 'mission' ? { type: G.misType, stage: from, t: 0, bosses: 0, ok: false } : null;
    G.mission = m;
    base(from);
    if (!m) return;
    const d = G.d;
    d.ext = 1e12; G.extNext = 1e12; d.autoBomb = false;
    if (m.type === 'rush') {
      m.list = rushList(from); m.i = 0;
      P.lvl = 8; P.sub = 'H'; P.sl = 4; P.od = odCap();
      G.bombs = Math.max(2, d.bombs - 1);
      rushSetup();
    } else if (m.type === 'nobomb') { d.bombs = 0; G.bombs = 0; }
    else if (m.type === 'onelife') { G.lives = 1; d.lives = 1; }
  };
})(newGame);
function rushSetup() {
  const m = G.mission;
  G.seqI = STAGES[G.stage].seq.length; G.nextWave = 1.0; G.scroll = 4300;
  G.banner.big = 'BOSS RUSH ' + (m.i + 1) + '/' + m.list.length;
  G.banner.extra = '頭目連戰'; G.banner.extra2 = G.banner.extra3 = '';
}

// ---------- 過關／失敗 ----------
runScript = (function (base) {
  return function (dt) {
    const m = G.mission;
    if (m && G.state === 'play') {
      if (G.phase !== 'clear' && G.phase !== 'down') m.t += dt;
      if (G.phase === 'clear') {
        if (m.type === 'rush' && G.clearT > 3.0) {
          m.bosses++;
          if (m.i + 1 < m.list.length) {
            m.i++;
            startStage(m.list[m.i]);
            P.od = Math.max(P.od, odCap()); G.bombs = Math.min(7, G.bombs + 1);
            rushSetup();
            return;
          }
          missionDone(true); return;
        }
        if (m.type !== 'rush' && G.clearT > 5.6) { missionDone(true); return; }
      }
    }
    base(dt);
  };
})(runScript);
showContinue = (function (base) { return function () { if (G.mission) { missionDone(false); return; } base(); }; })(showContinue);
function missionDone(ok) {
  const m = G.mission; if (!m || G.state !== 'play') return;
  m.ok = ok;
  G.state = 'mission'; document.body.classList.remove('playing');
  const key = misKey(m.type, m.stage), old = Store.data.mis[key] || null;
  const rec = { s: G.score, c: !!ok, b: m.bosses, t: Math.round(m.t), n: m.list ? m.list.length : 1, m: G.medals, ch: G.chainBest || 0 };
  // 比較：先比有沒有成功，再比頭目數，最後比分數
  const better = !old || (rec.c && !old.c) || (rec.c === old.c && (rec.b > (old.b || 0) || (rec.b === (old.b || 0) && rec.s > old.s)));
  if (better) { Store.data.mis[key] = rec; Store.save(); }
  const M = MISSIONS[m.type];
  $('misTitle').textContent = ok ? '任務完成！' : '任務失敗';
  $('misTitle').style.color = ok ? '#ffe9a8' : '#ff8a6a';
  $('misName').textContent = M.name + ' · 第 ' + stageLabel(m.stage) + ' 關' + (m.type === 'rush' ? '起' : ' ' + STAGES[m.stage].name);
  $('misScore').textContent = G.score.toLocaleString();
  let det = '';
  if (m.type === 'rush') det = '擊倒頭目 ' + m.bosses + ' / ' + m.list.length + '　時間 ' + fmtT(m.t);
  else if (m.type === 'chain') det = '最高連鎖 ×' + (G.chainBest || 0) + '　獎章 ' + G.medals + ' 個';
  else det = '擊落 ' + G.kills + ' 架　時間 ' + fmtT(m.t);
  $('misDetail').textContent = det;
  $('misBest').textContent = better ? '新的任務紀錄！' : ('最佳 ' + old.s.toLocaleString() + (old.c ? '（已完成）' : ''));
  showOv('mis'); Music.play(ok ? 'clear' : 'title');
  if (ok) Snd.play('1up');
}
saveHi = (function (base) { return function () { if (!G.mission) base(); }; })(saveHi);
recordRun = (function (base) { return function (c) { return G.mission ? -1 : base(c); }; })(recordRun);
toTitle = (function (base) { return function () { const m = G.mission; if (m && G.state === 'play') G.state = 'mission'; base(); G.mission = null; }; })(toTitle);

// ---------- 規則 ----------
useBomb = (function (base) { return function () { if (G.mission && G.mission.type === 'nobomb') return false; return base(); }; })(useBomb);
collect = (function (base) {
  return function (it) {
    const m = G.mission;
    if (m && m.type === 'nobomb' && it.kind === 'B') { addScore(5000); popText(P.x, P.y - 26, '5000', '#ffd23f'); Snd.play('item'); return; }
    if (m && m.type === 'chain' && it.kind === 'medal') {
      const v = Math.min(10000, 500 + G.medalChain * 300);
      G.medals++; G.medalChain++; G.chainBest = Math.max(G.chainBest || 0, G.medalChain);
      addScore(v); popText(it.x, it.y - 10, String(v), G.medalChain >= 20 ? '#fff6c0' : '#ffd23f'); Snd.play('medal');
      if (G.medalChain % 10 === 0) { popText(P.x, P.y - 44, '連鎖 ×' + G.medalChain + '！', '#7dffb0'); Snd.play('1up'); }
      return;
    }
    base(it);
  };
})(collect);
function chainBreak() {
  if (G.medalChain >= 3) { popText(P.x, P.y - 40, '連鎖中斷', '#ff8a6a'); Snd.tone(300, 0.25, 'square', 0.05, 120); }
  G.medalChain = 0;
}
updateItems = (function (base) {
  return function (dt) {
    const m = G.mission;
    if (m && m.type === 'chain') for (const it of G.items) if (it.kind === 'medal' && !it.missed && it.y > H + 20) { it.missed = true; chainBreak(); }
    base(dt);
  };
})(updateItems);
playerHit = (function (base) {
  return function () {
    const was = P.alive; base();
    if (was && !P.alive && G.mission && G.mission.type === 'chain') chainBreak();
  };
})(playerHit);
killEnemy = (function (base) {
  return function (e) {
    base(e);
    const m = G.mission;
    if (m && m.type === 'chain' && !e.boss && G.phase !== 'down' && Math.random() < (e.layer === 'ground' ? 0.5 : 0.22)) spawnItem('medal', e.x, e.y);
  };
})(killEnemy);
startStage = (function (base) { return function (n) { base(n); G.chainBest = G.chainBest || 0; }; })(startStage);
newGame = (function (base) { return function (from) { G.chainBest = 0; base(from); }; })(newGame);

// ---------- HUD ----------
drawHUD = (function (base) {
  return function (c) {
    base(c);
    const m = G.mission; if (!m) return;
    const M = MISSIONS[m.type];
    txt(c, M.short, W - 8, 26, 9, M.col, 'right', CJK, 700);
    if (m.type === 'chain') {
      const nv = Math.min(10000, 500 + G.medalChain * 300);
      txt(c, '連鎖 ×' + G.medalChain, 8, H - 80, 11, G.medalChain >= 10 ? '#fff6c0' : '#ffd23f', 'left', CJK, 900);
      txt(c, '下一個 ' + nv, 8, H - 94, 8, '#ffe9a8', 'left', CJK, 500);
    } else if (m.type === 'rush') {
      txt(c, '頭目 ' + (m.i + 1) + '/' + m.list.length, 8, H - 80, 11, '#ff8a6a', 'left', CJK, 900);
      txt(c, fmtT(m.t), 8, H - 94, 9, '#ffe9a8');
    } else if (m.type === 'nobomb') {
      txt(c, '炸彈封印中', 8, H - 80, 10, '#ffb43a', 'left', CJK, 700);
    }
  };
})(drawHUD);

// ---------- 標題畫面 ----------
refreshTitle = (function (base) {
  return function () {
    const d = Store.data;
    if (G.mode === 'mission' && d.cleared < 1) G.mode = 'arcade';
    base();
    const mis = G.mode === 'mission';
    $('modeMis').disabled = d.cleared < 1;
    $('misTypes').hidden = !mis; $('misNote').hidden = !mis;
    if (!mis) { document.querySelectorAll('#stages .stg').forEach(b => b.classList.remove('done')); return; }
    const maxSel = d.cleared;
    if (G.startFrom + 1 > maxSel) G.startFrom = Math.max(0, maxSel - 1);
    document.querySelectorAll('#stages .stg').forEach((b, i) => {
      b.disabled = i + 1 > maxSel; b.classList.toggle('on', i === G.startFrom);
      const r = misRec(G.misType, i); b.classList.toggle('done', !!(r && r.c));
    });
    for (const b of document.querySelectorAll('[data-mis]')) b.classList.toggle('on', b.dataset.mis === G.misType);
    $('misNote').textContent = MISSIONS[G.misType].note;
    $('stageLbl').textContent = G.misType === 'rush' ? '從哪一關的頭目開始' : '挑戰哪一關（已通過的關）';
    const r = misRec(G.misType, G.startFrom);
    let rs = '';
    if (r) rs = G.misType === 'rush' ? '　最佳：' + r.b + '/' + r.n + ' 隻 · ' + r.s.toLocaleString() : '　最佳 ' + r.s.toLocaleString() + (r.c ? ' ✓' : '');
    $('stageName').textContent = '第 ' + stageLabel(G.startFrom) + ' 關 · ' + STAGES[G.startFrom].name + rs;
    $('btnStart').textContent = '開始任務';
  };
})(refreshTitle);
{
  for (const b of document.querySelectorAll('[data-mis]')) b.onclick = () => { G.misType = b.dataset.mis; Snd.init(); Snd.play('select'); refreshTitle(); };
  $('btnMisAgain').onclick = () => { Snd.init(); Snd.play('start'); G.state = 'title'; document.body.classList.add('playing'); newGame(G.startFrom); };
  $('btnMisTitle').onclick = () => toTitle();
}
refreshTitle();
window.__sky.mis = { MISSIONS, missionDone, rushList };

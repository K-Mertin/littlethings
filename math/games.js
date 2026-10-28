// 123 小島：小遊戲（用 index.html 裡的共用元件：say、choose、counter、eqHTML…）
'use strict';
const { GAMES, LVNAME, ANIMALS, FISH } = M;
const GAME = {};

/* ---------- 題目：依程度出題 ---------- */
function gList(lv) {
  const list = [];
  if (lv === 'count') for (let n = 1; n <= 10; n++) list.push({ op: 'n', a: n, r: n });
  if (lv === 'add' || lv === 'mix') for (let a = 1; a <= 9; a++) for (let b = 1; a + b <= 10; b++) list.push({ op: '+', a, b, r: a + b });
  if (lv === 'sub' || lv === 'mix') for (let a = 2; a <= 10; a++) for (let b = 1; b < a; b++) list.push({ op: '-', a, b, r: a - b });
  if (lv === 'add5') for (let a = 1; a <= 4; a++) for (let b = 1; a + b <= 5; b++) list.push({ op: '+', a, b, r: a + b });
  if (lv === 'add20') M.LISTS.add20.forEach(q => list.push({ op: '+', a: q.a, b: q.b, r: q.a + q.b }));
  return list;
}
const pkey = q => q.op === 'n' ? `${q.a}` : q.op === 'next' ? `>${q.a}` : `${q.a}${q.op}${q.b}`;
const askLine = q => P.eqQ(q.a, q.op, q.b);
const ansLine = q => P.eqA(q.a, q.op, q.b, q.r);

/* ---------- 畫面 ---------- */
SCREENS.game = gid => {
  const G = GAMES.find(g => g.id === gid), my = sess;
  S.glv = S.glv || {};
  if (gid === 'quick') return quickScreen(G, my);
  const lv = G.lv.includes(S.glv[gid]) ? S.glv[gid] : G.lv[0];
  $('#ltag').textContent = `${G.e} ${G.t}`; $('#ltag').classList.remove('hide');
  runGame(G, lv, my).catch(e => { if (e !== STOP) console.error(e); });
};
function gFrame(G, lv, c, html) {
  view.innerHTML = `<div class="gwrap"><div class="gtop"><div class="lvls">${G.lv.map(l => `<button class="chip ${l === lv ? 'on' : ''}" data-lv="${l}">${LVNAME[l]}</button>`).join('')}</div>${dotsHTML(c.n, c.i)}</div>${html}</div>`;
  view.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { if (b.dataset.lv === lv) return; S.glv[G.id] = b.dataset.lv; save(); go('game', G.id); });
  return view.querySelector('.gwrap');
}
async function runGame(G, lv, my) {
  const n = G.id === 'ten' ? 3 : 6;
  let qs = G.id === 'ten' ? null : lv === 'order' ? null : planNums(n, gList(lv), q => `g:${G.id}:${pkey(q)}`);
  if (lv === 'order') { const s = rand(5); qs = range(0, n - 1).map(i => ({ op: 'next', a: s + i, r: s + i + 1 })); }   // 青蛙一格一格往下一個數跳
  for (let i = 0; i < n; i++) {
    const q = qs ? qs[i] : null;
    const ok = await GAME[G.id](q, { G, lv, my, i, n, first: i === 0 });
    if (q) mark(`g:${G.id}:${pkey(q)}`, ok);
    await W(my, sleep(500));
  }
  S.rounds['g:' + G.id] = (S.rounds['g:' + G.id] || 0) + 1; save();
  finishRound('g:' + G.id, () => go('game', G.id));
}

/* ---------- 🐶 餵動物 ---------- */
GAME.feed = async (q, c) => {
  const { my } = c, an = pick(ANIMALS);
  const want = q.op === 'n' ? q.a : `${q.a} ${OPS[q.op]} ${q.b}`;
  const root = gFrame(c.G, c.lv, c, `<div class="feed">
      <div class="eater"><div class="think">${want}</div><div class="ani">${an.e}</div><div class="belly"></div></div>
      <div class="food card">${range(1, 10).map(() => `<button class="fd" aria-label="食物">${an.f}</button>`).join('')}</div>
    </div><div class="row"><button class="say" id="full">✔ 吃飽了</button></div>`);
  const fds = [...root.querySelectorAll('.fd')], belly = root.querySelector('.belly'), ani = root.querySelector('.ani'), full = root.querySelector('#full');
  let eaten = 0, busy = false, first = true;
  const eat = el => {
    if (busy || el.classList.contains('eaten')) return;
    el.classList.add('eaten'); eaten++;
    belly.insertAdjacentHTML('beforeend', `<span>${an.f}</span>`);
    ani.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15,.9)' }, { transform: 'scale(1)' }], 260);
    blip(CN(eaten));
  };
  const spit = () => { const el = fds.filter(f => f.classList.contains('eaten')).pop(); if (!el) return; el.classList.remove('eaten'); eaten--; belly.lastElementChild.remove(); };
  fds.forEach(f => f.onclick = () => eat(f));
  T.right = () => eaten < q.r ? fds.find(f => !f.classList.contains('eaten')) : full;
  T.wrong = () => eaten !== q.r ? full : fds.find(f => !f.classList.contains('eaten')) || null;
  const prompt = q.op === 'n' ? [P.feed(an, q.a)] : [P.feedEq(an), askLine(q)];
  const done = q.op === 'n' ? P.ate(q.r) : ansLine(q);
  preload(...prompt, done, P.tooFew, P.tooMany);
  if (c.first) await W(my, say(P.gIntro.feed));
  say(...prompt);
  return new Promise((resolve, reject) => {
    full.onclick = async () => {
      if (busy) return; busy = true;
      try {
        if (eaten === q.r) {
          chime(true); ani.classList.add('happy');
          await W(my, say(praise(), done)); resolve(first);
        } else {
          first = false; chime(false); ani.animate([{ transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'none' }], 400);
          if (eaten < q.r) await W(my, say(P.tooFew));
          else { const p = say(P.tooMany); while (eaten > q.r) { spit(); await W(my, sleep(250)); } await W(my, p); }
          busy = false;
        }
      } catch (e) { reject(e); }
    };
  });
};

/* ---------- 🎈 戳氣球 ---------- */
const BCOL = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff922b'];
GAME.balloon = async (q, c) => {
  const { my } = c, it = pickItem({ story: true });
  const top = q.op === 'n'
    ? `<div class="card qpic">${trayHTML(it, q.a, { cols: Math.min(q.a, 5), cells: q.a, static: true, small: true, size: Math.min(52, fitCols(5, 2, 420, 60)) })}</div>`
    : `<div class="card qeq">${eqHTML(q.a, q.op, q.b)}</div>`;
  const vals = shuffle(numOpts(q.r, 0, 10, 5, 3));
  const root = gFrame(c.G, c.lv, c, `${top}<div class="sky">${vals.map((v, i) => `<button class="bl" data-v="${v}" style="--x:${4 + i * 19}%;--d:${(i * 2.3 + rand(10) / 10) % 8}s;--c:${BCOL[i]}"><span>${v}</span></button>`).join('')}</div>`);
  const bls = [...root.querySelectorAll('.bl')];
  const ask = q.op === 'n' ? P.howMany(it) : askLine(q), ans = q.op === 'n' ? P.total(it, q.r) : ansLine(q);
  preload(ask, ans);
  if (c.first) await W(my, say(P.gIntro.balloon));
  say(ask);
  return choose(my, bls, b => +b.dataset.v === q.r,
    async b => { await say(P.thisIs(+b.dataset.v)); say(P.tapGlow); },
    async b => { b.classList.add('pop'); fillEq(root, q.r); await say(praise(), ans); });
};

/* ---------- 🐠 魚缸 ---------- */
GAME.fish = async (q, c) => {
  const { my } = c, { a, b, op, r } = q, total = op === '+' ? a + b : a;
  const spots = shuffle(range(0, 9)).slice(0, total);
  const root = gFrame(c.G, c.lv, c, `<div class="tank">${spots.map((s, i) => `<span class="fsh" style="--x:${6 + (s % 5) * 18}%;--y:${10 + Math.floor(s / 5) * 42 + rand(12)}%;--dur:${2.4 + rand(20) / 10}s;--dl:-${rand(30) / 10}s"><i>🐟</i><b class="bd"></b></span>`).join('')}
      <span class="weed" style="left:3%">🌿</span><span class="weed" style="right:4%">🪸</span></div>
    <div class="opts">${numOpts(r, 0, 10, 3, 2).map(v => numBtn(v)).join('')}</div>`);
  const fish = [...root.querySelectorAll('.fsh')], tank = root.querySelector('.tank');
  const newF = op === '+' ? fish.slice(a) : [], goF = op === '-' ? fish.slice(a - b) : [];
  newF.forEach(f => f.classList.add('out'));
  const lines = [P.have(FISH, a), op === '+' ? P.come('條', b) : P.away('條', b)];
  const ans = op === '+' ? P.allC('條', r) : P.now('條', r);
  preload(...lines, P.nowQ('條'), ans);
  if (c.first) await W(my, say(P.gIntro.fish));
  await W(my, say(lines[0]));
  const anim = (async () => { await W(my, sleep(300)); for (const f of newF) { f.classList.remove('out'); await W(my, sleep(200)); } for (const f of goF) { f.classList.add('leave'); await W(my, sleep(200)); } })();
  await W(my, say(lines[1])); await anim;
  say(P.nowQ('條'));
  const left = fish.filter(f => !f.classList.contains('leave'));
  const btns = [...root.querySelectorAll('.num')];
  return choose(my, btns, x => +x.dataset.v === r,
    async () => {
      await say(P.together); tank.classList.add('still');
      for (let i = 0; i < left.length; i++) { left[i].classList.add('cnt'); left[i].querySelector('.bd').textContent = i + 1; stopAll(); await W(my, play(CN(i + 1))); await W(my, sleep(120)); }
      await say(ans); tank.classList.remove('still'); left.forEach(f => f.classList.remove('cnt')); say(P.tapGlow);
    },
    async () => { await say(praise(), ans); });
};

/* ---------- 🃏 湊數配對 ---------- */
GAME.ten = async (q, c) => {
  const { my } = c, t = c.lv === 'five' ? 5 : 10;
  const all = t === 5 ? [[1, 4], [2, 3], [0, 5], [4, 1], [3, 2]] : [[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]];
  const chosen = shuffle(all).slice(0, 4);
  const vals = shuffle(chosen.flat());
  const root = gFrame(c.G, c.lv, c, `<div class="target">= ${t}</div><div class="cards">${vals.map(v => `<button class="nc" data-v="${v}"><b>${v}</b><span class="pips">${'●'.repeat(v)}</span></button>`).join('')}</div>`);
  const cards = [...root.querySelectorAll('.nc')];
  const live2 = () => cards.filter(x => !x.classList.contains('gone'));
  const v = x => +x.dataset.v;
  let sel = null, busy = false, miss = 0;
  T.right = () => sel ? live2().find(x => x !== sel && v(x) + v(sel) === t) : live2().find(x => live2().some(y => y !== x && v(x) + v(y) === t));
  T.wrong = () => sel ? live2().find(x => x !== sel && v(x) + v(sel) !== t) || null : null;
  const eqLine = (x, y) => (x + y > 10 && x < y) ? P.eqA(y, '+', x, x + y) : P.eqA(x, '+', y, x + y);
  preload(P.pairQ[t], P.pairNo[t], P.boardDone);
  if (c.first) await W(my, sleep(10));
  say(P.pairQ[t]);
  return new Promise((resolve, reject) => cards.forEach(card => card.onclick = async () => {
    if (busy || card.classList.contains('gone')) return;
    try {
      if (!sel) { sel = card; card.classList.add('sel'); blip(CN(v(card))); return; }
      if (sel === card) { card.classList.remove('sel'); sel = null; return; }
      busy = true; const a = sel, b = card; b.classList.add('sel');
      if (v(a) + v(b) === t) {
        chime(true); a.classList.add('ok'); b.classList.add('ok');
        await W(my, say(eqLine(v(a), v(b))));
        a.classList.add('gone'); b.classList.add('gone');
        if (!live2().length) { await W(my, say(P.boardDone)); resolve(miss === 0); }
      } else {
        miss++; chime(false); a.classList.add('no'); b.classList.add('no');
        await W(my, say(eqLine(v(a), v(b)), P.pairNo[t]));
      }
      [a, b].forEach(x => x.classList.remove('sel', 'no')); sel = null; busy = false;
    } catch (e) { reject(e); }
  }));
};


/* ---------- 🐹 打地鼠 ---------- */
GAME.mole = async (q, c) => {
  const { my } = c, it = pickItem({ story: true });
  const top = q.op === 'n'
    ? `<div class="card qpic">${trayHTML(it, q.a, { cols: Math.min(q.a, 5), cells: q.a, static: true, small: true, size: Math.min(48, fitCols(5, 2, 470, 60)) })}</div>`
    : `<div class="card qeq">${eqHTML(q.a, q.op, q.b)}</div>`;
  const root = gFrame(c.G, c.lv, c, `<div class="frow">${top}<div class="holes">${range(0, 5).map(() => `<button class="hole"><span class="mole"><i>🐹</i><b></b></span><span class="dirt"></span></button>`).join('')}</div></div>`);
  const holes = [...root.querySelectorAll('.hole')];
  const pool = numOpts(q.r, 0, 10, 5, 3).filter(v => v !== q.r);
  const ask = q.op === 'n' ? P.howMany(it) : askLine(q), ans = q.op === 'n' ? P.total(it, q.r) : ansLine(q);
  let done = false, first = true, sinceRight = 0, hint = false;
  T.right = () => holes.find(hh => hh.classList.contains('up') && +hh.dataset.v === q.r) || null;
  T.wrong = () => holes.find(hh => hh.classList.contains('up') && +hh.dataset.v !== q.r) || null;
  const down = hh => { hh.classList.remove('up', 'glow'); };
  const popOne = () => {
    if (done || my !== sess) return;
    const free = holes.filter(x => !x.classList.contains('up') && !x.classList.contains('hit')); if (!free.length) return;
    const shown = holes.filter(x => x.classList.contains('up')).map(x => +x.dataset.v);
    const hh = pick(free), right = !shown.includes(q.r) && (sinceRight >= 2 || Math.random() < .4);
    const v = right ? q.r : pick(pool.filter(x => !shown.includes(x)).concat(pool).slice(0, Math.max(1, pool.filter(x => !shown.includes(x)).length))); sinceRight = v === q.r ? 0 : sinceRight + 1;
    hh.dataset.v = v; hh.querySelector('b').textContent = v; hh.classList.add('up'); if (hint && v === q.r) hh.classList.add('glow');
    const id = hh._t = setTimeout(() => { if (hh._t === id && !done) down(hh); }, 3000);
  };
  preload(ask, ans);
  if (c.first) await W(my, say(P.gIntro.mole));
  say(ask);
  await W(my, sleep(600));
  popOne(); const tick = setInterval(() => { if (my !== sess || done) return clearInterval(tick); popOne(); }, 1100);
  return new Promise((resolve, reject) => holes.forEach(hh => hh.onclick = async () => {
    if (done || !hh.classList.contains('up')) return;
    try {
      const v = +hh.dataset.v;
      if (v === q.r) {
        done = true; clearInterval(tick); chime(true); hh.classList.remove('glow'); hh.classList.add('hit');
        holes.forEach(x => { if (x !== hh) down(x); }); fillEq(root, q.r);
        await W(my, say(praise(), ans)); resolve(first);
      } else {
        first = false; hint = true; chime(false); hh.classList.add('no'); blip(CN(v));
        setTimeout(() => { hh.classList.remove('no'); down(hh); }, 450);
      }
    } catch (e) { reject(e); }
  }));
};

/* ---------- 🐸 青蛙過河 ---------- */
GAME.frog = async (q, c) => {
  const { my } = c, i = c.i, n = c.n;
  const prompt = q.op === 'next' ? `<div class="card qeq"><div class="eq"><span>${q.a}</span><i>→</i><span class="qm" data-r>?</span></div></div>` : `<div class="card qeq">${eqHTML(q.a, q.op, q.b)}</div>`;
  const vals = numOpts(q.r, 0, q.op === 'next' ? 20 : 10, 3, 2);
  const root = gFrame(c.G, c.lv, c, `<div class="frow">${prompt}<div class="opts lilies">${vals.map(v => `<button class="num lily" data-v="${v}">${v}</button>`).join('')}</div></div><div class="river"><span class="bank">🌳</span>${range(0, n - 1).map(k => `<span class="pad ${k < i ? 'done' : ''}">${k < i ? '🪷' : ''}</span>`).join('')}<span class="bank home">🏠</span><span class="froggy">🐸</span></div>`);
  const fr = root.querySelector('.froggy'), spots = [root.querySelector('.bank'), ...root.querySelectorAll('.pad'), root.querySelector('.home')];
  const at = k => { const el = spots[k]; return el.offsetLeft + el.offsetWidth / 2 - fr.offsetWidth / 2; };
  requestAnimationFrame(() => { fr.style.transform = `translateX(${at(i)}px)`; });
  const hop = async (f, t) => { const x0 = at(f), x1 = at(t); await fr.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${(x0 + x1) / 2}px) translateY(-40px)` }, { transform: `translateX(${x1}px)` }], { duration: 420, easing: 'ease-in-out' }).finished; fr.style.transform = `translateX(${x1}px)`; };
  const btns = [...root.querySelectorAll('.lily')];
  const ask = q.op === 'next' ? [P.next] : [askLine(q)], ans = q.op === 'next' ? CN(q.r) : ansLine(q);
  preload(...ask, ans, P.frogHome);
  if (c.first) await W(my, say(P.gIntro.frog));
  say(...ask);
  return choose(my, btns, b => +b.dataset.v === q.r,
    async b => {
      if (q.op === 'next') { await say(P.together); stopAll(); await W(my, play(CN(q.a))); await W(my, play(CN(q.r))); }
      else { await say(P.thisIs(+b.dataset.v)); await say(ans); }
      say(P.tapGlow);
    },
    async () => {
      fillEq(root, q.r); const pad = spots[i + 1]; pad.classList.add('done'); pad.textContent = '🪷';
      await W(my, hop(i, i + 1)); await W(my, say(praise(), ans));
      if (i === n - 1) { await W(my, hop(i + 1, i + 2)); await W(my, say(P.frogHome)); }
    });
};

/* ---------- ⏱️ 快快算：練習（不計時，10 題）或挑戰（60 秒，答對幾題） ---------- */
function quickScreen(G, my) {
  S.qbest = S.qbest || {};
  const lv = G.lv.includes(S.glv.quick) ? S.glv.quick : G.lv[0], mode = S.qmode === 'time' ? 'time' : 'practice';
  $('#ltag').textContent = `${G.e} ${G.t}`; $('#ltag').classList.remove('hide');
  const best = S.qbest[lv] || 0;
  view.innerHTML = `<div class="gwrap quick"><div class="gtop"><div class="lvls">${G.lv.map(l => `<button class="chip ${l === lv ? 'on' : ''}" data-lv="${l}">${LVNAME[l]}</button>`).join('')}</div>
      <div class="lvls"><button class="chip ${mode === 'practice' ? 'on' : ''}" data-md="practice">🐢 練習（不計時）</button><button class="chip ${mode === 'time' ? 'on' : ''}" data-md="time">⏱️ 挑戰 60 秒</button>${best ? `<span class="chip">🏆 最高 ${best} 題</span>` : ''}</div></div>
    <div class="qstat"><span class="qscore">✔ 0</span><div class="qbar ${mode === 'time' ? '' : 'hide'}"><i></i></div><span class="qleft"></span></div>
    <div class="frow"><div class="card bigeq qcard"><div class="eqhost"></div></div><div class="opts qopts"></div></div></div>`;
  view.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { S.glv.quick = b.dataset.lv; save(); go('game', 'quick'); });
  view.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { S.qmode = b.dataset.md; save(); go('game', 'quick'); });
  runQuick(G, lv, mode, my).catch(e => { if (e !== STOP) console.error(e); });
}
async function runQuick(G, lv, mode, my) {
  const list = gList(lv), host = view.querySelector('.eqhost'), opts = view.querySelector('.qopts'), sc = view.querySelector('.qscore'), left = view.querySelector('.qleft'), bar = view.querySelector('.qbar i');
  const hi = lv === 'add20' ? 20 : 10, TOTAL = 10, SEC = 60;
  let score = 0, last = null, t0 = 0, over = false, quickWake = null;
  if (!S.rounds['g:quick']) await W(my, say(P.gIntro.quick));
  await W(my, say(P.quickGo));
  t0 = performance.now();
  const timer = mode === 'time' ? setInterval(() => {
    if (my !== sess) return clearInterval(timer);
    const p = Math.min(1, (performance.now() - t0) / (SEC * 1000)); bar.style.width = (100 - p * 100) + '%';
    if (p >= 1) { over = true; clearInterval(timer); opts.classList.add('dim'); if (quickWake) quickWake(); }
  }, 200) : null;
  for (let k = 0; mode === 'time' ? !over : k < TOTAL; k++) {
    const q = wpick(list.filter(x => x !== last), x => `g:quick:${pkey(x)}`); last = q;
    host.innerHTML = eqHTML(q.a, q.op, q.b);
    opts.innerHTML = numOpts(q.r, 0, hi, 4, 3).map(v => numBtn(v)).join('');
    if (mode === 'practice') left.textContent = `${k + 1} / ${TOTAL}`;
    const btns = [...opts.querySelectorAll('.num')];
    if (mode === 'practice') say(askLine(q));
    T.right = () => btns.find(b => +b.dataset.v === q.r); T.wrong = () => btns.find(b => +b.dataset.v !== q.r);
    const res = await new Promise(resolve => {
      let first = true, busy = false;
      quickWake = () => resolve(null);
      btns.forEach(b => b.onclick = async () => {
        if (busy || over) return;
        if (+b.dataset.v === q.r) {
          busy = true; chime(true); b.classList.add('ok'); fillEq(host, q.r);
          if (mode === 'practice') { try { await W(my, say(praise())); } catch (e) { return; } } else await sleep(250);
          resolve(first);
        } else {
          chime(false); b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
          if (!first) return;
          first = false;
          const r = btns.find(x => +x.dataset.v === q.r); r.classList.add('glow');
          if (mode === 'practice') say(ansLine(q));
        }
      });
    });
    live(my);
    if (res === null) break;
    mark(`g:quick:${pkey(q)}`, res);
    if (res) { score++; sc.textContent = '✔ ' + score; sc.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], 300); }
  }
  if (timer) clearInterval(timer);
  live(my);
  const lines = mode === 'time' ? [P.timeUp, P.quickScore(Math.min(60, score))] : [P.quickScore(score)];
  let nb = false;
  if (mode === 'time') { S.qbest = S.qbest || {}; if (score > (S.qbest[lv] || 0)) { nb = (S.qbest[lv] || 0) > 0; S.qbest[lv] = score; } save(); }
  if (nb) lines.push(P.newBest);
  await W(my, say(...lines));
  S.rounds['g:quick'] = (S.rounds['g:quick'] || 0) + 1; save();
  finishRound('g:quick', () => go('game', 'quick'));
}

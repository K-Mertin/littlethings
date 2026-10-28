// 123 小島：第 5 段的課（47–64）。用 index.html 裡的共用元件（say、choose、counter、trayHTML、simpleAsk…）
'use strict';
const { SHAPES } = M;

/* ---------- 47：拿拿看（小白說幾個，就拿幾個放進籃子） ---------- */
GEN[47] = {
  plan: n => planNums(n, range(1, 10), v => `47:${v}`).map(v => ({ n: v, it: pick(FOOD) })),
  key: q => q.n, again: q => ({ ...q, it: pick(FOOD) }),
  async ask(q, c) {
    const { my } = c, { n, it } = q;
    const short = view.clientHeight < 420, size = Math.max(30, Math.min(84, tall() ? fitCols(5, 4, 420, 40) : short ? Math.floor((view.clientHeight - 90) / 2.5) : fitCols(8, 2, 300, 120)));
    const qa = frame({
      main: `<div class="take"><div class="card"><div class="tlab">${n}</div>${trayHTML(it, 10, { cols: 5, cells: 10, size })}</div>
        <div class="basket card"><div class="bk2">🧺 <b class="bsum">0</b></div><div class="bin" style="--s:${Math.round(size * .7)}px"></div></div></div>`,
      opts: `<button class="say" id="done">✔ 好了</button>`,
    }, c.dots, short);
    const pile = objsIn(qa.querySelector('.tray')), bin = qa.querySelector('.bin'), bsum = qa.querySelector('.bsum'), done = qa.querySelector('#done');
    let got = 0, busy = false, first = true;
    const take = el => {
      if (busy || el.classList.contains('gone2')) return;
      el.classList.add('gone2'); got++; bsum.textContent = got;
      const p = h(`<button class="pc" aria-label="拿回來">${it.e}</button>`); p._src = el; bin.appendChild(p);
      p.onclick = () => { if (busy) return; p.remove(); el.classList.remove('gone2'); got--; bsum.textContent = got; };
      blip(CN(got));
    };
    const back = () => { const p = bin.lastElementChild; if (!p) return; p._src.classList.remove('gone2'); p.remove(); got--; bsum.textContent = got; };
    pile.forEach(el => el.onclick = () => take(el));
    T.right = () => got < n ? pile.find(e => !e.classList.contains('gone2')) : done;
    T.wrong = () => got !== n ? done : pile.find(e => !e.classList.contains('gone2')) || null;
    preload(P.takeQ(it, n), P.total(it, n), P.takeFew, P.takeMany, ...range(1, n).map(CN));
    if (c.intro) await W(my, say(c.intro));
    await W(my, say(P.takeQ(it, n)));
    if (TEACH) {
      await W(my, say(P.watchMe)); busy = false;
      for (let i = 0; i < n; i++) { take(pile[i]); await W(my, sleep(650)); }
      await W(my, say(P.total(it, n))); done.classList.add('glow');
    }
    return new Promise((resolve, reject) => {
      done.onclick = async () => {
        if (busy) return; busy = true;
        try {
          done.classList.remove('glow');
          if (got === n) { chime(true); await W(my, say(praise(), P.total(it, n))); resolve(first); return; }
          first = false; chime(false);
          if (got < n) await W(my, say(P.takeFew));
          else { const s = say(P.takeMany); while (got > n) { back(); await W(my, sleep(260)); } await W(my, s); }
          busy = false;
        } catch (e) { reject(e); }
      };
    });
  },
};

/* ---------- 48：數字比大小 ---------- */
GEN[48] = {
  plan(n) {
    return range(0, n - 1).map(i => {
      const t = i % 2 ? 'small' : 'big', gap = i < 2 ? 2 : 1;
      let a, b; do { a = 1 + rand(10); b = 1 + rand(10); } while (Math.abs(a - b) < gap);
      return { t, a, b };
    });
  },
  key: q => `${q.t}${Math.max(q.a, q.b)}-${Math.min(q.a, q.b)}`,
  again: q => ({ ...q, a: q.b, b: q.a }),
  ask(q, c) {
    const { a, b, t } = q, big = Math.max(a, b), small = Math.min(a, b), r = t === 'big' ? big : small;
    const sz = Math.min(26, Math.floor((Math.min(view.clientWidth, 900) - 120) / 2 / 5 / 1.3));
    const card = v => `<button class="num cmpn" data-v="${v}"><span>${v}</span>${trayHTML(DOT, v, { cols: 5, cells: v, static: true, small: true, size: sz })}</button>`;
    const why = t === 'big' ? P.moreThan(big, small) : P.lessThan(small, big);
    return simpleAsk(q, c, {
      main: '', opts: card(a) + card(b), r, side: false,
      ask: [t === 'big' ? P.bigQ : P.smallQ], ans: why,
      after: qa => qa.querySelector('.main').remove(),
      demo: async qa => { for (const bt of qa.querySelectorAll('.cmpn')) { await counter(objsIn(bt)).demo(c.my); await W(c.my, sleep(250)); } },
      undo: qa => qa.querySelectorAll('.cmpn .cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};

/* ---------- 49：第幾個（從旗子這邊數） ---------- */
const QUEUE = ['🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐷', '🐮', '🐵', '🐔', '🦊', '🐨'];
GEN[49] = {
  plan: n => range(0, n - 1).map(i => { const len = i < 3 ? 5 : 5 + rand(3); return { len, n: 1 + rand(i < 3 ? 5 : len) }; }),
  key: q => q.n, again: q => ({ ...q }),
  async ask(q, c) {
    const { my } = c, ans = shuffle(QUEUE).slice(0, q.len);
    const size = Math.max(40, Math.min(96, Math.floor((Math.min(view.clientWidth, 1100) - 100) / q.len) - 10));
    const qa = frame({ main: `<div class="queue card"><span class="flag">🚩</span>${ans.map((e, i) => `<button class="ob qa2" data-i="${i + 1}" style="--s:${size}px">${e}<span class="bd"></span></button>`).join('')}</div>` }, c.dots, false);
    const btns = [...qa.querySelectorAll('.qa2')];
    preload(P.ordQ(q.n), ...range(1, q.n).map(P.ord));
    if (c.intro) await W(my, say(c.intro));
    say(P.ordQ(q.n));
    const walk = async (talk) => {
      for (let i = 0; i < q.n; i++) { btns[i].classList.add('cnt'); btns[i].querySelector('.bd').textContent = i + 1; if (talk) { stopAll(); await W(my, play(P.ord(i + 1))); await W(my, sleep(160)); } }
    };
    const unwalk = () => btns.forEach(b => b.classList.remove('cnt'));
    return choose(my, btns, x => +x.dataset.i === q.n,
      async () => { await say(P.together); await walk(true); unwalk(); say(P.tapGlow); },
      async () => { await walk(false); await say(praise()); });
  },
};

/* ---------- 50：倒著數（火箭倒數） ---------- */
GEN[50] = {
  plan: n => shuffle(['next', 'next', 'next', 'missing', 'missing', 'missing']).slice(0, n).map(t => {
    const len = 5, s = len - 1 + rand(10 - len + 2);   // 最大的數 4…10
    return { t, s, len, gap: t === 'next' ? len - 1 : 1 + rand(len - 2) };
  }),
  key: q => q.t, again: q => GEN[50].plan(6).find(x => x.t === q.t) || q,
  async ask(q, c) {
    const { my } = c, nums = range(0, q.len - 1).map(i => q.s - i), ans = nums[q.gap];
    const qa = frame({
      main: `<div class="train back">${nums.map((v, i) => `<span class="car ${i === q.gap ? 'blank' : ''}">${i === q.gap ? '?' : v}</span>`).join('')}<span class="loco rocket">🚀</span></div>`,
      opts: numOpts(ans, 0, 10, 3, 2).map(v => numBtn(v)).join(''),
    }, c.dots, false);
    const cars = [...qa.querySelectorAll('.car')], btns = [...qa.querySelectorAll('.num')];
    const prompt = q.t === 'next' ? P.backNext : P.backMiss;
    preload(prompt, P.liftoff, ...nums.map(CN));
    if (c.intro) await W(my, say(c.intro));
    say(prompt);
    const fill = () => { cars[q.gap].textContent = ans; cars[q.gap].classList.remove('blank'); };
    return choose(my, btns, b => +b.dataset.v === ans,
      async () => {
        await say(P.together);
        for (let i = 0; i < cars.length; i++) { cars[i].classList.add('cnt'); if (i === q.gap) fill(); stopAll(); await W(my, play(CN(nums[i]))); await W(my, sleep(150)); }
        cars.forEach(x => x.classList.remove('cnt')); cars[q.gap].textContent = '?'; cars[q.gap].classList.add('blank'); say(P.tapGlow);
      },
      async () => {
        fill();
        if (ans <= 1 || q.t === 'next') { qa.querySelector('.rocket').classList.add('fly'); await say(praise(), P.liftoff); }
        else await say(praise());
      });
  },
};

/* ---------- 51：聽聽有幾下（小白敲鼓） ---------- */
function drum() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(55, t + .25);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .32);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .35);
  const len = Math.floor(c.sampleRate * .06), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const nz = c.createBufferSource(), ng = c.createGain(); nz.buffer = buf; ng.gain.value = .18; nz.connect(ng); ng.connect(c.destination); nz.start(t);
}
GEN[51] = {
  plan: n => range(0, n - 1).map(i => ({ n: i < 3 ? 1 + rand(5) : 2 + rand(7) })),
  key: q => q.n, again: q => ({ ...q }),
  async ask(q, c) {
    const { my } = c;
    const qa = frame({ main: `<div class="drumbox card"><button class="drum" aria-label="再聽一次">🥁</button><div class="beats">${range(1, q.n).map(() => `<span class="beat"><span class="bd"></span></span>`).join('')}</div></div>`, opts: opts3(q.n, 1, 8, 2) }, c.dots);
    const dr = qa.querySelector('.drum'), beats = [...qa.querySelectorAll('.beat')];
    let playing = false;
    const hit = async (show, talk) => {
      playing = true;
      try {
        for (let i = 0; i < q.n; i++) {
          drum(); dr.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18) rotate(-6deg)' }, { transform: 'scale(1)' }], 220);
          if (show) { beats[i].classList.add('on', 'cnt'); beats[i].querySelector('.bd').textContent = i + 1; }
          if (talk) { stopAll(); await W(my, play(CN(i + 1))); await W(my, sleep(200)); } else await W(my, sleep(650));
        }
      } finally { playing = false; }
    };
    dr.onclick = () => { if (!playing) hit(false, false).catch(() => {}); };
    preload(P.drumQ, P.drumA(q.n), ...range(1, q.n).map(CN));
    if (c.intro) await W(my, say(c.intro));
    await W(my, say(P.drumQ)); await W(my, sleep(300));
    await hit(false, false);
    return simpleChoose(my, qa, q.n, P.drumA(q.n),
      async () => { await say(P.together); await hit(true, true); await say(P.drumA(q.n)); beats.forEach(b => b.classList.remove('on', 'cnt')); say(P.tapGlow); },
      async () => { beats.forEach(b => b.classList.add('on')); await say(praise(), P.drumA(q.n)); });
  },
};
// 數字選項的 choose（題目已經念過）
function simpleChoose(my, qa, r, ans, onWrong, onRight) {
  return choose(my, [...qa.querySelectorAll('.opts .num')], x => +x.dataset.v === r, onWrong, onRight || (async () => { await say(praise(), ans); }));
}

/* ---------- 52：認識形狀 ---------- */
const SCOL = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ff922b'];
function shapeSVG(s, col, o = {}) {
  const rot = o.rot || 0, k = o.k || 1;
  const body = {
    圓形: `<circle cx="50" cy="50" r="${40 * k}"/>`,
    三角形: o.right ? `<polygon points="${50 - 40 * k},${50 + 36 * k} ${50 + 40 * k},${50 + 36 * k} ${50 - 40 * k},${50 - 40 * k}"/>` : `<polygon points="50,${50 - 42 * k} ${50 + 44 * k},${50 + 36 * k} ${50 - 44 * k},${50 + 36 * k}"/>`,
    正方形: `<rect x="${50 - 36 * k}" y="${50 - 36 * k}" width="${72 * k}" height="${72 * k}" rx="3"/>`,
    長方形: o.tallRect ? `<rect x="${50 - 22 * k}" y="${50 - 44 * k}" width="${44 * k}" height="${88 * k}" rx="3"/>` : `<rect x="${50 - 46 * k}" y="${50 - 23 * k}" width="${92 * k}" height="${46 * k}" rx="3"/>`,
  }[s];
  return `<svg viewBox="0 0 100 100" class="shp"><g fill="${col}" stroke="rgba(0,0,0,.25)" stroke-width="3" stroke-linejoin="round" transform="rotate(${rot} 50 50)">${body}</g></svg>`;
}
const shapeVar = s => ({ rot: s === '圓形' ? 0 : pick([0, 0, -12, 12, s === '三角形' ? 180 : 0]), k: pick([.8, .9, 1]), right: s === '三角形' && Math.random() < .3, tallRect: s === '長方形' && Math.random() < .3 });
GEN[52] = {
  plan(n) {
    const out = []; let last = null;
    for (let i = 0; i < n; i++) {
      const s = wpick(SHAPES.filter(x => x !== last), x => `52:${x}`); last = s;
      out.push({ s, t: i % 2 && i > 0 ? 'count' : 'find', n: 1 + rand(i < 3 ? 4 : 6) });
    }
    return out;
  },
  key: q => q.s, again: q => ({ ...q }),
  async ask(q, c) {
    const { my } = c, { s } = q;
    if (q.t === 'find') {
      const others = shuffle(SHAPES.filter(x => x !== s)).slice(0, 2), all = shuffle([s, ...others]);
      const qa = frame({ main: '', opts: all.map(x => `<button class="num shb" data-s="${x}" aria-label="${x}">${shapeSVG(x, pick(SCOL), shapeVar(x))}</button>`).join('') }, c.dots, false);
      qa.querySelector('.main').remove();
      const btns = [...qa.querySelectorAll('.shb')];
      preload(P.shapeQ(s), P.shapeIs(s), P.shapeTip[s], ...others.map(P.shapeIs));
      if (c.intro) await W(my, say(c.intro));
      say(P.shapeQ(s));
      return choose(my, btns, b => b.dataset.s === s,
        async b => {
          if (b.dataset.s !== s) await say(P.shapeIs(b.dataset.s));
          const r = btns.find(x => x.dataset.s === s); r.classList.add('cnt2');
          await say(P.shapeIs(s), P.shapeTip[s]); r.classList.remove('cnt2'); say(P.tapGlow);
        },
        async () => { await say(praise(), P.shapeTip[s]); });
    }
    // 數一數有幾個（圖上混著別的形狀）
    const items = shuffle([...range(1, q.n).map(() => s), ...range(1, 2 + rand(4)).map(() => pick(SHAPES.filter(x => x !== s)))]);
    const cols = Math.min(5, items.length), sz = Math.min(96, fitCols(cols, Math.ceil(items.length / cols), 330, 40));
    const qa = frame({
      main: `<div class="card shapes" style="--cols:${cols}">${items.map(x => `<span class="ob shp2 ${x === s ? 'tg' : ''}" style="--s:${sz}px">${shapeSVG(x, pick(SCOL), shapeVar(x))}<span class="bd"></span></span>`).join('')}</div>`,
      opts: opts3(q.n, 0, 7, 2),
    }, c.dots);
    const tg = [...qa.querySelectorAll('.shp2.tg')];
    preload(P.shapeCntQ(s), P.shapeCntA(s, q.n));
    if (c.intro) await W(my, say(c.intro));
    say(P.shapeCntQ(s));
    return simpleChoose(my, qa, q.n, P.shapeCntA(s, q.n),
      async () => { await say(P.together); await counter(tg).demo(my); await say(P.shapeCntA(s, q.n)); tg.forEach(e => e.classList.remove('cnt')); say(P.tapGlow); });
  },
};

/* ---------- 53：找規律 ---------- */
const UNITS = ['AB', 'AB', 'AAB', 'ABB', 'ABC'];
GEN[53] = {
  plan: n => range(0, n - 1).map(i => {
    const u = i < 2 ? 'AB' : pick(UNITS), kinds = shuffle(SHAPES).slice(0, 3), cols = shuffle(SCOL).slice(0, 3);
    return { u, kinds, cols, t: i % 3 === 2 ? 'miss' : 'next' };
  }),
  key: q => q.u, again: q => ({ ...q, kinds: shuffle(q.kinds) }),
  async ask(q, c) {
    const { my } = c, idx = { A: 0, B: 1, C: 2 };
    const len = q.u.length * 2 + (q.u.length === 2 ? 2 : 1);   // 至少重複兩次，再多一點
    const seq = range(0, len).map(i => idx[q.u[i % q.u.length]]);   // 最後一個是答案（下一個）
    const gap = q.t === 'next' ? len : q.u.length + rand(q.u.length);
    const piece = k => shapeSVG(q.kinds[k], q.cols[k]);
    const shown = q.t === 'next' ? seq.slice(0, len) : seq.slice(0, len);
    const ans = seq[gap];
    const choices = shuffle([...new Set([ans, ...shuffle([0, 1, 2]).filter(x => x !== ans)])].slice(0, 3));
    const sz = Math.max(34, Math.min(84, Math.floor((Math.min(view.clientWidth, 1100) - 70) / (shown.length + (q.t === 'next' ? 1 : 0)) - 8)));
    const qa = frame({
      main: `<div class="pat card" style="--s:${sz}px">${shown.map((k, i) => i === gap ? `<span class="pp qm">?</span>` : `<span class="pp" data-k="${k}">${piece(k)}</span>`).join('')}${q.t === 'next' ? `<span class="pp qm">?</span>` : ''}</div>`,
      opts: choices.map(k => `<button class="num shb" data-k="${k}" aria-label="${q.kinds[k]}">${piece(k)}</button>`).join(''),
    }, c.dots, false);
    const pps = [...qa.querySelectorAll('.pp')], btns = [...qa.querySelectorAll('.shb')], hole = qa.querySelector('.pp.qm');
    const prompt = q.t === 'next' ? P.patQ : P.patMissQ;
    preload(prompt, P.patRepeat, ...q.kinds);
    if (c.intro) await W(my, say(c.intro));
    say(prompt);
    const fill = () => { hole.innerHTML = piece(ans); hole.classList.remove('qm'); hole.classList.add('filled'); };
    return choose(my, btns, b => +b.dataset.k === ans,
      async () => {
        await say(P.together);
        const all = q.t === 'next' ? [...pps] : pps;
        for (let i = 0; i < all.length; i++) {
          const el = all[i], k = i === gap || (q.t === 'next' && i === all.length - 1) ? ans : +el.dataset.k;
          if (el === hole) fill();
          el.classList.add('cnt'); el.classList.toggle('band', Math.floor(i / q.u.length) % 2 === 1);
          stopAll(); await W(my, play(q.kinds[k])); await W(my, sleep(100));
        }
        await say(P.patRepeat);
        pps.forEach(e => e.classList.remove('cnt', 'band')); hole.innerHTML = '?'; hole.classList.add('qm'); hole.classList.remove('filled'); say(P.tapGlow);
      },
      async () => { fill(); await say(praise(), P.patRepeat); });
  },
};

/* ---------- 54：認識時鐘（整點） ---------- */
function clockHTML(h, o = {}) {
  const nums = range(1, 12).map(i => {
    const a = i / 12 * Math.PI * 2, x = 50 + Math.sin(a) * 39, y = 50 - Math.cos(a) * 39;
    return `<${o.tap ? 'button' : 'span'} class="cn" data-v="${i}" style="left:${x}%;top:${y}%">${i}</${o.tap ? 'button' : 'span'}>`;
  }).join('');
  return `<div class="clock"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#fff" stroke="#f08a24" stroke-width="3"/>
    ${range(0, 59).map(i => { const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 45 : 43; return `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * 46.5}" y2="${50 - Math.cos(a) * 46.5}" stroke="#c9b28f" stroke-width="${i % 5 ? .6 : 1.4}"/>`; }).join('')}
    <g class="mh"><line x1="50" y1="54" x2="50" y2="13" stroke="#4dabf7" stroke-width="3" stroke-linecap="round"/></g>
    <g class="hh" style="transform:rotate(${h * 30}deg)"><line x1="50" y1="55" x2="50" y2="26" stroke="#e8590c" stroke-width="5.5" stroke-linecap="round"/></g>
    <circle cx="50" cy="50" r="3.5" fill="#4a3322"/></svg>${nums}</div>`;
}
GEN[54] = {
  plan: n => planNums(n, range(1, 12), v => `54:${v}`).map((h, i) => ({ h, t: i % 3 === 2 ? 'set' : 'read' })),
  key: q => `${q.t}${q.h}`, again: q => ({ ...q }),
  async ask(q, c) {
    const { my } = c, { h: hr } = q;
    if (q.t === 'read') {
      const opts = numOpts(hr, 1, 12, 3, 3);
      const qa = frame({ main: clockHTML(hr), opts: opts.map(v => numBtn(v)).join('') }, c.dots);
      const hh = qa.querySelector('.hh'), cn = [...qa.querySelectorAll('.cn')];
      preload(P.clockQ, P.clockA(hr), P.clockHint);
      if (c.intro) await W(my, say(c.intro));
      say(P.clockQ);
      return simpleChoose(my, qa, hr, P.clockA(hr),
        async () => {
          qa.querySelector('.mh').classList.add('hl'); await say(P.clockHint);
          hh.classList.add('hl'); cn[hr - 1].classList.add('on'); await say(P.clockA(hr));
          hh.classList.remove('hl'); qa.querySelector('.mh').classList.remove('hl'); cn[hr - 1].classList.remove('on'); say(P.tapGlow);
        });
    }
    // 撥時鐘：點鐘面上的數字，短針就轉過去
    let at = hr; while (at === hr) at = 1 + rand(12);
    const qa = frame({ main: clockHTML(at, { tap: true }) }, c.dots, false);
    const hh = qa.querySelector('.hh'), cn = [...qa.querySelectorAll('.cn')];
    const turn = v => { hh.style.transform = `rotate(${v * 30}deg)`; };
    preload(P.setQ(hr), P.clockA(hr), P.clockHint);
    if (c.intro) await W(my, say(c.intro));
    say(P.setQ(hr));
    return choose(my, cn, b => +b.dataset.v === hr,
      async b => { turn(+b.dataset.v); await W(my, sleep(500)); await say(P.clockHint); turn(hr); cn[hr - 1].classList.add('on'); await W(my, sleep(500)); await say(P.clockA(hr)); cn[hr - 1].classList.remove('on'); turn(at); say(P.tapGlow); },
      async () => { turn(hr); await W(my, sleep(400)); await say(praise(), P.clockA(hr)); });
  },
};

/* ---------- 55：變一樣多（下面放到和上面一樣多） ---------- */
GEN[55] = {
  plan: n => planPairs(55, n, pairs((a, b) => a >= 3 && a <= 8 && b >= 1 && b < a), q => `${q.a}-${q.b}`),
  key: q => `${q.a}-${q.b}`,
  async ask(q, c) {
    const { my } = c, { a, b } = q, [x, y] = pick(PAIRS), cells = Math.min(10, a + 2), size = Math.min(70, fitCols(cells, 2, 380, 40));
    const row = (e, n, cls) => `<div class="mrow ${cls}" style="--s:${size}px">${range(0, cells - 1).map(i => i < n ? `<span class="ob">${e}<span class="bd"></span></span>` : `<span class="ob empty"></span>`).join('')}</div>`;
    const qa = frame({
      main: `<div class="card match">${row(x, a, 'top')}${row(y, b, 'bot')}</div>`,
      opts: `<button class="num pm" data-a="-" aria-label="拿走一個">−</button><button class="num pm" data-a="+" aria-label="放一個">+</button><button class="say" id="done">✔ 好了</button>`,
    }, c.dots, false);
    const bot = [...qa.querySelectorAll('.bot .ob')], top = objsIn(qa.querySelector('.top'));
    const plus = qa.querySelector('[data-a="+"]'), minus = qa.querySelector('[data-a="-"]'), done = qa.querySelector('#done');
    let n = b, busy = false, first = true;
    const setN = k => { n = Math.max(0, Math.min(cells, k)); bot.forEach((o, i) => { const on = i < n; if (on === !o.classList.contains('empty')) return; o.classList.toggle('empty', !on); o.classList.remove('cnt', 'paired'); o.innerHTML = on ? `${y}<span class="bd"></span>` : ''; }); };
    plus.onclick = () => { if (busy || n >= cells) return; setN(n + 1); blip(CN(n)); };
    minus.onclick = () => { if (busy || n <= 0) return; setN(n - 1); };
    T.right = () => n < a ? plus : n > a ? minus : done; T.wrong = () => n !== a ? done : plus;
    preload(P.sameQ, P.equalOk, P.notYet, P.takeMany);
    if (c.intro) await W(my, say(c.intro));
    await W(my, say(P.sameQ));
    const pairUp = async () => { for (let i = 0; i < Math.min(a, n); i++) { top[i].classList.add('paired'); bot[i].classList.add('paired'); await W(my, sleep(160)); } };
    const unpair = () => qa.querySelectorAll('.paired').forEach(e => e.classList.remove('paired'));
    if (TEACH) {
      await W(my, say(P.watchMe)); await pairUp(); unpair();
      for (let k = n; k < a; k++) { setN(k + 1); bot[k].classList.add('cnt'); bot[k].querySelector('.bd').textContent = k - b + 1; stopAll(); await W(my, play(CN(k - b + 1))); await W(my, sleep(200)); }
      await W(my, say(P.diffA(a - b))); done.classList.add('glow');
    }
    return new Promise((resolve, reject) => {
      done.onclick = async () => {
        if (busy) return; busy = true;
        try {
          done.classList.remove('glow');
          if (n === a) { chime(true); await pairUp(); await W(my, say(P.equalOk)); resolve(first); return; }
          first = false; chime(false); await pairUp();
          if (n < a) await W(my, say(P.notYet)); else { await W(my, say(P.takeMany)); while (n > a) { setN(n - 1); await W(my, sleep(260)); } }
          unpair(); busy = false;
        } catch (e) { reject(e); }
      };
    });
  },
};

/* ---------- 56：分合圖 ---------- */
GEN[56] = {
  plan: n => planPairs(56, n, pairs((a, b) => a >= 1 && b >= 1 && a + b >= 3 && a + b <= 10), q => `${q.a}+${q.b}`).map(q => ({ ...q, side: rand(2) })),
  key: q => `${q.a}+${q.b}`, again: q => ({ ...q, side: 1 - q.side }),
  ask(q, c) {
    const n = q.a + q.b, known = q.side ? q.b : q.a, hid = n - known;
    const sz = Math.min(40, Math.floor((Math.min(view.clientWidth, 900) - 80) / 10 - 6));
    const part = (v, isQ) => `<div class="bpart ${isQ ? 'q' : ''}">${isQ ? '?' : v}</div>`;
    return simpleAsk(q, c, {
      main: `<div class="card bond"><div class="btop">${n}</div><svg class="blines" viewBox="0 0 100 30" preserveAspectRatio="none"><line x1="50" y1="0" x2="20" y2="30"/><line x1="50" y1="0" x2="80" y2="30"/></svg>
        <div class="bparts">${q.side ? part(hid, true) + part(known) : part(known) + part(hid, true)}</div><div class="bdots">${trayHTML(DOT, n, { cols: n, cells: n, static: true, small: true, size: sz })}</div></div>`,
      opts: opts3(hid, 0, 10), r: hid, ask: [P.bondQ(n, known)], ans: P.bondA(n, known, hid),
      after: qa => qa.querySelector('.bpart.q').setAttribute('data-r', ''),
      demo: async qa => {
        const ds = objsIn(qa.querySelector('.bdots'));
        for (let i = 0; i < known; i++) { ds[i].classList.add('paired'); await W(c.my, sleep(150)); }
        await counter(ds.slice(known)).demo(c.my);
      },
      undo: qa => qa.querySelectorAll('.bdots .paired, .bdots .cnt').forEach(e => e.classList.remove('paired', 'cnt')),
    });
  },
};

/* ---------- 57：接著數（盒子裡的不用再數） ---------- */
GEN[57] = {
  plan: n => planPairs(57, n, pairs((a, b) => a >= 3 && a <= 9 && b >= 1 && b <= 3), q => `${q.a}+${q.b}`).map(q => ({ ...q, it: pickItem({ box: true }) })),
  key: q => `${q.a}+${q.b}`, again: q => ({ ...q, it: pickItem({ box: true }) }),
  ask(q, c) {
    const { a, b, it } = q, r = a + b, size = Math.min(90, fitCols(b + 3, 1, 330, 60));
    return simpleAsk(q, c, {
      main: `<div class="card pe onbox"><div class="cbox" style="--s:${size}px"><span class="lid2">${a}</span><span class="bd"></span></div><i class="op">+</i>${grp(it, b, size, 3)}</div>`,
      opts: opts3(r, 1, 13), r, side: false, ask: [P.onQ(a)], ans: P.allC('顆', r),
      demo: async qa => {
        const bx = qa.querySelector('.cbox'); bx.classList.add('cnt'); bx.querySelector('.bd').textContent = a; stopAll(); await W(c.my, play(CN(a))); await W(c.my, sleep(200));
        await counter(objsIn(qa.querySelector('.grp')), { base: a }).demo(c.my);
      },
      undo: qa => qa.querySelectorAll('.cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};

/* ---------- 58：骰子加法 ---------- */
const diceHTML = n => `<div class="dice">${range(0, 8).map(i => DICE[n].includes(i) ? `<span class="pip"><span class="bd"></span></span>` : '<span></span>').join('')}</div>`;
GEN[58] = {
  plan: n => planPairs(58, n, pairs((a, b) => a >= 1 && a <= 6 && b >= 1 && b <= 6 && (a + b <= 10 || a >= 6)), q => `${q.a}+${q.b}`),
  key: q => `${q.a}+${q.b}`,
  ask(q, c) {
    const { a, b } = q, r = a + b;
    return simpleAsk(q, c, {
      main: `<div class="card story"><div class="pe twod">${diceHTML(a)}<i class="op">+</i>${diceHTML(b)}</div>${eqHTML(a, '+', b)}</div>`,
      opts: opts3(r, 2, 12), r, ask: [P.eqQ(a, '+', b)], ans: P.eqA(a, '+', b, r),
      demo: async qa => { const ds = qa.querySelectorAll('.dice'); await counter([...ds[0].querySelectorAll('.pip')]).demo(c.my); await counter([...ds[1].querySelectorAll('.pip')], { base: a }).demo(c.my); },
      undo: qa => qa.querySelectorAll('.pip.cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};

/* ---------- 59：算對了嗎（孩子當老師） ---------- */
const within10 = [...pairs((a, b) => a >= 1 && b >= 1 && a + b <= 10).map(p => ({ ...p, op: '+' })), ...pairs((a, b) => a >= 2 && b >= 1 && b < a && a <= 10).map(p => ({ ...p, op: '-' }))];
GEN[59] = {
  plan: n => planPairs(59, n, within10, q => `${q.a}${q.op}${q.b}`).map((q, i) => {
    const r = calc(q.a, q.op, q.b); let s = r;
    if (i % 2 === 0 || Math.random() < .3) { const d = pick([-2, -1, 1, 1, 2]); s = r + d < 0 ? r + 1 : r + d; }
    return { ...q, s };
  }),
  key: q => `${q.a}${q.op}${q.b}`, again: q => ({ ...q }),
  async ask(q, c) {
    const { my } = c, { a, b, op, s } = q, r = calc(a, op, b), good = s === r;
    const qa = frame({
      main: `<div class="card bigeq"><div class="eq"><span>${a}</span><i>${OPS[op]}</i><span>${b}</span><i>=</i><span class="sv">${s}</span></div><div class="dotsrow"></div></div>`,
      opts: `<button class="num tf" data-v="1" aria-label="對">⭕</button><button class="num tf" data-v="0" aria-label="不對">❌</button>`,
    }, c.dots);
    const btns = [...qa.querySelectorAll('.tf')];
    const ans = [good ? P.tfYes : P.tfNo, P.eqA(a, op, b, r)];
    preload(P.tfQ, ...ans);
    if (c.intro) await W(my, say(c.intro));
    say(P.tfQ);
    const fix = () => { if (!good) { const sv = qa.querySelector('.sv'); sv.textContent = r; sv.classList.add('fixed'); } };
    return choose(my, btns, x => (x.dataset.v === '1') === good,
      async () => {
        await say(P.together);
        const row = qa.querySelector('.dotsrow'), size = Math.min(52, sizeFor(10, 10, .9, 420));
        row.innerHTML = op === '+' ? `${grp(DOT, a, size, 10)}<i class="op">+</i>${grp(DOT2, b, size, 10)}` : grp(DOT, a, size, 10);
        const objs = objsIn(row);
        if (op === '-') { for (const x of objs.slice(a - b).reverse()) { x.classList.add('gone'); await W(my, sleep(180)); } await counter(objs.slice(0, r)).demo(my); }
        else await counter(objs).demo(my);
        await say(...ans); row.innerHTML = ''; say(P.tapGlow);
      },
      async () => { fix(); await say(praise(), ...ans); });
  },
};

/* ---------- 60：哪個算式（看圖找算式） ---------- */
GEN[60] = {
  plan: n => planPairs(60, n, within10.filter(q => q.op === '+' || q.a - q.b >= 1), q => `${q.a}${q.op}${q.b}`).map(q => ({ ...q, it: pickItem({ story: true }) })),
  key: q => `${q.a}${q.op}${q.b}`, again: q => ({ ...q, it: pickItem({ story: true }) }),
  async ask(q, c) {
    const { my } = c, { a, b, op, it } = q, r = calc(a, op, b);
    const ok = (x, o, y) => x >= 0 && y >= 0 && (o === '+' ? x + y <= 10 : y <= x) && !(x === a && o === op && y === b);
    const cand = shuffle([[a, op === '+' ? '-' : '+', b], [a, op, b + 1], [a, op, b - 1], [a + 1, op, b], [a - 1, op, b], [b, '+', a]]).filter(([x, o, y]) => ok(x, o, y) && !(op === '+' && o === '+' && x + y === r && x === b && y === a));
    const opts = shuffle([[a, op, b, 1], ...cand.slice(0, 2).map(e => [...e, 0])]);
    const ncol = op === '+' ? Math.min(5, a) + Math.min(5, b) : Math.min(5, a);
    const size = fitCols(ncol, Math.ceil(Math.max(a, op === '+' ? b : 0) / 5), 400, op === '+' ? 80 : 40);
    const pics = op === '+' ? `<div class="pe">${grp(it, a, size)}<span class="gap2"></span>${grp(it, b, size, 5, 'two')}</div>` : `<div class="pe">${grp(it, a, size)}</div>`;
    const qa = frame({ main: `<div class="card story">${pics}</div>`, opts: opts.map(([x, o, y, k]) => `<button class="num eqb" data-ok="${k}"><span>${x} ${OPS[o]} ${y}</span></button>`).join('') }, c.dots, false);
    const objs = objsIn(qa.querySelector('.pe'));
    if (op === '-') objs.slice(a - b).forEach(x => x.classList.add('gone'));
    const btns = [...qa.querySelectorAll('.eqb')];
    preload(P.whichEq, P.eqA(a, op, b, r));
    if (c.intro) await W(my, say(c.intro));
    say(P.whichEq);
    return choose(my, btns, x => x.dataset.ok === '1',
      async () => {
        await say(P.together);
        if (op === '+') { await counter(objs.slice(0, a)).demo(my); await W(my, sleep(250)); await counter(objs.slice(a)).demo(my); }
        else { await counter(objs.slice(0, a)).demo(my); await W(my, sleep(250)); objs.forEach(x => x.classList.remove('cnt')); await counter(objs.slice(a - b)).demo(my); }
        await say(P.eqA(a, op, b, r)); objs.forEach(x => x.classList.remove('cnt')); say(P.tapGlow);
      },
      async () => { await say(praise(), P.eqA(a, op, b, r)); });
  },
};

/* ---------- 61：減幾才會變（7 − ? = 4） ---------- */
GEN[61] = {
  plan: n => planPairs(61, n, pairs((a, cc) => a >= 2 && a <= 10 && cc >= 0 && cc < a && a - cc <= 6), q => `${q.a}-?=${q.b}`).map(q => ({ a: q.a, c: q.b, it: pickItem({ story: true }) })),
  key: q => `${q.a}-?=${q.c}`, again: q => ({ ...q, it: pickItem({ story: true }) }),
  ask(q, c) {
    const { a, it } = q, cc = q.c, b = a - cc, size = Math.min(80, fitCols(Math.min(5, a), Math.ceil(a / 5), 420, 40));
    let objs = [];
    return simpleAsk(q, c, {
      main: `<div class="card story"><div class="eq"><span>${a}</span><i>−</i><span class="qm" data-r>?</span><i>=</i><span>${cc}</span></div>${grp(it, a, size)}</div>`,
      opts: opts3(b, 0, 10), r: b, ask: [P.missSubQ(a, cc)], ans: P.eqA(a, '-', b, cc),
      after: qa => { objs = objsIn(qa.querySelector('.grp')); },
      demo: async () => { for (let i = 0; i < b; i++) { const o = objs[a - 1 - i]; o.classList.add('gone', 'cnt'); o.querySelector('.bd').textContent = i + 1; stopAll(); await W(c.my, play(CN(i + 1))); await W(c.my, sleep(160)); } },
      good: async () => { objs.slice(cc).forEach(o => o.classList.add('gone')); },
      undo: () => objs.forEach(o => o.classList.remove('gone', 'cnt')),
    });
  },
};

/* ---------- 62：十和幾 ---------- */
GEN[62] = {
  plan: n => planNums(n, range(11, 19), v => `62:${v}`).map((v, i) => ({ n: v, t: i % 2 ? 'split' : 'add', it: pickItem({ box: true }) })),
  key: q => `${q.t}${q.n}`, again: q => ({ ...q, it: pickItem({ box: true }) }),
  ask(q, c) {
    const { n, it } = q, k = n - 10, size = Math.min(60, fitCols(10, 2, 400, 80)), add = q.t === 'add';
    const eq = add ? eqHTML(10, '+', k) : `<div class="eq"><span>${n}</span><i>=</i><span>10</span><i>+</i><span class="qm" data-r>?</span></div>`;
    return simpleAsk(q, c, {
      main: `<div class="card boxwrap20"><div class="tenbox"><span class="lbl">10</span>${trayHTML(it, 10, { cols: 5, cells: 10, static: true, small: true, size })}</div>${grp(it, k, size, 5, 'extra')}</div>${eq}`,
      opts: add ? opts3(n, 10, 20) : opts3(k, 0, 10), r: add ? n : k,
      ask: [add ? P.eqQ(10, '+', k) : P.teenQ(n)], ans: add ? P.eqA(10, '+', k, n) : P.teenA(n),
      demo: async qa => { const bx = qa.querySelector('.tenbox'); bx.classList.add('cnt'); stopAll(); await W(c.my, play(P.box)); await counter(objsIn(qa.querySelector('.extra')), { base: add ? 10 : 0 }).demo(c.my); },
      undo: qa => qa.querySelectorAll('.cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};

/* ---------- 63：百數表 ---------- */
GEN[63] = {
  plan: n => planNums(n, range(2, 99).filter(v => v % 10 !== 1 || v > 11), v => `63:${v}`).map((v, i) => ({ n: v, rows: i < 3 ? 3 : 10 })),
  key: q => q.n, again: q => ({ ...q }),
  ask(q, c) {
    const row = Math.floor((q.n - 1) / 10), r0 = q.rows === 10 ? 0 : Math.max(0, Math.min(7, row - 1)), r1 = q.rows === 10 ? 9 : r0 + 2;
    const left = q.n % 10 === 1 ? q.n - 10 : q.n - 1;   // 每排第一個用上面那格
    const cell = v => v === q.n ? `<span class="hc qm" data-r>?</span>` : `<span class="hc ${Math.floor((v - 1) / 10) === row ? 'row' : ''}" data-v="${v}">${v}<span class="bd"></span></span>`;
    return simpleAsk(q, c, {
      main: `<div class="card hund ${q.rows === 10 ? 'full' : ''}">${range(r0 * 10 + 1, r1 * 10 + 10).map(cell).join('')}</div>`,
      opts: shuffle([q.n, q.n + (q.n % 10 === 0 ? -1 : 1), q.n + (q.n > 89 ? -10 : 10)].filter((v, i, a) => a.indexOf(v) === i)).sort((x, y) => x - y).map(v => numBtn(v)).join(''),
      r: q.n, ask: [P.missing], ans: CN(q.n),
      demo: async qa => { const l = qa.querySelector(`.hc[data-v="${left}"]`); if (l) { l.classList.add('cnt'); stopAll(); await W(c.my, play(CN(left))); await W(c.my, sleep(200)); } stopAll(); await W(c.my, play(CN(q.n))); },
      undo: qa => qa.querySelectorAll('.hc.cnt').forEach(e => e.classList.remove('cnt')),
    });
  },
};

/* ---------- 64：二位數比大小 ---------- */
GEN[64] = {
  plan: n => range(0, n - 1).map(i => {
    let a, b; const same = i % 2 === 1;
    do { a = 11 + rand(88); b = same ? Math.floor(a / 10) * 10 + rand(10) : 11 + rand(88); } while (a === b || a % 10 === 0 || b % 10 === 0 || (!same && Math.floor(a / 10) === Math.floor(b / 10)));
    return { a, b, t: rand(2) ? 'big' : 'small' };
  }),
  key: q => (Math.floor(q.a / 10) === Math.floor(q.b / 10) ? 'ones' : 'tens') + q.t, again: q => ({ ...q, a: q.b, b: q.a }),
  async ask(q, c) {
    const { my } = c, { a, b, t } = q, r = t === 'big' ? Math.max(a, b) : Math.min(a, b), sameT = Math.floor(a / 10) === Math.floor(b / 10);
    const card = v => `<button class="num cmp2" data-v="${v}"><span>${v}</span>${blocksHTML(v)}</button>`;
    const qa = frame({ main: '', opts: card(a) + card(b) }, c.dots, false);
    qa.querySelector('.main').remove();
    const btns = [...qa.querySelectorAll('.cmp2')];
    preload(t === 'big' ? P.bigQ : P.smallQ, P.cmpTens, P.cmpOnes);
    if (c.intro) await W(my, say(c.intro));
    say(t === 'big' ? P.bigQ : P.smallQ);
    const hl = async () => {
      await say(P.cmpTens); btns.forEach(x => x.querySelectorAll('.rod').forEach(e => e.classList.add('cnt'))); await W(my, sleep(500));
      if (sameT) { await say(P.cmpOnes); btns.forEach(x => x.querySelectorAll('.rod').forEach(e => e.classList.remove('cnt'))); btns.forEach(x => x.querySelectorAll('.cube').forEach(e => e.classList.add('cnt'))); await W(my, sleep(500)); }
    };
    const clear = () => qa.querySelectorAll('.cnt').forEach(e => e.classList.remove('cnt'));
    return choose(my, btns, x => +x.dataset.v === r,
      async () => { await hl(); clear(); say(P.tapGlow); },
      async () => { await say(praise()); });
  },
};

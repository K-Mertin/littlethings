'use strict';
/* 藏寶島 · hidden-treasure guessing game (battleship family). Every player owns an island: first everybody secretly
   hides treasures on their own phone, then in turns each player digs one cell on someone else's island.
   Kid mode: 4×4 islands, three 1-cell treasures, no traps, 30 s turns. Adult mode: 6×6 islands, a 3-cell 寶箱,
   a 2-cell 金幣袋, two 寶石 and a 💣 trap, 20 s turns, extra dig on a hit, one 🧭 探測器 per game.
   Views: island strings of length G*G. Public dug string: '.' not dug, 'o' nothing, '*' part of a treasure,
   'x' trap, or the piece letter once a whole treasure is dug out. Own layout string: '.' or a piece letter. */
(() => {
  const CHEST = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 56">
<path d="M6 24Q6 4 32 4Q58 4 58 24Z" fill="#b8641f" stroke="#5a2e0c" stroke-width="3"/>
<path d="M14 22Q14 9 22 7M42 7Q50 9 50 22" fill="none" stroke="#ffd23f" stroke-width="5"/>
<rect x="6" y="24" width="52" height="28" rx="4" fill="#cf7f2e" stroke="#5a2e0c" stroke-width="3"/>
<rect x="14" y="24" width="7" height="28" fill="#ffd23f"/><rect x="43" y="24" width="7" height="28" fill="#ffd23f"/>
<rect x="5" y="21" width="54" height="7" rx="2" fill="#ffd23f" stroke="#a56a00" stroke-width="2"/>
<rect x="26" y="22" width="12" height="15" rx="3" fill="#ffe680" stroke="#a56a00" stroke-width="2"/>
<circle cx="32" cy="28" r="2.4" fill="#5a2e0c"/><rect x="31" y="29" width="2" height="5" fill="#5a2e0c"/>
<circle cx="18" cy="12" r="2" fill="#fff8c4"/></svg>`);
  // pieces: L letter, n name, len cells, b bonus for digging the whole thing out
  const PA = [{ L: 'C', n: '寶箱', len: 3, b: 3 }, { L: 'B', n: '金幣袋', len: 2, b: 2 }, { L: 'G', n: '寶石', len: 1, b: 1 }, { L: 'H', n: '寶石', len: 1, b: 1 }, { L: 'T', n: '陷阱', len: 1, trap: 1 }];
  const PK = [{ L: 'K', n: '餅乾', len: 1, b: 1 }, { L: 'D', n: '鑽石', len: 1, b: 1 }, { L: 'W', n: '皇冠', len: 1, b: 1 }];
  const EMO = { B: '💰', G: '💎', H: '💎', T: '💣', K: '🍪', D: '💎', W: '👑' };
  const NAME = { C: '寶箱', B: '金幣袋', G: '寶石', H: '寶石', T: '陷阱', K: '餅乾', D: '鑽石', W: '皇冠' };
  const ico = L => L === 'C' ? `<img class="tr-chest" alt="" src="${CHEST}">` : `<span class="tr-e">${EMO[L] || ''}</span>`;
  const cellsOf = (G, len, c, o) => {
    if (!(c >= 0 && c < G * G)) return null;
    const r = c / G | 0, q = c % G, out = [];
    for (let i = 0; i < len; i++) { const rr = r + (o ? i : 0), cc = q + (o ? 0 : i); if (rr >= G || cc >= G) return null; out.push(rr * G + cc); }
    return out;
  };
  const BEST_BONUS = kid => kid ? 2 : 3;

  LGAMES.push({
    id: 'treasure', name: '藏寶島', icon: '🏝️', col: '#1fa6d8', cat: 'party',
    blurb: '偷偷藏寶，再去挖別人的小島', players: [2, 6],
    opts: kid => [{ k: 'tt', n: '每回合', o: kid ? [[20, '20 秒'], [30, '30 秒'], [45, '45 秒']] : [[12, '12 秒'], [20, '20 秒'], [30, '30 秒']], d: kid ? 30 : 20 }],
    rules: kid => kid ? [
      '每個人都有一座小島 🏝️，先偷偷把 🍪💎👑 藏好（別讓別人看到！）',
      '輪到你時，選一座別人的島，點一格挖下去 ⛏️',
      '🌊 沒東西　🔥 好近喔！寶藏就在旁邊　✨ 挖到寶藏就得分！',
      '寶藏最後才被找到的人是「最會藏寶」🏆'
    ] : [
      '藏寶：在 6×6 小島藏 1 個寶箱（3 格）、1 袋金幣（2 格）、2 顆寶石，再埋 1 個 💣 陷阱（40 秒）',
      '輪流挖別人的島：🌊 沒東西 / ✨ 挖到一部分（+1 分，再挖一次）/ 💥 陷阱（-1 分、下回合休息）',
      '整個寶物挖出來有額外獎勵；每人一次 🧭 探測器：看 2×2 範圍有沒有寶藏',
      '只剩一座島還藏著寶藏，或 10 輪後結束；寶藏撐最久的人得「最會藏寶」+3'
    ],

    host(ctx) {
      const kid = ctx.kid, ids = ctx.players.map(p => p.id), n = ids.length, now = () => ctx.now();
      const G = kid ? 4 : 6, NC = G * G, PC = kid ? PK : PA;
      const HIDE = 40, TURN = (ctx.opt && ctx.opt.tt) || (kid ? 30 : 20), REV = kid ? 2.1 : 1.7, RMAX = kid ? (n === 2 ? 10 : n === 3 ? 8 : 6) : 10, MAXDIG = 3;
      const S = {};
      ids.forEach(id => S[id] = { pl: PC.map(() => null), lay: Array(NC).fill('.'), dug: Array(NC).fill('.'), rdy: false, pts: 0, found: 0, cells: 0, traps: 0, probe: null, best: false });
      let ph = 'hide', st = '', T = now() + HIDE, tm = HIDE, over = false, hide0 = now();
      let order = shuffle(ids.slice()), idx = -1, rd = 1, cur = null, t0 = 0, digs = 0, aim = null, last = null, seq = 0, lp = null, why = '', started = false;
      const skip = new Set();
      const push = () => ctx.push();

      const relay = s => { const a = Array(NC).fill('.'); s.pl.forEach((p, k) => { if (p) p.cells.forEach(i => a[i] = PC[k].L); }); s.lay = a; };
      const free = (s, k, cells) => cells && cells.every(i => !s.pl.some((p, j) => j !== k && p && p.cells.includes(i)));
      function randFill(s, all) {
        if (all) s.pl = PC.map(() => null);
        PC.forEach((pc, k) => {
          if (s.pl[k]) return;
          for (let t = 0; t < 400; t++) {
            const o = rint(2), c = rint(NC), cells = cellsOf(G, pc.len, c, o);
            if (cells && free(s, k, cells)) { s.pl[k] = { c, o, cells }; break; }
          }
        });
        relay(s);
      }
      const allPlaced = s => s.pl.every(Boolean);
      const leftOf = id => { const s = S[id]; return PC.filter((pc, k) => !pc.trap && s.pl[k] && s.pl[k].cells.some(i => s.dug[i] === '.')).length; };
      const isOpen = id => leftOf(id) > 0;
      const openCount = () => ids.filter(isOpen).length;
      const canDig = id => ids.some(t => t !== id && isOpen(t));

      function startDig() {
        ids.forEach(id => { const s = S[id]; if (!allPlaced(s)) randFill(s, false); s.rdy = true; });
        ph = 'dig'; st = 'go'; T = now() + 1.8; tm = 0;
        ctx.sound('*', 'go'); push();
      }
      function advance() {
        if (openCount() <= 1) return end('clear');
        idx++;
        if (idx >= n) { idx = 0; if (started) rd++; }
        started = true;
        if (rd > RMAX) { rd = RMAX; return end('rounds'); }
        cur = order[idx]; digs = 0; aim = null;
        if (skip.has(cur)) { skip.delete(cur); st = 'skip'; T = now() + 1.9; tm = 0; push(); return; }
        st = 'pick'; T = now() + TURN; tm = TURN; t0 = now();
        push();
      }
      function dig(id, t, c, auto) {
        const s = S[t], m = S[id];
        if (!s || t === id || !isOpen(t) || !(c >= 0 && c < NC) || s.dug[c] !== '.') return false;
        const L = s.lay[c];
        let r = 'miss', full = false, gain = 0;
        if (L === '.') {
          // kid mode: a miss right next to a hidden treasure says 「好近喔！」
          const r0 = c / G | 0, q0 = c % G;
          let near = false;
          if (kid) for (let dr = -1; dr <= 1; dr++) for (let dq = -1; dq <= 1; dq++) {
            const rr = r0 + dr, qq = q0 + dq; if (rr < 0 || qq < 0 || rr >= G || qq >= G) continue;
            const j = rr * G + qq; if (s.lay[j] !== '.' && s.lay[j] !== 'T' && s.dug[j] === '.') near = true;
          }
          s.dug[c] = near ? 'n' : 'o'; if (near) r = 'near';
        }
        else if (L === 'T') { s.dug[c] = 'x'; r = 'trap'; m.traps++; gain = m.pts > 0 ? -1 : 0; m.pts += gain; skip.add(id); }
        else {
          const k = PC.findIndex(p => p.L === L), cells = s.pl[k].cells;
          s.dug[c] = '*'; r = 'hit'; gain = 1; m.cells++;
          if (cells.every(i => s.dug[i] !== '.')) { full = true; cells.forEach(i => s.dug[i] = L); gain += PC[k].b; m.found++; }
          m.pts += gain;
        }
        digs++;
        last = { seq: ++seq, by: id, t, c, r, L: full ? L : '', full, auto: !!auto, g: gain, dg: digs };
        aim = { t, c }; st = 'rev'; T = now() + REV + (full ? 0.5 : 0); tm = 0;
        push(); return true;
      }
      function autoDig() {
        const opts = ids.filter(t => t !== cur && isOpen(t));
        if (!opts.length) return advance();
        const t = aim && opts.includes(aim.t) ? aim.t : opts[rint(opts.length)];
        const cs = []; S[t].dug.forEach((d, i) => { if (d === '.') cs.push(i); });
        if (!cs.length) return advance();
        dig(cur, t, cs[rint(cs.length)], true);
      }
      function afterRev() {
        if (openCount() <= 1) return end('clear');
        if (last && last.r === 'hit' && !kid && digs < MAXDIG && canDig(cur)) {
          st = 'pick'; T = now() + TURN; tm = TURN; t0 = now(); push(); return;
        }
        advance();
      }
      function end(w) {
        ph = 'end'; st = ''; why = w; cur = null; aim = null; T = now() + 5.5; tm = 0;
        const left = {}; ids.forEach(id => left[id] = leftOf(id));
        const mx = Math.max(0, ...Object.values(left));
        if (mx > 0) ids.forEach(id => { if (left[id] === mx) { S[id].best = true; S[id].pts += BEST_BONUS(kid); } });
        ctx.sound('*', 'star'); push();
      }

      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'hide') {
            ids.forEach(id => { const s = S[id]; if (!s.rdy && !ctx.online(id) && t - hide0 > 4) { randFill(s, false); s.rdy = true; push(); } });
            if (t >= T || ids.every(id => S[id].rdy)) startDig();
          } else if (ph === 'dig') {
            if (st === 'go' || st === 'skip') { if (t >= T) advance(); }
            else if (st === 'pick') { if (t >= T || (!ctx.online(cur) && t - t0 >= 2.5)) autoDig(); }
            else if (st === 'rev') { if (t >= T) afterRev(); }
          } else if (ph === 'end') { if (t >= T) over = true; }
        },
        msg(id, d) {
          if (!d || typeof d !== 'object' || !S[id]) return;
          const s = S[id];
          if (ph === 'hide') {
            if (d.put && !s.rdy) {
              const k = d.put.k | 0, o = d.put.o ? 1 : 0, c = d.put.c | 0;
              if (!PC[k]) return;
              const cells = cellsOf(G, PC[k].len, c, o);
              if (!cells || !free(s, k, cells)) { ctx.toast(id, '這裡放不下喔'); ctx.sound(id, 'wrong'); push(); return; }
              s.pl[k] = { c, o, cells }; relay(s); push(); return;
            }
            if (d.take != null && !s.rdy) { const k = d.take | 0; if (PC[k]) { s.pl[k] = null; relay(s); push(); } return; }
            if (d.rand && !s.rdy) { randFill(s, true); push(); return; }
            if (d.ready && !s.rdy) { if (!allPlaced(s)) { ctx.toast(id, '還有寶藏沒藏好喔'); return; } s.rdy = true; push(); return; }
            if (d.edit && s.rdy) { s.rdy = false; push(); return; }
            return;
          }
          if (ph !== 'dig' || st !== 'pick' || cur !== id) return;
          const okT = t => typeof t === 'string' && ids.includes(t);
          if (d.aim) {
            const t = d.aim.t, c = d.aim.c | 0;
            if (!okT(t)) return;
            if (t !== id && S[t] && isOpen(t) && c >= -1 && c < NC) { aim = { t, c: c >= 0 && S[t].dug[c] === '.' ? c : -1 }; push(); }
            return;
          }
          if (d.dig) { if (okT(d.dig.t)) dig(id, d.dig.t, d.dig.c | 0, false); return; }
          if (d.probe && !kid && !s.probe) {
            const t = d.probe.t, c = d.probe.c | 0;
            if (!okT(t) || t === id || !S[t] || !isOpen(t) || c < 0 || c >= NC || (c % G) > G - 2 || (c / G | 0) > G - 2) return;
            const area = [c, c + 1, c + G, c + G + 1], o = S[t];
            const y = area.some(i => o.lay[i] !== '.' && o.lay[i] !== 'T' && o.dug[i] === '.') ? 1 : 0;
            s.probe = { t, c, y }; lp = { seq: ++seq, by: id, t, c };
            ctx.sound('*', 'whoosh'); push();
          }
        },
        leave() { push(); },
        back() { push(); },
        view(id) {
          const me = id && S[id] ? id : null, t = now();
          const v = { ph, st, G, rd, rmax: RMAX, cur, order, tl: Math.max(0, Math.round((T - t) * 10) / 10), tm, sc: {}, isl: {}, aim, last, lp, sk: [...skip], dg: digs };
          ids.forEach(p => { const s = S[p]; v.sc[p] = s.pts; v.isl[p] = { d: s.dug.join(''), l: leftOf(p), u: s.probe ? 1 : 0 }; });
          if (ph === 'hide') {
            v.ready = ids.filter(p => S[p].rdy);
            if (me) v.my = { pl: S[me].pl.map(p => p ? [p.c, p.o] : null), rdy: S[me].rdy };
          }
          if (me) { v.mine = S[me].lay.join(''); if (S[me].probe) v.pr = S[me].probe; }
          if (ph === 'end') { v.rev = {}; ids.forEach(p => v.rev[p] = S[p].lay.join('')); v.best = ids.filter(p => S[p].best); v.why = why; }
          return v;
        },
        results() {
          const rows = ids.map(id => {
            const s = S[id], bits = [`挖到 ${s.found} 個寶藏`];
            if (!kid && s.cells) bits.push(`${s.cells} 格`);
            if (s.traps) bits.push(`踩到陷阱 ${s.traps} 次`);
            if (s.best) bits.push('最會藏寶');
            return { id, key: s.pts, line: `${s.pts} 分・` + bits.join('・') };
          });
          const best = ids.filter(id => S[id].best).map(id => (ctx.players.find(p => p.id === id) || {}).name);
          return { rows, sub: best.length ? `🏝️ 最會藏寶：${best.join('、')}` : (why === 'rounds' ? `${RMAX} 輪挖完了` : '') };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('tr-style')) {
        const st = document.createElement('style'); st.id = 'tr-style'; st.textContent = CSS; document.head.appendChild(st);
      }
      const kid = api.kid, me = api.me, tv = api.isTable;
      const G = kid ? 4 : 6, NC = G * G, PC = kid ? PK : PA, TRE = PC.filter(p => !p.trap).length;
      root.innerHTML = `<div class="tr ${kid ? 'tr-kid' : 'tr-adult'} ${tv ? 'tr-tv' : ''} ${me ? '' : 'tr-pub'}">
        <div class="tr-waves"></div>
        <div class="tr-wrap">
          <div class="tr-top"><span class="tr-rd"></span><span class="tr-ph"></span><span class="tr-tm" hidden><b></b></span></div>
          <div class="tr-bar"><i></i></div>
          <div class="tr-body"></div>
        </div>
        <div class="tr-ov" hidden></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.tr'), elRd = Q('.tr-rd'), elPh = Q('.tr-ph'), elTm = Q('.tr-tm'), elBar = Q('.tr-bar i'), elBody = Q('.tr-body'), elOv = Q('.tr-ov');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const av = (id, sz) => `<img alt="" src="${api.avatar(P(id), sz || 96)}">`;
      const nm = id => esc(P(id).name);
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      const dots = l => `<span class="tr-dots">${'●'.repeat(Math.max(0, l))}<s>${'●'.repeat(Math.max(0, TRE - l))}</s></span>`;

      let V = null, mode = '', isl = {}, mineI = null, sel = 0, ori = PC.map(() => 0), myPl = null, selT = null, aimC = -1, probeMode = false;
      let lastSeq = 0, lastLp = 0, lpUntil = 0, lastCur = null, lastSt = '', lastPh = '', ovT = 0, tEnd = 0, tTot = 0, lastTick = -1, wide = false, drag = null, structKey = '', aimSent = 0;

      /* ---------- one island: grid of cells + overlays (pieces, probe areas, digger cursor, bursts) ---------- */
      function Island(owner, small) {
        const el = document.createElement('div');
        el.className = 'tr-isl' + (small ? ' sm' : '');
        el.innerHTML = `<div class="tr-ih"></div><div class="tr-land"><span class="tr-palm p1">🌴</span><span class="tr-palm p2">🌴</span>${kid ? '<span class="tr-deco d1">🦀</span><span class="tr-deco d2">🐚</span>' : '<span class="tr-deco d3">🪨</span>'}<div class="tr-grid" style="--g:${G}"></div><div class="tr-mask" hidden></div></div>`;
        const grid = el.querySelector('.tr-grid'), cells = [];
        for (let i = 0; i < NC; i++) { const c = document.createElement('div'); c.className = 'tr-c u'; c.dataset.i = i; grid.appendChild(c); cells.push(c); }
        const pcs = document.createElement('div'); pcs.className = 'tr-pcs'; grid.appendChild(pcs);
        const prb = document.createElement('div'); prb.className = 'tr-prbs'; grid.appendChild(prb);
        const cur = document.createElement('div'); cur.className = 'tr-cur'; cur.hidden = true; grid.appendChild(cur);
        const I = {
          el, grid, cells, owner, head: el.querySelector('.tr-ih'), mask: el.querySelector('.tr-mask'), ck: [], pk: '', bk: '', curK: '', px: 0,
          size(px) {
            px = Math.max(96, Math.floor(px)); if (px === I.px) return; I.px = px;
            el.style.setProperty('--w', px + 'px'); el.style.setProperty('--cs', (px / G).toFixed(1) + 'px'); I.pk = ''; I.bk = ''; I.curK = '';
            if (I.lastO) I.render(I.lastO);
          },
          box(list) {
            let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
            for (const i of list) { const c = cells[i]; l = Math.min(l, c.offsetLeft); t = Math.min(t, c.offsetTop); r = Math.max(r, c.offsetLeft + c.offsetWidth); b = Math.max(b, c.offsetTop + c.offsetHeight); }
            return `left:${l}px;top:${t}px;width:${r - l}px;height:${b - t}px`;
          },
          render(o) {
            I.lastO = o;
            const d = o.d || '.'.repeat(NC), lay = o.lay;
            for (let i = 0; i < NC; i++) {
              const ds = d[i], L = lay ? lay[i] : '.';
              let cls = 'tr-c ', h = '';
              if (ds === '.') cls += L !== '.' ? 'u own' : 'u';
              else if (ds === 'o') { cls += 'm'; h = '<span class="tr-e">🌊</span>'; }
              else if (ds === 'n') { cls += 'm nr'; h = '<span class="tr-e">🔥</span>'; }
              else if (ds === '*') { cls += 'h'; h = lay ? '' : '<span class="tr-e">✨</span>'; }
              else if (ds === 'x') { cls += 'x'; h = '<span class="tr-e">💥</span>'; }
              else cls += 'f';
              if ((i % G + (i / G | 0)) % 2) cls += ' alt';
              if (o.sel && o.sel.includes(i)) cls += ' sel';
              if (o.pv && o.pv.cells.includes(i)) cls += o.pv.ok ? ' pv' : ' pvx';
              if (o.aimC === i) cls += ' aim';
              if (o.tap && ds === '.') cls += ' tap';
              const k = cls + h;
              if (I.ck[i] !== k) { I.ck[i] = k; cells[i].className = cls; cells[i].innerHTML = h; }
            }
            // pieces: own (hidden / found) from the layout, found ones from the dug string
            if (!el.isConnected) { I.pk = ''; return; }
            const groups = {};
            if (lay) for (let i = 0; i < NC; i++) { const L = lay[i]; if (L !== '.' && !(L === 'T' && d[i] === 'x')) (groups[L] = groups[L] || []).push(i); }
            for (let i = 0; i < NC; i++) { const L = d[i]; if (/[A-Z]/.test(L) && (!lay || !groups[L])) (groups[L] = groups[L] || []).push(i); }
            const pk = JSON.stringify(groups) + d + I.px + (o.rv ? 'r' : '');
            if (pk !== I.pk) {
              I.pk = pk;
              pcs.innerHTML = Object.keys(groups).map(L => {
                const list = groups[L], full = list.every(i => d[i] !== '.' && d[i] !== 'o');
                const vert = list.length > 1 && list[1] - list[0] === G;
                const cls = !lay ? 'f' : full ? 'lost' : (o.rv ? 'rv' : 'own');
                const tag = lay && full && L !== 'T' && !o.rv ? `<i class="tr-tag">${kid ? '被找到' : '被挖到'}</i>` : '';
                return `<div class="tr-pco ${cls} ${vert ? 'v' : ''} n${list.length} ${L === 'T' ? 'trap' : ''}" style="${I.box(list)}">${ico(L)}${tag}</div>`;
              }).join('');
            }
            // probe areas
            const pr = o.probes || [];
            const bk = JSON.stringify(pr) + I.px;
            if (bk !== I.bk) {
              I.bk = bk;
              prb.innerHTML = pr.map(p => `<div class="tr-prb ${p.y === 1 ? 'y' : p.y === 0 ? 'n' : 'q'}" style="${I.box([p.c, p.c + 1, p.c + G, p.c + G + 1])}"><span>🧭 ${p.y === 1 ? '有寶藏！' : p.y === 0 ? '沒有寶藏' : '探測中'}</span></div>`).join('');
            }
            // digger cursor
            const cu = o.cursor;
            if (!cu) { cur.hidden = true; I.curK = ''; }
            else {
              const ck = cu.p + '|' + cu.c + '|' + I.px;
              if (ck !== I.curK) {
                if (!I.curK || I.curK.split('|')[0] !== cu.p) cur.innerHTML = `${av(cu.p, 96)}<span>⛏️</span>`;
                I.curK = ck; cur.hidden = false;
                if (cu.c >= 0) { const c = cells[cu.c]; cur.style.left = (c.offsetLeft + c.offsetWidth * 0.5) + 'px'; cur.style.top = (c.offsetTop + c.offsetHeight * 0.45) + 'px'; cur.classList.remove('think'); }
                else { cur.style.left = '50%'; cur.style.top = '50%'; cur.classList.add('think'); }
              }
            }
          },
          burst(c, r, L) {
            if (!el.isConnected || !(c >= 0)) return;
            const cell = cells[c], b = document.createElement('div');
            b.className = 'tr-burst ' + r;
            b.style.left = (cell.offsetLeft + cell.offsetWidth / 2) + 'px'; b.style.top = (cell.offsetTop + cell.offsetHeight / 2) + 'px';
            let h = '';
            const nP = tv ? 16 : 11;
            for (let k = 0; k < nP; k++) { const a = k / nP * 6.283 + Math.random() * 0.5, dd = 0.55 + Math.random() * 0.7; h += `<i style="--dx:${(Math.cos(a) * dd).toFixed(2)};--dy:${(Math.sin(a) * dd - 0.35).toFixed(2)}"></i>`; }
            h += `<b>${r === 'near' ? '🔥' : r === 'miss' ? '🌊' : r === 'trap' ? '💥' : L ? ico(L) : '✨'}</b>`;
            b.innerHTML = h; grid.appendChild(b);
            cur.classList.remove('dig'); void cur.offsetWidth; cur.classList.add('dig');
            setTimeout(() => b.remove(), 1500);
          }
        };
        return I;
      }

      const resultText = (L0, short) => {
        if (!L0) return '';
        if (L0.r === 'miss') return kid ? '🌊 什麼都沒有～' : '🌊 沒東西';
        if (L0.r === 'near') return '🔥 好近喔！寶藏就在旁邊';
        if (L0.r === 'trap') return '💥 踩到陷阱！';
        if (L0.full) return kid ? `🎉 找到 ${EMO[L0.L] || ''} 了！` : L0.L === 'C' ? '🎉 挖到整個寶箱！' : `🎉 挖出整個${NAME[L0.L]}！`;
        return short ? '✨ 挖到寶藏！' : '✨ 挖到寶藏的一部分！';
      };
      const gainTxt = g => g > 0 ? `+${g}⭐` : g < 0 ? `${g}⭐` : '';

      /* ---------- layout ---------- */
      const LANDF = 1 + 2 * (kid ? 0.24 : 0.2) / G;   // island width / grid width
      const ro = new ResizeObserver(() => layout(true));
      ro.observe(root);
      function fit(I, maxW, minW) {
        const sc = elBody;
        let s = maxW; I.size(s);
        for (let k = 0; k < 4; k++) {
          const over = sc.scrollHeight - sc.clientHeight;
          if (over <= 1) break;
          const ns = Math.max(minW || 140, s - over - 2); if (ns === s) break; s = ns; I.size(s);
        }
      }
      function layout(force) {
        if (!V) return;
        const W = root.clientWidth, H = root.clientHeight;
        const w2 = W > H * 1.15 && W >= 560;
        if (w2 !== wide) { wide = w2; wrap.classList.toggle('tr-wide', wide); }
        if (mode === 'pub') {
          const list = V.order, n = list.length, oc = elBody.querySelector('.tr-ocean'); if (!oc) return;
          const headH = tv ? 62 : 40, avH = elBody.clientHeight - (tv ? 16 : 70), avW = elBody.clientWidth - 16;
          const f = 1 + 2 * (kid ? 0.24 : 0.2) / G;   // land padding around the grid
          let best = 0, bc = 1;
          for (let cols = 1; cols <= n; cols++) {
            const rows = Math.ceil(n / cols), w = (avW / cols - 34 - 30) / f, h = (avH / rows - headH - 20 - (rows - 1) * 12) / f, s = Math.min(w, h);
            if (s > best) { best = s; bc = cols; }
          }
          best = Math.min(best, tv ? 560 : 420);
          if (!tv && W < 560) { bc = Math.min(2, n); best = Math.min(Math.max(best, 120), (W - 16) / bc / f - 50); }
          oc.style.gridTemplateColumns = `repeat(${bc},auto)`;
          list.forEach(id => isl[id] && isl[id].size(best));
          return;
        }
        if (mode === 'hide') {
          const I = isl[me]; if (!I) return;
          if (wide) I.size(Math.min((elBody.clientHeight - 34) / LANDF, W * 0.5));
          else fit(I, Math.min((W - 52) / LANDF, 520), 150);
          return;
        }
        if (mode === 'dig') {
          const main = curMain && (curMain === me ? isl._me : isl[curMain]);
          const small = V.cur === me && (V.st === 'pick' || V.st === 'rev');
          if (mineI && !elBody.querySelector('.tr-mine').hidden) mineI.size(wide ? Math.min(W * 0.24, H * (small ? 0.3 : 0.42)) : small ? 96 : Math.max(110, Math.min(W * 0.36, 160)));
          if (main) { if (wide) main.size(Math.min((elBody.clientHeight - 34) / LANDF, W * 0.5)); else fit(main, Math.min((W - 52) / LANDF, 520), 150); }
        }
      }

      /* ---------- modes ---------- */
      function build(m) {
        mode = m; isl = {}; mineI = null; curMain = undefined; structKey = '';
        if (m === 'pub') {
          elBody.innerHTML = `<span class="tr-boat">⛵</span><span class="tr-boat b2">🐬</span><div class="tr-ocean"></div><div class="tr-news" hidden></div>`;
          const oc = elBody.querySelector('.tr-ocean');
          if (tv) { const old = Q('.tr-top .tr-news'); if (old) old.remove(); Q('.tr-top').insertBefore(elBody.querySelector('.tr-news'), elTm); }
          V.order.forEach(id => { const I = Island(id, false); I.el.classList.add('pub'); oc.appendChild(I.el); isl[id] = I; });
        } else if (m === 'hide') {
          elBody.innerHTML = `<div class="tr-hide">
            <div class="tr-sc"></div>
            <div class="tr-hint"></div>
            <div class="tr-gbox main"></div>
            <div class="tr-tray"></div>
            <div class="tr-acts"></div></div>`;
          const I = Island(me, false); I.el.classList.add('mine-big'); elBody.querySelector('.tr-gbox').appendChild(I.el); isl[me] = I;
          bindHide(I);
        } else {
          elBody.innerHTML = `<div class="tr-dig">
            <div class="tr-sc"></div>
            <div class="tr-now"></div>
            <div class="tr-tabs" hidden></div>
            <div class="tr-gbox main"></div>
            <div class="tr-acts"></div>
            <div class="tr-mine"><div class="tr-ml"></div><div class="tr-gbox mine"></div></div></div>`;
          mineI = Island(me, true); elBody.querySelector('.tr-gbox.mine').appendChild(mineI.el);
          bindDig();
        }
      }

      /* ---------- score chips ---------- */
      function drawScores() {
        const el = elBody.querySelector('.tr-sc'); if (!el) return;
        const v = V, list = v.order;
        const key = JSON.stringify([v.sc, v.cur, v.ph, v.ready, v.sk, list.map(id => [v.isl[id].l, P(id).online])]);
        set(el, key, list.map(id => {
          const p = P(id), cls = ['tr-chip'];
          if (id === v.cur) cls.push('cur'); if (id === me) cls.push('me'); if (p.online === false) cls.push('off');
          let extra = '';
          if (v.ph === 'hide') extra = v.ready && v.ready.includes(id) ? '<em class="ok">✔</em>' : '<em>🤫</em>';
          else extra = v.sk.includes(id) ? '<em>😵</em>' : '';
          return `<div class="${cls.join(' ')}">${av(id, 64)}<span class="n">${esc(p.name)}</span><span class="s">${v.sc[id]}</span>${extra}</div>`;
        }).join(''));
      }

      /* ---------- top bar ---------- */
      function drawTop() {
        const v = V;
        elRd.textContent = v.ph === 'hide' ? (kid ? '藏寶時間' : '藏寶') : v.ph === 'end' ? '結束' : `第 ${v.rd}/${v.rmax} 輪`;
        let t = '';
        if (v.ph === 'hide') t = me ? (v.my && v.my.rdy ? '✔ 藏好了，等大家…' : '🤫 偷偷把寶藏藏好！') : '🤫 大家正在偷偷藏寶…';
        else if (v.ph === 'end') t = '🏁 寶藏全部現身！';
        else if (v.st === 'go') t = '⛏️ 開挖！';
        else if (v.st === 'skip') t = `😵 ${nm(v.cur)} 休息一回合`;
        else if (v.st === 'rev' && v.last) t = `${nm(v.last.by)}：${resultText(v.last, true)}`;
        else if (v.st === 'pick') t = v.cur === me ? (v.dg > 0 ? '✨ 再挖一次！' : '⛏️ 輪到你了！') : `⛏️ ${nm(v.cur)} 在挖寶`;
        if (elPh._t !== t) { elPh._t = t; elPh.textContent = t; }
        wrap.classList.toggle('tr-myturn', !!me && v.ph === 'dig' && v.st === 'pick' && v.cur === me);
      }

      /* ---------- public view (big screen / watchers / everyone at the end) ---------- */
      function drawPub() {
        const v = V;
        v.order.forEach(id => {
          const I = isl[id]; if (!I) return;
          const iv = v.isl[id], best = v.best && v.best.includes(id);
          const tgt = v.ph === 'dig' && v.aim && v.aim.t === id && (v.st === 'pick' || v.st === 'rev');
          I.el.classList.toggle('tgt', tgt);
          I.el.classList.toggle('closed', v.ph === 'dig' && iv.l === 0);
          I.el.classList.toggle('turn', v.ph === 'dig' && v.cur === id);
          let status = '';
          let pill = '';
          if (v.ph === 'hide') status = v.ready.includes(id) ? '<em class="ok">✔ 藏好了</em>' : '<em>🤫 藏寶中</em>';
          else if (v.ph === 'end') status = best ? '<em class="best">🏆 最會藏寶</em>' : '';
          else { status = (v.sk.includes(id) ? '<em>😵 休息</em>' : '') + (iv.l === 0 ? '<em>挖光了</em>' : ''); if (iv.l) pill = dots(iv.l); }
          set(I.head, JSON.stringify([v.sc[id], status, P(id).name, v.cur === id, P(id).online]),
            `<span class="tr-hav ${P(id).online === false ? 'off' : ''}">${av(id, tv ? 128 : 96)}</span><span class="tr-hn">${esc(P(id).name)}${id === me ? '（你）' : ''}</span><span class="tr-hs">⭐${v.sc[id]}${pill}</span>${status}`);
          const probes = [];
          if (v.lp && v.lp.t === id && performance.now() < lpUntil) probes.push({ c: v.lp.c, y: v.pr && v.lp.by === me ? v.pr.y : -1 });
          if (v.pr && v.pr.t === id && !probes.length) probes.push(v.pr);
          I.render({
            d: iv.d, lay: v.ph === 'end' ? v.rev[id] : null, rv: v.ph === 'end',
            cursor: tgt ? { p: v.cur, c: v.aim.c } : null, probes
          });
          if (v.ph === 'hide') { I.mask.hidden = false; set(I.mask, v.ready.includes(id) ? 'r' : 'h', v.ready.includes(id) ? '<span class="ok">✔</span>' : '<span class="tr-shh">🤫</span>'); }
          else I.mask.hidden = true;
        });
        const nw = root.querySelector('.tr-news');
        let nk = '', nh = '';
        if (v.ph === 'dig' && v.st === 'rev' && v.last) { nk = 'r' + v.last.seq; nh = `${av(v.last.by, 128)}<b>${nm(v.last.by)}</b><span class="r ${v.last.r}${v.last.full ? ' full' : ''}">${resultText(v.last)}</span>${v.last.g ? `<i>${gainTxt(v.last.g)}</i>` : ''}`; }
        else if (v.ph === 'dig' && v.st === 'skip') { nk = 's' + v.cur + v.rd; nh = `${av(v.cur, 128)}<b>${nm(v.cur)}</b><span class="r">😵 踩到陷阱，休息一回合</span>`; }
        else if (v.ph === 'dig' && v.st === 'go') { nk = 'go'; nh = `<span class="r big">⛏️ 開挖！輪流去挖別人的島</span>`; }
        else if (v.ph === 'dig' && v.st === 'pick') { nk = 'p' + v.cur + v.dg; nh = `${av(v.cur, 128)}<b>${nm(v.cur)}</b><span class="r">${v.dg > 0 ? '再挖一次！' : '的回合'}${v.aim && v.aim.t ? ` → ${av(v.aim.t, 96)}${nm(v.aim.t)} 的島` : '…選島中'}</span>`; nk += v.aim ? v.aim.t : ''; }
        else if (v.ph === 'end') { nk = 'end'; nh = `<span class="r big">🏁 ${v.why === 'clear' ? '寶藏快被挖光了！' : '時間到！'}看看大家藏在哪裡</span>`; }
        wrap.classList.toggle('tr-hasnews', !!nk);
        if (nk) { nw.hidden = false; if (set(nw, nk, nh)) { nw.classList.remove('in'); void nw.offsetWidth; nw.classList.add('in'); } } else nw.hidden = true;
        nw.classList.toggle('pick', v.st === 'pick');
      }

      /* ---------- hiding (own phone) ---------- */
      const myLay = () => { const a = Array(NC).fill('.'); (myPl || []).forEach((p, k) => { if (p) { const cs = cellsOf(G, PC[k].len, p[0], p[1]); if (cs) cs.forEach(i => a[i] = PC[k].L); } }); return a.join(''); };
      const pieceAt = i => { const L = myLay()[i]; return L === '.' ? -1 : PC.findIndex(p => p.L === L); };
      const fitAnchor = (k, i, o) => { const len = PC[k].len, r = i / G | 0, c = i % G; return o ? Math.min(r, G - len) * G + c : r * G + Math.min(c, G - len); };
      const freeFor = (k, cells) => { if (!cells) return false; const lay = myLay(); return cells.every(i => lay[i] === '.' || lay[i] === PC[k].L); };
      function placeLocal(k, anchor, o) {
        const cells = cellsOf(G, PC[k].len, anchor, o);
        if (!freeFor(k, cells)) { api.sfx('wrong'); api.vibrate(60); api.toast(kid ? '這裡放不下喔' : '跟別的寶物重疊了'); return false; }
        myPl[k] = [anchor, o]; ori[k] = o;
        api.send({ put: { k, c: anchor, o } }); api.sfx('pop'); api.vibrate(15);
        const nx = PC.findIndex((p, j) => !myPl[j]);
        if (nx >= 0) sel = nx;
        drawHide(); return true;
      }
      function rotateSel() {
        const k = sel, pc = PC[k]; if (!pc || pc.len < 2) return;
        const o = ori[k] ? 0 : 1;
        if (myPl[k]) {
          const a = fitAnchor(k, myPl[k][0], o), cells = cellsOf(G, pc.len, a, o);
          if (!freeFor(k, cells)) { api.sfx('wrong'); api.toast('轉不過去，旁邊有東西'); return; }
          placeLocal(k, a, o); sel = k;
        } else ori[k] = o;
        api.sfx('flip'); drawHide();
      }
      function tapHideCell(i) {
        if (!V || V.ph !== 'hide' || !V.my || V.my.rdy) return;
        const at = pieceAt(i);
        if (at >= 0) {
          if (at === sel && PC[at].len > 1) { rotateSel(); return; }
          sel = at; api.sfx('tick'); drawHide(); return;
        }
        if (sel < 0 || !PC[sel]) return;
        placeLocal(sel, fitAnchor(sel, i, ori[sel]), ori[sel]);
      }
      function cellFromPoint(x, y, I) {
        const el = document.elementFromPoint(x, y);
        const c = el && el.closest && el.closest('.tr-c');
        return c && I.grid.contains(c) ? +c.dataset.i : -1;
      }
      function bindHide(I) {
        // tap or drag a piece (from the tray or from the island) onto the island
        const start = (e, k) => {
          if (!V || !V.my || V.my.rdy) return;
          drag = { k, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, cell: -1, ghost: null };
        };
        elBody.addEventListener('pointerdown', e => {
          if (mode !== 'hide') return;
          const tb = e.target.closest('[data-k]');
          if (tb) { start(e, +tb.dataset.k); drag.src = 'tray'; return; }
          const c = e.target.closest('.tr-c');
          if (c && I.grid.contains(c)) { const at = pieceAt(+c.dataset.i); if (at >= 0) { start(e, at); drag.src = 'grid'; drag.from = +c.dataset.i; } else drag = { tapCell: +c.dataset.i, x: e.clientX, y: e.clientY }; }
        });
        const move = e => {
          if (!drag || drag.tapCell != null) return;
          if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) {
            drag.on = true; sel = drag.k;
            const g = document.createElement('div'); g.className = 'tr-ghost' + (ori[drag.k] ? ' v' : '');
            g.style.setProperty('--len', PC[drag.k].len); g.style.setProperty('--cs', (I.px / G) + 'px');
            g.innerHTML = ico(PC[drag.k].L); document.body.appendChild(g); drag.ghost = g; api.sfx('pop');
          }
          if (drag.on) {
            e.preventDefault();
            drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
            const c = cellFromPoint(e.clientX, e.clientY, I);
            if (c !== drag.cell) { drag.cell = c; drawHide(); }
          }
        };
        const up = e => {
          if (!drag) return;
          const d = drag; drag = null;
          if (d.ghost) d.ghost.remove();
          if (d.tapCell != null) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14) tapHideCell(d.tapCell); return; }
          if (!d.on) {
            if (d.src === 'tray') { if (sel === d.k && PC[d.k].len > 1) rotateSel(); else { sel = d.k; api.sfx('tick'); drawHide(); } }
            else tapHideCell(d.from);
            return;
          }
          if (d.cell >= 0) { sel = d.k; placeLocal(d.k, fitAnchor(d.k, d.cell, ori[d.k]), ori[d.k]); }
          else if (d.src === 'grid' && !e.target.closest('.tr-land')) { myPl[d.k] = null; api.send({ take: d.k }); sel = d.k; api.sfx('whoosh'); }
          drawHide();
        };
        addEventListener('pointermove', move, { passive: false });
        addEventListener('pointerup', up); addEventListener('pointercancel', up);
        cleanups.push(() => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (drag && drag.ghost) drag.ghost.remove(); });
        elBody.addEventListener('click', e => {
          if (mode !== 'hide') return;
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.rot != null) rotateSel();
          else if (b.dataset.rand != null) { api.send({ rand: 1 }); api.sfx('deal'); api.vibrate(20); }
          else if (b.dataset.ok != null) { if (myPl.every(Boolean)) { api.send({ ready: 1 }); api.sfx('right'); api.vibrate(40); } else { api.sfx('wrong'); api.toast('還有寶藏沒藏好喔'); } }
          else if (b.dataset.edit != null) { api.send({ edit: 1 }); api.sfx('pop'); }
        });
      }
      function drawHide() {
        const v = V, I = isl[me]; if (!I || !v.my) return;
        const rdy = v.my.rdy, done = myPl.every(Boolean);
        if (sel >= 0 && !PC[sel]) sel = 0;
        set(elBody.querySelector('.tr-hint'), 'h' + rdy + kid, rdy
          ? `<div class="tr-msg ok">✔ 藏好了！<small>不要讓別人看到你的島喔 🤫</small></div>`
          : `<div class="tr-msg">${kid ? '👆 點一個寶藏，再點小島放下去' : '選寶物 → 點格子放下（也可以拖曳）<br><small>再點一次已放好的寶物可以轉方向</small>'}<small>${kid ? '別讓別人看到你的手機 🤫' : '別讓別人看到你的手機 🤫・💣 陷阱也要藏好'}</small></div>`);
        const tray = elBody.querySelector('.tr-tray');
        set(tray, JSON.stringify([myPl, sel, rdy, ori]), rdy ? '' : PC.map((p, k) => {
          const placed = !!myPl[k];
          return `<button class="tr-pc ${sel === k ? 'on' : ''} ${placed ? 'done' : ''} ${p.trap ? 'trap' : ''}" data-k="${k}">
            <span class="tr-blk ${ori[k] && p.len > 1 ? 'v' : ''}" style="--len:${p.len}">${ico(p.L)}</span>
            <span class="tr-pcn">${p.n}${p.len > 1 ? `<small>${p.len} 格</small>` : ''}</span>${placed ? '<i>✔</i>' : ''}</button>`;
        }).join(''));
        const acts = elBody.querySelector('.tr-acts'), sp = PC[sel];
        set(acts, JSON.stringify([rdy, done, sel, v.ready.length]), rdy
          ? `<div class="tr-wait">等其他人藏好… <b>${v.ready.length}/${v.order.length}</b></div><button class="btn ghost small" data-edit>✏️ 再改一下</button>`
          : `${kid ? '' : `<button class="btn ghost" data-rot ${sp && sp.len > 1 ? '' : 'disabled'}>🔄 轉方向</button>`}<button class="btn ghost" data-rand>🎲 隨機放</button><button class="btn acc ${done ? 'pulse' : ''}" data-ok ${done ? '' : 'disabled'}>藏好了！✔</button>`);
        let pv = null;
        if (drag && drag.on && drag.cell >= 0) {
          const k = drag.k, cells = cellsOf(G, PC[k].len, fitAnchor(k, drag.cell, ori[k]), ori[k]);
          pv = { cells: cells || [], ok: freeFor(k, cells) };
        }
        const selCells = !rdy && sel >= 0 && myPl[sel] ? cellsOf(G, PC[sel].len, myPl[sel][0], myPl[sel][1]) : null;
        I.render({ d: null, lay: myLay(), sel: selCells || [], pv, tap: !rdy });
        I.el.classList.toggle('locked', rdy);
        set(I.head, 'me', `<span class="tr-hav">${av(me, 96)}</span><span class="tr-hn">我的島</span>`);
      }

      /* ---------- digging (own phone) ---------- */
      let curMain;
      const openOthers = () => V.order.filter(id => id !== me && V.isl[id].l > 0);
      function bindDig() {
        elBody.addEventListener('click', e => {
          if (mode !== 'dig') return;
          const tab = e.target.closest('[data-t]');
          if (tab) { if (tab.disabled) return; selT = tab.dataset.t; aimC = -1; probeMode = false; api.sfx('tick'); api.send({ aim: { t: selT, c: -1 } }); drawDig(); layout(); return; }
          const b = e.target.closest('button');
          if (b && b.dataset.probe != null) { probeMode = !probeMode; api.sfx('pop'); drawDig(); return; }
          if (b && b.dataset.dig != null) { if (aimC >= 0 && selT) { api.send({ dig: { t: selT, c: aimC } }); api.sfx('whoosh'); api.vibrate(25); } return; }
          const c = e.target.closest('.tr-c');
          if (c && isMyTurn() && curMain === selT && isl[selT] && isl[selT].grid.contains(c)) tapDigCell(+c.dataset.i);
        });
      }
      const isMyTurn = () => V && V.ph === 'dig' && V.st === 'pick' && V.cur === me;
      function tapDigCell(i) {
        const d = V.isl[selT].d;
        if (probeMode) {
          const r = Math.min(i / G | 0, G - 2), c = Math.min(i % G, G - 2);
          api.send({ probe: { t: selT, c: r * G + c } }); probeMode = false; api.sfx('whoosh'); api.vibrate(30); drawDig(); return;
        }
        if (d[i] !== '.') { api.sfx('wrong'); api.toast(kid ? '這格挖過了' : '這格已經挖過了'); return; }
        if (kid || aimC === i) { api.send({ dig: { t: selT, c: i } }); api.sfx('whoosh'); api.vibrate(25); aimC = i; drawDig(); return; }
        aimC = i; api.sfx('tick'); api.send({ aim: { t: selT, c: i } }); drawDig();
      }
      function drawDig() {
        const v = V, my = isMyTurn();
        // which island goes in the big box
        if (my) {
          const opens = openOthers();
          if (!selT || !opens.includes(selT)) {
            selT = v.aim && opens.includes(v.aim.t) ? v.aim.t : opens[0] || null; aimC = -1;
            if (selT && (!v.aim || v.aim.t !== selT) && performance.now() - aimSent > 300) { aimSent = performance.now(); api.send({ aim: { t: selT, c: -1 } }); }
          }
          if (aimC >= 0 && v.isl[selT] && v.isl[selT].d[aimC] !== '.') aimC = -1;
        }
        let tgt = null;
        if (my) tgt = selT;
        else if ((v.st === 'pick' || v.st === 'rev') && v.aim && v.aim.t) tgt = v.aim.t;
        if (!tgt) tgt = me;
        const gb = elBody.querySelector('.tr-gbox.main');
        if (tgt !== curMain) {
          curMain = tgt;
          const key = tgt === me ? '_me' : tgt;
          if (!isl[key]) { isl[key] = Island(tgt, false); }
          gb.innerHTML = ''; gb.appendChild(isl[key].el); isl[key].pk = ''; isl[key].bk = ''; isl[key].curK = '';
          structKey = '';
        }
        const main = curMain === me ? isl._me : isl[curMain];
        const ownBig = curMain === me;
        // now panel
        const now = elBody.querySelector('.tr-now');
        let nk, nh;
        if (v.st === 'go') { nk = 'go'; nh = `<div class="tr-msg big">⛏️ 開挖！<small>大家輪流去挖別人的島</small></div>`; }
        else if (v.st === 'skip') { nk = 'sk' + v.cur + v.rd; nh = `<div class="tr-who">${av(v.cur, 96)}<div><b>${nm(v.cur)}${v.cur === me ? '（你）' : ''}</b><span>😵 踩到陷阱，這回合休息</span></div></div>`; }
        else if (v.st === 'rev' && v.last) { const L0 = v.last; nk = 'rv' + L0.seq; nh = `<div class="tr-who tr-res ${L0.r}${L0.full ? ' full' : ''}">${av(L0.by, 96)}<div><b>${nm(L0.by)}${L0.by === me ? '（你）' : ''}${L0.auto ? '<small>自動挖</small>' : ''}</b><span>${resultText(L0)} ${L0.g ? `<i>${gainTxt(L0.g)}</i>` : ''}</span>${L0.t === me && (L0.r === 'hit' || L0.r === 'trap') ? `<span class="warn">${L0.r === 'trap' ? '踩到你的陷阱了！😆' : '😱 你的寶藏被挖到了！'}</span>` : ''}</div></div>`; }
        else if (my) { nk = 'my' + v.dg + kid; nh = `<div class="tr-ys">${v.dg > 0 ? '✨ 挖到了！可以再挖一次・' : ''}${kid ? '選一座島，點一格挖下去！' : '選島 → 點格子瞄準 → 再點一次或按「挖！」'}</div>`; }
        else if (v.st === 'pick') {
          const t = v.aim && v.aim.t;
          nk = 'w' + v.cur + t + v.dg; nh = `<div class="tr-who">${av(v.cur, 96)}<div><b>${nm(v.cur)}${v.dg > 0 ? ' 再挖一次' : ''}</b><span>${t ? (t === me ? '<em class="you">正在挖你的島！🫣</em>' : `正在挖 ${nm(t)} 的島`) : (kid ? '在想要挖哪裡…' : '選島中…')}</span></div></div>`;
        } else { nk = '-'; nh = ''; }
        set(now, nk, nh);
        // tabs
        const tabs = elBody.querySelector('.tr-tabs');
        tabs.hidden = !my;
        if (my) set(tabs, JSON.stringify([selT, v.order.map(id => v.isl[id].l)]), v.order.filter(id => id !== me).map(id => {
          const l = v.isl[id].l;
          return `<button class="tr-tab ${id === selT ? 'on' : ''} ${l ? '' : 'closed'}" data-t="${id}" ${l ? '' : 'disabled'}>${av(id, 96)}<span class="n">${nm(id)}</span>${l ? dots(l) : '<span class="cl">挖光了</span>'}</button>`;
        }).join(''));
        // actions
        const acts = elBody.querySelector('.tr-acts');
        const used = v.isl[me].u;
        set(acts, JSON.stringify([my, aimC, probeMode, used, kid]), !my ? '' : kid
          ? `<div class="tr-tip">👆 點一格就會挖下去</div>`
          : `<button class="btn ghost tr-pbtn ${probeMode ? 'on' : ''}" data-probe ${used ? 'disabled' : ''}>🧭 ${used ? '探測器用過了' : probeMode ? '點一個 2×2 區域' : '探測器'}</button><button class="btn acc tr-dbtn" data-dig ${aimC >= 0 ? '' : 'disabled'}>⛏️ 挖！</button>`);
        // big island
        const tgtId = curMain;
        main.el.classList.toggle('probe', my && probeMode);
        main.el.classList.toggle('tgt', !ownBig && v.st !== 'go');
        main.el.classList.toggle('mine-big', ownBig);
        set(main.head, JSON.stringify([tgtId, v.sc[tgtId], v.isl[tgtId].l, ownBig, P(tgtId).name]),
          `<span class="tr-hav">${av(tgtId, 96)}</span><span class="tr-hn">${ownBig ? '我的島' : nm(tgtId) + ' 的島'}</span>${ownBig ? `<span class="tr-hl">還藏著 ${v.isl[me].l}/${TRE}</span>` : dots(v.isl[tgtId].l)}`);
        const probes = [];
        if (v.pr && v.pr.t === tgtId) probes.push(v.pr);
        else if (v.lp && v.lp.t === tgtId && performance.now() < lpUntil) probes.push({ c: v.lp.c, y: -1 });
        const showCur = (v.st === 'pick' || v.st === 'rev') && v.aim && v.aim.t === tgtId && (!my || v.st === 'rev');
        main.render({
          d: v.isl[tgtId].d, lay: ownBig ? v.mine : null,
          aimC: my && !probeMode ? aimC : -1, tap: my && !ownBig,
          cursor: showCur ? { p: v.cur, c: v.aim.c } : null, probes
        });
        // my small island
        const mineBox = elBody.querySelector('.tr-mine');
        mineBox.hidden = ownBig;
        mineBox.classList.toggle('small', v.cur === me && (v.st === 'pick' || v.st === 'rev'));
        if (!ownBig) {
          set(mineBox.querySelector('.tr-ml'), 'ml' + v.isl[me].l, `🏝️ 我的島・還藏著 <b>${v.isl[me].l}/${TRE}</b>`);
          mineI.render({ d: v.isl[me].d, lay: v.mine });
        }
        const sk = [my, ownBig, curMain, wide, v.st === 'go', mineBox.hidden, mineBox.classList.contains('small')].join();
        if (sk !== structKey) { structKey = sk; layout(); main.pk = ''; main.bk = ''; main.curK = ''; main.render(main.lastO); if (!ownBig) { mineI.pk = ''; mineI.render(mineI.lastO); } }
      }

      /* ---------- big moments ---------- */
      function ov(html, ms, cls) {
        elOv.className = 'tr-ov ' + (cls || ''); elOv.innerHTML = `<div class="tr-ovb">${html}</div>`; elOv.hidden = false;
        clearTimeout(ovT); ovT = setTimeout(() => { elOv.hidden = true; }, ms);
      }
      function moments(prev) {
        const v = V;
        if (v.ph === 'hide' && lastPh !== 'hide' && me) { api.vibrate(60); }
        if (v.ph === 'dig' && v.st === 'go' && lastSt !== 'go') ov(`<div class="tr-ovi">⛏️</div><div class="tr-ovt">開挖！</div>`, 1300, 'soft');
        if (v.ph === 'dig' && v.st === 'pick' && v.cur === me && me && (lastCur !== me || lastSt !== 'pick') && v.dg === 0) {
          api.sfx('turn'); api.vibrate([120, 60, 120]);
          ov(`<div class="tr-ovi">⛏️</div><div class="tr-ovt">輪到你了！</div>`, 1200, 'soft');
        }
        if (v.last && v.last.seq !== lastSeq) {
          const L0 = v.last, fresh = prev && lastSeq && L0.seq > lastSeq; lastSeq = L0.seq;
          if (fresh || (prev && !lastSeq)) {
            // burst on whichever island shows that cell
            Object.keys(isl).forEach(k => { const I = isl[k]; if (I && I.owner === L0.t) I.burst(L0.c, L0.r, L0.L); });
            if (mineI && L0.t === me && !elBody.querySelector('.tr-mine').hidden) mineI.burst(L0.c, L0.r, L0.L);
            api.sfx(L0.r === 'near' ? 'right' : L0.r === 'miss' ? 'pop' : L0.r === 'trap' ? 'boom' : L0.full ? 'star' : 'coin');
            if (me && L0.by === me) {
              if (L0.r === 'trap') { api.vibrate([200, 80, 200]); ov(`<div class="tr-ovi">💥</div><div class="tr-ovt">踩到陷阱！</div><div class="tr-ovs">${L0.g ? '-1⭐・' : ''}下回合休息</div>`, 1700, 'bad'); }
              else if (L0.full) { api.vibrate([60, 40, 160]); ov(`<div class="tr-ovi">${ico(L0.L)}</div><div class="tr-ovt">${kid ? `找到${NAME[L0.L]}了！` : L0.L === 'C' ? '挖到整個寶箱！' : `挖出整個${NAME[L0.L]}！`}</div><div class="tr-ovs">${gainTxt(L0.g)}</div>`, 1700, 'gold'); }
              else if (L0.r === 'hit') { api.vibrate(60); ov(`<div class="tr-ovi">✨</div><div class="tr-ovt">挖到寶藏了！</div><div class="tr-ovs">${gainTxt(L0.g)}・再挖一次</div>`, 1300, 'soft gold'); }
            }
            if (me && L0.t === me && L0.r === 'hit') { api.vibrate(250); }
            if (me && L0.t === me && L0.r === 'trap') { api.vibrate(80); }
          }
        }
        if (v.lp && v.lp.seq !== lastLp) {
          const fresh = !!lastLp || !!prev; lastLp = v.lp.seq;
          if (fresh) {
            lpUntil = performance.now() + 4500;
            if (me && v.lp.by === me && v.pr) { api.sfx(v.pr.y ? 'right' : 'wrong'); ov(`<div class="tr-ovi">🧭</div><div class="tr-ovt">${v.pr.y ? '這一區有寶藏！' : '這一區沒有寶藏'}</div>`, 1600, v.pr.y ? 'soft gold' : 'soft'); }
            else if (!me || v.lp.by !== me) api.toast(`🧭 ${P(v.lp.by).name} 用了探測器`);
          }
        }
        if (v.ph === 'end' && lastPh !== 'end') {
          const best = v.best || [];
          ov(`<div class="tr-ovi">🏁</div><div class="tr-ovt">遊戲結束！</div>${best.length ? `<div class="tr-ovs">🏆 最會藏寶：${best.map(id => nm(id)).join('、')} +${BEST_BONUS(kid)}⭐</div>` : ''}`, 2600);
          if (me && best.includes(me)) api.vibrate([80, 60, 80, 60, 200]);
        }
        lastCur = v.cur; lastSt = v.st; lastPh = v.ph;
      }

      // timer
      const timer = setInterval(() => {
        if (!V || !tTot) { elTm.hidden = true; elBar.style.width = '0'; return; }
        const rem = Math.max(0, (tEnd - performance.now()) / 1000), s = Math.ceil(rem);
        elTm.hidden = false; elTm.querySelector('b').textContent = s;
        elTm.classList.toggle('low', s <= 5);
        elBar.style.width = (rem / tTot * 100).toFixed(1) + '%';
        elBar.parentNode.classList.toggle('low', s <= 5);
        const mine = isMyTurn() || (V.ph === 'hide' && me && V.my && !V.my.rdy);
        if (mine && s <= 5 && s > 0 && s !== lastTick) { lastTick = s; api.sfx('tick'); }
        if (lpUntil && performance.now() > lpUntil) { lpUntil = 0; render(); }
        if (mode !== 'pub' && !wide && !drag && elBody.scrollHeight - elBody.clientHeight > 2) layout();
      }, 200);

      const cleanups = [];
      function render() {
        const v = V;
        const want = !me || v.ph === 'end' ? 'pub' : v.ph === 'hide' ? 'hide' : 'dig';
        if (want !== mode) { build(want); requestAnimationFrame(() => layout(true)); }
        drawTop();
        if (mode === 'pub') { drawPub(); }
        else if (mode === 'hide') { drawScores(); drawHide(); }
        else { drawScores(); drawDig(); }
      }

      return {
        view(v) {
          if (!v) return;
          const prev = V; V = v;
          tTot = v.tm || 0; tEnd = performance.now() + (v.tl || 0) * 1000;
          if (prev && (prev.st !== v.st || prev.cur !== v.cur || prev.ph !== v.ph)) lastTick = -1;
          if (v.ph === 'hide' && v.my) {
            myPl = v.my.pl.map(p => p ? p.slice() : null);
            myPl.forEach((p, k) => { if (p) ori[k] = p[1]; });
            if (sel < 0 || !PC[sel]) sel = 0;
          }
          if (!isMyTurn()) { probeMode = false; if (v.st !== 'rev') aimC = -1; }
          if (prev && prev.cur !== v.cur) { selT = null; aimC = -1; }
          if (!lastSeq && v.last && !prev) lastSeq = v.last.seq;
          if (!lastLp && v.lp && !prev) lastLp = v.lp.seq;
          render(); moments(prev);
          if (mode === 'pub' && (!prev || prev.ph !== v.ph)) layout(true);
        },
        destroy() { clearInterval(timer); clearTimeout(ovT); ro.disconnect(); cleanups.forEach(f => f()); document.querySelectorAll('.tr-ghost').forEach(g => g.remove()); }
      };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      const G = v.G, NC = G * G;
      if (v.ph === 'hide') {
        if (!v.my || v.my.rdy) return;
        const k = v.my.pl.findIndex(p => !p);
        if (k >= 0) { if (Math.random() < 0.35) { if (Math.random() < 0.5) api.send({ rand: 1 }); else api.send({ put: { k, c: rint(NC), o: rint(2) } }); } return; }
        if (Math.random() < 0.3) api.send({ ready: 1 });
        return;
      }
      if (v.ph !== 'dig' || v.st !== 'pick' || v.cur !== me || Math.random() > 0.45) return;
      const opens = v.order.filter(t => t !== me && v.isl[t].l > 0); if (!opens.length) return;
      if (!api.kid && !v.isl[me].u && Math.random() < 0.12) { api.send({ probe: { t: opens[rint(opens.length)], c: rint(G - 1) * G + rint(G - 1) } }); return; }
      if (!api.kid && v.aim && v.aim.t && v.aim.c >= 0 && v.isl[v.aim.t] && v.isl[v.aim.t].d[v.aim.c] === '.' && Math.random() < 0.7) { api.send({ dig: { t: v.aim.t, c: v.aim.c } }); return; }
      const t = opens[rint(opens.length)], d = v.isl[t].d, free = [];
      for (let i = 0; i < NC; i++) if (d[i] === '.') free.push(i);
      if (!free.length) return;
      const c = free[rint(free.length)];
      api.send(api.kid ? { dig: { t, c } } : { aim: { t, c } });
    }
  });

  const CSS = `
.tr{position:absolute;inset:0;overflow:hidden;color:var(--ink);background:linear-gradient(180deg,#63d8f2 0%,#2db5e4 50%,#1a92cf 100%)}
.tr.tr-adult{background:linear-gradient(180deg,#2f8fcb 0%,#1b6aa6 55%,#11497c 100%)}
.tr-waves{position:absolute;inset:-30px;pointer-events:none;opacity:.32;
  background-image:radial-gradient(ellipse 20px 7px at 50% 100%,transparent 70%,rgba(255,255,255,.9) 72%,rgba(255,255,255,.9) 84%,transparent 86%),radial-gradient(ellipse 14px 5px at 0 50%,transparent 68%,rgba(255,255,255,.6) 72%,transparent 86%);
  background-size:62px 34px,90px 50px;animation:tr-wave 9s linear infinite}
@keyframes tr-wave{to{background-position:62px 34px,-90px 50px}}
.tr-wrap{position:relative;height:100%;display:flex;flex-direction:column;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px))}
.tr-top{display:flex;align-items:center;gap:8px;flex:none}
.tr-rd{background:#fff;color:#0e6aa0;font-weight:900;font-size:14px;border-radius:999px;padding:5px 12px;font-family:var(--round);box-shadow:0 2px 0 rgba(0,40,80,.25);flex:none}
.tr-ph{flex:1;min-width:0;font-weight:900;font-size:19px;color:#fff;text-shadow:0 2px 0 rgba(0,40,80,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tr-tm{flex:none;font-family:var(--round);font-weight:700;font-size:20px;background:#fff;border-radius:999px;padding:3px 12px;box-shadow:0 2px 0 rgba(0,40,80,.25)}
.tr-tm::before{content:'⏱ ';font-size:15px}
.tr-tm.low{color:#fff;background:var(--bad);animation:tr-beat .5s infinite alternate}
.tr-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.3);overflow:hidden;flex:none;margin-top:-2px}
.tr-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#fff3a0,#ffd23f);border-radius:9px;transition:width .2s linear}
.tr-bar.low i{background:#ff6b6b}
.tr-body{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;position:relative}
.tr-myturn .tr-ph{color:#fff36b;animation:tr-beat .6s ease-in-out infinite alternate;transform-origin:left center}
/* score chips */
.tr-sc{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;padding:3px 2px;flex:none}
.tr-sc::-webkit-scrollbar{display:none}
.tr-chip{display:flex;align-items:center;gap:3px;background:rgba(255,255,255,.92);border-radius:999px;padding:1px 8px 1px 1px;font-weight:900;font-size:12.5px;flex:none;transition:transform .25s,box-shadow .25s}
.tr-chip img{width:24px;height:24px}
.tr-chip .n{max-width:4.5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tr-chip .s{font-family:var(--round);color:#e08600;font-size:15px}
.tr-chip .s::before{content:'⭐';font-size:11px}
.tr-chip em{font-style:normal;font-size:12px}
.tr-chip em.ok{color:var(--ok)}
.tr-chip.cur{box-shadow:0 0 0 3px #ffd23f,0 0 14px rgba(255,210,63,.8);transform:scale(1.05)}
.tr-chip.me{background:#fff8e1}
.tr-chip.off{opacity:.5}
.tr-dots{font-size:9px;letter-spacing:1px;color:#ffb300;white-space:nowrap}
.tr-dots s{text-decoration:none;color:rgba(0,0,0,.18)}
/* island */
.tr-isl{display:flex;flex-direction:column;align-items:center;gap:6px;--w:300px;--cs:50px}
.tr-ih{display:flex;align-items:center;gap:6px;font-weight:900;color:#fff;text-shadow:0 2px 0 rgba(0,40,80,.4);font-size:15px;flex-wrap:wrap;justify-content:center;min-height:30px}
.tr-ih em{font-style:normal;font-size:12px;background:rgba(255,255,255,.9);color:var(--ink);text-shadow:none;border-radius:999px;padding:1px 8px}
.tr-ih em.ok{color:var(--ok)}
.tr-ih em.best{background:#ffd23f}
.tr-ih .tr-dots{font-size:11px;background:rgba(255,255,255,.9);border-radius:999px;padding:2px 7px;text-shadow:none}
.tr-hav{width:30px;height:30px;display:grid;place-items:center;background:#fff;border-radius:50%;box-shadow:0 2px 0 rgba(0,40,80,.25)}
.tr-hav img{width:100%;height:100%}
.tr-hav.off{opacity:.45}
.tr-hs{font-family:var(--round);background:#fff;color:#e08600;border-radius:999px;padding:0 9px;text-shadow:none;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.tr-hs .tr-dots{font-size:.6em}
.tr-ih{flex-wrap:nowrap!important;white-space:nowrap}
.tr-hl{font-size:12px;background:rgba(255,255,255,.9);color:var(--ink);text-shadow:none;border-radius:999px;padding:1px 8px}
.tr-land{position:relative;padding:calc(var(--cs)*.2);border-radius:calc(var(--cs)*.55);background:radial-gradient(circle at 30% 20%,#ffeab0,#eec36a 70%,#d9a64b);
  box-shadow:0 0 0 5px rgba(255,255,255,.75),0 0 0 13px rgba(255,255,255,.22),0 14px 28px rgba(0,40,90,.35);transition:box-shadow .3s,transform .3s}
.tr-kid .tr-land{background:radial-gradient(circle at 30% 20%,#9be36a,#6cc644 70%,#4fa832);padding:calc(var(--cs)*.24)}
.tr-grid{position:relative;display:grid;grid-template-columns:repeat(var(--g),1fr);grid-template-rows:repeat(var(--g),1fr);gap:calc(var(--cs)*.06);width:var(--w);height:var(--w)}
.tr-c{position:relative;border-radius:calc(var(--cs)*.2);display:grid;place-items:center;transition:background .3s,transform .15s,box-shadow .2s}
.tr-c.u{background:radial-gradient(circle at 28% 30%,rgba(255,255,255,.45) 0 1.5px,transparent 2.5px) 0 0/11px 11px,linear-gradient(160deg,#fff0bf,#f5d283);box-shadow:inset 0 -3px 0 rgba(170,115,30,.25)}
.tr-c.u.alt{background:radial-gradient(circle at 28% 30%,rgba(255,255,255,.45) 0 1.5px,transparent 2.5px) 0 0/11px 11px,linear-gradient(160deg,#ffe9ac,#efc874)}
.tr-adult .tr-c.u{box-shadow:inset 0 -3px 0 rgba(150,100,20,.3),inset 0 0 0 1px rgba(150,100,20,.12)}
.tr-c.tap{cursor:pointer}
.tr-c.tap:active{transform:scale(.9)}
.tr-c.m{background:radial-gradient(circle at 50% 45%,#8e6326,#b88a45 70%);box-shadow:inset 0 5px 10px rgba(60,30,0,.5)}
.tr-c.m .tr-e{font-size:calc(var(--cs)*.34);opacity:.7}
.tr-c.m.nr{background:radial-gradient(circle at 50% 45%,#c2561b,#d98a3c 75%);box-shadow:inset 0 5px 10px rgba(90,20,0,.45),0 0 10px rgba(255,140,40,.6)}
.tr-c.m.nr .tr-e{opacity:1;font-size:calc(var(--cs)*.45);animation:tr-twinkle 1.4s ease-in-out infinite}
.tr-burst.near i{background:#ff8a2a}
.tr-news .r.near{color:#e0570b}
.tr-who.tr-res.near{background:#fff0e0}
.tr-c.h{background:radial-gradient(circle,#fff8c8,#ffd23f);box-shadow:0 0 12px rgba(255,220,80,.9),inset 0 -3px 0 rgba(200,140,0,.4)}
.tr-c.h .tr-e{animation:tr-twinkle 1.1s ease-in-out infinite}
.tr-c.x{background:radial-gradient(circle,#ffb199,#ff5f4a);box-shadow:inset 0 4px 8px rgba(120,0,0,.35)}
.tr-c.f{background:linear-gradient(160deg,#fff6c4,#ffd24a)}
.tr-c.sel{box-shadow:0 0 0 3px #fff,0 0 0 6px #ff7a45;z-index:1}
.tr-c.pv{background:#c5f5ad!important;box-shadow:0 0 0 3px #22c26a}
.tr-c.pvx{background:#ffc0c0!important;box-shadow:0 0 0 3px var(--bad)}
.tr-c.aim{background:linear-gradient(160deg,#ffe2c8,#ffb98a)!important;outline:4px solid #ff7a45;outline-offset:-2px;box-shadow:0 0 18px rgba(255,122,69,.95);animation:tr-aim .7s ease-in-out infinite alternate;z-index:1}
.tr-c.aim::after{content:'⛏️';font-size:calc(var(--cs)*.5);animation:tr-shovel .7s ease-in-out infinite}
.tr-e{font-size:calc(var(--cs)*.56);line-height:1;pointer-events:none}
.tr-chest{width:calc(var(--cs)*.8);height:auto;pointer-events:none;filter:drop-shadow(0 2px 0 rgba(90,46,12,.35))}
.tr-pcs,.tr-prbs{position:absolute;inset:0;pointer-events:none;z-index:2}
.tr-pco{position:absolute;display:grid;place-items:center;border-radius:calc(var(--cs)*.22)}
.tr-pco.own{background:rgba(255,255,255,.38);border:2.5px dashed rgba(150,95,20,.6)}
.tr-pco.own.trap{background:rgba(255,120,100,.25);border-color:rgba(200,40,40,.55)}
.tr-pco.rv{background:rgba(255,255,255,.5);border:3px dashed #ff7a45;animation:tr-popin .5s backwards}
.tr-pco.f,.tr-pco.lost{background:linear-gradient(160deg,#fff6c4,#ffcf3f);box-shadow:0 0 0 2px #fff,0 0 18px rgba(255,210,60,.95);animation:tr-popin .55s cubic-bezier(.3,1.6,.5,1)}
.tr-pco.lost{filter:saturate(.75) brightness(.97)}
.tr-pco .tr-chest{width:auto;height:calc(var(--cs)*.72)}
.tr-pco.n3 .tr-chest{height:calc(var(--cs)*.9)}
.tr-pco.n3.v .tr-chest{width:calc(var(--cs)*.92);height:auto}
.tr-pco.n2 .tr-e{font-size:calc(var(--cs)*.8)}
.tr-pco .tr-e{font-size:calc(var(--cs)*.62)}
.tr-tag{position:absolute;top:-9px;right:-6px;background:#ff5a5a;color:#fff;font-size:11px;font-style:normal;font-weight:900;border-radius:999px;padding:1px 6px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,.2)}
.tr-prb{position:absolute;border:3px dashed #fff;border-radius:calc(var(--cs)*.25);background:rgba(90,190,255,.22);display:flex;justify-content:center;animation:tr-popin .4s}
.tr-prb span{transform:translateY(-55%);background:#2f7de1;color:#fff;font-weight:900;font-size:12px;border-radius:999px;padding:1px 8px;white-space:nowrap;height:fit-content;box-shadow:0 2px 4px rgba(0,0,0,.2)}
.tr-prb.y{border-color:#7dff9b;background:rgba(80,230,120,.22)}.tr-prb.y span{background:var(--ok)}
.tr-prb.n span{background:#7a8296}
.tr-palm{position:absolute;font-size:calc(var(--cs)*.75);line-height:1;pointer-events:none;filter:drop-shadow(0 3px 2px rgba(0,40,80,.3))}
.tr-palm.p1{left:calc(var(--cs)*-.42);top:calc(var(--cs)*-.55)}
.tr-palm.p2{right:calc(var(--cs)*-.4);bottom:calc(var(--cs)*-.35);font-size:calc(var(--cs)*.6)}
.tr-adult .tr-palm{font-size:calc(var(--cs)*.6)}
.tr-deco{position:absolute;font-size:calc(var(--cs)*.42);line-height:1;pointer-events:none}
.tr-deco.d1{right:calc(var(--cs)*-.3);top:calc(var(--cs)*.2);animation:tr-crab 3.5s ease-in-out infinite}
.tr-deco.d2{left:calc(var(--cs)*-.28);bottom:calc(var(--cs)*.15)}
.tr-deco.d3{right:calc(var(--cs)*-.3);top:calc(var(--cs)*-.25);font-size:calc(var(--cs)*.38)}
.tr-isl.sm .tr-palm,.tr-isl.sm .tr-deco{display:none}
.tr-isl.sm .tr-land{box-shadow:0 0 0 3px rgba(255,255,255,.7),0 6px 14px rgba(0,40,90,.3)}
.tr-mask{position:absolute;inset:0;display:grid;place-items:center;border-radius:inherit;background:rgba(255,240,200,.45);pointer-events:none}
.tr-mask span{font-size:calc(var(--cs)*1.3);animation:tr-bob 1.6s ease-in-out infinite}
.tr-mask span.ok{width:calc(var(--cs)*1.6);height:calc(var(--cs)*1.6);border-radius:50%;background:var(--ok);color:#fff;display:grid;place-items:center;font-size:calc(var(--cs)*.9);font-weight:900;box-shadow:0 0 0 6px rgba(255,255,255,.8),0 8px 20px rgba(0,60,30,.3);animation:tr-popin .45s cubic-bezier(.3,1.6,.5,1)}
.tr-isl.tgt .tr-land{box-shadow:0 0 0 5px #ffd23f,0 0 0 12px rgba(255,210,63,.35),0 0 40px rgba(255,220,90,.9)}
.tr-isl.closed .tr-land{filter:saturate(.55) brightness(.95)}
.tr-isl.turn .tr-hav{box-shadow:0 0 0 3px #ffd23f,0 0 12px #ffd23f;animation:tr-bob 1s ease-in-out infinite}
.tr-isl.locked .tr-grid{opacity:.85}
.tr-isl.probe .tr-c.u{cursor:crosshair;box-shadow:inset 0 0 0 2px rgba(47,125,225,.6)}
/* cursor + bursts */
.tr-cur{position:absolute;z-index:3;width:calc(var(--cs)*.85);height:calc(var(--cs)*.85);transform:translate(-50%,-85%);pointer-events:none;
  transition:left .35s cubic-bezier(.3,1.3,.5,1),top .35s cubic-bezier(.3,1.3,.5,1)}
.tr-cur img{width:100%;height:100%;filter:drop-shadow(0 4px 3px rgba(0,0,0,.35));animation:tr-bob 1s ease-in-out infinite}
.tr-cur span{position:absolute;right:-38%;bottom:-18%;font-size:calc(var(--cs)*.55);transform-origin:20% 80%;animation:tr-shovel .9s ease-in-out infinite}
.tr-cur.think{transform:translate(-50%,-50%);width:calc(var(--cs)*1.1);height:calc(var(--cs)*1.1)}
.tr-cur.think span{animation:none;opacity:.8}
.tr-cur.dig span{animation:tr-dig .35s ease-in-out 3}
.tr-burst{position:absolute;z-index:4;width:0;height:0;pointer-events:none}
.tr-burst i{position:absolute;left:0;top:0;width:calc(var(--cs)*.14);height:calc(var(--cs)*.14);border-radius:50%;background:#e2ac4f;animation:tr-sand .85s cubic-bezier(.2,.7,.4,1) forwards}
.tr-burst.hit i{background:#ffd23f;box-shadow:0 0 6px #fff3a0}
.tr-burst.trap i{background:#ff5a3a}
.tr-burst b{position:absolute;left:0;top:0;font-size:calc(var(--cs)*.95);line-height:1;animation:tr-rise 1.4s ease-out forwards;font-weight:400}
.tr-burst b .tr-e{font-size:calc(var(--cs)*.95)}
.tr-burst b .tr-chest{width:calc(var(--cs)*1.2)}
/* hide + dig phone layouts */
.tr-hide,.tr-dig{display:flex;flex-direction:column;gap:8px;padding-bottom:6px}
.tr-gbox{display:flex;justify-content:center;padding:14px 0 6px}
.tr-gbox.mine{padding:6px 0 4px}
.tr-msg{background:rgba(255,255,255,.94);border-radius:18px;padding:10px 12px;text-align:center;font-weight:900;font-size:16px;line-height:1.5;box-shadow:0 3px 0 rgba(0,40,80,.2)}
.tr-msg small{display:block;font-size:12.5px;color:var(--mute);font-weight:700}
.tr-msg.ok{background:#eaffef;color:#127a40}
.tr-msg.big{font-size:22px;padding:14px}
.tr-tray{display:flex;gap:6px;justify-content:center}
.tr-tray .tr-pc{flex:1 1 0;min-width:0;max-width:110px}
.tr-tray:empty{display:none}
.tr-pc{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:rgba(255,255,255,.95);border-radius:16px;padding:6px 8px;min-width:64px;min-height:64px;border:3px solid transparent;box-shadow:0 3px 0 rgba(0,40,80,.22);transition:transform .15s,border-color .15s;touch-action:none}
.tr-pc.on{border-color:#ff7a45;transform:translateY(-3px);box-shadow:0 6px 0 rgba(0,40,80,.22)}
.tr-pc.done{background:rgba(235,255,240,.95)}
.tr-pc.done:not(.on){opacity:.7}
.tr-pc i{position:absolute;top:-6px;right:-6px;background:var(--ok);color:#fff;font-style:normal;font-size:12px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-weight:900}
.tr-pcn{font-size:12px;font-weight:900;line-height:1.1;text-align:center}
.tr-pcn small{display:block;color:var(--mute);font-size:10.5px}
.tr-blk{--c:26px;display:grid;place-items:center;width:calc(var(--c)*var(--len));height:var(--c);border-radius:8px;background:repeating-linear-gradient(90deg,#f5d283 0 calc(var(--c) - 2px),#e2b55e calc(var(--c) - 2px) var(--c));--cs:30px}
.tr-blk.v{width:var(--c);height:calc(var(--c)*var(--len));background:repeating-linear-gradient(180deg,#f5d283 0 calc(var(--c) - 2px),#e2b55e calc(var(--c) - 2px) var(--c))}
.tr-blk .tr-e{font-size:20px}
.tr-blk .tr-chest{width:34px}
.tr-kid .tr-pc{min-width:88px;min-height:88px;border-radius:22px}
.tr-kid .tr-blk{--c:52px;background:none}
.tr-kid .tr-blk .tr-e{font-size:46px}
.tr-kid .tr-pcn{font-size:15px}
.tr-acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;align-items:center}
.tr-acts:empty{display:none}
.tr-acts .btn{flex:1 1 auto;min-width:0}
.tr-acts .btn.pulse{animation:tr-beat .7s ease-in-out infinite alternate}
.tr-wait{background:rgba(255,255,255,.9);border-radius:14px;padding:10px 14px;font-weight:900;color:var(--mute)}
.tr-wait b{font-family:var(--round);color:var(--ink)}
.tr-tip{color:#fff;font-weight:900;font-size:17px;text-shadow:0 2px 0 rgba(0,40,80,.4);animation:tr-bob 1.2s ease-in-out infinite}
.tr-ghost{position:fixed;z-index:100;pointer-events:none;transform:translate(-50%,-50%) scale(1.08);display:grid;place-items:center;width:calc(var(--cs)*var(--len));height:var(--cs);border-radius:12px;background:rgba(255,240,190,.92);box-shadow:0 0 0 3px #ff7a45,0 10px 24px rgba(0,0,0,.3)}
.tr-ghost.v{width:var(--cs);height:calc(var(--cs)*var(--len))}
.tr-ghost .tr-e{font-size:calc(var(--cs)*.6)}
.tr-ghost .tr-chest{width:calc(var(--cs)*.9)}
.tr-now:empty{display:none}
.tr-yt{text-align:center;font-size:28px;font-weight:900;color:#fff36b;text-shadow:0 3px 0 rgba(0,40,80,.45);animation:tr-beat .6s ease-in-out infinite alternate}
.tr-ys{text-align:center;color:#fff;font-weight:900;font-size:14px;text-shadow:0 1px 0 rgba(0,40,80,.5)}
.tr-who{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.94);border-radius:18px;padding:6px 12px 6px 6px;box-shadow:0 3px 0 rgba(0,40,80,.2);animation:tr-slide .35s cubic-bezier(.3,1.4,.5,1)}
.tr-who img{width:52px;height:52px;flex:none}
.tr-who b{display:block;font-size:17px}
.tr-who b small{font-size:11px;color:var(--mute);margin-left:6px;background:#eef1fb;border-radius:999px;padding:0 6px}
.tr-who span{display:block;font-weight:900;font-size:15px;color:var(--mute)}
.tr-who span i{font-style:normal;color:#e08600;font-family:var(--round)}
.tr-who em.you{font-style:normal;color:var(--bad)}
.tr-who .warn{color:var(--bad);font-size:13px}
.tr-who.tr-res.hit span:first-of-type{color:#c98a00}
.tr-who.tr-res.full{background:linear-gradient(90deg,#fff6c4,#ffe27a)}
.tr-who.tr-res.trap{background:#ffe6e2}
.tr-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 2px;scrollbar-width:none}
.tr-tabs::-webkit-scrollbar{display:none}
.tr-tab{flex:1 0 74px;display:flex;flex-direction:column;align-items:center;gap:1px;background:rgba(255,255,255,.85);border-radius:16px;padding:3px 6px 4px;border:3px solid transparent;font-weight:900;font-size:13px;min-height:60px;transition:transform .2s,border-color .2s;box-shadow:0 3px 0 rgba(0,40,80,.2)}
.tr-tab img{width:32px;height:32px}
.tr-tab .n{max-width:5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tr-tab.on{border-color:#ff7a45;background:#fff;transform:translateY(-2px)}
.tr-tab.closed{opacity:.5}
.tr-tab .cl{font-size:11px;color:var(--mute)}
.tr-kid .tr-tab img{width:48px;height:48px}
.tr-pbtn.on{background:#2f7de1;color:#fff;border-color:#2f7de1;box-shadow:0 4px 0 #1b56a8}
.tr-dbtn{font-size:22px!important}
.tr-mine{background:rgba(255,255,255,.16);border-radius:20px;padding:6px 22px 4px;align-self:center}
.tr-ml{color:#fff;font-weight:900;font-size:14px;text-align:center;text-shadow:0 1px 0 rgba(0,40,80,.4)}
.tr-ml b{font-family:var(--round);color:#fff36b}
.tr-mine.small{padding:4px 14px 2px}
.tr-mine.small .tr-ml{font-size:12px}
.tr-isl.mine-big .tr-ih .tr-hn{color:#fff36b}
.tr-hide .tr-grid{touch-action:none}
.tr-hide>.tr-sc{order:0}.tr-hide>.tr-hint{order:1}.tr-hide>.tr-gbox{order:2}.tr-hide>.tr-tray{order:3}.tr-hide>.tr-acts{order:4}
/* landscape phones / tablets: island on the left, panel on the right */
.tr-wide .tr-hide{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"main sc" "main hint" "main tray" "main acts" "main x";grid-template-rows:auto auto auto auto 1fr;column-gap:16px;row-gap:8px;align-items:start}
.tr-wide .tr-hide>.tr-gbox{grid-area:main;align-self:center}
.tr-wide .tr-hide>.tr-sc{grid-area:sc}.tr-wide .tr-hide>.tr-hint{grid-area:hint}.tr-wide .tr-hide>.tr-tray{grid-area:tray}.tr-wide .tr-hide>.tr-acts{grid-area:acts}
.tr-wide .tr-dig{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"main sc" "main now" "main tabs" "main acts" "main mine";grid-template-rows:auto auto auto auto 1fr;column-gap:16px;row-gap:8px;align-items:start}
.tr-wide .tr-dig>.tr-gbox{grid-area:main;align-self:center}
.tr-wide .tr-dig>.tr-sc{grid-area:sc}.tr-wide .tr-dig>.tr-now{grid-area:now}.tr-wide .tr-dig>.tr-tabs{grid-area:tabs}.tr-wide .tr-dig>.tr-acts{grid-area:acts}.tr-wide .tr-dig>.tr-mine{grid-area:mine;justify-self:center}
.tr-wide .tr-gbox.main{padding:20px 8px 6px 18px}
.tr-wide .tr-gbox.main .tr-isl{position:relative}
.tr-wide .tr-gbox.main .tr-ih{position:absolute;top:-16px;left:50%;transform:translateX(-50%);z-index:6;min-height:0;background:rgba(10,70,120,.75);border-radius:999px;padding:2px 10px 2px 2px}
.tr-wide .tr-gbox.main .tr-hav{width:26px;height:26px}
.tr-wide .tr-wrap{gap:4px;padding-top:6px}
.tr-wide .tr-ph{font-size:17px}
.tr-wide .tr-rd{font-size:12px;padding:4px 10px}
.tr-wide .tr-tm{font-size:17px;padding:2px 10px}
/* public ocean map */
.tr-ocean{display:grid;justify-content:center;align-content:center;gap:12px 34px;min-height:100%;padding:18px 8px 64px}
.tr-ocean .tr-isl{animation:tr-float 5s ease-in-out infinite}
.tr-ocean .tr-isl:nth-child(2n){animation-delay:-2.5s}
.tr-ocean .tr-isl:nth-child(3n){animation-delay:-1.2s}
.tr-news{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.96);border-radius:999px;padding:6px 20px 6px 6px;font-weight:900;font-size:18px;box-shadow:0 8px 24px rgba(0,30,70,.35);white-space:nowrap;max-width:96%}
.tr-news.in{animation:tr-news .45s cubic-bezier(.3,1.5,.5,1)}
.tr-news img{width:44px;height:44px;flex:none}
.tr-news .r img{width:30px;height:30px;vertical-align:middle;margin:0 2px}
.tr-news .r.hit{color:#c98a00}.tr-news .r.trap{color:var(--bad)}.tr-news .r.miss{color:#2a7bb8}
.tr-news .r.full{color:#d97800}
.tr-news .r.big{padding:6px 10px}
.tr-news i{font-style:normal;font-family:var(--round);color:#e08600;background:#fff3c4;border-radius:999px;padding:0 10px}
.tr-news.pick{background:rgba(255,255,255,.85)}
.tr-boat{position:absolute;top:38%;left:-80px;font-size:34px;pointer-events:none;opacity:.85;animation:tr-sail 46s linear infinite;filter:drop-shadow(0 4px 2px rgba(0,30,60,.3))}
.tr-boat.b2{top:auto;bottom:16%;font-size:28px;animation:tr-swim 31s linear -12s infinite}
.tr-tv .tr-boat{font-size:56px}.tr-tv .tr-boat.b2{font-size:44px}
@keyframes tr-sail{from{transform:translateX(0)}to{transform:translateX(calc(100vw + 160px))}}
@keyframes tr-swim{0%{transform:translateX(calc(100vw + 100px)) scaleX(1)}100%{transform:translateX(-100px) scaleX(1)}}
/* big screen */
.tr-tv .tr-wrap{padding:14px 28px 18px;gap:10px}
.tr-tv .tr-rd{font-size:24px;padding:8px 20px}
.tr-tv .tr-ph{font-size:38px}
.tr-tv .tr-tm{font-size:34px;padding:4px 20px}
.tr-tv .tr-bar{height:10px}
.tr-tv .tr-ih{font-size:24px;gap:10px}
.tr-tv .tr-hav{width:52px;height:52px}
.tr-tv .tr-ih em{font-size:18px;padding:2px 12px}
.tr-tv .tr-ih .tr-dots{font-size:16px}
.tr-tv .tr-top .tr-news{position:static;transform:none;flex:1;min-width:0;max-width:none;justify-content:flex-start;font-size:32px;padding:4px 26px 4px 4px;box-shadow:0 4px 0 rgba(0,40,80,.25);overflow:hidden}
.tr-tv .tr-top .tr-news.in{animation:tr-pop2 .35s cubic-bezier(.3,1.5,.5,1)}
@keyframes tr-pop2{from{transform:scale(.94);opacity:.5}}
.tr-tv .tr-top .tr-news.pick{background:rgba(255,255,255,.92)}
.tr-tv.tr-hasnews .tr-ph{display:none}
.tr-tv .tr-news img{width:58px;height:58px}
.tr-tv .tr-news .r img{width:42px;height:42px}
.tr-tv .tr-ocean{padding-bottom:18px}
.tr-tv .tr-prb span{font-size:18px}
.tr-tv .tr-cur{width:calc(var(--cs)*1.15);height:calc(var(--cs)*1.15)}
.tr-tv .tr-cur span{font-size:calc(var(--cs)*.7)}
.tr-tv .tr-tag{font-size:15px}
/* overlay */
.tr-ov{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(0,30,70,.4);animation:tr-fade .2s;pointer-events:none}
.tr-ov.soft{background:rgba(0,30,70,.18)}
.tr-ovb{background:#fff;border-radius:30px;padding:18px 34px;text-align:center;border:5px solid #2db5e4;animation:tr-stamp .5s cubic-bezier(.3,1.6,.5,1);box-shadow:0 20px 60px rgba(0,0,0,.3);max-width:90%}
.tr-ov.gold .tr-ovb{border-color:#ffd23f;background:linear-gradient(160deg,#fffbe6,#fff0b0)}
.tr-ov.bad .tr-ovb{border-color:#ff5a5a}
.tr-ovi{font-size:68px;line-height:1.1;--cs:110px}
.tr-ovi .tr-e{font-size:68px}
.tr-ovt{font-size:30px;font-weight:900}
.tr-ovs{font-size:17px;font-weight:900;color:var(--mute);margin-top:4px}
.tr-tv .tr-ovb{padding:30px 60px}.tr-tv .tr-ovi{font-size:110px}.tr-tv .tr-ovt{font-size:52px}.tr-tv .tr-ovs{font-size:28px}
@keyframes tr-beat{to{transform:scale(1.06)}}
@keyframes tr-bob{50%{transform:translateY(-4px)}}
@keyframes tr-float{50%{transform:translateY(-6px)}}
@keyframes tr-twinkle{50%{transform:scale(1.25) rotate(12deg)}}
@keyframes tr-aim{to{box-shadow:0 0 30px rgba(255,122,69,1);transform:scale(1.05)}}
@keyframes tr-shovel{50%{transform:rotate(-22deg)}}
@keyframes tr-dig{0%{transform:rotate(0)}40%{transform:rotate(-45deg) translateY(-6px)}100%{transform:rotate(15deg) translateY(4px)}}
@keyframes tr-crab{0%,100%{transform:translateX(0)}50%{transform:translateX(calc(var(--cs)*.25))}}
@keyframes tr-sand{0%{transform:translate(-50%,-50%) scale(1.1);opacity:1}100%{transform:translate(calc(var(--dx)*var(--cs) - 50%),calc(var(--dy)*var(--cs) - 50%)) scale(.3);opacity:0}}
@keyframes tr-rise{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}22%{transform:translate(-50%,-85%) scale(1.45);opacity:1}70%{transform:translate(-50%,-115%) scale(1.1);opacity:1}100%{transform:translate(-50%,-150%) scale(1);opacity:0}}
@keyframes tr-popin{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes tr-stamp{0%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes tr-fade{from{opacity:0}}
@keyframes tr-slide{from{transform:translateY(10px);opacity:0}}
@keyframes tr-news{0%{transform:translate(-50%,40px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
`;
})();

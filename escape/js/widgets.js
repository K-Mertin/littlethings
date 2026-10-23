'use strict';
// 共用謎題小工具：轉輪鎖、按鍵鎖、順序機關、滑動拼圖、點燈、時鐘
const W = {
  success(C, body, msg, ok, delay = 900) {
    Snd.play('unlock'); setTimeout(() => Snd.play('solve'), 250);
    const m = body.querySelector('.msg'); if (m) { m.className = 'msg ok'; m.textContent = msg || '喀嚓！打開了！'; }
    const fx = document.createElement('div'); fx.className = 'solved';
    let conf = ''; const cols = ['#f2c46b', '#e0703f', '#4f9e9a', '#e57aa8', '#6fae5a', '#4f8ad8'];
    for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 200; conf += `<i style="background:${cols[i % 6]};--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 60).toFixed(0)}px;animation-delay:${(Math.random() * 0.15).toFixed(2)}s"></i>`; }
    fx.innerHTML = conf + '<b>解開了！</b>';
    $('#panel').appendChild(fx); $('#panel').scrollTop = 0;
    body.querySelectorAll('button').forEach(b => { if (!b.classList.contains('x')) b.disabled = true; });
    setTimeout(() => { fx.remove(); $('#modal').hidden = true; $('#mBody').innerHTML = ''; G.onClose = null; ok(C); C.save(); C.render(); }, delay + 300);
  },
  fail(body, msg) {
    Snd.play('wrong'); const m = body.querySelector('.msg'); if (m) { m.className = 'msg'; m.textContent = msg || '好像不對……'; }
    const p = $('#panel'); p.classList.remove('nope'); void p.offsetWidth; p.classList.add('nope');
  },

  // 轉輪密碼鎖
  wheels(C, o) {
    const key = 'w_' + o.id; const idx = (C.s[key] || o.wheels.map(() => 0)).slice();
    const val = (w, i) => w.vals[idx[i]];
    const draw = () => o.wheels.map((w, i) => `<div class="wheel">${w.label !== undefined ? `<div class="wl">${w.label}</div>` : ''}<button class="up" data-w="u${i}">▲</button><div class="wv ${w.kind || ''}" data-w="v${i}">${val(w, i)}</div><button class="dn" data-w="d${i}">▼</button></div>`).join('');
    const body = G.modal(`<h3>${o.title}</h3>${o.sub ? `<p class="sub">${o.sub}</p>` : ''}${o.extra || ''}<div class="wheels">${draw()}</div><p class="msg"></p><div class="btnRow"><button class="ok" data-w="ok">${o.okText || '試試看'}</button></div>`, { w: o.w || 520 });
    const upd = () => { body.querySelector('.wheels').innerHTML = draw(); C.s[key] = idx.slice(); };
    body.onclick = e => {
      const b = e.target.closest('[data-w]'); if (!b || b.disabled) return;
      const k = b.dataset.w, i = +k.slice(1);
      if (k === 'ok') {
        const vals = o.wheels.map((w, j) => w.vals[idx[j]]);
        if (o.check(idx.slice(), vals)) W.success(C, body, o.okMsg, o.ok);
        else W.fail(body, o.failMsg);
        return;
      }
      const n = o.wheels[i].vals.length;
      if (k[0] === 'u' || k[0] === 'v') idx[i] = (idx[i] + 1) % n; else idx[i] = (idx[i] + n - 1) % n;
      Snd.play('click'); upd();
    };
  },

  // 數字按鍵鎖
  keypad(C, o) {
    let cur = '';
    const body = G.modal(`<h3>${o.title}</h3>${o.sub ? `<p class="sub">${o.sub}</p>` : ''}${o.extra || ''}<div class="kpDisp">${'·'.repeat(o.len)}</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}<button data-k="c" style="font-size:16px">清除</button><button data-k="0">0</button><button data-k="ok" style="background:linear-gradient(180deg,#f6a06f,#e0703f);color:#3a1300;font-size:16px">確定</button></div><p class="msg"></p>`, { w: 400 });
    const disp = body.querySelector('.kpDisp');
    const upd = () => disp.textContent = cur.padEnd(o.len, '·');
    body.onclick = e => {
      const b = e.target.closest('[data-k]'); if (!b || b.disabled) return;
      const k = b.dataset.k;
      if (k === 'c') { cur = ''; Snd.play('tap'); }
      else if (k === 'ok') { if (cur === o.code) { W.success(C, body, o.okMsg, o.ok); return; } W.fail(body, o.failMsg); cur = ''; }
      else if (cur.length < o.len) { cur += k; Snd.tone(900 + (+k) * 60, 0.08, 'square', 0.04); }
      upd();
    };
  },

  // 依順序按的機關（鋼琴、鈴鐺、彩色按鈕）
  seq(C, o) {
    let cur = [];
    const body = G.modal(`<h3>${o.title}</h3>${o.sub ? `<p class="sub">${o.sub}</p>` : ''}${o.extra || ''}<div class="seqKeys" style="${o.wrapStyle || 'display:flex;justify-content:center;gap:8px;flex-wrap:wrap'}">${o.keys.map(k => `<button data-k="${k.id}" style="${k.style || ''}">${k.html}</button>`).join('')}</div><div class="seqDots" style="display:flex;justify-content:center;gap:6px;margin-top:10px;min-height:16px"></div><p class="msg"></p>`, { w: o.w || 560 });
    const dots = body.querySelector('.seqDots');
    const upd = () => dots.innerHTML = Array.from({ length: o.len }, (_, i) => `<i style="width:14px;height:14px;border-radius:50%;background:${i < cur.length ? (o.dotColor ? o.dotColor(cur[i]) : '#e0703f') : '#e4d2b0'};display:block"></i>`).join('');
    upd();
    body.onclick = e => {
      const b = e.target.closest('[data-k]'); if (!b || b.disabled) return;
      const k = o.keys.find(x => x.id === b.dataset.k); k.play && k.play();
      b.style.transform = 'translateY(3px)'; setTimeout(() => b.style.transform = '', 120);
      cur.push(k.id); upd();
      if (cur.length >= o.len) {
        if (cur.join(',') === o.answer.join(',')) W.success(C, body, o.okMsg, o.ok, 1200);
        else { setTimeout(() => { W.fail(body, o.failMsg || '順序好像不對，重新來一次。'); cur = []; upd(); }, 350); }
      }
    };
  },

  // 3×3 滑動拼圖。img(): 回傳 300×300 的圖
  slideStart(seedMoves) { // 從完成狀態用固定步驟打亂（一定有解）
    const t = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    let e = 8, prev = -1, r = 7;
    for (let i = 0; i < seedMoves; i++) {
      const nb = W.nbr(e).filter(x => x !== prev);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const p = nb[r % nb.length];
      t[e] = t[p]; t[p] = 8; prev = e; e = p;
    }
    return t;
  },
  // 隨機打亂（保證有解、而且離完成夠遠）
  slideRandom() {
    for (let tries = 0; tries < 50; tries++) {
      const t = [0, 1, 2, 3, 4, 5, 6, 7, 8]; let e = 8, prev = -1;
      for (let i = 0; i < 160 + tries; i++) { const nb = W.nbr(e).filter(x => x !== prev), p = nb[Math.floor(Math.random() * nb.length)]; t[e] = t[p]; t[p] = 8; prev = e; e = p; }
      let man = 0, wrong = 0; t.forEach((v, p) => { if (v !== 8) { man += Math.abs(v % 3 - p % 3) + Math.abs(((v / 3) | 0) - ((p / 3) | 0)); if (v !== p) wrong++; } });
      if (man >= 14 && wrong >= 7) return t;
    }
    return [7, 3, 1, 6, 8, 2, 5, 0, 4];
  },
  nbr(p) { const x = p % 3, y = (p / 3) | 0, o = []; if (x > 0) o.push(p - 1); if (x < 2) o.push(p + 1); if (y > 0) o.push(p - 3); if (y < 2) o.push(p + 3); return o; },
  slide(C, o) {
    const key = 'slide_' + o.id;
    if (!C.s[key]) C.s[key] = W.slideRandom();
    const t = C.s[key]; const nk = key + '_n';
    const art = o.img();
    const draw = () => {
      let s = `<svg class="wsvg" viewBox="-6 -6 312 312" style="max-width:420px;margin:0 auto"><rect x="-6" y="-6" width="312" height="312" rx="10" fill="#6b4a33"/>`;
      t.forEach((v, p) => {
        const x = (p % 3) * 100, y = ((p / 3) | 0) * 100;
        if (v === 8) { s += `<rect x="${x + 2}" y="${y + 2}" width="96" height="96" rx="6" fill="#3b2a1f"/>`; return; }
        const sx = (v % 3) * 100, sy = ((v / 3) | 0) * 100;
        s += `<g style="cursor:pointer"><svg x="${x + 2}" y="${y + 2}" width="96" height="96" viewBox="${sx + 2} ${sy + 2} 96 96">${art}</svg><rect x="${x + 2}" y="${y + 2}" width="96" height="96" rx="6" fill="none" stroke="#3b2a1f" stroke-width="3"/><rect data-t="${p}" x="${x + 2}" y="${y + 2}" width="96" height="96" fill="transparent"/></g>`;
      });
      return s + '</svg>';
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="sp">${draw()}</div><p class="msg">已移動 ${C.s[nk] || 0} 步</p><div class="btnRow"><button class="sec" data-r="1">看完成的樣子</button></div>`, { w: 480 });
    const solved = () => t.every((v, i) => v === i);
    body.onclick = e => {
      if (e.target.closest('[data-r]')) {
        const sp = body.querySelector('.sp'); sp.innerHTML = `<svg class="wsvg" viewBox="0 0 300 300" style="max-width:420px;margin:0 auto;opacity:.9">${o.preview ? o.preview() : art}</svg>`;
        setTimeout(() => { if (body.isConnected) sp.innerHTML = draw(); }, 1500); return;
      }
      const g = e.target.closest('[data-t]'); if (!g || C.s[key + '_ok']) return;
      const p = +g.dataset.t, eI = t.indexOf(8);
      if (!W.nbr(eI).includes(p)) return;
      t[eI] = t[p]; t[p] = 8; Snd.play('slide'); C.s[nk] = (C.s[nk] || 0) + 1;
      body.querySelector('.sp').innerHTML = draw(); body.querySelector('.msg').textContent = `已移動 ${C.s[nk]} 步`;
      if (solved()) { C.s[key + '_ok'] = 1; if (C.s[nk] <= 60) G.ach('slide'); W.success(C, body, (o.okMsg || '拼好了！') + `（${C.s[nk]} 步）`, o.ok, 1400); }
    };
  },

  // 點燈（按一顆，自己和上下左右都會切換）
  lights(C, o) {
    const key = 'lights_' + o.id;
    if (!C.s[key]) { const L = Array(9).fill(1); (typeof o.start === 'function' ? o.start() : o.start).forEach(p => { [p, ...W.nbr(p)].forEach(q => L[q] ^= 1); }); C.s[key] = L; }
    const L = C.s[key];
    const draw = () => {
      let s = `<svg class="wsvg" viewBox="0 0 320 320" style="max-width:380px;margin:0 auto"><rect width="320" height="320" rx="22" fill="#4b5d9a" stroke="#2c3560" stroke-width="6"/>`;
      L.forEach((v, p) => {
        const cx = 60 + (p % 3) * 100, cy = 60 + ((p / 3) | 0) * 100;
        s += `<g style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="44" fill="${v ? '#fff3b8' : '#36427a'}" opacity="${v ? 0.35 : 1}"/>${A.star(cx, cy + 2, 34, v ? '#ffd84a' : '#5a68a8', `stroke="${v ? '#b07a1a' : '#2c3560'}" stroke-width="4" stroke-linejoin="round"`)}<circle data-p="${p}" cx="${cx}" cy="${cy}" r="48" fill="transparent"/></g>`;
      });
      return s + '</svg>';
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="lt">${draw()}</div><p class="msg"></p><div class="btnRow"><button class="sec" data-reset="1">重新來過</button></div>`, { w: 440 });
    body.onclick = e => {
      if (C.s[key + '_ok']) return;
      if (e.target.closest('[data-reset]')) { delete C.s[key]; W.lights(C, o); return; }
      const g = e.target.closest('[data-p]'); if (!g) return;
      const p = +g.dataset.p;[p, ...W.nbr(p)].forEach(q => L[q] ^= 1);
      Snd.tone(L[p] ? 1200 : 700, 0.1, 'triangle', 0.06);
      body.querySelector('.lt').innerHTML = draw();
      if (L.every(v => v)) { C.s[key + '_ok'] = 1; W.success(C, body, o.okMsg, o.ok, 1300); }
    };
  },

  // 時鐘指針
  clock(C, o) {
    const key = 'clock_' + o.id; const st = C.s[key] || (C.s[key] = { h: 12, m: 0 });
    const face = () => {
      const ha = ((st.h % 12) + st.m / 60) * 30, ma = st.m * 6;
      let s = `<svg class="wsvg" viewBox="0 0 300 300" style="max-width:300px;margin:0 auto"><circle cx="150" cy="150" r="138" fill="url(#brass)" ${SW}/><circle cx="150" cy="150" r="122" fill="#fffaf0" ${SW}/>`;
      for (let i = 1; i <= 12; i++) { const a = i * 30 * Math.PI / 180; s += A.txt(150 + Math.sin(a) * 98, 150 - Math.cos(a) * 98 + 9, ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'][i - 1], 24, '#4a3222', 'middle', 700, 'font-family="serif"'); }
      for (let i = 0; i < 60; i++) { const a = i * 6 * Math.PI / 180, r1 = i % 5 ? 116 : 110; s += `<path d="M${150 + Math.sin(a) * r1} ${150 - Math.cos(a) * r1}L${150 + Math.sin(a) * 120} ${150 - Math.cos(a) * 120}" stroke="#4a3222" stroke-width="${i % 5 ? 1.5 : 3}"/>`; }
      s += `<path d="M150 150L150 88" stroke="#4a3222" stroke-width="10" stroke-linecap="round" transform="rotate(${ha} 150 150)"/>`;
      if (o.hasMin()) s += `<path d="M150 162L150 50" stroke="#c4502c" stroke-width="6" stroke-linecap="round" transform="rotate(${ma} 150 150)"/>`;
      return s + `<circle cx="150" cy="150" r="9" fill="url(#brass)" ${SW2}/></svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="cf">${face()}</div>
      <div class="btnRow"><button class="sec" data-c="h-">時針 ◀</button><button class="sec" data-c="h+">時針 ▶</button>${o.hasMin() ? '<button class="sec" data-c="m-">分針 ◀</button><button class="sec" data-c="m+">分針 ▶</button>' : ''}</div>
      <p class="msg"></p><div class="btnRow"><button class="ok" data-c="ok">就是這個時間</button></div>`, { w: 460 });
    body.onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b || b.disabled) return;
      const c = b.dataset.c;
      if (c === 'ok') { if (o.check(st)) W.success(C, body, o.okMsg, o.ok, 1200); else W.fail(body, o.failMsg); return; }
      if (c === 'h+') st.h = st.h % 12 + 1; if (c === 'h-') st.h = (st.h + 10) % 12 + 1;
      if (c === 'm+') st.m = (st.m + 5) % 60; if (c === 'm-') st.m = (st.m + 55) % 60;
      Snd.play('click'); body.querySelector('.cf').innerHTML = face();
    };
  },
  // 倒果汁（三個壺，倒出剛好的量）。o.cap=[大,中,小]，第一個壺一開始是滿的
  pour(C, o) {
    const key = 'pour_' + o.id, cap = o.cap;
    if (!C.s[key]) C.s[key] = [cap[0], 0, 0];
    const v = C.s[key]; let sel = -1, moves = 0;
    const draw = () => {
      let q = `<svg class="wsvg" viewBox="0 0 600 330" style="max-width:560px;margin:0 auto">`;
      cap.forEach((c, i) => {
        const w = 70 + c * 6, h = 60 + c * 16, x = 100 + i * 200 - w / 2, y = 290 - h, lv = v[i] / c * (h - 16);
        q += `<g data-j="${i}" style="cursor:pointer">${A.sh(100 + i * 200, 294, w * 0.6, 8)}<rect x="${x - 10}" y="${y - 30}" width="${w + 20}" height="${h + 44}" fill="transparent"/>`;
        q += `<path d="M${x} ${y}h${w}v${h - 10}q0 10-10 10h${-(w - 20)}q-10 0-10-10z" fill="#e8f4f8" fill-opacity=".55" ${SW}/>`;
        if (v[i]) q += `<path d="M${x + 3} ${290 - lv - 3}h${w - 6}v${lv - 8}q0 8-8 8h${-(w - 22)}q-8 0-8-8z" fill="#8a3a8a"/><path d="M${x + 3} ${290 - lv - 3}h${w - 6}" stroke="#c070c0" stroke-width="4"/>`;
        for (let k = 1; k < c; k++) { const yy = 290 - 8 - k / c * (h - 16); q += `<path d="M${x} ${yy}h${k % 5 === 0 ? 18 : 10}" stroke="#4a3222" stroke-width="2"/>`; }
        q += `<path d="M${x + w} ${y + 16}q26 4 22 30q-2 20-22 24" fill="none" ${SW}/><rect x="${x}" y="${y}" width="${w * 0.35}" height="${h}" fill="url(#shine)" opacity=".5" pointer-events="none"/>`;
        q += `<rect x="${100 + i * 200 - 34}" y="${y - 30}" width="68" height="24" rx="12" fill="${sel === i ? '#e0703f' : '#7a5638'}"/>` + A.txt(100 + i * 200, y - 13, `${v[i]} / ${c} 升`, 15, '#fff3dc', 'middle', 900);
        if (sel === i) q += `<path d="M${x - 6} ${y - 6}h${w + 12}v${h + 12}h${-(w + 12)}z" fill="none" stroke="#e0703f" stroke-width="4" stroke-dasharray="10 6" rx="8"/>`;
        q += `</g>`;
      });
      return q + `</svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="pw">${draw()}</div><p class="msg"></p><div class="btnRow"><button class="sec" data-r="1">倒回大桶、重新來過</button></div>`, { w: 620 });
    const upd = () => body.querySelector('.pw').innerHTML = draw();
    body.onclick = e => {
      if (C.s[key + '_ok']) return;
      if (e.target.closest('[data-r]')) { v.splice(0, 3, cap[0], 0, 0); sel = -1; moves = 0; Snd.play('water'); upd(); body.querySelector('.msg').textContent = ''; return; }
      const g = e.target.closest('[data-j]'); if (!g) return;
      const i = +g.dataset.j;
      if (sel < 0) { if (!v[i]) { W.fail(body, '這個壺是空的。'); return; } sel = i; Snd.play('select'); upd(); return; }
      if (sel === i) { sel = -1; upd(); return; }
      const m = Math.min(v[sel], cap[i] - v[i]);
      if (!m) { W.fail(body, '倒不進去了，那個壺已經滿了。'); sel = -1; upd(); return; }
      v[sel] -= m; v[i] += m; sel = -1; moves++; Snd.play('water'); upd();
      body.querySelector('.msg').className = 'msg'; body.querySelector('.msg').textContent = `倒了 ${moves} 次`;
      if (v.includes(o.goal)) { C.s[key + '_ok'] = 1; W.success(C, body, o.okMsg, o.ok, 1300); }
      C.save();
    };
  },

  // 轉水管：點方塊旋轉 90 度，讓水從左邊流到右邊
  // 管子開口用位元表示：上 1、右 2、下 4、左 8
  pipeRot(m, r) { for (let i = 0; i < r; i++) m = ((m << 1) | (m >> 3)) & 15; return m; },
  pipeFlow(g, rows, cols, inR, outR) {
    const op = (r, c) => W.pipeRot(g[r][c].m, g[r][c].r);
    const seen = new Set(), st = [];
    if (op(inR, 0) & 8) { st.push([inR, 0]); seen.add(inR + ',0'); }
    while (st.length) {
      const [r, c] = st.pop(), m = op(r, c);
      [[1, -1, 0, 4], [2, 0, 1, 8], [4, 1, 0, 1], [8, 0, -1, 2]].forEach(([b, dr, dc, back]) => {
        if (!(m & b)) return; const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
        if (!(op(nr, nc) & back) || seen.has(nr + ',' + nc)) return;
        seen.add(nr + ',' + nc); st.push([nr, nc]);
      });
    }
    return { seen, ok: seen.has(outR + ',' + (cols - 1)) && !!(op(outR, cols - 1) & 2) };
  },
  pipes(C, o) {
    const g = C.s[o.key], rows = g.length, cols = g[0].length, cs = 100;
    const draw = () => {
      const f = W.pipeFlow(g, rows, cols, o.inR, o.outR);
      let q = `<svg class="wsvg" viewBox="-70 -20 ${cols * cs + 140} ${rows * cs + 40}" style="max-width:640px;margin:0 auto"><rect x="-10" y="-10" width="${cols * cs + 20}" height="${rows * cs + 20}" rx="14" fill="#4a4038" ${SW}/>`;
      q += `<rect x="-70" y="${o.inR * cs + 34}" width="70" height="32" fill="#9aa6b0" ${SW2}/><circle cx="-46" cy="${o.inR * cs + 50}" r="20" fill="#e0504a" ${SW2}/>` + A.txt(-46, o.inR * cs + 18, '進水', 15, '#fff3dc');
      q += `<rect x="${cols * cs}" y="${o.outR * cs + 34}" width="70" height="32" fill="#9aa6b0" ${SW2}/>` + A.txt(cols * cs + 36, o.outR * cs + 18, '出水', 15, '#fff3dc');
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const m = W.pipeRot(g[r][c].m, g[r][c].r), x = c * cs, y = r * cs, wet = f.seen.has(r + ',' + c);
        q += `<g data-p="${r},${c}" style="cursor:pointer"><rect x="${x + 4}" y="${y + 4}" width="${cs - 8}" height="${cs - 8}" rx="10" fill="#6a5a4a" ${SW2}/>`;
        const col = wet ? '#5fb8e8' : '#b8c2cc', arm = { 1: `M${x + 50} ${y + 50}V${y}`, 2: `M${x + 50} ${y + 50}H${x + 100}`, 4: `M${x + 50} ${y + 50}V${y + 100}`, 8: `M${x + 50} ${y + 50}H${x}` };
        let d = ''; [1, 2, 4, 8].forEach(b => { if (m & b) d += arm[b]; });
        q += `<path d="${d}" stroke="#2a1a10" stroke-width="30" stroke-linecap="square"/><path d="${d}" stroke="${col}" stroke-width="20" stroke-linecap="square"/>${wet ? `<path d="${d}" stroke="#d8f2ff" stroke-width="5" stroke-dasharray="8 12" class="flowA"/>` : ''}<circle cx="${x + 50}" cy="${y + 50}" r="14" fill="${col}" ${SW2}/></g>`;
      }
      return q + `</svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="pp">${draw()}</div><p class="msg"></p>`, { w: 700, cls: 'wide' });
    body.onclick = e => {
      if (C.s[o.key + '_ok']) return;
      const t = e.target.closest('[data-p]'); if (!t) return;
      const [r, c] = t.dataset.p.split(',').map(Number); g[r][c].r = (g[r][c].r + 1) % 4; Snd.play('click');
      body.querySelector('.pp').innerHTML = draw(); C.save();
      if (W.pipeFlow(g, rows, cols, o.inR, o.outR).ok) { C.s[o.key + '_ok'] = 1; Snd.play('water'); W.success(C, body, o.okMsg, o.ok, 1500); }
    };
  },

  // 踩石頭過池塘：只能踩符合規則的石頭，上下左右一步一步走
  stones(C, o) {
    const g = o.grid, R = g.length, Cc = g[0].length; let path = [];
    const draw = (bad) => {
      let q = `<svg class="wsvg" viewBox="-20 -60 ${Cc * 100 + 40} ${R * 90 + 130}" style="max-width:520px;margin:0 auto"><rect x="-20" y="-60" width="${Cc * 100 + 40}" height="${R * 90 + 130}" rx="18" fill="#1f3a5a"/><rect x="-20" y="-60" width="${Cc * 100 + 40}" height="50" fill="#3f6a3a"/>` + A.txt(Cc * 50, -28, '對岸', 18, '#e8f4d8') + `<rect x="-20" y="${R * 90}" width="${Cc * 100 + 40}" height="70" fill="#3f6a3a"/>` + A.txt(Cc * 50, R * 90 + 42, '從這邊出發 ↑', 18, '#e8f4d8');
      for (let i = 0; i < 6; i++) q += `<ellipse cx="${(i * 97) % (Cc * 100)}" cy="${(i * 61) % (R * 90)}" rx="30" ry="6" fill="#fff" opacity=".08"/>`;
      g.forEach((row, r) => row.forEach((n, c) => {
        const on = path.some(([a, b]) => a === r && b === c), last = path.length && path[path.length - 1][0] === r && path[path.length - 1][1] === c;
        const x = c * 100 + 50, y = r * 90 + 45;
        q += `<g data-s="${r},${c}" style="cursor:pointer"><ellipse cx="${x}" cy="${y + 6}" rx="40" ry="30" fill="#0f2238" opacity=".5"/><ellipse cx="${x}" cy="${y}" rx="40" ry="30" fill="${bad && last ? '#c4502c' : on ? '#e8c86a' : '#9a9488'}" ${SW}/><ellipse cx="${x - 10}" cy="${y - 10}" rx="16" ry="7" fill="#fff" opacity=".25"/>` + A.txt(x, y + 9, n, 26, '#2a1a10', 'middle', 900) + `</g>`;
      }));
      if (path.length) { const [r, c] = path[path.length - 1]; q += `<g transform="translate(${c * 100 + 50} ${r * 90 + 10})">${A.cat(0, 0, 0.32, 'sit', true)}</g>`; }
      return q + `</svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="st">${draw()}</div><p class="msg"></p><div class="btnRow"><button class="sec" data-r="1">回到岸邊</button></div>`, { w: 560, cls: 'wide' });
    const upd = (b) => body.querySelector('.st').innerHTML = draw(b);
    body.onclick = e => {
      if (C.s[o.id + '_ok']) return;
      if (e.target.closest('[data-r]')) { path = []; upd(); body.querySelector('.msg').textContent = ''; return; }
      const t = e.target.closest('[data-s]'); if (!t) return;
      const [r, c] = t.dataset.s.split(',').map(Number);
      const last = path[path.length - 1];
      if (!last ? r !== R - 1 : Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) { W.fail(body, last ? '跳不過去！只能往上下左右相鄰的石頭走一步。' : '要從最靠近岸邊（最下面一排）的石頭開始。'); return; }
      if (path.some(([a, b]) => a === r && b === c)) return;
      path.push([r, c]);
      if (!o.ok_(g[r][c])) { Snd.play('splash'); upd(true); W.fail(body, `噗通！${g[r][c]} 號石頭一踩就沉下去了……麻糬游回岸邊。`); setTimeout(() => { path = []; if (body.isConnected) upd(); }, 900); return; }
      Snd.play('step'); upd();
      if (r === 0) { C.s[o.id + '_ok'] = 1; W.success(C, body, o.okMsg, o.ok, 1400); }
    };
  },

  // 螢火蟲記憶：看牠們依序發光，再照順序點
  simon(C, o) {
    const n = o.n, seq = o.seq; let cur = [], playing = false;
    const draw = (lit) => { let q = `<svg class="wsvg" viewBox="0 0 ${n * 140} 200" style="max-width:560px;margin:0 auto"><rect width="${n * 140}" height="200" rx="16" fill="#142238"/>`; for (let i = 0; i < n; i++) { const x = 70 + i * 140; q += `<g data-b="${i}" style="cursor:pointer"><ellipse cx="${x}" cy="150" rx="60" ry="40" fill="#2f5a3a" ${SW}/><ellipse cx="${x - 20}" cy="130" rx="34" ry="26" fill="#3f6a3a" ${SW2}/><ellipse cx="${x + 24}" cy="128" rx="30" ry="24" fill="#3a6436" ${SW2}/>${lit === i ? `<circle cx="${x}" cy="80" r="56" fill="url(#lampG)"/><circle cx="${x}" cy="80" r="10" fill="#fff6a0"/>` : `<circle cx="${x}" cy="80" r="5" fill="#8a9a5a" opacity=".5"/>`}${A.sym(o.icons[i], x, 168, 0.9, '#e8f4d8')}</g>`; } return q + `</svg>`; };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="sm">${draw(-1)}</div><div class="seqDots" style="display:flex;justify-content:center;gap:6px;margin-top:10px;min-height:16px"></div><p class="msg"></p><div class="btnRow"><button class="ok" data-p="1">看螢火蟲飛</button></div>`, { w: 600 });
    const dots = () => body.querySelector('.seqDots').innerHTML = seq.map((_, i) => `<i style="width:14px;height:14px;border-radius:50%;background:${i < cur.length ? '#f6e27a' : '#3a4a5a'};display:block"></i>`).join('');
    dots();
    const play = () => { playing = true; cur = []; dots(); seq.forEach((k, i) => { setTimeout(() => { if (!body.isConnected) return; body.querySelector('.sm').innerHTML = draw(k); Snd.bell(NOTE([72, 76, 79, 84, 88][k]), 0, 0.1, 0.8); }, 300 + i * 700); setTimeout(() => { if (body.isConnected) body.querySelector('.sm').innerHTML = draw(-1); }, 300 + i * 700 + 450); }); setTimeout(() => playing = false, 300 + seq.length * 700); };
    body.onclick = e => {
      if (C.s[o.id + '_ok']) return;
      if (e.target.closest('[data-p]')) { play(); return; }
      const b = e.target.closest('[data-b]'); if (!b || playing) return;
      const i = +b.dataset.b; cur.push(i); Snd.bell(NOTE([72, 76, 79, 84, 88][i]), 0, 0.1, 0.8);
      body.querySelector('.sm').innerHTML = draw(i); setTimeout(() => { if (body.isConnected && !playing) body.querySelector('.sm').innerHTML = draw(-1); }, 250);
      dots();
      if (cur[cur.length - 1] !== seq[cur.length - 1]) { W.fail(body, '螢火蟲們一下子全飛散了……再看一次牠們的順序吧。'); cur = []; setTimeout(dots, 300); return; }
      if (cur.length === seq.length) { C.s[o.id + '_ok'] = 1; W.success(C, body, o.okMsg, o.ok, 1300); }
    };
  },
};

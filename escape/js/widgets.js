'use strict';
// 共用謎題小工具：轉輪鎖、按鍵鎖、順序機關、滑動拼圖、點燈、時鐘
const W = {
  success(C, body, msg, ok, delay = 900) {
    Snd.play('unlock');
    const m = body.querySelector('.msg'); if (m) { m.className = 'msg ok'; m.textContent = msg || '喀嚓！打開了！'; }
    body.querySelectorAll('button').forEach(b => { if (!b.classList.contains('x')) b.disabled = true; });
    setTimeout(() => { $('#modal').hidden = true; $('#mBody').innerHTML = ''; G.onClose = null; ok(C); C.save(); C.render(); }, delay);
  },
  fail(body, msg) { Snd.play('wrong'); const m = body.querySelector('.msg'); if (m) { m.className = 'msg'; m.textContent = msg || '好像不對……'; } },

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
  nbr(p) { const x = p % 3, y = (p / 3) | 0, o = []; if (x > 0) o.push(p - 1); if (x < 2) o.push(p + 1); if (y > 0) o.push(p - 3); if (y < 2) o.push(p + 3); return o; },
  slide(C, o) {
    const key = 'slide_' + o.id;
    if (!C.s[key]) C.s[key] = W.slideStart(o.moves || 30);
    const t = C.s[key];
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
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="sp">${draw()}</div><p class="msg"></p><div class="btnRow"><button class="sec" data-r="1">看完成的樣子</button></div>`, { w: 480 });
    const solved = () => t.every((v, i) => v === i);
    body.onclick = e => {
      if (e.target.closest('[data-r]')) {
        const sp = body.querySelector('.sp'); sp.innerHTML = `<svg class="wsvg" viewBox="0 0 300 300" style="max-width:420px;margin:0 auto;opacity:.9">${o.preview ? o.preview() : art}</svg>`;
        setTimeout(() => { if (body.isConnected) sp.innerHTML = draw(); }, 1500); return;
      }
      const g = e.target.closest('[data-t]'); if (!g || C.s[key + '_ok']) return;
      const p = +g.dataset.t, eI = t.indexOf(8);
      if (!W.nbr(eI).includes(p)) return;
      t[eI] = t[p]; t[p] = 8; Snd.play('slide');
      body.querySelector('.sp').innerHTML = draw();
      if (solved()) { C.s[key + '_ok'] = 1; W.success(C, body, o.okMsg, o.ok, 1400); }
    };
  },

  // 點燈（按一顆，自己和上下左右都會切換）
  lights(C, o) {
    const key = 'lights_' + o.id;
    if (!C.s[key]) { const L = Array(9).fill(1); o.start.forEach(p => { [p, ...W.nbr(p)].forEach(q => L[q] ^= 1); }); C.s[key] = L; }
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
};

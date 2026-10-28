'use strict';
// 第二部的新謎題小工具：鏤空卡、打孔卡（數織）、推貨箱、電報紙帶、齒輪方向、倒影鐘、推重錘、掛鐘排序
Object.assign(W, {
  // ---------- 鏤空卡：把有四個洞的卡片蓋在 4×4 的字上，轉一轉，讀出一句話 ----------
  // 4×4 的格子分成四組「轉一圈會重疊」的位置，每組挑一個開洞，四個方向剛好看遍 16 格
  grilleOrbits: [[0, 3, 15, 12], [1, 7, 14, 8], [2, 11, 13, 4], [5, 6, 10, 9]],
  grilleRot(p, k) { for (let i = 0; i < k; i++) { const r = (p / 4) | 0, c = p % 4; p = c * 4 + (3 - r); } return p; },
  // 產生謎題：holes＝卡片上的洞（依卡片上的編號 1～4 排好），phrase 放在第 k 個方向
  grilleMake(r, phrase, k, pool) {
    const holes = W.grilleOrbits.map(o => o[rInt(r, 0, 3)]).sort((a, b) => a - b);
    const grid = Array(16).fill('');
    holes.forEach((h, i) => grid[W.grilleRot(h, k)] = phrase[i]);
    const fill = shuffle(pool.split(''), r);
    let j = 0; for (let i = 0; i < 16; i++) if (!grid[i]) grid[i] = fill[j++ % fill.length];
    return { holes, grid, k };
  },
  grilleRead(G0, k) { return G0.holes.map(h => G0.grid[W.grilleRot(h, k)]).join(''); },
  grille(C, o) {
    const G0 = o.g, key = 'gr_' + o.id; let k = C.s[key] || 0;
    const cell = 90, X0 = 20, Y0 = 20;
    const svg = () => {
      let q = `<svg class="wsvg" viewBox="0 0 400 400" style="max-width:380px;margin:0 auto"><rect width="400" height="400" rx="14" fill="#f4ead8" ${SW}/><rect width="400" height="400" rx="14" fill="url(#p-noise)"/>`;
      G0.grid.forEach((ch, i) => { const x = X0 + (i % 4) * cell + cell / 2, y = Y0 + ((i / 4) | 0) * cell + cell / 2; q += A.txt(x, y + 16, ch, 46, '#3a2a1e', 'middle', 900, 'font-family="Noto Serif TC,serif"'); });
      // 卡片（深色、有四個方洞；洞旁邊有 1～4 的小編號；左上角有「▲ 車頭」記號）
      let holes = '', nums = '';
      G0.holes.forEach((h, i) => { const x = X0 + (h % 4) * cell, y = Y0 + ((h / 4) | 0) * cell; holes += `M${x + 8} ${y + 8}h${cell - 16}v${cell - 16}h${-(cell - 16)}z`; nums += `<circle cx="${x + 12}" cy="${y + 12}" r="11" fill="#f2c46b" ${SW2}/>` + A.txt(x + 12, y + 17, i + 1, 14, '#4a3222', 'middle', 900); });
      q += `<g id="grCard" style="transform-origin:200px 200px;transform:rotate(${k * 90}deg);transition:transform .45s cubic-bezier(.3,1.3,.5,1)"><path d="M6 6h388v388H6z${holes}" fill="#5a3a2a" fill-rule="evenodd" ${SW} opacity=".94"/><path d="M6 6h388v388H6z${holes}" fill="url(#p-grainH)" fill-rule="evenodd" opacity=".6"/><path d="M6 6h388v388H6z${holes}" fill="url(#bevel)" fill-rule="evenodd"/>${nums}<g transform="translate(200 28)"><path d="M-12 8l12-16 12 16z" fill="#f2c46b" ${SW2}/>${A.txt(0, 26, '車頭', 13, '#f2c46b', 'middle', 900)}</g></g>`;
      return q + `</svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="grw">${svg()}</div><p class="msg"></p><div class="btnRow"><button class="sec" data-g="l">↺ 往左轉</button><button class="sec" data-g="r">往右轉 ↻</button></div>`, { w: 460 });
    const check = () => { if (W.grilleRead(G0, k) === o.phrase) { C.s[key + '_ok'] = 1; setTimeout(() => W.success(C, body, `讀出來了：「${o.phrase}」`, o.ok, 1500), 480); } };
    body.onclick = e => {
      const b = e.target.closest('[data-g]'); if (!b || b.disabled || C.s[key + '_ok']) return;
      k = (k + (b.dataset.g === 'r' ? 1 : 3)) % 4; C.s[key] = k; Snd.play('slide');
      const card = body.querySelector('#grCard'); const cur = +(card.dataset.deg || 0) + (b.dataset.g === 'r' ? 90 : -90); card.dataset.deg = cur; card.style.transform = `rotate(${cur}deg)`;
      check(); C.save();
    };
    body.querySelector('#grCard').dataset.deg = k * 90;
    check();
  },

  // ---------- 打孔卡（數織）：照著旁邊的數字，在卡片上打洞 ----------
  // 每一排、每一行的數字＝那一排連續的洞有幾個（例如「2 1」＝先連續兩個洞，空一格以上，再一個洞）
  nonoClue(line) { const out = []; let n = 0; line.forEach(v => { if (v) n++; else if (n) { out.push(n); n = 0; } }); if (n) out.push(n); return out.length ? out : [0]; },
  nono(C, o) {
    const n = o.sol.length, key = 'nono_' + o.id;
    const g = C.s[key] || (C.s[key] = o.sol.map(r => r.map(() => 0)));
    const rc = o.sol.map(r => W.nonoClue(r)), cc = o.sol[0].map((_, j) => W.nonoClue(o.sol.map(r => r[j])));
    const cs = 64, L = 130, T = 130, Wd = L + n * cs + 20, H = T + n * cs + 20;
    const draw = () => {
      const rowOk = g.map((r, i) => W.nonoClue(r).join() === rc[i].join()), colOk = cc.map((c, j) => W.nonoClue(g.map(r => r[j])).join() === c.join());
      let q = `<svg class="wsvg" viewBox="0 0 ${Wd} ${H}" style="max-width:${Wd > 520 ? 520 : Wd}px;margin:0 auto"><rect width="${Wd}" height="${H}" rx="14" fill="#efe2c4" ${SW}/><rect width="${Wd}" height="${H}" rx="14" fill="url(#p-noise)"/><rect x="${L - 6}" y="${T - 6}" width="${n * cs + 12}" height="${n * cs + 12}" rx="8" fill="#fbf4e2" ${SW2}/>`;
      rc.forEach((c, i) => q += `<rect x="10" y="${T + i * cs + 6}" width="${L - 26}" height="${cs - 12}" rx="8" fill="${rowOk[i] ? '#d8eccd' : '#f8efd8'}"/>` + A.txt(L - 26, T + i * cs + cs / 2 + 8, c.join('　'), 24, rowOk[i] ? '#2f7d4f' : '#4a3222', 'end', 900));
      cc.forEach((c, j) => { q += `<rect x="${L + j * cs + 6}" y="10" width="${cs - 12}" height="${T - 26}" rx="8" fill="${colOk[j] ? '#d8eccd' : '#f8efd8'}"/>`; c.forEach((v, k) => q += A.txt(L + j * cs + cs / 2, T - 26 - (c.length - 1 - k) * 28, v, 24, colOk[j] ? '#2f7d4f' : '#4a3222', 'middle', 900)); });
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = L + j * cs, y = T + i * cs, on = g[i][j];
        q += `<g data-n="${i},${j}" style="cursor:pointer"><rect x="${x + 3}" y="${y + 3}" width="${cs - 6}" height="${cs - 6}" rx="6" fill="${on ? '#e6d6b2' : '#fffaf0'}" stroke="#c9a87f" stroke-width="1.5"/>` + (on ? `<circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${cs * 0.3}" fill="#3a2a1e"/><circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${cs * 0.3}" fill="none" stroke="#a8875a" stroke-width="2.5"/><path d="M${x + cs / 2 - 8} ${y + cs / 2 + 12}q8 4 16 0" stroke="#7a5638" stroke-width="2" fill="none" opacity=".6"/>` : '') + `</g>`;
      }
      for (let k = 1; k < n; k++) if (k % 5 === 0) q += `<path d="M${L + k * cs} ${T}v${n * cs}M${L} ${T + k * cs}h${n * cs}" stroke="#7a5638" stroke-width="2"/>`;
      return q + `</svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="nn">${draw()}</div><p class="msg"></p><div class="btnRow"><button class="sec" data-c="1">換一張新卡（全部清除）</button></div>`, { w: 560, cls: 'wide' });
    body.onclick = e => {
      if (C.s[key + '_ok']) return;
      if (e.target.closest('[data-c]')) { g.forEach(r => r.fill(0)); Snd.play('page'); body.querySelector('.nn').innerHTML = draw(); C.save(); return; }
      const t = e.target.closest('[data-n]'); if (!t) return;
      const [i, j] = t.dataset.n.split(',').map(Number); g[i][j] ^= 1; Snd.play(g[i][j] ? 'click' : 'tap');
      body.querySelector('.nn').innerHTML = draw(); C.save();
      if (g.every((r, i2) => W.nonoClue(r).join() === rc[i2].join()) && cc.every((c, j2) => W.nonoClue(g.map(r => r[j2])).join() === c.join())) { C.s[key + '_ok'] = 1; W.success(C, body, o.okMsg, o.ok, 1500); }
    };
  },

  // ---------- 推貨箱（6×6）：貨箱只能順著自己的長邊滑動，讓麻糬的提籃從右邊的門出去 ----------
  // cars：[[列, 行, 長度, 橫向?]]，第 0 個是提籃（橫的、在第 3 列）
  rushMoves(cars) {
    const N = 6, g = Array.from({ length: N }, () => Array(N).fill(-1));
    cars.forEach(([r, c, l, h], i) => { for (let k = 0; k < l; k++) g[h ? r : r + k][h ? c + k : c] = i; });
    const out = [];
    cars.forEach(([r, c, l, h], i) => {
      [-1, 1].forEach(d => {
        for (let k = 1; ; k++) {
          const rr = h ? r : (d < 0 ? r - k : r + l - 1 + k), cc = h ? (d < 0 ? c - k : c + l - 1 + k) : c;
          if (rr < 0 || cc < 0 || rr >= N || cc >= N || g[rr][cc] !== -1) break;
          out.push([i, d * k]);
        }
      });
    });
    return out;
  },
  rushApply(cars, [i, d]) { const n = cars.map(x => x.slice()); if (n[i][3]) n[i][1] += d; else n[i][0] += d; return n; },
  rushSolve(cars) { // 最少步數的推法（提示用）
    const key = cs => cs.map(x => x[0] * 6 + x[1]).join(','), st = key(cars), prev = { [st]: null }, q = [cars];
    while (q.length) {
      const u = q.shift();
      if (u[0][1] === 4) { const out = []; let k = key(u); while (prev[k]) { out.unshift(prev[k][1]); k = prev[k][0]; } return out; }
      for (const m of W.rushMoves(u)) { const v = W.rushApply(u, m), k = key(v); if (!(k in prev)) { prev[k] = [key(u), m]; q.push(v); } }
    }
    return [];
  },
  rush(C, o) {
    const key = 'rush_' + o.id;
    if (!C.s[key]) C.s[key] = o.cars.map(x => x.slice());
    const cars = C.s[key], cs = 80, X0 = 30, Y0 = 30; let sel = -1;
    const nk = key + '_n';
    const crate = (i, [r, c, l, h]) => {
      const x = X0 + c * cs + 5, y = Y0 + r * cs + 5, w = (h ? l * cs : cs) - 10, hh = (h ? cs : l * cs) - 10, on = sel === i;
      if (i === 0) { // 麻糬的提籃
        let q = `<g data-cr="0" style="cursor:pointer">${A.sh(x + w / 2, y + hh - 2, w * 0.45, 7)}<path d="M${x + 6} ${y + 22}h${w - 12}l-6 ${hh - 28}q-2 6-8 6h${-(w - 40)}q-6 0-8-6z" fill="#d9a85a" ${SW}/>`;
        for (let k = 0; k < 6; k++) q += `<path d="M${x + 12} ${y + 30 + k * 7}h${w - 24}" stroke="#a8763a" stroke-width="2"/>`;
        for (let k = 1; k < 8; k++) q += `<path d="M${x + 6 + k * (w - 12) / 8} ${y + 24}v${hh - 30}" stroke="#a8763a" stroke-width="1.2" opacity=".7"/>`;
        q += `<path d="M${x + 22} ${y + 24}q${w / 2 - 22} -46 ${w - 44} 0" fill="none" stroke="#8a5a2a" stroke-width="6"/><g transform="translate(${x + w / 2} ${y + 28}) scale(.42)"><path d="M-30-12l4-30 18 16zM30-12l-4-30-18 16z" fill="#fff8ee" ${SW}/><ellipse cx="0" cy="0" rx="34" ry="24" fill="#fff8ee" ${SW}/><ellipse cx="-12" cy="-2" rx="4" ry="5" fill="#3a2a1e"/><ellipse cx="12" cy="-2" rx="4" ry="5" fill="#3a2a1e"/><path d="M-3 7l3 3 3-3z" fill="#f08a8a"/></g>`;
        if (on) q += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${hh + 6}" rx="10" fill="none" stroke="#e0703f" stroke-width="4" stroke-dasharray="10 6"/>`;
        return q + `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="transparent"/></g>`;
      }
      const col = ['#b8844e', '#a8743e', '#c49058', '#9a6a3a'][i % 4], lbl = ['易碎', '小心輕放', '海港市', '郵件', '機械零件', '蘋果', '茶葉', '書籍'][i % 8];
      let q = `<g data-cr="${i}" style="cursor:pointer">${A.sh(x + w / 2, y + hh - 2, w * 0.45, 7)}<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="5" fill="${col}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="5" fill="url(#${h ? 'p-grainH' : 'p-grainV'})"/><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="5" fill="url(#bevel)"/>`;
      q += `<rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${hh - 14}" rx="3" fill="none" stroke="${shade(col, -0.3)}" stroke-width="2"/>`;
      if (h) for (let k = 1; k < l; k++) q += `<path d="M${x + k * cs - 5} ${y + 4}v${hh - 8}" stroke="${shade(col, -0.3)}" stroke-width="1.6"/>`; else for (let k = 1; k < l; k++) q += `<path d="M${x + 4} ${y + k * cs - 5}h${w - 8}" stroke="${shade(col, -0.3)}" stroke-width="1.6"/>`;
      q += `<path d="M${x + 7} ${y + 7}L${x + w - 7} ${y + hh - 7}" stroke="${shade(col, -0.3)}" stroke-width="2" opacity=".55"/>` + [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + hh - 6], [x + w - 6, y + hh - 6]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2.2" fill="#5a4a3a"/>`).join('');
      q += h ? A.txt(x + w / 2, y + hh / 2 + 7, lbl, 18, '#fff3dc', 'middle', 900, `stroke="${shade(col, -0.45)}" stroke-width="3" paint-order="stroke"`) : A.txt(x + w / 2, y + hh / 2 + 7, lbl.slice(0, 2), 18, '#fff3dc', 'middle', 900, `stroke="${shade(col, -0.45)}" stroke-width="3" paint-order="stroke" transform="rotate(-90 ${x + w / 2} ${y + hh / 2})"`);
      if (on) q += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${hh + 6}" rx="8" fill="none" stroke="#e0703f" stroke-width="4" stroke-dasharray="10 6"/>`;
      return q + `</g>`;
    };
    const draw = () => {
      let q = `<svg class="wsvg" viewBox="0 0 600 540" style="max-width:540px;margin:0 auto"><rect x="10" y="10" width="${6 * cs + 40}" height="${6 * cs + 40}" rx="12" fill="#5a3e2a" ${SW}/>`;
      for (let k = 0; k < 12; k++) q += `<rect x="${X0}" y="${Y0 + k * 40}" width="${6 * cs}" height="40" fill="${k % 2 ? '#9a7048' : '#a87a50'}"/>`;
      q += `<rect x="${X0}" y="${Y0}" width="${6 * cs}" height="${6 * cs}" fill="url(#p-grainH)"/>`;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) q += `<rect data-e="${r},${c}" x="${X0 + c * cs + 2}" y="${Y0 + r * cs + 2}" width="${cs - 4}" height="${cs - 4}" rx="6" fill="#fff" fill-opacity=".04" stroke="#3a2a1e" stroke-opacity=".18" stroke-width="1.2"/>`;
      // 出口（右邊的門）
      q += `<rect x="${X0 + 6 * cs}" y="${Y0 + 2 * cs}" width="40" height="${cs}" fill="#fff3c8"/><rect x="${X0 + 6 * cs}" y="${Y0 + 2 * cs}" width="40" height="${cs}" fill="url(#sunG)"/>` + A.txt(X0 + 6 * cs + 52, Y0 + 2 * cs + 46, '門', 22, '#fff3dc', 'middle', 900) + `<path d="M${X0 + 6 * cs + 34} ${Y0 + 2 * cs + 62}l14 0-6-6M${X0 + 6 * cs + 48} ${Y0 + 2 * cs + 62}l-6 6" stroke="#fff3dc" stroke-width="3" fill="none"/>`;
      if (sel >= 0) { const [r, c, l, h] = cars[sel]; W.rushMoves(cars).filter(m => m[0] === sel).forEach(([, d]) => { const rr = h ? r : (d < 0 ? r + d : r + l - 1 + d), cc = h ? (d < 0 ? c + d : c + l - 1 + d) : c; q += `<circle cx="${X0 + cc * cs + cs / 2}" cy="${Y0 + rr * cs + cs / 2}" r="12" fill="#e0703f" opacity=".75" pointer-events="none"/>`; }); }
      cars.forEach((cr, i) => q += crate(i, cr));
      return q + `</svg>`;
    };
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="rh">${draw()}</div><p class="msg">已推了 ${C.s[nk] || 0} 次</p><div class="btnRow"><button class="sec" data-r="1">全部推回原位</button></div>`, { w: 560, cls: 'wide' });
    const upd = () => { body.querySelector('.rh').innerHTML = draw(); };
    body.onclick = e => {
      if (C.s[key + '_ok']) return;
      if (e.target.closest('[data-r]')) { C.s[key] = o.cars.map(x => x.slice()); C.s[nk] = 0; W.rush(C, o); return; }
      const cr = e.target.closest('[data-cr]');
      if (cr) { const i = +cr.dataset.cr; sel = sel === i ? -1 : i; Snd.play('select'); upd(); return; }
      const ce = e.target.closest('[data-e]'); if (!ce || sel < 0) return;
      const [r, c] = ce.dataset.e.split(',').map(Number), [r0, c0, l, h] = cars[sel];
      const d = h ? (r !== r0 ? null : c < c0 ? c - c0 : c - (c0 + l - 1)) : (c !== c0 ? null : r < r0 ? r - r0 : r - (r0 + l - 1));
      if (!d || !W.rushMoves(cars).some(m => m[0] === sel && m[1] === d)) { W.fail(body, '推不過去！貨箱只能順著長的方向滑，而且前面不能有東西擋著。'); return; }
      cars[sel] = W.rushApply(cars, [sel, d])[sel]; C.s[nk] = (C.s[nk] || 0) + 1; Snd.play('slide');
      const m = body.querySelector('.msg'); m.className = 'msg'; m.textContent = `已推了 ${C.s[nk]} 次`;
      sel = -1; upd(); C.save();
      if (cars[0][1] === 4) { C.s[key + '_ok'] = 1; if (C.s[nk] <= 20) G.ach('train'); W.success(C, body, (o.okMsg || '推出去了！') + `（${C.s[nk]} 次）`, o.ok, 1400); }
    };
  },
  // ---------- 齒輪方向：在空軸上放小齒輪，把發條的轉動傳到指針軸，而且方向要對 ----------
  // 每咬合一次，轉動的方向就相反；三個齒輪互相咬成一圈會卡死
  gpt(i, j) { return [90 + 120 * i + (j % 2 ? 60 : 0), 300 + 104 * (j - 2)]; },
  gadj(a, b) { const [x1, y1] = W.gpt(...a), [x2, y2] = W.gpt(...b); return Math.abs(Math.hypot(x1 - x2, y1 - y2) - 120) < 1; },
  gEval(D, O, placed) {
    const nodes = [D, O, ...placed], k = a => a.join(','), col = { [k(D)]: 0 }, st = [D]; let jam = null;
    while (st.length) { const u = st.pop(); nodes.forEach(v => { if (v === u || !W.gadj(u, v)) return; if (!(k(v) in col)) { col[k(v)] = 1 - col[k(u)]; st.push(v); } else if (col[k(v)] === col[k(u)]) jam = [u, v]; }); }
    if (jam) return { r: 'jam', col, jam };
    if (!(k(O) in col)) return { r: 'none', col };
    return { r: col[k(O)] ? 'ccw' : 'cw', col };
  },
  gearNet(C, o) {
    const key = 'gn_' + o.id; const pl = C.s[key] || (C.s[key] = []);
    const has = p => pl.some(q => q[0] === p[0] && q[1] === p[1]);
    const R = 56;
    const gear = (p, fill, cls, label, dur) => { const [x, y] = W.gpt(...p); return `<g${cls ? ` class="${cls}" style="animation-duration:${dur || 3}s"` : ''}><path d="${A.gearPath(x, y, R, 12, 0.32)}" fill="${fill}" fill-rule="evenodd" ${SW}/><circle cx="${x}" cy="${y}" r="${R * 0.62}" fill="none" stroke="#6a3d10" stroke-opacity=".35" stroke-width="2.5"/><path d="M${x - R * 0.42} ${y - R * 0.42}a${R * 0.6} ${R * 0.6} 0 0 1 ${R * 0.76} -${R * 0.12}" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none" stroke-linecap="round"/></g><circle cx="${x}" cy="${y}" r="13" fill="#fff6dc" ${SW2}/>` + (label ? A.txt(x, y + R + 30, label, 18, '#f0dcb8', 'middle', 900) : ''); };
    const arrow = (p, ccw, col) => { const [x, y] = W.gpt(...p), r = R + 14; return `<path d="M${x + (ccw ? r : -r)} ${y - 10}A${r} ${r} 0 0 ${ccw ? 0 : 1} ${x} ${y - r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round"/><path d="M${x} ${y - r}l${ccw ? 14 : -14} -9v18z" fill="${col}"/>`; };
    const draw = (ev) => {
      let q = `<svg class="wsvg" viewBox="0 40 780 540" style="max-width:640px;margin:0 auto"><rect x="0" y="40" width="780" height="540" rx="16" fill="#3b2a1f" ${SW}/><rect x="0" y="40" width="780" height="540" rx="16" fill="url(#p-gear)" opacity=".45"/>`;
      o.pegs.forEach(p => { o.pegs.forEach(p2 => { if ((p[0] < p2[0] || (p[0] === p2[0] && p[1] < p2[1])) && W.gadj(p, p2)) { const [a, b] = W.gpt(...p), [c, d] = W.gpt(...p2); q += `<path d="M${a} ${b}L${c} ${d}" stroke="#f0dcb8" stroke-opacity=".12" stroke-width="2" stroke-dasharray="4 6"/>`; } }); });
      const run = ev && (ev.r === 'cw' || ev.r === 'ccw'), spinCls = p => { if (!run) return ''; const c = ev.col[p.join(',')]; return c === undefined ? '' : c ? 'spinr' : 'spin'; };
      o.pegs.forEach(p => { const [x, y] = W.gpt(...p); q += `<g data-pg="${p.join(',')}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${R}" fill="transparent"/>` + (has(p) ? gear(p, '#d9b56a', spinCls(p)) : `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="#f0dcb8" stroke-width="3" stroke-dasharray="6 6"/><circle cx="${x}" cy="${y}" r="9" fill="#c9cfd6" ${SW2}/>`) + `</g>`; });
      q += gear(o.D, '#9aa6b0', run ? 'spin' : '', '發條') + arrow(o.D, false, '#f2c46b');
      q += gear(o.O, '#c9a14a', spinCls(o.O), '指針軸') + arrow(o.O, true, ev && ev.r === 'cw' ? '#e0432d' : '#6fd08a');
      if (ev && ev.r === 'jam') { const [a, b] = W.gpt(...ev.jam[0]), [c, d] = W.gpt(...ev.jam[1]); q += `<g transform="translate(${(a + c) / 2} ${(b + d) / 2})"><circle r="18" fill="#e0432d" stroke="#fff" stroke-width="3"/><path d="M-7-7l14 14M7-7l-14 14" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>`; }
      return q + `</svg>`;
    };
    const left = () => o.k - pl.length;
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="gnw">${draw()}</div><p class="msg">手上還有 ${left()} 個小齒輪</p><div class="btnRow"><button class="sec" data-a="clr">全部拆下來</button><button class="ok" data-a="run">試轉看看</button></div>`, { w: 700, cls: 'wide' });
    const upd = (ev) => { body.querySelector('.gnw').innerHTML = draw(ev); };
    const msg = t => { const m = body.querySelector('.msg'); m.className = 'msg'; m.textContent = t; };
    body.onclick = e => {
      if (C.s[key + '_ok']) return;
      const a = e.target.closest('[data-a]');
      if (a && a.dataset.a === 'clr') { pl.splice(0); Snd.play('slide'); upd(); msg(`手上還有 ${left()} 個小齒輪`); C.save(); return; }
      if (a && a.dataset.a === 'run') {
        const ev = W.gEval(o.D, o.O, pl); upd(ev);
        if (ev.r === 'jam') { W.fail(body, '「嘎吱──」卡住了！三個齒輪咬成一圈，誰也轉不動。'); return; }
        if (ev.r === 'none') { W.fail(body, '發條轉起來了，可是力氣沒有傳到指針軸。'); return; }
        if (ev.r !== o.want) { Snd.play('wrong'); msg('指針軸轉了──可是轉反了！（紅色箭頭）', false); const p = $('#panel'); p.classList.remove('nope'); void p.offsetWidth; p.classList.add('nope'); setTimeout(() => body.isConnected && !C.s[key + '_ok'] && upd(), 1800); return; }
        C.s[key + '_ok'] = 1; Snd.play('click'); W.success(C, body, '齒輪一個帶一個，指針軸往對的方向轉起來了！', o.ok, 1800); return;
      }
      const g = e.target.closest('[data-pg]'); if (!g) return;
      const p = g.dataset.pg.split(',').map(Number);
      if (has(p)) { pl.splice(pl.findIndex(q => q[0] === p[0] && q[1] === p[1]), 1); Snd.play('tap'); }
      else if (left() <= 0) { W.fail(body, '小齒輪用完了。先拆下一個再放吧。'); return; }
      else { pl.push(p); Snd.play('click'); }
      upd(); msg(`手上還有 ${left()} 個小齒輪`); C.save();
    };
  },

  // ---------- 推重錘（倉庫番）：把兩個鐵砣推到圓形踏板上 ----------
  soko(C, o) {
    const key = 'sk_' + o.id;
    const fresh = () => ({ p: o.p.slice(), b: o.b.map(x => x.slice()), n: 0, hist: [] });
    const st = C.s[key] || (C.s[key] = fresh());
    const Wd = o.g[0].length, H = o.g.length, cs = 76;
    const isB = (x, y) => st.b.findIndex(b => b[0] === x && b[1] === y);
    const onGoal = (x, y) => o.goal.some(g => g[0] === x && g[1] === y);
    const draw = () => {
      let q = `<svg class="wsvg" viewBox="0 0 ${Wd * cs} ${H * cs}" style="max-width:520px;margin:0 auto">`;
      for (let y = 0; y < H; y++) for (let x = 0; x < Wd; x++) {
        const X = x * cs, Y = y * cs;
        if (o.g[y][x] === '#') q += `<rect x="${X}" y="${Y}" width="${cs}" height="${cs}" fill="#7a6a58"/><rect x="${X + 2}" y="${Y + 2}" width="${cs - 4}" height="${cs / 2 - 3}" rx="3" fill="#8a7a66" stroke="#4a3a2e" stroke-width="1.5"/><rect x="${X + 2}" y="${Y + cs / 2 + 1}" width="${cs - 4}" height="${cs / 2 - 3}" rx="3" fill="#86765f" stroke="#4a3a2e" stroke-width="1.5"/>`;
        else q += `<rect data-sk="${x},${y}" x="${X}" y="${Y}" width="${cs}" height="${cs}" fill="${(x + y) % 2 ? '#a8875f' : '#b08f66'}" stroke="#6a4a32" stroke-opacity=".4"/>`;
        if (onGoal(x, y)) q += `<circle cx="${X + cs / 2}" cy="${Y + cs / 2}" r="${cs * 0.34}" fill="#5a4a3e" stroke="url(#brass)" stroke-width="5" pointer-events="none"/><circle cx="${X + cs / 2}" cy="${Y + cs / 2}" r="${cs * 0.2}" fill="none" stroke="#c9a14a" stroke-width="2" stroke-dasharray="4 4" pointer-events="none"/>`;
      }
      st.b.forEach(([x, y]) => { const X = x * cs + cs / 2, Y = y * cs + cs / 2, g = onGoal(x, y); q += `<g pointer-events="none">${g ? `<circle cx="${X}" cy="${Y}" r="${cs * 0.5}" fill="url(#lampG)"/>` : ''}<path d="M${X - 26} ${Y + 26}l8-40h36l8 40z" fill="${g ? '#5a6a74' : '#4a4a52'}" ${SW}/><path d="M${X - 26} ${Y + 26}l8-40h36l8 40z" fill="url(#cyl)"/><path d="M${X - 10} ${Y - 14}q10-18 20 0" fill="none" stroke="#2a2a32" stroke-width="5"/>${A.txt(X, Y + 18, '10kg', 13, '#e9eef2', 'middle', 900)}</g>`; });
      const [px, py] = st.p, X = px * cs + cs / 2, Y = py * cs + cs / 2;
      q += `<g pointer-events="none">${A.sh(X, Y + 26, 22, 6)}<path d="M${X - 16} ${Y + 26}q0-26 16-26t16 26z" fill="#e0703f" ${SW2}/><circle cx="${X}" cy="${Y - 8}" r="14" fill="#fbd9bc" ${SW2}/><path d="M${X - 15} ${Y - 12}q15-18 30 0" fill="#3b2a1f" ${SW2}/><circle cx="${X - 5}" cy="${Y - 7}" r="2" fill="#2a1a10"/><circle cx="${X + 5}" cy="${Y - 7}" r="2" fill="#2a1a10"/></g>`;
      return q + `</svg>`;
    };
    const pad = `<div class="skPad"><button data-d="0" aria-label="上">▲</button><button data-d="3" aria-label="左">◀</button><button data-d="2" aria-label="下">▼</button><button data-d="1" aria-label="右">▶</button></div>`;
    const body = G.modal(`<h3>${o.title}</h3><p class="sub">${o.sub}</p><div class="skw">${draw()}</div><p class="msg">走了 ${st.n} 步</p>${pad}<div class="btnRow"><button class="sec" data-u="1">退一步</button><button class="sec" data-z="1">重新來過</button></div>`, { w: 560, cls: 'wide' });
    const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const move = d => {
      const [dx, dy] = D4[d], nx = st.p[0] + dx, ny = st.p[1] + dy;
      if (o.g[ny][nx] === '#') { Snd.play('tap'); return; }
      const bi = isB(nx, ny);
      if (bi >= 0) { const bx = nx + dx, by = ny + dy; if (o.g[by][bx] === '#' || isB(bx, by) >= 0) { W.fail(body, '推不動，鐵砣後面被擋住了。'); return; } st.hist.push(JSON.stringify([st.p, st.b])); st.b[bi] = [bx, by]; Snd.play('slide'); }
      else { st.hist.push(JSON.stringify([st.p, st.b])); Snd.play('step'); }
      if (st.hist.length > 200) st.hist.shift();
      st.p = [nx, ny]; st.n++;
      body.querySelector('.skw').innerHTML = draw(); const m = body.querySelector('.msg'); m.className = 'msg'; m.textContent = `走了 ${st.n} 步`; C.save();
      if (st.b.every(([x, y]) => onGoal(x, y))) { C.s[key + '_ok'] = 1; removeEventListener('keydown', kd, true); W.success(C, body, o.okMsg, o.ok, 1400); }
    };
    const kd = e => { if (!body.isConnected) { removeEventListener('keydown', kd, true); return; } const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (d === undefined || C.s[key + '_ok']) return; e.preventDefault(); e.stopPropagation(); move(d); };
    addEventListener('keydown', kd, true);
    body.onclick = e => {
      if (C.s[key + '_ok']) return;
      const b = e.target.closest('[data-d]'); if (b) { move(+b.dataset.d); return; }
      if (e.target.closest('[data-z]')) { C.s[key] = fresh(); removeEventListener('keydown', kd, true); W.soko(C, o); return; }
      if (e.target.closest('[data-u]')) { const h = st.hist.pop(); if (h) { const [p, bs] = JSON.parse(h); st.p = p; st.b = bs; st.n++; Snd.play('tap'); body.querySelector('.skw').innerHTML = draw(); C.save(); } return; }
      const c = e.target.closest('[data-sk]'); if (!c) return; // 點旁邊的格子也能走
      const [x, y] = c.dataset.sk.split(',').map(Number), dx = x - st.p[0], dy = y - st.p[1];
      if (Math.abs(dx) + Math.abs(dy) === 1) move(dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3);
    };
  },

  // ---------- 掛鐘排序：照提示把四口鐘掛到四個鉤子上 ----------
  hangClue(t, perm, names) { // perm[位置]＝鐘
    const pos = b => perm.indexOf(b), N = names;
    switch (t[0]) {
      case 'left': return [pos(t[1]) < pos(t[2]), `${N[t[1]]}掛在${N[t[2]]}的左邊（不一定相鄰）。`];
      case 'adj': return [Math.abs(pos(t[1]) - pos(t[2])) === 1, `${N[t[1]]}和${N[t[2]]}掛在隔壁。`];
      case 'nadj': return [Math.abs(pos(t[1]) - pos(t[2])) !== 1, `${N[t[1]]}和${N[t[2]]}不是隔壁。`];
      case 'mid': return [pos(t[1]) > 0 && pos(t[1]) < 3, `${N[t[1]]}不在最左邊，也不在最右邊。`];
      case 'end': return [pos(t[1]) === 0 || pos(t[1]) === 3, `${N[t[1]]}掛在最旁邊（最左或最右）。`];
      case 'gap': return [Math.abs(pos(t[1]) - pos(t[2])) === 2, `${N[t[1]]}和${N[t[2]]}中間剛好隔著一口鐘。`];
      case 'at': return [pos(t[1]) === t[2], `${N[t[1]]}掛在${['最左邊', '左邊數來第二個', '右邊數來第二個', '最右邊'][t[2]]}。`];
    }
  },
  hangMake(r, names) {
    const perms = []; const pm = (a, l = []) => { if (!a.length) perms.push(l); a.forEach((x, i) => pm(a.filter((_, j) => j !== i), [...l, x])); }; pm([0, 1, 2, 3]);
    for (let t = 0; t < 200; t++) {
      const ans = shuffle([0, 1, 2, 3], r), pool = [];
      for (let a = 0; a < 4; a++) { pool.push(['mid', a], ['end', a]); for (let b = 0; b < 4; b++) if (a !== b) pool.push(['left', a, b], ['adj', a, b], ['nadj', a, b], ['gap', a, b]); }
      const truth = shuffle(pool, r).filter(c => W.hangClue(c, ans, names)[0]);
      let cl = [], cand = perms;
      for (const c of truth) { const nc = cand.filter(p => W.hangClue(c, p, names)[0]); if (nc.length < cand.length) { cl.push(c); cand = nc; } if (cand.length === 1) break; }
      if (cand.length !== 1) continue;
      for (let i = cl.length - 1; i >= 0; i--) { const tr = cl.filter((_, j) => j !== i); if (perms.filter(p => tr.every(c => W.hangClue(c, p, names)[0])).length === 1) cl = tr; }
      if (cl.length >= 3 && cl.length <= 5 && !cl.some(c => c[0] === 'at')) return { ans, clues: cl };
    }
    return { ans: [0, 1, 2, 3], clues: [['at', 0, 0], ['at', 1, 1], ['at', 2, 2]] };
  },
});

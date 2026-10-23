'use strict';
// 曉鐘傳說：視窗、文字、選單、對話（全部畫在 canvas 上，鍵盤與點擊都能操作）
const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei","Heiti TC",sans-serif';
const L = { W: 0, H: 0, dpr: 1, V: { x: 0, y: 0, w: 0, h: 0 }, FS: 16, k: 3, lh: 22, pad: 10 };

const UI = {
  layers: [], toasts: [], t: 0, hits: [],
  push(l) { this.layers.push(l); return l; },
  remove(l) { const i = this.layers.indexOf(l); if (i >= 0) this.layers.splice(i, 1); },
  top() { for (let i = this.layers.length - 1; i >= 0; i--) if (this.layers[i].modal) return this.layers[i]; return null; },
  busy() { return !!this.top(); },
  update(dt) {
    this.t += dt;
    const t = this.top();
    if (t && t.update) t.update(dt);
    for (const s of this.toasts) s.t += dt;
    this.toasts = this.toasts.filter(s => s.t < s.dur);
  },
  draw(g) {
    for (const l of this.layers) l.draw(g);
    // 提示訊息
    let y = L.V.y + L.pad;
    for (const s of this.toasts) {
      const a = Math.min(1, s.t * 4, (s.dur - s.t) * 2);
      g.globalAlpha = a; g.font = `500 ${L.FS * 0.85}px ${FONT}`;
      const w = g.measureText(s.text).width + L.pad * 2, h = L.FS * 1.7, x = L.V.x + L.V.w - w - L.pad;
      this.win(g, x, y, w, h, { alpha: 0.82 }); this.text(g, s.text, x + L.pad, y + h / 2, '#fff4c0', L.FS * 0.85, 'left', 'middle');
      g.globalAlpha = 1; y += h + 4;
    }
  },
  toast(text, dur = 2.2) { this.toasts.push({ text, t: 0, dur }); },
  // 視窗外觀：深藍底、白色雙框（向經典 RPG 致敬）
  win(g, x, y, w, h, o = {}) {
    const r = Math.max(4, L.FS * 0.35), b = Math.max(2, Math.round(L.FS * 0.14));
    g.save();
    g.globalAlpha *= o.alpha ?? 0.94;
    g.fillStyle = o.bg || '#0b1030';
    rr(g, x, y, w, h, r); g.fill();
    g.globalAlpha = (o.alpha ?? 0.94) === 0.94 ? g.globalAlpha / 0.94 : g.globalAlpha;
    g.lineWidth = b; g.strokeStyle = o.border || '#f4f2ff';
    rr(g, x + b * 1.2, y + b * 1.2, w - b * 2.4, h - b * 2.4, r * 0.7); g.stroke();
    g.lineWidth = Math.max(1, b / 2); g.strokeStyle = 'rgba(120,140,220,.45)';
    rr(g, x + b * 2.6, y + b * 2.6, w - b * 5.2, h - b * 5.2, r * 0.5); g.stroke();
    g.restore();
  },
  // 地名用的緞帶標題
  banner(g, text, cx, cy, fs) {
    g.font = `700 ${fs * 1.15}px ${FONT}`;
    const w = g.measureText(text).width + fs * 4, h = fs * 2.1, x = cx - w / 2, y = cy - h / 2;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + fs * 0.2, y + fs * 0.25, w, h);
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#2a2458'); gr.addColorStop(1, '#14102e');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - fs * 0.8, y + h / 2); g.lineTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w + fs * 0.8, y + h / 2); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
    g.strokeStyle = '#e8c070'; g.lineWidth = Math.max(1, fs * 0.1); g.stroke();
    g.strokeStyle = 'rgba(232,192,112,.35)'; g.beginPath(); g.moveTo(x + fs * 0.4, y + fs * 0.3); g.lineTo(x + w - fs * 0.4, y + fs * 0.3); g.moveTo(x + fs * 0.4, y + h - fs * 0.3); g.lineTo(x + w - fs * 0.4, y + h - fs * 0.3); g.stroke();
    g.fillStyle = '#e8c070'; for (const dx of [-1, 1]) { const px = cx + dx * (w / 2 - fs * 0.9); g.beginPath(); g.moveTo(px, cy - fs * 0.3); g.lineTo(px + fs * 0.3, cy); g.lineTo(px, cy + fs * 0.3); g.lineTo(px - fs * 0.3, cy); g.fill(); }
    g.restore();
    this.text(g, text, cx, cy + fs * 0.05, '#ffeec0', fs * 1.15, 'center', 'middle', 700);
  },
  text(g, s, x, y, col = '#fff', size = L.FS, align = 'left', base = 'top', weight = 500) {
    g.font = `${weight} ${size}px ${FONT}`; g.textAlign = align; g.textBaseline = base;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(s, x + Math.max(1, size / 14), y + Math.max(1, size / 14));
    g.fillStyle = col; g.fillText(s, x, y);
  },
  wrap(g, s, maxW, size = L.FS) {
    g.font = `500 ${size}px ${FONT}`;
    const out = [];
    for (const para of String(s).split('\n')) {
      let line = '';
      for (const ch of para) {
        if (g.measureText(line + ch).width > maxW && line) {
          // 標點不放行首
          if ('，。！？、」』）：；…'.includes(ch)) { line += ch; out.push(line); line = ''; continue; }
          out.push(line); line = ch;
        } else line += ch;
      }
      out.push(line);
    }
    return out;
  },
  cursor(g, x, y, size) {
    const s = size * 0.42, bob = Math.sin(this.t * 10) > 0 ? 0 : size * 0.06;
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + bob, y - s); g.lineTo(x + s * 1.3 + bob, y); g.lineTo(x + bob, y + s); g.fill();
  },
  hit(x, y, w, h, fn) { this.hits.push({ x, y, w, h, fn }); },
  // 點擊處理：由上而下找第一個命中區域
  handleTaps() {
    const taps = Input.taps.splice(0);
    for (const t of taps) {
      for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (t.x >= h.x && t.y >= h.y && t.x <= h.x + h.w && t.y <= h.y + h.h) { h.fn(); break; } }
    }
  },

  // ───── 對話框 ─────
  msg(text, o = {}) {
    return new Promise(res => {
      const lay = { modal: true, pages: null, pi: 0, shown: 0, done: false, wait: o.wait, t: 0 };
      lay.update = dt => {
        if (!lay.pages) return;
        const speed = [28, 55, 160][Store.data.textSpeed ?? 1] * (window.__speed || 1);
        const total = lay.pages[lay.pi].join('').length;
        if (lay.shown < total) { const before = Math.floor(lay.shown); lay.shown = Math.min(total, lay.shown + dt * speed); if (Math.floor(lay.shown) > before && before % 3 === 0) Snd.play('talk'); }
        lay.t += dt;
        if (window.__autoMsg) { lay.shown = total; next(); return; }
        if (o.auto && lay.shown >= total && lay.t > o.auto) next();
        if (Input.pressed.ok || Input.pressed.cancel || lay.tapped) { lay.tapped = false; if (lay.shown < total) lay.shown = total; else next(); }
      };
      const next = () => {
        if (lay.pi < lay.pages.length - 1) { lay.pi++; lay.shown = 0; lay.t = 0; }
        else { UI.remove(lay); res(); }
      };
      lay.draw = g => {
        const V = L.V, pad = L.pad, fs = L.FS, lines = 3;
        const h = fs * 1.55 * lines + pad * 2.4, w = Math.min(V.w - pad * 2, fs * 34), x = V.x + (V.w - w) / 2;
        const y = o.top ? V.y + pad : V.y + V.h - h - pad;
        if (!lay.pages) {
          const raw = UI.wrap(g, text, w - pad * 3.2);
          lay.pages = []; for (let i = 0; i < raw.length; i += lines) lay.pages.push(raw.slice(i, i + lines));
        }
        UI.win(g, x, y, w, h);
        let left = Math.floor(lay.shown);
        lay.pages[lay.pi].forEach((ln, i) => {
          const s = ln.slice(0, Math.max(0, left)); left -= ln.length;
          UI.text(g, s, x + pad * 1.6, y + pad * 1.2 + i * fs * 1.55, '#ffffff', fs);
        });
        const total = lay.pages[lay.pi].join('').length;
        if (lay.shown >= total && !o.auto && Math.sin(UI.t * 8) > -0.3) { g.fillStyle = '#fff'; const cx = x + w - pad * 2, cy = y + h - pad * 1.4; g.beginPath(); g.moveTo(cx - fs * 0.35, cy - fs * 0.25); g.lineTo(cx + fs * 0.35, cy - fs * 0.25); g.lineTo(cx, cy + fs * 0.2); g.fill(); }
        UI.hit(V.x, V.y, V.w, V.h, () => { lay.tapped = true; });
      };
      UI.push(lay);
    });
  },
  // 多段對話
  async say(...texts) { for (const t of texts) await this.msg(t); },

  // ───── 選單 ─────
  // items: [{t, r, dis, col}]；pos: (g)=>({x,y,w})；回傳選到的索引或 -1
  menu(o) {
    return new Promise(res => {
      const lay = { modal: true, i: o.index || 0, scroll: 0, o };
      const items = o.items;
      const cols = o.cols || 1;
      const rows = () => Math.ceil(items.length / cols);
      const maxRows = () => Math.max(1, Math.min(o.maxRows || 99, Math.floor((L.V.h * 0.82 - L.pad * 2 - (o.title ? L.FS * 1.6 : 0)) / (L.FS * 1.6))));
      if (lay.i >= items.length) lay.i = Math.max(0, items.length - 1);
      const fire = () => { o.onMove && o.onMove(lay.i); };
      fire();
      if (o.autoPick !== undefined && window.__autoMsg) { setTimeout(() => res(o.autoPick), 0); return; }
      const done = v => { UI.remove(lay); if (o.keep) UI.push(lay.ghost()); res(v); };
      if (o.ref) {
        o.ref.pick = idx => { if (UI.top() !== lay) return; lay.i = idx; fire(); Snd.play('ok'); done(idx); };
        o.ref.hover = idx => { if (UI.top() !== lay || lay.i === idx) return; lay.i = idx; fire(); };
      }
      lay.ghost = () => ({ modal: false, draw: g => lay.draw(g, true), isGhost: true, owner: o });
      lay.update = () => {
        const d = Input.dirPress, n = items.length;
        if (d && n) {
          let i = lay.i;
          if (d === 'up') i -= cols; if (d === 'down') i += cols;
          if (d === 'left' && cols > 1) i -= 1; if (d === 'right' && cols > 1) i += 1;
          if (d === 'left' && cols === 1 && o.onLR) { o.onLR(-1); return; }
          if (d === 'right' && cols === 1 && o.onLR) { o.onLR(1); return; }
          if (i < 0) i = cols > 1 ? (i + cols * rows()) % (cols * rows()) : n - 1;
          if (i >= n) i = cols > 1 ? i % cols : 0;
          if (i >= n) i = n - 1;
          if (i !== lay.i) { lay.i = i; Snd.play('cursor'); fire(); }
        }
        if (Input.pressed.ok && n) { if (items[lay.i].dis && !o.allowDis) { Snd.play('bump'); return; } Snd.play('ok'); done(lay.i); }
        else if (Input.pressed.cancel && o.cancel !== false) { Snd.play('cancel'); done(-1); }
      };
      lay.draw = (g, ghost) => {
        const fs = L.FS, pad = L.pad, rh = fs * 1.6;
        const p = typeof o.pos === 'function' ? o.pos(g) : o.pos;
        let w = p.w;
        if (!w) { g.font = `500 ${fs}px ${FONT}`; let mw = 0; for (const it of items) mw = Math.max(mw, g.measureText(it.t).width + (it.r ? g.measureText(it.r).width + fs * 1.4 : 0)); w = (mw + fs * 2.4 + pad * 2) * cols; if (o.title) { g.font = `700 ${fs * 0.85}px ${FONT}`; w = Math.max(w, g.measureText(o.title).width + pad * 3); } }
        const mr = maxRows(), vis = Math.min(rows(), mr);
        const r = Math.floor(lay.i / cols);
        if (r < lay.scroll) lay.scroll = r; if (r >= lay.scroll + vis) lay.scroll = r - vis + 1;
        const th = o.title ? fs * 1.5 : 0;
        const h = vis * rh + pad * 1.8 + th;
        let x = p.x, y = p.y;
        if (p.right) x = p.right - w; if (p.bottom) y = p.bottom - h;
        x = clamp(x, L.V.x + 2, L.V.x + L.V.w - w - 2); y = clamp(y, L.V.y + 2, L.V.y + L.V.h - h - 2);
        lay.rect = { x, y, w, h };
        UI.win(g, x, y, w, h);
        if (o.title) UI.text(g, o.title, x + pad * 1.4, y + pad * 0.9, '#ffd76a', fs * 0.85, 'left', 'top', 700);
        const cw = (w - pad * 2) / cols;
        for (let rI = 0; rI < vis; rI++) for (let c = 0; c < cols; c++) {
          const idx = (rI + lay.scroll) * cols + c; if (idx >= items.length) continue;
          const it = items[idx], ix = x + pad + c * cw, iy = y + pad * 0.9 + th + rI * rh;
          const col = it.dis ? '#7a7f9a' : (it.col || '#ffffff');
          UI.text(g, it.t, ix + fs * 1.3, iy + rh / 2, col, fs, 'left', 'middle');
          if (it.r) UI.text(g, it.r, ix + cw - fs * 0.5, iy + rh / 2, it.dis ? '#7a7f9a' : (it.rcol || '#cfd6ff'), fs * 0.92, 'right', 'middle');
          if (idx === lay.i && (!ghost || o.keepCursor)) { if (ghost) { g.globalAlpha = 0.55; } UI.cursor(g, ix + fs * 0.25, iy + rh / 2, fs); g.globalAlpha = 1; }
          if (!ghost) UI.hit(ix, iy, cw, rh, () => {
            if (UI.top() !== lay) return;
            if (lay.i !== idx) { lay.i = idx; fire(); }
            if (it.dis && !o.allowDis) { Snd.play('bump'); return; }
            Snd.play('ok'); done(idx);
          });
        }
        if (rows() > vis) {
          g.fillStyle = '#cfd6ff';
          if (lay.scroll > 0) { const cx = x + w - pad * 1.5, cy = y + pad * 0.8 + th; g.beginPath(); g.moveTo(cx - fs * 0.3, cy + fs * 0.3); g.lineTo(cx + fs * 0.3, cy + fs * 0.3); g.lineTo(cx, cy); g.fill(); }
          if (lay.scroll + vis < rows()) { const cx = x + w - pad * 1.5, cy = y + h - pad * 0.8; g.beginPath(); g.moveTo(cx - fs * 0.3, cy - fs * 0.3); g.lineTo(cx + fs * 0.3, cy - fs * 0.3); g.lineTo(cx, cy); g.fill(); }
        }
        if (o.extra) o.extra(g, lay.rect, lay.i);
      };
      UI.push(lay);
    });
  },
  clearGhosts() { this.layers = this.layers.filter(l => !l.isGhost); },
  // 一般資訊面板（非互動）
  panel(drawFn) { const l = { modal: false, draw: drawFn }; this.push(l); return l; },
  async choice(opts, o = {}) {
    const items = opts.map(t => ({ t }));
    return this.menu({ items, autoPick: o.autoPick ?? 0, cancel: o.cancel ?? true, pos: () => { const fs = L.FS, h = fs * 3 * 1.55 + L.pad * 2.4; return { right: L.V.x + L.V.w - L.pad * 1.5, bottom: L.V.y + L.V.h - h - L.pad * 1.6 }; } });
  },
  // 問「是／否」
  async yesno(text) { const lay = this.msgKeep(text); const r = await this.choice(['是', '否']); this.remove(lay); return r === 0; },
  // 顯示一段文字但不等待（用在問答時）
  msgKeep(text) {
    const lay = { modal: false, draw: g => {
      const V = L.V, pad = L.pad, fs = L.FS, h = fs * 1.55 * 3 + pad * 2.4, w = Math.min(V.w - pad * 2, fs * 34), x = V.x + (V.w - w) / 2, y = V.y + V.h - h - pad;
      UI.win(g, x, y, w, h); UI.wrap(g, text, w - pad * 3.2).slice(0, 3).forEach((ln, i) => UI.text(g, ln, x + pad * 1.6, y + pad * 1.2 + i * fs * 1.55, '#fff', fs));
    } };
    this.push(lay); return lay;
  },
};
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function bar(g, x, y, w, h, v, col, bg = 'rgba(255,255,255,.12)') { g.fillStyle = bg; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x, y, Math.max(0, Math.min(1, v)) * w, h); }

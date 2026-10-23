/* 棋牌桌遊專區 · 共用工具（全域 TB） */
(function () {
  'use strict';
  const NS = 'tb:';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) {} },
  };

  // ---- 音效（WebAudio 合成，不需要音檔） ----
  let ac = null, muted = store.get('muted', false);
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, dur, type, vol, when, slide) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, when, hp) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (when || 0);
    const b = a.createBuffer(1, Math.max(1, a.sampleRate * dur | 0), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = a.createBufferSource(); s.buffer = b;
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = a.createGain(); g.gain.value = vol || 0.3;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
  const SFX = {
    place() { noise(0.06, 0.5, 0, 1500); tone(180, 0.08, 'sine', 0.25); },      // 落子（木頭聲）
    capture() { noise(0.09, 0.6, 0, 900); tone(140, 0.12, 'triangle', 0.3); },
    flip() { noise(0.04, 0.35, 0, 2500); },                                      // 翻牌/翻棋
    deal() { noise(0.035, 0.25, 0, 3000); },
    click() { tone(900, 0.03, 'square', 0.05); },
    select() { tone(660, 0.05, 'sine', 0.12); },
    bad() { tone(200, 0.12, 'square', 0.08, 0, 150); },
    check() { tone(880, 0.1, 'triangle', 0.18); tone(1175, 0.15, 'triangle', 0.18, 0.1); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.11)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sine', 0.16, i * 0.15)); },
    draw() { tone(523, 0.2, 'sine', 0.15); tone(523, 0.3, 'sine', 0.15, 0.2); },
    boom() { noise(0.5, 0.8, 0, 120); tone(90, 0.5, 'sawtooth', 0.25, 0, 40); },
  };
  function sfx(n) { if (muted) return; try { SFX[n] && SFX[n](); } catch (e) {} }

  // ---- 對話框 ----
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  let openDlg = null;
  function closeDialog() { if (openDlg) { openDlg.remove(); openDlg = null; } }
  /** dialog({title, html, buttons:[{label, primary, value, onClick}], dismiss:true}) → Promise(value) */
  function dialog(o) {
    closeDialog();
    return new Promise(res => {
      const over = document.createElement('div'); over.className = 'tb-over';
      const dlg = document.createElement('div'); dlg.className = 'tb-dlg'; dlg.setAttribute('role', 'dialog');
      dlg.innerHTML = (o.title ? '<h3>' + esc(o.title) + '</h3>' : '') + (o.html || '') + '<div class="tb-acts"></div>';
      const acts = dlg.querySelector('.tb-acts');
      (o.buttons || [{ label: '好', primary: true }]).forEach(b => {
        const el = document.createElement('button'); el.className = 'tb-btn' + (b.primary ? ' primary' : '');
        el.textContent = b.label;
        el.onclick = () => { sfx('click'); if (b.onClick && b.onClick(dlg) === false) return; closeDialog(); res(b.value !== undefined ? b.value : b.label); };
        acts.appendChild(el);
      });
      // 分段選擇按鈕
      dlg.querySelectorAll('.tb-seg').forEach(seg => seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); sfx('click');
      }));
      if (o.dismiss !== false) over.addEventListener('click', e => { if (e.target === over) { closeDialog(); res(null); } });
      over.appendChild(dlg); document.body.appendChild(over); openDlg = over;
      const p = acts.querySelector('.primary'); if (p) p.focus({ preventScroll: true });
    });
  }
  /** seg('名稱', 'key', [[value,label],...], current) → HTML 字串；讀值用 segVal(dlg,'key') */
  function seg(label, key, opts, cur) {
    return '<div class="tb-field"><label>' + esc(label) + '</label><div class="tb-seg" data-key="' + key + '">' +
      opts.map(([v, l]) => '<button type="button" data-v="' + esc(v) + '" aria-pressed="' + (String(v) === String(cur)) + '">' + esc(l) + '</button>').join('') + '</div></div>';
  }
  function segVal(dlg, key) { const b = dlg.querySelector('.tb-seg[data-key="' + key + '"] button[aria-pressed=true]'); return b ? b.dataset.v : null; }

  let toastT = 0;
  function toast(msg, ms) {
    document.querySelectorAll('.tb-toast').forEach(x => x.remove());
    const t = document.createElement('div'); t.className = 'tb-toast'; t.textContent = msg; document.body.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms || 1800);
  }

  // ---- 戰績 ----
  function stats(game) { return store.get('stats:' + game, {}); }
  function bump(game, key, n) { const s = stats(game); s[key] = (s[key] || 0) + (n == null ? 1 : n); store.set('stats:' + game, s); return s; }
  function statsHtml(items) { return '<div class="tb-stats">' + items.map(([l, v]) => '<div><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>').join('') + '</div>'; }

  // ---- 把一個函式放進 Web Worker（電腦思考不卡畫面）----
  /** worker(fn) — fn(self) 會在 worker 內執行並自行設定 onmessage。回傳 {ask(msg)→Promise, kill()} */
  function worker(fn) {
    let w = null, seq = 0; const pend = new Map();
    function make() {
      const src = '(' + fn.toString() + ')(self);\n' +
        'const __h=self.onmessage;self.onmessage=async e=>{const{id,msg}=e.data;try{const r=await __h({data:msg});self.postMessage({id,r})}catch(err){self.postMessage({id,err:String(err)})}};';
      try {
        w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        w.onmessage = e => { const p = pend.get(e.data.id); if (!p) return; pend.delete(e.data.id); e.data.err ? p.rej(e.data.err) : p.res(e.data.r); };
      } catch (e) { w = null; }
    }
    make();
    return {
      ask(msg) {
        if (!w) { // 不支援 worker 時退回主執行緒
          const scope = {}; fn(scope); return Promise.resolve(scope.onmessage({ data: msg }));
        }
        return new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); w.postMessage({ id, msg }); });
      },
      kill() { if (w) w.terminate(); pend.clear(); make(); },
    };
  }

  // ---- 工具列：靜音按鈕 ----
  function wireBar() {
    const m = document.getElementById('tb-mute');
    if (m) {
      const upd = () => { m.textContent = muted ? '🔇' : '🔊'; m.title = muted ? '開啟音效' : '關閉音效'; };
      upd(); m.onclick = () => { muted = !muted; store.set('muted', muted); upd(); if (!muted) sfx('click'); };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireBar); else wireBar();
  // 第一次互動時解鎖音效（iOS）
  addEventListener('pointerdown', () => ctx(), { once: true });

  window.TB = { store, sfx, dialog, closeDialog, seg, segVal, toast, stats, bump, statsHtml, worker, esc,
    get muted() { return muted; } };
})();

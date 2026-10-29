// 大廳「💾 進度備份」：把整個網站的遊戲進度（同一個網域的 localStorage）備份到雲端，換裝置用代碼還原。
// 後端：worker/save.js（/api/save）。只在大廳載入；需要 <button id="saveBtn">。
// - 建立備份 → 拿到 12 碼代碼（XXXX-XXXX-XXXX）和 QR code（掃了會打開 /?restore=代碼）。
// - 這台有代碼之後，每次打開大廳，進度有變就自動更新雲端備份（最快 5 分鐘一次）。
// - 別台裝置先更新過（409）→ 不自動覆蓋，按鈕亮紅點，讓家長選要用哪一份。
(() => {
  const btn = document.getElementById('saveBtn');
  if (!btn) return;
  const META = 'mw-save';
  const SKIP = k => k === META || /offline/i.test(k);   // 離線狀態是每台裝置自己的，不備份
  const AUTO_GAP = 5 * 60e3;
  const OK = 'CompressionStream' in window && 'DecompressionStream' in window;
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const fmt = c => c ? c.match(/.{1,4}/g).join('-') : '';
  const norm = s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const valid = c => /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{12}$/.test(c);
  const when = t => t ? new Date(t).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  function snapshotText() {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SKIP(k)) o[k] = localStorage.getItem(k); }
    return JSON.stringify({ v: 1, data: o });
  }
  function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  const gzip = async text => new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  const gunzip = async buf => new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  async function api(method, path, body) {
    const r = await fetch('/api/save' + path, { method, body, headers: body ? { 'content-type': 'application/gzip' } : {} });
    let j = null;
    if ((r.headers.get('content-type') || '').includes('json')) j = await r.json().catch(() => null);
    return { r, j };
  }

  async function create() {
    const text = snapshotText();
    const { r, j } = await api('POST', '', await gzip(text));
    if (!r.ok) throw new Error((j && j.error) || '備份失敗');
    const m = { code: j.code, rev: j.rev, at: j.at, hash: hash(text) };
    ls.set(META, m); return m;
  }
  async function upload(force) {   // force：衝突時「用這台的覆蓋」
    const m = ls.get(META); if (!m || !m.code) return null;
    const text = snapshotText(), h = hash(text);
    if (!force && h === m.hash) return m;
    const rev = force && m.conflict ? m.conflict.rev : m.rev;
    const { r, j } = await api('PUT', '/' + m.code + '?rev=' + rev, await gzip(text));
    if (r.status === 409) { m.conflict = j; ls.set(META, m); dot(); return m; }
    if (r.status === 404) { m.gone = true; ls.set(META, m); dot(); return m; }
    if (!r.ok) throw new Error((j && j.error) || '備份失敗');
    Object.assign(m, { rev: j.rev, at: j.at, hash: h }); delete m.conflict; delete m.gone;
    ls.set(META, m); dot(); return m;
  }
  async function fetchBackup(code) {
    const { r, j } = await api('GET', '/' + code);
    if (!r.ok) throw new Error((j && j.error) || '讀不到備份');
    const rev = Number(r.headers.get('x-rev')), at = Number(r.headers.get('x-at'));
    const text = await gunzip(await r.arrayBuffer());
    const o = JSON.parse(text);
    return { rev, at, text, data: o.data || {} };
  }
  function apply(code, b) {
    const keep = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (SKIP(k) && k !== META) keep[k] = localStorage.getItem(k); }
    localStorage.clear();
    for (const [k, v] of Object.entries(keep)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(b.data)) if (!SKIP(k)) localStorage.setItem(k, v);
    ls.set(META, { code, rev: b.rev, at: b.at, hash: hash(snapshotText()) });
  }

  // ---------- 畫面 ----------
  const css = `
#svBack{position:fixed;inset:0;z-index:60;background:rgba(40,35,25,.35);display:none;align-items:center;justify-content:center;padding:16px}
#svBack.open{display:flex}
#sv{width:min(460px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border:1px solid var(--line,#e6dfcf);border-radius:6px;padding:22px 22px 18px;position:relative;
  box-shadow:0 18px 40px rgba(0,0,0,.18);color:var(--ink,#2b2b2b);font-family:var(--sans,system-ui);transform:rotate(-.4deg)}
#sv::before{content:"";position:absolute;top:-12px;left:50%;width:110px;height:26px;margin-left:-55px;background:#ffd76a;opacity:.85;transform:rotate(-3deg)}
#sv h3{margin:0 0 6px;font-size:20px}
#sv p{margin:6px 0;color:var(--mute,#6b6b6b);font-size:14px;line-height:1.6}
#sv .x{position:absolute;top:8px;right:10px;border:0;background:transparent;font-size:22px;cursor:pointer;color:var(--mute,#6b6b6b)}
#sv .code{font:700 26px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-align:center;padding:10px;margin:10px 0;border:2px dashed #f1c84b;border-radius:8px;background:#fffbea;user-select:all}
#sv .qr{display:block;margin:6px auto;width:168px;height:168px;image-rendering:pixelated}
#sv .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
#sv button.b{flex:1 1 auto;border:2px solid #2b2b2b;border-radius:10px;padding:9px 12px;font:600 15px var(--sans,system-ui);background:#fff;cursor:pointer;box-shadow:2px 2px 0 #2b2b2b}
#sv button.b.main{background:#ffe066}
#sv button.b.warn{border-color:#b3261e;color:#b3261e;box-shadow:2px 2px 0 #b3261e}
#sv button.b:disabled{opacity:.5;cursor:default}
#sv button.link{border:0;background:transparent;color:var(--mute,#6b6b6b);text-decoration:underline;cursor:pointer;font-size:13px;padding:4px}
#sv input{width:100%;font:600 22px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;padding:10px;border:2px solid var(--line,#e6dfcf);border-radius:8px;text-align:center}
#sv .msg{min-height:20px;font-size:14px;margin-top:8px}
#sv .msg.err{color:#b3261e}
#sv .msg.ok{color:#1f8a4c}
#sv .alert{background:#fff3d6;border:1px solid #f1d08a;border-radius:8px;padding:10px 12px;color:#7a4f00;font-size:14px;margin:10px 0}
#sv small{display:block;color:var(--mute,#6b6b6b);font-size:12px;margin-top:12px;line-height:1.6}
#saveBtn{position:relative}
#saveBtn.dot::after{content:"";position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;background:#e5484d;border:2px solid #fff}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const back = document.createElement('div'); back.id = 'svBack';
  back.innerHTML = '<div id="sv" role="dialog" aria-modal="true" aria-labelledby="svT"><button class="x" type="button" aria-label="關閉">×</button><div class="in"></div></div>';
  document.body.appendChild(back);
  const box = back.querySelector('.in');
  const close = () => back.classList.remove('open');
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.querySelector('.x').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && back.classList.contains('open')) close(); });
  const msg = (t, cls) => { const m = box.querySelector('.msg'); if (m) { m.textContent = t || ''; m.className = 'msg ' + (cls || ''); } };
  const busy = async (b, fn) => { const all = box.querySelectorAll('button'); all.forEach(x => x.disabled = true); try { await fn(); } catch (e) { msg(e.message || '出錯了', 'err'); } finally { all.forEach(x => x.disabled = false); } };
  const PRIV = '<small>只存遊戲進度（貼紙、星星、關卡、設定），不存姓名或任何個人資料。代碼就是鑰匙：知道代碼的人就能拿到這份進度，請不要公開。一年沒有更新的備份會自動刪除。</small>';
  function dot() { const m = ls.get(META); btn.classList.toggle('dot', !!(m && (m.conflict || m.gone))); }

  function qr(img, code) {
    const url = location.origin + '/?restore=' + code;
    const draw = () => { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); img.src = q.createDataURL(5, 2); } catch (e) { img.remove(); } };
    if (window.qrcode) return draw();
    const s = document.createElement('script'); s.src = '/party/qrcode.js'; s.onload = draw; s.onerror = () => img.remove(); document.head.appendChild(s);
  }

  function viewHome() {
    const m = ls.get(META);
    if (!OK) { box.innerHTML = '<h3 id="svT">💾 進度備份</h3><p>這個瀏覽器太舊，不能用進度備份。請更新瀏覽器（Chrome、Safari 16.4 以上）。</p>'; return; }
    if (!m || !m.code) {
      box.innerHTML = `<h3 id="svT">💾 進度備份</h3>
<p>遊戲進度只存在這台裝置的瀏覽器裡，清掉瀏覽器資料或換一台裝置就會不見。建立備份後，用一組代碼就能在別台裝置接著玩。</p>
<div class="row"><button class="b main" type="button" data-a="create">建立備份代碼</button><button class="b" type="button" data-a="restore">我有代碼，還原到這台</button></div>
<div class="msg"></div>${PRIV}`;
    } else {
      let alert = '';
      if (m.gone) alert = '<div class="alert">雲端的這份備份已經被刪除了。可以重新建立一個新的代碼。</div>';
      else if (m.conflict) alert = `<div class="alert">另一台裝置在 ${when(m.conflict.at)} 更新過這份備份，所以這台先不自動覆蓋。要用哪一份？<div class="row"><button class="b" type="button" data-a="pull">用雲端的（換掉這台的）</button><button class="b" type="button" data-a="push">用這台的（蓋掉雲端的）</button></div></div>`;
      box.innerHTML = `<h3 id="svT">💾 進度備份</h3>
<p>這台裝置的備份代碼：</p><div class="code">${fmt(m.code)}</div>
<img class="qr" alt="還原用的 QR code">
<p style="text-align:center">在新裝置打開遊戲大廳 →「💾 進度備份」→ 輸入代碼，或直接用相機掃 QR code。</p>
${alert}
<p>上次備份：${when(m.at)}　·　打開大廳時會自動更新</p>
<div class="row">${m.gone ? '<button class="b main" type="button" data-a="recreate">建立新代碼</button>' : '<button class="b main" type="button" data-a="now">現在備份</button>'}<button class="b" type="button" data-a="restore">用別的代碼還原</button></div>
<div class="msg"></div>
<div class="row"><button class="link" type="button" data-a="forget">這台不要再自動備份</button><button class="link" type="button" data-a="delete">刪除雲端備份</button></div>${PRIV}`;
      const img = box.querySelector('.qr'); if (img) qr(img, m.code);
    }
    box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a, b)));
  }

  function viewRestore(pre) {
    box.innerHTML = `<h3 id="svT">還原進度到這台</h3>
<p>輸入另一台裝置上的 12 碼備份代碼。</p>
<input inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" placeholder="XXXX-XXXX-XXXX" value="${fmt(pre || '')}">
<div class="msg"></div>
<div class="row"><button class="b main" type="button" data-a="load">讀取備份</button><button class="b" type="button" data-a="home">取消</button></div>`;
    const inp = box.querySelector('input');
    inp.addEventListener('input', () => { const c = norm(inp.value).slice(0, 12); inp.value = fmt(c); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') act('load'); });
    box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a, b)));
    setTimeout(() => inp.focus(), 50);
  }

  function viewConfirm(code, b) {
    const n = Object.keys(b.data).length;
    box.innerHTML = `<h3 id="svT">確定要還原嗎？</h3>
<p>找到備份（${when(b.at)} 更新，${n} 筆遊戲資料）。</p>
<div class="alert">這台裝置<b>現在的遊戲進度會被換掉</b>，換成備份裡的進度。之後這台也會用這組代碼自動備份。</div>
<div class="msg"></div>
<div class="row"><button class="b main" type="button" data-a="apply">確定還原</button><button class="b" type="button" data-a="home">取消</button></div>`;
    box.querySelector('[data-a=apply]').addEventListener('click', () => { apply(code, b); msg('還原好了，重新載入中…', 'ok'); setTimeout(() => location.replace('/'), 600); });
    box.querySelector('[data-a=home]').addEventListener('click', viewHome);
  }

  async function act(a, b) {
    if (a === 'home') return viewHome();
    if (a === 'restore') return viewRestore();
    if (a === 'create' || a === 'recreate') return busy(b, async () => { if (a === 'recreate') localStorage.removeItem(META); await create(); viewHome(); msg('備份好了！把代碼抄下來或拍照存著。', 'ok'); dot(); });
    if (a === 'now') return busy(b, async () => { await upload(false); viewHome(); const m = ls.get(META); msg(m.conflict ? '' : '備份好了。', m.conflict ? '' : 'ok'); });
    if (a === 'push') return busy(b, async () => { await upload(true); viewHome(); msg('已經用這台的進度更新雲端備份。', 'ok'); });
    if (a === 'pull') return busy(b, async () => { const m = ls.get(META); viewConfirm(m.code, await fetchBackup(m.code)); });
    if (a === 'load') return busy(b, async () => {
      const c = norm(box.querySelector('input').value);
      if (!valid(c)) throw new Error('代碼是 12 個英文字母和數字，再檢查一下');
      viewConfirm(c, await fetchBackup(c));
    });
    if (a === 'forget') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '確定？（雲端備份還在，代碼記得先抄下來）'; return; }
      localStorage.removeItem(META); dot(); return viewHome();
    }
    if (a === 'delete') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '確定刪除？刪了就不能還原'; return; }
      return busy(b, async () => { const m = ls.get(META); await api('DELETE', '/' + m.code); localStorage.removeItem(META); dot(); viewHome(); msg('雲端備份已刪除。', 'ok'); });
    }
  }

  function open(view) { back.classList.add('open'); view(); }
  btn.addEventListener('click', () => open(viewHome));
  dot();

  // 掃 QR code 進來：/?restore=代碼
  const q = new URLSearchParams(location.search).get('restore');
  if (q) {
    history.replaceState(null, '', location.pathname);
    if (OK) open(() => viewRestore(norm(q)));
  }

  // 自動備份：打開大廳 3 秒後，進度有變、距離上次超過 5 分鐘就更新
  setTimeout(() => {
    const m = ls.get(META);
    if (!OK || !m || !m.code || m.conflict || m.gone || !navigator.onLine) return;
    if (Date.now() - (m.at || 0) < AUTO_GAP) return;
    upload(false).catch(() => { });
  }, 3000);
})();

// MW Game Hall — 離線包（每頁都可以載入：<script src="/offline/offline.js" data-game="abc" defer></script>）
// - 註冊全站 service worker（/sw.js），它負責沒網路時用存檔回應。
// - 下載／更新／移除離線包：索引在 /offline/manifest.json、各遊戲完整清單在 /offline/packs/<遊戲>.json（部署時自動產生，見 tools/offline-manifest.mjs）。
//   每個檔案記雜湊，更新時只抓有變的檔案；下載到一半中斷，下次會從中斷的地方接著抓。
// - 遊戲頁：小遊戲（≤ 8 MB）打開一次就自動存；已經存過的遊戲有新版本會自動在背景更新。
// - 大廳：顯示每款遊戲的狀態與「下載離線版」按鈕（UI 在大廳 index.html）；大廳自己的檔案也會自動存。
// 進度用 window 事件 'mw-offline' 通知：{ slug, state: 'idle'|'busy'|'ready'|'error', pct, size }
(() => {
  if (window.MWOffline) return;
  const me = document.currentScript;
  const PAGE = (me && me.dataset.game) || '';
  const AUTO_MAX = 8 * 1048576;
  const OK = 'serviceWorker' in navigator && 'caches' in window && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  const META = 'mw-meta', mkey = s => '/__mw/meta/' + s, pname = s => 'mw-pack-' + s;
  const keyOf = u => {   // 和 sw.js 同一套網址正規化
    const url = new URL(u, location.href);
    if (url.origin !== location.origin) return url.href;
    let p = url.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return url.origin + p;
  };
  const clean = async res => res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
  const emit = (slug, state, extra) => window.dispatchEvent(new CustomEvent('mw-offline', { detail: Object.assign({ slug, state }, extra || {}) }));

  let manP = null;
  function manifest(fresh) {
    if (!manP || fresh) manP = fetch('/offline/manifest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
    return manP;
  }
  async function getMeta(slug) {
    try { const r = await (await caches.open(META)).match(mkey(slug)); return r ? await r.json() : null; } catch (e) { return null; }
  }
  async function setMeta(slug, m) {
    try { await (await caches.open(META)).put(mkey(slug), new Response(JSON.stringify(m), { headers: { 'content-type': 'application/json' } })); } catch (e) { }
  }
  const busy = new Map();
  const progress = new Map();

  // 狀態：none（沒存）、partial（下載到一半）、ready（存好了）、old（存好了但有新版）
  async function status(slug) {
    const [man, meta] = await Promise.all([manifest(), getMeta(slug)]);
    const g = man && (slug === 'hall' ? man.hall : man.games[slug]);
    const size = g ? g.size : (meta && meta.size) || 0;
    if (busy.has(slug)) return { state: 'busy', pct: progress.get(slug) || 0, size };
    if (!meta) return { state: 'none', size, available: !!g };
    if (!meta.complete) return { state: 'partial', size, available: !!g };
    return { state: g && g.v !== meta.v ? 'old' : 'ready', size, available: !!g };
  }

  // three.js 子模組裡還會 import 別的檔案（例如 ../shaders/CopyShader.js），順著抓下去
  async function crawl(cache, urls) {
    const seen = new Set(), queue = [...urls];
    let fail = 0;
    while (queue.length) {
      const u = queue.shift();
      if (seen.has(u)) continue;
      seen.add(u);
      try {
        if (await cache.match(u)) { continue; }
        const r = await fetch(u, { mode: 'cors' });
        if (!r.ok) { fail++; continue; }
        if (/\.m?js($|\?)|\+esm$/.test(u)) {
          const txt = await r.clone().text();
          for (const m of txt.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.{1,2}\/[^'"]+|\/npm\/[^'"]+)['"]/g)) queue.push(new URL(m[1], u).href);
        }
        await cache.put(u, r);
      } catch (e) { fail++; }
    }
    return fail;
  }

  async function sync(slug, opts = {}) {
    if (!OK) return false;
    if (busy.has(slug)) return busy.get(slug);
    const job = (async () => {
      const man = await manifest(true);
      const brief = man && (slug === 'hall' ? man.hall : man.games[slug]);
      const g = brief && await fetch('/offline/packs/' + slug + '.json?v=' + brief.v, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
      if (!g) { emit(slug, 'error', { msg: '找不到這款遊戲的離線清單' }); return false; }
      g.size = brief.size;
      if (opts.persist && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
      const cache = await caches.open(pname(slug));
      const meta = (await getMeta(slug)) || { files: {} };
      meta.size = g.size;
      const want = new Map(g.files.map(f => [f[0], f]));
      // 新版沒有的檔案拿掉
      for (const p of Object.keys(meta.files)) if (!want.has(p)) { await cache.delete(keyOf('/' + p)); delete meta.files[p]; }
      const todo = g.files.filter(f => meta.files[f[0]] !== f[1]);
      const total = todo.reduce((a, f) => a + f[2], 0) || 1;
      let doneBytes = 0, fail = 0, n = 0, i = 0;
      const tick = () => { const pct = Math.min(99, Math.round(doneBytes / total * 100)); progress.set(slug, pct); emit(slug, 'busy', { pct, size: g.size }); };
      tick();
      const worker = async () => {
        while (i < todo.length) {
          const [p, h, sz] = todo[i++];
          try {
            const r = await fetch('/' + p, { cache: 'no-cache' });
            if (r.ok) { await cache.put(keyOf('/' + p), await clean(r)); meta.files[p] = h; }
            else if (r.status === 404) meta.files[p] = h;   // 部署後已經不在了，不必一直重抓
            else fail++;
          } catch (e) { fail++; }
          doneBytes += sz;
          if (++n % 60 === 0) { await setMeta(slug, Object.assign({}, meta, { complete: false })); tick(); }
          else if (n % 10 === 0) tick();
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, todo.length || 1) }, worker));
      fail += await crawl(cache, g.cdn || []);
      meta.v = g.v; meta.complete = fail === 0; meta.at = Date.now();
      await setMeta(slug, meta);
      emit(slug, fail ? 'error' : 'ready', { size: g.size, msg: fail ? `有 ${fail} 個檔案沒抓到，可以再試一次` : '' });
      return !fail;
    })().finally(() => { busy.delete(slug); progress.delete(slug); });
    busy.set(slug, job);
    return job;
  }

  async function remove(slug) {
    await caches.delete(pname(slug));
    try { await (await caches.open(META)).delete(mkey(slug)); } catch (e) { }
    emit(slug, 'idle', {});
  }

  window.MWOffline = { supported: OK, manifest, status, sync, remove };
  if (!OK) return;
  navigator.serviceWorker.register('/sw.js').catch(() => { });

  // 自動：這一頁的遊戲（或大廳）——小的就存，存過的有新版就更新
  // 頁面載入後 1.5 秒（字型之類載不到時，最晚 6 秒）開始
  let started = false;
  const start = fn => { const go = () => { if (!started) { started = true; setTimeout(fn, 1500); } }; if (document.readyState === 'complete') go(); else { window.addEventListener('load', go); setTimeout(go, 4500); } };
  start(async () => {
    if (!navigator.onLine) return;
    const slug = PAGE || null;
    if (!slug) return;
    const st = await status(slug);
    if (!st.available) return;
    if (st.state === 'old' || st.state === 'partial') sync(slug);
    else if (st.state === 'none' && (slug === 'hall' || st.size <= AUTO_MAX)) sync(slug);
    if (slug === 'hall') {   // 大廳順便把已經存過、但有新版的遊戲在背景更新（一次一款）
      const man = await manifest();
      for (const s of Object.keys((man && man.games) || {})) {
        const x = await status(s);
        if (x.state === 'old') await sync(s);
      }
    }
  });
})();

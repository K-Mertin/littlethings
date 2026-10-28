// MW Game Hall — 全站離線支援（service worker，範圍是整個網站 /）
// 存檔由頁面的 offline/offline.js 負責（下載離線包到 mw-pack-<遊戲> 快取）；這裡只負責「怎麼回應」：
//   - 程式和網頁（html/js/css/json）：有網路就拿最新的，順便更新存檔；沒網路或太慢才用存檔
//   - 圖片、聲音、模型這些大檔：先用存檔，沒有才上網抓
//   - jsdelivr／unpkg 的套件和 Google 字型：版本固定，先用存檔
// 不碰：/api/（後端）、/minigames/（遊戲小屋有自己的 service worker）
const RT = 'mw-rt-v1';
const CDN_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const CODE = /\.(html|js|mjs|css|json|webmanifest)$/i;

// /abc/index.html、/abc/index、/abc/、/abc 都是同一頁；/td/play.html 和 /td/play 也是（Cloudflare 會在兩者之間轉址）
function keyOf(u) {
  const url = new URL(u, self.location.href);
  if (url.origin !== self.location.origin) return url.href;
  let p = url.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return url.origin + p;
}
async function clean(res) {   // 轉址過的回應不能直接拿來開網頁，複製一份乾淨的
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}
// 檔案屬於哪個離線包：/abc/… → mw-pack-abc；根目錄的檔案、/helper/、/offline/ → 大廳
const HALL_DIRS = ['helper', 'offline'];
function packOf(pathname) {
  const s = pathname.split('/');
  const dir = s.length > 2 ? s[1] : (s[1] && !s[1].includes('.') ? s[1] : '');
  return 'mw-pack-' + (!dir || HALL_DIRS.includes(dir) ? 'hall' : dir);
}
async function hasPack(name) { return (await caches.keys()).includes(name); }
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('slow')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });

// 沒網路、這頁又沒存過：給一頁簡單的說明和回大廳的按鈕（不能直接回大廳的內容，網址還停在原本那頁，大廳的相對連結會壞）
function offlinePage() {
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>沒有網路</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#101214;color:#e7e4dc;font:16px/1.6 system-ui,"PingFang TC","Microsoft JhengHei",sans-serif;text-align:center;padding:24px}
.b{max-width:420px}.e{font-size:56px}a{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:999px;background:#f3bb4f;color:#1d1606;font-weight:700;text-decoration:none}</style></head>
<body><div class="b"><div class="e">✈️</div><h1 style="font-size:22px;margin:8px 0">現在沒有網路</h1><p>這款遊戲還沒存到這台裝置，要等有網路才能玩。<br>有網路時在遊戲大廳按「📥 下載離線版」，以後沒網路也能玩。</p><a href="/">← 回遊戲大廳</a></div></body></html>`;
  return new Response(html, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('mw-rt-') && k !== RT) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    if (!CDN_HOSTS.includes(url.hostname)) return;
    e.respondWith((async () => {
      const hit = await caches.match(url.href, { ignoreVary: true });
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') { const c = r.clone(); e.waitUntil(caches.open(RT).then(x => x.put(url.href, c))); }
      return r;
    })());
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/minigames/') || url.pathname === '/sw.js' || url.pathname.startsWith('/offline/manifest') || url.pathname.startsWith('/offline/packs/')) return;
  const key = keyOf(url.href);
  const pack = packOf(url.pathname);
  const isCode = req.mode === 'navigate' || CODE.test(url.pathname) || url.pathname.endsWith('/');

  if (isCode) {
    e.respondWith((async () => {
      try {
        const r = await timeout(fetch(req), self.navigator && navigator.onLine === false ? 1 : 6000);
        if (r.ok && await hasPack(pack)) { const c = await clean(r.clone()); e.waitUntil(caches.open(pack).then(x => x.put(key, c))); }
        return r.redirected && req.mode === 'navigate' ? clean(r) : r;
      } catch (err) {
        const hit = await caches.match(key, { ignoreVary: true });
        if (hit) return hit;
        if (req.mode === 'navigate') return offlinePage();
        throw err;
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(key, { ignoreVary: true });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && r.status === 200 && await hasPack(pack)) { const c = await clean(r.clone()); e.waitUntil(caches.open(pack).then(x => x.put(key, c))); }
    return r;
  })());
});

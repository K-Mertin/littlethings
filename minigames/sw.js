// 噗噗的遊戲小屋 — offline support (service worker, scope /minigames/)
// Online: always fetch the newest file (so updates show up right away) and keep a copy.
// Offline (or a very slow network): answer from the saved copies.
// The hub page asks for every game to be saved once ('cacheAll'), so all games work without internet afterwards.
const CACHE = 'puputown-offline-v1';
const CDN = 'https://cdn.jsdelivr.net/';

// /minigames/stairs.html, /minigames/stairs and /minigames/stairs/ are the same page (the host may redirect between them)
function keyOf(u) {
  const url = new URL(u, self.location.href);
  if (url.origin !== self.location.origin) return url.href;
  let p = url.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (p.length > 1 && p.endsWith('/') && p !== new URL('./', self.location.href).pathname) p = p.slice(0, -1);
  return url.origin + p;
}
// a redirected response can't be handed back for a page load, so keep a clean copy
async function clean(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
async function save(req, res) {
  if (!res || !(res.ok || res.type === 'opaque')) return;
  const c = await caches.open(CACHE);
  await c.put(keyOf(req.url || req), await clean(res.clone()));
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of ['./', 'mini.js', 'mini.css']) { try { const r = await fetch(u, { cache: 'no-cache' }); if (r.ok) await c.put(keyOf(new URL(u, self.location.href).href), await clean(r)); } catch {} }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('puputown-offline-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// the hub sends every file a game needs; reply with progress so it can show "可以離線玩"
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type !== 'cacheAll' || !Array.isArray(d.urls)) return;
  const port = e.ports && e.ports[0];
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    let done = 0, fail = 0;
    for (const u of d.urls) {
      const abs = new URL(u, self.location.href).href;
      try {
        const cross = !abs.startsWith(self.location.origin);
        const r = await fetch(abs, cross ? { mode: 'cors' } : { cache: 'no-cache' });
        if (r.ok) { await c.put(keyOf(abs), await clean(r)); done++; } else fail++;
      } catch { fail++; }
      if (port) port.postMessage({ type: 'progress', done, fail, total: d.urls.length });
    }
    if (port) port.postMessage({ type: 'done', done, fail, total: d.urls.length });
  })());
});

const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('slow')), ms); p.then(v => { clearTimeout(t); res(v); }, err => { clearTimeout(t); rej(err); }); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (url.startsWith(CDN)) {             // three.js for 3D 開車車: versioned files, saved copy first
    e.respondWith((async () => {
      const hit = await caches.match(keyOf(url), { ignoreVary: true });
      if (hit) return hit;
      const r = await fetch(req); save(url, r.clone()); return r;
    })());
    return;
  }
  if (!url.startsWith(self.location.origin) || !new URL(url).pathname.startsWith(new URL('./', self.location.href).pathname)) return;
  e.respondWith((async () => {
    try {
      const r = await timeout(fetch(req), navigator.onLine === false ? 1 : 6000);
      if (r.ok) e.waitUntil(save(url, r.clone()));
      return r.redirected && req.mode === 'navigate' ? clean(r) : r;
    } catch (err) {
      const hit = await caches.match(keyOf(url), { ignoreVary: true });
      if (hit) return hit;
      if (req.mode === 'navigate') { const home = await caches.match(keyOf(new URL('./', self.location.href).href), { ignoreVary: true }); if (home) return home; }
      throw err;
    }
  })());
});

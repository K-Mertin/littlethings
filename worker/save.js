// 跨裝置進度備份：/api/save
//   POST   /api/save                → 建立新備份，body = 壓縮過的存檔（gzip），回 { code, rev, at }
//   GET    /api/save/<代碼>         → 下載備份（body = gzip），標頭 x-rev、x-at
//   PUT    /api/save/<代碼>?rev=N   → 更新備份；伺服器上的 rev 不是 N（別台裝置先更新過）就回 409 { rev, at }
//   DELETE /api/save/<代碼>         → 刪除備份
// 代碼就是鑰匙（12 碼、約 59 bits），每個代碼一個 Durable Object（SaveBox）。不存任何個資，只有遊戲的 localStorage。
// 一年沒有更新會自動刪除（alarm）。

const ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // 去掉 0 O 1 I L，小朋友抄代碼不會抄錯
const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{12}$/;
const MAX = 4 * 1048576;          // 壓縮後最大 4 MB
const CHUNK = 256 * 1024;         // DO storage 一個值存 256 KB
const KEEP = 365 * 86400e3;       // 一年沒更新就刪
const LIMITS = { createPerIpDay: 10, writePerIpHour: 120, readPerIpHour: 40 };

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map(x => ABC[x % ABC.length]).join('');
}

export class SaveBox {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const s = this.ctx.storage;
    const meta = await s.get('meta');
    if (request.method === 'GET') {
      if (!meta) return new Response('none', { status: 404 });
      const parts = await s.get([...Array(meta.n).keys()].map(i => 'c' + i));
      const out = new Uint8Array(meta.size);
      let o = 0;
      for (let i = 0; i < meta.n; i++) { const c = parts.get('c' + i); out.set(c, o); o += c.length; }
      return new Response(out, { headers: { 'content-type': 'application/gzip', 'x-rev': String(meta.rev), 'x-at': String(meta.at), 'cache-control': 'no-store' } });
    }
    if (request.method === 'DELETE') {
      await s.deleteAll(); await s.deleteAlarm();
      return json({ ok: true });
    }
    // PUT（建立時 base = -1）
    const base = Number(new URL(request.url).searchParams.get('base'));
    if (base === -1 ? !!meta : (!meta || meta.rev !== base)) return json(meta ? { rev: meta.rev, at: meta.at } : { rev: null }, meta ? 409 : 404);
    const body = new Uint8Array(await request.arrayBuffer());
    const n = Math.ceil(body.length / CHUNK) || 1;
    const put = {};
    for (let i = 0; i < n; i++) put['c' + i] = body.slice(i * CHUNK, (i + 1) * CHUNK);
    const next = { rev: (meta ? meta.rev : 0) + 1, at: Date.now(), size: body.length, n };
    put.meta = next;
    if (meta) for (let i = n; i < meta.n; i++) await s.delete('c' + i);
    await s.put(put);
    await s.setAlarm(Date.now() + KEEP);
    return json({ rev: next.rev, at: next.at });
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}

export async function handleSave(request, env, path, allow) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const day = new Date().toISOString().slice(0, 10);
  const box = code => env.SAVE_BOX.get(env.SAVE_BOX.idFromName(code));
  const readBody = async () => {
    const len = Number(request.headers.get('content-length') || 0);
    if (len > MAX) return null;
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX) return null;
    const b = new Uint8Array(buf);
    return b[0] === 0x1f && b[1] === 0x8b ? buf : null;   // 只收 gzip
  };

  if (path === '/api/save') {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (!await allow('savenew:' + ip + ':' + day, LIMITS.createPerIpDay, 86400e3)) return json({ error: '今天建立太多備份了，明天再試' }, 429);
    const body = await readBody();
    if (!body) return json({ error: '存檔太大或格式不對' }, 413);
    for (let i = 0; i < 3; i++) {
      const code = newCode();
      const r = await box(code).fetch('https://save/?base=-1', { method: 'PUT', body });
      if (r.status === 409) continue;   // 幾乎不會撞到；撞到就換一個
      const j = await r.json();
      return json({ code, rev: j.rev, at: j.at });
    }
    return json({ error: '請再試一次' }, 500);
  }

  const m = path.match(/^\/api\/save\/([0-9A-Z]{12})$/);
  if (!m || !CODE_RE.test(m[1])) return json({ error: '代碼不對' }, 400);
  const code = m[1];
  if (request.method === 'GET') {
    if (!await allow('saveget:' + ip, LIMITS.readPerIpHour, 3600e3)) return json({ error: '試太多次了，等一下再試' }, 429);
    const r = await box(code).fetch('https://save/');
    return r.status === 404 ? json({ error: '找不到這個代碼的備份' }, 404) : r;
  }
  if (request.method === 'PUT') {
    if (!await allow('saveput:' + ip, LIMITS.writePerIpHour, 3600e3)) return json({ error: '備份太頻繁了，等一下再試' }, 429);
    const rev = Number(new URL(request.url).searchParams.get('rev'));
    if (!Number.isInteger(rev) || rev < 1) return json({ error: 'bad rev' }, 400);
    const body = await readBody();
    if (!body) return json({ error: '存檔太大或格式不對' }, 413);
    const r = await box(code).fetch('https://save/?base=' + rev, { method: 'PUT', body });
    if (r.status === 404) return json({ error: '找不到這個代碼的備份' }, 404);
    return r;
  }
  if (request.method === 'DELETE') {
    if (!await allow('saveput:' + ip, LIMITS.writePerIpHour, 3600e3)) return json({ error: '等一下再試' }, 429);
    return box(code).fetch('https://save/', { method: 'DELETE' });
  }
  return new Response('Method not allowed', { status: 405 });
}

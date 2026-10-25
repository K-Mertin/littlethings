// 連線一起玩 (link/) room relay. One Durable Object per room code.
//   /api/link/room/ABCDE?role=host|guest&id=<client id>
// The room creator's browser is the host: it runs every game and decides what each player may see.
// This object only passes messages along, so it never needs to know any game's rules:
//   guest → host : the raw guest message, wrapped as {"k":"_msg","id":"<guest id>","m":<message>}
//   host  → guests: {"all":<payload>} goes to every guest, {"to":{"<id>":<payload>,…}} only to those guests
//                   (both may be in one message); each guest receives just the payload.
// Connection events the host gets: _hello (guests already here), _join, _leave. Guests get _host {on}.
// Uses the hibernation API, so an idle room costs nothing.
const ID_RE = /^[A-Za-z0-9_-]{4,24}$/;
const MAX_GUESTS = 14;          // 6 players, a big screen, a few watchers / reconnect overlaps
const MAX_BYTES = 96 * 1024;

export class LinkRoom {
  constructor(ctx, env) { this.ctx = ctx; }

  idOf(ws) { const t = this.ctx.getTags(ws).find(t => t.startsWith('i:')); return t ? t.slice(2) : ''; }
  roleOf(ws) { return this.ctx.getTags(ws)[0]; }
  sendTo(ws, s) { try { ws.send(s); } catch (e) { } }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const q = new URL(request.url).searchParams, role = q.get('role'), id = q.get('id') || '';
    const hosts = this.ctx.getWebSockets('host'), guests = this.ctx.getWebSockets('guest');
    const hostId = await this.ctx.storage.get('hostId');
    let err = null, code = '';
    if ((role !== 'host' && role !== 'guest') || !ID_RE.test(id)) { err = '連線資料不正確。'; code = 'bad'; }
    else if (role === 'host') {
      // a host may come back (page reload, network blip) with the same id; a different device may not take over a live room
      const live = hosts.filter(w => this.idOf(w) !== id);
      if (live.length) { err = '這個房號正在使用中，換一個試試。'; code = 'busy'; }
    } else if (!hosts.length) { err = hostId ? '房主暫時斷線了，等一下再試。' : '找不到這個房間，請確認房號。'; code = hostId ? 'away' : 'none'; }
    else if (guests.filter(w => this.idOf(w) !== id).length >= MAX_GUESTS) { err = '這個房間人太多了。'; code = 'full'; }
    const { 0: client, 1: server } = new WebSocketPair();
    if (err) {
      server.accept();
      server.send(JSON.stringify({ k: '_error', code, msg: err }));
      server.close(1000, 'refused');
      return new Response(null, { status: 101, webSocket: client });
    }
    // the same id reconnecting replaces its old socket
    for (const w of (role === 'host' ? hosts : guests)) if (this.idOf(w) === id) { try { w.close(1000, 'replaced'); } catch (e) { } }
    this.ctx.acceptWebSocket(server, [role, 'i:' + id]);
    if (role === 'host') {
      await this.ctx.storage.put('hostId', id);
      const ids = this.ctx.getWebSockets('guest').map(w => this.idOf(w));
      server.send(JSON.stringify({ k: '_hello', ids }));
      for (const g of this.ctx.getWebSockets('guest')) this.sendTo(g, '{"k":"_host","on":true}');
    } else {
      for (const h of this.ctx.getWebSockets('host')) this.sendTo(h, JSON.stringify({ k: '_join', id }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_BYTES) return;
    if (this.roleOf(ws) === 'guest') {
      const s = '{"k":"_msg","id":"' + this.idOf(ws) + '","m":' + message + '}';
      for (const h of this.ctx.getWebSockets('host')) this.sendTo(h, s);
      return;
    }
    let m; try { m = JSON.parse(message); } catch (e) { return; }
    if (m.k === '_ping') { this.sendTo(ws, '{"k":"_pong"}'); return; }
    const all = m.all !== undefined ? JSON.stringify(m.all) : null, to = m.to || {}, cache = {};
    for (const g of this.ctx.getWebSockets('guest')) {
      const gid = this.idOf(g);
      if (to[gid] !== undefined) this.sendTo(g, cache[gid] || (cache[gid] = JSON.stringify(to[gid])));
      if (all) this.sendTo(g, all);
    }
  }

  async webSocketClose(ws, code) {
    const role = this.roleOf(ws), id = this.idOf(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch (e) { }
    if (role === 'host') {
      if (!this.ctx.getWebSockets('host').some(w => w !== ws)) for (const g of this.ctx.getWebSockets('guest')) this.sendTo(g, '{"k":"_host","on":false}');
    } else if (!this.ctx.getWebSockets('guest').some(w => w !== ws && this.idOf(w) === id)) {
      for (const h of this.ctx.getWebSockets('host')) this.sendTo(h, JSON.stringify({ k: '_leave', id }));
    }
    // forget an empty room so its code can be reused later
    if (!this.ctx.getWebSockets().some(w => w !== ws)) await this.ctx.storage.deleteAll();
  }

  async webSocketError(ws) { await this.webSocketClose(ws, 1011); }
}

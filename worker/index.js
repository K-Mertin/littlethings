// littleland Worker: serves the static site, plus a tiny API for online games and the hall chatbot.
//   /api/chat, /api/issue  →  大廳小幫手 (worker/chat.js)
//   /api/tts?t=…           →  小幫手朗讀，Azure 神經語音 (worker/tts.js)
//   /api/outpost/room/ABCD?role=host|guest  →  Crystal Outpost 1 vs 1 relay (one Durable Object per room)
// Only /api/* reaches this script (assets.run_worker_first); every other path is a plain static file.

import { handleChat, ChatGuard, allow } from './chat.js';
import { handleTts, TtsCache } from './tts.js';
export { ChatGuard, TtsCache };

export class OutpostRoom {
  constructor(ctx, env) { this.ctx = ctx; }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const role = new URL(request.url).searchParams.get('role');
    const hosts = this.ctx.getWebSockets('host').length, guests = this.ctx.getWebSockets('guest').length;
    let err = null;
    if (role !== 'host' && role !== 'guest') err = 'Bad request.';
    else if (role === 'host' && (hosts || guests)) err = 'That room code is already in use. Try again.';
    else if (role === 'guest' && !hosts) err = 'No room with that code. Check the letters with your friend.';
    else if (role === 'guest' && guests) err = 'That room is already full.';
    const { 0: client, 1: server } = new WebSocketPair();
    if (err) {
      server.accept();
      server.send(JSON.stringify({ k: 'error', msg: err }));
      server.close(1000, 'refused');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server, [role]);   // hibernation API: no charge while nobody is talking
    if (role === 'guest') for (const ws of this.ctx.getWebSockets('host')) ws.send(JSON.stringify({ k: 'peer', joined: true }));
    return new Response(null, { status: 101, webSocket: client });
  }

  // relay every message to the other player, untouched
  async webSocketMessage(ws, message) {
    const other = this.ctx.getTags(ws)[0] === 'host' ? 'guest' : 'host';
    for (const o of this.ctx.getWebSockets(other)) { try { o.send(message); } catch (e) { } }
  }

  async webSocketClose(ws, code, reason) {
    const other = this.ctx.getTags(ws)[0] === 'host' ? 'guest' : 'host';
    for (const o of this.ctx.getWebSockets(other)) { try { o.send(JSON.stringify({ k: 'peer', left: true })); } catch (e) { } }
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) { }
  }

  async webSocketError(ws) { await this.webSocketClose(ws, 1011, 'error'); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/api\/outpost\/room\/([A-Z]{4})$/);
    if (m) return env.OUTPOST_ROOMS.get(env.OUTPOST_ROOMS.idFromName(m[1])).fetch(request);
    if (url.pathname === '/api/chat' || url.pathname === '/api/issue') return handleChat(request, env, url.pathname);
    if (url.pathname === '/api/tts') return handleTts(request, env, (k, l, t, a) => allow(env, k, l, t, a));
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};

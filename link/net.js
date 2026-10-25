'use strict';
/* 連線一起玩 — transport.
   Production: a WebSocket to the room relay (/api/link/room/CODE, a Cloudflare Durable Object, see worker/link.js).
   Works on the same Wi-Fi and across the internet alike; the relay only forwards messages.
   ?net=local: a BroadcastChannel that behaves exactly like the relay, so several tabs on one
   computer can test everything without the worker.

   LinkNet.open({ room, role:'host'|'guest', id, on(msg), status(state, info) })
     host  .send({all?, to?})      → guests (see worker/link.js)
     guest .send(obj)              → host (arrives there as {k:'_msg', id, m:obj})
   status: 'connecting' | 'open' | 'retry' | 'refused' (info = {code,msg}) */
const LinkNet = (() => {
  const LOCAL = new URLSearchParams(location.search).get('net') === 'local';

  function wsURL(room, role, id) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = new URLSearchParams(location.search).get('relay') || (proto + '//' + location.host);
    return base + '/api/link/room/' + room + '?role=' + role + '&id=' + encodeURIComponent(id);
  }

  /* WebSocket with automatic reconnect (the same id re-takes its seat) */
  function openWS(o) {
    let ws = null, closed = false, tries = 0, timer = 0, ping = 0, queue = [];
    const api = {
      send(obj) { const s = JSON.stringify(obj); if (ws && ws.readyState === 1) ws.send(s); else if (o.role === 'guest' && queue.length < 30) queue.push(s); },
      close() { closed = true; clearTimeout(timer); clearInterval(ping); try { ws && ws.close(1000, 'bye'); } catch (e) { } },
      get open() { return !!ws && ws.readyState === 1; }
    };
    function connect() {
      if (closed) return;
      o.status(tries ? 'retry' : 'connecting');
      try { ws = new WebSocket(wsURL(o.room, o.role, o.id)); } catch (e) { return later(); }
      let refused = false;
      ws.onopen = () => {
        tries = 0; o.status('open');
        while (queue.length) ws.send(queue.shift());
        clearInterval(ping);
        // keep NAT/proxies from dropping a quiet socket (turn-based games can be silent for a while)
        ping = setInterval(() => { if (ws.readyState === 1) ws.send(o.role === 'host' ? '{"k":"_ping"}' : '{"k":"_ping"}'); }, 25000);
      };
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (er) { return; }
        if (m.k === '_error') { refused = true; closed = true; o.status('refused', m); return; }
        if (m.k === '_pong' || (m.k === '_msg' && m.m && m.m.k === '_ping')) return;
        o.on(m);
      };
      ws.onclose = () => { clearInterval(ping); if (!refused) later(); };
      ws.onerror = () => { };
    }
    function later() {
      if (closed) return;
      tries++; o.status('retry', { tries });
      clearTimeout(timer); timer = setTimeout(connect, Math.min(8000, 400 * Math.pow(1.7, tries)));
    }
    // phones put pages to sleep: reconnect at once when the page is shown again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !closed && (!ws || ws.readyState > 1)) { tries = Math.max(tries, 1); clearTimeout(timer); connect(); }
    });
    connect();
    return api;
  }

  /* BroadcastChannel stand-in for the relay (tests) */
  function openLocal(o) {
    const bc = new BroadcastChannel('mwlink-' + o.room);
    let closed = false;
    const post = m => { if (!closed) bc.postMessage(m); };
    bc.onmessage = e => {
      const d = e.data;
      if (o.role === 'host') {
        if (d.g == null) return;
        if (d.join) o.on({ k: '_join', id: d.g });
        else if (d.leave) o.on({ k: '_leave', id: d.g });
        else if (d.m) { if (d.m.k !== '_ping') o.on({ k: '_msg', id: d.g, m: d.m }); }
        else if (d.who) post({ h: 1, here: 1 });
      } else {
        if (!d.h) return;
        if (d.here) { if (!o._joined) { o._joined = 1; o.status('open'); post({ g: o.id, join: 1 }); } return; }
        if (d.hello) { o._joined = 1; o.status('open'); post({ g: o.id, join: 1 }); o.on({ k: '_host', on: true }); return; }
        if (d.gone) { o.on({ k: '_host', on: false }); return; }
        if (d.to && d.to[o.id] !== undefined) o.on(JSON.parse(JSON.stringify(d.to[o.id])));
        if (d.all !== undefined) o.on(JSON.parse(JSON.stringify(d.all)));
      }
    };
    setTimeout(() => {
      o.status('connecting');
      if (o.role === 'host') { o.status('open'); o.on({ k: '_hello', ids: [] }); post({ h: 1, hello: 1 }); }
      else post({ g: o.id, who: 1 });
    }, 30);
    addEventListener('pagehide', () => post(o.role === 'host' ? { h: 1, gone: 1 } : { g: o.id, leave: 1 }));
    return {
      send(obj) { if (o.role === 'host') post({ h: 1, all: obj.all, to: obj.to }); else post({ g: o.id, m: obj }); },
      close() { post(o.role === 'host' ? { h: 1, gone: 1 } : { g: o.id, leave: 1 }); closed = true; bc.close(); },
      get open() { return !closed; }
    };
  }

  return { LOCAL, open: o => (LOCAL ? openLocal(o) : openWS(o)) };
})();

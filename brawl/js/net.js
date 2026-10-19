'use strict';
/* ------------------------------ phones as controllers ------------------------------
   The big screen (this page) opens a room and shows a QR code. Each phone opens
   controller.html?room=CODE, picks a hero and becomes a gamepad.
   Transport: PeerJS (WebRTC data channels; the free PeerJS broker only introduces
   the two sides). With ?net=local the pages talk over a BroadcastChannel instead,
   so two tabs on one computer can test everything without a network. */
const NET_CDN = {
  peer: 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  qr: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
};
const NET_LOCAL = new URLSearchParams(location.search).get('net') === 'local';
function loadScript(src) {
  return new Promise((ok, bad) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('load ' + src)); document.head.appendChild(s);
  });
}
function roomCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.random() * A.length | 0]; return s; }

/* host side of the transport: h.msg(peer, data), h.close(peer) */
class HostNet {
  constructor(h) { this.h = h; this.conns = new Map(); this.room = null; }
  async open() {
    if (NET_LOCAL) {
      this.room = store.get('room', null) || roomCode(); store.set('room', this.room);
      this.bc = new BroadcastChannel('buddybattle-' + this.room);
      this.bc.onmessage = e => { const m = e.data; if (m.to !== 'host') return; if (m.d.t === 'bye') this.h.close(m.from); else this.h.msg(m.from, m.d); };
      return;
    }
    await loadScript(NET_CDN.peer);
    // keep the same room number as last time, so phones that still have the old address can join again
    for (let tries = 0; tries < 4; tries++) {
      this.room = tries === 0 && store.get('room', null) || roomCode();
      try { await this.listen(); store.set('room', this.room); return; } catch (e) { if (!(e && e.type === 'unavailable-id')) throw e; }
    }
    throw new Error('no room');
  }
  listen() {
    return new Promise((ok, bad) => {
      let opened = false;
      const peer = this.peer = new Peer('buddybattle-' + this.room, { debug: 0 });
      peer.on('open', () => { opened = true; ok(); });
      peer.on('error', e => { if (!opened) { peer.destroy(); bad(e); } });
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 1000); });
      peer.on('connection', conn => {
        conn.on('open', () => this.conns.set(conn.peer, conn));
        conn.on('data', d => { this.conns.set(conn.peer, conn); if (d && d.t === 'bye') this.h.close(conn.peer); else this.h.msg(conn.peer, d); });
        conn.on('close', () => { if (this.conns.get(conn.peer) === conn) this.conns.delete(conn.peer); this.h.close(conn.peer); });
      });
    });
  }
  send(peer, d) {
    if (this.bc) return this.bc.postMessage({ to: peer, from: 'host', d });
    const c = this.conns.get(peer); if (c && c.open) try { c.send(d); } catch (e) { /* closed meanwhile */ }
  }
  close() { if (this.bc) { this.bc.postMessage({ to: '*', from: 'host', d: { t: 'closed' } }); this.bc.close(); } if (this.peer) this.peer.destroy(); this.conns.clear(); }
}

/* A phone player's fighter controller. The phone sends its held state plus
   running press counters, so a lost or merged message never loses a press. */
const PRESS = ['atk', 'jmp', 'def', 's1', 's2', 's3', 'item'];
class RemoteCtl {
  constructor(p) { this.p = p; this.inp = new Input(); this.human = true; this.remote = true; this.seen = [0, 0, 0, 0, 0, 0, 0]; }
  get offline() { return !this.p.online; }
  poll() {
    const i = this.inp, s = this.p.st;
    i.mx = i.mz = 0; i.run = i.def = false;
    if (!this.p.online || !s) return;
    i.mx = clamp(s.mx || 0, -1, 1); i.mz = clamp(s.mz || 0, -1, 1); i.run = !!s.run; i.def = !!s.def;
    const c = s.c || [];
    for (let k = 0; k < 7; k++) if ((c[k] || 0) > this.seen[k]) {
      this.seen[k]++;                                     // at most one press per button per step
      if (k === 0) i.atk = true; else if (k === 1) i.jmp = true; else if (k === 2) i.defP = true; else if (k === 6) i.item = true; else i.skill = k - 2;
    }
  }
  sync() { const c = (this.p.st && this.p.st.c) || []; this.seen = [0, 1, 2, 3, 4, 5, 6].map(k => c[k] || 0); }
}

/* hero pictures for the phones (drawn once, sent as small images) */
const heroImg = {};
function heroThumb(id) {
  if (heroImg[id]) return heroImg[id];
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 110; const c = cv.getContext('2d');
  const fake = { clock: 0, state: 'idle', st: 0, look: CHARS[id].look, def: CHARS[id], face: 1, hold: null, vy: 0 };
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(60, 98, 30, 7, 0, 0, TAU); c.fill();
  c.translate(60, 102); c.scale(1.25, 1.25); drawBody(c, CHARS[id].look, pose(fake), fake);
  return heroImg[id] = cv.toDataURL('image/png');
}

/* ------------------------------ lobby ------------------------------ */
const Lobby = {
  net: null, room: null, players: [], status: '', hudT: 0,
  url() { return new URL('controller.html?room=' + this.room + (NET_LOCAL ? '&net=local' : ''), location.href).href; },
  heroList() { return HEROES.map(id => ({ id, name: CHARS[id].name, blurb: CHARS[id].blurb, locked: !heroUnlocked(id), img: heroThumb(id) })); },
  async open() {
    $('menu').hidden = true; $('hallLink').hidden = true; $('lobby').hidden = false;
    hostWake.on();
    this.render();
    if (this.net) return this.broadcastLobby();
    this.setStatus('正在開房間…');
    const net = new HostNet({ msg: (p, d) => this.onMsg(p, d), close: p => this.onClose(p) });
    try { await net.open(); } catch (e) { this.setStatus('開不了房間：連不上連線伺服器。請確定這台有網路，等一下再試。', true); return; }
    this.net = net; this.room = net.room;
    this.setStatus(location.protocol === 'file:' ? '注意：遊戲要放在網站上（例如 GitHub Pages），手機才打得開這個網址。' : '');
    this.drawQR();
    this.render();
  },
  close() { hostWake.off(); if (this.net) this.net.close(); this.net = null; this.room = null; this.players = []; },
  async drawQR() {
    const url = this.url(); $('lobbyUrl').textContent = url.replace(/^https?:\/\//, ''); $('lobbyCode').textContent = this.room;
    try {
      await loadScript(NET_CDN.qr);
      const q = qrcode(0, 'M'); q.addData(url); q.make();
      $('lobbyQR').src = q.createDataURL(6, 2); $('lobbyQR').hidden = false;
    } catch (e) { $('lobbyQR').hidden = true; }
  },
  setStatus(t, bad) { const s = $('lobbyStatus'); s.textContent = t; s.hidden = !t; s.classList.toggle('bad', !!bad); },
  find(peer) { return this.players.find(p => p.peer === peer); },
  slotOf(p) { return this.players.indexOf(p); },
  onMsg(peer, d) {
    if (!d || !d.t) return;
    let p = this.find(peer);
    if (d.t === 'hello') {
      const again = this.players.find(q => q.cid === d.cid);
      if (again) { again.peer = peer; again.online = true; again.name = d.name || again.name; p = again; if (again.ctl) again.ctl.sync(); }
      else {
        if (this.players.length >= 4) return this.net.send(peer, { t: 'full' });
        if (running) return this.net.send(peer, { t: 'busy' });
        const taken = this.players.map(q => q.hero);
        const hero = HEROES.find(h => heroUnlocked(h) && !taken.includes(h)) || 'rex';
        p = { peer, cid: d.cid, name: (d.name || '').slice(0, 8) || '玩家', hero, online: true, st: null, seen: performance.now() };
        this.players.push(p);
      }
      this.net.send(peer, { t: 'welcome', heroes: this.heroList() });
      this.sendState(p); this.render(); this.broadcastLobby();
      Sound.play && Sound.play('pop');
      return;
    }
    if (!p) return this.net.send(peer, { t: 'who' });
    p.seen = performance.now(); if (!p.online) { p.online = true; this.render(); }
    if (d.t === 'in') {
      const before = p.st ? p.st.c : null; p.st = d;
      if (typeof storyQ !== 'undefined' && storyQ && before && ((d.c[0] || 0) > (before[0] || 0) || (d.c[1] || 0) > (before[1] || 0))) { advanceStory(); if (p.ctl) p.ctl.sync(); }
      else if (storyQ && p.ctl) p.ctl.sync();
    } else if (d.t === 'hero') {
      if (!running && HEROES.includes(d.id) && heroUnlocked(d.id)) { p.hero = d.id; this.render(); this.broadcastLobby(); }
    } else if (d.t === 'start') {
      if (!$('lobby').hidden) this.begin();
      else if (!$('result').hidden) { $('result').hidden = true; startGame(true); }
    } else if (d.t === 'pause') { if (running) togglePause(); }
    else if (d.t === 'storyNext') { if (storyQ) { advanceStory(); if (p.ctl) p.ctl.sync(); } }
    else if (d.t === 'storySkip') { if (storyQ) { skipStory(); if (p.ctl) p.ctl.sync(); } }
    else if (d.t === 'next') { if (!$('result').hidden && !$('nextBtn').hidden) $('nextBtn').click(); }
  },
  onClose(peer) {
    const p = this.find(peer); if (!p) return;
    p.online = false;
    if (!running && $('result').hidden) this.players.splice(this.players.indexOf(p), 1);   // in the lobby: free the seat
    this.render(); this.broadcastLobby();
  },
  sendState(p) {
    if (!this.net) return;
    const slot = this.slotOf(p), base = { slot, col: SLOT_COL[slot], hero: p.hero, name: p.name };
    if (running && W && p.fighter) {
      const f = p.fighter;
      if (this.storyNow && storyQ) setTimeout(() => this.net && this.net.send(p.peer, { t: 'story', ...this.storyNow }), 0);
      this.net.send(p.peer, { t: 'play', ...base, skills: f.def.skills.map(id => id ? { name: SKILLS[id].name, cost: SKILLS[id].cost, ult: !!SKILLS[id].ult } : null), maxMp: f.maxMp });
    } else if (!$('result').hidden) this.net.send(p.peer, { t: 'result', ...base, title: $('resTitle').textContent, next: !$('nextBtn').hidden });
    else this.net.send(p.peer, { t: 'lobby', ...base, players: this.players.map(q => ({ name: q.name, hero: q.hero, online: q.online })) });
  },
  /* the story box on the big screen, mirrored on every phone so any player can turn the page */
  story(s) { this.storyNow = s.on ? s : null; this.players.forEach(p => { if (p.online && p.peer && !p.local) this.net.send(p.peer, { t: 'story', ...s }); }); },
  broadcastLobby() { this.players.forEach(p => { if (p.online && p.peer) this.sendState(p); }); },
  /* called every step while a phone match runs */
  tick() {
    if (!this.net || !W) return;
    const now = performance.now();
    for (const p of this.players) {
      if (p.local) continue;
      if (p.online && now - p.seen > 4000) { p.online = false; }    // phone went to sleep
      if (!p.fighter || !p.online || (W.t + this.slotOf(p) * 2) % 8) continue;
      const f = p.fighter, h = { t: 'hud', hp: Math.max(0, Math.ceil(f.hp)), max: f.maxHp, mp: Math.floor(f.mp), lives: f.lives || 0, out: isOut(f), it: f.hold ? ITEMS[f.hold.kind].name : '', ult: Math.floor(f.ult / 5) * 5 };
      const key = h.hp + '/' + h.mp + '/' + h.lives + '/' + h.out + '/' + h.it + '/' + h.ult;
      if (key !== p.hudKey) { p.hudKey = key; this.net.send(p.peer, h); }
    }
  },
  addLocal() {
    if (this.players.length >= 4 || this.players.some(p => p.local)) return;
    const taken = this.players.map(q => q.hero);
    this.players.push({ local: true, cid: 'local', name: '鍵盤', hero: HEROES.find(h => heroUnlocked(h) && !taken.includes(h)) || 'rex', online: true });
    this.render(); this.broadcastLobby();
  },
  begin() {
    if (!this.players.length) return;
    this.players = this.players.filter(p => p.online);
    const ctls = this.players.map((p, i) => {
      if (p.local) return new HumanCtl(i, [KB.solo, ...pads]);
      p.ctl = new RemoteCtl(p); p.ctl.sync(); return p.ctl;
    });
    $('lobby').hidden = true;
    startGame(true, { players: this.players.length, heroes: this.players.map(p => p.hero), remoteCtls: ctls });
    W.players.forEach((f, i) => { this.players[i].fighter = f; this.players[i].hudKey = null; });
    this.players.forEach(p => { if (!p.local) this.sendState(p); });
  },
  render() {
    const box = $('lobbySlots'); if (!box) return;
    let html = '';
    for (let i = 0; i < 4; i++) {
      const p = this.players[i];
      if (!p) { html += `<div class="lslot empty"><i style="background:${SLOT_COL[i]}">${i + 1}P</i><span>等待加入…</span></div>`; continue; }
      html += `<div class="lslot${p.online ? '' : ' off'}" ${p.local ? 'data-local="1"' : ''}><i style="background:${SLOT_COL[i]}">${i + 1}P</i><img src="${heroThumb(p.hero)}" alt=""><span><b>${esc(p.name)}</b><small>${CHARS[p.hero].name}${p.online ? '' : '・斷線'}${p.local ? '・點這裡換角色' : ''}</small></span></div>`;
    }
    box.innerHTML = html;
    const loc = box.querySelector('[data-local]');
    if (loc) loc.onclick = () => { const p = this.players.find(q => q.local), ok = HEROES.filter(heroUnlocked); p.hero = ok[(ok.indexOf(p.hero) + 1) % ok.length]; this.render(); this.broadcastLobby(); };
    $('lobbyStart').disabled = !this.players.some(p => p.online);
    $('lobbyLocal').disabled = this.players.length >= 4 || this.players.some(p => p.local);
  }
};
/* keep the big screen awake while phones are connected (a sleeping screen drops every phone) */
const hostWake = {
  want: false, lock: null,
  async on() {
    this.want = true;
    if (this.lock || document.hidden || !('wakeLock' in navigator)) return;
    try { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } catch (e) { /* not allowed here */ }
    if (!this.want && this.lock) this.off();
  },
  off() { this.want = false; if (this.lock) { const l = this.lock; this.lock = null; l.release().catch(() => {}); } }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && hostWake.want) hostWake.on(); });   // the browser drops the lock when the tab is hidden
function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function openLobby() { Lobby.open(); }
$('lobbyStart').onclick = () => Lobby.begin();
$('lobbyLocal').onclick = () => Lobby.addLocal();
$('lobbyBack').onclick = () => { $('lobby').hidden = true; toMenu(); };
// a fresh room number (everyone already in the room has to join again)
$('lobbyNew').onclick = () => { if (Lobby.players.some(p => !p.local) && !confirm('換號碼後，已經加入的手機要重新加入。確定嗎？')) return; store.set('room', null); Lobby.close(); $('lobbyQR').hidden = true; $('lobbyCode').textContent = '…'; Lobby.open(); };
addEventListener('pagehide', () => Lobby.close());

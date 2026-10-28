'use strict';
/* 大家一起玩 · 多人遊戲專區 — the big-screen side.
   One room serves the whole zone: phones join once (scan the QR code) and stay
   connected while the group hops from game to game.
   Transport: PeerJS (WebRTC data channels; the free PeerJS broker only introduces
   the two sides). With ?net=local the pages talk over a BroadcastChannel instead,
   so several tabs on one computer can test everything without a network. */
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search), NET_LOCAL = Q.get('net') === 'local';
const W = 1600, H = 900, TAU = Math.PI * 2, STEP = 1 / 60, MAX_PLAYERS = 6;
const FIELD = { x0: 40, y0: 112, x1: 1560, y1: 872 };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = n => Math.random() * n | 0;
const hyp = Math.hypot;
const GAMES = [];
/* lobby categories: games may set cat; otherwise co-op games are 'coop' and the rest 'action' */
const CATS = [{ id: 'action', n: '🏃 跑跑跳跳' }, { id: 'coop', n: '🤝 大家合作' }, { id: 'brain', n: '🧠 動腦派對' }];
const BRAIN = ['quiz', 'draw', 'rhythm', 'board'];
function catOf(g) { return g.cat || (BRAIN.includes(g.id) ? 'brain' : g.kind === 'team' ? 'coop' : 'action'); }                       // each games/*.js pushes its definition here
const NET_CDN = { peer: 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js' };
const store = {
  get(k, d) { try { const v = localStorage.getItem('mwparty.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mwparty.' + k, JSON.stringify(v)); } catch (e) { } }
};
function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function loadScript(src) {
  return new Promise((ok, bad) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('load ' + src)); document.head.appendChild(s);
  });
}
function roomCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.random() * A.length | 0]; return s; }

/* ------------------------------ sound: tiny synth, no files ------------------------------ */
const Sfx = {
  ctx: null, on: store.get('sound', true), last: {},
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume().then(() => Music.sync()).catch(() => { }); else Music.sync();
  },
  tone(f, d, type, v, f2, delay) {
    const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.15, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, v, freq, q) {
    const c = this.ctx, t = c.currentTime, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = freq || 900; fl.Q.value = q || 0.8; g.gain.value = v || 0.2;
    s.connect(fl); fl.connect(g); g.connect(c.destination); s.start(t);
  },
  play(n, arg) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now(); if (this.last[n] && now - this.last[n] < 45) return; this.last[n] = now;
    switch (n) {
      case 'join': this.tone(520, 0.1, 'triangle', 0.18); this.tone(780, 0.14, 'triangle', 0.18, 0, 0.08); break;
      case 'pop': this.tone(600, 0.08, 'sine', 0.16, 900); break;
      case 'tick': this.tone(880, 0.06, 'square', 0.06); break;
      case 'go': this.tone(660, 0.12, 'square', 0.1); this.tone(990, 0.25, 'square', 0.1, 0, 0.1); break;
      case 'whoosh': this.noise(0.18, 0.12, 1400, 0.6); break;
      case 'bonk': this.tone(220 + (arg || 0) * 120, 0.12, 'triangle', 0.22, 120); break;
      case 'splash': this.noise(0.45, 0.22, 700, 0.5); break;
      case 'splat': this.noise(0.25, 0.22, 500, 0.9); this.tone(180, 0.15, 'sine', 0.15, 90); break;
      case 'coin': this.tone(880, 0.07, 'square', 0.07); this.tone(1320, 0.12, 'square', 0.07, 0, 0.06); break;
      case 'star': [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, 0, i * 0.06)); break;
      case 'boom': this.noise(0.6, 0.35, 160, 0.5); this.tone(90, 0.4, 'sine', 0.3, 40); break;
      case 'stun': this.tone(700, 0.3, 'sine', 0.12, 300); break;
      case 'baa': this.tone(420 + rnd(-40, 40), 0.32, 'sawtooth', 0.05, 380); break;
      case 'say': { const f = [700, 360, 900, 220, 300, 520][arg || 0]; this.tone(f, 0.18, 'square', 0.08, f * 0.8); break; }
      case 'howl': this.tone(300, 0.9, 'sawtooth', 0.07, 520); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.14, 0, i * 0.12)); break;
      case 'end': this.tone(784, 0.15, 'square', 0.08); this.tone(523, 0.35, 'square', 0.08, 0, 0.15); break;
    }
  }
};

/* ------------------------------ background music: little looping tunes, synthesized ------------------------------ */
const SONGS = {
  lobby: { bpm: 104, roots: [48, 43, 41, 48], mel: [76,79,81,79, 76,-1,72,74, 76,79,81,84, 79,-1,-1,-1, 81,84,86,84, 81,79,76,74, 76,79,76,74, 72,-1,-1,-1] },
  action: { bpm: 150, roots: [48, 41, 48, 43], mel: [72,-1,76,79, 84,79,76,79, 77,-1,81,84, 81,77,74,77, 76,-1,79,84, 88,84,79,76, 74,77,79,83, 84,-1,84,-1] },
  farm: { bpm: 116, roots: [48, 43, 41, 48], mel: [79,76,79,76, 74,72,74,76, 77,74,77,81, 79,-1,-1,-1, 79,76,79,84, 83,81,79,77, 76,74,72,74, 72,-1,-1,-1] }
};
const TRACKS = { awards: ['lobby', 5, 128], lobby: ['lobby', 0, 104], bumper: ['action', 0, 150], paint: ['action', 2, 138], fruit: ['action', 5, 144], sheep: ['farm', 0, 116], tag: ['action', 7, 152], snow: ['farm', 5, 126], fire: ['action', -3, 140], dodge: ['action', 3, 156], soccer: ['action', 2, 148], chairs: ['lobby', 5, 132], cake: ['farm', 3, 120], race: ['action', 9, 160], quiz: ['lobby', 2, 112], draw: ['lobby', -2, 96], rhythm: ['action', 0, 120], board: ['farm', -3, 108], tug: ['action', 4, 140], tower: ['farm', 2, 112], roll: ['action', 7, 146], vote: ['lobby', 7, 116], copy: ['lobby', -5, 100] };
const Music = {
  cur: null, step: 0, next: 0, timer: null, out: null,
  want() {
    const S = Party.state;
    if (S === 'play' && Party.game && Party.game.music === false) return null;   // a game may silence the music (搶椅子)
    if (S === 'intro' || S === 'play' || S === 'finish') return Party.def ? Party.def.id : 'lobby';
    return 'lobby';
  },
  sync() {
    const c = Sfx.ctx, id = Sfx.on && c && c.state === 'running' ? this.want() : null;
    if (id === this.cur) return;
    this.stop(); if (!id) return;
    this.cur = id; this.step = 0; this.next = c.currentTime + 0.1;
    this.out = c.createGain(); this.out.gain.value = 0.055; this.out.connect(c.destination);
    this.timer = setInterval(() => this.tick(), 30);
  },
  stop() {
    if (this.timer) clearInterval(this.timer); this.timer = null; this.cur = null;
    if (this.out) { const o = this.out; o.gain.setTargetAtTime(0, Sfx.ctx.currentTime, 0.05); setTimeout(() => o.disconnect(), 400); this.out = null; }
  },
  note(m, t, d, type, v) {
    const c = Sfx.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + 0.05);
  },
  tick() {
    const c = Sfx.ctx; if (!c || !this.out) return;
    const [song, key, bpm] = TRACKS[this.cur] || TRACKS.lobby, S = SONGS[song], dt = 60 / bpm / 2;
    while (this.next < c.currentTime + 0.15) {
      const i = this.step % 32, t = this.next, m = S.mel[i];
      if (m >= 0) this.note(m + key, t, dt * 1.6, 'triangle', 0.9);
      if (i % 2 === 0) { const r = S.roots[i >> 3] + key; this.note(i % 8 === 4 ? r + 7 : r, t, dt * 1.8, 'square', 0.28); }
      if (i % 2 === 1) this.note(96, t, 0.03, 'square', 0.05);
      this.step++; this.next += dt;
    }
  }
};

/* ------------------------------ transport (big-screen side) ------------------------------ */
class HostNet {
  constructor(h) { this.h = h; this.conns = new Map(); this.room = null; }
  async open() {
    if (NET_LOCAL) {
      this.room = Q.get('room') || store.get('room', null) || roomCode(); store.set('room', this.room);
      this.bc = new BroadcastChannel('mwparty-' + this.room);
      this.bc.onmessage = e => { const m = e.data; if (m.to !== 'host') return; if (m.d && m.d.t === 'bye') this.h.close(m.from); else this.h.msg(m.from, m.d); };
      return;
    }
    await loadScript(NET_CDN.peer);
    // keep last time's room number, so phones that still have the old address can come back
    for (let tries = 0; tries < 4; tries++) {
      this.room = tries === 0 && store.get('room', null) || roomCode();
      try { await this.listen(); store.set('room', this.room); return; } catch (e) { if (!(e && e.type === 'unavailable-id')) throw e; }
    }
    throw new Error('no room');
  }
  listen() {
    return new Promise((ok, bad) => {
      let opened = false;
      const peer = this.peer = new Peer('mwparty-' + this.room, { debug: 0 });
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

/* ------------------------------ effects shared by every game ------------------------------ */
const Fx = {
  parts: [], pops: [], rings: [], dusts: [], shakeAmt: 0, flashA: 0, flashCol: '#fff', groundDone: false, banner: null,
  clear() { this.parts = []; this.pops = []; this.rings = []; this.dusts = []; this.shakeAmt = 0; this.flashA = 0; this.banner = null; },
  /* screen shake (in world pixels); bigger calls win */
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  /* a quick full-screen flash, e.g. white for a big hit */
  flash(col, a) { this.flashCol = col || '#fff'; this.flashA = Math.max(this.flashA, a || 0.4); },
  /* a big line of text across the middle for a moment ("最後 10 秒！") */
  announce(text, col, y) { this.banner = { text, col: col || '#2b2340', t: 0, y: y || H / 2 }; },   // y: where the band sits (default: middle)
  /* soft puffs on the ground: footsteps, landings, skids */
  dust(x, y, col, size) { this.dusts.push({ x: x + rnd(-6, 6), y: y + rnd(-3, 3), vx: rnd(-20, 20), vy: rnd(-30, -8), r: (size || 9) * rnd(0.7, 1.2), t: 0, life: rnd(0.35, 0.55), col: col || 'rgba(255,255,255,.75)' }); },
  /* call every step for a moving character: leaves puffs at its feet now and then */
  walk(e, dt, col) {
    const sp = Math.hypot(e.vx || 0, e.vy || 0); if (sp < 90) return;
    e._dustT = (e._dustT || 0) - dt * Math.min(2.5, sp / 220);
    if (e._dustT <= 0) { e._dustT = 0.16; this.dust(e.x - (e.vx || 0) * 0.04, e.y + (e.r || 30) * 0.75, col, (e.r || 30) * 0.28); }
  },
  /* games may call this right after their background so puffs sit under the characters */
  ground(g) {
    this.groundDone = true;
    for (const d of this.dusts) { const k = d.t / d.life; g.globalAlpha = (1 - k) * 0.9; g.fillStyle = d.col; g.beginPath(); g.arc(d.x, d.y, d.r * (0.6 + k * 0.9), 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  },
  burst(x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(0.3, 1) * (sp || 260); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.35, 0.7), t: 0, r: rnd(4, 9), col }); } },
  pop(x, y, text, col, size) { this.pops.push({ x, y, text, col: col || '#2b2340', size: size || 34, t: 0 }); },
  ring(x, y, col, R, life) { this.rings.push({ x, y, col, R, life: life || 0.45, t: 0 }); },
  update(dt) {
    for (const p of this.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
    this.parts = this.parts.filter(p => p.t < p.life);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter(p => p.t < 1.1);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter(r => r.t < r.life);
    for (const d of this.dusts) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; } this.dusts = this.dusts.filter(d => d.t < d.life);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 60 - this.shakeAmt * dt * 6);
    this.flashA = Math.max(0, this.flashA - dt * 2.2);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.6) this.banner = null; }
  },
  draw(g) {
    if (!this.groundDone) this.ground(g);
    this.groundDone = false;
    for (const r of this.rings) { const k = r.t / r.life; g.globalAlpha = 1 - k; g.strokeStyle = r.col; g.lineWidth = 10 * (1 - k) + 2; g.beginPath(); g.arc(r.x, r.y, r.R * (0.25 + 0.75 * Math.sqrt(k)), 0, TAU); g.stroke(); }
    for (const p of this.parts) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - p.t / p.life * 0.5), 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of this.pops) {
      const k = p.t / 1.1, s = p.size * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1);
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      g.font = `900 ${s}px "Fredoka","Noto Sans TC",system-ui,sans-serif`;
      g.lineWidth = s * 0.18; g.strokeStyle = '#fff'; g.strokeText(p.text, p.x, p.y - k * 60); g.fillStyle = p.col; g.fillText(p.text, p.x, p.y - k * 60);
    }
    g.globalAlpha = 1;
    if (this.banner) {
      const b = this.banner, k = b.t / 1.6, x = W / 2 + (k < 0.15 ? (1 - k / 0.15) * 600 : k > 0.85 ? -(k - 0.85) / 0.15 * 600 : 0);
      g.globalAlpha = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
      const by = b.y; g.fillStyle = 'rgba(43,35,64,.75)'; g.fillRect(-400, by - 60, W + 800, 120);
      g.font = '900 72px "Noto Sans TC",system-ui,sans-serif'; g.lineWidth = 12; g.strokeStyle = '#fff'; g.strokeText(b.text, x, by); g.fillStyle = b.col; g.fillText(b.text, x, by);
      g.globalAlpha = 1;
    }
    if (this.flashA > 0) { g.globalAlpha = this.flashA; g.fillStyle = this.flashCol; g.fillRect(-400, 0, W + 800, H); g.globalAlpha = 1; }
    g.globalAlpha = 1;
  }
};

/* name tag above a character */
const TEAMS = [{ n: '太陽隊', icon: '☀️', c: '#ff9a1f', d: '#c25e00', soft: '#fff1dc' }, { n: '月亮隊', icon: '🌙', c: '#5b5bd6', d: '#3434a0', soft: '#e9e9ff' }];
/* teams are shown while they matter: in the lobby when switched on, in a game that is being played in teams */
function teamsShown() { return Party.state === 'lobby' ? Party.teams : !!(Party.game && Party.game.teams); }
function drawTag(g, x, y, p) {
  const C = teamsShown() ? { c: TEAMS[p.team].c } : PARTY_COLORS[p.col];
  g.font = '700 20px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.max(44, g.measureText(p.name).width + 18);
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(x - w / 2, y - 14, w, 28, 14); g.fill();
  g.strokeStyle = C.c; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#2b2340'; g.fillText(p.name, x, y + 1);
  if (teamsShown()) { g.font = '18px system-ui'; g.fillText(TEAMS[p.team].icon, x - w / 2 - 12, y + 1); }
}

/* ------------------------------ the party: players, room, game flow ------------------------------ */
const Party = {
  net: null, room: null, players: [], uid: 0,
  state: 'lobby', gameId: store.get('game', 'bumper'), kid: store.get('kid', true), teams: store.get('teams', false), leadPref: 0,
  game: null, def: null, introT: 0, finishT: 0, paused: false, res: null, hudT: 0, lastSec: -1,

  def_(id) { return GAMES.find(g => g.id === id) || GAMES[0]; },
  inGame() { return this.players.filter(p => p.inGame); },
  takenCols(skip) { return this.players.filter(p => p !== skip).map(p => p.col); },
  freeCol(skip, from) { const t = this.takenCols(skip); for (let i = 0; i < 6; i++) { const c = ((from || 0) + i) % 6; if (!t.includes(c)) return c; } return 0; },
  url() { return new URL('pad.html?room=' + this.room + (NET_LOCAL ? '&net=local' : ''), location.href).href; },

  async open() {
    this.setStatus('正在開房間…');
    const net = new HostNet({ msg: (p, d) => this.onMsg(p, d), close: p => this.onClose(p) });
    try { await net.open(); } catch (e) { this.setStatus('開不了房間：連不上連線伺服器。請確定這台有網路，等一下再按「換號碼」。', true); return; }
    this.net = net; this.room = net.room;
    this.setStatus(location.protocol === 'file:' ? '注意：要放在網站上，手機才打得開這個網址。' : '');
    this.drawQR(); renderLobby();
  },
  close() { if (this.net) this.net.close(); this.net = null; this.room = null; },
  drawQR() {
    const url = this.url();
    $('roomCode').textContent = this.room; $('roomUrl').textContent = url.replace(/^https?:\/\//, '');
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); $('qr').src = q.createDataURL(6, 2); $('qr').hidden = false; } catch (e) { $('qr').hidden = true; }
  },
  setStatus(t, bad) { const s = $('status'); s.textContent = t; s.hidden = !t; s.classList.toggle('bad', !!bad); },

  newPlayer(o) {
    const n = this.players.length;
    const p = Object.assign({
      uid: ++this.uid, peer: null, cid: null, name: '玩家', col: this.freeCol(null, n), animal: n % 6, online: true, local: null,
      inp: { x: 0, y: 0, c: [0, 0, 0], h: [0, 0, 0] }, seen: [0, 0, 0], last: performance.now(), trophies: 0, inGame: false, hudKey: '',
      yard: { x: rnd(120, 880), y: rnd(120, 240), face: Math.PI / 2, hop: 0, vy: 0, say: 0, walk: 0 },
      team: this.players.filter(q => q.team === 0).length <= this.players.filter(q => q.team === 1).length ? 0 : 1
    }, o);
    this.players.push(p);
    return p;
  },
  find(peer) { return this.players.find(p => p.peer === peer); },
  onMsg(peer, d) {
    if (!d || !d.t) return;
    let p = this.find(peer);
    if (d.t === 'hello') {
      const again = this.players.find(q => q.cid && q.cid === d.cid);
      const name = String(d.name || '').trim().slice(0, 8) || '玩家';
      if (again) { again.peer = peer; again.online = true; again.name = name; again.last = performance.now(); p = again; this.sync(p); }
      else {
        if (this.players.length >= MAX_PLAYERS) return this.net.send(peer, { t: 'full' });
        p = this.newPlayer({ peer, cid: d.cid, name, animal: typeof d.animal === 'number' ? ((d.animal % 6) + 6) % 6 : this.players.length % 6 });
        p.inGame = false;
        Sfx.play('join');
        p.yard.hop = 1; p.yard.vy = 520;
      }
      this.view(p); renderLobby(); this.broadcast(p);
      return;
    }
    if (!p) return this.net.send(peer, { t: 'who' });
    p.last = performance.now();
    if (!p.online) { p.online = true; renderLobby(); }
    switch (d.t) {
      case 'in': {
        const n = v => (typeof v === 'number' && isFinite(v) ? clamp(v, -1, 1) : 0);
        p.inp.x = n(d.x); p.inp.y = n(d.y);
        if (Array.isArray(d.c)) for (let k = 0; k < 3; k++) p.inp.c[k] = Math.max(p.inp.c[k], d.c[k] | 0);
        if (Array.isArray(d.h)) for (let k = 0; k < 3; k++) p.inp.h[k] = d.h[k] ? 1 : 0;
        if (this.state === 'lobby' && Array.isArray(d.c) && (d.c[0] | 0) > p.seen[0]) { p.seen[0] = d.c[0] | 0; yardHop(p); }
        break;
      }
      case 'look':
        if (typeof d.animal === 'number') p.animal = ((d.animal | 0) % 6 + 6) % 6;
        if (d.col === 'next') p.col = this.freeCol(p, p.col + 1);
        yardHop(p); renderLobby(); this.broadcast(); break;
      case 'say': yardHop(p); break;
      // only the room leader (房主) runs the show; the big screen's own keyboard/mouse can always do it too
      case 'pick': if (p === this.leader() && (this.state === 'lobby' || (this.state === 'result' && !this.night)) && GAMES.some(g => g.id === d.id)) { this.gameId = d.id; store.set('game', d.id); Sfx.play('pop'); renderLobby(); this.broadcast(); } break;
      case 'teams': if (p === this.leader() && (this.state === 'lobby' || this.state === 'result')) this.setTeams(!!d.on); break;
      case 'team': if (this.state === 'lobby' || this.state === 'result') { p.team = d.team ? 1 : 0; yardHop(p); renderLobby(); this.broadcast(); } break;
      case 'lead': if (p === this.leader()) { const q = this.players[d.slot | 0]; if (q && q !== p && q.peer && q.online) { this.leadPref = q.uid; Sfx.play('join'); renderLobby(); this.broadcast(); } } break;
      case 'mode': if (p === this.leader() && (this.state === 'lobby' || this.state === 'result')) { this.setKid(!!d.kid); } break;
      case 'start': if (p === this.leader()) { if (this.state === 'lobby') this.begin(); else if (this.state === 'result' || this.state === 'awards') this.again(); } break;
      case 'menu': if (p === this.leader() && (this.state === 'result' || this.state === 'awards')) this.toLobby(); break;
      case 'night': if (p === this.leader() && this.state === 'lobby') Night.start(d.n | 0); break;
      case 'nightN': if (p === this.leader() && this.state === 'lobby') Night.setCount(d.n | 0); break;
      // games with other phone layouts (choices / drawing board)
      case 'choose': if (this.state === 'play' && this.game && this.game.onChoose && p.inGame) this.game.onChoose(p, String(d.id).slice(0, 40)); break;
      case 'draw': if (this.state === 'play' && this.game && this.game.onDraw && p.inGame && Array.isArray(d.p) && d.p.length <= 600) this.game.onDraw(p, { s: d.s | 0, c: clamp(d.c | 0, 0, 6), p: d.p.map(v => clamp(+v || 0, 0, 1)) }); break;
      case 'drawClear': if (this.state === 'play' && this.game && this.game.onDrawClear && p.inGame) this.game.onDrawClear(p); break;
      case 'pause': if (p === this.leader() && (this.state === 'play' || this.state === 'intro')) this.togglePause(); break;
      case 'quit': if (p === this.leader() && this.state !== 'lobby') this.toLobby(); break;
    }
  },
  onClose(peer) {
    const p = this.find(peer); if (!p) return;
    p.online = false; p.inp.x = p.inp.y = 0;
    if (this.state === 'lobby' || !p.inGame) this.players.splice(this.players.indexOf(p), 1);   // free the seat
    renderLobby(); this.broadcast();
  },
  sync(p) { p.seen = p.inp.c.slice(); },
  pressed(p, k) { if (p.inp.c[k] > p.seen[k]) { p.seen[k] = p.inp.c[k]; return true; } return false; },
  /* a game may switch a phone to another layout: null = joystick + button, {type:'tap'}, {type:'choices'}, {type:'draw'} */
  layoutFor(p) { return this.game && this.game.padLayout ? this.game.padLayout(p) || null : null; },
  /* the raw stick with a dead zone; the live stick is rescaled so it starts from 0 just outside the dead zone (no sudden jump) */
  rawInput(p) {
    if (!p.online) return { x: 0, y: 0 };
    let x = p.inp.x, y = p.inp.y; const m = hyp(x, y);
    if (m < 0.15) return { x: 0, y: 0 };
    const k = Math.min(1, (m - 0.15) / 0.8) / m;
    return { x: x * k, y: y * k };
  },
  /* smoothed every frame (≈40 ms) so phone packets arriving in bursts don't make characters jitter */
  smoothInputs(dt) {
    const a = 1 - Math.exp(-dt / 0.04);
    for (const p of this.players) {
      const r = this.rawInput(p);
      if (p.sx === undefined) { p.sx = r.x; p.sy = r.y; }
      p.sx += (r.x - p.sx) * a; p.sy += (r.y - p.sy) * a;
      if (!r.x && !r.y && Math.hypot(p.sx, p.sy) < 0.06) p.sx = p.sy = 0;   // let go = stop, no creeping
    }
  },
  input(p) {
    if (p.sx === undefined) return this.rawInput(p);
    const m = hyp(p.sx, p.sy); return m > 1 ? { x: p.sx / m, y: p.sy / m } : { x: p.sx, y: p.sy };
  },
  /* the room leader: the earliest phone still connected (keyboard players don't count) */
  leader() {
    const pref = this.leadPref && this.players.find(p => p.uid === this.leadPref && p.peer && p.online);
    return pref || this.players.find(p => p.peer && p.online && !p.local) || null;
  },
  /* teams only count for games that support them, with someone on each side */
  teamsOn(def) {
    const on = this.players.filter(p => p.online || p.local);
    if (def.forceTeams) return on.length >= 2;   // games that are always team-vs-team (動物足球)
    return this.teams && def.teams && [0, 1].every(t => on.some(p => p.team === t));
  },
  you(p) { return { slot: this.players.indexOf(p), name: p.name, col: p.col, animal: p.animal, trophies: p.trophies, lead: p === this.leader(), team: p.team }; },
  btnFor(p) { const b = this.def.btn; return typeof b === 'function' ? b(p, this.kid) : b; },
  /* what a phone should be showing right now */
  view(p) {
    if (!this.net || !p.peer || p.local) return;
    const you = this.you(p), L = this.leader(), base = { you, kid: this.kid, game: this.gameId, leadName: L ? L.name : '', teams: this.teams };
    if (this.state === 'awards') {
      const a = Night.final || { rows: [] }, row = a.rows.find(r => r.uid === p.uid);
      this.net.send(p.peer, { t: 'result', ...base, title: '🎉 派對之夜結束！', sub: '', stars: 0, team: false, rank: row ? row.place : 0, n: a.rows.length, win: -9,
        line: row ? row.pts + ' 分\n' + row.awards.map(w => w.icon + ' ' + w.title).join('\n') : '下次一起玩！', night: { final: true } });
    } else if (this.state === 'lobby' || (this.state === 'result' && !p.inGame)) {
      this.net.send(p.peer, { t: 'lobby', ...base, nightN: Night.count, games:GAMES.map(g => ({ id: g.id, name: g.name, icon: g.icon, col: g.col, blurb: g.blurb, team: g.kind === 'team', teams: !!g.teams, cat: catOf(g) })), cats: CATS, players: this.players.map(q => ({ name: q.name, col: q.col, animal: q.animal, online: q.online, trophies: q.trophies, team: q.team, lead: q === L })) });
    } else if (this.state === 'result') {
      const row = this.res.rows.find(r => r.p === p);
      this.net.send(p.peer, { t: 'result', ...base, title: this.res.title, sub: this.res.sub || '', stars: this.res.stars, team: !!this.res.team, rank: row ? row.rank : 0, n: this.res.rows.length, line: row ? row.line : '', win: this.res.winTeam === undefined ? -9 : this.res.winTeam, night: Night.padInfo(p) });
    } else if (!p.inGame) {
      this.net.send(p.peer, { t: 'wait', ...base, msg: '大家正在玩「' + this.def.name + '」，這一局結束就換你加入！' });
    } else {
      const b = this.btnFor(p);
      this.net.send(p.peer, { t: 'pad', ...base, name: this.def.name, icon: this.def.icon, gcol: this.def.col, btn: b, intro: this.state === 'intro', paused: this.paused, teamPlay: !!this.game.teams, L: this.layoutFor(p) });
      p.layoutKey = JSON.stringify(this.layoutFor(p));
      p.hudKey = '';
    }
  },
  broadcast(skip) { for (const p of this.players) if (p !== skip && p.online && p.peer) this.view(p); },
  setTeams(v) { this.teams = v; store.set('teams', v); Sfx.play('pop'); renderLobby(); this.broadcast(); },
  setKid(v) { this.kid = v; store.set('kid', v); Sfx.play('pop'); renderLobby(); this.broadcast(); },
  pick(id) { this.gameId = id; store.set('game', id); renderLobby(); this.broadcast(); },

  begin() {
    this.players = this.players.filter(p => p.online || p.local);
    const ps = this.players;
    if (!ps.length) { flashLobby('還沒有人加入：先用手機掃 QR code，或按「＋ 鍵盤玩家」'); return; }
    Sfx.ensure();
    ps.forEach(p => { p.inGame = true; this.sync(p); });
    // always-team games: if one side is empty, split everyone up alternately
    const fd = this.def_(this.gameId);
    if (fd.forceTeams && ps.length >= 2 && ![0, 1].every(t => ps.some(p => p.team === t))) ps.forEach((p, i) => { p.team = i % 2; });
    this.def = this.def_(this.gameId);
    Fx.clear();
    this.game = this.def.create({
      players: ps.slice(), kid: this.kid, input: p => this.input(p), pressed: (p, k) => this.pressed(p, k), held: (p, k) => p.online && !!p.inp.h[k],
      teams: this.teamsOn(this.def_(this.gameId)), teamOf: p => p.team, hitstop: s => { this.stopT = Math.max(this.stopT || 0, s); },
      sfx: (n, a) => Sfx.play(n, a), buzz: (p, ms) => { if (p.peer && p.online && this.net) this.net.send(p.peer, { t: 'buzz', ms }); }
    });
    this.state = 'intro'; this.introT = this.kid ? 8 : 6.5; this.lastSec = -1; this.paused = false; this.stopT = 0;
    showScreen('game'); renderIntro(); Music.sync();
    this.broadcast();
  },
  startPlay() {
    this.state = 'play'; $('intro').hidden = true; Sfx.play('go');
    ps(this).forEach(p => this.sync(p));
    Fx.pop(W / 2, H / 2, '開始！', this.def.col, 120);
    this.broadcast();
  },
  finish() {
    this.state = 'finish'; this.finishT = 1.8;
    const r = this.res = this.game.results();
    // ranks with ties, then trophies for the winners of a real match
    if (this.game.teams && r.teamScores) {
      const [a, b] = r.teamScores, low = !!r.lowWins, win = a === b ? -1 : ((a > b) !== low ? 0 : 1);
      r.winTeam = win;
      r.rows.forEach(row => { row.rank = win < 0 ? 1 : row.p.team === win ? 1 : 2; row.line = TEAMS[row.p.team].icon + ' ' + row.line; });
      r.rows.sort((x, y) => x.rank - y.rank);
      r.rows.filter(row => row.rank === 1 && win >= 0).forEach(row => row.p.trophies++);
      r.title = win < 0 ? '兩隊平手！' : TEAMS[win].icon + ' ' + TEAMS[win].n + '贏了！';
      r.sub = `☀️ 太陽隊 ${r.teamText ? r.teamText(0) : a}　：　${r.teamText ? r.teamText(1) : b} 月亮隊 🌙`;
    } else if (!r.team) {
      let rank = 0, prev = null;
      r.rows.forEach((row, i) => { if (prev === null || row.key !== prev) rank = i + 1; row.rank = rank; prev = row.key; });
      const winners = r.rows.filter(row => row.rank === 1);
      if (r.rows.length > 1) {
        winners.forEach(row => row.p.trophies++);
        r.title = winners.length === r.rows.length ? '平手！大家都好厲害' : winners.map(w => w.p.name).join('、') + ' 贏了！';
      } else r.title = r.title || '練習完成！';
    } else r.rows.forEach(row => { row.rank = 0; });
    if (this.night) Night.score(r);
    Sfx.play(r.team ? (r.ok ? 'win' : 'end') : 'end');
    Fx.pop(W / 2, H / 2, this.game.endText || (r.team ? (r.ok ? '成功！' : '時間到！') : (this.game.dur == null ? '結束！' : '時間到！')), this.def.col, 110);
  },
  showResult() {
    this.state = 'result'; renderResult(); Music.sync(); if (!this.res.team && this.res.rows.length > 1) Sfx.play('win');
    this.broadcast();
  },
  again() { if (this.state === 'awards') Night.start(this.night ? this.night.n : Night.count); else if (this.night) Night.next(); else this.begin(); },
  toLobby() {
    this.state = 'lobby'; this.game = null; this.paused = false; $('pause').hidden = true; this.night = null; $('awards').hidden = true;
    this.players = this.players.filter(p => p.online || p.local);
    this.players.forEach(p => { p.inGame = false; this.sync(p); });
    showScreen('lobby'); renderLobby(); this.broadcast(); Music.sync();
  },
  togglePause() {
    if (this.state !== 'play' && this.state !== 'intro') return;
    this.paused = !this.paused; $('pause').hidden = !this.paused;
    if (!this.paused) this.players.forEach(p => this.sync(p));
    this.broadcast();
  },
  /* phones: small score line + whether the button is ready */
  netTick(dt) {
    const now = performance.now();
    for (const p of this.players) {
      if (p.local || !p.peer) continue;
      if (p.online && now - p.last > 5000) { p.online = false; p.inp.x = p.inp.y = 0; renderLobby(); }
    }
    const L = this.leader(), lu = L ? L.uid : 0;
    if (lu !== this.leadUid) { this.leadUid = lu; renderLobby(); this.broadcast(); }
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.12;
    if (!this.game || !(this.state === 'play' || this.state === 'intro') || !this.net) return;
    for (const p of this.players) {
      if (!p.inGame || !p.peer || !p.online) continue;
      const L = this.layoutFor(p), lk = JSON.stringify(L); if (lk !== p.layoutKey) { p.layoutKey = lk; this.net.send(p.peer, { t: 'layout', L }); }
      const s = this.state === 'intro' ? '準備…看大螢幕' : this.game.pad(p), r = this.state === 'play' && this.game.ready(p) ? 1 : 0, key = s + '|' + r;
      if (key !== p.hudKey) { p.hudKey = key; this.net.send(p.peer, { t: 'hud', s, r }); }
    }
  }
};
function ps(party) { return party.players.filter(p => p.inGame); }

/* ------------------------------ 派對之夜: a chain of games with a running scoreboard and an award show ------------------------------
   The leader starts it with 3 / 5 / 7 games. A mix is drawn at random (no repeats, at least one co-op and one
   brain game when there's room; long games like 大富翁 are left out). After each game everybody earns points:
     each for himself: 1st 5・2nd 3・3rd 2・everyone else 1 (solo: 3)
     team vs team:     winners 4・draw 2・losers 1
     co-op:            everyone gets the stars (+1 if it worked), the top helper +1 (最佳幫手)
   At the end: a podium and awards — and everybody gets at least one award. */
const NIGHT_SKIP = ['board'];
const Night = {
  count: clamp(store.get('nightN', 5) | 0, 3, 7), final: null,
  minPlayers(g) { const m = /^(\d)/.exec(g.players || '1'); return m ? +m[1] : 1; },
  setCount(n) { this.count = [3, 5, 7].includes(n) ? n : 5; store.set('nightN', this.count); Sfx.play('pop'); renderLobby(); Party.broadcast(); },
  pickList(n, people) {
    const pool = GAMES.filter(g => !NIGHT_SKIP.includes(g.id) && this.minPlayers(g) <= people);
    const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const by = c => sh(pool.filter(g => catOf(g) === c));
    const cap = { coop: Math.max(1, Math.round(n * 0.3)), brain: Math.max(1, Math.round(n * 0.3)), action: n };
    const out = [], take = g => { if (g && !out.includes(g) && out.length < n && out.filter(o => catOf(o) === catOf(g)).length < cap[catOf(g)]) out.push(g); };
    take(by('coop')[0]); if (n >= 5) take(by('brain')[0]);
    sh(pool.slice()).forEach(take);
    sh(pool.filter(g => !out.includes(g))).forEach(g => { if (out.length < n) out.push(g); });   // tiny pools (1 player): fill up anyway
    // shuffle, but don't open the night with a long think-game
    sh(out); const first = out.findIndex(g => catOf(g) === 'action'); if (first > 0) [out[0], out[first]] = [out[first], out[0]];
    return out.map(g => g.id);
  },
  start(n) {
    const on = Party.players.filter(p => p.online || p.local);
    if (!on.length) { flashLobby('還沒有人加入：先用手機掃 QR code，或按「＋ 鍵盤玩家」'); return; }
    if (n) this.count = [3, 5, 7].includes(n) ? n : this.count;
    store.set('nightN', this.count);
    Party.night = { n: this.count, i: 0, list: this.pickList(this.count, on.length), stat: {}, last: {} };
    this.final = null; $('awards').hidden = true;
    Party.gameId = Party.night.list[0];
    Party.begin();
  },
  stat(p) {
    const S = Party.night.stat;
    return S[p.uid] || (S[p.uid] = { uid: p.uid, p, pts: 0, wins: 0, mvp: 0, played: 0, rs: 0, rn: 0, top3: 0 });
  },
  score(r) {
    const N = Party.night, add = new Map();
    const give = (p, v) => { add.set(p, (add.get(p) || 0) + v); };
    if (r.team) {
      r.rows.forEach(row => give(row.p, (r.stars || 0) + (r.ok ? 1 : 0)));
      if (r.rows.length > 1 && r.rows[0].key > r.rows[1].key) { give(r.rows[0].p, 1); this.stat(r.rows[0].p).mvp++; r.rows[0].mvp = true; }
    } else if (r.winTeam !== undefined) {
      r.rows.forEach(row => { const w = r.winTeam < 0 ? 2 : row.p.team === r.winTeam ? 4 : 1; give(row.p, w); if (w === 4) this.stat(row.p).wins++; });
    } else {
      const n = r.rows.length;
      r.rows.forEach(row => {
        give(row.p, n === 1 ? 3 : [0, 5, 3, 2][row.rank] || 1);
        const s = this.stat(row.p); if (n > 1) { s.rs += (row.rank - 1) / (n - 1); s.rn++; if (row.rank === 1) s.wins++; if (row.rank <= 3) s.top3++; }
      });
    }
    N.last = {};
    for (const [p, v] of add) { const s = this.stat(p); s.p = p; s.pts += v; s.played++; N.last[p.uid] = v; }
    N.done = N.i + 1;
  },
  standings() {
    const S = Object.values(Party.night ? Party.night.stat : {});
    S.sort((a, b) => b.pts - a.pts || b.wins - a.wins);
    let place = 0, prev = null; S.forEach((s, i) => { if (prev === null || s.pts !== prev) place = i + 1; s.place = place; prev = s.pts; });
    return S;
  },
  padInfo(p) {
    const N = Party.night; if (!N) return null;
    const st = this.standings(), me = st.find(s => s.uid === p.uid);
    const nx = N.i + 1 < N.n ? Party.def_(N.list[N.i + 1]) : null;
    return { i: N.i + 1, n: N.n, pts: me ? me.pts : 0, add: N.last[p.uid] || 0, place: me ? me.place : 0, of: st.length, next: nx ? nx.icon + ' ' + nx.name : '', final: false };
  },
  next() {
    const N = Party.night;
    if (N.i + 1 >= N.n) return this.awards();
    N.i++; Party.gameId = N.list[N.i]; store.set('game', Party.gameId);
    Party.begin();
  },
  awards() {
    const st = this.standings(), A = [];
    // the best at something; among ties, someone who hasn't got an award yet
    // (nobody collects more than two awards, so the shine is shared around)
    const best = (f, ok) => { let b = null; for (const s of st) { const v = f(s), mine = A.filter(a => a.uid === s.uid).length; if (!(ok ? ok(s, v) : true) || mine >= 2) continue; const fresh = !mine; if (b === null || v > b.v + 1e-9 || (Math.abs(v - b.v) < 1e-9 && fresh && !b.fresh)) b = { s, v, fresh }; } return b; };
    const give = (s, icon, title, why) => { if (s) A.push({ uid: s.uid, icon, title, why }); };
    if (st.length) give(st[0], '👑', '派對之王', `總共 ${st[0].pts} 分，今晚第一名！`);
    const w = best(s => s.wins, (s, v) => v > 0); if (w && st.length > 1) give(w.s, '🏅', '冠軍收集家', `拿下 ${w.v} 場第一`);
    const m = best(s => s.mvp, (s, v) => v > 0); if (m) give(m.s, '🤝', '最佳隊友', `合作遊戲當了 ${m.v} 次最佳幫手`);
    const c = best(s => -s.rs / s.rn, s => s.rn >= 2); if (c && st.length > 2) give(c.s, '🎯', '穩定發揮獎', '每一場都表現很穩');
    if (st.length > 2 && st[st.length - 1].pts < st[0].pts) give(st[st.length - 1], '💪', '永不放棄獎', '玩到最後都很努力！');
    const extra = [['🌟', '閃亮新星獎', '今晚超有精神！'], ['🎉', '開心果獎', '跟你一起玩最開心'], ['😄', '笑容最多獎', '一直笑嘻嘻'], ['🦸', '勇氣滿分獎', '什麼遊戲都敢挑戰'], ['🍀', '好運氣獎', '運氣好到發光']];
    let k = rint(extra.length);
    for (const s of st) if (!A.some(a => a.uid === s.uid)) { const e = extra[k++ % extra.length]; give(s, e[0], e[1], e[2]); }
    this.final = { rows: st.map(s => ({ uid: s.uid, p: s.p, pts: s.pts, wins: s.wins, place: s.place, awards: A.filter(a => a.uid === s.uid) })), awards: A, t: 0 };
    Party.state = 'awards'; $('result').hidden = true; Fx.clear();
    Party.game = new Ceremony(this.final, Party.night);
    renderAwards(); Music.sync(); Sfx.play('win'); Party.broadcast();
  }
};

/* the award show on the big screen: a stage, a podium, confetti, and the award cards popping in one by one */
class Ceremony {
  constructor(F, N) { this.F = F; this.N = N; this.t = 0; this.dur = null; this.conf = []; this.shown = 0; this.edge = '#2a1747'; }
  update(dt) {
    this.t += dt;
    if (this.conf.length < 110 && Math.random() < 0.5) this.conf.push({ x: rnd(0, W), y: -20, vx: rnd(-40, 40), vy: rnd(90, 200), r: rnd(0, TAU), vr: rnd(-6, 6), c: ['#ffd23f', '#ff6fb7', '#4ade80', '#60c8ff', '#ff7a45', '#b18cff'][rint(6)] });
    for (const c of this.conf) { c.x += c.vx * dt + Math.sin(this.t * 2 + c.r) * 20 * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
    this.conf = this.conf.filter(c => c.y < H + 30);
    const want = Math.min(this.F.awards.length, Math.floor((this.t - 1.6) / 1.1) + 1);
    if (want > this.shown) { this.shown = want; Sfx.play(this.shown === 1 ? 'star' : 'coin'); const a = this.F.awards[this.shown - 1], spot = this.spot(a.uid); if (spot) { Fx.burst(spot.x, spot.y - 60, '#ffd23f', 18, 300); Fx.ring(spot.x, spot.y - 40, '#ffd23f', 110); } }
  }
  spot(uid) {
    const rows = this.F.rows, i = rows.findIndex(r => r.uid === uid); if (i < 0) return null;
    const POD = [[470, 470], [300, 530], [640, 570]];
    if (i < 3) return { x: POD[i][0], y: POD[i][1] - 8 };
    return { x: 150 + (i - 3) * 120, y: 820 };
  }
  draw(g, clock) {
    const t = this.t, at = clock || t, rows = this.F.rows;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1747'); bg.addColorStop(1, '#5b2a6e'); g.fillStyle = bg; g.fillRect(-400, 0, W + 800, H);
    // curtains + spotlights
    for (const s of [-1, 1]) {
      g.fillStyle = '#b3203b'; g.beginPath(); const x0 = s < 0 ? -400 : W + 400, x1 = s < 0 ? 120 : W - 120;
      g.moveTo(x0, 0); g.lineTo(x1, 0); g.quadraticCurveTo(x1 - s * 40, H * 0.5, x1 + s * 30, H); g.lineTo(x0, H); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 6; for (let k = 1; k < 5; k++) { const x = x1 + (x0 - x1) * k / 9; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x - s * 30, H * 0.5, x + s * 20, H); g.stroke(); }
    }
    g.fillStyle = '#8c1730'; for (let x = -40; x < W + 40; x += 80) { g.beginPath(); g.arc(x + 40, 0, 46, 0, Math.PI); g.fill(); }
    for (let k = 0; k < 3; k++) {
      const sx = 470 + Math.sin(at * 0.7 + k * 2.1) * 260, gr = g.createRadialGradient(sx, 640, 10, sx, 640, 260);
      gr.addColorStop(0, 'rgba(255,240,180,.22)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(sx - 30, 40); g.lineTo(sx + 30, 40); g.lineTo(sx + 240, 700); g.lineTo(sx - 240, 700); g.fill();
    }
    g.fillStyle = '#3b2160'; g.fillRect(-400, 700, W + 800, 200); g.fillStyle = 'rgba(255,255,255,.06)'; for (let x = -400; x < W + 400; x += 90) g.fillRect(x, 700, 3, 200);
    // title
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "Noto Sans TC",system-ui,sans-serif'; g.lineWidth = 14; g.strokeStyle = '#2a1747'; g.strokeText('🎉 派對之夜頒獎典禮', 800, 160); g.fillStyle = '#ffd23f'; g.fillText('🎉 派對之夜頒獎典禮', 800, 160);
    g.font = '700 26px "Noto Sans TC",system-ui,sans-serif'; g.fillStyle = '#f3e8ff'; g.fillText(`今晚玩了 ${this.N.n} 場：` + this.N.list.map(id => Party.def_(id).icon).join(' '), 800, 214);
    // podium
    for (const c of this.conf) { g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = c.c; g.fillRect(-7, -4, 14, 8); g.restore(); }
    const POD = [[470, 470, '#ffd23f', '1'], [300, 530, '#d9dee8', '2'], [640, 570, '#f0a868', '3']];
    for (let i = 0; i < 3; i++) {
      const [x, y, c, n] = POD[i];
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 80, y + 6, 166, 706 - y);
      g.fillStyle = c; g.fillRect(x - 84, y, 168, 704 - y); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 84, y, 168, 10);
      g.font = '900 50px "Fredoka",system-ui,sans-serif'; g.fillStyle = 'rgba(43,35,64,.35)'; g.fillText(rows[i] ? rows[i].place : n, x, y + 112);
      const r = rows[i]; if (!r) continue;
      const hop = Math.max(0, Math.sin(at * 5 + i)) * (i === 0 ? 26 : 14), rise = clamp((t - 0.3 * (3 - i)) / 0.5, 0, 1);
      g.globalAlpha = rise;
      drawCritter(g, x, y - 52 - hop - (1 - rise) * 80, i === 0 ? 50 : 42, r.p.col, r.p.animal, { happy: true, face: Math.PI / 2 });
      if (i === 0) { g.font = '54px system-ui'; g.fillText('👑', x, y - 128 - hop); }
      g.globalAlpha = 1;
      drawTag(g, x, y + 30, r.p);
      g.font = '900 28px "Fredoka","Noto Sans TC",system-ui,sans-serif'; g.fillStyle = '#2b2340'; g.fillText(r.pts + ' 分', x, y + 68);
    }
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i], x = 150 + (i - 3) * 120, y = 790;
      drawCritter(g, x, y, 30, r.p.col, r.p.animal, { happy: true, hop: Math.max(0, Math.sin(at * 4 + i)) * 8 });
      g.font = '700 20px "Noto Sans TC",system-ui,sans-serif'; g.fillStyle = '#fff'; g.fillText(r.p.name + '・' + r.pts + ' 分', x, y + 52);
    }
    // award cards
    const A = this.F.awards;
    const step = Math.min(82, 530 / Math.max(1, A.length)), sc = Math.min(1, (step - 8) / 72);
    for (let i = 0; i < this.shown; i++) {
      const a = A[i], k = clamp((t - 1.6 - i * 1.1) / 0.35, 0, 1), ease = 1 - Math.pow(1 - k, 3);
      const x = 880 + (1 - ease) * 300, y = 262 + i * step, row = rows.find(r => r.uid === a.uid);
      g.save(); g.translate(x + 600, y); g.scale(sc, sc); g.translate(-x - 600, -y);
      g.globalAlpha = ease;
      g.fillStyle = 'rgba(255,250,240,.96)'; g.beginPath(); g.roundRect(x, y, 600, 72, 22); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.stroke();
      g.font = '40px system-ui'; g.textAlign = 'center'; g.fillText(a.icon, x + 42, y + 38);
      if (row) drawCritter(g, x + 112, y + 40, 24, row.p.col, row.p.animal, { noShadow: true, happy: true });
      g.textAlign = 'left'; g.fillStyle = '#2b2340'; g.font = '900 28px "Noto Sans TC",system-ui,sans-serif'; g.fillText(a.title + '・' + (row ? row.p.name : ''), x + 146, y + 26, 440);
      g.fillStyle = '#7a6f8f'; g.font = '700 20px "Noto Sans TC",system-ui,sans-serif'; g.fillText(a.why, x + 146, y + 54, 440);
      g.globalAlpha = 1; g.textAlign = 'center'; g.restore();
    }
  }
}
function renderAwards() {
  const el = $('awards'); el.hidden = Party.state !== 'awards';
}

/* ------------------------------ keyboard players (testing, or sharing one keyboard) ------------------------------ */
const KB = {
  k1: { name: '鍵盤A', up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', btn: ['Space', 'KeyF'] },
  k2: { name: '鍵盤B', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', btn: ['Slash', 'ShiftRight', 'KeyL'] }
};
const keys = new Set();
function addKeyboard() {
  const id = ['k1', 'k2'].find(k => !Party.players.some(p => p.local === k));
  if (!id || Party.players.length >= MAX_PLAYERS) return;
  const p = Party.newPlayer({ local: id, name: KB[id].name, online: true });
  if (Party.state !== 'lobby') p.inGame = false;
  Sfx.ensure(); Sfx.play('join'); renderLobby(); Party.broadcast();
  return p;
}
function kbTick() {
  for (const p of Party.players) {
    if (!p.local) continue; const k = KB[p.local];
    let x = (keys.has(k.right) ? 1 : 0) - (keys.has(k.left) ? 1 : 0), y = (keys.has(k.down) ? 1 : 0) - (keys.has(k.up) ? 1 : 0);
    const m = hyp(x, y); if (m) { x /= m; y /= m; }
    p.inp.x = x; p.inp.y = y; p.inp.h[0] = k.btn.some(b => keys.has(b)) ? 1 : 0;
  }
}
addEventListener('keydown', e => {
  Sfx.ensure();
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const fresh = !keys.has(e.code); keys.add(e.code);
  let used = false;
  for (const p of Party.players) {
    if (!p.local) continue;
    if (fresh && KB[p.local].btn.includes(e.code)) { p.inp.c[0]++; used = true; if (Party.state === 'lobby') { p.seen[0] = p.inp.c[0]; yardHop(p); } }
    const k = KB[p.local]; if ([k.up, k.down, k.left, k.right].includes(e.code)) used = true;
  }
  if (used) { e.preventDefault(); return; }
  if (!fresh) return;
  const S = Party.state;
  if (e.key === 'Enter') { if (S === 'lobby') { Party.begin(); e.preventDefault(); } else if (S === 'result' || S === 'awards') { Party.again(); e.preventDefault(); } else if (S === 'intro' && Party.introT > 3.2) Party.introT = 3.2; }
  else if (e.key === 'Escape') { if (S === 'result' || S === 'awards') Party.toLobby(); else if (S === 'play' || S === 'intro') Party.togglePause(); else if (S === 'lobby') location.href = '../index.html'; }
  else if (e.key === 'p' || e.key === 'P') Party.togglePause();
  else if (S === 'lobby' && /^[1-9]$/.test(e.key) && GAMES[+e.key - 1]) Party.pick(GAMES[+e.key - 1].id);
  else if (S === 'lobby' && (e.key === 'm' || e.key === 'M')) Party.setKid(!Party.kid);
  else if (S === 'lobby' && (e.key === 't' || e.key === 'T')) Party.setTeams(!Party.teams);
  else if (S === 'lobby' && (e.key === 'n' || e.key === 'N')) Night.start();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

/* ------------------------------ lobby yard: everyone's critter walks around, so you can see your phone works ------------------------------ */
const yardCv = () => $('yard');
const YW = 1000, YH = 300;
function yardHop(p) { if (p.yard.hop <= 0.5) { p.yard.vy = 560; p.yard.hop = 1; } p.yard.say = 1.2; Sfx.ensure(); Sfx.play('say', p.animal); }
function yardTick(dt) {
  for (const p of Party.players) {
    const y = p.yard, i = Party.input(p);
    y.x = clamp(y.x + i.x * 300 * dt, 50, YW - 50); y.y = clamp(y.y + i.y * 300 * dt, 95, YH - 45);
    if (i.x || i.y) { y.face = Math.atan2(i.y, i.x); y.walk += dt * 10; } else y.walk = 0;
    if (y.hop > 0) { y.vy -= 1800 * dt; y.hop = Math.max(0, y.hop + y.vy * dt); }
    y.say = Math.max(0, y.say - dt);
  }
}
let yardDeco = null;
function yardDraw(t) {
  const cv = yardCv(); if (!cv) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'), s = Math.min(cv.width / YW, cv.height / YH);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#9fdc7c'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(s, 0, 0, s, (cv.width - YW * s) / 2, (cv.height - YH * s) / 2);
  if (!yardDeco) { yardDeco = []; for (let i = 0; i < 46; i++) yardDeco.push({ x: rnd(0, YW), y: rnd(70, YH), c: ['#ffffff', '#ffe066', '#ff9fc4'][rint(3)], k: rnd(0.6, 1.2) }); }
  g.fillStyle = '#b6e895'; g.fillRect(-200, 0, YW + 400, 70);
  g.fillStyle = '#c98f55'; for (let x = -200; x < YW + 200; x += 70) { g.fillRect(x, 26, 12, 46); } g.fillRect(-200, 34, YW + 400, 9); g.fillRect(-200, 54, YW + 400, 9);
  for (const d of yardDeco) { g.fillStyle = d.c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(d.x + Math.cos(a) * 4 * d.k, d.y + Math.sin(a) * 4 * d.k, 3 * d.k, 0, TAU); g.fill(); } g.fillStyle = '#ffb21f'; g.beginPath(); g.arc(d.x, d.y, 2.4 * d.k, 0, TAU); g.fill(); }
  if (!Party.players.length) {
    g.fillStyle = 'rgba(43,35,64,.55)'; g.font = '700 30px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('加入的人會出現在這裡', YW / 2, YH / 2 + 30);
  }
  const list = Party.players.slice().sort((a, b) => a.yard.y - b.yard.y);
  for (const p of list) {
    const y = p.yard, bob = y.walk ? Math.abs(Math.sin(y.walk)) * 6 : 0;
    drawCritter(g, y.x, y.y, 34, p.col, p.animal, { face: y.face, hop: y.hop + bob, alpha: p.online || p.local ? 1 : 0.35, blink: (t + p.uid * 1.7) % 4 < 0.12, happy: y.say > 0 });
    drawTag(g, y.x, y.y + 52, p);
    if (p === Party.leader()) { g.font = '30px system-ui'; g.textAlign = 'center'; g.fillText('👑', y.x, y.y - 56 - y.hop - bob); }
    if (y.say > 0) {
      const tx = y.x + 46, ty = y.y - 70 - y.hop;
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(tx - 6, ty - 24, 74, 44, 16); g.fill();
      g.beginPath(); g.moveTo(tx + 4, ty + 18); g.lineTo(tx - 10, ty + 34); g.lineTo(tx + 20, ty + 18); g.fill();
      g.fillStyle = '#2b2340'; g.font = '900 24px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(PARTY_ANIMALS[p.animal].say, tx + 31, ty - 1);
    }
    if (!p.online && !p.local) { g.fillStyle = '#2b2340'; g.font = '700 18px "Noto Sans TC",system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('斷線', y.x, y.y - 52); }
  }
}

/* ------------------------------ the lobby page ------------------------------ */
function showScreen(id) { $('lobby').hidden = id !== 'lobby'; $('stage').hidden = id !== 'game'; if (id !== 'game') { $('intro').hidden = true; $('result').hidden = true; $('pause').hidden = true; $('awards').hidden = true; } }
let flashT = null;
function flashLobby(t) { const el = $('hint'); el.textContent = t; el.classList.add('show'); clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('show'), 3200); }
function renderLobby() {
  if (!$('lobby')) return;
  $('modeKid').setAttribute('aria-pressed', Party.kid); $('modeAdult').setAttribute('aria-pressed', !Party.kid);
  $('teamOff').setAttribute('aria-pressed', !Party.teams); $('teamOn').setAttribute('aria-pressed', Party.teams);
  const sel = Party.def_(Party.gameId);
  $('teamNote').textContent = sel.forceTeams ? '「' + sel.name + '」一定是兩隊比，會自動分好隊' : Party.teams ? (sel.teams ? (Party.teamsOn(sel) ? '分隊比：☀️ 太陽隊 對 🌙 月亮隊，在手機上可以換隊' : '兩隊都要有人才能分隊，現在先各自比') : '「' + sel.name + '」不分隊' + (sel.kind === 'team' ? '，本來就是大家一起合作' : '，這款各自比')) : '';
  $('modeNote').textContent = Party.kid ? '小朋友模式：慢一點、不會被淘汰、掉下去會回來。' : '大人模式：速度快、有淘汰、炸彈和大野狼。';
  const box = $('cards');
  if (!$('cats').childElementCount) {
    $('cats').innerHTML = CATS.map(c => `<button data-cat="${c.id}">${c.n} <small>${GAMES.filter(g => catOf(g) === c.id).length}</small></button>`).join('');
    $('cats').querySelectorAll('button').forEach(b => b.onclick = () => { Sfx.ensure(); Party.viewCat = b.dataset.cat; Sfx.play('pop'); renderLobby(); });
  }
  const selCat = catOf(Party.def_(Party.gameId));
  if (Party.lastSelCat !== selCat) { Party.lastSelCat = selCat; Party.viewCat = selCat; }   // a pick from a phone jumps to its tab
  const vc = Party.viewCat || selCat;
  $('cats').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === vc));
  if (!box.childElementCount) {
    GAMES.forEach((g, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.dataset.id = g.id; b.style.setProperty('--gc', g.col);
      b.innerHTML = `<span class="num">${i + 1}</span><canvas width="320" height="180" aria-hidden="true"></canvas><span class="cbody"><b>${g.icon} ${esc(g.name)}</b><small>${esc(g.blurb)}</small><em>${g.kind === 'team' ? '大家合作' : g.teams ? '比賽・可分隊' : '比賽'}・${g.players}</em></span>`;
      b.onclick = () => { Sfx.ensure(); Party.pick(g.id); };
      b.ondblclick = () => Party.begin();
      box.appendChild(b);
      if (g.thumb) g.thumb(b.querySelector('canvas').getContext('2d'));
    });
  }
  box.querySelectorAll('.card').forEach(b => { b.setAttribute('aria-pressed', b.dataset.id === Party.gameId); b.hidden = catOf(Party.def_(b.dataset.id)) !== vc; });
  const d = Party.def_(Party.gameId);
  $('startName').textContent = d.icon + ' ' + d.name;
  $('nightN').textContent = Night.count + ' 場';
  $('start').style.setProperty('--gc', d.col);
  const on = Party.players.filter(p => p.online || p.local);
  $('count').textContent = on.length ? `${on.length} 人已加入` : '等大家加入';
  $('chips').innerHTML = Party.players.map(p => `<span class="chip${p.online || p.local ? '' : ' off'}" data-uid="${p.uid}" style="--pc:${Party.teams ? TEAMS[p.team].c : PARTY_COLORS[p.col].c}">${Party.teams ? `<i title="${TEAMS[p.team].n}">${TEAMS[p.team].icon}</i>` : ''}<img src="${critterURL(p.col, p.animal, 64)}" alt="">${p === Party.leader() ? '<i title="房主">👑</i>' : ''}<b>${esc(p.name)}</b>${p.trophies ? `<i>🏆${p.trophies}</i>` : ''}${p.local ? '<u title="移除">×</u>' : ''}</span>`).join('');
  $('chips').querySelectorAll('.chip').forEach(c => {
    const p = Party.players.find(q => q.uid === +c.dataset.uid);
    if (!p) return;
    const x = c.querySelector('u'); if (x) x.onclick = ev => { ev.stopPropagation(); Party.players.splice(Party.players.indexOf(p), 1); renderLobby(); Party.broadcast(); };
    c.onclick = () => { if (Party.teams) { p.team = 1 - p.team; yardHop(p); renderLobby(); Party.broadcast(); } };   // the big screen can sort teams too
  });
  $('addKb').disabled = Party.players.length >= MAX_PLAYERS || ['k1', 'k2'].every(k => Party.players.some(p => p.local === k));
  $('sound').textContent = Sfx.on ? '🔊' : '🔇';
}

/* ------------------------------ intro / result / pause ------------------------------ */
function renderIntro() {
  const d = Party.def, kid = Party.kid;
  $('intro').hidden = false; $('result').hidden = true;
  $('intro').style.setProperty('--gc', d.col);
  $('inIcon').textContent = d.icon; $('inName').textContent = d.name;
  $('inMode').textContent = (Party.night ? `🎉 派對之夜 第 ${Party.night.i + 1} / ${Party.night.n} 場・` : '') + (kid ? '🧒 小朋友模式' : '🧑 大人模式') + (Party.game && Party.game.teams ? '・☀️ 太陽隊 對 🌙 月亮隊' : '');
  $('inRules').innerHTML = d.rules(kid).map(r => `<li>${esc(r)}</li>`).join('');
  const b = Party.btnFor(Party.players[0] || { animal: 1 });
  $('inBtn').innerHTML = `手機上的大按鈕：<b>${esc(b.icon)} ${esc(b.label)}</b>　・　鍵盤 A：WASD＋空白鍵　鍵盤 B：方向鍵＋/`;
  $('inCount').textContent = '';
}
function renderResult() {
  const r = Party.res, d = Party.def;
  $('result').hidden = false; $('result').style.setProperty('--gc', d.col);
  $('reTitle').textContent = r.title;
  $('reSub').textContent = r.sub || '';
  $('reStars').textContent = r.team ? '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars) : '';
  $('reStars').hidden = !r.team;
  const medal = k => k === 1 ? '🥇' : k === 2 ? '🥈' : k === 3 ? '🥉' : k + '';
  const N = Party.night;
  $('reRows').innerHTML = r.rows.map(row => `<li style="--pc:${PARTY_COLORS[row.p.col].c}"><span class="rk">${r.team ? (row.mvp ? '⭐' : '🐾') : medal(row.rank)}</span><img src="${critterURL(row.p.col, row.p.animal, 72)}" alt=""><b>${esc(row.p.name)}</b><span class="ln">${esc(row.line)}</span>${N ? `<em class="np">+${N.last[row.p.uid] || 0}</em>` : row.p.trophies ? `<i>🏆${row.p.trophies}</i>` : ''}</li>`).join('');
  $('reNight').hidden = !N;
  if (N) {
    const st = Night.standings(), last = N.i + 1 >= N.n, nx = last ? null : Party.def_(N.list[N.i + 1]);
    $('reNightHead').textContent = `🎉 派對之夜・第 ${N.i + 1} / ${N.n} 場`;
    $('reStrip').innerHTML = N.list.map((id, i) => { const d = Party.def_(id); return `<span class="${i < N.i + 1 ? 'done' : i === N.i + 1 ? 'nx' : ''}" title="${esc(d.name)}">${d.icon}</span>`; }).join('');
    $('reBoard').innerHTML = st.map(s => `<span style="--pc:${PARTY_COLORS[s.p.col].c}"><b>${s.place}</b><img src="${critterURL(s.p.col, s.p.animal, 48)}" alt="">${esc(s.p.name)} <u>${s.pts} 分</u></span>`).join('');
    $('reAgain').textContent = last ? '🏆 頒獎典禮 ▶' : '下一場：' + nx.icon + ' ' + nx.name + ' ▶';
    $('reMenu').textContent = '結束派對';
  } else { $('reAgain').textContent = '再玩一次'; $('reMenu').textContent = '換遊戲'; }
}

/* ------------------------------ main loop ------------------------------ */
const cv = $('cv'), g = cv.getContext('2d');
let lastT = performance.now(), acc = 0, clock = 0;
/* adaptive resolution: weak TV boxes render the game a bit smaller and let the browser scale it up.
   The canvas never goes above 1920 px wide; if a game runs under ~45 fps the render scale steps down
   (to 55% at most), and creeps back up when there's headroom. The last good scale is remembered per device. */
const Render = { scale: clamp(+store.get('rscale', 1) || 1, 0.55, 1), t: 0, n: 0, changes: 0 };
function fit() {
  const dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth * dpr, h = innerHeight * dpr;
  const k = Math.min(1, 1920 / w) * Render.scale;
  cv.width = Math.max(320, Math.round(w * k)); cv.height = Math.max(180, Math.round(h * k));
}
function renderTune(dt) {
  if (Party.state !== 'play' || Party.paused || document.hidden) { Render.t = Render.n = 0; return; }
  Render.t += dt; Render.n++;
  if (Render.t < 2.5) return;
  const fps = Render.n / Render.t; Render.t = Render.n = 0;
  let next = Render.scale;
  if (fps < 46 && Render.scale > 0.55) next = Math.max(0.55, Render.scale - 0.15);
  else if (fps > 58 && Render.scale < 1 && Render.changes < 8) next = Math.min(1, Render.scale + 0.1);
  if (next !== Render.scale) { Render.scale = next; Render.changes++; store.set('rscale', next); fit(); }
}
addEventListener('resize', fit);
function drawHud(g) {
  const gm = Party.game, list = ps(Party);
  // timer badge
  const left = gm.dur ? Math.max(0, Math.ceil(gm.dur - gm.t)) : null;
  g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); g.roundRect(W / 2 - 74, 10, 148, 84, 24); g.fill();
  g.strokeStyle = Party.def.col; g.lineWidth = 5; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (left === null) { g.font = '52px system-ui'; g.fillStyle = '#2b2340'; g.fillText(Party.def.icon, W / 2, 54); }
  if (left !== null) {
    const urgent = left <= 10 && Party.state === 'play';
    g.fillStyle = urgent ? '#ff3b4a' : '#2b2340'; g.font = `900 ${urgent ? 54 : 48}px "Fredoka","Noto Sans TC",system-ui,sans-serif`;
    g.fillText(Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), W / 2, 50);
  }
  if (gm.teams && gm.teamScore) {
    const sc = [gm.teamScore(0), gm.teamScore(1)];
    g.font = '900 26px "Fredoka","Noto Sans TC",system-ui,sans-serif';
    for (const t of [0, 1]) {
      const T = TEAMS[t], s = t ? sc[1] + ' ' + T.icon : T.icon + ' ' + sc[0], w = g.measureText(s).width + 28, x = t ? W / 2 + 4 : W / 2 - 4 - w;
      g.fillStyle = T.c; g.beginPath(); g.roundRect(x, 100, w, 40, 20); g.fill(); g.fillStyle = '#fff'; g.fillText(s, x + w / 2, 121);
    }
  } else if (gm.center) {
    const s = gm.center(); if (s) {
      g.font = '700 24px "Noto Sans TC",system-ui,sans-serif'; const w = g.measureText(s).width + 30;
      g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); g.roundRect(W / 2 - w / 2, 100, w, 38, 19); g.fill();
      g.fillStyle = '#2b2340'; g.fillText(s, W / 2, 120);
    }
  }
  // score chips, half on each side of the timer
  const half = Math.ceil(list.length / 2), sides = gm.teams ? [list.filter(p => p.team === 0), list.filter(p => p.team === 1)] : [list.slice(0, half), list.slice(half)];
  const cw = Math.min(214, (W / 2 - 110) / Math.max(sides[0].length, sides[1].length, 1) - 12);
  list.forEach(p => {
    const side = sides[0].includes(p) ? -1 : 1, arr = side < 0 ? sides[0] : sides[1], j = side < 0 ? arr.length - 1 - arr.indexOf(p) : arr.indexOf(p);
    const x = side < 0 ? W / 2 - 96 - cw - j * (cw + 12) : W / 2 + 96 + j * (cw + 12), y = 18;
    const C = gm.teams ? { c: TEAMS[p.team].c, d: TEAMS[p.team].d } : PARTY_COLORS[p.col];
    g.globalAlpha = p.online || p.local ? 1 : 0.5;
    g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); g.roundRect(x, y, cw, 66, 22); g.fill();
    g.strokeStyle = C.c; g.lineWidth = 5; g.stroke();
    drawCritter(g, x + 36, y + 36, 21, p.col, p.animal, { noShadow: true });
    g.textAlign = 'left'; g.fillStyle = '#2b2340';
    g.font = '700 19px "Noto Sans TC",system-ui,sans-serif'; g.fillText(p.name, x + 66, y + 22, cw - 76);
    g.font = '900 26px "Fredoka","Noto Sans TC",system-ui,sans-serif'; g.fillStyle = C.d; g.fillText(gm.chip(p), x + 66, y + 48, cw - 76);
    g.globalAlpha = 1;
  });
}
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; clock += dt;
  kbTick(); Party.smoothInputs(dt); renderTune(dt);
  const S = Party.state;
  if (S === 'lobby') { yardTick(dt); yardDraw(clock); }
  if (S === 'intro' && !Party.paused) {
    Party.introT -= dt; const sec = Math.ceil(Party.introT);
    if (Party.introT <= 3 && sec !== Party.lastSec) { Party.lastSec = sec; if (sec > 0) { Sfx.play('tick'); $('inCount').textContent = sec; } }
    if (Party.introT <= 0) Party.startPlay();
  }
  if (S === 'play' && !Party.paused) {
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      if (Party.stopT > 0) { Party.stopT -= STEP; Fx.update(STEP * 0.3); continue; }   // a tiny freeze on big hits
      Party.game.update(STEP); Fx.update(STEP);
      const left = Party.game.dur ? Math.ceil(Party.game.dur - Party.game.t) : 99;
      if (left === 10 && Party.lastSec !== 10 && Party.game.dur >= 30) { Party.lastSec = 10; Fx.announce('最後 10 秒！', '#ff3b4a'); Sfx.play('tick'); }
      if (left <= 5 && left !== Party.lastSec && left > 0) { Party.lastSec = left; Sfx.play('tick'); }
      if (Party.game.over) { Party.finish(); break; }
    }
  } else acc = 0;
  if (S === 'finish') { Fx.update(dt); Party.finishT -= dt; if (Party.finishT <= 0) Party.showResult(); }
  if (S === 'awards' && Party.game) { Party.game.update(dt); Fx.update(dt); }
  if (Party.game && S !== 'lobby') {
    const s = Math.min(cv.width / W, cv.height / H);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = Party.game.edge || Party.def.bg || '#222'; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(s, 0, 0, s, (cv.width - W * s) / 2, (cv.height - H * s) / 2);
    g.save(); g.beginPath(); g.rect(-400, 0, W + 800, H); g.clip();
    if (Fx.shakeAmt > 0.3 && !Party.paused) g.translate(rnd(-1, 1) * Fx.shakeAmt, rnd(-1, 1) * Fx.shakeAmt);
    Party.game.draw(g, clock);
    Fx.draw(g);
    g.restore();
    if (S !== 'awards') drawHud(g);
  }
  const mute = Sfx.on && (!Sfx.ctx || Sfx.ctx.state !== 'running'); if ($('soundGate').hidden !== !mute) $('soundGate').hidden = !mute;
  Party.musicT = (Party.musicT || 0) - dt; if (Party.musicT <= 0) { Party.musicT = 0.2; Music.sync(); }
  Party.netTick(dt);
  requestAnimationFrame(frame);
}

/* ------------------------------ start up ------------------------------ */
function init() {
  fit();
  $('modeKid').onclick = () => { Sfx.ensure(); Party.setKid(true); };
  $('modeAdult').onclick = () => { Sfx.ensure(); Party.setKid(false); };
  $('start').onclick = () => Party.begin();
  $('teamOff').onclick = () => { Sfx.ensure(); Party.setTeams(false); };
  $('teamOn').onclick = () => { Sfx.ensure(); Party.setTeams(true); };
  $('addKb').onclick = () => addKeyboard();
  $('newRoom').onclick = () => {
    if (Party.players.some(p => !p.local) && !confirm('換號碼後，已經加入的手機要重新掃一次。確定嗎？')) return;
    store.set('room', null); Party.players = Party.players.filter(p => p.local); Party.close(); $('qr').hidden = true; $('roomCode').textContent = '…'; Party.open();
  };
  $('sound').onclick = () => { Sfx.on = !Sfx.on; store.set('sound', Sfx.on); Sfx.ensure(); Music.sync(); Sfx.play('pop'); renderLobby(); };
  $('soundGate').onclick = () => { Sfx.on = true; store.set('sound', true); Sfx.ensure(); renderLobby(); };
  $('reAgain').onclick = () => Party.again();
  $('night').onclick = () => { Sfx.ensure(); Night.start(); };
  $('nightN').onclick = () => { Sfx.ensure(); Night.setCount(Night.count === 3 ? 5 : Night.count === 5 ? 7 : 3); };
  $('awAgain').onclick = () => Party.again();
  $('awMenu').onclick = () => Party.toLobby();
  $('reMenu').onclick = () => Party.toLobby();
  $('pResume').onclick = () => Party.togglePause();
  $('pQuit').onclick = () => Party.toLobby();
  $('inSkip').onclick = () => { if (Party.introT > 3.2) Party.introT = 3.2; };
  document.addEventListener('pointerdown', () => Sfx.ensure());
  Sfx.ensure();   // some browsers allow sound right away; otherwise the gate button asks for one tap
  addEventListener('pagehide', () => Party.close());
  showScreen('lobby'); renderLobby();
  Party.open();
  requestAnimationFrame(frame);
  // keep the TV awake while people are playing (a sleeping screen drops every phone)
  const wake = async () => { try { if ('wakeLock' in navigator && !document.hidden) await navigator.wakeLock.request('screen'); } catch (e) { } };
  wake(); document.addEventListener('visibilitychange', wake);
}

'use strict';
/* 連線一起玩 · 連線遊戲專區 — every device runs this same page.
   The device that creates the room is the HOST: it keeps the room (players, leader, mode) and runs the
   game rules. Each phone gets its own VIEW of the game — only what that player may see — and draws it
   itself. A room can also have big screens ("table" seats) that get the public view of the game.

   Game definition (games/*.js push into LGAMES):
     { id, name, icon, col, blurb, players:[min,max], cat, rules(kid) → [lines],
       opts?(kid) → [{ k, n:'label', o:[[value,'label'],…], d:default }]   lobby settings the leader may change,
       host(ctx)   → runs on the host only: { view(id), msg(id, d), tick?(dt), rate?, over, results(), leave?(id), back?(id) }
                     view(null) is the public view (big screen / watchers) and must never contain secrets.
       client(root, api) → runs on every screen in the game: { view(v), destroy?() }
       bot?(view, api)   → optional: plays one random-but-legal move (used by the tests) }
   host ctx: { kid, opt:{k:value} (the chosen settings), players:[{id,name,animal,col}], hasTable, push(), sound(to,name), toast(to,text), online(id), leader() → id, now() }
             push(): views changed, send them. Games with `rate` (Hz) are sent that often automatically.
   client api: { me (id or null), isTable, spectator, kid, players(), player(id), send(d), sfx(name),
                 vibrate(ms), avatar(p,size) → img url, color(p) → {c,d}, toast(text) } */
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const LGAMES = [];
/* lobby groups; a game may set cat itself, otherwise the table below decides */
const LCATS = [{ id: 'table', n: '🃏 桌上遊戲' }, { id: 'draw', n: '🎨 創意歡樂' }, { id: 'action', n: '🏃 各自視角動作' }, { id: 'brain', n: '🧠 比快比腦力' }, { id: 'coop', n: '🤝 大家合作' }];
const LCAT_OF = { cards: 'table', treasure: 'table', spy: 'draw', telephone: 'draw', snake: 'action', fog: 'action', race: 'brain', ship: 'coop' };
const lcatOf = g => LCAT_OF[g.id] || (LCATS.some(c => c.id === g.cat) ? g.cat : 'brain');   // never lose a game to an unknown cat
const MAX_PLAYERS = 6;
/* game settings: what the leader picked, checked against the game's own list */
function optList(def, kid) { try { return (def && def.opts && def.opts(kid)) || []; } catch (e) { return []; } }
function optResolve(def, kid, saved) {
  const out = {};
  for (const o of optList(def, kid)) { const v = saved ? saved[o.k] : undefined; out[o.k] = o.o.some(x => x[0] === v) ? v : o.d; }
  return out;
}
const PTS_RANK = [3, 2, 1];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = n => Math.random() * n | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('mwlink.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mwlink.' + k, JSON.stringify(v)); } catch (e) { } }
};
const tabStore = {
  get(k, d) { try { const v = sessionStorage.getItem('mwlink.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { sessionStorage.setItem('mwlink.' + k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { sessionStorage.removeItem('mwlink.' + k); } catch (e) { } }
};
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = n => Array.from({ length: n }, () => CODE_CH[rint(CODE_CH.length)]).join('');

/* ---------- sound ---------- */
const Sfx = {
  ctx: null, on: store.get('sound', true), last: {},
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { });
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
  /* names every game may use: join pop tick go card flip deal right wrong buzz coin star boom win end turn eat whoosh */
  play(n, arg) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = performance.now(); if (this.last[n] && now - this.last[n] < 45) return; this.last[n] = now;
    switch (n) {
      case 'join': this.tone(520, 0.1, 'triangle', 0.18); this.tone(780, 0.14, 'triangle', 0.18, 0, 0.08); break;
      case 'pop': this.tone(600, 0.08, 'sine', 0.16, 900); break;
      case 'tick': this.tone(880, 0.06, 'square', 0.06); break;
      case 'go': this.tone(660, 0.12, 'square', 0.1); this.tone(990, 0.25, 'square', 0.1, 0, 0.1); break;
      case 'card': this.noise(0.07, 0.18, 2400, 1.2); break;
      case 'flip': this.noise(0.05, 0.14, 3000, 1.5); this.tone(700, 0.05, 'triangle', 0.08, 1000, 0.03); break;
      case 'deal': for (let i = 0; i < 4; i++) setTimeout(() => this.noise(0.05, 0.13, 2600, 1.3), i * 70); break;
      case 'right': this.tone(660, 0.1, 'triangle', 0.18); this.tone(990, 0.18, 'triangle', 0.18, 0, 0.09); break;
      case 'wrong': this.tone(260, 0.22, 'square', 0.08, 180); break;
      case 'buzz': this.tone(140, 0.3, 'sawtooth', 0.09, 110); break;
      case 'coin': this.tone(880, 0.07, 'square', 0.07); this.tone(1320, 0.12, 'square', 0.07, 0, 0.06); break;
      case 'star': [988, 1319, 1568, 1976].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, 0, i * 0.06)); break;
      case 'boom': this.noise(0.6, 0.35, 160, 0.5); this.tone(90, 0.4, 'sine', 0.3, 40); break;
      case 'eat': this.tone(500 + (arg || 0) * 40, 0.06, 'sine', 0.12, 800 + (arg || 0) * 40); break;
      case 'whoosh': this.noise(0.18, 0.12, 1400, 0.6); break;
      case 'turn': this.tone(587, 0.1, 'triangle', 0.16); this.tone(880, 0.16, 'triangle', 0.16, 0, 0.1); break;
      case 'say': { const f = [700, 360, 900, 220, 300, 520][arg || 0]; this.tone(f, 0.18, 'square', 0.08, f * 0.8); break; }
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.14, 0, i * 0.12)); break;
      case 'end': this.tone(784, 0.15, 'square', 0.08); this.tone(523, 0.35, 'square', 0.08, 0, 0.15); break;
    }
  }
};
addEventListener('pointerdown', () => Sfx.ensure(), { capture: true });
addEventListener('keydown', () => Sfx.ensure(), { capture: true });

/* keep the screen awake while in a room (the host's device must stay on) */
const Wake = {
  lock: null, want: false,
  async on() { this.want = true; try { if ('wakeLock' in navigator && !this.lock) { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } } catch (e) { } },
  off() { this.want = false; try { this.lock && this.lock.release(); } catch (e) { } this.lock = null; }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Wake.want) Wake.on(); });

const avatar = (p, size) => critterURL(p ? p.col : 0, p ? p.animal : 0, size || 96);

/* =====================================================================
   HOST — owns the room and runs the game
   ===================================================================== */
const Host = {
  net: null, room: '', selfId: '', selfTable: false,
  players: [],          // {id,name,animal,col,online,table,joinT,trophies}
  leadPref: null, kid: true, pick: null, state: 'lobby', opts: {}, board: {}, hist: [],
  def: null, game: null, inGame: [], introT: 0, res: null, lastSent: {}, sendAcc: 0, dirty: false, loop: 0, roomDirty: false, seq: 0,

  start(room, selfProf, asTable) {
    this.room = room; this.selfId = App.id; this.selfTable = asTable;
    this.kid = store.get('kid', true);
    this.opts = store.get('opts', {}) || {};
    const sb = tabStore.get('board', null);                       // scores survive a reload of the host's page
    if (sb && sb.room === room) { this.board = sb.b || {}; this.hist = sb.h || []; } else { this.board = {}; this.hist = []; }
    this.pick = store.get('pick', LGAMES[0] && LGAMES[0].id);
    if (!LGAMES.some(g => g.id === this.pick)) this.pick = LGAMES[0] && LGAMES[0].id;
    this.addPlayer(this.selfId, selfProf, asTable);
    this.net = LinkNet.open({ room, role: 'host', id: this.selfId, on: m => this.onNet(m), status: (s, i) => App.netStatus(s, i) });
    clearInterval(this.loop);
    let last = performance.now();
    this.loop = setInterval(() => { const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; this.step(dt); }, 1000 / 30);
    this.sendRoom();
  },
  stop() { clearInterval(this.loop); try { this.net && this.net.close(); } catch (e) { } this.net = null; },

  onNet(m) {
    if (m.k === '_hello') { for (const id of m.ids || []) { const p = this.byId(id); if (p) p.online = true; } this.sendRoom(); this.pushViews(true); return; }
    if (m.k === '_join') { const p = this.byId(m.id); if (p) { p.online = true; this.back(p); } this.sendRoom(); this.pushViews(true); return; }
    if (m.k === '_leave') { const p = this.byId(m.id); if (p) { p.online = false; if (this.game && this.game.leave && this.inGame.includes(p.id)) this.game.leave(p.id); this.sendRoom(); this.pushViews(); } return; }
    if (m.k === '_msg') this.handle(m.id, m.m || {});
  },
  back(p) { if (this.game && this.game.back && this.inGame.includes(p.id)) this.game.back(p.id); },
  byId(id) { return this.players.find(p => p.id === id); },
  seats() { return this.players.filter(p => !p.table); },
  leader() {
    const ok = p => p && p.online && !p.table;
    const pref = this.byId(this.leadPref); if (ok(pref)) return pref;
    return this.seats().find(ok) || null;
  },
  isLeader(id) { const l = this.leader(); return l ? l.id === id : this.selfId === id; },   // a lone big screen may run things itself
  freeCol() { const used = this.seats().map(p => p.col); for (let i = 0; i < 6; i++) if (!used.includes(i)) return i; return rint(6); },
  addPlayer(id, prof, table) {
    let p = this.byId(id);
    const name = String((prof && prof.name) || '').trim().slice(0, 8) || (table ? '大螢幕' : '玩家');
    const animal = clamp((prof && prof.animal) | 0, 0, 5);
    if (!p) {
      if (!table && this.seats().length >= MAX_PLAYERS + 2) return null;      // a couple of watchers are fine
      p = { id, name, animal, col: table ? 0 : this.freeCol(), online: true, table: !!table, joinT: ++this.seq, trophies: this.board[id] ? this.board[id].w : 0 };
      this.players.push(p);
      if (!table) this.fx('*', 'join');
    } else { p.name = name; p.animal = animal; p.online = true; p.table = !!table; }
    return p;
  },

  /* every request from a screen (the host's own screen calls this directly) */
  handle(id, m) {
    const p = this.byId(id), lead = this.isLeader(id);
    switch (m.k) {
      case 'hi': {
        const q = this.addPlayer(id, m, m.table);
        if (!q) { this.net.send({ to: { [id]: { k: 'full' } } }); return; }
        this.back(q); this.sendRoom(); this.pushViews(true); return;
      }
      case 'prof': if (p && !p.table) { p.name = String(m.name || '').trim().slice(0, 8) || p.name; p.animal = clamp(m.animal | 0, 0, 5); this.sendRoom(); } return;
      case 'say': if (p) this.fx('*', 'say', p.animal); return;
      case 'bye': if (p && !(this.game && this.inGame.includes(id))) { this.players = this.players.filter(q => q !== p); if (this.leadPref === id) this.leadPref = null; this.sendRoom(); } return;
      case 'g': if (this.state === 'play' && this.game && this.inGame.includes(id)) { try { this.game.msg(id, m.d || {}); } catch (e) { console.error(e); } this.pushViews(); } return;
    }
    if (!lead) return;
    switch (m.k) {
      case 'pick': if (this.state === 'lobby' && LGAMES.some(g => g.id === m.id)) { this.pick = m.id; store.set('pick', m.id); this.sendRoom(); } break;
      case 'mode': if (this.state === 'lobby') { this.kid = !!m.kid; store.set('kid', this.kid); this.sendRoom(); } break;
      case 'opt': {
        const def = LGAMES.find(g => g.id === m.g), o = optList(def, this.kid).find(x => x.k === m.o);
        if (this.state === 'lobby' && o && o.o.some(x => x[0] === m.v)) { (this.opts[m.g] = this.opts[m.g] || {})[m.o] = m.v; store.set('opts', this.opts); this.sendRoom(); }
        break;
      }
      case 'reset': if (this.state === 'lobby' || this.state === 'result') { this.board = {}; this.hist = []; this.players.forEach(p => p.trophies = 0); this.saveBoard(); this.sendRoom(); } break;
      case 'lead': if (this.byId(m.id) && !this.byId(m.id).table) { this.leadPref = m.id; this.sendRoom(); } break;
      case 'start': this.begin(); break;
      case 'skip': if (this.state === 'intro') this.introT = 0; break;
      case 'quit': if (this.state === 'play' || this.state === 'intro') this.toLobby(); break;
      case 'again': if (this.state === 'result') this.begin(); break;
      case 'lobby': this.toLobby(); break;
    }
  },

  begin() {
    const def = LGAMES.find(g => g.id === this.pick); if (!def) return;
    const seats = this.seats().filter(p => p.online).sort((a, b) => a.joinT - b.joinT);
    const [mn, mx] = def.players || [1, MAX_PLAYERS];
    if (seats.length < mn) { this.fx(this.leader() ? this.leader().id : '*', 'toast', `這款要 ${mn} 個人以上才能玩`); return; }
    this.def = def; this.inGame = seats.slice(0, mx).map(p => p.id);
    if (seats.length > mx) this.fx('*', 'toast', `這款最多 ${mx} 人，其他人這局先觀戰`);
    this.state = 'intro'; this.introT = this.kid ? 7 : 6; this.res = null; this.game = null; this.lastSent = {};
    this.sendRoom();
  },
  startPlay() {
    const ids = this.inGame, kid = this.kid;
    const players = ids.map(id => { const p = this.byId(id); return { id, name: p.name, animal: p.animal, col: p.col }; });
    const ctx = {
      kid, players, opt: optResolve(this.def, kid, this.opts[this.def.id]), hasTable: this.players.some(p => p.table && p.online),
      push: () => { this.dirty = true; },
      sound: (to, name, arg) => this.fx(to, 'sfx', name, arg),
      toast: (to, text) => this.fx(to, 'toast', text),
      online: id => { const p = this.byId(id); return !!(p && p.online); },
      leader: () => { const l = this.leader(); return l ? l.id : null; },
      now: () => performance.now() / 1000
    };
    try { this.game = this.def.host(ctx); } catch (e) { console.error(e); this.toLobby(); return; }
    this.state = 'play'; this.sendAcc = 0; this.lastSent = {};
    this.sendRoom(); this.pushViews(true);
  },
  finish() {
    let r; try { r = this.game.results() || {}; } catch (e) { console.error(e); r = {}; }
    const rows = (r.rows || []).map(row => ({ ...row }));
    const low = !!r.lowWins;
    rows.sort((a, b) => low ? a.key - b.key : b.key - a.key);
    let rank = 0, prev = null;
    rows.forEach((row, i) => { if (prev === null || row.key !== prev) rank = i + 1; row.rank = rank; prev = row.key; });
    const winners = rows.filter(x => x.rank === 1);
    const solo = winners.length === rows.length;
    if (!r.noWinner && rows.length > 1 && !solo) winners.forEach(w => { const p = this.byId(w.id); if (p) p.trophies++; });
    const name = id => { const p = this.byId(id); return p ? p.name : '?'; };
    const title = r.title || (rows.length <= 1 ? '完成！' : solo ? '平手！大家都好厲害' : winners.map(w => name(w.id)).join('、') + ' 贏了！');
    /* room scoreboard: 3/2/1 points for the top three; a game may hand out its own (co-op games: everyone the same) */
    const pts = {};
    rows.forEach(x => { pts[x.id] = r.pts && r.pts[x.id] != null ? Math.max(0, r.pts[x.id] | 0) : (r.noWinner || rows.length < 2 || solo ? 0 : PTS_RANK[x.rank - 1] || 0); });
    rows.forEach(x => {
      const b = this.board[x.id] || (this.board[x.id] = { p: 0, w: 0, n: 0 });
      b.p += pts[x.id]; b.n++;
      if (!r.noWinner && rows.length > 1 && !solo && x.rank === 1) b.w++;
    });
    this.hist.push({ g: this.def.id, t: title, w: r.noWinner || solo ? [] : winners.map(w => w.id), k: this.kid ? 1 : 0 });
    if (this.hist.length > 30) this.hist.shift();
    this.saveBoard();
    this.res = { title, sub: r.sub || '', rows: rows.map(x => ({ id: x.id, rank: x.rank, line: x.line || '', pts: pts[x.id] })), game: this.def.id };
    this.state = 'result'; this.game = null;
    this.fx('*', 'sfx', 'win');
    this.sendRoom();
  },
  saveBoard() { tabStore.set('board', { room: this.room, b: this.board, h: this.hist }); },
  toLobby() { this.state = 'lobby'; this.game = null; this.res = null; this.sendRoom(); },

  step(dt) {
    if (this.state === 'intro') { this.introT -= dt; if (this.introT <= 0) this.startPlay(); else if (Math.ceil(this.introT) !== Math.ceil(this.introT + dt)) this.sendRoom(); }
    if (this.state === 'play' && this.game) {
      if (this.game.tick) { try { this.game.tick(dt); } catch (e) { console.error(e); } }
      if (this.game.rate) { this.sendAcc += dt; if (this.sendAcc >= 1 / this.game.rate) { this.sendAcc = 0; this.dirty = true; } }
      if (this.game.over) { this.pushViews(true); this.finish(); return; }
      if (this.dirty) this.pushViews();
    }
    if (this.roomDirty) this.flushRoom();
  },

  /* room snapshot for every screen */
  sendRoom() { this.roomDirty = true; },
  roomSnap() {
    const l = this.leader();
    return {
      k: 'room', room: this.room, hostId: this.selfId, leader: l ? l.id : this.selfId, kid: this.kid, pick: this.pick, state: this.state,
      game: this.def ? this.def.id : null, inGame: this.inGame, intro: Math.max(0, Math.ceil(this.introT)), res: this.res,
      opt: optResolve(LGAMES.find(g => g.id === (this.state === 'lobby' ? this.pick : this.def ? this.def.id : this.pick)), this.kid, this.opts[this.state === 'lobby' ? this.pick : this.def ? this.def.id : this.pick]),
      board: this.board, hist: this.hist.slice(-8),
      players: this.players.map(p => ({ id: p.id, name: p.name, animal: p.animal, col: p.col, online: p.online, table: p.table, trophies: p.trophies, joinT: p.joinT }))
    };
  },
  flushRoom() {
    this.roomDirty = false;
    const snap = this.roomSnap();
    if (this.net) this.net.send({ all: snap });
    App.onRoom(JSON.parse(JSON.stringify(snap)));
  },
  /* game views: each player only gets their own; big screens and watchers get the public one */
  pushViews(force) {
    this.dirty = false;
    if (this.state !== 'play' || !this.game) return;
    if (this.roomDirty) this.flushRoom();
    const to = {}, live = !!this.game.rate;
    let pub;
    const getPub = () => pub !== undefined ? pub : (pub = this.safeView(null));
    for (const p of this.players) {
      if (!p.online && p.id !== this.selfId) continue;
      const v = this.inGame.includes(p.id) && !p.table ? this.safeView(p.id) : getPub();
      const s = JSON.stringify(v);
      if (!force && !live && this.lastSent[p.id] === s) continue;
      this.lastSent[p.id] = s;
      if (p.id === this.selfId) App.onGameView(JSON.parse(s));
      else to[p.id] = { k: 'gv', v };
    }
    if (this.net && Object.keys(to).length) this.net.send({ to });
  },
  safeView(id) { try { return this.game.view(id); } catch (e) { console.error(e); return null; } },
  fx(to, kind, a, b) {
    const msg = { k: 'fx', kind, a, b };
    if (to === '*' || to === this.selfId) App.onFx(msg);
    if (!this.net) return;
    if (to === '*') this.net.send({ all: msg });
    else if (to !== this.selfId) this.net.send({ to: { [to]: msg } });
  }
};

/* =====================================================================
   APP — what every screen shows
   ===================================================================== */
const App = {
  id: '', role: null, room: '', table: false, net: null, R: null, inst: null, instKey: '', lastView: null, menuOpen: false,
  prof: { name: store.get('name', ''), animal: store.get('animal', rint(6)) },
  hostAway: false, netState: '',

  boot() {
    this.id = tabStore.get('id', null) || ('p' + makeCode(10)); tabStore.set('id', this.id);
    $('name').value = this.prof.name;
    this.drawAnimals();
    $('name').addEventListener('input', () => { this.prof.name = $('name').value.trim(); store.set('name', this.prof.name); });
    $('joinCode').addEventListener('input', () => { $('joinCode').value = $('joinCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
    $('joinBtn').onclick = () => this.joinUI();
    $('createBtn').onclick = () => this.createUI(false);
    $('joinTableBtn').onclick = () => { const code = $('joinCode').value.trim().toUpperCase(); if (code.length !== 5) { $('homeStatus').textContent = '先輸入房號'; $('joinCode').focus(); return; } this.join(code, true); };
    $('tableBtn').onclick = () => this.createUI(true);
    $('barSound').onclick = () => { Sfx.on = !Sfx.on; store.set('sound', Sfx.on); this.drawBar(); };
    $('barMenu').onclick = e => { e.stopPropagation(); this.menuOpen = !this.menuOpen; this.drawMenu(); };
    addEventListener('pointerdown', e => { if (this.menuOpen && !$('menu').contains(e.target) && e.target !== $('barMenu')) { this.menuOpen = false; this.drawMenu(); } });
    // a reload brings you straight back into your room
    const saved = tabStore.get('seat', null);
    const qRoom = (Q.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (saved && (!qRoom || qRoom === saved.room)) {
      if (saved.prof && saved.prof.name) this.prof = saved.prof;
      if (saved.role === 'host') this.create(saved.table, saved.room);
      else this.join(saved.room, saved.table);
      return;
    }
    if (qRoom) { $('joinCode').value = qRoom; setTimeout(() => (this.prof.name ? $('joinBtn') : $('name')).focus(), 50); }
    this.show('home');
  },
  drawAnimals() {
    const box = $('animals'); box.innerHTML = '';
    PARTY_ANIMALS.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = i === this.prof.animal ? 'on' : ''; b.setAttribute('aria-label', a.n);
      b.innerHTML = `<img alt="" src="${critterURL(i, i, 96)}">`;
      b.onclick = () => { this.prof.animal = i; store.set('animal', i); Sfx.ensure(); Sfx.play('say', i); this.drawAnimals(); };
      box.appendChild(b);
    });
  },
  needName() {
    if (this.prof.name) return true;
    $('homeStatus').textContent = '先寫你的名字喔'; $('name').focus(); return false;
  },
  joinUI() {
    const code = $('joinCode').value.trim().toUpperCase();
    if (code.length !== 5) { $('homeStatus').textContent = '房號是 5 個字'; $('joinCode').focus(); return; }
    if (!this.needName()) return;
    this.join(code, false);
  },
  createUI(table) { if (!table && !this.needName()) return; this.create(table); },

  create(table, room) {
    this.role = 'host'; this.table = !!table; this.room = room || makeCode(5);
    tabStore.set('seat', { role: 'host', room: this.room, table: this.table, prof: this.prof });
    this.setURL();
    document.body.classList.toggle('table', this.table);
    Wake.on();
    Host.start(this.room, this.prof, this.table);
    this.show('lobby');
  },
  join(room, table) {
    this.role = 'guest'; this.room = room; this.table = !!table;
    tabStore.set('seat', { role: 'guest', room, table: this.table, prof: this.prof });
    this.setURL();
    document.body.classList.toggle('table', this.table);
    Wake.on();
    $('homeStatus').textContent = '';
    this.net = LinkNet.open({
      room, role: 'guest', id: this.id,
      on: m => this.onNet(m),
      status: (s, info) => {
        if (s === 'open') this.net.send({ k: 'hi', name: this.prof.name, animal: this.prof.animal, table: this.table });
        this.netStatus(s, info);
      }
    });
    this.show('lobby');
    this.drawLobby();
  },
  leave() {
    if (this.role === 'host') Host.stop(); else try { this.net && this.net.send({ k: 'bye' }); const n = this.net; setTimeout(() => n.close(), 120); } catch (e) { }
    tabStore.del('seat'); Wake.off();
    this.unmount(); this.role = null; this.R = null; this.net = null;
    history.replaceState(null, '', location.pathname + (LinkNet.LOCAL ? '?net=local' : ''));
    document.body.classList.remove('table');
    this.show('home');
  },
  setURL() {
    const q = new URLSearchParams(location.search); q.set('room', this.room);
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  },
  shareURL() {
    const u = new URL(location.href); u.search = ''; u.searchParams.set('room', this.room);
    if (LinkNet.LOCAL) u.searchParams.set('net', 'local');
    return u.toString();
  },
  send(m) { if (this.role === 'host') Host.handle(this.id, m); else if (this.net) this.net.send(m); },

  onNet(m) {
    switch (m.k) {
      case 'room': this.onRoom(m); break;
      case 'gv': this.onGameView(m.v); break;
      case 'fx': this.onFx(m); break;
      case 'full': this.netMsg('房間已經滿了 😢'); break;
      case '_host': this.hostAway = !m.on; this.drawNet(); if (m.on) this.net.send({ k: 'hi', name: this.prof.name, animal: this.prof.animal, table: this.table }); break;
    }
  },
  netStatus(s, info) {
    this.netState = s;
    if (s === 'refused') {
      tabStore.del('seat');
      if (this.role === 'host' && info && info.code === 'busy') { Host.stop(); this.create(this.table); return; }   // code clash: take another
      try { this.net && this.net.close(); } catch (e) { }
      this.role = null; this.net = null; this.unmount();
      this.show('home'); $('homeStatus').textContent = (info && info.msg) || '連不上房間';
      return;
    }
    this.drawNet();
  },
  drawNet() {
    const bad = this.netState === 'retry' || this.netState === 'connecting' || this.hostAway;
    $('netDot').classList.toggle('bad', bad);
    if (this.hostAway) this.netMsg('房主斷線了，等他回來…（房主的手機請不要鎖螢幕）');
    else if (this.netState === 'retry') this.netMsg('連線中斷，重新連線中…');
    else if (this.netState === 'connecting' && !this.R) this.netMsg('連線中…');
    else this.netMsg('');
  },
  netMsg(t) { $('netMsg').textContent = t; $('netMsg').hidden = !t; },

  me() { return this.R && this.R.players.find(p => p.id === this.id); },
  isLeader() { return !!this.R && this.R.leader === this.id; },
  player(id) { return this.R && this.R.players.find(p => p.id === id); },

  onRoom(R) {
    const prev = this.R; this.R = R;
    if (prev == null && this.role === 'guest') Sfx.play('join');
    this.drawNet();
    if (R.state === 'lobby') { this.unmount(); this.hideOv(); this.show('lobby'); this.drawLobby(); }
    else if (R.state === 'intro') { this.unmount(); this.show('lobby'); this.drawLobby(); this.drawIntro(prev); }
    else if (R.state === 'play') { $('intro').hidden = true; $('result').hidden = true; this.ensureMount(); }
    else if (R.state === 'result') { this.drawResult(prev); }
    this.drawBar(); if (this.menuOpen) this.drawMenu();
  },

  /* ---------- lobby ---------- */
  optText(def, R) {
    return optList(def, R.kid).map(o => { const x = o.o.find(y => y[0] === R.opt[o.k]); return x ? `${o.n}：${x[1]}` : ''; }).filter(Boolean);
  },
  optHTML(def, R) {
    const list = optList(def, R.kid); if (!list.length) return '';
    return `<div class="opts" id="opts"><div class="optH">⚙️ 玩法設定</div>${list.map(o => `<div class="optR"><span class="optN">${esc(o.n)}</span><div class="seg optSeg">${o.o.map((x, i) => `<button data-o="${esc(o.k)}" data-i="${i}" class="${R.opt[o.k] === x[0] ? 'on' : ''}">${esc(x[1])}</button>`).join('')}</div></div>`).join('')}</div>`;
  },
  boardHTML(R, big) {
    const ids = Object.keys(R.board || {}).filter(id => this.player(id) && !this.player(id).table);
    if (!ids.length) return '';
    ids.sort((a, b) => R.board[b].p - R.board[a].p || R.board[b].w - R.board[a].w);
    let rk = 0, prev = null;
    const rows = ids.map((id, i) => {
      const b = R.board[id], p = this.player(id);
      if (b.p !== prev) { rk = i + 1; prev = b.p; }
      return `<div class="bdR ${rk === 1 && b.p > 0 ? 'top' : ''} ${id === this.id ? 'me' : ''}"><span class="bdK">${rk === 1 && b.p > 0 ? '👑' : rk}</span><img alt="" src="${avatar(p, 64)}"><span class="bdN">${esc(p.name)}</span><span class="bdS">🏆${b.w}<small>·${b.n} 局</small></span><span class="bdP">${b.p}<small>分</small></span></div>`;
    }).join('');
    const hist = (R.hist || []).slice().reverse().map(h => {
      const d = LGAMES.find(g => g.id === h.g), w = h.w.map(id => this.player(id)).filter(Boolean);
      return `<span class="bdH" title="${esc(h.t)}">${d ? d.icon : '🎮'} ${w.length ? w.map(p => `<img alt="" src="${avatar(p, 48)}">`).join('') : '🤝'}</span>`;
    }).join('');
    return `<section class="card bdCard"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0${big ? ';font-size:24px' : ''}">🏅 這個房間的排行榜</h2>${this.isLeader() ? '<button class="btn small ghost" id="bdReset">歸零</button>' : ''}</div>
      <div class="bdList">${rows}</div>${hist ? `<div class="bdHs"><small>最近幾局</small>${hist}</div>` : ''}<p class="sub" style="text-align:left;font-size:12px;margin-top:6px">每局第 1 名 3 分、第 2 名 2 分、第 3 名 1 分；合作遊戲過關大家一起加分。</p></section>`;
  },
  drawLobby() {
    const R = this.R, box = $('lobbyWrap');
    if (!R) { box.innerHTML = `<div class="card"><p class="wait">連線到房間 <b>${esc(this.room)}</b> …</p></div><button class="btn ghost" id="lvBtn">← 離開</button>`; $('lvBtn').onclick = () => this.leave(); return; }
    const def = LGAMES.find(g => g.id === R.pick) || LGAMES[0];
    const lead = this.isLeader(), leader = this.player(R.leader);
    const seats = R.players.filter(p => !p.table);
    const pls = seats.map(p => `<span class="pl ${p.id === this.id ? 'me' : ''} ${p.online ? '' : 'off'}">${p.id === R.leader ? '<span class="crown">👑</span>' : ''}<img alt="" src="${avatar(p, 96)}">${esc(p.name)}${p.trophies ? `<span class="ptr">🏆${p.trophies}</span>` : ''}</span>`).join('') || '<span class="wait">還沒有人加入</span>';
    const tables = R.players.filter(p => p.table && p.online).length;
    const modeSeg = `<div class="seg" id="modeSeg"><button data-k="1" class="${R.kid ? 'on' : ''}">🧒 小朋友</button><button data-k="0" class="${R.kid ? '' : 'on'}">🧑 大人</button></div>`;
    const gameInfo = d => `<div class="gsel"><span class="ic">${d.icon}</span><div><div class="nm" style="font-weight:900;font-size:20px">${esc(d.name)}</div><div class="bl" style="color:var(--mute);font-size:14px">${esc(d.blurb)}</div><div class="pp" style="color:var(--pri);font-weight:700;font-size:13px">${d.players[0]}–${d.players[1]} 人 · ${R.kid ? '小朋友模式' : '大人模式'}${this.optText(d, R).map(t => ' · ' + esc(t)).join('')}</div></div></div>`;

    if (this.table) {
      box.innerHTML = `
        <p class="eyebrow">連線遊戲專區 · ONLINE</p><h1 class="title" style="font-size:44px">連線一起玩</h1>
        <div class="tlobby">
          <section class="card" style="text-align:center">
            <img class="qr" id="qr" alt="加入房間的 QR code">
            <p style="margin:12px 0 4px;font-weight:900;font-size:20px">📱 用手機掃一下就加入</p>
            <div class="roomCode"><small>房號</small>${esc(R.room)}</div>
            <p class="sub" style="margin-top:8px;word-break:break-all">${esc(this.shareURL())}</p>
          </section>
          <div style="display:flex;flex-direction:column;gap:16px">
            <section class="card"><h2 style="font-size:24px">玩家（${seats.filter(p => p.online).length}）</h2><div class="players">${pls}</div></section>
            <section class="card"><h2 style="font-size:24px">${lead ? '選一個遊戲' : `等 👑 ${esc(leader ? leader.name : '房主')} 選遊戲`}</h2>${gameInfo(def)}
              ${lead ? `<div class="games" id="games" style="margin-top:14px;grid-template-columns:repeat(4,1fr)"></div>${this.optHTML(def, R)}<div class="row" style="margin-top:14px;justify-content:space-between">${modeSeg}<button class="btn acc" id="startBtn">開始玩 ▶</button></div>` : ''}
            </section>
            ${this.boardHTML(R, true)}
            <p class="sub">這台是大螢幕：顯示大家都能看的畫面，每個人自己的手牌和身分只會出現在自己的手機上。</p>
            <div><button class="btn ghost small" id="lvBtn">關閉房間</button></div>
          </div>
        </div>`;
      try { const q = qrcode(0, 'M'); q.addData(this.shareURL()); q.make(); $('qr').src = q.createDataURL(8, 2); } catch (e) { $('qr').hidden = true; }
    } else {
      box.innerHTML = `
        <section class="card">
          <div class="roomBar">
            <div class="roomCode"><small>房號</small>${esc(R.room)}</div>
            <div class="share"><button class="btn small ghost" id="shareBtn">🔗 傳連結給朋友</button><button class="btn small ghost" id="copyBtn">複製房號</button></div>
          </div>
          <p class="sub" style="text-align:left;margin-top:8px">在同一個空間或各自在家都可以：朋友打開連結，或在「連線一起玩」輸入房號。${tables ? `　📺 大螢幕 ${tables} 台` : ''}</p>
        </section>
        <section class="card"><h2>玩家（${seats.filter(p => p.online).length}/${MAX_PLAYERS}）</h2><div class="players" id="pls">${pls}</div>
          ${lead && seats.filter(p => p.online).length > 1 ? `<details style="margin-top:10px"><summary style="font-size:13px;color:var(--mute);font-weight:700;cursor:pointer">把 👑 房主交給別人</summary><div class="row" style="margin-top:8px">${seats.filter(p => p.online && p.id !== this.id).map(p => `<button class="btn small ghost" data-lead="${p.id}">${esc(p.name)}</button>`).join('')}</div></details>` : ''}
        </section>
        <section class="card">
          ${lead ? `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">選一個遊戲</h2>${modeSeg}</div><div class="games" id="games"></div>
             ${this.optHTML(def, R)}
             <button class="btn acc wide" id="startBtn" style="margin-top:14px">開始玩 ${def.icon} ${esc(def.name)} ▶</button>`
          : `<h2>${esc(`等 👑 ${leader ? leader.name : '房主'} 選遊戲`)}</h2>${gameInfo(def)}`}
        </section>
        ${this.boardHTML(R, false)}
        <div class="row" style="justify-content:space-between"><button class="btn small ghost" id="lvBtn">← 離開房間</button>${this.role === 'host' ? '<span class="sub" style="font-size:12px">你是開房的人：請讓這個畫面一直開著</span>' : ''}</div>`;
      const sb = $('shareBtn'), cb = $('copyBtn');
      sb.onclick = async () => {
        const url = this.shareURL();
        try { if (navigator.share) { await navigator.share({ title: '連線一起玩', text: `來玩！房號 ${R.room}`, url }); return; } } catch (e) { return; }
        try { await navigator.clipboard.writeText(url); this.toast('連結已複製'); } catch (e) { prompt('複製這個連結', url); }
      };
      cb.onclick = async () => { try { await navigator.clipboard.writeText(R.room); this.toast('房號已複製'); } catch (e) { this.toast('房號：' + R.room); } };
      box.querySelectorAll('[data-lead]').forEach(b => b.onclick = () => this.send({ k: 'lead', id: b.dataset.lead }));
      const me = this.me(), plsEl = $('pls');
      if (plsEl) plsEl.querySelectorAll('.pl.me').forEach(el => el.onclick = () => { if (me) { Sfx.play('say', me.animal); this.send({ k: 'say' }); } });
    }
    $('lvBtn').onclick = () => { if (this.role !== 'host' || confirm('關閉房間？大家都會離開。')) this.leave(); };
    const br = $('bdReset'); if (br) br.onclick = () => { if (confirm('排行榜歸零？')) this.send({ k: 'reset' }); };
    if (lead) {
      const gbox = $('games');
      LCATS.forEach(c => {
        const list = LGAMES.filter(g => lcatOf(g) === c.id); if (!list.length) return;
        const h = document.createElement('div'); h.className = 'gcat'; h.textContent = c.n; gbox.appendChild(h);
        list.forEach(g => addCard(g));
      });
      function addCard(g) {
        const b = document.createElement('button');
        b.className = 'gcard' + (g.id === R.pick ? ' on' : '');
        b.innerHTML = `<span class="ic">${g.icon}</span><span class="nm">${esc(g.name)}</span><span class="bl">${esc(g.blurb)}</span><span class="pp">${g.players[0]}–${g.players[1]} 人</span>`;
        b.onclick = () => { Sfx.play('pop'); App.send({ k: 'pick', id: g.id }); };
        gbox.appendChild(b);
      }
      $('modeSeg').querySelectorAll('button').forEach(b => b.onclick = () => this.send({ k: 'mode', kid: b.dataset.k === '1' }));
      const ob = $('opts');
      if (ob) ob.querySelectorAll('button[data-o]').forEach(b => b.onclick = () => {
        const o = optList(def, R.kid).find(x => x.k === b.dataset.o); if (!o) return;
        Sfx.play('tick'); this.send({ k: 'opt', g: def.id, o: o.k, v: o.o[+b.dataset.i][0] });
      });
      $('startBtn').onclick = () => { Sfx.play('go'); this.send({ k: 'start' }); };
    }
  },

  drawIntro(prev) {
    const R = this.R, def = LGAMES.find(g => g.id === R.game); if (!def) return;
    const playing = R.inGame.includes(this.id) && !this.table;
    if (!prev || prev.state !== 'intro') Sfx.play('go');
    else if (R.intro <= 3 && R.intro > 0) Sfx.play('tick');
    $('introBox').innerHTML = `<div class="big">${def.icon}</div><h2>${esc(def.name)}</h2>
      <div class="pp" style="color:var(--pri);font-weight:900">${R.kid ? '🧒 小朋友模式' : '🧑 大人模式'}${playing ? '' : '　·　這局你在旁邊看'}</div>
      ${this.optText(def, R).length ? `<div class="optChips">${this.optText(def, R).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <ul class="rules">${(def.rules(R.kid) || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="count">${R.intro}</div>
      ${this.isLeader() ? '<button class="btn acc" id="skipBtn">準備好了，開始！</button>' : ''}`;
    $('intro').hidden = false;
    const sk = $('skipBtn'); if (sk) sk.onclick = () => this.send({ k: 'skip' });
  },

  drawResult(prev) {
    const R = this.R, res = R.res; if (!res) return;
    if (!prev || prev.state !== 'result') { this.vib(80); }
    const name = id => { const p = this.player(id); return p ? p.name : '?'; };
    $('resultBox').innerHTML = `<div class="big">🏆</div><h2>${esc(res.title)}</h2>${res.sub ? `<p class="sub">${esc(res.sub)}</p>` : ''}
      <div class="res">${res.rows.map(r => `<div class="r ${r.rank === 1 && res.rows.length > 1 ? 'win' : ''}"><span class="rk">${r.rank}</span><img alt="" src="${avatar(this.player(r.id), 96)}"><div style="flex:1;min-width:0"><div class="nm">${esc(name(r.id))}${r.id === this.id ? '（你）' : ''}</div><div class="ln">${esc(r.line)}</div></div>${r.pts ? `<span class="rp">+${r.pts}</span>` : ''}</div>`).join('')}</div>
      ${this.isLeader() ? '<div class="row" style="justify-content:center"><button class="btn acc" id="againBtn">再玩一次</button><button class="btn ghost" id="toLobbyBtn">換遊戲</button></div>' : `<p class="wait">等 👑 ${esc(name(R.leader))} 決定下一步</p>`}`;
    $('result').hidden = false;
    const a = $('againBtn'), l = $('toLobbyBtn');
    if (a) a.onclick = () => this.send({ k: 'again' });
    if (l) l.onclick = () => this.send({ k: 'lobby' });
  },
  hideOv() { $('intro').hidden = true; $('result').hidden = true; },

  /* ---------- in game ---------- */
  ensureMount() {
    const R = this.R, def = LGAMES.find(g => g.id === R.game); if (!def) return;
    const key = R.game + '|' + R.inGame.join(',') + '|' + (R.inGame.includes(this.id) && !this.table);
    if (this.inst && this.instKey === key) return;
    this.unmount();
    this.show('game');
    const root = $('stage'); root.innerHTML = '';
    const me = this.table || !R.inGame.includes(this.id) ? null : this.id;
    const api = {
      me, isTable: this.table, spectator: !this.table && me === null, kid: R.kid,
      players: () => this.R.inGame.map(id => this.player(id)).filter(Boolean),
      player: id => this.player(id),
      send: d => this.send({ k: 'g', d }),
      sfx: (n, a) => Sfx.play(n, a),
      vibrate: ms => this.vib(ms),
      avatar: (p, size) => avatar(p, size),
      color: p => PARTY_COLORS[((p ? p.col : 0) % 6 + 6) % 6],
      toast: t => this.toast(t)
    };
    this.api = api;
    try { this.inst = def.client(root, api); } catch (e) { console.error(e); this.inst = null; }
    this.instKey = key; this.def = def;
    if (this.lastView !== null && this.inst) { try { this.inst.view(this.lastView); } catch (e) { console.error(e); } }
  },
  unmount() {
    if (this.inst && this.inst.destroy) { try { this.inst.destroy(); } catch (e) { console.error(e); } }
    this.inst = null; this.instKey = ''; this.lastView = null; this.def = null; this.menuOpen = false; $('menu').hidden = true;
    $('stage').innerHTML = '';
  },
  onGameView(v) {
    this.lastView = v;
    if (!this.inst) return;
    try { this.inst.view(v); } catch (e) { console.error(e); }
  },
  onFx(m) {
    if (m.kind === 'sfx') Sfx.play(m.a, m.b);
    else if (m.kind === 'toast') this.toast(m.a);
    else if (m.kind === 'join') Sfx.play('join');
    else if (m.kind === 'say') Sfx.play('say', m.a);
  },
  drawBar() {
    const R = this.R, def = R && LGAMES.find(g => g.id === R.game), me = this.me();
    $('barName').textContent = def ? `${def.icon} ${def.name}` : '';
    $('barMe').innerHTML = me && !this.table ? `<img alt="" src="${avatar(me, 64)}">${esc(me.name)}` : (this.table ? '📺 大螢幕' : '');
    $('barSound').textContent = Sfx.on ? '🔊' : '🔇';
  },
  drawMenu() {
    const m = $('menu');
    if (!this.menuOpen) { m.hidden = true; return; }
    const R = this.R;
    m.innerHTML = `<div style="font-size:12px;color:var(--mute);padding:4px 6px">房號 <b style="font-family:var(--round);letter-spacing:.15em;color:var(--ink)">${esc(R ? R.room : '')}</b></div>` +
      (this.isLeader() ? '<button id="mQuit">⏹ 結束這局，回大廳</button>' : '<div style="font-size:12px;color:var(--mute);padding:4px 6px">只有 👑 房主可以結束這局</div>') +
      '<button id="mLeave">🚪 離開房間</button>';
    m.hidden = false;
    const q = $('mQuit'); if (q) q.onclick = () => { this.menuOpen = false; this.drawMenu(); this.send({ k: 'quit' }); };
    $('mLeave').onclick = () => { if (confirm(this.role === 'host' ? '你是開房的人，離開的話房間會關掉。確定？' : '離開房間？')) this.leave(); };
  },

  show(which) {
    $('home').hidden = which !== 'home';
    $('lobby').hidden = which !== 'lobby';
    $('bar').hidden = which !== 'game';
    $('stage').hidden = which !== 'game';
    $('backHall').hidden = which !== 'home';
    if (which !== 'game') { $('menu').hidden = true; this.menuOpen = false; }
  },
  toast(t) {
    const el = $('toast'); el.textContent = t; el.hidden = false; el.style.opacity = 1;
    clearTimeout(this._tt); this._tt = setTimeout(() => { el.style.opacity = 0; setTimeout(() => { el.hidden = true; }, 260); }, 1800);
  },
  vib(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } },

  /* tests: let a game's bot make one move for this screen */
  botStep() {
    if (!this.def || !this.def.bot || !this.api || this.api.me == null || this.lastView == null) return;
    try { this.def.bot(this.lastView, this.api); } catch (e) { console.error(e); }
  }
};

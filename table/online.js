/* 棋牌桌遊 · 線上對戰（兩個人各用自己的手機／平板對下）
   傳輸沿用「連線一起玩」的房間轉送（/link/net.js → /api/link/room/CODE，worker/link.js）。
   開房的人是房主，由房主的網頁當裁判：客人送「我要走 X」，房主檢查合法、走完，再把整個局面發給雙方。
   ?net=local 時改用 BroadcastChannel，同一台電腦開兩個分頁就能測試。

   遊戲頁用法：
     const ONL = TB.online({
       game: 'gomoku', title: '五子棋',
       seatName(seat)            → '黑方'（seat 0／1）
       getState(forGuest)        → 可以 JSON 的局面（forGuest 時可以把祕密遮起來）
       setState(st, info)        → 換成這個局面並重畫（info.fresh = 有新的一步）
       newState(hostSeat, opts)  → 房主開新的一局（opts = 開房時選的規則）
       hostMove(seat, mv)        → 房主替 seat 走 mv；不合法回傳 false
       undoFor(seat)             → 房主退回到輪到 seat
       forceOver(winSeat, why)   → 房主直接結束（認輸、同意和局）；winSeat = -1 是和局
       overInfo()                → null 或 { winner: seat|-1, why }
       turnSeat()                → 現在輪到哪一個 seat（-1 = 結束）
       moveCount()               → 已經走了幾步
       review()                  → （可以不給）打開覆盤
       ruleHtml(opts)            → （可以不給）開房時的規則選項 HTML（用 TB.seg）
       readRule(dlg)             → （可以不給）讀出規則選項
       onChange()                → 連線狀態變了，請重畫（名字、按鈕）
     });
     ONL.active          是否在線上對局中
     ONL.mySeat          自己是 0／1；觀戰 = -1
     ONL.canMove()       現在可以走嗎（輪到自己、對手在線上……）
     ONL.move(mv)        自己走一步（房主直接走，客人送給房主）
     ONL.sync()          房主改了局面之後呼叫（廣播給大家）
     ONL.menu()          新局對話框選了「線上對戰」→ 開房間／加入房間
     ONL.request('undo') 請求悔棋；求和、認輸、離開在線上列的按鈕裡
     ONL.resume()        網頁一打開先呼叫：有沒結束的線上對局就接回去（回傳 true）
     ONL.names()         { 0: '小明', 1: '你' }
*/
(function () {
  'use strict';
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makeCode = n => Array.from({ length: n }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
  const LOCAL = new URLSearchParams(location.search).get('net') === 'local';
  const esc = s => TB.esc(s == null ? '' : s);

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector('script[data-ol="' + src + '"]')) return res();
      const s = document.createElement('script'); s.src = src; s.dataset.ol = src;
      s.onload = () => res(); s.onerror = () => rej(new Error('load ' + src));
      document.head.appendChild(s);
    });
  }
  const needNet = () => window.LinkNet ? Promise.resolve() : loadScript('../link/net.js');
  const needQR = () => window.qrcode ? Promise.resolve() : loadScript('../party/qrcode.js');

  function myId() {
    let id = TB.store.get('online:id', null);
    if (!id || !/^[A-Za-z0-9_-]{4,24}$/.test(id)) { id = 'p' + Math.random().toString(36).slice(2, 12); TB.store.set('online:id', id); }
    // 同一台電腦的兩個分頁測試時要不同的 id
    if (LOCAL) { try { let t = sessionStorage.getItem('tb-online-tab'); if (!t) { t = Math.random().toString(36).slice(2, 6); sessionStorage.setItem('tb-online-tab', t); } id = (id + t).slice(0, 24); } catch (e) { } }
    return id;
  }
  function defName() { return TB.store.get('online:name', '') || ''; }

  TB.online = function (P) {
    // 進行中的線上對局（房號、角色、局面）。?net=local 測試時每個分頁各存各的
    let tabTag = ''; if (LOCAL) { try { tabTag = sessionStorage.getItem('tb-online-tab') || ''; if (!tabTag) { tabTag = Math.random().toString(36).slice(2, 6); sessionStorage.setItem('tb-online-tab', tabTag); } } catch (e) { } }
    const KEY = 'online:' + P.game + (tabTag ? ':' + tabTag : '');
    const ONL = {
      active: false, role: null, room: null, mySeat: -1,
      hostSeat: 0, seq: 0, gid: '', names_: { h: '', g: '' }, guestId: null,
      conn: 'off', peer: false, opts: {}, waitingSince: 0,
    };
    let net = null, lastSeq = -1, overSeen = null, awayTimer = 0, sending = false, rec = null;

    // ---------- 線上列（工具列下面的一條） ----------
    const bar = document.createElement('div');
    bar.className = 'ol-bar'; bar.hidden = true;
    bar.innerHTML = '<span class="ol-txt"><span class="ol-dot"></span><span class="ol-t"></span></span><span class="tb-sp"></span>' +
      '<button class="ol-b" data-a="invite">邀請</button><button class="ol-b" data-a="draw">求和</button><button class="ol-b" data-a="resign">認輸</button><button class="ol-b" data-a="leave">離開</button>';
    const header = document.querySelector('.tb-bar');
    if (header) header.after(bar); else document.body.prepend(bar);
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; TB.sfx('click');
      const a = b.dataset.a;
      if (a === 'invite') showRoom();
      else if (a === 'draw') ONL.request('draw');
      else if (a === 'resign') confirmResign();
      else if (a === 'leave') confirmLeave();
    });
    if (!document.getElementById('ol-css')) {
      const st = document.createElement('style'); st.id = 'ol-css';
      st.textContent = `
.ol-bar{flex:none;display:flex;align-items:center;gap:6px;padding:5px 10px;background:#eef0ff;border-bottom:1px solid var(--line);font-size:14px;min-height:40px;position:relative;z-index:4}
.ol-bar[hidden]{display:none}
.ol-dot{width:10px;height:10px;border-radius:50%;background:#9ca3af;flex:none}
.ol-bar.ok .ol-dot{background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.2)}
.ol-bar.wait .ol-dot{background:#f59e0b;animation:olp 1s infinite alternate}
.ol-bar.bad .ol-dot{background:#f43f5e;animation:olp .6s infinite alternate}
.ol-txt{min-width:0;display:flex;align-items:center;gap:7px;color:var(--ink)}
.ol-t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ol-txt b{color:var(--accent-ink)}
.ol-b{appearance:none;border:0;background:#fff;border-radius:999px;padding:5px 11px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;min-height:32px;white-space:nowrap;box-shadow:0 1px 2px rgba(17,24,39,.08)}
.ol-b:hover{background:#e0e7ff}
.ol-b:disabled{opacity:.4;cursor:default}
@media (pointer:coarse){.ol-b{min-height:36px}}
@media (max-width:480px){.ol-bar{flex-wrap:wrap;padding:4px 8px;gap:4px}.ol-txt{flex:1 1 100%;font-size:13px}.ol-bar .tb-sp{display:none}.ol-b{flex:1;padding:5px 6px}}
.ol-room{text-align:center}
.ol-code{font-size:44px;font-weight:900;letter-spacing:.16em;color:var(--accent-ink);margin:4px 0;font-variant-numeric:tabular-nums}
.ol-qr{width:180px;height:180px;image-rendering:pixelated;border-radius:12px;background:#fff;padding:6px;box-shadow:var(--shadow)}
.ol-link{font-size:12px;color:var(--mute);word-break:break-all;margin:8px 0 0}
.ol-in{width:100%;font:inherit;font-size:18px;padding:10px 12px;border:2px solid var(--line);border-radius:12px;background:#fff;color:var(--ink)}
.ol-in:focus{outline:none;border-color:var(--accent)}
.ol-in.code{text-transform:uppercase;letter-spacing:.2em;font-weight:900;text-align:center;font-size:26px}
.ol-wait{display:flex;align-items:center;justify-content:center;gap:8px;color:var(--mute);margin-top:10px}
.ol-wait i{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:olp .8s infinite alternate}
@keyframes olp{from{opacity:.3}to{opacity:1}}`;
      document.head.appendChild(st);
    }

    // ---------- 狀態 ----------
    const myName = () => ONL.role === 'host' ? ONL.names_.h : ONL.names_.g;
    const oppName = () => (ONL.role === 'host' ? ONL.names_.g : ONL.names_.h) || '對手';
    // { seat: 名字 }，給遊戲頁顯示玩家卡
    ONL.names = function () {
      const o = {}; o[ONL.hostSeat] = ONL.names_.h || '房主'; o[ONL.hostSeat ^ 1] = ONL.names_.g || '等對手加入'; return o;
    };
    ONL.oppName = oppName;

    function persist() {
      if (!ONL.active) return;
      const r = { room: ONL.room, role: ONL.role, id: ONL.id, name: myName() };
      if (ONL.role === 'host') Object.assign(r, { hostSeat: ONL.hostSeat, guestId: ONL.guestId, names: ONL.names_, seq: ONL.seq, gid: ONL.gid, opts: ONL.opts, st: P.getState(false) });
      TB.store.set(KEY, r);
    }
    function paintBar() {
      bar.hidden = !ONL.active;
      if (!ONL.active) { P.onChange && P.onChange(); return; }
      let cls = 'wait', txt;
      const code = '房號 <b>' + esc(ONL.room) + '</b>';
      if (ONL.conn !== 'open') { cls = 'bad'; txt = code + '・連線中斷，重新連線中…'; }
      else if (ONL.mySeat < 0) { cls = 'ok'; txt = code + '・觀戰中'; }
      else if (ONL.role === 'host' && !ONL.guestId) txt = code + '・等對手加入…';
      else if (!ONL.peer) txt = code + '・' + esc(oppName()) + ' 暫時斷線，等他回來';
      else { cls = 'ok'; txt = code + '・對手 <b>' + esc(oppName()) + '</b>'; }
      bar.className = 'ol-bar ' + cls;
      bar.querySelector('.ol-t').innerHTML = txt;
      const playing = ONL.mySeat >= 0 && !P.overInfo();
      bar.querySelector('[data-a=draw]').disabled = !playing;
      bar.querySelector('[data-a=resign]').disabled = !playing;
      P.onChange && P.onChange();
    }
    ONL.canMove = function () {
      if (!ONL.active || ONL.mySeat < 0 || sending) return false;
      if (P.overInfo()) return false;
      if (P.turnSeat() !== ONL.mySeat) return false;
      if (ONL.role === 'guest') return ONL.conn === 'open' && ONL.peer;
      return !!ONL.guestId; // 房主：對手加入過就可以走（對手暫時斷線也可以，回來會收到局面）
    };
    ONL.why = function () { // canMove 為 false 時給玩家的說明
      if (ONL.mySeat < 0) return '你在觀戰';
      if (P.overInfo()) return '這局已經結束了';
      if (ONL.role === 'host' && !ONL.guestId) return '等對手加入房間';
      if (ONL.role === 'guest' && (ONL.conn !== 'open' || !ONL.peer)) return '房主暫時斷線，等他回來';
      if (P.turnSeat() !== ONL.mySeat) return '等 ' + oppName() + ' 走';
      return '';
    };

    // ---------- 傳送 ----------
    function sendAll(payload) { if (net) net.send({ all: payload }); }
    function sendTo(id, payload) { if (net) { const to = {}; to[id] = payload; net.send({ to }); } }
    function stateMsg(forGuest) {
      return { k: 'st', seq: ONL.seq, gid: ONL.gid, hs: ONL.hostSeat, names: ONL.names_, guestId: ONL.guestId, st: P.getState(!!forGuest) };
    }
    ONL.sync = function () {
      if (!ONL.active || ONL.role !== 'host') return;
      ONL.seq++;
      sendAll(stateMsg(true));
      persist(); observeOver(); paintBar();
    };

    // ---------- 結束：結果對話框、戰績 ----------
    function observeOver() {
      const o = P.overInfo();
      const key = ONL.gid + ':' + P.moveCount();
      if (!o) { overSeen = null; return; }
      if (overSeen === key) return;
      overSeen = key;
      const RES = 'online:res:' + P.game + (tabTag ? ':' + tabTag : ''), done = TB.store.get(RES, '');
      const first = done !== ONL.gid;
      if (first) TB.store.set(RES, ONL.gid);
      const me = ONL.mySeat;
      let title, snd;
      if (me < 0) { title = o.winner < 0 ? '和局' : P.seatName(o.winner) + '勝'; snd = 'draw'; }
      else if (o.winner < 0) { title = '和局'; snd = 'draw'; }
      else if (o.winner === me) { title = '你贏了！'; snd = 'win'; }
      else { title = esc(oppName()) + ' 贏了'; snd = 'lose'; }
      if (first && me >= 0) {
        TB.bump(P.game + '-online', 'played');
        if (o.winner === me) TB.bump(P.game + '-online', 'won');
        else if (o.winner < 0) TB.bump(P.game + '-online', 'draw');
      }
      setTimeout(() => {
        if (!ONL.active) return;
        TB.sfx(snd);
        const btns = [{ label: '看棋盤', value: 0 }];
        if (P.review) btns.push({ label: '覆盤', value: 2 });
        if (me >= 0) btns.push({ label: '再來一局', primary: true, value: 1 });
        TB.dialog({ title, html: '<p>' + esc(o.why || '') + '</p>' + (me >= 0 ? '<p style="font-size:13px">再來一局會交換先後手。</p>' : ''), buttons: btns })
          .then(v => { if (v === 1) ONL.request('rematch'); else if (v === 2) P.review(); });
      }, 500);
    }

    // ---------- 房主：處理客人的訊息 ----------
    function hostOn(m) {
      if (m.k === '_hello') { ONL.peer = !!(ONL.guestId && (m.ids || []).includes(ONL.guestId)); sendAll(stateMsg(true)); paintBar(); return; }
      if (m.k === '_join') { if (m.id === ONL.guestId) { ONL.peer = true; TB.toast(oppName() + ' 回來了'); } sendTo(m.id, stateMsg(true)); paintBar(); return; }
      if (m.k === '_leave') { if (m.id === ONL.guestId) { ONL.peer = false; TB.toast(oppName() + ' 斷線了'); } paintBar(); return; }
      if (m.k !== '_msg') return;
      const id = m.id, x = m.m || {};
      if (x.k === 'hi') {
        const nm = String(x.name || '').slice(0, 12) || '客人';
        if (!ONL.guestId || ONL.guestId === id) {
          const isNew = !ONL.guestId;
          ONL.guestId = id; ONL.names_.g = nm; ONL.peer = true;
          if (isNew) { TB.closeDialog(); TB.sfx('win'); TB.toast(nm + ' 加入了，開始吧！', 2400); }
          ONL.sync();
        } else sendTo(id, Object.assign(stateMsg(true), { watch: 1 }));
        return;
      }
      if (id !== ONL.guestId) return; // 觀戰的人不能動
      const gs = ONL.hostSeat ^ 1;
      if (x.k === 'mv') {
        if (P.overInfo() || P.turnSeat() !== gs || !P.hostMove(gs, x.mv)) { sendTo(id, stateMsg(true)); sendTo(id, { k: 'bad' }); return; }
        ONL.sync();
      } else if (x.k === 'req') askMe(x.what, gs);
      else if (x.k === 'ans') answered(x.what, !!x.ok, ONL.hostSeat);
      else if (x.k === 'resign') { if (!P.overInfo()) { P.forceOver(ONL.hostSeat, (ONL.names_.g || '客人') + ' 認輸'); ONL.sync(); } }
    }
    // ---------- 客人：處理房主的訊息 ----------
    function guestOn(m) {
      if (m.k === '_host') { ONL.peer = !!m.on; if (!m.on) TB.toast('房主暫時斷線了'); paintBar(); return; }
      if (m.k === 'st') {
        if (m.gid !== ONL.gid) { lastSeq = -1; overSeen = null; }
        if (m.seq < lastSeq && m.gid === ONL.gid) return;
        const fresh = m.seq !== lastSeq;
        lastSeq = m.seq; ONL.gid = m.gid; ONL.hostSeat = m.hs; ONL.names_ = m.names || ONL.names_;
        ONL.peer = true; sending = false;
        ONL.mySeat = m.watch || (m.guestId && m.guestId !== ONL.id) ? -1 : m.hs ^ 1;
        P.setState(m.st, { fresh });
        persist(); observeOver(); paintBar();
        return;
      }
      if (m.k === 'bad') { sending = false; TB.sfx('bad'); TB.toast('這步不行，已經同步成房主的棋盤'); paintBar(); return; }
      if (m.k === 'req') askMe(m.what, ONL.hostSeat);
      else if (m.k === 'ans') answered(m.what, !!m.ok, ONL.hostSeat ^ 1);
      else if (m.k === 'bye') { TB.dialog({ title: '房主離開了', html: '<p>' + esc(ONL.names_.h || '房主') + ' 關掉了這個房間。</p>', buttons: [{ label: '好', primary: true }] }); stop(true); P.onLeave && P.onLeave(); }
    }

    // ---------- 請求（悔棋、求和、再來一局）----------
    const WHAT = { undo: '悔棋', draw: '和局', rematch: '再來一局' };
    ONL.request = function (what) {
      if (!ONL.active || ONL.mySeat < 0) return;
      if (what === 'rematch' && ONL.role === 'host') { perform('rematch', ONL.hostSeat); return; }
      if (what === 'undo' && !P.moveCount()) return;
      if (!ONL.peer || (ONL.role === 'host' && !ONL.guestId)) { TB.toast(oppName() + ' 不在線上'); return; }
      if (ONL.role === 'host') sendTo(ONL.guestId, { k: 'req', what }); else net.send({ k: 'req', what });
      TB.toast(what === 'rematch' ? '已經跟房主說要再來一局' : '已經問 ' + oppName() + ' 要不要' + WHAT[what] + '，等他回答', 2200);
    };
    function askMe(what, fromSeat) {
      if (!WHAT[what]) return;
      if (what === 'rematch') { if (ONL.role === 'host') perform('rematch', fromSeat); return; }
      const who = esc(oppName());
      TB.sfx('select');
      TB.dialog({ title: what === 'undo' ? '對方想悔棋' : '對方提議和局', html: '<p>' + who + (what === 'undo' ? ' 想退回上一步，同意嗎？' : ' 想這局算和局，同意嗎？') + '</p>', dismiss: false,
        buttons: [{ label: '不同意', value: 0 }, { label: '同意', primary: true, value: 1 }] }).then(v => {
        const ok = v === 1;
        if (ONL.role === 'host') { if (ok) perform(what, fromSeat); sendTo(ONL.guestId, { k: 'ans', what, ok }); }
        else net.send({ k: 'ans', what, ok });
      });
    }
    function answered(what, ok, requesterSeat) {
      // 房主收到客人的回答：同意就執行（請求的人是房主）；客人收到回答只顯示結果
      if (ONL.role === 'host' && ok) perform(what, requesterSeat);
      TB.toast(esc(oppName()) + (ok ? ' 同意' : ' 不同意') + WHAT[what], 2000);
    }
    function perform(what, seat) {
      if (ONL.role !== 'host') return;
      if (what === 'undo') { if (P.overInfo() || !P.moveCount()) return; P.undoFor(seat); }
      else if (what === 'draw') { if (P.overInfo()) return; P.forceOver(-1, '雙方同意和局'); }
      else if (what === 'rematch') {
        ONL.hostSeat ^= 1; ONL.mySeat = ONL.hostSeat; ONL.gid = makeCode(6); overSeen = null;
        TB.closeDialog(); P.newState(ONL.hostSeat, ONL.opts); TB.toast('新的一局，交換先後手');
      }
      ONL.sync();
    }
    function confirmResign() {
      if (!ONL.active || ONL.mySeat < 0 || P.overInfo()) return;
      TB.dialog({ title: '認輸？', html: '<p>這局就算 ' + esc(oppName()) + ' 贏。</p>', buttons: [{ label: '取消', value: 0 }, { label: '認輸', primary: true, value: 1 }] }).then(v => {
        if (v !== 1) return;
        if (ONL.role === 'host') { P.forceOver(ONL.hostSeat ^ 1, (ONL.names_.h || '房主') + ' 認輸'); ONL.sync(); }
        else net.send({ k: 'resign' });
      });
    }
    function confirmLeave() {
      TB.dialog({ title: '離開房間？', html: '<p>' + (ONL.role === 'host' ? '房間會關掉，' + esc(oppName()) + ' 也會離開。' : '之後可以用房號再加入。') + '</p>',
        buttons: [{ label: '取消', value: 0 }, { label: '離開', primary: true, value: 1 }] }).then(v => { if (v === 1) ONL.leave(); });
    }
    ONL.leave = function () {
      if (ONL.role === 'host' && net) sendAll({ k: 'bye' });
      setTimeout(() => { stop(true); P.onLeave && P.onLeave(); }, 120);
    };
    function stop(forget) {
      clearTimeout(awayTimer);
      try { net && net.close(); } catch (e) { }
      net = null; ONL.active = false; ONL.conn = 'off'; ONL.peer = false; sending = false;
      if (forget) TB.store.del(KEY);
      paintBar();
    }

    // ---------- 自己走一步 ----------
    ONL.move = function (mv) {
      if (!ONL.canMove()) { const w = ONL.why(); if (w) TB.toast(w); return false; }
      if (ONL.role === 'host') { if (!P.hostMove(ONL.hostSeat, mv)) return false; ONL.sync(); return true; }
      sending = true; net.send({ k: 'mv', mv }); paintBar();
      setTimeout(() => { if (sending) { sending = false; paintBar(); } }, 6000);
      return true;
    };

    // ---------- 連線 ----------
    async function connect() {
      await needNet();
      ONL.conn = 'connecting'; paintBar();
      net = LinkNet.open({
        room: ONL.room, role: ONL.role, id: ONL.id,
        on: m => (ONL.role === 'host' ? hostOn(m) : guestOn(m)),
        status: (s, info) => {
          ONL.conn = s === 'open' ? 'open' : s;
          if (s === 'open' && ONL.role === 'guest') { ONL.peer = true; net.send({ k: 'hi', name: myName() }); }
          if (s === 'refused') {
            const code = info && info.code;
            if (ONL.role === 'guest' && code === 'away') { ONL.peer = false; clearTimeout(awayTimer); awayTimer = setTimeout(() => { if (ONL.active) connect(); }, 3000); }
            else if (ONL.role === 'host' && code === 'busy' && !rec) { ONL.room = makeCode(5); persist(); connect(); return; }
            else {
              const msg = (info && info.msg) || '連不上房間。';
              stop(true); P.onLeave && P.onLeave();
              TB.dialog({ title: '連不上', html: '<p>' + esc(msg) + '</p>', buttons: [{ label: '好', primary: true }] });
              return;
            }
          }
          paintBar();
        }
      });
    }

    // ---------- 開房間／加入 ----------
    function inviteURL() {
      const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('room', ONL.room);
      if (LOCAL) u.searchParams.set('net', 'local');
      return u.toString();
    }
    function showRoom() {
      const url = inviteURL();
      const waiting = ONL.role === 'host' && !ONL.guestId;
      TB.dialog({ title: waiting ? '房間開好了' : '邀請', html:
        '<div class="ol-room"><p>請對手打開「棋牌桌遊 → ' + esc(P.title) + ' → 新局 → 線上對戰 → 加入房間」，輸入房號：</p>' +
        '<div class="ol-code">' + esc(ONL.room) + '</div><img class="ol-qr" id="olQR" alt="加入房間的 QR code" hidden>' +
        '<p class="ol-link">或用手機掃 QR code／傳這個連結：<br>' + esc(url) + '</p>' +
        (waiting ? '<div class="ol-wait"><i></i>等對手加入…</div>' : '') + '</div>',
        buttons: [{ label: '複製連結', value: 'copy', onClick: () => { try { navigator.clipboard.writeText(url).then(() => TB.toast('已複製連結')); } catch (e) { TB.toast(url); } return false; } },
          { label: waiting ? '先看棋盤' : '關閉', primary: true, value: 0 }] });
      needQR().then(() => {
        const img = document.getElementById('olQR'); if (!img) return;
        try { const q = qrcode(0, 'M'); q.addData(url); q.make(); img.src = q.createDataURL(5, 2); img.hidden = false; } catch (e) { }
      }).catch(() => { });
    }
    function nameField() {
      return '<div class="tb-field"><label>你的暱稱（對手會看到）</label><input class="ol-in" id="olName" maxlength="12" value="' + esc(defName()) + '" placeholder="例如：小明"></div>';
    }
    function readName(d) {
      const v = (d.querySelector('#olName').value || '').trim().slice(0, 12);
      if (!v) { TB.toast('請先輸入暱稱'); return null; }
      TB.store.set('online:name', v); return v;
    }
    ONL.menu = function () {
      return TB.dialog({ title: '線上對戰', html:
        '<p>兩個人用各自的手機或平板，連上網路就能對下。一個人開房間，另一個人輸入房號加入。</p>' + nameField(),
        buttons: [{ label: '取消', value: null }, { label: '加入房間', value: 'join', onClick: d => { const n = readName(d); if (!n) return false; ONL._name = n; } },
          { label: '開房間', primary: true, value: 'host', onClick: d => { const n = readName(d); if (!n) return false; ONL._name = n; } }] })
        .then(v => { if (v === 'host') hostDialog(); else if (v === 'join') joinDialog(); return v; });
    };
    function hostDialog() {
      TB.dialog({ title: '開房間', html: (P.ruleHtml ? P.ruleHtml() : '') +
        TB.seg('我執', 'seat', [['0', P.seatName(0) + (P.firstNote ? P.firstNote(0) : '')], ['1', P.seatName(1)], ['r', '隨機']], '0'),
        buttons: [{ label: '取消', value: null }, { label: '開房間', primary: true, value: 'go', onClick: d => {
          ONL._opts = P.readRule ? P.readRule(d) : {};
          const s = TB.segVal(d, 'seat'); ONL._seat = s === 'r' ? (Math.random() < .5 ? 0 : 1) : +s;
        } }] }).then(v => { if (v === 'go') startHost(ONL._seat, ONL._opts || {}); });
    }
    function startHost(seat, opts) {
      if (ONL.active) stop(true);
      Object.assign(ONL, { active: true, role: 'host', room: makeCode(5), id: myId(), mySeat: seat, hostSeat: seat, seq: 0, gid: makeCode(6), guestId: null, peer: false, opts });
      ONL.names_ = { h: ONL._name || defName() || '房主', g: '' };
      overSeen = null; rec = null;
      P.newState(seat, opts);
      persist(); paintBar(); connect(); showRoom();
    }
    function joinDialog(code) {
      TB.dialog({ title: '加入房間', html: '<div class="tb-field"><label>房號（5 個字）</label><input class="ol-in code" id="olCode" maxlength="5" autocomplete="off" autocapitalize="characters" value="' + esc(code || '') + '"></div>',
        buttons: [{ label: '取消', value: null }, { label: '加入', primary: true, value: 'go', onClick: d => {
          const c = (d.querySelector('#olCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (c.length !== 5) { TB.toast('房號是 5 個字'); return false; }
          ONL._code = c;
        } }] }).then(v => { if (v === 'go') startGuest(ONL._code); });
      setTimeout(() => { const i = document.getElementById('olCode'); if (i) i.focus(); }, 60);
    }
    function startGuest(code) {
      if (ONL.active) stop(true);
      Object.assign(ONL, { active: true, role: 'guest', room: code, id: myId(), mySeat: -1, seq: 0, gid: '', guestId: null, peer: false });
      ONL.names_ = { h: '', g: ONL._name || defName() || '客人' };
      lastSeq = -1; overSeen = null; sending = false;
      persist(); paintBar(); connect();
      TB.toast('連線到房間 ' + code + '…');
    }

    // ---------- 網頁一打開：接回沒結束的線上對局，或從邀請連結加入 ----------
    ONL.resume = function () {
      const q = new URLSearchParams(location.search), room = (q.get('room') || '').toUpperCase();
      if (/^[A-Z0-9]{5}$/.test(room)) {
        try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u.toString()); } catch (e) { }
        const r = TB.store.get(KEY, null);
        if (r && r.room === room) return resumeRec(r);
        // 邀請連結：問暱稱就加入
        setTimeout(() => {
          TB.dialog({ title: '加入 ' + esc(P.title) + ' 線上對戰', html: '<p>房號 <b>' + esc(room) + '</b></p>' + nameField(),
            buttons: [{ label: '取消', value: null }, { label: '加入', primary: true, value: 'go', onClick: d => { const n = readName(d); if (!n) return false; ONL._name = n; } }] })
            .then(v => { if (v === 'go') startGuest(room); else P.onLeave && P.onLeave(); });
        }, 50);
        return true;
      }
      const r = TB.store.get(KEY, null);
      if (r && r.room && r.role) return resumeRec(r);
      return false;
    };
    function resumeRec(r) {
      rec = r;
      if (r.role === 'host') {
        if (!r.st) { TB.store.del(KEY); return false; }
        Object.assign(ONL, { active: true, role: 'host', room: r.room, id: r.id || myId(), hostSeat: r.hostSeat | 0, mySeat: r.hostSeat | 0, guestId: r.guestId || null, seq: r.seq | 0, gid: r.gid || makeCode(6), opts: r.opts || {}, peer: false });
        ONL.names_ = r.names || { h: r.name || '房主', g: '' };
        P.setState(r.st, { fresh: false, resume: true });
        overSeen = P.overInfo() ? ONL.gid + ':' + P.moveCount() : null;
      } else {
        Object.assign(ONL, { active: true, role: 'guest', room: r.room, id: r.id || myId(), mySeat: -1, peer: false });
        ONL.names_ = { h: '', g: r.name || defName() || '客人' };
        lastSeq = -1; overSeen = null;
      }
      paintBar(); connect();
      TB.toast('接回線上對局（房號 ' + r.room + '）');
      return true;
    }
    return ONL;
  };
})();

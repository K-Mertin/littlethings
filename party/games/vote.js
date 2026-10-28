'use strict';
/* 大家來投票 — a fun question pops up ("你比較喜歡？ 🍦 還是 🍰") and everybody secretly picks on their phone.
   Then the votes are revealed: every critter hops onto the answer it chose.
   小朋友: always 「👥 跟大家一樣」 — pick what you think most people pick, everyone in the biggest group gets a star.
   大人:   rounds switch between 👥 跟大家一樣 (+100) and 🦄 跟別人不一樣 (the smallest group that someone chose gets +150;
           if everyone chose the same, nobody scores). The last round counts double.
   With fewer than 4 players a few audience animals vote too (they don't score), so a majority still means something. */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#f43f5e', OPT_COLS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fab005'];
  const Q_ALL = [
    ['你比較喜歡哪個？', [['🍦', '冰淇淋'], ['🍰', '蛋糕']]],
    ['想變成哪種動物？', [['🦁', '獅子'], ['🐬', '海豚'], ['🦅', '老鷹'], ['🐼', '熊貓']]],
    ['下雨天最想做什麼？', [['📺', '看卡通'], ['🧱', '玩積木'], ['☔', '出去踩水'], ['😴', '睡覺']]],
    ['最想要哪個超能力？', [['🕊️', '會飛'], ['👻', '隱形'], ['⚡', '跑超快'], ['🌀', '瞬間移動']]],
    ['去公園最先玩什麼？', [['🛝', '溜滑梯'], ['🎠', '盪鞦韆'], ['⚽', '踢球']]],
    ['早餐想吃什麼？', [['🥞', '鬆餅'], ['🍙', '飯糰'], ['🥪', '三明治'], ['🥣', '麥片']]],
    ['哪個顏色最好看？', [['🔴', '紅色'], ['🔵', '藍色'], ['🟢', '綠色'], ['🟡', '黃色']]],
    ['生日禮物想要？', [['🧸', '玩偶'], ['🚗', '玩具車'], ['📚', '故事書'], ['🎨', '畫畫組']]],
    ['夏天去哪裡玩？', [['🏖️', '海邊'], ['⛰️', '山上'], ['🎢', '遊樂園']]],
    ['哪個水果最好吃？', [['🍓', '草莓'], ['🍌', '香蕉'], ['🍉', '西瓜'], ['🍇', '葡萄']]],
    ['寵物想養什麼？', [['🐶', '小狗'], ['🐱', '貓咪'], ['🐰', '兔子'], ['🐠', '小魚']]],
    ['坐什麼去旅行？', [['✈️', '飛機'], ['🚄', '高鐵'], ['🚢', '大船'], ['🚲', '腳踏車']]],
    ['晚上睡覺要抱什麼？', [['🧸', '娃娃'], ['🛏️', '枕頭'], ['🙅', '什麼都不抱']]],
    ['最喜歡哪個季節？', [['🌸', '春天'], ['☀️', '夏天'], ['🍁', '秋天'], ['⛄', '冬天']]],
    ['想住在哪裡？', [['🏰', '城堡'], ['🌳', '樹屋'], ['🚀', '太空站'], ['🌊', '海底']]],
    ['點心時間吃？', [['🍪', '餅乾'], ['🍫', '巧克力'], ['🍿', '爆米花']]],
    ['最想去哪個星球？', [['🌙', '月亮'], ['🔴', '火星'], ['🪐', '土星']]],
    ['長大想做什麼？', [['👩‍🚀', '太空人'], ['👨‍🍳', '廚師'], ['👩‍⚕️', '醫生'], ['🎤', '歌手']]],
    ['哪個恐龍最酷？', [['🦖', '暴龍'], ['🦕', '長脖子龍'], ['🦴', '三角龍']]],
    ['冰淇淋要什麼口味？', [['🍫', '巧克力'], ['🍓', '草莓'], ['🍦', '香草'], ['🍵', '抹茶']]]
  ];
  const Q_ADULT = [
    ['週末最想做什麼？', [['🛋️', '在家耍廢'], ['🏕️', '出去走走'], ['🍜', '吃美食'], ['🎮', '打電動']]],
    ['早上需要什麼才醒得來？', [['☕', '咖啡'], ['🍵', '茶'], ['🚿', '洗個澡'], ['⏰', '三個鬧鐘']]],
    ['宵夜首選？', [['🍗', '鹹酥雞'], ['🍜', '泡麵'], ['🍢', '滷味'], ['🙅', '不吃宵夜']]],
    ['手機最常用來？', [['💬', '聊天'], ['📺', '看影片'], ['📷', '拍照'], ['🛒', '購物']]],
    ['中了樂透第一件事？', [['🏠', '買房'], ['✈️', '環遊世界'], ['🤫', '先不說'], ['🏢', '辭職']]],
    ['火鍋湯底選？', [['🌶️', '麻辣'], ['🐟', '昆布'], ['🍅', '番茄'], ['🥛', '牛奶']]],
    ['最怕哪個？', [['🪳', '蟑螂'], ['👻', '鬼'], ['🦷', '看牙醫'], ['📞', '老闆電話']]],
    ['理想的假期？', [['🏝️', '海島放空'], ['🏙️', '城市逛街'], ['🏔️', '登山健行'], ['🛏️', '睡到自然醒']]],
    ['珍珠奶茶的甜度？', [['🍬', '全糖'], ['🌗', '半糖'], ['🌙', '微糖'], ['💧', '無糖']]],
    ['超商最常買？', [['🍙', '飯糰'], ['🥤', '飲料'], ['🍢', '關東煮'], ['🍦', '霜淇淋']]]
  ];
  const AUD = [{ n: '小雞', col: 2, animal: 2 }, { n: '小鴨', col: 1, animal: 5 }, { n: '小羊', col: 5, animal: 4 }];

  class Vote {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.t = 0; this.over = false; this.dur = null; this.teams = !!ctx.teams; this.edge = '#3b1450';
      this.es = ctx.players.map((p, i) => ({ p, score: 0, same: 0, diff: 0, pick: null, x: 0, y: 0, tx: 0, ty: 0, hop: 0, vy: 0, add: 0 }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      this.aud = AUD.slice(0, Math.max(0, 4 - this.es.length)).map((a, i) => ({ p: { name: a.n, col: a.col, animal: a.animal, uid: -10 - i, team: 0 }, aud: true, pick: null, x: 0, y: 0, tx: 0, ty: 0, hop: 0, vy: 0 }));
      this.rounds = this.kid ? 8 : 10; this.ri = -1;
      const bank = (this.kid ? Q_ALL : Q_ALL.concat(Q_ADULT, Q_ADULT)).slice();
      for (let i = bank.length - 1; i > 0; i--) { const j = rint(i + 1); [bank[i], bank[j]] = [bank[j], bank[i]]; }
      const seen = new Set(); this.qs = bank.filter(q => !seen.has(q[0]) && seen.add(q[0])).slice(0, this.rounds);
      this.lights = []; for (let i = 0; i < 7; i++) this.lights.push({ x: 140 + i * 220, ph: rnd(0, TAU) });
      this.seed = rint(1e6);
      this.all().forEach((e, i) => { e.x = e.tx = this.homeX(i); e.y = e.ty = 810; });
      this.nextRound();
    }
    all() { return this.es.concat(this.aud); }
    homeX(i) { const n = this.all().length; return 800 - (n - 1) * 115 + i * 230; }
    nextRound() {
      this.ri++;
      if (this.ri >= this.rounds) { this.over = true; return; }
      const q = this.qs[this.ri]; this.q = { text: q[0], opts: q[1] };
      this.mode = this.kid ? 'same' : (this.ri % 3 === 2 ? 'diff' : 'same');
      this.double = !this.kid && this.ri === this.rounds - 1;
      this.phase = 'show'; this.pt = 1.4; this.limit = this.kid ? 12 : 9;
      this.all().forEach((e, i) => { e.pick = null; e.add = 0; e.tx = this.homeX(i); e.ty = 810; });
      this.ctx.sfx('pop');
    }
    optX(k) { const n = this.q.opts.length, w = Math.min(330, 1320 / n); return 800 - (n - 1) * w / 2 + k * w; }
    optW() { return Math.min(310, 1320 / this.q.opts.length - 20); }
    onChoose(p, id) {
      const e = this.by.get(p); if (!e || this.phase !== 'vote' || !/^v\d$/.test(id)) return;
      const k = +id[1]; if (k >= this.q.opts.length) return;
      if (e.pick === null) { e.hop = 1; e.vy = 380; this.ctx.sfx('pop'); }
      e.pick = k;
    }
    update(dt) {
      const ctx = this.ctx; this.t += dt;
      for (const e of this.all()) {
        e.x += (e.tx - e.x) * Math.min(1, dt * 7); e.y += (e.ty - e.y) * Math.min(1, dt * 7);
        if (e.hop > 0 || e.vy) { e.vy -= 1700 * dt; e.hop = Math.max(0, e.hop + e.vy * dt); if (e.hop <= 0) e.vy = 0; }
      }
      this.pt -= dt;
      if (this.phase === 'show') { if (this.pt <= 0) { this.phase = 'vote'; this.pt = this.limit; ctx.sfx('go'); for (const a of this.aud) a.at = rnd(1, this.limit * 0.6); } return; }
      if (this.phase === 'vote') {
        for (const a of this.aud) if (a.pick === null && this.limit - this.pt > a.at) { a.pick = this.audPick(); a.hop = 1; a.vy = 380; }
        const live = this.es.filter(e => e.p.online || e.p.local);
        if (this.pt <= 3.5 && this.pt + dt > 3.5) ctx.sfx('tick');
        if (this.pt <= 0 || (live.length && live.every(e => e.pick !== null) && this.aud.every(a => a.pick !== null))) this.reveal();
        return;
      }
      if (this.phase === 'reveal') { if (this.pt <= 0) this.nextRound(); }
    }
    /* audience animals lean toward the first two answers a bit, so there's usually a clear majority */
    audPick() { const n = this.q.opts.length, w = this.q.opts.map((_, k) => k === (this.ri + this.seed) % n ? 3 : k === (this.ri + this.seed + 1) % n ? 2 : 1), s = w.reduce((a, b) => a + b, 0); let r = rnd(0, s); for (let k = 0; k < n; k++) { r -= w[k]; if (r <= 0) return k; } return 0; }
    reveal() {
      const ctx = this.ctx, n = this.q.opts.length, cnt = new Array(n).fill(0);
      const voters = this.all().filter(e => e.pick !== null);
      for (const e of voters) cnt[e.pick]++;
      this.cnt = cnt; this.phase = 'reveal'; this.pt = 4.2;
      const used = cnt.filter(c => c > 0), max = Math.max(0, ...cnt), min = used.length ? Math.min(...used) : 0;
      let win = [];
      if (this.mode === 'same') win = cnt.map((c, k) => c === max && c > 0 ? k : -1).filter(k => k >= 0);
      else if (used.length > 1) win = cnt.map((c, k) => c === min ? k : -1).filter(k => k >= 0);
      this.win = win;
      // everyone hops onto the answer they chose
      const slots = cnt.map(() => 0);
      this.all().forEach((e, i) => {
        if (e.pick === null) { e.tx = this.homeX(i); e.ty = 820; return; }
        const k = e.pick, j = slots[k]++, per = Math.max(1, Math.floor(this.optW() / 72));
        e.tx = this.optX(k) - (Math.min(per, cnt[k]) - 1) * 36 + (j % per) * 72; e.ty = 690 + Math.floor(j / per) * 64; e.hop = 1; e.vy = 520;
      });
      const pts = this.kid ? 1 : (this.mode === 'same' ? 100 : 150) * (this.double ? 2 : 1);
      for (const e of this.es) {
        if (e.pick !== null && win.includes(e.pick)) { e.score += pts; e.add = pts; if (this.mode === 'same') e.same++; else e.diff++; }
      }
      if (win.length) { ctx.sfx('star'); for (const k of win) Fx.burst(this.optX(k), 470, OPT_COLS[k], 18, 320); }
      else { ctx.sfx('end'); Fx.pop(800, 560, this.mode === 'diff' ? '大家都選一樣，沒人得分！' : '沒有人投票…', '#fff', 46); }
      for (const e of this.es) if (e.add) { ctx.buzz(e.p, 60); }
    }

    /* ---------------- drawing ---------------- */
    draw(g, clock) {
      const at = clock || this.t, q = this.q;
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3b1450'); bg.addColorStop(1, '#7a1f5c'); g.fillStyle = bg; g.fillRect(-400, 0, W + 800, H);
      for (const L of this.lights) {   // sweeping stage lights
        const a = Math.sin(at * 0.8 + L.ph) * 0.35, gr = g.createLinearGradient(L.x, 0, L.x, 700);
        gr.addColorStop(0, 'rgba(255,220,240,.22)'); gr.addColorStop(1, 'rgba(255,220,240,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(L.x - 14, 0); g.lineTo(L.x + 14, 0); g.lineTo(L.x + Math.sin(a) * 600 + 130, 700); g.lineTo(L.x + Math.sin(a) * 600 - 130, 700); g.fill();
      }
      // floor with dots
      g.fillStyle = '#2a0f3a'; g.fillRect(-400, 720, W + 800, 180);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let x = -380; x < W + 400; x += 60) for (let y = 740; y < H; y += 40) { g.beginPath(); g.arc(x + (y % 80 ? 30 : 0), y, 4, 0, TAU); g.fill(); }
      if (!q) return;
      // question card
      const showK = this.phase === 'show' ? 1 - Math.max(0, this.pt - 1.0) / 0.4 : 1;
      g.save(); g.translate(800, 214); g.scale(0.85 + 0.15 * showK, 0.85 + 0.15 * showK); g.globalAlpha = showK;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(-560, -64 + 8, 1120, 132, 36); g.fill();
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(-560, -64, 1120, 132, 36); g.fill();
      g.fillStyle = '#2b2340'; g.font = '900 54px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(q.text, 0, -4, 1060);
      g.restore(); g.globalAlpha = 1;
      // the rule for this round
      const same = this.mode === 'same', tag = (same ? '👥 跟大家一樣' : '🦄 跟別人不一樣') + (this.double ? '・分數 ×2' : '');
      g.font = '900 28px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; const tw = g.measureText(tag).width + 44;
      g.fillStyle = same ? '#22c26a' : '#9b5cff'; g.beginPath(); g.roundRect(800 - tw / 2, 292, tw, 48, 24); g.fill();
      g.fillStyle = '#fff'; g.fillText(tag, 800, 317);
      g.font = '700 22px ' + FONT; g.fillStyle = '#f3d9ff'; g.fillText('第 ' + (this.ri + 1) + ' / ' + this.rounds + ' 題', 800, 140);
      // answer tiles
      const n = q.opts.length, ow = this.optW(), rev = this.phase === 'reveal';
      const tot = rev ? Math.max(1, this.cnt.reduce((a, b) => a + b, 0)) : 1;
      for (let k = 0; k < n; k++) {
        const x = this.optX(k), y = 404, h = 200, win = rev && this.win.includes(k), dim = rev && !win;
        g.globalAlpha = dim ? 0.55 : 1;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(x - ow / 2, y + 8, ow, h, 28); g.fill();
        g.fillStyle = OPT_COLS[k]; g.beginPath(); g.roundRect(x - ow / 2, y, ow, h, 28); g.fill();
        g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(x - ow / 2 + 8, y + 8, ow - 16, 26, 13); g.fill();
        if (rev) {   // vote bar fills the tile from the bottom
          const k2 = Math.min(1, (4.2 - this.pt) / 0.8), fh = (h - 20) * this.cnt[k] / tot * k2;
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.roundRect(x - ow / 2 + 10, y + h - 10 - fh, ow - 20, fh, 18); g.fill();
        }
        g.font = '74px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(q.opts[k][0], x, y + 78);
        g.font = '900 34px ' + FONT; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeText(q.opts[k][1], x, y + 156, ow - 20); g.fillText(q.opts[k][1], x, y + 156, ow - 20);
        if (rev) {
          g.font = '900 40px ' + RFONT; g.fillStyle = '#fff'; g.strokeStyle = '#2b2340'; g.lineWidth = 8; g.strokeText(this.cnt[k] + ' 票', x, y - 26); g.fillText(this.cnt[k] + ' 票', x, y - 26);
          if (win) { g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.beginPath(); g.roundRect(x - ow / 2 - 6, y - 6, ow + 12, h + 12, 32); g.stroke(); g.font = '46px system-ui'; g.fillText('👑', x + ow / 2 - 20, y - 6); }
        }
        g.globalAlpha = 1;
      }
      // timer bar
      if (this.phase === 'vote') {
        const k = Math.max(0, this.pt / this.limit);
        g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(500, 624, 600, 14, 7); g.fill();
        g.fillStyle = this.pt < 3.5 ? '#ff3b4a' : '#ffd23f'; g.beginPath(); g.roundRect(500, 624, 600 * k, 14, 7); g.fill();
        g.font = '700 24px ' + FONT; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('📱 在手機上選！' + (this.pt < 3.5 ? '快一點！' : ''), 800, 664);
      }
      // the voters
      const list = this.all().slice().sort((a, b) => a.y - b.y);
      for (const e of list) {
        const voted = e.pick !== null, won = rev && voted && this.win.includes(e.pick) && !e.aud;
        drawCritter(g, e.x, e.y, e.aud ? 26 : 34, e.p.col, e.p.animal, { hop: e.hop, happy: won || (this.phase === 'vote' && voted), face: Math.PI / 2, blink: (at + (e.p.uid || 0)) % 3.3 < 0.12, alpha: e.aud ? 0.85 : 1 });
        if (!e.aud) drawTag(g, e.x, e.y + 54, e.p);
        else { g.font = '700 18px ' + FONT; g.fillStyle = '#f3d9ff'; g.textAlign = 'center'; g.fillText(e.p.name + '（觀眾）', e.x, e.y + 46); }
        if (this.phase === 'vote' && voted) { g.font = '900 22px ' + FONT; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(e.x - 44, e.y - 84 - e.hop, 88, 34, 17); g.fill(); g.fillStyle = '#16a34a'; g.textAlign = 'center'; g.fillText('✔ 選好了', e.x, e.y - 66 - e.hop); }
        if (rev && e.add) { const k = Math.min(1, (4.2 - this.pt) / 0.6); g.globalAlpha = k; g.font = '900 32px ' + RFONT; g.fillStyle = '#ffd23f'; g.strokeStyle = '#2b2340'; g.lineWidth = 6; const s = this.kid ? '+⭐' : '+' + e.add; g.strokeText(s, e.x, e.y - 70 - k * 20); g.fillText(s, e.x, e.y - 70 - k * 20); g.globalAlpha = 1; }
      }
    }
    center() { return this.phase === 'vote' ? '還有 ' + Math.ceil(this.pt) + ' 秒・' + this.es.filter(e => e.pick !== null).length + ' / ' + this.es.length + ' 人選好了' : ''; }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0) + (this.kid ? '⭐' : ''); }
    chip(p) { const e = this.by.get(p); return this.kid ? '⭐ ' + e.score : e.score + ' 分'; }
    pad(p) { const e = this.by.get(p); return (this.kid ? '⭐ ' : '') + e.score + (this.kid ? '' : ' 分') + '・第 ' + (this.ri + 1) + ' 題'; }
    ready() { return this.phase === 'vote'; }
    padLayout(p) {
      const e = this.by.get(p), q = this.q; if (!q) return null;
      const rev = this.phase === 'reveal', same = this.mode === 'same';
      const options = q.opts.map((o, k) => ({ id: 'v' + k, icon: o[0], label: o[1], col: OPT_COLS[k], state: rev ? (this.win.includes(k) ? 'right' : e.pick === k ? 'wrong' : '') : e.pick === k ? 'chosen' : '' }));
      let prompt = (same ? '👥 選大家會選的：' : '🦄 選別人不會選的：') + q.text;
      if (this.phase === 'show') prompt = '準備！看大螢幕的題目';
      else if (rev) prompt = e.add ? '🎉 猜對了！' + (this.kid ? '+⭐' : '+' + e.add) : e.pick === null ? '這題沒有選到…' : '這次沒中，下一題加油！';
      else if (e.pick !== null) prompt = '選好了！還可以改，等大家…';
      return { type: 'choices', prompt, options, cols: q.opts.length === 3 ? 1 : 2, locked: this.phase !== 'vote' };
    }
    results() {
      const line = e => this.kid ? `跟大家一樣 ${e.same} 次` : `一樣 ${e.same} 次・不一樣 ${e.diff} 次`;
      const team = this.teams ? { teamScores: [0, 1].map(t => this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0)), teamText: t => this.teamScore(t) } : {};
      return { ...team, rows: this.es.slice().sort((a, b) => b.score - a.score).map(e => ({ p: e.p, key: e.score, line: (this.kid ? '⭐ ' + e.score + '・' : e.score + ' 分・') + line(e) })) };
    }
  }
  GAMES.push({
    id: 'vote', name: '大家來投票', icon: '🗳️', col: COL, bg: '#3b1450', kind: 'vs', teams: true, cat: 'brain', players: '1–6 人',
    blurb: '猜猜大家會選哪一個？選一樣的就得分！',
    btn: { label: '選', icon: '🗳️' },
    rules: kid => kid
      ? ['大螢幕出一個題目，例如「你比較喜歡冰淇淋還是蛋糕？」', '在手機上偷偷選一個，猜猜大家會選哪個', '公布的時候，選最多人的那一邊每個人得一顆星星 ⭐', '一共 8 題，星星最多的人贏']
      : ['每題在手機上偷偷選一個答案', '👥「跟大家一樣」：選到最多人選的 +100', '🦄「跟別人不一樣」：選到最少人選的 +150（大家都一樣就沒人得分）', '共 10 題，最後一題分數 ×2'],
    thumb(g) {
      const bg = g.createLinearGradient(0, 0, 0, 180); bg.addColorStop(0, '#3b1450'); bg.addColorStop(1, '#7a1f5c'); g.fillStyle = bg; g.fillRect(0, 0, 320, 180);
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(40, 14, 240, 34, 12); g.fill();
      g.fillStyle = '#2b2340'; g.font = '900 18px "Noto Sans TC",system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('你比較喜歡哪個？', 160, 32);
      for (const [x, c, e, n] of [[100, '#ff6b6b', '🍦', 3], [220, '#4dabf7', '🍰', 1]]) { g.fillStyle = c; g.beginPath(); g.roundRect(x - 50, 58, 100, 70, 14); g.fill(); g.font = '34px system-ui'; g.fillText(e, x, 92); g.fillStyle = '#fff'; g.font = '900 16px "Fredoka",system-ui'; g.fillText(n + ' 票', x, 140); }
      drawCritter(g, 80, 160, 14, 0, 0, { noShadow: true, still: true, happy: true }); drawCritter(g, 110, 160, 14, 3, 2, { noShadow: true, still: true, happy: true }); drawCritter(g, 220, 160, 14, 1, 1, { noShadow: true, still: true });
    },
    create: ctx => new Vote(ctx)
  });
})();

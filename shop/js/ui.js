'use strict';
// 夜市小吃王：介面（HUD、面板、彈出視窗、提示）
const SPEEDS = [0, 1, 2, 4];
const UI = {
  mode: 'play', sel: null, carry: null, panel: null, tab: {}, speed: 1, lastSpeed: 1, modal: null, slot: 0, rA: null, rB: null, info: null,
  init() {
    this.hud = $('#hud'); this.bar = $('#bar'); this.pnl = $('#panel'); this.mdl = $('#modal'); this.toasts = $('#toasts'); this.bb = $('#buildbar'); this.inf = $('#info');
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      Snd.init();
      this.act(b.dataset.a, b.dataset.v, b);
    });
    // 底部工具列圖示
    const ic = { build: Art.url(Art.fac('griddle'), 2), staff: Art.url(Art.portrait(makeLook(7, 'staff', 'cook'), 'happy'), 2), menu: Art.url(Art.dish('pancake'), 3), lab: Art.url(Art.icon('bulb'), 4), biz: Art.url(Art.icon('shop'), 4), info: Art.url(Art.icon('cup'), 4), sys: Art.url(Art.icon('gear'), 4) };
    for (const k in ic) { const im = document.querySelector(`#bar [data-v="${k}"] img`); if (im) im.src = ic[k]; }
    $('#hudMoney img').src = Art.url(Art.icon('coin'), 3); $('#hudPop img').src = Art.url(Art.icon('heart'), 3);
    $('#hudIdea img').src = Art.url(Art.icon('bulb'), 3); $('#hudRank img').src = Art.url(Art.icon('cup'), 3);
    Game.ui = this;
  },
  // ---------- HUD ----------
  refreshHud() {
    const S = Game.S; if (!S) return;
    const h = Game.hour(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10;
    $('#hudDate').innerHTML = `<b>第${Game.year()}年</b> ${Game.month()}月 第${Game.wk()}週 <span class="clk">${hh}:${String(mm).padStart(2, '0')}</span>`;
    $('#hudMoney span').textContent = money(S.money);
    $('#hudMoney').classList.toggle('neg', S.money < 0);
    $('#hudPop span').textContent = num(S.pop);
    $('#hudIdea span').textContent = num(S.idea);
    $('#hudRank span').textContent = '第' + S.rank + '名';
    const ev = S.ev.map(e => e.n).filter(Boolean), f = FESTIVALS[Game.month()];
    const qs = [];
    if (S.q && S.q.acc) { const p = Game.questProg(S.q); qs.push(`委託：${S.q.title} ${Math.max(0, Math.min(p[0], p[1]))}/${p[1]}`); }
    if (S.fq && !S.fq.done) { const p = Game.questProg(S.fq); qs.push(`${S.fq.title} ${Math.max(0, Math.min(p[0], p[1]))}/${p[1]}`); }
    if (S.chal && S.chal.done === undefined) qs.push(`★ ${CHAL.find(c => c.id === S.chal.id)?.n || '關卡'}・剩 ${Game.chalLeft()} 週`);
    if (S.duel) { const p = Game.duelProg(S.duel); qs.push(`⚔ 對決${S.duel.n} ${S.duel.k === 'sales' ? money(Math.max(0, p[0])) + '/' + money(p[1]) : Math.max(0, p[0]) + '/' + p[1]}`); }
    $('#hudEv').innerHTML = [[f ? f.n : '', ...ev].filter(Boolean).join('・'), ...qs.map(q => `<span class="hq">${esc(q)}</span>`)].filter(Boolean).join(' ');
    document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('on', +b.dataset.v === this.speed));
    $('#btnMute').classList.toggle('off', !Prefs.d.music && !Prefs.d.sfx);
  },
  setSpeed(i) { this.speed = i; if (i) this.lastSpeed = i; Music.paused = i === 0 && !this.modal; this.refreshHud(); },
  measure() {
    const hr = this.hud.getBoundingClientRect(), br = this.bar.getBoundingClientRect();
    const vert = getComputedStyle(this.bar).flexDirection === 'column';
    R.top = hr.bottom + 4;
    R.left = vert ? br.right + 4 : 0;
    R.bottom = (vert ? 0 : innerHeight - br.top) + (this.bb.hidden ? 0 : this.bb.offsetHeight + 6);
    R.right = 0;
    if (!this.pnl.hidden) {
      const pr = this.pnl.getBoundingClientRect();
      if (pr.left > innerWidth * 0.3) R.right = innerWidth - pr.left + 4; else R.bottom = Math.max(R.bottom, innerHeight - pr.top + 4);
    }
    // 直的手機：左上角的目標卡片不要蓋住店面
    const ge = document.getElementById('goal');
    if (ge && !ge.hidden && innerWidth < innerHeight && this.pnl.hidden) R.top = Math.max(R.top, ge.getBoundingClientRect().bottom + 4);
  },

  // ---------- 動作 ----------
  act(a, v, el) {
    const S = Game.S;
    switch (a) {
      case 'speed': Snd.play('click'); this.setSpeed(+v); break;
      case 'mute': { const on = !(Prefs.d.music || Prefs.d.sfx); Prefs.d.music = on; Prefs.d.sfx = on; Prefs.save(); Snd.applyVol(); this.refreshHud(); break; }
      case 'open': Snd.play('tab'); el.classList.remove('nw'); this.closeInfo(); if (this.panel === v) this.closePanel(); else this.openPanel(v); break;
      case 'close': Snd.play('click'); this.closePanel(); break;
      case 'tab': Snd.play('tab'); this.tab[this.panel] = v; this.renderPanel(); break;
      case 'pick': { // 建造物選擇
        const f = F[v], why = f.lv > S.lv ? '店舖等級不夠' : (f.unlock && !S.unlock[f.unlock]) ? '還沒得到' : (f.unlock && S.items.some(i => i.id === v)) ? '已經擺出來了' : (S.money < f.price && !Guide.giftFree(v) ? '錢不夠' : '');
        if (why) { Snd.play('bad'); this.toast(why, 'bad'); return; }
        Snd.play('click'); this.startBuild(v); break;
      }
      case 'buildDone': Snd.play('click'); this.endBuild(); break;
      case 'expand': if (Game.expand()) { this.closePanel(); } else { Snd.play('bad'); this.toast(Game.canExpand(), 'bad'); } break;
      case 'job': { const [uid, job] = v.split(':'); const s = S.staff.find(s => s.uid == uid); if (s) { Game.setJob(s, job); Snd.play('click'); this.renderPanel(); } break; }
      case 'train': { const [uid, st] = v.split(':'); const s = S.staff.find(s => s.uid == uid); const r = Game.train(s, st); if (r[0] === '+') this.toast(`${s.name} 的${{ cook: '廚藝', serv: '服務', charm: '魅力' }[st]} ${r}`, 'good'); else { Snd.play('bad'); this.toast(r, 'bad'); } this.renderPanel(); break; }
      case 'fire': { const s = S.staff.find(s => s.uid == v); if (s && confirm(`確定要請 ${s.name} 離開嗎？`)) { Game.fire(s); this.renderPanel(); } break; }
      case 'hire': { const r = Game.hire(+v); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } else this.toast('歡迎新夥伴加入！', 'good'); this.renderPanel(); break; }
      case 'price': { const [id, d] = v.split(':'); if (Guide.ob()) Guide.ob().f.price = 1; const o = S.dishes[id], base = Game.dishValue(id); o.price = clamp(Math.round((o.price + (+d) * Math.max(5, Math.round(base * 0.05 / 5) * 5)) / 5) * 5, Math.max(5, Math.round(base * 0.4 / 5) * 5), Math.round(base * 3 / 5) * 5); Snd.play('click'); this.renderPanel(); break; }
      case 'toggle': { const o = S.dishes[v]; o.on = !o.on; Snd.play('click'); this.renderPanel(); break; }
      case 'dup': { const r = Game.upgradeDish(v); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } else this.toast(`${DISH[v].n} 升到 Lv${S.dishes[v].lv}！`, 'good'); this.renderPanel(); break; }
      case 'buying': { const r = Game.buyIng(v); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } else this.toast(`開始進貨「${ING[v].n}」`, 'good'); this.renderPanel(); break; }
      case 'rpick': { Snd.play('click'); if (this.rA === v) this.rA = null; else if (this.rB === v) this.rB = null; else if (!this.rA) this.rA = v; else this.rB = v; this.renderPanel(); break; }
      case 'rclear': this.rA = this.rB = null; this.renderPanel(); break;
      case 'rgo': this.doResearch(); break;
      case 'hint': { const [a2, b2] = v.split(':'); this.rA = a2; this.rB = b2; this.renderPanel(); break; }
      case 'save': this.save(+v, true); this.renderPanel(); break;
      case 'load': if (confirm('讀取這個存檔？目前沒存的進度會不見。')) { this.loadSlot(+v); } break;
      case 'qual': Prefs.d.q = v === 'auto' ? 'auto' : +v; Prefs.save(); if (v !== 'auto') R.setQ(+v); else if (R._pf) R._pf.bad = 0; Snd.play('click'); this.renderPanel(); break;
      case 'opt': Prefs.d[v] = !Prefs.d[v]; Prefs.save(); Snd.applyVol(); this.renderPanel(); this.refreshHud(); break;
      case 'toTitle': if (this.modal) { this.modal = null; this.mdl.hidden = true; this.mdl.innerHTML = ''; } this.save(this.slot, false); Main.toTitle(); break;
      case 'ok': this.nextModal(); break;
      case 'contest': this.contestGo(v); break;
      case 'iup': { const it = this.info?.it; if (it && Game.upgrade(it)) this.showInfo(it); else { Snd.play('bad'); this.toast('錢不夠', 'bad'); } break; }
      case 'imove': { const it = this.info?.it; if (it) { this.closeInfo(); this.startMove(it); } break; }
      case 'isell': { const it = this.info?.it; if (it) { Game.remove(it, true); Snd.play('cash'); this.closeInfo(); } break; }
      case 'iclose': this.closeInfo(); break;
      case 'ijob': { const [uid, job] = v.split(':'); const s = S.staff.find(s => s.uid == uid); if (s) { Game.setJob(s, job); this.showStaff(Game.srt.get(s.uid)); } break; }
      case 'help': Snd.play('tab'); Help.show(v || 'flow'); break;
      case 'story': Snd.play('tab'); this.closePanel(); Story.play(null); break;
      case 'guideskip': this.closePanel(); Guide.askSkip(); break;
      case 'opt2': Prefs.d[v] = Prefs.d[v] === false; Prefs.save(); Snd.play('click'); if (v === 'hints' && Prefs.d.hints === false) Hint.hide(); Guide._gk = ''; Guide.renderGoal(); this.renderPanel(); break;
      case 'sev': { const p = this.modal; if (p && p.k === 'staffEv') { const r = Game.staffChoice(p, v); if (r === '錢不夠') { Snd.play('bad'); this.toast(r, 'bad'); break; } if (r) this.toast(r, 'good'); } this.nextModal(); break; }
      case 'qacc': { const q = this.modal && this.modal.q; if (q) { Game.acceptQuest(q); this.toast(`接下委託「${q.title}」`, 'good'); } this.nextModal(); break; }
      case 'dacc': { const d = this.modal && this.modal.d; if (d) { const r = Game.acceptDuel(d); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } else { this.toast(`接受挑戰！賭注 ${money(d.bet)}`, 'goal'); Snd.play('drum'); } } this.nextModal(); break; }
      case 'ddec': { const d = this.modal && this.modal.d; if (d) Game.declineDuel(d); this.nextModal(); break; }
      case 'branchv': this.branchView(v); break;
      case 'qdec': { Game.S.qcd = irnd(1, 3); this.nextModal(); break; }
      case 'qdrop': { if (confirm('放棄這個委託？')) { Game.S.q = null; Game.S.qcd = 2; this.renderPanel(); } break; }
      case 'branch': { const r = Game.buyBranch(v); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } if (this.modal && this.modal.k === 'branch') { if (!r) { this.branchView(v); Game.confetti(Game.S.W * TILE / 2, Game.S.H * TILE / 2, 30); } } this.renderPanel(); break; }
      case 'hostev': { const e = HOSTEV.find(e => e.id === v); if (!e) break; if (!confirm(`舉辦「${e.n}」要花 ${money(Game.hostCost(e))}，確定嗎？`)) break; const r = Game.host(v); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } else { this.toast(`${e.n}開始了！`, 'goal'); this.closePanel(); } break; }
      case 'tech': { const r = Game.techUp(v); if (r) { Snd.play('bad'); this.toast(r, 'bad'); } else this.toast(`${TECHS.find(t => t.id === v).n} 升到 ${Game.tech(v)} 級！`, 'good'); this.renderPanel(); break; }
      case 'retire': this.retire(); break;
      case 'rename': { const n = prompt('新的店名（最多 6 個字）', S.shop); if (n && n.trim()) { S.shop = n.trim().slice(0, 6); this.renderPanel(); } break; }
    }
  },

  // ---------- 面板 ----------
  openPanel(k) { this.panel = k; this.pnl.hidden = false; document.body.classList.add('pnl'); this.renderPanel(); this.measure(); },
  closePanel() { this.panel = null; this.pnl.hidden = true; this.pnl.innerHTML = ''; document.body.classList.remove('pnl'); this.measure(); },
  renderPanel() {
    const k = this.panel; if (!k) return;
    const sc = this.pnl.querySelector('.pb')?.scrollTop || 0;
    const T = { build: '建造', staff: '員工', menu: '菜單', lab: '研發', biz: '事業', info: '經營', sys: '選單' }[k];
    const tabs = {
      build: [['station', '攤位'], ['seat', '座位'], ['decor', '裝飾'], ['fun', '遊戲'], ['floor', '地板']],
      staff: [['list', '員工'], ['hire', '徵人']],
      menu: [['dish', '菜色'], ['ing', '食材']],
      lab: [['lab', '研發'], ['book', '食譜筆記']],
      biz: [['quest', '委託'], ['event', '活動'], ['tech', '秘方'], ['branch', '分店']],
      info: [['rank', '排行榜'], ['goal', '目標'], ['ach', '成就'], ['combo', '組合圖鑑'], ['guest', '客人圖鑑'], ['rev', '評論'], ['rep', '報表']],
      sys: [],
    }[k];
    // 新手引導還沒介紹的分頁先藏起來
    const tabs2 = tabs.filter(([v]) => (k !== 'build' && !(k === 'menu' && v === 'ing')) || Guide.can('tab:' + v));
    tabs.length = 0; tabs.push(...tabs2);
    let tb = this.tab[k] || (tabs[0] && tabs[0][0]);
    if (tabs.length && !tabs.some(t => t[0] === tb)) tb = tabs[0][0];
    let body = '';
    try { body = this['p_' + k](tb); } catch (e) { console.error(e); body = '<p>發生錯誤</p>'; }
    this.pnl.innerHTML = `<div class="ph"><h3>${T}</h3><button class="x" data-a="close" aria-label="關閉">✕</button></div>` +
      (tabs.length ? `<div class="tabs">${tabs.map(([v, n]) => `<button data-a="tab" data-v="${v}" class="${v === tb ? 'on' : ''}">${n}</button>`).join('')}</div>` : '') +
      `<div class="pb">${body}</div>`;
    this.pnl.querySelector('.pb').scrollTop = sc;
  },
  img(c, s = 3, cls = '') { return `<img class="px ${cls}" src="${Art.url(c, s)}" alt="">`; },
  p_build(tb) {
    const S = Game.S;
    let h = '';
    const n = LEVELS[S.lv + 1];
    if (n && tb === 'station' && Guide.can('expand')) {
      const why = Game.canExpand();
      h += `<div class="expand"><div><b>擴建：${n.n}</b><small>店面 ${n.W}×${n.H}・員工上限 ${n.staff}・月租 ${money(n.rent)}</small><small>需要人氣 ${num(n.pop)}（目前 ${num(S.pop)}）・${money(n.cost)}</small></div><button class="btn ${why ? 'dis' : 'go'}" data-a="expand">${why ? '還不行' : '擴建！'}</button></div>`;
    }
    const list = FAC.filter(f => f.cat === tb && (!f.unlock || S.unlock[f.unlock]));
    h += '<div class="grid">';
    for (const f of list) {
      const gift = Guide.giftFree(f.id), lock = f.lv > S.lv, poor = S.money < f.price && !gift;
      const pic = f.cat === 'floor' ? this.img(Art.floor(f.id, 0), 3) : this.img(Art.fac(f.id, 0), 3);
      const extra = f.cat === 'seat' ? `座位 ${f.seats}` : f.cat === 'station' ? STN[f.st] : f.inc ? '遊戲攤' : '';
      const cnt = f.cat !== 'floor' ? S.items.filter(i => i.id === f.id).length : 0;
      h += `<button class="card ${lock ? 'lock' : ''} ${poor && !lock ? 'poor' : ''}" data-a="pick" data-v="${f.id}">
        <div class="pic">${pic}${cnt ? `<i class="cnt">×${cnt}</i>` : ''}</div><b>${f.n}</b>
        <span class="pr">${gift ? '🎁 阿德伯送的・免費' : lock ? '🔒 ' + LEVELS[f.lv].n : (f.price ? money(f.price) : '免費')}</span>
        <small>${extra ? extra + '・' : ''}魅力 ${f.ap}</small><small class="d">${f.d}</small></button>`;
    }
    h += '</div>';
    if (tb === 'floor') h += '<p class="tip">選好地板後，在店面上點一下或拖曳就能鋪。</p>';
    else h += '<p class="tip">把某些東西放在隔壁（斜的也算）會觸發「擺設組合」，到「經營 → 組合圖鑑」看看提示吧！</p>';
    return h;
  },
  statBar(n, v, col) { return `<div class="sb"><span>${n}</span><i><b style="width:${Math.min(100, v * 2)}%;background:${col}"></b></i><em>${v}</em></div>`; },
  p_staff(tb) {
    const S = Game.S, cap = LEVELS[S.lv].staff;
    let h = '';
    if (tb === 'list') {
      h += `<p class="sum">員工 ${S.staff.length} / ${cap} 人・每月薪水 ${money(S.staff.reduce((a, s) => a + s.sal, 0))}</p>`;
      for (const s of S.staff) {
        const a = Game.srt.get(s.uid), L = a ? a.look : makeLook(s.seed, 'staff', s.job);
        const need = Game.expNeed(s);
        h += `<div class="staff"><div class="pic pt">${this.img(Art.portrait(L, a && a.tired ? '' : 'happy'), 2)}</div><div class="si">
          <b>${esc(s.title ? s.title + ' ' : '')}${esc(s.name)} <span class="lv">Lv${s.lv}</span> ${this.traitTag(s)}</b>
          <div class="exp"><i style="width:${s.exp / need * 100}%"></i></div>
          ${this.statBar('廚藝', s.cook, '#ff8a3d')}${this.statBar('服務', s.serv, '#4fb3ff')}${this.statBar('魅力', s.charm, '#ff6fa8')}
          <small>${s.owner ? '老闆不支薪' : '月薪 ' + money(s.sal)}${a && a.tired ? '・<span class="bad">累了</span>' : ''}${s.away ? '・<span class="bad">進修中</span>' : ''}${s.pal && Game.sById(s.pal) ? `・<span class="good">♥ 搭檔：${esc(Game.sById(s.pal).name)}</span>` : ''}${Game.racing(s) ? '・<span class="bad">⚔ 較勁中</span>' : ''}</small>
          <div class="jobs">${[['cook', '廚師'], ['serve', '外場'], ['tout', '攬客']].map(([j, n]) => `<button class="${s.job === j ? 'on' : ''}" data-a="job" data-v="${s.uid}:${j}">${n}</button>`).join('')}</div>
          <div class="jobs tr"><span>培訓 ${money(Game.trainCost(s))}</span>${[['cook', '廚藝'], ['serv', '服務'], ['charm', '魅力']].map(([j, n]) => `<button data-a="train" data-v="${s.uid}:${j}">${n}↑</button>`).join('')}${s.owner ? '' : `<button class="fire" data-a="fire" data-v="${s.uid}">解雇</button>`}</div>
        </div></div>`;
      }
      h += '<p class="tip">廚師負責攤位（一個攤位要一位廚師），外場會清桌子、招呼排隊的客人，攬客站在門口吸引路人。每週結束體力會恢復。</p>';
      h += '<p class="lbl">特質一覽</p><div class="traits">' + Object.values(TRAITS).map(t => `<div><i class="trait ${t.rare ? 'r' : ''}" style="--c:${t.col}">${t.n}</i> ${t.d}</div>`).join('') + '</div>';
    } else {
      h += `<p class="sum">每個月會有新的應徵者。員工 ${S.staff.length} / ${cap}</p>`;
      if (!S.hire.length) h += '<p class="tip">這個月沒有人來應徵了，下個月再看看。</p>';
      S.hire.forEach((s, i) => {
        const L = makeLook(s.seed, 'staff', s.job);
        h += `<div class="staff"><div class="pic pt">${this.img(Art.portrait(L), 2)}</div><div class="si">
          <b>${s.title ? '<span class="rare">' + esc(s.title) + '</span> ' : ''}${esc(s.name)} ${this.traitTag(s)}</b>
          ${this.statBar('廚藝', s.cook, '#ff8a3d')}${this.statBar('服務', s.serv, '#4fb3ff')}${this.statBar('魅力', s.charm, '#ff6fa8')}
          <small>月薪 ${money(s.sal)}・簽約金 ${money(s.sal * 2)}</small>
          <button class="btn go" data-a="hire" data-v="${i}">雇用</button></div></div>`;
      });
    }
    return h;
  },
  traitTag(s) { const t = TRAITS[s.trait]; return t ? `<i class="trait ${t.rare ? 'r' : ''}" style="--c:${t.col}" title="${t.d}">${t.n}</i>` : ''; },
  stars(q) { const n = Math.max(1, Math.min(5, Math.round(q / 2))); return '<span class="stars">' + '★'.repeat(n) + '<s>' + '★'.repeat(5 - n) + '</s></span>'; },
  p_menu(tb) {
    const S = Game.S;
    let h = '';
    if (tb === 'dish') {
      h += `<p class="sum">菜單上有 ${Game.menu().length} 道菜。價錢太高客人會不滿意，太低就賺不到錢。</p>`;
      const ks = Game.known().sort((a, b) => DISH[a].st.localeCompare(DISH[b].st));
      for (const k of ks) {
        const d = DISH[k], o = S.dishes[k], has = Game.hasStation(d.st), val = Math.round(Game.dishValue(k)), uc = Game.upCost(k);
        const ratio = o.price / val, pc = ratio > 1.35 ? 'bad' : ratio < 0.85 ? 'cheap' : 'ok';
        h += `<div class="dish ${o.on ? '' : 'off'}"><div class="pic">${this.img(Art.dish(k), 3)}</div><div class="di">
          <b>${d.n} <span class="lv">Lv${o.lv}</span> <i class="cat" style="background:${CATCOL[d.cat]}">${CAT[d.cat]}</i></b>
          <small>${d.lim ? `<span class="${Game.limOn(k) ? 'good' : 'bad'}">季節限定 ${d.lim.join('、')} 月${Game.limOn(k) ? '・販售中' : '・下次再見'}</span>・` : ''}${STN[d.st]}${has ? '' : ' <span class="bad">（還沒有這種攤位）</span>'}${Game.sellable(k) ? '' : ' <span class="bad">（甜點專賣店不能賣）</span>'}・美味 ${this.stars(Game.dishQ(k))}・成本約 ${money(Game.costOf(k))}</small>
          <div class="price"><button data-a="price" data-v="${k}:-1">－</button><span class="${pc}">${money(o.price)}</span><button data-a="price" data-v="${k}:1">＋</button><small>建議 ${money(val)}</small></div>
          <div class="jobs"><button class="${o.on ? 'on' : ''}" data-a="toggle" data-v="${k}">${o.on ? '販售中' : '休息中'}</button>
          ${o.lv < Game.maxDishLv() ? `<button data-a="dup" data-v="${k}">改良 💡${uc.idea}・${money(uc.money)}</button>` : '<button disabled>已達最高等級</button>'}</div>
        </div></div>`;
      }
    } else {
      h += '<p class="sum">和批發商簽約後就能一直使用這種食材（每份成本會從營收扣）。</p><div class="grid ing">';
      for (const k in ING) {
        const g = ING[k], own = S.ings[k], lock = g.lv > S.lv;
        const se = g.season ? `<small class="${g.season.includes(Game.month()) ? 'good' : 'bad'}">${g.season.includes(Game.month()) ? '當季便宜' : '非當季貴'}</small>` : '';
        h += `<button class="card sm ${own ? 'own' : lock ? 'lock' : ''}" ${own ? 'disabled' : ''} data-a="buying" data-v="${k}"><div class="pic">${this.img(Art.ing(k), 3)}</div><b>${g.n}</b>
          <span class="pr">${own ? '已進貨' : lock ? '🔒 ' + LEVELS[g.lv].n : money(g.buy)}</span><small>每份 $${g.c}</small>${se}</button>`;
      }
      h += '</div>';
    }
    return h;
  },
  nm(k) { return ING[k] ? ING[k].n : DISH[k].n; },
  pimg(k) { return ING[k] ? Art.ing(k) : Art.dish(k); },
  p_lab(tb) {
    const S = Game.S;
    let h = '';
    if (tb === 'lab') {
      const slot = k => k ? `<div class="slot full">${this.img(this.pimg(k), 4)}<b>${this.nm(k)}</b></div>` : '<div class="slot">？</div>';
      h += `<div class="lab">${slot(this.rA)}<span class="plus">＋</span>${slot(this.rB)}<span class="plus">＝</span><div class="slot q">${this.img(Art.icon('bulb'), 4)}</div></div>`;
      h += `<div class="labgo"><button class="btn go big" data-a="rgo" ${this.rA && this.rB ? '' : 'disabled'}>研發！ 💡${Game.ideaCost()}・${money(Game.moneyCost())}</button><button class="btn" data-a="rclear">清除</button></div>`;
      h += `<p class="sum">選兩樣東西組合看看。已經研發的菜也可以再加料！失敗只會扣一半靈感。</p>`;
      h += '<p class="lbl">食材</p><div class="chips">';
      for (const k in ING) if (S.ings[k]) h += `<button class="chip ${this.rA === k || this.rB === k ? 'on' : ''}" data-a="rpick" data-v="${k}">${this.img(Art.ing(k), 2)}${ING[k].n}</button>`;
      h += '</div><p class="lbl">已研發的菜</p><div class="chips">';
      for (const k of Game.known()) h += `<button class="chip ${this.rA === k || this.rB === k ? 'on' : ''}" data-a="rpick" data-v="${k}">${this.img(Art.dish(k), 2)}${DISH[k].n}</button>`;
      h += '</div>';
      const hs = Object.keys(S.hints).filter(k => !S.dishes[k]);
      if (hs.length) { h += '<p class="lbl">老饕的建議</p><div class="chips">'; for (const k of hs) h += `<button class="chip hint" data-a="hint" data-v="${DISH[k].a}:${DISH[k].b}">${this.nm(DISH[k].a)} ＋ ${this.nm(DISH[k].b)}</button>`; h += '</div>'; }
    } else {
      const all = DISH_ALL, got = all.filter(k => S.dishes[k]).length;
      h += `<p class="sum">已研發 ${got} / ${all.length} 道。灰色的是還沒發現的菜，看看提示猜猜看要用什麼做！</p><div class="book">`;
      for (const k of all) {
        const d = DISH[k], o = S.dishes[k];
        if (o) h += `<div class="bk got">${this.img(Art.dish(k), 3)}<div><b>${d.n}</b><small>${this.nm(d.a)} ＋ ${this.nm(d.b)}・${STN[d.st]}・賣出 ${num(S.st.dsold[k] || 0)} 份</small></div></div>`;
        else h += `<div class="bk">${this.img(Art.dish(k), 3, 'sil')}<div><b>？？？</b><small>${STN[d.st]}・${CAT[d.cat]}　「${d.h}」</small></div></div>`;
      }
      h += '</div><p class="lbl">季節限定（到了那個月自動上架）</p><div class="book">';
      for (const k of DISH_LIM) {
        const d = DISH[k], o = S.dishes[k], on = Game.limOn(k);
        h += `<div class="bk ${o ? 'got' : ''} lim">${this.img(Art.dish(k), 3, o ? '' : 'sil')}<div><b>${o ? d.n : '？？？'} ${on ? '<i class="cat" style="background:#ff6fa8">販售中</i>' : ''}</b><small>${d.lim.join('、')} 月・${STN[d.st]}・${LEVELS[d.lv].n}以上${o ? '・賣出 ' + num(S.st.dsold[k] || 0) + ' 份' : '　「' + d.h + '」'}${Game.sellable(k) ? '' : '・<span class="bad">這個模式不能賣</span>'}</small></div></div>`;
      }
      h += '</div>';
    }
    return h;
  },
  p_info(tb) {
    const S = Game.S;
    let h = '';
    if (tb === 'rank') {
      const L = Game.ladder(), mi = L.findIndex(r => r.me);
      h += `<p class="sum">夜市排行榜依照「人氣」排名。年底的頒獎典禮看的就是名次！</p><ol class="ladder">`;
      L.forEach((r, i) => { if (Math.abs(i - mi) <= 6 || i < 3) h += `<li class="${r.me ? 'me' : ''}"><span>${i + 1}</span><b>${esc(r.n)}</b><em>${num(r.s)}</em></li>`; else if (i === 3 && mi > 10) h += '<li class="gap">⋯</li>'; });
      h += '</ol>';
      if (S.lv >= 3) { const g = S.gstar || 0; h += `<p class="lbl">夜市美食指南（每年 6 月評鑑）</p><div class="quest yg"><div class="pic">${this.img(Art.icon('medal'), 4)}</div><div><b><span class="stars">${'★'.repeat(g)}<s>${'★'.repeat(3 - g)}</s></span></b><small>每顆星：每週人氣 +4、客人願意多付 4%。評鑑標準（要一顆一顆拿）：</small>${Game.guideCrit().map((c, i) => `<small class="${c.ok ? 'good' : ''}">${c.ok ? '✔' : '・'} ★${i + 1}：${c.t}</small>`).join('')}</div></div>`; }
      if (S.awards.length) { h += '<p class="lbl">歷年得獎</p><div class="awards">'; for (const a of S.awards) h += `<div><b>第${a.y}年</b> ${a.t}（第${a.rank}名）・營業額 ${money(a.sales)}</div>`; h += '</div>'; }
    } else if (tb === 'goal') {
      const done = GOALS.filter(g => S.goals[g.id]).length;
      h += `<p class="sum">達成 ${done} / ${GOALS.length} 個目標</p><div class="goals">`;
      let shown = 0;
      for (const g of GOALS) {
        const d = S.goals[g.id];
        if (!d && shown >= 6) continue;
        if (!d) shown++;
        const v = Game.goalVal(g.k), pr = g.k === 'rank' ? (v <= g.v ? 1 : Math.min(0.95, g.v / v)) : Math.min(1, v / g.v);
        h += `<div class="goal ${d ? 'done' : ''}"><b>${d ? '✔ ' : ''}${g.n}</b><small>${g.d}・獎勵 ${Game.rewardText(g.r)}</small>${d ? '' : `<i><b style="width:${pr * 100}%"></b></i>`}</div>`;
      }
      h += '</div>';
    } else if (tb === 'ach') {
      const got = ACHS.filter(a => Legacy.d.ach[a.id]).length;
      h += `<p class="sum">成就 ${got} / ${ACHS.length}（所有存檔共用）・傳承點數 <b>${Legacy.d.pts}</b> 點</p><div class="book">`;
      for (const a of ACHS) { const g2 = Legacy.d.ach[a.id], here = S.ach[a.id]; h += `<div class="bk ach ${g2 ? 'got' : ''}">${this.img(Art.icon(g2 ? 'medal' : 'star'), 3, g2 ? '' : 'sil')}<div><b>${a.n}${here ? ' <span class="good">✔</span>' : ''}</b><small>${a.d}・傳承點數 +${a.pt}</small></div></div>`; }
      h += '</div><p class="tip">成就第一次解鎖會得到「傳承點數」，可以在標題畫面換成新遊戲的開局加成。</p>';
    } else if (tb === 'guest') {
      h += `<p class="sum">來過的客人種類和招待人數</p><div class="book">`;
      for (const k in CTYPES) {
        const T = CTYPES[k], n2 = S.st.ctype[k] || 0, L = makeLook(17 + k.length * 31, k);
        h += `<div class="bk ${n2 ? 'got' : ''}">${this.img(Art.portrait(L, n2 ? 'happy' : ''), 2, n2 ? '' : 'sil')}<div><b>${n2 ? T.n : '？？？'}</b><small>${n2 ? `招待 ${num(n2)} 位・喜歡${T.pref.map(c => CAT[c]).join('、')}${T.sea ? '・最愛海鮮' : ''}・預算 ${T.b >= 1.3 ? '很高' : T.b >= 1 ? '普通' : '偏低'}` : T.map ? `只在「${MAPS[T.map].n}」出現` : (T.lv > S.lv ? `店要擴建到「${LEVELS[T.lv].n}」才會來` : '還沒遇過')}</small></div></div>`;
      }
      h += '</div>';
    } else if (tb === 'combo') {
      const n = Object.keys(S.combos).length;
      h += `<p class="sum">發現 ${n} / ${COMBOS.length} 個擺設組合。目前店裡有 ${Game.combos.length} 組在發揮效果。</p><div class="book">`;
      for (const c of COMBOS) {
        const got = S.combos[c.id];
        h += `<div class="bk ${got ? 'got' : ''}"><div class="cp">${this.img(F[c.a].cat === 'floor' ? Art.floor(c.a, 0) : Art.fac(c.a), 2, got ? '' : 'sil')}${this.img(Art.fac(c.b), 2, got ? '' : 'sil')}</div><div><b>${got ? c.n : '？？？'}</b><small>${got ? F[c.a].n + ' ＋ ' + F[c.b].n + '：' + Game.effText(c.eff) : '提示：' + c.h}</small></div></div>`;
      }
      h += '</div>';
    } else if (tb === 'rev') {
      const avg = S.st.satN ? Math.round(S.st.satS / S.st.satN) : 0;
      h += `<p class="sum">平均滿意度 ${avg} 分・累積客人 ${num(S.st.cust)} 位</p><div class="revs">`;
      if (!S.log.length) h += '<p class="tip">還沒有評論。</p>';
      for (const r of S.log) h += `<div class="rev">${this.img(Art.icon('f' + r.s), 3)}<div><b>${r.t}</b>「${esc(r.txt)}」</div></div>`;
      h += '</div>';
    } else if (tb === 'rep') {
      const hs = S.st.hist, mx = Math.max(1, ...hs.map(x => Math.max(x.s, Math.abs(x.p))));
      h += `<p class="sum">${esc(S.shop)}・${LEVELS[S.lv].n}・魅力 ${Math.round(Game.appeal)}・本月營業額 ${money(S.st.msales)}</p>`;
      h += `<div class="chart">${hs.length ? hs.map(x => `<div class="col"><i class="s" style="height:${x.s / mx * 100}%"></i><i class="p ${x.p < 0 ? 'neg' : ''}" style="height:${Math.abs(x.p) / mx * 100}%"></i></div>`).join('') : '<p class="tip">月底會開始有紀錄。</p>'}</div>`;
      h += '<p class="legend"><i class="s"></i>營業額 <i class="p"></i>利潤 <i class="p neg"></i>虧損（最近 24 個月）</p>';
      h += `<table class="kv"><tr><td>累積營業額</td><td>${money(S.st.sales)}</td></tr><tr><td>今年營業額</td><td>${money(S.st.ysales)}</td></tr><tr><td>每秒來客</td><td>${Game.spawnRate().toFixed(2)}</td></tr><tr><td>店舖容量</td><td>${Game.capacity()} 人</td></tr><tr><td>小吃大賽冠軍</td><td>${S.st.wins} 次</td></tr><tr><td>最佳名次</td><td>第 ${S.st.best} 名</td></tr></table>`;
    }
    return h;
  },
  p_biz(tb) {
    const S = Game.S;
    let h = '';
    if (tb === 'quest') {
      h += `<p class="sum">附近的客人會來拜託你事情，完成可以拿到獎勵。已完成 ${S.qdone} 個委託。</p>`;
      if (S.q && S.q.acc) {
        const q = S.q, p = Game.questProg(q), pr = Math.max(0, Math.min(1, p[0] / p[1]));
        h += `<div class="quest"><div class="pic pt">${this.img(Art.portrait(makeLook(q.seed, 'asker'), 'happy'), 2)}</div><div><b>${esc(q.title)}</b><small>${esc(q.who)}：${esc(q.txt)}</small><small>目標：${q.goal}${q.k === 'sat' && p[0] ? `（目前平均 ${p[2]}）` : ''}・剩 ${q.w} 週</small><small class="good">獎勵：${Game.rewardText(q.r)}</small><i class="bar"><b style="width:${pr * 100}%"></b></i><button class="btn" data-a="qdrop">放棄</button></div></div>`;
      } else h += '<p class="tip">目前沒有委託。過幾週會有人來找你。</p>';
      if (S.yg) {
        const g = S.yg, p = Game.ygProg(g), pr = Math.max(0, Math.min(1, p[0] / p[1]));
        h += `<p class="lbl">第 ${g.y} 年的目標</p><div class="quest yg"><div class="pic pt">${this.img(Art.portrait(Guide.look(), 'happy'), 2)}</div><div><b>${esc(g.title)}</b><small>年底的頒獎典禮會檢查，達成可以拿到獎勵。</small><small class="good">獎勵：${Game.rewardText(g.r)}</small>${p[0] >= p[1] ? '<small class="good">✔ 已達成！</small>' : `<i class="bar"><b style="width:${pr * 100}%"></b></i>${p[1] > 1 ? `<small>${num(Math.max(0, p[0]))} / ${num(p[1])}</small>` : ''}`}</div></div>`;
      }
      if (S.duel) {
        const d = S.duel, p = Game.duelProg(d), pr = Math.max(0, Math.min(1, p[0] / p[1]));
        h += `<p class="lbl">對手的挑戰書</p><div class="quest duel"><div class="pic">${this.img(Art.icon('sword'), 4)}</div><div><b>vs ${esc(d.n)}</b><small>${esc(d.title)}・剩 ${d.w} 週・賭注 ${money(d.bet)}</small><small class="good">贏了：拿回 ${money(d.bet * 2)}・人氣 +${d.pop}・對手人氣下滑</small><i class="bar"><b style="width:${pr * 100}%"></b></i></div></div>`;
      }
      if (S.fq) {
        const q = S.fq, p = Game.questProg(q), pr = Math.max(0, Math.min(1, p[0] / p[1]));
        h += `<p class="lbl">節慶限定挑戰</p><div class="quest fest"><div class="pic pt">${this.img(Art.icon('firework'), 4)}</div><div><b>${q.title}</b><small>${q.goal}</small><small class="good">獎勵：${Game.rewardText(q.r)}</small>${q.done ? '<small class="good">✔ 已完成！</small>' : `<i class="bar"><b style="width:${pr * 100}%"></b></i><small>${Math.max(0, p[0])} / ${p[1]}</small>`}</div></div>`;
      }
    } else if (tb === 'event') {
      h += `<p class="sum">花錢舉辦活動，一週內客人大增、人氣上升。${S.hostCD ? `<span class="bad">籌備中：還要 ${S.hostCD} 週</span>` : '現在可以舉辦！'}</p>`;
      for (const e of HOSTEV) {
        const lock = S.lv < e.lv, c = Game.hostCost(e);
        h += `<div class="biz ${lock ? 'lock' : ''}"><div class="pic">${this.img(Art.icon(e.fx ? 'firework' : e.id === 'tasting' ? 'heart' : e.id === 'live' ? 'note' : 'star'), 4)}</div><div><b>${e.n}</b><small>${e.d}</small><small>客人 ×${e.mul}・${e.w} 週・人氣 +${e.pop}</small></div>
          <button class="btn ${lock || S.hostCD || S.money < c ? 'dis' : 'go'}" data-a="hostev" data-v="${e.id}">${lock ? '🔒 ' + LEVELS[e.lv].n : money(c)}</button></div>`;
      }
    } else if (tb === 'tech') {
      h += `<p class="sum">用靈感和錢研究獨門秘方，效果會一直有效（最高 5 級）。目前靈感 ${num(S.idea)}。</p>`;
      for (const t of TECHS) {
        const lv = Game.tech(t.id), c = Game.techCost(t), max = lv >= 5;
        h += `<div class="biz"><div class="pic">${this.img(Art.icon('flask'), 4)}</div><div><b>${t.n} <span class="lv">Lv${lv}</span></b><small>每級 ${t.d}</small><span class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></div>
          <button class="btn ${max || S.idea < c.idea || S.money < c.money ? 'dis' : 'go'}" data-a="tech" data-v="${t.id}">${max ? '已滿級' : `💡${num(c.idea)}<br>${money(c.money)}`}</button></div>`;
      }
    } else if (tb === 'branch') {
      const bi = Game.branchInc();
      h += `<p class="sum">到其他夜市開分店，每週帶來收入和人氣。店舖擴建到「美食廣場」後才能開。目前分店每週收入 ${money(bi.inc)}・人氣 +${bi.pop}</p>`;
      for (const b of BRANCHES) {
        const lv = S.br[b.id] || 0, lock = S.lv < b.lv, c = Game.branchCost(b);
        h += `<div class="biz br ${lock ? 'lock' : ''} ${lv ? 'own' : ''}"><button class="pic scene" data-a="branchv" data-v="${b.id}">${this.img(Art.branchScene(b.id, lv), 1)}</button><div><b>${b.n} ${lv ? `<span class="lv">Lv${lv}</span>` : ''}</b><small>每級每週 ${money(b.inc)}・人氣 +${b.pop}</small>${lv ? `<span class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>
          <button class="btn ${lock || lv >= 5 || S.money < c ? 'dis' : 'go'}" data-a="branch" data-v="${b.id}">${lock ? '🔒 ' + LEVELS[b.lv].n : lv >= 5 ? '已滿級' : (lv ? '升級 ' : '開店 ') + money(c)}</button></div>`;
      }
    }
    return h;
  },
  // 分店巡視：大張的風景＋資料
  branchView(id) {
    const b = BRANCHES.find(b => b.id === id); if (!b) return;
    const S = Game.S, lv = S.br[id] || 0, c = Game.branchCost(b), lock = S.lv < b.lv;
    Snd.play('tab');
    this.mdl.hidden = false; this.modal = { k: 'branch' };
    const m = 0.8 + Math.min(0.6, S.pop / 30000);
    this.mdl.innerHTML = `<div class="mc brv"><p class="lbl">${lv ? '分店巡視' : '分店預定地'}</p><div class="bscene">${this.img(Art.branchScene(id, lv), 3)}</div><h2>${b.n}${lv ? ` <span class="lv">Lv${lv}</span>` : ''}</h2>
      <p>${BRANCH_TXT[id] || ''}</p>
      ${lv ? `<p class="good">每週收入 ${money(b.inc * lv * m)}・人氣 +${b.pop * lv}</p>` : `<p class="mute">開店後每級每週 ${money(b.inc)}・人氣 +${b.pop}</p>`}
      <div class="row c"><button class="btn" data-a="ok">關閉</button>${lv < 5 ? `<button class="btn ${lock || S.money < c ? 'dis' : 'go'}" data-a="branch" data-v="${id}">${lock ? '🔒 ' + LEVELS[b.lv].n : (lv ? '升級 ' : '開店 ') + money(c)}</button>` : ''}</div></div>`;
  },
  retire() {
    const S = Game.S;
    if (!S.ended && Game.year() < 6) { this.toast('經營滿 5 年或拿到結局後才能傳承', 'bad'); return; }
    const pts = Game.retirePts();
    if (!confirm(`把「${S.shop}」傳給下一代？\n\n這個存檔會重新開始（第 ${S.gen + 1} 代），你會得到 ${pts} 點傳承點數，可以在標題畫面換開局加成。`)) return;
    Legacy.add(pts); Legacy.d.gens++; Legacy.save();
    Game.achFlag('gen2');
    const name = S.shop, gen = S.gen + 1, slot = this.slot;
    this.closePanel();
    Main.startNew(slot, { name, gen, scen: S.scen, map: S.map });
    this.toast(`第 ${gen} 代老闆接手了！傳承點數 +${pts}`, 'goal');
  },
  achToast(a, isNew) {
    if (Main.state !== 'play') return;
    const d = document.createElement('div'); d.className = 'toast ach';
    d.innerHTML = `${this.img(Art.icon('medal'), 2)}<span><small>成就解鎖</small><b>${a.n}</b>${isNew ? `<em>傳承點數 +${a.pt}</em>` : ''}</span>`;
    this.toasts.appendChild(d);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    Snd.play('discover');
    setTimeout(() => d.classList.add('out'), 3800); setTimeout(() => d.remove(), 4300);
  },
  p_sys() {
    let h = `<p class="lbl">說明與提示</p><div class="row"><button class="btn go" data-a="help">怎麼玩</button><button class="btn" data-a="story">重看開場故事</button>${Guide.on() ? '<button class="btn" data-a="guideskip">跳過新手引導</button>' : ''}</div>`;
    h += `<div class="row"><button class="btn ${Prefs.d.hints !== false ? 'go' : ''}" data-a="opt2" data-v="hints">阿德伯的提示 ${Prefs.d.hints !== false ? '開' : '關'}</button><button class="btn ${Prefs.d.goals !== false ? 'go' : ''}" data-a="opt2" data-v="goals">左上角目標 ${Prefs.d.goals !== false ? '開' : '關'}</button></div>`;
    h += `<p class="lbl">店名</p><div class="row"><b class="shopname">${esc(Game.S.shop)}</b><button class="btn" data-a="rename">改名</button></div><p class="lbl">存檔（每個月底會自動存到目前的欄位）</p>`;
    for (let i = 0; i < 3; i++) {
      const m = Main.slotMeta(i);
      h += `<div class="slotrow ${i === this.slot ? 'cur' : ''}"><div><b>存檔 ${i + 1}${i === this.slot ? '（使用中）' : ''}</b><small>${m ? `${esc(m.shop)}・第${m.y}年${m.m}月・${money(m.money)}` : '空的'}</small></div>
        <button class="btn go" data-a="save" data-v="${i}">存檔</button><button class="btn" data-a="load" data-v="${i}" ${m ? '' : 'disabled'}>讀取</button></div>`;
    }
    h += `<p class="lbl">設定</p><div class="row"><button class="btn ${Prefs.d.music ? 'go' : ''}" data-a="opt" data-v="music">音樂 ${Prefs.d.music ? '開' : '關'}</button><button class="btn ${Prefs.d.sfx ? 'go' : ''}" data-a="opt" data-v="sfx">音效 ${Prefs.d.sfx ? '開' : '關'}</button></div>`;
    const qv = Prefs.d.q === undefined ? 'auto' : String(Prefs.d.q);
    h += `<p class="lbl">畫質（手機比較慢可以調低）</p><div class="row">${[['auto', '自動'], ['0', '高'], ['1', '中'], ['2', '省電']].map(([v, n]) => `<button class="btn ${qv === v ? 'go' : ''}" data-a="qual" data-v="${v}">${n}</button>`).join('')}<small class="mute">目前：${['高', '中', '省電'][R.q]}</small></div>`;
    const S = Game.S, sc = SCENARIOS.find(x => x.id === S.scen);
    h += `<p class="lbl">傳承（第 ${S.gen} 代・${sc ? sc.n : ''}${S.map !== 'city' ? '・' + MAPS[S.map].n : ''}）</p><div class="row"><button class="btn ${S.ended || Game.year() >= 6 ? 'go' : 'dis'}" data-a="retire">傳承給下一代</button><small class="mute">${S.ended || Game.year() >= 6 ? `可以得到 ${Game.retirePts()} 點傳承點數` : '經營滿 5 年或看到結局後開放'}</small></div>`;
    h += `<div class="row"><button class="btn" data-a="toTitle">存檔並回標題</button><a class="btn" href="../index.html">← 回遊戲大廳</a></div>`;
    h += '<p class="tip">操作：拖曳畫面可以移動，雙指或滑鼠滾輪縮放。點攤位、桌子、員工可以看詳細資料。鍵盤：空白鍵暫停，1～3 調速度，0 暫停，Esc 關閉。</p>';
    return h;
  },
  doResearch() {
    const r = Game.research(this.rA, this.rB);
    if (r.err) { Snd.play('bad'); this.toast(r.err, 'bad'); return; }
    const a = this.rA, b = this.rB;
    this.mdl.hidden = false; this.modal = { k: 'lab' };
    this.mdl.innerHTML = `<div class="mc lab-anim"><p class="lbl">研發中…</p><div class="lab">${`<div class="slot full">${this.img(this.pimg(a), 4)}</div>`}<span class="plus">＋</span><div class="slot full">${this.img(this.pimg(b), 4)}</div></div><div class="pot">${this.img(Art.fac('soup', 1), 4)}</div></div>`;
    Snd.play('drum');
    setTimeout(() => {
      if (r.ok) {
        const d = DISH[r.ok];
        Snd.play('discover');
        const warn = Game.hasStation(d.st) ? '' : `<p class="bad">要先蓋「${FAC.find(f => f.st === d.st).n}」才能賣喔！</p>`;
        this.mdl.innerHTML = `<div class="mc"><p class="lbl">研發成功！</p><div class="bigpic">${this.img(Art.dish(r.ok), 7)}</div><h2>${d.n}</h2><p>${CAT[d.cat]}・${STN[d.st]}・建議售價 ${money(d.p)}・美味 ${this.stars(d.q)}</p>${warn}<button class="btn go big" data-a="ok">太棒了！</button></div>`;
        this.rA = this.rB = null;
      } else {
        Snd.play('fail');
        this.mdl.innerHTML = `<div class="mc"><p class="lbl">研發失敗…</p><div class="bigpic">${this.img(Art.icon('f2'), 7)}</div><h2>味道怪怪的</h2><p>${r.hint || '這兩樣好像不太搭。'}</p><button class="btn go big" data-a="ok">再試試看</button></div>`;
      }
    }, 1300);
  },

  // ---------- 建造模式 ----------
  startBuild(id) {
    this.closePanel(); Hint.hide(); this.mode = 'build'; this.sel = id; this.free = Guide.giftFree(id); this.bb.hidden = false; this.updateBB();
    R.ghost = null; this.measure();
  },
  startMove(it) {
    this.mode = 'move'; this.carry = { it, ox: it.x, oy: it.y }; this.sel = it.id; this.free = false;
    Game.S.items = Game.S.items.filter(i => i !== it); Game.rebuild();
    this.bb.hidden = false; this.updateBB(); this.measure();
  },
  updateBB() {
    const f = F[this.sel];
    const pic = f.cat === 'floor' ? Art.floor(f.id, 0) : Art.fac(f.id, 0);
    this.bb.innerHTML = `${this.img(pic, 2)}<div><b>${this.mode === 'move' ? '移動：' : ''}${f.n}</b><small>${this.mode === 'move' ? '點一格空地放下' : (this.free ? '阿德伯送的，免費' : f.price ? money(f.price) : '免費') + '・點店面的格子放置'}</small></div><button class="btn go" data-a="buildDone">${this.mode === 'move' ? '取消' : '完成'}</button>`;
  },
  endBuild() {
    if (this.mode === 'move' && this.carry) { const c = this.carry; c.it.x = c.ox; c.it.y = c.oy; Game.S.items.push(c.it); Game.rebuild(); this.carry = null; }
    this.mode = 'play'; this.sel = null; R.ghost = null; this.bb.hidden = true; this.measure();
  },
  tapWorld(wx, wy, drag) {
    const S = Game.S, tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (this.mode === 'build') {
      const free = this.free, why = Game.canPlace(this.sel, tx, ty, free);
      R.ghost = { id: this.sel, x: tx, y: ty, ok: !why };
      if (why) { if (!drag) { Snd.play('bad'); this.toast(why, 'bad'); } return; }
      Game.place(this.sel, tx, ty, free);
      Snd.play(F[this.sel].cat === 'floor' ? 'pop' : 'place');
      if (free) { this.toast(`擺好了！謝謝阿德伯的${F[this.sel].n}`, 'good'); this.endBuild(); }
      else if (S.money < F[this.sel].price) { this.toast('錢不夠了', 'bad'); this.endBuild(); }
      else this.updateBB();
      return;
    }
    if (this.mode === 'move') {
      const it = this.carry.it;
      const why = Game.canPlace(it.id, tx, ty, true);
      if (why) { Snd.play('bad'); this.toast(why, 'bad'); return; }
      it.x = tx; it.y = ty; S.items.push(it); Game.rebuild(); Game.checkNewCombos(); Game.poof(tx * TILE + 8, ty * TILE + 8);
      Snd.play('place'); this.carry = null; this.mode = 'play'; this.sel = null; this.bb.hidden = true; this.measure();
      return;
    }
    // 點到員工？
    let best = null, bd = 120;
    for (const a of Game.srt.values()) { const d = (a.x - wx) ** 2 + (a.y - 8 - wy) ** 2; if (d < bd) { bd = d; best = a; } }
    if (best) { Snd.play('click'); this.showStaff(best); return; }
    // 點到設施（考慮高度）
    for (const it of [...S.items].sort((a, b) => b.y - a.y)) {
      const h = Art.facH(it.id);
      if (wx >= it.x * TILE && wx < it.x * TILE + TILE && wy >= (it.y + 1) * TILE - h && wy < (it.y + 1) * TILE) { Snd.play('click'); this.showInfo(it); return; }
    }
    this.closeInfo();
  },
  hoverWorld(wx, wy) {
    if (this.mode !== 'build' && this.mode !== 'move') return;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (!Game.inPlot(tx, ty)) { R.ghost = null; return; }
    R.ghost = { id: this.sel, x: tx, y: ty, ok: !Game.canPlace(this.sel, tx, ty, this.mode === 'move'), lv: this.carry?.it.lv };
  },
  showInfo(it) {
    const f = F[it.id], rt = Game.rts.get(it.uid);
    this.info = { it };
    let d = '';
    if (f.cat === 'station') {
      const ds = Game.menu().filter(k => DISH[k].st === f.st).map(k => DISH[k].n);
      const cook = rt && rt.cook ? Game.S.staff.find(s => s.uid === rt.cook) : null;
      d = `<small>等級 ${it.lv} / ${Game.maxStLv()}・排隊 ${rt ? rt.queue.length : 0} 人・廚師：${cook ? esc(cook.name) : '<span class="bad">沒有人</span>'}</small><small>販售：${ds.length ? ds.join('、') : '<span class="bad">菜單上沒有這攤的菜</span>'}</small>`;
      if (Game.spdMap.get(it.uid)) d += `<small class="good">組合加成：料理速度 +${Math.round(Game.spdMap.get(it.uid))}%</small>`;
    } else if (f.cat === 'seat') d = `<small>座位 ${f.seats}・${it.dirty ? '<span class="bad">桌上很髒，需要外場員工清理</span>' : '很乾淨'}</small>`;
    else d = `<small>魅力 ${f.ap}${f.inc ? '・每週有小收入' : ''}</small><small>${f.d}</small>`;
    const cs = Game.combos.filter(c => c.a === it || c.b === it).map(c => c.c.n);
    if (cs.length) d += `<small class="good">★ ${cs.join('、')}</small>`;
    const sell = f.price ? Math.floor(f.price * 0.5 * (1 + (it.lv - 1) * 0.5)) : 0;
    this.inf.innerHTML = `${this.img(Art.fac(it.id, 0, it.lv), 3)}<div class="ii"><b>${f.n}</b>${d}<div class="jobs">
      ${f.cat === 'station' && it.lv < Game.maxStLv() ? `<button data-a="iup">升級 ${money(Game.upgradeCost(it))}</button>` : ''}
      <button data-a="imove">移動</button><button data-a="isell">${sell ? '賣掉 +' + money(sell) : '收起來'}</button><button data-a="iclose">✕</button></div></div>`;
    this.inf.hidden = false;
  },
  showStaff(a) {
    if (!a) return;
    const s = a.s; this.info = { s };
    const task = a.tired ? '累壞了，動作變慢' : s.job === 'cook' ? (a.st ? '在攤位煮東西' : '找攤位中') : s.job === 'serve' ? (a.task ? (a.task.k === 'clean' ? '清桌子' : '招呼客人') : a.poseK === 'carry' ? '收碗盤' : '巡視中') : '在門口攬客';
    this.inf.innerHTML = `<div class="pt">${this.img(Art.portrait(a.look, a.tired ? '' : 'happy'), 2)}</div><div class="ii"><b>${esc(s.name)} <span class="lv">Lv${s.lv}</span> ${this.traitTag(s)}</b><small>廚藝 ${s.cook}・服務 ${s.serv}・魅力 ${s.charm}</small><small>${task}・體力 ${Math.max(0, Math.round(a.stam))}/${Game.maxStam(s)}</small>
      <div class="jobs">${[['cook', '廚師'], ['serve', '外場'], ['tout', '攬客']].map(([j, n]) => `<button class="${s.job === j ? 'on' : ''}" data-a="ijob" data-v="${s.uid}:${j}">${n}</button>`).join('')}<button data-a="iclose">✕</button></div></div>`;
    this.inf.hidden = false;
  },
  closeInfo() { this.info = null; this.inf.hidden = true; },

  // ---------- 彈出視窗 ----------
  checkPending() {
    if (this.modal || !Game.pending.length || Guide.coachOpen || Story.open || Help.open) return;
    const p = Game.pending.shift();
    this.modal = p; this.mdl.hidden = false;
    Music.paused = false;
    if (p.k === 'quest') {
      Snd.play('event');
      const q = p.q;
      this.mdl.innerHTML = `<div class="mc qmodal"><p class="lbl">客人委託</p><div class="bigpic qp">${this.img(Art.portrait(makeLook(q.seed, 'asker'), 'happy'), 4)}</div><h2>${esc(q.who)}</h2><p>${esc(q.txt)}</p>
        <div class="qbox"><b>${q.goal}</b><small>期限 ${q.w} 週</small><small class="good">獎勵：${Game.rewardText(q.r)}</small></div>
        <div class="row c"><button class="btn" data-a="qdec">不好意思…</button><button class="btn go big" data-a="qacc">交給我吧！</button></div></div>`;
      return;
    }
    if (p.k === 'duel') {
      Snd.play('event');
      const d = p.d, L = makeLook(4000 + d.i * 37, 'worker');
      this.mdl.innerHTML = `<div class="mc duelm"><p class="lbl">挑戰書</p><div class="vs"><div>${this.img(Art.portrait(L, 'angry'), 3)}<b>${esc(d.n)}</b></div><span>VS</span><div>${this.img(Art.portrait(Game.srt.size ? [...Game.srt.values()][0].look : makeLook(1, 'staff', 'cook'), 'happy'), 3)}<b>${esc(Game.S.shop)}</b></div></div>
        <p>「聽說你們最近很紅嘛？來比一場！」</p><div class="qbox"><b>${esc(d.title)}</b><small>賭注 ${money(d.bet)}（先付）</small><small class="good">贏了：拿回 ${money(d.bet * 2)}・人氣 +${d.pop}・${esc(d.n)}的人氣會下滑一陣子</small><small class="bad">輸了：賭注沒了・人氣 -${Math.round(d.pop * 0.7)}</small></div>
        <div class="row c"><button class="btn" data-a="ddec">不跟你比</button><button class="btn go big" data-a="dacc">放馬過來！</button></div></div>`;
      return;
    }
    if (p.k === 'duelEnd') {
      const d = p.d;
      Snd.play(p.win ? 'fanfare' : 'fail');
      this.mdl.innerHTML = `<div class="mc ${p.win ? 'award' : ''}"><p class="lbl">對決結果</p><div class="bigpic ${p.win ? 'glow' : ''}">${this.img(Art.icon(p.win ? 'medal' : 'f2'), 6)}</div><h2>${p.win ? '挑戰成功！' : '可惜輸了…'}</h2><p>${esc(d.title)}：${d.k === 'sales' ? money(p.p[0]) + ' / ' + money(p.p[1]) : num(p.p[0]) + ' / ' + num(p.p[1])}</p>
        <p class="${p.win ? 'good' : 'bad'}">${p.win ? `拿回 ${money(d.bet * 2)}・人氣 +${d.pop}<br>${esc(d.n)}被比下去，人氣暫時下滑！` : `賭注 ${money(d.bet)} 沒了・人氣 -${Math.round(d.pop * 0.7)}`}</p><button class="btn go big" data-a="ok">${p.win ? '太爽了！' : '下次再來！'}</button></div>`;
      return;
    }
    if (p.k === 'chalIntro' || p.k === 'chalEnd') { this.chalModal(p); return; }
    if (p.k === 'staffEv') { if (!this.staffModal(p)) { this.modal = null; this.mdl.hidden = true; } return; }
    if (p.k === 'story') {
      Snd.play('event');
      const g = p.g, txt = STORY[Math.min(p.y, STORY.length) - 2] || pick(STORY_LATE);
      this.mdl.innerHTML = `<div class="mc story"><p class="lbl">第 ${p.y} 年・夜市故事</p><div class="sp">${this.img(Art.portrait(Guide.look(), 'happy'), 4)}<div class="say"><b>阿德伯</b><p>${txt}</p></div></div>
        ${p.prev ? `<p class="${p.done ? 'good' : 'mute'}">去年的目標「${esc(p.prev.title)}」${p.done ? '達成！ ' + Game.rewardText(p.prev.r) : '沒有達成…'}</p>` : ''}
        <div class="qbox"><small>第 ${p.y} 年的目標</small><b>${esc(g.title)}</b><small class="good">獎勵：${Game.rewardText(g.r)}</small></div><button class="btn go big" data-a="ok">今年也要加油！</button></div>`;
      return;
    }
    if (p.k === 'msg') {
      Snd.play(p.kind === 'discover' ? 'discover' : p.kind === 'expand' ? 'fanfare' : 'event');
      const cb = p.combo && COMBOS.find(c => c.id === p.combo);
      const pic = id => F[id].cat === 'floor' ? Art.floor(id, 0) : Art.fac(id);
      const ic = p.kind === 'ade' ? `<div class="bigpic qp">${this.img(Art.portrait(Guide.look(), 'happy'), 4)}</div>` : p.kind === 'season' ? `<div class="bigpic glow combo">${(p.dishes || []).slice(0, 3).map(k => this.img(Art.dish(k), 5)).join('')}</div>` : p.kind === 'discover' ? `<div class="bigpic glow combo">${cb ? `${this.img(pic(cb.a), 4)}<span>＋</span>${this.img(pic(cb.b), 4)}` : this.img(Art.icon('star'), 7)}</div><div class="rays"></div>` : `<div class="bigpic">${this.img(Art.icon(p.icon || 'cal'), 6)}</div>`;
      this.mdl.innerHTML = `<div class="mc ${p.kind}"><p class="lbl">${p.title}</p>${ic}${p.big ? `<h2>${p.big}</h2>` : ''}<p>${p.text || ''}</p><button class="btn go big" data-a="ok">好！</button></div>`;
    } else if (p.k === 'contest') {
      Music.play('contest');
      const ks = Game.known().sort((a, b) => Game.contestScore(b) - Game.contestScore(a));
      this.mdl.innerHTML = `<div class="mc contest"><p class="lbl">第 ${Game.year()} 屆</p><h2>夜市小吃大賽</h2><p>選一道菜參賽！評審看的是美味度、改良等級和店裡最強廚師的廚藝。</p>
        <div class="clist">${ks.slice(0, 8).map(k => `<button data-a="contest" data-v="${k}">${this.img(Art.dish(k), 3)}<b>${DISH[k].n}</b><span>Lv${Game.S.dishes[k].lv} ${this.stars(Game.dishQ(k))}</span><em>${Math.round(Game.contestScore(k))}</em></button>`).join('')}</div></div>`;
    } else if (p.k === 'award') {
      Music.play('award'); Snd.play('fanfare');
      Game.applyAward(p);
      const med = p.a.medal ? this.img(Art.fac({ G: 'tG', S: 'tS', B: 'tB' }[p.a.medal]), 6) : this.img(Art.icon('star'), 6);
      this.mdl.innerHTML = `<div class="mc award"><p class="lbl">第 ${p.y} 年 年度頒獎典禮</p><div class="bigpic glow">${med}</div><h2>${p.a.t}</h2>
        <p>年底排名 <b>第 ${p.rank} 名</b>・年營業額 ${money(p.sales)}・平均滿意度 ${p.sat}</p><p class="good">獎金 ${money(p.a.m)}・人氣 +${p.a.p}</p>
        ${p.newU ? `<p class="good">獲得裝飾「${p.newU}」！到建造 → 裝飾擺出來吧</p>` : ''}${p.legacy ? `<p class="good">傳承點數 +${p.legacy}</p>` : ''}<button class="btn go big" data-a="ok">新的一年也要加油！</button></div>`;
    } else if (p.k === 'ending') {
      Music.play('award');
      const S = Game.S;
      this.mdl.innerHTML = `<div class="mc ending"><p class="lbl">${p.rank === 1 ? 'CONGRATULATIONS' : 'TEN YEARS'}</p><h2>${p.rank === 1 ? '夜市之王誕生！' : '十年有成'}</h2>
        <p>${p.rank === 1 ? `從一台小小的攤車開始，「${esc(S.shop)}」終於站上了夜市排行榜的第一名！` : `「${esc(S.shop)}」在夜市裡奮鬥了整整十年，成為大家心中的老味道。`}</p>
        <table class="kv"><tr><td>經營年數</td><td>${p.y} 年</td></tr><tr><td>累積客人</td><td>${num(S.st.cust)} 位</td></tr><tr><td>累積營業額</td><td>${money(S.st.sales)}</td></tr><tr><td>研發菜色</td><td>${Game.nKnown()} / ${DISH_ALL.length}</td></tr><tr><td>擺設組合</td><td>${Object.keys(S.combos).length} / ${COMBOS.length}</td></tr><tr><td>目標達成</td><td>${Object.keys(S.goals).length} / ${GOALS.length}</td></tr></table>
        <p>故事還沒結束，夜市的燈每天晚上都會亮起來。<br>接下來可以開<b>分店</b>、辦<b>煙火晚會</b>、研究<b>秘方</b>，或是到選單把店<b>傳承</b>給下一代。</p><p class="good">得到傳承點數 +5！標題畫面可以解鎖新的挑戰模式。</p><button class="btn go big" data-a="ok">繼續經營</button></div>`;
    }
  },
  // 挑戰關卡的開場說明和結算
  chalGoals(C, got, live) {
    return `<ol class="cgoals">${C.g.map((g, i) => { const ok = got && got[i], v = live ? Game.chalVal(g) : null; return `<li class="${ok ? 'ok' : ''}"><i>${ok ? '★' : '☆'}</i><span>${i ? '' : '<b>過關</b>'}${Game.chalText(g)}${v && !ok && g.k !== 'dish' && g.k !== 'lv' ? `<small>${g.k === 'rank' ? '目前第 ' + v[0] + ' 名' : g.k === 'money' ? '目前 ' + money(v[0]) : num(Math.max(0, v[0])) + ' / ' + num(v[1])}</small>` : ''}</span></li>`; }).join('')}</ol>`;
  },
  // 員工之間的小事件：好搭檔、較勁、進修班、挖角（第一次發生時阿德伯會說明）
  staffModal(p) {
    const S = Game.S, a = Game.sById(p.a), b = Game.sById(p.b);
    const pt = s2 => `<div>${this.img(Art.portrait(makeLook(s2.seed, 'staff', s2.job), 'happy'), 3)}<b>${esc(s2.name)}</b></div>`;
    S.seen = S.seen || {};
    const first = !S.seen[p.t]; S.seen[p.t] = 1;
    const tip = t => first ? `<div class="sp ade">${this.img(Art.portrait(Guide.look(), 'happy'), 2)}<div class="say"><b>阿德伯</b><p>${t}</p></div></div>` : '';
    let h = '';
    Snd.play('event');
    if (p.t === 'pal') {
      if (!a || !b) return false;
      h = `<p class="lbl">員工的感情</p><div class="vs">${pt(a)}<span class="heart">♥</span>${pt(b)}</div><h2>變成好搭檔了！</h2><p>${esc(a.name)} 和 ${esc(b.name)} 每天一起工作，越來越有默契。<br><b class="good">兩個人同時上班時，動作都快 10%</b></p>
        ${tip('一起工作久了，員工之間就會培養出默契。別隨便把好搭檔解雇喔！在「員工」裡可以看到誰跟誰是搭檔。')}<button class="btn go big" data-a="ok">感情真好！</button>`;
    } else if (p.t === 'rival') {
      if (!a || !b) return false;
      h = `<p class="lbl">員工在較勁</p><div class="vs">${pt(a)}<span>VS</span>${pt(b)}</div><h2>誰比較厲害？</h2><p>${esc(a.name)}：「我做得比較快！」　${esc(b.name)}：「才怪！」</p>
        <div class="qbox"><b>讓他們比兩週</b><small class="good">兩個人動作都快 20%，贏的人能力 +3、輸的 +1，比完說不定會變成好搭檔</small><small class="bad">比賽期間比較容易累</small></div>
        ${tip('員工之間偶爾會互相較勁。讓他們比一比可以激發潛力；不想冒險的話，也可以勸他們和好。')}
        <div class="row c"><button class="btn" data-a="sev" data-v="calm">勸他們和好</button><button class="btn go big" data-a="sev" data-v="race">比一場吧！</button></div>`;
    } else if (p.t === 'raceEnd') {
      if (!a || !b) return false;
      const nm = { cook: '廚藝', serv: '服務', charm: '魅力' }[p.key];
      h = `<p class="lbl">較勁結果</p><div class="vs">${pt(a)}<span>WIN</span>${pt(b)}</div><h2>${esc(a.name)} 贏了！</h2><p>工作量 ${num(p.sa)} 比 ${num(p.sb)}。${esc(a.name)} 的${nm} +3、${esc(b.name)} +1。</p>${p.pal ? `<p class="good">不打不相識，兩個人變成好搭檔了！</p>` : ''}<button class="btn go big" data-a="ok">好比賽！</button>`;
    } else if (p.t === 'course') {
      const nm = { cook: '廚藝', serv: '服務', charm: '魅力' }[p.kind], list = S.staff.filter(x => !x.away).sort((x, y) => y.lv - x.lv).slice(0, 6);
      h = `<p class="lbl">進修班招生</p><div class="bigpic">${this.img(Art.icon('book'), 6)}</div><h2>週末${nm}進修班</h2><p>派一個人去上一週的課（這週不在店裡），${nm}會大幅提升，還會多一些經驗。學費 ${money(p.cost)}。</p>
        <div class="clist sev">${list.map(x => `<button data-a="sev" data-v="${x.uid}" ${S.money < p.cost ? 'disabled' : ''}>${this.img(Art.portrait(makeLook(x.seed, 'staff', x.job), 'happy'), 2)}<b>${esc(x.name)}</b><span>Lv${x.lv}・${nm} ${x[p.kind]}</span></button>`).join('')}</div>
        ${tip('進修班可以讓員工一口氣變強，但上課那一週店裡會少一個人，要挑不忙的時候喔。')}<button class="btn" data-a="ok">這次不用了</button>`;
    } else if (p.t === 'poach') {
      if (!a) return false;
      h = `<p class="lbl">挖角！</p><div class="vs">${pt(a)}</div><h2>${esc(p.rival)}想挖角 ${esc(a.name)}</h2><p>「來我們這裡吧，薪水給你多三成！」${esc(a.name)} 有點心動……</p>
        <div class="qbox"><b>加薪留人</b><small>月薪 +${money(p.raise)}（要有 ${money(p.raise * 3)} 以上的現金）・三項能力 +1、以後不會再被挖角</small></div>
        <div class="qbox"><b>祝他順利</b><small>收到轉職費 ${money(a.sal * 4)}，但會少一個 Lv${a.lv} 的員工</small></div>
        ${tip('員工越厲害，對手越想挖角。留不留人，要看店裡缺不缺他。')}
        <div class="row c"><button class="btn" data-a="sev" data-v="go">祝他順利</button><button class="btn go big" data-a="sev" data-v="keep">加薪留人</button></div>`;
    }
    this.mdl.innerHTML = `<div class="mc staffev">${h}</div>`;
    return true;
  },
  chalModal(p) {
    const S = Game.S;
    if (p.k === 'chalIntro') {
      const C = CHAL.find(c => c.id === p.id), M = MAPS[C.map], sc = C.scen && SCENARIOS.find(x => x.id === C.scen);
      Snd.play('event');
      this.mdl.innerHTML = `<div class="mc chal"><p class="lbl">挑戰關卡・${M.n}</p><div class="cscene">${this.img(Art.mapScene(C.map), 3)}</div><h2>${C.n}</h2>
        <div class="sp">${this.img(Art.portrait(Guide.look(), 'happy'), 2)}<div class="say"><b>阿德伯</b><p>${C.d}</p></div></div>
        <p class="mrule">${C.map !== 'city' ? `<b>${M.n}：</b>${M.d}` : ''}${sc ? `<b>${sc.n}：</b>${sc.d}` : ''}</p>
        ${this.chalGoals(C)}<p class="mute">期限 ${C.y} 年（${Math.round(C.y * 48)} 週）・第一個目標達成就過關，三個都達成是 ★★★</p><button class="btn go big" data-a="ok">開始挑戰！</button></div>`;
      return;
    }
    const C = CHAL.find(c => c.id === p.id);
    Music.play(p.stars ? 'award' : 'title');
    this.mdl.innerHTML = `<div class="mc chal ${p.stars ? 'award' : ''}"><p class="lbl">${p.stars ? (p.early ? '提前過關！' : '挑戰成功！') : '挑戰失敗…'}</p><h2>${C.n}</h2>
      <div class="bstars">${[0, 1, 2].map(i => `<i class="${i < p.stars ? 'on' : ''}" style="--d:${0.25 + i * 0.35}s">★</i>`).join('')}</div>
      ${this.chalGoals(C, S.chal.got, true)}
      ${p.gain ? `<p class="good">新的星星 +${p.gain}・傳承點數 +${p.gain}</p>` : p.stars ? '<p class="mute">跟上次一樣好！</p>' : '<p class="mute">過關目標沒有達成。換個做法再試一次吧！</p>'}
      <p class="mute">可以繼續經營這家店，或回到標題畫面挑戰其他關卡。</p>
      <div class="row c"><button class="btn" data-a="toTitle">回標題選關</button><button class="btn go big" data-a="ok">繼續經營</button></div></div>`;
    if (p.stars) setTimeout(() => Snd.play('level'), 600);
  },
  contestGo(id) {
    const r = Game.runContest(id);
    Snd.play('drum');
    const mx = Math.max(...r.rows.map(x => x.s));
    this.mdl.innerHTML = `<div class="mc contest"><p class="lbl">評審結果</p><h2>夜市小吃大賽</h2><div class="cres">${r.rows.map((x, i) => `<div class="${x.me ? 'me' : ''}" style="--d:${(r.rows.length - i) * 0.35}s"><span>${i + 1}</span><b>${esc(x.n)}<small>${x.dish}</small></b><i><em style="width:${x.s / mx * 100}%"></em></i><strong>${Math.round(x.s)}</strong></div>`).join('')}</div>
      <p class="res">${r.place === 1 ? '🏆 冠軍！' : '第 ' + r.place + ' 名'}　獎金 ${money(r.prize)}・人氣 +${r.pop}</p>${r.unlock ? `<p class="good">獲得裝飾「${r.unlock}」！</p>` : ''}<button class="btn go big" data-a="ok">好！</button></div>`;
    setTimeout(() => Snd.play(r.place === 1 ? 'fanfare' : r.place <= 3 ? 'level' : 'fail'), 1900);
  },
  nextModal() {
    Snd.play('click');
    this.modal = null; this.mdl.hidden = true; this.mdl.innerHTML = '';
    Main.seasonMusic();
    this.refreshHud();
    if (this.panel) this.renderPanel();
  },

  // ---------- 提示 ----------
  toast(t, k = '') {
    if (Main.state !== 'play') return;
    const d = document.createElement('div'); d.className = 'toast ' + k; d.textContent = t;
    this.toasts.appendChild(d);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 3200); setTimeout(() => d.remove(), 3700);
  },
  review(r) {
    if (Main.state !== 'play') return;
    const el = $('#review');
    el.innerHTML = `${this.img(Art.icon('f' + r.s), 2)}<span><b>${r.t}</b>「${esc(r.txt)}」</span>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  // 員工升級的小卡片（左下角，跟評論同一區，會蓋過舊的）
  lvCard(s, stat, a) {
    if (Main.state !== 'play') return;
    const now = performance.now(); if (now - (this._lvT || 0) < 1200) return; this._lvT = now;
    const el = $('#lvcard'), L = a ? a.look : makeLook(s.seed, 'staff', s.job), nm = { cook: '廚藝', serv: '服務', charm: '魅力' }[stat];
    el.innerHTML = `<div class="pt">${this.img(Art.portrait(L, 'happy'), 2)}</div><span><small>員工升級</small><b>${esc(s.name)} <i class="lv">Lv${s.lv}</i></b><em>${nm} ${s[stat]}・${s.lv % 5 === 0 ? '里程碑！' : '繼續加油！'}</em></span>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    if (s.lv % 5 === 0) { Snd.play('fanfare'); Game.flash = 0.35; }
  },
  week() { if (this.panel && this.panel !== 'sys' && this.panel !== 'lab') this.renderPanel(); },
  autosave() { this.save(this.slot, false); },
  save(i, loud) {
    const ok = Main.saveSlot(i);
    if (ok) { this.slot = i; Prefs.d.lastSlot = i; Prefs.save(); }
    if (loud) this.toast(ok ? `已存到存檔 ${i + 1}` : '存檔失敗（瀏覽器不允許）', ok ? 'good' : 'bad');
  },
  loadSlot(i) { if (Main.loadSlot(i)) { this.slot = i; this.closePanel(); this.toast('讀取完成', 'good'); } else this.toast('讀取失敗', 'bad'); },
};

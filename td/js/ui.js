'use strict';
// 守塔奇兵：介面（面板、選單、結算畫面）。用到 main.js 的 App。
const $ = id => document.getElementById(id);
const fmt = n => n >= 100 ? String(Math.round(n)) : n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '');
const pct = f => Math.round(f * 100) + '%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ───────── 星星與進度 ─────────
const Prog = {
  rec(i) { return Store.data.levels[i] || null; },
  levelStars(i) { const r = this.rec(i); return r ? (r.stars || 0) + (r.hard ? 2 : 0) : 0; },
  chalStars(i) { const c = Store.data.chal[i]; return c ? CHAL_ORDER.filter(k => c[k]).length : 0; },
  endlessStars(i) { return Math.min(5, Math.floor((Store.data.endless[i] || 0) / 10)); },
  total() { let n = 0; for (let i = 0; i < LEVELS.length; i++) n += this.levelStars(i) + this.endlessStars(i) + this.chalStars(i); return n; },
  max() { return LEVELS.length * 13; },
  spent() { let n = 0; for (const m of META) { const r = Store.data.meta[m.id] || 0; for (let i = 0; i < r; i++) n += m.cost[i]; } return n; },
  avail() { return this.total() - this.spent(); },
  cleared() { let c = 0; for (let i = 0; i < LEVELS.length; i++) if (this.rec(i) && this.rec(i).stars) c = i + 1; return c; },
  unlocked(i) { return i === 0 || !!(this.rec(i - 1) && this.rec(i - 1).stars); },
  endlessOk(i) { return this.cleared() > ENDLESS_UNLOCK && !!(this.rec(i) && this.rec(i).stars); },
};

const UI = (() => {
  let lastPanelKey = '', lastPv = '', msg = null, msgT = 0;
  const hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function say(html, sec) { msg = html; msgT = sec || 2.5; lastTipHtml = ''; }

  // ───────── 技能圖示 ─────────
  function skillIcon(kind) {
    const c = document.createElement('canvas'), S = 72; c.width = S; c.height = S;
    const x = c.getContext('2d');
    if (kind === 'meteor') {
      const g = x.createLinearGradient(10, 10, 50, 50); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(1, '#ff9a3c');
      x.fillStyle = g; x.beginPath(); x.moveTo(8, 6); x.lineTo(46, 32); x.lineTo(32, 46); x.closePath(); x.fill();
      x.shadowColor = '#ff7a2a'; x.shadowBlur = 12;
      x.fillStyle = '#ff6a2a'; x.beginPath(); x.arc(44, 44, 16, 0, 7); x.fill();
      x.fillStyle = '#ffd36b'; x.beginPath(); x.arc(40, 40, 8, 0, 7); x.fill();
    } else {
      x.strokeStyle = '#dff8ff'; x.lineWidth = 5; x.lineCap = 'round'; x.shadowColor = '#7fe0ff'; x.shadowBlur = 10;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, cx = 36, cy = 36;
        x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        const mx = cx + Math.cos(a) * 16, my = cy + Math.sin(a) * 16;
        x.moveTo(mx, my); x.lineTo(mx + Math.cos(a + 0.7) * 8, my + Math.sin(a + 0.7) * 8);
        x.moveTo(mx, my); x.lineTo(mx + Math.cos(a - 0.7) * 8, my + Math.sin(a - 0.7) * 8);
        x.stroke();
      }
    }
    return c.toDataURL();
  }

  // ───────── 商店 ─────────
  function buildShop() {
    const box = $('shop'); box.innerHTML = '';
    for (const k of TOWER_ORDER) {
      const d = TOWERS[k];
      const b = document.createElement('button');
      b.className = 'tb'; b.dataset.k = k;
      b.innerHTML = `<kbd>${d.key}</kbd><img alt="" src="${Render.icon('tower', k, 0)}"><span class="nm">${d.name}</span><span class="pr"><i></i><em>${d.tiers[0].cost}</em></span>`;
      b.addEventListener('click', () => App.shopTap(k));
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') App.shopHover(k); });
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') App.shopHover(null); });
      box.appendChild(b);
    }
  }
  function refreshShop(G) {
    for (const b of $('shop').children) {
      const k = b.dataset.k, d = TOWERS[k];
      const locked = !G.towersAvail.includes(k);
      const cost = tierCost(G, k, 0);
      b.classList.toggle('locked', locked);
      b.classList.toggle('poor', !locked && G.gold < cost);
      b.classList.toggle('sel', App.ui.armed === k || App.ui.pending === k);
      const em = b.querySelector('.pr');
      const want = locked ? `第 ${d.unlock + 1} 關解鎖` : '<i></i><em>' + cost + '</em>';
      if (em._w !== want) { em._w = want; em.innerHTML = want; }
    }
  }

  // ───────── 塔資訊 ─────────
  function statList(G, t, st) {
    const k = t.k, out = [];
    if (k === 'banner') {
      out.push(['傷害加成', '+' + pct(st.buffDmg + G.M.banner)]);
      if (st.buffRange) out.push(['射程加成', '+' + pct(st.buffRange)]);
      if (st.buffRate) out.push(['攻速加成', '+' + pct(st.buffRate)]);
      out.push(['範圍', st.range.toFixed(1)]);
      if (st.giveAir) out.push(['砲塔可打空中', '']);
      return out;
    }
    if (k === 'mine') {
      out.push(['每波', '+' + Math.round(st.gold * G.M.mine)]);
      if (st.interest) out.push(['利息', pct(st.interest)]);
      return out;
    }
    let dmg = fmt(st.dmg);
    if (st.multi) dmg += ' ×' + st.multi;
    if (st.missiles) dmg += ' ×' + st.missiles;
    out.push(['傷害', dmg]);
    out.push(['每秒', st.rate.toFixed(2).replace(/0$/, '')]);
    out.push(['射程', st.range.toFixed(1)]);
    if (st.splash && !st.aura) out.push(['爆炸', st.splash.toFixed(1)]);
    if (st.slow) out.push(['減速', pct(st.slow)]);
    if (st.chain) out.push(['連鎖', st.chain]);
    if (st.crit) out.push(['暴擊', pct(st.crit)]);
    if (st.pierce) out.push(['穿甲', pct(st.pierce)]);
    if (!st.air) out.push(['只打地面', '']);
    return out;
  }
  function diffText(G, t, next) {
    const cur = t.st, k = t.k, parts = [];
    const nst = Object.assign({}, next);
    const M = G.M;
    if (nst.dmg && cur.dmg) { const nd = nst.dmg * M.dmg[k] * (1 + t.buff.dmg); parts.push(`傷害 ${fmt(cur.dmg)}→${fmt(nd)}`); }
    if (nst.rate && cur.rate && Math.abs(nst.rate * (1 + t.buff.rate) - cur.rate) > 0.01) parts.push(`攻速 ${cur.rate.toFixed(2).replace(/0$/, '')}→${(nst.rate * (1 + t.buff.rate)).toFixed(2).replace(/0$/, '')}`);
    const nr = nst.range * M.range * (1 + t.buff.range);
    if (Math.abs(nr - cur.range) > 0.05) parts.push(`射程 ${cur.range.toFixed(1)}→${nr.toFixed(1)}`);
    if (nst.slow && cur.slow && nst.slow !== cur.slow) parts.push(`減速 ${pct(cur.slow)}→${pct(nst.slow)}`);
    if (nst.buffDmg !== undefined) parts.push(`加成 ${pct(cur.buffDmg + M.banner)}→${pct(nst.buffDmg + M.banner)}`);
    if (nst.gold) parts.push(`每波 ${Math.round(cur.gold * M.mine)}→${Math.round(nst.gold * M.mine)}`);
    if (nst.splash && cur.splash && nst.splash !== cur.splash && k === 'cannon') parts.push(`爆炸 ${cur.splash.toFixed(1)}→${(nst.splash * M.splash).toFixed(1)}`);
    return parts.join('、');
  }
  function buildInfo(G, t) {
    const d = TOWERS[t.k], st = t.st;
    const name = t.tier === 3 ? d.spec[t.spec].name : d.name;
    const lvl = t.tier === 3 ? '專精' : 'Lv ' + (t.tier + 1);
    let h = `<div class="ti-head"><img alt="" src="${Render.icon('tower', t.k, t.tier, t.spec)}"><div class="ti-name"><b>${esc(name)}</b><span>${lvl}${d.support ? '' : ` · 擊倒 ${t.kills}`}</span></div><button class="ti-x" data-act="close" aria-label="關閉">✕</button></div>`;
    h += '<div class="ti-stats">' + statList(G, t, st).map(([a, b]) => `<span>${a}${b !== '' ? ' <b>' + b + '</b>' : ''}</span>`).join('') + '</div>';
    if (t.tier < 2) {
      const nx = d.tiers[t.tier + 1], c = upCost(G, t);
      h += `<div class="ti-ups"><button class="up" data-act="up" data-spec="-1" data-cost="${c}"><b>升級到 Lv ${t.tier + 2}</b><small>${diffText(G, t, nx) || '全面強化'}</small><span class="pr">${c}</span></button></div>`;
    } else if (t.tier === 2) {
      h += '<div class="ti-ups two">' + d.spec.map((sp, i) => {
        const c = upCost(G, t, i);
        return `<button class="up spec" data-act="up" data-spec="${i}" data-cost="${c}"><b>${sp.name}</b><small>${esc(sp.desc)}</small><span class="pr">${c}</span></button>`;
      }).join('') + '</div>';
    } else {
      h += `<div class="ti-ups"><div class="maxed">${esc(d.spec[t.spec].desc)}<br>已經是最強的型態了</div></div>`;
    }
    h += '<div class="ti-row">';
    if (!d.support) h += '<div class="modes">' + TARGET_MODES.map(([m, n]) => `<button data-act="mode" data-mode="${m}" class="${t.mode === m ? 'on' : ''}">${n}</button>`).join('') + '</div>';
    else h += `<div class="ti-note" style="flex:1">${esc(d.desc)}</div>`;
    h += `<button class="sell" data-act="sell">賣出 <b>+${sellValue(G, t)}</b></button></div>`;
    if (!d.support) h += `<div class="ti-note">${esc(d.desc)}</div>`;
    const box = $('info'); box.innerHTML = h;
  }
  function refreshInfo(G, t) {
    for (const b of $('info').querySelectorAll('.up')) b.classList.toggle('poor', G.gold < +b.dataset.cost);
    const sb = $('info').querySelector('.sell b'); if (sb) { const v = '+' + sellValue(G, t); if (sb.textContent !== v) sb.textContent = v; }
  }

  // ───────── 下一波預覽 ─────────
  function seenBefore(G, k, upto) {
    for (let i = 0; i < upto; i++) if (G.waves[i] && G.waves[i].groups.some(g => g.k === k)) return true;
    return false;
  }
  function refreshPreview(G) {
    const info = nextWaveInfo(G);
    App.ui.nextInfo = info;
    const key = info ? info.n + ':' + G.li + ':' + G.endless : 'none' + G.wave;
    if (key === lastPv) return;
    lastPv = key;
    const box = $('pv');
    if (!info) { box.innerHTML = `<div class="lb">最後一波<b>撐住！</b></div>`; return; }
    let h = `<div class="lb">下一波<b>${info.n + 1}${G.endless ? '' : '/' + G.nWaves}</b></div>`;
    for (const [k, n] of Object.entries(info.sum)) {
      const isNew = !G.endless && !seenBefore(G, k, info.n);
      h += `<span class="en${ENEMIES[k].boss ? ' boss' : ''}${isNew ? ' new' : ''}" data-k="${k}"><img alt="" src="${Render.icon('enemy', k)}"><span>${n > 1 ? '×' + n : ''}</span></span>`;
    }
    box.innerHTML = h;
  }

  // ───────── 提示列 ─────────
  let lastTipHtml = '';
  function tipHtml(G) {
    const ui = App.ui;
    if (msg && msgT > 0) return msg;
    if (ui.aiming) return '點地圖選隕石落下的位置。<b>再按一次</b>技能鈕取消。';
    const k = ui.pending || ui.armed;
    if (k) {
      const d = TOWERS[k];
      return `<b>${d.name}</b>：${esc(d.desc)}${ui.pending ? ' 再點一次確認建造。' : ' 點空地建造。'}`;
    }
    if (ui.selTile) return '選一座塔蓋在這裡。';
    if (ui.selTower) return '';
    if (G.li === 0 && !G.endless && G.wave < 1) {
      if (!G.towers.length) return '點路旁的<b>空草地</b>，再選一座塔來蓋。';
      if (G.state === 'ready') return '準備好就按右邊的<b>開始</b>，或點地圖上閃爍的骷髏。';
    }
    const info = ui.nextInfo;
    if (info && !G.endless) {
      for (const k of Object.keys(info.sum)) if (!seenBefore(G, k, info.n)) return `<b>新敵人 · ${ENEMIES[k].name}</b>：${esc(ENEMIES[k].desc)}`;
    }
    if (G.endless && G.mod) return `<b>詞綴 · ${ENDLESS_MODS[G.mod].name}</b>：${ENDLESS_MODS[G.mod].desc}`;
    if (G.chal && G.wave < 1) return `<b>挑戰 · ${CHALLENGES[G.chal].name}</b>：${G.chal === 'limit' ? '只能用 ' + G.L.limit.map(k => TOWERS[k].name).join('、') : CHALLENGES[G.chal].desc}`;
    if (G.state === 'run' && G.nextT !== null && G.wave < G.nWaves - 1) return `提早叫下一波可以多拿 <b>${earlyBonus(G)}</b> 金幣。`;
    return '點塔可以升級、換目標或賣掉。';
  }

  // ───────── 每一幀 ─────────
  let lastLives = null, lastGold = null;
  function tick(G, dt) {
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) { msg = null; lastTipHtml = ''; } }
    setText('hLives', String(G.lives));
    setText('hGold', String(Math.floor(G.gold)));
    setText('hWave', G.endless ? String(Math.max(0, G.wave + 1)) : `${Math.max(0, G.wave + 1)}/${G.nWaves}`);
    if (lastLives !== null && G.lives < lastLives) { const c = $('cLives'); c.classList.remove('hurt'); void c.offsetWidth; c.classList.add('hurt'); }
    if (lastGold !== null && G.gold >= lastGold + 20) { const c = $('cGold'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    lastLives = G.lives; lastGold = G.gold;
    // 技能
    for (const [id, key] of [['skMeteor', 'meteor'], ['skFreeze', 'freeze']]) {
      const s = G.skills[key], el = $(id);
      el.classList.toggle('locked', !s.on);
      el.classList.toggle('aim', key === 'meteor' && App.ui.aiming);
      el.classList.toggle('ready', s.on && s.cd <= 0 && G.state === 'run');
      el.style.setProperty('--cd', s.on ? (s.cd / s.max).toFixed(3) : 1);
      const t = s.on && s.cd > 0 ? String(Math.ceil(s.cd)) : '';
      const cn = el.querySelector('.cdn'); if (cn.textContent !== t) cn.textContent = t;
    }
    // 下一波按鈕
    const nb = $('bNext');
    let lbl, dis = false, go = false;
    if (G.state === 'ready') { lbl = '開始！<small>第 1 波</small>'; go = true; }
    else if (G.state !== 'run') { lbl = G.state === 'won' ? '勝利' : '失守'; dis = true; }
    else if (G.nextT !== null && G.wave < G.nWaves - 1) { lbl = `下一波<small>+${earlyBonus(G)} · ${Math.ceil(G.nextT)}秒</small>`; }
    else if (G.wave >= G.nWaves - 1) { lbl = '最後一波'; dis = true; }
    else { lbl = `第 ${G.wave + 1} 波<small>出兵中</small>`; dis = true; }
    if (nb._l !== lbl) { nb._l = lbl; nb.innerHTML = lbl; }
    nb.disabled = dis; nb.classList.toggle('go', go);
    // 速度
    setText('bSpeed', App.speed + '×');
    $('bSpeed').classList.toggle('on', App.speed > 1);
    refreshPreview(G);
    // 面板
    const t = App.ui.selTower;
    const key = t ? 't' + t.id + ':' + t.tier + ':' + t.mode + ':' + G.towers.length : 'shop';
    if (key !== lastPanelKey) {
      lastPanelKey = key;
      $('shop').hidden = !!t; $('info').hidden = !t;
      if (t) buildInfo(G, t);
    }
    if (t) refreshInfo(G, t); else refreshShop(G);
    const th = tipHtml(G);
    if (th !== lastTipHtml) { lastTipHtml = th; $('tip').innerHTML = th; }
  }
  function resetPanel() { lastPanelKey = ''; lastPv = ''; lastTipHtml = ''; msg = null; lastLives = null; lastGold = null; }

  // ───────── 選單層 ─────────
  const OVS = ['ovTitle', 'ovLevels', 'ovBrief', 'ovMeta', 'ovPause', 'ovResult', 'ovHelp', 'ovCodex'];
  function show(...ids) { for (const o of OVS) $(o).hidden = !ids.includes(o); }
  function syncToggles() {
    for (const b of document.querySelectorAll('.tog')) {
      const on = !!Store.data[b.dataset.opt];
      b.classList.toggle('on', on); b.querySelector('b').textContent = on ? '開' : '關';
    }
  }
  function starsHtml(n, max) { let h = ''; for (let i = 0; i < (max || 3); i++) h += `<span class="${i < n ? 'on' : ''}">★</span>`; return h; }

  function levels() {
    $('lStars').textContent = `★ ${Prog.total()} / ${Prog.max()}`;
    const box = $('wmap'); box.innerHTML = '';
    const w = Math.max(200, box.clientWidth), h = Math.max(200, box.clientHeight);
    const m = WorldMap.draw(w, h);
    box.appendChild(m.canvas);
    let cur = LEVELS.findIndex((L, i) => Prog.unlocked(i) && !(Prog.rec(i) && Prog.rec(i).stars));
    LEVELS.forEach((L, i) => {
      const ok = Prog.unlocked(i), r = Prog.rec(i);
      const b = document.createElement('button');
      b.className = 'wnode' + (ok ? '' : ' locked') + (i === cur ? ' cur' : '') + (r && r.stars ? ' done' : '');
      b.style.left = m.pts[i][0] + 'px'; b.style.top = m.pts[i][1] + 'px';
      const eb = Prog.endlessOk(i) ? `<em class="inf">${Store.data.endless[i] ? '無盡 ' + Store.data.endless[i] + ' 波' : '無盡模式'}</em>` : '';
      b.innerHTML = `<span class="wn-num">${ok ? i + 1 : '🔒'}</span><span class="wn-lbl"><b>${L.name}</b><span class="stars">${starsHtml(r ? r.stars : 0)}</span>${r && r.hard ? '<em>困難</em>' : ''}${Prog.chalStars(i) ? `<em class="ch">挑戰 ${Prog.chalStars(i)}/3</em>` : ''}${eb}</span>${i === cur ? '<i class="wn-flag"></i>' : ''}`;
      b.setAttribute('aria-label', `第 ${i + 1} 關 ${L.name}${ok ? '' : '（尚未解鎖）'}`);
      if (ok) b.addEventListener('click', () => { Snd.sfx('click'); brief(i); });
      else b.addEventListener('click', () => Snd.sfx('deny'));
      box.appendChild(b);
    });
  }
  function brief(li) {
    App.brief.li = li;
    const L = LEVELS[li], r = Prog.rec(li);
    const th = $('bThumb'); th.innerHTML = ''; th.appendChild(Render.thumb(li, 480, 300));
    $('bName').textContent = `${li + 1}. ${L.name}`;
    $('bEn').textContent = L.en;
    $('bStory').textContent = L.story;
    const foes = [...new Set(L.pool.map(p => p[0]).concat(L.boss ? [L.boss] : []).concat(L.midBoss ? [L.midBoss[1]] : []))];
    $('bInfo').textContent = `${L.waves} 波 · ${L.entries.length > 1 ? L.entries.length + ' 個入口' : L.paths.length > 1 ? '岔路' : '單一路線'}${L.boss ? ' · 有頭目' : ''}${r ? ' · 最佳 ' + '★'.repeat(r.stars) : ''}`;
    $('bFoes').innerHTML = foes.map(k => `<img alt="${ENEMIES[k].name}" title="${ENEMIES[k].name}" src="${Render.icon('enemy', k)}">`).join('');
    const e = Prog.endlessOk(li);
    $('bEndless').hidden = !e;
    if (e) $('bEndless').textContent = `無盡模式（最佳 ${Store.data.endless[li] || 0} 波）`;
    // 挑戰
    const cb = $('bChal'), done = Store.data.chal[li] || {};
    if (!(r && r.stars)) cb.innerHTML = '<p class="lbl">過關之後可以挑戰：限定塔種、無技能、鐵人（各得 1 顆星）</p>';
    else {
      cb.innerHTML = '<p class="lbl">挑戰（各得 1 顆星，不影響原本的星星）</p><div class="chal-row">' + CHAL_ORDER.map(c => {
        const d = c === 'limit' ? '只能用 ' + L.limit.map(k => TOWERS[k].name).join('、') : CHALLENGES[c].desc;
        return `<button class="ch-b${done[c] ? ' done' : ''}" data-c="${c}"><b>${CHALLENGES[c].name}</b><small>${esc(d)}</small><i>★</i></button>`;
      }).join('') + '</div>';
      for (const b of cb.querySelectorAll('.ch-b')) b.addEventListener('click', () => { Snd.init(); Snd.sfx('click'); App.startLevel(li, 'normal', false, b.dataset.c); });
    }
    syncDiff();
    show('ovLevels', 'ovBrief');
  }
  function syncDiff() {
    const d = App.brief.diff;
    for (const b of $('bDiff').children) b.classList.toggle('on', b.dataset.d === d);
    $('bDiffNote').textContent = DIFFS[d].note;
  }

  function meta() {
    const av = Prog.avail();
    $('mStars').textContent = `可用 ★ ${av}　總共 ${Prog.total()}`;
    const g = $('mGrid'); g.innerHTML = '';
    META_COLS.forEach((cn, ci) => {
      const col = document.createElement('div'); col.className = 'mcol';
      col.innerHTML = `<h3>${cn}</h3>`;
      for (const m of META.filter(x => x.col === ci)) {
        const r = Store.data.meta[m.id] || 0, max = m.cost.length;
        const reqOk = !m.req || (Store.data.meta[m.req[0]] || 0) >= m.req[1];
        const el = document.createElement('div');
        el.className = 'mn' + (r >= max ? ' maxed' : '') + (reqOk ? '' : ' lock') + (m.req ? ' req' : '');
        const pips = Array.from({ length: max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('');
        const desc = r >= max ? m.desc(r) : (r ? `目前：${m.desc(r)}<br>下一階：${m.desc(r + 1)}` : m.desc(1));
        const reqName = m.req ? META.find(x => x.id === m.req[0]).name : '';
        el.innerHTML = `<b>${m.name}</b><div class="pips">${pips}</div><small>${desc}</small>` +
          (r >= max ? '<small style="color:var(--gold)">已滿級</small>' : !reqOk ? `<small>需要先學「${reqName}」</small>` : `<button class="cost" ${av < m.cost[r] ? 'disabled' : ''}>★ ${m.cost[r]} 學習</button>`);
        const btn = el.querySelector('.cost');
        if (btn) btn.addEventListener('click', () => {
          if (Prog.avail() < m.cost[r]) return;
          Store.data.meta[m.id] = r + 1; Store.save(); Snd.sfx('spec'); meta(); Ach.meta();
        });
        col.appendChild(el);
      }
      g.appendChild(col);
    });
  }

  function help(back) {
    const tw = TOWER_ORDER.map(k => `<div><img alt="" src="${Render.icon('tower', k, 1)}"><span><b>${TOWERS[k].name}</b>${esc(TOWERS[k].desc)}</span></div>`).join('');
    const en = ['slime', 'runner', 'beetle', 'bat', 'golem', 'healer', 'shield', 'splitter', 'ogre', 'gargoyle', 'bossGolem', 'bossDragon', 'bossLich'].map(k => `<div><img alt="" src="${Render.icon('enemy', k)}"><span><b>${ENEMIES[k].name}</b>${esc(ENEMIES[k].desc)}</span></div>`).join('');
    $('helpBody').innerHTML = `<h2>怎麼玩</h2>
      <p>敵人會沿著道路走向你的城堡，漏掉一隻就扣生命。在路旁的空地蓋塔擋住牠們，撐過所有波次就過關。</p>
      <h3>基本操作</h3>
      <ul><li>點空地 → 選一座塔 → 再點一次確認建造。（電腦上也可以先按 <kbd>1</kbd>–<kbd>7</kbd> 再點地圖）</li>
      <li>點已經蓋好的塔：升級、選攻擊目標（最前／最後／最強／最近）或賣掉。Lv3 之後可以選兩種專精之一。</li>
      <li>一波出完之後會倒數，提早叫下一波能多拿金幣。右上角可以切換 1×／2×／3× 速度。</li>
      <li>隕石：點技能再點地圖。冰封：凍住全場。都有冷卻時間。</li>
      <li>過關剩越多生命，星星越多。星星可以到「天賦樹」換永久加成。</li>
      <li>過關之後可以挑戰「限定塔種」「無技能」「鐵人」，各多拿 1 顆星。無盡模式每 5 波會換一個詞綴。</li>
      <li>「圖鑑」裡可以看所有的塔、遇過的敵人和成就。</li></ul>
      <h3>防禦塔</h3><div class="hl">${tw}</div>
      <h3>敵人</h3><div class="hl">${en}</div>
      <h3 class="kb">鍵盤快捷鍵</h3>
      <p class="kb"><kbd>1</kbd>–<kbd>7</kbd> 選塔　<kbd>U</kbd>/<kbd>I</kbd> 升級（左／右專精）　<kbd>S</kbd> 賣掉　<kbd>T</kbd> 換目標　<kbd>Q</kbd> 隕石　<kbd>W</kbd> 冰封　<kbd>N</kbd> 下一波　<kbd>F</kbd> 速度　<kbd>空白</kbd> 暫停　<kbd>Esc</kbd> 取消　<kbd>M</kbd> 靜音</p>
      <button class="big" id="hClose">知道了</button>`;
    $('hClose').addEventListener('click', () => { Snd.sfx('click'); $('ovHelp').hidden = true; if (back) back(); });
    $('ovHelp').hidden = false;
  }

  function showResult(G, rec) {
    const won = G.state === 'won';
    $('rTitle').textContent = G.endless ? '無盡模式結束' : won ? '勝利！' : '城堡失守…';
    $('rSub').textContent = G.endless ? `${G.L.name} · 撐過 ${rec.cleared} 波${rec.newBest ? '　新紀錄！' : ''}` : `${G.L.name} · ${DIFFS[G.diff].name}`;
    const stars = $('rStars');
    stars.hidden = G.endless || !won;
    const spans = [...stars.children];
    spans.forEach(s => { s.className = ''; });
    if (won && !G.endless) {
      spans.forEach((s, i) => setTimeout(() => { s.classList.add('show'); if (i < G.stars) { s.classList.add('on'); Snd.sfx('star'); } }, 500 + i * 380));
    }
    const mins = Math.floor(G.t / 60), secs = Math.floor(G.t % 60);
    $('rStats').innerHTML = `<div><b>${G.stats.kills}</b>擊倒</div><div><b>${G.lives}/${G.maxLives}</b>剩下生命</div><div><b>${mins}:${String(secs).padStart(2, '0')}</b>遊戲時間</div><div><b>${G.stats.built}</b>蓋塔</div><div><b>${Math.max(0, G.wave + 1)}</b>波次</div><div><b>${G.stats.earned}</b>額外收入</div>`;
    const best = G.towers.filter(t => !TOWERS[t.k].support).sort((a, b) => b.dmgDone - a.dmgDone)[0];
    const mvp = $('rMvp');
    if (best && best.dmgDone > 0) { mvp.hidden = false; const nm = best.tier === 3 ? TOWERS[best.k].spec[best.spec].name : `${TOWERS[best.k].name} Lv${best.tier + 1}`; mvp.innerHTML = `<img alt="" src="${Render.icon('tower', best.k, best.tier, best.spec < 0 ? undefined : best.spec, 96)}"><div><small>最佳防禦塔</small><b>${esc(nm)}</b><span>造成 ${Math.round(best.dmgDone).toLocaleString()} 傷害 · 擊倒 ${best.kills}</span></div>`; }
    else mvp.hidden = true;
    $('rArt').src = Render.icon('castle', 'c', 0, undefined, 160);
    $('ovResult').classList.toggle('lost', !won && !G.endless);
    $('ovResult').classList.toggle('won', won);
    $('rReward').textContent = rec.chalNew ? `挑戰「${CHALLENGES[G.chal].name}」完成！獲得 ★ 1` : rec.gained > 0 ? `獲得 ★ ${rec.gained}！可以到天賦樹使用。` : (won || G.endless ? (G.chal && won ? '這個挑戰已經完成過了。' : '') : '調整一下塔的位置再試一次吧！');
    if (G.chal) { $('rTitle').textContent = won ? '挑戰成功！' : '挑戰失敗…'; $('rSub').textContent = `${G.L.name} · 挑戰「${CHALLENGES[G.chal].name}」`; }
    const u = $('rUnlock');
    if (rec.unlock) {
      u.hidden = false;
      u.innerHTML = `<img alt="" src="${Render.icon('tower', rec.unlock, 1)}"><div><b>新塔解鎖：${TOWERS[rec.unlock].name}</b><br><small>${esc(TOWERS[rec.unlock].desc)}</small></div>`;
    } else if (rec.endlessNew) {
      u.hidden = false; u.innerHTML = '<div><b>無盡模式解鎖！</b><br><small>已過關的地圖都可以挑戰無盡模式，每撐過 10 波得 1 顆星。</small></div>';
    } else u.hidden = true;
    const hasNext = won && !G.endless && G.li + 1 < LEVELS.length;
    $('rNext').hidden = !hasNext;
    $('rNext').textContent = '下一關';
    show('ovResult');
  }

  let achT = null;
  function achToast(id) {
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    const el = $('achToast');
    el.innerHTML = `<i class="medal on"></i><div><small>成就解鎖</small><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(achT); achT = setTimeout(() => { el.hidden = true; }, 3600);
  }
  return { achToast, buildShop, tick, resetPanel, show, syncToggles, levels, brief, syncDiff, meta, help, showResult, say, skillIcon, starsHtml };
})();

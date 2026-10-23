'use strict';
// 曉鐘傳說：野外選單、商店、旅店、教會、存檔
const mpos = (dx = 0, dy = 0) => () => ({ x: L.V.x + L.pad + dx, y: L.V.y + L.pad + dy });
function goldPanel() {
  return UI.panel(g => {
    const fs = L.FS, pad = L.pad, w = fs * 7.5, h = fs * 2.2, x = L.V.x + L.V.w - w - pad, y = L.V.y + L.V.h - h - pad;
    UI.win(g, x, y, w, h); UI.text(g, G.gold.toLocaleString() + ' G', x + w - pad * 1.4, y + h / 2, '#ffe9a8', fs, 'right', 'middle', 700);
    UI.text(g, '金幣', x + pad * 1.4, y + h / 2, '#9aa6d8', fs * 0.85, 'left', 'middle');
  });
}
function partyPanel(o = {}) {
  // 右側顯示全隊 HP/MP
  return UI.panel(g => {
    const fs = L.FS, pad = L.pad, n = G.party.length;
    const w = Math.min(fs * 11, L.V.w * 0.5), rh = fs * 3.1, h = rh * n + pad * 1.6;
    const x = L.V.x + L.V.w - w - pad, y = L.V.y + pad;
    UI.win(g, x, y, w, h);
    G.party.forEach((m, i) => {
      const s = Party.stats(m), yy = y + pad * 0.8 + i * rh;
      UI.text(g, Party.name(m), x + pad * 1.3, yy, m.hp <= 0 ? '#ff7a8a' : m.st.poison ? '#c08aff' : '#fff', fs * 0.95, 'left', 'top', 700);
      UI.text(g, 'Lv ' + m.lv + (m.hp <= 0 ? '　倒下' : m.st.poison ? '　中毒' : ''), x + w - pad * 1.3, yy + fs * 0.1, '#9aa6d8', fs * 0.8, 'right', 'top');
      UI.text(g, `HP ${m.hp}/${s.mhp}`, x + pad * 1.3, yy + fs * 1.3, '#dfe6ff', fs * 0.82);
      UI.text(g, `MP ${m.mp}/${s.mmp}`, x + w - pad * 1.3, yy + fs * 1.3, '#cfe0ff', fs * 0.82, 'right');
      bar(g, x + pad * 1.3, yy + fs * 2.35, w - pad * 2.6, Math.max(2, fs * 0.12), m.hp / s.mhp, m.hp < s.mhp / 4 ? '#ff7a4a' : '#5ae07a');
      if (o.hi && o.hi() === m) { g.strokeStyle = '#ffd76a'; g.lineWidth = 2; g.strokeRect(x + pad * 0.6, yy - fs * 0.25, w - pad * 1.2, rh - fs * 0.2); }
    });
  });
}
async function pickMember(title, filter = () => true, idx = 0) {
  const list = G.party.filter(filter);
  if (!list.length) return null;
  let cur = list[idx] || list[0];
  const pp = partyPanel({ hi: () => cur });
  const narrow = L.V.w < L.FS * 26;
  const pos = narrow ? () => ({ right: L.V.x + L.V.w - L.pad, y: L.V.y + L.pad * 2.6 + L.FS * 3.1 * G.party.length }) : mpos(L.FS * 6.5, 0);
  const i = await UI.menu({ items: list.map(m => ({ t: Party.name(m) })), title, pos, index: idx, onMove: k => { cur = list[k]; } });
  UI.remove(pp);
  return i < 0 ? null : list[i];
}

async function fieldMenu() {
  Snd.play('ok');
  const gp = goldPanel();
  const pp = partyPanel();
  let idx = 0;
  for (;;) {
    const items = [{ t: '道具' }, { t: '法術' }, { t: '裝備' }, { t: '狀態' }, { t: '隊伍' }, { t: '筆記' }, { t: '設定' }];
    if (G.party.length < 2) items[4].dis = true;
    const i = await UI.menu({ items, pos: mpos(), index: idx, keep: true, keepCursor: true });
    if (i < 0) break;
    idx = i;
    UI.remove(pp);
    if (i === 0) await itemMenu();
    if (i === 1) await spellMenu();
    if (i === 2) await equipMenu();
    if (i === 3) await statusMenu();
    if (i === 4) await orderMenu();
    if (i === 5) await notebook();
    if (i === 6) { const r = await settingsMenu(); if (r === 'title') { UI.clearGhosts(); UI.remove(gp); Game.toTitle(); return; } }
    UI.clearGhosts();
    UI.push(pp);
    if (Game.scene !== 'field') break;
  }
  UI.clearGhosts(); UI.remove(gp); UI.remove(pp);
}

// 野外使用法術或道具時借用戰鬥規則
function withB(fn) {
  for (const m of G.party) if (!m.b) m.b = { buf: { atk: 0, def: 0, agi: 0 }, sleep: 0, seal: 0, stun: 0, tmp: 1 };
  const ev = [];
  try { fn(ev); } finally { for (const m of G.party) if (m.b && m.b.tmp) delete m.b; }
  return ev.filter(e => e.t === 'msg').map(e => e.text);
}
async function itemMenu() {
  let idx = 0;
  for (;;) {
    const list = Bag.list().sort((a, b) => (ITEMS[a] && ITEMS[a].kind === 'key' ? 1 : 0) - (ITEMS[b] && ITEMS[b].kind === 'key' ? 1 : 0));
    if (!list.length) { await UI.say('什麼道具也沒有。'); return; }
    let desc = '';
    const dp = descPanel(() => desc);
    const i = await UI.menu({ items: list.map(id => { const it = itemInfo(id); return { t: it.name, r: it.kind === 'key' ? '★' : '×' + Bag.count(id), col: it.kind === 'key' ? '#ffd76a' : EQUIP[id] ? '#cfe6ff' : '#fff' }; }), title: '道具', pos: mpos(L.FS * 5.5, 0), index: idx, cols: list.length > 8 && L.V.w > L.FS * 30 ? 2 : 1, onMove: k => { desc = itemDesc(list[k]); } });
    UI.remove(dp);
    if (i < 0) return;
    idx = i;
    const id = list[i], it = itemInfo(id);
    if (EQUIP[id]) { await UI.say(`${it.name}是裝備品。請從「裝備」選單裝上。`); continue; }
    if (it.kind === 'key') { await UI.say(it.desc); continue; }
    const a = await UI.menu({ items: [{ t: '使用', dis: !!it.nofield }, { t: '丟掉' }], pos: mpos(L.FS * 11, L.FS * 2) });
    if (a === 1) { if (await UI.yesno(`要把 ${it.name} 丟掉嗎？`)) { Bag.remove(id, Bag.count(id)); await UI.say(`丟掉了${it.name}。`); } continue; }
    if (a !== 0) continue;
    await fieldUseItem(id);
  }
}
async function fieldUseItem(id, user) {
  const it = ITEMS[id];
  if (it.kind === 'warp') { const ok = await warpMenu(); if (ok) Bag.remove(id); return ok; }
  if (it.kind === 'repel') { Bag.remove(id); G.repel = 160; Snd.play('spell'); await UI.say('點起了驅魔香，四周飄散著清新的香氣。', '一段時間內，弱小的魔物不會靠近。'); return true; }
  let t = null;
  if (it.tgt === 'ally' || it.tgt === 'dead') { t = await pickMember('對誰使用？', it.tgt === 'dead' ? (m => m.hp <= 0) : () => true); if (!t) return false; }
  const msgs = withB(ev => Battle.useItem({ noRun: true }, user || G.party[0], id, t, ev));
  if (msgs.some(s => s.includes('回復') || s.includes('復活') || s.includes('解除') || s.includes('恢復'))) Snd.play('heal');
  await UI.say(msgs.join('\n'));
  return true;
}
function itemDesc(id) {
  const it = itemInfo(id);
  if (EQUIP[id]) { const e = EQUIP[id], p = []; if (e.atk) p.push('攻擊 +' + e.atk); if (e.def) p.push('防禦 +' + e.def); if (e.agi) p.push('速度 +' + e.agi); if (e.int) p.push('智力 +' + e.int); return `${SLOTS[e.slot]}：${p.join('　')}　可裝備：${e.who.split('').map(c => ({ H: '洛恩', L: '莉亞', M: '米菈', B: '巴爾克' })[c]).join('、')}`; }
  return it.desc || '';
}
function descPanel(getText) {
  return UI.panel(g => {
    const t = getText(); if (!t) return;
    const fs = L.FS, pad = L.pad, w = Math.min(L.V.w - pad * 2, fs * 30), lines = UI.wrap(g, t, w - pad * 2.6, fs * 0.88);
    const h = lines.length * fs * 1.35 + pad * 1.8, x = L.V.x + (L.V.w - w) / 2, y = L.V.y + L.V.h - h - pad * 2 - fs * 2.2;
    UI.win(g, x, y, w, h); lines.forEach((ln, i) => UI.text(g, ln, x + pad * 1.3, y + pad * 0.9 + i * fs * 1.35, '#dfe6ff', fs * 0.88));
  });
}
async function spellMenu() {
  const caster = await pickMember('誰要施法？', m => Party.spells(m).length > 0);
  if (!caster) { if (!G.party.some(m => Party.spells(m).length)) await UI.say('還沒有人會法術。'); return; }
  for (;;) {
    const list = Party.spells(caster);
    let desc = '';
    const dp = descPanel(() => desc);
    const i = await UI.menu({ items: list.map(s => ({ t: SPELLS[s].name, r: String(SPELLS[s].mp), dis: !SPELLS[s].field || SPELLS[s].mp > caster.mp || caster.hp <= 0 })), title: `${Party.name(caster)}的${CHARS[caster.id].magic}（MP ${caster.mp}）`, pos: mpos(L.FS * 5.5, 0), onMove: k => { desc = SPELLS[list[k]].desc + (SPELLS[list[k]].field ? '' : '（只能在戰鬥中使用）'); } });
    UI.remove(dp);
    if (i < 0) return;
    const sid = list[i], sp = SPELLS[sid];
    if (sp.kind === 'warp') { if (await warpMenu()) { caster.mp -= sp.mp; } return; }
    let t = null;
    if (sp.tgt === 'ally' || sp.tgt === 'dead') { t = await pickMember('對誰施法？', sp.tgt === 'dead' ? (m => m.hp <= 0) : (m => m.hp > 0)); if (!t) continue; }
    const msgs = withB(ev => Battle.castSpell({ party: G.party, enemies: [] }, caster, sid, t, ev));
    Snd.play('heal');
    await UI.say(msgs.join('\n'));
  }
}
async function warpMenu() {
  if (Field.def && Field.def.noWarp) { await UI.say('一股黑暗的力量擋住了去路，傳送失敗了。'); return false; }
  const list = G.towns.filter(t => MAPS[t]);
  const i = await UI.menu({ items: list.map(t => ({ t: MAPS[t].name })), title: '要去哪裡？', pos: mpos(L.FS * 8, L.FS * 1.5) });
  if (i < 0) return false;
  UI.clearGhosts();
  const id = list[i], e = MAPS[id].entry;
  Snd.play('warp');
  await Game.go(id, e[0], e[1], e[2] || 'up', { from: 'world' });
  return true;
}
function statLine(m) { const s = Party.stats(m); return s; }
async function equipMenu() {
  let who = await pickMember('誰要換裝備？');
  while (who) {
    let si = 0;
    for (;;) {
      const slots = ['w', 'a', 's', 'h', 'x'];
      const cmp = { m: who, next: null };
      const sp = statPanel(cmp);
      const i = await UI.menu({ items: slots.map(s => ({ t: SLOTS[s], r: who.eq[s] ? EQUIP[who.eq[s]].name : '－', rcol: '#ffffff' })), title: Party.name(who) + '的裝備', pos: mpos(L.FS * 5.5, 0), index: si, keep: true, onLR: d => { const k = (G.party.indexOf(who) + d + G.party.length) % G.party.length; who = G.party[k]; } });
      if (i < 0) { UI.remove(sp); UI.clearGhosts(); return; }
      si = i;
      const slot = slots[i];
      const opts = Bag.list(id => EQUIP[id] && EQUIP[id].slot === slot && Party.canEquip(who, id));
      const items = opts.map(id => ({ t: EQUIP[id].name, r: '×' + Bag.count(id) })).concat([{ t: '（卸下）' }]);
      const j = await UI.menu({ items, title: SLOTS[slot], pos: mpos(L.FS * 5.5, L.FS * 7), onMove: k => { cmp.next = k < opts.length ? { slot, id: opts[k] } : { slot, id: null }; } });
      cmp.next = null;
      UI.remove(sp); UI.clearGhosts();
      if (j < 0) continue;
      const nid = j < opts.length ? opts[j] : null;
      if (who.eq[slot]) Bag.add(who.eq[slot]);
      who.eq[slot] = nid;
      if (nid) Bag.remove(nid);
      const s = Party.stats(who); who.hp = Math.min(who.hp, s.mhp); who.mp = Math.min(who.mp, s.mmp);
      Snd.play('ok');
    }
  }
}
function statPanel(cmp) {
  return UI.panel(g => {
    const m = cmp.m, fs = L.FS, pad = L.pad;
    const s = Party.stats(m);
    let n = null;
    if (cmp.next) { const eq = Object.assign({}, m.eq); eq[cmp.next.slot] = cmp.next.id; n = Party.stats(Object.assign({}, m, { eq })); }
    const w = fs * 10.5, h = fs * 1.45 * 5 + pad * 2, x = L.V.x + L.V.w - w - pad, y = L.V.y + pad;
    UI.win(g, x, y, w, h);
    [['攻擊力', 'atk'], ['防禦力', 'def'], ['速度', 'agi'], ['智力', 'int'], ['最大 HP', 'mhp']].forEach(([lab, k], i) => {
      const yy = y + pad + i * fs * 1.45;
      UI.text(g, lab, x + pad * 1.3, yy, '#9aa6d8', fs * 0.88);
      UI.text(g, String(s[k]), x + w * 0.62, yy, '#fff', fs * 0.92, 'right', 'top', 700);
      if (n && n[k] !== s[k]) { const up = n[k] > s[k]; UI.text(g, '→ ' + n[k], x + w - pad * 1.3, yy, up ? '#7dffb0' : '#ff8a8a', fs * 0.92, 'right', 'top', 700); }
    });
  });
}
async function statusMenu() {
  let k = 0;
  return new Promise(res => {
    const lay = { modal: true };
    lay.update = () => {
      if (Input.dirPress === 'left' || Input.dirPress === 'right') { k = (k + (Input.dirPress === 'left' ? -1 : 1) + G.party.length) % G.party.length; Snd.play('cursor'); }
      if (Input.pressed.ok || Input.pressed.cancel) { UI.remove(lay); Snd.play('cancel'); res(); }
    };
    lay.draw = g => {
      const m = G.party[k], s = Party.stats(m), C = CHARS[m.id], fs = L.FS, pad = L.pad;
      const w = Math.min(L.V.w - pad * 2, fs * 30), h = Math.min(L.V.h - pad * 2, fs * 19), x = L.V.x + (L.V.w - w) / 2, y = L.V.y + (L.V.h - h) / 2;
      UI.win(g, x, y, w, h);
      const sz = fs * 3.2; g.imageSmoothingEnabled = false; g.drawImage(sheet(m.id), 0, 0, 16, 16, x + pad * 1.5, y + pad * 1.2, sz, sz);
      UI.text(g, C.name, x + pad * 2 + sz, y + pad * 1.3, '#fff', fs * 1.3, 'left', 'top', 700);
      UI.text(g, `${C.role}　Lv ${m.lv}`, x + pad * 2 + sz, y + pad * 1.3 + fs * 1.7, '#ffd76a', fs * 0.9);
      if (G.party.length > 1) UI.text(g, `◀ ${k + 1}/${G.party.length} ▶`, x + w - pad * 1.5, y + pad * 1.3, '#9aa6d8', fs * 0.85, 'right');
      const rows = [['HP', `${m.hp} / ${s.mhp}`], ['MP', `${m.mp} / ${s.mmp}`], ['力量', s.str], ['攻擊力', s.atk], ['防禦力', s.def], ['速度', s.agi], ['智力', s.int], ['經驗值', m.exp], ['下一級', Party.toNext(m)]];
      const c1 = x + pad * 1.5, top = y + pad * 2 + sz;
      const two = w > fs * 22;
      rows.forEach(([a, b], i) => { const yy = top + i * fs * 1.38; UI.text(g, a, c1, yy, '#9aa6d8', fs * 0.88); UI.text(g, String(b), c1 + fs * (two ? 9 : 8), yy, '#fff', fs * 0.9, 'right', 'top', 700); });
      const ex = two ? x + w * 0.5 : c1, ey = two ? top : top + rows.length * fs * 1.38 + pad * 0.5;
      if (!two && ey + fs * 7 > y + h) { UI.text(g, '（橫向畫面可看到裝備）', c1, y + h - pad - fs, '#7a7f9a', fs * 0.8); }
      else {
        ['w', 'a', 's', 'h', 'x'].forEach((sl, i) => { const yy = ey + i * fs * 1.38; UI.text(g, SLOTS[sl], ex, yy, '#9aa6d8', fs * 0.85); UI.text(g, m.eq[sl] ? EQUIP[m.eq[sl]].name : '－', ex + fs * 3.2, yy, '#fff', fs * 0.9); });
        const sp = Party.spells(m).map(id => SPELLS[id].name);
        if (two && sp.length) { const lines = UI.wrap(g, C.magic + '：' + sp.join('、'), w * 0.5 - pad * 2, fs * 0.82); lines.slice(0, 5).forEach((ln, i) => UI.text(g, ln, ex, ey + 5.6 * fs * 1.38 + i * fs * 1.25, '#cfe0ff', fs * 0.82)); }
      }
      UI.hit(x, y, w, h, () => { lay.tap = true; });
      if (lay.tap) { lay.tap = false; if (G.party.length > 1) k = (k + 1) % G.party.length; else { UI.remove(lay); res(); } }
    };
    UI.push(lay);
  });
}
async function orderMenu() {
  const a = await pickMember('要和誰交換位置？（第一個）');
  if (!a) return;
  const b = await pickMember('和誰交換？', m => m !== a);
  if (!b) return;
  const i = G.party.indexOf(a), j = G.party.indexOf(b);
  G.party[i] = b; G.party[j] = a;
  Field.party.forEach(p => { p.x = Field.leader().x; p.y = Field.leader().y; p.fx = p.x; p.fy = p.y; p.t = 1; });
  await UI.say(`${Party.name(b)}和${Party.name(a)}交換了位置。`);
}
async function notebook() {
  const lines = [];
  lines.push(['目前目標', objective()]);
  for (const q of SIDEQUESTS) { const st = q.state(); if (st) lines.push([q.name, st]); }
  const t = Math.floor(G.time), hh = Math.floor(t / 3600), mm = Math.floor(t / 60) % 60;
  lines.push(['冒險記錄', `遊戲時間 ${hh}:${String(mm).padStart(2, '0')}　戰鬥 ${G.battles} 次　難度 ${DIFFS[G.diff].name}`]);
  lines.push(['音石', `${countStones()} / 5`]);
  return new Promise(res => {
    const lay = { modal: true, update() { if (Input.pressed.ok || Input.pressed.cancel || lay.tap) { UI.remove(lay); res(); } } };
    lay.draw = g => {
      const fs = L.FS, pad = L.pad, w = Math.min(L.V.w - pad * 2, fs * 30), x = L.V.x + (L.V.w - w) / 2;
      const wrapped = lines.map(([a, b]) => [a, UI.wrap(g, b, w - pad * 3, fs * 0.9)]);
      const h = wrapped.reduce((s, [, b]) => s + fs * 1.4 + b.length * fs * 1.35 + pad * 0.4, pad * 2 + fs * 1.6);
      const y = L.V.y + Math.max(pad, (L.V.h - h) / 2);
      UI.win(g, x, y, w, h);
      UI.text(g, '冒險筆記', x + pad * 1.5, y + pad, '#ffd76a', fs, 'left', 'top', 700);
      let yy = y + pad + fs * 1.6;
      for (const [a, b] of wrapped) { UI.text(g, a, x + pad * 1.5, yy, '#9aa6d8', fs * 0.85, 'left', 'top', 700); yy += fs * 1.35; for (const ln of b) { UI.text(g, ln, x + pad * 2.2, yy, '#fff', fs * 0.9); yy += fs * 1.35; } yy += pad * 0.4; }
      UI.hit(x, y, w, h, () => { lay.tap = true; });
    };
    UI.push(lay);
  });
}
async function settingsMenu() {
  let idx = 0;
  for (;;) {
    const D = Store.data;
    const items = [{ t: '音樂', r: D.music ? '開' : '關' }, { t: '音效', r: D.sfx ? '開' : '關' }, { t: '文字速度', r: ['慢', '普通', '快'][D.textSpeed ?? 1] }, { t: '難度', r: DIFFS[G.diff].name }, { t: '回到標題畫面' }];
    const i = await UI.menu({ items, title: '設定', pos: mpos(L.FS * 5.5, 0), index: idx, onLR: d => { } });
    if (i < 0) return;
    idx = i;
    if (i === 0) { D.music = !D.music; Snd.applyVol(); Game.syncMute(); }
    if (i === 1) { D.sfx = !D.sfx; Snd.applyVol(); Game.syncMute(); }
    if (i === 2) D.textSpeed = ((D.textSpeed ?? 1) + 1) % 3;
    if (i === 3) { const ks = Object.keys(DIFFS); const j = await UI.menu({ items: ks.map(k => ({ t: DIFFS[k].name })), title: '難度', pos: mpos(L.FS * 12, L.FS * 4), index: ks.indexOf(G.diff) }); if (j >= 0) { G.diff = ks[j]; await UI.say(`難度改為「${DIFFS[G.diff].name}」。\n${DIFFS[G.diff].note}`); } }
    if (i === 4) { if (await UI.yesno('要回到標題畫面嗎？（沒有記錄的進度會消失）')) return 'title'; }
    Store.save();
  }
}

// ───── 城鎮服務 ─────
async function shop(id, greet) {
  const gp = goldPanel();
  await UI.say(greet || '歡迎光臨！');
  for (;;) {
    const a = await UI.menu({ items: [{ t: '買' }, { t: '賣' }, { t: '離開' }], pos: mpos(), keep: true });
    if (a < 0 || a === 2) break;
    if (a === 0) await shopBuy(id);
    else await shopSell();
    UI.clearGhosts();
  }
  UI.clearGhosts(); UI.remove(gp);
  await UI.say('謝謝光臨，歡迎再來！');
}
function comparePanel(getId) {
  return UI.panel(g => {
    const id = getId(); if (!id) return;
    const fs = L.FS, pad = L.pad, e = EQUIP[id];
    const w = Math.min(fs * 13, L.V.w * 0.5), rh = fs * 1.5, h = rh * G.party.length + pad * 2 + fs * 1.4;
    const x = L.V.x + L.V.w - w - pad, y = L.V.y + pad;
    UI.win(g, x, y, w, h);
    if (!e) { const it = ITEMS[id]; UI.wrap(g, it.desc, w - pad * 2.6, fs * 0.85).slice(0, 5).forEach((ln, i) => UI.text(g, ln, x + pad * 1.3, y + pad + i * fs * 1.3, '#dfe6ff', fs * 0.85)); return; }
    const key = e.atk ? 'atk' : 'def', lab = e.atk ? '攻擊' : '防禦';
    UI.text(g, `${SLOTS[e.slot]}　${lab}${e[key] ? ' +' + e[key] : ''}${e.int ? '　智力 +' + e.int : ''}${e.agi ? '　速度 +' + e.agi : ''}`, x + pad * 1.3, y + pad, '#ffd76a', fs * 0.82, 'left', 'top', 700);
    G.party.forEach((m, i) => {
      const yy = y + pad + fs * 1.4 + i * rh;
      UI.text(g, Party.name(m), x + pad * 1.3, yy, '#fff', fs * 0.9);
      let txt, col;
      if (!Party.canEquip(m, id)) { txt = '✕ 不能裝備'; col = '#7a7f9a'; }
      else if (m.eq[e.slot] === id) { txt = '裝備中'; col = '#9aa6d8'; }
      else {
        const s0 = Party.stats(m), eq = Object.assign({}, m.eq); eq[e.slot] = id; const s1 = Party.stats(Object.assign({}, m, { eq }));
        const d = s1[key] - s0[key], di = s1.int - s0.int;
        txt = `${lab} ${d >= 0 ? '+' : ''}${d}` + (di ? `　智 ${di >= 0 ? '+' : ''}${di}` : ''); col = d > 0 || di > 0 ? '#7dffb0' : d < 0 ? '#ff8a8a' : '#dfe6ff';
      }
      UI.text(g, txt, x + w - pad * 1.3, yy, col, fs * 0.88, 'right', 'top', 700);
    });
  });
}
async function shopBuy(id) {
  const list = SHOPS[id];
  let cur = list[0], idx = 0;
  for (;;) {
    const cp = comparePanel(() => cur);
    const i = await UI.menu({ items: list.map(k => { const it = itemInfo(k); return { t: it.name, r: it.price + 'G', dis: it.price > G.gold }; }), title: '要買什麼？', pos: () => ({ x: L.V.x + L.pad, y: L.V.y + L.pad + L.FS * 6 }), index: idx, allowDis: true, onMove: k => { cur = list[k]; } });
    UI.remove(cp);
    if (i < 0) return;
    idx = i;
    const k = list[i], it = itemInfo(k);
    if (it.price > G.gold) { await UI.say('金幣不夠喔。'); continue; }
    if (EQUIP[k]) {
      if (!await UI.yesno(`${it.name}要 ${it.price} 金幣，可以嗎？`)) continue;
      G.gold -= it.price; Snd.play('buy');
      const can = G.party.filter(m => Party.canEquip(m, k));
      if (can.length && await UI.yesno('要現在裝備嗎？')) {
        const m = can.length === 1 ? can[0] : await pickMember('誰要裝備？', x => Party.canEquip(x, k));
        if (m) {
          const old = m.eq[it.slot]; m.eq[it.slot] = k;
          if (old) { if (await UI.yesno(`要把原本的${EQUIP[old].name}賣掉嗎？（${sellPrice(old)}G）`)) { G.gold += sellPrice(old); Snd.play('coin'); } else Bag.add(old); }
          await UI.say(`${Party.name(m)}裝備了${it.name}！`);
          continue;
        }
      }
      Bag.add(k); await UI.say(`買下了${it.name}。`);
    } else {
      const n = await qtyPick(it.name, it.price);
      if (!n) continue;
      G.gold -= it.price * n; Bag.add(k, n); Snd.play('buy');
      await UI.say(`買下了 ${n} 個${it.name}。`);
    }
  }
}
function sellPrice(id) { const it = itemInfo(id); return it.sell ?? Math.floor((it.price || 0) / 2); }
async function shopSell() {
  for (;;) {
    const list = Bag.list(id => itemInfo(id).kind !== 'key' && sellPrice(id) > 0);
    if (!list.length) { await UI.say('沒有可以賣的東西。'); return; }
    const i = await UI.menu({ items: list.map(id => ({ t: itemInfo(id).name + ' ×' + Bag.count(id), r: sellPrice(id) + 'G' })), title: '要賣什麼？', pos: () => ({ x: L.V.x + L.pad, y: L.V.y + L.pad + L.FS * 6 }) });
    if (i < 0) return;
    const id = list[i];
    if (await UI.yesno(`${itemInfo(id).name}可以用 ${sellPrice(id)} 金幣收購，要賣嗎？`)) { Bag.remove(id); G.gold += sellPrice(id); Snd.play('coin'); }
  }
}
function qtyPick(name, price) {
  return new Promise(res => {
    let n = 1;
    const max = Math.max(1, Math.min(99, Math.floor(G.gold / price)));
    const lay = { modal: true };
    lay.update = () => {
      const d = Input.dirPress;
      if (d === 'up' || d === 'right') { n = n >= max ? 1 : n + 1; Snd.play('cursor'); }
      if (d === 'down' || d === 'left') { n = n <= 1 ? max : n - 1; Snd.play('cursor'); }
      if (Input.pressed.ok) { Snd.play('ok'); UI.remove(lay); res(n); }
      if (Input.pressed.cancel) { Snd.play('cancel'); UI.remove(lay); res(0); }
    };
    lay.draw = g => {
      const fs = L.FS, pad = L.pad, w = fs * 14, h = fs * 4.6, x = L.V.x + (L.V.w - w) / 2, y = L.V.y + L.V.h * 0.42;
      UI.win(g, x, y, w, h);
      UI.text(g, `${name}　要買幾個？`, x + pad * 1.3, y + pad, '#ffd76a', fs * 0.85, 'left', 'top', 700);
      const cy = y + fs * 2.6;
      UI.text(g, '◀', x + pad * 2, cy, '#cfd6ff', fs * 1.1, 'left', 'middle', 700);
      UI.text(g, '×' + n, x + w * 0.38, cy, '#fff', fs * 1.2, 'center', 'middle', 700);
      UI.text(g, '▶', x + w * 0.62, cy, '#cfd6ff', fs * 1.1, 'right', 'middle', 700);
      UI.text(g, (price * n) + 'G', x + w - pad * 1.4, cy, '#ffe9a8', fs, 'right', 'middle', 700);
      UI.hit(x, cy - fs, w * 0.3, fs * 2, () => { n = n <= 1 ? max : n - 1; Snd.play('cursor'); });
      UI.hit(x + w * 0.45, cy - fs, w * 0.25, fs * 2, () => { n = n >= max ? 1 : n + 1; Snd.play('cursor'); });
      UI.hit(x + w * 0.72, cy - fs, w * 0.28, fs * 2, () => { Snd.play('ok'); UI.remove(lay); res(n); });
    };
    UI.push(lay);
  });
}
async function inn(price, keeper = '旅店老闆') {
  const total = price * G.party.length;
  const gp = goldPanel();
  const yes = await UI.yesno(`${keeper}：「歡迎！住一晚是 ${total} 金幣，要休息嗎？」`);
  if (!yes) { UI.remove(gp); await UI.say('歡迎下次再來。'); return; }
  if (G.gold < total) { UI.remove(gp); await UI.say('哎呀，金幣好像不夠呢……'); return; }
  G.gold -= total; UI.remove(gp);
  await Game.fadeOut(0.5);
  await Music.jingle('inn');
  for (const m of G.party) if (m.hp > 0) { const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st.poison = 0; }
  await Game.fadeIn(0.5);
  await UI.say(`${keeper}：「早安！昨晚睡得好嗎？路上小心喔。」`);
}
async function church(name = '神父') {
  await UI.say(`${name}：「迷途的孩子，願曉鐘之光守護你。今天有什麼事嗎？」`);
  for (;;) {
    const i = await UI.menu({ items: [{ t: '記錄冒險' }, { t: '復活夥伴' }, { t: '解毒' }, { t: '離開' }], pos: mpos(), keep: true });
    UI.clearGhosts();
    if (i < 0 || i === 3) break;
    if (i === 0) await saveMenu();
    if (i === 1) {
      const dead = G.party.filter(m => m.hp <= 0);
      if (!dead.length) { await UI.say(`${name}：「大家都很有精神呢。」`); continue; }
      const m = dead.length === 1 ? dead[0] : await pickMember('要讓誰復活？', x => x.hp <= 0);
      if (!m) continue;
      const cost = m.lv * 10;
      if (!await UI.yesno(`${name}：「要讓${Party.name(m)}復活，需要 ${cost} 金幣的捐獻。可以嗎？」`)) continue;
      if (G.gold < cost) { await UI.say('金幣不夠……'); continue; }
      G.gold -= cost; m.hp = Party.stats(m).mhp; Snd.play('holy');
      await UI.say(`${Party.name(m)}復活了！`);
    }
    if (i === 2) {
      const p = G.party.filter(m => m.st.poison && m.hp > 0);
      if (!p.length) { await UI.say(`${name}：「沒有人中毒喔。」`); continue; }
      if (G.gold < 10 * p.length) { await UI.say('金幣不夠……'); continue; }
      G.gold -= 10 * p.length; p.forEach(m => m.st.poison = 0); Snd.play('heal');
      await UI.say('大家身上的毒都解除了。');
    }
  }
  await UI.say(`${name}：「願曉鐘之光與你同在。」`);
}
async function saveMenu() {
  const items = [1, 2, 3].map(n => { const d = SaveIO.read(n); return { t: `記錄 ${n}`, r: d ? slotInfo(d) : '（空白）' }; });
  const i = await UI.menu({ items, title: '要記錄在哪裡？', pos: mpos(L.FS * 5, L.FS), index: (G.slot || 1) - 1 });
  if (i < 0) return false;
  const n = i + 1, ex = SaveIO.read(n);
  if (ex && n !== G.slot && !await UI.yesno(`記錄 ${n} 已經有資料了，要覆蓋嗎？`)) return false;
  G.slot = n; Store.data.lastSlot = n; Store.save();
  const ok = Game.save(n);
  if (ok) { Music.jingle('save'); await UI.say(`冒險已經記錄在「記錄 ${n}」。`); }
  else await UI.say('記錄失敗了……（瀏覽器可能不允許儲存）');
  return ok;
}
function slotInfo(d) {
  const t = Math.floor(d.time || 0), hh = Math.floor(t / 3600), mm = Math.floor(t / 60) % 60;
  const m = MAPS[d.map];
  return `Lv${d.party[0].lv} ${m ? m.short || m.name : ''} ${hh}:${String(mm).padStart(2, '0')}`;
}
async function statueSave() {
  await UI.say('女神像散發著柔和的光芒。');
  if (await UI.yesno('要在這裡記錄冒險嗎？')) await saveMenu();
}
async function springHeal() {
  await UI.say('清澈的泉水閃著藍光。大家喝了一口……');
  for (const m of G.party) { const s = Party.stats(m); m.hp = s.mhp; m.mp = s.mmp; m.st = {}; }
  Snd.play('heal'); Game.flashWhite = 0.4;
  await UI.say('全身充滿了力量！HP 和 MP 都完全恢復了！');
}
async function openChest(x, y) {
  const key = 'c:' + Field.id + ':' + x + ',' + y;
  if (F(key)) { await UI.say('寶箱是空的。'); return; }
  const c = Field.def.chests[x + ',' + y];
  G.flags[key] = true; Field.rebake();
  Snd.play('chest');
  if (c.gold) { G.gold += c.gold; await UI.say(`打開了寶箱！\n得到了 ${c.gold} 金幣！`); return; }
  const n = c.n || 1, it = itemInfo(c.item);
  Bag.add(c.item, n);
  if (it.kind === 'key' || EQUIP[c.item]) Music.jingle('item');
  await UI.say(`打開了寶箱！\n得到了${it.name}${n > 1 ? ' ×' + n : ''}！`);
  if (c.after) await c.after();
}
async function lockedDoor(x, y) {
  if (Bag.has('tombkey')) {
    G.flags['door:' + Field.id + ':' + x + ',' + y] = true; Snd.play('door'); Field.rebake();
    await UI.say('用王陵之鑰打開了沉重的石門。');
  } else await UI.say('刻滿古老文字的石門緊緊關著。\n門上有一個鑰匙孔。');
}

'use strict';
// 深淵地牢：第二輪的耐玩度系統——遺物與羈絆、地牢裡的人物（NPC）、可破壞的物件、樓層事件、每週挑戰與種子排行

// ---------- 遺物（被動效果，不佔背包） ----------
const RELICS = {
  fang: { n: '吸血鬼之牙', tag: 'blood', col: '#ff4a6a', d: '近戰命中時回復 1 HP。' },
  mask: { n: '嗜血面具', tag: 'blood', col: '#c0203a', d: 'HP 低於一半時，傷害 +30%。' },
  heart: { n: '火蜥蜴之心', tag: 'flame', col: '#ff8a3a', d: '不會著火；近戰有 15% 機率點燃敵人。' },
  feather: { n: '鳳凰羽毛', tag: 'flame', col: '#ffc04a', d: '倒下時以一半 HP 復活一次，之後羽毛會燒毀。' },
  shard: { n: '冰晶護符', tag: 'frost', col: '#9fe8ff', d: '被近戰打中時，有 20% 機率把對方凍住。' },
  crown: { n: '霜后之冠', tag: 'frost', col: '#d8f4ff', d: '對凍住、暈眩或睡著的敵人傷害 +50%。' },
  coin: { n: '幸運金幣', tag: 'wealth', col: '#ffd75a', d: '撿到的金幣 +30%，寶箱多掉一件道具。' },
  chart: { n: '古老星圖', tag: 'wealth', col: '#e8c890', d: '每到新的一層，就知道樓梯在哪裡。' },
  gloves: { n: '夜行手套', tag: 'shadow', col: '#8a6acf', d: '偷襲傷害 +50%。' },
  quill: { n: '鷹羽', tag: 'shadow', col: '#c8d8e8', d: '投擲武器傷害 +40%，飛刀不會損壞。' },
  boots: { n: '疾風長靴', tag: 'shadow', col: '#7fd36a', d: '閃避 +2；每到新的一層加速 4 回合。' },
  drum: { n: '戰鼓', tag: 'war', col: '#d8443a', d: '打倒敵人後，下一次近戰傷害 +60%。' },
  belt: { n: '巨人腰帶', tag: 'war', col: '#b08040', d: '最大 HP +10，力量 +1。' },
  eye: { n: '雷神之眼', tag: 'storm', col: '#ffe86a', d: '命中時有 15% 機率放出連鎖閃電。' },
  bell: { n: '靈魂鐘', tag: 'storm', col: '#b8a8ff', d: '打倒敵人時，所有技能冷卻減少 2 回合。' },
  hourglass: { n: '時之沙漏', tag: 'arcane', col: '#e0c070', d: '技能冷卻時間 -25%。' },
  crystal: { n: '魔力水晶', tag: 'arcane', col: '#c08aff', d: '法術與魔杖傷害 +25%；撿到的魔杖多 1 格能量。' },
  shell: { n: '刺蝟甲殼', tag: 'guard', col: '#8a9a5a', d: '被近戰打中時反彈 25% 傷害。' },
  ward: { n: '守護聖徽', tag: 'guard', col: '#e8e8f8', d: '護甲 +2。' },
};
// 同一種標籤的遺物湊滿兩件，觸發「羈絆」
const RSETS = {
  blood: { n: '血宴', d: '吸血加倍，打倒敵人回復 2 HP。' },
  flame: { n: '不滅之火', d: '你的攻擊點燃敵人的機率提高到 35%，燃燒的敵人受到的傷害 +20%。' },
  frost: { n: '永凍', d: '凍結機率加倍，被凍住的敵人多凍 1 回合。' },
  wealth: { n: '財神', d: '商店價格 -20%，賣東西多賺 50%。' },
  shadow: { n: '夜幕', d: '偷襲必定會心一擊。' },
  war: { n: '戰神', d: '近戰傷害 +2。' },
  storm: { n: '雷暴', d: '連鎖閃電機率加倍，而且會再跳一次。' },
  arcane: { n: '奧秘', d: '技能冷卻再 -15%，法術傷害再 +15%。' },
  guard: { n: '堡壘', d: '受到的所有傷害 -1。' },
};
ITEMS.relic = { c: 'relic', n: '遺物', d: 99, w: 0, price: 220 };
CAT_NAME.relic = '遺物';
SPR.relic = { p: { c: '#d8b860', C: '#8a6a2a', g: '#ff4a6a', G: '#ffffff', h: '#5a4020' }, m: [
  '....cccc....', '...c....c...', '..c......c..', '..c......c..', '...c....c...', '....cCCc....',
  '...cCggCc...', '..cCgGggCc..', '..cCggggCc..', '...cCggCc...', '....cCCc....', '.....cc.....'] };

// ---------- 地牢裡的人物 ----------
Object.assign(MON, {
  captive: { n: '被囚的冒險者', spr: 'captive', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1, talk: 1, d2: '被鎖鏈綁在牆邊的冒險者。' },
  sage: { n: '盲眼占卜師', spr: 'sage', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1, talk: 1, d2: '看得見你看不見的東西。' },
  smith: { n: '流浪鐵匠', spr: 'smith', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1, talk: 1, d2: '扛著鐵砧四處流浪的矮人。' },
  gambler: { n: '骰子賭徒', spr: 'gambler', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1, talk: 1, d2: '「來賭一把吧，朋友！」' },
  knight: { n: '受傷的騎士', spr: 'knight', hp: 999, atk: [0, 0], acc: 0, eva: 0, arm: 99, spd: 100, xp: 0, d: 99, verb: '', npc: 1, talk: 1, d2: '靠在牆邊喘氣的騎士。' },
});
const NPC_KINDS = ['captive', 'sage', 'smith', 'gambler', 'knight'];
Object.assign(MSPR, {
  captive(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0;
    biped(P, { size: 'med', body: '#7a6a5a', leg: '#5a4a4a', boot: '#3a2a22', skin: '#e8b888', arm: '#7a6a5a', belt: '#4a3a2a',
      torso(P, x, y) { P.r(x + 1, y + 2, 6, 1, '#5a4a3a'); P.l(x - 2, y + 2, x - 5, y - 4, '#8a8a96'); P.l(x + 9, y + 2, x + 12, y - 4, '#8a8a96'); },
      head(P, x, y) { P.e(x + 3.5, y + 3.6 + b * 0.3, 3.6, 3.6, '#e8b888'); P.p(x + 5, y + 3 + b, '#20162a'); P.p(x + 2, y + 3 + b, '#20162a'); P.r(x, y, 7, 2, '#6a4a2a'); P.r(x - 1, y + 1, 2, 4, '#6a4a2a'); P.r(x + 3, y + 6, 2, 1, '#a05a4a'); },
    }, { fr: 'idle', i: f.i });
    P.r(6, 21, 2, 2, '#5a5a66'); P.r(15, 21, 2, 2, '#5a5a66'); P.l(7, 22, 15, 22, '#8a8a96');
  },
  sage(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0;
    biped(P, { size: 'med', robe: 1, body: '#4a3a7a', trim: '#e0b040', skin: '#d8b090', arm: '#4a3a7a', wpn: 'orb', wo: { orb: '#9ff0ff' },
      head(P, x, y) { P.e(x + 3.5, y + 3.6, 3.6, 3.6, '#d8b090'); P.r(x + 1, y + 3, 6, 1, '#e8e0ff'); P.poly([[x - 1, y + 2], [x + 8, y + 2], [x + 3.5, y - 5 - b]], '#5a4a9a'); P.p(x + 3, y - 2, '#ffd75a'); P.r(x + 2, y + 6, 4, 3, '#e8e0f0'); },
    }, f);
  },
  smith(P, f) {
    biped(P, { size: 'small', body: '#8a5a3a', leg: '#4a3a3a', boot: '#2a1a12', skin: '#f0b080', arm: '#f0b080', belt: '#3a2a1a', wpn: 'mace',
      torso(P, x, y) { P.r(x + 1, y + 1, 5, 5, '#5a4030'); },
      head(P, x, y) { P.e(x + 3.5, y + 3.6, 3.4, 3.4, '#f0b080'); P.p(x + 5, y + 3, '#20162a'); P.r(x, y + 4, 8, 4, '#c86a2a'); P.r(x + 1, y + 8, 6, 2, '#c86a2a'); P.r(x, y, 7, 2, '#6a6a76'); },
    }, f);
  },
  gambler(P, f) {
    const b = f.fr === 'idle' && f.i ? 1 : 0;
    biped(P, { size: 'med', body: '#8a2a4a', leg: '#2a2a3a', boot: '#1a1a22', skin: '#f0c090', arm: '#8a2a4a', belt: '#e0b040',
      torso(P, x, y) { P.r(x + 3, y, 2, 6, '#e8e0d0'); P.p(x + 3, y + 1, '#c02a3a'); },
      head(P, x, y) { P.e(x + 3.5, y + 3.6, 3.6, 3.6, '#f0c090'); P.p(x + 5, y + 3, '#20162a'); P.r(x + 3, y + 5, 3, 1, '#7a3020'); P.r(x - 1, y, 10, 1, '#2a2a3a'); P.r(x + 1, y - 3, 6, 3, '#2a2a3a'); P.r(x + 1, y - 1, 6, 1, '#c02a3a'); },
    }, f);
    P.r(19, 13 - b, 3, 3, '#f8f0e0'); P.p(20, 14 - b, '#20162a');
  },
  knight(P, f) {
    biped(P, { size: 'med', body: '#a8b2c0', leg: '#6a7080', boot: '#3a3a4a', skin: '#f0c090', arm: '#a8b2c0', belt: '#6a3a2a', wpn: 'sword',
      torso(P, x, y) { P.r(x + 2, y + 1, 4, 4, '#3a6ad0'); P.r(x + 3, y + 1, 2, 4, '#e8e0d0'); P.r(x, y + 4, 3, 2, '#c02a3a'); },
      head(P, x, y) { P.e(x + 3.5, y + 3.6, 3.8, 3.8, '#c8d0dc'); P.r(x + 1, y + 3, 6, 1, '#20162a'); P.r(x + 3, y - 1, 2, 2, '#c02a3a'); },
    }, f);
  },
  // 可破壞的物件
  p_barrel(P) { P.e(12, 20, 6, 2, '#5a3418'); P.r(6, 10, 12, 10, '#8a5a2e'); P.r(6, 10, 3, 10, '#a8703a'); P.r(15, 10, 3, 10, '#6a4020'); P.e(12, 10, 6, 2, '#a8703a'); P.e(12, 10, 4.5, 1.2, '#5a3418'); P.r(6, 12, 12, 1, '#5a5a66'); P.r(6, 18, 12, 1, '#5a5a66'); },
  p_crate(P) { P.r(5, 10, 14, 11, '#9a6a3a'); P.r(5, 10, 14, 1, '#c08a4a'); P.r(5, 20, 14, 1, '#5a3a1a'); P.r(5, 10, 1, 11, '#5a3a1a'); P.r(18, 10, 1, 11, '#5a3a1a'); P.l(6, 11, 17, 19, '#6a4420', 2); P.r(5, 15, 14, 1, '#6a4420'); },
  p_keg(P) { P.e(12, 20, 6, 2, '#3a1a10'); P.r(6, 10, 12, 10, '#7a2a1a'); P.r(6, 10, 3, 10, '#a83a24'); P.r(15, 10, 3, 10, '#5a1a10'); P.e(12, 10, 6, 2, '#a83a24'); P.r(6, 12, 12, 1, '#2a2a30'); P.r(6, 18, 12, 1, '#2a2a30'); P.r(10, 13, 4, 4, '#ffd75a'); P.p(11, 14, '#2a1a10'); P.p(12, 15, '#2a1a10'); P.l(12, 8, 14, 5, '#d8d0c0'); P.p(14, 4, '#ffb040'); },
  p_pod(P) { P.l(12, 21, 12, 15, '#4a7a5a', 2); P.e(12, 13, 6, 5.5, '#9a5ad0'); P.e(12, 12, 4.5, 4, '#c08aff'); for (const [x, y] of [[9, 11], [14, 13], [12, 9], [15, 10]]) P.p(x, y, '#ffe0ff'); P.e(8, 20, 2, 1.2, '#5fe0d0'); P.e(16, 21, 1.6, 1, '#5fe0d0'); },
  p_urn(P) { P.e(12, 16, 6, 5.5, '#5a8ab0'); P.e(11, 15, 4, 4, '#7ab0d8'); P.r(9, 8, 6, 3, '#5a8ab0'); P.r(8, 7, 8, 1, '#a8d8f0'); P.r(8, 15, 8, 1, '#e8fbff'); P.p(10, 12, '#e8fbff'); P.r(9, 20, 6, 1, '#3a6a90'); },
  p_bones(P) { P.e(12, 19, 7, 2.6, '#8a8296'); P.e(12, 17, 5, 2.4, '#c8c0d0'); P.e(10, 13, 3, 2.8, '#e8e0ea'); P.p(9, 13, '#2a1a2a'); P.p(11, 13, '#2a1a2a'); P.l(13, 16, 18, 14, '#e8e0ea', 2); P.l(6, 18, 9, 16, '#e8e0ea'); },
  p_fire(P, f) { const h = f.i ? 1 : 0; P.e(12, 20, 7, 2, '#3a2a22'); P.l(6, 20, 18, 17, '#6a4428', 2); P.l(6, 17, 18, 20, '#5a3a20', 2); P.poly([[8, 19], [16, 19], [13, 11 - h], [12, 14], [10, 10 + h]], '#ff7a2a'); P.poly([[10, 19], [14, 19], [12, 13 - h]], '#ffd75a'); P.r(11, 17, 2, 2, '#fff2c0'); },
});

// 每個生態區的可破壞物件
const PROPS = {
  barrel: { n: '木桶', snd: 'wood' }, crate: { n: '木箱', snd: 'wood' }, keg: { n: '火藥桶', snd: 'wood', boom: 1 },
  pod: { n: '孢子囊', snd: 'squish', spore: 1 }, urn: { n: '冰晶甕', snd: 'pot' }, bones: { n: '骨堆', snd: 'pot' },
  fire: { n: '篝火', camp: 1 },
  // 各區域的大型擺設（打不破，有些會發光）
  well: { n: '古井', deco: 1, d: '深不見底的古井，偶爾傳來回音。' },
  shroom: { n: '巨型發光蘑菇', deco: 1, light: '190,140,255', d: '比人還高的蘑菇，散發著柔和的光。' },
  furnace: { n: '古代熔爐', deco: 1, light: '255,130,40', d: '爐火還在燃燒，鍛造過無數武器。' },
  statue: { n: '冰封的騎士像', deco: 1, light: '140,220,255', d: '被冰封住的古代騎士，眼神依然銳利。' },
  brazier: { n: '虛空火盆', deco: 1, light: '210,90,255', d: '燃燒著紫色的虛空之火。' },
};
const DECO_BY_BIOME = ['well', 'shroom', 'furnace', 'statue', 'brazier'];
const PROP_BY_BIOME = [['barrel', 'barrel', 'crate', 'keg'], ['pod', 'pod', 'crate', 'barrel'], ['keg', 'keg', 'crate', 'barrel'], ['urn', 'urn', 'crate', 'bones'], ['bones', 'urn']];
T.PROP = 20;
TP[T.PROP] = { walk: 0, op: 0, n: '物件' };

// 樓層事件
const FEVENTS = {
  mist: { n: '迷霧之層', d: '濃霧遮住了視線（視野 -3），但怪物們都昏昏欲睡。', col: '#a8b8d0' },
  gold: { n: '黃金之層', d: '地上的金幣變多了——小偷精也聞風而來。', col: '#ffd75a' },
  hunt: { n: '狩獵之夜', d: '一群精英怪正在找你。打倒牠們會掉落更多寶物。', col: '#ff6a5a' },
  bounty: { n: '寶藏傳聞', d: '這層藏著額外的寶箱與一件遺物。', col: '#c8a0ff' },
};

// ---------- 規則擴充 ----------
Object.assign(Game, {
  relic(k) { const R = G && G.P && G.P.relics; return !!R && R.includes(k); },
  rset(tag) { const R = G && G.P && G.P.relics; if (!R) return false; let n = 0; for (const k of R) if (RELICS[k] && RELICS[k].tag === tag) n++; return n >= 2; },
  activeSets() { return Object.keys(RSETS).filter(t => this.rset(t)); },
  gainRelic(k) {
    const P = G.P; P.relics = P.relics || [];
    if (!RELICS[k] || P.relics.includes(k)) return false;
    const before = this.activeSets();
    P.relics.push(k);
    if (k === 'belt') { P.mhp += 10; P.hp += 10; P.str++; }
    msg('獲得遺物「' + RELICS[k].n + '」：' + RELICS[k].d, 'y');
    const R = RELICS[k];
    for (const t of this.activeSets()) if (!before.includes(t)) { msg('★ 遺物羈絆「' + RSETS[t].n + '」啟動：' + RSETS[t].d, 'y'); if (typeof UI !== 'undefined') UI.toast('遺物羈絆', RSETS[t].n, RSETS[t].d); }
    if (typeof FX !== 'undefined') { FX.burst(P.x, P.y, R.col, 24); FX.ring(P.x, P.y, 1.2, R.col); FX.text(P.x, P.y, R.n, R.col); FX.light(P.x, P.y, 3, '255,220,140', 0.6, 0.8); }
    Snd.play('relic');
    G.stats.relics = (G.stats.relics || 0) + 1;
    Meta.inc('relics'); Meta.event('relic');
    const cx = Meta.m().codex; cx.r = cx.r || {}; cx.r[k] = 1;
    return true;
  },
  relicPool(n, rng = G.rng) {
    const own = G.P.relics || [], pool = Object.keys(RELICS).filter(k => !own.includes(k));
    rng.shuffle(pool); return pool.slice(0, n);
  },
  relicItem(k) { return { id: G.nid++, k: 'relic', c: 'relic', n: 1, relic: k || this.relicPool(1)[0] || 'coin', known: true, ench: 0, cursed: false }; },
  // 遺物的命中效果
  relicProc(m, dmg) {
    const fx = typeof FX !== 'undefined';
    if (this.relic('fang')) this.healP(this.rset('blood') ? 2 : 1);
    if (m.hp <= 0) return;
    if (this.relic('heart') && !MON[m.k].fireImm && G.rng.chance(this.rset('flame') ? 0.35 : 0.15)) { m.st.burn = 3; if (fx) FX.burst(m.x, m.y, '#ff8a3a', 8); }
    if (this.relic('eye') && G.rng.chance(this.rset('storm') ? 0.3 : 0.15)) {
      let from = m; const hit = [m];
      for (let j = 0; j < (this.rset('storm') ? 2 : 1); j++) {
        const o = this.hostiles().filter(x => !hit.includes(x) && x.hp > 0 && cheb(x.x, x.y, from.x, from.y) <= 3)[0]; if (!o) break;
        if (fx) FX.proj(from.x, from.y, o.x, o.y, 'bolt'); Snd.play('thunder'); this.damageMon(o, Math.max(1, Math.round(dmg * 0.6)), {}); msg('雷神之眼的閃電擊中了' + this.monName(o) + '！', 'g'); hit.push(o); from = o;
      }
    }
  },
  rollRelicChoice() { const c = this.relicPool(3); if (c.length) G.relicChoices = c; },
  chooseRelic(k) { if (!G.relicChoices || !G.relicChoices.includes(k)) return; G.relicChoices = null; this.gainRelic(k); },

  // ---------- 可破壞的物件 ----------
  propAt(x, y) { return (G.F.props || []).find(p => p.x === x && p.y === y); },
  breakProp(p, by) {
    const F = G.F, K = PROPS[p.k], fx = typeof FX !== 'undefined';
    if (K.camp || K.deco) return false;
    F.props.splice(F.props.indexOf(p), 1);
    this.setTile(p.x, p.y, T.FLOOR);
    if (fx) { FX.debris(p.x, p.y, p.k); FX.shake(K.boom ? 9 : 2); }
    Snd.play(K.boom ? 'boom' : K.snd || 'wood');
    if (K.boom) {
      msg('火藥桶爆炸了！', 'w');
      if (fx) { FX.boom(p.x, p.y, 1.5, '255,140,40'); }
      for (const m of F.mons.slice()) if (m.hp > 0 && !MON[m.k].npc && cheb(m.x, m.y, p.x, p.y) <= 1) { this.damageMon(m, Math.round(G.rng.int(9, 15) + G.depth * 0.8), {}); if (m.hp > 0 && !MON[m.k].fireImm) m.st.burn = 3; }
      if (cheb(G.P.x, G.P.y, p.x, p.y) <= 1) this.hurtP(Math.max(1, Math.round(G.rng.int(5, 10) * this.burnRes())), '被火藥桶炸死');
      this.cloudArea(p.x, p.y, 1, 'fire', 2, '爆炸');
      // 連鎖爆炸
      for (const q of (F.props || []).slice()) if (PROPS[q.k].boom && cheb(q.x, q.y, p.x, p.y) <= 1) this.breakProp(q);
      return true;
    }
    if (K.spore) { this.cloudArea(p.x, p.y, 1, 'conf', 4); msg('孢子囊破了，噴出一團孢子！', 'w'); }
    else msg('你打破了' + K.n + '。', 'm');
    const r = G.rng.next();
    if (r < 0.28) this.dropItem(this.goldItem(G.depth, 0.6), p.x, p.y);
    else if (r < 0.4) this.dropItem(this.randomItem(G.depth), p.x, p.y);
    else if (r < 0.44 && G.depth >= 2) this.dropItem(this.makeItem(G.rng.pick(['apple', 'knife', 'p_heal'])), p.x, p.y);
    G.stats.props = (G.stats.props || 0) + 1;
    return true;
  },
  useCamp(p) {
    const P = G.P;
    if (p.used) { msg('篝火已經熄了。', 'm'); return false; }
    if (this.dangerNear()) { msg('附近有敵人，沒辦法安心休息。', 'w'); return false; }
    p.used = 1; p.k = 'fire';
    const h = Math.round(P.mhp * 0.6); this.healP(h); P.st.poison = 0;
    for (const id in P.cds) P.cds[id] = 0;
    P.hunger = Math.max(0, P.hunger - 60);
    msg('你在篝火旁坐下休息，暖意驅走了疲憊。HP 回復、技能冷卻完畢。', 'g'); Snd.play('holy');
    if (typeof FX !== 'undefined') { FX.burst(p.x, p.y, '#ffb040', 16); FX.light(p.x, p.y, 3, '255,170,80', 0.6, 1.2); }
    this.endTurn();
    return true;
  },

  // ---------- 人物 ----------
  talkTo(m) {
    if (typeof UI !== 'undefined') UI.npcTalk(m);
    return false;
  },
  npcOptions(m) {
    const P = G.P, d = G.depth, out = [];
    const bye = () => this.npcLeave(m);
    switch (m.k) {
      case 'captive':
        out.push({ t: '解開鎖鏈', fn: () => {
          msg('你解開了鎖鏈。冒險者：「謝謝你！這個給你，一路上撿到的。」', 'y');
          if (G.rng.chance(0.55)) this.dropItem(this.relicItem(), m.x, m.y); else this.dropItem(this.goodItem(d + 2), m.x, m.y);
          if (G.rng.chance(0.5)) this.dropItem(this.makeItem('p_heal'), m.x, m.y);
          bye();
        } });
        break;
      case 'sage': {
        const c1 = 25 + d * 6, c2 = 20 + d * 5;
        out.push({ t: '看透背包（' + c1 + ' 金）', dis: P.gold < c1 || !P.inv.some(o => this.needsId(o)), fn: () => { P.gold -= c1; let n = 0; for (const o of P.inv) if (this.needsId(o)) { this.identify(o); n++; } msg('占卜師撫過你的背包：「我看見了……」辨識了 ' + n + ' 件道具。', 'g'); Snd.play('read'); bye(); } });
        out.push({ t: '預見這層（' + c2 + ' 金）', dis: P.gold < c2, fn: () => { P.gold -= c2; this.magicMap(); G.F.detect = true; msg('占卜師低語：「整層樓都在我眼前。」地圖與所有怪物都浮現了。', 'g'); Snd.play('magic'); bye(); } });
        break;
      }
      case 'smith': {
        const w = this.equipped('w'), a = this.equipped('a'), c = 50 + d * 10, cr = 80 + d * 12;
        out.push({ t: '強化武器（' + c + ' 金）', dis: !w || P.gold < c, fn: () => { P.gold -= c; w.ench++; w.cursed = false; w.known = true; msg('鐵匠叮叮噹噹地敲打：' + this.itemName(w) + '變得更鋒利了！', 'g'); Snd.play('anvil'); if (typeof FX !== 'undefined') FX.equipFx(P, '#ffd75a'); bye(); } });
        out.push({ t: '強化護甲（' + c + ' 金）', dis: !a || P.gold < c, fn: () => { P.gold -= c; a.ench++; a.cursed = false; a.known = true; msg('鐵匠把' + this.itemName(a) + '敲得更堅固了！', 'g'); Snd.play('anvil'); if (typeof FX !== 'undefined') FX.equipFx(P, '#c8d8ff'); bye(); } });
        out.push({ t: '重鑄符文（' + cr + ' 金）', dis: !w || P.gold < cr, fn: () => { P.gold -= cr; this.giveRune(w); w.known = true; msg('鐵匠在' + this.itemName(w) + '上刻下了「' + RUNES[w.rune].n + '」符文！' + RUNES[w.rune].d, 'g'); Snd.play('anvil'); if (typeof FX !== 'undefined') FX.equipFx(P, RUNES[w.rune].col); bye(); } });
        break;
      }
      case 'gambler': {
        const bet = Math.min(P.gold, 40 + d * 8), box = 60 + d * 8;
        out.push({ t: '擲骰子（押 ' + bet + ' 金）', dis: P.gold < 10, fn: () => {
          const a = G.rng.int(1, 6) + G.rng.int(1, 6), b = G.rng.int(1, 6) + G.rng.int(1, 6);
          if (a > b) { P.gold += bet; msg('你擲出 ' + a + ' 點，賭徒 ' + b + ' 點——你贏了 ' + bet + ' 金幣！', 'g'); Snd.play('gold'); }
          else if (a === b) msg('雙方都是 ' + a + ' 點，平手。', 'm');
          else { P.gold -= bet; msg('你擲出 ' + a + ' 點，賭徒 ' + b + ' 點——你輸了 ' + bet + ' 金幣。', 'b'); Snd.play('warn'); }
          m.rolls = (m.rolls || 0) + 1; if (m.rolls >= 3) { msg('賭徒：「今天就到這裡吧！」', 'm'); bye(); }
          if (typeof UI !== 'undefined' && !m.gone) UI.npcTalk(m);
        } });
        out.push({ t: '神秘禮盒（' + box + ' 金）', dis: P.gold < box, fn: () => { P.gold -= box; const it = G.rng.chance(0.2) ? this.relicItem() : this.randomItem(d + 4); this.dropItem(it, P.x, P.y); msg('你打開禮盒……裡面是' + (it.k === 'relic' ? '一件遺物' : '一件道具') + '！', 'y'); Snd.play('chest'); bye(); } });
        break;
      }
      case 'knight': {
        const pot = P.inv.find(o => o.k === 'p_heal' || o.k === 'p_xheal');
        out.push({ t: pot ? '分他一瓶治療藥水' : '（你沒有治療藥水）', dis: !pot, fn: () => {
          this.removeInv(pot); G.known[pot.k] = 1;
          msg('騎士喝下藥水，站了起來：「我欠你一條命。收下這個吧。」', 'y');
          this.dropItem(this.relicItem(), m.x, m.y); bye();
        } });
        out.push({ t: '拿走他的金幣（' + (20 + d * 6) + ' 金）', fn: () => { P.gold += 20 + d * 6; msg('你拿走了騎士的錢袋。他用失望的眼神看著你……', 'w'); bye(); } });
        break;
      }
    }
    return out;
  },
  npcLine(m) {
    return { captive: '「拜託……幫我解開這些鎖鏈！我會報答你的！」', sage: '「旅人啊，我能看見你看不見的東西……只要一點點金幣。」', smith: '「好鐵需要好火，好武器需要好價錢。要不要敲兩下？」', gambler: '「運氣是最公平的東西！來一把？」', knight: '「咳……我撐不下去了。你身上……有治療藥水嗎？」' }[m.k] || '';
  },
  npcLeave(m) {
    m.used = 1;
    if (typeof FX !== 'undefined') { FX.burst(m.x, m.y, '#ffe0a0', 14); FX.puff(m.x, m.y, '#d8d0e8'); }
    m.hp = 0; m.gone = 1;
    G.stats.npcs = (G.stats.npcs || 0) + 1;
    Meta.inc('npcs'); Meta.event('npc');
    this.endTurn();
  },

  // 樓層生成的追加內容：人物、物件、篝火、樓層事件（使用獨立亂數，不影響原本的樓層）
  populateMore(F, depth, used) {
    const rng = new RNG('more:' + G.seed + ':' + depth);
    F.props = F.props || [];
    if (F.arena || (typeof window !== 'undefined' && window.__noMore)) return;
    const boss = !!BOSS_FLOOR[depth];
    // 可破壞的物件：靠著北牆擺放，一次 1～3 個
    const kinds = PROP_BY_BIOME[F.biome] || PROP_BY_BIOME[0];
    const pass = v => TP[v].walk && v !== T.LAVA;
    const groups = (typeof window !== 'undefined' && window.__noProps) ? 0 : rng.int(3, 6);
    for (let gi = 0; gi < groups; gi++) {
      for (let tries = 0; tries < 40; tries++) {
        const x = rng.int(2, F.w - 3), y = rng.int(2, F.h - 3), k = y * F.w + x;
        if (F.t[k] !== T.FLOOR || used.has(k) || Gen.inVault(F, k) || (F.shop && this.inRoom(F.shop, x, y))) continue;
        if (F.t[k - F.w] !== T.WALL || cheb(x, y, F.start[0], F.start[1]) < 3 || (F.stairs && cheb(x, y, F.stairs[0], F.stairs[1]) < 2)) continue;
        if (F.corr && F.corr[k]) continue;
        if (!Gen.safeBlock(F, x, y, pass)) continue;
        const kind = rng.pick(kinds);
        F.t[k] = T.PROP; used.add(k); F.props.push({ x, y, k: kind });
        const n = rng.int(0, 2);
        for (let j = 1; j <= n; j++) {
          const nx = x + (rng.chance(0.5) ? j : -j), nk = y * F.w + nx;
          if (F.t[nk] === T.FLOOR && F.t[nk - F.w] === T.WALL && !used.has(nk) && !(F.corr && F.corr[nk]) && Gen.safeBlock(F, nx, y, pass)) { F.t[nk] = T.PROP; used.add(nk); F.props.push({ x: nx, y, k: rng.chance(0.7) ? kind : rng.pick(kinds) }); }
        }
        break;
      }
    }
    // 篝火（一次性的休息點）
    if (!boss && depth >= 2 && rng.chance(0.3)) {
      for (let tries = 0; tries < 60; tries++) {
        const r = rng.pick(F.rooms); if (!r || r.kind !== 'room' || r.start) continue;
        const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2), k = y * F.w + x;
        if (F.t[k] !== T.FLOOR || used.has(k) || !DIRS8.every(([dx, dy]) => TP[F.t[k + dy * F.w + dx]].walk)) continue;
        if (!Gen.safeBlock(F, x, y, pass)) continue;
        F.t[k] = T.PROP; used.add(k); F.props.push({ x, y, k: 'fire', camp: 1 }); break;
      }
    }
    // 區域的大型擺設
    const nd = (typeof window !== 'undefined' && window.__noProps) ? 0 : F.biome === 4 ? 4 : rng.int(1, 3);
    for (let i = 0; i < nd; i++) {
      for (let tries = 0; tries < 60; tries++) {
        const r = rng.pick(F.rooms); if (!r || r.kind === 'vault' || r.kind === 'shop' || r.w < 5 || r.h < 5) continue;
        const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2), k = y * F.w + x;
        if (F.t[k] !== T.FLOOR || used.has(k) || cheb(x, y, F.start[0], F.start[1]) < 2 || !DIRS8.every(([dx, dy]) => TP[F.t[k + dy * F.w + dx]].walk && F.t[k + dy * F.w + dx] !== T.PROP)) continue;
        if (F.stairs && cheb(x, y, F.stairs[0], F.stairs[1]) < 2) continue;
        if (!Gen.safeBlock(F, x, y, pass)) continue;
        F.t[k] = T.PROP; used.add(k); F.props.push({ x, y, k: DECO_BY_BIOME[F.biome] || 'well' }); break;
      }
    }
    // 人物
    if (!boss && depth >= 2 && rng.chance(depth === 2 ? 0.5 : 0.38)) {
      const kinds2 = NPC_KINDS.filter(k => k !== 'smith' || depth >= 4);
      const k = rng.pick(kinds2);
      for (let tries = 0; tries < 80; tries++) {
        const r = rng.pick(F.rooms); if (!r || r.kind !== 'room' || r.start) continue;
        const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1), kk = y * F.w + x;
        if (F.t[kk] !== T.FLOOR || used.has(kk) || cheb(x, y, F.start[0], F.start[1]) < 5) continue;
        if (!Gen.safeBlock(F, x, y, pass)) continue;
        used.add(kk); const m = this.makeMon(k, x, y); m.awake = false; F.mons.push(m); break;
      }
    }
    // 樓層事件
    if (!boss && depth >= 3 && rng.chance(0.22) && !(typeof window !== 'undefined' && window.__noEv)) {
      let ev = rng.pick(Object.keys(FEVENTS)); if (ev === 'hunt' && depth < 5) ev = 'bounty'; F.event = ev;
      if (ev === 'mist') for (const m of F.mons) if (!MON[m.k].npc && !m.disg) { m.awake = false; m.mode = 'sleep'; }
      if (ev === 'gold') { for (const o of F.items) if (o.it.k === 'gold') o.it.n *= 2; for (let i = 0; i < 4; i++) { const p = this.randomFreeR(rng, used); if (p) F.items.push({ x: p[0], y: p[1], it: this.goldItem(depth, 1.5) }); } for (let i = 0; i < 2; i++) { const p = this.randomFreeR(rng, used); if (p) this.spawnAt('thief', p[0], p[1], false, used); } }
      if (ev === 'hunt') { const k = this.randomMonKind(); const p = this.randomFreeR(rng, used, 12); if (p) for (let i = 0; i < (depth >= 9 ? 3 : 2); i++) { const q = i ? this.nearFree(p[0], p[1], used) : p; if (!q) continue; const m = this.makeElite(this.spawnAt(k, q[0], q[1], false, used)); m.mode = 'hunt'; m.tx = F.start[0]; m.ty = F.start[1]; m.hunter = 1; } }
      if (ev === 'bounty') { for (let i = 0; i < 2; i++) { const p = this.placeBlock(F, rng, used, T.CHEST); if (p) F.chests.push({ x: p[0], y: p[1], open: 0, gold: i === 0 ? 1 : 0 }); } const p = this.randomFreeR(rng, used, 8); if (p) F.items.push({ x: p[0], y: p[1], it: this.relicItem(this.relicPool(1, rng)[0]) }); }
    }
  },
  randomFreeR(rng, used, minD = 6) {
    const F = G.F;
    for (let i = 0; i < 300; i++) {
      const x = rng.int(1, F.w - 2), y = rng.int(1, F.h - 2), k = y * F.w + x;
      if (F.t[k] === T.FLOOR && !used.has(k) && !Gen.inVault(F, k) && cheb(x, y, F.start[0], F.start[1]) >= minD && !this.monAt(x, y)) { used.add(k); return [x, y]; }
    }
    return null;
  },
});

// ---------- 每週挑戰與種子排行 ----------
const Weekly = {
  key(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
    return t.getUTCFullYear() + '-' + String(wk).padStart(2, '0');
  },
  seed() { return 'W' + this.key(); },
  info(seed = this.seed()) {
    const h = hashStr(seed), mods = Object.keys(DMODS), rel = Object.keys(RELICS);
    return { seed, cls: ['warrior', 'rogue', 'mage'][h % 3], mod: mods[(h >>> 3) % mods.length], relic: rel[(h >>> 7) % rel.length], asc: 2 };
  },
  // 每個種子保留前 5 名
  record(rec) {
    const M = Store.meta; M.seedTop = M.seedTop || {};
    const L = (M.seedTop[rec.seed] || []).concat([{ score: rec.score, cls: rec.cls, depth: rec.depth, win: rec.win, date: rec.date, turns: rec.turns }]).sort((a, b) => b.score - a.score);
    const rank = L.findIndex(e => e.score === rec.score && e.date === rec.date && e.turns === rec.turns) + 1;
    M.seedTop[rec.seed] = L.slice(0, 5);
    const ks = Object.keys(M.seedTop); if (ks.length > 60) delete M.seedTop[ks[0]];
    return { rank, n: L.length };
  },
};

// 大型擺設的像素圖
Object.assign(MSPR, {
  p_well(P) { P.e(12, 18, 8, 4, '#5a5a6a'); P.e(12, 17, 8, 3.4, '#8a8a9a'); P.e(12, 17, 6, 2.2, '#0a0a14'); P.e(12, 17.4, 4, 1.2, '#1a2a4a'); P.r(4, 18, 16, 3, '#6a6a7a'); for (let x = 5; x < 20; x += 3) P.r(x, 18, 2, 1, '#9a9aaa'); P.r(5, 6, 2, 12, '#6a4a2a'); P.r(17, 6, 2, 12, '#6a4a2a'); P.r(4, 5, 16, 2, '#8a5a30'); P.l(12, 7, 12, 14, '#c8c0b0'); P.r(10, 13, 4, 3, '#7a5a3a'); },
  p_shroom(P, f) { const g = f.i ? '#d0a0ff' : '#c08aff'; P.r(10, 9, 4, 13, '#e8dcc0'); P.r(10, 9, 1, 13, '#fff8e8'); P.r(13, 9, 1, 13, '#b8a888'); P.e(12, 7, 11, 5, '#7a3ab0'); P.e(12, 6, 10, 4, g); P.r(2, 8, 21, 1, '#4a2a6a'); for (const [x, y] of [[6, 5], [12, 3], [17, 6], [9, 7], [15, 4]]) { P.e(x, y, 1.3, 1, '#ffe8ff'); } P.e(5, 21, 2.4, 1.6, '#5fe0d0'); P.e(19, 21, 2, 1.4, '#5fe0d0'); P.p(5, 20, '#c8fff4'); },
  p_furnace(P, f) { const h = f.i ? 1 : 0; P.r(3, 6, 18, 16, '#3a2420'); P.r(4, 7, 16, 14, '#5a3a33'); for (let y = 8; y < 20; y += 3) P.r(4, y, 16, 1, '#3a2420'); P.r(7, 13, 10, 7, '#1a0a08'); P.r(8, 15 - h, 8, 5 + h, '#ff7a2a'); P.r(9, 17 - h, 6, 3 + h, '#ffd75a'); P.r(10, 18, 4, 2, '#fff2c0'); P.r(8, 2, 8, 5, '#3a2420'); P.r(9, 1, 6, 1, '#5a3a33'); P.r(2, 21, 20, 1, '#2a1410'); },
  p_statue(P) { P.r(5, 19, 14, 3, '#5a7a9a'); P.r(5, 19, 14, 1, '#a8d8f0'); P.r(8, 9, 8, 10, '#8ab8d8'); P.e(12, 6, 3.4, 3.4, '#a8d0e8'); P.r(10, 5, 5, 1, '#3a5a7a'); P.l(17, 4, 17, 19, '#c8e8ff', 2); P.r(15, 9, 5, 1, '#e8fbff'); P.r(8, 9, 2, 10, '#c8e8ff'); P.r(14, 9, 2, 10, '#6a98b8'); P.e(12, 13, 6.5, 9.5, 'rgba(200,240,255,.35)'); P.p(9, 10, '#ffffff'); P.p(11, 4, '#ffffff'); },
  p_brazier(P, f) { const h = f.i ? 1 : 0; P.r(10, 12, 4, 9, '#2a1a3a'); P.r(7, 20, 10, 2, '#3a2a4a'); P.poly([[4, 8], [20, 8], [17, 13], [7, 13]], '#4a2a6a'); P.r(4, 8, 16, 1, '#8a5ab0'); P.poly([[6, 8], [18, 8], [15, 1 - h], [12, 4], [9, 0 + h]], '#b05cff'); P.poly([[9, 8], [15, 8], [12, 2 - h]], '#ff8af0'); P.r(11, 6, 2, 2, '#ffe0ff'); },
});

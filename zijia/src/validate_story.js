// 驗證 story.js（v3：15 章、5 種結局、分歧/條件選項）
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'story.js'), 'utf8');
let D;
try { D = new Function(src + ';return {SPEAKERS,CHAPTERS,START}')(); }
catch (e) { console.log('SYNTAX ERROR:', e.message); process.exit(1); }
const {SPEAKERS, CHAPTERS, START} = D;
const errs = [], warns = [];
const E = (id, m) => errs.push(`[${id}] ${m}`);
const W = (id, m) => warns.push(`[${id}] ${m}`);

const TERRAIN = new Set('.fmw#br'.split(''));
const ENEMY_TIER = {bing:1,lian:1,pao:1,yi:1,dun:1,jia:1, jing:2,zhong:2,lian2:2,qi:2,ying:2, wei:3,te:3,ye:3,xu:3};
const BOSS_TIER = {general:3, cmdr:3, emperor:3, wuking:4, yuanwu:4};
const PLAYER_CLASSES = 's1 s2a s2b s3a s3b s3c s3d g1 g2a g2b g3a g3b g3c g3d r1 r2a r2b r3a r3b r3c r3d p1 p2a p2b p3a p3b p3c p3d t1 t2a t2b t3a t3b t3c t3d k2 k3a k3b'.split(' ');
const playerTier = c => c === 'k2' || /^[sgrpt]2/.test(c) ? 2 : /^k3|^[sgrpt]3/.test(c) ? 3 : 1;
const ROUTES = new Set(['common', 'A', 'B', 'H', 'T']);
const ENDING_IDS = ['A', 'B', 'H', 'H2', 'T'];
const P = {1:1.5,2:3,3:5.5,4:8,5:10,6:12,7:14.5,8:17,9:19,10:21,11:23,12:25,13:27,14:29,15:31};
function deployMin(id, no) {
  if (id === 'c1') return 4;
  if (/^c/.test(id)) return 5;
  if (/^[abt]/.test(id)) return 6;
  if (/^h/.test(id)) return no === 6 ? 3 : no === 7 ? 4 : no <= 11 ? 5 : 6;
  return 1;
}
const countBand = no => no <= 3 ? [6, 8] : no <= 9 ? [6, 14] : [8, 16];

if (!CHAPTERS[START]) E('START', 'START chapter missing');

// ---------- successors ----------
function succ(id) {
  const n = CHAPTERS[id].next;
  if (n === undefined) return [];
  if (typeof n === 'string') return [n];
  if (n.choice) return n.choice.options.map(o => o.next);
  if (n.branch) return n.branch.map(b => b.next).concat([n.else]);
  return [];
}

// ---------- flags defined anywhere ----------
const definedFlags = new Set();
for (const id in CHAPTERS) {
  const ch = CHAPTERS[id];
  const n = ch.next;
  if (n && n.choice) n.choice.options.forEach(o => {
    if (o.route) definedFlags.add('route' + o.route);   // engine sets route<X>
    Object.keys(o.flags || {}).forEach(f => definedFlags.add(f));
  });
  const ens = ch.enemies.concat(...(ch.events || []).map(e => e.spawn || []));
  ens.forEach(en => { if (en.talk && en.talk.flag) definedFlags.add(en.talk.flag); });
}

// ---------- reachability ----------
const reach = new Set(); const stack = [START];
while (stack.length) {
  const id = stack.pop(); if (reach.has(id)) continue;
  if (!CHAPTERS[id]) { E(id, 'referenced but missing'); continue; }
  reach.add(id);
  for (const s of succ(id)) { if (!CHAPTERS[s]) E(id, 'next target missing: ' + s); else stack.push(s); }
}
for (const id in CHAPTERS) if (!reach.has(id)) E(id, 'unreachable from START');

// ---------- scene lines ----------
function checkLine(id, where, l) {
  if (Array.isArray(l)) {
    if (l.length !== 2 || typeof l[0] !== 'string' || typeof l[1] !== 'string' || !l[1]) E(id, `${where}: malformed line ${JSON.stringify(l)}`);
    else if (l[0] !== '' && !SPEAKERS[l[0]]) E(id, `${where}: unknown speaker ${l[0]}`);
  } else if (l && typeof l === 'object' && (l.if || l.ifnot) && Array.isArray(l.line)) {
    const f = l.if || l.ifnot;
    if (!definedFlags.has(f)) E(id, `${where}: conditional on never-set flag '${f}'`);
    checkLine(id, where, l.line);
  } else E(id, `${where}: bad scene line ${JSON.stringify(l)}`);
}
const checkLines = (id, where, arr) => { if (!Array.isArray(arr)) { E(id, where + ' not array'); return; } arr.forEach(l => checkLine(id, where, l)); };

const endingSeen = {};
const summary = [];
const nextStr = n => n === undefined ? '(ending)' : typeof n === 'string' ? n
  : n.choice ? 'choice→' + n.choice.options.map(o => o.next + (o.requires ? '*' : '')).join('/')
  : 'branch→' + n.branch.map(b => b.next).join('/') + '|else ' + n.else;

for (const id in CHAPTERS) {
  const ch = CHAPTERS[id];
  if (!ROUTES.has(ch.route)) E(id, 'bad route ' + ch.route);
  if (!(ch.no >= 1 && ch.no <= 15)) E(id, 'bad no ' + ch.no);
  checkLines(id, 'pre', ch.pre); checkLines(id, 'post', ch.post);
  if (ch.pre.length < 6 || ch.pre.length > 14) W(id, `pre length ${ch.pre.length}`);
  if (ch.post.length < 4 || ch.post.length > 12) W(id, `post length ${ch.post.length}`);
  for (const k of ['brief', 'winText', 'loseText', 'title']) if (typeof ch[k] !== 'string' || !ch[k]) E(id, 'missing ' + k);
  if (!String(ch.loseText).includes('剛鐵號被擊墜')) E(id, 'loseText lacks 剛鐵號被擊墜');

  // next / choice / branch / ending
  const n = ch.next;
  if (n === undefined) {
    if (!ch.ending) E(id, 'no next and no ending');
  } else {
    if (ch.ending) E(id, 'ending on chapter with next');
    if (typeof n === 'string') { /* ok */ }
    else if (n.choice) {
      if (!n.choice.prompt) E(id, 'choice without prompt');
      if (!Array.isArray(n.choice.options) || n.choice.options.length < 2) E(id, 'choice needs >=2 options');
      n.choice.options.forEach((o, i) => {
        if (!o.text || !o.desc || !o.next) E(id, `option${i} missing text/desc/next`);
        if (o.route && !ROUTES.has(o.route)) E(id, `option${i} bad route`);
        if (o.flags && (typeof o.flags !== 'object' || Object.values(o.flags).some(v => v !== true))) E(id, `option${i} flags must be {k:true}`);
        if (o.requires) {
          if (!Array.isArray(o.requires)) E(id, `option${i} requires not array`);
          else o.requires.forEach(f => { if (!definedFlags.has(f)) E(id, `option${i} requires never-set flag ${f}`); });
          if (!o.requiresText) E(id, `option${i} requires without requiresText`);
        }
      });
      if (n.choice.options.every(o => o.requires)) E(id, 'every option is gated');
    } else if (n.branch) {
      if (!Array.isArray(n.branch) || !n.else) E(id, 'branch needs array + else');
      n.branch.forEach((b, i) => {
        [...(b.all || []), ...(b.none || [])].forEach(f => { if (!definedFlags.has(f)) E(id, `branch${i} uses never-set flag ${f}`); });
        if (!b.next) E(id, `branch${i} missing next`);
      });
    } else E(id, 'bad next');
    for (const s of succ(id)) if (CHAPTERS[s] && CHAPTERS[s].no !== ch.no + 1) E(id, `next ${s} has no ${CHAPTERS[s].no}, expected ${ch.no + 1}`);
  }
  if (ch.ending) {
    if (!ENDING_IDS.includes(ch.ending.id)) E(id, 'bad ending id ' + ch.ending.id);
    endingSeen[ch.ending.id] = (endingSeen[ch.ending.id] || 0) + 1;
    if (!ch.ending.title) E(id, 'ending without title');
    checkLines(id, 'ending', ch.ending.lines);
    if (ch.ending.lines.length < 8 || ch.ending.lines.length > 16) W(id, `ending length ${ch.ending.lines.length}`);
  }

  // map
  const map = ch.map, H = map.length, Wd = map[0].length;
  if (H < 10 || H > 12) E(id, 'height ' + H);
  if (Wd < 14 || Wd > 18) E(id, 'width ' + Wd);
  map.forEach((r, y) => { if (r.length !== Wd) E(id, `row ${y} length ${r.length} != ${Wd}`); for (const c of r) if (!TERRAIN.has(c)) E(id, `bad terrain '${c}' row ${y}`); });
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < Wd) ? map[y][x] : null;
  const okCell = (x, y, what) => { const t = at(x, y); if (t === null) { E(id, `${what} out of bounds (${x},${y})`); return false; } if (t === '#') { E(id, `${what} on wall (${x},${y})`); return false; } return true; };
  const occ = new Map();
  const place = (x, y, what) => { if (!okCell(x, y, what)) return; const k = x + ',' + y; if (occ.has(k)) E(id, `${what} overlaps ${occ.get(k)} at (${x},${y})`); occ.set(k, what); };
  ch.deploy.forEach(([x, y], i) => place(x, y, 'deploy' + i));
  const dmin = deployMin(id, ch.no);
  if (ch.deploy.length !== dmin) E(id, `deploy ${ch.deploy.length} != required ${dmin}`);
  (ch.guests || []).forEach(g => { if (!['bein', 'hogan', 'rei'].includes(g.id)) E(id, 'bad guest ' + g.id); place(g.x, g.y, 'guest ' + g.id); });
  (ch.protect || []).forEach(p => { if (!(ch.guests || []).some(g => g.id === p)) E(id, 'protect id not a guest ' + p); });

  // enemies
  const tags = new Set();
  const exp = P[ch.no];
  const checkEnemy = (en, what) => {
    const isBoss = en.c in BOSS_TIER, isPlayer = PLAYER_CLASSES.includes(en.c);
    if (!(en.c in ENEMY_TIER) && !isBoss && !isPlayer) E(id, `${what}: bad class ${en.c}`);
    if (isPlayer && !en.pilot) E(id, `${what}: player-class enemy must be named`);
    if (!(Number.isInteger(en.lv) && en.lv >= 1 && en.lv <= 10)) E(id, `${what}: bad lv ${en.lv}`);
    if (en.ai && !['aggr', 'hold'].includes(en.ai)) E(id, `${what}: bad ai`);
    if (en.tag) { if (tags.has(en.tag)) E(id, 'dup tag ' + en.tag); tags.add(en.tag); }
    if (en.retreatLines) checkLines(id, what + ' retreatLines', en.retreatLines);
    if (en.talk) {
      if (!['lena', 'lei', 'yu'].includes(en.talk.join)) E(id, 'bad talk.join ' + en.talk.join);
      if (!Array.isArray(en.talk.by) || !en.talk.by.every(b => SPEAKERS[b])) E(id, 'bad talk.by');
      if (!en.talk.flag) E(id, 'talk without flag');
      checkLines(id, what + ' talk', en.talk.lines);
      if (en.talk.lines.length < 4 || en.talk.lines.length > 8) W(id, `talk length ${en.talk.lines.length}`);
    }
    // balance
    if (en.c === 'wuking' || en.c === 'yuanwu') { if (en.lv < 6 || en.lv > 8) E(id, `${what}: ${en.c} lv ${en.lv} not in 6–8`); }
    else if (!isBoss) {
      const tier = isPlayer ? playerTier(en.c) : ENEMY_TIER[en.c];
      const rank = (tier - 1) * 10 + en.lv;
      const named = !!(en.boss || en.pilot);
      if (named) { if (rank < exp + 1 || rank > exp + 7) E(id, `${what}: named ${en.c} rank ${rank} outside ${exp + 1}..${exp + 7}`); }
      else {
        const earlyT2 = tier === 2 && en.lv <= 3 && ch.no <= 6;
        if (!earlyT2 && (rank < exp - 8 || rank > exp + 2)) E(id, `${what}: ${en.c} lv${en.lv} rank ${rank} outside ${exp - 8}..${exp + 2}`);
      }
    }
  };
  ch.enemies.forEach((en, i) => { checkEnemy(en, 'enemy' + i); place(en.x, en.y, 'enemy' + i + '(' + en.c + ')'); });
  for (const [px, py] of ch.deploy) for (const en of ch.enemies) if (Math.abs(px - en.x) + Math.abs(py - en.y) <= 1) W(id, `enemy adjacent to deploy at (${en.x},${en.y})`);

  let spawnCount = 0;
  (ch.events || []).forEach((ev, i) => {
    if (!(ev.turn >= 2 && ev.turn <= 5)) E(id, `event${i} turn ${ev.turn}`);
    if (!['P', 'E'].includes(ev.phase)) E(id, `event${i} phase`);
    if (ev.lines) checkLines(id, 'event' + i, ev.lines);
    const sp = new Set();
    (ev.spawn || []).forEach((en, j) => {
      spawnCount++;
      checkEnemy(en, `event${i}.spawn${j}`);
      if (okCell(en.x, en.y, `event${i}.spawn${j}`)) {
        const k = en.x + ',' + en.y;
        if (sp.has(k)) E(id, `spawn dup at ${k}`); sp.add(k);
        if (ch.deploy.some(([x, y]) => x === en.x && y === en.y)) E(id, `spawn on deploy cell ${k}`);
        if (!(en.x === 0 || en.y === 0 || en.x === Wd - 1 || en.y === H - 1)) W(id, `spawn not on edge ${k}`);
        if (occ.has(k)) W(id, `spawn on initial unit cell ${k} (${occ.get(k)})`);
      }
    });
  });
  const total = ch.enemies.length + spawnCount;
  const [lo, hi] = countBand(ch.no);
  if (total < lo || total > hi) E(id, `enemy total ${total} outside ${lo}–${hi}`);

  const w = ch.win;
  if (w.type === 'boss') { if (!tags.has(w.target)) E(id, 'boss target tag missing ' + w.target); }
  else if (w.type === 'survive') { if (!(w.turns > 0)) E(id, 'survive turns'); }
  else if (w.type === 'escape') { if (w.who !== 'gang') E(id, 'escape who'); w.cells.forEach(([x, y]) => okCell(x, y, 'escape cell')); }
  else if (w.type !== 'all') E(id, 'bad win type ' + w.type);

  // BFS from deploy[0]
  const [sx, sy] = ch.deploy[0]; const seen = new Set([sx + ',' + sy]); const qq = [[sx, sy]];
  while (qq.length) { const [x, y] = qq.shift(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, t = at(nx, ny); if (t && t !== '#' && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); qq.push([nx, ny]); } } }
  const unreach = (x, y, what) => { if (!seen.has(x + ',' + y)) E(id, `${what} unreachable (${x},${y})`); };
  ch.enemies.forEach((en, i) => unreach(en.x, en.y, 'enemy' + i));
  (ch.events || []).forEach(ev => (ev.spawn || []).forEach(en => unreach(en.x, en.y, 'spawn')));
  ch.deploy.forEach(([x, y]) => unreach(x, y, 'deploy'));
  (ch.guests || []).forEach(g => unreach(g.x, g.y, 'guest'));
  if (w.type === 'escape') w.cells.forEach(([x, y]) => unreach(x, y, 'escape'));

  ['joinPre', 'leavePre', 'join'].forEach(k => (ch[k] || []).forEach(c => { if (!SPEAKERS[c]) E(id, `${k} unknown ${c}`); }));

  summary.push({id, no: ch.no, route: ch.route, title: ch.title, size: `${Wd}x${H}`, enemies: `${ch.enemies.length}+${spawnCount}`,
    win: w.type + (w.target ? ':' + w.target : '') + (w.turns ? ':' + w.turns : ''), deploy: ch.deploy.length, next: nextStr(ch.next)});
}

for (const e of ENDING_IDS) if (endingSeen[e] !== 1) E('endings', `ending id ${e} appears ${endingSeen[e] || 0} times (need exactly 1)`);
for (const e in endingSeen) if (!ENDING_IDS.includes(e)) E('endings', 'unexpected ending id ' + e);

// Simplified Chinese scan (chars that are Simplified-only; shared chars are whitelisted)
const SIMP = '着里后于么发尽划够岛产众伤传优儿兰净准减凤刘则刚创删别剑剧劝办务动劳势匀华协单卫却厉县参双变叠叹吓吗听启呜咏响哑唤啰喷坏块坚垒复头夺奋妇妈娇孙学宁宝实宠审宪宫宽宾对寻导寿将尔尘尝层属岁岭岚币师帘帜帧并庄库废开异弃弯归录彦彻径忆忧怀态总恳恼悦悬惊惩惫愤愿戏战户执扩扫扬拟拣挚挝挞挤挥损捡换据掷揽搁搂携摄摆摇撑擞数斋斗无时旷昼显晓晕暂术朴机杀杂权杆杠条来杰极构枢枣柠标栈栋栏树样档桥桨桩梦检椭楼榄橱欢欧歼殁残殡毁毙气汇汉汤沟沦沪泞泪泸洁洒浅浆测济浏浓涛涝润涨涩渊渍渔温湾湿溃滚满滤滥滩漓灭灯灵灾灿炉炖炜点炼烂烛烟烦烧烫热焕爱牍牺犊状犹狈猪献猫玛环现琼瑶电画畅疗疡疮疯痒瘫皑盏监盖盘眯睁瞒矿码砖砚砾础硕确碍碱礼祯祸禀离秃秆种积称秽稣稳穷窍窑窜窝窥竖竞笃笋笔笼筑筛筝签简类粮紧纠红约级纪纯纱纲纳纵纷纸纹线练组细织终绍经结绕绘给络绝统继绩续维绵综绿缓编缘缚缩这们个说对为军击队敌国门见话还没让过关与从护弹坠联骑号记忆样岁场长问间乐书东车马鸟鱼龙云语请谢认识读写买卖钱银铁钢风飞体员团区应该当边进远运连选择虽难离领帮带历压厅厂广庆床庙张强讨许论设访证评诉词试话诞询详误诸诺谁调谅谈谋谓谜谨负贡财责贤败货质贪贫购贯贵费贺贼资赏赖赛赞赢赶趋跃践踪轨轮软转轰轻载较辅辆辈辉输辞达迁迈违迟适递遗遥邻酿释针钟钥铃铭链锁锋锐错键镇镜闪闭闯闲闷闹闻阀阅阳阴阵阶际陆陈险随隐雾静页顶项顺须顽顾顿预频题颜额飘饭饮饰饱饿馆驱驶驾骂验鲜鸡鸣麦黄齐虚';
const SAFE = new Set(['准', '只', '征', '志', '骨', '干', '台']);
const found = new Map();
for (const c of src) if (SIMP.includes(c) && !SAFE.has(c)) found.set(c, (found.get(c) || 0) + 1);

console.log('Chapters:', Object.keys(CHAPTERS).length, 'reachable:', reach.size, '| endings:', JSON.stringify(endingSeen));
console.table(summary);
console.log('Flags defined:', [...definedFlags].sort().join(', '));
if (warns.length) { console.log('WARNINGS:'); warns.forEach(w => console.log('  ' + w)); }
if (found.size) { console.log('SIMPLIFIED CHARS FOUND:', [...found].map(([c, n]) => c + '×' + n).join(' ')); errs.push('simplified chars present'); }
else console.log('Simplified-character scan: none found');
if (errs.length) { console.log('ERRORS:'); errs.forEach(e => console.log('  ' + e)); process.exit(1); }
console.log('ALL CHECKS PASSED');

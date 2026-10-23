'use strict';
// 深淵地牢：像素圖（角色、怪物、道具用文字點陣定義，地形用程式產生）
const SPR = {
  warrior: { p: { h: '#d6dde8', H: '#8f9bb0', s: '#f0c090', e: '#20162a', r: '#d8443a', R: '#9a2a30', b: '#5a3a22', l: '#46465a', w: '#eef3fa', g: '#e0b040', k: '#3a2a22' }, m: [
    '....hhhh....', '...hhhhhh...', '...HHHHHH...', '...HseseH..w', '....ssss...w', '..rrrrrrr..w',
    '.srRrrrRrs.w', '.s.rrrrr.sgg', '...bbbbb..g.', '...ll.ll....', '...ll.ll....', '..kk...kk...'] },
  rogue: { p: { g: '#5fae4a', G: '#3a7a34', s: '#f0c090', e: '#20162a', c: '#2e3a3a', b: '#6a4a2a', l: '#3a3040', w: '#e8eef6', k: '#2a2020' }, m: [
    '....gggg....', '...gGGGGg...', '..gGsssGg...', '..gGeseGg...', '..gGsssGg...', '..ccgggcc...',
    '.cccGGGccc..', '.s.cGGGc.sw.', '...cbbbc..w.', '...ll.ll....', '...ll.ll....', '..kk...kk...'] },
  mage: { p: { b: '#4a6fe0', B: '#2f48a8', y: '#ffd84a', o: '#9ff0ff', O: '#4fc8ff', '|': '#8a5a30', s: '#f0c090', e: '#20162a', k: '#2a2040' }, m: [
    '.....b......', '....bbb.....', '...bbyBb..o.', '..bbbbbbb.O.', '...sesess.|.', '...sssss..|.',
    '..bbBBBbb.|.', '.sbbBBBbbs|.', '..bbBBBbb.|.', '..bbBBBbb.|.', '..bbbbbbb.|.', '..kk...kk.|.'] },
  ranger: { p: { t: '#9a6a3a', T: '#6a4424', s: '#f0c090', e: '#20162a', g: '#4f9a4a', G: '#2f6a34', b: '#5a3a22', l: '#4a3a2a', w: '#c08a40', i: '#efe6d0', k: '#2a2020' }, m: [
    '....tttt..w.', '...tTTTTt.wi', '...tseseT.wi', '...tssssT.wi', '..ggggggg.wi', '.sgGgggGgs.w',
    '.s.ggggg....', '...bbbbb....', '...ll.ll....', '...ll.ll....', '...ll.ll....', '..kk...kk...'] },
  paladin: { p: { p: '#e84a4a', h: '#f2f4f8', H: '#b8c0d0', s: '#f0c090', e: '#20162a', a: '#e8ecf2', A: '#a8b2c4', y: '#f0c040', Q: '#3a6ad0', l: '#8a92a4', k: '#4a4a5a' }, m: [
    '.....pp.....', '....hhhh....', '...hHHHHh...', '...hseseh...', '....ssss....', '..aaaaaaa...',
    'QQaAyAyAas..', 'QyQaaaaaas..', 'QQQ.yyy.....', '.Q.ll.ll....', '...ll.ll....', '..kk...kk...'] },
  keeper: { p: { y: '#c8402a', Y: '#8a2a1a', s: '#f0c090', e: '#20162a', w: '#efe6d8', p: '#3a8a6a', P: '#2a6a4a', g: '#e0b040', k: '#3a2a22' }, m: [
    '....yyyy....', '..yyYYYYyy..', '...ssssss...', '...sesses...', '...swwwws...', '..ppppppppg.',
    '.sppPPPPppgg', '.s.pPPPPp.gg', '...pppppp...', '...pp..pp...', '...pp..pp...', '..kk....kk..'] },
  rat: { p: { m: '#8a7a6a', M: '#5e5048', e: '#ff4040', n: '#ff9aa8', p: '#e88a98', t: '#e89aa8', f: '#e89aa8' }, m: [
    '............', '............', '............', '............', '.....mmmm.p.', '...mmmmmmmp.',
    '..mmmmmmmeme', 't.mmmmmmmmmn', '.tmMMMMMmm..', '..t.f..f....', '............', '............'] },
  bat: { p: { w: '#5a3a6a', W: '#8a5aa0', b: '#4a3050', e: '#ffdf4a', f: '#efe6ef' }, m: [
    '............', '............', 'w....bb....w', 'ww..bbbb..ww', 'wWw.beeb.wWw', 'wWWwbbbbwWWw',
    'wWWWwbbwWWWw', '.wWW.bb.WWw.', '..ww.ff.ww..', '...w....w...', '............', '............'] },
  slime: { p: { g: '#2f9a4a', G: '#5fd06a', h: '#d8ffd0', e: '#1a3a20' }, m: [
    '............', '............', '............', '............', '.....gg.....', '....gGGg....',
    '...gGhGGg...', '..gGhGGGGg..', '..gGeGGeGg..', '.gGGGGGGGGg.', '.gGGGGGGGGg.', '..gggggggg..'] },
  kobold: { p: { k: '#c87a3a', K: '#a05a2a', e: '#ffe24a', n: '#e8c09a', c: '#8a5a3a', b: '#5a3a22', '|': '#b0a090' }, m: [
    '............', '...k....k...', '...kkkkkk...', '...kekkek...', '...kkkkkkn..', '....kKKk..|.',
    '..ckkkkkkc|.', '..c.kkkk.c|.', '....bbbb..|.', '....k..k..|.', '...kk..kk...', '............'] },
  archer: { p: { g: '#6ab04a', e: '#ff3a3a', l: '#7a5a3a', b: '#4a3a2a', w: '#a07040', i: '#e8e0d0' }, m: [
    '............', '.g..gggg..g.', '.gggggggggg.', '...gegeg..w.', '...ggggg.wi.', '...lllll.wi.',
    '..glllllgwi.', '..g.lll..wi.', '....bbb...w.', '....g.g.....', '...gg.gg....', '............'] },
  chest: { p: { b: '#6a3a1a', B: '#a8642a', g: '#e0b040', y: '#fff0a0' }, m: [
    '............', '............', '..bbbbbbbb..', '.bBBBBBBBBb.', '.bBBBBBBBBb.', '.ggggyygggg.',
    '.bBBByyBBBb.', '.bBBBBBBBBb.', '.bBBBBBBBBb.', '.gggggggggg.', '............', '............'] },
  mimic: { p: { b: '#6a3a1a', B: '#a8642a', g: '#e0b040', e: '#ff3a3a', w: '#f8f0e0', r: '#c02a3a', R: '#801a2a' }, m: [
    '............', '..bbbbbbbb..', '.bBBBBBBBBb.', '.bBeBBBBeBb.', '.gggggggggg.', '.w.w.w.w.w..',
    '.rrrrrrrrrr.', '.rRRRRRRRRr.', '..w.w.w.w.w.', '.gggggggggg.', '.bBBBBBBBBb.', '..b......b..'] },
  spider: { p: { s: '#5a3a6a', S: '#7a4a8a', e: '#ff4a4a', l: '#3a2440' }, m: [
    '............', '............', 'l..........l', '.l..ssss..l.', '..lsSSSSsl..', 'llsSeSSeSsll',
    '..sSSSSSSs..', '.l.sSSSSs.l.', 'l..lsSSsl..l', '..l..ss..l..', '.l........l.', '............'] },
  shroom: { p: { r: '#c84a8a', R: '#8a2a6a', w: '#ffe0f0', d: '#6a2a5a', c: '#e8dcc0', e: '#2a1a2a' }, m: [
    '............', '...rrrrrr...', '..rRwrrwRr..', '.rrwrrrrRrr.', '.rRrrwRrrwr.', '..dddddddd..',
    '....cccc....', '...ceccec...', '..cccccccc..', '..c.cccc.c..', '....c..c....', '...cc..cc...'] },
  wisp: { p: { o: '#2a6aff', O: '#5fb8ff', W: '#d8f4ff', w: '#ffffff', e: '#2a2a8a' }, m: [
    '.....o......', '....oo..o...', '...oOOo.o...', '...oOOOoo...', '..oOwOOOo...', '..oOWWWOOo..',
    '.oOWeWWeWOo.', '.oOWWWWWWOo.', '.oOWWWWWWOo.', '..oOWWWWOo..', '...oOOOOo...', '....oooo....'] },
  thief: { p: { p: '#8a6acf', c: '#3a3050', e: '#ffe04a', m: '#f8f0e0', S: '#b08a5a', y: '#ffd040' }, m: [
    '............', '...pp..pp...', '...pppppp...', '..ppeppepp..', '...pppppp...', '....pmmp....',
    '..ccccccc.SS', '.pcccccccSSS', '...ccccc.SyS', '....c..c.SS.', '...pp..pp...', '............'] },
  shaman: { p: { r: '#c8402a', R: '#8a2a1a', y: '#ffd040', g: '#6ab04a', e: '#ff3a3a', o: '#efe6cf', '|': '#7a5a3a' }, m: [
    '..r.y.r.....', '..ryryr...o.', '.g.gggg.g.o.', '.gggeggegg|.', '...gggggg.|.', '....rrrr..|.',
    '..grrRRrrg|.', '..g.rRRr..|.', '....rrrr..|.', '....g..g..|.', '...gg..gg.|.', '............'] },
  imp: { p: { r: '#e04a3a', R: '#a02a2a', h: '#f0e0c0', y: '#ffe04a', m: '#2a1010', w: '#6a2030', W: '#a03040', f: '#ffb040', F: '#fff0a0' }, m: [
    '............', '..h......h..', '..hr....rh..', '...rrrrrr...', '..rryrryrr..', 'ww.rrmmrr.ww',
    'wWw.rrrr.wWw', '.ww.rRRr.ww.', '...rrRRrr.f.', '....r..r.fFf', '...rr..rr.f.', '............'] },
  orc: { p: { o: '#7a9a5a', O: '#5a7a40', e: '#ff3a2a', w: '#f8f0d8', m: '#6a5a5a', M: '#4a3e3e', b: '#4a3020', l: '#5a4a3a', k: '#2a2020', A: '#c8ccd6', '|': '#7a5a3a' }, m: [
    '...oooooo...', '..oOOOOOOo..', '..oOeOOeOo..', '..oOOOOOOo..', '..oOwOOwOo..', '.mmmoooommm.',
    'mmmMmmmmMmmA', 'oMmmmmmmmmoA', 'o.bbbbbbbb.|', '..lll..lll.|', '..lll..lll..', '.kkk....kkk.'] },
  necro: { p: { p: '#5a2a7a', P: '#3a1a50', w: '#e8e0d0', g: '#7fff7a', o: '#7fff7a', '|': '#6a5a4a' }, m: [
    '....pppp....', '...pPPPPp...', '..pPwwwwPp..', '..pPwgwgPp..', '..pPwwwwPp..', '..ppPwwPpp.o',
    '.ppPPPPPPpp|', '.wpPPgPPPpw|', '..pPPPPPPp.|', '..pPPPPPPp.|', '.ppPPPPPPpp|', '.pp.pp.pp.p|'] },
  skeleton: { p: { w: '#ece6d6', e: '#2a1a2a', d: '#5a4a4a', s: '#b8c0cc', h: '#8a6a3a' }, m: [
    '....wwww....', '...wwwwww...', '...wewwew...', '...wwwwww...', '....wddw..s.', '..ww.ww.wws.',
    '.w.wwwwww.s.', '...w.ww.w.h.', '....wwww....', '....w..w....', '...ww..ww...', '............'] },
  salamander: { p: { o: '#ff7a2a', O: '#e04a1a', y: '#ffe04a', t: '#ffa040', m: '#2a1010', f: '#c03a1a' }, m: [
    '............', '............', '............', '............', '......oooo..', 't...ooOyOOo.',
    'tt.oOOOOOOOm', '.toOOyOOyOo.', '..tOOOOOOO..', '...ff.ff.ff.', '............', '............'] },
  golem: { p: { c: '#4a7aa8', C: '#8ad0f0', w: '#e8fbff', e: '#4af0ff' }, m: [
    '...cCCCCc...', '..cCwCCwCc..', '..cCeCCeCc..', '..cCCCCCCc..', 'ccCCCccCCCcc', 'cCCwCCCCwCCc',
    'cCCCCCCCCCCc', 'cC.cCCCCc.Cc', 'cc.cCCCCc.cc', '...cCc.cCc..', '...cCc.cCc..', '..ccc...ccc.'] },
  wolf: { p: { w: '#e8eef4', W: '#a8b8c8', e: '#4ac8ff', n: '#2a2a3a', t: '#c8d4e0', g: '#8a9aaa' }, m: [
    '............', '............', '.........ww.', 't.......wwww', 'tt......wewn', '.twwwwwwwww.',
    '..wwwwwwwWW.', '..wWWWWWWW..', '..w.w..w.w..', '..w.w..w.w..', '.gg.g..g.gg.', '............'] },
  shade: { p: { k: '#2a2440', K: '#14101e', p: '#d05cff', b: '#c8c0e0' }, m: [
    '....kkkk....', '...kKKKKk...', '..kKKKKKKk..', '..kKpKKpKk..', '..kKKKKKKk..', '.bkkKKKKkkb.',
    'b.kKKKKKKk.b', '..kKKKKKKk..', '..kKKKKKKk..', '...kKKKKk...', '...k.kk.k...', '............'] },
  gargoyle: { p: { g: '#8a8a96', G: '#6a6a78', h: '#c8c8d0', e: '#ff5a3a', f: '#e8e8e8', w: '#5a5a66', W: '#7a7a88', c: '#4a4a56' }, m: [
    '..h......h..', '..hg....gh..', 'w..gggggg..w', 'ww.geggeg.ww', 'wWw.gggg.wWw', 'wWWwgffgwWWw',
    '.wWgGGGGgWw.', '..wgGGGGgw..', '...gGGGGg...', '...gg..gg...', '..ccc..ccc..', '............'] },
  frostmage: { p: { c: '#d8f0ff', C: '#7ab8e8', s: '#e0d0e8', e: '#2a4a8a', w: '#ffffff', i: '#e8fbff', I: '#8ae8ff', '|': '#a0c8e0' }, m: [
    '....cccc....', '...cCCCCc.i.', '..cCsssCc.I.', '..cCeseCc.|.', '...csssc..|.', '..ccCCCcc.|.',
    '.scCCwCCcs|.', '..cCCwCCc.|.', '..cCCwCCc.|.', '..cCCCCCc.|.', '..ccccccc.|.', '..cc...cc...'] },
  sporeling: { p: { r: '#4ac8b0', R: '#2a8a7a', w: '#e0fff8', d: '#2a5a5a', c: '#e8dcc0', e: '#2a1a2a' }, m: [
    '............', '............', '............', '............', '....rrrr....', '...rRwrRr...',
    '..rrrrrrrr..', '...dddddd...', '....cecc....', '....cccc....', '....c..c....', '............'] },
  ratking: { p: { y: '#ffd040', m: '#7a6a5a', M: '#4e4038', e: '#ff4040', n: '#ff9aa8', p: '#e88a98', t: '#e89aa8', f: '#e89aa8' }, m: [
    '....y.y.y...', '....yyyyy...', '...mmmmmmp..', '..mmmmmmmmp.', '.mmmmmmmemem', 'tmmmmmmmmmmn',
    'tmMMMMMMmmm.', '.tmmmmmmmm..', '..mMmmmMm...', '..f.f..f.f..', '............', '............'] },
  mother: { p: { r: '#9a4ad0', R: '#6a2a9a', w: '#ffe0ff', d: '#4a2a5a', c: '#e8dcc0', e: '#2a1a2a', m: '#6a2a3a' }, m: [
    '..rrrrrrrr..', '.rRwrrrrwRr.', 'rrrrwRRrrrrr', 'rwRrrrrrrRwr', 'rrrrrwwrrrrr', '.dddddddddd.',
    '...ccccccc..', '...ceccecc..', '...cccmccc..', '..cccccccc..', '.cccccccccc.', 'cc.cc..cc.cc'] },
  forge: { p: { k: '#3a2420', K: '#6a3a2a', y: '#ffe04a', o: '#ff7a2a' }, m: [
    '...kkkkkk...', '..kKKKKKKk..', '..kKyKKyKk..', '..kKKooKKk..', 'kkkKKKKKKkkk', 'kKKoKKKKoKKk',
    'kKKKooooKKKk', 'kK.kKooKk.Kk', 'kk.kKKKKk.kk', '...kKk.kKk..', '...kKk.kKk..', '..kkk...kkk.'] },
  witch: { p: { i: '#bff4ff', h: '#e8f4ff', s: '#e8d8f0', e: '#3a6ad0', C: '#5aa8e8', c: '#2a6ab0', w: '#ffffff', I: '#8ae8ff', '|': '#c0e0f0' }, m: [
    '...i.i.i....', '...iiiii....', '..hhhhhhh.I.', '..hsesesh.I.', '..hsssssh.|.', '..hCCCCCh.|.',
    '.sCCwwwCCs|.', '..CCwCwCC.|.', '.cCCCwCCCc|.', '.cCCCCCCCc|.', 'ccCCCCCCCcc.', 'ccccccccccc.'] },
  lord: { p: { h: '#e8d0ff', k: '#2a1a3a', K: '#4a2a6a', p: '#ff4ad0', m: '#ff8af0', y: '#ffd040' }, m: [
    'h..........h', 'hh..kkkk..hh', '.hhkKKKKkhh.', '..kKpKKpKk..', '..kKKKKKKk..', '.kkKmmmmKkk.',
    'kKKKKyyKKKKk', 'kKpKKKKKKpKk', 'kK.kKKKKk.Kk', 'kk.kKKKKk.kk', '...kKk.kKk..', '..kkk...kkk.'] },
  // 道具
  sword: { p: { w: '#eef3fa', W: '#a8b4c6', g: '#e0b040', h: '#7a4a2a' }, m: [
    '..........ww', '.........wWw', '........wWw.', '.......wWw..', '......wWw...', '.....wWw....',
    '..g.wWw.....', '..ggWw......', '...gg.......', '..hhgg......', '.hh..g......', '.h..........'] },
  dagger: { p: { w: '#eef3fa', W: '#a8b4c6', g: '#e0b040', h: '#7a4a2a' }, m: [
    '............', '............', '............', '........ww..', '.......wWw..', '......wWw...',
    '.....wWw....', '..g.wWw.....', '..ggWw......', '...gg.......', '..hh.g......', '..h.........'] },
  greatsword: { p: { w: '#f4f6ff', W: '#8a96b0', g: '#c04a4a', h: '#4a2a2a' }, m: [
    '.........www', '........wWWw', '.......wWWw.', '......wWWw..', '.....wWWw...', '....wWWw....',
    '.g.wWWw.....', '.ggWWw......', '..ggw.......', '.hhgg.......', 'hh..g.......', 'h...........'] },
  spear: { p: { w: '#eef3fa', W: '#a8b4c6', h: '#9a6a3a' }, m: [
    '..........w.', '.........wWw', '........wWw.', '.......hw...', '......h.....', '.....h......',
    '....h.......', '...h........', '..h.........', '.h..........', 'h...........', '............'] },
  axe: { p: { w: '#eef3fa', W: '#a8b4c6', h: '#8a5a2a' }, m: [
    '............', '......ww....', '.....wWWw...', '....wWWWWh..', '....wWWWh...', '.....wWh....',
    '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........'] },
  mace: { p: { w: '#d8dee8', W: '#7a8494', h: '#7a4a2a' }, m: [
    '........w...', '.......wWw..', '......wWWWw.', '.......wWw..', '......h.w...', '.....h......',
    '....h.......', '...h........', '..h.........', '.hh.........', 'hh..........', '............'] },
  staff: { p: { o: '#9ff0ff', O: '#ffffff', h: '#8a5a30' }, m: [
    '..........o.', '.........oOo', '..........o.', '.........h..', '........h...', '.......h....',
    '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........'] },
  armor: { p: { a: '#5a3a22', A: '#9a6a3e', h: '#ffffff' }, m: [
    '............', '..aa....aa..', '.aAAa..aAAa.', '.aAAAaaAAAa.', '.aAAAAAAAAa.', '..aAAAAAAa..',
    '..aAAhAAAa..', '..aAAAAAAa..', '..aAAAAAAa..', '..aaaaaaaa..', '............', '............'] },
  robe: { p: { a: '#2a3a8a', A: '#5a6fd0', h: '#ffd84a' }, m: [
    '............', '...aa..aa...', '..aAAaaAAa..', '.aAAAhhAAAa.', '.aAAAAAAAAa.', '..aAAAAAAa..',
    '..aAAAAAAa..', '..aAAAAAAa..', '.aAAAAAAAAa.', '.aAAAAAAAAa.', '.aaaaaaaaaa.', '............'] },
  ring: { p: { y: '#e8c040', Y: '#a07a20', g: '#ff4a5a', G: '#ffffff' }, m: [
    '............', '............', '.....gg.....', '....gGgg....', '....gggg....', '...yyggyy...',
    '..yY....Yy..', '..y......y..', '..y......y..', '..yY....Yy..', '...yyyyyy...', '............'] },
  potion: { p: { c: '#b07a40', k: '#6a4a2a', g: '#cfe2ee', L: '#e8394d', w: '#ffffff' }, m: [
    '............', '.....cc.....', '.....kk.....', '.....gg.....', '....g..g....', '...gLLLLg...',
    '..gLLLwLLg..', '..gLLLLwLg..', '..gLLLLLLg..', '..gLLLLLLg..', '...gLLLLg...', '....gggg....'] },
  scroll: { p: { p: '#f0e2c0', q: '#a08060', r: '#c8a878', s: '#c03a3a' }, m: [
    '............', '............', '.rrrrrrrrrr.', '.rpppppppprr', '..pqqqqqqp..', '..pppppppp..',
    '..pqqqqsp...', '..ppppsppp..', '..pqqqqqqp..', '.rpppppppprr', '.rrrrrrrrrr.', '............'] },
  wand: { p: { w: '#9a6a3a', s: '#fff8c0', W: '#ffffff' }, m: [
    '............', '..........s.', '.........sWs', '........wws.', '.......ww...', '......ww....',
    '.....ww.....', '....ww......', '...ww.......', '..ww........', '.ww.........', '............'] },
  knife: { p: { w: '#eef3fa', W: '#a8b4c6', h: '#5a3a22' }, m: [
    '............', '............', '............', '.........w..', '........wW..', '.......wW...',
    '......wW....', '.....wW.....', '...hh.......', '..hh........', '............', '............'] },
  javelin: { p: { w: '#eef3fa', h: '#a07040', f: '#d04a3a' }, m: [
    '..........ww', '.........ww.', '........h...', '.......h....', '......h.....', '.....h......',
    '....h.......', '...h........', '..h.........', '.f..........', 'f...........', '............'] },
  dart: { p: { w: '#eef3fa', g: '#7be04a', f: '#e05a8a' }, m: [
    '............', '............', '............', '........w...', '.......w....', '......g.....',
    '.....g......', '...ffg......', '...ff.......', '..f.........', '............', '............'] },
  ration: { p: { b: '#a0602a', B: '#e0a050', w: '#ffe0a0' }, m: [
    '............', '............', '............', '...bbbbbb...', '..bBBBBBBb..', '.bBBwBBwBBb.',
    '.bBBBBBBBBb.', '.bBBBBBBBBb.', '..bbbbbbbb..', '............', '............', '............'] },
  apple: { p: { r: '#a01a2a', R: '#e8384a', w: '#ffd0d0', s: '#6a4a2a', l: '#5ac04a' }, m: [
    '............', '......s.....', '.....sl.....', '...rr.rr....', '..rRRrRRr...', '..rRwRRRr...',
    '..rRRRRRr...', '..rRRRRRr...', '...rRRRr....', '....rrr.....', '............', '............'] },
  gold: { p: { y: '#c88a20', Y: '#ffd040', w: '#fff8c0' }, m: [
    '............', '............', '............', '............', '.....yy.....', '....yYYy....',
    '...yYwYYyy..', '..yYYYyYYYy.', '.yYYwYYYYYYy', '.yyyyyyyyyy.', '............', '............'] },
};

const Art = {
  cache: Object.create(null), tiles: null, biome: -1, frame: 0,
  // 由點陣建立 16×16 帶外框的精靈圖
  sprite(name, over) {
    const key = name + (over ? JSON.stringify(over) : '');
    if (this.cache[key]) return this.cache[key];
    const def = SPR[name] || SPR.rat, pal = Object.assign({}, def.p, over || {});
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const x = c.getContext('2d');
    const solid = [];
    for (let j = 0; j < 12; j++) {
      const row = (def.m[j] || '').padEnd(12, '.');
      for (let i = 0; i < 12; i++) {
        const ch = row[i];
        if (ch !== '.' && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i + 2, j + 3, 1, 1); solid.push([i + 2, j + 3]); }
      }
    }
    // 外框
    const id = x.getImageData(0, 0, 16, 16), d = id.data, out = new Uint8Array(256);
    for (const [px, py] of solid) for (const [dx, dy] of DIRS4) {
      const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue;
      if (d[(ny * 16 + nx) * 4 + 3] === 0) out[ny * 16 + nx] = 1;
    }
    for (let i = 0; i < 256; i++) if (out[i]) { d[i * 4] = 14; d[i * 4 + 1] = 10; d[i * 4 + 2] = 20; d[i * 4 + 3] = 235; }
    x.putImageData(id, 0, 0);
    // 白色剪影（受擊閃光）
    const w = document.createElement('canvas'); w.width = 16; w.height = 16;
    const wx = w.getContext('2d'); wx.drawImage(c, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#fff'; wx.fillRect(0, 0, 16, 16);
    const res = { c, w };
    this.cache[key] = res;
    return res;
  },
  // 道具圖示（依外觀上色）
  itemSprite(it) {
    const K = ITEMS[it.k];
    switch (K.c) {
      case 'potion': { const L = POTION_LOOKS[Game.look(it.k)][1]; return this.sprite('potion', { L, g: '#cfe2ee' }); }
      case 'ring': { const g = RING_LOOKS[Game.look(it.k)][1]; return this.sprite('ring', { g }); }
      case 'wand': { const w = WAND_LOOKS[Game.look(it.k)][1]; return this.sprite('wand', { w }); }
      case 'scroll': return this.sprite('scroll', { s: ['#c03a3a', '#3a6ad0', '#3aa05a', '#a040c0', '#d09020'][Game.look(it.k) % 5] });
      case 'armor': if (K.spr === 'armor') return this.sprite('armor', { A: K.tint, a: shade(K.tint, -0.4) }); return this.sprite(K.spr);
      default: return this.sprite(K.spr || 'gold');
    }
  },

  // ---------- 地形 ----------
  buildTiles(bi) {
    if (this.biome === bi && this.tiles) return;
    this.biome = bi;
    const P = BIOMES[bi].pal, seed = bi * 97 + 13, t = {};
    const mk = (fn) => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d'); fn(x); return c; };
    const px = (x, cx, cy, col) => { x.fillStyle = col; x.fillRect(cx, cy, 1, 1); };
    const floorBase = (x, v) => {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        const n = hash2(i + v * 31, j, seed);
        px(x, i, j, n < 0.5 ? P.floor : n < 0.85 ? P.floor2 : shade(P.floor, 0.08));
      }
      if (bi === 1) { // 洞窟：不規則的坑洞
        for (let k = 0; k < 4; k++) { const cx = (hash2(k, v, seed + 5) * 14) | 0, cy = (hash2(v, k, seed + 9) * 14) | 0; px(x, cx, cy, P.line); px(x, cx + 1, cy, P.line); px(x, cx, cy + 1, shade(P.floor, 0.12)); }
      } else { // 石板
        x.fillStyle = P.line;
        x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
        const off = v % 2 ? 7 : 3;
        x.fillRect(0, 7, 16, 1); x.fillRect(off, 0, 1, 7); x.fillRect((off + 8) % 16, 8, 1, 7);
        x.fillStyle = shade(P.floor, 0.14); x.fillRect(0, 0, 15, 1); x.fillRect(0, 8, 16, 1);
      }
    };
    t.floor = [0, 1, 2, 3].map(v => mk(x => floorBase(x, v)));
    const wallCap = (x, v) => {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const n = hash2(i + 50 + v * 17, j, seed); px(x, i, j, n < 0.6 ? P.wall : n < 0.9 ? shade(P.wall, 0.06) : shade(P.wall, -0.1)); }
      x.fillStyle = shade(P.wall, 0.1);
      for (let k = 0; k < 3; k++) x.fillRect((hash2(k, v, seed + 1) * 12) | 0, (hash2(v, k, seed + 2) * 14) | 0, 3, 1);
    };
    t.wall = [0, 1].map(v => mk(x => wallCap(x, v)));
    const wallFace = (x, v) => {
      wallCap(x, v);
      x.fillStyle = P.wallHi; x.fillRect(0, 5, 16, 1);
      x.fillStyle = P.face; x.fillRect(0, 6, 16, 10);
      x.fillStyle = P.faceLo;
      for (let r = 0; r < 3; r++) {
        const y = 6 + r * 3 + 2; x.fillRect(0, y, 16, 1);
        const o = (r + v) % 2 ? 2 : 6; x.fillRect(o, y - 2, 1, 2); x.fillRect(o + 8, y - 2, 1, 2);
      }
      x.fillStyle = shade(P.face, 0.12); for (let r = 0; r < 3; r++) x.fillRect(0, 6 + r * 3, 16, 1);
      x.fillStyle = P.faceLo; x.fillRect(0, 15, 16, 1);
      if (bi === 0 && v === 1) { x.fillStyle = P.deco; x.fillRect(3, 6, 4, 1); x.fillRect(4, 7, 2, 2); x.fillRect(11, 6, 2, 3); }
      if (bi === 3 && v === 1) { x.fillStyle = P.deco; x.fillRect(5, 7, 1, 3); x.fillRect(11, 9, 1, 2); }
      if (bi === 2 && v === 1) { x.fillStyle = P.deco; x.fillRect(4, 10, 3, 1); x.fillRect(6, 11, 2, 1); }
    };
    t.face = [0, 1].map(v => mk(x => wallFace(x, v)));
    t.torch = mk(x => { wallFace(x, 0); x.fillStyle = '#5a3a22'; x.fillRect(7, 9, 2, 4); x.fillStyle = '#ffb540'; x.fillRect(6, 6, 4, 3); x.fillStyle = '#fff2b0'; x.fillRect(7, 6, 2, 2); x.fillStyle = '#ff6a2a'; x.fillRect(7, 5, 2, 1); });
    t.door = mk(x => {
      wallCap(x, 0); x.fillStyle = P.faceLo; x.fillRect(2, 2, 12, 14);
      x.fillStyle = '#8a5a2e'; x.fillRect(3, 3, 10, 13); x.fillStyle = '#6a4220'; for (let i = 0; i < 3; i++) x.fillRect(5 + i * 3, 3, 1, 13);
      x.fillStyle = '#a8a8b0'; x.fillRect(3, 6, 10, 1); x.fillRect(3, 12, 10, 1); x.fillStyle = '#ffd040'; x.fillRect(11, 9, 1, 2);
    });
    t.odoor = mk(x => { floorBase(x, 0); x.fillStyle = '#6a4220'; x.fillRect(0, 0, 3, 16); x.fillRect(13, 0, 3, 16); x.fillStyle = '#8a5a2e'; x.fillRect(1, 0, 1, 16); x.fillRect(14, 0, 1, 16); });
    t.stairs = mk(x => {
      floorBase(x, 1); x.fillStyle = '#0a0810'; x.fillRect(2, 2, 12, 12);
      for (let i = 0; i < 4; i++) { x.fillStyle = shade(P.floor, 0.1 - i * 0.18); x.fillRect(2 + i, 3 + i * 3, 12 - i * 2, 2); x.fillStyle = shade(P.floor, -0.3 - i * 0.12); x.fillRect(2 + i, 5 + i * 3, 12 - i * 2, 1); }
      x.fillStyle = shade(P.wallHi, 0.1); x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14); x.fillRect(14, 1, 1, 14);
    });
    const liquid = (x, f, a, b, c, hi) => {
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
        const n = Math.sin((i + f * 4) * 0.8 + j * 0.5) + Math.sin(j * 0.9 - f * 2 + i * 0.3);
        px(x, i, j, n > 1.1 ? c : n > -0.3 ? b : a);
      }
      x.fillStyle = hi; for (let k = 0; k < 3; k++) { const yy = (k * 5 + f * 2) % 16; x.fillRect((k * 7 + f * 3) % 13, yy, 3, 1); }
    };
    t.water = [0, 1, 2].map(f => mk(x => liquid(x, f, shade(P.water, -0.25), P.water, shade(P.water, 0.15), 'rgba(220,240,255,.55)')));
    t.lava = [0, 1, 2].map(f => mk(x => liquid(x, f, '#a8240e', '#e8541a', '#ff9a2a', '#ffe08a')));
    t.grass = [0, 1].map(v => mk(x => {
      floorBase(x, v + 2);
      for (let k = 0; k < 9; k++) {
        const gx = (hash2(k, v, seed + 3) * 15) | 0, h = 4 + ((hash2(v, k, seed + 4) * 6) | 0);
        x.fillStyle = k % 3 ? P.grass : shade(P.grass, 0.25); x.fillRect(gx, 15 - h, 1, h); x.fillRect(gx + (k % 2 ? 1 : -1), 15 - h - 1, 1, 2);
      }
    }));
    t.ash = mk(x => { floorBase(x, 3); x.fillStyle = 'rgba(30,26,30,.45)'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#6a6470'; for (let k = 0; k < 6; k++) x.fillRect((hash2(k, 1, 7) * 15) | 0, (hash2(1, k, 7) * 15) | 0, 1, 1); });
    t.ice = mk(x => { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(x, i, j, hash2(i, j, 77) < 0.5 ? '#9fd4ee' : '#8ac4e0'); x.fillStyle = '#e8fbff'; x.fillRect(3, 4, 4, 1); x.fillRect(9, 10, 3, 1); x.fillRect(4, 5, 1, 1); });
    t.fountain = mk(x => {
      floorBase(x, 0); x.fillStyle = '#7a7e8e'; x.fillRect(1, 4, 14, 11); x.fillStyle = '#9aa0b0'; x.fillRect(1, 4, 14, 2);
      x.fillStyle = '#3f8fd0'; x.fillRect(3, 6, 10, 7); x.fillStyle = '#9fe0ff'; x.fillRect(4, 7, 3, 1); x.fillRect(9, 10, 2, 1);
      x.fillStyle = '#9aa0b0'; x.fillRect(7, 1, 2, 5); x.fillStyle = '#bff0ff'; x.fillRect(6, 0, 4, 2);
    });
    t.dryfount = mk(x => { floorBase(x, 0); x.fillStyle = '#6a6e7e'; x.fillRect(1, 4, 14, 11); x.fillStyle = '#8a90a0'; x.fillRect(1, 4, 14, 2); x.fillStyle = '#3a3a44'; x.fillRect(3, 6, 10, 7); x.fillStyle = '#8a90a0'; x.fillRect(7, 1, 2, 5); });
    t.rubble = mk(x => { floorBase(x, 1); const c = [shade(P.wall, 0.3), shade(P.wall, 0.5), P.wallHi]; for (let k = 0; k < 6; k++) { x.fillStyle = c[k % 3]; x.fillRect((hash2(k, 2, seed) * 13) | 0, 6 + ((hash2(2, k, seed) * 8) | 0), 2 + (k % 2), 2); } });
    t.pillar = mk(x => {
      floorBase(x, 2); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(3, 13, 11, 3);
      x.fillStyle = P.face; x.fillRect(4, 3, 8, 12); x.fillStyle = P.wallHi; x.fillRect(4, 3, 2, 12); x.fillStyle = P.faceLo; x.fillRect(10, 3, 2, 12);
      x.fillStyle = shade(P.wallHi, 0.15); x.fillRect(3, 1, 10, 3); x.fillRect(3, 13, 10, 2);
    });
    t.carpet = mk(x => { x.fillStyle = '#8a2a3a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a83a4a'; for (let j = 0; j < 16; j += 4) for (let i = (j / 4) % 2 * 2; i < 16; i += 4) x.fillRect(i, j, 2, 2); x.fillStyle = '#e0b040'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); });
    t.crystal = mk(x => {
      floorBase(x, 1); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(2, 13, 12, 3);
      const cr = (cx, h, w) => { x.fillStyle = '#4fb8e8'; x.fillRect(cx, 15 - h, w, h); x.fillStyle = '#bff4ff'; x.fillRect(cx, 15 - h, 1, h); x.fillStyle = '#e8fbff'; x.fillRect(cx, 14 - h, w - 1, 1); };
      cr(3, 9, 3); cr(7, 13, 4); cr(11, 7, 3);
    });
    t.bridge = mk(x => { x.fillStyle = '#2a1410'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#8a5a30'; for (let j = 0; j < 16; j += 4) x.fillRect(0, j, 16, 3); x.fillStyle = '#a87040'; for (let j = 0; j < 16; j += 4) x.fillRect(0, j, 16, 1); x.fillStyle = '#5a3a20'; x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16); });
    // 地板裝飾
    t.deco = [0, 1, 2].map(v => mk(x => {
      const rx = k => (hash2(k, v, seed + 11) * 12 + 2) | 0, ry = k => (hash2(v, k, seed + 12) * 12 + 2) | 0;
      if (bi === 0) { x.fillStyle = P.deco; for (let k = 0; k < 5; k++) x.fillRect(rx(k), ry(k), 2, 1); x.fillStyle = P.deco2; x.fillRect(rx(9), ry(9), 1, 1); if (v === 2) { x.fillStyle = '#d8d0c0'; x.fillRect(5, 9, 5, 1); x.fillRect(4, 8, 1, 3); x.fillRect(10, 8, 1, 3); } }
      else if (bi === 1) { const cx = rx(1), cy = Math.min(12, ry(1)); x.fillStyle = '#e8dcc0'; x.fillRect(cx + 1, cy + 2, 1, 2); x.fillStyle = v === 1 ? P.deco2 : P.deco; x.fillRect(cx, cy, 3, 2); x.fillStyle = '#fff'; x.fillRect(cx, cy, 1, 1); if (v === 2) { x.fillStyle = P.deco; x.fillRect(rx(5), ry(5), 2, 1); x.fillRect(rx(6), ry(6), 1, 1); } }
      else if (bi === 2) { x.fillStyle = '#2a1410'; const cx = rx(2), cy = ry(2); for (let k = 0; k < 5; k++) x.fillRect(cx + k, cy + (k % 2), 1, 1); x.fillStyle = P.deco; x.fillRect(cx + 1, cy + 1, 2, 1); if (v === 1) { x.fillStyle = P.deco2; x.fillRect(rx(7), ry(7), 1, 1); } }
      else if (bi === 3) { x.fillStyle = P.deco; const cx = rx(3), cy = Math.min(12, ry(3)); x.fillRect(cx, cy, 1, 3); x.fillRect(cx + 2, cy + 1, 1, 2); x.fillStyle = P.deco2; x.fillRect(cx, cy, 1, 1); }
      else { x.fillStyle = P.deco; const cx = rx(4), cy = ry(4); x.fillRect(cx, cy, 3, 1); x.fillRect(cx + 1, cy - 1, 1, 3); }
    }));
    // 陷阱圖示
    t.trap = {};
    for (const k in TRAPS) t.trap[k] = mk(x => {
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(3, 3, 10, 10); x.fillStyle = TRAPS[k].col; x.globalAlpha = 0.9;
      if (k === 'spike') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { x.fillRect(4 + i * 3, 5 + j * 3, 1, 2); x.fillRect(4 + i * 3, 4 + j * 3, 1, 1); } }
      else if (k === 'pit') { x.fillStyle = '#05040a'; x.fillRect(3, 4, 10, 8); x.fillStyle = TRAPS[k].col; x.fillRect(3, 4, 10, 1); }
      else { x.fillRect(4, 4, 8, 1); x.fillRect(4, 11, 8, 1); x.fillRect(4, 4, 1, 8); x.fillRect(11, 4, 1, 8); x.fillRect(7, 7, 2, 2); x.fillRect(6, 6, 1, 1); x.fillRect(9, 9, 1, 1); }
    });
    this.tiles = t;
  },
};

function shade(hex, amt) { // amt > 0 變亮，< 0 變暗
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + ((1 << 24) | ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)).toString(16).slice(1);
}

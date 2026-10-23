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
    const res = Pix.finish({ c, w: 16, h: 16 }, { ax: 8, ay: 15 });

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
      case 'relic': { const R = (typeof RELICS !== 'undefined' && RELICS[it.relic]) || { col: '#ff4a6a' }; return this.sprite('relic', { g: R.col, G: shade(R.col, 0.6), C: shade(R.col, -0.45) }); }
      default: return this.sprite(K.spr || 'gold');
    }
  },

  // 地形材質改由 terrain.js 產生
  buildTiles(bi) { this.tiles = TEX.build(bi); this.biome = bi; },
};

function shade(hex, amt) { // amt > 0 變亮，< 0 變暗
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return '#' + ((1 << 24) | ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)).toString(16).slice(1);
}

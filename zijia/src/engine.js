'use strict';
// =====================================================================
// 銘甲戰記 — 遊戲引擎（劇情資料在 story.js：SPEAKERS / CHAPTERS / START）
// =====================================================================

// ---------------- 地形 ----------------
const TERRAIN={
  '.':{k:'plain', name:'平地',g:'·', cost:1,def:0,  eva:0},
  'f':{k:'forest',name:'森林',g:'♣︎',cost:2,def:.10,eva:15},
  'm':{k:'mount', name:'山地',g:'▲', cost:3,def:.20,eva:10},
  'w':{k:'water', name:'水域',g:'≈', cost:3,def:0,  eva:-10},
  '#':{k:'wall',  name:'障壁',g:'█', cost:99,def:0, eva:0,block:true},
  'b':{k:'base',  name:'基地',g:'◎', cost:1,def:.15,eva:5,heal:true},
  'r':{k:'ruin',  name:'廢墟',g:'▒', cost:2,def:.10,eva:10},
};

// ---------------- 精神指令 ----------------
const SPIRITS={
  '必中':{cost:15,flag:'sure', desc:'直到下個我方回合，攻擊必定命中。'},
  '集中':{cost:15,flag:'focus',desc:'直到下個我方回合，命中與迴避各 +30%。'},
  '閃避':{cost:15,flag:'dodge',desc:'下一次被攻擊時必定迴避。'},
  '熱血':{cost:30,flag:'valor',desc:'下一次命中的攻擊，傷害 ×2。'},
  '魂':  {cost:45,flag:'soul', desc:'下一次命中的攻擊，傷害 ×2.5。'},
  '鐵壁':{cost:20,flag:'wall', desc:'直到下個我方回合，受到的傷害 ×1/4。'},
  '加速':{cost:10,flag:'accel',desc:'本回合移動力 +3（需在移動前使用）。'},
  '狙擊':{cost:15,flag:'snipe',desc:'直到下個我方回合，射程 2 以上的武器射程 +1。'},
  '再動':{cost:60,flag:'again',desc:'本回合行動結束後，可以再行動一次。'},
  '氣合':{cost:25,desc:'自身氣力 +10。'},
  '激勵':{cost:30,desc:'全體我方機體氣力 +5。'},
  '根性':{cost:20,desc:'回復自身最大 HP 的 30%。'},
};
const ST_LABEL={sure:'必中',focus:'集中',dodge:'閃避',valor:'熱血',soul:'魂',wall:'鐵壁',accel:'加速',snipe:'狙擊',again:'再動'};

// ---------------- 職業（轉職樹）----------------
function wp(name,pow,min,max,hit,o={}){return {name,pow,min,max,hit,en:o.en||0,ammo:o.ammo==null?null:o.ammo,will:o.will||0,post:o.post!==false};}
const ROLE_BASE={
  striker:{hp:3800,en:120,atk:20,def:1200,hit:100,eva:85, mov:5},
  gunner: {hp:3200,en:130,atk:18,def:1000,hit:110,eva:80, mov:4},
  scout:  {hp:2900,en:120,atk:16,def:850, hit:105,eva:120,mov:7},
  support:{hp:3100,en:120,atk:12,def:1050,hit:100,eva:95, mov:5},
  heavy:  {hp:4600,en:110,atk:18,def:1600,hit:90, eva:55, mov:4},
  knight: {hp:3600,en:130,atk:19,def:1150,hit:102,eva:90, mov:6},
};
const ROLE_NAME={striker:'格鬥系',gunner:'射擊系',scout:'機動系',support:'支援系',heavy:'重裝系',knight:'騎士系'};
const TIER_ADD=[null,{},{hp:1300,en:20,atk:12,def:250,hit:8,eva:8},{hp:2800,en:50,atk:26,def:550,hit:16,eva:16},{hp:4500,en:80,atk:42,def:850,hit:26,eva:26}];
const GROWTH=[null,{hp:110,en:3,atk:2,def:25,hit:1,eva:1},{hp:140,en:4,atk:3,def:30,hit:1,eva:1},{hp:170,en:5,atk:3,def:35,hit:1,eva:1},{hp:200,en:5,atk:4,def:40,hit:2,eva:2}];
const TIER_NAME=['','初階','中階','上階','極'];
const MAX_LV=10, CC_LV=8;
// 經驗值設定（調整平衡只要改這裡，遊戲內說明會自動同步）
const EXP={perLv:100, hitBase:18, hitStep:3, hitMin:5, hitMax:60, killBase:60, killStep:6, killMin:15, killMax:150, boss:90, repair:35,
  clearAlive:60, clearDown:40, clearBench:30};
const CLASSES={};
function C(id,name,tier,role,from,tweak,skills,weapons,opt={}){CLASSES[id]={id,name,tier,role,from,tweak:tweak||{},skills:skills||{},weapons,fly:!!opt.fly,req:opt.req||null,desc:opt.desc||''};}
// 格鬥系
C('s1','格鬥型',1,'striker',null,{},{},[wp('鐵拳',2200,1,1,15),wp('光束槍',2300,1,3,0,{en:8}),wp('突擊斬',3000,1,1,10,{en:30,will:115})],{desc:'近戰與中距離兼顧的基本型。'});
C('s2a','劍士型',2,'striker','s1',{eva:10,hit:5},{hitUp:10},[wp('光束劍',2900,1,1,20),wp('飛刃',2600,1,2,10,{ammo:6}),wp('雷神劍',4000,1,1,15,{en:40,will:120})],{desc:'以劍技為主，命中與迴避優秀。'});
C('s2b','重拳型',2,'striker','s1',{atk:5,hp:500,eva:-10},{dmgUp:10},[wp('重拳',3100,1,1,10),wp('胸部光束',2800,1,3,0,{en:10}),wp('雷神破碎拳',4300,1,1,5,{en:45,will:120})],{desc:'以重擊壓制，傷害提高。'});
C('s3a','劍聖型',3,'striker','s2a',{eva:15,hit:10},{hitUp:15,crit:15,counterFirst:true},[wp('神速劍',3600,1,1,25),wp('真空斬',3300,1,3,15,{en:15}),wp('雷神一閃',5200,1,2,20,{en:50,will:130})],{desc:'被攻擊時搶先反擊（先制反擊）。'});
C('s3b','魔劍型',3,'striker','s2a',{atk:6,eva:5},{dmgUp:15,killWill:5},[wp('魔劍',3800,1,1,15),wp('黑焰波',3400,2,3,5,{en:20}),wp('魔劍・終焉',5600,1,1,10,{en:55,will:130})],{desc:'擊墜敵機時額外提升氣力。'});
C('s3c','鬥神型',3,'striker','s2b',{hp:800,def:150},{dmgDown:15,willStart:10},[wp('鬥神拳',3900,1,1,15),wp('震地波',3200,1,2,10,{en:15}),wp('鬥神・天崩',5500,1,1,10,{en:50,will:125})],{desc:'開場氣力較高，也更耐打。'});
C('s3d','破壞型',3,'striker','s2b',{atk:8,eva:-5},{pierce:30,dmgUp:10},[wp('破壞錘',4100,1,1,5),wp('胸部重砲',3600,1,3,0,{en:20}),wp('全力破壞',5800,1,1,0,{en:60,will:130})],{desc:'無視目標 30% 裝甲。'});
C('s4A','守護王甲',4,'striker','*s3',{hp:600,def:200},{aura:{range:2,hit:15,eva:15,dmg:10},counterFirst:true,dmgDown:20},[wp('王者之劍',4800,1,2,25),wp('守護光砲',4400,1,4,15,{en:25}),wp('始甲・光輝',7000,1,3,20,{en:60,will:130})],{req:{char:'gang',route:'A',minNo:12},desc:'守護之字路線限定。周圍友軍命中、迴避、傷害提升。'});
C('s4B','赤環皇騎',4,'striker','*s3',{atk:6,mov:1},{dmgUp:20,aura:{range:2,hit:10,eva:10,dmg:0}},[wp('皇騎劍',5000,1,1,20),wp('赤環砲',4400,2,5,10,{en:25}),wp('赤環・天罰',7200,1,2,15,{en:60,will:130})],{req:{char:'gang',route:'B',minNo:12},desc:'赤環之誓路線限定。騎士的機動與統率兼具。'});
C('s4H','無銘霸王',4,'striker','*s3',{atk:10},{dmgUp:30,pierce:30,regen:10},[wp('霸王劍',5200,1,1,20),wp('虛無波',4600,1,4,10,{en:25}),wp('無銘・終焉',7600,1,3,15,{en:65,will:130})],{req:{char:'gang',route:'H',minNo:12},desc:'無銘之甲路線限定。吞噬一切的霸道之力。'});
// 射擊系
C('g1','射擊型',1,'gunner',null,{},{},[wp('手槍',1800,1,2,10),wp('光束步槍',2500,2,4,10,{en:10}),wp('狙擊砲',3000,3,5,15,{en:15,post:false})],{desc:'擅長中遠距離射擊。'});
C('g2a','狙擊型',2,'gunner','g1',{hit:10},{hitUp:15},[wp('手槍',2100,1,2,10),wp('狙擊光束砲',3400,3,6,20,{en:15,post:false}),wp('雷擊長程砲',4000,4,8,10,{en:40,will:110,post:false})],{desc:'超長射程，命中極高。'});
C('g2b','砲擊型',2,'gunner','g1',{hp:400,def:150,eva:-10},{dmgUp:10},[wp('機砲',2400,1,2,5),wp('雙管加農',3300,2,5,5,{ammo:6}),wp('大型光束砲',4200,3,6,0,{en:40,will:115,post:false})],{desc:'火力與耐久兼具的砲台。'});
C('g3a','天眼型',3,'gunner','g2a',{hit:15},{hitUp:25,crit:10},[wp('速射槍',2600,1,3,15),wp('天眼狙擊',4200,3,8,30,{en:20,post:false}),wp('天眼・貫星',5200,4,9,20,{en:50,will:125,post:false})],{desc:'百發百中的狙擊之眼。'});
C('g3b','幻影型',3,'gunner','g2a',{eva:15,mov:1},{evaUp:20},[wp('幻影槍',3000,1,3,20),wp('幻影狙擊',3900,2,6,20,{en:15}),wp('幻影連射',4700,2,5,15,{en:45,will:120})],{desc:'移動後也能狙擊，迴避提升。'});
C('g3c','要塞砲型',3,'gunner','g2b',{hp:900,def:250,eva:-10},{dmgDown:15,dmgUp:10},[wp('要塞機砲',2900,1,2,5),wp('要塞主砲',4800,3,7,5,{en:30,post:false}),wp('終極加農',6000,3,7,0,{en:60,will:130,post:false})],{desc:'移動堡壘，一砲定江山。'});
C('g3d','流星型',3,'gunner','g2b',{mov:1},{dmgUp:15},[wp('近接爆雷',2800,1,1,5),wp('流星飛彈',3600,2,5,10,{ammo:8}),wp('流星雨',5000,2,6,10,{en:50,will:125})],{desc:'大量飛彈，移動後照樣開火。'});
// 機動系
C('r1','偵察型',1,'scout',null,{},{},[wp('雙刃',2000,1,1,20),wp('追蹤飛彈',2200,2,4,10,{ammo:6}),wp('疾風連舞',3000,1,2,15,{en:30,will:115})],{fly:true,desc:'飛行偵察機，移動力最高。'});
C('r2a','飛行型',2,'scout','r1',{eva:5},{evaUp:10},[wp('光翼刃',2700,1,1,20),wp('追蹤飛彈',2600,2,4,10,{ammo:8}),wp('疾風連舞',3800,1,2,15,{en:35,will:115})],{fly:true,desc:'空戰特化，迴避更高。'});
C('r2b','突襲型',2,'scout','r1',{atk:4,mov:1,eva:-5},{crit:15},[wp('雙短刀',2800,1,1,25),wp('閃光手雷',2400,1,2,15,{ammo:4}),wp('殺陣',3900,1,1,20,{en:35,will:115})],{desc:'地面突擊，容易打出會心一擊。'});
C('r3a','蒼穹型',3,'scout','r2a',{eva:10},{evaUp:20},[wp('蒼穹之翼',3500,1,1,25),wp('光子飛彈',3200,2,5,15,{ammo:10}),wp('蒼穹亂舞',5000,1,3,20,{en:50,will:125})],{fly:true,desc:'幾乎打不中的天空霸者。'});
C('r3b','風神型',3,'scout','r2a',{mov:1,atk:4},{dmgUp:10,evaUp:10},[wp('風神斬',3600,1,2,20),wp('真空飛彈',3300,2,5,10,{en:15}),wp('神風',5200,1,2,15,{en:50,will:130})],{fly:true,desc:'攻守平衡的高速飛行機。'});
C('r3c','暗影型',3,'scout','r2b',{eva:10},{evaUp:25,crit:20},[wp('暗影刃',3700,1,1,30),wp('影縫',3000,1,3,20,{en:15}),wp('無影殺',5300,1,1,25,{en:50,will:125})],{desc:'潛行暗殺，會心率極高。'});
C('r3d','迅雷型',3,'scout','r2b',{mov:1},{counterFirst:true,crit:10},[wp('迅雷槍',3500,1,2,20),wp('雷鳴飛彈',3200,2,4,15,{ammo:6}),wp('迅雷突擊',5000,1,1,20,{en:45,will:120})],{desc:'先制反擊，速度無人能及。'});
// 支援系
C('p1','支援型',1,'support',null,{},{heal:{min:1,max:1,pct:35}},[wp('光束槍',1800,1,3,10),wp('光環彈',2200,2,3,5,{en:20})],{desc:'可以修理相鄰友軍。'});
C('p2a','修復型',2,'support','p1',{},{heal:{min:1,max:2,pct:45}},[wp('光束槍',2200,1,3,10),wp('光環彈',2700,2,4,5,{en:20})],{desc:'修理範圍與回復量提升。'});
C('p2b','指揮型',2,'support','p1',{atk:4},{heal:{min:1,max:1,pct:30},aura:{range:2,hit:10,eva:10,dmg:0}},[wp('指揮槍',2500,1,3,10),wp('戰術飛彈',2800,2,4,10,{ammo:6})],{desc:'指揮範圍內友軍命中、迴避 +10。'});
C('p3a','聖癒型',3,'support','p2a',{},{heal:{min:1,max:3,pct:60},regen:5},[wp('聖光槍',2700,1,3,15),wp('淨化光環',3400,1,4,10,{en:25})],{desc:'遠距離大量修理。'});
C('p3b','守護型',3,'support','p2a',{hp:600,def:200},{heal:{min:1,max:2,pct:45},guardAura:{range:1,pct:20},dmgDown:20},[wp('守護槍',2600,1,3,10),wp('聖盾衝擊',3300,1,1,10,{en:20})],{desc:'相鄰友軍受到的傷害 -20%。'});
C('p3c','統帥型',3,'support','p2b',{atk:6},{heal:{min:1,max:1,pct:30},aura:{range:3,hit:15,eva:15,dmg:10}},[wp('統帥砲',3300,1,4,10,{en:15}),wp('全軍突擊令',3800,2,4,10,{en:40,will:120})],{desc:'大範圍指揮：命中、迴避 +15，傷害 +10%。'});
C('p3d','軍師型',3,'support','p2b',{hit:10},{heal:{min:1,max:2,pct:40},aura:{range:2,hit:10,eva:10,dmg:5},spRegen:10},[wp('軍師光槍',3000,1,3,15),wp('計略砲',3800,2,5,15,{en:35})],{desc:'每回合 SP +10，兼具指揮與修理。'});
// 重裝系
C('t1','重裝型',1,'heavy',null,{},{dmgDown:10},[wp('重拳',2300,1,1,5),wp('肩部加農',2500,2,3,0,{ammo:6})],{desc:'厚重裝甲，受到的傷害 -10%。'});
C('t2a','堡壘型',2,'heavy','t1',{def:300,hp:600,eva:-10},{dmgDown:20},[wp('巨盾衝擊',2700,1,1,5),wp('堡壘加農',3200,2,4,0,{en:15})],{desc:'防禦特化，受到的傷害 -20%。'});
C('t2b','突破型',2,'heavy','t1',{atk:5},{pierce:20,dmgDown:5},[wp('衝角',3300,1,1,10),wp('散彈',2700,1,2,5,{ammo:6}),wp('全力衝鋒',4200,1,1,5,{en:40,will:115})],{desc:'無視目標 20% 裝甲。'});
C('t3a','不動型',3,'heavy','t2a',{def:400,hp:1200},{dmgDown:30,regen:10},[wp('不動拳',3300,1,1,5),wp('城塞砲',3800,2,5,0,{en:20})],{desc:'每回合回復 10% HP，受到的傷害 -30%。'});
C('t3b','鐵壁皇型',3,'heavy','t2a',{def:250,hp:800},{dmgDown:20,guardAura:{range:1,pct:25},dmgUp:10},[wp('皇盾',3500,1,1,10),wp('鐵壁砲',3900,2,4,5,{en:20}),wp('皇帝壓殺',5200,1,1,5,{en:50,will:125})],{desc:'保護相鄰友軍，傷害 -25%。'});
C('t3c','衝角型',3,'heavy','t2b',{atk:6},{pierce:40,dmgDown:5},[wp('超硬衝角',4300,1,1,10),wp('突破飛彈',3400,2,4,5,{ammo:6}),wp('天元突破',5800,1,1,5,{en:55,will:130})],{desc:'無視目標 40% 裝甲。'});
C('t3d','狂戰型',3,'heavy','t2b',{atk:10,eva:5},{dmgUp:25,crit:10,dmgDown:-10},[wp('狂戰斧',4500,1,1,5),wp('旋風斧',3800,1,2,5,{en:20}),wp('狂暴',6000,1,1,0,{en:50,will:120})],{desc:'傷害 +25%，但受到的傷害也 +10%。'});
// 騎士系
C('k2','騎士型',2,'knight',null,{},{hitUp:5},[wp('騎士劍',3000,1,1,15),wp('騎槍突擊',3300,1,2,10,{en:15}),wp('緋紅斬',4200,1,1,15,{en:40,will:120})],{desc:'赤環騎士團的制式高階機。'});
C('k3a','聖騎型',3,'knight','k2',{def:200},{aura:{range:2,hit:10,eva:0,dmg:10},dmgDown:10},[wp('聖劍',3800,1,1,20),wp('聖槍',3500,1,3,10,{en:15}),wp('聖光十字',5300,1,2,15,{en:50,will:125})],{desc:'鼓舞周圍友軍的聖騎士。'});
C('k3b','黑騎型',3,'knight','k2',{atk:6,mov:1},{dmgUp:15,crit:10},[wp('黑劍',4000,1,1,15),wp('暗黑槍',3600,1,2,10,{en:15}),wp('緋紅終焉',5600,1,1,10,{en:55,will:130})],{desc:'捨棄防禦、追求極致攻擊。'});

// ---------------- 敵方職業 ----------------
const ECLASSES={};
function E(id,ch,name,tier,stats,skills,weapons,opt={}){ECLASSES[id]={id,ch,name,tier,stats,skills:skills||{},weapons,fly:!!opt.fly,obj:!!opt.obj,enemy:true};}
E('bing','兵','量產機',1,{hp:2200,en:100,atk:12,def:850,hit:95,eva:70,mov:4},{},[wp('機槍',1500,1,2,10),wp('飛彈',1700,2,4,0,{ammo:4})]);
E('lian','聯','聯合量產機',1,{hp:2300,en:100,atk:13,def:900,hit:95,eva:72,mov:5},{},[wp('光束刀',1800,1,1,10),wp('光束步槍',1600,1,3,5)]);
E('pao','砲','砲擊機',1,{hp:2600,en:100,atk:14,def:1050,hit:95,eva:55,mov:3},{},[wp('近接爪',1400,1,1,5),wp('巨砲',2400,3,5,0,{en:10,post:false})]);
E('yi','翼','飛翼機',1,{hp:1900,en:100,atk:13,def:700,hit:100,eva:110,mov:6},{},[wp('翼刃',1800,1,1,15),wp('光彈',1600,1,3,5,{en:10})],{fly:true});
E('dun','盾','重盾機',1,{hp:3800,en:100,atk:12,def:1500,hit:90,eva:40,mov:3},{dmgDown:10},[wp('盾擊',1600,1,1,10),wp('散彈',1500,1,2,5,{ammo:5})]);
E('jia','甲','聯合重裝機',1,{hp:3500,en:100,atk:14,def:1400,hit:90,eva:50,mov:4},{dmgDown:5},[wp('重拳',1900,1,1,5),wp('肩砲',2100,2,3,0,{ammo:6})]);
E('qi','騎','帝國騎士機',2,{hp:3800,en:120,atk:24,def:1300,hit:105,eva:95,mov:6},{},[wp('騎士劍',2600,1,1,15),wp('騎槍',2800,1,2,10,{en:15})]);
E('ying','影','無銘影機',2,{hp:3000,en:120,atk:22,def:1000,hit:110,eva:120,mov:6},{},[wp('影爪',2600,1,1,20),wp('虛彈',2500,1,3,10,{en:10})],{fly:true});
E('xu','虛','無銘巨像',3,{hp:6000,en:150,atk:28,def:1800,hit:100,eva:50,mov:3},{dmgDown:10},[wp('虛無拳',3200,1,1,5),wp('虛無砲',3300,2,5,0,{en:20,post:false})]);
E('jing','精','帝國精銳機',2,{hp:3400,en:110,atk:20,def:1150,hit:100,eva:85,mov:5},{},[wp('精銳機槍',2300,1,2,10),wp('誘導飛彈',2500,2,4,5,{ammo:6})]);
E('zhong','重','帝國重砲機',2,{hp:3800,en:120,atk:22,def:1300,hit:100,eva:60,mov:3},{dmgDown:5},[wp('近接錘',2000,1,1,5),wp('重砲',3200,3,6,5,{en:15,post:false})]);
E('lian2','銳','聯合精銳機',2,{hp:3400,en:110,atk:20,def:1150,hit:102,eva:88,mov:5},{},[wp('光束劍',2500,1,1,15),wp('光束步槍',2400,1,3,10,{en:10})]);
E('wei','衛','赤環近衛機',3,{hp:5200,en:140,atk:30,def:1600,hit:110,eva:100,mov:5},{dmgDown:10},[wp('近衛長劍',3400,1,1,15),wp('近衛光槍',3200,1,3,10,{en:15})]);
E('te','特','聯合特務機',3,{hp:4800,en:140,atk:30,def:1450,hit:115,eva:110,mov:6},{crit:10},[wp('特務刃',3300,1,1,20),wp('狙擊光束',3500,2,5,15,{en:15})]);
E('ye','夜','無銘夜影',3,{hp:4600,en:140,atk:30,def:1350,hit:115,eva:112,mov:6},{},[wp('夜爪',3300,1,1,20),wp('虛無光彈',3200,1,3,10,{en:15})],{fly:true});
E('general','將','赤環將機',3,{hp:9000,en:200,atk:30,def:1600,hit:105,eva:85,mov:4},{dmgDown:10},[wp('將軍刀',3200,1,1,15),wp('赤環砲',3000,2,4,5,{en:20}),wp('殲滅光輪',3600,2,5,0,{en:40,post:false})]);
E('cmdr','艾','聯合司令機',3,{hp:8000,en:200,atk:28,def:1500,hit:110,eva:90,mov:5},{aura:{range:2,hit:10,eva:10,dmg:0}},[wp('指揮刀',3000,1,1,15),wp('光束砲',3200,1,4,10,{en:15}),wp('審判之光',4000,2,6,5,{en:40,post:false})]);
E('emperor','貝','皇機',3,{hp:8500,en:200,atk:30,def:1600,hit:110,eva:95,mov:5},{aura:{range:2,hit:10,eva:10,dmg:5}},[wp('皇劍',3600,1,1,20),wp('赤環光輪',3400,1,3,10,{en:20})]);
E('yuanwu','原','原初之無',4,{hp:18000,en:400,atk:42,def:2100,hit:118,eva:90,mov:4},{regen:5,dmgDown:10},[wp('原初之爪',4400,1,1,15),wp('名之崩壞',4600,1,5,10,{en:30}),wp('萬象歸無',5600,2,6,5,{en:60,post:false})]);
E('wuking','無','始源虛甲',4,{hp:15000,en:300,atk:38,def:1900,hit:112,eva:88,mov:4},{regen:6,dmgDown:10},[wp('虛無之爪',4000,1,1,15),wp('萬字崩壞',4200,1,5,10,{en:30}),wp('無銘終焉',5000,2,6,5,{en:60,post:false})]);
// 地圖設施（不會移動）
E('gate','核','虛無核心',3,{hp:9000,en:0,atk:0,def:1300,hit:0,eva:0,mov:0},{},[],{obj:true});
E('tower','塔','防衛砲台',2,{hp:4200,en:200,atk:22,def:1200,hit:100,eva:0,mov:0},{},[wp('砲台主砲',2600,2,5,10)],{obj:true});
E('bwall','壁','破損城牆',1,{hp:2600,en:0,atk:0,def:800,hit:0,eva:0,mov:0},{},[],{obj:true});
// ---------------- 零件（每台 2 格）與道具 ----------------
const PARTS={
  armor1:{name:'強化裝甲',price:600,desc:'裝甲 +200',mod:{def:200}},
  hp1:{name:'追加裝甲板',price:700,desc:'HP +800',mod:{hp:800}},
  cell:{name:'能源匣',price:500,desc:'EN +60',mod:{en:60}},
  scope:{name:'精密瞄準器',price:800,desc:'命中 +15',mod:{hit:15}},
  chip:{name:'迴避晶片',price:900,desc:'迴避 +15',mod:{eva:15}},
  boost:{name:'推進器',price:1200,desc:'移動 +1',mod:{mov:1}},
  mind:{name:'鬥志迴路',price:1400,desc:'初始氣力 +10',will:10},
  armor2:{name:'複合裝甲',price:1500,desc:'裝甲 +400、HP +500',mod:{def:400,hp:500}},
  radar:{name:'長程感測器',price:1600,desc:'射程 2 以上的武器射程 +1',range:1},
};
const ITEMS={
  kit:{name:'修理套件',price:400,desc:'回復自身 HP 50%（不消耗行動，每回合一次）'},
  ecell:{name:'能源補給',price:300,desc:'回復自身 EN 80（不消耗行動，每回合一次）'},
};
// ---------------- 駕駛技能（用 PP 學習） ----------------
const PSKILLS={
  supA:{name:'援護攻擊',max:2,cost:[2,3],desc:'每回合可援護攻擊的次數 +1'},
  supD:{name:'援護防禦',max:2,cost:[2,3],desc:'每回合可援護防禦的次數 +1'},
  guts:{name:'底力',max:1,cost:[3],desc:'HP 低於一半時，命中、迴避 +15，傷害 +15%'},
  focus:{name:'集中力',max:1,cost:[3],desc:'精神指令的 SP 消耗 −20%'},
  willUp:{name:'氣力+',max:2,cost:[2,2],desc:'出擊時氣力 +5'},
  spUp:{name:'SP+',max:2,cost:[2,2],desc:'SP 上限 +15'},
  keen:{name:'見切',max:1,cost:[3],desc:'會心率 +10%、迴避 +5'},
};
// ---------------- 合體攻擊（a 發動、b 為夥伴，需相鄰且夥伴未行動） ----------------
const COMBOS=[
  {a:'gang',b:'feng',name:'合體・雷風連擊',pow:5200,min:1,max:2,hit:25,en:30,will:115},
  {a:'gang',b:'tetsu',name:'合體・岩鐵衝擊',pow:5400,min:1,max:1,hit:15,en:30,will:115},
  {a:'gang',b:'lena',name:'合體・緋雷雙劍',pow:5800,min:1,max:1,hit:20,en:35,will:120},
  {a:'lei',b:'yu',name:'合體・天使狙擊',pow:4800,min:2,max:6,hit:30,en:25,will:110},
  {a:'lena',b:'lei',name:'合體・緋紅彈幕',pow:5000,min:1,max:4,hit:20,en:30,will:115},
  {a:'feng',b:'rei',name:'合體・零式疾風',pow:5400,min:1,max:3,hit:25,en:30,will:120},
];
// ---------------- 傭兵（天使帝國式：隨指揮官出擊，指揮範圍內獲得加成） ----------------
const MERCS={
  inf:  {name:'步兵機',ch:'步',price:200,stats:{hp:2200,en:80,atk:14,def:900, hit:95, eva:75, mov:4},weapons:[wp('突擊槍',1700,1,2,10)],desc:'平均的步兵。'},
  spear:{name:'槍兵機',ch:'槍',price:250,stats:{hp:2600,en:80,atk:16,def:1000,hit:95, eva:70, mov:4},weapons:[wp('長槍',2000,1,1,15)],desc:'近戰火力較高。'},
  bow:  {name:'射兵機',ch:'射',price:300,stats:{hp:1900,en:80,atk:15,def:750, hit:105,eva:70, mov:4},weapons:[wp('長程步槍',1900,2,4,10)],desc:'遠距離支援，不能反擊貼身敵人。'},
  fly:  {name:'飛兵機',ch:'飛',price:350,stats:{hp:1900,en:80,atk:15,def:700, hit:100,eva:105,mov:6},weapons:[wp('飛行刃',1800,1,1,15)],fly:true,desc:'飛行，迴避高。'},
  guard:{name:'衛兵機',ch:'衛',price:300,stats:{hp:3400,en:80,atk:12,def:1400,hit:90, eva:50, mov:3},weapons:[wp('盾擊',1500,1,1,10)],skills:{dmgDown:10},desc:'耐打，受到的傷害 −10%。'},
};
for(const [k,m] of Object.entries(MERCS)) E('m_'+k,m.ch,m.name,1,m.stats,m.skills||{},m.weapons,{fly:m.fly});
const CLS=id=>CLASSES[id]||ECLASSES[id];

// ---------------- 角色 ----------------
const CHARS={
  gang: {pilot:'雷隼',mech:'剛鐵號',ch:'剛',cls:'s1',lv:1,mod:{hp:300,atk:3,hit:3},sp:50,
         spirits:[['必中',1],['熱血',1],['鐵壁',2],['氣合',2],['魂',3],['再動',4]],
         lines:['上吧，剛鐵號！','這一擊，給我接好！','別小看銘甲隊！','氣勢正旺啊！']},
  feng: {pilot:'夏蓮',mech:'疾風號',ch:'疾',cls:'r1',lv:1,mod:{eva:5},sp:45,
         spirits:[['集中',1],['閃避',1],['加速',2],['必中',2],['再動',3]],lines:['太慢了。','跟得上我嗎？','疾風號，全速。']},
  lei:  {pilot:'冬木',mech:'遠雷號',ch:'狙',cls:'g1',lv:1,mod:{hit:5},sp:45,
         spirits:[['必中',1],['集中',1],['狙擊',2],['熱血',3]],lines:['目標鎖定。','一發就夠了。','風速修正完成。']},
  yu:   {pilot:'小晴',mech:'天使號',ch:'癒',cls:'p1',lv:1,mod:{},sp:60,
         spirits:[['閃避',1],['根性',1],['激勵',2],['鐵壁',2],['再動',3]],lines:['我也會努力的！','請不要逞強！','支援到了！']},
  tetsu:{pilot:'鐵山',mech:'岩山號',ch:'岩',cls:'t1',lv:2,mod:{hp:300},sp:40,
         spirits:[['鐵壁',1],['根性',1],['氣合',2],['熱血',3]],lines:['交給我擋！','礦山的男人可不會倒下！','喝啊——！']},
  lena: {pilot:'蕾娜',mech:'緋紅號',ch:'緋',cls:'k2',lv:4,mod:{atk:2,hit:3},sp:55,
         spirits:[['必中',1],['集中',1],['熱血',2],['魂',3]],lines:['以騎士之名！','緋紅號，斬！','不會讓你過去的。']},
  rei:  {pilot:'零',mech:'零號',ch:'零',cls:'r2b',lv:5,mod:{eva:5},sp:50,
         spirits:[['閃避',1],['集中',1],['熱血',2],['再動',3]],lines:['……排除。','名字嗎……我還在找。','無聊。']},
};
const GUESTS={
  bein: {pilot:'貝恩皇帝',mech:'皇機',ch:'貝',cls:'emperor',spirits:['必中','鐵壁'],sp:40,lines:['為了沒有戰爭的明天！','朕也會戰鬥！']},
  rei:  {pilot:'零',mech:'零號',ch:'零',cls:'r2b',spirits:['閃避','集中'],sp:50,lines:['……排除。','無聊。']},
  hogan:{pilot:'霍岡將軍',mech:'赤環將機',ch:'將',cls:'general',spirits:['熱血','鐵壁'],sp:50,lines:['赤環的武人，豈會落後！','看好了，小子們！']},
};
const DIFF=[{name:'簡單',lv:-2,exp:1.25,desc:'敵人等級 −2，經驗值 ×1.25。適合想輕鬆看劇情的玩家。'},{name:'普通',lv:0,exp:1,desc:'標準難度。'},{name:'困難',lv:2,exp:1,desc:'敵人等級 +2（已滿級的敵人改為能力提升）。'}];
const ROUTE_NAME={common:'共通路線',A:'守護之字',B:'赤環之誓',H:'無銘之甲',T:'始甲之名'};

// =====================================================================
// 狀態
// =====================================================================
const G={chapterId:null,route:'common',flags:{},roster:[],
  turn:1,phase:'P',units:[],map:[],W:16,H:11,sel:null,mode:'idle',weapon:null,origin:null,reach:null,targets:[],
  inspect:null,threatAll:false,threatOne:null,anim:true,autoCounter:false,busy:false,over:true,uid:0,skip:false,sleepers:[],
  firedEvents:new Set(),seenTags:new Set(),prepSnap:null,deployed:[],lvUps:[]};

const $=s=>document.querySelector(s);
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const key=(x,y)=>x+','+y;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const fmt=n=>Math.round(n).toLocaleString('en-US');
const CH=()=>CHAPTERS[G.chapterId];
const IN_HALL=typeof location!=='undefined'&&/\/zijia\/(index\.html)?$/.test(location.pathname);   // 只有放在遊戲大廳（littlethings）裡時才顯示返回連結
const HALL_URL='../index.html';
// ---------------- 音效 ----------------
const SFX={on:true,vol:0.3,ctx:null};
try{ const v=localStorage.getItem('zijia2-sfx'); if(v==='0') SFX.on=false; }catch(e){}
function sfxCtx(){
  if(!SFX.on||typeof window==='undefined'||!(window.AudioContext||window.webkitAudioContext)) return null;
  if(!SFX.ctx){ try{ SFX.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
  if(SFX.ctx.state==='suspended') SFX.ctx.resume();
  return SFX.ctx;
}
function tone(freq,dur,o={}){
  const c=sfxCtx(); if(!c) return;
  const t=c.currentTime+(o.delay||0), osc=c.createOscillator(), g=c.createGain();
  osc.type=o.type||'square'; osc.frequency.setValueAtTime(freq,t);
  if(o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*o.slide),t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(SFX.vol*(o.vol??1),t+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t+dur+0.03);
}
function noise(dur,o={}){
  const c=sfxCtx(); if(!c) return;
  const t=c.currentTime+(o.delay||0), n=Math.floor(c.sampleRate*dur), buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const src=c.createBufferSource(); src.buffer=buf;
  const f=c.createBiquadFilter(); f.type=o.hp?'highpass':'lowpass'; f.frequency.value=o.hp||o.lp||2400;
  const g=c.createGain(); g.gain.setValueAtTime(SFX.vol*(o.vol??1),t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); src.stop(t+dur+0.02);
}
const arp=(notes,step,o)=>notes.forEach((f,i)=>tone(f,o.len||step*1.4,{...o,delay:(o.delay||0)+i*step}));
const SOUNDS={
  select:()=>tone(880,0.06,{vol:.25}),
  menu:()=>tone(660,0.04,{vol:.18}),
  cancel:()=>tone(420,0.08,{vol:.22,slide:.6}),
  move:()=>{ tone(300,0.05,{type:'triangle',vol:.3}); tone(360,0.05,{type:'triangle',vol:.25,delay:.06}); },
  fire:()=>{ noise(0.1,{vol:.35,hp:1500}); tone(260,0.09,{type:'sawtooth',vol:.18,slide:.5}); },
  hit:()=>{ noise(0.2,{vol:.7,lp:1600}); tone(140,0.16,{vol:.3,slide:.5}); },
  crit:()=>{ noise(0.3,{vol:.9,lp:2600}); tone(100,0.3,{type:'sawtooth',vol:.4,slide:.4}); tone(1400,0.08,{vol:.22,delay:.03}); },
  miss:()=>tone(1000,0.16,{type:'sine',vol:.25,slide:.45}),
  beam:()=>{ tone(1600,0.35,{type:'sawtooth',vol:.18,slide:.25}); noise(0.3,{vol:.25,hp:2500}); },
  missile:()=>{ noise(0.35,{vol:.3,hp:800}); tone(500,0.3,{type:'triangle',vol:.15,slide:1.8}); },
  boom:()=>{ noise(0.7,{vol:.9,lp:700}); tone(90,0.6,{type:'sawtooth',vol:.4,slide:.3}); },
  cutin:()=>{ noise(0.5,{vol:.35,hp:3000}); arp([392,523,784,1047,1568],0.05,{type:'sawtooth',vol:.16}); tone(80,0.6,{type:'square',vol:.25,slide:2.5,delay:.2}); },
  levelup:()=>arp([523,659,784,1047],0.08,{type:'square',vol:.28}),
  spirit:()=>arp([784,988,1319],0.05,{type:'triangle',vol:.3}),
  heal:()=>arp([660,880,1175],0.07,{type:'sine',vol:.32}),
  buy:()=>arp([988,1319],0.06,{type:'square',vol:.2}),
  phaseP:()=>arp([392,523,659],0.09,{type:'triangle',vol:.3}),
  phaseE:()=>arp([330,277,220],0.1,{type:'sawtooth',vol:.2}),
  talk:()=>tone(520+Math.random()*80,0.035,{vol:.1}),
  join:()=>arp([523,784,1047,1319],0.07,{type:'triangle',vol:.3}),
  win:()=>arp([523,659,784,1047,784,1047],0.11,{type:'square',vol:.25,len:.18}),
  lose:()=>arp([392,349,311,262],0.18,{type:'triangle',vol:.3,len:.3}),
};
function sfx(n){ try{ if(SFX.on&&!G.skip&&SOUNDS[n]) SOUNDS[n](); }catch(e){} }
// ---------------- 像素圖示 ----------------
const _iconCache={};
function iconURL(k){
  if(typeof ICONS==='undefined'||!ICONS[k]) return null;
  if(_iconCache[k]) return _iconCache[k];
  const d=ICONS[k], cv=document.createElement('canvas'); cv.width=16; cv.height=16;
  const cx=cv.getContext('2d');
  d.rows.forEach((r,y)=>[...r].forEach((c,x)=>{ if(c!=='.'&&d.pal[c]){ cx.fillStyle=d.pal[c]; cx.fillRect(x,y,1,1); } }));
  return _iconCache[k]=cv.toDataURL();
}
function iconKey(o){ // o: unit 或 speaker key
  if(typeof ICONS==='undefined') return null;
  const ok=k=>k&&ICONS[k]?k:(k&&typeof ICON_ALIAS!=='undefined'&&ICONS[ICON_ALIAS[k]]?ICON_ALIAS[k]:null);
  if(typeof o==='string') return ok(o);
  const hit=Object.entries(CHARS).find(([k,c])=>c.pilot===o.pilot);
  return ok(o.cid)||ok(o.tag)||(hit&&ok(hit[0]))||ok(o.cls)||null;
}
function face(o,fallback){ const k=iconKey(o), u=k&&iconURL(k); return u?`<img class="px" src="${u}" alt="${fallback}">`:fallback; }
function sleep(ms){return new Promise(r=>{ if(G.skip||ms<=0){r();return;} const t=setTimeout(r,ms); G.sleepers.push(()=>{clearTimeout(t);r();}); });}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function skipAll(){G.skip=true;G.sleepers.splice(0).forEach(f=>f());}

// =====================================================================
// 數值
// =====================================================================
function statsOf(clsId,lv,mod={}){
  const c=CLS(clsId); let b;
  if(c.stats) b={...c.stats};
  else { b={...ROLE_BASE[c.role]}; const t=TIER_ADD[c.tier]; for(const k in t) b[k]+=t[k]; }
  for(const k in (c.tweak||{})) b[k]=(b[k]||0)+c.tweak[k];
  const g=GROWTH[c.tier]; for(const k in g) b[k]+=g[k]*(lv-1);
  for(const k in mod) b[k]=(b[k]||0)+mod[k];
  for(const k in b) b[k]=Math.round(b[k]);
  return b;
}
const mRank=m=>(CLS(m.cls).tier-1)*10+m.lv;
const uRank=u=>(u.tier-1)*10+(u.rankLv||u.lv);   // 敵機用設計等級計算經驗值，不受難度／調整影響
function reqOK(c,cid){
  if(!c.req) return true;
  if(c.req.char&&c.req.char!==cid) return false;
  if(c.req.route&&c.req.route!==G.route) return false;
  if(c.req.minNo&&(!CH()||CH().no<c.req.minNo)) return false;
  return true;
}
function childrenOf(clsId,cid,ignoreReq=false){
  const cur=CLS(clsId);
  return Object.values(CLASSES).filter(c=>(c.from===clsId||(c.from==='*s3'&&cur.role==='striker'&&cur.tier===3))&&(ignoreReq||reqOK(c,cid)));
}
function canChange(m){return m.lv>=CC_LV&&childrenOf(m.cls,m.cid).length>0;}
function unlockedSpirits(m){const t=CLS(m.cls).tier;return CHARS[m.cid].spirits.filter(([,need])=>t>=need).map(([n])=>n);}
function maxSp(m){return CHARS[m.cid].sp+10*(CLS(m.cls).tier-1);}

// =====================================================================
// 規則
// =====================================================================
const terrAt=(x,y)=>TERRAIN[G.map[y][x]];
const unitAt=(x,y)=>G.units.find(u=>u.x===x&&u.y===y&&u.hp>0);
const inMap=(x,y)=>x>=0&&y>=0&&x<G.W&&y<G.H;
const sk=(u,k)=>(u.skills[k]||0)+((u.xsk&&u.xsk[k])||0)+(u.guts&&u.hp<u.maxHp/2&&(k==='dmgUp'||k==='hitUp'||k==='evaUp')?15:0);
function moveCost(u,x,y){const t=terrAt(x,y); if(t.block) return 99; return u.fly?1:t.cost;}
function terrBonus(u){ if(u.fly) return {def:0,eva:0}; const t=terrAt(u.x,u.y); return {def:t.def,eva:t.eva}; }
function addWill(u,n){u.will=clamp(u.will+n,50,150);}
const effMove=u=>u.mov+(u.st.accel?3:0);
const wMax=(u,w)=>w.max+(w.max>1?((u.st.snipe?1:0)+(u.rangeUp||0)):0);
function aura(u){
  const r={hit:0,eva:0,dmg:0};
  if(u.merc){ const c=G.units.find(o=>o.cid===u.cmd&&o.side===u.side&&o.hp>0&&!o.merc); if(c&&dist(c,u)<=2){ r.hit=10; r.eva=10; r.dmg=10; } }
  for(const o of G.units){ if(o===u||o.side!==u.side||o.hp<=0||!o.skills.aura) continue;
    const a=o.skills.aura; if(dist(o,u)>a.range) continue;
    r.hit=Math.max(r.hit,a.hit||0); r.eva=Math.max(r.eva,a.eva||0); r.dmg=Math.max(r.dmg,a.dmg||0); }
  return r;
}
function guardAura(u){
  let p=0; for(const o of G.units){ if(o===u||o.side!==u.side||o.hp<=0||!o.skills.guardAura) continue;
    if(dist(o,u)<=o.skills.guardAura.range) p=Math.max(p,o.skills.guardAura.pct); }
  return p;
}
function mkPlayerUnit(m,x,y){
  const ch=CHARS[m.cid], c=CLS(m.cls), s=statsOf(m.cls,m.lv,ch.mod);
  const parts=(m.parts||[]).filter(Boolean).map(p=>PARTS[p]).filter(Boolean);
  for(const p of parts) for(const k in (p.mod||{})) s[k]=(s[k]||0)+p.mod[k];
  const ps=m.psk||{};
  const u=baseUnit({side:'P',cid:m.cid,member:m,cls:m.cls,lv:m.lv,name:ch.mech,pilot:ch.pilot,ch:ch.ch,x,y,s,c,
    sp:maxSp(m)+15*(ps.spUp||0),spirits:unlockedSpirits(m),lines:ch.lines});
  u.will+=parts.reduce((a,p)=>a+(p.will||0),0)+5*(ps.willUp||0);
  u.rangeUp=parts.reduce((a,p)=>a+(p.range||0),0);
  u.xsk={crit:ps.keen?10:0,evaUp:ps.keen?5:0};
  u.guts=!!ps.guts; u.focusSk=!!ps.focus;
  u.supA0=1+(ps.supA||0); u.supD0=1+(ps.supD||0); u.supA=u.supA0; u.supD=u.supD0;
  u.partNames=parts.map(p=>p.name); u.pskNames=Object.entries(ps).filter(([,v])=>v).map(([k,v])=>PSKILLS[k].name+(PSKILLS[k].max>1?v:''));
  return u;
}
function mercMult(m){ return 1+0.035*mRank(m); }
function mkMerc(type,m,x,y){
  const t=MERCS[type], c=CLS('m_'+type), k=mercMult(m), s={...t.stats};
  for(const key of ['hp','atk','def']) s[key]=Math.round(s[key]*k);
  s.hit=Math.round(s.hit+mRank(m)*0.6); s.eva=Math.round(s.eva+mRank(m)*0.5);
  const u=baseUnit({side:'P',cls:'m_'+type,lv:Math.max(1,Math.round(mRank(m)/3)),name:t.name,pilot:CHARS[m.cid].pilot+'的傭兵',ch:t.ch,x,y,s,c,sp:0,spirits:[],lines:[]});
  u.merc=true; u.cmd=m.cid; u.supA0=u.supD0=u.supA=u.supD=0;
  return u;
}
function mercCap(m){ const c=CLS(m.cls); return c.skills.aura?3:2; }
function mercCost(type){ return Math.round(MERCS[type].price*(1+0.12*((CH()&&CH().no)||1))); }
function mkGuest(id,lv,x,y){
  const g=GUESTS[id], c=CLS(g.cls), s=statsOf(g.cls,lv);
  return baseUnit({side:'P',cid:id,guest:true,cls:g.cls,lv,name:g.mech,pilot:g.pilot,ch:g.ch,x,y,s,c,sp:g.sp,spirits:g.spirits,lines:g.lines,will:110});
}
function mkEnemy(d){
  const c=CLS(d.c), df=DIFF[G.diff==null?1:G.diff], adj=(CH()&&CH().lvAdj)||0, raw=(d.lv||1)+df.lv+adj, lv=clamp(raw,1,MAX_LV), s=statsOf(d.c,lv);
  // 等級超出 1〜10 的部分改成能力倍率
  const k=raw>MAX_LV?1+0.06*(raw-MAX_LV):raw<1?Math.max(0.6,1-0.07*(1-raw)):1;
  if(k!==1){ s.hp=Math.round(s.hp*k); s.atk=Math.round(s.atk*k); s.def=Math.round(s.def*k); }
  const u=baseUnit({side:'E',cls:d.c,lv,name:d.name||c.name,pilot:d.pilot||(c.enemy?'敵兵':c.name+'駕駛'),ch:d.ch||c.ch||'敵',x:d.x,y:d.y,s,c,
    sp:0,spirits:[],lines:[],will:d.boss?115:100});
  u.rankLv=clamp(d.lv||1,1,MAX_LV);
  Object.assign(u,{ai:c.obj?'hold':(d.ai||'aggr'),tag:d.tag||null,boss:!!d.boss,retreat:d.retreat||0,retreatLines:d.retreatLines||null,talk:d.talk||null,obj:!!c.obj,phase2:d.phase2||null});
  if(u.tag) G.seenTags.add(u.tag);
  return u;
}
function baseUnit(o){
  const s=o.s,c=o.c;
  return {uid:++G.uid,side:o.side,cid:o.cid||null,member:o.member||null,guest:!!o.guest,cls:o.cls,tier:c.tier,lv:o.lv,
    name:o.name,pilot:o.pilot,ch:o.ch,x:o.x,y:o.y,
    maxHp:s.hp,hp:s.hp,maxEn:s.en,en:s.en,atk:s.atk,def:s.def,hit:s.hit,eva:s.eva,mov:s.mov,fly:!!c.fly,
    skills:c.skills,weapons:c.weapons.map(w=>({...w,left:w.ammo})),
    will:(o.will||100)+(c.skills.willStart||0),sp:o.sp||0,maxSp:o.sp||0,spirits:o.spirits||[],lines:o.lines||[],
    st:{},acted:false,moved:false,ai:'aggr',boss:false};
}
function whyNot(u,w,d,moved){
  if(w.will&&u.will<w.will) return '需氣力 '+w.will;
  if(w.en&&u.en<w.en) return 'EN 不足';
  if(w.ammo!=null&&w.left<=0) return '彈藥耗盡';
  if(moved&&!w.post) return '移動後不可用';
  if(d!=null&&(d<w.min||d>wMax(u,w))) return '射程外';
  return '';
}
function hitRate(a,w,d,react){
  if(d.st.dodge) return 0;
  if(a.st.sure) return 100;
  const aa=aura(a), da=aura(d);
  let h=75+w.hit+(a.hit-d.eva)/2-terrBonus(d).eva+sk(a,'hitUp')-sk(d,'evaUp')+aa.hit-da.eva;
  if(a.st.focus) h+=30;
  if(d.st.focus) h-=30;
  if(react==='evade') h/=2;
  return clamp(Math.round(h),0,100);
}
function calcDmg(a,w,d,react){
  const arm=d.def*(1-sk(a,'pierce')/100);
  let v=(w.pow+a.atk*10)*a.will/100 - arm*d.will/100*0.5;
  v*=1+(sk(a,'dmgUp')+aura(a).dmg)/100;
  v*=1-(sk(d,'dmgDown')+guardAura(d))/100;
  v*=1-terrBonus(d).def;
  if(a.st.soul) v*=2.5; else if(a.st.valor) v*=2;
  if(d.st.wall) v*=0.25;
  if(react==='guard') v*=0.5;
  return Math.max(10,Math.round(v));
}
function bestWeapon(u,t,d,moved=false){
  let best=null,bs=-1;
  for(const w of u.weapons){ if(whyNot(u,w,d,moved)) continue;
    const s=hitRate(u,w,t,null)*Math.min(calcDmg(u,w,t,null),t.hp);
    if(s>bs){bs=s;best=w;} }
  return best;
}
function aiReact(d,a,dd){ const cw=bestWeapon(d,a,dd); return cw?{react:'counter',cw}:{react:'guard',cw:null}; }
function reachable(u){
  const res=new Map(); res.set(key(u.x,u.y),{c:0,prev:null,x:u.x,y:u.y,stop:true});
  const pq=[[0,u.x,u.y]], mv=effMove(u);
  while(pq.length){
    pq.sort((a,b)=>a[0]-b[0]); const [c,x,y]=pq.shift();
    if(c>res.get(key(x,y)).c) continue;
    for(const [dx,dy] of DIRS){
      const nx=x+dx,ny=y+dy; if(!inMap(nx,ny)) continue;
      const mc=moveCost(u,nx,ny); if(mc>=99) continue;
      const o=unitAt(nx,ny); if(o&&o.side!==u.side) continue;
      const nc=c+mc; if(nc>mv) continue;
      const k=key(nx,ny), old=res.get(k);
      if(!old||old.c>nc){res.set(k,{c:nc,prev:key(x,y),x:nx,y:ny,stop:!o||o===u}); pq.push([nc,nx,ny]);}
    }
  }
  return res;
}
function pathTo(reach,x,y){const p=[];let k=key(x,y);while(k){const v=reach.get(k);p.unshift(v);k=v.prev;}return p;}
function threatCells(e){
  const set=new Set(), reach=reachable(e);
  for(const v of reach.values()){ if(!v.stop) continue; const moved=!(v.x===e.x&&v.y===e.y);
    if(e.ai==='hold'&&moved) {}
    for(const w of e.weapons){ if(whyNot(e,w,null,moved)) continue; const mx=wMax(e,w);
      for(let dy=-mx;dy<=mx;dy++)for(let dx=-mx;dx<=mx;dx++){const m=Math.abs(dx)+Math.abs(dy);
        if(m<w.min||m>mx) continue; const x=v.x+dx,y=v.y+dy; if(inMap(x,y)) set.add(key(x,y));}}}
  return set;
}

// =====================================================================
// 經驗與升級
// =====================================================================
function addExp(m,amt){ // 回傳 {up:升級數, pp:獲得 PP}
  let up=0, pp=0; m.exp+=Math.round(amt);
  while(m.exp>=EXP.perLv){ m.exp-=EXP.perLv; if(m.lv<MAX_LV){ m.lv++; up++; } pp++; }
  m.pp=(m.pp||0)+pp; return {up,pp};
}
function gainExp(u,amt){
  const m=u.member; if(!m||u.side!=='P') return;
  const r=addExp(m,amt*DIFF[G.diff==null?1:G.diff].exp);
  if(r.pp&&!r.up) log(`${u.pilot} 獲得 ${r.pp} PP。`,'lvl');
  if(r.up&&!G.anim) setTimeout(()=>sfx('levelup'),200);
  if(r.up){
    const s=statsOf(m.cls,m.lv,CHARS[m.cid].mod);
    const dh=s.hp-u.maxHp, de=s.en-u.maxEn;
    u.maxHp=s.hp; u.hp=clamp(u.hp+dh,0,u.maxHp); u.maxEn=s.en; u.en=clamp(u.en+de,0,u.maxEn);
    Object.assign(u,{atk:s.atk,def:s.def,hit:s.hit,eva:s.eva,lv:m.lv});
    if(typeof mapFx==='function') mapFx(u.x,u.y,'LV UP','#ffd25a',{delay:500,dur:1400});
    log(`▲ ${u.pilot} 升到 Lv ${m.lv}！獲得 ${r.pp} PP。${canChange(m)?'（戰鬥後可以轉職）':''}`,'lvl');
    G.lvUps.push(`${u.pilot} Lv ${m.lv}`);
  }
}
function goldFor(d){ return (d.boss?800:0)+d.tier*80+d.lv*15; }
function expFor(a,d,kill){
  const diff=uRank(d)-uRank(a);
  let e=clamp(EXP.hitBase+diff*EXP.hitStep,EXP.hitMin,EXP.hitMax);
  if(kill) e+=clamp(EXP.killBase+diff*EXP.killStep,EXP.killMin,EXP.killMax)+(d.boss?EXP.boss:0);
  return e;
}

// =====================================================================
// 渲染
// =====================================================================
function fitMap(){
  const wrap=$('.board'); if(!wrap) return;
  const avail=wrap.clientWidth-2;
  const spr=typeof gfxActive==='function'&&gfxActive();
  const cs=spr?gfxPickCs(avail,G.W):clamp(Math.floor((avail-(G.W-1))/G.W),21,46);
  if(spr) GFX.cs=cs;
  document.documentElement.style.setProperty('--cs',cs+'px');
  document.documentElement.style.setProperty('--cols',G.W);
  if(typeof gfxResize==='function') gfxResize();
}
function render(){renderMap();renderHeader();renderActions();renderInfo();renderFMenu();}
function fmenuHtml(s){
  if(G.mode==='unit'){
    const anyTarget=weaponsOf(s).some(w=>targetsFor(s,w).length);
    const rep=s.skills.heal, canRep=repairTargets(s).length>0, tk=talkTargets(s).length>0;
    const b=(a,label,key,ok=true,cls='')=>`<button class="btn ${cls}" data-a="${a}" ${ok?'':'disabled'}><span>${label}</span><kbd>${key}</kbd></button>`;
    return `<div class="fm-h">${s.ch} ${s.pilot}${s.moved?'':'（原地）'}</div>
      ${b('attack','攻擊','A',anyTarget,'pri')}
      ${tk?b('talk','說服','T',true,'talkbtn'):''}
      ${rep?b('repair','修理','R',canRep):''}
      ${b('spirit','精神','S',s.spirits.length>0)}
      ${!s.merc&&Object.keys(ITEMS).some(k=>(G.inv||{})[k]>0)?b('item','道具','I',!s.itemUsed):''}
      ${b('wait','待機','W')}
      ${b('cancel',s.moved?'取消移動':'取消','Esc')}`;
  }
  if(G.mode==='weapon'){
    return `<div class="fm-h">選擇武器</div>${weaponsOf(s).map((w,i)=>{ const why=whyNot(s,w,null,s.moved), n=why?0:targetsFor(s,w).length;
      return `<button class="btn wbtn${w.combo?' combo':''}" data-w="${i}" ${(!why&&n)?'':'disabled'} title="威力 ${fmt(w.pow)} · 射程 ${w.min}–${wMax(s,w)} · 命中 ${w.hit>=0?'+':''}${w.hit} · ${costTxt(w)}"><span>${w.name}${w.combo?`<small class="ctag">與${w.combo.pilot}</small>`:''}</span><kbd>${i<9?i+1:''}</kbd><small class="${why||!n?'why':''}">${why||(n?`${fmt(w.pow)} · ${w.min}–${wMax(s,w)}格`:'射程內無目標')}</small></button>`;}).join('')}
      <button class="btn" data-a="back"><span>返回</span><kbd>Esc</kbd></button>`;
  }
  const tip={target:`【${G.weapon&&G.weapon.name}】點選紅框敵機`,repair:'點選綠框友軍修理',talk:'點選綠框敵機說服'}[G.mode];
  return `<div class="fm-h">${tip||''}</div><button class="btn" data-a="back"><span>返回</span><kbd>Esc</kbd></button>`;
}
function renderFMenu(){
  const fm=$('#fmenu'), s=G.sel; if(!fm) return;
  const show=G.phase==='P'&&!G.over&&!G.busy&&s&&s.side==='P'&&G.units.includes(s)&&((G.mode==='unit'&&(s.moved||G.menuOpen))||['weapon','target','repair','talk'].includes(G.mode));
  if(!show){ fm.hidden=true; return; }
  fm.innerHTML=fmenuHtml(s); fm.hidden=false;
  const cell=document.querySelector(`.c[data-x="${s.x}"][data-y="${s.y}"]`), board=$('.board');
  if(!cell||!board||!cell.getBoundingClientRect) return;
  const cr=cell.getBoundingClientRect(), br=board.getBoundingClientRect(), fw=fm.offsetWidth, fh=fm.offsetHeight;
  let x=cr.right-br.left+6, y=cr.top-br.top-4;
  if(x+fw>br.width-4) x=cr.left-br.left-fw-6;
  if(x<4) x=Math.min(br.width-fw-4,cr.left-br.left);
  y=Math.max(0,Math.min(y,br.height-fh));
  fm.style.left=x+'px'; fm.style.top=y+'px';
}
function renderHeader(){
  const ch=CH();
  $('#stageName').innerHTML=ch?`第 ${ch.no} 章　${ch.title}${ch.route!=='common'?`<span class="rt">${ROUTE_NAME[ch.route]}</span>`:''}`:'';
  let t=`第 ${G.turn} 回合`;
  if(ch&&!G.over){ if(ch.win.type==='survive') t+=`／堅守至 ${ch.win.turns}`; if(ch.turnLimit) t+=`／限 ${ch.turnLimit}`; }
  $('#turnLbl').textContent=t;
  const ph=$('#phaseLbl'); ph.className='phase '+G.phase; ph.textContent=G.phase==='P'?'我方回合':'敵方回合';
  $('#btnEnd').disabled=G.phase!=='P'||G.busy||G.over;
  $('#btnThreat').classList.toggle('on',G.threatAll);
  const w=$('#winLbl'); w.textContent=ch&&!G.over?`勝利：${ch.winText}　敗北：${ch.loseText}`:'';
}
function renderMap(){
  const mv=new Set(),atk=new Set(),tgt=new Set(),rep=new Set(),talk=new Set(),exit=new Set();
  let thr=new Set();
  const s=G.sel, ch=CH();
  if(ch&&(ch.win.type==='escape'||ch.win.type==='capture')) ch.win.cells.forEach(([x,y])=>exit.add(key(x,y)));
  const ra=new Set();
  if(G.mode==='unit'&&s&&!s.moved&&G.reach){ for(const v of G.reach.values()) if(v.stop) mv.add(key(v.x,v.y));
    if(G.showRange!==false) for(const v of G.reach.values()){ if(!v.stop) continue; const moved=!(v.x===s.x&&v.y===s.y);
      for(const w of s.weapons){ if(whyNot(s,w,null,moved)) continue; const mx=wMax(s,w);
        for(let dy=-mx;dy<=mx;dy++)for(let dx=-mx;dx<=mx;dx++){const m=Math.abs(dx)+Math.abs(dy); if(m<w.min||m>mx) continue; const k=key(v.x+dx,v.y+dy); if(inMap(v.x+dx,v.y+dy)&&!mv.has(k)) ra.add(k);}}}
    for(const k of mv) ra.delete(k); }
  if(G.mode==='target'&&s&&G.weapon){ const w=G.weapon, mx=wMax(s,w);
    for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){const m=Math.abs(x-s.x)+Math.abs(y-s.y); if(m>=w.min&&m<=mx) atk.add(key(x,y));}
    G.targets.forEach(t=>tgt.add(key(t.x,t.y))); }
  if(G.mode==='repair') G.targets.forEach(t=>rep.add(key(t.x,t.y)));
  if(G.mode==='talk') G.targets.forEach(t=>talk.add(key(t.x,t.y)));
  if(G.threatAll){ G.units.filter(u=>u.side==='E').forEach(e=>threatCells(e).forEach(k=>thr.add(k))); }
  else if(G.threatOne&&G.threatOne.hp>0&&G.units.includes(G.threatOne)){ thr=threatCells(G.threatOne); }
  const ally=new Set([...rep,...talk]);
  G.ov={mv,ra,atk,thr,rep:ally,ally,tgt,exit};
  if(typeof GFX!=='undefined'&&GFX.mapOn){
    const m=$('#map');
    if(m.childElementCount!==G.W*G.H||m.dataset.w!=G.W){ let hh=''; for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++) hh+=`<div class="c" data-x="${x}" data-y="${y}"></div>`; m.innerHTML=hh; m.dataset.w=G.W; }
    return;
  }
  let h='';
  for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
    const t=terrAt(x,y),k=key(x,y),u=unitAt(x,y);
    let cls='c t-'+t.k;
    if(exit.has(k)) cls+=' exit';
    if(thr.has(k)) cls+=' thr';
    if(mv.has(k)) cls+=' mv';
    else if(ra.has(k)) cls+=' ra';
    if(atk.has(k)) cls+=' atk';
    if(rep.has(k)) cls+=' rep rtg';
    if(talk.has(k)) cls+=' rep ttg';
    if(tgt.has(k)) cls+=' tgt';
    if(u&&u===G.sel) cls+=' sel';
    h+=`<div class="${cls}" data-x="${x}" data-y="${y}">`;
    if(u){ h+=`<span class="u ${u.side}${u.merc?' merc':''}${u.guest?' guest':''}${u.boss?' boss':''}${u.fly?' fly':''}${u.acted?' acted':''}${u.talk?' talkable':''}" style="--h:${Math.round(u.hp/u.maxHp*100)}%">${u.ch}<i></i></span>`; }
    else if(chestAt(x,y)) h+=`<span class="tg chest">寶</span>`;
    else h+=`<span class="tg">${t.g}</span>`;
    h+='</div>';
  }
  $('#map').innerHTML=h; $('#map').dataset.w='';
}
function talkTargets(s){ if(!s.cid) return []; return G.units.filter(u=>u.side==='E'&&u.talk&&dist(u,s)===1&&u.talk.by.includes(s.cid)); }
function repairTargets(s){ const h=s.skills.heal; if(!h) return []; return G.units.filter(u=>u.side==='P'&&u!==s&&u.hp<u.maxHp&&dist(u,s)>=h.min&&dist(u,s)<=h.max); }
function comboWeapons(s){
  if(s.side!=='P'||!s.cid||s.merc) return [];
  const out=[];
  for(const c of COMBOS){ if(c.a!==s.cid) continue;
    const p=G.units.find(u=>u.cid===c.b&&u.side==='P'&&u.hp>0&&!u.merc);
    if(!p||p.acted||dist(p,s)!==1||p.will<c.will||p.en<c.en) continue;
    out.push({name:c.name,pow:c.pow+Math.round(p.atk*8),min:c.min,max:c.max,hit:c.hit,en:c.en,ammo:null,left:null,will:c.will,post:true,combo:p}); }
  return out;
}
const weaponsOf=s=>s.weapons.concat(comboWeapons(s));
function targetsFor(s,w){ if(whyNot(s,w,null,s.moved)) return []; return G.units.filter(u=>u.side==='E'&&!whyNot(s,w,dist(s,u),s.moved)); }
function renderActions(){
  const el=$('#actions'), s=G.sel;
  if(G.over){el.innerHTML='<p class="hint">—</p>';return;}
  if(G.phase!=='P'){el.innerHTML='<h3>敵方行動中</h3><p class="hint">被攻擊時你可以選擇反擊、防禦或迴避。</p>';return;}
  if(G.mode==='idle'||!s){
    const left=G.units.filter(u=>u.side==='P'&&!u.acted).length;
    el.innerHTML=`<h3>指令</h3><p class="hint">點選藍色的我方機體開始行動（尚有 ${left} 台未行動）。選取後：點藍色格子移動，<b>直接點敵機</b>就會自動移動到最佳位置並攻擊；再點一次自己的機體可原地行動。</p>
      <p class="hint keys">快捷鍵：A 攻擊・S 精神・W 待機・R 修理・T 說服・I 道具・1–9 選武器・Tab 下一台・E 結束回合・Esc／右鍵 取消</p>`;return;}
  if(G.mode==='unit'){
    const anyTarget=weaponsOf(s).some(w=>targetsFor(s,w).length);
    const rep=s.skills.heal, canRep=repairTargets(s).length>0, tk=talkTargets(s).length>0;
    el.innerHTML=`<h3>${s.name}（${s.pilot}）</h3>
      <p class="hint" style="margin-bottom:10px">${s.moved?'已移動。選擇行動，或直接點敵機攻擊：':'點藍色格子移動；直接點敵機＝自動移動並攻擊；再點一次自己＝原地行動。'}</p>
      <div class="row">
        <button class="btn pri" data-a="attack" ${anyTarget?'':'disabled'}>攻擊</button>
        ${tk?'<button class="btn talkbtn" data-a="talk">說服</button>':''}
        ${rep?`<button class="btn" data-a="repair" ${canRep?'':'disabled'}>修理</button>`:''}
        <button class="btn" data-a="spirit" ${s.spirits.length?'':'disabled'}>精神</button>
        ${!s.merc&&Object.keys(ITEMS).some(k=>(G.inv||{})[k]>0)?`<button class="btn" data-a="item" ${s.itemUsed?'disabled':''}>道具</button>`:''}
        <button class="btn" data-a="wait">待機</button>
        <button class="btn" data-a="cancel">${s.moved?'取消移動':'取消'}</button>
      </div>`;return;}
  if(G.mode==='weapon'){
    el.innerHTML=`<h3>選擇武器</h3><div class="wlist">${weaponsOf(s).map((w,i)=>{
      const why=whyNot(s,w,null,s.moved); const n=why?0:targetsFor(s,w).length;
      const note=why?`<small class="why">${why}</small>`:(n?`<small>${n} 個目標</small>`:`<small class="why">射程內無目標</small>`);
      return `<button class="btn wbtn${w.combo?' combo':''}" data-w="${i}" ${(!why&&n)?'':'disabled'}><span>${w.name}${w.combo?`<small class="ctag">與${w.combo.pilot}</small>`:''}</span>${note}<small>威力 ${fmt(w.pow)} · 射程 ${w.min}–${wMax(s,w)} · 命中 ${w.hit>=0?'+':''}${w.hit}</small><small>${costTxt(w)}</small></button>`;}).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn" data-a="back">返回</button></div>`;return;}
  const tips={target:[`【${G.weapon&&G.weapon.name}】選擇目標`,'紅色區域為射程，閃爍紅框的敵機可以攻擊。'],
    repair:['修理','點選綠框的友軍進行修理。'],talk:['說服','點選綠框的敵機進行說服。']};
  const [a,b]=tips[G.mode];
  el.innerHTML=`<h3>${a}</h3><p class="hint" style="margin-bottom:10px">${b}</p><div class="row"><button class="btn" data-a="back">返回</button></div>`;
}
function costTxt(w){const a=[];if(w.en)a.push('EN '+w.en);if(w.ammo!=null)a.push(`彈 ${w.left}/${w.ammo}`);if(w.will)a.push('氣力 '+w.will);if(!w.post)a.push('移動後✕');return a.join(' · ')||'無消耗';}
function skillList(sks){
  const o=[];
  if(sks.hitUp) o.push(`命中+${sks.hitUp}`); if(sks.evaUp) o.push(`迴避+${sks.evaUp}`);
  if(sks.dmgUp) o.push(`傷害+${sks.dmgUp}%`); if(sks.dmgDown>0) o.push(`減傷${sks.dmgDown}%`); if(sks.dmgDown<0) o.push(`受傷+${-sks.dmgDown}%`);
  if(sks.crit) o.push(`會心+${sks.crit}%`); if(sks.pierce) o.push(`貫穿${sks.pierce}%`);
  if(sks.counterFirst) o.push('先制反擊'); if(sks.regen) o.push(`再生${sks.regen}%`);
  if(sks.willStart) o.push(`初始氣力+${sks.willStart}`); if(sks.killWill) o.push(`擊墜氣力+${sks.killWill}`);
  if(sks.spRegen) o.push(`SP回復${sks.spRegen}`);
  if(sks.heal) o.push(`修理 ${sks.heal.min}–${sks.heal.max}格 ${sks.heal.pct}%`);
  if(sks.aura) o.push(`指揮${sks.aura.range}格(命${sks.aura.hit}/避${sks.aura.eva}${sks.aura.dmg?'/傷'+sks.aura.dmg+'%':''})`);
  if(sks.guardAura) o.push(`守護${sks.guardAura.range}格 -${sks.guardAura.pct}%`);
  return o;
}
function renderInfo(){
  const u=G.inspect||G.sel; const el=$('#info');
  if(!u){el.innerHTML='<h3>機體資訊</h3><p class="hint" style="color:var(--mute);margin:0">選取或指向一台機體以查看詳細數據。</p>';return;}
  el.innerHTML=unitCard(u);
}
function unitCard(u){
  const hpP=u.hp/u.maxHp*100, enP=u.en/u.maxEn*100, c=CLS(u.cls);
  const chips=Object.keys(ST_LABEL).filter(k=>u.st[k]).map(k=>`<span class="chip">${ST_LABEL[k]}</span>`).join('');
  const sks=skillList(u.skills).map(t=>`<span class="chip sk">${t}</span>`).join('');
  const t=terrAt(u.x,u.y);
  const exp=u.member?`<div class="expbar"><span>EXP</span><div class="bar ex"><i style="width:${u.member.exp/EXP.perLv*100}%"></i></div><span>${u.member.lv>=MAX_LV?'MAX ':''}${u.member.exp}/${EXP.perLv}</span></div>`:'';
  return `<div class="${u.side}">
  <div class="uc-head"><div class="uc-g${iconKey(u)?' hasicon':''}">${face(u,u.ch)}${iconKey(u)?`<span class="badge">${u.ch}</span>`:''}</div><div><b>${u.name}</b><small>${u.pilot}${u.guest?'（友軍）':''} · ${c.name} Lv ${u.lv}${u.fly?' · 飛行':''} · 位於${t.name}</small></div></div>
  <div class="bars"><span>HP</span><div class="bar hp${hpP<30?' low':''}"><i style="width:${hpP}%"></i></div><span>${fmt(u.hp)}/${fmt(u.maxHp)}</span>
  <span>EN</span><div class="bar en"><i style="width:${enP}%"></i></div><span>${u.en}/${u.maxEn}</span></div>${exp}
  <div class="stats"><div><small>氣力</small><span>${u.will}</span></div><div><small>攻擊</small><span>${u.atk}</span></div><div><small>裝甲</small><span>${fmt(u.def)}</span></div><div><small>命中</small><span>${u.hit}</span></div><div><small>迴避</small><span>${u.eva}</span></div><div><small>移動</small><span>${u.mov}</span></div></div>
  ${u.side==='P'&&!u.merc?`<div class="spline">SP ${u.sp}/${u.maxSp}　精神：${u.spirits.join('、')||'—'}　·　援護 攻${u.supA||0}／防${u.supD||0}</div>`:''}
  ${u.merc?`<div class="spline">傭兵　指揮官：${CHARS[u.cmd].pilot}（2 格內獲得加成）</div>`:''}
  ${(u.partNames&&u.partNames.length)||(u.pskNames&&u.pskNames.length)?`<div class="chips">${(u.partNames||[]).map(n=>`<span class="chip pt">${n}</span>`).join('')}${(u.pskNames||[]).map(n=>`<span class="chip sk">${n}</span>`).join('')}</div>`:''}
  ${(chips||sks)?`<div class="chips">${chips}${sks}</div>`:''}
  <table class="wt"><thead><tr><th>武器</th><th>威力</th><th>射程</th><th>命中</th><th>消耗</th></tr></thead><tbody>
  ${u.weapons.map(w=>`<tr><td>${w.name}${!w.post?'<span class="tag">P✕</span>':''}</td><td>${fmt(w.pow)}</td><td>${w.min===wMax(u,w)?w.min:w.min+'–'+wMax(u,w)}</td><td>${w.hit>=0?'+':''}${w.hit}</td><td>${[w.en?'EN'+w.en:'',w.ammo!=null?w.left+'/'+w.ammo+'發':'',w.will?'氣'+w.will:''].filter(Boolean).join(' ')||'—'}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function renderLegend(){
  const spr=typeof gfxActive==='function'&&gfxActive();
  $('#legend').innerHTML=Object.values(TERRAIN).map(t=>`<span>${spr?`<img class="swimg" src="${tileURL(t.k)}" alt="">`:`<span class="sw t-${t.k}"><span class="tg" style="font-size:12px">${t.g}</span></span>`}${t.name}<span class="num">${t.block?'不可通行':`移${t.cost}${t.def?` 防+${t.def*100}%`:''}${t.eva?` 閃${t.eva>0?'+':''}${t.eva}`:''}${t.heal?' 回復':''}`}</span></span>`).join('')
   +`<span><span class="sw" style="background:var(--pbg);color:var(--p);font-family:var(--serif);font-weight:900">我</span>我方</span><span><span class="sw" style="background:var(--ebg);color:var(--e);font-family:var(--serif);font-weight:900">敵</span>敵方</span><span><span class="sw t-plain exit"></span>脫離／佔領點</span>${spr&&typeof iconURL==='function'&&iconURL('chest')?`<span><img class="swimg" src="${iconURL('chest')}" alt="">寶箱</span>`:'<span><span class="sw" style="color:var(--amber)">寶</span>寶箱</span>'}`;
}
function showTerrain(x,y){
  const t=terrAt(x,y);
  $('#terrain').innerHTML=`<b>${t.name}（${t.g}）</b>　座標 ${x},${y}　${t.block?'無法通行':`移動消耗 ${t.cost} · 防禦 +${Math.round(t.def*100)}% · 迴避 ${t.eva>=0?'+':''}${t.eva}${t.heal?' · 回合開始回復 10% HP/EN':''}`}`;
}
function log(t,cls=''){
  const li=document.createElement('li'); li.textContent=t; if(cls) li.className=cls;
  const ol=$('#log'); ol.prepend(li); while(ol.children.length>150) ol.lastChild.remove();
}
function clearLog(){$('#log').innerHTML='';}

// =====================================================================
// 對話框與劇情
// =====================================================================
function ask(html,cls=''){
  return new Promise(res=>{
    const box=$('#mbox'); box.className='mbox '+cls; box.innerHTML=html; $('#modal').hidden=false; box.scrollTop=0;
    box.onclick=e=>{const b=e.target.closest('[data-v]'); if(!b||b.disabled) return; box.onclick=null; $('#modal').hidden=true; res(b.dataset.v);};
    const f=box.querySelector('.btn.pri:not(:disabled)')||box.querySelector('.btn:not(:disabled)'); if(f) f.focus({preventScroll:true});
  });
}
async function banner(text,side){
  const b=$('#banner'); b.className='banner '+side; b.textContent=text; b.hidden=false; sfx(side==='E'?'phaseE':'phaseP');
  b.style.animation='none'; void b.offsetWidth; b.style.animation='';
  await wait(G.anim&&!G.fast?900:250); b.hidden=true;
}
function resolveLines(lines){
  const out=[];
  for(const l of (lines||[])){
    if(Array.isArray(l)) out.push(l);
    else if(l&&l.if!=null){ if(G.flags[l.if]) out.push(l.line); }
    else if(l&&l.ifnot!=null){ if(!G.flags[l.ifnot]) out.push(l.line); }
  }
  return out;
}
function speakerSide(k){
  if(G.roster.some(m=>m.cid===k)) return 'P';
  if(G.units.some(u=>u.cid===k&&u.side==='P')) return 'P';
  return (SPEAKERS[k]&&SPEAKERS[k].side)||'N';
}
function playScene(lines){
  const ls=resolveLines(lines); if(!ls.length) return Promise.resolve();
  return new Promise(res=>{
    const sc=$('#scene'); let i=0;
    const show=()=>{
      const [k,t]=ls[i];
      if(!k){ sc.innerHTML=`<div class="sbox narr"><div class="stext">${t}</div><div class="snext">▼</div></div>`; }
      else { const s=SPEAKERS[k]||{name:k,ch:'？'}; const side=speakerSide(k);
        sc.innerHTML=`<div class="sbox"><div class="sg ${side}${iconKey(k)?' hasicon':''}">${face(k,s.ch)}</div><div><div class="sname ${side}">${s.name}</div><div class="stext">${t}</div></div><div class="snext">▼</div></div>`; }
      sc.insertAdjacentHTML('beforeend',`<div class="sctrl"><span>${i+1} / ${ls.length}</span><button class="btn" id="sceneSkip">跳過劇情</button></div>`);
      $('#sceneSkip').onclick=e=>{e.stopPropagation();done();};
    };
    const next=()=>{ i++; if(i>=ls.length) done(); else { sfx('talk'); show(); } };
    const done=()=>{ sc.hidden=true; sc.onclick=null; document.removeEventListener('keydown',kd); res(); };
    const kd=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();next();} else if(e.key==='Escape') done(); };
    sc.onclick=next; document.addEventListener('keydown',kd);
    sc.hidden=false; show();
  });
}

// =====================================================================
// 戰鬥
// =====================================================================
function strike(a,w,d,react,seq){
  const hr=hitRate(a,w,d,react);
  if(w.en) a.en-=w.en; if(w.ammo!=null) w.left--;
  const before=d.hp; let hit=false,dmg=0,crit=false,note='';
  if(d.st.dodge){d.st.dodge=false;note='閃避發動';}
  else hit=Math.random()*100<hr;
  if(hit){
    dmg=Math.round(calcDmg(a,w,d,react)*(0.9+Math.random()*0.2));
    if(Math.random()<0.08+sk(a,'crit')/100){crit=true;dmg=Math.round(dmg*1.25);}
    a.st.valor=false; a.st.soul=false; d.hp=Math.max(0,d.hp-dmg); addWill(a,3); addWill(d,2);
    if(G.pstat){ if(d.side==='P') G.pstat.taken+=dmg; else G.pstat.dealt+=dmg; }
    if(d.hp===0){ addWill(a,5+sk(a,'killWill')); if(a.side==='P'&&d.side==='E'){ const g=goldFor(d); G.gold=(G.gold||0)+g; G.goldGain=(G.goldGain||0)+g; } }
    gainExp(a,expFor(a,d,d.hp===0));
  } else addWill(d,3);
  const tag=react==='guard'?'（防禦）':react==='evade'?'（迴避）':'';
  log(`${a.ch}${a.name}【${w.name}】→ ${d.ch}${d.name}${tag}：${hit?(crit?'會心一擊！':'命中，')+fmt(dmg)+' 傷害':(note||'未命中')}${d.hp===0?'，擊墜！':''}`, hit&&a.side!=='P'?'bad':'');
  seq.push({a,d,w,hit,dmg,crit,before,after:d.hp,note});
}
async function doBattle(att,w,def,react,cw,sup){
  const hp0={[att.uid]:att.hp,[def.uid]:def.hp};
  let line='';
  if(att.lines.length&&Math.random()<0.75){ line=`${att.pilot}：「${pick(att.lines)}」`; log(line,att.side==='P'?'q':'eq'); }
  const seq=[]; G.lvUps=[];
  const first=react==='counter'&&cw&&def.skills.counterFirst;
  if(first){ log(`${def.pilot} 的先制反擊！`,'sys'); strike(def,cw,att,null,seq); if(att.hp>0) strike(att,w,def,react,seq); }
  else { strike(att,w,def,react,seq); if(def.hp>0&&att.hp>0&&react==='counter'&&cw) strike(def,cw,att,null,seq); }
  if(sup&&def.hp>0&&sup.u.hp>0){ log(`${sup.u.pilot} 援護攻擊！`,'sys'); sup.u.supA--; strike(sup.u,sup.w,def,null,seq); }
  const animated=G.anim&&!(G.fast&&att.side==='E');
  await playBattle(att,def,seq,hp0,line);
  if(!animated){ sfx(seq.some(x=>x.after===0&&x.hit)?'boom':seq.some(x=>x.crit)?'crit':seq.some(x=>x.hit)?'hit':'miss'); if(G.lvUps.length) setTimeout(()=>sfx('levelup'),250); }
  if(typeof mapFx==='function') seq.forEach((x,i)=>mapFx(x.d.x,x.d.y,x.hit?fmt(x.dmg):(x.note||'MISS'),x.hit?(x.crit?'#ffd25a':'#ffffff'):'#c8d0d8',{delay:i*160,big:x.crit}));
  render();
}
async function playBattle(L,R,seq,hp0,line){
  if(!G.anim||(G.fast&&L.side==='E')) return;
  if(!G.classic&&typeof playBattleScene==='function'&&typeof requestAnimationFrame!=='undefined') return playBattleScene(L,R,seq,hp0,line);
  G.skip=false;
  const ov=$('#battle');
  const side=(u,cls)=>`<div class="bt-side ${u.side}" id="bt-${cls}"><div class="bt-g${iconKey(u)?' hasicon':''}">${face(u,u.ch)}</div><div class="bt-name">${u.name}｜${u.pilot}<br>${CLS(u.cls).name} Lv${u.lv}</div><div class="bar hp"><i style="width:${hp0[u.uid]/u.maxHp*100}%"></i></div><div class="bt-hp">${fmt(hp0[u.uid])} / ${fmt(u.maxHp)}</div></div>`;
  ov.innerHTML=`<div class="bt"><div class="bt-row">${side(L,'L')}<div class="bt-mid"><div class="bt-w" id="bt-w"></div><div class="bt-arrow" id="bt-arrow"><i></i></div><div class="bt-res" id="bt-res"></div></div>${side(R,'R')}</div><div class="bt-line" id="bt-line">${line}</div><div class="bt-skip">點擊畫面跳過</div></div>`;
  ov.hidden=false; ov.onclick=skipAll;
  await sleep(350);
  for(const s of seq){
    const fromL=s.a===L||(s.a!==R&&s.a.side===L.side), tgt=fromL?'#bt-R':'#bt-L';
    $('#bt-w').textContent=`${s.a.ch}【${s.w.name}】`;
    const ar=$('#bt-arrow'); ar.className='bt-arrow'; void ar.offsetWidth; ar.className='bt-arrow '+(fromL?'ltr':'rtl');
    sfx('fire');
    const res=$('#bt-res'); res.textContent=''; res.className='bt-res';
    await sleep(480);
    if(s.hit){
      res.textContent=(s.crit?'會心！ ':'')+'−'+fmt(s.dmg); res.className='bt-res '+(s.crit?'crit':'hit'); sfx(s.crit?'crit':'hit');
      const t=$(tgt); t.querySelector('.bar i').style.width=(s.after/s.d.maxHp*100)+'%';
      t.querySelector('.bt-hp').textContent=`${fmt(s.after)} / ${fmt(s.d.maxHp)}`;
      const g=t.querySelector('.bt-g'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
      if(s.after===0){ await sleep(300); g.classList.add('down'); res.textContent='擊墜！'; sfx('boom'); }
    } else { res.textContent=s.note||'MISS'; res.className='bt-res miss'; sfx('miss'); }
    await sleep(750);
  }
  if(G.lvUps.length){ $('#bt-line').innerHTML=`<span class="lvtxt">▲ LEVEL UP　${G.lvUps.join('　')}</span>`; sfx('levelup'); await sleep(900); }
  await sleep(200);
  ov.hidden=true; ov.onclick=null; G.skip=false; G.sleepers.length=0;
}
async function afterCombat(){
  // 頭目第二形態
  for(const u of G.units.filter(u=>u.hp<=0&&u.phase2&&!u.phased)){
    const ph=u.phase2; u.phased=true;
    if(typeof mapFx==='function') mapFx(u.x,u.y,'覺醒！','#ff6a3a',{big:true,dur:1600});
    sfx('cutin'); render(); await playScene(ph.lines||[['',`${u.name} 的形態改變了！`]]);
    u.maxHp=Math.round(u.maxHp*(ph.hp||.6)); u.hp=u.maxHp; u.atk+=ph.atk||8; u.def+=ph.def||0; u.en=u.maxEn; u.will=150;
    if(ph.name) u.name=ph.name; if(ph.ch) u.ch=ph.ch;
    log(`${u.pilot} 進入第二形態！`,'bad');
  }
  // 陣亡
  for(const u of G.units) if(u.hp<=0&&!u.dead){u.dead=true; if(u.cls==='bwall'&&G.map[u.y]) G.map[u.y][u.x]='r'; if(typeof mapBoom==='function') mapBoom(u.x,u.y); log(`${u.ch}${u.name} 被擊墜！`,u.side==='P'?'bad':'good'); if(G.pstat){ if(u.side==='P') G.pstat.lost++; else G.pstat.kills++; }}
  G.units=G.units.filter(u=>!u.dead);
  // 撤退
  for(const e of G.units.filter(u=>u.side==='E'&&u.retreat&&u.hp<=u.maxHp*u.retreat)){
    render(); await playScene(e.retreatLines||[['',`${e.pilot} 撤退了。`]]);
    log(`${e.ch}${e.name} 撤退了。`,'sys'); e.dead=true;
  }
  G.units=G.units.filter(u=>!u.dead);
  for(const u of G.units.filter(u=>u.merc&&!G.units.some(c=>c.cid===u.cmd&&!c.merc&&c.side==='P'))){ u.dead=true; log(`${u.name}（${u.pilot}）失去指揮官，撤退了。`,'bad'); }
  G.units=G.units.filter(u=>!u.dead);
  if(G.inspect&&!G.units.includes(G.inspect)) G.inspect=null;
  if(G.threatOne&&!G.units.includes(G.threatOne)) G.threatOne=null;
  render();
  return await checkEnd();
}
async function checkEnd(){
  if(G.over) return true;
  const ch=CH();
  if(!G.units.some(u=>u.cid==='gang'&&u.side==='P')){ lose('剛鐵號被擊墜，銘甲隊被迫撤退。'); return true; }
  for(const p of (ch.protect||[])) if(!G.units.some(u=>u.cid===p)){ lose(`${GUESTS[p]?GUESTS[p].pilot:p} 被擊墜了。`); return true; }
  const es=G.units.filter(u=>u.side==='E'&&!(u.obj&&!u.weapons.length));
  const w=ch.win;
  if(w.type==='destroy'&&!G.units.some(u=>u.side==='E'&&u.tag===w.target)){ win(); return true; }
  if(w.type==='capture'&&G.units.some(u=>u.side==='P'&&!u.merc&&w.cells.some(([x,y])=>u.x===x&&u.y===y))){ win(); return true; }
  if(w.type==='boss'&&G.seenTags.has(w.target)&&!es.some(u=>u.tag===w.target)){ win(); return true; }
  if(w.type==='escape'){ const g=G.units.find(u=>u.cid===(w.who||'gang')); if(g&&w.cells.some(([x,y])=>g.x===x&&g.y===y)){ win(); return true; } }
  if(es.length===0&&w.type!=='survive'&&w.type!=='escape'){
    const pend=(ch.events||[]).filter((e,i)=>!G.firedEvents.has(i)&&e.spawn&&e.spawn.length);
    if(pend.length){ // 還有增援：提前觸發
      for(const e of pend){ await fireEvent(e,(ch.events||[]).indexOf(e)); }
      render(); return false;
    }
    win(); return true;
  }
  if(es.length===0&&w.type==='survive'){ win(); return true; }
  return false;
}
async function fireEvent(ev,i){
  G.firedEvents.add(i);
  render(); await playScene(ev.lines||[]);
  for(const d of (ev.spawn||[])){
    let {x,y}=d; if(unitAt(x,y)||terrAt(x,y).block){ const f=freeNear(x,y); if(!f) continue; x=f.x;y=f.y; }
    G.units.push(mkEnemy({...d,x,y}));
  }
  if(ev.spawn&&ev.spawn.length) log(`敵方增援出現！（${ev.spawn.length} 機）`,'sys');
  render();
}
function freeNear(x,y){
  for(let r=1;r<6;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ const nx=x+dx,ny=y+dy;
    if(inMap(nx,ny)&&!terrAt(nx,ny).block&&!unitAt(nx,ny)) return {x:nx,y:ny}; }
  return null;
}

// =====================================================================
// 我方操作
// =====================================================================
function selectUnit(u){sfx('select');G.menuOpen=false;G.sel=u;G.mode='unit';G.origin={x:u.x,y:u.y};G.reach=reachable(u);G.inspect=null;G.threatOne=null;render();}
async function animateMove(u,reach,x,y){
  const path=pathTo(reach,x,y);
  if(u.side==='P'&&path.length>1) sfx('move');
  for(const p of path.slice(1)){u.x=p.x;u.y=p.y;renderMap(); await wait(G.anim?60:0);}
}
function quickPlan(s,t){
  const ox=s.x, oy=s.y;
  const cells=s.moved?[{x:s.x,y:s.y,c:0}]:[...G.reach.values()].filter(v=>v.stop);
  let best=null;
  for(const v of cells){ const moved=s.moved||!(v.x===G.origin.x&&v.y===G.origin.y); s.x=v.x; s.y=v.y; const d=dist(s,t);
    for(const w of weaponsOf(s)){ if(whyNot(s,w,d,moved)) continue;
      const r=aiReact(t,s,d), hr=hitRate(s,w,t,r.react)/100, dm=calcDmg(s,w,t,r.react);
      let sc=hr*Math.min(dm,t.hp)+(dm>=t.hp?1500*hr:0)-(v.c||0)*3-(w.en||0)*2-(w.combo?300:0)+(s.fly?0:terrAt(v.x,v.y).def*300);
      if(r.cw) sc-=0.5*hitRate(t,r.cw,s,null)/100*calcDmg(t,r.cw,s,null);
      if(!best||sc>best.sc) best={sc,v,w};
    }}
  s.x=ox; s.y=oy; return best;
}
async function quickAttack(s,t,plan){
  if(!(plan.v.x===s.x&&plan.v.y===s.y)){ G.busy=true; await animateMove(s,G.reach,plan.v.x,plan.v.y); s.moved=true; G.busy=false; }
  G.menuOpen=true; G.mode='unit'; render();
  await confirmAttack(s,plan.w,t);
}
function nextUnit(){
  const list=G.units.filter(u=>u.side==='P'&&!u.acted);
  if(!list.length) return;
  if(G.sel&&G.sel.moved) return;
  const i=G.sel?list.indexOf(G.sel):-1, u=list[(i+1)%list.length];
  selectUnit(u);
  const cell=document.querySelector(`.c[data-x="${u.x}"][data-y="${u.y}"]`); if(cell&&cell.scrollIntoView) cell.scrollIntoView({block:'nearest',inline:'nearest'});
}
async function onCell(x,y){
  showTerrain(x,y);
  if(G.over||G.phase!=='P'||G.busy) return;
  const u=unitAt(x,y), s=G.sel;
  if(G.mode==='idle'){
    if(u&&u.side==='P'&&!u.acted) selectUnit(u);
    else if(u){G.inspect=u;G.threatOne=u.side==='E'?(G.threatOne===u?null:u):null;render();}
    else {G.inspect=null;G.threatOne=null;render();}
    return;
  }
  if(G.mode==='unit'||G.mode==='weapon'){
    if(u===s){ G.mode='unit'; G.menuOpen=s.moved?true:!G.menuOpen; render(); return; }
    if(u&&u.side==='E'){
      if(u.talk&&u.talk.by.includes(s.cid)&&dist(u,s)===1){ await doTalk(s,u); return; }
      const plan=quickPlan(s,u);
      if(plan){ await quickAttack(s,u,plan); return; }
      G.inspect=u; renderInfo(); return;
    }
    const v=G.reach&&G.reach.get(key(x,y));
    if(!s.moved&&v&&v.stop&&!(x===s.x&&y===s.y)){
      G.busy=true; await animateMove(s,G.reach,x,y); s.moved=true; G.busy=false; G.menuOpen=true; G.mode='unit'; render();
      if(CH().win.type==='escape'||CH().win.type==='capture') await checkEnd();
      return;
    }
    if(u&&u.side==='P'&&!u.acted&&u!==s&&!s.moved){selectUnit(u);return;}
    if(u){G.inspect=u;renderInfo();return;}
    if(!s.moved){ cancel(); return; }   // 點空白處：取消選取
    return;
  }
  if(G.mode==='target'){
    if(u&&G.targets.includes(u)) await confirmAttack(s,G.weapon,u);
    else if(u){G.inspect=u;renderInfo();}
    return;
  }
  if(G.mode==='repair'&&u&&G.targets.includes(u)){
    const amt=Math.min(u.maxHp-u.hp,Math.round(u.maxHp*s.skills.heal.pct/100)); u.hp+=amt; addWill(s,2);
    log(`${s.ch}${s.name} 修理 ${u.ch}${u.name}，回復 ${fmt(amt)} HP。`,'good'); sfx('heal'); if(typeof mapFx==='function') mapFx(u.x,u.y,'+'+fmt(amt),'#6fe08c'); G.lvUps=[]; gainExp(s,EXP.repair); finishUnit(s); return;
  }
  if(G.mode==='talk'&&u&&G.targets.includes(u)){ await doTalk(s,u); return; }
}
async function doTalk(s,e){
  G.busy=true; renderHeader();
  await playScene(e.talk.lines);
  const t=e.talk;
  if(t.flag) G.flags[t.flag]=true;
  e.dead=true; G.units=G.units.filter(u=>u!==e);
  if(t.join){
    const m=joinChar(t.join);
    if(m){ const nu=mkPlayerUnit(m,e.x,e.y); nu.acted=true; nu.hp=Math.max(1,Math.round(nu.maxHp*Math.max(.3,e.hp/e.maxHp))); G.units.push(nu); log(`${nu.pilot} 加入了銘甲隊！`,'good'); sfx('join'); }
  }
  G.busy=false;
  if(await checkEnd()) return;
  finishUnit(s);
}
async function onAction(a){
  const s=G.sel; if(!s||G.busy) return;
  if(a==='attack'){G.mode='weapon';render();}
  else if(a==='repair'){G.targets=repairTargets(s);G.mode='repair';render();}
  else if(a==='talk'){G.targets=talkTargets(s);G.mode='talk';render();}
  else if(a==='spirit'){await spiritMenu(s);}
  else if(a==='item'){await itemMenu(s);}
  else if(a==='wait'){finishUnit(s);}
  else if(a==='cancel'||a==='back'){cancel();}
}
function cancel(){
  const s=G.sel; if(!s||G.busy||G.phase!=='P') return;
  sfx('cancel');
  if(['target','weapon','repair','talk'].includes(G.mode)){ G.mode=G.mode==='target'?'weapon':'unit'; G.weapon=null; G.targets=[]; render(); return; }
  if(s.moved){s.x=G.origin.x;s.y=G.origin.y;s.moved=false;G.menuOpen=false;G.reach=reachable(s);render();return;}
  if(G.menuOpen){ G.menuOpen=false; render(); return; }
  G.sel=null;G.mode='idle';G.reach=null;render();
}
function pickWeapon(i){ const s=G.sel,w=weaponsOf(s)[i]; G.weapon=w; G.targets=targetsFor(s,w); G.mode='target'; render(); }
const spCost=(u,n)=>Math.round(SPIRITS[n].cost*(u.focusSk?0.8:1));
async function itemMenu(s){
  const v=await ask(`<h2>道具</h2><p style="color:var(--mute)">${s.pilot}　HP ${fmt(s.hp)}/${fmt(s.maxHp)}　EN ${s.en}/${s.maxEn}　·　每台每回合可用一次，不消耗行動</p>
    <div class="spl">${Object.entries(ITEMS).map(([k,it])=>`<button class="btn" data-v="${k}" ${(G.inv[k]||0)>0?'':'disabled'}><b>${it.name}</b><span class="cost">×${G.inv[k]||0}</span><span class="d">${it.desc}</span></button>`).join('')}</div>
    <div class="foot"><button class="btn" data-v="">關閉</button></div>`);
  if(!v) return;
  G.inv[v]--; s.itemUsed=true;
  sfx('heal');
  if(v==='kit'){ const h=Math.min(s.maxHp-s.hp,Math.round(s.maxHp*.5)); s.hp+=h; if(typeof mapFx==='function') mapFx(s.x,s.y,'+'+fmt(h),'#6fe08c'); log(`${s.pilot} 使用修理套件，HP +${fmt(h)}。`,'good'); }
  if(v==='ecell'){ const e=Math.min(s.maxEn-s.en,80); s.en+=e; log(`${s.pilot} 使用能源補給，EN +${e}。`,'good'); }
  render();
}
async function spiritMenu(s){
  const list=s.spirits.map(n=>{const sp=SPIRITS[n]; const active=sp.flag&&s.st[sp.flag];
    const dis=s.sp<spCost(s,n)||active||(n==='氣合'&&s.will>=150)||(n==='根性'&&s.hp>=s.maxHp)||(n==='加速'&&s.moved);
    return `<button class="btn" data-v="${n}" ${dis?'disabled':''}><b>${n}</b><span class="cost">SP ${spCost(s,n)}</span><span class="d">${active?'（已發動）':sp.desc}</span></button>`;}).join('');
  const v=await ask(`<h2>精神指令</h2><p style="color:var(--mute)">${s.pilot}　SP ${s.sp} / ${s.maxSp}　·　使用精神不會消耗行動</p><div class="spl">${list}</div><div class="foot"><button class="btn" data-v="">關閉</button></div>`);
  if(!v) return;
  const sp=SPIRITS[v]; s.sp-=spCost(s,v);
  if(sp.flag) s.st[sp.flag]=true;
  if(v==='氣合') addWill(s,10);
  if(v==='激勵') G.units.filter(u=>u.side==='P').forEach(u=>addWill(u,5));
  if(v==='根性') s.hp=Math.min(s.maxHp,s.hp+Math.round(s.maxHp*.3));
  if(v==='加速'&&G.sel===s&&!s.moved) G.reach=reachable(s);
  log(`${s.pilot} 使用精神「${v}」。`,'sys'); sfx(v==='根性'?'heal':'spirit'); render();
}
function bestSupporter(s,t){
  let best=null;
  for(const o of G.units){ if(o===s||o.side!=='P'||o.hp<=0||!(o.supA>0)||dist(o,s)!==1||(s.combo&&o===s.combo)) continue;
    const w=bestWeapon(o,t,dist(o,t),false); if(!w) continue;
    const sc=hitRate(o,w,t,null)*calcDmg(o,w,t,null); if(!best||sc>best.sc) best={u:o,w,sc}; }
  return best;
}
async function confirmAttack(s,w,t){
  const d=dist(s,t);
  let v, sup, react, cw;
  for(;;){
  const usable=weaponsOf(s).filter(x=>!whyNot(s,x,d,s.moved));
  sup=w.combo?null:bestSupporter(s,t);
  ({react,cw}=aiReact(t,s,d));
  const h=hitRate(s,w,t,react), dm=calcDmg(s,w,t,react);
  let ch='—',cd='—';
  if(cw){ ch=hitRate(t,cw,s,null)+'%'; const cdd=calcDmg(t,cw,s,null); cd=fmt(cdd)+(cdd>=s.hp?'<span class="kill">可能被擊墜</span>':''); }
  const first=cw&&t.skills.counterFirst;
  v=await ask(`<h2>攻擊確認</h2>
   ${usable.length>1?`<div class="wswitch">${usable.map((x,i)=>`<button class="btn${x===w?' on':''}" data-v="w:${i}">${x.name}<small>${fmt(calcDmg(s,x,t,react))}・${hitRate(s,x,t,react)}%</small></button>`).join('')}</div>`:''}
   <div class="vs">
    <div class="P"><div class="who"><span class="g">${s.ch}</span><div><b>${s.name}</b><br><small style="color:var(--mute)">【${w.name}】</small></div></div>
      <dl><dt>命中率</dt><dd>${h}%</dd><dt>預估傷害</dt><dd>${fmt(dm)}${dm>=t.hp?'<span class="kill">可擊墜</span>':''}</dd><dt>目標 HP</dt><dd>${fmt(t.hp)}</dd></dl></div>
    <div class="E"><div class="who"><span class="g">${t.ch}</span><div><b>${t.name}</b> <small style="color:var(--mute)">Lv${t.lv}</small><br><small style="color:var(--mute)">${cw?`${first?'先制':''}反擊【${cw.name}】`:'無法反擊 → 防禦'}</small></div></div>
      <dl><dt>命中率</dt><dd>${ch}</dd><dt>預估傷害</dt><dd>${cd}</dd><dt>地形</dt><dd>${terrAt(t.x,t.y).name}${t.fly?'（飛行）':''}</dd></dl></div>
   </div>
   ${s.st.soul?'<p style="margin-top:10px;color:var(--amber)">魂發動中：本次傷害 ×2.5</p>':s.st.valor?'<p style="margin-top:10px;color:var(--amber)">熱血發動中：本次傷害 ×2</p>':''}
   ${t.talk&&t.talk.by.includes(s.cid)?'<p style="margin-top:10px;color:var(--good)">這台敵機可以被說服。移動到相鄰格並選擇「說服」吧。</p>':''}
   ${w.combo?`<p style="margin-top:10px;color:var(--amber)">合體攻擊：${w.combo.pilot}也會消耗 EN ${w.en} 並結束行動。</p>`:''}
   ${sup?`<label class="supline"><input type="checkbox" id="supOn" checked> 援護攻擊：${sup.u.ch} ${sup.u.pilot}【${sup.w.name}】 命中 ${hitRate(sup.u,sup.w,t,null)}% · 預估 ${fmt(calcDmg(sup.u,sup.w,t,null))}（剩 ${sup.u.supA} 次）</label>`:''}
   <div class="foot"><button class="btn" data-v="no">返回</button><button class="btn pri" data-v="yes">確認攻擊</button></div>`);
  if(v&&v.startsWith('w:')){ w=usable[+v.slice(2)]; continue; }
  break;
  }
  if(v!=='yes'){ G.menuOpen=true; render(); return; }
  const useSup=sup&&$('#supOn')&&$('#supOn').checked?sup:null;
  G.busy=true; renderHeader();
  await doBattle(s,w,t,react,cw,useSup);
  if(w.combo){ const p=w.combo; p.en=Math.max(0,p.en-w.en); p.acted=true; log(`${p.pilot} 參與合體攻擊，結束行動。`,'sys'); }
  G.busy=false;
  if(await afterCombat()) return;
  if(s.hp>0&&G.units.includes(s)) finishUnit(s); else {G.sel=null;G.mode='idle';render();autoEndCheck();}
}
// ---------------- 寶箱 ----------------
const CHEST_POOL=[
  [['gold',400],['kit'],['ecell'],['armor1'],['hp1'],['cell'],['gold',600]],
  [['gold',900],['kit'],['scope'],['chip'],['armor1'],['hp1'],['gold',1200]],
  [['gold',1600],['boost'],['mind'],['armor2'],['radar'],['kit'],['gold',2000]],
];
function makeChests(ch){
  if(ch.chests) return ch.chests.map(c=>({...c,taken:false}));
  const r=rng([...(G.chapterId||'x')].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7)), n=ch.no<=2?1:2, out=[];
  const pool=CHEST_POOL[ch.no<=4?0:ch.no<=9?1:2];
  const occ=(x,y)=>G.units.some(u=>u.x===x&&u.y===y)||ch.deploy.some(([a,b])=>a===x&&b===y);
  for(let tries=0;out.length<n&&tries<400;tries++){
    const x=Math.floor(G.W*.3+r()*G.W*.45), y=Math.floor(r()*G.H), t=terrAt(x,y);
    if(t.block||t.k==='water'||occ(x,y)||out.some(c=>Math.abs(c.x-x)+Math.abs(c.y-y)<4)) continue;
    const it=pool[Math.floor(r()*pool.length)]; out.push({x,y,k:it[0],n:it[1]||1,taken:false});
  }
  return out;
}
function chestAt(x,y){ return (G.chests||[]).find(c=>!c.taken&&c.x===x&&c.y===y); }
function chestName(c){ return c.k==='gold'?`${fmt(c.n)} G`:(ITEMS[c.k]||PARTS[c.k]||{name:c.k}).name; }
function openChest(u){
  const c=chestAt(u.x,u.y); if(!c) return;
  c.taken=true;
  if(c.k==='gold') G.gold=(G.gold||0)+c.n; else { G.inv=G.inv||{}; G.inv[c.k]=(G.inv[c.k]||0)+c.n; }
  log(`${u.pilot} 打開了寶箱：獲得 ${chestName(c)}！`,'good'); sfx('buy');
  if(typeof mapFx==='function') mapFx(u.x,u.y,chestName(c),'#ffd25a',{dur:1500});
}
function finishUnit(u){
  if(u.side==='P') openChest(u);
  if(u.st.again&&!G.over){ u.st.again=false; u.moved=false; u.acted=false; log(`${u.pilot}「再動」！可以再行動一次。`,'sys'); G.sel=null;G.mode='idle';G.reach=null;G.targets=[];render(); return; }
  u.acted=true;u.moved=false;G.sel=null;G.mode='idle';G.weapon=null;G.targets=[];G.reach=null;render();autoEndCheck();
}
function autoEndCheck(){
  if(G.over||G.phase!=='P') return;
  if(G.units.filter(u=>u.side==='P').every(u=>u.acted)) setTimeout(()=>{if(G.phase==='P'&&!G.busy&&!G.over) endPlayerPhase();},400);
}

// =====================================================================
// 回合流程
// =====================================================================
function phaseUpkeep(side){
  for(const u of G.units.filter(u=>u.side===side)){
    const t=terrAt(u.x,u.y); let h=0,e=0;
    if(t.heal){ h+=Math.round(u.maxHp*.1); e+=Math.round(u.maxEn*.1); }
    if(u.skills.regen) h+=Math.round(u.maxHp*u.skills.regen/100);
    h=Math.min(u.maxHp-u.hp,h); e=Math.min(u.maxEn-u.en,e);
    if(h||e){u.hp+=h;u.en+=e; if(side==='P'||u.boss) log(`${u.ch}${u.name} 回復 HP +${fmt(h)}${e?`、EN +${e}`:''}。`,side==='P'?'good':'');}
    if(u.skills.spRegen&&u.maxSp) u.sp=Math.min(u.maxSp,u.sp+u.skills.spRegen);
  }
}
async function runEvents(phase){
  const evs=CH().events||[];
  for(let i=0;i<evs.length;i++){ const e=evs[i]; if(G.firedEvents.has(i)) continue;
    if(e.turn===G.turn&&(e.phase||'P')===phase) await fireEvent(e,i); }
}
async function startPlayerPhase(){
  const ch=CH();
  G.phase='P';G.mode='idle';G.sel=null;G.inspect=null;
  if(ch.win.type==='survive'&&G.turn>ch.win.turns){ win(); return; }
  if(ch.turnLimit&&G.turn>ch.turnLimit){ lose('超過回合限制。'); return; }
  for(const u of G.units.filter(u=>u.side==='P')){u.acted=false;u.moved=false;['sure','focus','wall','accel','snipe'].forEach(k=>u.st[k]=false);u.en=Math.min(u.maxEn,u.en+10);u.supA=u.supA0||0;u.supD=u.supD0||0;u.itemUsed=false;}
  phaseUpkeep('P');
  if(G.pstat&&G.turn>1){ const p=G.pstat; log(`── 敵方回合結果：我方受到 ${fmt(p.taken)} 傷害${p.lost?`、被擊墜 ${p.lost} 台`:''}；反擊造成 ${fmt(p.dealt)} 傷害${p.kills?`、擊墜 ${p.kills} 台`:''}。`,'sys'); }
  G.pstat=null;
  G.busy=true; render();
  if(typeof battleBgm==='function') battleBgm('P');
  await banner(`第 ${G.turn} 回合　我方`, 'P');
  await runEvents('P');
  G.busy=false;
  G.turnSnap=turnSnapshot();
  render();
  await checkEnd();
}
async function endPlayerPhase(){
  if(G.phase!=='P'||G.busy||G.over) return;
  G.phase='E';G.sel=null;G.mode='idle';G.inspect=null;G.busy=true;render();
  if(typeof battleBgm==='function') battleBgm('E');
  await banner('敵方回合','E');
  G.pstat={taken:0,dealt:0,lost:0,kills:0};
  phaseUpkeep('E');
  await runEvents('E');
  const ps=()=>G.units.filter(u=>u.side==='P');
  const near=e=>Math.min(...ps().map(p=>dist(e,p)));
  const order=G.units.filter(u=>u.side==='E').sort((a,b)=>near(a)-near(b));
  for(const e of order){ if(G.over) return; if(e.dead||!G.units.includes(e)) continue; await enemyAct(e); if(G.over) return; }
  G.busy=false; G.turn++; await startPlayerPhase();
}
function playerThreat(){
  const sig=G.turn+'|'+G.units.filter(u=>u.side==='P').map(u=>u.uid+':'+u.x+','+u.y).join(';');
  if(G._ptSig===sig&&G._pt) return G._pt;
  const m=new Map();
  for(const p of G.units.filter(u=>u.side==='P')) for(const k of threatCells(p)) m.set(k,(m.get(k)||0)+1);
  G._pt=m; G._ptSig=sig; return m;
}
function aiPlan(e){
  const reach=reachable(e); let best=null;
  const ps=G.units.filter(u=>u.side==='P');
  const protect=CH().protect||[];
  const pt=playerThreat();
  const low=!e.boss&&e.hp<e.maxHp*0.3;
  const ox=e.x, oy=e.y;
  for(const v of reach.values()){ if(!v.stop) continue; const moved=!(v.x===ox&&v.y===oy);
    const tb=e.fly?0:TERRAIN[G.map[v.y][v.x]].def;
    const danger=pt.get(key(v.x,v.y))||0;
    e.x=v.x; e.y=v.y;   // 暫時站到候選位置，計算地形與反擊
    for(const t of ps){ const d=Math.abs(v.x-t.x)+Math.abs(v.y-t.y);
      for(const w of e.weapons){ if(whyNot(e,w,d,moved)) continue;
        const hr=hitRate(e,w,t,null)/100, dm=calcDmg(e,w,t,null), kill=dm>=t.hp;
        let sc=hr*Math.min(dm,t.hp)+(kill?2500*hr:0)+(1-t.hp/t.maxHp)*400+tb*600-(v.c*2)+(t.cid==='gang'?150:0)+(protect.includes(t.cid)?400:0);
        if(!kill||hr<0.9){ const cw=bestWeapon(t,e,d); if(cw){ const ce=hitRate(t,cw,e,null)/100*calcDmg(t,cw,e,null);
          sc-=ce*(e.boss?0.9:0.5); if(ce>=e.hp) sc-=2000; } }
        sc-=danger*(low?250:50);
        if(!best||sc>best.sc) best={sc,v,t,w,kill};
      }}}
  e.x=ox; e.y=oy;
  return {best,reach,low};
}
function retreatDest(e,reach){
  const pt=playerThreat(), ps=G.units.filter(u=>u.side==='P');
  let best=null;
  for(const v of reach.values()){ if(!v.stop) continue;
    const t=TERRAIN[G.map[v.y][v.x]];
    const near=Math.min(...ps.map(p=>Math.abs(p.x-v.x)+Math.abs(p.y-v.y)));
    const sc=-(pt.get(key(v.x,v.y))||0)*100+near*12+(t.heal?300:0)+(e.fly?0:t.def*200);
    if(!best||sc>best.sc) best={sc,v};
  }
  return best&&best.v;
}
function approachDest(e,reach){
  const INF=1e9, f=Array.from({length:G.H},()=>Array(G.W).fill(INF)); const pq=[];
  for(const p of G.units.filter(u=>u.side==='P')){f[p.y][p.x]=0;pq.push([0,p.x,p.y]);}
  while(pq.length){pq.sort((a,b)=>a[0]-b[0]);const [c,x,y]=pq.shift(); if(c>f[y][x]) continue;
    for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy; if(!inMap(nx,ny)) continue; const mc=moveCost(e,nx,ny); if(mc>=99) continue;
      if(c+mc<f[ny][nx]){f[ny][nx]=c+mc;pq.push([c+mc,nx,ny]);}}}
  let best=null; const pt=playerThreat();
  for(const v of reach.values()){ if(!v.stop) continue; const val=f[v.y][v.x]+(pt.get(key(v.x,v.y))||0)*1.5;
    if(!best||val<best.val||(val===best.val&&v.c<best.v.c)) best={val,v}; }
  if(!best||best.val>=f[e.y][e.x]+(pt.get(key(e.x,e.y))||0)*1.5) return null;
  return best.v;
}
async function enemyAct(e){
  if(e.obj&&!e.weapons.length) return;
  G.sel=e; G.inspect=e; render();
  const cell=document.querySelector(`.c[data-x="${e.x}"][data-y="${e.y}"]`); if(cell) cell.scrollIntoView({block:'nearest',inline:'nearest'});
  await wait(G.anim&&!G.fast?260:20);
  let {best,reach,low}=aiPlan(e);
  let dest;
  if(low&&e.ai!=='hold'&&!(best&&best.kill)){ best=null; dest=retreatDest(e,reach); }
  else dest=best?best.v:(e.ai==='hold'?null:approachDest(e,reach));
  if(dest&&!(dest.x===e.x&&dest.y===e.y)){ await animateMove(e,reach,dest.x,dest.y); e.moved=true; }
  if(best){
    const t=best.t, w=best.w, d=dist(e,t);
    G.inspect=t; render();
    let react,cw;
    let cover=null;
    if(G.autoCounter||t.st.dodge){ cw=bestWeapon(t,e,d); react=cw?'counter':'guard';
      if(!t.st.dodge&&calcDmg(e,w,t,null)>=t.hp){ const sd=bestDefender(e,w,t); if(sd&&sd.left>0){ cover=sd.u; react='guard'; cw=null; } } }
    else ({react,cw,cover}=await askReaction(e,w,t,d));
    if(cover){ cover.supD--; log(`${cover.pilot} 援護防禦！`,'sys'); await doBattle(e,w,cover,'guard',null); }
    else await doBattle(e,w,t,react,cw);
    if(await afterCombat()){e.moved=false;return;}
  }
  e.moved=false; G.sel=null; render();
  await wait(G.anim&&!G.fast?110:10);
}
function bestDefender(e,w,t){
  let best=null;
  for(const o of G.units){ if(o===t||o.side!=='P'||o.hp<=0||!(o.supD>0)||dist(o,t)!==1) continue;
    const dg=calcDmg(e,w,o,'guard'), left=o.hp-dg; if(!best||left>best.left) best={u:o,dg,left}; }
  return best;
}
async function askReaction(e,w,t,d){
  const cw=bestWeapon(t,e,d), sd=bestDefender(e,w,t);
  const h0=hitRate(e,w,t,null), d0=calcDmg(e,w,t,null), dg=calcDmg(e,w,t,'guard'), he=hitRate(e,w,t,'evade');
  const k=x=>x>=t.hp?' <span style="color:var(--bad)">（可能被擊墜）</span>':'';
  const first=cw&&t.skills.counterFirst;
  const v=await ask(`<h2>敵襲！</h2>
   <p><b style="color:var(--e)">${e.ch} ${e.name}</b> 以【${w.name}】攻擊 <b style="color:var(--p)">${t.ch} ${t.name}</b>（HP ${fmt(t.hp)}）</p>
   <div class="react">
    <button class="btn ${cw?'pri':''}" data-v="counter" ${cw?'':'disabled'}><b>${first?'先制反擊':'反擊'}</b>
      <small>${cw?`以【${cw.name}】${first?'搶先':''}反擊 · 我方命中 ${hitRate(t,cw,e,null)}% · 預估 ${fmt(calcDmg(t,cw,e,null))}`:'射程內沒有可用的武器'}</small>
      <small>敵命中 ${h0}% · 預估受傷 ${fmt(d0)}${k(d0)}</small></button>
    <button class="btn ${cw?'':'pri'}" data-v="guard"><b>防禦</b><small>受到的傷害減半 · 敵命中 ${h0}% · 預估受傷 ${fmt(dg)}${k(dg)}</small></button>
    <button class="btn" data-v="evade"><b>迴避</b><small>敵命中率減半 → ${he}% · 命中時受傷 ${fmt(d0)}${k(d0)}</small></button>
    ${sd?`<button class="btn" data-v="cover"><b>援護防禦：${sd.u.ch} ${sd.u.pilot} 代為承受</b><small>${sd.u.pilot}以防禦姿態承受（不反擊）· 預估受傷 ${fmt(sd.dg)}／HP ${fmt(sd.u.hp)}${sd.left<=0?' <span style="color:var(--bad)">（可能被擊墜）</span>':''}（剩 ${sd.u.supD} 次）</small></button>`:''}
   </div>`);
  if(v==='cover') return {react:'guard',cw:null,cover:sd.u};
  return {react:v,cw:v==='counter'?cw:null};
}

// =====================================================================
// 名冊、存檔
// =====================================================================
function joinChar(cid){
  if(G.roster.some(m=>m.cid===cid)) return G.roster.find(m=>m.cid===cid);
  const c=CHARS[cid]; if(!c) return null;
  const prev=(G.alumni||{})[cid];
  const m=prev?JSON.parse(JSON.stringify(prev)):{cid,cls:c.cls,lv:c.lv,exp:0,pp:0,psk:{},parts:[null,null]};
  if(prev) delete G.alumni[cid];
  const others=G.roster; if(others.length){
    const avg=others.reduce((s,o)=>s+mRank(o),0)/others.length;
    let guard=0;
    while(mRank(m)<avg-1&&guard++<40){
      if(m.lv<MAX_LV) m.lv++;
      else { const k=childrenOf(m.cls,cid).filter(x=>!x.req); if(!k.length) break; m.cls=k[0].id; m.lv=1; }
    }
  }
  G.roster.push(m);
  return m;
}
function leaveChar(cid){ const m=G.roster.find(x=>x.cid===cid); if(m){ G.alumni=G.alumni||{}; for(const p of (m.parts||[])) if(p){ G.inv=G.inv||{}; G.inv[p]=(G.inv[p]||0)+1; } m.parts=[null,null]; G.alumni[cid]=JSON.parse(JSON.stringify(m)); } G.roster=G.roster.filter(m=>m.cid!==cid); }
const SAVE='zijia2-';
function turnSnapshot(){
  const units=G.units.map(u=>{const c={...u,member:null,memberCid:u.member?u.member.cid:null,st:{...u.st},weapons:u.weapons.map(w=>({...w}))};return c;});
  return {units:JSON.parse(JSON.stringify(units)),gold:G.gold,inv:{...(G.inv||{})},roster:JSON.parse(JSON.stringify(G.roster)),flags:{...G.flags},alumni:JSON.parse(JSON.stringify(G.alumni||{})),seen:[...G.seenTags],fired:[...G.firedEvents],turn:G.turn,uid:G.uid,chests:JSON.parse(JSON.stringify(G.chests||[])),map:G.map.map(r=>r.join(''))};
}
function restoreTurn(t){
  G.roster=JSON.parse(JSON.stringify(t.roster)); G.gold=t.gold; G.inv={...t.inv}; G.flags={...t.flags}; G.alumni=JSON.parse(JSON.stringify(t.alumni));
  G.units=JSON.parse(JSON.stringify(t.units)).map(u=>{ const c=CLS(u.cls); u.skills=c.skills; u.member=u.memberCid?G.roster.find(m=>m.cid===u.memberCid)||null:null; delete u.memberCid; return u; });
  G.seenTags=new Set(t.seen); G.firedEvents=new Set(t.fired); G.turn=t.turn; G.uid=t.uid; if(t.chests) G.chests=JSON.parse(JSON.stringify(t.chests)); if(t.map) G.map=t.map.map(r=>r.split(''));
  G.phase='P'; G.mode='idle'; G.sel=null; G.inspect=null; G.reach=null; G.targets=[]; G.over=false; G.busy=false;
  log(`── 重來第 ${G.turn} 回合。`,'sys'); render();
}
function snapshot(){return {v:4,diff:G.diff==null?1:G.diff,gold:G.gold||0,inv:{...(G.inv||{})},mercs:JSON.parse(JSON.stringify(G.mercs||{})),chapter:G.chapterId,route:G.route,flags:{...G.flags},roster:JSON.parse(JSON.stringify(G.roster)),alumni:JSON.parse(JSON.stringify(G.alumni||{})),t:Date.now()};}
function restore(s){G.diff=s.diff==null?1:s.diff;G.gold=s.gold==null?1000:s.gold;G.inv={...(s.inv||{})};G.mercs=JSON.parse(JSON.stringify(s.mercs||{}));G.chapterId=s.chapter;G.route=s.route||'common';G.flags={...(s.flags||{})};G.roster=JSON.parse(JSON.stringify(s.roster));G.alumni=JSON.parse(JSON.stringify(s.alumni||{}));}
function store(k,v){try{localStorage.setItem(SAVE+k,JSON.stringify(v));return true;}catch(e){return false;}}
function load(k){try{const s=localStorage.getItem(SAVE+k);return s?JSON.parse(s):null;}catch(e){return null;}}
function saveDesc(s){ if(!s) return '（空）'; if(!CHAPTERS[s.chapter]) return '（舊版存檔，無法讀取）'; const c=CHAPTERS[s.chapter]; const d=new Date(s.t);
  return `第 ${c?c.no:'?'} 章 ${c?c.title:''}${s.route!=='common'?'・'+ROUTE_NAME[s.route]:''}・${DIFF[s.diff??1].name}　${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function endingsSeen(){return load('endings')||[];}

// =====================================================================
// 章節流程
// =====================================================================
function setupMap(ch){
  G.map=ch.map.map(r=>r.split('')); G.H=G.map.length; G.W=G.map[0].length;
  G.units=[]; G.uid=0; G.seenTags=new Set(); G.firedEvents=new Set();
  for(const d of ch.enemies) G.units.push(mkEnemy(d));
  G.chests=makeChests(ch);
  G.turn=1; G.phase='P'; G.mode='idle'; G.sel=null; G.inspect=null; G.threatOne=null; G.reach=null; G.targets=[];
  fitMap();
}
async function gotoChapter(id){
  G.chapterId=id; const ch=CH(); G.over=true;
  setupMap(ch); clearLog(); render();
  await playScene(ch.pre);
  (ch.leavePre||[]).forEach(leaveChar);
  (ch.joinPre||[]).forEach(joinChar);
  await prep();
}
async function prep(){
  const ch=CH();
  G.prepSnap=snapshot(); store('auto',G.prepSnap); if(typeof bgm==='function') bgm('prep');
  setupMap(ch); render();
  for(;;){
    const v=await ask(prepHtml(),'wide prep');
    if(v==='go'){ if(await deploy()) return startBattle(); continue; }
    if(v==='save'){ await saveMenu(); continue; }
    if(v==='help'){ await showHelp(); continue; }
    if(v==='diff'){ const dv=await ask(`<h2>更改難度</h2><div class="choices">${DIFF.map((d,i)=>`<button class="btn choice${i===(G.diff??1)?' pri':''}" data-v="${i}"><b>${d.name}${i===(G.diff??1)?'（目前）':''}</b><small>${d.desc}</small></button>`).join('')}</div>`,'wide'); G.diff=+dv; store('auto',snapshot()); G.prepSnap=snapshot(); continue; }
    if(v==='title'){ return titleScreen(); }
    if(v.startsWith('cc:')){ await classChange(v.slice(3)); continue; }
    if(v.startsWith('tree:')){ await classChange(v.slice(5),true); continue; }
    if(v==='shop'){ await shopMenu(); continue; }
    if(v.startsWith('eq:')){ await equipMenu(v.slice(3)); continue; }
    if(v.startsWith('ps:')){ await pskillMenu(v.slice(3)); continue; }
    if(v.startsWith('mc:')){ await mercMenu(v.slice(3)); continue; }
  }
}
function prepHtml(){
  const ch=CH();
  const cards=G.roster.map(m=>{
    const c=CLS(m.cls), s=statsOf(m.cls,m.lv,CHARS[m.cid].mod), ok=canChange(m);
    return `<div class="rc${ok?' ready':''}">
      <div class="rc-h"><span class="uc-g P hasicon" style="width:44px;height:44px;font-size:24px">${face(m.cid,CHARS[m.cid].ch)}</span>
        <div><b>${CHARS[m.cid].pilot}</b> <small>${CHARS[m.cid].mech}</small><br><span class="tier t${c.tier}">${TIER_NAME[c.tier]}</span> ${c.name}　<b class="mono">Lv ${m.lv}</b></div></div>
      <div class="expbar"><span>EXP</span><div class="bar ex"><i style="width:${m.exp/EXP.perLv*100}%"></i></div><span>${m.lv>=MAX_LV?'MAX ':''}${m.exp}/${EXP.perLv}</span></div>
      <div class="rc-s mono">HP ${fmt(s.hp)}　攻 ${s.atk}　甲 ${fmt(s.def)}　命 ${s.hit}　避 ${s.eva}　移 ${s.mov}</div>
      <div class="rc-k">${skillList(c.skills).join('・')||'—'}</div>
      <div class="rc-x">${(m.parts||[]).map(p=>p?`<span class="chip pt">${PARTS[p].name}</span>`:'<span class="chip pt empty">空槽</span>').join('')}${Object.entries(m.psk||{}).filter(([,v])=>v).map(([k,v])=>`<span class="chip sk">${PSKILLS[k].name}${PSKILLS[k].max>1?v:''}</span>`).join('')}${(G.mercs[m.cid]||[]).map(t=>`<span class="chip mc">${MERCS[t].ch} ${MERCS[t].name}</span>`).join('')}</div>
      <div class="row"><button class="btn ${ok?'pri':''}" data-v="cc:${m.cid}" ${ok?'':'disabled'}>${ok?'轉職！':m.lv>=CC_LV?'最終職業':`Lv ${CC_LV} 轉職`}</button><button class="btn" data-v="tree:${m.cid}">轉職樹</button><button class="btn" data-v="eq:${m.cid}">改裝</button><button class="btn${(m.pp||0)>0?' hot':''}" data-v="ps:${m.cid}">技能 ${m.pp||0}PP</button><button class="btn" data-v="mc:${m.cid}">傭兵 ${(G.mercs[m.cid]||[]).length}/${mercCap(m)}</button></div>
    </div>`;}).join('');
  return `<div class="prep-h"><div><small class="eyebrow">出擊準備</small><h2>第 ${ch.no} 章　${ch.title}</h2>
    <p style="color:var(--mute);margin:0">${ROUTE_NAME[ch.route]}　·　${ch.brief||''}</p></div></div>
    <dl class="cond"><dt>勝利條件</dt><dd>${ch.winText}</dd><dt>敗北條件</dt><dd>${ch.loseText}</dd><dt>資金</dt><dd><b class="mono">${fmt(G.gold||0)} G</b>　道具：${Object.entries(ITEMS).map(([k,it])=>`${it.name}×${(G.inv||{})[k]||0}`).join('、')}</dd><dt>出擊數</dt><dd>最多 ${ch.deploy.length} 台${(ch.guests||[]).length?`＋友軍 ${ch.guests.map(g=>GUESTS[g.id].pilot).join('、')}`:''}</dd></dl>
    <div class="rgrid">${cards}</div>
    <div class="foot"><button class="btn" data-v="title">標題畫面</button><button class="btn" data-v="help">說明</button><button class="btn" data-v="diff">難度：${DIFF[G.diff??1].name}</button><button class="btn" data-v="shop">商店</button><button class="btn" data-v="save">存檔</button><button class="btn pri" data-v="go">出擊</button></div>`;
}
async function shopMenu(){
  for(;;){
    const row=(k,it,kind)=>`<tr><td><b>${it.name}</b><br><small style="color:var(--mute)">${it.desc}</small></td><td class="mono">${fmt(it.price)} G</td><td class="mono">×${(G.inv||{})[k]||0}</td><td><button class="btn" data-v="buy:${k}" ${(G.gold||0)>=it.price?'':'disabled'}>購買</button></td></tr>`;
    const v=await ask(`<h2>商店</h2><p>持有資金 <b class="mono">${fmt(G.gold||0)} G</b>　·　擊墜敵機與通關都會獲得資金。零件在「改裝」裡裝上，道具在戰鬥中使用。</p>
      <h4>零件（每台機體 2 格）</h4><table class="shop"><tbody>${Object.entries(PARTS).map(([k,p])=>row(k,p)).join('')}</tbody></table>
      <h4>道具</h4><table class="shop"><tbody>${Object.entries(ITEMS).map(([k,p])=>row(k,p)).join('')}</tbody></table>
      <div class="foot"><button class="btn pri" data-v="back">完成</button></div>`,'wide');
    if(v==='back') return;
    const k=v.slice(4), it=PARTS[k]||ITEMS[k]; if(!it||G.gold<it.price) continue;
    G.gold-=it.price; G.inv[k]=(G.inv[k]||0)+1; sfx('buy');
  }
}
async function equipMenu(cid){
  const m=G.roster.find(x=>x.cid===cid); m.parts=m.parts||[null,null];
  for(;;){
    const owned=Object.keys(PARTS).filter(k=>(G.inv[k]||0)>0);
    const v=await ask(`<h2>${CHARS[cid].pilot}的改裝</h2><p style="color:var(--mute)">${CHARS[cid].mech}　·　零件槽 2 格。卸下的零件會回到倉庫。</p>
      <div class="slots">${m.parts.map((p,i)=>`<div class="slot"><small>槽 ${i+1}</small><b>${p?PARTS[p].name:'（空）'}</b><small style="color:var(--mute)">${p?PARTS[p].desc:''}</small>${p?`<button class="btn" data-v="off:${i}">卸下</button>`:''}</div>`).join('')}</div>
      <h4>倉庫</h4>${owned.length?`<table class="shop"><tbody>${owned.map(k=>`<tr><td><b>${PARTS[k].name}</b><br><small style="color:var(--mute)">${PARTS[k].desc}</small></td><td class="mono">×${G.inv[k]}</td><td><button class="btn" data-v="on:${k}" ${m.parts.includes(null)?'':'disabled'}>裝上</button></td></tr>`).join('')}</tbody></table>`:'<p style="color:var(--mute)">倉庫沒有零件，可以到商店購買。</p>'}
      <div class="foot"><button class="btn pri" data-v="back">完成</button></div>`,'wide');
    if(v==='back') return;
    const [a,b]=v.split(':');
    if(a==='off'){ const i=+b, p=m.parts[i]; if(p){ G.inv[p]=(G.inv[p]||0)+1; m.parts[i]=null; } }
    if(a==='on'){ const i=m.parts.indexOf(null); if(i>=0&&G.inv[b]>0){ G.inv[b]--; m.parts[i]=b; } }
  }
}
async function pskillMenu(cid){
  const m=G.roster.find(x=>x.cid===cid); m.psk=m.psk||{}; m.pp=m.pp||0;
  for(;;){
    const v=await ask(`<h2>${CHARS[cid].pilot}的駕駛技能</h2><p>持有 <b class="mono">${m.pp} PP</b>　·　每升一級獲得 1 PP；等級已滿時，每 ${EXP.perLv} EXP 也會換成 1 PP。</p>
      <table class="shop"><tbody>${Object.entries(PSKILLS).map(([k,p])=>{const lv=m.psk[k]||0, done=lv>=p.max, cost=done?0:p.cost[lv];
        return `<tr><td><b>${p.name}</b>${p.max>1?` <small class="mono">${lv}/${p.max}</small>`:(lv?' <small style="color:var(--good)">已學會</small>':'')}<br><small style="color:var(--mute)">${p.desc}</small></td><td class="mono">${done?'—':cost+' PP'}</td><td><button class="btn" data-v="learn:${k}" ${!done&&m.pp>=cost?'':'disabled'}>${done?'已滿':'學習'}</button></td></tr>`;}).join('')}</tbody></table>
      <p style="color:var(--mute);font-size:12.5px">所有機體本來就有援護攻擊、援護防禦各 1 次；學習後可增加次數。</p>
      <div class="foot"><button class="btn pri" data-v="back">完成</button></div>`,'wide');
    if(v==='back') return;
    const k=v.slice(6), p=PSKILLS[k], lv=m.psk[k]||0; if(lv>=p.max||m.pp<p.cost[lv]) continue;
    m.pp-=p.cost[lv]; m.psk[k]=lv+1;
  }
}
async function mercMenu(cid){
  const m=G.roster.find(x=>x.cid===cid); G.mercs=G.mercs||{}; const list=G.mercs[cid]=G.mercs[cid]||[];
  for(;;){
    const cap=mercCap(m), k=mercMult(m);
    const v=await ask(`<h2>${CHARS[cid].pilot}的傭兵</h2><p>持有資金 <b class="mono">${fmt(G.gold||0)} G</b>　·　可帶 ${list.length}/${cap} 隊（有指揮能力的職業可以帶 3 隊）</p>
      <p style="color:var(--mute);font-size:12.5px">傭兵只在本章有效，出擊時排在指揮官旁邊。待在指揮官 2 格內時命中、迴避 +10、傷害 +10%。指揮官被擊墜的話傭兵會撤退。能力隨指揮官的等級提升（目前 ×${k.toFixed(2)}）。</p>
      <table class="shop"><tbody>${Object.entries(MERCS).map(([t,x])=>`<tr><td><span class="mchip">${x.ch}</span> <b>${x.name}</b>${x.fly?' <small>飛行</small>':''}<br><small style="color:var(--mute)">${x.desc}　HP ${fmt(x.stats.hp*k)} · 移動 ${x.stats.mov} · ${x.weapons[0].name} 射程 ${x.weapons[0].min}–${x.weapons[0].max}</small></td><td class="mono">${fmt(mercCost(t))} G</td><td><button class="btn" data-v="hire:${t}" ${list.length<cap&&(G.gold||0)>=mercCost(t)?'':'disabled'}>僱用</button></td></tr>`).join('')}</tbody></table>
      ${list.length?`<h4>已僱用</h4><div class="row">${list.map((t,i)=>`<button class="btn" data-v="fire:${i}">${MERCS[t].ch} ${MERCS[t].name}　解約（退款）</button>`).join('')}</div>`:''}
      <div class="foot"><button class="btn pri" data-v="back">完成</button></div>`,'wide');
    if(v==='back') return;
    const [a,b]=v.split(':');
    if(a==='hire'&&list.length<cap&&G.gold>=mercCost(b)){ G.gold-=mercCost(b); list.push(b); }
    if(a==='fire'){ const t=list.splice(+b,1)[0]; if(t) G.gold+=mercCost(t); }
  }
}
async function deploy(){
  const ch=CH(), n=ch.deploy.length;
  if(G.roster.length<=n){ G.deployed=G.roster.map(m=>m.cid); return true; }
  function refundBench(){ for(const cid of Object.keys(G.mercs||{})) if(!G.deployed.includes(cid)){ for(const t of G.mercs[cid]) G.gold+=mercCost(t); G.mercs[cid]=[]; log('未出擊角色的傭兵已退款。','sys'); } }
  const sel=new Set(G.deployed.filter(c=>G.roster.some(m=>m.cid===c)).slice(0,n)); sel.add('gang');
  for(const m of G.roster){ if(sel.size>=n) break; sel.add(m.cid); }
  return new Promise(res=>{
    const box=$('#mbox'); box.className='mbox';
    const draw=()=>{ box.innerHTML=`<h2>選擇出擊機體</h2><p style="color:var(--mute)">最多 ${n} 台（已選 ${sel.size}）。剛鐵號必須出擊。</p>
      <div class="dlist">${G.roster.map(m=>{const c=CLS(m.cls);return `<label class="dl"><input type="checkbox" data-c="${m.cid}" ${sel.has(m.cid)?'checked':''} ${m.cid==='gang'?'disabled':''}><span class="uc-g P hasicon" style="width:32px;height:32px;font-size:18px">${face(m.cid,CHARS[m.cid].ch)}</span>${CHARS[m.cid].pilot}<small>${c.name} Lv${m.lv}</small></label>`;}).join('')}</div>
      <div class="foot"><button class="btn" data-x="back">返回</button><button class="btn pri" data-x="ok" ${sel.size>n?'disabled':''}>出擊</button></div>`; };
    draw(); $('#modal').hidden=false;
    box.onchange=e=>{const c=e.target.dataset.c; if(!c) return; if(e.target.checked) sel.add(c); else sel.delete(c); draw();};
    box.onclick=e=>{const b=e.target.closest('[data-x]'); if(!b||b.disabled) return; box.onclick=null; box.onchange=null; $('#modal').hidden=true;
      if(b.dataset.x==='ok'){ G.deployed=[...sel]; refundBench(); res(true);} else res(false); };
  });
}
async function startBattle(){
  const ch=CH();
  setupMap(ch);
  const order=G.roster.filter(m=>G.deployed.includes(m.cid)).sort((a,b)=>(a.cid==='gang'?-1:0)-(b.cid==='gang'?-1:0));
  order.slice(0,ch.deploy.length).forEach((m,i)=>{const [x,y]=ch.deploy[i]; G.units.push(mkPlayerUnit(m,x,y));});
  for(const g of (ch.guests||[])) G.units.push(mkGuest(g.id,g.lv||5,g.x,g.y));
  for(const [cid,list] of Object.entries(G.mercs||{})){ const cmd=G.units.find(u=>u.cid===cid&&u.side==='P'); const m=G.roster.find(r=>r.cid===cid); if(!cmd||!m) continue;
    for(const type of list){ const f=freeNear(cmd.x,cmd.y); if(f) G.units.push(mkMerc(type,m,f.x,f.y)); } }
  G.goldGain=0;
  G.over=false; clearLog(); render();
  log(`第 ${ch.no} 章 ${ch.title}　開始。勝利條件：${ch.winText}。`,'sys');
  await startPlayerPhase();
}
async function win(){
  if(G.over) return; G.over=true; G.busy=false; render(); if(typeof bgm==='function'&&BGM.on) bgm('win'); else sfx('win');
  const ch=CH();
  const alive=new Set(G.units.filter(u=>u.side==='P'&&u.member).map(u=>u.cid));
  const lv=[];
  for(const m of G.roster){ const before=m.lv; const bonus=G.deployed.includes(m.cid)?(alive.has(m.cid)?EXP.clearAlive:EXP.clearDown):EXP.clearBench;
    addExp(m,bonus);
    if(m.lv>before) lv.push(`${CHARS[m.cid].pilot} Lv ${m.lv}`); }
  const clearGold=500+100*ch.no; G.gold=(G.gold||0)+clearGold; const battleGold=G.goldGain||0; G.mercs={};
  const ready=G.roster.filter(canChange).map(m=>CHARS[m.cid].pilot);
  await ask(`<h2>作戰成功</h2><p>第 ${ch.no} 章「${ch.title}」以 <b>${G.turn}</b> 回合完成。</p>
    <p>獲得資金：擊墜 ${fmt(battleGold)} G ＋ 通關獎勵 ${fmt(clearGold)} G　→　持有 <b>${fmt(G.gold)} G</b></p>
    <p style="color:var(--mute)">全員獲得通關經驗（出擊存活 ${EXP.clearAlive}／被擊墜 ${EXP.clearDown}／待命 ${EXP.clearBench}）。${lv.length?`<br>升級：${lv.join('、')}`:''}${ready.length?`<br><span style="color:var(--amber)">可以轉職：${ready.join('、')}</span>`:''}</p>
    <div class="foot"><button class="btn pri" data-v="ok">繼續</button></div>`);
  await playScene(ch.post);
  (ch.join||[]).forEach(c=>{ if(joinChar(c)) log(`${CHARS[c].pilot} 加入了銘甲隊。`,'good'); });
  if(ch.ending){ await showEnding(ch.ending, ch.route); return titleScreen(); }
  let next=ch.next;
  if(next&&typeof next==='object'&&next.branch){ const hit=next.branch.find(b=>(b.all||[]).every(f=>G.flags[f])&&!(b.none||[]).some(f=>G.flags[f])); next=hit?hit.next:next.else; }
  if(next&&typeof next==='object'&&next.choice){ store('branch-'+ch.id,{...snapshot(),pendingChoice:ch.id}); next=await makeChoice(next.choice); }
  if(!next) return titleScreen();
  gotoChapter(next);
}
async function makeChoice(c){
  const v=await ask(`<h2>${c.prompt}</h2><p style="color:var(--mute)">這個選擇會改變之後的劇情。遊戲已自動建立「分歧點存檔」，之後可以從讀取畫面回到這裡重選。</p>
    <div class="choices">${c.options.map((o,i)=>{const ok=(o.requires||[]).every(f=>G.flags[f]);
      return `<button class="btn choice" data-v="${i}" ${ok?'':'disabled'}><b>${o.text}</b><small>${o.desc||''}</small>${ok?'':`<small class="why">${o.requiresText||'條件未達成'}</small>`}</button>`;}).join('')}</div>`,'wide');
  const o=c.options[+v];
  if(o.route){ G.route=o.route; G.flags['route'+o.route]=true; }
  if(o.flags) Object.assign(G.flags,o.flags);
  log(`選擇了「${o.text}」`,'sys');
  return o.next;
}
function allEndings(){ const m=new Map(); for(const c of Object.values(CHAPTERS)) if(c.ending&&!m.has(c.ending.id)) m.set(c.ending.id,c.ending.title); return [...m]; }
function endingList(seen){ return allEndings().map(([id,t])=>seen.has(id)?`<b style="color:var(--amber)">${t}</b>`:'<span style="color:var(--dim)">？？？</span>').join('　'); }
async function showEnding(e,route){
  await playScene(e.lines);
  const seen=new Set(endingsSeen()); seen.add(e.id||route); store('endings',[...seen]);
  const total=allEndings().length;
  await ask(`<div class="title"><small class="eyebrow">ENDING ${[...allEndings().map(x=>x[0])].indexOf(e.id)+1} / ${total}</small><div class="t-logo" style="font-size:clamp(30px,8vw,48px)">${e.title}</div>
    <p style="color:var(--mute)">${ROUTE_NAME[route]||''}　完</p>
    <p>已見結局（${seen.size}/${total}）：${endingList(seen)}</p>
    ${seen.size<total?'<p style="color:var(--mute)">從讀取畫面選擇「分歧點存檔」，走上不同的道路，就能看到其他結局。</p>':'<p>全部結局達成，感謝遊玩！</p>'}
    <div class="foot" style="justify-content:center"><button class="btn pri" data-v="ok">回到標題</button></div></div>`,'wide');
}
async function lose(msg){
  if(G.over) return; G.over=true; G.busy=false; render(); if(typeof bgm==='function'&&BGM.on) bgm('lose'); else sfx('lose');
  const v=await ask(`<h2>作戰失敗</h2><p>${msg}</p><p style="color:var(--mute)">提示：開啟「敵方威脅範圍」，避免主角機被圍攻；重擊前可以用「鐵壁」或選擇「防禦」。</p>
    <div class="foot"><button class="btn" data-v="title">標題畫面</button><button class="btn pri" data-v="retry">回到出擊準備</button></div>`);
  if(v==='retry'){ restore(G.prepSnap); return prep(); }
  titleScreen();
}
async function saveMenu(){
  const slots=[1,2,3];
  const v=await ask(`<h2>存檔</h2><p style="color:var(--mute)">存檔會記錄目前章節的出擊準備狀態。存檔只保存在這個瀏覽器中。</p>
    <div class="stlist" style="max-width:none">${slots.map(i=>`<button class="btn" data-v="${i}"><span>存檔 ${i}</span><small>${saveDesc(load('slot'+i))}</small></button>`).join('')}</div>
    <div class="foot"><button class="btn" data-v="">返回</button></div>`);
  if(!v) return;
  const ok=store('slot'+v,snapshot());
  await ask(`<h2>${ok?'已存檔':'存檔失敗'}</h2><p>${ok?`已存到存檔 ${v}。`:'這個瀏覽器目前無法儲存資料（可能是私密瀏覽模式）。'}</p><div class="foot"><button class="btn pri" data-v="ok">好</button></div>`);
}
async function loadMenu(){
  const opts=[['auto','自動存檔'],['slot1','存檔 1'],['slot2','存檔 2'],['slot3','存檔 3'],
    ...Object.keys(CHAPTERS).filter(id=>CHAPTERS[id].next&&CHAPTERS[id].next.choice&&load('branch-'+id)).map(id=>['branch-'+id,`分歧點：第 ${CHAPTERS[id].no} 章「${CHAPTERS[id].next.choice.prompt}」`])];
  const v=await ask(`<h2>讀取</h2><div class="stlist" style="max-width:none">${opts.map(([k,n])=>{const s=load(k);return `<button class="btn" data-v="${k}" ${s?'':'disabled'}><span>${n}</span><small>${saveDesc(s)}</small></button>`;}).join('')}</div>
    <div class="foot"><button class="btn" data-v="">返回</button></div>`);
  if(!v) return false;
  const s=load(v); if(!s||!CHAPTERS[s.chapter]) return false;
  restore(s); clearLog();
  if(s.pendingChoice){ const ch=CHAPTERS[s.pendingChoice]; G.chapterId=ch.id; const n=await makeChoice(ch.next.choice); gotoChapter(n); return true; }
  await prep(); return true;
}

// =====================================================================
// 轉職
// =====================================================================
function rootOf(clsId){let c=CLS(clsId); while(c.from&&CLASSES[c.from]) c=CLASSES[c.from]; return c.id;}
function pathSet(clsId){const s=new Set();let c=CLS(clsId);s.add(c.id);while(c.from&&CLASSES[c.from]){c=CLASSES[c.from];s.add(c.id);}return s;}
async function classChange(cid,viewOnly=false){
  const m=G.roster.find(x=>x.cid===cid); if(!m) return;
  const cur=CLS(m.cls), past=pathSet(m.cls), avail=new Set(canChange(m)?childrenOf(m.cls,cid).map(c=>c.id):[]);
  const root=rootOf(m.cls);
  const node=(c)=>{ const st=c.id===m.cls?'cur':past.has(c.id)?'past':avail.has(c.id)?'avail':reqOK(c,cid)?'':'lock';
    return `<button class="cn ${st}" data-v="${avail.has(c.id)&&!viewOnly?'to:'+c.id:'info:'+c.id}"><span class="tier t${c.tier}">${TIER_NAME[c.tier]}</span><b>${c.req&&!reqOK(c,cid)&&st!=='cur'&&st!=='past'?'？？？':c.name}</b>${st==='cur'?'<small>目前</small>':st==='avail'?'<small>可轉職</small>':''}</button>`; };
  const kids=id=>Object.values(CLASSES).filter(c=>c.from===id);
  let tree=`<div class="tree"><div class="tcol">${node(CLASSES[root])}</div><div class="tbr">`;
  for(const k2 of kids(root)){
    tree+=`<div class="trow"><div class="tcol">${node(k2)}</div><div class="tcol t3">${kids(k2.id).map(node).join('')}</div></div>`;
  }
  tree+='</div></div>';
  const t4=cid==='gang'?Object.values(CLASSES).filter(c=>c.from==='*s3'):[];
  if(t4.length) tree+=`<div class="t4row"><span style="color:var(--mute)">任一上階 Lv ${CC_LV}＋第 12 章以後，依路線解放：</span>${t4.map(node).join('')}</div>`;
  if(CLASSES[root]&&CLASSES[root].tier===2) tree=tree; // 騎士系從中階開始
  for(;;){
    const v=await ask(`<h2>${CHARS[cid].pilot}的轉職樹</h2>
      <p style="color:var(--mute)">${ROLE_NAME[cur.role]}　·　目前：${cur.name} Lv ${m.lv}　·　${canChange(m)?'<span style="color:var(--amber)">可以轉職！點選發光的職業。</span>':`到達 Lv ${CC_LV} 後可轉職，轉職後等級回到 1，但基礎能力大幅提升。`}</p>
      ${tree}<div class="foot"><button class="btn" data-v="back">返回</button></div>`,'wide');
    if(v==='back') return;
    const [act,id]=v.split(':'); const c=CLASSES[id];
    const r=await classInfo(m,c,act==='to');
    if(r==='done') return;
  }
}
async function classInfo(m,c,can){
  const now=statsOf(m.cls,m.lv,CHARS[m.cid].mod), nx=statsOf(c.id,1,CHARS[m.cid].mod);
  const hidden=c.req&&!reqOK(c,m.cid)&&!pathSet(m.cls).has(c.id);
  if(hidden){ await ask(`<h2>？？？</h2><p>這個職業的解放條件尚未滿足。</p><p style="color:var(--mute)">${c.desc}</p><div class="foot"><button class="btn pri" data-v="b">返回</button></div>`); return; }
  const row=(k,n)=>`<tr><td>${n}</td><td class="mono">${fmt(now[k])}</td><td class="mono">${fmt(nx[k])}</td><td class="mono ${nx[k]>now[k]?'up':nx[k]<now[k]?'dn':''}">${nx[k]>now[k]?'+':''}${fmt(nx[k]-now[k])}</td></tr>`;
  const v=await ask(`<h2>${c.name}<span class="tier t${c.tier}" style="margin-left:10px;font-size:12px">${TIER_NAME[c.tier]}</span></h2>
    <p style="color:var(--mute)">${c.desc}${c.fly?'　飛行。':''}</p>
    <table class="cmp"><thead><tr><th></th><th>目前 Lv${m.lv}</th><th>轉職後 Lv1</th><th></th></tr></thead><tbody>
    ${row('hp','HP')}${row('en','EN')}${row('atk','攻擊')}${row('def','裝甲')}${row('hit','命中')}${row('eva','迴避')}${row('mov','移動')}</tbody></table>
    <h4>特殊能力</h4><p>${skillList(c.skills).join('、')||'—'}</p>
    <h4>武器</h4><table class="wt"><thead><tr><th>武器</th><th>威力</th><th>射程</th><th>命中</th><th>消耗</th></tr></thead><tbody>
    ${c.weapons.map(w=>`<tr><td>${w.name}${!w.post?'<span class="tag">P✕</span>':''}</td><td>${fmt(w.pow)}</td><td>${w.min===w.max?w.min:w.min+'–'+w.max}</td><td>${w.hit>=0?'+':''}${w.hit}</td><td>${costTxt({...w,left:w.ammo})}</td></tr>`).join('')}</tbody></table>
    <div class="foot"><button class="btn" data-v="b">返回</button>${can?`<button class="btn pri" data-v="go">轉職為 ${c.name}</button>`:''}</div>`,'wide');
  if(v!=='go') return;
  m.cls=c.id; m.lv=1; m.exp=0; sfx('levelup');
  await ask(`<div class="title"><small class="eyebrow">CLASS CHANGE</small><div class="t-logo" style="font-size:clamp(28px,7vw,40px)">${c.name}</div><p>${CHARS[m.cid].pilot}轉職成功！${unlockedSpirits(m).length>0?`<br><span style="color:var(--mute)">可用精神：${unlockedSpirits(m).join('、')}</span>`:''}</p><div class="foot" style="justify-content:center"><button class="btn pri" data-v="ok">好</button></div></div>`);
  return 'done';
}

// =====================================================================
// 標題與說明
// =====================================================================
async function titleScreen(){
  G.over=true; G.phase='P'; G.sel=null; if(typeof bgm==='function') bgm('title');
  if(!G.chapterId){ G.chapterId=START; setupMap(CH()); }
  render();
  let auto=load('auto'); if(auto&&!CHAPTERS[auto.chapter]) auto=null; const seen=endingsSeen().filter(id=>allEndings().some(e=>e[0]===id));
  const demo=`<span class="m">▲ ▲</span> · · <span class="f">♣︎</span> · · · <span class="e">兵</span>
 <span class="p">剛</span> · · · <span class="w">≈ ≈</span> · · ·
 · <span class="p">狙</span> · · · · · <span class="e">砲</span> ·`;
  if(typeof startTitleBg==='function') startTitleBg();
  const v=await ask(`<div class="title"><div class="t-logo">銘<b>甲</b>戰記</div>
    <div class="t-sub">像素機器人戰棋<br>全 15 章・三條路線・五種結局・職業轉職</div>
    <div class="stlist">
      <button class="btn ${auto?'':'pri'}" data-v="new"><span>新遊戲</span><small>從第一章開始</small></button>
      <button class="btn ${auto?'pri':''}" data-v="cont" ${auto?'':'disabled'}><span>繼續</span><small>${auto?saveDesc(auto):'沒有自動存檔'}</small></button>
      <button class="btn" data-v="load"><span>讀取存檔</span><small>存檔 1–3</small></button>
      <button class="btn" data-v="help"><span>遊戲說明與設定</span><small>必讀</small></button>
      ${IN_HALL?`<a class="btn hallbtn" href="${HALL_URL}"><span>返回遊戲大廳</span><small>← 大廳</small></a>`:''}
    </div>
    <p class="t-end">已見結局（${seen.length}/${allEndings().length}）：${endingList(new Set(seen))}</p></div>`);
  if(typeof stopTitleBg==='function') stopTitleBg();
  if(v==='help'){await showHelp();return titleScreen();}
  if(v==='load'){ if(!(await loadMenu())) return titleScreen(); return; }
  if(v==='cont'){ restore(auto); clearLog(); return prep(); }
  const dv=await ask(`<h2>選擇難度</h2><p style="color:var(--mute)">之後可以在「出擊準備」畫面隨時更改。</p><div class="choices">${DIFF.map((d,i)=>`<button class="btn choice${i===1?' pri':''}" data-v="${i}"><b>${d.name}</b><small>${d.desc}</small></button>`).join('')}</div>`,'wide');
  G.diff=+dv;
  G.route='common'; G.flags={}; G.roster=[]; G.deployed=[]; G.alumni={}; G.gold=1000; G.inv={kit:2}; G.mercs={};
  ['gang','feng','lei','yu'].forEach(joinChar);
  gotoChapter(START);
}
function expHelp(){
  const hit=d=>clamp(EXP.hitBase+d*EXP.hitStep,EXP.hitMin,EXP.hitMax), kill=d=>hit(d)+clamp(EXP.killBase+d*EXP.killStep,EXP.killMin,EXP.killMax);
  const ex=[['初階 Lv3 打 兵 Lv2',-1],['初階 Lv3 打 騎 Lv5',12],['中階 Lv5 打 兵 Lv5',-10],['上階 Lv3 打 同 Rank 敵機',0]];
  const gr=[1,2,3,4].map(t=>`<tr><td><span class="tier t${t}">${TIER_NAME[t]}</span></td>${['hp','en','atk','def','hit','eva'].map(k=>`<td class="mono">+${GROWTH[t][k]}</td>`).join('')}</tr>`).join('');
  return `<h4>經驗值</h4>
   <ul><li>每 <b>${EXP.perLv}</b> EXP 升一級，上限 Lv ${MAX_LV}。Lv ${CC_LV} 以上可轉職，轉職後回到 Lv 1、EXP 0。Lv ${MAX_LV} 時多出來的經驗值會作廢，記得轉職。</li>
   <li>經驗值依雙方的 <b>Rank</b> 差距計算：<b>Rank ＝（職業階級 − 1）× 10 ＋ 等級</b>。例：中階 Lv5 ＝ 15；敵方騎士機（中階）Lv6 ＝ 16。差距 ＝ 敵方 Rank − 我方 Rank。</li>
   <li>戰鬥中升級會立即套用新能力。友軍（皇帝、將軍）不會獲得經驗。中途加入的角色會自動調整到接近隊伍平均的等級。</li></ul>
   <table><thead><tr><th>行動</th><th>經驗值</th><th>備註</th></tr></thead><tbody>
   <tr><td>攻擊命中</td><td>${EXP.hitBase} ＋ 差距 × ${EXP.hitStep}（${EXP.hitMin}〜${EXP.hitMax}）</td><td>未命中為 0；反擊命中也算</td></tr>
   <tr><td>擊墜</td><td>命中經驗 ＋ ${EXP.killBase} ＋ 差距 × ${EXP.killStep}（${EXP.killMin}〜${EXP.killMax}）</td><td>擊墜頭目再 ＋${EXP.boss}</td></tr>
   <tr><td>修理友軍</td><td>${EXP.repair}</td><td></td></tr>
   <tr><td>通關</td><td>出擊存活 ${EXP.clearAlive}／被擊墜 ${EXP.clearDown}／待命 ${EXP.clearBench}</td><td>全員都有</td></tr>
   <tr><td>防禦、迴避、說服、精神</td><td>0</td><td></td></tr></tbody></table>
   <table><thead><tr><th>例子</th><th>差距</th><th>命中</th><th>擊墜</th></tr></thead><tbody>
   ${ex.map(([n,d])=>`<tr><td>${n}</td><td class="mono">${d>0?'+':''}${d}</td><td class="mono">${hit(d)}</td><td class="mono">${kill(d)}</td></tr>`).join('')}</tbody></table>
   <p style="color:var(--mute);font-size:12.5px">越級挑戰強敵升得快；轉職後打低階雜兵幾乎沒有經驗。</p>
   <h4>每升一級的能力成長</h4>
   <table><thead><tr><th>階級</th><th>HP</th><th>EN</th><th>攻擊</th><th>裝甲</th><th>命中</th><th>迴避</th></tr></thead><tbody>${gr}</tbody></table>`;
}
async function showHelp(){
  const ts=Object.values(TERRAIN).map(t=>`<tr><td class="g">${t.g}</td><td>${t.name}</td><td>${t.block?'—':t.cost}</td><td>${t.block?'—':'+'+Math.round(t.def*100)+'%'}</td><td>${t.block?'—':(t.eva>=0?'+':'')+t.eva}</td><td>${t.block?'任何機體都無法通過':t.heal?'回合開始回復 10% HP 與 EN':t.k==='water'?'地面機體在水中較容易被命中':''}</td></tr>`).join('');
  const sps=Object.entries(SPIRITS).map(([n,s])=>`<tr><td>${n}</td><td class="mono">${s.cost}</td><td>${s.desc}</td></tr>`).join('');
  const trees=['striker','gunner','scout','support','heavy','knight'].map(role=>{
    const roots=Object.values(CLASSES).filter(c=>c.role===role&&!c.from);
    const lines=[];
    const walk=(c,d)=>{ if(c.req) return; lines.push(`${'　　'.repeat(d)}${d?'└ ':''}${c.name}`); Object.values(CLASSES).filter(k=>k.from===c.id).forEach(k=>walk(k,d+1)); };
    roots.forEach(r=>walk(r,0));
    return `<div><b>${ROLE_NAME[role]}</b><pre class="treepre">${lines.join('\n')}</pre></div>`;}).join('');
  await ask(`<div class="help"><h2>遊戲說明與基本設定</h2>
   <h4>世界觀</h4>
   <p>新曆 217 年，人類用「銘甲」稱呼人型戰鬥機體，每台銘甲的核心都刻著駕駛者的名字，名字越強，機體越強。赤環帝國越過邊境入侵，聯合軍獨立第七小隊「銘甲隊」奉命迎擊。然而戰爭的背後，還有一群想要抹去一切名字的「無銘者」……</p>
   <h4>流程</h4>
   <ul><li>全 15 章。第 5 章結束時會面臨抉擇，分成三條路線：<b>守護之字</b>、<b>赤環之誓</b>、<b>無銘之甲</b>；每條路線中後段還有一次抉擇。共有五種結局，其中一種需要滿足隱藏條件。</li><li>每次抉擇前會自動建立「分歧點存檔」，可以從讀取畫面回到分歧點重選。</li>
   <li>每章開始前是「出擊準備」：可以轉職、查看轉職樹、存檔。進入準備畫面時會自動存檔。</li>
   <li>部分敵機（帶綠點）可以用特定角色靠近後「說服」，讓對方加入。</li></ul>
   <h4>等級與轉職</h4>
   <ul><li>攻擊命中、擊墜、修理都能獲得經驗值，${EXP.perLv} 點升一級；每章通關全員另有經驗。詳見下方「經驗值」。</li>
   <li>職業分為 <b>初階 → 中階 → 上階</b>，每一階都有兩條分支。Lv ${CC_LV} 以上可以轉職，轉職後等級回到 1，但基礎能力大幅提升並獲得新武器與特殊能力。等級上限 ${MAX_LV}。</li>
   <li>主角雷隼在第 12 章以後，可從上階再轉職為隨路線不同的<b>極</b>階職業。</li>
   <li>職業升階也會解放新的精神指令、提高 SP 上限。</li></ul>
   <div class="trees">${trees}</div>
   ${expHelp()}
   <h4>援護、合體、改裝、傭兵</h4>
   <ul><li><b>援護攻擊</b>：攻擊時，相鄰的友軍若能打到目標會追加攻擊（每回合 1 次，可用技能增加）。攻擊確認畫面可以取消勾選。</li>
   <li><b>援護防禦</b>：友軍被攻擊時，相鄰的友軍可以代為承受（防禦姿態，傷害減半，不反擊）。</li>
   <li><b>合體攻擊</b>：特定兩人相鄰、夥伴尚未行動、雙方氣力與 EN 足夠時，武器清單會出現合體技：${COMBOS.map(c=>`${CHARS[c.a].pilot}＋${CHARS[c.b].pilot}「${c.name.replace('合體・','')}」`).join('、')}。</li>
   <li><b>資金與商店</b>：擊墜敵機、通關都會獲得資金。在出擊準備的「商店」買零件與道具，在「改裝」裝上（每台 2 格）。</li>
   <li><b>駕駛技能</b>：升級獲得 PP，等級已滿時每 ${EXP.perLv} EXP 也換成 1 PP。可學習：${Object.values(PSKILLS).map(p=>p.name).join('、')}。</li>
   <li><b>傭兵</b>：每位角色可僱用 2 隊傭兵（指揮系職業 3 隊），只在本章有效。待在指揮官 2 格內會獲得加成，指揮官被擊墜就會撤退。</li></ul>
   <h4>操作</h4>
   <ul><li>點選藍色我方機體 → 藍色格子為移動範圍。移動後，機體旁邊會出現指令選單（攻擊、說服、修理、精神、道具、待機）。</li>
   <li><b>直接點敵機</b>：自動移動到最適合的位置、選好武器並進入攻擊確認（確認畫面可以切換武器）。<b>再點一次自己的機體</b>：原地叫出指令選單。</li>
   <li>快捷鍵：A 攻擊・S 精神・W 待機・R 修理・T 說服・I 道具・1–9 選武器・Tab 下一台・E 結束回合・Esc 或右鍵 取消。</li>
   <li>被攻擊時選擇：<b>反擊</b>、<b>防禦</b>（傷害減半）、<b>迴避</b>（敵命中率減半）。</li>
   <li>「敵方威脅範圍」顯示全部敵機能攻擊到的格子。選取我方機體時，淡紅色格子是移動後能攻擊到的範圍。Esc：取消／返回。劇情中按 Enter 或點擊前進。</li>
   <li>「選單」裡的「重來本回合」可以回到這回合我方行動開始時的狀態。勾選「快速敵方回合」會略過敵方攻擊的戰鬥動畫。</li>
   <li><b>畫面</b>：地圖為像素地形與 Q 版機體，戰鬥有動畫（近戰、光束、飛彈、射擊、擊墜爆炸）。想看原本的文字地圖，可以勾選「經典文字地圖」。</li>
   <li><b>寶箱</b>：地圖上的寶箱裡有資金、道具或零件。讓我方機體停在寶箱上並結束行動就能拿到。</li>
   <li><b>地圖設施</b>：「防衛砲台」不會移動，但射程很遠；「破損城牆」擊破後會變成通道；「虛無核心」是破壞目標。部分關卡的勝利條件是佔領指定格子（綠色虛線框）或破壞設施。</li>
   <li><b>必殺技</b>：使用需要氣力的武器時，會有切入演出。最終頭目被擊破後可能會進入第二形態。</li>
   <li>難度：簡單（敵人等級 −2、經驗 ×1.25）、普通、困難（敵人等級 +2）。在出擊準備畫面可以隨時更改。</li></ul>
   <h4>地形</h4>
   <table><thead><tr><th></th><th>地形</th><th>移動</th><th>防禦</th><th>迴避</th><th>備註</th></tr></thead><tbody>${ts}</tbody></table>
   <p style="color:var(--mute);font-size:12.5px">飛行機體（字的右上角有小三角）移動消耗一律為 1，但不享有地形加成。</p>
   <h4>戰鬥公式</h4>
   <div class="formula">命中率 = 75 + 武器命中 + (攻方命中 − 守方迴避) ÷ 2 − 地形迴避 + 技能／指揮加成
傷害   = (武器威力 + 攻擊×10) × 攻方氣力% − 裝甲 × 守方氣力% × 0.5
         × 技能加成 × (1 − 地形防禦) × 0.9〜1.1　（會心 ×1.25）</div>
   <ul><li><b>氣力</b>：初始 100、上限 150。命中 +3、擊墜 +5、被命中 +2、迴避 +3。部分必殺武器需要氣力。</li>
   <li><b>P✕</b>：移動後不能使用的武器。<b>先制反擊</b>：被攻擊時先打回去。<b>指揮</b>：範圍內友軍獲得加成。</li></ul>
   <h4>精神指令（消耗 SP，不消耗行動）</h4>
   <table><thead><tr><th>名稱</th><th>SP</th><th>效果</th></tr></thead><tbody>${sps}</tbody></table>
   </div><div class="foot"><button class="btn pri" data-v="ok">了解</button></div>`,'wide');
}

// =====================================================================
// 事件綁定
// =====================================================================
$('#map').addEventListener('click',e=>{const c=e.target.closest('.c'); if(c) onCell(+c.dataset.x,+c.dataset.y);});
$('#map').addEventListener('mouseover',e=>{const c=e.target.closest('.c'); if(!c) return; const x=+c.dataset.x,y=+c.dataset.y; showTerrain(x,y); if(typeof GFX!=='undefined') GFX.hover={x,y};
  const u=unitAt(x,y); if(G.phase==='P'&&!G.busy){ const want=u||null; if(want!==G.inspect&&(want||G.mode!=='idle'||!G.threatOne)){G.inspect=want;renderInfo();} }});
$('#map').addEventListener('mouseleave',()=>{ if(typeof GFX!=='undefined') GFX.hover=null;if(G.phase==='P'&&!G.busy){G.inspect=G.threatOne||null;renderInfo();}});
$('#actions').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b||b.disabled) return; if(b.dataset.w!=null) pickWeapon(+b.dataset.w); else onAction(b.dataset.a);});
$('#btnEnd').onclick=()=>{ if(G.sel&&G.sel.moved) cancel(); G.sel=null; G.mode='idle'; endPlayerPhase(); };
$('#btnThreat').onclick=()=>{G.threatAll=!G.threatAll;render();};
$('#btnHelp').onclick=()=>{ if(!$('#modal').hidden) return; showHelp(); };
$('#btnMenu').onclick=async()=>{ if(G.busy||!$('#modal').hidden) return;
  if(G.over){ return; }
  const v=await ask(`<h2>選單</h2><div class="stlist" style="max-width:none"><button class="btn" data-v="turn" ${G.turnSnap?'':'disabled'}><span>重來本回合</span><small>回到第 ${G.turn} 回合我方行動開始時</small></button><button class="btn" data-v="retry"><span>重新開始本章</span><small>回到出擊準備</small></button><button class="btn" data-v="title"><span>回到標題畫面</span><small>未存檔的戰鬥進度會遺失</small></button>${IN_HALL?`<a class="btn hallbtn" href="${HALL_URL}"><span>返回遊戲大廳</span><small>未存檔的戰鬥進度會遺失</small></a>`:''}</div><div class="foot"><button class="btn pri" data-v="">繼續戰鬥</button></div>`);
  if(v==='turn'&&G.turnSnap){ restoreTurn(G.turnSnap); return; }
  if(v==='retry'){ G.over=true; restore(G.prepSnap); prep(); } else if(v==='title'){ G.over=true; titleScreen(); } };
$('#optAnim').onchange=e=>{G.anim=e.target.checked;};
$('#optAuto').onchange=e=>{G.autoCounter=e.target.checked;};
$('#optFast').onchange=e=>{G.fast=e.target.checked;};
if($('#optBgm')){ $('#optBgm').checked=BGM.on; $('#optBgm').onchange=e=>{ BGM.on=e.target.checked; try{localStorage.setItem('zijia2-bgm',BGM.on?'1':'0');}catch(_){} if(BGM.on){ const w=BGM.want; BGM.want=null; bgm(w); } else bgmStop(); }; }
if($('#optSfx')){ $('#optSfx').checked=SFX.on; $('#optSfx').onchange=e=>{ SFX.on=e.target.checked; try{localStorage.setItem('zijia2-sfx',SFX.on?'1':'0');}catch(_){} if(SFX.on) sfx('select'); }; }
if(!IN_HALL){ const h=document.querySelector('.hall'); if(h&&h.remove) h.remove(); }
$('#optIcons').onchange=e=>{G.classic=e.target.checked; try{localStorage.setItem(SAVE+'classic',G.classic?'1':'0');}catch(_){} fitMap(); renderLegend(); render();};
try{ if(localStorage.getItem(SAVE+'classic')==='1'){ G.classic=true; $('#optIcons').checked=true; } }catch(_){}
document.addEventListener('keydown',e=>{
  if(!$('#modal').hidden||!$('#battle').hidden||!$('#scene').hidden) return;
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
  if(e.key==='Escape'){ cancel(); return; }
  if(G.phase!=='P'||G.busy||G.over) return;
  const k=(e.key||'').toLowerCase();
  if(k==='tab'){ e.preventDefault(); nextUnit(); return; }
  if(k==='e'&&!e.metaKey&&!e.ctrlKey){ if(G.sel&&G.sel.moved) return; G.sel=null; G.mode='idle'; endPlayerPhase(); return; }
  if(!G.sel) return;
  const act={a:'attack',s:'spirit',w:'wait',r:'repair',t:'talk',i:'item'}[k];
  if(act&&G.mode==='unit'){ const btn=document.querySelector(`#actions [data-a="${act}"]:not([disabled])`); if(btn){ e.preventDefault(); onAction(act); } return; }
  if(G.mode==='weapon'&&/^[1-9]$/.test(k)){ const i=+k-1, b=document.querySelector(`#actions [data-w="${i}"]:not([disabled])`); if(b){ e.preventDefault(); pickWeapon(i); } }
});
$('#map').addEventListener('contextmenu',e=>{ e.preventDefault(); if(G.phase==='P'&&!G.busy) cancel(); });
$('#fmenu').addEventListener('click',e=>{const b=e.target.closest('button'); if(!b||b.disabled) return; e.stopPropagation(); if(b.dataset.a!=='cancel'&&b.dataset.a!=='back') sfx('menu'); if(b.dataset.w!=null) pickWeapon(+b.dataset.w); else onAction(b.dataset.a);});
window.addEventListener('resize',()=>renderFMenu());
document.querySelector('.mapwrap').addEventListener('scroll',()=>renderFMenu());
window.addEventListener('resize',()=>{fitMap();});

fitMap();
renderLegend();
if(typeof startMapLoop==='function') startMapLoop();
titleScreen();

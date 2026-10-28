// 銘甲戰記 — 外傳章節、隱藏角色、演習挑戰、戰鬥中事件、天候、地圖縮放、存檔碼
// 載入順序：engine.js 之後、boot.js 之前（只新增資料與函式，不改動主線劇情）

// =====================================================================
// 新角色與說話者
// =====================================================================
Object.assign(SPEAKERS,{
  aki:{name:'秋葉',ch:'葉',side:'P'},
  chizuru:{name:'千鶴',ch:'鶴',side:'E'},
  kokuyo:{name:'黑曜',ch:'曜',side:'E'},
  elder:{name:'黑石鎮長',ch:'長',side:'N'},
  raider:{name:'掠奪隊長',ch:'掠',side:'E'},
  merc:{name:'傭兵隊長',ch:'傭',side:'E'},
});
Object.assign(CHARS,{
  aki:{pilot:'秋葉',mech:'豐穰號',ch:'葉',cls:'p1',lv:1,mod:{hp:300,def:60},sp:55,
       spirits:[['根性',1],['激勵',1],['鐵壁',2],['閃避',2],['再動',3]],lines:['豐穰號，出發囉！','黑石鎮的女兒可不好惹！','大家撐住，我來修！']},
  chizuru:{pilot:'千鶴',mech:'鶴翼號',ch:'鶴',cls:'g1',lv:1,mod:{hit:8,eva:3},sp:50,
       spirits:[['集中',1],['狙擊',1],['必中',2],['魂',3]],lines:['……風停了。開槍。','雪上不留足跡。','一羽、二羽……']},
  kokuyo:{pilot:'黑曜',mech:'黑曜號',ch:'曜',cls:'s1',lv:1,mod:{atk:3,eva:5,hp:200},sp:50,
       spirits:[['熱血',1],['必中',1],['閃避',2],['魂',3],['再動',4]],lines:['……黑曜號，出擊。','我不會再被抹去了。','這是我的名字。']},
});
GUESTS.aki={pilot:'秋葉',mech:'豐穰號',ch:'葉',cls:'p1',spirits:['根性','鐵壁'],sp:60,lines:['豐穰號，全速前進！','礦石車一台都不能丟！']};
COMBOS.push(
  {a:'chizuru',b:'lei',name:'合體・雪鶴雷擊',pow:5000,min:2,max:6,hit:30,en:25,will:115},
  {a:'kokuyo',b:'rei',name:'合體・零壹雙影',pow:5600,min:1,max:2,hit:25,en:35,will:120},
  {a:'aki',b:'tetsu',name:'合體・黑石豐收錘',pow:4800,min:1,max:1,hit:20,en:25,will:110},
  {a:'gang',b:'kokuyo',name:'合體・剛曜十字斬',pow:5800,min:1,max:1,hit:20,en:35,will:120},
);
// 敵方專用機體
E('crane','鶴','鶴翼號',2,{hp:3300,en:140,atk:23,def:1000,hit:122,eva:105,mov:5},{crit:10},[wp('近身短槍',2100,1,1,10),wp('雪原狙擊',2900,2,6,20,{en:10})],{});
E('proto','曜','原型機・壹',3,{hp:7600,en:220,atk:32,def:1500,hit:116,eva:112,mov:6},{crit:15,dmgDown:5},[wp('黑曜刃',3600,1,1,20),wp('虛影連射',3300,1,3,10,{en:15}),wp('無名斬',4600,1,2,10,{en:40,will:120})],{});

// 像素圖示（16×16，與既有角色同樣的 Q 版模板）
Object.assign(ICONS,{
  aki:{pal:{k:'#1a1a24',B:'#ff8fa8',m:'#8a3048',w:'#ffffff',H:'#e0873a',F:'#fff4e6',E:'#5a2a10',b:'#c86a2a',c:'#f3c43b',l:'#4fae4a',L:'#2f7a34'},
    rows:['.......lL.......','......lLLl......','....kkkkkkkk....','...kHHHHHHHHk...','..kHHHHHHHHHHkH.','..kHHHHHHHHHHkHH','.kHFFFFFFFFFFHkH','.kHFwEFFFFwEFHk.','.kHFEEFFFFEEFHk.','.kHFEEFFFFEEFHk.','.kHBBFFmmFFBBHk.','..kHFFFFFFFFHk..','...kkkkkkkkkk...','....kbbccbbk....','...kbbbbbbbbk...','...kk.kkkk.kk...']},
  chizuru:{pal:{k:'#1a1a24',B:'#ffb0c0',m:'#8a3048',w:'#ffffff',H:'#e8eef6',F:'#fbfcff',E:'#2a3a5a',b:'#5a7ab0',c:'#e0463c',r:'#e0463c'},
    rows:['.......rr.......','......rkkr......','....kkkrrkkk....','...kHHHHHHHHk...','..kHHHHHHHHHHk..','..kHHHHHHHHHHk..','.kHFFFFFFFFFFHk.','.kHFwEFFFFwEFHk.','.kHFEEFFFFEEFHk.','.kHHEEFFFFEEHHk.','.kHHBFFmmFFBHHk.','..kHFFFFFFFFHk..','..HkkkkkkkkkkH..','..H.kbbccbbk.H..','...kbbbbbbbbk...','...kk.kkkk.kk...']},
  kokuyo:{pal:{k:'#0e0e14',B:'#4a3a6a',m:'#8a3048',w:'#fff3c0',H:'#2a2a34',F:'#d8d2e4',E:'#f3a83b',b:'#3a3448',c:'#9a6af0',s:'#8a6ae0'},
    rows:['..s..........s..','...s........s...','....sskkkkss....','...kHHHHHHHHk...','..kHHsHHHHsHHk..','..kHHHHHHHHHHk..','.kHFFFFFFFFFFHk.','.kHFwEFFFFwEFHk.','.kHFEEFFFFEEFHk.','.kHFEEFFFFEEFHk.','.kHBBFFFFFFBBHk.','..kHFFFFFFFFHk..','...kkkkkkkkkk...','....kbbccbbk....','...kbbbbbbbbk...','...kk.kkkk.kk...']},
});
ICONS.crane=ICONS.chizuru; ICONS.proto=ICONS.kokuyo;
if(typeof QUOTES!=='undefined') Object.assign(QUOTES,{
  aki:{atk:['豐穰號，翻土開始！','看我的礦山鏟！'],sp:['黑石鎮的豐收，就是這一擊！','豐穰號，全力運轉——！'],hit:['哇！還、還沒壞！','裝甲板再撐一下！'],dodge:['嘿嘿，躲過了！'],kill:['好，下一台！'],down:['對不起……豐穰號……']},
  chizuru:{atk:['……風向確認。','一發。'],sp:['雪原的白鶴，從不失手。','鶴翼號，展翼——！'],hit:['……被打中了。','還能飛。'],dodge:['太慢。','看得見。'],kill:['命中。','……安息吧。'],down:['……雪……好冷……'],
    vs:{snowcap:['隊長，契約到此為止。']}},
  kokuyo:{atk:['黑曜號，斬。','……排除。'],sp:['這是有名字的人的一擊——！','黑曜號，全開！無名斬！'],hit:['……這點痛，我記得。','還沒結束。'],dodge:['影子是砍不到的。'],kill:['……你也有名字吧。抱歉。'],down:['不要……不要再抹掉我……'],
    vs:{wuking:['無銘王！我的名字，是我自己取的！']}},
  raider:{atk:['礦石全部歸我們！'],hit:['可惡，這些傢伙！'],down:['礦石……我的礦石……']},
  snowcap:{atk:['暴風雪是我們的主場！'],hit:['白鶴！妳在發什麼呆！'],down:['……契約……泡湯了……']},
});

// =====================================================================
// 戰鬥中事件：頭目半血台詞、初次交手台詞（主線只加台詞，不影響平衡）
// =====================================================================
const BATTLE_EVENTS={
  c3:[{meet:{tag:'lena',by:'gang'},lines:[['lena','聯合軍的新兵嗎。報上你的名字。'],['gang','雷隼！銘甲隊的雷隼！給我記好了！']]},
      {hp:{tag:'lena',below:.8},lines:[['lena','……這台初階機，動作跟剛才不一樣了。'],['gang','現在才發現已經太遲了！']]}],
  c5:[{hp:{tag:'lena',below:.8},lines:[['lena','又是你，雷隼。你的劍，比上次更重了。'],['gang','因為我背負的東西變多了！']]}],
  a7:[{hp:{tag:'lena',below:.8},lines:[['lena','你的劍……在猶豫什麼？'],['op','雷隼，蕾娜的攻擊有所保留。靠近她，試著「說服」吧！']]}],
  a9:[{meet:{tag:'ed',by:'gang'},lines:[['ed','雷隼。你本來可以成為聯合軍的英雄。'],['gang','我不需要靠謊言當英雄！']]},
      {hp:{tag:'ed',below:.5},lines:[['ed','不可能……區區一個小隊，竟然……'],['gang','艾德！投降吧，你的陰謀已經藏不住了！'],['ed','哼，無銘者會替我完成一切！']]}],
  b11:[{hp:{tag:'ed',below:.5},lines:[['ed','區區叛徒……竟能把我逼到這種地步！'],['ed','全軍，不惜代價擋住他們！']]}],
  h11:[{hp:{tag:'ed',below:.5},lines:[['ed','這股力量……你真的還是雷隼嗎？'],['ed','全軍，不惜代價擋住他們！']]}],
  a10a:[{hp:{tag:'remnant',below:.5},lines:[['fed','指揮官機受損！資料……資料一定要送出去！']]}],
  a11:[{meet:{tag:'hogan',by:'tetsu'},lines:[['hogan','礦山的漢子嗎？好壯的機體！'],['tetsu','老將軍，俺的岩山號可是不輸你的！']]},
       {hp:{tag:'hogan',below:.5},lines:[['hogan','好！好啊！這才是戰場！'],['hogan','老夫已經很久沒有這麼痛快了！']]}],
  h9:[{hp:{tag:'hogan',below:.5},lines:[['hogan','好！好啊！這才是戰場！'],['hogan','就算是始甲之力，老夫也要正面接下！']]}],
  b7:[{meet:{tag:'lei',by:'gang'},lines:[['lei','雷隼……沒想到會在戰場上用槍口對著你。'],['gang','冬木大叔……我不想跟你打！'],['op','冬木的機體反應有遲疑……雷隼或小晴也許能「說服」他。']]}],
  b8:[{hp:{tag:'greg',below:.5},lines:[['greg','為什麼……為什麼你們要站在那個皇帝身邊！'],['lena','葛雷格，你的戟已經迷失方向了。']]}],
  h12:[{meet:{tag:'yu',by:'gang'},lines:[['yu','雷隼……你還記得我嗎？'],['gang','……小晴。']]}],
  h13:[{meet:{tag:'lena',by:'gang'},lines:[['lena','這就是你選擇的力量嗎，雷隼。'],['gang','……蕾娜。我還有話想跟妳說。']]}],
  t15:[{meet:{tag:'yuanwu',by:'yu'},lines:[['yu','你一直都是一個人嗎……'],['yuanwu','……一個……人……']]},
       {hp:{tag:'yuanwu',below:.5},lines:[['yuanwu','……好吵……好多……名字……'],['yu','它在聽！大家，繼續呼喚它！']]}],
};
for(const id of ['a15','b15','h15a','h15b']) BATTLE_EVENTS[id]=[{hp:{tag:'wuking',below:.5},lines:[['wuming','……區區之名，竟能傷到始源虛甲。'],['wuming','有意思。讓我看看你們的名字能撐到幾時。']]}];
for(const [id,evs] of Object.entries(BATTLE_EVENTS)) if(CHAPTERS[id]) CHAPTERS[id].events=(CHAPTERS[id].events||[]).concat(evs);

// 隱藏角色加入後，結局多一句話
const END_EXTRA=[{if:'akiJoined',line:['aki','黑石鎮的豐收祭，今年也要辦得熱熱鬧鬧的！大家都要來喔！']},
  {if:'chizuruJoined',line:['chizuru','我把傭兵的契約書燒了。以後，我只為自己想守護的東西開槍。']},
  {if:'kokuyoJoined',line:['kokuyo','黑曜。這是我自己取的名字。……我會一直帶著它活下去。']}];
for(const c of Object.values(CHAPTERS)) if(c.ending&&c.ending.lines){ const L=c.ending.lines; L.splice(Math.max(0,L.length-1),0,...END_EXTRA); }

async function hpEvents(){
  const ch=CH(), evs=ch&&ch.events; if(!evs) return;
  for(let i=0;i<evs.length;i++){ const e=evs[i]; if(!e.hp||G.firedEvents.has(i)) continue;
    const u=G.units.find(u=>u.tag===e.hp.tag&&u.side==='E'&&u.hp>0);
    if(!u||u.hp>u.maxHp*e.hp.below) continue;
    G.firedEvents.add(i); render();
    if(typeof mapFx==='function') mapFx(u.x,u.y,'！','#ffd25a',{big:true,dur:1200});
    await playScene(e.lines||[]);
  }
}
async function meetEvents(a,b){
  const ch=CH(), evs=ch&&ch.events; if(!evs) return;
  for(let i=0;i<evs.length;i++){ const e=evs[i]; if(!e.meet||G.firedEvents.has(i)) continue;
    const by=[].concat(e.meet.by), hit=(p,q)=>p.side==='P'&&by.includes(p.cid)&&q.tag===e.meet.tag;
    if(!(hit(a,b)||hit(b,a))) continue;
    G.firedEvents.add(i); render(); await playScene(e.lines||[]);
  }
}

// =====================================================================
// 外傳章節（世界地圖「外傳」分頁；每個只能完成一次，敵人等級配合隊伍）
// 敵人寫法：cs = 依等級挑選的機種（低→高階），rl = 相對於隊伍等級的差距
// =====================================================================
const TG={g:['bing','jing','wei'],h:['dun','zhong','wei'],a:['pao','zhong','te'],f:['yi','ying','ye'],u:['lian','lian2','te'],k:['bing','qi','wei'],v:['ying','ying','ye'],x:['dun','zhong','xu']};
const SIDES=[
  {id:'s1',title:'黑石鎮撤離戰',unlock:3,pos:[.19,.62],hint:'第 3 章的出擊準備時開放',
   brief:'護送秋葉駕駛的豐穰號抵達地圖東側出口（綠框）。豐穰號被擊墜就失敗。',
   rewardText:'新夥伴・秋葉（支援系）、1,200 G、修理套件×2',
   gold:1200,items:{kit:2},join:'aki',
   pre:[['', '黑石鎮。銘甲隊曾經守護過的礦山小鎮，再次傳來求救訊號。'],
     ['elder','銘甲隊！帝國的掠奪部隊又回來了，這次他們想把整座礦坑的核心礦石搬走！'],
     ['aki','鎮長，礦石車裝好了！我開豐穰號，載著大家從東邊的山道撤離！'],
     ['gang','妳一個人開？太危險了！'],
     ['aki','我叫秋葉，鐵山叔叔教我開銘甲的！豐穰號雖然是農用改裝機，修東西可是一流的。'],
     ['tetsu','秋葉……妳長這麼大了。好，銘甲隊，護送豐穰號到東邊的山道出口！']],
   post:[['aki','到了！大家都平安……謝謝你們！'],
     ['aki','那個……我想跟你們一起走。黑石鎮的人教會我：被保護過，就要去保護別人。'],
     ['tetsu','哈哈！這丫頭的倔脾氣跟俺一模一樣。'],
     ['gang','歡迎加入，秋葉！'],['','秋葉與豐穰號加入了銘甲隊！']],
   map:['mmm..r....mm...m','mm..rbr....f....','m....r.....ff..m','..r......mm.....','.rbr.....mm..f..','..r..f.......ff.','m...ff...r......','mm.......rr..mm.','mmm..mm......mmm','mmmm.mm..f..mmmm'],
   deploy:[[2,3],[3,5],[1,5],[3,3],[4,4],[2,6]],
   guests:[{id:'aki',x:1,y:4}],protect:['aki'],
   win:{type:'escape',who:'aki',cells:[[15,3],[15,4],[15,5],[15,6]]},winText:'豐穰號抵達東側出口',loseText:'剛鐵號或豐穰號被擊墜',
   enemies:[{cs:TG.g,rl:0,x:8,y:2},{cs:TG.g,rl:-1,x:9,y:5},{cs:TG.h,rl:1,x:12,y:4},{cs:TG.a,rl:0,x:13,y:1},{cs:TG.f,rl:-1,x:11,y:7},{cs:TG.g,rl:0,x:14,y:6},
     {cs:TG.k,rl:2,x:13,y:3,boss:true,tag:'raider',name:'掠奪隊長機',pilot:'掠奪隊長',ch:'掠',ai:'hold'}],
   events:[{turn:2,phase:'E',lines:[['raider','從後面包抄！把那台礦石車給我攔下來！'],['aki','後、後面也有！']],spawn:[{cs:TG.g,rl:0,x:0,y:3},{cs:TG.f,rl:-1,x:0,y:6}]},
     {turn:4,phase:'E',lines:[['op','東北方出現敵方增援！'],['gang','秋葉，別停下來，衝過去！']],spawn:[{cs:TG.h,rl:0,x:15,y:1}]},
     {hp:{tag:'raider',below:.5},lines:[['raider','可惡，這些聯合軍的狗……！'],['raider','算了，礦石車才是目標！']]}]},

  {id:'s3',title:'赤石峽谷・砲台線',unlock:5,pos:[.33,.4],hint:'第 5 章的出擊準備時開放',
   brief:'在 9 回合內破壞 4 座防衛砲台。破損城牆可以擊破開路，第 3、5 回合會有敵方增援。',
   rewardText:'1,500 G、長程感測器、推進器',gold:1500,items:{radar:1,boost:1},
   pre:[['', '赤石峽谷。帝國在峽谷深處架設了新型防衛砲台。'],
     ['op','砲台的射程涵蓋整條補給路線！必須在敵方主力抵達前全部破壞！'],
     ['feng','九個回合……時間很緊。破損的城牆可以打穿，當作捷徑。'],
     ['gang','那就全速前進！']],
   post:[['op','所有砲台都沉默了！補給路線確保！'],['feng','……在時限內完成。還不錯。'],['','在砲台的殘骸裡，找到了帝國的新型零件。']],
   map:['mmmmmmmmmmmmmmmmmm','m....m....mm.....m','..r..m.r.....f...m','.......m....m.....','..b...........r...','......m...f.......','..r....m....m.....','.....mm..r....f...','m.......mm.......m','mmmmmmmmmmmmmmmmmm'],
   deploy:[[0,3],[1,4],[0,5],[1,3],[0,6],[1,5]],turnLimit:9,
   win:{type:'destroy',target:'tw'},winText:'破壞 4 座防衛砲台（9 回合內）',loseText:'剛鐵號被擊墜／超過 9 回合',
   enemies:[{c:'tower',rl:0,x:8,y:2,tag:'tw'},{c:'tower',rl:0,x:11,y:6,tag:'tw'},{c:'tower',rl:0,x:15,y:3,tag:'tw'},{c:'tower',rl:0,x:16,y:7,tag:'tw'},
     {c:'bwall',rl:-10,x:9,y:4},{c:'bwall',rl:-10,x:9,y:5},{c:'bwall',rl:-10,x:13,y:4},{c:'bwall',rl:-10,x:13,y:5},
     {cs:TG.g,rl:0,x:12,y:3},{cs:TG.h,rl:0,x:14,y:5},{cs:TG.a,rl:-1,x:17,y:4},{cs:TG.f,rl:-1,x:10,y:7},{cs:TG.g,rl:0,x:7,y:6}],
   events:[{turn:3,phase:'E',lines:[['soldier','峽谷入口遭到突破！增援部隊，上！']],spawn:[{cs:TG.k,rl:0,x:17,y:2},{cs:TG.g,rl:-1,x:17,y:6}]},
     {turn:5,phase:'E',lines:[['op','又有敵機從峽谷深處過來了！'],['feng','砲台優先，別戀戰。']],spawn:[{cs:TG.f,rl:0,x:17,y:1},{cs:TG.h,rl:0,x:17,y:8}]}]},

  {id:'s2',title:'雪原的白鶴',unlock:7,pos:[.65,.05],hint:'第 7 章的出擊準備時開放',
   brief:'擊破傭兵隊長。暴風雪中，距離 3 格以上的攻擊命中 −15%。讓雷隼或冬木靠近千鶴，就能說服她加入。',
   rewardText:'可說服的夥伴・千鶴（射擊系）、1,500 G、精密瞄準器、迴避晶片',gold:1500,items:{scope:1,chip:1},recruit:'chizuruJoined',weather:'snow',
   pre:[['', '北境雪原。暴風雪中，一支來路不明的傭兵部隊正在襲擊難民的補給車隊。'],
     ['op','偵測到敵方狙擊機！在這種暴風雪裡還能精準命中……對方是高手。'],
     ['chizuru','……又是軍隊。不管是帝國還是聯合軍，都一樣。'],
     ['chizuru','傭兵只看契約。擋路的，就打下來。'],
     ['gang','等等……她剛才那一槍，是故意打偏的？'],
     ['op','那台白色機體是北方傭兵團的「白鶴」。也許……可以跟她談談。']],
   post:[{if:'chizuruJoined',line:['chizuru','……雪原的風，今天好像比較溫柔。']},
     {ifnot:'chizuruJoined',line:['op','白色的狙擊機消失在暴風雪中了……下次也許還有機會。']},
     ['gang','補給線守住了。走吧！']],
   map:['..ff.....mm.....','.fff......m..ff.','.....ww.......f.','....www...mm....','...........m..b.','..mm....f.......','..mm...fff...mm.','.......ff....m..','....ww.......ff.','..ff.ww...mm.ff.','.fff......mm....'],
   deploy:[[1,4],[1,5],[1,6],[0,3],[0,7],[2,4]],
   win:{type:'boss',target:'snowcap'},winText:'擊破傭兵隊長',loseText:'剛鐵號被擊墜',
   enemies:[{cs:['bing','lian2','te'],rl:3,x:14,y:4,boss:true,tag:'snowcap',name:'雪狼號',pilot:'傭兵隊長',ch:'傭',ai:'hold'},
     {c:'crane',rl:1,x:12,y:2,boss:true,tag:'chizuru',name:'鶴翼號',pilot:'千鶴',ch:'鶴',ai:'hold',retreat:.3,
      retreatLines:[['chizuru','……雪停之前，我會再來。'],['','鶴翼號消失在暴風雪中。']],
      talk:{by:['gang','lei'],join:'chizuru',flag:'chizuruJoined',lines:[['gang','千鶴！妳的槍一直在避開我們的駕駛艙，對吧？'],['chizuru','……被看穿了嗎。'],
        ['chizuru','傭兵團收了錢，要我打下補給線。可是那些車上載的，是給難民的糧食。'],['gang','那就別打了！跟我們走，用妳的槍去保護那些車隊！'],
        ['chizuru','……契約上沒寫這一條。不過，好吧。從現在起，我是鶴翼號的千鶴——銘甲隊的千鶴。']]}},
     {cs:TG.u,rl:0,x:9,y:4},{cs:TG.u,rl:-1,x:10,y:7},{cs:TG.a,rl:0,x:13,y:7},{cs:TG.f,rl:-1,x:11,y:5},{cs:TG.h,rl:1,x:12,y:6},{cs:TG.f,rl:0,x:8,y:9}],
   events:[{turn:3,phase:'E',lines:[['merc','第二小隊，從南邊包圍！'],['op','南方出現敵機！']],spawn:[{cs:TG.u,rl:0,x:15,y:10},{cs:TG.f,rl:0,x:15,y:9}]},
     {hp:{tag:'chizuru',below:.75},lines:[['chizuru','……你們的眼神，跟那些人不一樣。'],['op','千鶴的攻擊似乎有所保留……靠近她，試著「說服」吧！']]},
     {hp:{tag:'snowcap',below:.5},lines:[['merc','可惡，白鶴！妳在發什麼呆，給我開槍！']]}]},

  {id:'s4',title:'虛空回廊',unlock:11,pos:[.76,.93],hint:'第 11 章的出擊準備時開放',
   brief:'堅守 6 回合。虛無核心每回合都會召喚無銘之影；擊破核心就能阻止增援，消滅所有敵人即可提前勝利。',
   rewardText:'2,500 G、複合裝甲、鬥志迴路',gold:2500,items:{armor2:1,mind:1},weather:'void',
   pre:[['', '原字碑的地下深處，一條從未被記載的迴廊。'],
     ['shadow','……名字……給我們……名字……'],
     ['yu','好多無銘之影……它們從那個核心裡源源不絕地湧出來！'],
     ['op','觀測到虛無核心！只要核心還在，敵人就會一直增加！'],
     ['gang','撐住六個回合，或者直接打爆那個核心！']],
   post:[['', '迴廊的盡頭，牆上刻著無數個被抹去的名字。'],['yu','……這裡的每一個名字，都曾經有人呼喚過吧。'],['gang','我們會記住的。']],
   map:['####....rr....##','##....r....r...#','#...r....r......','....rr.......r..','.......##.......','.b.....##.......','.......##.......','....rr.......r..','#...r....r......','##....r....r...#','####....rr....##'],
   deploy:[[1,5],[2,4],[2,6],[3,5],[1,3],[1,7]],
   win:{type:'survive',turns:6},winText:'堅守 6 回合（或消滅所有敵機）',loseText:'剛鐵號被擊墜',
   enemies:[{c:'gate',rl:0,x:14,y:5,tag:'vgate',name:'虛無核心'},{cs:TG.v,rl:0,x:12,y:2},{cs:TG.v,rl:0,x:12,y:8},{cs:TG.v,rl:-1,x:10,y:5},{cs:TG.x,rl:0,x:13,y:5}],
   events:[2,3,4,5,6].map(t=>({turn:t,phase:'E',ifAlive:'vgate',lines:t===2?[['shadow','……名字……名字……'],['op','核心又召喚了新的敵機！']]:[],spawn:[{cs:TG.v,rl:t>4?1:0,x:15,y:4},{cs:t%2?TG.x:TG.v,rl:0,x:15,y:6}]}))
     .concat([{hp:{tag:'vgate',below:.5},lines:[['shadow','……痛……好痛……'],['yu','核心在動搖！再加把勁！']]}])},

  {id:'s5',title:'無名的原型機',unlock:9,pos:[.92,.9],secret:true,hint:'？？？',
   rumor:'傳聞：只有看過任何一個結局的人，或是完成其他所有外傳的人，才能找到這個地方。',
   brief:'擊退原型機「壹」。把它的 HP 削減到 60% 以下後，讓雷隼或零靠近，就能說服它。',
   rewardText:'可說服的隱藏夥伴・黑曜（格鬥系）、3,000 G、複合裝甲、長程感測器',gold:3000,items:{armor2:1,radar:1},recruit:'kokuyoJoined',weather:'void',
   pre:[['', '大陸最南端，被封印的無銘者研究所。'],
     ['op','研究所深處有銘甲反應……型號是……「壹」？'],
     ['kokuyo','……又有人來了。來拿走我的什麼？名字嗎？我本來就沒有。'],
     ['gang','你是……無銘者造出來的銘甲？'],
     ['kokuyo','我是零號之前的失敗品，編號「壹」。他們抹掉了我的名字，把我丟在這裡。'],
     ['kokuyo','既然沒有名字，那就讓所有人都跟我一樣——'],
     ['gang','等一下！你還記得自己的名字被抹掉了，那就代表你還沒有放棄！']],
   post:[{if:'kokuyoJoined',line:['kokuyo','……名字，原來是這麼溫暖的東西。']},
     {ifnot:'kokuyoJoined',line:['op','原型機逃進了研究所的深處……也許還能再見到它。']},
     ['gang','無銘者留下的傷痕，比我們想的還要深啊。']],
   map:['mmm....##....mmm','mm.....r#.....mm','m...r......r...m','....rr....rr....','................','..##....b...##..','..##........##..','................','....rr....rr....','m...r......r...m','mm.....#r.....mm','mmm....##....mmm'],
   deploy:[[0,4],[1,5],[0,6],[1,7],[1,4],[0,7]],
   win:{type:'boss',target:'kokuyo'},winText:'擊退或說服原型機「壹」',loseText:'剛鐵號被擊墜',
   enemies:[{c:'proto',rl:3,x:14,y:6,boss:true,tag:'kokuyo',name:'原型機・壹',pilot:'黑曜',ch:'曜',retreat:.2,
      retreatLines:[['kokuyo','……我還不能……在這裡消失……'],['','原型機・壹撤退了。']],
      talk:{by:['gang','rei'],hpBelow:.6,join:'kokuyo',flag:'kokuyoJoined',lines:[['gang','你說你沒有名字？那就自己取一個！我們會記住它！'],['kokuyo','……自己……取……？'],
        ['kokuyo','……黑曜。研究所的窗外，只看得到黑色的石頭。我一直看著它，看了好多年。'],['gang','黑曜！好名字！跟我們走吧！'],
        ['kokuyo','……黑曜號，加入銘甲隊。這是我第一次，被人叫自己的名字。']]}},
     {cs:TG.v,rl:0,x:11,y:3},{cs:TG.v,rl:0,x:11,y:8},{cs:TG.x,rl:0,x:13,y:4},{cs:TG.v,rl:-1,x:9,y:6},{cs:TG.v,rl:0,x:15,y:2}],
   events:[{turn:3,phase:'E',lines:[['kokuyo','……出來吧，跟我一樣沒有名字的東西們。']],spawn:[{cs:TG.v,rl:0,x:15,y:9},{cs:TG.x,rl:0,x:15,y:3}]},
     {hp:{tag:'kokuyo',below:.6},lines:[['kokuyo','……為什麼……你們的攻擊，有溫度……'],['op','原型機的反應減弱了！讓雷隼或零靠近，試著「說服」它！']]}]},
];
function sideUnlocked(S){
  if(storyNo()<S.unlock) return false;
  if(S.secret) return endingsSeen().length>0||SIDES.filter(s=>!s.secret).every(s=>(G.sideDone||{})[s.id]);
  return true;
}
function sideStatus(S){
  const d=(G.sideDone||{})[S.id];
  if(d===true) return 'done';
  if(!sideUnlocked(S)) return S.secret?'hidden':'locked';
  return 'open';
}
function sideCls(cs,rank){ const list=[].concat(cs); let best=list[0]; for(const c of list) if(rank-(CLS(c).tier-1)*10>=1) best=c; return best; }
function sideEnemy(d,R){
  const o={...d}; const rank=R+(d.rl||0); o.c=d.cs?sideCls(d.cs,rank):d.c;
  o.lv=Math.max(1,rank-(CLS(o.c).tier-1)*10); delete o.cs; delete o.rl; return o;
}
function sideR(){ return Math.max(2,Math.round(partyRank())-1); }
function makeSide(id){
  const S=SIDES.find(s=>s.id===id), R=sideR(), conv=d=>sideEnemy(d,R);
  const n=Math.min(S.deploy.length,Math.max(4,G.roster.length));
  if(GUESTS.aki){ const t=R>=21?3:R>=11?2:1; GUESTS.aki.cls=['p1','p2a','p3a'][t-1]; }
  const gl=g=>{ const c=CLS(GUESTS[g.id].cls); return Math.min(MAX_LV,Math.max(1,R+1-(c.tier-1)*10)); };
  return {id:'side_'+id,sideId:id,side:true,label:'外傳',no:storyNo(),route:'side',title:S.title,brief:S.brief,pre:S.pre,post:S.post,
    map:S.map,deploy:S.deploy.slice(0,n),enemies:S.enemies.map(conv),
    events:(S.events||[]).map(e=>({...e,spawn:(e.spawn||[]).map(conv)})),
    guests:(S.guests||[]).map(g=>({...g,lv:gl(g)})),protect:S.protect,win:S.win,winText:S.winText,loseText:S.loseText,turnLimit:S.turnLimit,weather:S.weather};
}
function sideReward(S,first){
  if(!first) return [];
  const got=[];
  G.gold=(G.gold||0)+(S.gold||0); if(S.gold) got.push(`${fmt(S.gold)} G`);
  G.inv=G.inv||{}; for(const [k,n] of Object.entries(S.items||{})){ G.inv[k]=(G.inv[k]||0)+n; got.push(`${(PARTS[k]||ITEMS[k]).name}${n>1?'×'+n:''}`); }
  return got;
}
async function sideWin(){
  const ch=CH(), S=SIDES.find(s=>s.id===ch.sideId);
  const alive=new Set(G.units.filter(u=>u.side==='P'&&u.member).map(u=>u.cid)), lv=[];
  for(const m of G.roster){ if(!G.deployed.includes(m.cid)) continue; const before=m.lv; addExp(m,Math.round((alive.has(m.cid)?EXP.clearAlive:EXP.clearDown)/2)); if(m.lv>before) lv.push(`${CHARS[m.cid].pilot} Lv ${m.lv}`); }
  G.sideDone=G.sideDone||{}; const first=!G.sideDone[S.id];
  if(S.join){ G.flags[S.join+'Joined']=true; }
  const recruited=!S.recruit||G.flags[S.recruit];
  G.sideDone[S.id]=recruited?true:'again';
  const got=sideReward(S,first), battleGold=G.goldGain||0; G.mercs={};
  await ask(`<h2>外傳「${S.title}」　任務完成</h2><p>以 <b>${G.turn}</b> 回合完成。</p>
    <p>${got.length?`獲得：${got.join('、')}`:'（獎勵已在第一次完成時領取）'}${battleGold?`<br>擊墜資金：${fmt(battleGold)} G`:''}　→　持有 <b>${fmt(G.gold)} G</b></p>
    ${lv.length?`<p style="color:var(--mute)">升級：${lv.join('、')}</p>`:''}
    ${recruited?'':'<p style="color:var(--amber)">這次沒有成功說服對方。這個外傳之後可以再挑戰一次。</p>'}
    <div class="foot"><button class="btn pri" data-v="ok">繼續</button></div>`);
  await playScene(ch.post);
  if(S.join&&joinChar(S.join)){ log(`${CHARS[S.join].pilot} 加入了銘甲隊。`,'good'); sfx('join'); }
  G.free=null; return prep();
}
async function sideLose(msg){
  const chal=G.free&&G.free.challenge;
  await ask(`<h2>${chal?'演習中止':'任務失敗'}</h2><p>${msg}</p><p style="color:var(--mute)">${chal?'演習的結果不會影響劇情與隊伍。':'外傳失敗不會影響主線，可以重新整備後再挑戰。'}</p>
    <div class="foot"><button class="btn pri" data-v="ok">回到出擊準備</button></div>`);
  restore(G.prepSnap); G.free=null; return prep();
}

// =====================================================================
// 演習挑戰（計分模式）：用目前的隊伍挑戰，結束後隊伍回到挑戰前的狀態
// =====================================================================
const CHALLENGES=[
  {id:'blitz',name:'速攻演習',map:'a6',prize:'boost',desc:'擊破全部 8 台敵機。回合數越少分數越高（標準 5 回合）。',
   score:s=>6000+900*(5-s.turns)+3000*s.hpR-1500*s.lost, count:8},
  {id:'hunt',name:'頭目狩獵',map:'b8',prize:'mind',desc:'擊破被重盾機守護的演習頭目機（標準 3 回合）。',
   score:s=>6000+1100*(3-s.turns)+3000*s.hpR-1500*s.lost, count:4, boss:true},
  {id:'endure',name:'耐久演習',map:'a12',prize:'armor2',desc:'堅守 6 回合，敵人每回合從東方湧入。擊墜越多分數越高。',
   score:s=>2500+350*s.kills+4000*s.hpR-1500*s.lost, count:4, waves:true},
  {id:'siege',name:'要塞攻略',map:'a13',prize:'radar',desc:'破壞 3 座防衛砲台（標準 5 回合，限 10 回合）。',
   score:s=>6000+800*(5-s.turns)+3000*s.hpR-1500*s.lost, count:4, towers:3},
];
function chalRank(sc){ return sc>=9000?'S':sc>=7500?'A':sc>=6000?'B':'C'; }
function makeChal(id){
  const C=CHALLENGES.find(c=>c.id===id), base=CHAPTERS[C.map], R=sideR();
  const r=rng([...id].reduce((a,c)=>a*31+c.charCodeAt(0),17)>>>0);
  const map=base.map, H=map.length, W=map[0].length, tAt=(x,y)=>TERRAIN[map[y][x]]||TERRAIN['.'];
  const ok=(x,y,fly)=>x>=0&&y>=0&&x<W&&y<H&&!tAt(x,y).block&&(fly||tAt(x,y).k!=='water');
  const used=new Set(), K=(x,y)=>x+','+y;
  const deploy=base.deploy.map(([x,y])=>[x,y]).slice(0,6); deploy.forEach(([x,y])=>used.add(K(x,y)));
  for(let x=0;deploy.length<6&&x<4;x++) for(let y=0;deploy.length<6&&y<H;y++) if(ok(x,y)&&!used.has(K(x,y))){ deploy.push([x,y]); used.add(K(x,y)); }
  const cell=(x0,x1,fly)=>{ for(let t=0;t<400;t++){ const x=Math.floor(W*x0+r()*W*(x1-x0)), y=Math.floor(r()*H); if(ok(x,y,fly)&&!used.has(K(x,y))){ used.add(K(x,y)); return [x,y]; } } return null; };
  const pools=[TG.g,TG.f,TG.a,TG.h,TG.k,TG.u], enemies=[];
  const add=(d,x0=.55,x1=1)=>{ const e=sideEnemy(d,R), c=cell(x0,x1,!!CLS(e.c).fly); if(c){ e.x=c[0]; e.y=c[1]; enemies.push(e); } return e; };
  if(C.boss){ add({cs:TG.k,rl:4,boss:true,tag:'drill',name:'演習頭目機',pilot:'演習教官',ai:'hold'},.8,1); }
  if(C.towers) for(let i=0;i<C.towers;i++) add({c:'tower',rl:0,tag:'ctw'},.6,1);
  for(let i=0;i<C.count;i++) add({cs:C.boss?TG.h:pools[i%pools.length],rl:C.boss?1:(i%3)-1});
  const events=[];
  if(C.waves) for(let t=2;t<=6;t++) events.push({turn:t,phase:'E',lines:[],spawn:[0,1,2].map(i=>{ const e=sideEnemy({cs:pools[(t+i)%pools.length],rl:t>4?1:0},R); e.x=W-1; e.y=Math.floor(H*(i+1)/4); return e; })});
  const win=C.boss?{type:'boss',target:'drill'}:C.towers?{type:'destroy',target:'ctw'}:C.waves?{type:'survive',turns:6}:{type:'all'};
  G.cKills=0;
  return {id:'chal_'+id,chalId:id,challenge:true,label:'演習',no:storyNo(),route:'chal',title:C.name,brief:C.desc,pre:[],post:[],map,deploy:deploy.slice(0,Math.min(6,Math.max(4,G.roster.length))),enemies,events,win,
    turnLimit:C.towers?10:null,chests:[],
    winText:{all:'擊破所有敵機',boss:'擊破演習頭目機',destroy:'破壞 3 座防衛砲台',survive:'堅守 6 回合'}[win.type],loseText:'剛鐵號被擊墜'+(C.towers?'／超過 10 回合':'')};
}
function chalScore(C){
  const mem=G.units.filter(u=>u.side==='P'&&u.member), dep=Math.max(1,G.deployed.length);
  const lost=Math.max(0,dep-mem.length);
  const hpR=mem.reduce((a,u)=>a+u.hp/u.maxHp,0)/dep;
  const turns=C.waves?6:G.turn;
  return {sc:Math.max(0,Math.round(C.score({turns,lost,hpR,kills:G.cKills||0}))),lost,hpR,turns,kills:G.cKills||0};
}
async function chalWin(){
  const ch=CH(), C=CHALLENGES.find(c=>c.id===ch.chalId), s=chalScore(C), rk=chalRank(s.sc);
  const best={...(G.chalBest||{})}, rw={...(G.chalRw||{})}, prev=best[C.id];
  const isBest=prev==null||s.sc>prev; if(isBest) best[C.id]=s.sc;
  const got=[]; let gold=0, part=null;
  if((rk==='A'||rk==='S')&&!rw[C.id+'A']){ rw[C.id+'A']=true; gold=1500; got.push('1,500 G'); }
  if(rk==='S'&&!rw[C.id+'S']){ rw[C.id+'S']=true; part=C.prize; got.push(PARTS[C.prize].name); }
  restore(G.prepSnap); G.free=null;
  G.chalBest=best; G.chalRw=rw; G.gold=(G.gold||0)+gold; if(part){ G.inv[part]=(G.inv[part]||0)+1; }
  await ask(`<h2>演習結果：${C.name}</h2>
    <div class="chal-res"><b class="rk big rk-${rk}">${rk}</b><div><div class="mono" style="font-size:26px">${fmt(s.sc)} 分</div>${isBest?'<small style="color:var(--amber)">新紀錄！</small>':`<small style="color:var(--mute)">最佳紀錄 ${fmt(prev)} 分</small>`}</div></div>
    <p class="mono" style="color:var(--mute)">${C.waves?`擊墜 ${s.kills} 台`:`使用 ${s.turns} 回合`}・剩餘 HP ${Math.round(s.hpR*100)}%・被擊墜 ${s.lost} 台</p>
    <p>${got.length?`獲得獎勵：${got.join('、')}`:'S 級 9,000 分／A 級 7,500 分／B 級 6,000 分'}</p>
    <p style="color:var(--mute);font-size:12.5px">演習中獲得的經驗值與資金不會保留。</p>
    <div class="foot"><button class="btn pri" data-v="ok">回到出擊準備</button></div>`);
  return prep();
}

// =====================================================================
// 天候演出（只有畫面，規則寫在 hitRate）
// =====================================================================
function drawWeather(ctx,cs,now){
  const ch=CH(), w=ch&&ch.weather; if(!w) return;
  const W=G.W*cs, H=G.H*cs, n=Math.round(G.W*G.H*.45);
  if(w==='snow'){
    ctx.fillStyle='rgba(230,240,255,.42)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.92)';
    for(let i=0;i<n;i++){ const sp=.8+(i*7%10)/10, y=((now/1000*sp*cs*1.6+i*53.7*cs/16)%(H+8))-4, x=((i*97.31*cs/16)+Math.sin(now/700+i)*cs*.35+now/1000*cs*.9*sp)%W, r=Math.max(1,Math.round(cs/16*(1+(i%3)*.6)));
      ctx.fillRect(Math.round(x),Math.round(y),r,r); }
  } else if(w==='void'){
    ctx.fillStyle='rgba(40,10,80,.40)'; ctx.fillRect(0,0,W,H);
    for(let i=0;i<n/2;i++){ const sp=.4+(i*7%10)/20, y=H-((now/1000*sp*cs+i*41.3*cs/16)%(H+8)), x=(i*83.7*cs/16+Math.sin(now/900+i)*cs*.4)%W, r=Math.max(1,Math.round(cs/16*(1+(i%2))));
      ctx.fillStyle=i%3?'rgba(170,120,255,.7)':'rgba(255,120,200,.6)'; ctx.fillRect(Math.round(x),Math.round(y),r,r); }
  }
}

// =====================================================================
// 地圖縮放（手機：＋／－按鈕或雙指縮放；放大後可左右拖曳地圖）
// =====================================================================
const ZOOMS=[1,1.5,2,2.5];
let _zoomI=0; try{ _zoomI=Math.max(0,Math.min(ZOOMS.length-1,+(localStorage.getItem(SAVE+'zoom')||0))); }catch(_){}
function mapZoom(){ return ZOOMS[_zoomI]||1; }
function setZoom(i){
  i=Math.max(0,Math.min(ZOOMS.length-1,i)); if(i===_zoomI) return;
  const wrap=document.querySelector('.mapwrap'), fx=wrap&&wrap.scrollWidth>wrap.clientWidth?(wrap.scrollLeft+wrap.clientWidth/2)/wrap.scrollWidth:.5;
  _zoomI=i; try{ localStorage.setItem(SAVE+'zoom',String(i)); }catch(_){}
  fitMap(); render(); zoomUi();
  if(wrap){ const was=wrap.dataset.z==='1', g=G.units.find(u=>u.cid==='gang'&&u.side==='P'), t=G.sel&&G.units.includes(G.sel)?G.sel:!was&&g?g:null;
    const f=t?(t.x+.5)/G.W:fx; wrap.scrollLeft=Math.max(0,f*wrap.scrollWidth-wrap.clientWidth/2); wrap.dataset.z=wrap.scrollWidth>wrap.clientWidth+2?'1':''; }
}
function zoomUi(){ const l=document.getElementById('zLbl'); if(l) l.textContent=Math.round(mapZoom()*100)+'%';
  const a=document.getElementById('zOut'), b=document.getElementById('zIn'); if(a) a.disabled=_zoomI<=0; if(b) b.disabled=_zoomI>=ZOOMS.length-1; }
(function zoomInit(){
  if(typeof document==='undefined'||typeof document.getElementById!=='function') return;
  const ti=document.querySelector('.turninfo'); if(!ti||!ti.insertAdjacentHTML) return;
  ti.insertAdjacentHTML('afterbegin','<span class="zoomctl" role="group" aria-label="地圖縮放"><button class="btn" id="zOut" title="縮小地圖" aria-label="縮小地圖">－</button><span id="zLbl" class="mono">100%</span><button class="btn" id="zIn" title="放大地圖" aria-label="放大地圖">＋</button></span>');
  document.getElementById('zOut').onclick=()=>setZoom(_zoomI-1);
  document.getElementById('zIn').onclick=()=>setZoom(_zoomI+1);
  zoomUi();
  const wrap=document.querySelector('.mapwrap'); if(!wrap) return;
  let d0=0, z0=0;
  const dd=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  wrap.addEventListener('touchstart',e=>{ if(e.touches.length===2){ d0=dd(e.touches); z0=_zoomI; } },{passive:true});
  wrap.addEventListener('touchmove',e=>{ if(e.touches.length!==2||!d0) return; e.preventDefault(); const k=dd(e.touches)/d0;
    const step=k>1.35?Math.floor((k-1)/.35):k<.74?-Math.floor((1/k-1)/.35):0; if(z0+step!==_zoomI) setZoom(z0+step); },{passive:false});
  wrap.addEventListener('touchend',e=>{ if(e.touches.length<2) d0=0; },{passive:true});
  wrap.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); setZoom(_zoomI+(e.deltaY<0?1:-1)); },{passive:false});
})();

// =====================================================================
// 存檔碼（匯出／匯入，用來換裝置）
// =====================================================================
function codeOf(o){ return 'MJ1-'+btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
function parseCode(t){ t=String(t||'').replace(/\s+/g,''); if(!t.startsWith('MJ1-')) return null; try{ return JSON.parse(decodeURIComponent(escape(atob(t.slice(4))))); }catch(e){ return null; } }
async function exportCode(){
  const c=codeOf({s:snapshot(),endings:endingsSeen(),dex:load('dex'),carry:load('carry')});
  const v=await ask(`<h2>匯出存檔碼</h2><p style="color:var(--mute)">把下面整串文字複製起來，在另一台裝置的「讀取存檔 → 輸入存檔碼」貼上，就能接著玩。已見結局與圖鑑也會一起帶過去。</p>
    <textarea id="codeOut" class="code" readonly>${c}</textarea>
    <div class="foot"><button class="btn" data-v="copy">複製</button><button class="btn pri" data-v="ok">完成</button></div>`,'wide');
  if(v!=='copy') return;
  let ok=false; try{ await navigator.clipboard.writeText(c); ok=true; }catch(e){ try{ const t=$('#codeOut'); t.select(); ok=document.execCommand('copy'); }catch(_){} }
  await ask(`<h2>${ok?'已複製':'無法自動複製'}</h2><p>${ok?'存檔碼已經複製到剪貼簿。':'請長按文字框，手動全選並複製。'}</p><div class="foot"><button class="btn pri" data-v="ok">好</button></div>`);
  if(!ok) return exportCode();
}
async function importCode(){
  const v=await ask(`<h2>輸入存檔碼</h2><p style="color:var(--mute)">貼上以「MJ1-」開頭的整串存檔碼。</p>
    <textarea id="codeIn" class="code" placeholder="MJ1-…"></textarea>
    <div class="foot"><button class="btn" data-v="no">取消</button><button class="btn pri" data-v="ok">讀取</button></div>`,'wide');
  if(v!=='ok') return null;
  const d=parseCode($('#codeIn').value);
  if(!d||!d.s||!CHAPTERS[d.s.chapter]||!Array.isArray(d.s.roster)){ await ask(`<h2>存檔碼無效</h2><p>請確認整串文字都有完整貼上。</p><div class="foot"><button class="btn pri" data-v="ok">好</button></div>`); return null; }
  if(Array.isArray(d.endings)) store('endings',[...new Set([...endingsSeen(),...d.endings])]);
  if(d.dex){ const cur=load('dex')||{}; const m={}; for(const k of ['E','T','P']) m[k]=[...new Set([...(cur[k]||[]),...(d.dex[k]||[])])]; store('dex',m); if(typeof _dex!=='undefined') _dex=null; }
  if(d.carry&&(!load('carry')||(d.carry.cycle||0)>=(load('carry').cycle||0))) store('carry',d.carry);
  return d.s;
}

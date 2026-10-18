// 銘甲戰記 — 世界地圖、自由戰場、圖鑑、二周目
// 依賴 engine.js 的全域函式（執行時才呼叫）

// 章節在大陸上的位置（0〜1）
const CH_POS={
  c1:[.14,.26],c2:[.2,.44],c3:[.3,.3],c4:[.42,.42],c5:[.27,.15],
  a6:[.4,.1],a7:[.5,.16],a8:[.6,.09],a9:[.33,.06],a10a:[.7,.13],a10b:[.74,.32],a11:[.81,.38],a12:[.52,.5],a13:[.6,.64],a14:[.69,.74],a15:[.78,.82],
  b6:[.46,.3],b7:[.56,.28],b8:[.66,.42],b9:[.8,.4],b10a:[.87,.27],b10b:[.86,.53],b11:[.33,.06],b12:[.52,.5],b13:[.6,.64],b14:[.69,.74],b15:[.78,.82],
  h6:[.36,.54],h7:[.29,.64],h8:[.4,.71],h9:[.53,.62],h10a:[.46,.81],h10b:[.58,.84],h11:[.33,.06],h12:[.42,.56],h13:[.61,.57],h14:[.69,.74],h15a:[.78,.82],h15b:[.78,.82],
  t15:[.78,.82],
};
// 自由戰場：可以練功、賺資金，每一章各能攻略一次
const FREE_SITES=[
  {id:'wild',  name:'北方荒原',   map:'c1', unlock:2,  pos:[.08,.34], pool:['bing','yi','pao','dun'],            desc:'帝國先鋒的殘部還在荒原上遊蕩。'},
  {id:'mine',  name:'黑石舊礦坑', map:'c2', unlock:3,  pos:[.14,.56], pool:['bing','dun','pao','jia'],           desc:'廢棄礦坑裡，盜掘者的銘甲占地為王。'},
  {id:'canyon',name:'赤石峽谷',   map:'c3', unlock:4,  pos:[.24,.39], pool:['bing','qi','pao','yi','jing'],     desc:'峽谷深處有帝國的補給據點。'},
  {id:'snow',  name:'北境雪原',   map:'a8', unlock:7,  pos:[.56,.07], pool:['lian2','ying','jing','qi'],          desc:'雪原上出沒來路不明的部隊。'},
  {id:'ruins', name:'原字碑外圍', map:'c4', unlock:9,  pos:[.47,.38], pool:['ying','jing','zhong','lian2','te'], desc:'石碑的共鳴吸引了各方勢力。'},
  {id:'rift',  name:'虛無裂縫',   map:'a14',unlock:12, pos:[.67,.88], pool:['ye','xu','te','wei'],               desc:'裂縫中不斷湧出無名之影。'},
];

function storyNo(){ const c=CHAPTERS[G.chapterId]; return c?c.no:1; }
function partyRank(){ const ms=[...G.roster].sort((a,b)=>mRank(b)-mRank(a)).slice(0,6); return ms.length?ms.reduce((s,m)=>s+mRank(m),0)/ms.length:1; }
function freeStatus(s){ if(storyNo()<s.unlock) return 'locked'; if((G.freeDone||{})[s.id]===G.chapterId) return 'done'; return 'open'; }
function freeGold(){ return 250+110*storyNo(); }

function makeFree(id){
  const S=FREE_SITES.find(s=>s.id===id), base=CHAPTERS[S.map];
  const r=rng(((storyNo()*977+id.length*131+Date.now()%1000)>>>0)||1);
  const map=base.map, H=map.length, W=map[0].length, tAt=(x,y)=>TERRAIN[map[y][x]]||TERRAIN['.'];
  const ok=(x,y,fly)=>x>=0&&y>=0&&x<W&&y<H&&!tAt(x,y).block&&(fly||tAt(x,y).k!=='water');
  const used=new Set(), K=(x,y)=>x+','+y;
  // 出擊位置：沿用原地圖，不夠時補在左側
  const deploy=base.deploy.map(([x,y])=>[x,y]).slice(0,6); deploy.forEach(([x,y])=>used.add(K(x,y)));
  for(let x=0;deploy.length<6&&x<4;x++) for(let y=0;deploy.length<6&&y<H;y++) if(ok(x,y)&&!used.has(K(x,y))){ deploy.push([x,y]); used.add(K(x,y)); }
  const n=Math.min(deploy.length,Math.max(4,G.roster.length));
  const R=Math.round(partyRank())-1, enemies=[], count=n+2;
  for(let i=0;i<count;i++){
    const elite=i===0;
    let opts=S.pool.map(c=>({c,lv:R-(CLS(c).tier-1)*10+(elite?2:-Math.floor(r()*3))})).filter(o=>o.lv>=1);
    if(!opts.length){ const lo=S.pool.reduce((a,c)=>CLS(c).tier<CLS(a).tier?c:a); opts=[{c:lo,lv:1}]; }
    const pick=opts[Math.floor(r()*opts.length)], fly=!!CLS(pick.c).fly;
    let cell=null; for(let t=0;t<300&&!cell;t++){ const x=Math.floor(W*.55+r()*W*.45), y=Math.floor(r()*H); if(ok(x,y,fly)&&!used.has(K(x,y))) cell=[x,y]; }
    if(!cell) continue; used.add(K(...cell));
    const e={c:pick.c,lv:pick.lv,x:cell[0],y:cell[1]};
    if(elite) Object.assign(e,{boss:true,name:'精英'+CLS(pick.c).name,ai:'hold'});
    enemies.push(e);
  }
  return {id:'free_'+id,site:id,no:storyNo(),route:'free',title:S.name,brief:S.desc,pre:[],post:[],map,deploy:deploy.slice(0,n),enemies,
    win:{type:'all'},winText:'擊破所有敵機',loseText:'剛鐵號被擊墜'};
}

// ---------------- 世界地圖繪製 ----------------
function drawWorld(cv){
  if(!cv||!cv.getContext) return;
  const W=cv.width, H=cv.height, x=cv.getContext('2d'), T=8, gw=W/T, gh=H/T, r=rng(20261018);
  // 數值雜訊
  const N=[]; for(let i=0;i<(gw+1)*(gh+1);i++) N.push(r());
  const nz=(px,py,s)=>{ const fx=px/s, fy=py/s, ix=Math.floor(fx), iy=Math.floor(fy), tx=fx-ix, ty=fy-iy, g=(a,b)=>N[((b%(gh+1))*(gw+1)+(a%(gw+1)))|0];
    const a=g(ix,iy),b=g(ix+1,iy),c=g(ix,iy+1),d=g(ix+1,iy+1), sx=tx*tx*(3-2*tx), sy=ty*ty*(3-2*ty); return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy; };
  const blobs=[[.2,.32,.2,.28],[.45,.3,.22,.26],[.7,.3,.2,.24],[.55,.62,.24,.26],[.78,.72,.15,.2],[.3,.6,.16,.18],[.88,.45,.1,.18]];
  for(let j=0;j<gh;j++) for(let i=0;i<gw;i++){
    const u=(i+.5)/gw, v=(j+.5)/gh;
    let land=0; for(const [bx,by,rx,ry] of blobs){ const d=((u-bx)/rx)**2+((v-by)/ry)**2; land=Math.max(land,1-d); }
    land+= (nz(i,j,6)-.5)*.55 + (nz(i,j,2.5)-.5)*.2;
    const px=i*T, py=j*T; let col;
    if(land<0){ const deep=land<-.25; col=deep?'#2f6fb8':'#3f86d0'; if(r()<.04) col='#6aa8e6'; }
    else if(land<.06) col='#e8d9a0';
    else {
      const m=nz(i+40,j+20,4), f=nz(i+90,j+60,3);
      const voidZ=Math.hypot(u-.74,v-.8)<.13, north=v<.14;
      if(voidZ) col=(i+j)%2?'#4a2f6e':'#56377e';
      else if(m>.68) col=north?'#f2f6ff':'#9a8a78';
      else if(north) col=r()<.5?'#dfe9f2':'#d2dfeb';
      else if(f>.62) col=r()<.5?'#2f8a4c':'#3a9a56';
      else col=r()<.5?'#78c25a':'#6fba52';
    }
    x.fillStyle=col; x.fillRect(px,py,T,T);
    if(land>=.06&&col==='#9a8a78'){ x.fillStyle='#c8baa6'; x.fillRect(px+3,py+1,2,2); }
  }
  // 雲
  x.fillStyle='rgba(255,255,255,.75)'; for(let k=0;k<6;k++){ const cx=r()*W, cy=r()*H, w=30+r()*40; x.fillRect(cx,cy,w,5); x.fillRect(cx+6,cy-4,w-14,4); }
  // 已走過的路線
  const vis=(G.visited&&G.visited.length?G.visited:[G.chapterId]).filter(id=>CH_POS[id]);
  x.strokeStyle='rgba(255,236,170,.95)'; x.lineWidth=3; x.setLineDash([6,5]); x.beginPath();
  vis.forEach((id,i)=>{ const [u,v]=CH_POS[id]; i?x.lineTo(u*W,v*H):x.moveTo(u*W,v*H); }); x.stroke(); x.setLineDash([]);
  x.font='bold 11px "Noto Sans TC",sans-serif'; x.textAlign='center';
  vis.forEach(id=>{ const [u,v]=CH_POS[id], cur=id===G.chapterId; x.fillStyle=cur?'#ffd25a':'#fff6dc'; x.strokeStyle='#3a2a10'; x.lineWidth=2;
    x.beginPath(); x.arc(u*W,v*H,cur?7:5,0,Math.PI*2); x.fill(); x.stroke(); });
}

async function worldMap(){
  const W=720, H=400, cur=CHAPTERS[G.chapterId], cp=CH_POS[G.chapterId]||[.5,.5];
  const sites=FREE_SITES.map(s=>({s,st:freeStatus(s)}));
  const mk=sites.map(({s,st})=>`<button class="wm-site ${st}" data-v="${st==='open'?'free:'+s.id:''}" ${st==='open'?'':'disabled'} style="left:${s.pos[0]*100}%;top:${s.pos[1]*100}%" title="${st==='locked'?'尚未開放':s.name}"><span>⚔</span></button>`).join('');
  const list=sites.map(({s,st})=>`<button class="btn wm-row" data-v="${st==='open'?'free:'+s.id:''}" ${st==='open'?'':'disabled'}><span><b>${st==='locked'?'？？？':s.name}</b><small>${st==='locked'?`第 ${s.unlock} 章後開放`:s.desc}</small></span><small class="mono">${st==='done'?'本章已攻略':st==='open'?`＋${fmt(freeGold())} G`:''}</small></button>`).join('');
  const p=ask(`<h2>世界地圖</h2><p style="color:var(--mute);margin-top:-4px">黃色虛線是銘甲隊走過的路，<b style="color:var(--amber)">●</b> 是目前所在地「${cur?cur.title:''}」。⚔ 是自由戰場：敵人等級會配合隊伍，每一章各能攻略一次。</p>
    <div class="wm"><canvas id="wmcv" width="${W}" height="${H}"></canvas><span class="wm-cur" style="left:${cp[0]*100}%;top:${cp[1]*100}%"></span>${mk}</div>
    <div class="wm-list">${list}</div>
    <div class="foot"><button class="btn pri" data-v="back">返回出擊準備</button></div>`,'wide');
  drawWorld($('#wmcv'));
  const v=await p; return v&&v.startsWith('free:')?v.slice(5):null;
}

async function freeWin(){
  const ch=CH();
  const alive=new Set(G.units.filter(u=>u.side==='P'&&u.member).map(u=>u.cid)), lv=[];
  for(const m of G.roster){ if(!G.deployed.includes(m.cid)) continue; const before=m.lv; addExp(m,Math.round((alive.has(m.cid)?EXP.clearAlive:EXP.clearDown)/2)); if(m.lv>before) lv.push(`${CHARS[m.cid].pilot} Lv ${m.lv}`); }
  const g=freeGold(); G.gold=(G.gold||0)+g; const battleGold=G.goldGain||0; G.mercs={};
  G.freeDone=G.freeDone||{}; G.freeDone[ch.site]=G.chapterId;
  await ask(`<h2>自由戰場：${ch.title}　攻略成功</h2><p>以 <b>${G.turn}</b> 回合完成。</p>
    <p>獲得資金：擊墜 ${fmt(battleGold)} G ＋ 攻略獎勵 ${fmt(g)} G　→　持有 <b>${fmt(G.gold)} G</b></p>
    ${lv.length?`<p style="color:var(--mute)">升級：${lv.join('、')}</p>`:''}
    <div class="foot"><button class="btn pri" data-v="ok">回到出擊準備</button></div>`);
  G.free=null; return prep();
}

// ---------------- 圖鑑 ----------------
function dexGet(){ const d=load('dex')||{}; return {E:new Set(d.E||[]),T:new Set(d.T||[]),P:new Set(d.P||[])}; }
let _dex=null;
function dexAdd(k,id){ if(!id) return; if(!_dex) _dex=dexGet(); if(_dex[k].has(id)) return; _dex[k].add(id); store('dex',{E:[..._dex.E],T:[..._dex.T],P:[..._dex.P]}); }
function namedFoes(){ const m=new Map(); for(const c of Object.values(CHAPTERS)) for(const e of c.enemies) if(e.tag&&e.pilot&&!m.has(e.tag)) m.set(e.tag,e); return m; }
async function dexMenu(tab='P'){
  const d=dexGet(), seenEnd=new Set(endingsSeen());
  const card=(key,title,sub,body,known)=>`<div class="dx${known?'':' unk'}"><span class="dx-i${iconKey(key)?' hasicon':''}">${known?face(key,'？'):'？'}</span><div><b>${known?title:'？？？'}</b><small>${known?sub:'尚未遇到'}</small>${known&&body?`<p>${body}</p>`:''}</div></div>`;
  let body='';
  if(tab==='P') body=Object.entries(CHARS).map(([k,c])=>{ const cl=CLS(c.cls); return card(k,c.pilot,`${c.mech}・${cl.name}`,cl.desc,d.P.has(k)); }).join('');
  if(tab==='E') body=Object.values(ECLASSES).filter(c=>!c.obj&&!['general','cmdr','emperor','yuanwu','wuking'].includes(c.id)).map(c=>{ const s=c.stats;
    return card(c.id,c.name,`${TIER_NAME[c.tier]}・HP ${fmt(s.hp)}・攻 ${s.atk}・甲 ${fmt(s.def)}・避 ${s.eva}・移 ${s.mov}${c.fly?'・飛行':''}`,c.weapons.map(w=>w.name).join('、'),d.E.has(c.id)); }).join('');
  if(tab==='T') body=[...namedFoes()].map(([t,e])=>card(t,e.pilot,`${e.name||CLS(e.c).name}`,'',d.T.has(t))).join('');
  if(tab==='N') body=allEndings().map(([id,t],i)=>`<div class="dx${seenEnd.has(id)?'':' unk'}"><span class="dx-i">${i+1}</span><div><b>${seenEnd.has(id)?t:'？？？'}</b><small>${seenEnd.has(id)?'已達成':'尚未達成'}</small></div></div>`).join('');
  const cnt={P:[d.P.size,Object.keys(CHARS).length],E:[0,0],T:[d.T.size,namedFoes().size],N:[allEndings().filter(([id])=>seenEnd.has(id)).length,allEndings().length]};
  const eAll=Object.values(ECLASSES).filter(c=>!c.obj&&!['general','cmdr','emperor','yuanwu','wuking'].includes(c.id)); cnt.E=[eAll.filter(c=>d.E.has(c.id)).length,eAll.length];
  const tabs=[['P','我方'],['E','敵機'],['T','宿敵'],['N','結局']].map(([k,n])=>`<button class="btn${k===tab?' on':''}" data-v="tab:${k}">${n} ${cnt[k][0]}/${cnt[k][1]}</button>`).join('');
  const v=await ask(`<h2>圖鑑</h2><div class="dx-tabs">${tabs}</div><div class="dx-grid">${body}</div><div class="foot"><button class="btn pri" data-v="back">返回</button></div>`,'wide');
  if(v&&v.startsWith('tab:')) return dexMenu(v.slice(4));
}

// ---------------- 二周目 ----------------
function saveCarry(){
  const c=load('carry')||{cycle:0};
  const members={}; for(const m of [...G.roster,...Object.values(G.alumni||{})]) members[m.cid]={cls:m.cls,lv:m.lv,pp:m.pp||0,psk:m.psk||{}};
  const inv={...(G.inv||{})}; for(const m of G.roster) for(const p of (m.parts||[])) if(p) inv[p]=(inv[p]||0)+1;
  store('carry',{cycle:Math.max(c.cycle||0,(G.cycle||0)+1),gold:G.gold||0,inv,members});
}

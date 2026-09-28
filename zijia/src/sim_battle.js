// 字甲戰線 — 無頭戰鬥模擬：用機器人實際打完每一章，統計勝率、回合數、陣亡數
// 用法：node sim_battle.js [次數=3] [難度=1] [路線選擇,如 0,1] ...
const fs=require('fs'), vm=require('vm'), path=require('path');
const dir=__dirname;
function fakeEl(){ const f=function(){}; return new Proxy(f,{get:(t,p)=>{ if(p==='classList') return {add(){},remove(){},toggle(){}}; if(p==='style') return {setProperty(){}};
  if(p==='children') return []; if(p==='hidden') return true; if(p==='clientWidth') return 800; if(p===Symbol.toPrimitive) return ()=>''; if(p==='then') return undefined; return fakeEl(); }, set:()=>true, apply:()=>fakeEl()}); }
function makeWorld(seed){
  let s=seed>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  const ctx={console,setTimeout:(f)=>0,clearTimeout(){},Math:Object.create(Math),JSON,Set,Map,Array,Object,Promise,String,Number,Date,
    document:{querySelector:()=>fakeEl(),createElement:()=>fakeEl(),addEventListener(){},removeEventListener(){},documentElement:fakeEl()},
    window:{addEventListener(){}},localStorage:{_:{},getItem(k){return this._[k]??null},setItem(k,v){this._[k]=String(v)}}};
  ctx.Math.random=rnd;
  vm.createContext(ctx);
  const src=['story.js','icons.js','engine.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n')
    +'\n;globalThis.__E={G,CHAPTERS,START,CHARS,GUESTS,CLS,TERRAIN,SPIRITS,EXP,DIFF,MAX_LV,CC_LV,PARTS:(typeof PARTS!=="undefined"?PARTS:null)};globalThis.__F={terrAt,unitAt,inMap,dist,sk,moveCost,terrBonus,addWill,effMove,wMax,key};';
  vm.runInContext(src,ctx); Object.assign(ctx,ctx.__F);
  return ctx;
}
function runRoute(choices,{seed=1,diff=1,verbose=false,persuade=true,maxTries=3,adj=null,useP4=false}={}){
  const W=makeWorld(seed), E=W.__E, G=E.G, CH=()=>E.CHAPTERS[G.chapterId];
  if(adj) for(const [k,v] of Object.entries(adj)) if(E.CHAPTERS[k]) E.CHAPTERS[k].lvAdj=v;
  G.diff=diff; G.anim=false; G.over=true; G.route='common'; G.flags={}; G.roster=[]; G.alumni={}; G.deployed=[];
  ['gang','feng','lei','yu'].forEach(W.joinChar);
  const q=[...choices]; let id=E.START; const report=[];
  while(id){
    const ch=E.CHAPTERS[id]; G.chapterId=id;
    (ch.leavePre||[]).forEach(W.leaveChar); (ch.joinPre||[]).forEach(W.joinChar);
    // 轉職：Lv 到門檻就轉（輪流選分支）
    for(const m of G.roster) while(W.canChange(m)){ const k=W.childrenOf(m.cls,m.cid); const pick=k.find(c=>c.tier===4)||k[(m.cid.charCodeAt(0)+m.cid.length)%k.length]; m.cls=pick.id; m.lv=1; m.exp=0; }
    if(useP4&&E.PARTS){ // 簡單的第四階段玩法：買裝甲、僱傭兵
      if(G.gold==null){ G.gold=1000; G.inv={kit:2}; }
      for(const m of G.roster){ m.parts=m.parts||[null,null]; for(let i=0;i<2;i++) if(!m.parts[i]){ const k=G.gold>=1500?'armor2':'hp1'; if(G.gold>=E.PARTS[k].price+400){ G.gold-=E.PARTS[k].price; m.parts[i]=k; } } }
      G.mercs={}; const dep=[...G.roster].sort((a,b)=>(a.cid==='gang'?-1:0)-(b.cid==='gang'?-1:0)).slice(0,ch.deploy.length);
      for(const m of dep){ G.mercs[m.cid]=[]; for(const t of ['guard','bow']){ const c=W.mercCost(t); if(G.gold>=c){ G.gold-=c; G.mercs[m.cid].push(t);} } }
    }
    const snap=W.snapshot(); let res, tries=0, first=null;
    do{ tries++; W.restore(snap); G.diff=diff; res=playChapter(W,E,ch,persuade); if(first===null) first=res.win; } while(!res.win&&tries<maxTries);
    report.push({id,no:ch.no,title:ch.title,win:res.win,first,tries,turns:res.turns,lost:res.lost,why:res.why,lv:G.roster.map(m=>`${E.CHARS[m.cid].pilot}${E.CLS(m.cls).tier}-${m.lv}`).join(' ')});
    if(!res.win) break;
    // 通關經驗
    const alive=new Set(res.alive);
    for(const m of G.roster){ const b=res.deployed.includes(m.cid)?(alive.has(m.cid)?E.EXP.clearAlive:E.EXP.clearDown):E.EXP.clearBench;
      if(m.lv<E.MAX_LV){ m.exp+=b; while(m.exp>=100&&m.lv<E.MAX_LV){m.exp-=100;m.lv++;} if(m.lv>=E.MAX_LV)m.exp=0; } }
    if(useP4) G.gold=(G.gold||0)+500+100*ch.no;
    (ch.join||[]).forEach(W.joinChar);
    if(ch.ending){ report.push({ending:ch.ending.id}); break; }
    let n=ch.next;
    if(n&&n.branch){ const h=n.branch.find(b=>(b.all||[]).every(f=>G.flags[f])&&!(b.none||[]).some(f=>G.flags[f])); n=h?h.next:n.else; }
    if(n&&n.choice){ let i=q.length?q.shift():0; let o=n.choice.options[i];
      if((o.requires||[]).some(f=>!G.flags[f])) o=n.choice.options.find(x=>!(x.requires||[]).some(f=>!G.flags[f]));
      if(o.route){G.route=o.route;G.flags['route'+o.route]=true;} Object.assign(G.flags,o.flags||{}); n=o.next; }
    id=n;
  }
  return report;
}
function playChapter(W,E,ch,persuade){
  const G=E.G;
  W.setupMap(ch);
  const n=ch.deploy.length;
  const order=[...G.roster].sort((a,b)=>(a.cid==='gang'?-1:0)-(b.cid==='gang'?-1:0)).slice(0,n);
  G.deployed=order.map(m=>m.cid);
  order.forEach((m,i)=>{const [x,y]=ch.deploy[i]; G.units.push(W.mkPlayerUnit(m,x,y));});
  for(const g of (ch.guests||[])) G.units.push(W.mkGuest(g.id,g.lv||5,g.x,g.y));
  for(const [cid,list] of Object.entries(G.mercs||{})){ const cmd=G.units.find(u=>u.cid===cid&&u.side==='P'); const m=G.roster.find(r=>r.cid===cid); if(!cmd||!m) continue;
    for(const type of list){ const f=W.freeNear(cmd.x,cmd.y); if(f) G.units.push(W.mkMerc(type,m,f.x,f.y)); } }
  G.over=false; G.result=null;
  const fire=(phase)=>{ (ch.events||[]).forEach((e,i)=>{ if(G.firedEvents.has(i)||e.turn!==G.turn||(e.phase||'P')!==phase) return; G.firedEvents.add(i);
      for(const d of (e.spawn||[])){ let {x,y}=d; if(W.unitAt(x,y)||W.terrAt(x,y).block){ const f=W.freeNear(x,y); if(!f) continue; x=f.x;y=f.y; } G.units.push(W.mkEnemy({...d,x,y})); } }); };
  const status=()=>{
    const gang=G.units.some(u=>u.cid==='gang'&&u.side==='P'&&u.hp>0);
    if(!gang) return 'lose:gang';
    for(const p of (ch.protect||[])) if(!G.units.some(u=>u.cid===p&&u.hp>0)) return 'lose:protect';
    const es=G.units.filter(u=>u.side==='E'&&u.hp>0), w=ch.win;
    if(w.type==='boss'&&G.seenTags.has(w.target)&&!es.some(u=>u.tag===w.target)) return 'win';
    if(w.type==='escape'){ const g=G.units.find(u=>u.cid===(w.who||'gang')); if(g&&w.cells.some(([x,y])=>g.x===x&&g.y===y)) return 'win'; }
    if(es.length===0&&w.type!=='escape'){ const pend=(ch.events||[]).some((e,i)=>!G.firedEvents.has(i)&&(e.spawn||[]).length); if(pend){ (ch.events||[]).forEach((e,i)=>{ if(!G.firedEvents.has(i)){ G.firedEvents.add(i); for(const d of (e.spawn||[])){ let {x,y}=d; if(W.unitAt(x,y)||W.terrAt(x,y).block){const f=W.freeNear(x,y); if(!f) continue; x=f.x;y=f.y;} G.units.push(W.mkEnemy({...d,x,y})); } } }); return null; } return 'win'; }
    return null;
  };
  const cleanup=()=>{ for(const u of G.units) if(u.hp<=0) u.dead=true;
    for(const e of G.units) if(e.side==='E'&&!e.dead&&e.retreat&&e.hp<=e.maxHp*e.retreat) e.dead=true;
    G.units=G.units.filter(u=>!u.dead); };
  let lost=0; const lostSet=new Set();
  const countLost=()=>{ for(const u of G.units) if(u.side==='P'&&u.hp<=0&&!lostSet.has(u.uid)){lostSet.add(u.uid);lost++;} };
  for(G.turn=1; G.turn<=30; G.turn++){
    // ---- 我方 ----
    G.phase='P';
    if(ch.win.type==='survive'&&G.turn>ch.win.turns) return fin('win');
    if(ch.turnLimit&&G.turn>ch.turnLimit) return fin('lose:turnlimit');
    for(const u of G.units.filter(u=>u.side==='P')){u.acted=false;u.moved=false;['sure','focus','wall','accel','snipe'].forEach(k=>u.st[k]=false);u.en=Math.min(u.maxEn,u.en+10);}
    W.phaseUpkeep('P'); fire('P'); let st=status(); if(st) return fin(st);
    const ps=G.units.filter(u=>u.side==='P').sort((a,b)=>(a.skills.heal?1:0)-(b.skills.heal?1:0));
    for(const u of ps){ if(u.hp<=0||!G.units.includes(u)) continue; botAct(W,E,u,ch,persuade); countLost(); cleanup(); st=status(); if(st) return fin(st); }
    // ---- 敵方 ----
    G.phase='E'; W.phaseUpkeep('E'); fire('E'); st=status(); if(st) return fin(st);
    const es=G.units.filter(u=>u.side==='E');
    for(const e of es){ if(e.hp<=0||!G.units.includes(e)) continue; enemyAct(W,E,e); countLost(); cleanup(); st=status(); if(st) return fin(st); }
  }
  return fin('lose:timeout');
  function fin(r){ return {win:r==='win',why:r,turns:G.turn,lost,alive:G.units.filter(u=>u.side==='P'&&u.member).map(u=>u.cid),deployed:G.deployed}; }
}
function react(W,E,e,w,t,d){
  const cw=W.bestWeapon(t,e,d);
  const h0=W.hitRate(e,w,t,null)/100, d0=W.calcDmg(e,w,t,null), dg=W.calcDmg(e,w,t,'guard'), he=W.hitRate(e,w,t,'evade')/100;
  const opts=[['guard',h0*dg,null],['evade',he*d0,null]]; if(cw) opts.push(['counter',h0*d0-150,cw]);
  if(d0>=t.hp) opts.forEach(o=>{ if(o[0]==='counter') o[1]+=5000; });
  opts.sort((a,b)=>a[1]-b[1]); return {react:opts[0][0],cw:opts[0][2]};
}
function strikeBattle(W,E,att,w,def,rc){
  const seq=[]; const {react:r,cw}=rc;
  const first=r==='counter'&&cw&&def.skills.counterFirst;
  if(first){ W.strike(def,cw,att,null,seq); if(att.hp>0) W.strike(att,w,def,r,seq); }
  else { W.strike(att,w,def,r,seq); if(def.hp>0&&att.hp>0&&r==='counter'&&cw) W.strike(def,cw,att,null,seq); }
}
function enemyAct(W,E,e){
  const G=E.G;
  let {best,reach,low}=W.aiPlan(e); let dest;
  if(low&&e.ai!=='hold'&&!(best&&best.kill)){ best=null; dest=W.retreatDest(e,reach); }
  else dest=best?best.v:(e.ai==='hold'?null:W.approachDest(e,reach));
  if(dest){ e.x=dest.x; e.y=dest.y; e.moved=!(dest.c===0); }
  if(best){ const t=best.t, d=W.dist(e,t); strikeBattle(W,E,e,best.w,t,t.st.dodge?{react:'guard',cw:null}:react(W,E,e,best.w,t,d)); }
  e.moved=false;
}
function dangerMap(W,E){
  const G=E.G, m=new Map();
  for(const e of G.units.filter(u=>u.side==='E')){ const pw=Math.max(...e.weapons.map(w=>w.pow))+e.atk*10; for(const k of W.threatCells(e)) m.set(k,(m.get(k)||0)+pw); }
  return m;
}
function botAct(W,E,u,ch,persuade){
  const G=E.G, key=(x,y)=>x+','+y;
  const reach=W.reachable(u), ox=u.x, oy=u.y, dm=dangerMap(W,E);
  const enemies=G.units.filter(x=>x.side==='E');
  // 精神：低 HP 時鐵壁／根性
  const useSp=n=>{ const sp=E.SPIRITS[n]; if(u.spirits.includes(n)&&u.sp>=sp.cost&&!(sp.flag&&u.st[sp.flag])){ u.sp-=sp.cost; if(sp.flag) u.st[sp.flag]=true; if(n==='根性') u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.3)); if(n==='氣合') W.addWill(u,10); return true;} return false; };
  if(u.hp<u.maxHp*0.35){ useSp('根性')||useSp('鐵壁'); }
  // 說服
  if(persuade){ for(const e of enemies){ if(!(e.talk&&e.talk.by.includes(u.cid))) continue;
    for(const v of reach.values()){ if(!v.stop) continue; if(Math.abs(v.x-e.x)+Math.abs(v.y-e.y)===1){ u.x=v.x;u.y=v.y;
      if(e.talk.flag) G.flags[e.talk.flag]=true; e.hp=0; e.dead=true; G.units=G.units.filter(x=>x!==e);
      if(e.talk.join){ const m=W.joinChar(e.talk.join); if(m){ const nu=W.mkPlayerUnit(m,e.x,e.y); nu.acted=true; G.units.push(nu);} } return; } } } }
  // 修理
  const heal=u.skills.heal;
  if(heal){ let bestH=null;
    for(const v of reach.values()){ if(!v.stop) continue;
      for(const a of G.units.filter(x=>x.side==='P'&&x!==u&&x.hp<x.maxHp*0.65)){ const d=Math.abs(v.x-a.x)+Math.abs(v.y-a.y); if(d<heal.min||d>heal.max) continue;
        const sc=(a.maxHp-a.hp)-(dm.get(key(v.x,v.y))||0)*0.2; if(!bestH||sc>bestH.sc) bestH={sc,v,a}; } }
    if(bestH){ u.x=bestH.v.x;u.y=bestH.v.y; const a=bestH.a; a.hp=Math.min(a.maxHp,a.hp+Math.round(a.maxHp*heal.pct/100)); W.gainExp(u,E.EXP.repair); return; } }
  // 脫離：主角能到出口就直接走
  const esc=ch.win.type==='escape'&&u.cid===(ch.win.who||'gang');
  if(esc){ const ex=ch.win.cells.find(([x,y])=>{const v=reach.get(key(x,y)); return v&&v.stop;}); if(ex){ u.x=ex[0]; u.y=ex[1]; return; } }
  // 攻擊
  let best=null;
  for(const v of reach.values()){ if(!v.stop) continue; const moved=!(v.x===ox&&v.y===oy); u.x=v.x; u.y=v.y;
    const danger=dm.get(key(v.x,v.y))||0;
    for(const t of enemies){ if(persuade&&t.talk&&G.units.some(p=>p.side==='P'&&t.talk.by.includes(p.cid))&&enemies.length>1) continue; const d=Math.abs(v.x-t.x)+Math.abs(v.y-t.y);
      for(const w of u.weapons){ if(W.whyNot(u,w,d,moved)) continue;
        const r=W.aiReact(t,u,d); const hr=W.hitRate(u,w,t,r.react)/100, dmg=W.calcDmg(u,w,t,r.react), kill=dmg>=t.hp;
        let sc=hr*Math.min(dmg,t.hp)+(kill?2000*hr:0)+(t.boss?300:0)+(ch.win.target&&t.tag===ch.win.target?600:0)+(kill&&u.cid==='gang'?900*hr:0);
        if(r.cw&&!(kill&&hr>0.85)){ const ce=W.hitRate(t,r.cw,u,null)/100*W.calcDmg(t,r.cw,u,null); sc-=ce*0.7; if(ce>=u.hp) sc-=3000; }
        const cautious=u.cid==='gang'||(ch.protect||[]).includes(u.cid)?2:1;
        sc-=Math.min(danger,u.hp*2)*0.25*cautious; if(danger>u.hp*1.3/cautious) sc-=1500*cautious;
        if(!best||sc>best.sc) best={sc,v,t,w,r,moved};
      }}}
  u.x=ox; u.y=oy;
  const tkGoal=persuade&&enemies.find(e=>e.talk&&e.talk.by.includes(u.cid));
  if(best&&best.sc>-800&&!(esc&&!(best.t&&W.calcDmg(u,best.w,best.t,null)>=best.t.hp))){
    u.x=best.v.x; u.y=best.v.y; u.moved=best.moved;
    if(best.t.boss||best.t.tag===ch.win.target){ if(W.hitRate(u,best.w,best.t,best.r.react)<70) useSp('必中'); useSp('魂')||useSp('熱血'); }
    strikeBattle(W,E,u,best.w,best.t,best.r); u.moved=false; return;
  }
  // 移動：朝目標前進，但避開高危險格
  const goal=[];
  if(ch.win.type==='escape'&&u.cid===(ch.win.who||'gang')) ch.win.cells.forEach(([x,y])=>goal.push([x,y]));
  else if(ch.win.type==='survive'){ /* 守住：原地或更安全 */ }
  else { const tk=persuade&&enemies.find(e=>e.talk&&e.talk.by.includes(u.cid)); if(tk) goal.push([tk.x,tk.y]); else enemies.forEach(e=>goal.push([e.x,e.y])); }
  const f=distField(W,E,u,goal);
  let bm=null;
  for(const v of reach.values()){ if(!v.stop) continue; const danger=dm.get(key(v.x,v.y))||0; const t=W.terrAt(v.x,v.y);
    let sc=-(f?f[v.y][v.x]:0)*40 - Math.max(0,danger-u.hp*0.6)*0.5 + (u.fly?0:t.def*300) + (t.heal&&u.hp<u.maxHp*.7?400:0);
    if(ch.win.type==='escape'&&u.cid===(ch.win.who||'gang')) sc=-(f?f[v.y][v.x]:0)*200-danger*0.1;
    if(!bm||sc>bm.sc) bm={sc,v}; }
  if(bm){ u.x=bm.v.x; u.y=bm.v.y; }
}
function distField(W,E,u,goals){
  if(!goals.length) return null; const G=E.G, INF=1e9;
  const f=Array.from({length:G.H},()=>Array(G.W).fill(INF)); const pq=[];
  for(const [x,y] of goals){ f[y][x]=0; pq.push([0,x,y]); }
  while(pq.length){ pq.sort((a,b)=>a[0]-b[0]); const [c,x,y]=pq.shift(); if(c>f[y][x]) continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=G.W||ny>=G.H) continue; const mc=W.moveCost(u,nx,ny); if(mc>=99) continue; if(c+mc<f[ny][nx]){f[ny][nx]=c+mc;pq.push([c+mc,nx,ny]);} } }
  return f;
}
module.exports={runRoute};
if(require.main===module){
  const runs=+(process.argv[2]||3), diff=+(process.argv[3]||1);
  const paths=process.argv.slice(4).length?process.argv.slice(4).map(s=>s.split(',').map(Number)):[[0,1],[1,1],[2,0,1]];
  for(const p of paths){
    const agg={};
    for(let r=0;r<runs;r++){ const rep=runRoute(p,{seed:1000+r*7919,diff});
      for(const x of rep){ if(x.ending){ (agg._end=agg._end||[]).push(x.ending); continue; }
        const a=agg[x.id]=agg[x.id]||{no:x.no,title:x.title,n:0,wins:0,tries:0,turns:0,lost:0,lv:x.lv,why:{}};
        a.n++; a.wins+=x.win?1:0; a.tries+=x.tries; a.turns+=x.turns; a.lost+=x.lost; a.lv=x.lv; if(!x.win) a.why[x.why]=(a.why[x.why]||0)+1; } }
    console.log(`\n=== 選擇 ${p.join(',')}｜難度 ${diff}｜${runs} 次 ===`);
    for(const [id,a] of Object.entries(agg)){ if(id==='_end') continue;
      console.log(`${String(a.no).padStart(2)} ${id.padEnd(5)} ${a.title.padEnd(8,'　')} 通過${a.wins}/${a.n} 平均嘗試${(a.tries/a.n).toFixed(1)} 回合${(a.turns/a.n).toFixed(1)} 陣亡${(a.lost/a.n).toFixed(1)} ${Object.keys(a.why).length?JSON.stringify(a.why):''}  [${a.lv}]`); }
    console.log('結局:',(agg._end||[]).join(','));
  }
}

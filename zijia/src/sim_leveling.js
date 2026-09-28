const fs=require('fs');const dir=__dirname+'/';
const story=fs.readFileSync(dir+'story.js','utf8'), eng=fs.readFileSync(dir+'engine.js','utf8');
const part=eng.slice(0,eng.indexOf('// 章節流程'));
const env=new Function('document',story+'\n'+part+';return {CHAPTERS,START,CHARS,G,statsOf,mkPlayerUnit,mkEnemy,calcDmg,expFor,childrenOf,CLS,MAX_LV,CC_LV,EXP,joinChar,leaveChar};')({querySelector:()=>null});
const {CHAPTERS,G,mkPlayerUnit,mkEnemy,calcDmg,expFor,childrenOf,CLS,EXP,joinChar,leaveChar,CHARS}=env;
function run(choices,persuade){
  G.roster=[];G.route='common';G.flags={};G.alumni={};['gang','feng','lei','yu'].forEach(joinChar);
  let id='c1'; const out=[]; const q=[...choices];
  while(id){
    const ch=CHAPTERS[id]; G.chapterId=id;
    (ch.leavePre||[]).forEach(leaveChar);(ch.joinPre||[]).forEach(joinChar);
    G.roster.forEach(m=>{ if(m.lv>=env.CC_LV){const k=childrenOf(m.cls,m.cid); if(k.length){m.cls=k[k.length-1].id;m.lv=1;m.exp=0;}}});
    G.map=Array.from({length:12},()=>Array(18).fill('.'));G.W=18;G.H=12;G.units=[];
    const dep=G.roster.slice(0,ch.deploy.length);
    const pu=dep.map((m,i)=>{const u=mkPlayerUnit(m,0,i);u.will=115;return u;});
    const give=(u,amt)=>{const m=u.member;if(m.lv>=env.MAX_LV){m.exp=0;return;}m.exp+=Math.round(amt);while(m.exp>=100&&m.lv<env.MAX_LV){m.exp-=100;m.lv++;}if(m.lv>=env.MAX_LV)m.exp=0;
      const s=env.statsOf(m.cls,m.lv,CHARS[m.cid].mod);Object.assign(u,{atk:s.atk,def:s.def,hit:s.hit,eva:s.eva,lv:m.lv});};
    let rr=0;
    for(const d of [...ch.enemies,...(ch.events||[]).flatMap(e=>e.spawn||[])]){
      if(d.talk&&persuade){ if(d.talk.flag) G.flags[d.talk.flag]=true; if(d.talk.join) joinChar(d.talk.join); continue; }
      const e=mkEnemy({...d,x:17,y:0}); e.will=105; const stop=d.retreat?e.maxHp*d.retreat:0; let g=0;
      while(e.hp>stop&&g++<80){ pu.sort((a,b)=>((a.tier-1)*10+a.lv)-((b.tier-1)*10+b.lv)); const u=pu[rr++%Math.min(2,pu.length)];
        const w=u.weapons.filter(w=>!w.will||w.will<=115).reduce((a,b)=>b.pow>a.pow?b:a);
        e.hp=Math.max(0,e.hp-calcDmg(u,w,e,null)); give(u,expFor(u,e,e.hp===0)); }
    }
    pu.filter(u=>u.skills.heal).forEach(u=>{for(let i=0;i<4;i++)give(u,EXP.repair);});
    G.roster.forEach(m=>{const b=dep.includes(m)?EXP.clearAlive:EXP.clearBench;if(m.lv<env.MAX_LV){m.exp+=b;while(m.exp>=100&&m.lv<env.MAX_LV){m.exp-=100;m.lv++;}if(m.lv>=env.MAX_LV)m.exp=0;}});
    (ch.join||[]).forEach(joinChar);
    out.push(`${String(ch.no).padStart(2)} ${id.padEnd(5)} `+G.roster.map(m=>`${CHARS[m.cid].pilot}:${CLS(m.cls).name}${m.lv}`).join(' '));
    if(ch.ending){ out.push('  → 結局 '+ch.ending.id); break; }
    let n=ch.next;
    if(n&&n.branch){const h=n.branch.find(b=>(b.all||[]).every(f=>G.flags[f])&&!(b.none||[]).some(f=>G.flags[f]));n=h?h.next:n.else;}
    if(n&&n.choice){const o=n.choice.options[q.shift()]; if(o.route){G.route=o.route;G.flags['route'+o.route]=true;} Object.assign(G.flags,o.flags||{}); n=o.next;}
    id=n;
  }
  return out;
}
for(const [c,label] of [[[0,1],'守護之字→真結局'],[[1,0],'赤環之誓'],[[2,0,1],'無銘・歸還']]){ console.log('\n## '+label); const o=run(c,true); o.filter((l,i)=>[3,4,7,9,11,12,13,14,15,16].includes(i)).forEach(l=>console.log(l)); }

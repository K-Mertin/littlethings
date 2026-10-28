// 銘甲戰記 — 外傳與演習挑戰的無頭模擬：沿主線打到開放時機，實際打一次外傳／演習
// 用法：node sim_side.js [次數=3] [難度=1] [路線選擇,如 0,1] ...
//   SIDE_ONLY=1 只跑外傳；CHAL=1 也跑演習挑戰（第 4／8／12 章各一次）
const {runRoute,playChapter}=require('./sim_battle.js');
const runs=+(process.argv[2]||3), diff=+(process.argv[3]||1);
const paths=process.argv.slice(4).length?process.argv.slice(4).map(s=>s.split(',').map(Number)):[[0,1],[1,1],[2,0,1]];
const doChal=!!process.env.CHAL;
for(const p of paths){
  const agg={}, chal={}, main={};
  for(let r=0;r<runs;r++){
    const tried=new Set();
    const hook=(W,E,ch,report)=>{
      const G=E.G, S=W.__S; G.sideDone=G.sideDone||{};
      for(const sd of S.SIDES){ if(tried.has(sd.id)||S.sideStatus(sd)!=='open') continue; tried.add(sd.id);
        const snap=W.snapshot(); let res, tries=0, first=null;
        do{ tries++; W.restore(snap); G.chapterId=ch.id; G.diff=diff; const sc=S.makeSide(sd.id); G.free=sc; res=playChapter(W,E,sc,true); G.free=null; if(first===null) first=res.win; } while(!res.win&&tries<3);
        const a=agg[sd.id]=agg[sd.id]||{title:sd.title,n:0,win:0,first:0,turns:0,lost:0,rec:0,at:[],why:{}};
        a.n++; a.win+=res.win?1:0; a.first+=first?1:0; a.turns+=res.turns; a.lost+=res.lost; a.at.push(ch.no); if(!res.win) a.why[res.why]=(a.why[res.why]||0)+1;
        if(!res.win){ W.restore(snap); continue; }
        const alive=new Set(res.alive);
        for(const m of G.roster){ if(!res.deployed.includes(m.cid)) continue; m.exp+=Math.round((alive.has(m.cid)?E.EXP.clearAlive:E.EXP.clearDown)/2); while(m.exp>=100&&m.lv<E.MAX_LV){m.exp-=100;m.lv++;} if(m.lv>=E.MAX_LV) m.exp=0; }
        if(sd.join){ W.joinChar(sd.join); G.flags[sd.join+'Joined']=true; }
        const ok=!sd.recruit||G.flags[sd.recruit]; if(ok&&sd.recruit) a.rec++;
        G.sideDone[sd.id]=ok?true:'again';
      }
      if(doChal&&[4,8,12].includes(ch.no)&&!tried.has('chal'+ch.no)){ tried.add('chal'+ch.no);
        for(const C of S.CHALLENGES){ const snap=W.snapshot(); G.chapterId=ch.id; G.diff=diff; const sc=S.makeChal(C.id); G.free=sc; const res=playChapter(W,E,sc,true);
          const s=res.win?S.chalScore(C):null; G.free=null; W.restore(snap);
          const k=C.id+'@'+ch.no, a=chal[k]=chal[k]||{n:0,win:0,sc:[],why:{}}; a.n++; if(res.win){ a.win++; a.sc.push(s.sc+S.chalRank(s.sc)); } else a.why[res.why]=(a.why[res.why]||0)+1; } }
    };
    const rep=runRoute(p,{seed:1000+r*7919,diff,hook,useP4:!!process.env.P4});
    for(const x of rep){ if(x.ending){ (main._end=main._end||[]).push(x.ending); continue; } const a=main[x.id]=main[x.id]||{no:x.no,n:0,win:0,first:0}; a.n++; a.win+=x.win?1:0; a.first+=x.first?1:0; }
  }
  console.log(`\n=== 選擇 ${p.join(',')}｜難度 ${diff}｜${runs} 次（含外傳${doChal?'、演習':''}）===`);
  for(const [id,a] of Object.entries(agg)) console.log(`外傳 ${id} ${a.title.padEnd(8,'　')} 第${[...new Set(a.at)].join('/')}章 通過${a.win}/${a.n} 首勝${a.first}/${a.n} 回合${(a.turns/a.n).toFixed(1)} 陣亡${(a.lost/a.n).toFixed(1)}${a.rec?` 招募${a.rec}`:''} ${Object.keys(a.why).length?JSON.stringify(a.why):''}`);
  for(const [k,a] of Object.entries(chal)) console.log(`演習 ${k.padEnd(10)} 通過${a.win}/${a.n} 分數 ${a.sc.join(' ')} ${Object.keys(a.why).length?JSON.stringify(a.why):''}`);
  const fails=Object.entries(main).filter(([,a])=>a.win<a.n).map(([id,a])=>`${id} ${a.win}/${a.n}`);
  console.log('主線章節:',Object.keys(main).length,'章　未全勝:',fails.join('、')||'無','　結局:',(main._end||[]).join(','));
}

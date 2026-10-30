// 隨機產生吃子／逃子戰術題候選（只在開發時用）
import { N, group, buildTree, makeCtx } from './go-engine.mjs';
const COLS='ABCDEFGHJ', name=p=>p<0?'pass':COLS[p%N]+(N-((p/N)|0));
let seed = +(process.argv[2]||1); const rnd=()=>((seed=Math.imul(seed^(seed>>>15),2246822507)+0x9e3779b9|0)>>>0)/4294967296;
const goal = process.argv[3]||'capture', want=+(process.argv[4]||2), count=+(process.argv[5]||5);
const R=6, C=7; let found=0, tries=0;
while(found<count && tries<200000){ tries++;
  const b=new Array(81).fill(0);
  const place=(col,n)=>{ let p=((rnd()*R)|0)*N+((rnd()*C)|0); for(let i=0;i<n;i++){ if(b[p]===0) b[p]=col; const r=(p/N)|0,c=p%N, d=[[0,1],[1,0],[0,-1],[-1,0]][(rnd()*4)|0]; const rr=r+d[0],cc=c+d[1]; if(rr>=0&&rr<R&&cc>=0&&cc<C) p=rr*N+cc; } };
  place(2, 2+((rnd()*3)|0)); place(1, 2+((rnd()*3)|0)); place(1, 2+((rnd()*3)|0)); place(2, 1+((rnd()*3)|0)); if(rnd()<.6) place(1, 2+((rnd()*2)|0)); if(rnd()<.5) place(2,1+((rnd()*2)|0));
  // 所有棋都至少兩口氣（目標除外）
  let okb=true; for(let p=0;p<81;p++) if(b[p]&&group(b,p).libs.length<2) { okb=false; break; } if(!okb) continue;
  const tcol = goal==='capture'?2:1;
  const cands=[]; for(let p=0;p<81;p++) if(b[p]===tcol){ const g=group(b,p); if(g.stones[0]===p||Math.min(...g.stones)===p) if(g.stones.length>=2 && g.libs.length>=2 && g.libs.length<=3) cands.push(p); }
  if(!cands.length) continue;
  const t=cands[(rnd()*cands.length)|0];
  const pz={b,goal,target:t,region:null,k:want};
  let res; try{ res=buildTree(pz);}catch(e){continue;}
  if(res.err||res.k!==want||res.first.length!==1) continue;
  if(Object.keys(res.tree.bad).length<2) continue;
  // 逃子題：如果黑脫先，白要能吃掉
  if(goal==='save'){ const C=makeCtx({...pz,goal:'capture'}); }
  // 刪掉無關的棋（拿掉後答案不變就刪）
  const sig=r=>r.k+':'+r.first.join(',');
  const s0=sig(res);
  for(let p=0;p<81;p++){ if(!b[p]||p===t) continue; const g=group(b,p); if(g.stones.includes(t)) continue;
    const save=g.stones.map(x=>[x,b[x]]); g.stones.forEach(x=>b[x]=0);
    let r2=null; try{ r2=buildTree({b,goal,target:t,region:null,k:want}); }catch(e){}
    if(!r2||r2.err||sig(r2)!==s0||r2.first.length!==1) save.forEach(([x,v])=>b[x]=v); else res=r2; }
  // 主變化不要有虛手
  let hasPass=false,nn=res.tree; while(nn){const m=Object.keys(nn.ok)[0]; if(m==null)break; const v=nn.ok[m]; if(v.r===-1) hasPass=true; nn=v.n;} if(hasPass) continue;
  let stones=0; for(let p=0;p<81;p++) if(b[p]) stones++; if(stones<5) continue;
  found++;
  const rows=[]; for(let r=0;r<R;r++){ let s=''; for(let c=0;c<C;c++){const v=b[r*N+c]; s+=v===1?'X':v===2?'O':'.';} rows.push(s); }
  let n=res.tree,line=[];while(n){const m=Object.keys(n.ok)[0];if(m==null)break;const v=n.ok[m];line.push(name(+m)+(v.r!=null?'>'+name(v.r):''));n=v.n;}
  console.log(JSON.stringify({s:rows,t:[(t/N)|0,t%N],g:goal,k:want}), '//', line.join(' '));
}

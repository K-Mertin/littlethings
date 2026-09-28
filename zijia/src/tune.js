// 自動調整各章敵方等級：目標 首戰勝率 60%〜90%
const {runRoute}=require('./sim_battle.js');
const fs=require('fs');
const N=+(process.argv[2]||8);
const paths=process.env.PATHS?JSON.parse(process.env.PATHS):[[0,1],[0,0],[1,1],[1,0],[2,0,1],[2,1,0]];
let adj={};
try{ adj=JSON.parse(fs.readFileSync(__dirname+'/lvadj.json','utf8')); }catch(e){}
const settled=new Set();
for(let iter=0;iter<60;iter++){
  let changed=false;
  for(const p of paths){
    const stat={};
    for(let r=0;r<N;r++){ const rep=runRoute(p,{seed:1000+r*7919,adj,maxTries:5});
      for(const x of rep){ if(x.ending) continue; const a=stat[x.id]=stat[x.id]||{no:x.no,n:0,first:0,win:0,lost:0,turns:0}; a.n++; a.first+=x.first?1:0; a.win+=x.win?1:0; a.lost+=x.lost; a.turns+=x.turns; } }
    // 依章節順序找第一個不合格的
    const ids=Object.keys(stat).sort((a,b)=>stat[a].no-stat[b].no);
    for(const id of ids){ const a=stat[id]; if(a.n<Math.ceil(N/2)) break; const fr=a.first/a.n;
      if(fr<0.5&&(adj[id]||0)<=-6){ if(!settled.has('!'+id)){ settled.add('!'+id); console.log(`⚠ ${id} 已降 6 級仍首勝 ${fr.toFixed(2)}，需要結構調整`);} continue; }
      if(fr<0.5&&(adj[id]||0)>-6){ adj[id]=(adj[id]||0)-1; changed=true; console.log(`iter${iter} ${p} ${id} 首勝${fr.toFixed(2)} → lvAdj ${adj[id]}`); break; }
      if(fr>0.95&&a.lost/a.n<0.3&&a.no>=3&&(adj[id]||0)<2&&!settled.has(id)){ adj[id]=(adj[id]||0)+1; settled.add(id); changed=true; console.log(`iter${iter} ${p} ${id} 太簡單(首勝${fr.toFixed(2)}) → lvAdj ${adj[id]}`); break; }
    }
    if(changed) break;
  }
  fs.writeFileSync(__dirname+'/lvadj.json',JSON.stringify(adj,null,1));
  if(!changed){ console.log('穩定'); break; }
}
console.log(JSON.stringify(adj));

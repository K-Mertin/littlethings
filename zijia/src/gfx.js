'use strict';
// =====================================================================
// 銘甲戰記 — 圖像模組：像素地形、畫布地圖、戰鬥演出、標題背景
// （只在瀏覽器中被呼叫；模擬器載入時不會執行任何繪圖）
// =====================================================================

// 地圖設施與寶箱的像素圖
const OBJ_ICONS={"gate": {"pal": {"k": "#1a0f2e", "p": "#5b2a9a", "P": "#9b5cf0", "w": "#e6d0ff", "E": "#ff3a6a", "g": "#3a3550", "G": "#6a6488"}, "rows": ["................", ".......kk.......", "......kPPk......", ".....kPwwPk.....", "....kPwPPpPk....", "...kPwPEEPppk...", "...kPPPEEPppk...", "....kPPPPppk....", ".....kPpppk.....", "......kppk......", ".......kk.......", "....kkkkkkkk....", "...kGGGGGGGGk...", "..kGgGgGgGgGgk..", "..kgggggggggk...", "...kkkkkkkkk...."]}, "tower": {"pal": {"k": "#1c222b", "s": "#7d8ba2", "S": "#a9b6c9", "b": "#2b3442", "r": "#ff4a3a", "y": "#f3c43b", "d": "#5a6476"}, "rows": ["................", "..........kkkkk.", "......kkkkbbbbbk", ".....kSSSkkkkkk.", "....kSssssk.....", "....kSsrrsk.....", "....kSsrrsk.....", "....kSssssk.....", "...kkkkkkkkk....", "...kSSSSSSSk....", "...kSsssssdk....", "..kSSsssssddk...", "..kSsyyyyysdk...", "..kSssssssddk...", ".kkkkkkkkkkkkk..", "................"]}, "bwall": {"pal": {"k": "#22272e", "s": "#8a929c", "S": "#b3bac2", "c": "#3a3f46", "d": "#6a727c"}, "rows": ["................", "kkkkkkkkkkkkkkkk", "kSSSsskSSSSsskSk", "ksssddkssscddksk", "kkkkkkkkkkckkkkk", "kSskSSSSskcSSSsk", "ksdkssscdccsssdk", "kkkkkkkkckkkkkkk", "kSSSsskScckSSSsk", "ksssddkcsddksssk", "kkkkkkckkkkkkkkk", "kSskSScSskSSSSsk", "ksdkssssdkssssdk", "kkkkkkkkkkkkkkkk", "................", "................"]}, "chest": {"pal": {"k": "#3a220f", "w": "#9a5a2a", "W": "#c47a3a", "y": "#f3c43b", "Y": "#fff0a0"}, "rows": ["................", "................", "................", "...kkkkkkkkkk...", "..kWWWWWWWWWWk..", "..kWwwwwwwwwWk..", "..kyyyyyyyyyyk..", "..kwwwwkkwwwwk..", "..kkkkkyYkkkkk..", "..kWWWWyyWWWWk..", "..kwwwwkkwwwwk..", "..kwwwwwwwwwwk..", "..kyyyyyyyyyyk..", "...kkkkkkkkkk...", "................", "................"]}};
if(typeof ICONS!=='undefined') Object.assign(ICONS,OBJ_ICONS);
const GFX={tiles:{}, sprites:{}, mapOn:false, cs:32, dpr:1, hover:null, fx:[], last:0, raf:0, titleRaf:0};

function mkCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const ease={out:p=>1-(1-p)*(1-p), in:p=>p*p, io:p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2, back:p=>1+2.7*Math.pow(p-1,3)+1.7*Math.pow(p-1,2)};

// ---------------- 地形圖塊（16×16 像素，程序產生） ----------------
const TREE=['..ddd..','.dmmld.','dmmmlld','dmmmmld','.dmmmd.','..dtd..','...t...'];
const TREE_C={d:'#1d5a33',m:'#2f8a4c',l:'#5cbf6e',t:'#6b4426'};
function genTile(kind,v,frame){
  const c=mkCanvas(16,16), x=c.getContext('2d'), r=rng(kind.charCodeAt(0)*977+v*131+frame*17+7);
  const px=(i,j,col)=>{ if(i<0||j<0||i>15||j>15) return; x.fillStyle=col; x.fillRect(i,j,1,1); };
  const rect=(i,j,w,h,col)=>{ x.fillStyle=col; x.fillRect(i,j,w,h); };
  const grass=()=>{ rect(0,0,16,16,'#78c257');
    for(let n=0;n<16;n++) px(r()*16|0,r()*16|0,r()<.55?'#66ae48':'#95d76d');
    for(let n=0;n<3;n++){ const i=r()*14|0,j=r()*14|0; px(i,j,'#57983c'); px(i+1,j-1,'#57983c'); } };
  const pat=(rows,colors,ox,oy)=>rows.forEach((row,j)=>[...row].forEach((ch,i)=>{ if(colors[ch]) px(ox+i,oy+j,colors[ch]); }));
  switch(kind){
    case 'plain': grass(); if(v===2){ px(4,5,'#fff6a8'); px(11,10,'#ffb3c7'); px(8,13,'#fff6a8'); px(13,3,'#ffb3c7'); } break;
    case 'forest': grass(); pat(TREE,TREE_C,1,1); pat(TREE,TREE_C,8,6); if(v!==1) pat(TREE,TREE_C,2,9); else pat(TREE,TREE_C,9,0); break;
    case 'mount': { grass(); const peaks=v===1?[[5,4,6],[11,6,5]]:[[8,2,8]];
      for(const [cx,top,half] of peaks) for(let y=top;y<16;y++){ const w=Math.min(half,Math.round((y-top)*0.75)+1);
        for(let i=cx-w;i<=cx+w;i++){ let col=i<cx?'#b9a98f':'#8c7b66'; if(i===cx-w||i===cx+w) col='#5e5244';
          if(y<top+3) col=i<cx?'#f4f6f8':'#cdd5de'; if(y===top+3&&(i+y)%2===0) col='#f4f6f8'; px(i,y,col);} }
      break; }
    case 'water': { rect(0,0,16,16,'#3b8fd9');
      for(let n=0;n<10;n++) px(r()*16|0,r()*16|0,'#3381cb');
      const off=frame?2:0;
      for(const [i,j] of [[2,3],[9,6],[4,11],[12,13],[13,2]]){ const ii=(i+off)%16; px(ii,j,'#9fd4ff'); px((ii+1)%16,j,'#9fd4ff'); px((ii+2)%16,j-1,'#cfeaff'); }
      break; }
    case 'wall': { rect(0,0,16,16,'#8a929b');
      for(let j=0;j<16;j+=4){ rect(0,j,16,1,'#5d646c'); const o=(j/4)%2?4:0; for(let i=o;i<16;i+=8) rect(i,j,1,4,'#5d646c'); rect(0,j+1,16,1,'#a7afb8'); }
      for(let n=0;n<8;n++) px(r()*16|0,r()*16|0,'#7a828b'); break; }
    case 'base': { rect(0,0,16,16,'#aeb6be'); rect(0,0,16,1,'#c8cfd6'); rect(0,15,16,1,'#8f98a2'); rect(0,0,1,16,'#c8cfd6'); rect(15,0,1,16,'#8f98a2');
      for(let j=0;j<16;j++)for(let i=0;i<16;i++){ const d=Math.hypot(i-7.5,j-7.5); if(d>5&&d<6.4) px(i,j,'#f3c43b'); else if(d<=4.2) px(i,j,'#8b949e'); }
      rect(6,5,1,6,'#f3c43b'); rect(9,5,1,6,'#f3c43b'); rect(6,7,4,1,'#f3c43b'); break; }
    case 'ruin': { rect(0,0,16,16,'#b49b78'); for(let n=0;n<18;n++) px(r()*16|0,r()*16|0,r()<.5?'#9c8463':'#c8b08c');
      const blk=(i,j,w,h)=>{ rect(i,j,w,h,'#8f969e'); rect(i,j,w,1,'#b8bec5'); rect(i,j+h-1,w,1,'#6b7178'); rect(i+w-1,j,1,h,'#6b7178'); };
      blk(1,3,5,4); blk(9,8,6,5); if(v!==1) blk(3,11,4,3); else blk(10,1,4,4);
      for(let n=0;n<5;n++) px(r()*16|0,r()*16|0,'#7a8088'); break; }
  }
  return c;
}
function tileImg(kind,v,frame){ const k=kind+v+'_'+(kind==='water'?frame:0); return GFX.tiles[k]||(GFX.tiles[k]=genTile(kind,v,kind==='water'?frame:0)); }

// ---------------- 角色圖（由 ICONS 產生：一般／灰階／白閃） ----------------
function spriteSet(key){
  if(GFX.sprites[key]!==undefined) return GFX.sprites[key];
  if(typeof ICONS==='undefined'||!ICONS[key]) return GFX.sprites[key]=null;
  const d=ICONS[key], mk=fn=>{ const c=mkCanvas(16,16), x=c.getContext('2d');
    d.rows.forEach((r,y)=>[...r].forEach((ch,i)=>{ if(ch!=='.'&&d.pal[ch]){ x.fillStyle=fn(d.pal[ch]); x.fillRect(i,y,1,1); } })); return c; };
  const gray=hex=>{ const n=parseInt(hex.slice(1),16), l=Math.round(((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11)*.75); return `rgb(${l},${l},${l})`; };
  return GFX.sprites[key]={n:mk(h=>h), g:mk(gray), w:mk(()=>'#ffffff')};
}
const TEAM={P:'#3a8fff',E:'#ff4a3a',guest:'#3fd17a',merc:'#7fc8ff'};
function teamColor(u){ return u.merc?TEAM.merc:u.guest?TEAM.guest:TEAM[u.side]; }

// ---------------- 地圖特效（浮動數字、爆炸、升級） ----------------
function mapFx(x,y,text,color,opt={}){ if(!GFX.mapOn) return; GFX.fx.push({x,y,text,color,t0:performance.now()+(opt.delay||0),dur:opt.dur||1100,big:!!opt.big,kind:opt.kind||'text'}); }
function mapBoom(x,y,delay=0){ if(!GFX.mapOn) return; GFX.fx.push({x,y,kind:'boom',t0:performance.now()+delay,dur:700}); }

// ---------------- 地圖：尺寸與繪製 ----------------
function gfxActive(){ return typeof document!=='undefined'&&typeof document.getElementById==='function'&&typeof requestAnimationFrame!=='undefined'&&!!document.getElementById('mapcv')&&!G.classic; }
function gfxResize(){
  if(typeof document==='undefined'||typeof document.getElementById!=='function') return;
  const cv=document.getElementById('mapcv'); if(!cv) return;
  GFX.mapOn=gfxActive();
  const map=document.getElementById('map');
  map.classList.toggle('spr',GFX.mapOn);
  cv.hidden=!GFX.mapOn;
  if(!GFX.mapOn) return;
  const cs=GFX.cs, dpr=Math.min(2,window.devicePixelRatio||1); GFX.dpr=dpr;
  cv.style.width=G.W*cs+'px'; cv.style.height=G.H*cs+'px';
  cv.width=Math.round(G.W*cs*dpr); cv.height=Math.round(G.H*cs*dpr);
}
function gfxPickCs(avail,W){
  const raw=avail/W;
  if(raw>=32) return Math.min(64,Math.floor(raw/16)*16);   // 整數倍放大，像素清楚
  return Math.max(20,Math.floor(raw));
}
function startMapLoop(){
  if(GFX.raf||typeof requestAnimationFrame==='undefined') return;
  const loop=now=>{ GFX.raf=requestAnimationFrame(loop); try{ if(GFX.mapOn&&G.map&&G.map.length) drawMap(now); }catch(e){ console.error(e); } };
  GFX.raf=requestAnimationFrame(loop);
}
function drawMap(now){
  const cv=document.getElementById('mapcv'); if(!cv||cv.hidden) return;
  const ctx=cv.getContext('2d'), cs=GFX.cs, dt=Math.min(0.05,(now-(GFX.last||now))/1000); GFX.last=now;
  ctx.setTransform(GFX.dpr,0,0,GFX.dpr,0,0); ctx.imageSmoothingEnabled=false;
  const frame=Math.floor(now/650)%2, ov=G.ov||{};
  // 地形
  for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
    const t=terrAt(x,y), v=((x*73856093)^(y*19349663))>>>0;
    ctx.drawImage(tileImg(t.k,v%3,frame),x*cs,y*cs,cs,cs);
    if(t.k==='water'){ // 岸邊浪花
      ctx.fillStyle='rgba(225,245,255,.85)'; const b=Math.max(2,cs/10);
      if(y>0&&terrAt(x,y-1).k!=='water') ctx.fillRect(x*cs,y*cs,cs,b);
      if(y<G.H-1&&terrAt(x,y+1).k!=='water') ctx.fillRect(x*cs,(y+1)*cs-b,cs,b);
      if(x>0&&terrAt(x-1,y).k!=='water') ctx.fillRect(x*cs,y*cs,b,cs);
      if(x<G.W-1&&terrAt(x+1,y).k!=='water') ctx.fillRect((x+1)*cs-b,y*cs,b,cs);
    }
  }
  // 格線
  ctx.strokeStyle='rgba(0,0,0,.07)'; ctx.lineWidth=1; ctx.beginPath();
  for(let x=1;x<G.W;x++){ ctx.moveTo(x*cs+.5,0); ctx.lineTo(x*cs+.5,G.H*cs); }
  for(let y=1;y<G.H;y++){ ctx.moveTo(0,y*cs+.5); ctx.lineTo(G.W*cs,y*cs+.5); }
  ctx.stroke();
  // 範圍
  const fill=(set,col,edge)=>{ if(!set) return; for(const k of set){ const [x,y]=k.split(',').map(Number);
    ctx.fillStyle=col; ctx.fillRect(x*cs,y*cs,cs,cs); if(edge){ ctx.strokeStyle=edge; ctx.lineWidth=1; ctx.strokeRect(x*cs+1.5,y*cs+1.5,cs-3,cs-3); } } };
  fill(ov.thr,'rgba(255,60,50,.17)');
  fill(ov.ra,'rgba(255,90,70,.22)','rgba(255,140,120,.35)');
  fill(ov.mv,'rgba(70,140,255,.40)','rgba(170,215,255,.65)');
  fill(ov.atk,'rgba(255,80,60,.40)','rgba(255,170,150,.6)');
  fill(ov.rep,'rgba(80,220,120,.38)','rgba(170,255,200,.6)');
  if(ov.exit){ const pulse=.5+.5*Math.sin(now/300); ctx.setLineDash([4,3]); ctx.strokeStyle=`rgba(120,255,160,${.5+pulse*.5})`; ctx.lineWidth=2;
    for(const k of ov.exit){ const [x,y]=k.split(',').map(Number); ctx.strokeRect(x*cs+3,y*cs+3,cs-6,cs-6); } ctx.setLineDash([]); }
  // 寶箱
  const cs2=spriteSet('chest');
  for(const c of (G.chests||[])){ if(c.taken||!cs2) continue; const b=Math.sin(now/400+c.x)*cs*.03;
    ctx.globalAlpha=.25; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(c.x*cs+cs/2,c.y*cs+cs*.86,cs*.3,cs*.08,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.drawImage(cs2.n,c.x*cs,c.y*cs+b,cs,cs);
    if(Math.floor(now/250+c.x*3)%8===0){ ctx.fillStyle='#fff8c0'; ctx.fillRect(c.x*cs+cs*.66,c.y*cs+cs*.25+b,Math.max(2,cs/12),Math.max(2,cs/12)); } }
  // 機體
  const us=[...G.units].sort((a,b)=>a.y-b.y);
  for(const u of us) drawUnit(ctx,u,cs,now,dt);
  // 游標
  const bracket=(x,y,col,inset,len)=>{ const X=x*cs+inset,Y=y*cs+inset,S=cs-inset*2,L=len; ctx.strokeStyle=col; ctx.lineWidth=2; ctx.beginPath();
    ctx.moveTo(X,Y+L);ctx.lineTo(X,Y);ctx.lineTo(X+L,Y); ctx.moveTo(X+S-L,Y);ctx.lineTo(X+S,Y);ctx.lineTo(X+S,Y+L);
    ctx.moveTo(X+S,Y+S-L);ctx.lineTo(X+S,Y+S);ctx.lineTo(X+S-L,Y+S); ctx.moveTo(X+L,Y+S);ctx.lineTo(X,Y+S);ctx.lineTo(X,Y+S-L); ctx.stroke(); };
  const pul=Math.sin(now/180);
  for(const k of (ov.tgt||[])){ const [x,y]=k.split(',').map(Number); bracket(x,y,'#ff5a46',1+pul*1.5,cs*.3); }
  if(['target','repair','talk'].includes(G.mode)&&G.targets&&G.targets.length){ const n=G.targets.length, t=G.targets[((G.tgtIdx||0)%n+n)%n];
    if(t){ const tx=t._px??t.x, ty=t._py??t.y; ctx.lineWidth=3; bracket(tx,ty,'#ffd25a',-2+pul*1.5,cs*.36); ctx.fillStyle='#ffd25a'; const ax=tx*cs+cs/2, ay=ty*cs-2-Math.abs(pul)*3;
      ctx.beginPath(); ctx.moveTo(ax-cs*.14,ay-cs*.16); ctx.lineTo(ax+cs*.14,ay-cs*.16); ctx.lineTo(ax,ay); ctx.closePath(); ctx.fill(); } }
  for(const k of (ov.ally||[])){ const [x,y]=k.split(',').map(Number); bracket(x,y,'#6dff9a',1+pul*1.5,cs*.3); }
  if(G.sel&&G.units.includes(G.sel)){ const u=G.sel; bracket(u._px??u.x,u._py??u.y,'#ffd25a',1+pul,cs*.32); }
  if(GFX.hover&&inMap(GFX.hover.x,GFX.hover.y)) bracket(GFX.hover.x,GFX.hover.y,'rgba(255,255,255,.85)',2,cs*.22);
  // 特效
  drawMapFx(ctx,cs,now);
}
function drawUnit(ctx,u,cs,now,dt){
  if(u._px==null||Math.abs(u._px-u.x)+Math.abs(u._py-u.y)>4){ u._px=u.x; u._py=u.y; }
  const k=Math.min(1,dt*16); u._px+=(u.x-u._px)*k; u._py+=(u.y-u._py)*k;
  const X=u._px*cs, Y=u._py*cs, sc=cs/16, phase=(u.uid||0)*0.9;
  const wall=u.cls==='bwall', bob=(u.acted||u.obj)?0:Math.round(Math.sin(now/380+phase)*(u.fly?1.6:0.6)*sc)/1;
  const lift=u.fly?Math.round(3*sc):0;
  // 影子與陣營底座
  if(!wall){ ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(X+cs/2,Y+cs*.86,cs*(u.fly?.26:.36),cs*.11,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=teamColor(u); ctx.globalAlpha=u.acted?.35:.9; ctx.lineWidth=Math.max(1.5,cs/18);
  ctx.beginPath(); ctx.ellipse(X+cs/2,Y+cs*.86,cs*.38,cs*.13,0,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
  const key=iconKey(u), sp=key&&spriteSet(key);
  const size=wall?cs:cs*(u.merc?.78:.92), sx=X+(cs-size)/2, sy=wall?Y:Y+cs-size-cs*.06-lift+bob;
  if(sp){ ctx.drawImage(u.acted?sp.g:sp.n,sx,sy,size,size); }
  else { ctx.fillStyle=u.side==='E'?'#5a1d1b':'#153250'; ctx.beginPath(); ctx.arc(X+cs/2,sy+size/2,size*.42,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=u.side==='E'?'#ff8f7e':'#8fd0ff'; ctx.font=`900 ${Math.round(size*.5)}px "Noto Serif TC",serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(u.ch,X+cs/2,sy+size/2+1); }
  // 頭目皇冠、說服氣泡
  if(u.boss){ const cx=X+cs/2, cy=sy-cs*.04, w=cs*.28; ctx.fillStyle='#f3c43b'; ctx.beginPath();
    ctx.moveTo(cx-w/2,cy); ctx.lineTo(cx-w/2,cy-w*.45); ctx.lineTo(cx-w/4,cy-w*.2); ctx.lineTo(cx,cy-w*.55); ctx.lineTo(cx+w/4,cy-w*.2); ctx.lineTo(cx+w/2,cy-w*.45); ctx.lineTo(cx+w/2,cy); ctx.closePath(); ctx.fill(); }
  if(u.talk){ const bx=X+cs*.04, by=Y+cs*.04, w=cs*.3; ctx.fillStyle='#effff3'; ctx.fillRect(bx,by,w,w*.7); ctx.fillStyle='#2f9a55'; ctx.fillRect(bx+w*.2,by+w*.28,w*.12,w*.12); ctx.fillRect(bx+w*.45,by+w*.28,w*.12,w*.12); ctx.fillRect(bx+w*.7,by+w*.28,w*.12,w*.12); }
  // HP 條
  const r=u.hp/u.maxHp, bw=cs*.76, bx=X+(cs-bw)/2, by=Y+cs-Math.max(3,cs/11)-1, bh=Math.max(3,cs/11);
  ctx.fillStyle='rgba(10,14,18,.75)'; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
  ctx.fillStyle=r>.5?'#6fe08c':r>.25?'#f3c43b':'#ff5a46'; ctx.fillRect(bx,by,Math.max(1,bw*r),bh);
}
function drawMapFx(ctx,cs,now){
  GFX.fx=GFX.fx.filter(f=>now<f.t0+f.dur);
  for(const f of GFX.fx){ if(now<f.t0) continue; const p=(now-f.t0)/f.dur, X=(f.x+.5)*cs, Y=(f.y+.3)*cs;
    if(f.kind==='boom'){ const R=cs*(.2+p*.9); ctx.globalAlpha=1-p;
      ctx.fillStyle='#fff3b0'; ctx.beginPath(); ctx.arc(X,Y+cs*.2,R*.55,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ff8a3a'; ctx.lineWidth=cs*.12*(1-p)+1; ctx.beginPath(); ctx.arc(X,Y+cs*.2,R,0,Math.PI*2); ctx.stroke();
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+f.x; ctx.fillStyle=i%2?'#ffcf3a':'#ff6a3a'; ctx.fillRect(X+Math.cos(a)*R*1.1-2,Y+cs*.2+Math.sin(a)*R*1.1-2,4,4); }
      ctx.globalAlpha=1; continue; }
    const rise=ease.out(Math.min(1,p*1.6))*cs*.55, a=p<.75?1:1-(p-.75)/.25;
    ctx.globalAlpha=a; ctx.textAlign='center'; ctx.textBaseline='middle';
    const fs=Math.round(cs*(f.big?.42:.32));
    ctx.font=`${fs}px "Press Start 2P","DotGothic16",monospace`;
    ctx.lineWidth=Math.max(3,fs/3.2); ctx.strokeStyle='rgba(12,16,22,.9)'; ctx.strokeText(f.text,X,Y-rise);
    ctx.fillStyle=f.color; ctx.fillText(f.text,X,Y-rise); ctx.globalAlpha=1; }
}

// =====================================================================
// 戰鬥演出
// =====================================================================
function weaponKind(w){
  const n=w.name||'';
  if(/飛彈|彈|雨|手雷|爆雷/.test(n)) return 'missile';
  if(/光|砲|雷擊|波|輪|狙擊|射|加農|十字|審判|崩壞|終焉|天罰/.test(n)&&w.max>1) return 'beam';
  if(w.max<=1) return 'melee';
  return 'bullet';
}
function tween(dur,step){
  return new Promise(res=>{ if(G.skip||dur<=0||typeof requestAnimationFrame==='undefined'){ step(1); res(); return; }
    const t0=performance.now(); const f=now=>{ const p=Math.min(1,(now-t0)/dur); step(p); if(p<1&&!G.skip) requestAnimationFrame(f); else { step(1); res(); } }; requestAnimationFrame(f); });
}
function battleBg(terrKind,W,H){
  const c=mkCanvas(W,H), x=c.getContext('2d'), r=rng(terrKind.length*31+5);
  const sky=x.createLinearGradient(0,0,0,H*.7);
  const skies={water:['#5fb4ff','#cbeaff'],mount:['#6a8fd8','#d9e4ff'],forest:['#64b6f0','#d6f2ff'],ruin:['#e0a070','#ffe2b8'],base:['#5d7fb8','#c9d8f2'],plain:['#5aaef0','#d4efff'],wall:['#6d7fa0','#cfd8e6']};
  const [s1,s2]=skies[terrKind]||skies.plain; sky.addColorStop(0,s1); sky.addColorStop(1,s2); x.fillStyle=sky; x.fillRect(0,0,W,H);
  // 雲
  x.fillStyle='rgba(255,255,255,.85)';
  for(let i=0;i<5;i++){ const cx=r()*W, cy=20+r()*70, w=40+r()*70; x.fillRect(cx,cy,w,8); x.fillRect(cx+8,cy-6,w-20,6); x.fillRect(cx+4,cy+8,w-10,4); }
  const ground=H*.72;
  // 遠景
  if(terrKind==='mount'){ x.fillStyle='#8a90b8'; for(let i=-1;i<8;i++){ const cx=i*110+r()*40, h=90+r()*60; x.beginPath(); x.moveTo(cx-90,ground); x.lineTo(cx,ground-h); x.lineTo(cx+90,ground); x.fill(); x.fillStyle='#eef2ff'; x.beginPath(); x.moveTo(cx-18,ground-h+20); x.lineTo(cx,ground-h); x.lineTo(cx+18,ground-h+20); x.fill(); x.fillStyle='#8a90b8'; } }
  else if(terrKind==='water'){ x.fillStyle='#3f8fd8'; x.fillRect(0,ground-50,W,50); x.fillStyle='#9fd4ff'; for(let i=0;i<30;i++) x.fillRect(r()*W,ground-48+r()*44,10+r()*14,2); }
  else if(terrKind==='ruin'){ x.fillStyle='#a8876a'; for(let i=0;i<9;i++){ const bx=i*85+r()*30, h=30+r()*70, w=26+r()*24; x.fillRect(bx,ground-h,w,h); x.fillStyle='#c8a684'; x.fillRect(bx,ground-h,w,4); x.fillStyle='#a8876a'; } }
  else if(terrKind==='base'||terrKind==='wall'){ x.fillStyle='#7d8ba2'; x.fillRect(0,ground-70,W,70); x.fillStyle='#95a3ba'; for(let i=0;i<W;i+=60) x.fillRect(i,ground-70,40,8); x.fillStyle='#f3c43b'; x.fillRect(0,ground-12,W,4); }
  else { x.fillStyle='#5aa860'; for(let i=-1;i<6;i++){ const cx=i*150+r()*60, rr=80+r()*50; x.beginPath(); x.ellipse(cx,ground,rr*1.6,rr*.7,0,Math.PI,0); x.fill(); }
    if(terrKind==='forest'){ for(let i=0;i<14;i++){ const tx=r()*W, ty=ground-10-r()*30, s=3+r()*2; x.fillStyle='#2f8a4c'; x.fillRect(tx-4*s,ty-6*s,8*s,7*s); x.fillStyle='#1d5a33'; x.fillRect(tx-4*s,ty,8*s,s); x.fillStyle='#6b4426'; x.fillRect(tx-s/2,ty+s,s,3*s); } } }
  // 地面（像素圖塊 ×4）
  const gk={water:'water',mount:'plain',forest:'plain',ruin:'ruin',base:'base',wall:'wall',plain:'plain'}[terrKind]||'plain';
  for(let gx=0;gx<W;gx+=64) for(let gy=ground;gy<H;gy+=64){ x.imageSmoothingEnabled=false; x.drawImage(tileImg(gk==='base'?'plain':gk,(gx/64)%3,0),gx,gy,64,64); }
  if(gk==='base'){ x.fillStyle='rgba(174,182,190,.9)'; x.fillRect(0,ground,W,H-ground); x.fillStyle='#8f98a2'; for(let i=0;i<W;i+=48) x.fillRect(i,ground,2,H-ground); }
  x.fillStyle='rgba(0,0,0,.18)'; x.fillRect(0,ground,W,6);
  return c;
}
async function playBattleScene(L,R,seq,hp0,line){
  const ov=$('#battle');
  const W=720, H=300;
  const panel=(u,cls)=>`<div class="bt-side ${u.side}" id="bt-${cls}"><div class="bt-name"><b>${u.name}</b>　${u.pilot}<br><small>${CLS(u.cls).name} Lv${u.lv}</small></div><div class="bar hp"><i style="width:${hp0[u.uid]/u.maxHp*100}%"></i></div><div class="bt-hp">${fmt(hp0[u.uid])} / ${fmt(u.maxHp)}</div></div>`;
  ov.innerHTML=`<div class="bt bt2"><canvas id="btcv" width="${W}" height="${H}"></canvas>
    <div class="bt-hud">${panel(L,'L')}<div class="bt-mid"><div class="bt-w" id="bt-w"></div></div>${panel(R,'R')}</div>
    <div class="bt-line" id="bt-line">${line}</div><div class="bt-skip">點擊畫面跳過</div></div>`;
  ov.hidden=false; ov.onclick=skipAll;
  const cv=$('#btcv'), ctx=cv.getContext('2d');
  const ground=H*.72;
  const mkSide=(u,left)=>({u,left,x:left?190:W-190,y:ground,off:0,hop:0,flash:0,alpha:1,sink:0,sp:spriteSet(iconKey(u)||'')});
  const S={A:mkSide(L,true),B:mkSide(R,false),parts:[],texts:[],beams:[],shots:[],flashA:0,shake:0,slash:[]};
  const bg=battleBg((R.fly?'plain':terrAt(R.x,R.y).k),W,H);
  let running=true, last=performance.now();
  const draw=now=>{ if(!running) return; const dt=Math.min(.05,(now-last)/1000); last=now;
    ctx.save(); ctx.imageSmoothingEnabled=false;
    const sh=S.shake; ctx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh*.6); S.shake*=Math.pow(.02,dt);
    ctx.drawImage(bg,0,0);
    for(const sd of [S.A,S.B]) drawFighter(ctx,sd,now);
    // 光束
    S.beams=S.beams.filter(b=>now<b.t0+b.dur);
    for(const b of S.beams){ const p=(now-b.t0)/b.dur, len=Math.min(1,p*3), a=p<.6?1:1-(p-.6)/.4, x2=b.x1+(b.x2-b.x1)*len;
      ctx.globalAlpha=a; ctx.strokeStyle=b.col; ctx.lineWidth=14*(1-p*.5); ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(b.x1,b.y); ctx.lineTo(x2,b.y); ctx.stroke();
      ctx.strokeStyle='#ffffff'; ctx.lineWidth=5*(1-p*.5); ctx.beginPath(); ctx.moveTo(b.x1,b.y); ctx.lineTo(x2,b.y); ctx.stroke(); ctx.globalAlpha=1; }
    // 飛彈與子彈
    S.shots=S.shots.filter(s=>now<s.t0+s.dur+80);
    for(const s of S.shots){ const p=Math.max(0,Math.min(1,(now-s.t0)/s.dur)); if(now<s.t0) continue;
      const x=s.x1+(s.x2-s.x1)*p, y=s.y1+(s.y2-s.y1)*p-Math.sin(p*Math.PI)*s.arc;
      if(s.kind==='missile'){ ctx.fillStyle='rgba(220,220,220,.6)'; for(let i=1;i<5;i++){ const q=Math.max(0,p-i*.04); ctx.fillRect(s.x1+(s.x2-s.x1)*q-2,s.y1+(s.y2-s.y1)*q-Math.sin(q*Math.PI)*s.arc-2,4,4);} ctx.fillStyle='#ffcf3a'; ctx.fillRect(x-4,y-3,8,6); ctx.fillStyle='#fff'; ctx.fillRect(x-2,y-1,4,2); }
      else { ctx.fillStyle=s.col; ctx.fillRect(x-7,y-1.5,14,3); } }
    // 斬擊
    S.slash=S.slash.filter(s=>now<s.t0+s.dur);
    for(const s of S.slash){ const p=(now-s.t0)/s.dur; ctx.globalAlpha=1-p; ctx.strokeStyle='#ffffff'; ctx.lineWidth=6*(1-p)+1; ctx.beginPath(); ctx.arc(s.x,s.y,46+p*10,s.dir>0?-1.9:1.25,s.dir>0?-0.2:2.95); ctx.stroke(); ctx.strokeStyle=s.col; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,40+p*10,s.dir>0?-1.9:1.25,s.dir>0?-0.2:2.95); ctx.stroke(); ctx.globalAlpha=1; }
    // 粒子
    S.parts=S.parts.filter(q=>q.life>0);
    for(const q of S.parts){ q.life-=dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=q.g*dt; ctx.globalAlpha=Math.max(0,Math.min(1,q.life/q.max)); ctx.fillStyle=q.col; ctx.fillRect(q.x-q.s/2,q.y-q.s/2,q.s,q.s); }
    ctx.globalAlpha=1;
    // 數字
    S.texts=S.texts.filter(t=>now<t.t0+t.dur);
    for(const t of S.texts){ const p=(now-t.t0)/t.dur, y=t.y-ease.out(Math.min(1,p*2.2))*40, sc=p<.15?ease.back(p/.15):1;
      ctx.globalAlpha=p<.8?1:1-(p-.8)/.2; ctx.save(); ctx.translate(t.x,y); ctx.scale(sc,sc);
      ctx.font=`${t.size}px "Press Start 2P","DotGothic16",monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=7; ctx.strokeStyle='#10161b'; ctx.strokeText(t.text,0,0); ctx.fillStyle=t.col; ctx.fillText(t.text,0,0); ctx.restore(); ctx.globalAlpha=1; }
    ctx.restore();
    if(S.cut) drawCutIn(ctx,S.cut,now,W,H);
    if(S.flashA>0){ ctx.fillStyle=`rgba(255,255,255,${S.flashA})`; ctx.fillRect(0,0,W,H); S.flashA=Math.max(0,S.flashA-dt*2.2); }
    requestAnimationFrame(draw); };
  requestAnimationFrame(draw);
  const burst=(x,y,n,cols,spd=260,g=420,size=5)=>{ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=spd*(.35+Math.random()*.8); S.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,g,col:cols[i%cols.length],s:size*(.6+Math.random()*.8),life:.5+Math.random()*.5,max:1}); } };
  const pop=(x,y,text,col,size=22,dur=1100)=>S.texts.push({x,y,text,col,size,t0:performance.now(),dur});
  const lineEl=$('#bt-line');
  const say=(u,kind,opp)=>{ const t=typeof pickQuote==='function'?pickQuote(u,kind,opp):''; if(!t||!lineEl) return false;
    lineEl.innerHTML=`<span class="bq ${u.side}"><span class="bqf${iconKey(u)?' hasicon':''}">${face(u,u.ch)}</span><span><b>${u.pilot}</b>「${t}」</span></span>`; return true; };
  const named=u=>!!(u.cid||u.tag||u.boss);
  await sleep(250);
  for(const s of seq){
    const atkL=s.a===L||(s.a!==R&&s.a.side===L.side), A=atkL?S.A:S.B, D=atkL?S.B:S.A, dir=atkL?1:-1;
    const support=s.a!==L&&s.a!==R;
    $('#bt-w').innerHTML=`${support?'<small>援護</small> ':''}${s.a.ch}【${s.w.name}】`;
    const special=s.w.will>0&&named(s.a);
    if(special&&!G.skip){
      const q=typeof pickQuote==='function'?pickQuote(s.a,'sp',s.d):'';
      if(q) say(s.a,'sp',s.d);
      sfx('cutin'); S.cut=makeCut(s.a,s.w,q,atkL); await sleep(S.cut.dur); S.cut=null;
    } else if(s===seq[0]||Math.random()<.45) say(s.a,'atk',s.d);
    const kind=weaponKind(s.w), col=A.u.side==='E'?'#ff7a5a':'#6fd0ff';
    const ax=A.x+A.off, ay=A.y-56, dx=D.x, dy=D.y-56;
    if(kind==='melee'){
      sfx('fire'); const dist=Math.abs(dx-ax)-96;
      await tween(200,p=>A.off=dir*dist*ease.in(p));
      S.slash.push({x:D.x-dir*10,y:dy,dir,col,t0:performance.now(),dur:260});
    } else if(kind==='beam'){
      sfx('beam'); await tween(120,p=>A.off=-dir*8*p);
      S.beams.push({x1:ax+dir*40,x2:dx,y:ay+4,col,t0:performance.now(),dur:520});
      await sleep(180);
    } else {
      const n=kind==='missile'?4:6, travel=kind==='missile'?420:220;
      for(let i=0;i<n;i++) S.shots.push({kind,x1:ax+dir*40,y1:ay+(i%3-1)*8,x2:dx,y2:dy+(i%3-1)*10,arc:kind==='missile'?50+i*12:0,col,t0:performance.now()+i*70,dur:travel});
      sfx(kind==='missile'?'missile':'fire');
      await sleep(travel+(n-1)*70-40);
    }
    if(s.hit){
      D.flash=1; S.shake=(s.crit?22:12)+(special?10:0); if(s.crit||special) S.flashA=special?.7:.55;
      burst(D.x,dy,(s.crit?30:16)+(special?24:0),['#fff3b0','#ffcf3a','#ff8a3a','#ffffff']);
      if(special) burst(D.x,dy,18,[col,'#ffffff'],420,120,8);
      pop(D.x,dy-40,(s.crit?'':'')+fmt(s.dmg),s.crit?'#ffd25a':'#ffffff',s.crit?28:22);
      if(s.crit) pop(D.x,dy-84,'CRITICAL!','#ff6a3a',14,1000);
      sfx(s.crit?'crit':'hit');
      const t=$(atkL?'#bt-R':'#bt-L'); if(t){ t.querySelector('.bar i').style.width=(s.after/s.d.maxHp*100)+'%'; t.querySelector('.bt-hp').textContent=`${fmt(s.after)} / ${fmt(s.d.maxHp)}`; }
      if(kind==='melee'){ await sleep(90); await tween(240,p=>A.off=dir*(Math.abs(dx-ax)-96)*(1-ease.out(p))); }
      if(s.after===0){ await sleep(200); sfx('boom'); S.shake=26; S.flashA=.35;
        burst(D.x,dy,40,['#ffffff','#fff3b0','#ffcf3a','#ff8a3a','#ff4a3a','#555c66'],380,300,7);
        pop(D.x,dy-90,'擊墜！','#ff6a3a',22,1200);
        say(s.d,'down',s.a);
        await tween(600,p=>{ D.alpha=1-p; D.sink=p*30; });
        if(named(s.a)&&say(s.a,'kill',s.d)) await sleep(500); }
      else if(Math.random()<.5) say(s.d,'hit',s.a);
    } else {
      pop(D.x,dy-40,s.note||'MISS','#c8d0d8',s.note?18:20);
      sfx('miss'); say(s.d,'dodge',s.a);
      await tween(140,p=>D.hop=dir*34*ease.out(p)); await tween(220,p=>D.hop=dir*34*(1-ease.io(p)));
      if(kind==='melee') await tween(240,p=>A.off=dir*(Math.abs(dx-ax)-96)*(1-ease.out(p)));
    }
    await sleep(420);
  }
  if(G.lvUps.length){ $('#bt-line').innerHTML=`<span class="lvtxt">▲ LEVEL UP　${G.lvUps.join('　')}</span>`; sfx('levelup'); pop(W/2,90,'LEVEL UP!','#ffd25a',20,1200); await sleep(900); }
  await sleep(200);
  running=false; ov.hidden=true; ov.onclick=null; G.skip=false; G.sleepers.length=0;
}
// 必殺技切入演出
function makeCut(u,w,quote,left){
  const r=rng((u.uid||7)*131+w.name.length), lines=[];
  for(let i=0;i<26;i++) lines.push({y:r(),len:60+r()*180,sp:900+r()*900,off:r()*800,w:1+Math.floor(r()*3)});
  return {u,w,quote,left,t0:performance.now(),dur:1350,lines,sp:spriteSet(iconKey(u)||'')};
}
function drawCutIn(ctx,c,now,W,H){
  const p=Math.min(1,(now-c.t0)/c.dur); if(p<0) return;
  const open=p<.12?ease.out(p/.12):p>.88?1-ease.in((p-.88)/.12):1;
  const cy=H*.46, bh=150*open, sk=22, dir=c.left?1:-1;
  const team=c.u.side==='E'?['#3a0d10','#7a1e1e','#ff7a5a']:['#0b1f3a','#1f4f8a','#6fd0ff'];
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,'+(.45*open)+')'; ctx.fillRect(0,0,W,H);
  ctx.beginPath(); ctx.moveTo(-10,cy-bh/2+sk*dir); ctx.lineTo(W+10,cy-bh/2-sk*dir); ctx.lineTo(W+10,cy+bh/2-sk*dir); ctx.lineTo(-10,cy+bh/2+sk*dir); ctx.closePath();
  const g=ctx.createLinearGradient(0,cy-bh/2,0,cy+bh/2); g.addColorStop(0,team[1]); g.addColorStop(.5,team[0]); g.addColorStop(1,team[1]);
  ctx.fillStyle=g; ctx.fill(); ctx.lineWidth=4; ctx.strokeStyle=team[2]; ctx.stroke(); ctx.clip();
  // 速度線
  const el=(now-c.t0)/1000;
  for(const l of c.lines){ const x=((l.off+el*l.sp)%(W+l.len))-l.len; const xx=c.left?W-x-l.len:x;
    ctx.fillStyle='rgba(255,255,255,'+(.15+l.w*.1)+')'; ctx.fillRect(xx,cy-bh/2+l.y*bh,l.len,l.w); }
  // 機體頭像
  const size=200, slide=p<.2?1-ease.out(p/.2):0, px=c.left?150-slide*260:W-150+slide*260;
  ctx.imageSmoothingEnabled=false;
  if(c.sp){ ctx.save(); ctx.translate(px,cy); if(!c.left) ctx.scale(-1,1); ctx.drawImage(c.sp.n,-size/2,-size/2+16,size,size); ctx.restore(); }
  else { ctx.fillStyle=team[2]; ctx.font='900 120px "Noto Serif TC",serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(c.u.ch,px,cy); }
  // 文字
  const tp=p<.28?0:Math.min(1,(p-.28)/.15), tx=c.left?W-40:40, ta=c.left?'right':'left', tslide=(1-ease.out(tp))*120*dir;
  ctx.globalAlpha=tp; ctx.textAlign=ta; ctx.textBaseline='middle';
  ctx.font='700 15px "Noto Sans TC",sans-serif'; ctx.fillStyle=team[2]; ctx.fillText(`${c.u.pilot}　${c.u.name}`,tx+tslide,cy-42);
  ctx.font='900 44px "Noto Serif TC",serif'; ctx.lineWidth=8; ctx.strokeStyle='#05080c'; ctx.strokeText(c.w.name,tx+tslide,cy-2); ctx.fillStyle='#fff6d0'; ctx.fillText(c.w.name,tx+tslide,cy-2);
  if(c.quote){ ctx.font='500 15px "Noto Sans TC",sans-serif'; ctx.fillStyle='#e8eef2'; ctx.fillText('「'+c.quote+'」',tx+tslide,cy+36); }
  ctx.restore();
}
function drawFighter(ctx,sd,now){
  const u=sd.u, size=112, flip=!sd.left, lift=u.fly?40:0, bob=Math.sin(now/300+(sd.left?0:1.7))*(u.fly?6:2);
  const x=sd.x+sd.off+sd.hop, y=sd.y-lift+bob+sd.sink;
  ctx.globalAlpha=.3*sd.alpha; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(sd.x+sd.off+sd.hop,sd.y+6,u.fly?36:50,10,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=sd.alpha;
  ctx.save(); ctx.translate(x,y-size); if(flip){ ctx.scale(-1,1); }
  if(sd.sp){ ctx.drawImage(sd.sp.n,-size/2,0,size,size); if(sd.flash>0){ ctx.globalAlpha=sd.alpha*sd.flash; ctx.drawImage(sd.sp.w,-size/2,0,size,size); sd.flash=Math.max(0,sd.flash-.12); } }
  else { if(flip) ctx.scale(-1,1); ctx.fillStyle=u.side==='E'?'#5a1d1b':'#153250'; ctx.beginPath(); ctx.arc(0,size/2,size*.42,0,Math.PI*2); ctx.fill(); ctx.fillStyle=u.side==='E'?'#ff8f7e':'#8fd0ff'; ctx.font='900 56px "Noto Serif TC",serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(u.ch,0,size/2); }
  ctx.restore(); ctx.globalAlpha=1;
  if(u.boss&&sd.alpha>0){ ctx.fillStyle='#f3c43b'; ctx.font='14px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText('BOSS',x,y-size-10); }
}

// =====================================================================
// 標題背景
// =====================================================================
function startTitleBg(){
  if(typeof requestAnimationFrame==='undefined'||typeof document.getElementById!=='function') return;
  const cv=document.getElementById('bgcv'); if(!cv) return;
  document.body.classList.add('titlemode');
  if(GFX.titleRaf) return;
  const stars=Array.from({length:90},(_,i)=>({x:Math.random(),y:Math.random()*.55,s:Math.random()<.2?2:1,p:Math.random()*6}));
  const squad=['gang','feng','lei','yu','tetsu','lena','rei'];
  const foes=['bing','qi','yi','pao'];
  const draw=now=>{
    if(!document.body.classList.contains('titlemode')){ GFX.titleRaf=0; return; }
    GFX.titleRaf=requestAnimationFrame(draw);
    const dpr=Math.min(2,window.devicePixelRatio||1), W=window.innerWidth, H=window.innerHeight;
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
    const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false;
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b1430'); g.addColorStop(.55,'#2a3a78'); g.addColorStop(.78,'#d8785a'); g.addColorStop(1,'#f3b46a');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    for(const s of stars){ ctx.globalAlpha=.4+.6*Math.abs(Math.sin(now/900+s.p)); ctx.fillStyle='#fff'; ctx.fillRect(s.x*W,s.y*H,s.s,s.s); } ctx.globalAlpha=1;
    const gy=H*.86;
    ctx.fillStyle='#3a2f5a'; for(let i=-1;i<10;i++){ const cx=(i*W/7+(now/120)%(W/7)), h=H*.16+(i%3)*H*.04; ctx.beginPath(); ctx.moveTo(cx-W/9,gy); ctx.lineTo(cx,gy-h); ctx.lineTo(cx+W/9,gy); ctx.fill(); }
    ctx.fillStyle='#4f3f6a'; for(let i=-1;i<14;i++){ const cx=(i*W/10+(now/60)%(W/10)); ctx.beginPath(); ctx.moveTo(cx-W/14,gy); ctx.lineTo(cx,gy-H*.08-(i%2)*H*.03); ctx.lineTo(cx+W/14,gy); ctx.fill(); }
    const ts=48; for(let x=-(Math.floor(now/30)%ts);x<W;x+=ts) for(let y=gy;y<H;y+=ts) ctx.drawImage(tileImg('plain',((x/ts|0)+(y/ts|0))%3,0),x,y,ts,ts);
    ctx.fillStyle='rgba(20,10,40,.35)'; ctx.fillRect(0,gy,W,H-gy);
    const sz=Math.max(40,Math.min(72,W/22));
    squad.forEach((k,i)=>{ const sp=spriteSet(k); if(!sp) return; const x=W*.06+i*sz*1.05, y=gy-sz+Math.sin(now/300+i)*3+(k==='feng'?-sz*.35:0);
      ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x+sz/2,gy-2,sz*.35,sz*.08,0,0,Math.PI*2); ctx.fill(); ctx.drawImage(sp.n,x,y,sz,sz); });
    foes.forEach((k,i)=>{ const sp=spriteSet(k); if(!sp) return; const x=W*.94-sz-i*sz*1.05, y=gy-sz+Math.sin(now/340+i*2)*3+(k==='yi'?-sz*.35:0);
      ctx.save(); ctx.translate(x+sz,y); ctx.scale(-1,1); ctx.globalAlpha=.85; ctx.drawImage(sp.n,0,0,sz,sz); ctx.restore(); ctx.globalAlpha=1; });
  };
  GFX.titleRaf=requestAnimationFrame(draw);
}
function tileURL(kind){ const k='url_'+kind; return GFX.tiles[k]||(GFX.tiles[k]=tileImg(kind,0,0).toDataURL()); }
function stopTitleBg(){ if(typeof document!=='undefined'&&document.body&&document.body.classList) document.body.classList.remove('titlemode'); }

// 銘甲戰記 — 8-bit 背景音樂（WebAudio 即時合成，不需要音樂檔）
// 曲譜格式：每小節 8 個八分音符；'-' 休止、'=' 延長前一音
const NOTE_BASE={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,Bb:10,B:11};
function noteMidi(n){ const m=/^([A-G](?:#|b)?)(\d)$/.exec(n); return m?12*(+m[2]+1)+NOTE_BASE[m[1]]:null; }
function chordTones(ch){ const m=/^([A-G](?:#|b)?)(m?)$/.exec(ch); const r=NOTE_BASE[m[1]]; return [r,r+(m[2]?3:4),r+7]; }
const mfreq=m=>440*Math.pow(2,(m-69)/12);

const SONGS={
  title:{bpm:118,chords:['C','G','Am','F','C','G','F','G'],bass:'r.o.r.o.',drum:'k.s.k.s.',arp:true,
    mel:['G4 - C5 - E5 = D5 C5','D5 = = B4 G4 = - -','A4 - C5 - E5 = G5 E5','F5 = E5 D5 C5 = - -','E5 - G5 - C6 = B5 A5','G5 = D5 = B4 = D5 -','C5 = F5 = A5 = G5 F5','G5 = = = - - D5 -']},
  prep:{bpm:92,chords:['C','Am','F','G','C','Am','Dm','G'],bass:'r...f...',drum:'',arp:true,lead:.08,
    mel:['E5 = = D5 C5 = = -','C5 = E5 = A5 = = -','A5 = G5 = F5 = E5 -','D5 = = = - - - -','E5 = G5 = C6 = B5 -','A5 = E5 = C5 = = -','D5 = F5 = A5 = G5 F5','D5 = = = B4 = = -']},
  player:{bpm:138,chords:['F','G','Em','Am','Dm','G','C','C'],bass:'r.ofr.of',drum:'khshkksh',arp:false,
    mel:['A4 C5 F5 = E5 = C5 -','D5 = B4 = G4 - D5 -','E5 G5 B5 = A5 G5 E5 -','C5 = E5 = A5 = - -','F5 = E5 D5 A4 = D5 F5','G5 = F5 E5 D5 = B4 -','C5 E5 G5 = C6 = = -','G5 - E5 - C5 - - -']},
  enemy:{bpm:128,chords:['Am','F','Dm','E','Am','F','E','E'],bass:'rrrrrror',drum:'k.hsk.hs',arp:true,
    mel:['A4 = C5 = B4 = A4 -','C5 = D5 = E5 = - -','F5 = E5 D5 C5 = D5 -','B4 = G#4 = E4 = - -','A4 C5 E5 = A5 = G#5 -','F5 = E5 = D5 = C5 -','B4 = C5 = D5 = E5 -','G#5 = = = E5 - - -']},
  boss:{bpm:156,chords:['Dm','Bb','C','A','Dm','Bb','Gm','A'],bass:'rorororo',drum:'khshkkss',arp:true,
    mel:['D5 - D5 F5 A5 = G5 F5','F5 = D5 = Bb4 = - -','C5 - C5 E5 G5 = F5 E5','E5 = C#5 = A4 = - -','D6 = A5 = F5 = D5 -','D5 F5 Bb5 = A5 = F5 -','G5 = Bb5 = D6 = C6 Bb5','A5 = = = C#5 = E5 -']},
  win:{bpm:150,chords:['C','F','G','C'],bass:'r.r.r.r.',drum:'k.k.k.s.',arp:false,loop:false,
    mel:['G4 C5 E5 G5 = E5 G5 =','A5 = F5 = A5 = C6 =','B5 = D6 = B5 = G5 =','C6 = = = = = - -']},
  lose:{bpm:84,chords:['Am','F','Dm','E'],bass:'r...r...',drum:'',arp:false,loop:false,
    mel:['E5 = = = C5 = = =','A4 = = = F4 = = =','D5 = C5 = A4 = = =','G#4 = = = = = - -']},
};

const BGM={on:true,vol:.55,cur:null,want:null,timer:0,step:0,next:0,gain:null,song:null,nbuf:null};
try{ const v=localStorage.getItem('zijia2-bgm'); if(v==='0') BGM.on=false; }catch(e){}
function bgmCtx(){
  if(typeof window==='undefined'||!(window.AudioContext||window.webkitAudioContext)) return null;
  if(!SFX.ctx){ try{ SFX.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
  return SFX.ctx;
}
function bgmPrep(name){
  const s=SONGS[name]; if(s._p) return s;
  const steps=[];
  s.mel.forEach((bar,bi)=>{ const tk=bar.trim().split(/\s+/); tk.forEach((t,i)=>steps.push({t,bar:bi,i})); });
  // 計算每個音的長度（八分音符數）
  steps.forEach((st,i)=>{ if(st.t==='-'||st.t==='=') return; let n=1; while(steps[i+n]&&steps[i+n].t==='=') n++; st.len=n; st.m=noteMidi(st.t); });
  s._p=true; s.steps=steps; s.tones=s.chords.map(chordTones); return s;
}
function bgmOsc(type,freq,t,dur,vol,slide){
  const c=SFX.ctx, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.008); g.gain.setValueAtTime(vol,t+Math.max(.01,dur*.7)); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(BGM.gain); o.start(t); o.stop(t+dur+.02);
}
function bgmNoise(t,dur,hp,vol){
  const c=SFX.ctx;
  if(!BGM.nbuf){ const n=c.sampleRate*.3|0; BGM.nbuf=c.createBuffer(1,n,c.sampleRate); const d=BGM.nbuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; }
  const s=c.createBufferSource(); s.buffer=BGM.nbuf; const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp;
  const g=c.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(BGM.gain); s.start(t); s.stop(t+dur+.02);
}
function bgmStep(s,i,t,d8){
  const st=s.steps[i], bar=st.bar, pos=st.i, tones=s.tones[bar];
  if(st.m) bgmOsc('square',mfreq(st.m),t,d8*st.len*.95,s.lead||.11);
  const b=(s.bass||'')[pos]; const root=36+tones[0]+(tones[0]>4?0:12);
  if(b==='r') bgmOsc('triangle',mfreq(root),t,d8*.9,.32);
  else if(b==='o') bgmOsc('triangle',mfreq(root+12),t,d8*.9,.28);
  else if(b==='f') bgmOsc('triangle',mfreq(root+7),t,d8*.9,.28);
  if(s.arp){ for(let k=0;k<2;k++){ const n=tones[(pos*2+k)%3]+60; bgmOsc('square',mfreq(n),t+k*d8/2,d8*.45,.035); } }
  const dr=(s.drum||'')[pos];
  if(dr==='k') bgmOsc('sine',150,t,.14,.55,.25);
  else if(dr==='s') bgmNoise(t,.12,1400,.22);
  else if(dr==='h') bgmNoise(t,.04,7000,.08);
}
function bgmTick(){
  const c=SFX.ctx, s=BGM.song; if(!c||!s) return;
  const d8=60/s.bpm/2;
  while(BGM.next<c.currentTime+.15){
    bgmStep(s,BGM.step,BGM.next,d8); BGM.next+=d8; BGM.step++;
    if(BGM.step>=s.steps.length){ if(s.loop===false){ const end=BGM.next; clearInterval(BGM.timer); BGM.timer=0; BGM.cur=null; setTimeout(()=>{ if(!BGM.timer) bgmFade(); },Math.max(0,(end-c.currentTime)*1000)+400); return; } BGM.step=0; }
  }
}
function bgmFade(){
  if(!BGM.gain||!SFX.ctx) return; const g=BGM.gain, t=SFX.ctx.currentTime;
  try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.linearRampToValueAtTime(0.0001,t+.35); }catch(e){}
  setTimeout(()=>{ try{ g.disconnect(); }catch(e){} },500); BGM.gain=null;
}
function bgmStop(){ if(BGM.timer){ clearInterval(BGM.timer); BGM.timer=0; } BGM.cur=null; bgmFade(); }
function bgm(name){
  BGM.want=name;
  if(!BGM.on||!name||!SONGS[name]){ if(!name||!BGM.on) bgmStop(); return; }
  if(BGM.cur===name&&BGM.timer) return;
  const c=bgmCtx(); if(!c||typeof setInterval==='undefined') return;
  if(c.state!=='running'){ try{ c.resume().then(()=>{ if(BGM.want===name&&!BGM.timer) bgm(name); }).catch(()=>{}); }catch(e){} return; } // 瀏覽器要求使用者先互動，解鎖後才開始
  bgmStop();
  const s=bgmPrep(name);
  BGM.gain=c.createGain(); BGM.gain.gain.setValueAtTime(0.0001,c.currentTime); BGM.gain.gain.linearRampToValueAtTime(BGM.vol*.45,c.currentTime+.25); BGM.gain.connect(c.destination);
  BGM.song=s; BGM.cur=name; BGM.step=0; BGM.next=c.currentTime+.08; BGM.timer=setInterval(bgmTick,25); bgmTick();
}
function bgmUnlock(){ const c=bgmCtx(); if(!c) return; const go=()=>{ if(BGM.want&&!BGM.timer) bgm(BGM.want); };
  if(c.state!=='running') c.resume().then(go).catch(()=>{}); else go(); }
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
  document.addEventListener('pointerdown',bgmUnlock,true); document.addEventListener('keydown',bgmUnlock,true);
  document.addEventListener('visibilitychange',()=>{ if(!SFX.ctx) return; if(document.hidden) SFX.ctx.suspend&&SFX.ctx.suspend(); else SFX.ctx.resume&&SFX.ctx.resume(); });
}
// 依戰況選曲：場上有頭目就換成頭目戰曲
function battleBgm(side){ const boss=G.units&&G.units.some(u=>u.side==='E'&&u.boss&&u.hp>0); bgm(boss?'boss':side==='E'?'enemy':'player'); }

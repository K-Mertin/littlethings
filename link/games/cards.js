'use strict';
/* 彩虹牌 — hidden-hand shedding card game (match colour or number, first to empty the hand wins).
   Host keeps the deck, hands and turn; each phone only sees its own hand, the big screen sees counts.
   Card: { i:id, c:0–3 colour | 4 wild, v:number | 'S' skip | 'R' reverse | 'D' +2 | 'W' wild | 'F' wild+4 }
   Messages: {play:i, col?} {draw:1} {keep:1} {last:1} {catch:1} */
(function () {
  const CD_COLS = [
    { n: '紅色', a: '#ff6b7d', b: '#d81b3f', k: '🐞', s: '♥' },
    { n: '黃色', a: '#ffd84a', b: '#f08c00', k: '🐥', s: '★' },
    { n: '綠色', a: '#55dd8f', b: '#12924f', k: '🐸', s: '♣' },
    { n: '藍色', a: '#5cb0ff', b: '#1d5cd6', k: '🐳', s: '◆' }
  ];
  const VNAME = { S: '跳過', R: '迴轉', D: '+2', W: '變色', F: '變色+4' };
  const VRANK = { S: 10, R: 11, D: 12, W: 13, F: 14 };
  const rank = cd => cd.c * 20 + (typeof cd.v === 'number' ? cd.v : VRANK[cd.v]);
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8] };
  const cardPts = cd => typeof cd.v === 'number' ? cd.v : (cd.c === 4 ? 50 : 20);

  /* ---------- card faces ---------- */
  function cardHTML(cd, kid, extra) {
    const w = cd.c === 4, C = CD_COLS[cd.c] || CD_COLS[0];
    let mid, ix, sh = w ? '' : (kid ? C.k : C.s);
    if (w) {
      const plus = cd.v === 'F';
      mid = `<div class="cd-ov cd-wild"><b>${plus ? '+4' : (kid ? '🌈' : '')}</b></div>`;
      ix = plus ? '+4' : (kid ? '🌈' : '★');
    } else if (typeof cd.v === 'number') {
      ix = String(cd.v);
      if (kid) {
        const pos = PIPS[cd.v] || [4];
        mid = `<div class="cd-pips">${pos.map(p => `<span style="grid-area:${(p / 3 | 0) + 1}/${p % 3 + 1}">${C.k}</span>`).join('')}</div>`;
      } else mid = `<div class="cd-ov"><b class="${cd.v === 6 || cd.v === 9 ? 'cd-ul' : ''}">${cd.v}</b></div>`;
    } else {
      const sym = { S: kid ? '🚫' : '⊘', R: '⇄', D: '+2' }[cd.v];
      ix = { S: kid ? '🚫' : '⊘', R: '⇄', D: '+2' }[cd.v];
      mid = `<div class="cd-ov ${kid && cd.v === 'S' ? 'cd-emo' : ''}"><b>${sym}</b></div>`;
    }
    return `<div class="cd-card ${w ? 'cd-w' : ''} ${extra || ''}" style="--a:${w ? '#3a3d66' : C.a};--b:${w ? '#15172d' : C.b}"><div class="cd-in">${mid}` +
      `<span class="cd-ix cd-tl">${ix}<i>${sh}</i></span><span class="cd-ix cd-br">${ix}<i>${sh}</i></span></div></div>`;
  }
  const backHTML = extra => `<div class="cd-card cd-back ${extra || ''}"><div class="cd-in"><div class="cd-bov"><b>彩虹</b></div></div></div>`;
  const cardTxt = (cd, col) => cd.c === 4 ? `${VNAME[cd.v]} → ${CD_COLS[col].n}` : `${CD_COLS[cd.c].n} ${typeof cd.v === 'number' ? cd.v : VNAME[cd.v]}`;

  /* ---------- styles ---------- */
  function css() {
    if (document.getElementById('cd-style')) return;
    const s = document.createElement('style'); s.id = 'cd-style';
    s.textContent = `
.cd-root{position:absolute;inset:0;overflow:hidden;color:#fff;font-family:var(--sans);
  background:radial-gradient(120% 70% at 50% 45%,#2fb07c 0,#1c8159 55%,#105a3d 100%)}
.cd-root *{box-sizing:border-box}
/* ---- card ---- */
.cd-card{font-size:var(--cw,80px);width:1em;height:1.5em;border-radius:.13em;background:#fff;position:relative;flex:none;color:#fff;
  box-shadow:0 .015em 0 rgba(0,0,0,.1),0 .05em .12em rgba(10,20,50,.35)}
.cd-in{position:absolute;inset:.055em;border-radius:.09em;background:linear-gradient(150deg,var(--a),var(--b));overflow:hidden}
.cd-in::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(118deg,rgba(255,255,255,.5) 0,rgba(255,255,255,.08) 30%,rgba(255,255,255,0) 55%,rgba(255,255,255,.16) 100%)}
.cd-ov{position:absolute;left:50%;top:50%;width:.74em;height:1.1em;margin:-.55em 0 0 -.37em;border-radius:50%;background:#fff;transform:rotate(28deg);
  display:grid;place-items:center;box-shadow:inset 0 0 0 .02em rgba(0,0,0,.08),0 0 0 .025em rgba(255,255,255,.35)}
.cd-ov b{transform:rotate(-28deg);font:700 .5em/1 var(--round);color:var(--b);letter-spacing:-.04em;
  text-shadow:.04em .04em 0 rgba(0,0,0,.2),-.02em -.02em 0 #fff}
.cd-ov b.cd-ul{text-decoration:underline;text-decoration-thickness:.06em;text-underline-offset:.06em}
.cd-ov.cd-emo b{font-size:.42em;text-shadow:none}
.cd-ix{position:absolute;color:#fff;font:700 .19em/1 var(--round);text-shadow:0 .07em 0 rgba(0,0,0,.28);display:flex;flex-direction:column;align-items:center;gap:.05em}
.cd-ix i{font-style:normal;font-size:.62em;opacity:.95;text-shadow:none}
.cd-tl{left:.3em;top:.3em}.cd-br{right:.3em;bottom:.3em;transform:rotate(180deg)}
.cd-w .cd-in{background:radial-gradient(circle at 30% 20%,#43477a,#16182e 70%)}
.cd-wild{background:conic-gradient(from -28deg,#ff4d6a 0 25%,#ffc928 0 50%,#2fcf7a 0 75%,#3f8cff 0)!important}
.cd-wild b{color:#fff;font-size:.42em;text-shadow:0 .03em .08em rgba(0,0,0,.6),0 0 .1em rgba(0,0,0,.5)}
.cd-pips{position:absolute;left:.15em;right:.15em;top:.33em;bottom:.33em;background:rgba(255,255,255,.93);border-radius:.1em;display:grid;
  grid-template:repeat(3,1fr)/repeat(3,1fr);place-items:center;padding:.04em;box-shadow:inset 0 0 0 .02em rgba(0,0,0,.08)}
.cd-pips span{font-size:.25em;line-height:1;filter:drop-shadow(0 .04em 0 rgba(0,0,0,.15))}
.cd-kidc .cd-ix{font-size:.22em}
.cd-back .cd-in{background:repeating-linear-gradient(45deg,#302c7a 0 .045em,#262265 .045em .09em)}
.cd-bov{position:absolute;left:50%;top:50%;width:.72em;height:1.08em;margin:-.54em 0 0 -.36em;border-radius:50%;transform:rotate(28deg);
  background:conic-gradient(#ff4d6a,#ffc928,#2fcf7a,#3f8cff,#b06bff,#ff4d6a);display:grid;place-items:center}
.cd-bov::before{content:'';position:absolute;inset:.06em;border-radius:50%;background:radial-gradient(circle at 40% 30%,#3d3897,#1b1850)}
.cd-bov b{position:relative;transform:rotate(-28deg);font:900 .17em/1 var(--sans);letter-spacing:.06em;
  background:linear-gradient(90deg,#ff8095,#ffd84a,#6ef0a5,#7fb6ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.cd-mini .cd-bov b{display:none}
/* ---- shared bits ---- */
.cd-colchip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px 6px 8px;border-radius:999px;font-weight:900;font-size:15px;
  background:var(--cc);box-shadow:0 3px 0 var(--cd),0 0 0 3px rgba(255,255,255,.85);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.25);transition:background .3s}
.cd-colchip .e{width:26px;height:26px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:16px;color:var(--cd);text-shadow:none}
.cd-disc{position:relative;width:1em;height:1.5em;font-size:var(--pw,100px)}
.cd-disc .cd-card{position:absolute;left:0;top:0;font-size:1em}
.cd-disc::before{content:'';position:absolute;inset:-.09em;border-radius:.2em;box-shadow:0 0 0 .04em var(--cc,#fff),0 0 .25em var(--cc,#fff);opacity:.9;transition:box-shadow .3s}
.cd-land{animation:cdLand .42s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes cdLand{0%{opacity:0;transform:scale(1.25) rotate(var(--r,0deg))}100%{opacity:1;transform:scale(1) rotate(var(--r,0deg))}}
.cd-dpile{position:relative;width:1em;height:1.5em;font-size:var(--dw,70px)}
.cd-dpile .cd-card{position:absolute;left:0;top:0;font-size:1em}
.cd-dpile .cd-card:nth-child(1){transform:translate(.05em,.05em)}.cd-dpile .cd-card:nth-child(2){transform:translate(.025em,.025em)}
.cd-dpile .n{position:absolute;right:-.12em;bottom:-.1em;font:700 .2em/1 var(--round);background:#1f2346;color:#fff;border-radius:999px;padding:.25em .5em;box-shadow:0 0 0 .12em #fff}
.cd-fly{position:absolute;left:0;top:0;z-index:30;pointer-events:none;will-change:transform}
.cd-ring{position:absolute;inset:-5px;width:calc(100% + 10px);height:calc(100% + 10px);transform:rotate(-90deg);pointer-events:none}
.cd-ring circle{fill:none;stroke-width:4}
.cd-ring .bg{stroke:rgba(255,255,255,0)}
.cd-ring .fg{stroke:#ffd84d;stroke-linecap:round;transition:stroke .3s}
.cd-ring.low .fg{stroke:#ff4d6a}
.cd-bub{position:absolute;left:50%;top:-6px;transform:translate(-50%,-100%);background:#fff;color:#d81b3f;font-weight:900;font-size:13px;white-space:nowrap;
  padding:4px 9px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.25);animation:cdBub 1.8s ease both;z-index:5;pointer-events:none}
@keyframes cdBub{0%{opacity:0;transform:translate(-50%,-60%) scale(.6)}12%{opacity:1;transform:translate(-50%,-100%) scale(1.1)}20%{transform:translate(-50%,-100%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-130%)}}
.cd-wiggle{animation:cdWig .35s}
@keyframes cdWig{25%{margin-left:-6px}50%{margin-left:6px}75%{margin-left:-3px}}
.cd-yt{position:absolute;left:50%;top:44%;z-index:40;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:6px;
  transform:translate(-50%,-50%);opacity:0}
.cd-yt.go{animation:cdYt 1.5s ease both}
.cd-yt img{width:96px;height:96px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.3))}
.cd-yt b{font-size:40px;font-weight:900;color:#fff;white-space:nowrap;padding:8px 24px;border-radius:999px;background:linear-gradient(135deg,#ff7a45,#ff4d6a);
  box-shadow:0 6px 0 #b8263f,0 10px 30px rgba(0,0,0,.35);letter-spacing:.04em}
@keyframes cdYt{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(.95)}}
.cd-winov{position:absolute;inset:0;z-index:45;display:grid;place-items:center;background:rgba(10,20,40,.35);animation:cdFade .4s both}
.cd-winov>div{display:flex;flex-direction:column;align-items:center;gap:8px;animation:cdPop .6s both}
.cd-winov img{width:120px;height:120px}
.cd-winov b{font-size:34px;font-weight:900;background:#fff;color:#1f2346;padding:10px 22px;border-radius:20px;box-shadow:0 6px 0 #d5def5}
@keyframes cdPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
@keyframes cdFade{from{opacity:0}}
.cd-conf{position:absolute;top:-20px;width:10px;height:16px;border-radius:3px;z-index:46;pointer-events:none;animation:cdConf linear forwards}
@keyframes cdConf{to{transform:translateY(110vh) rotate(720deg)}}

/* ---- phone ---- */
.cd-ph{display:flex;flex-direction:column}
.cd-opps{flex:none;display:flex;align-items:center;justify-content:safe center;gap:2px;padding:12px 10px 10px;overflow-x:auto;scrollbar-width:none}
.cd-op{flex:none;width:var(--opw,76px);background:rgba(255,255,255,.95);color:#1f2346;border-radius:16px;padding:7px 3px 6px;display:flex;flex-direction:column;
  align-items:center;gap:2px;position:relative;transition:transform .25s,box-shadow .25s,opacity .25s;box-shadow:0 3px 0 rgba(0,0,0,.18)}
.cd-op .av{position:relative;width:calc(var(--opw,76px)*.52);height:calc(var(--opw,76px)*.52)}
.cd-op .av img{width:100%;height:100%;display:block}
.cd-op .nm{font-weight:900;font-size:12px;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:0 2px}
.cd-op .ct{display:flex;align-items:center;gap:3px;font:700 15px/1 var(--round)}
.cd-op .ct .cd-card{--cw:13px}
.cd-op.on{transform:translateY(3px) scale(1.07);box-shadow:0 0 0 3px #ffd84d,0 0 22px rgba(255,216,77,.9)}
.cd-op.off{opacity:.55}
.cd-op.off::after{content:'離線';position:absolute;top:2px;right:2px;font-size:10px;background:#6b7196;color:#fff;border-radius:6px;padding:1px 4px}
.cd-op .one{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);background:#ff4d6a;color:#fff;font-size:10.5px;font-weight:900;white-space:nowrap;border-radius:8px;padding:1px 6px;box-shadow:0 0 0 2px #fff}
.cd-sep{flex:none;width:12px;text-align:center;font-weight:900;font-size:14px;color:rgba(255,255,255,.85);transition:transform .35s}
.cd-sep.rev{transform:scaleX(-1)}
.cd-body{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:4px 10px}
.cd-mid{display:flex;flex-direction:column;align-items:center;gap:16px;min-height:0}
.cd-piles{display:flex;align-items:center;gap:22px}
.cd-pinfo{display:flex;flex-direction:column;align-items:center;gap:8px}
.cd-dir{font-weight:900;font-size:13px;background:rgba(0,0,0,.2);border-radius:999px;padding:4px 10px;display:flex;align-items:center;gap:4px}
.cd-dir span{display:inline-block;transition:transform .35s}
.cd-dir.rev span{transform:scaleX(-1)}
.cd-txt{font-weight:900;font-size:15px;text-align:center;min-height:1.3em;text-shadow:0 2px 0 rgba(0,0,0,.25);max-width:100%;padding:0 6px;line-height:1.35}
.cd-hint{font-weight:900;font-size:14px;text-align:center;background:rgba(0,0,0,.22);border-radius:999px;padding:5px 14px;min-height:28px}
.cd-hint.me{background:#ffd84d;color:#5a3a00;animation:cdPulse 1.2s infinite}
@keyframes cdPulse{50%{box-shadow:0 0 0 6px rgba(255,216,77,.35)}}
.cd-acts{flex:none;display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;min-height:60px}
.cd-btn{min-height:56px;padding:10px 20px;border-radius:18px;font-weight:900;font-size:19px;color:#fff;background:#5b5bf7;box-shadow:0 5px 0 #3a36c4;
  display:inline-flex;align-items:center;gap:8px;transition:opacity .2s,transform .1s}
.cd-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #3a36c4}
.cd-btn[disabled]{opacity:.35;pointer-events:none;filter:grayscale(.5)}
.cd-btn.draw{background:linear-gradient(135deg,#7a6bff,#4f47e6)}
.cd-btn.draw.go{animation:cdPulse 1.2s infinite}
.cd-btn.last{background:linear-gradient(135deg,#ff7a45,#ff4d6a);box-shadow:0 5px 0 #b8263f;animation:cdShake 1.6s infinite}
.cd-btn.catch{background:linear-gradient(135deg,#ff4d6a,#c2185b);box-shadow:0 5px 0 #7d0f3a;font-size:21px;animation:cdShake .8s infinite}
.cd-btn.catch img{width:34px;height:34px}
.cd-btn.ok{background:linear-gradient(135deg,#2fcf7a,#18995a);box-shadow:0 5px 0 #0e6b3d}
.cd-btn.ghost{background:#fff;color:#1f2346;box-shadow:0 5px 0 #c3cbe6}
@keyframes cdShake{0%,70%,100%{transform:none}75%{transform:rotate(-3deg)}85%{transform:rotate(3deg)}92%{transform:rotate(-2deg)}}
.cd-tbar{flex:none;height:8px;margin:0 16px;border-radius:99px;background:rgba(0,0,0,.25);overflow:hidden;opacity:0;transition:opacity .3s}
.cd-tbar.on{opacity:1}
.cd-tbar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ffd84d,#ffef9e);border-radius:99px;transform-origin:left}
.cd-tbar.low i{background:linear-gradient(90deg,#ff4d6a,#ff9a9a)}
.cd-hand{flex:none;position:relative;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;transition:background .3s;
  height:calc(var(--cw)*1.5 + 56px);padding-bottom:env(safe-area-inset-bottom,0px)}
.cd-hand::-webkit-scrollbar,.cd-opps::-webkit-scrollbar{display:none}
.cd-hand.me{background:linear-gradient(180deg,rgba(255,216,77,0),rgba(255,216,77,.28))}
.cd-fan{position:relative;height:100%;margin:0 auto}
.cd-hc{position:absolute;top:30px;transition:left .32s cubic-bezier(.2,.8,.2,1),transform .32s cubic-bezier(.2,.8,.2,1),filter .3s,opacity .3s;
  transform-origin:50% 140%;cursor:pointer}
.cd-hc .cd-card{font-size:var(--cw)}
.cd-hc.pl .cd-card{box-shadow:0 0 0 .035em #fff,0 0 .2em .05em #ffe066,0 .08em .2em rgba(0,0,0,.35)}
.cd-hc.dim{filter:brightness(.72) saturate(.75)}
.cd-kid .cd-hc.dim{filter:brightness(.6) saturate(.5);opacity:.85}
.cd-hc.new{animation:cdIn .45s cubic-bezier(.2,.8,.2,1.2) both}
@keyframes cdIn{from{opacity:0;margin-top:80px}}
.cd-hc.going{opacity:0;transition:opacity .15s}
.cd-sheet{position:absolute;inset:0;z-index:50;background:rgba(10,15,40,.5);display:flex;align-items:flex-end;justify-content:center;animation:cdFade .2s both}
.cd-sheet>div{background:#fff;color:#1f2346;width:100%;max-width:520px;border-radius:26px 26px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));
  animation:cdUp .28s cubic-bezier(.2,.8,.2,1) both;text-align:center}
@keyframes cdUp{from{transform:translateY(100%)}}
.cd-sheet h3{margin:0 0 12px;font-size:20px;font-weight:900}
.cd-sheet .g{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cd-sheet .g button{min-height:84px;border-radius:20px;background:linear-gradient(150deg,var(--a),var(--b));color:#fff;font-weight:900;font-size:22px;
  box-shadow:0 5px 0 rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;gap:8px;text-shadow:0 2px 0 rgba(0,0,0,.2)}
.cd-sheet .g button span{font-size:34px;text-shadow:none}
.cd-sheet .x{margin-top:12px;font-weight:900;color:#6b7196;padding:10px 20px;font-size:16px}
.cd-info{display:flex;flex-direction:column;align-items:center;gap:10px;max-width:100%}
.cd-land-l .cd-body{flex-direction:row;gap:18px;padding:2px 10px}
.cd-land-l .cd-opps{padding:7px 10px 4px}
.cd-land-l .cd-op{flex-direction:row;width:auto;padding:4px 10px 4px 5px;gap:6px;border-radius:999px}
.cd-land-l .cd-op .av{width:34px;height:34px}
.cd-land-l .cd-op .nm{max-width:64px}
.cd-land-l .cd-op .one{bottom:-8px}
.cd-land-l .cd-mid{flex-direction:row;gap:16px}
.cd-land-l .cd-piles{gap:14px}
.cd-land-l .cd-info{max-width:230px;gap:6px}
.cd-land-l .cd-hand{height:calc(var(--cw)*1.5 + 30px)}
.cd-land-l .cd-hc{top:20px}
.cd-land-l .cd-yt b{font-size:30px}.cd-land-l .cd-yt img{width:64px;height:64px}
.cd-land-l .cd-acts{flex-direction:column;flex-wrap:nowrap;max-height:100%}
.cd-land-l .cd-btn{min-height:50px;font-size:17px;padding:8px 16px}
.cd-land-l .cd-mid{gap:6px}
.cd-land-l .cd-txt{font-size:13px}.cd-land-l .cd-hint{font-size:12.5px;min-height:24px;padding:3px 12px}

/* ---- big screen / watcher ---- */
.cd-tb{--u:1px}
.cd-felt{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(closest-side,#3cc58f,#25976a 70%,#1d8159);
  box-shadow:0 0 0 calc(var(--u)*16) #8a5a2e,0 0 0 calc(var(--u)*22) #6a4220,inset 0 0 calc(var(--u)*80) rgba(0,0,0,.3),0 calc(var(--u)*30) calc(var(--u)*70) rgba(0,0,0,.45)}
.cd-felt::after{content:'彩虹牌';position:absolute;left:50%;top:13%;transform:translateX(-50%);font:900 calc(var(--u)*30)/1 var(--sans);letter-spacing:.3em;color:rgba(255,255,255,.13)}
.cd-tc{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*14)}
.cd-tpiles{display:flex;align-items:center;gap:calc(var(--u)*50);position:relative}
.cd-dring{position:absolute;left:50%;top:50%;width:calc(var(--u)*560);height:calc(var(--u)*400);margin:calc(var(--u)*-200) 0 0 calc(var(--u)*-280);border-radius:50%;
  border:calc(var(--u)*4) dashed rgba(255,255,255,.28);animation:cdSpin 14s linear infinite;pointer-events:none}
.cd-dring::before,.cd-dring::after{content:'➤';position:absolute;font-size:calc(var(--u)*34);color:rgba(255,255,255,.55);line-height:1}
.cd-dring::before{left:50%;top:0;transform:translate(-50%,-55%)}
.cd-dring::after{left:50%;bottom:0;transform:translate(-50%,55%) rotate(180deg)}
.cd-dring.rev{animation-direction:reverse}
.cd-dring.rev::before{transform:translate(-50%,-55%) scaleX(-1)}.cd-dring.rev::after{transform:translate(-50%,55%) rotate(180deg) scaleX(-1)}
@keyframes cdSpin{to{transform:rotate(360deg)}}
.cd-tb .cd-colchip{font-size:calc(var(--u)*26);padding:calc(var(--u)*8) calc(var(--u)*22) calc(var(--u)*8) calc(var(--u)*10)}
.cd-tb .cd-colchip .e{width:calc(var(--u)*40);height:calc(var(--u)*40);font-size:calc(var(--u)*24)}
.cd-ttxt{font-weight:900;font-size:calc(var(--u)*32);text-align:center;text-shadow:0 calc(var(--u)*3) 0 rgba(0,0,0,.3);max-width:calc(var(--u)*900);min-height:1.3em;line-height:1.3}
.cd-ttxt.pop{animation:cdTxt .45s cubic-bezier(.2,.9,.3,1.4)}
@keyframes cdTxt{from{transform:scale(.7);opacity:0}}
.cd-tturn{font-weight:900;font-size:calc(var(--u)*24);background:rgba(0,0,0,.25);border-radius:999px;padding:calc(var(--u)*6) calc(var(--u)*20)}
.cd-seat{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*4);
  background:rgba(255,255,255,.95);color:#1f2346;border-radius:calc(var(--u)*24);padding:calc(var(--u)*10) calc(var(--u)*16) calc(var(--u)*12);
  min-width:calc(var(--u)*170);box-shadow:0 calc(var(--u)*6) 0 rgba(0,0,0,.2);transition:box-shadow .3s,transform .3s}
.cd-seat.on{box-shadow:0 0 0 calc(var(--u)*6) #ffd84d,0 0 calc(var(--u)*40) rgba(255,216,77,.95);transform:translate(-50%,-50%) scale(1.08)}
.cd-seat.off{opacity:.6}
.cd-seat .av{position:relative;width:calc(var(--u)*84);height:calc(var(--u)*84)}
.cd-seat .av img{width:100%;height:100%;display:block}
.cd-seat .av .cd-ring circle{stroke-width:3}
.cd-seat .nm{font-weight:900;font-size:calc(var(--u)*24);max-width:calc(var(--u)*200);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-seat .hb{display:flex;align-items:center;height:calc(var(--u)*50)}
.cd-seat .hb .cd-card{font-size:calc(var(--u)*32);margin-left:calc(var(--u)*-22)}
.cd-seat .hb .cd-card:first-child{margin-left:0}
.cd-seat .cnt{font:700 calc(var(--u)*30)/1 var(--round);margin-left:calc(var(--u)*12)}
.cd-seat .one{position:absolute;top:calc(var(--u)*-16);right:calc(var(--u)*-14);background:#ff4d6a;color:#fff;font-weight:900;font-size:calc(var(--u)*18);border-radius:calc(var(--u)*12);
  padding:calc(var(--u)*4) calc(var(--u)*10);box-shadow:0 0 0 calc(var(--u)*3) #fff;transform:rotate(8deg)}
.cd-seat .cd-bub{font-size:calc(var(--u)*22);padding:calc(var(--u)*6) calc(var(--u)*14)}
.cd-tb .cd-yt b{font-size:calc(var(--u)*50)}
.cd-tb .cd-winov img{width:calc(var(--u)*200);height:calc(var(--u)*200)}
.cd-tb .cd-winov b{font-size:calc(var(--u)*56)}
`;
    document.head.appendChild(s);
  }

  /* helpers shared by both client views */
  const ringSVG = () => `<svg class="cd-ring" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="20"/><circle class="fg" cx="22" cy="22" r="20" stroke-dasharray="125.66" stroke-dashoffset="125.66"/></svg>`;
  const colChip = (col, kid) => { const C = CD_COLS[col] || CD_COLS[0]; return `<span class="cd-colchip" style="--cc:${C.b};--cd:${C.b}"><span class="e">${kid ? C.k : C.s}</span>${C.n}</span>`; };
  const rotOf = i => ((i * 37) % 21) - 10;

  LGAMES.push({
    id: 'cards', name: '彩虹牌', icon: '🃏', col: '#ff4d6a', blurb: '配顏色、配數字，先把手牌出完的人贏', players: [2, 6],
    rules: kid => kid ? [
      '🎨 出一張「一樣顏色」或「一樣數字」的牌',
      '✨ 會發亮、翹起來的牌就可以出',
      '🃏 沒有牌可以出？按「抽一張」',
      '🏆 手上的牌先出完就贏了！'
    ] : [
      '顏色或數字／符號相同就能出；不能出就抽一張（抽到能出的可以馬上出）',
      '⊘ 跳過　⇄ 迴轉　+2 下家抽兩張　★ 變色　+4 變色並讓下家抽四張',
      '剩一張時要按「最後一張！」，被別人先按「抓到了！」要罰抽 2 張',
      '每回合 22 秒，時間到自動抽一張並換人',
      '先出完的人贏，其他人依手上剩下的點數排名（越少越好）'
    ],

    /* ===================== HOST ===================== */
    host(ctx) {
      const kid = ctx.kid, P = ctx.players, N = P.length, ids = P.map(p => p.id);
      const nm = id => { const p = P.find(q => q.id === id); return p ? p.name : '?'; };
      const TT = kid ? 45 : 22, DT = kid ? 30 : 12, CATCH = 4, OFFLINE_WAIT = 3;
      let uid = 0; const deck = [];
      const add = (c, v, k) => { for (let i = 0; i < k; i++) deck.push({ i: uid++, c, v }); };
      for (let c = 0; c < 4; c++) {
        if (kid) { for (let v = 1; v <= 5; v++) add(c, v, 3); add(c, 'S', 2); }
        else { add(c, 0, 1); for (let v = 1; v <= 9; v++) add(c, v, 2); add(c, 'S', 2); add(c, 'R', 2); add(c, 'D', 2); }
      }
      add(4, 'W', 4); if (!kid) add(4, 'F', 4);
      shuffle(deck);
      const hands = {}; ids.forEach(id => hands[id] = []);
      const sortH = id => hands[id].sort((a, b) => rank(a) - rank(b));
      for (let k = 0; k < (kid ? 5 : 7); k++) ids.forEach(id => hands[id].push(deck.pop()));
      ids.forEach(sortH);
      let fi = deck.findIndex(c => typeof c.v === 'number'); if (fi < 0) fi = 0;
      const disc = [deck.splice(fi, 1)[0]];
      let col = disc[0].c === 4 ? rint(4) : disc[0].c, dir = 1, turn = rint(N), ph = 'play', drawn = null, tStart = 0, dead = 0, tTot = TT;
      let catchW = null, win = null, over = false, endAt = 0, txt = '', evn = 0;
      const said = {}, evs = [];
      const ev = o => { o.n = ++evn; evs.push(o); if (evs.length > 8) evs.shift(); };
      const top = () => disc[disc.length - 1];
      const can = cd => cd.c === 4 || cd.c === col || cd.v === top().v;
      const nextIdx = k => (((turn + dir * k) % N) + N) % N;
      const setTurn = idx => { turn = idx; ph = 'play'; drawn = null; tStart = ctx.now(); tTot = TT; dead = tStart + TT; };
      const draw = (id, k) => {
        const got = [];
        for (let n = 0; n < k; n++) {
          if (!deck.length && disc.length > 1) { const t = disc.pop(); deck.push(...shuffle(disc.splice(0))); disc.push(t); ev({ t: 'shuf' }); }
          if (!deck.length) break;
          const cd = deck.pop(); hands[id].push(cd); got.push(cd);
        }
        sortH(id); said[id] = false;
        if (catchW && catchW.id === id) catchW = null;
        return got;
      };
      const finishWin = id => {
        win = id; ph = 'end'; endAt = ctx.now() + 2.6; catchW = null;
        txt = `${nm(id)} 出完了！🎉`; ev({ t: 'win', p: id });
      };
      const doPlay = (id, cd, chosen) => {
        const h = hands[id]; h.splice(h.indexOf(cd), 1);
        disc.push(cd); if (disc.length > 60) disc.splice(0, disc.length - 60).forEach(c => deck.unshift(c));
        col = cd.c === 4 ? chosen : cd.c;
        ev({ t: 'play', p: id, c: cd, col });
        txt = `${nm(id)} 出了 ${cardTxt(cd, col)}`;
        if (!h.length) { finishWin(id); return; }
        if (h.length === 1 && !kid) {
          if (said[id]) txt += '（最後一張！）';
          else catchW = { id, until: ctx.now() + CATCH };
        }
        let skip = 1;
        if (cd.v === 'S') { skip = 2; txt += `，${nm(ids[nextIdx(1)])} 跳過一輪`; ev({ t: 'skip', p: ids[nextIdx(1)] }); }
        else if (cd.v === 'R') { if (N === 2) { skip = 2; txt += '，再出一次！'; } else { dir = -dir; txt += '，方向反轉！'; } ev({ t: 'rev', d: dir }); }
        else if (cd.v === 'D' || cd.v === 'F') {
          const k = cd.v === 'D' ? 2 : 4, vid = ids[nextIdx(1)], got = draw(vid, k);
          ev({ t: 'draw', p: vid, k: got.length }); skip = 2; txt += `，${nm(vid)} 抽 ${k} 張！`;
        }
        setTurn(nextIdx(skip));
      };
      const doDraw = (id, auto) => {
        const got = draw(id, 1);
        ev({ t: 'draw', p: id, k: got.length });
        txt = auto ? `${nm(id)} ${auto}，抽一張` : `${nm(id)} 抽了一張`;
        if (!auto && got.length && can(got[0])) { ph = 'drawn'; drawn = got[0].i; tTot = DT; dead = ctx.now() + DT; return; }
        if (!got.length) txt = `${nm(id)} 沒牌可抽，換下一位`;
        setTurn(nextIdx(1));
      };
      const keep = (id, why) => { txt = why ? `${nm(id)} ${why}` : `${nm(id)} 把牌留著`; setTurn(nextIdx(1)); };
      setTurn(turn);
      txt = `發牌！${nm(ids[turn])} 先出`;
      ev({ t: 'deal' });

      return {
        get over() { return over; },
        view(id) {
          const now = ctx.now(), cur = ids[turn];
          const v = {
            kid, col, top: disc.slice(-3), deck: deck.length, dir, turn: cur, ph, win, txt, evs,
            tl: ph === 'end' ? 0 : Math.max(0, Math.round((dead - now) * 10) / 10), tt: tTot,
            ps: ids.map(pid => ({ id: pid, n: hands[pid].length, s: !kid && !!said[pid] && hands[pid].length <= 2, on: ctx.online(pid) })),
            ct: catchW ? { id: catchW.id, tl: Math.max(0, Math.round((catchW.until - now) * 10) / 10) } : null
          };
          if (id && hands[id]) {
            v.hand = hands[id]; v.said = !!said[id];
            if (cur === id && ph === 'play') v.pl = hands[id].filter(can).map(c => c.i);
            else if (cur === id && ph === 'drawn') { v.pl = [drawn]; v.drawn = drawn; }
          }
          return v;
        },
        msg(id, d) {
          if (!d || ph === 'end' || !hands[id]) return;
          const h = hands[id], now = ctx.now();
          if (d.last) {
            if (kid || h.length > 2 || said[id]) return;
            said[id] = true; ev({ t: 'last', p: id });
            if (catchW && catchW.id === id) { catchW = null; txt = `${nm(id)}：最後一張！（好險）`; }
            else txt = `${nm(id)}：最後一張！`;
            ctx.push(); return;
          }
          if (d.catch) {
            if (kid || !catchW || catchW.id === id || now > catchW.until) return;
            const vic = catchW.id; if (hands[vic].length !== 1) { catchW = null; return; }
            catchW = null; const got = draw(vic, 2);
            ev({ t: 'caught', p: vic, by: id }); ev({ t: 'draw', p: vic, k: got.length });
            txt = `${nm(id)} 抓到了！${nm(vic)} 沒喊最後一張，罰抽 2 張`;
            ctx.push(); return;
          }
          if (ids[turn] !== id) return;
          if (d.draw && ph === 'play') doDraw(id);
          else if (d.keep && ph === 'drawn') keep(id);
          else if (d.play != null) {
            const cd = h.find(c => c.i === d.play);
            if (!cd || !can(cd) || (ph === 'drawn' && cd.i !== drawn)) return;
            const ch = (d.col | 0) === d.col && d.col >= 0 && d.col < 4 ? d.col : rint(4);
            doPlay(id, cd, cd.c === 4 ? ch : null);
          } else return;
          ctx.push();
        },
        tick() {
          const now = ctx.now();
          if (ph === 'end') { if (now >= endAt) over = true; return; }
          if (catchW && now > catchW.until) { catchW = null; ctx.push(); }
          const cur = ids[turn];
          if (!ctx.online(cur) && now - tStart > OFFLINE_WAIT) {
            if (ph === 'drawn' || hands[cur].length >= 12) keep(cur, '不在線上，換下一位'); else doDraw(cur, '不在線上');
            ctx.push();
          } else if (now > dead) {
            if (ph === 'drawn') keep(cur, '時間到，換下一位'); else doDraw(cur, '時間到');
            ctx.sound(cur, 'buzz'); ctx.push();
          }
        },
        leave() { ctx.push(); },
        back() { ctx.push(); },
        results() {
          return {
            lowWins: true,
            sub: kid ? '先出完的人贏，其他人看手上剩幾張' : '分數＝手上剩下的牌（數字照點數，功能牌 20，變色 50），越少越好',
            rows: ids.map(id => {
              const h = hands[id], pts = h.reduce((s, c) => s + cardPts(c), 0);
              if (id === win) return { id, key: -1, line: '🎉 第一個出完！' };
              return kid ? { id, key: h.length, line: `還剩 ${h.length} 張` } : { id, key: pts, line: `剩 ${h.length} 張 · ${pts} 分` };
            })
          };
        }
      };
    },

    /* ===================== CLIENT ===================== */
    client(root, api) {
      css();
      const kid = api.kid, me = api.me, phone = me != null;
      const R = document.createElement('div');
      R.className = 'cd-root ' + (kid ? 'cd-kid ' : '') + (phone ? 'cd-ph' : 'cd-tb');
      root.appendChild(R);
      const pl = id => api.player(id) || { name: '?', animal: 0, col: 0 };
      let V = null, lastN = -1, tEnd = 0, tTot = 1, ctEnd = 0, prevTurn = null, ticked = -1, winShown = false, timer = 0;
      const posIn = el => { const a = el.getBoundingClientRect(), b = R.getBoundingClientRect(); return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, w: a.width }; };
      function fly(html, from, to, delay, toW, rot) {
        if (!from || !to) return;
        const el = document.createElement('div'); el.className = 'cd-fly'; el.innerHTML = html;
        el.style.setProperty('--cw', toW + 'px'); R.appendChild(el);
        const w = toW, h = toW * 1.5, s0 = Math.max(0.2, from.w / toW);
        const a = el.animate([
          { transform: `translate(${from.x - w / 2}px,${from.y - h / 2}px) scale(${s0}) rotate(${-rot || 0}deg)`, opacity: 0.9 },
          { transform: `translate(${to.x - w / 2}px,${to.y - h / 2}px) scale(1) rotate(${rot || 0}deg)`, opacity: 1 }
        ], { duration: 430, delay: delay || 0, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'both' });
        a.onfinish = () => el.remove(); setTimeout(() => el.remove(), 1500 + (delay || 0));
      }
      function bubble(host, text) {
        if (!host) return; const b = document.createElement('div'); b.className = 'cd-bub'; b.textContent = text;
        host.appendChild(b); setTimeout(() => b.remove(), 1900);
      }
      function confetti() {
        const cols = ['#ff4d6a', '#ffc928', '#2fcf7a', '#3f8cff', '#b06bff', '#fff'];
        for (let i = 0; i < 40; i++) {
          const c = document.createElement('i'); c.className = 'cd-conf';
          c.style.left = (Math.random() * 100) + '%'; c.style.background = cols[i % cols.length];
          c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = (Math.random() * .5) + 's';
          R.appendChild(c); setTimeout(() => c.remove(), 4000);
        }
      }
      function showWin(v) {
        if (winShown || !v.win) return; winShown = true;
        const p = pl(v.win), mine = v.win === me;
        const o = document.createElement('div'); o.className = 'cd-winov';
        o.innerHTML = `<div><img alt="" src="${api.avatar(p, 160)}"><b>${mine ? '你出完了！🎉' : esc(p.name) + ' 出完了！🎉'}</b></div>`;
        R.appendChild(o); confetti();
        if (mine) api.vibrate(300);
      }
      function setRing(svg, frac) {
        if (!svg) return; const fg = svg.querySelector('.fg');
        fg.setAttribute('stroke-dashoffset', (125.66 * (1 - clamp(frac, 0, 1))).toFixed(1));
        svg.classList.toggle('low', frac < 0.3);
      }

      /* ----------------------------------------------------------- PHONE ----------------------------------------------------------- */
      if (phone) {
        R.innerHTML = `
          <div class="cd-opps"></div>
          <div class="cd-body">
            <div class="cd-mid">
              <div class="cd-piles"><div class="cd-dpile"></div><div class="cd-disc"></div>
                <div class="cd-pinfo"><span class="cd-cc"></span><span class="cd-dir"><span>➜</span><em></em></span></div></div>
              <div class="cd-info"><div class="cd-txt"></div><div class="cd-hint"></div></div>
            </div>
            <div class="cd-acts"></div>
          </div>
          <div class="cd-tbar"><i></i></div>
          <div class="cd-hand"><div class="cd-fan"></div></div>
          <div class="cd-yt"><img alt=""><b>輪到你了！</b></div>`;
        const q = s => R.querySelector(s);
        const oppsEl = q('.cd-opps'), dpEl = q('.cd-dpile'), discEl = q('.cd-disc'), ccEl = q('.cd-cc'), dirEl = q('.cd-dir'), txtEl = q('.cd-txt'),
          hintEl = q('.cd-hint'), actsEl = q('.cd-acts'), tbar = q('.cd-tbar'), handEl = q('.cd-hand'), fanEl = q('.cd-fan'), ytEl = q('.cd-yt');
        ytEl.querySelector('img').src = api.avatar(pl(me), 128);
        const handEls = new Map(); let oppKey = '', sheet = null, discKey = '', actKey = '', sending = 0;
        let CW = 80;
        function sizes() {
          const W = R.clientWidth, H = R.clientHeight, land = W > H * 1.15;
          R.classList.toggle('cd-land-l', land);
          CW = land ? clamp(H * (kid ? 0.22 : 0.2), 52, 120) : clamp(Math.min(W * (kid ? 0.27 : 0.24), H * (kid ? 0.17 : 0.15)), 60, 140);
          const pw = land ? clamp(H * 0.2, 50, 110) : clamp(Math.min(W * 0.3, H * 0.17), 70, 160);
          R.style.setProperty('--cw', CW + 'px'); R.style.setProperty('--pw', pw + 'px'); R.style.setProperty('--dw', (pw * 0.78) + 'px');
          const n = Math.max(1, (V ? V.ps.length : 2) - 1);
          R.style.setProperty('--opw', clamp((W - 28 - (n - 1) * 16) / n, 54, land ? 80 : 88) + 'px');
          layoutHand();
        }
        const ro = new ResizeObserver(sizes); ro.observe(R);

        function layoutHand() {
          if (!V || !V.hand) return;
          const h = V.hand, n = h.length, W = handEl.clientWidth, pad = 24;
          let step = n > 1 ? Math.min(CW * (n <= 6 ? 0.84 : 0.66), (W - CW - pad * 2) / (n - 1)) : 0, minStep = CW * 0.3;
          if (n > 1 && step < minStep) step = minStep;
          const full = CW + step * (n - 1) + pad * 2;
          fanEl.style.width = Math.max(W, full) + 'px';
          const x0 = Math.max(pad, (Math.max(W, full) - (CW + step * (n - 1))) / 2);
          const fanA = Math.min(2.6, 18 / Math.max(1, n)), plSet = new Set(V.pl || []), myTurn = V.turn === me && V.ph !== 'end';
          h.forEach((cd, i) => {
            const el = handEls.get(cd.i); if (!el) return;
            const off = i - (n - 1) / 2, ang = full > W ? 0 : off * fanA, lift = plSet.has(cd.i) ? -(kid ? 26 : 20) : 0;
            el.style.left = (x0 + i * step) + 'px'; el.style.zIndex = i + 1;
            el.style.transform = `translateY(${lift + Math.abs(off) * Math.abs(ang) * 0.9}px) rotate(${ang}deg)`;
            el.classList.toggle('pl', plSet.has(cd.i));
            el.classList.toggle('dim', myTurn && !plSet.has(cd.i));
          });
        }
        function tapCard(cd, el) {
          if (!V || V.ph === 'end') return;
          if (V.turn !== me) { api.sfx('wrong'); wiggle(el); api.toast(kid ? '還沒輪到你喔 ⏳' : '還沒輪到你'); return; }
          if (!(V.pl || []).includes(cd.i)) { api.sfx('wrong'); wiggle(el); api.toast(kid ? '要出 發亮 的牌喔 ✨' : (V.ph === 'drawn' ? '只能出剛抽到的那張，或按「留著」' : '這張不能出：要同顏色或同數字')); return; }
          if (cd.c === 4) { openSheet(cd); return; }
          play(cd);
        }
        function play(cd, c) {
          const el = handEls.get(cd.i);
          sending = performance.now();
          api.sfx('card');
          api.send(c == null ? { play: cd.i } : { play: cd.i, col: c });
          if (el) el.style.transform += ' translateY(-30px)';
        }
        function wiggle(el) { if (!el) return; el.classList.remove('cd-wiggle'); void el.offsetWidth; el.classList.add('cd-wiggle'); api.vibrate(40); }
        function openSheet(cd) {
          closeSheet(); api.sfx('pop');
          sheet = document.createElement('div'); sheet.className = 'cd-sheet';
          sheet.innerHTML = `<div><h3>${kid ? '🌈 選一個顏色' : '要換成什麼顏色？'}</h3><div class="g">${CD_COLS.map((C, k) => `<button data-c="${k}" style="--a:${C.a};--b:${C.b}"><span>${kid ? C.k : C.s}</span>${kid ? '' : C.n}</button>`).join('')}</div><button class="x">${kid ? '✖' : '取消'}</button></div>`;
          sheet.onclick = e => {
            const b = e.target.closest('[data-c]');
            if (b) { const c = +b.dataset.c; closeSheet(); play(cd, c); }
            else if (e.target === sheet || e.target.closest('.x')) closeSheet();
          };
          R.appendChild(sheet);
        }
        function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } }

        function drawOpps(v) {
          const i0 = v.ps.findIndex(p => p.id === me), list = [];
          for (let k = 1; k < v.ps.length; k++) list.push(v.ps[(i0 + k) % v.ps.length]);
          const key = list.map(p => p.id).join(',');
          if (key !== oppKey) {
            oppKey = key;
            oppsEl.innerHTML = list.map((p, k) => (k ? '<span class="cd-sep">›</span>' : '') +
              `<div class="cd-op" data-id="${esc(p.id)}"><div class="av"><img alt="" src="${api.avatar(pl(p.id), 96)}">${ringSVG()}</div><div class="nm">${esc(pl(p.id).name)}</div><div class="ct">${backHTML('cd-mini')}<span class="n"></span></div></div>`).join('');
            sizes();
          }
          list.forEach(p => {
            const el = oppsEl.querySelector(`[data-id="${CSS.escape(p.id)}"]`); if (!el) return;
            el.classList.toggle('on', v.turn === p.id && v.ph !== 'end'); el.classList.toggle('off', !p.on);
            el.querySelector('.n').textContent = p.n;
            let one = el.querySelector('.one');
            const showOne = p.n === 1;
            if (showOne && !one) { one = document.createElement('span'); one.className = 'one'; el.appendChild(one); }
            if (one) { if (!showOne) one.remove(); else one.textContent = kid ? '剩 1 張！' : (p.s ? '最後一張！' : '剩 1 張'); }
          });
          oppsEl.querySelectorAll('.cd-sep').forEach(s => s.classList.toggle('rev', v.dir < 0));
        }
        function drawPiles(v) {
          const key = v.top.map(c => c.i).join(',');
          if (key !== discKey) {
            const prevTop = discKey.split(',').pop(), topCd = v.top[v.top.length - 1];
            discKey = key;
            discEl.innerHTML = v.top.map((c, k) => cardHTML(c, kid, (kid ? 'cd-kidc ' : '') + (k === v.top.length - 1 && String(c.i) !== prevTop ? 'cd-land' : '')))
              .join('');
            [...discEl.children].forEach((el, k) => { const r = rotOf(v.top[k].i); el.style.setProperty('--r', r + 'deg'); el.style.transform = `rotate(${r}deg)`; });
            void topCd;
          }
          const C = CD_COLS[v.col]; discEl.style.setProperty('--cc', C.a);
          ccEl.innerHTML = colChip(v.col, kid);
          dpEl.innerHTML = backHTML() + backHTML() + backHTML() + `<span class="n">${v.deck}</span>`;
          dirEl.classList.toggle('rev', v.dir < 0); dirEl.querySelector('em').textContent = v.dir > 0 ? '順' : '逆';
        }
        function drawActs(v) {
          const myTurn = v.turn === me && v.ph !== 'end', h = v.hand || [];
          const ct = v.ct && v.ct.id !== me ? v.ct : null;
          const needLast = !kid && h.length <= 2 && h.length > 0 && !v.said && (h.length === 1 || (myTurn && (v.pl || []).length));
          const key = [myTurn, v.ph, needLast, ct ? ct.id : '', v.drawn].join('|');
          if (key === actKey) return; actKey = key;
          let html = '';
          if (ct) html += `<button class="cd-btn catch" data-a="catch"><img alt="" src="${api.avatar(pl(ct.id), 64)}">抓到了！</button>`;
          if (needLast) html += `<button class="cd-btn last" data-a="last">☝️ 最後一張！</button>`;
          if (myTurn && v.ph === 'drawn') html += `<button class="cd-btn ok" data-a="playdrawn">${kid ? '✨ 出這張' : '出這張'}</button><button class="cd-btn ghost" data-a="keep">${kid ? '👌 留著' : '留著，換人'}</button>`;
          else html += `<button class="cd-btn draw ${myTurn && !(v.pl || []).length ? 'go' : ''}" data-a="draw" ${myTurn ? '' : 'disabled'}>🃏 抽一張</button>`;
          actsEl.innerHTML = html;
        }
        actsEl.onclick = e => {
          const b = e.target.closest('[data-a]'); if (!b || !V) return;
          const a = b.dataset.a;
          if (a === 'draw') { api.sfx('flip'); api.send({ draw: 1 }); b.disabled = true; }
          else if (a === 'keep') { api.sfx('pop'); api.send({ keep: 1 }); }
          else if (a === 'playdrawn') { const cd = (V.hand || []).find(c => c.i === V.drawn); if (cd) tapCard(cd, handEls.get(cd.i)); }
          else if (a === 'last') { api.sfx('star'); api.vibrate(60); api.send({ last: 1 }); b.remove(); }
          else if (a === 'catch') { api.sfx('buzz'); api.vibrate(80); api.send({ catch: 1 }); b.remove(); }
        };
        function drawHand(v, flights) {
          const h = v.hand || [], seen = new Set();
          h.forEach(cd => {
            seen.add(cd.i);
            if (!handEls.has(cd.i)) {
              const el = document.createElement('div'); el.className = 'cd-hc' + (lastN >= 0 ? ' new' : '');
              el.innerHTML = cardHTML(cd, kid, kid ? 'cd-kidc' : '');
              el.onclick = () => tapCard(cd, el);
              fanEl.appendChild(el); handEls.set(cd.i, el);
            }
          });
          for (const [i, el] of handEls) if (!seen.has(i)) { el.remove(); handEls.delete(i); }
          if (v.drawn != null && !flights.drawnScrolled) { const el = handEls.get(v.drawn); if (el) setTimeout(() => el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 50); }
          layoutHand();
        }
        function events(v) {
          const fl = [];
          if (lastN < 0) { lastN = v.evs.length ? v.evs[v.evs.length - 1].n : 0; api.sfx('deal'); return fl; }
          for (const e of v.evs) {
            if (e.n <= lastN) continue;
            const opEl = e.p && e.p !== me ? oppsEl.querySelector(`[data-id="${CSS.escape(e.p)}"]`) : null;
            if (e.t === 'play') {
              const src = e.p === me ? (handEls.get(e.c.i) ? posIn(handEls.get(e.c.i)) : posIn(handEl)) : opEl ? posIn(opEl) : null;
              fl.push(() => fly(cardHTML(e.c, kid, kid ? 'cd-kidc' : ''), src, posIn(discEl), 0, discEl.offsetWidth, rotOf(e.c.i)));
              if (e.p !== me) api.sfx('card');
              if (e.c.c === 4) setTimeout(() => api.sfx('star'), 250);
            } else if (e.t === 'draw' && e.k) {
              const to = e.p === me ? posIn(handEl) : opEl ? posIn(opEl) : null;
              for (let k = 0; k < Math.min(e.k, 4); k++) fl.push(() => fly(backHTML(), posIn(dpEl), to, k * 110, dpEl.offsetWidth * 0.8, 0));
              api.sfx(e.k > 1 ? 'deal' : 'flip');
              if (e.p === me && e.k > 1) api.vibrate(120);
            } else if (e.t === 'last') { api.sfx('star'); bubble(e.p === me ? hintEl.parentNode : opEl, '☝️ 最後一張！'); }
            else if (e.t === 'caught') { api.sfx('buzz'); if (e.p === me) { api.vibrate(250); api.toast('被抓到了！沒喊最後一張，罰抽 2 張'); } else bubble(opEl, '😱 被抓到了！'); }
            else if (e.t === 'skip') { api.sfx('pop'); if (e.p === me) { api.toast(kid ? '🚫 你被跳過一次' : '你被跳過了'); api.vibrate(60); } else bubble(opEl, '🚫 跳過'); }
            else if (e.t === 'rev') api.sfx('whoosh');
            else if (e.t === 'shuf') api.sfx('deal');
            else if (e.t === 'win') { api.sfx('win'); }
          }
          lastN = v.evs.length ? v.evs[v.evs.length - 1].n : lastN;
          return fl;
        }
        function hint(v) {
          const myTurn = v.turn === me;
          hintEl.classList.toggle('me', myTurn && v.ph !== 'end');
          handEl.classList.toggle('me', myTurn && v.ph !== 'end');
          if (v.ph === 'end') { hintEl.textContent = v.win === me ? '🎉 你贏了！' : `🏁 ${pl(v.win).name} 贏了`; return; }
          if (!myTurn) { hintEl.textContent = `⏳ 等 ${pl(v.turn).name} 出牌…`; return; }
          const n = (v.pl || []).length;
          if (v.ph === 'drawn') hintEl.textContent = kid ? '✨ 抽到能出的牌！要出嗎？' : '抽到能出的牌：出這張，或留著';
          else if (n) hintEl.textContent = kid ? '👉 輪到你！出一張 發亮 的牌' : `輪到你：出 ${CD_COLS[v.col].n} 或 ${typeof v.top[v.top.length - 1].v === 'number' ? '數字 ' + v.top[v.top.length - 1].v : '同符號'} 的牌`;
          else hintEl.textContent = kid ? '🃏 沒有牌可以出，按「抽一張」' : '沒有能出的牌，抽一張吧';
        }
        function tickUI() {
          if (!V) return;
          const now = performance.now() / 1000, left = Math.max(0, tEnd - now), frac = left / tTot;
          const myTurn = V.turn === me && V.ph !== 'end';
          tbar.classList.toggle('on', myTurn);
          tbar.classList.toggle('low', frac < 0.3);
          tbar.querySelector('i').style.transform = `scaleX(${frac.toFixed(3)})`;
          const cur = oppsEl.querySelector('.cd-op.on .cd-ring');
          oppsEl.querySelectorAll('.cd-ring').forEach(s => { if (s !== cur) setRing(s, 0); });
          if (cur) setRing(cur, frac);
          if (myTurn && !kid && left < 5.5 && left > 0) { const s = Math.ceil(left); if (s !== ticked) { ticked = s; api.sfx('tick'); } }
          const cb = actsEl.querySelector('.catch');
          if (cb && now > ctEnd) cb.remove();
        }
        timer = setInterval(tickUI, 100);

        return {
          view(v) {
            if (!v) return;
            const first = V == null; V = v;
            if (first) sizes();
            tEnd = performance.now() / 1000 + v.tl; tTot = Math.max(1, v.tt);
            if (v.ct) ctEnd = performance.now() / 1000 + v.ct.tl;
            const fl = events(v);
            drawOpps(v); drawPiles(v); drawActs(v); drawHand(v, fl); hint(v);
            txtEl.textContent = v.txt;
            fl.forEach(f => f());
            if (v.turn === me && prevTurn !== me && v.ph !== 'end') {
              ytEl.classList.remove('go'); void ytEl.offsetWidth; ytEl.classList.add('go');
              api.sfx('turn'); api.vibrate(200); ticked = -1;
            }
            if (v.turn !== me || v.ph !== 'drawn') { if (sheet && v.turn !== me) closeSheet(); }
            prevTurn = v.ph === 'end' ? null : v.turn;
            if (v.win) showWin(v);
            tickUI();
          },
          destroy() { clearInterval(timer); ro.disconnect(); }
        };
      }

      /* ----------------------------------------------------------- BIG SCREEN ----------------------------------------------------------- */
      R.innerHTML = `<div class="cd-felt"></div><div class="cd-seats"></div>
        <div class="cd-tc"><div class="cd-tpiles"><div class="cd-dring"></div><div class="cd-dpile"></div><div class="cd-disc"></div><span class="cd-cc"></span></div>
          <div class="cd-ttxt"></div><div class="cd-tturn"></div></div>
        <div class="cd-yt"><img alt=""><b></b></div>`;
      const q = s => R.querySelector(s);
      const felt = q('.cd-felt'), seatsEl = q('.cd-seats'), dpEl = q('.cd-dpile'), discEl = q('.cd-disc'), ccEl = q('.cd-cc'), txtEl = q('.cd-ttxt'),
        turnEl = q('.cd-tturn'), ringEl = q('.cd-dring'), ytEl = q('.cd-yt');
      let seatKey = '', discKey = '', lastTxt = '';
      const seatEl = id => seatsEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
      function layout() {
        const W = R.clientWidth, H = R.clientHeight, u = Math.min(W / 1600, H / 900);
        R.style.setProperty('--u', u + 'px');
        R.style.setProperty('--pw', (kid ? 170 : 160) * u + 'px'); R.style.setProperty('--dw', 120 * u + 'px');
        felt.style.width = W * 0.7 + 'px'; felt.style.height = H * 0.6 + 'px';
        const ringW = Math.min(560 * u, W * 0.6); ringEl.style.width = ringW + 'px'; ringEl.style.marginLeft = -ringW / 2 + 'px';
        if (!V) return;
        const n = V.ps.length, rx = W * 0.41, ry = H * 0.37, cx = W / 2, cy = H * 0.52;
        V.ps.forEach((p, i) => {
          const el = seatEl(p.id); if (!el) return;
          const a = Math.PI / 2 + i * Math.PI * 2 / n;
          el.style.left = (cx + rx * Math.cos(a)) + 'px'; el.style.top = clamp(cy + ry * Math.sin(a), 110 * u, H - 110 * u) + 'px';
        });
      }
      const ro = new ResizeObserver(layout); ro.observe(R);
      function drawSeats(v) {
        const key = v.ps.map(p => p.id).join(',');
        if (key !== seatKey) {
          seatKey = key;
          seatsEl.innerHTML = v.ps.map(p => `<div class="cd-seat" data-id="${esc(p.id)}"><div class="av"><img alt="" src="${api.avatar(pl(p.id), 128)}">${ringSVG()}</div>
            <div class="nm">${esc(pl(p.id).name)}</div><div class="hb"><span class="bk"></span><span class="cnt"></span></div></div>`).join('');
          layout();
        }
        v.ps.forEach(p => {
          const el = seatEl(p.id); if (!el) return;
          el.classList.toggle('on', v.turn === p.id && v.ph !== 'end'); el.classList.toggle('off', !p.on);
          const bk = el.querySelector('.bk');
          if (bk.dataset.n !== String(p.n)) { bk.dataset.n = p.n; bk.style.display = 'flex'; bk.innerHTML = Array.from({ length: Math.min(p.n, 9) }, () => backHTML('cd-mini')).join(''); }
          el.querySelector('.cnt').textContent = '×' + p.n;
          let one = el.querySelector('.one');
          if (p.n === 1 && !one) { one = document.createElement('span'); one.className = 'one'; el.appendChild(one); }
          if (one) { if (p.n !== 1) one.remove(); else one.textContent = kid ? '剩 1 張！' : (p.s ? '最後一張！' : '剩 1 張'); }
        });
      }
      function drawCenter(v) {
        const key = v.top.map(c => c.i).join(',');
        if (key !== discKey) {
          const prevTop = discKey.split(',').pop(); discKey = key;
          discEl.innerHTML = v.top.map((c, k) => cardHTML(c, kid, (kid ? 'cd-kidc ' : '') + (k === v.top.length - 1 && String(c.i) !== prevTop ? 'cd-land' : ''))).join('');
          [...discEl.children].forEach((el, k) => { const r = rotOf(v.top[k].i); el.style.setProperty('--r', r + 'deg'); el.style.transform = `rotate(${r}deg)`; });
        }
        discEl.style.setProperty('--cc', CD_COLS[v.col].a);
        ccEl.innerHTML = colChip(v.col, kid);
        dpEl.innerHTML = backHTML() + backHTML() + backHTML() + `<span class="n">${v.deck}</span>`;
        ringEl.classList.toggle('rev', v.dir < 0);
        if (v.txt !== lastTxt) { lastTxt = v.txt; txtEl.textContent = v.txt; txtEl.classList.remove('pop'); void txtEl.offsetWidth; txtEl.classList.add('pop'); }
        turnEl.textContent = v.ph === 'end' ? '🏁 這局結束' : `👉 輪到 ${pl(v.turn).name}${v.dir > 0 ? '　↻ 順時針' : '　↺ 逆時針'}`;
      }
      function events(v) {
        const fl = [];
        if (lastN < 0) { lastN = v.evs.length ? v.evs[v.evs.length - 1].n : 0; api.sfx('deal'); return fl; }
        for (const e of v.evs) {
          if (e.n <= lastN) continue;
          const se = e.p ? seatEl(e.p) : null;
          if (e.t === 'play' && se) { fl.push(() => fly(cardHTML(e.c, kid, kid ? 'cd-kidc' : ''), posIn(se), posIn(discEl), 0, discEl.offsetWidth, rotOf(e.c.i))); api.sfx('card'); }
          else if (e.t === 'draw' && e.k && se) { for (let k = 0; k < Math.min(e.k, 4); k++) fl.push(() => fly(backHTML(), posIn(dpEl), posIn(se), k * 110, dpEl.offsetWidth * 0.6, 0)); api.sfx(e.k > 1 ? 'deal' : 'flip'); }
          else if (e.t === 'last') { api.sfx('star'); bubble(se, '☝️ 最後一張！'); }
          else if (e.t === 'caught') { api.sfx('buzz'); bubble(se, '😱 被抓到了！'); }
          else if (e.t === 'skip') bubble(se, '🚫 跳過');
          else if (e.t === 'rev') api.sfx('whoosh');
        }
        lastN = v.evs.length ? v.evs[v.evs.length - 1].n : lastN;
        return fl;
      }
      function tickUI() {
        if (!V) return;
        const left = Math.max(0, tEnd - performance.now() / 1000), frac = left / tTot;
        seatsEl.querySelectorAll('.cd-seat').forEach(s => setRing(s.querySelector('.cd-ring'), s.classList.contains('on') ? frac : 0));
      }
      timer = setInterval(tickUI, 100);
      return {
        view(v) {
          if (!v) return;
          const first = V == null; V = v;
          tEnd = performance.now() / 1000 + v.tl; tTot = Math.max(1, v.tt);
          const fl = events(v);
          drawSeats(v); drawCenter(v);
          if (first) layout();
          fl.forEach(f => f());
          if (api.isTable && v.turn !== prevTurn && v.ph !== 'end') {
            ytEl.querySelector('img').src = api.avatar(pl(v.turn), 128);
            ytEl.querySelector('b').textContent = `輪到 ${pl(v.turn).name}！`;
            ytEl.classList.remove('go'); void ytEl.offsetWidth; ytEl.classList.add('go');
            api.sfx('turn');
          }
          prevTurn = v.ph === 'end' ? null : v.turn;
          if (v.win) showWin(v);
          tickUI();
        },
        destroy() { clearInterval(timer); ro.disconnect(); }
      };
    },

    /* ===================== BOT ===================== */
    bot(v, api) {
      const me = api.me; if (!v || v.ph === 'end' || !v.hand) return;
      if (v.ct && v.ct.id !== me && Math.random() < 0.3) { api.send({ catch: 1 }); return; }
      if (v.turn !== me) return;
      const pl = (v.pl || []).map(i => v.hand.find(c => c.i === i)).filter(Boolean);
      if (!v.kid && !v.said && v.hand.length === 2 && pl.length && Math.random() < 0.6) api.send({ last: 1 });
      if (v.ph === 'drawn') {
        if (pl.length && Math.random() < 0.75) { const cd = pl[0]; api.send(cd.c === 4 ? { play: cd.i, col: rint(4) } : { play: cd.i }); }
        else api.send({ keep: 1 });
        return;
      }
      if (pl.length) { const cd = pl[rint(pl.length)]; api.send(cd.c === 4 ? { play: cd.i, col: rint(4) } : { play: cd.i }); }
      else api.send({ draw: 1 });
    }
  });
})();

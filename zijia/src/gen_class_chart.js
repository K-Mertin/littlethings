const D=JSON.parse(require('fs').readFileSync('/tmp/classdata.json','utf8'));
const C=Object.fromEntries(D.classes.map(c=>[c.id,c]));
const TN=['','初階','中階','上階','極'];
const fmt=n=>Math.round(n).toLocaleString('en-US');
function skills(s){const o=[];
 if(s.hitUp)o.push(`命中+${s.hitUp}`);if(s.evaUp)o.push(`迴避+${s.evaUp}`);if(s.dmgUp)o.push(`傷害+${s.dmgUp}%`);
 if(s.dmgDown>0)o.push(`減傷${s.dmgDown}%`);if(s.dmgDown<0)o.push(`受傷+${-s.dmgDown}%`);if(s.crit)o.push(`會心+${s.crit}%`);
 if(s.pierce)o.push(`貫穿${s.pierce}%`);if(s.counterFirst)o.push('先制反擊');if(s.regen)o.push(`再生${s.regen}%`);
 if(s.willStart)o.push(`初始氣力+${s.willStart}`);if(s.killWill)o.push(`擊墜氣力+${s.killWill}`);if(s.spRegen)o.push(`SP回復+${s.spRegen}`);
 if(s.heal)o.push(`修理${s.heal.min===s.heal.max?s.heal.min:s.heal.min+'–'+s.heal.max}格 ${s.heal.pct}%`);
 if(s.aura)o.push(`指揮${s.aura.range}格 命${s.aura.hit}/避${s.aura.eva}${s.aura.dmg?'/傷'+s.aura.dmg+'%':''}`);
 if(s.guardAura)o.push(`守護${s.guardAura.range}格 −${s.guardAura.pct}%`);return o;}
const ROUTE={A:'守護之字',B:'赤環之誓',H:'無銘之甲'};
function node(c){
  const top=c.weapons.reduce((a,b)=>b.pow>a.pow?b:a);
  const s=c.s1, sk=skills(c.skills);
  return `<article class="node t${c.tier}">
    <header><span class="tier">${TN[c.tier]}</span><h4>${c.name}</h4>${c.fly?'<span class="fly">飛行</span>':''}</header>
    <p class="desc">${c.desc}</p>
    ${sk.length?`<ul class="sk">${sk.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<ul class="sk"><li class="none">無特殊能力</li></ul>'}
    <dl class="st"><div><dt>HP</dt><dd>${fmt(s.hp)}</dd></div><div><dt>攻</dt><dd>${s.atk}</dd></div><div><dt>甲</dt><dd>${fmt(s.def)}</dd></div><div><dt>命</dt><dd>${s.hit}</dd></div><div><dt>避</dt><dd>${s.eva}</dd></div><div><dt>移</dt><dd>${s.mov}</dd></div></dl>
    <p class="wp"><span>最強武器</span>${top.name}<b>${fmt(top.pow)}</b><i>射程 ${top.min===top.max?top.min:top.min+'–'+top.max}${top.will?` · 氣力${top.will}`:''}${top.post?'':' · 移動後✕'}</i></p>
    ${c.req?`<p class="req">${ROUTE[c.req.route]}路線・第 ${c.req.minNo} 章以後</p>`:''}
  </article>`;
}
function tree(id){
  const kids=D.classes.filter(k=>k.from===id);
  if(!kids.length) return `<div class="branch">${node(C[id])}</div>`;
  if(C[id].tier>=2||kids.every(k=>!D.classes.some(x=>x.from===k.id))) return `<div class="branch">${node(C[id])}<div class="kids row">${kids.map(k=>node(k)).join('<span class="or">或</span>')}</div></div>`;
  return `<div class="branch">${node(C[id])}<div class="kids">${kids.map(k=>`<div class="kid">${tree(k.id)}</div>`).join('')}</div></div>`;
}
const ROLES=[
 ['striker','格鬥系','s1','近身肉搏與中距離兼顧。劍士線重命中與先制，重拳線重破壞力與耐久。',['gang']],
 ['gunner','射擊系','g1','遠距離火力。狙擊線射程與命中，砲擊線火力與耐久。',['lei']],
 ['scout','機動系','r1','移動力最高。飛行線空戰閃避，突襲線地面暗殺與會心。',['feng','rei']],
 ['support','支援系','p1','修理與指揮。修復線強化修理，指揮線提供範圍加成。',['yu']],
 ['heavy','重裝系','t1','厚重裝甲擋在最前線。堡壘線守護隊友，突破線貫穿敵甲。',['tetsu']],
 ['knight','騎士系','k2','赤環騎士團的高階機，從中階起步。聖騎線統率，黑騎線極致攻擊。',['lena']],
];
const JOIN={gang:'第 1 章',feng:'第 1 章',lei:'第 1 章（赤環之誓：第 6 章離隊、第 7 章可說服回歸；無銘之甲：第 6 章離隊、第 12 章可說服回歸）',yu:'第 1 章（無銘之甲：第 6 章離隊、第 12 章可說服回歸）',tetsu:'第 2 章',lena:'赤環之誓第 6 章／守護之字第 7 章說服／無銘之甲第 13 章說服',rei:'無銘之甲第 7 章（以突襲型加入）'};
const pilotChip=k=>{const p=D.chars[k];return `<span class="pc"><span class="g">${p.ch}</span>${p.pilot}</span>`;};
const sections=ROLES.map(([role,name,root,desc,pilots])=>`
<section class="role" id="${role}">
  <div class="rolehead"><h2>${name}</h2><p>${desc}</p><div class="pilots">${pilots.map(pilotChip).join('')}</div></div>
  <div class="scroll"><div class="tree">${tree(root)}</div></div>
</section>`).join('');
const t4=D.classes.filter(c=>c.tier===4);
const pilotRows=Object.entries(D.chars).map(([k,p])=>`<tr><td><span class="pc"><span class="g">${p.ch}</span>${p.pilot}</span></td><td>${p.mech}</td><td>${C[p.cls].name}</td><td>${JOIN[k]}</td><td>${p.spirits.map(([n,t])=>`<span class="sp t${t}">${n}<small>${TN[t]}</small></span>`).join('')}</td></tr>`).join('');
const html=`<title>銘甲轉職圖鑑</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700;900&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
:root{color-scheme:dark;--bg:#14191e;--panel:#1a2127;--panel2:#20282f;--line:#34404a;--ink:#e3e8eb;--mute:#8d9ba6;--dim:#5f6d78;
--p:#8fd0ff;--pbg:#153250;--pline:#2f6c9f;--amber:#f3bb4f;--red:#ff8f7e;--good:#86d49a;
--t1:#aebbc5;--t1b:#27313a;--t2:#8fd0ff;--t2b:#16304a;--t3:#f3bb4f;--t3b:#3a2d12;--t4:#ffb3a6;--t4b:#4a1f1d;
--serif:"Noto Serif TC","Songti TC","PMingLiU",serif;--sans:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
html,body{background:var(--bg);color:var(--ink)}
body{font-family:var(--sans);font-size:14px;line-height:1.55}
.wrap{max-width:1400px;margin:0 auto;padding-inline:16px;padding-block:28px 48px}
.hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 40px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:22px;margin-bottom:26px}
@media (max-width:860px){.hero{grid-template-columns:1fr}}
.eyebrow{color:var(--amber);font-size:12px;letter-spacing:.24em;margin:0 0 6px}
h1{font-family:var(--serif);font-weight:900;font-size:clamp(34px,6vw,54px);letter-spacing:.14em;margin:0;line-height:1.1;text-wrap:balance}
h1 b{color:var(--amber)}
.lead{color:var(--mute);max-width:62ch;margin:10px 0 0}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px}
.flow .step{background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:6px 10px}
.flow .arrow{color:var(--dim)}
.tier{display:inline-block;font-size:11px;padding:1px 7px;border-radius:3px;letter-spacing:.1em;font-weight:500}
.t1 .tier,.tier.t1{background:var(--t1b);color:var(--t1)}.t2 .tier,.tier.t2{background:var(--t2b);color:var(--t2)}
.t3 .tier,.tier.t3{background:var(--t3b);color:var(--t3)}.t4 .tier,.tier.t4{background:var(--t4b);color:var(--t4)}
.role{margin-bottom:34px}
.rolehead{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 16px;margin-bottom:12px}
.rolehead h2{font-family:var(--serif);font-weight:900;font-size:24px;letter-spacing:.12em;margin:0}
.rolehead p{color:var(--mute);margin:0;flex:1 1 320px}
.pilots{display:flex;gap:8px}
.pc{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.pc .g{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:3px;background:var(--pbg);color:var(--p);box-shadow:inset 0 0 0 1px var(--pline);font-family:var(--serif);font-weight:900;font-size:16px}
.scroll{overflow-x:auto;padding-bottom:6px}
.tree{display:flex;width:max-content}
.branch{display:flex;align-items:center}
.kids{display:flex;flex-direction:column;gap:14px;padding-left:44px;position:relative}
.kids::before{content:"";position:absolute;left:0;top:50%;width:22px;border-top:1px solid var(--line)}
.kids.row{flex-direction:row;align-items:center;gap:8px;padding-left:34px}
.kids.row::before{width:34px}
.or{color:var(--dim);font-size:12px;writing-mode:horizontal-tb}
.kid{position:relative;display:flex;align-items:center}
.kid::before{content:"";position:absolute;left:-22px;top:50%;width:22px;border-top:1px solid var(--line)}
.kid::after{content:"";position:absolute;left:-22px;border-left:1px solid var(--line)}
.kid:first-child::after{top:50%;bottom:-7px}
.kid:last-child::after{top:-7px;bottom:50%}
.kid:only-child::after{display:none}
.node{width:228px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.node.t2{border-color:#2a4a66}.node.t3{border-color:#5a4719}.node.t4{border-color:#6e3530}
.node header{display:flex;align-items:center;gap:8px}
.node h4{margin:0;font-family:var(--serif);font-weight:900;font-size:18px;letter-spacing:.06em}
.fly{margin-left:auto;font-size:11px;color:var(--p)}
.desc{margin:0;color:var(--mute);font-size:12.5px;line-height:1.5}
.sk{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px}
.sk li{font-size:11.5px;padding:1px 7px;border-radius:10px;background:#18293a;color:#a9d3f5;box-shadow:inset 0 0 0 1px #2d4f6e}
.sk li.none{background:none;box-shadow:none;color:var(--dim);padding:0}
.st{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;margin:0;background:var(--panel2);border-radius:4px;padding:4px 2px}
.st div{text-align:center}.st dt{font-size:10.5px;color:var(--dim)}.st dd{margin:0;font-family:var(--mono);font-size:11.5px;font-variant-numeric:tabular-nums}
.wp{margin:0;font-size:12.5px;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 6px}
.wp span{color:var(--dim);font-size:11px}.wp b{font-family:var(--mono);color:var(--amber);font-weight:600}.wp i{font-style:normal;color:var(--mute);font-size:11.5px;width:100%}
.req{margin:0;font-size:11.5px;color:var(--t4)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:34px}
.panel h2{font-family:var(--serif);font-weight:900;font-size:22px;letter-spacing:.1em;margin:0 0 4px}
.panel>p{color:var(--mute);margin:0 0 14px;max-width:70ch}
.t4grid{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.from{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--mute);padding-right:6px}
.from b{color:var(--t3);font-family:var(--serif);font-size:16px}
table{border-collapse:collapse;width:100%;font-size:13px}
th{color:var(--dim);font-weight:500;text-align:left;padding:6px 10px 6px 0;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:8px 10px 8px 0;border-bottom:1px solid #252f37;vertical-align:middle}
.sp{display:inline-flex;align-items:baseline;gap:3px;margin:0 8px 2px 0;white-space:nowrap}
.sp small{font-size:10px;padding:0 4px;border-radius:2px}
.sp.t1 small{background:var(--t1b);color:var(--t1)}.sp.t2 small{background:var(--t2b);color:var(--t2)}.sp.t3 small{background:var(--t3b);color:var(--t3)}.sp.t4 small{background:var(--t4b);color:var(--t4)}
.foot{color:var(--dim);font-size:12.5px}
</style>
<div class="wrap">
<header class="hero"><div><p class="eyebrow">銘甲戰記 · CLASS CHART</p><h1>字<b>甲</b>轉職圖鑑</h1>
<p class="lead">六個系統、四十一種職業。每一系從初階起步，Lv 8 可以轉職，每一階有兩條分支。轉職後等級回到 1，但基礎能力大幅提升，並換上新的武器與特殊能力。卡片上的數值為該職業 Lv 1 的基本能力（不含角色個人加成）。</p></div>
<div class="flow"><span class="step"><span class="tier t1">初階</span> Lv 1–10</span><span class="arrow">→ Lv 8 轉職 →</span><span class="step"><span class="tier t2">中階</span></span><span class="arrow">→</span><span class="step"><span class="tier t3">上階</span></span><span class="arrow">→ 雷隼限定 →</span><span class="step"><span class="tier t4">極</span></span></div>
</header>
${sections}
<section class="panel"><h2>極階（雷隼限定）</h2><p>雷隼從任一格鬥系上階（劍聖型、魔劍型、鬥神型、破壞型）到達 Lv 8，且進入第 12 章以後，可以轉職為極階。能選哪一種由第 4 章選擇的路線決定。</p>
<div class="scroll"><div class="t4grid"><div class="from"><span>轉職來源</span><b>任一上階</b><span>Lv 8 ＋ 第 12 章</span></div>${t4.map(node).join('')}</div></div></section>
<section class="panel"><h2>角色與起始職業</h2><p>精神指令會隨職業階級解放，標籤表示需要的階級。</p>
<div class="scroll"><table><thead><tr><th>駕駛</th><th>機體</th><th>起始職業</th><th>加入時機</th><th>精神指令</th></tr></thead><tbody>${pilotRows}</tbody></table></div></section>
<p class="foot">數值來自遊戲資料 engine.js。等級每升一級，初階約 HP +110、中階 +140、上階 +170、極階 +200。</p>
</div>`;
require('fs').writeFileSync('/home/claude/tree/classes.html',html);
require('fs').writeFileSync('/home/claude/tree/classes_local.html','<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}</style>'+html+'</html>');
console.log('ok',html.length);

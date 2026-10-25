'use strict';
/* 太空船大作戰 — asymmetric-information co-op ("shout the instruction!").
   Every phone has its own control panel (each control exists on exactly one phone) and ONE instruction that is
   usually about a control on someone else's panel, so players shout to each other (or press 📣 to broadcast it).
   The host owns every control's state; clients only send { c, v } (set a toggle/slider/dial), { c, p:1 } (press a
   button), { sh:1 } (broadcast my instruction) and { tap:k } (meteor shower taps).
   view(id): my panel + my instruction + everyone's broadcast shouts. view(null): ship, bars and every
   instruction (so a TV helps the team) — nothing secret there. */
(() => {
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const rr = (a, b) => a + Math.random() * (b - a);
  const ri = n => Math.random() * n | 0;
  const pick = a => a[ri(a.length)];
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const r1 = x => Math.round(x * 10) / 10;
  const KID_GOAL = 3;

  /* kid controls: a picture + its colour, so non-readers can match the instruction by picture */
  const KIDS = [
    ['🐸', '綠色', '青蛙', '#22c26a'], ['🍌', '黃色', '香蕉', '#f5b400'], ['🍓', '紅色', '草莓', '#ff4f58'], ['🐳', '藍色', '鯨魚', '#2f8cff'],
    ['🍇', '紫色', '葡萄', '#9b5cff'], ['🐷', '粉紅色', '小豬', '#ff6fb7'], ['🍊', '橘色', '橘子', '#ff8a1f'], ['🐻', '咖啡色', '小熊', '#a0673a'],
    ['🐢', '綠色', '烏龜', '#22c26a'], ['🍎', '紅色', '蘋果', '#ff4f58'], ['🐥', '黃色', '小雞', '#f5b400'], ['🐙', '紫色', '章魚', '#9b5cff'],
    ['🦊', '橘色', '狐狸', '#ff8a1f'], ['🐬', '藍色', '海豚', '#2f8cff'], ['🍑', '粉紅色', '桃子', '#ff6fb7'], ['🐞', '紅色', '瓢蟲', '#ff4f58'],
    ['🥝', '綠色', '奇異果', '#22c26a'], ['🦁', '黃色', '獅子', '#f5b400'], ['🐰', '粉紅色', '兔子', '#ff6fb7'], ['🍋', '黃色', '檸檬', '#f5b400'],
    ['🐠', '藍色', '小魚', '#2f8cff'], ['🍒', '紅色', '櫻桃', '#ff4f58'], ['🦒', '黃色', '長頸鹿', '#f5b400'], ['🐨', '灰色', '無尾熊', '#8a94a6'],
    ['🍄', '紅色', '蘑菇', '#ff4f58'], ['🦋', '藍色', '蝴蝶', '#2f8cff'], ['🍆', '紫色', '茄子', '#9b5cff'], ['🥕', '橘色', '紅蘿蔔', '#ff8a1f'],
    ['🐼', '黑色', '熊貓', '#3b3f5c'], ['🦄', '紫色', '獨角獸', '#9b5cff']
  ];
  const KTYPE = { bt: '按鈕', tg: '拉桿', sl: '滑桿' };
  /* adult controls: silly wordy sci-fi names */
  const CORES = ['彩虹', '香蕉', '喵喵', '布丁', '企鵝', '果凍', '棉花糖', '鹹酥雞', '珍奶', '小籠包', '臭豆腐', '鳳梨酥', '麻糬', '章魚燒', '恐龍',
    '獨角獸', '河馬', '倉鼠', '臭襪子', '拖鞋', '枕頭', '泡泡', '起司', '蛋塔', '芒果', '西瓜', '薯條', '鬆餅', '彈珠', '蘿蔔糕', '肉圓', '豆花'];
  const PREF = ['量子', '反重力', '超級', '渦輪', '迷你', '爆炸', '閃亮亮', '宇宙', '磁力', '超導', '黏黏', '無敵', '霹靂', '次元', '全自動'];
  const DEV = {
    tg: ['推進器', '引擎', '冷凍艙', '噴射器', '雨刷', '加熱器', '燈泡', '電風扇', '吸塵器', '霧燈'],
    sl: ['雷達', '油門', '增幅器', '音量', '濃度計', '重力場', '溫控器'],
    dl: ['閥門', '頻道', '羅盤', '調頻器', '轉盤', '齒輪'],
    bt: ['護盾', '喇叭', '發射鈕', '彈射器', '警報器', '打嗝鈕', '蜂鳴器']
  };
  const DIALS = [['北', '東', '南', '西'], ['甜', '鹹', '酸', '辣'], ['春', '夏', '秋', '冬'], ['🍓', '🍋', '🍇', '🥝'], ['A', 'B', 'C', 'D'],
    ['小', '中', '大', '特大'], ['貓', '狗', '鳥', '魚'], ['♠', '♥', '♦', '♣']];
  const ACOLS = ['#ff5d73', '#ffb020', '#3fc8ff', '#5ee07a', '#b78bff', '#ff7ad9', '#ffd84d', '#5ad1c8'];
  const ROBOT = {
    go: ['加油！大家一起找！', '看看別人的手機喔！', '喊出來：「誰有這個？」', '你們是最棒的太空隊！'],
    ok: ['好棒！🎉', '太厲害了！', '做得好！', '耶～答對了！', '飛得好快！'],
    bad: ['沒關係，再試一次！', '小心喔～', '加油加油！', '慢慢來，看清楚圖片！'],
    jump: ['出發囉！🚀', '往月亮前進！🌕', '新的按鈕來了！'],
    met: ['流星來了！大家快拍拍！☄️'],
    metOk: ['擋住流星了！好厲害！']
  };
  const DIAL_ANG = [-135, -45, 45, 135];

  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ------------------------------------------------------------------ CSS */
  const CSS = `
.sp-root{position:absolute;inset:0;overflow:hidden;color:#eaf0ff;font-family:var(--sans);background:radial-gradient(120% 70% at 50% 0%,#232a6b 0,#0d1033 60%,#080a22 100%);touch-action:manipulation;-webkit-user-select:none;user-select:none}
.sp-root.sp-kid{background:radial-gradient(120% 70% at 50% 0%,#5a4fd6 0,#2c2a8a 60%,#1b1a5c 100%)}
.sp-stars{position:absolute;left:0;right:0;top:-400px;bottom:0;pointer-events:none;opacity:.8;
  background-image:radial-gradient(1.5px 1.5px at 20px 30px,#fff,transparent),radial-gradient(1px 1px at 90px 140px,#cfe3ff,transparent),radial-gradient(1.5px 1.5px at 160px 70px,#fff,transparent),radial-gradient(1px 1px at 230px 190px,#ffe9b0,transparent),radial-gradient(1px 1px at 300px 40px,#fff,transparent);
  background-size:320px 200px;animation:sp-fall 14s linear infinite}
.sp-stars.sp-s2{background-size:180px 200px;opacity:.45;animation-duration:26s}
@keyframes sp-fall{to{transform:translateY(400px)}}
.sp-main{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:8px}
.sp-land .sp-main{flex-direction:row}
.sp-side{display:flex;flex-direction:column;gap:8px;flex:none;min-height:0}
.sp-land .sp-side{width:41%;max-width:400px}
.sp-stat{display:flex;gap:6px;align-items:center;flex:none}
.sp-sec{background:#ffd166;color:#3a2a00;font-weight:900;border-radius:12px;padding:3px 9px;font-size:13px;white-space:nowrap;box-shadow:0 3px 0 #b88a00}
.sp-sec b{font-family:var(--round);font-size:19px}
.sp-meter{flex:1;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,.09);border-radius:12px;padding:4px 7px;min-width:0}
.sp-meter>span{font-size:15px}
.sp-meter div{flex:1;height:12px;border-radius:6px;background:rgba(0,0,0,.45);overflow:hidden;min-width:20px}
.sp-meter i{display:block;height:100%;border-radius:6px;transition:width .4s,background .4s}
.sp-hull i{background:linear-gradient(90deg,#3be08a,#a8ff60)}
.sp-hull.mid i{background:linear-gradient(90deg,#ffb020,#ffe066)}
.sp-hull.low i{background:linear-gradient(90deg,#ff3b54,#ff8a65);animation:sp-blink .6s infinite alternate}
.sp-prog i{background:linear-gradient(90deg,#3fc8ff,#a88bff)}
.sp-meter b{font-family:var(--round);font-size:13px;white-space:nowrap}
@keyframes sp-blink{to{opacity:.45}}

.sp-card{position:relative;flex:none;border-radius:20px;padding:8px 12px 12px;background:linear-gradient(#08261f,#061a16);border:2px solid #1f6f50;
  box-shadow:0 0 0 3px #12172f,0 6px 0 3px #0a0d20,inset 0 0 34px rgba(43,224,138,.16);min-height:136px;display:flex;flex-direction:column;overflow:hidden}
.sp-card>*{position:relative;z-index:1}
.sp-card>.sp-shout{position:absolute}
.sp-card::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 2px,transparent 2px 4px)}
.sp-cardtop{font-size:12px;font-weight:900;color:#6fdcaa;letter-spacing:.08em;display:flex;justify-content:space-between;padding-right:66px}
.sp-ins{flex:1;display:flex;flex-direction:column;justify-content:center;font-weight:900;color:#c5ffe0;line-height:1.25;padding-right:66px;text-shadow:0 0 12px rgba(80,255,170,.45);min-height:0}
.sp-itx{animation:sp-pop .32s cubic-bezier(.3,1.5,.5,1)}
.sp-isub{font-size:13px;color:#7fe0b0;margin-top:3px}
.sp-ins.sp-big{align-items:center;text-align:center;padding-right:0}
.sp-wait{color:#6fdcaa;font-size:16px;opacity:.85}
@keyframes sp-pop{from{transform:scale(.6)}}
.sp-shout{position:absolute;right:10px;top:24px;width:60px;height:60px;border-radius:50%;font-size:28px;line-height:1;
  background:radial-gradient(circle at 35% 30%,#ffe2a0,#ff9a2a 62%,#d4600c);box-shadow:0 5px 0 #8f3c00,0 8px 14px rgba(0,0,0,.4);transition:transform .08s,opacity .2s}
.sp-shout:active{transform:translateY(4px);box-shadow:0 1px 0 #8f3c00}
.sp-shout.off{filter:grayscale(1);opacity:.35;pointer-events:none}
.sp-shout.ping{animation:sp-ping 1.1s ease-in-out infinite}
.sp-shout.sent::after{content:'已喊！';position:absolute;left:50%;bottom:-17px;transform:translateX(-50%);font-size:11px;font-weight:900;color:#ffd166;white-space:nowrap}
@keyframes sp-ping{50%{transform:scale(1.1);box-shadow:0 5px 0 #8f3c00,0 0 0 9px rgba(255,170,60,.25)}}
.sp-bar{height:14px;border-radius:7px;background:rgba(0,0,0,.5);overflow:hidden;margin-top:8px;flex:none;box-shadow:inset 0 1px 2px #000}
.sp-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2be08a,#9dff6a);border-radius:7px}
.sp-bar i.warn{background:linear-gradient(90deg,#ffb020,#ffe066)}
.sp-bar i.hot{background:linear-gradient(90deg,#ff3b54,#ff8a65);animation:sp-blink .3s infinite alternate}
.sp-card.ok{border-color:#5eff9a;box-shadow:0 0 0 3px #12172f,0 6px 0 3px #0a0d20,0 0 30px rgba(94,255,154,.6)}
.sp-card.bad{border-color:#ff4f58;background:linear-gradient(#3a0d14,#22070c);animation:sp-shake .4s}
.sp-card.bad .sp-ins{color:#ffb3b8;text-shadow:0 0 12px rgba(255,80,90,.5)}
.sp-card.jump{background:radial-gradient(circle at 50% 50%,#3b2f9a,#120d3a);border-color:#8b7bff}
.sp-card.jump .sp-ins{color:#fff;text-shadow:0 0 14px #a99bff}
.sp-card.jump::after{content:'';position:absolute;inset:-50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.12) 0 2deg,transparent 2deg 12deg);animation:sp-spin 3s linear infinite;pointer-events:none;z-index:0}
@keyframes sp-spin{to{transform:rotate(360deg)}}
@keyframes sp-shake{20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
.sp-cd{font-family:var(--round);font-size:44px;line-height:1;color:#ffd166}

.sp-kid .sp-card{background:#fffdf5;border:4px solid #ffd166;box-shadow:0 6px 0 #c99a1c;color:#1f2346}
.sp-kid .sp-card::before{display:none}
.sp-kid .sp-cardtop{color:#a07000}
.sp-kid .sp-ins{color:#1f2346;text-shadow:none}
.sp-kid .sp-wait{color:#a07000}
.sp-kid .sp-card.ok{border-color:#22c26a;box-shadow:0 6px 0 #127a40,0 0 24px rgba(34,194,106,.6)}
.sp-kid .sp-card.bad{background:#fff0f0;border-color:#ff4f58}
.sp-kid .sp-card.bad .sp-ins{color:#c0262f}
.sp-kid .sp-card.jump{background:radial-gradient(circle,#6a5cff,#2c2a8a);border-color:#fff}
.sp-kid .sp-card.jump .sp-ins{color:#fff}
.sp-kins{display:flex;align-items:center;gap:10px;animation:sp-pop .35s cubic-bezier(.3,1.5,.5,1)}
.sp-kic{display:inline-grid;place-items:center;width:74px;height:74px;border-radius:50%;font-size:46px;line-height:1;background:var(--cc);
  box-shadow:0 5px 0 rgba(0,0,0,.25),inset 0 -6px 0 rgba(0,0,0,.15),0 0 0 4px #fff;flex:none}
.sp-kic.sm{width:32px;height:32px;font-size:20px;box-shadow:0 2px 0 rgba(0,0,0,.25),0 0 0 2px #fff}
.sp-kact{display:flex;flex-direction:column;align-items:center;font-size:40px;line-height:1}
.sp-kact small{font-size:16px;font-weight:900;margin-top:2px}
.sp-kact .dots{font-size:30px;letter-spacing:2px;color:var(--cc)}
.sp-kact .dots s{text-decoration:none;opacity:.25}
.sp-ktx{font-size:16px;font-weight:900;margin-top:4px}

.sp-shouts{flex:none;height:76px;display:flex;flex-direction:column;justify-content:flex-start;gap:4px;overflow:hidden}
.sp-land .sp-shouts{flex:1;height:auto;min-height:40px}
.sp-bub{display:flex;align-items:center;gap:6px;background:#fff;color:#1f2346;border-radius:14px;padding:3px 10px 3px 3px;font-weight:900;font-size:14px;line-height:1.2;min-height:36px;box-shadow:0 3px 0 rgba(0,0,0,.25)}
.sp-bub.new{animation:sp-slide .35s cubic-bezier(.3,1.4,.5,1)}
.sp-bub img{width:30px;height:30px;flex:none}
.sp-bub .t{min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.sp-bub .ka{font-size:20px}
.sp-bub .ka .dots{font-size:15px;color:var(--cc)}
.sp-bub .ka .dots s{text-decoration:none;opacity:.25}
.sp-hint{color:#aab3e6;font-size:13px;font-weight:700;line-height:1.4;padding:4px 6px;display:flex;align-items:center;gap:8px}
.sp-hint .rb{font-size:34px;flex:none;animation:sp-bob 1.6s ease-in-out infinite alternate}
.sp-hint .rt{background:#fff;color:#1f2346;border-radius:14px;padding:6px 10px;font-weight:900;font-size:15px}
@keyframes sp-bob{to{transform:translateY(-4px) rotate(4deg)}}
@keyframes sp-slide{from{transform:translateY(-14px)}}

.sp-panel{flex:1;min-height:0;min-width:0;position:relative;border-radius:22px;padding:10px;
  background:radial-gradient(circle at 12px 12px,#8a93b8 0 3px,transparent 4px),radial-gradient(circle at calc(100% - 12px) 12px,#8a93b8 0 3px,transparent 4px),
  radial-gradient(circle at 12px calc(100% - 12px),#8a93b8 0 3px,transparent 4px),radial-gradient(circle at calc(100% - 12px) calc(100% - 12px),#8a93b8 0 3px,transparent 4px),
  linear-gradient(160deg,#3d4670,#272d4d);box-shadow:inset 0 2px 0 rgba(255,255,255,.16),0 5px 0 #11152b}
.sp-kid .sp-panel{background:radial-gradient(circle at 12px 12px,#fff 0 3px,transparent 4px),radial-gradient(circle at calc(100% - 12px) 12px,#fff 0 3px,transparent 4px),
  radial-gradient(circle at 12px calc(100% - 12px),#fff 0 3px,transparent 4px),radial-gradient(circle at calc(100% - 12px) calc(100% - 12px),#fff 0 3px,transparent 4px),
  linear-gradient(160deg,#8fd3ff,#6a8cff);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),0 5px 0 #3a4fb0}
.sp-grid{display:grid;gap:8px;height:100%;overflow:auto;padding:4px}
.sp-panel.hit{animation:sp-shake .4s}
.sp-panel.glitch .sp-grid{animation:sp-gl .25s steps(2) infinite;filter:hue-rotate(80deg) saturate(1.6)}
@keyframes sp-gl{0%{transform:translate(2px,-1px) skewX(2deg)}50%{transform:translate(-2px,1px) skewX(-2deg)}}
.sp-glb{position:absolute;left:50%;top:-6px;transform:translateX(-50%);background:#ff3b54;color:#fff;font-weight:900;font-size:13px;border-radius:999px;padding:3px 12px;z-index:3;white-space:nowrap;animation:sp-blink .4s infinite alternate}
.sp-dark{position:absolute;inset:0;border-radius:22px;pointer-events:none;z-index:2;background:radial-gradient(circle at var(--x,50%) var(--y,50%),transparent 0,transparent 62px,rgba(3,4,14,.97) 128px)}
.sp-darkt{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);color:#ffe9a0;font-weight:900;font-size:13px;white-space:nowrap;z-index:3;pointer-events:none}

.sp-c{container-type:size;position:relative;min-width:0;border-radius:16px;background:linear-gradient(#4b5480,#343c62);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 3px 0 #1a1f38;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px 4px;overflow:hidden;touch-action:none}
.sp-c.w2{grid-column:span 2}
.sp-kid .sp-c{background:#fff;box-shadow:0 4px 0 #b9c4ee;border:3px solid var(--cc)}
.sp-nm{font-weight:900;font-size:13px;line-height:1.15;text-align:center;color:#fff;max-width:100%;padding:0 2px;flex:none;word-break:break-all}
.sp-kid .sp-nm{color:#1f2346;font-size:14px}
.sp-ctl{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;position:relative}
.sp-btn{width:min(100cqh - 38px,76cqw,104px);margin-bottom:8px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font-size:min(30cqh,44px);line-height:1;
  background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--cc) 45%,#fff),var(--cc) 58%,color-mix(in srgb,var(--cc) 70%,#000));
  box-shadow:0 0 0 5px #1b2038,0 0 0 7px #596291,0 7px 0 5px #11152b,inset 0 -5px 0 rgba(0,0,0,.18);transition:transform .07s,box-shadow .07s}
.sp-kid .sp-btn{box-shadow:0 0 0 5px #fff,0 0 0 8px color-mix(in srgb,var(--cc) 60%,#000),0 8px 0 7px rgba(0,0,0,.18),inset 0 -6px 0 rgba(0,0,0,.18)}
.sp-btn.dn{transform:translateY(5px) scale(.96);box-shadow:0 0 0 5px #1b2038,0 0 0 7px #596291,0 2px 0 5px #11152b,inset 0 3px 6px rgba(0,0,0,.3)}
.sp-tog{display:flex;align-items:center;gap:8px;height:100%}
.sp-slot{position:relative;width:min(36cqw,50px);height:min(66cqh,90px);border-radius:14px;background:#141930;box-shadow:inset 0 3px 7px rgba(0,0,0,.7),0 0 0 3px #596291}
.sp-kid .sp-slot{background:#e6ebff;box-shadow:inset 0 3px 7px rgba(0,0,0,.2),0 0 0 3px var(--cc)}
.sp-lev{position:absolute;left:7%;right:7%;height:48%;top:49%;border-radius:10px;display:grid;place-items:center;font-size:min(20cqh,26px);
  background:linear-gradient(#ffffff,#b9c0da);box-shadow:0 4px 0 #6f779a,0 6px 8px rgba(0,0,0,.4);transition:top .14s cubic-bezier(.3,1.7,.5,1)}
.sp-lev::after{content:'';position:absolute;left:18%;right:18%;top:44%;height:3px;border-radius:2px;background:var(--cc);opacity:.85}
.sp-kid .sp-lev::after{display:none}
.on .sp-lev{top:3%}
.sp-tl{display:flex;flex-direction:column;justify-content:space-between;height:min(66cqh,90px);font-size:12px;font-weight:900;color:#8a93b8}
.sp-kid .sp-tl{color:#6b7196;font-size:14px}
.on .sp-tl .u,.sp-k-tg:not(.on) .sp-tl .d{color:#ffd166}
.sp-kid .on .sp-tl .u{color:#22c26a}.sp-kid .sp-k-tg:not(.on) .sp-tl .d{color:#ff4f58}
.sp-led{width:14px;height:14px;border-radius:50%;background:#3a1a22;box-shadow:inset 0 1px 2px #000}
.on .sp-led{background:#5eff8f;box-shadow:0 0 12px #5eff8f,0 0 3px #fff inset}
.sp-sl{position:relative;width:94%;height:min(78cqh,76px);touch-action:none}
.sp-trk{position:absolute;left:8%;right:8%;top:34%;height:10px;border-radius:5px;background:#141930;box-shadow:inset 0 2px 3px #000,0 0 0 2px #596291}
.sp-kid .sp-trk{background:#e6ebff;box-shadow:inset 0 2px 3px rgba(0,0,0,.2),0 0 0 2px var(--cc)}
.sp-nt{position:absolute;top:66%;transform:translateX(-50%);font-family:var(--round);font-weight:700;font-size:15px;color:#8a93b8;min-width:24px;text-align:center}
.sp-nt::before{content:'';position:absolute;left:50%;top:-11px;width:2px;height:7px;background:#6f779a}
.sp-nt.cur{color:#ffd166;transform:translateX(-50%) scale(1.2)}
.sp-kid .sp-nt{color:#9aa3c8;font-size:20px}
.sp-kid .sp-nt.cur{color:var(--cc)}
.sp-knob{position:absolute;top:calc(34% + 5px);left:8%;width:28px;height:36px;border-radius:10px;transform:translate(-50%,-50%);display:grid;place-items:center;font-size:22px;
  background:linear-gradient(#fff,#c6cce4);box-shadow:0 4px 0 #6f779a,0 6px 10px rgba(0,0,0,.45);transition:left .16s cubic-bezier(.3,1.5,.5,1)}
.sp-knob::after{content:'';position:absolute;left:4px;right:4px;top:50%;height:4px;margin-top:-2px;border-radius:2px;background:var(--cc)}
.sp-kid .sp-knob{width:46px;height:46px;border-radius:50%;border:3px solid var(--cc)}
.sp-kid .sp-knob::after{display:none}
.sp-knob.drag{transition:none;transform:translate(-50%,-50%) scale(1.12)}
.sp-dl{position:relative;height:100%;width:min(96cqw,190px)}
.sp-dk{position:absolute;left:50%;top:50%;height:min(78%,84px);aspect-ratio:1;transform-origin:50% 50%;translate:-50% -50%;border-radius:50%;
  background:radial-gradient(circle at 38% 32%,#f2f4ff,#9aa3c8 60%,#5a6288);box-shadow:0 0 0 4px #1b2038,0 5px 0 4px #11152b;transition:transform .2s cubic-bezier(.3,1.5,.5,1)}
.sp-dk::before{content:'';position:absolute;left:50%;top:6%;width:5px;height:38%;margin-left:-2.5px;border-radius:3px;background:var(--cc);box-shadow:0 0 6px var(--cc)}
.sp-dlb{position:absolute;width:30%;height:44%;transform:translate(-50%,-50%);font-weight:900;font-size:min(15cqh,17px);color:#8a93b8;border-radius:10px;display:grid;place-items:center}
.sp-dlb.cur{color:#ffd166;background:rgba(255,209,102,.12)}

.sp-plus{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-family:var(--round);font-weight:700;font-size:42px;color:#ffd166;
  text-shadow:0 3px 0 rgba(0,0,0,.4);pointer-events:none;z-index:4;animation:sp-up 1s ease-out forwards;white-space:nowrap}
.sp-plus small{display:block;font-family:var(--sans);font-size:15px;font-weight:900;color:#fff;text-align:center}
@keyframes sp-up{from{transform:translate(-50%,-30%) scale(.6);opacity:0}25%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}to{transform:translate(-50%,-140%);opacity:0}}

.sp-ov{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center}
.sp-ov.met{background:radial-gradient(circle at 50% 60%,rgba(120,20,30,.82),rgba(20,4,10,.94))}
.sp-ov.end{background:rgba(8,10,30,.88);animation:sp-fade .5s}
.sp-ov h2{margin:0;font-size:30px;font-weight:900;color:#fff}
.sp-ov p{margin:0;font-weight:900;color:#ffd6a0;font-size:15px}
.sp-mbtn{width:min(62vw,62vh,240px);aspect-ratio:1;border-radius:50%;font-size:64px;line-height:1;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(circle at 35% 30%,#9fe6ff,#2f8cff 60%,#1658b5);box-shadow:0 0 0 8px rgba(255,255,255,.2),0 10px 0 #0c3a80,0 0 50px rgba(80,180,255,.7)}
.sp-mbtn b{font-size:28px;font-weight:900}
.sp-mbtn.dn{transform:translateY(6px) scale(.97);box-shadow:0 0 0 8px rgba(255,255,255,.3),0 4px 0 #0c3a80,0 0 70px rgba(120,210,255,.9)}
.sp-mbar{width:min(80vw,340px);height:18px;border-radius:9px;background:rgba(0,0,0,.5);overflow:hidden}
.sp-mbar i{display:block;height:100%;background:linear-gradient(90deg,#3fc8ff,#9dff6a);transition:width .25s}
.sp-mrock{position:absolute;font-size:34px;pointer-events:none;animation:sp-rock 1.6s linear infinite}
@keyframes sp-rock{from{transform:translate(0,0) rotate(0)}to{transform:translate(-160px,520px) rotate(-200deg)}}
.sp-endic{font-size:84px;line-height:1;animation:sp-pop .5s cubic-bezier(.3,1.5,.5,1)}
@keyframes sp-fade{from{opacity:0}}

/* ---------- big screen ---------- */
.sp-tv{position:absolute;inset:0;overflow:hidden;background:#060918;color:#fff;font-family:var(--sans)}
.sp-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.sp-tvhud{position:absolute;left:22px;right:22px;top:16px;display:flex;gap:14px;align-items:center}
.sp-tvsec{background:#ffd166;color:#3a2a00;border-radius:18px;padding:6px 18px;font-weight:900;font-size:22px;box-shadow:0 5px 0 #b88a00;white-space:nowrap}
.sp-tvsec b{font-family:var(--round);font-size:38px}
.sp-tvm{flex:1;display:flex;align-items:center;gap:10px;background:rgba(10,14,40,.72);border:2px solid rgba(255,255,255,.14);border-radius:18px;padding:10px 16px;font-weight:900;font-size:20px;white-space:nowrap;backdrop-filter:blur(4px)}
.sp-tvm div{flex:1;height:20px;border-radius:10px;background:rgba(255,255,255,.12);overflow:hidden}
.sp-tvm i{display:block;height:100%;border-radius:10px;transition:width .5s}
.sp-tvm b{font-family:var(--round);font-size:26px;min-width:64px;text-align:right}
.sp-tvm.sp-hull i{background:linear-gradient(90deg,#3be08a,#a8ff60)}
.sp-tvm.sp-hull.mid i{background:linear-gradient(90deg,#ffb020,#ffe066)}
.sp-tvm.sp-hull.low i{background:linear-gradient(90deg,#ff3b54,#ff8a65);animation:sp-blink .6s infinite alternate}
.sp-tvm.sp-prog i{background:linear-gradient(90deg,#3fc8ff,#a88bff)}
.sp-tvok{background:rgba(10,14,40,.72);border:2px solid rgba(255,255,255,.14);border-radius:18px;padding:10px 16px;font-weight:900;font-size:20px;white-space:nowrap}
.sp-tvok b{font-family:var(--round);font-size:26px;color:#9dff6a}
.sp-tvban{position:absolute;left:50%;top:96px;transform:translateX(-50%);background:rgba(10,14,40,.85);border:3px solid #ffd166;border-radius:20px;padding:10px 26px;
  font-weight:900;font-size:28px;white-space:nowrap;text-align:center;animation:sp-pop .4s cubic-bezier(.3,1.5,.5,1)}
.sp-tvban.red{border-color:#ff4f58;box-shadow:0 0 40px rgba(255,80,90,.5)}
.sp-tvban .sp-mbar{width:100%;margin-top:8px}
.sp-tvbig{position:absolute;left:50%;top:27%;transform:translate(-50%,-50%);text-align:center;font-weight:900;font-size:64px;text-shadow:0 6px 0 rgba(0,0,0,.4),0 0 40px rgba(140,120,255,.8);white-space:nowrap;animation:sp-pop .5s cubic-bezier(.3,1.5,.5,1)}
.sp-tvbig small{display:block;font-size:30px;color:#ffd166}
.sp-tvpl{position:absolute;left:16px;right:16px;bottom:14px;display:flex;justify-content:center;gap:14px;align-items:flex-end}
.sp-pc{flex:0 1 250px;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;transition:opacity .3s}
.sp-pc.off{opacity:.45}
.sp-pb{position:relative;background:#fff;color:#1f2346;border-radius:18px;padding:10px 12px 10px;width:100%;min-height:96px;box-shadow:0 6px 0 rgba(0,0,0,.3);display:flex;flex-direction:column;justify-content:center;transition:transform .2s,box-shadow .2s}
.sp-pb::after{content:'';position:absolute;left:50%;bottom:-11px;margin-left:-11px;border:11px solid transparent;border-bottom:0;border-top-color:#fff}
.sp-pb .sp-bar{margin-top:6px;height:10px;background:#e3e7f7;box-shadow:none}
.sp-pbt{font-weight:900;font-size:19px;line-height:1.3;text-align:center;min-height:25px}
.sp-pbt.idle{color:#9aa0c0;font-size:16px}
.sp-pc.sh .sp-pb{box-shadow:0 6px 0 rgba(0,0,0,.3),0 0 0 4px #ff9a2a,0 0 30px rgba(255,154,42,.8);transform:scale(1.04)}
.sp-pc.sh .sp-pb::before{content:'📣';position:absolute;left:-14px;top:-16px;font-size:30px;animation:sp-bob .5s ease-in-out infinite alternate}
.sp-pc.ok .sp-pb{box-shadow:0 6px 0 rgba(0,0,0,.3),0 0 0 4px #22c26a,0 0 30px rgba(34,194,106,.8)}
.sp-pc.bad .sp-pb{box-shadow:0 6px 0 rgba(0,0,0,.3),0 0 0 4px #ff4f58;animation:sp-shake .4s}
.sp-pa{width:68px;height:68px;margin-top:6px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
.sp-pn{font-weight:900;font-size:17px;background:rgba(10,14,40,.75);border-radius:999px;padding:2px 12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-pn small{color:#9dff6a;font-family:var(--round);margin-left:4px}
.sp-pk{display:flex;align-items:center;justify-content:center;gap:8px}
.sp-pk .sp-kic{width:54px;height:54px;font-size:34px}
.sp-pk .sp-kact{font-size:30px}
.sp-pk .sp-kact small{font-size:13px}
.sp-pk .sp-kact .dots{font-size:22px}
.sp-pkt{font-size:13px;color:#6b7196;margin-top:2px}
.sp-sm .sp-pkt{display:none}
.sp-robot{position:absolute;right:26px;top:100px;display:flex;align-items:center;gap:10px;flex-direction:row-reverse}
.sp-robot .rb{font-size:80px;line-height:1;animation:sp-bob 1.4s ease-in-out infinite alternate;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}
.sp-robot .rt{background:#fff;color:#1f2346;border-radius:18px;padding:10px 16px;font-weight:900;font-size:22px;max-width:320px;box-shadow:0 5px 0 rgba(0,0,0,.3)}
.sp-sm .sp-tvhud{left:8px;right:8px;top:8px;gap:6px;flex-wrap:wrap}
.sp-sm .sp-tvsec{font-size:14px;padding:3px 10px}.sp-sm .sp-tvsec b{font-size:22px}
.sp-sm .sp-tvm{font-size:13px;padding:5px 8px;gap:5px;min-width:40%}.sp-sm .sp-tvm b{font-size:15px;min-width:0}.sp-sm .sp-tvm div{height:10px}
.sp-sm .sp-tvok{font-size:13px;padding:5px 8px}.sp-sm .sp-tvok b{font-size:15px}
.sp-sm .sp-tvpl{flex-wrap:wrap;gap:8px;left:8px;right:8px;bottom:8px}
.sp-sm .sp-pc{flex:0 1 calc(50% - 8px)}
.sp-sm .sp-pb{min-height:58px;padding:6px 8px;border-radius:12px}
.sp-sm .sp-pbt{font-size:13px}
.sp-sm .sp-pa{width:36px;height:36px;margin-top:2px}
.sp-sm .sp-pn{font-size:12px}
.sp-sm .sp-pk .sp-kic{width:34px;height:34px;font-size:20px}.sp-sm .sp-pk .sp-kact{font-size:20px}
.sp-sm .sp-tvban{top:84px;font-size:16px;padding:6px 12px}
.sp-sm .sp-tvbig{font-size:30px}.sp-sm .sp-tvbig small{font-size:16px}
.sp-sm .sp-robot{top:80px;right:8px}.sp-sm .sp-robot .rb{font-size:40px}.sp-sm .sp-robot .rt{font-size:13px;padding:5px 8px;max-width:180px}
`;
  function injectCSS() {
    if (document.getElementById('sp-style')) return;
    const s = document.createElement('style'); s.id = 'sp-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* kid "what to do" picture for an instruction / shout: {ty, v, k, n, co} */
  function kidAct(x) {
    if (x.ty === 'bt') return `<span class="sp-kact">👆<small>${x.k > 1 ? `按 ${x.k} 下` : '按一下'}</small></span>`;
    if (x.ty === 'tg') return `<span class="sp-kact">${x.v ? '⬆️' : '⬇️'}<small>${x.v ? '打開' : '關掉'}</small></span>`;
    const n = x.n || 3;
    return `<span class="sp-kact" style="--cc:${x.co}"><span class="dots">${'●'.repeat(x.v + 1)}<s>${'●'.repeat(Math.max(0, n - x.v - 1))}</s></span><small>調到 ${x.v + 1}</small></span>`;
  }
  const sliderPct = (i, n) => 8 + 84 * (n > 1 ? i / (n - 1) : 0);

  /* =================================================================== GAME */
  LGAMES.push({
    id: 'ship', name: '太空船大作戰', icon: '🚀', col: '#5b5bf7',
    blurb: '指令在你手機，按鈕在別人手機——大聲喊！', players: [2, 6],
    rules: kid => kid ? [
      '🚀 每個人的手機上都有不一樣的按鈕和拉桿',
      '🖼 上面的大圖片告訴你「要按哪一個」——它通常在別人的手機上！',
      '📣 大聲喊：「誰有 🐸？」有的人就趕快按',
      '⏳ 時間條跑完前做好，太空船就往前飛',
      '🌕 飛過 3 區就抵達月球！'
    ] : [
      '🎛 每支手機都有一組獨一無二的控制器，只有你看得到',
      '📟 上方是你的指令，但那個控制器通常在別人的面板上——喊出來！',
      '⏱ 時間到沒完成，船體受損；完成夠多指令就跳到下一區',
      '☄️ 越往後指令越快、控制器越多，還會有流星雨、面板當機、熄燈',
      '📣 不在同一個空間？按 📣 把你的指令廣播給大家'
    ],

    /* ================================================================= HOST */
    host(ctx) {
      const kid = ctx.kid, N = ctx.players.length;
      const P = ctx.players.map((p, i) => ({ id: p.id, i, ctrls: [], ins: null, gap: rr(0.4, 1.6), done: 0, lastSh: -9, taps: 0, lr: null }));
      const byId = {}; P.forEach(p => { byId[p.id] = p; });
      let C = {};
      let st = 'jump', jt = 4, first = true, sec = 1, hull = 100, prog = 0, need = 0, okN = 0, badN = 0, hit = 0, over = false, endT = 0, win = false, ended = false;
      let ev = null, evT = 0, evDone = false, evSeq = 0, er = null, lastEv = '', insSeq = 0, ctlSeq = 0, shouts = [], T = 0;
      const needFor = s => kid ? 2 + 2 * N + s : 3 + 2 * N + 2 * s;
      const timeFor = s => kid ? Math.max(12, 16 - s) : Math.max(7, 12.6 - 0.8 * s);
      const nCtl = s => kid ? Math.min(4, (s >= 3 ? 4 : 3) + (N <= 2 ? 1 : 0)) : Math.min(8, 4 + s + (N <= 2 ? 1 : 0));
      const dmg = () => kid ? 6 : Math.round(10 + Math.min(8, (sec - 1) * 1.5));
      const on = p => ctx.online(p.id);

      function mkCtl(ty, own, pool, used) {
        const c = { id: 'c' + (++ctlSeq), ty, own, v: 0, n: ty === 'bt' ? 1 : ty === 'tg' ? 2 : 4, lb: [], ic: '', co: '#ffd166', nm: '' };
        if (kid) {
          const K = pool.pop() || pick(KIDS);
          c.ic = K[0]; c.co = K[3]; c.nm = K[1] + K[2] + KTYPE[ty];
          if (ty === 'sl') { c.n = 3; c.lb = ['1', '2', '3']; }
          if (ty === 'tg') c.lb = ['關', '開'];
        } else {
          let nm = '', g = 0;
          do { nm = (Math.random() < 0.45 ? pick(PREF) : '') + pick(CORES) + pick(DEV[ty]); } while (used.has(nm) && ++g < 80);
          used.add(nm); c.nm = nm; c.co = pick(ACOLS);
          if (ty === 'tg') c.lb = ['關', '開'];
          if (ty === 'sl') { c.n = Math.random() < 0.5 ? 4 : 5; c.lb = Array.from({ length: c.n }, (_, i) => String(i)); }
          if (ty === 'dl') c.lb = pick(DIALS).slice();
        }
        if (ty !== 'bt') c.v = ri(c.n);
        return c;
      }
      function buildPanels() {
        C = {};
        const pool = shuf(KIDS.slice()), used = new Set(), k = nCtl(sec);
        const allow = kid ? (sec >= 2 ? ['bt', 'tg', 'sl'] : ['bt', 'tg']) : ['tg', 'tg', 'tg', 'sl', 'sl', 'dl', 'dl', 'bt', 'bt'];
        for (const p of P) {
          p.ctrls = [];
          const types = kid ? ['bt', 'tg'] : [];
          let guard = 0;
          while (types.length < k && guard++ < 200) {
            const t = pick(allow), cnt = types.filter(x => x === t).length;
            if (!kid && (t === 'sl' || t === 'dl') && cnt >= 2) continue;
            if (kid && t === 'sl' && cnt >= 1) continue;
            types.push(t);
          }
          shuf(types);
          for (const ty of types) { const c = mkCtl(ty, p.i, pool, used); C[c.id] = c; p.ctrls.push(c.id); }
        }
      }
      function insText(c, v, k) {
        if (kid) return c.ty === 'bt' ? `按${k > 1 ? ` ${k} 下` : '一下'} ${c.nm}！` : c.ty === 'tg' ? `${v ? '打開' : '關掉'} ${c.nm}！` : `把 ${c.nm} 調到 ${v + 1}`;
        let s = c.ty === 'bt' ? (k > 1 ? `連按 ${c.nm} ${k} 下！` : `按下 ${c.nm}！`)
          : c.ty === 'tg' ? `${v ? '打開' : '關掉'} ${c.nm}！`
            : c.ty === 'sl' ? `把 ${c.nm} 調到 ${c.lb[v]}` : `把 ${c.nm} 轉到「${c.lb[v]}」`;
        if (Math.random() < 0.18) s = pick(['快！', '緊急！', '船長說：']) + s;
        return s;
      }
      function newIns(p) {
        const busy = new Set(P.filter(q => q.ins).map(q => q.ins.c));
        const all = Object.values(C).filter(c => !busy.has(c.id));
        let cand = all.filter(c => on(P[c.own]));
        if (!cand.length) cand = all;
        if (!cand.length) { p.gap = 0.5; return; }
        const w = cand.map(c => c.own === p.i ? 1 : (N <= 2 ? 2.2 : 3));
        let x = Math.random() * w.reduce((a, b) => a + b, 0), c = cand[0];
        for (let j = 0; j < cand.length; j++) { x -= w[j]; if (x <= 0) { c = cand[j]; break; } }
        let v = 0, k = 1;
        if (c.ty === 'bt') k = !kid && Math.random() < 0.3 ? 3 : (kid && sec >= 3 && Math.random() < 0.25 ? 2 : 1);
        else { const opts = []; for (let j = 0; j < c.n; j++) if (j !== c.v) opts.push(j); v = pick(opts); }
        const tt = timeFor(sec) + (k > 1 ? 1.5 : 0);
        p.ins = { id: ++insSeq, c: c.id, v, cnt: k, got: 0, t: tt, T: tt, age: 0, txt: insText(c, v, k) };
      }
      const insV = ins => {
        const c = C[ins.c] || {};
        return { id: ins.id, c: ins.c, txt: ins.txt, ic: c.ic, co: c.co, ty: c.ty, n: c.n, v: ins.v, k: ins.cnt, g: ins.got, t: r1(Math.max(0, ins.t)), T: r1(ins.T) };
      };
      function complete(q, actor) {
        const id = q.ins.id;
        q.lr = { id, ok: 1 }; q.ins = null; q.gap = 0.9; okN++; prog++;
        if (actor != null) P[actor].done++;
        shouts = shouts.filter(s => s.id !== id);
        if (prog >= need) startJump();
      }
      function fail(q) {
        const id = q.ins.id;
        q.lr = { id, ok: 0 }; q.ins = null; q.gap = 1.2; badN++; hit++;
        hull -= dmg();
        shouts = shouts.filter(s => s.id !== id);
        if (hull <= 0) { hull = 0; endGame(false); }
      }
      function check(c, actor, press) {
        for (const q of P) {
          if (!q.ins || q.ins.c !== c.id) continue;
          if (c.ty === 'bt') { if (!press) continue; q.ins.got++; if (q.ins.got < q.ins.cnt) continue; }
          else if (c.v !== q.ins.v) continue;
          complete(q, actor);
          if (st !== 'go') return;
        }
      }
      function startJump() {
        ev = null; shouts = [];
        P.forEach(p => { p.ins = null; p.gap = rr(0.3, 1.4); });
        if (kid && sec >= KID_GOAL) { endGame(true); return; }
        st = 'jump'; jt = 3.4; first = false;
        sec++; hull = Math.min(100, hull + (kid ? 25 : 12)); prog = 0; need = needFor(sec);
        buildPanels(); evDone = false; evT = kid ? rr(10, 18) : rr(8, 16);
      }
      function endGame(w) {
        if (ended) return;
        ended = true; st = 'end'; win = w; endT = w ? 4.2 : 3.4; ev = null; shouts = [];
        P.forEach(p => { p.ins = null; });
      }
      function startEvent() {
        const ons = P.filter(on); if (!ons.length) { evT = 5; return; }
        const kinds = kid ? ['met'] : ['met', 'gl', 'dk'].filter(k => k !== lastEv);
        const k = pick(kinds); lastEv = k;
        if (k === 'met') { const d = kid ? 12 : 8; ev = { k, t: d, T: d, need: ons.length * (kid ? 10 : 16), taps: 0 }; P.forEach(p => { p.taps = 0; }); }
        else if (k === 'gl') ev = { k, t: 10, T: 10, who: shuf(ons.slice()).slice(0, Math.max(1, Math.round(ons.length / 3))).map(p => p.i), seed: ri(1e6) };
        else ev = { k, t: 9, T: 9 };
        ev.n = ++evSeq; evDone = true;
      }
      function endEvent(good) {
        const e = ev; ev = null; evT = kid ? 999 : Math.max(9, rr(16, 26) - sec);
        if (e.k === 'met') {
          good = good || e.taps >= e.need;
          er = { n: e.n, k: 'met', ok: good ? 1 : 0 };
          if (!good) { hull -= kid ? 4 : 14; badN++; hit++; if (hull <= 0) { hull = 0; endGame(false); } }
        } else er = { n: e.n, k: e.k, ok: 1 };
      }
      function shout(p) {
        if (st !== 'go' || !p.ins || T - p.lastSh < 2.2) return;
        p.lastSh = T; shouts = shouts.filter(s => s.p !== p.i);
        const c = C[p.ins.c]; if (!c) return;
        shouts.push({ p: p.i, id: p.ins.id, c: c.id, v: p.ins.v, k: p.ins.cnt, txt: p.ins.txt, ic: c.ic, co: c.co, ty: c.ty, n: c.n, t0: T });
      }
      function act(p, d) {
        if (st !== 'go') return;
        const c = C[d.c]; if (!c || c.own !== p.i) return;
        if (d.p) { if (c.ty !== 'bt') return; check(c, p.i, true); return; }
        const v = d.v;
        if (c.ty === 'bt' || !Number.isInteger(v) || v < 0 || v >= c.n || v === c.v) return;
        c.v = v; check(c, p.i, false);
      }
      function tap(p, k) {
        if (!ev || ev.k !== 'met') return;
        k = cl(k | 0, 0, 12);
        const add = Math.min(k, Math.ceil(ev.T * 16) - p.taps); if (add <= 0) return;
        p.taps += add; ev.taps += add;
        if (ev.taps >= ev.need) endEvent(true);
      }

      need = needFor(sec); buildPanels();

      const evV = me => {
        if (!ev) return null;
        const o = { n: ev.n, k: ev.k, t: r1(Math.max(0, ev.t)), T: ev.T };
        if (ev.k === 'met') { o.need = ev.need; o.taps = Math.min(ev.taps, ev.need); }
        if (ev.k === 'gl') { if (me) { o.mine = ev.who.includes(me.i) ? 1 : 0; o.seed = ev.seed; } else o.who = ev.who; }
        return o;
      };
      return {
        rate: 4,
        get over() { return over; },
        tick(dt) {
          T += dt;
          if (st === 'end') { endT -= dt; if (endT <= 0) over = true; return; }
          if (st === 'jump') { jt -= dt; if (jt <= 0) { st = 'go'; first = false; ctx.push(); } return; }
          if (ev) { ev.t -= dt; if (ev.t <= 0) { endEvent(false); ctx.push(); if (st !== 'go') return; } }
          else if (sec >= 2 && !(kid && evDone)) { evT -= dt; if (evT <= 0) { startEvent(); ctx.push(); } }
          const paused = !!(ev && ev.k === 'met');
          for (const p of P) {
            const online = on(p);
            if (p.ins) {
              if (!online) { p.ins = null; p.gap = 1; ctx.push(); continue; }           // offline: their card just goes away
              p.ins.age += dt;
              const c = C[p.ins.c];
              if (c && !on(P[c.own]) && p.ins.age > 3.5) {                                // control on an offline phone: autopilot does it
                if (c.ty !== 'bt') c.v = p.ins.v;
                complete(p, null); ctx.push();
                if (st !== 'go') return;
                continue;
              }
              if (!paused) { p.ins.t -= dt; if (p.ins.t <= 0) { fail(p); ctx.push(); if (st !== 'go') return; } }
            } else if (online && !paused) { p.gap -= dt; if (p.gap <= 0) { newIns(p); ctx.push(); } }
          }
          const n0 = shouts.length; shouts = shouts.filter(s => T - s.t0 < 7); if (shouts.length !== n0) ctx.push();
        },
        msg(id, d) {
          const p = byId[id]; if (!p || !d || typeof d !== 'object') return;
          if (d.sh) shout(p);
          else if (d.tap != null) tap(p, d.tap);
          else if (typeof d.c === 'string') act(p, d);
          ctx.push();
        },
        leave(id) { const p = byId[id]; if (p) { p.ins = null; p.gap = 1; shouts = shouts.filter(s => s.p !== p.i); } },
        back(id) { const p = byId[id]; if (p) p.gap = 0.8; },
        view(id) {
          const v = { k: kid ? 1 : 0, st, sec, hull: Math.round(hull), prog, need, goal: kid ? KID_GOAL : 0, ok: okN, bad: badN, hit, ids: P.map(p => p.id),
            jt: r1(Math.max(0, jt)), first: first ? 1 : 0, win: win ? 1 : 0, pz: ev && ev.k === 'met' ? 1 : 0, er,
            sh: shouts.map(s => ({ p: s.p, id: s.id, c: s.c, v: s.v, k: s.k, txt: s.txt, ic: s.ic, co: s.co, ty: s.ty, n: s.n })) };
          const me = id == null ? null : byId[id];
          v.ev = evV(me);
          if (!me) {
            v.pl = P.map(p => ({ ins: p.ins ? insV(p.ins) : null, off: on(p) ? 0 : 1, d: p.done, lr: p.lr }));
            return v;
          }
          v.me = me.i; v.my = me.done; v.lr = me.lr;
          v.ins = me.ins ? insV(me.ins) : null;
          v.pan = me.ctrls.map(cid => { const c = C[cid]; return { id: c.id, ty: c.ty, nm: c.nm, ic: c.ic, co: c.co, n: c.n, lb: c.lb, v: c.v }; });
          return v;
        },
        results() {
          return {
            noWinner: true,
            title: win ? '抵達月球！🌕' : (st === 'end' ? '太空船爆炸了…' : '任務結束！'),
            sub: `到達第 ${sec} 區・完成 ${okN} 個指令`,
            rows: P.map(p => ({ id: p.id, key: sec, line: `完成 ${p.done} 個指令` }))
          };
        }
      };
    },

    /* =============================================================== CLIENT */
    client(root, api) {
      injectCSS();
      return api.me == null ? bigScreen(root, api) : phone(root, api);
    },

    /* the bot sees only what a player sees: its own instruction, its own panel and the broadcast shouts */
    bot(v, api) {
      if (!v || v.me == null || !v.pan) return;
      if (v.ev && v.ev.k === 'met') { api.send({ tap: 1 + ri(4) }); return; }
      if (v.st !== 'go') return;
      const mine = {}; v.pan.forEach(c => { mine[c.id] = c; });
      const doIt = x => { const c = mine[x.c]; if (!c) return false; if (c.ty === 'bt') api.send({ c: c.id, p: 1 }); else api.send({ c: c.id, v: x.v }); return true; };
      if (v.ins && mine[v.ins.c] && Math.random() < 0.6) { doIt(v.ins); return; }
      if (v.ins && !(v.sh || []).some(s => s.id === v.ins.id) && Math.random() < 0.4) { api.send({ sh: 1 }); return; }
      for (const s of shuf((v.sh || []).slice())) if (mine[s.c] && Math.random() < 0.7) { doIt(s); return; }
      if (Math.random() < 0.08) {
        const c = pick(v.pan);
        if (c.ty === 'bt') api.send({ c: c.id, p: 1 }); else api.send({ c: c.id, v: ri(c.n) });
      }
    }
  });

  /* ================================================================ PHONE */
  function phone(root, api) {
    const kid = api.kid;
    root.innerHTML = `<div class="sp-root ${kid ? 'sp-kid' : ''}"><div class="sp-stars"></div><div class="sp-stars sp-s2"></div>
      <div class="sp-main">
        <div class="sp-side">
          <div class="sp-stat"><div class="sp-sec"></div>
            <div class="sp-meter sp-hull"><span>🛡</span><div><i></i></div><b></b></div>
            <div class="sp-meter sp-prog"><span>${kid ? '🌕' : '🚀'}</span><div><i></i></div><b></b></div></div>
          <div class="sp-card"><div class="sp-cardtop"><span>${kid ? '⭐ 要做的事' : '📟 你的指令'}</span><span class="sp-cnt"></span></div>
            <div class="sp-ins"></div><div class="sp-bar"><i></i></div>
            <button class="sp-shout off" aria-label="把指令廣播給大家">📣</button></div>
          <div class="sp-shouts"></div>
        </div>
        <div class="sp-panel"><div class="sp-grid"></div><div class="sp-dark" hidden></div><div class="sp-darkt" hidden>💡 熄燈了！手指按住面板當手電筒</div><div class="sp-glb" hidden>⚠️ 面板當機了！按鈕跑來跑去</div></div>
      </div>
      <div class="sp-ov" hidden></div></div>`;
    const box = root.firstChild, q = s => box.querySelector(s);
    const el = {
      sec: q('.sp-sec'), hull: q('.sp-hull'), hullI: q('.sp-hull i'), hullB: q('.sp-hull b'), progI: q('.sp-prog i'), progB: q('.sp-prog b'),
      card: q('.sp-card'), cnt: q('.sp-cnt'), ins: q('.sp-ins'), barI: q('.sp-card .sp-bar i'), shout: q('.sp-shout'), shouts: q('.sp-shouts'),
      panel: q('.sp-panel'), grid: q('.sp-grid'), dark: q('.sp-dark'), darkT: q('.sp-darkt'), glb: q('.sp-glb'), ov: q('.sp-ov')
    };
    let V = null, recvT = 0, raf = 0, land = false, panKey = '', cardKey = '', shKey = '', ovKey = '', lastF = -1, lastSec = 99, robot = pick(ROBOT.go);
    let cmap = {}, cels = {}, pend = {}, drag = null, taps = 0, lastMot = 0, mx = null, cardFx = '', cardFxT = 0;
    const seenSh = new Set();
    const name = i => { const p = V && api.player(V.ids[i]); return p ? p.name : '?'; };
    const ppl = i => V && api.player(V.ids[i]);

    /* ---------- panel ---------- */
    function ctlHTML(c, R) {
      const garb = s => R ? [...s].map(ch => R() < 0.42 ? '▒░#%&?*'[Math.floor(R() * 7)] : ch).join('') : s;
      const nm = `<div class="sp-nm">${kid ? '' : ''}${esc(garb(c.nm))}</div>`;
      const ic = kid ? c.ic : '';
      let inner = '';
      if (c.ty === 'bt') inner = `<button class="sp-btn" aria-label="${esc(c.nm)}">${ic}</button>`;
      else if (c.ty === 'tg') inner = `<div class="sp-tog"><span class="sp-slot"><span class="sp-lev">${ic}</span></span><span class="sp-tl"><span class="u">${kid ? '⬆️開' : '開'}</span><span class="sp-led"></span><span class="d">${kid ? '⬇️關' : '關'}</span></span></div>`;
      else if (c.ty === 'sl') inner = `<div class="sp-sl"><div class="sp-trk"></div>${c.lb.map((l, i) => `<span class="sp-nt" style="left:${sliderPct(i, c.n)}%">${esc(l)}</span>`).join('')}<div class="sp-knob">${ic}</div></div>`;
      else inner = `<div class="sp-dl"><button class="sp-dk" aria-label="${esc(c.nm)}"></button>${c.lb.map((l, i) => { const a = DIAL_ANG[i] * Math.PI / 180; return `<button class="sp-dlb" data-v="${i}" style="left:${50 + 35 * Math.sign(Math.sin(a))}%;top:${50 - 27 * Math.sign(Math.cos(a))}%">${esc(garb(l))}</button>`; }).join('')}</div>`;
      return `<div class="sp-c sp-k-${c.ty}${c.ty === 'sl' ? ' w2' : ''}" data-c="${c.id}" style="--cc:${c.co}"><div class="sp-ctl">${inner}</div>${nm}</div>`;
    }
    function buildPanel(gl) {
      const pan = V.pan, cols = land ? Math.min(4, Math.max(2, pan.length)) : 2;
      let order = pan.slice();
      let R = null;
      if (gl) { const r = seeded(V.ev.seed + V.me * 7919); order = order.map(c => [r(), c]).sort((a, b) => a[0] - b[0]).map(x => x[1]); R = seeded(V.ev.seed + 13 + V.me); }
      const units = order.reduce((s, c) => s + (c.ty === 'sl' ? 2 : 1), 0), rows = Math.max(1, Math.ceil(units / cols));
      el.grid.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`;
      el.grid.style.gridTemplateRows = `repeat(${rows},minmax(${kid ? 116 : land ? 86 : rows >= 5 ? 80 : 94}px,1fr))`;
      el.grid.style.gridAutoFlow = 'row dense';
      el.grid.innerHTML = order.map(c => ctlHTML(c, R)).join('');
      cels = {}; el.grid.querySelectorAll('.sp-c').forEach(e => { cels[e.dataset.c] = e; });
    }
    function applyVal(c, v) {
      const e = cels[c.id]; if (!e) return;
      if (c.ty === 'tg') e.classList.toggle('on', v === 1);
      else if (c.ty === 'sl') {
        const k = e.querySelector('.sp-knob'); if (k) k.style.left = sliderPct(v, c.n) + '%';
        e.querySelectorAll('.sp-nt').forEach((n, i) => n.classList.toggle('cur', i === v));
      } else if (c.ty === 'dl') {
        const k = e.querySelector('.sp-dk'); if (k) k.style.transform = `rotate(${DIAL_ANG[v] || 0}deg)`;
        e.querySelectorAll('.sp-dlb').forEach(n => n.classList.toggle('cur', +n.dataset.v === v));
      }
    }
    const cur = c => { const pd = pend[c.id]; return pd ? pd.v : c.v; };
    function drawPanel() {
      const gl = !!(V.ev && V.ev.k === 'gl' && V.ev.mine);
      const key = (V.pan || []).map(c => c.id).join(',') + '|' + (gl ? V.ev.seed : '') + '|' + land;
      cmap = {}; (V.pan || []).forEach(c => { cmap[c.id] = c; });
      if (key !== panKey) { panKey = key; buildPanel(gl); }
      const now = performance.now();
      for (const c of V.pan || []) {
        const pd = pend[c.id];
        if (pd && (now - pd.t > 900 || pd.v === c.v)) delete pend[c.id];
        if (drag && drag.c.id === c.id) continue;
        applyVal(c, cur(c));
      }
      el.panel.classList.toggle('glitch', gl); el.glb.hidden = !gl;
      const dk = !!(V.ev && V.ev.k === 'dk'); el.dark.hidden = !dk; el.darkT.hidden = !dk;
    }
    const setLocal = (c, v) => { pend[c.id] = { v, t: performance.now() }; applyVal(c, v); };
    const slIdx = (sl, x, n) => { const b = sl.getBoundingClientRect(); return cl(Math.round((x - b.left - b.width * 0.08) / (b.width * 0.84) * (n - 1)), 0, n - 1); };
    const canAct = () => V && V.st === 'go';
    el.grid.addEventListener('pointerdown', e => {
      const ce = e.target.closest('.sp-c'); if (!ce) return;
      const c = cmap[ce.dataset.c]; if (!c) return;
      e.preventDefault();
      if (!canAct()) { api.sfx('tick'); return; }
      if (c.ty === 'bt') {
        const b = ce.querySelector('.sp-btn'); b.classList.add('dn'); setTimeout(() => b.classList.remove('dn'), 130);
        api.send({ c: c.id, p: 1 }); api.sfx('pop'); api.vibrate(15);
      } else if (c.ty === 'tg') {
        const nv = 1 - cur(c); setLocal(c, nv); api.send({ c: c.id, v: nv }); api.sfx('flip'); api.vibrate(14);
      } else if (c.ty === 'dl') {
        const lb = e.target.closest('.sp-dlb');
        const nv = lb ? +lb.dataset.v : (cur(c) + 1) % c.n;
        if (nv !== cur(c)) { setLocal(c, nv); api.send({ c: c.id, v: nv }); }
        api.sfx('tick'); api.vibrate(10);
      } else if (c.ty === 'sl') {
        const sl = ce.querySelector('.sp-sl'); if (!sl) return;
        drag = { c, sl, id: e.pointerId, v: slIdx(sl, e.clientX, c.n) };
        try { ce.setPointerCapture(e.pointerId); } catch (er) { }
        sl.querySelector('.sp-knob').classList.add('drag');
        applyVal(c, drag.v); api.sfx('tick');
      }
    });
    el.grid.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const nv = slIdx(drag.sl, e.clientX, drag.c.n);
      if (nv !== drag.v) { drag.v = nv; applyVal(drag.c, nv); api.sfx('tick'); api.vibrate(8); }
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      d.sl.querySelector('.sp-knob').classList.remove('drag');
      if (d.v !== cur(d.c)) { setLocal(d.c, d.v); api.send({ c: d.c.id, v: d.v }); api.sfx('flip'); api.vibrate(12); }
      else applyVal(d.c, cur(d.c));
    };
    el.grid.addEventListener('pointerup', endDrag);
    el.grid.addEventListener('pointercancel', endDrag);
    /* lights out: the finger is a torch */
    const torch = e => { const b = el.panel.getBoundingClientRect(); el.dark.style.setProperty('--x', (e.clientX - b.left) + 'px'); el.dark.style.setProperty('--y', (e.clientY - b.top) + 'px'); };
    el.panel.addEventListener('pointerdown', torch, true);
    el.panel.addEventListener('pointermove', torch, true);

    el.shout.onclick = () => {
      if (!V || !V.ins) return;
      api.send({ sh: 1 }); const p = ppl(V.me); api.sfx('say', p ? p.animal : 0); api.vibrate(20);
      el.shout.classList.add('sent');
    };

    /* ---------- status + card ---------- */
    function drawStat() {
      el.sec.innerHTML = kid ? `第 <b>${V.sec}</b>/${V.goal} 區` : `第 <b>${V.sec}</b> 區`;
      el.hull.classList.toggle('mid', V.hull < 60 && V.hull >= 30); el.hull.classList.toggle('low', V.hull < 30);
      el.hullI.style.width = V.hull + '%'; el.hullB.textContent = V.hull + '%';
      el.progI.style.width = (V.need ? cl(V.prog / V.need, 0, 1) * 100 : 0) + '%'; el.progB.textContent = `${V.prog}/${V.need}`;
    }
    function drawCard() {
      const ins = V.ins;
      let key, html, cls = '', big = false;
      if (V.st === 'end') { key = 'end'; big = true; html = V.win ? '<div class="sp-itx" style="font-size:28px">🌕 抵達月球！</div>' : '<div class="sp-itx" style="font-size:28px">💥 太空船爆炸了…</div>'; }
      else if (V.st === 'jump') {
        const n = Math.max(1, Math.ceil(V.jt)); key = 'j' + V.sec + ':' + n; big = true; cls = 'jump';
        html = `<div class="sp-itx" style="font-size:${kid ? 24 : 22}px">${V.first ? '🚀 準備起飛！' : `🚀 跳躍到第 ${V.sec} 區！`}</div><div class="sp-cd">${n}</div><div class="sp-isub" style="color:#d9d2ff">${V.first ? '先看看你的控制台 👇' : '新的控制台來了 👇'}</div>`;
      } else if (ins) {
        key = 'i' + ins.id + ':' + ins.g;
        if (kid) html = `<div class="sp-kins"><span class="sp-kic" style="--cc:${ins.co}">${ins.ic}</span>${kidAct(ins)}</div><div class="sp-ktx">${esc(ins.txt)}</div>`;
        else {
          const L = ins.txt.length, fs = L <= 10 ? 30 : L <= 14 ? 26 : L <= 19 ? 23 : 20;
          html = `<div class="sp-itx" style="font-size:${fs}px">${esc(ins.txt)}</div>${ins.k > 1 ? `<div class="sp-isub">已按 ${ins.g} / ${ins.k} 下</div>` : ''}`;
        }
      } else if (V.lr && cardFx && performance.now() - cardFxT < 2500) {
        key = 'lr' + V.lr.id; big = true; cls = V.lr.ok ? 'ok' : 'bad';
        html = V.lr.ok ? `<div class="sp-itx" style="font-size:30px">✅ 完成！</div>${kid ? `<div class="sp-isub" style="color:#127a40">${esc(pick(ROBOT.ok))}</div>` : ''}`
          : `<div class="sp-itx" style="font-size:28px">💥 太慢了！</div><div class="sp-isub">${kid ? '沒關係，下一個加油！' : '船體受損！'}</div>`;
      } else { key = 'w'; big = true; html = `<div class="sp-wait">${V.pz ? '☄️ 先擋流星！' : '⏳ 新指令馬上來…'}</div>`; }
      el.shout.classList.toggle('off', !ins || V.st !== 'go');
      const shouted = ins && (V.sh || []).some(s => s.id === ins.id);
      el.shout.classList.toggle('sent', !!shouted);
      el.shout.classList.toggle('ping', !!ins && !shouted && V.st === 'go');
      if (key === cardKey) return;
      cardKey = key;
      el.card.className = 'sp-card ' + cls;
      el.ins.className = 'sp-ins' + (big ? ' sp-big' : '');
      el.ins.innerHTML = html;
      el.cnt.textContent = kid ? '' : `✅ ${V.my || 0}`;
      lastF = -1;
    }
    function drawShouts() {
      const list = (V.sh || []).filter(s => s.p !== V.me).slice(land ? -4 : -2);
      const key = list.map(s => s.id).join(',') + '|' + (list.length ? '' : robot);
      if (key === shKey) return;
      shKey = key;
      if (!list.length) {
        el.shouts.innerHTML = kid ? `<div class="sp-hint"><span class="rb">🤖</span><span class="rt">${esc(robot)}</span></div>`
          : `<div class="sp-hint">📣 別人喊的指令會出現在這裡。看到你面板上有的，就快做！</div>`;
        return;
      }
      el.shouts.innerHTML = list.map(s => {
        const p = ppl(s.p), isNew = !seenSh.has(s.id);
        if (isNew) { seenSh.add(s.id); api.sfx('say', p ? p.animal : 0); }
        return `<div class="sp-bub ${isNew ? 'new' : ''}"><img alt="" src="${api.avatar(p, 64)}">${kid ? `<span class="sp-kic sm" style="--cc:${s.co}">${s.ic}</span><span class="ka" style="--cc:${s.co}">${kidAct(s).replace(/<small>.*?<\/small>/, '')}</span>` : ''}<span class="t">${kid ? '' : `<span style="color:#6b7196">${esc(name(s.p))}：</span>`}${esc(s.txt)}</span></div>`;
      }).join('');
    }
    function drawOverlay() {
      const e = V.ev;
      let key = '';
      if (V.st === 'end') key = 'end' + V.win;
      else if (e && e.k === 'met') key = 'met' + e.n;
      if (key !== ovKey) {
        ovKey = key;
        if (!key) { el.ov.hidden = true; el.ov.innerHTML = ''; }
        else if (V.st === 'end') {
          el.ov.className = 'sp-ov end'; el.ov.hidden = false;
          el.ov.innerHTML = V.win ? `<div class="sp-endic">🌕</div><h2>抵達月球！</h2><p>${kid ? '🤖 你們是最棒的太空隊！' : `飛到第 ${V.sec} 區`}</p>`
            : `<div class="sp-endic">💥</div><h2>太空船爆炸了…</h2><p>到達第 ${V.sec} 區・完成 ${V.ok} 個指令</p>`;
        } else {
          el.ov.className = 'sp-ov met'; el.ov.hidden = false;
          el.ov.innerHTML = `${[12, 38, 64, 86].map((x, i) => `<span class="sp-mrock" style="left:${x}%;top:-40px;animation-delay:${-i * 0.4}s">☄️</span>`).join('')}
            <h2>☄️ 流星雨！</h2><p>${kid ? '大家一起拍拍藍色大按鈕！' : '全隊一起狂拍護盾！（搖手機也算）'}</p>
            <button class="sp-mbtn">🛡<b>拍！</b></button><div class="sp-mbar"><i></i></div><p class="sp-mn"></p>`;
          const b = el.ov.querySelector('.sp-mbtn');
          b.addEventListener('pointerdown', ev => { ev.preventDefault(); taps++; b.classList.add('dn'); setTimeout(() => b.classList.remove('dn'), 70); api.sfx('pop'); api.vibrate(10); });
        }
      }
      if (e && e.k === 'met' && V.st !== 'end') {
        const i = el.ov.querySelector('.sp-mbar i'), n = el.ov.querySelector('.sp-mn');
        if (i) i.style.width = cl(e.taps / e.need, 0, 1) * 100 + '%';
        if (n) n.textContent = `${e.taps} / ${e.need}　還有 ${Math.ceil(e.t)} 秒`;
      }
    }
    function bump(text, sub) {
      const d = document.createElement('div'); d.className = 'sp-plus'; d.innerHTML = `${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
      el.panel.appendChild(d); setTimeout(() => d.remove(), 1000);
    }
    function feedback(a, b) {
      if (!a) return;
      if (b.st !== a.st) {
        if (b.st === 'go') { api.sfx('go'); api.vibrate(30); robot = pick(ROBOT.go); }
        else if (b.st === 'jump') { api.sfx('whoosh'); api.sfx('star'); api.vibrate([30, 40, 30]); robot = pick(ROBOT.jump); pend = {}; }
        else if (b.st === 'end') { if (b.win) api.sfx('win'); else { api.sfx('boom'); api.vibrate(400); } }
      }
      if (b.ins && (!a.ins || a.ins.id !== b.ins.id)) { api.sfx('turn'); api.vibrate(15); lastSec = 99; }
      if (b.lr && (!a.lr || a.lr.id !== b.lr.id)) {
        cardFx = b.lr.ok ? 'ok' : 'bad'; cardFxT = performance.now();
        if (b.lr.ok) { api.sfx('right'); api.vibrate(30); robot = pick(ROBOT.ok); }
        else { api.sfx('wrong'); api.vibrate(250); robot = pick(ROBOT.bad); }
      }
      if ((b.my || 0) > (a.my || 0)) { api.sfx('coin'); api.vibrate(40); bump('+1', kid ? '你幫了大家！' : '指令完成！'); }
      if (b.hit > a.hit) {
        el.panel.classList.remove('hit'); void el.panel.offsetWidth; el.panel.classList.add('hit');
        if (!(b.lr && (!a.lr || a.lr.id !== b.lr.id))) { api.sfx('buzz'); api.vibrate(80); }
      }
      if (b.ev && (!a.ev || a.ev.n !== b.ev.n)) {
        if (b.ev.k === 'met') { api.sfx('boom'); api.vibrate([120, 60, 120]); robot = ROBOT.met[0]; }
        else if (b.ev.k === 'gl' && b.ev.mine) { api.sfx('wrong'); api.vibrate([60, 40, 60, 40, 60]); }
        else if (b.ev.k === 'dk') { api.sfx('flip'); api.vibrate(60); }
      }
      if (b.er && (!a.er || a.er.n !== b.er.n) && b.er.k === 'met') { if (b.er.ok) { api.sfx('star'); robot = ROBOT.metOk[0]; } else api.sfx('boom'); }
    }

    /* ---------- loop: timer bar, tap flush, ticks ---------- */
    let tapAcc = 0, last = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000; last = now;
      if (!V) return;
      tapAcc += dt;
      if (taps > 0 && tapAcc > 0.15) { api.send({ tap: Math.min(12, taps) }); taps = Math.max(0, taps - 12); tapAcc = 0; }
      const ins = V.ins;
      let f = 0;
      if (ins && V.st === 'go') {
        const left = V.pz ? ins.t : ins.t - (now - recvT) / 1000;
        f = cl(left / ins.T, 0, 1);
        const s = Math.ceil(left);
        if (s <= 3 && s >= 1 && s < lastSec) { lastSec = s; api.sfx('tick'); if (s === 1) api.vibrate(20); }
      } else if (V.st === 'jump') f = 0;
      if (Math.abs(f - lastF) > 0.002) {
        lastF = f; el.barI.style.width = (f * 100).toFixed(1) + '%';
        const c = f < 0.25 ? 'hot' : f < 0.5 ? 'warn' : '';
        if (el.barI.className !== c) el.barI.className = c;
      }
      if (cardFx && !V.ins && now - cardFxT > 2500) { cardFx = ''; drawCard(); }
    }
    raf = requestAnimationFrame(frame);
    const onMotion = e => {
      if (!V || !V.ev || V.ev.k !== 'met') return;
      const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null; if (!a) return;
      const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0), now = performance.now();
      if (m > 14 && now - lastMot > 110) { lastMot = now; taps++; api.vibrate(8); }
    };
    addEventListener('devicemotion', onMotion);
    const ro = new ResizeObserver(() => {
      const l = root.clientWidth > root.clientHeight * 1.15;
      if (l !== land) { land = l; box.classList.toggle('sp-land', land); panKey = ''; shKey = ''; if (V) { drawPanel(); drawShouts(); } }
    });
    ro.observe(root);
    land = root.clientWidth > root.clientHeight * 1.15; box.classList.toggle('sp-land', land);

    return {
      view(v) {
        if (!v || v.me == null) return;
        const a = V; V = v; recvT = performance.now();
        feedback(a, v);
        drawStat(); drawPanel(); drawCard(); drawShouts(); drawOverlay();
      },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('devicemotion', onMotion); }
    };
  }

  /* =========================================================== BIG SCREEN */
  function bigScreen(root, api) {
    const kid = api.kid;
    root.innerHTML = `<div class="sp-tv ${kid ? 'sp-kid' : ''}"><canvas class="sp-cv"></canvas>
      <div class="sp-tvhud"><div class="sp-tvsec"></div>
        <div class="sp-tvm sp-hull">🛡 船體<div><i></i></div><b></b></div>
        <div class="sp-tvm sp-prog">${kid ? '🌕 航程' : '🚀 航程'}<div><i></i></div><b></b></div>
        <div class="sp-tvok">✅ <b>0</b></div></div>
      <div class="sp-tvban" hidden></div>
      ${kid ? '<div class="sp-robot"><span class="rb">🤖</span><span class="rt"></span></div>' : ''}
      <div class="sp-tvpl"></div><div class="sp-tvbig" hidden></div></div>`;
    const box = root.firstChild, q = s => box.querySelector(s);
    const cv = q('.sp-cv'), g = cv.getContext('2d');
    const el = { sec: q('.sp-tvsec'), hull: q('.sp-hull'), hullI: q('.sp-hull i'), hullB: q('.sp-hull b'), progI: q('.sp-prog i'), progB: q('.sp-prog b'),
      ok: q('.sp-tvok b'), ban: q('.sp-tvban'), pl: q('.sp-tvpl'), big: q('.sp-tvbig'), rt: q('.sp-robot .rt') };
    let V = null, recvT = 0, raf = 0, W = 0, H = 0, dpr = 1, bg = null, bgSec = -1, t = 0, last = performance.now(), spd = 1, shake = 0, small = false;
    let stars = [], parts = [], rocks = [], planet = null, rockT = 0, boomDone = false, endT = 0, winT = 0, robot = pick(ROBOT.go), banKey = '', bigKey = '', plKey = '';
    let cards = [];
    const HUES = [['#2a1b6b', '#0b3a5c'], ['#5c1b4f', '#1b2a6b'], ['#0d4a3a', '#2a1b6b'], ['#5c3a0d', '#3a0d4a'], ['#123c6b', '#5c1b2a'], ['#3a0d5c', '#0d5c4a']];
    const PLAN = [['#ff9a6b', '#b8452a', 1], ['#7fd4ff', '#2a6bb8', 0], ['#c6a0ff', '#6a3ab8', 1], ['#9dff9a', '#2a8a52', 0], ['#ffd27a', '#b8862a', 1], ['#ff8ac6', '#b82a6b', 0]];

    function resize() {
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (w === W && h === H) return;
      W = w; H = h; dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      stars = [];
      [[16, 120, 0.7, 0.45], [50, 70, 1.3, 0.7], [130, 34, 2.1, 1]].forEach(([sp, n, s, a], L) => { for (let i = 0; i < n * (W * H) / (1600 * 900) + 10; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, sp, s: s * rr(0.7, 1.3), a, L, tw: Math.random() * 6 }); });
      bgSec = -1;
      small = W < 760; box.classList.toggle('sp-sm', small);
    }
    function makeBg(sec) {
      bgSec = sec; bg = document.createElement('canvas'); bg.width = Math.max(1, Math.round(W)); bg.height = Math.max(1, Math.round(H));
      const b = bg.getContext('2d'), hu = HUES[(sec - 1) % HUES.length];
      const lg = b.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#05071a'); lg.addColorStop(1, '#0a0c26'); b.fillStyle = lg; b.fillRect(0, 0, W, H);
      const blob = (x, y, r, c) => { const rg = b.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); b.globalAlpha = 0.55; b.fillStyle = rg; b.fillRect(0, 0, W, H); b.globalAlpha = 1; };
      blob(W * 0.2, H * 0.3, H * 0.7, hu[0]); blob(W * 0.8, H * 0.75, H * 0.8, hu[1]); blob(W * 0.6, H * 0.15, H * 0.4, hu[0]);
    }
    function newPlanet(sec, fromRight) {
      const P = PLAN[(sec - 1) % PLAN.length];
      planet = { x: fromRight ? W + H * 0.3 : W * 0.78, y: H * rr(0.22, 0.4), r: H * rr(0.1, 0.17), c1: P[0], c2: P[1], ring: P[2], sec };
    }
    const shipPos = () => {
      const s = Math.min(W * 0.11, H * 0.17);
      let x = W * 0.4 + Math.min(60, (spd - 1) * 5), y = H * 0.47 + Math.sin(t * 1.3) * H * 0.012;
      if (V && V.st === 'end' && V.win) { const k = cl(winT / 3, 0, 1); x += (W * 0.74 - x) * k * k; y += (H * 0.42 - y) * k; }
      return { x, y, s };
    };
    function drawShip(x, y, s, hull) {
      g.save(); g.translate(x, y);
      if (V && V.st === 'end' && V.win) { const k = cl(winT / 3, 0, 1); g.scale(1 - k * 0.55, 1 - k * 0.55); }
      g.lineJoin = 'round'; g.lineCap = 'round';
      // flame
      const fl = 0.5 + 0.12 * Math.sin(t * 31) + 0.08 * Math.random() + Math.min(1.4, (spd - 1) * 0.12);
      const fg = g.createLinearGradient(-0.95 * s, 0, -(1.05 + fl) * s, 0);
      fg.addColorStop(0, '#fffbd0'); fg.addColorStop(0.35, '#ffb02a'); fg.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = fg; g.beginPath(); g.moveTo(-0.92 * s, -0.24 * s); g.quadraticCurveTo(-(1.05 + fl) * s, 0, -0.92 * s, 0.24 * s); g.fill();
      // fins
      const fin = sy => { g.beginPath(); g.moveTo(-0.45 * s, sy * 0.36 * s); g.quadraticCurveTo(-0.7 * s, sy * 0.95 * s, -1.02 * s, sy * 0.9 * s); g.lineTo(-0.86 * s, sy * 0.22 * s); g.closePath(); g.fillStyle = '#ff5d73'; g.fill(); g.strokeStyle = '#8f1f33'; g.lineWidth = 0.035 * s; g.stroke(); };
      fin(-1); fin(1);
      // engine
      g.fillStyle = '#5a6288'; g.beginPath(); g.roundRect(-1.0 * s, -0.27 * s, 0.22 * s, 0.54 * s, 0.07 * s); g.fill();
      // body
      const body = () => { g.beginPath(); g.moveTo(-0.9 * s, -0.42 * s); g.bezierCurveTo(0.15 * s, -0.66 * s, 1.0 * s, -0.48 * s, 1.28 * s, 0); g.bezierCurveTo(1.0 * s, 0.48 * s, 0.15 * s, 0.66 * s, -0.9 * s, 0.42 * s); g.closePath(); };
      const bgr = g.createLinearGradient(0, -0.6 * s, 0, 0.6 * s); bgr.addColorStop(0, '#ffffff'); bgr.addColorStop(0.55, '#dfe5f8'); bgr.addColorStop(1, '#9aa3c8');
      body(); g.fillStyle = bgr; g.fill();
      g.save(); body(); g.clip();
      g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(1.32 * s, 0, 0.36 * s, 0, 7); g.fill();
      g.fillStyle = '#5b5bf7'; g.fillRect(-1 * s, 0.3 * s, 2.4 * s, 0.07 * s);
      if (hull < 60) { g.strokeStyle = 'rgba(60,40,60,.7)'; g.lineWidth = 0.025 * s; g.beginPath(); g.moveTo(-0.3 * s, -0.5 * s); g.lineTo(-0.2 * s, -0.3 * s); g.lineTo(-0.28 * s, -0.2 * s); g.lineTo(-0.15 * s, -0.05 * s); g.stroke(); }
      if (hull < 30) { g.beginPath(); g.moveTo(0.6 * s, 0.45 * s); g.lineTo(0.5 * s, 0.3 * s); g.lineTo(0.62 * s, 0.22 * s); g.stroke(); }
      g.restore();
      body(); g.strokeStyle = '#3a4266'; g.lineWidth = 0.04 * s; g.stroke();
      // portholes with the crew
      const ids = V ? V.ids : [], n = Math.max(1, ids.length), two = n > 4, top = two ? Math.ceil(n / 2) : n, r = two ? 0.135 * s : 0.18 * s;
      for (let i = 0; i < n; i++) {
        const row = i < top ? 0 : 1, m = row ? n - top : top, j = row ? i - top : i;
        const x0 = two ? (row ? -0.42 : -0.55) : -0.6, x1 = two ? (row ? 0.42 : 0.6) : 0.7;
        const px = (m === 1 ? 0.1 : x0 + (x1 - x0) * j / (m - 1)) * s, py = (two ? (row ? 0.08 : -0.24) : -0.06) * s;
        const p = api.player(ids[i]), off = V && V.pl && V.pl[i] && V.pl[i].off;
        g.beginPath(); g.arc(px, py, r * 1.22, 0, 7); g.fillStyle = '#3a4266'; g.fill();
        g.save(); g.beginPath(); g.arc(px, py, r, 0, 7); g.clip();
        const gl = g.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r); gl.addColorStop(0, '#d8f6ff'); gl.addColorStop(1, '#5fb8f0'); g.fillStyle = gl; g.fillRect(px - r, py - r, 2 * r, 2 * r);
        if (p && typeof drawCritter === 'function') drawCritter(g, px, py + r * 0.28, r * 0.78, p.col, p.animal, { noShadow: true, still: true, step: 0, alpha: off ? 0.4 : 1, hop: Math.max(0, Math.sin(t * 4 + i)) * r * 0.12 });
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(px - r * 0.35, py - r * 0.45, r * 0.35, r * 0.18, -0.5, 0, 7); g.fill();
        g.restore();
      }
      g.restore();
    }
    function burst(x, y, n, cols, sp, life) {
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = rr(0.2, 1) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: life * rr(0.6, 1), L: life, c: pick(cols), r: rr(2, 6) }); }
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      resize(); if (!W) return;
      const v = V, sec = v ? v.sec : 1;
      if (bgSec !== sec) { makeBg(sec); if (!planet || planet.sec !== sec) newPlanet(sec, !!v && bgSec > 0); }
      const tgt = v && v.st === 'jump' ? (v.first ? (v.jt < 1.2 ? 6 : 1.5) : (v.jt > 0.6 ? 16 : 3)) : v && v.st === 'end' && !v.win ? 0.3 : 1;
      spd += (tgt - spd) * Math.min(1, dt * 2.5);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (shake > 0) { shake -= dt; g.translate(rr(-1, 1) * shake * 30, rr(-1, 1) * shake * 30); }
      g.drawImage(bg, 0, 0, W, H);
      // planet
      if (planet) {
        planet.x -= dt * 6 * spd;
        if (planet.x < -planet.r * 2) newPlanet(sec, true);
        const { x, y, r } = planet, pg = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
        pg.addColorStop(0, planet.c1); pg.addColorStop(1, planet.c2);
        g.fillStyle = pg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        if (planet.ring) { g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = r * 0.08; g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.38, -0.3, 0, 7); g.stroke(); }
      }
      // stars
      for (const st of stars) {
        st.x -= st.sp * spd * dt; if (st.x < -40) { st.x = W + rr(0, 40); st.y = Math.random() * H; }
        g.globalAlpha = st.a * (0.75 + 0.25 * Math.sin(t * 2 + st.tw));
        g.fillStyle = '#fff';
        if (spd > 3) { g.fillRect(st.x, st.y, st.sp * spd * 0.035 + st.s, st.s * 0.8); }
        else g.fillRect(st.x, st.y, st.s, st.s);
      }
      g.globalAlpha = 1;
      // the moon (kid goal)
      if (kid && v) {
        const k = v.st === 'end' && v.win ? 1 + cl(winT / 3, 0, 1) * 0.6 : ((sec - 1) + (v.need ? cl(v.prog / v.need, 0, 1) : 0)) / KID_GOAL;
        const mr = H * (0.05 + 0.16 * k), mx = W * (0.93 - 0.12 * k), my = H * 0.36;
        const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
        mg.addColorStop(0, '#fffbe6'); mg.addColorStop(1, '#e8d27a');
        g.shadowColor = 'rgba(255,240,170,.8)'; g.shadowBlur = 30; g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.shadowBlur = 0;
        g.fillStyle = 'rgba(190,160,80,.45)';
        [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.22], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.1]].forEach(([a, b, c]) => { g.beginPath(); g.arc(mx + a * mr, my + b * mr, c * mr, 0, 7); g.fill(); });
      }
      // ship
      const sp = shipPos();
      if (v && v.st === 'end' && !v.win) {
        endT += dt;
        if (!boomDone) { boomDone = true; burst(sp.x, sp.y, 140, ['#ffd166', '#ff7a45', '#ff4f58', '#fff', '#9aa3c8'], sp.s * 4, 1.8); shake = 0.8; api.sfx('boom'); }
        if (endT < 0.25) drawShip(sp.x, sp.y, sp.s, 0);
      } else {
        if (v && v.st === 'end') winT += dt;
        if (v && v.hull < 40 && Math.random() < dt * 12) parts.push({ x: sp.x - sp.s * 0.3 + rr(-20, 20), y: sp.y - sp.s * 0.3, vx: -60 - rr(0, 40), vy: -rr(10, 40), l: 1.2, L: 1.2, c: 'smoke', r: rr(8, 16) });
        drawShip(sp.x, sp.y, sp.s, v ? v.hull : 100);
      }
      // meteor shower + shield
      const met = v && v.ev && v.ev.k === 'met';
      if (met) {
        const f = cl(v.ev.taps / v.ev.need, 0, 1), R = sp.s * 1.7;
        g.strokeStyle = `rgba(120,210,255,${0.25 + 0.6 * f})`; g.lineWidth = 4 + 6 * f; g.beginPath(); g.arc(sp.x, sp.y, R, 0, 7); g.stroke();
        g.fillStyle = `rgba(120,210,255,${0.06 + 0.12 * f})`; g.fill();
        rockT -= dt;
        if (rockT <= 0) { rockT = rr(0.15, 0.35); const y0 = sp.y + rr(-H * 0.4, H * 0.4); rocks.push({ x: W + 40, y: y0, vx: -rr(320, 520), vy: (sp.y - y0) * rr(0.3, 0.7), r: rr(12, 28), a: 0, blk: Math.random() < 0.25 + f * 0.75 }); }
      }
      for (let i = rocks.length - 1; i >= 0; i--) {
        const r = rocks[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.a += dt * 3;
        if (r.blk && met && Math.hypot(r.x - sp.x, r.y - sp.y) < sp.s * 1.7 + r.r) { burst(r.x, r.y, 14, ['#ffd166', '#bfe9ff', '#fff'], 220, 0.6); rocks.splice(i, 1); continue; }
        if (r.x < -60) { rocks.splice(i, 1); continue; }
        const tg = g.createLinearGradient(r.x, r.y, r.x + r.r * 4, r.y - r.vy / r.vx * r.r * 4);
        tg.addColorStop(0, 'rgba(255,170,60,.7)'); tg.addColorStop(1, 'rgba(255,90,40,0)');
        g.fillStyle = tg; g.beginPath(); g.moveTo(r.x, r.y - r.r * 0.7); g.lineTo(r.x + r.r * 4.5, r.y - r.vy / r.vx * r.r * 4.5); g.lineTo(r.x, r.y + r.r * 0.7); g.fill();
        g.fillStyle = '#8a6b5a'; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.fill();
        g.fillStyle = '#6a4f42'; g.beginPath(); g.arc(r.x - r.r * 0.3 * Math.cos(r.a), r.y - r.r * 0.25, r.r * 0.28, 0, 7); g.fill();
      }
      // glitch sparks
      if (v && v.ev && v.ev.k === 'gl' && Math.random() < dt * 20) burst(sp.x + rr(-sp.s, sp.s), sp.y + rr(-sp.s * 0.4, sp.s * 0.4), 5, ['#ffe14d', '#7af0ff'], 160, 0.35);
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97;
        const k = p.l / p.L;
        if (p.c === 'smoke') { g.fillStyle = `rgba(120,120,140,${0.35 * k})`; g.beginPath(); g.arc(p.x, p.y, p.r * (2 - k), 0, 7); g.fill(); }
        else { g.globalAlpha = k; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, 7); g.fill(); g.globalAlpha = 1; }
      }
      // lights out
      if (v && v.ev && v.ev.k === 'dk') {
        const lx = W * (0.5 + 0.35 * Math.sin(t * 0.9)), ly = H * (0.5 + 0.2 * Math.sin(t * 1.7));
        const dg = g.createRadialGradient(lx, ly, H * 0.08, lx, ly, H * 0.3);
        dg.addColorStop(0, 'rgba(2,3,12,0)'); dg.addColorStop(1, 'rgba(2,3,12,.93)'); g.fillStyle = dg; g.fillRect(0, 0, W, H);
      }
      // timer bars on the cards
      if (v && v.pl) cards.forEach((c, i) => {
        const pl = v.pl[i], ins = pl && pl.ins;
        let f = 0; if (ins && v.st === 'go') f = cl((v.pz ? ins.t : ins.t - (now - recvT) / 1000) / ins.T, 0, 1);
        if (Math.abs(f - c.f) > 0.003) { c.f = f; c.bar.style.width = (f * 100).toFixed(1) + '%'; const cn = f < 0.25 ? 'hot' : f < 0.5 ? 'warn' : ''; if (c.bar.className !== cn) c.bar.className = cn; }
      });
    }
    raf = requestAnimationFrame(frame);

    function buildCards() {
      plKey = V.ids.join(',');
      el.pl.innerHTML = V.ids.map((id, i) => { const p = api.player(id); return `<div class="sp-pc" data-i="${i}"><div class="sp-pb"><div class="sp-pbt idle">…</div><div class="sp-bar"><i></i></div></div><img class="sp-pa" alt="" src="${api.avatar(p, 128)}"><div class="sp-pn">${esc(p ? p.name : '?')}<small></small></div></div>`; }).join('');
      cards = [...el.pl.querySelectorAll('.sp-pc')].map(e => ({ e, t: e.querySelector('.sp-pbt'), bar: e.querySelector('.sp-bar i'), d: e.querySelector('.sp-pn small'), key: '', f: -1, lr: null, fxT: 0 }));
    }
    function drawCards(a) {
      if (V.ids.join(',') !== plKey) buildCards();
      const sh = new Set((V.sh || []).map(s => s.p));
      V.pl.forEach((pl, i) => {
        const c = cards[i]; if (!c) return;
        const ins = pl.ins;
        const key = (ins ? ins.id + ':' + ins.g : '-') + (V.st === 'go' ? '' : V.st) + pl.off;
        if (key !== c.key) {
          c.key = key;
          if (ins && V.st === 'go') {
            c.t.className = 'sp-pbt';
            c.t.innerHTML = kid ? `<div class="sp-pk"><span class="sp-kic" style="--cc:${ins.co}">${ins.ic}</span>${kidAct(ins)}</div><div class="sp-pkt">${esc(ins.txt)}</div>` : esc(ins.txt) + (ins.k > 1 ? ` <small style="color:#6b7196">(${ins.g}/${ins.k})</small>` : '');
          } else { c.t.className = 'sp-pbt idle'; c.t.textContent = pl.off ? '🤖 自動駕駛中' : V.st === 'jump' ? '🚀 跳躍中…' : '…'; }
        }
        c.d.textContent = pl.d ? ` ✅${pl.d}` : '';
        c.e.classList.toggle('off', !!pl.off);
        c.e.classList.toggle('sh', sh.has(i));
        if (pl.lr && (!c.lr || c.lr.id !== pl.lr.id)) {
          if (c.lr !== null || a) { c.e.classList.remove('ok', 'bad'); void c.e.offsetWidth; c.e.classList.add(pl.lr.ok ? 'ok' : 'bad'); c.fxT = performance.now(); }
          c.lr = pl.lr;
        } else if (c.fxT && performance.now() - c.fxT > 900) { c.fxT = 0; c.e.classList.remove('ok', 'bad'); }
        if (!c.lr && pl.lr) c.lr = pl.lr;
      });
    }
    function drawHud() {
      el.sec.innerHTML = kid ? `第 <b>${V.sec}</b> / ${V.goal} 區` : `第 <b>${V.sec}</b> 區`;
      el.hull.classList.toggle('mid', V.hull < 60 && V.hull >= 30); el.hull.classList.toggle('low', V.hull < 30);
      el.hullI.style.width = V.hull + '%'; el.hullB.textContent = V.hull + '%';
      el.progI.style.width = (V.need ? cl(V.prog / V.need, 0, 1) * 100 : 0) + '%'; el.progB.textContent = `${V.prog}/${V.need}`;
      el.ok.textContent = V.ok;
      if (el.rt) el.rt.textContent = robot;
      // banner
      const e = V.ev; let bk = '', bh = '', red = false;
      if (e && V.st === 'go') {
        if (e.k === 'met') { bk = 'met'; red = true; bh = `☄️ 流星雨！${kid ? '大家快拍藍色按鈕！' : '全隊狂拍護盾！'}<div class="sp-mbar"><i style="width:${cl(e.taps / e.need, 0, 1) * 100}%"></i></div>`; }
        else if (e.k === 'gl') { bk = 'gl' + e.n; red = true; bh = `⚡ 面板當機！${(e.who || []).map(i => { const p = api.player(V.ids[i]); return esc(p ? p.name : '?'); }).join('、')} 的按鈕亂掉了`; }
        else if (e.k === 'dk') { bk = 'dk' + e.n; bh = '💡 熄燈了！用手指當手電筒找按鈕'; }
      }
      if (bk !== banKey || bk === 'met') {
        if (bk !== banKey) { banKey = bk; el.ban.hidden = !bk; el.ban.className = 'sp-tvban' + (red ? ' red' : ''); el.ban.innerHTML = bh; }
        else { const i = el.ban.querySelector('.sp-mbar i'); if (i) i.style.width = cl(e.taps / e.need, 0, 1) * 100 + '%'; }
      }
      // big centre text
      let gk = '', gh = '';
      if (V.st === 'jump') { const n = Math.max(1, Math.ceil(V.jt)); gk = 'j' + V.sec + n; gh = V.first ? `🚀 準備起飛！<small>${n}</small>` : `🚀 跳躍到第 ${V.sec} 區！<small>${kid ? '往月亮前進 🌕' : '指令更快、控制器更多！'}</small>`; }
      else if (V.st === 'end') { gk = 'end'; gh = V.win ? `🌕 抵達月球！<small>完成 ${V.ok} 個指令</small>` : `💥 太空船爆炸了…<small>到達第 ${V.sec} 區・完成 ${V.ok} 個指令</small>`; }
      if (gk !== bigKey) { bigKey = gk; el.big.hidden = !gk; el.big.innerHTML = gh; }
    }
    return {
      view(v) {
        if (!v || !v.pl) return;
        const a = V; V = v; recvT = performance.now();
        if (a) {
          if (v.hit > a.hit) { shake = 0.45; api.sfx('buzz'); robot = pick(ROBOT.bad); }
          if (v.ok > a.ok) robot = pick(ROBOT.ok);
          if (v.st !== a.st) {
            if (v.st === 'jump') { api.sfx('whoosh'); robot = pick(ROBOT.jump); }
            if (v.st === 'go') { api.sfx('go'); robot = pick(ROBOT.go); }
            if (v.st === 'end' && v.win) api.sfx('win');
          }
          if (v.ev && (!a.ev || a.ev.n !== v.ev.n) && v.ev.k === 'met') { api.sfx('boom'); robot = ROBOT.met[0]; }
          if (v.er && (!a.er || a.er.n !== v.er.n) && v.er.k === 'met') { if (v.er.ok) { api.sfx('star'); robot = ROBOT.metOk[0]; } else shake = 0.6; }
        }
        drawHud(); drawCards(a);
      },
      destroy() { cancelAnimationFrame(raf); }
    };
  }
})();

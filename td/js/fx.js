'use strict';
// 守塔奇兵：畫面特效（只在畫面層，跟遊戲邏輯無關，用自己的亂數）。
// 模擬層透過 Hook.fx 通知事件：爆炸、擊倒、建造…；這裡負責粒子、地面痕跡、死亡動畫、金幣飛到上方、環境生物。

const FX = (() => {
  const R = Math.random, TAU = Math.PI * 2;
  let G = null;
  let parts = [], decals = [], deaths = [], coins = [], lights = [], ghosts = [], amb = [], clouds = [];
  const st = { storm: 0, stormA: 0, castleHit: 0, freeze: 0, meteorSky: 0, bossIntro: null, flashW: 0, ambT: 0, low: false };
  let cap = 320;
  function reset(g) {
    G = g; parts = []; decals = []; deaths = []; coins = []; lights = []; ghosts = []; amb = []; clouds = [];
    st.castleHit = 0; st.freeze = 0; st.meteorSky = 0; st.bossIntro = null; st.flashW = 0; st.ambT = 0;
    if (g) { const rr = mkRng(g.L.seed * 13 + 1); for (let i = 0; i < 3; i++) clouds.push({ x: rr() * COLS * 1.4 - 2, y: rr() * ROWS, sc: 0.8 + rr() * 0.6, sp: 0.18 + rr() * 0.12, v: i }); }
  }
  function setLow(low) { st.low = low; cap = low ? 200 : 320; }
  function P(o) { if (parts.length >= cap) parts.shift(); parts.push(o); return o; }
  function part(k, x, y, h, vx, vy, vh, life, sz, c, extra) {
    const o = { k, x, y, h, vx, vy, vh, life, max: life, sz, c, rot: R() * TAU, vr: (R() - 0.5) * 8 };
    if (extra) Object.assign(o, extra);
    return P(o);
  }
  function decal(k, x, y, r, life, extra) {
    if (decals.length > 70) decals.shift();
    const o = { k, x, y, r, life, max: life, rot: R() * TAU, v: Math.floor(R() * 3) };
    if (extra) Object.assign(o, extra);
    decals.push(o); return o;
  }
  function light(x, y, h, r, c, life, a) { if (lights.length > 40) lights.shift(); lights.push({ x, y, h, r, c, life, max: life, a: a || 1 }); }
  function shake(a) { Hook.shake(a); }

  // ───────── 事件 ─────────
  function on(name, g, a, b, c, d, e) {
    if (g !== G) return;
    // 頭目放招、祭司補血：畫面層播放 cast 動畫（只是畫面用的計時，不影響模擬）
    if ((name === 'stomp' || name === 'ink' || name === 'summon' || name === 'dash' || name === 'burrow' || name === 'heal') && a && Beasts.BOX[a.k] && (Beasts.BOX[a.k].boss || Beasts.BOX[a.k].cast)) a._castT = 0.9;
    switch (name) {
      case 'boom': boom(a, b, c, d, e); break;
      case 'meteor': {
        decal('crater', a, b, c * 0.62, 7);
        for (let i = 0; i < 14; i++) { const an = R() * TAU, v = 1 + R() * 3; part('debris', a, b, 0.1, Math.cos(an) * v, Math.sin(an) * v, 3 + R() * 3, 1 + R() * 0.5, 0.05 + R() * 0.05, R() < 0.5 ? '#4a3a30' : '#7a5a40', { g: 12 }); }
        for (let i = 0; i < 8; i++) { const an = R() * TAU, v = R() * 1.2; part('fire', a, b, 0.2, Math.cos(an) * v, Math.sin(an) * v, 1 + R(), 0.8 + R() * 0.5, 0.35 + R() * 0.3, '#ff8a2a'); }
        light(a, b, 0.3, 3.2, '#ff8a3a', 0.8, 1);
        st.flashW = Math.max(st.flashW, 0.25);
        // 附近敵人著火
        for (const en of G.enemies) if (en.alive && dist2(en.x, en.y, a, b) < (c + 0.6) ** 2) en._burn = 2.2;
        break;
      }
      case 'meteorCast': st.meteorSky = 1.4; break;
      case 'freeze':
        st.freeze = 1.8;
        for (let i = 0; i < 40; i++) part('snow', R() * COLS, R() * ROWS, 2 + R() * 3, (R() - 0.5) * 0.3, 0.2, -0.8 - R() * 0.5, 2 + R(), 0.05 + R() * 0.04, '#ffffff');
        for (const en of G.enemies) if (en.alive && !en.boss) decal('frost', en.x, en.y, 0.45 + en.r, 4);
        break;
      case 'kill': kill(a); break;
      case 'leak':
        st.castleHit = 0.6;
        for (let i = 0; i < 10; i++) { const an = R() * TAU, v = 0.5 + R() * 1.5; part('debris', G.exitPt.x, G.exitPt.y, 0.8 + R() * 0.6, Math.cos(an) * v, Math.sin(an) * v, 1 + R() * 2, 1, 0.04 + R() * 0.04, '#c8c0b0', { g: 9 }); }
        for (let i = 0; i < 4; i++) part('smoke', G.exitPt.x + (R() - 0.5) * 0.6, G.exitPt.y, 0.6 + R() * 0.6, (R() - 0.5) * 0.3, -0.2, 0.4, 1.2, 0.3, '#8a8478');
        break;
      case 'fire': fire(a, b); break;
      case 'hit': hit(a, b); break;
      case 'aura': {
        const t = a, r = t.st.range;
        for (let i = 0; i < (st.low ? 4 : 8); i++) { const an = R() * TAU, rr = Math.sqrt(R()) * r; part('mist', t.cx + Math.cos(an) * rr, t.cy + Math.sin(an) * rr, 0.1, -Math.sin(an) * 0.6, Math.cos(an) * 0.6, 0.05, 0.9, 0.35 + R() * 0.3, '#e8f8ff'); }
        break;
      }
      case 'build': a._bt = -1; a._fxBuild = true; for (let i = 0; i < 8; i++) { const an = R() * TAU; part('smoke', a.cx + Math.cos(an) * 0.35, a.cy + Math.sin(an) * 0.2, 0.05, Math.cos(an) * 0.5, Math.sin(an) * 0.3, 0.3, 0.8, 0.22, '#d8c8a8'); } break;
      case 'upgrade':
        a._ut = -1;
        for (let i = 0; i < 16; i++) { const an = R() * TAU, v = 0.3 + R() * 0.6; part('glint', a.cx + Math.cos(an) * 0.3, a.cy + Math.sin(an) * 0.15, 0.1 + R() * 0.8, Math.cos(an) * v * 0.3, Math.sin(an) * v * 0.2, 1 + R() * 1.2, 0.9 + R() * 0.5, 0.05, a.tier === 3 ? '#ffe27a' : '#ffffff'); }
        light(a.cx, a.cy, 0.8, 2, '#ffe9a0', 0.8, 1);
        break;
      case 'sell':
        ghosts.push({ k: a.k, tier: a.tier, spec: a.spec, x: a.cx, y: a.cy, t: 0, dur: 0.7 });
        for (let i = 0; i < 14; i++) { const an = R() * TAU, v = 0.4 + R() * 1.2; part('debris', a.cx, a.cy, 0.3 + R() * 0.6, Math.cos(an) * v, Math.sin(an) * v, 1 + R() * 2, 0.9, 0.04 + R() * 0.04, R() < 0.5 ? '#b8b0a2' : '#9a6a3a', { g: 9 }); }
        for (let i = 0; i < 6; i++) part('smoke', a.cx + (R() - 0.5) * 0.5, a.cy + (R() - 0.5) * 0.3, 0.2, (R() - 0.5) * 0.4, (R() - 0.5) * 0.3, 0.5, 1, 0.3, '#c8b8a0');
        break;
      case 'mine': {
        const t = a, n = Math.min(8, 2 + Math.round(b / 20));
        for (let i = 0; i < n; i++) coin(t.cx, t.cy, 0.4, i * 0.05);
        break;
      }
      case 'boss': st.bossIntro = { e: a, t: 0 }; shake(0.8); break;
      case 'stomp': {
        decal('crack', a.x, a.y, 1.4, 4);
        for (let i = 0; i < 18; i++) { const an = i / 18 * TAU; part('smoke', a.x + Math.cos(an) * 0.6, a.y + Math.sin(an) * 0.6, 0.05, Math.cos(an) * 1.8, Math.sin(an) * 1.8, 0.2, 0.8, 0.28, '#b8a07a'); }
        for (let i = 0; i < 10; i++) { const an = R() * TAU, v = 1 + R() * 2; part('debris', a.x, a.y, 0.1, Math.cos(an) * v, Math.sin(an) * v, 2 + R() * 2, 1, 0.05, '#8a7058', { g: 12 }); }
        break;
      }
      case 'summon': decal('rune', a.x, a.y, 1.0, 1.6); light(a.x, a.y, 0.2, 2, '#b38aff', 1.2, 1); break;
      case 'heal': for (let i = 0; i < 8; i++) { const an = R() * TAU, rr = R() * 1.2; part('plus', a.x + Math.cos(an) * rr, a.y + Math.sin(an) * rr, 0.3, 0, 0, 0.9, 0.9, 0.06, '#7dffb0'); } break;
      case 'dash': for (let i = 0; i < 10; i++) part('fire', a.x, a.y, 0.75, (R() - 0.5), (R() - 0.5), 0.2, 0.6, 0.3, '#ff7a2a'); break;
      case 'tp': { const e = a; for (const [px, py] of [[b, c], [e.x, e.y]]) { light(px, py, 0.4, 1.6, '#c8a8ff', 0.4, 1); for (let i = 0; i < 8; i++) { const an = R() * TAU; part('glint', px + Math.cos(an) * 0.3, py + Math.sin(an) * 0.2, 0.2 + R() * 0.5, 0, 0, 0.8, 0.6, 0.05, '#e0c8ff'); } } break; }
      case 'revive': for (let i = 0; i < 10; i++) part('smoke', a.x + (R() - 0.5) * 0.4, a.y + (R() - 0.5) * 0.3, 0.3, (R() - 0.5) * 0.4, (R() - 0.5) * 0.3, 0.4, 0.9, 0.18, '#e8d8a8'); light(a.x, a.y, 0.4, 1.4, '#ffd36b', 0.5, 1); break;
      case 'burrow': decal('crack', a.x, a.y, 1.0, 2); for (let i = 0; i < 16; i++) { const an = R() * TAU, v = 1 + R() * 2; part('debris', a.x, a.y, 0.1, Math.cos(an) * v, Math.sin(an) * v, 2 + R() * 2, 1, 0.05, R() < 0.5 ? '#5a5a74' : '#9ef0ff', { g: 12 }); } shake(0.4); break;
      case 'ink':
        decal('ink', a.x, a.y, 2.0, 3.5);
        for (let i = 0; i < 20; i++) { const an = i / 20 * TAU; part('smoke', a.x + Math.cos(an) * 0.5, a.y + Math.sin(an) * 0.4, 0.2, Math.cos(an) * 2, Math.sin(an) * 1.5, 0.3, 1, 0.3, '#2a1a3a'); }
        break;
      case 'storm': st.storm = a ? 1 : 0; break;
      // ── 英雄 ──
      case 'heroMove': for (let i = 0; i < 4; i++) part('smoke', a.x + (R() - 0.5) * 0.3, a.y + (R() - 0.5) * 0.2, 0.05, (R() - 0.5) * 0.4, (R() - 0.5) * 0.3, 0.2, 0.5, 0.12, '#d8c8a8'); break;
      case 'heroLevel':
        for (let i = 0; i < 26; i++) { const an = R() * TAU, v = 0.3 + R() * 0.8; part('glint', a.x + Math.cos(an) * 0.3, a.y + Math.sin(an) * 0.15, 0.1 + R() * 0.9, Math.cos(an) * v * 0.3, Math.sin(an) * v * 0.2, 1.2 + R() * 1.5, 1 + R() * 0.6, 0.05, R() < 0.5 ? '#ffe27a' : '#ffffff'); }
        light(a.x, a.y, 0.8, 2.4, '#ffe9a0', 1.2, 1); decal('shock', a.x, a.y, 1.2, 0.5);
        break;
      case 'heroDie':
        for (let i = 0; i < 10; i++) part('smoke', a.x + (R() - 0.5) * 0.4, a.y + (R() - 0.5) * 0.3, 0.3, (R() - 0.5) * 0.5, (R() - 0.5) * 0.3, 0.5, 1 + R() * 0.5, 0.25, '#d8d2e8');
        for (let i = 0; i < 8; i++) part('glint', a.x, a.y, 0.4 + R() * 0.4, (R() - 0.5) * 0.6, (R() - 0.5) * 0.4, 1 + R(), 1.2, 0.05, '#bfe0ff');
        ghosts.push({ hero: a.id, x: a.x, y: a.y, t: 0, dur: 1.4, sf: a._sf || 1 });
        break;
      case 'heroRevive':
        light(a.x, a.y, 0.6, 2, '#ffe9a0', 1, 1);
        for (let i = 0; i < 16; i++) { const an = R() * TAU; part('glint', a.x + Math.cos(an) * 0.35, a.y + Math.sin(an) * 0.2, R() * 0.3, 0, 0, 1.5 + R(), 0.9, 0.05, '#fff4c0'); }
        break;
      case 'heroHit': { const e = b; part('flash', e.x, e.y, 0.35, 0, 0, 0, 0.1, 0.28, '#ffffff'); break; }
      case 'heroSkill': {
        const H = a, k = b;
        if (k === 'whirl') { for (let i = 0; i < 14; i++) { const an = i / 14 * TAU; part('smoke', H.x + Math.cos(an) * 0.7, H.y + Math.sin(an) * 0.5, 0.05, Math.cos(an) * 1.4, Math.sin(an) * 1.0, 0.2, 0.6, 0.18, '#d8cbb0'); } shake(0.2); }
        else if (k === 'wall') { decal('shock', H.x, H.y, 1.8, 0.6); light(H.x, H.y, 0.5, 2.4, '#ffe27a', 0.6, 1); for (let i = 0; i < 10; i++) part('plus', H.x + (R() - 0.5) * 0.6, H.y + (R() - 0.5) * 0.4, 0.4 + R() * 0.5, 0, 0, 0.9, 0.9, 0.06, '#7dffb0'); shake(0.3); }
        else if (k === 'nova') { decal('frost', H.x, H.y, 1.7, 2.5); light(H.x, H.y, 0.4, 2.4, '#9fe6ff', 0.6, 1); for (let i = 0; i < 22; i++) { const an = R() * TAU, v = 1 + R() * 2; part('ice', H.x, H.y, 0.3, Math.cos(an) * v, Math.sin(an) * v, 1 + R() * 1.5, 0.7, 0.05 + R() * 0.03, '#d9f7ff', { g: 7 }); } }
        else if (k === 'storm' || k === 'pierce' || k === 'rain') light(H.x, H.y, 0.8, 1.4, k === 'storm' ? '#bfe0ff' : '#ffe9a0', 0.4, 1);
        break;
      }
      case 'rainHit': for (let i = 0; i < 3; i++) part('smoke', a + (R() - 0.5) * 0.5, b + (R() - 0.5) * 0.4, 0.05, 0, 0, 0.3, 0.6, 0.14, '#d8c8a8'); if (R() < 0.5) decal('arrow', a + (R() - 0.5) * 0.6, b + (R() - 0.5) * 0.4, 0.25, 1.6, { ang: 1.2 }); break;
      case 'stormHit': light(a, b, 0.5, 2.2, '#bfe0ff', 0.25, 1); part('flash', a, b, 0.3, 0, 0, 0, 0.14, 0.5, '#e8f4ff'); decal('crack', a, b, 0.5, 1.5); break;
    }
  }
  function boom(x, y, r, big, h) {
    const n = big ? 7 : 4;
    light(x, y, h + 0.3, r * 2.6, '#ffb347', 0.45, 1);
    part('flash', x, y, h + 0.25, 0, 0, 0, 0.16, r * 0.9, '#ffe8b0');
    for (let i = 0; i < n; i++) { const an = R() * TAU, v = R() * r * 1.6; part('fire', x, y, h + 0.15, Math.cos(an) * v, Math.sin(an) * v, 0.6 + R() * 1.2, 0.35 + R() * 0.25, (0.22 + R() * 0.18) * (big ? 1.3 : 1) * Math.max(0.7, r), R() < 0.4 ? '#ffe27a' : '#ff8a2a'); }
    for (let i = 0; i < (st.low ? 3 : n); i++) { const an = R() * TAU, v = R() * r * 0.8; part('smoke', x + Math.cos(an) * r * 0.3, y + Math.sin(an) * r * 0.3, h + 0.2, Math.cos(an) * v, Math.sin(an) * v, 0.5 + R() * 0.4, 1 + R() * 0.6, 0.25 + R() * 0.15, R() < 0.5 ? '#6d6258' : '#8a7e70'); }
    if (h < 0.2) {
      for (let i = 0; i < (big ? 10 : 5); i++) { const an = R() * TAU, v = 1 + R() * 2.5; part('debris', x, y, 0.1, Math.cos(an) * v, Math.sin(an) * v, 2 + R() * 3, 0.9, 0.035 + R() * 0.04, R() < 0.5 ? '#5a4a3a' : '#8a7058', { g: 12 }); }
      decal('scorch', x, y, r * (big ? 0.8 : 0.6), big ? 3 : 1.8);
      decal('shock', x, y, r * 1.2, 0.35);
    }
    if (big) shake(0.25);
  }
  function coin(x, y, h, delay) {
    const an = R() * TAU, v = 0.4 + R() * 0.8;
    part('coin', x, y, h, Math.cos(an) * v, Math.sin(an) * v * 0.6, 2.2 + R() * 1.2, 0.55 + (delay || 0), 0.07, '#ffd84a', { g: 9, toHud: true });
  }
  function kill(e) {
    const face = e._face || 1;
    deaths.push({ k: e.k, x: e.x, y: e.y, fly: e.fly, face, r: e.r, boss: e.boss, f: e._f || 0, t: 0, dur: e.boss ? 1.6 : e.fly ? 0.75 : 0.7 });
    const col = enemyColor(e.k);
    const h = e.fly ? 0.75 : 0.25;
    for (let i = 0; i < (e.boss ? 12 : 3); i++) part('smoke', e.x + (R() - 0.5) * 0.3, e.y + (R() - 0.5) * 0.2, h, (R() - 0.5) * 0.5, (R() - 0.5) * 0.3, 0.4, 0.7 + R() * 0.4, (e.boss ? 0.4 : 0.18) + R() * 0.1, '#e8e2d8');
    if (e.k === 'slime' || e.k === 'mini' || e.k === 'splitter') decal('goo', e.x, e.y, 0.32 + e.r, 3, { c: col });
    if (e.k === 'skeleton') for (let i = 0; i < 4; i++) { const an = R() * TAU; part('debris', e.x, e.y, 0.3, Math.cos(an), Math.sin(an), 2 + R() * 2, 1.2, 0.05, '#efe9d8', { g: 10 }); }
    if (e.k === 'golem' || e.k === 'bossGolem') for (let i = 0; i < 8; i++) { const an = R() * TAU, v = 0.5 + R() * 1.5; part('debris', e.x, e.y, 0.4, Math.cos(an) * v, Math.sin(an) * v, 2 + R() * 2, 1.2, 0.06, '#a89a80', { g: 10 }); }
    const n = e.boss ? 10 : e.d && e.d.bounty >= 12 ? 3 : e.d && e.d.bounty >= 6 ? 2 : 1;
    for (let i = 0; i < n; i++) coin(e.x, e.y, h, i * 0.04);
    if (e.boss) { light(e.x, e.y, 0.5, 4, '#ffe9a0', 1.6, 1); }
  }
  function fire(t, e) {
    const k = t.k, tier = t.tier, sp = t.spec;
    const top = Art.topH(k, tier) / Art.HS;
    const ca = Math.cos(t.ang), sa = Math.sin(t.ang);
    if (k === 'cannon') {
      const L = 0.35 + tier * 0.05;
      const mx = t.cx + ca * L, my = t.cy + sa * L;
      for (let i = 0; i < (st.low ? 2 : 4); i++) part('smoke', mx, my, top, ca * (0.4 + R() * 0.5), sa * (0.4 + R() * 0.5), 0.3 + R() * 0.3, 0.7 + R() * 0.4, 0.14 + R() * 0.08, '#d8d4cc');
      part('flash', mx, my, top, 0, 0, 0, 0.1, 0.35, '#fff4c8');
      light(mx, my, top, 1.4, '#ffcf7a', 0.2, 1);
    } else if (k === 'sniper') {
      const mx = t.cx + ca * 0.35, my = t.cy + sa * 0.35;
      part('flash', mx, my, top, 0, 0, 0, 0.08, 0.25, '#fff4c8');
      part('smoke', mx, my, top, ca * 0.5, sa * 0.5, 0.3, 0.6, 0.1, '#d8d4cc');
      light(mx, my, top, 1.2, '#ffe9a0', 0.15, 1);
    } else if (k === 'magic') {
      light(t.cx, t.cy, top + 0.2, 1.4, sp === 1 ? '#ff7ee0' : sp === 0 ? '#8fd0ff' : '#c08bff', 0.3, 1);
      if (sp === 0) part('flash', t.cx, t.cy, top + 0.25, 0, 0, 0, 0.12, 0.4, '#d8f0ff');
    } else if (k === 'frost') {
      part('mist', t.cx, t.cy, top + 0.2, (R() - 0.5) * 0.3, (R() - 0.5) * 0.2, -0.1, 0.8, 0.2, '#e8f8ff');
    }
    void e;
  }
  function hit(p, tg) {
    if (p.k === 'arrow') {
      const gx = tg ? tg.x : p.tx, gy = tg ? tg.y : p.ty;
      if (!tg || (!tg.fly && R() < 0.35)) decal('arrow', gx + (R() - 0.5) * 0.3, gy + (R() - 0.5) * 0.2, 0.25, 1.4, { ang: p.ang || 0 });
      if (p.crit) part('flash', gx, gy, 0.3, 0, 0, 0, 0.12, 0.3, '#ffcf7a');
    } else if (p.k === 'shard') {
      const h = tg && tg.fly ? 0.75 : 0.25;
      for (let i = 0; i < (st.low ? 3 : 6); i++) { const an = R() * TAU, v = 1 + R() * 1.5; part('ice', p.tx, p.ty, h, Math.cos(an) * v, Math.sin(an) * v, 1 + R() * 1.5, 0.5, 0.05 + R() * 0.03, '#d9f7ff', { g: 7 }); }
      part('flash', p.tx, p.ty, h, 0, 0, 0, 0.14, 0.35 + (p.splash || 0) * 0.3, '#bdefff');
      if (p.splash && (!tg || !tg.fly)) decal('frost', p.tx, p.ty, p.splash * 0.9, 1.6);
      light(p.tx, p.ty, h, 1, '#9fe6ff', 0.25, 1);
    } else if (p.k === 'orb') {
      const h = tg && tg.fly ? 0.75 : 0.25;
      part('flash', p.tx, p.ty, h, 0, 0, 0, 0.16, 0.45, '#e2c8ff');
      for (let i = 0; i < (st.low ? 3 : 6); i++) { const an = R() * TAU, v = 0.6 + R(); part('glint', p.tx, p.ty, h, Math.cos(an) * v, Math.sin(an) * v, (R() - 0.3), 0.5, 0.05, '#e8d4ff'); }
      light(p.tx, p.ty, h, 1.2, '#c08bff', 0.3, 1);
    }
  }

  // ───────── 更新 ─────────
  function update(dt, time) {
    if (!G) return;
    if (st.castleHit > 0) st.castleHit -= dt;
    if (st.freeze > 0) st.freeze -= dt;
    if (st.meteorSky > 0) st.meteorSky -= dt;
    if (st.flashW > 0) st.flashW -= dt;
    st.stormA += ((G && G.stormOn ? 1 : 0) - st.stormA) * Math.min(1, dt * 1.5);
    if (st.bossIntro) { st.bossIntro.t += dt; if (st.bossIntro.t > 3.2) st.bossIntro = null; }
    const keep = [];
    for (const p of parts) {
      p.life -= dt; if (p.life <= 0) { if (p.toHud) coins.push({ x: p.x, y: p.y, h: p.h, t: 0 }); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt; p.rot += p.vr * dt;
      switch (p.k) {
        case 'debris': case 'coin': case 'ice':
          p.vh -= (p.g || 9) * dt;
          if (p.h < 0) { p.h = 0; p.vh *= -0.35; p.vx *= 0.5; p.vy *= 0.5; p.vr *= 0.5; }
          break;
        case 'smoke': case 'mist': p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5; break;
        case 'fire': p.vx *= 1 - dt * 3; p.vy *= 1 - dt * 3; break;
        case 'leaf': p.vx = Math.sin(time * 2 + p.rot) * 0.4 + 0.2; if (p.h < 0) { p.h = 0; p.vh = 0; p.vx = p.vy = 0; } break;
        case 'snow': if (p.h < 0) { p.h = 0; p.vh = 0; p.vx = p.vy = 0; } else p.vx = Math.sin(time + p.rot) * 0.15 + (p.wind || 0); break;
        case 'firefly': p.vx += (R() - 0.5) * dt * 2; p.vy += (R() - 0.5) * dt * 2; p.vh = Math.sin(time * 2 + p.rot) * 0.15; p.vx *= 0.98; p.vy *= 0.98; break;
        case 'fly': p.vx += (R() - 0.5) * dt * 6; p.vy += (R() - 0.5) * dt * 6; p.vh = Math.sin(time * 6 + p.rot) * 0.4; p.vx *= 0.96; p.vy *= 0.96; break;
        case 'bird': break;
        case 'bubble': p.vx = Math.sin(time * 2 + p.rot) * 0.15; break;
        case 'glint': p.vx *= 0.96; p.vy *= 0.96; break;
      }
      keep.push(p);
    }
    parts = keep;
    decals = decals.filter(d => (d.life -= dt) > 0);
    lights = lights.filter(l => (l.life -= dt) > 0);
    deaths = deaths.filter(d => (d.t += dt) < d.dur);
    ghosts = ghosts.filter(g => (g.t += dt) < g.dur);
    coins = coins.filter(c => (c.t += dt) < 0.7);
    for (const c of clouds) { c.x += c.sp * dt; if (c.x > COLS + 4) { c.x = -5; c.y = R() * ROWS; } }
    ambient(dt, time);
  }
  // 環境生物
  function ambient(dt, time) {
    const th = G.L.theme;
    st.ambT -= dt;
    if (st.ambT > 0) return;
    st.ambT = 0.12;
    const count = k => { let n = 0; for (const p of parts) if (p.k === k) n++; return n; };
    const rx = () => R() * COLS, ry = () => R() * ROWS;
    const lim = st.low ? 0.6 : 1;
    if (th === 'snow') { if (count('snow') < 70 * lim) part('snow', rx(), ry(), 3 + R() * 2, 0, 0.15, -0.6 - R() * 0.3, 6, 0.03 + R() * 0.035, '#ffffff', { wind: 0.25 }); }
    if (th === 'volcano') { if (count('ember') < 26 * lim) part('ember', rx(), ry(), 0, (R() - 0.5) * 0.3, -0.1, 0.5 + R() * 0.6, 3 + R() * 2, 0.025 + R() * 0.02, R() < 0.5 ? '#ff8a2a' : '#ffd36b'); }
    if (th === 'night' || th === 'swamp' || th === 'forest') { if (count('firefly') < (th === 'forest' ? 8 : 18) * lim) part('firefly', rx(), ry(), 0.2 + R() * 0.6, 0, 0, 0, 5 + R() * 3, 0.03, th === 'night' ? '#b8f0ff' : '#e8ff8a'); }
    if (th === 'forest' || th === 'meadow' || th === 'autumn') { if (count('leaf') < (th === 'meadow' ? 5 : 14) * lim && R() < 0.3) part('leaf', rx(), ry(), 2.5 + R(), 0.2, 0.1, -0.5, 6, 0.06, R() < 0.5 ? Terrain.pal(th).leaf : '#c8a040'); }
    if (th === 'meadow' || th === 'coast' || th === 'forest') { if (count('fly') < 4 * lim && R() < 0.1) part('fly', rx(), ry(), 0.4, 0, 0, 0, 8, 0.05, ['#ffffff', '#ffd36b', '#ff9ec7', '#9fd8ff'][Math.floor(R() * 4)]); }
    if (th === 'cave') { if (count('glint') < 24 * lim && R() < 0.5) part('glint', rx(), ry(), 0.2 + R() * 1.2, (R() - 0.5) * 0.1, (R() - 0.5) * 0.1, 0.05, 3 + R() * 2, 0.03, R() < 0.5 ? '#9ef0ff' : '#e0b0ff'); }
    if (th === 'deep') { if (count('bubble') < 22 * lim && R() < 0.6) part('bubble', rx(), ry(), 0, (R() - 0.5) * 0.1, 0, 0.6 + R() * 0.5, 4 + R() * 2, 0.025 + R() * 0.03, '#cff4ff'); }
    if (th === 'sky') { if (count('cloudlet') < 5 * lim && R() < 0.05) part('cloudlet', -1.5, ry(), 2.5 + R(), 0.5 + R() * 0.3, 0, 0, 40, 0.5 + R() * 0.4, '#ffffff'); }
    if ((th === 'ruins' && !(G.stormOn)) ) { if (count('dust') < 6 * lim && R() < 0.2) part('dust', -0.5, ry(), 0.1 + R() * 0.3, 1.2 + R(), 0.1, 0, 8, 0.3 + R() * 0.3, '#f6dfaa'); }
    if (th === 'ruins' && G.stormOn) { if (count('dust') < 40 * lim) for (let i = 0; i < 3; i++) part('dust', -0.5 - R(), ry(), 0.1 + R() * 0.8, 4 + R() * 2, 0.4, 0, 4, 0.4 + R() * 0.4, '#e8c888'); }
    if (th === 'desert' || th === 'canyon') { if (count('dust') < 10 * lim && R() < 0.3) part('dust', -0.5, ry(), 0.1 + R() * 0.3, 1.5 + R(), 0.1, 0, 7, 0.3 + R() * 0.3, '#f6dfaa'); }
    if (th !== 'night' && th !== 'volcano' && th !== 'cave' && th !== 'deep' && count('bird') < 2 && R() < 0.012) {
      const fromL = R() < 0.5, y0 = R() * ROWS;
      for (let i = 0; i < 3; i++) part('bird', fromL ? -1 - i * 0.4 : COLS + 1 + i * 0.4, y0 + i * 0.3, 3, fromL ? 1.6 : -1.6, (R() - 0.5) * 0.3, 0, 14, 0.12, th === 'coast' ? '#ffffff' : '#2a2a3a');
    }
  }

  return { reset, on, update, setLow, st, get G() { return G; }, get parts() { return parts; }, get decals() { return decals; }, get deaths() { return deaths; }, get coins() { return coins; }, get lights() { return lights; }, get ghosts() { return ghosts; }, get clouds() { return clouds; }, part, light, decal };
})();

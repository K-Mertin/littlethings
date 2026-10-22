'use strict';
/* ------------------------- character drawing ------------------------- */
/* Bodies are drawn from a small skeleton: hips, torso, head, two arms and
   two legs. Angles are measured from "straight down", positive = forward. */
const TH = 12, SH = 12, TO = 20, UA = 10, FA = 10, HR = 13;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
function seg(c, pts, w, col) {
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.strokeStyle = INK; c.lineWidth = w + 3.6; c.stroke();
  c.strokeStyle = col; c.lineWidth = w; c.stroke();
}
/* a round shape with an ink outline; big enough ones get a soft light from the upper left and a shadow on the lower right */
function blob(c, x, y, rx, ry, col, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fillStyle = col; c.fill();
  if (rx > 4.5) { softShade(c, x, y, rx, ry, rot); if (rx > 5.5) rimLight(c, x, y, rx, ry, rot); }
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
}
function softShade(c, x, y, rx, ry, rot = 0) {
  c.save(); c.clip();
  const m = Math.max(rx, ry), g = c.createRadialGradient(x - rx * 0.42, y - ry * 0.5, 0, x - rx * 0.15, y - ry * 0.2, m * 1.25);
  g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(0.32, 'rgba(255,255,255,0)'); g.addColorStop(0.72, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,20,60,.3)');
  c.fillStyle = g; c.fillRect(x - m - 2, y - m - 2, m * 2 + 4, m * 2 + 4);
  c.restore();
}
const P2 = (x, y) => ({ x, y });

function basePose() {
  return { by: 0, lean: 0.08, ll: [-0.22, 0.12], lr: [0.3, 0.32], al: [0.35, 1.9], ar: [0.6, 2.0], ht: 0, rot: 0, drop: 0, face: 'n', alpha: 1 };
}
/* 0 before a, ramps to 1 at b, holds to c, back to 0 at d */
function ext(t, a, b, c, d) {
  if (t <= a || t >= d) return 0; if (t < b) return (t - a) / (b - a); if (t <= c) return 1; return 1 - (t - c) / (d - c);
}

function pose(f) {
  const P = basePose(), t = f.st, s = f.state;
  const breathe = Math.sin(f.clock * 0.08) * 0.7;
  switch (s) {
    case 'idle': case 'win': P.by = breathe * 0.6; P.ar[0] += breathe * 0.02;
      if (s === 'win') { P.ar = [2.9 + Math.sin(t * 0.2) * 0.15, 0.3]; P.face = 'happy'; P.by = -Math.abs(Math.sin(t * 0.12)) * 4; }
      break;
    case 'walk': {
      const p = f.clock * 0.2, sw = Math.sin(p);
      P.ll = [-sw * 0.5, 0.15 + Math.max(0, -Math.cos(p)) * 0.5]; P.lr = [sw * 0.5, 0.15 + Math.max(0, Math.cos(p)) * 0.5];
      P.by = -Math.abs(Math.cos(p)) * 1.2; P.al[0] += sw * 0.15; P.ar[0] -= sw * 0.15; break;
    }
    case 'run': {
      const p = f.clock * 0.32, sw = Math.sin(p);
      P.lean = 0.38; P.ll = [-sw * 0.95, 0.3 + Math.max(0, -Math.cos(p)) * 1.3]; P.lr = [sw * 0.95, 0.3 + Math.max(0, Math.cos(p)) * 1.3];
      P.al = [-sw * 1.0, 1.5]; P.ar = [sw * 1.0, 1.5]; P.by = -Math.abs(Math.cos(p)) * 2.5; break;
    }
    case 'brake': P.lean = -0.25; P.lr = [0.7, 0.1]; P.ll = [-0.1, 0.6]; P.al = [-0.6, 0.8]; P.ar = [1.2, 0.6]; P.by = 2; break;
    case 'jump':
      if (f.vy > 0) { P.ll = [-0.1, 1.2]; P.lr = [0.9, 1.7]; P.al = [-0.5, 0.9]; P.ar = [2.2, 0.5]; }
      else { P.ll = [-0.3, 0.5]; P.lr = [0.4, 0.9]; P.al = [-0.9, 0.5]; P.ar = [1.6, 0.6]; }
      break;
    case 'land': case 'pickup': P.by = 6; P.ll = [-0.5, 0.9]; P.lr = [0.7, 1.4]; P.lean = 0.35; if (s === 'pickup') P.ar = [1.0, 0.3]; break;
    case 'atk': {
      const A = f.atk, e = ext(t, 1, A.on, A.off, A.dur);
      switch (A.pose) {
        case 'jab': P.ar = [lerp(0.6, 1.55, e), lerp(2.0, 0.05, e)]; P.lean = 0.08 + e * 0.12; P.lr = [0.45, 0.4]; break;
        case 'cross': P.al = [lerp(0.35, 1.62, e), lerp(1.9, 0.05, e)]; P.ar = [0.4, 2.3]; P.lean = 0.1 + e * 0.28; P.ll = [-0.45, 0.05]; P.lr = [0.45, 0.6]; break;
        case 'kick': P.lr = [lerp(0.3, 1.7, e), lerp(0.32, 0.0, e)]; P.ll = [-0.12, 0.1]; P.lean = 0.08 - e * 0.38; P.al = [-0.5 * e, 1.2]; P.ar = [0.6, 1.8]; break;
        case 'upper': P.ar = [lerp(0.4, 2.8, e), lerp(2.2, 0.4, e)]; P.lean = 0.2 - e * 0.25; P.by = 3 - e * 6; P.lr = [0.6, 0.7]; break;
        case 'swing1': P.ar = [lerp(2.9, 1.0, e), 0.25]; P.al = [0.2, 1.5]; P.lean = 0.05 + e * 0.25; P.lr = [0.5, 0.5]; break;
        case 'swing2': P.ar = [lerp(0.7, 2.6, e), 0.2]; P.al = [-0.3, 1.2]; P.lean = 0.3 - e * 0.35; P.ll = [-0.4, 0.1]; break;
        case 'butt': P.lean = 0.08 + e * 0.6; P.ht = -0.45 * e; P.ar = [0.5, 1.6]; P.al = [0.3, 1.6]; P.ll = [-0.5 * e, 0.1]; P.lr = [0.5, 0.6]; break;
        case 'bite': P.mouth = e > 0.3; break;
        case 'swing3': P.ar = [lerp(3.2, 1.3, e), 0.1]; P.lean = 0.45 * e; P.by = 4 * e; P.lr = [0.8, 0.9]; P.ll = [-0.5, 0.2]; break;
      }
      break;
    }
    case 'runAtk': P.lr = [1.55, 0]; P.ll = [-0.3, 1.6]; P.lean = -0.28; P.al = [-0.8, 0.6]; P.ar = [0.9, 1.6]; break;
    case 'jumpAtk': P.lr = [1.2, 0]; P.ll = [0.5, 1.8]; P.lean = 0.12; P.ar = [1.3, 0.4]; P.al = [-0.6, 0.8]; break;
    case 'defend': P.ar = [1.3, 2.3]; P.al = [1.05, 2.3]; P.ll = [-0.45, 0.45]; P.lr = [0.55, 0.85]; P.by = 3; P.lean = 0.18; P.ht = 0.15; break;
    case 'roll': { const r = clamp(t / 22, 0, 1); P.rot = r * TAU; P.rc = 34; P.ll = [0.9, 2.2]; P.lr = [1.3, 2.4]; P.al = [1.4, 1.8]; P.ar = [1.6, 1.8]; P.lean = 0.9; P.by = 10; break; }
    case 'hurt': P.lean = -0.35; P.ht = -0.3; P.al = [-0.7, 0.5]; P.ar = [-0.2, 0.9]; P.face = 'hurt'; P.sweat = true; P.lr = [0.15, 0.2]; P.ll = [-0.35, 0.3]; break;
    case 'dizzy': P.lean = Math.sin(t * 0.12) * 0.2; P.ht = Math.sin(t * 0.12 + 1) * 0.25; P.al = [0.2, 0.3]; P.ar = [0.3, 0.3]; P.face = 'spiral'; break;
    case 'fall': {
      const k = clamp(t / 16, 0, 1); P.rot = -k * 1.5; P.rc = 34; P.face = 'hurt'; P.al = [-1.8, 0.6]; P.ar = [-1.2, 0.8]; P.ll = [0.5, 0.4]; P.lr = [0.9, 0.6]; P.lean = -0.2; break;
    }
    case 'lying': case 'dead': P.rot = -Math.PI / 2; P.rc = 34; P.drop = 26; P.face = s === 'dead' ? 'ko' : 'hurt'; P.al = [-2.6, 0.3]; P.ar = [-2.2, 0.5]; P.ll = [0.25, 0.3]; P.lr = [0.45, 0.5]; P.lean = 0; P.ht = -0.1; break;
    case 'getup': {
      const k = clamp(t / 20, 0, 1); P.rot = -(1 - k) * Math.PI / 2; P.rc = 34; P.drop = 26 * (1 - k); P.by = 8 * Math.sin(k * Math.PI); P.lean = 0.5 * Math.sin(k * Math.PI);
      P.ll = [-0.4, 1.0 * (1 - k)]; P.lr = [0.9 * (1 - k) + 0.3, 1.6 * (1 - k) + 0.3]; P.ar = [1.0, 1.2]; break;
    }
    case 'throw': { const e = clamp((t - 2) / 6, 0, 1); P.ar = [lerp(-2.6, 1.7, e), 0.3]; P.lean = lerp(-0.25, 0.35, e); P.lr = [0.7, 0.6]; P.ll = [-0.5, 0.1]; break; }
    case 'drink': P.ar = [2.3, 2.4]; P.ht = -0.35; P.lean = -0.08; P.face = 'happy'; break;
    case 'skill': { P.face = 'power'; const S = SKILLS[f.skill]; if (S && S.pose) S.pose(P, t, f); break; }
    case 'frozen': return f.frozenPose || P;
  }
  if (f.hold && s !== 'atk' && s !== 'throw' && s !== 'skill' && s !== 'pickup') {
    if (f.hold.kind === 'stone') { P.ar = [2.6, 0.6]; P.al = [2.4, 0.7]; }
    else if (s === 'idle' || s === 'walk' || s === 'defend') P.ar = [0.8, 1.2];
  }
  return P;
}

/* Hair, hats and faces. Coordinates are around the head centre, facing +x. */
function drawHair(c, L, back, f, P) {
  if (L.beast) return beastHead(c, L, back, f, P);
  const R = HR, hc = L.hair, t = f ? f.clock : 0;
  switch (L.style) {
    case 'spiky':
      if (back) { // headband tails
        const w = Math.sin(t * 0.25) * 3;
        seg(c, [P2(-R + 2, -4), P2(-R - 9, -1 + w), P2(-R - 18, 3 - w)], 4, L.acc);
        return;
      }
      c.beginPath(); c.moveTo(R * 0.75, -5);
      [[-0.45, R + 4], [-0.75, R + 1], [-1.05, R + 10], [-1.35, R + 1], [-1.7, R + 11], [-2.05, R + 1], [-2.4, R + 10], [-2.75, R], [-3.05, R + 7], [-3.3, R]].forEach(([a, r]) => c.lineTo(Math.cos(a) * r, Math.sin(a) * r));
      c.lineTo(-R * 0.7, 6); c.lineTo(-R * 0.2, -2); c.lineTo(R * 0.45, -5); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
      c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, 0, TAU); c.clip(); c.fillStyle = L.acc; c.fillRect(-R - 2, -7, R * 2 + 4, 5); c.restore();
      c.beginPath(); c.moveTo(-R, -7); c.lineTo(R, -7); c.moveTo(-R, -2); c.lineTo(R, -2); c.strokeStyle = 'rgba(28,26,46,.35)'; c.lineWidth = 1; c.stroke();
      break;
    case 'long':
      if (back) {
        c.beginPath(); c.moveTo(4, -R + 1); c.quadraticCurveTo(-R - 4, -R, -R - 3, 4); c.quadraticCurveTo(-R - 5 + Math.sin(t * 0.1) * 1.5, R + 10, -4, R + 9);
        c.quadraticCurveTo(-6, 4, 2, 0); c.closePath(); c.fillStyle = shade(hc, -0.12); c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
        return;
      }
      c.beginPath(); c.moveTo(R + 1, -1); c.quadraticCurveTo(R + 2, -R - 4, -2, -R - 2); c.quadraticCurveTo(-R - 3, -R + 2, -R + 1, 6);
      c.lineTo(-4, 4); c.lineTo(0, -5); c.lineTo(4, -2); c.lineTo(7, -6); c.lineTo(10, -2); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      blob(c, -3, -R + 1, 3.2, 3.2, L.acc); // hair clip
      break;
    case 'flattop':
      if (back) return;
      c.beginPath(); c.moveTo(R * 0.8, -6); for (let i = 0; i <= 8; i++) { const a = -0.6 - i * 0.32; c.lineTo(Math.cos(a) * (R + (i & 1 ? 4 : 1.5)), Math.sin(a) * (R + (i & 1 ? 4 : 1.5))); } c.lineTo(-R * 0.5, 2); c.lineTo(-2, -4); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, 0, TAU); c.clip(); c.fillStyle = L.acc; c.fillRect(-R - 2, -6, R * 2 + 4, 4.5); c.restore();
      break;
    case 'hood':
      if (back) {
        const w = Math.sin(t * 0.22) * 3;
        seg(c, [P2(-6, R - 2), P2(-R - 8, R - 4 + w), P2(-R - 20, R - 1 - w)], 5, L.acc); return;
      }
      c.save(); c.beginPath(); c.arc(0, 0, R + 1.5, 0, TAU); c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.ellipse(R * 0.45, -1, R * 0.6, 4.5, 0, 0, TAU); c.fillStyle = L.skin; c.fill(); c.lineWidth = 1.6; c.stroke(); c.restore();
      break;
    case 'bandana':
      if (back) { seg(c, [P2(-R + 1, -5), P2(-R - 7, -1), P2(-R - 9, 6)], 3.5, hc); return; }
      c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, 0, TAU); c.clip(); c.fillStyle = hc; c.fillRect(-R - 2, -R - 2, R * 2 + 4, R - 1);
      c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = -2; i < 3; i++) { c.beginPath(); c.arc(i * 5, -R + 5 + (i & 1) * 2, 1.2, 0, TAU); c.fill(); }
      c.restore(); c.beginPath(); c.arc(0, 0, R, Math.PI, TAU); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.moveTo(-R, -3); c.lineTo(R, -3); c.stroke();
      break;
    case 'bald':
      if (back) return;
      c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, 0, TAU); c.clip(); c.fillStyle = 'rgba(40,30,30,.55)'; c.beginPath(); c.ellipse(4, 9, R, 6, 0, 0, TAU); c.fill(); c.restore();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-3, -R + 4, 4, 2, -0.4, 0, TAU); c.fill();
      break;
    case 'mohawk':
      if (back) return;
      c.beginPath(); c.moveTo(6, -R + 2);
      for (let i = 0; i < 5; i++) { const a = -1.2 - i * 0.42; c.lineTo(Math.cos(a) * (R + 9), Math.sin(a) * (R + 9)); c.lineTo(Math.cos(a - 0.21) * (R - 1), Math.sin(a - 0.21) * (R - 1)); }
      c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      break;
    case 'boar':
      if (back) { c.beginPath(); c.moveTo(-9, -R + 5); c.lineTo(-8, -R - 8); c.lineTo(1, -R + 1); c.closePath(); c.fillStyle = shade(L.fur, -0.2); c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); return; }
      c.beginPath(); c.moveTo(-8, -R + 2); for (let i = 0; i < 5; i++) { const a = -2.3 + i * 0.32; c.lineTo(Math.cos(a) * (R + 6), Math.sin(a) * (R + 6)); c.lineTo(Math.cos(a + 0.16) * (R - 1), Math.sin(a + 0.16) * (R - 1)); } c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.moveTo(2, -R + 2); c.lineTo(0, -R - 7); c.lineTo(8, -R + 4); c.closePath(); c.fillStyle = L.fur; c.fill(); c.stroke();
      if (P.mouth) { c.beginPath(); c.ellipse(R * 0.62, 9, 4, 3, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); c.stroke(); }
      blob(c, R * 0.82, 3.5, 5.5, 5, '#eea48c');
      c.fillStyle = INK; c.beginPath(); c.arc(R * 0.82 + 2, 2.5, 1, 0, TAU); c.arc(R * 0.82 + 2, 5, 1, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(R * 0.55, 8); c.quadraticCurveTo(R * 0.6, 3, R * 0.42, 1.5); c.lineTo(R * 0.42, 7.5); c.closePath(); c.fillStyle = '#fffbea'; c.fill(); c.lineWidth = 1.4; c.stroke();
      break;
    case 'monkey':
      if (back) return;
      c.beginPath(); c.moveTo(-3, -R + 1); c.lineTo(-1, -R - 6); c.lineTo(2, -R + 0.5); c.lineTo(5, -R - 4); c.lineTo(6, -R + 2); c.fillStyle = L.fur; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.ellipse(4, 2, 9.5, 9, 0, 0, TAU); c.fillStyle = L.skin; c.fill(); c.lineWidth = 1.8; c.stroke();
      blob(c, -4, 0, 5.5, 5.5, L.fur); c.beginPath(); c.arc(-4, 0, 2.6, 0, TAU); c.fillStyle = '#e9a59a'; c.fill();
      c.lineWidth = 1.8; c.strokeStyle = INK; c.beginPath();
      if (P.mouth) { c.ellipse(R * 0.6, 7, 3, 2.6, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); c.stroke(); } else { c.arc(R * 0.55, 4.5, 3.4, 0.2, Math.PI * 0.85); c.stroke(); }
      break;
    case 'bear':
      if (back) { blob(c, -6, -R + 2, 5.5, 5.5, shade(L.fur, -0.15)); return; }
      blob(c, 2, -R + 1, 5, 5, L.fur); c.beginPath(); c.arc(2, -R + 1, 2.4, 0, TAU); c.fillStyle = '#d9a07a'; c.fill();
      if (P.mouth) { c.beginPath(); c.ellipse(R * 0.6, 9, 4, 3, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); }
      blob(c, R * 0.68, 4, 7, 5.5, L.belly);
      c.fillStyle = INK; c.beginPath(); c.ellipse(R * 0.68 + 5.5, 1.8, 3, 2.2, 0, 0, TAU); c.fill();
      c.lineWidth = 1.6; c.strokeStyle = INK; c.beginPath(); c.moveTo(R * 0.68 + 4, 5); c.quadraticCurveTo(R * 0.68 + 2, 8, R * 0.68 - 1, 7); c.stroke();
      break;
    case 'dragon':
      if (back) {
        c.beginPath(); c.moveTo(-2, -R); for (let i = 0; i < 5; i++) { const a = -2.0 - i * 0.36; c.lineTo(Math.cos(a) * (R + 9), Math.sin(a) * (R + 9)); c.lineTo(Math.cos(a - 0.18) * (R - 2), Math.sin(a - 0.18) * (R - 2)); }
        c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); return;
      }
      if (P.mouth) { c.beginPath(); c.moveTo(R * 0.4, 6); c.lineTo(R + 10, 6); c.lineTo(R + 6, 15); c.lineTo(R * 0.5, 11); c.closePath(); c.fillStyle = '#7a1f2a'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }
      c.beginPath(); c.ellipse(R * 0.8, 2, 11, 7, 0, 0, TAU); c.fillStyle = L.fur; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(R * 0.8 + 8, -1, 1.3, 0, TAU); c.fill();
      c.fillStyle = '#fffbea'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(R * 0.55 + i * 5, 8.5); c.lineTo(R * 0.55 + i * 5 + 2, 12); c.lineTo(R * 0.55 + i * 5 + 4, 8.5); c.fill(); }
      [[-2, -R + 2, -12, -R - 8, -4, -R + 4], [4, -R + 1, -2, -R - 12, 8, -R + 3]].forEach(h => { c.beginPath(); c.moveTo(h[0], h[1]); c.quadraticCurveTo(h[2] + 4, h[3] + 2, h[2], h[3]); c.lineTo(h[4], h[5]); c.closePath(); c.fillStyle = L.acc; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); });
      break;
    case 'zap':
      if (back) return;
      c.beginPath(); c.moveTo(R * 0.8, -5);
      [[-0.5, R + 2], [-0.7, R + 12], [-0.95, R + 3], [-1.3, R + 14], [-1.55, R + 2], [-1.95, R + 13], [-2.2, R + 2], [-2.6, R + 11], [-2.85, R + 1], [-3.2, R + 6], [-3.4, R]].forEach(([a2, r]) => c.lineTo(Math.cos(a2) * r, Math.sin(a2) * r));
      c.lineTo(-R * 0.6, 6); c.lineTo(-R * 0.1, -3); c.lineTo(R * 0.5, -6); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#2b2733'; c.beginPath(); c.moveTo(-2, -R - 4); c.lineTo(3, -R + 3); c.lineTo(-1, -R + 3); c.lineTo(3, -R + 10); c.lineTo(-5, -R + 1); c.lineTo(-1, -R + 1); c.closePath(); c.fill();
      break;
    case 'breeze':
      if (back) { const w = Math.sin(t * 0.2) * 3; c.beginPath(); c.moveTo(-4, -R); c.quadraticCurveTo(-R - 14, -R - 4 + w, -R - 18, -2 + w); c.quadraticCurveTo(-R - 6, -2, -R + 2, 4); c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); return; }
      c.beginPath(); c.moveTo(R + 1, -3); c.quadraticCurveTo(R, -R - 6, -6, -R - 3); c.quadraticCurveTo(-R - 4, -R + 3, -R + 1, 5); c.lineTo(-5, 2); c.lineTo(1, -6); c.lineTo(6, -3); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      c.save(); c.beginPath(); c.arc(0, 0, R + 0.5, 0, TAU); c.clip(); c.fillStyle = '#2b2733'; c.fillRect(-R - 2, -9, R * 2 + 4, 3.5); c.restore();
      blob(c, R * 0.35, -11, 5, 4, '#9ad8f0');
      break;
    case 'witch': // 小月: long hair and a pointed hat with a star
      if (back) {
        c.beginPath(); c.moveTo(4, -R + 1); c.quadraticCurveTo(-R - 5, -R, -R - 4, 4); c.quadraticCurveTo(-R - 6 + Math.sin(t * 0.1) * 1.5, R + 12, -3, R + 10);
        c.quadraticCurveTo(-6, 4, 2, 0); c.closePath(); c.fillStyle = shade(hc, -0.1); c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
        return;
      }
      c.beginPath(); c.moveTo(R + 1, -2); c.quadraticCurveTo(R, -R - 2, -2, -R - 1); c.quadraticCurveTo(-R - 2, -R + 3, -R + 1, 5); c.lineTo(-4, 2); c.lineTo(1, -5); c.lineTo(5, -2); c.lineTo(9, -6); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      { const sway = Math.sin(t * 0.06) * 0.08;
        c.save(); c.translate(-1, -R + 1); c.rotate(-0.25 + sway);
        c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(-4, -14, 2, -26); c.quadraticCurveTo(6, -30, 10, -24); c.quadraticCurveTo(8, -12, 12, 0); c.closePath();
        c.fillStyle = L.acc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
        c.fillStyle = L.trim; c.fillRect(-11, -5, 23, 4); c.strokeRect(-11, -5, 23, 4);
        c.restore();
        blob(c, -R - 4, -R + 3, 15, 3.6, shade(L.acc, -0.15), -0.25);
        drawStar(c, 3, -R - 9, 4, '#ffd23f'); }
      break;
    case 'bubblecap': // 波波: a round knitted cap with a bubble on top
      if (back) return;
      c.beginPath(); c.moveTo(R + 1, -1); c.lineTo(R - 1, -6); c.lineTo(4, -4); c.lineTo(-1, -7); c.lineTo(-R, -2); c.lineTo(-R, 4); c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.beginPath(); c.arc(0, -3, R + 2, Math.PI * 1.04, Math.PI * 1.96); c.closePath(); c.fillStyle = L.acc; c.fill(); c.lineWidth = 2.2; c.stroke();
      c.fillStyle = L.trim; c.fillRect(-R - 2, -6, R * 2 + 4, 3.5); c.strokeRect(-R - 2, -6, R * 2 + 4, 3.5);
      { const by = -R - 9 + Math.sin(t * 0.12) * 1.5; c.beginPath(); c.arc(-1, by, 6, 0, TAU); c.fillStyle = 'rgba(190,240,255,.65)'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-3, by - 2, 1.8, 0, TAU); c.fill(); }
      break;
    case 'buns':
      if (back) { blob(c, -R + 1, -R + 3, 6.5, 6.5, shade(hc, -0.1)); return; }
      blob(c, 4, -R - 1, 6.5, 6.5, hc);
      c.beginPath(); c.moveTo(R + 1, -1); c.quadraticCurveTo(R + 1, -R - 3, -2, -R - 1); c.quadraticCurveTo(-R - 2, -R + 3, -R + 1, 7); c.lineTo(-4, 4); c.lineTo(0, -5); c.lineTo(4, -2); c.lineTo(7, -6); c.lineTo(10, -2); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      blob(c, 8, -R + 2, 2.6, 2.6, L.acc);
      break;
    case 'cat':
      if (back) { [[-8, -R + 4], [3, -R + 1]].forEach(([x, y], k) => { c.beginPath(); c.moveTo(x - 6, y + 3); c.lineTo(x - 1, y - 11); c.lineTo(x + 6, y + 2); c.closePath(); c.fillStyle = k ? L.fur : shade(L.fur, -0.15); c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }); return; }
      c.strokeStyle = '#fff6e6'; c.lineWidth = 2; c.beginPath(); c.moveTo(2, -R + 3); c.lineTo(5, -4); c.moveTo(7, -R + 4); c.lineTo(8, -4); c.stroke();
      c.fillStyle = L.spots; [[-6, -6], [-3, 3], [-9, 2], [-5, -10]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.7, 0, TAU); c.fill(); });
      blob(c, R * 0.72, 5, 6, 4.5, L.skin);
      c.fillStyle = '#e88a9a'; c.beginPath(); c.moveTo(R * 0.72 + 3, 2); c.lineTo(R * 0.72 + 7, 2); c.lineTo(R * 0.72 + 5, 5); c.closePath(); c.fill();
      c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(R * 0.72 + 4, 6); c.lineTo(R + 8, 4); c.moveTo(R * 0.72 + 4, 7); c.lineTo(R + 8, 8); c.stroke();
      if (P.mouth) { c.beginPath(); c.ellipse(R * 0.7, 9, 3, 2.4, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); }
      break;
    case 'raccoon':
      if (back) { [[-7, -R + 3], [4, -R + 1]].forEach(([x, y]) => blob(c, x, y, 5.5, 5.5, L.hair)); return; }
      c.fillStyle = L.hair; c.beginPath(); c.ellipse(R * 0.42, -1, 7.5, 5.5, -0.15, 0, TAU); c.fill();
      blob(c, R * 0.72, 5, 6.5, 5, L.skin); c.fillStyle = INK; c.beginPath(); c.ellipse(R * 0.72 + 5, 3, 2.6, 2, 0, 0, TAU); c.fill();
      c.fillStyle = L.skin; c.beginPath(); c.ellipse(-1, -R + 6, 6, 3, 0, 0, TAU); c.fill();
      if (L.acc) { c.fillStyle = L.acc; c.beginPath(); c.moveTo(-10, -R + 2); c.lineTo(8, -R - 1); c.lineTo(9, -R + 3); c.lineTo(-9, -R + 6); c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke(); }
      if (P.mouth) { c.beginPath(); c.ellipse(R * 0.66, 10, 3.5, 2.6, 0, 0, TAU); c.fillStyle = '#5a1e28'; c.fill(); }
      break;
    case 'archer':
      if (back) { c.beginPath(); c.moveTo(-4, -R); c.quadraticCurveTo(-R - 14, -R + 2, -R - 16, 8); c.quadraticCurveTo(-R - 4, 2, -R + 2, 6); c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); return; }
      c.beginPath(); c.arc(0, 0, R + 1.5, Math.PI * 0.95, Math.PI * 2.08); c.lineTo(R * 0.4, -4); c.quadraticCurveTo(-2, -2, -R, 8); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      break;
  }
}
function drawFace(c, L, P) {
  const R = HR, f = P.face, kid = L.style !== 'hood' && !L.animal;
  if (kid && !L.beast && !sculptOf(L)) { c.beginPath(); c.ellipse(-2, 1, 3, 4, 0, 0, TAU); c.fillStyle = shade(L.skin, -0.15); c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); } // ear
  const ex = R * 0.52, ey = -1;
  if (kid && f !== 'ko') { c.fillStyle = 'rgba(255,110,120,.36)'; c.beginPath(); c.ellipse(ex + 1, ey + 5, 3.4, 1.9, 0, 0, TAU); c.fill(); } // blush
  c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 2; c.lineCap = 'round';
  if (f === 'hurt') { c.beginPath(); c.moveTo(ex - 2.5, ey - 3); c.lineTo(ex + 1.8, ey); c.lineTo(ex - 2.5, ey + 3); c.stroke(); }
  else if (f === 'ko') { c.beginPath(); c.moveTo(ex - 2.5, ey - 2.5); c.lineTo(ex + 2.5, ey + 2.5); c.moveTo(ex + 2.5, ey - 2.5); c.lineTo(ex - 2.5, ey + 2.5); c.stroke(); }
  else if (f === 'spiral') { c.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.3) { const r = 0.4 + a * 0.28; c.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); } c.lineWidth = 1.3; c.stroke(); }
  else if (f === 'happy') { c.beginPath(); c.arc(ex, ey + 1.5, 2.7, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 2.2; c.stroke(); }
  else {
    if (L.eyeRing) { c.save(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 3.6, 4.6, 0, 0, TAU); c.fill(); c.lineWidth = 1.4; c.stroke(); c.restore(); c.fillStyle = INK; }
    if (DETAIL && L.eye && !L.eyeRing) { // white, coloured iris, pupil and two sparkles
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 2.7, 3.9, 0, 0, TAU); c.fill(); c.lineWidth = 1.1; c.strokeStyle = INK; c.stroke();
      c.fillStyle = L.eye; c.beginPath(); c.ellipse(ex + 0.4, ey + 0.3, 2.05, 3.1, 0, 0, TAU); c.fill();
      c.fillStyle = INK; c.beginPath(); c.ellipse(ex + 0.5, ey + 0.4, 1.1, 1.8, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 1.1, ey - 1.3, 0.95, 0, TAU); c.fill(); c.beginPath(); c.arc(ex - 0.4, ey + 1.7, 0.45, 0, TAU); c.fill();
      eyeLid(c, ex, ey, L.lash);
      if (L.lash) { c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.moveTo(ex + 2.2, ey - 3); c.lineTo(ex + 3.8, ey - 4.2); c.moveTo(ex + 2.7, ey - 1.6); c.lineTo(ex + 4.3, ey - 2.2); c.stroke(); }
    } else {
      c.beginPath(); c.ellipse(ex, ey, 2.1, 3.5, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 0.7, ey - 1.4, 1, 0, TAU); c.fill();
      if (!L.eyeRing) { c.beginPath(); c.arc(ex - 0.6, ey + 1.6, 0.45, 0, TAU); c.fill(); }
    }
    if (L.shades) { c.fillStyle = '#111'; c.beginPath(); c.roundRect ? c.roundRect(ex - 4, ey - 3, R * 0.6 + 4, 6, 2) : c.rect(ex - 4, ey - 3, R * 0.6 + 4, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(ex, ey - 2, 3, 1.5); }
  }
  // brow: angry for monsters, pushed down when powering up, raised when hurt
  c.strokeStyle = INK; c.lineWidth = L.brow || 2; c.beginPath();
  if (L.angry || f === 'power') { c.moveTo(ex - 3.8, ey - 7.6); c.lineTo(ex + 3.5, ey - 4.6); }
  else if (f === 'hurt' || f === 'spiral') { c.moveTo(ex - 3, ey - 5); c.lineTo(ex + 3, ey - 7.5); }
  else { c.moveTo(ex - 3, ey - 6.2); c.quadraticCurveTo(ex, ey - 7.5, ex + 3, ey - 6.4); }
  if (L.style !== 'hood') c.stroke();
  if (!kid) return;
  c.lineWidth = 1.8; c.beginPath();
  if (f === 'ko') { c.ellipse(R * 0.62, 6.5, 1.8, 2.2, 0, 0, TAU); c.fillStyle = '#7a2230'; c.fill(); c.stroke(); }
  else if (f === 'hurt' || f === 'spiral') { c.moveTo(R * 0.35, 7.5); c.quadraticCurveTo(R * 0.6, 4.5, R * 0.85, 7.5); c.stroke(); }
  else if (f === 'power') { c.rect(R * 0.38, 4.6, 5.2, 3.4); c.fillStyle = '#fff'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(R * 0.38, 6.3); c.lineTo(R * 0.38 + 5.2, 6.3); c.lineWidth = 1; c.stroke(); }
  else if (f === 'happy') { c.moveTo(R * 0.3, 4); c.quadraticCurveTo(R * 0.6, 11, R * 0.92, 4); c.closePath(); c.fillStyle = '#7a2230'; c.fill(); c.stroke(); c.beginPath(); c.ellipse(R * 0.62, 7.6, 2, 1.2, 0, 0, TAU); c.fillStyle = '#ff8a8a'; c.fill(); }
  else { c.moveTo(R * 0.42, 5.8); c.quadraticCurveTo(R * 0.62, 7.6, R * 0.85, 5.6); c.stroke(); }
  if (P.sweat) { c.fillStyle = '#9fe3ff'; c.beginPath(); c.moveTo(-6, -12); c.quadraticCurveTo(-10, -5, -6, -4); c.quadraticCurveTo(-2, -5, -6, -12); c.fill(); c.lineWidth = 1.2; c.stroke(); }
}

/* Floating-limb style: round head, small egg body, and fists and shoes that float
   where the hands and feet would be (no arms or legs are drawn). The skeleton
   angles in pose() still place the hands and feet. */
const LIMB = 10, BODY_H = 19;
function drawBody(c, L, P, f) {
  const big = L.build === 'big', R = HR, th = big ? 22 : BODY_H, tw = big ? 15 : L.build === 'slim' ? 11 : 12;
  const hip = P2(0, -LIMB * 2 - 6 + P.by);
  // a straight arm or a high kick reaches further, so punches and kicks read clearly
  const reach = (bend, k) => 1 + k * clamp(1 - Math.abs(bend) / 1.4, 0, 1);
  const leg = (a, side) => { const n = LIMB * (a[0] > 0.9 ? reach(a[1], 0.5) : 1), k = P2(hip.x + side * 4 + Math.sin(a[0]) * n, hip.y + Math.cos(a[0]) * n), s = a[0] - a[1]; return { ft: P2(k.x + Math.sin(s) * n, k.y + Math.cos(s) * n), s }; };
  const top = P2(hip.x + Math.sin(P.lean) * th, hip.y - Math.cos(P.lean) * th);
  const sh = P2(lerp(hip.x, top.x, 0.72), lerp(hip.y, top.y, 0.72));
  const arm = a => { const n = LIMB * reach(a[1], 0.7), e = P2(sh.x + Math.sin(a[0]) * n, sh.y + Math.cos(a[0]) * n), s2 = a[0] + a[1]; return { e, h: P2(e.x + Math.sin(s2) * n, e.y + Math.cos(s2) * n), s2 }; };
  const ha = P.lean + P.ht, head = P2(top.x + Math.sin(ha) * (R + 3), top.y - Math.cos(ha) * (R + 3));
  const fist = big ? 7 : 6;
  const SP = sculptOf(L);
  const hand = (a, dk) => {
    const g = arm(a); if (SP) { sprite(c, SP.fist, g.h.x, g.h.y, 0, dk); return g; } blob(c, g.h.x, g.h.y, fist, fist, L.glove ? (dk ? shade(L.glove, -0.2) : L.glove) : (dk ? L.skinD : L.skin));
    if (DETAIL && !L.animal) { c.save(); c.translate(g.h.x, g.h.y); c.rotate(-g.s2 + Math.PI / 2); c.strokeStyle = 'rgba(28,26,46,.55)'; c.lineWidth = 1; c.beginPath(); for (const k of [-0.35, 0.05, 0.45]) { c.moveTo(fist * 0.35, k * fist); c.lineTo(fist * 0.85, k * fist + 0.5); } c.stroke(); if (L.cuff) { c.fillStyle = L.cuff; c.fillRect(-fist - 1, -fist * 0.8, 3, fist * 1.6); } c.restore(); }
    drawHandAcc(c, L, g, fist); return g;
  };
  const foot = (a, side, dk) => {
    const g = leg(a, side), fx = g.ft.x + 3, fy = g.ft.y - 1.5, rx = big ? 9.5 : 8.5, rot = -g.s * 0.3;
    if (SP) { sprite(c, SP.shoe, fx, fy, rot, dk); return; }
    blob(c, fx, fy, rx, 5.2, dk ? shade(L.shoe, -0.2) : L.shoe, rot); drawShoeAcc(c, L, fx, fy, rx, rot);
    if (DETAIL && !L.animal) { // sole and laces
      c.save(); c.translate(fx, fy); c.rotate(rot); c.beginPath(); c.ellipse(0, 0, rx - 1, 4.2, 0, 0, TAU); c.clip();
      c.fillStyle = L.sole || shade(L.shoe, -0.45); c.fillRect(-rx, 2, rx * 2, 4); c.restore();
      c.save(); c.translate(fx, fy); c.rotate(rot); c.strokeStyle = 'rgba(28,26,46,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2, -4); c.lineTo(1, -2); c.moveTo(1, -4.4); c.lineTo(4, -2.4); c.stroke(); c.restore();
    }
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (L.tail) drawTail(c, L, hip, f);
  if (L.scarf) drawScarf(c, L, top, f);
  drawBack(c, L, top, hip, f);
  if (!SP || L.style === 'spiky') { c.save(); c.translate(head.x, head.y); c.rotate(ha); drawHair(c, L, true, f, P); c.restore(); }
  hand(P.al, true); foot(P.ll, -1, true);
  // body: a small egg, shirt above and pants below
  c.save(); c.translate(hip.x, hip.y); c.rotate(P.lean);
  const egg = () => { c.beginPath(); c.ellipse(0, -th / 2, tw, th / 2 + 4, 0, 0, TAU); };
  if (SP) { sprite(c, SP.body, 0, -th / 2); if (DETAIL && L.emblem) drawEmblem(c, L.emblem, 5.5, -th * 0.58, L.emblemCol || L.trim || '#fff6e6'); c.restore(); }
  else { egg(); c.save(); c.clip(); paint(c, 'fabric', L.shirt, -30, -40, 60, 60, 0.45);
  if (L.belly) { c.fillStyle = L.belly; c.beginPath(); c.ellipse(4, -th / 2, tw * 0.6, th * 0.38, 0, 0, TAU); c.fill(); }
  if (!L.animal) paint(c, 'fabric', L.pants, -30, -3, 60, 20, 0.45);
  if (L.trim) { c.fillStyle = L.trim; c.fillRect(-30, -th * 0.62, 60, 3); }
  if (L.belt) { c.fillStyle = L.belt; c.fillRect(-30, -6, 60, 3.5); }
  if (DETAIL && !L.animal) {
    c.strokeStyle = 'rgba(28,26,46,.45)'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-1, -th - 2); c.quadraticCurveTo(4, -th + 4, 9, -th - 1); c.stroke();                        // collar
    c.beginPath(); c.moveTo(-tw, -3); c.lineTo(tw, -3); c.stroke();                                                   // waistband
    if (L.emblem) drawEmblem(c, L.emblem, 4.5, -th * 0.58, L.emblemCol || L.trim || '#fff6e6');
  }
  if (L.vmark) { c.fillStyle = '#fff6e6'; c.beginPath(); c.moveTo(-6, -th + 2); c.lineTo(4, -th * 0.45); c.lineTo(14, -th + 2); c.lineTo(12, -th + 1); c.lineTo(4, -th * 0.62); c.lineTo(-3, -th + 1); c.closePath(); c.fill(); }
  softShade(c, 0, -th / 2, tw, th / 2 + 4);
  c.restore(); rimLight(c, 0, -th / 2, tw, th / 2 + 4, 0, 2.2); egg(); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke(); c.restore(); }
  drawNeck(c, L, top);
  foot(P.lr, 1, false);
  c.save(); c.translate(head.x, head.y); c.rotate(ha);
  if (SP) { sprite(c, SP.head, 0, 0); c.save(); c.translate(R * 0.45, 1); c.scale(1.18, 1.18); c.translate(-R * 0.45, -1); drawFace(c, L, P); c.restore(); drawHeadAcc(c, L, P, f); }
  else {
  if (L.style !== 'hood') blob(c, 0, 0, R, R, L.fur || L.skin);
  drawHair(c, L, false, f, P); hairLocks(c, L); if (DETAIL && !L.animal && !L.beast && L.style !== 'hood' && L.style !== 'bubblecap' && L.style !== 'witch') hairSheen(c, L); drawFace(c, L, P); drawHeadAcc(c, L, P, f); }
  if (f && f.inkT > 0) inkSplat(c, f);
  c.restore();
  const g = hand(P.ar, false);
  if (f && f.hold) drawHeld(c, f.hold, g);
  if (L.wand && !(f && f.hold)) { // magic wand: a star or a bubble on a stick
    c.save(); c.translate(g.h.x, g.h.y); c.rotate(-g.s2 + Math.PI * 0.85); seg(c, [P2(0, 2), P2(0, -20)], 2.6, '#8a5a2f');
    if (L.wand === 'star') drawStar(c, 0, -24, 7, '#ffd23f'); else { c.beginPath(); c.arc(0, -25, 6.5, 0, TAU); c.fillStyle = 'rgba(190,240,255,.75)'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-2, -27, 1.8, 0, TAU); c.fill(); }
    c.restore();
  }
  if (L.sling && !(f && f.hold)) { c.save(); c.translate(g.h.x, g.h.y); c.rotate(-g.s2 + Math.PI); seg(c, [P2(0, 2), P2(0, -8)], 2.5, '#a0662f'); seg(c, [P2(0, -8), P2(-4, -15)], 2.5, '#a0662f'); seg(c, [P2(0, -8), P2(4, -15)], 2.5, '#a0662f'); c.restore(); }
  return { head, hip, top };
}

/* a scarf tied at the neck that flutters behind, faster when running */
function drawScarf(c, L, top, f) {
  const t = f ? f.clock : 0, fast = f && (f.state === 'run' || Math.abs(f.vx || 0) > 3) ? 1.8 : 1, w = Math.sin(t * 0.15 * fast) * 3 * fast;
  c.save(); c.translate(top.x - 1, top.y + 3);
  c.beginPath(); c.moveTo(-3, -3); c.quadraticCurveTo(-16, -1 + w, -27 * fast * 0.8 - 4, -5 + w * 1.5); c.lineTo(-27 * fast * 0.8 - 3, 3 + w * 1.5); c.quadraticCurveTo(-15, 6 + w, -2, 4); c.closePath();
  c.fillStyle = L.scarf; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  c.restore();
}
function drawTail(c, L, hip, f) {
  if (L.beast) return beastTail(c, L, hip, f);
  const t = f ? f.clock : 0, fur = L.fur, y = hip.y;
  if (L.tail === 'curly') { c.beginPath(); c.arc(-9, y - 2, 4, 0.5, Math.PI * 2.2); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = shade(fur, 0.1); c.stroke(); }
  else if (L.tail === 'long') { const w = Math.sin(t * 0.1) * 4; seg(c, [P2(-4, y + 2), P2(-16, y + 6), P2(-26, y - 6 + w), P2(-24, y - 20 + w), P2(-17, y - 22 + w)], 3.5, fur); }
  else if (L.tail === 'stub') blob(c, -11, y - 1, 5, 5, fur);
  else if (L.tail === 'ringed') { const w = Math.sin(t * 0.08) * 3; c.save(); c.translate(-8, y); c.rotate(-0.5 + w * 0.03); c.beginPath(); c.ellipse(-14, -4, 18, 8, 0.2, 0, TAU); c.fillStyle = fur; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.save(); c.clip(); c.fillStyle = L.hair; for (let k = 0; k < 3; k++) c.fillRect(-28 + k * 10, -14, 4, 22); c.restore(); c.restore(); }
  else if (L.tail === 'dragon') {
    const w = Math.sin(t * 0.08) * 3;
    c.beginPath(); c.moveTo(-2, y - 9); c.quadraticCurveTo(-26, y - 2, -48, -6 + w); c.quadraticCurveTo(-24, y + 16, -2, y + 9); c.closePath();
    c.fillStyle = fur; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
    for (let i = 0; i < 4; i++) { const k = 0.2 + i * 0.2, x = lerp(-6, -44, k), yy = lerp(y - 8, -6 + w, k) - 2; c.beginPath(); c.moveTo(x - 4, yy + 2); c.lineTo(x - 1, yy - 7 + i); c.lineTo(x + 3, yy + 2); c.closePath(); c.fillStyle = L.hair; c.fill(); c.lineWidth = 1.6; c.stroke(); }
  }
}
function drawBat(c, f) {
  const t = f.clock, L = f.look, down = f.state === 'fall' || f.state === 'lying' || f.state === 'dead' || f.state === 'getup';
  const flap = down ? 0.2 : Math.sin(t * (f.state === 'skill' ? 0.9 : 0.55));
  c.save(); c.translate(0, -16);
  if (f.state === 'lying' || f.state === 'dead') { c.translate(0, 10); c.rotate(Math.PI * 0.9); }
  else if (f.state === 'hurt' || f.state === 'fall') c.rotate(-0.5);
  else if (f.state === 'skill') c.rotate(0.35);
  const wing = (sx, col) => {
    c.save(); c.scale(sx, 1); c.rotate(-flap * 0.5);
    c.beginPath(); c.moveTo(4, -2); c.lineTo(30, -14); c.lineTo(32, 2); c.quadraticCurveTo(26, -2, 22, 6); c.quadraticCurveTo(17, 0, 12, 8); c.quadraticCurveTo(9, 2, 4, 6); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.restore();
  };
  wing(-1, shade(L.fur, -0.25)); wing(1, L.fur);
  [[-6, -8], [4, -9]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, -6); c.lineTo(x + 1, y - 7); c.lineTo(x + 6, -7); c.closePath(); c.fillStyle = L.fur; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); });
  blob(c, 0, 0, 12, 11, L.fur);
  c.fillStyle = shade(L.fur, 0.35); c.beginPath(); c.ellipse(1, 4, 6, 5, 0, 0, TAU); c.fill();
  const ko = f.state === 'dead', hurt = f.state === 'hurt' || down;
  c.strokeStyle = INK; c.fillStyle = '#fff'; c.lineWidth = 1.6;
  if (ko || hurt) { c.lineWidth = 2; c.beginPath(); c.moveTo(1, -5); c.lineTo(5, -2); c.moveTo(5, -5); c.lineTo(1, -2); c.moveTo(7, -5); c.lineTo(11, -2); c.moveTo(11, -5); c.lineTo(7, -2); c.stroke(); }
  else { c.beginPath(); c.arc(3, -3, 3.2, 0, TAU); c.arc(9, -3, 2.8, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(4, -3, 1.4, 0, TAU); c.arc(9.8, -3, 1.3, 0, TAU); c.fill(); }
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(4, 3); c.lineTo(5, 7); c.lineTo(6.5, 3); c.moveTo(8, 3); c.lineTo(9, 6.5); c.lineTo(10, 3); c.fill();
  c.restore();
}

function inkSplat(c, f) {
  c.fillStyle = 'rgba(30,20,50,.85)';
  [[4, -3, 5], [9, 2, 3.5], [-2, 4, 3], [7, -8, 2.5]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
}
function drawCrab(c, f) {
  const t = f.clock, L = f.look, down = f.state === 'lying' || f.state === 'dead', hurt = f.state === 'hurt' || f.state === 'fall' || down;
  const atk = f.state === 'atk' ? ext(f.st, 1, f.atk.on, f.atk.off, f.atk.dur) : 0, walk = f.state === 'walk' || f.state === 'run' ? Math.sin(t * 0.5) : 0;
  c.save();
  if (down) { c.translate(0, -12); c.rotate(Math.PI); c.translate(0, 18); }
  else if (f.state === 'fall') c.rotate(-0.6);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) seg(c, [P2(sd * (6 + k * 5), -12), P2(sd * (16 + k * 5), -8 + (k & 1 ? walk : -walk) * 2), P2(sd * (20 + k * 5), 0)], 2.6, shade(L.shirt, -0.2));
  // claws
  const claw = (x, y, s, open) => { c.save(); c.translate(x, y); c.scale(s, s); seg(c, [P2(-8, 6), P2(0, 0)], 3, L.shirt); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14, -10 - open * 6, 18, -2); c.lineTo(10, 0); c.quadraticCurveTo(14, 6 + open * 6, 2, 6); c.closePath(); c.fillStyle = L.shirt; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.restore(); };
  claw(-18, -26, 0.8, 0.3);
  blob(c, 0, -18, 22, 14, L.shirt);
  c.fillStyle = shade(L.shirt, 0.3); c.beginPath(); c.ellipse(-4, -24, 10, 4, -0.2, 0, TAU); c.fill();
  for (const [x, h] of [[4, 14], [12, 12]]) { seg(c, [P2(x, -28), P2(x, -28 - h + 4)], 2.2, L.shirt); blob(c, x, -30 - h + 4, 4.5, 4.5, '#fff'); if (hurt) { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 2, -32 - h + 4); c.lineTo(x + 2, -28 - h + 4); c.moveTo(x + 2, -32 - h + 4); c.lineTo(x - 2, -28 - h + 4); c.stroke(); } else { c.fillStyle = INK; c.beginPath(); c.arc(x + 1.2, -30 - h + 4, 2, 0, TAU); c.fill(); } }
  claw(20 + atk * 12, -24 - atk * 4, 1.05, atk ? 1 : Math.max(0, Math.sin(t * 0.1)) * 0.3);
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(10, -14, 3, 0.2, Math.PI - 0.2); c.stroke();
  if (f.inkT > 0) inkSplat(c, f);
  c.restore();
}
function drawOcto(c, f) {
  const t = f.clock, L = f.look, down = f.state === 'lying' || f.state === 'dead', hurt = f.state === 'hurt' || f.state === 'fall' || down;
  const casting = f.state === 'skill' && f.st > 12 && f.st < 30, sweeping = f.state === 'skill' && f.skill === 'sweep' && f.st > 18 && f.st < 38;
  c.save();
  if (down) { c.translate(0, -6); c.rotate(-Math.PI / 2); c.translate(14, 0); } else if (f.state === 'fall') c.rotate(-0.5);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let k = 0; k < 6; k++) {
    const bx = -14 + k * 5.6, ph = t * 0.12 + k, reach = sweeping ? (k & 1 ? -1 : 1) * 30 : 0;
    const pts = [P2(bx, -22), P2(bx + Math.sin(ph) * 4 + reach * 0.3, -12), P2(bx + Math.sin(ph + 1) * 6 + reach * 0.7, -4), P2(bx + Math.sin(ph + 2) * 7 + reach + (k < 3 ? -6 : 6), 0)];
    seg(c, pts, 5, k & 1 ? L.shirt : shade(L.shirt, -0.12));
  }
  blob(c, 0, -36, 20, 19, L.shirt);
  c.fillStyle = shade(L.shirt, 0.25); [[-8, -46, 3.5], [6, -50, 2.5], [-12, -36, 2]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
  if (hurt) { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); for (const ex of [3, 12]) { c.moveTo(ex - 3, -38); c.lineTo(ex + 3, -32); c.moveTo(ex + 3, -38); c.lineTo(ex - 3, -32); } c.stroke(); }
  else for (const ex of [3, 12]) { blob(c, ex, -35, 4.5, 5, '#fff'); c.fillStyle = INK; c.beginPath(); c.arc(ex + 1.5, -35, 2.4, 0, TAU); c.fill(); }
  c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(18, -27); c.lineTo(casting ? 26 : 22, -26); c.stroke();
  blob(c, casting ? 24 : 21, -26, casting ? 4 : 3, casting ? 3.5 : 2.5, shade(L.shirt, -0.2));
  if (L.crown) { c.beginPath(); c.moveTo(-12, -52); c.lineTo(-10, -64); c.lineTo(-4, -56); c.lineTo(0, -66); c.lineTo(4, -56); c.lineTo(10, -64); c.lineTo(12, -52); c.closePath(); c.fillStyle = '#ffcc33'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }
  if (f.inkT > 0) inkSplat(c, f);
  c.restore();
}
function drawMagpie(c, f) {
  const t = f.clock, L = f.look, down = f.state === 'fall' || f.state === 'lying' || f.state === 'dead' || f.state === 'getup';
  const flap = down ? 0.2 : Math.sin(t * (f.state === 'skill' ? 0.9 : 0.5));
  c.save(); c.translate(0, -16);
  if (f.state === 'lying' || f.state === 'dead') { c.translate(0, 10); c.rotate(Math.PI * 0.85); }
  else if (f.state === 'hurt' || f.state === 'fall') c.rotate(-0.5); else if (f.state === 'skill') c.rotate(0.4);
  c.lineJoin = 'round';
  // long tail
  c.beginPath(); c.moveTo(-8, 2); c.lineTo(-40, 10 + Math.sin(t * 0.1) * 2); c.lineTo(-42, 4); c.lineTo(-10, -3); c.closePath(); c.fillStyle = L.shirt; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#fff'; c.fillRect(-44, 4, 6, 6);
  const wing = (dy, col) => { c.save(); c.rotate(-flap * 0.7); c.beginPath(); c.moveTo(-4, dy); c.quadraticCurveTo(-6, dy - 26, 8, dy - 30); c.quadraticCurveTo(10, dy - 12, 6, dy); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.restore(); };
  wing(-2, shade(L.shirt, -0.25));
  blob(c, 0, 0, 13, 9, L.shirt);
  blob(c, 11, -8, 8, 7.5, L.skin);
  c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(13, -9, 2.4, 0, TAU); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(13.5, -9, 1.2, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(17, -8); c.lineTo(26, -5); c.lineTo(17, -3); c.closePath(); c.fillStyle = '#e8432f'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
  wing(-1, L.shirt);
  seg(c, [P2(2, 8), P2(4, 14)], 2, '#e8432f'); seg(c, [P2(-3, 8), P2(-2, 14)], 2, '#e8432f');
  c.restore();
}
const DRAWERS = { bat: drawBat, crab: drawCrab, octo: drawOcto, magpie: drawMagpie };

function drawDog(c, f) {
  const t = f.clock, L = f.look, down = f.state === 'lying' || f.state === 'dead' || f.state === 'fall', run = f.state === 'walk' || f.state === 'run' ? Math.sin(t * 0.5) : 0;
  const atk = f.state === 'atk' ? ext(f.st, 1, f.atk.on, f.atk.off, f.atk.dur) : 0;
  c.save(); if (down) { c.translate(0, -8); c.rotate(-Math.PI / 2); c.translate(10, 0); }
  c.lineCap = 'round';
  seg(c, [P2(-12, -14), P2(-22, -24 + Math.sin(t * 0.4) * 4)], 3.5, L.fur);
  for (const [x, ph] of [[-8, 1], [8, -1]]) { seg(c, [P2(x, -10), P2(x + run * ph * 4, 0)], 4, shade(L.fur, -0.15)); }
  blob(c, 0, -14, 15, 9, L.fur);
  c.save(); c.translate(14 + atk * 6, -22); c.rotate(-0.1 + atk * 0.2);
  blob(c, 0, 0, 9, 8, L.fur); blob(c, 7, 3, 5, 4, L.skin); c.fillStyle = INK; c.beginPath(); c.arc(11, 1, 2, 0, TAU); c.fill(); c.beginPath(); c.arc(3, -2, 1.6, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-5, -3, 3.5, 6, 0.4, 0, TAU); c.fillStyle = shade(L.fur, -0.3); c.fill();
  if (atk > 0.3) { c.fillStyle = '#e8432f'; c.beginPath(); c.ellipse(8, 7, 3, 2, 0, 0, TAU); c.fill(); }
  c.restore();
  c.fillStyle = '#e8432f'; c.fillRect(6, -20, 4, 8);
  c.restore();
}
function drawDummy(c, f) {
  const hit = f.flash > 0 || f.state === 'hurt', sw = hit ? Math.sin(f.clock * 0.8) * 0.15 : 0;
  c.save(); c.rotate(sw);
  if (f.state === 'lying' || f.state === 'dead' || f.state === 'fall') { c.translate(0, -10); c.rotate(-Math.PI / 2); c.translate(20, 0); }
  seg(c, [P2(0, 0), P2(0, -60)], 5, '#8a5a34');
  seg(c, [P2(-26, -42), P2(26, -42)], 5, '#8a5a34');
  blob(c, 0, -36, 14, 18, '#d9b45a'); c.strokeStyle = 'rgba(120,80,30,.6)'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 4, -52); c.lineTo(k * 5, -20); c.stroke(); }
  blob(c, 0, -64, 12, 12, '#f2dca0');
  c.fillStyle = INK; c.beginPath(); c.arc(4, -66, 1.8, 0, TAU); c.arc(10, -66, 1.8, 0, TAU); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.arc(7, -61, 3, 0.2, Math.PI - 0.2); c.stroke();
  c.beginPath(); c.moveTo(-14, -70); c.lineTo(0, -84); c.lineTo(14, -70); c.closePath(); c.fillStyle = '#e8432f'; c.fill(); c.lineWidth = 2; c.stroke();
  c.restore();
}
DRAWERS.dog = drawDog; DRAWERS.dummy = drawDummy;
function drawCracker(c, x, y, s, lit) {
  c.save(); c.translate(x, y); c.scale(s, s);
  for (let i = -1; i <= 1; i++) { c.beginPath(); c.roundRect ? c.roundRect(i * 6 - 3, -10, 6, 18, 2) : c.rect(i * 6 - 3, -10, 6, 18); c.fillStyle = '#e8432f'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#ffcc33'; c.fillRect(i * 6 - 3, -2, 6, 3); }
  c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(4, -16, 1, -20); c.stroke();
  if (lit) { c.fillStyle = (Date.now() >> 6) & 1 ? '#ffcc33' : '#ff7a3d'; c.beginPath(); c.arc(1, -21, 3, 0, TAU); c.fill(); }
  c.restore();
}
function drawHeld(c, it, g) {
  if (it.kind === 'stick') {
    const dx = Math.sin(g.s2), dy = Math.cos(g.s2);
    seg(c, [P2(g.h.x - dx * 8, g.h.y - dy * 8), P2(g.h.x + dx * 34, g.h.y + dy * 34)], 4.5, '#b07a3d');
    blob(c, g.h.x, g.h.y, 6, 6, '#f3c79c');
  } else if (it.kind === 'stone') { blob(c, g.h.x, g.h.y - 6, 10, 8, '#9a9aa8'); }
  else if (it.kind === 'umbrella') {
    const open = it.holder && it.holder.state === 'defend', dx = Math.sin(g.s2), dy = Math.cos(g.s2);
    if (open) { // canopy opened towards the front
      c.save(); c.translate(g.h.x + 6, g.h.y - 4); c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(22, -24, 26, 0); c.quadraticCurveTo(22, 24, 0, 30); c.closePath();
      c.fillStyle = '#3fa9ff'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(14, -10, 18, 0); c.stroke(); c.restore();
    } else {
      seg(c, [P2(g.h.x - dx * 8, g.h.y - dy * 8), P2(g.h.x + dx * 40, g.h.y + dy * 40)], 3, '#5a4632');
      c.save(); c.translate(g.h.x + dx * 26, g.h.y + dy * 26); c.rotate(-g.s2 + Math.PI / 2); c.beginPath(); c.ellipse(0, 0, 16, 6, 0, 0, TAU); c.fillStyle = '#3fa9ff'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); c.restore();
    }
    blob(c, g.h.x, g.h.y, 6, 6, '#f3c79c');
  }
  else if (it.kind === 'slipper') { c.save(); c.translate(g.h.x, g.h.y - 4); c.rotate(-0.4); blob(c, 0, 0, 11, 5, '#3fa9ff'); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -4); c.lineTo(2, 1); c.lineTo(6, -4); c.stroke(); c.restore(); }
  else if (it.kind === 'cracker') { drawCracker(c, g.h.x, g.h.y - 6, 0.9, true); }
}

/* Draws something with a colour wash over it (the white hit flash, the tint of after-images).
   It goes through a small scratch canvas: ctx.filter would be simpler but is very slow on
   many phones and tablets (and missing in Safari), which made every hit stutter. */
const TINT = document.createElement('canvas'), TX = TINT.getContext('2d');
const TINT_BOX = [-80, -135, 160, 185];                 // local area around a fighter's feet
function tinted(c, col, amount, fn, maxScale = 3) {
  const T = c.getTransform(), s = Math.min(maxScale, Math.hypot(T.a, T.b) || 1), [x0, y0, w, h] = TINT_BOX;
  const pw = Math.ceil(w * s), ph = Math.ceil(h * s);
  if (TINT.width < pw) TINT.width = pw; if (TINT.height < ph) TINT.height = ph;
  TX.setTransform(1, 0, 0, 1, 0, 0); TX.globalAlpha = 1; TX.globalCompositeOperation = 'source-over'; TX.clearRect(0, 0, pw, ph);
  TX.setTransform(s, 0, 0, s, -x0 * s, -y0 * s); TX.lineCap = 'round'; TX.lineJoin = 'round'; fn(TX);
  TX.setTransform(1, 0, 0, 1, 0, 0); TX.globalCompositeOperation = 'source-atop'; TX.globalAlpha = amount; TX.fillStyle = col; TX.fillRect(0, 0, pw, ph);
  TX.globalCompositeOperation = 'source-over'; TX.globalAlpha = 1;
  c.drawImage(TINT, 0, 0, pw, ph, x0, y0, w, h);
}
/* Full fighter at its world position (camera already applied). */
function drawFighter(c, f) {
  const sx = f.x, gy = FLOOR_TOP + f.z, sy = gy - f.y;
  const sz = f.def.size || 1;
  const sh = 1 - Math.min(f.y, 160) / 260;
  if (f.invisible && f.dead) return;
  if (MAT) matShadow(c, sx, gy, 22 * sz * sh, 6 * sz * sh); else { c.fillStyle = 'rgba(20,16,40,.28)'; c.beginPath(); c.ellipse(sx, gy, 20 * sz * sh, 5.5 * sz * sh, 0, 0, TAU); c.fill(); }
  if (f.invisible) return;
  if (f.frogT > 0 && !f.dead) { c.save(); c.translate(sx, sy); c.scale(f.face * sz, sz); drawFrog(c, f); c.restore(); return; }
  const custom = f.def.draw || (f.def.fly ? 'bat' : null);
  if (custom && f.state !== 'frozen') {
    c.save(); c.translate(sx, sy); c.scale(f.face * sz, sz);
    if (f.flash > 0) tinted(c, '#ffffff', f.whiteT > 0 ? 0.85 : 0.4, cc => DRAWERS[custom](cc, f)); else DRAWERS[custom](c, f);
    c.restore(); return;
  }
  // after-images (drawn first, faded and tinted)
  if (f.ghosts && f.ghosts.length) for (const g of f.ghosts) {
    c.save(); c.globalAlpha = 0.32 * g.life / 12; c.translate(g.x, FLOOR_TOP + g.z - g.y); c.scale(g.face * sz, sz);
    if (g.P.rot) { c.translate(0, -g.P.rc + g.P.drop); c.rotate(g.P.rot); c.translate(0, g.P.rc); }
    tinted(c, f.state === 'fall' ? '#ffffff' : '#7fd8ff', 0.55, cc => drawBody(cc, f.look, g.P, { clock: f.clock, look: f.look, state: f.state, vx: 0 }), 1.2); c.restore();
  }
  // power-up glow when a special move starts
  if (f.auraT > 0) {
    const k = f.auraT / 22, col = f.def.enemy ? '255,90,70' : '255,190,60';
    c.save(); for (let r = 3; r >= 1; r--) { c.fillStyle = `rgba(${col},${0.16 * k})`; c.beginPath(); c.ellipse(sx, sy - 44 * sz, (26 + r * 12 + (1 - k) * 20) * sz, (50 + r * 10 + (1 - k) * 16) * sz, 0, 0, TAU); c.fill(); }
    c.strokeStyle = `rgba(255,220,90,${k})`; c.lineWidth = 4; c.beginPath(); c.ellipse(sx, gy, (30 + (1 - k) * 30) * sz, (9 + (1 - k) * 9) * sz, 0, 0, TAU); c.stroke(); c.restore();
  }
  const P = f.state === 'frozen' ? (f.frozenPose || pose(f)) : pose(f);
  if (f.state !== 'frozen') f.lastPose = P;
  // 分身術: two dark copies in the lanes beside you
  if (f.cloneT > 0) for (const dz of [-24, 24]) {
    c.save(); c.globalAlpha = f.cloneT < 60 ? 0.5 * f.cloneT / 60 : 0.5; c.translate(sx - f.face * 18, FLOOR_TOP + clamp(f.z + dz, 4, FLOOR_D - 4) - f.y); c.scale(f.face * sz, sz);
    tinted(c, '#2a2266', 0.55, cc => drawBody(cc, f.look, P, f), 1.5); c.restore();
  }
  let a = P.alpha;
  if ((f.invul > 0 && f.state !== 'lying' && f.state !== 'getup' && f.state !== 'roll' && f.state !== 'skill' && (f.clock >> 2) & 1)) a *= 0.45;
  if (f.state === 'dead' && f.st > 70) a *= Math.max(0, 1 - (f.st - 70) / 40);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(sx, sy); c.scale(f.face * sz, sz);
  if (f.shakeT > 0) c.translate((Math.random() - 0.5) * 3, 0);
  if (P.rot) { c.translate(0, -P.rc + P.drop); c.rotate(P.rot); c.translate(0, P.rc); }
  if (f.armorT > 0) { c.save(); c.globalAlpha = a * (0.35 + Math.sin(f.clock * 0.3) * 0.15); c.fillStyle = '#ffd34d'; c.beginPath(); c.ellipse(0, -40, 30, 48, 0, 0, TAU); c.fill(); c.restore(); }
  if (f.flash > 0) tinted(c, '#ffffff', f.whiteT > 0 ? 0.85 : 0.4, cc => drawBody(cc, f.look, P, f));
  else drawBody(c, f.look, P, f);
  if (f.state === 'frozen') {
    c.globalAlpha = a * 0.75; c.beginPath(); c.moveTo(-20, 2); c.lineTo(-24, -40); c.lineTo(-14, -84); c.lineTo(8, -90); c.lineTo(24, -60); c.lineTo(22, 2); c.closePath();
    const gr = c.createLinearGradient(-20, -90, 20, 0); gr.addColorStop(0, 'rgba(220,245,255,.85)'); gr.addColorStop(1, 'rgba(120,200,255,.6)');
    c.fillStyle = gr; c.fill(); c.strokeStyle = '#eaf9ff'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(-10, -70); c.lineTo(-4, -40); c.moveTo(10, -78); c.lineTo(14, -60); c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
  }
  c.restore();
  if (f.state === 'bubble') { // inside a floating bubble
    const by = sy - 40 * sz, r = 44 * sz; c.save(); c.beginPath(); c.arc(sx, by, r, 0, TAU); c.fillStyle = 'rgba(170,230,255,.28)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(120,200,255,.9)'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(sx - r * 0.4, by - r * 0.45, r * 0.2, r * 0.12, -0.6, 0, TAU); c.fill(); c.restore();
  }
  if (f.shieldHits > 0) { // 水之盾
    const by = sy - 40 * sz; c.save(); c.globalAlpha = 0.5 + Math.sin(f.clock * 0.2) * 0.15; c.beginPath(); c.ellipse(sx, by, 34 * sz, 50 * sz, 0, 0, TAU); c.strokeStyle = '#7fd8ff'; c.lineWidth = 4; c.stroke();
    c.fillStyle = 'rgba(127,216,255,.15)'; c.fill(); for (let i = 0; i < f.shieldHits; i++) { c.beginPath(); c.arc(sx - 10 + i * 10, by - 56 * sz, 3.5, 0, TAU); c.fillStyle = '#bff0ff'; c.fill(); } c.restore();
  }
  if (f.state === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const an = f.clock * 0.12 + i * TAU / 3; drawStar(c, sx + Math.cos(an) * 16 * sz, sy - 84 * sz + Math.sin(an) * 4, 5, '#ffd34d');
    }
  }
}
/* 變變變: a little frog (hops when moving) */
function drawFrog(c, f) {
  const hop = f.state === 'walk' || f.state === 'run' ? Math.abs(Math.sin(f.clock * 0.25)) * 8 : 0, y = -hop - (f.y > 0 ? 0 : 0);
  blob(c, -10, y - 4, 7, 4, '#4fae52'); blob(c, 12, y - 4, 7, 4, '#4fae52');
  blob(c, 0, y - 14, 18, 13, '#6fd06a');
  blob(c, 4, y - 14, 10, 8, '#c9f2b0');
  blob(c, -6, y - 28, 6, 6, '#6fd06a'); blob(c, 8, y - 28, 6, 6, '#6fd06a');
  c.fillStyle = INK; c.beginPath(); c.arc(-5, y - 28, 2.4, 0, TAU); c.arc(9, y - 28, 2.4, 0, TAU); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.arc(5, y - 20, 6, 0.3, Math.PI - 0.3); c.stroke();
  c.fillStyle = 'rgba(255,120,140,.5)'; c.beginPath(); c.ellipse(13, y - 19, 3, 1.8, 0, 0, TAU); c.fill();
}
/* finer drawing: iris colours, shirt emblems, soles, finger creases, hair sheen */
let DETAIL = MAT;
function hairSheen(c, L) { c.save(); c.strokeStyle = shade(L.hair, 0.45); c.globalAlpha = 0.8; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.arc(-1, -1, HR + 1.5, -2.35, -1.85); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.arc(-1, -1, HR - 1, -2.2, -2.0); c.stroke(); c.restore(); }
function drawEmblem(c, kind, x, y, col) {
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1;
  if (kind === 'flame') { c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(-4, 1, -1.5, -4.5); c.quadraticCurveTo(-0.5, -1, 1, -2.5); c.quadraticCurveTo(4, 1, 0, 4); c.fill(); c.stroke(); }
  else if (kind === 'flake') { c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); c.lineTo(-Math.cos(a) * 4, -Math.sin(a) * 4); } c.stroke(); }
  else if (kind === 'bolt') { c.beginPath(); c.moveTo(1, -5); c.lineTo(-3, 1); c.lineTo(0, 1); c.lineTo(-1, 5); c.lineTo(3, -1); c.lineTo(0, -1); c.closePath(); c.fill(); c.stroke(); }
  else if (kind === 'swirl') { c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); for (let a = 0; a < TAU * 1.5; a += 0.3) c.lineTo(Math.cos(a) * a * 0.5, Math.sin(a) * a * 0.5); c.stroke(); }
  else if (kind === 'paw') { c.beginPath(); c.ellipse(0, 1.5, 2.4, 2, 0, 0, TAU); c.fill(); for (const [px, py] of [[-2.6, -1.6], [-0.9, -3], [0.9, -3], [2.6, -1.6]]) { c.beginPath(); c.arc(px, py, 0.9, 0, TAU); c.fill(); } }
  else if (kind === 'star') drawStar(c, 0, 0, 4.5, col);
  else if (kind === 'drop') { c.beginPath(); c.moveTo(0, -4.5); c.quadraticCurveTo(3.5, 0.5, 0, 3.5); c.quadraticCurveTo(-3.5, 0.5, 0, -4.5); c.fill(); c.stroke(); }
  else if (kind === 'power') { c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; c.font = '900 5px "Noto Sans TC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('力', 0, 0.3); }
  else if (kind === 'shuriken') { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i & 1 ? 1.4 : 4.5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}
function drawStar(c, x, y, r, col) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i & 1 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
}
/* Head only, for the HUD and the character cards. */
function drawPortrait(c, L, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round'; c.lineJoin = 'round';
  const fake = { clock: 0, look: L };
  drawHair(c, L, true, fake, {}); if (L.style !== 'hood') blob(c, 0, 0, HR, HR, L.fur || L.skin); drawHair(c, L, false, fake, {}); drawFace(c, L, { face: 'n' });
  c.restore();
}


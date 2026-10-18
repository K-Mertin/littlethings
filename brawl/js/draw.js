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
function blob(c, x, y, rx, ry, col, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fillStyle = col; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
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
    case 'hurt': P.lean = -0.35; P.ht = -0.3; P.al = [-0.7, 0.5]; P.ar = [-0.2, 0.9]; P.face = 'hurt'; P.lr = [0.15, 0.2]; P.ll = [-0.35, 0.3]; break;
    case 'dizzy': P.lean = Math.sin(t * 0.12) * 0.2; P.ht = Math.sin(t * 0.12 + 1) * 0.25; P.al = [0.2, 0.3]; P.ar = [0.3, 0.3]; P.face = 'hurt'; break;
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
    case 'skill': { const S = SKILLS[f.skill]; if (S && S.pose) S.pose(P, t, f); break; }
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
    case 'archer':
      if (back) { c.beginPath(); c.moveTo(-4, -R); c.quadraticCurveTo(-R - 14, -R + 2, -R - 16, 8); c.quadraticCurveTo(-R - 4, 2, -R + 2, 6); c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); return; }
      c.beginPath(); c.arc(0, 0, R + 1.5, Math.PI * 0.95, Math.PI * 2.08); c.lineTo(R * 0.4, -4); c.quadraticCurveTo(-2, -2, -R, 8); c.closePath();
      c.fillStyle = hc; c.fill(); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
      break;
  }
}
function drawFace(c, L, P) {
  const R = HR;
  if (L.style !== 'hood' && !L.animal) { c.beginPath(); c.ellipse(-2, 1, 3, 4, 0, 0, TAU); c.fillStyle = shade(L.skin, -0.15); c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); } // ear
  const ex = R * 0.52, ey = -1;
  c.strokeStyle = INK; c.fillStyle = INK; c.lineWidth = 2; c.lineCap = 'round';
  if (P.face === 'hurt') { c.beginPath(); c.moveTo(ex - 2, ey - 3); c.lineTo(ex + 2, ey); c.lineTo(ex - 2, ey + 3); c.stroke(); }
  else if (P.face === 'ko') { c.beginPath(); c.moveTo(ex - 2.5, ey - 2.5); c.lineTo(ex + 2.5, ey + 2.5); c.moveTo(ex + 2.5, ey - 2.5); c.lineTo(ex - 2.5, ey + 2.5); c.stroke(); }
  else if (P.face === 'happy') { c.beginPath(); c.arc(ex, ey + 1.5, 2.6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  else {
    c.beginPath(); c.ellipse(ex, ey, 2, 3.4, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 0.6, ey - 1.3, 0.9, 0, TAU); c.fill();
    if (L.shades) { c.fillStyle = '#111'; c.beginPath(); c.roundRect ? c.roundRect(ex - 4, ey - 3, R * 0.6 + 4, 6, 2) : c.rect(ex - 4, ey - 3, R * 0.6 + 4, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(ex, ey - 2, 3, 1.5); }
  }
  // brow
  c.strokeStyle = INK; c.lineWidth = L.brow || 2; c.beginPath();
  if (L.angry) { c.moveTo(ex - 3.5, ey - 7); c.lineTo(ex + 3.5, ey - 4.5); } else { c.moveTo(ex - 3, ey - 6); c.lineTo(ex + 3, ey - 6.5); }
  if (L.style !== 'hood') c.stroke();
  // mouth
  if (L.style !== 'hood' && !L.animal) {
    c.lineWidth = 1.8; c.beginPath();
    if (P.face === 'hurt' || P.face === 'ko') { c.ellipse(R * 0.62, 6.5, 1.8, 2.2, 0, 0, TAU); c.fillStyle = '#7a2230'; c.fill(); c.stroke(); }
    else if (P.face === 'happy') { c.arc(R * 0.55, 5, 3, 0.1, Math.PI * 0.9); c.stroke(); }
    else { c.moveTo(R * 0.45, 6.5); c.lineTo(R * 0.8, 6); c.stroke(); }
  }
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
  const hand = (a, dk) => { const g = arm(a); blob(c, g.h.x, g.h.y, fist, fist, L.glove ? (dk ? shade(L.glove, -0.2) : L.glove) : (dk ? L.skinD : L.skin)); return g; };
  const foot = (a, side, dk) => { const g = leg(a, side); blob(c, g.ft.x + 3, g.ft.y - 1.5, big ? 9.5 : 8.5, 5.2, dk ? shade(L.shoe, -0.2) : L.shoe, -g.s * 0.3); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (L.tail) drawTail(c, L, hip, f);
  c.save(); c.translate(head.x, head.y); c.rotate(ha); drawHair(c, L, true, f, P); c.restore();
  hand(P.al, true); foot(P.ll, -1, true);
  // body: a small egg, shirt above and pants below
  c.save(); c.translate(hip.x, hip.y); c.rotate(P.lean);
  const egg = () => { c.beginPath(); c.ellipse(0, -th / 2, tw, th / 2 + 4, 0, 0, TAU); };
  egg(); c.save(); c.clip(); c.fillStyle = L.shirt; c.fillRect(-30, -40, 60, 60);
  if (L.belly) { c.fillStyle = L.belly; c.beginPath(); c.ellipse(4, -th / 2, tw * 0.6, th * 0.38, 0, 0, TAU); c.fill(); }
  if (!L.animal) { c.fillStyle = L.pants; c.fillRect(-30, -3, 60, 20); }
  if (L.trim) { c.fillStyle = L.trim; c.fillRect(-30, -th * 0.62, 60, 3); }
  if (L.belt) { c.fillStyle = L.belt; c.fillRect(-30, -6, 60, 3.5); }
  c.restore(); egg(); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke(); c.restore();
  foot(P.lr, 1, false);
  c.save(); c.translate(head.x, head.y); c.rotate(ha);
  if (L.style !== 'hood') blob(c, 0, 0, R, R, L.fur || L.skin);
  drawHair(c, L, false, f, P); drawFace(c, L, P); c.restore();
  const g = hand(P.ar, false);
  if (f && f.hold) drawHeld(c, f.hold, g);
  if (L.sling && !(f && f.hold)) { c.save(); c.translate(g.h.x, g.h.y); c.rotate(-g.s2 + Math.PI); seg(c, [P2(0, 2), P2(0, -8)], 2.5, '#a0662f'); seg(c, [P2(0, -8), P2(-4, -15)], 2.5, '#a0662f'); seg(c, [P2(0, -8), P2(4, -15)], 2.5, '#a0662f'); c.restore(); }
  return { head, hip, top };
}

function drawTail(c, L, hip, f) {
  const t = f ? f.clock : 0, fur = L.fur, y = hip.y;
  if (L.tail === 'curly') { c.beginPath(); c.arc(-9, y - 2, 4, 0.5, Math.PI * 2.2); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.lineWidth = 3; c.strokeStyle = shade(fur, 0.1); c.stroke(); }
  else if (L.tail === 'long') { const w = Math.sin(t * 0.1) * 4; seg(c, [P2(-4, y + 2), P2(-16, y + 6), P2(-26, y - 6 + w), P2(-24, y - 20 + w), P2(-17, y - 22 + w)], 3.5, fur); }
  else if (L.tail === 'stub') blob(c, -11, y - 1, 5, 5, fur);
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

/* Full fighter at its world position (camera already applied). */
function drawFighter(c, f) {
  const sx = f.x, gy = FLOOR_TOP + f.z, sy = gy - f.y;
  const sz = f.def.size || 1;
  const sh = 1 - Math.min(f.y, 160) / 260;
  if (f.invisible && f.dead) return;
  c.fillStyle = 'rgba(20,16,40,.28)'; c.beginPath(); c.ellipse(sx, gy, 20 * sz * sh, 5.5 * sz * sh, 0, 0, TAU); c.fill();
  if (f.invisible) return;
  if (f.def.fly && f.state !== 'frozen') {
    c.save(); c.translate(sx, sy); c.scale(f.face * sz, sz); if (f.flash > 0 && 'filter' in c) c.filter = 'brightness(1.9)'; drawBat(c, f); c.filter = 'none'; c.restore(); return;
  }
  const P = f.state === 'frozen' ? (f.frozenPose || pose(f)) : pose(f);
  if (f.state !== 'frozen') f.lastPose = P;
  let a = P.alpha;
  if ((f.invul > 0 && f.state !== 'lying' && f.state !== 'getup' && f.state !== 'roll' && f.state !== 'skill' && (f.clock >> 2) & 1)) a *= 0.45;
  if (f.state === 'dead' && f.st > 70) a *= Math.max(0, 1 - (f.st - 70) / 40);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(sx, sy); c.scale(f.face * sz, sz);
  if (f.shakeT > 0) c.translate((Math.random() - 0.5) * 3, 0);
  if (P.rot) { c.translate(0, -P.rc + P.drop); c.rotate(P.rot); c.translate(0, P.rc); }
  if (f.armorT > 0) { c.save(); c.globalAlpha = a * (0.35 + Math.sin(f.clock * 0.3) * 0.15); c.fillStyle = '#ffd34d'; c.beginPath(); c.ellipse(0, -40, 30, 48, 0, 0, TAU); c.fill(); c.restore(); }
  if (f.flash > 0 && 'filter' in c) c.filter = 'brightness(1.9) saturate(.6)';
  const parts = drawBody(c, f.look, P, f);
  c.filter = 'none';
  if (f.state === 'frozen') {
    c.globalAlpha = a * 0.75; c.beginPath(); c.moveTo(-20, 2); c.lineTo(-24, -40); c.lineTo(-14, -84); c.lineTo(8, -90); c.lineTo(24, -60); c.lineTo(22, 2); c.closePath();
    const gr = c.createLinearGradient(-20, -90, 20, 0); gr.addColorStop(0, 'rgba(220,245,255,.85)'); gr.addColorStop(1, 'rgba(120,200,255,.6)');
    c.fillStyle = gr; c.fill(); c.strokeStyle = '#eaf9ff'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(-10, -70); c.lineTo(-4, -40); c.moveTo(10, -78); c.lineTo(14, -60); c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
  }
  c.restore();
  if (f.state === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const an = f.clock * 0.12 + i * TAU / 3; drawStar(c, sx + Math.cos(an) * 16 * sz, sy - 84 * sz + Math.sin(an) * 4, 5, '#ffd34d');
    }
  }
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


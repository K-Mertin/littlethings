'use strict';
/* ------------------------- sculpted sprites -------------------------
   Parts baked from clay-like 3D models (tools/bake.html) are drawn in place of the
   flat shapes: head (with hair), body egg, fists and shoes. The skeleton, the
   animation and the 2D face (eyes, brows, mouth) are unchanged. ?sculpt=0 turns it off. */
let SCULPT = !/[?&]sculpt=0/.test(location.search) && typeof SPRITE_META !== 'undefined';
const SPR = {}, SPR_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/js\/sculpt\.js.*$/, '');
if (SCULPT) for (const id in SPRITE_META) {
  SPR[id] = {};
  for (const k in SPRITE_META[id].parts) {
    const im = new Image(), e = { im, half: SPRITE_META[id].parts[k].half, ok: false, dark: null };
    im.onload = () => { e.ok = true; if (k === 'fist' || k === 'shoe') { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(40,24,60,.3)'; g.fillRect(0, 0, cv.width, cv.height); e.dark = cv; } };
    im.src = `${SPR_BASE}sprites/${id}_${k}.png`; SPR[id][k] = e;
  }
}
/* the sprite set for a look, when every part has loaded */
function sculptOf(L) { if (!SCULPT || !L.sid) return null; const s = SPR[L.sid]; if (!s) return null; for (const k in s) if (!s[k].ok) return null; return s; }
function sprite(c, e, x, y, rot = 0, dark = false) {
  const h = e.half; if (!rot) { c.drawImage(dark && e.dark ? e.dark : e.im, x - h, y - h, h * 2, h * 2); return; }
  c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(dark && e.dark ? e.dark : e.im, -h, -h, h * 2, h * 2); c.restore();
}
for (const [id, L] of [['rex', CHARS.rex.look], ['moon', CHARS.moon.look], ['jia', BEASTS.jia.look]]) L.sid = id;

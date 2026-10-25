'use strict';
// 角色與頭像（全部用參數畫出來）
// 表情：n 平常、h 開心、s 嚇一跳、w 擔心／心虛、a 生氣、t 得意／思考、c 崩潰／哭
const PEOPLE = {
  me: { n: '你' },
  gp: { n: '鐘爺爺', skin: '#f6d2b0', hair: '#f4f1ea', style: 'gp', cloth: '#4f8a5a', cloth2: '#f4ead8', eye: '#5a7a4a', acc: ['roundGlasses', 'mustacheW', 'bow', 'vest'] },
  x: { n: '神秘人 X', sil: true },
  mochi: { n: '麻糬', cat: true },
  wang: { skirt: 1, n: '王阿姨', skin: '#f8d6b8', hair: '#7a4a2a', style: 'bun', cloth: '#f2a2a8', cloth2: '#fff6ee', eye: '#5a3a24', acc: ['apron', 'lash'] },
  lin: { n: '林先生', skin: '#f1cfae', hair: '#2e2a2a', style: 'part', cloth: '#3f4d75', cloth2: '#f4f0e6', eye: '#3a2a20', acc: ['squareGlasses', 'mustache', 'tie', 'suit'] },
  pang: { n: '小胖', skin: '#fbd9bc', hair: '#3b2a1f', style: 'short', cloth: '#f2b632', cloth2: '#fff', eye: '#4a2e1c', acc: ['cap', 'freckle', 'cream'], kid: true },
  zhe: { n: '阿哲', skin: '#f3d0ae', hair: '#5a3a24', style: 'short', cloth: '#fbf6ee', cloth2: '#e98a5a', eye: '#4a2e1c', acc: ['bandana', 'flour'] },
  ye: { skirt: 1, n: '葉館長', skin: '#f6d5b8', hair: '#6a6470', style: 'bob', cloth: '#8a5a9a', cloth2: '#f4ead8', eye: '#4a3a5a', acc: ['pearl', 'lash'] },
  zhou: { n: '老周', skin: '#eac4a0', hair: '#8e8a86', style: 'short', cloth: '#3e5a7a', cloth2: '#d9e2ea', eye: '#3a3a3a', acc: ['guardCap', 'mustacheG', 'wrinkle'] },
  jin: { n: '金先生', skin: '#f5d3b0', hair: '#c79a3a', style: 'slick', cloth: '#d9a548', cloth2: '#fff6dc', eye: '#6a4a1a', acc: ['monocle', 'bowRed', 'suit'] },
  lan: { skirt: 1, n: '小蘭', skin: '#f6d4b4', hair: '#2f2a2e', style: 'pony', cloth: '#6fae7a', cloth2: '#f4f0e6', eye: '#3a2a20', acc: ['scarf', 'lash'] },
  li: { n: '郵差小李', skin: '#f3d0ae', hair: '#3b2a1f', style: 'short', cloth: '#3f7f5a', cloth2: '#f4ead8', eye: '#4a2e1c', acc: ['postCap', 'button'] },
  mei: { skirt: 1, n: '阿美', skin: '#f8d8bc', hair: '#c4502c', style: 'twin', cloth: '#4fa3d8', cloth2: '#fff', eye: '#5a3a24', acc: ['blush', 'lash'] },
  wu: { n: '老吳', skin: '#efc9a6', hair: '#d9d4cc', style: 'bald', cloth: '#8c5634', cloth2: '#f4ead8', eye: '#4a3a2a', acc: ['beard', 'roundGlasses', 'wrinkle'] },
  mayor: { n: '鎮長', skin: '#f3cfab', hair: '#5a4a3a', style: 'short', cloth: '#3b3a4a', cloth2: '#fff', eye: '#3a2a20', acc: ['topHat', 'sash', 'mustache', 'suit'] },
  // 事件 4
  chen: { n: '陳站長', skin: '#eec8a4', hair: '#4a4a52', style: 'short', cloth: '#2e4a7a', cloth2: '#f4f0e6', eye: '#3a2a20', acc: ['stationCap', 'mustacheG', 'suit', 'wrinkle'] },
  yu: { shoe: '#2e4a5a', n: '魚老闆', skin: '#e9bf98', hair: '#2a2420', style: 'bald', cloth: '#4f9e9a', cloth2: '#f4f0e6', eye: '#3a2a20', acc: ['headband', 'apronB', 'beardS'] },
  ning: { skirt: 1, shoe: '#f08ab0', n: '寧寧', skin: '#fbe0c8', hair: '#5a3424', style: 'twin', cloth: '#f08ab0', cloth2: '#fff', eye: '#5a3a24', acc: ['blush', 'lash', 'ribbon'], kid: true },
  bai: { skirt: 1, n: '白小姐', skin: '#f9e0cc', hair: '#e8e0d4', style: 'bob', cloth: '#5a6aa8', cloth2: '#f4ead8', eye: '#4a5a8a', acc: ['lash', 'hatW', 'pearl'] },
  gao: { shoe: '#f4f0e6', n: '高同學', skin: '#f3cfae', hair: '#1e1a1a', style: 'short', cloth: '#d94a3a', cloth2: '#fff', eye: '#2a1a10', acc: ['squareGlasses', 'backpack'] },
};

const Face = {
  draw(who, e = 'n', live) {
    const P = PEOPLE[who];
    if (!P) return '';
    if (P.cat) return `<svg viewBox="-110 -170 220 190">${A.cat(0, 0, 1.4, 'sit', true)}</svg>`;
    if (P.sil) return `<svg viewBox="0 0 200 240"><defs><radialGradient id="silG" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#4a3a5a"/><stop offset="1" stop-color="#1e1626"/></radialGradient></defs><path d="M22 240q2-74 78-82q76 8 78 82z" fill="url(#silG)"/><path d="M40 112q-6-70 60-74q66 4 60 74q-4 50-60 54q-56-4-60-54z" fill="url(#silG)"/><path d="M30 76q70-40 140 0l-8 14q-62-30-124 0z" fill="#2a2032"/><ellipse cx="78" cy="104" rx="10" ry="5" fill="#9cf0b8" class="glowE"/><ellipse cx="122" cy="104" rx="10" ry="5" fill="#9cf0b8"/><text x="100" y="212" font-size="56" text-anchor="middle" fill="#9cf0b8" font-weight="900" opacity=".85">?</text></svg>`;
    const lid = live ? this.lids(P, e) : '';
    return `<svg viewBox="0 0 200 240">${this.body(P, e)}</svg>` + (lid ? `<svg class="lidL" viewBox="0 0 200 240">${lid}</svg>` : '');
  },
  body(P, e, anim) {
    const s = SW, sk = P.skin, hr = P.hair, acc = P.acc || [], kid = P.kid;
    const hy = kid ? 112 : 100, hrx = kid ? 52 : 50, hry = kid ? 50 : 56;
    const skD = shade(sk, -0.14), skL = shade(sk, 0.35), hrD = shade(hr, -0.25), hrL = shade(hr, 0.3);
    let o = '';
    // 背後的頭髮
    if (P.style === 'bob') o += `<path d="M40 ${hy}q0-68 60-68t60 68v44q-10 12-22 2H62q-12 10-22-2z" fill="${hr}" ${s}/><path d="M48 ${hy + 30}v22M152 ${hy + 30}v22" stroke="${hrD}" stroke-width="4" stroke-linecap="round"/>`;
    if (P.style === 'pony') o += `<path d="M136 ${hy - 32}q46 8 34 76q-14-12-22-44" fill="${hr}" ${s}/><path d="M150 ${hy - 20}q14 20 12 50" stroke="${hrL}" stroke-width="3" fill="none" opacity=".6"/>`;
    if (P.style === 'bun') o += `<circle cx="100" cy="${hy - 62}" r="22" fill="${hr}" ${s}/><path d="M86 ${hy - 70}q14-12 28 0" stroke="${hrL}" stroke-width="3" fill="none"/>`;
    if (P.style === 'twin') o += `<path d="M48 ${hy - 46}q-26 6-22 46q8 22 18 30q-4-36 10-60z" fill="${hr}" ${s}/><path d="M152 ${hy - 46}q26 6 22 46q-8 22-18 30q4-36-10-60z" fill="${hr}" ${s}/><circle cx="52" cy="${hy - 44}" r="7" fill="${acc.includes('ribbon') ? '#f2648a' : '#f2c232'}" ${SW2}/><circle cx="148" cy="${hy - 44}" r="7" fill="${acc.includes('ribbon') ? '#f2648a' : '#f2c232'}" ${SW2}/>`;
    if (acc.includes('backpack')) o += `<path d="M30 200q-6-30 20-36M170 200q6-30-20-36" stroke="#2a3a5a" stroke-width="10" fill="none"/>`;
    // 身體
    const clD = shade(P.cloth, -0.32), clL = shade(P.cloth, 0.3);
    o += `<path d="M20 240q4-66 80-72q76 6 80 72z" fill="${P.cloth}" ${s}/><path d="M20 240q4-66 80-72q76 6 80 72z" fill="url(#p-weave)"/><path d="M20 240q4-66 80-72q76 6 80 72z" fill="url(#cyl)" opacity=".55"/>`;
    o += `<path d="M34 238q4-26 16-44M166 238q-4-26-16-44M58 238q2-18 10-30M142 238q-2-18-10-30M70 236q6-10 4-22M130 236q-6-10-4-22" stroke="${clD}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".55"/><path d="M38 220q6-20 18-34M162 220q-6-20-18-34" stroke="${clL}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".45"/><path d="M50 184q14-10 30-12M150 184q-14-10-30-12" stroke="${clD}" stroke-width="1" fill="none" stroke-dasharray="2.5 2" opacity=".6"/>`;
    if (acc.includes('suit') || acc.includes('vest')) o += `<path d="M76 172l24 34 24-34 10 68H66z" fill="${acc.includes('vest') ? '#f4ead8' : P.cloth2}" ${s}/><path d="M76 172l16 30-8 6 16 32M124 172l-16 30 8 6-16 32" fill="none" stroke="${shade(P.cloth, -0.35)}" stroke-width="3"/>`;
    else o += `<path d="M82 170l18 24 18-24" fill="${P.cloth2}" ${s}/>`;
    if (acc.includes('vest')) o += `<path d="M84 186l16 22 16-22v54H84z" fill="#3f7a4a" ${SW2}/><circle cx="100" cy="220" r="3" fill="url(#brass)"/><circle cx="100" cy="232" r="3" fill="url(#brass)"/>`;
    o += `<path d="M44 214q8-14 4-30M156 214q-8-14-4-30" stroke="${shade(P.cloth, -0.3)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`;
    if (acc.includes('apron')) o += `<path d="M62 182q38 12 76 0l6 58H56z" fill="#fff6ee" ${s}/><path d="M80 210h40" stroke="#f2a2a8" stroke-width="4"/><path d="M90 222q10 6 20 0" stroke="#f2a2a8" stroke-width="3" fill="none"/>`;
    if (acc.includes('apronB')) o += `<path d="M64 184q36 10 72 0l6 56H58z" fill="#2e3a4a" ${s}/>${A.txt(100, 222, '魚', 18, '#f4f0e6', 'middle', 900)}`;
    if (acc.includes('flour')) o += `<g fill="#fff" opacity=".85"><circle cx="64" cy="210" r="5"/><circle cx="72" cy="218" r="3"/><circle cx="134" cy="204" r="4"/></g>`;
    if (acc.includes('sash')) o += `<path d="M50 186l100 54h-30L40 200z" fill="#d94a3a" ${s}/><path d="M58 192l84 46" stroke="#f2c46b" stroke-width="2"/>`;
    if (acc.includes('tie')) o += `<path d="M100 186l-8 10 8 34 8-34z" fill="#c4502c" ${s}/>`;
    if (acc.includes('bow')) o += `<path d="M100 184l-18-10v20zM100 184l18-10v20z" fill="#e0a43a" ${s}/><circle cx="100" cy="184" r="4" fill="#c08a2a" ${SW2}/>`;
    if (acc.includes('bowRed')) o += `<path d="M100 184l-18-10v20zM100 184l18-10v20z" fill="#c4502c" ${s}/>`;
    if (acc.includes('scarf')) o += `<path d="M64 172q36 16 72 0l4 12q-40 18-80 0z" fill="#f2c232" ${s}/><path d="M118 182l8 28-10 2z" fill="#f2c232" ${SW2}/>`;
    if (acc.includes('pearl')) for (let i = 0; i < 9; i++) o += `<circle cx="${72 + i * 7}" cy="${178 + Math.sin(i / 8 * Math.PI) * 10}" r="4" fill="#fffaf0" ${SW2}/>`;
    if (acc.includes('button')) o += `<circle cx="100" cy="206" r="5" fill="url(#brass)" ${SW2}/><circle cx="100" cy="226" r="5" fill="none" stroke="#2a4a3a" stroke-width="2" stroke-dasharray="3 3"/><path d="M60 196h16" stroke="#f2c46b" stroke-width="4"/>`;
    // 脖子、耳朵、頭
    o += `<path d="M86 ${hy + 38}h28v32q-14 8-28 0z" fill="${skD}" ${s}/>`;
    const ear = x => `<ellipse cx="${x}" cy="${hy + 6}" rx="10" ry="13" fill="${sk}" ${s}/><path d="M${x + (x < 100 ? 2 : -2)} ${hy}q${x < 100 ? -5 : 5} 6 0 12" stroke="${skD}" stroke-width="3" fill="none"/>`;
    o += ear(100 - hrx - 2) + ear(100 + hrx + 2);
    o += `<ellipse cx="100" cy="${hy + hry - 2}" rx="20" ry="7" fill="${shade(sk, -0.35)}" opacity=".45"/>`;
    o += `<ellipse cx="100" cy="${hy}" rx="${hrx}" ry="${hry}" fill="${sk}" ${s}/><ellipse cx="100" cy="${hy}" rx="${hrx}" ry="${hry}" fill="url(#skinG)"/>`;
    if (P.style !== 'bald') o += `<path d="M${100 - hrx + 8} ${hy - hry * 0.42}q${hrx - 8} 16 ${hrx * 2 - 16} 0" stroke="${skD}" stroke-width="7" fill="none" opacity=".28" stroke-linecap="round"/>`;
    o += `<path d="M${100 - hrx * 0.62} ${hy + hry * 0.62}q${hrx * 0.62} ${hry * 0.34} ${hrx * 1.24} 0" stroke="${skD}" stroke-width="1.1" fill="none" opacity=".45"/>`;
    o += `<path d="M${100 - hrx + 4} ${hy + 10}q${hrx - 4} ${hry + 6} ${hrx * 2 - 8} 0q-4 ${hry * 0.5} -${hrx - 4} ${hry * 0.85}q-${hrx - 8} -4 -${hrx - 4} -${hry * 0.85}z" fill="${skD}" opacity=".35"/>`;
    o += `<ellipse cx="${100 - 16}" cy="${hy - hry * 0.45}" rx="22" ry="12" fill="#fff" opacity=".22"/>`;
    if (acc.includes('wrinkle')) o += `<path d="M76 ${hy - 26}q24-6 48 0M80 ${hy - 18}q20-4 40 0" stroke="${skD}" stroke-width="2" fill="none" opacity=".8"/>`;
    // 腮紅
    const bl = acc.includes('blush') || kid ? 0.6 : 0.3;
    o += `<ellipse cx="66" cy="${hy + 20}" rx="10" ry="6" fill="#f29a8a" opacity="${e === 'h' ? bl + 0.2 : bl}"/><ellipse cx="134" cy="${hy + 20}" rx="10" ry="6" fill="#f29a8a" opacity="${e === 'h' ? bl + 0.2 : bl}"/>`;
    // 眼睛
    const ey = hy + 4, ex = 22, ic = P.eye || '#4a2e1c';
    const lash = acc.includes('lash');
    const eye = (x, side) => {
      if (e === 'h') return `<path d="M${x - 9} ${ey + 3}q9-12 18 0" ${SW} stroke-width="4" fill="none"/>`;
      if (e === 'c') return `<path d="M${x - 9} ${ey - 1}q9 9 18 0" ${SW} stroke-width="4" fill="none"/><path d="M${x + side * 2} ${ey + 6}q${side * 3} 16 ${side * 1} 30" stroke="#8fd0ff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
      const rw = e === 's' ? 9.5 : 7.5, rh = e === 's' ? 10.5 : 8.5, ir = e === 's' ? 3.4 : 5.6, dx = e === 'w' ? side * -2 : 0, dy = e === 'w' ? 2 : 0;
      let q = `<ellipse cx="${x}" cy="${ey}" rx="${rw}" ry="${rh}" fill="#fff" ${SW2}/><circle cx="${x + dx}" cy="${ey + dy + 1}" r="${ir}" fill="${ic}"/><circle cx="${x + dx}" cy="${ey + dy + 1}" r="${ir}" fill="url(#irisG)"/><circle cx="${x + dx}" cy="${ey + dy + 1}" r="${ir * 0.48}" fill="#1a0e08"/><path d="M${x - rw + 1} ${ey - rh * 0.3}q${rw - 1} -${rh * 0.75} ${rw * 2 - 2} 0" fill="#7a5a4a" opacity=".18"/><circle cx="${x + dx + ir * 0.4}" cy="${ey + dy - ir * 0.35}" r="${Math.max(1.4, ir * 0.35)}" fill="#fff"/><circle cx="${x + dx - ir * 0.35}" cy="${ey + dy + ir * 0.5}" r="1" fill="#fff" opacity=".8"/>`;
      q += `<path d="M${x - rw - 1} ${ey - 1}q${rw + 1} -${rh + 3} ${rw * 2 + 2} 0" stroke="#2a1a10" stroke-width="${lash ? 3.4 : 2.6}" fill="none" stroke-linecap="round"/><path d="M${x - rw + 2} ${ey + rh - 0.5}q${rw - 2} 3 ${rw * 2 - 4} 0" stroke="${skD}" stroke-width=".9" fill="none" opacity=".8"/><path d="M${x - rw * 0.8} ${ey - rh - 4.5}q${rw * 0.8} -3 ${rw * 1.6} 0" stroke="${skD}" stroke-width=".9" fill="none" opacity=".55"/>`;
      if (lash) q += `<path d="M${x + side * (rw + 1)} ${ey - 2}l${side * 5} -4" stroke="#2a1a10" stroke-width="2.5" stroke-linecap="round"/>`;
      // 生氣、得意：上眼皮蓋住一半
      if (e === 'a') q += `<path d="M${x - rw - 2} ${ey - rh - 2}H${x + rw + 2}V${ey - 2 + side * 3}L${x - rw - 2} ${ey - 2 - side * 3}z" fill="${sk}"/><path d="M${x - rw - 1} ${ey - 2 - side * 3}L${x + rw + 1} ${ey - 2 + side * 3}" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>`;
      if (e === 't' && side > 0) q += `<path d="M${x - rw - 2} ${ey - rh - 2}H${x + rw + 2}V${ey}H${x - rw - 2}z" fill="${sk}"/><path d="M${x - rw - 1} ${ey}H${x + rw + 1}" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>`;
      // 眨眼
      if (e !== 's' && anim) q += `<g class="blink"><ellipse cx="${x}" cy="${ey}" rx="${rw + 1.5}" ry="${rh + 1.5}" fill="${sk}"/><path d="M${x - rw} ${ey + 2}q${rw} 5 ${rw * 2} 0" stroke="#2a1a10" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
      return q;
    };
    o += eye(100 - ex, -1) + eye(100 + ex, 1);
    const brow = { n: [0, 0], h: [-4, -3], s: [-10, -9], w: [-4, 7], a: [7, -5], t: [-6, 2], c: [-2, 8] }[e] || [0, 0];
    const bc = P.style === 'bald' || P.style === 'gp' ? '#bdb6ac' : shade(hr, -0.3);
    o += `<path d="M${100 - ex - 11} ${ey - 16 + brow[1]}Q${100 - ex} ${ey - 21 + Math.min(brow[0], brow[1])} ${100 - ex + 10} ${ey - 16 + brow[0]}M${100 + ex - 10} ${ey - 16 + brow[0]}Q${100 + ex} ${ey - 21 + Math.min(brow[0], brow[1])} ${100 + ex + 11} ${ey - 16 + brow[1]}" stroke="${bc}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    // 鼻子
    o += `<path d="M101 ${hy + 12}q5 8 -2 11" stroke="${skD}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="97" cy="${hy + 17}" rx="3" ry="2" fill="#fff" opacity=".35"/>`;
    // 嘴
    const my = hy + 32;
    const mouth = {
      n: `<path d="M89 ${my}q11 8 22 0" ${SW} fill="none"/>`,
      h: `<path d="M84 ${my - 3}q16 22 32 0z" fill="#8a2a2a" ${SW2}/><path d="M89 ${my + 6}q11 8 22 0q-4 6-11 6t-11-6z" fill="#f08a8a"/><path d="M86 ${my - 2}h28v3H86z" fill="#fff"/>`,
      s: `<ellipse cx="100" cy="${my + 3}" rx="8" ry="10" fill="#7a2a2a" ${SW2}/><ellipse cx="100" cy="${my + 8}" rx="5" ry="3" fill="#f08a8a"/>`,
      w: `<path d="M87 ${my + 3}q6-6 13 0t13 0" ${SW} fill="none"/>`,
      a: `<path d="M86 ${my + 6}q14-12 28 0z" fill="#7a2a2a" ${SW2}/><path d="M89 ${my + 2}h22" stroke="#fff" stroke-width="3"/>`,
      t: `<path d="M88 ${my + 2}q12 4 24-6" ${SW} fill="none"/>`,
      c: `<path d="M86 ${my + 8}q14-16 28 0q-14-4-28 0z" fill="#7a2a2a" ${SW2}/>`,
    }[e] || '';
    o += mouth;
    // 表情符號
    if (e === 'w') o += `<path d="M152 ${hy - 34}q-8 14 0 19q8-5 0-19z" fill="#9fd8ff" ${SW2}/>`;
    if (e === 's') o += `<path d="M70 ${hy - 44}l-6-16M100 ${hy - 50}v-16M130 ${hy - 44}l6-16" stroke="#2a1a10" stroke-width="4" stroke-linecap="round"/><rect x="${100 - hrx + 8}" y="${hy - hry + 8}" width="${hrx * 2 - 16}" height="26" fill="#6a8ad0" opacity=".25" rx="12"/>`;
    if (e === 'a') o += `<path d="M138 ${hy - 40}l6 6m4-10l-6 6m-10 2l6-6m4 14l-6-6" stroke="#e0432d" stroke-width="4" stroke-linecap="round"/>`;
    if (acc.includes('freckle')) o += `<g fill="#c9845a"><circle cx="68" cy="${hy + 14}" r="2"/><circle cx="74" cy="${hy + 18}" r="2"/><circle cx="126" cy="${hy + 18}" r="2"/><circle cx="132" cy="${hy + 14}" r="2"/></g>`;
    if (acc.includes('cream')) o += `<ellipse cx="114" cy="${my + 4}" rx="5" ry="3" fill="#fff" ${SW2}/>`;
    const lens = (cx, cy, r, rect) => rect ? `<rect x="${cx - 15}" y="${cy - 11}" width="30" height="22" rx="4" fill="#cfe8ff" fill-opacity=".22" ${SW}/><path d="M${cx - 10} ${cy + 6}l12-14" stroke="#fff" stroke-width="3" opacity=".7"/>` : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#cfe8ff" fill-opacity=".22" ${SW}/><path d="M${cx - 8} ${cy + 4}a10 10 0 0 1 8-12" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
    if (acc.includes('roundGlasses')) o += lens(100 - ex, ey, 14) + lens(100 + ex, ey, 14) + `<path d="M${100 - ex + 14} ${ey}h${2 * ex - 28}" ${SW}/>`;
    if (acc.includes('squareGlasses')) o += lens(100 - ex, ey, 0, 1) + lens(100 + ex, ey, 0, 1) + `<path d="M${100 - ex + 15} ${ey}h${2 * ex - 30}" ${SW}/>`;
    if (acc.includes('monocle')) o += `<circle cx="${100 + ex}" cy="${ey}" r="14" fill="#fff" fill-opacity=".25" stroke="#c79a3a" stroke-width="4"/><path d="M${100 + ex + 12} ${ey + 8}q10 30-4 60" stroke="#c79a3a" stroke-width="2" fill="none"/>`;
    if (acc.includes('mustache') || acc.includes('mustacheG') || acc.includes('mustacheW')) { const mc = acc.includes('mustacheW') ? '#f4f1ea' : acc.includes('mustacheG') ? '#8e8a86' : '#2e2a2a'; o += `<path d="M100 ${my - 8}q-14-6-26 6q14 2 26-2q12 4 26 2q-12-12-26-6z" fill="${mc}" ${SW2}/>`; }
    if (acc.includes('beard')) o += `<path d="M58 ${hy + 16}q4 54 42 58q38-4 42-58q-12 18-42 18t-42-18z" fill="${hr}" ${s}/><path d="M80 ${hy + 52}q20 10 40 0" stroke="${shade(hr, -0.15)}" stroke-width="3" fill="none"/><path d="M90 ${my}q10 6 20 0" ${SW} fill="none"/>`;
    if (acc.includes('beardS')) o += `<path d="M70 ${hy + 30}q30 34 60 0" stroke="${hr}" stroke-width="6" fill="none" opacity=".5" stroke-dasharray="2 4"/>`;
    // 前面的頭髮
    const top = hy - hry;
    switch (P.style) {
      case 'gp': o += `<path d="M48 ${hy + 4}q-6-34 14-44q-6 22 4 38zM152 ${hy + 4}q6-34-14-44q6 22-4 38z" fill="${hr}" ${s}/><path d="M80 ${top + 6}q20-10 40 0" stroke="${hr}" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="92" cy="${top + 18}" rx="18" ry="7" fill="#fff" opacity=".35"/>`; break;
      case 'bun': case 'bob': case 'pony': case 'twin':
        o += `<path d="M46 ${hy - 2}q2-${hry + 6} 54-${hry + 6}t54 ${hry + 6}q-24-6-36-28q-16 18-64 28z" fill="${hr}" ${s}/><path d="M64 ${hy - 26}q14-24 40-28M118 ${hy - 30}q14 8 24 22" stroke="${hrL}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`; break;
      case 'part': o += `<path d="M46 ${hy - 4}q0-${hry + 4} 54-${hry + 4}t54 ${hry - 6}q-30 2-58-14q-10 16-50 32z" fill="${hr}" ${s}/><path d="M66 ${hy - 30}q16-20 30-24" stroke="${hrL}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`; break;
      case 'slick': o += `<path d="M48 ${hy - 8}q4-${hry + 2} 56-${hry + 2}t48 ${hry - 6}q-40-24-104 12z" fill="${hr}" ${s}/><path d="M68 ${top + 12}q30-10 66 6M74 ${top + 22}q26-8 54 2" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none"/>`; break;
      case 'short': o += `<path d="M48 ${hy - 4}q0-${hry + 2} 52-${hry + 2}t52 ${hry + 2}q-10-14-20-16q-14 8-30 4q-20 8-54 14z" fill="${hr}" ${s}/><path d="M70 ${hy - 34}q14-16 34-18" stroke="${hrL}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`; break;
      case 'bald': o += `<path d="M50 ${hy}q-4-20 6-30M150 ${hy}q4-20-6-30" stroke="${hr}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M76 ${top + 14}q14-8 30-6" stroke="#fff" stroke-opacity=".6" stroke-width="6" stroke-linecap="round" fill="none"/>`; break;
    }
    // 髮絲：細細的深色與亮色線條，讓頭髮有層次
    const hs = (d, d2) => `<path d="${d}" stroke="${hrD}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".7"/>` + (d2 ? `<path d="${d2}" stroke="${hrL}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>` : '');
    switch (P.style) {
      case 'bun': case 'bob': case 'pony': case 'twin':
        o += hs(`M118 ${hy - 30}q-20-18-50-12M116 ${hy - 33}q-26-10-56 6M114 ${hy - 36}q-12-16-36-20M120 ${hy - 30}q12-14 30-10M122 ${hy - 28}q16-2 28 18M110 ${hy - 26}q-24 2-44 18`, `M112 ${hy - 40}q-16-10-40-6M124 ${hy - 34}q14-8 26 2M60 ${hy - 14}q14-14 34-18`);
        if (P.style === 'bob') o += hs(`M44 ${hy + 10}v40M50 ${hy + 16}q-2 22 2 36M156 ${hy + 10}v40M150 ${hy + 16}q2 22-2 36`);
        if (P.style === 'bun') o += hs(`M86 ${hy - 66}q14-10 28 0M84 ${hy - 58}q16 6 32 0`);
        break;
      case 'part': o += hs(`M96 ${top + 2}q-16 8-30 30M94 ${top + 4}q-24 4-38 34M98 ${top + 3}q22-2 46 14M100 ${top + 6}q24 2 40 20`, `M92 ${top + 6}q-14 10-22 24M104 ${top + 4}q18 0 34 12`); break;
      case 'slick': o += hs(`M58 ${top + 26}q36-26 90-10M62 ${top + 34}q30-18 70-8M54 ${hy - 14}q20-20 50-24`); break;
      case 'short': o += hs(`M60 ${hy - 26}q8-20 26-28M76 ${hy - 26}q8-18 24-26M96 ${hy - 26}q10-16 26-20M116 ${hy - 26}q10-12 22-12M136 ${hy - 22}q6-8 12-6`, `M66 ${hy - 36}q10-14 26-20M104 ${hy - 40}q10-8 24-6`); break;
      case 'gp': o += hs(`M52 ${hy}q-4-20 8-36M148 ${hy}q4-20-8-36M84 ${top + 6}q16-6 32 0`); break;
    }
    // 帽子
    if (acc.includes('cap')) o += `<path d="M48 ${hy - 18}q0-42 52-42t52 42z" fill="#d94a3a" ${s}/><path d="M48 ${hy - 18}h82q22 0 32 8h-114z" fill="#b83a2a" ${s}/><circle cx="100" cy="${hy - 58}" r="4" fill="#b83a2a"/><path d="M70 ${hy - 40}q14-14 30-16" stroke="#fff" stroke-opacity=".4" stroke-width="4" fill="none"/>`;
    if (acc.includes('guardCap') || acc.includes('postCap') || acc.includes('stationCap')) { const cc = acc.includes('postCap') ? '#3f7f5a' : acc.includes('stationCap') ? '#2e4a7a' : '#2e4560'; o += `<path d="M44 ${hy - 26}q4-38 56-38t56 38z" fill="${cc}" ${s}/><path d="M60 ${hy - 46}q20-16 44-16" stroke="#fff" stroke-opacity=".3" stroke-width="4" fill="none"/><path d="M50 ${hy - 26}h100q-4 14-50 14t-50-14z" fill="#2a1a10" ${s}/><circle cx="100" cy="${hy - 42}" r="7" fill="url(#brass)" ${SW2}/>`; }
    if (acc.includes('topHat')) o += `<rect x="64" y="${top - 52}" width="72" height="58" rx="4" fill="#2a2630" ${s}/><rect x="44" y="${top + 2}" width="112" height="12" rx="6" fill="#2a2630" ${s}/><rect x="64" y="${top - 12}" width="72" height="10" fill="#c4502c"/><path d="M74 ${top - 46}v30" stroke="#fff" stroke-opacity=".25" stroke-width="6"/>`;
    if (acc.includes('hatW')) o += `<ellipse cx="100" cy="${top + 8}" rx="70" ry="12" fill="#f4ead8" ${s}/><path d="M66 ${top + 6}q4-36 34-36t34 36z" fill="#f4ead8" ${s}/><path d="M66 ${top}h68" stroke="#5a6aa8" stroke-width="6"/>`;
    if (acc.includes('bandana')) o += `<path d="M46 ${hy - 22}q54-32 108 0l-2 14q-52-26-104 0z" fill="#e98a5a" ${s}/><g fill="#fff" opacity=".7"><circle cx="72" cy="${hy - 28}" r="2"/><circle cx="100" cy="${hy - 34}" r="2"/><circle cx="128" cy="${hy - 28}" r="2"/></g>`;
    if (acc.includes('headband')) o += `<path d="M48 ${hy - 20}q52-26 104 0l-2 10q-50-22-100 0z" fill="#f4f0e6" ${s}/><path d="M146 ${hy - 18}l16 6-4 10z" fill="#f4f0e6" ${SW2}/>`;
    return o;
  },
  // 全身（站著的小人）：腳、腿、手臂＋上半身。viewBox 0 0 200 330（小孩腿比較短，一樣的框）
  fig(P, e = 'n') {
    const s = SW, kid = P.kid, cl = P.cloth, clD = shade(cl, -0.3), pants = P.pants || (P.skirt ? shade(P.skin, -0.05) : shade(cl, -0.55)), sk = P.skin;
    const legL = kid ? 44 : 64, top = 228, foot = top + legL + 12;
    let o = `<ellipse cx="100" cy="${foot + 12}" rx="70" ry="9" fill="#1e0d04" opacity=".22"/>`;
    // 腿
    if (P.skirt) {
      o += `<path d="M76 ${top}v${legL + 4}M124 ${top}v${legL + 4}" stroke="${K}" stroke-width="17" stroke-linecap="round"/><path d="M76 ${top}v${legL + 4}M124 ${top}v${legL + 4}" stroke="${shade(sk, -0.05)}" stroke-width="11" stroke-linecap="round"/>`;
      o += `<path d="M76 ${top + legL * 0.55}v${legL * 0.45 + 4}M124 ${top + legL * 0.55}v${legL * 0.45 + 4}" stroke="#fffaf0" stroke-width="11" stroke-linecap="round" opacity=".9"/>`;
    } else {
      o += `<path d="M58 ${top - 8}h84l-4 ${legL + 10}h-30l-8-${legL - 8}-8 ${legL - 8}h-30z" fill="${pants}" ${s}/><path d="M100 ${top + 4}v14" stroke="${shade(pants, -0.3)}" stroke-width="2"/><path d="M66 ${top + 6}l-2 ${legL}" stroke="#fff" stroke-opacity=".12" stroke-width="5"/>`;
    }
    // 鞋子
    const shoe = P.shoe || (P.skirt ? '#c4502c' : '#3a2a22');
    o += `<path d="M${P.skirt ? 60 : 56} ${foot - 4}q0-12 16-12h8q4 0 4 12z" fill="${shoe}" ${s}/><path d="M${P.skirt ? 112 : 112} ${foot - 4}q0-12 8-12h8q16 0 16 12z" fill="${shoe}" ${s}/><path d="M66 ${foot - 12}h12M122 ${foot - 12}h12" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>`;
    // 裙子
    if (P.skirt) o += `<path d="M44 ${top - 14}h112l14 ${legL * 0.5 + 8}q-70 14-140 0z" fill="${clD}" ${s}/><path d="M66 ${top - 8}l-6 ${legL * 0.5 + 8}M100 ${top - 8}v${legL * 0.5 + 12}M134 ${top - 8}l6 ${legL * 0.5 + 8}" stroke="${shade(clD, -0.25)}" stroke-width="2.5"/>`;
    // 手臂（在身體兩側）
    const arm = (x, d) => `<path d="M${x} 188q${d * 16} 18 ${d * 16} 64" stroke="${K}" stroke-width="25" stroke-linecap="round" fill="none"/><path d="M${x} 188q${d * 16} 18 ${d * 16} 64" stroke="${cl}" stroke-width="19" stroke-linecap="round" fill="none"/><path d="M${x + d * 6} 196q${d * 8} 14 ${d * 9} 46" stroke="#fff" stroke-opacity=".18" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="${x + d * 16}" cy="258" r="10.5" fill="${sk}" ${s}/>`;
    o += `<svg width="200" height="240" viewBox="0 0 200 240" overflow="visible">${this.body(P, e)}</svg>`;
    o += arm(40, -1) + arm(160, 1);
    if (!P.skirt) o += `<path d="M30 ${top - 2}h140" stroke="${shade(cl, -0.4)}" stroke-width="5" opacity=".7"/>`;
    return o;
  },
  // 閉上的眼皮（另一個圖層，用透明度眨眼，手機上很省）
  lids(P, e = 'n') {
    if (e === 'h' || e === 'c' || e === 's' || !P.skin) return '';
    const hy = P.kid ? 112 : 100, ey = hy + 4, sk = P.skin;
    return [78, 122].map(x => `<ellipse cx="${x}" cy="${ey}" rx="9.5" ry="10.5" fill="${sk}"/><path d="M${x - 8} ${ey + 2}q8 5 16 0" stroke="#2a1a10" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('');
  },
};


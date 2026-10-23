'use strict';
// 角色與頭像（全部用參數畫出來）
const PEOPLE = {
  me: { n: '你' },
  gp: { n: '鐘爺爺', skin: '#f6d2b0', hair: '#f4f1ea', style: 'gp', cloth: '#4f8a5a', cloth2: '#f4ead8', acc: ['roundGlasses', 'mustacheW', 'bow'] },
  x: { n: '神秘人 X', sil: true },
  mochi: { n: '麻糬', cat: true },
  wang: { n: '王阿姨', skin: '#f8d6b8', hair: '#7a4a2a', style: 'bun', cloth: '#f2a2a8', cloth2: '#fff6ee', acc: ['apron'] },
  lin: { n: '林先生', skin: '#f1cfae', hair: '#2e2a2a', style: 'part', cloth: '#3f4d75', cloth2: '#f4f0e6', acc: ['squareGlasses', 'mustache', 'tie'] },
  pang: { n: '小胖', skin: '#fbd9bc', hair: '#3b2a1f', style: 'short', cloth: '#f2b632', cloth2: '#fff', acc: ['cap', 'freckle'], kid: true },
  zhe: { n: '阿哲', skin: '#f3d0ae', hair: '#5a3a24', style: 'short', cloth: '#fbf6ee', cloth2: '#e98a5a', acc: ['bandana'] },
  ye: { n: '葉館長', skin: '#f6d5b8', hair: '#6a6470', style: 'bob', cloth: '#8a5a9a', cloth2: '#f4ead8', acc: ['pearl'] },
  zhou: { n: '老周', skin: '#eac4a0', hair: '#8e8a86', style: 'short', cloth: '#3e5a7a', cloth2: '#d9e2ea', acc: ['guardCap', 'mustacheG'] },
  jin: { n: '金先生', skin: '#f5d3b0', hair: '#c79a3a', style: 'slick', cloth: '#d9a548', cloth2: '#fff6dc', acc: ['monocle', 'bowRed'] },
  lan: { n: '小蘭', skin: '#f6d4b4', hair: '#2f2a2e', style: 'pony', cloth: '#6fae7a', cloth2: '#f4f0e6', acc: ['scarf'] },
  li: { n: '郵差小李', skin: '#f3d0ae', hair: '#3b2a1f', style: 'short', cloth: '#3f7f5a', cloth2: '#f4ead8', acc: ['postCap', 'button'] },
  mei: { n: '阿美', skin: '#f8d8bc', hair: '#c4502c', style: 'twin', cloth: '#4fa3d8', cloth2: '#fff', acc: ['blush'] },
  wu: { n: '老吳', skin: '#efc9a6', hair: '#d9d4cc', style: 'bald', cloth: '#8c5634', cloth2: '#f4ead8', acc: ['beard', 'roundGlasses'] },
  mayor: { n: '鎮長', skin: '#f3cfab', hair: '#5a4a3a', style: 'short', cloth: '#3b3a4a', cloth2: '#fff', acc: ['topHat', 'sash', 'mustache'] },
};

const Face = {
  draw(who, e = 'n') {
    const P = PEOPLE[who];
    if (!P) return '';
    if (P.cat) return `<svg viewBox="-110 -170 220 190">${A.cat(0, 0, 1.4)}</svg>`;
    if (P.sil) return `<svg viewBox="0 0 200 240"><path d="M30 240q0-70 70-80q70 10 70 80z" fill="#3b2a3f"/><circle cx="100" cy="100" r="54" fill="#3b2a3f"/><text x="100" y="124" font-size="70" text-anchor="middle" fill="#9cf0b8" font-weight="900">?</text></svg>`;
    return `<svg viewBox="0 0 200 240">${this.body(P, e)}</svg>`;
  },
  body(P, e) {
    const s = SW, sk = P.skin, hr = P.hair, acc = P.acc || [], kid = P.kid;
    const hy = kid ? 112 : 100, hrx = kid ? 52 : 50, hry = kid ? 50 : 56;
    let o = '';
    // 背後的頭髮
    if (P.style === 'bob') o += `<path d="M42 ${hy}q0-66 58-66t58 66v40q-10 10-20 0H62q-10 10-20 0z" fill="${hr}" ${s}/>`;
    if (P.style === 'pony') o += `<path d="M138 ${hy - 30}q40 10 30 70q-12-10-20-40" fill="${hr}" ${s}/>`;
    if (P.style === 'bun') o += `<circle cx="100" cy="${hy - 60}" r="22" fill="${hr}" ${s}/>`;
    if (P.style === 'twin') o += `<circle cx="50" cy="${hy - 40}" r="20" fill="${hr}" ${s}/><circle cx="150" cy="${hy - 40}" r="20" fill="${hr}" ${s}/>`;
    // 身體
    o += `<path d="M24 240q4-64 76-70q72 6 76 70z" fill="${P.cloth}" ${s}/>`;
    o += `<path d="M84 168l16 22 16-22" fill="${P.cloth2}" ${s}/>`;
    if (acc.includes('apron')) o += `<path d="M62 182q38 12 76 0l6 58H56z" fill="#fff6ee" ${s}/><path d="M80 210h40" stroke="#f2a2a8" stroke-width="4"/>`;
    if (acc.includes('sash')) o += `<path d="M50 186l100 54h-30L40 200z" fill="#d94a3a" ${s}/>`;
    if (acc.includes('tie')) o += `<path d="M100 186l-8 10 8 34 8-34z" fill="#c4502c" ${s}/>`;
    if (acc.includes('bow')) o += `<path d="M100 184l-18-10v20zM100 184l18-10v20z" fill="#e0a43a" ${s}/>`;
    if (acc.includes('bowRed')) o += `<path d="M100 184l-18-10v20zM100 184l18-10v20z" fill="#c4502c" ${s}/>`;
    if (acc.includes('scarf')) o += `<path d="M66 172q34 16 68 0l4 12q-38 18-76 0z" fill="#f2b632" ${s}/>`;
    if (acc.includes('pearl')) for (let i = 0; i < 9; i++) o += `<circle cx="${72 + i * 7}" cy="${178 + Math.sin(i / 8 * Math.PI) * 10}" r="4" fill="#fffaf0" ${SW2}/>`;
    if (acc.includes('button')) o += `<circle cx="100" cy="206" r="5" fill="url(#brass)" ${SW2}/><circle cx="100" cy="226" r="5" fill="url(#brass)" ${SW2}/>`;
    if (P.style === 'gp') o += `<path d="M70 176v64M130 176v64" stroke="#2f5a3a" stroke-width="4"/>`;
    // 脖子、頭
    o += `<rect x="88" y="${hy + 40}" width="24" height="26" fill="${shade(sk, -0.1)}" ${s}/>`;
    o += `<ellipse cx="${100 - hrx - 2}" cy="${hy + 6}" rx="10" ry="13" fill="${sk}" ${s}/><ellipse cx="${100 + hrx + 2}" cy="${hy + 6}" rx="10" ry="13" fill="${sk}" ${s}/>`;
    o += `<ellipse cx="100" cy="${hy}" rx="${hrx}" ry="${hry}" fill="${sk}" ${s}/>`;
    // 前面的頭髮
    const top = hy - hry;
    switch (P.style) {
      case 'gp': o += `<path d="M48 ${hy + 4}q-6-34 14-44q-6 22 4 38zM152 ${hy + 4}q6-34-14-44q6 22-4 38z" fill="${hr}" ${s}/><path d="M80 ${top + 6}q20-10 40 0" stroke="${hr}" stroke-width="6" fill="none" stroke-linecap="round"/>`; break;
      case 'bun': case 'bob': case 'pony': case 'twin':
        o += `<path d="M48 ${hy - 4}q2-${hry + 4} 52-${hry + 4}t52 ${hry + 4}q-24-6-36-26q-16 18-62 26z" fill="${hr}" ${s}/>`; break;
      case 'part': o += `<path d="M48 ${hy - 6}q0-${hry + 2} 52-${hry + 2}t52 ${hry - 8}q-30 2-56-14q-10 16-48 30z" fill="${hr}" ${s}/>`; break;
      case 'slick': o += `<path d="M50 ${hy - 10}q4-${hry} 54-${hry}t48 ${hry - 6}q-40-24-102 10z" fill="${hr}" ${s}/><path d="M70 ${top + 12}q30-10 64 6" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/>`; break;
      case 'short': o += `<path d="M50 ${hy - 6}q0-${hry} 50-${hry}t50 ${hry}q-10-14-20-16q-14 8-30 4q-20 8-50 12z" fill="${hr}" ${s}/>`; break;
      case 'bald': o += `<path d="M50 ${hy}q-4-20 6-30M150 ${hy}q4-20-6-30" stroke="${hr}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M76 ${top + 14}q14-8 30-6" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" fill="none"/>`; break;
    }
    // 臉
    const ey = hy + 4, ex = 22;
    const eye = (x) => {
      if (e === 'h') return `<path d="M${x - 8} ${ey + 2}q8-10 16 0" ${SW} fill="none"/>`;
      if (e === 's') return `<circle cx="${x}" cy="${ey}" r="8" fill="#fff" ${SW2}/><circle cx="${x}" cy="${ey}" r="3" fill="#2a1a10"/>`;
      if (e === 'a') return `<ellipse cx="${x}" cy="${ey + 2}" rx="5" ry="5" fill="#2a1a10"/>`;
      return `<ellipse cx="${x}" cy="${ey}" rx="5" ry="6.5" fill="#2a1a10"/><circle cx="${x + 2}" cy="${ey - 2}" r="1.8" fill="#fff"/>`;
    };
    o += eye(100 - ex) + eye(100 + ex);
    const brow = { n: [0, 0], h: [-3, -3], s: [-8, -8], w: [-4, 6], a: [6, -4], t: [-6, 2] }[e] || [0, 0];
    o += `<path d="M${100 - ex - 10} ${ey - 15 + brow[1]}L${100 - ex + 9} ${ey - 15 + brow[0]}M${100 + ex - 9} ${ey - 15 + brow[0]}L${100 + ex + 10} ${ey - 15 + brow[1]}" stroke="${P.style === 'bald' || P.style === 'gp' ? '#bdb6ac' : shade(hr, -0.2)}" stroke-width="4.5" stroke-linecap="round"/>`;
    const my = hy + 32;
    const mouth = { n: `<path d="M90 ${my}q10 7 20 0" ${SW} fill="none"/>`, h: `<path d="M86 ${my - 2}q14 18 28 0z" fill="#c4504a" ${SW2}/>`, s: `<ellipse cx="100" cy="${my + 2}" rx="7" ry="9" fill="#7a2a2a" ${SW2}/>`, w: `<path d="M88 ${my + 3}q6-5 12 0t12 0" ${SW} fill="none"/>`, a: `<path d="M88 ${my + 4}q12-9 24 0" ${SW} fill="none"/>`, t: `<path d="M90 ${my + 1}q10 4 20-4" ${SW} fill="none"/>` }[e];
    o += mouth;
    o += `<circle cx="${100 - 34}" cy="${hy + 20}" r="8" fill="#f29a8a" opacity="${acc.includes('blush') || kid ? 0.6 : 0.3}"/><circle cx="${100 + 34}" cy="${hy + 20}" r="8" fill="#f29a8a" opacity="${acc.includes('blush') || kid ? 0.6 : 0.3}"/>`;
    if (e === 'w' || e === 's') o += `<path d="M150 ${hy - 30}q-6 12 0 16q6-4 0-16z" fill="#8fd0ff" ${SW2}/>`;
    if (acc.includes('freckle')) o += `<g fill="#c9845a"><circle cx="68" cy="${hy + 14}" r="2"/><circle cx="74" cy="${hy + 18}" r="2"/><circle cx="126" cy="${hy + 18}" r="2"/><circle cx="132" cy="${hy + 14}" r="2"/></g>`;
    if (acc.includes('roundGlasses')) o += `<circle cx="${100 - ex}" cy="${ey}" r="14" fill="#fff" fill-opacity=".2" ${SW}/><circle cx="${100 + ex}" cy="${ey}" r="14" fill="#fff" fill-opacity=".2" ${SW}/><path d="M${100 - ex + 14} ${ey}h${2 * ex - 28}" ${SW}/>`;
    if (acc.includes('squareGlasses')) o += `<rect x="${100 - ex - 15}" y="${ey - 11}" width="30" height="22" rx="4" fill="#fff" fill-opacity=".2" ${SW}/><rect x="${100 + ex - 15}" y="${ey - 11}" width="30" height="22" rx="4" fill="#fff" fill-opacity=".2" ${SW}/><path d="M${100 - ex + 15} ${ey}h${2 * ex - 30}" ${SW}/>`;
    if (acc.includes('monocle')) o += `<circle cx="${100 + ex}" cy="${ey}" r="14" fill="#fff" fill-opacity=".25" stroke="#c79a3a" stroke-width="4"/><path d="M${100 + ex + 12} ${ey + 8}q10 30-4 60" stroke="#c79a3a" stroke-width="2" fill="none"/>`;
    if (acc.includes('mustache') || acc.includes('mustacheG') || acc.includes('mustacheW')) { const mc = acc.includes('mustacheW') ? '#f4f1ea' : acc.includes('mustacheG') ? '#8e8a86' : '#2e2a2a'; o += `<path d="M100 ${my - 8}q-14-6-26 6q14 2 26-2q12 4 26 2q-12-12-26-6z" fill="${mc}" ${SW2}/>`; }
    if (acc.includes('beard')) o += `<path d="M58 ${hy + 16}q4 54 42 58q38-4 42-58q-12 18-42 18t-42-18z" fill="${hr}" ${s}/><path d="M90 ${my}q10 6 20 0" ${SW} fill="none"/>`;
    // 帽子
    if (acc.includes('cap')) o += `<path d="M50 ${hy - 18}q0-40 50-40t50 40z" fill="#d94a3a" ${s}/><path d="M50 ${hy - 18}h80q20 0 30 8h-110z" fill="#b83a2a" ${s}/>`;
    if (acc.includes('guardCap') || acc.includes('postCap')) { const cc = acc.includes('postCap') ? '#3f7f5a' : '#2e4560'; o += `<path d="M46 ${hy - 26}q4-36 54-36t54 36z" fill="${cc}" ${s}/><path d="M52 ${hy - 26}h96q-4 14-48 14t-48-14z" fill="#2a1a10" ${s}/><circle cx="100" cy="${hy - 42}" r="7" fill="url(#brass)" ${SW2}/>`; }
    if (acc.includes('topHat')) o += `<rect x="64" y="${top - 52}" width="72" height="58" rx="4" fill="#2a2630" ${s}/><rect x="44" y="${top + 2}" width="112" height="12" rx="6" fill="#2a2630" ${s}/><rect x="64" y="${top - 12}" width="72" height="10" fill="#c4502c"/>`;
    if (acc.includes('bandana')) o += `<path d="M48 ${hy - 22}q52-30 104 0l-2 14q-50-24-100 0z" fill="#e98a5a" ${s}/>`;
    return o;
  },
};

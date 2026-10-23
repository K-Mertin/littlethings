'use strict';
// 道具圖示（100×100）與共用道具
const ITEMS = {};
const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ'];
const IC = {
  key(c = 'url(#brass)', bow = 'round') {
    const b = bow === 'round' ? `<circle cx="30" cy="50" r="18" fill="${c}" ${SW}/><circle cx="30" cy="50" r="7" fill="#fbf1df" ${SW2}/>` : `<path d="M14 36h30v28H14z" fill="${c}" ${SW}/><circle cx="29" cy="50" r="6" fill="#fbf1df" ${SW2}/>`;
    return `<g transform="rotate(-30 50 50)">${b}<path d="M46 46h40v8h-6v10h-7v-10h-5v7h-7v-7H46z" fill="${c}" ${SW}/></g>`;
  },
  paper(c = '#fffdf3', ink = '#9fb89a', rot = -6) { return `<g transform="rotate(${rot} 50 50)"><path d="M22 14h44l14 14v58H22z" fill="${c}" ${SW}/><path d="M66 14v14h14" fill="#e9dcc0" ${SW2}/>${[36, 48, 60, 72].map((y, i) => `<path d="M32 ${y}h${i === 3 ? 22 : 38}" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`).join('')}</g>`; },
  gear(n) { return A.gear(50, 50, 34, 'url(#brass)', 10) + `<circle cx="50" cy="50" r="17" fill="#fff3d0" ${SW2}/>` + A.txt(50, 57, ROMAN[n - 1], n >= 7 ? 15 : 19, '#6a3d10', 'middle', 900, 'font-family="serif"'); },
  jar(c) { return `<rect x="30" y="20" width="40" height="10" rx="3" fill="#b07644" ${SW}/><path d="M28 30h44v50q0 8-8 8H36q-8 0-8-8z" fill="${c}" ${SW}/><rect x="36" y="46" width="28" height="18" rx="3" fill="#fffdf3" ${SW2}/>`; },
  ball(c, ring) { return `<circle cx="50" cy="50" r="30" fill="${c}" ${SW}/><circle cx="40" cy="38" r="9" fill="#fff" opacity=".45"/>${ring ? `<ellipse cx="50" cy="50" rx="44" ry="10" fill="none" stroke="#e0c27a" stroke-width="5"/>` : ''}`; },
};
for (let i = 1; i <= 8; i++) ITEMS['g' + i] = { n: '音符齒輪 ' + ROMAN[i - 1], d: `黃銅做的小齒輪，中間刻著羅馬數字「${ROMAN[i - 1]}」。X 的字條說，集滿八枚，大八音盒就會重新唱歌。`, ic: () => IC.gear(i) };

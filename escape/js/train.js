'use strict';
// 第二部共用的美術：藍色特快的車廂（弧形天花板、車窗外流過的風景、絨布座椅、行李架）與鐘塔的石牆
const TR = {
  // 弧形天花板＋小圓燈；蓋在一般牆面的上方
  ceiling(c = '#f4ead2', rib = '#d9c49a') {
    let o = `<path d="M0 0H1000V92Q500 30 0 92z" fill="${c}"/><path d="M0 0H1000V92Q500 30 0 92z" fill="url(#p-noise)"/><path d="M0 92Q500 30 1000 92" stroke="${shade(rib, -0.3)}" stroke-width="3" fill="none"/><path d="M0 98Q500 36 1000 98" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none"/>`;
    for (let x = 60; x < 1000; x += 110) { const yb = 92 - 62 * (1 - Math.pow((x - 500) / 500, 2)); o += `<path d="M${x} 0V${yb.toFixed(1)}" stroke="${rib}" stroke-width="6"/><path d="M${x - 2} 0V${yb.toFixed(1)}" stroke="#fff" stroke-opacity=".4" stroke-width="1.4"/>`; }
    o += `<rect width="1000" height="24" fill="url(#aoDn)" opacity=".35"/>`;
    [200, 500, 800].forEach(x => { const yb = 92 - 62 * (1 - Math.pow((x - 500) / 500, 2)) - 24; o += `<ellipse cx="${x}" cy="${yb + 30}" rx="90" ry="22" fill="url(#lampG)" opacity=".7"/><path d="M${x - 26} ${yb}h52q0 18-26 18t-26-18z" fill="#fff6dc" ${SW2}/><path d="M${x - 28} ${yb}h56" stroke="url(#brass)" stroke-width="4"/><ellipse cx="${x - 8}" cy="${yb + 7}" rx="8" ry="3" fill="#fff" opacity=".8"/>`; A.fx(`<circle class="flick" cx="${x}" cy="${yb + 14}" r="40" fill="url(#lampG)" style="${A.ad(3.3)}"/>`); });
    return o;
  },
  // 車窗：外面的山、樹、電線桿會一直往後跑（只動 transform，夾在窗框裡）
  _wid: 0,
  scenery(x, y, w, h, night) {
    let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${night ? 'skyNight' : 'sky'})"/>`;
    if (!night) o += `<circle cx="${x + w * 0.78}" cy="${y + h * 0.22}" r="${w * 0.08}" fill="#fff6c8"/><circle cx="${x + w * 0.78}" cy="${y + h * 0.22}" r="${w * 0.16}" fill="#fffbe0" opacity=".4"/>`;
    else for (let i = 0; i < 10; i++) o += `<circle cx="${x + 10 + (i * 41) % (w - 20)}" cy="${y + 8 + (i * 23) % (h * 0.45)}" r="${0.8 + i % 3 * 0.4}" fill="#fff8d0"/>`;
    o += `<path d="M${x} ${y + h * 0.62}l${w * 0.2} -${h * 0.16}l${w * 0.18} ${h * 0.08}l${w * 0.24} -${h * 0.14}l${w * 0.2} ${h * 0.1}l${w * 0.18} -${h * 0.06}V${y + h}H${x}z" fill="${night ? '#2a3466' : '#b8cfe0'}" opacity=".9"/>`;
    // 會動的近景：兩份一樣的內容接在一起，往左跑一份的寬度＝無縫循環
    const L = w * 1.6; let mv = '';
    for (const off of [0, L]) {
      mv += `<path d="M${x + off} ${y + h * 0.78}q${L * 0.12}-${h * 0.12} ${L * 0.25} -${h * 0.02}t${L * 0.25} -${h * 0.04}t${L * 0.25} ${h * 0.02}t${L * 0.25} 0V${y + h}H${x + off}z" fill="${night ? '#1e2a4a' : '#8cc47a'}"/>`;
      for (let k = 0; k < 4; k++) { const tx = x + off + L * (0.1 + k * 0.25), ty = y + h * 0.74, r = h * 0.09; mv += `<path d="M${tx} ${ty + r}v${r}" stroke="#6a4a2a" stroke-width="3"/><circle cx="${tx}" cy="${ty}" r="${r}" fill="${night ? '#16243a' : '#5f9e4a'}"/><circle cx="${tx - r * 0.3}" cy="${ty - r * 0.3}" r="${r * 0.5}" fill="${night ? '#1e3048' : '#7ab86a'}"/>`; }
      for (let k = 0; k < 2; k++) { const px = x + off + L * (0.2 + k * 0.5); mv += `<path d="M${px} ${y + h}V${y + h * 0.18}M${px - 12} ${y + h * 0.24}h24" stroke="${night ? '#0e1428' : '#5a4a3a'}" stroke-width="4"/>`; }
      mv += `<path d="M${x + off} ${y + h * 0.27}Q${x + off + L * 0.25} ${y + h * 0.36} ${x + off + L * 0.5} ${y + h * 0.27}T${x + off + L} ${y + h * 0.27}" stroke="${night ? '#0e1428' : '#4a3a2a'}" stroke-width="1.2" fill="none"/>`;
    }
    A.fx(`<g><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><g class="passX" style="--d:${-L}px;animation-duration:${(L / 90).toFixed(1)}s;${A.ad(L / 90)}">${mv}</g></svg></g>`);
    o += `<path d="M${x} ${y + h * 0.82}h${w}V${y + h}H${x}z" fill="${night ? '#1e2a4a' : '#8cc47a'}"/>`; // 動畫關掉時也有地面
    return o;
  },
  window(x, y, w, h, o = {}) {
    let s = `<rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="22" fill="${o.frame || '#7a4a2a'}" ${SW}/><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="22" fill="url(#p-grainH)"/><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="22" fill="url(#bevel)"/><rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="16" fill="none" stroke="url(#brass)" stroke-width="3"/>`;
    s += `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#cfe6f4"/>${this.scenery(x, y, w, h, o.night)}</svg>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#glassR)"/><rect x="${x}" y="${y}" width="${w}" height="12" fill="url(#aoDn)" opacity=".5"/><path d="M${x} ${y + h * 0.45}h${w}" stroke="${o.frame || '#7a4a2a'}" stroke-width="6"/><path d="M${x} ${y + h * 0.45 - 2}h${w}" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>`;
    // 拉一半的捲簾
    const bh = o.blind == null ? h * 0.22 : o.blind;
    if (bh) s += `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${bh}" fill="#e9d6a8" ${SW2}/><rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${bh}" fill="url(#p-weave)"/>${[...Array(Math.max(1, Math.floor(bh / 9)))].map((_, k) => `<path d="M${x} ${y + 6 + k * 9}h${w}" stroke="#c9b083" stroke-width="1"/>`).join('')}<rect x="${x - 4}" y="${y + bh - 6}" width="${w + 8}" height="8" rx="3" fill="#a8703f" ${SW2}/><circle cx="${x + w / 2}" cy="${y + bh + 6}" r="5" fill="url(#brass)" ${SW2}/>`;
    return s;
  },
  // 有高椅背的絨布長椅（側面看）
  seat(x, y, w, c = '#3f6a5a') {
    const cD = shade(c, -0.25), cL = shade(c, 0.18);
    let s = A.sh(x + w / 2, y + 4, w * 0.55, 10, 0.3);
    s += `<rect x="${x}" y="${y - 210}" width="${w}" height="160" rx="18" fill="${c}" ${SW}/><rect x="${x}" y="${y - 210}" width="${w}" height="160" rx="18" fill="url(#p-knit)"/><rect x="${x}" y="${y - 210}" width="${w}" height="160" rx="18" fill="url(#cyl)" opacity=".5"/>`;
    for (let k = 1; k < 4; k++) s += `<path d="M${x + k * w / 4} ${y - 200}v140" stroke="${cD}" stroke-width="2"/><circle cx="${x + k * w / 4}" cy="${y - 150}" r="3" fill="${cD}"/>`;
    s += `<path d="M${x + w * 0.3} ${y - 210}h${w * 0.4}v34q-${w * 0.2} 10 -${w * 0.4} 0z" fill="#fffaf0" ${SW2}/><path d="M${x + w * 0.3} ${y - 178}q${w * 0.05} 6 ${w * 0.1} 0t${w * 0.1} 0t${w * 0.1} 0t${w * 0.1} 0" stroke="#c9b083" stroke-width="1.2" fill="none"/>`;
    s += `<rect x="${x - 6}" y="${y - 62}" width="${w + 12}" height="40" rx="14" fill="${cL}" ${SW}/><rect x="${x - 6}" y="${y - 62}" width="${w + 12}" height="40" rx="14" fill="url(#p-knit)"/><path d="M${x + 6} ${y - 56}h${w - 12}" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>`;
    s += `<rect x="${x + 4}" y="${y - 22}" width="${w - 8}" height="22" fill="#5a3a24" ${SW2}/><path d="M${x + 10} ${y - 12}h${w - 20}" stroke="url(#brass)" stroke-width="2"/>`;
    s += `<rect x="${x - 16}" y="${y - 96}" width="22" height="58" rx="8" fill="#7a4a2a" ${SW}/><rect x="${x - 16}" y="${y - 96}" width="22" height="58" rx="8" fill="url(#p-grainV)"/><rect x="${x + w - 6}" y="${y - 96}" width="22" height="58" rx="8" fill="#7a4a2a" ${SW}/><rect x="${x + w - 6}" y="${y - 96}" width="22" height="58" rx="8" fill="url(#p-grainV)"/>`;
    return s;
  },
  // 黃銅行李架（上面有網子）
  rack(x, y, w) {
    let s = `<path d="M${x} ${y}h${w}" stroke="#4a3222" stroke-width="7"/><path d="M${x} ${y}h${w}" stroke="url(#brass)" stroke-width="4"/><path d="M${x} ${y + 22}h${w}" stroke="#4a3222" stroke-width="6"/><path d="M${x} ${y + 22}h${w}" stroke="url(#brass)" stroke-width="3"/>`;
    let net = ''; for (let k = 0; k <= w; k += 14) net += `M${x + k} ${y}l7 22M${x + k + 7} ${y}l-7 22`;
    s += `<path d="${net}" stroke="#c9a14a" stroke-width="1" opacity=".75"/>`;
    for (let k = 0; k <= 1; k++) { const bx = x + 10 + k * (w - 20); s += `<path d="M${bx} ${y + 22}q-6 22 -26 30" stroke="#4a3222" stroke-width="6" fill="none"/><path d="M${bx} ${y + 22}q-6 22 -26 30" stroke="url(#brass)" stroke-width="3" fill="none"/>`; }
    return s;
  },
  // 吊環（會微微晃）
  straps(xs, y) { xs.forEach((x, i) => A.fx(`<g class="sway" style="transform-origin:${x}px ${y}px;animation-duration:${2.6 + (i % 3) * 0.4}s;${A.ad(3)}"><path d="M${x} ${y}v34" stroke="#e9d6a8" stroke-width="5"/><path d="M${x} ${y}v34" stroke="#4a3222" stroke-width="1" opacity=".4"/><circle cx="${x}" cy="${y + 46}" r="11" fill="none" stroke="#4a3222" stroke-width="7"/><circle cx="${x}" cy="${y + 46}" r="11" fill="none" stroke="#fffaf0" stroke-width="4"/></g>`)); return ''; },
  // 車廂兩頭的牆（中間一扇滑門）
  endDoor(x, y, w, h, o = {}) {
    let s = `<rect x="${x - 18}" y="${y - 18}" width="${w + 36}" height="${h + 18}" rx="6" fill="#5a3a24" ${SW}/><rect x="${x - 18}" y="${y - 18}" width="${w + 36}" height="${h + 18}" rx="6" fill="url(#p-grainV)"/>`;
    if (o.open) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3a2a22"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#lampG)" opacity=".6"/><path d="M${x} ${y + h}l${w * 0.3} -${h * 0.35}h${w * 0.4}l${w * 0.3} ${h * 0.35}" fill="#6a4a32" opacity=".7"/>`;
    s += `<g transform="translate(${o.open ? w * 0.86 : 0} 0)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${o.c || '#8c5634'}" ${SW}/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#p-grainV)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#bevel)"/><rect x="${x + w * 0.2}" y="${y + 24}" width="${w * 0.6}" height="${h * 0.34}" rx="10" fill="#cfe6f4" ${SW2}/><rect x="${x + w * 0.2}" y="${y + 24}" width="${w * 0.6}" height="${h * 0.34}" rx="10" fill="url(#glassR)"/><rect x="${x + 14}" y="${y + h * 0.5}" width="${w - 28}" height="${h * 0.42}" rx="6" fill="none" stroke="#4a3222" stroke-opacity=".35" stroke-width="1.5"/><rect x="${x + w - 26}" y="${y + h * 0.5}" width="10" height="44" rx="4" fill="url(#brass)" ${SW2}/></g>`;
    if (o.label) s += `<rect x="${x + w / 2 - 64}" y="${y - 54}" width="128" height="30" rx="6" fill="#2a3a4a" ${SW2}/>` + A.txt(x + w / 2, y - 33, o.label, 16, '#f2c46b', 'middle', 900);
    return s;
  },
};

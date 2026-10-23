'use strict';
// 曉鐘傳說：怪物正面圖（全部以程式繪製，座標以 48×48 為基準，可放大成頭目）
const MTPL = {
  mushroom(p, c, o) {
    p.ell2(17, 44, 5, 3, c.b); p.ell(24, 35, 11, 10, c.b);
    p.ell(24, 20, 20, 14, c.a, { clipY: 27, hl: true });
    p.ell(24, 27, 17, 3.5, darken(c.b, 0.15));
    for (const [x, y, r] of [[14, 15, 3.6], [29, 11, 4], [35, 20, 3], [22, 21, 2.6], [8, 22, 2]]) p.ell(x, y, r, r * 0.85, c.c || '#fffaf0', { flat: false, noEdge: true });
    p.eye2(20, 34, 2.4, '#1a1020', { tall: 1.4 });
    if (o.angry) { p.line(16, 29, 22, 31, '#1a1020', 1.2); p.line(32, 29, 26, 31, '#1a1020', 1.2); }
    p.line(21, 39, 27, 39, '#5a2a2a', 1); p.dot(21, 38, '#5a2a2a'); p.dot(27, 38, '#5a2a2a');
    if (o.crown) { p.poly([[14, 6], [16, -1], [20, 4], [24, -3], [28, 4], [32, -1], [34, 6]], '#f2c14e'); p.dot(24, 2, '#e03050', 1); }
  },
  rat(p, c) {
    p.line(36, 40, 44, 34, c.a, 2); p.line(44, 34, 43, 26, c.a, 1.6);
    p.ell(24, 34, 13, 11, c.a); p.ell(24, 37, 8, 7, c.b);
    p.ell2(13, 11, 6, 6, c.a); p.ell2(13, 11, 3.5, 3.5, c.c, { flat: true });
    p.ell(24, 20, 11, 9, c.a, { hl: true }); p.ell(24, 25, 5.5, 4, c.b);
    p.ell(24, 22.5, 2, 1.5, '#1a1020', { flat: true }); p.rect(22, 28, 4, 3, '#ffffff', { flat: true }); p.line(24, 28, 24, 31, '#c8c8c8', 0.6);
    p.eye2(18.5, 18, 2.4, c.e || '#1a1020');
    p.line(17, 25, 9, 23, '#3a2a2a', 0.6); p.line(17, 26, 9, 27, '#3a2a2a', 0.6); p.line(31, 25, 39, 23, '#3a2a2a', 0.6); p.line(31, 26, 39, 27, '#3a2a2a', 0.6);
    p.ell2(16, 44, 4, 2.5, c.c);
  },
  bat(p, c) {
    p.poly2([[20, 20], [2, 8], [5, 17], [0, 26], [8, 23], [9, 32], [15, 26], [19, 30]], c.b);
    p.line2(19, 21, 3, 9, darken(c.b, 0.4), 0.8); p.line2(18, 24, 6, 22, darken(c.b, 0.4), 0.6);
    p.poly2([[19, 14], [17, 5], [23, 13]], c.a);
    p.ell(24, 24, 8, 10, c.a, { hl: true });
    p.eye2(20.5, 21, 2.2, c.e || '#d02020');
    p.poly([[21, 28], [22, 31], [23, 28]], '#ffffff', { flat: true }); p.poly([[25, 28], [26, 31], [27, 28]], '#ffffff', { flat: true });
    p.line(21, 28, 27, 28, '#3a0a1a', 0.8);
  },
  plant(p, c) {
    p.ell2(13, 40, 9, 4, c.b); p.ell2(9, 32, 6, 3, c.b);
    p.line(24, 46, 24, 26, darken(c.b, 0.2), 4); p.line(24, 46, 24, 26, c.b, 2.6);
    p.line2(20, 30, 8, 22, c.b, 1.2); p.ell2(7, 21, 2.5, 2.5, c.c || '#ff7aa0');
    p.ell(24, 17, 15, 12, c.a, { hl: true });
    p.ell(24, 21, 11, 5, '#3a0a1a', { flat: true });
    for (let x = 15; x <= 31; x += 3) { p.poly([[x, 17], [x + 1.5, 20.5], [x + 3, 17]], '#fffaf0', { flat: true }); p.poly([[x, 25], [x + 1.5, 22], [x + 3, 25]], '#fffaf0', { flat: true }); }
    p.eye2(18, 10, 2.6, '#1a1020'); p.dot(14, 15, c.c || '#ff7aa0', 1);
  },
  grub(p, c) {
    p.line2(12, 38, 6, 45, '#3a2a2a', 1.2); p.line2(18, 40, 14, 46, '#3a2a2a', 1.2);
    p.ell(24, 32, 19, 11, c.a);
    p.ell(12, 24, 8, 7, c.b); p.ell(36, 24, 8, 7, c.b); p.ell(24, 21, 9, 8, c.b, { hl: true });
    p.ell(8, 31, 3, 2, c.c || '#7ab048'); p.ell(30, 18, 3, 2, c.c || '#7ab048');
    p.eye2(19, 33, 2, '#1a1020'); p.poly2([[19, 38], [21, 43], [23, 38]], '#e8e0c8');
  },
  crab(p, c) {
    for (let i = 0; i < 3; i++) p.line2(14 - i * 2, 32 + i * 3, 4 - i, 40 + i * 2, darken(c.a, 0.2), 1.4);
    p.line2(16, 26, 9, 20, c.a, 2);
    p.ell2(7, 15, 6.5, 7, c.a, { hl: true }); p.poly2([[4, 8], [7, 15], [10, 7]], '#000000', { flat: true });
    p.ell(24, 30, 15, 10, c.a, { hl: true }); p.ell(24, 33, 10, 5, c.b);
    p.line2(20, 22, 18, 13, darken(c.a, 0.2), 1.2); p.eye2(18, 12, 2.4, '#1a1020');
    p.line(21, 34, 27, 34, '#3a0a0a', 0.8);
  },
  imp(p, c) {
    p.poly2([[19, 26], [5, 16], [8, 24], [4, 30], [12, 28], [18, 33]], c.b);
    p.line(30, 38, 40, 42, c.a, 1.4); p.poly([[39, 39], [44, 43], [39, 45]], c.a);
    p.line(37, 18, 37, 46, '#5a4a3a', 1.4); p.poly([[33, 17], [34, 10], [36, 16], [37, 8], [38, 16], [40, 10], [41, 17]], '#c0c8d8');
    p.ell(24, 34, 8, 9, c.a); p.ell2(18, 44, 3, 2.5, c.a);
    p.ell2(15, 32, 3, 4, c.a); p.ell(24, 19, 10, 9, c.a, { hl: true });
    p.poly2([[16, 13], [12, 3], [20, 11]], c.c || '#f4e8c8');
    p.eye2(20, 18, 2.4, '#1a1020', { white: '#ffe060' }); p.line(19, 25, 29, 25, '#3a0a1a', 1); p.poly([[21, 25], [22, 27], [23, 25]], '#ffffff', { flat: true });
  },
  skeleton(p, c) {
    p.line(36, 4, 34, 30, '#c8ccd8', 1.6); p.line(31, 26, 39, 26, '#8a6a3a', 1.4);
    p.line2(19, 36, 17, 46, c.a, 1.8); p.ell2(16, 46, 3, 1.5, c.a);
    p.ell(24, 35, 6, 3, c.a);
    p.line(24, 20, 24, 34, c.a, 1.8);
    for (let i = 0; i < 4; i++) p.ell(24, 22 + i * 3, 8 - i, 1.2, c.a, { flat: true });
    p.line2(16, 21, 12, 30, c.a, 1.6); p.line2(12, 30, 14, 36, c.a, 1.6);
    p.ell(24, 11, 8.5, 8, c.a, { hl: true }); p.rect(19, 16, 10, 4, c.a);
    p.ell2(20.5, 11, 2.6, 2.8, '#1a1020', { flat: true }); p.dot(20.5, 11.5, c.e || '#ff5040', 0.8); p.dot(27.5, 11.5, c.e || '#ff5040', 0.8);
    for (let x = 20; x <= 28; x += 2) p.line(x, 17, x, 19, '#1a1020', 0.5);
    if (c.c) { p.ell(10, 30, 6, 8, c.c, { hl: true }); p.dot(10, 30, '#f2c14e', 1.2); }
  },
  wolf(p, c, o) {
    if (o.fire) { for (const [x, y, s] of [[10, 10, 6], [38, 10, 6], [24, 4, 7], [16, 6, 5], [32, 6, 5]]) p.poly([[x - s / 2, y + s], [x, y - s], [x + s / 2, y + s]], '#ff8a20'); }
    p.rect2(14, 36, 6, 10, c.a); p.ell2(17, 46, 4, 2, darken(c.a, 0.2));
    p.ell(24, 36, 13, 9, c.a); p.ell(24, 38, 6, 6, c.b);
    p.poly2([[13, 14], [11, 1], [21, 10]], c.a); p.poly2([[14, 12], [13, 5], [18, 10]], c.c || '#e0a0a0', { flat: true });
    p.ell(24, 20, 12, 10, c.a, { hl: true });
    p.ell(24, 27, 6.5, 5, c.b); p.ell(24, 24.5, 2.4, 1.6, '#1a1020', { flat: true });
    p.eye2(18.5, 18, 2.2, c.e || '#1a1020', { white: '#fff4a0' });
    p.line(20, 30, 28, 30, '#3a0a1a', 0.8); p.poly2([[21, 30], [22, 33], [23, 30]], '#ffffff', { flat: true });
    p.line2(16, 16, 21, 17, '#1a1020', 0.8);
  },
  lantern(p, c) {
    p.line(24, 0, 24, 6, '#3a3a4a', 1); p.ell(24, 4, 4, 3, '#3a3a4a', { flat: true }); p.ell(24, 4, 2.5, 1.6, '#000', { flat: true });
    p.poly([[16, 7], [32, 7], [36, 12], [12, 12]], c.b);
    p.rect(14, 12, 20, 22, c.a, { hl: true });
    p.rect(16, 14, 16, 18, c.c || '#ffd84a', { flat: true }); p.rect(18, 16, 12, 14, '#fff6c0', { flat: true });
    p.line(24, 12, 24, 34, c.b, 1); p.line(14, 23, 34, 23, c.b, 0.8);
    p.ell2(20.5, 20, 2, 2.4, '#1a1020', { flat: true }); p.ell(24, 27, 3, 2, '#1a1020', { flat: true });
    p.poly([[12, 34], [36, 34], [32, 38], [16, 38]], c.b);
    p.poly([[18, 38], [30, 38], [28, 44], [24, 41], [20, 47]], '#c8d8ff', { flat: true });
  },
  wisp(p, c) {
    for (let i = 0; i < 3; i++) { const a = i * 2.1; p.line(24 + Math.cos(a) * 18, 24 + Math.sin(a) * 14, 24 + Math.cos(a + 1.2) * 12, 24 + Math.sin(a + 1.2) * 18, c.b, 1.4); }
    p.poly2([[18, 22], [4, 12], [8, 26]], lighten(c.b, 0.3));
    p.ell(24, 24, 13, 13, lighten(c.a, 0.25), { flat: true }); p.ell(24, 24, 10, 10, c.a, { hl: true });
    p.eye2(20, 23, 2.2, '#1a1020'); p.ell(24, 29, 2, 1.4, '#1a1020', { flat: true });
    p.dot(6, 36, c.b, 1); p.dot(42, 8, c.b, 1); p.dot(40, 38, '#ffffff', 0.8);
    p.poly([[20, 36], [24, 46], [28, 36]], c.a);
  },
  gargoyle(p, c) {
    p.poly2([[18, 20], [1, 4], [3, 14], [0, 22], [6, 20], [5, 30], [16, 28]], c.b);
    p.rect(14, 42, 20, 6, darken(c.a, 0.2));
    p.ell2(16, 40, 5, 4, c.a); p.ell(24, 32, 11, 10, c.a, { hl: true });
    p.ell2(13, 34, 3.5, 7, c.a); p.poly2([[11, 40], [12, 44], [14, 40]], '#e8e0d0');
    p.ell(24, 17, 9, 8, c.a, { hl: true }); p.poly2([[17, 12], [13, 2], [21, 10]], c.c || '#e8e0d0');
    p.eye2(20.5, 16, 2, c.e || '#ff3030', { white: '#ffd040' }); p.rect(20, 21, 8, 2, '#1a1020', { flat: true });
  },
  golem(p, c, o) {
    p.rect2(14, 36, 8, 11, c.b);
    p.rect(11, 16, 26, 22, c.a, { hl: true });
    p.rect2(3, 17, 8, 16, c.b); p.rect2(2, 32, 10, 9, c.a);
    p.rect(17, 4, 14, 12, c.a, { hl: true }); p.rect(19, 9, 10, 3, '#1a1020', { flat: true }); p.rect(21, 10, 6, 1, c.e || '#ff6040', { flat: true });
    p.ell(24, 26, 4, 4, c.c || '#5ad0ff', { shine: true });
    p.line(12, 24, 20, 26, darken(c.a, 0.35), 0.6); p.line(30, 18, 34, 30, darken(c.a, 0.35), 0.6);
    if (o.spikes) for (const x of [12, 18, 30, 36]) p.poly([[x - 2, 17], [x, 10], [x + 2, 17]], c.c || '#c8ecff');
  },
  mole(p, c) {
    for (const [x, h] of [[12, 12], [18, 16], [24, 18], [30, 16], [36, 12]]) p.poly([[x - 3, 22], [x, 22 - h], [x + 3, 22]], c.c, { shine: true });
    p.ell(24, 32, 16, 13, c.a, { hl: true }); p.ell(24, 36, 9, 7, c.b);
    p.ell(24, 29, 3.5, 2.6, '#ff8aa0'); p.eye2(19, 25, 1.6, '#1a1020');
    p.ell2(9, 40, 5, 4, c.b); for (const x of [6, 9, 12]) p.line(x, 42, x - 1, 46, '#f4f4f4', 0.8);
    for (const x of [36, 39, 42]) p.line(x, 42, x + 1, 46, '#f4f4f4', 0.8);
  },
  scorpion(p, c) {
    for (let i = 0; i < 3; i++) p.line2(16 - i * 2, 34 + i * 2, 5 - i, 42 + i * 2, darken(c.a, 0.25), 1.3);
    p.line2(16, 30, 9, 26, c.a, 2); p.ell2(7, 22, 6, 5, c.a, { hl: true }); p.poly2([[2, 18], [6, 22], [3, 26]], '#000', { flat: true });
    p.ell(24, 34, 12, 8, c.a, { hl: true });
    p.ell(30, 25, 4.5, 4, c.a); p.ell(34, 17, 4, 4, c.a); p.ell(32, 9, 4, 3.6, c.a); p.ell(26, 5, 3.6, 3.2, c.a);
    p.poly([[22, 5], [17, 9], [21, 2]], c.c || '#d03030');
    p.eye2(20.5, 32, 1.8, '#1a1020', { white: '#ffd040' });
  },
  cactus(p, c) {
    p.ell2(11, 24, 4, 9, c.a); p.ell2(11, 16, 4, 4, c.a);
    p.ell(24, 26, 11, 19, c.a, { hl: true });
    for (let i = 0; i < 9; i++) p.dot(15 + (i * 7) % 18, 10 + (i * 11) % 32, '#f4f0d0', 0.5);
    p.line(18, 10, 18, 44, darken(c.a, 0.25), 0.6); p.line(30, 10, 30, 44, darken(c.a, 0.25), 0.6);
    p.eye2(20, 22, 2, '#1a1020'); p.ell(24, 30, 3, 2.4, '#3a0a1a', { flat: true });
    p.ell(24, 6, 4, 3, c.c || '#ff6a9a', { hl: true }); p.ell(24, 6, 1.5, 1.2, '#ffe060', { flat: true });
    p.ell2(19, 46, 5, 2.4, '#c8a060');
  },
  snake(p, c) {
    p.ell(24, 41, 17, 6, c.a); p.ell(24, 34, 13, 5, c.a, { hl: true }); p.ell(24, 40, 10, 2, c.b, { flat: true });
    p.rect(19, 18, 10, 16, c.a); p.rect(21, 18, 6, 16, c.b, { flat: true });
    for (let y = 20; y < 34; y += 3) p.line(21, y, 27, y, darken(c.b, 0.25), 0.5);
    p.ell(24, 14, 15, 9, darken(c.a, 0.1)); p.ell(24, 13, 9, 7, c.a, { hl: true });
    p.eye2(20, 12, 2, '#1a1020', { white: '#ff4040' });
    p.line(24, 19, 24, 24, '#e03040', 0.8); p.line(24, 24, 22, 26, '#e03040', 0.6); p.line(24, 24, 26, 26, '#e03040', 0.6);
  },
  scarab(p, c) {
    for (let i = 0; i < 3; i++) p.line2(12, 22 + i * 7, 3, 20 + i * 9, '#2a1a10', 1.2);
    p.ell(24, 30, 16, 14, c.a, { hl: true, shine: true });
    p.line(24, 18, 24, 44, darken(c.a, 0.5), 1);
    p.ell(24, 14, 9, 6, c.b, { hl: true }); p.poly([[21, 10], [24, 0], [27, 10]], c.b);
    p.eye2(19.5, 14, 1.8, '#1a1020', { white: '#ff5050' });
    p.ell2(17, 28, 3, 5, lighten(c.a, 0.3), { flat: true, noEdge: true });
  },
  mummy(p, c) {
    p.rect2(16, 36, 6, 11, c.a);
    p.rect(14, 16, 20, 22, c.a, { hl: true });
    p.ell2(9, 22, 5, 3.5, c.a); p.ell2(4, 22, 3, 3, c.a);
    p.ell(24, 10, 8, 8.5, c.a, { hl: true });
    for (let y = 4; y < 46; y += 3) p.line(12, y + (y % 2), 36, y - 1, darken(c.a, 0.22), 0.5);
    p.dot(21, 9, '#1a1020', 1.6); p.dot(21, 9, c.e || '#ff3020', 0.8);
    p.line(25, 8, 29, 11, darken(c.a, 0.35), 1.6);
    p.line(30, 38, 36, 46, lighten(c.a, 0.2), 1);
  },
  yeti(p, c) {
    p.ell2(16, 45, 6, 3, c.a);
    p.ell2(8, 32, 5, 12, c.a); p.ell2(7, 42, 4, 3, c.b);
    p.ell(24, 30, 16, 15, c.a, { hl: true });
    p.poly2([[15, 14], [10, 5], [19, 13]], '#d8d0c0');
    p.ell(24, 21, 9, 7, c.b, { hl: true });
    p.eye2(20.5, 19, 2, '#1a1020', { white: '#fff4a0' });
    p.ell(24, 25, 5, 2.4, '#3a0a1a', { flat: true }); p.poly2([[20, 24], [21, 27], [22, 24]], '#ffffff', { flat: true });
  },
  dragon(p, c, o) {
    p.poly2([[16, 20], [0, 2], [2, 12], [-1, 20], [5, 20], [3, 30], [12, 28]], c.b);
    p.line2(15, 20, 2, 4, darken(c.b, 0.4), 0.8);
    p.ell2(15, 44, 5, 3, c.a); p.rect2(13, 36, 6, 9, c.a);
    p.ell(24, 34, 12, 11, c.a, { hl: true }); p.ell(24, 36, 7, 8, c.c || lighten(c.a, 0.35));
    if (o.bone) for (let i = 0; i < 4; i++) p.line(17, 30 + i * 3, 31, 30 + i * 3, '#1a1020', 0.6);
    p.rect(20, 16, 8, 14, c.a);
    p.ell(24, 13, 10, 8, c.a, { hl: true }); p.ell(24, 19, 6, 4, c.c || lighten(c.a, 0.3));
    p.poly2([[17, 8], [12, -2], [20, 6]], c.d || '#f4f0e0');
    p.eye2(19.5, 11, 2.2, c.e || '#1a1020', { white: '#ffe040' });
    p.dot(22, 19, '#1a1020', 0.6); p.dot(26, 19, '#1a1020', 0.6);
    p.poly2([[20, 22], [21, 25], [22, 22]], '#ffffff', { flat: true });
    p.ell2(12, 38, 3, 4, c.a); p.poly2([[10, 41], [11, 44], [13, 41]], '#f4f0e0');
  },
  mage(p, c) {
    p.line(39, 6, 37, 46, '#6a4a2a', 1.4); p.ell(39, 6, 4, 4, c.c, { shine: true, hl: true });
    p.poly([[14, 18], [34, 18], [40, 47], [8, 47]], c.a);
    p.poly([[20, 22], [28, 22], [30, 47], [18, 47]], c.b, { flat: true });
    p.ell2(12, 30, 4, 7, c.a); p.ell(37, 28, 3, 3, '#e8c8a0');
    p.ell(24, 13, 10, 10, c.a, { hl: true }); p.poly([[24, -2], [18, 8], [30, 8]], c.a);
    p.ell(24, 15, 6.5, 6.5, '#120a1a', { flat: true });
    p.dot(21.5, 14, c.e || '#ffe040', 1); p.dot(26.5, 14, c.e || '#ffe040', 1);
  },
  knight(p, c, o) {
    if (o.cape) p.poly([[12, 14], [36, 14], [44, 47], [4, 47]], c.c || '#8a1a2a');
    p.line(38, 2, 36, 32, '#d8dce8', 2); p.line(32, 30, 41, 30, '#8a6a3a', 1.6); p.ell(36, 32, 1.6, 1.6, '#f2c14e', { flat: true });
    p.rect2(15, 36, 7, 11, darken(c.a, 0.15));
    p.rect(13, 17, 22, 20, c.a, { hl: true });
    p.ell2(11, 18, 5, 4, c.a, { hl: true });
    p.ell(11, 31, 8, 10, c.b, { hl: true }); p.poly([[11, 25], [8, 31], [11, 37], [14, 31]], c.c || '#f2c14e');
    p.ell(24, 11, 8, 8, c.a, { hl: true }); p.rect(18, 10, 12, 2, '#120a1a', { flat: true }); p.dot(21, 11, c.e || '#ff3040', 0.6); p.dot(27, 11, c.e || '#ff3040', 0.6);
    p.poly([[24, 3], [30, -2], [28, 5]], c.c || '#c02040');
  },
  eye(p, c) {
    p.poly2([[14, 20], [2, 10], [4, 18], [0, 24], [8, 23], [10, 30]], c.b);
    for (let i = 0; i < 4; i++) p.line(18 + i * 4, 34, 15 + i * 6, 46, c.b, 1.6);
    p.ell(24, 22, 15, 15, '#f4eef0', { hl: true });
    p.line(11, 20, 16, 22, '#e04040', 0.5); p.line(35, 26, 31, 24, '#e04040', 0.5); p.line(20, 34, 22, 31, '#e04040', 0.5);
    p.ell(24, 23, 8, 8, c.a, { hl: true }); p.ell(24, 23, 3.5, 5, '#120a1a', { flat: true }); p.dot(21.5, 20, '#ffffff', 1.2);
  },
  shadow(p, c) {
    p.poly([[24, 2], [38, 16], [44, 40], [36, 34], [32, 46], [26, 38], [20, 47], [16, 36], [6, 42], [10, 18]], c.a);
    p.poly2([[10, 24], [2, 30], [6, 31], [3, 36], [10, 30]], c.b);
    p.ell(24, 16, 9, 8, darken(c.a, 0.3), { flat: true });
    p.poly2([[18, 14], [22, 16], [18, 17]], c.e || '#ff3040', { flat: true });
    p.line(19, 22, 29, 22, c.e || '#ff3040', 0.6);
  },
  bird(p, c) {
    p.poly2([[20, 18], [0, 0], [4, 8], [-2, 12], [4, 16], [0, 22], [8, 24], [6, 32], [16, 30]], c.b);
    for (let i = 0; i < 4; i++) p.line2(18, 20 + i * 2, 2 + i * 2, 4 + i * 6, darken(c.b, 0.35), 0.6);
    p.line2(20, 40, 18, 47, '#f2c14e', 1.4); p.line2(18, 47, 15, 47, '#f2c14e', 1);
    p.ell(24, 30, 10, 12, c.a, { hl: true }); p.ell(24, 33, 6, 8, c.c || lighten(c.a, 0.4));
    p.poly([[18, 10], [22, 0], [24, 8], [27, 1], [30, 10]], c.d || '#ff6040');
    p.ell(24, 15, 8, 7, c.a, { hl: true });
    p.poly([[21, 17], [27, 17], [24, 24]], '#f2c14e');
    p.eye2(20.5, 14, 2, '#1a1020', { white: '#ffe040' }); p.line2(17, 11, 22, 13, '#1a1020', 0.8);
  },
  pharaoh(p, c) {
    for (let i = 0; i < 6; i++) p.ell(24 + Math.sin(i) * 8, 46 - i * 2, 14 - i, 2, i % 2 ? '#e0c080' : '#c8a060', { flat: true });
    p.line(38, 4, 36, 44, '#f2c14e', 1.4); p.ell(38, 4, 3, 3, '#3a7ad8', { shine: true });
    p.poly([[13, 18], [35, 18], [32, 40], [16, 40]], c.a);
    p.rect(14, 24, 20, 3, '#f2c14e', { flat: true }); p.ell(24, 30, 3, 3, '#3a7ad8', { shine: true });
    p.ell2(12, 26, 4, 8, c.a);
    p.poly([[12, 10], [36, 10], [38, 26], [10, 26]], '#f2c14e');
    for (let y = 12; y < 26; y += 3) p.line(11, y, 37, y, '#3a5ab0', 0.8);
    p.ell(24, 12, 8, 8, '#d8a840', { hl: true }); p.rect(16, 4, 16, 6, '#f2c14e');
    p.ell2(20.5, 12, 2, 1.4, '#120a1a', { flat: true }); p.dot(21, 12, c.e || '#40d0ff', 0.6); p.dot(27, 12, c.e || '#40d0ff', 0.6);
    p.rect(22, 18, 4, 5, '#3a5ab0');
    p.poly([[22, 4], [24, 0], [26, 4]], '#3a7ad8');
  },
  demonlord(p, c) {
    p.poly([[10, 12], [38, 12], [47, 47], [1, 47]], c.c || '#5a1030');
    p.poly([[14, 12], [34, 12], [36, 40], [12, 40]], c.a);
    p.rect(20, 18, 8, 22, c.b); p.ell(24, 22, 3, 3, '#ff3050', { shine: true });
    p.ell2(9, 24, 5, 9, c.a); p.ell2(6, 34, 4, 4, '#c8a8d8'); p.ell(5, 32, 4, 4, '#a040ff', { shine: true, flat: false });
    p.ell2(14, 14, 6, 4, c.b, { hl: true });
    p.ell(24, 9, 7, 8, '#b8a0c8', { hl: true });
    p.poly2([[19, 5], [12, -4], [20, 2]], '#2a1a30');
    p.poly([[17, 3], [19, -2], [21, 2], [24, -4], [27, 2], [29, -2], [31, 3]], '#f2c14e');
    p.dot(21, 9, '#ff3040', 1); p.dot(27, 9, '#ff3040', 1); p.line(21, 13, 27, 13, '#3a0a1a', 0.6);
  },
  demonbeast(p, c) {
    p.poly2([[16, 16], [-2, -2], [2, 10], [-2, 16], [4, 18], [0, 28], [10, 26]], c.b);
    p.line2(15, 16, 0, 0, darken(c.b, 0.5), 1);
    p.ell2(13, 44, 7, 4, c.a); p.rect2(10, 34, 9, 11, c.a);
    p.ell(24, 30, 16, 14, c.a, { hl: true });
    p.ell2(6, 30, 5, 10, c.a); for (const x of [2, 5, 8]) p.poly([[x, 38], [x + 1, 43], [x + 2, 38]], '#f4f0e0');
    for (const x of [40, 43, 46]) p.poly([[x - 2, 38], [x - 1, 43], [x, 38]], '#f4f0e0');
    p.ell(24, 14, 12, 10, c.a, { hl: true });
    p.poly2([[15, 8], [8, -4], [19, 5]], '#e8e0d0'); p.poly2([[19, 5], [17, -2], [22, 4]], '#e8e0d0');
    p.eye2(18, 12, 2, '#1a1020', { white: '#ff4040' }); p.eye(24, 8, 1.8, '#1a1020', { white: '#ffd040' });
    p.ell(24, 21, 7, 4, '#2a0a1a', { flat: true });
    for (let x = 18; x <= 28; x += 2.5) { p.poly([[x, 18], [x + 1, 21], [x + 2, 18]], '#ffffff', { flat: true }); }
    p.ell(24, 32, 4, 4, c.c || '#ff3050', { shine: true });
  },
};

// 依怪物資料畫出正面圖（含受傷閃白版本）
const MonArt = {
  cache: {},
  get(m) {
    const k = m.id; if (this.cache[k]) return this.cache[k];
    const size = m.boss ? 84 : m.size || 48, S = size / 48;
    const p = new Pix(size, size, S);
    p.d.fill(null);
    // 以 2 像素的邊界留給外框
    const tpl = MTPL[m.tpl];
    const inner = new Pix(size, size, S * 0.92);
    const o = m.art || {};
    tpl(inner, m.pal, o);
    const off = Math.round(size * 0.04);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const v = inner.d[y * size + x]; if (v) p.set(x + off, y + off, v); }
    p.outline('#140a1e');
    const c = p.canvas();
    return (this.cache[k] = { img: c, white: silhouette(c, '#ffffff'), red: silhouette(c, '#ff4040'), w: size, h: size });
  },
};

// 戰鬥背景（低解析度後放大）
const BattleBG = {
  cache: {},
  get(kind) {
    if (this.cache[kind]) return this.cache[kind];
    const W = 160, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grad = (stops) => { const gr = g.createLinearGradient(0, 0, 0, H); stops.forEach(([t, col]) => gr.addColorStop(t, col)); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
    const r = seeded(kind.length * 977 + 13);
    const ridge = (y0, amp, col, fr, seed) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 2) g.lineTo(x, y0 - Math.abs(Math.sin(x * fr + seed)) * amp - Math.sin(x * fr * 2.7 + seed) * amp * 0.3); g.lineTo(W, H); g.fill(); };
    const ground = (top, c1, c2, lines) => { g.fillStyle = c1; g.fillRect(0, top, W, H - top); for (let i = 0; i < 5; i++) { g.fillStyle = c2; g.fillRect(0, top + Math.pow(i / 5, 1.6) * (H - top), W, 1); } if (lines) for (let i = -6; i <= 6; i++) { g.strokeStyle = c2; g.beginPath(); g.moveTo(W / 2 + i * 6, top); g.lineTo(W / 2 + i * 40, H); g.stroke(); } };
    const pillars = (col, hi, n) => { for (let i = 0; i < n; i++) { const x = (i + 0.5) * W / n - 5; g.fillStyle = col; g.fillRect(x, 0, 10, 44); g.fillStyle = hi; g.fillRect(x + 2, 0, 2, 44); g.fillStyle = darken(col, 0.4); g.fillRect(x - 1, 42, 12, 3); } };
    const stars = (n, col) => { for (let i = 0; i < n; i++) { g.fillStyle = col; g.fillRect((r() * W) | 0, (r() * 30) | 0, 1, 1); } };
    switch (kind) {
      case 'field': grad([[0, '#5ab0f0'], [0.6, '#bfe6ff']]); g.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const x = r() * W, y = 6 + r() * 16; g.fillRect(x, y, 14, 3); g.fillRect(x + 3, y - 2, 8, 2); } ridge(38, 8, '#7ab8d8', 0.05, 1); ridge(42, 6, '#4f9a50', 0.08, 3); ground(44, '#6cc24a', '#5db040', false); break;
      case 'forest': grad([[0, '#4a9ad8'], [0.6, '#a8dcf4']]); for (let i = 0; i < 12; i++) { const x = i * 14 + r() * 6; g.fillStyle = '#2a6a34'; g.beginPath(); g.arc(x, 34, 10, 0, TAU); g.fill(); g.fillStyle = '#3a8a40'; g.beginPath(); g.arc(x - 2, 32, 7, 0, TAU); g.fill(); } g.fillStyle = '#1f4a2a'; g.fillRect(0, 38, W, 6); ground(44, '#5db040', '#4f9a36', false); break;
      case 'cave': grad([[0, '#1a120e'], [1, '#3a2a20']]); for (let i = 0; i < 9; i++) { const x = r() * W; g.fillStyle = '#2a1e16'; g.beginPath(); g.moveTo(x - 8, 0); g.lineTo(x, 12 + r() * 14); g.lineTo(x + 8, 0); g.fill(); } ridge(44, 6, '#4a3a2c', 0.09, 2); ground(46, '#5a4838', '#4a3a2c', true); g.fillStyle = '#5a8a3a'; for (let i = 0; i < 20; i++) g.fillRect(r() * W, 40 + r() * 6, 2, 1); break;
      case 'mine': grad([[0, '#1a140e'], [1, '#3a3024']]); for (let i = 0; i < 4; i++) { const x = 10 + i * 44; g.fillStyle = '#5a3a20'; g.fillRect(x, 4, 4, 42); g.fillRect(x + 22, 4, 4, 42); g.fillRect(x - 2, 4, 30, 4); } ground(46, '#6a5a48', '#4a3e32', true); break;
      case 'tower': grad([[0, '#3a4050'], [1, '#6a7080']]); for (let y = 0; y < 44; y += 6) for (let x = (y / 6) % 2 ? 0 : 8; x < W; x += 16) { g.fillStyle = '#4a5060'; g.fillRect(x, y, 15, 5); } g.fillStyle = '#7ab0e0'; g.fillRect(70, 10, 20, 22); g.fillStyle = '#c8e8ff'; g.fillRect(72, 12, 7, 18); ground(44, '#8a909c', '#6a707c', true); break;
      case 'shore': grad([[0, '#4aa0e8'], [0.5, '#bfe6ff']]); g.fillStyle = '#3478d4'; g.fillRect(0, 30, W, 14); g.fillStyle = '#b8e0ff'; for (let i = 0; i < 16; i++) g.fillRect(r() * W, 32 + r() * 10, 6, 1); ground(44, '#ecd28e', '#d8b870', false); break;
      case 'desert': grad([[0, '#f0a050'], [0.4, '#ffd890'], [0.7, '#fff0c0']]); g.fillStyle = '#fff4d0'; g.beginPath(); g.arc(120, 16, 8, 0, TAU); g.fill(); ridge(40, 8, '#e0b060', 0.04, 1); ridge(44, 5, '#d4a050', 0.06, 4); ground(46, '#ecd28e', '#d8b870', false); break;
      case 'tomb': grad([[0, '#2a1e10'], [1, '#5a4428']]); pillars('#b8904e', '#e0c080', 5); g.fillStyle = '#6a4a20'; for (let i = 0; i < 10; i++) g.fillRect(r() * W, 10 + r() * 30, 3, 4); ground(44, '#c09e5c', '#a08040', true); break;
      case 'snow': grad([[0, '#8ab0d8'], [0.6, '#e0ecf8']]); g.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) g.fillRect(r() * W, r() * 40, 1, 1); ridge(36, 12, '#b8c8e0', 0.04, 2); ridge(42, 6, '#dce8f6', 0.07, 5); ground(44, '#eef4ff', '#cfdcf0', false); break;
      case 'ice': grad([[0, '#2a5a8a'], [1, '#86bce4']]); for (let i = 0; i < 10; i++) { const x = r() * W, h = 10 + r() * 26; g.fillStyle = '#c8ecff'; g.beginPath(); g.moveTo(x - 5, 44); g.lineTo(x, 44 - h); g.lineTo(x + 5, 44); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(x - 1, 44 - h + 4, 1, h - 6); } ground(44, '#c4e6f8', '#9ad0f0', true); break;
      case 'island': grad([[0, '#2a1838'], [0.7, '#6a4a7a']]); stars(30, '#ffd0ff'); ridge(38, 8, '#3a2a4a', 0.06, 1); ground(44, '#6d5f80', '#584a68', false); break;
      case 'castle': grad([[0, '#140e20'], [1, '#3a2e50']]); pillars('#5d4f78', '#8a7aa8', 4); g.fillStyle = '#a8203a'; g.fillRect(0, 44, W, 2); ground(46, '#4e4262', '#3a3050', true); break;
      case 'throne': grad([[0, '#0a0614'], [1, '#3a1030']]); stars(40, '#ff80a0'); g.fillStyle = '#c02040'; g.globalAlpha = 0.25; g.beginPath(); g.arc(80, 24, 30, 0, TAU); g.fill(); g.globalAlpha = 1; pillars('#3a2a50', '#6a5a88', 3); ground(46, '#2a2040', '#a8203a', true); break;
      default: grad([[0, '#000'], [1, '#222']]);
    }
    return (this.cache[kind] = c);
  },
};

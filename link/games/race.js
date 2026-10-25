'use strict';
/* TEMP demo game to exercise the core: tap 20 times, first one wins. Replaced by the real game. */
LGAMES.push({
  id: 'race', name: '搶答測試', icon: '⚡', col: '#ff7a45', blurb: '先按 20 下的人贏', players: [1, 6],
  rules: kid => ['按大按鈕，先按 20 下的人贏'],
  host(ctx) {
    const n = {}; ctx.players.forEach(p => n[p.id] = 0);
    let over = false, win = null;
    return {
      get over() { return over; },
      view(id) { return { n, me: id ? n[id] : null, win }; },
      msg(id, d) { if (d.tap && !win) { n[id]++; if (n[id] >= 20) { win = id; ctx.sound('*', 'win'); setTimeout(() => over = true, 800); } ctx.push(); } },
      results() { return { rows: ctx.players.map(p => ({ id: p.id, key: n[p.id], line: n[p.id] + ' 下' })) }; }
    };
  },
  client(root, api) {
    root.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px"><div id="dv" style="font-size:20px;font-weight:900"></div>${api.me ? '<button id="tp" class="btn acc" style="font-size:40px;padding:30px 50px">按！</button>' : ''}</div>`;
    const tp = root.querySelector('#tp'); if (tp) tp.onclick = () => { api.sfx('pop'); api.send({ tap: 1 }); };
    return { view(v) { root.querySelector('#dv').innerHTML = api.players().map(p => `${p.name}: ${v.n[p.id]}`).join('<br>'); } };
  },
  bot(v, api) { api.send({ tap: 1 }); }
});

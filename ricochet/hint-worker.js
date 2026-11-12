// 反彈神射手：在背景算提示（解題要一點時間，放在 Worker 才不會讓畫面卡住）
importScripts('core.js', 'levels.js');
onmessage = e => {
  const { id, lv, st, shots } = e.data;
  const Core = self.RicoCore, def = self.RICO_LEVELS[lv];
  const w = Core.build(def);
  const s = { dead: new Set(st.dead), boom: new Set(st.boom), glass: new Set(st.glass), turn: st.turn, hp: st.hp, bossHp: st.bossHp.slice(), hostage: false };
  const r = Core.solve(w, s, shots, { step: 0.2, minWin: 0.6, maxStates: 400 });
  postMessage({ id, plan: r.plan });
};

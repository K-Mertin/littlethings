// 砰砰小隊：模擬器。node boom/tools/sim.mjs [場數]
// 1) 電腦對電腦打 N 場，看會不會當掉、多久分出勝負、平手比例
// 2) 讓電腦自動玩闖關 24 關，確認每一關都過得了
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../core.js');
const n = +process.argv[2] || 60;
for (const level of [0, 1, 2]) {
  let draws = 0, tsum = 0, early = 0, tmax = 0;
  for (let k = 0; k < n; k++) {
    const G = C.newBattle({ humans: 0, bots: 4, level, seed: k * 97 + level });
    let steps = 0;
    while (!G.over && steps++ < 60 * 400) { C.step(G, 1 / 60); G.ev.length = 0; }
    if (!G.over) throw new Error('對戰沒有結束 seed=' + k);
    if (G.over.winner < 0) draws++;
    tsum += G.time; tmax = Math.max(tmax, G.time);
    if (G.time < 15) early++;
  }
  console.log(`對戰 level ${level}: 平均 ${(tsum / n).toFixed(1)}s 最長 ${tmax.toFixed(0)}s 平手 ${draws}/${n} 15 秒內結束 ${early}`);
}
// 3) 站著不動的人：電腦多久會把他炸掉（太久代表電腦不會進攻）
for (const level of [0, 1, 2]) {
  let ts = 0, killed = 0;
  for (let k = 0; k < n; k++) {
    const G = C.newBattle({ humans: 1, bots: 3, level, seed: k * 31 + 7 });
    let steps = 0; const me = G.players[0];
    while (!G.over && me.alive && steps++ < 60 * 200) { C.step(G, 1 / 60); G.ev.length = 0; }
    ts += G.time; if (G.time < G.sd.start) killed++;
  }
  console.log(`不動的人 level ${level}: 平均活 ${(ts / n).toFixed(0)}s，驟死前被炸掉 ${killed}/${n}`);
}
let fail = 0;
for (let s = 0; s < C.STAGES.length; s++) {
  let wins = 0, t = 0; const tries = 6;
  for (let k = 0; k < tries; k++) {
    const G = C.newAdventure(s, { kid: false });
    if (!C.connected(G.grid)) throw new Error('場地不連通 ' + s);
    const p = G.players[0]; p.bot = C.mkBot(2); p.hearts = 99; G.timeLeft = Infinity;
    let steps = 0;
    while (!G.over && steps++ < 60 * 900) { C.step(G, 1 / 60); G.ev.length = 0; p.hearts = 99; }
    if (G.over && G.over.win) { wins++; t += G.time; }
  }
  if (!wins) fail++;
  console.log(`第 ${s + 1} 關: 自動通關 ${wins}/${tries}` + (wins ? ` 平均 ${(t / wins).toFixed(0)}s（三星時間 ${C.newAdventure(s).par}s）` : ''));
}
process.exit(fail ? 1 : 0);

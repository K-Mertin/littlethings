'use strict';
// 守塔奇兵：WebAudio 合成音效與配樂（沒有任何音檔）
const Snd = (() => {
  let ac = null, master, sfxBus, musBus, noiseBuf;
  const last = {};
  let musicOn = true, sfxOn = true;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = 0.8;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.55 : 0; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = musicOn ? 0.32 : 0; musBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function setMusic(on) { musicOn = on; if (musBus) musBus.gain.setTargetAtTime(on ? 0.32 : 0, ac.currentTime, 0.05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.02); }

  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f0, f1, dur, vol, bus, at, a) {
    const t = at || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, a || 0.005, vol, dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(dur, vol, ftype, f0, f1, bus, at, q) {
    const t = at || ac.currentTime;
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.playbackRate.value = 1;
    const f = ac.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(f0, t); if (q) f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, 0.003, vol, dur);
    n.connect(f); f.connect(g); g.connect(bus || sfxBus); n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
  }
  const GAP = { arrow: 0.05, pop: 0.035, boom: 0.06, cannon: 0.06, frost: 0.06, magic: 0.06, zap: 0.06, snipe: 0.05, coin: 0.05, heal: 0.15, blizzard: 0.12, missile: 0.08, leak: 0.12 };
  function sfx(name) {
    if (!ac || !sfxOn) return;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < (GAP[name] || 0.03)) return;
    last[name] = now;
    const r = () => 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'arrow': noise(0.06, 0.25, 'bandpass', 2600 * r(), 900, null, 0, 2); tone('triangle', 900 * r(), 500, 0.06, 0.08); break;
      case 'cannon': tone('sine', 160, 60, 0.18, 0.5); noise(0.12, 0.3, 'lowpass', 1400, 200); break;
      case 'bigboom': tone('sine', 120, 40, 0.3, 0.6); noise(0.2, 0.4, 'lowpass', 900, 120); break;
      case 'boom': tone('sine', 110 * r(), 45, 0.22, 0.45); noise(0.28, 0.35, 'lowpass', 1800, 150); break;
      case 'bigboomhit': tone('sine', 80, 30, 0.45, 0.7); noise(0.5, 0.5, 'lowpass', 1200, 80); break;
      case 'frost': tone('sine', 1800 * r(), 2600, 0.12, 0.08); tone('triangle', 2400 * r(), 1800, 0.18, 0.05); break;
      case 'blizzard': noise(0.35, 0.12, 'bandpass', 3000, 6000, null, 0, 1); tone('sine', 1500, 2200, 0.25, 0.04); break;
      case 'magic': tone('sine', 500 * r(), 1100, 0.18, 0.12); tone('triangle', 750 * r(), 1500, 0.15, 0.06); break;
      case 'zap': noise(0.12, 0.3, 'highpass', 2500, 5000); tone('sawtooth', 220, 1400, 0.1, 0.07); break;
      case 'beam': tone('sawtooth', 300, 900, 0.3, 0.1); tone('sine', 1200, 600, 0.3, 0.1); break;
      case 'snipe': noise(0.05, 0.5, 'highpass', 1200, 400); tone('square', 900, 120, 0.09, 0.12); break;
      case 'missile': noise(0.25, 0.18, 'bandpass', 800, 2400, null, 0, 1.5); break;
      case 'pop': tone('sine', 600 * r(), 200, 0.08, 0.14); break;
      case 'coin': tone('square', 1320, 1320, 0.05, 0.06); tone('square', 1760, 1760, 0.12, 0.06, null, now + 0.05); break;
      case 'build': tone('sine', 220, 120, 0.12, 0.35); noise(0.1, 0.25, 'lowpass', 900, 200); tone('triangle', 660, 660, 0.08, 0.08, null, now + 0.08); break;
      case 'upgrade': [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.12, 0.12, null, now + i * 0.06)); break;
      case 'spec': [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.18, 0.14, null, now + i * 0.07)); tone('sine', 2093, 2093, 0.4, 0.05, null, now + 0.28); break;
      case 'sell': tone('square', 988, 660, 0.12, 0.06); tone('square', 660, 440, 0.15, 0.05, null, now + 0.08); break;
      case 'leak': tone('square', 220, 110, 0.25, 0.12); tone('sine', 110, 70, 0.3, 0.3); break;
      case 'heal': tone('sine', 880, 1320, 0.25, 0.05); break;
      case 'stomp': tone('sine', 70, 30, 0.5, 0.8); noise(0.4, 0.5, 'lowpass', 500, 60); break;
      case 'summon': tone('sawtooth', 110, 55, 0.6, 0.12); tone('sine', 330, 165, 0.6, 0.08); break;
      case 'roar': noise(0.7, 0.35, 'bandpass', 400, 160, null, 0, 3); tone('sawtooth', 140, 70, 0.7, 0.12); break;
      case 'bossdie': tone('sine', 90, 30, 1.2, 0.8); noise(1.2, 0.5, 'lowpass', 1800, 60); [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.25, 0.12, null, now + 0.3 + i * 0.1)); break;
      case 'meteor': noise(0.9, 0.3, 'bandpass', 300, 2000, null, 0, 1); break;
      case 'meteorhit': tone('sine', 70, 28, 0.6, 0.8); noise(0.6, 0.6, 'lowpass', 1500, 70); break;
      case 'freeze': tone('sine', 2000, 400, 0.6, 0.1); noise(0.7, 0.2, 'highpass', 4000, 9000); [1568, 2093, 2637].forEach((f, i) => tone('sine', f, f, 0.3, 0.06, null, now + i * 0.05)); break;
      case 'horn': [0, 0.18].forEach((d, i) => { const o = tone('sawtooth', i ? 392 : 294, i ? 392 : 294, 0.35, 0.09, null, now + d, 0.04); }); break;
      case 'bosshorn': [0, 0.3, 0.6].forEach((d, i) => tone('sawtooth', [196, 185, 147][i], [196, 185, 147][i] * 0.98, 0.35, 0.14, null, now + d, 0.05)); break;
      case 'click': tone('triangle', 900, 900, 0.03, 0.08); break;
      case 'deny': tone('square', 200, 160, 0.12, 0.08); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('triangle', f, f, i === 5 ? 0.6 : 0.18, 0.16, null, now + i * 0.12)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.35, 0.15, null, now + i * 0.25)); break;
      case 'star': tone('triangle', 1046, 1046, 0.15, 0.14); tone('sine', 2093, 2093, 0.3, 0.06, null, now + 0.05); break;
    }
  }

  // ───────── 配樂：簡單的程序產生音樂 ─────────
  const SONGS = [
    { bpm: 104, root: 60, scale: 'maj', prog: [0, 7, 9, 5], drums: 1 },   // 草原
    { bpm: 96, root: 57, scale: 'min', prog: [0, 8, 3, 10], drums: 1 },   // 森林
    { bpm: 110, root: 62, scale: 'min', prog: [0, 10, 8, 7], drums: 1 },  // 沙漠
    { bpm: 92, root: 64, scale: 'maj', prog: [0, 5, 9, 7], drums: 1 },    // 雪原
    { bpm: 100, root: 55, scale: 'min', prog: [0, 3, 8, 7], drums: 1 },   // 沼澤
    { bpm: 120, root: 52, scale: 'min', prog: [0, 1, 0, 10], drums: 2 },  // 火山
    { bpm: 108, root: 62, scale: 'maj', prog: [0, 9, 5, 7], drums: 1 },   // 海岸
    { bpm: 116, root: 53, scale: 'min', prog: [0, 8, 10, 7], drums: 2 },  // 城堡
    { bpm: 84, root: 60, scale: 'maj', prog: [0, 9, 5, 7], drums: 0 },    // 選單
    { bpm: 132, root: 50, scale: 'min', prog: [0, 1, 8, 7], drums: 2 },   // 頭目
  ];
  const SC = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10] };
  let cur = -1, timer = null, nextT = 0, stepI = 0, song = null, intensity = 0;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(type, m, t, dur, vol, cutoff) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = mtof(m);
    let out = g;
    if (cutoff) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; g.connect(f); out = f; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); out.connect(musBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function chordTones(deg) {
    // 以和弦根音（半音）為底，取音階內的三和弦
    const sc = SC[song.scale];
    const r = deg;
    const third = sc.includes((r + 4) % 12) ? 4 : 3;
    return [r, r + third, r + 7];
  }
  function tick() {
    if (!ac || !song) return;
    const spb = 60 / song.bpm / 4; // 16 分音符
    while (nextT < ac.currentTime + 0.25) {
      const bar = Math.floor(stepI / 16) % 4, st = stepI % 16;
      const deg = song.prog[bar], ch = chordTones(deg), R = song.root;
      const t = nextT;
      if (musicOn) {
        // 低音
        if (st % 4 === 0) note('triangle', R - 24 + deg + (st === 8 ? 7 : 0), t, spb * 3.5, 0.32);
        // 和弦墊
        if (st === 0) ch.forEach(n => note('sawtooth', R - 12 + n, t, spb * 15, 0.035, 900));
        // 琶音
        const arp = [0, 1, 2, 1, 0, 2, 1, 2];
        if (song.drums > 0 || st % 2 === 0) {
          const n = ch[arp[st % 8]] + (st >= 8 ? 12 : 0);
          note('square', R + n, t, spb * 0.9, 0.03, 2600);
        }
        // 旋律：每兩拍隨機音階音
        if (intensity > 0 && st % 4 === 2 && Math.random() < 0.55) {
          const sc = SC[song.scale];
          const m = R + 12 + sc[(Math.floor(Math.random() * 5) + (ch[0] % 7)) % 7];
          note('triangle', m, t, spb * 2.5, 0.05);
        }
        // 鼓
        if (song.drums) {
          if (st % 8 === 0 || (song.drums > 1 && st % 8 === 6)) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.2); }
          if (st % 8 === 4) noise(0.12, 0.12, 'highpass', 1500, 800, musBus, t);
          if (st % 2 === 0) noise(0.03, st % 4 === 2 ? 0.06 : 0.03, 'highpass', 7000, 7000, musBus, t);
        }
      }
      nextT += spb; stepI++;
    }
  }
  function play(i, inten) {
    intensity = inten || 0;
    if (!ac) { cur = i; return; }
    if (cur === i && timer) return;
    cur = i; song = SONGS[i % SONGS.length];
    stepI = 0; nextT = ac.currentTime + 0.1;
    if (!timer) timer = setInterval(tick, 60);
  }
  function stop() { song = null; cur = -1; }
  function resumeCur() { if (cur >= 0 && ac) { const c = cur; cur = -2; play(c, intensity); } }
  return { init, sfx, setMusic, setSfx, play, stop, resumeCur, get ready() { return !!ac; } };
})();

'use strict';
/* 節奏拍拍 — a rhythm game on a concert stage.
   The background music is switched off and the game plays its own little song with WebAudio
   (drums + bass + off-beat chords + a cheerful melody), scheduled ahead on Sfx.ctx.currentTime.
   Every player has a lane; round drum notes slide toward their critter's drum and the phone
   becomes one giant 「拍」 button. Timing windows are generous (phone presses travel over the
   network) and each player's windows follow their own measured lag (median of recent hits,
   at most ±150 ms), starting with a 4-beat warm-up 「跟著拍子」.
   小朋友: slow song, notes mostly on beats 1 & 3, wide windows, no penalties.
   大人:   faster song, 8th notes, off-beats, double taps and a few HOLD notes; stray taps cost a little.
   Without sound (no AudioContext / suspended) the game runs silently on performance.now(). */
(() => {
  const FONT = '"Noto Sans TC",system-ui,sans-serif', RFONT = '"Fredoka","Noto Sans TC",system-ui,sans-serif';
  const COL = '#ec4899', DEEP = '#be185d';
  const LX0 = 96, LX1 = 1504, NAME_X = 110, CRIT_X = 300, HIT_X = 404, LY0 = 186, LY1 = 766;
  const PAL = ['#f472b6', '#60a5fa', '#facc15', '#a78bfa', '#34d399', '#fb923c'];
  const J_TXT = ['完美！', '很好！', '好！', '沒打到'], J_COL = ['#ffd23f', '#4ade80', '#60c8ff', '#b4aecb'];
  const LAMP_ORDER = [1, 4, 0, 5, 2, 3];
  const TAP = { type: 'tap', prompt: '跟著節拍按！', btn: { icon: '🥁', label: '拍' } };

  /* ---------------- the song: C major, 8th-note grid, melody as scale degrees (-1 rest, -2 hold) ---------------- */
  const SCALE = [0, 2, 4, 5, 7, 9, 11];
  const deg = d => 72 + Math.floor(d / 7) * 12 + SCALE[((d % 7) + 7) % 7];
  const MEL_A = [
    [2, 4, 2, 4, 7, -2, 4, -2], [1, 4, 6, 4, 8, -2, 6, -2], [0, 2, 5, 2, 7, -2, 5, -2], [5, 4, 3, 2, 1, -2, -2, -2],
    [2, 2, 4, 4, 5, 4, 2, -2], [1, 1, 4, 4, 6, 5, 4, -2], [5, 5, 7, 5, 4, 3, 2, 1], [0, -2, 2, -2, 4, -2, 7, -2]];
  const MEL_B = [
    [7, -2, 5, -2, 7, 8, 7, 5], [6, -2, 4, -2, 6, 7, 6, 4], [4, -2, 2, -2, 4, 5, 4, 2], [5, -2, -2, -2, 7, -2, -2, -2],
    [5, 4, 5, 7, 8, -2, 7, 5], [4, 3, 4, 6, 8, -2, 6, 4], [9, 8, 7, 4, 2, 4, 7, 8], [9, -2, -2, -2, 7, -2, -2, -2]];
  const CH_A = [0, 7, 9, 5, 0, 7, 5, 0], CH_B = [5, 7, 4, 9, 5, 7, 0, 0];   // chord roots (semitones above C); 9 and 4 are minor
  const triad = r => [r, r + (r === 9 || r === 4 ? 3 : 4), r + 7].map(x => 60 + (x >= 12 ? x - 12 : x));
  const BASS = [0, 0, 12, 0, 7, 0, 12, 0];

  function buildSong(kid) {
    const bpm = kid ? 104 : 124, spb = 60 / bpm;
    const plan = kid ? [['I', 4], ['A', 8], ['B', 8], ['A', 8]] : [['I', 2], ['A', 8], ['B', 8], ['A', 8], ['B', 8]];
    const bars = [];
    plan.forEach(([sec, len], sn) => { for (let i = 0; i < len; i++) bars.push({ sec, i, sn, last: i === len - 1, root: sec === 'B' ? CH_B[i] : CH_A[i], mel: sec === 'A' ? MEL_A[i] : sec === 'B' ? MEL_B[i] : null }); });
    return { bpm, spb, bars };
  }
  /* the note chart comes straight from the song's beat grid */
  function buildChart(song, kid) {
    const out = []; let holds = 0;
    song.bars.forEach((b, bi) => {
      const base = bi * 4;
      if (kid) {
        const beats = b.sec === 'I' ? (b.i < 2 ? [0] : [0, 2]) : b.last ? [0, 1, 2, 3] : [0, 2];
        for (const x of beats) out.push({ beat: base + x, hold: 0 });
        return;
      }
      if (b.sec === 'I') { for (const x of b.i === 0 ? [0, 1, 2, 3] : [0, 1, 2, 2.5, 3]) out.push({ beat: base + x, hold: 0 }); return; }
      const m = b.mel;
      for (let s = 0; s < 8; s++) {
        if (m[s] < 0) continue;
        let k = 0; while (s + 1 + k < 8 && m[s + 1 + k] === -2) k++;
        const beat = base + s / 2, n = out.length;
        // never three 8ths in a row: a quick double tap at most
        if (n >= 2 && Math.abs(out[n - 1].beat - (beat - 0.5)) < 1e-6 && Math.abs(out[n - 2].beat - (beat - 1)) < 1e-6) continue;
        let hold = 0; if (k >= 3 && b.sec === 'B' && holds < 6) { hold = (k - 1) * 0.5; holds++; }
        out.push({ beat, hold });
      }
    });
    return out;
  }

  /* ---------------- a tiny synth that plays at exact AudioContext times ---------------- */
  function makeSynth(ac) {
    const out = ac.createGain(); out.gain.value = 0.42;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    out.connect(comp); comp.connect(ac.destination);
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const mf = m => 440 * Math.pow(2, (m - 69) / 12);
    const env = (g, t, v, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const osc = (type, f, t, v, a, d, f2) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d * 0.6);
      env(g, t, v, a, d); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05);
    };
    const noise = (t, v, d, type, freq, q) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = nb; f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7; env(g, t, v, 0.002, d);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * Math.max(0, 1.9 - d), d + 0.05);
    };
    return {
      kick(t) { osc('sine', 150, t, 0.9, 0.003, 0.2, 42); },
      snare(t, v) { v = v || 1; noise(t, 0.38 * v, 0.14, 'bandpass', 1900, 0.8); osc('triangle', 210, t, 0.2 * v, 0.002, 0.07, 150); },
      hat(t, v, open) { noise(t, 0.12 * (v || 1), open ? 0.16 : 0.035, 'highpass', 7500, 0.7); },
      bass(m, t, d) {
        const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'square'; o.frequency.value = mf(m); f.type = 'lowpass'; f.frequency.value = 560;
        env(g, t, 0.3, 0.005, d); o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.06);
      },
      lead(m, t, d) { osc('square', mf(m), t, 0.06, 0.01, d); osc('triangle', mf(m), t, 0.16, 0.01, d); },
      bell(m, t) { osc('sine', mf(m), t, 0.14, 0.003, 0.35); osc('sine', mf(m + 12), t, 0.04, 0.003, 0.2); },
      stab(ms, t) { for (const m of ms) osc('triangle', mf(m), t, 0.055, 0.004, 0.11); },
      wood(t, hi) { osc('sine', hi ? 1760 : 1250, t, 0.36, 0.001, 0.06); osc('triangle', hi ? 3520 : 2500, t, 0.05, 0.001, 0.03); },
      crash(t) { noise(t, 0.2, 1.4, 'highpass', 4200, 0.5); },
      chord(ms, t, d) { for (const m of ms) { osc('triangle', mf(m), t, 0.1, 0.01, d); osc('square', mf(m), t, 0.025, 0.01, d * 0.7); } },
      cheer(t, d) {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = nb; s.loop = true; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.4;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.5); g.gain.setValueAtTime(0.16, t + d * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + 0.05);
        for (let i = 0; i < 26; i++) noise(t + Math.random() * d * 0.7, 0.07 + Math.random() * 0.06, 0.03, 'bandpass', 1100 + Math.random() * 900, 1.2);
        for (let i = 0; i < 3; i++) osc('sawtooth', 480 + i * 90, t + 0.2 + i * 0.35, 0.025, 0.05, 0.6, 900 + i * 120);
      },
      close(after) { setTimeout(() => { try { out.disconnect(); } catch (e) { } }, after * 1000); }
    };
  }

  class Rhythm {
    constructor(ctx) {
      this.ctx = ctx; this.kid = ctx.kid; this.teams = !!ctx.teams; this.over = false; this.edge = '#140b2e';
      this.music = false;   // we play our own song
      const song = this.song = buildSong(this.kid), spb = this.spb = song.spb;
      this.w0 = 0.9; this.s0 = this.w0 + 4 * spb; this.s1 = this.s0 + song.bars.length * 4 * spb;
      this.dur = this.s1 + 5.4;   // a short bow + applause after the song
      this.chart = buildChart(song, this.kid).map(n => ({ t: this.s0 + n.beat * spb, beat: n.beat, hold: n.hold * spb, big: n.beat % 4 === 0 }));
      this.win = this.kid ? [0.22, 0.30, 0.38] : [0.12, 0.20, 0.30];
      this.speed = this.kid ? 430 : 620;
      this.t = 0; this.songT = 0; this.visT = 0; this.lat = 0; this.clkSrc = ''; this.clkLast = 0;
      this.au = null; this.auCtx = null; this.st = 0; this.wk = 0; this.endDone = false; this.ended = false;
      this.bp = -9; this.lastBeat = -99; this.vis0 = 0;
      const list = ctx.players.slice(); if (this.teams) list.sort((a, b) => a.team - b.team);
      this.es = list.map((p, i) => ({
        p, lane: i, y: 0, score: 0, combo: 0, best: 0, cnt: [0, 0, 0, 0], res: new Int8Array(this.chart.length), next: 0,
        offs: [], cal: 0, hold: null, hit: 0, jt: '', jc: '#fff', jT: 9, jh: '', flash: 0, sad: 0, strayT: 0, stray: 0, lastPress: -9, warm: 0
      }));
      this.by = new Map(this.es.map(e => [e.p, e]));
      const n = this.es.length; this.laneH = Math.min(140, (LY1 - LY0) / n);
      const top = (LY0 + LY1) / 2 - this.laneH * n / 2; this.es.forEach((e, i) => { e.y = top + this.laneH * (i + 0.5); });
      this.hype = 0.15; this.hypeT = 0.35; this.accSum = 0; this.accN = 0;
      this.conf = [];
      this.crowd = []; for (let i = 0; i < 30; i++) this.crowd.push({ x: i * (W / 29) + rnd(-16, 16), s: rnd(0.8, 1.2), ph: rnd(0, TAU), th: rnd(0.15, 0.95), c: PAL[rint(6)], side: Math.random() < 0.5 ? -1 : 1 });
      this.lamps = [200, 450, 680, 920, 1150, 1400].map((x, i) => ({ x, c: PAL[i], ph: i * 1.3 }));
    }
    col(e) { return this.teams ? TEAMS[e.p.team].c : PARTY_COLORS[e.p.col].c; }

    /* ---------------- clock + music ---------------- */
    audioOk() { const ac = Sfx.ctx; return !!(Sfx.on && ac && ac.state === 'running'); }
    schedule() {
      const ok = this.audioOk(), ac = Sfx.ctx, LA = 0.2, now = this.songT, spb = this.spb, h = spb / 2;
      if (ok && this.auCtx !== ac) { try { this.au = makeSynth(ac); this.auCtx = ac; } catch (e) { this.au = null; } }
      const play = ok && this.au;
      const at = tt => Math.max(ac.currentTime, ac.currentTime + (tt - now));
      while (this.wk < 4 && this.w0 + this.wk * spb < now + LA) {
        const tt = this.w0 + this.wk * spb; if (play && tt >= now - 0.04) this.au.wood(at(tt), this.wk === 0); this.wk++;
      }
      const nSteps = this.song.bars.length * 8;
      while (this.st < nSteps && this.s0 + this.st * h < now + LA) {
        const tt = this.s0 + this.st * h; if (play && tt >= now - 0.04) this.playStep(this.st, at(tt)); this.st++;
      }
      if (!this.endDone && this.s1 < now + LA) {
        this.endDone = true;
        if (play && this.s1 >= now - 0.1) { const t = at(this.s1), A = this.au; A.crash(t); A.kick(t); A.chord([72, 76, 79, 84], t, 1.5); A.bass(36, t, 1.2); A.cheer(t + 0.35, 4); A.close(7); }
      }
    }
    playStep(k, t) {
      const A = this.au, b = this.song.bars[k >> 3], s = k & 7, h = this.spb / 2;
      const busy = b.sec === 'B' || (b.sec === 'A' && b.sn >= 3);
      if (s === 0 || s === 4 || (busy && (s === 2 || s === 6)) || (!busy && b.sec !== 'I' && s === 5 && (b.i & 1))) A.kick(t);
      if ((s === 2 || s === 6) && !(b.sec === 'I' && b.i === 0)) A.snare(t, 1);
      if (b.last && b.sec !== 'I' && s >= 5) A.snare(t, s === 6 ? 1 : 0.55);
      if (s & 1) A.hat(t, 1, busy && s === 7); else if (busy || b.sec !== 'I') A.hat(t, 0.45);
      if (s === 0 && b.i === 0 && b.sec !== 'I') A.crash(t);
      if (b.sec !== 'I' || (s & 1) === 0) A.bass(36 + b.root + BASS[s], t, h * 0.9);
      if ((s & 1) && (b.sec !== 'I' || b.i >= 2)) A.stab(triad(b.root), t);
      if (b.mel) {
        const m = b.mel[s];
        if (m >= 0) { let k2 = 0; while (s + 1 + k2 < 8 && b.mel[s + 1 + k2] === -2) k2++; A.lead(deg(m), t, (k2 + 1) * h * 0.92); }
      } else if (b.last && (s & 1) === 0) A.bell(72 + b.root + [0, b.root === 9 || b.root === 4 ? 3 : 4, 7, 12][s >> 1] - (b.root >= 7 ? 12 : 0), t);   // a little pickup into the song
    }

    /* ---------------- update ---------------- */
    update(dt) {
      if (this.t >= this.dur) { this.over = true; return; }
      // the song clock follows the audio clock when there is sound, otherwise performance.now()
      const ac = Sfx.ctx, aud = !!(ac && ac.state === 'running'), src = aud ? 'a' : 'p', now = aud ? ac.currentTime : performance.now() / 1000;
      let d = src === this.clkSrc ? now - this.clkLast : dt;
      if (!(d >= 0) || d > 0.25) d = dt;   // paused, a hitch, or the clock changed: just step on
      this.clkSrc = src; this.clkLast = now;
      this.songT += d; this.t = Math.min(this.songT, this.dur);
      const lat = aud ? clamp((ac.baseLatency || 0) + (ac.outputLatency || 0), 0, 0.25) : 0;
      this.lat += (lat - this.lat) * 0.05;
      const T = this.visT = this.songT - this.lat;   // what everyone hears right now
      this.schedule();
      if (Fx.banner && Fx.banner.text === '最後 10 秒！') Fx.banner = null;   // keep the lanes clear
      const bp = this.bp = (T - this.w0) / this.spb, bi = Math.floor(bp);
      if (bi !== this.lastBeat) { this.lastBeat = bi; this.onBeat(bi); }
      while (this.vis0 < this.chart.length && this.chart[this.vis0].t + this.chart[this.vis0].hold < T - (HIT_X - LX0 + 60) / this.speed) this.vis0++;
      for (const e of this.es) this.stepPlayer(e, dt, T);
      const tgt = clamp((this.hypeT - (this.kid ? 0.2 : 0.3)) / 0.6, 0, 1), end = T >= this.s1;
      this.hype += ((end ? 1 : tgt) - this.hype) * Math.min(1, dt * 1.4);
      // confetti rains once the room is on fire
      const rate = end ? 0 : Math.max(0, this.hype - 0.55) * 70;
      if (Math.random() < rate * dt) this.addConf(rnd(100, W - 100), -20, 1);
      for (const c of this.conf) { c.life -= dt; c.vy += 160 * dt; c.vx *= 0.99; c.x += (c.vx + Math.sin(c.life * 3 + c.ph) * 30) * dt; c.y += c.vy * dt; c.a += c.va * dt; }
      if (this.conf.length) this.conf = this.conf.filter(c => c.life > 0 && c.y < H + 30);
      if (!this.ended && T >= this.s1) {
        this.ended = true; Fx.announce('表演結束！謝謝大家 🎉', DEEP); Fx.flash('#fff', 0.25);
        for (let i = 0; i < 110; i++) this.addConf(rnd(150, W - 150), rnd(-160, 40), 1);
      }
      if (this.songT >= this.dur) this.over = true;
    }
    addConf(x, y, k) { if (this.conf.length >= 150) return; this.conf.push({ x, y, vx: rnd(-80, 80) * k, vy: rnd(30, 160), a: rnd(0, TAU), va: rnd(-8, 8), c: PAL[rint(6)], life: rnd(3, 5), ph: rnd(0, TAU) }); }
    onBeat(bi) {
      const T = this.visT;
      if (bi >= 0 && bi < 4) { for (const e of this.es) Fx.ring(HIT_X, e.y, '#ffffff', this.laneH * 0.55, 0.3); }
      if (T > this.s0 && T < this.s1 && this.hype > 0.8 && bi % 4 === 0) for (let i = 0; i < 6; i++) this.addConf(rnd(200, W - 200), -10, 1);
    }
    stepPlayer(e, dt, T) {
      const ctx = this.ctx, ch = this.chart, w = this.win;
      e.jT += dt; e.hit = Math.max(0, e.hit - dt * 5); e.sad -= dt; e.strayT -= dt; e.flash = Math.max(0, e.flash - dt * 3); e.warm = Math.max(0, e.warm - dt * 3);
      if (ctx.pressed(e.p, 0)) { e.lastPress = T; e.hit = 1; this.press(e, T); }
      const Tc = T - e.cal;
      while (e.next < ch.length) {
        if (e.res[e.next]) { e.next++; continue; }
        if (Tc - ch[e.next].t > w[2]) { this.judge(e, e.next, 4, 0); e.next++; continue; }
        break;
      }
      const h = e.hold;
      if (h) {
        if (Tc >= h.end - 0.06) { e.hold = null; e.score += 50; this.say(e, '撐住了！', J_COL[0]); Fx.burst(HIT_X, e.y, J_COL[0], 10, 260); Fx.ring(HIT_X, e.y, J_COL[0], this.laneH * 0.7, 0.4); }
        else if (ctx.held(e.p, 0)) { h.loose = 0; h.sp -= dt; if (h.sp <= 0) { h.sp = 0.09; Fx.burst(HIT_X, e.y, this.col(e), 2, 200); } }
        else if ((h.loose += dt) > 0.16) { e.hold = null; this.say(e, '放開了', J_COL[3]); }
      }
    }
    say(e, t, c, hint) { e.jt = t; e.jc = c; e.jT = 0; e.jh = hint || ''; }
    addOff(e, off) {
      e.offs.push(off); if (e.offs.length > 12) e.offs.shift();
      if (e.offs.length >= 3) { const s = e.offs.slice().sort((a, b) => a - b), m = s.length >> 1, med = s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; e.cal = clamp(med, -0.15, 0.15); }
    }
    press(e, T) {
      const ch = this.chart, w = this.win, spb = this.spb;
      if (T < this.s0 - spb * 0.5) {   // warm-up: tap along with the metronome (this also measures the phone's lag)
        if (T < this.w0 - 0.4) return;
        const k = clamp(Math.round((T - this.w0) / spb), 0, 3), off = T - (this.w0 + k * spb);
        if (Math.abs(off) < 0.32) { this.addOff(e, off); e.warm = 1; this.say(e, '👍', '#ffffff'); }
        return;
      }
      if (T > this.s1 + 0.5) return;
      const Tc = T - e.cal; let best = -1, bd = 1e9;
      for (let i = e.next; i < ch.length; i++) {
        const n = ch[i]; if (n.t - Tc > w[2]) break; if (e.res[i]) continue;
        const d = Math.abs(Tc - n.t); if (d <= w[2] && d < bd) { bd = d; best = i; }
      }
      if (best >= 0) { const q = bd <= w[0] ? 1 : bd <= w[1] ? 2 : 3; if (q < 3) this.addOff(e, T - ch[best].t); this.judge(e, best, q, Tc - ch[best].t); }   // only clean hits teach the lag
      else if (!this.kid && !e.hold && e.strayT <= 0) { e.score = Math.max(0, e.score - 10); e.stray++; e.strayT = 0.3; this.say(e, '多按了 -10', '#b4aecb'); }
    }
    judge(e, i, q, err) {
      e.res[i] = q;
      if (q === 4) { e.combo = 0; e.cnt[3]++; e.sad = 0.4; this.say(e, J_TXT[3], J_COL[3]); this.feed(0); return; }
      const n = this.chart[i], c = this.col(e);
      e.combo++; e.best = Math.max(e.best, e.combo); e.cnt[q - 1]++;
      const mult = 1 + Math.min(5, Math.floor(e.combo / 10)) * 0.1;
      e.score += Math.round([100, 70, 40][q - 1] * mult);
      this.say(e, J_TXT[q - 1], J_COL[q - 1], !this.kid && q > 1 ? (err < 0 ? '早' : '晚') : '');
      e.flash = q === 1 ? 1 : 0.6;
      Fx.burst(HIT_X, e.y, q === 1 ? J_COL[0] : c, q === 1 ? 12 : q === 2 ? 7 : 4, 250);
      if (q === 1) Fx.ring(HIT_X, e.y, '#fff', this.laneH * 0.6, 0.3);
      if (n.hold > 0) e.hold = { i, end: n.t + n.hold, loose: 0, sp: 0 };
      if (e.combo % 10 === 0) { this.ctx.sfx('star'); Fx.pop(CRIT_X, e.y - this.laneH * 0.42, e.combo + ' 連擊！', '#ff7a1f', 30); this.ctx.buzz(e.p, 60); }
      this.feed([1, 0.7, 0.4][q - 1]);
    }
    feed(v) { this.accSum += v; this.accN++; this.hypeT = this.hypeT * 0.92 + v * 0.08; }

    /* ---------------- drawing ---------------- */
    bgLayer(g) {
      const m = g.getTransform(), s = clamp(Math.round(Math.hypot(m.a, m.b) * 4) / 4, 0.5, 2);
      if (!this.bgCv || this.bgS !== s) {
        const c = this.bgCv || document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
        const cg = c.getContext('2d'); cg.setTransform(s, 0, 0, s, 0, 0); this.paintBg(cg); this.bgCv = c; this.bgS = s;
      }
      g.drawImage(this.bgCv, 0, 0, W, H);
    }
    paintBg(g) {
      const kid = this.kid, sky = g.createLinearGradient(0, 0, 0, 780);
      if (kid) { sky.addColorStop(0, '#2a1a5e'); sky.addColorStop(0.55, '#8a2f8f'); sky.addColorStop(1, '#f2789a'); }
      else { sky.addColorStop(0, '#08051f'); sky.addColorStop(0.6, '#2b1260'); sky.addColorStop(1, '#6b2bb8'); }
      g.fillStyle = sky; g.fillRect(0, 0, W, 790);
      // stars (more at night)
      const n = kid ? 26 : 90; let sd = 7;
      const r01 = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let i = 0; i < n; i++) { g.globalAlpha = 0.3 + r01() * 0.6; g.fillStyle = '#fff'; const x = r01() * W, y = r01() * 520, r = 0.8 + r01() * 1.8; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      // far city skyline behind the stage
      g.fillStyle = kid ? 'rgba(60,20,80,.45)' : 'rgba(20,8,50,.6)';
      for (let x = 0, i = 0; x < W; i++) { const w = 50 + (i * 37 % 70), h = 60 + (i * 53 % 140); g.fillRect(x, 700 - h, w, h + 90); x += w + 6; }
      g.fillStyle = kid ? 'rgba(255,220,150,.35)' : 'rgba(255,230,140,.3)';
      for (let x = 10, i = 0; x < W; x += 23, i++) for (let y = 560; y < 700; y += 26) if ((i * 7 + y) % 5 === 0) g.fillRect(x, y, 7, 9);
      // side curtains
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? 0 : W; g.fillStyle = '#7a1238';
        g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 - s * 150, 0); g.quadraticCurveTo(x0 - s * 70, 400, x0 - s * 110, 790); g.lineTo(x0, 790); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 6;
        for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x0 - s * k * 28, 0); g.quadraticCurveTo(x0 - s * k * 14, 400, x0 - s * k * 21, 790); g.stroke(); }
      }
      // valance
      g.fillStyle = '#8f1744'; g.fillRect(0, 0, W, 26);
      for (let x = 0; x < W; x += 80) { g.beginPath(); g.arc(x + 40, 26, 40, 0, Math.PI); g.fill(); }
      g.fillStyle = '#ffd36b'; g.fillRect(0, 22, W, 4);
      // truss
      g.fillStyle = '#4a4560'; g.fillRect(0, 150, W, 6); g.fillRect(0, 172, W, 6);
      g.strokeStyle = '#6e6888'; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x < W; x += 28) { g.moveTo(x, 156); g.lineTo(x + 14, 172); g.lineTo(x + 28, 156); }
      g.stroke();
      // stage deck + LED floor frame
      g.fillStyle = '#1b1033'; g.fillRect(0, 772, W, H - 772);
      g.fillStyle = '#2b1c4d'; g.fillRect(0, 766, W, 8);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 40; c++) { g.fillStyle = (r + c) & 1 ? '#241640' : '#2a1a4a'; g.fillRect(c * 40 + 2, 778 + r * 26, 36, 22); }
      // speaker cabinets
      for (const x of [8, W - 88]) for (const [y, hh] of [[330, 220], [560, 206]]) {
        g.fillStyle = '#17121f'; g.beginPath(); g.roundRect(x, y, 80, hh, 8); g.fill();
        g.strokeStyle = '#3a3350'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#26202f'; g.beginPath(); g.roundRect(x + 8, y + 8, 64, hh - 16, 6); g.fill();
      }
    }
    drawDisc(g, t, pulse) {
      const cx = W / 2, cy = 410, R = 170 * (1 + pulse * 0.025);
      for (let k = 3; k >= 1; k--) { g.globalAlpha = (0.06 + this.hype * 0.04) * (1 + pulse * 0.6); g.fillStyle = this.kid ? '#ffd27a' : '#c7d2fe'; g.beginPath(); g.arc(cx, cy, R * (1 + k * 0.22), 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      if (this.kid) {
        g.save(); g.translate(cx, cy); g.rotate(t * 0.15); g.fillStyle = 'rgba(255,214,120,.28)';
        for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(-18, -R - 8); g.lineTo(0, -R - 56 - pulse * 14); g.lineTo(18, -R - 8); g.fill(); }
        g.restore();
        const gr = g.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, R); gr.addColorStop(0, '#fff7c2'); gr.addColorStop(1, '#ffab4a');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      } else {
        const gr = g.createRadialGradient(cx - 40, cy - 50, 20, cx, cy, R); gr.addColorStop(0, '#fffdf2'); gr.addColorStop(1, '#d9d4f2');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
        g.fillStyle = 'rgba(150,140,190,.35)';
        for (const [x, y, r] of [[-60, -40, 28], [40, 30, 36], [-20, 70, 18], [70, -70, 16], [-90, 40, 14]]) { g.beginPath(); g.arc(cx + x, cy + y, r, 0, TAU); g.fill(); }
      }
    }
    drawBeams(g, t, pulse) {
      const on = 2 + Math.round(this.hype * 4);
      g.globalCompositeOperation = 'lighter';
      this.lamps.forEach((L, i) => {
        const lit = LAMP_ORDER.indexOf(i) < on ? 1 : 0.25;
        const a = Math.PI / 2 + Math.sin(t * (0.6 + this.hype * 0.6) + L.ph) * (0.35 + this.hype * 0.2), len = 700;
        const ex = L.x + Math.cos(a) * len, ey = 176 + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a), w = 70 + this.hype * 40;
        g.globalAlpha = (0.05 + this.hype * 0.09) * (0.65 + 0.35 * pulse) * lit; g.fillStyle = L.c;
        g.beginPath(); g.moveTo(L.x - 8, 178); g.lineTo(ex + nx * w, ey + ny * w); g.lineTo(ex - nx * w, ey - ny * w); g.lineTo(L.x + 8, 178); g.closePath(); g.fill();
      });
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      for (const L of this.lamps) {   // lamp cans on the truss
        g.fillStyle = '#2a2638'; g.beginPath(); g.roundRect(L.x - 14, 158, 28, 24, 6); g.fill();
        g.fillStyle = L.c; g.globalAlpha = 0.6 + 0.4 * pulse; g.beginPath(); g.arc(L.x, 182, 9, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
    }
    drawFloor(g, pulse) {
      const bi = Math.max(0, this.lastBeat), m = this.hype > 0.7 ? 2 : this.hype > 0.35 ? 3 : 4;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 40; c++) {
        const lit = (c + r * 2 + bi * 3) % m === 0, mirror = (39 - c + r * 2 + bi * 3) % m === 0;
        if (!lit && !mirror) continue;
        g.globalAlpha = (0.25 + 0.35 * this.hype) * (0.45 + 0.55 * pulse);
        g.fillStyle = PAL[(c + bi) % 6]; g.fillRect(c * 40 + 2, 778 + r * 26, 36, 22);
      }
      g.globalAlpha = 1;
    }
    drawSpeakers(g, kick) {
      for (const x of [48, W - 48]) for (const [y, hh] of [[330, 220], [560, 206]]) {
        const cy = y + hh * 0.62, R = 27 * (1 + kick * 0.14);
        g.fillStyle = '#0d0a12'; g.beginPath(); g.arc(x, cy, 31, 0, TAU); g.fill();
        g.fillStyle = '#3d3550'; g.beginPath(); g.arc(x, cy, R, 0, TAU); g.fill();
        g.fillStyle = '#1c1726'; g.beginPath(); g.arc(x, cy, R * 0.55, 0, TAU); g.fill();
        g.fillStyle = '#5a5070'; g.beginPath(); g.arc(x, cy, R * 0.22, 0, TAU); g.fill();
        g.fillStyle = '#3d3550'; g.beginPath(); g.arc(x, y + hh * 0.22, 12 * (1 + kick * 0.1), 0, TAU); g.fill();
        g.fillStyle = PAL[0]; g.globalAlpha = 0.4 + 0.6 * kick; g.beginPath(); g.arc(x, y + 16, 3.5, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
    }
    drawCrowd(g, frac) {
      const hy = this.hype, bounce = Math.sin(Math.PI * frac);
      for (const c of this.crowd) {
        const bob = (2 + hy * 12 * c.s) * bounce * (0.7 + 0.3 * Math.sin(c.ph)), x = c.x, y = 858 - bob, r = 21 * c.s;
        if (hy > c.th) {   // hands in the air (with glow sticks when it's really going)
          const sw = Math.sin(this.visT * 3 + c.ph) * 10;
          g.strokeStyle = '#120a24'; g.lineWidth = 9 * c.s; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - 14 * c.s, y + 26); g.lineTo(x - 26 * c.s + sw, y - 34 * c.s); g.moveTo(x + 14 * c.s, y + 26); g.lineTo(x + 24 * c.s + sw, y - 30 * c.s); g.stroke();
          if (hy > 0.6) { g.strokeStyle = c.c; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 24 * c.s + sw, y - 30 * c.s); g.lineTo(x + 30 * c.s + sw * 1.4, y - 52 * c.s); g.stroke(); }
        }
        g.fillStyle = '#120a24'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(x, y + 44 * c.s, 38 * c.s, 30 * c.s, 0, 0, TAU); g.fill();
      }
    }
    drawLane(g, e) {
      const lh = this.laneH, y = e.y, hh = lh * 0.4, c = this.col(e);
      g.fillStyle = 'rgba(16,8,36,.62)'; g.beginPath(); g.roundRect(LX0, y - hh, LX1 - LX0, hh * 2, Math.min(26, hh)); g.fill();
      if (e.flash > 0) { g.globalAlpha = e.flash * 0.22; g.fillStyle = c; g.fill(); g.globalAlpha = 1; }
      g.strokeStyle = c; g.globalAlpha = 0.75; g.lineWidth = 3; g.stroke(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(HIT_X, y - 3, LX1 - HIT_X - 14, 6);
    }
    drawBeatLines(g, e, T) {
      const hh = this.laneH * 0.36, spb = this.spb, sp = this.speed;
      const b0 = Math.ceil((T - (HIT_X - LX0) / sp - this.s0) / spb), b1 = Math.floor((T + (LX1 - HIT_X) / sp - this.s0) / spb);
      for (let b = Math.max(0, b0); b <= b1; b++) {
        const tt = this.s0 + b * spb; if (tt > this.s1 + 0.01) break;
        const x = HIT_X + (tt - T) * sp; if (x < HIT_X - 10 || x > LX1 - 12) continue;
        g.fillStyle = b % 4 === 0 ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)'; g.fillRect(x - 1.5, e.y - hh, 3, hh * 2);
      }
    }
    drawNotes(g, e, T) {
      const ch = this.chart, sp = this.speed, nr = Math.min(32, this.laneH * 0.25), c = this.col(e), lim = T + (LX1 - HIT_X - 20) / sp;
      for (let i = this.vis0; i < ch.length; i++) {
        const n = ch[i]; if (n.t > lim) break;
        const st = e.res[i], active = e.hold && e.hold.i === i;
        if (st >= 1 && st <= 3 && !active) continue;
        const miss = st === 4;
        let x = HIT_X + (n.t - T) * sp; if (active) x = HIT_X;
        const r = nr * (n.big ? 1.12 : 1);
        if (n.hold > 0) {
          const x2 = Math.min(LX1 - 16, HIT_X + (n.t + n.hold - T) * sp);
          if (x2 > x) {
            g.globalAlpha = miss ? 0.3 : active ? 0.95 : 0.7; g.fillStyle = miss ? '#8b85a3' : c;
            g.beginPath(); g.roundRect(x, e.y - r * 0.55, x2 - x, r * 1.1, r * 0.55); g.fill();
            g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, e.y - r * 0.18, x2 - x - r * 0.4, r * 0.18);
            g.globalAlpha = miss ? 0.4 : 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(x2, e.y, r * 0.55, 0, TAU); g.fill();
            g.fillStyle = miss ? '#8b85a3' : c; g.beginPath(); g.arc(x2, e.y, r * 0.38, 0, TAU); g.fill();
            g.globalAlpha = 1;
          }
        }
        if (x < LX0 + r) continue;
        g.globalAlpha = miss ? Math.max(0, 0.45 - (HIT_X - x) / 600) : 1;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, e.y, r, 0, TAU); g.fill();
        g.fillStyle = miss ? '#8b85a3' : c; g.beginPath(); g.arc(x, e.y, r * 0.8, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - r * 0.25, e.y - r * 0.3, r * 0.32, r * 0.2, -0.5, 0, TAU); g.fill();
        if (n.big) { g.fillStyle = '#fff'; this.star(g, x, e.y + r * 0.08, r * 0.38); }
        else { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x, e.y, r * 0.18, 0, TAU); g.fill(); }
        if (n.hold > 0 && !miss) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, e.y, r * 1.18, 0, TAU); g.stroke(); }
        g.globalAlpha = 1;
      }
    }
    star(g, x, y, r) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
    drawDrum(g, e, T, pulse) {
      const R = Math.min(40, this.laneH * 0.31), c = this.col(e), y = e.y, hitK = clamp(1 - (T - e.lastPress) / 0.12, 0, 1);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(HIT_X, y, R * (1.18 + pulse * 0.1), 0, TAU); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(HIT_X, y, R, 0, TAU); g.fill();
      g.fillStyle = hitK > 0 ? '#ffffff' : '#f6ecff'; g.beginPath(); g.arc(HIT_X, y, R * (0.76 - hitK * 0.06), 0, TAU); g.fill();
      if (hitK > 0) { g.globalAlpha = hitK; g.fillStyle = c; g.beginPath(); g.arc(HIT_X, y, R * 0.7, 0, TAU); g.fill(); g.globalAlpha = 1; }
      g.strokeStyle = 'rgba(43,35,64,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(HIT_X, y, R * 0.76, 0, TAU); g.stroke();
      // warm-up: the drums count 1 2 3 4 with the metronome
      const T0 = this.w0, bp = this.bp;
      if (T >= T0 - 0.05 && T < this.s0) {
        const k = clamp(Math.floor(bp), 0, 3), fr = bp - Math.floor(bp);
        g.font = `900 ${Math.round(R * (1.1 + Math.exp(-fr * 6) * 0.35))}px ${RFONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = hitK > 0.3 ? '#fff' : '#2b2340'; g.fillText(String(k + 1), HIT_X, y + 2);
      }
      if (e.warm > 0) { g.globalAlpha = e.warm; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(HIT_X, y, R * (1.2 + (1 - e.warm) * 0.6), 0, TAU); g.stroke(); g.globalAlpha = 1; }
    }
    drawCritterLane(g, e, T, frac, bp) {
      const lh = this.laneH, r = Math.min(36, lh * 0.29), lv = e.combo >= 20 ? 3 : e.combo >= 10 ? 2 : e.combo >= 4 ? 1 : 0, playing = T >= this.w0 && T < this.s1 + this.spb;
      const amp = playing ? 3 + lv * 5 : 1.5, bounce = Math.sin(Math.PI * frac);
      const hop = amp * bounce + e.hit * 8, sq = (playing ? Math.exp(-frac * 8) * (0.05 + lv * 0.03) : 0) - e.hit * 0.12;
      const rot = lv >= 2 ? Math.sin(bp * Math.PI) * 0.06 * lv : 0, c = this.col(e);
      const y = e.y + r * 0.12;
      if (lv >= 3) {   // star power: a glowing halo and sparkles
        g.globalAlpha = 0.25 + 0.25 * Math.exp(-frac * 4); g.fillStyle = c; g.beginPath(); g.arc(CRIT_X, y - hop, r * 1.45, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.fillStyle = '#fff6b0'; for (let k = 0; k < 3; k++) { const a = bp * 1.6 + k * TAU / 3; this.star(g, CRIT_X + Math.cos(a) * r * 1.5, y - hop + Math.sin(a) * r * 1.2, 7); }
      }
      drawCritter(g, CRIT_X, y, r, e.p.col, e.p.animal, { face: 0.15, hop, squash: sq, rot, happy: (lv >= 1 || (e.jT < 0.3 && e.jc !== J_COL[3])) && e.sad <= 0, stun: e.sad > 0, step: 0, moving: false, alpha: e.p.online || e.p.local ? 1 : 0.45 });
      // a drumstick swings down on every press
      const sw = e.hit;
      g.save(); g.translate(CRIT_X + r * 0.75, y - hop - r * 0.1); g.rotate(-0.9 + sw * 1.2);
      g.strokeStyle = '#f5d6a0'; g.lineWidth = Math.max(4, r * 0.14); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 1.15, 0); g.stroke();
      g.fillStyle = '#fff1d6'; g.beginPath(); g.arc(r * 1.18, 0, r * 0.14, 0, TAU); g.fill();
      g.restore();
    }
    drawLabel(g, e) {
      const lh = this.laneH, c = this.col(e), y = e.y, fs = Math.round(clamp(lh * 0.2, 17, 22));
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `700 ${fs}px ${FONT}`;
      const name = (this.teams ? TEAMS[e.p.team].icon + ' ' : '') + e.p.name;
      const w = Math.min(150, g.measureText(name).width + 18);
      g.fillStyle = c; g.beginPath(); g.roundRect(NAME_X - 6, y - fs * 1.05 - 6, w, fs + 10, (fs + 10) / 2); g.fill();
      g.fillStyle = '#fff'; g.fillText(name, NAME_X + 3, y - fs * 0.55 - 6, 132);
      if (e.combo >= 3) {
        const big = e.combo >= 10, k = clamp(1 - e.jT * 4, 0, 1);
        g.font = `900 ${Math.round(fs * (big ? 1.35 : 1.15) * (1 + k * 0.15))}px ${RFONT}`;
        g.lineWidth = 5; g.strokeStyle = '#2b2340'; g.lineJoin = 'round';
        const s = e.combo + ' 連擊'; g.strokeText(s, NAME_X, y + fs * 0.75); g.fillStyle = big ? '#ffd23f' : '#ffffff'; g.fillText(s, NAME_X, y + fs * 0.75);
      } else if (e.cal && Math.abs(e.cal) >= 0.03 && !this.kid) {
        g.font = `700 ${Math.round(fs * 0.72)}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.55)';
        g.fillText('延遲校正 ' + (e.cal > 0 ? '+' : '') + Math.round(e.cal * 1000) + 'ms', NAME_X, y + fs * 0.75);
      }
    }
    drawJudge(g, e) {
      if (e.jT > 0.7 || !e.jt) return;
      const k = e.jT / 0.7, s = Math.round(clamp(this.laneH * 0.3, 22, 36) * (k < 0.12 ? 0.6 + k / 0.12 * 0.5 : k < 0.25 ? 1.1 - (k - 0.12) / 0.13 * 0.1 : 1));
      const x = HIT_X, y = e.y - Math.min(40, this.laneH * 0.31) * 1.05 - k * 16;
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      g.font = `900 ${s}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = s * 0.22; g.lineJoin = 'round'; g.strokeStyle = '#2b2340'; g.strokeText(e.jt, x, y); g.fillStyle = e.jc; g.fillText(e.jt, x, y);
      if (e.jh) { g.font = `700 ${Math.round(s * 0.55)}px ${FONT}`; g.lineWidth = 4; const hx = x + g.measureText(e.jt).width / 2 + s * 0.6; g.strokeText(e.jh, hx, y + 2); g.fillStyle = '#fff'; g.fillText(e.jh, hx, y + 2); }
      g.globalAlpha = 1;
    }
    drawWarm(g, T) {
      const spb = this.spb; if (T >= this.s0 + spb * 0.6) return;
      const a = T < this.s0 - spb * 0.3 ? 1 : clamp(1 - (T - (this.s0 - spb * 0.3)) / (spb * 0.9), 0, 1); if (a <= 0) return;
      const cx = W / 2 + 120, cy = (LY0 + LY1) / 2, bp = this.bp, k = Math.floor(bp), fr = bp - k;
      g.globalAlpha = a * 0.82; g.fillStyle = '#1a0f33'; g.beginPath(); g.roundRect(cx - 330, cy - 100, 660, 200, 34); g.fill();
      g.globalAlpha = a; g.strokeStyle = COL; g.lineWidth = 5; g.stroke();
      g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
      g.fillText(T < this.w0 - 0.05 ? '準備…' : T < this.s0 - spb * 0.3 ? '跟著拍子，一起拍！' : '開始囉！', cx + 50, cy - 48);
      for (let i = 0; i < 4; i++) {
        const x = cx - 105 + i * 110, y = cy + 34, cur = k === i && T >= this.w0 - 0.05, done = k > i;
        const r = 32 * (cur ? 1 + Math.exp(-fr * 6) * 0.3 : 1);
        g.fillStyle = cur ? COL : done ? '#f9a8d4' : 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
        g.font = `900 ${Math.round(r * 1.05)}px ${RFONT}`; g.fillStyle = cur || done ? '#fff' : 'rgba(255,255,255,.6)'; g.fillText(String(i + 1), x, y + 2);
      }
      // a little metronome with a swinging arm
      const mx = cx - 250, my = cy + 60, sw = T >= this.w0 - 0.2 ? Math.sin(Math.PI * bp) * 0.5 : 0;
      g.fillStyle = '#a0683a'; g.beginPath(); g.moveTo(mx - 44, my + 20); g.lineTo(mx + 44, my + 20); g.lineTo(mx + 16, my - 120); g.lineTo(mx - 16, my - 120); g.closePath(); g.fill();
      g.fillStyle = '#f5e1c0'; g.beginPath(); g.moveTo(mx - 28, my + 6); g.lineTo(mx + 28, my + 6); g.lineTo(mx + 10, my - 100); g.lineTo(mx - 10, my - 100); g.closePath(); g.fill();
      g.save(); g.translate(mx, my); g.rotate(sw);
      g.strokeStyle = '#2b2340'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -112); g.stroke();
      g.fillStyle = COL; g.beginPath(); g.roundRect(-11, -84, 22, 18, 4); g.fill();
      g.restore();
      g.fillStyle = '#2b2340'; g.beginPath(); g.arc(mx, my, 7, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    draw(g) {
      const T = this.visT, t = T, playing = T >= this.w0 - 0.05 && T < this.s1 + this.spb;
      const bp = this.bp, fr = bp - Math.floor(bp), frac = playing ? fr : (t * 0.8) % 1;
      const pulse = playing ? Math.exp(-fr * 5) : 0.2, kick = playing ? Math.exp(-fr * 9) : 0;
      this.bgLayer(g);
      this.drawDisc(g, t, pulse);
      this.drawBeams(g, t, pulse);
      this.drawFloor(g, pulse);
      this.drawSpeakers(g, kick);
      for (const e of this.es) this.drawLane(g, e);
      this.drawWarm(g, T);
      for (const e of this.es) { this.drawBeatLines(g, e, T); this.drawDrum(g, e, T, pulse); }
      for (const e of this.es) this.drawNotes(g, e, T);
      for (const e of this.es) { this.drawCritterLane(g, e, T, frac, bp); this.drawLabel(g, e); }
      for (const e of this.es) this.drawJudge(g, e);
      this.drawCrowd(g, frac);
      for (const c of this.conf) {
        g.save(); g.translate(c.x, c.y); g.rotate(c.a); g.globalAlpha = Math.min(1, c.life); g.fillStyle = c.c;
        g.fillRect(-7, -4 * Math.abs(Math.cos(c.a * 0.7)) - 1, 14, 8 * Math.abs(Math.cos(c.a * 0.7)) + 2); g.restore();
      }
      g.globalAlpha = 1;
    }

    /* ---------------- hud, phones, results ---------------- */
    center() {
      const T = this.visT;
      if (T < this.s0 - this.spb * 0.3) return '🎵 熱身：跟著拍子拍 4 下';
      if (T >= this.s1) return '🎉 表演結束！';
      const pct = this.accN ? Math.round(this.accSum / this.accN * 100) + '%' : '—';
      return `全場準確 ${pct}・${this.hype > 0.75 ? '🔥 觀眾嗨翻天！' : this.hype > 0.4 ? '👏 觀眾好開心' : '🎵 跟上節奏！'}`;
    }
    teamScore(t) { return this.es.filter(e => e.p.team === t).reduce((s, e) => s + e.score, 0); }
    chip(p) { return '🥁 ' + this.by.get(p).score; }
    pad(p) {
      const e = this.by.get(p), T = this.visT;
      if (T < this.s0 - this.spb * 0.3) return '👀 跟著拍子拍 4 下熱身！';
      if (T >= this.s1) return `🎉 表演結束！${e.score} 分`;
      if (e.combo >= 3) return `連擊 ${e.combo}！${e.combo >= 10 ? '🔥' : ''}`;
      if (e.jT < 0.6 && e.jt) return `${e.jt}　🥁 ${e.score} 分`;
      return `🥁 ${e.score} 分`;
    }
    padLayout() { return Party.state === 'play' ? TAP : null; }
    ready() { return true; }
    acc(e) { const n = e.cnt[0] + e.cnt[1] + e.cnt[2] + e.cnt[3]; return n ? Math.round((e.cnt[0] + e.cnt[1] * 0.7 + e.cnt[2] * 0.4) / n * 100) : 0; }
    results() {
      const rows = this.es.slice().sort((a, b) => b.score - a.score).map(e => ({ p: e.p, key: e.score, line: `完美 ${e.cnt[0]}・連擊 ${e.best}・${e.score} 分` }));
      const r = { rows };
      if (this.teams) { r.teamScores = [this.teamScore(0), this.teamScore(1)]; r.teamText = t => this.teamScore(t) + ' 分'; }
      if (rows.length === 1) { const a = this.acc(this.es[0]); r.title = `準確 ${a}%・` + (a >= 90 ? '節奏大師！' : a >= 75 ? '超有節奏感！' : a >= 55 ? '很不錯喔！' : '再練習一下～'); }
      return r;
    }
  }

  GAMES.push({
    id: 'rhythm', name: '節奏拍拍', icon: '🥁', col: COL, bg: '#140b2e', kind: 'vs', teams: true, players: '1–6 人',
    blurb: '跟著音樂打拍子，鼓點碰到小鼓就拍！',
    btn: { label: '拍', icon: '🥁' },
    rules: kid => kid
      ? ['先跟著拍子拍 4 下熱身', '圓圓的鼓點會往小鼓滑過來', '鼓點碰到小鼓時，按手機上的「拍」', '越準越高分：完美、很好、好！']
      : ['先跟著節拍器拍 4 下，會自動校正手機延遲', '鼓點碰到小鼓的那一刻按「拍」，越準越高分', '有八分音符、反拍、連打；長條要按住到最後', '連擊越多加成越高，亂按會扣一點分'],
    thumb(g) {
      const sky = g.createLinearGradient(0, 0, 0, 180); sky.addColorStop(0, '#1a0f40'); sky.addColorStop(1, '#7b2fb0');
      g.fillStyle = sky; g.fillRect(0, 0, 320, 180);
      g.fillStyle = 'rgba(255,214,120,.18)'; g.beginPath(); g.arc(160, 74, 66, 0, TAU); g.fill();
      g.fillStyle = '#ffcf6e'; g.beginPath(); g.arc(160, 74, 50, 0, TAU); g.fill();
      g.globalCompositeOperation = 'lighter';
      for (const [x, c] of [[60, '#f472b6'], [260, '#60a5fa']]) { g.globalAlpha = 0.18; g.fillStyle = c; g.beginPath(); g.moveTo(x - 4, 0); g.lineTo(x + 50, 180); g.lineTo(x - 50, 180); g.lineTo(x + 4, 0); g.fill(); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      [[64, '#ff4f58', 0], [118, '#2f8cff', 1]].forEach(([y, c, k]) => {
        g.fillStyle = 'rgba(16,8,36,.65)'; g.beginPath(); g.roundRect(8, y - 20, 304, 40, 18); g.fill();
        g.fillStyle = c; g.beginPath(); g.arc(92, y, 15, 0, TAU); g.fill(); g.fillStyle = '#f6ecff'; g.beginPath(); g.arc(92, y, 11, 0, TAU); g.fill();
        for (const x of k ? [150, 196, 286] : [134, 220, 262]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, 9.5, 0, TAU); g.fill(); }
        drawCritter(g, 46, y + 2, 15, k ? 1 : 0, k ? 2 : 0, { face: 0, happy: true, hop: k * 4, noShadow: true });
      });
      g.fillStyle = '#120a24'; for (let i = 0; i < 12; i++) { const x = i * 29 + 6; g.beginPath(); g.arc(x, 166, 10, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x, 186, 18, 14, 0, 0, TAU); g.fill(); }
      g.font = '900 24px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#2b2340'; g.strokeText('完美！', 168, 34); g.fillStyle = '#ffd23f'; g.fillText('完美！', 168, 34);
    },
    create: ctx => new Rhythm(ctx)
  });
})();

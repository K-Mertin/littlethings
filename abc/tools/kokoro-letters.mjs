// Lone letter names (‹b›): Kokoro says a one-syllable input oddly, so say "b. b. b." as sentences and keep the last one.
// usage: node kokoro-letters.mjs <out-dir> [voice] [speed]
// w ("double-you"): MK picked the version said twice ("dˈʌbəljuː. dˈʌbəljuː.", speed 0.8) keeping the part after the longest quiet stretch (ONLY=w LONGEST=1).
import { KokoroTTS } from 'kokoro-js';
import fs from 'fs';
import { execFileSync } from 'child_process';
const [out, voice = 'af_heart', speed = '0.8'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const LETTER = { a: 'ˈeɪ', b: 'bˈiː', c: 'sˈiː', d: 'dˈiː', e: 'ˈiː', f: 'ˈɛf', g: 'dʒˈiː', h: 'ˈeɪtʃ', i: 'ˈaɪ', j: 'dʒˈeɪ',
  k: 'kˈeɪ', l: 'ˈɛl', m: 'ˈɛm', n: 'ˈɛn', o: 'ˈoʊ', p: 'pˈiː', q: 'kjˈuː', r: 'ˈɑːɹ', s: 'ˈɛs', t: 'tˈiː', u: 'jˈuː',
  v: 'vˈiː', w: 'dˈʌbəljuː', x: 'ˈɛks', y: 'wˈaɪ', z: 'zˈiː' };
const fnv = s => { let h = 0x811c9dc5; for (const c of Buffer.from(s)) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
function toWav(x, rate) {
  const n = x.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  return b;
}
// the clip is the letter said 3 times: cut at the two quietest 80 ms stretches between them, keep the last one
function lastRep(x, rate) {
  const f = Math.round(rate * 0.01), rms = [];
  for (let i = 0; i + f <= x.length; i += f) { let s = 0; for (let j = i; j < i + f; j++) s += x[j] * x[j]; rms.push(Math.sqrt(s / f)); }
  const peak = Math.max(...rms), on = rms.map(r => r > peak * 0.05);
  const first = on.indexOf(true), last = on.lastIndexOf(true), len = last - first;
  const sm = rms.map((_, k) => { let s = 0, n = 0; for (let j = k - 4; j <= k + 4; j++) if (j >= 0 && j < rms.length) { s += rms[j]; n++; } return s / n; });
  // the gap before the third time is near two thirds of the way
  let cut = -1;
  for (let k = Math.round(first + len * 0.55); k <= first + len * 0.8; k++) if (cut < 0 || sm[k] < sm[cut]) cut = k;
  // "double-you" is long and Kokoro sometimes says it only twice: take whatever follows the longest quiet stretch
  if (process.env.LONGEST) {
    let best = [0, -1], run = 0;
    for (let k = first; k <= last; k++) { if (!on[k]) { run++; if (run > best[0]) best = [run, k]; } else run = 0; }
    cut = best[1];
  }
  // from the cut, skip to where the sound starts again
  let s0 = cut; while (s0 < last && !on[s0]) s0++;
  return { s: s0 * f, e: (last + 1) * f, ratio: (last - s0) / len };
}
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const report = [];
for (const [l, ipa] of Object.entries(LETTER).filter(([l]) => !process.env.ONLY || process.env.ONLY.includes(l))) {
  const ph = `${ipa}. ${ipa}. ${ipa}.`;
  const { input_ids } = tts.tokenizer(ph, { truncation: true });
  const a = await tts.generate_from_ids(input_ids, { voice, speed: +speed });
  const x = a.audio, rate = a.sampling_rate, { s, e, ratio } = lastRep(x, rate);
  report.push(`${l}:${ratio.toFixed(2)}`);
  const cut = x.slice(Math.max(0, s - Math.round(rate * 0.04)), Math.min(x.length, e + Math.round(rate * 0.1)));
  const id = fnv(`pip|‹${l}›`), wav = `${out}/${id}.wav`;
  fs.writeFileSync(wav, toWav(cut, rate));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-movflags', '+faststart', `${out}/${id}.m4a`]);
  fs.unlinkSync(wav);
}
console.log(report.join(' '));

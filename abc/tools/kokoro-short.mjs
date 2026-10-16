// One-word lines ("frog.", "Gloves!"): Kokoro says a very short input oddly (an extra "a" before it, flat tone),
// so it says the word three times as sentences ("frog. frog. frog.") and we keep the last one.
// usage: node kokoro-short.mjs <lines.tsv: id, voice, text> <out-dir> [pipVoice pipSpeed kidVoice kidSpeed]
import { KokoroTTS } from 'kokoro-js';
import { phonemize } from 'phonemizer';
import fs from 'fs';
import { execFileSync } from 'child_process';
const [tsv, out, pipV = 'af_heart', pipS = '0.8', kidV = 'af_sky', kidS = '0.9'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)+/g;
async function words(t) {
  let r = '', last = 0;
  for (const m of t.matchAll(PUNCT)) {
    if (m.index > last) r += (await phonemize(t.slice(last, m.index), 'en-us')).join(' ');
    r += m[0]; last = m.index + m[0].length;
  }
  if (last < t.length) r += (await phonemize(t.slice(last), 'en-us')).join(' ');
  return r.replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l').replace(/ +/g, ' ').replace(/ ([,.!?])/g, '$1').trim();
}
function toWav(x, rate) { const n = x.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2); return b; }
function lastRep(x, rate) {
  const f = Math.round(rate * 0.01), rms = [];
  for (let i = 0; i + f <= x.length; i += f) { let s = 0; for (let j = i; j < i + f; j++) s += x[j] * x[j]; rms.push(Math.sqrt(s / f)); }
  const peak = Math.max(...rms), on = rms.map(r => r > peak * 0.05);
  const first = on.indexOf(true), last = on.lastIndexOf(true), len = last - first;
  const sm = rms.map((_, k) => { let s = 0, n = 0; for (let j = k - 4; j <= k + 4; j++) if (j >= 0 && j < rms.length) { s += rms[j]; n++; } return s / n; });
  let cut = -1;
  for (let k = Math.round(first + len * 0.55); k <= first + len * 0.8; k++) if (cut < 0 || sm[k] < sm[cut]) cut = k;
  let s0 = cut; while (s0 < last && !on[s0]) s0++;
  return { s: s0 * f, e: (last + 1) * f, ratio: (last - s0) / len, quiet: sm[cut] / peak };
}
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const rows = fs.readFileSync(tsv, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
const report = [];
let n = 0;
for (const [id, v, text] of rows) {
  const file = `${out}/${id}.m4a`;
  if (fs.existsSync(file) || fs.existsSync(`${out}/${id}.skip`)) continue;
  const end = /[.!?]$/.test(text) ? '' : '.';
  const ph = await words(`${text}${end} ${text}${end} ${text}${end}`);
  const { input_ids } = tts.tokenizer(ph, { truncation: true });
  const a = await tts.generate_from_ids(input_ids, { voice: v === 'kid' ? kidV : pipV, speed: +(v === 'kid' ? kidS : pipS) });
  const { s, e, ratio, quiet } = lastRep(a.audio, a.sampling_rate);
  // the last of three should be about a third; the cut should sit in a real pause
  if (ratio < 0.24 || ratio > 0.42 || quiet > 0.08) { fs.writeFileSync(`${out}/${id}.skip`, `${text}\t${ratio.toFixed(2)}\t${quiet.toFixed(3)}`); report.push(`skip ${text} ${ratio.toFixed(2)} ${quiet.toFixed(3)}`); continue; }
  const cut = a.audio.slice(Math.max(0, s - Math.round(a.sampling_rate * 0.04)), Math.min(a.audio.length, e + Math.round(a.sampling_rate * 0.1)));
  const wav = `${out}/${id}.wav`;
  fs.writeFileSync(wav, toWav(cut, a.sampling_rate));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '48k', '-ac', '1', '-movflags', '+faststart', file]);
  fs.unlinkSync(wav);
  if (++n % 50 === 0) console.log(n);
}
console.log(report.join('\n'));

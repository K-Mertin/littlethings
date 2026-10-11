// Record ABC Island voice clips with Kokoro-82M (open model, Apache-2.0), on your own computer.
//
//   node kokoro-record.mjs samples <phrases.tsv> <out-dir>          a few lines in several voices, plus samples.html
//   node kokoro-record.mjs all <phrases.tsv> <out-dir> [pipVoice] [kidVoice]   every English line
//
// Letters are written ‹a› in phrases.tsv; Kokoro gets their IPA directly so "a" is always "ay", never "I".
// Chinese lines (voice zh) are skipped: Kokoro's JS version only speaks English.
import { KokoroTTS } from 'kokoro-js';
import { phonemize } from 'phonemizer';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const [mode, tsv, out, pipVoice = 'af_heart', kidVoice = 'af_sky'] = process.argv.slice(2);
if (!mode || !tsv || !out) { console.log('usage: node kokoro-record.mjs samples|all phrases.tsv out-dir [pipVoice] [kidVoice]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const LETTER = { a: 'ˈeɪ', b: 'bˈiː', c: 'sˈiː', d: 'dˈiː', e: 'ˈiː', f: 'ˈɛf', g: 'dʒˈiː', h: 'ˈeɪtʃ', i: 'ˈaɪ', j: 'dʒˈeɪ',
  k: 'kˈeɪ', l: 'ˈɛl', m: 'ˈɛm', n: 'ˈɛn', o: 'ˈoʊ', p: 'pˈiː', q: 'kjˈuː', r: 'ˈɑːɹ', s: 'ˈɛs', t: 'tˈiː', u: 'jˈuː',
  v: 'vˈiː', w: 'dˈʌbəljuː', x: 'ˈɛks', y: 'wˈaɪ', z: 'zˈiː' };
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)+/g;

// same idea as kokoro-js's own phonemizer: keep punctuation, phonemize the words with espeak (en-us)
async function words(t) {
  let r = '', last = 0;
  for (const m of t.matchAll(PUNCT)) {
    if (m.index > last) r += (await phonemize(t.slice(last, m.index), 'en-us')).join(' ');
    r += m[0]; last = m.index + m[0].length;
  }
  if (last < t.length) r += (await phonemize(t.slice(last), 'en-us')).join(' ');
  return r;
}
async function toPhonemes(text) {
  const parts = text.replace(/[‘’]/g, "'").split(/‹(.)›/);   // odd indexes are letters
  let ph = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2) { ph += (ph && !/\s$/.test(ph) ? ' ' : '') + LETTER[parts[i]] + ' '; continue; }
    if (parts[i].trim() === '' && parts[i] !== '') { ph += ' '; continue; }
    const w = await words(parts[i]);
    ph += (/^[A-Za-z]/.test(parts[i]) && ph && !/\s$/.test(ph) ? ' ' : '') + w;
  }
  ph = ph.replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l').replace(/ +/g, ' ')
    .replace(/ ([,.!?])/g, '$1').trim();
  return ph;
}

console.log('Loading Kokoro (the first run downloads the model, about 90 MB)…');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });

// 16-bit mono PCM WAV, written synchronously so afconvert always sees a complete file
function toWav(samples, rate) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return buf;
}

async function record(text, voice, file, speed = 0.92) {
  const ph = await toPhonemes(text);
  const { input_ids } = tts.tokenizer(ph, { truncation: true });
  const audio = await tts.generate_from_ids(input_ids, { voice, speed });
  const wav = file.replace(/\.m4a$/, '.wav');
  fs.writeFileSync(wav, toWav(audio.audio, audio.sampling_rate));
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', '-c', '1', wav, file]);
  fs.unlinkSync(wav);
  return ph;
}

const rows = fs.readFileSync(tsv, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));

if (mode === 'samples') {
  const pick = t => rows.find(r => r[2] === t);
  const lines = ['Hi! I am Pip. What do you want to play?', '‹a›. ‹a› is for apple.', 'Great job! ‹b› is for bee.',
    "Let's write ‹r›. Start at the green dot. Follow the arrow!", 'sun. What letter does sun start with?',
    'Listen. queen. queen starts with ‹q›.', 'Yes! Cat!', 'You got a sticker! A rabbit!', 'Which one is purple?',
    'It was fun to talk! Can you say bye-bye?'].map(pick).filter(Boolean);
  const kidLines = ['I like blue.', "I'm happy!", 'Yummy!'].map(t => rows.find(r => r[1] === 'kid' && r[2] === t)).filter(Boolean);
  const voices = ['af_heart', 'af_bella', 'af_nicole', 'af_sky', 'am_puck'];
  const cells = [];
  for (const [id, , text] of [...lines, ...kidLines]) {
    for (const v of voices) {
      const f = `k_${v}_${id}.m4a`;
      if (!fs.existsSync(path.join(out, f))) await record(text, v, path.join(out, f));
      cells.push([text, `Kokoro ${v}`, f]);
    }
    process.stdout.write('.');
  }
  fs.writeFileSync(path.join(out, 'kokoro.json'), JSON.stringify(cells));
  console.log(`\nKokoro samples done (${cells.length}).`);
} else {
  const todo = rows.filter(r => r[1] === 'pip' || r[1] === 'kid');
  let n = 0;
  for (const [id, v, text] of todo) {
    const f = path.join(out, id + '.m4a');
    if (!fs.existsSync(f)) await record(text, v === 'kid' ? kidVoice : pipVoice, f, v === 'kid' ? 1.0 : 0.92);
    if (++n % 50 === 0) console.log(`  ${n} / ${todo.length}`);
  }
  console.log(`Kokoro: ${todo.length} English clips in ${out}`);
}

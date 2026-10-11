import { KokoroTTS } from 'kokoro-js';
import fs from 'fs';
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const wav = (x, r) => { const n = x.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(r, 24); b.writeUInt32LE(r * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2); return b; };
// kind: F = voiceless fricative (cut the noise), V = voiced continuant (cut before the vowel), C = clipped CV, W = whole (vowels), X = word-final ks
export const BANK = {
  s: ['F', 'sːˈɑː'], f: ['F', 'fːˈɑː'], sh: ['F', 'ʃːˈɑː'], th: ['F', 'θːˈɑː'],
  m: ['V', 'mːˈɑː'], n: ['V', 'nːˈɑː'], l: ['V', 'lːˈɑː'], r: ['V', 'ɹːˈɑː'], v: ['V', 'vːˈɑː'], z: ['V', 'zːˈɑː'],
  b: ['C', 'bə'], d: ['C', 'də'], g: ['C', 'ɡə'], p: ['C', 'pə'], t: ['C', 'tə'], c: ['C', 'kə'], k: ['C', 'kə'], j: ['C', 'dʒə'],
  h: ['C', 'hə'], q: ['C', 'kwə'], w: ['C', 'wə'], y: ['C', 'jə'], ch: ['C', 'tʃə'],
  bl: ['B', 'blə'], fl: ['B', 'flə'], st: ['B', 'stə'], sn: ['B', 'snə'], fr: ['B', 'fɹə'], tr: ['B', 'tɹə'],
  a: ['W', 'ˈæ'], e: ['W', 'ˈɛ'], i: ['W', 'ˈɪ'], o: ['W', 'ˈɑ'], u: ['W', 'ˈʌ'], x: ['X', 'bˈɑːks']
};
fs.mkdirSync('bank', { recursive: true });
fs.writeFileSync('bank/kinds.json', JSON.stringify(Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v[0]]))));
for (const [k, [, ph]] of Object.entries(BANK)) {
  const { input_ids } = tts.tokenizer(ph, { truncation: true });
  const a = await tts.generate_from_ids(input_ids, { voice: 'af_heart', speed: 0.85 });
  fs.writeFileSync(`bank/${k}.wav`, wav(a.audio, a.sampling_rate));
}
console.log('carriers', Object.keys(BANK).length);

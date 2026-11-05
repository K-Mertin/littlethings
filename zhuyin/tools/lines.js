// 列出所有台詞：node tools/lines.js > audio/phrases.tsv
// 欄位：id、文字、（出題的句子多一欄 q，錄音時念慢一點）
const ZY = require('../data.js');
const lines = [...new Set(ZY.allLines().map(ZY.spoken))];
const Q = new Set([...ZY.questionLines()].map(ZY.spoken));
const seen = new Map();
for (const t of lines) {
  const id = ZY.hash(t);
  if (seen.has(id) && seen.get(id) !== t) { console.error('hash collision', t, seen.get(id)); process.exit(1); }
  seen.set(id, t);
  process.stdout.write(`${id}\t${t}${Q.has(t) ? '\tq' : ''}\n`);
}

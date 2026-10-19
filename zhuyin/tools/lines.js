// 列出所有台詞：node tools/lines.js > audio/phrases.tsv
const ZY = require('../data.js');
const lines = ZY.allLines();
const seen = new Map();
for (const t of lines) {
  const id = ZY.hash(t);
  if (seen.has(id) && seen.get(id) !== t) { console.error('hash collision', t, seen.get(id)); process.exit(1); }
  seen.set(id, t);
  process.stdout.write(`${id}\t${t}\n`);
}

// 列出所有台詞：node tools/lines.js > audio/phrases.tsv
const M = require('../data.js');
const seen = new Map();
for (const t of M.allLines()) {
  const id = M.hash(t);
  if (seen.has(id) && seen.get(id) !== t) { console.error('hash collision', t, seen.get(id)); process.exit(1); }
  seen.set(id, t);
  process.stdout.write(`${id}\t${t}\n`);
}

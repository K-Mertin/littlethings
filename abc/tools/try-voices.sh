#!/bin/bash
# Make a listening page that compares voices for ABC Island: Kokoro (open model, runs on this Mac)
# and the macOS voices you have installed.   bash try-voices.sh   →   opens samples/samples.html
set -u
cd "$(dirname "$0")"
TSV="${1:-phrases.tsv}"
OUT=samples
mkdir -p "$OUT"

if ! command -v node >/dev/null; then echo "Node.js is needed: brew install node   (or https://nodejs.org)"; exit 1; fi
if [ ! -d node_modules/kokoro-js ]; then
  echo "Installing kokoro-js (one time)…"
  [ -f package.json ] || echo '{"name":"abc-voices","private":true,"type":"module"}' > package.json
  npm install --silent kokoro-js@1.2.1 phonemizer@1.2.1 || exit 1
fi
node kokoro-record.mjs samples "$TSV" "$OUT" || exit 1

# macOS voices: Samantha plus any Premium / Enhanced English voices that are installed
echo "macOS voices…"
LINES=("Hi! I am Pip. What do you want to play?" "‹a›. ‹a› is for apple." "Great job! ‹b› is for bee." "Let's write ‹r›. Start at the green dot. Follow the arrow!" "sun. What letter does sun start with?" "Listen. queen. queen starts with ‹q›." "Yes! Cat!" "You got a sticker! A rabbit!" "Which one is purple?" "It was fun to talk! Can you say bye-bye?" "I like blue." "I'm happy!" "Yummy!")
VOICES=$(say -v '?' | grep -E '[[:space:]]en_(US|GB|AU)[[:space:]]' | sed -E 's/[[:space:]]+en_[A-Z]{2}[[:space:]].*$//' | grep -E '^Samantha$|Premium|Enhanced' | head -6)
echo "[" > "$OUT/macos.json"; first=1
while IFS= read -r v; do
  [ -z "$v" ] && continue
  for i in "${!LINES[@]}"; do
    t="${LINES[$i]}"
    spoken=$(printf '%s' "$t" | sed -E 's/‹(.)›/[[char LTRL]]\1[[char NORM]]/g')
    f="m_$(printf '%s' "$v" | tr -c 'A-Za-z0-9' '_')_$i.m4a"
    if [ ! -s "$OUT/$f" ]; then
      say -v "$v" -r 160 -o "$OUT/tmp.aiff" "$spoken" </dev/null 2>/dev/null && afconvert -f m4af -d aac -b 48000 -c 1 "$OUT/tmp.aiff" "$OUT/$f" 2>/dev/null
    fi
    [ $first = 1 ] && first=0 || printf ',' >> "$OUT/macos.json"
    node -e 'process.stdout.write(JSON.stringify([process.argv[1], "macOS " + process.argv[2], process.argv[3]]))' "$t" "$v" "$f" >> "$OUT/macos.json"
  done
done <<< "$VOICES"
echo "]" >> "$OUT/macos.json"
rm -f "$OUT/tmp.aiff"

node - "$OUT" <<'EOF'
const fs = require('fs'), out = process.argv[2];
const cells = [...JSON.parse(fs.readFileSync(out + '/kokoro.json')), ...JSON.parse(fs.readFileSync(out + '/macos.json'))];
const voices = [...new Set(cells.map(c => c[1]))], lines = [...new Set(cells.map(c => c[0]))];
const show = t => t.replace(/‹(.)›/g, '<b>$1</b>');
let h = `<!doctype html><meta charset="utf-8"><title>ABC Island voices</title><style>body{font:15px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px 8px;vertical-align:middle}th{background:#f6f6f6;position:sticky;top:0}td:first-child{max-width:260px}button{font-size:18px;padding:4px 10px;cursor:pointer}</style>
<h1>ABC Island：選 Pip 的聲音</h1><p>點 ▶ 聽聽看，特別注意字母（a、b、r、q）有沒有唸對、整句語調自不自然。最後三句是聊天裡小朋友的台詞。</p><table><tr><th>句子</th>${voices.map(v => `<th>${v}</th>`).join('')}</tr>`;
for (const l of lines) h += `<tr><td>${show(l)}</td>${voices.map(v => { const c = cells.find(c => c[0] === l && c[1] === v); return `<td>${c ? `<button onclick="new Audio('${c[2]}').play()">▶</button>` : ''}</td>`; }).join('')}</tr>`;
fs.writeFileSync(out + '/samples.html', h + '</table>');
EOF
echo "Open: $(pwd)/$OUT/samples.html"
open "$OUT/samples.html" 2>/dev/null || true

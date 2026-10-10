#!/bin/bash
# Record ABC Island's voice clips with the macOS `say` command.
#
#   bash make-audio.sh [phrases.tsv] [out-dir]
#
# phrases.tsv lines: <id> <TAB> <voice> <TAB> <text>   (voice = pip | kid | zh)
# Writes <out-dir>/<id>.m4a for every line, <out-dir>/index.json listing them,
# and abc-audio.zip next to the output folder. Safe to run again: existing clips are kept.
set -u
cd "$(dirname "$0")"
TSV="${1:-phrases.tsv}"
OUT="${2:-audio}"
mkdir -p "$OUT"

have_voice() { say -v '?' | awk '{print $1}' | grep -qx "$1"; }
pick_voice() { for v in "$@"; do if have_voice "$v"; then echo "$v"; return; fi; done; }

PIP=$(pick_voice Samantha Ava Allison Susan Alex)
KID=$(pick_voice Junior Ralph Samantha)
ZH=$(say -v '?' | awk '/zh_TW/ {print $1; exit}')
[ -z "$ZH" ] && ZH=$(say -v '?' | awk '/zh_CN|zh_HK/ {print $1; exit}')
echo "Pip voice: ${PIP:-none}   kid voice: ${KID:-none}   Chinese voice: ${ZH:-none}"
if [ -z "$PIP" ]; then echo "No English voice found. Add one in System Settings > Accessibility > Spoken Content > System Voice > Manage Voices."; exit 1; fi
[ -z "$ZH" ] && echo "No Chinese voice found: the Chinese hints will be skipped (the game still shows them as text)."

TMP=$(mktemp -d)
total=$(grep -c . "$TSV"); n=0; made=0
while IFS=$'\t' read -r id voice text; do
  [ -z "$id" ] && continue
  n=$((n + 1))
  dst="$OUT/$id.m4a"
  [ -s "$dst" ] && continue
  case "$voice" in
    pip) v="$PIP"; rate=150 ;;
    kid) v="$KID"; rate=165 ;;
    zh)  v="$ZH";  rate=200 ;;
    *) continue ;;
  esac
  [ -z "$v" ] && continue
  if say -v "$v" -r "$rate" -o "$TMP/c.aiff" "$text" </dev/null 2>/dev/null \
     && afconvert -f m4af -d aac -b 40000 -c 1 "$TMP/c.aiff" "$dst" 2>/dev/null; then
    made=$((made + 1))
  else
    echo "  failed: $text"; rm -f "$dst"
  fi
  if [ $((n % 50)) -eq 0 ]; then echo "  $n / $total"; fi
done < "$TSV"
rm -rf "$TMP"

# index.json: every clip that exists
( cd "$OUT" && ls *.m4a 2>/dev/null | sed 's/\.m4a$//' | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{print "]"}' ) > "$OUT/index.json"
count=$(ls "$OUT"/*.m4a 2>/dev/null | wc -l | tr -d ' ')
echo "Recorded $made new clips, $count in total."

rm -f abc-audio.zip
( cd "$OUT" && zip -q -r ../abc-audio.zip . )
echo "Done: $(pwd)/abc-audio.zip ($(du -h abc-audio.zip | cut -f1))"

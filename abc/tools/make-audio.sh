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
# Chinese: voice names can contain spaces ("Eddy (Chinese (Taiwan))"), so cut the name off at the locale,
# and test each candidate, because a name like "Eddy" alone can resolve to the English voice.
secs() { afinfo "$1" 2>/dev/null | awk '/estimated duration/ {print $3}'; }
ZH=""
T=$(mktemp -d)
while IFS= read -r name; do
  [ -z "$name" ] && continue
  if say -v "$name" -o "$T/t.aiff" "從綠色的點開始，跟著箭頭描" </dev/null 2>/dev/null; then
    d=$(secs "$T/t.aiff"); if awk -v d="${d:-0}" 'BEGIN{exit !(d > 1.2)}'; then ZH="$name"; break; fi
  fi
done < <( { say -v '?' | grep -E '[[:space:]]zh_TW[[:space:]]'; say -v '?' | grep -E '[[:space:]]zh_(HK|CN)[[:space:]]'; } | sed -E 's/[[:space:]]+zh_[A-Z]{2}[[:space:]].*$//')
rm -rf "$T"
# re-record the Chinese clips whenever the Chinese voice changes
if [ "$(cat "$OUT/.zh-voice" 2>/dev/null)" != "$ZH" ]; then
  awk -F'\t' '$2=="zh"{print $1}' "$TSV" | while read -r id; do rm -f "$OUT/$id.m4a"; done
  printf '%s' "$ZH" > "$OUT/.zh-voice"
fi
echo "Pip voice: ${PIP:-none}   kid voice: ${KID:-none}   Chinese voice: ${ZH:-none}"
if [ -z "$PIP" ]; then echo "No English voice found. Add one in System Settings > Accessibility > Spoken Content > System Voice > Manage Voices."; exit 1; fi
[ -z "$ZH" ] && echo "No working Chinese voice: the Chinese hints are skipped (the game still shows them as text). To add one: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices > Chinese (Taiwan), e.g. Meijia."

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
  # ‹a› marks a letter: read it as the letter name ("ay"), not as a word
  spoken=$(printf '%s' "$text" | sed -E 's/‹(.)›/[[char LTRL]]\1[[char NORM]]/g')
  if say -v "$v" -r "$rate" -o "$TMP/c.aiff" "$spoken" </dev/null 2>/dev/null \
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
( cd "$OUT" && zip -q -r ../abc-audio.zip . -x '.zh-voice' )
echo "Done: $(pwd)/abc-audio.zip ($(du -h abc-audio.zip | cut -f1))"

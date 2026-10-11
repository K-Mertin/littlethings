#!/bin/bash
# Trim the silence Kokoro leaves before and after each clip (keeps 0.04 s before, 0.1 s after).
#   bash trim-silence.sh <audio-dir>      needs ffmpeg
set -eu
cd "${1:-audio}"
tmp=$(mktemp -d)
ls *.m4a | xargs -P 8 -I{} sh -c 'ffmpeg -v error -y -i "{}" -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse" -c:a aac -b:a 48k -ac 1 -movflags +faststart "'"$tmp"'/{}" && mv "'"$tmp"'/{}" "{}"'
rmdir "$tmp"

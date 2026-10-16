# Sound bank: phonics letter sounds

The letter sounds (⟦a⟧ … ⟦z⟧, ⟦sh⟧ ⟦ch⟧ ⟦th⟧, and the blends ⟦bl⟧ ⟦fl⟧ ⟦st⟧ ⟦sn⟧ ⟦fr⟧ ⟦tr⟧) were recorded by the family
with the recorder page (one take per sound). The original takes are in `recorded/*.webm`.

To rebuild the game clips:
1. `mkdir -p /tmp/wav /tmp/out; for f in recorded/*.webm; do ffmpeg -i $f -ac 1 -ar 44100 -af highpass=f=70 /tmp/wav/$(basename ${f%.webm}).wav; done`
2. `python3 trim-recorded.py /tmp/wav /tmp/out` (needs numpy)
3. Each `/tmp/out/<key>.wav` becomes `audio/<id>.m4a`, where id = fnv1a32("pip|⟦key⟧"), e.g.
   `ffmpeg -i /tmp/out/b.wav -ar 24000 -c:a aac -b:a 64k -ac 1 audio/<id>.m4a`

To re-record one sound, record it again and repeat the steps for that key.

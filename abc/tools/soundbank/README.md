# Sound bank: phonics letter sounds

All letter sounds (⟦a⟧ … ⟦z⟧, ⟦sh⟧ ⟦ch⟧ ⟦th⟧, and the blends ⟦bl⟧ ⟦fl⟧ ⟦st⟧ ⟦sn⟧ ⟦fr⟧ ⟦tr⟧) come from one source:
the IPA recordings on Wikimedia Commons (CC BY-SA 3.0). See `wikimedia/CREDITS.md`.

1. The original recordings are in `wikimedia/*.ogg` (their metadata in `wikimedia/meta.json`).
2. Convert them to 22050 Hz mono WAV: `for f in wikimedia/*.ogg; do ffmpeg -i $f -ac 1 -ar 22050 /tmp/snd/$(basename ${f%.ogg}).wav; done`
3. Cut: `python3 cut-wikimedia.py /tmp/snd /tmp/snd/out` (needs numpy)
4. Each `<key>.wav` becomes `audio/<id>.m4a`, where id = fnv1a32("pip|⟦key⟧").

How each sound is cut:
- vowels: the steady middle of the held vowel
- s, sh, z, h, n: the part before the vowel in [sa], held a little longer
- f, v, th, m: the part between the vowels in [afa]; l: the quietest part of [ala]
- r, w, y, ch, j: the onset plus a short glide into the vowel
- b, d, g, k, p, t: the burst plus 70–80 ms, faded out fast, so there is no "a" after it

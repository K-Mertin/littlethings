# Letter sounds (phonics)

Kokoro always puts a vowel next to a lone consonant (/s/ comes out as "ess"), so the 35 pure sounds
(`⟦s⟧` lines in `audio/phrases.tsv`) are cut out of syllables instead:

1. `node carriers.mjs` (run inside a folder where `kokoro-js` is installed) writes `bank/<sound>.wav`,
   one syllable per sound, e.g. "sːˈɑː" for /s/.
2. `cd bank && python3 ../extract.py` cuts each sound out:
   - s f sh th: only the hiss before the vowel, stretched to 0.5 s
   - m n l r v z: the hum before the vowel, stretched to 0.5 s
   - b d g p t c k j h q w y ch: the stop with a very short schwa (0.22 s)
   - bl fl st sn fr tr: the blend with a short schwa (0.36 s)
   - a e i o u: the short vowel; x: the /ks/ at the end of "box"
3. Encode `cut_<sound>.raw` (16-bit, 24 kHz, mono) to `audio/<id>.m4a`, where id = fnv1a32("pip|⟦sound⟧").

**Exceptions:** a e i o u f v l z and sh ch th come from human recordings on Wikimedia Commons (CC BY-SA 3.0), see `wikimedia/CREDITS.md`.

**Blends** (bl fl st sn fr tr) are cut from whole Kokoro words (blˈɑːk, flˈæɡ, stˈɑːɹ, snˈeɪk, fɹˈɑːɡ, tɹˈiː): from the start of the consonants up to the vowel, so there is no added "uh", then slowed 1.7×.

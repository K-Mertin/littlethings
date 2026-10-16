"""Cut ABC Island's phonics sounds from Wikimedia Commons IPA recordings (one source for every sound).

usage: python3 cut-wikimedia.py <dir with a.wav b.wav … (22050 Hz mono)> <out dir>
Consonant files are like [sa asa] / [ba ab aba]; vowel files are one held vowel.
Writes <key>.wav for the 26 letters, sh ch th, and the blends bl fl st sn fr tr.
"""
import sys, wave, json
import numpy as np

src, out = sys.argv[1], sys.argv[2]
SR = 22050
F = int(SR * 0.01)  # 10 ms frames

def load(k):
    w = wave.open(f'{src}/{k}.wav'); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    return x

def save(k, x):
    x = x / max(1e-6, np.abs(x).max()) * 0.85
    w = wave.open(f'{out}/{k}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()

def frames(x):
    n = len(x) // F; fr = x[:n * F].reshape(n, F)
    rms = np.sqrt((fr ** 2).mean(1)); zcr = (np.abs(np.diff(np.sign(fr), axis=1)) > 0).mean(1)
    return rms, zcr

def chunks(x, gap=6):
    """runs of sound split by >= gap*10 ms of quiet: [(start_frame, end_frame)]"""
    rms, _ = frames(x); on = rms > rms.max() * 0.03; out = []; s = None; q = 0
    for i, v in enumerate(on):
        if v:
            if s is None: s = i
            q = 0
        elif s is not None:
            q += 1
            if q >= gap: out.append((s, i - q + 1)); s = None; q = 0
    if s is not None: out.append((s, len(on)))
    return out

def vowel_runs(x, a, b):
    """runs of vowel frames (loud, low zero-crossing) inside frames a..b"""
    rms, zcr = frames(x); pk = rms[a:b].max(); runs = []; s = None
    for i in range(a, b):
        v = rms[i] > pk * 0.25 and zcr[i] < 0.13
        if v and s is None: s = i
        if not v and s is not None:
            if i - s >= 4: runs.append((s, i))
            s = None
    if s is not None and b - s >= 4: runs.append((s, b))
    return runs

def fade(x, fin=0.008, fout=0.03):
    x = x.copy(); a = int(SR * fin); b = int(SR * fout)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x

def hold(x, secs):
    """lengthen a steady sound by overlap-adding windowed grains taken from its middle"""
    if len(x) >= secs * SR: return x
    mid = x[len(x) // 4: len(x) * 3 // 4]
    g = min(len(mid), int(SR * 0.06)); hop = g // 2; win = np.hanning(g)
    outl = int(secs * SR); y = np.zeros(outl + g); rng = np.random.default_rng(1)
    for p in range(0, outl, hop):
        s = rng.integers(0, max(1, len(mid) - g)); y[p:p + g] += mid[s:s + g] * win
    head = x[:len(x) // 4]; tail = x[len(x) * 3 // 4:]
    body = y[:outl - len(head) - len(tail)]
    return np.concatenate([head, body, tail])

seg = lambda x, a, b: x[a * F:b * F]
info = {}

# vowels: the steady middle of the held vowel
for k in 'aeiou':
    x = load(k); c = chunks(x)[0]; n = c[1] - c[0]
    info[k] = 'vowel middle'
    save(k, fade(seg(x, c[0] + n // 6, c[1] - n // 6), 0.03, 0.08))

def first_onset(x):
    """first chunk, and where its first vowel starts"""
    c = chunks(x)[0]; v = vowel_runs(x, *c)[0]
    return c, v

# continuants said before the vowel ([sa]): the part before the vowel, held longer
for k, secs in [('s', .5), ('sh', .5), ('z', .5), ('h', .35), ('n', .45)]:
    x = load(k); c, v = first_onset(x)
    info[k] = f'before the first vowel, held to {secs}s'
    save(k, fade(hold(seg(x, c[0], v[0]), secs), 0.02, 0.06))

# continuants taken between two vowels ([afa], [ama])
def between(x):
    for c in chunks(x):
        vr = vowel_runs(x, *c)
        if len(vr) >= 2: return vr[0][1], vr[1][0]
    raise SystemExit('no VCV in ' + str(chunks(x)) + ' ' + str([vowel_runs(x, *c) for c in chunks(x)]))
def dip(x):
    """[ala]: l is as voiced as the vowels, so take the quietest stretch in the middle of the last chunk"""
    rms, _ = frames(x); a, b = chunks(x)[-1]; n = b - a
    sm = np.convolve(rms, np.ones(5) / 5, 'same'); lo = a + n // 5; hi = b - n // 5
    m = lo + int(np.argmin(sm[lo:hi])); return m - 6, m + 6
for k, secs in [('l', .45)]:
    x = load(k); a, b = dip(x)
    info[k] = f'the quietest part of [ala], held to {secs}s'
    save(k, fade(hold(seg(x, a, b), secs), 0.03, 0.06))
for k, secs in [('f', .5), ('v', .45), ('th', .5), ('m', .45)]:
    x = load(k); a, b = between(x)
    info[k] = f'between the vowels, held to {secs}s'
    save(k, fade(hold(seg(x, a + 1, b - 1), secs), 0.03, 0.06))

# glides and the affricates: onset plus a short vowel glide, faded out
for k, tail in [('r', 9), ('w', 8), ('y', 8), ('ch', 3), ('j', 3)]:
    x = load(k); c, v = first_onset(x)
    info[k] = f'onset + {tail * 10} ms of the vowel'
    save(k, fade(seg(x, c[0], v[0] + tail), 0.005, 0.06))

# stops: the burst plus a very short bit of voicing, cut off fast (no "a" after it)
for k, tail in [('b', 8), ('d', 8), ('g', 8), ('k', 7), ('p', 7), ('t', 7)]:
    x = load(k); c, v = first_onset(x)
    info[k] = f'burst + {tail * 10} ms'
    save(k, fade(seg(x, max(c[0], v[0] - 6), v[0] + tail), 0.002, 0.05))

def rd(k):
    w = wave.open(f'{out}/{k}.wav'); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
def join(*parts, gap=0.0):
    z = np.zeros(int(SR * gap)); r = []
    for p in parts: r += [p, z]
    return np.concatenate(r[:-1])
# letters that are two sounds
save('c', rd('k')); info['c'] = 'same as k'
save('q', join(rd('k')[:-int(SR * .01)], rd('w'))); info['q'] = 'k + w'
save('x', join(rd('k'), rd('s')[:int(SR * .35)])); info['x'] = 'k + s'
# blends: the two sounds back to back
for k, a, b in [('bl', 'b', 'l'), ('fl', 'f', 'l'), ('st', 's', 't'), ('sn', 's', 'n'), ('fr', 'f', 'r'), ('tr', 't', 'r')]:
    A = rd(a); B = rd(b)
    if a in 'fs': A = A[:int(SR * .3)]
    save(k, fade(join(A, B), 0.01, 0.05)); info[k] = f'{a} + {b}'
json.dump(info, open(f'{out}/cuts.json', 'w'), indent=1)
print(' '.join(f'{k}:{len(rd(k))/SR:.2f}' for k in info))

import wave, json, sys, subprocess, numpy as np
kinds = json.load(open('kinds.json'))
def load(f):
    w = wave.open(f); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768; return x, w.getframerate()
def frames(x, sr, hop):
    out = []
    for k in range(0, len(x) - hop, hop):
        s = x[k:k + hop]; e = np.sqrt((s ** 2).mean()); zc = ((s[:-1] * s[1:]) < 0).mean()
        sp = np.abs(np.fft.rfft(s * np.hanning(len(s)))) ** 2; fq = np.fft.rfftfreq(len(s), 1 / sr)
        band = sp[(fq > 600) & (fq < 2500)].sum() / (sp.sum() + 1e-12)
        out.append((e, zc, band))
    return out
def save(y, sr, name, fade_in=0.03, fade_out=0.08):
    y = y.copy(); n_in = int(sr * fade_in); n_out = int(sr * fade_out)
    if len(y) > n_in + n_out:
        y[:n_in] *= np.linspace(0, 1, n_in); y[-n_out:] *= np.linspace(1, 0, n_out)
    y = y / (np.abs(y).max() + 1e-9) * 0.8
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    open(f'cut_{name}.raw', 'wb').write(pcm)
def stretch(y, sr, target):
    # loop-free time stretch with ffmpeg atempo (keeps the sound's quality)
    open('tmp.raw', 'wb').write((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    f = len(y) / sr / target; chain = []
    while f < 0.5: chain.append('atempo=0.5'); f /= 0.5
    chain.append(f'atempo={f:.4f}')
    out = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', 'tmp.raw', '-af', ','.join(chain), '-f', 's16le', '-'], capture_output=True).stdout
    return np.frombuffer(out, np.int16).astype(float) / 32768
report = {}
for k, kind in kinds.items():
    x, sr = load(f'{k}.wav'); hop = int(sr * 0.01); fr = frames(x, sr, hop)
    E = np.array([f[0] for f in fr]); Z = np.array([f[1] for f in fr]); Bd = np.array([f[2] for f in fr])
    on = int(np.argmax(E > 0.012))                          # first audible frame
    emax = E.max()
    vowel = [i for i in range(on, len(E)) if E[i] > 0.35 * emax and Bd[i] > 0.30 and Z[i] < 0.2]
    v0 = vowel[0] if vowel else len(E)
    if kind == 'F':      # voiceless fricative: noisy frames before the vowel
        seg = [i for i in range(on, v0) if Z[i] > 0.2 and E[i] > 0.004]
        a, b = (seg[0], seg[-1] + 1) if seg else (on, v0)
        y = stretch(x[a * hop:b * hop], sr, 0.5); report[k] = ('F', round((b - a) * 0.01, 3))
    elif kind == 'V':    # voiced continuant: from onset to the vowel
        b = max(on + 6, v0 - 1)
        if k in ('m', 'n', 'l', 'r'):       # nasals and liquids: stop at any breath noise
            nz = [i for i in range(on + 5, b) if Z[i] > 0.2]
            if nz: b = nz[0]
        a = on
        y = stretch(x[a * hop:b * hop], sr, 0.5); report[k] = ('V', round((b - a) * 0.01, 3))
    elif kind == 'C':    # stop + very short schwa
        y = x[on * hop: on * hop + int(sr * 0.22)]; report[k] = ('C', 0.22)
    elif kind == 'B':    # blend + short schwa
        y = x[on * hop: on * hop + int(sr * 0.36)]; report[k] = ('B', 0.36)
    elif kind == 'W':    # short vowel, whole
        last = int(np.nonzero(E > 0.012)[0][-1]) + 1
        y = x[on * hop: last * hop]; report[k] = ('W', round((last - on) * 0.01, 3))
    elif kind == 'X':    # word-final /ks/: from the end of the vowel to the end
        last = int(np.nonzero(E > 0.006)[0][-1]) + 1
        noisy = [i for i in range(len(E)) if Z[i] > 0.2 and E[i] > 0.004]
        a = max(on, (noisy[0] if noisy else last - 20) - 3)
        y = x[a * hop: last * hop]; report[k] = ('X', round((last - a) * 0.01, 3))
    save(y, sr, k)
    report[k] = report[k] + (sr,)
json.dump(report, open('report.json', 'w'))
for k, v in report.items(): print(k, v)

"""Trim and level the parent's phonics recordings (recorded/*.webm from the recorder page).

usage: for f in recorded/*.webm; do ffmpeg -i $f -ac 1 -ar 44100 -af highpass=f=70 /tmp/wav/$(basename ${f%.webm}).wav; done
       python3 trim-recorded.py /tmp/wav /tmp/out      # then each out/<key>.wav -> audio/<fnv1a32("pip|⟦key⟧")>.m4a
Keeps the sound from just before it starts to a little after it ends (by energy over the clip's own noise floor),
fades the ends, and brings every clip to the same voiced level.
"""
import sys, wave, glob, os
import numpy as np
SR = 44100; F = int(SR * 0.01)
res = []
for p in sorted(glob.glob(sys.argv[1] + '/*.wav')):
    k = os.path.basename(p)[:-4]
    w = wave.open(p); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    x = x[int(SR * 0.08):]  # skip the click of the record button
    n = len(x) // F; rms = np.sqrt((x[:n * F].reshape(n, F) ** 2).mean(1)) + 1e-7
    floor = np.percentile(rms, 15); peak = rms.max()
    th = max(floor * 4, peak * 0.06)
    on = np.where(rms > th)[0]
    a, b = on[0], on[-1] + 1
    # keep a little before and after so soft starts and endings are not cut
    s = max(0, (a - 4) * F); e = min(len(x), (b + 10) * F)
    y = x[s:e].copy()
    fi, fo = int(SR * 0.015), int(SR * 0.06)
    y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
    # loudness: match the voiced level of all clips (peak-limited)
    act = rms[a:b]; level = np.sqrt((act ** 2).mean())
    g = min(0.12 / level, 0.9 / np.abs(y).max())
    y *= g
    o = wave.open(f'{sys.argv[2]}/{k}.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((y * 32767).astype(np.int16).tobytes()); o.close()
    res.append(f'{k}:{len(y)/SR:.2f}(snr{20*np.log10(peak/floor):.0f}dB)')
print(' '.join(res))

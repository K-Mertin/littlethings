"""錄「混音」的句子：句子裡的 ㄖㄩㄛㄜㄝㄟㄦ 用曉臻念的片段（tools/clips/*.wav），其他部分用雲哲念，再接成一個音檔。

雲哲念這 7 個注音怎麼念都不自然（MK 2026-10-27 試聽選的），其他句子照舊用 record.py 錄。

    node tools/lines.js > audio/phrases.tsv
    python3 tools/record.py audio/phrases.tsv audio          # 一般句子
    python3 tools/record_mix.py audio/phrases.tsv audio      # 有這 7 個注音的句子（每次都重接，片段有快取）

片段快取放在 tools/.mixcache/（不進 git）。需要 edge-tts、ffmpeg、numpy、soundfile。
"""
import asyncio, os, re, sys, hashlib, subprocess, tempfile
import numpy as np, soundfile as sf, edge_tts

MIX = 'ㄖㄩㄛㄜㄝㄟㄦ'
VOICE, RATE, SR = 'zh-TW-YunJheNeural', '+5%', 24000
here = os.path.dirname(os.path.abspath(__file__))
clipdir = os.path.join(here, 'clips')
cache = os.path.join(here, '.mixcache')
os.makedirs(cache, exist_ok=True)
PUNCT = '，。！？、：；「」『』 '
PAUSE = {'。': .38, '！': .38, '？': .38, '，': .2, '、': .16, '：': .2, '；': .2, '「': .05, '」': .05, ' ': .05}

def decode(path):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()

def trim(y, db=-45):
    thr = 10 ** (db / 20)
    idx = np.where(np.abs(y) > thr)[0]
    return y[max(0, idx[0] - int(.01 * SR)): idx[-1] + int(.02 * SR)] if len(idx) else y

def plan(text):
    """把一句話拆成 [('tts', 文字), ('clip', 符號), ('pause', 秒)]"""
    out = []
    for k, part in enumerate(re.split(f'([{MIX}])', text)):
        if k % 2:
            out.append(('clip', part)); continue
        if not part: continue
        lead = re.match(f'^[{PUNCT}]*', part).group(0)
        body = part[len(lead):]
        tail = re.search(f'[{PUNCT}]*$', body).group(0)
        core = body[:len(body) - len(tail)] if tail else body
        if lead: out.append(('pause', max(PAUSE.get(c, .1) for c in lead)))
        if core: out.append(('tts', core + tail.replace(' ', '')))   # 結尾標點留給語音決定語氣
        if tail: out.append(('pause', max(PAUSE.get(c, .1) for c in tail)))
    return out

def key(t): return hashlib.sha1(t.encode()).hexdigest()[:16]

async def tts(t, sem):
    fn = os.path.join(cache, key(t) + '.mp3')
    if os.path.exists(fn) and os.path.getsize(fn) > 0: return
    async with sem:
        for k in range(6):
            try:
                await asyncio.wait_for(edge_tts.Communicate(t, VOICE, rate=RATE).save(fn), 40)
                if os.path.getsize(fn) > 0: return
            except Exception:
                pass
            await asyncio.sleep(2 + 2 * k)
        if os.path.exists(fn): os.remove(fn)
        print('失敗', t, flush=True)

def build(text, dst, clips, ref_rms):
    parts, gap = [], np.zeros(int(.06 * SR), np.float32)
    prev = None
    for kind, v in plan(text):
        if kind == 'pause':
            parts.append(np.zeros(int(v * SR), np.float32)); prev = 'pause'; continue
        if prev in ('tts', 'clip'): parts.append(gap)
        if kind == 'clip': parts.append(clips[v])
        else: parts.append(trim(decode(os.path.join(cache, key(v) + '.mp3'))))
        prev = kind
    while parts and not parts[-1].any(): parts.pop()
    y = np.concatenate(parts)
    tmp = tempfile.mktemp(suffix='.wav'); sf.write(tmp, y, SR)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', str(SR), '-b:a', '48k', dst], check=True)
    os.remove(tmp)

def rms(y): y = y[np.abs(y) > .01]; return float(np.sqrt(np.mean(y ** 2))) if len(y) else 0

async def main():
    tsv, outdir = sys.argv[1], sys.argv[2]
    rows = [l.rstrip('\n').split('\t', 1) for l in open(tsv, encoding='utf-8') if l.strip()]
    rows = [(i, t) for i, t in rows if re.search(f'[{MIX}]', t)]
    need = sorted({v for _, t in rows for kind, v in plan(t) if kind == 'tts'})
    print(f'{len(rows)} 句混音，{len(need)} 個雲哲片段', flush=True)
    sem = asyncio.Semaphore(3)
    await asyncio.gather(*(tts(t, sem) for t in need))
    missing = [t for t in need if not os.path.exists(os.path.join(cache, key(t) + '.mp3'))]
    if missing: sys.exit(f'還有 {len(missing)} 個片段沒錄到，再跑一次')
    # 曉臻片段音量對齊雲哲
    ref = np.median([rms(decode(os.path.join(cache, key(t) + '.mp3'))) for t in need[:40]])
    clips = {}
    for s in MIX:
        y, sr = sf.read(os.path.join(clipdir, s + '.wav'), dtype='float32')
        assert sr == SR
        clips[s] = (y * (ref / rms(y))).astype(np.float32)
    for i, t in rows: build(t, os.path.join(outdir, i + '.mp3'), clips, ref)
    print('完成', len(rows), flush=True)

asyncio.run(main())

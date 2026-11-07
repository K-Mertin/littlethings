"""重錄「單獨一個數字」的音檔（零～一百），讓聲調正確。

為什麼：雲哲（zh-TW-YunJheNeural）單獨念一個字時常念錯聲調——一、三、七會念成往下掉的四聲，
零、十不會往上揚。同一個聲音在一整串數字裡念（「一，二，三，…」）聲調就是對的。
所以這支程式每次念一串（前後各多念一個數字當墊子，不用），再依停頓切開，存成每個數字的音檔。

    cd math
    python3 tools/fix_numbers.py audio            # 用 edge-tts（和 record.py 一樣）
    TTS_CA=/path/ca.crt python3 tools/fix_numbers.py audio

注意：之後如果用 record.py / record_azure.py 加 --redo 全部重錄，數字又會變回單獨念的版本，重錄完要再跑一次這支。
"""
import asyncio, os, re, ssl, subprocess, sys, tempfile
import edge_tts
if os.environ.get('TTS_CA'):
    import edge_tts.communicate as _c
    _c._SSL_CTX = ssl.create_default_context(cafile=os.environ['TTS_CA'])

outdir = sys.argv[1] if len(sys.argv) > 1 else 'audio'
VOICE, RATE = 'zh-TW-YunJheNeural', '+5%'
D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
def CN(n):   # 和 data.js 的 CN() 一樣
    if n <= 10: return D[n]
    if n < 20: return '十' + D[n - 10]
    if n >= 100: return '一百'
    return D[n // 10] + '十' + (D[n % 10] if n % 10 else '')
def fnv(t):
    h = 0x811c9dc5
    for c in t.encode('utf-8'): h ^= c; h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'

def spans(path):
    out = subprocess.run(['ffmpeg', '-i', path, '-af', 'silencedetect=n=-38dB:d=0.11', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out); dur = int(dur.group(2)) * 60 + float(dur.group(3))
    res, prev = [], 0.0
    for s, e in zip(st, en + [dur]):
        if s - prev > 0.08: res.append((prev, s))
        prev = e
    if dur - prev > 0.08: res.append((prev, dur))
    return res

def trim(src, dst):
    f = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
         'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f, '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)

async def say(text, fn):
    for k in range(10):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(fn)
            if os.path.getsize(fn) > 1000: return True
        except Exception: pass
        await asyncio.sleep(min(30, 2 ** k))
    return False

async def main():
    nums = list(range(0, 101))
    groups = [nums[i:i + 5] for i in range(0, len(nums), 5)]
    ok = 0
    for g in groups:
        pad_a = 8 if g[0] != 8 else 6; pad_b = 2 if g[-1] != 2 else 4    # 前後墊子（不會用到）
        words = [CN(pad_a)] + [CN(n) for n in g] + [CN(pad_b)]
        for attempt in range(4):
            tmp = tempfile.mktemp(suffix='.mp3')
            if not await say('，'.join(words) + '。', tmp): print('錄不到', g); break
            sp = spans(tmp)
            if len(sp) == len(words):
                for n, (a, b) in zip(g, sp[1:-1]):
                    cut = tempfile.mktemp(suffix='.mp3')
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{max(0, a - 0.04):.3f}', '-to', f'{b + 0.06:.3f}', '-i', tmp, cut], check=True)
                    trim(cut, os.path.join(outdir, fnv(CN(n)) + '.mp3')); os.remove(cut); ok += 1
                os.remove(tmp); break
            print(f'  切出 {len(sp)} 段（要 {len(words)} 段），重錄：{"，".join(words)}'); os.remove(tmp)
        else:
            print('放棄', g)
    print(f'完成：{ok} / {len(nums)} 個數字')

asyncio.run(main())

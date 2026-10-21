"""用微軟 Edge 的台灣中文神經語音錄下 phrases.tsv 裡還沒有音檔的句子（和 math/tools/record.py 相同）。

    python3 -m pip install --user edge-tts
    python3 tools/record.py audio/phrases.tsv audio [聲音] [語速]

預設聲音 zh-TW-YunJheNeural（雲哲），語速 +5%。
錄完用 ffmpeg 剪掉前後靜音，存成 audio/<id>.mp3。
"""
import asyncio, os, subprocess, sys, tempfile
import edge_tts, ssl
if os.environ.get("TTS_CA"):
    import edge_tts.communicate as _c
    _c._SSL_CTX = ssl.create_default_context(cafile=os.environ["TTS_CA"])

tsv, outdir = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else 'zh-TW-YunJheNeural'
rate = sys.argv[4] if len(sys.argv) > 4 else '+5%'
rows = [l.rstrip('\n').split('\t', 1) for l in open(tsv, encoding='utf-8') if l.strip()]
todo = [(i, t) for i, t in rows if not os.path.exists(os.path.join(outdir, i + '.mp3'))]
print(f'{len(rows)} 句，要錄 {len(todo)} 句')

def trim(src, dst):
    f = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
         'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f, '-ac', '1', '-ar', '24000',
                    '-b:a', '48k', dst], check=True)

async def one(i, t, sem):
    async with sem:
        tmp = tempfile.mktemp(suffix='.mp3')
        for k in range(4):
            try:
                await edge_tts.Communicate(t, voice, rate=rate).save(tmp)
                if os.path.getsize(tmp) > 0:
                    trim(tmp, os.path.join(outdir, i + '.mp3')); os.remove(tmp); return
            except Exception as e:
                err = e
            await asyncio.sleep(1 + k)
        print('失敗', i, t)

async def main():
    sem = asyncio.Semaphore(6)
    await asyncio.gather(*(one(i, t, sem) for i, t in todo))

asyncio.run(main())

"""用 Azure Speech（正式金鑰）錄下 phrases.tsv 裡還沒有音檔的句子。

只用 Python 內建模組；有 ffmpeg 的話會剪掉前後靜音（沒有也能錄）。

    export AZURE_SPEECH_KEY=你的金鑰
    export AZURE_SPEECH_REGION=eastasia        # 你的資源所在區域
    cd math
    node tools/lines.js > audio/phrases.tsv
    python3 tools/record_azure.py audio/phrases.tsv audio

可選：第三個參數聲音（預設 zh-TW-YunJheNeural 雲哲），第四個參數語速（預設 +5%）。
加 --redo 會把全部句子重錄一次（覆蓋舊檔，例如要把 edge-tts 錄的換成正式 Azure 的）。
免費 F0 每分鐘最多 20 次請求，程式會自己放慢、遇到 429 會等一等再試。
"""
import os, sys, time, shutil, subprocess, tempfile, urllib.request, urllib.error
from xml.sax.saxutils import escape

args = [a for a in sys.argv[1:] if not a.startswith('--')]
redo = '--redo' in sys.argv
if len(args) < 2: sys.exit(__doc__)
tsv, outdir = args[0], args[1]
voice = args[2] if len(args) > 2 else 'zh-TW-YunJheNeural'
rate = args[3] if len(args) > 3 else '+5%'
key, region = os.environ.get('AZURE_SPEECH_KEY'), os.environ.get('AZURE_SPEECH_REGION')
url = os.environ.get('AZURE_TTS_URL') or (region and f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1')
if not key or not url: sys.exit('請先設定 AZURE_SPEECH_KEY 和 AZURE_SPEECH_REGION')
per_min = int(os.environ.get('AZURE_PER_MIN', '18'))   # F0 上限 20／分，留一點餘裕；付費方案可調高

rows = [l.rstrip('\n').split('\t', 1) for l in open(tsv, encoding='utf-8') if l.strip()]
todo = [(i, t) for i, t in rows if redo or not os.path.exists(os.path.join(outdir, i + '.mp3'))]
print(f'{len(rows)} 句，要錄 {len(todo)} 句（約 {len(todo) / per_min:.0f} 分鐘）')
ff = shutil.which('ffmpeg')

def trim(src, dst):
    if not ff: shutil.move(src, dst); return
    f = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
         'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    subprocess.run([ff, '-v', 'error', '-y', '-i', src, '-af', f, '-ac', '1', '-ar', '24000', '-b:a', '48k', dst], check=True)
    os.remove(src)

def synth(text):
    ssml = (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{voice[:5]}">'
            f'<voice name="{escape(voice)}"><prosody rate="{escape(rate)}">{escape(text)}</prosody></voice></speak>')
    req = urllib.request.Request(url, data=ssml.encode('utf-8'), method='POST', headers={
        'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'littleland-recorder'})
    with urllib.request.urlopen(req, timeout=30) as r: return r.read()

done = fail = 0
gap = 60 / per_min
for n, (i, t) in enumerate(todo, 1):
    for k in range(8):
        t0 = time.time()
        try:
            mp3 = synth(t)
            if len(mp3) < 1000: raise ValueError('音檔太短')
            tmp = tempfile.mktemp(suffix='.mp3'); open(tmp, 'wb').write(mp3)
            trim(tmp, os.path.join(outdir, i + '.mp3')); done += 1; break
        except urllib.error.HTTPError as e:
            if e.code in (401, 403): sys.exit(f'金鑰或區域不對（HTTP {e.code}）')
            wait = int(e.headers.get('Retry-After') or 0) or min(60, 5 * 2 ** k)
            print(f'  HTTP {e.code}，等 {wait} 秒再試：{t}'); time.sleep(wait)
        except Exception as e:
            print(f'  錯誤 {e}，再試：{t}'); time.sleep(min(60, 3 * 2 ** k))
    else:
        fail += 1; print('失敗', i, t)
    if n % 20 == 0 or n == len(todo): print(f'{n}/{len(todo)}')
    time.sleep(max(0, gap - (time.time() - t0)))
print(f'完成：錄了 {done} 句，失敗 {fail} 句')

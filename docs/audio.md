# 預錄語音

三款學習遊戲的台詞都是預錄的音檔，遊戲用 Web Audio 播放；找不到音檔才退回瀏覽器 `speechSynthesis`（123 小島會先試 `/api/tts`）。
共同規則：**台詞的 id 是文字的雜湊**，所以改一個字就是新句子，要補錄。

| 遊戲 | 音檔 | 台詞清單 | 聲音 | 工具 |
|---|---|---|---|---|
| ABC Island `abc/` | `audio/<id>.m4a`（約 7,600 個）＋`audio/index.json`（有哪些 id） | `audio/phrases.tsv`（`id`、聲音 pip/kid/zh、文字；id = FNV-1a 32-bit of `聲音|文字`） | Kokoro-82M：Pip = af_heart 0.8、小朋友 = af_sky 0.9；字母純音是家長真人錄音 | `abc/tools/`：`kokoro-record.mjs`、`kokoro-short.mjs`、`kokoro-letters.mjs`、`trim-silence.sh`、`soundbank/` |
| ㄅㄆㄇ 小島 `zhuyin/` | `audio/<id>.mp3` | `node tools/lines.js > audio/phrases.tsv`（從 `data.js` 的 `allLines()` 產生） | 雲哲 zh-TW-YunJheNeural +5%；含注音符號的句子用曉臻 zh-TW-HsiaoChenNeural | `zhuyin/tools/record.py`（edge-tts） |
| 123 小島 `math/` | `audio/<id>.mp3` | `node tools/lines.js > audio/phrases.tsv` | 雲哲 +5% | `math/tools/record.py`（edge-tts）、`record_azure.py`（正式 Azure 金鑰） |

## 改台詞的流程（zhuyin / math）
```sh
cd math                                   # 或 zhuyin
node tools/lines.js > audio/phrases.tsv   # 重新產生清單
python3 tools/record.py audio/phrases.tsv audio   # 只錄還沒有音檔的句子
```
- 錄音要在 MK 的 Mac 上跑（雲端環境連不到 edge-tts／Azure）。雲端 agent 改了台詞就在交付訊息裡請 MK 跑上面的指令，或在 README 註明有句子待錄。
- 清掉不再使用的舊音檔（下面的指令會列出孤兒檔，確認後再刪）：
  ```sh
  python3 - <<'EOF'
  import os
  ids={l.split('\t')[0] for l in open('audio/phrases.tsv') if l.strip()}
  print([f for f in os.listdir('audio') if f.endswith('.mp3') and f[:-4] not in ids])
  EOF
  ```
- 2026-10-29 檢查：math 2,903 句／2,903 檔、zhuyin 2,907 句／2,907 檔，完全對齊。

## ABC 的注意事項
- ABC 的 `phrases.tsv` 是手動維護的（沒有 `lines.js`），台詞散在 `abc/index.html`，有些是執行時組出來的句子。
- 2026-10-29 檢查：有 267 個音檔（約 3.3 MB）不在 `phrases.tsv`，也有 355 句在清單裡但沒有音檔（這些會用瀏覽器語音）。因為句子是動態組的，**沒有辦法只靠靜態比對確定那 267 個沒在用**，所以暫時不刪。要清理的話：在遊戲裡記錄實際播放過的 id（或寫一支 `abc/tools/lines.mjs` 從程式列出所有句子），再比對。
- 單字台詞（例如 "frog."）用 `kokoro-short.mjs`：唸三次取最後一次；單一字母用「b. b. b.」切最後一次。

## 授權
edge-tts 用的是 Edge「大聲朗讀」服務，不是正式授權的 API。正式公開前打算用 Azure Speech（同一個雲哲聲音）重錄：`math/tools/record_azure.py ... --redo`（zhuyin 還沒有對應的 Azure 版腳本）。

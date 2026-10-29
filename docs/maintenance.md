# 維護紀錄與技術債

## 2026-10-29 全 repo 檢查
基準：main `b86773c5`，約 14,600 個追蹤檔案、980 個 commit。

### 已清理
- 刪掉根目錄 5 張沒有任何地方引用的舊截圖（`hubm_p_scroll.png`、`m_land_*.png`、`m_port_*.png`，約 1.1 MB，2026-10-16 隨遊戲小屋合併進來的）。
- 根目錄 `README.md` 改寫：舊的 GitHub Pages 連結換成新網址、鍵盤快捷鍵對照更新、補上 party／link／table／sky／rush／td 等新遊戲與後端、離線的說明。
- 新增 `AGENTS.md`、`CLAUDE.md`、`docs/`（交接文件）。

### 檢查過、確定沒問題
- math、zhuyin 的音檔和台詞清單完全對齊（0 個孤兒檔、0 個缺檔）。
- 遠端分支只剩 main 和已合併的舊分支，沒有未合併的工作。
- `.gitignore`／`.assetsignore` 正確：沒有追蹤到 `.DS_Store`、`node_modules`、暫存檔。
- 外部套件版本全站一致：`three@0.160.0`、`peerjs@1.5.4`、`qrcode-generator@1.4.4`。

### 刻意保留的重複（不要「順手合併」）
- **每款遊戲自成一體**：家長區、語音播放、存檔工具在各遊戲各寫一份。抽成共用程式庫會讓每款的離線包、獨立開發和自行合併權限都變複雜，目前不值得。
- `party/qrcode.js` 和 `minigames/qrcode.js` 內容相同（各 ~24 KB）：兩者是不同的離線範圍（遊戲小屋有自己的 SW），各留一份。
- math 和 zhuyin 有 7 個相同的 mp3（相同句子）：各自的 `audio/` 是獨立的離線包，保留。
- `cobblekeep` 有一批內容相同的材質圖（程式產生的），已知，影響很小。
- `sw.js` 和 `offline/offline.js` 各有一份 `keyOf()`：SW 不能直接 import 頁面腳本，**改一個要同步改另一個**。

### 待決定（需要 MK）
- **ABC 可能的孤兒音檔**：267 個 m4a（約 3.3 MB）不在 `phrases.tsv`。句子是動態組的，靜態比對不能確定沒在用，見 `docs/audio.md`。
- **舊 GitHub Pages**：k-mertin.github.io/littlethings 可能還開著，會曝露 GitHub 帳號；要不要到 repo Settings → Pages 關掉。
- **未上架的 face／face3d／street**：佔 ~26 MB。保留網址（MK 的決定）；street 還在開發。
- **缺 README**：party、link、table、sky、rush 沒有自己的 README（根目錄 README 有一段描述）。下次改到那款時補上。
- `zijia/icons/icons_pack.zip`（28 KB）沒被引用，看起來是圖示原始包，留著。
- zhuyin／math 的 edge-tts 語音授權問題：正式公開前改用 Azure 重錄（`docs/audio.md`）。

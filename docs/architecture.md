# 架構

## 部署
- **Cloudflare Workers**（免費方案）：靜態檔（repo 根目錄就是網站根目錄）＋一支 Worker（`worker/index.js`）。
- 網址 https://littleland.mwstudio.workers.dev/ — Worker `littleland`、帳號子網域 `mwstudio`。網站上刻意不出現 GitHub 帳號。
- **push 到 main 就自動部署**（Cloudflare Workers Builds 連 GitHub `K-Mertin/littlethings`，約 1 分鐘）。沒有 GitHub Actions。
- 部署前 Cloudflare 會跑 `wrangler.jsonc` 的 `build.command`：`node tools/offline-manifest.mjs`（產生離線清單；出錯也 exit 0，不會擋部署）。
- `.assetsignore` 決定哪些檔案**不**上傳：`.git`、`.worktrees`、`*.md`、`*.zip`、`**/tools/`、`zijia/src/`、`worker/`、`.dev.vars`…
  - 所以 README、docs、各遊戲的 `tools/` 不會出現在網站上。新增「只給開發用」的檔案就放在 `tools/` 底下。
- 限制：單檔 ≤ 25 MiB、≤ 20,000 個檔案（目前約 13,800）。
- `keep_vars: true`：Cloudflare 後台手動設的變數不會被部署蓋掉。
- 改 `wrangler.jsonc` 前一定跑 `npx wrangler deploy --dry-run`；設定錯了整站會停在上一版。
- 舊的 GitHub Pages（k-mertin.github.io/littlethings）可能還開著，是否關掉由 MK 決定。

## 後端 `worker/`
只有 `/api/*` 會進 Worker（`assets.run_worker_first`），其他路徑直接回靜態檔。

| 路由 | 檔案 | 作用 |
|---|---|---|
| `/api/outpost/room/ABCD?role=host\|guest` | `index.js` | Crystal Outpost 線上 1v1，WebSocket 轉送（DO `OutpostRoom`） |
| `/api/link/room/ABCDE` | `link.js` | 連線一起玩的房間，WebSocket 轉送（DO `LinkRoom`） |
| `POST /api/chat` | `chat.js` | 大廳小幫手：Claude Messages API，工具 `open_game`、`draft_issue` |
| `POST /api/issue` | `chat.js` | 使用者按「送出」後開 GitHub issue（草稿 HMAC 簽章防竄改） |
| `GET /api/tts?t=…&r=+5%&v=en` | `tts.js` | Azure 神經語音 mp3，同一句存在 DO `TtsCache` 只合成一次 |
| `POST /api/tutor` | `tutor.js` | 學習遊戲答錯時的 AI 家教一句話提示（math、zhuyin 中文；abc 簡單英文） |
| `POST /api/save`、`GET/PUT/DELETE /api/save/<代碼>` | `save.js` | 跨裝置進度備份（大廳「💾 進度備份」，前端 `helper/save.js`） |

### Durable Objects（`wrangler.jsonc`）
| binding | class | migration | 用途 |
|---|---|---|---|
| `OUTPOST_ROOMS` | `OutpostRoom` | v1 | Outpost 對戰房 |
| `CHAT_GUARD` | `ChatGuard` | v2 | 次數限制：`allow(env, key, limit, ttlMs, add=1)` |
| `TTS_CACHE` | `TtsCache` | v3 | 語音快取（一句一個物件） |
| `LINK_ROOMS` | `LinkRoom` | v4 | 連線一起玩房間 |
| `SAVE_BOX` | `SaveBox` | v5 | 進度備份，一個代碼一個物件；一年沒更新自動刪除 |

新增 DO 類別 → 加 binding、export class、**新的 migration tag（v5…）**。不要改舊的 migration。

### 次數限制（都用 `allow()`）
- chat：每 IP 每小時 30 則、每 IP 每天 5 份回報、全站每天 1,500 則。
- tts：每 IP 每小時 80 句新句子、全站每天 15,000 字（Azure F0 每月 50 萬字）。超過回 429，前端改用瀏覽器語音。
- tutor：每 IP 每小時 300 句、全站每天 4,000 句。
- save：每 IP 每天建立 10 份、每小時寫入 120 次、讀取 40 次（防猜代碼）；壓縮後最大 4 MB。

### Secrets 與變數（Cloudflare 後台 → littleland → Settings → Variables and Secrets）
| 名稱 | 類型 | 說明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | secret | 專用 workspace 的 key，有月花費上限 |
| `GITHUB_TOKEN` | secret | fine-grained，只有 littlethings 的 Issues read/write；也拿來衍生 HMAC 金鑰 |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | secret | Azure Speech 獨立資源、F0 免費層 |
| `CLAUDE_MODEL` | var（可不設） | 小幫手模型，預設 `claude-haiku-5-5` |
| `TUTOR_MODEL` | var（可不設） | 家教模型，預設同上 |
| `AZURE_TTS_VOICE`, `AZURE_TTS_RATE` | var（可不設） | 預設 `zh-TW-YunJheNeural`、`+15%` |

沒設 secret 時 API 回 503 和友善訊息，網站其他部分照常。
本機測試用 `.dev.vars`（已 gitignore）：可設 `ANTHROPIC_API_URL`、`GITHUB_API_URL`、`AZURE_TTS_URL` 指到假伺服器（見 testing.md）。

## 大廳 `index.html`
- 遊戲卡片 `<a class="game" href="<slug>/index.html">` 是**唯一的遊戲清單來源**：離線清單（`tools/offline-manifest.mjs`）和小幫手的遊戲清單（`worker/chat.js` 抓大廳頁面解析）都從這裡讀。
- `const HALL = { VERSION, BUILT }`：大廳版本號。
- 需求標籤 `.reqs`：`.req.gl`（3D/WebGL，偵測不到會變紅）、`.req.sr`（語音辨識）、網路／手機。
- 離線狀態小標籤（每張卡片右下）、斷網提示列 `#netBar`。
- 載入 `/offline/offline.js`（`data-game="hall"`）和 `helper/helper.js`。

## 進度備份 `helper/save.js`
- 大廳「💾 進度備份」：把整個網域的 localStorage（所有遊戲的存檔，離線狀態除外）gzip 後存到 `/api/save`，給 12 碼代碼（XXXX-XXXX-XXXX）和 QR code（`/?restore=代碼`）。
- 有代碼的裝置每次打開大廳，進度有變且距上次 5 分鐘以上就自動更新。用 `rev` 做樂觀鎖：別台先更新過就回 409，這台不覆蓋，按鈕亮紅點讓家長選用哪一份。
- 還原 = 清掉這台的 localStorage（保留離線狀態），換成備份內容。
- **新遊戲不用做任何事**：只要存檔放 localStorage 就會自動被備份。存在 IndexedDB 的不會。

## 小幫手 `helper/helper.js`
- 只在大廳。右下浮動聊天；對話存 sessionStorage。不自稱「MW 小幫手」、不自我介紹（MK 的決定）。
- 朗讀：先播 `/api/tts` 的 mp3，失敗才用 `speechSynthesis`（挑台灣中文聲音、語速 1.3）。
- 語音輸入：`SpeechRecognition`。

## 離線
- `sw.js`（根目錄，範圍 `/`）：
  - 網頁／程式（html/js/css/json）：有網路拿最新（6 秒逾時）並更新存檔，沒網路用存檔。
  - 圖片、聲音、模型：先用存檔。
  - jsdelivr／unpkg／Google 字型：先用存檔（`mw-rt-v1`）。
  - 不碰 `/api/`、`/minigames/`、`/offline/manifest`、`/offline/packs/`。
  - 沒存過的頁面離線時回「現在沒有網路」頁（503）。
- 網址正規化 `keyOf()`（`sw.js` 和 `offline.js` 各一份，要一起改）：`/abc/index.html`、`/abc/`、`/abc` 視為同一頁（Cloudflare 會在它們之間轉址）。
- `offline/offline.js`：
  - 下載離線包到 `mw-pack-<slug>`，6 條並行，每 60 個檔案把進度存進 `mw-meta`，可以續傳。
  - 只重抓雜湊有變的檔案；順著 three.js 子模組的 import 一起抓。
  - 8 MB 以下的遊戲打開一次自動存；存過的有新版自動在背景更新。
- `tools/offline-manifest.mjs`：部署時產生 `offline/manifest.json`（小索引）和 `offline/packs/<slug>.json`（完整清單）。兩者不進 git。
  - `SKIP = minigames, party, link`（遊戲小屋有自己的 `minigames/sw.js`；兩個多人遊戲本來就要網路）。
- 噗噗的遊戲小屋的 `minigames/sw.js` 範圍 `/minigames/`，兩個 SW 並存。

## 外部套件（全部從 CDN、版本固定）
- `three@0.160.0`（jsdelivr，importmap）：cobblekeep、racing、rush、sky、minigames、face3d、street。
- `peerjs@1.5.4`：brawl、cobblekeep、racing、party（手機手把／連線）。
- `qrcode-generator@1.4.4`（CDN）：brawl、cobblekeep、racing。party 和 minigames 各有一份相同的本機 `qrcode.js`（刻意保留，見 maintenance.md）。
升級版本要整站搜尋一起改，離線包會跟著抓新網址。

## Claude 排程
「MW issue triage」雲端排程（trigger `trig_01Bsqn68bYzaJy13DSLybzC9`），規則見 workflow.md。

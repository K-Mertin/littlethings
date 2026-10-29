# AGENTS.md — 給接手的 agent

這是 MK 的瀏覽器遊戲合集「MW · Game Hall」。線上：https://littleland.mwstudio.workers.dev/
每個遊戲資料夾自成一體（大多沒有建置步驟），部署在 Cloudflare Workers（靜態檔＋一支 Worker 後端）。

**先讀這份，再依需要讀 `docs/`：**

| 文件 | 什麼時候讀 |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | 動到部署、`worker/`、`wrangler.jsonc`、離線、小幫手、API |
| [`docs/workflow.md`](docs/workflow.md) | **每次都要**：分支、合併權限、大廳版本號、新增遊戲清單 |
| [`docs/games.md`](docs/games.md) | 找某款遊戲在哪、怎麼組成、有沒有建置步驟 |
| [`docs/audio.md`](docs/audio.md) | 改到有預錄語音的遊戲（abc、zhuyin、math）的台詞 |
| [`docs/testing.md`](docs/testing.md) | 驗證改動：本機伺服器、Playwright、離線測試、dry-run |
| [`docs/maintenance.md`](docs/maintenance.md) | 已知的技術債、刻意保留的重複、清理紀錄 |
| `<遊戲>/README.md` | 改那款遊戲前一定要讀（玩法、檔案結構、存檔格式） |

## 最重要的規則（細節在 docs/workflow.md）
1. **不要直接在 main 上開發。** 開新分支（`<遊戲>/<主題>`），改完驗證過再合併。
2. **合併前要 MK 同意**，除了 workflow.md 列出的「可自行合併」的遊戲。動到大廳共用檔案、`worker/`、`wrangler.jsonc`、`sw.js`、`offline/` 一律先問。
3. push 到 main = 自動上線（Cloudflare Workers Builds，約 1 分鐘）。`wrangler.jsonc` 寫錯會讓整站部署失敗 → 先 `npx wrangler deploy --dry-run`。
4. 對 MK 只用**繁體中文**。程式註解、README 也用繁體中文。
5. 金鑰只放在 Cloudflare 後台（MK 自己貼），絕不寫進 repo 或對話。repo 是 public。
6. 改大廳（`index.html`、`helper/`）要更新 `index.html` 裡的 `const HALL = { VERSION, BUILT }`。
7. 新遊戲的首頁 `<head>` 要加 `<script src="/offline/offline.js" data-game="<資料夾>" defer></script>`，大廳加卡片；離線包會自動產生。
8. 遊戲存檔在 localStorage，**不要改存檔格式**而不做遷移——孩子的進度會不見。

## 目錄速覽
```
index.html           遊戲大廳（卡片、版本號、離線按鈕、需求標籤）
helper/              大廳小幫手（聊天＋朗讀＋語音輸入），只在大廳載入
sw.js, offline/      全站離線：service worker＋下載離線包
tools/               部署時跑的 offline-manifest.mjs（產生 offline/manifest.json、offline/packs/）
worker/              Cloudflare Worker：/api/chat、/api/issue、/api/tts、/api/tutor、/api/outpost/room、/api/link/room
wrangler.jsonc       Cloudflare 設定（Durable Objects、migrations、build.command）
.assetsignore        不上傳到 Cloudflare 的檔案（*.md、**/tools/、worker/ …）
docs/                給 agent 的交接文件（就是這些）
<遊戲>/              19 款上架遊戲＋face、face3d、street（未上架，網址可進）
```

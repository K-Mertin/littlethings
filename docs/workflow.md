# 工作流程

## 分支與合併
- 從最新的 `origin/main` 開分支：`<遊戲>/<主題>`（例如 `abc/rhyme-replay`、`hall/favicon`、`fix/issue-12`）。
  - 注意：已經有叫 `abc` 這種**單名**的分支時，`abc/xxx` 會推不上去（git ref 衝突），換個前綴，例如 `abc-x/…`。
- 多個 agent 同時工作時用 `git worktree`（放在 `.worktrees/`，已在 .assetsignore 排除），不要在別人的工作目錄切分支。
- 合併用 `git merge --no-ff`，合併訊息用繁體中文寫「合併 <分支>：<做了什麼>」。

### 誰可以合併
| 範圍 | 規則 |
|---|---|
| minigames、abc、racing、zijia、brawl、zhuyin、cobblekeep、rush、siege、sky、math | 驗證過可以自行合併（math：MK 2026-11-08 說 123 小島「合併，以後也自己合併」；rush、siege：MK 2026-10-26 說千軍突圍「每次都自己先合併」，守城 2026-10-30 從 rush 獨立出來；sky：MK 說空戰「每完成一段就自己合併」） |
| 大廳小改動（文字、排序、小 bug） | 可以自行合併 |
| 其他遊戲 | MK 說「合併」才合併 |
| `worker/`、`wrangler.jsonc`、`sw.js`、`offline/`、`tools/`、`helper/`、全站性改動 | 一律先問 MK |
| 刪除分支、改 repo 設定、改 GitHub Pages | 先問 MK |

合併後到線上確認（約 1 分鐘後）：`curl -sI https://littleland.mwstudio.workers.dev/<遊戲>/`。

## 版本號與更新紀錄（每次改動都要）
- 每款遊戲有自己的版本和更新紀錄：`<遊戲>/releases.json`；大廳自己的在根目錄 `releases.json`。大廳卡片上會顯示「v1.4.0 · 11/8」，點了看那款的紀錄；點標題旁的大廳版本看全部遊戲的更新。
- **改了遊戲就加一筆**（和程式一起 commit）：
  ```sh
  node tools/release.mjs abc minor "新增 Next Level 進階區"
  node tools/release.mjs zhuyin patch "出題的句子念慢一點"
  node tools/release.mjs hall minor "大廳加上分類篩選"      # 改大廳本身（index.html、helper/、sw.js、offline/）
  ```
  - 新內容（新關卡、新玩法、新功能）→ `minor`；修 bug、調整、補語音、改文字 → `patch`；整個改版 → `major`。
  - 內容寫給玩家／家長看：一句話一件事、說玩起來有什麼不同，不寫檔名、分支名、模型名。
  - 遊戲小屋（minigames）：先照原本的方式改 `mini.js` 的 `VERSION` 和遊戲小屋自己的更新列表，再跑 `release.mjs minigames minor "…"`（版本會直接讀 mini.js）。
- **大廳版本會自動往上加**：顯示的版本 = 大廳最新一筆的版本，第三碼再加上之後每一筆遊戲更新。不要手改；`index.html` 裡已經沒有寫死的版本號。
- 合併前跑 `node tools/release.mjs --check`：列出改了程式卻沒加紀錄的遊戲（exit 1）。
- 部署時 `node tools/release.mjs --build` 會把所有紀錄合成 `/whatsnew.json`（不進 git）給大廳讀。本機用 `wrangler dev` 前先跑一次，否則大廳看不到版本。

## 新增一款遊戲（清單）
1. 新資料夾 `<slug>/`，入口 `<slug>/index.html`，有回大廳的連結（`../index.html`）。
2. `<head>` 加離線那一行：`<script src="/offline/offline.js" data-game="<slug>" defer></script>`。
3. 大廳 `index.html` 的 `.grid` 複製一張 `<a class="game" href="<slug>/index.html">` 卡片：
   - 截圖放 `<slug>/hall_shot.jpg`（卡片的 `<img>`）。
   - 分類：`data-cat="…"`，可多選：`kid`（小朋友）`learn`（學習）`action`（動作）`brain`（動腦）`adv`（冒險）`multi`（多人）。沒有 data-cat 的卡片永遠顯示，也不會記進最近玩過。
   - 需要 3D 加 `<span class="req gl">`；需要網路／手機／語音辨識也加對應標籤。
   - 鍵盤快捷鍵：`index.html` 裡 `keydown` 的對照表。
4. 建立 `<slug>/releases.json`：`node tools/release.mjs <slug> major "上架遊戲大廳"`（第一筆會是 1.0.0）。
5. 寫 `<slug>/README.md`（玩法、檔案結構、存檔 key）。
6. 根目錄 README 的遊戲表加一列；`docs/games.md` 加一列。
7. 離線包、小幫手的遊戲清單都是**讀大廳卡片自動產生**，不用另外改。
8. 不想要離線包的（需要網路的多人遊戲）：加到 `tools/offline-manifest.mjs` 的 `SKIP`。

## 改遊戲時
- 先讀那款的 `README.md`；改完更新 README 的功能描述。
- localStorage 存檔：加欄位要相容舊存檔；改結構要寫遷移。
- 有預錄語音的遊戲改台詞要補錄音（`docs/audio.md`）。
- 大檔：Cloudflare 單檔上限 25 MiB、全站 20,000 個檔案（目前約 13,800）。

## Issue 流程（大廳小幫手 → GitHub issue → 排程整理）
- 玩家在小幫手回報 bug／想法，確認後開 issue，標籤 `from-chatbot` + `bug|idea|question` + `game:<slug>`。
- Claude 雲端排程「MW issue triage」（台北時間 00:15、10:15、12:15–18:15 每小時、20:15、22:15）：
  - 整理新 issue：去重，貼 `size:*`、`priority:*`、`triaged`。
  - 小而明確的單一遊戲 bug 修在 `fix/issue-N` 分支，貼 `fix-ready`。不合併。
- MK 用標籤指揮：`go` = 實作（`feat/issue-N`）、`merge` = 合併上線並關閉、`wontfix` = 關閉。
- `model:opus|haiku|fable` 指定該 issue 用哪個模型，沒貼就用 Sonnet。
- 排程不自動修的：存檔格式、遊戲平衡、大廳／共用檔案、worker、wrangler、部署設定、需要重錄語音的。

## 和 MK 溝通
- 繁體中文、口語、精簡。結果先講，細節後講。
- 遇到不可逆或影響全站的決定，先停下來問。

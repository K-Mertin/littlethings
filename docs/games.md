# 遊戲索引

大廳順序（`index.html` 卡片順序）。鍵＝大廳鍵盤快捷鍵。「自行合併」見 workflow.md。
玩法、存檔格式等細節看各資料夾的 `README.md`；沒有 README 的在下表標「—」，改之前要先讀程式。

| 鍵 | 資料夾 | 名稱 | 組成 | 外部套件 | README | 自行合併 |
|---|---|---|---|---|---|---|
| 1 | `minigames/` | 噗噗的遊戲小屋 | 每款一個 HTML（60+ 款），共用 `mini.js`／`mini.css`；自己的 `sw.js`（不走全站離線包）、自己的版本號 `MG.VERSION` | three（開車車） | ✓ | ✓ |
| 2 | `party/` | 大家一起玩 | `index.html`（大螢幕）＋`pad.html`（手機手把）＋`core.js`、`games/` | peerjs、本機 `qrcode.js` | — | |
| L | `link/` | 連線一起玩 | `index.html`＋`core.js`、`net.js`、`games/`；房間走 `/api/link/room` | — | — | |
| 3 | `abc/` | ABC Island | 單一 `index.html`＋`audio/`（Kokoro 預錄）；第二次答錯時 AI 英文提示（`/api/tutor`＋`/api/tts?v=en`） | — | ✓ | ✓ |
| 4 | `zhuyin/` | ㄅㄆㄇ 小島 | `index.html`＋`data.js`＋`audio/`（預錄）；答錯時 AI 家教提示（`/api/tutor`），沒預錄的句子用 `/api/tts` | — | ✓ | ✓ |
| M | `math/` | 123 小島 | `index.html`＋`data.js`＋`audio/`（預錄）；AI 家教 `/api/tutor` | — | ✓ | |
| T | `table/` | 棋牌桌遊 | 每款一個 HTML，共用 `common.js`／`common.css`；電腦對手在 Web Worker。西洋棋教室：`chess-learn.html`＋課程資料 `chess-lessons.js`（6 章 25 課，共用 `chess-logic.js`；`node table/tools/chess-lessons-check.mjs` 驗證每題；進度 key `tb:chl:done`、`tb:chl:cur`）。象棋、五子棋、暗棋可以**線上對戰**（`table/online.js`：房號＋QR code，沿用連線一起玩的 `/api/link/room` 轉送，房主的網頁當裁判；`?net=local` 可用同一台電腦兩個分頁測試）。麻將也能線上對戰（2～4 個真人，空位由房主的電腦補；房主跑整局，只把各人看得到的局面旋轉後單獨送給每位客人，別家手牌與牌牆不外送；斷線 30 秒電腦代打、回來接回；可選打牌限時；程式在 `mahjong.html` 的 `OL` 區塊，房主存檔 key `online:mahjong`）。圍棋死活 `go-puzzle.html`（60 題，入門／初級／中級／進階，星等、解鎖、每日一題；題庫 `go-puzzles.js` 由 `table/tools/go-puzzle-check.mjs` 驗證後產生，不要手改：改題目請改 `tools/go-puzzle-src.mjs` 再跑 `node table/tools/go-puzzle-check.mjs`；存檔 key `gop:stars`／`gop:daily`／`gop:streak`）。新接龍有「每日一局」（依日期固定種子洗牌，`poker:kdaily`、`poker:kdaily-streak`） | — | — | |
| 5 | `cobblekeep/` | Cobble Keep | 3D FPS | three、peerjs、qrcode | ✓ | ✓ |
| 6 | `zijia/` | 銘甲戰記 | **有建置**：`zijia/src/` → `sh build.sh` → 複製 `index.html` 到 `zijia/`（離線那行在 build.sh 裡） | — | ✓ | ✓ |
| 7 | `racing/` | Sunny Circuit | 3D 賽車 | three、peerjs、qrcode | ✓ | ✓ |
| 8 | `outpost/` | Crystal Outpost | 單一檔案 RTS；線上對戰走 `/api/outpost/room` | — | ✓ | |
| 9 | `brawl/` | 小夥伴大作戰 | `index.html`＋`js/`；`controller.html` 手機手把 | peerjs、qrcode | ✓ | ✓ |
| S | `sky/` | 空戰 | `index.html`＋`js/`；three 只用來預渲染 | three | — | |
| G | `rush/` | 千軍突圍 | `index.html`＋`js/`；`tools/sim.js` 平衡模擬器 | three（失敗退回 2D） | — | |
| W | `siege/` | 萬軍守城 | `index.html`＋`js/`（從 rush/js 複製，存檔 `siege:v1`）；`tools/defsim.js` 平衡模擬器 | three（失敗退回 2D） | — | |
| D | `td/` | 守塔奇兵 | `index.html`＋`js/` | — | ✓ | |
| B | `shop/` | 夜市小吃王 | `index.html`＋`js/` | — | ✓ | |
| E | `escape/` | 八音盒謎屋 | `index.html`＋`css/`＋`js/`，美術全 SVG | — | ✓ | |
| R | `dungeon/` | 深淵地牢 | `index.html`＋`js/` | — | ✓ | |
| Q | `rpg/` | 曉鐘傳說 | `index.html`＋`js/` | — | ✓ | |
| J | `bounce/` | 彈彈球大冒險 | `index.html`＋`levels.js`（字元地圖）＋`game.js`，Canvas 2D | — | ✓ | |
| N | `ember/` | 燼燈 | `index.html`＋`js/`（world、core、actors、render、main），Canvas 2D | — | ✓ | |

## 未上架（大廳沒有卡片，網址可以直接進）
| 資料夾 | 說明 |
|---|---|
| `face/` | 2D 捏臉（純 SVG）。從 `street/` 的商店連過去。 |
| `face3d/` | 寫實 3D 捏臉（MakeHuman CC0）；`data/` 由 `tools/build.py` 產生。MK 決定從大廳拿掉但保留網址。 |
| `street/` | MW 大街：3D 商店街，每款遊戲是一間店。給小學中年級以上，還在開發。 |

這三個沒有離線包（離線清單只讀大廳卡片），也不在小幫手的推薦清單裡。

## 共用的東西（各遊戲各自實作，沒有共用程式庫）
- 回大廳：`<a href="../index.html">`。
- 家長區：長按 ⚙️＋算術題（abc、zhuyin、math 各自一份）。
- 存檔：每款自己的 localStorage key（看各 README）。
- 每款的大廳截圖：`<slug>/hall_shot.jpg`（離線包會排除它，大廳包會收）。

## 專案 roadmap
各遊戲的 roadmap 和決策紀錄在 claude.ai 的 Project「Game」（`claude/<遊戲>-roadmap.md`、`claude/deploy.md`），不在 repo 裡。

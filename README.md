# littlethings

MK 的瀏覽器遊戲合集，每個資料夾自成一體。線上遊玩：https://k-mertin.github.io/littlethings/

打開根目錄的 `index.html`（遊戲大廳）選擇遊戲；每款遊戲內都有返回大廳的連結。

| 遊戲 | 資料夾 | 類型 |
|---|---|---|
| [Cobble Keep](https://k-mertin.github.io/littlethings/cobblekeep/) | [`cobblekeep/`](cobblekeep/README.md) | DOOM 操作的 3D 第一人稱射擊，明亮的奇幻怪物風格，10 個關卡、5 個 Boss，可自選關卡，支援手機 |
| [銘甲戰記](https://k-mertin.github.io/littlethings/zijia/) | [`zijia/`](zijia/README.md) | 像素風機器人戰棋 |
| [Sunny Circuit](https://k-mertin.github.io/littlethings/racing/) | [`racing/`](racing/README.md) | 3D 賽車，6 款車＋改裝、5 條賽道可反向、大獎賽、生涯獎金、計時賽幽靈車、雨天與輪胎磨耗、5 種難度 |
| [Crystal Outpost](https://k-mertin.github.io/littlethings/outpost/) | [`outpost/`](outpost/README.md) | 星海爭霸風格的即時戰略：玩法不同的藍色前哨、綻放族與晶族三個陣營、6 關教學任務、1v1 或 2v2（電腦盟友）、3 種地圖風格與大小、自動存檔，支援觸控 |
| [ABC Island](https://k-mertin.github.io/littlethings/abc/) | [`abc/`](abc/README.md) | 幼兒英文：描小寫字母、開頭音、拼字、單字圖卡、和小狐狸 Pip 聊天，貼紙小島，家長區，平板優先 |
| [噗噗的遊戲小屋](https://k-mertin.github.io/littlethings/minigames/) | [`minigames/`](minigames/README.md) | 向「好玩遊戲區」致敬的小遊戲合輯：21 款：下樓梯、接水果、敲地鼠、排球（可兩人對打）、疊疊高樓、釣魚、打磚塊、大家來找碴、翻牌記憶、十乘十方塊、泡泡龍、連連看、彩虹倒水瓶、消消樂、拼拼圖、走迷宮、下棋（黑白棋／五子棋）、小廚房、換裝屋、著色本、小鋼琴 |
| [小夥伴大作戰](https://k-mertin.github.io/littlethings/brawl/) | [`brawl/`](brawl/README.md) | 《小朋友齊打交》風格的橫向格鬥：4 位 Q 版角色各 3 招必殺技、台灣老街闖關打怪獸、和電腦大亂鬥，支援觸控、鍵盤、手把 |
| [捏臉工坊](https://k-mertin.github.io/littlethings/face/) | [`face/`](face/README.md) | 2D 捏臉：臉型、五官、髮型、瀏海、配件、衣服，即時預覽縮圖、隨機、復原、存檔、下載 PNG，支援手機 |
| [寫實捏臉 3D](https://k-mertin.github.io/littlethings/face3d/) | [`face3d/`](face3d/README.md) | 寫實 3D 捏臉：MakeHuman CC0 人體、417 個變形滑桿、寫實皮膚、3D 髮型眉毛睫毛、表情、眼睛看游標，支援手機 |

## 遊玩
直接用瀏覽器打開 `index.html`，或在此資料夾啟動本機伺服器：

```sh
python3 -m http.server 8000   # 然後打開 http://localhost:8000
```

大廳內按 `1` 進入 Cobble Keep，按 `2` 進入銘甲戰記，按 `3` 進入 Sunny Circuit，按 `4` 進入 Crystal Outpost，按 `5` 進入 ABC Island，按 `6` 進入噗噗的遊戲小屋，按 `7` 進入小夥伴大作戰，按 `8` 進入捏臉工坊，按 `9` 進入寫實捏臉 3D。

## 結構
```
index.html        遊戲大廳
cobblekeep/       單一檔案，無建置步驟（Three.js 由 CDN 載入）
zijia/            index.html 由 src/ 建置：cd zijia/src && sh build.sh && cp index.html ..
racing/           單一檔案，無建置步驟
outpost/          單一檔案，無建置步驟，不需任何外部函式庫
abc/              單一檔案，無建置步驟，不需任何外部函式庫
minigames/        每款小遊戲一個 HTML，共用 mini.js / mini.css，無建置步驟
brawl/            單一檔案，無建置步驟，不需任何外部函式庫
face/             單一檔案，無建置步驟，不需任何外部函式庫（純 SVG）
face3d/           index.html＋預先處理的 data/（Three.js 由 CDN 載入）；data/ 由 tools/build.py 從 MakeHuman 素材產生
```

## 新增遊戲
1. 在根目錄新增資料夾，入口為 `<資料夾>/index.html`
2. 在遊戲內加一個 `<a href="../index.html">` 返回大廳
3. 在大廳 `index.html` 的 `.grid` 裡複製一張 `<a class="game">` 卡片並修改內容

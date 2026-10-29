# littlethings

MW · Game Hall：MK 的瀏覽器遊戲合集，每個資料夾自成一體。線上遊玩：https://littleland.mwstudio.workers.dev/

根目錄的 `index.html` 是遊戲大廳；每款遊戲內都有返回大廳的連結。網站部署在 Cloudflare Workers（push 到 main 自動上線），有小幫手聊天、AI 家教、語音朗讀等後端 API，全部遊戲都能下載離線版。

> **開發者／AI agent 請先讀 [`AGENTS.md`](AGENTS.md) 和 [`docs/`](docs/)**：架構、工作流程、合併規則、測試方法都在那裡。

| 遊戲 | 資料夾 | 類型 |
|---|---|---|
| [Cobble Keep](https://littleland.mwstudio.workers.dev/cobblekeep/) | [`cobblekeep/`](cobblekeep/README.md) | DOOM 操作的 3D 第一人稱射擊，明亮的奇幻怪物風格，兩部共 15 個關卡、8 個 Boss，符文柱與封印寶庫、S/A/B/C 評價、生存競技場，可自選關卡，支援手機 |
| [銘甲戰記](https://littleland.mwstudio.workers.dev/zijia/) | [`zijia/`](zijia/README.md) | 像素風機器人戰棋（15 章＋外傳、隱藏夥伴、演習挑戰） |
| [Sunny Circuit](https://littleland.mwstudio.workers.dev/racing/) | [`racing/`](racing/README.md) | 3D 賽車，8 款車＋改裝、10 條賽道可反向（跳台、泥土捷徑、夜間體育場）、生涯模式（四個等級、宿敵、駕照）、淘汰賽／甩尾挑戰／檢查點計時、三種大獎賽、計時賽幽靈車、雨天與輪胎磨耗、5 種難度 |
| [Crystal Outpost](https://littleland.mwstudio.workers.dev/outpost/) | [`outpost/`](outpost/README.md) | 星海爭霸風格的即時戰略：玩法不同的藍色前哨、綻放族與晶族三個陣營、21 關戰役任務（護送、搶點、英雄生存，會升級的英雄）、1v1 或 2v2（電腦盟友）、生存與合作生存模式、對戰重播、3 種地圖風格與大小、峽谷與河流地形、自動存檔，支援觸控 |
| [ABC Island](https://littleland.mwstudio.workers.dev/abc/) | [`abc/`](abc/README.md) | 幼兒英文：描字母、自然發音、單字圖卡、句型填空、排句子、聽力找找看、故事排順序、和小狐狸 Pip 聊天，17 頁貼紙簿，家長區，平板優先 |
| [ㄅㄆㄇ 小島](https://littleland.mwstudio.workers.dev/zhuyin/) | [`zhuyin/`](zhuyin/README.md) | 幼兒注音：37 課課程（先教再玩）、練習島、進階島、探險島（聲調變變變、圖上找找看、彩色注音積木、聲調小偵探、讀短語、跟著讀），台灣腔語音（微軟雲哲／曉臻預錄），可換吉祥物，可拖放的場景貼紙簿，家長區，平板優先 |
| [123 小島](https://littleland.mwstudio.workers.dev/math/) | [`math/`](math/README.md) | 幼兒數學 64 課（每課先示範再練習）：數數、拿拿看、第幾個、比多少、排順序、形狀、規律、時鐘、分與合、分合圖、湊十、加法、減法、數線、算對了嗎、乘法和除法入門、九九、錢幣、二位數、百數表，7 款小遊戲（餵動物、戳氣球、魚缸、湊數配對、打地鼠、青蛙過河、快快算 60 秒挑戰），台灣腔語音（微軟雲哲預錄），貼紙簿，家長區，平板優先 |
| [噗噗的遊戲小屋](https://littleland.mwstudio.workers.dev/minigames/) | [`minigames/`](minigames/README.md) | 向「好玩遊戲區」致敬的小遊戲合輯：30 款：下樓梯、接水果、敲地鼠、排球（可兩人對打）、疊疊高樓、釣魚、打磚塊、節奏樂園、跑跑跑、毛毛蟲（貪食蛇）、開車車（賽車，可兩人）、對對碰（兩人同一台平板面對面）、大家來找碴、翻牌記憶、聽聽看（聲音記憶）、十乘十方塊、泡泡龍、連連看、彩虹倒水瓶、消消樂、拼拼圖、走迷宮、下棋（黑白棋／五子棋）、小廚房、小廚房第二季（蛋糕／壽司／冰淇淋）、換裝屋、著色本、小鋼琴、小寵物、蓋房子；現在共 63 款，每款幾十關，新關卡持續加新玩法（第一次玩到的關卡／玩法會蓋 🎟️ 新玩法印章）；首頁的噗噗會跟著玩過的遊戲長大，紀錄可以備份到別台 |
| [小夥伴大作戰](https://littleland.mwstudio.workers.dev/brawl/) | [`brawl/`](brawl/README.md) | 《小朋友齊打交》風格的橫向格鬥：16 位 Q 版角色各 3 招必殺技、從老街打到 101 的 8 關闖關、無盡挑戰塔和魔王連戰、9 個對戰場地、練習場；1–4 人（同一台 2 人，或手機當手把），支援觸控、鍵盤、手把 |
| [大家一起玩](https://littleland.mwstudio.workers.dev/party/) | `party/` | 多人派對：大家看同一台大螢幕、手機當手把（掃 QR code 加入，第一個人當房主選遊戲），22 款遊戲：比賽 12 款（含拔河比賽、斜手機控制的滾滾球、按住打氣的吹氣球）、合作 4 款（含疊疊高塔）、動腦 6 款（含照著畫、大家來投票）；「派對之夜」連玩 3／5／7 款累積分數、最後頒獎；每款分小朋友／大人模式、可分隊，1–6 人 |
| [連線一起玩](https://littleland.mwstudio.workers.dev/link/) | `link/` | 連線遊戲專區：每支手機有自己的畫面（自己的手牌、身分、視角），同一個空間或各自在家都能玩，電視可當大螢幕。13 款：彩虹牌、心臟病、大富翁小鎮、藏寶島、誰是臥底、傳畫接龍、你畫我猜、貪食蛇大戰、迷霧尋寶、腦力快手、快問快答、太空船大作戰、心有靈犀；小朋友／大人模式、每款可調題數／時間／規則、房間排行榜 |
| [棋牌桌遊](https://littleland.mwstudio.workers.dev/table/) | `table/` | 棋牌桌遊專區：象棋（5 級電腦）、象棋教室（18 課互動課程）、象棋殘局（74 道連將殺＋每日一題）、西洋棋殺棋（56 題）、五子棋（可選黑棋禁手）、黑白棋、圍棋（9／13 路 MCTS 電腦、19 路兩人、點目、SGF）、圍棋教室（14 課互動課程＋吃子遊戲）、撲克牌（新接龍、蜘蛛紙牌、空當接龍、金字塔、大老二、撿紅點、拱豬、心臟病）、數獨（60 關數獨之路＋每日一題）、踩地雷（無猜模式、30 關異形盤面闖關、每日挑戰）；象棋、西洋棋、暗棋、五子棋、黑白棋對電腦有等級分天梯與稱號；悔棋、提示、戰績，支援觸控 |
| [空戰](https://littleland.mwstudio.workers.dev/sky/) | `sky/` | 《雷電》風格的縱向捲軸射擊：15 關＋分歧路線（河谷、海上艦隊、城市、沙漠基地、雲端、冰原、熔岩、太空、深海基地、機械要塞、極光高空、異星地表，第 13 關分 A 霓虹夜城／B 叢林神殿，再到楓紅古都、時空裂隙）共 16 個頭目與登場演出，3D 預渲染機體、地形光影；四種機體（白隼／赤鋒／蒼盾／幻翼）、六種主武器（第 9 關後超限到 Lv10、第 14 關後覺醒到 Lv11 放必殺）＋飛彈／追蹤飛彈、僚機、炸彈、獎章、補給箱、接關、第二輪；任務挑戰（頭目連戰、封印炸彈、獎章連鎖、一命到底）、本機排行榜與練習模式（可直接練頭目）；三種難度（簡單模式會自動放炸彈），支援觸控拖曳、鍵盤、手把，音樂音效即時合成 |
| [千軍突圍](https://littleland.mwstudio.workers.dev/rush/) | `rush/` | 選門射擊（手機廣告常見的選門玩法）：左右拖曳帶部隊穿過 +、−、×、÷ 門，士兵往正前方開槍，對著門開槍數字會變大；15 關、5 個世界各有規則（會動的門、轉盤門、破牆、補給箱、刀鋸、尖刺、冰面、沙暴、停電、大軍、岩漿河、噴火口、火山爆發），兵種門（醫護兵、砲兵、盾兵）與加持門（無敵護罩、狂熱連射），5 種武器、9 種怪物（含丟炸彈、分裂、火蝙蝠、治療巫師、熔岩怪）、5 個頭目（丟東西、重擊、炎龍噴火）；頭目連戰、無盡模式、每日挑戰；守城模式 12 關（砲台射出小兵穿過 ×2、強化門，火口會噴火，打爆敵方基地）；三星評價、金幣永久強化、武器庫選開場武器，支援觸控拖曳、鍵盤、手把；角色、頭目和場景是 Three.js 捏的 3D 模型，載入後烤成精靈圖（載入失敗就用 2D 圖） |
| [守塔奇兵](https://littleland.mwstudio.workers.dev/td/) | [`td/`](td/README.md) | 塔防：三章 26 關（傳送陣、水晶基座、沙暴、海流、吊橋、夜霧、河道、天氣、地道、旋轉祭壇、雪崩陷阱、碎石與熔爐基座、冰洞巢穴、輸送帶、寒潮與火盆）、9 種塔（三級＋二選一專精，含兵營、煉金塔）、29 種敵人與 13 個頭目、隕石／冰封技能、天賦樹、每關限定塔種／無技能／鐵人挑戰、菁英模式、每週挑戰、頭目連戰、第三章劇情對話、48 個成就、圖鑑、詞綴無盡模式、三種難度，支援手機直橫式、滑鼠、鍵盤 |
| [夜市小吃王](https://littleland.mwstudio.workers.dev/shop/) | [`shop/`](shop/README.md) | 開羅風模擬經營：從鐵皮小攤車做到傳說夜市，每級店面不同造型、各攤位烹煮動畫、會排隊端盤吃東西的像素小人、67 道小吃＋9 道季節限定、快炒台、42 種擺設組合、員工特質與搭檔／較勁／進修／挖角、海港／山城／廟會三個新地點與 12 個三星挑戰關卡、夜市美食指南、客人委託、對手挑戰書、年度故事、分店／活動／秘方、傳承二代目、6 種模式、開場故事與阿德伯十堂課新手引導、畫質自動調整、三格自動存檔，支援觸控與滑鼠 |
| [八音盒謎屋](https://littleland.mwstudio.workers.dev/escape/) | [`escape/`](escape/README.md) | 密室逃脫＋推理：14 間謎屋（8 章本篇＋2 章番外＋第二部「海港鐘塔之旅」4 章）、7 件推理事件（證詞矛盾、比對鞋印、照片找線索、排時間表、找出說謊的人）、每日「今日謎題」、計時連關、重玩時答案隨機、無提示挑戰模式與獎牌、隱藏音符與 23 個成就、每步三層提示、自動存檔，支援觸控與滑鼠 |
| [深淵地牢](https://littleland.mwstudio.workers.dev/dungeon/) | [`dungeon/`](dungeon/README.md) | 回合制 Roguelike：17 層隨機地牢＋擊敗深淵之王後的深淵下層（第 18–25 層：溺沒古城、星骸虛空、終焉之心；深水、虛空裂谷與擊退）、6 職業（含武僧）、四座支線秘境（守護者＋獨有遺物）、頭目連戰模式、主角換裝外觀、怪物招式與法術特效、精英怪＋7 頭目、未鑑定道具、符文與共鳴、29 件遺物與 12 種羈絆、地牢人物與旅行商人、7 種樓層事件、寶箱／祭壇／試煉、深淵等級 0–10、33 個成就、圖鑑、每日＋每週挑戰、畫質自動調整、永久死亡＋自動存檔，支援點擊移動與鍵盤 |
| [曉鐘傳說](https://littleland.mwstudio.workers.dev/rpg/) | [`rpg/`](rpg/README.md) | 經典回合制 RPG（原創劇情）：逐像素繪製的大陸與渡船、會掀屋頂的城鎮、側面戰鬥與各法術特效、劇情演出、5 位夥伴與隊伍編成、87 種怪物圖鑑、33 個成就、星之碎片、懸賞、賭場、大鬥技場、秘傳之書、交換之旅、通關後星之迴廊、新篇章「月汐群島」（新地區、伊芙、潮汐／迷途／鐘／日輪謎題、兩階段最終頭目與深淵隱藏頭目）、釣魚小遊戲、二周目、3 個記錄欄位、三種難度，支援觸控與鍵盤 |
| [彈彈球大冒險](https://littleland.mwstudio.workers.dev/bounce/) | [`bounce/`](bounce/README.md) | 橫向捲軸闖關＋解謎：控制一顆球滾動跳躍，變大浮水、變小鑽洞，箱子／壓板／柵欄、風扇、冰、岩漿、火焰棒，4 個世界 12 關、36 顆星星，Canvas 2D 程式繪圖，支援觸控與鍵盤 |
| [捏臉工坊](https://littleland.mwstudio.workers.dev/face/)（未上架） | [`face/`](face/README.md) | 2D 捏臉：臉型、五官、髮型、瀏海、配件、衣服，即時預覽縮圖、隨機、復原、存檔、下載 PNG，支援手機 |
| [寫實捏臉 3D](https://littleland.mwstudio.workers.dev/face3d/)（未上架） | [`face3d/`](face3d/README.md) | 寫實 3D 捏臉：MakeHuman CC0 人體、417 個變形滑桿、寫實皮膚、3D 髮型眉毛睫毛、表情、眼睛看游標，支援手機 |
| [MW 大街](https://littleland.mwstudio.workers.dev/street/)（未上架，開發中） | [`street/`](street/README.md) | 擬真 3D 商店街：操作寫實人物逛街，每間店是一款遊戲，給小學中年級以上 |

## 遊玩
直接打開線上網址，或在本機啟動伺服器：

```sh
python3 -m http.server 8000      # 只看遊戲；然後打開 http://localhost:8000
npx wrangler dev --local         # 連後端 API 一起跑（http://localhost:8787）
```

大廳鍵盤快捷鍵：`1` 遊戲小屋、`2` 大家一起玩、`L` 連線一起玩、`3` ABC Island、`4` ㄅㄆㄇ 小島、`M` 123 小島、`T` 棋牌桌遊、`5` Cobble Keep、`6` 銘甲戰記、`7` Sunny Circuit、`8` Crystal Outpost、`9` 小夥伴大作戰、`S` 空戰、`G` 千軍突圍、`D` 守塔奇兵、`B` 夜市小吃王、`E` 八音盒謎屋、`R` 深淵地牢、`Q` 曉鐘傳說、`J` 彈彈球大冒險。

## 結構
```
index.html        遊戲大廳（卡片是全站唯一的遊戲清單：離線包和小幫手都從這裡讀）
helper/           大廳小幫手（聊天、朗讀、語音輸入）
sw.js offline/    全站離線（service worker＋離線包下載）
tools/            部署時產生離線清單（offline-manifest.mjs）
worker/           Cloudflare Worker 後端：/api/chat、/api/issue、/api/tts、/api/tutor、對戰房間
wrangler.jsonc    Cloudflare 設定
docs/             開發文件（AGENTS.md 是入口）
cobblekeep/       單一檔案，無建置步驟（Three.js 由 CDN 載入）
zijia/            index.html 由 src/ 建置：cd zijia/src && sh build.sh && cp index.html ..
racing/           單一檔案，無建置步驟
outpost/          單一檔案，無建置步驟，不需任何外部函式庫
abc/              單一檔案，無建置步驟，不需任何外部函式庫
zhuyin/           index.html＋data.js＋預錄音檔，無建置步驟
math/             index.html＋data.js＋預錄音檔，無建置步驟
minigames/        每款小遊戲一個 HTML，共用 mini.js / mini.css，無建置步驟
brawl/            index.html＋js/（依序載入，無建置步驟）；controller.html 是手機手把，PeerJS 由 CDN 載入
table/            每款一個 HTML，共用 common.js / common.css，無建置步驟，不需外部函式庫（電腦對手跑在 Web Worker）
sky/              index.html＋js/（依序載入，無建置步驟）；Three.js 由 CDN 載入做 3D 預渲染，地形全部用程式畫
rush/             index.html＋js/（依序載入，無建置步驟；3D 模型用 CDN 的 Three.js，拿不到就退回 2D）；tools/sim.js、tools/defsim.js 是平衡用的無頭模擬器
td/               index.html＋js/（依序載入，無建置步驟，不需外部函式庫）
shop/             index.html＋js/（依序載入，無建置步驟，不需外部函式庫）
escape/           index.html＋css/＋js/（依序載入，無建置步驟，不需外部函式庫，美術全用 SVG）
dungeon/          index.html＋js/（依序載入，無建置步驟，不需外部函式庫）
rpg/              index.html＋js/（依序載入，無建置步驟，不需外部函式庫）
bounce/           index.html＋levels.js（關卡字元地圖）＋game.js，無建置步驟，不需外部函式庫（Canvas 2D 程式繪圖）
face/             單一檔案，無建置步驟，不需任何外部函式庫（純 SVG）
face3d/           index.html＋預先處理的 data/（Three.js 由 CDN 載入）；data/ 由 tools/build.py 從 MakeHuman 素材產生
street/           index.html＋js/＋assets/（Three.js 由 CDN 載入）
party/            index.html（大螢幕）＋pad.html（手機手把）＋core.js、games/；PeerJS 由 CDN 載入
link/             index.html＋core.js、net.js、games/；房間由 worker 的 /api/link/room 轉送
```

## 新增遊戲
照 [`docs/workflow.md`](docs/workflow.md) 的「新增一款遊戲」清單做（資料夾、離線那一行、大廳卡片、版本號、README）。

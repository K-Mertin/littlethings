# MW 大街（MW Street）

擬真風格的 3D 商店街：操作寫實人物在街上逛。單一遊戲是街上的一間店，走到店門口就能進去玩；「噗噗的遊戲小屋」的每款小遊戲都是「MW · GAME HALL」大樓裡的一台機台，「大家一起玩」在大樓後面的派對區。給小學中年級以上的孩子玩；幼兒還是用原本的遊戲大廳（根目錄 `index.html`，這裡完全沒動到它）。

網址：`/street/`（目前沒有從舊大廳連過來，直接用網址進）

## 玩法
- 電腦：`W A S D`／方向鍵走路、按住 `Shift` 跑步、滑鼠拖曳轉視角、滾輪拉近拉遠、`E` 開始遊戲
- 平板手機：左半邊拖曳走路（推到底會跑）、右半邊拖曳轉視角、點一下機台螢幕會自動走過去
- 右上「前往」：選一台機台，角色自己跑過去
- 走到店門口或機台前會跳出介紹卡，按「進入遊戲」→ 鏡頭推近螢幕 → 進入遊戲
- 從遊戲按瀏覽器的上一頁回來，會站在剛剛那台機台前面（用 sessionStorage 記住）

## 場景
- 商店街：從街口往大廳依序是 ABC Island、ㄅㄆㄇ 小島、123 小島、捏臉工坊、小夥伴大作戰、Sunny Circuit、Cobble Keep、銘甲戰記、Crystal Outpost 的店（招牌、遮陽棚、店裡大螢幕播遊戲畫面），其他是布景店（咖啡、珍奶、書店、麵包…）；直立招牌、冷氣室外機、鐵窗、行道樹、長椅、路燈、「MW 大街」牌樓
- MW 遊戲大廳：霓虹招牌、兩面 LED 牆輪播小遊戲畫面、自動門、販賣機
- 大廳裡：噗噗的遊戲小屋所有小遊戲各一台機台，分反應區、益智區、扮家家酒區（一排排背對背）；後面是派對區（大家一起玩：大螢幕＋沙發）；夾娃娃機、櫃檯、街上遊戲的海報
- 街上有路人走來走去；大廳裡有人在夾娃娃

## 檔案
- `index.html`：介面（載入畫面、標題、HUD、介紹卡、選單）
- `js/main.js`：渲染、角色操作、鏡頭、碰撞、自動走路、進入遊戲
- `js/world.js`：場景（街道、店面、大樓、機台）
- `js/avatar.js`：角色載入與動畫切換（待機／走路／跑步）
- `js/games.js`：街上的遊戲店與派對區（自己維護一份，不讀舊大廳）
- `assets/minigames.json`、`assets/minigames-atlas.webp`：遊戲小屋的小遊戲清單與縮圖，用 `tools/build_minigames.py` 從 `minigames/index.html` 產生（遊戲小屋加新遊戲後重跑一次，大廳就會多一台機台）
- `js/sound.js`：Web Audio 即時合成的腳步聲、環境音、投幣聲、門鈴
- `js/kit.js`：小工具（公尺 UV、合併幾何、畫布貼圖、材質）
- `assets/avatar-boy.glb`、`avatar-girl.glb`：角色（`tools/build_avatar.py` 產生）
- `assets/tex/`：PBR 材質（ambientCG，CC0）、`assets/props/`：家具小物（Poly Haven，CC0）、`assets/sky.hdr`：環境光（Poly Haven「wide_street_01」，CC0）

新增單一遊戲：在 `js/games.js` 的 `STREET` 加一筆（會依序放進街上的店面）。

## 畫質
- 「高」：MSAA、泛光（霓虹會發光）、2048 陰影、5 個路人
- 「省電」：不開泛光、1024 陰影、2 個路人、解析度 1x。小螢幕觸控裝置預設省電
- 網址可以加 `?q=low` / `?q=high` 強制

## 角色怎麼做的（tools/build_avatar.py）
```sh
python3 tools/build_avatar.py <makehuman/data> <makehuman 系統素材資料夾> <cmu 動捕資料夾> assets
```
- MakeHuman（CC0）的基礎網格＋年齡／族裔目標（約 17 歲的亞洲青少年），套上衣服、鞋子、頭髮、眉毛、睫毛、眼睛
- 骨架從 MakeHuman 預設骨架簡化成 52 根骨頭，權重合併到保留的骨頭
- 走路（CMU 35_01）、跑步（CMU 35_17）用 CMU 動作捕捉資料重定向，自動找最順的循環段落、原地化；跑步的手臂擺動依腿的節奏用程式加上（CMU 那段手幾乎不動），待機動作是程式做的
- 需要的 CMU 檔案：`35.asf`、`35_01.amc`、`35_17.amc`（mocap.cs.cmu.edu）

## 授權
- 人體、衣服、頭髮：MakeHuman，CC0
- 動作：CMU Graphics Lab Motion Capture Database（mocap.cs.cmu.edu），可自由使用
- 材質：ambientCG，CC0；家具：Poly Haven，CC0；HDRI：Poly Haven，CC0

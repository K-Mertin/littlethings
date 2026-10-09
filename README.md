# littlethings

MK 的瀏覽器遊戲合集，每個資料夾自成一體。線上遊玩：https://k-mertin.github.io/littlethings/

打開根目錄的 `index.html`（遊戲大廳）選擇遊戲；每款遊戲內都有返回大廳的連結。

| 遊戲 | 資料夾 | 類型 |
|---|---|---|
| [Cobble Keep](https://k-mertin.github.io/littlethings/cobblekeep/) | [`cobblekeep/`](cobblekeep/README.md) | DOOM 操作的 3D 第一人稱射擊，明亮可愛風格，10 個關卡、5 個 Boss，可自選關卡，支援手機 |
| [字甲戰線](https://k-mertin.github.io/littlethings/zijia/) | [`zijia/`](zijia/README.md) | 以漢字為機體的機器人戰棋 |

## 遊玩
直接用瀏覽器打開 `index.html`，或在此資料夾啟動本機伺服器：

```sh
python3 -m http.server 8000   # 然後打開 http://localhost:8000
```

大廳內按 `1` 進入 Cobble Keep，按 `2` 進入字甲戰線。

## 結構
```
index.html        遊戲大廳
cobblekeep/       單一檔案，無建置步驟（Three.js 由 CDN 載入）
zijia/            index.html 由 src/ 建置：cd zijia/src && sh build.sh && cp index.html ..
```

## 新增遊戲
1. 在根目錄新增資料夾，入口為 `<資料夾>/index.html`
2. 在遊戲內加一個 `<a href="../index.html">` 返回大廳
3. 在大廳 `index.html` 的 `.grid` 裡複製一張 `<a class="game">` 卡片並修改內容

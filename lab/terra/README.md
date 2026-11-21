# 造物主之島（`lab/terra/`）

上帝視角的地形沙盒：⛰️ 堆山、⛏️ 挖地、🌧️ 在某個地方下大雨、💧 放泉水（最多 8 個）、🧹 整平、🌋 火山（外圈長高、中間留火山口）、🏘️ 村莊（最多 6 個）、☔ 全島下雨、↩️ 復原（最多 10 筆）。筆刷有小／中／大。顯示卡即時算水往低處流、匯成河和湖、河流把山沖出山谷、泥沙被帶到下游堆積（河口三角洲）。樹會長在平緩、乾的草地上，被淹或被挖走就倒下。左上有 9 個「造物主任務」（河流流到海、陸地上的湖、45 公尺高的山、沖刷出山谷、三角洲、村莊長到 10 間房子、火山口湖、瀑布、海上新的小島）。三角洲和山谷只算水和泥沙自己做出來的（`touched` 記下被工具改過的格子，不算）。
three.js **0.187.0** WebGPURenderer；沒有 WebGPU 時改用 CPU 跑同一套模擬（格子比較少）。

## 檔案
| 檔案 | 內容 |
|---|---|
| `index.html` | 版面：載入畫面、頂列（快轉、聲音）、任務清單、工具列、說明 |
| `js/main.js` | 渲染器、天空（也拿來當環境光、下雨變灰）、太陽和陰影、工具與筆刷、鏡頭、小地圖、點選地面（沿視線走、用讀回來的高度）、泉水、復原、任務、存島、雨滴、村莊名牌、聲音、測試掛勾 |
| `js/villages.js` | 村莊：附近有淡水（河、湖）每 4 秒多一間房子、只有海每 12 秒、沒水每 15 秒少一間；淹水（附近平均水深 > 0.3）房子被沖走；地面被沖到海平面就整個不見。牆和屋頂兩個 InstancedMesh（屋頂用 instanceColor） |
| `js/sim.js` | **GPU 模擬**（TSL compute，四個 pass）：A 水管流量、B 水量＋速度＋雨＋泉水＋海、C 沖刷與沉積＋堆高挖低筆刷、D 泥沙順流搬運＋把結果寫進 `StorageTexture`（r 地面高、g 水深、b 泥沙、a 流速）。`read()` 用 `getArrayBufferAsync` 把高度和水深讀回 CPU |
| `js/simcpu.js` | 沒有 WebGPU 時：同一套模擬的 JavaScript 版本，結果寫進 `DataTexture`（格式一樣，畫面程式不用改） |
| `js/world.js` | 一開始的島（好幾層值噪聲＋山脊，越外面越低）；地面材質（沙灘、草地、森林、岩石、雪、濕地變暗、泥沙偏黃褐）；水（淺綠到深藍、帶泥沙變黃濁、急流白沫）；外海、海底；樹 |

## 操作（`main.js`）
- **不讓網頁被放大**：`touchmove` 兩指以上 `preventDefault`、Safari 的 `gesture*` 事件 `preventDefault`、`wheel` 不是 passive（ctrl＋滾輪＝觸控板捏合，改成縮放鏡頭）、面板都設 `touch-action: none`（工具列 `pan-x` 可以左右滑）。
- 鏡頭有 `cam`（現在）和 `goal`（要去的），每一幀靠過去；看的那一點跟著地面高度（`cam.ty`），鏡頭不會鑽進山裡。
- 平移是「抓著地面拖」：手指前後兩點投到 `y = cam.ty` 的平面，差多少就移多少（`grabPan`），放手會滑一下（`fling`）。縮放對著手指／滑鼠那一點（`zoomAt`）。
- 兩根手指：一開始先判斷，兩指一起上下推＝改俯仰角，其他＝平移＋捏合縮放＋轉向一起來。觸控畫筆刷會等 110ms，這段時間第二根手指來了就不畫；畫了不到 0.3 秒就變兩指，當誤觸悄悄復原。
- 電腦：滾輪縮放、右鍵拖曳轉向、中鍵或空白鍵＋拖曳平移、WASD／方向鍵移動、Q E 轉、R F 俯仰、＋－縮放、Home 回到全島。右邊鏡頭按鈕可以按住。右上小地圖點或拖曳就飛過去。
- 堆山、挖地、火山、整平的速度用「每秒真實時間」算（`amt × dt ÷ 步數`），快轉、顯示卡快慢都一樣手感。

## 模擬（`sim.js`，Mei、Decaudin、Hu 2007〈Fast Hydraulic Erosion Simulation and Visualization on GPU〉的虛擬水管模型）
- 每格：地面 H、水深 W、泥沙 S、往四個鄰居的流量 F（vec4）、流速 V（vec2）。每一步 dt = 0.05，WebGPU 每畫面 3 步（快轉 ×2、×4）。
- A：F += dt·g·(自己水面 − 鄰居水面)，不能是負的；總流出不能超過自己的水（等比例縮小）。邊界外不流。
- B：W += dt·(流進 − 流出) ＋ 雨 ＋ 泉水，蒸發 W *= 1 − Ke·dt；**地面低於 0 的格子是海，水面固定在 0**（河流流進海就消失）。流速＝淨流量／平均水深（最小 0.05，最大 8）。
- C 也做「崩落」（thermal erosion）：和鄰居高度差超過 `talus` 的部分每步滑掉 `Kt`，火山和堆出來的山不會變成柱子。筆刷種類 4 整平（往四周平均靠）、5 火山（`1 − 距離/半徑` 的圓錐，中間 0.1–0.28 半徑不長）。
- C：搬運能力 = Kc × max(坡度, 0.04) × 流速 × （有水才算）×（水越深越弱）；能力 > 泥沙就挖（Ks），反之放下（Kd）。寫到 H2、S2，因為鄰居同一個 pass 還要讀 H。
- D：泥沙「往回找上一刻在哪裡」（semi-Lagrangian）雙線性取樣；H2 複製回 H；寫貼圖。
- 常數在 `sim.js` 的 `K`。格子數：WebGPU 高畫質 256²、低畫質 192²、CPU 96²（`?n=` 可以指定）。地形高度會依格子數縮放（`max(0.7, N/256)`）。

## 畫面小撇步
- 地面和水都用同一張 N×N 的平面，頂點 shader 用 `textureLoad` 讀模擬貼圖當高度，法線用上下左右的高度差算。頂點算的值要用 `varyingProperty` 傳給像素 shader。
- 水：幾乎沒有水、或是海的格子把頂點藏到地面下面；外海是一大片平面（水面 0、海底和島邊緣一樣高一樣顏色，看不出格子的邊）。
- 很淺的一層水：水面跟著坑坑洞洞的地形，法線會亂 → 淺水的法線偏向正上方；白沫只出現在有一點深度的急流（淺水流速算出來很大，不能拿來判斷）。

## 存檔
- `localStorage['mwLabTerra.v1']` = `{ done: { <任務 id>: true }, seed: 島的種子, soundOff, size: 筆刷大小 0–2 }`。
- `localStorage['mwLabTerra.world.v1']` = `{ seed, N, h: base64(Int16 地面高度 × 400), springs, villages: [{x, y, pop, name, seed}], touched: base64 }`：每 15 秒和離開頁面時存。種子不一樣就不讀；格子數不一樣（換畫質）用最近的格子換算。水不存。按「新的島」會清掉。

## 測試
- `?q=low|high`、`?gl=1`（CPU 模擬）、`?n=128`、`?offscreen=1&paused=1`。
- 合成 PointerEvent 測手勢要用 `pointerType: 'touch'`；`setPointerCapture` 對合成的 pointer 會丟錯，已經包 try。無頭 swiftshader 截圖要 `offscreen=1`（直接畫在 canvas 上會 Instance dropped）。
- `window.__terra`：`goal`、`zoomAt`、`grabPan`、`setTool(k)`、`useTool`、`undo`、`saveWorld()`、`villages`、`updateRain(dt)`、`rain(true)`、`spring(x, y)`（格子座標）、`brush({x, y, r, mode, amt})`、`sim2(秒)`（跑模擬、讀回、檢查任務，回傳每個任務的進度）、`snapImg()`、`cam`、`world`、`sim`。

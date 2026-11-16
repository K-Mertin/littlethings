# MW 大街 · WebGPU 版（`lab/street/`）

從 `street/`（three 0.160、WebGL）複製出來重做的版本，**素材直接讀 `/street/assets/`**（沒有複製一份）。
原本的 `street/` 不動，兩邊各自發展。

## 跟原版不一樣的地方
| 功能 | 檔案 | 說明 |
|---|---|---|
| WebGPU 渲染＋後製 | `js/main.js` `buildPipeline()` | `RenderPipeline`＋MRT（output／normal／emissive）。發光物件 bloom；高畫質加 GTAO（環境光遮蔽）；高畫質＋WebGPU＋下雨時加 SSR（積水倒影），雨停自動拿掉 |
| 晨昏與天氣 | `js/gpu/env.js` | 時間：自動（8 分鐘一天）／白天／黃昏／夜晚；天氣：晴／雨。天空（`SkyMesh`）、太陽、霧、曝光、路燈（每盞一個 `PointLight`）、霓虹夜晚加亮、星星都跟著時間走。雨：compute shader 的雨滴（在鏡頭附近循環）＋地面漣漪＋地磚變濕（積水用噪聲遮罩，粗糙度變低）。只在露天的大街、廣場下雨 |
| 很多行人 | `js/gpu/crowd.js` | 用兩個角色模型在載入時烘焙「頂點動畫貼圖」（VAT：走路、站著各 24 格），簡化網格後用 instancing 一次畫完。移動在 compute shader：沿四條人行道來回走、停下來看櫥窗、讓開玩家、和前面的人保持距離。上限 WebGPU 高畫質 220、低畫質 90、相容模式 48；設定裡「行人：少／中／多」 |
| 粒子 | `js/gpu/fx.js` | 行道樹落葉、廣場左邊噴水池（有碰撞）、廣場右邊鴿子（玩家靠近會飛起來、繞圈再降落） |
| 逼真調整 | `js/main.js`、`js/world.js`、`js/gpu/env.js` | 後製最後加調色（暗角、飽和度、暗部偏冷）；地磚顏色調暗、白天曝光和太陽亮度降低（原本白成一片）；遠方大樓晚上窗戶會一格一格亮（`world.skyNight`，跟路燈一起開） |
| 雨聲 | `js/sound.js` | `setRain(k)`；下雨或晚上不會有鳥叫 |

- 玩家和行人的碰撞：每 0.25 秒把行人位置讀回 CPU（`renderer.getArrayBufferAsync`），`collide()` 一起檢查。
- 店內只留夾娃娃機那個 NPC；原本街上的 NPC 由人群取代。

## 存檔
`localStorage` 前綴 `mwLabStreet.`：`avatar`、`quality`、`sound`、`time`、`weather`、`crowd`。和原版 `street/` 分開。

## 測試旗標（網址參數）
- `?q=low|high` 畫質；`?gl=1` 強制 WebGL 相容模式。
- `?offscreen=1&paused=1`：無頭瀏覽器用。軟體 WebGPU（swiftshader）畫到 canvas 會當掉，所以改畫到 RenderTarget，用 `__street.snap(秒數)` 模擬幾秒後讀回成圖片。
- `window.__street`：`snap`、`sim`、`setPos`、`cam`、`start`、`env`（`setWeather('rain')`、`setTime(...)`）、`crowd`、`fx`、`GPU`。

## WebGL 相容模式的坑
WebGL 後端用 transform feedback 跑 compute：shader 用到的 storage buffer 會被綁成輸出，**長度比 compute 數量短的 buffer 會出現 `Not enough space in bound transform feedback buffers`**。所以樹的位置用 `uniformArray`，不要用 `instancedArray`。

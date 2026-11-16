# MW 實驗室（`/lab/`）

用比較新、比較吃硬體的網頁技術（WebGPU）做的遊戲。大廳的卡片（鍵 X）通往這裡的小大廳 `lab/index.html`。

## 小大廳 `lab/index.html`
- 單一檔案，藍圖方格風格；上方會偵測瀏覽器有沒有 WebGPU（`navigator.gpu.requestAdapter()`），顯示在 `#gpu`。
- 「可以玩」：MW 大街 · WebGPU 版（`street/`）。
- 「規劃中」卡片（只有 SVG 圖和說明，還沒有程式）：沙之實驗室、深海探險隊、萬軍對決 3D、銀河建造師、夜雨賽車。做好一款就把該卡片換成可點的 `<a>`。

## 共通原則
- three.js **0.187.0**（`three.webgpu.js`＋`three.tsl.js`，importmap 從 jsdelivr）。和其他遊戲的 0.160 分開，不要混用。
- `WebGPURenderer` 沒有 WebGPU 時會自動退回 WebGL2（「WebGL 相容模式」）。要能在相容模式下也開得起來：粒子、人數要降，compute shader 不要讀長度不同的 storage buffer（見 `street/README.md`）。
- 不做離線包（`tools/offline-manifest.mjs` 的 `SKIP` 有 `lab`）：引擎從 CDN 載入，素材借用 `/street/assets/`。
- 版本：`lab/releases.json`（整個實驗室共用一條，`node tools/release.mjs lab …`）。

# 測試與驗證

沒有自動化測試套件；每次改動用下面的方法自己驗證，交付時說明驗過什麼。

## 1. 本機伺服器
| 方式 | 指令 | 什麼時候用 |
|---|---|---|
| 最簡單 | `python3 -m http.server 8000`（repo 根目錄） | 只改遊戲本身 |
| 跟線上一樣 | `npx wrangler dev --local --port 8787` | 動到 `/api/*`、轉址（`/abc/index.html` → `/abc/`）、離線、`.assetsignore` |

`wrangler dev` 前先跑 `node tools/offline-manifest.mjs`（否則沒有離線清單）。
後端要假的上游：建 `.dev.vars`（已 gitignore），例如：
```
ANTHROPIC_API_KEY=test
ANTHROPIC_API_URL=http://127.0.0.1:9999/v1/messages
GITHUB_TOKEN=test
GITHUB_API_URL=http://127.0.0.1:9999
AZURE_SPEECH_KEY=test
AZURE_SPEECH_REGION=test
AZURE_TTS_URL=http://127.0.0.1:9999/tts
```
再自己起一個回固定 JSON／mp3 的小伺服器在 9999。

## 2. Playwright（雲端環境已裝 Chromium）
```js
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); // 3D 遊戲要 WebGL
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:8787/abc/'); await p.waitForTimeout(3000);
await p.screenshot({ path: 'shot.png' });
```
- 雲端沙箱連不到 Google 字型，`load` 事件可能不觸發 → 用 `waitUntil: 'domcontentloaded'`，並忽略字型的 `net::ERR` 錯誤。
- 每款至少確認：沒有 pageerror、主畫面截圖正常、點進一關能玩。
- 手機版：`newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`。

## 3. 冒煙測試：全部遊戲都打得開
```sh
for g in $(grep -oE 'href="[a-z0-9]+/index.html"' index.html | cut -d'"' -f2 | cut -d/ -f1) face face3d street; do
  printf '%-11s %s\n' $g $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8787/$g/)
done
```

## 4. 離線
1. `wrangler dev` 打開大廳 → 某款按「📥 下載離線版」→ 等到 ✈️。
2. Playwright `context.setOffline(true)` → 重新整理該遊戲 → 要能開、沒有 404。
3. 沒下載的遊戲離線時應該看到「現在沒有網路」頁（503），不是大廳。
4. 改版後再上線：只應該重抓有變的檔案（看 network 請求數）。

## 5. 部署設定
```sh
npx wrangler deploy --dry-run    # 改 wrangler.jsonc、worker/ 時必跑
```

## 6. 上線後
push 到 main 約 1 分鐘後：
```sh
curl -s https://littleland.mwstudio.workers.dev/ | grep -o "VERSION: '[^']*'"
curl -s https://littleland.mwstudio.workers.dev/offline/manifest.json | head -c 300
```

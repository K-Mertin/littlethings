# 萬軍守城 · Legion Siege

原本是千軍突圍（`rush/`）的「守城模式」，2026-10-30 依 MK 的意思獨立成一款遊戲，避免和選門跑步的設定混在一起。

## 玩法
- 砲台在下方左右移動（拖曳、← →、手把），每 0.6 秒射出一小隊小兵（起始 3 人）。
- 小兵穿過門：×2、×3、+n 對「整隊」算一次；紅色 ✕ 門讓小兵消失；黃色強化門讓小兵兩倍強。
- 怪物從左右兩邊輪流衝向你的城（每 5 波一波從中間），站著不動一定會漏；把砲台移過去讓小兵擋住。
- 護城機槍：砲台自動打靠近城、又在砲台前方的怪。
- 打一陣子遊戲暫停，選一張強化卡（砲台加速、擴編小隊、鋼鐵小兵、門升級、修補城牆、大兵支援）。
- 能量滿了放出金色大兵（右下按鈕、空白鍵）。敵方基地半血時會派出巨魔兵。
- 每關的花樣：會動的門、轉盤門、✕ 門、基地砲擊（紅圈預告）、擋路的牆、強化門、噴火口。
- 12 關、5 個世界；星星照城剩下的血量；過關才開下一關。

## 檔案
- `index.html`：版面、選單、強化卡畫面。
- `js/defense.js`：遊戲邏輯（關卡表 `DSTAGES`、配置產生、怪物、強化卡、平衡係數 `DEF_K`、每關難度 `df`）。
- `js/defdraw.js`：守城畫面（城堡、砲台、小兵、牆、HUD）。
- `js/main.js`：選單、輸入、主迴圈。
- 其他檔案（`core.js`、`levels.js`、`game.js`、`draw.js`、`scene.js`、`fx.js`、`audio.js`、3D 模型 `bake3d.js`／`models3d.js`／`scene3d.js`／`volcano*.js` …）是從 `rush/js/` 複製過來的，各自獨立發展。
- `tools/defsim.js`：無頭平衡模擬器。`node siege/tools/defsim.js [smart|lazy|center] [次數] [關卡範圍] [強化等級]`；`GAME=1` 用遊戲裡的固定配置、`K='{"flow":1.1}'` 試係數。

## 存檔（localStorage）
- key `siege:v1`：`coins`、`up`（`rate`、`wall`、`power`、`giant`、`card`、`coin`）、`dstars`（每關星星）、`music`、`sfx`、`speed`、`tips`、`plays`、`dlast`。
- 第一次開會從千軍突圍的 `rush:v1` 搬守城星星、音樂音效設定、速度，並送每顆星 40 金幣（`Save.migrate`）。之後兩邊互不影響。
- 3D 模型快取在 IndexedDB `siege3d`（和千軍突圍的 `rush3d` 分開）。

## 平衡
- 每關 `df` 用 `tools/defsim.js` 的機器人校準：普通玩家勝率由第 1 關 100% 慢慢降到最後一關約 30–45%；站著不動每關都會輸。
- 改了怪物、門、強化卡之後要重新跑模擬（`GAME=1 node siege/tools/defsim.js lazy 8 1-12`、`smart`、`center`）。

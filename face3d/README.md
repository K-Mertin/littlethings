# 寫實捏臉 3D（Face Studio 3D）

瀏覽器裡的寫實 3D 捏臉（pilot MVP）。Three.js 0.160（CDN）＋ MakeHuman 的 CC0 寫實人體資料，無建置步驟就能玩；`data/` 是預先處理好的素材。

## 可以調整的
- **基本**：性別、年齡（11–90 歲）、胖瘦、族裔外觀（非洲／亞洲／歐洲混合）、寫實皮膚貼圖（自動依年齡性別族裔挑選，或手選 18 種）、膚色微調、腮紅
- **臉型**：7 種頭型＋強度、頭寬／長／深、臉部肉感、額頭、太陽穴、下巴與下顎 6 項、顴骨、臉頰、脖子、雙下巴
- **眼睛**：大小、眼距、高低、開合、內外眼角、蒙古褶、眼皮褶、眼袋、眼窩；瞳孔顏色；眉毛高低／角度／眉骨
- **毛髮**：10 款 3D 髮型（可改髮色）、12 款眉毛（可改眉色）、4 款睫毛
- **鼻子**：16 項；**嘴巴**：13 項＋唇色；**耳朵**：9 項
- **表情**：平靜、微笑、大笑、驚訝、生氣、難過、懷疑、嘟嘴、眨眼；自動眨眼、眼睛看游標

每個滑桿都是 MakeHuman 的變形目標（共 417 個），雙擊滑桿歸零。存檔在瀏覽器 localStorage（含縮圖），可下載 1200×1500 截圖。

## 運作方式
- `data/head.bin`：頭胸部網格（MakeHuman hm08 基礎網格裁切）、一階 Catmull-Clark 細分（預先算成稀疏線性對應，所以變形後仍然平滑）、所有變形目標（int16 量化）、眼睛／頭髮／眉毛／睫毛／牙齒／舌頭的 proxy 擬合資料
- 每次調整：在 CPU 混合變形目標 → 細分 → 算法線 → 把各 proxy 依 `.mhclo` 權重重新貼合到臉上
- 皮膚：MeshPhysicalMaterial ＋ 包覆光照（wrap lighting）近似次表面散射、程式產生的毛孔法線貼圖
- 眼睛：可轉動看向游標；角膜另一層做濕潤反光

## 重建 data/
需要 MakeHuman 的 `makehuman/data`（GitHub：makehumancommunity/makehuman）與系統素材包（`makehuman_system_assets_cc0.zip`，[下載頁](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html)，解壓後的資料夾）：

```sh
pip install numpy pillow
python3 tools/build.py <makehuman/data> <解壓後的素材資料夾> data
```

## 授權
人體網格、變形目標、皮膚、眼睛、髮型、眉毛、睫毛、牙齒、舌頭皆來自 [MakeHuman](http://www.makehumancommunity.org)，以 CC0 釋出。

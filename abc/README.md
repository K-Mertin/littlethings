# ABC Island（ABC 小島）

給幼兒園孩子（約 5 歲、已認得字母）的英文遊戲。小狐狸 Pip 用語音帶著孩子玩，不需要識字。所有東西都在 `index.html` 一個檔案裡：沒有建置步驟、沒有圖片或音檔、不需要任何函式庫（只從 Google Fonts 載入字型，離線時會改用系統字型）。

平板優先（Android 平板橫放或直放都可以），手機和電腦也能玩。

## 活動
首頁分成四區，往下滑可以看到全部活動，每個遊戲都一按就開始（沒有「Games」「Challenge」這種中間選單）：

- 🔤 **Letters**：Write、Phonics、First Letter、Big & Small、ABC Order、What's Missing?
- 🧩 **Words**：Things（19 組名詞，進去選一組）、Actions、Describing、Spell、Spell+ ⭐、Blends、Sight Words、Rhyme、Opposites
- 📝 **Sentences**：a or an?、He / She / They、How?、What can it do?、Where is it?、Stories、Reading ⭐、Sentences ⭐、Listen ⭐
- 🎉 **Play**：Talk、Memory、Simon Says、Stickers

⭐ 是比較難的挑戰；玩過的格子右上角有 ✔。從遊戲回到首頁會停在原本滑到的位置。

| 活動 | 內容 |
|---|---|
| ✏️ Write | 描 26 個小寫和 26 個大寫字母（格子最後一格切換 abc／ABC；🔊 會唸出字母名、字母音和例字）。每個字母三個階段：跟著虛線和箭頭描 → 只有淡淡的字 → 自己寫。有綠色起點和筆順，按 👀 可以看示範。每階段一顆星。每一筆在手指離開時整筆檢查（跟ㄅㄆㄇ 小島一樣）：起點、終點要對，中間依序經過筆畫上的點，偏離不超過 15%；寫對的那一筆留下孩子自己的線，寫錯的會消失、要重寫 |
| 🔊 Phonics | 自然發音：點 26 個字母，聽「字母名＋字母音＋例字」（s says /s/, sun）。🎯 聽音找字母：Pip 發出 /m/，點出 m |
| 🔗 Blends | 連音：**c·a·t** 一個音一個音唸、再唸快一點，連成單字後選出圖片；**sh ch th bl fl st sn fr tr** 九組組合音，每組有例字；🎯 聽單字選出開頭是哪組音 |
| 🔤 First Letter | 看圖聽單字，找出開頭的字母（sun → s）。答錯會再示範一次，正確答案會發亮，並在這一輪稍後再考一次 |
| 🧩 Spell | 看圖拼三個字母的單字（cat、dog、sun…），拼完會一個字母一個字母唸出來。格子裡有淡色提示字（可在家長區關閉） |
| 🖼️ Words | 19 組單字（農場動物、野生動物、海洋、昆蟲、水果、蔬菜、食物、顏色、數字、形狀、身體、衣服、玩具、家裡、學校、交通工具、自然、職業、心情），每組 8～16 個字。一輪 8 題，交錯兩種題型：Pip 說一個字、點出對的圖；或看圖選出對的英文字（選錯會唸出選到的字）。看圖選字時，每張字卡右上角有 🔊，按了只唸那個字、不算作答。另外在首頁有：🏃 Actions（動詞 -ing，「Who is running?」）、🌶️ Describing（形容詞，「Which one is hot?」），以及填空句子遊戲：a / an、he / she / they、副詞 fast / slowly…、can / can't、介系詞 in / on / under / next to。Pip 唸句子和每個選項，選對整句再唸一次 |
| 📖 Learn | 先教再玩。Words 每一組（含 Actions、Describing）、Sentences 區的五組填空，和 Rhyme、Opposites、Big & Small，進到遊戲後上方有「📖 Learn」按鈕（不會自動跳出）。上課照「我說、一起說、你來」：一次一張大圖＋字，Pip 唸出來，再說「Say it with me!」（點圖可以再聽，按 🎤 可以跟著唸，Pip 會回應）；每教 3～4 個，就用剛教的內容出 1～2 題小確認（答錯會唸出選到的是什麼，錯兩次提示答案）。教完按 ▶️ Play 直接進遊戲，🔁 再上一次。一次教 8 個，下次打開接著教後面的 |
| 🎲 Games | 小遊戲區（7 個）：🎵 Rhyme 押韻（22 組字族）、🃏 Memory 翻牌（任一組單字的 6 對圖）、🙋 Simon Says（聽指令點身體部位）、↔️ Opposites 相反詞（12 組）、❓ What's Missing?（看圖補字母，多半是中間的母音）、🔡 ABC Order（「a b _」接下一個字母）、🅰️ Big & Small（大寫配小寫，常混入 b/d/p/q 這類長得像的字母） |
| 👀 Sight Words | 常見字（I、the、see、can、like…共 30 個）：先看字、聽 Pip 唸，再從三張字卡找出來；之後只聽不看再找一次。答對會聽到一句用到這個字的例句 |
| 📚 Stories | 8 本原創小故事書（每本 6～7 頁）：Pip's Hat、The Big Red Bus、Little Duck、Bedtime for Pip、The Hungry Monkey、Rainy Day、Pip at the Farm、The Snowman。Pip 唸的時候字會一個個亮起來，點任何一個字可以聽那個字；讀完回答 3 題（選項順序隨機） |
| 💬 Talk | 和 Pip 用英文聊天的 14 個情境：打招呼、顏色、動物、點心、數數、天氣、心情、家人、玩具和動作、在哪裡（in／on／next to）、生日派對、早安日常（刷牙、早餐、please／thank you）、穿衣服（冷／熱）、形狀。可以點圖片回答，也可以按 🎤 用說的 |
| ⭐ Challenge | 進階挑戰：🧩 Spell+（4～5 個字母、有連音的單字，沒有提示字，多 3 個干擾字母）、📖 Reading（只顯示字、不唸出來，自己讀再選圖，選項是長得像的字）、📝 Sentences（聽 Pip 說一句話，把字卡排成句子，多一張干擾字卡）、👂 Listen（聽較長的指令，例如 Find the small blue star.／Find three red hearts.，選出對的圖） |
| 📒 Stickers | 貼紙簿：11 個主題頁（Island、Under the Sea、Farm、Jungle、Forest、Town、Party、Space、Snow Land、Dino Land、Fairy Tale），共 163 種貼紙，每頁有自己的場景。每完成一輪得到一張，優先補齊正在收集的那一頁（偶爾來自別頁），收齊所有貼紙之前不會重複。頁面下方是這頁的收集欄：沒拿到的是灰色剪影，拿到的可以拖到頁面上（或點一下自動貼上），頁面上的貼紙可以拖著移動，拖回收集欄就收起來。點貼紙會唸出英文。收齊一頁 Pip 會恭喜、頁籤變 ⭐。舊版小島上的貼紙會自動搬到對應的主題頁 |

任何時候點 Pip，他會再說一次題目。

## 設計原則
- 語音優先：說明都由 Pip 用英文說，沒有中文提示。
- 不懲罰：沒有扣分、沒有倒數、沒有失敗畫面；答錯就再示範一次。
- 大按鈕（至少 64px），只用點和畫。
- 預設 15 分鐘提醒休息。

## 家長區
按住右上角的 ⚙️ 兩秒，再答一題加法，就能進入：
- 進度：貼紙、每個字母的星星、拼過的單字、需要多練的開頭音、今天玩了多久
- 設定：提示字、英文語速、英文聲音、麥克風、休息提醒、全螢幕、清除進度、回遊戲大廳

進度存在瀏覽器的 localStorage。

## 語音
- Pip 的聲音是預先錄好的音檔（`audio/`），用開源模型 Kokoro-82M（Apache-2.0）的 af_heart 聲音錄製（語速 0.8），小朋友角色用 af_sky（0.9）。字母的純音（自然發音）是家長錄的真人聲音。遊戲用 Web Audio 播放，所以不依賴瀏覽器的語音功能（Mac 上的 Chrome 就叫不出系統語音）。
- 沒有音檔的句子才改用瀏覽器內建語音（`speechSynthesis`）。中文提示已關閉（`zh()` 一律回傳 null）。
- 自然發音的字母音（⟦s⟧）和連音是家長用 `tools/soundbank/recorder.html` 錄的，原始錄音和處理方法在 `tools/soundbank/`。
- 只有一個字的台詞（例如 "frog."）用 `tools/kokoro-short.mjs` 錄：唸三次取最後一次，避免 Kokoro 在很短的輸入前面多出一個 a 音。
- 單獨唸一個字母（例如拼字時的 ‹b›）是用 Kokoro 連唸三次「b. b. b.」再切出最後一次，因為只給一個音節時 Kokoro 會唸得很怪。
- 台詞清單在 `audio/phrases.tsv`：`id`、聲音（pip／kid／zh）、文字。字母寫成 `‹a›`，錄音時會照字母名稱唸（a 唸「ay」）。`id` 是「聲音|文字」的 FNV-1a 32-bit 雜湊。
- 錄音工具在 `tools/`：
  - `try-voices.sh`：做一個比較 Kokoro 和 macOS 聲音的試聽頁
  - `kokoro-record.mjs all phrases.tsv <資料夾> af_heart af_sky 0.8 0.9`：用 Kokoro 錄全部英文（純音除外；需要 Node.js，第一次會下載模型；沒有 afconvert 時用 ffmpeg）
  - `soundbank/`：產生 35 個字母純音
  - `trim-silence.sh <資料夾>`：剪掉 Kokoro 音檔前後多餘的靜音（需要 ffmpeg）
  - `make-audio.sh`：用 macOS `say` 錄
- 聊天的 🎤 用 `SpeechRecognition`（Android 的 Chrome、桌機 Chrome、Safari 支援）。只比對關鍵字，聽不懂就讓孩子選圖片，不判錯。Chrome 的語音辨識會把聲音送到 Google 處理；遊戲本身不錄音、不儲存任何聲音或對話。語音辨識需要 https 或 localhost。

## 遊玩
```sh
python3 -m http.server 8000   # 在 littlethings 根目錄，然後打開 http://localhost:8000/abc/
```

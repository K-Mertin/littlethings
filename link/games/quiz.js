'use strict';
/* 快問快答 — party quiz. Every phone shows the same question; everyone answers on their own phone, faster = more points.
   Each round one player (in turn) picks the category from three on their own phone, or categories are mixed at random.
   Kid and adult banks are separate; 數數 / 心算 questions are generated. The host keeps the answer and times answers
   on its own clock (the answer index is only sent with the reveal).
   Bank line: 題目|正解|錯1|錯2|錯3   (two choices only: 題目|O or 題目|X = 是非題)
   Messages: {cat:i} chooser picks · {a:i} answer */
(() => {
  const R = n => Math.random() * n | 0;
  const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;

  const KID = {
    animal: ['🐾', '動物', `🐄 乳牛會怎麼叫？|哞～|汪汪|喵～|呱呱
哪一種動物的脖子最長？|🦒 長頸鹿|🐘 大象|🦓 斑馬|🐒 猴子
哪一種動物會飛？|🦋 蝴蝶|🐢 烏龜|🐟 小魚|🐌 蝸牛
🐼 熊貓最愛吃什麼？|🎋 竹子|🐟 魚|🍌 香蕉|🥕 紅蘿蔔
哪一種動物住在海裡？|🐳 鯨魚|🐔 公雞|🐑 綿羊|🐿️ 松鼠
🐸 青蛙小時候叫什麼？|蝌蚪|毛毛蟲|小雞|小魚
毛毛蟲長大會變成什麼？|🦋 蝴蝶|🐝 蜜蜂|🐞 瓢蟲|🐜 螞蟻
哪一種動物有長長的鼻子？|🐘 大象|🐷 小豬|🐰 兔子|🐱 小貓
🐧 企鵝很會做什麼？|游泳|飛得很高|爬樹|吐絲
小雞是從哪裡出來的？|🥚 蛋|🌳 樹上|🌊 海裡|🍎 蘋果
哪一種動物跑得最快？|🐆 獵豹|🐢 烏龜|🐌 蝸牛|🐷 小豬
🐝 蜜蜂會做出什麼？|🍯 蜂蜜|🥛 牛奶|🥚 雞蛋|🧀 起司
哪一種動物身上有黑白條紋？|🦓 斑馬|🐘 大象|🐻 熊|🐸 青蛙
🦘 袋鼠把寶寶放在哪裡？|肚子的口袋|背包裡|頭上|樹洞裡
🐶 小狗怎麼叫？|汪汪|喵喵|嘎嘎|咩咩
哪一種動物有硬硬的殼？|🐢 烏龜|🐰 兔子|🐶 小狗|🐦 小鳥
🐑 綿羊身上的毛可以做成什麼？|毛衣|雨傘|鞋子|鉛筆
哪一種動物晚上不睡覺、白天睡覺？|🦉 貓頭鷹|🐔 公雞|🐄 乳牛|🐒 猴子`],
    food: ['🍎', '吃的', `哪一個是水果？|🍌 香蕉|🥕 紅蘿蔔|🍞 麵包|🧀 起司
熟的香蕉是什麼顏色？|黃色|藍色|紫色|黑色
西瓜裡面通常是什麼顏色？|紅色|藍色|黑色|紫色
哪一個是蔬菜？|🥦 花椰菜|🍓 草莓|🍪 餅乾|🍦 冰淇淋
🥛 牛奶是哪一種動物給我們的？|🐄 乳牛|🐔 雞|🐷 豬|🐟 魚
哪一個吃起來酸酸的？|🍋 檸檬|🍬 糖果|🍞 麵包|🍚 白飯
哪一個是冰冰涼涼的？|🍦 冰淇淋|🍜 熱湯麵|🍵 熱茶|🍠 烤地瓜
生日的時候常常吃什麼？|🎂 蛋糕|🍙 飯糰|🥟 水餃|🌽 玉米
爆米花是用什麼做的？|🌽 玉米|🍎 蘋果|🥚 雞蛋|🥔 馬鈴薯
薯條是用什麼做的？|🥔 馬鈴薯|🍌 香蕉|🍞 麵包|🍇 葡萄
吃完糖果要記得做什麼？|🪥 刷牙|😴 睡覺|🏃 跑步|📺 看電視
🍓 草莓是什麼顏色？|紅色|藍色|黑色|灰色
哪一個是早餐常喝的？|🥛 牛奶|🧴 洗髮精|🖍️ 蠟筆水|🌊 海水
🥚 雞蛋是誰生的？|🐔 母雞|🐄 乳牛|🐷 小豬|🐶 小狗
哪一個水果外面有刺刺的皮？|🍍 鳳梨|🍌 香蕉|🍇 葡萄|🍓 草莓
🍯 蜂蜜吃起來是什麼味道？|甜甜的|鹹鹹的|辣辣的|苦苦的`],
    life: ['🏠', '生活', `下雨天出門要帶什麼？|☂️ 雨傘|🕶️ 太陽眼鏡|🧤 手套|🪁 風箏
晚上睡覺要躺在哪裡？|🛏️ 床上|🛁 浴缸|🚗 車頂|🌳 樹上
過馬路要看什麼？|🚦 紅綠燈|💡 檯燈|🔦 手電筒|🕯️ 蠟燭
小綠人的燈亮了代表什麼？|可以過馬路|要停下來|要跳舞|要睡覺
刷牙要用什麼？|🪥 牙刷|🧹 掃把|🥄 湯匙|✏️ 鉛筆
一個星期有幾天？|7 天|5 天|3 天|10 天
生病了要去看誰？|👩‍⚕️ 醫生|👨‍🍳 廚師|👮 警察|🧑‍🚒 消防員
看到失火了要打幾號？|119|110|123|999
寫字要用什麼？|✏️ 鉛筆|🍴 叉子|🪥 牙刷|🧽 海綿
冬天很冷要穿什麼？|🧥 外套|🩳 短褲|👙 泳衣|🩴 拖鞋
哪一個是交通工具？|🚌 公車|🛋️ 沙發|📺 電視|🧸 玩偶熊
早上見到老師要說什麼？|早安|晚安|再見|生日快樂
一隻手有幾根手指頭？|5|4|6|10
吃飯前要先做什麼？|🧼 洗手|🛌 睡覺|👟 穿鞋|🎮 打電動
救火的是誰？|🧑‍🚒 消防員|👨‍🍳 廚師|💇 理髮師|👩‍🏫 老師
用來剪紙的是什麼？|✂️ 剪刀|🥄 湯匙|🪥 牙刷|📏 尺`],
    nature: ['🌈', '大自然', `晚上天空圓圓亮亮的是什麼？|🌙 月亮|☀️ 太陽|🍩 甜甜圈|⚽ 足球
下雨過後天空可能出現什麼？|🌈 彩虹|⛄ 雪人|🎈 氣球|🦖 恐龍
冰塊放在太陽下會怎樣？|融化變成水|變得更大|變成石頭|飛走
植物長大需要什麼？|☀️ 陽光和水|🍬 糖果|📺 電視|🧸 玩具
彩虹有幾種顏色？|7 種|3 種|2 種|10 種
樹葉通常是什麼顏色？|綠色|藍色|紫色|黑色
雪是什麼顏色？|白色|紅色|綠色|黃色
海水喝起來是什麼味道？|鹹鹹的|甜甜的|辣辣的|酸酸的
蘋果長在哪裡？|🌳 樹上|🌊 海裡|☁️ 雲上|🏠 屋頂上
會打雷、閃電的是什麼天氣？|⛈️ 雷雨天|🌤️ 大晴天|🌈 彩虹天|🌙 月亮天
哪一個是很熱的季節？|☀️ 夏天|❄️ 冬天|🍂 秋天|🌸 春天
花朵裡的什麼會吸引蜜蜂？|花蜜|石頭|沙子|冰塊
🌋 火山噴出來的燙燙東西叫什麼？|岩漿|果汁|雪花|棉花
天上的白白軟軟的是什麼？|☁️ 雲|🧀 起司|🧻 衛生紙|🐑 綿羊
沙灘在哪裡？|🏖️ 海邊|🏔️ 山頂|🏫 學校|🛁 浴室`],
    shape: ['🎨', '顏色形狀', `紅色加黃色會變成什麼顏色？|橘色|藍色|綠色|黑色
藍色加黃色會變成什麼顏色？|綠色|紅色|白色|粉紅色
紅色加藍色會變成什麼顏色？|紫色|黃色|綠色|白色
黑色加白色會變成什麼顏色？|灰色|紅色|黃色|藍色
哪一個是圓圓的？|⚽ 足球|📦 箱子|📏 尺|📐 三角板
三角形有幾個角？|3|4|5|0
正方形有幾個邊？|4|3|5|6
大晴天的天空是什麼顏色？|藍色|紅色|紫色|黑色
🍆 茄子是什麼顏色？|紫色|黃色|藍色|白色
哪一個是三角形？|🔺|🟦|⚪|⭐
星星 ⭐ 有幾個尖尖的角？|5|3|4|8
哪一個不是圓的？|📦 箱子|⚽ 足球|🍊 橘子|🌕 滿月
🐸 青蛙通常是什麼顏色？|綠色|紫色|紅色|白色
哪一個是正方形？|🟥|🔺|⚪|⭐
🔴 紅色和哪一個顏色一樣？|🍓 草莓|🍌 香蕉|🥦 花椰菜|🫐 藍莓`],
    count: ['🔢', '數數', null]
  };
  const ADULT = {
    tw: ['🇹🇼', '台灣', `台灣最高的山是？|玉山|雪山|阿里山|合歡山
台灣最長的河流是？|濁水溪|淡水河|高屏溪|大甲溪
台灣面積最大的縣市是？|花蓮縣|台東縣|南投縣|屏東縣
台北 101 位於台北市哪一區？|信義區|大安區|中正區|松山區
日月潭位於哪個縣市？|南投縣|嘉義縣|台中市|花蓮縣
蘭嶼的原住民族是？|達悟族|阿美族|泰雅族|排灣族
台灣原住民族中人口最多的是？|阿美族|泰雅族|排灣族|布農族
中秋節是農曆哪一天？|八月十五|五月初五|正月十五|七月初七
元宵節是農曆哪一天？|正月十五|八月十五|五月初五|九月初九
台灣與中國大陸之間的海峽叫？|台灣海峽|巴士海峽|麻六甲海峽|對馬海峽
台灣與菲律賓之間的海峽叫？|巴士海峽|台灣海峽|白令海峽|直布羅陀海峽
台北捷運最早通車的是哪一條？|文湖線（當時叫木柵線）|淡水線|板南線|新店線
綠島屬於哪個縣？|台東縣|屏東縣|花蓮縣|澎湖縣
台灣的國際電話國碼是？|+886|+86|+852|+81
十七世紀趕走在台荷蘭人的是誰？|鄭成功|劉銘傳|沈葆楨|吳鳳
台灣高鐵最南端的車站是？|左營|台南|屏東|嘉義
阿里山位於嘉義縣。|O
太魯閣國家公園主要位於台東縣。|X
「九份」位於哪個縣市？|新北市|基隆市|宜蘭縣|台北市
台灣的「國道一號」又叫做？|中山高速公路|福爾摩沙高速公路|北宜高速公路|中二高`],
    life: ['💡', '生活常識', `一年之中有幾個月有 31 天？|7 個|6 個|5 個|8 個
閏年的二月有幾天？|29 天|28 天|30 天|31 天
一打是幾個？|12|10|6|24
在台灣報案要打幾號？|110|119|113|165
一副撲克牌（不含鬼牌）有幾張？|52|54|48|56
籃球比賽每隊同時上場幾人？|5|6|4|7
足球比賽每隊同時上場幾人？|11|9|10|7
一公斤等於幾公克？|1000|100|500|10000
一小時有幾秒？|3600|360|6000|1800
結婚 25 週年稱為？|銀婚|金婚|鑽石婚|紙婚
結婚 50 週年稱為？|金婚|銀婚|珍珠婚|鐵婚
AED 是什麼設備？|自動體外心臟電擊去顫器|血壓計|呼吸器|血糖機
冰箱冷凍庫的建議溫度約是？|−18°C|0°C|4°C|−50°C
人體正常體溫大約是？|37°C|35°C|39°C|33°C
一個馬拉松全程大約幾公里？|42.195 公里|21 公里|50 公里|36.5 公里
黃燈亮起時通常代表？|即將變紅燈，準備停下|可以加速通過|行人優先通行|號誌故障
洗衣標示上，水盆裡有一隻手代表只能手洗。|O
電話鍵盤上「#」通常叫做「井字鍵」。|O
一週七天裡，英文 Wednesday 是星期幾？|星期三|星期二|星期四|星期五`],
    sci: ['🔬', '科學', `在一大氣壓下，水幾度沸騰？|100°C|90°C|80°C|120°C
太陽系最大的行星是？|木星|土星|地球|海王星
離太陽最近的行星是？|水星|金星|火星|地球
被稱為「紅色星球」的是？|火星|金星|木星|水星
人體最大的器官是？|皮膚|肝臟|心臟|大腦
水的化學式是？|H₂O|CO₂|O₂|NaCl
食鹽的主要成分是？|氯化鈉|碳酸鈣|葡萄糖|氫氧化鈉
植物行光合作用會放出？|氧氣|二氧化碳|氮氣|氫氣
鯨魚屬於哪一類動物？|哺乳類|魚類|兩棲類|爬蟲類
蜘蛛有幾隻腳？|8|6|10|4
昆蟲有幾隻腳？|6|8|4|10
提出相對論的科學家是？|愛因斯坦|牛頓|伽利略|霍金
地球大氣中含量最多的氣體是？|氮氣|氧氣|二氧化碳|氬氣
鑽石是由哪一種元素組成的？|碳|矽|鐵|氧
血液中負責運送氧氣的是？|紅血球|白血球|血小板|淋巴球
光速大約是每秒多少？|30 萬公里|3 萬公里|300 公里|3 億公里
月亮自己會發光。|X
聲音在真空中無法傳播。|O
彩虹最外圈（上方）通常是什麼顏色？|紅色|紫色|藍色|綠色
成年人全口牙齒（含智齒）共有幾顆？|32|28|30|36`],
    geo: ['🌏', '世界地理', `世界最高峰是？|聖母峰|K2|富士山|玉山
世界面積最大的國家是？|俄羅斯|加拿大|中國|美國
世界最大的洋是？|太平洋|大西洋|印度洋|北冰洋
澳洲的首都是？|坎培拉|雪梨|墨爾本|伯斯
加拿大的首都是？|渥太華|多倫多|溫哥華|蒙特婁
吉薩金字塔在哪個國家？|埃及|希臘|印度|土耳其
艾菲爾鐵塔在哪個城市？|巴黎|倫敦|羅馬|柏林
自由女神像在哪個城市？|紐約|洛杉磯|華盛頓|芝加哥
南美洲面積最大的國家是？|巴西|阿根廷|秘魯|智利
泰國的首都是？|曼谷|清邁|普吉|河內
韓國的首都是？|首爾|釜山|仁川|平壤
不算極地，世界最大的沙漠是？|撒哈拉沙漠|戈壁沙漠|阿拉伯沙漠|喀拉哈里沙漠
台灣課本常說地球有幾大洲？|7|5|6|8
威尼斯最有名的是？|水道和貢多拉船|沙漠和駱駝|冰河和極光|火山和溫泉
傳統上認為世界最長的河流是？|尼羅河|長江|密西西比河|多瑙河
富士山位於哪個國家？|日本|韓國|中國|尼泊爾
「袋鼠之國」是指？|澳洲|紐西蘭|南非|巴西
英國的首都是？|倫敦|曼徹斯特|愛丁堡|利物浦
赤道經過非洲。|O
冰島位在南半球。|X`],
    food: ['🍜', '美食', `珍珠奶茶的「珍珠」主要原料是？|樹薯粉|糯米|麵粉|玉米粉
壽司是哪個國家的代表料理？|日本|韓國|泰國|越南
泡菜（kimchi）是哪國的代表菜？|韓國|日本|中國|越南
越南河粉的英文常寫成？|Pho|Pad Thai|Ramen|Udon
咖哩的起源地是？|印度|日本|泰國|英國
可頌最常讓人聯想到哪國的早餐？|法國|德國|美國|西班牙
豆腐主要是用什麼做的？|黃豆|綠豆|紅豆|花生
味噌的主要原料是？|黃豆|小麥|海帶|玉米
拿鐵（latte）在義大利文是什麼意思？|牛奶|咖啡|泡沫|熱的
卡布奇諾跟拿鐵比，通常？|奶泡比較多|沒有咖啡|加了巧克力|是冰的
傳統鳳梨酥的內餡常會加哪一種瓜一起熬？|冬瓜|西瓜|南瓜|苦瓜
「大腸包小腸」外面的「大腸」其實是？|糯米腸|豬大腸|麵包|蛋皮
在植物學上，番茄屬於？|果實（水果）|根|莖|葉
臭豆腐的味道主要來自？|發酵的滷水|放太久壞掉|加了大蒜|燒焦
披薩的起源地是？|義大利|美國|法國|希臘
提拉米蘇是哪一國的甜點？|義大利|法國|奧地利|日本
「Mapo tofu」是哪一道菜？|麻婆豆腐|臭豆腐|豆花|凍豆腐
小籠包要用筷子夾起來先咬一小口，是為了？|先讓湯汁散熱|比較有禮貌|讓醬油進去|檢查有沒有熟
皮蛋通常是用鴨蛋做的。|O
綠茶和紅茶來自完全不同的植物。|X`],
    animal: ['🐾', '動物', `世界上最大的動物是？|藍鯨|大象|長頸鹿|鯨鯊
陸地上跑最快的動物是？|獵豹|獅子|鴕鳥|羚羊
無尾熊主要吃什麼？|尤加利葉|竹子|昆蟲|水果
章魚有幾顆心臟？|3|1|2|4
蝙蝠屬於哪一類？|哺乳類|鳥類|爬蟲類|昆蟲
台灣黑熊胸前有什麼特徵？|V 字形淡色斑紋|紅色斑點|黑色條紋|藍色毛
長頸鹿的脖子有幾節頸椎？|7|14|21|3
海馬寶寶是由誰懷在育兒袋裡？|海馬爸爸|海馬媽媽|海馬奶奶|海馬哥哥
下列哪一種鳥不會飛？|鴕鳥|老鷹|麻雀|鴿子
大部分時間倒掛在樹上、動作很慢的動物是？|樹懶|猴子|松鼠|無尾熊
熊貓的「第六指」其實是？|手腕的骨頭|真的手指|指甲|肉墊
企鵝主要分布在？|南半球|北極|撒哈拉沙漠|喜馬拉雅山
台灣特有的獼猴叫？|台灣獼猴|日本獼猴|恆河猴|金絲猴
蜂鳥能做到哪一件其他鳥很難做到的事？|倒著飛|在水裡呼吸|冬眠一年|吃石頭
海豚用肺呼吸。|O
蛇有可以眨的眼皮。|X
北極熊的皮膚是黑色的。|O
鴨嘴獸是會生蛋的哺乳類。|O`],
    idiom: ['📖', '成語', `「畫蛇添足」的意思是？|多此一舉，反而壞事|畫畫很厲害|動作很快|很有耐心
「守株待兔」比喻？|不努力，只想靠運氣|很會抓兔子|保護小動物|等朋友回來
「對牛彈琴」比喻？|對不懂的人講道理|音樂很好聽|牛很聰明|在農場表演
「一石二鳥」的意思是？|一舉兩得|浪費資源|很危險|打不中目標
「亡羊補牢」的意思是？|出錯後及時補救還不晚|羊很重要|太晚了沒有用|蓋新羊圈很貴
「杯弓蛇影」比喻？|疑神疑鬼，自己嚇自己|喝酒很危險|蛇很可怕|射箭很準
「井底之蛙」比喻？|見識狹小|跳得很高|喜歡獨處|很會游泳
「胸有成竹」的意思是？|事前已經有把握|很喜歡竹子|身體很健康|心裡很亂
「狐假虎威」比喻？|仗著別人的勢力欺負人|狐狸很勇敢|老虎很聰明|互相幫忙
「三人成虎」比喻？|謠言說多了就讓人相信|團結力量大|三個人能打老虎|老虎很多
「拔苗助長」比喻？|急著求成反而壞事|很努力種田|幫助別人成長|植物長得很快
「塞翁失馬」的下一句是？|焉知非福|勞而無功|事半功倍|一路順風
「七上八下」形容？|心裡很不安|爬樓梯|數學很好|走來走去
「破釜沉舟」比喻？|下定決心、不留退路|船壞了要修|很會煮飯|東西打破很浪費
「半途而廢」的意思是？|事情做到一半就放棄|走到一半迷路|一半的人反對|東西壞了一半
「班門弄斧」比喻？|在行家面前賣弄本事|很會做木工|帶著工具上班|跟同學分享
「臥薪嘗膽」形容？|刻苦自勵，立志雪恥|生活很舒服|生病吃苦藥|睡不好覺
「入木三分」形容？|見解深刻或書法有力|木頭很硬|很會釘釘子|分數很高`],
    calc: ['🧮', '心算', null]
  };
  const parse = s => s.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split('|'));
  const BANK = { kid: {}, adult: {} };
  for (const [k, v] of Object.entries(KID)) BANK.kid[k] = v[2] ? parse(v[2]) : null;
  for (const [k, v] of Object.entries(ADULT)) BANK.adult[k] = v[2] ? parse(v[2]) : null;
  const CATS = kid => kid ? KID : ADULT;

  const EMO = ['🍎', '🐟', '⭐', '🐥', '🎈', '🍓', '🐞', '🌸', '🍪', '🚗'];
  function genQ(kid, cat) {
    if (kid) {
      if (Math.random() < 0.55) {
        const n = 2 + R(8), e = EMO[R(EMO.length)];
        const opts = shuf([n, n + 1, n - 1 || n + 2, n + 2 === n + 1 ? n + 3 : (n > 2 ? n - 2 : n + 3)].filter((x, i, a) => x > 0 && a.indexOf(x) === i)).slice(0, 4);
        while (opts.length < 4) { const x = 1 + R(11); if (!opts.includes(x)) opts.push(x); }
        if (!opts.includes(n)) opts[0] = n;
        return { q: `有幾個 ${e}？`, pic: e.repeat(n), o: opts.map(String), a: opts.indexOf(n) };
      }
      const a = 1 + R(5), b = 1 + R(5), s = a + b, e = EMO[R(EMO.length)];
      const opts = [s]; while (opts.length < 4) { const x = cl(s + R(5) - 2, 1, 12); if (!opts.includes(x)) opts.push(x); }
      shuf(opts);
      return { q: `${a} 個 ${e} 加 ${b} 個 ${e}，一共有幾個？`, pic: e.repeat(a) + ' ＋ ' + e.repeat(b), o: opts.map(String), a: opts.indexOf(s) };
    }
    const k = R(5); let q, ans;
    if (k === 0) { const a = 12 + R(80), b = 12 + R(80); q = `${a} ＋ ${b} ＝ ？`; ans = a + b; }
    else if (k === 1) { const a = 50 + R(90), b = 11 + R(a - 15); q = `${a} − ${b} ＝ ？`; ans = a - b; }
    else if (k === 2) { const a = 3 + R(10), b = 6 + R(10); q = `${a} × ${b} ＝ ？`; ans = a * b; }
    else if (k === 3) { const p = [10, 20, 25, 50, 75][R(5)], b = [40, 80, 120, 200, 360, 400, 600][R(7)]; q = `${b} 的 ${p}% 是多少？`; ans = b * p / 100; }
    else { const b = 3 + R(7), ans0 = 4 + R(12); q = `${b * ans0} ÷ ${b} ＝ ？`; ans = ans0; }
    const opts = [ans]; let g = 0;
    while (opts.length < 4 && g++ < 50) { const d = [1, 2, 10, -1, -2, -10, 5, -5][R(8)], x = ans + d; if (x > 0 && !opts.includes(x)) opts.push(x); }
    shuf(opts);
    return { q, o: opts.map(String), a: opts.indexOf(ans) };
  }
  function makeQ(kid, cat, used) {
    const list = BANK[kid ? 'kid' : 'adult'][cat];
    if (!list) return genQ(kid, cat);
    let pool = list.map((l, i) => i).filter(i => !used.has(cat + i));
    if (!pool.length) { [...used].filter(u => u.startsWith(cat)).forEach(u => used.delete(u)); pool = list.map((l, i) => i); }
    const i = pool[R(pool.length)]; used.add(cat + i);
    const l = list[i];
    if (l.length === 2) return { q: l[0], o: ['⭕ 對', '❌ 錯'], a: l[1] === 'O' ? 0 : 1, tf: 1 };
    const o = shuf(l.slice(1));
    return { q: l[0], o, a: o.indexOf(l[1]) };
  }

  LGAMES.push({
    id: 'quiz', name: '快問快答', icon: '❓', col: '#14b8a6', cat: 'brain',
    blurb: '大家同時作答，答對又快的分數最高！輪流選題目類別', players: [1, 6],
    opts: kid => [
      { k: 'n', n: '題數', o: [[6, '6 題'], [10, '10 題'], [15, '15 題']], d: kid ? 6 : 10 },
      { k: 'pick', n: '類別', o: [['turn', '輪流挑'], ['mix', '隨機混合']], d: 'turn' },
      { k: 't', n: '每題時間', o: kid ? [[20, '20 秒'], [30, '30 秒']] : [[10, '10 秒'], [15, '15 秒'], [20, '20 秒']], d: kid ? 20 : 15 }
    ],
    rules: kid => kid ? [
      '❓ 大家的手機會出現同一個題目',
      '👆 按你覺得對的答案，答對又快分數最高',
      '🎯 每一題會輪到一個人挑題目的種類',
      '🔊 不會看字？按喇叭讓手機唸題目',
      '🔥 最後一題分數加倍！'
    ] : [
      '每題同時出現在每支手機，答對得 500 分＋最多 500 分速度分',
      '連續答對有連勝加分（每連一題 +100，最多 +300）',
      '「輪流挑」：每一題由一位玩家從三個類別中挑一個；「隨機混合」：全部隨機',
      '類別：台灣、生活常識、科學、世界地理、美食、動物、成語、心算',
      '最後一題分數加倍'
    ],

    host(ctx) {
      const kid = ctx.kid, O = ctx.opt || {}, ids = ctx.players.map(p => p.id), N = ids.length, now = () => ctx.now();
      const NQ = O.n || (kid ? 6 : 10), TQ = O.t || (kid ? 20 : 15), PICK_T = kid ? 12 : 9, REV_T = kid ? 5.5 : 4.5;
      const C = CATS(kid), catIds = Object.keys(C);
      const used = new Set(), score = {}, streak = {}, right = {}, lastAdd = {};
      ids.forEach(id => { score[id] = 0; streak[id] = 0; right[id] = 0; lastAdd[id] = 0; });
      let qi = 0, ph = 'pick', T = 0, Qn = null, cat = null, chooser = null, choices = [], ans = {}, t0 = 0, over = false, catLog = [];
      const push = () => ctx.push();
      function nextQ() {
        qi++;
        if (qi > NQ) { ph = 'end'; T = now() + 0.5; push(); return; }
        if (O.pick === 'mix' || N < 1) { setCat(catIds[R(catIds.length)]); return; }
        chooser = ids[(qi - 1) % N];
        const pool = shuf(catIds.slice()).filter(c => c !== cat);
        choices = pool.slice(0, 3);
        ph = 'pick'; T = now() + PICK_T; ctx.sound(chooser, 'turn'); push();
      }
      function setCat(c) {
        cat = c; catLog.push(c); Qn = makeQ(kid, c, used); ans = {};
        ph = 'cat'; T = now() + 1.6; ctx.sound('*', 'whoosh'); push();
      }
      function reveal() {
        ph = 'rev'; T = now() + REV_T;
        const dbl = qi === NQ ? 2 : 1;
        ids.forEach(id => {
          const a = ans[id]; lastAdd[id] = 0;
          if (a && a.i === Qn.a) {
            streak[id]++; right[id]++;
            const sp = Math.round(500 * cl(1 - a.t / TQ, 0, 1) / 10) * 10;
            lastAdd[id] = (500 + sp + Math.min(300, (streak[id] - 1) * 100)) * dbl;
            score[id] += lastAdd[id];
            ctx.sound(id, 'right');
          } else { streak[id] = 0; ctx.sound(id, a ? 'wrong' : 'buzz'); }
        });
        push();
      }
      nextQ();
      return {
        get over() { return over; },
        tick() {
          const t = now();
          if (ph === 'pick') { if (t >= T || !ctx.online(chooser)) setCat(choices[R(choices.length)]); }
          else if (ph === 'cat') { if (t >= T) { ph = 'q'; t0 = now(); T = t0 + TQ; ctx.sound('*', 'go'); push(); } }
          else if (ph === 'q') { if (t >= T || ids.every(id => ans[id] || !ctx.online(id))) reveal(); }
          else if (ph === 'rev') { if (t >= T) nextQ(); }
          else if (ph === 'end') { if (t >= T) over = true; }
        },
        msg(id, d) {
          if (!d || !ids.includes(id)) return;
          if (d.cat != null && ph === 'pick' && id === chooser && choices[d.cat | 0]) { setCat(choices[d.cat | 0]); return; }
          if (d.a != null && ph === 'q' && !ans[id]) {
            const i = d.a | 0; if (i < 0 || i >= Qn.o.length) return;
            ans[id] = { i, t: Math.round((now() - t0) * 100) / 100 };
            ctx.sound(id, 'pop'); push();
          }
        },
        leave() { push(); }, back() { push(); },
        view(id) {
          const me = id && ids.includes(id) ? id : null;
          const v = { ph, qi, nq: NQ, tl: Math.max(0, Math.round((T - now()) * 10) / 10), tq: TQ, sc: score, dbl: qi === NQ };
          if (ph === 'pick') { v.ch = chooser; v.cs = choices.map(c => [C[c][0], C[c][1]]); }
          if (cat) v.cat = [C[cat][0], C[cat][1]];
          if (ph === 'q' || ph === 'rev') { v.q = Qn.q; v.o = Qn.o; v.pic = Qn.pic || ''; v.tf = Qn.tf || 0; v.done = Object.keys(ans); }
          if (ph === 'cat') { v.q = ''; }
          if (ph === 'rev') { v.a = Qn.a; v.ans = ans; v.add = lastAdd; v.st = streak; }
          if (me && ans[me]) v.my = ans[me].i;
          return v;
        },
        results() {
          return {
            rows: ids.map(id => ({ id, key: score[id], line: `${score[id]} 分 · 答對 ${right[id]}/${NQ} 題` })),
            title: N === 1 ? `答對 ${right[ids[0]]}/${NQ} 題！` : undefined
          };
        }
      };
    },

    client(root, api) {
      if (!document.getElementById('qz-style')) { const st = document.createElement('style'); st.id = 'qz-style'; st.textContent = CSS; document.head.appendChild(st); }
      const kid = api.kid, me = api.me, tv = api.isTable;
      root.innerHTML = `<div class="qz ${kid ? 'qz-kid' : ''} ${tv ? 'qz-tv' : ''} ${me ? '' : 'qz-pub'}">
        <div class="qz-top"><span class="qz-no"></span><span class="qz-cat"></span><button class="qz-say" aria-label="唸題目">🔊</button><span class="qz-me"></span></div>
        <div class="qz-bar"><i></i></div>
        <div class="qz-main"></div>
        <div class="qz-rank"></div>
      </div>`;
      const Q = s => root.querySelector(s);
      const wrap = Q('.qz'), elNo = Q('.qz-no'), elCat = Q('.qz-cat'), elSay = Q('.qz-say'), elMe = Q('.qz-me'), elBar = Q('.qz-bar i'), elMain = Q('.qz-main'), elRank = Q('.qz-rank');
      const P = id => api.player(id) || { name: '?', col: 0, animal: 0 };
      const set = (el, key, html) => { if (!el || el._k === key) return false; el._k = key; el.innerHTML = html; return true; };
      let V = null, tEnd = 0, raf = 0, lastQ = '', spoken = '', lastTick = -1;
      const ro = new ResizeObserver(() => wrap.classList.toggle('qz-wide', root.clientWidth > root.clientHeight * 1.25));
      ro.observe(root);
      const canSpeak = 'speechSynthesis' in window;
      function speak(t) {
        if (!canSpeak || !t) return;
        try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')); u.lang = 'zh-TW'; u.rate = kid ? 0.9 : 1.05; speechSynthesis.speak(u); } catch (e) { }
      }
      elSay.hidden = !canSpeak;
      elSay.onclick = () => { if (V && V.q) speak(V.q + '。' + (V.tf ? '' : V.o.join('、'))); };
      function loop() {
        raf = requestAnimationFrame(loop);
        if (!V) return;
        const left = Math.max(0, tEnd - performance.now() / 1000), tot = V.ph === 'q' ? V.tq : V.ph === 'pick' ? (kid ? 12 : 9) : 1;
        elBar.style.transform = `scaleX(${V.ph === 'q' || V.ph === 'pick' ? cl(left / tot, 0, 1) : 0})`;
        elBar.classList.toggle('low', V.ph === 'q' && left < 4);
        const s = Math.ceil(left);
        if (V.ph === 'q' && s !== lastTick && s <= 3 && s > 0 && V.my == null) { lastTick = s; api.sfx('tick'); }
      }
      raf = requestAnimationFrame(loop);

      function rankHTML() {
        const ids = api.players().map(p => p.id).sort((a, b) => (V.sc[b] || 0) - (V.sc[a] || 0));
        return ids.map((id, i) => `<div class="qz-r ${id === me ? 'me' : ''}"><b>${i + 1}</b><img alt="" src="${api.avatar(P(id), tv ? 96 : 56)}"><span>${esc(P(id).name)}</span><em>${V.sc[id] || 0}</em>${V.ph === 'rev' && V.add[id] ? `<i class="qz-add">+${V.add[id]}</i>` : ''}${V.ph === 'q' && V.done.includes(id) ? '<i class="qz-ok">✔</i>' : ''}</div>`).join('');
      }
      function draw() {
        const v = V;
        tEnd = performance.now() / 1000 + v.tl;
        elNo.textContent = v.ph === 'end' ? '結束' : `第 ${Math.min(v.qi, v.nq)}/${v.nq} 題${v.dbl ? ' 🔥×2' : ''}`;
        elCat.innerHTML = v.cat && v.ph !== 'pick' ? `${v.cat[0]} ${esc(v.cat[1])}` : '';
        elMe.textContent = me ? `${v.sc[me] || 0} 分` : '';
        elSay.style.visibility = v.ph === 'q' || v.ph === 'rev' ? 'visible' : 'hidden';
        set(elRank, JSON.stringify([v.sc, v.ph, v.done, v.add]), rankHTML());
        if (v.ph === 'pick') {
          const mine = v.ch === me;
          set(elMain, 'pick' + v.qi + mine, `<div class="qz-pick"><div class="qz-who"><img alt="" src="${api.avatar(P(v.ch), 96)}"><b>${mine ? '輪到你挑類別！' : `${esc(P(v.ch).name)} 正在挑類別…`}</b></div>
            <div class="qz-cs">${v.cs.map((c, i) => `<button class="qz-c" data-c="${i}" ${mine ? '' : 'disabled'}><span>${c[0]}</span><b>${esc(c[1])}</b></button>`).join('')}</div></div>`);
          if (mine) elMain.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { api.send({ cat: +b.dataset.c }); api.sfx('pop'); b.classList.add('on'); });
          return;
        }
        if (v.ph === 'cat') { set(elMain, 'cat' + v.qi, `<div class="qz-catcard"><span>${v.cat[0]}</span><b>${esc(v.cat[1])}</b>${v.dbl ? '<em>🔥 最後一題，分數加倍！</em>' : ''}</div>`); return; }
        if (v.ph === 'q' || v.ph === 'rev') {
          const key = 'q' + v.qi;
          if (set(elMain, key, `<div class="qz-q"><div class="qz-qt">${esc(v.q)}</div>${v.pic ? `<div class="qz-pic">${esc(v.pic)}</div>` : ''}</div><div class="qz-os ${v.tf ? 'tf' : ''} ${v.o.every(o => [...o].length <= 4) ? 'short' : ''}">${v.o.map((o, i) => `<button class="qz-o c${i}" data-a="${i}"><i>${'ABCD'[i]}</i><span>${esc(o)}</span><em class="qz-who2"></em></button>`).join('')}</div><div class="qz-st"></div>`)) {
            elMain.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { if (!me || !V || V.ph !== 'q' || V.my != null) return; api.send({ a: +b.dataset.a }); api.sfx('pop'); api.vibrate(20); b.classList.add('pick'); elMain.classList.add('sent'); });
            elMain.classList.remove('sent');
            if (kid && v.q !== spoken && v.ph === 'q') { spoken = v.q; setTimeout(() => speak(v.q), 150); }
          }
          const bs = elMain.querySelectorAll('[data-a]');
          bs.forEach((b, i) => {
            b.classList.toggle('pick', v.my === i);
            b.classList.toggle('dim', (v.my != null && v.my !== i && v.ph === 'q') || (v.ph === 'rev' && i !== v.a));
            b.classList.toggle('right', v.ph === 'rev' && i === v.a);
            b.classList.toggle('wrong', v.ph === 'rev' && v.my === i && i !== v.a);
            b.disabled = !me || v.ph !== 'q' || v.my != null;
            const who = b.querySelector('.qz-who2');
            const html = v.ph === 'rev' ? Object.keys(v.ans).filter(id => v.ans[id].i === i).map(id => `<img alt="" src="${api.avatar(P(id), 48)}">`).join('') : '';
            if (who._h !== html) { who._h = html; who.innerHTML = html; }
          });
          const st = elMain.querySelector('.qz-st');
          let s = '';
          if (v.ph === 'q') s = !me ? `${v.done.length}/${api.players().length} 人答了` : v.my != null ? '✔ 已作答，等其他人…' : '';
          else if (me) s = v.my === v.a ? `<b class="ok">⭕ 答對了！ +${v.add[me]}${v.st[me] > 1 ? `　🔥 連對 ${v.st[me]}` : ''}</b>` : v.my != null ? `<b class="ng">❌ 答錯了</b>` : `<b class="ng">⏰ 沒來得及</b>`;
          else s = `正解：${esc(v.o[v.a])}`;
          set(st, s, s);
          if (v.ph === 'rev' && lastQ !== key) { lastQ = key; if (me && v.my === v.a) api.vibrate(40); }
          return;
        }
        if (v.ph === 'end') set(elMain, 'end', `<div class="qz-catcard"><span>🏁</span><b>全部答完了！</b></div>`);
      }
      return { view(v) { if (!v) return; V = v; draw(); }, destroy() { cancelAnimationFrame(raf); ro.disconnect(); try { canSpeak && speechSynthesis.cancel(); } catch (e) { } } };
    },

    bot(v, api) {
      const me = api.me; if (!v || !me) return;
      if (v.ph === 'pick' && v.ch === me && Math.random() < 0.4) api.send({ cat: R(v.cs.length) });
      if (v.ph === 'q' && v.my == null && Math.random() < 0.3) api.send({ a: R(v.o.length) });
    }
  });

  const CSS = `
.qz{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(170deg,#e6fffa 0,#d6f3ff 60%,#ece6ff 100%);font-family:var(--sans);overflow:hidden}
.qz-top{display:flex;gap:8px;align-items:center}
.qz-no,.qz-cat,.qz-me{background:#fff;border-radius:999px;padding:5px 12px;font-weight:900;font-size:14px;box-shadow:0 2px 0 var(--line);white-space:nowrap}
.qz-cat:empty{display:none}
.qz-me{margin-left:auto;color:var(--pri);font-family:var(--round)}
.qz-me:empty{display:none}
.qz-say{background:#fff;border-radius:999px;width:34px;height:34px;box-shadow:0 2px 0 var(--line);font-size:16px}
.qz-bar{height:8px;border-radius:9px;background:rgba(20,40,80,.1);overflow:hidden}
.qz-bar i{display:block;height:100%;background:linear-gradient(90deg,#14b8a6,#22c26a);transform-origin:left}
.qz-bar i.low{background:#ef4444}
.qz-main{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;justify-content:center}
.qz-rank{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;flex:none}
.qz-r{position:relative;display:flex;align-items:center;gap:4px;background:#fff;border-radius:999px;padding:3px 10px 3px 4px;box-shadow:0 2px 0 var(--line);font-size:13px;font-weight:700;flex:none}
.qz-r.me{box-shadow:0 0 0 2px var(--pri)}
.qz-r b{font-family:var(--round);color:var(--mute);width:14px;text-align:center}
.qz-r img{width:26px;height:26px}
.qz-r span{max-width:64px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.qz-r em{font-style:normal;font-family:var(--round);font-weight:700;color:var(--pri)}
.qz-add{position:absolute;right:-4px;top:-10px;background:#22c26a;color:#fff;border-radius:999px;padding:0 6px;font-style:normal;font-size:11px;font-weight:900;animation:qzUp .4s}
.qz-ok{position:absolute;right:-4px;top:-8px;background:var(--pri);color:#fff;border-radius:50%;width:18px;height:18px;display:grid;place-items:center;font-style:normal;font-size:11px}
.qz-q{background:#fff;border-radius:22px;padding:16px;box-shadow:0 4px 0 var(--line);text-align:center}
.qz-qt{font-size:clamp(19px,5.4vw,26px);font-weight:900;line-height:1.45}
.qz-kid .qz-qt{font-size:clamp(22px,6.4vw,30px)}
.qz-pic{font-size:clamp(28px,8vw,44px);margin-top:6px;letter-spacing:2px;word-break:break-all;line-height:1.25}
.qz-os{display:grid;grid-template-columns:1fr;gap:8px}
.qz-os.short{grid-template-columns:1fr 1fr}
.qz-os.tf{grid-template-columns:1fr 1fr}
.qz-o{position:relative;display:flex;align-items:center;gap:10px;background:#fff;border-radius:18px;padding:12px 14px;min-height:58px;font-weight:900;font-size:clamp(16px,4.6vw,20px);text-align:left;
  box-shadow:0 4px 0 var(--c2);border:3px solid var(--c1);color:var(--ink);transition:transform .1s,opacity .2s}
.qz-kid .qz-o{font-size:clamp(18px,5.4vw,24px);min-height:68px}
.qz-os.tf .qz-o{justify-content:center;font-size:24px;min-height:84px}
.qz-o i{font-style:normal;font-family:var(--round);width:28px;height:28px;border-radius:9px;background:var(--c1);color:#fff;display:grid;place-items:center;font-size:15px;flex:none}
.qz-os.tf .qz-o i{display:none}
.qz-o span{flex:1;min-width:0}
.qz-o.c0{--c1:#ef4444;--c2:#b91c1c}.qz-o.c1{--c1:#2f8cff;--c2:#1d5cd6}.qz-o.c2{--c1:#f5b400;--c2:#b07f00}.qz-o.c3{--c1:#22c26a;--c2:#12924f}
.qz-o:active{transform:translateY(3px)}
.qz-o.pick{background:var(--c1);color:#fff}.qz-o.pick i{background:#fff;color:var(--c1)}
.qz-o.dim{opacity:.4}
.qz-o.right{background:#22c26a;border-color:#12924f;color:#fff;opacity:1;animation:qzPop .35s}.qz-o.right i{background:#fff;color:#12924f}
.qz-o.wrong{background:#ef4444;color:#fff;border-color:#b91c1c;opacity:1}
.qz-o:disabled{cursor:default}
.qz-who2{position:absolute;right:-6px;top:-12px;display:flex;gap:0;flex:none;pointer-events:none}.qz-who2 img{width:26px;height:26px;margin-left:-6px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
.qz-st{text-align:center;font-weight:900;min-height:1.5em;font-size:16px;color:var(--mute)}
.qz-st .ok{color:#12924f;font-size:20px}.qz-st .ng{color:#ef4444;font-size:20px}
.qz-pick{display:flex;flex-direction:column;gap:14px;align-items:center}
.qz-who{display:flex;align-items:center;gap:8px;font-size:18px}.qz-who img{width:52px;height:52px}
.qz-cs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%}
.qz-c{background:#fff;border-radius:20px;padding:16px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 5px 0 var(--line);border:3px solid transparent}
.qz-c span{font-size:42px;line-height:1}.qz-c b{font-size:16px}
.qz-c:disabled{opacity:.75}
.qz-c.on{border-color:var(--acc);background:#fff4ee}
.qz-catcard{align-self:center;background:#fff;border-radius:26px;padding:22px 34px;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:0 6px 0 var(--line);animation:qzPop .4s}
.qz-catcard span{font-size:70px;line-height:1}.qz-catcard b{font-size:26px}.qz-catcard em{font-style:normal;color:#ef4444;font-weight:900}
.qz-wide .qz-main{display:grid;grid-template-columns:1fr 1.2fr;align-items:center;gap:12px}
.qz-wide .qz-main > .qz-pick,.qz-wide .qz-main > .qz-catcard{grid-column:1/-1}
.qz-wide .qz-st{grid-column:1/-1}
.qz-wide .qz-os{grid-template-columns:1fr 1fr}
.qz-tv .qz-qt{font-size:44px}.qz-tv .qz-o{font-size:30px;min-height:90px}.qz-tv .qz-r{font-size:20px}.qz-tv .qz-r img{width:44px;height:44px}.qz-tv .qz-pic{font-size:64px}
@media (max-height:460px){.qz{gap:5px;padding-top:4px}.qz-q{padding:8px 10px}.qz-qt{font-size:18px}.qz-kid .qz-qt{font-size:20px}.qz-pic{font-size:26px}
  .qz-o,.qz-kid .qz-o{min-height:44px;padding:6px 10px;font-size:16px}.qz-os.tf .qz-o{min-height:56px}.qz-c{padding:8px 4px}.qz-c span{font-size:30px}.qz-catcard{padding:10px 24px}.qz-catcard span{font-size:44px}.qz-st{min-height:0}}
@keyframes qzPop{0%{transform:scale(.8)}60%{transform:scale(1.06)}100%{transform:scale(1)}}
@keyframes qzUp{0%{transform:translateY(8px);opacity:0}}
`;
})();

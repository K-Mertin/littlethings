'use strict';
// 夜市小吃王：遊戲資料（設施、食材、菜色、組合、顧客、對手、目標）

const STN = { griddle: '煎台', fryer: '炸鍋', drink: '飲料', soup: '湯鍋', steam: '蒸籠', grill: '烤架', ice: '冰品' };
const CAT = { salty: '鹹的', sweet: '甜的', spicy: '辣的', drink: '喝的' };
const CATCOL = { salty: '#e8963a', sweet: '#ff7fb0', spicy: '#e8473b', drink: '#5bb8ff' };

// 店舖等級：人氣夠了就能擴建
const LEVELS = [
  { n: '路邊小攤', W: 6, H: 5, pop: 0, cost: 0, rent: 500, staff: 3 },
  { n: '巷口小吃店', W: 8, H: 6, pop: 120, cost: 20000, rent: 1500, staff: 6 },
  { n: '排隊名店', W: 10, H: 7, pop: 700, cost: 80000, rent: 4000, staff: 9 },
  { n: '美食廣場', W: 12, H: 8, pop: 2500, cost: 180000, rent: 9000, staff: 12 },
  { n: '夜市大街', W: 14, H: 9, pop: 6000, cost: 550000, rent: 18000, staff: 16 },
  { n: '傳說夜市', W: 16, H: 10, pop: 12000, cost: 1200000, rent: 32000, staff: 20 },
];

// 設施：cat = station 攤位 / seat 座位 / decor 裝飾 / fun 遊戲攤 / floor 地板
const FAC = [
  { id: 'griddle', n: '鐵板煎台', cat: 'station', st: 'griddle', price: 2500, ap: 1, lv: 0, d: '煎餅、蛋餅、蚵仔煎都靠它' },
  { id: 'drink', n: '飲料吧', cat: 'station', st: 'drink', price: 2000, ap: 1, lv: 0, d: '紅茶、奶茶、珍珠奶茶' },
  { id: 'fryer', n: '油炸鍋', cat: 'station', st: 'fryer', price: 3500, ap: 1, lv: 0, d: '雞排、地瓜球、臭豆腐' },
  { id: 'soup', n: '大湯鍋', cat: 'station', st: 'soup', price: 4500, ap: 1, lv: 1, d: '滷肉飯、牛肉麵、麵線' },
  { id: 'ice', n: '冰品櫃', cat: 'station', st: 'ice', price: 4000, ap: 2, lv: 1, d: '剉冰、豆花、芒果冰' },
  { id: 'steam', n: '蒸籠台', cat: 'station', st: 'steam', price: 5500, ap: 1, lv: 2, d: '小籠包、肉圓、刈包' },
  { id: 'grill', n: '炭烤架', cat: 'station', st: 'grill', price: 5500, ap: 2, lv: 2, d: '香腸、烤玉米、烤魷魚' },

  { id: 'stool', n: '塑膠桌椅', cat: 'seat', seats: 2, price: 600, ap: 0, lv: 0, d: '紅色塑膠椅，夜市的靈魂' },
  { id: 'bench', n: '長板凳', cat: 'seat', seats: 2, price: 500, ap: 0, lv: 0, d: '坐著吃比站著吃開心' },
  { id: 'wood', n: '木頭桌', cat: 'seat', seats: 2, price: 1800, ap: 2, lv: 1, d: '有質感的原木桌' },
  { id: 'round', n: '大圓桌', cat: 'seat', seats: 4, price: 4000, ap: 3, lv: 2, d: '一家人圍著吃最熱鬧' },
  { id: 'picnic', n: '野餐長桌', cat: 'seat', seats: 4, price: 2600, ap: 1, lv: 1, d: '大家擠一擠，一次坐四個' },
  { id: 'bar', n: '吧台高腳椅', cat: 'seat', seats: 2, price: 3500, ap: 4, lv: 3, d: '坐著看老闆現做' },
  { id: 'booth', n: '雅座包廂', cat: 'seat', seats: 4, price: 12000, ap: 8, lv: 4, d: '高級的軟沙發座位' },

  { id: 'plant', n: '盆栽', cat: 'decor', price: 300, ap: 2, lv: 0, d: '綠油油的看了心情好' },
  { id: 'lantern', n: '紅燈籠', cat: 'decor', price: 500, ap: 3, lv: 0, d: '晚上亮起來好有氣氛' },
  { id: 'trash', n: '垃圾桶', cat: 'decor', price: 300, ap: 0, lv: 0, fx: 'clean', d: '附近的桌子比較不會亂' },
  { id: 'fan', n: '電風扇', cat: 'decor', price: 700, ap: 1, lv: 0, d: '夏天的救星' },
  { id: 'banner', n: '好吃布旗', cat: 'decor', price: 400, ap: 2, lv: 0, d: '寫著「好吃」的紅布旗' },
  { id: 'icebox', n: '汽水冰桶', cat: 'decor', price: 900, ap: 2, lv: 1, d: '冰涼的彈珠汽水' },
  { id: 'vsign', n: '直立招牌', cat: 'decor', price: 2200, ap: 4, lv: 1, d: '亮燈的直式招牌，遠遠就看得到' },
  { id: 'flower', n: '花台', cat: 'decor', price: 1200, ap: 3, lv: 1, d: '種滿了繡球花' },
  { id: 'sink', n: '洗手台', cat: 'decor', price: 1500, ap: 1, lv: 1, fx: 'clean', d: '衛生好，客人安心' },
  { id: 'tv', n: '電視機', cat: 'decor', price: 2800, ap: 3, lv: 1, d: '一邊吃一邊看節目' },
  { id: 'neon', n: '霓虹招牌', cat: 'decor', price: 5000, ap: 6, lv: 2, d: '一閃一閃，老遠就看得到' },
  { id: 'shrine', n: '土地公小廟', cat: 'decor', price: 8000, ap: 6, lv: 2, d: '保佑生意興隆' },
  { id: 'tree', n: '聖誕樹', cat: 'decor', price: 6500, ap: 7, lv: 2, d: '一閃一閃亮晶晶' },
  { id: 'lion', n: '石獅子', cat: 'decor', price: 9000, ap: 7, lv: 3, d: '守護店門口的威風石獅' },
  { id: 'cat', n: '招財貓', cat: 'decor', price: 6000, ap: 5, lv: 3, fx: 'money', d: '揮揮手，錢就進來（每週小收入）' },
  { id: 'mascot', n: '吉祥物看板', cat: 'decor', price: 10000, ap: 8, lv: 3, d: '可愛的雞排君看板' },
  { id: 'fountain', n: '噴水池', cat: 'decor', price: 20000, ap: 12, lv: 4, d: '夜市中間的地標' },
  { id: 'koi', n: '錦鯉池', cat: 'decor', price: 16000, ap: 10, lv: 4, d: '紅白錦鯉悠游' },
  { id: 'stage', n: '表演舞台', cat: 'decor', price: 30000, ap: 15, lv: 5, d: '週末有街頭藝人表演' },
  { id: 'tB', n: '銅獎盃', cat: 'decor', price: 0, ap: 5, lv: 0, unlock: 'tB', d: '小吃大賽的榮耀' },
  { id: 'tS', n: '銀獎盃', cat: 'decor', price: 0, ap: 8, lv: 0, unlock: 'tS', d: '年度大賞的榮耀' },
  { id: 'tG', n: '金獎盃', cat: 'decor', price: 0, ap: 14, lv: 0, unlock: 'tG', d: '夜市之王的證明' },

  { id: 'pinball', n: '彈珠台', cat: 'fun', price: 3000, ap: 4, lv: 1, inc: 30, d: '叮叮噹噹（每週小收入）' },
  { id: 'gacha', n: '扭蛋機', cat: 'fun', price: 2500, ap: 3, lv: 1, inc: 25, d: '小朋友最愛（每週小收入）' },
  { id: 'goldfish', n: '撈金魚', cat: 'fun', price: 4000, ap: 5, lv: 1, inc: 40, d: '紙網一下就破了' },
  { id: 'ring', n: '套圈圈', cat: 'fun', price: 5000, ap: 5, lv: 2, inc: 50, d: '套中大獎超開心' },
  { id: 'claw', n: '夾娃娃機', cat: 'fun', price: 6000, ap: 5, lv: 2, inc: 60, d: '保夾 999 元' },
  { id: 'bingo', n: '彈珠九宮格', cat: 'fun', price: 5500, ap: 5, lv: 2, inc: 55, d: '連成一線就有獎（每週小收入）' },
  { id: 'fortune', n: '抽籤算命', cat: 'fun', price: 9000, ap: 6, lv: 3, inc: 85, d: '上上籤！（每週小收入）' },
  { id: 'balloon', n: '射氣球', cat: 'fun', price: 7000, ap: 6, lv: 3, inc: 70, d: '砰砰砰！' },

  { id: 'f_brick', n: '紅磚地', cat: 'floor', price: 40, ap: 0.2, lv: 0, d: '一格的價錢' },
  { id: 'f_grass', n: '草皮', cat: 'floor', price: 60, ap: 0.3, lv: 1, d: '一格的價錢' },
  { id: 'f_wood', n: '木地板', cat: 'floor', price: 80, ap: 0.4, lv: 1, d: '一格的價錢' },
  { id: 'f_tile', n: '復古花磚', cat: 'floor', price: 150, ap: 0.6, lv: 2, d: '一格的價錢' },
  { id: 'f_marble', n: '大理石', cat: 'floor', price: 400, ap: 1, lv: 4, d: '一格的價錢' },
  { id: 'f_none', n: '水泥地', cat: 'floor', price: 0, ap: 0, lv: 0, d: '還原成水泥地' },
];
const F = {}; FAC.forEach(f => F[f.id] = f);

// 相鄰擺放的組合（8 方向相鄰就算）。eff: sat 附近座位滿意度 / cust 客人變多(%) / pop 每週人氣 / spd 料理速度(%)
const COMBOS = [
  { id: 'lanterns', a: 'lantern', b: 'lantern', n: '燈籠一條街', eff: { sat: 2 }, h: '同一種裝飾排在一起…' },
  { id: 'green', a: 'wood', b: 'plant', n: '綠意用餐區', eff: { sat: 6 }, h: '木頭配上一點綠色' },
  { id: 'shade', a: 'bench', b: 'plant', n: '樹下乘涼', eff: { sat: 3 }, h: '板凳旁邊放點綠' },
  { id: 'friedtea', a: 'fryer', b: 'drink', n: '炸雞配飲料', eff: { spd: 20 }, h: '油炸的東西配什麼最對味？' },
  { id: 'twinfry', a: 'griddle', b: 'griddle', n: '雙鐵板', eff: { spd: 15 }, h: '兩台一樣的攤子並排' },
  { id: 'dimsum', a: 'steam', b: 'drink', n: '飲茶時光', eff: { spd: 20 }, h: '蒸點心旁邊放茶' },
  { id: 'cool', a: 'ice', b: 'fan', n: '透心涼', eff: { sat: 5 }, h: '冰的東西＋涼的風' },
  { id: 'family', a: 'soup', b: 'round', n: '家庭聚餐', eff: { sat: 6 }, h: '大鍋湯配大桌子' },
  { id: 'ballgame', a: 'tv', b: 'stool', n: '看球賽', eff: { sat: 5 }, h: '塑膠椅上看轉播' },
  { id: 'clean', a: 'sink', b: 'trash', n: '衛生模範生', eff: { sat: 4 }, h: '兩個讓環境乾淨的東西' },
  { id: 'temple', a: 'shrine', b: 'lantern', n: '廟口氣氛', eff: { pop: 3, sat: 3 }, h: '小廟前面要掛什麼？' },
  { id: 'bbq', a: 'grill', b: 'lantern', n: '中秋烤肉', eff: { sat: 5 }, h: '烤肉的時候抬頭賞燈' },
  { id: 'childhood', a: 'goldfish', b: 'ring', n: '童年回憶', eff: { cust: 6 }, h: '兩個經典的夜市遊戲' },
  { id: 'arcade', a: 'pinball', b: 'gacha', n: '柑仔店角落', eff: { cust: 5 }, h: '彈珠聲和扭蛋聲' },
  { id: 'trendy', a: 'neon', b: 'claw', n: '潮流打卡點', eff: { cust: 6 }, h: '閃亮的招牌配上會夾到的機台' },
  { id: 'retro', a: 'neon', b: 'lantern', n: '新舊交融', eff: { pop: 2 }, h: '現代的光和傳統的光' },
  { id: 'luck', a: 'cat', b: 'shrine', n: '好運旺旺來', eff: { pop: 4 }, h: '兩個保佑生意的東西' },
  { id: 'gamesking', a: 'balloon', b: 'goldfish', n: '遊戲攤之王', eff: { cust: 5 }, h: '砰砰聲旁邊有水聲' },
  { id: 'garden', a: 'flower', b: 'fountain', n: '花園廣場', eff: { sat: 8 }, h: '花旁邊有水' },
  { id: 'carnival', a: 'stage', b: 'mascot', n: '夜市嘉年華', eff: { cust: 10, pop: 5 }, h: '舞台上要有誰？' },
  { id: 'vip', a: 'booth', b: 'flower', n: '貴賓花園席', eff: { sat: 8 }, h: '高級座位配上花' },
  { id: 'classic', a: 'banner', b: 'stool', n: '夜市經典', eff: { sat: 3 }, h: '紅布旗配紅椅子' },
  { id: 'soda', a: 'icebox', b: 'grill', n: '烤肉配汽水', eff: { spd: 15 }, h: '炭火旁邊要有冰的' },
  { id: 'xmas', a: 'tree', b: 'neon', n: '聖誕夜', eff: { cust: 6 }, h: '閃亮的樹配上閃亮的招牌' },
  { id: 'guard', a: 'lion', b: 'shrine', n: '廟口守護神', eff: { pop: 4 }, h: '小廟前面該有誰站崗？' },
  { id: 'zen', a: 'koi', b: 'flower', n: '禪意庭園', eff: { sat: 8 }, h: '魚池旁邊開滿花' },
  { id: 'luckdraw', a: 'fortune', b: 'cat', n: '招財開運', eff: { pop: 4 }, h: '抽到好籤，還有誰在招手？' },
  { id: 'marble', a: 'bingo', b: 'pinball', n: '彈珠大王', eff: { cust: 6 }, h: '兩種會叮叮噹噹的機台' },
  { id: 'counter', a: 'bar', b: 'drink', n: '飲料吧台', eff: { spd: 15, sat: 3 }, h: '高腳椅前面最適合賣什麼？' },
  { id: 'park', a: 'picnic', b: 'plant', n: '公園野餐', eff: { sat: 5 }, h: '長桌旁邊放點綠' },
  { id: 'oldst', a: 'vsign', b: 'lantern', n: '老街招牌', eff: { pop: 2, cust: 3 }, h: '直直的招牌配上紅紅的光' },
  { id: 'steamx2', a: 'steam', b: 'steam', n: '蒸氣滿滿', eff: { spd: 15 }, h: '兩台蒸籠並排' },
  { id: 'grillx2', a: 'grill', b: 'grill', n: '炭火一條街', eff: { spd: 15 }, h: '兩台烤架並排' },
  { id: 'proud', a: 'tG', b: 'neon', n: '冠軍招牌', eff: { cust: 8, pop: 4 }, h: '把最亮的獎盃秀出來' },
];

// 食材：c = 每份成本，buy = 進貨契約價，lv = 店舖等級
const ING = {
  flour: { n: '麵粉', c: 4, buy: 0, lv: 0, col: '#f4ead2' },
  scallion: { n: '青蔥', c: 3, buy: 0, lv: 0, col: '#59c25a' },
  egg: { n: '雞蛋', c: 4, buy: 0, lv: 0, col: '#ffd84a' },
  tea: { n: '茶葉', c: 3, buy: 0, lv: 0, col: '#8a5a2b' },
  sugar: { n: '黑糖', c: 2, buy: 0, lv: 0, col: '#6a3a1a' },
  chicken: { n: '雞肉', c: 12, buy: 0, lv: 0, col: '#f2b48a' },
  spflour: { n: '地瓜粉', c: 3, buy: 1000, lv: 0, col: '#ffffff' },
  milk: { n: '牛奶', c: 6, buy: 1200, lv: 0, col: '#f8f8ff' },
  sweetpotato: { n: '地瓜', c: 5, buy: 1200, lv: 0, col: '#ff9a3a' },
  pork: { n: '豬肉', c: 11, buy: 2000, lv: 0, col: '#e88a8a' },
  rice: { n: '白米', c: 3, buy: 1200, lv: 0, col: '#fffbe8' },
  basil: { n: '九層塔', c: 2, buy: 1200, lv: 1, col: '#2f9a4a' },
  tofu: { n: '豆腐', c: 4, buy: 1800, lv: 1, col: '#fff3c8' },
  kimchi: { n: '泡菜', c: 5, buy: 1800, lv: 1, col: '#e8603a' },
  oyster: { n: '蚵仔', c: 14, buy: 3500, lv: 1, col: '#c9c0b0' },
  pearl: { n: '粉圓', c: 4, buy: 2500, lv: 1, col: '#3a2418' },
  soy: { n: '醬油', c: 2, buy: 1200, lv: 1, col: '#4a2a14' },
  chili: { n: '辣椒', c: 2, buy: 1200, lv: 1, col: '#ff3030' },
  ice: { n: '刨冰', c: 2, buy: 1800, lv: 1, col: '#dff4ff' },
  redbean: { n: '紅豆', c: 4, buy: 1500, lv: 1, col: '#9a2a3a' },
  grassjelly: { n: '仙草', c: 3, buy: 1800, lv: 1, col: '#2a2420' },
  lemon: { n: '檸檬', c: 3, buy: 1500, lv: 1, col: '#e8f060' },
  mushroom: { n: '杏鮑菇', c: 5, buy: 2000, lv: 1, col: '#f0e0c0' },
  aiyu: { n: '愛玉', c: 4, buy: 2600, lv: 2, col: '#f4e890' },
  beef: { n: '牛肉', c: 26, buy: 6000, lv: 2, col: '#a8483a' },
  soybean: { n: '黃豆', c: 3, buy: 2200, lv: 2, col: '#e8c860' },
  corn: { n: '玉米', c: 5, buy: 2200, lv: 2, col: '#ffd030' },
  peanut: { n: '花生', c: 4, buy: 2500, lv: 2, col: '#c8904a' },
  noodle: { n: '麵線', c: 3, buy: 2500, lv: 2, col: '#e8d0a0' },
  pepper: { n: '胡椒', c: 2, buy: 2200, lv: 2, col: '#5a5a5a' },
  mango: { n: '芒果', c: 14, buy: 5000, lv: 2, col: '#ffb020', season: [5, 6, 7, 8] },
  taro: { n: '芋頭', c: 7, buy: 4000, lv: 3, col: '#a890c8' },
  glutinous: { n: '糯米', c: 5, buy: 3500, lv: 3, col: '#f8f4e8' },
  papaya: { n: '木瓜', c: 9, buy: 4000, lv: 3, col: '#ff8a40' },
  duckblood: { n: '鴨血', c: 7, buy: 5000, lv: 3, col: '#6a1a1a' },
  strawberry: { n: '草莓', c: 18, buy: 8000, lv: 4, col: '#ff3a5a', season: [12, 1, 2, 3] },
  squid: { n: '魷魚', c: 20, buy: 7000, lv: 4, col: '#f0d8c8' },
  shrimp: { n: '蝦仁', c: 16, buy: 6500, lv: 3, col: '#ff9a7a' },
};

// 菜色：a + b 研發出來（a、b 可以是食材，也可以是已經研發的菜）
// p = 建議售價、q = 基本美味度、t = 料理秒數
const DISH = {
  pancake: { n: '蔥抓餅', a: 'flour', b: 'scallion', st: 'griddle', cat: 'salty', p: 40, q: 3, t: 3, h: '一層一層的，加了綠綠的東西' },
  blacktea: { n: '古早味紅茶', a: 'tea', b: 'sugar', st: 'drink', cat: 'drink', p: 25, q: 2, t: 2, h: '茶葉加點甜' },
  eggcrepe: { n: '蛋餅', a: 'flour', b: 'egg', st: 'griddle', cat: 'salty', p: 35, q: 3, t: 3, h: '早餐店的好朋友，用麵粉做的' },
  eggcake: { n: '雞蛋糕', a: 'egg', b: 'sugar', st: 'griddle', cat: 'sweet', p: 40, q: 4, t: 3, h: '小小的、香香甜甜，蛋做的' },
  cutlet: { n: '大雞排', a: 'chicken', b: 'spflour', st: 'fryer', cat: 'salty', p: 70, q: 5, t: 4, h: '比臉還大，外皮是粉做的' },
  popcorn: { n: '鹹酥雞', a: 'chicken', b: 'basil', st: 'fryer', cat: 'salty', p: 65, q: 5, t: 4, h: '炸好要丟一把香香的葉子' },
  spball: { n: '地瓜球', a: 'sweetpotato', b: 'spflour', st: 'fryer', cat: 'sweet', p: 40, q: 4, t: 3, h: '壓一壓會膨脹的金黃球' },
  milktea: { n: '奶茶', a: 'tea', b: 'milk', st: 'drink', cat: 'drink', p: 40, q: 3, t: 2, h: '茶裡加白白的東西' },
  bubble: { n: '珍珠奶茶', a: 'milktea', b: 'pearl', st: 'drink', cat: 'drink', p: 60, q: 7, t: 3, h: '台灣之光！用奶茶再加料' },
  lurou: { n: '滷肉飯', a: 'pork', b: 'rice', st: 'soup', cat: 'salty', p: 45, q: 5, t: 3, h: '肉燥淋在白飯上' },
  teaegg: { n: '茶葉蛋', a: 'egg', b: 'tea', st: 'soup', cat: 'salty', p: 20, q: 2, t: 2, h: '便利商店門口那一鍋' },
  omelet: { n: '蚵仔煎', a: 'oyster', b: 'egg', st: 'griddle', cat: 'salty', p: 75, q: 6, t: 4, h: '海味和蛋一起煎' },
  stinky: { n: '臭豆腐', a: 'tofu', b: 'kimchi', st: 'fryer', cat: 'spicy', p: 60, q: 6, t: 4, h: '聞起來臭、吃起來香，要配酸酸的菜' },
  xlb: { n: '小籠包', a: 'pork', b: 'flour', st: 'steam', cat: 'salty', p: 80, q: 7, t: 5, h: '十八摺，裡面是肉' },
  rouyuan: { n: '肉圓', a: 'pork', b: 'spflour', st: 'steam', cat: 'salty', p: 55, q: 5, t: 4, h: 'Q彈透明的皮包著肉' },
  beefnoodle: { n: '紅燒牛肉麵', a: 'beef', b: 'flour', st: 'soup', cat: 'salty', p: 150, q: 8, t: 5, h: '大塊的肉配手工麵條' },
  douhua: { n: '豆花', a: 'soybean', b: 'sugar', st: 'ice', cat: 'sweet', p: 45, q: 5, t: 2, h: '滑嫩嫩的，用豆子做' },
  pdouhua: { n: '珍珠豆花', a: 'douhua', b: 'pearl', st: 'ice', cat: 'sweet', p: 65, q: 7, t: 2, h: '豆花再加 Q Q 的料' },
  shavedice: { n: '黑糖剉冰', a: 'ice', b: 'sugar', st: 'ice', cat: 'sweet', p: 40, q: 3, t: 2, h: '冰上淋深色的糖' },
  snowice: { n: '牛奶雪花冰', a: 'ice', b: 'milk', st: 'ice', cat: 'sweet', p: 80, q: 6, t: 3, h: '綿綿的冰，奶香十足' },
  mangoice: { n: '芒果冰', a: 'mango', b: 'ice', st: 'ice', cat: 'sweet', p: 120, q: 8, t: 3, h: '夏天限定的黃色水果' },
  strawice: { n: '草莓雪花冰', a: 'snowice', b: 'strawberry', st: 'ice', cat: 'sweet', p: 160, q: 9, t: 3, h: '雪花冰配上冬天的紅色水果' },
  gcorn: { n: '烤玉米', a: 'corn', b: 'soy', st: 'grill', cat: 'salty', p: 60, q: 5, t: 4, h: '刷上鹹鹹的醬一直烤' },
  sausage: { n: '烤香腸', a: 'pork', b: 'sugar', st: 'grill', cat: 'salty', p: 45, q: 4, t: 3, h: '甜甜的豬肉腸，配蒜頭' },
  bigsausage: { n: '大腸包小腸', a: 'sausage', b: 'glutinous', st: 'grill', cat: 'salty', p: 90, q: 8, t: 5, h: '香腸夾在黏黏的米腸裡' },
  guabao: { n: '刈包', a: 'pork', b: 'peanut', st: 'steam', cat: 'salty', p: 65, q: 6, t: 4, h: '台式漢堡，撒上香香的粉' },
  peanutroll: { n: '花生捲冰淇淋', a: 'peanut', b: 'ice', st: 'ice', cat: 'sweet', p: 55, q: 6, t: 3, h: '刨花生糖＋冰，加香菜才道地' },
  papayamilk: { n: '木瓜牛奶', a: 'papaya', b: 'milk', st: 'drink', cat: 'drink', p: 65, q: 6, t: 2, h: '橘色水果打成的飲料' },
  luwei: { n: '滷味', a: 'tofu', b: 'soy', st: 'soup', cat: 'salty', p: 70, q: 5, t: 4, h: '夾好料讓老闆去滷' },
  mala: { n: '麻辣鴨血', a: 'duckblood', b: 'chili', st: 'soup', cat: 'spicy', p: 90, q: 7, t: 5, h: '紅通通的嫩豆腐…不是豆腐' },
  mianxian: { n: '蚵仔麵線', a: 'oyster', b: 'noodle', st: 'soup', cat: 'salty', p: 60, q: 6, t: 4, h: '細細的麵配海味' },
  taroball: { n: '芋圓', a: 'taro', b: 'spflour', st: 'ice', cat: 'sweet', p: 70, q: 7, t: 3, h: '紫色的 Q 彈圓圓' },
  pepperbun: { n: '胡椒餅', a: 'pork', b: 'pepper', st: 'grill', cat: 'spicy', p: 60, q: 6, t: 5, h: '貼在炭爐壁上烤，很嗆' },
  spicycutlet: { n: '香辣雞排', a: 'cutlet', b: 'chili', st: 'fryer', cat: 'spicy', p: 85, q: 7, t: 4, h: '大雞排撒上紅紅的粉' },
  gsquid: { n: '碳烤魷魚', a: 'squid', b: 'soy', st: 'grill', cat: 'salty', p: 120, q: 8, t: 4, h: '海裡的長腳，刷醬來烤' },
  squidball: { n: '炸花枝丸', a: 'squid', b: 'spflour', st: 'fryer', cat: 'salty', p: 80, q: 7, t: 4, h: '海鮮打成丸子去炸' },
  zongzi: { n: '南部粽', a: 'glutinous', b: 'pork', st: 'steam', cat: 'salty', p: 70, q: 7, t: 5, h: '端午節一定要吃的' },
  malatofu: { n: '麻辣臭豆腐', a: 'stinky', b: 'chili', st: 'soup', cat: 'spicy', p: 95, q: 8, t: 5, h: '臭豆腐換一種辣辣的煮法' },
  rice_ball: { n: '飯糰', a: 'rice', b: 'scallion', st: 'steam', cat: 'salty', p: 35, q: 3, t: 2, h: '捏一捏，撒點綠色的' },
  combo: { n: '雞排珍奶套餐', a: 'cutlet', b: 'bubble', st: 'fryer', cat: 'salty', p: 150, q: 10, t: 5, h: '夜市兩大天王合體！' },
  kingbowl: { n: '夜市王牛肉湯', a: 'beefnoodle', b: 'basil', st: 'soup', cat: 'salty', p: 220, q: 10, t: 5, h: '最強的麵再加一把香草' },
  wheelcake: { n: '紅豆車輪餅', a: 'flour', b: 'redbean', st: 'griddle', cat: 'sweet', p: 35, q: 5, t: 3, h: '圓圓的餅，裡面包著豆子餡' },
  scallionegg: { n: '蔥抓餅加蛋', a: 'pancake', b: 'egg', st: 'griddle', cat: 'salty', p: 55, q: 6, t: 3, h: '蔥抓餅再打一顆…' },
  lemontea: { n: '檸檬紅茶', a: 'blacktea', b: 'lemon', st: 'drink', cat: 'drink', p: 40, q: 4, t: 2, h: '紅茶加一片酸酸的黃色水果' },
  lemonaiyu: { n: '檸檬愛玉', a: 'aiyu', b: 'lemon', st: 'drink', cat: 'drink', p: 50, q: 6, t: 2, h: '透明 Q 彈的果凍配酸酸的' },
  hotgrass: { n: '燒仙草', a: 'grassjelly', b: 'sugar', st: 'soup', cat: 'sweet', p: 50, q: 5, t: 3, h: '冬天熱熱的黑色甜湯' },
  redbeanice: { n: '紅豆牛奶冰', a: 'snowice', b: 'redbean', st: 'ice', cat: 'sweet', p: 90, q: 7, t: 3, h: '雪花冰配上紅紅的豆子' },
  mushfry: { n: '鹽酥杏鮑菇', a: 'mushroom', b: 'basil', st: 'fryer', cat: 'salty', p: 55, q: 5, t: 3, h: '胖胖的菇炸好丟一把香葉' },
  bloodcake: { n: '米血糕', a: 'glutinous', b: 'duckblood', st: 'steam', cat: 'salty', p: 40, q: 5, t: 3, h: '黏黏的米加上深紅色的…' },
  candysp: { n: '蜜地瓜', a: 'sweetpotato', b: 'sugar', st: 'grill', cat: 'sweet', p: 40, q: 4, t: 3, h: '地瓜裹上糖慢慢烤' },
  shrimproll: { n: '炸蝦捲', a: 'shrimp', b: 'flour', st: 'fryer', cat: 'salty', p: 85, q: 7, t: 4, h: '海裡的小東西包起來炸' },
  shrimpomelet: { n: '蝦仁煎', a: 'shrimp', b: 'egg', st: 'griddle', cat: 'salty', p: 90, q: 7, t: 4, h: '跟蚵仔煎很像，換一種海鮮' },
  feast: { n: '夜市滿漢全席', a: 'kingbowl', b: 'combo', st: 'soup', cat: 'salty', p: 380, q: 12, t: 6, h: '把最強的湯和最強的套餐合在一起…' },
  tarobubble: { n: '芋頭珍奶', a: 'bubble', b: 'taro', st: 'drink', cat: 'drink', p: 85, q: 9, t: 3, h: '珍奶再加紫色的根莖' },
  // 季節限定：不用研發，到了那個月份、有那種攤位就會自動上架（lim = 月份、lv = 店舖等級）
  tanghulu: { n: '草莓糖葫蘆', a: 'strawberry', b: 'sugar', st: 'grill', cat: 'sweet', p: 60, q: 7, t: 3, lim: [1, 2, 3], lv: 2, h: '冬天限定，紅通通亮晶晶' },
  yuanxiao: { n: '芝麻湯圓', a: 'glutinous', b: 'sugar', st: 'soup', cat: 'sweet', p: 50, q: 7, t: 3, lim: [2], lv: 1, h: '元宵節一定要吃一碗' },
  sakuraice: { n: '櫻花雪花冰', a: 'ice', b: 'milk', st: 'ice', cat: 'sweet', p: 85, q: 8, t: 3, lim: [3, 4], lv: 1, h: '春天限定的粉紅色冰' },
  alkalizong: { n: '冰鹼粽', a: 'glutinous', b: 'sugar', st: 'steam', cat: 'sweet', p: 45, q: 6, t: 3, lim: [6], lv: 2, h: '端午節的甜粽子，沾蜂蜜' },
  watermelon: { n: '西瓜牛奶', a: 'milk', b: 'sugar', st: 'drink', cat: 'drink', p: 55, q: 7, t: 2, lim: [7, 8], lv: 0, h: '暑假限定，消暑第一名' },
  yolkpastry: { n: '蛋黃酥', a: 'egg', b: 'flour', st: 'griddle', cat: 'sweet', p: 65, q: 8, t: 4, lim: [9], lv: 1, h: '中秋節限定，一口就停不下來' },
  chestnut: { n: '糖炒栗子', a: 'sugar', b: 'peanut', st: 'grill', cat: 'sweet', p: 55, q: 7, t: 3, lim: [10, 11], lv: 2, h: '秋天限定，香香甜甜熱呼呼' },
  gingerduck: { n: '薑母鴨', a: 'duckblood', b: 'basil', st: 'soup', cat: 'salty', p: 170, q: 10, t: 5, lim: [12, 1], lv: 3, meat: 1, h: '冬天一定要來一鍋' },
  hotsoymilk: { n: '熱豆漿', a: 'soybean', b: 'sugar', st: 'drink', cat: 'drink', p: 30, q: 5, t: 2, lim: [12, 1, 2], lv: 0, h: '寒流來了喝一杯' },
};
// 研發、圖鑑、目標只算一般菜色（季節限定另外算）
const DISH_ALL = Object.keys(DISH).filter(k => !DISH[k].lim);
const DISH_LIM = Object.keys(DISH).filter(k => DISH[k].lim);
// 素食模式：用到這些食材（或用到這些食材做的菜）就不是素的
const MEAT = ['chicken', 'pork', 'beef', 'oyster', 'squid', 'shrimp', 'duckblood'];
function isVeg(k) { const d = DISH[k]; if (!d) return !MEAT.includes(k); if (d.meat) return false; return isVeg(d.a) && isVeg(d.b); }

// 顧客：b = 預算倍率、pat = 耐心、w = 出現權重、lv = 幾級店才會來
const CTYPES = {
  student: { qty: 1.2, n: '學生', b: 0.85, pref: ['sweet', 'drink', 'salty'], pat: 1, w: 30, lv: 0 },
  worker: { qty: 1.5, n: '上班族', b: 1.1, pref: ['salty', 'spicy', 'drink'], pat: 0.8, w: 28, lv: 0 },
  couple: { qty: 2, n: '情侶', b: 1.2, pref: ['sweet', 'drink', 'salty'], pat: 1, w: 14, lv: 0, decor: 1.6 },
  elder: { qty: 1.4, n: '阿公阿嬤', b: 0.9, pref: ['salty', 'sweet'], pat: 1.4, w: 12, lv: 0 },
  kid: { qty: 1, n: '小朋友', b: 0.7, pref: ['sweet', 'drink'], pat: 0.9, w: 10, lv: 1, fun: 1 },
  tourist: { qty: 2.2, n: '觀光客', b: 1.6, pref: ['salty', 'sweet', 'spicy', 'drink'], pat: 1.1, w: 8, lv: 2 },
  influencer: { qty: 1, n: '網紅', b: 1.3, pref: ['sweet', 'drink', 'spicy'], pat: 0.9, w: 1.6, lv: 2, vip: 8 },
  critic: { qty: 1, n: '美食評論家', b: 2, pref: ['salty', 'spicy', 'sweet'], pat: 1, w: 1.0, lv: 3, vip: 14 },
};

const NAMES1 = ['阿', '小'];
const NAMES2 = ['明', '美', '豪', '珍', '傑', '芬', '偉', '玲', '強', '萍', '輝', '琪', '宏', '慧', '志', '婷', '龍', '鳳', '福', '寶', '瑞', '華', '翔', '雯', '凱', '妮', '德', '青', '勇', '桃'];
const SURN = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '賴', '周'];
const TITLES = ['', '', '', '', '', '', '料理達人', '服務之星', '夜市老手', '傳說的'];

// 排行榜上的對手店家（分數會隨年份成長）
const RIVALS = [
  ['阿忠麵線', 30], ['大胖雞排', 45], ['甜心豆花', 60], ['林記蚵仔煎', 80], ['老王牛肉麵', 105], ['阿嬤的滷味', 130],
  ['芒果皇帝', 165], ['花媽臭豆腐', 210], ['好運香腸', 260], ['黑糖本舖', 320], ['小籠包研究所', 390], ['夜貓子炸物', 470],
  ['月亮蝦餅', 560], ['阿土伯烤玉米', 660], ['雪花冰工廠', 780], ['胡椒餅大王', 910], ['魷魚先生', 1060], ['鐵板燒阿龍', 1230],
  ['廟口肉圓', 1420], ['珍奶研究室', 1640], ['海港蚵仔麵線', 1880], ['大腸包小腸本店', 2150], ['夜市第一家', 2450],
  ['百年老店陳家', 2800], ['美食街霸主', 3200], ['米其林小吃', 3650], ['金字招牌', 4150], ['夜市傳奇', 4700],
];

// 目標（里程碑），達成會拿到獎勵
const GOALS = [
  { id: 'c10', n: '第一批客人', d: '累積招待 10 位客人', k: 'cust', v: 10, r: { money: 1000 } },
  { id: 'r1', n: '研發新手', d: '研發出 1 道新菜', k: 'dishes', v: 3, r: { idea: 10 } },
  { id: 'combo1', n: '擺設的學問', d: '發現第一個擺設組合', k: 'combos', v: 1, r: { money: 2000 } },
  { id: 'hire1', n: '找個幫手', d: '雇用第一位員工', k: 'staff', v: 2, r: { money: 1500 } },
  { id: 'c100', n: '小有名氣', d: '累積招待 100 位客人', k: 'cust', v: 100, r: { money: 3000, pop: 10 } },
  { id: 'lv1', n: '開店了！', d: '擴建成「巷口小吃店」', k: 'lv', v: 1, r: { idea: 20 } },
  { id: 'd6', n: '菜單豐富', d: '研發出 6 道菜', k: 'dishes', v: 6, r: { money: 5000 } },
  { id: 'sale1', n: '第一桶金', d: '累積營業額 10 萬', k: 'sales', v: 100000, r: { idea: 30 } },
  { id: 'c1000', n: '門庭若市', d: '累積招待 1000 位客人', k: 'cust', v: 1000, r: { money: 10000, pop: 30 } },
  { id: 'combo5', n: '佈置高手', d: '發現 5 個擺設組合', k: 'combos', v: 5, r: { money: 10000 } },
  { id: 'rank20', n: '擠進排行榜', d: '排行第 20 名以內', k: 'rank', v: 20, r: { money: 8000, idea: 20 } },
  { id: 'lv2', n: '排隊名店', d: '擴建成「排隊名店」', k: 'lv', v: 2, r: { idea: 40 } },
  { id: 'staff5', n: '團隊成形', d: '員工達到 5 人', k: 'staff', v: 5, r: { money: 15000 } },
  { id: 'd12', n: '美食百科', d: '研發出 12 道菜', k: 'dishes', v: 12, r: { idea: 50 } },
  { id: 'lvup', n: '老手上路', d: '有員工升到 10 級', k: 'slv', v: 10, r: { money: 20000 } },
  { id: 'sale2', n: '百萬營收', d: '累積營業額 100 萬', k: 'sales', v: 1e6, r: { idea: 60, pop: 50 } },
  { id: 'rank10', n: '前十名', d: '排行第 10 名以內', k: 'rank', v: 10, r: { money: 50000 } },
  { id: 'contest', n: '大賽冠軍', d: '在小吃大賽拿下冠軍', k: 'contest', v: 1, r: { idea: 80 } },
  { id: 'lv3', n: '美食廣場', d: '擴建成「美食廣場」', k: 'lv', v: 3, r: { money: 50000 } },
  { id: 'c10k', n: '萬人迷', d: '累積招待 10000 位客人', k: 'cust', v: 10000, r: { money: 80000, pop: 100 } },
  { id: 'combo12', n: '組合大師', d: '發現 12 個擺設組合', k: 'combos', v: 12, r: { idea: 100 } },
  { id: 'd20', n: '小吃博士', d: '研發出 20 道菜', k: 'dishes', v: 20, r: { money: 100000 } },
  { id: 'rank3', n: '頒獎台上', d: '排行第 3 名以內', k: 'rank', v: 3, r: { money: 150000 } },
  { id: 'lv4', n: '夜市大街', d: '擴建成「夜市大街」', k: 'lv', v: 4, r: { idea: 150 } },
  { id: 'sale3', n: '千萬富翁', d: '累積營業額 1000 萬', k: 'sales', v: 1e7, r: { pop: 300 } },
  { id: 'rank1', n: '夜市之王', d: '排行第 1 名', k: 'rank', v: 1, r: { money: 300000 } },
  { id: 'lv5', n: '傳說夜市', d: '擴建成「傳說夜市」', k: 'lv', v: 5, r: { idea: 300 } },
  { id: 'dall', n: '全菜單制霸', d: '研發出所有菜色', k: 'dishes', v: DISH_ALL.length, r: { money: 1e6 } },
  { id: 'comboall', n: '組合圖鑑完成', d: '發現所有擺設組合', k: 'combos', v: COMBOS.length, r: { money: 1e6 } },
  { id: 'y10', n: '十年有成', d: '經營滿 10 年', k: 'year', v: 11, r: { pop: 500 } },
];

// 節慶（月份）：mul = 客人倍率，boost = 某類菜更好賣
// q = 節慶限定挑戰（賣出幾份某類的菜），fx = 畫面特效
const FESTIVALS = {
  1: { n: '寒假', mul: 1.1, boost: { soup: 1.3 }, q: { st: 'soup', n: 40 } },
  2: { n: '春節・元宵', mul: 1.35, deco: 'lantern', fx: 'fireworks', q: { cat: 'sweet', n: 60 } },
  4: { n: '春季遊園', mul: 1.05, fx: 'petal', q: { cat: 'drink', n: 50 } },
  6: { n: '端午節', mul: 1.1, boost: { steam: 1.3 }, q: { st: 'steam', n: 40 } },
  7: { n: '暑假', mul: 1.25, boost: { ice: 1.4, drink: 1.3 }, tourist: 2, fx: 'firefly', q: { st: 'ice', n: 60 } },
  8: { n: '暑假', mul: 1.2, boost: { ice: 1.4, drink: 1.3 }, tourist: 2, fx: 'firefly' },
  9: { n: '中秋節', mul: 1.15, boost: { grill: 1.5 }, fx: 'moon', q: { st: 'grill', n: 50 } },
  10: { n: '小吃大賽月', mul: 1.1, fx: 'leaf' },
  12: { n: '聖誕跨年', mul: 1.3, fx: 'fireworks', q: { cat: 'salty', n: 80 } },
};

// 員工特質（應徵時隨機）
const TRAITS = {
  quick: { n: '快手', d: '料理速度 +20%', col: '#ff8a3d' },
  loud: { n: '大嗓門', d: '攬客效果 +50%', col: '#ff6fa8' },
  neat: { n: '愛乾淨', d: '清桌子速度 ×1.7', col: '#4fb3ff' },
  smile: { n: '笑容可掬', d: '招呼客人時耐心加更多', col: '#ffb020' },
  tough: { n: '鐵人', d: '體力 +40', col: '#7a8aa8' },
  learner: { n: '好學', d: '經驗值 +40%', col: '#35b862' },
  slow: { n: '慢郎中', d: '動作慢 15%，但薪水少 20%', col: '#a8987a' },
  genius: { n: '天才廚師', d: '做的菜更好吃', col: '#c840e0', rare: 1 },
  star: { n: '明星架勢', d: '每週人氣 +2，客人更容易被吸引', col: '#e8473b', rare: 1 },
};

// 分店（美食廣場以上才能開）：inc = 每週收入（每級），pop = 每週人氣（每級）
const BRANCHES = [
  { id: 'shilin', n: '士林夜市分店', cost: 450000, inc: 3600, pop: 3, lv: 3 },
  { id: 'raohe', n: '饒河街分店', cost: 900000, inc: 7200, pop: 5, lv: 3 },
  { id: 'fengjia', n: '逢甲夜市分店', cost: 1800000, inc: 14500, pop: 8, lv: 4 },
  { id: 'liuhe', n: '六合夜市分店', cost: 3600000, inc: 29000, pop: 12, lv: 4 },
  { id: 'luodong', n: '羅東夜市分店', cost: 7000000, inc: 56000, pop: 18, lv: 5 },
  { id: 'tokyo', n: '東京海外旗艦店', cost: 16000000, inc: 128000, pop: 30, lv: 5 },
];

const BRANCH_TXT = {
  shilin: '大牌樓下人擠人，學生和觀光客最多，是台北最熱鬧的夜市。',
  raohe: '從廟口一路排到街尾的燈籠，胡椒餅的香味飄滿整條街。',
  fengjia: '霓虹燈牌一塊接一塊，年輕人最愛來這裡挖新奇的小吃。',
  liuhe: '椰子樹和高樓夜景，南部的大路邊夜市，攤位又大又寬。',
  luodong: '就在公園旁邊，水池映著燈光，宜蘭的在地好味道。',
  tokyo: '紅白鐵塔下的屋台街，日本人排隊也要吃一口台灣味！',
};
// 可以自己舉辦的活動
const HOSTEV = [
  { id: 'tasting', n: '試吃大會', cost: 12000, lv: 0, w: 1, mul: 1.3, pop: 8, d: '免費試吃，路人都被香味吸過來' },
  { id: 'live', n: '街頭演唱會', cost: 60000, lv: 2, w: 1, mul: 1.5, pop: 40, d: '請樂團來表演，人潮一波一波' },
  { id: 'parade', n: '花車遊行', cost: 220000, lv: 3, w: 1, mul: 1.7, pop: 120, tour: 10, d: '花車開過整條夜市，還帶來觀光團' },
  { id: 'fireworks', n: '煙火晚會', cost: 650000, lv: 4, w: 1, mul: 1.9, pop: 300, fx: 'fireworks', d: '整晚的煙火秀，全台灣都看到了' },
  { id: 'gala', n: '夜市美食節', cost: 2200000, lv: 5, w: 2, mul: 2.2, pop: 800, vip: 1, d: '連續兩週的盛大美食節，評論家和網紅都會來' },
];

// 秘方研究（花靈感和錢，永久加成，最高 5 級）
const TECHS = [
  { id: 'fast', n: '快手料理', d: '料理速度 +8%', idea: 30, money: 8000 },
  { id: 'sauce', n: '獨門醬料', d: '客人滿意度 +2.5', idea: 40, money: 12000 },
  { id: 'line', n: '排隊動線', d: '排隊耐心 +12%', idea: 25, money: 6000 },
  { id: 'ad', n: '口碑行銷', d: '來客數 +6%', idea: 35, money: 15000 },
  { id: 'pack', n: '外帶包裝', d: '外帶客人滿意度 +3', idea: 20, money: 5000 },
  { id: 'clean', n: '清潔標準', d: '桌子變髒機率 -12%', idea: 20, money: 5000 },
  { id: 'school', n: '員工教育', d: '員工經驗值 +15%', idea: 30, money: 10000 },
  { id: 'meal', n: '豐盛員工餐', d: '員工體力 +10', idea: 25, money: 8000 },
];

// 遊戲模式
const SCENARIOS = [
  { id: 'std', n: '標準模式', d: '從小攤車開始，慢慢做到夜市之王。' },
  { id: 'sweet', n: '甜點專賣店', d: '只賣甜的和喝的！喜歡甜食的客人比較多。' },
  { id: 'rush', n: '限時挑戰', d: '5 年內登上排行榜第 1 名！對手比較強。', lock: 1 },
  { id: 'hard', n: '逆境開局', d: '本金只有 $5,000、租金兩倍、對手成長更快。', lock: 1 },
  { id: 'veg', n: '素食小館', d: '只賣不含肉和海鮮的菜！阿公阿嬤和上班族特別捧場。' },
  { id: 'tour', n: '觀光夜市', d: '觀光客是平常的三倍、出手大方，但租金貴五成、對手也很強。', lock: 1 },
];

// 傳承加成（跨存檔，用傳承點數購買）
const PERKS = [
  { id: 'money', n: '祖傳家底', d: '開局資金 +$5,000', max: 5, cost: 2 },
  { id: 'recipe', n: '祖傳秘方', d: '開局多會一道菜', max: 4, cost: 3 },
  { id: 'fans', n: '老主顧', d: '開局人氣 +30', max: 5, cost: 2 },
  { id: 'idea', n: '靈感筆記', d: '開局靈感 +20', max: 5, cost: 1 },
  { id: 'chef', n: '老師傅', d: '開局員工能力 +3', max: 3, cost: 3 },
];

// 成就（跨存檔記錄），pt = 傳承點數
const ACHS = [
  { id: 'first', n: '開張大吉', d: '招待第一位客人', pt: 1 },
  { id: 'c1k', n: '千客萬來', d: '累積招待 1,000 位客人', pt: 1 },
  { id: 'c50k', n: '人山人海', d: '累積招待 50,000 位客人', pt: 3 },
  { id: 'full', n: '高朋滿座', d: '8 個以上的座位同時坐滿', pt: 1 },
  { id: 'five', n: '五星好評', d: '收到 30 則五星評論', pt: 2 },
  { id: 'combo10', n: '擺設達人', d: '發現 10 個擺設組合', pt: 2 },
  { id: 'comboall', n: '組合大全', d: '發現所有擺設組合', pt: 4 },
  { id: 'd30', n: '小吃百科', d: '研發 30 道菜', pt: 2 },
  { id: 'dall', n: '滿漢全席', d: '研發出所有菜色', pt: 5 },
  { id: 'king', n: '夜市之王', d: '登上排行榜第 1 名', pt: 4 },
  { id: 'cup3', n: '三屆冠軍', d: '小吃大賽拿下 3 次冠軍', pt: 3 },
  { id: 'branch', n: '第一家分店', d: '開設第一家分店', pt: 2 },
  { id: 'branchall', n: '連鎖王國', d: '開齊所有分店', pt: 5 },
  { id: 'tech', n: '秘方大師', d: '任一項秘方研究到 5 級', pt: 2 },
  { id: 'host', n: '活動企劃', d: '自己舉辦一次活動', pt: 1 },
  { id: 'fire', n: '滿天煙火', d: '舉辦煙火晚會', pt: 2 },
  { id: 'quest10', n: '有求必應', d: '完成 10 個客人委託', pt: 3 },
  { id: 'staff16', n: '大家庭', d: '員工達到 16 人', pt: 2 },
  { id: 'rich', n: '億萬富翁', d: '手上現金超過 1 億', pt: 4 },
  { id: 'critic', n: '美食家認證', d: '評論家給了五星', pt: 2 },
  { id: 'storm', n: '風雨無阻', d: '颱風天也賣出 20 份', pt: 1 },
  { id: 'legend', n: '傳說夜市', d: '擴建到最大的店', pt: 3 },
  { id: 'gen2', n: '二代目', d: '把店傳承給下一代', pt: 2 },
  { id: 'rush', n: '限時達成', d: '限時挑戰：5 年內拿下第 1 名', pt: 6 },
  { id: 'sweet', n: '甜蜜帝國', d: '甜點專賣店擴建到「美食廣場」', pt: 4 },
  { id: 'hard', n: '逆境翻身', d: '逆境開局擠進前 10 名', pt: 5 },
  { id: 'veg', n: '蔬食名店', d: '素食小館擴建到「排隊名店」', pt: 3 },
  { id: 'tour', n: '國際觀光地標', d: '觀光夜市擠進前 3 名', pt: 5 },
  { id: 'duel3', n: '挑戰者殺手', d: '贏得 3 次對手的挑戰書', pt: 2 },
  { id: 'season', n: '四季饕客', d: '賣過 5 種季節限定菜色', pt: 2 },
  { id: 'story', n: '十年一夢', d: '完成 5 個年度目標', pt: 3 },
];

// 委託人的名字
const ASKERS = ['隔壁的王太太', '補習班的小美', '計程車司機老陳', '里長伯', '路過的背包客', '樓上的大學生', '廟公阿伯', '花店老闆娘', '健身房教練', '附近的小學老師', '加班的工程師', '賣口香糖的阿嬤'];

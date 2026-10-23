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
  { id: 'booth', n: '雅座包廂', cat: 'seat', seats: 4, price: 12000, ap: 8, lv: 4, d: '高級的軟沙發座位' },

  { id: 'plant', n: '盆栽', cat: 'decor', price: 300, ap: 2, lv: 0, d: '綠油油的看了心情好' },
  { id: 'lantern', n: '紅燈籠', cat: 'decor', price: 500, ap: 3, lv: 0, d: '晚上亮起來好有氣氛' },
  { id: 'trash', n: '垃圾桶', cat: 'decor', price: 300, ap: 0, lv: 0, fx: 'clean', d: '附近的桌子比較不會亂' },
  { id: 'fan', n: '電風扇', cat: 'decor', price: 700, ap: 1, lv: 0, d: '夏天的救星' },
  { id: 'flower', n: '花台', cat: 'decor', price: 1200, ap: 3, lv: 1, d: '種滿了繡球花' },
  { id: 'sink', n: '洗手台', cat: 'decor', price: 1500, ap: 1, lv: 1, fx: 'clean', d: '衛生好，客人安心' },
  { id: 'tv', n: '電視機', cat: 'decor', price: 2800, ap: 3, lv: 1, d: '一邊吃一邊看節目' },
  { id: 'neon', n: '霓虹招牌', cat: 'decor', price: 5000, ap: 6, lv: 2, d: '一閃一閃，老遠就看得到' },
  { id: 'shrine', n: '土地公小廟', cat: 'decor', price: 8000, ap: 6, lv: 2, d: '保佑生意興隆' },
  { id: 'cat', n: '招財貓', cat: 'decor', price: 6000, ap: 5, lv: 3, fx: 'money', d: '揮揮手，錢就進來（每週小收入）' },
  { id: 'mascot', n: '吉祥物看板', cat: 'decor', price: 10000, ap: 8, lv: 3, d: '可愛的雞排君看板' },
  { id: 'fountain', n: '噴水池', cat: 'decor', price: 20000, ap: 12, lv: 4, d: '夜市中間的地標' },
  { id: 'stage', n: '表演舞台', cat: 'decor', price: 30000, ap: 15, lv: 5, d: '週末有街頭藝人表演' },
  { id: 'tB', n: '銅獎盃', cat: 'decor', price: 0, ap: 5, lv: 0, unlock: 'tB', d: '小吃大賽的榮耀' },
  { id: 'tS', n: '銀獎盃', cat: 'decor', price: 0, ap: 8, lv: 0, unlock: 'tS', d: '年度大賞的榮耀' },
  { id: 'tG', n: '金獎盃', cat: 'decor', price: 0, ap: 14, lv: 0, unlock: 'tG', d: '夜市之王的證明' },

  { id: 'pinball', n: '彈珠台', cat: 'fun', price: 3000, ap: 4, lv: 1, inc: 30, d: '叮叮噹噹（每週小收入）' },
  { id: 'gacha', n: '扭蛋機', cat: 'fun', price: 2500, ap: 3, lv: 1, inc: 25, d: '小朋友最愛（每週小收入）' },
  { id: 'goldfish', n: '撈金魚', cat: 'fun', price: 4000, ap: 5, lv: 1, inc: 40, d: '紙網一下就破了' },
  { id: 'ring', n: '套圈圈', cat: 'fun', price: 5000, ap: 5, lv: 2, inc: 50, d: '套中大獎超開心' },
  { id: 'claw', n: '夾娃娃機', cat: 'fun', price: 6000, ap: 5, lv: 2, inc: 60, d: '保夾 999 元' },
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
  tarobubble: { n: '芋頭珍奶', a: 'bubble', b: 'taro', st: 'drink', cat: 'drink', p: 85, q: 9, t: 3, h: '珍奶再加紫色的根莖' },
};

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
  { id: 'dall', n: '全菜單制霸', d: '研發出所有菜色', k: 'dishes', v: Object.keys(DISH).length, r: { money: 1e6 } },
  { id: 'comboall', n: '組合圖鑑完成', d: '發現所有擺設組合', k: 'combos', v: COMBOS.length, r: { money: 1e6 } },
  { id: 'y10', n: '十年有成', d: '經營滿 10 年', k: 'year', v: 11, r: { pop: 500 } },
];

// 節慶（月份）：mul = 客人倍率，boost = 某類菜更好賣
const FESTIVALS = {
  1: { n: '寒假', mul: 1.1, boost: { soup: 1.3 } },
  2: { n: '春節・元宵', mul: 1.35, deco: 'lantern' },
  4: { n: '春季遊園', mul: 1.05 },
  6: { n: '端午節', mul: 1.1, boost: { steam: 1.3 } },
  7: { n: '暑假', mul: 1.25, boost: { ice: 1.4, drink: 1.3 }, tourist: 2 },
  8: { n: '暑假', mul: 1.2, boost: { ice: 1.4, drink: 1.3 }, tourist: 2 },
  9: { n: '中秋節', mul: 1.15, boost: { grill: 1.5 } },
  10: { n: '小吃大賽月', mul: 1.1 },
  12: { n: '聖誕跨年', mul: 1.3 },
};

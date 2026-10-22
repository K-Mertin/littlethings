// MW 大街：遊戲清單（自己維護一份，不去改舊大廳的 index.html）
// - 單一遊戲 = 街上的一間店（STREET，依照從街口到大廳的順序）
// - 合集 = 在 MW 遊戲大廳大樓裡：噗噗的遊戲小屋每款小遊戲一台機台（assets/minigames.json，tools/build_minigames.py 產生），大家一起玩在派對區
export const ZONES = {
  street: { name: '大街', en: 'STREET', color: '#ffd23f' },
  react: { name: '反應區', en: 'REACT', color: '#ff5a6e' },
  puzzle: { name: '益智區', en: 'PUZZLE', color: '#5fb2ff' },
  play: { name: '扮家家酒區', en: 'PLAY', color: '#ffb14a' },
  party: { name: '派對區', en: 'PARTY', color: '#c77dff' },
};

// shop: 招牌顏色 bg/fg、遮陽棚兩色、店內牆色
export const STREET = [
  { id: 'abc', path: 'abc/index.html', title: 'ABC Island', genre: '英文', en: 'ENGLISH',
    desc: '小狐狸 Pip 用語音帶著玩：描字母、找開頭音、拼單字，還能用英文聊天。', tags: ['描字', '拼字', '對話'],
    shop: { bg: '#ffcf4a', fg: '#3b2a00', awn: ['#ff8a3d', '#fff4cf'], wall: '#fff2c9' } },
  { id: 'zhuyin', path: 'zhuyin/index.html', title: 'ㄅㄆㄇ 小島', genre: '注音', en: 'ZHUYIN',
    desc: '台灣藍鵲小藍帶著玩：認識 37 個注音、拼音和一二三四聲。', tags: ['認注音', '拼音', '四聲'],
    shop: { bg: '#2f7fd8', fg: '#ffffff', awn: ['#2f7fd8', '#e8f3ff'], wall: '#e6f1ff' } },
  { id: 'math', path: 'math/index.html', title: '123 小島', genre: '數學', en: 'NUMBERS',
    desc: '台灣黑熊小黑帶著玩：數數、認數字、比多少、數字小火車排順序。', tags: ['數與量', '語音引導'],
    shop: { bg: '#3fa64a', fg: '#ffffff', awn: ['#3fa64a', '#f0fbe8'], wall: '#eaf7e2' } },
  { id: 'face', path: 'face/index.html', title: '捏臉工坊', genre: '角色創作', en: 'FACE STUDIO',
    desc: '自己捏一個角色：臉型、五官、髮型和衣服，存成收藏或下載成圖片。', tags: ['即時預覽', '隨機捏臉', '下載 PNG'],
    shop: { bg: '#f7e1d0', fg: '#b4532a', awn: ['#ff9f5a', '#fff3ea'], wall: '#fbe9dc' } },
  { id: 'brawl', path: 'brawl/index.html', title: '小夥伴大作戰', genre: '橫向格鬥', en: 'BRAWL',
    desc: '在台灣老街、夜市、茶園和漁港打跑搗蛋的動物怪獸，1–4 人一起玩。', tags: ['闖關＋對戰', '7 位角色', '手機當手把'],
    shop: { bg: '#e8461e', fg: '#fff3c4', awn: ['#e8461e', '#fff3c4'], wall: '#fbe3c8' } },
  { id: 'racing', path: 'racing/index.html', title: 'Sunny Circuit', genre: '賽車', en: 'RACING',
    desc: '3D 賽車：六條賽道、大獎賽、計時賽幽靈車，贏獎金買車改裝。', tags: ['6 條賽道', '大獎賽', '手機當方向盤'],
    shop: { bg: '#111111', fg: '#ffd23f', awn: ['#111111', '#ffd23f'], wall: '#dcdcdc' } },
  { id: 'cobblekeep', path: 'cobblekeep/index.html', title: 'Cobble Keep', genre: '第一人稱射擊', en: 'DUNGEON',
    desc: 'DOOM 手感的 3D 射擊：揮符文劍、用魔杖和連弩，打倒佔領城堡的怪物。', tags: ['10 關', '5 個 Boss', '鍵盤＋滑鼠'],
    shop: { bg: '#3a2a20', fg: '#f2c46b', awn: ['#5a1f1a', '#d9b26a'], wall: '#4a3a30' } },
  { id: 'zijia', path: 'zijia/index.html', title: '銘甲戰記', genre: '機器人戰棋', en: 'MECH TACTICS',
    desc: '像素風的機器人戰棋，有必殺技演出：15 章、三條路線、五種結局。', tags: ['15 章', '5 種結局', '自動存檔'],
    shop: { bg: '#1c2b6b', fg: '#7fe0ff', awn: ['#1c2b6b', '#c8d4ff'], wall: '#cfd8f2' } },
  { id: 'sky', path: 'sky/index.html', title: '雲霄戰機', genre: '飛行射擊', en: 'SKY SHOOTER',
    desc: '雷電風格的縱向射擊：飛過河谷、大海、城市、沙漠和雲端，打倒五個大頭目。', tags: ['5 關', '換武器升級', '手機拖曳'],
    shop: { bg: '#0d2a4a', fg: '#ffb347', awn: ['#0d2a4a', '#ffd9a0'], wall: '#d6e4f2' } },
  { id: 'outpost', path: 'outpost/index.html', title: 'Crystal Outpost', genre: '即時戰略', en: 'STRATEGY',
    desc: '星海爭霸風格的即時戰略：三個陣營、六關任務，還能和朋友線上對戰。', tags: ['3 個陣營', '1v1 · 2v2', '線上對戰'],
    shop: { bg: '#0f4c5c', fg: '#7ff5e8', awn: ['#0f4c5c', '#d4fbf6'], wall: '#d8f1ef' } },
];

export const PARTY = { id: 'party', path: 'party/index.html', title: '大家一起玩', genre: '派對遊戲',
  desc: '一台大螢幕，每個人拿自己的手機當手把：8 款比賽和合作的派對遊戲。', tags: ['1–6 人', '手機當手把', '比賽＋合作'] };

export const MINI_CAT = { react: 'react', puzzle: 'puzzle', play: 'play' };

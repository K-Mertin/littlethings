// MW 大街：大樓裡的遊戲機台清單（自己維護一份，不去改舊大廳的 index.html）
// zone: 機台擺在哪一區；kind: upright 直立機台 / racer 賽車座椅機台 / party 派對大螢幕
export const ZONES = {
  learn: { name: '學習區', en: 'LEARN', color: '#5ee0a0' },
  action: { name: '動作區', en: 'ACTION', color: '#ff5a6e' },
  strategy: { name: '策略區', en: 'STRATEGY', color: '#6fb6ff' },
  create: { name: '創作區', en: 'CREATE', color: '#ffb14a' },
  party: { name: '派對區', en: 'PARTY', color: '#c77dff' },
};

export const GAMES = [
  { id: 'minigames', path: 'minigames/index.html', title: '噗噗的遊戲小屋', genre: '小遊戲合輯', zone: 'learn', kind: 'upright', color: '#f7a8c9',
    desc: '30 款小遊戲：反應、益智、扮家家酒和畫畫，每款都記錄最高分。', tags: ['30 款小遊戲', '兩人對打', '觸控'] },
  { id: 'abc', path: 'abc/index.html', title: 'ABC Island', genre: '英文', zone: 'learn', kind: 'upright', color: '#ffcf4a',
    desc: '小狐狸 Pip 用語音帶著玩：描字母、找開頭音、拼單字，還能用英文聊天。', tags: ['描字', '拼字', '對話'] },
  { id: 'zhuyin', path: 'zhuyin/index.html', title: 'ㄅㄆㄇ 小島', genre: '注音', zone: 'learn', kind: 'upright', color: '#4aa8ff',
    desc: '台灣藍鵲小藍帶著玩：認識 37 個注音、拼音和一二三四聲。', tags: ['認注音', '拼音', '四聲'] },
  { id: 'math', path: 'math/index.html', title: '123 小島', genre: '數學', zone: 'learn', kind: 'upright', color: '#7bd66b',
    desc: '台灣黑熊小黑帶著玩：數數、認數字、比多少、數字小火車排順序。', tags: ['數與量', '語音引導'] },
  { id: 'face', path: 'face/index.html', title: '捏臉工坊', genre: '角色創作', zone: 'create', kind: 'upright', color: '#ff9f5a',
    desc: '自己捏一個角色：臉型、五官、髮型和衣服，存成收藏或下載成圖片。', tags: ['即時預覽', '隨機捏臉', '下載 PNG'] },
  { id: 'cobblekeep', path: 'cobblekeep/index.html', title: 'Cobble Keep', genre: '第一人稱射擊', zone: 'action', kind: 'upright', color: '#c0392b',
    desc: 'DOOM 手感的 3D 射擊：揮符文劍、用魔杖和連弩，打倒佔領城堡的怪物。', tags: ['10 關', '5 個 Boss', '鍵盤＋滑鼠'] },
  { id: 'brawl', path: 'brawl/index.html', title: '小夥伴大作戰', genre: '橫向格鬥', zone: 'action', kind: 'upright', color: '#ff7a2f',
    desc: '在台灣老街、夜市、茶園和漁港打跑搗蛋的動物怪獸，1–4 人一起玩。', tags: ['闖關＋對戰', '7 位角色', '手機當手把'] },
  { id: 'racing', path: 'racing/index.html', title: 'Sunny Circuit', genre: '賽車', zone: 'action', kind: 'racer', color: '#ffd23f',
    desc: '3D 賽車：六條賽道、大獎賽、計時賽幽靈車，贏獎金買車改裝。', tags: ['6 條賽道', '大獎賽', '手機當方向盤'] },
  { id: 'zijia', path: 'zijia/index.html', title: '銘甲戰記', genre: '機器人戰棋', zone: 'strategy', kind: 'upright', color: '#3a6df0',
    desc: '像素風的機器人戰棋，有必殺技演出：15 章、三條路線、五種結局。', tags: ['15 章', '5 種結局', '自動存檔'] },
  { id: 'outpost', path: 'outpost/index.html', title: 'Crystal Outpost', genre: '即時戰略', zone: 'strategy', kind: 'upright', color: '#29c4c4',
    desc: '星海爭霸風格的即時戰略：三個陣營、六關任務，還能和朋友線上對戰。', tags: ['3 個陣營', '1v1 · 2v2', '線上對戰'] },
  { id: 'party', path: 'party/index.html', title: '大家一起玩', genre: '派對遊戲', zone: 'party', kind: 'party', color: '#c77dff',
    desc: '一台大螢幕，每個人拿自己的手機當手把：8 款比賽和合作的派對遊戲。', tags: ['1–6 人', '手機當手把', '比賽＋合作'] },
];

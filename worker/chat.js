// 大廳小幫手：聊天機器人
//   POST /api/chat   { messages:[{role,content}] }        → { reply, games:[{slug,name,url}], draft }
//   POST /api/issue  { draft }  (draft 來自 /api/chat，帶簽章) → { ok, number }
// Secrets（Cloudflare → Worker → Settings → Variables and secrets）：
//   ANTHROPIC_API_KEY  Claude API 金鑰
//   GITHUB_TOKEN       fine-grained token，只給 K-Mertin/littlethings 的 Issues: Read and write
//   CLAUDE_MODEL       （一般變數，可不設）要用的模型，預設 claude-haiku-5-5
// 只有本機測試會設：ANTHROPIC_API_URL / GITHUB_API_URL（指到假伺服器）

const DEFAULT_MODEL = 'claude-haiku-5-5';   // Cloudflare 變數 CLAUDE_MODEL 可以覆蓋，例如 claude-sonnet-5-5
const REPO = 'K-Mertin/littlethings';
const LIMITS = { perIpHour: 30, perIpIssuesDay: 5, perDay: 1500, maxMsgs: 16, maxChars: 600 };
const KINDS = { bug: '問題回報', idea: '新點子', question: '疑問' };

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/* ---------- 遊戲清單：直接從大廳 index.html 讀，大廳改了這裡就跟著變 ---------- */
let catalog = null;
async function getCatalog(env, request) {
  if (catalog) return catalog;
  const res = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  const html = await res.text();
  const list = [];
  for (const m of html.matchAll(/<a class="game[^"]*" href="([^"\/]+)\/index\.html">([\s\S]*?)<\/a>/g)) {
    const body = m[2], strip = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    list.push({
      slug: m[1],
      name: strip((body.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1]),
      genre: strip((body.match(/class="genre">([\s\S]*?)<\/span>/) || [])[1]),
      about: strip((body.match(/<p>([\s\S]*?)<\/p>/) || [])[1]).slice(0, 220),
    });
  }
  catalog = list;
  return list;
}

function systemPrompt(games) {
  return `你是 MW Game Hall（一個免費的瀏覽器小遊戲網站）大廳裡的聊天小幫手。來聊天的常常是小朋友，也有家長。
不要自我介紹，也不要替自己取名字；直接回答對方的問題。被問到「你是誰」時，只要說你是大廳的小幫手。

說話方式：
- 一律用繁體中文（台灣用語）。如果對方用英文，就用簡單英文回答。
- 親切、簡短，一次 1～3 句話。用小朋友聽得懂的字，不要用 markdown 標題或表格，可以偶爾用一個 emoji。
- 只聊跟這個網站、這些遊戲有關的事。其他話題簡單友善地帶回來。
- 不要問、也不要記錄任何個人資料（真實姓名、學校、地址、電話、照片等）。如果對方說了，提醒他不用告訴你。
- 不知道的事就說不知道，不要編造遊戲裡沒有的功能。

你可以做三件事：
1. 回答遊戲怎麼玩、推薦適合的遊戲。對方想玩或你推薦某款時，呼叫 open_game，畫面會出現「去玩」按鈕（不用自己寫網址）。
2. 收到 bug、問題或疑問：先問清楚是哪一款遊戲、做了什麼、發生了什麼（用什麼裝置更好）。資料夠了就呼叫 draft_issue 整理成回報草稿，對方按「送出」才會真的送出。
3. 收到新遊戲或新功能點子：問一兩句讓點子更清楚，然後一樣呼叫 draft_issue（kind = idea）。
不要說「GitHub」或「issue」，就說「回報」或「送給製作團隊」。送出後團隊會評估，不保證一定會做。

網站上的遊戲（slug：名稱｜類型｜介紹）：
${games.map(g => `- ${g.slug}：${g.name}｜${g.genre}｜${g.about}`).join('\n')}`;
}

function tools(games) {
  return [
    {
      name: 'open_game',
      description: '在聊天視窗顯示「去玩」按鈕，讓使用者一點就進入這款遊戲。',
      input_schema: { type: 'object', properties: { slug: { type: 'string', enum: games.map(g => g.slug) } }, required: ['slug'] },
    },
    {
      name: 'draft_issue',
      description: '把使用者的問題回報、疑問或新點子整理成草稿，顯示給使用者確認。使用者按「送出」後才會真的送給製作團隊。',
      input_schema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: Object.keys(KINDS), description: 'bug = 遊戲壞掉或怪怪的；question = 疑問；idea = 新遊戲或新功能點子' },
          game: { type: 'string', enum: [...games.map(g => g.slug), 'site', 'new'], description: '相關遊戲 slug；整個網站用 site；全新遊戲點子用 new' },
          title: { type: 'string', description: '一句話標題，繁體中文，30 字內' },
          body: { type: 'string', description: '給製作團隊看的整理：發生什麼、怎麼重現、用什麼裝置；點子就寫內容與玩法。繁體中文，不含個人資料。' },
        },
        required: ['kind', 'game', 'title', 'body'],
      },
    },
  ];
}

/* ---------- 簽章：草稿由伺服器簽名，/api/issue 只收真的由小幫手產生的草稿 ---------- */
async function hmac(env, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('mw-helper:' + env.GITHUB_TOKEN),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const draftText = d => JSON.stringify([d.kind, d.game, d.title, d.body, d.ts]);

/* ---------- 次數限制：一個 Durable Object 記每個 IP 每小時與全站每天的次數 ---------- */
export class ChatGuard {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const { key, limit, ttl } = await request.json();
    const now = Date.now();
    const rec = (await this.ctx.storage.get(key)) || { n: 0, exp: now + ttl };
    if (rec.exp < now) { rec.n = 0; rec.exp = now + ttl; }
    if (rec.n >= limit) return json({ ok: false });
    rec.n++;
    await this.ctx.storage.put(key, rec);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 6 * 3600e3);
    return json({ ok: true });
  }
  async alarm() {   // 清掉過期的計數
    const now = Date.now(), all = await this.ctx.storage.list();
    for (const [k, v] of all) if (v.exp < now) await this.ctx.storage.delete(k);
    if (all.size) await this.ctx.storage.setAlarm(now + 6 * 3600e3);
  }
}
async function allow(env, key, limit, ttl) {
  const stub = env.CHAT_GUARD.get(env.CHAT_GUARD.idFromName('global'));
  const r = await stub.fetch('https://guard/', { method: 'POST', body: JSON.stringify({ key, limit, ttl }) });
  return (await r.json()).ok;
}
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- /api/chat ---------- */
async function chat(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: '小幫手還在準備中，晚點再來找我喔！' }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const msgs = (Array.isArray(input.messages) ? input.messages : []).slice(-LIMITS.maxMsgs)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, LIMITS.maxChars) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'empty' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (!await allow(env, 'ip:' + ip, LIMITS.perIpHour, 3600e3)) return json({ reply: '我們聊好多了！休息一下，等一下再來找我喔 😊', games: [] });
  if (!await allow(env, 'day:' + today(), LIMITS.perDay, 86400e3)) return json({ reply: '小幫手今天累了，明天再來找我玩喔！', games: [] });

  const games = await getCatalog(env, request);
  const out = { reply: '', games: [], draft: null };
  const convo = [...msgs];
  for (let step = 0; step < 3; step++) {
    const res = await fetch(env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: (env.CLAUDE_MODEL || DEFAULT_MODEL).trim(), max_tokens: 600, system: systemPrompt(games), tools: tools(games), messages: convo }),
    });
    if (!res.ok) {
      console.log('claude error', res.status, (await res.text()).slice(0, 300));
      return json({ error: '小幫手現在有點忙，等一下再試試看！' }, 502);
    }
    const data = await res.json();
    const text = data.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
    if (text) out.reply += (out.reply ? '\n' : '') + text;
    const uses = data.content.filter(c => c.type === 'tool_use');
    if (data.stop_reason !== 'tool_use' || !uses.length) break;
    const results = [];
    for (const u of uses) {
      let result = 'ok';
      if (u.name === 'open_game') {
        const g = games.find(x => x.slug === u.input.slug);
        if (g && !out.games.some(x => x.slug === g.slug)) out.games.push({ slug: g.slug, name: g.name, url: `/${g.slug}/` });
        result = g ? `已顯示「去玩 ${g.name}」按鈕。` : '沒有這款遊戲。';
      } else if (u.name === 'draft_issue') {
        const d = u.input || {};
        if (KINDS[d.kind] && d.title && d.body) {
          const draft = { kind: d.kind, game: String(d.game || 'site'), title: String(d.title).slice(0, 80), body: String(d.body).slice(0, 2000), ts: Date.now() };
          draft.sig = await hmac(env, draftText(draft));
          out.draft = draft;
          result = '草稿已顯示給使用者，等他按「送出」。請用一句話請他看一下草稿，沒問題就按送出。';
        } else result = '草稿資料不完整，請再問清楚。';
      }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: result });
    }
    convo.push({ role: 'assistant', content: data.content }, { role: 'user', content: results });
  }
  if (!out.reply) out.reply = out.draft ? '我幫你整理好了，看一下對不對，沒問題就按「送出」！' : out.games.length ? '點下面的按鈕就可以去玩囉！' : '嗯…可以再說一次嗎？';
  return json(out);
}

/* ---------- /api/issue ---------- */
async function issue(request, env) {
  if (!env.GITHUB_TOKEN) return json({ error: '回報功能還在準備中。' }, 503);
  let d;
  try { d = (await request.json()).draft; } catch { return json({ error: 'bad json' }, 400); }
  if (!d || !KINDS[d.kind] || !d.sig || typeof d.ts !== 'number' || Date.now() - d.ts > 3600e3) return json({ error: '這份回報過期了，請再跟小幫手說一次。' }, 400);
  if (d.sig !== await hmac(env, draftText(d))) return json({ error: '回報內容對不上，請再跟小幫手說一次。' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (!await allow(env, 'sent:' + d.sig, 1, 86400e3)) return json({ error: '這份已經送出過囉！' }, 409);
  if (!await allow(env, 'issue:' + ip, LIMITS.perIpIssuesDay, 86400e3)) return json({ error: '今天已經送很多份了，謝謝你！明天再來。' }, 429);

  const ua = (request.headers.get('user-agent') || '').slice(0, 160);
  const body = `${d.body}\n\n---\n- 類型：${KINDS[d.kind]}\n- 遊戲：\`${d.game}\`\n- 裝置：${ua || '（未知）'}\n- 來源：大廳小幫手聊天，使用者確認後送出`;
  const labels = ['from-chatbot', d.kind];
  if (d.game && !['site', 'new'].includes(d.game)) labels.push('game:' + d.game);
  const res = await fetch(`${env.GITHUB_API_URL || 'https://api.github.com'}/repos/${REPO}/issues`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
      'user-agent': 'mw-helper', 'content-type': 'application/json' },
    body: JSON.stringify({ title: `[${KINDS[d.kind]}] ${d.title}`, body, labels }),
  });
  if (!res.ok) {
    console.log('github error', res.status, (await res.text()).slice(0, 300));
    return json({ error: '送出失敗了，等一下再試試看。' }, 502);
  }
  const gi = await res.json();
  return json({ ok: true, number: gi.number });
}

export async function handleChat(request, env, path) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (path === '/api/chat') return chat(request, env);
  if (path === '/api/issue') return issue(request, env);
  return new Response('Not found', { status: 404 });
}

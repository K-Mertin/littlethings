// 學習遊戲的 AI 家教提示：POST /api/tutor
//   { game:'math', lesson:'🍎 數到 5', question:'這裡有幾個蘋果？', right:'5', picked:'4' } → { line:'…' }
// 正確答案由遊戲自己算好傳進來，Claude 只負責「用孩子聽得懂的話說錯在哪」，不自己算答案。
// 模型：Cloudflare 變數 TUTOR_MODEL（沒設就用 CLAUDE_MODEL，再沒設就 Haiku 5.5）。
// 額度：每 IP 每小時 300 句、全站每天 4,000 句（Haiku 一句約 0.0002 美元）。

const LIMITS = { perIpHour: 300, perDay: 4000 };
const GAMES = {
  math: {
    who: '「123 小島」數學遊戲裡的小黑熊「小黑」',
    kid: '5 歲左右、剛開始學數數和 10 以內加減的小朋友',
  },
};
const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function system(g) {
  return `你是${g.who}，正在陪${g.kid}練習。孩子剛剛答錯了一題，遊戲已經自動示範過正確做法，正確答案也已經在畫面上發亮。
請你補一句「針對這次錯誤」的溫柔提示，幫孩子知道下次怎麼避免：
- 只回一句話，繁體中文（台灣口語），最多 25 個字，不要標點以外的符號、不要 emoji、不要引號。
- 依孩子選的答案猜他可能錯在哪：例如少數或多數了一個、跳過了一個、把加看成減、只數了一邊、把順序弄反。說得具體，但不要責備。
- 只能提到題目裡出現的數字、孩子選的答案和正確答案，不要算新的數字，也不要出新題目。
- 不要說「答錯了」「不對」，用鼓勵的語氣，例如「下次可以…」「我們一起…」。
- 最後不要問問題。只輸出那一句話。`;
}

export async function handleTutor(request, env, allow) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not configured' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const g = GAMES[b.game];
  if (!g) return json({ error: 'unknown game' }, 400);
  const lesson = cut(b.lesson, 40), question = cut(b.question, 200), right = cut(b.right, 30), picked = cut(b.picked, 30);
  if (!question || !right || !picked || right === picked) return json({ error: 'missing fields' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (!await allow('tutor:' + ip, LIMITS.perIpHour, 3600e3)) return json({ error: 'slow down' }, 429);
  if (!await allow('tutorday:' + new Date().toISOString().slice(0, 10), LIMITS.perDay, 86400e3)) return json({ error: 'daily budget' }, 429);

  const res = await fetch(env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: (env.TUTOR_MODEL || env.CLAUDE_MODEL || 'claude-haiku-5-5').trim(), max_tokens: 1024,   // 模型可能先思考，留足空間；字數由提示詞限制
      system: system(g),
      messages: [{ role: 'user', content: `課程：${lesson || '（未提供）'}\n題目（小黑剛剛念的）：${question}\n正確答案：${right}\n孩子選的：${picked}` }],
    }),
  });
  if (!res.ok) {
    console.log('tutor error', res.status, (await res.text()).slice(0, 300));
    return json({ error: 'upstream' }, 502);
  }
  const data = await res.json();
  let line = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
  line = line.replace(/^["「『]|["」』]$/g, '').replace(/\s+/g, ' ').slice(0, 40);
  if (!line) console.log('tutor empty', data.stop_reason, JSON.stringify((data.content || []).map(c => c.type)), JSON.stringify(data.usage || {}));
  return line ? json({ line }) : json({ error: 'empty', why: data.stop_reason }, 502);
}

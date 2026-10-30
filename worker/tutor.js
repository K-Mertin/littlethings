// 學習遊戲的 AI 家教提示：POST /api/tutor（math、zhuyin、abc；go＝圍棋覆盤講解）
//   { game:'math', lesson:'🍎 數到 5', question:'這裡有幾個蘋果？', right:'5', picked:'4' } → { line:'…' }
// 正確答案由遊戲自己算好傳進來，Claude 只負責「用孩子聽得懂的話說錯在哪」，不自己算答案。
// 圍棋（table/go.html 覆盤的「講解這一手」）：
//   { game:'go', size:9, moveNo:23, color:'黑', move:'E5', best:'D4', before:62, after:41, verdict:'失誤', region:'左下角', facts:['…'] }
//   勝率、最佳手、事實短句都由瀏覽器裡的引擎算好；Claude 只把它們講成白話，不自己讀盤。
// 模型：Cloudflare 變數 TUTOR_MODEL（沒設就用 CLAUDE_MODEL，再沒設就 Haiku 5.5）。
// 額度：每 IP 每小時 300 句、全站每天 4,000 句（Haiku 一句約 0.0002 美元）。

const LIMITS = { perIpHour: 300, perDay: 4000 };
const GAMES = {
  math: {
    who: '「123 小島」數學遊戲裡的小白兔「小白」',
    kid: '5 歲左右、剛開始學數數和 10 以內加減的小朋友',
    rules: '- 依孩子選的答案猜他可能錯在哪：例如少數或多數了一個、跳過了一個、把加看成減、只數了一邊、把順序弄反。說得具體，但不要責備。\n- 只能提到題目裡出現的數字、孩子選的答案和正確答案，不要算新的數字，也不要出新題目。',
  },
  zhuyin: {
    who: '「ㄅㄆㄇ 小島」注音遊戲裡的小企鵝',
    kid: '5 歲左右、剛開始學注音符號、聲調和拼音的小朋友',
    rules: '- 依孩子選的答案猜他可能錯在哪，但只從「聲音」來說：例如兩個音聽起來很像（ㄅㄆ一個不送氣、一個送氣，可以把手放在嘴巴前面感覺有沒有風；ㄓㄗ、ㄕㄙ舌頭有沒有翹起來）、聲調弄錯（一聲平平、二聲往上、三聲先下再上、四聲往下）、拼音少了中間的音或後面的音。說得具體，可以教一個用耳朵或嘴巴感覺的小方法，但不要責備。\n- 絕對不要描述注音或國字的長相、筆畫、形狀、方向（例如「多一筆」「肚子在右邊」「有個勾」都不可以）。\n- 只能提到題目裡出現的注音、字詞、孩子選的和正確答案，不要出新題目。',
  },
  abc: {
    who: 'Pip, the friendly little fox in the English game "ABC Island"',
    kid: 'a 5-year-old Taiwanese child who is just starting to learn English letters, phonics and simple words',
    en: true,
    rules: '- Guess why the child picked that answer: letters that look alike (b/d, p/q, m/n), sounds that are close, the same first letter but a different word, or a word that does not rhyme. Be concrete and give one tiny tip (look at the first sound, listen to the end of the word, and so on). Never scold.\n- Only mention the words, letters and sounds in the question, the child\'s answer and the right answer. Do not ask a new question.',
  },
};const GO_VERDICTS = ['好棋', '緩著', '失誤', '大失誤'];
const GO_COORD = /^([A-HJ-T](1[0-9]|[1-9])|虛手)$/;
function goSystem() {
  return `你是陪大人和小學中高年級小朋友學圍棋的老師，正在陪他覆盤一盤 9 路或 13 路的棋。
請針對「這一手」說明為什麼好或不好，以及較好的下法好在哪：
- 只回 1～3 句話，繁體中文（台灣用語、口語），合計最多 80 個字。不要條列、不要 emoji、不要引號。
- 只能根據提供的資料（座標、勝率變化、事實短句）來說，不要自己想像盤面上其他棋子的位置，也不要編新的變化圖。
- 座標照原樣寫（例如 D4），可以搭配提供的方位（例如左下角）。
- 盡量用白話；用到術語（例如叫吃、氣、眼、打劫、斷、地）時，順便用幾個字白話解釋。
- 評語是好棋時就簡單稱讚並說好在哪；不是好棋時，語氣溫和、具體，說下次可以怎麼想。
- 最後不要問問題。只輸出那幾句話。`;
}
function goUser(b) {
  const facts = (Array.isArray(b.facts) ? b.facts : []).slice(0, 6).map(f => '- ' + cut(f, 60)).filter(f => f.length > 2);
  return `棋盤：${b.size} 路
第 ${b.moveNo} 手：${b.color}棋下在 ${b.move}${b.region ? `（${cut(b.region, 10)}）` : ''}
評語：${b.verdict}
${b.color}方勝率：${b.before}% → ${b.after}%
${b.best && b.best !== b.move ? `電腦認為較好的下法：${b.best}` : '電腦認為這手就是最好的下法之一'}
引擎確定的事實：
${facts.length ? facts.join('\n') : '- （沒有特別的事實）'}`;
}
function goValid(b) {
  const size = +b.size, moveNo = +b.moveNo, before = +b.before, after = +b.after;
  if (![9, 13].includes(size)) return null;
  if (!(moveNo >= 1 && moveNo <= 400)) return null;
  if (b.color !== '黑' && b.color !== '白') return null;
  if (!GO_COORD.test(String(b.move || ''))) return null;
  if (b.best && !GO_COORD.test(String(b.best))) return null;
  if (!GO_VERDICTS.includes(b.verdict)) return null;
  if (!(before >= 0 && before <= 100 && after >= 0 && after <= 100)) return null;
  return { size, moveNo, color: b.color, move: b.move, best: b.best || '', before: Math.round(before), after: Math.round(after), verdict: b.verdict, region: b.region || '', facts: b.facts };
}

const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function system(g) {
  if (g.en) return `You are ${g.who}, playing with ${g.kid}. The child just picked a wrong answer; the game already shows the right answer glowing.
Add ONE gentle hint about this specific mistake so the child knows how to get it right next time:
- Reply with one short sentence in very simple English (at most 12 words, words a 5-year-old knows). No emoji, no quotes.
${g.rules}
- Do not say "wrong" or "no". Be warm and encouraging, like "Look at the first sound!".
- Do not end with a question. Output only that sentence.`;
  return `你是${g.who}，正在陪${g.kid}練習。孩子剛剛答錯了一題，遊戲已經自動示範過正確做法，正確答案也已經在畫面上發亮。
請你補一句「針對這次錯誤」的溫柔提示，幫孩子知道下次怎麼避免：
- 只回一句話，繁體中文（台灣口語），最多 25 個字（一定要短），不要標點以外的符號、不要 emoji、不要引號。
${g.rules}
- 不要說「答錯了」「不對」，用鼓勵的語氣，例如「下次可以…」「我們一起…」。
- 最後不要問問題。只輸出那一句話。`;
}

export async function handleTutor(request, env, allow) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not configured' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  let sys, content, max;
  if (b && b.game === 'go') {
    const v = goValid(b);
    if (!v) return json({ error: 'missing fields' }, 400);
    sys = goSystem(); content = goUser(v); max = 120;
  } else {
    const g = GAMES[b && b.game];
    if (!g) return json({ error: 'unknown game' }, 400);
    const lesson = cut(b.lesson, 40), question = cut(b.question, 200), right = cut(b.right, 30), picked = cut(b.picked, 30);
    if (!question || !right || !picked || right === picked) return json({ error: 'missing fields' }, 400);
    sys = system(g);
    content = g.en ? `Activity: ${lesson || '(none)'}\nQuestion (what Pip just said): ${question}\nRight answer: ${right}\nThe child picked: ${picked}` : `課程：${lesson || '（未提供）'}\n題目（剛剛念的）：${question}\n正確答案：${right}\n孩子選的：${picked}`;
    max = g.en ? 120 : 50;
  }

  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (!await allow('tutor:' + ip, LIMITS.perIpHour, 3600e3)) return json({ error: 'slow down' }, 429);
  if (!await allow('tutorday:' + new Date().toISOString().slice(0, 10), LIMITS.perDay, 86400e3)) return json({ error: 'daily budget' }, 429);

  const res = await fetch(env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: (env.TUTOR_MODEL || env.CLAUDE_MODEL || 'claude-haiku-5-5').trim(), max_tokens: 1024,   // 模型可能先思考，留足空間；字數由提示詞限制
      system: sys,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    console.log('tutor error', res.status, (await res.text()).slice(0, 300));
    return json({ error: 'upstream' }, 502);
  }
  const data = await res.json();
  let line = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
  line = line.replace(/^["「『]|["」』]$/g, '').replace(/\s+/g, ' ');
  // 模型偶爾超過字數：太長就切在最後一個標點，不要切在半句
  if (line.length > max) { const cut = line.slice(0, max); const i = Math.max(...['，', '。', '！', ',', '.', '!'].map(c => cut.lastIndexOf(c))); line = i > max / 2 ? cut.slice(0, i + 1).replace(/[，,]$/, '') : cut; }
  if (!line) console.log('tutor empty', data.stop_reason, JSON.stringify((data.content || []).map(c => c.type)), JSON.stringify(data.usage || {}));
  return line ? json({ line }) : json({ error: 'empty', why: data.stop_reason }, 502);
}

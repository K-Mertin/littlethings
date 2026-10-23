// 大廳小幫手的朗讀：GET /api/tts?t=文字 → Azure Speech（Foundry Tools）神經語音 mp3
// Secrets：AZURE_SPEECH_KEY、AZURE_SPEECH_REGION（例如 eastasia）
// 只有本機測試會設：AZURE_TTS_URL（指到假伺服器）
// 網址可加 &r=+5% 指定語速（-30%～+40%）。
// 一般變數（可不設）：AZURE_TTS_VOICE（預設 zh-TW-YunJheNeural，和 ㄅㄆㄇ／123 小島同一個聲音）、AZURE_TTS_RATE（預設 +15%）
// 同一句話合成一次就存進 Durable Object（workers.dev 網域不能用 Cloudflare 快取），之後直接回存檔，不再算 Azure 字數。
// Azure 免費 F0 每月 50 萬字 ≈ 每天 1.6 萬字，所以全站每天最多合成 15,000 字，超過就回 429，前端改用瀏覽器內建語音。

const LIMITS = { maxChars: 300, perIpHour: 80, charsPerDay: 15000 };

export class TtsCache {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    if (request.method === 'PUT') {
      await this.ctx.storage.put('mp3', new Uint8Array(await request.arrayBuffer()));
      return new Response('ok');
    }
    const mp3 = await this.ctx.storage.get('mp3');
    return mp3 ? new Response(mp3, { headers: { 'content-type': 'audio/mpeg' } }) : new Response('miss', { status: 404 });
  }
}

const esc = s => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const clean = s => String(s || '')
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️‍]/gu, '')   // emoji 不念
  .replace(/[*_`#>~]+/g, '').replace(/\s+/g, ' ').trim();
async function sha(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const audio = body => new Response(body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
const fail = (status, msg) => new Response(JSON.stringify({ error: msg }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function handleTts(request, env, allow) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) return fail(503, 'tts not configured');
  const text = clean(new URL(request.url).searchParams.get('t')).slice(0, LIMITS.maxChars);
  if (!text) return fail(400, 'empty');
  const voice = (env.AZURE_TTS_VOICE || 'zh-TW-YunJheNeural').trim();
  // ?r=+5% 讓遊戲配合自己預錄語音的語速；只接受 -30%～+40%
  const rq = new URL(request.url).searchParams.get('r');
  const rate = rq && /^[+-]?\d{1,2}%$/.test(rq) && Math.abs(parseInt(rq)) <= 40 ? (rq[0] === '-' || rq[0] === '+' ? rq : '+' + rq) : (env.AZURE_TTS_RATE || '+15%').trim();
  const key = await sha([voice, rate, text].join('|'));
  const box = env.TTS_CACHE.get(env.TTS_CACHE.idFromName(key));

  const hit = await box.fetch('https://tts/');
  if (hit.ok) return audio(hit.body);

  const ip = request.headers.get('cf-connecting-ip') || 'local';
  if (!await allow('tts:' + ip, LIMITS.perIpHour, 3600e3)) return fail(429, 'slow down');
  if (!await allow('ttschars:' + new Date().toISOString().slice(0, 10), LIMITS.charsPerDay, 86400e3, text.length)) return fail(429, 'daily budget');

  const lang = voice.slice(0, 5);
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${esc(voice)}"><prosody rate="${esc(rate)}">${esc(text)}</prosody></voice></speak>`;
  const res = await fetch(env.AZURE_TTS_URL || `https://${env.AZURE_SPEECH_REGION.trim()}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY, 'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'littleland-helper',
    },
    body: ssml,
  });
  if (!res.ok) {
    console.log('azure tts error', res.status, (await res.text()).slice(0, 300));
    return fail(502, 'tts failed');
  }
  const mp3 = await res.arrayBuffer();
  await box.fetch('https://tts/', { method: 'PUT', body: mp3 });
  return audio(mp3);
}

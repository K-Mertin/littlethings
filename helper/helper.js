// MW 小幫手：大廳右下角的聊天視窗。後端在 worker/chat.js（/api/chat、/api/issue）。
(() => {
  const KIND = { bug: '問題回報', idea: '新點子', question: '疑問' };
  const HELLO = '嗨！我是 MW 小幫手 👋\n想找好玩的遊戲、問怎麼玩，或是遊戲怪怪的、有新點子，都可以跟我說！';
  const css = `
#mwh-btn{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:50;
  display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px 12px 14px;cursor:pointer;
  background:var(--amber,#f3bb4f);color:#1d1606;font:600 16px var(--sans,system-ui);box-shadow:0 8px 24px rgba(0,0,0,.45)}
#mwh-btn .i{font-size:22px;line-height:1}
#mwh-btn:focus-visible{outline:3px solid #fff;outline-offset:2px}
#mwh{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:51;
  width:min(400px,calc(100vw - 32px));height:min(600px,calc(100dvh - 32px));display:none;flex-direction:column;
  background:var(--panel,#181b1f);border:1px solid var(--line,#2a2f35);border-radius:16px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.6);
  font-family:var(--sans,system-ui);color:var(--ink,#e7e4dc)}
#mwh.open{display:flex}
#mwh header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#2a2f35);margin:0}
#mwh header b{flex:1;font-size:16px}
#mwh header button{border:0;background:transparent;color:var(--mute,#8e949b);font-size:22px;cursor:pointer;padding:4px 8px;border-radius:8px}
#mwh header button:hover{background:rgba(255,255,255,.06);color:var(--ink,#e7e4dc)}
#mwh .log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}
#mwh .m{max-width:85%;padding:9px 13px;border-radius:14px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
#mwh .m.bot{align-self:flex-start;background:#23282e;border-bottom-left-radius:4px}
#mwh .m.me{align-self:flex-end;background:var(--amber,#f3bb4f);color:#1d1606;border-bottom-right-radius:4px}
#mwh .spk{margin-left:6px;border:0;background:transparent;color:var(--mute,#8e949b);font-size:15px;cursor:pointer;padding:0 4px;border-radius:6px;vertical-align:baseline}
#mwh .spk:hover,#mwh .spk.on{color:var(--amber,#f3bb4f);background:rgba(255,255,255,.06)}
#mwh header button.auto{font-size:18px}
#mwh header button.auto.on{color:var(--amber,#f3bb4f)}
#mwh .m.err{align-self:center;background:transparent;color:#ff9b8f;font-size:13px}
#mwh .m.dots{color:var(--mute,#8e949b)}
#mwh .acts{align-self:flex-start;display:flex;flex-wrap:wrap;gap:8px}
#mwh .go{display:inline-block;text-decoration:none;background:#2f6f45;color:#fff;border-radius:999px;padding:8px 14px;font-size:15px;font-weight:600}
#mwh .go:hover{background:#3a8755}
#mwh .card{align-self:stretch;border:1px solid var(--amber,#f3bb4f);border-radius:12px;padding:12px;background:#1f1b12;font-size:14px}
#mwh .card .k{font-size:12px;color:var(--amber,#f3bb4f);letter-spacing:.08em}
#mwh .card .t{font-weight:600;font-size:15px;margin:4px 0 6px}
#mwh .card .b{white-space:pre-wrap;color:#cfcac0;max-height:140px;overflow-y:auto}
#mwh .card .row{display:flex;gap:8px;margin-top:10px}
#mwh .card button{flex:1;border:0;border-radius:10px;padding:9px;font:600 15px var(--sans,system-ui);cursor:pointer}
#mwh .card .ok{background:var(--amber,#f3bb4f);color:#1d1606}
#mwh .card .no{background:#2a2f35;color:var(--ink,#e7e4dc)}
#mwh .card button:disabled{opacity:.5;cursor:default}
#mwh form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#2a2f35)}
#mwh textarea{flex:1;resize:none;border:1px solid var(--line,#2a2f35);border-radius:12px;background:#0f1113;color:inherit;
  font:16px var(--sans,system-ui);padding:9px 11px;height:44px;max-height:110px}
#mwh textarea:focus{outline:2px solid var(--amber,#f3bb4f);outline-offset:-1px}
#mwh form button{border:0;border-radius:12px;background:var(--amber,#f3bb4f);color:#1d1606;font:600 15px var(--sans,system-ui);padding:0 16px;cursor:pointer}
#mwh form button:disabled{opacity:.5}
#mwh form button.mic{background:#2a2f35;color:var(--ink,#e7e4dc);padding:0 12px;font-size:20px}
#mwh form button.mic.on{background:#c0392b;color:#fff;animation:mwhpulse 1s infinite}
@keyframes mwhpulse{50%{opacity:.6}}
#mwh .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}
#mwh .chips button{border:1px solid var(--line,#2a2f35);background:transparent;color:var(--ink,#e7e4dc);border-radius:999px;padding:5px 11px;font:14px var(--sans,system-ui);cursor:pointer}
#mwh .chips button:hover{border-color:var(--amber,#f3bb4f)}
#mwh .chips[hidden]{display:none}
@media (max-width:520px){#mwh{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0;border:0}}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement('button');
  btn.id = 'mwh-btn'; btn.type = 'button'; btn.setAttribute('aria-label', '開啟 MW 小幫手');
  btn.innerHTML = '<span class="i">💬</span><span>問問小幫手</span>';
  const box = document.createElement('section');
  box.id = 'mwh'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'MW 小幫手');
  box.innerHTML = `<header><span style="font-size:22px">🏝️</span><b>MW 小幫手</b><button type="button" class="auto" hidden title="自動朗讀回覆：關" aria-label="自動朗讀回覆：關" aria-pressed="false">🔇</button><button type="button" class="new" title="重新開始" aria-label="重新開始">↺</button><button type="button" class="x" aria-label="關閉">✕</button></header>
    <div class="log" aria-live="polite"></div>
    <div class="chips"><button type="button">推薦一款遊戲</button><button type="button">我要回報問題</button><button type="button">我有新遊戲點子</button></div>
    <form><textarea rows="1" maxlength="600" placeholder="輸入訊息…" aria-label="訊息"></textarea><button type="button" class="mic" hidden aria-label="語音輸入" title="按一下開始說話">🎤</button><button type="submit">送出</button></form>`;
  document.body.append(btn, box);
  const log = box.querySelector('.log'), ta = box.querySelector('textarea'), send = box.querySelector('form button[type=submit]'), chips = box.querySelector('.chips');

  // 對話記在 sessionStorage：同一個分頁回到大廳還在，關掉就清掉
  let msgs = [];
  try { msgs = JSON.parse(sessionStorage.getItem('mwh') || '[]'); } catch (e) { }
  const save = () => { try { sessionStorage.setItem('mwh', JSON.stringify(msgs.slice(-30))); } catch (e) { } };
  let busy = false;

  const add = (cls, text) => { const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  // 語音輸出：用瀏覽器內建的語音合成朗讀回覆（zh-TW）；每則回覆有 🔊 按鈕，標題列可開「自動朗讀」（預設關閉）
  const TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : null;
  let autoRead = false;
  try { autoRead = !!TTS && localStorage.getItem('mwh-auto') === '1'; } catch (e) { }
  const speakable = t => t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu, '').replace(/[*_`#>~]+/g, '').replace(/\s+/g, ' ').trim();
  const stopSpeak = () => { if (TTS) { TTS.cancel(); log.querySelectorAll('.spk.on').forEach(b => b.classList.remove('on')); } };
  // 挑裝置上最自然的中文聲音：台灣 > 其他中文；神經／優化版本（Edge Natural、Google、Apple 優化）優先，粵語排除
  let voiceCache = null;
  const pickVoice = () => {
    if (voiceCache) return voiceCache;
    const vs = TTS.getVoices().filter(v => /^(zh|cmn)/i.test(v.lang) && !/HK|yue|粵|廣東/i.test(v.lang + v.name));
    if (!vs.length) return null;
    const score = v => (/TW|Hant|臺灣|台灣|國語/i.test(v.lang + v.name) ? 100 : 0)
      + (/Natural|Neural|Online/i.test(v.name) ? 40 : 0) + (/Google/i.test(v.name) ? 30 : 0)
      + (/Enhanced|Premium|優化|高品質/i.test(v.name) ? 30 : 0) + (v.localService === false ? 5 : 0);
    voiceCache = vs.sort((a, b) => score(b) - score(a))[0];
    return voiceCache;
  };
  if (TTS && 'onvoiceschanged' in TTS) TTS.addEventListener('voiceschanged', () => { voiceCache = null; });
  const speak = (text, b) => {
    if (!TTS) return;
    stopSpeak();
    const t = speakable(text); if (!t) return;
    const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-TW'; u.rate = 1.1;
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    if (b) { b.classList.add('on'); u.onend = u.onerror = () => b.classList.remove('on'); }
    TTS.speak(u);
  };
  const addBot = (text, auto) => {
    const d = add('bot', text);
    if (TTS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'spk'; b.textContent = '🔊'; b.title = '念給我聽'; b.setAttribute('aria-label', '朗讀這則回覆');
      b.onclick = () => { if (b.classList.contains('on')) stopSpeak(); else speak(text, b); };
      d.appendChild(b);
      if (auto && autoRead) speak(text, b);
    }
    return d;
  };
  const games = list => {
    if (!list || !list.length) return;
    const a = document.createElement('div'); a.className = 'acts';
    for (const g of list) { const l = document.createElement('a'); l.className = 'go'; l.href = g.url; l.textContent = `▶ 去玩 ${g.name}`; a.appendChild(l); }
    log.appendChild(a); log.scrollTop = log.scrollHeight;
  };
  const draftCard = d => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = `<div class="k">要送給製作團隊的${KIND[d.kind] || '回報'}</div><div class="t"></div><div class="b"></div>
      <div class="row"><button type="button" class="ok">✅ 送出</button><button type="button" class="no">先不要</button></div>`;
    c.querySelector('.t').textContent = d.title; c.querySelector('.b').textContent = d.body;
    const ok = c.querySelector('.ok'), no = c.querySelector('.no');
    no.onclick = () => { c.remove(); add('bot', '好，沒有送出。想改什麼可以直接跟我說！'); };
    ok.onclick = async () => {
      ok.disabled = no.disabled = true; ok.textContent = '送出中…';
      try {
        const r = await fetch('/api/issue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draft: d }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || '送出失敗了，等一下再試試看。');
        c.querySelector('.row').innerHTML = `<div style="color:#8fe0a6">✓ 已送出（編號 #${j.number}），謝謝你！</div>`;
        const t = `謝謝你！已經送給製作團隊了（編號 #${j.number}）。`;
        msgs.push({ role: 'assistant', content: t }); save(); addBot(t);
      } catch (e) { ok.disabled = no.disabled = false; ok.textContent = '✅ 再試一次'; add('err', e.message); }
    };
    log.appendChild(c); log.scrollTop = log.scrollHeight;
  };

  function render() {
    log.innerHTML = '';
    add('bot', HELLO);
    for (const m of msgs) m.role === 'user' ? add('me', m.content) : addBot(m.content);
    chips.hidden = msgs.length > 0;
  }

  async function ask(text) {
    text = text.trim().slice(0, 600);
    if (!text || busy) return;
    busy = true; send.disabled = true; chips.hidden = true;
    msgs.push({ role: 'user', content: text }); save(); add('me', text);
    const wait = add('bot dots', '…');
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: msgs }) });
      const j = await r.json().catch(() => ({}));
      wait.remove();
      if (!r.ok || j.error) { msgs.pop(); save(); add('err', j.error || '小幫手連不上，等一下再試試看。'); ta.value = ta.value || text; return; }
      msgs.push({ role: 'assistant', content: j.reply }); save();
      addBot(j.reply, true); games(j.games); if (j.draft) draftCard(j.draft);
    } catch (e) { wait.remove(); msgs.pop(); save(); add('err', '網路好像斷了，等一下再試試看。'); }
    finally { busy = false; send.disabled = false; ta.focus(); }
  }

  const open = () => { box.classList.add('open'); btn.hidden = true; if (!log.childElementCount) render(); setTimeout(() => ta.focus(), 50); };
  const close = () => { stopSpeak(); box.classList.remove('open'); btn.hidden = false; btn.focus(); };
  btn.onclick = open;
  box.querySelector('.x').onclick = close;
  box.querySelector('.new').onclick = () => { stopSpeak(); msgs = []; save(); render(); ta.focus(); };
  box.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });   // 不讓大廳的數字快捷鍵搶走輸入
  box.querySelector('form').onsubmit = e => { e.preventDefault(); const t = ta.value; ta.value = ''; ask(t); };
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); box.querySelector('form').requestSubmit(); } });
  chips.querySelectorAll('button').forEach(b => b.onclick = () => ask(b.textContent));

  const autoBtn = box.querySelector('.auto');
  if (TTS && autoBtn) {
    autoBtn.hidden = false;
    const sync = () => { const l = '自動朗讀回覆：' + (autoRead ? '開' : '關'); autoBtn.textContent = autoRead ? '🔊' : '🔇'; autoBtn.classList.toggle('on', autoRead); autoBtn.title = l; autoBtn.setAttribute('aria-label', l); autoBtn.setAttribute('aria-pressed', autoRead); };
    sync();
    autoBtn.onclick = () => {
      autoRead = !autoRead; sync(); if (!autoRead) stopSpeak();
      try { localStorage.setItem('mwh-auto', autoRead ? '1' : '0'); } catch (e) { }
    };
  }

  // 語音輸入：用瀏覽器內建的語音辨識，結果填進輸入框，讓使用者確認後再按送出；不支援的瀏覽器就不顯示麥克風
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = box.querySelector('.mic');
  if (SR && mic) {
    mic.hidden = false;
    let rec = null, base = '';
    const stop = () => { mic.classList.remove('on'); mic.setAttribute('aria-label', '語音輸入'); mic.title = '按一下開始說話'; rec = null; };
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'zh-TW'; rec.interimResults = true; rec.continuous = false;
      base = ta.value;
      rec.onresult = e => {
        let t = ''; for (const r of e.results) t += r[0].transcript;
        ta.value = (base + t).slice(0, 600);
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') add('err', '需要允許使用麥克風才能說話喔，也可以直接打字。');
        else if (e.error !== 'no-speech' && e.error !== 'aborted') add('err', '語音輸入好像不能用，直接打字也可以。');
      };
      rec.onend = () => { stop(); ta.focus(); };
      try { rec.start(); mic.classList.add('on'); mic.setAttribute('aria-label', '停止語音輸入'); mic.title = '說完了，按一下停止'; }
      catch (e) { stop(); }
    };
    box.querySelector('.x').addEventListener('click', () => { if (rec) rec.abort(); });
  }
})();

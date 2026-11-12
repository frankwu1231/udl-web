'use strict';
// 第 26 版第四階段：小老師小方（第三年 BC 階段）。依認知學徒制分三個支持階段：
// - 示範（demo）：用老師示範模式解題；每一步「看小方做」之前，先請學生點選小方下一步要做什麼。
// - 陪做（guided）：學生自己解題；每到新的一步，先點選「我正在做哪一步」，答對答錯時小方說一句話。
// - 撤除（faded）：只在學生停頓或答錯時出現。
// 每題做完：小方拿出自己的正確作品，請學生對照，指出哪幾步和自己第一次做的不一樣。
// 示範的步驟、正確作品、對錯都由網站程式決定；AI 只換說法（不能有數字），失敗就用固定語句。
// 小方取代第一年小幫手的停頓提醒；支持順序：小老師小方 → 網站三層提示 → 教師提示。
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STAGE_NAME = { demo: '示範', guided: '陪做', faded: '撤除' };
  const SELF_ASK = ['我在找什麼？', '我要先看哪裡？', '我要怎麼做？', '這樣對嗎？'];
  const FIXED = { right: '對了，你做得很仔細。', wrong: '再看一次圖，慢慢想。', idle: '停一下了。想想看：我在找什麼？', predict: '想一想，下一步要做什麼。', compare: '看看我們兩個哪裡一樣。' };
  let api = null, root = null, lastStep = null, asked = new Set(), predicted = new Set(), idle = 0, idleSaid = false, cycleKey = '';

  const research = () => window.areaResearch;
  const stage = () => { const r = research(); if (!r || !api || !r.active?.() || r.phase?.() !== 'BC') return ''; return r.tutorStage?.(api.act()) || ''; };
  const on = () => !!stage() && api.mode() !== 'probe';

  // ---------- 畫面 ----------
  function mount() {
    if (root) return;
    root = document.createElement('aside'); root.id = 'tutor'; root.className = 'tutor'; root.setAttribute('aria-label', '小老師小方');
    root.innerHTML = `<div class="tutor-bubble" id="tutorBubble" role="status" aria-live="polite" hidden></div><div class="tutor-face" aria-hidden="true">🧑‍🏫</div><p class="tutor-stage" id="tutorStage"></p>`;
    document.body.append(root);
  }
  function unmount() { root?.remove(); root = null; }
  function talk(text) {
    if (!('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; u.rate = 0.85; const v = api?.voice?.(); if (v) u.voice = v; speechSynthesis.speak(u); } catch { /* 略過 */ }
  }
  // buttons：[[文字, 值]]；pick(值) 在學生點選後呼叫
  function say(text, { buttons = [], pick = null, ttl = 6000 } = {}) {
    mount(); const box = root.querySelector('#tutorBubble');
    box.innerHTML = `<p>${esc(text)}</p>${buttons.length ? `<div class="tutor-actions">${buttons.map(([t], i) => `<button type="button" data-tutor="${i}">${esc(t)}</button>`).join('')}</div>` : ''}`;
    box.hidden = false; clearTimeout(say.timer);
    box.querySelectorAll('[data-tutor]').forEach(b => b.onclick = () => { const v = buttons[Number(b.dataset.tutor)][1]; box.hidden = true; pick && pick(v); });
    if (!buttons.length && ttl) say.timer = setTimeout(() => { box.hidden = true; }, ttl);
    talk(text);
  }
  // AI 換說法（3 秒內沒回來就用固定語句）；每一句都記下來
  async function line(event, s, extra = {}) {
    const st = stage(), body = { event, stage: st, act: api.act(), ...(s !== undefined && api.title(s) ? { stepTitle: cleanTitle(api.title(s)) || undefined } : {}), ...(extra.obs ? { obs: extra.obs } : {}) };
    let text = FIXED[event], source = 'fixed', promptVersion = '';
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 3000);
      const res = await fetch('/api/tutor/line', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t); const out = await res.json();
      if (res.ok && out.text) { text = out.text; source = out.source; promptVersion = out.promptVersion || ''; }
    } catch { /* 用固定語句 */ }
    api.log('小方語句', { activity: s === undefined ? null : s + 1, kind: event, text, source, promptVersion });
    return text;
  }
  // 步驟名稱只送中文字、英數（伺服器也會再檢查）
  const cleanTitle = t => [...String(t)].filter(c => { const n = c.charCodeAt(0); return (n >= 0x4e00 && n <= 0x9fff) || /[0-9A-Za-z ]/.test(c); }).join('').slice(0, 16) || undefined;
  const open = () => api.steps().find(s => !api.passed(s));
  const options = s => {   // 正確的一步加上兩個別的步驟，順序打亂
    const all = (api.titles ? api.titles() : []).map((t, x) => [t, x]).filter(([t]) => t), right = all.find(([, x]) => x === s), others = all.filter(([, x]) => x !== s).sort(() => Math.random() - 0.5).slice(0, 2);
    return right ? [right, ...others].sort(() => Math.random() - 0.5) : [];
  };

  // ---------- 示範：先點選小方下一步要做什麼，再看小方做 ----------
  function demoPredict() {
    const btn = [...document.querySelectorAll('[data-demo]')].find(b => !predicted.has(cycleKey + b.dataset.demo));
    if (!btn) return;
    const s = Number(btn.dataset.demo), opts = options(s);
    if (opts.length < 2) return;
    btn.disabled = true;
    say(`${SELF_ASK[Math.min(SELF_ASK.length - 1, Math.floor(s / 2))]}小方下一步要做什麼？`, { buttons: opts, pick: v => {
      predicted.add(cycleKey + s); btn.disabled = false;
      const ok = v === s;
      api.log('小方示範選擇', { activity: s + 1, correct: ok, choice: api.title(v), answer: api.title(s) });
      say(ok ? `對！我要「${api.title(s)}」。看我做。` : `我要先「${api.title(s)}」。看我做。`, { ttl: 5000 });
    } });
  }
  // ---------- 陪做：每到新的一步，點選「我正在做哪一步」 ----------
  function guidedAsk() {
    const s = open(); if (s === undefined || asked.has(cycleKey + s)) return;
    const opts = options(s); if (opts.length < 2) return;
    asked.add(cycleKey + s);
    say('你正在做哪一步？', { buttons: opts, pick: v => {
      const ok = v === s;
      api.log('小方陪做選擇', { activity: s + 1, correct: ok, choice: api.title(v), answer: api.title(s) });
      say(ok ? '對，就是這一步。我在旁邊看你做。' : `現在是「${api.title(s)}」喔。`, { ttl: 4000 });
    } });
  }

  // ---------- 題末對照：小方的正確作品和學生第一次的作答 ----------
  function compare(snapshot) {
    const rows = snapshot.filter(r => r.answer);
    if (!rows.length) return;
    let d = document.getElementById('tutorCompare');
    if (!d) { d = document.createElement('dialog'); d.id = 'tutorCompare'; d.className = 'research-dialog tutor-compare'; document.body.append(d); }
    const marked = new Set();
    d.innerHTML = `<h2 data-say>小方的作品和你的作品</h2><p data-say>看一看，哪幾步和你第一次做的不一樣？點一下不一樣的那一步。</p>
      <table class="study-table"><thead><tr><th>步驟</th><th>小方的作品</th><th>你第一次的作答</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${esc(r.title)}</td><td>${esc(r.answer)}</td><td>${esc(r.first || r.answer)}</td><td><button type="button" data-diff="${i}" aria-pressed="false">不一樣</button></td></tr>`).join('')}</tbody></table>
      <div class="actions"><button type="button" id="tutorCompareDone" class="primary">好了</button></div>`;
    d.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { const i = Number(b.dataset.diff); if (marked.has(i)) marked.delete(i); else marked.add(i); b.setAttribute('aria-pressed', String(marked.has(i))); });
    d.oncancel = e => e.preventDefault();
    d.querySelector('#tutorCompareDone').onclick = () => {
      const truth = rows.map((r, i) => r.first && r.first !== r.answer ? i : -1).filter(i => i >= 0);
      const match = truth.length === marked.size && truth.every(i => marked.has(i));
      api.log('題末對照', { activity: 7, cycle: snapshot.cycle, different: truth.map(i => rows[i].step), studentMarked: [...marked].map(i => rows[i].step), correct: match, corrected: truth.length > 0 });
      d.close();
      say(match ? (truth.length ? '你找到了！那幾步你已經改對了。' : '你找得很仔細，都一樣！') : '我們再看一次：有幾步你第一次寫的和我不一樣，後來你改對了。', { ttl: 6000 });
    };
    d.showModal(); line('compare').then(t => { const p = d.querySelector('p'); if (p && d.open) p.textContent = t + ' 點一下不一樣的那一步。'; });
  }

  // ---------- 停頓：小方先提醒，再過一陣子才請老師提示（教師提示由老師按研究工具列的按鈕記錄） ----------
  function tick() {
    if (!on() || api.phase() !== 'solve' || open() === undefined || document.hidden || document.querySelector('dialog[open]')) return;
    idle++;
    const wait = research()?.teacherWait?.() || 10;
    if (idle >= wait && !idleSaid) { idleSaid = true; const s = open(); api.log('小方停頓提醒', { activity: s + 1, idle }); line('idle', s).then(t => say(t, { ttl: 6000 })); }
    if (idle >= wait * 2) research()?.cueTeacher?.(true);
  }
  ['pointerdown', 'keydown', 'input', 'touchstart'].forEach(e => document.addEventListener(e, ev => { if (root && root.contains(ev.target)) return; idle = 0; idleSaid = false; research()?.cueTeacher?.(false); }, { passive: true, capture: true }));
  setInterval(tick, 1000);

  window.areaTutor = {
    // a：mode()、phase()、steps()、passed(s)、title(s)、act()、cycle()、log(e, x)、voice()
    attach(a) { api = a; },
    stage: () => (on() ? stage() : ''),
    newQuestion() { idle = 0; idleSaid = false; lastStep = null; },
    update() {
      if (!api || !on()) { unmount(); return; }
      mount(); root.querySelector('#tutorStage').textContent = '小老師小方・' + STAGE_NAME[stage()];
      cycleKey = api.act() + '|' + api.cycle() + '|';
      if (api.phase() !== 'solve') return;
      if (stage() === 'demo') demoPredict();
      else if (stage() === 'guided') { const s = open(); if (s !== lastStep) { lastStep = s; guidedAsk(); } }
    },
    right(s) { if (!on() || stage() === 'faded' || stage() === 'demo') return; line('right', s).then(t => say(t, { ttl: 3500 })); },
    wrong(s, obs) { if (!on() || stage() === 'demo') return; line('wrong', s, { obs }).then(t => say(t, { ttl: 5000 })); },
    done(snapshot) { if (!on()) return; setTimeout(() => compare(snapshot), 300); }
  };
})();

'use strict';
// 第 26 版第三階段：探試模式（每節開始時施測，各研究階段都一樣）。
// - 提示、示範、小方、小老師小方、AI 都不出現；只有朗讀題目（閱讀輔助）。
// - 每一步可以獨立作答，按「確定」才算作答；提交前可以改。前一步錯了，後面照樣可以做。
// - 每題 90 秒、整份 15 分鐘（題組可以另訂）。時間到就自動送出。
// - 學生只看到和對錯無關的鼓勵；計分在伺服器，答案不會送到這台電腦。
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WHO_KEY = 'area-research-who-v22', RUN_KEY = 'area-probe-run-v26';
  const CHEERS = ['謝謝你，很認真！', '好，下一題。', '你很專心，繼續！'];
  const load = (k, f) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null') ?? f; } catch { return f; } };
  const keep = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* 略過 */ } };
  let state = null, item = null, answers = {}, itemStart = 0, timer = null, tech = false, busy = false;

  async function api(path, body) {
    const res = await fetch(path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    let out = {}; try { out = await res.json(); } catch { /* 略過 */ }
    if (!res.ok) { const e = new Error(out.error || 'failed'); e.status = res.status; throw e; }
    return out;
  }
  function say(text) {
    if (!('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; u.rate = 0.85; speechSynthesis.speak(u); } catch { /* 略過 */ }
  }

  // ---------- 老師開始：選題組 ----------
  async function start() {
    const who = load(WHO_KEY, null);
    state = load(RUN_KEY, null);
    if (state && who && state.student === who.student) { $('probeWho').textContent = state.student; return show(); }   // 重新整理：接著做
    if (!who || who.off || !who.student) { $('probe').innerHTML = '<p>請老師先在學生頁選學生代號、按「開始本節」，再進入小測驗。</p><p><a href="seven.html">回學生頁</a></p>'; return; }
    $('probeWho').textContent = who.student + (who.sessionNo ? `・第 ${who.sessionNo} 節` : '');
    let sets; try { sets = (await api('/api/probe/sets')).sets; } catch { $('probe').innerHTML = '<p>讀不到題組。請確認「現場試用紀錄」有勾選存進網站資料庫。</p>'; return; }
    if (!sets.length) { $('probe').innerHTML = '<p>研究管理還沒有匯入題組。</p><p><a href="seven.html">回學生頁</a></p>'; return; }
    const kind = { probe: '探試', generalization: '類化', practice: '操作練習' };
    const timeText = x => `每題 ${x.itemSecs || 90} 秒、整份 ${Math.round((x.totalSecs || 900) / 60)} 分鐘`;
    $('probe').innerHTML = `<h1>小測驗（老師操作）</h1><p class="count">學生：${esc(who.student)}。開始後，提示、示範和小方都不會出現；${esc(timeText(sets[0]))}。</p>
      <label>題組<select id="probeSet">${sets.map(s => `<option value="${esc(s.id)}">${esc(kind[s.kind] || s.kind)}：${esc(s.title)}（${s.items} 題）</option>`).join('')}</select></label>
      <p><button type="button" id="probeStart" class="primary submit">開始小測驗</button></p><p id="probeMsg" class="count" role="alert"></p>`;
    const note = $('probe').querySelector('.count'); $('probeSet').onchange = () => { const x = sets.find(t => t.id === $('probeSet').value); if (x) note.textContent = `學生：${who.student}。開始後，提示、示範和小方都不會出現；${timeText(x)}。`; };
    $('probeStart').onclick = async () => {
      $('probeStart').disabled = true;
      try {
        const out = await api('/api/probe/start', { student: who.student, set: $('probeSet').value, sessionNo: who.sessionNo ?? null });
        state = { run: out.run, student: who.student, items: out.items, itemSecs: out.itemSecs, totalSecs: out.totalSecs, index: 0, startedAt: Date.now() };
        keep(RUN_KEY, state); show();
      } catch { $('probeMsg').textContent = '沒有開始成功，請再試一次。'; $('probeStart').disabled = false; }
    };
  }

  // ---------- 一題 ----------
  function figure(f) {
    if (!f) return '';
    const c = 32, w = f.cols * c, h = f.rows * c, parts = [];
    if (f.grid) for (let x = 0; x <= f.cols; x++) parts.push(`<line x1="${x * c}" y1="0" x2="${x * c}" y2="${h}" stroke="#c9d6ea"/>`);
    if (f.grid) for (let y = 0; y <= f.rows; y++) parts.push(`<line x1="0" y1="${y * c}" x2="${w}" y2="${y * c}" stroke="#c9d6ea"/>`);
    (f.rects || []).forEach(([x, y, rw, rh], i) => parts.push(`<rect x="${x * c}" y="${y * c}" width="${rw * c}" height="${rh * c}" fill="${i % 2 ? '#ffe2a8' : '#bfe0ff'}" fill-opacity="0.8" stroke="#2b4a7a" stroke-width="2"${(f.rects.length > 1) ? ' stroke-dasharray="6 4"' : ''}/>`));
    (f.labels || []).forEach(l => parts.push(`<text x="${l.x * c}" y="${l.y * c}" font-size="18" text-anchor="middle" fill="#1d2b44">${esc(l.text)}</text>`));
    return `<figure><svg viewBox="-70 -10 ${w + 90} ${h + 20}" width="${Math.min(w + 90, 600)}" role="img" aria-label="題目的圖">${parts.join('')}</svg></figure>`;
  }
  function show() {
    clearInterval(timer);
    if (state.index >= state.items.length) return finish('done');
    item = state.items[state.index]; answers = {}; tech = false; busy = false;
    const saved = load(RUN_KEY + ':item', null);
    itemStart = saved && saved.run === state.run && saved.index === state.index ? saved.startedAt : Date.now();
    if (saved && saved.run === state.run && saved.index === state.index) answers = saved.answers || {};
    keep(RUN_KEY + ':item', { run: state.run, index: state.index, startedAt: itemStart, answers });
    const step = s => `<div class="step" data-step="${esc(s.key)}"><span class="label">${esc(s.label)}</span>
      ${s.input === 'number' ? `<input type="number" inputmode="numeric" id="in_${esc(s.key)}" aria-label="${esc(s.label)}">` : `<div class="opts" role="group" aria-label="${esc(s.label)}">${s.options.map(o => `<button type="button" data-opt="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`}
      <button type="button" class="ok" data-ok="${esc(s.key)}">確定</button><span class="done" id="done_${esc(s.key)}" aria-live="polite"></span></div>`;
    $('probe').innerHTML = `<p class="count">第 ${state.index + 1} 題，共 ${state.items.length} 題</p><div class="bars"><div class="bar" title="這一題的時間"><i id="barItem"></i></div><div class="bar" title="整份的時間"><i id="barAll"></i></div></div>
      <p class="prompt" data-say>${esc(item.prompt)} <button type="button" id="read" aria-label="朗讀題目">🔊</button></p>${figure(item.figure)}
      ${item.steps.map(step).join('')}<button type="button" id="submit" class="primary submit">這一題做好了</button>
      <div class="teacher"><button type="button" id="techBtn">⚠️ 技術問題，這題不計（老師按）</button> <button type="button" id="stopBtn">結束小測驗（老師按）</button></div>`;
    $('read').onclick = () => say(item.prompt);
    for (const s of item.steps) {
      const box = document.querySelector(`[data-step="${s.key}"]`), picked = () => box.querySelector('[aria-pressed=true]')?.dataset.opt;
      box.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => box.querySelectorAll('[data-opt]').forEach(x => x.setAttribute('aria-pressed', String(x === b))));
      const prev = answers[s.key]?.confirms?.at(-1);
      if (prev !== undefined) { if (s.input === 'number') $('in_' + s.key).value = prev.v; else box.querySelector(`[data-opt="${CSS.escape(String(prev.v))}"]`)?.setAttribute('aria-pressed', 'true'); $('done_' + s.key).textContent = '已確定'; }
      box.querySelector('[data-ok]').onclick = () => {
        const raw = s.input === 'number' ? $('in_' + s.key).value.trim() : picked();
        if (raw === undefined || raw === '') { $('done_' + s.key).textContent = '還沒填'; return; }
        const v = s.input === 'number' ? Number(raw) : raw;
        (answers[s.key] = answers[s.key] || { confirms: [] }).confirms.push({ v, t: Math.round((Date.now() - itemStart) / 100) / 10 });
        $('done_' + s.key).textContent = '已確定';   // 不顯示對錯
        keep(RUN_KEY + ':item', { run: state.run, index: state.index, startedAt: itemStart, answers });
      };
    }
    $('submit').onclick = () => submit(false);
    $('techBtn').onclick = () => { tech = true; submit(false); };
    $('stopBtn').onclick = () => { if (confirm('確定要結束這次小測驗嗎？還沒做的題目會記成沒作答。')) submit(false, 'stopped'); };
    timer = setInterval(tick, 1000); tick();
  }
  function tick() {
    const now = Date.now(), itemLeft = state.itemSecs * 1000 - (now - itemStart), allLeft = state.totalSecs * 1000 - (now - state.startedAt);
    if ($('barItem')) $('barItem').style.width = Math.max(0, itemLeft / (state.itemSecs * 10)) + '%';
    if ($('barAll')) $('barAll').style.width = Math.max(0, allLeft / (state.totalSecs * 10)) + '%';
    if (allLeft <= 0) submit(true, 'timeout');
    else if (itemLeft <= 0) submit(true);
  }
  // 送出：伺服器確定收到（或回答已經收過）才換題、清掉這一題的答案；送不出去就留在這一題，讓老師按「再送一次」
  async function send(path, body) {
    for (let i = 0; i < 3; i++) {
      try { await api(path, body); return true; }
      catch (e) { if (['already_submitted', 'already_finished'].includes(e.message)) return true; if (e.status && e.status < 500 && e.status !== 429) return false; await new Promise(r => setTimeout(r, 1000 * (i + 1))); }
    }
    return false;
  }
  function failed(text, retry) {
    const box = document.getElementById('probeRetry') || Object.assign(document.createElement('div'), { id: 'probeRetry', className: 'retry' });
    box.setAttribute('role', 'alert');
    box.innerHTML = `<p>${esc(text)}</p><button type="button" class="primary submit">再送一次</button>`;
    if (!box.isConnected) $('probe').append(box);
    box.querySelector('button').onclick = () => { box.remove(); retry(); };
  }
  async function submit(timedOut, end) {
    if (busy) return; busy = true; clearInterval(timer);
    const body = { itemId: item.id, steps: answers, timedOut, tech, secs: Math.round((Date.now() - itemStart) / 1000) };
    if (!await send(`/api/probe/${state.run}/item`, body)) { busy = false; failed('這一題還沒送出去（網路可能斷了），答案都還在。網路好了再按「再送一次」。', () => submit(timedOut, end)); return; }
    state.index++; keep(RUN_KEY, state); try { sessionStorage.removeItem(RUN_KEY + ':item'); } catch { /* 略過 */ }
    if (end) return finish(end);
    $('probe').innerHTML = `<p class="cheer" data-say>${CHEERS[state.index % CHEERS.length]}</p>`;
    setTimeout(show, 1200);
  }
  async function finish(reason) {
    clearInterval(timer);
    if (!await send(`/api/probe/${state.run}/finish`, { reason })) {
      $('probe').innerHTML = '<p class="cheer">小測驗做完了，謝謝你！</p>';
      failed('結束的紀錄還沒送出去（網路可能斷了）。網路好了再按「再送一次」。', () => finish(reason));
      return;
    }
    try { sessionStorage.removeItem(RUN_KEY); sessionStorage.removeItem(RUN_KEY + ':item'); } catch { /* 略過 */ }
    $('probe').innerHTML = '<p class="cheer" data-say>小測驗做完了，謝謝你！</p><p style="text-align:center"><a class="primary submit" href="seven.html">回到學習</a></p>';
  }
  start();
})();

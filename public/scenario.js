'use strict';
// 第 26 版第二階段：教師情境探試（標準化紀錄情境）。
// - 一次只看到輪到的那一節；存了決策才會出現下一節。網站不會告訴老師「應有方向」。
// - 記錄決策時間：從這一節第一次出現到按下儲存的總時間、主動操作時間（頁面在前景、1 分鐘內有操作、不含等 AI）、等 AI 的時間。
// - 記錄有沒有用 AI 摘要、有沒有回查原始紀錄。
(() => {
  const $ = id => document.getElementById(id);
  const S = window.areaStudy, esc = S.esc;
  const IDLE = 60000;
  let view = null, current = null, timer = null, lastInput = Date.now(), aiWaiting = false;

  // ---------- 計時：存在這台電腦，重新整理也接著算 ----------
  const tkey = (sc, k) => `area-scenario-time:${view.id}|${sc}|${k}`;
  const loadT = (sc, k) => { try { return JSON.parse(localStorage.getItem(tkey(sc, k)) || 'null'); } catch { return null; } };
  const saveT = (sc, k, t) => { try { localStorage.setItem(tkey(sc, k), JSON.stringify(t)); } catch { /* 存不了就只算這一頁 */ } };
  const memT = {};
  function timing(sc, k) {
    const id = sc + '|' + k;
    if (!memT[id]) memT[id] = loadT(sc, k) || { shownAt: Date.now(), activeMs: 0, aiWaitMs: 0, aiUsed: false, rawViewed: false };
    return memT[id];
  }
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'mousemove', 'touchstart']) addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true });
  function tick() {
    if (!current || current.next === null) return;
    const t = timing(current.id, current.next);
    if (document.visibilityState === 'visible' && !aiWaiting && Date.now() - lastInput < IDLE) t.activeMs += 1000;
    saveT(current.id, current.next, t);
  }

  async function start() {
    let list;
    try { const me = await S.api('/api/session'); if (!me.authenticated) { location.href = '/'; return; } if (!me.test) { $('status').textContent = '情境探試請用教師代號（T01～T12）登入。研究人員請到研究管理頁。'; return; } list = await S.api('/api/scenario'); }
    catch { $('status').textContent = '目前讀不到情境探試。'; return; }
    if (!list.assignments.length) { $('status').textContent = '目前沒有指派給您的情境探試。'; return; }
    $('status').textContent = '';
    $('assignments').innerHTML = `<h2>指派給您的探試</h2><div class="scn-tabs">${list.assignments.map(a => `<button type="button" data-asg="${esc(a.id)}">${esc(a.probe)}：${esc(a.title)}（${a.decided}/${a.total}）</button>`).join('')}</div>`;
    document.querySelectorAll('[data-asg]').forEach(b => b.onclick = () => open(b.dataset.asg));
    const unfinished = list.assignments.find(a => a.decided < a.total) || list.assignments[0];
    open(unfinished.id);
  }
  async function open(id, scenarioId) {
    document.querySelectorAll('[data-asg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.asg === id)));
    try { view = await S.api('/api/scenario/' + encodeURIComponent(id)); } catch { $('player').textContent = '讀不到這個探試。'; return; }
    const pick = view.scenarios.find(s => s.id === scenarioId) || view.scenarios.find(s => !s.done) || view.scenarios[0];
    draw(pick.id);
    clearInterval(timer); timer = setInterval(tick, 1000);
  }

  function draw(scenarioId) {
    current = view.scenarios.find(s => s.id === scenarioId);
    const c = current, k = c.next;
    const tabs = `<div class="scn-tabs" role="group" aria-label="情境">${view.scenarios.map(s => `<button type="button" data-scn="${esc(s.id)}" aria-pressed="${s.id === c.id}">${esc(s.title)}　${s.done ? '✓ 完成' : `${s.decisions.length}/${s.total}`}</button>`).join('')}</div>`;
    const sessions = c.sessions.map((x, i) => `<details class="scn-session"${i === c.sessions.length - 1 ? ' open' : ''}><summary>第 ${x.no} 節（完成 ${x.events.filter(r => r.event === '整題完成').length} 題）</summary><div class="table-scroll">${S.sessionTable(x.events, c.act)}</div></details>`).join('');
    const past = c.decisions.length ? `<h3>您前面的決策</h3><ul>${c.decisions.map(d => `<li>第 ${d.sessionNo} 節：${d.decision === 'keep' ? '維持原設定' : d.decision === 'change' ? '調整：' + Object.entries(d.changes).map(([f, v]) => `${S.FIELD[f] || f} → ${S.value(f, v)}`).join('、') : (d.decision === 'advance' ? '進階到 ' : '退回到 ') + S.actName(d.changes.to)}（${S.REASON[d.reason] || d.reason}）</li>`).join('')}</ul>` : '';
    const ai = view.aiOn && k ? `<div><button type="button" id="aiSummary">🤖 產生 AI 跨節摘要</button> <span class="subtle">AI 只整理您已經看到的節次，不提調整建議。</span><div id="aiText" class="ai-box" hidden></div></div>` : '';
    const ids = window.areaActs.LIST.map(a => a.id), i = ids.indexOf(c.act), next = ids[i + 1] || ids[i], prev = ids[i - 1] || ids[i];
    const actOpts = sel => ids.map(id => `<option value="${id}"${id === sel ? ' selected' : ''}>${esc(S.actName(id))}</option>`).join('');
    const form = k ? `<fieldset class="decide"><legend>第 ${k} 節看完了，您的決定</legend>
        <div class="choices" role="radiogroup">${[['keep', '維持原設定'], ['change', '調整支持設定'], ['advance', '進階到下一個活動'], ['back', '退回前一個活動']].map(([v, t]) => `<label><input type="radio" name="decision" value="${v}"> ${t}</label>`).join('')}</div>
        <div id="changeBox" hidden>${S.settingsForm(c.current)}</div>
        <label id="toBox" hidden>活動<select id="toAct"></select></label>
        <label>主要理由<select id="reason"><option value="">請選擇</option>${S.REASONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <label>補充（60 字內）<input id="note" maxlength="60"></label>
        <button type="button" id="save" class="primary">儲存這一節的決定</button><p id="msg" class="msg warn" role="alert"></p></fieldset>` : '<p><b>這個情境做完了。</b>請選上面其他情境。</p>';
    $('player').innerHTML = `${tabs}<section class="scn-panel"><h2>${esc(c.title)}・${esc(S.actName(c.act))}${k ? `・第 ${k} 節（共 ${c.total} 節）` : ''}</h2>
      <p class="scn-settings">這些紀錄的設定：${esc(S.settingsText(c.original))}<br>您目前的設定：${esc(S.settingsText(c.current))}</p>
      ${sessions}<p><button type="button" id="raw">🔎 回查原始紀錄</button></p><div id="rawBox" class="table-scroll" hidden></div>${ai}${past}${form}</section>`;
    document.querySelectorAll('[data-scn]').forEach(b => b.onclick = () => draw(b.dataset.scn));
    if (k) timing(c.id, k);   // 這一節第一次出現的時間
    $('raw').onclick = () => {
      if (k) { const t = timing(c.id, k); t.rawViewed = true; saveT(c.id, k, t); }
      const keys = ['time', 'cycle', 'step', 'stepTitle', 'event', 'correct', 'hintLevel', 'detail'];
      const rows = c.sessions.flatMap(x => x.events.map(e => ({ no: x.no, ...e })));
      $('rawBox').innerHTML = `<table class="study-table"><thead><tr><th>節</th>${keys.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${r.no}</td>${keys.map(x => `<td>${esc(r[x])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      $('rawBox').hidden = false;
    };
    if ($('aiSummary')) $('aiSummary').onclick = async () => {
      const t = timing(c.id, k), began = Date.now();
      aiWaiting = true; $('aiSummary').disabled = true; $('aiText').hidden = false; $('aiText').textContent = 'AI 整理中……';
      try { const out = await S.api(`/api/scenario/${view.id}/summary`, { scenario: c.id }); $('aiText').textContent = out.text + (out.source === 'ai' ? '' : '\n（AI 暫時無法使用，以上是網站整理的固定格式）'); t.aiUsed = true; }
      catch (e) { $('aiText').textContent = S.SAVE_ERR[e.message] || 'AI 摘要暫時無法使用。'; }
      finally { aiWaiting = false; t.aiWaitMs += Date.now() - began; saveT(c.id, k, t); $('aiSummary').disabled = false; }
    };
    if (!k) return;
    document.querySelectorAll('[name=decision]').forEach(r => r.onchange = () => {
      const v = r.value; $('changeBox').hidden = v !== 'change'; $('toBox').hidden = v !== 'advance' && v !== 'back';
      if (v === 'advance' || v === 'back') $('toAct').innerHTML = actOpts(v === 'advance' ? next : prev);
    });
    $('save').onclick = async () => {
      const decision = document.querySelector('[name=decision]:checked')?.value, reason = $('reason').value;
      if (!decision) { $('msg').textContent = '請選一個決定。'; return; }
      if (!reason) { $('msg').textContent = '請選主要理由。'; return; }
      const t = timing(c.id, k), body = { scenario: c.id, sessionNo: k, decision, reason, note: $('note').value.trim(), shownAt: t.shownAt, activeMs: Math.min(t.activeMs, 3 * 3600000), totalMs: Math.min(Date.now() - t.shownAt, 3 * 3600000), aiWaitMs: Math.min(t.aiWaitMs, 3 * 3600000), aiUsed: t.aiUsed, rawViewed: t.rawViewed };
      if (decision === 'change') { body.changes = S.readSettings($('changeBox'), c.current); if (!Object.keys(body.changes).length) { $('msg').textContent = S.SAVE_ERR.no_change; return; } }
      if (decision === 'advance' || decision === 'back') body.to = $('toAct').value;
      $('save').disabled = true;
      try { await S.api(`/api/scenario/${view.id}/decide`, body); try { localStorage.removeItem(tkey(c.id, k)); } catch { /* 略過 */ } delete memT[c.id + '|' + k]; await open(view.id, c.id); }
      catch (e) { $('msg').textContent = S.SAVE_ERR[e.message] || '沒有存成功，請再試一次。'; $('save').disabled = false; }
    };
  }
  start();
})();

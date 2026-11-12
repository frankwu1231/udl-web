'use strict';
// 第 26 版第二階段：研究管理（主持人帳號）。
// 研究階段切換、應有方向判準、情境組匯入與指派、真實學生的應有方向、AI 輸出核對、研究匯出。
(() => {
  const $ = id => document.getElementById(id);
  const S = window.areaStudy, esc = S.esc;
  const TEACHERS = Array.from({ length: 12 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
  const today = () => new Date().toISOString().slice(0, 10);
  const time = ms => ms ? new Date(ms).toLocaleString('zh-TW') : '';
  const RULE_TEXT = { lowAcc: '增加支持：支持下答對率低於（%）', highAcc: '減少支持／進階：支持下答對率達（%）', indep: '進階：無提示步驟比例達（%）', minItems: '有效節次：至少完成幾題', upN: '增加支持：最近連續幾節', downN: '減少支持／進階：最近連續幾節', maintainN: '維持：至少幾節有效資料', summaryChars: 'AI 摘要字數上限' };

  async function start() {
    try { const me = await S.api('/api/session'); if (!me.authenticated) { location.href = '/'; return; } if (!me.teacher || me.test) { $('status').textContent = '這一頁只給研究人員（主持人帳號）使用。'; return; } }
    catch { $('status').textContent = '讀不到登入狀態。'; return; }
    $('status').textContent = ''; $('body').hidden = false;
    drawPhases(); drawRules(); drawScenarios(); drawDirection(); drawAi(); drawExport();
  }

  // ---------- 研究階段：第二年依教師、第三年依學生，每次切換都留時間與操作者 ----------
  async function drawPhases(note = '') {
    const box = $('phaseSection');
    let data; try { data = await S.api('/api/study/phases'); } catch { box.textContent = '讀不到研究階段。'; return; }
    const cur = (kind, who) => (data.current.find(c => c.kind === kind && c.participant === who) || {}).phase || '';
    const opts = (kind, sel) => `<option value="">（未設定）</option>` + data.phases[kind].map(p => `<option value="${p}"${p === sel ? ' selected' : ''}>${S.PHASE[p]}</option>`).join('');
    const students = data.current.filter(c => c.kind === 'student');
    box.innerHTML = `<h2>🧭 研究階段</h2><p class="subtle">第二年依教師切換（基線期關閉 AI 摘要，介入期與追蹤期開啟）；第三年依學生切換（A、B、BC、維持期）。切換會記下時間。</p>
      <h3>教師</h3><div class="table-scroll"><table class="study-table"><thead><tr><th>教師代號</th><th>目前階段</th><th>切換到</th></tr></thead><tbody>${TEACHERS.map(t => `<tr><td>${t}</td><td>${esc(S.PHASE[cur('teacher', t)] || '未設定')}</td><td><select data-phase-teacher="${t}">${opts('teacher', cur('teacher', t))}</select></td></tr>`).join('')}</tbody></table></div>
      <h3>學生</h3><div class="study-grid"><label>學生代號<input id="phaseStudent" placeholder="T01-S01" maxlength="7"></label><label>階段<select id="phaseStudentSel">${opts('student', '')}</select></label></div><button type="button" id="phaseStudentSave">切換學生階段</button>
      ${students.length ? `<table class="study-table"><thead><tr><th>學生</th><th>目前階段</th></tr></thead><tbody>${students.map(s => `<tr><td>${esc(s.participant)}</td><td>${esc(S.PHASE[s.phase])}</td></tr>`).join('')}</tbody></table>` : ''}
      <p id="phaseMsg" class="msg" role="status">${esc(note)}</p><button type="button" id="phaseCsv">下載階段切換歷程 CSV</button>`;
    const save = async (kind, participant, phase) => {
      if (!phase) return;
      try { await S.api('/api/study/phases', { kind, participant, phase }); drawPhases(`✓ ${participant} 切換到 ${S.PHASE[phase]}`); }
      catch { $('phaseMsg').textContent = '沒有存成功，請檢查代號。'; }
    };
    box.querySelectorAll('[data-phase-teacher]').forEach(s => s.onchange = () => save('teacher', s.dataset.phaseTeacher, s.value));
    $('phaseStudentSave').onclick = () => save('student', $('phaseStudent').value.trim().toUpperCase(), $('phaseStudentSel').value);
    $('phaseCsv').onclick = () => S.download(`phases_${today()}.csv`, S.toCsv([['類別', '代號', '階段', '操作者', '時間'], ...data.history.map(h => [h.kind === 'teacher' ? '教師' : '學生', h.participant, S.PHASE[h.phase] || h.phase, h.actor, new Date(h.at).toISOString()])]));
  }

  // ---------- 判準（正式實驗前依前導資料校準） ----------
  async function drawRules() {
    const box = $('rulesSection');
    let data; try { data = await S.api('/api/study/config'); } catch { box.textContent = '讀不到判準。'; return; }
    box.innerHTML = `<h2>📐 應有方向的判準</h2><p class="subtle">計算同一活動、同一支持設定下的有效節次。支持設定變更後，從變更後的第一節重新算。預設值依計畫書。</p>
      <div class="study-grid">${Object.keys(RULE_TEXT).map(k => `<label>${RULE_TEXT[k]}<input type="number" data-rule="${k}" value="${data.rules[k]}"></label>`).join('')}</div>
      <button type="button" id="rulesSave">儲存判準</button> <button type="button" id="rulesReset">恢復計畫書預設</button><p id="rulesMsg" class="msg" role="status"></p>`;
    const save = async rules => { try { await S.api('/api/study/config', { rules }); $('rulesMsg').textContent = '✓ 已儲存'; } catch { $('rulesMsg').textContent = '數值不合理（例如低標高於高標），沒有儲存。'; } };
    $('rulesSave').onclick = () => save(Object.fromEntries([...box.querySelectorAll('[data-rule]')].map(i => [i.dataset.rule, Number(i.value)])));
    $('rulesReset').onclick = async () => { await save(data.defaults); drawRules(); };
  }

  // ---------- 情境探試：匯入（版本鎖定）、指派、進度 ----------
  async function drawScenarios(note = {}) {
    const box = $('scenarioSection');
    let data; try { data = await S.api('/api/study/scenarios'); } catch { box.textContent = '讀不到情境組。'; return; }
    box.innerHTML = `<h2>🧪 情境探試（標準化紀錄情境）</h2>
      <p class="subtle">情境組是一個 JSON 檔（格式見「第26版_研究地基說明」）。同一個代號和版本匯入後就鎖定，不能覆蓋；要修改請換版本號。</p>
      <label>匯入情境組（.json）<input type="file" id="setFile" accept="application/json,.json"></label><p id="setMsg" class="msg" role="status">${esc(note.set || '')}</p>
      <h3>情境組</h3>${data.sets.length ? `<table class="study-table"><thead><tr><th>代號@版本</th><th>名稱</th><th>匯入時間</th></tr></thead><tbody>${data.sets.map(s => `<tr><td>${esc(s.id)}</td><td>${esc(s.title)}</td><td>${esc(time(s.createdAt))}</td></tr>`).join('')}</tbody></table>` : '<p>還沒有情境組。</p>'}
      <h3>指派給教師</h3><div class="study-grid"><label>情境組<select id="asgSet">${data.sets.map(s => `<option value="${esc(s.id)}">${esc(s.id)}</option>`).join('')}</select></label><label>教師<select id="asgTeacher">${TEACHERS.map(t => `<option>${t}</option>`).join('')}</select></label><label>第幾次探試<input id="asgProbe" maxlength="20" placeholder="例如：P1"></label></div>
      <button type="button" id="asgSave"${data.sets.length ? '' : ' disabled'}>指派</button><p id="asgMsg" class="msg" role="status">${esc(note.asg || '')}</p>
      ${data.assignments.length ? `<table class="study-table"><thead><tr><th>教師</th><th>探試</th><th>情境組</th><th>指派時的階段</th><th>已決策節數</th><th>指派時間</th></tr></thead><tbody>${data.assignments.map(a => `<tr><td>${esc(a.teacher)}</td><td>${esc(a.probe)}</td><td>${esc(a.setId)}</td><td>${esc(S.PHASE[a.phase] || '未設定')}</td><td>${a.decided}</td><td>${esc(time(a.createdAt))}</td></tr>`).join('')}</tbody></table>` : ''}`;
    $('setFile').onchange = async () => {
      const f = $('setFile').files[0]; if (!f) return;
      let set; try { set = JSON.parse(await f.text()); } catch { $('setMsg').textContent = '這個檔案不是 JSON。'; return; }
      try { const out = await S.api('/api/study/scenarios', set); drawScenarios({ set: '✓ 已匯入 ' + out.id }); }
      catch (e) { $('setMsg').textContent = e.message === 'version_locked' ? '這個代號和版本已經匯入過，內容鎖定。要修改請換版本號。' : '格式不對，沒有匯入。'; }
    };
    $('asgSave').onclick = async () => {
      try { const out = await S.api('/api/study/assignments', { setId: $('asgSet').value, teacher: $('asgTeacher').value, probe: $('asgProbe').value.trim() }); drawScenarios({ asg: `✓ 已指派（教師目前階段：${S.PHASE[out.phase] || '未設定'}）` }); }
      catch (e) { $('asgMsg').textContent = e.message === 'set_already_used' ? '這位老師已經用過這組情境（各次探試要用不重複的情境組）。' : '請填「第幾次探試」。'; }
    };
  }

  // ---------- 真實學生的應有方向（教師端看不到） ----------
  function drawDirection() {
    const box = $('directionSection');
    box.innerHTML = `<h2>🎯 真實學生每一節的應有方向</h2><p class="subtle">依目前的判準，用網站資料庫裡的紀錄計算；和老師在那一節的決策並列。</p>
      <div class="study-grid"><label>學生代號<input id="dirStudent" placeholder="T01-S01" maxlength="7"></label><label>活動<select id="dirAct">${window.areaActs.LIST.map(a => `<option value="${a.id}"${a.id === 'rectangle' ? ' selected' : ''}>${esc(S.actName(a.id))}</option>`).join('')}</select></label></div>
      <button type="button" id="dirGo">計算</button><div id="dirOut" class="table-scroll"></div>`;
    $('dirGo').onclick = async () => {
      let out; try { out = await S.api(`/api/study/direction?student=${encodeURIComponent($('dirStudent').value.trim().toUpperCase())}&act=${$('dirAct').value}`); } catch { $('dirOut').textContent = '算不出來，請檢查代號。'; return; }
      $('dirOut').innerHTML = out.timeline.length ? `<table class="study-table"><thead><tr><th>節</th><th>完成題數</th><th>支持下答對率</th><th>無提示步驟比例</th><th>判斷窗口從第幾節</th><th>應有方向</th><th>老師這一節的決策</th></tr></thead><tbody>${out.timeline.map(t => `<tr><td>${t.no}</td><td>${t.items}${t.items < out.rules.minItems ? '（無效）' : ''}</td><td>${t.acc ?? '—'}%</td><td>${t.indepRate ?? '—'}%</td><td>${t.windowStart}</td><td><b>${S.DIRECTION[t.expected]}</b></td><td>${t.decisions.map(d => S.DIRECTION[d] || d).join('、')}</td></tr>`).join('')}</tbody></table>` : '<p>這位學生在這個活動還沒有紀錄。</p>';
    };
  }

  // ---------- AI 輸出核對：輸入資料與摘要並排 ----------
  async function drawAi() {
    const box = $('aiSection');
    box.innerHTML = `<h2>🤖 AI 輸出核對</h2><p class="subtle">每一次 AI 請求都留下輸入、輸出全文、模型與提示詞版本。核對一致率時，把摘要裡每一句可核對的敘述和左邊的資料對照。</p><button type="button" id="aiLoad">顯示最近的 AI 摘要</button><div id="aiOut"></div>`;
    $('aiLoad').onclick = async () => {
      let out; try { out = await S.api('/api/study/export?type=ai'); } catch { $('aiOut').textContent = '讀不到。'; return; }
      const list = out.rows.filter(r => r.task === 'summary').slice(0, 30);
      $('aiOut').innerHTML = list.length ? list.map(r => {
        let facts = []; try { facts = JSON.parse(r.input); } catch { /* 略過 */ }
        const table = `<table class="study-table"><thead><tr><th>節</th><th>題數</th><th>答對率</th><th>無提示步驟</th><th>提示</th><th>答錯</th></tr></thead><tbody>${facts.map(f => `<tr><td>${f.session}</td><td>${f.completed}</td><td>${f.supportedRate ?? '—'}%</td><td>${f.independentStepRate ?? '—'}%</td><td>${esc(Object.entries(f.hints || {}).map(([k, v]) => k + ' ' + v).join('、'))}${f.hintOrder ? '<br>順序：' + esc(f.hintOrder) : ''}</td><td>${esc(Object.entries(f.errors || {}).map(([k, v]) => k + ' ' + v).join('、'))}</td></tr>`).join('')}</tbody></table>`;
        return `<div class="scn-panel"><p class="subtle">#${r.id}・${esc(r.workspace)}・${esc(r.subject)}・${esc(r.model)}・${esc(r.promptVersion)}・${r.source === 'ai' ? 'AI' : '固定內容（' + esc(r.error) + '）'}・${esc(time(r.at))}</p><div class="study-grid" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr)"><div class="table-scroll">${table}</div><div class="ai-box">${esc(r.text)}</div></div></div>`;
      }).join('') : '<p>還沒有 AI 摘要。</p>';
    };
  }

  // ---------- 匯出 ----------
  function drawExport() {
    const box = $('exportSection');
    box.innerHTML = `<h2>⬇ 研究匯出（CSV）</h2><p class="subtle">文字欄位開頭是 = + - @ 時會加上 '，避免 Excel 當成公式。只有代號，沒有姓名。</p>
      <div class="actions"><button type="button" id="expDecisions">情境探試：每節決策</button><button type="button" id="expScenario">情境探試：每個情境的反應延遲與決策時間</button><button type="button" id="expAi">AI 輸出全文</button><button type="button" id="expChanges">真實學生的設定變更（所有教師）</button></div><p id="expMsg" class="msg" role="status"></p>`;
    const get = async type => { try { return (await S.api('/api/study/export?type=' + type)).rows; } catch { $('expMsg').textContent = '匯出失敗。'; return null; } };
    const consistent = r => ['increase', 'decrease', 'advance', 'maintain'].includes(r.expected) ? (r.direction === r.expected ? '是' : '否') : '不計';
    $('expDecisions').onclick = async () => {
      const rows = await get('decisions'); if (!rows) return;
      S.download(`scenario_decisions_${today()}.csv`, S.toCsv([['教師', '探試', '指派時階段', '情境組', '情境', '節次', '決定', '調整內容', '教師方向', '應有方向', '方向一致', '主要理由', '補充', 'AI摘要開啟', '用了AI摘要', '回查原始紀錄', '本節出現時間', '儲存時間', '總經過毫秒', '主動操作毫秒', '等AI毫秒'],
        ...rows.map(r => [r.teacher, r.probe, S.PHASE[r.phase] || r.phase, r.setId, r.scenario, r.sessionNo, r.decision, r.changes, S.DIRECTION[r.direction] || r.direction, S.DIRECTION[r.expected] || r.expected, consistent(r), S.REASON[r.reason] || r.reason, r.note, r.aiOn ? '是' : '否', r.aiUsed ? '是' : '否', r.rawViewed ? '是' : '否', new Date(r.shownAt).toISOString(), new Date(r.savedAt).toISOString(), r.totalMs, r.activeMs, r.aiWaitMs])]));
    };
    // 每個情境：規則一致回應率、反應延遲（觸發節次到第一次方向一致的節數）、決策時間（首次呈現到最後一次儲存）
    $('expScenario').onclick = async () => {
      const rows = await get('decisions'); if (!rows) return;
      const groups = new Map(); for (const r of rows) { const k = r.assignment + '|' + r.scenario; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
      const out = [...groups.values()].map(list => {
        const a = list[0], need = list.filter(r => ['increase', 'decrease', 'advance'].includes(r.expected)), hit = need.filter(r => r.direction === r.expected);
        const trigger = need[0], first = trigger && list.find(r => r.sessionNo >= trigger.sessionNo && r.direction === r.expected && ['increase', 'decrease', 'advance'].includes(r.expected));
        const keepRows = list.filter(r => r.expected === 'maintain');
        return [a.teacher, a.probe, S.PHASE[a.phase] || a.phase, a.setId, a.scenario, list.length, need.length, hit.length, need.length ? Math.round(hit.length / need.length * 100) : '', keepRows.length, keepRows.filter(r => r.direction === 'maintain').length,
          trigger ? trigger.sessionNo : '', trigger ? S.DIRECTION[trigger.expected] : '', first ? first.sessionNo : '', trigger ? (first ? first.sessionNo - trigger.sessionNo : '未調整') : '',
          Math.max(...list.map(r => r.savedAt)) - Math.min(...list.map(r => r.shownAt)), list.reduce((n, r) => n + r.activeMs, 0), list.reduce((n, r) => n + r.aiWaitMs, 0), list.filter(r => r.aiUsed).length, list.filter(r => r.rawViewed).length];
      });
      S.download(`scenario_summary_${today()}.csv`, S.toCsv([['教師', '探試', '指派時階段', '情境組', '情境', '已決策節數', '需調整的節數', '方向一致節數', '規則一致回應率(%)', '應維持的節數', '其中維持', '觸發節次', '觸發方向', '第一次方向一致的節次', '反應延遲(節)', '決策總經過毫秒', '主動操作毫秒', '等AI毫秒', '用AI摘要的節數', '回查原始紀錄的節數'], ...out]));
    };
    $('expAi').onclick = async () => {
      const rows = await get('ai'); if (!rows) return;
      S.download(`ai_outputs_${today()}.csv`, S.toCsv([['編號', '用途', '工作區', '對象', '提供者', '模型', '提示詞版本', '來源', '原因', '毫秒', '時間', '輸入', '輸出全文'], ...rows.map(r => [r.id, r.task, r.workspace, r.subject, r.provider, r.model, r.promptVersion, r.source === 'ai' ? 'AI' : '固定內容', r.error, r.ms, new Date(r.at).toISOString(), r.input, r.text])]));
    };
    $('expChanges').onclick = async () => {
      const rows = await get('changes'); if (!rows) return;
      S.download(`setting_changes_all_${today()}.csv`, S.toCsv([['工作區', '學生', '活動', '節次', '項目', '改前', '改後', '方向', '主要理由', '補充', '操作者', '時間'], ...rows.map(r => [r.workspace, r.student, r.act, r.sessionNo ?? '', S.FIELD[r.field] || r.field, r.before, r.after, S.DIRECTION[r.direction] || r.direction, S.REASON[r.reason] || r.reason, r.note, r.actor, new Date(r.at).toISOString()])]));
    };
  }
  start();
})();

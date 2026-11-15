'use strict';
// 第 26 版第二階段：研究管理（主持人帳號）。
// 研究階段切換、應有方向判準、情境組匯入與指派、真實學生的應有方向、AI 輸出核對、研究匯出。
(() => {
  const $ = id => document.getElementById(id);
  const S = window.areaStudy, esc = S.esc;
  const TEACHERS = Array.from({ length: 12 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
  const today = () => new Date().toISOString().slice(0, 10);
  const time = ms => ms ? new Date(ms).toLocaleString('zh-TW') : '';
  const RULE_TEXT = { lowAcc: '增加支持：支持下答對率低於（%）', highAcc: '減少支持／進階：支持下答對率達（%）', indep: '進階：無提示步驟比例達（%）', minItems: '有效節次：至少完成幾題', upN: '增加支持：最近連續幾節', downN: '減少支持／進階：最近連續幾節', maintainN: '維持：至少幾節有效資料', summaryChars: 'AI 摘要字數上限', stageUp: '小老師小方：前進的正確率（%）', stageDown: '小老師小方：退回的正確率低於（%）', stageN: '小老師小方：連續幾節', handsOnN: '示範階段連續幾節偏低就提示實物操作', teacherWait: '學生停頓幾秒小方提醒（再一倍提示老師）', tutorChars: '小方語句字數上限', showAdvice: '學生頁教師工具顯示「支持增減建議」（1 顯示，0 關閉）' };

  async function start() {
    try { const me = await S.api('/api/session'); if (!me.authenticated) { location.href = '/'; return; } if (!me.teacher || me.test) { $('status').textContent = '這一頁只給研究人員（主持人帳號）使用。'; return; } }
    catch { $('status').textContent = '讀不到登入狀態。'; return; }
    $('status').textContent = ''; $('body').hidden = false;
    drawPhases(); drawRules(); drawScenarios(); drawProbes(); drawDirection(); drawAi(); drawExport();
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

  // ---------- 探試題組：匯入（版本鎖定）、施測紀錄與計分 ----------
  async function drawProbes(note = '') {
    const box = $('probeSection');
    let sets, runs; try { sets = (await S.api('/api/probe/sets')).sets; runs = (await S.api('/api/study/export?type=probes')).rows; } catch { box.textContent = '讀不到探試題組。'; return; }
    const kind = { probe: '探試', generalization: '類化', practice: '操作練習' };
    const pct = v => v === null || v === undefined ? '—' : v + '%';
    box.innerHTML = `<h2>📝 探試題組</h2><p class="subtle">正式探試每份 10 題。面積：數格子 2、長方形 3、正方形 2、知道面積找邊長 1、複合圖形 2。表面積（題組寫 "package": "surface"）：一個面 1、長方體 3、正方體 2、柱體 2、反推 1、沒有蓋子 1。折線圖分兩份（題組寫 "package": "line"，再寫 "variant"）：讀圖 read（讀數值 4、給數值找時間 1、變化 2、兩條線 1、波浪線 1、選對圖 1）；畫圖 draw（描點 4、定刻度 2、兩條線 1、波浪線 1、選對圖 1、用圖說明 1）。一個題組可以有多份等值複本，網站依學生號碼錯開起點、每次換下一份。同一個代號和版本匯入後鎖定。</p>
      <label>匯入題組（.json）<input type="file" id="probeFile" accept="application/json,.json"></label><p id="probeMsg" class="msg" role="status">${esc(note)}</p>
      ${sets.length ? `<table class="study-table"><thead><tr><th>代號@版本</th><th>種類</th><th>名稱</th><th>複本數</th><th>每份題數</th></tr></thead><tbody>${sets.map(s => `<tr><td>${esc(s.id)}</td><td>${esc(kind[s.kind] || s.kind)}</td><td>${esc(s.title)}</td><td>${s.forms}</td><td>${s.items}</td></tr>`).join('')}</tbody></table>` : '<p>還沒有題組。</p>'}
      <h3>施測紀錄（最近 50 次）</h3>${runs.length ? `<div class="table-scroll"><table class="study-table"><thead><tr><th>學生</th><th>節次</th><th>階段</th><th>題組／複本</th><th>狀態</th><th>有效題數</th><th>首次提交正確率</th><th>獨立完成步驟</th><th>自行修正</th><th>分鐘</th><th>列為資料點</th></tr></thead><tbody>${runs.slice(-50).reverse().map(r => { const m = r.summary || {}; return `<tr><td>${esc(r.student)}</td><td>${r.sessionNo ?? ''}</td><td>${esc(S.PHASE[r.phase] || r.phase || '')}</td><td>${esc(r.setId)}／${esc(r.formId)}</td><td>${esc({ running: '進行中', done: '完成', timeout: '整份逾時', stopped: '老師結束' }[r.status] || r.status)}</td><td>${m.valid ?? ''}</td><td>${pct(m.firstSubmitAccuracy)}</td><td>${pct(m.independentStepRate)}</td><td>${m.errorSteps === 0 ? '無修正機會' : pct(m.selfCorrectionRate)}</td><td>${m.minutes ?? ''}</td><td>${m.dataPoint === undefined ? '' : m.dataPoint ? '是' : '否（有效題數少於 8）'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p>還沒有施測紀錄。</p>'}`;
    $('probeFile').onchange = async () => {
      const f = $('probeFile').files[0]; if (!f) return;
      let set; try { set = JSON.parse(await f.text()); } catch { $('probeMsg').textContent = '這個檔案不是 JSON。'; return; }
      try { const out = await S.api('/api/study/probe-sets', set); drawProbes('✓ 已匯入 ' + out.id); }
      catch (e) { $('probeMsg').textContent = e.message === 'version_locked' ? '這個代號和版本已經匯入過，內容鎖定。要修改請換版本號。' : '格式不對（正式探試每份要 10 題、題型比例固定），沒有匯入。'; }
    };
  }

  // ---------- 真實學生的應有方向（教師端看不到） ----------
  function drawDirection() {
    const box = $('directionSection');
    box.innerHTML = `<h2>🎯 真實學生每一節的應有方向</h2><p class="subtle">依目前的判準，用網站資料庫裡的紀錄計算；和老師在那一節的決策並列。</p>
      <div class="study-grid"><label>學生代號<input id="dirStudent" placeholder="T01-S01" maxlength="7"></label><label>活動<select id="dirAct">${Object.values(window.areaActs.packages).flatMap(p => p.activities).map(a => `<option value="${a.id}"${a.id === 'rectangle' ? ' selected' : ''}>${esc(S.actName(a.id))}</option>`).join('')}</select></label></div>
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
      <div class="actions"><button type="button" id="expDecisions">情境探試：每節決策</button><button type="button" id="expScenario">情境探試：每個情境的反應延遲與決策時間</button><button type="button" id="expProbes">探試：每次施測</button><button type="button" id="expProbeItems">探試：每題每步</button><button type="button" id="expTutor">小老師小方：支持階段變更</button><button type="button" id="expAi">AI 輸出全文</button><button type="button" id="expChanges">真實學生的設定變更（所有教師）</button></div><h3>研究紀錄篩選匯出</h3><div class="study-grid"><label>學生代號（空白＝全部）<input id="evStudent" placeholder="T01-S01" maxlength="7"></label><label>研究階段<select id="evPhase"><option value="">全部</option>${['A', 'B', 'BC', 'maintain', 'baseline', 'intervention', 'followup'].map(p => `<option value="${p}">${S.PHASE[p]}</option>`).join('')}</select></label><label>從第幾節<input id="evFrom" type="number" min="1" value="1"></label><label>到第幾節<input id="evTo" type="number" min="1" placeholder="最後"></label></div>
      <button type="button" id="expEvents">匯出篩選後的研究紀錄</button><p id="expMsg" class="msg" role="status"></p>`;
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
    const pct = v => v ?? '';
    $('expProbes').onclick = async () => {
      const rows = await get('probes'); if (!rows) return;
      S.download(`probe_runs_${today()}.csv`, S.toCsv([['工作區', '學生', '節次', '階段', '題組', '複本', '狀態', '開始', '結束', '分鐘', '題數', '有效題數', '答對題數', '首次提交正確率(%)', '可評分步驟', '獨立完成步驟', '獨立完成步驟比例(%)', '曾出現錯誤的步驟', '自行修正步驟', '自行修正比例(%)', '逾時題數', '沒作答題數', '技術缺測題數', '列為資料點'],
        ...rows.map(r => { const m = r.summary || {}; return [r.workspace, r.student, r.sessionNo ?? '', S.PHASE[r.phase] || r.phase, r.setId, r.formId, r.status, new Date(r.startedAt).toISOString(), r.endedAt ? new Date(r.endedAt).toISOString() : '', m.minutes ?? '', m.items ?? '', m.valid ?? '', m.correct ?? '', pct(m.firstSubmitAccuracy), m.scorableSteps ?? '', m.independentSteps ?? '', pct(m.independentStepRate), m.errorSteps ?? '', m.selfCorrected ?? '', m.errorSteps === 0 ? '無修正機會' : pct(m.selfCorrectionRate), m.timedOut ?? '', m.unanswered ?? '', m.tech ?? '', m.dataPoint === undefined ? '' : m.dataPoint ? '是' : '否']; })]));
    };
    $('expProbeItems').onclick = async () => {
      const rows = await get('probeItems'); if (!rows) return;
      const yn = v => v === null || v === undefined ? '' : v ? '是' : '否';
      S.download(`probe_items_${today()}.csv`, S.toCsv([['學生', '節次', '階段', '題組', '複本', '第幾題', '題目', '題型', '答對（答案與單位）', '答案對', '單位對', '取量對', '列式對', '逾時', '技術缺測', '秒數', '步驟', '步驟角色', '有作答', '第一次就對', '最後對', '曾出現錯誤', '自行修正', '最後的答案'],
        ...rows.flatMap(r => r.result.steps.map(s => [r.student, r.sessionNo ?? '', S.PHASE[r.phase] || r.phase, r.setId, r.formId, r.idx + 1, r.itemId, r.result.type, yn(r.result.correct), yn(r.result.answerCorrect), yn(r.result.unitCorrect), yn(r.result.measureCorrect), yn(r.result.formulaCorrect), yn(r.result.timedOut), yn(r.result.tech), r.result.secs ?? '', s.key, s.role, yn(s.answered), yn(s.firstCorrect), yn(s.finalCorrect), yn(s.hadError), yn(s.selfCorrected), s.final ?? '']))]));
    };
    const STAGE = { demo: '示範', guided: '陪做', faded: '撤除' }, WHY = { up: '連續達標，前進', down: '連續偏低，退回', nextActivity: '撤除階段達標，可進入下一個活動', handsOn: '示範階段持續偏低，加入實物操作' };
    $('expTutor').onclick = async () => {
      const rows = await get('tutor'); if (!rows) return;
      S.download(`tutor_stages_${today()}.csv`, S.toCsv([['工作區', '學生', '活動', '節次', '原階段', '新階段', '原因', '各節正確率', '時間'], ...rows.map(r => { let h = []; try { h = JSON.parse(r.detail).history || []; } catch { /* 略過 */ } return [r.workspace, r.student, r.act, r.sessionNo, STAGE[r.fromStage] || r.fromStage, STAGE[r.toStage] || r.toStage, WHY[r.reason] || r.reason, h.map(x => `第${x.no}節 ${x.acc}%`).join('、'), new Date(r.at).toISOString()]; })]));
    };
    $('expEvents').onclick = async () => {
      const student = $('evStudent').value, phase = $('evPhase').value, from = Number($('evFrom').value || 1), to = Number($('evTo').value || 9999);
      let rows; try { rows = (await S.api(`/api/study/export?type=events&student=${encodeURIComponent(student.trim().toUpperCase())}&phase=${encodeURIComponent(phase.trim())}&from=${from}&to=${to}`)).rows; } catch { $('expMsg').textContent = '匯出失敗，請檢查代號。'; return; }
      const keys = [...new Set(rows.flatMap(e => Object.keys(e)))], obs = window.areaObs;
      S.download(`research_events_${today()}.csv`, S.toCsv([[...keys, 'obsLabel', 'obsCandidate'], ...rows.map(e => { let o = ''; try { o = JSON.parse(e.detail || '{}').obs || ''; } catch { /* 略過 */ } return [...keys.map(k => typeof e[k] === 'object' ? JSON.stringify(e[k]) : e[k]), o && obs ? obs.label(o) : '', o && obs ? obs.candidate(o) : '']; })]));
      $('expMsg').textContent = `已匯出 ${rows.length} 筆。`;
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

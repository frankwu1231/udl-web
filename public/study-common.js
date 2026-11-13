'use strict';
// 第 26 版第二階段：研究管理頁（study.html）與教師情境探試頁（scenario.html）共用的文字與小工具。
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DIRECTION = { increase: '增加支持', decrease: '減少支持', advance: '進階', maintain: '維持', load: '任務負荷', mixed: '有增有減', other: '其他', insufficient: '資料不足' };
  const REASONS = [['lowAccuracy', '答對率偏低'], ['manyHints', '提示用得多'], ['accurateButHints', '答對率高，但還靠提示'], ['independent', '已能獨立完成'], ['engagement', '情緒或專注'], ['taskLoad', '題量或流程負荷'], ['other', '其他']];
  const REASON = Object.fromEntries(REASONS);
  const PHASE = { baseline: '基線期', intervention: '介入期', followup: '追蹤期', A: 'A 基線', B: 'B 介入', BC: 'BC 介入＋小老師小方', maintain: '維持期' };
  const FIELD = { support: '提示', mode: '教學階段', methods: '可用方法', video: '示範影片時機', tryFirst: '先試一次', lessonGoal: '題數', flow: '解題流程', to: '活動' };
  const VALUE = {
    support: { full: '完整引導', faded: '減少提示' },
    mode: { demo: '老師示範', together: '一起做', self: '自己做' },
    video: { always: '一開始就可以看', hint: '看完提示後才可以看', off: '不提供' },
    flow: { seven: '7 步完整', three: '3 步精簡', custom: '教師自訂' },
    methods: { mark: '逐格點數', row: '一排一排累加', self: '自己想' }
  };
  const SAVE_ERR = { one_step_only: '減少支持一次只能調一級（例如只關掉一種方法，或示範只晚一步）。', no_change: '設定沒有改變。若要維持，請按「維持原設定」。', wrong_session: '這一節已經存過了，請重新整理頁面。', invalid_input: '還沒選主要理由，或設定不完整。', summary_off: '這個階段沒有 AI 摘要。' };
  const value = (k, v) => k === 'methods' ? (v || []).map(x => VALUE.methods[x] || x).join('、') || '（無）' : k === 'tryFirst' ? (v ? '開' : '關') : k === 'lessonGoal' ? (v ? v + ' 題' : '不限') : k === 'to' ? actName(v) : (VALUE[k] && VALUE[k][v]) || String(v ?? '');
  const SHOW = ['mode', 'support', 'methods', 'video', 'tryFirst', 'lessonGoal', 'flow'];
  const settingsText = s => SHOW.map(k => `${FIELD[k]}：${value(k, s[k])}`).join('｜');
  const actName = id => { const a = window.areaActs && window.areaActs.info(id); return a ? `${a.no} ${a.title}` : id || ''; };

  // 支持設定的表單：欄位與學生頁「教師觀察」相同（越上面越具體）
  function settingsForm(s) {
    const opt = (k, list) => list.map(v => `<option value="${v}"${s[k] === v ? ' selected' : ''}>${VALUE[k][v]}</option>`).join('');
    const m = s.methods || [];
    return `<div class="setting-form">
      <label>教學階段<select data-set="mode">${opt('mode', ['demo', 'together', 'self'])}</select></label>
      <label>提示<select data-set="support">${opt('support', ['full', 'faded'])}</select></label>
      <fieldset><legend>可用方法（越上面越具體）</legend>${['mark', 'row', 'self'].map(v => `<label class="check"><input type="checkbox" data-method="${v}"${m.includes(v) ? ' checked' : ''}> ${VALUE.methods[v]}</label>`).join('')}</fieldset>
      <label>示範影片出現的時機<select data-set="video">${opt('video', ['always', 'hint', 'off'])}</select></label>
      <label class="check"><input type="checkbox" data-set="tryFirst"${s.tryFirst ? ' checked' : ''}> 先試一次再看下一層提示</label>
      <label>這次做幾題<select data-set="lessonGoal">${[0, 3, 5, 8, 10].map(n => `<option value="${n}"${Number(s.lessonGoal || 0) === n ? ' selected' : ''}>${n ? n + ' 題' : '不限'}</option>`).join('')}</select></label>
      <label>解題流程<select data-set="flow">${opt('flow', ['seven', 'three'])}</select></label></div>`;
  }
  // 只回傳和原本不一樣的欄位
  function readSettings(box, s) {
    const out = {};
    box.querySelectorAll('[data-set]').forEach(el => { const k = el.dataset.set, v = el.type === 'checkbox' ? el.checked : k === 'lessonGoal' ? Number(el.value) : el.value; if (JSON.stringify(v) !== JSON.stringify(k === 'tryFirst' ? !!s[k] : k === 'lessonGoal' ? Number(s[k] || 0) : s[k])) out[k] = v; });
    const m = [...box.querySelectorAll('[data-method]')].filter(x => x.checked).map(x => x.dataset.method);
    const order = l => [...l].sort((a, b) => ['mark', 'row', 'self'].indexOf(a) - ['mark', 'row', 'self'].indexOf(b));
    if (m.length && JSON.stringify(m) !== JSON.stringify(order(s.methods || []))) out.methods = m;
    return out;
  }

  const csvSafe = v => { const t = String(v ?? ''); return /^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t) ? "'" + t : t; };
  const toCsv = rows => '﻿' + rows.map(r => r.map(v => '"' + csvSafe(v).replaceAll('"', '""') + '"').join(',')).join('\r\n');
  function download(name, text, type = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 120000);
  }
  async function api(path, body, method) {
    const res = await fetch(path, body === undefined ? { cache: 'no-store', method: method || 'GET' } : { method: method || 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    let out = {}; try { out = await res.json(); } catch { /* 略過 */ }
    if (!res.ok) { const e = new Error(out.error || 'failed'); e.data = out; e.status = res.status; throw e; }
    return out;
  }

  // 一節的紀錄整理成老師看得懂的表：每題每一步第一次的結果、用到的提示、答錯的事實
  function sessionTable(rows, act) {
    const ops = rows.filter(r => r.sheet === '操作紀錄' && (!act || r.actId === act));
    const detail = r => { try { return typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail || {}; } catch { return {}; } };
    const cycles = [...new Set(ops.map(r => r.cycle))];
    const obs = window.areaObs;
    const lines = cycles.map(c => {
      const list = ops.filter(r => r.cycle === c), done = list.find(r => r.event === '整題完成'), steps = new Map();
      for (const r of list) if (r.event === '步驟檢核') { const s = steps.get(r.step) || []; s.push(r); steps.set(r.step, s); }
      const marks = [...steps.entries()].sort((a, b) => a[0] - b[0]).map(([s, l]) => { const first = l[0], ok = first.correct === '是' || first.correct === true; return `<span class="mark ${ok ? 'ok' : 'no'}" title="第 ${s} 步${ok ? '：第一次就對' : '：' + (obs ? obs.label(detail(first).obs) : '答錯')}">${ok ? '✓' : '✗'}</span>`; }).join('');
      const errs = list.filter(r => r.event === '步驟檢核' && !(r.correct === '是' || r.correct === true)).map(r => obs ? obs.label(detail(r).obs) : '答錯');
      const maxHint = done ? detail(done).maxHintLevel ?? '' : '';
      return `<tr><td>${esc(c)}</td><td>${marks}</td><td>${maxHint === '' ? '' : maxHint ? '第 ' + maxHint + ' 層' : '沒用'}</td><td>${done ? '完成' : '沒做完'}</td><td>${esc([...new Set(errs)].join('、'))}</td></tr>`;
    });
    return `<table class="study-table"><thead><tr><th>題</th><th>每一步第一次的結果</th><th>用到最高的提示</th><th>結果</th><th>答錯時看到的事實</th></tr></thead><tbody>${lines.join('')}</tbody></table>`;
  }

  window.areaStudy = { esc, DIRECTION, REASONS, REASON, PHASE, FIELD, VALUE, SAVE_ERR, value, settingsText, settingsForm, readSettings, actName, toCsv, download, api, sessionTable };
})();

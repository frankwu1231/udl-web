'use strict';
// 現場試用紀錄（第 22 版）：把學生頁的紀錄加上教師代號、學生代號，自動上傳到老師的 Google 試算表（Apps Script）。
// - 上課前老師點號碼選代號（T01、T01-S03），不打姓名；姓名清單只存在這台電腦，用來擋下誤填的姓名。
// - 紀錄先放進這台電腦的上傳佇列，每做完一題、每 30 秒、離開頁面時上傳；斷線就留著，連上再補傳。
// - 老師的即時按鈕、學生每題的心情、換學生前的 3 題、每節課的教師短表，都寫進同一份試算表。
// 學生頁（seven.js）用 areaResearch.init() 交出教材設定與 log()；每筆 log() 都會經過 areaResearch.record()。
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VERSION = 'v22';
  const WHO_KEY = 'area-research-who-v22', QUEUE_KEY = 'area-research-queue-v22', NAMES_KEY = 'area-research-names-v22', SENT_KEY = 'area-research-sent-v22';
  const MAX_ROWS = 40;            // 一次最多傳幾筆（keepalive 有 64 KB 上限）
  const FLUSH_EVERY = 30000;
  const QUICK = [['help', '🙋 老師幫忙了'], ['wrongBuddy', '❌ 小方這次不準'], ['distracted', '😶 分心'], ['engaged', '🙂 很投入'], ['tech', '⚠️ 技術問題']];
  const MOODS = [['great', '😀', '很好'], ['ok', '🙂', '還好'], ['meh', '😐', '普通'], ['sad', '🙁', '不好']];
  const END_QS = [
    ['fun', '今天的數學好玩嗎？', [['yes', '😀 好玩'], ['soso', '😐 還好'], ['no', '🙁 不好玩']]],
    ['buddyHelp', '小方有幫到你嗎？', [['yes', '😀 有'], ['soso', '😐 一點點'], ['no', '🙁 沒有']]],
    ['camFeel', '小方提醒你看螢幕，你覺得怎麼樣？', [['fine', '😀 還好'], ['bit', '😐 有一點煩'], ['annoyed', '🙁 很煩'], ['none', '沒有遇到']]]
  ];
  const TEACHER_QS = [
    ['engage', '學生今天投入的程度', [['5', '5 很投入'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1 不投入']]],
    ['timing', '小方提醒的時機', [['early', '太早'], ['right', '剛好'], ['late', '太晚'], ['none', '沒有出現']]],
    ['buddyUseful', '小方的提醒對學生有幫助', [['5', '5 很有幫助'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1 沒有幫助']]],
    ['camAccurate', '鏡頭專心提醒準不準', [['good', '很準'], ['some', '有時誤判'], ['often', '常常誤判'], ['off', '沒有使用']]],
    ['assists', '我今天需要介入幾次', [['0', '0 次'], ['1-2', '1～2 次'], ['3-5', '3～5 次'], ['6+', '6 次以上']]]
  ];

  let cfg = null, api = null, who = null, sending = false, lastActivity = '';
  const load = (store, key, fallback) => { try { const v = JSON.parse(store.getItem(key) || 'null'); return v ?? fallback; } catch { return fallback; } };
  const keep = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch { /* 無法儲存時只留在本頁 */ } };
  const queue = () => load(localStorage, QUEUE_KEY, []);
  const setQueue = q => { keep(localStorage, QUEUE_KEY, q); paintCount(); };
  const rid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const pad = n => String(n).padStart(2, '0');
  const local = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const on = () => !!cfg && !!who && !who.off;

  // ---------- 擋下姓名：姓名清單只存在這台電腦 ----------
  const names = () => load(localStorage, NAMES_KEY, []).filter(n => typeof n === 'string' && n.trim().length >= 2);
  function scrub(value, hits) {
    if (typeof value === 'string') { let v = value; for (const n of names()) if (v.includes(n)) { v = v.split(n).join('○○'); hits.push(n); } return v; }
    if (Array.isArray(value)) return value.map(x => scrub(x, hits));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, hits)]));
    return value;
  }

  // ---------- 上傳佇列 ----------
  function enqueue(sheet, data) {
    if (!on()) return;
    const hits = [], row = scrub({ rid: rid(), sheet, time: local(Date.now()), version: VERSION, sessionId: who.sessionId, teacher: who.teacher, student: who.student, ...data }, hits);
    if (hits.length) toast('紀錄裡有學生姓名，已改成「○○」再上傳。請只寫代號。');
    setQueue(queue().concat(row));
  }
  async function flush(keepalive = false) {
    if (!cfg || sending) return;
    const q = queue(); if (!q.length) return;
    if (!navigator.onLine) { paintCount('離線，連上網路後會補傳'); return; }
    sending = true;
    const batch = q.slice(0, MAX_ROWS);
    try {
      const res = await fetch(cfg.url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: cfg.key, rows: batch }), keepalive, cache: 'no-store', redirect: 'follow' });
      const out = await res.json();
      if (!out || !out.ok) throw new Error(out && out.error || 'upload_failed');
      const done = new Set(out.saved || batch.map(r => r.rid));
      setQueue(queue().filter(r => !done.has(r.rid)));
      keep(sessionStorage, SENT_KEY, (load(sessionStorage, SENT_KEY, 0) || 0) + done.size);
      paintCount();
      if (queue().length && !keepalive) { sending = false; return flush(); }
    } catch (e) {
      paintCount(e && e.message === 'bad_key' ? '通行碼不對，請老師到教師備課檢查' : '上傳失敗，稍後自動再試');
    } finally { sending = false; }
  }
  setInterval(() => flush(), FLUSH_EVERY);
  addEventListener('online', () => flush());
  addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });

  // ---------- 技術問題：自動記下（同一則訊息只記一次，一次最多 20 則） ----------
  const techSeen = new Set();
  function tech(kind, message) {
    const k = kind + message; if (techSeen.has(k) || techSeen.size >= 20) return; techSeen.add(k);
    enqueue('技術問題', { kind, message: String(message).slice(0, 300), page: location.pathname + location.search, browser: navigator.userAgent.slice(0, 200), online: navigator.onLine });
  }
  addEventListener('error', e => tech('頁面錯誤', e.message || 'error'));
  addEventListener('unhandledrejection', e => tech('頁面錯誤', (e.reason && e.reason.message) || String(e.reason)));
  addEventListener('offline', () => tech('網路', '斷線'));

  // ---------- 每一筆學生頁紀錄 ----------
  // 第 22 版小方、專心提醒、SRL、提示等都在 seven.js 的 log() 裡，這裡統一轉成試算表的列
  function record(r) {
    if (!on()) return;
    r.teacherId = who.teacher; r.studentId = who.student; r.sessionId = who.sessionId;
    const base = { activity: r.shape || '', actId: r.actId || '', cycle: r.cycle ?? '', step: r.activity ?? '', stepTitle: r.stepTitle || '', event: r.event, mode: r.mode || '', studyPhase: r.studyPhase || '' };
    if (r.event === '教師觀察' || r.event === '教師即時紀錄') enqueue('教師觀察', { ...base, kind: r.event, tag: r.tagText || '', phase: r.phase || '', level: r.level || '', buddyReact: r.buddyReact || '', note: r.evidence || r.note || '' });
    if (r.event === '學生心情' || r.event === '學生回饋') enqueue('學生回饋', { ...base, kind: r.event, mood: r.moodText || '', fun: r.funText || '', buddyHelp: r.buddyHelpText || '', camFeel: r.camFeelText || '' });
    if (r.event === '小幫手' && r.action === '鏡頭打不開') tech('鏡頭', r.error || '鏡頭打不開');
    const { time, shape, shapeKey, actId, cycle, activity, stepTitle, event, mode, studyPhase, teacherId, studentId, sessionId, ...rest } = r;
    enqueue('操作紀錄', { ...base, correct: r.correct === undefined ? '' : r.correct ? '是' : '否', hintLevel: r.hintLevel ?? '', action: r.action || '', detail: JSON.stringify(rest).slice(0, 1500) });
    if (r.event === '整題完成') { summary(r); setTimeout(askMood, 600); flush(); }
  }
  // 每題摘要：這一題裡小方、專心提醒、老師幫忙各幾次
  function summary(r) {
    const all = api.records().filter(x => x.cycle === r.cycle && (x.actId || x.shapeKey) === (r.actId || r.shapeKey) && x.sessionId === who.sessionId);
    const count = (ev, actions) => all.filter(x => x.event === ev && (!actions || actions.includes(x.action || x.tag))).length;
    enqueue('每題摘要', { activity: r.shape || '', actId: r.actId || '', cycle: r.cycle, mode: r.mode || '', studyPhase: r.studyPhase || '', secs: r.secs ?? '', errors: r.errors ?? '', hints: r.hints ?? '', firstTry: r.firstTry ?? '', steps: r.steps ?? '',
      goal: r.goal || '', goalMet: r.goalMet === undefined ? '' : r.goalMet ? '是' : '否', selfMet: r.selfMet || '', confidence: r.confidence || '', badges: (r.badges || []).join('、'),
      buddyOffers: count('小幫手', ['主動問要不要幫忙', '同一步做很久']), buddyAccepted: count('小幫手', ['接受提示', '小幫手：接受']), buddyStuck: count('小幫手', ['主動打開我卡住了', '連續答錯，打開我卡住了']),
      attentionReminds: count('小幫手', ['專心提醒']), teacherHelp: count('教師即時紀錄', ['help']), buddyWrong: count('教師即時紀錄', ['wrongBuddy']), stuckPressed: count('我卡住了') });
  }
  // 老師這次的設定：每個活動每次上課記一筆，設定改了再記
  function settingsRow() {
    const s = api.settings(), act = api.activity();
    if (!act.id) return;
    const pick = ['mode', 'support', 'flow', 'difficulty', 'buddy', 'buddyWait', 'buddyVoice', 'attention', 'attentionSec', 'zhuyin', 'textSize', 'contrast', 'video', 'ai', 'fading', 'selfAsk', 'rest'];
    const snap = Object.fromEntries(pick.map(k => [k, s[k]])), key = act.id + JSON.stringify(snap);
    if (key === lastActivity) return; lastActivity = key;
    enqueue('教師設定', { activity: act.name, actId: act.id, ...Object.fromEntries(pick.map(k => [k, typeof snap[k] === 'boolean' ? (snap[k] ? '開' : '關') : snap[k] ?? ''])), cameraConsent: who.camera ? '是' : '否' });
  }

  // ---------- 畫面 ----------
  function toast(text) {
    let t = $('researchToast'); if (!t) { t = document.createElement('p'); t.id = 'researchToast'; t.className = 'research-toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = text; t.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
  }
  function paintCount(note) {
    const el = $('researchCount'); if (!el) return;
    const n = queue().length;
    el.textContent = note || (n ? `還有 ${n} 筆沒上傳` : '✓ 都上傳了');
    el.classList.toggle('warn', !!note || n > 20);
  }
  function bar() {
    let el = $('researchBar');
    if (!on()) { el?.remove(); return; }
    if (!el) { el = document.createElement('section'); el.id = 'researchBar'; el.className = 'research-bar'; el.setAttribute('aria-label', '現場試用紀錄（老師用）'); (document.querySelector('nav.aids') || document.body.firstChild).after(el); }
    el.innerHTML = `<p class="who"><b>📋 ${esc(who.student)}</b><span>${esc(who.device)}・${esc(who.group)}${who.camera ? '・📷 可用鏡頭' : ''}</span></p>
      <div class="quick">${QUICK.map(([k, t]) => `<button type="button" data-quick="${k}">${t}</button>`).join('')}</div>
      <div class="ops"><span id="researchCount" class="count"></span><button type="button" id="researchFlush">立即上傳</button><button type="button" id="researchNext">換學生</button><button type="button" id="researchClass">📝 這節課結束</button></div>`;
    el.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
      const k = b.dataset.quick, t = QUICK.find(x => x[0] === k)[1];
      api.log('教師即時紀錄', { activity: api.step(), tag: k, tagText: t.replace(/^\S+\s/, '') });
      toast('已記下：' + t);
    });
    $('researchFlush').onclick = () => { paintCount('上傳中……'); flush(); };
    $('researchNext').onclick = endStudent;
    $('researchClass').onclick = teacherForm;
    paintCount();
  }
  function dialog(id, html) {
    let d = $(id); if (!d) { d = document.createElement('dialog'); d.id = id; d.className = 'research-dialog'; document.body.append(d); }
    d.innerHTML = html; if (!d.open) d.showModal(); return d;
  }
  const pickRow = (name, items, cur) => `<div class="pick" role="radiogroup" data-pick="${name}">${items.map(([v, t]) => `<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${cur === v}">${esc(t)}</button>`).join('')}</div>`;
  function bindPicks(d, state) {
    d.querySelectorAll('[data-pick]').forEach(g => g.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      state[g.dataset.pick] = b.dataset.v; g.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    }));
  }

  // 上課前：老師點號碼選代號（不用打字），也可以選「老師自己試用」不記錄
  function chooseWho() {
    const t = Math.max(1, Math.min(12, cfg.teachers || 4)), n = Math.max(1, Math.min(20, cfg.students || 6));
    const st = { teacher: who && !who.off ? who.teacher : '', num: '', device: who && who.device || '平板', group: who && who.group || '一對一', camera: '' };
    const d = dialog('researchWho', `<h2>📋 現場試用：請老師選代號</h2>
      <p class="subtle">只用代號，不寫姓名。代號和姓名的對照請老師自己保存。</p>
      <h3>教師代號</h3>${pickRow('teacher', Array.from({ length: t }, (_, i) => { const c = 'T' + pad(i + 1); return [c, c]; }), st.teacher)}
      <h3>學生號碼</h3>${pickRow('num', Array.from({ length: n }, (_, i) => [pad(i + 1), String(i + 1)]), '')}
      <h3>使用的裝置</h3>${pickRow('device', [['平板', '平板'], ['電腦', '電腦'], ['手機', '手機']], st.device)}
      <h3>上課形式</h3>${pickRow('group', [['一對一', '一對一'], ['小組', '小組'], ['全班', '全班']], st.group)}
      <h3>家長同意使用鏡頭嗎？</h3>${pickRow('camera', [['yes', '同意'], ['no', '不同意或不確定']], '')}
      <details class="names"><summary>擋下誤填的姓名（只存在這台電腦，不會上傳）</summary><label for="researchNames">一行一個姓名或暱稱：</label><textarea id="researchNames" rows="4">${esc(names().join('\n'))}</textarea></details>
      <p id="researchWhyNot" class="feedback" role="alert" hidden></p>
      <div class="actions"><button type="button" id="researchStart" class="primary">開始記錄</button><button type="button" id="researchSkip">老師自己試用（不記錄）</button></div>`);
    bindPicks(d, st);
    const saveNames = () => keep(localStorage, NAMES_KEY, $('researchNames').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean));
    d.oncancel = e => e.preventDefault();   // 一定要選一個，避免沒有代號的紀錄
    $('researchStart').onclick = () => {
      const miss = [['teacher', '教師代號'], ['num', '學生號碼'], ['camera', '鏡頭同意']].filter(([k]) => !st[k]).map(x => x[1]);
      if (miss.length) { $('researchWhyNot').textContent = '請選：' + miss.join('、'); $('researchWhyNot').hidden = false; return; }
      saveNames();
      const student = `${st.teacher}-S${st.num}`, now = new Date();
      who = { teacher: st.teacher, student, device: st.device, group: st.group, camera: st.camera === 'yes', sessionId: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${student}-${Math.random().toString(36).slice(2, 6)}`, startedAt: Date.now() };
      keep(sessionStorage, WHO_KEY, who);
      enqueue('場次', { kind: '開始', device: who.device, group: who.group, cameraConsent: who.camera ? '是' : '否', hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), browser: navigator.userAgent.slice(0, 200), screen: `${screen.width}x${screen.height}` });
      d.close(); lastActivity = ''; window.areaBuddy?.newStudent(); bar(); settingsRow(); api.changed(); flush();
    };
    $('researchSkip').onclick = () => { saveNames(); who = { off: true }; keep(sessionStorage, WHO_KEY, who); d.close(); window.areaBuddy?.newStudent(); bar(); api.changed(); };
  }

  // 每做完一題：學生選一個表情（可以跳過）
  function askMood() {
    if (!on() || document.querySelector('dialog[open]')) return;
    const d = dialog('researchMood', `<h2 data-say>這一題，你覺得怎麼樣？</h2><div class="moods">${MOODS.map(([v, e, t]) => `<button type="button" data-mood="${v}"><span aria-hidden="true">${e}</span>${t}</button>`).join('')}</div><button type="button" id="researchMoodSkip" class="skip">跳過</button>`);
    d.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => { const m = MOODS.find(x => x[0] === b.dataset.mood); api.log('學生心情', { activity: 7, mood: m[0], moodText: m[1] + ' ' + m[2] }); d.close(); toast('謝謝你！'); });
    $('researchMoodSkip').onclick = () => d.close();
  }
  // 換學生前：學生回答 3 題（可以跳過），上傳後讓老師選下一位
  function endStudent() {
    const st = {};
    const qs = END_QS.filter(([k]) => k !== 'camFeel' || who.camera);
    const d = dialog('researchEnd', `<h2>做完了！回答 ${qs.length} 個問題</h2>${qs.map(([k, q, items]) => `<h3 data-say>${q}</h3>${pickRow(k, items, '')}`).join('')}
      <div class="actions"><button type="button" id="researchEndSave" class="primary">送出，換下一位</button><button type="button" id="researchEndSkip">跳過問題，換下一位</button><button type="button" id="researchEndBack">還沒做完，回去</button></div>`);
    bindPicks(d, st);
    const next = () => { enqueue('場次', { kind: '結束', minutes: Math.round((Date.now() - who.startedAt) / 60000) }); flush(); d.close(); who = null; try { sessionStorage.removeItem(WHO_KEY); } catch { /* 略過 */ } bar(); chooseWho(); };
    $('researchEndSave').onclick = () => {
      const text = k => { const q = END_QS.find(x => x[0] === k); return st[k] ? q[2].find(x => x[0] === st[k])[1] : ''; };
      if (Object.keys(st).length) api.log('學生回饋', { activity: api.step(), fun: st.fun || '', funText: text('fun'), buddyHelp: st.buddyHelp || '', buddyHelpText: text('buddyHelp'), camFeel: st.camFeel || '', camFeelText: text('camFeel') });
      next();
    };
    $('researchEndSkip').onclick = next;
    $('researchEndBack').onclick = () => d.close();
  }
  // 每節課結束：老師填短表
  function teacherForm() {
    const st = {};
    const d = dialog('researchTeacher', `<h2>📝 這節課的教師回饋（${esc(who.teacher)}）</h2>${TEACHER_QS.map(([k, q, items]) => `<h3>${q}</h3>${pickRow(k, items, '')}`).join('')}
      <label for="researchFix">今天最需要改的地方（請勿寫學生姓名）</label><textarea id="researchFix" rows="3" maxlength="500"></textarea>
      <div class="actions"><button type="button" id="researchTeacherSave" class="primary">送出</button><button type="button" id="researchTeacherBack">取消</button></div>`);
    bindPicks(d, st);
    $('researchTeacherSave').onclick = () => {
      const text = k => { const q = TEACHER_QS.find(x => x[0] === k); return st[k] ? q[2].find(x => x[0] === st[k])[1] : ''; };
      enqueue('教師回饋', { ...Object.fromEntries(TEACHER_QS.map(([k]) => [k, text(k)])), fix: $('researchFix').value.trim() });
      flush(); d.close(); toast('謝謝老師，已記下。');
    };
    $('researchTeacherBack').onclick = () => d.close();
  }

  window.areaResearch = {
    // a：records()、settings()、activity()、step()、log(e, x)、changed()（代號或鏡頭同意改了，請學生頁重畫）
    init(config, a) {
      api = a;
      if (!config || !config.url || !config.key) return;
      cfg = config; who = load(sessionStorage, WHO_KEY, null);
      if (!who) chooseWho(); else { bar(); settingsRow(); }
      flush();
    },
    record,
    page() { if (on()) settingsRow(); },
    cameraAllowed: () => !cfg || !!(who && (who.off || who.camera)),   // 試用時：選好代號、家長同意才開鏡頭
    active: on,
    // 測試與教師說明用
    flush, pending: () => queue().length, VERSION
  };
})();

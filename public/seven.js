'use strict';
// 學生解題頁（第 22 版：學習小幫手；第 21 版：例題逐步留空；第 20 版：每步自問、我卡住了、鍵盤操作；第 19 版：學習地圖與新活動；第 18 版：自我調整循環、教學階段、閱讀輔助）
(() => {
  const $ = id => document.getElementById(id);
  const F = window.learningFlow, C = window.lessonContent;
  const names = { rectangle: '長方形', square: '正方形', triangle: '三角形', parallelogram: '平行四邊形' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEYS = ['target', 'count', 'first', 'second', 'formula', 'total', 'unit'];   // 每個活動的代表欄位

  const ACT = window.areaActs, params = new URLSearchParams(location.search);
  let lessons, type = params.get('a') || params.get('shape');
  if (!(names[type] || (ACT && ACT.get(type)))) type = null;
  // 新活動（外掛）；原本的圖形解題時為 null。有些步驟只在老師開啟時出現（例如平方公尺換算）
  const P = () => { const pl = ACT && type && ACT.get(type); if (!pl) return null; return pl.steps.some(x => x.when) ? { ...pl, steps: pl.steps.filter(x => !x.when || x.when(settings)) } : pl; };
  const nameOf = (k = type) => names[k] || ((ACT && ACT.info(k)) || {}).title || '';
  const draftQ = params.get('draft') === '1' ? '&draft=1' : '';
  let pProblem = null, pState = {}, keepProblem = false, isTeacher = false;
  let index = 0, cycle = 1, phase = 'plan', page = 0, settings = { ...F.defaults };
  let goal = 'check', method = 'mark', response = '自行操作';
  let answers = {}, checked = new Set(), orders = {}, frame = 0, tiles = [], revealed = {}, lineOk = false;
  let hintLevel = [0, 0, 0, 0, 0, 0, 0], hintsUsed = 0, errors = 0, records = [], carry = null, hintPending = false;
  let aiMsg = {}, replay = 0, dragFrom = null, entered = new Set(), sessionApiKey = '', sessionProvider = 'openai', speechToken = 0, audio = null;
  let probeDims = null, studyPhase = '', voices = {}, recorder = null, startedAt = 0, videoOpen = new Set();
  let stuckOpen = null, stuckNote = {};   // 第 20 版：「我卡住了」面板開在哪一步、請老師後的訊息
  // 把畫面上的文字取出來（去掉注音與小喇叭），用在紀錄與朗讀
  const clean = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('rt,.say').forEach(x => x.remove()); return c.textContent.replace(/^✓\s*/, '').trim(); };
  const chosenText = id => clean(document.querySelector(`[data-choice="${id}"][data-value="${answers[id]}"]`));
  const mode = () => settings.mode || 'self';
  const hintTotal = () => hintLevel.reduce((x, y) => x + y, 0);

  // ---------- 小工具 ----------
  const L = () => P() ? ((lessons.activities || {})[type] || {}) : lessons[type];
  const level = () => settings.difficulty === 'custom' ? 'standard' : (settings.difficulty || 'standard');
  const dims = () => { if (P()) return [0, 0, 0]; const p = probeDims || L().problems[index]; return [p.a, p.b, p.offset]; };
  const grid = () => type === 'rectangle' || type === 'square';
  const area = () => dims()[0] * dims()[1] / (type === 'triangle' ? 2 : 1);
  const pages = () => P() ? P().steps.map((_, i) => [i]) : F.pages(settings);
  const current = () => pages()[page];
  const has = n => P() ? n < P().steps.length : F.hasActivity(settings, n);
  const titles = () => { if (P()) return P().steps.map(x => x.title); const t = C.titles(type).slice(); if (!has(1)) t[5] = '算一算'; if (method === 'row' && grid()) t[1] = '一排一排加'; return t; };
  const number = id => { const v = String(answers[id] ?? '').trim(); return /^\d+(\.\d+)?$/.test(v) ? Number(v) : null; };
  const button = (id, text, cls = '', extra = '') => `<button id="${id}" class="${cls}" ${extra}>${text}</button>`;
  const field = (id, label, cls = '') => `<label class="field ${cls}"><span data-read data-say>${label}</span><input id="${id}" data-answer="${id}" inputmode="decimal" autocomplete="off" value="${esc(answers[id] ?? '')}"></label>`;
  const hint1 = s => (L().hints && L().hints[s]) || C.tier1[type][s];
  const tierText = (key, base, s) => { const list = L()[key]; return (Array.isArray(list) && list[s] && list[s].trim()) || base[type][s]; };
  const hintText = (s, level) => P() ? ((L()[['hints', 'hints2', 'hints3'][level - 1]] || [])[s] || '').trim() || P().steps[s].hints[level - 1]
    : level === 1 ? hint1(s) : level === 2 ? tierText('hints2', C.tier2, s) : tierText('hints3', C.tier3, s);
  // 新活動用的介面：外掛只透過 ctx 讀寫狀態
  function ctx() {
    return { answers, state: pState, problem: pProblem, plugin: P(), settings, method, level: level(),
      hint: s => hintLevel[s] || 0, checked: s => checked.has(s),
      choice: (id, title, items, fixed) => choice(id, title, items, fixed),
      invalidate: s => invalidateStep(s), refreshFigure: s => rerenderFigure(s), rerender: () => rerenderKeep(), log: (e, x) => log(e, x) };
  }

  function log(event, extra = {}) {
    const st = extra.activity && phase !== 'plan' ? (titles()[extra.activity - 1] || '') : '';
    const r = { time: new Date().toISOString(), shape: nameOf(), shapeKey: type, actId: type, stepTitle: st, cycle, activity: extra.activity ?? null, event, support: settings.support, response, method, flow: settings.flow, difficulty: settings.difficulty, mode: mode(), studyPhase, ...extra };
    window.areaResearch?.record(r);   // 第 22 版：現場試用時加上代號並上傳到試算表
    records.push(r);
    saveRecords();
  }

  function choice(id, title, items, fixed = false) {
    if (!orders[id] || orders[id].length !== items.length || !orders[id].every(v => items.some(x => x[0] === v))) orders[id] = fixed ? items.map(x => x[0]) : F.shuffle(items.map(x => x[0]));
    return `<fieldset class="choice" data-choice-group="${id}"><legend data-read data-say>${title}</legend><div class="options">${orders[id].map(v =>
      `<button type="button" data-choice="${id}" data-value="${v}" aria-pressed="${answers[id] === v}">${items.find(x => x[0] === v)[1]}</button>`).join('')}</div></fieldset>`;
  }

  // ---------- 畫面骨架 ----------
  function shell(title, body) {
    stopRead();
    const total = type && phase === 'solve' ? pages().length : 0;
    const meter = total > 1 ? `<div class="step-meter" aria-label="解題步驟 ${page + 1}／${total}"><span class="meter-label">解題步驟</span>${pages().map((_, i) => `<span class="dot ${i < page ? 'done' : i === page ? 'now' : ''}">${i + 1}</span>`).join('')}</div>` : '';
    const steps = type ? `<nav class="progress" aria-label="學習階段"><span class="stage-label">學習階段</span><span class="${phase === 'plan' ? 'active' : ''}">① 看題、選方法</span><span class="${phase === 'solve' ? 'active' : ''}">② 動手算</span><span class="${phase === 'reflect' ? 'active' : ''}">③ 檢查、回顧</span></nav>${meter}` : '';
    const banner = type ? { together: '🤝 一起做：老師和你一起想、一起做。', demo: '👩‍🏫 老師示範：先看老師怎麼做，聽老師說出想法。', probe: '📝 小測驗：這次沒有提示，自己試試看就好。' }[mode()] : '';
    $('app').innerHTML = `<section class="surface"><div class="head"><p class="eyebrow">${type ? `<a class="map-link" href="seven.html${draftQ ? '?' + draftQ.slice(1) : ''}">🗺️ 學習地圖</a>　${(ACT && ACT.info(type) || {}).no || ''} ${nameOf()} · 第 ${cycle} 題` : '四種圖形面積'}</p><h1 tabindex="-1" data-read>${title}</h1></div>${steps}${banner ? `<p class="mode-banner mode-${mode()}" data-read data-say>${banner}</p>` : ''}<div class="body">${body}</div></section>`;
    addSayButtons($('app'));
  }
  function focus() { document.querySelector('h1')?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  function showStatus(target, text, ok = false) {
    if (!target) return;
    target.innerHTML = `${ok ? '<span class="star" aria-hidden="true">⭐</span>' : ''}<span data-read data-say>${esc(text)}</span>`;
    target.className = 'feedback ' + (ok ? 'correct' : 'needs-work');
    addSayButtons(target);
  }

  function startQuestion() {
    answers = carry ? { method: carry.method } : {};
    checked = new Set(); orders = {}; frame = 0; tiles = []; revealed = {}; lineOk = false; dragFrom = null; aiMsg = {}; videoOpen = new Set(); stuckOpen = null; stuckNote = {};
    hintLevel = [0, 0, 0, 0, 0, 0, 0]; hintPending = false; errors = 0; hintsUsed = 0; page = 0; entered = new Set();
    settings = F.settings(L()); applyReading();
    if (P()) { pState = {}; if (!keepProblem || !pProblem) pProblem = P().makeProblem(level(), index, Math.random); keepProblem = false; }
    probeDims = !P() && mode() === 'probe' ? F.randomProblem(type, settings.difficulty === 'custom' ? 'standard' : settings.difficulty) : null;
    if (carry && carry.method && !methodOptions().some(o => o[0] === carry.method)) delete answers.method;
    orders.lines = F.shuffle(['A', 'B', 'C']);
    fixWorked();
    window.areaBuddy?.newQuestion();
    phase = 'plan'; render();
  }

  function render() {
    if (!type) mapView();
    else if (phase === 'reflect') reflect(); else if (phase === 'plan') plan(); else solve();
    window.areaBuddy?.update();
    window.areaResearch?.page();
  }

  // ---------- ① 看題與選方法 ----------
  const goalSet = () => C.goals[settings.goalKind === 'firstTry' ? 'firstTry' : 'hints'];
  const problem = () => P() ? pProblem : L().problems[index];
  function contextCard() {
    if (P()) return '';
    const c = C.contexts[problem().context || 'none'];
    return c && c[0] ? `<p class="context-card" data-read data-say><span aria-hidden="true">${c[0]}</span> 這是${c[1]}的形狀。</p>` : '';
  }
  function plan() {
    const inPlan = !P() && F.targetInPlan(settings);
    const tip = carry && carry.cause ? C.causeTip[carry.cause] : '';
    if (!workedSet && fadeOn() && !checked.size) fixWorked();
    if (inPlan && isWorked(0)) answers.target = 'inside';
    const fadeNote = workedSet ? `<p class="notice fade-note" data-read data-say>${carry && carry.fadeMsg ? esc(carry.fadeMsg) + ' ' : ''}${fadePlanText()}</p>${!fadeFull && fadeLevel() > 0 ? button('fullExample', '📖 這題我想先看完整的例題') : ''}` : '';
    const prev = (carry ? `<div class="notice carry" data-read data-say>${carry.badges && carry.badges.length ? `上一題得到：${carry.badges.map(b => C.badges[b][0] + ' ' + C.badges[b][1]).join('、')}。` : ''}上一題，你說「${esc(carry.reason)}」幫助你。${tip ? ' ' + tip : ''}</div>` : '') + fadeNote;
    const probe = mode() === 'probe';
    shell('看題、選方法', `${prev}${contextCard()}
      <p class="lesson-prompt" data-read data-say>${esc(problem().prompt)}</p>
      <div class="figure">${P() ? P().planFigure(ctx()) : window.sevenDiagram(type, dims(), {})}</div>
      ${inPlan ? choice('target', '這題要找什麼？', C.options(type, 'target')) : ''}
      ${settings.handsOn ? `<button type="button" id="handsOn" class="toggle" aria-pressed="${!!answers.handsOn}">${answers.handsOn ? '✓ ' : ''}✋ 我先用方格紙或剪紙做過了</button>` : ''}
      <div class="srl-card"><p class="srl-title" data-read data-say>🧭 開始前，先想一想</p>
      ${probe ? '' : choice('goal', goalSet().title, goalSet().items, true)}
      ${settings.confidence ? choice('confidence', '你覺得自己有多少把握？', C.confidence, true) : ''}
      ${choice('method', '你想先怎麼做？', methodOptions())}
      <p class="subtle" data-read data-say>這些沒有對錯，選你想要的就好。</p></div>
      ${progressPanel(false)}
      <p id="planFeedback" class="feedback" role="status"></p>
      <div class="lesson-controls">${button('start', '開始 →', 'primary')}</div>`);
    bindChoices(() => {});
    if ($('fullExample')) $('fullExample').onclick = () => { fadeFull = true; fixWorked(); if (inPlan) answers.target = 'inside'; log('想先看完整例題', {}); rerenderKeep(); };
    if (inPlan && isWorked(0)) document.querySelectorAll('[data-choice="target"]').forEach(e => { e.disabled = true; });
    if ($('handsOn')) $('handsOn').onclick = () => { answers.handsOn = !answers.handsOn; log('先用實物操作', { on: answers.handsOn }); rerenderKeep(); };
    $('start').onclick = () => {
      if (inPlan && !answers.target) return showStatus($('planFeedback'), '請先選：這題要找什麼？');
      if (probe) answers.goal = 'any';
      const miss = [!answers.goal && '目標', settings.confidence && !answers.confidence && '有多少把握', !answers.method && '先怎麼做'].filter(Boolean);
      if (miss.length) return showStatus($('planFeedback'), '請選：' + miss.join('、') + '。');
      if (inPlan && answers.target !== 'inside') {
        errors++; log('步驟檢核', { activity: 1, correct: false, issue: 'target', choice: answers.target });
        return showStatus($('planFeedback'), C.choiceFeedback.target[answers.target]);
      }
      if (inPlan) { checked.add(0); log('步驟檢核', { activity: 1, correct: true, issue: 'none' }); }
      goal = answers.goal; method = answers.method; startedAt = Date.now();
      log('整題定標', { goal, goalKind: settings.goalKind, confidence: answers.confidence || '', dimensions: dims(), carriedFrom: carry?.cycle ?? null, choice: `目標：${probe ? '小測驗' : chosenText('goal')}；把握：${settings.confidence ? chosenText('confidence') : '—'}；方法：${chosenText('method')}` });
      phase = 'solve'; page = 0; render(); focus();
    };
  }

  function methodOptions() {
    if (P()) { const o = P().methods || [['mark', '✋ 先動手做做看'], ['self', '🧠 先自己想，需要時看提示']]; const ok = o.filter(x => settings.methods.includes(x[0])); return ok.length ? ok : o.slice(0, 1); }
    let o = C.options(type, 'method');
    if (!has(1)) o = [['mark', '👀 先看圖，再算'], o.at(-1)];
    const allowed = o.filter(x => settings.methods.includes(x[0]));
    return allowed.length ? allowed : o.slice(0, 1);
  }

  // ---------- ② 動手算 ----------
  function labelState(s) {
    const always = settings.labels === 'always';
    const showBase = always || !has(2) || checked.has(2) || (!grid() && s === 2 && revealed.base);
    const showHeight = always || !has(3) || checked.has(3) || (!grid() && s === 3 && lineOk);
    return { showBase: s === 0 || s === 1 ? always : showBase, showHeight: s === 0 || s === 1 ? always : showHeight };
  }

  function pulseFor(s) {
    if (hintLevel[s] < 2 || checked.has(s)) return '';
    return ['inside', 'piece', 'base', 'height', 'both', '', ''][s];
  }

  function figure(s) {
    if (P()) { const st = P().steps[s]; return st.figure ? st.figure(ctx()) : ''; }
    const level = hintLevel[s];
    if (grid() && s >= 1 && s <= 3) {
      const [a] = dims(), total = area(), rowMode = s === 1 && method === 'row';
      const cells = Array.from({ length: total }, (_, i) => {
        const order = tiles.indexOf(i), marked = order >= 0;
        if (rowMode) {   // 一排一排加：點一格就標記整排，排尾顯示累加的數字
          const row = Math.floor(i / a), rowsDone = tiles.length / a, end = i % a === a - 1;
          const pos = marked ? Math.floor(order / a) + 1 : 0;
          const tapR = tiles.length === 0 && i === 0;
          return `<button data-tile="${i}" class="${marked ? 'marked' : ''} ${tapR ? 'tap-here' : ''} ${!checked.has(1) && level >= 2 && !marked ? 'pulse-cell' : ''}" aria-label="第${row + 1}排${marked ? '，已經加上' : ''}" aria-pressed="${marked}">${marked && end ? pos * a : ''}</button>`;
        }
        const edge = (s === 2 && i < a) || (s === 3 && i % a === 0);
        const pulse = !checked.has(s) && (level >= 2 && ((s === 1 && !marked) || (s !== 1 && edge)) || (s === 1 && level >= 3 && i < a && !marked));
        const tap = s === 1 && tiles.length === 0 && i === 0 && hintPending === false;
        return `<button data-tile="${i}" ${s !== 1 ? 'disabled tabindex="-1"' : ''} class="${marked ? 'marked' : ''} ${edge ? 'edge' : ''} ${pulse ? 'pulse-cell' : ''} ${tap ? 'tap-here' : ''}" aria-label="第${Math.floor(i / a) + 1}排第${i % a + 1}格${marked && s === 1 ? '，第' + (order + 1) + '個' : ''}" aria-pressed="${marked}">${marked && s === 1 ? order + 1 : ''}</button>`;
      }).join('');
      const L = labelState(s);
      return `<div class="count-wrap">${L.showBase && s !== 2 ? `<p class="grid-label">${a} 公分</p>` : ''}<div class="count-grid" style="--cols:${a}">${cells}</div></div>
        <p class="figure-note" data-read data-say>${s === 1 ? (method === 'row' ? `點一排，排尾的數字會加上 ${a}。` : '點一格，格子裡會出現數字。') : '一小格是 1 平方公分。'}</p>`;
    }
    const L = labelState(s);
    const opts = { frame: s === 1 ? frame : 0, showBase: L.showBase, showHeight: L.showHeight, pulse: pulseFor(s), replay, dragFrom: s === 1 ? dragFrom : null, gridLines: settings.grid };
    if (s === 1 && level >= 2 && frame !== 1) opts.pulse = '';
    if (!grid() && s === 2 && !revealed.base && settings.labels !== 'always') opts.baseClickable = true;
    if (!grid() && s === 3 && !lineOk) { opts.lines = lineMap(); opts.selected = answers.height || ''; opts.showHeight = settings.labels === 'always' && false; }
    return window.sevenDiagram(type, dims(), opts);
  }
  function lineMap() { const kinds = ['height', 'side', 'dash']; const m = {}; orders.lines.forEach((l, i) => { m[l] = kinds[i]; }); return Object.fromEntries(Object.entries(m).sort()); }

  function task(s) {
    let content = P() ? P().steps[s].answer(ctx()) : '';
    const D = dims();
    if (!P()) {
    if (s === 0) content = `<p class="lesson-prompt" data-read data-say>${esc(L().problems[index].prompt)}</p>${choice('target', '這題要找什麼？', C.options(type, 'target'))}`;
    if (s === 1) {
      if (grid()) {
        const skip = settings.support === 'faded' || method === 'self';
        content = `${skip ? `${method === 'self' && !answers.useProduct ? '<p class="subtle" data-read data-say>你選了「先自己算」，可以直接用乘法。</p>' : ''}<button type="button" id="useProduct" class="toggle" aria-pressed="${!!answers.useProduct}">${answers.useProduct ? '✓ ' : ''}我會用乘法，不用一格一格點</button>` : ''}
          ${answers.useProduct ? '<p class="subtle" data-read data-say>好，等一下用兩個邊長來算。</p>' : field('count', '點完了，一共有幾格？')}`;
      } else {
        const O = C.operate[type];
        content = `<p data-read data-say>${O.before[frame]}</p>
          <div class="actions">${frame < 2 ? button('transform', O.buttons[frame], 'primary-soft' + (hintLevel[1] >= 2 ? ' pulse-btn' : '')) : button('transform', O.buttons[2], '', 'disabled')}${frame === 2 ? button('replay', '▶ 再看一次動畫') : ''}</div>
          ${frame === 1 ? '<p class="subtle" data-read data-say>也可以用手指把橘色那一片拖過去。</p>' : ''}
          ${frame === 2 ? choice('relation', type === 'triangle' ? '一片和拼好的圖形比，怎麼樣？' : '移動前後，面積怎麼樣？', C.options(type, 'relation')) : ''}
          ${checked.has(1) ? `<p class="notice" data-read data-say>${O.after}</p>` : ''}`;
      }
    }
    if (s === 2) {
      content = grid() ? field('first', '加粗的一排有幾格？')
        : `${!revealed.base && settings.labels !== 'always' ? `<p data-read data-say>點一下綠色的底，看它多長。</p>${button('revealBase', '👆 點底邊')}` : ''}${field('first', '底是幾公分？')}`;
    }
    if (s === 3) {
      if (grid()) content = field('second', '一共有幾排？');
      else if (!lineOk) content = `${choice('height', '哪一條是高？（可以點圖上的線）', orders.lines.slice().sort().map(l => [l, l + ' 線']))}<p class="subtle" data-read data-say>選好後按「檢查」。</p>`;
      else content = `<p class="notice" data-read data-say>找到了！高旁邊有它的長度。</p>${field('second', '高是幾公分？')}`;
    }
    if (s === 4) {
      const ops = { product: ['×', ''], half: ['×', '÷ 2'], sum: ['+', ''], slant: ['×', '（斜邊）'], perimeter: ['+', '再 × 2'] }[answers.formula] || ['?', ''];
      const nameA = grid() ? (type === 'square' ? '邊長' : '長') : '底', nameB = grid() ? (type === 'square' ? '邊長' : '寬') : '高';
      content = `${choice('formula', '選一個算面積的算式', C.options(type, 'formula'))}
        <div class="equation" aria-label="算式"><label><span>${nameA}</span><input id="a" data-answer="a" inputmode="decimal" autocomplete="off" value="${esc(answers.a ?? '')}"></label><span class="op" id="op1">${ops[0]}</span><label><span>${nameB}</span><input id="b" data-answer="b" inputmode="decimal" autocomplete="off" value="${esc(answers.b ?? '')}"></label><span class="op" id="op2">${ops[1]}</span></div>
        <p class="subtle" data-read data-say>把圖上的長度填進方格。</p>${checked.has(4) ? `<p class="chant" data-read data-say>📣 口訣：${C.chant[type]}</p>` : ''}`;
    }
    if (s === 5) {
      const compare = has(1);
      content = `${field('total', '算出來，面積是多少？')}
        ${compare ? `<details id="compare" ${hintLevel[5] >= 2 || answers.compared ? 'open' : ''}><summary>🔍 比一比</summary><p id="comparison" data-read data-say></p></details>${choice('verify', '比完了，結果怎麼樣？', C.options(type, 'verify'))}` : ''}
        ${answers.verify === 'different' ? `<div class="return-links">${returnLinks()}</div>` : ''}`;
    }
    if (s === 6) content = `<p class="notice" data-read data-say>你的答案：${esc(answers.total ?? '')}</p>${choice('unit', '面積用哪個單位？', C.options(type, 'unit'))}`;
    }

    const level = hintLevel[s], passed = checked.has(s), probe = mode() === 'probe';
    const auto = !probe && mode() !== 'demo' && (settings.support === 'full' && method !== 'self' || mode() === 'together') && level === 0 && !passed;
    const hintBtn = passed || probe ? '' : level < 3 ? button('hint' + s, level === 0 ? '💡 給我提示' : '💡 再給我一個提示', 'hint-btn') : button('hint' + s, '已經看完 3 個提示', 'hint-btn', 'disabled');
    const aiBtn = !probe && !passed && settings.ai && level >= 2 ? button('aiHint' + s, '🤖 問 AI', 'hint-btn') : '';
    const canVideo = !probe && !passed && settings.video !== 'off';
    const videoBtn = canVideo && !videoOpen.has(s) && (settings.video === 'always' || mode() === 'demo' || level >= 3) ? button('video' + s, '🎬 看示範影片', 'hint-btn video-btn', `data-video="${s}"`) : '';
    const videoSlot = videoOpen.has(s) && !passed ? `<div class="video-slot" id="videoSlot${s}" data-slot="${s}"></div>` : '';
    // 第 20 版：這一步的「問問自己」與「我卡住了」
    const askText = stepAskText(s);
    const stepAsk = askText && settings.selfAsk && !passed && mode() !== 'demo' && !probe ? `<p class="step-ask" data-read data-say>🤔 問問自己：${esc(askText)}</p>` : '';
    const stuckBtn = passed || probe || mode() === 'demo' ? '' : button('stuck' + s, '😣 我卡住了', 'hint-btn stuck-btn', `data-stuck="${s}" aria-expanded="${stuckOpen === s}" aria-controls="stuckPanel${s}"`);
    const stuckItems = C.stuckOptions.filter(([k]) => (k !== 'hint' || level < 3) && (k !== 'video' || (canVideo && !videoOpen.has(s))));
    const stuckPanel = stuckOpen === s && !passed ? `<div class="stuck-panel" id="stuckPanel${s}" role="group" aria-labelledby="stuckLead${s}"><p id="stuckLead${s}" data-read data-say>沒關係，卡住的時候，選一個幫自己的方法：</p><div class="options">${stuckItems.map(([k, t]) => `<button type="button" data-stuck-pick="${k}" data-step="${s}">${t}</button>`).join('')}</div>${stuckNote[s] ? `<p class="notice" role="status" data-read data-say>${esc(stuckNote[s])}</p>` : ''}</div>` : '';
    const thinkText = P() ? P().steps[s].think : C.think[type][s], togetherText = P() ? P().steps[s].together : C.together(type)[s];
    const coach = mode() === 'demo' && !passed ? `<div class="think-aloud"><p data-read data-say>💭 ${esc(thinkText)}</p>${button('demo' + s, '▶ 看老師做這一步', 'primary-soft', `data-demo="${s}"`)}</div>`
      : mode() === 'demo' && passed ? `<p class="think-aloud done" data-read data-say>👍 這一步老師做好了。下一題換你試試看。</p>`
      : mode() === 'together' && !passed ? `<p class="think-aloud" data-read data-say>🤝 ${esc(togetherText)}</p>` : '';
    const panel = level > 0 && !passed ? `<aside id="hintText${s}" class="hint-panel" role="status"><p class="hint-level">提示 ${level}／3</p><p id="hintMessage${s}" data-read data-say>${esc(hintFor(s, level))}</p>${aiMsg[s] ? `<p class="ai-msg" id="aiMsg${s}" data-read data-say>${esc(aiMsg[s])}</p>` : ''}${hintPending === s ? button('ackHint', '我看完了，回去作答', 'primary') : ''}</aside>` : `<aside id="hintText${s}" class="hint-panel" role="status" hidden></aside>`;
    const showFig = P() ? !!P().steps[s].figure : (phase !== 'solve' || current()[0] === s);   // 同一頁有兩個活動時，只放一張圖
    const showH2 = phase !== 'solve' || current().length > 1;   // 一頁只有一個活動時，大標題已經是步驟名稱
    return `<section class="activity" data-stage="${s}">${showH2 ? `<h2 data-read>${titles()[s]}</h2>` : ''}
      <div class="task-grid${showFig ? '' : ' no-figure'}">${showFig ? `<div class="figure" id="figure${s}">${figure(s)}</div>` : ''}
      <div class="answer">${isWorked(s) ? `<p class="worked-tag" data-read data-say>📖 這一步是例題，已經做好了。看一看怎麼做的，再往下。</p>${(P() ? P().steps[s].think : C.think[type][s]) ? `<p class="think-aloud" data-read data-say>💭 ${esc(P() ? P().steps[s].think : C.think[type][s])}</p>` : ''}` : workedSet && !passed ? '<p class="your-turn" data-read data-say>✏️ 換你做這一步！</p>' : ''}${coach}${auto ? `<p class="cue" data-read data-say>${esc(hintFor(s, 1))}</p>` : ''}${content}${stepAsk}
      <p id="feedback${s}" class="feedback" role="status"></p>
      <div class="hint-actions">${hintBtn}${aiBtn}${videoBtn}${stuckBtn}</div>${stuckPanel}${panel}</div></div>${videoSlot}</section>`;
  }
  function stepAskText(s) {
    if (P()) { const t = P().steps[s].title.trim(); return P().steps[s].ask || C.stepAskByTitle[t] || C.stepAskByTitle[t.replace(/\s*\d+$/, '')] || ''; }
    // 長方形、正方形：沒有點格子（用乘法、3 步或自訂流程拿掉數格）時，不問「點的格數」
    if (grid() && s === 1 && answers.useProduct) return '一排有幾格？有幾排？我都看清楚了嗎？';
    if (grid() && s === 5 && (!has(1) || answers.useProduct)) return '我再算一次，答案還是一樣嗎？';
    return (C.stepAsk[type] || [])[s] || '';
  }
  // 學生選了卡住時的下一步：提示、示範、請老師、休息
  function stuckPick(s, k) {
    log('卡住時選擇', { activity: s + 1, choice: (C.stuckOptions.find(x => x[0] === k) || [])[1] || k });
    const back = () => $('stuck' + s)?.focus({ preventScroll: true });
    if (k === 'hint') { stuckOpen = null; showHint(s, true); const m = $('ackHint') || $('hintMessage' + s); if (m) { if (!m.matches('button')) m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); } return; }
    if (k === 'video') { stuckOpen = null; videoOpen.add(s); rerenderKeep(); mountVideo(s, true); const v = $('videoSlot' + s); v?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); (v?.querySelector('video, button') || $('stuck' + s))?.focus({ preventScroll: true }); return; }
    if (k === 'rest') { stuckOpen = null; rerenderKeep(); back(); $('restDialog')?.addEventListener('close', back, { once: true }); return openRest('self'); }
    stuckNote[s] = '請舉手，或把這個畫面給老師看。等老師的時候，可以先看看圖。';
    rerenderKeep();
  }

  // 提示要跟著操作狀態變：格子點完了就不再說「不要漏掉」
  function hintFor(s, level) {
    if (s === 1 && grid() && !answers.useProduct && tiles.length === area()) return method === 'row' ? '每一排都加好了！把最後的數字填進方格。' : '格子都點完了！把最後一格的數字填進方格。';
    if (s === 1 && grid() && method === 'row') return C.rowHints[Math.max(0, level - 1)];
    return hintText(s, level);
  }

  function returnLinks() {
    const L = grid() ? ['回去數格子', '回去看邊長', '回去看算式'] : [type === 'triangle' ? '回去看拼合' : '回去看剪移', '回去看底和高', '回去看算式'];
    return [[1, L[0]], [has(2) ? 2 : 3, L[1]], [4, L[2]]].filter(([n]) => has(n)).map(([n, t]) => button('return' + n, t, '', `data-return="${n}"`)).join('');
  }

  function pageTitle() {
    if (settings.flow === 'three') return '算一算';
    return current().map(s => titles()[s]).join('、');
  }

  function solve() {
    for (const s of current()) if (!entered.has(s)) { entered.add(s); log('進入步驟', { activity: s + 1 }); }
    for (const s of current()) if (isWorked(s)) workStep(s);
    const last = page === pages().length - 1;
    const done = current().every(s => checked.has(s));
    const ask = settings.selfAsk ? `<details class="self-ask"><summary data-read>🗣️ 我的自問卡</summary><ol>${C.selfAsk.map(q => `<li data-read data-say>${q}</li>`).join('')}</ol></details>` : '';
    shell(pageTitle(), `${ask}${current().map(task).join('')}
      <p id="groupFeedback" class="feedback" role="status"></p>
      <div class="lesson-controls">${button('back', '← 上一步')}${button('check', '✔ 檢查')}${button('next', last ? '完成 →' : '下一步 →', 'primary' + (done ? '' : ' locked'), done ? '' : 'aria-disabled="true"')}
      ${done ? '' : '<p class="lock-reason" data-read>按「檢查」答對後，才能到下一步。</p>'}</div>`);
    bindActivity(); lockWorked();
    $('back').onclick = () => { if (page === 0) { phase = 'plan'; render(); focus(); } else goPage(page - 1); };
    $('check').onclick = () => validatePage();
    $('next').onclick = () => {
      if (hintPending !== false) return showStatus($('groupFeedback'), '先看完提示，按「我看完了」。');
      if (!current().every(s => checked.has(s))) return showStatus($('groupFeedback'), '先按「✔ 檢查」，答對了才能往下走。');
      if (last) { phase = 'reflect'; render(); } else { page++; render(); }
      focus();
    };
    if (hintPending !== false) lockForHint();
    if (!P() && current().includes(5)) updateComparison();
  }

  function bindChoices(change) {
    document.querySelectorAll('[data-choice]').forEach(e => e.onclick = () => {
      const id = e.dataset.choice; answers[id] = e.dataset.value;
      document.querySelectorAll(`[data-choice="${id}"]`).forEach(k => k.setAttribute('aria-pressed', String(k === e)));
      change(id);
    });
  }

  const stageOf = { target: 0, count: 1, useProduct: 1, relation: 1, first: 2, height: 3, second: 3, formula: 4, a: 4, b: 4, total: 5, verify: 5, unit: 6 };
  function invalidateStep(s) {
    for (let n = s; n <= 6; n++) checked.delete(n);
    const box = $('feedback' + s); if (box) { box.innerHTML = ''; box.className = 'feedback'; }
    if ($('groupFeedback')) { $('groupFeedback').innerHTML = ''; $('groupFeedback').className = 'feedback'; }
    updateLock();
  }
  function invalidate(id) {
    if (P()) { const s = P().steps.findIndex(st => (st.ids || []).includes(id)); if (s >= 0) invalidateStep(s); return; }
    const s = stageOf[id]; if (s === undefined) return;
    for (let n = s; n <= 6; n++) checked.delete(n);
    const box = $('feedback' + s); if (box) { box.innerHTML = ''; box.className = 'feedback'; }
    if ($('groupFeedback')) { $('groupFeedback').innerHTML = ''; $('groupFeedback').className = 'feedback'; }
    if (s <= 4 && id !== 'verify') { delete answers.verify; document.querySelectorAll('[data-choice="verify"]').forEach(e => e.setAttribute('aria-pressed', 'false')); }
    if (s <= 5) delete answers.unit;
    updateLock();
  }
  function updateLock() {
    const n = $('next'); if (!n || phase !== 'solve') return;
    const done = current().every(s => checked.has(s));
    n.classList.toggle('locked', !done);
    if (done) n.removeAttribute('aria-disabled'); else n.setAttribute('aria-disabled', 'true');
  }

  function bindActivity() {
    bindChoices(id => {
      invalidate(id);
      if (P()) return;
      if (id === 'formula') { const ops = { product: ['×', ''], half: ['×', '÷ 2'], sum: ['+', ''], slant: ['×', '（斜邊）'], perimeter: ['+', '再 × 2'] }[answers.formula]; $('op1').textContent = ops[0]; $('op2').textContent = ops[1]; }
      if (id === 'height') rerenderFigure(3);
      if (id === 'verify') { rerenderKeep(); }
    });
    document.querySelectorAll('[data-answer]').forEach(e => e.oninput = () => { answers[e.id] = e.value; invalidate(e.id); if (e.id === 'total') updateComparison(); });
    document.querySelectorAll('[data-tile]').forEach(e => {
      if (e.disabled) return;
      e.onclick = () => tileClick(Number(e.dataset.tile));
    });
    if ($('useProduct')) $('useProduct').onclick = () => { answers.useProduct = !answers.useProduct; invalidate('useProduct'); log('切換用乘法', { activity: 2, on: answers.useProduct }); rerenderKeep(); };
    if ($('transform') && !$('transform').disabled) $('transform').onclick = () => advanceFrame(null);
    if ($('replay')) $('replay').onclick = () => { replay++; dragFrom = null; log('重看動畫', { activity: 2 }); rerenderFigure(1); };
    if ($('revealBase')) $('revealBase').onclick = revealBase;
    document.querySelectorAll('[data-base]').forEach(e => e.onclick = revealBase);
    document.querySelectorAll('[data-line-hit]').forEach(e => e.onclick = () => {
      if (lineOk) return;
      answers.height = e.dataset.lineHit; invalidate('height');
      document.querySelectorAll('[data-choice="height"]').forEach(k => k.setAttribute('aria-pressed', String(k.dataset.value === answers.height)));
      rerenderFigure(3);
    });
    for (const s of (phase === 'reflect' ? [6] : current())) {
      if ($('hint' + s) && !$('hint' + s).disabled) $('hint' + s).onclick = () => showHint(s, true);
      if ($('aiHint' + s)) $('aiHint' + s).onclick = () => { hintsUsed++; log('請求AI提示', { activity: s + 1, hintLevel: hintLevel[s] }); askAI('hint', s); };
    }
    document.querySelectorAll('[data-stuck]').forEach(e => e.onclick = () => {
      const s = Number(e.dataset.stuck); stuckOpen = stuckOpen === s ? null : s;
      if (stuckOpen === s) log('我卡住了', { activity: s + 1 });
      rerenderKeep(); if (stuckOpen === s) $('stuckPanel' + s)?.querySelector('[data-stuck-pick]')?.focus();
    });
    document.querySelectorAll('[data-stuck-pick]').forEach(e => e.onclick = () => stuckPick(Number(e.dataset.step), e.dataset.stuckPick));
    document.querySelectorAll('[data-demo]').forEach(e => e.onclick = () => demoStep(Number(e.dataset.demo)));
    if (P() && phase === 'solve') for (const s of current()) P().steps[s].bind?.(ctx());
    document.querySelectorAll('[data-video]').forEach(e => e.onclick = () => { const s = Number(e.dataset.video); videoOpen.add(s); rerenderKeep(); mountVideo(s, true); $('videoSlot' + s)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    document.querySelectorAll('[data-slot]').forEach(e => { if (!e.firstChild) mountVideo(Number(e.dataset.slot), false); });
    if ($('ackHint')) $('ackHint').onclick = () => { const s = hintPending; hintPending = false; log('確認提示', { activity: s + 1 }); rerenderKeep(); };
    document.querySelectorAll('[data-return]').forEach(e => e.onclick = () => {
      const n = Number(e.dataset.return);
      if (n === 1 && answers.useProduct) answers.useProduct = false;
      goPage(pages().findIndex(g => g.includes(n)));
    });
    if ($('compare')) $('compare').ontoggle = () => { if ($('compare').open && !answers.compared) { answers.compared = true; log('打開比一比', { activity: 6 }); } updateComparison(); };
    bindDrag();
  }

  function tileClick(i) {
    const wasFull = tiles.length === area(), k = tiles.indexOf(i);
    if (method === 'row') {   // 整排一起加上或拿掉
      const a = dims()[0], row = Math.floor(i / a), cells = Array.from({ length: a }, (_, j) => row * a + j);
      if (k >= 0) tiles = tiles.filter(t => Math.floor(t / a) !== row).sort((x, y) => x - y);
      else tiles.push(...cells);
      // 重新照點的順序排列，讓排尾數字是累加的
      const rows = []; for (const t of tiles) { const r = Math.floor(t / a); if (!rows.includes(r)) rows.push(r); }
      tiles = rows.flatMap(r => Array.from({ length: a }, (_, j) => r * a + j));
    } else if (k >= 0) tiles.splice(k, 1); else tiles.push(i);
    invalidate('count');
    if (wasFull !== (tiles.length === area())) rerenderKeep(); else rerenderFigure(1);   // 點完或取消時，提示文字一起更新
  }

  // 紀錄存在這個分頁的暫存區：換圖形、重新整理都不會消失（關掉分頁才清除）
  const REC_KEY = 'area-records-v16';
  // ---------- 第 21 版：例題逐步留空（反向退除） ----------
  // 第 1 題每一步都是做好的例題；之後把「最後幾步」換學生做。答得順就多換一步，卡住兩次以上就退回一步。
  const FADE_KEY = 'area-fading-v21';
  const fadeOn = () => !!settings.fading && ['self', 'together'].includes(mode());
  // 3 步流程的「要找什麼」在規劃頁、單位在回顧頁，也照順序算進來
  const fadeSteps = () => P() ? pages().flat() : [...(F.targetInPlan(settings) ? [0] : []), ...pages().flat(), ...(F.unitInReflect(settings) ? [6] : [])];
  // 進度依「活動＋步驟組合」分開存：改了流程或開關換算步驟，就從例題重新開始
  const fadeKey = () => type + '|' + fadeSteps().join(',');
  function fadeStore() { try { return JSON.parse(sessionStorage.getItem(FADE_KEY) || '{}') || {}; } catch { return {}; } }
  function fadeState() { const v = fadeStore()[fadeKey()]; return v && typeof v === 'object' ? v : { level: 0, streak: 0 }; }
  function fadeLevel() { if (fadeFull) return 0; const n = fadeSteps().length, v = Number(fadeState().level); return Math.max(0, Math.min(n, Number.isFinite(v) ? v : 0)); }
  function setFade(st) { const m = fadeStore(); m[fadeKey()] = st; try { sessionStorage.setItem(FADE_KEY, JSON.stringify(m)); } catch { /* 只留在本頁 */ } }
  // 每一題開始時就決定哪些步驟是例題；中途切換教學階段也不會改變
  let fadeFull = false, workedSet = null, retryQ = false;   // retryQ：這一題是「再做一次」的同一題
  const isWorked = s => !!workedSet && workedSet.has(s);
  function fixWorked() { const n = fadeSteps().length, k = fadeLevel(); workedSet = fadeOn() ? new Set(fadeSteps().slice(0, n - k)) : null; }
  // 例題步驟：直接做好（不算答錯、不算提示）
  function workStep(s) {
    if (checked.has(s)) return;
    if (P()) P().steps[s].solve(ctx()); else demoShape(s);
    checked.add(s); log('例題步驟', { activity: s + 1, fadeLevel: fadeLevel() });
  }
  // 例題只能看、不能改（也不會被記成答錯或提示）
  function lockWorked() {
    if (!workedSet) return;
    for (const s of workedSet) document.querySelectorAll(`.activity[data-stage="${s}"]`).forEach(sec => {
      sec.querySelectorAll('input, textarea, button[data-choice], button[data-tile], #useProduct, #transform, #revealBase').forEach(e => { e.disabled = true; });
      sec.querySelectorAll('svg [role="button"], [data-base], [data-line-hit]').forEach(e => { e.setAttribute('tabindex', '-1'); e.style.pointerEvents = 'none'; });
    });
  }
  function fadePlanText() {
    const n = fadeSteps().length, k = fadeLevel();
    return k === 0 ? '📖 這一題是例題：每一步都已經做好了。跟著看，想一想為什麼要這樣做。'
      : k >= n ? '✏️ 這一題每一步都換你做！' : `📖 這一題前面 ${n - k} 步是例題，最後 ${k} 步換你做。`;
  }
  // 做完一題後調整：例題看完 → 換 1 步；換你做的步驟都一次答對、沒看提示 → 多換一步；答錯兩次以上 → 退回一步
  // 換學生做的步驟要「連續 2 題」都順利（沒答錯、沒看提示或示範、沒請老師、不是「一起做」），而且是新題目，才多換一步
  function adjustFade(isNew) {
    if (!workedSet) return '';
    const n = fadeSteps().length, st = fadeState(), k = fadeFull ? 0 : Math.max(0, Math.min(n, Number(st.level) || 0)), mine = fadeSteps().filter(s => !isWorked(s));
    const mineRec = records.filter(x => x.cycle === cycle && mine.includes(x.activity - 1));
    const wrong = mineRec.filter(x => x.event === '步驟檢核' && !x.correct).length;
    const helped = mine.some(s => hintLevel[s] > 0) || mineRec.some(x => ['看示範影片', '看示範', '卡住時選擇', '請求AI提示'].includes(x.event))
      || mode() === 'together';   // 一起做有老師陪著，不算獨立完成（老師設定的「完整支持」是基準，不另外扣）
    let to = k, streak = Number(st.streak) || 0, msg;
    if (fadeFull) msg = '看完例題了！下一題回到原來的步驟。';
    else if (k === 0) { to = 1; streak = 0; msg = '下一題，最後 1 步換你做。'; }
    else if (wrong >= 2) { to = Math.max(1, k - 1); streak = 0; msg = to < k ? `下一題，例題多做一步給你看，你做最後 ${to} 步。` : '下一題，一樣換你做最後 1 步，再練一次。'; }
    else if (!wrong && !helped && isNew) {
      streak++;
      if (k >= n) msg = '你每一步都會自己做了！';
      else if (streak >= 2) { to = k + 1; streak = 0; msg = `連續做得很順！下一題，換你做最後 ${to} 步。`; }
      else msg = '做得很順！再一題也這麼順，就多換一步給你。';
    } else { streak = 0; msg = k >= n ? '下一題，一樣每一步都自己做；需要時看提示。' : `下一題，一樣換你做最後 ${k} 步，再練一次。`; }
    if (!fadeFull) setFade({ level: to, streak });
    log('例題退除調整', { from: k, to, wrong, helped, streak, fullExample: fadeFull });
    fadeFull = false;
    return msg;
  }
  function saveRecords() { try { sessionStorage.setItem(REC_KEY, JSON.stringify(records)); } catch { /* 無法暫存時只留在本頁 */ } }
  function loadRecords() { try { const r = JSON.parse(sessionStorage.getItem(REC_KEY) || '[]'); if (Array.isArray(r)) { records = r; cycle = Math.max(0, ...r.map(x => x.cycle || 0)) + 1; } } catch { /* 略過 */ } }

  // 只重畫某一個活動的圖（保留輸入框焦點與捲動位置）
  function rerenderFigure(s) {
    const box = $('figure' + s); if (!box) return;
    const sel = focusKey(); setTimeout(() => restoreFocus(sel));   // 第 20 版：重畫圖之後，焦點回到剛才的格子或線
    if (P()) { box.innerHTML = figure(s); addSayButtons(box); P().steps[s].bind?.(ctx()); return; }
    box.innerHTML = figure(s); addSayButtons(box);
    box.querySelectorAll('[data-tile]').forEach(e => {
      if (e.disabled) return;
      e.onclick = () => tileClick(Number(e.dataset.tile));
    });
    box.querySelectorAll('[data-base]').forEach(e => e.onclick = revealBase);
    box.querySelectorAll('[data-line-hit]').forEach(e => e.onclick = () => {
      if (lineOk) return; answers.height = e.dataset.lineHit; invalidate('height');
      document.querySelectorAll('[data-choice="height"]').forEach(k => k.setAttribute('aria-pressed', String(k.dataset.value === answers.height)));
      rerenderFigure(3);
    });
    bindDrag();
  }
  // 重畫整頁但保留回饋訊息與捲動位置
  function rerenderKeep() {
    const y = window.scrollY, saved = {}, sel = focusKey();
    document.querySelectorAll('.feedback').forEach(e => { saved[e.id] = [e.innerHTML, e.className]; });
    render();
    for (const [id, [html, cls]] of Object.entries(saved)) if ($(id)) { $(id).innerHTML = html; $(id).className = cls; addSayButtons($(id)); }
    restoreFocus(sel);
    window.scrollTo({ top: y });
  }
  // ---------- 第 20 版：圖上的操作也能用鍵盤（Tab 移動、Enter／空白鍵按下），重畫後回到原來的位置 ----------
  function focusKey() {
    const el = document.activeElement;
    if (!el || el === document.body || !$('app').contains(el)) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    const a = [...el.attributes].filter(x => x.name.startsWith('data-') && !['data-read', 'data-say'].includes(x.name));
    return a.map(x => `[${x.name}="${CSS.escape(x.value)}"]`).join('');
  }
  function restoreFocus(sel) {
    keyboardize(); if (!sel || (document.activeElement && document.activeElement !== document.body && $('app').contains(document.activeElement) && document.activeElement.matches(sel))) return;
    try { const el = document.querySelector('#app ' + sel); if (el && !el.disabled) el.focus({ preventScroll: true }); } catch { /* 略過 */ }
  }
  function keyboardize(root = $('app')) {
    // 只處理作答用的圖；示範動畫裡的圖不能操作，不加入 Tab 順序
    root.querySelectorAll('.activity .figure svg [role="button"]:not([tabindex])').forEach(e => e.setAttribute('tabindex', '0'));
    root.querySelectorAll('.sd-host svg [role="button"], .video-slot svg [role="button"]').forEach(e => { e.removeAttribute('role'); e.removeAttribute('tabindex'); });
  }
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (!(t instanceof SVGElement) || t.getAttribute('role') !== 'button' || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    if (e.repeat || hintPending !== false) return;   // 長按不重複；要先看完提示時不能操作
    const sel = focusKey();
    t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    requestAnimationFrame(() => { keyboardize(); if (!$('app').contains(document.activeElement) || document.activeElement === document.body) restoreFocus(sel); });
  });
  new MutationObserver(() => keyboardize()).observe(document.getElementById('app'), { childList: true, subtree: true });

  function revealBase() {
    if (revealed.base) return;
    revealed.base = true; log('點底看長度', { activity: 3 });
    const y = window.scrollY; rerenderKeep(); window.scrollTo({ top: y });
    $('first')?.focus({ preventScroll: true });
  }

  function advanceFrame(from) {
    dragFrom = from; frame = Math.min(2, frame + 1);
    invalidate('relation'); log('圖形操作', { activity: 2, frame, by: from ? '拖曳' : '按鈕' });
    rerenderKeep();
    const fig = $('figure1'); if (fig) fig.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // 拖曳：橘色那一片拖到目標附近就完成
  function bindDrag() {
    const g = document.querySelector('.drag-piece'); if (!g) return;
    const svg = g.ownerSVGElement, kind = g.dataset.drag, tx = Number(g.dataset.tx);
    let start = null;
    const scale = () => svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
    g.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; g.setPointerCapture(e.pointerId); g.classList.add('dragging'); e.preventDefault(); });
    g.addEventListener('pointermove', e => {
      if (!start) return; const k = scale(), dx = (e.clientX - start[0]) * k, dy = (e.clientY - start[1]) * k;
      g.setAttribute('transform', kind === 'triangle' ? `translate(${tx + dx},${dy})` : `translate(${Math.max(0, dx)},0)`);
    });
    const end = e => {
      if (!start) return; const k = scale(), dx = (e.clientX - start[0]) * k, dy = (e.clientY - start[1]) * k; start = null; g.classList.remove('dragging');
      if (kind === 'triangle' && dx < -tx * 0.4) advanceFrame([tx + dx, dy]);
      else if (kind === 'parallelogram' && dx > tx * 0.4) advanceFrame([Math.max(0, dx), 0]);
      else g.setAttribute('transform', kind === 'triangle' ? `translate(${tx},0)` : 'translate(0,0)');
    };
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  }

  // ---------- 示範影片：老師上傳的影片優先，沒有就播動畫示範 ----------
  const videoSrc = async id => window.areaVideoSrc ? window.areaVideoSrc(id) : '/api/videos/' + id;
  function mountVideo(s, autoplay) {
    const slot = $('videoSlot' + s); if (!slot) return;
    const close = `<button type="button" class="video-close" data-close-video="${s}">✕ 收起示範</button>`;
    const id = L().videos && L().videos[s];
    const animate = note => {
      slot.innerHTML = `${note ? `<p class="subtle">${note}</p>` : ''}<div class="sd-host"></div>${close}`;
      const player = window.stepDemo.mount(slot.querySelector('.sd-host'), { type, step: s, method, dims: dims(), rate: settings.rate, scenes: P() ? pluginScenes(s) : null,
        onEvent: ev => { if (ev === 'play') log('看示範影片', { activity: s + 1, source: '動畫示範' }); if (ev === 'end') log('看完示範影片', { activity: s + 1, source: '動畫示範' }); } });
      bindClose(); addSayButtons(slot);
      if (autoplay) player.play();
    };
    const bindClose = () => slot.querySelectorAll('[data-close-video]').forEach(b => b.onclick = () => { videoOpen.delete(s); try { speechSynthesis.cancel(); } catch { /* 略過 */ } rerenderKeep(); });
    if (!id) return animate('');
    slot.innerHTML = `<div class="teacher-video"><video controls playsinline preload="metadata"></video><p class="sd-end" hidden data-read>👉 換你做做看！</p></div>${close}`;
    const v = slot.querySelector('video'); bindClose();
    v.onerror = () => animate('老師的影片暫時不能播放，先看動畫示範。');
    v.onplay = () => log('看示範影片', { activity: s + 1, source: '老師的影片' });
    v.onended = () => { slot.querySelector('.sd-end').hidden = false; log('看完示範影片', { activity: s + 1, source: '老師的影片' }); };
    if (settings.rate === 'slow') v.playbackRate = 0.75;
    videoSrc(id).then(src => { if (!src) return animate('老師的影片暫時不能播放，先看動畫示範。'); v.src = src; if (autoplay) v.play().catch(() => {}); }).catch(() => animate('老師的影片暫時不能播放，先看動畫示範。'));
  }

  // ---------- 老師示範：自動做完一步（不算答錯） ----------
  function demoStep(s) {
    if (P()) P().steps[s].solve(ctx()); else demoShape(s);
    checked.add(s); hintPending = false;
    log('看示範', { activity: s + 1 });
    rerenderKeep();
    showStatus($('feedback' + s), '老師做好了！看看老師怎麼做。', true);
    updateLock();
    if (phase === 'reflect') render();
  }
  function demoShape(s) {
    const [a, b] = dims(), key = C.answerKey(type);
    if (s === 0) answers.target = 'inside';
    if (s === 1) {
      if (grid()) { if (!answers.useProduct) { tiles = Array.from({ length: area() }, (_, i) => i); answers.count = String(area()); } }
      else { frame = 2; answers.relation = key.relation; }
    }
    if (s === 2) { revealed.base = true; answers.first = String(a); }
    if (s === 3) { if (!grid()) { answers.height = Object.entries(lineMap()).find(([, k]) => k === 'height')[0]; lineOk = true; } answers.second = String(b); }
    if (s === 4) { answers.formula = key.formula; answers.a = String(a); answers.b = String(b); }
    if (s === 5) { answers.total = String(area()); if (has(1)) { answers.compared = true; answers.verify = 'match'; } }
    if (s === 6) answers.unit = 'cm2';
  }
  const pluginScenes = s => ACT.demoScenes(P(), s, level(), settings);

  // ---------- 檢查 ----------
  function issue(s) {
    if (P()) return P().steps[s].check(ctx());
    const D = dims(), [a, b] = D, fb = C.choiceFeedback, key = C.answerKey(type);
    if (s === 0) { if (!answers.target) return { code: 'target', msg: '請先選一個答案。' }; return answers.target === key.target ? null : { code: 'target', msg: fb.target[answers.target] }; }
    if (s === 1) {
      if (grid()) {
        if (answers.useProduct) return null;
        if (tiles.length < area()) return { code: 'count', msg: method === 'row' ? '還有一排沒點到。看看沒有塗色的那一排。' : '還有格子沒點到。看看沒有數字的格子。' };
        if (number('count') === null) return { code: 'count', msg: '點完了，請把一共幾格填進方格。' };
        return number('count') === area() ? null : { code: 'count', msg: '看最後一格的數字，再填一次。' };
      }
      if (frame < 2) return { code: 'relation', msg: '先按上面的按鈕，把圖形' + (type === 'triangle' ? '拼好。' : '移好。') };
      if (!answers.relation) return { code: 'relation', msg: '請選一個答案。' };
      return answers.relation === key.relation ? null : { code: 'relation', msg: fb.relation[answers.relation] };
    }
    if (s === 2) {
      if (!grid() && !revealed.base && settings.labels !== 'always') return { code: 'base', msg: '先點一下綠色的底。' };
      const v = number('first');
      if (v === null) return { code: 'first', msg: grid() ? '請填一排有幾格。' : '請填底是幾公分。' };
      if (v === a) return null;
      if (grid()) return { code: 'first', msg: v === b ? '這是另一邊。數加粗的那一排。' : '一格一格數加粗的格子。' };
      return { code: 'first', msg: '再看一次底下面的數字。' };
    }
    if (s === 3) {
      if (grid()) {
        const v = number('second');
        if (v === null) return { code: 'second', msg: '請填一共有幾排。' };
        if (v === b) return null;
        return { code: 'second', msg: v === a ? '這是一排的格數。要數有幾排。' : '從上往下，數加粗的格子。' };
      }
      if (!lineOk) {
        if (!answers.height) return { code: 'line', msg: '先選一條線。' };
        const kind = lineMap()[answers.height];
        if (kind === 'height') return { code: 'line', partial: true };
        return { code: 'line', msg: kind === 'side' ? '這是斜的邊，和底沒有成直角。' : '這條線斜斜的，沒有直角記號。' };
      }
      const v = number('second');
      if (v === null) return { code: 'second', msg: '請填高是幾公分。' };
      return v === b ? null : { code: 'second', msg: '看高旁邊的數字，再填一次。' };
    }
    if (s === 4) {
      if (!answers.formula) return { code: 'formula', msg: '先選一個算式。' };
      if (answers.formula !== key.formula) {
        const m = answers.formula === 'product' && type === 'triangle' ? fb.formula.product_triangle : fb.formula[answers.formula];
        return { code: 'formula', msg: m };
      }
      const x = number('a'), y = number('b');
      if (x === null || y === null) return { code: 'ab', msg: '把兩個長度填進方格。' };
      const ok = (x === a && y === b) || (x === b && y === a);
      return ok ? null : { code: 'ab', msg: '方格裡要填圖上的' + (grid() ? '兩個邊長。' : '底和高。') };
    }
    if (s === 5) {
      const v = number('total');
      if (v === null) return { code: 'total', msg: '請填你算出的面積。' };
      if (v !== area()) {
        if (type === 'triangle' && v === a * b) return { code: 'total', msg: '這是兩片的面積。別忘了 ÷ 2。' };
        if (v === a + b) return { code: 'total', msg: '要用乘的，不是加的。' };
        return { code: 'total', msg: '再算一次。' + (has(1) ? '也可以打開「比一比」。' : '') };
      }
      if (has(1)) {
        if (!$('compare')?.open && !answers.compared) return { code: 'verify', soft: true, msg: '算對了！再按「🔍 比一比」看看。' };
        if (!answers.verify) return { code: 'verify', soft: true, msg: '比完了，選一個結果。' };
        if (answers.verify !== 'match') return { code: 'verify', msg: '再比一次：兩個結果一樣嗎？' };
      }
      return null;
    }
    if (!answers.unit) return { code: 'unit', msg: '選一個單位。' };
    return answers.unit === 'cm2' ? null : { code: 'unit', msg: fb.unit[answers.unit] };
  }

  // 把學生的作答轉成看得懂的文字，寫進紀錄
  function answerText(s, code) {
    if (P()) return (P().steps[s].ids || []).map(id => { const v = answers[id]; if (v === undefined || v === '') return ''; const b = document.querySelector(`[data-choice="${id}"][data-value="${v}"]`); return b ? clean(b) : String(v); }).filter(Boolean).join('、');
    const ids = { target: ['target'], count: ['count'], relation: ['relation'], base: [], first: ['first'], line: ['height'], second: ['second'], formula: ['formula'], ab: ['a', 'b'], total: ['total'], verify: ['verify'], unit: ['unit'] }[code] || [KEYS[s]];
    return ids.map(id => {
      const v = answers[id]; if (v === undefined || v === '') return '';
      const btn = document.querySelector(`[data-choice="${id}"][data-value="${v}"]`);
      return btn ? clean(btn) : id === 'height' ? v + ' 線' : String(v);
    }).filter(Boolean).join('、') || (code === 'count' ? `點了 ${tiles.length} 格` : '');
  }

  function validatePage(list = current()) {
    const groupBox = () => $('groupFeedback') || $('reflectFeedback');
    if (hintPending !== false) { showStatus(groupBox(), '先看完提示，按「我看完了」。'); return false; }
    if ($('compare')?.open) answers.compared = true;
    let ok = true, partial = false;
    for (const s of list) {
      if (checked.has(s)) continue;
      const r = issue(s);
      if (r && r.partial) {   // 找高：選對線，接著填長度
        lineOk = true; partial = true; ok = false;
        log('步驟檢核', { activity: s + 1, correct: true, issue: 'line', part: '選線' });
        continue;
      }
      if (r && r.soft) { ok = false; log('提醒還差一步', { activity: s + 1, issue: r.code }); continue; }   // 算對了、只差比一比：不算答錯
      log('步驟檢核', { activity: s + 1, correct: !r, issue: r ? r.code : 'none', hintLevel: hintLevel[s], choice: r ? answerText(s, r.code) : undefined });
      if (r) { ok = false; errors++; checked.delete(s); if (hintLevel[s] < 3 && mode() !== 'probe') { hintLevel[s]++; log('自動提示', { activity: s + 1, hintLevel: hintLevel[s] }); if (settings.hintGate && hintPending === false) hintPending = s; } }
      else checked.add(s);
    }
    const msgs = {}, tried = {};   // tried：這次的錯答案，讓小幫手認出「同一個答案又試一次」
    for (const s of list) { const r = checked.has(s) ? null : issue(s); msgs[s] = r; if (r) tried[s] = r.code + '|' + answerText(s, r.code); }
    rerenderKeep();
    if (hintPending !== false) lockForHint();
    for (const s of list) {
      const r = msgs[s];
      if (!r) showStatus($('feedback' + s), '答對了！', true);
      else if (r.partial || (s === 3 && lineOk && r.code === 'second' && partial)) showStatus($('feedback' + s), '找到了！', true);
      else showStatus($('feedback' + s), r.msg);
    }
    for (const s of list) if (msgs[s] && !msgs[s].partial && !msgs[s].soft) window.areaBuddy?.wrong(s, tried[s]);
    if (ok) { showStatus(groupBox(), phase === 'reflect' ? '單位答對了！' : '全部答對了，可以按「下一步」。', true); if (phase !== 'reflect') celebrate(); window.areaBuddy?.right(list[list.length - 1]); }
    else if (partial) showStatus(groupBox(), '找到高了！再填它的長度。', true);
    else if (list.every(s => checked.has(s) || msgs[s]?.soft)) showStatus(groupBox(), '快好了！照上面的說明再做一步。');
    else showStatus(groupBox(), mode() === 'probe' ? '有地方要再看一下，再試一次。' : '有地方要再看一下。看上面的提示。');
    const first = document.querySelector('.feedback.needs-work, .hint-panel:not([hidden])');
    if (!ok && first) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    updateLock();
    return ok;
  }

  function goPage(n) { log('返回修正', { to: n + 1 }); hintPending = false; page = Math.max(0, n); phase = 'solve'; render(); focus(); }

  // ---------- 提示 ----------
  function showHint(s, manual) {
    if (hintLevel[s] >= 3) return;
    hintLevel[s]++; hintsUsed++;
    log('請求提示', { activity: s + 1, hintLevel: hintLevel[s] });
    if (settings.hintGate) hintPending = s;
    rerenderKeep();
    const panel = $('hintText' + s);
    if (panel) { panel.classList.add('hint-flash'); panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    if (settings.hintGate) lockForHint();
  }
  function lockForHint() {
    document.querySelectorAll('.activity svg [role="button"]').forEach(e => { e.setAttribute('tabindex', '-1'); e.style.pointerEvents = 'none'; });
    document.querySelectorAll('.activity input,.activity [data-choice],.activity [data-tile],#transform,#revealBase,.hint-actions button,#check,#next,#retry,#new,#useProduct').forEach(e => e.disabled = true);
  }

  function aiPayload(kind, s) {
    const list = records.filter(r => r.cycle === cycle), wrong = list.filter(r => r.event === '步驟檢核' && !r.correct);
    const last = list.filter(r => r.event === '步驟檢核' && r.activity === s + 1).at(-1);
    if (P()) {   // 新活動：只送活動、步驟名稱與答錯情形，不送題目數字
      const n = P().steps.length;
      return { kind, shape: type, stepTitle: P().steps[s]?.title || P().steps[0].title, cycle: Math.min(cycle, 50), step: Math.min(s, 7), method: method === 'self' ? 'self' : 'mark', goal: ['g0', 'all'].includes(goal) ? 'independent' : 'check', hints: Math.min(hintsUsed, 50), errors: Math.min(errors, 50),
        hintLevel: hintLevel[s] || 0, incorrect: !!last && !last.correct, issue: last && !last.correct && /^[a-z][A-Za-z0-9]{0,11}$/.test(last.issue || '') ? last.issue : 'none',
        steps: Array.from({ length: Math.min(n, 8) }, (_, i) => Math.min(wrong.filter(r => r.activity === i + 1).length, 100)),
        backtracks: Math.min(list.filter(r => r.event === '返回修正').length, 100), completed: Math.min(records.filter(r => r.event === '整題完成').length, 50),
        helpRequests: Math.min(list.filter(r => r.event === '請求AI提示' || r.event === '請求提示').length, 100) };
    }
    return {
      kind, shape: type, cycle: Math.min(cycle, 50), step: s, method: method === 'self' ? 'self' : 'mark', goal: ['g0', 'all'].includes(goal) ? 'independent' : 'check', hints: Math.min(hintsUsed, 50), errors: Math.min(errors, 50),
      hintLevel: hintLevel[s] || 0, incorrect: !!last && !last.correct,
      operationComplete: grid() ? tiles.length === area() || !!answers.useProduct : frame === 2,
      comparisonOpened: !!$('compare')?.open, issue: last && !last.correct ? last.issue : 'none',
      steps: Array.from({ length: 7 }, (_, i) => Math.min(wrong.filter(r => r.activity === i + 1).length, 100)),
      backtracks: Math.min(list.filter(r => r.event === '返回修正').length, 100),
      completed: Math.min(records.filter(r => r.event === '整題完成').length, 50),
      helpRequests: Math.min(list.filter(r => r.event === '請求AI提示' || r.event === '請求提示').length, 100)
    };
  }
  async function askAI(kind, s, targetEl) {
    const fallback = kind === 'hint' ? hintText(s, Math.max(1, hintLevel[s])) : '你剛才用什麼方法檢查答案？';
    if (kind === 'hint' && !targetEl) { aiMsg[s] = '🤖 AI 正在想一個短提示……'; rerenderKeep(); }
    const target = targetEl || $('aiMsg' + s) || $('hintMessage' + s);
    if (target) { target.hidden = false; target.parentElement && (target.parentElement.hidden = false); if (targetEl) target.textContent = 'AI 正在想一個短提示……'; }
    const put = text => { if (kind === 'hint' && !targetEl) { aiMsg[s] = text; rerenderKeep(); } else if (target) { target.textContent = text; addSayButtons(target.parentElement || target); } };
    try {
      const payload = aiPayload(kind, s); payload.provider = sessionProvider; if (sessionApiKey) payload.apiKey = sessionApiKey;
      const res = await fetch('/api/ai-support', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store', referrerPolicy: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'unavailable');
      if (!data.message?.trim()) throw new Error('invalid');
      put('🤖 ' + data.message);
      log('AI回應', { activity: s + 1, kind, message: data.message, provider: sessionProvider });
    } catch (error) {
      put((kind === 'hint' ? 'AI 現在不能用，先看這個提示：' : 'AI 現在不能用，想一想：') + fallback);
      log('AI未啟用或暫時無法使用', { activity: s + 1, kind, provider: sessionProvider, error: error.message });
    }
  }

  // ---------- 正向回饋 ----------
  function celebrate(big = false) {
    if (!settings.reward) return;
    const host = $('app').querySelector('.surface');
    if (host) {
      const burst = document.createElement('div'); burst.className = 'burst' + (big ? ' big' : ''); burst.setAttribute('aria-hidden', 'true');
      burst.innerHTML = Array.from({ length: big ? 14 : 7 }, (_, i) => `<span style="--i:${i};--n:${big ? 14 : 7}">${i % 2 ? '✦' : '⭐'}</span>`).join('');
      host.append(burst); setTimeout(() => burst.remove(), 1600);
    }
    if (settings.sound) chime(big);
  }
  function chime(big) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const notes = big ? [523, 659, 784, 1047] : [659, 880];
      notes.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.12;
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.32);
      });
    } catch { /* 沒有聲音也沒關係 */ }
  }

  function comparisonText() {
    if (grid()) return answers.useProduct ? `用乘法再算一次：${dims()[0]} × ${dims()[1]}，和你的答案一樣嗎？` : `你一共點了 ${tiles.length} 格。和你算的答案一樣嗎？`;
    return type === 'triangle' ? '兩片拼起來的面積是底 × 高。你的答案 × 2，和它一樣嗎？' : '移好的長方形，面積是長 × 寬。和你的答案一樣嗎？';
  }
  function updateComparison() { if ($('comparison')) { $('comparison').textContent = number('total') === null ? '先填你算出的面積，再比一比。' : comparisonText(); addSayButtons($('comparison')); } }

  // ---------- ③ 檢查與回顧 ----------
  // 這一題的結果：提示數、一次就答對的步數、有沒有達到目標
  function result() {
    const list = records.filter(r => r.cycle === cycle && r.event === '步驟檢核');
    const missed = new Set(list.filter(r => !r.correct).map(r => r.activity - 1));
    const steps = P() ? new Set(P().steps.map((_, i) => i)) : new Set([...F.active(settings), ...(F.targetInPlan(settings) ? [0] : []), ...(F.unitInReflect(settings) ? [6] : [])]);
    if (workedSet) for (const n of [...steps]) if (isWorked(n)) steps.delete(n);   // 例題步驟不算進結果
    const retried = [...steps].filter(n => missed.has(n)).length;
    const watched = !!workedSet && steps.size === 0;   // 完整例題：沒有自己作答的步驟，不判斷目標
    const hints = workedSet ? hintLevel.reduce((t, x, i) => t + (isWorked(i) ? 0 : x), 0) : hintTotal(), g = watched ? 'any' : answers.goal || 'any', limit = C.goalLimit[g];
    const met = g === 'any' || mode() === 'probe' ? true : settings.goalKind === 'firstTry' ? retried <= limit : hints <= limit;
    return { hints, retried, steps: steps.size, firstTry: steps.size - retried, met, goal: g, watched };
  }
  function resultLine(r) {
    if (workedSet && !r.steps) return '我的結果：這題是例題，你看完了。';
    return settings.goalKind === 'firstTry' ? `我的結果：${r.steps} 步裡，${r.firstTry} 步一次就答對。` : `我的結果：用了 ${r.hints} 個提示。`;
  }
  function earned(r) {
    const b = [];
    const watched = workedSet && !r.steps;   // 完整例題：只給「完成」，不給表現類的章
    if (r.met && r.goal !== 'any' && !watched) b.push('goal');
    if (r.hints > 0 || records.some(x => x.cycle === cycle && x.event === '請求AI提示')) b.push('hint');
    if ((answers.compared || answers.verify === 'match') && !isWorked(5)) b.push('check');
    if (answers.myReflection || voices[cycle] || answers.cause) b.push('think');
    b.push('done');
    return settings.badges ? b : [];
  }

  // 我的進步：每一題一根柱子（提示數），達到目標的有星星
  function progressPanel(open) {
    const done = records.filter(r => r.event === '整題完成' && r.shapeKey === type).slice(-8);
    if (!done.length) return '';
    const max = Math.max(3, ...done.map(d => d.hints || 0));
    const bars = done.map((d, i) => `<li><span class="bar-num">${d.hints ?? 0}</span><span class="bar" style="--h:${Math.round(((d.hints || 0) / max) * 100)}%"></span><span class="bar-star" aria-hidden="true">${d.goalMet ? '⭐' : ''}</span><span class="bar-label">第${i + 1}題</span></li>`).join('');
    const a = done.at(-2), b = done.at(-1);
    // 第 20 版：少用提示不是唯一的進步；會檢查、會找幫忙、達到自己的目標也是
    const got = (d, k) => (d.badges || []).includes(k);
    const msg = b && got(b, 'goal') ? '上一題你達到了自己定的目標！'
      : b && got(b, 'check') ? '上一題你有自己檢查答案，這是很好的習慣！'
      : a && b && (b.firstTry ?? 0) > (a.firstTry ?? 0) ? '上一題一次就答對的步數變多了，進步了！'
      : a && b && (b.hints ?? 0) < (a.hints ?? 0) ? `上一題少用了 ${(a.hints ?? 0) - (b.hints ?? 0)} 個提示。需要的時候看提示，也是會學習的方法。`
      : '每一題都是練習。會用提示、會檢查，都是在進步。';
    const stamps = settings.badges ? Object.entries(done.flatMap(d => d.badges || []).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {})) : [];
    return `<details class="progress-panel" ${open ? 'open' : ''}><summary data-read>📈 我的進步（${nameOf()}）</summary>
      <p class="subtle" data-read data-say>柱子是每一題用了幾個提示，⭐ 是達到自己的目標。</p>
      <ol class="bars" aria-label="每一題用了幾個提示：${done.map((d, i) => `第${i + 1}題 ${d.hints ?? 0} 個${d.goalMet ? '，達到目標' : ''}`).join('；')}">${bars}</ol>
      <p data-read data-say>${msg}</p>
      ${stamps.length ? `<p class="stamps" data-read data-say>我的章：${stamps.map(([k, n]) => `${C.badges[k][0]} ${C.badges[k][1]} × ${n}`).join('　')}</p>` : ''}</details>`;
  }

  function reflect() {
    const inReflect = !P() && F.unitInReflect(settings);
    if (inReflect && isWorked(6)) workStep(6);
    if (inReflect && isWorked(6)) setTimeout(lockWorked);
    const list = records.filter(r => r.cycle === cycle && r.event === '步驟檢核' && !r.correct);
    const stages = [...new Set(list.map(r => titles()[r.activity - 1]).filter(Boolean))];
    const unitDone = !inReflect || checked.has(6);
    const r = result(), probe = mode() === 'probe';
    const goalItem = goalSet().items.find(x => x[0] === r.goal);
    const confItem = C.confidence.find(x => x[0] === answers.confidence);
    const judged = answers.selfMet !== undefined;
    const accurate = judged && (answers.selfMet === 'yes') === r.met;
    const compareCard = probe ? `<div class="srl-card"><p class="srl-title" data-read data-say>📝 小測驗完成</p><p data-read data-say>${resultLine(r)}</p></div>`
      : `<div class="srl-card goal-vs"><p class="srl-title" data-read data-say>🎯 我的目標和我的結果</p>
      <p data-read data-say>我的目標：${esc(goalItem ? goalItem[1] : '做完就好')}${confItem ? `；開始時：${confItem[1]}` : ''}</p>
      ${r.goal === 'any' ? `<p data-read data-say>${resultLine(r)} 你做完了！</p>` : `${choice('selfMet', '你覺得，有沒有達到目標？', C.selfMet, true)}
      ${judged ? `<p class="result-line ${r.met ? 'met' : 'not-met'}" data-read data-say>${resultLine(r)} ${r.met ? '✅ 達到目標了！' : '❌ 這次還沒達到。'}${accurate ? '你自己判斷得很準！' : '我們一起看一下結果。'}</p>` : ''}
      ${judged && !r.met ? `${choice('cause', '想一想，可能是什麼原因？', C.causes)}${answers.cause ? `<p class="notice" data-read data-say>💡 ${C.causeTip[answers.cause]}</p>` : ''}` : ''}`}</div>`;
    const positive = workedSet && !r.steps ? '你看完了一整題例題！' : stages.length ? `你在「${stages.join('」「')}」多練習了幾次，現在會了！` : '這題每一步都一次就答對！';
    const hintWords = r.hints ? (r.goal === 'g0' ? `你用了 ${r.hints} 個提示。` : `你用了 ${r.hints} 個提示幫自己，很會找幫忙！`) : '你沒有用提示。';
    shell(unitDone ? '🎉 完成了！' : '最後一步：寫單位', `${inReflect && !unitDone ? task(6) : (P() ? `<div class="done-banner"><p data-read data-say>${esc(P().done(ctx()))}</p><p class="chant" data-read data-say>📣 ${esc(P().chant)}</p><p data-read data-say>${esc(P().transfer)}</p></div>`
        : `<div class="done-banner"><p data-read data-say>面積是 ${esc(answers.total)} 平方公分。</p><p class="chant" data-read data-say>📣 ${C.chant[type]}</p><p data-read data-say>${C.transfer[type]}</p></div>`)}
      ${unitDone ? `${compareCard}
      <p data-read data-say>${positive}${probe ? '' : hintWords}</p>
      ${choice('reason', '什麼最能幫助你？', P() ? [...P().reasons.filter(x => !(probe && x[0] === 'hint')), ...(mode() === 'demo' ? [['demo', '看老師示範']] : []), ...(P().reasons.some(x => x[0] === 'alone') ? [] : [['alone', '我自己想']])] : [...(has(1) ? [method === 'row' ? ['row', '一排一排加'] : ['operation', grid() ? '點格子' : '動手操作圖形']] : [['look', '看圖']]), ...(has(2) || has(3) ? [['length', grid() ? '數邊長' : '找底和高']] : []), ['formula', '選對算式'], ...(probe ? [] : [['hint', '看提示']]), ...(mode() === 'demo' ? [['demo', '看老師示範']] : []), ['alone', '我自己想']])}
      ${choice('nextMethod', '下一題，你想怎麼做？', methodOptions())}
      <label class="field"><span data-read>也可以寫給老師看（可以不寫）</span><textarea id="myReflection" maxlength="140">${esc(answers.myReflection ?? '')}</textarea></label>
      ${settings.voice ? `<div class="voice-box">${button('recordVoice', recorder ? '⏹ 停止錄音' : voices[cycle] ? '🎤 重新錄音' : '🎤 錄音說給老師聽')}<span id="voiceStatus" role="status">${voices[cycle] ? '已經錄好了，老師可以在「教師觀察」聽。' : ''}</span></div>` : ''}
      ${settings.ai && !probe ? `<details><summary>🤖 想多想一點？請 AI 問你一個問題</summary>${button('aiReflect', '請 AI 問我')}<p id="aiReflectText" class="notice" role="status"></p></details>` : ''}
      ${progressPanel(true)}` : ''}
      <p id="reflectFeedback" class="feedback" role="status"></p>
      <div class="lesson-controls">${button('back', '← 回去看')}${inReflect && !unitDone ? button('check', '✔ 檢查') : ''}${unitDone ? button('retry', '再做一次這題') + button('new', '下一題 →', 'primary') : ''}</div>`);
    if (!unitDone) {
      bindActivity();
      $('check').onclick = () => { if (validatePage([6])) focus(); };
    } else {
      bindChoices(id => {
        if (id === 'selfMet') { delete answers.cause; log('自己判斷有沒有達到目標', { activity: 7, selfMet: answers.selfMet, goalMet: r.met }); rerenderKeep(); }
        if (id === 'cause') rerenderKeep();
      });
      if (!records.some(x => x.cycle === cycle && x.event === '完成畫面')) { log('完成畫面', { activity: 7 }); setTimeout(() => celebrate(true), 200); }
      $('myReflection').oninput = () => answers.myReflection = $('myReflection').value;
      if ($('aiReflect')) $('aiReflect').onclick = () => askAI('reflection', 6, $('aiReflectText'));
      if ($('recordVoice')) $('recordVoice').onclick = toggleRecord;
      const finish = next => {
        const need = [!probe && r.goal !== 'any' && !judged && '有沒有達到目標', !probe && judged && !r.met && !answers.cause && '可能的原因', !answers.reason && '什麼幫助你', !answers.nextMethod && '下一題怎麼做'].filter(Boolean);
        if (need.length) return showStatus($('reflectFeedback'), '請選：' + need.join('、') + '。');
        if (recorder) toggleRecord();
        const badges = earned(r), secs = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
        log('整題完成', { activity: 7, hints: r.hints, errors, goal: r.goal, goalKind: settings.goalKind, goalMet: r.watched ? false : r.met, watched: !!r.watched, selfMet: answers.selfMet || '', confidence: answers.confidence || '', firstTry: r.firstTry, steps: r.steps, secs, badges, dimensions: dims() });
        carry = { cycle, reason: chosenText('reason'), method: answers.nextMethod, cause: !r.met ? answers.cause : '', badges, fadeMsg: adjustFade(!retryQ) };
        retryQ = !next;
        log('反思與下一輪調整', { activity: 7, choice: `目標：${probe ? '小測驗' : goalItem ? goalItem[1] : '做完就好'}；結果：${resultLine(r).replace('我的結果：', '')}；自己判斷：${answers.selfMet ? chosenText('selfMet') : '—'}；原因：${answers.cause ? chosenText('cause') : '—'}；幫助我的：${chosenText('reason')}；下一題：${chosenText('nextMethod')}${answers.myReflection ? '；學生說：' + answers.myReflection : ''}${voices[cycle] ? '；有錄音' : ''}`, judgment: answers.selfMet || '', reason: carry.reason, cause: answers.cause || '', studentWords: answers.myReflection || '', nextMethod: carry.method, nextAction: next ? '新題' : '重試' });
        if (next) index = (index + 1) % 3; else keepProblem = true;
        cycle++;
        const doneCount = records.filter(x => x.event === '整題完成').length;
        if (settings.rest && doneCount % settings.rest === 0) { openRest('time'); }
        startQuestion(); focus();
      };
      $('retry').onclick = () => finish(false); $('new').onclick = () => finish(true);
    }
    $('back').onclick = () => goPage(pages().length - 1);
  }

  // ---------- 錄音（只存在這個分頁，不會上傳） ----------
  async function toggleRecord() {
    if (recorder) { recorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [], rec = new MediaRecorder(stream), c = cycle, t0 = Date.now();
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); recorder = null;
        voices[c] = { url: URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })), secs: Math.round((Date.now() - t0) / 1000), shape: nameOf() };
        log('錄音反思', { activity: 7, secs: voices[c].secs }); if (phase === 'reflect') rerenderKeep();
      };
      recorder = rec; rec.start(); rerenderKeep();
      if ($('voiceStatus')) $('voiceStatus').textContent = '正在錄音……說完按「停止錄音」。';
    } catch { if ($('voiceStatus')) $('voiceStatus').textContent = '這台裝置不能錄音，可以用寫的或說給老師聽。'; }
  }

  // ---------- 休息一下 ----------
  function openRest(why) {
    const d = $('restDialog'); if (!d || d.open) return;
    log('休息', { why: why === 'time' ? '教師設定的休息時間' : why === 'buddy' ? '小幫手提醒' : '學生自己按休息' });
    let left = 60; $('restLeft').textContent = left;
    clearInterval(openRest.timer);
    openRest.timer = setInterval(() => { left = Math.max(0, left - 1); $('restLeft').textContent = left; if (!left) clearInterval(openRest.timer); }, 1000);
    $('restWhy').textContent = why === 'time' ? '做了好幾題了，休息一下吧！' : '好，我們休息一下。';
    d.showModal();
  }

  // ---------- 朗讀 ----------
  function stopRead() {
    speechToken++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    document.querySelectorAll('.reading').forEach(e => e.classList.remove('reading'));
    if ($('read')) $('read').textContent = '🔊 全部唸給我聽';
  }
  const plainText = el => clean(el);
  // 選比較自然的中文語音：優先台灣國語，再找名稱含 Natural／Online／Google 等較新的語音
  function pickVoice() {
    try {
      const all = speechSynthesis.getVoices() || [];
      const zh = all.filter(v => /^zh[-_]TW/i.test(v.lang)).concat(all.filter(v => /^zh/i.test(v.lang) && !/^zh[-_]TW/i.test(v.lang)));
      const good = /Natural|Online|Neural|Google|Mei-Jia|美佳|Yating|HsiaoChen|曉臻|Hanhan/i;
      return zh.find(v => good.test(v.name)) || zh[0] || null;
    } catch { return null; }
  }
  if ('speechSynthesis' in window && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => {});

  function speakList(list) {
    if (!('speechSynthesis' in window)) { alert('這個瀏覽器不能朗讀，請老師幫忙。'); return; }
    stopRead(); const token = ++speechToken; let i = 0;
    if (list.length > 1) $('read').textContent = '⏹ 停止朗讀';
    const next = () => {
      if (token !== speechToken) return;
      if (i >= list.length) { stopRead(); return; }
      const el = list[i++], text = plainText(el);
      if (!text) return next();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; u.rate = settings.rate === 'slow' ? 0.7 : 0.9; const v = pickVoice(); if (v) u.voice = v;
      u.onstart = () => { el.classList.add('reading'); el.scrollIntoView({ block: 'nearest' }); };
      u.onend = () => { el.classList.remove('reading'); next(); };
      u.onerror = () => stopRead();
      speechSynthesis.speak(u);
    };
    next();
  }
  // 每一句旁邊放一個小喇叭，點了只唸這一句
  function addSayButtons(root) {
    root.querySelectorAll('[data-say]').forEach(el => {
      if (el.querySelector(':scope > .say')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'say'; b.textContent = '🔊'; b.setAttribute('aria-label', '唸這一句');
      b.onclick = e => { e.preventDefault(); e.stopPropagation(); log('朗讀一句', { activity: step() }); speakList([el]); };
      el.append(b);
    });
  }
  const step = () => phase === 'solve' ? current()[0] + 1 : phase === 'reflect' ? 7 : 0;

  $('read').onclick = () => {
    if ('speechSynthesis' in window && speechSynthesis.speaking) { stopRead(); return; }
    const list = [...$('app').querySelectorAll('h1,[data-read],[data-choice],.hint-panel p:not(.hint-level)')]
      .filter(e => e.getClientRects().length && !e.closest('[hidden]') && !(e.matches('[data-read]') && e.closest('[data-choice]')));
    log('朗讀全部', { activity: step() }); speakList(list);
  };

  // ---------- 教師觀察 ----------
  function summary() {
    const list = records.filter(r => r.cycle === cycle);
    const rows = titles().map((t, i) => {
      const a = i + 1, checks = list.filter(r => r.activity === a && r.event === '步驟檢核');
      const enter = list.find(r => r.activity === a && r.event === '進入步驟');
      const later = list.filter(r => enter && r.time > enter.time && r.event === '進入步驟' && r.activity !== a)[0] || list.filter(r => r.activity === a).at(-1);
      const secs = enter && later ? Math.max(0, Math.round((new Date(later.time) - new Date(enter.time)) / 1000)) : null;
      const level = Math.max(0, ...list.filter(r => r.activity === a && r.hintLevel != null).map(r => r.hintLevel));
      return { t, wrong: checks.filter(r => !r.correct).length, level, ai: list.filter(r => r.activity === a && r.event === '請求AI提示').length, video: list.filter(r => r.activity === a && r.event === '看示範影片').length, secs, used: checks.length > 0 || !!enter };
    });
    return `<table class="stats"><thead><tr><th>步驟</th><th>答錯</th><th>最高提示</th><th>問 AI</th><th>看示範</th><th>約花秒數</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.used ? '' : 'unused'}"><td>${r.t}</td><td>${r.wrong}</td><td>${r.level ? '第 ' + r.level + ' 層' : '—'}</td><td>${r.ai}</td><td>${r.video}</td><td>${r.secs ?? '—'}</td></tr>`).join('')}</tbody></table>
      <p class="subtle">第 ${cycle} 題 · 本題答錯 ${errors} 次 · 看過 ${hintLevel.reduce((x, y) => x + y, 0)} 個提示。數字只代表點擊紀錄，是否理解請以觀察為準。</p>`;
  }

  // 本次所有已完成題目的統計
  function allSummary() {
    const done = records.filter(r => r.event === '整題完成');
    if (!done.length) return '<h3>本次所有題目</h3><p class="subtle">還沒有完成的題目。</p>';
    const rows = done.map(d => {
      const list = records.filter(r => r.cycle === d.cycle && r.shape === d.shape);
      const start = list.find(r => r.event === '整題定標') || list[0];
      const secs = Math.max(0, Math.round((new Date(d.time) - new Date(start.time)) / 1000));
      const wrong = list.filter(r => r.event === '步驟檢核' && r.correct === false);
      const counts = Object.entries(wrong.reduce((m, r) => (m[r.activity] = (m[r.activity] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
      const top = counts.filter(c => counts.length && c[1] === counts[0][1]);
      const most = top.length === 1 ? top[0] : top.length > 1 ? ['multi', top[0][1], top.length] : null;
      const hintCount = list.filter(r => r.event === '自動提示' || r.event === '請求提示').length;
      const refl = records.find(r => r.cycle === d.cycle && r.event === '反思與下一輪調整');
      const modeName = { self: '自己做', together: '一起做', demo: '示範', probe: '小測驗' }[d.mode] || '';
      const met = d.goal === 'any' || d.mode === 'probe' ? '—' : d.goalMet ? '✅' : '❌';
      const judge = d.selfMet ? ((d.selfMet === 'yes') === !!d.goalMet ? '準' : '不準') : '—';
      return `<tr><td>${d.shape}</td><td>${d.cycle}</td><td>${modeName}</td><td>${wrong.length}</td><td>${!most ? '—' : most[0] === 'multi' ? `${most[2]} 個步驟各 ${most[1]} 次` : (list.find(r => r.activity === Number(most[0]) && r.stepTitle) || {}).stepTitle || (d.shapeKey === type ? titles()[most[0] - 1] : '第 ' + most[0] + ' 步')}</td><td>${d.hints ?? hintCount}</td><td>${Math.floor(secs / 60)} 分 ${secs % 60} 秒</td><td>${met}</td><td>${judge}</td><td>${refl ? esc(refl.reason) : ''}${refl && refl.cause ? '；原因：' + esc((C.causes.find(c => c[0] === refl.cause) || ['', ''])[1]) : ''}</td></tr>`;
    }).join('');
    return `<h3>本次所有題目</h3><div class="table-wrap"><table class="stats"><thead><tr><th>圖形</th><th>題</th><th>階段</th><th>答錯</th><th>最常卡住</th><th>提示</th><th>時間</th><th>達標</th><th>自評</th><th>學生說什麼幫助他</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // 依最近的表現，建議老師調整支持（只建議，不自動改）
  function fadingAdvice() {
    const done = records.filter(r => r.event === '整題完成' && r.shapeKey === type && r.mode !== 'demo' && r.mode !== 'probe');
    if (done.length < 2) return '<p class="advice">📌 再完成幾題後，這裡會依表現建議要增加或減少支持。</p>';
    const rate = d => d.steps ? d.firstTry / d.steps : 0;
    const last3 = done.slice(-3), last2 = done.slice(-2);
    if (last3.length === 3 && last3.every(d => (d.hints ?? 9) <= 1 && rate(d) >= 0.8)) return '<p class="advice good">📌 建議減少支持：最近 3 題提示都 ≤ 1 個、八成以上的步驟一次答對。可以試試「減少提示」、「3 步精簡」，或把教學階段改成「自己做」，之後用「小測驗」看能不能維持。</p>';
    if (last2.every(d => (d.hints ?? 0) >= 5 || rate(d) < 0.5)) return '<p class="advice more">📌 建議增加支持：最近 2 題提示較多或一半以上的步驟要再試。可以改成「完整引導」、「一起做」或「老師示範」，或打開方格線、一直顯示長度。</p>';
    return '<p class="advice">📌 目前的支持程度看起來合適，繼續觀察。</p>';
  }

  // 每一題的答錯、提示（次）與時間（分）折線圖，可以標出研究階段
  function chart() {
    const done = records.filter(r => r.event === '整題完成');
    if (done.length < 2) return '';
    const W = 560, H = 200, L = 40, B = 34, T = 26, n = done.length;
    const x = i => L + (n === 1 ? 0 : i * (W - L - 16) / (n - 1));
    const panel = (title, series, unit) => {
      const max = Math.max(2, ...series.flatMap(s => s.v)), y = v => T + (H - T - B) * (1 - v / max);
      const ticks = [0, Math.round(max / 2), max];
      const phases = done.map((d, i) => i > 0 && d.studyPhase !== done[i - 1].studyPhase ? `<line x1="${(x(i) + x(i - 1)) / 2}" x2="${(x(i) + x(i - 1)) / 2}" y1="${T}" y2="${H - B}" class="phase-line"/><text x="${(x(i) + x(i - 1)) / 2 + 4}" y="14" class="phase-name">${esc(d.studyPhase || '未標')}</text>` : '').join('');
      const first = done[0].studyPhase ? `<text x="${L + 4}" y="14" class="phase-name">${esc(done[0].studyPhase)}</text>` : '';
      // 直接標示線名；兩條線終點太近時錯開，避免文字重疊
      const ends = series.map(s => y(s.v.at(-1)));
      for (let k = 1; k < ends.length; k++) if (Math.abs(ends[k] - ends[k - 1]) < 14) ends[k] = ends[k - 1] - 14;
      const lines = series.map((s, si) => `<polyline fill="none" stroke="${s.c}" stroke-width="2" points="${s.v.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>${s.v.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${s.c}" stroke="#fff" stroke-width="2"><title>第 ${i + 1} 題（${done[i].shape}）${s.name}：${v} ${unit}</title></circle>`).join('')}<text x="${x(n - 1) + 8}" y="${ends[si] + 4}" class="direct" fill="#172b4d">${s.name}</text>`).join('');
      return `<figure class="chart"><figcaption>${title}</figcaption><svg viewBox="0 0 ${W + 60} ${H}" role="img" aria-label="${title}">
        ${ticks.map(t => `<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" class="tick">${t}</text>`).join('')}
        ${done.map((d, i) => `<text x="${x(i)}" y="${H - B + 18}" text-anchor="middle" class="tick">${i + 1}</text>`).join('')}
        <text x="${(L + W) / 2}" y="${H - 4}" text-anchor="middle" class="tick">第幾題</text>${phases}${first}${lines}</svg>
        ${series.length > 1 ? `<p class="legend">${series.map(s => `<span><i style="background:${s.c}"></i>${s.name}</span>`).join('')}</p>` : ''}</figure>`;
    };
    const secs = done.map(d => d.secs ?? 0);
    return `<h3>進步曲線</h3>${panel('答錯與提示（次）', [{ name: '答錯', c: '#eb6834', v: done.map(d => d.errors || 0) }, { name: '提示', c: '#2a78d6', v: done.map(d => d.hints || 0) }], '次')}${panel('作答時間（秒）', [{ name: '秒數', c: '#2a78d6', v: secs }], '秒')}
      <p class="subtle">滑鼠移到點上可看數字。直的虛線是研究階段改變的地方。詳細數字見上面的表格與 CSV。</p>`;
  }

  const CSV_HEAD = ['時間', '圖形', '第幾題', '步驟', '事件', '是否答對', '錯在哪裡', '提示層級', '學生的選擇或內容', '支持程度', '回應方式', '解題流程', '難度', '教學階段', '研究階段', '目標', '把握', '是否達標', '自己判斷', '本題提示數', '一次答對步數', '作答秒數', '得到的章', '單元', '活動編號', '課綱代碼'];
  const issueName = { target: '要找什麼', count: '數格子', relation: '操作後比較', base: '點底', first: '底／第一邊', line: '選高的線', second: '高／第二邊', formula: '選算式', ab: '算式數字', total: '計算', verify: '比一比', unit: '單位', none: '' };
  function exportData() {
    const flowName = { seven: '7 步', three: '3 步', custom: '自訂' };
    const local = t => { const d = new Date(t), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`; };
    const rows = records.map(r => [local(r.time), r.shape, r.cycle, r.activity ? (r.stepTitle || (r.shapeKey === type ? titles()[r.activity - 1] : '') || '第 ' + r.activity + ' 步') : '', r.event,
      r.correct === undefined ? '' : r.correct ? '是' : '否', issueName[r.issue] ?? r.issue ?? '', r.hintLevel ?? '',
      r.choice ?? r.message ?? r.evidence ?? r.studentWords ?? r.source ?? '', r.support === 'faded' ? '減少提示' : '完整引導', r.response, flowName[r.flow] || r.flow, { easy: '入門', standard: '一般', challenge: '挑戰', custom: '自訂' }[r.difficulty] || r.difficulty,
      { self: '自己做', together: '一起做', demo: '老師示範', probe: '小測驗' }[r.mode] || '', r.studyPhase || '',
      r.event === '整題完成' ? ({ g0: '0 個提示', g1: '1 個提示以內', g3: '3 個提示以內', all: '每步一次答對', most: '最多 1 步再試', any: '做完就好' }[r.goal] || '') : '',
      r.event === '整題完成' || r.event === '整題定標' ? ({ low: '不太有把握', mid: '有一點把握', high: '很有把握' }[r.confidence] || '') : '',
      r.goalMet === undefined ? '' : r.goalMet ? '是' : '否', r.selfMet ? (r.selfMet === 'yes' ? '有達到' : '還沒有') : '',
      r.event === '整題完成' ? r.hints ?? '' : '', r.firstTry ?? '', r.secs ?? '', (r.badges || []).map(b => C.badges[b][1]).join('、'),
      ...(() => { const a = ACT && ACT.info(r.actId || r.shapeKey); const u = a && ACT.UNITS.find(x => x.id === a.unit); return a ? [u ? u.title : '', a.no, a.code] : ['', '', '']; })()]);
    const csv = '﻿' + [CSV_HEAD, ...rows].map(row => row.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const name = `area-record_${new Date().toISOString().slice(0, 10)}_${String(Date.now()).slice(-4)}.csv`;   // 英數檔名：中文檔名在部分瀏覽器會變成沒有副檔名的 download
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    $('exportResult').innerHTML = '試用版不能下載檔案。下面是 CSV 內容，可以全選複製後貼到 Excel。<textarea id="csvText" readonly style="width:100%;min-height:160px;font-size:13px"></textarea>';
    $('csvText').value = csv.replace(/^\uFEFF/, ''); $('csvText').focus(); $('csvText').select();
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  $('teacher').onclick = () => {
    const flowName = settings.flow === 'three' ? '3 步精簡' : settings.flow === 'seven' ? '7 步完整' : '教師自訂';
    $('toolBody').innerHTML = `<p><a href="teacher.html">前往教師備課：調整難度、流程與提示</a>　<a href="seven-guide.html" target="_blank" rel="noopener">📘 教師使用手冊</a></p><p>目前方案：${flowName}。</p>
      ${type ? fadingAdvice() : ''}
      <h3>本題摘要</h3>${type ? summary() : '<p>尚未開始。</p>'}${allSummary()}${chart()}
      ${Object.keys(voices).length ? `<h3>學生的錄音（只存在這個分頁）</h3>${Object.entries(voices).map(([c, v]) => `<p>第 ${c} 題（${v.shape}，${v.secs} 秒）<audio controls src="${v.url}"></audio></p>`).join('')}` : ''}
      <h3>本次支持</h3><label>教學階段<select id="mode"><option value="self">自己做</option><option value="together">一起做（自動出現一起想的問題與第 1 層提示）</option><option value="demo">老師示範（每一步可以按「看老師做」）</option><option value="probe">小測驗（沒有提示、隨機數字，評量能否維持）</option></select></label>
      <label>研究階段（寫進紀錄與曲線圖）<select id="studyPhase"><option value="">不標示</option><option>基線期</option><option>介入期</option><option>維持期</option><option>類化期</option></select></label>
      <label>提示程度<select id="support"><option value="full">完整引導（自動顯示第一個提示）</option><option value="faded">減少提示（需要時再看，可用乘法）</option></select></label>
      <label>回應方式<select id="response"><option>自行操作</option><option>口述、教師代輸入</option><option>指選、教師代輸入</option></select></label>${button('apply', '套用本次支持')}
      <h3>教師觀察</h3><label>觀察階段<select id="observe"><option>看題、選方法</option><option>動手算</option><option>檢查、回顧</option></select></label>
      <label>支持程度<select id="level"><option>未觀察／證據不足</option><option>自己完成</option><option>一般提醒後</option><option>具體提示後</option><option>示範協助</option></select></label>
      <label>學生對小方的反應<select id="buddyReact"><option value="">未觀察</option><option>接受幫忙</option><option>忽略</option><option>覺得煩</option><option>被嚇到</option><option>主動找小方</option></select></label>
      <label>實際行為（勿填姓名）<textarea id="evidence" maxlength="300"></textarea></label>${button('saveObservation', '記下觀察')}<p id="observed" role="status"></p>
      ${settings.ai ? `${button('aiSummary', '請 AI 整理本題紀錄')}<p id="aiSummaryText" class="notice" role="status">只使用點擊次數，不傳送教師筆記。</p>` : ''}
      <p>目前 ${records.length} 筆紀錄（含其他圖形）；換圖形、重新整理都會保留，關掉這個分頁才會清除，請在課後下載。</p>${button('clearRecords', '清除本分頁紀錄（換下一位學生時）')}<p id="clearMsg" role="status"></p>${button('export', '下載 CSV', 'primary')}<p id="exportResult" role="status"></p>`;
    $('support').value = settings.support; $('response').value = response; $('mode').value = mode(); $('studyPhase').value = studyPhase;
    $('apply').onclick = () => {
      settings.support = $('support').value; response = $('response').value; studyPhase = $('studyPhase').value;
      if (type) L().settings = { ...L().settings, support: settings.support };
      if (type && $('mode').value !== mode()) { const toProbe = $('mode').value === 'probe' || mode() === 'probe'; settings.mode = $('mode').value; L().settings = { ...L().settings, mode: settings.mode }; if (toProbe || settings.fading) { if (settings.fading) cycle++; log('調整支持', { activity: step() }); $('tools').close(); startQuestion(); return; } } if (settings.support === 'full' && answers.useProduct) { answers.useProduct = false; invalidate('useProduct'); } log('調整支持', { activity: step() }); $('tools').close(); render(); };
    $('saveObservation').onclick = () => { const evidence = $('evidence').value.trim(); if (!evidence && !$('buddyReact').value && $('level').selectedIndex === 0) { $('observed').textContent = '請先勾選支持程度、小方反應，或寫下實際行為。'; return; } log('教師觀察', { activity: step(), phase: $('observe').value, level: $('level').value, buddyReact: $('buddyReact').value, evidence }); $('observed').textContent = window.areaResearch?.active() ? '已記下，會自動上傳到試算表。' : '已記下，可以下載 CSV。'; };
    if ($('aiSummary')) $('aiSummary').onclick = () => askAI('teacher', 6, $('aiSummaryText'));
    $('export').onclick = exportData;
    $('clearRecords').onclick = () => { if ($('clearRecords').dataset.confirm !== '1') { $('clearRecords').dataset.confirm = '1'; $('clearRecords').textContent = '確定清除？再按一次'; return; } records = []; saveRecords(); cycle = 1; try { sessionStorage.removeItem(FADE_KEY); } catch { /* 略過 */ } fadeFull = false; retryQ = false; carry = null; if (type) startQuestion(); $('clearMsg').textContent = '已清除。下一位學生可以開始了。'; };
    $('tools').showModal();
  };
  $('closeTools').onclick = () => $('tools').close();

  $('apiSettings').onclick = () => { $('personalKey').value = ''; $('keyProvider').value = sessionProvider; $('keyError').hidden = true; $('keyStatus').textContent = sessionApiKey ? '目前使用本分頁的個人金鑰。' : '目前使用網站金鑰。'; $('keyDialog').showModal(); };
  $('closeKey').onclick = () => $('keyDialog').close();
  $('keyDialog').addEventListener('close', () => { $('personalKey').value = ''; });
  $('saveKey').onclick = () => { const key = $('personalKey').value.trim(); if (!/^sk-[^\s]{20,400}$/.test(key)) { $('keyError').textContent = '請輸入完整 API key。'; $('keyError').hidden = false; return; } sessionApiKey = key; sessionProvider = $('keyProvider').value; $('keyDialog').close(); };
  $('clearKey').onclick = () => { sessionApiKey = ''; sessionProvider = 'openai'; $('keyDialog').close(); };

  // ---------- 閱讀輔助：注音、字級、高對比（學生自己切換的會蓋過老師的預設） ----------
  const AID_KEY = 'area-reading-v18';
  function aidPrefs() { try { return JSON.parse(sessionStorage.getItem(AID_KEY) || '{}') || {}; } catch { return {}; } }
  function reading() { const p = aidPrefs(); return { zhuyin: p.zhuyin ?? !!settings.zhuyin, textSize: p.textSize ?? settings.textSize ?? 'normal', contrast: p.contrast ?? !!settings.contrast }; }
  function applyReading() {
    const r = reading(), root = document.documentElement;
    root.dataset.size = r.textSize; root.classList.toggle('contrast', r.contrast); root.classList.toggle('zhuyin-on', r.zhuyin);
    if ($('aidZhuyin')) { $('aidZhuyin').setAttribute('aria-pressed', String(r.zhuyin)); $('aidSize').textContent = { normal: '字：一般', large: '字：大', xlarge: '字：特大' }[r.textSize]; $('aidContrast').setAttribute('aria-pressed', String(r.contrast)); }
    if (window.zhuyin) window.zhuyin.enable($('app'), r.zhuyin);
  }
  function setAid(k, v) { const p = aidPrefs(); p[k] = v; try { sessionStorage.setItem(AID_KEY, JSON.stringify(p)); } catch { /* 略過 */ } applyReading(); if (type) log('閱讀輔助', { activity: step(), aid: k, value: String(v) }); }
  if ($('aidZhuyin')) {
    $('aidZhuyin').onclick = () => setAid('zhuyin', !reading().zhuyin);
    $('aidSize').onclick = () => setAid('textSize', { normal: 'large', large: 'xlarge', xlarge: 'normal' }[reading().textSize]);
    $('aidContrast').onclick = () => setAid('contrast', !reading().contrast);
    $('restBtn').onclick = () => openRest('student');
    $('restDone').onclick = () => { clearInterval(openRest.timer); $('restDialog').close(); if (type) log('休息結束', { activity: step() }); };
  }

  // ---------- 學習地圖（首頁） ----------
  function mapView() {
    const m = lessons.map || {}, avail = ACT ? ACT.available() : Object.keys(names).map(id => ({ id, title: names[id], unit: 'u3', no: '' }));
    const assigned = Array.isArray(m.assigned) ? m.assigned : avail.map(a => a.id);
    const done = id => records.filter(r => r.event === '整題完成' && (r.actId || r.shapeKey) === id).length;
    const order = avail.filter(a => assigned.includes(a.id));
    const lockedSet = new Set();
    if (m.sequential) order.forEach((a, i) => { if (i > 0 && !order.slice(0, i).every(b => done(b.id) > 0)) lockedSet.add(a.id); });
    const units = (ACT ? ACT.UNITS : [{ id: 'u3', title: '圖形', icon: '' }]).map(u => {
      const acts = avail.filter(a => a.unit === u.id && (assigned.includes(a.id) || isTeacher));
      if (!acts.length) return '';
      return `<section class="map-unit"><h2 data-read><span aria-hidden="true">${u.icon}</span> ${esc(u.title)}</h2><div class="map-cards">${acts.map(a => {
        const n = done(a.id), locked = lockedSet.has(a.id), off = !assigned.includes(a.id);
        const status = off ? '老師還沒有指派' : locked ? '🔒 先完成前面的活動' : n ? `完成 ${n} 題` : '還沒開始';
        return `<a class="map-card${locked ? ' locked' : ''}${off ? ' off' : ''}" ${locked ? 'aria-disabled="true" tabindex="-1"' : ''} href="seven.html?a=${a.id}${draftQ}" data-map="${a.id}">
          <span class="map-icon" aria-hidden="true">${a.icon || ''}</span><span class="map-no">${a.no}</span><span class="map-title" data-read>${esc(a.title)}</span>
          <span class="map-stars" aria-label="完成 ${n} 題">${'⭐'.repeat(Math.min(3, n))}${'☆'.repeat(Math.max(0, 3 - n))}</span><span class="map-status">${status}</span></a>`;
      }).join('')}</div></section>`;
    }).join('');
    shell('學習地圖', `<p data-read data-say>${m.sequential ? '照順序一個一個完成，完成後下一個就會打開。' : '選一個活動開始。完成一題會得到一顆星。'}</p>${units}
      ${isTeacher ? '<p class="subtle">老師看得到全部活動；學生只看得到「教師備課」裡指派的活動。灰色是還沒指派的。</p>' : ''}`);
    document.querySelectorAll('.map-card.locked').forEach(a => a.onclick = e => { e.preventDefault(); });
  }

  // ---------- 第 22 版：學習小幫手（buddy.js）只透過這些函式讀狀態、做動作 ----------
  function attachBuddy() {
    window.areaBuddy?.attach({
      settings: () => window.areaResearch && !window.areaResearch.cameraAllowed() ? { ...settings, attention: false } : settings, mode, step,
      phase: () => type ? phase : 'map',
      steps: () => current().filter(s => !isWorked(s)),
      passed: s => checked.has(s), hintLevel: s => hintLevel[s] || 0, stuckOpen: s => stuckOpen === s,
      busy: () => hintPending !== false || videoOpen.size > 0,
      hint: s => { if (hintLevel[s] < 3) showHint(s, true); },
      stuck: s => { if (stuckOpen === s) return; stuckOpen = s; log('我卡住了', { activity: s + 1, by: '小幫手' }); rerenderKeep(); },
      rest: () => openRest('buddy'),
      log, voice: pickVoice
    });
  }

  async function init() {
    try {
      const session = await (await fetch('/api/session', { cache: 'no-store' })).json();
      if (!session.authenticated) { return; }
      $('teacher').hidden = !session.teacher;
      if (session.test) { sessionProvider = 'deepseek'; $('apiSettings').hidden = true; }
      const draft = session.teacher && new URLSearchParams(location.search).get('draft') === '1';
      const res = await fetch(draft ? '/api/teacher/lessons' : '/api/lessons', { cache: 'no-store' }), result = await res.json();
      if (!res.ok) throw new Error(result.error || 'load_failed');
      lessons = draft ? result.draft || result.published : result.config;
      isTeacher = !!session.teacher;
      lessons.activities = lessons.activities || {};
      if (P() && !lessons.activities[type]) lessons.activities[type] = {};
      loadRecords();
      if (P()) { settings = F.settings(L()); if (!settings.ai) $('apiSettings').hidden = true; pProblem = P().makeProblem(level(), index, Math.random); }
      else if (type) { settings = F.settings(L()); orders.lines = F.shuffle(['A', 'B', 'C']); if (!settings.ai) $('apiSettings').hidden = true; if (settings.mode === 'probe') probeDims = F.randomProblem(type, settings.difficulty === 'custom' ? 'standard' : settings.difficulty); }
      attachBuddy(); applyReading();
      window.areaResearch?.init(lessons.research, { records: () => records, settings: () => settings, activity: () => ({ id: type || '', name: type ? nameOf() : '' }), step, log, changed: () => render() });
      render();
    } catch (error) { shell('教材暫時無法載入', `<p>${esc(error.message)}</p><a href="/">返回入口</a>`); }
  }
  init();
})();

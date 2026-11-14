'use strict';
// 第 28 版：折線圖教材包的其他 16 個活動（單元 0、1、2-2、2-3、3、4、5-2～5-4、6）。圖形工具在 act-line.js（window.lineFig）。
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml, shuffle } = U, F = window.lineFig;
  const { CTX, LEVELS, MONTHS, makeChart, chartSVG, tableHtml, numberLineSVG, valueOf, maxAt, scaleStep, readObs, readMsg, bindX, bindCells, plotCheck, methods, COLOR, SHAPE, rnd } = F;
  const pressKey = (el, go) => { el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; };
  const opt3 = (p, right, cands) => [...new Set([right, ...cands])].filter(i => i >= 0 && i < p.xs.length).slice(0, 3).map(i => [String(i), esc(p.full[i])]);

  // 兩組資料（兩條線、二維表格）：同一個情境、同一段時間
  const NAMES = { water: ['小安', '小明'], dog: ['小黑', '小白'], bean: ['A 株', 'B 株'], rain: ['台北', '台中'], jump: ['小美', '小安'], book: ['甲班', '乙班'], save: ['小華', '小玉'], temp: ['台北', '高雄'], height: ['小傑', '小如'] };
  function makeTwo(level, i, rand, o = {}) {
    const p = makeChart(level, i, rand, o), start = MONTHS.includes(p.xs[0]) ? MONTHS.indexOf(p.xs[0]) : 0;
    let q;
    for (let t = 0; t < 40; t++) { q = makeChart(level, i, rand, { ...o, key: p.key, n: p.xs.length, startMonth: start }); if (q.series[0].v.every((y, j) => y !== p.series[0].v[j])) break; }
    const names = NAMES[p.key] || ['甲', '乙'], c = CTX[p.key];
    const hi = Math.max(...p.series[0].v, ...q.series[0].v), top = Math.ceil((hi - p.min) / (p.step * p.every)) * p.step * p.every + p.min;
    return { ...p, title: `${names.join('和')}的${c.what}`, series: [{ name: names[0], v: p.series[0].v }, { name: names[1], v: q.series[0].v }], rows: Math.max(p.every * 2, 4, Math.round((top - p.min) / p.step)), dims: [p.xs.length, p.step, hi] };
  }
  const reasons = [['look', '先看圖或表格'], ['scale', '算一格是多少'], ['hint', '看提示']];

  // =============== 0-1 表格找資料（先測） ===============
  A.register('lnTable', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeTwo(level === 'challenge' ? 'standard' : level, i, rand); const ti = rnd(rand, 0, p.xs.length - 1), tj = rnd(rand, 0, p.xs.length - 1);
      return { ...p, ti, tj, one: { ...p, title: CTX[p.key].title, series: [p.series[0]] }, prompt: '看表格，找出題目要的數。' }; },
    planFigure: ctx => tableHtml(ctx.problem.one),
    steps: [
      { title: '一維表格', ids: ['a1'], hints: ['先在第一列找到題目說的時間。', '找到時間以後，往下看同一欄。', '同一欄下面的數，就是答案。'],
        think: '老師先找時間，再往下看同一欄的數。', together: '一起找：這個時間下面寫多少？',
        figure: ctx => tableHtml(ctx.problem.one, { hl: ctx.hint(0) >= 2 ? ctx.problem.ti : null }),
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${fieldHtml(ctx, 'a1', `${esc(p.full[p.ti])}的${esc(p.what)}是多少？`, 0)}`; },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.a1), ans = p.series[0].v[p.ti]; if (v === null) return { code: 'a1', msg: '把表格裡的數填進去。' }; if (v === ans) return null;
          const adj = [p.ti - 1, p.ti + 1].some(j => p.series[0].v[j] === v); return { code: 'a1', obs: adj ? 'misalign' : 'other', msg: adj ? '看到隔壁的欄了。先找時間，再往下看同一欄。' : '先找時間，再往下看同一欄的數。' }; },
        solve: ctx => { ctx.answers.a1 = String(ctx.problem.series[0].v[ctx.problem.ti]); }, say: ex => `${ex.problem.full[ex.problem.ti]}是 ${ex.problem.series[0].v[ex.problem.ti]}。` },
      { title: '二維表格', ids: ['a2'], hints: ['這張表有兩列，先找對是哪一列。', '找到那一列，再找時間那一欄。', '列和欄交叉的格子，就是答案。'],
        think: '老師先找對哪一列，再找時間那一欄，看交叉的格子。', together: '一起找：哪一列、哪一欄？',
        figure: ctx => tableHtml(ctx.problem, { hl: ctx.hint(1) >= 2 ? ctx.problem.tj : null }),
        answer: ctx => { const p = ctx.problem; return fieldHtml(ctx, 'a2', `${esc(p.series[1].name)}在${esc(p.full[p.tj])}是多少？`, 1); },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.a2), ans = p.series[1].v[p.tj]; if (v === null) return { code: 'a2', msg: '把表格裡的數填進去。' }; if (v === ans) return null;
          const row = p.series[0].v[p.tj] === v, adj = [p.tj - 1, p.tj + 1].some(j => p.series[1].v[j] === v);
          return { code: 'a2', obs: row || adj ? 'misalign' : 'other', msg: row ? `這是${p.series[0].name}那一列。找${p.series[1].name}那一列。` : adj ? '看到隔壁的欄了。找對時間那一欄。' : '找對列和欄，看交叉的格子。' }; },
        solve: ctx => { ctx.answers.a2 = String(ctx.problem.series[1].v[ctx.problem.tj]); }, say: ex => `${ex.problem.series[1].name}在${ex.problem.full[ex.problem.tj]}是 ${ex.problem.series[1].v[ex.problem.tj]}。` }
    ],
    reasons, done: () => '會讀表格了：先找列，再找欄，看交叉的格子。', chant: '讀表格：先找列，再找欄。', transfer: '找一找：課表、成績單，也是表格。'
  });

  // =============== 0-2 一格是多少（先測） ===============
  const SCALES = { easy: [[1, 5, 10], [1, 2, 8], [1, 4, 12]], standard: [[2, 5, 20], [5, 2, 30], [2, 4, 16], [10, 2, 60]], challenge: [[10, 5, 100], [5, 4, 40], [10, 2, 80], [2, 5, 30]] };
  A.register('lnScale', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [step, every, end] = pick(SCALES[level] || SCALES.standard, i), cells = end / step;
      let k; do k = rnd(rand, 1, cells - 1); while (k % every === 0);
      return { step, every, end, k, dims: [cells, step, end], prompt: `數線上只寫了幾個數。一格是多少？箭頭指的是多少？` }; },
    planFigure: ctx => numberLineSVG(ctx.problem),
    steps: [
      { title: '數格子', ids: ['cells'], hints: ['數的是「格」，不是刻度線。', '兩條刻度線中間的空，才是一格。', '從 0 開始，一格一格數到下一個寫了數的地方。'],
        think: '老師數兩條刻度線中間的空，一格一格數。', together: '一起數：中間有幾格？',
        figure: ctx => numberLineSVG({ ...ctx.problem, braces: ctx.hint(0) >= 2, pulseTicks: ctx.hint(0) >= 1 }),
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${fieldHtml(ctx, 'cells', `0 到 ${p.every * p.step} 中間有幾格？`, 0)}`; },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.cells); if (v === null) return { code: 'cells', msg: '數一數，把格數填進去。' }; if (v === p.every) return null;
          return { code: 'cells', obs: v === p.every + 1 ? 'countTicks' : 'other', msg: v === p.every + 1 ? '你數的是刻度線。要數的是線和線中間的「格」。' : '從 0 開始，一格一格數。' }; },
        solve: ctx => { ctx.answers.cells = String(ctx.problem.every); }, say: ex => `中間有 ${ex.problem.every} 格。` },
      { title: '一格是多少', ids: ['one'], hints: ['兩個數相差多少？', `相差的數，平分給中間的每一格。`, '相差的數 ÷ 格數 ＝ 一格。'],
        think: '老師用兩個數相差多少，除以中間的格數。', together: '一起算：一格是多少？',
        figure: ctx => numberLineSVG({ ...ctx.problem, braces: true }),
        answer: ctx => { const p = ctx.problem; return `<p data-read data-say>0 到 ${p.every * p.step} 中間有 ${esc(ctx.answers.cells ?? p.every)} 格。</p>${fieldHtml(ctx, 'one', '一格是多少？', 1)}`; },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.one); if (v === null) return { code: 'one', msg: '把一格是多少填進去。' }; if (v === p.step) return null;
          return { code: 'one', obs: v === 1 && p.step !== 1 ? 'scaleAsOne' : 'other', msg: v === 1 && p.step !== 1 ? '一格不是 1。0 到 ' + p.every * p.step + ' 只分成 ' + p.every + ' 格。' : '相差的數 ÷ 格數，再算一次。' }; },
        solve: ctx => { ctx.answers.one = String(ctx.problem.step); }, say: ex => `一格是 ${ex.problem.step}。` },
      { title: '箭頭指的數', ids: ['pt'], hints: ['從 0 開始，數到箭頭有幾格。', '一格是多少，就一次加多少。', '格數 × 一格的數 ＝ 箭頭指的數。'],
        think: '老師從 0 一格一格往前加，數到箭頭。', together: '一起數：箭頭是多少？',
        figure: ctx => numberLineSVG({ ...ctx.problem, arrow: ctx.problem.k * ctx.problem.step }),
        answer: ctx => fieldHtml(ctx, 'pt', '箭頭指的是多少？', 2),
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.pt), ans = p.k * p.step; if (v === null) return { code: 'pt', msg: '把數填進去。' }; if (v === ans) return null;
          return { code: 'pt', obs: v === p.k && p.step !== 1 ? 'scaleAsOne' : Math.abs(v - ans) === p.step ? 'misalign' : 'other', msg: v === p.k && p.step !== 1 ? `你數了 ${p.k} 格，可是一格是 ${p.step}。` : '從 0 開始，一格一格加上去。' }; },
        solve: ctx => { ctx.answers.pt = String(ctx.problem.k * ctx.problem.step); }, say: ex => `箭頭指的是 ${ex.problem.k * ex.problem.step}。` }
    ],
    reasons, done: ctx => `一格是 ${ctx.problem.step}，箭頭是 ${ctx.problem.k * ctx.problem.step}。`, chant: '一格是多少：兩個數的差，除以中間的格數。', transfer: '找一找：尺、溫度計上，一格是多少？'
  });

  // =============== 1-1 折線圖的零件 ===============
  A.register('lnParts', {
    methods, makeProblem: (level, i, rand = Math.random) => ({ ...makeChart(level, i, rand), prompt: '看這張折線圖，找出它的零件。' }),
    planFigure: ctx => chartSVG(ctx.problem, {}),
    steps: [
      { title: '圖的名稱', ids: ['title'], hints: ['圖的名稱寫在最上面。', '名稱告訴你這張圖在記錄什麼。', '看最上面那一行字。'], think: '老師先看最上面的名稱。', together: '一起看：這張圖叫什麼？',
        figure: ctx => chartSVG(ctx.problem, {}),
        answer: ctx => { const p = ctx.problem, o = Object.values(CTX).filter(c => c.title !== p.title); return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('title', '這張圖在記錄什麼？', [['ok', esc(p.title)], ['a', esc(pick(o, p.xs.length).title)], ['b', esc(pick(o, p.xs.length + 4).title)]])}`; },
        check: ctx => !ctx.answers.title ? { code: 'title', msg: '先選一個答案。' } : ctx.answers.title === 'ok' ? null : { code: 'title', obs: 'wrongChoice', msg: '看圖最上面的名稱。' },
        solve: ctx => { ctx.answers.title = 'ok'; }, say: ex => `這張圖記錄「${ex.problem.title}」。` },
      { title: '橫軸和縱軸', ids: ['xax', 'unit'], hints: ['下面那一條是橫軸，左邊那一條是縱軸。', '縱軸的名稱後面有括號。', '橫軸寫時間；縱軸括號裡是單位。'], think: '老師看：橫軸寫時間，縱軸括號裡是單位。', together: '一起找：橫軸寫什麼？單位是什麼？',
        figure: ctx => chartSVG(ctx.problem, { pulseX: ctx.hint(1) >= 2, pulseY: ctx.hint(1) >= 2 }),
        answer: ctx => { const p = ctx.problem; return `${ctx.choice('xax', '下面的橫軸寫的是什麼？', [['x', esc(p.xName)], ['y', esc(p.yName)]], true)}${ctx.choice('unit', '縱軸的單位是什麼？', [...new Set([p.unit, '公分', '個'])].slice(0, 3).map(u => [u, u]))}`; },
        check: ctx => { const a = ctx.answers; if (!a.xax || !a.unit) return { code: 'axes', msg: '兩題都要選。' }; if (a.xax !== 'x') return { code: 'axes', obs: 'swapped', msg: '下面的橫軸寫時間，不是數量。' }; return a.unit === ctx.problem.unit ? null : { code: 'axes', obs: 'wrongChoice', msg: '單位寫在縱軸名稱後面的括號裡。' }; },
        solve: ctx => { ctx.answers.xax = 'x'; ctx.answers.unit = ctx.problem.unit; }, say: ex => `橫軸是${ex.problem.xName}，單位是${ex.problem.unit}。` },
      { title: '點和線', ids: ['pt'], hints: ['看圖上的一個點。', '一個點在一個時間的上面。', '一個點就是一個時間的數。'], think: '老師看：每一個點，就是一個時間記下來的數。', together: '一起想：一個點代表什麼？',
        figure: ctx => chartSVG(ctx.problem, { mark: [[1, 0]] }),
        answer: ctx => { const p = ctx.problem; return ctx.choice('pt', '圈起來的點代表什麼？', [['one', `${esc(p.full[1])}的${esc(p.what)}`], ['all', `全部的${esc(p.what)}加起來`], ['line', '一條線']]); },
        check: ctx => !ctx.answers.pt ? { code: 'pt', msg: '先選一個答案。' } : ctx.answers.pt === 'one' ? null : { code: 'pt', obs: 'wrongChoice', msg: '一個點只在一個時間的上面，記的是那個時間的數。' },
        solve: ctx => { ctx.answers.pt = 'one'; }, say: ex => `這個點是${ex.problem.full[1]}的${ex.problem.what}。` }
    ],
    reasons, done: ctx => `這張圖記錄「${ctx.problem.title}」。`, chant: '折線圖的零件：名稱、橫軸、縱軸、單位、點和線。', transfer: '找一張折線圖，說出它的名稱和單位。'
  });

  // =============== 1-2 表格和圖配一配 ===============
  A.register('lnMatch', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeChart(level, i, rand), n = p.xs.length; const j = rnd(rand, 0, n - 1); let k; do k = rnd(rand, 0, n - 1); while (k === j); return { ...p, j, k, prompt: '表格的一筆資料，就是圖上的一個點。' }; },
    planFigure: ctx => tableHtml(ctx.problem),
    steps: [
      { title: '表格 → 點', ids: ['pt'], hints: ['先看亮起來的是哪一個時間。', '在橫軸找到那個時間，往上找點。', '點那個時間上面的點。'], think: '老師看亮起來的時間，在圖上那個時間往上找點。', together: '一起找：這筆資料是哪一個點？',
        figure: ctx => `${tableHtml(ctx.problem, { hl: ctx.problem.j })}${chartSVG(ctx.problem, { clickPts: true, noTitle: true, mark: ctx.state.pt != null ? [[ctx.state.pt, 0]] : ctx.hint(0) >= 2 ? [[ctx.problem.j, 0]] : [] })}`,
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}表格亮起來的是${esc(p.full[p.j])}，${p.series[0].v[p.j]} ${esc(p.unit)}。在圖上點它的點。</p>`; },
        bind: ctx => document.querySelectorAll('#figure0 [data-pt]').forEach(el => pressKey(el, () => { ctx.state.pt = Number(el.dataset.pt.split(':')[1]); ctx.answers.pt = String(ctx.state.pt); ctx.log('點圖上的點', { i: ctx.state.pt }); ctx.refreshFigure(0); })),
        check: ctx => { const p = ctx.problem, x = ctx.state.pt; if (x == null) return { code: 'pt', obs: 'unfinished', msg: '在圖上點一個點。' }; return x === p.j ? null : { code: 'pt', obs: Math.abs(x - p.j) === 1 ? 'misalign' : 'wrongChoice', msg: `你點的是${p.full[x]}的點。找${p.full[p.j]}。` }; },
        solve: ctx => { ctx.state.pt = ctx.problem.j; ctx.answers.pt = String(ctx.problem.j); }, say: ex => `${ex.problem.full[ex.problem.j]}的點。` },
      { title: '點 → 表格', ids: ['row'], hints: ['圈起來的點，在哪一個時間的上面？', '從點往下看，對到橫軸。', '對到的時間，就是表格的那一筆。'], think: '老師從點往下看，對到橫軸的時間。', together: '一起看：這個點是哪一筆？',
        figure: ctx => `${chartSVG(ctx.problem, { mark: [[ctx.problem.k, 0]], guideX: ctx.hint(1) >= 2 ? ctx.problem.k : null })}${tableHtml(ctx.problem)}`,
        answer: ctx => { const p = ctx.problem; return ctx.choice('row', '圈起來的點，是表格裡哪一個時間？', opt3(p, p.k, [p.k + 1, p.k - 1, p.k + 2, p.k - 2])); },
        check: ctx => { const p = ctx.problem, x = Number(ctx.answers.row); if (!ctx.answers.row) return { code: 'row', msg: '先選一個答案。' }; return x === p.k ? null : { code: 'row', obs: Math.abs(x - p.k) === 1 ? 'misalign' : 'wrongChoice', msg: '從點直直往下，對到橫軸。' }; },
        solve: ctx => { ctx.answers.row = String(ctx.problem.k); }, say: ex => `是${ex.problem.full[ex.problem.k]}，${ex.problem.series[0].v[ex.problem.k]} ${ex.problem.unit}。` }
    ],
    reasons, done: () => '表格的一筆資料，就是圖上的一個點。', chant: '一筆資料，一個點。', transfer: '想一想：表格和折線圖，哪一個比較容易看出變化？'
  });

  // =============== 2-2 反過來找：是哪一天 ===============
  A.register('lnFind', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeChart(level, i, rand), v = p.series[0].v;
      const cand = v.map((y, j) => j).filter(j => v.filter(y => y === v[j]).length === 1), ti = cand[rnd(rand, 0, cand.length - 1)];
      return { ...p, ti, target: v[ti], prompt: `看「${p.title}」。哪一個時間是 ${v[ti]} ${p.unit}？` }; },
    planFigure: ctx => chartSVG(ctx.problem, {}),
    steps: [
      scaleStep(0),
      { title: '找到那個點', ids: ['xi'], hints: ['先在縱軸找到題目說的數。', '從那個數往右，看碰到哪一個點。', '再從點往下，對到橫軸，點那個時間。'], think: '老師在縱軸找到那個數，往右找點，再往下對到時間。', together: '一起找：哪一個點是這個數？',
        figure: ctx => chartSVG(ctx.problem, { clickX: true, pickX: ctx.state.xi, guideY: ctx.hint(1) >= 2 ? [ctx.problem.ti, 0] : null, guideX: ctx.hint(1) >= 2 || ctx.checked(1) ? ctx.problem.ti : null }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}在橫軸上點那個時間。</p>`,
        bind: bindX(1),
        check: ctx => { const p = ctx.problem, x = ctx.state.xi; if (x == null) return { code: 'xi', obs: 'unfinished', msg: '在橫軸上點一個時間。' }; return x === p.ti ? null : { code: 'xi', obs: Math.abs(x - p.ti) === 1 ? 'misalign' : 'wrongChoice', msg: `${p.full[x]}是 ${valueOf(p, x)}，不是 ${p.target}。` }; },
        solve: ctx => { ctx.state.xi = ctx.problem.ti; ctx.answers.xi = String(ctx.problem.ti); }, say: ex => `是${ex.problem.full[ex.problem.ti]}。` },
      { title: '說說看', ids: ['why'], hints: ['根據要說圖上看到的。', '說出點往左對到哪一個數。', '選說出點在哪裡的那一句。'], think: '老師說出圖上的根據。', together: '一起說：怎麼知道的？',
        answer: ctx => { const p = ctx.problem; return ctx.choice('why', '你是怎麼知道的？', [['see', `${esc(p.full[p.ti])}的點，往左對到 ${p.target}`], ['last', `因為${esc(p.full[p.ti])}在最後面`], ['guess', '我猜的']]); },
        check: ctx => !ctx.answers.why ? { code: 'why', msg: '先選一個答案。' } : ctx.answers.why === 'see' ? null : { code: 'why', obs: 'wrongChoice', msg: '根據要說圖上看到的：點對到哪一個數。' },
        solve: ctx => { ctx.answers.why = 'see'; }, say: ex => `${ex.problem.full[ex.problem.ti]}的點往左對到 ${ex.problem.target}。` }
    ],
    reasons, done: ctx => `${ctx.problem.full[ctx.problem.ti]}是 ${ctx.problem.target} ${ctx.problem.unit}。`, chant: '反過來找：縱軸找數，往右找點，往下找時間。', transfer: '試試看：說一個數，請同學在圖上找是哪一天。'
  });

  // =============== 2-3 點不在格線上（挑戰：波浪線） ===============
  const BETWEEN = { easy: [['bean', { step: 2, lo: 1, hi: 15, n: 4, half: true, up: true }], ['jump', { step: 10, lo: 10, hi: 70, n: 4, half: true }]],
    standard: [['save', { step: 10, lo: 20, hi: 90, n: 6, half: true, every: 2 }], ['jump', { step: 10, lo: 10, hi: 80, n: 7, half: true, every: 2 }], ['bean', { step: 2, lo: 1, hi: 19, n: 6, half: true, up: true, every: 2 }]],
    challenge: [['height', { step: 1, lo: 131, hi: 145, n: 6, every: 5, up: true, brk: 130 }], ['temp', { step: 1, lo: 21, hi: 31, n: 7, every: 2, brk: 20 }]] };
  A.register('lnBetween', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      const brk = level === 'challenge', p = makeChart(level, i, rand, { levels: BETWEEN, test: v => brk || v.some(y => y % (pick(BETWEEN[level] || BETWEEN.standard, i)[1].step) !== 0) });
      const v = p.series[0].v, cand = v.map((y, j) => j).filter(j => brk ? (v[j] - p.min) % (p.step * p.every) !== 0 : (v[j] - p.min) % p.step !== 0), ti = cand.length ? cand[rnd(rand, 0, cand.length - 1)] : 0;
      return { ...p, ti, prompt: `看「${p.title}」。${p.full[ti]}是多少${p.unit}？` }; },
    planFigure: ctx => chartSVG(ctx.problem, {}),
    steps: [
      scaleStep(0),
      { title: '在哪兩條線中間', ids: ['mid'], hints: ['找到那個時間的點。', '點在兩條格線的中間，還是在格線上？', '看點上面和下面的格線各是多少。'], think: '老師看點的上面和下面，各是哪一條格線。', together: '一起看：點在哪裡？',
        figure: ctx => chartSVG(ctx.problem, { guideX: ctx.problem.ti, mark: [[ctx.problem.ti, 0]], guideY: ctx.hint(1) >= 2 ? [ctx.problem.ti, 0] : null }),
        answer: ctx => { const p = ctx.problem, v = valueOf(p, p.ti);
          if (p.brk) return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p><p data-read data-say>縱軸下面有波浪線。</p>${ctx.choice('mid', '縱軸從幾開始往上數？', [['min', String(p.min)], ['zero', '0']], true)}`;
          const a = Math.floor((v - p.min) / p.step) * p.step + p.min; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('mid', '點在哪兩個數的中間？', [['ok', `${a} 和 ${a + p.step}`], ['lo', `${a - p.step} 和 ${a}`], ['hi', `${a + p.step} 和 ${a + 2 * p.step}`]].filter(x => !/-/.test(x[1])))}`; },
        check: ctx => { const p = ctx.problem, a = ctx.answers.mid; if (!a) return { code: 'mid', msg: '先選一個答案。' }; if (a === (p.brk ? 'min' : 'ok')) return null;
          return { code: 'mid', obs: p.brk ? 'ignoreBreak' : 'misalign', msg: p.brk ? `波浪線表示 0 到 ${p.min} 省略了，從 ${p.min} 開始往上數。` : '看點的上面和下面，各是哪一條格線。' }; },
        solve: ctx => { ctx.answers.mid = ctx.problem.brk ? 'min' : 'ok'; }, say: ex => ex.problem.brk ? `縱軸從 ${ex.problem.min} 開始。` : '點在兩條格線的正中間。' },
      { title: '讀數值', ids: ['val'], hints: ['從點往左，對到縱軸。', '點在兩條線的正中間，就是半格。', '下面那條線的數，再加上半格。'], think: '老師從點往左對到縱軸，在兩條線中間，就加半格。', together: '一起算：是多少？',
        figure: ctx => chartSVG(ctx.problem, { guideX: ctx.problem.ti, guideY: [ctx.problem.ti, 0], mark: [[ctx.problem.ti, 0]] }),
        answer: ctx => fieldHtml(ctx, 'val', `${esc(ctx.problem.full[ctx.problem.ti])}是多少？`, 2),
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.val); if (v === null) return { code: 'val', msg: '把讀到的數填進去。' }; if (v === valueOf(p, p.ti)) return null; const obs = readObs(p, v, p.ti); return { code: 'val', obs, msg: readMsg(obs, p) }; },
        solve: ctx => { ctx.answers.val = String(valueOf(ctx.problem, ctx.problem.ti)); }, say: ex => `${ex.problem.full[ex.problem.ti]}是 ${valueOf(ex.problem, ex.problem.ti)}。` }
    ],
    reasons, done: ctx => `${ctx.problem.full[ctx.problem.ti]}是 ${valueOf(ctx.problem, ctx.problem.ti)} ${ctx.problem.unit}。`, chant: '點在兩條線中間：下面的數加半格。', transfer: '看溫度計：刻度中間的位置是多少？'
  });

  // =============== 3-1 變多、變少、一樣 ===============
  const dir = (p, j) => { const d = valueOf(p, j + 1) - valueOf(p, j); return d > 0 ? 'up' : d < 0 ? 'down' : 'same'; };
  const TREND = { easy: LEVELS.easy.filter(x => !x[1].up).map(([k, c]) => [k, { ...c, n: 5 }]), standard: LEVELS.standard.filter(x => !x[1].up).map(([k, c]) => [k, { ...c, n: 5 }]), challenge: LEVELS.standard.filter(x => !x[1].up).map(([k, c]) => [k, { ...c, n: 5 }]) };
  A.register('lnTrend', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeChart(level, i, rand, { levels: TREND, n: 5, same: level !== 'easy', test: v => v.some((y, j) => j && y > v[j - 1]) && v.some((y, j) => j && y < v[j - 1]) && (level === 'easy' || v[2] === v[1]) });
      return { ...p, prompt: `看「${p.title}」。每一段線是變多、變少，還是一樣？` }; },
    planFigure: ctx => chartSVG(ctx.problem, {}),
    steps: [
      { title: '每一段', ids: ['seg0', 'seg1', 'seg2', 'seg3'], hints: ['一段一段看：從左邊的點到右邊的點。', '線往上是變多，往下是變少，平平的是一樣。', '看閃爍的那一段：往上、往下，還是平的？'], think: '老師一段一段看：往上變多，往下變少，平的一樣。', together: '一起看：這一段往哪裡走？',
        figure: ctx => { const left = [0, 1, 2, 3].find(j => !ctx.answers['seg' + j]); return chartSVG(ctx.problem, { seg: ctx.hint(0) >= 1 && left != null ? left : null }); },
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${[0, 1, 2, 3].map(j => ctx.choice('seg' + j, `${esc(p.full[j])} → ${esc(p.full[j + 1])}`, [['up', '↗ 變多'], ['down', '↘ 變少'], ['same', '→ 一樣']], true)).join('')}`; },
        check: ctx => { const p = ctx.problem, a = ctx.answers; if ([0, 1, 2, 3].some(j => !a['seg' + j])) return { code: 'seg', msg: '每一段都要選。' };
          const bad = [0, 1, 2, 3].filter(j => a['seg' + j] !== dir(p, j)); return bad.length ? { code: 'seg', obs: 'wrongChoice', msg: `${bad.map(j => `${p.full[j]} → ${p.full[j + 1]}`).join('、')}再看一次。` } : null; },
        solve: ctx => { [0, 1, 2, 3].forEach(j => { ctx.answers['seg' + j] = dir(ctx.problem, j); }); }, say: ex => [0, 1, 2, 3].map(j => ({ up: '變多', down: '變少', same: '一樣' })[dir(ex.problem, j)]).join('、') + '。' },
      { title: '從頭看到尾', ids: ['all'], hints: ['把每一段的答案連起來看。', '有沒有哪一段是變少或一樣？', '只要有一段不是變多，就不是「一直變多」。'], think: '老師把每一段連起來看：有變多，也有變少。', together: '一起想：是一直變多嗎？',
        figure: ctx => chartSVG(ctx.problem, {}),
        answer: ctx => ctx.choice('all', '從第一個到最後一個，是怎麼樣？', [['up', '一直變多'], ['down', '一直變少'], ['mix', '有時變多，有時變少（或一樣）']]),
        check: ctx => !ctx.answers.all ? { code: 'all', msg: '先選一個答案。' } : ctx.answers.all === 'mix' ? null : { code: 'all', obs: 'partialTrend', msg: '不是每一段都一樣。看一看：有一段是變少的。' },
        solve: ctx => { ctx.answers.all = 'mix'; }, say: () => '有時變多，有時變少。' }
    ],
    reasons, done: () => '線往上變多，往下變少，平的一樣。', chant: '往上變多，往下變少，平平一樣。', transfer: '想一想：你的身高是一直變多嗎？'
  });

  // =============== 3-2 哪一段變最多 ===============
  const MOST = { easy: LEVELS.easy.filter(x => !x[1].up).map(([k, c]) => [k, { ...c, n: 5 }]), standard: LEVELS.standard.filter(x => !x[1].up), challenge: LEVELS.standard.filter(x => !x[1].up).map(([k, c]) => [k, { ...c, n: 7 }]) };
  const bestUp = v => { let b = -1, d = 0; for (let j = 0; j + 1 < v.length; j++) if (v[j + 1] - v[j] > d) { d = v[j + 1] - v[j]; b = j; } return { b, d, unique: v.filter((y, j) => j + 1 < v.length && v[j + 1] - y === d).length === 1 }; };
  A.register('lnMost', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeChart(level, i, rand, { levels: MOST, test: v => { const m = v.indexOf(Math.max(...v)), u = bestUp(v); return u.b >= 0 && u.unique && u.b + 1 !== m && m > 0 && v[m] > v[m - 1]; } });
      const v = p.series[0].v, m = maxAt(p), u = bestUp(v); return { ...p, mx: m, best: u.b, diff: u.d, prompt: `看「${p.title}」。哪一個時間最高？哪一段增加最多？` }; },
    planFigure: ctx => chartSVG(ctx.problem, {}),
    steps: [
      { title: '哪個最高', ids: ['max'], hints: ['找圖上最高的點。', '最高的點，往下看是哪一個時間。', '最高的點就是最多。'], think: '老師找最高的點，往下看時間。', together: '一起找：最高的點？',
        figure: ctx => chartSVG(ctx.problem, { mark: ctx.hint(0) >= 2 ? [[ctx.problem.mx, 0]] : [] }),
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('max', '哪一個時間最高？', opt3(p, p.mx, [p.best + 1, p.best, p.mx - 1, 0]))}`; },
        check: ctx => { const p = ctx.problem; if (!ctx.answers.max) return { code: 'max', msg: '先選一個答案。' }; return Number(ctx.answers.max) === p.mx ? null : { code: 'max', obs: 'wrongChoice', msg: '找最高的點。' }; },
        solve: ctx => { ctx.answers.max = String(ctx.problem.mx); }, say: ex => `${ex.problem.full[ex.problem.mx]}最高。` },
      { title: '哪一段增加最多', ids: ['seg'], hints: ['「增加最多」不是「最高」，要看兩個點相差多少。', '每一段都算一算：後面減前面。', '線愈陡，相差愈多。'], think: '老師每一段都算後面減前面，找相差最多的；線愈陡相差愈多。', together: '一起算：哪一段增加最多？',
        figure: ctx => chartSVG(ctx.problem, { seg: ctx.hint(1) >= 2 ? ctx.problem.best : null }),
        answer: ctx => { const p = ctx.problem, segs = [...new Set([p.best, p.mx - 1, p.best === 0 ? 1 : 0])].filter(j => j >= 0 && j + 1 < p.xs.length);
          return ctx.choice('seg', '哪兩個時間之間，增加最多？', segs.map(j => [String(j), `${esc(p.full[j])} → ${esc(p.full[j + 1])}`])); },
        check: ctx => { const p = ctx.problem, a = ctx.answers.seg; if (!a) return { code: 'seg', msg: '先選一個答案。' }; if (Number(a) === p.best) return null;
          return { code: 'seg', obs: Number(a) === p.mx - 1 ? 'highVsChange' : 'wrongChoice', msg: Number(a) === p.mx - 1 ? '這一段走到最高點，可是增加的不是最多。算一算每一段相差多少。' : '算一算每一段：後面減前面。' }; },
        solve: ctx => { ctx.answers.seg = String(ctx.problem.best); }, say: ex => `${ex.problem.full[ex.problem.best]} 到 ${ex.problem.full[ex.problem.best + 1]} 增加最多。` },
      { title: '增加多少', ids: ['diff'], hints: ['讀出兩個點的數。', '後面的數減前面的數。', '相差的數就是增加多少。'], think: '老師讀出兩個點，後面減前面。', together: '一起算：增加了多少？',
        figure: ctx => chartSVG(ctx.problem, { mark: [[ctx.problem.best, 0], [ctx.problem.best + 1, 0]], guideY: ctx.hint(2) >= 2 ? [ctx.problem.best + 1, 0] : null }),
        answer: ctx => { const p = ctx.problem; return fieldHtml(ctx, 'diff', `${esc(p.full[p.best])} 到 ${esc(p.full[p.best + 1])}，增加了多少？`, 2); },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.diff); if (v === null) return { code: 'diff', msg: '把增加的數填進去。' }; if (v === p.diff) return null;
          return { code: 'diff', obs: v === valueOf(p, p.best + 1) ? 'other' : 'other', msg: v === valueOf(p, p.best + 1) ? '這是後面那個點的數。要算的是相差多少。' : '後面的數減前面的數，再算一次。' }; },
        solve: ctx => { ctx.answers.diff = String(ctx.problem.diff); }, say: ex => `增加了 ${ex.problem.diff}。` }
    ],
    reasons, done: ctx => `${ctx.problem.full[ctx.problem.best]} 到 ${ctx.problem.full[ctx.problem.best + 1]} 增加最多，增加了 ${ctx.problem.diff} ${ctx.problem.unit}。`, chant: '最高不一定增加最多；線愈陡，相差愈多。', transfer: '想一想：一週裡哪兩天之間，你跳繩進步最多？'
  });

  // =============== 3-3 兩條線比一比 ===============
  const TWO = { easy: [['water', { step: 1, lo: 1, hi: 8, n: 4 }], ['book', { step: 5, lo: 5, hi: 40, n: 4 }]], standard: [['jump', { step: 10, lo: 10, hi: 70, n: 6, every: 2 }], ['book', { step: 5, lo: 5, hi: 45, n: 6, every: 2 }], ['save', { step: 10, lo: 20, hi: 90, n: 6, every: 2 }]],
    challenge: [['temp', { step: 1, lo: 21, hi: 31, n: 7, every: 2, brk: 20 }], ['jump', { step: 10, lo: 10, hi: 80, n: 7, every: 2 }]] };
  A.register('lnTwo', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeTwo(level, i, rand, { levels: TWO }); const ti = rnd(rand, 0, p.xs.length - 1), who = rnd(rand, 0, 1);
      return { ...p, ti, who, prompt: `看「${p.title}」的兩條線。${p.full[ti]}兩個相差多少？` }; },
    planFigure: ctx => chartSVG(ctx.problem, { legend: true }),
    steps: [
      { title: '看圖例', ids: ['legend'], hints: ['兩條線，先看圖例。', '圖例告訴你：哪一種顏色、哪一種點是誰。', '藍色圓點和橘色方塊，各是誰？'], think: '老師先看圖例：顏色和點的形狀各代表誰。', together: '一起看：這條線是誰？',
        figure: ctx => chartSVG(ctx.problem, { legend: true }),
        answer: ctx => { const p = ctx.problem, w = p.who; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('legend', `${w ? '橘色方塊' : '藍色圓點'}的線是誰？`, [['0', esc(p.series[0].name)], ['1', esc(p.series[1].name)]], true)}`; },
        check: ctx => !ctx.answers.legend ? { code: 'legend', msg: '先選一個答案。' } : Number(ctx.answers.legend) === ctx.problem.who ? null : { code: 'legend', obs: 'legendMix', msg: '看圖例：顏色和點的形狀，各是誰。' },
        solve: ctx => { ctx.answers.legend = String(ctx.problem.who); }, say: ex => `${ex.problem.who ? '橘色方塊' : '藍色圓點'}是${ex.problem.series[ex.problem.who].name}。` },
      ...[0, 1].map(s => ({ title: `讀${s ? '第二' : '第一'}條線`, ids: ['v' + s], hints: ['先找對顏色的線。', '在那個時間往上，找到這條線的點。', '從點往左對到縱軸。'], think: '老師先找對顏色，再找時間，往左對到縱軸。', together: '一起讀：這條線是多少？',
        figure: ctx => chartSVG(ctx.problem, { legend: true, guideX: ctx.problem.ti, guideS: s, guideY: ctx.hint(1 + s) >= 2 ? [ctx.problem.ti, s] : null, mark: ctx.hint(1 + s) >= 1 ? [[ctx.problem.ti, s]] : [] }),
        answer: ctx => { const p = ctx.problem; return fieldHtml(ctx, 'v' + s, `${esc(p.series[s].name)}在${esc(p.full[p.ti])}是多少？`, 1 + s); },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers['v' + s]); if (v === null) return { code: 'v' + s, msg: '把讀到的數填進去。' }; if (v === valueOf(p, p.ti, s)) return null; const obs = readObs(p, v, p.ti, s); return { code: 'v' + s, obs, msg: readMsg(obs, p) }; },
        solve: ctx => { ctx.answers['v' + s] = String(valueOf(ctx.problem, ctx.problem.ti, s)); }, say: ex => `${ex.problem.series[s].name}是 ${valueOf(ex.problem, ex.problem.ti, s)}。` })),
      { title: '相差多少', ids: ['diff'], hints: ['兩個數，大的減小的。', '在同一個時間，兩個點中間隔了多少？', '大的數 － 小的數。'], think: '老師用大的數減小的數。', together: '一起算：相差多少？',
        figure: ctx => chartSVG(ctx.problem, { legend: true, mark: [[ctx.problem.ti, 0], [ctx.problem.ti, 1]] }),
        answer: ctx => { const p = ctx.problem; return `<p data-read data-say>${esc(p.series[0].name)} ${esc(ctx.answers.v0 ?? '？')}，${esc(p.series[1].name)} ${esc(ctx.answers.v1 ?? '？')}。</p>${fieldHtml(ctx, 'diff', '兩個相差多少？', 3)}`; },
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.diff), a = valueOf(p, p.ti, 0), b = valueOf(p, p.ti, 1); if (v === null) return { code: 'diff', msg: '把相差的數填進去。' }; return v === Math.abs(a - b) ? null : { code: 'diff', obs: v === a + b ? 'eqSum' : 'other', msg: v === a + b ? '這是加起來。相差要用大的減小的。' : '大的減小的，再算一次。' }; },
        solve: ctx => { const p = ctx.problem; ctx.answers.diff = String(Math.abs(valueOf(p, p.ti, 0) - valueOf(p, p.ti, 1))); }, say: ex => `相差 ${Math.abs(valueOf(ex.problem, ex.problem.ti, 0) - valueOf(ex.problem, ex.problem.ti, 1))}。` }
    ],
    reasons: [['legend', '先看圖例'], ['guide', '用導引線對齊'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem, a = valueOf(p, p.ti, 0), b = valueOf(p, p.ti, 1); return `${p.full[p.ti]}，${p.series[0].name} ${a}、${p.series[1].name} ${b}，相差 ${Math.abs(a - b)} ${p.unit}。`; },
    chant: '兩條線：先看圖例，再比同一個時間。', transfer: '想一想：兩個城市的氣溫，可以畫在同一張圖上比較嗎？'
  });

  // =============== 4-1 長條圖還是折線圖、4-2 三種圖選一種 ===============
  const CAT = [['全班最喜歡的水果', ['蘋果', '香蕉', '芭樂', '葡萄']], ['各班的人數', ['甲班', '乙班', '丙班', '丁班']], ['全班最喜歡的運動', ['跳繩', '籃球', '跑步', '游泳']]];
  const ORD = ['一週每天的最高氣溫', '豆芽每天的高度', '小華每個月存的錢', '小明每天睡覺的時數'];
  const PART = ['小美的零用錢，花在哪些地方各占多少', '全班最喜歡的顏色，各占全班的幾分之幾', '一天的時間，睡覺、上學、玩各占多少'];
  const chartName = { bar: '長條圖', line: '折線圖', pie: '圓形圖' };
  const pickStep = (n, kind, id) => ({ title: kind === 'bar' ? '一樣一樣比' : kind === 'line' ? '隨時間改變' : '部分和全部', ids: [id], hints: ['想一想：資料有沒有時間的順序？', kind === 'line' ? '有時間順序、要看變化，用折線圖。' : kind === 'bar' ? '一樣一樣比多少、沒有順序，用長條圖。' : '要看每一部分占全部多少，用圓形圖。', `這一題用${chartName[kind]}。`],
    think: '老師想：有時間順序看變化用折線圖；一樣一樣比用長條圖；看部分占全部用圓形圖。', together: '一起想：用哪一種圖？',
    answer: ctx => { const p = ctx.problem, t = p.cases[n]; return `<p class="lesson-prompt" data-read data-say>要畫「${esc(t)}」。</p>${ctx.choice(id, '用哪一種圖比較好？', (p.three ? ['bar', 'line', 'pie'] : ['bar', 'line']).map(k => [k, chartName[k]]))}`; },
    check: ctx => { const a = ctx.answers[id]; if (!a) return { code: id, msg: '先選一個答案。' }; if (a === kind) return null;
      return { code: id, obs: a === 'line' ? 'wrongChart' : 'wrongChoice', msg: a === 'line' ? '這些資料沒有時間的順序，連成線沒有意思。' : kind === 'line' ? '資料有時間的順序，要看變化，用折線圖。' : kind === 'pie' ? '要看每一部分占全部多少，用圓形圖。' : '一樣一樣比多少，用長條圖。' }; },
    solve: ctx => { ctx.answers[id] = kind; }, say: () => `用${chartName[kind]}。` });
  A.register('lnChoose', {
    methods, makeProblem: (level, i, rand = Math.random) => { const c = pick(CAT, i), o = pick(ORD, i + 1);
      return { cases: [c[0], o], cat: c, three: false, dims: [2, 0, 0], prompt: '想一想：每一種資料，用哪一種圖比較好？' }; },
    planFigure: () => '',
    steps: [
      pickStep(0, 'bar', 'c0'), pickStep(1, 'line', 'c1'),
      { title: '連起來的線', ids: ['meaning'], hints: ['看圖：這些東西有先後順序嗎？', '水果和水果中間，沒有「時間」。', '沒有順序的資料，中間的線不代表什麼。'], think: '老師想：這些東西沒有順序，中間的線不代表任何事。', together: '一起想：這條線有意思嗎？',
        figure: ctx => { const [t, xs] = ctx.problem.cat, p = { title: `${t}（畫錯的例子）`, xName: '項目', yName: '人數', unit: '人', xs, full: xs, series: [{ name: t, v: [8, 5, 9, 4] }], min: 0, step: 1, rows: 10, every: 2, brk: false }; return chartSVG(p, {}); },
        answer: ctx => { const xs = ctx.problem.cat[1]; return ctx.choice('meaning', `${esc(xs[0])}和${esc(xs[1])}中間的那一段線，代表什麼？`, [['none', '什麼都不代表，它們沒有先後順序'], ['change', `從${esc(xs[0])}變成${esc(xs[1])}，人變少了`]], true); },
        check: ctx => !ctx.answers.meaning ? { code: 'meaning', msg: '先選一個答案。' } : ctx.answers.meaning === 'none' ? null : { code: 'meaning', obs: 'wrongChart', msg: '這些項目沒有先後，不是「變成」。這種資料要用長條圖。' },
        solve: ctx => { ctx.answers.meaning = 'none'; }, say: () => '它們沒有順序，線不代表什麼。' }
    ],
    reasons: [['order', '看有沒有時間順序'], ['hint', '看提示']], done: () => '有時間順序、看變化，用折線圖；一樣一樣比，用長條圖。', chant: '看變化用折線，比多少用長條。', transfer: '想一想：你們班的生日月份，要用哪一種圖？'
  });
  A.register('lnThree', {
    methods, makeProblem: (level, i, rand = Math.random) => { const order = shuffle(['bar', 'line', 'pie'], rand), cases = order.map((k, j) => k === 'bar' ? pick(CAT, i + j)[0] : k === 'line' ? pick(ORD, i + j) : pick(PART, i + j));
      return { cases, order, three: true, dims: [3, 0, 0], prompt: '三種圖，選最合適的一種。' }; },
    planFigure: () => '',
    steps: [0, 1, 2].map(n => { const ids = ['k0', 'k1', 'k2']; const base = pickStep(n, 'bar', ids[n]);
      return { ...base, title: `第 ${n + 1} 種資料`, answer: ctx => base.answer(ctx),
        check: ctx => { const k = ctx.problem.order[n], a = ctx.answers[ids[n]]; if (!a) return { code: ids[n], msg: '先選一個答案。' }; if (a === k) return null; return { code: ids[n], obs: a === 'line' ? 'wrongChart' : 'wrongChoice', msg: k === 'line' ? '資料有時間的順序，要看變化，用折線圖。' : k === 'pie' ? '要看每一部分占全部多少，用圓形圖。' : '一樣一樣比多少，用長條圖。' }; },
        solve: ctx => { ctx.answers[ids[n]] = ctx.problem.order[n]; }, say: ex => `用${chartName[ex.problem.order[n]]}。`, hints: ['想一想：資料有沒有時間的順序？是不是部分和全部？', '看變化用折線圖；一樣一樣比用長條圖；部分占全部用圓形圖。', '照上一句的規則選。'] }; }),
    reasons: [['order', '看有沒有時間順序'], ['hint', '看提示']], done: () => '看變化用折線圖，比多少用長條圖，看部分占全部用圓形圖。', chant: '變化折線、比較長條、部分圓形。', transfer: '找一找：報紙上的圖，是哪一種？為什麼用它？'
  });

  // =============== 5-2 自己定刻度 ===============
  A.register('lnSetScale', {
    methods: [['mark', '📐 先看最大的數'], ['self', '🧠 先自己想，需要時看提示']],
    makeProblem: (level, i, rand = Math.random) => { const S = pick(level === 'easy' ? [2, 5] : level === 'challenge' ? [10, 5, 2] : [5, 2, 10], i), smaller = { 2: 1, 5: 2, 10: 5 }[S], key = pick(['book', 'save', 'jump'], i), c = CTX[key];
      const n = 5, start = c.xs === MONTHS ? rnd(rand, 0, 7) : 0, xs = c.xs.slice(start, start + n);
      let v; for (let t = 0; t < 200; t++) { v = Array.from({ length: n }, () => S * rnd(rand, 1, 10)); const m = Math.max(...v); if (m > 10 * smaller && v.filter(x => x === m).length === 1) break; }
      return { key, title: c.title, xName: c.xName, yName: c.yName, unit: c.unit, what: c.what, xs, full: xs.map(c.full), series: [{ name: c.title, v }], min: 0, step: S, rows: 10, every: 2, brk: false, smaller, dims: [n, S, Math.max(...v)], prompt: `把「${c.title}」畫成折線圖。縱軸最多畫 10 格，一格要多少？` }; },
    planFigure: ctx => tableHtml(ctx.problem),
    steps: [
      { title: '最大的數', ids: ['max'], hints: ['看表格裡的數，哪一個最大？', '一個一個比，找最大的。', '縱軸要畫得到最大的數。'], think: '老師先找最大的數，縱軸要畫得到它。', together: '一起找：最大的數？',
        figure: ctx => tableHtml(ctx.problem, { hl: ctx.hint(0) >= 2 ? maxAt(ctx.problem) : null }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${fieldHtml(ctx, 'max', '最大的數是多少？', 0)}`,
        check: ctx => { const v = num(ctx.answers.max), m = Math.max(...ctx.problem.series[0].v); return v === null ? { code: 'max', msg: '把最大的數填進去。' } : v === m ? null : { code: 'max', obs: 'other', msg: '一個一個比，再找一次最大的。' }; },
        solve: ctx => { ctx.answers.max = String(Math.max(...ctx.problem.series[0].v)); }, say: ex => `最大的是 ${Math.max(...ex.problem.series[0].v)}。` },
      { title: '一格多少', ids: ['scale'], hints: ['縱軸最多 10 格：一格 × 10 要比最大的數大。', '一格太小，畫不下；一格太大，圖會扁扁的。', '從小的試起：一格 × 10，夠不夠畫到最大的數？'], think: '老師從小的試：一格 × 10 夠畫到最大的數，就選它。', together: '一起試：一格多少剛好？',
        figure: ctx => tableHtml(ctx.problem),
        answer: ctx => ctx.choice('scale', '一格要多少？', [1, 2, 5, 10].map(x => [String(x), `${x} ${esc(ctx.problem.unit)}`]), true),
        check: ctx => { const p = ctx.problem, v = Number(ctx.answers.scale), m = Math.max(...p.series[0].v); if (!ctx.answers.scale) return { code: 'scale', msg: '先選一個答案。' }; if (v === p.step) return null;
          return { code: 'scale', obs: v === 1 && p.step !== 1 ? 'scaleAsOne' : 'other', msg: v * 10 < m ? `一格 ${v}，10 格只到 ${v * 10}，畫不到 ${m}。` : `一格 ${v} 也畫得下，可是點會擠在下面。選小一點、又畫得下的。` }; },
        solve: ctx => { ctx.answers.scale = String(ctx.problem.step); }, say: ex => `一格 ${ex.problem.step}，10 格到 ${ex.problem.step * 10}，剛好畫得下。` },
      { title: '描點', ids: ['pts0'], hints: ['一個一個描，從 0 往上數格。', '數 ÷ 一格 ＝ 要往上幾格。', '每個時間都要描。'], think: '老師把每個數除以一格，算要往上幾格再點。', together: '一起描。',
        figure: ctx => chartSVG({ ...ctx.problem, series: [{ ...ctx.problem.series[0], v: [] }] }, { plot: { pts: ctx.state.pts || {}, cells: true }, noTitle: true }),
        answer: ctx => `${tableHtml(ctx.problem)}<p class="notice" data-read data-say>描了 ${Object.keys(ctx.state.pts || {}).length} 個點，共 ${ctx.problem.xs.length} 個。</p>`,
        bind: bindCells(2), check: ctx => plotCheck(ctx.problem, ctx.state.pts || {}),
        solve: ctx => { ctx.state.pts = Object.fromEntries(ctx.problem.series[0].v.map((y, i) => [i, y])); ctx.answers.pts0 = String(ctx.problem.xs.length); }, say: () => '每個點都描好了。' }
    ],
    reasons, done: ctx => `一格 ${ctx.problem.step} ${ctx.problem.unit}，圖不會太擠也不會太扁。`, chant: '定刻度：看最大，一格乘十要畫得下。', transfer: '想一想：如果最大的數是 300，一格要多少？'
  });

  // =============== 5-3 波浪線省略 ===============
  A.register('lnBreak', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      const opt = level === 'easy' ? { key: 'temp', cfg: { step: 1, lo: 21, hi: 29, n: 5, every: 2, brk: 20 } } : { key: 'height', cfg: { step: 1, lo: 131, hi: 145, n: level === 'challenge' ? 7 : 6, every: 5, up: true, brk: 130 } };
      const p = makeChart('challenge', i, rand, { levels: { challenge: [[opt.key, opt.cfg]] } }), ti = rnd(rand, 1, p.xs.length - 1);
      return { ...p, ti, prompt: `「${p.title}」的數都很大，從 0 畫起，點會擠在上面。` }; },
    planFigure: ctx => tableHtml(ctx.problem),
    steps: [
      { title: '要不要波浪線', ids: ['way'], hints: ['比一比兩張圖，哪一張看得出變化？', '從 0 畫起，點都擠在一起。', '數都很大，下面用不到的部分可以省略。'], think: '老師比一比：用波浪線省略下面，變化才看得清楚。', together: '一起比：哪一張看得清楚？',
        figure: ctx => { const p = ctx.problem, whole = { ...p, min: 0, brk: false, step: 10 * p.step, every: 5, rows: Math.ceil(Math.max(...p.series[0].v) / (10 * p.step)) };
          return `<div class="ln-pair"><figure><figcaption>從 0 畫起</figcaption>${chartSVG(whole, { noTitle: true })}</figure><figure><figcaption>用波浪線</figcaption>${chartSVG(p, { noTitle: true })}</figure></div>`; },
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('way', '哪一種比較看得出變化？', [['brk', `用波浪線，省略 0 到 ${ctx.problem.min}`], ['zero', '從 0 開始畫']], true)}`,
        check: ctx => !ctx.answers.way ? { code: 'way', msg: '先選一個答案。' } : ctx.answers.way === 'brk' ? null : { code: 'way', obs: 'wrongChoice', msg: '從 0 畫起，點都擠在一起，看不出變化。' },
        solve: ctx => { ctx.answers.way = 'brk'; }, say: ex => `用波浪線，省略 0 到 ${ex.problem.min}。` },
      { title: '從幾開始', ids: ['start'], hints: ['波浪線上面的第一條格線，寫多少？', '要比最小的數小一點。', '選比最小的數小、又最接近的那個整數。'], think: '老師看最小的數，波浪線上面從比它小一點的數開始。', together: '一起想：從幾開始？',
        figure: ctx => tableHtml(ctx.problem),
        answer: ctx => { const p = ctx.problem; return ctx.choice('start', '波浪線上面第一條格線寫多少？', [...new Set([p.min, 0, Math.min(...p.series[0].v) + 2])].map(x => [String(x), String(x)])); },
        check: ctx => { const p = ctx.problem, v = Number(ctx.answers.start); if (!ctx.answers.start) return { code: 'start', msg: '先選一個答案。' }; return v === p.min ? null : { code: 'start', obs: v === 0 ? 'ignoreBreak' : 'other', msg: v === 0 ? '用了波浪線，上面就不是從 0 開始。' : `要比最小的數 ${Math.min(...p.series[0].v)} 還小，最小的點才畫得到。` }; },
        solve: ctx => { ctx.answers.start = String(ctx.problem.min); }, say: ex => `從 ${ex.problem.min} 開始。` },
      { title: '描點', ids: ['pts0'], hints: ['從波浪線上面的數開始往上數。', '一格是 1，數一數要幾格。', '每個時間都要描。'], think: `老師從波浪線上面的數開始，往上數格子描點。`, together: '一起描。',
        figure: ctx => chartSVG({ ...ctx.problem, series: [{ ...ctx.problem.series[0], v: [] }] }, { plot: { pts: ctx.state.pts || {}, cells: true }, noTitle: true }),
        answer: ctx => `${tableHtml(ctx.problem)}<p class="notice" data-read data-say>描了 ${Object.keys(ctx.state.pts || {}).length} 個點，共 ${ctx.problem.xs.length} 個。</p>`,
        bind: bindCells(2), check: ctx => plotCheck(ctx.problem, ctx.state.pts || {}),
        solve: ctx => { ctx.state.pts = Object.fromEntries(ctx.problem.series[0].v.map((y, i) => [i, y])); ctx.answers.pts0 = String(ctx.problem.xs.length); }, say: () => '每個點都描好了。' },
      { title: '讀讀看', ids: ['val'], hints: ['從點往左，對到縱軸。', '縱軸從波浪線上面的數開始。', '不是從 0 開始數格子。'], think: '老師從點往左對到縱軸，從波浪線上面的數開始算。', together: '一起讀：是多少？',
        figure: ctx => chartSVG(ctx.problem, { guideX: ctx.problem.ti, guideY: ctx.hint(3) >= 2 ? [ctx.problem.ti, 0] : null, mark: [[ctx.problem.ti, 0]] }),
        answer: ctx => fieldHtml(ctx, 'val', `${esc(ctx.problem.full[ctx.problem.ti])}是多少${esc(ctx.problem.unit)}？`, 3),
        check: ctx => { const p = ctx.problem, v = num(ctx.answers.val); if (v === null) return { code: 'val', msg: '把讀到的數填進去。' }; if (v === valueOf(p, p.ti)) return null; const obs = readObs(p, v, p.ti); return { code: 'val', obs, msg: readMsg(obs, p) }; },
        solve: ctx => { ctx.answers.val = String(valueOf(ctx.problem, ctx.problem.ti)); }, say: ex => `${ex.problem.full[ex.problem.ti]}是 ${valueOf(ex.problem, ex.problem.ti)}。` }
    ],
    reasons, done: ctx => `用波浪線省略 0 到 ${ctx.problem.min}，變化看得更清楚。`, chant: '數都很大：波浪線省略下面，讀的時候不從 0 數。', transfer: '找一找：哪些圖的縱軸有波浪線？'
  });

  // =============== 5-4 兩條線一起畫 ===============
  A.register('lnDrawTwo', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      let out;
      for (let t = 0; t < 60; t++) {   // 相差最多的那一天只有一天
        const p = makeTwo(level === 'easy' ? 'easy' : 'standard', i, rand, { levels: { easy: [['bean', { step: 1, lo: 1, hi: 9, n: 4, up: true }]], standard: [['bean', { step: 2, lo: 2, hi: 18, n: 6, up: true, every: 2 }]] } });
        const d = p.series[0].v.map((y, j) => Math.abs(y - p.series[1].v[j])), far = d.indexOf(Math.max(...d));
        out = { ...p, title: '兩株豆芽每天的高度', far, uniq: d.filter(x => x === d[far]).length === 1, prompt: 'A 株已經畫好了。照表格，把 B 株也畫上去。' };
        if (out.uniq) break;
      }
      return out; },
    planFigure: ctx => tableHtml(ctx.problem),
    steps: [
      { title: '描第二條線', ids: ['pts1'], hints: ['看表格 B 株那一列。', '用方塊描，和 A 株分開。', '每一天都要描。'], think: '老師看 B 株那一列，一個一個描。', together: '一起描 B 株。',
        figure: ctx => chartSVG({ ...ctx.problem, series: [ctx.problem.series[0], { ...ctx.problem.series[1], v: [] }] }, { show: [0], plot: { s: 1, pts: ctx.state.pts || {}, cells: true }, noTitle: true }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${tableHtml(ctx.problem)}`,
        bind: bindCells(0, 1), check: ctx => plotCheck(ctx.problem, ctx.state.pts || {}, 1),
        solve: ctx => { ctx.state.pts = Object.fromEntries(ctx.problem.series[1].v.map((y, i) => [i, y])); ctx.answers.pts1 = String(ctx.problem.xs.length); }, say: () => 'B 株描好了。' },
      { title: '圖例', ids: ['legend'], hints: ['兩條線要分得出來。', '圖例寫：哪一種點是誰。', 'A 株用圓點，B 株用方塊。'], think: '老師加上圖例：圓點是 A 株，方塊是 B 株。', together: '一起寫圖例。',
        figure: ctx => chartSVG(ctx.problem, { legend: ctx.checked(1) }),
        answer: ctx => ctx.choice('legend', '方塊的線是誰？', [['1', esc(ctx.problem.series[1].name)], ['0', esc(ctx.problem.series[0].name)]], true),
        check: ctx => !ctx.answers.legend ? { code: 'legend', msg: '先選一個答案。' } : ctx.answers.legend === '1' ? null : { code: 'legend', obs: 'legendMix', msg: '剛剛描的方塊是 B 株。' },
        solve: ctx => { ctx.answers.legend = '1'; }, say: () => '方塊是 B 株。' },
      { title: '比一比', ids: ['far'], hints: ['看同一天的兩個點。', '兩個點離得最遠的那一天，相差最多。', '算一算每一天相差多少。'], think: '老師看每一天兩個點的距離，找最遠的。', together: '一起找：哪一天差最多？',
        figure: ctx => chartSVG(ctx.problem, { legend: true }),
        answer: ctx => { const p = ctx.problem; return ctx.choice('far', '哪一天兩株相差最多？', opt3(p, p.far, [p.far + 1, p.far - 1, p.far + 2])); },
        check: ctx => { const p = ctx.problem, a = Number(ctx.answers.far); if (!ctx.answers.far) return { code: 'far', msg: '先選一個答案。' }; const d = p.series[0].v.map((y, j) => Math.abs(y - p.series[1].v[j]));
          return d[a] === d[p.far] ? null : { code: 'far', obs: 'wrongChoice', msg: '看同一天兩個點離多遠，找最遠的。' }; },
        solve: ctx => { ctx.answers.far = String(ctx.problem.far); }, say: ex => `${ex.problem.full[ex.problem.far]}相差最多。` }
    ],
    reasons: [['legend', '用圖例分兩條線'], ['hint', '看提示']], done: ctx => `兩條線畫好了，${ctx.problem.full[ctx.problem.far]}相差最多。`, chant: '兩條線：不同顏色、不同點，再加圖例。', transfer: '想一想：你和好朋友一週的跳繩次數，可以畫成兩條線比一比。'
  });

  // =============== 6-1 記錄一週（學生只輸入數字，名稱從選單挑） ===============
  const ITEMS = [['water', '每天喝水的杯數', '杯'], ['jump', '每天跳繩的次數（十下為單位）', '十下'], ['read', '每天看書的頁數', '頁'], ['sleep', '每天睡覺的時數', '小時']];
  const DAY5 = ['一', '二', '三', '四', '五'];
  const ownData = ctx => { const v = [0, 1, 2, 3, 4].map(j => num(ctx.answers['d' + j])); return v.every(x => x !== null && Number.isInteger(x) && x >= 0 && x <= 20) ? v : null; };
  const ownChart = ctx => { const it = ITEMS.find(x => x[0] === ctx.answers.item) || ITEMS[0], v = ownData(ctx) || ctx.problem.sample, m = Math.max(...v, 1), step = m > 10 ? 2 : 1;
    return { title: `我${it[1]}`, xName: '星期', yName: it[1].replace(/^每天/, '').replace(/（.*）/, ''), unit: it[2], what: it[1], xs: DAY5, full: DAY5.map(x => '星期' + x), series: [{ name: '我', v }], min: 0, step, rows: Math.ceil(m / step / 2) * 2, every: 2, brk: false }; };
  A.register('lnRecord', {
    methods: [['mark', '🗓️ 先選要記錄什麼'], ['self', '🧠 自己來']],
    makeProblem: (level, i, rand = Math.random) => { const sample = Array.from({ length: 5 }, () => rnd(rand, 2, level === 'easy' ? 8 : 16)); return { sample, dims: [5, 1, Math.max(...sample)], prompt: '記錄你自己一週（星期一到五）的資料，畫成折線圖。只填數字。' }; },
    planFigure: () => '',
    steps: [
      { title: '選題目', ids: ['item'], hints: ['想一想：你每天都會做的事。', '選一個每天都可以數的。', '例如每天喝幾杯水。'], think: '老師選一個每天都可以數的事。', together: '一起選：要記錄什麼？',
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('item', '要記錄什麼？', ITEMS.map(x => [x[0], x[1]]), true)}`,
        check: ctx => ctx.answers.item ? null : { code: 'item', msg: '先選一個要記錄的事。' },
        solve: ctx => { ctx.answers.item = ctx.answers.item || 'water'; }, say: () => '選好要記錄的事了。' },
      { title: '填數字', ids: ['d0', 'd1', 'd2', 'd3', 'd4'], hints: ['每一天填一個數。', '只填 0 到 20 的整數。', '沒有記錄的話，可以按「用老師給的資料」。'], think: '老師把每一天的數填進表格。', together: '一起填。',
        answer: ctx => `${DAY5.map((d, j) => fieldHtml(ctx, 'd' + j, `星期${d}`, 1)).join('')}<div class="actions"><button type="button" id="lnSample" class="secondary">用老師給的資料</button></div>`,
        bind: ctx => { const b = document.getElementById('lnSample'); if (b) b.onclick = () => { ctx.problem.sample.forEach((y, j) => { ctx.answers['d' + j] = String(y); }); ctx.log('用老師給的資料'); ctx.rerender(); }; },
        check: ctx => ownData(ctx) ? null : { code: 'data', obs: 'unfinished', msg: '每一天都要填 0 到 20 的整數。' },
        solve: ctx => { ctx.problem.sample.forEach((y, j) => { ctx.answers['d' + j] = String(y); }); }, say: () => '五天都填好了。' },
      { title: '畫成折線圖', ids: ['pts0'], hints: ['照你填的數，一天描一個點。', '看縱軸一格是多少。', '五天都要描。'], think: '老師照自己填的數描點。', together: '一起描。',
        figure: ctx => { const p = ownChart(ctx); return chartSVG({ ...p, series: [{ ...p.series[0], v: [] }] }, { plot: { pts: ctx.state.pts || {}, cells: true } }); },
        answer: ctx => { const p = ownChart(ctx); return `${tableHtml(p)}<p class="notice" data-read data-say>縱軸一格是 ${p.step}。描了 ${Object.keys(ctx.state.pts || {}).length} 個點，共 5 個。</p>`; },
        bind: bindCells(2), check: ctx => plotCheck(ownChart(ctx), ctx.state.pts || {}),
        solve: ctx => { const p = ownChart(ctx); ctx.state.pts = Object.fromEntries(p.series[0].v.map((y, i) => [i, y])); ctx.answers.pts0 = '5'; }, say: () => '五天都描好了。' }
    ],
    reasons, done: ctx => `用自己的資料畫好折線圖了。`, chant: '自己的資料，也可以畫成折線圖。', transfer: '下一週再記一次，比一比有沒有不一樣。'
  });

  // =============== 6-2 用圖說話 ===============
  A.register('lnTell', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = makeChart(level === 'challenge' ? 'standard' : level, i, rand, { key: pick(['water', 'jump', 'book'], i), test: v => v[0] !== v.at(-1) });
      return { ...p, mx: maxAt(p), end: p.series[0].v.at(-1) > p.series[0].v[0] ? 'more' : 'less', prompt: `看「${p.title}」，用圖說話。` }; },
    planFigure: ctx => chartSVG(ctx.problem, {}),
    steps: [
      { title: '什麼時候最多', ids: ['max'], hints: ['找最高的點。', '往下看是哪一個時間。', '最高的點就是最多。'], think: '老師找最高的點。', together: '一起找。',
        figure: ctx => chartSVG(ctx.problem, { mark: ctx.hint(0) >= 2 ? [[ctx.problem.mx, 0]] : [] }),
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('max', `什麼時候${esc(p.what)}最多？`, opt3(p, p.mx, [p.mx + 1, p.mx - 1, 0]))}`; },
        check: ctx => !ctx.answers.max ? { code: 'max', msg: '先選一個答案。' } : Number(ctx.answers.max) === ctx.problem.mx ? null : { code: 'max', obs: 'wrongChoice', msg: '找最高的點。' },
        solve: ctx => { ctx.answers.max = String(ctx.problem.mx); }, say: ex => `${ex.problem.full[ex.problem.mx]}最多。` },
      { title: '頭和尾比一比', ids: ['end'], hints: ['看第一個點和最後一個點。', '最後一個點比較高還是比較低？', '比較高是變多，比較低是變少。'], think: '老師比第一個和最後一個點。', together: '一起比。',
        figure: ctx => chartSVG(ctx.problem, { mark: [[0, 0], [ctx.problem.xs.length - 1, 0]] }),
        answer: ctx => { const p = ctx.problem; return ctx.choice('end', `${esc(p.full.at(-1))}和${esc(p.full[0])}比，是變多還是變少？`, [['more', '變多'], ['less', '變少']], true); },
        check: ctx => !ctx.answers.end ? { code: 'end', msg: '先選一個答案。' } : ctx.answers.end === ctx.problem.end ? null : { code: 'end', obs: 'wrongChoice', msg: '比第一個和最後一個點的高低。' },
        solve: ctx => { ctx.answers.end = ctx.problem.end; }, say: ex => ex.problem.end === 'more' ? '變多了。' : '變少了。' },
      { title: '哪一句是根據', ids: ['say'], hints: ['根據要是圖上「看到的」。', '「一定會」是猜的，圖上看不到以後的事。', '選說出圖上數字的那一句。'], think: '老師選圖上看得到的那一句；以後的事圖上看不到。', together: '一起選：哪一句是看到的？',
        answer: ctx => { const p = ctx.problem, m = p.mx; return ctx.choice('say', '哪一句是從圖上看到的？', [['see', `${esc(p.full[m])}的點最高，是 ${valueOf(p, m)} ${esc(p.unit)}`], ['future', `下一次一定也是${esc(p.full[m])}最多`], ['feel', '我覺得每天都一樣']]); },
        check: ctx => !ctx.answers.say ? { code: 'say', msg: '先選一個答案。' } : ctx.answers.say === 'see' ? null : { code: 'say', obs: ctx.answers.say === 'future' ? 'overPredict' : 'wrongChoice', msg: ctx.answers.say === 'future' ? '圖上只有記下來的資料，看不到以後一定會怎樣。' : '看圖：每天的點高低不一樣。' },
        solve: ctx => { ctx.answers.say = 'see'; }, say: ex => `${ex.problem.full[ex.problem.mx]}的點最高。` }
    ],
    reasons, done: ctx => `${ctx.problem.full[ctx.problem.mx]}最多；說話要有圖上的根據。`, chant: '用圖說話：說看到的，不說一定會。', transfer: '用自己畫的圖，跟同學說一句有根據的話。'
  });
})();

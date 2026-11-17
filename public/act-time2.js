'use strict';
// 第 32 版：時間概念教材包單元 0～7 的其他活動（3-2 看鐘六步在 act-time.js）。圖形和計算在 act-time.js（window.timeFig）。
// 課綱備註：N-1-6 只報整點、半點，以鐘面教學；N-2-13 不含秒針；N-2-14 不做時間間隔；N-3-17 加減不進退位。
(() => {
  const A = window.areaActs, U = A.util, { esc } = U, T = window.timeFig;
  const { rnd, any, toMin, split, hmText, digital, to12, periodOf, say12, durText, minuteNo, clockSVG, digiHtml, clockPair, setClockHtml, bindClock, lineSVG, WEEK, daysIn, weekday, calHtml, fiveAid, convAid, nStep, cStep, hmStep, prompt, shown, readWrong } = T;
  const methods = [['mark', '🕐 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['look', '先看圖'], ['count', '五個一數或一個一個數'], ['hint', '看提示']];
  const fromLevel = (o, level) => o[level] || o.standard;
  const uniq = list => list.filter((x, k) => list.findIndex(y => y[0] === x[0]) === k);

  // =============== 0-1 五個一數（先測） ===============
  A.register('tmCount5', {
    methods, makeProblem: (level, i, rand = Math.random) => { const top = fromLevel({ easy: 6, standard: 11, challenge: 11 }, level), k = rnd(rand, 2, top - 1), n = rnd(rand, 2, top);
      return { k, n, seq: [1, 2, 3, 4].map(j => (k - 2 + j) * 5), miss: 2, dims: [k * 5, n * 5], prompt: '五個一數：5、10、15……' }; },
    planFigure: ctx => `<p class="fm-big">5、10、15、20……</p>`,
    steps: [
      nStep(0, { title: '下一個是多少', ask: '五個一數，下一個是多少？', id: 'nx', hints: ['五個一數：每次多 5。', '前面一個數加 5。', '5、10、15、20、25、30……'],
        think: '老師五個一數：每次多 5。', together: '一起數：下一個是多少？', pre: ctx => `${prompt(ctx)}<p class="fm-big">${ctx.problem.seq.slice(0, 2).join('、')}、□、${ctx.problem.seq[3]}</p>`,
        label: () => '□ 是多少？', ans: ctx => ctx.problem.seq[2], wrong: (ctx, v) => v === ctx.problem.seq[1] + 1 ? { msg: '五個一數，每次多 5，不是多 1。' } : null, say: ex => `${ex.problem.seq.join('、')}。` }),
      nStep(1, { title: '數了幾個 5', ask: '數了幾次 5，是多少？', id: 'tot', hints: ['伸出手，一次 5 根手指。', '一邊數一邊記：1 個 5 是 5、2 個 5 是 10……', `${'□'} 個 5 就是 5 × □。`],
        think: '老師一次數 5 個，數了幾次就是幾個 5。', together: '一起數：是多少？', figure: ctx => `<p class="fm-big" aria-label="${ctx.problem.n} 隻手">${'🖐️'.repeat(ctx.problem.n)}</p>`,
        label: ctx => `${ctx.problem.n} 隻手，一隻手 5 根手指，一共幾根？`, ans: ctx => ctx.problem.n * 5, wrong: (ctx, v) => v === ctx.problem.n ? { msg: '這是手的數量。每一隻手是 5 根，要五個一數。' } : null, say: ex => `${ex.problem.n} 個 5 是 ${ex.problem.n * 5}。` })
    ],
    reasons, done: ctx => `五個一數：${ctx.problem.n} 個 5 是 ${ctx.problem.n * 5}。`, chant: '五個一數：5、10、15、20……每次多 5。', transfer: '想一想：時鐘的分針走一個數字，是幾分？'
  });

  // =============== 0-2 數到 60（先測） ===============
  A.register('tmTo60', {
    methods, makeProblem: (level, i, rand = Math.random) => { const top = fromLevel({ easy: 30, standard: 60, challenge: 60 }, level), a = 10 * rnd(rand, 1, top / 10) - 1, b = 10 * rnd(rand, 1, top / 10) + (level === 'challenge' ? 0 : 1);
      return { a, b: Math.min(b, top), dims: [a, b], prompt: '從 1 數到 60。' }; },
    planFigure: () => `<p class="fm-big">1、2、3……58、59、60</p>`,
    steps: [
      nStep(0, { title: '下一個數', ask: '數到它，下一個是多少？', id: 'nx', hints: ['一個一個往上數。', '個位是 9，下一個要換十位。', '例如 19 的下一個是 20。'], think: '老師一個一個往上數，遇到 9 就換下一個十。', together: '一起數：下一個是多少？', pre: prompt,
        label: ctx => `${ctx.problem.a} 的下一個數是多少？`, ans: ctx => ctx.problem.a + 1, wrong: (ctx, v) => v === ctx.problem.a + 11 || v === ctx.problem.a - 9 ? { msg: `${ctx.problem.a} 再多 1，十位要變成下一個。` } : null, say: ex => `${ex.problem.a} 的下一個是 ${ex.problem.a + 1}。` }),
      nStep(1, { title: '前一個數', ask: '它前面一個是多少？', id: 'pv', hints: ['往回數一個。', '個位是 0，往回要變成 9。', '例如 40 的前一個是 39。'], think: '老師往回數一個。', together: '一起數：前一個是多少？',
        label: ctx => `${ctx.problem.b} 的前一個數是多少？`, ans: ctx => ctx.problem.b - 1, say: ex => `${ex.problem.b} 的前一個是 ${ex.problem.b - 1}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} 的下一個是 ${ctx.problem.a + 1}，${ctx.problem.b} 的前一個是 ${ctx.problem.b - 1}。`, chant: '數到 60：個位是 9，下一個就換十位。', transfer: '想一想：1 分鐘是 60 秒，你可以數到 60 嗎？'
  });

  // =============== 1-1 上午、中午、下午、晚上 ===============
  const DAY_ACTS = [['起床刷牙', 'am', '🪥'], ['第一節上課', 'am', '📚'], ['早上升旗', 'am', '🚩'], ['吃午餐', 'noon', '🍱'], ['午休', 'noon', '😴'], ['放學回家', 'pm', '🎒'], ['下午的體育課', 'pm', '⚽'], ['吃晚餐', 'night', '🍚'], ['洗澡', 'night', '🛁'], ['上床睡覺', 'night', '🌙']];
  const PERIODS = [['am', '上午'], ['noon', '中午'], ['pm', '下午'], ['night', '晚上']];
  const pName = k => PERIODS.find(x => x[0] === k)[1];
  A.register('tmPeriod', {
    methods, makeProblem: (level, i, rand = Math.random) => { const a = any(rand, DAY_ACTS); let b; do b = any(rand, DAY_ACTS); while (b[1] === a[1]);
      return { a, b, dims: [DAY_ACTS.indexOf(a), DAY_ACTS.indexOf(b)], prompt: '這件事是在一天的什麼時候？' }; },
    planFigure: ctx => `<p class="fm-big">${ctx.problem.a[2]} ${ctx.problem.b[2]}</p>`,
    steps: [0, 1].map(k => cStep(k, { title: k ? '再一件事' : '這件事在什麼時候', ask: '是上午、中午、下午，還是晚上？', id: 'p' + k, fixed: true, hints: ['想一想：太陽出來、去上學是上午。', '吃午餐、午休是中午；放學是下午。', '天黑了、吃晚餐、睡覺是晚上。'],
      think: '老師想一想自己什麼時候做這件事。', together: '一起想：是什麼時候？', pre: k ? null : prompt, figure: ctx => `<p class="fm-big" aria-hidden="true">${ctx.problem[k ? 'b' : 'a'][2]}</p>`,
      q: ctx => `「${ctx.problem[k ? 'b' : 'a'][0]}」通常在什麼時候？`, opts: () => PERIODS, ans: ctx => ctx.problem[k ? 'b' : 'a'][1],
      wrong: ctx => ({ msg: `想一想你每天「${ctx.problem[k ? 'b' : 'a'][0]}」的時候，天色和在做什麼。` }), say: ex => `${ex.problem[k ? 'b' : 'a'][0]}是在${pName(ex.problem[k ? 'b' : 'a'][1])}。` })),
    reasons, done: ctx => `${ctx.problem.a[0]}是在${pName(ctx.problem.a[1])}，${ctx.problem.b[0]}是在${pName(ctx.problem.b[1])}。`, chant: '一天的時間：上午、中午、下午、晚上。', transfer: '想一想：你今天上午做了什麼？'
  });

  // =============== 1-2 昨天、今天、明天 ===============
  const EVENTS = ['考數學', '上體育課', '校外教學', '運動會', '去看牙醫', '上游泳課', '包水餃'];
  A.register('tmDay', {
    methods, makeProblem: (level, i, rand = Math.random) => { const ev = U.shuffle(EVENTS, rand).slice(0, 3), ask = rnd(rand, 0, 2), mo = rnd(rand, 3, 11), d = rnd(rand, 2, daysIn(2026, mo) - 1);
      return { ev, ask, mo, d, dims: [ask, mo, d], prompt: `昨天${ev[0]}，今天${ev[1]}，明天${ev[2]}。` }; },
    planFigure: ctx => `<div class="tm-days">${['昨天', '今天', '明天'].map((w, k) => `<div class="tm-dcard${k === 1 ? ' on' : ''}"><b>${w}</b><span>${esc(ctx.problem.ev[k])}</span></div>`).join('')}</div>`,
    steps: [
      cStep(0, { title: '是哪一天', ask: '是昨天、今天，還是明天？', id: 'which', fixed: true, hints: ['看三張卡片。', '昨天是今天的前一天；明天是今天的後一天。', '找到那件事寫在哪一張卡片。'], think: '老師看三張卡片，找那件事在哪一天。', together: '一起找：是哪一天？', pre: prompt,
        figure: ctx => `<div class="tm-days">${['昨天', '今天', '明天'].map((w, k) => `<div class="tm-dcard${k === 1 ? ' on' : ''}"><b>${w}</b><span>${esc(ctx.problem.ev[k])}</span></div>`).join('')}</div>`,
        q: ctx => `「${ctx.problem.ev[ctx.problem.ask]}」是哪一天？`, opts: () => [['0', '昨天'], ['1', '今天'], ['2', '明天']], ans: ctx => String(ctx.problem.ask),
        wrong: (ctx, a) => Math.abs(Number(a) - ctx.problem.ask) === 2 ? { obs: 'dayLabel', msg: '昨天和明天弄反了：昨天已經過去了，明天還沒到。' } : { msg: '再看一次卡片。' }, say: ex => `${ex.problem.ev[ex.problem.ask]}是${['昨天', '今天', '明天'][ex.problem.ask]}。` }),
      nStep(1, { title: '明天是幾日', ask: '今天的下一天是幾日？', id: 'tm', hints: ['明天是今天的下一天。', '日期加 1。', '看月曆：往右邊一格。'], think: '老師看月曆：明天就是往後一格。', together: '一起看：明天是幾月幾日？',
        figure: ctx => calHtml(2026, ctx.problem.mo, { mark: [ctx.problem.d], hint: shown(ctx, 1) ? [ctx.problem.d + 1] : [] }),
        label: ctx => `今天是 ${ctx.problem.mo} 月 ${ctx.problem.d} 日。明天是 ${ctx.problem.mo} 月幾日？`, ans: ctx => ctx.problem.d + 1,
        wrong: (ctx, v) => v === ctx.problem.d - 1 ? { obs: 'dayLabel', msg: `${ctx.problem.d - 1} 日是昨天。明天是下一天。` } : null, say: ex => `明天是 ${ex.problem.mo} 月 ${ex.problem.d + 1} 日。` })
    ],
    reasons, done: ctx => `${ctx.problem.ev[ctx.problem.ask]}是${['昨天', '今天', '明天'][ctx.problem.ask]}；明天是 ${ctx.problem.mo} 月 ${ctx.problem.d + 1} 日。`, chant: '昨天已經過去，今天是現在，明天還沒到。', transfer: '想一想：明天你要做什麼？'
  });

  // =============== 2-1 整點 ===============
  A.register('tmHour', {
    methods, makeProblem: (level, i, rand = Math.random) => { const h = rnd(rand, 1, 12); let g; do g = rnd(rand, 1, 11); while (g === h); return { h, g, dims: [h, g], prompt: '看時鐘，說出幾時；再撥一撥時鐘。' }; },
    planFigure: ctx => clockSVG(ctx.problem.h, 0),
    steps: [
      nStep(0, { title: '讀整點', ask: '長針指著 12，短針指著幾？', id: 'hh', hints: ['長針指著 12，就是整點。', '看短針指著哪個數字。', '短針指著幾，就是幾時。'], think: '老師看：長針指著 12，是整點；短針指著的數字就是幾時。', together: '一起讀：幾時？',
        figure: ctx => clockSVG(ctx.problem.h, 0, { hl: shown(ctx, 0) ? 'h' : null }), pre: prompt, label: () => '現在是幾時？', ans: ctx => ctx.problem.h,
        wrong: (ctx, v) => v === 12 && ctx.problem.h !== 12 ? { obs: 'handSwap', msg: '12 是長針（分針）指的數字。看短針。' } : null, say: ex => `長針指著 12，短針指著 ${ex.problem.h}，是 ${ex.problem.h} 時。` }),
      { title: '撥時鐘', ask: '短針要撥到哪裡？', ids: ['set'], hints: ['整點時，長針指著 12。', '按「往前」「往回」撥短針。', '短針指著要的數字就對了。'], think: '老師撥短針，讓它指著要的數字；長針留在 12。', together: '一起撥：撥到幾時？',
        answer: ctx => `<p data-read data-say>請把時鐘撥到 ${ctx.problem.g} 時。</p>${setClockHtml(ctx, 'set', { h0: 12 })}`, bind: bindClock(1, 'set', { h0: 12 }),
        check: ctx => { const v = ctx.state.set; if (!v || !ctx.answers.set) return { code: 'set', obs: 'unfinished', msg: '按按鈕撥一撥時鐘。' }; return v.h === ctx.problem.g && v.m === 0 ? null : { code: 'set', obs: 'other', msg: `短針要指著 ${ctx.problem.g}。` }; },
        solve: ctx => { ctx.state.set = { h: ctx.problem.g, m: 0 }; ctx.answers.set = `${ctx.problem.g}:0`; }, figure: () => '', say: ex => `短針指著 ${ex.problem.g}，長針指著 12，是 ${ex.problem.g} 時。` }
    ],
    reasons, done: ctx => `看到 ${ctx.problem.h} 時，也撥出了 ${ctx.problem.g} 時。`, chant: '整點：長針指著 12，短針指著幾就是幾時。', transfer: '想一想：你幾時起床？幾時上學？'
  });

  // =============== 2-2 半點 ===============
  A.register('tmHalf', {
    methods, makeProblem: (level, i, rand = Math.random) => { const h = rnd(rand, 1, 12); let g; do g = rnd(rand, 1, 11); while (g === h); return { h, g, dims: [h, g], prompt: '看時鐘，說出幾時半（幾時 30 分）。' }; },
    planFigure: ctx => clockSVG(ctx.problem.h, 30),
    steps: [
      cStep(0, { title: '時針在哪裡', ask: '半點的時候，短針在哪裡？', id: 'pos', fixed: true, hints: ['半點時，長針指著 6。', '長針走了一半，短針也走了一半。', '短針會在兩個數字的中間。'], think: '老師看：長針指著 6，是半點；短針走到兩個數字的中間。', together: '一起看：短針在哪裡？',
        figure: ctx => clockSVG(ctx.problem.h, 30, { hl: shown(ctx, 0) ? 'h' : null }), pre: prompt,
        q: () => '半點的時候，短針在哪裡？', opts: () => [['mid', '在兩個數字的中間'], ['on', '剛好指在一個數字上']], ans: () => 'mid', wrong: () => ({ obs: 'halfHourHand', msg: '長針走了半圈，短針也往前走了一半，會在兩個數字中間。' }), say: () => '短針在兩個數字的中間。' }),
      hmStep(1, { title: '讀半點', ask: '是幾時幾分？', id: 'rd', hints: ['短針剛走過哪個數字，就是幾時。', '長針指著 6，是 30 分（半點）。', '還沒走到的數字不算。'], think: '老師讀：短針剛走過的數字是幾時，長針指著 6 是 30 分。', together: '一起讀：幾時幾分？',
        figure: ctx => clockSVG(ctx.problem.h, 30), label: () => '現在是幾時幾分？', ans: ctx => [ctx.problem.h, 30], wrong: (ctx, [a, b]) => a !== ctx.problem.h ? readWrong(ctx.problem.h, 30)(ctx, a) : b === 6 ? { obs: 'minuteAsNumber', msg: '長針指著 6 是 30 分（半點），不是 6 分。' } : { msg: '長針指著 6，是 30 分。' },
        say: ex => `${ex.problem.h} 時 30 分，也就是 ${ex.problem.h} 時半。` }),
      { title: '撥半點', ask: '長針和短針要撥到哪裡？', ids: ['set'], hints: ['半點：長針指著 6。', '先撥長針到 6，再看短針。', '短針會在兩個數字中間。'], think: '老師先撥長針到 6，再撥短針到兩個數字的中間。', together: '一起撥：撥到幾時半？',
        answer: ctx => `<p data-read data-say>請把時鐘撥到 ${ctx.problem.g} 時 30 分。</p>${setClockHtml(ctx, 'set', { h0: 12, minStep: 30 })}`, bind: bindClock(2, 'set', { h0: 12, minStep: 30 }),
        check: ctx => { const v = ctx.state.set; if (!v || !ctx.answers.set) return { code: 'set', obs: 'unfinished', msg: '按按鈕撥一撥時鐘。' }; if (v.m !== 30) return { code: 'set', obs: 'other', msg: '長針要指著 6（30 分）。' }; return v.h === ctx.problem.g ? null : { code: 'set', obs: v.h === (ctx.problem.g % 12) + 1 ? 'hourNext' : 'other', msg: `短針要在 ${ctx.problem.g} 和 ${(ctx.problem.g % 12) + 1} 的中間。` }; },
        solve: ctx => { ctx.state.set = { h: ctx.problem.g, m: 30 }; ctx.answers.set = `${ctx.problem.g}:30`; }, figure: () => '', say: ex => `長針指著 6，短針在 ${ex.problem.g} 和 ${(ex.problem.g % 12) + 1} 中間，是 ${ex.problem.g} 時 30 分。` }
    ],
    reasons, done: ctx => `看到 ${ctx.problem.h} 時 30 分，也撥出了 ${ctx.problem.g} 時 30 分。`, chant: '半點：長針指著 6，短針在兩個數字中間。', transfer: '想一想：12 時 30 分你在做什麼？'
  });

  // =============== 3-1 五分五分讀 ===============
  A.register('tmRead5', {
    methods, makeProblem: (level, i, rand = Math.random) => { const h = rnd(rand, 1, 12), m = 5 * rnd(rand, 1, 11); return { h, m, dims: [h, m], prompt: '看時鐘，五分五分讀出幾時幾分。' }; },
    planFigure: ctx => clockSVG(ctx.problem.h, ctx.problem.m),
    steps: [
      nStep(0, { title: '讀幾時', ask: '短針剛走過哪個數字？', id: 'hh', hints: ['先找短針。', '短針剛走過的數字就是幾時。', '還沒走到的數字不算。'], think: '老師先看短針，讀出幾時。', together: '一起讀：幾時？', pre: prompt,
        figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { hl: 'h' }), label: () => '是幾時？', ans: ctx => ctx.problem.h, wrong: (ctx, v) => readWrong(ctx.problem.h, ctx.problem.m)(ctx, v), say: ex => `${ex.problem.h} 時。` }),
      nStep(1, { title: '讀幾分', ask: '長針指著幾？五個一數是幾分？', id: 'mm', aid: fiveAid, hints: ['再找長針。', '從 12 開始，五個一數：5、10、15……', '數到長針指的數字。'], think: '老師看長針，從 12 開始五個一數。', together: '一起數：幾分？',
        figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { hl: 'm', labels: shown(ctx, 1) }), label: () => '是幾分？', ans: ctx => ctx.problem.m,
        wrong: (ctx, v) => v === ctx.problem.m / 5 ? { obs: 'minuteAsNumber', msg: `長針指著 ${v}，不是 ${v} 分，要五個一數。` } : v === ctx.problem.h * 5 % 60 ? { obs: 'handSwap', msg: '這是短針的位置。分要看長針。' } : null, say: ex => `長針指著 ${ex.problem.m / 5}，五個一數是 ${ex.problem.m} 分。` }),
      cStep(2, { title: '電子鐘', ask: '電子鐘怎麼寫？', id: 'digi', hints: ['前面是時，後面是分。', '中間用「:」隔開。', '分不到 10，前面補 0。'], think: '老師寫成電子鐘：前面是時，後面是分。', together: '一起寫：電子鐘怎麼寫？',
        q: ctx => `${hmText(ctx.problem.h, ctx.problem.m)}，電子鐘怎麼寫？`, opts: ctx => { const { h, m } = ctx.problem; return uniq([['ok', digital(h, m)], ['swap', digital(m / 5, h * 5 % 60)], ['num', digital(h, m / 5)]]).map(x => [x[0], x[1]]); }, ans: () => 'ok',
        wrong: (ctx, a) => a === 'num' ? { obs: 'minuteAsNumber', msg: '分是五個一數的結果，不是長針指的數字。' } : { obs: 'handSwap', msg: '前面是時，後面是分。' }, say: ex => `寫成 ${digital(ex.problem.h, ex.problem.m)}。` })
    ],
    reasons, done: ctx => `${hmText(ctx.problem.h, ctx.problem.m)}，電子鐘寫 ${digital(ctx.problem.h, ctx.problem.m)}。`, chant: '五分五分讀：短針讀時，長針五個一數讀分。', transfer: '想一想：下課鐘是幾時幾分響？'
  });

  // =============== 3-3 經過幾小時（整時點數） ===============
  A.register('tmHours', {
    methods, makeProblem: (level, i, rand = Math.random) => { const span = fromLevel({ easy: [1, 3], standard: [2, 5], challenge: [3, 7] }, level), d = rnd(rand, ...span), a = rnd(rand, 1, 12 - d);
      return { a, b: a + d, d, dims: [a, a + d], prompt: `從 ${a} 時到 ${a + d} 時，經過幾小時？` }; },
    planFigure: ctx => clockPair(clockSVG(ctx.problem.a, 0, { aria: '開始的時鐘' }), clockSVG(ctx.problem.b, 0, { aria: '結束的時鐘' })),
    steps: [
      nStep(0, { title: '開始是幾時', ask: '開始的時鐘是幾時？', id: 'st', hints: ['長針指著 12，是整點。', '看短針指著幾。', '左邊是開始，右邊是結束。'], think: '老師先讀開始的時鐘。', together: '一起讀：開始是幾時？', pre: prompt,
        figure: ctx => clockPair(clockSVG(ctx.problem.a, 0, { aria: '開始的時鐘' }), clockSVG(ctx.problem.b, 0, { aria: '結束的時鐘' })), label: () => '開始是幾時？', ans: ctx => ctx.problem.a, say: ex => `開始是 ${ex.problem.a} 時。` }),
      nStep(1, { title: '一小時一小時跳', ask: '短針跳了幾個數字？', id: 'hrs', hints: ['短針從開始的數字，一格一格跳到結束的數字。', '每跳到下一個數字，就是 1 小時。', '數跳了幾次，不是數經過幾個數字。'], think: '老師讓短針一小時一小時往前跳，數跳了幾次。', together: '一起跳：幾小時？',
        figure: ctx => { const p = ctx.problem, s = toMin(p.a, 0), e = toMin(p.b, 0), marks = []; for (let t = s; t <= e; t += 60) marks.push(t); return lineSVG(s - 10, e + 10, { marks, fmt: t => `${split(t)[0]} 時`, jumps: shown(ctx, 1) ? marks.slice(1).map(t => [t - 60, t, '1 小時']) : [] }); },
        label: ctx => `${ctx.problem.a} 時到 ${ctx.problem.b} 時，經過幾小時？`, ans: ctx => ctx.problem.d, wrong: (ctx, v) => v === ctx.problem.d + 1 ? { obs: 'other', msg: '數的是「跳了幾次」，不是經過幾個數字。開始的那個不算。' } : null, say: ex => `跳了 ${ex.problem.d} 次，經過 ${ex.problem.d} 小時。` })
    ],
    reasons, done: ctx => `從 ${ctx.problem.a} 時到 ${ctx.problem.b} 時，經過 ${ctx.problem.d} 小時。`, chant: '經過幾小時：短針一格一格跳，數跳了幾次。', transfer: '想一想：你在學校待了幾小時？'
  });

  // =============== 4-1 幾月幾日星期幾 ===============
  A.register('tmCal', {
    methods, makeProblem: (level, i, rand = Math.random) => { const mo = rnd(rand, 1, 12), n = daysIn(2026, mo), d = rnd(rand, 1, n - 7), w = weekday(2026, mo, d), wd = rnd(rand, 0, 6), next = d + ((wd - w + 7) % 7 || 7);
      return { mo, d, w, wd, next, dims: [mo, d, wd], prompt: `看 2026 年 ${mo} 月的月曆。` }; },
    planFigure: ctx => calHtml(2026, ctx.problem.mo),
    steps: [
      cStep(0, { title: '星期幾', ask: '這一天在哪一欄？', id: 'w', hints: ['先在月曆找到這一天。', '往上看，最上面寫著星期幾。', '「日」是星期日。'], think: '老師先找到這一天，再往上看是星期幾。', together: '一起找：星期幾？', pre: prompt,
        figure: ctx => calHtml(2026, ctx.problem.mo, { hint: shown(ctx, 0) ? [ctx.problem.d] : [] }), q: ctx => `${ctx.problem.mo} 月 ${ctx.problem.d} 日是星期幾？`, fixed: true, opts: () => WEEK.map((w, k) => [String(k), '星期' + w]), ans: ctx => String(ctx.problem.w),
        wrong: () => ({ msg: '找到那一天，手指頭往上移到最上面那一排。' }), say: ex => `${ex.problem.mo} 月 ${ex.problem.d} 日是星期${WEEK[ex.problem.w]}。` }),
      nStep(1, { title: '下一個星期幾', ask: '往後找，下一個是幾日？', id: 'nx', hints: ['從這一天往右、往下一格一格找。', '找最上面寫著那個星期的那一欄。', '一星期有 7 天，同一欄的下一格多 7 天。'], think: '老師從這一天往後找，找到下一個那個星期。', together: '一起找：幾日？',
        figure: ctx => calHtml(2026, ctx.problem.mo, { mark: [ctx.problem.d], hint: shown(ctx, 1) ? [ctx.problem.next] : [] }), label: ctx => `${ctx.problem.mo} 月 ${ctx.problem.d} 日以後，下一個星期${WEEK[ctx.problem.wd]}是 ${ctx.problem.mo} 月幾日？`, ans: ctx => ctx.problem.next,
        say: ex => `下一個星期${WEEK[ex.problem.wd]}是 ${ex.problem.mo} 月 ${ex.problem.next} 日。` })
    ],
    reasons, done: ctx => `${ctx.problem.mo} 月 ${ctx.problem.d} 日是星期${WEEK[ctx.problem.w]}，下一個星期${WEEK[ctx.problem.wd]}是 ${ctx.problem.next} 日。`, chant: '看月曆：找到日期，往上看是星期幾。', transfer: '想一想：你的生日是幾月幾日？'
  });

  // =============== 4-2 年、月、星期、日 ===============
  const BIG = [1, 3, 5, 7, 8, 10, 12];
  A.register('tmCalUnits', {
    methods, makeProblem: (level, i, rand = Math.random) => { const kind = any(rand, ['week', 'year']), mo = level === 'challenge' && i % 3 === 0 ? 2 : rnd(rand, 1, 12), y = mo === 2 ? any(rand, [2024, 2025, 2026, 2028]) : 2026;
      return { kind, mo, y, days: daysIn(y, mo), dims: [mo, y], prompt: '年、月、星期、日有什麼關係？' }; },
    planFigure: () => `<p class="fm-big">📅</p>`,
    steps: [
      nStep(0, { title: '單位的關係', ask: '1 星期有幾天？1 年有幾個月？', id: 'u', aid: convAid, hints: ['想一想月曆：一排有幾天？', '一年從 1 月到 12 月。', '1 星期 7 天，1 年 12 個月。'], think: '老師看月曆：一排是一星期；一年有 1 月到 12 月。', together: '一起想：是多少？', pre: prompt,
        label: ctx => ctx.problem.kind === 'week' ? '1 星期有幾天？' : '1 年有幾個月？', ans: ctx => ctx.problem.kind === 'week' ? 7 : 12, say: ex => ex.problem.kind === 'week' ? '1 星期有 7 天。' : '1 年有 12 個月。' }),
      nStep(1, { title: '這個月有幾天', ask: '大月還是小月？', id: 'd', hints: ['大月有 31 天，小月有 30 天。', '1、3、5、7、8、10、12 月是大月。', '2 月最特別：28 天，四年一閏時 29 天。'], think: '老師用拳頭數大小月：凸起來的是大月。', together: '一起數：這個月有幾天？',
        figure: ctx => shown(ctx, 1) ? calHtml(ctx.problem.y, ctx.problem.mo) : `<p class="tm-fist" data-read>大月：1、3、5、7、8、10、12 月</p>`,
        label: ctx => `${ctx.problem.y} 年 ${ctx.problem.mo} 月有幾天？${ctx.problem.mo === 2 ? `（${ctx.problem.y} 年${ctx.problem.y % 4 ? '不是' : '是'}閏年）` : ''}`, ans: ctx => ctx.problem.days,
        wrong: (ctx, v) => (v === 30 || v === 31) && ctx.problem.mo !== 2 ? { obs: 'monthDays', msg: BIG.includes(ctx.problem.mo) ? `${ctx.problem.mo} 月是大月，有 31 天。` : `${ctx.problem.mo} 月是小月，有 30 天。` } : ctx.problem.mo === 2 ? { obs: 'monthDays', msg: '2 月不是 30 天：平常 28 天，閏年 29 天。' } : null,
        say: ex => `${ex.problem.mo} 月有 ${ex.problem.days} 天。` })
    ],
    reasons, done: ctx => `${ctx.problem.kind === 'week' ? '1 星期有 7 天' : '1 年有 12 個月'}；${ctx.problem.mo} 月有 ${ctx.problem.days} 天。`, chant: '大月 31 天、小月 30 天，2 月 28 天，四年一閏 29 天。', transfer: '想一想：你生日的那個月有幾天？'
  });

  // =============== 4-3 簡單算天數（不做間隔） ===============
  A.register('tmDays', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      if (level === 'easy') { const per = rnd(rand, 3, 5), w = rnd(rand, 2, 3); return { kind: 'week', per, w, a: per, total: per * w, dims: [per, w], prompt: `每星期上 ${per} 天游泳課，${w} 星期一共上幾天？` }; }
      if (level === 'challenge') { const w = rnd(rand, 2, 4), x = rnd(rand, 1, 6); return { kind: 'wd', w, x, a: 7 * w, total: 7 * w + x, dims: [w, x], prompt: `露營要 ${w} 星期又 ${x} 天，一共是幾天？` }; }
      const pairs = [[7, 8], [6, 7], [11, 12], [1, 2]], [m1, m2] = any(rand, pairs), y = 2026;
      return { kind: 'month', m1, m2, a: daysIn(y, m1), total: daysIn(y, m1) + daysIn(y, m2), dims: [m1, m2], prompt: `${y} 年 ${m1} 月和 ${m2} 月，一共有幾天？` };
    },
    planFigure: () => `<p class="fm-big">🗓️</p>`,
    steps: [
      nStep(0, { title: '先找一份有幾天', ask: '一個月（或一星期）有幾天？', id: 'a', aid: convAid, hints: ['先想第一個月（或一星期）有幾天。', '大月 31 天、小月 30 天、2 月 28 天。', '1 星期 7 天。'], think: '老師先找第一份有幾天。', together: '一起想：有幾天？', pre: prompt,
        label: ctx => ({ week: '每星期上幾天？', wd: '1 星期是幾天？那 ' + ctx.problem.w + ' 星期是幾天？', month: `${ctx.problem.m1} 月有幾天？` })[ctx.problem.kind], ans: ctx => ctx.problem.a,
        wrong: (ctx, v) => ctx.problem.kind === 'month' && (v === 30 || v === 31) ? { obs: 'monthDays', msg: `再想一想：${ctx.problem.m1} 月是大月還是小月？` } : null, say: ex => `先找到 ${ex.problem.a} 天。` }),
      nStep(1, { title: '一共幾天', ask: '全部加起來是幾天？', id: 't', hints: ['把每一份加起來。', '同樣的天數，可以用乘的。', '最後檢查單位是「天」。'], think: '老師把每一份的天數加起來。', together: '一起算：一共幾天？',
        label: () => '一共幾天？', ans: ctx => ctx.problem.total, wrong: (ctx, v) => ctx.problem.kind === 'month' && Math.abs(v - ctx.problem.total) === 1 ? { obs: 'monthDays', msg: '兩個月各是大月還是小月？再算一次。' } : null, say: ex => `一共 ${ex.problem.total} 天。` })
    ],
    reasons, done: ctx => `一共 ${ctx.problem.total} 天。`, chant: '算天數：先找一份有幾天，再全部加起來。', transfer: '想一想：暑假一共有幾天？'
  });

  // =============== 5-1 秒、分、時有多長 ===============
  const SENSE = [['眨一下眼睛', '秒', 1], ['洗手', '秒', 30], ['跳繩 10 下', '秒', 10], ['刷牙', '分', 3], ['吃午餐', '分', 30], ['一節課', '分', 40], ['下課', '分', 10], ['睡覺', '時', 9], ['在學校一天', '時', 7], ['看一部電影', '時', 2]];
  const UNITS3 = [['秒', '秒'], ['分', '分鐘'], ['時', '小時']];
  A.register('tmSense', {
    methods, makeProblem: (level, i, rand = Math.random) => { const list = U.shuffle(SENSE, rand), a = list[0], b = list.find(x => x[1] !== a[1]); return { a, b, dims: [SENSE.indexOf(a), SENSE.indexOf(b)], prompt: '想一想，這件事大約要多久？' }; },
    planFigure: ctx => clockSVG(12, 0, { sec: 15, hideHands: false, aria: '有秒針的時鐘' }),
    steps: [0, 1].map(k => cStep(k, { title: k ? '再想一件事' : '大約多久', ask: '用秒、分鐘，還是小時？', id: 'u' + k, fixed: true, hints: ['秒很短：眨眼、拍手。', '分鐘比較長：刷牙、一節課。', '小時很長：睡覺、在學校一天。'], think: '老師想一想自己做這件事的時候，大約多久。', together: '一起想：用哪一個單位？', pre: k ? null : prompt,
      figure: ctx => k ? '' : clockSVG(12, 0, { sec: 15, aria: '有秒針的時鐘：紅色的是秒針' }),
      q: ctx => `「${ctx.problem[k ? 'b' : 'a'][0]}」大約要 ${ctx.problem[k ? 'b' : 'a'][2]} 什麼？`, opts: () => UNITS3, ans: ctx => ctx.problem[k ? 'b' : 'a'][1],
      wrong: ctx => ({ obs: 'unitSense', msg: `想一想：${ctx.problem[k ? 'b' : 'a'][2]} ${UNITS3.find(x => x[0] === (ctx.answers['u' + k] || '秒'))[1]}，做「${ctx.problem[k ? 'b' : 'a'][0]}」合理嗎？` }),
      say: ex => `${ex.problem[k ? 'b' : 'a'][0]}大約 ${ex.problem[k ? 'b' : 'a'][2]} ${UNITS3.find(x => x[0] === ex.problem[k ? 'b' : 'a'][1])[1]}。` })),
    reasons, done: ctx => `${ctx.problem.a[0]}大約 ${ctx.problem.a[2]} ${UNITS3.find(x => x[0] === ctx.problem.a[1])[1]}；${ctx.problem.b[0]}大約 ${ctx.problem.b[2]} ${UNITS3.find(x => x[0] === ctx.problem.b[1])[1]}。`, chant: '秒很短，分鐘比較長，小時很長。', transfer: '想一想：你寫一頁作業大約要多久？'
  });

  // =============== 5-2 時和分 ===============
  A.register('tmHM', {
    methods, makeProblem: (level, i, rand = Math.random) => { const a = fromLevel({ easy: () => rnd(rand, 1, 2), standard: () => rnd(rand, 1, 3), challenge: () => rnd(rand, 2, 4) }, level)(), n = level === 'easy' ? 60 + 10 * rnd(rand, 1, 5) : rnd(rand, 61, level === 'challenge' ? 230 : 170);
      return { a, n, dims: [a, n], prompt: '1 時 ＝ 60 分。換算一下。' }; },
    planFigure: () => `<p class="fm-big">1 時 ＝ 60 分</p>`,
    steps: [
      nStep(0, { title: '時換成分', ask: '幾個 60 分？', id: 'm', aid: convAid, hints: ['1 時是 60 分。', '幾時就是幾個 60 分。', '時間是 60 進位，不是 100。'], think: '老師想：1 時是 60 分，幾時就是幾個 60。', together: '一起算：是幾分？', pre: prompt,
        label: ctx => `${ctx.problem.a} 時 ＝ □ 分`, ans: ctx => ctx.problem.a * 60, wrong: (ctx, v) => v === ctx.problem.a * 100 ? { obs: 'base100', msg: '1 時是 60 分，不是 100 分。' } : null, say: ex => `${ex.problem.a} 時是 ${ex.problem.a * 60} 分。` }),
      hmStep(1, { title: '分換成時和分', ask: '裡面有幾個 60？', id: 'hm', dur: false, aid: convAid, hints: ['先找裡面有幾個 60 分。', '每個 60 分換成 1 時。', '剩下不到 60 的，就是幾分。'],
        think: '老師把分鐘 60 個一組圈起來，一組就是 1 時。', together: '一起圈：幾時幾分？', figure: ctx => { const n = ctx.problem.n, full = Math.floor(n / 60); return lineSVG(0, n, { marks: [...Array.from({ length: full + 1 }, (_, k) => k * 60), n], fmt: t => `${t} 分`, jumps: shown(ctx, 1) ? [...Array.from({ length: full }, (_, k) => [k * 60, (k + 1) * 60, '1 時']), ...(n % 60 ? [[full * 60, n, `${n % 60} 分`]] : [])] : [], aria: '把分鐘 60 個一組' }); },
        label: ctx => `${ctx.problem.n} 分 ＝ □ 時 □ 分`, ans: ctx => [Math.floor(ctx.problem.n / 60), ctx.problem.n % 60],
        wrong: (ctx, [a, b]) => a === Math.floor(ctx.problem.n / 100) && b === ctx.problem.n % 100 ? { obs: 'base100', msg: '1 時是 60 分，要 60 個一組，不是 100 個一組。' } : null, say: ex => `${ex.problem.n} 分是 ${Math.floor(ex.problem.n / 60)} 時 ${ex.problem.n % 60} 分。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} 時 ＝ ${ctx.problem.a * 60} 分；${ctx.problem.n} 分 ＝ ${Math.floor(ctx.problem.n / 60)} 時 ${ctx.problem.n % 60} 分。`, chant: '1 時 ＝ 60 分，60 個一組換 1 時。', transfer: '想一想：一節課 40 分，兩節課是幾時幾分？'
  });

  // =============== 5-3 日和時、分和秒 ===============
  A.register('tmDS', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = fromLevel({ easy: 1, standard: rnd(rand, 1, 2), challenge: rnd(rand, 2, 3) }, level), s = level === 'easy' ? 60 + 10 * rnd(rand, 1, 5) : rnd(rand, 61, 150);
      return { d, s, dims: [d, s], prompt: '1 日 ＝ 24 時，1 分 ＝ 60 秒。' }; },
    planFigure: () => `<p class="fm-big">1 日 ＝ 24 時　1 分 ＝ 60 秒</p>`,
    steps: [
      nStep(0, { title: '日換成時', ask: '幾個 24 時？', id: 'h', aid: convAid, hints: ['1 日是 24 時。', '幾日就是幾個 24。', '用乘的或一直加 24。'], think: '老師想：1 日是 24 時。', together: '一起算：是幾時？', pre: prompt,
        label: ctx => `${ctx.problem.d} 日 ＝ □ 時`, ans: ctx => ctx.problem.d * 24, wrong: (ctx, v) => v === ctx.problem.d * 12 ? { msg: '1 日是 24 時（白天加晚上），不是 12 時。' } : v === ctx.problem.d * 60 || v === ctx.problem.d * 100 ? { obs: 'base100', msg: '1 日是 24 時。' } : null, say: ex => `${ex.problem.d} 日是 ${ex.problem.d * 24} 時。` }),
      hmStep(1, { title: '秒換成分和秒', ask: '裡面有幾個 60 秒？', id: 'ms', names: ['幾分', '幾秒'], aid: convAid, hints: ['1 分是 60 秒。', '60 秒一組，換成 1 分。', '剩下不到 60 的，就是幾秒。'], think: '老師把秒 60 個一組，一組是 1 分。', together: '一起圈：幾分幾秒？',
        label: ctx => `${ctx.problem.s} 秒 ＝ □ 分 □ 秒`, ans: ctx => [Math.floor(ctx.problem.s / 60), ctx.problem.s % 60],
        wrong: (ctx, [a, b]) => a === Math.floor(ctx.problem.s / 100) && b === ctx.problem.s % 100 ? { obs: 'base100', msg: '1 分是 60 秒，不是 100 秒。' } : null, say: ex => `${ex.problem.s} 秒是 ${Math.floor(ex.problem.s / 60)} 分 ${ex.problem.s % 60} 秒。` })
    ],
    reasons, done: ctx => `${ctx.problem.d} 日 ＝ ${ctx.problem.d * 24} 時；${ctx.problem.s} 秒 ＝ ${Math.floor(ctx.problem.s / 60)} 分 ${ctx.problem.s % 60} 秒。`, chant: '1 日 24 時，1 時 60 分，1 分 60 秒。', transfer: '想一想：你昨天睡了幾小時？'
  });
  // =============== 6-1 時刻還是時間量 ===============
  const PD = [['電影 2 時開始', 'p'], ['電影演了 2 小時', 'd'], ['8 時上第一節課', 'p'], ['一節課 40 分鐘', 'd'], ['跑步跑了 15 分鐘', 'd'], ['5 時 30 分放學回家', 'p'], ['午休 30 分鐘', 'd'], ['9 時睡覺', 'p'], ['寫功課寫了 1 小時', 'd'], ['公車 7 時 20 分開', 'p']];
  A.register('tmPointDur', {
    methods, makeProblem: (level, i, rand = Math.random) => { const l = U.shuffle(PD, rand), a = l[0], b = l.find(x => x[1] !== a[1]); return { a, b, dims: [PD.indexOf(a), PD.indexOf(b)], prompt: '這句話說的是「幾時幾分」（時刻），還是「多久」（時間量）？' }; },
    planFigure: () => `<p class="fm-big">⏰ 時刻　⏳ 時間量</p>`,
    steps: [0, 1].map(k => cStep(k, { title: k ? '再一句' : '是哪一種', ask: '說的是什麼時候，還是多久？', id: 'k' + k, fixed: true, hints: ['「幾時、幾時幾分」說的是什麼時候：時刻。', '「幾小時、幾分鐘」說的是多久：時間量。', '時鐘上看得到的是時刻；經過的長短是時間量。'], think: '老師看句子：說「什麼時候」是時刻，說「多久」是時間量。', together: '一起分：是哪一種？', pre: k ? null : prompt,
      q: ctx => `「${ctx.problem[k ? 'b' : 'a'][0]}」`, opts: () => [['p', '⏰ 時刻（什麼時候）'], ['d', '⏳ 時間量（多久）']], ans: ctx => ctx.problem[k ? 'b' : 'a'][1],
      wrong: () => ({ obs: 'pointVsDuration', msg: '看看句子裡的字：「幾時」是時刻，「幾小時、幾分鐘」是多久。' }), say: ex => `「${ex.problem[k ? 'b' : 'a'][0]}」說的是${ex.problem[k ? 'b' : 'a'][1] === 'p' ? '時刻' : '時間量'}。` })),
    reasons, done: ctx => `「${ctx.problem.a[0]}」是${ctx.problem.a[1] === 'p' ? '時刻' : '時間量'}，「${ctx.problem.b[0]}」是${ctx.problem.b[1] === 'p' ? '時刻' : '時間量'}。`, chant: '幾時幾分是時刻；幾小時幾分鐘是時間量。', transfer: '想一想：「下課 10 分鐘」是時刻還是時間量？'
  });

  // =============== 6-2 同單位加減 ===============
  const SAME = [['寫功課', '看書', 'add'], ['跑步', '走路', 'add'], ['看電視', '少看', 'sub'], ['練琴', '休息', 'add'], ['午休', '提早起來', 'sub']];
  A.register('tmSameUnit', {
    methods, makeProblem: (level, i, rand = Math.random) => { const c = SAME[(i + rnd(rand, 0, 4)) % SAME.length], step = level === 'easy' ? 5 : 1, a = step * rnd(rand, 20 / step, 50 / step), b = step * rnd(rand, 5 / step, Math.min(a - step, 30) / step);
      const unit = '分鐘', ans = c[2] === 'add' ? a + b : a - b;
      return { c, a, b, unit, ans, dims: [a, b], prompt: c[2] === 'add' ? `${c[0]} ${a} ${unit}，${c[1]} ${b} ${unit}，一共幾${unit}？` : `原本要${c[0]} ${a} ${unit}，${c[1]} ${b} ${unit}，實際${c[0]}幾${unit}？` }; },
    planFigure: () => `<p class="fm-big">⏳ ＋ ⏳</p>`,
    steps: [
      cStep(0, { title: '加還是減', ask: '要合起來，還是拿走？', id: 'op', fixed: true, hints: ['「一共」是合起來：用加的。', '「少、提早」是拿走：用減的。', '讀最後一句問什麼。'], think: '老師讀題目：一共用加的，少了用減的。', together: '一起想：加還是減？', pre: prompt,
        q: () => '要用加的還是減的？', opts: () => [['add', '＋ 加'], ['sub', '－ 減']], ans: ctx => ctx.problem.c[2], say: ex => ex.problem.c[2] === 'add' ? '用加的。' : '用減的。' }),
      nStep(1, { title: '算一算', ask: '同單位，直接加減', id: 'v', hints: ['單位一樣，直接加或減。', '個位對個位、十位對十位。', '算完再檢查。'], think: '老師把兩個數加起來（或減掉）。', together: '一起算：是多少？',
        label: ctx => `${ctx.problem.a} ${ctx.problem.c[2] === 'add' ? '＋' : '－'} ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.ans, say: ex => `${ex.problem.a} ${ex.problem.c[2] === 'add' ? '＋' : '－'} ${ex.problem.b} ＝ ${ex.problem.ans}。` }),
      cStep(2, { title: '單位', ask: '答案的單位是什麼？', id: 'unit', hints: ['看題目的單位。', '加減前後單位一樣。', '分鐘和秒不一樣。'], think: '老師看單位：題目用什麼單位，答案就用什麼單位。', together: '一起選：單位是什麼？',
        q: ctx => `答案「${ctx.problem.ans}」的單位是？`, opts: () => [['分鐘', '分鐘'], ['秒', '秒'], ['小時', '小時']], ans: ctx => ctx.problem.unit, wrong: () => ({ obs: 'unitSense', msg: '再看一次題目的單位。' }), say: ex => `單位是${ex.problem.unit}。` })
    ],
    reasons, done: ctx => `${ctx.problem.ans} ${ctx.problem.unit}。`, chant: '同單位的時間：直接加減，單位不變。', transfer: '想一想：你今天寫功課和看書一共多久？'
  });

  // =============== 6-3 時分加減（不進退位） ===============
  A.register('tmHMAdd', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      const kind = i % 2 ? 'point' : 'dur', h1 = rnd(rand, 1, 8), m1 = (level === 'easy' ? 5 : 1) * rnd(rand, 1, level === 'easy' ? 6 : 30), h2 = kind === 'point' ? 0 : rnd(rand, 1, 3);
      const m2 = (level === 'easy' ? 5 : 1) * rnd(rand, 1, Math.floor((59 - m1) / (level === 'easy' ? 5 : 1)));
      const ans = [h1 + h2, m1 + m2];
      return { kind, h1, m1, h2, m2, ans, dims: [h1, m1, h2, m2], prompt: kind === 'point' ? `電影 ${hmText(h1, m1)}開始，過了 ${m2} 分鐘，是幾時幾分？` : `坐車 ${h1} 小時 ${m1} 分鐘，再走路 ${h2} 小時 ${m2} 分鐘，一共是幾小時幾分鐘？` };
    },
    planFigure: () => `<p class="fm-big">時 ＋ 時，分 ＋ 分</p>`,
    steps: [
      nStep(0, { title: '分加分', ask: '先算分', id: 'mm', hints: ['先把分和分加起來。', '這一題加起來不會超過 60。', '分寫在分的地方。'], think: '老師先算分：分加分。', together: '一起加：幾分？', pre: prompt,
        label: ctx => `${ctx.problem.m1} ＋ ${ctx.problem.m2} ＝ ？（分）`, ans: ctx => ctx.problem.ans[1], say: ex => `${ex.problem.m1} ＋ ${ex.problem.m2} ＝ ${ex.problem.ans[1]} 分。` }),
      nStep(1, { title: '時加時', ask: '再算時', id: 'hh', hints: ['時和時加起來。', '只加了分鐘的話，時不變。', '時寫在時的地方。'], think: '老師再算時：時加時。', together: '一起加：幾時？',
        label: ctx => ctx.problem.kind === 'point' ? '過了幾分鐘，時有沒有變？是幾時？' : `${ctx.problem.h1} ＋ ${ctx.problem.h2} ＝ ？（小時）`, ans: ctx => ctx.problem.ans[0], say: ex => `是 ${ex.problem.ans[0]} ${ex.problem.kind === 'point' ? '時' : '小時'}。` }),
      cStep(2, { title: '時刻還是時間量', ask: '答案要怎麼說？', id: 'say', hints: ['開始的時刻，過了一段時間，答案還是時刻。', '兩段時間加起來，答案是時間量。', '時刻說「幾時幾分」；時間量說「幾小時幾分鐘」。'], think: '老師想：答案是什麼時候，還是多久？', together: '一起說：答案怎麼說？',
        q: () => '答案怎麼說？', opts: ctx => { const [h, m] = ctx.problem.ans; return [['p', `${h} 時 ${m} 分`], ['d', `${h} 小時 ${m} 分鐘`]]; }, ans: ctx => ctx.problem.kind === 'point' ? 'p' : 'd',
        wrong: () => ({ obs: 'pointVsDuration', msg: '問「是幾時幾分」答時刻；問「一共多久」答時間量。' }), say: ex => ex.problem.kind === 'point' ? `${ex.problem.ans[0]} 時 ${ex.problem.ans[1]} 分。` : `${ex.problem.ans[0]} 小時 ${ex.problem.ans[1]} 分鐘。` })
    ],
    reasons, done: ctx => ctx.problem.kind === 'point' ? `是 ${ctx.problem.ans[0]} 時 ${ctx.problem.ans[1]} 分。` : `一共 ${ctx.problem.ans[0]} 小時 ${ctx.problem.ans[1]} 分鐘。`, chant: '時分加減：分對分、時對時。', transfer: '想一想：8 時 10 分出門，走 20 分鐘，幾時幾分到學校？'
  });

  // =============== 7-1 電子鐘和指針鐘 ===============
  A.register('tmDigital', {
    methods, makeProblem: (level, i, rand = Math.random) => { const h = rnd(rand, 1, 11), m = level === 'easy' ? 5 * rnd(rand, 1, 11) : rnd(rand, 1, 59), pm = i % 2 === 1, g = rnd(rand, 1, 11), gm = 5 * rnd(rand, 1, 11);
      return { h, m, pm, g, gm, dims: [h, m, g, gm], prompt: '電子鐘和指針鐘都可以看時間。' }; },
    planFigure: ctx => digiHtml(ctx.problem.h, ctx.problem.m),
    steps: [
      hmStep(0, { title: '讀電子鐘', ask: '冒號前面是時，後面是分', id: 'rd', hints: ['「:」前面是時。', '「:」後面是分。', '前面的 0 不用唸，例如 08 唸 8。'], think: '老師看冒號：前面是時，後面是分。', together: '一起讀：幾時幾分？', pre: prompt,
        figure: ctx => digiHtml(ctx.problem.h, ctx.problem.m), label: ctx => `電子鐘 ${digital(ctx.problem.h, ctx.problem.m)} 是幾時幾分？`, ans: ctx => [ctx.problem.h, ctx.problem.m],
        wrong: (ctx, [a, b]) => a === ctx.problem.m && b === ctx.problem.h ? { obs: 'handSwap', msg: '冒號前面是時，後面是分。' } : null, say: ex => `${digital(ex.problem.h, ex.problem.m)} 是 ${hmText(ex.problem.h, ex.problem.m)}。` }),
      cStep(1, { title: '配一配', ask: '指針鐘配哪一個電子鐘？', id: 'match', aid: fiveAid, hints: ['先讀指針鐘：短針讀時，長針五個一數讀分。', '再找一樣的電子鐘。', '小心時和分不要弄反。'], think: '老師先讀指針鐘，再找一樣的電子鐘。', together: '一起配：哪一個？',
        figure: ctx => clockSVG(ctx.problem.g, ctx.problem.gm), q: () => '這個時鐘的時間，電子鐘怎麼寫？', opts: ctx => { const { g, gm } = ctx.problem; return uniq([['ok', digital(g, gm)], ['next', digital((g % 12) + 1, gm)], ['num', digital(g, gm / 5)]]); }, ans: () => 'ok',
        wrong: (ctx, a) => a === 'next' ? { obs: 'hourNext', msg: '時針還沒走到下一個數字。' } : { obs: 'minuteAsNumber', msg: '長針指的數字要五個一數。' }, say: ex => `${hmText(ex.problem.g, ex.problem.gm)}，寫成 ${digital(ex.problem.g, ex.problem.gm)}。` })
    ],
    reasons, done: ctx => `${digital(ctx.problem.h, ctx.problem.m)} 是 ${hmText(ctx.problem.h, ctx.problem.m)}；時鐘是 ${digital(ctx.problem.g, ctx.problem.gm)}。`, chant: '電子鐘：冒號前面是時，後面是分。', transfer: '想一想：手機上的時間現在是幾時幾分？'
  });

  // =============== 7-2 12 時制和 24 時制 ===============
  A.register('tm24', {
    methods, makeProblem: (level, i, rand = Math.random) => { const h = rnd(rand, 1, 11), m = level === 'easy' ? 0 : 5 * rnd(rand, 0, 11), pm = level === 'easy' ? true : i % 3 !== 2;
      const h2 = rnd(rand, 13, 23), m2 = level === 'easy' ? 0 : 5 * rnd(rand, 0, 11);
      return { h, m, pm, h2, m2, dims: [h, m, h2, m2], prompt: '24 時制：下午和晚上的時刻加 12；反過來減 12。' }; },
    planFigure: () => `<p class="fm-big">下午 3 時 ＝ 15 時</p>`,
    steps: [
      hmStep(0, { title: '12 時制換 24 時制', ask: '上午不變，下午和晚上加 12', id: 'to', hints: ['先看是上午，還是下午、晚上。', '上午的時刻不變。', '下午、晚上的時要加 12。'], think: '老師先看上午還是下午：下午、晚上要加 12。', together: '一起換：24 時制是幾時？', pre: prompt,
        label: ctx => `${ctx.problem.pm ? (ctx.problem.h >= 6 ? '晚上' : '下午') : '上午'} ${hmText(ctx.problem.h, ctx.problem.m)}，用 24 時制是幾時幾分？`, ans: ctx => [ctx.problem.h + (ctx.problem.pm ? 12 : 0), ctx.problem.m],
        wrong: (ctx, [a]) => ctx.problem.pm && a === ctx.problem.h ? { obs: 'plus12', msg: '下午、晚上的時刻要加 12。' } : !ctx.problem.pm && a === ctx.problem.h + 12 ? { obs: 'plus12', msg: '上午的時刻不用加 12。' } : null,
        say: ex => `是 ${ex.problem.h + (ex.problem.pm ? 12 : 0)} 時 ${ex.problem.m} 分，寫成 ${digital(ex.problem.h + (ex.problem.pm ? 12 : 0), ex.problem.m)}。` }),
      cStep(1, { title: '24 時制換 12 時制', ask: '超過 12，減 12', id: 'back', hints: ['24 時制超過 12，就是下午或晚上。', '時減 12。', '18 時以後通常說晚上。'], think: '老師看：超過 12，是下午或晚上，再減 12。', together: '一起換：是下午還是晚上的幾時？',
        figure: ctx => digiHtml(ctx.problem.h2, ctx.problem.m2), q: ctx => `${digital(ctx.problem.h2, ctx.problem.m2)} 是什麼時候？`,
        opts: ctx => { const { h2, m2 } = ctx.problem, p = periodOf(h2), other = p === '晚上' ? '下午' : '晚上'; return uniq([['ok', `${p} ${hmText(h2 - 12, m2)}`], ['am', `上午 ${hmText(h2 - 12, m2)}`], ['raw', `${other} ${hmText(h2 - 10, m2)}`]]); }, ans: () => 'ok',
        wrong: (ctx, a) => ({ obs: 'plus12', msg: a === 'am' ? `超過 12 時是下午或晚上，不是上午。` : '時要減 12，不是減 10。' }), say: ex => `${digital(ex.problem.h2, ex.problem.m2)} 是${periodOf(ex.problem.h2)} ${hmText(ex.problem.h2 - 12, ex.problem.m2)}。` })
    ],
    reasons, done: ctx => `${ctx.problem.pm ? '下午、晚上加 12' : '上午不變'}；${digital(ctx.problem.h2, ctx.problem.m2)} 是${say12(toMin(ctx.problem.h2, ctx.problem.m2))}。`, chant: '24 時制：下午、晚上加 12；超過 12 減 12。', transfer: '想一想：火車票上寫 17:45，是下午還是晚上？'
  });
})();

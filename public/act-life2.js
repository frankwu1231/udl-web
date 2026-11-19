'use strict';
// 第 34 版：各教材包的跨領域生活單元（二）：折線圖單元 6「生活小觀察家」、因數與倍數單元 8「分組分裝小幫手」。
// 步驟工具在 act-life.js（window.lifeFig）；折線圖的圖在 act-line.js（window.lineFig）；因數倍數的圖在 act-factor.js（window.factorFig）。
// 跨領域代碼依 Codex 查證：自然 INd-Ⅱ-7、健體 4a-Ⅱ-2／Aa-Ⅱ-1、特生L-sP-4、社會 Ad-Ⅱ-2、綜合 2b-Ⅲ-1、特生K-sP-5、特生4-sP-4。
// 四年級只讀折線圖（D-4-1）；6-5 身高圖有波浪線，放五年級版。資料都是虛構的練習資料。
(() => {
  const A = window.areaActs, U = A.util, { esc } = U, L = window.lifeFig, F = window.lineFig, M = window.factorFig;
  const { rnd, any, lv, nStep, cStep, prompt, shown, methods, reasons, ceilDiv, packWrong, enoughOpts, enoughAns } = L;

  // ---------- 折線圖 ----------
  const WEEK = F.WEEK, MONTHS = F.MONTHS;
  function chart(o) {
    const top = Math.max(...o.v), rows = Math.max(4, Math.ceil((top + (o.room || 0) - o.min) / (o.step * o.every)) * o.every);
    return { title: o.title, xName: o.xName, yName: o.yName, unit: o.unit, xs: o.xs, full: o.full || o.xs, series: [{ name: o.title, v: o.v }], min: o.min, step: o.step, rows, every: o.every, brk: !!o.brk, half: false };
  }
  const fig = (ctx, o = {}) => F.chartSVG(ctx.problem.ch, o);
  const dayName = (p, i) => p.ch.full[i];
  const dayOpts = (p, from = 0) => p.ch.xs.map((x, i) => [String(i), p.ch.full[i]]).slice(from);

  // =============== 6-3 看氣溫決定穿什麼（核心：生活決策五步） ===============
  const COLD = 20;
  function makeWeather(level, i, rand = Math.random) {
    const step = lv(level, { easy: 5, standard: 2, challenge: 2 }), n = lv(level, { easy: 5, standard: 7, challenge: 7 }), lo = 12, hi = 30;
    let v, t;
    for (let k = 0; k < 300; k++) {
      v = Array.from({ length: n }, () => step * rnd(rand, Math.ceil(lo / step), Math.floor(hi / step)));
      t = rnd(rand, 1, n - 2);
      if (v[t] !== COLD && v[t + 1] !== v[t] && v.some(x => x < COLD) && v.some(x => x > COLD)) break;
    }
    const ch = chart({ title: '下週每天的最高氣溫', xName: '星期', yName: '氣溫', unit: '度', xs: WEEK.slice(0, n), full: WEEK.slice(0, n).map(x => '星期' + x), v, min: 0, step, every: step === 2 ? 5 : 1, room: step });
    const c = any(rand, ['校外教學', '運動會', '去公園']);
    return { ch, t, v: v[t], next: v[t + 1], cold: v[t] < COLD, c, dims: [n, step, ...v], prompt: `看下週的天氣預報（最高氣溫）。星期${WEEK[t]}要${c}。老師說：最高氣溫比 ${COLD} 度低，要帶外套。` };
  }
  A.register('lnWeather', {
    methods: [['mark', '🧥 生活決策五步'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeWeather, planFigure: ctx => fig(ctx),
    steps: [
      cStep(0, { title: '看懂這張圖', ask: '這張圖在說什麼？', id: 'what', fixed: true, hints: ['看圖上面的標題。', '看縱軸寫的是什麼、單位是什麼。', '縱軸是氣溫，橫軸是星期幾。'],
        think: '老師先看標題和兩個軸：這是每天的最高氣溫。', together: '一起看：這張圖在說什麼？', pre: prompt, figure: ctx => fig(ctx),
        q: () => '這張折線圖在說什麼？', opts: () => [['temp', '每天的最高氣溫'], ['rain', '每天的下雨量'], ['sleep', '每天睡覺的時數']], ans: () => 'temp',
        wrong: () => ({ msg: '看標題和縱軸的名稱。' }), say: () => '這是每天的最高氣溫。' }),
      nStep(1, { title: '讀出那天的氣溫', ask: `那一天是幾度？`, id: 'v', hints: ['先在橫軸找到那一天。', '往上找到點，再往左看縱軸。', '看清楚一格是多少度。'],
        think: '老師在橫軸找到那一天，往上找到點，再往左讀縱軸。', together: '一起讀：那天幾度？', figure: ctx => fig(ctx, { guideX: shown(ctx, 1) ? ctx.problem.t : null, guideY: ctx.checked(1) ? [ctx.problem.t, 0] : null }),
        label: ctx => `星期${WEEK[ctx.problem.t]}的最高氣溫是幾度？`, ans: ctx => ctx.problem.v,
        wrong: (ctx, v) => { const p = ctx.problem; return v === (p.v - p.ch.min) / p.ch.step ? { obs: 'scaleAsOne', msg: `一格是 ${p.ch.step} 度，不是 1 度。` } : v === p.ch.series[0].v[p.t - 1] || v === p.next ? { obs: 'misalign', msg: '看錯天了。先在橫軸找到那一天。' } : null; },
        say: ex => `星期${WEEK[ex.problem.t]}是 ${ex.problem.v} 度。` }),
      cStep(2, { title: '和規則比一比', ask: `比 ${COLD} 度高還是低？`, id: 'cmp', fixed: true, hints: [`老師的規則：比 ${COLD} 度低要帶外套。`, `把那天的氣溫和 ${COLD} 比。`, '數字小的比較冷。'],
        think: `老師把那天的氣溫和 ${COLD} 度比一比。`, together: '一起比：高還是低？',
        q: ctx => `${ctx.problem.v} 度比 ${COLD} 度高，還是低？`, opts: () => [['low', `比 ${COLD} 度低`], ['high', `比 ${COLD} 度高`]], ans: ctx => ctx.problem.cold ? 'low' : 'high',
        wrong: () => ({ msg: '比一比兩個數，哪一個大？' }), say: ex => ex.problem.cold ? `比 ${COLD} 度低。` : `比 ${COLD} 度高。` }),
      cStep(3, { title: '做決定', ask: '要帶外套嗎？', id: 'coat', fixed: true, hints: ['照老師的規則決定。', `比 ${COLD} 度低：帶外套。`, `比 ${COLD} 度高：可以不帶。`],
        think: '老師照規則決定要不要帶外套。', together: '一起決定：帶不帶外套？',
        q: ctx => `星期${WEEK[ctx.problem.t]}${ctx.problem.c}，要帶外套嗎？`, opts: () => [['coat', '要帶外套'], ['no', '不用帶外套']], ans: ctx => ctx.problem.cold ? 'coat' : 'no',
        wrong: () => ({ msg: '再看一次規則和那天的氣溫。' }), say: ex => ex.problem.cold ? '要帶外套。' : '不用帶外套。' }),
      cStep(4, { title: '看變化', ask: '隔天會變冷還是變熱？', id: 'trend', fixed: true, hints: ['看那一天到隔天的線。', '線往上：變高；線往下：變低。', '也可以比兩天的數字。'],
        think: '老師看那一天到隔天的線：往上是變熱，往下是變冷。', together: '一起看：隔天變熱還是變冷？', figure: ctx => fig(ctx, { seg: ctx.problem.t }),
        q: ctx => `從星期${WEEK[ctx.problem.t]}到星期${WEEK[ctx.problem.t + 1]}，氣溫怎麼變？`, opts: () => [['up', '變高（變熱）'], ['down', '變低（變冷）']], ans: ctx => ctx.problem.next > ctx.problem.v ? 'up' : 'down',
        wrong: () => ({ obs: 'trendSwap', msg: '線往上是變高，往下是變低。' }), say: ex => ex.problem.next > ex.problem.v ? '隔天變熱。' : '隔天變冷。' })
    ],
    reasons, done: ctx => `星期${WEEK[ctx.problem.t]} ${ctx.problem.v} 度，${ctx.problem.cold ? '要帶外套' : '不用帶外套'}。`, chant: '看氣溫做決定：看懂圖、讀數值、和規則比、做決定、看變化。', transfer: '想一想：明天的天氣預報幾度？你要穿什麼？'
  });

  // =============== 6-4 我的睡眠和喝水 ===============
  const HEALTH = [{ key: 'sleep', title: '小明每天睡覺的時數', yName: '時數', unit: '小時', goal: 9, lo: 6, hi: 10, what: '睡覺', act: [['early', '早一點上床睡覺'], ['late', '晚一點再睡'], ['none', '不用改']] },
    { key: 'water', title: '小安每天喝水的杯數', yName: '杯數', unit: '杯', goal: 6, lo: 2, hi: 9, what: '喝水', act: [['early', '下課時多喝一杯水'], ['late', '改喝飲料'], ['none', '不用改']] }];
  function makeHealth(level, i, rand = Math.random) {
    const c = HEALTH[(i + rnd(rand, 0, 1)) % 2], n = lv(level, { easy: 5, standard: 7, challenge: 7 });
    let v; for (let k = 0; k < 300; k++) { v = Array.from({ length: n }, () => rnd(rand, c.lo, c.hi)); const m = Math.min(...v); if (v.filter(x => x === m).length === 1 && m < c.goal && v.some(x => x >= c.goal)) break; }
    const ch = chart({ title: c.title, xName: '星期', yName: c.yName, unit: c.unit, xs: WEEK.slice(0, n), full: WEEK.slice(0, n).map(x => '星期' + x), v, min: 0, step: 1, every: 2, room: 1 });
    const minV = Math.min(...v), at = v.indexOf(minV);
    return { c, ch, n, below: v.filter(x => x < c.goal).length, minV, at, gap: c.goal - minV, dims: [c.key, ...v], prompt: `${c.title.replace('每天', '這幾天每天')}畫成折線圖。健康的目標是每天${c.what}至少 ${c.goal} ${c.unit}。` };
  }
  A.register('lnHealth', {
    methods, makeProblem: makeHealth, planFigure: ctx => fig(ctx),
    steps: [
      nStep(0, { title: '幾天不夠', ask: '有幾天比目標少？', id: 'below', hints: ['先看題目：目標是多少？', '在縱軸找到目標的數，想像畫一條橫線。', '點在橫線下面的，就是不夠的天。'],
        think: '老師在目標的高度想像一條橫線，數一數有幾個點在下面。', together: '一起數：幾天不夠？', pre: prompt, figure: ctx => fig(ctx),
        label: ctx => `有幾天${ctx.problem.c.what}比 ${ctx.problem.c.goal} ${ctx.problem.c.unit}少？`, ans: ctx => ctx.problem.below,
        wrong: (ctx, v) => v === ctx.problem.n - ctx.problem.below ? { msg: '這是夠的天數。要數比目標少的。' } : null, say: ex => `有 ${ex.problem.below} 天不夠。` }),
      cStep(1, { title: '哪一天最少', ask: '最低的點是哪一天？', id: 'at', fixed: true, hints: ['找最低的點。', '最低的點往下看橫軸。', '那一天就是最少的。'],
        think: '老師找最低的點，再往下看是哪一天。', together: '一起找：哪一天最少？', figure: ctx => fig(ctx, { mark: shown(ctx, 1) ? [[ctx.problem.at, 0]] : [] }),
        q: () => '哪一天最少？', opts: ctx => dayOpts(ctx.problem), ans: ctx => String(ctx.problem.at),
        wrong: (ctx, a) => ctx.problem.ch.series[0].v[Number(a)] === Math.max(...ctx.problem.ch.series[0].v) ? { obs: 'maxMin', msg: '這是最高的點。要找最低的。' } : { msg: '找最低的那一個點。' }, say: ex => `${dayName(ex.problem, ex.problem.at)}最少。` }),
      nStep(2, { title: '差多少', ask: '那一天差目標多少？', id: 'gap', hints: ['先讀出那一天的數。', '目標 － 那一天的數。', '差多少就是還要補多少。'],
        think: '老師讀出那一天的數，再算和目標差多少。', together: '一起算：差多少？',
        label: ctx => `${dayName(ctx.problem, ctx.problem.at)}比目標少幾${ctx.problem.c.unit}？`, ans: ctx => ctx.problem.gap,
        wrong: (ctx, v) => v === ctx.problem.minV ? { msg: '這是那一天的數。還要和目標比，算差多少。' } : null, say: ex => `${ex.problem.c.goal} － ${ex.problem.minV} ＝ ${ex.problem.gap}。` }),
      cStep(3, { title: '訂小目標', ask: '明天可以怎麼做？', id: 'plan', fixed: true, hints: ['這幾天有不夠的時候。', '想一個做得到的小改變。', '小目標要讓數字往上。'],
        think: '老師訂一個做得到的小目標，讓明天達到目標。', together: '一起想：明天怎麼做？',
        q: ctx => `想讓明天${ctx.problem.c.what}達到目標，可以怎麼做？`, opts: ctx => ctx.problem.c.act, ans: () => 'early',
        wrong: () => ({ msg: '有幾天不夠，要想辦法讓數字變多。' }), say: ex => `${ex.problem.c.act[0][1]}。` })
    ],
    reasons, done: ctx => `有 ${ctx.problem.below} 天不夠，${dayName(ctx.problem, ctx.problem.at)}最少，差 ${ctx.problem.gap} ${ctx.problem.c.unit}。`, chant: '看自己的紀錄：找不夠的天、找最少的、算差多少、訂小目標。', transfer: '想一想：記錄自己一週的睡覺時數，畫成折線圖看看。'
  });

  // =============== 6-5 我長高了嗎（五年級，波浪線） ===============
  const YEARS = ['一年級', '二年級', '三年級', '四年級', '五年級'];
  function makeGrow(level, i, rand = Math.random) {
    const step = lv(level, { easy: 5, standard: 2, challenge: 1 }), n = 5;
    let v, gs;
    for (let k = 0; k < 300; k++) {
      v = [step * rnd(rand, Math.ceil(110 / step), Math.floor(120 / step))];
      for (let j = 1; j < n; j++) v.push(v[j - 1] + step * rnd(rand, ...lv(level, { easy: [1, 2], standard: [2, 4], challenge: [4, 8] })));
      gs = v.slice(1).map((x, j) => x - v[j]); const m = Math.max(...gs);
      if (gs.filter(g => g === m).length === 1) break;
    }
    const ch = chart({ title: '小傑每年健康檢查的身高', xName: '年級', yName: '身高', unit: '公分', xs: YEARS, v, min: 100, step, every: step === 5 ? 1 : step === 2 ? 5 : 5, brk: true, room: step });
    const k = rnd(rand, 1, n - 1), j = rnd(rand, 0, n - 2), best = gs.indexOf(Math.max(...gs));
    return { ch, v, k, j, grow: gs[j], best, dims: [step, ...v], prompt: '小傑每年健康檢查都量身高，畫成折線圖。縱軸下面有波浪線。' };
  }
  A.register('lnGrow', {
    methods, makeProblem: makeGrow, planFigure: ctx => fig(ctx),
    steps: [
      cStep(0, { title: '波浪線', ask: '波浪線是什麼意思？', id: 'brk', fixed: true, hints: ['看縱軸最下面：0 的上面有一段波浪線。', '看波浪線上面的第一個數是多少。', '比一比：從 0 到那個數的距離，和上面每一格一樣嗎？'],
        think: '老師看到波浪線：0 到 100 中間省略了，圖才不會太高。', together: '一起想：波浪線是什麼意思？', pre: prompt, figure: ctx => fig(ctx),
        q: () => '縱軸的波浪線是什麼意思？', opts: () => [['omit', '0 到 100 中間省略了'], ['zero', '小傑的身高是 0'], ['wrong', '圖畫錯了']], ans: () => 'omit',
        wrong: () => ({ obs: 'ignoreBreak', msg: '波浪線表示中間省略，不是身高是 0。' }), say: () => '0 到 100 中間省略了。' }),
      nStep(1, { title: '讀出身高', ask: '那一年身高幾公分？', id: 'h', hints: ['在橫軸找到那一年。', '往上找到點，往左看縱軸。', '看清楚一格是幾公分。'],
        think: '老師找到那一年，往上找點，再往左讀。', together: '一起讀：身高幾公分？', figure: ctx => fig(ctx, { guideX: shown(ctx, 1) ? ctx.problem.k : null }),
        label: ctx => `${YEARS[ctx.problem.k]}的身高是幾公分？`, ans: ctx => ctx.problem.v[ctx.problem.k],
        wrong: (ctx, v) => { const p = ctx.problem; return v === p.v[p.k] - 100 ? { obs: 'ignoreBreak', msg: '縱軸從 100 開始，不是從 0 開始。' } : p.ch.step > 1 && v === (p.v[p.k] - 100) / p.ch.step ? { obs: 'scaleAsOne', msg: `一格是 ${p.ch.step} 公分，而且從 100 開始。` } : null; }, say: ex => `${YEARS[ex.problem.k]} ${ex.problem.v[ex.problem.k]} 公分。` }),
      nStep(2, { title: '長高多少', ask: '一年長高幾公分？', id: 'g', hints: ['讀出兩年的身高。', '後一年 － 前一年。', '差多少就是長高多少。'],
        think: '老師讀出兩年的身高，相減就是長高多少。', together: '一起算：長高幾公分？', figure: ctx => fig(ctx, { seg: ctx.problem.j }),
        label: ctx => `從${YEARS[ctx.problem.j]}到${YEARS[ctx.problem.j + 1]}，長高幾公分？`, ans: ctx => ctx.problem.grow,
        wrong: (ctx, v) => v === ctx.problem.grow / ctx.problem.ch.step && ctx.problem.ch.step > 1 ? { obs: 'scaleAsOne', msg: `這是幾格。一格是 ${ctx.problem.ch.step} 公分。` } : null, say: ex => `長高 ${ex.problem.grow} 公分。` }),
      cStep(3, { title: '哪一年長最多', ask: '哪一段線最陡？', id: 'best', fixed: true, hints: ['看哪一段線往上最陡。', '也可以把每一年長高的算出來比。', '最陡的那一段，長最多。'],
        think: '老師看哪一段線往上最陡，那一段長最多。', together: '一起找：哪一年長最多？',
        q: () => '哪一段時間長高最多？', opts: () => YEARS.slice(0, -1).map((y, j) => [String(j), `${y}到${YEARS[j + 1]}`]), ans: ctx => String(ctx.problem.best),
        wrong: () => ({ msg: '看哪一段線最陡，或算算每一段長高多少。' }), say: ex => `${YEARS[ex.problem.best]}到${YEARS[ex.problem.best + 1]}長最多。` })
    ],
    reasons, done: ctx => `${YEARS[ctx.problem.best]}到${YEARS[ctx.problem.best + 1]}長最多。`, chant: '看身高圖：先看波浪線，再讀數值，算長高多少，找最陡的一段。', transfer: '想一想：問問家人你每年長高多少，畫成折線圖。'
  });

  // =============== 6-6 存錢圖 ===============
  function makeMoney(level, i, rand = Math.random) {
    const n = lv(level, { easy: 4, standard: 5, challenge: 6 }), start = rnd(rand, 0, 12 - n);
    let v, down;
    for (let k = 0; k < 300; k++) {
      v = [10 * rnd(rand, 2, 4)]; down = rnd(rand, 2, n - 1);
      for (let j = 1; j < n; j++) v.push(v[j - 1] + (j === down ? -10 * rnd(rand, 1, 2) : 10 * rnd(rand, 1, 3)));
      if (Math.max(...v) <= 150 && v[n - 1] > v[0]) break;
    }
    const last = v[n - 1], goal = last + 10 * rnd(rand, 1, 4);
    const ch = chart({ title: '小華存錢筒裡的錢', xName: '月份', yName: '金額', unit: '元', xs: MONTHS.slice(start, start + n), v, min: 0, step: 10, every: last > 80 ? 2 : 1, room: 10 });
    const thing = any(rand, ['一本故事書', '一盒彩色筆', '一顆球', '一個鉛筆盒']);
    return { ch, v, n, down, last, goal, thing, dims: [n, ...v, goal], prompt: `小華每個月記下存錢筒裡有多少錢，畫成折線圖。他想買${thing}，要 ${goal} 元。` };
  }
  A.register('lnMoney', {
    methods, makeProblem: makeMoney, planFigure: ctx => fig(ctx),
    steps: [
      nStep(0, { title: '現在有多少', ask: '最後一個月有幾元？', id: 'last', hints: ['最後一個月在最右邊。', '往上找到點，往左看縱軸。', '看清楚一格是幾元。'],
        think: '老師看最右邊的點，讀出現在有多少錢。', together: '一起讀：現在有幾元？', pre: prompt, figure: ctx => fig(ctx, { guideY: shown(ctx, 0) ? [ctx.problem.n - 1, 0] : null }),
        label: ctx => `${ctx.problem.ch.xs[ctx.problem.n - 1]}存錢筒裡有幾元？`, ans: ctx => ctx.problem.last,
        wrong: (ctx, v) => v === ctx.problem.last / 10 ? { obs: 'scaleAsOne', msg: '一格是 10 元，不是 1 元。' } : null, say: ex => `現在有 ${ex.problem.last} 元。` }),
      cStep(1, { title: '哪個月變少', ask: '線往下的是哪個月？', id: 'down', fixed: true, hints: ['錢變少，線會往下。', '找往下的那一段。', '那一段的右邊那個月，錢變少了。'],
        think: '老師找線往下的那一段，那個月錢變少了，可能是買了東西。', together: '一起找：哪個月變少？', figure: ctx => fig(ctx, { seg: shown(ctx, 1) ? ctx.problem.down - 1 : null }),
        q: () => '哪一個月存錢筒的錢比上個月少？', opts: ctx => ctx.problem.ch.xs.map((x, j) => [String(j), x]).slice(1), ans: ctx => String(ctx.problem.down),
        wrong: () => ({ obs: 'trendSwap', msg: '錢變少，線往下。找往下的那一段。' }), say: ex => `${ex.problem.ch.xs[ex.problem.down]}變少了。` }),
      nStep(2, { title: '還差多少', ask: '夠買嗎？差幾元？', id: 'gap', hints: ['想買的東西要多少錢？', '要的錢 － 現在有的錢。', '差多少就是還要存多少。'],
        think: '老師算：要的錢減掉現在有的錢。', together: '一起算：還差幾元？',
        label: ctx => `買${ctx.problem.thing}還差幾元？`, ans: ctx => ctx.problem.goal - ctx.problem.last,
        wrong: (ctx, v) => v === ctx.problem.goal + ctx.problem.last ? { msg: '要用減的：要的錢 － 現在有的錢。' } : null, say: ex => `${ex.problem.goal} － ${ex.problem.last} ＝ ${ex.problem.goal - ex.problem.last} 元。` }),
      cStep(3, { title: '做決定', ask: '現在可以買嗎？', id: 'plan', fixed: true, hints: ['錢還不夠。', '不夠的時候不要借錢買。', '繼續存，存夠再買。'],
        think: '老師決定：錢還不夠，繼續存，存夠了再買。', together: '一起決定：怎麼做？',
        q: () => '小華現在應該怎麼做？', opts: () => [['save', '繼續存錢，存夠再買'], ['buy', '現在就買'], ['borrow', '跟同學借錢來買']], ans: () => 'save',
        wrong: () => ({ msg: '錢還不夠，也不要借錢。先存夠再買。' }), say: () => '繼續存錢，存夠再買。' })
    ],
    reasons, done: ctx => `現在 ${ctx.problem.last} 元，還差 ${ctx.problem.goal - ctx.problem.last} 元，繼續存。`, chant: '看存錢圖：讀現在有多少、找變少的月、算還差多少、存夠再買。', transfer: '想一想：你想買什麼？每個月可以存多少？'
  });

  // ---------- 因數與倍數 ----------
  const { capOf, factorsOf, gcd, lcm, numGrid, bindPick, pickCheck, countLine, timesAid, jumpSVG, arraySVG, pileSVG, shareSVG, GPAIRS, KIND_OPTS } = M;
  const toolOpts = [['f', '因數：剛好分完、沒有剩'], ['m', '倍數：一包一包、一直加上去']];
  // 點數字表的一步
  const pickStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.key], hints: o.hints, think: o.think, together: o.together, figure: o.figure,
    answer: ctx => `${timesAid(ctx)}<p data-read data-say>${esc(o.q(ctx))}</p>${numGrid(o.top(ctx), { pick: o.key, sel: ctx.state[o.key], a: o.a ? o.a(ctx) : [], b: o.b ? o.b(ctx) : [], hint: ctx.hint(n) >= 3 ? o.want(ctx) : [] })}${countLine(ctx, o.key)}`,
    bind: bindPick(n, o.key),
    check: ctx => pickCheck(ctx.state[o.key] || [], o.want(ctx), { code: o.key, ...(o.opts ? o.opts(ctx) : {}) }),
    solve: ctx => { ctx.state[o.key] = o.want(ctx).slice(); ctx.answers[o.key] = o.want(ctx).join(','); }, say: o.say });

  // =============== 8-1 分組一樣多 ===============
  function makeGroup(level, i, rand = Math.random) {
    const n = any(rand, lv(level, { easy: [12, 16, 18, 20, 24], standard: [24, 28, 30, 32, 36], challenge: [36, 40, 42, 45, 48] })), fs = factorsOf(n);
    const k = any(rand, fs.filter(d => d > 1 && d < n && n / d >= 2)), r = any(rand, [2, 3, 4, 5, 6, 7, 8, 9].filter(d => n % d));
    return { n, fs, k, r, dims: [n, k, r], prompt: `班上有 ${n} 人。體育課要分組，每組人數一樣多，沒有人落單。可以分成幾組？` };
  }
  A.register('fmGroup', {
    methods, makeProblem: makeGroup, planFigure: ctx => pileSVG(ctx.problem.n, `${ctx.problem.n} 個人`),
    steps: [
      cStep(0, { title: '要用什麼想', ask: '每組一樣多、沒有人落單', id: 'tool', fixed: true, hints: ['分組就是把人平分。', '分成幾組，每組一樣多。', '分完以後，有沒有剩下的人？'],
        think: '老師想：分組要剛好分完，沒有人落單，要找因數。', together: '一起想：用因數還是倍數？', pre: prompt, figure: ctx => pileSVG(ctx.problem.n, `${ctx.problem.n} 個人`),
        q: () => '要找人數的什麼？', opts: () => toolOpts, ans: () => 'f', wrong: () => ({ obs: 'swapFM', msg: '分組是平分，要剛好分完：找因數。' }), say: () => '找因數。' }),
      pickStep(1, { key: 'fs', title: '找出全部的分法', ask: '可以分成幾組？', hints: ['從 1 開始試：能不能剛好分完？', '找到一個，它的好朋友也要選。', '1 組和每人一組也算，可是上課不太會這樣分。'],
        think: '老師把人數的因數全部找出來，每一個都是一種分法。', together: '一起找：可以分成幾組？',
        q: ctx => `點出 ${ctx.problem.n} 的全部因數（可以分成的組數）。`, top: ctx => ctx.problem.n, want: ctx => ctx.problem.fs, opts: ctx => ({ n: ctx.problem.n, extraMsg: x => `${x.join('、')} 組分不完，會有人落單。` }),
        say: ex => `${ex.problem.n} 的因數：${ex.problem.fs.join('、')}。` }),
      nStep(2, { title: '每組幾人', ask: '選一種分法', id: 'each', hints: ['人數 ÷ 組數。', '每組一樣多。', '可以用九九乘法表想。'],
        think: '老師選一種分法，算每組幾人。', together: '一起算：每組幾人？', figure: ctx => shown(ctx, 2) ? shareSVG(ctx.problem.n, ctx.problem.k, { aria: `${ctx.problem.n} 人分成 ${ctx.problem.k} 組` }) : '',
        label: ctx => `分成 ${ctx.problem.k} 組，每組幾人？`, ans: ctx => ctx.problem.n / ctx.problem.k, say: ex => `${ex.problem.n} ÷ ${ex.problem.k} ＝ ${ex.problem.n / ex.problem.k} 人。` }),
      cStep(3, { title: '檢查', ask: '不是因數會怎樣？', id: 'r', fixed: true, hints: ['試試看：人數 ÷ 這個組數。', '有餘數就是有人落單。', '不是因數就分不完。'],
        think: '老師檢查：不是因數的組數，分完會有剩，有人落單。', together: '一起想：會怎樣？', figure: ctx => shown(ctx, 3) ? shareSVG(ctx.problem.n, ctx.problem.r) : '',
        q: ctx => `如果分成 ${ctx.problem.r} 組，每組一樣多，會怎樣？`, opts: () => [['left', '會有人落單（有剩）'], ['zero', '剛好分完']], ans: () => 'left',
        wrong: ctx => ({ obs: 'remainderOK', msg: `${ctx.problem.n} ÷ ${ctx.problem.r} 有餘數，會有人落單。` }), say: ex => `${ex.problem.r} 組會有人落單。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} 人可以分成 ${ctx.problem.fs.join('、')} 組。`, chant: '分組一樣多：找人數的因數，有剩就是有人落單。', transfer: '想一想：你們班有幾人？可以分成幾組？'
  });

  // =============== 8-2 一包幾個要買幾包（核心：生活決策五步） ===============
  const PACK = [['小餅乾', '片'], ['養樂多', '瓶'], ['鉛筆', '枝'], ['氣球', '個'], ['貼紙', '張']];
  function makePack(level, i, rand = Math.random) {
    const cap = capOf(level), c = PACK[(i + rnd(rand, 0, 4)) % PACK.length];
    let k, n;
    for (let t = 0; t < 300; t++) {
      k = any(rand, lv(level, { easy: [3, 4, 5, 6], standard: [4, 5, 6, 8], challenge: [6, 8, 10, 12] }));
      n = rnd(rand, Math.max(k + 1, Math.floor(cap / 3)), cap - k);
      if (ceilDiv(n, k) * k <= cap && (n % k !== 0) === (i % 3 !== 0)) break;
    }
    const packs = ceilDiv(n, k), top = packs * k;
    return { c, k, n, packs, top, extra: top - n, dims: [n, k], prompt: `班上要辦活動，${n} 人每人一${c[1]}${c[0]}。${c[0]}一包有 ${k} ${c[1]}，只能整包買。至少要買幾包？` };
  }
  A.register('fmPack', {
    methods: [['mark', '🛒 生活決策五步'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makePack, planFigure: ctx => pileSVG(ctx.problem.n, `${ctx.problem.n} 人`),
    steps: [
      cStep(0, { title: '要做什麼', ask: '要買到怎樣才夠？', id: 'goal', fixed: true, hints: ['每個人都要拿到。', '買的要「夠」，可以多，不能少。', '只能整包買。'],
        think: '老師讀題目：每人都要有，買的要夠，只能整包買。', together: '一起想：要做什麼？', pre: prompt, figure: ctx => pileSVG(ctx.problem.n, `${ctx.problem.n} 人`),
        q: () => '這一題要做什麼？', opts: ctx => [['enough', `買到夠 ${ctx.problem.n} 人每人一${ctx.problem.c[1]}`], ['one', '只買一包'], ['each', '每人買一包']], ans: () => 'enough',
        wrong: () => ({ msg: '每人一個就夠了，要買到夠全班。' }), say: () => '要買到夠每人一個。' }),
      cStep(1, { title: '用什麼想', ask: '一包一包加上去', id: 'tool', fixed: true, hints: ['買 1 包、2 包、3 包……一共有幾個？', '一包一包加上去，是倍數。', '找一包幾個的倍數。'],
        think: '老師想：一包一包加上去，是一包幾個的倍數。', together: '一起想：因數還是倍數？',
        q: ctx => `買 1 包、2 包、3 包……的個數，是 ${ctx.problem.k} 的什麼？`, opts: () => toolOpts, ans: () => 'm', wrong: () => ({ obs: 'swapFM', msg: '一包一包加上去，是倍數。' }), say: ex => `是 ${ex.problem.k} 的倍數。` }),
      nStep(2, { title: '選方法', ask: '第一個夠的倍數是幾？', id: 'top', hints: ['從小到大列出倍數。', '找第一個不比人數少的。', '比人數少的還不夠。'],
        think: '老師一個一個列倍數，找第一個不比人數少的。', together: '一起找：第一個夠的是幾？',
        figure: ctx => numGrid(Math.min(capOf(ctx.level), ctx.problem.top + ctx.problem.k), { a: shown(ctx, 2) ? Array.from({ length: Math.floor(Math.min(capOf(ctx.level), ctx.problem.top + ctx.problem.k) / ctx.problem.k) }, (_, j) => (j + 1) * ctx.problem.k) : [], b: [ctx.problem.n], aria: `數字表，${ctx.problem.n} 是人數` }),
        label: ctx => `${ctx.problem.k} 的倍數裡，第一個不比 ${ctx.problem.n} 少的是幾？`, ans: ctx => ctx.problem.top,
        wrong: (ctx, v) => ctx.problem.n % ctx.problem.k && v === ctx.problem.top - ctx.problem.k ? { obs: 'roundDown', msg: `${v} 比 ${ctx.problem.n} 少，不夠。再多一包。` } : v === ctx.problem.n && ctx.problem.n % ctx.problem.k ? { msg: `${ctx.problem.n} 不是 ${ctx.problem.k} 的倍數，買不到剛好。` } : null,
        say: ex => `第一個夠的是 ${ex.problem.top}。` }),
      nStep(3, { title: '算出來', ask: '要買幾包？', id: 'packs', hints: ['第一個夠的倍數 ÷ 一包幾個。', '也可以用人數 ÷ 一包幾個，有剩就多一包。', '只能整包買。'],
        think: '老師算：第一個夠的倍數是幾包。', together: '一起算：買幾包？',
        label: () => '至少要買幾包？', ans: ctx => ctx.problem.packs, wrong: (ctx, v) => packWrong(ctx.problem.n, ctx.problem.k)(ctx, v), say: ex => `買 ${ex.problem.packs} 包。` }),
      cStep(4, { title: '檢查、做決定', ask: '買的夠不夠？', id: 'enough', fixed: true, hints: ['買的包數 × 一包幾個。', '和人數比一比。', '多出來的可以留著下次用。'],
        think: '老師檢查：買的一共幾個，和人數比。', together: '一起檢查：夠不夠？',
        q: ctx => `買 ${ctx.problem.packs} 包，一共 ${ctx.problem.top} ${ctx.problem.c[1]}，${ctx.problem.n} 人夠不夠？`, opts: () => enoughOpts, ans: ctx => enoughAns(ctx.problem.top, ctx.problem.n),
        wrong: () => ({ msg: '比一比：買的個數和人數。' }), say: ex => ex.problem.extra ? `夠，多 ${ex.problem.extra} ${ex.problem.c[1]}。` : '剛好夠。' })
    ],
    reasons, done: ctx => `買 ${ctx.problem.packs} 包，一共 ${ctx.problem.top} ${ctx.problem.c[1]}${ctx.problem.extra ? `，多 ${ctx.problem.extra} ${ctx.problem.c[1]}` : '，剛好'}。`, chant: '生活決策五步：看情境、找出要算什麼、選方法、算出來、檢查再決定。', transfer: '想一想：下次幫班上買東西，你會怎麼算要買幾包？'
  });

  // =============== 8-3 分裝禮物袋 ===============
  const BAGS = [{ what: '園遊會的福袋', a: '糖果', ua: '顆', b: '餅乾', ub: '塊' }, { what: '班級慶生的點心袋', a: '蘋果', ua: '個', b: '橘子', ub: '個' }, { what: '運動會的補給袋', a: '瓶裝水', ua: '瓶', b: '香蕉', ub: '根' }];
  function makeBags(level, i, rand = Math.random) {
    const [x, y] = any(rand, GPAIRS[level] || GPAIRS.standard), c = BAGS[(i + rnd(rand, 0, 2)) % BAGS.length], g = gcd(x, y);
    const both = factorsOf(x).filter(d => y % d === 0);
    return { x, y, g, both, c, dims: [x, y], prompt: `做${c.what}：有 ${x} ${c.ua}${c.a}、${y} ${c.ub}${c.b}，要全部分完，每袋的${c.a}一樣多、${c.b}也一樣多。最多可以做幾袋？` };
  }
  A.register('fmBags', {
    methods, makeProblem: makeBags, planFigure: ctx => `${pileSVG(ctx.problem.x, `${ctx.problem.x} ${ctx.problem.c.ua}${ctx.problem.c.a}`)}${pileSVG(ctx.problem.y, `${ctx.problem.y} ${ctx.problem.c.ub}${ctx.problem.c.b}`).replace(/fm-tile/g, 'fm-tile b')}`,
    steps: [
      cStep(0, { title: '看情境', ask: '是平分，還是再碰在一起？', id: 'kind', fixed: true, hints: ['東西要「全部分完」嗎？', '平分、分完、最多 → 公因數。', '再一起、最少 → 公倍數。'],
        think: '老師讀題目：全部分完、最多幾袋，是平分，要找公因數。', together: '一起讀：這題在問什麼？', pre: prompt, figure: ctx => A.get('fmBags').planFigure(ctx),
        q: () => '這一題是哪一種？', opts: () => KIND_OPTS, ans: () => 'gcd', wrong: () => ({ obs: 'gcdLcmSwap', msg: '題目說「全部分完、最多」，是平分。' }), say: () => '是平分，找公因數。' }),
      pickStep(1, { key: 'both', title: '找公因數', ask: '兩種都能剛好分完的袋數', hints: ['袋數要讓兩種東西都剛好分完。', '先想第一個數的因數，再看第二個數能不能分完。', '兩邊都分得完的，就是公因數。'],
        think: '老師找兩種東西都能剛好分完的袋數。', together: '一起找：可以做幾袋？',
        q: ctx => `點出 ${ctx.problem.x} 和 ${ctx.problem.y} 的公因數（兩種都能剛好分完的袋數）。`, top: ctx => Math.min(ctx.problem.x, ctx.problem.y), want: ctx => ctx.problem.both,
        opts: () => ({ extraObs: 'other', extraMsg: x => `${x.join('、')} 袋會有一種分不完。`, missMsg: '還有兩種都分得完的袋數沒選到。' }), say: ex => `公因數：${ex.problem.both.join('、')}。` }),
      nStep(2, { title: '最多幾袋', ask: '要最多的', id: 'g', hints: ['題目要「最多」幾袋。', '從公因數裡選最大的。', '最大公因數。'],
        think: '老師從公因數裡選最大的。', together: '一起選：最多幾袋？',
        label: () => '最多可以做幾袋？', ans: ctx => ctx.problem.g,
        wrong: (ctx, v) => ctx.problem.both.includes(v) ? { obs: 'pickWrongEnd', msg: '要「最多」幾袋，選最大的公因數。' } : null, say: ex => `最多 ${ex.problem.g} 袋。` }),
      nStep(3, { title: '每袋幾個', ask: `第一種東西每袋幾個？`, id: 'ea', hints: ['第一種東西的數量 ÷ 袋數。', '每袋一樣多。', '可以乘回去檢查。'],
        think: '老師算每袋有幾個第一種東西。', together: '一起算：每袋幾個？', figure: ctx => shown(ctx, 3) ? shareSVG(ctx.problem.x, ctx.problem.g) : '',
        label: ctx => `每袋有幾${ctx.problem.c.ua}${ctx.problem.c.a}？`, ans: ctx => ctx.problem.x / ctx.problem.g, say: ex => `${ex.problem.x} ÷ ${ex.problem.g} ＝ ${ex.problem.x / ex.problem.g}。` }),
      nStep(4, { title: '檢查', ask: '第二種東西每袋幾個？', id: 'eb', hints: ['第二種東西的數量 ÷ 袋數。', '要剛好分完。', '有剩就是袋數選錯了。'],
        think: '老師再算第二種東西，檢查也剛好分完。', together: '一起檢查：每袋幾個？', figure: ctx => shown(ctx, 4) ? shareSVG(ctx.problem.y, ctx.problem.g, { color: 'b' }) : '',
        label: ctx => `每袋有幾${ctx.problem.c.ub}${ctx.problem.c.b}？`, ans: ctx => ctx.problem.y / ctx.problem.g, say: ex => `${ex.problem.y} ÷ ${ex.problem.g} ＝ ${ex.problem.y / ex.problem.g}。` })
    ],
    reasons, done: ctx => `最多 ${ctx.problem.g} 袋，每袋 ${ctx.problem.x / ctx.problem.g} ${ctx.problem.c.ua}${ctx.problem.c.a}、${ctx.problem.y / ctx.problem.g} ${ctx.problem.c.ub}${ctx.problem.c.b}。`, chant: '分裝：全部分完、最多幾袋，找最大公因數。', transfer: '想一想：班上辦活動，有什麼東西要分裝？'
  });

  // =============== 8-4 值日輪流：哪天又碰在一起 ===============
  const DUTY = { easy: [[2, 3], [3, 4], [2, 5], [4, 6], [3, 6]], standard: [[4, 6], [6, 8], [4, 10], [6, 9], [3, 8]], challenge: [[6, 8], [8, 12], [6, 9], [4, 10], [10, 12]] };
  function makeDuty(level, i, rand = Math.random) {
    let a, b, Lc; do { [a, b] = any(rand, DUTY[level] || DUTY.standard); Lc = lcm(a, b); } while (Lc > Math.min(30, capOf(level)) - 3);
    if (rand() < 0.5) [a, b] = [b, a];
    const mo = any(rand, [3, 4, 5, 9, 10, 11]), d = rnd(rand, 1, Math.min(30, capOf(level)) - Lc);   // 日期也不超過等級上限（入門 24）
    return { a, b, L: Lc, mo, d, dims: [a, b], prompt: `小安每 ${a} 天整理一次班級書架，小樂每 ${b} 天盤點一次文具。今天是 ${mo} 月 ${d} 日，兩個人都做了。最少再過幾天，兩個人又在同一天做？` };
  }
  A.register('fmDuty', {
    methods, makeProblem: makeDuty, planFigure: ctx => jumpSVG(ctx.problem.a, ctx.problem.b, Math.max(ctx.problem.L + Math.min(ctx.problem.a, ctx.problem.b), 12), { aName: '書架', bName: '文具', hideJumps: true }),
    steps: [
      cStep(0, { title: '看情境', ask: '是平分，還是再碰在一起？', id: 'kind', fixed: true, hints: ['兩個人每隔幾天做一次。', '要等到「又在同一天」。', '再一起、最少 → 公倍數。'],
        think: '老師讀題目：要等到兩個人又在同一天，是公倍數。', together: '一起讀：這題在問什麼？', pre: prompt, figure: ctx => A.get('fmDuty').planFigure(ctx),
        q: () => '這一題是哪一種？', opts: () => KIND_OPTS, ans: () => 'lcm', wrong: () => ({ obs: 'gcdLcmSwap', msg: '題目說「又在同一天」，是再碰在一起。' }), say: () => '是再碰在一起，找公倍數。' }),
      nStep(1, { title: '再過幾天', ask: '最小公倍數是幾？', id: 'L', hints: ['列出兩個數的倍數。', '圈出兩邊都有的。', '最少：選最小的那一個。'],
        think: '老師列出兩個數的倍數，找最小的公倍數。', together: '一起找：再過幾天？',
        figure: ctx => jumpSVG(ctx.problem.a, ctx.problem.b, Math.max(ctx.problem.L + Math.min(ctx.problem.a, ctx.problem.b), 12), { aName: '書架', bName: '文具', common: shown(ctx, 1) && ctx.checked(1) }),
        label: () => '最少再過幾天？', ans: ctx => ctx.problem.L,
        wrong: (ctx, v) => v === ctx.problem.a * ctx.problem.b && v !== ctx.problem.L ? { obs: 'lcmProduct', msg: '兩個數相乘是公倍數，可是不一定最小。' } : v % ctx.problem.a === 0 && v % ctx.problem.b === 0 ? { obs: 'pickWrongEnd', msg: '這是公倍數，可是不是最小的。' } : null, say: ex => `再過 ${ex.problem.L} 天。` }),
      nStep(2, { title: '那天是幾日', ask: '寫進值日表', id: 'day', hints: ['今天的日期加上再過的天數。', '同一個月，日期直接加。', '算完看看有沒有超過這個月。'],
        think: '老師把今天的日期加上再過的天數。', together: '一起算：那天是幾日？',
        label: ctx => `今天是 ${ctx.problem.mo} 月 ${ctx.problem.d} 日。那天是 ${ctx.problem.mo} 月幾日？`, ans: ctx => ctx.problem.d + ctx.problem.L, say: ex => `${ex.problem.mo} 月 ${ex.problem.d + ex.problem.L} 日。` }),
      nStep(3, { title: '檢查', ask: '小安又整理了幾次？', id: 'times', hints: ['再過的天數 ÷ 小安每幾天一次。', '要剛好整除。', '整除了，那天就真的會碰在一起。'],
        think: '老師檢查：再過的天數能被兩個數整除，那天兩個人都會做。', together: '一起檢查：小安整理了幾次？',
        label: () => '到那天，小安又整理了幾次書架？', ans: ctx => ctx.problem.L / ctx.problem.a, say: ex => `${ex.problem.L} ÷ ${ex.problem.a} ＝ ${ex.problem.L / ex.problem.a} 次。` })
    ],
    reasons, done: ctx => `最少再過 ${ctx.problem.L} 天，${ctx.problem.mo} 月 ${ctx.problem.d + ctx.problem.L} 日。`, chant: '值日輪流：又在同一天，找最小公倍數，再寫進日曆。', transfer: '想一想：你們班的值日生，多久輪一次？'
  });

  // =============== 8-5 桌子排成長方形 ===============
  function makeDesk(level, i, rand = Math.random) {
    const n = any(rand, lv(level, { easy: [12, 16, 18, 20], standard: [24, 30, 36, 40], challenge: [48, 60, 72] })), fs = factorsOf(n);
    const c = any(rand, fs.filter(d => d > 1 && d < n && d <= 10));
    return { n, fs, ways: fs.length - 2, c, dims: [n, c], prompt: `教室有 ${n} 張桌子，要排成長方形：每排一樣多，至少 2 排，每排至少 2 張。可以怎麼排？` };
  }
  A.register('fmDesk', {
    methods, makeProblem: makeDesk, planFigure: ctx => pileSVG(ctx.problem.n, `${ctx.problem.n} 張桌子`),
    steps: [
      cStep(0, { title: '要用什麼想', ask: '每排一樣多', id: 'tool', fixed: true, hints: ['排成長方形：每排一樣多、沒有多出來。', '剛好排完，是因數。', '排數 × 每排張數 ＝ 全部。'],
        think: '老師想：每排一樣多、剛好排完，要找因數。', together: '一起想：用因數還是倍數？', pre: prompt, figure: ctx => pileSVG(ctx.problem.n, `${ctx.problem.n} 張桌子`),
        q: () => '要找桌子張數的什麼？', opts: () => toolOpts, ans: () => 'f', wrong: () => ({ obs: 'swapFM', msg: '排成長方形要剛好排完：找因數。' }), say: () => '找因數。' }),
      pickStep(1, { key: 'fs', title: '找出全部的因數', ask: '可以排幾排？', hints: ['從 1 開始試。', '找到一個，它的好朋友也要選。', '1 和它自己也要選。'],
        think: '老師把張數的因數全部找出來。', together: '一起找：有哪些因數？',
        q: ctx => `點出 ${ctx.problem.n} 的全部因數。`, top: ctx => ctx.problem.n, want: ctx => ctx.problem.fs, opts: ctx => ({ n: ctx.problem.n }), say: ex => `${ex.problem.n} 的因數：${ex.problem.fs.join('、')}。` }),
      nStep(2, { title: '有幾種排法', ask: '至少 2 排、每排至少 2 張', id: 'ways', hints: ['排成 1 排不算，每排 1 張也不算。', '把因數的 1 和它自己拿掉。', '3 排 4 張和 4 排 3 張，算兩種。'],
        think: '老師把 1 和它自己拿掉，剩下的每一個因數就是一種排法。', together: '一起數：有幾種排法？',
        label: () => '可以排成幾種？（3 排 4 張和 4 排 3 張算兩種）', ans: ctx => ctx.problem.ways,
        wrong: (ctx, v) => v === ctx.problem.fs.length ? { msg: '排成 1 排、每排 1 張都不算，要拿掉。' } : v === Math.ceil(ctx.problem.ways / 2) || v === Math.floor(ctx.problem.ways / 2) ? { msg: '3 排 4 張和 4 排 3 張算兩種。' } : null, say: ex => `可以排成 ${ex.problem.ways} 種。` }),
      nStep(3, { title: '做決定', ask: '老師要每排幾張', id: 'rows', hints: ['全部的張數 ÷ 每排張數。', '要剛好排完。', '可以畫圖檢查。'],
        think: '老師算：照每排的張數，要排幾排。', together: '一起算：排幾排？', figure: ctx => shown(ctx, 3) ? arraySVG(ctx.problem.n / ctx.problem.c, ctx.problem.c, { aria: `${ctx.problem.n / ctx.problem.c} 排，每排 ${ctx.problem.c} 張` }) : '',
        label: ctx => `老師說每排放 ${ctx.problem.c} 張，要排幾排？`, ans: ctx => ctx.problem.n / ctx.problem.c, say: ex => `${ex.problem.n} ÷ ${ex.problem.c} ＝ ${ex.problem.n / ex.problem.c} 排。` })
    ],
    reasons, done: ctx => `可以排成 ${ctx.problem.ways} 種；每排 ${ctx.problem.c} 張要排 ${ctx.problem.n / ctx.problem.c} 排。`, chant: '排成長方形：找因數，拿掉 1 和自己，就是能排的樣子。', transfer: '想一想：教室的桌子現在排成幾排？每排幾張？'
  });
})();

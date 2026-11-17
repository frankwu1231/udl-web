'use strict';
// 第 31 版：因數與倍數教材包的其他 16 個活動（單元 0、1-1、1-2、2、3-1、4-1、5-1、6、7）。圖形和計算在 act-factor.js（window.factorFig）。
(() => {
  const A = window.areaActs, U = A.util, { esc, num, fieldHtml, shuffle } = U, F = window.factorFig;
  const { capOf, rnd, any, factorsOf, gcd, lcm, isPrime, multiplesTo, common, arraySVG, pileSVG, shareSVG, jumpSVG, numGrid, bindPick, countLine, pickCheck, timesAid, yesNo, fracHtml, ladderHtml, GPAIRS, LPAIRS, GCTX, LCTX, makeCommon, KIND_OPTS } = F;
  const methods = [['mark', '🧱 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['look', '先看圖'], ['div', '用除法算一算'], ['hint', '看提示']];
  const fromLevel = (o, level) => o[level] || o.standard;

  // 填數字的一步：o.label(ctx)、o.ans(ctx)、o.wrong(ctx, v) → {obs, msg}
  const nStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? timesAid(ctx) : ''}${fieldHtml(ctx, o.id, o.label(ctx), n)}`,
    check: ctx => { const v = num(ctx.answers[o.id]); if (v === null) return { code: o.id, msg: '把數填進去。' }; if (v === o.ans(ctx)) return null;
      const w = o.wrong ? o.wrong(ctx, v) : null; return { code: o.id, obs: (w && w.obs) || 'other', msg: (w && w.msg) || o.retry || '再算一次。' }; },
    solve: ctx => { ctx.answers[o.id] = String(o.ans(ctx)); }, say: o.say });
  // 選一個的一步：o.q(ctx)、o.opts(ctx)、o.ans(ctx)、o.wrong(ctx, a) → {obs, msg}
  const cStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? timesAid(ctx) : ''}${ctx.choice(o.id, o.q(ctx), o.opts(ctx), o.fixed)}`,
    check: ctx => { const a = ctx.answers[o.id]; if (!a) return { code: o.id, msg: '先選一個答案。' }; if (a === o.ans(ctx)) return null;
      const w = o.wrong ? o.wrong(ctx, a) : null; return { code: o.id, obs: (w && w.obs) || 'wrongChoice', msg: (w && w.msg) || o.retry || '再想一想。' }; },
    solve: ctx => { ctx.answers[o.id] = o.ans(ctx); }, say: o.say });
  const YN = [['yes', '是'], ['no', '不是']];
  const divHints = ['用除法算一算。', '看餘數是不是 0。', '餘數是 0，就是剛好分完。'];
  const shown = (ctx, n) => ctx.hint(n) >= 2 || ctx.checked(n);

  // =============== 0-1 乘法表找一找（先測） ===============
  const TIMES = { easy: [2, 5], standard: [2, 9], challenge: [3, 9] };
  A.register('fmTimes', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel(TIMES, level), r = () => rnd(rand, lo, hi);
      const cap = capOf(level); let a, b, c, d; do { a = r(); b = r(); } while (a * b > cap); do { c = r(); d = r(); } while (c === d || c * d > cap);
      return { a, b, c, d, n1: a * b, n2: c * d, dims: [a, b], prompt: '用乘法表想一想，□ 是多少？' }; },
    planFigure: ctx => arraySVG(ctx.problem.a, ctx.problem.b),
    steps: [
      nStep(0, { title: '□ 在後面', ask: '幾乘以幾會等於它？', id: 't1', aid: true, hints: ['想一想乘法表的那一排。', `把前面的數一直加，加到答案。`, '幾個一數，數到答案的時候，數了幾次？'],
        think: '老師用乘法表：在那一排找到答案。', together: '一起想：□ 是多少？', figure: ctx => shown(ctx, 0) ? arraySVG(ctx.problem.a, ctx.problem.b) : '',
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, label: ctx => `${ctx.problem.a} × □ ＝ ${ctx.problem.n1}`, ans: ctx => ctx.problem.b,
        say: ex => `${ex.problem.a} × ${ex.problem.b} ＝ ${ex.problem.n1}。` }),
      nStep(1, { title: '□ 在前面', ask: '我用乘法表對了嗎？', id: 't2', aid: true, hints: ['□ 在前面也一樣：幾乘以後面的數？', '交換也可以：後面的數 × □。', '在乘法表找到答案，看是哪一排。'],
        think: '老師把它換成後面的數乘以 □，再找乘法表。', together: '一起想：□ 是多少？', figure: ctx => shown(ctx, 1) ? arraySVG(ctx.problem.c, ctx.problem.d) : '',
        label: ctx => `□ × ${ctx.problem.d} ＝ ${ctx.problem.n2}`, ans: ctx => ctx.problem.c, say: ex => `${ex.problem.c} × ${ex.problem.d} ＝ ${ex.problem.n2}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} × ${ctx.problem.b} ＝ ${ctx.problem.n1}，${ctx.problem.c} × ${ctx.problem.d} ＝ ${ctx.problem.n2}。`, chant: '知道答案找乘數：在乘法表裡找。', transfer: '想一想：12 可以是幾乘以幾？'
  });

  // =============== 0-2 平分有沒有剩（先測） ===============
  const SHARE = { easy: [2, 5, 20], standard: [2, 9, 50], challenge: [3, 9, 90] };
  A.register('fmShare', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi, max] = fromLevel(SHARE, level), k = rnd(rand, lo, hi);
      let t; do t = rnd(rand, k + 1, max); while ((i % 2 === 0) !== (t % k === 0) || t / k > 10);
      return { t, k, q: Math.floor(t / k), r: t % k, dims: [t, k], prompt: `有 ${t} 顆糖，平分給 ${k} 個人。` }; },
    planFigure: ctx => pileSVG(ctx.problem.t),
    steps: [
      nStep(0, { title: '每人幾顆', ask: '每個人一樣多嗎？', id: 'q', aid: true, hints: ['一個人一個人輪流發。', `用除法：糖的數量 ÷ 人數。`, '想乘法表：人數 × 幾，最接近糖的數量又不超過？'],
        think: '老師一個一個輪流發，看每人拿到幾顆。', together: '一起分：每人幾顆？', figure: ctx => shown(ctx, 0) ? shareSVG(ctx.problem.t, ctx.problem.k) : pileSVG(ctx.problem.t),
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, label: () => '每人分到幾顆？', ans: ctx => ctx.problem.q,
        wrong: (ctx, v) => v * ctx.problem.k > ctx.problem.t ? { msg: `每人 ${v} 顆，${ctx.problem.k} 個人要 ${v * ctx.problem.k} 顆，糖不夠。` } : { msg: '還可以再多發一輪嗎？' }, say: ex => `每人 ${ex.problem.q} 顆。` }),
      nStep(1, { title: '剩幾顆', ask: '剩下的還夠再發一輪嗎？', id: 'r', hints: ['發完以後，看旁邊剩幾顆。', `糖的數量 － 人數 × 每人的顆數。`, '剩下的一定比人數少。'],
        think: '老師看旁邊剩下的糖。', together: '一起看：剩幾顆？', figure: ctx => shareSVG(ctx.problem.t, ctx.problem.k),
        label: () => '剩下幾顆？（沒有剩就填 0）', ans: ctx => ctx.problem.r, wrong: (ctx, v) => v >= ctx.problem.k ? { msg: '剩下的比人數多，還可以再發一輪。' } : null, say: ex => `剩 ${ex.problem.r} 顆。` }),
      cStep(2, { title: '剛好分完嗎', ask: '剩 0 才是剛好分完嗎？', id: 'ok', fixed: true, hints: ['看上一步：剩幾顆？', '剩 0 顆，才是剛好分完。', '有剩，就不是剛好分完。'],
        think: '老師看剩下幾顆：0 顆就是剛好分完。', together: '一起判斷：剛好分完嗎？',
        q: ctx => `${ctx.problem.t} 顆平分給 ${ctx.problem.k} 人，剛好分完嗎？`, opts: () => [['zero', '剛好分完，沒有剩'], ['left', '有剩']], ans: ctx => ctx.problem.r ? 'left' : 'zero',
        wrong: (ctx, a) => a === 'zero' ? { obs: 'remainderOK', msg: `還剩 ${ctx.problem.r} 顆，不是剛好分完。` } : { msg: '沒有剩下，是剛好分完。' }, say: ex => ex.problem.r ? `剩 ${ex.problem.r} 顆，沒有剛好分完。` : '剩 0 顆，剛好分完。' })
    ],
    reasons, done: ctx => `每人 ${ctx.problem.q} 顆，${ctx.problem.r ? `剩 ${ctx.problem.r} 顆` : '剛好分完'}。`, chant: '平分：一輪一輪發，剩 0 才是剛好分完。', transfer: '想一想：全班分組，每組一樣多，會不會有人多出來？'
  });

  // =============== 1-1 排排看 ===============
  const ARR = { easy: [6, 8, 10, 12, 15, 16, 18, 20], standard: [24, 30, 36, 40, 42, 48], challenge: [54, 60, 64, 72, 84, 90] };
  A.register('fmArray', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel(ARR, level)), mid = factorsOf(n).filter(d => d > 1 && d < n && n / d <= 12);
      const r1 = any(rand, mid), r2 = any(rand, mid.filter(d => d !== r1));
      const k = any(rand, [2, 3, 4, 5, 6, 7, 8, 9].filter(d => n % d && d < n));
      return { n, r1, r2, k, dims: [n, r1, r2], prompt: `把 ${n} 個方塊排成長方形，每一排一樣多。` }; },
    planFigure: ctx => pileSVG(ctx.problem.n),
    steps: [
      nStep(0, { title: '排排看', ask: '每一排一樣多嗎？', id: 'c1', aid: true, hints: ['一排一排放，每排一樣多。', '方塊的數量 ÷ 排數。', '想乘法表：排數 × 幾 ＝ 方塊的數量？'],
        think: '老師把方塊排成幾排，每排一樣多。', together: '一起排：每排幾個？', figure: ctx => shown(ctx, 0) ? arraySVG(ctx.problem.r1, ctx.problem.n / ctx.problem.r1) : pileSVG(ctx.problem.n),
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, label: ctx => `排成 ${ctx.problem.r1} 排，每排幾個？`, ans: ctx => ctx.problem.n / ctx.problem.r1, say: ex => `${ex.problem.r1} 排，每排 ${ex.problem.n / ex.problem.r1} 個。` }),
      nStep(1, { title: '換一種排法', ask: '還有別的排法嗎？', id: 'c2', aid: true, hints: ['換一個排數試試看。', '方塊的數量 ÷ 排數。', '想乘法表：排數 × 幾 ＝ 方塊的數量？'],
        think: '老師換一種排法，再排一次。', together: '一起排：這次每排幾個？', figure: ctx => shown(ctx, 1) ? arraySVG(ctx.problem.r2, ctx.problem.n / ctx.problem.r2) : pileSVG(ctx.problem.n),
        label: ctx => `排成 ${ctx.problem.r2} 排，每排幾個？`, ans: ctx => ctx.problem.n / ctx.problem.r2, say: ex => `${ex.problem.r2} 排，每排 ${ex.problem.n / ex.problem.r2} 個。` }),
      cStep(2, { title: '排不出來', ask: '最後一排有沒有少？', id: 'k', fixed: true, aid: true, hints: divHints, think: '老師試試看：排到最後一排，數量不夠，就是排不出來。', together: '一起試：排得出來嗎？',
        figure: ctx => { const p = ctx.problem; return shown(ctx, 2) ? arraySVG(p.k, Math.floor(p.n / p.k), { left: p.n % p.k }) : pileSVG(p.n); },
        q: ctx => `排成 ${ctx.problem.k} 排，每排一樣多，可以剛好排完嗎？`, opts: () => [['zero', '可以，剛好排完'], ['left', '不行，有剩']], ans: () => 'left',
        wrong: ctx => ({ obs: 'remainderOK', msg: `${ctx.problem.n} ÷ ${ctx.problem.k} ＝ ${Math.floor(ctx.problem.n / ctx.problem.k)} 餘 ${ctx.problem.n % ctx.problem.k}，有剩。` }), say: ex => `排成 ${ex.problem.k} 排會剩 ${ex.problem.n % ex.problem.k} 個，排不出來。` }),
      cStep(3, { title: '說說看', ask: '排得出來的排數，就是因數嗎？', id: 'f', hints: ['排得出來的排數，就是因數。', '前面哪一種排得出來？', `排不出來（有剩）的不是因數。`], think: '老師說：可以剛好排完的排數，就是因數。', together: '一起說：哪一個是因數？',
        q: ctx => `哪一個是 ${ctx.problem.n} 的因數？`, opts: ctx => { const p = ctx.problem; return [[String(p.r1), String(p.r1)], [String(p.k), String(p.k)], [String(p.n + p.r1), String(p.n + p.r1)]]; }, ans: ctx => String(ctx.problem.r1),
        wrong: (ctx, a) => a === String(ctx.problem.k) ? { obs: 'remainderOK', msg: `排成 ${ctx.problem.k} 排會有剩，${ctx.problem.k} 不是因數。` } : { obs: 'wrongChoice', msg: `因數不會比 ${ctx.problem.n} 大。` }, say: ex => `${ex.problem.r1} 排可以排完，${ex.problem.r1} 是 ${ex.problem.n} 的因數。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} 可以排成 ${ctx.problem.r1} 排、${ctx.problem.r2} 排，${ctx.problem.r1} 和 ${ctx.problem.r2} 都是 ${ctx.problem.n} 的因數。`, chant: '排得出長方形的排數，就是因數。', transfer: '想一想：教室的椅子要排成一樣多的幾排，可以怎麼排？'
  });

  // =============== 1-2 剛好分完嗎 ===============
  const ISF = { easy: [12, 15, 16, 18, 20, 24], standard: [24, 28, 30, 36, 40, 45, 48], challenge: [56, 60, 72, 80, 84, 90, 96] };
  A.register('fmIsFactor', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel(ISF, level)), a = any(rand, factorsOf(n).filter(d => d > 1 && d < n && d <= 12)), b = any(rand, [3, 4, 5, 6, 7, 8, 9, 11].filter(d => n % d));
      return { n, a, b, dims: [n, a, b], prompt: `${b} 是不是 ${n} 的因數？${a} 呢？` }; },
    planFigure: ctx => pileSVG(ctx.problem.n),
    steps: [
      nStep(0, { title: '算餘數', ask: '餘數是多少？', id: 'rb', aid: true, hints: divHints, think: '老師用除法算，看餘數。', together: '一起算：餘數是多少？',
        figure: ctx => { const p = ctx.problem; return shown(ctx, 0) ? arraySVG(p.b, Math.floor(p.n / p.b), { left: p.n % p.b }) : pileSVG(p.n); },
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, label: ctx => `${ctx.problem.n} ÷ ${ctx.problem.b}，餘數是多少？`, ans: ctx => ctx.problem.n % ctx.problem.b,
        wrong: (ctx, v) => v === Math.floor(ctx.problem.n / ctx.problem.b) ? { msg: '這是商。餘數是分完以後剩下的。' } : null, say: ex => `${ex.problem.n} ÷ ${ex.problem.b} ＝ ${Math.floor(ex.problem.n / ex.problem.b)} 餘 ${ex.problem.n % ex.problem.b}。` }),
      cStep(1, { title: '是不是因數', ask: '有剩的還算因數嗎？', id: 'isb', fixed: true, hints: ['看上一步的餘數。', '餘數不是 0，就是有剩。', '有剩的不是因數。'], think: '老師看餘數：不是 0，所以不是因數。', together: '一起判斷：是不是因數？',
        q: ctx => `${ctx.problem.b} 是不是 ${ctx.problem.n} 的因數？`, opts: () => YN, ans: () => 'no', wrong: ctx => ({ obs: 'remainderOK', msg: `${ctx.problem.n} ÷ ${ctx.problem.b} 有剩，所以不是因數。` }), say: ex => `${ex.problem.b} 不是 ${ex.problem.n} 的因數。` }),
      cStep(2, { title: '再試一個', ask: '這一次有沒有剩？', id: 'isa', fixed: true, aid: true, hints: divHints, think: '老師再除一次：剛好分完，就是因數。', together: '一起判斷：是不是因數？',
        figure: ctx => shown(ctx, 2) ? arraySVG(ctx.problem.a, ctx.problem.n / ctx.problem.a) : '',
        q: ctx => `${ctx.problem.a} 是不是 ${ctx.problem.n} 的因數？`, opts: () => YN, ans: () => 'yes', wrong: ctx => ({ msg: `${ctx.problem.n} ÷ ${ctx.problem.a} ＝ ${ctx.problem.n / ctx.problem.a}，沒有剩。` }), say: ex => `${ex.problem.n} ÷ ${ex.problem.a} ＝ ${ex.problem.n / ex.problem.a}，${ex.problem.a} 是因數。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} 是 ${ctx.problem.n} 的因數，${ctx.problem.b} 不是。`, chant: '除完沒有剩，就是因數。', transfer: '想一想：一盒 24 顆巧克力，可以平分給幾個人？'
  });

  // =============== 2-1 一直加上去 ===============
  const SKIP = { easy: [[2, 5], 24], standard: [[3, 9], 50], challenge: [[6, 12], 100] };
  A.register('fmSkip', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [[lo, hi], top] = fromLevel(SKIP, level), a = rnd(rand, lo, hi);
      return { a, top, ms: multiplesTo(a, top), dims: [a, top], prompt: `${a} 的倍數：${a}、${2 * a}、□、……` }; },
    planFigure: ctx => numGrid(ctx.problem.top, { a: [ctx.problem.a, 2 * ctx.problem.a] }),
    steps: [
      nStep(0, { title: '下一個是多少', ask: '每次都加一樣多嗎？', id: 'm3', hints: ['倍數就是一直加同一個數。', '前一個再加一次同樣的數。', '1 倍、2 倍、3 倍……'], think: '老師一直加同一個數。', together: '一起加：下一個是多少？',
        figure: ctx => numGrid(ctx.problem.top, { a: [ctx.problem.a, 2 * ctx.problem.a], hint: shown(ctx, 0) ? [3 * ctx.problem.a] : [] }),
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, label: () => '□ 是多少？', ans: ctx => 3 * ctx.problem.a,
        wrong: (ctx, v) => v === 2 * ctx.problem.a + 1 ? { msg: `不是加 1，是每次加 ${ctx.problem.a}。` } : null, say: ex => `${2 * ex.problem.a} 再加 ${ex.problem.a}，是 ${3 * ex.problem.a}。` }),
      { title: '全部點出來', ask: '我每次都加一樣多嗎？', ids: ['ms'], hints: ['從這個數開始，一直往後跳。', '每次跳一樣多格。', '跳到的每一格都要點。'],
        think: '老師從這個數開始，每次往後跳一樣多，跳到的都點起來。', together: '一起點：倍數有哪些？',
        answer: ctx => { const p = ctx.problem; return `<p data-read data-say>點出 ${p.a} 的倍數（到 ${p.top} 為止）。</p>${numGrid(p.top, { pick: 'ms', sel: ctx.state.ms, hint: ctx.hint(1) >= 3 ? p.ms : [] })}${countLine(ctx, 'ms')}`; },
        bind: bindPick(1, 'ms'),
        check: ctx => { const p = ctx.problem, sel = ctx.state.ms || []; if (sel.some(s => s < p.a)) return { code: 'ms', obs: 'swapFM', msg: `倍數不會比 ${p.a} 小。從 ${p.a} 開始跳。` };
          return pickCheck(sel, p.ms, { code: 'ms', extraObs: 'other', extraMsg: x => `${x.join('、')} 不是 ${p.a} 的倍數。`, missMsg: `一直加 ${p.a}，還有沒點到的。` }); },
        solve: ctx => { ctx.state.ms = ctx.problem.ms.slice(); ctx.answers.ms = ctx.problem.ms.join(','); }, say: ex => `${ex.problem.a} 的倍數：${ex.problem.ms.join('、')}。` },
      cStep(2, { title: '寫得完嗎', ask: '倍數有最後一個嗎？', id: 'end', fixed: true, hints: ['想一想：表格後面還可以再加嗎？', '到了表格最後，再加一次還是有倍數。', '倍數可以一直加下去，寫不完。'], think: '老師想：倍數可以一直加下去，沒有最後一個。', together: '一起想：寫得完嗎？',
        q: ctx => `${ctx.problem.a} 的倍數寫得完嗎？`, opts: ctx => [['no', '寫不完，可以一直加下去'], ['yes', `寫得完，到 ${ctx.problem.top} 就沒有了`]], ans: () => 'no',
        wrong: ctx => ({ obs: 'multFinite', msg: `表格只到 ${ctx.problem.top}，可是倍數還可以一直加下去。` }), say: () => '倍數寫不完，可以一直加下去。' })
    ],
    reasons, done: ctx => `${ctx.problem.a} 的倍數：${ctx.problem.ms.slice(0, 5).join('、')}……一直加下去，寫不完。`, chant: '倍數：一直加同一個數，寫不完。', transfer: '想一想：一盒 6 顆蛋，2 盒、3 盒是幾顆？'
  });

  // =============== 2-2 是不是倍數 ===============
  const ISM = { easy: [[2, 5], 24], standard: [[3, 9], 50], challenge: [[6, 12], 100] };
  A.register('fmIsMult', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [[lo, hi], top] = fromLevel(ISM, level), a = rnd(rand, lo, hi), m = a * rnd(rand, 3, Math.floor(top / a));
      let x; do x = rnd(rand, a + 1, top); while (x % a === 0);
      return { a, m, x, dims: [a, m, x], prompt: `${x} 是不是 ${a} 的倍數？${m} 呢？` }; },
    planFigure: ctx => pileSVG(Math.min(ctx.problem.x, 60)),
    steps: [
      nStep(0, { title: '算餘數', ask: '餘數是多少？', id: 'rx', aid: true, hints: divHints, think: '老師用除法算，看餘數。', together: '一起算：餘數是多少？',
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, label: ctx => `${ctx.problem.x} ÷ ${ctx.problem.a}，餘數是多少？`, ans: ctx => ctx.problem.x % ctx.problem.a,
        wrong: (ctx, v) => v === Math.floor(ctx.problem.x / ctx.problem.a) ? { msg: '這是商。餘數是剩下的。' } : null, say: ex => `${ex.problem.x} ÷ ${ex.problem.a} ＝ ${Math.floor(ex.problem.x / ex.problem.a)} 餘 ${ex.problem.x % ex.problem.a}。` }),
      cStep(1, { title: '是不是倍數', ask: '一直加，會不會剛好加到？', id: 'isx', fixed: true, hints: ['看上一步的餘數。', '有剩，就加不到這個數。', '餘數不是 0，就不是倍數。'], think: '老師看餘數：不是 0，一直加會跳過去，不是倍數。', together: '一起判斷：是不是倍數？',
        q: ctx => `${ctx.problem.x} 是不是 ${ctx.problem.a} 的倍數？`, opts: () => YN, ans: () => 'no', wrong: ctx => ({ obs: 'remainderOK', msg: `${ctx.problem.x} ÷ ${ctx.problem.a} 有剩，一直加 ${ctx.problem.a} 會跳過 ${ctx.problem.x}。` }), say: ex => `${ex.problem.x} 不是 ${ex.problem.a} 的倍數。` }),
      cStep(2, { title: '再試一個', ask: '這一次有沒有剩？', id: 'ism', fixed: true, aid: true, hints: divHints, think: '老師再除一次：沒有剩，就是倍數。', together: '一起判斷：是不是倍數？',
        q: ctx => `${ctx.problem.m} 是不是 ${ctx.problem.a} 的倍數？`, opts: () => YN, ans: () => 'yes', wrong: ctx => ({ msg: `${ctx.problem.m} ÷ ${ctx.problem.a} ＝ ${ctx.problem.m / ctx.problem.a}，沒有剩。` }), say: ex => `${ex.problem.a} × ${ex.problem.m / ex.problem.a} ＝ ${ex.problem.m}，是倍數。` })
    ],
    reasons, done: ctx => `${ctx.problem.m} 是 ${ctx.problem.a} 的倍數，${ctx.problem.x} 不是。`, chant: '除完沒有剩，就是倍數。', transfer: '想一想：一盒 6 顆，買幾盒才會剛好是 30 顆？'
  });

  // =============== 2-3 因數和倍數是一對 ===============
  const FW = [['f', '因數'], ['m', '倍數']];
  A.register('fmPair', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = level === 'easy' ? [2, 5] : [2, 9]; const cap = capOf(level); let a, b; do { a = rnd(rand, lo, hi); b = rnd(rand, lo, hi); } while (a === b || a * b > cap);
      return { a, b, n: a * b, dims: [a, b], prompt: `${a} × ${b} ＝ ${a * b}` }; },
    planFigure: ctx => arraySVG(ctx.problem.a, ctx.problem.b),
    steps: [
      cStep(0, { title: '小的是大的', ask: '小的數是大的數的什麼？', id: 'w1', fixed: true, hints: ['小的數可以把大的數剛好分完。', '能剛好分完的，是因數。', '小的數是大的數的因數。'], think: '老師想：用小的數去分大的數，剛好分完，是因數。', together: '一起想：是因數還是倍數？',
        figure: ctx => arraySVG(ctx.problem.a, ctx.problem.b), pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`,
        q: ctx => `${ctx.problem.a} 是 ${ctx.problem.n} 的什麼？`, opts: () => FW, ans: () => 'f', wrong: () => ({ obs: 'swapFM', msg: '講反了。小的數可以把大的數剛好分完，是因數。' }), say: ex => `${ex.problem.a} 是 ${ex.problem.n} 的因數。` }),
      cStep(1, { title: '大的是小的', ask: '大的數是小的數的什麼？', id: 'w2', fixed: true, hints: ['大的數是小的數一直加得到的。', '一直加得到的，是倍數。', '大的數是小的數的倍數。'], think: '老師想：小的數一直加，加到大的數，大的數是倍數。', together: '一起想：是因數還是倍數？',
        figure: ctx => arraySVG(ctx.problem.a, ctx.problem.b),
        q: ctx => `${ctx.problem.n} 是 ${ctx.problem.a} 的什麼？`, opts: () => FW, ans: () => 'm', wrong: () => ({ obs: 'swapFM', msg: '講反了。大的數是小的數一直加得到的，是倍數。' }), say: ex => `${ex.problem.n} 是 ${ex.problem.a} 的倍數。` }),
      cStep(2, { title: '選對的句子', ask: '哪一句沒有講反？', id: 'w3', hints: ['先找大的數和小的數。', '小的是大的因數；大的是小的倍數。', '看句子的前面是大的數還是小的數。'], think: '老師看句子：大的數在前面，要說倍數。', together: '一起選：哪一句對？',
        q: ctx => '哪一句是對的？', opts: ctx => { const p = ctx.problem; return [['ok', `${p.n} 是 ${p.b} 的倍數`], ['x1', `${p.n} 是 ${p.b} 的因數`], ['x2', `${p.b} 是 ${p.n} 的倍數`]]; }, ans: () => 'ok',
        wrong: () => ({ obs: 'swapFM', msg: '這一句講反了。大的數是小的數的倍數。' }), say: ex => `${ex.problem.n} 是 ${ex.problem.b} 的倍數，${ex.problem.b} 是 ${ex.problem.n} 的因數。` })
    ],
    reasons, done: ctx => `${ctx.problem.a}、${ctx.problem.b} 是 ${ctx.problem.n} 的因數；${ctx.problem.n} 是 ${ctx.problem.a}、${ctx.problem.b} 的倍數。`, chant: '小的是大的因數，大的是小的倍數。', transfer: '想一想：3 × 4 ＝ 12，你可以說出哪些因數和倍數的句子？'
  });

  // =============== 3-1 兩種東西一起分 ===============
  A.register('fmShareTwo', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [x, y] = any(rand, fromLevel(GPAIRS, level)), c = GCTX[(i + rnd(rand, 0, 3)) % GCTX.length], fx = factorsOf(x), fy = factorsOf(y);
      const both = common(fx, fy).filter(d => d > 1 && x / d <= 12 && y / d <= 12), k = both.length ? any(rand, both) : gcd(x, y);
      const only = fx.filter(d => d > 1 && !fy.includes(d) && d <= 12), m = only.length ? any(rand, only) : any(rand, fy.filter(d => d > 1 && !fx.includes(d)));
      return { x, y, k, m, c, dims: [x, y, k], prompt: `有 ${x} ${c.ua}${c.a}和 ${y} ${c.ub}${c.b}，要分裝成幾${c.bag}，每${c.bag}一樣，全部分完。` }; },
    planFigure: ctx => `${pileSVG(ctx.problem.x)}${pileSVG(ctx.problem.y).replace(/fm-tile/g, 'fm-tile b')}`,
    steps: [
      cStep(0, { title: '分成 k 份', ask: '兩種東西都分完了嗎？', id: 'sk', fixed: true, aid: true, hints: ['兩種東西都要分。', `兩個數都除以份數，看有沒有剩。`, '兩種都沒有剩，才是都分完。'], think: '老師把兩種東西都分分看，兩種都沒有剩才可以。', together: '一起分：都分完了嗎？',
        figure: ctx => { const p = ctx.problem; return shown(ctx, 0) ? `${shareSVG(p.x, p.k)}${shareSVG(p.y, p.k, { color: 'b' })}` : ''; }, pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`,
        q: ctx => `分成 ${ctx.problem.k} ${ctx.problem.c.bag}，${ctx.problem.c.a}和${ctx.problem.c.b}都剛好分完嗎？`, opts: () => [['yes', '兩種都剛好分完'], ['no', '有一種有剩']], ans: () => 'yes',
        wrong: ctx => ({ msg: `${ctx.problem.x} ÷ ${ctx.problem.k} 和 ${ctx.problem.y} ÷ ${ctx.problem.k} 都沒有剩。` }), say: ex => `${ex.problem.k} ${ex.problem.c.bag}，兩種都剛好分完。` }),
      cStep(1, { title: '分成 m 份', ask: '兩種都要分完，不是只有一種。', id: 'sm', fixed: true, aid: true, hints: ['兩種東西都要分。', '兩個數都除以份數，看有沒有剩。', '只要有一種有剩，就不行。'], think: '老師把兩種都分分看：有一種有剩，就不行。', together: '一起分：都分完了嗎？',
        figure: ctx => { const p = ctx.problem; return shown(ctx, 1) ? `${shareSVG(p.x, p.m)}${shareSVG(p.y, p.m, { color: 'b' })}` : ''; },
        q: ctx => `分成 ${ctx.problem.m} ${ctx.problem.c.bag}呢？`, opts: () => [['yes', '兩種都剛好分完'], ['no', '有一種有剩']], ans: () => 'no',
        wrong: ctx => { const p = ctx.problem, bad = p.x % p.m ? `${p.x} ${p.c.ua}${p.c.a}` : `${p.y} ${p.c.ub}${p.c.b}`; return { obs: 'remainderOK', msg: `${bad}分成 ${p.m} ${p.c.bag}會有剩。兩種都要分完才行。` }; }, say: ex => `${ex.problem.m} ${ex.problem.c.bag}會有剩，不行。` }),
      cStep(2, { title: '這叫什麼', ask: '兩個數都可以分完的數叫什麼？', id: 'name', fixed: true, hints: ['兩個數的因數，都有它。', '兩個數「共同」的因數。', '共同的因數，叫做公因數。'], think: '老師說：兩個數都能剛好分完的數，是公因數。', together: '一起說：這叫什麼？',
        q: ctx => `${ctx.problem.k} 是 ${ctx.problem.x} 和 ${ctx.problem.y} 的什麼？`, opts: ctx => [['g', '公因數'], ['l', '公倍數'], ['o', `只是 ${ctx.problem.x} 的因數`]], ans: () => 'g',
        wrong: (ctx, a) => a === 'l' ? { obs: 'gcdLcmSwap', msg: '是平分、剛好分完，是「因數」，不是倍數。' } : { msg: `${ctx.problem.k} 也可以把 ${ctx.problem.y} 剛好分完。` }, say: ex => `${ex.problem.k} 是 ${ex.problem.x} 和 ${ex.problem.y} 的公因數。` })
    ],
    reasons, done: ctx => `${ctx.problem.k} 是 ${ctx.problem.x} 和 ${ctx.problem.y} 的公因數：兩種東西都可以分成 ${ctx.problem.k} ${ctx.problem.c.bag}。`, chant: '兩個數都能剛好分完的，是公因數。', transfer: '想一想：12 個男生、18 個女生要分組，每組男生一樣多、女生也一樣多，可以分幾組？'
  });

  // =============== 4-1 什麼時候再一起 ===============
  const MEET = {
    bus: { intro: (x, y) => `甲公車每 ${x} 分鐘開一班，乙公車每 ${y} 分鐘開一班。剛剛兩班車一起開出。`, q: t => `再過 ${t} 分鐘，兩班車會一起開出嗎？` },
    light: { intro: (x, y) => `紅燈每 ${x} 秒亮一次，綠燈每 ${y} 秒亮一次。剛剛兩盞燈一起亮。`, q: t => `再過 ${t} 秒，兩盞燈會一起亮嗎？` },
    block: { intro: (x, y) => `紅積木一塊高 ${x} 公分，藍積木一塊高 ${y} 公分。紅積木疊一疊，藍積木疊一疊。`, q: t => `兩疊都疊到 ${t} 公分高，做得到嗎？` }
  };
  A.register('fmMeet', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [x, y] = any(rand, fromLevel(LPAIRS, level)), c = LCTX[(i + rnd(rand, 0, 2)) % LCTX.length], L = lcm(x, y);
      const t1 = multiplesTo(y, L).find(v => v % x) || multiplesTo(x, L).find(v => v % y);
      return { x, y, L, t1, c, top: Math.max(L, Math.min(capOf(level), 2 * L)), dims: [x, y, L], prompt: MEET[c.key].intro(x, y) }; },
    planFigure: ctx => jumpSVG(ctx.problem.x, ctx.problem.y, ctx.problem.top, { aName: ctx.problem.c.aName, bName: ctx.problem.c.bName }),
    steps: [
      cStep(0, { title: '這時候一起嗎', ask: '兩條線都跳到這裡了嗎？', id: 'at1', fixed: true, hints: ['看上面和下面兩條線。', '這個數，上面跳得到嗎？下面跳得到嗎？', '兩條都跳得到，才是一起。'], think: '老師看兩條數線：兩條都跳到這個數，才是一起。', together: '一起看：兩條都跳到了嗎？',
        figure: ctx => { const p = ctx.problem; return jumpSVG(p.x, p.y, p.top, { aName: p.c.aName, bName: p.c.bName, mark: p.t1 }); }, pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`,
        q: ctx => MEET[ctx.problem.c.key].q(ctx.problem.t1), opts: () => [['yes', '會（做得到）'], ['no', '不會（做不到）']], ans: () => 'no',
        wrong: ctx => ({ obs: 'remainderOK', msg: `${ctx.problem.t1} 只有一條線跳得到。` }), say: ex => `${ex.problem.t1} 只有一條線跳到，不會一起。` }),
      cStep(1, { title: '再一起', ask: '兩條線都跳到這裡了嗎？', id: 'atL', fixed: true, hints: ['看上面和下面兩條線。', '這個數，兩條線都跳得到嗎？', `用除法：兩個數都可以剛好除盡。`], think: '老師看：兩條線都跳到這個數，所以會一起。', together: '一起看：兩條都跳到了嗎？',
        figure: ctx => { const p = ctx.problem; return jumpSVG(p.x, p.y, p.top, { aName: p.c.aName, bName: p.c.bName, mark: p.L, common: shown(ctx, 1) }); },
        q: ctx => MEET[ctx.problem.c.key].q(ctx.problem.L), opts: () => [['yes', '會（做得到）'], ['no', '不會（做不到）']], ans: () => 'yes', wrong: ctx => ({ msg: `${ctx.problem.L} ÷ ${ctx.problem.x} 和 ${ctx.problem.L} ÷ ${ctx.problem.y} 都沒有剩，兩條都跳到。` }), say: ex => `${ex.problem.L} 兩條都跳到，會一起。` }),
      cStep(2, { title: '這叫什麼', ask: '兩個數一直加都會到的數叫什麼？', id: 'name', fixed: true, hints: ['兩個數一直加，都會加到它。', '兩個數「共同」的倍數。', '共同的倍數，叫做公倍數。'], think: '老師說：兩個數一直加都會到的數，是公倍數。', together: '一起說：這叫什麼？',
        q: ctx => `${ctx.problem.L} 是 ${ctx.problem.x} 和 ${ctx.problem.y} 的什麼？`, opts: () => [['l', '公倍數'], ['g', '公因數']], ans: () => 'l',
        wrong: () => ({ obs: 'gcdLcmSwap', msg: '是一直加、再碰在一起，是「倍數」，不是因數。' }), say: ex => `${ex.problem.L} 是 ${ex.problem.x} 和 ${ex.problem.y} 的公倍數。` })
    ],
    reasons, done: ctx => `${ctx.problem.L} 是 ${ctx.problem.x} 和 ${ctx.problem.y} 的公倍數：到 ${ctx.problem.L} 會再一起。`, chant: '兩個數一直加都會到的，是公倍數。', transfer: '想一想：你每 2 天游泳、每 3 天練琴，哪一天兩件事會在同一天？'
  });

  // =============== 5-1 這題用哪一個 ===============
  const mk = makeCommon(null);
  const whichStep = n => ({ title: `第 ${n + 1} 題`, ask: '是平分，還是再碰在一起？', ids: ['k' + n], hints: ['找關鍵字。', '分完、最多 → 公因數；再一起、一樣高、最少 → 公倍數。', '想一想：東西要分開，還是要等到碰在一起？'],
    think: '老師找關鍵字：分完、最多，用公因數；再一起、最少，用公倍數。', together: '一起判斷：用哪一個？',
    answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.cases[n].prompt)}</p>${ctx.choice('k' + n, '這一題要找什麼？', [['gcd', '最大公因數'], ['lcm', '最小公倍數']], true)}`,
    check: ctx => { const a = ctx.answers['k' + n], k = ctx.problem.cases[n].kind; return !a ? { code: 'k' + n, msg: '先選一個答案。' } : a === k ? null : { code: 'k' + n, obs: 'gcdLcmSwap', msg: k === 'gcd' ? '題目要平分、全部分完、最多幾份：找最大公因數。' : '題目要等到再一起、最少多少：找最小公倍數。' }; },
    solve: ctx => { ctx.answers['k' + n] = ctx.problem.cases[n].kind; }, say: ex => ex.problem.cases[n].kind === 'gcd' ? '平分、分完、最多：最大公因數。' : '再一起、最少：最小公倍數。' });
  A.register('fmWhich', {
    methods, makeProblem: (level, i, rand = Math.random) => { const kinds = shuffle(['gcd', 'lcm', rand() < 0.5 ? 'gcd' : 'lcm'], rand);
      const cases = kinds.map((k, j) => { let c; for (let t = 0; t < 20; t++) { c = mk(level, (k === 'gcd' ? 0 : 1) + 2 * (i + j + t), rand); if (c.kind === k) break; } return { kind: c.kind, prompt: c.prompt }; });
      return { cases, dims: [cases.filter(c => c.kind === 'gcd').length, 3], prompt: '判斷每一題要找最大公因數，還是最小公倍數。' }; },
    planFigure: () => '', steps: [0, 1, 2].map(whichStep),
    reasons, done: () => '會分清楚了：平分、分完、最多，找最大公因數；再一起、最少，找最小公倍數。', chant: '分完最多找公因數，再一起最少找公倍數。', transfer: '想一想：自己出一題要用公倍數的題目。'
  });

  // =============== 6-1 只能排一排（質數、合數） ===============
  const PR = { easy: [2, 12], standard: [2, 20], challenge: [2, 20] };
  const KIND3 = [['p', '質數（因數只有 1 和自己）'], ['c', '合數（因數超過 2 個）'], ['n', '都不是']];
  const kindOf = n => n === 1 ? 'n' : isPrime(n) ? 'p' : 'c';
  const kindWrong = (n, a) => n === 1 && a === 'p' ? { obs: 'oneIsPrime', msg: '1 的因數只有 1 一個，不是質數，也不是合數。' } : n % 2 && kindOf(n) === 'c' && a === 'p' ? { obs: 'oddIsPrime', msg: `${n} 是奇數，可是它的因數有 ${factorsOf(n).join('、')}，超過 2 個，是合數。` } : n === 2 && a !== 'p' ? { msg: '2 的因數只有 1 和 2，是質數（唯一的偶數質數）。' } : { msg: `${n} 的因數有 ${factorsOf(n).join('、')}。數一數有幾個。` };
  A.register('fmPrime', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel(PR, level); let n; do n = rnd(rand, lo, hi); while (i % 2 ? !isPrime(n) : isPrime(n));
      const tricky = level === 'easy' ? [9, 2, 1, 4] : [9, 15, 1, 2, 21].filter(x => x <= 20); let m = tricky[(i + rnd(rand, 0, 3)) % tricky.length]; if (m === n) m = 1;
      return { n, m, fs: factorsOf(n), dims: [n, factorsOf(n).length], prompt: `${n} 個方塊，可以排成幾種長方形？` }; },
    planFigure: ctx => pileSVG(ctx.problem.n),
    steps: [
      nStep(0, { title: '數因數', ask: '1 和它自己都算進去了嗎？', id: 'cnt', aid: true, hints: ['一對一對找因數。', '1 和它自己也要算。', '把因數一個一個數出來。'], think: '老師找出全部的因數，數一數有幾個。', together: '一起數：有幾個因數？',
        figure: ctx => { const p = ctx.problem, f = p.fs.find(d => d > 1 && d * d <= p.n); return `${arraySVG(1, p.n)}${shown(ctx, 0) && f && f < p.n ? arraySVG(f, p.n / f) : ''}`; }, pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`,
        label: ctx => `${ctx.problem.n} 有幾個因數？`, ans: ctx => ctx.problem.fs.length, wrong: (ctx, v) => v === ctx.problem.fs.length - 2 ? { obs: 'miss1Self', msg: '1 和它自己也是因數，要算進去。' } : null, say: ex => `${ex.problem.n} 的因數：${ex.problem.fs.join('、')}，共 ${ex.problem.fs.length} 個。` }),
      cStep(1, { title: '質數還是合數', ask: '因數只有 2 個嗎？', id: 'kn', fixed: true, hints: ['看上一步：有幾個因數？', '只有 2 個（1 和自己）是質數；超過 2 個是合數。', '只能排成一排的，是質數。'], think: '老師看因數有幾個：只有 1 和自己，就是質數。', together: '一起判斷：質數還是合數？',
        q: ctx => `${ctx.problem.n} 是什麼？`, opts: () => KIND3, ans: ctx => kindOf(ctx.problem.n), wrong: (ctx, a) => kindWrong(ctx.problem.n, a), say: ex => `${ex.problem.n} 是${{ p: '質數', c: '合數', n: '都不是' }[kindOf(ex.problem.n)]}。` }),
      cStep(2, { title: '再判斷一個', ask: '它的因數有幾個？', id: 'km', fixed: true, aid: true, hints: ['先找出它的因數。', '數一數因數有幾個。', '1 很特別：只有 1 個因數。'], think: '老師先找因數，再判斷。', together: '一起判斷：這個數是什麼？',
        figure: ctx => shown(ctx, 2) ? arraySVG(1, ctx.problem.m) : '',
        q: ctx => `${ctx.problem.m} 是什麼？`, opts: () => KIND3, ans: ctx => kindOf(ctx.problem.m), wrong: (ctx, a) => kindWrong(ctx.problem.m, a), say: ex => `${ex.problem.m} 的因數：${factorsOf(ex.problem.m).join('、')}，是${{ p: '質數', c: '合數', n: '都不是' }[kindOf(ex.problem.m)]}。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} 是${{ p: '質數', c: '合數', n: '都不是' }[kindOf(ctx.problem.n)]}。`, chant: '質數只有 1 和自己；1 不是質數也不是合數。', transfer: '想一想：20 以內的質數有哪些？'
  });

  // =============== 6-2 2、3、5 的倍數判別 ===============
  const T235 = { easy: [10, 24], standard: [10, 50], challenge: [40, 100] };   // 吳老師 2026-11-17：挑戰也在 100 以內
  const dsum = n => String(n).split('').reduce((s, d) => s + Number(d), 0);
  A.register('fmTest235', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel(T235, level); let n; do n = rnd(rand, lo, hi); while (!(n % 2 === 0 || n % 3 === 0 || n % 5 === 0) || (i % 2 && n % 10 === 0));
      return { n, last: n % 10, s: dsum(n), dims: [n, dsum(n)], prompt: `${n} 是不是 2、3、5 的倍數？` }; },
    planFigure: ctx => `<p class="fm-big" data-read>${ctx.problem.n}</p>`,
    steps: [
      cStep(0, { title: '2 的倍數', ask: '個位是 0、2、4、6、8 嗎？', id: 'by2', fixed: true, hints: ['看個位。', '個位是 0、2、4、6、8，就是 2 的倍數。', `看最後一個數字。`], think: '老師看個位：是雙數（0、2、4、6、8），就是 2 的倍數。', together: '一起看：個位是多少？',
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, q: ctx => `個位是 ${ctx.problem.last}。${ctx.problem.n} 是不是 2 的倍數？`, opts: () => YN, ans: ctx => ctx.problem.n % 2 ? 'no' : 'yes',
        wrong: () => ({ msg: '個位是 0、2、4、6、8，才是 2 的倍數。' }), say: ex => ex.problem.n % 2 ? '個位是單數，不是 2 的倍數。' : '個位是雙數，是 2 的倍數。' }),
      nStep(1, { title: '數字加起來', ask: '每一位都加了嗎？', id: 'sum', hints: ['把每一位的數字加起來。', `例如 123：1 ＋ 2 ＋ 3。`, '一位一位加。'], think: '老師把每一位的數字加起來。', together: '一起加：加起來是多少？',
        label: ctx => `${String(ctx.problem.n).split('').join(' ＋ ')} ＝ □`, ans: ctx => ctx.problem.s, say: ex => `${String(ex.problem.n).split('').join(' ＋ ')} ＝ ${ex.problem.s}。` }),
      cStep(2, { title: '3 的倍數', ask: '加起來是 3 的倍數嗎？', id: 'by3', fixed: true, hints: ['看上一步加起來的數。', '加起來是 3 的倍數，原來的數就是 3 的倍數。', '3、6、9、12、15、18、21、24、27 是 3 的倍數。'], think: '老師看加起來的數是不是 3 的倍數。', together: '一起判斷：是不是 3 的倍數？',
        q: ctx => `加起來是 ${ctx.problem.s}。${ctx.problem.n} 是不是 3 的倍數？`, opts: () => YN, ans: ctx => ctx.problem.s % 3 ? 'no' : 'yes',
        wrong: ctx => ({ msg: `${ctx.problem.s} ${ctx.problem.s % 3 ? '不是' : '是'} 3 的倍數。` }), say: ex => `${ex.problem.s} ${ex.problem.s % 3 ? '不是' : '是'} 3 的倍數，所以 ${ex.problem.n} ${ex.problem.n % 3 ? '不是' : '是'} 3 的倍數。` }),
      cStep(3, { title: '5 的倍數', ask: '個位是 0 或 5 嗎？', id: 'by5', fixed: true, hints: ['看個位。', '個位是 0 或 5，就是 5 的倍數。', '看最後一個數字。'], think: '老師看個位：是 0 或 5，就是 5 的倍數。', together: '一起看：個位是多少？',
        q: ctx => `${ctx.problem.n} 是不是 5 的倍數？`, opts: () => YN, ans: ctx => ctx.problem.n % 5 ? 'no' : 'yes', wrong: () => ({ msg: '個位是 0 或 5，才是 5 的倍數。' }), say: ex => ex.problem.n % 5 ? '個位不是 0 或 5，不是 5 的倍數。' : '個位是 0 或 5，是 5 的倍數。' })
    ],
    reasons, done: ctx => { const n = ctx.problem.n, w = [2, 3, 5].filter(d => n % d === 0); return `${n} 是 ${w.join('、')} 的倍數。`; }, chant: '2：個位雙數；3：數字加起來是 3 的倍數；5：個位是 0 或 5。', transfer: '想一想：你的座號是 2、3、5 的倍數嗎？'
  });

  // =============== 6-3 短除分解 ===============
  // 課綱 N-6-1 備註：扣掉 2、3、5 以後，只剩 1 或 11、13、17、19（或 49、77、91），所以這裡不出現單獨的 7
  const PD = { easy: [12, 18, 20, 24, 16, 21], standard: [36, 40, 48, 50, 28, 22, 26, 33, 44, 45], challenge: [72, 90, 96, 66, 78, 88, 52, 100, 34, 38] };
  const primeFactors = n => { const f = []; for (let d = 2; n > 1; d++) while (n % d === 0) { f.push(d); n /= d; } return f; };
  const MAXR = 6, LAD = Array.from({ length: MAXR }, (_, k) => k);
  function ladderFields(ctx, n, rowsN, start, cols) {
    // 和紙上的短除一樣：左邊填質數，除完的數直接填在下一排
    const a = ctx.answers, inp = (id, label) => `<input data-answer="${id}" id="${id}" data-step="${n}" inputmode="numeric" autocomplete="off" aria-label="${label}" value="${esc(a[id] ?? '')}">`;
    const nums = k => k === 0 ? start.map(x => `<span>${x}</span>`).join('') : cols.map((_, c) => `<span>${inp(`q${c}_${k - 1}`, `第 ${k} 次除完，第 ${c + 1} 個數`)}</span>`).join('');
    return `<div class="fm-ladder fm-ladder-in">${Array.from({ length: rowsN }, (_, k) => `<div class="fm-lrow"><span class="fm-ld">${inp('d' + k, `第 ${k + 1} 次的除數`)}</span><span class="fm-lnums">${nums(k)}</span></div>`).join('')}<div class="fm-lrow last"><span class="fm-ld"></span><span class="fm-lnums">${nums(rowsN)}</span></div></div>`;
  }
  // 檢查短除：每一次的除數要是質數、要能整除每一個數，商要算對；最後要除到底
  function ladderCheck(ctx, rowsN, start, done) {
    let cur = start.slice();
    for (let k = 0; k < rowsN; k++) {
      const d = num(ctx.answers['d' + k]), q = cur.map((_, c) => num(ctx.answers[`q${c}_${k}`]));
      if (d === null || q.some(v => v === null)) return { code: 'ladder', obs: 'unfinished', msg: `第 ${k + 1} 次還沒填完。` };
      if (!isPrime(d)) return { code: 'ladder', obs: 'other', msg: d === 1 ? '除以 1 不會變，要用質數（2、3、5……）來除。' : `${d} 不是質數。短除要用質數來除。` };
      const bad = cur.find(x => x % d); if (bad !== undefined) return { code: 'ladder', obs: 'remainderOK', msg: `${bad} ÷ ${d} 會有剩，不能用 ${d} 除。` };
      const wrong = cur.findIndex((x, c) => q[c] !== x / d); if (wrong >= 0) return { code: 'ladder', obs: 'other', msg: `第 ${k + 1} 次：${cur[wrong]} ÷ ${d} 再算一次。` };
      cur = q;
    }
    return done(cur) ? null : { code: 'ladder', obs: 'noStop', msg: '還可以再除下去。' };
  }
  const ladderSolve = (ctx, divs, start) => { let cur = start.slice(); divs.forEach((d, k) => { ctx.answers['d' + k] = String(d); cur = cur.map(x => x / d); cur.forEach((x, c) => { ctx.answers[`q${c}_${k}`] = String(x); }); }); };
  const ladderIds = cols => [...LAD.map(k => 'd' + k), ...LAD.flatMap(k => Array.from({ length: cols }, (_, c) => `q${c}_${k}`))];
  A.register('fmPrimeDiv', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel(PD, level)), pf = primeFactors(n);
      return { n, pf, rows: pf.length - 1, dims: [n, pf.length], prompt: `用短除法，把 ${n} 分解成質數相乘。` }; },
    planFigure: ctx => `<p class="fm-big" data-read>${ctx.problem.n}</p>`,
    steps: [
      cStep(0, { title: '先除哪一個', ask: '2、3、5 判別法用了嗎？', id: 'first', fixed: true, hints: ['先用 2、3、5 判別法。', '從最小的質數 2 開始試。', '能整除的最小質數，先除。'], think: '老師從最小的質數 2 開始試，能整除就先除。', together: '一起想：先除以哪一個？',
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, q: ctx => `${ctx.problem.n} 先除以哪一個質數？（選最小的）`, opts: () => [['2', '2'], ['3', '3'], ['5', '5'], ['11', '11']], ans: ctx => String(ctx.problem.pf[0]),
        wrong: (ctx, a) => ctx.problem.n % Number(a) ? { obs: 'remainderOK', msg: `${ctx.problem.n} ÷ ${a} 會有剩。` } : { msg: '可以除，可是還有更小的質數也可以除。' }, say: ex => `先除以 ${ex.problem.pf[0]}。` }),
      { title: '短除到底', ask: '除完的數還能再除嗎？', ids: ladderIds(1), hints: ['左邊寫質數，下面寫除完的數。', '除完的數，還能被 2、3、5 整除嗎？能就再除。', '看下面的例子（不是這一題）：除到剩下質數，就停。'],
        think: '老師用質數一直往下除，除到下面剩下質數就停。', together: '一起除：下一次除以幾？',
        answer: ctx => { const p = ctx.problem; return `<p data-read data-say>要除 ${p.rows} 次。左邊填質數，除完的數填在下一排。</p>${ladderFields(ctx, 1, p.rows, [p.n], [0])}${ctx.hint(1) >= 3 ? `<p data-read>例子：${p.n === 12 ? 18 : 12} 的短除</p>${p.n === 12 ? ladderHtml([[2, 18], [3, 9]], [3]) : ladderHtml([[2, 12], [2, 6]], [3])}` : ''}`; },
        check: ctx => ladderCheck(ctx, ctx.problem.rows, [ctx.problem.n], cur => isPrime(cur[0])),
        solve: ctx => ladderSolve(ctx, ctx.problem.pf.slice(0, -1), [ctx.problem.n]), say: ex => `${ex.problem.n} 一直除：${ex.problem.pf.slice(0, -1).join('、')}，最後剩 ${ex.problem.pf.at(-1)}。` },
      cStep(2, { title: '寫成相乘', ask: '每一個都是質數嗎？', id: 'prod', hints: ['把左邊的除數和最下面的數乘起來。', '每一個都要是質數。', '例如 12 ＝ 2 × 2 × 3。'], think: '老師把左邊的質數和最下面的數寫成相乘。', together: '一起寫：質因數分解是什麼？',
        q: ctx => `${ctx.problem.n} 的質因數分解是哪一個？`, opts: ctx => { const pf = ctx.problem.pf, ok = pf.join(' × '), w1 = [pf[0] * pf[1], ...pf.slice(2)].join(' × '), w2 = pf.length > 2 ? [pf[0], pf.slice(1).reduce((s, x) => s * x, 1)].join(' × ') : `1 × ${ctx.problem.n}`;
          return [['ok', ok], ['w1', w1], ['w2', w2 === w1 ? `1 × ${ctx.problem.n}` : w2]]; }, ans: () => 'ok',
        wrong: () => ({ msg: '這裡面有的數不是質數，還可以再分。' }), say: ex => `${ex.problem.n} ＝ ${ex.problem.pf.join(' × ')}。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} ＝ ${ctx.problem.pf.join(' × ')}。`, chant: '短除：用質數一直除，除到剩下質數。', transfer: '想一想：60 的質因數分解是什麼？'
  });

  // =============== 7-1 短除找最大公因數和最小公倍數 ===============
  // 最小公倍數也要在等級上限內（入門 24、一般 50、挑戰 100）
  const SDP = { easy: [[8, 12], [6, 9], [4, 6], [6, 8], [4, 10]], standard: [[12, 18], [12, 16], [9, 12], [10, 15], [8, 20], [16, 24], [14, 21], [10, 25]], challenge: [[24, 36], [18, 30], [20, 30], [32, 48], [28, 42], [30, 45], [24, 32], [20, 50]] };
  A.register('fmShortDiv', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [a, b] = any(rand, fromLevel(SDP, level)), g = gcd(a, b), cf = primeFactors(g);
      return { a, b, g, L: lcm(a, b), cf, ra: a / g, rb: b / g, dims: [a, b, g], prompt: `用短除法，找 ${a} 和 ${b} 的最大公因數和最小公倍數。` }; },
    planFigure: ctx => `<p class="fm-big" data-read>${ctx.problem.a}　${ctx.problem.b}</p>`,
    steps: [
      cStep(0, { title: '一起除以幾', ask: '兩個數都能整除嗎？', id: 'first', fixed: true, hints: ['找兩個數都可以除的質數。', '從 2 開始試：兩個數都是雙數嗎？', '兩個數都能整除，才可以寫在左邊。'], think: '老師找兩個數都能整除的質數。', together: '一起想：兩個數都能除以幾？',
        pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`, q: ctx => `${ctx.problem.a} 和 ${ctx.problem.b} 可以一起除以哪一個？（選最小的）`, opts: () => [['2', '2'], ['3', '3'], ['5', '5'], ['7', '7']], ans: ctx => String(ctx.problem.cf[0]),
        wrong: (ctx, a) => { const p = ctx.problem, d = Number(a); return p.a % d || p.b % d ? { obs: 'remainderOK', msg: `${p.a % d ? p.a : p.b} ÷ ${d} 會有剩，不能一起除。` } : { msg: '可以一起除，可是還有更小的質數。' }; }, say: ex => `兩個數都可以除以 ${ex.problem.cf[0]}。` }),
      { title: '一直除到互質', ask: '下面兩個數還有公因數嗎？', ids: ladderIds(2), hints: ['兩個數都要除，商寫在下面。', '下面兩個數還能一起除以 2、3、5 嗎？', '除到下面兩個數只剩公因數 1（互質）就停。'],
        think: '老師一直用兩個數都能整除的質數除，除到下面兩個數互質。', together: '一起除：還能一起除嗎？',
        answer: ctx => { const p = ctx.problem; return `<p data-read data-say>要除 ${p.cf.length} 次。左邊填質數，兩個數除完的數填在下一排。</p>${ladderFields(ctx, 1, p.cf.length, [p.a, p.b], [0, 1])}`; },
        check: ctx => ladderCheck(ctx, ctx.problem.cf.length, [ctx.problem.a, ctx.problem.b], cur => gcd(cur[0], cur[1]) === 1),
        solve: ctx => ladderSolve(ctx, ctx.problem.cf, [ctx.problem.a, ctx.problem.b]), say: ex => `除完剩 ${ex.problem.ra} 和 ${ex.problem.rb}，互質。` },
      nStep(2, { title: '最大公因數', ask: '左邊的數都乘了嗎？', id: 'g', hints: ['看短除左邊的數。', '左邊的數全部乘起來。', '左邊相乘 ＝ 最大公因數。'], think: '老師把左邊的質數乘起來，就是最大公因數。', together: '一起算：最大公因數是多少？',
        figure: ctx => { const p = ctx.problem; let cur = [p.a, p.b]; const rows = p.cf.map(d => { const r = [d, ...cur]; cur = cur.map(x => x / d); return r; }); return ladderHtml(rows, cur); },
        label: () => '最大公因數是多少？', ans: ctx => ctx.problem.g, wrong: (ctx, v) => v === ctx.problem.L ? { obs: 'gcdLcmSwap', msg: '這是最小公倍數。最大公因數只乘左邊。' } : null, say: ex => `${ex.problem.cf.join(' × ')} ＝ ${ex.problem.g}。` }),
      nStep(3, { title: '最小公倍數', ask: '左邊和最下面都乘了嗎？', id: 'l', hints: ['左邊的數和最下面的數。', '像一個 L：左邊全部和最下面的兩個數乘起來。', '最大公因數 × 最下面兩個數 ＝ 最小公倍數。'], think: '老師把左邊和最下面的數（L 形）乘起來，就是最小公倍數。', together: '一起算：最小公倍數是多少？',
        figure: ctx => { const p = ctx.problem; let cur = [p.a, p.b]; const rows = p.cf.map(d => { const r = [d, ...cur]; cur = cur.map(x => x / d); return r; }); return ladderHtml(rows, cur); },
        label: () => '最小公倍數是多少？', ans: ctx => ctx.problem.L, wrong: (ctx, v) => v === ctx.problem.a * ctx.problem.b ? { obs: 'lcmProduct', msg: `${ctx.problem.a} × ${ctx.problem.b} 是公倍數，可是不是最小的。` } : v === ctx.problem.g ? { obs: 'gcdLcmSwap', msg: '這是最大公因數。最小公倍數還要乘最下面的數。' } : null,
        say: ex => `${ex.problem.g} × ${ex.problem.ra} × ${ex.problem.rb} ＝ ${ex.problem.L}。` })
    ],
    reasons, done: ctx => `最大公因數 ${ctx.problem.g}，最小公倍數 ${ctx.problem.L}。`, chant: '短除：左邊相乘是最大公因數；左邊和下面（L 形）相乘是最小公倍數。', transfer: '想一想：用短除法找 12 和 30 的最大公因數。'
  });

  // =============== 7-2 互質 ===============
  const COP = [[8, 9], [7, 10], [9, 16], [5, 12], [14, 15], [4, 9], [11, 12], [15, 16], [9, 20], [10, 21]], NCOP = [[6, 9], [8, 12], [10, 15], [12, 18], [14, 21], [9, 15], [6, 16], [15, 20]];
  A.register('fmCoprime', {
    methods, makeProblem: (level, i, rand = Math.random) => { const co = i % 2 === 0, [x, y] = any(rand, co ? COP : NCOP), [x2, y2] = any(rand, co ? NCOP : COP);
      return { x, y, x2, y2, both: common(factorsOf(x), factorsOf(y)), co, dims: [x, y], prompt: `${x} 和 ${y} 互質嗎？` }; },
    planFigure: ctx => `<p class="fm-big" data-read>${ctx.problem.x}　${ctx.problem.y}</p>`,
    steps: [
      { title: '找公因數', ask: '兩個數都有的因數有哪些？', ids: ['cf'], hints: ['先想兩個數的因數。', '兩個數都有的，才是公因數。', '1 一定是公因數。'], think: '老師找兩個數都有的因數。', together: '一起找：公因數有哪些？',
        answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${timesAid(ctx)}<p data-read data-say>點出 ${p.x} 和 ${p.y} 的全部公因數。</p>${numGrid(Math.min(p.x, p.y), { pick: 'cf', sel: ctx.state.cf, a: ctx.hint(0) >= 2 ? factorsOf(p.x) : [], b: ctx.hint(0) >= 2 ? factorsOf(p.y) : [], hint: ctx.hint(0) >= 3 ? p.both : [] })}${countLine(ctx, 'cf')}`; },
        bind: bindPick(0, 'cf'),
        check: ctx => { const p = ctx.problem, sel = ctx.state.cf || []; if (sel.length && !sel.includes(1)) return { code: 'cf', obs: 'miss1Self', msg: '1 是每個數的因數，也是公因數。' };
          return pickCheck(sel, p.both, { code: 'cf', extraMsg: x => `${x.join('、')} 不能把兩個數都剛好分完。`, missMsg: '還有兩個數都能整除的數沒有選。' }); },
        solve: ctx => { ctx.state.cf = ctx.problem.both.slice(); ctx.answers.cf = ctx.problem.both.join(','); }, say: ex => `公因數：${ex.problem.both.join('、')}。` },
      cStep(1, { title: '互質嗎', ask: '公因數只有 1 嗎？', id: 'co', fixed: true, hints: ['看上一步的公因數。', '公因數只有 1，就是互質。', '除了 1 還有別的公因數，就不是互質。'], think: '老師看：公因數只有 1，就是互質。', together: '一起判斷：互質嗎？',
        q: ctx => `${ctx.problem.x} 和 ${ctx.problem.y} 互質嗎？`, opts: () => [['yes', '互質'], ['no', '不互質']], ans: ctx => ctx.problem.co ? 'yes' : 'no',
        wrong: ctx => ({ msg: ctx.problem.co ? '公因數只有 1，是互質。' : `除了 1，還有 ${ctx.problem.both.slice(1).join('、')} 也是公因數，不互質。` }), say: ex => ex.problem.co ? '公因數只有 1，互質。' : '還有別的公因數，不互質。' }),
      cStep(2, { title: '再判斷一組', ask: '除了 1，還有公因數嗎？', id: 'co2', fixed: true, aid: true, hints: ['想一想兩個數的因數。', '找找看：2、3、5 能不能兩個都整除？', '只有 1 能兩個都整除，就是互質。'], think: '老師試 2、3、5：能不能兩個都整除？', together: '一起判斷：互質嗎？',
        q: ctx => `${ctx.problem.x2} 和 ${ctx.problem.y2} 互質嗎？`, opts: () => [['yes', '互質'], ['no', '不互質']], ans: ctx => gcd(ctx.problem.x2, ctx.problem.y2) === 1 ? 'yes' : 'no',
        wrong: ctx => { const g = gcd(ctx.problem.x2, ctx.problem.y2); return { msg: g === 1 ? '只有 1 能兩個都整除，是互質。' : `${g} 也能兩個都整除，不互質。` }; }, say: ex => gcd(ex.problem.x2, ex.problem.y2) === 1 ? '互質。' : `還有公因數 ${gcd(ex.problem.x2, ex.problem.y2)}，不互質。` })
    ],
    reasons, done: ctx => `${ctx.problem.x} 和 ${ctx.problem.y} ${ctx.problem.co ? '互質' : '不互質'}。`, chant: '公因數只有 1，叫做互質。', transfer: '想一想：相鄰的兩個數（例如 8 和 9）都互質嗎？'
  });

  // =============== 7-3 約分與通分 ===============
  const SIM = { easy: [[6, 8], [4, 10], [6, 9], [8, 12], [10, 15], [9, 12]], standard: [[12, 18], [16, 24], [15, 25], [14, 21], [18, 24], [20, 30]], challenge: [[24, 36], [28, 42], [36, 48], [45, 60], [32, 48], [42, 56]] };
  const COMD = { easy: [[2, 4], [3, 6], [2, 3], [4, 6]], standard: [[4, 6], [6, 9], [6, 8], [3, 4], [4, 10]], challenge: [[6, 8], [8, 12], [6, 9], [9, 12], [6, 10]] };
  A.register('fmSimplify', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [a, b] = any(rand, fromLevel(SIM, level)), g = gcd(a, b), [x, y] = any(rand, fromLevel(COMD, level));
      return { a, b, g, sa: a / g, sb: b / g, x, y, L: lcm(x, y), dims: [a, b, g], prompt: '約分成最簡分數，再通分。' }; },
    planFigure: ctx => `<p class="fm-big">${fracHtml(ctx.problem.a, ctx.problem.b)}</p>`,
    steps: [
      nStep(0, { title: '找最大公因數', ask: '分子分母都能除以它嗎？', id: 'g', aid: true, hints: ['分子和分母的公因數。', '找最大的那一個。', '最大公因數可以一次約到最簡。'], think: '老師找分子和分母的最大公因數。', together: '一起找：最大公因數是多少？',
        figure: ctx => `<p class="fm-big">${fracHtml(ctx.problem.a, ctx.problem.b)}</p>`, pre: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`,
        label: ctx => `${ctx.problem.a} 和 ${ctx.problem.b} 的最大公因數是多少？`, ans: ctx => ctx.problem.g,
        wrong: (ctx, v) => ctx.problem.a % v === 0 && ctx.problem.b % v === 0 ? { obs: 'pickWrongEnd', msg: `${v} 是公因數，可是不是最大的。` } : null, say: ex => `最大公因數是 ${ex.problem.g}。` }),
      { title: '約成最簡分數', ask: '分子分母還有公因數嗎？', ids: ['sa', 'sb'], hints: ['分子和分母都除以最大公因數。', '分子 ÷ 最大公因數；分母 ÷ 最大公因數。', '約完以後，分子分母互質。'], think: '老師把分子分母都除以最大公因數。', together: '一起約：最簡分數是多少？',
        figure: ctx => `<p class="fm-big">${fracHtml(ctx.problem.a, ctx.problem.b)} ＝ ${fracHtml('？', '？')}</p>`,
        answer: ctx => `${fieldHtml(ctx, 'sa', '分子是多少？', 1)}${fieldHtml(ctx, 'sb', '分母是多少？', 1)}`,
        check: ctx => { const p = ctx.problem, x = num(ctx.answers.sa), y = num(ctx.answers.sb); if (x === null || y === null) return { code: 'simp', msg: '分子和分母都要填。' };
          if (x === p.sa && y === p.sb) return null; if (x * p.b === y * p.a) return { code: 'simp', obs: 'pickWrongEnd', msg: '大小對了，可是還可以再約。用最大公因數一次約完。' };
          return { code: 'simp', obs: 'other', msg: `${p.a} ÷ ${p.g}、${p.b} ÷ ${p.g}，再算一次。` }; },
        solve: ctx => { ctx.answers.sa = String(ctx.problem.sa); ctx.answers.sb = String(ctx.problem.sb); }, say: ex => `${ex.problem.a}/${ex.problem.b} ＝ ${ex.problem.sa}/${ex.problem.sb}。` },
      nStep(2, { title: '通分', ask: '分母直接相乘，是最小的嗎？', id: 'L', aid: true, hints: ['通分要找兩個分母的公倍數。', '用最小的公倍數，數字比較小。', '把大的分母一直乘 2、3、4，看小的分母能不能整除。'], think: '老師找兩個分母的最小公倍數，當作公分母。', together: '一起找：公分母最小是多少？',
        figure: ctx => `<p class="fm-big">${fracHtml(1, ctx.problem.x)} ＋ ${fracHtml(1, ctx.problem.y)}</p>`,
        label: ctx => `通分時，${ctx.problem.x} 和 ${ctx.problem.y} 的公分母最小是多少？`, ans: ctx => ctx.problem.L,
        wrong: (ctx, v) => v === ctx.problem.x * ctx.problem.y ? { obs: 'lcmProduct', msg: '分母直接相乘也可以，可是不是最小的。找最小公倍數。' } : null, say: ex => `${ex.problem.x} 和 ${ex.problem.y} 的最小公倍數是 ${ex.problem.L}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.b} 約成 ${ctx.problem.sa}/${ctx.problem.sb}；${ctx.problem.x} 和 ${ctx.problem.y} 通分用 ${ctx.problem.L}。`, chant: '約分用最大公因數，通分用最小公倍數。', transfer: '想一想：一個披薩切成 8 片吃了 4 片，可以說吃了幾分之幾？'
  });
})();

'use strict';
// 第 33 版：分數教材包單元 0～7 的其他活動（2-2、3-2、6-2、7-1 核心活動在 act-frac.js）。圖形和計算在 act-frac.js（window.fracFig）。
// 課綱備註：N-2-10 只用連續量、摺紙只摺半（長方形 2、4、8；圓 2、4）；N-3-9 結果不超過 2、不教帶分數與真假分數名詞；
// N-4-5 帶分數整數倍不強迫化成假分數；N-4-6 異分母限一分母是另一分母的倍數、分小數互換限分母 2、5、10、100；N-4-8 數線分母不大於 5。
(() => {
  const A = window.areaActs, U = A.util, { esc } = U, R = window.fracFig;
  const { rnd, any, gcd, simp, same, denOf, fromLevel, fracHtml, fracText, big, barSVG, pieSVG, shapeSVG, lineSVG, fracAid, nStep, cStep, mStep, fStep, prompt, shown, YN, cmpOpts, cmpKey, THINGS } = R;
  const methods = [['mark', '🍰 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['look', '先看圖'], ['count', '一份一份數'], ['hint', '看提示']];
  // 不平分的切法：每一刀偏一點，最小的一塊至少是平均的一半
  const unequalCuts = (n, rand) => { for (;;) { const c = [0]; for (let j = 1; j < n; j++) c.push(j / n + (rand() - 0.5) * 0.7 / n); c.push(1); c.sort((x, y) => x - y);
    const w = c.slice(1).map((x, j) => x - c[j]); if (Math.min(...w) > 0.45 / n && Math.max(...w) - Math.min(...w) > 0.3 / n) return c; } };
  const mini = svg => svg.replace('class="ac-svg fr-svg"', 'class="ac-svg fr-svg fr-mini"');

  // =============== 0-1 一樣多嗎（先測） ===============
  const SNACK = [['餅乾', '片'], ['草莓', '顆'], ['糖果', '顆'], ['貼紙', '張']];
  A.register('frSame', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [what, u] = any(rand, SNACK), k = rnd(rand, 2, level === 'easy' ? 3 : 4), each = rnd(rand, 2, level === 'easy' ? 4 : 6);
      const x = rnd(rand, 2, 8), y = i % 2 ? x : x + any(rand, [-1, 1]);
      return { what, u, x, y, k, each, t: k * each, dims: [x, y, k * each], prompt: `哥哥拿到 ${x} ${u}${what}，妹妹拿到 ${y} ${u}${what}。` }; },
    planFigure: ctx => big(`${'🍪'.repeat(ctx.problem.x)}<br>${'🍪'.repeat(ctx.problem.y)}`),
    steps: [
      cStep(0, { title: '一樣多嗎', ask: '兩個人分得一樣多嗎？', id: 'same', fixed: true, hints: ['一個一個數一數。', '兩個人的數量比一比。', '數量一樣，才是一樣多。'],
        think: '老師數一數，兩個人的數量比一比。', together: '一起數：一樣多嗎？', pre: prompt, figure: ctx => big(`<span aria-label="哥哥 ${ctx.problem.x} ${ctx.problem.u}">${'🍪'.repeat(ctx.problem.x)}</span><br><span aria-label="妹妹 ${ctx.problem.y} ${ctx.problem.u}">${'🍪'.repeat(ctx.problem.y)}</span>`),
        q: () => '兩個人分得一樣多嗎？', opts: () => [['yes', '一樣多'], ['no', '不一樣多']], ans: ctx => ctx.problem.x === ctx.problem.y ? 'yes' : 'no',
        wrong: () => ({ obs: 'unequalOK', msg: '再數一次，兩個人各有幾個？' }), say: ex => ex.problem.x === ex.problem.y ? '一樣多，是平分。' : '不一樣多，不是平分。' }),
      nStep(1, { title: '平分', ask: '每個人一樣多嗎？', id: 'each', hints: ['一個人一個人輪流發。', `用除法：全部 ÷ 人數。`, '想乘法：人數 × 幾 ＝ 全部？'],
        think: '老師一個人一個人輪流發，發到沒有。', together: '一起分：每人幾個？', pre: ctx => `<p data-read data-say>有 ${ctx.problem.t} ${ctx.problem.u}${ctx.problem.what}，平分給 ${ctx.problem.k} 個人。</p>`,
        label: ctx => `每個人分到幾${ctx.problem.u}？`, ans: ctx => ctx.problem.each, say: ex => `${ex.problem.t} ÷ ${ex.problem.k} ＝ ${ex.problem.each}，每人 ${ex.problem.each} ${ex.problem.u}。` })
    ],
    reasons, done: ctx => `平分給 ${ctx.problem.k} 個人，每人 ${ctx.problem.each} ${ctx.problem.u}。`, chant: '平分：每個人一樣多。', transfer: '想一想：分點心的時候，怎樣才公平？'
  });

  // =============== 0-2 切成一樣大（先測） ===============
  A.register('frCut', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel({ easy: [2, 4], standard: [2, 3, 4], challenge: [3, 4, 6] }, level)), shape = i % 2 ? 'pie' : 'bar';
      return { n, shape, u1: unequalCuts(n, rand), u2: unequalCuts(n, rand), dims: [n], prompt: `要把一個${shape === 'pie' ? '蛋糕' : '長方形的吐司'}切成 ${n} 塊，每一塊一樣大。` }; },
    planFigure: ctx => shapeSVG(ctx.problem.shape, 1, 0, { aria: '一整個，還沒切' }),
    steps: [
      cStep(0, { title: '選切法', ask: '哪一種每塊一樣大？', id: 'cut', hints: ['看每一塊的大小。', '有的切法一塊大一塊小。', '每一塊都一樣大，才是平分。'],
        think: '老師看三種切法，找每一塊都一樣大的。', together: '一起找：哪一種是平分？', pre: prompt,
        q: () => '哪一種切法，每一塊一樣大？', opts: ctx => { const p = ctx.problem, f = c => mini(shapeSVG(p.shape, p.n, 0, { [p.shape === 'pie' ? 'angles' : 'cuts']: c, aria: c ? '一塊大一塊小的切法' : '每一塊一樣大的切法' })); return [['eq', f(null)], ['u1', f(p.u1)], ['u2', f(p.u2)]]; },
        ans: () => 'eq', wrong: () => ({ obs: 'unequalOK', msg: '這一種有的大、有的小，不是平分。' }), say: () => '每一塊一樣大，是平分。' }),
      nStep(1, { title: '數一數', ask: '切成幾塊？', id: 'n', hints: ['一塊一塊數。', '每一塊都要數到。', '數到最後一塊。'],
        think: '老師一塊一塊數。', together: '一起數：幾塊？', figure: ctx => shapeSVG(ctx.problem.shape, ctx.problem.n, 0),
        label: () => '切成幾塊？', ans: ctx => ctx.problem.n, say: ex => `切成 ${ex.problem.n} 塊，一樣大。` })
    ],
    reasons, done: ctx => `平分成 ${ctx.problem.n} 塊，每一塊一樣大。`, chant: '平分：每一塊一樣大。', transfer: '想一想：切披薩的時候，怎樣每塊一樣大？'
  });

  // =============== 1-1 是不是平分 ===============
  A.register('frFair', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel({ easy: [2, 4], standard: [2, 3, 4, 6], challenge: [3, 4, 5, 6, 8] }, level)), t = any(rand, THINGS), fair = i % 2 === 0 ? rand() < 0.5 : i % 4 === 1;
      return { n, t, fair, cuts: fair ? null : unequalCuts(n, rand), dims: [n, fair ? 1 : 0], prompt: `一個${t.n}切成 ${n} 塊。` }; },
    planFigure: ctx => { const p = ctx.problem; return shapeSVG(p.t.shape, p.n, 1, { [p.t.shape === 'pie' ? 'angles' : 'cuts']: p.cuts, aria: `一個${p.t.n}切成 ${p.n} 塊，塗了 1 塊` }); },
    steps: [
      cStep(0, { title: '是不是平分', ask: '每一塊一樣大嗎？', id: 'fair', fixed: true, hints: ['看每一塊的大小。', '把塗色的那一塊和旁邊的比一比。', '每一塊都一樣大，才是平分。'],
        think: '老師把每一塊比一比，看是不是一樣大。', together: '一起比：是平分嗎？', pre: prompt, figure: ctx => A.get('frFair').planFigure(ctx),
        q: () => '這個切法是平分嗎？', opts: () => [['yes', '是平分，每一塊一樣大'], ['no', '不是平分，有大有小']], ans: ctx => ctx.problem.fair ? 'yes' : 'no',
        wrong: ctx => ctx.problem.fair ? { msg: '再看一次：每一塊一樣大。' } : { obs: 'unequalOK', msg: '有的塊比較大、有的比較小，不是平分。' }, say: ex => ex.problem.fair ? '每一塊一樣大，是平分。' : '有大有小，不是平分。' }),
      cStep(1, { title: '可以說幾分之一嗎', ask: '平分了才能用分數說嗎？', id: 'say', fixed: true, hints: ['想一想上一步：是平分嗎？', '平分了，一塊才是幾分之一。', '沒有平分，就不能說幾分之一。'],
        think: '老師想：平分了，塗色的一塊才是幾分之一。', together: '一起想：可以說嗎？', figure: ctx => A.get('frFair').planFigure(ctx),
        q: ctx => `塗色的一塊，可以說是一個${ctx.problem.t.n}的 ${fracText(1, ctx.problem.n)} 嗎？`, opts: ctx => [['yes', `可以，是 ${fracText(1, ctx.problem.n)}`], ['no', '不可以，因為沒有平分']],
        ans: ctx => ctx.problem.fair ? 'yes' : 'no', wrong: ctx => ctx.problem.fair ? { msg: '平分了，一塊就是幾分之一。' } : { obs: 'unequalOK', msg: '沒有平分，就不能說是幾分之一。' },
        say: ex => ex.problem.fair ? `可以，是 ${fracText(1, ex.problem.n)}。` : '不可以，因為沒有平分。' })
    ],
    reasons, done: ctx => ctx.problem.fair ? `平分成 ${ctx.problem.n} 塊，一塊是 ${fracText(1, ctx.problem.n)}。` : '沒有平分，不能說幾分之一。', chant: '平分了，才能說幾分之一。', transfer: '想一想：把一張紙撕成大小不一樣的兩半，可以說是二分之一嗎？'
  });

  // =============== 1-2 摺一摺（N-2-10 備註：只摺半；長方形 2、4、8，圓 2、4） ===============
  A.register('frFold', {
    methods, makeProblem: (level, i, rand = Math.random) => { const shape = i % 3 === 2 ? 'pie' : 'bar', f = shape === 'pie' ? rnd(rand, 1, 2) : rnd(rand, 1, level === 'easy' ? 2 : 3);
      return { shape, f, n: 2 ** f, dims: [f], prompt: `把一張${shape === 'pie' ? '圓形' : '長方形'}的色紙對摺 ${f} 次，再打開。` }; },
    planFigure: ctx => shapeSVG(ctx.problem.shape, 1, 0, { aria: '一張色紙' }),
    steps: [
      nStep(0, { title: '摺一摺', ask: '打開後有幾格？', id: 'n', hints: ['對摺一次，變成 2 格。', '每對摺一次，格子變成 2 倍。', '從 1 格開始，摺幾次就乘幾次 2。'],
        think: '老師一次一次對摺：每摺一次，格子變 2 倍。', together: '一起摺：打開有幾格？', pre: prompt, figure: ctx => shown(ctx, 0) ? shapeSVG(ctx.problem.shape, ctx.problem.n, 0, { aria: '打開後的色紙，摺痕把它分成一樣大的格子，一格一格數數看' }) : shapeSVG(ctx.problem.shape, 1, 0),
        label: () => '打開以後，有幾格一樣大的？', ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === 2 * ctx.problem.f ? { msg: '每摺一次，格子是變成 2 倍，不是多 2 格。' } : null, say: ex => `摺 ${ex.problem.f} 次，有 ${ex.problem.n} 格。` }),
      fStep(1, { title: '一格是多少', ask: '一格是全部的幾分之一？', id: 'f', hints: ['全部有幾格？', '一格是全部的幾分之一。', `全部 □ 格，一格是 1/□。`],
        think: '老師想：全部幾格，一格就是幾分之一。', together: '一起寫：一格是多少？', figure: ctx => shapeSVG(ctx.problem.shape, ctx.problem.n, 1),
        label: () => '塗色的一格是全部的幾分之一？', ans: ctx => [1, ctx.problem.n], say: ex => `一格是 ${fracText(1, ex.problem.n)}。` })
    ],
    reasons, done: ctx => `對摺 ${ctx.problem.f} 次，一格是 ${fracText(1, ctx.problem.n)}。`, chant: '對摺一次變 2 格，再摺一次變 4 格。', transfer: '想一想：一張紙對摺，一半是幾分之一？'
  });

  // =============== 1-3 一格是幾分之一 ===============
  const WORDS = [[2, '一半'], [4, '四分之一']];
  A.register('frUnit', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel({ easy: [2, 3, 4], standard: [2, 3, 4, 6, 8], challenge: [5, 6, 8, 10, 12] }, level)), t = any(rand, THINGS), w = any(rand, WORDS);
      return { n, t, w, dims: [n], prompt: `一個${t.n}平分成好幾塊，塗色的是 1 塊。` }; },
    planFigure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, 1),
    steps: [
      nStep(0, { title: '全部幾格', ask: '一共分成幾格？', id: 'n', hints: ['一格一格數。', '塗色的也要數。', '全部都要數到。'],
        think: '老師一格一格數，全部數完。', together: '一起數：幾格？', pre: prompt, figure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, 1),
        label: () => '一共平分成幾格？', ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === ctx.problem.n - 1 ? { obs: 'partToPart', msg: '塗色的那一格也要數。' } : null, say: ex => `一共 ${ex.problem.n} 格。` }),
      fStep(1, { title: '一格是多少', ask: '一格是幾分之一？', id: 'f', hints: ['全部幾格寫下面。', '一格寫上面：1。', `全部 □ 格，一格是 1/□。`],
        think: '老師寫：全部幾格寫下面，1 格寫上面。', together: '一起寫：一格是多少？', figure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, 1),
        label: ctx => `塗色的 1 格是一個${ctx.problem.t.n}的幾分之幾？`, ans: ctx => [1, ctx.problem.n], say: ex => `${fracText(1, ex.problem.n)}。` }),
      cStep(2, { title: '說說看', ask: '「一半」是幾分之一？', id: 'word', hints: ['一半：分成 2 份的其中 1 份。', '四分之一：分成 4 份的其中 1 份。', '平分成幾份，就是幾分之一。'],
        think: '老師想：一半就是平分成 2 份的 1 份。', together: '一起說：是幾分之一？', figure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.w[0], 1),
        q: ctx => `「${ctx.problem.t.n}的${ctx.problem.w[1]}」是幾分之一？`, opts: () => [['2', fracHtml(1, 2)], ['3', fracHtml(1, 3)], ['4', fracHtml(1, 4)]], ans: ctx => String(ctx.problem.w[0]),
        wrong: () => ({ msg: '一半是分成 2 份；四分之一是分成 4 份。' }), say: ex => `${ex.problem.w[1]}就是 ${fracText(1, ex.problem.w[0])}。` })
    ],
    reasons, done: ctx => `一格是 ${fracText(1, ctx.problem.n)}；${ctx.problem.w[1]}是 ${fracText(1, ctx.problem.w[0])}。`, chant: '平分成幾份，一份就是幾分之一。', transfer: '想一想：一杯果汁喝一半，是喝了幾分之一杯？'
  });

  // =============== 2-1 幾個幾分之一 ===============
  A.register('frCount', {
    methods, makeProblem: (level, i, rand = Math.random) => { const t = any(rand, THINGS), n = denOf(level, rand), k = rnd(rand, 2, n - 1 || 2);
      return { t, n, k: Math.min(k, n - 1), dims: [n, k], prompt: `一個${t.n}平分成 ${n} 塊，塗了幾塊。` }; },
    planFigure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, ctx.problem.k, { labels: ctx.problem.t.shape === 'bar' }),
    steps: [
      fStep(0, { title: '一塊是多少', ask: '一塊是幾分之一？', id: 'u', hints: ['全部平分成幾塊？', '一塊是幾分之一。', `平分成 □ 塊，一塊是 1/□。`],
        think: '老師先找一塊是多少。', together: '一起想：一塊是多少？', pre: prompt, figure: ctx => A.get('frCount').planFigure(ctx),
        label: () => '一塊是幾分之一？', ans: ctx => [1, ctx.problem.n], say: ex => `一塊是 1/${ex.problem.n}。` }),
      nStep(1, { title: '數幾個', ask: '塗了幾個 1/□？', id: 'k', hints: ['數塗色的塊數。', '1 個 1/□、2 個 1/□……', '一邊指一邊數。'],
        think: '老師一塊一塊數：1 個、2 個、3 個……', together: '一起數：塗了幾個？', figure: ctx => A.get('frCount').planFigure(ctx),
        label: ctx => `塗色的是幾個 1/${ctx.problem.n}？`, ans: ctx => ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.n - ctx.problem.k ? { obs: 'partToPart', msg: '要數塗色的。' } : null, say: ex => `${ex.problem.k} 個 1/${ex.problem.n}。` }),
      fStep(2, { title: '寫出來', ask: '幾個 1/□ 是多少？', id: 'f', hints: ['幾個 1/□，就是幾/□。', '個數寫上面。', '分母不變。'],
        think: '老師寫：幾個 1/□ 就是幾/□。', together: '一起寫：是多少？', figure: ctx => A.get('frCount').planFigure(ctx),
        label: () => '塗色的部分是多少？', ans: ctx => [ctx.problem.k, ctx.problem.n], say: ex => `${ex.problem.k} 個 1/${ex.problem.n} 是 ${ex.problem.k}/${ex.problem.n}。` })
    ],
    reasons, done: ctx => `${ctx.problem.k} 個 1/${ctx.problem.n} 是 ${ctx.problem.k}/${ctx.problem.n}。`, chant: '幾分之幾，就是幾個幾分之一。', transfer: '想一想：3/4 是幾個 1/4？'
  });

  // =============== 2-3 合起來是 1 ===============
  A.register('frWhole', {
    methods, makeProblem: (level, i, rand = Math.random) => { const t = any(rand, THINGS), n = denOf(level, rand), k = rnd(rand, 1, n - 1);
      return { t, n, k, dims: [n, k], prompt: `一個${t.n}平分成 ${n} 塊，已經塗了 ${k}/${n}。還要塗多少，才是一整個？` }; },
    planFigure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, ctx.problem.k),
    steps: [
      nStep(0, { title: '一整個是幾塊', ask: '一整個是幾個 1/□？', id: 'n', hints: ['一整個就是全部。', '全部有幾塊？', `□/□ 就是 1。`],
        think: '老師想：一整個就是全部的塊數。', together: '一起數：一整個幾塊？', pre: prompt, figure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, ctx.problem.k),
        label: ctx => `1 個${ctx.problem.t.n}是幾個 1/${ctx.problem.n}？`, ans: ctx => ctx.problem.n, say: ex => `1 ＝ ${ex.problem.n}/${ex.problem.n}，是 ${ex.problem.n} 個 1/${ex.problem.n}。` }),
      nStep(1, { title: '還差幾塊', ask: '還有幾塊沒塗？', id: 'r', hints: ['數沒塗色的。', `全部 － 塗了的。`, '塗了的加還差的，要等於全部。'],
        think: '老師數沒塗色的塊數。', together: '一起數：還差幾塊？', figure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, ctx.problem.k),
        label: () => '還差幾塊？', ans: ctx => ctx.problem.n - ctx.problem.k, say: ex => `還差 ${ex.problem.n - ex.problem.k} 塊。` }),
      fStep(2, { title: '合起來是 1', ask: '合起來真的是 1 嗎？', id: 'f', hints: ['還差幾塊，就是幾/□。', '分母不變。', `${'□'}/□ ＋ 還差的 ＝ 1。`],
        think: '老師寫：還差的部分，合起來就是 1。', together: '一起寫：還要多少？', figure: ctx => shapeSVG(ctx.problem.t.shape, ctx.problem.n, ctx.problem.k, { b: ctx.problem.n - ctx.problem.k }),
        label: ctx => `${ctx.problem.k}/${ctx.problem.n} ＋ ？ ＝ 1`, ans: ctx => [ctx.problem.n - ctx.problem.k, ctx.problem.n],
        wrong: (ctx, [a, b]) => b !== ctx.problem.n && a === ctx.problem.n - ctx.problem.k ? { obs: 'addDen', msg: '分母不變，還是平分成那麼多塊。' } : null, say: ex => `${ex.problem.k}/${ex.problem.n} ＋ ${ex.problem.n - ex.problem.k}/${ex.problem.n} ＝ 1。` })
    ],
    reasons, done: ctx => `${ctx.problem.k}/${ctx.problem.n} ＋ ${ctx.problem.n - ctx.problem.k}/${ctx.problem.n} ＝ ${ctx.problem.n}/${ctx.problem.n} ＝ 1。`, chant: '分子和分母一樣，就是 1 個整體。', transfer: '想一想：一盒披薩切 8 片，吃了 5 片，還剩幾分之幾？'
  });

  // =============== 3-1 誰比較多 ===============
  A.register('frCompare', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      if (i % 2) { const [x, y] = U.shuffle(fromLevel({ easy: [2, 3, 4], standard: [2, 3, 4, 5, 6, 8], challenge: [3, 4, 5, 6, 8, 10, 12] }, level), rand).slice(0, 2);
        return { kind: 'unit', a: 1, b: x, c: 1, d: y, dims: [x, y], prompt: `哥哥吃了 1/${x} 個披薩，妹妹吃了 1/${y} 個一樣大的披薩。誰吃得比較多？` }; }
      const d = Math.max(3, denOf(level, rand)); let a, c; do { a = rnd(rand, 1, d - 1); c = rnd(rand, 1, d - 1); } while (a === c);
      return { kind: 'same', a, b: d, c, d, dims: [d, a, c], prompt: `哥哥吃了 ${a}/${d} 個披薩，妹妹吃了 ${c}/${d} 個一樣大的披薩。誰吃得比較多？` }; },
    planFigure: ctx => { const p = ctx.problem; return `${pieSVG(p.b, p.a, { aria: `哥哥：${p.a}/${p.b}` })}${pieSVG(p.d, p.c, { aria: `妹妹：${p.c}/${p.d}` }).replace(/fr-on"/g, 'fr-on b"')}`; },
    steps: [
      cStep(0, { title: '看哪裡不一樣', ask: '分母一樣，還是分子一樣？', id: 'kind', fixed: true, hints: ['看兩個分數的上面和下面。', '分母一樣：比幾份；分子是 1：比一份多大。', '分母越大，切得越多塊，一塊越小。'],
        think: '老師看：分母一樣就比份數；都是一份，就比一份的大小。', together: '一起看：怎麼比？', pre: ctx => `${prompt(ctx)}${big(`${fracHtml(ctx.problem.a, ctx.problem.b)}　${fracHtml(ctx.problem.c, ctx.problem.d)}`)}`,
        q: () => '要怎麼比？', opts: () => [['same', '分母一樣，比誰的份數多'], ['unit', '都是 1 份，比哪一份比較大']], ans: ctx => ctx.problem.kind,
        wrong: ctx => ({ msg: ctx.problem.kind === 'same' ? '兩個分數下面的數一樣。' : '兩個分數上面都是 1。' }), say: ex => ex.problem.kind === 'same' ? '分母一樣，比份數。' : '都是 1 份，比一份的大小。' }),
      cStep(1, { title: '比一比', ask: '哪一個比較大？', id: 'cmp', hints: ['看圖：誰的塗色部分多？', '分母一樣：分子大的比較多。', '都是 1 份：分母越大，一份越小。'],
        think: '老師看圖比一比塗色的部分。', together: '一起比：誰比較多？', figure: ctx => shown(ctx, 1) ? A.get('frCompare').planFigure(ctx) : '',
        q: () => '哪一個對？', opts: ctx => cmpOpts(`${ctx.problem.a}/${ctx.problem.b}`, `${ctx.problem.c}/${ctx.problem.d}`).slice(0, 2),
        ans: ctx => cmpKey(ctx.problem.a / ctx.problem.b, ctx.problem.c / ctx.problem.d),
        wrong: ctx => ctx.problem.kind === 'unit' ? { obs: 'bigDenBig', msg: '分母越大，切得越多塊，每一塊越小。' } : { msg: '分母一樣，分子大的份數多。' },
        say: ex => { const p = ex.problem; return p.a / p.b > p.c / p.d ? `${p.a}/${p.b} 比較多，哥哥吃得多。` : `${p.c}/${p.d} 比較多，妹妹吃得多。`; } })
    ],
    reasons, done: ctx => { const p = ctx.problem; return p.a / p.b > p.c / p.d ? `${p.a}/${p.b} ＞ ${p.c}/${p.d}，哥哥吃得比較多。` : `${p.a}/${p.b} ＜ ${p.c}/${p.d}，妹妹吃得比較多。`; },
    chant: '分母一樣比分子；分子是 1，分母越大一份越小。', transfer: '想一想：一個蛋糕分給 3 個人和分給 6 個人，哪一種每人分得多？'
  });

  // =============== 3-3 還剩多少 ===============
  A.register('frSub', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = denOf(level, rand), one = i % 2 === 0;
      let a = one ? d : rnd(rand, 2, d - 1), b = rnd(rand, 1, a - 1); if (!one && level !== 'easy' && rand() < 0.5) { a = rnd(rand, d + 1, 2 * d - 1); b = rnd(rand, 1, d - 1); }
      return { d, a, b, one, dims: [d, a, b], prompt: one ? `一條緞帶長 1 公尺，用掉 ${b}/${d} 公尺，還剩多少公尺？` : `一條緞帶長 ${a}/${d} 公尺，用掉 ${b}/${d} 公尺，還剩多少公尺？` }; },
    planFigure: ctx => barSVG(ctx.problem.d, ctx.problem.a, { aria: `緞帶 ${ctx.problem.a}/${ctx.problem.d} 公尺` }),
    steps: [
      nStep(0, { title: '換成幾個', ask: '原來是幾個 1/□？', id: 'na', aid: true, hints: ['看原來有多長。', '1 公尺是幾個 1/□？', '□/□ ＝ 1。'],
        think: '老師把原來的長度換成幾個 1/□。', together: '一起換：原來幾個？', pre: prompt, figure: ctx => A.get('frSub').planFigure(ctx),
        label: ctx => `${ctx.problem.one ? '1 公尺' : `${ctx.problem.a}/${ctx.problem.d} 公尺`}是幾個 1/${ctx.problem.d} 公尺？`, ans: ctx => ctx.problem.a,
        wrong: (ctx, v) => ctx.problem.one && v === 1 ? { msg: `1 公尺平分成 ${ctx.problem.d} 份，是 ${ctx.problem.d} 個 1/${ctx.problem.d}。` } : null, say: ex => `${ex.problem.a} 個 1/${ex.problem.d}。` }),
      nStep(1, { title: '拿走幾個', ask: '剩下幾個？', id: 'left', hints: ['用掉的打叉。', '原來幾個 － 用掉幾個。', '數沒有打叉的。'],
        think: '老師把用掉的打叉，數剩下的。', together: '一起數：剩幾個？', figure: ctx => barSVG(ctx.problem.d, ctx.problem.a, { x: ctx.problem.b }),
        label: ctx => `用掉 ${ctx.problem.b} 個，剩下幾個 1/${ctx.problem.d}？`, ans: ctx => ctx.problem.a - ctx.problem.b, say: ex => `${ex.problem.a} － ${ex.problem.b} ＝ ${ex.problem.a - ex.problem.b}。` }),
      fStep(2, { title: '寫出來', ask: '分母要不要減？', id: 'f', hints: ['每一份的大小沒有變。', '分母不變。', '剩下幾個 1/□，就是幾/□。'],
        think: '老師寫：分母不變，分子是剩下的個數。', together: '一起寫：還剩多少？', figure: ctx => barSVG(ctx.problem.d, ctx.problem.a, { x: ctx.problem.b }),
        label: () => '還剩多少公尺？', ans: ctx => [ctx.problem.a - ctx.problem.b, ctx.problem.d],
        wrong: (ctx, [a, b]) => b === 0 ? { obs: 'addDen', msg: '分母不用減：每一份的大小沒有變。' } : null, say: ex => `還剩 ${ex.problem.a - ex.problem.b}/${ex.problem.d} 公尺。` })
    ],
    reasons, done: ctx => `還剩 ${ctx.problem.a - ctx.problem.b}/${ctx.problem.d} 公尺。`, chant: '同分母相減：分母不變，分子相減；1 先換成 □/□。', transfer: '想一想：一瓶水喝了 2/5，還剩多少？'
  });

  // =============== 4-1 比 1 大的分數（真分數、假分數） ===============
  A.register('frImproper', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6], challenge: [4, 5, 6, 8] }, level)), proper = i % 3 === 0;
      let n; do n = proper ? rnd(rand, 1, d - 1) : rnd(rand, d + 1, (level === 'challenge' ? 3 : 2) * d - 1); while (n % d === 0);
      return { d, n, proper, shape: any(rand, ['pie', 'bar']), dims: [d, n], prompt: '每一個圖是 1 個整體。塗色的一共是多少？' }; },
    planFigure: ctx => shapeSVG(ctx.problem.shape, ctx.problem.d, ctx.problem.n, { wholes: Math.max(1, Math.ceil(ctx.problem.n / ctx.problem.d)) }),
    steps: [
      nStep(0, { title: '一個分成幾份', ask: '1 個整體分成幾份？', id: 'd', hints: ['只看一個圖。', '一個圖平分成幾份？', '分母是「1 個」分成的份數，不是全部圖加起來。'],
        think: '老師只看一個圖：1 個整體平分成幾份。', together: '一起數：1 個分成幾份？', pre: prompt, figure: ctx => A.get('frImproper').planFigure(ctx),
        label: () => '1 個整體平分成幾份？', ans: ctx => ctx.problem.d,
        wrong: (ctx, v) => v === ctx.problem.d * Math.ceil(ctx.problem.n / ctx.problem.d) && v !== ctx.problem.d ? { obs: 'wrongWhole', msg: '只要看 1 個圖。每一個圖都是 1 個整體。' } : null, say: ex => `1 個分成 ${ex.problem.d} 份。` }),
      nStep(1, { title: '一共塗幾份', ask: '全部圖塗了幾份？', id: 'n', hints: ['每個圖塗色的都要數。', '第一個數完，接著數第二個。', '一共是幾個 1/□。'],
        think: '老師把每個圖塗色的都數進去。', together: '一起數：一共幾份？', figure: ctx => A.get('frImproper').planFigure(ctx),
        label: ctx => `塗色的一共是幾個 1/${ctx.problem.d}？`, ans: ctx => ctx.problem.n, say: ex => `一共 ${ex.problem.n} 個 1/${ex.problem.d}。` }),
      fStep(2, { title: '寫出來', ask: '是多少？', id: 'f', hints: ['幾個 1/□，就是幾/□。', '分子可以比分母大。', '分母還是 1 個分成的份數。'],
        think: '老師寫：一共幾個 1/□，就寫幾/□。', together: '一起寫：塗色的是多少？', figure: ctx => A.get('frImproper').planFigure(ctx),
        label: () => '塗色的一共是多少？寫成分數。', ans: ctx => [ctx.problem.n, ctx.problem.d],
        wrong: (ctx, [a, b]) => a === ctx.problem.n && b > ctx.problem.d ? { obs: 'wrongWhole', msg: '分母是 1 個整體分成的份數。' } : null, say: ex => `${ex.problem.n}/${ex.problem.d}。` }),
      cStep(3, { title: '真分數還是假分數', ask: '分子比分母大嗎？', id: 'kind', fixed: true, hints: ['比一比分子和分母。', '分子比分母小：真分數，比 1 小。', '分子比分母大（或一樣）：假分數，比 1 大（或等於 1）。'],
        think: '老師比分子和分母：分子小是真分數，分子大是假分數。', together: '一起想：是哪一種？',
        q: ctx => `${ctx.problem.n}/${ctx.problem.d} 是哪一種分數？`, opts: () => [['proper', '真分數（比 1 小）'], ['improper', '假分數（等於或比 1 大）']], ans: ctx => ctx.problem.proper ? 'proper' : 'improper',
        wrong: () => ({ msg: '比一比分子和分母誰大。' }), say: ex => ex.problem.proper ? '分子比分母小，是真分數。' : '分子比分母大，是假分數。' })
    ],
    reasons, done: ctx => `塗色的是 ${ctx.problem.n}/${ctx.problem.d}，是${ctx.problem.proper ? '真' : '假'}分數。`, chant: '分子比分母小是真分數；分子等於或大於分母是假分數。', transfer: '想一想：吃了一個半披薩，用分數怎麼說？'
  });

  // =============== 4-2 假分數和帶分數 ===============
  A.register('frMixed', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6], challenge: [4, 5, 6, 8, 9] }, level)), w = rnd(rand, 1, level === 'easy' ? 2 : 3), r = rnd(rand, 1, d - 1), toMixed = i % 2 === 0;
      return { d, w, r, n: w * d + r, toMixed, dims: [d, w, r], prompt: toMixed ? `把 ${w * d + r}/${d} 換成帶分數。` : `把 ${w} 又 ${r}/${d} 換成假分數。` }; },
    planFigure: ctx => barSVG(ctx.problem.d, ctx.problem.n, { aria: `${ctx.problem.n} 個 1/${ctx.problem.d}` }),
    steps: [
      nStep(0, { title: '整的有幾個', ask: '拼成幾個整的？', id: 'w', aid: true, hints: [`${'□'} 個 1/□ 拼成 1 個整的。`, '看圖：塗滿的長條有幾條？', '用除法：分子 ÷ 分母，商就是整的個數。'],
        think: '老師把每 □ 個拼成 1 個整的，看拼了幾個。', together: '一起拼：幾個整的？', pre: ctx => `${prompt(ctx)}${big(ctx.problem.toMixed ? fracHtml(ctx.problem.n, ctx.problem.d) : fracHtml(ctx.problem.r, ctx.problem.d, ctx.problem.w))}`, figure: ctx => shown(ctx, 0) ? A.get('frMixed').planFigure(ctx) : '',
        label: ctx => ctx.problem.toMixed ? `${ctx.problem.n}/${ctx.problem.d} 可以拼成幾個整的？` : `${ctx.problem.w} 個整的，是幾個 1/${ctx.problem.d}？`, ans: ctx => ctx.problem.toMixed ? ctx.problem.w : ctx.problem.w * ctx.problem.d,
        wrong: (ctx, v) => !ctx.problem.toMixed && v === ctx.problem.w ? { obs: 'mixedConvert', msg: `1 個整的是 ${ctx.problem.d} 個 1/${ctx.problem.d}，要乘。` } : null,
        say: ex => ex.problem.toMixed ? `拼成 ${ex.problem.w} 個整的。` : `${ex.problem.w} × ${ex.problem.d} ＝ ${ex.problem.w * ex.problem.d} 個。` }),
      nStep(1, { title: '剩下的', ask: '還有幾份？', id: 'r', hints: ['拼完以後，看還剩幾份。', '剩下的一定比分母小。', '整的以外，再加上分數的部分。'],
        think: '老師看拼完以後剩下的份數。', together: '一起數：剩下幾份？', figure: ctx => A.get('frMixed').planFigure(ctx),
        label: ctx => ctx.problem.toMixed ? '拼完整的以後，還剩幾個 1/□？' : `再加上 ${ctx.problem.r} 個，一共幾個 1/${ctx.problem.d}？`, ans: ctx => ctx.problem.toMixed ? ctx.problem.r : ctx.problem.n,
        wrong: (ctx, v) => !ctx.problem.toMixed && v === ctx.problem.w + ctx.problem.r ? { obs: 'mixedConvert', msg: '整數要先乘分母，再加分子。' } : null,
        say: ex => ex.problem.toMixed ? `還剩 ${ex.problem.r} 個。` : `${ex.problem.w * ex.problem.d} ＋ ${ex.problem.r} ＝ ${ex.problem.n} 個。` }),
      fStep(2, { title: '寫出來', ask: '寫對了嗎？', id: 'f', hints: ['用上兩步的數。', '帶分數：整數寫前面，剩下的寫成分數。', '假分數：一共幾個 1/□，就是幾/□。'],
        think: '老師把答案寫出來。', together: '一起寫：答案是多少？', figure: ctx => A.get('frMixed').planFigure(ctx),
        label: ctx => ctx.problem.toMixed ? '寫成帶分數。' : '寫成假分數。', ans: ctx => ctx.problem.toMixed ? [ctx.problem.w, ctx.problem.r, ctx.problem.d] : [ctx.problem.n, ctx.problem.d],
        wrong: (ctx, v) => (!ctx.problem.toMixed && v[0] === ctx.problem.w + ctx.problem.r) || (ctx.problem.toMixed && v[0] !== ctx.problem.w) ? { obs: 'mixedConvert', msg: '整的個數再看一次。' } : null,
        say: ex => ex.problem.toMixed ? `${ex.problem.n}/${ex.problem.d} ＝ ${ex.problem.w} 又 ${ex.problem.r}/${ex.problem.d}。` : `${ex.problem.w} 又 ${ex.problem.r}/${ex.problem.d} ＝ ${ex.problem.n}/${ex.problem.d}。` })
    ],
    reasons, done: ctx => `${ctx.problem.n}/${ctx.problem.d} ＝ ${ctx.problem.w} 又 ${ctx.problem.r}/${ctx.problem.d}。`, chant: '假分數換帶分數：拼成整的，剩下的寫分數。帶分數換假分數：整數乘分母再加分子。', transfer: '想一想：7/4 個披薩，是幾個又幾分之幾個？'
  });
  // 帶分數的格子：fStep 的 o.whole 要依題目決定，所以 4-2 最後一步另外處理
  { const pl = A.get('frMixed'), last = pl.steps[2], mixedLast = fStep(2, { ...last, id: 'fm', whole: true, label: () => '寫成帶分數。', ans: ctx => [ctx.problem.w, ctx.problem.r, ctx.problem.d], wrong: null, say: last.say }), impLast = fStep(2, { ...last, id: 'fi', label: () => '寫成假分數。', ans: ctx => [ctx.problem.n, ctx.problem.d], wrong: (ctx, v) => v[0] === ctx.problem.w + ctx.problem.r ? { obs: 'mixedConvert', msg: '整數要先乘分母，再加分子。' } : null, say: last.say });
    const pick = ctx => ctx.problem.toMixed ? mixedLast : impLast;
    pl.steps[2] = { ...last, ids: ['fmW', 'fmN', 'fmD', 'fiN', 'fiD'], answer: ctx => pick(ctx).answer(ctx), check: ctx => pick(ctx).check(ctx), solve: ctx => pick(ctx).solve(ctx) }; }

  // =============== 4-3 排排看 ===============
  A.register('frOrder', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6], challenge: [5, 6, 8, 10] }, level));
      const ns = []; while (ns.length < 3) { const n = rnd(rand, 1, 3 * d - 1); if (!ns.includes(n)) ns.push(n); }
      const show = ns.map((n, k) => n > d && n % d && (k + i) % 2 ? [n % d, d, Math.floor(n / d)] : [n, d, 0]);
      return { d, ns, show, dims: [d, ...ns], prompt: '這三個數，哪一個最大？哪一個最小？' }; },
    planFigure: ctx => big(ctx.problem.show.map(s => fracHtml(...s)).join('　')),
    steps: [0, 1].map(k => cStep(k, { title: k ? '最小的' : '最大的', ask: k ? '哪一個最小？' : '哪一個最大？', id: k ? 'min' : 'max', aid: true, hints: ['都換成幾個 1/□ 再比。', '帶分數：整數 × 分母 ＋ 分子。', '個數最多的最大，最少的最小。'],
      think: '老師把每一個都換成幾個 1/□，再比個數。', together: k ? '一起找：最小的是哪一個？' : '一起找：最大的是哪一個？', pre: k ? null : prompt, figure: ctx => shown(ctx, k) ? barSVG(ctx.problem.d, Math.max(...ctx.problem.ns), { aria: '分數長條' }) : '',
      q: () => k ? '哪一個最小？' : '哪一個最大？', opts: ctx => ctx.problem.show.map((s, j) => [String(j), fracHtml(...s)]),
      ans: ctx => String(ctx.problem.ns.indexOf((k ? Math.min : Math.max)(...ctx.problem.ns))),
      wrong: (ctx, a) => { const s = ctx.problem.show[Number(a)]; return s && s[2] ? { obs: 'mixedConvert', msg: '帶分數前面的整數也要算進去。' } : { msg: '都換成幾個 1/□ 再比。' }; },
      say: ex => { const n = (k ? Math.min : Math.max)(...ex.problem.ns), s = ex.problem.show[ex.problem.ns.indexOf(n)]; return `${k ? '最小' : '最大'}的是 ${fracText(s[0], s[1], s[2])}（${n} 個 1/${ex.problem.d}）。`; } })),
    reasons, done: ctx => { const p = ctx.problem, s = n => p.show[p.ns.indexOf(n)]; return `最大 ${fracText(...s(Math.max(...p.ns)))}，最小 ${fracText(...s(Math.min(...p.ns)))}。`; },
    chant: '同分母比大小：都換成幾個 1/□，再比個數。', transfer: '想一想：跑步 2 又 1/4 圈和 9/4 圈，哪一個遠？'
  });

  // =============== 5-1 帶分數加減 ===============
  A.register('frMixAdd', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [3, 4], standard: [4, 5, 6, 8], challenge: [6, 7, 8, 9, 10] }, level)), add = i % 2 === 0, regroup = level !== 'easy' && (i % 4 >= 2);
      let w1 = rnd(rand, 1, 4), w2 = rnd(rand, 1, 3), r1, r2;
      do { r1 = rnd(rand, 1, d - 1); r2 = rnd(rand, 1, d - 1); } while (add ? (regroup ? r1 + r2 <= d : r1 + r2 >= d) : (regroup ? r1 >= r2 : r1 < r2));
      if (!add && w1 <= w2) w1 = w2 + 1;
      const t = add ? (w1 + w2) * d + r1 + r2 : (w1 - w2) * d + r1 - r2;
      return { d, w1, w2, r1, r2, add, regroup, t, W: Math.floor(t / d), Rr: t % d, dims: [d, w1, r1, w2, r2], prompt: add ? `麵粉有 ${w1} 又 ${r1}/${d} 杯，再加 ${w2} 又 ${r2}/${d} 杯，一共幾杯？` : `麵粉有 ${w1} 又 ${r1}/${d} 杯，用掉 ${w2} 又 ${r2}/${d} 杯，還剩幾杯？` }; },
    planFigure: ctx => { const p = ctx.problem; return big(`${fracHtml(p.r1, p.d, p.w1)} ${p.add ? '＋' : '－'} ${fracHtml(p.r2, p.d, p.w2)}`); },
    steps: [
      cStep(0, { title: '分數夠不夠', ask: '分數部分要換嗎？', id: 'need', fixed: true, hints: ['先看分數的部分。', '加法：分子加起來有沒有超過分母？減法：分子夠不夠減？', '超過了要換成 1 個整的；不夠減，要拿 1 個整的換成 □/□。'],
        think: '老師先看分數部分：加起來會不會滿 1、夠不夠減。', together: '一起看：要不要換？', pre: prompt, figure: ctx => A.get('frMixAdd').planFigure(ctx),
        q: ctx => ctx.problem.add ? `${ctx.problem.r1}/${ctx.problem.d} ＋ ${ctx.problem.r2}/${ctx.problem.d}，會滿 1 嗎？` : `${ctx.problem.r1}/${ctx.problem.d} 夠減 ${ctx.problem.r2}/${ctx.problem.d} 嗎？`,
        opts: ctx => ctx.problem.add ? [['yes', '會滿 1，要換成整的'], ['no', '不會滿 1']] : [['no', '夠減'], ['yes', '不夠減，要拿 1 換成分數']], ans: ctx => ctx.problem.regroup ? 'yes' : 'no',
        wrong: ctx => ctx.problem.add ? { msg: '比一比：分子加起來和分母誰大？' } : { obs: 'borrowWhole', msg: '比一比兩個分子，誰比較大？' }, say: ex => ex.problem.regroup ? (ex.problem.add ? '會滿 1，要換成 1 個整的。' : '不夠減，拿 1 個整的換成分數。') : '不用換。' }),
      mStep(1, { title: '整數和分數分開算', ask: '整數和分數各是多少？', aid: true, hints: ['整數和整數算，分數和分數算。', '有換的時候，記得整數要加 1（或減 1），分子要減掉（或加上）分母。', '分子算出來要比分母小。'],
        think: '老師把整數和分數分開算，有換的時候跟著調整。', together: '一起算：整數和分數各是多少？', figure: ctx => A.get('frMixAdd').planFigure(ctx),
        fields: [['W', () => '整數部分是多少？', ctx => ctx.problem.W, (ctx, v) => !ctx.problem.add && ctx.problem.regroup && v === ctx.problem.w1 - ctx.problem.w2 ? { obs: 'borrowWhole', msg: '拿了 1 個整的換成分數，整數要少 1。' } : ctx.problem.add && ctx.problem.regroup && v === ctx.problem.w1 + ctx.problem.w2 ? { msg: '分數滿 1，整數要多 1。' } : null],
          ['R', ctx => `分數部分的分子是多少？（分母是 ${ctx.problem.d}）`, ctx => ctx.problem.Rr, (ctx, v) => !ctx.problem.add && ctx.problem.regroup && v === ctx.problem.r2 - ctx.problem.r1 ? { obs: 'borrowWhole', msg: '不夠減不能倒過來減。要拿 1 換成 □/□ 再減。' } : ctx.problem.add && v === ctx.problem.r1 + ctx.problem.r2 ? { obs: 'mixedConvert', msg: '分子比分母大，要拿出 1 個整的。' } : null]],
        say: ex => `整數 ${ex.problem.W}，分數 ${ex.problem.Rr}/${ex.problem.d}。` }),
      fStep(2, { title: '寫出來', ask: '整數、分數都寫了嗎？', id: 'f', whole: true, hints: ['整數寫前面。', '分數的分子要比分母小。', '用上一步算出來的數。'],
        think: '老師把答案寫成帶分數。', together: '一起寫：答案是多少？', label: ctx => ctx.problem.add ? '一共幾杯？' : '還剩幾杯？', ans: ctx => [ctx.problem.W, ctx.problem.Rr, ctx.problem.d],
        say: ex => `${ex.problem.W} 又 ${ex.problem.Rr}/${ex.problem.d} 杯。` })
    ],
    reasons, done: ctx => `${ctx.problem.add ? '一共' : '還剩'} ${ctx.problem.W} 又 ${ctx.problem.Rr}/${ctx.problem.d} 杯。`, chant: '帶分數加減：整數和整數算，分數和分數算；滿了換 1，不夠拿 1。', transfer: '想一想：做蛋糕時，量杯不夠一杯，怎麼記？'
  });
  // 5-1：分子剛好是 0 的情況不出現（題目產生時避開）
  { const pl = A.get('frMixAdd'), mk = pl.makeProblem; pl.makeProblem = (level, i, rand = Math.random, o) => { for (let k = 0; k < 40; k++) { const p = mk(level, i, rand, o); if (p.Rr > 0 && p.W > 0) return p; } return mk(level, i, rand, o); }; }

  // =============== 5-2 幾個一樣的分數（整數倍） ===============
  A.register('frTimes', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6, 8], challenge: [5, 6, 7, 8, 9, 10] }, level)), a = rnd(rand, 1, d - 1), k = rnd(rand, 2, level === 'easy' ? 3 : 5);
      return { d, a, k, n: a * k, dims: [d, a, k], prompt: `小安每天喝 ${a}/${d} 瓶牛奶，${k} 天一共喝了幾瓶？` }; },
    planFigure: ctx => barSVG(ctx.problem.d, ctx.problem.n, { aria: `${ctx.problem.k} 個 ${ctx.problem.a}/${ctx.problem.d}` }),
    steps: [
      nStep(0, { title: '一共幾個 1/□', ask: '幾個 1/□？', id: 'n', aid: true, hints: [`每天 ${'□'} 個 1/□。`, '幾天就是幾個一樣多：用乘的。', '每天的個數 × 天數。'],
        think: '老師算：每天幾個 1/□，乘以天數。', together: '一起算：一共幾個？', pre: ctx => `${prompt(ctx)}${big(`${fracHtml(ctx.problem.a, ctx.problem.d)} × ${ctx.problem.k}`)}`, figure: ctx => shown(ctx, 0) ? A.get('frTimes').planFigure(ctx) : '',
        label: ctx => `一共是幾個 1/${ctx.problem.d}？`, ans: ctx => ctx.problem.n, say: ex => `${ex.problem.a} × ${ex.problem.k} ＝ ${ex.problem.n} 個。` }),
      fStep(1, { title: '寫出來', ask: '分母要不要乘？', id: 'f', hints: ['每一份的大小沒有變。', '分母不變，分子乘。', '一共幾個 1/□，就是幾/□。'],
        think: '老師寫：分母不變，分子乘以天數。', together: '一起寫：一共喝了多少？', figure: ctx => A.get('frTimes').planFigure(ctx),
        label: () => '一共喝了幾瓶？寫成分數（可以是假分數）。', ans: ctx => [ctx.problem.n, ctx.problem.d], equiv: true,
        wrong: (ctx, [a, b]) => b === ctx.problem.d * ctx.problem.k ? { obs: 'addDen', msg: '分母不用乘：每一份的大小沒變。' } : null, say: ex => `${ex.problem.n}/${ex.problem.d} 瓶。` }),
      cStep(2, { title: '檢查', ask: '比 1 瓶多還是少？', id: 'one', fixed: true, hints: ['分子和分母比一比。', '分子比分母大，就超過 1 瓶。', '看圖：塗色的超過一條了嗎？'],
        think: '老師檢查：喝的有沒有超過 1 瓶。', together: '一起檢查：比 1 瓶多嗎？', figure: ctx => A.get('frTimes').planFigure(ctx),
        q: ctx => `${ctx.problem.n}/${ctx.problem.d} 瓶和 1 瓶比？`, opts: () => [['lt', '比 1 瓶少'], ['eq', '剛好 1 瓶'], ['gt', '比 1 瓶多']], ans: ctx => cmpKey(ctx.problem.n, ctx.problem.d),
        wrong: () => ({ msg: '分子和分母比一比。' }), say: ex => ex.problem.n > ex.problem.d ? '比 1 瓶多。' : ex.problem.n === ex.problem.d ? '剛好 1 瓶。' : '比 1 瓶少。' })
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.d} × ${ctx.problem.k} ＝ ${ctx.problem.n}/${ctx.problem.d}，一共 ${ctx.problem.n}/${ctx.problem.d} 瓶。`, chant: '分數的整數倍：分母不變，分子乘。', transfer: '想一想：每次用 3/4 杯米，煮 4 次要幾杯？'
  });

  // =============== 5-3 應用題 ===============
  const WORD = [
    { op: 'add', t: (a, b, d) => `媽媽買了 ${a}/${d} 公斤的葡萄，爸爸又買了 ${b}/${d} 公斤。一共有幾公斤？`, u: '公斤' },
    { op: 'sub', t: (a, b, d) => `一壺水有 ${a}/${d} 公升，倒掉 ${b}/${d} 公升。還剩幾公升？`, u: '公升' },
    { op: 'mul', t: (a, b, d, k) => `每個同學分到 ${a}/${d} 張色紙，${k} 個同學一共分到幾張？`, u: '張' },
    { op: 'add', t: (a, b, d) => `小安早上跑了 ${a}/${d} 公里，下午跑了 ${b}/${d} 公里。一共跑了幾公里？`, u: '公里' },
    { op: 'sub', t: (a, b, d) => `一條繩子長 ${a}/${d} 公尺，剪掉 ${b}/${d} 公尺。還剩幾公尺？`, u: '公尺' }
  ];
  A.register('frWord', {
    methods, makeProblem: (level, i, rand = Math.random) => { const w = WORD[(i + rnd(rand, 0, WORD.length - 1)) % WORD.length], d = any(rand, fromLevel({ easy: [3, 4], standard: [4, 5, 6, 8], challenge: [6, 7, 8, 9, 10, 12] }, level)), k = rnd(rand, 2, 4);
      let a, b; do { a = rnd(rand, 2, 2 * d - 1); b = rnd(rand, 1, d - 1); } while (w.op === 'sub' ? a <= b : w.op === 'mul' ? a >= d : false);
      const n = w.op === 'add' ? a + b : w.op === 'sub' ? a - b : a * k;
      return { w, d, a, b, k, n, op: w.op, dims: [d, a, b], prompt: w.t(a, b, d, k) }; },
    planFigure: ctx => '',
    steps: [
      cStep(0, { title: '選算式', ask: '要加、減，還是乘？', id: 'op', hints: ['找關鍵字：「又、一共」、「還剩」、「每個……幾個」。', '合起來用加；拿走用減；好幾個一樣多用乘。', '想一想題目裡發生了什麼事。'],
        think: '老師讀題目，找關鍵字決定算式。', together: '一起選：用什麼算？', pre: prompt,
        q: () => '這一題要用什麼算？', opts: ctx => { const p = ctx.problem; return [['add', `${p.a}/${p.d} ＋ ${p.b}/${p.d}`], ['sub', `${p.a}/${p.d} － ${p.b}/${p.d}`], ['mul', `${p.a}/${p.d} × ${p.k}`]].filter(o => p.op === 'mul' ? o[0] !== 'sub' : o[0] !== 'mul'); }, ans: ctx => ctx.problem.op,
        wrong: () => ({ msg: '再讀一次題目：是合起來、拿走，還是好幾個一樣多？' }), say: ex => ({ add: '合起來，用加。', sub: '拿走，用減。', mul: '好幾個一樣多，用乘。' })[ex.problem.op] }),
      fStep(1, { title: '算出來', ask: '分母有沒有變？', id: 'f', aid: true, hints: ['同分母：分母不變。', '加減：分子加減；乘：分子乘。', '答案可以是假分數。'],
        think: '老師算：分母不變，只算分子。', together: '一起算：答案是多少？',
        label: ctx => `答案是幾${ctx.problem.w.u}？`, ans: ctx => [ctx.problem.n, ctx.problem.d], equiv: true,
        wrong: (ctx, [a, b]) => b !== ctx.problem.d && a === ctx.problem.n ? { obs: 'addDen', msg: '分母不變。' } : null, say: ex => `${ex.problem.n}/${ex.problem.d} ${ex.problem.w.u}。` })
    ],
    reasons, done: ctx => `答案是 ${ctx.problem.n}/${ctx.problem.d} ${ctx.problem.w.u}。`, chant: '應用題：先選算式，再算；同分母，分母不變。', transfer: '想一想：生活中什麼時候會把分數加起來？'
  });

  // =============== 6-1 一樣多（等值分數） ===============
  A.register('frEquiv', {
    methods, makeProblem: (level, i, rand = Math.random) => { let b, a, m; do { b = any(rand, [2, 3, 4, 5, 6]); a = rnd(rand, 1, b - 1); m = rnd(rand, 2, level === 'challenge' ? 4 : 3); } while (gcd(a, b) > 1 || b * m > (level === 'easy' ? 8 : 12));
      return { a, b, m, dims: [a, b, m], prompt: `兩條一樣長的巧克力，一條平分成 ${b} 份，一條平分成 ${b * m} 份。` }; },
    planFigure: ctx => `${barSVG(ctx.problem.b, ctx.problem.a)}${barSVG(ctx.problem.b * ctx.problem.m, ctx.problem.a * ctx.problem.m).replace(/fr-on"/g, 'fr-on b"')}`,
    steps: [
      cStep(0, { title: '一樣長嗎', ask: '塗色的部分一樣長嗎？', id: 'same', fixed: true, hints: ['看兩條的塗色部分，右邊對齊嗎？', '兩條一樣長，塗色的也一樣長。', '一樣長就是一樣大。'],
        think: '老師把兩條疊在一起比，塗色的一樣長。', together: '一起比：一樣長嗎？', pre: prompt, figure: ctx => A.get('frEquiv').planFigure(ctx),
        q: () => '兩條塗色的部分一樣長嗎？', opts: () => [['yes', '一樣長'], ['no', '不一樣長']], ans: () => 'yes', wrong: () => ({ obs: 'equivAdd', msg: '看塗色部分的右邊：對齊了，一樣長。' }), say: () => '一樣長，一樣大。' }),
      nStep(1, { title: '找分子', ask: '下面那條塗了幾份？', id: 'n', aid: true, hints: ['數下面那條塗色的份數。', '每一份都切成幾小份？分子也乘那麼多。', `${'□'} × □。`],
        think: '老師數下面那條塗色的份數，也可以用乘的。', together: '一起數：塗了幾份？', figure: ctx => A.get('frEquiv').planFigure(ctx),
        label: ctx => `${ctx.problem.a}/${ctx.problem.b} ＝ □/${ctx.problem.b * ctx.problem.m}，□ 是多少？`, ans: ctx => ctx.problem.a * ctx.problem.m,
        wrong: (ctx, v) => v === ctx.problem.a + (ctx.problem.b * ctx.problem.m - ctx.problem.b) ? { obs: 'equivAdd', msg: '分母乘了幾，分子也要乘幾，不是加。' } : null, say: ex => `${ex.problem.a}/${ex.problem.b} ＝ ${ex.problem.a * ex.problem.m}/${ex.problem.b * ex.problem.m}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.b} ＝ ${ctx.problem.a * ctx.problem.m}/${ctx.problem.b * ctx.problem.m}。`, chant: '一樣長，就是一樣大：等值分數。', transfer: '想一想：半杯和 2/4 杯，哪一個多？'
  });

  // =============== 6-3 簡單異分母（一分母是另一分母的倍數） ===============
  A.register('frEasyDiff', {
    methods, makeProblem: (level, i, rand = Math.random) => { let b, m, a, c; do { b = any(rand, [2, 3, 4, 5, 6]); m = rnd(rand, 2, 3); a = rnd(rand, 1, b - 1); c = rnd(rand, 1, b * m - 1); } while (b * m > (level === 'easy' ? 8 : 12) || a * m === c);
      const kind = ['cmp', 'add', 'sub'][i % 3]; let D = b * m;
      if (kind === 'sub' && a * m <= c) { const t = a; a = Math.ceil((c + 1) / m); if (a >= b) { a = t; c = rnd(rand, 1, a * m - 1); } }
      if (kind === 'add' && level === 'easy' && a * m + c > D) c = rnd(rand, 1, D - a * m) || 1;
      return { a, b, c, D, m, kind, dims: [b, D, a, c], prompt: kind === 'cmp' ? `${a}/${b} 和 ${c}/${D}，哪一個比較大？` : kind === 'add' ? `${a}/${b} ＋ ${c}/${D} ＝ ？` : `${a}/${b} － ${c}/${D} ＝ ？` }; },
    planFigure: ctx => `${barSVG(ctx.problem.b, ctx.problem.a)}${barSVG(ctx.problem.D, ctx.problem.c).replace(/fr-on"/g, 'fr-on b"')}`,
    steps: [
      nStep(0, { title: '換成同分母', ask: '換成一樣的分母了嗎？', id: 'n', aid: true, hints: [`${'□'} 是 □ 的幾倍？`, '分母乘幾，分子也乘幾。', '換成分母比較大的那一個。'],
        think: '老師把分母小的換成分母大的：分子分母乘同一個數。', together: '一起換：分子是多少？', pre: prompt, figure: ctx => shown(ctx, 0) ? `${barSVG(ctx.problem.b, ctx.problem.a, { sub: ctx.problem.m })}${barSVG(ctx.problem.D, ctx.problem.c).replace(/fr-on"/g, 'fr-on b"')}` : A.get('frEasyDiff').planFigure(ctx),
        label: ctx => `${ctx.problem.a}/${ctx.problem.b} ＝ □/${ctx.problem.D}，□ 是多少？`, ans: ctx => ctx.problem.a * ctx.problem.m,
        wrong: (ctx, v) => v === ctx.problem.a + ctx.problem.D - ctx.problem.b ? { obs: 'equivAdd', msg: '分子分母要乘同一個數，不是加。' } : null, say: ex => `${ex.problem.a}/${ex.problem.b} ＝ ${ex.problem.a * ex.problem.m}/${ex.problem.D}。` }),
      { ...fStep(1, { title: '算出來', ask: '分母一樣了，可以算了嗎？', id: 'f', hints: ['分母一樣了，只算分子。', '加：分子加；減：分子減。', '分母不變。'],
        think: '老師用一樣的分母算。', together: '一起算：答案是多少？', figure: ctx => `${barSVG(ctx.problem.b, ctx.problem.a, { sub: ctx.problem.m })}${barSVG(ctx.problem.D, ctx.problem.c).replace(/fr-on"/g, 'fr-on b"')}`,
        label: ctx => ctx.problem.kind === 'add' ? `${ctx.problem.a * ctx.problem.m}/${ctx.problem.D} ＋ ${ctx.problem.c}/${ctx.problem.D} ＝ ？` : `${ctx.problem.a * ctx.problem.m}/${ctx.problem.D} － ${ctx.problem.c}/${ctx.problem.D} ＝ ？`,
        ans: ctx => [ctx.problem.kind === 'add' ? ctx.problem.a * ctx.problem.m + ctx.problem.c : ctx.problem.a * ctx.problem.m - ctx.problem.c, ctx.problem.D], equiv: true,
        wrong: (ctx, [a, b]) => b === ctx.problem.b + ctx.problem.D || (ctx.problem.kind === 'add' && a === ctx.problem.a + ctx.problem.c) ? { obs: 'addAcross', msg: '分母不一樣不能直接加。先換成一樣的分母，分母不變。' } : null,
        say: ex => { const p = ex.problem, n = p.kind === 'add' ? p.a * p.m + p.c : p.a * p.m - p.c; return `答案是 ${n}/${p.D}。`; } }) }
    ],
    reasons, done: ctx => { const p = ctx.problem; if (p.kind === 'cmp') return `${p.a}/${p.b} ＝ ${p.a * p.m}/${p.D}，${p.a * p.m > p.c ? `${p.a}/${p.b} 比較大` : `${p.c}/${p.D} 比較大`}。`; const n = p.kind === 'add' ? p.a * p.m + p.c : p.a * p.m - p.c; return `答案是 ${n}/${p.D}。`; },
    chant: '分母不一樣：先換成一樣的分母，再比或再算。', transfer: '想一想：1/2 杯牛奶加 1/4 杯，一共幾杯？'
  });
  // 6-3 比大小時，第二步換成「比一比」
  { const pl = A.get('frEasyDiff'), calc = pl.steps[1];
    const cmp = cStep(1, { title: '比一比', ask: '分母一樣了，誰的分子大？', id: 'cmp', hints: ['分母一樣了，比分子。', '分子大的比較大。', '用換好的分數來比。'], think: '老師用一樣的分母比分子。', together: '一起比：哪一個大？',
      figure: calc.figure, q: () => '哪一個對？', opts: ctx => cmpOpts(`${ctx.problem.a}/${ctx.problem.b}`, `${ctx.problem.c}/${ctx.problem.D}`).slice(0, 2), ans: ctx => cmpKey(ctx.problem.a * ctx.problem.m, ctx.problem.c),
      wrong: ctx => ctx.problem.c > ctx.problem.a ? { obs: 'bigDenBig', msg: '不能直接比分子。先換成一樣的分母。' } : { msg: '用換好的分數比分子。' }, say: ex => ex.problem.a * ex.problem.m > ex.problem.c ? `${ex.problem.a}/${ex.problem.b} 比較大。` : `${ex.problem.c}/${ex.problem.D} 比較大。` });
    const pick = ctx => ctx.problem.kind === 'cmp' ? cmp : calc;
    pl.steps[1] = { ...calc, title: '算或比', ids: ['fN', 'fD', 'cmp'], answer: ctx => pick(ctx).answer(ctx), check: ctx => pick(ctx).check(ctx), solve: ctx => pick(ctx).solve(ctx), say: ex => pick(ex).say(ex) }; }

  // =============== 7-2 分數變小數（分母 2、5、10、100） ===============
  A.register('frDecimal', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [10, 2], standard: [2, 5, 10], challenge: [2, 5, 10, 100] }, level)), toDec = i % 2 === 0;
      let a; do a = rnd(rand, 1, d - 1); while (d === 100 ? a % 10 === 0 : false);
      const m = d === 100 ? 1 : 10 / d, T = d === 100 ? 100 : 10, t = a * m;
      return { d, a, toDec, T, t, dec: t / T, dims: [d, a], prompt: toDec ? `把 ${a}/${d} 寫成小數。` : `把 ${(t / T).toFixed(T === 100 ? 2 : 1)} 寫成分數。` }; },
    planFigure: ctx => lineSVG(1, ctx.problem.T === 100 ? 10 : 10, { labels: 'dec', marks: [{ v: ctx.problem.dec, label: ctx.problem.toDec ? `${ctx.problem.a}/${ctx.problem.d}` : ctx.problem.dec.toFixed(ctx.problem.T === 100 ? 2 : 1) }] }),
    steps: [
      nStep(0, { title: '換成十分之幾', ask: '是幾個 0.1（或 0.01）？', id: 't', aid: true, hints: ['小數第一位是十分位：幾個 0.1。', '分母換成 10（或 100）：分子分母乘同一個數。', '例如 1/2 ＝ 5/10。'],
        think: '老師把分母換成 10（或 100），看是幾個 0.1（或 0.01）。', together: '一起換：是幾個？', pre: prompt, figure: ctx => A.get('frDecimal').planFigure(ctx),
        label: ctx => ctx.problem.toDec ? `${ctx.problem.a}/${ctx.problem.d} ＝ □/${ctx.problem.T}，□ 是多少？` : `${ctx.problem.dec.toFixed(ctx.problem.T === 100 ? 2 : 1)} 是幾個 ${ctx.problem.T === 100 ? '0.01' : '0.1'}？`, ans: ctx => ctx.problem.t,
        wrong: (ctx, v) => ctx.problem.toDec && v === ctx.problem.a && ctx.problem.d !== ctx.problem.T ? { obs: 'fracDecDigit', msg: `分母要變成 ${ctx.problem.T}，分子也要乘同一個數。` } : null, say: ex => `${ex.problem.t} 個 ${ex.problem.T === 100 ? '0.01' : '0.1'}。` }),
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.d} ＝ ${ctx.problem.dec.toFixed(ctx.problem.T === 100 ? 2 : 1)}。`, chant: '分數變小數：分母換成 10 或 100，再寫成小數。', transfer: '想一想：半公尺是幾公尺？寫成小數。'
  });
  { const pl = A.get('frDecimal');
    const toDec = nStep(1, { title: '寫成小數', ask: '小數點放對了嗎？', id: 'dec', hints: ['幾個 0.1，就是 0.幾。', '幾個 0.01，就是 0.幾幾。', '可以看數線對一對。'], think: '老師寫：幾個 0.1 就是 0.幾。', together: '一起寫：小數是多少？', figure: ctx => pl.planFigure(ctx),
      label: ctx => `${ctx.problem.a}/${ctx.problem.d} 寫成小數是多少？`, ans: ctx => ctx.problem.dec,
      wrong: (ctx, v) => Math.abs(v - Number('0.' + ctx.problem.a)) < 1e-9 ? { obs: 'fracDecDigit', msg: `不是把分子直接寫在小數點後面。先換成分母 ${ctx.problem.T}。` } : (Math.abs(v - ctx.problem.dec * 10) < 1e-9 || Math.abs(v - ctx.problem.dec / 10) < 1e-9) ? { obs: 'fracDecDigit', msg: `小數點的位置錯了：幾個 ${ctx.problem.T === 100 ? '0.01' : '0.1'}，要從十分位開始寫。` } : null, say: ex => `${ex.problem.a}/${ex.problem.d} ＝ ${ex.problem.dec.toFixed(ex.problem.T === 100 ? 2 : 1)}。` });
    const toFrac = fStep(1, { title: '寫成分數', ask: '分母是 10 還是 100？', id: 'f', hints: ['小數一位：分母是 10。', '小數兩位：分母是 100。', '幾個 0.1，分子就是幾。'], think: '老師寫：幾個 0.1，就是幾/10。', together: '一起寫：分數是多少？', figure: ctx => pl.planFigure(ctx),
      label: ctx => `${ctx.problem.dec.toFixed(ctx.problem.T === 100 ? 2 : 1)} 寫成分數是多少？`, ans: ctx => [ctx.problem.t, ctx.problem.T], equiv: true, say: ex => `${ex.problem.dec.toFixed(ex.problem.T === 100 ? 2 : 1)} ＝ ${ex.problem.t}/${ex.problem.T}。` });
    const pick = ctx => ctx.problem.toDec ? toDec : toFrac;
    pl.steps.push({ ...toDec, title: '寫出來', ids: ['dec', 'fN', 'fD'], answer: ctx => pick(ctx).answer(ctx), check: ctx => pick(ctx).check(ctx), solve: ctx => pick(ctx).solve(ctx), say: ex => pick(ex).say(ex) }); }

  // =============== 7-3 誰走得比較遠（數線上比分數和小數） ===============
  A.register('frFar', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [2, 5], standard: [2, 5, 10], challenge: [2, 4, 5, 10] }, level)), max = level === 'easy' ? 1 : 2;
      let a, t; do { a = rnd(rand, 1, max * d - 1); t = rnd(rand, 1, max * 10 - 1); } while (a % d === 0 || Math.abs(a / d - t / 10) < 1e-9 || (d === 4 && a % 2 === 0));
      return { d, a, t, max, dims: [d, a, t], prompt: `小安走了 ${a}/${d} 公里，小明走了 ${(t / 10).toFixed(1)} 公里。誰走得比較遠？` }; },
    planFigure: ctx => lineSVG(ctx.problem.max, 10, { labels: 'dec' }),
    steps: [
      nStep(0, { title: '換成小數', ask: `${'□'}/□ 是 0.幾？`, id: 'dec', aid: true, hints: ['先把分數換成小數，才好比。', '分母換成 10（或 100）。', '例如 1/2 ＝ 5/10 ＝ 0.5。'],
        think: '老師先把分數換成小數。', together: '一起換：是多少？', pre: prompt, figure: ctx => A.get('frFar').planFigure(ctx),
        label: ctx => `${ctx.problem.a}/${ctx.problem.d} 公里是幾公里？寫成小數。`, ans: ctx => ctx.problem.a / ctx.problem.d,
        wrong: (ctx, v) => Math.abs(v - Number('0.' + ctx.problem.a)) < 1e-9 ? { obs: 'fracDecDigit', msg: '不是把分子直接寫在小數點後面。分母先換成 10。' } : null, say: ex => `${ex.problem.a}/${ex.problem.d} ＝ ${ex.problem.a / ex.problem.d}。` }),
      cStep(1, { title: '在數線上比', ask: '誰在比較右邊？', id: 'far', hints: ['在數線上找兩個點。', '越右邊越大，走得越遠。', '小數比大小：先比整數，再比 0.1 位。'],
        think: '老師在數線上找兩個點，右邊的比較遠。', together: '一起比：誰比較遠？', figure: ctx => lineSVG(ctx.problem.max, 10, { labels: 'dec', marks: [{ v: ctx.problem.a / ctx.problem.d, label: '小安' }, { v: ctx.problem.t / 10, label: '小明', cls: 'b' }] }),
        q: () => '誰走得比較遠？', opts: () => [['a', '小安'], ['b', '小明']], ans: ctx => ctx.problem.a / ctx.problem.d > ctx.problem.t / 10 ? 'a' : 'b',
        wrong: () => ({ msg: '在數線上看：越右邊越遠。' }), say: ex => ex.problem.a / ex.problem.d > ex.problem.t / 10 ? '小安走得比較遠。' : '小明走得比較遠。' })
    ],
    reasons, done: ctx => { const p = ctx.problem; return `${p.a}/${p.d} ＝ ${p.a / p.d}，${p.a / p.d > p.t / 10 ? '小安' : '小明'}走得比較遠。`; }, chant: '分數和小數比：換成一樣的再比，數線上越右邊越大。', transfer: '想一想：0.5 公尺和 1/2 公尺，哪一個長？'
  });
})();

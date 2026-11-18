'use strict';
// 第 33 版：分數教材包單元 8～10（五、六年級）：擴分約分、通分、異分母加減、分數乘法、整數相除、分數除法。圖形和計算在 act-frac.js（window.fracFig）。
// 核心活動 8-3（通分五步）：分母一樣嗎 → 找公分母 → 擴分 → 加減 → 約成最簡分數。
// 核心活動 9-2（分數乘除五步）：看情境 → 畫圖分格 → 數重疊的格子 → 寫出來 → 檢查大小。
// 課綱備註：N-5-4 通分不鼓勵分母直接相乘（直接相乘不算錯，會記一筆）；通分數字限一位數分母、或一分母是另一分母的倍數、或乘以 2～5 就找得到公倍數。
// N-5-5 要處理「乘積一定比被乘數大」的錯誤；N-5-6 困難在概念不在計算；N-6-3 餘數問題不評量。
(() => {
  const A = window.areaActs, U = A.util, { esc, num, fieldHtml } = U, R = window.fracFig;
  const { rnd, any, gcd, lcm, simp, same, fromLevel, fracHtml, fracText, big, barSVG, pieSVG, lineSVG, areaSVG, fracAid, nStep, cStep, mStep, fStep, prompt, shown, cmpOpts, cmpKey } = R;
  const methods = [['mark', '🔀 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['look', '先看圖'], ['same', '分子分母乘或除以同一個數'], ['hint', '看提示']];
  const ft = (a, b) => `${a}/${b}`;
  // 課綱 N-5-4 的分母組合：入門一分母是另一分母的倍數；一般兩個一位數；挑戰乘以 2～5 找得到公倍數
  const PAIRS = { easy: [[2, 4], [3, 6], [2, 6], [4, 8], [2, 8]], standard: [[2, 3], [3, 4], [4, 6], [2, 5], [6, 8], [3, 5], [4, 5], [6, 9], [2, 7]], challenge: [[6, 8], [8, 12], [6, 10], [9, 12], [4, 10], [6, 9], [4, 6], [10, 12]] };
  const pairOf = (level, rand) => U.shuffle(any(rand, fromLevel(PAIRS, level)), rand);

  // 找公分母的一步：兩個分母的公倍數都可以（最小的最好）。分母直接相乘、又不是最小的，會記一筆「通分用分母相乘」
  const denStep = (n, o) => ({ title: o.title, ask: o.ask, ids: ['den'], hints: o.hints, think: o.think, together: o.together, figure: o.figure,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${fieldHtml(ctx, 'den', `${ctx.problem.b} 和 ${ctx.problem.d} 的公倍數（要當新的分母）是多少？`, n)}`,
    check: ctx => { const v = num(ctx.answers.den), { b, d } = ctx.problem; if (v === null) return { code: 'den', msg: '把數填進去。' };
      if (v > 0 && Number.isInteger(v) && v % b === 0 && v % d === 0) { if (v === b * d && lcm(b, d) !== b * d) ctx.log('通分用分母相乘', { obs: 'denProduct' }); return null; }
      if (v === b + d) return { code: 'den', obs: 'addAcross', msg: '分母不是相加。要找兩個分母都能整除的數。' };
      return { code: 'den', obs: 'other', msg: `${v} 不是 ${b} 和 ${d} 的公倍數。把比較大的分母乘以 2、3、4……試試看。` }; },
    solve: ctx => { ctx.answers.den = String(lcm(ctx.problem.b, ctx.problem.d)); }, say: ex => `用 ${lcm(ex.problem.b, ex.problem.d)}，${ex.problem.b} 和 ${ex.problem.d} 都能整除它。` });
  const D = ctx => num(ctx.answers.den) || lcm(ctx.problem.b, ctx.problem.d);
  const expandFields = [
    ['na', ctx => `${ft(ctx.problem.a, ctx.problem.b)} ＝ □/${D(ctx)}，□ 是多少？`, ctx => ctx.problem.a * D(ctx) / ctx.problem.b, (ctx, v) => v === ctx.problem.a + D(ctx) - ctx.problem.b ? { obs: 'equivAdd', msg: '分母乘了幾，分子也乘幾，不是加。' } : null],
    ['nc', ctx => `${ft(ctx.problem.c, ctx.problem.d)} ＝ □/${D(ctx)}，□ 是多少？`, ctx => ctx.problem.c * D(ctx) / ctx.problem.d, (ctx, v) => v === ctx.problem.c + D(ctx) - ctx.problem.d ? { obs: 'equivAdd', msg: '分母乘了幾，分子也乘幾，不是加。' } : null]
  ];
  const expandHints = ['新的分母 ÷ 原來的分母 ＝ 乘了多少。', '分子也乘同一個數。', '兩個分數都要換。'];

  // =============== 8-1 擴分和約分 ===============
  A.register('frScale', {
    methods, makeProblem: (level, i, rand = Math.random) => { let a, b; do { b = rnd(rand, 2, level === 'easy' ? 4 : 9); a = rnd(rand, 1, b - 1); } while (gcd(a, b) > 1);
      const m = rnd(rand, 2, level === 'challenge' ? 6 : 4), up = i % 2 === 0;
      return { a, b, m, up, dims: [a, b, m], prompt: up ? `把 ${a}/${b} 擴分成分母是 ${b * m} 的分數。` : `把 ${a * m}/${b * m} 約成最簡分數。` }; },
    planFigure: ctx => { const p = ctx.problem; return barSVG(p.b * p.m, p.a * p.m, { aria: `${p.a * p.m}/${p.b * p.m}` }); },
    steps: [
      nStep(0, { title: '乘或除以幾', ask: '分子分母要乘（除以）多少？', id: 'm', aid: true, hints: ['擴分：新分母 ÷ 原來的分母。', '約分：找分子和分母都能整除的數，越大越好（最大公因數）。', '分子分母要乘（或除以）同一個數。'],
        think: '老師找分子分母要乘或除以的數。', together: '一起找：乘或除以多少？', pre: prompt, figure: ctx => shown(ctx, 0) ? A.get('frScale').planFigure(ctx) : '',
        label: ctx => ctx.problem.up ? `分母從 ${ctx.problem.b} 變成 ${ctx.problem.b * ctx.problem.m}，乘了多少？` : `${ctx.problem.a * ctx.problem.m} 和 ${ctx.problem.b * ctx.problem.m} 都可以除以多少（最大的）？`, ans: ctx => ctx.problem.m,
        wrong: (ctx, v) => !ctx.problem.up && v > 1 && (ctx.problem.a * ctx.problem.m) % v === 0 && (ctx.problem.b * ctx.problem.m) % v === 0 ? { obs: 'notSimplest', msg: `${v} 可以，可是還有更大的。找最大公因數。` } : ctx.problem.up && v === ctx.problem.b * ctx.problem.m - ctx.problem.b ? { obs: 'equivAdd', msg: '是乘了多少，不是加了多少。' } : null,
        say: ex => ex.problem.up ? `分母乘 ${ex.problem.m}。` : `都除以 ${ex.problem.m}。` }),
      fStep(1, { title: '寫出來', ask: '分子分母都做了嗎？', id: 'f', hints: ['分子分母都要乘（或除以）同一個數。', '擴分：分母要是題目說的數。', '約分：約到不能再約。'],
        think: '老師把分子分母都乘（或除以）同一個數。', together: '一起寫：答案是多少？', figure: ctx => A.get('frScale').planFigure(ctx),
        label: ctx => ctx.problem.up ? `${ctx.problem.a}/${ctx.problem.b} ＝ ？/${ctx.problem.b * ctx.problem.m}` : `${ctx.problem.a * ctx.problem.m}/${ctx.problem.b * ctx.problem.m} 的最簡分數是多少？`,
        ans: ctx => ctx.problem.up ? [ctx.problem.a * ctx.problem.m, ctx.problem.b * ctx.problem.m] : [ctx.problem.a, ctx.problem.b], simplest: ctx => !ctx.problem.up,
        wrong: (ctx, [a, b]) => ctx.problem.up && b === ctx.problem.b * ctx.problem.m && a === ctx.problem.a + b - ctx.problem.b ? { obs: 'equivAdd', msg: '分子也要乘，不是加。' } : null,
        say: ex => ex.problem.up ? `${ex.problem.a}/${ex.problem.b} ＝ ${ex.problem.a * ex.problem.m}/${ex.problem.b * ex.problem.m}。` : `${ex.problem.a * ex.problem.m}/${ex.problem.b * ex.problem.m} ＝ ${ex.problem.a}/${ex.problem.b}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.b} ＝ ${ctx.problem.a * ctx.problem.m}/${ctx.problem.b * ctx.problem.m}。`, chant: '擴分、約分：分子分母乘或除以同一個數，大小不變。', transfer: '想一想：6/8 個披薩，可以說成幾分之幾個？'
  });

  // =============== 8-2 通分比大小 ===============
  A.register('frCommon', {
    methods, makeProblem: (level, i, rand = Math.random) => { let b, d, a, c; do { [b, d] = pairOf(level, rand); a = rnd(rand, 1, b - 1); c = rnd(rand, 1, d - 1); } while (same(a, b, c, d) || gcd(a, b) > 1 || gcd(c, d) > 1);
      return { a, b, c, d, dims: [b, d, a, c], prompt: `兩杯一樣大的杯子，一杯裝了 ${a}/${b} 杯果汁，一杯裝了 ${c}/${d} 杯。哪一杯比較多？` }; },
    planFigure: ctx => `${barSVG(ctx.problem.b, ctx.problem.a)}${barSVG(ctx.problem.d, ctx.problem.c).replace(/fr-on"/g, 'fr-on b"')}`,
    steps: [
      denStep(0, { title: '找公分母', ask: '兩個分母都能整除哪個數？', hints: ['列出比較大的分母的倍數：乘以 1、2、3……', '找到另一個分母也能整除的，就是公分母。', '最小的公倍數最好算；直接相乘也可以，只是數字比較大。'],
        think: '老師把比較大的分母乘以 2、3、4……找另一個分母也能整除的數。', together: '一起找：公分母是多少？', pre: prompt, figure: ctx => A.get('frCommon').planFigure(ctx) }),
      mStep(1, { title: '擴分', ask: '兩個分數都換了嗎？', hints: expandHints, think: '老師把兩個分數都擴分成新的分母。', together: '一起換：分子各是多少？', figure: ctx => `${barSVG(ctx.problem.b, ctx.problem.a, { sub: D(ctx) / ctx.problem.b })}${barSVG(ctx.problem.d, ctx.problem.c, { sub: D(ctx) / ctx.problem.d }).replace(/fr-on"/g, 'fr-on b"')}`,
        fields: expandFields, say: ex => `${ex.problem.a * lcm(ex.problem.b, ex.problem.d) / ex.problem.b}/${lcm(ex.problem.b, ex.problem.d)} 和 ${ex.problem.c * lcm(ex.problem.b, ex.problem.d) / ex.problem.d}/${lcm(ex.problem.b, ex.problem.d)}。` }),
      cStep(2, { title: '比分子', ask: '分母一樣了，誰的分子大？', id: 'cmp', hints: ['分母一樣了，比分子。', '分子大的比較多。', '不能用原來的分子直接比。'],
        think: '老師用換好的分數比分子。', together: '一起比：哪一杯比較多？', figure: ctx => A.get('frCommon').planFigure(ctx),
        q: () => '哪一個對？', opts: ctx => cmpOpts(ft(ctx.problem.a, ctx.problem.b), ft(ctx.problem.c, ctx.problem.d)).slice(0, 2), ans: ctx => cmpKey(ctx.problem.a / ctx.problem.b, ctx.problem.c / ctx.problem.d),
        wrong: ctx => ({ obs: (ctx.problem.a > ctx.problem.c) !== (ctx.problem.a / ctx.problem.b > ctx.problem.c / ctx.problem.d) ? 'bigDenBig' : 'wrongChoice', msg: '用通分以後的分子來比。' }),
        say: ex => ex.problem.a / ex.problem.b > ex.problem.c / ex.problem.d ? `${ft(ex.problem.a, ex.problem.b)} 比較多。` : `${ft(ex.problem.c, ex.problem.d)} 比較多。` })
    ],
    reasons, done: ctx => { const p = ctx.problem; return p.a / p.b > p.c / p.d ? `${ft(p.a, p.b)} ＞ ${ft(p.c, p.d)}。` : `${ft(p.a, p.b)} ＜ ${ft(p.c, p.d)}。`; }, chant: '異分母比大小：先通分，再比分子。', transfer: '想一想：2/3 和 3/4，哪一個比較接近 1？'
  });

  // =============== 8-3 異分母加減（核心：通分五步） ===============
  function makeUnlike(level, i, rand = Math.random) {
    const add = i % 2 === 0; let b, d, a, c;
    do { [b, d] = pairOf(level, rand); a = rnd(rand, 1, b - 1); c = rnd(rand, 1, d - 1); } while (gcd(a, b) > 1 || gcd(c, d) > 1 || (!add && a / b <= c / d) || (add && level === 'easy' && a / b + c / d > 1));
    const L = lcm(b, d), n = add ? a * L / b + c * L / d : a * L / b - c * L / d, [sn, sd] = simp(n, L);
    return { a, b, c, d, add, L, n, sn, sd, dims: [b, d, a, c], prompt: add ? `做鬆餅用了 ${a}/${b} 杯牛奶和 ${c}/${d} 杯水。一共用了幾杯？` : `有 ${a}/${b} 公升果汁，喝了 ${c}/${d} 公升。還剩幾公升？` };
  }
  const unlikeFig = ctx => `${barSVG(ctx.problem.b, ctx.problem.a, { sub: shown(ctx, 2) ? D(ctx) / ctx.problem.b : 0 })}${barSVG(ctx.problem.d, ctx.problem.c, { sub: shown(ctx, 2) ? D(ctx) / ctx.problem.d : 0 }).replace(/fr-on"/g, 'fr-on b"')}`;
  const nOf = ctx => { const p = ctx.problem, L = D(ctx), x = p.a * L / p.b, y = p.c * L / p.d; return p.add ? x + y : x - y; };
  A.register('frUnlike', {
    methods: [['mark', '🔀 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeUnlike, planFigure: unlikeFig,
    steps: [
      cStep(0, { title: '分母一樣嗎', ask: '可以直接加減嗎？', id: 'same', fixed: true, hints: ['看兩個分數下面的數。', '分母不一樣，每一份大小不一樣，不能直接加減。', '要先換成一樣的分母（通分）。'],
        think: '老師看分母：不一樣，每一份大小不同，要先通分。', together: '一起看：可以直接算嗎？', pre: ctx => `${prompt(ctx)}${big(`${fracHtml(ctx.problem.a, ctx.problem.b)} ${ctx.problem.add ? '＋' : '－'} ${fracHtml(ctx.problem.c, ctx.problem.d)}`)}`, figure: unlikeFig,
        q: () => '分母不一樣，可以直接把分子、分母各自加減嗎？', opts: () => [['no', '不可以，要先通分'], ['yes', '可以，分子加分子、分母加分母']], ans: () => 'no',
        wrong: () => ({ obs: 'addAcross', msg: '每一份的大小不一樣，不能直接加。要先換成一樣的分母。' }), say: () => '分母不一樣，要先通分。' }),
      denStep(1, { title: '找公分母', ask: '兩個分母都能整除哪個數？', hints: ['列出比較大的分母的倍數。', '找另一個分母也能整除的數。', '最小的公倍數最好算（可以用因數與倍數學過的方法）。'],
        think: '老師找兩個分母的最小公倍數，當新的分母。', together: '一起找：公分母是多少？', figure: unlikeFig }),
      mStep(2, { title: '擴分', ask: '分子跟著乘了嗎？', hints: expandHints, think: '老師把兩個分數都換成新的分母，分子跟著乘。', together: '一起換：分子各是多少？', figure: unlikeFig, fields: expandFields,
        say: ex => `${ex.problem.a * ex.problem.L / ex.problem.b}/${ex.problem.L} 和 ${ex.problem.c * ex.problem.L / ex.problem.d}/${ex.problem.L}。` }),
      fStep(3, { title: '加減', ask: '分母一樣了，只算分子嗎？', id: 'f', hints: ['用換好的分數算。', '分母不變，分子加（減）。', '分母是上一步找的公分母。'],
        think: '老師用換好的分數，分母不變，分子加減。', together: '一起算：答案是多少？', figure: unlikeFig,
        label: ctx => `${ctx.problem.add ? '一共' : '還剩'}多少？（先不用約分）`, ans: ctx => [nOf(ctx), D(ctx)], equiv: true,
        wrong: (ctx, [a, b]) => b === ctx.problem.b + ctx.problem.d || (a === (ctx.problem.add ? ctx.problem.a + ctx.problem.c : ctx.problem.a - ctx.problem.c) && b !== D(ctx)) ? { obs: 'addAcross', msg: '要用通分以後的分數算，分母不變。' } : b === 2 * D(ctx) ? { obs: 'addDen', msg: '分母不用相加。' } : null,
        say: ex => `${ex.problem.n}/${ex.problem.L}。` }),
      fStep(4, { title: '約成最簡分數', ask: '還能再約分嗎？', id: 'g', hints: ['看分子和分母有沒有公因數。', '有的話，都除以最大公因數。', '不能再約了，就是最簡分數。'],
        think: '老師檢查能不能約分，約到最簡。', together: '一起約：最簡分數是多少？', figure: unlikeFig,
        label: () => '寫成最簡分數（比 1 大的可以寫成假分數）。', ans: ctx => simp(nOf(ctx), D(ctx)), simplest: true, say: ex => `最簡分數是 ${ex.problem.sn}/${ex.problem.sd}。` })
    ],
    reasons: [['den', '先找公分母'], ['expand', '分子跟著乘'], ['simplest', '約成最簡分數'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.add ? '一共' : '還剩'} ${ctx.problem.sn}/${ctx.problem.sd}${ctx.problem.add ? ' 杯' : ' 公升'}。`,
    chant: '異分母加減：先通分，分母不變算分子，最後約分。', transfer: '想一想：1/2 小時加 1/3 小時，是幾小時？'
  });

  // =============== 9-1 整數乘以分數（「的幾分之幾」） ===============
  const WHOLE = [['蛋', '顆', '🥚'], ['草莓', '顆', '🍓'], ['鉛筆', '枝', '✏️'], ['蘋果', '個', '🍎']];
  A.register('frOfWhole', {
    methods, makeProblem: (level, i, rand = Math.random) => { const b = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6], challenge: [4, 5, 6, 8] }, level)), a = rnd(rand, 1, b - 1), k = rnd(rand, 2, level === 'easy' ? 3 : 4), n = b * k, [what, u, e] = any(rand, WHOLE);
      return { a, b, n, what, u, e, ans: n * a / b, dims: [n, a, b], prompt: `一盒有 ${n} ${u}${what}，用掉了 ${a}/${b} 盒。用掉幾${u}？` }; },
    planFigure: ctx => { const p = ctx.problem, per = p.n / p.b; return big(Array.from({ length: p.b }, (_, g) => `<span class="fr-group${g < p.a ? ' on' : ''}" aria-label="第 ${g + 1} 份">${p.e.repeat(per)}</span>`).join(' ')); },
    steps: [
      nStep(0, { title: '平分', ask: '一份有幾個？', id: 'per', hints: ['分母是幾，就平分成幾份。', '全部 ÷ 分母。', `${'□'} ÷ □ ＝ 一份。`],
        think: '老師把全部平分成分母那麼多份。', together: '一起分：一份幾個？', pre: prompt, figure: ctx => A.get('frOfWhole').planFigure(ctx),
        label: ctx => `${ctx.problem.n} ${ctx.problem.u}平分成 ${ctx.problem.b} 份，一份幾${ctx.problem.u}？`, ans: ctx => ctx.problem.n / ctx.problem.b, say: ex => `${ex.problem.n} ÷ ${ex.problem.b} ＝ ${ex.problem.n / ex.problem.b}。` }),
      nStep(1, { title: '拿幾份', ask: '幾份是幾個？', id: 'ans', hints: ['分子是幾，就拿幾份。', '一份的個數 × 分子。', '數一數塗色的份。'],
        think: '老師拿分子那麼多份。', together: '一起算：用掉幾個？', figure: ctx => A.get('frOfWhole').planFigure(ctx),
        label: ctx => `${ctx.problem.a} 份是幾${ctx.problem.u}？`, ans: ctx => ctx.problem.ans, say: ex => `${ex.problem.n / ex.problem.b} × ${ex.problem.a} ＝ ${ex.problem.ans}。` }),
      cStep(2, { title: '寫成算式', ask: '「的幾分之幾」用什麼算？', id: 'op', hints: ['「的幾分之幾」就是乘以幾分之幾。', `${'□'} 的 1/2，就是 □ × 1/2。`, '答案要和上一步一樣。'],
        think: '老師想：一盒的幾分之幾，就是乘以幾分之幾。', together: '一起選：算式是哪一個？',
        q: () => '哪一個算式對？', opts: ctx => { const p = ctx.problem; return [['mul', `${p.n} × ${p.a}/${p.b}`], ['div', `${p.n} ÷ ${p.a}/${p.b}`], ['add', `${p.n} ＋ ${p.a}/${p.b}`]]; }, ans: () => 'mul',
        wrong: () => ({ msg: '「的幾分之幾」，就是乘以幾分之幾。' }), say: ex => `${ex.problem.n} × ${ex.problem.a}/${ex.problem.b} ＝ ${ex.problem.ans}。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} × ${ctx.problem.a}/${ctx.problem.b} ＝ ${ctx.problem.ans}，用掉 ${ctx.problem.ans} ${ctx.problem.u}。`, chant: '「的幾分之幾」就是乘以幾分之幾：先平分，再拿幾份。', transfer: '想一想：全班 24 人的 3/4 是幾人？'
  });

  // =============== 9-2 分數乘以分數（核心：分數乘除五步） ===============
  function makeOfFrac(level, i, rand = Math.random) {
    const B = fromLevel({ easy: [2, 3, 4], standard: [2, 3, 4, 5], challenge: [3, 4, 5, 6] }, level);
    let a, b, c, d; do { b = any(rand, B); d = any(rand, B); a = rnd(rand, 1, b - 1); c = rnd(rand, 1, d - 1); } while (b * d > 30);
    const [sn, sd] = simp(a * c, b * d);
    return { a, b, c, d, sn, sd, dims: [a, b, c, d], prompt: `桌上有 ${a}/${b} 個披薩，小安吃了其中的 ${c}/${d}。小安吃了幾個披薩？` };
  }
  const ofFig = (ctx, rows = true) => areaSVG(ctx.problem.a, ctx.problem.b, ctx.problem.c, ctx.problem.d, { rows });
  A.register('frOfFrac', {
    methods: [['mark', '🟪 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeOfFrac, planFigure: ctx => ofFig(ctx, false),
    steps: [
      cStep(0, { title: '看情境', ask: '「的幾分之幾」要用什麼算？', id: 'op', hints: ['「其中的幾分之幾」就是「的幾分之幾」。', '「的幾分之幾」用乘法。', `${'□'} 的 □/□ ＝ □ × □/□。`],
        think: '老師讀題目：是「披薩的幾分之幾」，用乘法。', together: '一起選：算式是哪一個？', pre: prompt, figure: ctx => ofFig(ctx, false),
        q: () => '算式是哪一個？', opts: ctx => { const p = ctx.problem; return [['mul', `${ft(p.a, p.b)} × ${ft(p.c, p.d)}`], ['div', `${ft(p.a, p.b)} ÷ ${ft(p.c, p.d)}`], ['sub', `${ft(p.a, p.b)} － ${ft(p.c, p.d)}`]]; }, ans: () => 'mul',
        wrong: () => ({ msg: '「其中的幾分之幾」用乘法。' }), say: ex => `${ft(ex.problem.a, ex.problem.b)} × ${ft(ex.problem.c, ex.problem.d)}。` }),
      nStep(1, { title: '畫圖分格', ask: '一整個被分成幾小格？', id: 'cells', hints: ['直的分成幾份？橫的又分成幾份？', '直的份數 × 橫的份數。', '這就是兩個分母相乘。'],
        think: '老師把一整個直的分、橫的分，數一共幾小格。', together: '一起數：一共幾小格？', figure: ctx => ofFig(ctx),
        label: () => '一整個（整個長方形）被分成幾小格？', ans: ctx => ctx.problem.b * ctx.problem.d,
        wrong: (ctx, v) => v === ctx.problem.b + ctx.problem.d ? { msg: '是一排一排的：直的份數 × 橫的份數。' } : v === ctx.problem.a * ctx.problem.d ? { obs: 'wrongWhole', msg: '要數整個長方形，不只是淺色的部分。' } : null, say: ex => `${ex.problem.b} × ${ex.problem.d} ＝ ${ex.problem.b * ex.problem.d} 小格。` }),
      nStep(2, { title: '數深色的', ask: '深色的有幾格？', id: 'dark', hints: ['深色是「淺色裡的幾分之幾」。', '一排一排數深色的。', '這就是兩個分子相乘。'],
        think: '老師數深色的格子（重疊的部分）。', together: '一起數：深色幾格？', figure: ctx => ofFig(ctx),
        label: () => '深色的有幾小格？', ans: ctx => ctx.problem.a * ctx.problem.c, say: ex => `${ex.problem.a} × ${ex.problem.c} ＝ ${ex.problem.a * ex.problem.c} 格。` }),
      fStep(3, { title: '寫出來', ask: '能約分嗎？', id: 'f', hints: ['深色的格子數寫上面，全部格子數寫下面。', '分子乘分子，分母乘分母。', '能約分就約成最簡分數。'],
        think: '老師寫：分子乘分子、分母乘分母，再約分。', together: '一起寫：吃了幾個披薩？', figure: ctx => ofFig(ctx),
        label: () => '小安吃了幾個披薩？寫成最簡分數。', ans: ctx => [ctx.problem.sn, ctx.problem.sd], simplest: true,
        wrong: (ctx, [a, b]) => b === ctx.problem.b * ctx.problem.d / 1 && a === ctx.problem.a + ctx.problem.c ? { msg: '分子也是相乘。' } : b === ctx.problem.b && a === ctx.problem.a * ctx.problem.c ? { obs: 'wrongWhole', msg: '分母是「一整個」被分成幾格。' } : null,
        say: ex => `${ft(ex.problem.a, ex.problem.b)} × ${ft(ex.problem.c, ex.problem.d)} ＝ ${ft(ex.problem.sn, ex.problem.sd)}。` }),
      cStep(4, { title: '檢查大小', ask: '答案比原來的大還是小？', id: 'size', fixed: true, hints: ['乘以一個比 1 小的數，會怎麼樣？', '吃的是「其中的一部分」，一定比原來少。', '乘以比 1 小的數，答案變小。'],
        think: '老師檢查：乘以比 1 小的數，答案變小，合理。', together: '一起檢查：變大還是變小？', figure: ctx => ofFig(ctx),
        q: ctx => `答案和 ${ft(ctx.problem.a, ctx.problem.b)} 比？`, opts: () => [['less', '比較小'], ['more', '比較大'], ['same', '一樣']], ans: () => 'less',
        wrong: () => ({ obs: 'multBigger', msg: '乘以比 1 小的數，答案會變小。乘法不一定變大。' }), say: () => '乘以比 1 小的數，答案變小。' })
    ],
    reasons: [['op', '「的幾分之幾」用乘法'], ['draw', '畫面積圖'], ['size', '檢查大小'], ['hint', '看提示']],
    done: ctx => `${ft(ctx.problem.a, ctx.problem.b)} × ${ft(ctx.problem.c, ctx.problem.d)} ＝ ${ft(ctx.problem.sn, ctx.problem.sd)}，小安吃了 ${ft(ctx.problem.sn, ctx.problem.sd)} 個披薩。`,
    chant: '分數乘分數：分子乘分子，分母乘分母；乘以比 1 小的數會變小。', transfer: '想一想：半條吐司的一半，是幾條吐司？'
  });

  // =============== 9-3 會變大還是變小 ===============
  A.register('frBigger', {
    methods, makeProblem: (level, i, rand = Math.random) => { const b = any(rand, level === 'easy' ? [2, 3, 4] : [2, 3, 4, 5]), kind = ['lt', 'gt', 'eq'][i % 3], a = kind === 'lt' ? rnd(rand, 1, b - 1) : kind === 'eq' ? b : rnd(rand, b + 1, 2 * b - 1), n = b * rnd(rand, 2, level === 'easy' ? 4 : 6);
      return { a, b, n, kind, ans: n * a / b, dims: [n, a, b], prompt: `${n} × ${a}/${b}，答案會比 ${n} 大、比 ${n} 小，還是一樣？` }; },
    planFigure: ctx => big(`${ctx.problem.n} × ${fracHtml(ctx.problem.a, ctx.problem.b)}`),
    steps: [
      cStep(0, { title: '先預估', ask: '乘的數比 1 大還是小？', id: 'pred', fixed: true, hints: ['先看乘的分數：比 1 大、比 1 小，還是等於 1？', '乘以比 1 小的數，變小；乘以比 1 大的數，變大。', '乘以 1，一樣。'],
        think: '老師先看乘的分數和 1 比，再預估。', together: '一起預估：會變大還是變小？', pre: prompt, figure: ctx => A.get('frBigger').planFigure(ctx),
        q: ctx => `答案和 ${ctx.problem.n} 比，會怎麼樣？`, opts: () => [['lt', '比較小'], ['eq', '一樣'], ['gt', '比較大']], ans: ctx => ctx.problem.kind === 'lt' ? 'lt' : ctx.problem.kind === 'eq' ? 'eq' : 'gt',
        wrong: ctx => ctx.problem.kind === 'lt' ? { obs: 'multBigger', msg: '乘以比 1 小的數，答案會變小。' } : { msg: '先看分子和分母，乘的數比 1 大還是等於 1？' }, say: ex => ({ lt: '乘的數比 1 小，答案變小。', eq: '乘以 1，一樣。', gt: '乘的數比 1 大，答案變大。' })[ex.problem.kind] }),
      nStep(1, { title: '算算看', ask: '和預估一樣嗎？', id: 'ans', hints: ['先除以分母，再乘分子。', `${'□'} ÷ 分母 × 分子。`, '算完和預估比一比。'],
        think: '老師算出來，和預估比一比。', together: '一起算：答案是多少？', figure: ctx => A.get('frBigger').planFigure(ctx),
        label: ctx => `${ctx.problem.n} × ${ctx.problem.a}/${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.ans, say: ex => `${ex.problem.n} ÷ ${ex.problem.b} × ${ex.problem.a} ＝ ${ex.problem.ans}。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} × ${ctx.problem.a}/${ctx.problem.b} ＝ ${ctx.problem.ans}。`, chant: '乘以比 1 小的數會變小，乘以比 1 大的數會變大。', transfer: '想一想：一件衣服打八折（乘以 8/10），價錢會變高還是變低？'
  });

  // =============== 10-1 分不完怎麼辦（整數相除是分數） ===============
  A.register('frShareQ', {
    methods, makeProblem: (level, i, rand = Math.random) => { let a, b; do { b = rnd(rand, 2, level === 'easy' ? 4 : 6); a = rnd(rand, 1, level === 'easy' ? b - 1 : 2 * b); } while (a % b === 0 || a === 0);
      return { a, b, dims: [a, b], prompt: `${a} 個鬆餅平分給 ${b} 個人，每人分到幾個？` }; },
    planFigure: ctx => pieSVG(ctx.problem.b, 0, { wholes: ctx.problem.a, aria: `${ctx.problem.a} 個鬆餅，每個切成 ${ctx.problem.b} 塊` }),
    steps: [
      nStep(0, { title: '每個切成幾塊', ask: '一共幾小塊？', id: 'all', hints: ['每個鬆餅都切成人數那麼多塊。', '鬆餅個數 × 人數。', '數一數全部的小塊。'],
        think: '老師把每個鬆餅都切成人數那麼多塊。', together: '一起數：一共幾小塊？', pre: prompt, figure: ctx => A.get('frShareQ').planFigure(ctx),
        label: ctx => `每個鬆餅切成 ${ctx.problem.b} 塊，一共幾小塊？`, ans: ctx => ctx.problem.a * ctx.problem.b, say: ex => `${ex.problem.a} × ${ex.problem.b} ＝ ${ex.problem.a * ex.problem.b} 小塊。` }),
      nStep(1, { title: '平分小塊', ask: '每人拿幾小塊？', id: 'each', hints: ['把小塊平分給每個人。', '全部小塊 ÷ 人數。', '每人拿到的小塊數，剛好等於鬆餅的個數。'],
        think: '老師把小塊平分：每人拿一樣多。', together: '一起分：每人幾小塊？', figure: ctx => pieSVG(ctx.problem.b, ctx.problem.a, { wholes: ctx.problem.a }),
        label: () => '每人拿到幾小塊？', ans: ctx => ctx.problem.a, say: ex => `每人 ${ex.problem.a} 小塊。` }),
      fStep(2, { title: '寫成分數', ask: '一小塊是幾分之一個？', id: 'f', hints: ['一小塊是 1/人數 個。', '每人拿幾小塊，就是幾/人數 個。', `${'□'} ÷ □ ＝ □/□。`],
        think: '老師寫：每人幾個 1/□，就是幾/□ 個。', together: '一起寫：每人分到幾個？', figure: ctx => pieSVG(ctx.problem.b, ctx.problem.a, { wholes: ctx.problem.a }),
        label: ctx => `${ctx.problem.a} ÷ ${ctx.problem.b} ＝ ？（寫成分數，可以是假分數）`, ans: ctx => [ctx.problem.a, ctx.problem.b], equiv: true,
        wrong: (ctx, [a, b]) => b === 1 || a === Math.floor(ctx.problem.a / ctx.problem.b) ? { obs: 'remainderFrac', msg: '分不完的也要分：切成小塊，寫成分數。' } : null, say: ex => `${ex.problem.a} ÷ ${ex.problem.b} ＝ ${ft(ex.problem.a, ex.problem.b)}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} ÷ ${ctx.problem.b} ＝ ${ft(ctx.problem.a, ctx.problem.b)}，每人 ${ft(ctx.problem.a, ctx.problem.b)} 個。`, chant: '分不完也能分：□ ÷ △ ＝ □/△。', transfer: '想一想：2 條吐司分給 3 個人，每人幾條？'
  });

  // =============== 10-2 分數除以整數 ===============
  A.register('frDivInt', {
    methods, makeProblem: (level, i, rand = Math.random) => { const b = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6, 8], challenge: [5, 6, 7, 8, 9] }, level)), k = rnd(rand, 2, level === 'easy' ? 3 : 4);
      const all = Array.from({ length: b - 1 }, (_, j) => j + 1), mult = all.filter(x => x % k === 0), a = any(rand, (level === 'easy' || i % 2 === 0) && mult.length ? mult : all), [sn, sd] = simp(a, b * k);
      return { a, b, k, sn, sd, dims: [a, b, k], prompt: `${a}/${b} 公升果汁，平分倒進 ${k} 個杯子。每杯幾公升？` }; },
    planFigure: ctx => barSVG(ctx.problem.b, ctx.problem.a, { aria: `${ctx.problem.a}/${ctx.problem.b} 公升` }),
    steps: [
      cStep(0, { title: '變成乘法', ask: '平分成幾份，就是乘以多少？', id: 'op', hints: ['平分成 □ 份，一份是 1/□。', '除以 □，就是乘以 1/□。', '例如 ÷ 3 就是 × 1/3。'],
        think: '老師想：平分成 □ 份，就是乘以 1/□。', together: '一起選：等於哪一個？', pre: prompt, figure: ctx => A.get('frDivInt').planFigure(ctx),
        q: ctx => `${ctx.problem.a}/${ctx.problem.b} ÷ ${ctx.problem.k} 等於哪一個？`, opts: ctx => { const p = ctx.problem; return [['unit', `${p.a}/${p.b} × 1/${p.k}`], ['k', `${p.a}/${p.b} × ${p.k}`], ['inv', `${p.b}/${p.a} × ${p.k}`]]; }, ans: () => 'unit',
        wrong: (ctx, a) => a === 'k' ? { obs: 'multBigger', msg: '平分以後每杯會變少，不會變多。' } : { obs: 'divFlipWrong', msg: '被除的分數不用倒過來。' }, say: ex => `÷ ${ex.problem.k} 就是 × 1/${ex.problem.k}。` }),
      fStep(1, { title: '算出來', ask: '每杯比原來少嗎？', id: 'f', aid: true, hints: ['分母乘以份數。', `${'□'}/□ × 1/△ ＝ □/(□×△)。`, '可以約分就約分。'],
        think: '老師算：分母乘以份數，能約分就約。', together: '一起算：每杯幾公升？', figure: ctx => barSVG(ctx.problem.b, ctx.problem.a, { sub: ctx.problem.k }),
        label: () => '每杯幾公升？', ans: ctx => [ctx.problem.sn, ctx.problem.sd], equiv: true,
        wrong: (ctx, [a, b]) => a === ctx.problem.a * ctx.problem.k && b === ctx.problem.b ? { obs: 'multBigger', msg: '平分是變少，不是乘以份數。' } : null, say: ex => `每杯 ${ft(ex.problem.sn, ex.problem.sd)} 公升。` })
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.b} ÷ ${ctx.problem.k} ＝ ${ft(ctx.problem.sn, ctx.problem.sd)}，每杯 ${ft(ctx.problem.sn, ctx.problem.sd)} 公升。`, chant: '分數除以整數：除以 □，就是乘以 1/□。', transfer: '想一想：半個蛋糕分給 2 個人，每人幾個？'
  });
  // =============== 10-3 可以剪幾段（整數除以分數） ===============
  A.register('frHowMany', {
    methods, makeProblem: (level, i, rand = Math.random) => { const b = any(rand, fromLevel({ easy: [2, 3, 4], standard: [3, 4, 5, 6], challenge: [4, 5, 6, 8] }, level)); let a, n;
      do { a = level === 'easy' ? 1 : rnd(rand, 1, b - 1); n = rnd(rand, 1, 4); } while ((n * b) % a);
      return { a, b, n, ans: n * b / a, dims: [n, a, b], prompt: `一條緞帶長 ${n} 公尺，每 ${a}/${b} 公尺剪成一段。可以剪幾段？` }; },
    planFigure: ctx => barSVG(ctx.problem.b, 0, { wholes: ctx.problem.n, aria: `${ctx.problem.n} 公尺緞帶，每公尺分成 ${ctx.problem.b} 份` }),
    steps: [
      nStep(0, { title: '1 公尺有幾個', ask: '1 公尺是幾個 1/□ 公尺？', id: 'one', hints: ['1 公尺平分成分母那麼多份。', '1 ＝ □/□。', '分母是幾，就是幾個。'],
        think: '老師想：1 公尺是幾個 1/□ 公尺。', together: '一起想：幾個？', pre: prompt, figure: ctx => A.get('frHowMany').planFigure(ctx),
        label: ctx => `1 公尺是幾個 1/${ctx.problem.b} 公尺？`, ans: ctx => ctx.problem.b, say: ex => `1 公尺是 ${ex.problem.b} 個 1/${ex.problem.b} 公尺。` }),
      nStep(1, { title: '全部有幾個', ask: '全部是幾個 1/□ 公尺？', id: 'all', hints: ['每 1 公尺有分母那麼多個。', '公尺數 × 分母。', '數一數全部的小格。'],
        think: '老師算：全部有幾個 1/□ 公尺。', together: '一起算：全部幾個？', figure: ctx => A.get('frHowMany').planFigure(ctx),
        label: ctx => `${ctx.problem.n} 公尺是幾個 1/${ctx.problem.b} 公尺？`, ans: ctx => ctx.problem.n * ctx.problem.b, say: ex => `${ex.problem.n} × ${ex.problem.b} ＝ ${ex.problem.n * ex.problem.b} 個。` }),
      nStep(2, { title: '幾段', ask: '每段幾個，可以剪幾段？', id: 'ans', hints: [`每段是 ${'□'} 個 1/□。`, '全部的個數 ÷ 每段的個數。', '答案會比公尺數多：除以比 1 小的數，答案變大。'],
        think: '老師算：全部個數 ÷ 每段個數。', together: '一起算：可以剪幾段？', figure: ctx => barSVG(ctx.problem.b, 0, { wholes: ctx.problem.n, sub: 1 }),
        label: () => '可以剪幾段？', ans: ctx => ctx.problem.ans,
        wrong: (ctx, v) => v < ctx.problem.n ? { obs: 'multBigger', msg: '每段比 1 公尺短，段數會比公尺數多。' } : null, say: ex => `${ex.problem.n * ex.problem.b} ÷ ${ex.problem.a} ＝ ${ex.problem.ans} 段。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} ÷ ${ft(ctx.problem.a, ctx.problem.b)} ＝ ${ctx.problem.ans}，可以剪 ${ctx.problem.ans} 段。`, chant: '包含除：全部有幾個小份，每段幾個小份，相除。', transfer: '想一想：2 公升的水，用 1/4 公升的杯子，可以倒幾杯？'
  });

  // =============== 10-4 分數除以分數 ===============
  A.register('frDivFrac', {
    methods, makeProblem: (level, i, rand = Math.random) => { const B = fromLevel({ easy: [2, 3, 4], standard: [2, 3, 4, 5, 6], challenge: [3, 4, 5, 6, 7, 8] }, level);
      let a, b, c, d; do { b = any(rand, B); d = any(rand, B); a = rnd(rand, 1, 2 * b - 1); c = rnd(rand, 1, d - 1); } while (gcd(a, b) > 1 || gcd(c, d) > 1 || a * d > 60);
      const [sn, sd] = simp(a * d, b * c);
      return { a, b, c, d, sn, sd, dims: [a, b, c, d], prompt: `有 ${a}/${b} 杯麵粉，用 ${c}/${d} 杯的量匙舀，可以舀幾匙？` }; },
    planFigure: ctx => big(`${fracHtml(ctx.problem.a, ctx.problem.b)} ÷ ${fracHtml(ctx.problem.c, ctx.problem.d)}`),
    steps: [
      cStep(0, { title: '變成乘法', ask: '除以一個分數，等於乘以什麼？', id: 'inv', hints: ['除以一個數，等於乘以它的倒數。', '倒數：分子分母上下交換。', '只有除數要倒過來，被除數不動。'],
        think: '老師把除數倒過來，變成乘法。', together: '一起選：等於哪一個？', pre: prompt, figure: ctx => A.get('frDivFrac').planFigure(ctx),
        q: ctx => `${ft(ctx.problem.a, ctx.problem.b)} ÷ ${ft(ctx.problem.c, ctx.problem.d)} 等於哪一個？`, opts: ctx => { const p = ctx.problem; return [['ok', `${ft(p.a, p.b)} × ${ft(p.d, p.c)}`], ['both', `${ft(p.b, p.a)} × ${ft(p.d, p.c)}`], ['first', `${ft(p.b, p.a)} × ${ft(p.c, p.d)}`]]; }, ans: () => 'ok',
        wrong: () => ({ obs: 'divFlipWrong', msg: '只有除數（後面那個）要倒過來，前面的不動。' }), say: ex => `÷ ${ft(ex.problem.c, ex.problem.d)} ＝ × ${ft(ex.problem.d, ex.problem.c)}。` }),
      fStep(1, { title: '算出來', ask: '約分了嗎？', id: 'f', aid: true, hints: ['分子乘分子，分母乘分母。', '能約分就約分。', '答案可以是假分數。'],
        think: '老師算乘法，再約分。', together: '一起算：可以舀幾匙？', figure: ctx => A.get('frDivFrac').planFigure(ctx),
        label: () => '可以舀幾匙？寫成最簡分數（可以是假分數）。', ans: ctx => [ctx.problem.sn, ctx.problem.sd], simplest: true,
        wrong: (ctx, [x, y]) => same(x, y, ctx.problem.a * ctx.problem.c, ctx.problem.b * ctx.problem.d) ? { obs: 'divFlipWrong', msg: '要乘以倒數，不是直接乘。' } : null, say: ex => `${ft(ex.problem.sn, ex.problem.sd)} 匙。` }),
      cStep(2, { title: '檢查大小', ask: '答案比被除數大還是小？', id: 'size', fixed: true, hints: ['除數比 1 小還是比 1 大？', '除以比 1 小的數，答案變大。', '量匙比一杯小，舀的次數會比杯數多。'],
        think: '老師檢查：除以比 1 小的數，答案變大，合理。', together: '一起檢查：答案變大還是變小？',
        q: ctx => `答案和 ${ft(ctx.problem.a, ctx.problem.b)} 比？`, opts: () => [['more', '比較大'], ['less', '比較小']], ans: () => 'more',
        wrong: () => ({ obs: 'multBigger', msg: '除以比 1 小的數，答案會變大。除法不一定變小。' }), say: () => '除以比 1 小的數，答案變大。' })
    ],
    reasons, done: ctx => `${ft(ctx.problem.a, ctx.problem.b)} ÷ ${ft(ctx.problem.c, ctx.problem.d)} ＝ ${ft(ctx.problem.sn, ctx.problem.sd)}。`, chant: '分數除以分數：乘以除數的倒數；除以比 1 小的數會變大。', transfer: '想一想：3/4 公升的水，每杯 1/4 公升，可以倒幾杯？'
  });
})();

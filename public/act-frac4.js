'use strict';
// 第 33 版：分數教材包單元 11「分數小幫手」（跨領域：特殊需求領域生活管理、綜合活動）。圖形和計算在 act-frac.js（window.fracFig）。
// 核心活動 11-2（生活決策五步）：要做什麼 → 整體是什麼 → 用哪一種算 → 算出來 → 夠不夠、合不合理。
// 情境都是生活裡會遇到的：分食物、照食譜量、飲料還剩多少、半小時、買東西、食譜加倍減半、分裝飲料。店名、人名都是虛構的。
(() => {
  const A = window.areaActs, U = A.util, R = window.fracFig;
  const { rnd, any, gcd, simp, same, fromLevel, fracHtml, fracText, big, barSVG, pieSVG, cupSVG, nStep, cStep, mStep, fStep, prompt, shown, cmpKey } = R;
  const methods = [['mark', '🧑‍🍳 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['life', '想一想生活中怎麼做'], ['check', '算完檢查合不合理'], ['hint', '看提示']];
  const ft = (a, b) => `${a}/${b}`;

  // =============== 11-1 分食物 ===============
  A.register('frPizza', {
    methods, makeProblem: (level, i, rand = Math.random) => { let n, s, p; do { n = level === 'easy' ? 1 : rnd(rand, 1, 2); s = any(rand, [4, 6, 8]); p = any(rand, fromLevel({ easy: [2, 4], standard: [2, 3, 4, 6], challenge: [3, 4, 5, 6] }, level)); } while ((n * s) % p || p > n * s);
      const each = n * s / p, [sn, sd] = simp(each, s);
      return { n, s, p, each, sn, sd, dims: [n, s, p], prompt: `同學生日，買了 ${n} 個披薩，每個切成 ${s} 片。${p} 個人平分。每人分到幾片？是幾個披薩？` }; },
    planFigure: ctx => pieSVG(ctx.problem.s, 0, { wholes: ctx.problem.n, aria: `${ctx.problem.n} 個披薩，每個 ${ctx.problem.s} 片` }),
    steps: [
      nStep(0, { title: '一共幾片', ask: '全部有幾片？', id: 'all', hints: ['每個披薩幾片？有幾個披薩？', '披薩個數 × 每個的片數。', '一片一片數也可以。'],
        think: '老師先算全部有幾片。', together: '一起算：一共幾片？', pre: prompt, figure: ctx => A.get('frPizza').planFigure(ctx),
        label: () => '一共有幾片？', ans: ctx => ctx.problem.n * ctx.problem.s, say: ex => `${ex.problem.n} × ${ex.problem.s} ＝ ${ex.problem.n * ex.problem.s} 片。` }),
      nStep(1, { title: '每人幾片', ask: '每個人一樣多嗎？', id: 'each', hints: ['平分：每個人一樣多。', '全部片數 ÷ 人數。', '一人一片輪流發。'],
        think: '老師把片數平分給每個人。', together: '一起分：每人幾片？', figure: ctx => A.get('frPizza').planFigure(ctx),
        label: () => '每人分到幾片？', ans: ctx => ctx.problem.each, say: ex => `每人 ${ex.problem.each} 片。` }),
      fStep(2, { title: '是幾個披薩', ask: '整體是「一個披薩」嗎？', id: 'f', hints: ['整體是「1 個披薩」，不是全部的披薩。', '1 個披薩有幾片？那是分母。', '每人的片數是分子。'],
        think: '老師想：整體是 1 個披薩，分母是 1 個披薩的片數。', together: '一起寫：每人是幾個披薩？', figure: ctx => pieSVG(ctx.problem.s, ctx.problem.each, { wholes: ctx.problem.n }),
        label: () => '每人分到的是幾個披薩？寫成分數（可以是假分數）。', ans: ctx => [ctx.problem.each, ctx.problem.s], equiv: true,
        wrong: (ctx, [a, b]) => ctx.problem.n > 1 && same(a, b, ctx.problem.each, ctx.problem.n * ctx.problem.s) ? { obs: 'wrongWhole', msg: '整體是 1 個披薩，不是全部的披薩。' } : null, say: ex => `每人 ${ft(ex.problem.each, ex.problem.s)} 個披薩。` })
    ],
    reasons, done: ctx => `每人 ${ctx.problem.each} 片，是 ${ft(ctx.problem.each, ctx.problem.s)} 個披薩。`, chant: '分食物：先數全部，再平分，最後想「1 個」是多少。', transfer: '想一想：下次分點心，你可以怎麼分才公平？'
  });

  // =============== 11-2 照食譜做（核心：生活決策五步） ===============
  const RECIPE = [['鬆餅', '麵粉', '牛奶'], ['蛋糕', '麵粉', '糖'], ['奶茶', '紅茶', '鮮奶'], ['果汁', '柳橙汁', '蘋果汁']];
  function makeRecipe(level, i, rand = Math.random) {
    const [dish, x, y] = any(rand, RECIPE), d = 4, easy = level === 'easy';
    // 入門：同分母（四分之幾）；一般、挑戰：1/2 和 1/4（簡單異分母，N-4-6）
    const aN = easy ? rnd(rand, 1, 2) : 1, aD = easy ? 4 : 2, b = rnd(rand, 1, 3), q = aN * (d / aD) + b, have = Math.max(1, i % 2 ? q + 1 : q - 1);
    return { dish, x, y, aN, aD, b, d, q, have, dims: [aN, aD, b], prompt: `做${dish}要加 ${aN}/${aD} 杯${x}，再加 ${b}/${d} 杯${y}。家裡的量杯只有 1/4 杯的。一共要倒幾杯？要用 1/4 杯舀幾次？` };
  }
  const recFig = (ctx, k) => cupSVG(4, k == null ? 0 : k, { aria: `量杯，倒了 ${k || 0} 個 1/4 杯` });
  A.register('frRecipe', {
    methods: [['mark', '🥣 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeRecipe, planFigure: ctx => recFig(ctx, 0),
    steps: [
      cStep(0, { title: '要做什麼', ask: '題目要我算什麼？', id: 'goal', hints: ['讀一讀最後的問題。', '「一共」是要合起來。', '把兩樣材料加起來。'],
        think: '老師讀題目：要算一共倒幾杯，是把兩樣合起來。', together: '一起讀：要算什麼？', pre: prompt, figure: ctx => recFig(ctx, 0),
        q: () => '題目要我算什麼？', opts: ctx => [['sum', `${ctx.problem.x}和${ctx.problem.y}一共幾杯`], ['diff', `${ctx.problem.x}比${ctx.problem.y}多幾杯`], ['each', '每個人分幾杯']], ans: () => 'sum',
        wrong: () => ({ msg: '題目說「一共要倒幾杯」，是合起來。' }), say: () => '要算兩樣合起來一共幾杯。' }),
      cStep(1, { title: '整體是什麼', ask: '「1」是什麼？', id: 'whole', hints: ['分數後面寫的單位是什麼？', '「幾分之幾杯」：整體是 1 杯。', '量杯的 1 杯就是 1 個整體。'],
        think: '老師找整體：1 杯。', together: '一起找：整體是什麼？', figure: ctx => recFig(ctx, 4),
        q: () => '「1/4 杯」的整體是什麼？', opts: ctx => [['cup', '1 杯'], ['spoon', '1 匙'], ['dish', `1 個${ctx.problem.dish}`]], ans: () => 'cup',
        wrong: () => ({ obs: 'wrongWhole', msg: '題目說「幾分之幾杯」，整體是 1 杯。' }), say: () => '整體是 1 杯。' }),
      nStep(2, { title: '換成 1/4 杯', ask: '各是幾個 1/4 杯？', id: 'q', hints: ['1/2 杯 ＝ 2/4 杯。', '都換成幾個 1/4 杯，再加起來。', '量杯上一格是 1/4 杯。'],
        think: '老師把兩樣都換成幾個 1/4 杯，再加起來。', together: '一起換：一共幾個 1/4 杯？', figure: ctx => shown(ctx, 2) ? recFig(ctx, ctx.problem.q) : recFig(ctx, 0),
        label: () => '一共要舀幾次 1/4 杯？', ans: ctx => ctx.problem.q,
        wrong: (ctx, v) => v === ctx.problem.aN + ctx.problem.b && ctx.problem.aD !== 4 ? { obs: 'addAcross', msg: '1/2 杯是 2 個 1/4 杯，要先換。' } : null, say: ex => `一共 ${ex.problem.q} 次 1/4 杯。` }),
      fStep(3, { title: '算出來', ask: '一共幾杯？', id: 'f', hints: ['舀了幾次 1/4 杯，就是幾/4 杯。', '可以約分，也可以不約。', '超過 4 次就超過 1 杯。'],
        think: '老師寫：幾次 1/4 杯，就是幾/4 杯。', together: '一起寫：一共幾杯？', figure: ctx => recFig(ctx, ctx.problem.q),
        label: () => '一共要倒幾杯？寫成分數。', ans: ctx => [ctx.problem.q, 4], equiv: true,
        wrong: (ctx, [a, b]) => b === ctx.problem.aD + ctx.problem.d ? { obs: 'addAcross', msg: '分母不能相加。先換成一樣的分母。' } : null, say: ex => `一共 ${ft(ex.problem.q, 4)} 杯。` }),
      cStep(4, { title: '夠不夠', ask: '碗裝得下嗎？', id: 'enough', fixed: true, hints: ['比一比：要倒的和碗裝得下的。', '都換成幾個 1/4 杯再比。', '要倒的比較多，就裝不下。'],
        think: '老師比一比：要倒的和碗裝得下的。', together: '一起比：裝得下嗎？', figure: ctx => `${recFig(ctx, ctx.problem.q)}${recFig(ctx, ctx.problem.have).replace(/fr-water/g, 'fr-water b')}`,
        q: ctx => `兩樣材料要倒進同一個碗，碗最多裝 ${ft(ctx.problem.have, 4)} 杯。一共 ${ft(ctx.problem.q, 4)} 杯，裝得下嗎？`, opts: () => [['yes', '裝得下'], ['no', '裝不下']],
        ans: ctx => ctx.problem.have >= ctx.problem.q ? 'yes' : 'no', wrong: () => ({ msg: '都換成幾個 1/4 杯再比。' }), say: ex => ex.problem.have >= ex.problem.q ? '裝得下。' : '裝不下，要換大一點的碗。' })
    ],
    reasons: [['goal', '先想要做什麼'], ['whole', '找整體'], ['check', '算完看夠不夠'], ['hint', '看提示']],
    done: ctx => `一共 ${ft(ctx.problem.q, 4)} 杯，用 1/4 杯舀 ${ctx.problem.q} 次。`, chant: '照食譜做：看要做什麼、找整體、換成一樣的量匙、算出來、看夠不夠。', transfer: '想一想：回家照食譜做一次，記下你舀了幾次。'
  });
  // =============== 11-3 飲料還剩多少 ===============
  A.register('frLeft', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [3, 4], standard: [4, 5, 6, 8], challenge: [6, 8, 10] }, level)); let a, b; do { a = rnd(rand, 1, d - 2); b = rnd(rand, 1, d - 2); } while (a + b >= d);
      const r = d - a - b;
      return { d, a, b, r, dims: [d, a, b], prompt: `一瓶飲料，早上喝了 ${a}/${d} 瓶，下午喝了 ${b}/${d} 瓶。還剩幾瓶？剩下的比半瓶多還是少？` }; },
    planFigure: ctx => cupSVG(ctx.problem.d, ctx.problem.d, { unit: '1 瓶', aria: '一整瓶' }),
    steps: [
      nStep(0, { title: '喝了幾個', ask: '一共喝了幾個 1/□ 瓶？', id: 'drink', hints: ['早上和下午合起來。', '分母一樣，分子相加。', '一共喝了幾格。'],
        think: '老師把早上和下午喝的合起來。', together: '一起算：喝了幾個？', pre: prompt, figure: ctx => A.get('frLeft').planFigure(ctx),
        label: ctx => `一共喝了幾個 1/${ctx.problem.d} 瓶？`, ans: ctx => ctx.problem.a + ctx.problem.b, say: ex => `${ex.problem.a} ＋ ${ex.problem.b} ＝ ${ex.problem.a + ex.problem.b} 個。` }),
      fStep(1, { title: '還剩多少', ask: '1 瓶換成幾個 1/□？', id: 'f', hints: ['1 瓶 ＝ □/□ 瓶。', '1 瓶 － 喝掉的。', '分母不變。'],
        think: '老師把 1 瓶換成 □/□，再減掉喝的。', together: '一起算：還剩多少？', figure: ctx => cupSVG(ctx.problem.d, ctx.problem.r, { unit: '1 瓶' }),
        label: () => '還剩幾瓶？', ans: ctx => [ctx.problem.r, ctx.problem.d], equiv: true,
        wrong: (ctx, [x, y]) => x === ctx.problem.a + ctx.problem.b ? { msg: '這是喝掉的，要算剩下的。' } : y === 0 ? { obs: 'addDen', msg: '分母不用減。' } : null, say: ex => `還剩 ${ft(ex.problem.r, ex.problem.d)} 瓶。` }),
      cStep(2, { title: '比半瓶', ask: '比一半多還是少？', id: 'half', fixed: true, hints: ['半瓶是 1/2 瓶。', '把 1/2 換成分母一樣的分數。', '或看圖：水有沒有超過一半的線？'],
        think: '老師把半瓶換成一樣的分母來比。', together: '一起比：比半瓶多嗎？', figure: ctx => cupSVG(ctx.problem.d, ctx.problem.r, { unit: '1 瓶' }),
        q: () => '剩下的和半瓶比？', opts: () => [['lt', '比半瓶少'], ['eq', '剛好半瓶'], ['gt', '比半瓶多']], ans: ctx => cmpKey(2 * ctx.problem.r, ctx.problem.d),
        wrong: () => ({ msg: '半瓶 ＝ 1/2 瓶，換成一樣的分母再比。' }), say: ex => ({ lt: '比半瓶少。', eq: '剛好半瓶。', gt: '比半瓶多。' })[cmpKey(2 * ex.problem.r, ex.problem.d)] })
    ],
    reasons, done: ctx => `還剩 ${ft(ctx.problem.r, ctx.problem.d)} 瓶。`, chant: '還剩多少：1 換成 □/□，減掉用掉的。', transfer: '想一想：家裡的洗髮精還剩多少？什麼時候要買新的？'
  });

  // =============== 11-4 半小時和一刻鐘 ===============
  A.register('frClock', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [2, 4], standard: [2, 3, 4, 6], challenge: [3, 4, 5, 6, 10, 12] }, level)), a = level === 'easy' ? rnd(rand, 1, d - 1) : rnd(rand, 1, d - 1);
      const what = any(rand, ['下課', '坐公車到學校', '寫功課', '午休', '洗澡']);
      return { d, a, min: 60 * a / d, what, dims: [a, d], prompt: `${what}要 ${a}/${d} 小時。是幾分鐘？` }; },
    planFigure: ctx => pieSVG(ctx.problem.d, ctx.problem.a, { aria: `一小時平分成 ${ctx.problem.d} 份，塗了 ${ctx.problem.a} 份` }),
    steps: [
      nStep(0, { title: '一份幾分鐘', ask: '1 小時平分成幾份，一份幾分鐘？', id: 'per', hints: ['1 小時 ＝ 60 分鐘。', '60 ÷ 分母。', '時鐘上，半小時是 30 分鐘。'],
        think: '老師把 60 分鐘平分成分母那麼多份。', together: '一起算：一份幾分鐘？', pre: prompt, figure: ctx => A.get('frClock').planFigure(ctx),
        label: ctx => `1/${ctx.problem.d} 小時是幾分鐘？`, ans: ctx => 60 / ctx.problem.d,
        wrong: (ctx, v) => v === 100 / ctx.problem.d ? { obs: 'base100', msg: '1 小時是 60 分鐘，不是 100 分鐘。' } : null, say: ex => `60 ÷ ${ex.problem.d} ＝ ${60 / ex.problem.d} 分鐘。` }),
      nStep(1, { title: '幾份', ask: '幾份是幾分鐘？', id: 'min', hints: ['一份的分鐘數 × 分子。', '例如 3/4 小時 ＝ 3 個 15 分鐘。', '看圖數一數。'],
        think: '老師用一份的分鐘數乘以份數。', together: '一起算：是幾分鐘？', figure: ctx => A.get('frClock').planFigure(ctx),
        label: ctx => `${ctx.problem.a}/${ctx.problem.d} 小時是幾分鐘？`, ans: ctx => ctx.problem.min, say: ex => `${60 / ex.problem.d} × ${ex.problem.a} ＝ ${ex.problem.min} 分鐘。` })
    ],
    reasons, done: ctx => `${ctx.problem.a}/${ctx.problem.d} 小時 ＝ ${ctx.problem.min} 分鐘。`, chant: '1 小時是 60 分鐘：半小時 30 分鐘，一刻鐘（1/4 小時）15 分鐘。', transfer: '想一想：老師說「再半小時下課」，是幾分鐘？'
  });

  // =============== 11-5 買東西（半價、幾分之幾打） ===============
  A.register('frShop', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      if (i % 2 === 0) { const d = any(rand, fromLevel({ easy: [2], standard: [2, 4], challenge: [2, 4, 5] }, level)), price = d * rnd(rand, 3, level === 'easy' ? 10 : 20) * (d === 5 ? 2 : 1) * 5 / 5;
        return { kind: 'price', d, a: 1, total: price, ans: price / d, dims: [price, d], prompt: d === 2 ? `文具店的筆記本一本 ${price} 元，今天半價（原價的 1/2）。要付幾元？` : `文具店的鉛筆盒一個 ${price} 元，今天只要原價的 1/${d}。要付幾元？` }; }
      const d = any(rand, fromLevel({ easy: [2, 3], standard: [2, 3, 4], challenge: [3, 4, 6] }, level)), a = rnd(rand, 1, d - 1);
      return { kind: 'dozen', d, a, total: 12, ans: 12 * a / d, dims: [12, a, d], prompt: `一打鉛筆是 12 枝。買 ${a}/${d} 打鉛筆，是幾枝？` }; },
    planFigure: ctx => ctx.problem.kind === 'dozen' ? big(Array.from({ length: ctx.problem.d }, (_, g) => `<span class="fr-group${g < ctx.problem.a ? ' on' : ''}">${'✏️'.repeat(12 / ctx.problem.d)}</span>`).join(' ')) : barSVG(ctx.problem.d, 1, { aria: `原價平分成 ${ctx.problem.d} 份` }),
    steps: [
      nStep(0, { title: '一份是多少', ask: '平分成幾份，一份是多少？', id: 'per', hints: ['把全部平分成分母那麼多份。', '全部 ÷ 分母。', '半價：原價 ÷ 2。'],
        think: '老師把全部平分成分母那麼多份。', together: '一起算：一份是多少？', pre: prompt, figure: ctx => A.get('frShop').planFigure(ctx),
        label: ctx => ctx.problem.kind === 'dozen' ? `12 枝的 1/${ctx.problem.d} 是幾枝？` : `${ctx.problem.total} 元的 1/${ctx.problem.d} 是幾元？`, ans: ctx => ctx.problem.total / ctx.problem.d, say: ex => `${ex.problem.total} ÷ ${ex.problem.d} ＝ ${ex.problem.total / ex.problem.d}。` }),
      nStep(1, { title: '答案', ask: '要拿幾份？', id: 'ans', hints: ['分子是幾，就拿幾份。', '一份 × 分子。', '算完想想合不合理：半價一定比原價便宜。'],
        think: '老師拿分子那麼多份。', together: '一起算：答案是多少？', figure: ctx => A.get('frShop').planFigure(ctx),
        label: ctx => ctx.problem.kind === 'dozen' ? '是幾枝？' : '要付幾元？', ans: ctx => ctx.problem.ans,
        wrong: (ctx, v) => v > ctx.problem.total ? { obs: 'multBigger', msg: '只買一部分（或打折），一定比全部少。' } : null, say: ex => ex.problem.kind === 'dozen' ? `${ex.problem.ans} 枝。` : `要付 ${ex.problem.ans} 元。` })
    ],
    reasons, done: ctx => ctx.problem.kind === 'dozen' ? `${ctx.problem.a}/${ctx.problem.d} 打是 ${ctx.problem.ans} 枝。` : `要付 ${ctx.problem.ans} 元。`, chant: '買東西：幾分之幾，就是先平分，再拿幾份。', transfer: '想一想：超市的「第二件半價」，兩件要付多少？'
  });

  // =============== 11-6 食譜加倍或減半 ===============
  A.register('frDouble', {
    methods, makeProblem: (level, i, rand = Math.random) => { let a, b; do { b = any(rand, [2, 3, 4]); a = rnd(rand, 1, b - 1); } while (gcd(a, b) > 1);
      const kind = level === 'challenge' && i % 3 === 2 ? 'x3h' : i % 2 ? 'half' : 'double';
      const [n, d] = kind === 'double' ? simp(2 * a, b) : kind === 'half' ? simp(a, 2 * b) : simp(3 * a, 2 * b);
      const people = kind === 'double' ? 8 : kind === 'half' ? 2 : 6;
      return { a, b, kind, n, d, people, dims: [a, b, people], prompt: `食譜寫：4 個人的鬆餅要 ${a}/${b} 杯牛奶。現在要做 ${people} 個人的，要幾杯牛奶？` }; },
    planFigure: ctx => cupSVG(ctx.problem.b, ctx.problem.a, { aria: `${ctx.problem.a}/${ctx.problem.b} 杯` }),
    steps: [
      cStep(0, { title: '變成幾倍', ask: '人數變成幾倍？', id: 'times', hints: ['新的人數 ÷ 原來的人數。', '8 人是 4 人的 2 倍；2 人是 4 人的 1/2。', '6 人是 4 人的 3/2 倍。'],
        think: '老師比人數：新的是原來的幾倍。', together: '一起想：變成幾倍？', pre: prompt, figure: ctx => A.get('frDouble').planFigure(ctx),
        q: ctx => `${ctx.problem.people} 人是 4 人的幾倍？`, opts: () => [['double', '2 倍'], ['half', '1/2 倍（一半）'], ['x3h', '3/2 倍']], ans: ctx => ctx.problem.kind,
        wrong: () => ({ msg: '新的人數 ÷ 4。' }), say: ex => ({ double: '變成 2 倍。', half: '變成一半。', x3h: '變成 3/2 倍。' })[ex.problem.kind] }),
      fStep(1, { title: '算出來', ask: '牛奶也變成幾倍了嗎？', id: 'f', aid: true, hints: ['牛奶也要乘同一個倍數。', '2 倍：分子乘 2；一半：分母乘 2。', '能約分就約分。'],
        think: '老師把牛奶也乘以同一個倍數。', together: '一起算：要幾杯？', figure: ctx => cupSVG(ctx.problem.d, ctx.problem.n, { aria: '新的量' }),
        label: () => '要幾杯牛奶？', ans: ctx => [ctx.problem.n, ctx.problem.d], equiv: true,
        wrong: (ctx, [x, y]) => ctx.problem.kind === 'double' && same(x, y, ctx.problem.a, 2 * ctx.problem.b) ? { obs: 'multBigger', msg: '人變多，牛奶要變多，不是變少。' } : ctx.problem.kind === 'half' && same(x, y, 2 * ctx.problem.a, ctx.problem.b) ? { msg: '人變少，牛奶要變少。' } : null, say: ex => `要 ${ft(ex.problem.n, ex.problem.d)} 杯。` })
    ],
    reasons, done: ctx => `${ctx.problem.people} 個人要 ${ft(ctx.problem.n, ctx.problem.d)} 杯牛奶。`, chant: '食譜加倍或減半：人數變幾倍，材料就乘幾倍。', transfer: '想一想：家裡有 6 個人，泡麵的水要怎麼算？'
  });

  // =============== 11-7 分裝飲料（整數相除是分數） ===============
  A.register('frPour', {
    methods, makeProblem: (level, i, rand = Math.random) => { let L, n; do { L = rnd(rand, 1, level === 'easy' ? 3 : 5); n = rnd(rand, 2, level === 'easy' ? 4 : 8); } while (L % n === 0);
      return { L, n, dims: [L, n], prompt: `班上有 ${L} 公升的果汁，平分倒進 ${n} 個瓶子。每瓶幾公升？比 1 公升多還是少？` }; },
    planFigure: ctx => cupSVG(ctx.problem.n, ctx.problem.L * ctx.problem.n, { unit: '1 公升', aria: `${ctx.problem.L} 公升果汁` }),
    steps: [
      cStep(0, { title: '列算式', ask: '平分要用什麼算？', id: 'op', hints: ['平分給幾瓶，用除法。', '全部 ÷ 瓶數。', '分不完也可以用分數表示。'],
        think: '老師想：平分，用除法。', together: '一起選：算式是哪一個？', pre: prompt, figure: ctx => A.get('frPour').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => [['div', `${ctx.problem.L} ÷ ${ctx.problem.n}`], ['rev', `${ctx.problem.n} ÷ ${ctx.problem.L}`], ['mul', `${ctx.problem.L} × ${ctx.problem.n}`]], ans: () => 'div',
        wrong: (ctx, a) => a === 'rev' ? { obs: 'numDenSwap', msg: '是把果汁分給瓶子：果汁 ÷ 瓶數。' } : { msg: '平分用除法。' }, say: ex => `${ex.problem.L} ÷ ${ex.problem.n}。` }),
      fStep(1, { title: '寫成分數', ask: '分不完怎麼辦？', id: 'f', hints: ['□ ÷ △ ＝ □/△。', '被除數寫上面，除數寫下面。', '可以約分。'],
        think: '老師寫：□ ÷ △ ＝ □/△。', together: '一起寫：每瓶幾公升？', figure: ctx => A.get('frPour').planFigure(ctx),
        label: () => '每瓶幾公升？寫成分數（可以是假分數）。', ans: ctx => [ctx.problem.L, ctx.problem.n], equiv: true,
        wrong: (ctx, [a, b]) => b === 1 || a === Math.floor(ctx.problem.L / ctx.problem.n) ? { obs: 'remainderFrac', msg: '分不完的部分也要分：寫成分數。' } : null, say: ex => `每瓶 ${ft(ex.problem.L, ex.problem.n)} 公升。` }),
      cStep(2, { title: '合不合理', ask: '比 1 公升多還是少？', id: 'one', fixed: true, hints: ['分子和分母比一比。', '果汁比瓶子少，每瓶就不到 1 公升。', '分子比分母大，就超過 1 公升。'],
        think: '老師檢查：每瓶比 1 公升多還是少，合不合理。', together: '一起檢查：多還是少？', figure: ctx => A.get('frPour').planFigure(ctx),
        q: () => '每瓶和 1 公升比？', opts: () => [['lt', '比 1 公升少'], ['gt', '比 1 公升多']], ans: ctx => ctx.problem.L < ctx.problem.n ? 'lt' : 'gt',
        wrong: () => ({ msg: '分子和分母比一比。' }), say: ex => ex.problem.L < ex.problem.n ? '比 1 公升少。' : '比 1 公升多。' })
    ],
    reasons, done: ctx => `${ctx.problem.L} ÷ ${ctx.problem.n} ＝ ${ft(ctx.problem.L, ctx.problem.n)}，每瓶 ${ft(ctx.problem.L, ctx.problem.n)} 公升。`, chant: '分裝：全部 ÷ 份數 ＝ 分數。', transfer: '想一想：班上 2 公升的水，分給 6 組，每組多少？'
  });
})();

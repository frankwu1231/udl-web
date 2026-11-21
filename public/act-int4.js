'use strict';
// 第 35 版：整數四則運算教材包單元 11「算數小幫手」（跨領域：特殊需求領域生活管理、綜合活動）。圖形和計算在 act-int.js（window.intFig）。
// 核心活動 11-1（生活決策五步）：看情境 → 找出要算什麼 → 選方法 → 算出來 → 檢查、做決定。
// 情境都是學校、家裡、社區會遇到的：福利社、文具店、班級慶生、校外教學、超市、班級聚餐。店名、人名都是虛構的；只用錢當情境，不教認識錢幣（留給錢幣教材包）。
(() => {
  const A = window.areaActs, I = window.intFig;
  const { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, timesAid, placeAid, round10, round100, chips, groups, colHtml, tapeSVG } = I;
  const methods = [['mark', '🛒 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['life', '想一想生活中怎麼做'], ['check', '算完檢查合不合理'], ['hint', '看提示']];
  const OPN = [['+', '加起來（＋）'], ['-', '減掉（－）'], ['*', '乘（×）'], ['/', '除（÷）']];
  const uniq = (list, n = 4) => list.filter((x, k) => list.findIndex(y => y[1] === x[1]) === k).slice(0, n);
  const receipt = items => `<table class="fm-ttable in-receipt" aria-label="價目表"><tbody>${items.map(([n, p]) => `<tr><th scope="row">${esc(n)}</th><td>${p} 元</td></tr>`).join('')}</tbody></table>`;

  // =============== 11-1 錢夠不夠（核心：生活決策五步） ===============
  const SNACKS = [['麵包', 25, 45], ['牛奶', 15, 35], ['飯糰', 25, 40], ['餅乾', 10, 30], ['果汁', 20, 35], ['布丁', 15, 30], ['茶葉蛋', 10, 15], ['香蕉', 10, 20]];
  A.register('inEnough', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      const n = fromLevel({ easy: 2, standard: 3, challenge: 3 }, level), k = level === 'challenge' ? 3 : 1;   // 挑戰：每樣買好幾個以前先選一樣多買
      for (;;) { const pool = [...SNACKS].sort(() => rand() - 0.5).slice(0, n), items = pool.map(([w, lo, hi]) => [w, rnd(rand, lo, hi)]), tot = items.reduce((s, x) => s + x[1], 0) * (level === 'challenge' ? 1 : 1);
        const enough = i % 2 === 0, bill = fromLevel({ easy: [50, 100], standard: [100, 100], challenge: [100, 200] }, level), money = enough ? Math.max(tot, any(rand, bill)) : tot - rnd(rand, 1, Math.min(9, tot - 1));
        if (money === tot && enough && rand() < 0.5) continue;
        if (money < 10 || money > 500) continue;
        return { items, tot, money, enough: money >= tot, k, dims: [money, ...items.map(x => x[1])], prompt: `小安帶 ${money} 元去福利社，想買${items.map(x => x[0]).join('、')}。錢夠不夠？` }; } },
    planFigure: ctx => receipt(ctx.problem.items),
    steps: [
      cStep(0, { title: '看情境', ask: '我要做什麼決定？', id: 'goal', hints: ['讀題目：小安想做什麼？', '要決定的是「買得起嗎」。', '先知道要決定什麼，再算。'],
        think: '老師先想：要決定的是錢夠不夠買。', together: '一起想：要做什麼決定？', pre: prompt, figure: ctx => receipt(ctx.problem.items),
        q: () => '要決定什麼？', opts: () => [['ok', '帶的錢夠不夠買'], ['cheap', '哪一樣最便宜'], ['many', '可以買幾個']], ans: () => 'ok', wrong: () => ({ msg: '題目問的是「錢夠不夠」。' }), say: () => '要決定錢夠不夠。' }),
      cStep(1, { title: '找出要算什麼', ask: '要先知道什麼？', id: 'need', hints: ['要和帶的錢比的是什麼？', '全部東西加起來要多少錢。', '先算出一共要多少錢。'],
        think: '老師想：先算全部東西一共多少錢，再和帶的錢比。', together: '一起想：要算什麼？', figure: ctx => receipt(ctx.problem.items),
        q: () => '要先算出什麼？', opts: () => [['ok', '全部一共多少錢'], ['one', '最貴的多少錢'], ['left', '帶的錢減最便宜的']], ans: () => 'ok', wrong: () => ({ msg: '每一樣都要買，要算全部一共多少。' }), say: () => '先算全部一共多少錢。' }),
      cStep(2, { title: '選方法', ask: '一共多少錢，用什麼算？', id: 'op', fixed: true, hints: ['好幾樣東西的錢合起來。', '合起來用加的。', '把每一樣的價錢加起來。'],
        think: '老師選加法：每一樣的錢合起來。', together: '一起選：用什麼算？', figure: ctx => receipt(ctx.problem.items),
        q: () => '用什麼算？', opts: () => OPN, ans: () => '+', wrong: () => ({ obs: 'opWrong', msg: '好幾樣合起來用加的。' }), say: () => '用加的。' }),
      nStep(3, { title: '算出來', ask: '一共多少錢？', id: 'tot', hints: ['一樣一樣加。', '可以先估：每樣想成整十。', '用直式加，個位對個位。'],
        think: '老師一樣一樣加起來。', together: '一起加：一共多少？', pre: placeAid, figure: ctx => receipt(ctx.problem.items),
        label: () => '一共要多少元？', ans: ctx => ctx.problem.tot, say: e => `${e.problem.items.map(x => x[1]).join(' ＋ ')} ＝ ${e.problem.tot} 元。` }),
      cStep(4, { title: '檢查、做決定', ask: '和帶的錢比一比。', id: 'ok', fixed: true, hints: ['帶的錢比一共的錢多，或一樣：夠。', '帶的錢比較少：不夠。', '不夠的話，可以少買一樣。'],
        think: '老師把帶的錢和一共的錢比一比，做決定。', together: '一起決定：錢夠不夠？', figure: ctx => receipt(ctx.problem.items),
        q: ctx => `帶 ${ctx.problem.money} 元，一共要 ${ctx.problem.tot} 元。夠不夠？`, opts: () => [['yes', '夠，可以買'], ['no', '不夠，要少買一樣']], ans: ctx => ctx.problem.enough ? 'yes' : 'no',
        wrong: ctx => ({ obs: 'compareWrong', msg: ctx.problem.enough ? '帶的錢比較多（或一樣），是夠的。' : '帶的錢比較少，不夠。' }), say: e => e.problem.enough ? `夠，還剩 ${e.problem.money - e.problem.tot} 元。` : `不夠，差 ${e.problem.tot - e.problem.money} 元。` })
    ],
    reasons, done: ctx => ctx.problem.enough ? `一共 ${ctx.problem.tot} 元，${ctx.problem.money} 元夠用。` : `一共 ${ctx.problem.tot} 元，${ctx.problem.money} 元不夠，差 ${ctx.problem.tot - ctx.problem.money} 元。`,
    chant: '生活決策：看情境、找出要算什麼、選方法、算出來、檢查再決定。', transfer: '想一想：去便利商店以前，怎麼知道帶的錢夠不夠？'
  });

  // =============== 11-2 要找多少錢 ===============
  A.register('inChange', {
    methods, makeProblem: (level, i, rand = Math.random) => { const bill = any(rand, fromLevel({ easy: [50, 100], standard: [100, 500], challenge: [500, 1000] }, level)); let price; do price = rnd(rand, Math.floor(bill / 5), bill - 1); while (price % 10 === 0 && rand() < 0.7);
      const w = any(rand, [['鉛筆盒', '文具店'], ['故事書', '書店'], ['水壺', '超市'], ['色鉛筆', '文具店']]);
      return { bill, price, ch: bill - price, w, dims: [bill, price], prompt: `在${w[1]}買一個${w[0]} ${price} 元，付了 ${bill} 元。店員要找多少元？` }; },
    planFigure: ctx => receipt([[ctx.problem.w[0], ctx.problem.price]]),
    steps: [
      cStep(0, { title: '選方法', ask: '找錢用什麼算？', id: 'op', fixed: true, hints: ['付的錢比價錢多。', '多出來的要找回來。', '付的錢 － 價錢。'],
        think: '老師想：找錢是付的錢減掉價錢。', together: '一起選：用什麼算？', pre: prompt, figure: ctx => A.get('inChange').planFigure(ctx),
        q: () => '找錢用什麼算？', opts: () => OPN, ans: () => '-', wrong: () => ({ obs: 'opWrong', msg: '找錢：付的錢減掉價錢。' }), say: () => '用減的。' }),
      nStep(1, { title: '算出來', ask: '付的錢 － 價錢。', id: 'ch', hints: ['用直式減。', '不夠減要借。', '也可以從價錢往上數到付的錢。'],
        think: '老師用直式減，也可以從價錢往上數。', together: '一起算：找多少？', pre: placeAid, figure: ctx => colHtml(ctx.problem.bill, ctx.problem.price, '-'),
        label: ctx => `${ctx.problem.bill} － ${ctx.problem.price} ＝ ？`, ans: ctx => ctx.problem.ch, wrong: (ctx, v) => v === I.bigMinusSmall(ctx.problem.bill, ctx.problem.price) ? { obs: 'subSmallFromBig', msg: '不夠減時要借，不能倒過來減。' } : null, say: e => `${e.problem.bill} － ${e.problem.price} ＝ ${e.problem.ch}。` }),
      nStep(2, { title: '檢查', ask: '找的錢 ＋ 價錢 ＝ 付的錢嗎？', id: 'back', hints: ['用加法驗算。', '找的錢加上價錢。', '要等於付的錢。'],
        think: '老師驗算：找的錢加價錢，要等於付的錢。', together: '一起驗算：是多少？', figure: ctx => colHtml(ctx.problem.ch, ctx.problem.price, '+', { head: false }),
        label: ctx => `${ctx.problem.ch} ＋ ${ctx.problem.price} ＝ ？`, ans: ctx => ctx.problem.bill, say: e => `${e.problem.ch} ＋ ${e.problem.price} ＝ ${e.problem.bill}，找對了。` })
    ],
    reasons, done: ctx => `要找 ${ctx.problem.ch} 元。`, chant: '找錢：付的錢減價錢，再用加法驗算。', transfer: '想一想：店員找錢的時候，你要怎麼確定找得對？'
  });

  // =============== 11-3 買好幾個一樣的 ===============
  A.register('inBuyMany', {
    methods, makeProblem: (level, i, rand = Math.random) => { const p = rnd(rand, fromLevel({ easy: 2, standard: 5, challenge: 12 }, level), fromLevel({ easy: 9, standard: 30, challenge: 85 }, level)), k = rnd(rand, 2, 9), w = any(rand, ['原子筆', '筆記本', '橡皮擦', '口罩']);
      const tot = p * k, budget = i % 2 === 0 ? tot + rnd(rand, 0, 20) : Math.max(1, tot - rnd(rand, 1, Math.min(20, tot - 1)));
      return { p, k, w, tot, budget, dims: [p, k, budget], prompt: `一個${w} ${p} 元，要買 ${k} 個。帶了 ${budget} 元，夠不夠？` }; },
    planFigure: ctx => groups(ctx.problem.k, 1, { e: '🏷️', u: '個', aria: `${ctx.problem.k} 個，每個 ${ctx.problem.p} 元` }),
    steps: [
      cStep(0, { title: '選方法', ask: '好幾個一樣價錢，用什麼算？', id: 'op', fixed: true, hints: ['每一個都一樣價錢。', '一樣多的好幾份用乘的。', '單價 × 個數。'],
        think: '老師想：一樣價錢的好幾個，用乘的。', together: '一起選：用什麼算？', pre: prompt, figure: ctx => A.get('inBuyMany').planFigure(ctx),
        q: () => '用什麼算？', opts: () => OPN, ans: () => '*', wrong: (ctx, v) => ({ obs: v === '+' ? 'eqSum' : 'opWrong', msg: '一樣價錢的好幾個，用乘的。' }), say: () => '用乘的。' }),
      nStep(1, { title: '算出來', ask: '單價 × 個數。', id: 'tot', hints: ['一個的錢 × 個數。', '可以打開九九乘法表。', '兩位數乘一位數用直式。'],
        think: '老師算：單價乘個數。', together: '一起算：一共多少？', pre: timesAid, figure: ctx => colHtml(ctx.problem.p, ctx.problem.k, '*', { head: false }),
        label: ctx => `${ctx.problem.p} × ${ctx.problem.k} ＝ ？`, ans: ctx => ctx.problem.tot, wrong: (ctx, v) => v === ctx.problem.p + ctx.problem.k ? { obs: 'eqSum', msg: '不是加起來，是 ' + ctx.problem.k + ' 個 ' + ctx.problem.p + ' 元。' } : null, say: e => `${e.problem.p} × ${e.problem.k} ＝ ${e.problem.tot}。` }),
      cStep(2, { title: '做決定', ask: '帶的錢夠不夠？', id: 'ok', fixed: true, hints: ['比一比帶的錢和一共的錢。', '帶的錢比較多（或一樣）就夠。', '不夠可以少買幾個。'],
        think: '老師比一比，做決定。', together: '一起決定：夠不夠？', figure: ctx => A.get('inBuyMany').planFigure(ctx),
        q: ctx => `一共 ${ctx.problem.tot} 元，帶了 ${ctx.problem.budget} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.budget >= ctx.problem.tot ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.budget >= e.problem.tot ? '夠。' : '不夠。' })
    ],
    reasons, done: ctx => `一共 ${ctx.problem.tot} 元，${ctx.problem.budget >= ctx.problem.tot ? '帶的錢夠' : '帶的錢不夠'}。`, chant: '買好幾個一樣的：單價乘個數，再和帶的錢比。', transfer: '想一想：一包衛生紙 35 元，買 4 包要多少錢？'
  });

  // =============== 11-4 大家分一分（平分有剩） ===============
  A.register('inShareSnack', {
    methods, makeProblem: (level, i, rand = Math.random) => { const k = rnd(rand, fromLevel({ easy: 2, standard: 3, challenge: 6 }, level), fromLevel({ easy: 5, standard: 9, challenge: 30 }, level)), q = rnd(rand, 2, level === 'challenge' ? 6 : 9), r = rnd(rand, 1, k - 1), t = k * q + r;
      return { k, q, r, t, dims: [t, k], prompt: `班上慶生，有 ${t} 塊小蛋糕，平分給 ${k} 位同學。每人幾塊？剩幾塊？` }; },
    planFigure: ctx => ctx.problem.t <= 60 ? chips(ctx.problem.t, { e: '🧁' }) : big(`🧁 × ${ctx.problem.t}`),
    steps: [
      cStep(0, { title: '選方法', ask: '平分用什麼算？', id: 'op', fixed: true, hints: ['平分：每人一樣多。', '全部 ÷ 人數。', '用除的。'],
        think: '老師想：平分用除的。', together: '一起選：用什麼算？', pre: prompt, figure: ctx => A.get('inShareSnack').planFigure(ctx),
        q: () => '用什麼算？', opts: () => OPN, ans: () => '/', wrong: () => ({ obs: 'opWrong', msg: '平分用除的。' }), say: () => '用除的。' }),
      mStep(1, { title: '算出來', ask: '每人幾塊？剩幾塊？', hints: ['人數 × 幾，最接近又不超過全部？', '剩下的要比人數少。', '可以打開九九乘法表。'],
        think: '老師用除法算出每人幾塊、剩幾塊。', together: '一起算：每人幾塊、剩幾塊？', pre: timesAid, figure: ctx => groups(Math.min(ctx.problem.k, 12), ctx.problem.q, { e: '🧁', u: '人', aria: `${ctx.problem.k} 人，每人 ${ctx.problem.q} 塊` }),
        fields: [['q', () => '每人幾塊？', ctx => ctx.problem.q], ['r', () => '剩幾塊？', ctx => ctx.problem.r, (ctx, v) => v >= ctx.problem.k ? { obs: 'remBig', msg: '剩下的還夠每人再分一塊。' } : null]],
        say: e => `${e.problem.t} ÷ ${e.problem.k} ＝ ${e.problem.q} …… ${e.problem.r}。` }),
      cStep(2, { title: '剩下的怎麼辦', ask: '剩下的還能每人再分一塊嗎？', id: 'left', fixed: true, hints: ['剩下的和人數比一比。', '比人數少，就不能每人再一塊。', '可以和大家商量怎麼處理（例如請老師分）。'],
        think: '老師想：剩的比人數少，不能每人再一塊，要大家商量。', together: '一起想：能每人再分一塊嗎？', figure: ctx => chips(ctx.problem.r, { e: '🧁', aria: `剩 ${ctx.problem.r} 塊` }),
        q: ctx => `剩 ${ctx.problem.r} 塊、有 ${ctx.problem.k} 位同學。能每人再分一塊嗎？`, opts: () => [['no', '不能，剩的比人數少，大家商量怎麼處理'], ['yes', '可以，每人再一塊']], ans: () => 'no', wrong: () => ({ obs: 'remBig', msg: '剩的比人數少，不夠每人一塊。' }), say: () => '不能，剩下的大家商量。' })
    ],
    reasons, done: ctx => `每人 ${ctx.problem.q} 塊，剩 ${ctx.problem.r} 塊。`, chant: '平分：全部除以人數；剩的比人數少，大家商量。', transfer: '想一想：分點心剩下幾個的時候，怎麼處理才公平？'
  });

  // =============== 11-5 要幾台、要幾盒（有剩也要多一台） ===============
  const CARS = [['校外教學有 {n} 人，一輛遊覽車坐 {c} 人', '輛遊覽車', '人'], ['要買 {n} 顆雞蛋，一盒裝 {c} 顆', '盒雞蛋', '顆'], ['{n} 位同學去划船，一艘船坐 {c} 人', '艘船', '人'], ['要裝 {n} 本書，一個箱子裝 {c} 本', '個箱子', '本']];
  A.register('inHowMany', {
    methods, makeProblem: (level, i, rand = Math.random) => { const c = rnd(rand, fromLevel({ easy: 2, standard: 4, challenge: 12 }, level), fromLevel({ easy: 6, standard: 10, challenge: 45 }, level)), q = rnd(rand, 2, 9), r = i % 3 === 2 ? 0 : rnd(rand, 1, c - 1), n = c * q + r, t = any(rand, CARS);
      return { c, q, r, n, t, need: r ? q + 1 : q, dims: [n, c], prompt: `${t[0].replace('{n}', n).replace('{c}', c)}。至少要幾${t[1]}？` }; },
    planFigure: ctx => big(`${ctx.problem.n} ${ctx.problem.t[2]}　每${ctx.problem.t[1].slice(0, 1)} ${ctx.problem.c} ${ctx.problem.t[2]}`),
    steps: [
      cStep(0, { title: '選方法', ask: '每一份裝幾個，要幾份？', id: 'op', fixed: true, hints: ['全部裡面有幾個「一份」。', '全部 ÷ 每份的數。', '用除的。'],
        think: '老師想：全部除以每份的數，看要幾份。', together: '一起選：用什麼算？', pre: prompt, figure: ctx => A.get('inHowMany').planFigure(ctx),
        q: () => '用什麼算？', opts: () => OPN, ans: () => '/', wrong: () => ({ obs: 'opWrong', msg: '看全部裡面有幾份，用除的。' }), say: () => '用除的。' }),
      mStep(1, { title: '算出來', ask: '商和餘數是多少？', hints: ['全部 ÷ 每份的數。', '可以打開九九乘法表。', '餘數要比除數小。'],
        think: '老師算出商和餘數。', together: '一起算：商和餘數？', pre: timesAid, figure: ctx => A.get('inHowMany').planFigure(ctx),
        fields: [['q', () => '商', ctx => ctx.problem.q], ['r', () => '餘數', ctx => ctx.problem.r, (ctx, v) => v >= ctx.problem.c ? { obs: 'remBig', msg: '餘數要比除數小。' } : null]],
        say: e => `${e.problem.n} ÷ ${e.problem.c} ＝ ${e.problem.q}${e.problem.r ? ` …… ${e.problem.r}` : ''}。` }),
      nStep(2, { title: '做決定', ask: '剩下的也要有地方嗎？', id: 'need', hints: ['有剩下的，也要再多一份。', '剩下的人也要坐車、剩下的蛋也要裝。', '沒有剩，就是商。'],
        think: '老師想：有剩下的，就要多一份。', together: '一起決定：至少要幾份？', figure: ctx => A.get('inHowMany').planFigure(ctx),
        label: ctx => `至少要幾${ctx.problem.t[1]}？`, ans: ctx => ctx.problem.need, wrong: (ctx, v) => ctx.problem.r && v === ctx.problem.q ? { obs: 'roundDown', msg: `還剩 ${ctx.problem.r} ${ctx.problem.t[2]}，也要再一${ctx.problem.t[1].slice(0, 1)}。` } : null, say: e => e.problem.r ? `剩 ${e.problem.r}，要多一${e.problem.t[1].slice(0, 1)}，一共 ${e.problem.need}。` : `剛好，${e.problem.need}。` })
    ],
    reasons, done: ctx => `至少要 ${ctx.problem.need} ${ctx.problem.t[1]}。`, chant: '要幾台：全部除以每份；有剩下的，要再多一份。', transfer: '想一想：買雞蛋的時候，為什麼有時候要多買一盒？'
  });

  // =============== 11-6 哪一個比較划算（比單價） ===============
  A.register('inBetter', {
    methods, makeProblem: (level, i, rand = Math.random) => { const w = any(rand, [['養樂多', '瓶'], ['衛生紙', '包'], ['鉛筆', '枝'], ['優格', '杯']]);
      for (;;) { const a = rnd(rand, 2, 6), b = rnd(rand, 8, fromLevel({ easy: 12, standard: 20, challenge: 30 }, level)), ua = rnd(rand, 8, 30), ub = ua + any(rand, [-3, -2, -1, 1, 2]);
        if (ub < 5 || ua === ub || a * ua > 999 || b * ub > 999) continue;
        return { w, a, b, ua, ub, pa: a * ua, pb: b * ub, dims: [a, a * ua, b, b * ub], prompt: `${w[0]}小包裝 ${a} ${w[1]} ${a * ua} 元，大包裝 ${b} ${w[1]} ${b * ub} 元。哪一種一${w[1]}比較便宜？` }; } },
    planFigure: ctx => receipt([[`小包裝 ${ctx.problem.a} ${ctx.problem.w[1]}`, ctx.problem.pa], [`大包裝 ${ctx.problem.b} ${ctx.problem.w[1]}`, ctx.problem.pb]]),
    steps: [
      nStep(0, { title: '小包一個多少', ask: '總價 ÷ 個數。', id: 'ua', hints: ['平分：一包的錢分給每一個。', '總價 ÷ 個數。', '可以打開九九乘法表想。'],
        think: '老師算小包裝一個多少錢。', together: '一起算：小包一個多少？', pre: ctx => `${prompt(ctx)}${timesAid(ctx)}`, figure: ctx => A.get('inBetter').planFigure(ctx),
        label: ctx => `${ctx.problem.pa} ÷ ${ctx.problem.a} ＝ ？`, ans: ctx => ctx.problem.ua, say: e => `小包一${e.problem.w[1]} ${e.problem.ua} 元。` }),
      nStep(1, { title: '大包一個多少', ask: '總價 ÷ 個數。', id: 'ub', hints: ['一樣用總價 ÷ 個數。', '除數比較大，可以用直式。', '算完驗算：單價 × 個數 ＝ 總價。'],
        think: '老師算大包裝一個多少錢。', together: '一起算：大包一個多少？', figure: ctx => A.get('inBetter').planFigure(ctx),
        label: ctx => `${ctx.problem.pb} ÷ ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.ub, say: e => `大包一${e.problem.w[1]} ${e.problem.ub} 元。` }),
      cStep(2, { title: '做決定', ask: '一個比較便宜的是哪一種？', id: 'which', fixed: true, hints: ['比一個的價錢，不是比總價。', '一個的錢比較少，比較划算。', '也要想：吃得完、用得完嗎？'],
        think: '老師比一個的價錢，選比較便宜的。', together: '一起決定：哪一種比較划算？', figure: ctx => A.get('inBetter').planFigure(ctx),
        q: () => '一個比較便宜的是哪一種？', opts: () => [['a', '小包裝'], ['b', '大包裝']], ans: ctx => ctx.problem.ua < ctx.problem.ub ? 'a' : 'b',
        wrong: ctx => ({ obs: 'totalNotUnit', msg: '要比「一個多少錢」，不是比整包多少錢。' }), say: e => `${e.problem.ua < e.problem.ub ? '小' : '大'}包裝一個比較便宜。` })
    ],
    reasons, done: ctx => `小包一${ctx.problem.w[1]} ${ctx.problem.ua} 元，大包一${ctx.problem.w[1]} ${ctx.problem.ub} 元；${ctx.problem.ua < ctx.problem.ub ? '小' : '大'}包裝比較便宜。`, chant: '比划算：先算一個多少錢，再比一比。', transfer: '想一想：大包裝比較便宜，可是吃不完，要買嗎？'
  });

  // =============== 11-7 班級活動預算（多步驟） ===============
  A.register('inBudget', {
    methods, makeProblem: (level, i, rand = Math.random) => { const k = rnd(rand, fromLevel({ easy: 5, standard: 15, challenge: 20 }, level), fromLevel({ easy: 9, standard: 30, challenge: 35 }, level)), p = rnd(rand, fromLevel({ easy: 10, standard: 20, challenge: 45 }, level), fromLevel({ easy: 30, standard: 60, challenge: 95 }, level)), e = rnd(rand, 50, 300), tot = k * p + e;
      const B = i % 2 === 0 ? round100(tot) + (round100(tot) >= tot ? 0 : 100) : Math.max(100, Math.floor(tot / 100) * 100 - (tot % 100 === 0 ? 100 : 0));
      return { k, p, e, tot, B, ok: B >= tot, dims: [k, p, e, B], prompt: `班上 ${k} 人聚餐，每人便當 ${p} 元，另外買飲料一共 ${e} 元。班費有 ${B} 元，夠不夠？` }; },
    planFigure: ctx => receipt([[`便當（每人）`, ctx.problem.p], ['飲料（一共）', ctx.problem.e]]),
    steps: [
      cStep(0, { title: '列式', ask: '一共要花多少，怎麼列式？', id: 'merged', hints: ['便當：每人的錢 × 人數。', '再加上飲料的錢。', '先乘後加，不用括號。'],
        think: '老師列式：便當錢加飲料錢。', together: '一起選：算式是哪一個？', pre: prompt, figure: ctx => A.get('inBudget').planFigure(ctx),
        q: () => '一共要花多少？算式是哪一個？', opts: ctx => { const p = ctx.problem; return uniq([['ok', `${p.p} × ${p.k} ＋ ${p.e}`], ['bad', `${p.p} × (${p.k} ＋ ${p.e})`], ['add', `${p.p} ＋ ${p.k} ＋ ${p.e}`]]); }, ans: () => 'ok', wrong: (ctx, v) => ({ obs: v === 'add' ? 'eqSum' : 'leftToRight', msg: '便當錢是每人的錢乘人數，再加飲料。' }), say: e => `${e.problem.p} × ${e.problem.k} ＋ ${e.problem.e}。` }),
      nStep(1, { title: '算出來', ask: '一共多少元？', id: 'tot', hints: ['先算便當：每人的錢 × 人數。', '再加飲料。', '用直式。'],
        think: '老師先乘再加。', together: '一起算：一共多少？', pre: timesAid, figure: ctx => A.get('inBudget').planFigure(ctx),
        label: () => '一共要花多少元？', ans: ctx => ctx.problem.tot, wrong: (ctx, v) => v === ctx.problem.p * ctx.problem.k ? { obs: 'skipStep', msg: '這是便當的錢，還要加飲料。' } : null, say: e => `${e.problem.p} × ${e.problem.k} ＋ ${e.problem.e} ＝ ${e.problem.tot}。` }),
      cStep(2, { title: '夠不夠', ask: '和班費比一比。', id: 'ok', fixed: true, hints: ['班費比一共的錢多（或一樣）：夠。', '班費比較少：不夠。', '不夠要想辦法，例如換便宜一點的。'],
        think: '老師把班費和一共的錢比一比。', together: '一起決定：夠不夠？', figure: ctx => A.get('inBudget').planFigure(ctx),
        q: ctx => `一共 ${ctx.problem.tot} 元，班費 ${ctx.problem.B} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次。' }), say: e => e.problem.ok ? '夠。' : '不夠。' }),
      nStep(3, { title: '剩多少、差多少', ask: '大的減小的。', id: 'diff', hints: ['夠：班費 － 一共的錢，是剩下的。', '不夠：一共的錢 － 班費，是差的。', '大的減小的。'],
        think: '老師算剩多少或差多少。', together: '一起算：剩（差）多少？', pre: placeAid, figure: ctx => colHtml(Math.max(ctx.problem.B, ctx.problem.tot), Math.min(ctx.problem.B, ctx.problem.tot), '-', { head: false }),
        label: ctx => ctx.problem.ok ? '還剩多少元？' : '還差多少元？', ans: ctx => Math.abs(ctx.problem.B - ctx.problem.tot), say: e => `${e.problem.ok ? '剩' : '差'} ${Math.abs(e.problem.B - e.problem.tot)} 元。` })
    ],
    reasons, done: ctx => `一共 ${ctx.problem.tot} 元，班費 ${ctx.problem.B} 元，${ctx.problem.ok ? `夠，剩 ${ctx.problem.B - ctx.problem.tot} 元` : `不夠，差 ${ctx.problem.tot - ctx.problem.B} 元`}。`, chant: '做預算：列式算出一共多少，和錢比一比，再想辦法。', transfer: '想一想：如果班費不夠，可以怎麼調整？'
  });
})();

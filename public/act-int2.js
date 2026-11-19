'use strict';
// 第 35 版：整數四則運算教材包單元 0～5 的其他活動（核心 1-4、2-2 在 act-int.js）。圖形和計算在 act-int.js（window.intFig）。
// 課綱備註：N-1-2 一年級不做未知數題型、要處理 0 的加減；N-1-3 10 以內；R-1-2、R-2-3 不出現「交換律」名詞；
// N-2-2 加法最多二次進位、減法只退位一次（三位數以內）；N-3-2 四位數、多次進退位、有 0 的題型；R-2-4 只用加法驗算減法；
// N-2-7 不死背九九（乘法表可以打開看）；N-2-9 分裝平分不列除式、不用「除」字、限整除、在九九範圍；N-3-4 先整除再有餘數；R-3-1「3 的幾倍是 15」用除法。
(() => {
  const A = window.areaActs, I = window.intFig;
  const { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, timesAid, placeAid, carries, borrows, bigMinusSmall, noCarrySum, round10, round100, ex, chips, groups, rows, blocks, colHtml, tapeSVG, THING1, tensAfter } = I;
  const methods = [['mark', '🔵 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['look', '先看圖'], ['count', '一個一個點著數'], ['hint', '看提示']];
  const rCalc = [['align', '對齊位值'], ['check', '算完檢查'], ['hint', '看提示']];
  const rWord = [['read', '把題目讀兩次'], ['draw', '畫圖或擺花片'], ['check', '把答案放回去檢查'], ['hint', '看提示']];
  const sentence = (n, u, w) => `${n} ${u}${w || ''}`;

  // =============== 0-1 數一數（先測） ===============
  A.register('inCount', {
    methods, makeProblem: (level, i, rand = Math.random) => { const t = any(rand, THING1), n = rnd(rand, level === 'easy' ? 3 : 6, fromLevel({ easy: 10, standard: 20, challenge: 20 }, level));
      return { t, n, dims: [n], prompt: `盤子裡有一些${t.w}。一個一個點著數，有幾${t.u}？` }; },
    planFigure: ctx => chips(ctx.problem.n, { e: ctx.problem.t.e }),
    steps: [
      nStep(0, { title: '數一數', ask: '每一個都只數一次嗎？', id: 'n', hints: ['用手指一個一個點著數。', '數過的不要再數。', '每 5 個空一格，可以 5 個 5 個一起數。'],
        think: '老師一個一個點著數，數過的不再數。', together: '一起數：有幾個？', pre: prompt, figure: ctx => chips(ctx.problem.n, { e: ctx.problem.t.e }),
        label: ctx => `有幾${ctx.problem.t.u}？`, ans: ctx => ctx.problem.n, wrong: (ctx, v) => v < ctx.problem.n ? { obs: 'countShort', msg: '少數了，再一個一個點著數。' } : { obs: 'countOver', msg: '多數了，數過的不要再數。' }, say: e => `一共 ${e.problem.n} ${e.problem.t.u}。` }),
      nStep(1, { title: '再多 1 個', ask: '多 1 個，是數到下一個數。', id: 'n1', hints: ['再放 1 個進去。', '接著往下數 1 個。', `${'數到的數'}的下一個數。`],
        think: '老師接著往下數 1 個。', together: '一起數：再多 1 個是多少？', figure: ctx => chips(ctx.problem.n, { e: ctx.problem.t.e, b: 1, e2: ctx.problem.t.e }),
        label: ctx => `再放 1 ${ctx.problem.t.u}，有幾${ctx.problem.t.u}？`, ans: ctx => ctx.problem.n + 1, say: e => `${e.problem.n} 的下一個是 ${e.problem.n + 1}。` })
    ],
    reasons, done: ctx => `有 ${ctx.problem.n} ${ctx.problem.t.u}，再多 1 ${ctx.problem.t.u}是 ${ctx.problem.n + 1} ${ctx.problem.t.u}。`, chant: '數一數：一個一個點，數過不再數。', transfer: '想一想：排隊的時候，怎麼數有幾個人？'
  });

  // =============== 0-2 幾個十幾個一（先測） ===============
  A.register('inTens', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = rnd(rand, 11, fromLevel({ easy: 50, standard: 99, challenge: 99 }, level)); return { n, dims: [n], prompt: `一盒鉛筆有 10 枝。下面是幾盒和幾枝鉛筆，一共幾枝？` }; },
    planFigure: ctx => blocks(ctx.problem.n),
    steps: [
      mStep(0, { title: '數一數', ask: '幾個十、幾個一？', hints: ['長條是 1 個十（一盒 10 枝）。', '小方塊是 1 個一（1 枝）。', '先數長條，再數小方塊。'],
        think: '老師先數長條（十），再數小方塊（一）。', together: '一起數：幾個十、幾個一？', pre: prompt, figure: ctx => blocks(ctx.problem.n),
        fields: [
          ['t', () => '有幾個十（幾盒）？', ctx => Math.floor(ctx.problem.n / 10), (ctx, v) => v === ctx.problem.n % 10 ? { obs: 'placeSwap', msg: '這是小方塊的數。長條才是十。' } : null],
          ['u', () => '有幾個一（幾枝）？', ctx => ctx.problem.n % 10, (ctx, v) => v === Math.floor(ctx.problem.n / 10) % 10 ? { obs: 'placeSwap', msg: '這是長條的數。小方塊才是一。' } : null]],
        say: e => `${Math.floor(e.problem.n / 10)} 個十，${e.problem.n % 10} 個一。` }),
      nStep(1, { title: '合起來', ask: '十位寫幾、個位寫幾？', id: 'n', hints: ['幾個十寫在十位。', '幾個一寫在個位。', '例如 3 個十、5 個一是 35。'],
        think: '老師把幾個十寫在十位、幾個一寫在個位。', together: '一起寫：一共是多少？', figure: ctx => blocks(ctx.problem.n),
        label: () => '一共幾枝？', ans: ctx => ctx.problem.n, wrong: (ctx, v) => { const n = ctx.problem.n, t = Math.floor(n / 10), u = n % 10; return v === u * 10 + t && u !== t ? { obs: 'placeSwap', msg: '十位和個位寫反了。' } : v === t + u ? { msg: '十位的 1 個是 10，不是 1。' } : null; },
        say: e => `一共 ${e.problem.n} 枝。` })
    ],
    reasons, done: ctx => `一共 ${ctx.problem.n} 枝。`, chant: '10 個一是 1 個十；幾個十寫十位，幾個一寫個位。', transfer: '想一想：3 盒雞蛋（一盒 10 顆）和 4 顆，一共幾顆？'
  });

  // =============== 1-1 多了、合起來（添加型、併加型；交換順序和一樣） ===============
  const add1 = (level, rand) => { const max = fromLevel({ easy: 6, standard: 10, challenge: 10 }, level); let a, b; do { a = rnd(rand, 1, max - 1); b = rnd(rand, 1, max - 1); } while (a + b > max || a === b); return [a, b]; };
  A.register('inJoin', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [a, b] = add1(level, rand), t = any(rand, THING1), kind = i % 2 ? 'join' : 'more';
      return { a, b, t, kind, dims: [a, b], prompt: I.STORY[kind].mk(a, b, t) }; },
    planFigure: ctx => chips(ctx.problem.a, { e: ctx.problem.t.e, b: ctx.problem.b, e2: ctx.problem.t.e }),
    steps: [
      cStep(0, { title: '看圖說故事', ask: '東西變多還是變少？', id: 'kind', fixed: true, hints: ['看圖：有沒有東西進來，或兩邊合在一起？', '變多、合起來，答案會比原來多。', '用加的。'],
        think: '老師看圖：東西進來了（或合在一起），變多了。', together: '一起說：變多還是變少？', pre: prompt, figure: ctx => A.get('inJoin').planFigure(ctx),
        q: () => '東西變多還是變少？', opts: () => [['more', '變多了（合起來）'], ['less', '變少了']], ans: () => 'more', wrong: () => ({ obs: 'opWrong', msg: '有東西進來、合在一起，是變多。' }), say: () => '變多了，用加的。' }),
      cStep(1, { title: '寫算式', ask: '用 ＋ 還是 －？', id: 'op', fixed: true, hints: ['變多用加的。', '把兩個數加起來。', '先說的數寫前面。'],
        think: '老師寫：先說的數 ＋ 後來的數。', together: '一起寫：算式是什麼？', figure: ctx => A.get('inJoin').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => [['+', ex(ctx.problem.a, '+', ctx.problem.b)], ['-', ex(Math.max(ctx.problem.a, ctx.problem.b), '-', Math.min(ctx.problem.a, ctx.problem.b))]], ans: () => '+', wrong: () => ({ obs: 'opWrong', msg: '變多、合起來用加的。' }), say: e => `${ex(e.problem.a, '+', e.problem.b)}。` }),
      nStep(2, { title: '算出來', ask: '合起來是多少？', id: 'ans', hints: ['先擺第一個數，再接著數第二個數。', '用花片數一數。', '從大的數接著往下數，比較快。'],
        think: '老師從第一個數接著往下數。', together: '一起算：一共幾個？', figure: ctx => A.get('inJoin').planFigure(ctx),
        label: ctx => `一共有幾${ctx.problem.t.u}？`, ans: ctx => ctx.problem.a + ctx.problem.b, wrong: (ctx, v) => Math.abs(v - ctx.problem.a - ctx.problem.b) === 1 ? { obs: 'offByOne', msg: '差 1，再數一次。' } : null, say: e => `${e.problem.a} ＋ ${e.problem.b} ＝ ${e.problem.a + e.problem.b}。` }),
      nStep(3, { title: '換順序', ask: '先數哪一堆，合起來一樣嗎？', id: 'swap', hints: ['兩堆換過來，先數後面那一堆。', '東西沒有變多也沒有變少。', '換順序，合起來一樣多。'],
        think: '老師換個順序加：合起來還是一樣多。', together: '一起算：換順序是多少？', figure: ctx => chips(ctx.problem.b, { e: ctx.problem.t.e, b: ctx.problem.a, e2: ctx.problem.t.e, aria: `先 ${ctx.problem.b} 個，再 ${ctx.problem.a} 個` }),
        label: ctx => `${ctx.problem.b} ＋ ${ctx.problem.a} ＝ ？`, ans: ctx => ctx.problem.a + ctx.problem.b, say: e => `${e.problem.b} ＋ ${e.problem.a} 也是 ${e.problem.a + e.problem.b}，一樣多。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} ＋ ${ctx.problem.b} ＝ ${ctx.problem.a + ctx.problem.b}，一共 ${ctx.problem.a + ctx.problem.b} ${ctx.problem.t.u}。`, chant: '變多、合起來用加的；換個順序加，答案一樣。', transfer: '想一想：左手 3 顆糖、右手 4 顆糖，合起來幾顆？'
  });

  // =============== 1-2 拿走了（拿走型；含減 0、減光） ===============
  A.register('inTake', {
    methods, makeProblem: (level, i, rand = Math.random) => { const t = any(rand, THING1), max = fromLevel({ easy: 6, standard: 10, challenge: 10 }, level), a = rnd(rand, 2, max), b = i % 4 === 2 ? 0 : i % 4 === 3 ? a : rnd(rand, 1, a - 1);
      return { a, b, t, dims: [a, b], prompt: I.STORY.take.mk(a, b, t) }; },
    planFigure: ctx => chips(ctx.problem.a, { e: ctx.problem.t.e, x: ctx.problem.b }),
    steps: [
      cStep(0, { title: '看圖說故事', ask: '東西變多還是變少？', id: 'kind', fixed: true, hints: ['看圖：打叉的是拿走的。', '拿走了，剩下的會變少。', '用減的。'],
        think: '老師看圖：打叉的被拿走了，變少了。', together: '一起說：變多還是變少？', pre: prompt, figure: ctx => A.get('inTake').planFigure(ctx),
        q: () => '東西變多還是變少？', opts: ctx => [['less', ctx.problem.b === 0 ? '沒有拿走，一樣多' : '變少了'], ['more', '變多了']], ans: () => 'less', wrong: () => ({ obs: 'opWrong', msg: '有東西被拿走，不會變多。' }), say: () => '拿走了，用減的。' }),
      cStep(1, { title: '寫算式', ask: '用 ＋ 還是 －？', id: 'op', fixed: true, hints: ['拿走用減的。', '原來的數寫前面。', '原來的 － 拿走的。'],
        think: '老師寫：原來的 － 拿走的。', together: '一起寫：算式是什麼？', figure: ctx => A.get('inTake').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => [['-', ex(ctx.problem.a, '-', ctx.problem.b)], ['+', ex(ctx.problem.a, '+', ctx.problem.b)]], ans: () => '-', wrong: () => ({ obs: 'opWrong', msg: '拿走用減的。' }), say: e => `${ex(e.problem.a, '-', e.problem.b)}。` }),
      nStep(2, { title: '算出來', ask: '還剩多少？', id: 'ans', hints: ['數一數沒有打叉的。', '拿走 0 個，就是一個都沒拿。', '全部拿走，就剩 0 個。'],
        think: '老師數沒有打叉的。', together: '一起數：還剩幾個？', figure: ctx => A.get('inTake').planFigure(ctx),
        label: ctx => `還剩幾${ctx.problem.t.u}？`, ans: ctx => ctx.problem.a - ctx.problem.b, wrong: (ctx, v) => v === ctx.problem.a + ctx.problem.b ? { obs: 'opWrong', msg: '這是加起來的數。拿走要減。' } : v === ctx.problem.b ? { msg: '這是拿走的數。要數剩下的。' } : null, say: e => `${e.problem.a} － ${e.problem.b} ＝ ${e.problem.a - e.problem.b}。` }),
      cStep(3, { title: '說一說', ask: '用一句話說答案。', id: 'say', hints: ['說出剩幾個什麼。', '答案要有單位。', '「還剩幾隻小鳥」。'],
        think: '老師用一句話說答案。', together: '一起說：哪一句對？', figure: ctx => A.get('inTake').planFigure(ctx),
        q: () => '哪一句話說對了？', opts: ctx => { const p = ctx.problem, r = p.a - p.b; return [['ok', `還剩 ${r} ${p.t.u}${p.t.w}。`], ['gone', `拿走 ${r} ${p.t.u}${p.t.w}。`], ['all', `一共 ${p.a + p.b} ${p.t.u}${p.t.w}。`]].filter((x, k, arr) => arr.findIndex(y => y[1] === x[1]) === k); },
        ans: () => 'ok', wrong: () => ({ msg: '問的是「還剩幾個」。' }), say: e => `還剩 ${e.problem.a - e.problem.b} ${e.problem.t.u}。` })
    ],
    reasons, done: ctx => `${ctx.problem.a} － ${ctx.problem.b} ＝ ${ctx.problem.a - ctx.problem.b}，還剩 ${ctx.problem.a - ctx.problem.b} ${ctx.problem.t.u}。`, chant: '拿走用減的：原來的減掉拿走的。', transfer: '想一想：有 5 顆糖，一顆都沒吃，還剩幾顆？'
  });

  // =============== 1-3 誰比較多（比較型） ===============
  A.register('inMoreLess', {
    methods, makeProblem: (level, i, rand = Math.random) => { const t = any(rand, THING1), max = fromLevel({ easy: 6, standard: 10, challenge: 10 }, level); let a, b; do { a = rnd(rand, 1, max); b = rnd(rand, 1, max); } while (a === b);
      const askMore = i % 2 === 0;
      return { a, b, t, askMore, big: a > b ? t.p1 : t.p2, small: a > b ? t.p2 : t.p1, d: Math.abs(a - b), dims: [a, b], prompt: `${t.p1}有 ${a} ${t.u}${t.w}，${t.p2}有 ${b} ${t.u}${t.w}。` }; },
    planFigure: ctx => { const p = ctx.problem; return `<div class="in-cmp"><p class="lf-tag">${p.t.p1}</p>${chips(p.a, { e: p.t.e })}<p class="lf-tag">${p.t.p2}</p>${chips(p.b, { e: p.t.e })}</div>`; },
    steps: [
      cStep(0, { title: '誰比較多', ask: '一個對一個排，誰有多出來？', id: 'who', fixed: true, hints: ['上下一個對一個排好。', '多出來沒有配對的那一邊比較多。', '也可以數一數再比。'],
        think: '老師一個對一個排，看誰多出來。', together: '一起比：誰比較多？', pre: prompt, figure: ctx => A.get('inMoreLess').planFigure(ctx),
        q: () => '誰比較多？', opts: ctx => [['p1', ctx.problem.t.p1], ['p2', ctx.problem.t.p2]], ans: ctx => ctx.problem.a > ctx.problem.b ? 'p1' : 'p2', wrong: () => ({ msg: '一個對一個比，多出來的那邊比較多。' }), say: e => `${e.problem.big}比較多。` }),
      nStep(1, { title: '多幾個', ask: '多出來幾個？', id: 'd', hints: ['數一數沒有配對的。', '多的 － 少的。', '比一比也是用減的。'],
        think: '老師數多出來、沒有配對的。', together: '一起數：多幾個？', figure: ctx => A.get('inMoreLess').planFigure(ctx),
        label: ctx => ctx.problem.askMore ? `${ctx.problem.big}比${ctx.problem.small}多幾${ctx.problem.t.u}？` : `${ctx.problem.small}比${ctx.problem.big}少幾${ctx.problem.t.u}？`, ans: ctx => ctx.problem.d,
        wrong: (ctx, v) => v === ctx.problem.a + ctx.problem.b ? { obs: 'opWrong', msg: '比一比不是加起來，要看多出來幾個。' } : v === Math.max(ctx.problem.a, ctx.problem.b) ? { msg: '這是比較多的那邊有幾個。要數多出來的。' } : null, say: e => `多 ${e.problem.d} ${e.problem.t.u}。` }),
      cStep(2, { title: '寫算式', ask: '大的減小的。', id: 'op', hints: ['比多幾個、少幾個，都用減的。', '多的數寫前面。', '多的 － 少的。'],
        think: '老師寫：多的 － 少的。', together: '一起寫：算式是什麼？', figure: ctx => A.get('inMoreLess').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => { const M = Math.max(ctx.problem.a, ctx.problem.b), m = Math.min(ctx.problem.a, ctx.problem.b); return [['-', ex(M, '-', m)], ['+', ex(M, '+', m)]]; }, ans: () => '-', wrong: () => ({ obs: 'opWrong', msg: '比多幾個用減的。' }), say: e => `${ex(Math.max(e.problem.a, e.problem.b), '-', Math.min(e.problem.a, e.problem.b))} ＝ ${e.problem.d}。` })
    ],
    reasons, done: ctx => `${ctx.problem.big}比${ctx.problem.small}多 ${ctx.problem.d} ${ctx.problem.t.u}。`, chant: '比一比：一個對一個，多出來的用減的算。', transfer: '想一想：你有 7 枝筆、同學有 4 枝，你比同學多幾枝？'
  });

  // =============== 2-1 直式加法（位值表格；二年級最多二次進位，三位數以內） ===============
  function makeAddCol(level, i, rand = Math.random) {
    const [lo, hi, minC, maxC] = fromLevel({ easy: [10, 99, 0, 1], standard: [10, 999, 1, 2], challenge: [100, 999, 1, 2] }, level);
    let a, b; do { a = rnd(rand, lo, hi); b = rnd(rand, lo, hi); } while (a + b > 999 || carries(a, b) < minC || carries(a, b) > maxC || (level === 'standard' && i % 2 === 0 && a < 100 && b < 100));
    const t = any(rand, [['一班跳繩', '二班跳繩', '下'], ['上午賣出', '下午賣出', '個'], ['哥哥存了', '弟弟存了', '元']]);
    return { a, b, s: a + b, t, dims: [a, b], prompt: `${t[0]} ${a} ${t[2]}，${t[1]} ${b} ${t[2]}。合起來是多少${t[2]}？` };
  }
  const addCarry = (a, b) => { const c = []; let k = 0, x = a, y = b; while (x > 0 || y > 0) { const s = x % 10 + y % 10 + k; k = s >= 10 ? 1 : 0; c.push(k); x = Math.floor(x / 10); y = Math.floor(y / 10); } return c; };
  A.register('inAddCol', {
    methods: [['mark', '🧱 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeAddCol, planFigure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '+'),
    steps: [
      cStep(0, { title: '對齊位值', ask: '個位對個位了嗎？', id: 'align', hints: ['數字靠右對齊。', '個位對個位、十位對十位。', '最右邊都是個位。'],
        think: '老師把兩個數靠右對齊。', together: '一起看：哪一個對齊了？', pre: ctx => `${prompt(ctx)}${placeAid(ctx)}`,
        q: () => '哪一個直式寫對了？', opts: ctx => { const p = ctx.problem, [x, y] = String(p.a).length >= String(p.b).length ? [p.a, p.b] : [p.b, p.a]; return [['ok', colHtml(x, y, '+', { head: false, aria: '個位對個位的直式' })], ['bad', colHtml(x, y, '+', { head: false, shift: String(x).length - String(y).length || 1, aria: '沒有對好位值的直式' })]]; },
        ans: () => 'ok', wrong: () => ({ obs: 'placeMisalign', msg: '最右邊要對齊：個位對個位。' }), say: () => '個位對個位。' }),
      mStep(1, { title: '個位', ask: '滿 10 了嗎？要進位嗎？', hints: ['個位的兩個數加起來。', '滿 10，個位寫剩下的，向十位進 1。', '沒滿 10，就不用進位（進位填 0）。'],
        think: '老師先加個位：滿 10 就進 1 到十位。', together: '一起算個位：寫幾？進幾？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '+', { hl: 0 }),
        fields: [['u', ctx => `個位：${ctx.problem.a % 10} ＋ ${ctx.problem.b % 10}，個位寫幾？`, ctx => (ctx.problem.a + ctx.problem.b) % 10, (ctx, v) => v === ctx.problem.a % 10 + ctx.problem.b % 10 ? { obs: 'noCarry', msg: '滿 10 了，個位只寫剩下的，1 個十要進到十位。' } : null],
          ['c1', () => '要向十位進幾？（不用進就填 0）', ctx => addCarry(ctx.problem.a, ctx.problem.b)[0], (ctx, v) => v === 0 ? { obs: 'noCarry', msg: '滿 10 要進 1。' } : null]],
        say: e => { const s = e.problem.a % 10 + e.problem.b % 10; return s >= 10 ? `${s}，個位寫 ${s - 10}，進 1。` : `${s}，個位寫 ${s}，不用進位。`; } }),
      nStep(2, { title: '一位一位往左', ask: '十位要記得加上進位。', id: 's', hints: ['十位：兩個數加起來，再加上進來的 1。', '再算百位。', '每一位都算完，就是答案。'],
        think: '老師一位一位往左加，記得加上進位。', together: '一起算：答案是多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '+', { carry: addCarry(ctx.problem.a, ctx.problem.b).map(c => c ? '1' : '').reduce((acc, c, k) => { acc[k + 1] = c; return acc; }, []), res: shown(ctx, 2) ? ctx.problem.s : null }),
        label: ctx => `${ctx.problem.a} ＋ ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.s, wrong: (ctx, v) => v === noCarrySum(ctx.problem.a, ctx.problem.b) ? { obs: 'noCarry', msg: '進位的 1 忘了加。' } : null, say: e => `${e.problem.a} ＋ ${e.problem.b} ＝ ${e.problem.s}。` }),
      cStep(3, { title: '估一估', ask: '答案大約是多少？合理嗎？', id: 'est', hints: ['把兩個數都想成最接近的整十（或整百）。', '再加起來，大約是多少。', '選最接近的那一個。'],
        think: '老師估一估：答案大約是多少，算出來的合理嗎。', together: '一起估：大約是多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '+', { res: ctx.problem.s }),
        q: () => '答案大約是多少？', opts: ctx => { const p = ctx.problem, r = p.s >= 200 ? round100 : round10, e = r(p.a) + r(p.b), st = p.s >= 200 ? 100 : 10, c = [e, e + 3 * st, Math.max(st, e - 3 * st)]; const best = c.reduce((m, x) => Math.abs(x - p.s) < Math.abs(m - p.s) ? x : m, c[0]); return [...new Set(c)].map(x => [x === best ? 'ok' : `x${x}`, `大約 ${x}`]); },
        ans: () => 'ok', wrong: () => ({ msg: '把兩個數想成整十或整百，再加起來。' }), say: e => `大約是 ${(e.problem.s >= 200 ? round100 : round10)(e.problem.a) + (e.problem.s >= 200 ? round100 : round10)(e.problem.b)}，答案 ${e.problem.s} 很接近，合理。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.a} ＋ ${ctx.problem.b} ＝ ${ctx.problem.s}。`, chant: '直式加法：對齊位值，從個位加，滿 10 進 1。', transfer: '想一想：買 245 元和 168 元的東西，大約要多少錢？'
  });

  // =============== 2-3 多次進退位（三年級，四位數，含 0） ===============
  function makeMulti(level, i, rand = Math.random) {
    const sub = i % 2 === 0, [lo, hi] = fromLevel({ easy: [100, 999], standard: [1000, 9999], challenge: [1000, 9999] }, level);
    let a, b; for (;;) { a = rnd(rand, lo, hi); b = rnd(rand, lo / 10, hi); if (level !== 'easy' && (i % 4 === 0) && !/0/.test(String(a).slice(1))) continue;
      if (sub) { if (b >= a) continue; if (borrows(a, b) < 2) continue; } else { if (a + b > 9999 || carries(a, b) < 2) continue; } break; }
    const t = sub ? ['圖書館有', '借出了', '本書', '還有幾本'] : ['學校有男生', '女生', '人', '一共幾人'];
    return { sub, a, b, v: sub ? a - b : a + b, n: sub ? borrows(a, b) : carries(a, b), dims: [a, b, sub ? 1 : 0], prompt: sub ? `圖書館有 ${a} 本書，借出了 ${b} 本。還有幾本？` : `學校有男生 ${a} 人、女生 ${b} 人。一共幾人？` };
  }
  A.register('inMulti', {
    methods: [['mark', '🧱 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeMulti, planFigure: ctx => colHtml(ctx.problem.a, ctx.problem.b, ctx.problem.sub ? '-' : '+'),
    steps: [
      cStep(0, { title: '從哪一位開始', ask: '直式從哪一位開始算？', id: 'start', fixed: true, hints: ['直式要從最右邊開始。', '最右邊是個位。', '先算個位，再往左。'],
        think: '老師從個位開始算。', together: '一起選：從哪一位開始？', pre: ctx => `${prompt(ctx)}${placeAid(ctx)}`, figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, ctx.problem.sub ? '-' : '+', { hl: 0 }),
        q: () => '從哪一位開始算？', opts: () => [['u', '個位（最右邊）'], ['top', '最左邊']], ans: () => 'u', wrong: () => ({ msg: '直式從個位開始，才知道要不要進位、退位。' }), say: () => '從個位開始。' }),
      nStep(1, { title: '進退位幾次', ask: '一位一位看，要進位（退位）幾次？', id: 'n', hints: ['每一位看一看：加起來滿 10 嗎？（不夠減嗎？）', '別忘了上一位進（借）過來的 1。', '中間有 0 的時候，借位要連著借。'],
        think: '老師一位一位看，數一數要進位（退位）幾次。', together: '一起數：幾次？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, ctx.problem.sub ? '-' : '+'),
        label: ctx => ctx.problem.sub ? '要退位幾次？' : '要進位幾次？', ans: ctx => ctx.problem.n, say: e => `要${e.problem.sub ? '退' : '進'}位 ${e.problem.n} 次。` }),
      nStep(2, { title: '算出來', ask: '每一位都記得進位、退位了嗎？', id: 'v', hints: ['一位一位算，記下進位（退位）。', '0 不夠減時，要再向左邊借。', '寫完再檢查一次。'],
        think: '老師一位一位算，進位、退位都記下來。', together: '一起算：答案是多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, ctx.problem.sub ? '-' : '+', { res: shown(ctx, 2) ? ctx.problem.v : null }),
        label: ctx => `${ex(ctx.problem.a, ctx.problem.sub ? '-' : '+', ctx.problem.b)} ＝ ？`, ans: ctx => ctx.problem.v,
        wrong: (ctx, v) => { const p = ctx.problem; return p.sub && v === bigMinusSmall(p.a, p.b) ? { obs: 'subSmallFromBig', msg: '不夠減時不能倒過來減，要向左借。' } : !p.sub && v === noCarrySum(p.a, p.b) ? { obs: 'noCarry', msg: '進位的 1 忘了加。' } : p.sub && [10, 100, 1000].some(k => v === p.v + k) ? { obs: 'noBorrowDec', msg: '借走的那一位要少 1。' } : null; },
        say: e => `${ex(e.problem.a, e.problem.sub ? '-' : '+', e.problem.b)} ＝ ${e.problem.v}。` }),
      nStep(3, { title: '檢查', ask: '減法用加法驗算；加法估一估。', id: 'chk', hints: ['減法：答案 ＋ 減數，要等於被減數。', '加法：把兩個數想成整百，加起來大約多少。', '算出來的要和估的差不多。'],
        think: '老師檢查：減法用加法驗算；加法用整百估一估。', together: '一起檢查：是多少？', figure: ctx => ctx.problem.sub ? colHtml(ctx.problem.v, ctx.problem.b, '+', { head: false }) : '',
        label: ctx => ctx.problem.sub ? `${ctx.problem.v} ＋ ${ctx.problem.b} ＝ ？` : `估一估：${round100(ctx.problem.a)} ＋ ${round100(ctx.problem.b)} ＝ ？`, ans: ctx => ctx.problem.sub ? ctx.problem.a : round100(ctx.problem.a) + round100(ctx.problem.b),
        say: e => e.problem.sub ? `${e.problem.v} ＋ ${e.problem.b} ＝ ${e.problem.a}，對了。` : `大約 ${round100(e.problem.a) + round100(e.problem.b)}，和 ${e.problem.v} 差不多。` })
    ],
    reasons: rCalc, done: ctx => `${ex(ctx.problem.a, ctx.problem.sub ? '-' : '+', ctx.problem.b)} ＝ ${ctx.problem.v}。`, chant: '多次進退位：從個位開始，一位一位記好進位、退位。', transfer: '想一想：503 － 278，十位是 0，要怎麼借？'
  });

  // =============== 2-4 算完檢查（用加法驗算減法） ===============
  A.register('inCheck', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel({ easy: [20, 99], standard: [100, 999], challenge: [1000, 9999] }, level); let a, b; do { a = rnd(rand, lo, hi); b = rnd(rand, 10, a - 1); } while (borrows(a, b) < 1);
      const right = i % 2 === 0, d = a - b, shown = right ? d : (bigMinusSmall(a, b) !== d ? bigMinusSmall(a, b) : d + 10);
      return { a, b, d, shownD: shown, right, dims: [a, b, right ? 1 : 0], prompt: `小安算了 ${a} － ${b} ＝ ${shown}。用加法驗算，看看對不對。` }; },
    planFigure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '-', { res: ctx.problem.shownD }),
    steps: [
      cStep(0, { title: '選驗算的算式', ask: '減法要用什麼驗算？', id: 'how', hints: ['減法用加法驗算。', '答案 ＋ 減掉的數。', '加起來要等於原來的數。'],
        think: '老師用加法驗算：答案加上減掉的數。', together: '一起選：驗算的算式是哪一個？', pre: prompt, figure: ctx => A.get('inCheck').planFigure(ctx),
        q: () => '驗算的算式是哪一個？', opts: ctx => { const p = ctx.problem; return [['ok', ex(p.shownD, '+', p.b)], ['sub', ex(p.a, '+', p.b)], ['minus', ex(p.shownD, '-', p.b)]]; }, ans: () => 'ok',
        wrong: () => ({ msg: '減法驗算：答案 ＋ 減掉的數，要等於原來的數。' }), say: e => `${ex(e.problem.shownD, '+', e.problem.b)}。` }),
      nStep(1, { title: '算一算', ask: '加起來是多少？', id: 'sum', hints: ['用直式加。', '個位對個位，滿 10 進 1。', '算出來再和原來的數比。'],
        think: '老師用直式加起來。', together: '一起加：是多少？', figure: ctx => colHtml(ctx.problem.shownD, ctx.problem.b, '+', { head: false }), pre: placeAid,
        label: ctx => `${ctx.problem.shownD} ＋ ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.shownD + ctx.problem.b, say: e => `${e.problem.shownD} ＋ ${e.problem.b} ＝ ${e.problem.shownD + e.problem.b}。` }),
      cStep(2, { title: '對不對', ask: '加起來等於原來的數嗎？', id: 'ok', fixed: true, hints: ['比一比：加起來的數和被減數一樣嗎？', '一樣就是算對了。', '不一樣就是算錯了，要重算。'],
        think: '老師比一比：一樣才是算對。', together: '一起比：小安算對了嗎？', figure: ctx => A.get('inCheck').planFigure(ctx),
        q: ctx => `${ctx.problem.shownD + ctx.problem.b} 和 ${ctx.problem.a} 一樣嗎？小安算對了嗎？`, opts: () => [['yes', '一樣，算對了'], ['no', '不一樣，算錯了']], ans: ctx => ctx.problem.right ? 'yes' : 'no',
        wrong: () => ({ msg: '再比一次兩個數。' }), say: e => e.problem.right ? '一樣，算對了。' : `不一樣，正確答案是 ${e.problem.d}。` }),
      nStep(3, { title: '寫出正確答案', ask: '正確的答案是多少？', id: 'd', hints: ['重新用直式算一次。', '個位不夠減要借。', '算完再用加法驗算。'],
        think: '老師重新算一次（算對的就照抄）。', together: '一起寫：正確答案是多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '-'),
        label: ctx => `${ctx.problem.a} － ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.d, wrong: (ctx, v) => v === bigMinusSmall(ctx.problem.a, ctx.problem.b) ? { obs: 'subSmallFromBig', msg: '不夠減時要借，不能倒過來減。' } : null, say: e => `${e.problem.a} － ${e.problem.b} ＝ ${e.problem.d}。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.a} － ${ctx.problem.b} ＝ ${ctx.problem.d}；${ctx.problem.d} ＋ ${ctx.problem.b} ＝ ${ctx.problem.a}。`, chant: '減法驗算：答案加減數，要等於被減數。', transfer: '想一想：找錢的時候，店員怎麼檢查找得對不對？'
  });

  // =============== 3-1、3-2 加減應用題（未知數題型；應用題五步） ===============
  // kind：addend（加數未知）、augend（被加數未知）、subtrahend（減數未知）、minuend（被減數未知）
  function makeMissing(kinds, level, i, rand) {
    const kind = kinds[i % kinds.length], hi = fromLevel({ easy: 99, standard: 500, challenge: 999 }, level);
    for (;;) { const x = rnd(rand, 10, hi), y = rnd(rand, 10, hi), [a, b] = x > y ? [x, y] : [y, x], c = a + b;   // a ＋ b ＝ c；也就是 c － b ＝ a
      if (c > 999 || a === b) continue;
      // 要算的那一步：加數、被加數、減數未知 → 減法（只退位一次）；被減數未知 → 加法（最多二次進位）
      if (kind === 'minuend' ? carries(a, b) > 2 : borrows(c, kind === 'augend' ? b : a) > 1) continue;
      const M = {
        addend: { p: `小安原本有 ${a} 張卡，又得到一些，現在有 ${c} 張。他得到幾張？`, find: '得到幾張', blank: `${a} ＋ □ ＝ ${c}`, op: `${c} － ${a}`, ans: b, put: `${a} ＋ ${b}`, back: c, parts: [{ v: a, label: `原本 ${a}` }, { v: b, label: '得到 ？' }], total: `現在 ${c}` },
        augend: { p: `小安原本有一些卡，又得到 ${b} 張，現在有 ${c} 張。他原本有幾張？`, find: '原本有幾張', blank: `□ ＋ ${b} ＝ ${c}`, op: `${c} － ${b}`, ans: a, put: `${a} ＋ ${b}`, back: c, parts: [{ v: a, label: '原本 ？' }, { v: b, label: `得到 ${b}` }], total: `現在 ${c}` },
        subtrahend: { p: `錢包原本有 ${c} 元，買文具用掉一些，還剩 ${a} 元。用掉幾元？`, find: '用掉幾元', blank: `${c} － □ ＝ ${a}`, op: `${c} － ${a}`, ans: b, put: `${c} － ${b}`, back: a, parts: [{ v: a, label: `剩 ${a}` }, { v: b, label: '用掉 ？' }], total: `原本 ${c}` },
        minuend: { p: `錢包原本有一些錢，買文具用掉 ${b} 元，還剩 ${a} 元。原本有幾元？`, find: '原本有幾元', blank: `□ － ${b} ＝ ${a}`, op: `${a} ＋ ${b}`, ans: c, put: `${c} － ${b}`, back: a, parts: [{ v: a, label: `剩 ${a}` }, { v: b, label: `用掉 ${b}` }], total: '原本 ？' }
      }[kind];
      return { kind, a, b, c, ...M, dims: [a, b, kinds.indexOf(kind)], prompt: M.p };
    }
  }
  const wrongOps = p => { const n = p.op.split(' '), x = Number(n[0]), y = Number(n[2]); return n[1] === '－' ? [`${x} ＋ ${y}`, `${y} － ${x}`] : [`${x} － ${y}`, `${y} － ${x}`]; };
  const missSteps = [
    cStep(0, { title: '讀題、找要找的', ask: '題目問的是什麼？', id: 'find', hints: ['把題目讀兩次，最後一句是問題。', '題目給了兩個數，還有一個不知道。', '不知道的那一個就是要找的。'],
      think: '老師把題目讀兩次，找出問的是什麼。', together: '一起找：要找什麼？', pre: prompt,
      q: () => '要找的是什麼？', opts: ctx => { const p = ctx.problem, all = p.kind === 'addend' || p.kind === 'augend' ? ['原本有幾張', '得到幾張', '現在有幾張'] : ['原本有幾元', '用掉幾元', '還剩幾元']; return all.map(x => [x === p.find ? 'ok' : x, x]); },
      ans: () => 'ok', wrong: () => ({ msg: '題目最後問的是什麼？' }), say: e => `要找「${e.problem.find}」。` }),
    cStep(1, { title: '畫圖', ask: '空格放在哪裡？', id: 'blank', hints: ['照故事的順序寫算式，不知道的寫 □。', '也可以看線段圖：哪一段是「？」。', '故事是加的就寫 ＋，是減的就寫 －。'],
      think: '老師照故事的順序寫算式，不知道的地方寫 □。', together: '一起寫：空格算式是哪一個？', figure: ctx => tapeSVG(ctx.problem.parts, ctx.problem.total),
      q: () => '照故事寫，空格算式是哪一個？', opts: ctx => { const p = ctx.problem, alt = { addend: [`□ ＋ ${p.a} ＝ ${p.c}`.replace(/^/, ''), `${p.a} ＋ ${p.c} ＝ □`], augend: [`${p.b} ＋ ${p.c} ＝ □`, `□ － ${p.b} ＝ ${p.c}`], subtrahend: [`${p.c} ＋ □ ＝ ${p.a}`, `${p.c} － ${p.a} ＝ □`], minuend: [`${p.b} ＋ ${p.a} ＝ □`, `${p.b} － □ ＝ ${p.a}`] }[p.kind];
        return [['ok', p.blank], ...alt.filter(x => x !== p.blank).slice(0, 2).map((x, k) => [`w${k}`, x])]; },
      ans: () => 'ok', wrong: () => ({ msg: '照故事發生的順序寫，不知道的那個數寫成 □。' }), say: e => `${e.problem.blank}。` }),
    cStep(2, { title: '列式', ask: '要用加的還是減的算出 □？', id: 'op', hints: ['看線段圖：要找的是全部，還是其中一段？', '找全部用加的；找其中一段用減的。', '不要看到「又得到」就用加的，要看要找的是什麼。'],
      think: '老師看線段圖：找其中一段用減的，找全部用加的。', together: '一起列式：□ 怎麼算？', figure: ctx => tapeSVG(ctx.problem.parts, ctx.problem.total),
      q: () => '□ 要怎麼算？', opts: ctx => [['ok', ctx.problem.op], ...wrongOps(ctx.problem).map((x, k) => [`w${k}`, x])], ans: () => 'ok',
      wrong: (ctx, v) => ({ obs: v === 'w0' ? 'keyword' : 'opWrong', msg: '看線段圖：要找的是全部（加），還是其中一段（減）？' }), say: e => `□ ＝ ${e.problem.op}。` }),
    nStep(3, { title: '算出來', ask: '算一算，□ 是多少？', id: 'ans', hints: ['用直式算。', '個位對個位。', '不夠減要借，滿 10 要進。'],
      think: '老師用直式算出來。', together: '一起算：□ 是多少？', pre: placeAid, figure: ctx => { const n = ctx.problem.op.split(' '); return colHtml(Number(n[0]), Number(n[2]), n[1] === '－' ? '-' : '+'); },
      label: ctx => `${ctx.problem.op} ＝ ？`, ans: ctx => ctx.problem.ans,
      wrong: (ctx, v) => { const n = ctx.problem.op.split(' '), x = Number(n[0]), y = Number(n[2]); return n[1] === '－' && v === x + y ? { obs: 'keyword', msg: '這是加起來的數。要找的是其中一段，用減的。' } : n[1] === '－' && v === bigMinusSmall(x, y) ? { obs: 'subSmallFromBig', msg: '不夠減時要借。' } : null; },
      say: e => `${e.problem.op} ＝ ${e.problem.ans}。` }),
    nStep(4, { title: '放回去檢查', ask: '把答案放回空格，對嗎？', id: 'back', hints: ['把 □ 換成你的答案。', '照空格算式算一次。', '算出來要和題目的數一樣。'],
      think: '老師把答案放回空格，再算一次。', together: '一起檢查：算出來是多少？', figure: ctx => big(esc(ctx.problem.blank)),
      label: ctx => `${ctx.problem.put} ＝ ？`, ans: ctx => ctx.problem.back, say: e => `${e.problem.put} ＝ ${e.problem.back}，和題目一樣，對了。` })
  ];
  A.register('inMissAdd', { methods, makeProblem: (level, i, rand = Math.random) => makeMissing(['addend', 'augend'], level, i, rand), planFigure: ctx => tapeSVG(ctx.problem.parts, ctx.problem.total), steps: missSteps,
    reasons: rWord, done: ctx => `${ctx.problem.find.replace('幾', ' ' + ctx.problem.ans + ' ')}。`, chant: '應用題：讀題、找要找的、畫圖、列式、放回去檢查。', transfer: '想一想：原本有幾顆糖不知道，吃了 5 顆剩 8 顆，要怎麼算？' });
  A.register('inMissSub', { methods, makeProblem: (level, i, rand = Math.random) => makeMissing(['subtrahend', 'minuend'], level, i, rand), planFigure: ctx => tapeSVG(ctx.problem.parts, ctx.problem.total), steps: missSteps,
    reasons: rWord, done: ctx => `${ctx.problem.find.replace('幾', ' ' + ctx.problem.ans + ' ')}。`, chant: '找全部用加的，找其中一段用減的；最後放回去檢查。', transfer: '想一想：付了 100 元，找回 35 元，東西多少錢？' });

  // =============== 3-3 比一比（＞＜與比較型應用題） ===============
  A.register('inCompare', {
    methods, makeProblem: (level, i, rand = Math.random) => { const hi = fromLevel({ easy: 99, standard: 300, challenge: 999 }, level); let a, b; do { a = rnd(rand, 10, hi); b = rnd(rand, 10, hi); } while (a === b || borrows(Math.max(a, b), Math.min(a, b)) > 1);
      const t = any(rand, [['哥哥', '弟弟', '公分', '身高'], ['一班', '二班', '本', '借的書'], ['紅隊', '藍隊', '分', '得分']]);
      return { a, b, t, d: Math.abs(a - b), dims: [a, b], prompt: `${t[0]}${t[3]} ${a} ${t[2]}，${t[1]}${t[3]} ${b} ${t[2]}。誰比較多？多多少？` }; },
    planFigure: ctx => tapeSVG([{ v: Math.min(ctx.problem.a, ctx.problem.b), label: String(Math.min(ctx.problem.a, ctx.problem.b)) }, { v: ctx.problem.d, label: '多 ？' }], String(Math.max(ctx.problem.a, ctx.problem.b))),
    steps: [
      cStep(0, { title: '＞ 或 ＜', ask: '開口朝向大的數。', id: 'sym', fixed: true, hints: ['先比最高位，再比下一位。', '位數多的數比較大。', '「＞」的開口朝向大的數。'],
        think: '老師先比最高位，再寫 ＞ 或 ＜。', together: '一起比：用哪一個符號？', pre: prompt,
        q: ctx => `${ctx.problem.a} ○ ${ctx.problem.b}，○ 裡填什麼？`, opts: ctx => [['gt', `${ctx.problem.a} ＞ ${ctx.problem.b}`], ['lt', `${ctx.problem.a} ＜ ${ctx.problem.b}`]], ans: ctx => ctx.problem.a > ctx.problem.b ? 'gt' : 'lt',
        wrong: () => ({ msg: '開口朝向大的數。先比最高位。' }), say: e => `${e.problem.a} ${e.problem.a > e.problem.b ? '＞' : '＜'} ${e.problem.b}。` }),
      cStep(1, { title: '列式', ask: '多多少用什麼算？', id: 'op', hints: ['比一比，多多少用減的。', '大的數寫前面。', '大的 － 小的。'],
        think: '老師寫：大的 － 小的。', together: '一起列式：算式是什麼？', figure: ctx => A.get('inCompare').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => { const M = Math.max(ctx.problem.a, ctx.problem.b), m = Math.min(ctx.problem.a, ctx.problem.b); return [['ok', ex(M, '-', m)], ['add', ex(M, '+', m)], ['rev', ex(m, '-', M)]]; }, ans: () => 'ok',
        wrong: (ctx, v) => ({ obs: v === 'add' ? 'opWrong' : 'wrongChoice', msg: '多多少：大的 － 小的。' }), say: e => `${ex(Math.max(e.problem.a, e.problem.b), '-', Math.min(e.problem.a, e.problem.b))}。` }),
      nStep(2, { title: '算出來', ask: '多多少？', id: 'd', hints: ['用直式算。', '不夠減要借。', '算完用加法驗算。'],
        think: '老師用直式算出來。', together: '一起算：多多少？', pre: placeAid, figure: ctx => colHtml(Math.max(ctx.problem.a, ctx.problem.b), Math.min(ctx.problem.a, ctx.problem.b), '-'),
        label: ctx => `${ctx.problem.a > ctx.problem.b ? ctx.problem.t[0] : ctx.problem.t[1]}多多少${ctx.problem.t[2]}？`, ans: ctx => ctx.problem.d,
        wrong: (ctx, v) => v === ctx.problem.a + ctx.problem.b ? { obs: 'opWrong', msg: '比一比用減的。' } : v === bigMinusSmall(Math.max(ctx.problem.a, ctx.problem.b), Math.min(ctx.problem.a, ctx.problem.b)) ? { obs: 'subSmallFromBig', msg: '不夠減時要借。' } : null, say: e => `多 ${e.problem.d} ${e.problem.t[2]}。` })
    ],
    reasons: rWord, done: ctx => `${ctx.problem.a > ctx.problem.b ? ctx.problem.t[0] : ctx.problem.t[1]}多 ${ctx.problem.d} ${ctx.problem.t[2]}。`, chant: '比一比：先比大小，多多少用大的減小的。', transfer: '想一想：你和同學誰跳繩跳得多？多幾下？'
  });

  // =============== 4-1 幾個一數（乘法的意義） ===============
  const BOX = [{ w: '雞蛋', u: '盒', e: '🥚' }, { w: '蘋果', u: '袋', e: '🍎' }, { w: '鉛筆', u: '盒', e: '✏️' }, { w: '餅乾', u: '包', e: '🍪' }];
  const nk = (level, rand) => { const top = fromLevel({ easy: 5, standard: 9, challenge: 9 }, level); return [rnd(rand, 2, top), rnd(rand, 2, top)]; };
  A.register('inGroups', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [n, k] = nk(level, rand), t = any(rand, BOX); return { n, k, t, dims: [n, k], prompt: `每${t.u}有 ${n} 個${t.w}，買了 ${k} ${t.u}。一共幾個？` }; },
    planFigure: ctx => groups(ctx.problem.k, ctx.problem.n, { e: ctx.problem.t.e, u: ctx.problem.t.u }),
    steps: [
      cStep(0, { title: '看圖說故事', ask: '每一份一樣多嗎？', id: 'same', fixed: true, hints: ['數一數每一盒有幾個。', '每一盒都一樣多。', '一樣多的好幾份，可以用乘法。'],
        think: '老師看圖：每一盒一樣多，可以幾個幾個一數。', together: '一起看：每一份一樣多嗎？', pre: prompt, figure: ctx => A.get('inGroups').planFigure(ctx),
        q: () => '每一份一樣多嗎？', opts: () => [['yes', '一樣多'], ['no', '不一樣多']], ans: () => 'yes', wrong: () => ({ msg: '再數一次，每一份都一樣多。' }), say: () => '每一份一樣多。' }),
      cStep(1, { title: '擺一擺（連加）', ask: '幾個幾個加？', id: 'rep', hints: ['每一盒的數加一次。', '有幾盒就加幾次。', `例如每盒 3 個、2 盒是 3 ＋ 3。`],
        think: '老師一盒一盒加：每盒的數，加了幾盒次。', together: '一起選：連加的算式是哪一個？', figure: ctx => A.get('inGroups').planFigure(ctx),
        q: () => '連加的算式是哪一個？', opts: ctx => { const p = ctx.problem; const rep = (x, t) => Array(t).fill(x).join(' ＋ '); return [['ok', rep(p.n, p.k)], ['nk', `${p.n} ＋ ${p.k}`], ['kn', rep(p.k, p.n)]].filter((x, j, arr) => arr.findIndex(y => y[1] === x[1]) === j); },
        ans: () => 'ok', wrong: (ctx, v) => ({ obs: v === 'nk' ? 'eqSum' : 'wrongChoice', msg: '每一盒的數，加了幾次？有幾盒就加幾次。' }), say: e => `${Array(e.problem.k).fill(e.problem.n).join(' ＋ ')}。` }),
      cStep(2, { title: '寫算式', ask: '寫成乘法算式。', id: 'op', hints: ['每一份的數 × 有幾份。', `每盒 □ 個，□ 盒：□ × □。`, '先寫每一份有幾個。'],
        think: '老師寫：每一份的數 × 份數。', together: '一起寫：乘法算式是什麼？', figure: ctx => A.get('inGroups').planFigure(ctx),
        q: () => '乘法算式是哪一個？', opts: ctx => [['ok', `${ctx.problem.n} × ${ctx.problem.k}`], ['add', `${ctx.problem.n} ＋ ${ctx.problem.k}`], ['sub', `${Math.max(ctx.problem.n, ctx.problem.k)} － ${Math.min(ctx.problem.n, ctx.problem.k)}`]],
        ans: () => 'ok', wrong: (ctx, v) => ({ obs: v === 'add' ? 'eqSum' : 'opWrong', msg: '好幾份一樣多，用乘法：每一份的數 × 份數。' }), say: e => `${e.problem.n} × ${e.problem.k}。` }),
      nStep(3, { title: '說一說', ask: '一共幾個？', id: 'ans', hints: ['可以打開九九乘法表找。', '也可以幾個幾個一數。', '答案要說一共幾個什麼。'],
        think: '老師用九九乘法算出來。', together: '一起算：一共幾個？', pre: timesAid, figure: ctx => A.get('inGroups').planFigure(ctx),
        label: ctx => `一共幾個${ctx.problem.t.w}？`, ans: ctx => ctx.problem.n * ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.n + ctx.problem.k ? { obs: 'eqSum', msg: '這是加起來的，不是幾個幾個一數。' } : null, say: e => `${e.problem.n} × ${e.problem.k} ＝ ${e.problem.n * e.problem.k}，一共 ${e.problem.n * e.problem.k} 個。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} × ${ctx.problem.k} ＝ ${ctx.problem.n * ctx.problem.k}，一共 ${ctx.problem.n * ctx.problem.k} 個${ctx.problem.t.w}。`, chant: '一樣多的好幾份用乘法：每份的數乘份數。', transfer: '想一想：一隻手有 5 根手指，3 隻手有幾根？'
  });

  // =============== 4-2 幾倍 ===============
  A.register('inTimes', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [a, k] = nk(level, rand), t = any(rand, [['妹妹', '哥哥', '本書'], ['小狗', '大狗', '公斤'], ['紅色積木', '藍色積木', '個']]);
      return { a, k, t, dims: [a, k], prompt: `${t[0]}有 ${a} ${t[2]}，${t[1]}是${t[0]}的 ${k} 倍。${t[1]}有多少${t[2]}？` }; },
    planFigure: ctx => `<div class="in-cmp"><p class="lf-tag">${ctx.problem.t[0]}（1 倍）</p>${groups(1, ctx.problem.a, { e: '🟦', aria: `${ctx.problem.a}` })}<p class="lf-tag">${ctx.problem.t[1]}（${ctx.problem.k} 倍）</p>${groups(ctx.problem.k, ctx.problem.a, { e: '🟦', aria: `${ctx.problem.k} 個 ${ctx.problem.a}` })}</div>`,
    steps: [
      cStep(0, { title: '誰是 1 倍', ask: '拿誰來比？', id: 'one', fixed: true, hints: ['「是誰的幾倍」，那個「誰」就是 1 倍。', `${'□'}是${'○'}的幾倍：○ 是 1 倍。`, '1 倍就是一份。'],
        think: '老師找 1 倍：「是誰的幾倍」的那個誰。', together: '一起找：誰是 1 倍？', pre: prompt, figure: ctx => A.get('inTimes').planFigure(ctx),
        q: () => '誰是 1 倍？', opts: ctx => [['a', ctx.problem.t[0]], ['b', ctx.problem.t[1]]], ans: () => 'a', wrong: () => ({ msg: '「是誰的幾倍」，那個「誰」是 1 倍。' }), say: e => `${e.problem.t[0]}是 1 倍。` }),
      cStep(1, { title: '列式', ask: '幾倍用什麼算？', id: 'op', hints: ['幾倍就是有幾個 1 倍。', '1 倍的數 × 倍數。', '用乘法。'],
        think: '老師寫：1 倍的數 × 幾倍。', together: '一起列式：算式是什麼？', figure: ctx => A.get('inTimes').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => [['ok', `${ctx.problem.a} × ${ctx.problem.k}`], ['add', `${ctx.problem.a} ＋ ${ctx.problem.k}`]], ans: () => 'ok', wrong: () => ({ obs: 'eqSum', msg: '幾倍是有幾個一樣多的，用乘法。' }), say: e => `${e.problem.a} × ${e.problem.k}。` }),
      nStep(2, { title: '算出來', ask: '是多少？', id: 'ans', hints: ['可以打開九九乘法表。', `${'□'} × ${'○'}。`, '答案要比 1 倍的數大。'],
        think: '老師用九九乘法算。', together: '一起算：是多少？', pre: timesAid, figure: ctx => A.get('inTimes').planFigure(ctx),
        label: ctx => `${ctx.problem.t[1]}有多少${ctx.problem.t[2]}？`, ans: ctx => ctx.problem.a * ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.a + ctx.problem.k ? { obs: 'eqSum', msg: '不是加起來，是 ' + ctx.problem.k + ' 個 ' + ctx.problem.a + '。' } : null, say: e => `${e.problem.a} × ${e.problem.k} ＝ ${e.problem.a * e.problem.k}。` })
    ],
    reasons, done: ctx => `${ctx.problem.t[1]}有 ${ctx.problem.a * ctx.problem.k} ${ctx.problem.t[2]}。`, chant: '幾倍：找 1 倍，再乘倍數。', transfer: '想一想：你有 4 張貼紙，姊姊是你的 3 倍，姊姊有幾張？'
  });

  // =============== 4-3 九九表找一找（不死背，找規律） ===============
  A.register('inTable', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = any(rand, fromLevel({ easy: [2, 5, 10], standard: [2, 3, 4, 5, 6, 7, 8, 9], challenge: [6, 7, 8, 9] }, level)), k = rnd(rand, 2, 8);
      return { n, k, dims: [n, k], prompt: `看 ${n} 的乘法：${n} × 1 ＝ ${n}、${n} × 2 ＝ ${n * 2}、${n} × 3 ＝ ${n * 3}……` }; },
    planFigure: ctx => big(Array.from({ length: 5 }, (_, j) => ctx.problem.n * (j + 1)).join('、') + '……'),
    steps: [
      nStep(0, { title: '每次多幾', ask: '後面的比前面的多幾？', id: 'step', hints: ['相鄰兩個數相減。', `${'□'} × 2 比 □ × 1 多多少？`, '每次都多一樣多。'],
        think: '老師看規律：每次多一樣多。', together: '一起找：每次多幾？', pre: prompt, figure: ctx => A.get('inTable').planFigure(ctx),
        label: ctx => `${ctx.problem.n} 的乘法，每次多幾？`, ans: ctx => ctx.problem.n, say: e => `每次多 ${e.problem.n}。` }),
      nStep(1, { title: '找一找', ask: '在表上找。', id: 'v', hints: ['打開九九乘法表找。', `從 ${'□'} 開始，每次加 □。`, '數到第幾個。'],
        think: '老師用九九乘法表找，或從前面的接著加。', together: '一起找：是多少？', pre: timesAid, figure: ctx => A.get('inTable').planFigure(ctx),
        label: ctx => `${ctx.problem.n} × ${ctx.problem.k} ＝ ？`, ans: ctx => ctx.problem.n * ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.n + ctx.problem.k ? { obs: 'eqSum', msg: '不是加起來。' } : null, say: e => `${e.problem.n} × ${e.problem.k} ＝ ${e.problem.n * e.problem.k}。` }),
      nStep(2, { title: '多一個', ask: '多乘 1 個，就多加一次。', id: 'v2', hints: ['用上一題的答案。', `再加一個 ${'□'}。`, '不用重新背。'],
        think: '老師用上一題的答案，再加一個。', together: '一起算：是多少？', figure: ctx => A.get('inTable').planFigure(ctx),
        label: ctx => `${ctx.problem.n} × ${ctx.problem.k + 1} ＝ ？（比 ${ctx.problem.n} × ${ctx.problem.k} 多一個 ${ctx.problem.n}）`, ans: ctx => ctx.problem.n * (ctx.problem.k + 1), say: e => `${e.problem.n * e.problem.k} ＋ ${e.problem.n} ＝ ${e.problem.n * (e.problem.k + 1)}。` })
    ],
    reasons, done: ctx => `${ctx.problem.n} × ${ctx.problem.k} ＝ ${ctx.problem.n * ctx.problem.k}，再多一個 ${ctx.problem.n} 是 ${ctx.problem.n * (ctx.problem.k + 1)}。`, chant: '九九乘法：每次多一樣多，忘了可以接著加。', transfer: '想一想：5 的乘法，答案的個位有什麼規律？'
  });

  // =============== 4-4 排成一排排（行列；兩數相乘順序不影響積） ===============
  A.register('inArray', {
    methods, makeProblem: (level, i, rand = Math.random) => { let r, c; do [r, c] = nk(level, rand); while (r === c); return { r, c, dims: [r, c], prompt: `教室的椅子排成 ${r} 排，每排 ${c} 張。一共幾張？` }; },
    planFigure: ctx => rows(ctx.problem.r, ctx.problem.c),
    steps: [
      nStep(0, { title: '一排幾個', ask: '橫的一排有幾張？', id: 'c', hints: ['看橫的一排。', '一張一張數。', '每一排都一樣多。'],
        think: '老師數橫的一排有幾張。', together: '一起數：一排幾張？', pre: prompt, figure: ctx => rows(ctx.problem.r, ctx.problem.c),
        label: () => '一排有幾張？', ans: ctx => ctx.problem.c, wrong: (ctx, v) => v === ctx.problem.r ? { obs: 'swapped', msg: '這是排數。要數橫的一排有幾張。' } : null, say: e => `一排 ${e.problem.c} 張。` }),
      nStep(1, { title: '有幾排', ask: '一共有幾排？', id: 'r', hints: ['往下數有幾排。', '一排一排數。', '每一排都要數到。'],
        think: '老師往下數有幾排。', together: '一起數：幾排？', figure: ctx => rows(ctx.problem.r, ctx.problem.c),
        label: () => '有幾排？', ans: ctx => ctx.problem.r, say: e => `${e.problem.r} 排。` }),
      nStep(2, { title: '算一算', ask: '每排的數 × 排數。', id: 'v', hints: ['每排 □ 張，有 □ 排。', '用乘法。', '可以打開九九乘法表。'],
        think: '老師寫：每排的數 × 排數。', together: '一起算：一共幾張？', pre: timesAid, figure: ctx => rows(ctx.problem.r, ctx.problem.c),
        label: ctx => `${ctx.problem.c} × ${ctx.problem.r} ＝ ？`, ans: ctx => ctx.problem.r * ctx.problem.c, wrong: (ctx, v) => v === ctx.problem.r + ctx.problem.c ? { obs: 'eqSum', msg: '不是加起來，是幾個幾個一數。' } : null, say: e => `${e.problem.c} × ${e.problem.r} ＝ ${e.problem.r * e.problem.c}。` }),
      cStep(3, { title: '轉過來看', ask: '轉過來，數量會變嗎？', id: 'turn', fixed: true, hints: ['把整片椅子轉 90 度。', '椅子沒有變多也沒有變少。', `${'□'} × ○ 和 ○ × □ 一樣多。`],
        think: '老師把整片轉過來看：椅子一樣多。', together: '一起想：轉過來會變嗎？', figure: ctx => rows(ctx.problem.c, ctx.problem.r, { aria: `轉過來：${ctx.problem.c} 排，每排 ${ctx.problem.r} 張` }),
        q: ctx => `轉過來變成 ${ctx.problem.c} 排、每排 ${ctx.problem.r} 張。一共幾張？`, opts: ctx => [['same', `一樣，${ctx.problem.r * ctx.problem.c} 張`], ['diff', '不一樣']], ans: () => 'same', wrong: () => ({ msg: '轉過來，椅子沒有變多也沒有變少。' }), say: e => `${e.problem.r} × ${e.problem.c} 也是 ${e.problem.r * e.problem.c}。` })
    ],
    reasons, done: ctx => `一共 ${ctx.problem.r * ctx.problem.c} 張；轉過來算也一樣。`, chant: '一排一排：每排的數乘排數；轉過來，答案一樣。', transfer: '想一想：一盒巧克力排成 3 排、每排 4 顆，一共幾顆？'
  });

  // =============== 5-1 每袋裝幾個（分裝；二年級不列除式、不用「除」字） ===============
  const SNACK = [['糖果', '顆', '袋'], ['餅乾', '片', '盒'], ['貼紙', '張', '包'], ['鉛筆', '枝', '盒']];
  A.register('inPack', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [n, k] = nk(level, rand), s = any(rand, SNACK); return { n, k, t: n * k, s, dims: [n * k, n], prompt: `有 ${n * k} ${s[1]}${s[0]}，每 ${n} ${s[1]}裝一${s[2]}。可以裝幾${s[2]}？` }; },
    planFigure: ctx => chips(ctx.problem.t, { e: '🍬', aria: `${ctx.problem.t} ${ctx.problem.s[1]}` }),
    steps: [
      nStep(0, { title: '每一份幾個', ask: '每一袋要裝幾個？', id: 'n', hints: ['找題目說「每 □ 個裝一袋」。', '每一袋都裝一樣多。', '這是每一份的數。'],
        think: '老師找每一袋要裝幾個。', together: '一起找：每袋幾個？', pre: prompt, figure: ctx => A.get('inPack').planFigure(ctx),
        label: ctx => `每一${ctx.problem.s[2]}裝幾${ctx.problem.s[1]}？`, ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === ctx.problem.t ? { msg: '這是全部的數。要找每一袋裝幾個。' } : null, say: e => `每${e.problem.s[2]} ${e.problem.n} ${e.problem.s[1]}。` }),
      nStep(1, { title: '想乘法', ask: `${'□'} 袋裝滿剛好是全部嗎？`, id: 'k', hints: ['一袋一袋裝：裝了 1 袋、2 袋……', `每袋的數 × 幾 ＝ 全部？`, '可以打開九九乘法表找。'],
        think: '老師想乘法：每袋的數乘幾，剛好是全部。', together: '一起想：乘幾？', pre: timesAid, figure: ctx => groups(ctx.problem.k, ctx.problem.n, { e: '🍬', u: ctx.problem.s[2] }),
        label: ctx => `${ctx.problem.n} × □ ＝ ${ctx.problem.t}，□ 是多少？`, ans: ctx => ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.t - ctx.problem.n ? { obs: 'opWrong', msg: '不是減一次，是要看裝了幾袋。' } : null, say: e => `${e.problem.n} × ${e.problem.k} ＝ ${e.problem.t}。` }),
      nStep(2, { title: '說一說', ask: '可以裝幾袋？', id: 'ans', hints: ['用上一步的答案。', '說出可以裝幾袋。', '要有單位。'],
        think: '老師用一句話說答案。', together: '一起說：可以裝幾袋？', figure: ctx => groups(ctx.problem.k, ctx.problem.n, { e: '🍬', u: ctx.problem.s[2] }),
        label: ctx => `可以裝幾${ctx.problem.s[2]}？`, ans: ctx => ctx.problem.k, say: e => `可以裝 ${e.problem.k} ${e.problem.s[2]}。` })
    ],
    reasons, done: ctx => `可以裝 ${ctx.problem.k} ${ctx.problem.s[2]}。`, chant: '分裝：每份幾個知道了，想乘法找幾份。', transfer: '想一想：12 個人，每 4 個人坐一桌，要幾桌？'
  });

  // =============== 5-2 每人分幾個（平分；二年級不列除式） ===============
  A.register('inShare', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [n, k] = nk(level, rand), s = any(rand, SNACK); return { n, k, t: n * k, s, dims: [n * k, k], prompt: `有 ${n * k} ${s[1]}${s[0]}，平分給 ${k} 個人。每人分到幾${s[1]}？` }; },
    planFigure: ctx => chips(ctx.problem.t, { e: '🍪', aria: `${ctx.problem.t} ${ctx.problem.s[1]}` }),
    steps: [
      nStep(0, { title: '有幾個人', ask: '要分給幾個人？', id: 'k', hints: ['找題目說「平分給幾個人」。', '平分：每人一樣多。', '人數就是要分成幾份。'],
        think: '老師找要分給幾個人。', together: '一起找：幾個人？', pre: prompt, figure: ctx => A.get('inShare').planFigure(ctx),
        label: () => '要分給幾個人？', ans: ctx => ctx.problem.k, say: e => `${e.problem.k} 個人。` }),
      nStep(1, { title: '想乘法', ask: '每人幾個，乘人數剛好是全部？', id: 'n', hints: ['一人一個輪流發，發到沒有。', `□ × 人數 ＝ 全部。`, '可以打開九九乘法表找。'],
        think: '老師想乘法：每人幾個乘人數，剛好是全部。', together: '一起想：每人幾個？', pre: timesAid, figure: ctx => groups(ctx.problem.k, ctx.problem.n, { e: '🍪', u: '人', aria: `${ctx.problem.k} 個人，每人 ${ctx.problem.n} 個` }),
        label: ctx => `□ × ${ctx.problem.k} ＝ ${ctx.problem.t}，□ 是多少？`, ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === ctx.problem.k ? { msg: '這是人數。要找每人幾個。' } : null, say: e => `${e.problem.n} × ${e.problem.k} ＝ ${e.problem.t}。` }),
      nStep(2, { title: '檢查', ask: '每人一樣多，合起來是全部嗎？', id: 'back', hints: ['每人的數 × 人數。', '要等於全部。', '一樣才是平分完。'],
        think: '老師檢查：每人的數乘人數，等於全部。', together: '一起檢查：合起來是多少？', figure: ctx => groups(ctx.problem.k, ctx.problem.n, { e: '🍪', u: '人' }),
        label: ctx => `每人 ${ctx.problem.n} ${ctx.problem.s[1]}，${ctx.problem.k} 個人一共幾${ctx.problem.s[1]}？`, ans: ctx => ctx.problem.t, say: e => `一共 ${e.problem.t} ${e.problem.s[1]}，剛好分完。` })
    ],
    reasons, done: ctx => `每人分到 ${ctx.problem.n} ${ctx.problem.s[1]}。`, chant: '平分：每人一樣多，想乘法找每人幾個。', transfer: '想一想：18 顆草莓平分給 3 個人，每人幾顆？'
  });

  // =============== 5-3 除法算式和餘數（三年級；先整除再有餘數） ===============
  A.register('inDivR', {
    methods, makeProblem: (level, i, rand = Math.random) => { const d = rnd(rand, 2, 9), q = rnd(rand, 2, 9), r = level === 'easy' || i % 3 === 0 ? 0 : rnd(rand, 1, d - 1), s = any(rand, SNACK);
      return { d, q, r, t: d * q + r, s, dims: [d * q + r, d], prompt: `有 ${d * q + r} ${s[1]}${s[0]}，平分給 ${d} 個人。每人幾${s[1]}？剩幾${s[1]}？` }; },
    planFigure: ctx => chips(ctx.problem.t, { e: '🍬' }),
    steps: [
      cStep(0, { title: '寫除式', ask: '全部 ÷ 人數。', id: 'op', hints: ['平分用除法。', '全部的數寫前面。', '全部 ÷ 分成幾份。'],
        think: '老師寫除式：全部 ÷ 人數。', together: '一起寫：除式是哪一個？', pre: prompt, figure: ctx => A.get('inDivR').planFigure(ctx),
        q: () => '除式是哪一個？', opts: ctx => [['ok', `${ctx.problem.t} ÷ ${ctx.problem.d}`], ['rev', `${ctx.problem.d} ÷ ${ctx.problem.t}`], ['sub', `${ctx.problem.t} － ${ctx.problem.d}`]], ans: () => 'ok',
        wrong: (ctx, v) => ({ obs: v === 'rev' ? 'numDenSwap' : 'opWrong', msg: '全部的數寫前面，再除以人數。' }), say: e => `${e.problem.t} ÷ ${e.problem.d}。` }),
      nStep(1, { title: '商', ask: '每人最多幾個？', id: 'q', hints: ['想：人數 × 幾，最接近又不超過全部？', '可以打開九九乘法表找。', '超過了就小 1。'],
        think: '老師想九九乘法：人數乘幾最接近、不超過全部。', together: '一起找：每人幾個？', pre: timesAid, figure: ctx => groups(ctx.problem.d, ctx.problem.q, { e: '🍬', u: '人' }),
        label: () => '商（每人幾個）是多少？', ans: ctx => ctx.problem.q, wrong: (ctx, v) => v === ctx.problem.q + 1 ? { obs: 'estTooBig', msg: `${ctx.problem.d} × ${v} 超過了全部，要小 1。` } : null, say: e => `每人 ${e.problem.q} 個。` }),
      nStep(2, { title: '餘數', ask: '分完還剩幾個？', id: 'r', hints: ['全部 － 商 × 人數。', '剩下的不夠每人再分一個。', '剛好分完，餘數是 0。'],
        think: '老師算剩下的：全部減掉分出去的。', together: '一起算：剩幾個？', figure: ctx => chips(ctx.problem.d * ctx.problem.q, { e: '🍬', b: ctx.problem.r, e2: '🟠', aria: `分出去 ${ctx.problem.d * ctx.problem.q} 個，橘色 ${ctx.problem.r} 個是剩下的` }),
        label: () => '餘數（剩幾個）是多少？', ans: ctx => ctx.problem.r, wrong: (ctx, v) => v >= ctx.problem.d ? { obs: 'remBig', msg: '剩下的還夠每人再分一個，商可以再大一點。' } : null, say: e => `剩 ${e.problem.r} 個。` }),
      cStep(3, { title: '檢查', ask: '餘數比除數小嗎？', id: 'small', fixed: true, hints: ['餘數要比人數少。', '如果剩的和人數一樣多，還可以每人再分一個。', '比一比餘數和除數。'],
        think: '老師檢查：餘數一定比除數小。', together: '一起檢查：餘數比除數小嗎？', figure: ctx => A.get('inDivR').planFigure(ctx),
        q: ctx => `餘數 ${ctx.problem.r} 比除數 ${ctx.problem.d} 小嗎？`, opts: () => [['yes', '比較小，對了'], ['no', '沒有比較小']], ans: () => 'yes', wrong: () => ({ msg: '再比一次。' }), say: () => '餘數比除數小，對了。' })
    ],
    reasons, done: ctx => `${ctx.problem.t} ÷ ${ctx.problem.d} ＝ ${ctx.problem.q}${ctx.problem.r ? ` …… ${ctx.problem.r}` : ''}，每人 ${ctx.problem.q} ${ctx.problem.s[1]}${ctx.problem.r ? `，剩 ${ctx.problem.r} ${ctx.problem.s[1]}` : '，剛好分完'}。`, chant: '除法：全部除以份數，餘數要比除數小。', transfer: '想一想：25 顆糖平分給 4 個人，剩下的怎麼辦？'
  });

  // =============== 5-4 乘還是除（乘除並陳；R-3-1 乘除互逆） ===============
  // kind：total（求全部，乘）、each（求每份，除）、parts（求份數，除）、times（「3 的幾倍是 15」，除）
  A.register('inMulOrDiv', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [n, k] = nk(level, rand), kind = ['total', 'each', 'parts', 'times'][(i + rnd(rand, 0, 3)) % 4];
      const M = { total: [`每盒有 ${n} 個蛋，${k} 盒有幾個？`, `${n} × ${k}`, n * k, `${n * k} ÷ ${k} ＝ ${n}`, '全部有幾個'], each: [`${n * k} 個蛋平分裝成 ${k} 盒，每盒幾個？`, `${n * k} ÷ ${k}`, n, `${n} × ${k} ＝ ${n * k}`, '每盒幾個'],
        parts: [`${n * k} 個蛋，每 ${n} 個裝一盒，可以裝幾盒？`, `${n * k} ÷ ${n}`, k, `${n} × ${k} ＝ ${n * k}`, '可以裝幾盒'], times: [`哥哥的書是 ${n * k} 本，是弟弟的 ${k} 倍。弟弟有幾本？`, `${n * k} ÷ ${k}`, n, `${n} × ${k} ＝ ${n * k}`, '弟弟有幾本'] }[kind];
      return { n, k, kind, p: M[0], op: M[1], ans: M[2], chk: M[3], find: M[4], dims: [n, k, ['total', 'each', 'parts', 'times'].indexOf(kind)], prompt: M[0] }; },
    planFigure: ctx => ctx.problem.kind === 'total' ? groups(ctx.problem.k, ctx.problem.n) : chips(ctx.problem.n * ctx.problem.k, { e: '🥚' }),
    steps: [
      cStep(0, { title: '看懂題目', ask: '知道全部嗎？要找什麼？', id: 'find', hints: ['題目有沒有給「全部」的數？', '知道每份和份數，找全部：用乘。', '知道全部，找每份或份數：用除。'],
        think: '老師先看：題目給了全部嗎？要找的是什麼？', together: '一起看：要找什麼？', pre: prompt,
        q: () => '要找的是什麼？', opts: ctx => [['total', '全部有幾個'], ['part', '每一份或幾份（全部已經知道）']], ans: ctx => ctx.problem.kind === 'total' ? 'total' : 'part', wrong: () => ({ msg: '題目有給全部的數嗎？' }), say: e => `要找${e.problem.find}。` }),
      cStep(1, { title: '列式', ask: '用乘的還是除的？', id: 'op', hints: ['找全部用乘。', '知道全部，找每份或份數用除。', '「是誰的幾倍」找 1 倍，也用除。'],
        think: '老師想：找全部用乘；已經知道全部，用除。', together: '一起列式：算式是哪一個？', figure: ctx => A.get('inMulOrDiv').planFigure(ctx),
        q: () => '算式是哪一個？', opts: ctx => { const p = ctx.problem, all = [p.op, `${p.n} × ${p.k}`, `${p.n * p.k} ÷ ${p.k}`, `${p.n * p.k} × ${p.k}`]; return [...new Set(all)].slice(0, 3).map(x => [x === p.op ? 'ok' : x, x]); },
        ans: () => 'ok', wrong: () => ({ obs: 'opWrong', msg: '知道全部，找每份或份數用除；找全部用乘。' }), say: e => `${e.problem.op}。` }),
      nStep(2, { title: '算出來', ask: '用九九乘法想。', id: 'ans', hints: ['除法也可以想乘法。', '可以打開九九乘法表。', '算出來要說單位。'],
        think: '老師用九九乘法算出來。', together: '一起算：答案是多少？', pre: timesAid, figure: ctx => A.get('inMulOrDiv').planFigure(ctx),
        label: ctx => `${ctx.problem.op} ＝ ？`, ans: ctx => ctx.problem.ans, wrong: (ctx, v) => ctx.problem.kind === 'times' && v === ctx.problem.n * ctx.problem.k * ctx.problem.k ? { obs: 'opWrong', msg: '弟弟是 1 倍，比哥哥少。要用除的。' } : null, say: e => `${e.problem.op} ＝ ${e.problem.ans}。` }),
      nStep(3, { title: '驗算', ask: '乘除互相檢查。', id: 'chk', hints: ['乘法用除法驗算；除法用乘法驗算。', '把答案放回去算一次。', '要和題目的數一樣。'],
        think: '老師用相反的算法驗算。', together: '一起驗算：是多少？', figure: ctx => A.get('inMulOrDiv').planFigure(ctx),
        label: ctx => `${ctx.problem.chk.split(' ＝ ')[0]} ＝ ？`, ans: ctx => Number(ctx.problem.chk.split(' ＝ ')[1]), say: e => `${e.problem.chk}，對了。` })
    ],
    reasons, done: ctx => `${ctx.problem.op} ＝ ${ctx.problem.ans}。`, chant: '找全部用乘，知道全部找一份用除；乘除可以互相驗算。', transfer: '想一想：3 的幾倍是 15？要用乘還是除？'
  });
})();

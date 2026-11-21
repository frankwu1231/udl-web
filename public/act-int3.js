'use strict';
// 第 35 版：整數四則運算教材包單元 6～10 的其他活動（核心 6-2、9-2 在 act-int.js；核心 8-1 在這裡）。圖形和計算在 act-int.js（window.intFig）。
// 核心活動 8-1（應用題五步）：讀題、找要找的 → 先算什麼 → 第一步 → 第二步 → 檢查。
// 課綱備註：N-3-3 被乘數二、三位數、須處理有 0；N-4-2 乘數與除數限三位、要教估商；
// N-2-8 兩步驟（加減混合、加與乘、減與乘）不含併式、不含連乘；N-3-7 連乘、加與除、減與除，不含併式；N-4-3 乘與除、連除，等分除和包含除都要有；
// R-4-1 併式限整數、括號先算、先乘除後加減；R-4-2 不做 a－(b－c) 去括號，乘除只做三數相乘換順序、先乘後除＝先除後乘；
// N-5-2、R-5-1 三步驟併式、平均；R-5-2 分配律，不做 a÷(b÷c) 去括號。每一步的答案都是整數。
(() => {
  const A = window.areaActs, I = window.intFig;
  const { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, timesAid, placeAid, round10, round100, ex, chips, groups, colHtml, divHtml, tapeSVG } = I;
  const methods = [['mark', '🧮 一步一步做'], ['self', '🧠 先自己算，需要時看提示']];
  const rCalc = [['place', '對齊位值'], ['check', '算完檢查'], ['hint', '看提示']];
  const rWord = [['read', '把題目讀兩次'], ['first', '先想先算什麼'], ['check', '算完檢查合不合理'], ['hint', '看提示']];
  // 只取不重複的選項（文字一樣的去掉），最多 n 個
  const uniq = (list, n = 4) => list.filter((x, k) => list.findIndex(y => y[1] === x[1]) === k).slice(0, n);
  // 乘法每一位（從個位起）寫的數和進位
  function mulDigits(a, b) { const out = []; let c = 0, x = a; while (x > 0) { const s = (x % 10) * b + c; out.push([s % 10, Math.floor(s / 10)]); c = Math.floor(s / 10); x = Math.floor(x / 10); } return out; }
  const noCarryMul = (a, b) => { let r = 0, p = 1, x = a; while (x > 0) { r += ((x % 10) * b % 10) * p; p *= 10; x = Math.floor(x / 10); } return r; };

  // =============== 6-1 二、三位數乘一位數 ===============
  A.register('inMul1', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel({ easy: [12, 49], standard: [100, 999], challenge: [100, 999] }, level);
      let a, b; do { a = rnd(rand, lo, hi); b = rnd(rand, 2, 9); } while ((level === 'challenge' || i % 3 === 2) && a >= 100 && Math.floor(a / 10) % 10 !== 0 && a % 10 !== 0 || mulDigits(a, b)[0][1] === 0 && i % 2 === 0);
      const t = any(rand, [['一箱牛奶', '瓶', '箱'], ['一盒彩色筆', '枝', '盒'], ['一張門票', '元', '張']]);
      return { a, b, v: a * b, t, dims: [a, b], prompt: `${t[0]}是 ${a} ${t[1]}，${b} ${t[2]}是多少${t[1]}？` }; },
    planFigure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*'),
    steps: [
      mStep(0, { title: '乘個位', ask: '個位乘完，寫幾、進幾？', hints: ['用乘數乘被乘數的個位。', '滿 10 的要進到十位，個位只寫剩下的。', '沒有滿 10，進位填 0。'],
        think: '老師先乘個位：寫個位數，十位的數記成進位。', together: '一起算個位：寫幾？進幾？', pre: ctx => `${prompt(ctx)}${timesAid(ctx)}`, figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { hl: 0 }),
        fields: [['u', ctx => `${ctx.problem.a % 10} × ${ctx.problem.b}，個位寫幾？`, ctx => mulDigits(ctx.problem.a, ctx.problem.b)[0][0], (ctx, v) => v === ctx.problem.a % 10 * ctx.problem.b ? { obs: 'noCarry', msg: '滿 10 了，個位只寫剩下的。' } : null],
          ['c', () => '要進幾到十位？', ctx => mulDigits(ctx.problem.a, ctx.problem.b)[0][1]]],
        say: e => { const [w, c] = mulDigits(e.problem.a, e.problem.b)[0]; return `${e.problem.a % 10} × ${e.problem.b} ＝ ${e.problem.a % 10 * e.problem.b}，寫 ${w}，進 ${c}。`; } }),
      mStep(1, { title: '乘十位', ask: '乘完記得加上進位。', hints: ['用乘數乘十位的數。', '再加上個位進來的數。', '十位是 0 時，0 乘任何數都是 0，只剩進位。'],
        think: '老師乘十位，再加上進位。', together: '一起算十位：寫幾？進幾？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { hl: 1 }), pre: timesAid,
        fields: [['t', ctx => `${Math.floor(ctx.problem.a / 10) % 10} × ${ctx.problem.b} ＋ 進位，十位寫幾？`, ctx => mulDigits(ctx.problem.a, ctx.problem.b)[1][0], (ctx, v) => v === (Math.floor(ctx.problem.a / 10) % 10 * ctx.problem.b) % 10 && mulDigits(ctx.problem.a, ctx.problem.b)[0][1] ? { obs: 'noCarry', msg: '個位進上來的數忘了加。' } : null],
          ['c2', () => '要再進幾？', ctx => mulDigits(ctx.problem.a, ctx.problem.b)[1][1]]],
        say: e => { const [w, c] = mulDigits(e.problem.a, e.problem.b)[1]; return `十位寫 ${w}，進 ${c}。`; } }),
      nStep(2, { title: '一列算出答案', ask: '每一位都乘完了嗎？', id: 'v', hints: ['百位也乘，加上進位。', '最後的進位寫在最左邊。', '把每一位寫在同一列。'],
        think: '老師把每一位都乘完，答案寫成一列。', together: '一起寫：答案是多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { res: ctx.checked(2) ? ctx.problem.v : null }),
        label: ctx => `${ctx.problem.a} × ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.v, wrong: (ctx, v) => v === noCarryMul(ctx.problem.a, ctx.problem.b) ? { obs: 'noCarry', msg: '進位的數忘了加。' } : null, say: e => `${e.problem.a} × ${e.problem.b} ＝ ${e.problem.v}。` }),
      cStep(3, { title: '估一估', ask: '答案大約多少？合理嗎？', id: 'est', hints: ['把被乘數想成整十或整百。', '再乘乘數。', '選最接近的。'],
        think: '老師估一估：被乘數想成整十（整百），再乘。', together: '一起估：大約多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { res: ctx.problem.v }),
        q: () => '答案大約是多少？', opts: ctx => { const p = ctx.problem, r = p.a >= 100 ? round100 : round10, e = r(p.a) * p.b, st = (p.a >= 100 ? 100 : 10) * p.b; return uniq([['ok', `大約 ${e}`], ['big', `大約 ${e + 3 * st}`], ['small', `大約 ${Math.max(st, e - 3 * st)}`]]); },
        ans: () => 'ok', wrong: () => ({ msg: '把被乘數想成整十或整百，再乘。' }), say: e => `大約 ${(e.problem.a >= 100 ? round100 : round10)(e.problem.a) * e.problem.b}，合理。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.a} × ${ctx.problem.b} ＝ ${ctx.problem.v}。`, chant: '直式乘法：從個位乘，進位記好，乘完加上進位。', transfer: '想一想：305 × 4，十位的 0 要怎麼算？'
  });

  // =============== 6-3 驗算（商 × 除數 ＋ 餘數 ＝ 被除數） ===============
  A.register('inVerify', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel({ easy: [20, 99], standard: [100, 999], challenge: [100, 999] }, level);
      let n, d, q, r; do { d = rnd(rand, 2, 9); n = rnd(rand, lo, hi); q = Math.floor(n / d); r = n % d; } while (q < 10);
      const right = i % 2 === 0, z = String(q).replace(/0/g, ''), sq = right ? q : (z !== String(q) && z ? Number(z) : q - 1), sr = right ? r : n - sq * d;
      return { n, d, q, r, sq, sr, right, dims: [n, d, right ? 1 : 0], prompt: `小美算了 ${n} ÷ ${d} ＝ ${sq} …… ${sr}。用驗算看看對不對。` }; },
    planFigure: ctx => divHtml(ctx.problem.n, ctx.problem.d, { q: String(ctx.problem.sq) }),
    steps: [
      cStep(0, { title: '選驗算的算式', ask: '除法怎麼驗算？', id: 'how', hints: ['除法用乘法驗算。', '商 × 除數，再加上餘數。', '要等於被除數。'],
        think: '老師用乘法驗算：商乘除數，再加餘數。', together: '一起選：驗算的算式是哪一個？', pre: prompt, figure: ctx => A.get('inVerify').planFigure(ctx),
        q: () => '驗算的算式是哪一個？', opts: ctx => { const p = ctx.problem; return uniq([['ok', `${p.sq} × ${p.d} ＋ ${p.sr}`], ['x', `${p.sq} × ${p.sr} ＋ ${p.d}`], ['y', `${p.n} × ${p.d} ＋ ${p.sr}`]]); }, ans: () => 'ok',
        wrong: () => ({ msg: '商 × 除數 ＋ 餘數。' }), say: e => `${e.problem.sq} × ${e.problem.d} ＋ ${e.problem.sr}。` }),
      nStep(1, { title: '算一算', ask: '等於多少？', id: 'v', hints: ['先乘，再加。', '可以用直式乘。', '算完和被除數比。'],
        think: '老師先乘再加。', together: '一起算：是多少？', pre: timesAid, figure: ctx => colHtml(ctx.problem.sq, ctx.problem.d, '*', { head: false }),
        label: ctx => `${ctx.problem.sq} × ${ctx.problem.d} ＋ ${ctx.problem.sr} ＝ ？`, ans: ctx => ctx.problem.sq * ctx.problem.d + ctx.problem.sr, say: e => `${e.problem.sq * e.problem.d} ＋ ${e.problem.sr} ＝ ${e.problem.sq * e.problem.d + e.problem.sr}。` }),
      cStep(2, { title: '對不對', ask: '等於被除數，餘數也比除數小嗎？', id: 'ok', fixed: true, hints: ['和被除數比一比。', '還要看餘數有沒有比除數小。', '兩個都對，才是算對。'],
        think: '老師檢查兩件事：等於被除數，而且餘數比除數小。', together: '一起看：小美算對了嗎？', figure: ctx => A.get('inVerify').planFigure(ctx),
        q: () => '小美算對了嗎？', opts: () => [['yes', '算對了'], ['no', '算錯了']], ans: ctx => ctx.problem.right ? 'yes' : 'no',
        wrong: ctx => ctx.problem.right ? { msg: '等於被除數，餘數也比除數小，是對的。' } : { obs: ctx.problem.sr >= ctx.problem.d ? 'remBig' : 'zeroQuotient', msg: ctx.problem.sr >= ctx.problem.d ? '餘數比除數大，商還可以再大。' : '驗算的結果不等於被除數。' }, say: e => e.problem.right ? '算對了。' : '算錯了。' }),
      mStep(3, { title: '寫出正確答案', ask: '商和餘數是多少？', hints: ['重新用直式除一次。', '不夠分的那一位，商寫 0。', '餘數要比除數小。'],
        think: '老師重新除一次（算對的就照抄）。', together: '一起寫：商和餘數？', pre: timesAid, figure: ctx => divHtml(ctx.problem.n, ctx.problem.d),
        fields: [['q', () => '商', ctx => ctx.problem.q, (ctx, v) => String(v) === String(ctx.problem.q).replace(/0/g, '') ? { obs: 'zeroQuotient', msg: '商中間的 0 不能漏。' } : null], ['r', () => '餘數', ctx => ctx.problem.r, (ctx, v) => v >= ctx.problem.d ? { obs: 'remBig', msg: '餘數要比除數小。' } : null]],
        say: e => `${e.problem.n} ÷ ${e.problem.d} ＝ ${e.problem.q} …… ${e.problem.r}。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.n} ÷ ${ctx.problem.d} ＝ ${ctx.problem.q} …… ${ctx.problem.r}；${ctx.problem.q} × ${ctx.problem.d} ＋ ${ctx.problem.r} ＝ ${ctx.problem.n}。`, chant: '除法驗算：商乘除數加餘數，等於被除數；餘數比除數小。', transfer: '想一想：分東西以後，怎麼確定沒有分錯？'
  });

  // =============== 7-1 乘以二位數（第二列往左一格） ===============
  A.register('inMul2', {
    methods, makeProblem: (level, i, rand = Math.random) => { const [lo, hi] = fromLevel({ easy: [12, 49], standard: [23, 99], challenge: [100, 999] }, level); let a, b; do { a = rnd(rand, lo, hi); b = rnd(rand, 12, fromLevel({ easy: 29, standard: 99, challenge: 99 }, level)); } while (b % 10 === 0 || a % 10 === 0);
      return { a, b, u: b % 10, t: Math.floor(b / 10), p1: a * (b % 10), p2: a * Math.floor(b / 10) * 10, v: a * b, dims: [a, b], prompt: `全校有 ${b} 班，每班訂 ${a} 瓶牛奶。一共要訂幾瓶？` }; },
    planFigure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*'),
    steps: [
      nStep(0, { title: '乘個位', ask: '先用乘數的個位乘。', id: 'p1', hints: ['乘數的個位是幾？', `被乘數 × 個位的數。`, '寫在第一列。'],
        think: '老師先用乘數的個位乘，寫在第一列。', together: '一起算：第一列是多少？', pre: ctx => `${prompt(ctx)}${timesAid(ctx)}`, figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { hl: 0 }),
        label: ctx => `${ctx.problem.a} × ${ctx.problem.u} ＝ ？`, ans: ctx => ctx.problem.p1, say: e => `${e.problem.a} × ${e.problem.u} ＝ ${e.problem.p1}。` }),
      nStep(1, { title: '乘十位', ask: '十位的數代表幾十？第二列要往左一格。', id: 'p2', hints: [`乘數的十位是幾個十。`, '乘幾十，答案的個位是 0（所以第二列往左一格寫）。', `被乘數 × 幾十。`],
        think: '老師用十位乘：十位代表幾十，答案往左一格寫。', together: '一起算：第二列代表多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { hl: 1 }),
        label: ctx => `${ctx.problem.a} × ${ctx.problem.t * 10} ＝ ？`, ans: ctx => ctx.problem.p2, wrong: (ctx, v) => v === ctx.problem.p2 / 10 ? { obs: 'noShift', msg: `十位的 ${ctx.problem.t} 是 ${ctx.problem.t * 10}，答案要再往左一格（後面多一個 0）。` } : null, say: e => `${e.problem.a} × ${e.problem.t * 10} ＝ ${e.problem.p2}。` }),
      nStep(2, { title: '加起來', ask: '兩列加起來。', id: 'v', hints: ['第一列 ＋ 第二列。', '個位對個位。', '滿 10 進 1。'],
        think: '老師把兩列加起來。', together: '一起加：一共是多少？', pre: placeAid, figure: ctx => colHtml(ctx.problem.p1, ctx.problem.p2, '+', { head: false, res: ctx.checked(2) ? ctx.problem.v : null }),
        label: ctx => `${ctx.problem.p1} ＋ ${ctx.problem.p2} ＝ ？`, ans: ctx => ctx.problem.v, wrong: (ctx, v) => v === ctx.problem.p1 + ctx.problem.p2 / 10 ? { obs: 'noShift', msg: '第二列沒有往左一格。' } : null, say: e => `${e.problem.p1} ＋ ${e.problem.p2} ＝ ${e.problem.v}。` }),
      cStep(3, { title: '估一估', ask: '把兩個數都想成整十。', id: 'est', hints: ['被乘數、乘數都想成最接近的整十（整百）。', '整十乘整十：先乘前面的數，再補 0。', '選最接近的。'],
        think: '老師估一估：兩個數都想成整十，再乘。', together: '一起估：大約多少？', figure: ctx => colHtml(ctx.problem.a, ctx.problem.b, '*', { res: ctx.problem.v }),
        q: () => '答案大約是多少？', opts: ctx => { const p = ctx.problem, ra = p.a >= 100 ? round100(p.a) : round10(p.a), e = ra * round10(p.b); return uniq([['ok', `大約 ${e}`], ['ten', `大約 ${e / 10}`], ['big', `大約 ${e * 10}`]]); },
        ans: () => 'ok', wrong: () => ({ obs: 'noShift', msg: '整十乘整十，後面的 0 要算進去。' }), say: e => `大約 ${(e.problem.a >= 100 ? round100(e.problem.a) : round10(e.problem.a)) * round10(e.problem.b)}，合理。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.a} × ${ctx.problem.b} ＝ ${ctx.problem.v}，一共 ${ctx.problem.v} 瓶。`, chant: '乘二位數：先乘個位，再乘十位往左一格，最後加起來。', transfer: '想一想：1600 × 200 可以怎麼算比較快？'
  });

  // =============== 7-2 估商（除以二位數） ===============
  A.register('inEstQ', {
    methods, makeProblem: (level, i, rand = Math.random) => { for (;;) { const d = rnd(rand, fromLevel({ easy: 11, standard: 12, challenge: 13 }, level), fromLevel({ easy: 39, standard: 89, challenge: 98 }, level)), q = rnd(rand, 2, 9), r = rnd(rand, 0, d - 1), n = d * q + r, D = round10(d), e = Math.min(9, Math.max(1, Math.floor(n / D)));
      if (D === 0 || Math.abs(e - q) > 1 || (i % 2 === 1) !== (e !== q) || n > 999) continue;
      return { n, d, q, r, D, e, dims: [n, d], prompt: `${n} 人去校外教學，每輛遊覽車坐 ${d} 人。可以坐滿幾輛？剩幾人？` }; } },
    planFigure: ctx => divHtml(ctx.problem.n, ctx.problem.d),
    steps: [
      nStep(0, { title: '除數想成整十', ask: '除數大約是幾十？', id: 'D', hints: ['看除數的個位：4 以下捨去、5 以上進一。', `例如 23 想成 20，27 想成 30。`, '想成整十比較好估。'],
        think: '老師把除數想成最接近的整十。', together: '一起想：大約幾十？', pre: prompt, figure: ctx => A.get('inEstQ').planFigure(ctx),
        label: ctx => `${ctx.problem.d} 大約是多少？`, ans: ctx => ctx.problem.D, say: e => `${e.problem.d} 想成 ${e.problem.D}。` }),
      nStep(1, { title: '估商', ask: '用整十去估。', id: 'e', hints: ['被除數 ÷ 整十，大約是幾？', '可以想：幾十乘幾最接近被除數？', '先寫估的商。'],
        think: '老師用整十估：大約乘幾最接近。', together: '一起估：商大約是幾？', pre: timesAid, figure: ctx => A.get('inEstQ').planFigure(ctx),
        label: ctx => `${ctx.problem.n} ÷ ${ctx.problem.D}，商大約是幾？（取整數）`, ans: ctx => ctx.problem.e, say: e => `大約是 ${e.problem.e}。` }),
      cStep(2, { title: '乘回去比', ask: '估的商太大、太小，還是剛好？', id: 'adj', fixed: true, hints: [`用真的除數乘估的商。`, '比被除數大：商太大，要小 1。', '減完剩的比除數還大：商太小，要大 1。'],
        think: '老師用真的除數乘回去，看太大還是太小。', together: '一起比：估得怎麼樣？', figure: ctx => A.get('inEstQ').planFigure(ctx),
        q: ctx => `${ctx.problem.d} × ${ctx.problem.e} ＝ ${ctx.problem.d * ctx.problem.e}，和 ${ctx.problem.n} 比，商怎麼樣？`, opts: () => [['big', '太大了，要小 1'], ['small', '太小了，要大 1'], ['ok', '剛好']],
        ans: ctx => ctx.problem.e > ctx.problem.q ? 'big' : ctx.problem.e < ctx.problem.q ? 'small' : 'ok', wrong: () => ({ obs: 'estTooBig', msg: '乘回去比被除數大是太大；減完剩的比除數大是太小。' }),
        say: e => e.problem.e > e.problem.q ? '太大了，要小 1。' : e.problem.e < e.problem.q ? '太小了，要大 1。' : '剛好。' }),
      mStep(3, { title: '調整、寫答案', ask: '商和餘數是多少？', hints: ['照上一步調整商。', '餘數 ＝ 被除數 － 商 × 除數。', '餘數要比除數小。'],
        think: '老師調整商，再算餘數。', together: '一起寫：商和餘數？', figure: ctx => divHtml(ctx.problem.n, ctx.problem.d, { q: ctx.checked(3) ? String(ctx.problem.q) : null }),
        fields: [['q', () => '商（坐滿幾輛）', ctx => ctx.problem.q, (ctx, v) => v === ctx.problem.e && v !== ctx.problem.q ? { obs: 'estTooBig', msg: '估的商還要調整。' } : null], ['r', () => '餘數（剩幾人）', ctx => ctx.problem.r, (ctx, v) => v >= ctx.problem.d ? { obs: 'remBig', msg: '餘數要比除數小。' } : null]],
        say: e => `商 ${e.problem.q}，餘 ${e.problem.r}。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.n} ÷ ${ctx.problem.d} ＝ ${ctx.problem.q} …… ${ctx.problem.r}，坐滿 ${ctx.problem.q} 輛，剩 ${ctx.problem.r} 人。`, chant: '估商：除數想成整十，估一估，乘回去比，太大小 1、太小大 1。', transfer: '想一想：剩下的人還要再一輛車嗎？'
  });

  // =============== 7-3 除以二、三位數 ===============
  A.register('inDiv2', {
    methods, makeProblem: (level, i, rand = Math.random) => { for (;;) { const d = rnd(rand, 12, fromLevel({ easy: 40, standard: 99, challenge: 250 }, level)), [lo, hi] = fromLevel({ easy: [100, 999], standard: [300, 999], challenge: [1000, 9999] }, level), n = rnd(rand, lo, hi), q = Math.floor(n / d), r = n % d;
      if (q < 2 || q > 999) continue; if (level === 'easy' && q > 9) continue; if (level === 'standard' && (q < 10 || q > 99)) continue;
      const lead = Number(String(n).slice(0, String(d).length)) >= d ? String(d).length : String(d).length + 1, qLen = String(n).length - lead + 1;
      if (qLen !== String(q).length) continue;
      return { n, d, q, r, qLen, dims: [n, d], prompt: `工廠有 ${n} 個杯子，每 ${d} 個裝一箱。可以裝滿幾箱？剩幾個？` }; } },
    planFigure: ctx => divHtml(ctx.problem.n, ctx.problem.d),
    steps: [
      cStep(0, { title: '商是幾位數', ask: '被除數前面幾位夠不夠除？', id: 'len', fixed: true, hints: ['先看被除數前面和除數一樣多位的數。', '比除數小就不夠除，要多看一位。', '從夠除的那一位開始寫商，就知道商有幾位。'],
        think: '老師先看前面幾位夠不夠除，決定商有幾位。', together: '一起想：商是幾位數？', pre: prompt, figure: ctx => A.get('inDiv2').planFigure(ctx),
        q: () => '商是幾位數？', opts: () => [['1', '一位數'], ['2', '二位數'], ['3', '三位數']], ans: ctx => String(ctx.problem.qLen), wrong: () => ({ obs: 'startWrong', msg: '從被除數最左邊開始，看到夠除的那一位，商就從那一位寫起。' }), say: e => `商是 ${['', '一', '二', '三'][e.problem.qLen]}位數。` }),
      mStep(1, { title: '估商、算出來', ask: '每一位都估商、乘回去、減。', hints: ['除數想成整十（整百）來估商。', '乘回去太大就小 1，剩的比除數大就大 1。', '不夠除的那一位，商寫 0。'],
        think: '老師一位一位估商、乘回去、減。', together: '一起算：商和餘數？', figure: ctx => divHtml(ctx.problem.n, ctx.problem.d, { q: ctx.checked(1) ? String(ctx.problem.q) : null }),
        fields: [['q', () => '商', ctx => ctx.problem.q, (ctx, v) => String(v) === String(ctx.problem.q).replace(/0/g, '') ? { obs: 'zeroQuotient', msg: '不夠除的那一位，商要寫 0。' } : null], ['r', () => '餘數', ctx => ctx.problem.r, (ctx, v) => v >= ctx.problem.d ? { obs: 'remBig', msg: '餘數要比除數小。' } : null]],
        say: e => `商 ${e.problem.q}，餘 ${e.problem.r}。` }),
      nStep(2, { title: '驗算', ask: '商 × 除數 ＋ 餘數 ＝ ？', id: 'chk', hints: ['先算商 × 除數。', '再加餘數。', '要等於被除數。'],
        think: '老師驗算。', together: '一起驗算：是多少？', figure: ctx => divHtml(ctx.problem.n, ctx.problem.d, { q: String(ctx.problem.q) }),
        label: ctx => `${ctx.problem.q} × ${ctx.problem.d} ＋ ${ctx.problem.r} ＝ ？`, ans: ctx => ctx.problem.n, say: e => `${e.problem.q} × ${e.problem.d} ＋ ${e.problem.r} ＝ ${e.problem.n}，對了。` })
    ],
    reasons: rCalc, done: ctx => `${ctx.problem.n} ÷ ${ctx.problem.d} ＝ ${ctx.problem.q} …… ${ctx.problem.r}。`, chant: '除以多位數：先看商有幾位，一位一位估商，最後驗算。', transfer: '想一想：60000 ÷ 400 可以怎麼想比較快？'
  });

  // =============== 兩步驟應用題（8-1、8-2、8-3；9-1 併式也用） ===============
  // 每一題：find（要找的）、s1（先算什麼、算式、答案）、s2（第二步）、merged（併式）、bad（常見錯的併式）、say（答案的話）
  const T = {
    // 二年級（N-2-8）：加與乘、減與乘、加減混合；不連乘
    addMul: (r, lv) => { const n = rnd(r, 2, 9), k = rnd(r, 2, lv === 'easy' ? 5 : 9), e = rnd(r, 1, 9); return { p: `每盒有 ${n} 顆蛋，買了 ${k} 盒，又多買了 ${e} 顆。一共有幾顆蛋？`, find: '一共有幾顆蛋', s1q: `${k} 盒有幾顆`, s1: [`${n} × ${k}`, n * k], s2: [`${n * k} ＋ ${e}`, n * k + e], merged: `${n} × ${k} ＋ ${e}`, bad: `${n} × (${k} ＋ ${e})`, badV: n * (k + e), u: '顆', distract: [`一盒有幾顆`, `多買了幾顆`] }; },
    subMul: (r, lv) => { const p = rnd(r, 3, 9), k = rnd(r, 2, lv === 'easy' ? 5 : 9), m = p * k < 50 && lv === 'easy' ? 50 : 100; return { p: `一枝筆 ${p} 元，買 ${k} 枝，付了 ${m} 元。要找回多少元？`, find: '要找回多少元', s1q: `${k} 枝筆要多少元`, s1: [`${p} × ${k}`, p * k], s2: [`${m} － ${p * k}`, m - p * k], merged: `${m} － ${p} × ${k}`, bad: `(${m} － ${p}) × ${k}`, badV: (m - p) * k, u: '元', distract: [`付了多少元`, `一枝多少元`] }; },
    addSub: (r, lv) => { const bus = lv === 'easy', top = bus ? 40 : 300; let a, b, c; do { a = rnd(r, 20, top); b = rnd(r, 5, a - 5); c = rnd(r, 5, bus ? 30 : top); } while (a - b + c > (bus ? 45 : 999));   // 公車最多 45 人；人多的用體育館
      return bus ? { p: `公車上有 ${a} 人，到站下車 ${b} 人，又上車 ${c} 人。現在車上有幾人？`, find: '現在車上有幾人', s1q: '下車以後剩幾人', s1: [`${a} － ${b}`, a - b], s2: [`${a - b} ＋ ${c}`, a - b + c], merged: `${a} － ${b} ＋ ${c}`, bad: `${a} － (${b} ＋ ${c})`, badV: a - b - c, u: '人', distract: ['上車的有幾人', '一開始有幾人'] }
        : { p: `體育館裡有 ${a} 人看球賽，中場走了 ${b} 人，又進來 ${c} 人。現在有幾人？`, find: '現在有幾人', s1q: '走了以後剩幾人', s1: [`${a} － ${b}`, a - b], s2: [`${a - b} ＋ ${c}`, a - b + c], merged: `${a} － ${b} ＋ ${c}`, bad: `${a} － (${b} ＋ ${c})`, badV: a - b - c, u: '人', distract: ['進來的有幾人', '一開始有幾人'] }; },
    // 三年級（N-3-7）：連乘、加與除、減與除
    mulMul: (r, lv) => { const a = rnd(r, 2, lv === 'easy' ? 4 : 9), b = rnd(r, 2, 9), k = rnd(r, 2, lv === 'easy' ? 4 : 9); return { p: `一箱有 ${a} 盒餅乾，一盒有 ${b} 片。${k} 箱一共有幾片？`, find: `${k} 箱一共有幾片`, s1q: '一箱有幾片', s1: [`${b} × ${a}`, a * b], s2: [`${a * b} × ${k}`, a * b * k], merged: `${b} × ${a} × ${k}`, bad: `${b} × ${a} ＋ ${k}`, badV: a * b + k, u: '片', distract: ['一盒有幾片', '有幾箱'] }; },
    addDiv: (r, lv) => { const k = rnd(r, 2, lv === 'easy' ? 5 : 9), each = rnd(r, 3, 9), t = k * each, a = rnd(r, 2, t - 2), b = t - a; return { p: `小安有 ${a} 張貼紙，媽媽又給他 ${b} 張。他把貼紙平分給 ${k} 個朋友，每人幾張？`, find: '每人分到幾張', s1q: '一共有幾張', s1: [`${a} ＋ ${b}`, t], s2: [`${t} ÷ ${k}`, each], merged: `(${a} ＋ ${b}) ÷ ${k}`, bad: `${a} ＋ ${b} ÷ ${k}`, badV: a + b / k, u: '張', distract: ['媽媽給幾張', '有幾個朋友'] }; },
    subDiv: (r, lv) => { const k = rnd(r, 2, lv === 'easy' ? 5 : 9), each = rnd(r, 5, 20), x = rnd(r, 5, 40), m = k * each + x; return { p: `班費有 ${m} 元，先買一個 ${x} 元的球，剩下的錢平分給 ${k} 組買文具。每組分到幾元？`, find: '每組分到幾元', s1q: '買球以後剩幾元', s1: [`${m} － ${x}`, m - x], s2: [`${m - x} ÷ ${k}`, each], merged: `(${m} － ${x}) ÷ ${k}`, bad: `${m} － ${x} ÷ ${k}`, badV: m - x / k, u: '元', distract: ['球多少元', '有幾組'] }; },
    // 四年級（N-4-3）：乘與除（等分除、包含除）、連除
    mulDiv: (r, lv) => { const k = rnd(r, 2, 6), a = any(r, [12, 24, 6, 8, 10]), x = k * rnd(r, 1, lv === 'easy' ? 3 : 6); return { p: `一箱有 ${a} 瓶水，買了 ${x} 箱，平分給 ${k} 個班。每班分到幾瓶？`, find: '每班分到幾瓶', s1q: '一共有幾瓶', s1: [`${a} × ${x}`, a * x], s2: [`${a * x} ÷ ${k}`, a * x / k], merged: `${a} × ${x} ÷ ${k}`, bad: `${a} ÷ (${x} × ${k})`, badV: a / (x * k), u: '瓶', distract: ['一箱有幾瓶', '有幾個班'] }; },
    divDiv: (r, lv) => { const a = rnd(r, 2, 6), b = rnd(r, 2, 6), each = rnd(r, 2, lv === 'easy' ? 5 : 12), t = a * b * each; return { p: `${t} 顆糖平分給 ${a} 組，每組再平分給組裡的 ${b} 個人。每人分到幾顆？`, find: '每人分到幾顆', s1q: '每組分到幾顆', s1: [`${t} ÷ ${a}`, t / a], s2: [`${t / a} ÷ ${b}`, each], merged: `${t} ÷ ${a} ÷ ${b}`, bad: `${t} ÷ ${a} × ${b}`, badV: t / a * b, u: '顆', distract: ['一共有幾組', '一組有幾人'] }; },
    divMul: (r, lv) => { const n = rnd(r, 3, 9), bags = rnd(r, 3, lv === 'easy' ? 9 : 30), p = rnd(r, 10, 60), t = n * bags; return { p: `做了 ${t} 個餅乾，每 ${n} 個裝一袋，每袋賣 ${p} 元。全部賣完可以賣多少元？`, find: '可以賣多少元', s1q: '可以裝幾袋', s1: [`${t} ÷ ${n}`, bags], s2: [`${p} × ${bags}`, p * bags], merged: `${p} × (${t} ÷ ${n})`, bad: `${t} ÷ (${n} × ${p})`, badV: t / (n * p), u: '元', distract: ['一袋賣多少元', '每袋裝幾個'] }; }
  };
  const G2 = ['addMul', 'subMul', 'addSub'], G3 = ['mulMul', 'addDiv', 'subDiv'], G4 = ['mulDiv', 'divDiv', 'divMul'];
  const makeTwo = keys => (level, i, rand = Math.random) => { for (;;) { const key = keys[(i + rnd(rand, 0, keys.length - 1)) % keys.length], q = T[key](rand, level);
    if (!Number.isInteger(q.s1[1]) || !Number.isInteger(q.s2[1]) || q.s2[1] < 0 || q.s1[1] < 0 || q.badV === q.s2[1]) continue; if (q.s2[1] > 9999) continue;
    return { key, ...q, ans: q.s2[1], dims: [keys.indexOf(key), q.s1[1], q.s2[1]], prompt: q.p }; } };
  const twoSteps = [
    cStep(0, { title: '讀題、找要找的', ask: '最後問的是什麼？', id: 'find', hints: ['把題目讀兩次。', '最後一句是問題。', '找出要算的是什麼。'],
      think: '老師把題目讀兩次，找出最後要算的。', together: '一起找：要找什麼？', pre: prompt,
      q: () => '最後要找的是什麼？', opts: ctx => uniq([['ok', ctx.problem.find], ...ctx.problem.distract.map((x, k) => [`d${k}`, x])]), ans: () => 'ok', wrong: () => ({ msg: '看最後一句問什麼。' }), say: e => `要找「${e.problem.find}」。` }),
    cStep(1, { title: '先算什麼', ask: '要先知道什麼，才算得出答案？', id: 'first', hints: ['答案要用到的數，題目有沒有直接給？', '沒有直接給的，要先算出來。', '先算出來的，再用來算答案。'],
      think: '老師想：要算答案，得先知道什麼。', together: '一起想：先算什麼？', pre: prompt,
      q: () => '要先算出什麼？', opts: ctx => uniq([['ok', ctx.problem.s1q], ['ans', ctx.problem.find], ...ctx.problem.distract.slice(0, 1).map(x => ['d', x])]), ans: () => 'ok', wrong: (ctx, v) => ({ obs: v === 'ans' ? 'skipStep' : 'wrongChoice', msg: '答案還算不出來，要先算出另一個數。' }), say: e => `先算「${e.problem.s1q}」。` }),
    nStep(2, { title: '第一步', ask: '先算的那一步。', id: 's1', hints: ['寫出第一步的算式。', '可以打開九九乘法表。', '算好寫下來，下一步要用。'],
      think: '老師算第一步，寫下來。', together: '一起算：第一步是多少？', pre: timesAid, figure: ctx => big(esc(ctx.problem.s1[0])),
      label: ctx => `${ctx.problem.s1q}：${ctx.problem.s1[0]} ＝ ？`, ans: ctx => ctx.problem.s1[1], say: e => `${e.problem.s1[0]} ＝ ${e.problem.s1[1]}。` }),
    nStep(3, { title: '第二步', ask: '用第一步的答案再算。', id: 's2', hints: ['把第一步的答案拿來用。', '想一想：加、減、乘還是除？', '算出最後的答案。'],
      think: '老師用第一步的答案，算出最後的答案。', together: '一起算：答案是多少？', figure: ctx => big(esc(ctx.problem.s2[0])),
      label: ctx => `${ctx.problem.find}？`, ans: ctx => ctx.problem.ans,
      wrong: (ctx, v) => v === ctx.problem.s1[1] ? { obs: 'skipStep', msg: '這是第一步的答案，還要再算一步。' } : v === ctx.problem.badV ? { obs: 'leftToRight', msg: '算的順序不對，先算第一步再算第二步。' } : null, say: e => `${e.problem.s2[0]} ＝ ${e.problem.ans}。` }),
    cStep(4, { title: '檢查', ask: '答案合理嗎？用一句話說。', id: 'say', hints: ['答案要回答題目問的。', '單位要寫對。', '想一想：這個數合理嗎？'],
      think: '老師用一句話說答案，再想想合不合理。', together: '一起說：哪一句對？', figure: ctx => big(esc(`${ctx.problem.s1[0]} ＝ ${ctx.problem.s1[1]}，${ctx.problem.s2[0]} ＝ ${ctx.problem.ans}`)),
      q: () => '哪一句話說對了？', opts: ctx => { const p = ctx.problem; return uniq([['ok', `${p.find.replace(/幾|多少/, ` ${p.ans} `)}。`], ['s1', `${p.find.replace(/幾|多少/, ` ${p.s1[1]} `)}。`], ['bad', `${p.find.replace(/幾|多少/, ` ${Number.isInteger(p.badV) && p.badV >= 0 ? p.badV : p.ans + 10} `)}。`]]); },
      ans: () => 'ok', wrong: () => ({ msg: '答案是第二步算出來的。' }), say: e => `${e.problem.find.replace(/幾|多少/, ` ${e.problem.ans} `)}。` })
  ];
  const twoPlugin = (keys, extra) => ({ methods: [['mark', '📝 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeTwo(keys), planFigure: ctx => '', steps: twoSteps, reasons: rWord,
    done: ctx => `${ctx.problem.s1[0]} ＝ ${ctx.problem.s1[1]}，${ctx.problem.s2[0]} ＝ ${ctx.problem.ans}。`, chant: '兩步驟：讀題、先算什麼、第一步、第二步、檢查。', ...extra });
  A.register('inTwoStep', twoPlugin(G2, { transfer: '想一想：買 3 枝 8 元的筆，付 50 元，要找多少？先算什麼？' }));
  A.register('inTwoStep3', twoPlugin(G3, { transfer: '想一想：一盒 6 個、一箱 4 盒，3 箱有幾個？' }));
  A.register('inTwoStep4', twoPlugin(G4, { transfer: '想一想：一箱 24 瓶，買 5 箱平分給 6 班，每班幾瓶？' }));

  // =============== 9-1 兩步併成一式（R-4-1；複習二、三年級的兩步驟題） ===============
  A.register('inMerge', {
    methods, makeProblem: makeTwo([...G2, ...G3, ...G4]),
    planFigure: () => '',
    steps: [
      cStep(0, { title: '分開寫', ask: '先算的那一步是哪一個？', id: 'first', hints: ['先想要先知道什麼。', '先算的寫成第一個算式。', '再用它算答案。'],
        think: '老師先分開寫兩個算式。', together: '一起選：第一步的算式？', pre: prompt,
        q: () => '第一步的算式是哪一個？', opts: ctx => uniq([['ok', ctx.problem.s1[0]], ['s2', ctx.problem.s2[0]]]), ans: () => 'ok', wrong: () => ({ obs: 'skipStep', msg: '這一個要用到第一步的答案，是第二步。' }), say: e => `第一步：${e.problem.s1[0]}。` }),
      cStep(1, { title: '併成一式', ask: '先算的要不要加括號？', id: 'merged', hints: ['把第一步的算式放進第二步，取代它的答案。', '先算的是加減，後面是乘除：要加括號。', '先算的本來就是乘除：不用括號。'],
        think: '老師把第一步放進第二步；需要先算的加減要加括號。', together: '一起選：併式是哪一個？', figure: ctx => big(esc(`${ctx.problem.s1[0]} ＝ ${ctx.problem.s1[1]}；${ctx.problem.s2[0]} ＝ ${ctx.problem.ans}`)),
        q: () => '併成一個算式是哪一個？', opts: ctx => uniq([['ok', ctx.problem.merged], ['bad', ctx.problem.bad]]), ans: () => 'ok', wrong: () => ({ obs: 'leftToRight', msg: '照「括號先算、先乘除後加減」算這個式子，和題目的順序一樣嗎？' }), say: e => `${e.problem.merged}。` }),
      nStep(2, { title: '算出來', ask: '照順序算出答案。', id: 'v', hints: ['括號先算。', '再先乘除後加減。', '一步一步寫下來。'],
        think: '老師照順序算出來。', together: '一起算：答案是多少？', pre: timesAid, figure: ctx => big(esc(ctx.problem.merged)),
        label: ctx => `${ctx.problem.merged} ＝ ？`, ans: ctx => ctx.problem.ans, wrong: (ctx, v) => v === ctx.problem.s1[1] ? { obs: 'skipStep', msg: '這是第一步的答案，還要再算一步。' } : v === ctx.problem.badV ? { obs: 'leftToRight', msg: '算的順序不對。' } : null, say: e => `${e.problem.merged} ＝ ${e.problem.ans}。` })
    ],
    reasons: rWord, done: ctx => `${ctx.problem.merged} ＝ ${ctx.problem.ans}。`, chant: '併式：兩步寫成一式，先算的加減要加括號。', transfer: '想一想：(20 － 5) × 3 和 20 － 5 × 3 一樣嗎？'
  });

  // =============== 9-3 換個順序更好算（R-4-2：三數相乘換順序、先乘後除＝先除後乘） ===============
  const PAIRS = [[25, 4], [5, 2], [50, 2], [125, 8], [20, 5], [4, 25]];
  A.register('inSwap', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      if (i % 2 === 0) { const [a, c] = any(rand, PAIRS), b = rnd(rand, 3, level === 'easy' ? 9 : 49); return { kind: 'mul', a, b, c, text: `${a} × ${b} × ${c}`, good: `${a} × ${c} × ${b}`, part: [`${a} × ${c}`, a * c], v: a * b * c, dims: [a, b, c, 0], prompt: `算算看：${a} × ${b} × ${c} ＝ ？想一想怎麼算比較快。` }; }
      const c = rnd(rand, 3, 9), a = c * rnd(rand, 2, level === 'easy' ? 9 : 30), b = rnd(rand, 2, 9); return { kind: 'div', a, b, c, text: `${a} × ${b} ÷ ${c}`, good: `${a} ÷ ${c} × ${b}`, part: [`${a} ÷ ${c}`, a / c], v: a * b / c, dims: [a, b, c, 1], prompt: `算算看：${a} × ${b} ÷ ${c} ＝ ？想一想怎麼算比較快。` }; },
    planFigure: ctx => big(esc(ctx.problem.text)),
    steps: [
      cStep(0, { title: '換順序', ask: '哪一個和原來一樣大，又比較好算？', id: 'swap', hints: ['只有乘法（或乘除）時，可以換順序。', '先湊出整十、整百。', '先除再乘，數字會變小。'],
        think: '老師想：只有乘除的算式可以換順序，先算好算的。', together: '一起選：怎麼換？', pre: prompt,
        q: () => '哪一個和原式一樣大，又比較好算？', opts: ctx => { const p = ctx.problem; return uniq(p.kind === 'mul' ? [['ok', p.good], ['add', `${p.a} × ${p.c} ＋ ${p.b}`], ['x', `${p.a} ＋ ${p.b} × ${p.c}`]] : [['ok', p.good], ['x', `${p.a} ÷ (${p.c} × ${p.b})`], ['y', `${p.a} － ${p.c} × ${p.b}`]]); },
        ans: () => 'ok', wrong: () => ({ obs: 'opWrong', msg: '換順序時，乘號、除號要跟著它的數一起搬，不能換成別的算法。' }), say: e => `${e.problem.text} ＝ ${e.problem.good}。` }),
      nStep(1, { title: '先算好算的', ask: '先算那一段。', id: 'part', hints: ['先算湊出來的那一段。', '例如 25 × 4 ＝ 100。', '先除，數字變小。'],
        think: '老師先算好算的那一段。', together: '一起算：是多少？', pre: timesAid, figure: ctx => big(esc(ctx.problem.good)),
        label: ctx => `${ctx.problem.part[0]} ＝ ？`, ans: ctx => ctx.problem.part[1], say: e => `${e.problem.part[0]} ＝ ${e.problem.part[1]}。` }),
      nStep(2, { title: '算出答案', ask: '再乘剩下的數。', id: 'v', hints: ['把剛剛的答案乘剩下的數。', '整十、整百的乘法：先乘再補 0。', '寫出答案。'],
        think: '老師再乘剩下的數。', together: '一起算：答案是多少？', figure: ctx => big(esc(ctx.problem.good)),
        label: ctx => `${ctx.problem.text} ＝ ？`, ans: ctx => ctx.problem.v, say: e => `${e.problem.text} ＝ ${e.problem.v}。` })
    ],
    reasons: [['swap', '換順序'], ['easy', '先算好算的'], ['hint', '看提示']], done: ctx => `${ctx.problem.text} ＝ ${ctx.problem.good} ＝ ${ctx.problem.v}。`, chant: '只有乘除的算式，可以換順序，先算好算的。', transfer: '想一想：4 × 17 × 25 怎麼算最快？'
  });

  // =============== 10-1 三步驟併式（N-5-2、R-5-1） ===============
  A.register('inThree', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      if (i % 2 === 0) { for (;;) { const a = rnd(rand, 2, 6), p = rnd(rand, 5, 20), b = rnd(rand, 2, 6), q = rnd(rand, 10, 40), m = any(rand, [100, 200, 500]), s = a * p + b * q; if (s >= m) continue;
        return { kind: 'change', p: `買 ${a} 枝筆，每枝 ${p} 元；${b} 本簿子，每本 ${q} 元。付 ${m} 元，要找回多少元？`, find: '要找回多少元', merged: `${m} － (${p} × ${a} ＋ ${q} × ${b})`, bad: `${m} － ${p} × ${a} ＋ ${q} × ${b}`, inner: [`${p} × ${a} ＋ ${q} × ${b}`, s], ans: m - s, badV: m - p * a + q * b, dims: [a, p, b, q, m], prompt: `買 ${a} 枝筆，每枝 ${p} 元；${b} 本簿子，每本 ${q} 元。付 ${m} 元，要找回多少元？` }; } }
      for (;;) { const a = rnd(rand, 20, 30), b = rnd(rand, 20, 30), k = rnd(rand, 2, 5), g = any(rand, [2, 3, 4, 5, 6]); if (((a + b) * k) % g) continue;
        return { kind: 'share', p: `一班 ${a} 人、二班 ${b} 人，每人帶 ${k} 個寶特瓶，平分給 ${g} 組回收。每組幾個？`, find: '每組分到幾個', merged: `(${a} ＋ ${b}) × ${k} ÷ ${g}`, bad: `${a} ＋ ${b} × ${k} ÷ ${g}`, inner: [`${a} ＋ ${b}`, a + b], ans: (a + b) * k / g, badV: a + b * k / g, dims: [a, b, k, g], prompt: `一班 ${a} 人、二班 ${b} 人，每人帶 ${k} 個寶特瓶，平分給 ${g} 組回收。每組幾個？` }; } },
    planFigure: () => '',
    steps: [
      cStep(0, { title: '讀題、找要找的', ask: '最後問的是什麼？', id: 'find', hints: ['把題目讀兩次。', '最後一句是問題。', '找出要算的。'],
        think: '老師把題目讀兩次。', together: '一起找：要找什麼？', pre: prompt,
        q: () => '最後要找的是什麼？', opts: ctx => ctx.problem.kind === 'change' ? [['ok', '要找回多少元'], ['a', '筆和簿子一共多少元'], ['b', '付了多少元']] : [['ok', '每組分到幾個'], ['a', '一共有幾人'], ['b', '一共有幾個寶特瓶']], ans: () => 'ok', wrong: () => ({ obs: 'skipStep', msg: '那是中間要先算的，不是最後的答案。' }), say: e => `要找「${e.problem.find}」。` }),
      cStep(1, { title: '併成一式', ask: '哪一段要先算？要不要括號？', id: 'merged', hints: ['先把三個步驟想清楚。', '要先算的加減，加上括號。', '照「括號先算、先乘除後加減」檢查一次。'],
        think: '老師把三步驟併成一式，先算的加減加括號。', together: '一起選：併式是哪一個？', pre: prompt,
        q: () => '併式是哪一個？', opts: ctx => [['ok', ctx.problem.merged], ['bad', ctx.problem.bad]], ans: () => 'ok', wrong: () => ({ obs: 'leftToRight', msg: '照順序算這個式子，和題目的意思一樣嗎？' }), say: e => `${e.problem.merged}。` }),
      nStep(2, { title: '先算括號', ask: '括號裡是多少？', id: 'inner', hints: ['括號先算。', '括號裡也要先乘除後加減。', '寫下來。'],
        think: '老師先算括號裡。', together: '一起算：括號裡是多少？', pre: timesAid, figure: ctx => big(esc(ctx.problem.merged)),
        label: ctx => `${ctx.problem.inner[0]} ＝ ？`, ans: ctx => ctx.problem.inner[1], say: e => `${e.problem.inner[0]} ＝ ${e.problem.inner[1]}。` }),
      nStep(3, { title: '算出答案', ask: '再算剩下的。', id: 'v', hints: ['把括號的答案放回去。', '再照順序算。', '一步一步寫。'],
        think: '老師把括號的答案放回去，再算。', together: '一起算：答案是多少？', figure: ctx => big(esc(ctx.problem.merged)),
        label: ctx => `${ctx.problem.find}？`, ans: ctx => ctx.problem.ans, wrong: (ctx, v) => v === ctx.problem.inner[1] ? { obs: 'skipStep', msg: '這是括號的答案，還要再算。' } : v === ctx.problem.badV ? { obs: 'leftToRight', msg: '括號要先算。' } : null, say: e => `${e.problem.merged} ＝ ${e.problem.ans}。` })
    ],
    reasons: rWord, done: ctx => `${ctx.problem.merged} ＝ ${ctx.problem.ans}。`, chant: '三步驟：想清楚順序，併成一式，括號先算。', transfer: '想一想：買 2 份 45 元的便當和 3 瓶 20 元的飲料，付 200 元找多少？'
  });

  // =============== 10-2 平均（R-5-1） ===============
  A.register('inAvg', {
    methods, makeProblem: (level, i, rand = Math.random) => { const n = rnd(rand, 3, level === 'easy' ? 4 : 5), top = fromLevel({ easy: 20, standard: 60, challenge: 200 }, level);
      for (;;) { const v = Array.from({ length: n }, () => rnd(rand, 5, top)), s = v.reduce((x, y) => x + y, 0); if (s % n || new Set(v).size < 2) continue;
        return { v, n, s, avg: s / n, dims: [n, s], prompt: `小安一週跳繩 ${n} 次，次數是 ${v.join('、')} 下。平均每次跳幾下？` }; } },
    planFigure: ctx => tapeSVG(ctx.problem.v.map(x => ({ v: x, label: String(x) })), `合起來 ？`),
    steps: [
      nStep(0, { title: '合起來', ask: '全部加起來是多少？', id: 's', hints: ['把每一次的數都加起來。', '一個一個加，不要漏。', '可以用直式加。'],
        think: '老師先把全部加起來。', together: '一起加：一共多少？', pre: prompt, figure: ctx => A.get('inAvg').planFigure(ctx),
        label: () => '全部加起來是多少下？', ans: ctx => ctx.problem.s, say: e => `${e.problem.v.join(' ＋ ')} ＝ ${e.problem.s}。` }),
      nStep(1, { title: '有幾個', ask: '一共有幾次？', id: 'n', hints: ['數一數有幾個數。', '每一次都要算到。', '這是要平分成幾份。'],
        think: '老師數有幾個數。', together: '一起數：幾次？', figure: ctx => A.get('inAvg').planFigure(ctx),
        label: () => '一共有幾次？', ans: ctx => ctx.problem.n, say: e => `${e.problem.n} 次。` }),
      nStep(2, { title: '平分', ask: '合起來再平分。', id: 'avg', hints: ['平均＝合起來 ÷ 次數。', '把多的移給少的，變成一樣多。', '用除法。'],
        think: '老師把合起來的平分：總數 ÷ 次數。', together: '一起算：平均是多少？', pre: timesAid, figure: ctx => tapeSVG(Array.from({ length: ctx.problem.n }, () => ({ v: 1, label: '？' })), String(ctx.problem.s), { aria: `${ctx.problem.s} 平分成 ${ctx.problem.n} 份` }),
        label: () => '平均每次跳幾下？', ans: ctx => ctx.problem.avg, wrong: (ctx, v) => v === ctx.problem.s ? { obs: 'avgNoDivide', msg: '這是合起來的數，還要平分（÷ 次數）。' } : null, say: e => `${e.problem.s} ÷ ${e.problem.n} ＝ ${e.problem.avg}。` }),
      cStep(3, { title: '檢查', ask: '平均在最多和最少之間嗎？', id: 'mid', fixed: true, hints: ['找出最多和最少的數。', '平均不會比最多的多，也不會比最少的少。', '在中間才合理。'],
        think: '老師檢查：平均在最多和最少之間。', together: '一起檢查：合理嗎？', figure: ctx => A.get('inAvg').planFigure(ctx),
        q: ctx => `最少 ${Math.min(...ctx.problem.v)}、最多 ${Math.max(...ctx.problem.v)}，平均 ${ctx.problem.avg} 在中間嗎？`, opts: () => [['yes', '在中間，合理'], ['no', '不在中間']], ans: () => 'yes', wrong: () => ({ msg: '再比一次。' }), say: () => '在中間，合理。' })
    ],
    reasons: rWord, done: ctx => `平均每次跳 ${ctx.problem.avg} 下。`, chant: '平均：全部合起來，再平分給每一份。', transfer: '想一想：考試 3 次是 80、90、100 分，平均幾分？'
  });

  // =============== 10-3 分配律簡算（R-5-2） ===============
  A.register('inDistrib', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      if (i % 2 === 0) { const x = rnd(rand, 150, 450), y = rnd(rand, 100, 400), k = rnd(rand, 2, level === 'easy' ? 5 : 9); return { kind: 'set', x, y, k, p: `制服上衣一件 ${x} 元，褲子一件 ${y} 元。買 ${k} 套，一共多少元？`, a: `(${x} ＋ ${y}) × ${k}`, b: `${x} × ${k} ＋ ${y} × ${k}`, part: [`${x} ＋ ${y}`, x + y], v: (x + y) * k, dims: [x, y, k, 0], prompt: `制服上衣一件 ${x} 元，褲子一件 ${y} 元。買 ${k} 套，一共多少元？` }; }
      const near = any(rand, [99, 98, 101, 199, 999]), k = rnd(rand, 3, 9), base = Math.round(near / 100) * 100, d = near - base;
      return { kind: 'near', near, k, base, d, p: `一張門票 ${near} 元，買 ${k} 張，一共多少元？`, a: `${near} × ${k}`, b: `${base} × ${k} ${d < 0 ? '－' : '＋'} ${Math.abs(d)} × ${k}`, part: [`${base} × ${k}`, base * k], v: near * k, dims: [near, k, 1], prompt: `一張門票 ${near} 元，買 ${k} 張，一共多少元？想一想怎麼算比較快。` }; },
    planFigure: () => '',
    steps: [
      cStep(0, { title: '兩種算法', ask: '哪一個和題目的算式一樣大？', id: 'same', hints: ['一套一套買，和上衣、褲子分開買，錢一樣。', '99 ＝ 100 － 1。', '每一個數都要乘到。'],
        think: '老師想：兩種算法的錢一樣多。', together: '一起選：哪一個一樣大？', pre: prompt,
        q: ctx => `${ctx.problem.a} 和哪一個一樣大？`, opts: ctx => { const p = ctx.problem; return uniq(p.kind === 'set' ? [['ok', p.b], ['bad', `${p.x} × ${p.k} ＋ ${p.y}`]] : [['ok', p.b], ['bad', `${p.base} × ${p.k} ${p.d < 0 ? '－' : '＋'} ${Math.abs(p.d)}`]]); },
        ans: () => 'ok', wrong: () => ({ obs: 'distribMiss', msg: '每一個數都要乘到，不能只乘一個。' }), say: e => `${e.problem.a} ＝ ${e.problem.b}。` }),
      nStep(1, { title: '先算好算的', ask: '先算那一段。', id: 'part', hints: ['一套多少錢？或 100 乘幾？', '整百乘一位數：先乘再補 0。', '寫下來。'],
        think: '老師先算好算的那一段。', together: '一起算：是多少？', pre: timesAid, figure: ctx => big(esc(ctx.problem.kind === 'set' ? ctx.problem.a : ctx.problem.b)),
        label: ctx => `${ctx.problem.part[0]} ＝ ？`, ans: ctx => ctx.problem.part[1], say: e => `${e.problem.part[0]} ＝ ${e.problem.part[1]}。` }),
      nStep(2, { title: '算出答案', ask: '一共多少元？', id: 'v', hints: ['用上一步的答案再算。', '多算的要減回來，少算的要加上。', '寫出答案。'],
        think: '老師算出答案。', together: '一起算：一共多少？', figure: ctx => big(esc(ctx.problem.kind === 'set' ? ctx.problem.a : ctx.problem.b)),
        label: () => '一共多少元？', ans: ctx => ctx.problem.v, wrong: (ctx, v) => ctx.problem.kind === 'near' && v === ctx.problem.base * ctx.problem.k + ctx.problem.d ? { obs: 'distribMiss', msg: `每一張都差 ${Math.abs(ctx.problem.d)} 元，要乘 ${ctx.problem.k}。` } : ctx.problem.kind === 'set' && v === ctx.problem.x * ctx.problem.k + ctx.problem.y ? { obs: 'distribMiss', msg: '褲子也要乘套數。' } : null, say: e => `一共 ${e.problem.v} 元。` })
    ],
    reasons: [['two', '比一比兩種算法'], ['easy', '先算好算的'], ['hint', '看提示']], done: ctx => `${ctx.problem.a} ＝ ${ctx.problem.b} ＝ ${ctx.problem.v}。`, chant: '分配律：一套一套算，和分開算再加起來，一樣多。', transfer: '想一想：98 × 5 怎麼算比較快？'
  });
})();

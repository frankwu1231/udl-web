'use strict';
// 第 34 版：各教材包的跨領域生活單元（一）：面積單元 5「家裡的小設計師」、表面積單元 4「包裝小達人」。
// 共用「生活決策五步」：看情境 → 找出要算什麼 → 選方法 → 算出來 → 檢查合不合理、做決定（核心活動 5-2、4-3 照這五步）。
// 跨領域代碼依 Codex 查證（108 特需課綱、綜合活動領綱、環境教育議題原文）；找不到貼切條目的活動只標數學代碼。
// 人名、店名、尺寸都是虛構的練習資料。
(() => {
  const A = window.areaActs, U = A.util, { esc, num, fieldHtml, gridSVG, rectCells } = U;
  const rnd = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
  const any = (rand, list) => list[Math.floor(rand() * list.length)];
  const lv = (level, o) => o[level] || o.standard;

  // ---------- 步驟的小工具（和 act-time.js、act-frac.js 同一個寫法） ----------
  // 填數字的一步：o.label(ctx)、o.ans(ctx)、o.wrong(ctx, v) → {obs, msg}
  const nStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${fieldHtml(ctx, o.id, o.label(ctx), n)}`,
    check: ctx => { const v = num(ctx.answers[o.id]); if (v === null) return { code: o.id, msg: '把數填進去。' }; if (Math.abs(v - o.ans(ctx)) < 1e-9) return null;
      const w = o.wrong ? o.wrong(ctx, v) : null; return { code: o.id, obs: (w && w.obs) || 'other', msg: (w && w.msg) || o.retry || '再算一次。' }; },
    solve: ctx => { ctx.answers[o.id] = String(o.ans(ctx)); }, say: o.say });
  // 選一個的一步：o.q(ctx)、o.opts(ctx)、o.ans(ctx)、o.wrong(ctx, a) → {obs, msg}
  const cStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${ctx.choice(o.id, o.q(ctx), o.opts(ctx), o.fixed)}`,
    check: ctx => { const a = ctx.answers[o.id]; if (!a) return { code: o.id, msg: '先選一個答案。' }; if (a === o.ans(ctx)) return null;
      const w = o.wrong ? o.wrong(ctx, a) : null; return { code: o.id, obs: (w && w.obs) || 'wrongChoice', msg: (w && w.msg) || o.retry || '再想一想。' }; },
    solve: ctx => { ctx.answers[o.id] = o.ans(ctx); }, say: o.say });
  const prompt = ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`;
  const shown = (ctx, n) => ctx.hint(n) >= 2 || ctx.checked(n);
  const methods = [['mark', '🏠 生活決策五步'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['goal', '先想要做什麼'], ['check', '算完檢查合不合理'], ['hint', '看提示']];
  const ceilDiv = (a, b) => Math.ceil(a / b);
  // 買幾包、幾罐、幾捲：最後不夠一包的也要多買一包
  const packWrong = (need, k) => (ctx, v) => need % k && v === Math.floor(need / k) ? { obs: 'roundDown', msg: `剩下的 ${need % k} 也要用到，不夠一包也要多買一包。` } : null;
  const enoughOpts = [['just', '剛好夠'], ['more', '夠，還會多出一些'], ['short', '不夠']];
  const enoughAns = (have, need) => have === need ? 'just' : have > need ? 'more' : 'short';

  // 長方形（方格）圖：w × h 格，每格 1 平方公尺；o.cls 顏色、o.label 寫邊長
  const lenTxt = (x, y, t, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="ac-len">${esc(t)}</text>`;
  function roomSVG(w, h, o = {}) {
    const u = Math.max(18, Math.min(40, 300 / Math.max(w, h)));
    const extra = (o.labels === false ? '' : lenTxt(w * u / 2, -8, `${w} 公尺`) + lenTxt(-8, h * u / 2 + 5, `${h} 公尺`, 'end')) + (o.extra || '');
    return gridSVG({ cols: w, rows: h, u, lines: o.lines !== false, cells: o.fill ? rectCells(w, h).map(([x, y]) => ({ x, y, cls: o.cls || 'ac-fill' })) : [], outline: `M0 0H${w * u}V${h * u}H0Z`, extra, pad: 60, aria: o.aria || `長 ${w} 公尺、寬 ${h} 公尺的長方形` });
  }
  // 兩個房間並排（A 藍、B 橘）
  function twoRoomsSVG(p, fill) {
    const u = Math.max(16, Math.min(34, 280 / (p.a + p.c + 2), 200 / Math.max(p.b, p.d))), gap = 2;
    const cells = fill ? [...rectCells(p.a, p.b).map(([x, y]) => ({ x, y, cls: 'ac-a' })), ...rectCells(p.c, p.d, p.a + gap).map(([x, y]) => ({ x, y, cls: 'ac-b' }))] : [];
    const ol = `M0 0H${p.a * u}V${p.b * u}H0ZM${(p.a + gap) * u} 0H${(p.a + gap + p.c) * u}V${p.d * u}H${(p.a + gap) * u}Z`;
    const extra = lenTxt(p.a * u / 2, -8, `A：${p.a} × ${p.b}`) + lenTxt((p.a + gap + p.c / 2) * u, -8, `B：${p.c} × ${p.d}`);
    return gridSVG({ cols: p.a + gap + p.c, rows: Math.max(p.b, p.d), u, lines: false, cells, outline: ol, extra, pad: 40, aria: `A 房間長 ${p.a} 公尺、寬 ${p.b} 公尺；B 房間長 ${p.c} 公尺、寬 ${p.d} 公尺` });
  }

  // =============== 面積 5-2 鋪地墊要幾包（核心：生活決策五步） ===============
  const MAT_CTX = [['閱讀角', '巧拼地墊'], ['遊戲區', '軟墊'], ['和室', '榻榻米墊'], ['教室後面的空地', '巧拼地墊']];
  function makeMat(level, i, rand = Math.random) {
    const c = MAT_CTX[(i + rnd(rand, 0, 3)) % MAT_CTX.length];
    let w, h, k;
    do { w = rnd(rand, ...lv(level, { easy: [2, 5], standard: [3, 8], challenge: [4, 9] })); h = rnd(rand, ...lv(level, { easy: [2, 4], standard: [2, 6], challenge: [3, 8] })); k = any(rand, lv(level, { easy: [4, 5], standard: [4, 6, 8], challenge: [6, 8, 10] })); }
    while (w === h || 2 * (w + h) === w * h || (level !== 'easy' && (w * h) % k === 0 && i % 3 !== 0));
    const need = w * h, packs = ceilDiv(need, k);
    return { c, w, h, k, need, packs, have: packs * k, dims: [w, h, k], prompt: `${c[0]}是長方形，長 ${w} 公尺、寬 ${h} 公尺。要鋪滿${c[1]}，一塊地墊是邊長 1 公尺的正方形，一包有 ${k} 塊。至少要買幾包？` };
  }
  A.register('arMat', { draft: true,
    methods, makeProblem: makeMat, planFigure: ctx => roomSVG(ctx.problem.w, ctx.problem.h),
    steps: [
      cStep(0, { title: '要做什麼', ask: '鋪地墊要算什麼？', id: 'goal', fixed: true, hints: ['地墊要放在哪裡？邊上，還是整個地上？', '鋪滿整個地上，是看裡面有多大。', '「鋪滿」和「圍一圈」不一樣。'],
        think: '老師讀題目：地墊要鋪滿整個地上，所以要看裡面有多大，是面積。', together: '一起想：要算什麼？', pre: prompt, figure: ctx => roomSVG(ctx.problem.w, ctx.problem.h),
        q: () => '鋪地墊要算什麼？', opts: () => [['area', '鋪滿地上：算面積'], ['per', '沿著邊圍一圈：算周長']], ans: () => 'area',
        wrong: () => ({ obs: 'chosePerimeter', msg: '地墊要鋪滿整個地上，不是沿著邊走一圈。' }), say: () => '要鋪滿，算面積。' }),
      nStep(1, { title: '要幾塊地墊', ask: '一塊 1 平方公尺，要幾塊？', id: 'need', hints: ['一塊地墊是 1 平方公尺。', '鋪滿要幾塊，就是面積有幾平方公尺。', '長方形面積 ＝ 長 × 寬。'],
        think: '老師算面積：長 × 寬，就是要幾塊地墊。', together: '一起算：要幾塊？', figure: ctx => roomSVG(ctx.problem.w, ctx.problem.h, { fill: shown(ctx, 1) }),
        label: () => '鋪滿要幾塊地墊？', ans: ctx => ctx.problem.need,
        wrong: (ctx, v) => { const p = ctx.problem; return v === 2 * (p.w + p.h) ? { obs: 'eqPerimeter', msg: '這是繞一圈的長度。地墊要鋪滿裡面。' } : v === p.w + p.h ? { obs: 'eqSum', msg: '長和寬要相乘，不是相加。' } : null; },
        say: ex => `${ex.problem.w} × ${ex.problem.h} ＝ ${ex.problem.need}，要 ${ex.problem.need} 塊。` }),
      cStep(2, { title: '選方法', ask: '一包幾塊，要怎麼算包數？', id: 'how', fixed: true, hints: ['一包有好幾塊。', '看要幾塊裡面有幾個「一包」。', '分完不夠一包的，也要多買一包。'],
        think: '老師想：要幾塊 ÷ 一包幾塊；有剩的話，要多買一包。', together: '一起選：怎麼算包數？',
        q: ctx => `要 ${ctx.problem.need} 塊，一包 ${ctx.problem.k} 塊。要怎麼算買幾包？`, opts: ctx => [['div', `${ctx.problem.need} ÷ ${ctx.problem.k}，有剩就多買一包`], ['mul', `${ctx.problem.need} × ${ctx.problem.k}`], ['sub', `${ctx.problem.need} － ${ctx.problem.k}`]], ans: () => 'div',
        wrong: () => ({ msg: '一包有好幾塊，要看裡面有幾個「一包」：用除的。' }), say: ex => `${ex.problem.need} ÷ ${ex.problem.k}，有剩就多買一包。` }),
      nStep(3, { title: '算出來', ask: '至少要買幾包？', id: 'packs', hints: ['算算看：要幾塊 ÷ 一包幾塊。', '有餘數的話，剩下的地墊也要鋪。', '不夠一包也要多買一包。'],
        think: '老師算除法，看有沒有剩：有剩就多買一包。', together: '一起算：買幾包？',
        label: () => '至少要買幾包？', ans: ctx => ctx.problem.packs, wrong: (ctx, v) => packWrong(ctx.problem.need, ctx.problem.k)(ctx, v),
        say: ex => `要買 ${ex.problem.packs} 包。` }),
      cStep(4, { title: '檢查、做決定', ask: '買的地墊夠不夠？', id: 'enough', fixed: true, hints: ['買的包數 × 一包幾塊，一共有幾塊？', '和要幾塊比一比。', '多出來的可以留著，壞了可以換。'],
        think: '老師檢查：買的地墊一共幾塊，和要的比一比。', together: '一起檢查：夠不夠？',
        q: ctx => `買 ${ctx.problem.packs} 包，一共 ${ctx.problem.have} 塊。要 ${ctx.problem.need} 塊，夠不夠？`, opts: () => enoughOpts, ans: ctx => enoughAns(ctx.problem.have, ctx.problem.need),
        wrong: () => ({ msg: '比一比：買的塊數和要的塊數，哪一個多？' }), say: ex => ex.problem.have === ex.problem.need ? '剛好夠。' : `夠，還多 ${ex.problem.have - ex.problem.need} 塊。` })
    ],
    reasons, done: ctx => `鋪滿要 ${ctx.problem.need} 塊，買 ${ctx.problem.packs} 包。`, chant: '生活決策五步：看情境、找出要算什麼、選方法、算出來、檢查再決定。',
    transfer: '想一想：量一量教室的一個角落，要幾塊地墊才鋪得滿？'
  });

  // =============== 面積 5-3 貼邊條還是貼滿 ===============
  function makeBorder(level, i, rand = Math.random) {
    let a, b; do { a = rnd(rand, ...lv(level, { easy: [2, 5], standard: [3, 8], challenge: [4, 9] })); b = rnd(rand, ...lv(level, { easy: [2, 3], standard: [2, 5], challenge: [3, 7] })); } while (a <= b);
    const per = 2 * (a + b), area = a * b, roll = per + any(rand, [-4, -2, 2, 4, 6]);
    const where = any(rand, ['教室後面的公布欄', '走廊的海報牆', '班級菜園', '布置區']);
    return { a, b, per, area, roll, where, dims: [a, b], prompt: `${where}是長方形，長 ${a} 公尺、寬 ${b} 公尺。要沿著四周貼一圈彩色邊條，中間要貼滿壁報紙。` };
  }
  A.register('arBorder', { draft: true,
    methods, makeProblem: makeBorder, planFigure: ctx => roomSVG(ctx.problem.a, ctx.problem.b, { lines: false }),
    steps: [
      cStep(0, { title: '邊條要算什麼', ask: '邊條貼在哪裡？', id: 'k1', fixed: true, hints: ['邊條是貼在邊上，還是貼滿？', '沿著四周貼一圈，是一圈有多長。', '用手指沿著圖的邊走一圈，你量的是什麼？'],
        think: '老師想：邊條沿著四周貼一圈，要算周長。', together: '一起想：邊條要算什麼？', pre: prompt, figure: ctx => roomSVG(ctx.problem.a, ctx.problem.b, { lines: false }),
        q: () => '彩色邊條要算什麼？', opts: () => [['per', '沿著四周一圈：周長'], ['area', '貼滿中間：面積']], ans: () => 'per',
        wrong: () => ({ obs: 'choseArea', msg: '邊條只貼在四周的邊上，是一圈的長。' }), say: () => '邊條算周長。' }),
      nStep(1, { title: '邊條多長', ask: '四個邊都算了嗎？', id: 'per', hints: ['長方形有四個邊。', '兩個長、兩個寬。', '（長 ＋ 寬）× 2。'],
        think: '老師把四個邊加起來：兩個長、兩個寬。', together: '一起算：一圈幾公尺？', figure: ctx => roomSVG(ctx.problem.a, ctx.problem.b, { lines: false }),
        label: () => '邊條一共要幾公尺？', ans: ctx => ctx.problem.per,
        wrong: (ctx, v) => v === ctx.problem.area ? { obs: 'eqAreaValue', msg: '這是貼滿的面積。邊條是一圈的長。' } : v === ctx.problem.a + ctx.problem.b ? { obs: 'other', msg: '只算了兩個邊。四個邊都要貼。' } : null,
        say: ex => `（${ex.problem.a} ＋ ${ex.problem.b}）× 2 ＝ ${ex.problem.per} 公尺。` }),
      cStep(2, { title: '壁報紙要算什麼', ask: '壁報紙貼在哪裡？', id: 'k2', fixed: true, hints: ['壁報紙要貼滿中間。', '貼滿是看裡面有多大。', '把圖的中間塗滿顏色，塗到的是邊，還是裡面？'],
        think: '老師想：壁報紙要貼滿，算面積。', together: '一起想：壁報紙要算什麼？',
        q: () => '壁報紙要算什麼？', opts: () => [['per', '沿著四周一圈：周長'], ['area', '貼滿中間：面積']], ans: () => 'area',
        wrong: () => ({ obs: 'chosePerimeter', msg: '壁報紙要貼滿整面，是看裡面有多大。' }), say: () => '壁報紙算面積。' }),
      nStep(3, { title: '壁報紙多大', ask: '要幾平方公尺？', id: 'area', hints: ['長方形的面積。', '長 × 寬。', '單位是平方公尺。'],
        think: '老師算面積：長 × 寬。', together: '一起算：要幾平方公尺？', figure: ctx => roomSVG(ctx.problem.a, ctx.problem.b, { fill: shown(ctx, 3) }),
        label: () => '壁報紙要幾平方公尺？', ans: ctx => ctx.problem.area,
        wrong: (ctx, v) => v === ctx.problem.per ? { obs: 'eqPerimeter', msg: '這是一圈的長。壁報紙要貼滿裡面。' } : v === ctx.problem.a + ctx.problem.b ? { obs: 'eqSum', msg: '長和寬要相乘。' } : null,
        say: ex => `${ex.problem.a} × ${ex.problem.b} ＝ ${ex.problem.area} 平方公尺。` }),
      cStep(4, { title: '做決定', ask: '一捲邊條夠嗎？', id: 'roll', fixed: true, hints: ['比一比：一捲有多長、要貼多長。', '一捲比要貼的短，就不夠。', '不夠就要再買一捲。'],
        think: '老師比一比：一捲邊條的長和要貼的長。', together: '一起決定：一捲夠嗎？',
        q: ctx => `一捲邊條長 ${ctx.problem.roll} 公尺。要貼 ${ctx.problem.per} 公尺，一捲夠嗎？`, opts: () => [['ok', '夠，一捲就好'], ['buy', '不夠，要再買一捲']], ans: ctx => ctx.problem.roll >= ctx.problem.per ? 'ok' : 'buy',
        wrong: (ctx, a) => a === 'ok' && ctx.problem.roll === ctx.problem.area ? { obs: 'eqAreaValue', msg: '要和邊條的長比，不是和面積比。' } : { msg: '比一比：一捲的長和要貼的長。' }, say: ex => ex.problem.roll >= ex.problem.per ? '一捲就夠。' : '不夠，要再買一捲。' })
    ],
    reasons, done: ctx => `邊條 ${ctx.problem.per} 公尺（周長），壁報紙 ${ctx.problem.area} 平方公尺（面積）。`, chant: '貼一圈算周長，貼滿算面積。', transfer: '想一想：班上布置公布欄，你會先量什麼？'
  });

  // =============== 面積 5-4 哪個房間比較大 ===============
  function makeRoom(level, i, rand = Math.random) {
    const r = lv(level, { easy: [2, 6], standard: [3, 8], challenge: [3, 9] });
    let a, b, c, d;
    // 列出範圍內所有合格的組合再抽：面積不一樣；一般、挑戰還要「周長比較長的房間，面積反而比較小」
    const pool = [];
    for (let x = r[0]; x <= r[1]; x++) for (let y = 2; y <= x; y++) for (let z = r[0]; z <= r[1]; z++) for (let q = 2; q <= z; q++) {
      const dA = x * y - z * q, dP = (x + y) - (z + q);
      if (dA && (level === 'easy' || dA * dP < 0)) pool.push([x, y, z, q]);
    }
    [a, b, c, d] = pool.length ? pool[Math.floor(rand() * pool.length)] : [8, 2, 5, 4];
    const use = any(rand, ['遊戲室', '閱讀室', '社團教室']);
    return { a, b, c, d, A: a * b, B: c * d, big: a * b > c * d ? 'A' : 'B', use, dims: [a, b, c, d], prompt: `要選一間比較大的房間當${use}。A 房間長 ${a} 公尺、寬 ${b} 公尺；B 房間長 ${c} 公尺、寬 ${d} 公尺。哪一間的地板比較大？` };
  }
  A.register('arRoom', { draft: true,
    methods, makeProblem: makeRoom, planFigure: ctx => twoRoomsSVG(ctx.problem, false),
    steps: [
      cStep(0, { title: '要比什麼', ask: '地板比較大，是比什麼？', id: 'what', fixed: true, hints: ['地板大，是可以放東西的地方多。', '比裡面有多大，不是比邊有多長。', '想一想：鋪地墊時，看的是哪一個量？'],
        think: '老師想：地板比較大，是比面積。牆邊比較長不一定比較大。', together: '一起想：要比什麼？', pre: prompt, figure: ctx => twoRoomsSVG(ctx.problem, false),
        q: () => '要比兩個房間的什麼？', opts: () => [['area', '地板的面積'], ['per', '牆邊一圈的長（周長）'], ['long', '最長的那一邊']], ans: () => 'area',
        wrong: (ctx, a) => a === 'per' ? { obs: 'chosePerimeter', msg: '一圈比較長，地板不一定比較大。要比面積。' } : { msg: '最長的邊比較長，地板不一定比較大。要比面積。' }, say: () => '要比地板的面積。' }),
      nStep(1, { title: 'A 房間', ask: 'A 的地板幾平方公尺？', id: 'A', hints: ['A 房間是長方形。', '長 × 寬。', '單位是平方公尺。'],
        think: '老師先算 A 房間：長 × 寬。', together: '一起算：A 有多大？', figure: ctx => twoRoomsSVG(ctx.problem, shown(ctx, 1)),
        label: () => 'A 房間的地板是幾平方公尺？', ans: ctx => ctx.problem.A,
        wrong: (ctx, v) => v === 2 * (ctx.problem.a + ctx.problem.b) ? { obs: 'eqPerimeter', msg: '這是一圈的長，要算面積。' } : v === ctx.problem.a + ctx.problem.b ? { obs: 'eqSum', msg: '長和寬要相乘。' } : null, say: ex => `A：${ex.problem.a} × ${ex.problem.b} ＝ ${ex.problem.A} 平方公尺。` }),
      nStep(2, { title: 'B 房間', ask: 'B 的地板幾平方公尺？', id: 'B', hints: ['B 房間也是長方形。', '長 × 寬。', '單位是平方公尺。'],
        think: '老師再算 B 房間。', together: '一起算：B 有多大？', figure: ctx => twoRoomsSVG(ctx.problem, shown(ctx, 2)),
        label: () => 'B 房間的地板是幾平方公尺？', ans: ctx => ctx.problem.B,
        wrong: (ctx, v) => v === 2 * (ctx.problem.c + ctx.problem.d) ? { obs: 'eqPerimeter', msg: '這是一圈的長，要算面積。' } : v === ctx.problem.c + ctx.problem.d ? { obs: 'eqSum', msg: '長和寬要相乘。' } : null, say: ex => `B：${ex.problem.c} × ${ex.problem.d} ＝ ${ex.problem.B} 平方公尺。` }),
      cStep(3, { title: '做決定', ask: '選哪一間？', id: 'pick', fixed: true, hints: ['比一比兩個面積。', '面積大的地板比較大。', '回到題目：要選比較大的。'],
        think: '老師比一比兩個面積，選大的那一間。', together: '一起選：哪一間？',
        q: ctx => `A 是 ${ctx.problem.A} 平方公尺，B 是 ${ctx.problem.B} 平方公尺。要選哪一間當${ctx.problem.use}？`, opts: () => [['A', 'A 房間'], ['B', 'B 房間']], ans: ctx => ctx.problem.big,
        wrong: () => ({ msg: '要選面積比較大的那一間。' }), say: ex => `選 ${ex.problem.big} 房間。` })
    ],
    reasons, done: ctx => `A ${ctx.problem.A} 平方公尺、B ${ctx.problem.B} 平方公尺，選 ${ctx.problem.big} 房間。`, chant: '比大小要比面積；一圈比較長，不一定比較大。', transfer: '想一想：你家哪一個房間最大？怎麼知道？'
  });

  // =============== 面積 5-5 菜園分一分 ===============
  function makeGarden(level, i, rand = Math.random) {
    let w, h, k;
    do { w = rnd(rand, ...lv(level, { easy: [2, 6], standard: [4, 9], challenge: [6, 12] })); h = rnd(rand, ...lv(level, { easy: [2, 4], standard: [3, 6], challenge: [4, 8] })); k = any(rand, lv(level, { easy: [2, 3, 4], standard: [3, 4, 6], challenge: [4, 6, 8] })); }
    while ((w * h) % k || w * h / k < 2);
    const each = w * h / k, need = each + any(rand, [-2, -1, 1, 2]);
    return { w, h, k, area: w * h, each, need: Math.max(1, need), dims: [w, h, k], prompt: `學校菜園是長方形，長 ${w} 公尺、寬 ${h} 公尺。要平分給 ${k} 組，每組一樣大。每組分到幾平方公尺？` };
  }
  A.register('arGarden', { draft: true,
    methods, makeProblem: makeGarden, planFigure: ctx => roomSVG(ctx.problem.w, ctx.problem.h),
    steps: [
      nStep(0, { title: '菜園多大', ask: '整個菜園幾平方公尺？', id: 'area', hints: ['菜園是長方形。', '長 × 寬。', '單位是平方公尺。'],
        think: '老師先算整個菜園的面積。', together: '一起算：菜園有多大？', pre: prompt, figure: ctx => roomSVG(ctx.problem.w, ctx.problem.h, { fill: shown(ctx, 0) }),
        label: () => '整個菜園是幾平方公尺？', ans: ctx => ctx.problem.area,
        wrong: (ctx, v) => v === 2 * (ctx.problem.w + ctx.problem.h) ? { obs: 'eqPerimeter', msg: '這是一圈的長，要算面積。' } : v === ctx.problem.w + ctx.problem.h ? { obs: 'eqSum', msg: '長和寬要相乘。' } : null, say: ex => `${ex.problem.w} × ${ex.problem.h} ＝ ${ex.problem.area} 平方公尺。` }),
      nStep(1, { title: '每組多大', ask: '平分給幾組？', id: 'each', hints: ['平分：每組一樣大。', '整個面積 ÷ 組數。', '可以在方格上一組一組圈圈看。'],
        think: '老師把整個面積平分給每一組。', together: '一起分：每組幾平方公尺？',
        label: ctx => `平分給 ${ctx.problem.k} 組，每組幾平方公尺？`, ans: ctx => ctx.problem.each,
        wrong: (ctx, v) => v === ctx.problem.area * ctx.problem.k ? { msg: '平分要用除的。' } : null, say: ex => `${ex.problem.area} ÷ ${ex.problem.k} ＝ ${ex.problem.each} 平方公尺。` }),
      nStep(2, { title: '檢查', ask: '每組加起來，是整個菜園嗎？', id: 'back', hints: ['每組的面積 × 組數。', '要等於整個菜園。', '不一樣就再算一次。'],
        think: '老師檢查：每組 × 組數，要等於整個菜園。', together: '一起檢查：加起來是多少？',
        label: ctx => `${ctx.problem.k} 組加起來，一共幾平方公尺？`, ans: ctx => ctx.problem.area, say: ex => `${ex.problem.each} × ${ex.problem.k} ＝ ${ex.problem.area}，和整個菜園一樣。` }),
      cStep(3, { title: '做決定', ask: '種得下嗎？', id: 'fit', fixed: true, hints: ['比一比：每組分到的和需要的。', '分到的比需要的少，就種不下。', '種不下要想別的辦法。'],
        think: '老師比一比每組分到的和需要的。', together: '一起決定：種得下嗎？',
        q: ctx => `每組想種的菜，需要 ${ctx.problem.need} 平方公尺。每組分到 ${ctx.problem.each} 平方公尺，種得下嗎？`, opts: () => [['yes', '種得下'], ['no', '種不下，要少種一些']], ans: ctx => ctx.problem.each >= ctx.problem.need ? 'yes' : 'no',
        wrong: () => ({ msg: '比一比：分到的和需要的，哪一個大？' }), say: ex => ex.problem.each >= ex.problem.need ? '種得下。' : '種不下，要少種一些。' })
    ],
    reasons, done: ctx => `每組分到 ${ctx.problem.each} 平方公尺。`, chant: '平分面積：先算全部，再除以組數，最後乘回去檢查。', transfer: '想一想：學校的菜園或花圃，可以怎麼分給各班？'
  });

  // ---------- 表面積：盒子的圖 ----------
  const S = () => window.surfaceFig;
  const boxFig = (p, o = {}) => S().boxSVG({ l: p.l, w: p.w, h: p.h, cube: p.l === p.w && p.w === p.h }, { edges: ['l', 'w', 'h'], name: p.name, ...o });

  // =============== 表面積 4-3 包禮物要多少紙（核心：生活決策五步） ===============
  const PAPER = ['舊月曆紙', '舊海報', '舊包裝紙', '舊報紙'];
  function makeGift(level, i, rand = Math.random) {
    let l, w, h; const r = lv(level, { easy: [2, 6], standard: [3, 8], challenge: [4, 9] });
    if (level === 'easy' && i % 3 === 0) { l = w = h = rnd(rand, ...r); }
    else do { l = rnd(rand, ...r); w = rnd(rand, 2, r[1]); h = rnd(rand, 2, r[1]); } while (l === w && w === h);
    const half = l * w + l * h + w * h, surf = 2 * half, fold = any(rand, lv(level, { easy: [10], standard: [10, 20], challenge: [20, 30] })), need = surf + fold;
    // 三張回收紙：一張不夠、一張剛好夠或多一點、一張大很多
    const small = need - any(rand, [4, 6, 8, 10]), ok = need + any(rand, [0, 2, 4, 6]), large = ok + any(rand, [30, 40, 50]);
    const names = PAPER.slice().sort(() => rand() - 0.5);
    const papers = [[names[0], small], [names[1], ok], [names[2], large]].sort(() => rand() - 0.5);
    return { l, w, h, half, surf, fold, need, papers, best: names[1], vol: l * w * h, dims: [l, w, h, fold], prompt: `要包同學的生日禮物。盒子長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分。包的時候要多留 ${fold} 平方公分重疊的地方。家裡有幾張回收的紙，選哪一張最好？` };
  }
  A.register('sGift', { draft: true,
    methods: [['mark', '🎁 生活決策五步'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeGift, planFigure: ctx => boxFig(ctx.problem),
    steps: [
      cStep(0, { title: '要做什麼', ask: '包住盒子要算什麼？', id: 'goal', fixed: true, hints: ['包裝紙包在哪裡？裡面還是外面？', '包住外面所有的面。', '數一數盒子外面有幾個面，紙要蓋住它們。'],
        think: '老師想：包裝紙要包住盒子外面所有的面，是表面積。', together: '一起想：要算什麼？', pre: prompt, figure: ctx => boxFig(ctx.problem),
        q: () => '包住盒子要算什麼？', opts: () => [['surf', '外面所有的面：表面積'], ['vol', '裡面裝多少：體積'], ['one', '只算底下一個面']], ans: () => 'surf',
        wrong: (ctx, a) => a === 'vol' ? { obs: 'choseVolume', msg: '包裝紙包在外面，不是算裡面裝多少。' } : { obs: 'missFace', msg: '包裝紙要包住每一個面，不是只有底下。' }, say: () => '要算表面積。' }),
      nStep(1, { title: '三種面各一個', ask: '上面、前面、側面各一個加起來', id: 'half', hints: ['長方體有三種面，每種兩個。', '先算三種面各一個：長×寬、長×高、寬×高。', '三個加起來。'],
        think: '老師先算三種面各一個，再加起來。', together: '一起算：三種面各一個是多少？', figure: ctx => boxFig(ctx.problem, { colorAll: shown(ctx, 1) }),
        label: () => '三種面各一個，加起來是幾平方公分？', ans: ctx => ctx.problem.half,
        wrong: (ctx, v) => v === ctx.problem.vol ? { obs: 'eqVolume', msg: '這是長 × 寬 × 高（體積）。要算面的面積再加起來。' } : v === ctx.problem.l * ctx.problem.w ? { obs: 'eqOneFace', msg: '這只是一個面。三種面都要算。' } : null,
        say: ex => `${ex.problem.l * ex.problem.w} ＋ ${ex.problem.l * ex.problem.h} ＋ ${ex.problem.w * ex.problem.h} ＝ ${ex.problem.half}。` }),
      nStep(2, { title: '算出表面積', ask: '每種面有兩個', id: 'surf', hints: ['對面一樣大。', '每種面都有兩個。', '三種面各一個的和 × 2。'],
        think: '老師想：每種面都有兩個，所以 × 2。', together: '一起算：表面積是多少？',
        label: () => '盒子的表面積是幾平方公分？', ans: ctx => ctx.problem.surf,
        wrong: (ctx, v) => v === ctx.problem.half ? { obs: 'eqHalf', msg: '每種面有兩個，要 × 2。' } : v === ctx.problem.vol ? { obs: 'eqVolume', msg: '這是體積。' } : null, say: ex => `${ex.problem.half} × 2 ＝ ${ex.problem.surf} 平方公分。` }),
      nStep(3, { title: '加上重疊', ask: '包的時候要多留一點', id: 'need', hints: ['包裝紙會重疊。', '表面積再加上要多留的。', '題目說要多留幾平方公分？'],
        think: '老師把表面積加上要多留的重疊部分。', together: '一起算：至少要多大的紙？',
        label: () => '至少要幾平方公分的紙？', ans: ctx => ctx.problem.need,
        wrong: (ctx, v) => v === ctx.problem.surf ? { msg: '別忘了重疊的地方。' } : null, say: ex => `${ex.problem.surf} ＋ ${ex.problem.fold} ＝ ${ex.problem.need} 平方公分。` }),
      cStep(4, { title: '檢查、做決定', ask: '選哪一張紙最好？', id: 'paper', fixed: true, hints: ['先看哪幾張夠大。', '不夠大的不能用。', '夠大的裡面，選最小的那一張，最不浪費。'],
        think: '老師先把不夠大的拿掉，再從夠大的裡面選最小的，最不浪費。', together: '一起選：哪一張最好？',
        q: ctx => `至少要 ${ctx.problem.need} 平方公分。選哪一張最好？`, opts: ctx => ctx.problem.papers.map(([n, a]) => [n, `${n}（${a} 平方公分）`]), ans: ctx => ctx.problem.best,
        wrong: (ctx, a) => { const x = ctx.problem.papers.find(q => q[0] === a); return x && x[1] < ctx.problem.need ? { msg: '這張不夠大，包不住。' } : { msg: '這張夠大，可是還有更小、也夠用的，比較不浪費。' }; },
        say: ex => `選${ex.problem.best}。` })
    ],
    reasons, done: ctx => `表面積 ${ctx.problem.surf} 平方公分，加重疊至少 ${ctx.problem.need} 平方公分，選${ctx.problem.best}。`, chant: '包禮物：看外面所有的面，算表面積，加上重疊，選夠用又不浪費的紙。',
    transfer: '想一想：家裡有哪些回收的紙可以拿來包禮物？'
  });

  // =============== 表面積 4-4 房間四面牆要漆多少 ===============
  function makePaint(level, i, rand = Math.random) {
    const l = rnd(rand, ...lv(level, { easy: [3, 5], standard: [3, 6], challenge: [4, 8] })), w = rnd(rand, 3, l);
    const h = lv(level, { easy: 2, standard: 3, challenge: 3 }), door = 2, win = any(rand, lv(level, { easy: [0, 2], standard: [2, 4], challenge: [4, 6] }));
    const walls = 2 * (l + w) * h, paint = walls - door - win, can = any(rand, lv(level, { easy: [5, 10], standard: [10], challenge: [8, 10, 12] }));
    return { l, w, h, door, win, walls, paint, can, cans: ceilDiv(paint, can), full: 2 * (l * w + l * h + w * h), dims: [l, w, h, win, can], prompt: `教室旁邊的小房間長 ${l} 公尺、寬 ${w} 公尺、高 ${h} 公尺。要漆四面牆，天花板和地板不漆。門有 ${door} 平方公尺${win ? `，窗戶有 ${win} 平方公尺` : ''}，門窗不漆。一罐油漆可以漆 ${can} 平方公尺，要買幾罐？` };
  }
  A.register('sPaint', { draft: true,
    methods, makeProblem: makePaint, planFigure: ctx => S().boxSVG({ l: ctx.problem.l, w: ctx.problem.w, h: ctx.problem.h }, {}).replace(/公分/g, '公尺'),
    steps: [
      cStep(0, { title: '哪些面要漆', ask: '六個面都要漆嗎？', id: 'faces', fixed: true, hints: ['房間像一個長方體。', '題目說天花板和地板不漆。', '只剩前、後、左、右四面牆。'],
        think: '老師想：房間像長方體，天花板和地板不漆，只漆四面牆。', together: '一起想：哪些面要漆？', pre: prompt,
        figure: ctx => S().boxSVG({ l: ctx.problem.l, w: ctx.problem.w, h: ctx.problem.h }, { edges: ['l', 'w', 'h'] }).replace(/公分/g, '公尺'),
        q: () => '要漆哪些面？', opts: () => [['walls', '前、後、左、右四面牆'], ['six', '六個面全部'], ['floor', '只有地板']], ans: () => 'walls',
        wrong: (ctx, a) => a === 'six' ? { obs: 'other', msg: '天花板和地板不漆。' } : { obs: 'missFace', msg: '要漆的是牆，地板不漆。' }, say: () => '只漆四面牆。' }),
      nStep(1, { title: '四面牆多大', ask: '兩面長牆、兩面短牆', id: 'walls', hints: ['長牆：長 × 高，有兩面。', '短牆：寬 × 高，有兩面。', '四面加起來。'],
        think: '老師算兩面長牆和兩面短牆，再加起來。', together: '一起算：四面牆幾平方公尺？',
        label: () => '四面牆一共幾平方公尺？', ans: ctx => ctx.problem.walls,
        wrong: (ctx, v) => v === ctx.problem.full ? { msg: '天花板和地板不漆，不要算進去。' } : v === ctx.problem.l * ctx.problem.w * ctx.problem.h ? { obs: 'eqVolume', msg: '這是長 × 寬 × 高（體積）。要算牆的面積。' } : v === ctx.problem.walls / 2 ? { obs: 'eqHalf', msg: '長牆和短牆都各有兩面。' } : null,
        say: ex => `（${ex.problem.l} × ${ex.problem.h} ＋ ${ex.problem.w} × ${ex.problem.h}）× 2 ＝ ${ex.problem.walls} 平方公尺。` }),
      nStep(2, { title: '扣掉門窗', ask: '門窗不用漆', id: 'paint', hints: ['門窗不漆，要扣掉。', '四面牆 － 門 － 窗。', '沒有窗戶就只扣門。'],
        think: '老師把門窗扣掉，剩下的才要漆。', together: '一起算：要漆幾平方公尺？',
        label: () => '真正要漆幾平方公尺？', ans: ctx => ctx.problem.paint,
        wrong: (ctx, v) => v === ctx.problem.walls ? { msg: '門窗不漆，要扣掉。' } : v === ctx.problem.walls + ctx.problem.door + ctx.problem.win ? { msg: '門窗要扣掉，不是加上去。' } : null, say: ex => `${ex.problem.walls} － ${ex.problem.door + ex.problem.win} ＝ ${ex.problem.paint} 平方公尺。` }),
      nStep(3, { title: '要買幾罐', ask: '不夠一罐也要多買嗎？', id: 'cans', hints: ['要漆的面積 ÷ 一罐可以漆多少。', '有剩下的牆也要漆。', '不夠一罐也要多買一罐。'],
        think: '老師算除法，有剩就多買一罐。', together: '一起算：買幾罐？',
        label: () => '至少要買幾罐油漆？', ans: ctx => ctx.problem.cans, wrong: (ctx, v) => packWrong(ctx.problem.paint, ctx.problem.can)(ctx, v), say: ex => `要買 ${ex.problem.cans} 罐。` })
    ],
    reasons, done: ctx => `四面牆 ${ctx.problem.walls} 平方公尺，扣掉門窗要漆 ${ctx.problem.paint} 平方公尺，買 ${ctx.problem.cans} 罐。`, chant: '漆房間：先看哪些面要漆，算面積，扣掉門窗，再算要買幾罐。', transfer: '想一想：教室的牆如果要重新漆，要先量哪些地方？'
  });

  // =============== 表面積 4-5 哪一種包法最省紙 ===============
  // 幾盒一樣的正方體盒子排在一起包：排法不同，體積一樣，表面積不一樣
  const SAVE = { 4: [[4, 1, 1], [2, 2, 1]], 6: [[6, 1, 1], [3, 2, 1]], 8: [[4, 2, 1], [2, 2, 2]] };
  function makeSave(level, i, rand = Math.random) {
    const n = any(rand, lv(level, { easy: [4], standard: [4, 8], challenge: [6, 8] })); let e = 2;
    const ways = SAVE[n].slice(), pickW = ways.length > 2 ? [ways[0], ways[1 + Math.floor(rand() * 2)]] : ways;
    const [x, y] = rand() < 0.5 ? pickW : [pickW[1], pickW[0]];
    e = Math.max(1, Math.min(e, Math.floor(9 / Math.max(...x, ...y))));   // 排好的長、寬、高都在 9 公分以內（九九範圍）；6 個排一排時只能用 1 公分的小積木
    const sa = d => 2 * (d[0] * d[1] + d[0] * d[2] + d[1] * d[2]) * e * e, A1 = sa(x), B1 = sa(y);
    const toDim = d => ({ l: d[0] * e, w: d[1] * e, h: d[2] * e, name: e === 1 ? '小積木排成的長方體' : '' });
    return { n, e, a: toDim(x), b: toDim(y), A: A1, B: B1, best: A1 < B1 ? 'A' : 'B', dims: [n, e, ...x, ...y], prompt: `${e === 1 ? `美勞課要把 ${n} 個邊長 1 公分的正方體小積木黏成一個長方體，再用色紙包起來。` : `園遊會要把 ${n} 盒餅乾包成一大包。每一盒都是邊長 ${e} 公分的正方體。`}A 排法：長 ${toDim(x).l}、寬 ${toDim(x).w}、高 ${toDim(x).h} 公分；B 排法：長 ${toDim(y).l}、寬 ${toDim(y).w}、高 ${toDim(y).h} 公分。哪一種${e === 1 ? '排法' : '包法'}比較省紙？` };
  }
  const sa3 = d => 2 * (d.l * d.w + d.l * d.h + d.w * d.h);
  A.register('sSave', { draft: true,
    methods, makeProblem: makeSave, planFigure: ctx => `<div class="lf-pair"><div><p class="lf-tag">A</p>${boxFig(ctx.problem.a)}</div><div><p class="lf-tag">B</p>${boxFig(ctx.problem.b)}</div></div>`,
    steps: [
      cStep(0, { title: '要比什麼', ask: '要省紙，該看哪裡？', id: 'what', fixed: true, hints: ['兩種排法用的個數一樣。', '一樣多個、一樣大的正方體，體積一樣。', '紙包住的是排好以後的裡面，還是外面？'],
        think: '老師想：正方體一樣多、一樣大，體積一樣；紙包住的是排好以後的外面，要比表面積。', together: '一起想：要比什麼？', pre: prompt, figure: ctx => A.get('sSave').planFigure(ctx),
        q: () => '比哪一種比較省紙，要比什麼？', opts: () => [['surf', '外面的表面積'], ['vol', '占多少空間（體積）'], ['long', '哪一種比較長']], ans: () => 'surf',
        wrong: (ctx, a) => a === 'vol' ? { obs: 'choseVolume', msg: '正方體一樣多、一樣大，體積一樣。紙要看排好以後的外面。' } : { msg: '比較長不一定比較費紙，要算表面積。' }, say: () => '要比表面積。' }),
      nStep(1, { title: 'A 的表面積', ask: 'A 排法要多少紙？', id: 'A', hints: ['A 是一個長方體。', '三種面各一個加起來，再 × 2。', '看清楚 A 的長、寬、高。'],
        think: '老師算 A 這個長方體的表面積。', together: '一起算：A 的表面積？', figure: ctx => boxFig(ctx.problem.a, { colorAll: shown(ctx, 1) }),
        label: () => 'A 排法的表面積是幾平方公分？', ans: ctx => ctx.problem.A,
        wrong: (ctx, v) => v === ctx.problem.A / 2 ? { obs: 'eqHalf', msg: '每種面有兩個，要 × 2。' } : v === ctx.problem.a.l * ctx.problem.a.w * ctx.problem.a.h ? { obs: 'eqVolume', msg: '這是體積。' } : null, say: ex => `A 是 ${ex.problem.A} 平方公分。` }),
      nStep(2, { title: 'B 的表面積', ask: 'B 排法要多少紙？', id: 'B', hints: ['B 也是一個長方體。', '三種面各一個加起來，再 × 2。', '看清楚 B 的長、寬、高。'],
        think: '老師再算 B 的表面積。', together: '一起算：B 的表面積？', figure: ctx => boxFig(ctx.problem.b, { colorAll: shown(ctx, 2) }),
        label: () => 'B 排法的表面積是幾平方公分？', ans: ctx => ctx.problem.B,
        wrong: (ctx, v) => v === ctx.problem.B / 2 ? { obs: 'eqHalf', msg: '每種面有兩個，要 × 2。' } : v === ctx.problem.b.l * ctx.problem.b.w * ctx.problem.b.h ? { obs: 'eqVolume', msg: '這是體積。' } : null, say: ex => `B 是 ${ex.problem.B} 平方公分。` }),
      cStep(3, { title: '做決定', ask: '哪一種比較省紙？', id: 'pick', fixed: true, hints: ['比一比兩個表面積。', '表面積小的，用的紙比較少。', '排得越「方」，通常越省紙。'],
        think: '老師比一比：表面積小的比較省紙，也比較環保。', together: '一起選：哪一種省紙？',
        q: ctx => `A 要 ${ctx.problem.A} 平方公分，B 要 ${ctx.problem.B} 平方公分。哪一種比較省紙？`, opts: () => [['A', 'A 排法'], ['B', 'B 排法']], ans: ctx => ctx.problem.best,
        wrong: () => ({ msg: '表面積比較小的，用的紙比較少。' }), say: ex => `${ex.problem.best} 排法比較省紙。` })
    ],
    reasons, done: ctx => `A ${ctx.problem.A}、B ${ctx.problem.B} 平方公分，${ctx.problem.best} 比較省紙。`, chant: '一樣多的東西，排得越方越省紙；省紙就是減少垃圾。', transfer: '想一想：買東西時，怎樣可以減少包裝？'
  });

  // =============== 表面積 4-6 罐子的標籤紙 ===============
  function makeLabel(level, i, rand = Math.random) {
    const h = any(rand, lv(level, { easy: [5, 6, 8], standard: [6, 7, 8, 9], challenge: [6, 8, 9] }));
    if (level === 'challenge') { const d = any(rand, [4, 5, 6]), C = Math.round(3.14 * d * 100) / 100; return { d, C, h, area: Math.round(C * h * 100) / 100, dia: true, dims: [d, h], prompt: `做果醬罐的標籤，要剛好繞罐子一圈。罐子的直徑是 ${d} 公分，高 ${h} 公分（圓周率用 3.14）。標籤紙要幾平方公分？` }; }
    const C = any(rand, lv(level, { easy: [10, 12, 15, 20], standard: [18, 20, 24, 25, 30] }));
    return { C, h, area: C * h, dia: false, dims: [C, h], prompt: `做筆筒的標籤，要剛好繞罐子一圈。用繩子量，罐子一圈長 ${C} 公分，罐子高 ${h} 公分。標籤紙要幾平方公分？` };
  }
  A.register('sLabel', { draft: true,
    methods, makeProblem: makeLabel,
    planFigure: ctx => `<p class="fm-big" aria-label="罐子和攤開的標籤紙">🥫 → ▭</p>`,
    steps: [
      cStep(0, { title: '打開是什麼形狀', ask: '標籤紙攤開是什麼形狀？', id: 'shape', fixed: true, hints: ['想像把罐子上的標籤撕下來攤平。', '圓柱的側面攤開。', '看攤平的紙：有幾個角？邊是直的還是彎的？'],
        think: '老師想：把標籤從罐子上撕下來攤平，是一個長方形。', together: '一起想：攤開是什麼形狀？', pre: prompt, figure: ctx => A.get('sLabel').planFigure(ctx),
        q: () => '標籤紙攤開是什麼形狀？', opts: () => [['rect', '長方形'], ['circle', '圓形'], ['tri', '三角形']], ans: () => 'rect',
        wrong: () => ({ msg: '圓形是罐子的蓋子和底。標籤繞側面一圈，攤開是長方形。' }), say: () => '攤開是長方形。' }),
      nStep(1, { title: '長方形的長', ask: '繞一圈的長是多少？', id: 'C', hints: ['標籤要繞罐子一圈。', '長方形的長，就是罐子一圈的長。', '題目給一圈的長就直接用；只給直徑時，直徑 × 3.14 是一圈的長。'],
        think: '老師想：長方形的長，就是罐子一圈的長。', together: '一起想：長是多少？',
        label: () => '標籤（長方形）的長是幾公分？', ans: ctx => ctx.problem.C,
        wrong: (ctx, v) => ctx.problem.dia && v === ctx.problem.d ? { msg: '直徑是直直穿過圓的長，一圈要 × 3.14。' } : v === ctx.problem.h ? { msg: '這是罐子的高。長是繞一圈的長。' } : null, say: ex => `長是 ${ex.problem.C} 公分。` }),
      cStep(2, { title: '長方形的寬', ask: '寬是哪一個長度？', id: 'wide', fixed: true, hints: ['長方形有長和寬，長已經是繞一圈的長。', '把標籤捲回罐子上，看另一條邊。', '捲回去時，哪一條邊沿著罐子上下延伸？'],
        think: '老師想：長方形的寬，就是罐子的高。', together: '一起想：寬是多少？',
        q: () => '長方形的寬是什麼？', opts: ctx => [['h', `罐子的高 ${ctx.problem.h} 公分`], ['c', `一圈的長 ${ctx.problem.C} 公分`]], ans: () => 'h', wrong: () => ({ msg: '一圈的長已經是長了。寬是罐子的高。' }), say: ex => `寬是 ${ex.problem.h} 公分。` }),
      nStep(3, { title: '算出來', ask: '長方形的面積', id: 'area', hints: ['長方形面積 ＝ 長 × 寬。', '長是一圈的長，寬是高。', '單位是平方公分。'],
        think: '老師算長方形的面積：長 × 寬。', together: '一起算：標籤紙多大？',
        label: () => '標籤紙要幾平方公分？', ans: ctx => ctx.problem.area,
        wrong: (ctx, v) => v === ctx.problem.C + ctx.problem.h ? { obs: 'eqSum', msg: '長和寬要相乘。' } : null, say: ex => `${ex.problem.C} × ${ex.problem.h} ＝ ${ex.problem.area} 平方公分。` })
    ],
    reasons, done: ctx => `標籤紙是長 ${ctx.problem.C}、寬 ${ctx.problem.h} 的長方形，${ctx.problem.area} 平方公分。`, chant: '罐子的標籤攤開是長方形：長是一圈，寬是高。', transfer: '想一想：家裡的罐子，用繩子量一圈有多長？'
  });

  window.lifeFig = { rnd, any, lv, nStep, cStep, prompt, shown, methods, reasons, ceilDiv, packWrong, enoughOpts, enoughAns };
})();

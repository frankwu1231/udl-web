'use strict';
// 第 27 版：表面積教材包的其他活動（單元 1、2、3-3、3-4、4）。圖形工具在 act-surface.js（window.surfaceFig）。
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml } = U, S = window.surfaceFig;
  const { boxSVG, netSVG, areas, total, surfObs, PAIR } = S;
  const methods = [['mark', '📦 先動手看一看'], ['self', '🧠 先自己想，需要時看提示']];
  const BOX = { easy: [[3, 2, 1], [4, 2, 1], [3, 2, 2]], standard: [[4, 3, 2], [5, 3, 2], [5, 4, 2]], challenge: [[6, 4, 2], [6, 4, 3], [5, 4, 3]] };
  const box = (level, i) => { const [l, w, h] = pick(BOX[level] || BOX.standard, i); return { l, w, h }; };
  const unitStep = (n, word = '表面積') => ({ title: '寫單位', ids: ['unit'], hints: [`${word}是面積，單位是什麼？`, '不是長度的單位，也不是體積的單位。', `${word}要寫平方公分。`],
    think: `${word}是面積，單位是平方公分。`, together: `一起想：${word}的單位？`,
    answer: ctx => `<p class="notice" data-read data-say>你的答案：${esc(ctx.answers.total ?? '')}</p>${ctx.choice('unit', `${word}用哪個單位？`, [['cm2', '平方公分'], ['cm3', '立方公分'], ['cm', '公分']])}`,
    check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === 'cm2' ? null
      : { code: 'unit', obs: ctx.answers.unit === 'cm3' ? 'unitVolume' : 'unitLength', msg: ctx.answers.unit === 'cm3' ? '立方公分是體積的單位。面積要用平方公分。' : '公分是量長度的。面積要用平方公分。' },
    solve: ctx => { ctx.answers.unit = 'cm2'; }, say: () => `${word}的單位是平方公分。` });
  // 打開盒子的按鈕：按了 state.open = true
  const openBtn = ctx => `<div class="actions"><button type="button" id="sfOpen" class="primary-soft" ${ctx.state.open ? 'disabled' : ''}>📭 把盒子打開</button></div>`;
  const bindOpen = ctx => { const b = document.getElementById('sfOpen'); if (b) b.onclick = () => { ctx.state.open = true; ctx.log('打開盒子'); ctx.rerender(); }; };
  // 在展開圖上找對面（1-2、2-3 共用）：點一個面，再點和它面對面的面
  function pairStep(n, { labels = true, title = '找對面' } = {}) {
    return { title, ids: ['pairs'], hints: ['點一個面，再點盒子合起來時和它面對面的面。', '看閃爍的兩個面：合起來時它們面對面。', '對面一樣大：上和下、前和後、左和右。'],
      think: '老師找面對面的兩個面：上和下、前和後、左和右。', together: '一起找：哪兩個面面對面？',
      figure: ctx => { const left = ['tb', 'fb', 'lr'].find(k => !(ctx.state.pairs || []).includes(k)); return netSVG(ctx.problem, { clickFaces: true, labels, colored: ctx.state.pairs || [], pick: ctx.state.pick, pulse: ctx.hint(n) >= 2 && left ? Object.keys(PAIR).filter(f => PAIR[f] === left) : [] }); },
      answer: ctx => `<p data-read data-say>點一個面，再點和它面對面的面。找到的兩個面會塗上同一個顏色。</p><p class="notice" data-read data-say>找到了 ${(ctx.state.pairs || []).length} 組，共 3 組。</p>`,
      bind: ctx => document.querySelectorAll(`#figure${n} [data-face]`).forEach(el => {
        const go = () => {
          const f = el.dataset.face, st = ctx.state; st.pairs = st.pairs || [];
          if (st.pairs.includes(PAIR[f])) return;
          if (!st.pick || st.pick === f) { st.pick = st.pick === f ? null : f; ctx.refreshFigure(n); return; }
          if (PAIR[st.pick] === PAIR[f]) { st.pairs.push(PAIR[f]); ctx.answers.pairs = String(st.pairs.length); ctx.log('找到一組對面', { pair: PAIR[f] }); } else ctx.log('配對不是對面', { a: st.pick, b: f });
          st.pick = null; ctx.rerender();
        };
        el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      }),
      check: ctx => (ctx.state.pairs || []).length === 3 ? null : { code: 'pairs', obs: 'unfinished', msg: `還有 ${3 - (ctx.state.pairs || []).length} 組沒找到。合起來時面對面的兩個面，才是一組。` },
      solve: ctx => { ctx.state.open = true; ctx.state.pairs = ['tb', 'fb', 'lr']; ctx.state.pick = null; ctx.answers.pairs = '3'; }, say: () => '上和下、前和後、左和右，一共 3 組。' };
  }
  const reasons = [['open', '打開盒子看'], ['pairs', '找對面'], ['hint', '看提示']];

  // =============== 1-1 數一數：長方體有幾個面 ===============
  A.register('sFaces', {
    methods, makeProblem: (level, i) => ({ ...box(level, i), prompt: '這是一個長方體的盒子。數一數，它有幾個面？' }),
    planFigure: ctx => boxSVG(ctx.problem, { hidden: false }),
    steps: [
      { title: '看得到的面', ids: ['see'], hints: ['看一看圖，數看得到的面。', '前面、上面、右面。', '從一邊看，只看得到 3 個面。'],
        think: '老師先數看得到的面：前面、上面、右面。', together: '一起數：看得到幾個面？',
        figure: ctx => boxSVG(ctx.problem, { hidden: false, colorAll: ctx.hint(0) >= 2, pulse: ctx.hint(0) >= 2 ? ['front', 'top', 'right'] : [] }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('see', '從這一邊看，看得到幾個面？', [['3', '3 個'], ['6', '6 個'], ['2', '2 個']], true)}`,
        check: ctx => !ctx.answers.see ? { code: 'see', msg: '先選一個答案。' } : ctx.answers.see === '3' ? null : { code: 'see', obs: 'wrongChoice', msg: '只數看得到的面：前面、上面、右面。' },
        solve: ctx => { ctx.answers.see = '3'; }, say: () => '看得到 3 個面。' },
      { title: '打開數一數', ids: ['count'], hints: ['把盒子打開，看不到的面也會出來。', '打開以後，一個一個數。', '上、下、前、後、左、右，一共 6 個面。'],
        think: '老師把盒子打開，看不到的面也數進去。', together: '一起數：打開後有幾個面？',
        figure: ctx => ctx.state.open ? netSVG(ctx.problem, { labels: ctx.hint(1) >= 2, pulse: ctx.hint(1) >= 2 ? Object.keys(PAIR) : [] }) : boxSVG(ctx.problem, {}),
        answer: ctx => `${openBtn(ctx)}${ctx.state.open ? fieldHtml(ctx, 'count', '一共有幾個面？', 1) : ''}`, bind: bindOpen,
        check: ctx => { if (!ctx.state.open) return { code: 'open', obs: 'unfinished', msg: '先按「把盒子打開」。' }; const v = num(ctx.answers.count); return v === null ? { code: 'count', msg: '數一數，把數字填進去。' } : v === 6 ? null : { code: 'count', obs: v < 6 ? 'missFace' : 'countOver', msg: v < 6 ? '有的面沒數到。上面和下面也要數。' : '有的面數了兩次，再數一次。' }; },
        solve: ctx => { ctx.state.open = true; ctx.answers.count = '6'; }, say: () => '一共有 6 個面。' },
      { title: '面的形狀', ids: ['shape'], hints: ['看一看每個面的樣子。', '每個面都有 4 個直角。', '長方體的每個面都是長方形（有的可能是正方形）。'],
        think: '老師看每個面：都有 4 個直角，是長方形。', together: '一起看：每個面是什麼形狀？',
        figure: ctx => netSVG(ctx.problem, { labels: true }),
        answer: ctx => ctx.choice('shape', '長方體的每個面是什麼形狀？', [['rect', '長方形'], ['tri', '三角形'], ['circle', '圓形']]),
        check: ctx => !ctx.answers.shape ? { code: 'shape', msg: '先選一個答案。' } : ctx.answers.shape === 'rect' ? null : { code: 'shape', obs: 'wrongChoice', msg: '數一數每個面有幾個角。' },
        solve: ctx => { ctx.answers.shape = 'rect'; }, say: () => '每個面都是長方形。' }
    ],
    reasons, done: () => '長方體有 6 個面，每個面都是長方形。', chant: '長方體：六個面，上下、前後、左右。', transfer: '找一找：教室裡有什麼東西是長方體？數數看它有幾個面。'
  });

  // =============== 1-2 對面一樣大 ===============
  A.register('sOpposite', {
    methods, makeProblem: (level, i) => ({ ...box(level, i), prompt: '把盒子打開，找一找面對面的兩個面，比一比它們的大小。' }),
    planFigure: ctx => boxSVG(ctx.problem, {}),
    steps: [
      { title: '打開盒子', ids: ['opened'], hints: ['按按鈕，把盒子打開。', '打開以後，可以看到 6 個面。', '按「把盒子打開」。'], think: '老師先把盒子打開。', together: '一起做：把盒子打開。',
        figure: ctx => ctx.state.open ? netSVG(ctx.problem, { labels: true }) : boxSVG(ctx.problem, {}),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${openBtn(ctx)}`, bind: bindOpen,
        check: ctx => ctx.state.open ? null : { code: 'open', obs: 'unfinished', msg: '先按「把盒子打開」。' }, solve: ctx => { ctx.state.open = true; }, say: () => '打開了，有 6 個面。' },
      pairStep(1),
      { title: '比一比', ids: ['same'], hints: ['看同一個顏色的兩個面。', '量一量：兩個面的長和寬一樣嗎？', '面對面的兩個面一樣大。'], think: '老師比一比：同一組的兩個面一樣大。', together: '一起比：對面一樣大嗎？',
        figure: ctx => netSVG(ctx.problem, { colored: ['tb', 'fb', 'lr'], labels: true, nums: true }),
        answer: ctx => ctx.choice('same', '面對面的兩個面，大小怎麼樣？', [['same', '一樣大'], ['diff', '不一樣大']], true),
        check: ctx => !ctx.answers.same ? { code: 'same', msg: '先選一個答案。' } : ctx.answers.same === 'same' ? null : { code: 'same', obs: 'wrongChoice', msg: '看面上的數字：兩個面的長和寬一樣。' },
        solve: ctx => { ctx.answers.same = 'same'; }, say: () => '面對面的兩個面一樣大。' }
    ],
    reasons, done: () => '長方體有 3 組對面，每組的兩個面一樣大。', chant: '對面一樣大：上下、前後、左右。', transfer: '拿一個面紙盒，比一比上面和下面是不是一樣大。'
  });

  // =============== 1-3 包住外面：表面積是什麼 ===============
  const WRAP = [['書本包書套', 'outside'], ['盒子裡裝滿積木', 'inside'], ['禮物盒包包裝紙', 'outside'], ['魚缸裝滿水', 'inside'], ['給箱子外面塗油漆', 'outside']];
  A.register('sWrap', {
    methods, makeProblem: (level, i) => ({ ...box(level, i), sc: pick(WRAP, i), prompt: '要用包裝紙把整個盒子包起來，包裝紙要蓋住哪裡？' }),
    planFigure: ctx => boxSVG(ctx.problem, {}),
    steps: [
      { title: '看題目', ids: ['target'], hints: ['包裝紙包在哪裡？', '看閃爍的地方：盒子的外面。', '包住盒子外面的大小，叫做表面積。'], think: '包裝紙包住盒子的外面，這就是表面積。', together: '一起想：包裝紙包在哪裡？',
        figure: ctx => boxSVG(ctx.problem, { colorAll: ctx.hint(0) >= 2, pulse: ctx.hint(0) >= 2 ? ['front', 'top', 'right'] : [] }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('target', '包裝紙要蓋住哪裡？', [['outside', '盒子外面的每一個面'], ['inside', '盒子裡面'], ['top', '只有上面']])}`,
        check: ctx => !ctx.answers.target ? { code: 'target', msg: '先選一個答案。' } : ctx.answers.target === 'outside' ? null : { code: 'target', obs: ctx.answers.target === 'inside' ? 'choseVolume' : 'eqOneFace', msg: ctx.answers.target === 'inside' ? '包裝紙包在外面，不是放進裡面。' : '整個盒子都要包住，不是只有上面。' },
        solve: ctx => { ctx.answers.target = 'outside'; }, say: () => '包裝紙蓋住盒子外面的每一個面。' },
      { title: '要蓋住幾個面', ids: ['count'], hints: ['上面、下面都要包。', '打開來數一數。', '6 個面都要包住。'], think: '老師數：上、下、前、後、左、右，6 個面都要包。', together: '一起數：要包住幾個面？',
        figure: ctx => netSVG(ctx.problem, { colorAll: ctx.hint(1) >= 2, labels: true }),
        answer: ctx => fieldHtml(ctx, 'count', '包裝紙要蓋住幾個面？', 1),
        check: ctx => { const v = num(ctx.answers.count); return v === null ? { code: 'count', msg: '把數字填進去。' } : v === 6 ? null : { code: 'count', obs: v < 6 ? 'missFace' : 'countOver', msg: v < 6 ? '下面和後面也要包。' : '再數一次，每個面只數一次。' }; },
        solve: ctx => { ctx.answers.count = '6'; }, say: () => '6 個面都要包住。' },
      { title: '是不是表面積', ids: ['which'], hints: ['想一想：是包在外面，還是裝在裡面？', '包在外面的，是表面積。', '裝在裡面的，是體積。'], think: '包在外面是表面積；裝在裡面是體積。', together: '一起想：這件事是外面還是裡面？',
        figure: ctx => boxSVG(ctx.problem, { colorAll: true }),
        answer: ctx => ctx.choice('which', `「${esc(ctx.problem.sc[0])}」是在算哪一個？`, [['outside', '外面的大小（表面積）'], ['inside', '裡面可以裝多少（體積）']], true),
        check: ctx => !ctx.answers.which ? { code: 'which', msg: '先選一個答案。' } : ctx.answers.which === ctx.problem.sc[1] ? null : { code: 'which', obs: ctx.problem.sc[1] === 'outside' ? 'choseVolume' : 'wrongChoice', msg: ctx.problem.sc[1] === 'outside' ? '這是包在外面的。' : '這是裝在裡面的。' },
        solve: ctx => { ctx.answers.which = ctx.problem.sc[1]; }, say: ex => ex.problem.sc[1] === 'outside' ? '包在外面，是表面積。' : '裝在裡面，是體積。' }
    ],
    reasons, done: () => '包住盒子外面 6 個面的大小，就是表面積。', chant: '表面積：包住外面的大小。', transfer: '說一說：生活中哪些事要算表面積？（包書套、包禮物）'
  });

  // =============== 2-1 打開盒子：展開圖 ===============
  const FACES = ['top', 'bottom', 'front', 'back', 'left', 'right'], FN = S.FACE_NAME;
  const kindsOf = p => new Set([[p.l, p.w], [p.l, p.h], [p.w, p.h]].map(x => x.slice().sort((a, b) => a - b).join('x'))).size;   // 幾種大小（形狀一樣才算同一種）
  A.register('sNet', {
    methods, makeProblem: (level, i) => ({ ...box(level, i), find: pick(['top', 'right', 'bottom', 'back', 'left'], i), prompt: '把盒子打開攤平，就是展開圖。看一看展開圖上的每一個面。' }),
    planFigure: ctx => boxSVG(ctx.problem, {}),
    steps: [
      { title: '打開盒子', ids: ['count'], hints: ['按按鈕，把盒子打開。', '數一數展開圖有幾個長方形。', '展開圖有 6 個面。'], think: '老師把盒子打開，數一數有幾個長方形。', together: '一起做：打開數一數。',
        figure: ctx => ctx.state.open ? netSVG(ctx.problem, { pulse: ctx.hint(0) >= 2 ? FACES : [] }) : boxSVG(ctx.problem, {}),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${openBtn(ctx)}${ctx.state.open ? ctx.choice('count', '展開圖有幾個面？', [['6', '6 個'], ['4', '4 個'], ['3', '3 個']], true) : ''}`, bind: bindOpen,
        check: ctx => !ctx.state.open ? { code: 'open', obs: 'unfinished', msg: '先按「把盒子打開」。' } : !ctx.answers.count ? { code: 'count', msg: '數一數，再選一個答案。' } : ctx.answers.count === '6' ? null : { code: 'count', obs: 'missFace', msg: '再數一次，上面和下面也是面。' },
        solve: ctx => { ctx.state.open = true; ctx.answers.count = '6'; }, say: () => '展開圖有 6 個面。' },
      { title: '找一個面', ids: ['picked'], hints: ['想一想盒子合起來時，這個面在哪裡。', '前面在中間；上面在前面的上方，下面在前面的下方。', '看閃爍的面。'], think: '老師想：前面在中間，其他的面圍在旁邊。', together: '一起找：這個面在展開圖的哪裡？',
        figure: ctx => netSVG(ctx.problem, { clickFaces: true, pick: ctx.answers.picked, labels: ctx.checked(1), labelOnly: ['front'], pulse: ctx.hint(1) >= 2 ? [ctx.problem.find] : [] }),
        answer: ctx => `<p data-read data-say>前面已經標在中間。在展開圖上，點一下「${FN[ctx.problem.find]}」。</p><p class="notice" data-read data-say>${ctx.answers.picked ? '已經選好了，按檢查。' : '還沒點。'}</p>`,
        bind: ctx => document.querySelectorAll('#figure1 [data-face]').forEach(el => { const go = () => { ctx.answers.picked = el.dataset.face; ctx.rerender(); }; el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }),
        check: ctx => !ctx.answers.picked ? { code: 'picked', msg: '先在展開圖上點一個面。' } : ctx.answers.picked === ctx.problem.find ? null : { code: 'picked', obs: PAIR[ctx.answers.picked] === PAIR[ctx.problem.find] ? 'swapped' : 'wrongChoice', msg: PAIR[ctx.answers.picked] === PAIR[ctx.problem.find] ? `這是它的對面，和${FN[ctx.problem.find]}一樣大。再找一次。` : '想一想盒子合起來時，這個面在哪裡。' },
        solve: ctx => { ctx.answers.picked = ctx.problem.find; }, say: ex => `${FN[ex.problem.find]}在這裡。` },
      { title: '有幾種大小', ids: ['kinds'], hints: ['比一比六個面的大小。', '看面上的數字：長 × 寬一樣，就是一樣大。', '把一樣大的面算成同一種，數一數有幾種。'], think: '老師看每個面的長和寬，一樣的算同一種。', together: '一起比：有幾種大小？',
        figure: ctx => netSVG(ctx.problem, { colored: ctx.hint(2) >= 2 || ctx.checked(2) ? ['tb', 'fb', 'lr'] : [], labels: true, nums: true }),
        answer: ctx => ctx.choice('kinds', '六個面一共有幾種大小？', [['1', '1 種'], ['2', '2 種'], ['3', '3 種'], ['6', '6 種']], true),
        check: ctx => { const k = String(kindsOf(ctx.problem)); return !ctx.answers.kinds ? { code: 'kinds', msg: '先選一個答案。' } : ctx.answers.kinds === k ? null : { code: 'kinds', obs: ctx.answers.kinds === '1' ? 'sixSame' : 'wrongChoice', msg: ctx.answers.kinds === '1' ? '這個盒子的面不是都一樣大。看面上的數字。' : '看面上的數字，長和寬一樣的算同一種，再數一次。' }; },
        solve: ctx => { ctx.answers.kinds = String(kindsOf(ctx.problem)); }, say: ex => `有 ${kindsOf(ex.problem)} 種大小。` }
    ],
    reasons, done: ctx => `盒子打開是展開圖，有 6 個面、${kindsOf(ctx.problem)} 種大小。`, chant: '打開盒子：六個面，對面一樣大。', transfer: '拆開一個空的牙膏盒，看看它的展開圖。'
  });

  // =============== 2-2 哪些展開圖能摺成正方體 ===============
  // 方格：[x, y]
  const GOOD = [[[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]], [[2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]]];
  const BAD = [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [3, 1]]];
  const squares = (cells, o = {}) => { const u = 26, w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
    return `<svg class="ac-svg sf-mini" viewBox="-4 -4 ${w * u + 8} ${h * u + 8}" width="${w * u + 8}" role="img" aria-label="${cells.length} 個正方形拼成的圖">${cells.map(([x, y]) => `<rect x="${x * u}" y="${y * u}" width="${u}" height="${u}" fill="${o.fill || '#bfe0ff'}" stroke="#2b4a7a" stroke-width="2"/>`).join('')}</svg>`; };
  A.register('sCubeNet', {
    methods, makeProblem: (level, i, random = Math.random) => { const good = pick(GOOD, i), bad = U.shuffle(BAD, random).slice(0, 2), opts = U.shuffle([['A', good, true], ['B', bad[0], false], ['C', bad[1], false]], random).map((o, k) => ['ABC'[k], o[1], o[2]]);
      return { opts, ok: opts.find(o => o[2])[0], prompt: '正方體的盒子打開，會是哪一個展開圖？' }; },
    planFigure: ctx => S.boxSVG({ l: 3, w: 3, h: 3, cube: true }, { colorAll: true }),
    steps: [
      { title: '數面', ids: ['six'], hints: ['正方體有幾個面？', '上、下、前、後、左、右。', '正方體有 6 個面，展開圖要有 6 個正方形。'], think: '正方體有 6 個面，展開圖要有 6 個正方形。', together: '一起數：正方體有幾個面？',
        figure: () => S.boxSVG({ l: 3, w: 3, h: 3, cube: true }, { colorAll: true }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('six', '正方體的展開圖要有幾個正方形？', [['6', '6 個'], ['5', '5 個'], ['4', '4 個']], true)}`,
        check: ctx => !ctx.answers.six ? { code: 'six', msg: '先選一個答案。' } : ctx.answers.six === '6' ? null : { code: 'six', obs: 'missFace', msg: '上面和下面也要算。' },
        solve: ctx => { ctx.answers.six = '6'; }, say: () => '要有 6 個正方形。' },
      { title: '選展開圖', ids: ['net'], hints: ['先數一數每個圖有幾個正方形。', '想像摺起來：會不會有兩個面疊在一起？', '中間一排 4 個、上下各 1 個的，能摺成盒子。'], think: '老師先數正方形，再想像摺起來會不會重疊。', together: '一起想：哪一個摺起來剛好是盒子？',
        figure: ctx => `<div class="sf-nets">${ctx.problem.opts.map(([k, cells]) => `<figure><figcaption>${k}</figcaption>${squares(cells, { fill: ctx.hint(1) >= 2 && cells.length !== 6 ? '#eee' : '#bfe0ff' })}</figure>`).join('')}</div>`,
        answer: ctx => ctx.choice('net', '哪一個可以摺成正方體？', ctx.problem.opts.map(o => [o[0], `${o[0]} 圖`]), true),
        check: ctx => { if (!ctx.answers.net) return { code: 'net', msg: '先選一個答案。' }; if (ctx.answers.net === ctx.problem.ok) return null; const o = ctx.problem.opts.find(x => x[0] === ctx.answers.net);
          return { code: 'net', obs: o[1].length !== 6 ? 'missFace' : 'wrongChoice', msg: o[1].length !== 6 ? '數一數：這個圖不是 6 個正方形。' : '想像摺起來：有的面會疊在一起，有的地方蓋不住。' }; },
        solve: ctx => { ctx.answers.net = ctx.problem.ok; }, say: ex => `${ex.problem.ok} 圖可以摺成正方體。` }
    ],
    reasons, done: ctx => `${ctx.problem.ok} 圖可以摺成正方體：6 個正方形，摺起來不重疊。`, chant: '正方體展開圖：六個正方形，摺起來不重疊。', transfer: '用方格紙剪下 6 個正方形，拼拼看能不能摺成盒子。'
  });

  // =============== 2-3 在展開圖上找對面 ===============
  A.register('sNetPairs', {
    methods, makeProblem: (level, i) => ({ ...box(level, i), prompt: '這是盒子的展開圖，面上沒有寫名字。找出合起來時面對面的三組面。' }),
    planFigure: ctx => netSVG(ctx.problem, {}),
    steps: [
      { title: '看題目', ids: ['know'], hints: ['對面是盒子合起來時面對面的兩個面。', '在這張展開圖上，對面不會連在一起。', '在這張展開圖上，對面一樣大，中間隔著一個面。'], think: '老師想：在這張展開圖上，對面一樣大，中間隔一個面。', together: '一起想：對面有什麼特別？',
        figure: ctx => netSVG(ctx.problem, {}),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('know', '面對面的兩個面怎麼樣？', [['same', '兩個面一樣大'], ['touch', '連在一起'], ['diff', '大小不一樣']])}`,
        check: ctx => !ctx.answers.know ? { code: 'know', msg: '先選一個答案。' } : ctx.answers.know === 'same' ? null : { code: 'know', obs: 'wrongChoice', msg: '把盒子合起來想一想：上面和下面有連在一起嗎？' },
        solve: ctx => { ctx.answers.know = 'same'; }, say: () => '對面一樣大，中間隔一個面。' },
      pairStep(1, { labels: false })
    ],
    reasons, done: () => '在這張展開圖上，對面一樣大，中間隔著一個面。', chant: '找對面：合起來面對面。', transfer: '拿一個骰子：對面的點數加起來是 7，找一找。'
  });

  // =============== 3-3 知道表面積，找邊長（正方體） ===============
  const INV = { easy: [2, 3], standard: [3, 4], challenge: [4, 5] };
  A.register('sInverse', {
    methods, makeProblem: (level, i) => { const s = pick(INV[level] || INV.standard, i); return { s, S: 6 * s * s, prompt: `正方體的表面積是 ${6 * s * s} 平方公分。它的邊長是幾公分？` }; },
    planFigure: ctx => netSVG({ l: ctx.problem.s, w: ctx.problem.s, h: ctx.problem.s }, { colorAll: true }),
    steps: [
      { title: '一個面', ids: ['face'], hints: ['正方體有 6 個一樣的面。', '表面積是 6 個面合起來，一個面要怎麼算？', '一個面 = 表面積 ÷ 6。'], think: '6 個面一樣大，表面積 ÷ 6 就是一個面。', together: '一起想：一個面多大？',
        figure: ctx => netSVG({ l: ctx.problem.s, w: ctx.problem.s, h: ctx.problem.s }, { colorAll: true, pulse: ctx.hint(0) >= 2 ? ['front'] : [] }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${fieldHtml(ctx, 'face', `一個面：${ctx.problem.S} ÷ 6 = ？`, 0)}`,
        check: ctx => { const v = num(ctx.answers.face), p = ctx.problem; return v === null ? { code: 'face', msg: '把一個面的面積填進去。' } : v === p.s * p.s ? null : { code: 'face', obs: v === p.S / 4 ? 'other' : Math.abs(v - p.s * p.s) === 1 ? 'offByOne' : 'other', msg: '表面積 ÷ 6，再算一次。' }; },
        solve: ctx => { ctx.answers.face = String(ctx.problem.s * ctx.problem.s); }, say: ex => `一個面是 ${ex.problem.s * ex.problem.s} 平方公分。` },
      { title: '找邊長', ids: ['side'], hints: ['一個面是正方形：邊長 × 邊長。', '找兩個一樣的數相乘，例如 3 × 3。', '試試看：1 × 1、2 × 2、3 × 3……'], think: '找兩個一樣的數，相乘等於一個面。', together: '一起試：幾乘幾？',
        figure: ctx => { const f = num(ctx.answers.face) || ctx.problem.s * ctx.problem.s; return `<p class="ac-big" data-read data-say>？ × ？ = ${f}</p>`; },
        answer: ctx => fieldHtml(ctx, 'side', '邊長是幾公分？', 1),
        check: ctx => { const v = num(ctx.answers.side), f = num(ctx.answers.face); if (v === null) return { code: 'side', msg: '把邊長填進去。' };
          return v * v === f ? null : { code: 'side', obs: f !== null && v === f ? 'eqArea' : 'other', msg: f !== null && v === f ? '這是一個面的面積，不是邊長。' : `${v} × ${v} = ${v * v}，不等於 ${f ?? '一個面'}。再試一次。` }; },
        solve: ctx => { ctx.answers.side = String(ctx.problem.s); }, say: ex => `${ex.problem.s} × ${ex.problem.s} = ${ex.problem.s * ex.problem.s}，邊長 ${ex.problem.s} 公分。` },
      { title: '驗算', ids: ['back'], hints: ['用邊長算回表面積。', '邊長 × 邊長 × 6。', '算出來要等於題目的表面積。'], think: '用邊長算回去，看是不是一樣。', together: '一起算回去檢查。',
        answer: ctx => { const v = num(ctx.answers.side); return `<p class="ac-big" data-read data-say>${v ?? '邊長'} × ${v ?? '邊長'} × 6 = ${v === null ? '？' : v * v * 6}</p>${ctx.choice('back', `和題目的 ${ctx.problem.S} 一樣嗎？`, [['same', '一樣'], ['diff', '不一樣']], true)}`; },
        check: ctx => { const v = num(ctx.answers.side), ok = v !== null && v * v * 6 === ctx.problem.S; if (!ctx.answers.back) return { code: 'back', msg: '先選一個答案。' };
          return (ctx.answers.back === 'same') === ok ? (ok ? null : { code: 'back', obs: 'other', msg: '不一樣，回到上一步再找一次邊長。' }) : { code: 'back', obs: 'wrongChoice', msg: '再看一次兩個數字。' }; },
        solve: ctx => { ctx.answers.back = 'same'; }, say: ex => `${ex.problem.s} × ${ex.problem.s} × 6 = ${ex.problem.S}，一樣。` }
    ],
    reasons, done: ctx => `${ctx.problem.S} ÷ 6 = ${ctx.problem.s * ctx.problem.s}，${ctx.problem.s} × ${ctx.problem.s} = ${ctx.problem.s * ctx.problem.s}，邊長是 ${ctx.problem.s} 公分。`,
    chant: '反過來：表面積除以六，再找邊長乘邊長。', transfer: '骰子的表面積如果是 24 平方公分，邊長是多少？'
  });

  // =============== 3-4 要算表面積還是體積 ===============
  const WH = [['要做一個書套，包住整本書', 'surface'], ['盒子裡可以放多少個 1 立方公分的積木', 'volume'], ['給箱子外面全部塗上油漆', 'surface'], ['水族箱可以裝多少水', 'volume'], ['用色紙貼滿整個面紙盒的外面', 'surface'], ['櫃子裡面可以放多少東西', 'volume']];
  A.register('sWhich', {
    methods, makeProblem: (level, i) => { const [t, k] = pick(WH, i); return { ...box(level, i), t, k, prompt: `${t}。要算表面積還是體積？` }; },
    planFigure: ctx => boxSVG(ctx.problem, {}),
    steps: [
      { title: '想一想', ids: ['kind'], hints: ['是包在外面，還是裝在裡面？', '包在外面、貼在外面：表面積。', '裝在裡面、放在裡面：體積。'], think: '老師想：包在外面是表面積，裝在裡面是體積。', together: '一起想：外面還是裡面？',
        figure: ctx => boxSVG(ctx.problem, { colorAll: ctx.hint(0) >= 2 }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('kind', '要算哪一個？', [['surface', '表面積（外面的大小）'], ['volume', '體積（裡面可以裝多少）']], true)}`,
        check: ctx => !ctx.answers.kind ? { code: 'kind', msg: '先選一個答案。' } : ctx.answers.kind === ctx.problem.k ? null : { code: 'kind', obs: ctx.problem.k === 'surface' ? 'choseVolume' : 'wrongChoice', msg: ctx.problem.k === 'surface' ? '這是包或貼在外面的，算外面的大小。' : '這是裝在裡面的，算裡面可以裝多少。' },
        solve: ctx => { ctx.answers.kind = ctx.problem.k; }, say: ex => ex.problem.k === 'surface' ? '在外面，要算表面積。' : '在裡面，要算體積。' },
      { title: '選單位', ids: ['unit'], hints: ['表面積和體積的單位不一樣。', '面積用平方，體積用立方。', '表面積：平方公分；體積：立方公分。'], think: '表面積用平方公分，體積用立方公分。', together: '一起選單位。',
        answer: ctx => ctx.choice('unit', '答案要用哪個單位？', [['cm2', '平方公分'], ['cm3', '立方公分'], ['cm', '公分']]),
        check: ctx => { const want = ctx.problem.k === 'surface' ? 'cm2' : 'cm3'; return !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === want ? null : { code: 'unit', obs: ctx.answers.unit === 'cm' ? 'unitLength' : want === 'cm2' ? 'unitVolume' : 'wrongChoice', msg: want === 'cm2' ? '表面積是面積，用平方公分。' : '體積用立方公分。' }; },
        solve: ctx => { ctx.answers.unit = ctx.problem.k === 'surface' ? 'cm2' : 'cm3'; }, say: ex => ex.problem.k === 'surface' ? '表面積用平方公分。' : '體積用立方公分。' }
    ],
    reasons, done: ctx => ctx.problem.k === 'surface' ? '在外面：算表面積，單位是平方公分。' : '在裡面：算體積，單位是立方公分。', chant: '外面是表面積，裡面是體積。', transfer: '粽葉包在粽子的外面。要算外面的大小，是表面積還是體積？'
  });

  // =============== 4-1 沒有蓋子的盒子 ===============
  const openTotal = p => p.l * p.w + 2 * p.l * p.h + 2 * p.w * p.h;
  A.register('sOpenBox', {
    methods, makeProblem: (level, i) => ({ ...box(level, i), prompt: '' }),
    planFigure: ctx => boxSVG(ctx.problem, { edges: ['l', 'w', 'h'] }),
    steps: [
      { title: '數面', ids: ['count'], hints: ['沒有蓋子，就是少了哪一個面？', '上面沒有了，其他的面都還在。', '6 個面少 1 個，是 5 個面。'], think: '沒有蓋子，少了上面，剩下 5 個面。', together: '一起數：沒有蓋子有幾個面？',
        figure: ctx => netSVG(ctx.problem, { labels: true, omit: ['top'] }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>沒有蓋子的盒子，長 ${ctx.problem.l} 公分、寬 ${ctx.problem.w} 公分、高 ${ctx.problem.h} 公分。外面的面積是多少？</p>${ctx.choice('count', '沒有蓋子的盒子，有幾個面？', [['5', '5 個'], ['6', '6 個'], ['4', '4 個']], true)}`,
        check: ctx => !ctx.answers.count ? { code: 'count', msg: '先選一個答案。' } : ctx.answers.count === '5' ? null : { code: 'count', obs: ctx.answers.count === '6' ? 'other' : 'missFace', msg: ctx.answers.count === '6' ? '上面（蓋子）沒有了。' : '只少了上面，下面還在。' },
        solve: ctx => { ctx.answers.count = '5'; }, say: () => '沒有蓋子，有 5 個面。' },
      { title: '算五個面', ids: ['fa', 'fb', 'fc'], hints: ['下面 1 個、前後 2 個、左右 2 個。', '下面：長 × 寬；前面：長 × 高；右面：寬 × 高。', '先算三種面，再看各有幾個。'], think: '下面只有 1 個；前後、左右各有 2 個。', together: '一起算三種面。',
        figure: ctx => netSVG(ctx.problem, { labels: true, nums: true, colored: ['tb', 'fb', 'lr'], omit: ['top'] }),
        answer: ctx => { const p = ctx.problem; return `${fieldHtml(ctx, 'fa', `下面：${p.l} × ${p.w} = ？`, 1)}${fieldHtml(ctx, 'fb', `前面：${p.l} × ${p.h} = ？`, 1)}${fieldHtml(ctx, 'fc', `右面：${p.w} × ${p.h} = ？`, 1)}`; },
        check: ctx => { const p = ctx.problem, bad = [['fa', p.l * p.w, '下面'], ['fb', p.l * p.h, '前面'], ['fc', p.w * p.h, '右面']].filter(([k, v]) => num(ctx.answers[k]) !== v);
          if (bad.some(([k]) => num(ctx.answers[k]) === null)) return { code: 'faces', msg: '三種面都要填。' };
          return bad.length ? { code: 'faces', obs: 'other', msg: `${bad.map(x => x[2]).join('、')}再算一次。` } : null; },
        solve: ctx => { const p = ctx.problem; Object.assign(ctx.answers, { fa: String(p.l * p.w), fb: String(p.l * p.h), fc: String(p.w * p.h) }); }, say: ex => `下面 ${ex.problem.l * ex.problem.w}，前面 ${ex.problem.l * ex.problem.h}，右面 ${ex.problem.w * ex.problem.h}。` },
      { title: '加起來', ids: ['total'], hints: ['下面 1 個，前後 2 個，左右 2 個。', '下面 ＋ 前面 × 2 ＋ 右面 × 2。', '也可以用六個面的表面積，減掉上面。'], think: '下面加上前後兩個、左右兩個。', together: '一起加起來。',
        answer: ctx => { const a = num(ctx.answers.fa), b = num(ctx.answers.fb), c = num(ctx.answers.fc); return `<p class="ac-big" data-read data-say>${a ?? '下面'} ＋ ${b ?? '前面'} × 2 ＋ ${c ?? '右面'} × 2 = ？</p>${fieldHtml(ctx, 'total', '外面的面積是多少？', 2)}`; },
        check: ctx => { const a = num(ctx.answers.fa), b = num(ctx.answers.fb), c = num(ctx.answers.fc), v = num(ctx.answers.total), p = ctx.problem; if (v === null) return { code: 'total', msg: '把答案填進去。' };
          const t = a + 2 * b + 2 * c; if (v === t) return null;
          const closed = 2 * (a + b + c); return { code: 'total', obs: v === closed ? 'other' : surfObs(v, t, p, { tb: a, fb: b, lr: c }), msg: v === closed ? '這是有蓋子的。沒有蓋子，要少算上面。' : v === a + b + c ? '前後、左右各有 2 個。' : '下面 1 個、前後 2 個、左右 2 個，再算一次。' }; },
        solve: ctx => { ctx.answers.total = String(openTotal(ctx.problem)); }, say: ex => `外面的面積是 ${openTotal(ex.problem)}。` },
      unitStep(3, '面積')
    ],
    reasons, done: ctx => `${ctx.problem.l * ctx.problem.w} ＋ ${ctx.problem.l * ctx.problem.h} × 2 ＋ ${ctx.problem.w * ctx.problem.h} × 2 = ${openTotal(ctx.problem)}，是 ${openTotal(ctx.problem)} 平方公分。`,
    chant: '沒有蓋子：五個面，少算上面。', transfer: '找一找：生活中有什麼盒子沒有蓋子？（筆筒、收納盒）'
  });

  // =============== 4-2 生活應用題：包裝紙、油漆 ===============
  // k: all 六個面｜open 五個面（沒有上面）｜one 一個面
  const WORD = [
    { e: '🎁', t: p => `禮物盒長 ${p.l} 公分、寬 ${p.w} 公分、高 ${p.h} 公分。包裝紙剛好蓋滿六個面。包裝紙沒有重疊。面積是多少平方公分？`, k: 'all' },
    { e: '🖌️', t: p => `木箱長 ${p.l} 公分、寬 ${p.w} 公分、高 ${p.h} 公分，沒有蓋子。外面（不含上面）都要塗油漆，要塗多少面積？`, k: 'open' },
    { e: '📦', t: p => `紙盒長 ${p.l} 公分、寬 ${p.w} 公分、高 ${p.h} 公分。只貼盒子的上面。貼紙剛好貼滿。貼紙的面積是多少？`, k: 'one' },
    { e: '🧻', t: p => `面紙盒長 ${p.l} 公分、寬 ${p.w} 公分、高 ${p.h} 公分。外面全部貼上色紙，要多少色紙？`, k: 'all' }
  ];
  const wordAns = p => p.k === 'all' ? total(p) : p.k === 'open' ? openTotal(p) : p.l * p.w;
  A.register('sWord', {
    methods, makeProblem: (level, i) => { const b = box(level, i), w = pick(WORD, i); return { ...b, k: w.k, e: w.e, prompt: w.t(b) }; },
    planFigure: ctx => boxSVG(ctx.problem, { edges: ['l', 'w', 'h'] }),
    steps: [
      { title: '要算哪些面', ids: ['which'], hints: ['讀一讀：要包住、塗或貼在哪裡？', '整個包住是 6 個面；沒有蓋子是 5 個面；只有上面是 1 個面。', '先找要算的面，再算。'], think: '老師先找：要算哪幾個面。', together: '一起讀題：要算哪些面？',
        figure: ctx => boxSVG(ctx.problem, { edges: ['l', 'w', 'h'] }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${ctx.problem.e} ${esc(ctx.problem.prompt)}</p>${ctx.choice('which', '要算哪些面？', [['all', '全部 6 個面'], ['open', '5 個面（沒有上面）'], ['one', '只有上面 1 個面'], ['vol', '裡面可以裝多少']])}`,
        check: ctx => !ctx.answers.which ? { code: 'which', msg: '先選一個答案。' } : ctx.answers.which === ctx.problem.k ? null
          : { code: 'which', obs: ctx.answers.which === 'vol' ? 'choseVolume' : ctx.answers.which === 'one' ? 'eqOneFace' : 'missFace', msg: ctx.answers.which === 'vol' ? '這題是在外面，不是裝在裡面。' : '再讀一次題目：要包、塗或貼在哪裡？' },
        solve: ctx => { ctx.answers.which = ctx.problem.k; }, say: ex => ({ all: '全部 6 個面。', open: '5 個面，沒有上面。', one: '只有上面 1 個面。' })[ex.problem.k] },
      { title: '算一算', ids: ['total'], hints: ['先算三種面：長×寬、長×高、寬×高。', '再看每種要幾個。', '6 個面：三種各 2 個；5 個面：上面不算；1 個面：長 × 寬。'], think: '先算三種面，再依要算的面加起來。', together: '一起算。',
        figure: ctx => netSVG(ctx.problem, { labels: true, nums: true, colored: ctx.problem.k === 'one' ? ['tb'] : ['tb', 'fb', 'lr'] }),
        answer: ctx => fieldHtml(ctx, 'total', '答案是多少？', 1),
        check: ctx => { const v = num(ctx.answers.total), p = ctx.problem, t = wordAns(p); if (v === null) return { code: 'total', msg: '把答案填進去。' }; if (v === t) return null;
          return { code: 'total', obs: p.k === 'open' && v === total(p) ? 'other' : surfObs(v, t, p), msg: p.k === 'open' && v === total(p) ? '這題沒有上面，要少算一個面。' : '先算三種面，再依要算的面加起來。' }; },
        solve: ctx => { ctx.answers.total = String(wordAns(ctx.problem)); }, say: ex => `答案是 ${wordAns(ex.problem)}。` },
      unitStep(2, '面積')
    ],
    reasons, done: ctx => `答案是 ${wordAns(ctx.problem)} 平方公分。`, chant: '先找要算哪些面，再加起來。', transfer: '量一量家裡的面紙盒，算算要多少色紙才能貼滿。'
  });
})();

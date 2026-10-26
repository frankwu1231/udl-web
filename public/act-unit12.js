'use strict';
// 單元 1「面積是什麼」與單元 2「周長和面積」的活動（N-2-12、N-3-14、S-4-3）
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, rectCells, key, gridSVG, outlineOf, bounds, num, fieldHtml } = U;
  const U40 = 40;
  const pressed = (ctx, id, v) => ctx.answers[id] === v;

  // 在同一張方格圖上，並排畫兩個圖形 A、B
  function twoShapes(ctx, p, opts = {}) {
    const { clickable = false, marksA = [], marksB = [], showCount = false, pulse = false } = opts;
    const bA = bounds(p.A), bB = bounds(p.B), gap = 2, offB = bA.w + gap;
    const cols = bA.w + gap + bB.w, rows = Math.max(bA.h, bB.h);
    const cell = (c, which, i) => {
      const marks = which === 'A' ? marksA : marksB, k = key(c), order = marks.indexOf(k);
      return { x: c[0] + (which === 'B' ? offB : 0), y: c[1], cls: `${which === 'A' ? 'ac-a' : 'ac-b'}${order >= 0 ? ' ac-mark' : ''}${clickable ? ' ac-hit' : ''}${pulse && order < 0 ? ' ac-pulse' : ''}`, label: order >= 0 ? order + 1 : '', attrs: clickable ? `data-cell="${which}:${k}" role="button" aria-label="${which} 的一格${order >= 0 ? '，第' + (order + 1) + '個' : ''}"` : '' };
    };
    const cells = [...p.A.map((c, i) => cell(c, 'A', i)), ...p.B.map((c, i) => cell(c, 'B', i))];
    const tag = (x, t) => `<text x="${x * U40}" y="-8" class="ac-tag">${t}</text>`;
    const outline = outlineOf(p.A) + outlineOf(p.B.map(c => [c[0] + offB, c[1]]));
    return gridSVG({ cols, rows, cells, outline, lines: opts.lines !== false, extra: tag(0, 'A') + tag(offB, 'B'), aria: `圖形 A 和圖形 B${showCount ? `，A 有 ${p.A.length} 格，B 有 ${p.B.length} 格` : ''}` });
  }
  function bindMarks(ctx, s, field) {
    document.querySelectorAll(`#figure${s} [data-cell]`).forEach(el => el.onclick = () => {
      const [w, k] = el.dataset.cell.split(':'), list = ctx.state['marks' + w] = ctx.state['marks' + w] || [];
      const i = list.indexOf(k); if (i >= 0) list.splice(i, 1); else list.push(k);
      ctx.invalidate(s); ctx.refreshFigure(s);
    });
  }
  const genericMethods = [['mark', '✋ 先動手做做看'], ['self', '🧠 先自己想，需要時看提示']];

  // =============== 1-1 比一比，哪個比較大 ===============
  const SH = {
    r32: rectCells(3, 2), r22: rectCells(2, 2), r42: rectCells(4, 2), r23: rectCells(2, 3), r33: rectCells(3, 3), r31: rectCells(3, 1),
    L5: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], T4: [[0, 0], [1, 0], [2, 0], [1, 1]], Z4: [[0, 0], [1, 0], [1, 1], [2, 1]],
    P6: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], L6: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]], U7: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [2, 2]],
    S7: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]], C8: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]]
  };
  const CMP = { easy: [['r32', 'r22'], ['r22', 'r33'], ['r42', 'r31']], standard: [['L5', 'T4'], ['Z4', 'P6'], ['U7', 'L6']], challenge: [['P6', 'L6'], ['S7', 'U7'], ['C8', 'S7']] };
  A.register('compare', {
    methods: genericMethods,
    makeProblem(level, i, random = Math.random) {
      const [a, b] = pick(CMP[level] || CMP.standard, i); const swap = random() < 0.5;
      return { A: SH[swap ? b : a], B: SH[swap ? a : b], prompt: '圖形 A 和圖形 B，哪一個的面積比較大？' };
    },
    planFigure: ctx => twoShapes(ctx, ctx.problem, { lines: false }),
    truth: p => p.A.length > p.B.length ? 'A' : p.A.length < p.B.length ? 'B' : 'same',
    steps: [
      { title: '猜一猜', ids: ['guess'], hints: ['先用眼睛看，猜一猜。', '看看哪一個佔的地方比較多。', '猜錯也沒關係，等一下會數格子檢查。'],
        think: '老師先用眼睛看，猜一猜哪一個比較大。', together: '一起想：用眼睛看，哪一個比較大？',
        figure: ctx => twoShapes(ctx, ctx.problem, { lines: false }),
        answer: ctx => ctx.choice('guess', '你猜哪一個比較大？', [['A', 'A 比較大'], ['B', 'B 比較大'], ['same', '一樣大']], true) + '<p class="subtle" data-read data-say>這一步沒有對錯，等一下會檢查。</p>',
        check: ctx => ctx.answers.guess ? null : { code: 'guess', msg: '先猜一猜，選一個。' },
        solve: ctx => { ctx.answers.guess = 'A'; }, say: () => '老師猜 A 比較大，等一下數格子檢查。' },
      { title: '數一數', ids: ['countA', 'countB'], hints: ['一格一格點，數 A 和 B 各有幾格。', '點過的格子會出現數字，看看還有沒有漏掉的。', 'A 和 B 分開數，最後一格的數字就是格數。'],
        think: '老師一格一格點，A 和 B 分開數。', together: '一起數：A 有幾格？B 有幾格？',
        figure: ctx => twoShapes(ctx, ctx.problem, { clickable: true, marksA: ctx.state.marksA || [], marksB: ctx.state.marksB || [], pulse: ctx.hint(1) >= 2 }),
        answer: ctx => `<p data-read data-say>點格子數一數，再填格數。</p>${fieldHtml(ctx, 'countA', 'A 有幾格？', 1)}${fieldHtml(ctx, 'countB', 'B 有幾格？', 1)}`,
        bind: ctx => bindMarks(ctx, 1),
        check: ctx => { const a = num(ctx.answers.countA), b = num(ctx.answers.countB);
          if (a === null || b === null) return { code: 'count', msg: '請填 A 和 B 各有幾格。' };
          if (a !== ctx.problem.A.length) return { code: 'count', msg: '再數一次 A，可以點格子幫忙。' };
          if (b !== ctx.problem.B.length) return { code: 'count', msg: '再數一次 B，可以點格子幫忙。' }; return null; },
        solve: ctx => { ctx.state.marksA = ctx.problem.A.map(key); ctx.state.marksB = ctx.problem.B.map(key); ctx.answers.countA = String(ctx.problem.A.length); ctx.answers.countB = String(ctx.problem.B.length); },
        say: ex => `A 有 ${ex.problem.A.length} 格，B 有 ${ex.problem.B.length} 格。` },
      { title: '比一比', ids: ['cmp'], hints: ['格子多的，面積比較大。', '比一比 A 和 B 的格數，哪個多？', '格數一樣多，面積就一樣大。'],
        think: '格子比較多的，面積比較大。', together: '一起想：誰的格子比較多？',
        figure: ctx => twoShapes(ctx, ctx.problem, { showCount: true }),
        answer: ctx => `<p data-read data-say>A 有 ${ctx.problem.A.length} 格，B 有 ${ctx.problem.B.length} 格。</p>${ctx.choice('cmp', '哪一個的面積比較大？', [['A', 'A 比較大'], ['B', 'B 比較大'], ['same', '一樣大']], true)}`,
        check: ctx => { if (!ctx.answers.cmp) return { code: 'cmp', msg: '選一個答案。' }; return ctx.answers.cmp === ctx.plugin.truth(ctx.problem) ? null : { code: 'cmp', msg: `A 有 ${ctx.problem.A.length} 格，B 有 ${ctx.problem.B.length} 格，哪個比較多？` }; },
        solve: ctx => { ctx.answers.cmp = ctx.plugin.truth(ctx.problem); }, say: ex => '格子比較多的，面積比較大。' }
    ],
    reasons: [['count', '數格子'], ['look', '用眼睛看'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => { const t = ctx.plugin.truth(ctx.problem), g = ctx.answers.guess; return `A 有 ${ctx.problem.A.length} 格，B 有 ${ctx.problem.B.length} 格，${t === 'same' ? '一樣大' : t + ' 比較大'}。${g ? (g === t ? '你一開始就猜對了！' : '數格子讓你找到正確答案！') : ''}`; },
    chant: '比面積：數一數，格子多的比較大。', transfer: '找一找：課本和筆記本，哪一個的封面比較大？'
  });

  // =============== 1-2 鋪方格 ===============
  const TILE = { easy: [[3, 2], [2, 2], [4, 2]], standard: [[4, 3], [3, 3], [5, 2]], challenge: [[5, 3], [4, 4], [6, 3]] };
  function tileFig(ctx, opts = {}) {
    const [w, h] = ctx.problem.size, tiles = ctx.state.tiles || [];
    const cells = rectCells(w, h).map(c => { const k = key(c), o = tiles.indexOf(k); return { x: c[0], y: c[1], cls: `${o >= 0 ? 'ac-tile' : 'ac-empty'}${opts.clickable ? ' ac-hit' : ''}${opts.pulse && o < 0 ? ' ac-pulse' : ''}`, label: o >= 0 ? o + 1 : '', attrs: opts.clickable ? `data-tile-at="${k}" role="button" aria-label="${o >= 0 ? '已鋪' : '還沒鋪'}的位置"` : '' }; });
    return gridSVG({ cols: w, rows: h, cells, outline: `M0 0H${w * U40}V${h * U40}H0Z`, lines: !!opts.lines, aria: `${w} 公分、${h} 公分的長方形` }) + (opts.legend ? '<p class="figure-note" data-read data-say>一塊小方塊：邊長 1 公分，面積 1 平方公分。</p>' : '');
  }
  A.register('tile', {
    methods: [['mark', '✋ 一塊一塊鋪'], ['self', '🧠 先想一排要幾塊']],
    makeProblem(level, i) { const s = pick(TILE[level] || TILE.standard, i); return { size: s, prompt: '用 1 平方公分的小方塊，把長方形鋪滿。面積是多少？' }; },
    planFigure: ctx => tileFig(ctx, { legend: true }),
    steps: [
      { title: '鋪方格的規則', ids: ['rule'], hints: ['鋪的時候，要注意什麼？', '小方塊不能疊在一起，也不能留空隙。', '鋪滿、不重疊、不留空。'],
        think: '老師想：鋪方格要鋪滿、不重疊、不留空。', together: '一起想：小方塊可以疊在一起嗎？',
        figure: ctx => tileFig(ctx, { legend: true }),
        answer: ctx => ctx.choice('rule', '鋪方格要注意什麼？', [['ok', '鋪滿、不重疊、不留空'], ['any', '隨便放幾塊就好'], ['out', '可以放到長方形外面']]),
        check: ctx => !ctx.answers.rule ? { code: 'rule', msg: '選一個答案。' } : ctx.answers.rule === 'ok' ? null : { code: 'rule', msg: ctx.answers.rule === 'any' ? '隨便放，會留下空隙，就算不出面積。' : '放到外面，就不是這個長方形的面積了。' },
        solve: ctx => { ctx.answers.rule = 'ok'; }, say: () => '鋪滿、不重疊、不留空。' },
      { title: '鋪鋪看', ids: ['tiles'], hints: ['點一個空的位置，放一塊小方塊。', '看看還有沒有空的地方（閃爍的地方）。', '從左上開始，一排一排鋪，鋪到沒有空隙。'],
        think: '老師從左上開始，一排一排鋪。', together: '一起鋪：一塊一塊放，不要留空。',
        figure: ctx => tileFig(ctx, { clickable: true, pulse: ctx.hint(1) >= 2 }),
        answer: ctx => `<p data-read data-say>點長方形裡空的位置，放一塊小方塊。再點一次可以拿掉。</p><p class="subtle" data-read>已經鋪了 ${(ctx.state.tiles || []).length} 塊。</p>`,
        bind: ctx => document.querySelectorAll('#figure1 [data-tile-at]').forEach(el => el.onclick = () => { const t = ctx.state.tiles = ctx.state.tiles || [], k = el.dataset.tileAt, i = t.indexOf(k); if (i >= 0) t.splice(i, 1); else t.push(k); ctx.invalidate(1); ctx.rerender(); }),
        check: ctx => { const [w, h] = ctx.problem.size, n = (ctx.state.tiles || []).length; return n < w * h ? { code: 'gap', msg: `還有 ${w * h - n} 個空隙，要鋪滿。` } : null; },
        solve: ctx => { const [w, h] = ctx.problem.size; ctx.state.tiles = rectCells(w, h).map(key); }, say: () => '一排一排鋪，鋪滿了，沒有空隙。' },
      { title: '用了幾塊', ids: ['count'], hints: ['數一數，一共用了幾塊小方塊。', '看最後一塊的數字。', '最後一塊的數字，就是一共用了幾塊。'],
        think: '最後一塊的數字，就是一共用了幾塊。', together: '一起數：一共用了幾塊？',
        figure: ctx => tileFig(ctx, {}),
        answer: ctx => fieldHtml(ctx, 'count', '一共用了幾塊小方塊？', 2),
        check: ctx => { const [w, h] = ctx.problem.size, v = num(ctx.answers.count); return v === null ? { code: 'count', msg: '請填一共用了幾塊。' } : v === w * h ? null : { code: 'count', msg: '看最後一塊的數字，再填一次。' }; },
        solve: ctx => { const [w, h] = ctx.problem.size; ctx.state.tiles = rectCells(w, h).map(key); ctx.answers.count = String(w * h); }, say: ex => `一共用了 ${ex.problem.size[0] * ex.problem.size[1]} 塊。` },
      { title: '面積是多少', ids: ['area', 'unit'], hints: ['一塊是 1 平方公分。', '用了幾塊，就是幾平方公分。', '面積 = 塊數，單位是平方公分。'],
        think: '一塊是 1 平方公分，用了幾塊，就是幾平方公分。', together: '一起想：一塊是多少？',
        figure: ctx => tileFig(ctx, { legend: true }),
        answer: ctx => `${fieldHtml(ctx, 'area', '面積是多少？', 3)}${ctx.choice('unit', '單位是什麼？', [['cm2', '平方公分'], ['cm', '公分'], ['piece', '塊']])}`,
        check: ctx => { const [w, h] = ctx.problem.size, v = num(ctx.answers.area); if (v === null) return { code: 'area', msg: '請填面積。' }; if (v !== w * h) return { code: 'area', msg: '用了幾塊，面積就是幾平方公分。' }; if (!ctx.answers.unit) return { code: 'unit', msg: '選一個單位。' }; return ctx.answers.unit === 'cm2' ? null : { code: 'unit', msg: ctx.answers.unit === 'cm' ? '公分是量長度的。面積用平方公分。' : '「塊」要換成面積的單位：平方公分。' }; },
        solve: ctx => { const [w, h] = ctx.problem.size; ctx.answers.area = String(w * h); ctx.answers.unit = 'cm2'; }, say: ex => `面積是 ${ex.problem.size[0] * ex.problem.size[1]} 平方公分。` }
    ],
    reasons: [['tile', '一塊一塊鋪'], ['row', '一排一排想'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => `用了 ${ctx.problem.size[0] * ctx.problem.size[1]} 塊 1 平方公分的小方塊，面積是 ${ctx.problem.size[0] * ctx.problem.size[1]} 平方公分。`,
    chant: '鋪方格：鋪滿、不重疊、不留空。', transfer: '找一找：教室的地板，是用什麼鋪滿的？'
  });

  // =============== 1-3 剪開再拼，面積一樣嗎 ===============
  // from: 原圖（每格標記屬於哪一片 0/1）；to: 拼好的圖
  const CON = {
    easy: [{ from: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [2, 0, 1], [3, 0, 1], [2, 1, 1], [3, 1, 1]], to: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 2, 1], [1, 2, 1], [0, 3, 1], [1, 3, 1]] },
      { from: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 1], [1, 1, 1], [2, 1, 1]], to: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 1], [4, 0, 1], [5, 0, 1]] },
      { from: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [2, 0, 1], [2, 1, 1]], to: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 2, 1], [1, 2, 1]] }],
    standard: [{ from: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [0, 2, 1], [1, 2, 1], [2, 2, 1]], to: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 1], [4, 1, 1], [5, 1, 1]] },
      { from: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 1, 1], [1, 1, 1], [2, 1, 1], [3, 1, 1]], to: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [2, 1, 1], [3, 1, 1], [4, 1, 1], [5, 1, 1]] },
      { from: [[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 0, 1], [1, 1, 1], [1, 2, 1], [2, 0, 1], [2, 1, 1], [2, 2, 1]], to: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 1], [1, 1, 1], [2, 1, 1], [0, 2, 1], [1, 2, 1], [2, 2, 1]].map((c, i) => i < 3 ? [c[0] + 3, 2, 0] : c) }],
    challenge: [{ from: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 1], [3, 1, 1], [0, 2, 1], [1, 2, 1], [2, 2, 1], [3, 2, 1]], to: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [0, 1, 0], [1, 1, 0], [0, 2, 1], [1, 2, 1], [0, 3, 1], [1, 3, 1], [2, 3, 1], [3, 3, 1]] },
      { from: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [2, 0, 1], [3, 0, 1], [4, 0, 1], [2, 1, 1], [3, 1, 1], [4, 1, 1]], to: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 2, 1], [1, 2, 1], [2, 2, 1], [0, 3, 1], [1, 3, 1], [2, 3, 1]] },
      { from: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 1], [2, 1, 1], [0, 2, 1], [1, 2, 1], [2, 2, 1]], to: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [3, 1, 1], [4, 1, 1], [2, 2, 1], [3, 2, 1], [4, 2, 1]] }]
  };
  function conFig(ctx, which, opts = {}) {
    const p = ctx.problem, list = which === 'to' ? p.to : p.from, b = bounds(list);
    const cells = list.map(c => ({ x: c[0], y: c[1], cls: c[2] ? 'ac-piece1' : 'ac-piece0', label: opts.number ? '' : '' }));
    return `<figure class="ac-fig"><figcaption data-read>${which === 'to' ? '拼好的新圖形' : '原來的圖形'}</figcaption>${gridSVG({ cols: b.w, rows: b.h, cells, outline: outlineOf(list.map(c => [c[0], c[1]])), lines: opts.lines !== false, aria: which === 'to' ? `拼好的新圖形，${list.length} 格` : `原來的圖形，${list.length} 格` })}</figure>`;
  }
  A.register('conserve', {
    methods: genericMethods,
    makeProblem(level, i) { return { ...pick(CON[level] || CON.standard, i), prompt: '把圖形剪成兩片，再拼成新的形狀。面積會改變嗎？' }; },
    planFigure: ctx => conFig(ctx, 'from', { lines: false }),
    steps: [
      { title: '猜一猜', ids: ['guess'], hints: ['剪開再拼，會多一塊或少一塊嗎？', '想一想：有沒有拿走或加上東西？', '猜錯也沒關係，等一下會數格子。'],
        think: '老師猜：只是剪開再拼，面積一樣。', together: '一起想：剪開再拼，會變大嗎？',
        figure: ctx => conFig(ctx, 'from', { lines: false }),
        answer: ctx => ctx.choice('guess', '剪開再拼成新形狀，面積會怎樣？', [['same', '一樣大'], ['big', '變大'], ['small', '變小']], true) + '<p class="subtle" data-read data-say>這一步沒有對錯，等一下會檢查。</p>',
        check: ctx => ctx.answers.guess ? null : { code: 'guess', msg: '先猜一猜，選一個。' }, solve: ctx => { ctx.answers.guess = 'same'; }, say: () => '老師猜面積一樣，等一下檢查。' },
      { title: '剪開再拼', ids: ['moved'], hints: ['按「✂️ 剪開」，再按「🔀 拼成新形狀」。', '看看兩片顏色的位置怎麼變。', '只是移動兩片，沒有剪掉也沒有加上。'],
        think: '老師把圖形剪成兩片，再拼成新形狀。', together: '一起做：剪開，再拼起來。',
        figure: ctx => ctx.state.frame === 2 ? conFig(ctx, 'to') : conFig(ctx, 'from', { lines: ctx.state.frame === 1 }),
        answer: ctx => `<div class="actions"><button type="button" id="cutBtn" class="primary-soft" ${ctx.state.frame >= 1 ? 'disabled' : ''}>✂️ 剪開</button><button type="button" id="moveBtn" class="primary-soft" ${ctx.state.frame !== 1 ? 'disabled' : ''}>🔀 拼成新形狀</button></div>${ctx.state.frame === 2 ? '<p class="notice" data-read data-say>拼好了！兩片都還在，只是位置變了。</p>' : ''}`,
        bind: ctx => { const c = document.getElementById('cutBtn'), m = document.getElementById('moveBtn'); if (c) c.onclick = () => { ctx.state.frame = 1; ctx.answers.moved = ''; ctx.log('圖形操作', { activity: 2, frame: 1 }); ctx.rerender(); }; if (m) m.onclick = () => { ctx.state.frame = 2; ctx.answers.moved = 'yes'; ctx.log('圖形操作', { activity: 2, frame: 2 }); ctx.rerender(); }; },
        check: ctx => ctx.state.frame === 2 ? null : { code: 'move', msg: '先按「✂️ 剪開」，再按「🔀 拼成新形狀」。' },
        solve: ctx => { ctx.state.frame = 2; ctx.answers.moved = 'yes'; }, say: () => '剪成兩片，拼成新的形狀。' },
      { title: '數一數', ids: ['before', 'after'], hints: ['數原來的圖形有幾格，再數新的。', '兩個圖形都一格一格數。', '兩片的格子都沒有少，數完比一比。'],
        think: '老師數原來的有幾格，新的有幾格。', together: '一起數：兩個圖形各有幾格？',
        figure: ctx => `<div class="ac-pair">${conFig(ctx, 'from')}${conFig(ctx, 'to')}</div>`,
        answer: ctx => `${fieldHtml(ctx, 'before', '原來的圖形有幾格？', 2)}${fieldHtml(ctx, 'after', '拼好的新圖形有幾格？', 2)}`,
        check: ctx => { const n = ctx.problem.from.length, a = num(ctx.answers.before), b = num(ctx.answers.after); if (a === null || b === null) return { code: 'count', msg: '兩個都要填。' }; if (a !== n) return { code: 'count', msg: '再數一次原來的圖形。' }; if (b !== ctx.problem.to.length) return { code: 'count', msg: '再數一次新的圖形。' }; return null; },
        solve: ctx => { ctx.answers.before = String(ctx.problem.from.length); ctx.answers.after = String(ctx.problem.to.length); }, say: ex => `原來 ${ex.problem.from.length} 格，新的也是 ${ex.problem.to.length} 格。` },
      { title: '想一想', ids: ['concl'], hints: ['格數有改變嗎？', '只是移動，沒有多也沒有少。', '剪開再拼，形狀變了，面積一樣大。'],
        think: '形狀變了，但格數一樣，面積一樣大。', together: '一起想：形狀變了，面積呢？',
        figure: ctx => `<div class="ac-pair">${conFig(ctx, 'from')}${conFig(ctx, 'to')}</div>`,
        answer: ctx => ctx.choice('concl', '剪開再拼，你發現什麼？', [['same', '形狀變了，面積一樣大'], ['big', '形狀變了，面積變大'], ['shape', '形狀一樣，面積變了']]),
        check: ctx => !ctx.answers.concl ? { code: 'concl', msg: '選一個答案。' } : ctx.answers.concl === 'same' ? null : { code: 'concl', msg: '兩個圖形的格數一樣，面積呢？' },
        solve: ctx => { ctx.answers.concl = 'same'; }, say: () => '形狀變了，面積一樣大。' }
    ],
    reasons: [['move', '動手剪拼'], ['count', '數格子'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => `原來 ${ctx.problem.from.length} 格，拼好也是 ${ctx.problem.to.length} 格：形狀變了，面積一樣大。${ctx.answers.guess === 'same' ? '你一開始就猜對了！' : ''}`,
    chant: '剪一剪、拼一拼，形狀變了，面積不變。', transfer: '想一想：把一張色紙剪開再拼，面積會變嗎？'
  });

  // =============== 1-4 先估一估，再數一數 ===============
  const EST = {
    easy: [{ full: [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2]], half: [] }, { full: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]], half: [] }, { full: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2], [3, 2]], half: [] }],
    standard: [{ full: [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2]], half: [[0, 0, 'br'], [3, 0, 'bl'], [0, 2, 'tr'], [3, 2, 'tl']] },
      { full: [[1, 1], [2, 1], [1, 2], [2, 2], [3, 2]], half: [[1, 0, 'br'], [2, 0, 'bl'], [0, 1, 'br'], [0, 2, 'tr'], [3, 1, 'bl'], [4, 2, 'tl']] },
      { full: [[1, 0], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2]], half: [[0, 1, 'br'], [2, 0, 'bl']] }],
    challenge: [{ full: [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [2, 3]], half: [[1, 0, 'br'], [2, 0, 'bl'], [0, 1, 'br'], [4, 1, 'bl'], [0, 2, 'tr'], [4, 2, 'tl'], [1, 3, 'tr'], [3, 3, 'tl']] },
      { full: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 3]], half: [[1, 0, 'br'], [3, 0, 'bl'], [0, 1, 'br'], [4, 1, 'bl'], [1, 3, 'tr'], [3, 3, 'tl']] },
      { full: [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]], half: [[0, 0, 'br'], [3, 0, 'bl'], [3, 1, 'tl'], [0, 2, 'tr'], [2, 2, 'tl'], [1, 3, 'tr']] }]
  };
  function estFig(ctx, opts = {}) {
    const p = ctx.problem, all = [...p.full, ...p.half], b = bounds(all), mf = ctx.state.full || [], mh = ctx.state.half || [];
    const cells = [
      ...p.full.map(c => { const k = key(c), o = mf.indexOf(k); return { x: c[0], y: c[1], cls: `ac-fill${o >= 0 ? ' ac-mark' : ''}${opts.click === 'full' ? ' ac-hit' : ''}${opts.pulse === 'full' && o < 0 ? ' ac-pulse' : ''}`, label: opts.click === 'full' && o >= 0 ? o + 1 : '', attrs: opts.click === 'full' ? `data-est="full:${k}" role="button" aria-label="整格"` : '' }; }),
      ...p.half.map(c => { const k = key(c), o = mh.indexOf(k); return { x: c[0], y: c[1], half: c[2], cls: `ac-half${o >= 0 ? ' ac-mark2' : ''}${opts.click === 'half' ? ' ac-hit' : ''}${opts.pulse === 'half' && o < 0 ? ' ac-pulse' : ''}`, attrs: opts.click === 'half' ? `data-est="half:${k}" role="button" aria-label="半格"` : '' }; })
    ];
    const marks = opts.click === 'half' ? mh.map((k, i) => { const [x, y] = k.split(',').map(Number); return `<text x="${x * U40 + U40 / 2}" y="${y * U40 + U40 / 2 + 6}" text-anchor="middle" class="ac-num">${i + 1}</text>`; }).join('') : '';
    return gridSVG({ cols: Math.max(b.w, 4), rows: Math.max(b.h, 3), cells, lines: true, extra: marks, aria: '不規則的圖形，畫在 1 公分方格上' });
  }
  A.register('estimate', {
    methods: genericMethods,
    makeProblem(level, i) { return { ...pick(EST[level] || EST.standard, i), prompt: '這個圖形的面積大約是多少平方公分？先估一估，再數一數。' }; },
    planFigure: ctx => estFig(ctx),
    total: p => p.full.length + p.half.length / 2,
    steps: [
      { title: '先估一估', ids: ['guess'], hints: ['看一看，大約有幾格？', '把缺一角的格子湊一湊，大約幾格？', '估的沒有對錯，填一個你覺得差不多的數。'],
        think: '老師先用眼睛看，估大約有幾格。', together: '一起估：大約有幾格？',
        figure: ctx => estFig(ctx), answer: ctx => fieldHtml(ctx, 'guess', '你估大約幾平方公分？', 0) + '<p class="subtle" data-read data-say>估的沒有對錯，等一下會數。</p>',
        check: ctx => num(ctx.answers.guess) === null ? { code: 'guess', msg: '填一個你估的數字。' } : null,
        solve: ctx => { ctx.answers.guess = String(Math.round(ctx.plugin.total(ctx.problem))); }, say: () => '老師估一估，大約幾格。' },
      { title: '數整格', ids: ['full'], hints: ['先數完整的格子，點一點。', '缺一角的先不要數，只數完整的。', '點過的整格會出現數字，最後的數字就是整格數。'],
        think: '老師先點完整的格子，一格一格數。', together: '一起數：完整的格子有幾格？',
        figure: ctx => estFig(ctx, { click: 'full', pulse: ctx.hint(1) >= 2 ? 'full' : '' }), answer: ctx => fieldHtml(ctx, 'full', '整格有幾格？', 1),
        bind: ctx => document.querySelectorAll('#figure1 [data-est]').forEach(el => el.onclick = () => { const k = el.dataset.est.split(':')[1], l = ctx.state.full = ctx.state.full || [], i = l.indexOf(k); if (i >= 0) l.splice(i, 1); else l.push(k); ctx.invalidate(1); ctx.refreshFigure(1); }),
        check: ctx => { const v = num(ctx.answers.full); return v === null ? { code: 'full', msg: '請填整格有幾格。' } : v === ctx.problem.full.length ? null : { code: 'full', msg: '再數一次完整的格子，可以點格子幫忙。' }; },
        solve: ctx => { ctx.state.full = ctx.problem.full.map(key); ctx.answers.full = String(ctx.problem.full.length); }, say: ex => `整格有 ${ex.problem.full.length} 格。` },
      { title: '數半格', ids: ['half'], hints: ['再數一半的格子（三角形的），點一點。', '一半的格子，兩個湊成一格。', '半格有幾個？兩個半格是一格。'],
        think: '老師再數一半的格子，兩個半格湊成一格。', together: '一起數：半格有幾個？',
        figure: ctx => estFig(ctx, { click: 'half', pulse: ctx.hint(2) >= 2 ? 'half' : '' }),
        answer: ctx => ctx.problem.half.length ? fieldHtml(ctx, 'half', '半格有幾個？', 2) : '<p data-read data-say>這個圖形沒有半格，填 0。</p>' + fieldHtml(ctx, 'half', '半格有幾個？', 2),
        bind: ctx => document.querySelectorAll('#figure2 [data-est]').forEach(el => el.onclick = () => { const k = el.dataset.est.split(':')[1], l = ctx.state.half = ctx.state.half || [], i = l.indexOf(k); if (i >= 0) l.splice(i, 1); else l.push(k); ctx.invalidate(2); ctx.refreshFigure(2); }),
        check: ctx => { const v = num(ctx.answers.half); return v === null ? { code: 'half', msg: '請填半格有幾個。' } : v === ctx.problem.half.length ? null : { code: 'half', msg: '再數一次一半的格子。' }; },
        solve: ctx => { ctx.state.half = ctx.problem.half.map(key); ctx.answers.half = String(ctx.problem.half.length); }, say: ex => `半格有 ${ex.problem.half.length} 個。` },
      { title: '合起來', ids: ['total'], hints: ['兩個半格是一格。', '整格的數，加上半格數 ÷ 2。', '面積 = 整格 + 半格 ÷ 2。'],
        think: '整格加上半格的一半，就是面積。', together: '一起算：整格加上半格湊成的格子。',
        figure: ctx => estFig(ctx),
        answer: ctx => `<p data-read data-say>整格 ${ctx.problem.full.length} 格，半格 ${ctx.problem.half.length} 個（${ctx.problem.half.length / 2} 格）。</p>${fieldHtml(ctx, 'total', '面積大約是幾平方公分？', 3)}`,
        check: ctx => { const v = num(ctx.answers.total), t = ctx.plugin.total(ctx.problem); return v === null ? { code: 'total', msg: '請填面積。' } : v === t ? null : { code: 'total', msg: v === ctx.problem.full.length + ctx.problem.half.length ? '半格要兩個湊成一格。' : '整格 + 半格 ÷ 2，再算一次。' }; },
        solve: ctx => { ctx.answers.total = String(ctx.plugin.total(ctx.problem)); }, say: ex => `合起來大約是 ${ex.plugin.total(ex.problem)} 平方公分。` }
    ],
    reasons: [['guess', '先估一估'], ['count', '數格子'], ['half', '兩個半格湊一格'], ['hint', '看提示']],
    done: ctx => { const t = ctx.plugin.total(ctx.problem), g = num(ctx.answers.guess); const d = g === null ? null : Math.abs(g - t); return `面積大約是 ${t} 平方公分。你估 ${g ?? '—'}，${d === 0 ? '估得剛剛好！' : d <= 2 ? `只差 ${d}，估得很接近！` : `差 ${d}，下次可以先數一排再估。`}`; },
    chant: '估一估：整格先數，兩個半格湊一格。', transfer: '估一估：你的手掌大約是幾平方公分？'
  });

  // =============== 2-1 周長 ===============
  const PER = { easy: [[3, 2], [4, 2], [3, 1]], standard: [[5, 3], [4, 3], [6, 2]], challenge: [[4, 4], [5, 5], [3, 3]] };
  function perFig(ctx, opts = {}) {
    const [w, h] = ctx.problem.size, done = ctx.state.sides || [];
    const sides = [{ k: 'top', d: `M0 0H${w * U40}`, len: w, tx: w * U40 / 2, ty: -10 }, { k: 'right', d: `M${w * U40} 0V${h * U40}`, len: h, tx: w * U40 + 10, ty: h * U40 / 2 + 6, a: 'start' }, { k: 'bottom', d: `M0 ${h * U40}H${w * U40}`, len: w, tx: w * U40 / 2, ty: h * U40 + 24 }, { k: 'left', d: `M0 0V${h * U40}`, len: h, tx: -10, ty: h * U40 / 2 + 6, a: 'end' }];
    const extra = sides.map((s, i) => { const on = done.includes(s.k); return `<path d="${s.d}" class="ac-side${on ? ' on' : ''}${opts.pulse && !on ? ' ac-pulse-line' : ''}"/>${opts.click ? `<path d="${s.d}" class="ac-side-hit" data-side="${s.k}" role="button" aria-label="${['上', '右', '下', '左'][i]}邊"/>` : ''}${on || opts.all ? `<text x="${s.tx}" y="${s.ty}" text-anchor="${s.a || 'middle'}" class="ac-len">${s.len} 公分</text>` : ''}`; }).join('');
    return gridSVG({ cols: w, rows: h, cells: rectCells(w, h).map(c => ({ x: c[0], y: c[1], cls: 'ac-fill' })), extra, lines: true, pad: 60, aria: `${w} 公分、${h} 公分的${w === h ? '正方形' : '長方形'}` });
  }
  const perimeter = p => 2 * (p.size[0] + p.size[1]);
  A.register('perimeter', {
    methods: genericMethods,
    makeProblem(level, i) { const s = pick(PER[level] || PER.standard, i); return { size: s, prompt: `這個${s[0] === s[1] ? '正方形' : '長方形'}的周長是多少公分？` }; },
    planFigure: ctx => perFig(ctx, { all: true }),
    steps: [
      { title: '什麼是周長', ids: ['what'], hints: ['周長是在量哪裡？', '沿著邊走一圈。', '周長是沿著邊走一圈的長度。'],
        think: '周長是沿著邊走一圈的長度。', together: '一起想：周長是裡面，還是邊？',
        figure: ctx => perFig(ctx, {}), answer: ctx => ctx.choice('what', '周長是什麼？', [['edge', '沿著邊走一圈的長度'], ['inside', '圖形裡面的大小'], ['corner', '圖形有幾個角']]),
        check: ctx => !ctx.answers.what ? { code: 'what', msg: '選一個答案。' } : ctx.answers.what === 'edge' ? null : { code: 'what', msg: ctx.answers.what === 'inside' ? '裡面的大小是面積。周長是邊。' : '周長是長度，不是數角。' },
        solve: ctx => { ctx.answers.what = 'edge'; }, say: () => '周長是沿著邊走一圈的長度。' },
      { title: '走一圈', ids: ['walk'], hints: ['點每一條邊，看它多長。', '還有沒點到的邊（閃爍的邊）。', '上、右、下、左，四條邊都要走到。'],
        think: '老師沿著邊走一圈：上、右、下、左。', together: '一起走：點每一條邊。',
        figure: ctx => perFig(ctx, { click: true, pulse: ctx.hint(1) >= 2 }),
        answer: ctx => `<p data-read data-say>沿著邊走一圈，點每一條邊。</p><p class="subtle" data-read>已經走了 ${(ctx.state.sides || []).length}／4 條邊。</p>`,
        bind: ctx => document.querySelectorAll('#figure1 [data-side]').forEach(el => el.onclick = () => { const l = ctx.state.sides = ctx.state.sides || []; if (!l.includes(el.dataset.side)) l.push(el.dataset.side); ctx.invalidate(1); ctx.rerender(); }),
        check: ctx => (ctx.state.sides || []).length < 4 ? { code: 'walk', msg: `還有 ${4 - (ctx.state.sides || []).length} 條邊沒走到。` } : null,
        solve: ctx => { ctx.state.sides = ['top', 'right', 'bottom', 'left']; }, say: ex => `四條邊是 ${ex.problem.size[0]}、${ex.problem.size[1]}、${ex.problem.size[0]}、${ex.problem.size[1]} 公分。` },
      { title: '算周長', ids: ['formula', 'per'], hints: ['四條邊加起來。', '長 + 寬 + 長 + 寬。', '周長 = （長 + 寬）× 2。'],
        think: '四條邊加起來，就是周長。', together: '一起算：四條邊加起來。',
        figure: ctx => perFig(ctx, { all: true }),
        answer: ctx => `${ctx.choice('formula', '選一個算周長的算式', [['sum', '長 + 寬 + 長 + 寬'], ['area', '長 × 寬'], ['two', '長 + 寬']])}${fieldHtml(ctx, 'per', '周長是幾公分？', 2)}`,
        check: ctx => { if (!ctx.answers.formula) return { code: 'formula', msg: '先選一個算式。' }; if (ctx.answers.formula !== 'sum') return { code: 'formula', msg: ctx.answers.formula === 'area' ? '長 × 寬是面積。周長是四條邊加起來。' : '長 + 寬只有半圈，還要再走一半。' }; const v = num(ctx.answers.per); return v === null ? { code: 'per', msg: '請填周長。' } : v === perimeter(ctx.problem) ? null : { code: 'per', msg: '四條邊加起來，再算一次。' }; },
        solve: ctx => { ctx.answers.formula = 'sum'; ctx.answers.per = String(perimeter(ctx.problem)); }, say: ex => `四條邊加起來，周長是 ${perimeter(ex.problem)} 公分。` },
      { title: '寫單位', ids: ['unit'], hints: ['周長是長度。', '長度用公分。', '周長的單位是公分，不是平方公分。'],
        think: '周長是長度，單位是公分。', together: '一起想：周長是長度還是面積？',
        figure: ctx => perFig(ctx, { all: true }), answer: ctx => ctx.choice('unit', '周長用哪個單位？', [['cm', '公分'], ['cm2', '平方公分'], ['piece', '格']]),
        check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === 'cm' ? null : { code: 'unit', msg: ctx.answers.unit === 'cm2' ? '平方公分是面積的單位。周長是長度。' : '周長是長度，用公分。' },
        solve: ctx => { ctx.answers.unit = 'cm'; }, say: () => '周長的單位是公分。' }
    ],
    reasons: [['walk', '沿著邊走一圈'], ['formula', '選對算式'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => `周長是 ${perimeter(ctx.problem)} 公分。（面積是 ${ctx.problem.size[0] * ctx.problem.size[1]} 平方公分，兩個不一樣喔！）`,
    chant: '周長：沿著邊走一圈，四條邊加起來。', transfer: '找一找：教室的門，周長要怎麼量？'
  });

  // =============== 2-2 要算面積還是周長 ===============
  const SIT = [
    ['🌷', '幫花圃圍一圈籬笆，要買多長的籬笆？', 'per'], ['🟫', '教室地板要鋪滿地墊，要多大的地墊？', 'area'], ['🎀', '沿著卡片的邊貼一圈緞帶，要多長？', 'per'],
    ['📄', '用色紙貼滿整個桌面，要多大的色紙？', 'area'], ['🏃', '繞著操場跑一圈，跑了多遠？', 'per'], ['🖌️', '把牆壁刷滿油漆，要刷多大？', 'area'],
    ['🖼️', '幫一幅畫加上一圈畫框，畫框要多長？', 'per'], ['🌱', '在菜園裡種滿青菜，菜園有多大？', 'area'], ['🧵', '沿著桌布的邊縫一圈花邊，要多長？', 'per'], ['🧱', '在牆上貼滿磁磚，要貼多大？', 'area']
  ];
  function sitStep(n) {
    const id = 'sit' + n;
    return { title: '情境 ' + (n + 1), ids: [id], hints: ['想一想：是沿著邊，還是蓋滿裡面？', '沿著邊走一圈 → 周長；蓋滿裡面 → 面積。', '圍、繞、沿著邊 → 周長；鋪、貼滿、刷滿 → 面積。'],
      think: '老師想：是沿著邊，還是蓋滿裡面？', together: '一起想：這是沿著邊，還是蓋滿？',
      figure: ctx => { const s = ctx.problem.sits[n], ans = ctx.checked && ctx.checked(n); return `<div class="ac-sit"><span aria-hidden="true">${s[0]}</span>${ans ? `<svg viewBox="-10 -10 140 100" class="ac-mini" role="img" aria-label="${s[2] === 'per' ? '沿著邊' : '蓋滿裡面'}">${s[2] === 'per' ? '<rect x="0" y="0" width="120" height="80" class="ac-mini-in"/><rect x="0" y="0" width="120" height="80" class="ac-mini-edge"/>' : '<rect x="0" y="0" width="120" height="80" class="ac-mini-fill"/>'}</svg>` : ''}</div>`; },
      answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.sits[n][1])}</p>${ctx.choice(id, '要算面積，還是周長？', [['area', '面積（蓋滿裡面）'], ['per', '周長（沿著邊一圈）']], true)}`,
      check: ctx => !ctx.answers[id] ? { code: 'which', msg: '選一個答案。' } : ctx.answers[id] === ctx.problem.sits[n][2] ? null : { code: 'which', msg: ctx.problem.sits[n][2] === 'per' ? '這是沿著邊一圈的長度，是周長。' : '這是要蓋滿裡面，是面積。' },
      solve: ctx => { ctx.answers[id] = ctx.problem.sits[n][2]; }, say: ex => ex.problem.sits[n][2] === 'per' ? '沿著邊一圈，是周長。' : '蓋滿裡面，是面積。' };
  }
  A.register('which', {
    methods: genericMethods,
    makeProblem(level, i, random = Math.random) { const l = U.shuffle(SIT, random); let sits = l.slice(0, 3); if (!sits.some(s => s[2] === 'per')) sits[2] = SIT[0]; if (!sits.some(s => s[2] === 'area')) sits[2] = SIT[1]; return { sits, prompt: '生活中的問題，要算面積還是周長？' }; },
    planFigure: ctx => `<div class="ac-sitrow">${ctx.problem.sits.map(s => `<span aria-hidden="true">${s[0]}</span>`).join('')}</div>`,
    steps: [sitStep(0), sitStep(1), sitStep(2)],
    reasons: [['key', '找關鍵字（圍、鋪）'], ['picture', '想像圖形'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => `三個情境都判斷好了：${ctx.problem.sits.map(s => s[2] === 'per' ? '周長' : '面積').join('、')}。`,
    chant: '圍一圈算周長，鋪滿算面積。', transfer: '想一想：幫教室的窗戶貼窗花和貼一圈膠帶，各要算什麼？'
  });

  // =============== 2-3 周長一樣，面積也一樣嗎 ===============
  const SAME = { easy: [[[5, 1], [3, 3]], [[4, 2], [5, 1]], [[4, 1], [3, 2]]], standard: [[[6, 2], [4, 4]], [[5, 3], [6, 2]], [[7, 1], [4, 4]]], challenge: [[[6, 1], [3, 2], 'area'], [[8, 1], [4, 2], 'area'], [[9, 1], [3, 3], 'area']] };
  function sameFig(ctx, opts = {}) {
    const [a, b] = ctx.problem.rects, gap = 2, cols = a[0] + gap + b[0], rows = Math.max(a[1], b[1]);
    const cells = [...rectCells(a[0], a[1]).map(c => ({ x: c[0], y: c[1], cls: 'ac-a' })), ...rectCells(b[0], b[1], a[0] + gap).map(c => ({ x: c[0], y: c[1], cls: 'ac-b' }))];
    const lab = (r, x0) => opts.labels ? `<text x="${x0 * U40 + r[0] * U40 / 2}" y="${r[1] * U40 + 22}" text-anchor="middle" class="ac-len">${r[0]} 公分</text><text x="${x0 * U40 - 8}" y="${r[1] * U40 / 2 + 6}" text-anchor="end" class="ac-len">${r[1]}</text>` : '';
    return gridSVG({ cols, rows, cells, lines: opts.lines !== false, pad: 40, outline: outlineOf(rectCells(a[0], a[1])) + outlineOf(rectCells(b[0], b[1], a[0] + gap)), extra: `<text x="0" y="-10" class="ac-tag">A</text><text x="${(a[0] + gap) * U40}" y="-10" class="ac-tag">B</text>` + lab(a, 0) + lab(b, a[0] + gap), aria: `長方形 A：${a[0]} 公分、${a[1]} 公分；長方形 B：${b[0]} 公分、${b[1]} 公分` });
  }
  A.register('samePerimeter', {
    methods: genericMethods,
    makeProblem(level, i) { const [a, b, k] = pick(SAME[level] || SAME.standard, i); const sameArea = k === 'area'; return { rects: [a, b], sameArea, prompt: sameArea ? '長方形 A 和 B 的面積一樣。周長也一樣嗎？' : '長方形 A 和 B 的周長一樣。面積也一樣嗎？' }; },
    planFigure: ctx => sameFig(ctx, { labels: true, lines: false }),
    steps: [
      { title: '猜一猜', ids: ['guess'], hints: ['猜一猜，等一下算算看。', '形狀不一樣，結果會一樣嗎？', '猜錯也沒關係，等一下會算。'],
        think: '老師先猜一猜，再算算看。', together: '一起猜：會一樣嗎？',
        figure: ctx => sameFig(ctx, { labels: true, lines: false }),
        answer: ctx => ctx.choice('guess', ctx.problem.sameArea ? '面積一樣，周長也一樣嗎？' : '周長一樣，面積也一樣嗎？', [['same', '一樣'], ['diff', '不一樣']], true) + '<p class="subtle" data-read data-say>這一步沒有對錯。</p>',
        check: ctx => ctx.answers.guess ? null : { code: 'guess', msg: '先猜一猜。' }, solve: ctx => { ctx.answers.guess = 'diff'; }, say: () => '老師猜不一樣，等一下算算看。' },
      { title: '算周長', ids: ['pA', 'pB'], hints: ['周長是四條邊加起來。', '長 + 寬 + 長 + 寬。', 'A 和 B 分開算周長。'],
        think: '四條邊加起來，A 和 B 分開算。', together: '一起算：A 和 B 的周長。',
        figure: ctx => sameFig(ctx, { labels: true, lines: false }),
        answer: ctx => `${fieldHtml(ctx, 'pA', 'A 的周長是幾公分？', 1)}${fieldHtml(ctx, 'pB', 'B 的周長是幾公分？', 1)}`,
        check: ctx => { const [a, b] = ctx.problem.rects, x = num(ctx.answers.pA), y = num(ctx.answers.pB); if (x === null || y === null) return { code: 'per', msg: '兩個都要填。' }; if (x !== 2 * (a[0] + a[1])) return { code: 'per', msg: 'A：長 + 寬 + 長 + 寬，再算一次。' }; if (y !== 2 * (b[0] + b[1])) return { code: 'per', msg: 'B：長 + 寬 + 長 + 寬，再算一次。' }; return null; },
        solve: ctx => { const [a, b] = ctx.problem.rects; ctx.answers.pA = String(2 * (a[0] + a[1])); ctx.answers.pB = String(2 * (b[0] + b[1])); }, say: ex => { const [a, b] = ex.problem.rects; return `A 的周長是 ${2 * (a[0] + a[1])} 公分，B 的周長是 ${2 * (b[0] + b[1])} 公分。`; } },
      { title: '算面積', ids: ['aA', 'aB'], hints: ['面積可以數格子，也可以用長 × 寬。', '一排幾格、有幾排。', 'A 和 B 分開算面積。'],
        think: '長 × 寬，A 和 B 分開算面積。', together: '一起算：A 和 B 的面積。',
        figure: ctx => sameFig(ctx, { labels: true }),
        answer: ctx => `${fieldHtml(ctx, 'aA', 'A 的面積是幾平方公分？', 2)}${fieldHtml(ctx, 'aB', 'B 的面積是幾平方公分？', 2)}`,
        check: ctx => { const [a, b] = ctx.problem.rects, x = num(ctx.answers.aA), y = num(ctx.answers.aB); if (x === null || y === null) return { code: 'area', msg: '兩個都要填。' }; if (x !== a[0] * a[1]) return { code: 'area', msg: 'A：長 × 寬，或數一數格子。' }; if (y !== b[0] * b[1]) return { code: 'area', msg: 'B：長 × 寬，或數一數格子。' }; return null; },
        solve: ctx => { const [a, b] = ctx.problem.rects; ctx.answers.aA = String(a[0] * a[1]); ctx.answers.aB = String(b[0] * b[1]); }, say: ex => { const [a, b] = ex.problem.rects; return `A 的面積是 ${a[0] * a[1]}，B 是 ${b[0] * b[1]} 平方公分。`; } },
      { title: '想一想', ids: ['concl'], hints: ['比一比，哪一個一樣，哪一個不一樣？', '算出來的數字，告訴你答案。', ''].map((h, i) => h || '周長一樣，面積不一定一樣；面積一樣，周長也不一定一樣。'),
        think: '算出來的數字告訴我們：不一定一樣。', together: '一起想：算出來的結果怎麼樣？',
        figure: ctx => sameFig(ctx, { labels: true }),
        answer: ctx => ctx.choice('concl', '你發現什麼？', ctx.problem.sameArea ? [['notsure', '面積一樣，周長不一定一樣'], ['always', '面積一樣，周長一定一樣']] : [['notsure', '周長一樣，面積不一定一樣'], ['always', '周長一樣，面積一定一樣']]),
        check: ctx => !ctx.answers.concl ? { code: 'concl', msg: '選一個答案。' } : ctx.answers.concl === 'notsure' ? null : { code: 'concl', msg: '看看你算出來的兩個數，一樣嗎？' },
        solve: ctx => { ctx.answers.concl = 'notsure'; }, say: ex => ex.problem.sameArea ? '面積一樣，周長不一定一樣。' : '周長一樣，面積不一定一樣。' }
    ],
    reasons: [['calc', '算算看'], ['count', '數格子'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => { const [a, b] = ctx.problem.rects; return `A：周長 ${2 * (a[0] + a[1])} 公分、面積 ${a[0] * a[1]} 平方公分；B：周長 ${2 * (b[0] + b[1])} 公分、面積 ${b[0] * b[1]} 平方公分。${ctx.problem.sameArea ? '面積一樣，周長不一定一樣。' : '周長一樣，面積不一定一樣。'}`; },
    chant: '周長和面積，是兩件不一樣的事。', transfer: '想一想：用同一條 12 公分的繩子圍長方形，可以圍出不同大小嗎？'
  });
})();

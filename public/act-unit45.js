'use strict';
// 單元 4「梯形」（S-5-2、s-III-1）與單元 5「生活應用題」（R-4-3、N-4-11）
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml } = U;
  const genericMethods = [['mark', '✂️ 先動手拼拼看'], ['self', '🧠 先自己算，需要時看提示']];

  // =============== 4-3 梯形 ===============
  const TRA = { easy: [[2, 4, 2, 1], [3, 5, 2, 1], [2, 6, 3, 2]], standard: [[3, 7, 4, 2], [4, 6, 3, 1], [2, 8, 4, 3]], challenge: [[5, 9, 4, 1], [3, 9, 5, 4], [6, 10, 4, 2]] };   // [上底, 下底, 高, 上底左端位移]
  const area = p => (p.t + p.b) * p.h / 2;
  function traFig(ctx, o = {}) {
    const p = ctx.problem, u = Math.min(36, 360 / (p.t + p.b + 1)), H = p.h * u, y = H + 20, x0 = 30;
    const P = [[x0, y], [x0 + p.b * u, y], [x0 + (p.off + p.t) * u, y - H], [x0 + p.off * u, y - H]];
    const pts = a => a.map(q => q.map(n => Math.round(n)).join(',')).join(' ');
    const foot = [x0 + p.off * u, y], top = [x0 + p.off * u, y - H];
    let g = '';
    if (o.frame === 2) {   // 兩片拼成平行四邊形：第二片轉 180 度接在右邊
      const R = P.map(q => [x0 + p.b * u + (x0 + (p.off + p.t) * u) - q[0], 2 * y - H - q[1]]);
      g += `<polygon points="${pts(P)}" class="ac-piece0"/><polygon points="${pts(R)}" class="ac-piece1"/>`;
      g += `<text x="${x0 + (p.t + p.b) * u / 2}" y="${y + 30}" text-anchor="middle" class="ac-len">上底 + 下底</text>`;
    } else {
      g += `<polygon points="${pts(P)}" class="ac-fill${o.pulse ? ' ac-pulse' : ''}"/>`;
      if (o.frame === 1) g += `<polygon points="${pts(P.map(q => [q[0] + (p.b + 2) * u, q[1]]))}" class="ac-piece1"/>`;
    }
    const edge = (k, a, b, label, show) => `<path d="M${pts([a])}L${pts([b])}" class="ac-side${show ? ' on' : ''}"/>${o.clickEdges ? `<path d="M${pts([a])}L${pts([b])}" class="ac-side-hit" data-edge="${k}" role="button" aria-label="${label}"/>` : ''}${show ? `<text x="${(a[0] + b[0]) / 2}" y="${k === 'bottom' ? a[1] + 26 : a[1] - 10}" text-anchor="middle" class="ac-len">${label} ${k === 'bottom' ? p.b : p.t} 公分</text>` : ''}`;
    if (o.frame !== 2) g += edge('top', P[3], P[2], '上底', o.showTop) + edge('bottom', P[0], P[1], '下底', o.showBottom);
    if (o.lines) {
      const L = { height: [top, foot], side: [P[0], P[3]], diag: [P[3], P[1]] }, order = ['side', 'height', 'diag'];
      g += order.map((k, i) => `<path d="M${pts([L[k][0]])}L${pts([L[k][1]])}" class="ac-cut${ctx.answers.line === 'ABC'[i] ? ' on' : ''}"/><path d="M${pts([L[k][0]])}L${pts([L[k][1]])}" class="ac-side-hit" data-line="${'ABC'[i]}" role="button" aria-label="${'ABC'[i]} 線"/><text x="${(L[k][0][0] + L[k][1][0]) / 2 + (k === 'side' ? -22 : 8)}" y="${(L[k][0][1] + L[k][1][1]) / 2}" class="ac-tag">${'ABC'[i]}</text>`).join('');
    } else if (o.showHeight || o.frame === 2) g += `<path d="M${pts([top])}L${pts([foot])}" class="ac-cut on"/>`;
    if (o.lines || o.showHeight || o.frame === 2) g += `<path d="M${foot[0]} ${y - 12}h12v12" fill="none" stroke="#c2410c" stroke-width="3"/>`;
    if (o.showHeight) g += `<text x="${foot[0] + 8}" y="${y - H / 2}" class="ac-len">高 ${p.h} 公分</text>`;
    const W = x0 + ((o.frame === 1 ? 2 * p.b + 2 : o.frame === 2 ? p.t + p.b + p.off : p.b) + 1) * u;
    return `<svg class="ac-svg" viewBox="-10 -10 ${W + 40} ${y + 50}" role="img" aria-label="梯形${o.showTop ? `，上底 ${p.t} 公分` : ''}${o.showBottom ? `，下底 ${p.b} 公分` : ''}${o.showHeight ? `，高 ${p.h} 公分` : ''}${o.frame === 2 ? '，兩片拼成平行四邊形' : ''}">${g}</svg>`;
  }
  const shown = ctx => ({ showTop: ctx.checked(2) || (ctx.state.edges || []).includes('top'), showBottom: ctx.checked(2) || (ctx.state.edges || []).includes('bottom'), showHeight: ctx.checked(3) || ctx.state.lineOk });
  A.register('trapezoid', {
    methods: genericMethods,
    makeProblem(level, i) { const [t, b, h, off] = pick(TRA[level] || TRA.standard, i); return { t, b, h, off, prompt: '請算出這個梯形的面積是多少平方公分。' }; },
    planFigure: ctx => traFig(ctx, {}),
    steps: [
      { title: '看題目', ids: ['target'], hints: ['面積要算哪裡？看一看圖。', '看塗色的部分。', '面積就是圖形裡面塗色的大小。'],
        think: '老師想：面積是圖形裡面的大小。', together: '一起想：面積要算哪裡？',
        figure: ctx => traFig(ctx, { pulse: ctx.hint(0) >= 2 }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('target', '這題要找什麼？', [['inside', '圖形裡面的大小'], ['border', '沿著邊走一圈的長度'], ['corner', '圖形有幾個角']])}`,
        check: ctx => !ctx.answers.target ? { code: 'target', msg: '請先選一個答案。' } : ctx.answers.target === 'inside' ? null : { code: 'target', msg: ctx.answers.target === 'border' ? '沿著邊走一圈，是在量邊有多長。' : '數角，是在數有幾個角。' },
        solve: ctx => { ctx.answers.target = 'inside'; }, say: () => '面積是圖形裡面的大小。' },
      { title: '拿一片來拼', ids: ['relation'], hints: ['按按鈕，拿一片一樣的梯形。', '把它轉過來，拼在旁邊，變成什麼形狀？', '兩片拼成平行四邊形，一片是一半。'],
        think: '老師拿一片一樣的梯形，轉過來拼成平行四邊形。', together: '一起做：拿一片，轉過來拼起來。',
        figure: ctx => traFig(ctx, { frame: ctx.state.frame || 0 }),
        answer: ctx => `<div class="actions"><button type="button" id="trTake" class="primary-soft" ${ctx.state.frame >= 1 ? 'disabled' : ''}>拿一片一樣的梯形</button><button type="button" id="trJoin" class="primary-soft" ${ctx.state.frame !== 1 ? 'disabled' : ''}>轉過來，拼在一起</button></div>
          ${ctx.state.frame === 2 ? ctx.choice('relation', '一片梯形和拼好的平行四邊形比，怎麼樣？', [['half', '一片是拼好圖形的一半'], ['same', '一片和拼好圖形一樣大'], ['double', '一片是拼好圖形的兩倍']]) : ''}`,
        bind: ctx => { const t = document.getElementById('trTake'), j = document.getElementById('trJoin'); if (t) t.onclick = () => { ctx.state.frame = 1; ctx.log('圖形操作', { activity: 2, frame: 1 }); ctx.rerender(); }; if (j) j.onclick = () => { ctx.state.frame = 2; ctx.log('圖形操作', { activity: 2, frame: 2 }); ctx.rerender(); }; },
        check: ctx => ctx.state.frame !== 2 ? { code: 'relation', msg: '先按上面的按鈕，把兩片拼好。' } : !ctx.answers.relation ? { code: 'relation', msg: '請選一個答案。' } : ctx.answers.relation === 'half' ? null : { code: 'relation', msg: ctx.answers.relation === 'same' ? '兩片才是拼好的圖形，一片比較小。' : '一片比拼好的圖形小喔。' },
        solve: ctx => { ctx.state.frame = 2; ctx.answers.relation = 'half'; }, say: () => '兩片拼成平行四邊形，一片是一半。' },
      { title: '找上底和下底', ids: ['top', 'bottom'], hints: ['點上面和下面兩條平行的邊。', '上面的邊叫上底，下面的邊叫下底。', '點了邊就會看到長度，把數字填進去。'],
        think: '老師點上面的邊和下面的邊，看它們多長。', together: '一起找：上底和下底在哪裡？',
        figure: ctx => traFig(ctx, { clickEdges: true, ...shown(ctx), showHeight: false }),
        answer: ctx => `<p data-read data-say>點一下上面和下面的邊。</p>${fieldHtml(ctx, 'top', '上底是幾公分？', 2)}${fieldHtml(ctx, 'bottom', '下底是幾公分？', 2)}`,
        bind: ctx => document.querySelectorAll('#figure2 [data-edge]').forEach(el => el.onclick = () => { const l = ctx.state.edges = ctx.state.edges || []; if (!l.includes(el.dataset.edge)) l.push(el.dataset.edge); ctx.refreshFigure(2); }),
        check: ctx => { const t = num(ctx.answers.top), b = num(ctx.answers.bottom); if ((ctx.state.edges || []).length < 2) return { code: 'edge', msg: '先點上面和下面的邊，看它們多長。' }; if (t === null || b === null) return { code: 'tb', msg: '上底和下底都要填。' }; return t === ctx.problem.t && b === ctx.problem.b ? null : { code: 'tb', msg: t === ctx.problem.b && b === ctx.problem.t ? '上下相反了：上面是上底，下面是下底。' : '看邊旁邊的數字，再填一次。' }; },
        solve: ctx => { ctx.state.edges = ['top', 'bottom']; ctx.answers.top = String(ctx.problem.t); ctx.answers.bottom = String(ctx.problem.b); }, say: ex => `上底 ${ex.problem.t} 公分，下底 ${ex.problem.b} 公分。` },
      { title: '找高', ids: ['line', 'height'], hints: ['高要和底成直角。', '找有直角記號的線。', '斜的邊不是高；有直角記號的才是高。'],
        think: '老師找有直角記號的線，它才是高。', together: '一起找：哪一條有直角記號？',
        figure: ctx => ctx.state.lineOk ? traFig(ctx, { showTop: true, showBottom: true, showHeight: true }) : traFig(ctx, { lines: true, showTop: true, showBottom: true }),
        answer: ctx => ctx.state.lineOk ? `<p class="notice" data-read data-say>找到了！高旁邊有它的長度。</p>${fieldHtml(ctx, 'height', '高是幾公分？', 3)}` : `${ctx.choice('line', '哪一條是高？（可以點圖上的線）', [['A', 'A 線'], ['B', 'B 線'], ['C', 'C 線']], true)}<p class="subtle" data-read data-say>選好後按「檢查」。</p>`,
        bind: ctx => document.querySelectorAll('#figure3 [data-line]').forEach(el => el.onclick = () => { if (ctx.state.lineOk) return; ctx.answers.line = el.dataset.line; ctx.invalidate(3); ctx.rerender(); }),
        check: ctx => { if (!ctx.state.lineOk) { if (!ctx.answers.line) return { code: 'line', msg: '先選一條線。' }; if (ctx.answers.line !== 'B') return { code: 'line', msg: ctx.answers.line === 'A' ? '這是斜的邊，和底沒有成直角。' : '這條線斜斜的，沒有直角記號。' }; ctx.state.lineOk = true; }
          const v = num(ctx.answers.height); return v === null ? { code: 'height', soft: true, msg: '找到高了！再填它的長度。' } : v === ctx.problem.h ? null : { code: 'height', msg: '看高旁邊的數字，再填一次。' }; },
        solve: ctx => { ctx.answers.line = 'B'; ctx.state.lineOk = true; ctx.answers.height = String(ctx.problem.h); }, say: ex => `有直角記號的是高，高 ${ex.problem.h} 公分。` },
      { title: '列算式', ids: ['formula', 'ft', 'fb', 'fh'], hints: ['拼好的平行四邊形，底是上底 + 下底。', '平行四邊形是底 × 高，一片梯形呢？', '梯形面積 =（上底 + 下底）× 高 ÷ 2。'],
        think: '拼好的是（上底 + 下底）× 高，一片要再 ÷ 2。', together: '一起想：要不要 ÷ 2？',
        figure: ctx => traFig(ctx, { frame: 2 }),
        answer: ctx => `${ctx.choice('formula', '選一個算梯形面積的算式', [['half', '（上底 + 下底）× 高 ÷ 2'], ['full', '（上底 + 下底）× 高'], ['mul', '上底 × 下底 × 高']])}
          <div class="equation"><span class="op">(</span><label><span>上底</span><input id="ft" data-answer="ft" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers.ft ?? '')}"></label><span class="op">+</span><label><span>下底</span><input id="fb" data-answer="fb" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers.fb ?? '')}"></label><span class="op">) ×</span><label><span>高</span><input id="fh" data-answer="fh" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers.fh ?? '')}"></label><span class="op">÷ 2</span></div>`,
        check: ctx => { const p = ctx.problem; if (!ctx.answers.formula) return { code: 'formula', msg: '先選一個算式。' }; if (ctx.answers.formula !== 'half') return { code: 'formula', msg: ctx.answers.formula === 'full' ? '這是兩片拼好的面積，這題只有一片。' : '梯形不是用上底乘下底。想想拼好的平行四邊形。' };
          const t = num(ctx.answers.ft), b = num(ctx.answers.fb), h = num(ctx.answers.fh); if (t === null || b === null || h === null) return { code: 'ab', msg: '把上底、下底和高填進方格。' };
          return ((t === p.t && b === p.b) || (t === p.b && b === p.t)) && h === p.h ? null : { code: 'ab', msg: '方格裡要填圖上的上底、下底和高。' }; },
        solve: ctx => { const p = ctx.problem; Object.assign(ctx.answers, { formula: 'half', ft: String(p.t), fb: String(p.b), fh: String(p.h) }); }, say: ex => `（${ex.problem.t} + ${ex.problem.b}）× ${ex.problem.h} ÷ 2。` },
      { title: '算一算', ids: ['total'], hints: ['先算上底 + 下底。', '再乘高，最後除以 2。', '答案 × 2，要等於拼好的平行四邊形。'],
        think: '先加，再乘，最後除以 2。', together: '一起算：先加、再乘、再除以 2。',
        figure: ctx => traFig(ctx, { frame: 2 }),
        answer: ctx => `<p class="ac-big" data-read data-say>（${ctx.problem.t} + ${ctx.problem.b}）× ${ctx.problem.h} ÷ 2 = ？</p>${fieldHtml(ctx, 'total', '面積是多少？', 5)}`,
        check: ctx => { const v = num(ctx.answers.total), p = ctx.problem; return v === null ? { code: 'total', msg: '請填你算出的面積。' } : v === area(p) ? null : { code: 'total', msg: v === (p.t + p.b) * p.h ? '這是兩片的面積。別忘了 ÷ 2。' : v === p.t + p.b ? '還要乘高、再除以 2。' : '先加、再乘、再除以 2，再算一次。' }; },
        solve: ctx => { ctx.answers.total = String(area(ctx.problem)); }, say: ex => `面積是 ${area(ex.problem)}。` },
      { title: '寫單位', ids: ['unit'], hints: ['面積的單位是什麼？', '不是公分。', '面積要寫平方公分。'],
        think: '面積的單位是平方公分。', together: '一起想：面積的單位？',
        answer: ctx => `<p class="notice" data-read data-say>你的答案：${esc(ctx.answers.total ?? '')}</p>${ctx.choice('unit', '面積用哪個單位？', [['cm2', '平方公分'], ['cm', '公分'], ['m', '公尺']])}`,
        check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === 'cm2' ? null : { code: 'unit', msg: '這是量長度的。面積要用平方公分。' },
        solve: ctx => { ctx.answers.unit = 'cm2'; }, say: () => '面積的單位是平方公分。' }
    ],
    reasons: [['join', '拿一片來拼'], ['height', '找底和高'], ['formula', '選對算式'], ['hint', '看提示']],
    done: ctx => `（${ctx.problem.t} + ${ctx.problem.b}）× ${ctx.problem.h} ÷ 2 = ${area(ctx.problem)}，面積是 ${area(ctx.problem)} 平方公分。`,
    chant: '梯形：上底加下底，乘高，再除以二。', transfer: '找一找：生活中有什麼東西是梯形？（例如：書包的側面、溜滑梯）'
  });

  // =============== 5-1 生活應用題 ===============
  // kind: area｜per；f: 正確算式；d: 干擾算式；unit：答案的單位
  const T = [
    { e: '🌷', t: (a, b) => `花圃長 ${a} 公尺、寬 ${b} 公尺，要鋪滿草皮，要多少草皮？`, kind: 'area', f: (a, b) => [`${a} × ${b}`, a * b], d: (a, b) => [`${a} + ${b} + ${a} + ${b}`, `${a} + ${b}`], unit: 'm2' },
    { e: '🌷', t: (a, b) => `花圃長 ${a} 公尺、寬 ${b} 公尺，四周要圍一圈籬笆，籬笆要多長？`, kind: 'per', f: (a, b) => [`${a} + ${b} + ${a} + ${b}`, 2 * (a + b)], d: (a, b) => [`${a} × ${b}`, `${a} + ${b}`], unit: 'm' },
    { e: '🃏', t: (a, b) => `一張卡片長 ${a} 公分、寬 ${b} 公分，卡片的面積是多少？`, kind: 'area', f: (a, b) => [`${a} × ${b}`, a * b], d: (a, b) => [`${a} + ${b}`, `${a} × 4`], unit: 'cm2' },
    { e: '🧵', t: a => `正方形桌巾的邊長是 ${a} 公分，沿著邊縫一圈花邊，花邊要多長？`, kind: 'per', sq: true, f: a => [`${a} × 4`, 4 * a], d: a => [`${a} × ${a}`, `${a} + ${a}`], unit: 'cm' },
    { e: '🟫', t: a => `一塊正方形地磚，邊長 ${a} 公分，一塊地磚的面積是多少？`, kind: 'area', sq: true, f: a => [`${a} × ${a}`, a * a], d: a => [`${a} × 4`, `${a} + ${a}`], unit: 'cm2' },
    { e: '🏫', t: (a, b) => `教室地板長 ${a} 公尺、寬 ${b} 公尺，地板的面積是多少？`, kind: 'area', f: (a, b) => [`${a} × ${b}`, a * b], d: (a, b) => [`${a} + ${b} + ${a} + ${b}`, `${a} + ${b}`], unit: 'm2' },
    { e: '🚩', t: (a, b) => `三角形旗子的底是 ${a} 公分、高是 ${b} 公分，旗子的面積是多少？`, kind: 'area', tri: true, f: (a, b) => [`${a} × ${b} ÷ 2`, a * b / 2], d: (a, b) => [`${a} × ${b}`, `${a} + ${b}`], unit: 'cm2' }
  ];
  const SETS = { easy: [0, 1, 2], standard: [3, 4, 5, 0, 1], challenge: [6, 1, 4, 3, 5] };
  const NUMS = { easy: [[4, 2], [3, 2], [5, 3]], standard: [[8, 5], [6, 4], [9, 6]], challenge: [[12, 8], [10, 6], [14, 9]] };
  const UNIT = { cm2: '平方公分', m2: '平方公尺', cm: '公分', m: '公尺' };
  // 題目情境的簡圖：標出長和寬（三角形標底和高）；知道要算什麼後，面積塗滿、周長描邊
  function wordFig(ctx) {
    const p = ctx.problem, tp = T[p.tp], u0 = p.unit.startsWith('m') ? '公尺' : '公分', k = ctx.answers.kind === p.kind && ctx.checked(0) ? p.kind : '';
    const w = 220, h = tp.sq ? 220 : tp.tri ? 150 : Math.max(90, Math.round(220 * p.b / p.a));
    const fill = k === 'area' ? 'ac-fill' : 'ac-empty', edge = k === 'per' ? ' ac-per' : '';
    const shape = tp.tri ? `<polygon points="0,${h} ${w},${h} ${w * .35},0" class="${fill}"/><polygon points="0,${h} ${w},${h} ${w * .35},0" class="ac-outline${edge}"/><path d="M${w * .35} 0V${h}" class="ac-cut on"/><text x="${w * .35 + 8}" y="${h / 2}" class="ac-len">高 ${p.b} ${u0}</text>`
      : `<rect width="${w}" height="${h}" class="${fill}"/><rect width="${w}" height="${h}" fill="none" class="ac-outline${edge}"/><text x="${w + 10}" y="${h / 2}" class="ac-len">${tp.sq ? '' : `${p.b} ${u0}`}</text>`;
    const label = tp.tri ? `底 ${p.a} ${u0}` : `${tp.sq ? '邊長 ' : ''}${p.a} ${u0}`;
    return `<div class="ac-sit"><span aria-hidden="true">${p.emoji}</span></div><svg class="ac-svg" viewBox="-20 -20 ${w + 130} ${h + 60}" role="img" aria-label="簡圖：${label}${tp.sq || tp.tri ? '' : `，${p.b} ${u0}`}">${shape}<text x="${w / 2}" y="${h + 30}" text-anchor="middle" class="ac-len">${label}</text></svg>`;
  }
  A.register('word', {
    methods: [['mark', '✏️ 先畫圖再算'], ['self', '🧠 先自己算，需要時看提示']],
    makeProblem(level, i, random = Math.random) {
      const set = SETS[level] || SETS.standard, tp = T[set[Math.floor(random() * set.length)]];
      let [a, b] = pick(NUMS[level] || NUMS.standard, i); if (tp.tri && (a * b) % 2) b++;
      const right = tp.f(a, b), opts = U.shuffle([['ok', right[0]], ['d1', tp.d(a, b)[0]], ['d2', tp.d(a, b)[1]]], random);
      return { tp: T.indexOf(tp), a, b, text: tp.t(a, b), emoji: tp.e, kind: tp.kind, formula: right[0], answer: right[1], unit: tp.unit, opts, prompt: '讀一讀題目，想一想要算什麼，再列式計算。' };
    },
    planFigure: ctx => `${wordFig(ctx)}<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.text)}</p>`,
    steps: [
      { title: '讀題目', ids: ['kind'], hints: ['題目是要蓋滿，還是要繞一圈？', '鋪、貼滿、面積 → 面積；圍、沿著邊、一圈 → 周長。', '找一找題目裡的關鍵字。'],
        think: '老師找關鍵字：是要蓋滿，還是繞一圈？', together: '一起找：題目的關鍵字是什麼？',
        figure: wordFig,
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.text)}</p>${ctx.choice('kind', '這題要算什麼？', [['area', '面積（蓋滿裡面）'], ['per', '周長（沿著邊一圈）']], true)}`,
        check: ctx => !ctx.answers.kind ? { code: 'kind', msg: '選一個答案。' } : ctx.answers.kind === ctx.problem.kind ? null : { code: 'kind', msg: ctx.problem.kind === 'per' ? '題目說「一圈」「沿著邊」，是周長。' : '題目說「鋪滿」「面積」，是面積。' },
        solve: ctx => { ctx.answers.kind = ctx.problem.kind; }, say: ex => ex.problem.kind === 'per' ? '沿著邊一圈，要算周長。' : '要蓋滿，要算面積。' },
      { title: '選算式', ids: ['formula'], hints: ['想一想圖形：是長方形、正方形，還是三角形？', '面積用乘的；周長是邊加起來。', '三角形面積還要 ÷ 2；正方形周長是邊長 × 4。'],
        think: '老師想圖形和要算的東西，選算式。', together: '一起選：要用哪一個算式？',
        figure: wordFig,
        answer: ctx => `<p data-read data-say>${esc(ctx.problem.text)}</p>${ctx.choice('formula', '選一個算式', ctx.problem.opts, true)}`,
        check: ctx => !ctx.answers.formula ? { code: 'formula', msg: '先選一個算式。' } : ctx.answers.formula === 'ok' ? null : { code: 'formula', msg: ctx.problem.kind === 'area' ? '面積要用乘的（三角形還要 ÷ 2）。' : '周長是所有的邊加起來。' },
        solve: ctx => { ctx.answers.formula = 'ok'; }, say: ex => `算式是 ${ex.problem.formula}。` },
      { title: '算一算', ids: ['answer'], hints: ['照算式一步一步算。', '先乘或先加，再看有沒有 ÷ 2。', '算完再看一次題目，答案合理嗎？'],
        think: '老師照算式算出答案。', together: '一起算：答案是多少？',
        figure: wordFig,
        answer: ctx => `<p class="ac-big" data-read data-say>${esc(ctx.problem.formula)} = ？</p>${fieldHtml(ctx, 'answer', '答案是多少？', 2)}`,
        check: ctx => { const v = num(ctx.answers.answer); return v === null ? { code: 'answer', msg: '請填答案。' } : v === ctx.problem.answer ? null : { code: 'answer', msg: '照算式再算一次。' }; },
        solve: ctx => { ctx.answers.answer = String(ctx.problem.answer); }, say: ex => `答案是 ${ex.problem.answer}。` },
      { title: '寫單位', ids: ['unit'], hints: ['題目的長度用公分還是公尺？', '面積要加「平方」；周長不用。', '公尺 → 平方公尺；公分 → 平方公分。周長就是公分或公尺。'],
        think: '看題目的長度單位，面積要加「平方」。', together: '一起想：答案的單位？',
        answer: ctx => `<p class="notice" data-read data-say>你的答案：${esc(ctx.answers.answer ?? '')}</p>${ctx.choice('unit', '答案用哪個單位？', [['cm2', '平方公分'], ['m2', '平方公尺'], ['cm', '公分'], ['m', '公尺']], true)}`,
        check: ctx => { const u = ctx.answers.unit, p = ctx.problem; if (!u) return { code: 'unit', msg: '選一個單位。' }; if (u === p.unit) return null; const areaU = u.endsWith('2'); return { code: 'unit', msg: p.kind === 'area' && !areaU ? '面積的單位要有「平方」。' : p.kind === 'per' && areaU ? '周長是長度，不用「平方」。' : '看題目的長度是公分還是公尺。' }; },
        solve: ctx => { ctx.answers.unit = ctx.problem.unit; }, say: ex => `單位是${UNIT[ex.problem.unit]}。` }
    ],
    reasons: [['key', '找關鍵字'], ['draw', '想像圖形'], ['formula', '選對算式'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.formula} = ${ctx.problem.answer}，答案是 ${ctx.problem.answer} ${UNIT[ctx.problem.unit]}。`,
    chant: '先想要算什麼，再選算式，最後寫單位。', transfer: '出一題：用家裡的東西，出一題面積或周長的題目給同學算。'
  });
})();

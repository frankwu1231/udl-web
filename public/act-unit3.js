'use strict';
// 單元 3「長方形和正方形」的延伸活動（S-4-3、R-4-3、N-4-11）
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, rectCells, gridSVG, outlineOf, num, fieldHtml } = U;
  const U40 = 40;
  const genericMethods = [['mark', '✋ 先動手排排看'], ['self', '🧠 先自己想，需要時看提示']];
  const btn = (id, text, extra = '') => `<button type="button" id="${id}" class="primary-soft" ${extra}>${text}</button>`;

  // =============== 3-2 知道面積，找邊長 ===============
  const INV = { easy: [[6, 3], [8, 4], [12, 4]], standard: [[15, 5], [18, 6], [24, 6]], challenge: [[16, 0], [25, 0], [36, 0]] };   // [面積, 已知的一排格數]；0 表示正方形
  function invFig(ctx, opts = {}) {
    const p = ctx.problem, n = ctx.state.n || (p.square ? 1 : 1);
    const w = p.square ? n : p.a, h = p.square ? n : n;
    const cells = rectCells(w, h).map(c => ({ x: c[0], y: c[1], cls: c[1] === 0 && !p.square ? 'ac-a' : 'ac-tile' }));
    const label = p.square ? `<text x="${w * U40 / 2}" y="-10" text-anchor="middle" class="ac-len">邊長 ${n} 公分</text>` : `<text x="${w * U40 / 2}" y="-10" text-anchor="middle" class="ac-len">${p.a} 公分</text><text x="${w * U40 + 10}" y="${h * U40 / 2 + 6}" class="ac-len">${opts.showB ? n + ' 公分' : '？'}</text>`;
    return gridSVG({ cols: Math.max(w, 1), rows: Math.max(h, 1), cells, outline: outlineOf(rectCells(w, h)), extra: label, pad: 60, aria: p.square ? `正方形，邊長 ${n} 公分，${n * n} 格` : `一排 ${p.a} 格，排了 ${n} 排，一共 ${p.a * n} 格` });
  }
  // 示範：沿著最左邊一行，由上往下一排一排數，最後指向答案
  async function countRowsDemo(D, ex) {
    const p = ex.problem, w = p.square ? p.b : p.a, cells = D.els('.sd-pfig rect.ac-tile, .sd-pfig rect.ac-a');
    for (let r = 0; r < p.b; r++) { const c = cells[r * w]; if (!c) break; await D.tap(c); c.classList.add('sd-focus'); }
    await D.pointAll('.sd-ans input.sd-filled');
  }
  const invTotal = ctx => ctx.problem.square ? (ctx.state.n || 1) ** 2 : ctx.problem.a * (ctx.state.n || 1);
  A.register('inverse', {
    methods: genericMethods,
    makeProblem(level, i) { const [area, a] = pick(INV[level] || INV.standard, i); const square = a === 0; const side = square ? Math.round(Math.sqrt(area)) : area / a; return { area, a: square ? side : a, b: side, square, prompt: square ? `一個正方形的面積是 ${area} 平方公分，邊長是幾公分？` : `一個長方形的面積是 ${area} 平方公分，長是 ${a} 公分，寬是幾公分？` }; },
    planFigure: ctx => `<p class="ac-big" data-read data-say>面積 ${ctx.problem.area} 平方公分 ${ctx.problem.square ? '的正方形' : `，長 ${ctx.problem.a} 公分`}</p>`,
    steps: [
      { title: '題目知道什麼', ids: ['known'], hints: ['再讀一次題目，找出數字。', '題目告訴你面積，還有什麼？', ''].map(h => h || '知道面積，要找另一條邊。'),
        think: '老師想：題目告訴我面積，要找邊長。', together: '一起找：題目給了哪些數字？',
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('known', '題目告訴你什麼？', ctx.problem.square ? [['area', '面積，要找邊長'], ['side', '邊長，要找面積'], ['per', '周長']] : [['area', '面積和長，要找寬'], ['two', '長和寬，要找面積'], ['per', '周長']])}`,
        check: ctx => !ctx.answers.known ? { code: 'known', msg: '選一個答案。' } : ctx.answers.known === 'area' ? null : { code: 'known', msg: '題目說「面積是……」，所以面積已經知道了。' },
        solve: ctx => { ctx.answers.known = 'area'; }, say: () => '題目告訴我們面積，要找邊長。' },
      { title: '排排看', ids: ['rows'], hints: ['按「加一排」，看看一共幾格。', '一共的格數要剛好等於面積。', '格數太少就加一排，太多就拿掉一排。'],
        think: '老師一排一排加上去，加到格數剛好等於面積。', together: '一起排：再加一排，一共幾格？',
        figure: ctx => invFig(ctx),
        answer: ctx => `<p data-read data-say>${ctx.problem.square ? '按按鈕讓正方形變大或變小。' : `一排有 ${ctx.problem.a} 格。按按鈕加一排或拿掉一排。`}</p>
          <div class="actions">${btn('lessRow', ctx.problem.square ? '➖ 變小' : '➖ 拿掉一排')}${btn('moreRow', ctx.problem.square ? '➕ 變大' : '➕ 加一排')}</div>
          <p class="ac-big" data-read data-say>現在一共 ${invTotal(ctx)} 格，要剛好 ${ctx.problem.area} 格。</p>`,
        bind: ctx => { const ch = d => { ctx.state.n = Math.max(1, Math.min(10, (ctx.state.n || 1) + d)); ctx.answers.rows = String(ctx.state.n); ctx.invalidate(1); ctx.rerender(); }; const m = document.getElementById('moreRow'), l = document.getElementById('lessRow'); if (m) m.onclick = () => ch(1); if (l) l.onclick = () => ch(-1); },
        check: ctx => { const t = invTotal(ctx), area = ctx.problem.area; return t === area ? null : { code: 'rows', msg: t < area ? `還差 ${area - t} 格，再加一些。` : `多了 ${t - area} 格，拿掉一些。` }; },
        solve: ctx => { ctx.state.n = ctx.problem.b; ctx.answers.rows = String(ctx.problem.b); }, demo: countRowsDemo, say: ex => ex.problem.square ? `${ex.problem.b} 乘 ${ex.problem.b} 剛好是 ${ex.problem.area}。` : `排了 ${ex.problem.b} 排，剛好 ${ex.problem.area} 格。` },
      { title: '寫邊長', ids: ['side'], hints: ['排了幾排，邊長就是幾公分。', '看圖上的排數。', ''].map(h => h || '一排一格是 1 公分，幾排就是幾公分。'),
        think: '排了幾排，這條邊就是幾公分。', together: '一起想：排了幾排？',
        figure: ctx => invFig(ctx), answer: ctx => fieldHtml(ctx, 'side', ctx.problem.square ? '邊長是幾公分？' : '寬是幾公分？', 2),
        check: ctx => { const v = num(ctx.answers.side); return v === null ? { code: 'side', msg: '請填邊長。' } : v === ctx.problem.b ? null : { code: 'side', msg: v === ctx.problem.area ? '這是面積。要填邊長（排數）。' : '看排了幾排，再填一次。' }; },
        solve: ctx => { ctx.state.n = ctx.problem.b; ctx.answers.side = String(ctx.problem.b); }, demo: countRowsDemo,
        say: ex => ex.problem.square ? `排了 ${ex.problem.b} 排，邊長是 ${ex.problem.b} 公分。` : `從上往下數，排了 ${ex.problem.b} 排，寬是 ${ex.problem.b} 公分。` },
      { title: '用乘法檢查', ids: ['product'], hints: ['把兩條邊乘起來。', '乘出來要等於面積。', ''].map(h => h || '長 × 寬 = 面積，乘乘看對不對。'),
        think: '兩條邊乘起來，要等於面積。', together: '一起乘：等於面積嗎？',
        figure: ctx => invFig(ctx, { showB: true }),
        answer: ctx => `<p class="ac-big" data-read data-say>${ctx.problem.a} × ${num(ctx.answers.side) ?? '？'} = ？</p>${fieldHtml(ctx, 'product', '乘出來是多少？', 3)}`,
        check: ctx => { const v = num(ctx.answers.product); return v === null ? { code: 'product', msg: '請填乘出來的數。' } : v === ctx.problem.area ? null : { code: 'product', msg: '再乘一次。乘出來要等於面積。' }; },
        solve: ctx => { ctx.answers.side = String(ctx.problem.b); ctx.answers.product = String(ctx.problem.area); }, say: ex => `${ex.problem.a} 乘 ${ex.problem.b} 等於 ${ex.problem.area}，答案沒問題。` }
    ],
    reasons: [['rows', '一排一排加'], ['times', '想乘法'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => `${ctx.problem.square ? '邊長' : '寬'}是 ${ctx.problem.b} 公分，因為 ${ctx.problem.a} × ${ctx.problem.b} = ${ctx.problem.area}。`,
    chant: '知道面積找邊長：排幾排會剛好？', transfer: '想一想：12 張貼紙排成一排 4 張，可以排幾排？'
  });

  // =============== 3-3 12 格可以排成哪些長方形 ===============
  const ARR = { easy: [6, 8, 10], standard: [12, 12, 12], challenge: [16, 18, 20] };
  const pairs = n => { const l = []; for (let a = 1; a * a <= n; a++) if (n % a === 0) l.push([a, n / a]); return l; };
  const pk = (w, h) => Math.min(w, h) + '×' + Math.max(w, h);
  function arrFig(ctx) {
    const w = ctx.state.w || 1, h = ctx.state.h || 1, N = ctx.problem.n, used = Math.min(w * h, 40);
    const cells = rectCells(w, h).slice(0, used).map((c, i) => ({ x: c[0], y: c[1], cls: i < N ? 'ac-tile' : 'ac-b' }));
    return gridSVG({ cols: Math.max(w, 1), rows: Math.max(h, 1), cells, u: 32, outline: outlineOf(rectCells(w, h), 32), pad: 20, aria: `一排 ${w} 格，${h} 排，一共 ${w * h} 格` });
  }
  // 排好的長方形畫成小圖；轉過來的和排過的一樣時，把兩個疊在一起給學生看
  const mini = (w, h, u = 10) => `<svg class="ac-mini" width="${w * u + 2}" height="${h * u + 2}" viewBox="-1 -1 ${w * u + 2} ${h * u + 2}" aria-hidden="true">${rectCells(w, h).map(([x, y]) => `<rect x="${x * u}" y="${y * u}" width="${u}" height="${u}"/>`).join('')}</svg>`;
  const foundPics = ctx => (ctx.state.found || []).map(k => { const [a, b] = (ctx.state.seen || {})[k] || k.split('×').map(Number).reverse(); return `<figure class="ac-found">${mini(a, b)}<figcaption>一排 ${a} 格，${b} 排</figcaption></figure>`; }).join('');
  function dupNote(ctx, s) {
    const w = ctx.state.w || 1, h = ctx.state.h || 1, k = pk(w, h), prev = (ctx.state.seen || {})[k];
    if (!s || w * h !== ctx.problem.n || !prev || ctx.state.lastNew === s + ':' + k || !(ctx.state.found || []).includes(k)) return '';
    if (prev[0] === w) return `<p class="ac-dup-note" data-read data-say>這個已經排過了，換一種。</p>`;
    const u = 10, box = (a, b, cls) => `<svg width="${a * u + 6}" height="${b * u + 6}" viewBox="-3 -3 ${a * u + 6} ${b * u + 6}" aria-hidden="true">${cls.map(c => `<rect class="${c}" width="${a * u}" height="${b * u}"/>`).join('')}</svg>`;
    return `<div class="ac-dup"><div class="ac-dup-pics" role="img" aria-label="你排的轉過來，和排過的疊在一起，一樣大"><figure>${box(prev[0], prev[1], ['old'])}<figcaption>排過的</figcaption></figure><figure>${box(w, h, ['mine'])}<figcaption>你排的</figcaption></figure><span aria-hidden="true">轉過來 →</span><figure>${box(prev[0], prev[1], ['old', 'now'])}<figcaption>疊在一起</figcaption></figure></div>
      <p data-read data-say>你排的轉過來，和排過的完全疊在一起，所以是同一種。換一種。</p></div>`;
  }
  function arrControls(ctx, s) {
    const w = ctx.state.w || 1, h = ctx.state.h || 1, N = ctx.problem.n;
    return `<div class="ac-stepper"><span data-read>一排幾格</span>${btn(`wl${s}`, '➖', 'aria-label="一排少一格"')}<b>${w}</b>${btn(`wm${s}`, '➕', 'aria-label="一排多一格"')}</div>
      <div class="ac-stepper"><span data-read>排幾排</span>${btn(`hl${s}`, '➖', 'aria-label="少一排"')}<b>${h}</b>${btn(`hm${s}`, '➕', 'aria-label="多一排"')}</div>
      <p class="ac-big" data-read data-say>用了 ${w * h} 格（要剛好 ${N} 格）。</p>${dupNote(ctx, s)}${(ctx.state.found || []).length ? `<p data-read data-say>已經排出 ${ctx.state.found.length} 種（共 ${pairs(N).length} 種）：</p><div class="ac-found-list">${foundPics(ctx)}</div>` : ''}`;
  }
  function arrBind(ctx, s) {
    const set = (k, d) => { ctx.state[k] = Math.max(1, Math.min(ctx.problem.n, (ctx.state[k] || 1) + d)); ctx.state.lastNew = ''; ctx.answers['shape' + s] = pk(ctx.state.w || 1, ctx.state.h || 1); ctx.invalidate(s); ctx.rerender(); };
    [['wl', 'w', -1], ['wm', 'w', 1], ['hl', 'h', -1], ['hm', 'h', 1]].forEach(([b, k, d]) => { const e = document.getElementById(b + s); if (e) e.onclick = () => set(k, d); });
  }
  function arrCheck(ctx, s) {
    const w = ctx.state.w || 1, h = ctx.state.h || 1, N = ctx.problem.n;
    if (w * h !== N) return { code: 'shape', msg: w * h < N ? `還差 ${N - w * h} 格。` : `多了 ${w * h - N} 格。` };
    const f = ctx.state.found = ctx.state.found || [], k = pk(w, h), seen = ctx.state.seen = ctx.state.seen || {};
    if (s === 1 && f[0] === k) return { code: 'same', msg: '這個和第一個一樣（轉過來也算一樣），排一個不一樣的。' };
    const fresh = !f.includes(k) || ctx.state.lastNew === s + ':' + k;   // 同一次檢查可能被呼叫兩次
    if (!f.includes(k)) { f.push(k); seen[k] = [w, h]; ctx.state.lastNew = s + ':' + k; }
    if (s === 2) { const all = pairs(N).length; if (f.length < all) return fresh ? { code: 'more', soft: true, msg: `排出第 ${f.length} 種了！還有 ${all - f.length} 種，換一排的格數再試。` } : { code: 'same', msg: `這一種排過了（轉過來也一樣）。還有 ${all - f.length} 種，換一種。` }; }
    return null;
  }
  A.register('arrange', {
    methods: genericMethods,
    makeProblem(level, i) { const n = pick(ARR[level] || ARR.standard, i); return { n, prompt: `用 ${n} 個 1 平方公分的小方塊，排出 ${pairs(n).length} 種不一樣的長方形。（轉過來的算同一種）` }; },
    planFigure: ctx => `<p class="ac-big" data-read data-say>${ctx.problem.n} 個小方塊 ${'🟦'.repeat(Math.min(ctx.problem.n, 12))}${ctx.problem.n > 12 ? '…' : ''}</p>`,
    steps: [
      { title: '排一個長方形', ids: ['shape0'], hints: ['用按鈕改「一排幾格」和「排幾排」。', '一排幾格 × 排幾排，要剛好等於小方塊的數量。', '先試一排 1 格，或一排 2 格，看要排幾排。'],
        think: '老師先試一排幾格，再算要排幾排。', together: '一起排：一排幾格？要幾排？',
        figure: ctx => arrFig(ctx), answer: ctx => arrControls(ctx, 0), bind: ctx => arrBind(ctx, 0), check: ctx => arrCheck(ctx, 0),
        solve: ctx => { const [a, b] = pairs(ctx.problem.n).at(-1); ctx.state.w = b; ctx.state.h = a; ctx.state.found = [pk(a, b)]; ctx.answers.shape0 = pk(a, b); }, say: ex => { const [a, b] = pairs(ex.problem.n).at(-1); return `一排 ${b} 格，排 ${a} 排，剛好 ${ex.problem.n} 格。`; } },
      { title: '再排一個不一樣的', ids: ['shape1'], hints: ['換一個「一排幾格」試試看。', '轉過來的不算新的，要換數字。', '可以試一排 1 格、2 格、3 格……'],
        think: '老師換一個一排的格數，再試一次。', together: '一起試：換一排幾格？',
        figure: ctx => arrFig(ctx), answer: ctx => arrControls(ctx, 1), bind: ctx => arrBind(ctx, 1), check: ctx => arrCheck(ctx, 1),
        solve: ctx => { const l = pairs(ctx.problem.n), first = ctx.state.found && ctx.state.found[0]; const p = l.find(x => pk(x[0], x[1]) !== first) || l[0]; ctx.state.w = p[1]; ctx.state.h = p[0]; ctx.state.found = [...new Set([...(ctx.state.found || [pk(...l.at(-1))]), pk(p[0], p[1])])]; ctx.answers.shape1 = pk(p[0], p[1]); }, say: ex => `再換一種排法，格數一樣是 ${ex.problem.n} 格。` },
      { title: '把每一種都排出來', ids: ['shape2'], hints: ['從一排 1 格開始，一個一個試。', '轉過來的算同一種：排好後看下面的小圖有沒有一樣的。', '一排 1 格、2 格、3 格……能剛好排完的就是一種。'],
        think: '老師從一排 1 格開始，一個一個試。', together: '一起排：還有哪一種沒排過？',
        figure: ctx => arrFig(ctx),
        answer: ctx => `<p data-read data-say>排好一種就按「檢查」，排出全部 ${pairs(ctx.problem.n).length} 種。</p>${arrControls(ctx, 2)}`,
        bind: ctx => arrBind(ctx, 2), check: ctx => arrCheck(ctx, 2),
        solve: ctx => { const l = pairs(ctx.problem.n); ctx.state.found = l.map(p => pk(...p)); ctx.state.seen = Object.fromEntries(l.map(p => [pk(...p), [p[1], p[0]]])); ctx.state.w = l[0][1]; ctx.state.h = l[0][0]; ctx.answers.shape2 = pk(...l[0]); }, say: ex => `一共有 ${pairs(ex.problem.n).length} 種：${pairs(ex.problem.n).map(p => p[0] + '×' + p[1]).join('、')}。` },
      { title: '想一想', ids: ['concl'], hints: ['每一種都用了幾格？', '格數一樣，面積呢？', '排法不同，面積一樣。'],
        think: '每一種都用一樣多的格子，面積一樣。', together: '一起想：面積有沒有變？',
        figure: ctx => arrFig(ctx),
        answer: ctx => ctx.choice('concl', '你發現什麼？', [['same', `排法不同，面積都是 ${ctx.problem.n} 平方公分`], ['diff', '排法不同，面積也不同'], ['long', '越長的面積越大']]),
        check: ctx => !ctx.answers.concl ? { code: 'concl', msg: '選一個答案。' } : ctx.answers.concl === 'same' ? null : { code: 'concl', msg: '每一種都用了幾格？面積會一樣嗎？' },
        solve: ctx => { ctx.answers.concl = 'same'; }, say: ex => `排法不同，面積都是 ${ex.problem.n} 平方公分。` }
    ],
    reasons: [['try', '一個一個試'], ['times', '想乘法'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => `${ctx.problem.n} 格可以排成 ${pairs(ctx.problem.n).map(p => p[0] + '×' + p[1]).join('、')}，面積都是 ${ctx.problem.n} 平方公分（周長不一樣喔）。`,
    chant: '格數一樣，排法不同，面積不變。', transfer: '排排看：12 張桌子，可以排成哪些長方形？'
  });

  // =============== 3-4 複合圖形：切開再加起來 ===============
  const CMP = { easy: [[5, 4, 2, 2], [4, 4, 2, 1], [5, 3, 2, 1]], standard: [[6, 5, 3, 2], [7, 4, 3, 2], [6, 6, 2, 3]], challenge: [[8, 6, 3, 4], [9, 5, 4, 2], [8, 7, 5, 3]] };   // [W, H, 缺角寬 cw, 缺角高 ch]（缺右上角）
  const pieces = (p, cut) => { const { W, H, cw, ch } = p; return cut === 'v' ? [[W - cw, H], [cw, H - ch]] : [[W - cw, ch], [W, H - ch]]; };
  function compFig(ctx, opts = {}) {
    const { W, H, cw, ch } = ctx.problem, cut = opts.cut, gridOn = ctx.level === 'easy' || opts.grid;
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (x >= W - cw && y < ch) continue; const inA = cut === 'v' ? x < W - cw : cut === 'h' ? y < ch : false; cells.push({ x, y, cls: cut ? (inA ? 'ac-a' : 'ac-b' + (opts.split ? ' ac-split-' + cut : '')) : 'ac-fill' }); }
    const u = U40, L = (x, y, t, a = 'middle') => `<text x="${x}" y="${y}" text-anchor="${a}" class="ac-len">${t}</text>`;
    let extra = L(W * u / 2, H * u + 26, `${W} 公分`) + L(-10, H * u / 2 + 6, `${H} 公分`, 'end') + L((W - cw) * u / 2, -12, `${W - cw} 公分`) + L(W * u + 10, (ch + (H - ch) / 2) * u + 6, `${H - ch} 公分`, 'start');
    if (opts.inner) extra += L((W - cw / 2) * u, ch * u - 10, `${cw}`) + L((W - cw) * u + 8, ch * u / 2 + 6, `${ch}`, 'start');
    const lines = { v: `M${(W - cw) * u} ${ch * u}V${H * u}`, h: `M0 ${ch * u}H${(W - cw) * u}`, d: `M0 ${H * u}L${(W - cw) * u} 0` };
    if (opts.choices) extra += Object.entries(lines).map(([k, d], i) => `<path d="${d}" class="ac-cut${ctx.answers.cut === k ? ' on' : ''}"/><path d="${d}" class="ac-side-hit" data-cut="${k}" role="button" aria-label="第 ${i + 1} 條線"/><text x="${k === 'v' ? (W - cw) * u + 8 : k === 'h' ? 12 : (W - cw) * u / 2 + 14}" y="${k === 'v' ? (ch + (H - ch) / 2) * u : k === 'h' ? ch * u - 8 : H * u / 2}" class="ac-tag">${'①②③'[i]}</text>`).join('');
    else if (cut) extra += `<path d="${lines[cut]}" class="ac-cut on"/>`;
    const outline = `M0 0H${(W - cw) * u}V${ch * u}H${W * u}V${H * u}H0Z`;
    return gridSVG({ cols: W, rows: H, cells, lines: gridOn, outline, extra, pad: 70, aria: `L 形圖形：下邊 ${W} 公分，左邊 ${H} 公分，上邊 ${W - cw} 公分，右邊 ${H - ch} 公分` });
  }
  function pieceStep(n) {
    const ids = ['l' + n, 'w' + n, 'a' + n];
    return { title: n ? '算第二塊' : '算第一塊', ids, hints: [`看${n ? '橘色' : '藍色'}的那一塊，它是長方形。`, '找出這一塊的長和寬（看圖上的數字）。', '長 × 寬，就是這一塊的面積。'],
      think: `老師算${n ? '橘色' : '藍色'}那一塊：長 × 寬。`, together: `一起找：${n ? '橘色' : '藍色'}那塊的長和寬。`,
      figure: ctx => compFig(ctx, { cut: ctx.answers.cut, inner: true }),
      answer: ctx => `<p data-read data-say>${n ? '第二塊（橘色）' : '第一塊（藍色）'}的長和寬：</p><div class="equation"><label><span>長</span><input id="${ids[0]}" data-answer="${ids[0]}" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers[ids[0]] ?? '')}"></label><span class="op">×</span><label><span>寬</span><input id="${ids[1]}" data-answer="${ids[1]}" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers[ids[1]] ?? '')}"></label><span class="op">=</span><label><span>面積</span><input id="${ids[2]}" data-answer="${ids[2]}" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers[ids[2]] ?? '')}"></label></div>`,
      check: ctx => { const [x, y] = pieces(ctx.problem, ctx.answers.cut)[n], l = num(ctx.answers[ids[0]]), w = num(ctx.answers[ids[1]]), a = num(ctx.answers[ids[2]]);
        if (l === null || w === null) return { code: 'side', msg: '先填這一塊的長和寬。' };
        if (!((l === x && w === y) || (l === y && w === x))) return { code: 'side', msg: '看這一塊的邊。如果圖上沒有寫，用大的邊減掉小的邊。' };
        if (a === null) return { code: 'area', msg: '再填這一塊的面積。' }; return a === x * y ? null : { code: 'area', msg: '長 × 寬，再算一次。' }; },
      solve: ctx => { if (!ctx.answers.cut) ctx.answers.cut = 'v'; const [x, y] = pieces(ctx.problem, ctx.answers.cut)[n]; ctx.answers[ids[0]] = String(x); ctx.answers[ids[1]] = String(y); ctx.answers[ids[2]] = String(x * y); },
      say: ex => { const [x, y] = pieces(ex.problem, ex.answers.cut || 'v')[n]; return `這一塊是 ${x} 乘 ${y}，等於 ${x * y}。`; } };
  }
  A.register('composite', {
    methods: genericMethods,
    makeProblem(level, i) { const [W, H, cw, ch] = pick(CMP[level] || CMP.standard, i); return { W, H, cw, ch, prompt: '這個圖形的面積是多少平方公分？先切成兩個長方形，再加起來。' }; },
    planFigure: ctx => compFig(ctx, {}),
    steps: [
      { title: '怎麼切', ids: ['cut'], hints: ['切開後，每一塊都要是長方形。', '看看哪幾條線切完是兩個長方形。', '直的或橫的切都可以；斜的切會變成三角形。'],
        think: '老師切一刀，讓它變成兩個長方形。', together: '一起想：哪一條線切完是兩個長方形？',
        figure: ctx => compFig(ctx, { choices: true, cut: ['v', 'h'].includes(ctx.answers.cut) ? ctx.answers.cut : undefined, split: true }),
        answer: ctx => `<p data-read data-say>沿著一條虛線切成兩個長方形。選好後，圖會切開給你看。</p>` + ctx.choice('cut', '要沿著哪一條虛線切？（也可以點圖上的線）', [['v', '① 直的切'], ['h', '② 橫的切'], ['d', '③ 斜的切']], true),
        bind: ctx => document.querySelectorAll('#figure0 [data-cut]').forEach(el => el.onclick = () => { ctx.answers.cut = el.dataset.cut; ctx.invalidate(0); ctx.rerender(); }),
        check: ctx => !ctx.answers.cut ? { code: 'cut', msg: '選一條虛線。' } : ctx.answers.cut === 'd' ? { code: 'cut', msg: '斜著切會變成三角形，不好算。換直的或橫的。' } : null,
        solve: ctx => { ctx.answers.cut = 'v'; }, say: () => '直的切一刀，變成兩個長方形。' },
      pieceStep(0), pieceStep(1),
      { title: '加起來', ids: ['total'], hints: ['兩塊的面積加起來。', '第一塊 + 第二塊。', '整個圖形 = 兩塊合起來。'],
        think: '兩塊的面積加起來，就是全部。', together: '一起加：兩塊合起來是多少？',
        figure: ctx => compFig(ctx, { cut: ctx.answers.cut, inner: true }),
        answer: ctx => `<p class="ac-big" data-read data-say>${esc(ctx.answers.a0 ?? '？')} + ${esc(ctx.answers.a1 ?? '？')} = ？</p>${fieldHtml(ctx, 'total', '整個圖形的面積是多少？', 3)}`,
        check: ctx => { const ps = pieces(ctx.problem, ctx.answers.cut || 'v'), t = ps[0][0] * ps[0][1] + ps[1][0] * ps[1][1], v = num(ctx.answers.total); return v === null ? { code: 'total', msg: '請填面積。' } : v === t ? null : { code: 'total', msg: '把兩塊的面積加起來，再算一次。' }; },
        solve: ctx => { const ps = pieces(ctx.problem, ctx.answers.cut || 'v'); ctx.answers.total = String(ps[0][0] * ps[0][1] + ps[1][0] * ps[1][1]); }, say: ex => { const ps = pieces(ex.problem, ex.answers.cut || 'v'); return `${ps[0][0] * ps[0][1]} 加 ${ps[1][0] * ps[1][1]}，等於 ${ps[0][0] * ps[0][1] + ps[1][0] * ps[1][1]}。`; } },
      { title: '寫單位', ids: ['unit'], hints: ['面積用什麼單位？', '不是公分，是……', '面積的單位是平方公分。'],
        think: '面積的單位是平方公分。', together: '一起想：面積的單位？',
        figure: ctx => compFig(ctx, { cut: ctx.answers.cut }), answer: ctx => ctx.choice('unit', '面積用哪個單位？', [['cm2', '平方公分'], ['cm', '公分'], ['m', '公尺']]),
        check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === 'cm2' ? null : { code: 'unit', msg: '這是量長度的單位。面積用平方公分。' },
        solve: ctx => { ctx.answers.unit = 'cm2'; }, say: () => '面積的單位是平方公分。' }
    ],
    reasons: [['cut', '切成兩塊'], ['formula', '長乘寬'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => { const ps = pieces(ctx.problem, ctx.answers.cut || 'v'); return `${ps[0][0]}×${ps[0][1]} + ${ps[1][0]}×${ps[1][1]} = ${ps[0][0] * ps[0][1] + ps[1][0] * ps[1][1]}，面積是 ${ps[0][0] * ps[0][1] + ps[1][0] * ps[1][1]} 平方公分。`; },
    chant: '複合圖形：切一切，算一算，加起來。', transfer: '找一找：教室裡有沒有 L 形的地方？'
  });

  // =============== 3-5 平方公尺 ===============
  const ITEMS = [['📮', '一張郵票', 'cm2'], ['📘', '課本的封面', 'cm2'], ['🗒️', '一張便利貼', 'cm2'], ['📱', '手機螢幕', 'cm2'], ['🏫', '教室的地板', 'm2'], ['🏀', '籃球場', 'm2'], ['⬛', '教室的黑板', 'm2'], ['🛏️', '房間的地板', 'm2']];
  const EST = [['🏫', '教室的地板', ['6', '60', '600'], '60'], ['🏀', '籃球場', ['4', '40', '400'], '400'], ['🛏️', '家裡一個房間的地板', ['1', '10', '100'], '10']];
  const CALC = { easy: [[3, 2], [4, 2], [5, 2]], standard: [[6, 4], [8, 5], [7, 3]], challenge: [[12, 8], [15, 6], [20, 9]] };
  // 1 平方公尺 ≈ 4 張學生課桌併在一起（對照圖）
  const desks = () => `<figure class="ac-desks"><svg viewBox="-30 -30 300 300" width="220" height="220" role="img" aria-label="4 張課桌併在一起，大約是 1 平方公尺">
    ${[[0, 0], [120, 0], [0, 120], [120, 120]].map(([x, y]) => `<g transform="translate(${x + 4} ${y + 4})"><rect width="112" height="112" rx="6" class="desk"/><text x="56" y="64" text-anchor="middle">課桌</text></g>`).join('')}
    <rect width="240" height="240" class="m2"/><text x="120" y="-10" text-anchor="middle">約 1 公尺</text><text x="-10" y="120" text-anchor="middle" transform="rotate(-90 -10 120)">約 1 公尺</text></svg>
    <figcaption data-read data-say>4 張課桌併在一起，大約是 1 平方公尺。</figcaption></figure>`;
  function unitStep() {
    return { title: '選單位', ids: ['u0', 'u1', 'u2'], hints: ['想一想：東西很小，還是很大？', '小的東西用平方公分，很大的地方用平方公尺。', '桌面以下的大小用平方公分；地板、球場用平方公尺。'],
      think: '小的東西用平方公分，大的地方用平方公尺。', together: '一起想：它很小還是很大？',
      answer: ctx => ctx.problem.items.map((it, i) => ctx.choice('u' + i, `${it[0]} ${it[1]}的面積，用哪個單位比較適合？`, [['cm2', '平方公分'], ['m2', '平方公尺']], true)).join(''),
      check: ctx => { for (let i = 0; i < 3; i++) { const v = ctx.answers['u' + i]; if (!v) return { code: 'unit', msg: '三題都要選。' }; if (v !== ctx.problem.items[i][2]) return { code: 'unit', msg: `再想一想「${ctx.problem.items[i][1]}」：${ctx.problem.items[i][2] === 'm2' ? '很大，用平方公尺。' : '比較小，用平方公分。'}` }; } return null; },
      solve: ctx => ctx.problem.items.forEach((it, i) => { ctx.answers['u' + i] = it[2]; }), say: ex => ex.problem.items.map(it => `${it[1]}用${it[2] === 'm2' ? '平方公尺' : '平方公分'}`).join('，') + '。' };
  }
  A.register('squareMeter', {
    methods: [['mark', '✋ 先用報紙拼拼看'], ['self', '🧠 先自己想，需要時看提示']],
    makeProblem(level, i, random = Math.random) { const items = U.shuffle(ITEMS, random); const pickd = [items.find(x => x[2] === 'cm2'), items.find(x => x[2] === 'm2'), items.filter(x => x[2] === 'cm2')[1] || items[2]]; return { items: U.shuffle(pickd, random), est: pick(EST, i), calc: pick(CALC[level] || CALC.standard, i), prompt: '認識「平方公尺」：比平方公分大很多的面積單位。' }; },
    planFigure: () => `<div class="ac-m2"><div class="ac-m2-sq" role="img" aria-label="邊長 1 公尺的正方形"><span>1 平方公尺</span></div><p data-read data-say>邊長 1 公尺（100 公分）的正方形，大約是 4 張全開報紙拼起來。</p>${desks()}</div>`,
    steps: [
      { title: '認識 1 平方公尺', ids: ['what'], hints: ['1 平方公分是邊長 1 公分的正方形。', '把「公分」換成「公尺」想想看。', '邊長 1 公尺的正方形，面積是 1 平方公尺。'],
        think: '邊長 1 公尺的正方形，面積是 1 平方公尺。', together: '一起想：1 平方公尺有多大？',
        figure: () => `<div class="ac-m2"><div class="ac-m2-sq"><span>1 公尺 × 1 公尺</span></div>${desks()}</div>`,
        answer: ctx => ctx.choice('what', '1 平方公尺是多大？', [['m', '邊長 1 公尺的正方形'], ['cm', '邊長 1 公分的正方形'], ['line', '1 公尺長的一條線']]),
        check: ctx => !ctx.answers.what ? { code: 'what', msg: '選一個答案。' } : ctx.answers.what === 'm' ? null : { code: 'what', msg: ctx.answers.what === 'cm' ? '這是 1 平方公分，很小。' : '線是長度，不是面積。' },
        solve: ctx => { ctx.answers.what = 'm'; }, say: () => '邊長 1 公尺的正方形，面積是 1 平方公尺。' },
      unitStep(),
      { title: '估估看', ids: ['est'], hints: ['想像 1 平方公尺：大約 4 張課桌併起來。', '這個地方大約可以鋪幾張報紙？', '估的時候，選最接近的數字。'],
        think: '老師想像用報紙鋪滿，大約要幾個 1 平方公尺。', together: '一起估：大約幾平方公尺？',
        figure: ctx => `<div class="ac-sit"><span aria-hidden="true">${ctx.problem.est[0]}</span></div>`,
        answer: ctx => ctx.choice('est', `${ctx.problem.est[1]}大約是幾平方公尺？`, ctx.problem.est[2].map(v => [v, `大約 ${v} 平方公尺`]), true),
        check: ctx => !ctx.answers.est ? { code: 'est', msg: '選一個答案。' } : ctx.answers.est === ctx.problem.est[3] ? null : { code: 'est', msg: Number(ctx.answers.est) < Number(ctx.problem.est[3]) ? '再想大一點。' : '再想小一點。' },
        solve: ctx => { ctx.answers.est = ctx.problem.est[3]; }, say: ex => `${ex.problem.est[1]}大約是 ${ex.problem.est[3]} 平方公尺。` },
      { title: '算一算', ids: ['area', 'unit'], hints: ['長 × 寬。', '單位是公尺，面積就用平方公尺。', '長方形面積 = 長 × 寬，單位是平方公尺。'],
        think: '長 × 寬，單位是公尺，面積用平方公尺。', together: '一起算：長乘寬是多少？',
        figure: ctx => { const [a, b] = ctx.problem.calc; return `<p class="ac-big" data-read data-say>🌷 花圃：長 ${a} 公尺、寬 ${b} 公尺</p>`; },
        answer: ctx => `${fieldHtml(ctx, 'area', '花圃的面積是多少？', 3)}${ctx.choice('unit', '單位是什麼？', [['m2', '平方公尺'], ['cm2', '平方公分'], ['m', '公尺']])}`,
        check: ctx => { const [a, b] = ctx.problem.calc, v = num(ctx.answers.area); if (v === null) return { code: 'area', msg: '請填面積。' }; if (v !== a * b) return { code: 'area', msg: v === 2 * (a + b) ? '這是周長。面積要用長 × 寬。' : '長 × 寬，再算一次。' }; if (!ctx.answers.unit) return { code: 'unit', msg: '選一個單位。' }; return ctx.answers.unit === 'm2' ? null : { code: 'unit', msg: ctx.answers.unit === 'cm2' ? '長和寬是公尺，面積用平方公尺。' : '公尺是長度。面積用平方公尺。' }; },
        solve: ctx => { const [a, b] = ctx.problem.calc; ctx.answers.area = String(a * b); ctx.answers.unit = 'm2'; }, say: ex => `${ex.problem.calc[0]} 乘 ${ex.problem.calc[1]}，是 ${ex.problem.calc[0] * ex.problem.calc[1]} 平方公尺。` },
      { title: '換算', ids: ['conv'], when: s => !!s.convert, hints: ['1 公尺 = 100 公分。', '邊長 100 公分的正方形，一排 100 格，有 100 排。', '100 × 100 = 10000，所以 1 平方公尺 = 10000 平方公分。'],
        think: '1 公尺是 100 公分，100 乘 100 是 10000。', together: '一起算：100 乘 100？',
        figure: () => `<div class="ac-m2"><div class="ac-m2-sq"><span>100 公分 × 100 公分</span></div></div>`,
        answer: ctx => fieldHtml(ctx, 'conv', '1 平方公尺 = 幾平方公分？', 4),
        check: ctx => { const v = num(ctx.answers.conv); return v === null ? { code: 'conv', msg: '請填數字。' } : v === 10000 ? null : { code: 'conv', msg: v === 100 ? '100 是一排的格數，還要乘有幾排。' : '100 × 100，再算一次。' }; },
        solve: ctx => { ctx.answers.conv = '10000'; }, say: () => '1 平方公尺等於 10000 平方公分。' }
    ],
    reasons: [['paper', '想像報紙'], ['compare', '和平方公分比'], ['hint', '看提示'], ['alone', '我自己想']],
    done: ctx => { const [a, b] = ctx.problem.calc; return `花圃是 ${a * b} 平方公尺。大的地方用平方公尺，小的東西用平方公分。`; },
    chant: '1 平方公尺：邊長 1 公尺的正方形。', transfer: '量一量：用報紙拼出 1 平方公尺，上面可以站幾個人？'
  });
})();

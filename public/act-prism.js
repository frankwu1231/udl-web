'use strict';
// 第 27 版（吳老師 2026-11-13 決定加上六年級的柱體）：表面積教材包的單元 5「柱體的表面積」。
// 5-1 角柱的面（底面、側面）、5-2 三角柱的表面積、5-3 圓柱的表面積。
// 做法一樣是「打開來看」：底面 2 個，側面打開是一個大長方形（長＝底面一圈，寬＝柱的高）。
// 計分的連帶規則：側面積依學生自己算的底面一圈判定，總和依學生自己算的底面積和側面積判定。
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml } = U;
  const methods = [['mark', '📦 先打開看一看'], ['self', '🧠 先自己算，需要時看提示']];
  const STROKE = '#2b4a7a', PLAIN = '#f4f6fa', BASE = '#bfe0ff', SIDE = '#ffd59e', BACK = '#e6eaf2';
  const r1 = n => Math.round(n * 10) / 10, r2 = n => Math.round(n * 100) / 100;
  const near = (v, t) => v !== null && Math.abs(v - t) < 0.005;
  const POLY = { 3: '三角形', 4: '四邊形', 5: '五邊形', 6: '六邊形' }, PRISM = { 3: '三角柱', 4: '四角柱', 5: '五角柱', 6: '六角柱' };
  const fs = (u, k = 0.6) => Math.max(11, Math.min(16, u * k));

  // ---------- 立體圖：角柱（底面在地上，斜著看） ----------
  // p.base：底面頂點 [[x, z], ...]（z 是往後的深度）、p.h 高。o.bases/o.sides 塗色、o.pulseBases/o.pulseSides 閃爍、o.labels [{edge:i, text}] 標在上底的邊、o.hLabel 高的字
  function prismSVG(p, o = {}) {
    const B = p.base, n = B.length, raw = (x, y, z) => [x + 0.6 * z, -(y + 0.45 * z)];
    const all = B.flatMap(([x, z]) => [raw(x, 0, z), raw(x, p.h, z)]);
    const minX = Math.min(...all.map(q => q[0])), maxX = Math.max(...all.map(q => q[0])), minY = Math.min(...all.map(q => q[1])), maxY = Math.max(...all.map(q => q[1]));
    const u = Math.min(40, 240 / (maxX - minX), 180 / (maxY - minY)), X0 = 30, Y0 = 26;
    const P = (x, y, z) => { const [a, b] = raw(x, y, z); return [r1(X0 + (a - minX) * u), r1(Y0 + (b - minY) * u)]; };
    const pts = a => a.map(q => q.join(',')).join(' ');
    const bot = B.map(([x, z]) => P(x, 0, z)), top = B.map(([x, z]) => P(x, p.h, z));
    let g = `<polygon points="${pts(bot)}" fill="${o.bases ? BASE : BACK}" fill-opacity="0.85" stroke="${STROKE}" stroke-width="1.5" stroke-dasharray="5 4" class="${(o.pulseBases) ? 'ac-pulse' : ''}" data-pf="base"/>`;
    const sides = B.map((q, i) => ({ i, z: (q[1] + B[(i + 1) % n][1]) / 2 })).sort((a, b) => b.z - a.z);
    for (const { i } of sides) {
      const j = (i + 1) % n, quad = [bot[i], bot[j], top[j], top[i]];
      g += `<polygon points="${pts(quad)}" fill="${o.sides ? SIDE : PLAIN}" fill-opacity="0.85" stroke="${STROKE}" stroke-width="2" class="${o.pulseSides ? 'ac-pulse' : ''}" data-pf="side"/>`;
    }
    g += `<polygon points="${pts(top)}" fill="${o.bases ? BASE : PLAIN}" fill-opacity="0.9" stroke="${STROKE}" stroke-width="2" class="${o.pulseBases ? 'ac-pulse' : ''}" data-pf="base"/>`;
    // 直角記號：上底第 0 個頂點（o.rightAngle）
    if (o.rightAngle) { const v = top[0], d = q => { const dx = q[0] - v[0], dy = q[1] - v[1], L = Math.hypot(dx, dy) || 1; return [dx / L * 11, dy / L * 11]; }, a1 = d(top[1]), a2 = d(top[n - 1]);
      g += `<path d="M${r1(v[0] + a1[0])} ${r1(v[1] + a1[1])}L${r1(v[0] + a1[0] + a2[0])} ${r1(v[1] + a1[1] + a2[1])}L${r1(v[0] + a2[0])} ${r1(v[1] + a2[1])}" fill="none" stroke="#c2410c" stroke-width="2"/>`; }
    for (const l of o.labels || []) { const a = top[l.edge], b = top[(l.edge + 1) % n]; g += `<text x="${r1((a[0] + b[0]) / 2 + (l.dx || 0))}" y="${r1((a[1] + b[1]) / 2 + (l.dy || -6))}" text-anchor="middle" class="ac-len">${esc(l.text)}</text>`; }
    if (o.hLabel) { const k = top.reduce((m, q, i) => q[0] > top[m][0] ? i : m, 0); g += `<text x="${r1(top[k][0] + 8)}" y="${r1((top[k][1] + bot[k][1]) / 2 + 4)}" class="ac-len">${esc(o.hLabel)}</text>`; }
    const W = X0 + (maxX - minX) * u + 110, H = Y0 + (maxY - minY) * u + 30;
    return `<svg class="ac-svg" viewBox="0 0 ${r1(W)} ${r1(H)}" role="img" aria-label="${esc(o.aria || (PRISM[n] || '角柱'))}">${g}</svg>`;
  }
  // 正多邊形底面（5-1 用）
  const regular = n => Array.from({ length: n }, (_, k) => { const t = 2 * Math.PI * k / n + Math.PI / 2 + (n === 4 ? Math.PI / 4 : 0); return [r2(2 + 2 * Math.cos(t)), r2(2 + 2 * Math.sin(t))]; });
  // 直角三角形底面（5-2 用）：兩股 a（往右）、b（往後）
  const rightTri = p => [[0, 0], [p.a, 0], [0, p.b]];

  // ---------- 三角柱的展開圖：側面三個長方形排成一排（a、c、b），兩個三角形接在 a 的上下 ----------
  // o.bases/o.sides 塗色、o.nums 寫長×寬、o.strip 把側面圈成一個大長方形、o.pulseBases/o.pulseSides
  function prismNetSVG(p, o = {}) {
    const { a, b, c, h } = p, W = a + b + c, Ht = h + 2 * b, u = Math.min(26, 400 / W, 300 / Ht), x0 = 8, y0 = 8;
    const X = v => r1(x0 + v * u), Y = v => r1(y0 + v * u);
    let g = '';
    const tri = (pts, cls) => `<polygon points="${pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="${o.bases ? BASE : PLAIN}" stroke="${STROKE}" stroke-width="2" class="${cls}"/>`;
    g += tri([[0, b], [a, b], [0, 0]], o.pulseBases ? 'ac-pulse' : '') + tri([[0, b + h], [a, b + h], [0, 2 * b + h]], o.pulseBases ? 'ac-pulse' : '');
    let x = 0;
    for (const w of [a, c, b]) {
      g += `<rect x="${X(x)}" y="${Y(b)}" width="${r1(w * u)}" height="${r1(h * u)}" fill="${o.sides ? SIDE : PLAIN}" stroke="${STROKE}" stroke-width="2" class="${o.pulseSides ? 'ac-pulse' : ''}"/>`;
      if (o.nums) g += `<text x="${X(x + w / 2)}" y="${Y(b + h / 2) + 5}" text-anchor="middle" font-size="${fs(u)}" fill="#1d2b44">${w}×${h}</text>`;
      x += w;
    }
    if (o.nums) g += `<text x="${X(a / 4)}" y="${Y(b * 0.72)}" text-anchor="middle" font-size="${fs(u, 0.5)}" fill="#1d2b44">${a}×${b}÷2</text>`;
    if (o.strip) g += `<rect x="${X(0)}" y="${Y(b)}" width="${r1(W * u)}" height="${r1(h * u)}" fill="none" stroke="#c2410c" stroke-width="4"/>`;   // 長、寬的說明寫在圖外（答案區），圖縮小時字才不會太小
    return `<svg class="ac-svg" viewBox="0 0 ${r1(W * u + 16)} ${r1(Ht * u + 16)}" role="img" aria-label="三角柱的展開圖：2 個三角形的底面，3 個長方形的側面">${g}</svg>`;
  }

  // ---------- 圓柱：立體圖與展開圖 ----------
  function cylSVG(p, o = {}) {
    const u = Math.min(36, 120 / p.r, 160 / (p.h + p.r * 0.7)), rx = p.r * u, ry = rx * 0.35, H = p.h * u, cx = 30 + rx, cy = 20 + ry;
    let g = `<path d="M${r1(cx - rx)} ${r1(cy)}V${r1(cy + H)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(cx + rx)} ${r1(cy + H)}V${r1(cy)}Z" fill="${o.sides ? SIDE : PLAIN}" stroke="${STROKE}" stroke-width="2" class="${o.pulseSides ? 'ac-pulse' : ''}"/>`;
    g += `<path d="M${r1(cx - rx)} ${r1(cy + H)}A${r1(rx)} ${r1(ry)} 0 0 1 ${r1(cx + rx)} ${r1(cy + H)}" fill="none" stroke="#5b6f8f" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    g += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${o.bases ? BASE : PLAIN}" stroke="${STROKE}" stroke-width="2" class="${o.pulseBases ? 'ac-pulse' : ''}"/>`;
    if (o.labels) g += `<path d="M${r1(cx)} ${r1(cy)}H${r1(cx + rx)}" stroke="#c2410c" stroke-width="2.5"/><text x="${r1(cx + rx + 8)}" y="${r1(cy + 4)}" class="ac-len">半徑 ${p.r} 公分</text><text x="${r1(cx + rx + 8)}" y="${r1(cy + H / 2 + 10)}" class="ac-len">高 ${p.h} 公分</text>`;
    return `<svg class="ac-svg" viewBox="0 0 ${r1(cx + rx + 130)} ${r1(cy + H + ry + 16)}" role="img" aria-label="圓柱${o.labels ? `，半徑 ${p.r} 公分，高 ${p.h} 公分` : ''}">${g}</svg>`;
  }
  function cylNetSVG(p, o = {}) {
    const C = 2 * p.r * 3.14, W = Math.max(C, 2 * p.r), Ht = p.h + 4 * p.r, u = Math.min(24, 400 / W, 300 / Ht), x0 = 8, y0 = 8;
    const X = v => r1(x0 + v * u), Y = v => r1(y0 + v * u);
    let g = `<circle cx="${X(p.r)}" cy="${Y(p.r)}" r="${r1(p.r * u)}" fill="${o.bases ? BASE : PLAIN}" stroke="${STROKE}" stroke-width="2" class="${o.pulseBases ? 'ac-pulse' : ''}"/>`;
    g += `<circle cx="${X(p.r)}" cy="${Y(3 * p.r + p.h)}" r="${r1(p.r * u)}" fill="${o.bases ? BASE : PLAIN}" stroke="${STROKE}" stroke-width="2" class="${o.pulseBases ? 'ac-pulse' : ''}"/>`;
    g += `<rect x="${X(0)}" y="${Y(2 * p.r)}" width="${r1(C * u)}" height="${r1(p.h * u)}" fill="${o.sides ? SIDE : PLAIN}" stroke="${o.strip ? '#c2410c' : STROKE}" stroke-width="${o.strip ? 4 : 2}" class="${o.pulseSides ? 'ac-pulse' : ''}"/>`;
    return `<svg class="ac-svg" viewBox="0 0 ${r1(W * u + 16)} ${r1(Ht * u + 16)}" role="img" aria-label="圓柱的展開圖：2 個圓形的底面，1 個長方形的側面">${g}</svg>`;
  }

  // ---------- 共用的步驟 ----------
  const targetStep = (fig, word) => ({ title: '看題目', ids: ['target'], hints: ['表面積要算哪裡？', '看閃爍的地方：外面全部的面。', `表面積是包住${word}外面的大小。`],
    think: `老師想：表面積是包住${word}外面的大小。`, together: '一起想：表面積要算哪裡？',
    figure: ctx => fig(ctx.problem, { labels: true, hLabel: true, bases: ctx.hint(0) >= 2, sides: ctx.hint(0) >= 2, pulseBases: ctx.hint(0) >= 2, pulseSides: ctx.hint(0) >= 2 }),
    answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('target', '表面積要算什麼？', [['outside', `包住${word}外面的大小`], ['inside', `${word}裡面可以裝多少`], ['edges', '邊加起來多長']])}`,
    check: ctx => !ctx.answers.target ? { code: 'target', msg: '請先選一個答案。' } : ctx.answers.target === 'outside' ? null
      : { code: 'target', obs: ctx.answers.target === 'inside' ? 'choseVolume' : 'wrongChoice', msg: ctx.answers.target === 'inside' ? '裡面可以裝多少，是體積。表面積是包住外面的大小。' : '邊的長度不是表面積。表面積是包住外面的大小。' },
    solve: ctx => { ctx.answers.target = 'outside'; }, say: () => `表面積是包住${word}外面的大小。` });
  const openStep = (word, fig, net, n, opts) => ({ title: '展開', ids: ['count'], hints: [`按按鈕，把${word}打開來看。`, '打開以後，數一數有幾個面：底面和側面。', `2 個底面，加上側面，一共 ${n} 個面。`],
    think: `老師把${word}打開，數一數有幾個面。`, together: `一起做：把${word}打開，數一數。`,
    figure: ctx => ctx.state.open ? net(ctx.problem, { bases: ctx.hint(1) >= 2, sides: ctx.hint(1) >= 2 }) : fig(ctx.problem, {}),
    answer: ctx => `<div class="actions"><button type="button" id="sfOpen" class="primary-soft" ${ctx.state.open ? 'disabled' : ''}>📭 把${word}打開</button></div>
      ${ctx.state.open ? ctx.choice('count', '打開以後，有幾個面？', opts, true) : ''}`,
    bind: ctx => { const b = document.getElementById('sfOpen'); if (b) b.onclick = () => { ctx.state.open = true; ctx.log('打開柱體'); ctx.rerender(); }; },
    check: ctx => !ctx.state.open ? { code: 'open', obs: 'unfinished', msg: `先按「把${word}打開」。` } : !ctx.answers.count ? { code: 'count', msg: '數一數，再選一個答案。' }
      : ctx.answers.count === String(n) ? null : { code: 'count', obs: Number(ctx.answers.count) < n ? 'missFace' : 'countOver', msg: '再數一次：上下 2 個底面，還有側面。' },
    solve: ctx => { ctx.state.open = true; ctx.answers.count = String(n); }, say: () => `打開以後有 ${n} 個面。` });
  const unitStep = { title: '寫單位', ids: ['unit'], hints: ['表面積是面積，單位是什麼？', '不是長度的單位，也不是體積的單位。', '表面積要寫平方公分。'],
    think: '表面積是面積，單位是平方公分。', together: '一起想：表面積的單位？',
    answer: ctx => `<p class="notice" data-read data-say>你的答案：${esc(ctx.answers.total ?? '')}</p>${ctx.choice('unit', '表面積用哪個單位？', [['cm2', '平方公分'], ['cm3', '立方公分'], ['cm', '公分']])}`,
    check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === 'cm2' ? null
      : { code: 'unit', obs: ctx.answers.unit === 'cm3' ? 'unitVolume' : 'unitLength', msg: ctx.answers.unit === 'cm3' ? '立方公分是體積的單位。表面積要用平方公分。' : '公分是量長度的。表面積要用平方公分。' },
    solve: ctx => { ctx.answers.unit = 'cm2'; }, say: () => '表面積的單位是平方公分。' };
  // 加起來：底面積 × 2 ＋ 側面積（依學生自己算的底面積、側面積判定）
  const sumStep = (prob, decimals) => ({ title: '加起來', ids: ['formula', 'total'], hints: ['底面有幾個？側面有幾個？', '2 個底面，再加上側面。', '表面積 ＝ 底面積 × 2 ＋ 側面積。'],
    think: '2 個底面，加上打開的側面。', together: '一起想：底面有幾個？',
    figure: ctx => prob.net(ctx.problem, { bases: true, sides: true }),
    answer: ctx => { const b = ctx.answers.base ?? '底面積', s = ctx.answers.side ?? '側面積';
      return `${ctx.choice('formula', '選一個算式', [['two', '底面積 × 2 ＋ 側面積'], ['one', '底面積 ＋ 側面積'], ['vol', '底面積 × 高']])}<p class="ac-big" data-read data-say>${esc(`${b} × 2 ＋ ${s} = ？`)}</p>${fieldHtml(ctx, 'total', '表面積是多少？', 4)}`; },
    check: ctx => { const f = ctx.answers.formula; if (!f) return { code: 'formula', msg: '先選一個算式。' };
      if (f !== 'two') return { code: 'formula', obs: f === 'vol' ? 'choseVolume' : 'oneBase', msg: f === 'vol' ? '底面積 × 高是算裡面可以裝多少（體積）。' : '上面和下面都有底面，一共 2 個。' };
      const b = num(ctx.answers.base), s = num(ctx.answers.side), v = num(ctx.answers.total);
      if (v === null) return { code: 'total', msg: '請填你算出的表面積。' };
      if (b === null || s === null) return { code: 'total', msg: '先回到前面，算好底面積和側面積。' };
      const t = r2(2 * b + s);
      if (near(v, t)) return null;
      return { code: 'total', obs: near(v, r2(b + s)) ? 'oneBase' : near(v, s) ? 'missFace' : 'other', msg: near(v, r2(b + s)) ? '只加了 1 個底面。底面有 2 個。' : near(v, s) ? '底面還沒加進去。' : decimals ? '再算一次。小數點要對齊。' : '再算一次。' }; },
    solve: ctx => { ctx.answers.formula = 'two'; const b = num(ctx.answers.base) ?? prob.base(ctx.problem), s = num(ctx.answers.side) ?? prob.side(ctx.problem); ctx.answers.total = String(r2(2 * b + s)); },
    say: ex => `${prob.base(ex.problem)} × 2 ＋ ${prob.side(ex.problem)} ＝ ${prob.total(ex.problem)}。` });

  // =============== 5-1 角柱的面：底面和側面 ===============
  const NS = { easy: [3, 4], standard: [3, 4, 5], challenge: [5, 6, 4] };
  const nFig = (p, o = {}) => prismSVG({ base: regular(p.n), h: 3 }, { aria: PRISM[p.n], ...o });
  A.register('sPrismFaces', {
    methods, makeProblem: (level, i) => { const n = pick(NS[level] || NS.standard, i); return { n, prompt: `這是一個${PRISM[n]}。找一找它的底面和側面，數一數一共有幾個面。` }; },
    planFigure: ctx => nFig(ctx.problem),
    steps: [
      { title: '找底面', ids: ['bases'], hints: ['柱體上面和下面一樣的面，叫做底面。', '看閃爍的面：上面一個，下面一個。', '角柱有 2 個底面。'],
        think: '老師找上面和下面一樣的面：底面。', together: '一起找：底面有幾個？',
        figure: ctx => nFig(ctx.problem, { bases: ctx.hint(0) >= 2 || ctx.checked(0), pulseBases: ctx.hint(0) >= 2 }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('bases', '底面有幾個？', [['2', '2 個'], ['1', '1 個'], [String(ctx.problem.n), `${ctx.problem.n} 個`]], true)}`,
        check: ctx => !ctx.answers.bases ? { code: 'bases', msg: '先選一個答案。' } : ctx.answers.bases === '2' ? null : { code: 'bases', obs: ctx.answers.bases === '1' ? 'oneBase' : 'wrongChoice', msg: ctx.answers.bases === '1' ? '下面也有一個底面，被擋住了。' : '底面是上面和下面一樣的面。' },
        solve: ctx => { ctx.answers.bases = '2'; }, say: () => '角柱有 2 個底面。' },
      { title: '底面的形狀', ids: ['bshape'], hints: ['看一看上面的底面，數它有幾個角。', '看閃爍的底面，一個角一個角數。', '底面有幾個角，就叫幾邊形。'],
        think: '老師數底面有幾個角。', together: '一起數：底面有幾個角？',
        figure: ctx => nFig(ctx.problem, { bases: true, pulseBases: ctx.hint(1) >= 2 }),
        answer: ctx => { const n = ctx.problem.n, opts = [n, ...[3, 4, 5, 6].filter(k => k !== n).sort((x, y) => Math.abs(x - n) - Math.abs(y - n) || x - y).slice(0, 2)].map(k => [String(k), POLY[k]]); return `${ctx.hint(1) >= 3 ? `<p class="notice" data-read data-say>底面有 ${n} 個角，叫${POLY[n]}。</p>` : ''}${ctx.choice('bshape', '底面是什麼形狀？', opts.sort((a, b) => a[0] - b[0]), true)}`; },
        check: ctx => !ctx.answers.bshape ? { code: 'bshape', msg: '先選一個答案。' } : ctx.answers.bshape === String(ctx.problem.n) ? null : { code: 'bshape', obs: 'wrongChoice', msg: '數一數底面的角。' },
        solve: ctx => { ctx.answers.bshape = String(ctx.problem.n); }, say: ex => `底面是${POLY[ex.problem.n]}，所以叫${PRISM[ex.problem.n]}。` },
      { title: '數側面', ids: ['sides'], hints: ['底面旁邊一圈的面，叫做側面。', '看閃爍的面：後面還有看不到的側面。', '底面有幾條邊，就有幾個側面。'],
        think: '老師數底面的邊：每一條邊上都有一個側面。', together: '一起數：側面有幾個？',
        figure: ctx => nFig(ctx.problem, { bases: true, sides: ctx.hint(2) >= 2 || ctx.checked(2), pulseSides: ctx.hint(2) >= 2 }),
        answer: ctx => fieldHtml(ctx, 'sides', '側面有幾個？', 2),
        check: ctx => { const v = num(ctx.answers.sides), n = ctx.problem.n; return v === null ? { code: 'sides', msg: '數一數，把數字填進去。' } : v === n ? null : { code: 'sides', obs: v < n ? 'missFace' : 'countOver', msg: v < n ? '後面還有看不到的側面。底面有幾條邊？' : '有的面數了兩次。底面有幾條邊？' }; },
        solve: ctx => { ctx.answers.sides = String(ctx.problem.n); }, say: ex => `底面有 ${ex.problem.n} 條邊，所以有 ${ex.problem.n} 個側面。` },
      { title: '一共幾個面', ids: ['count'], hints: ['底面和側面加起來。', '上下 2 個底面，再加上側面的個數。', '一共的面 ＝ 2 ＋ 側面的個數。'],
        think: '老師把底面和側面加起來。', together: '一起算：一共幾個面？',
        figure: ctx => nFig(ctx.problem, { bases: true, sides: true }),
        answer: ctx => fieldHtml(ctx, 'count', `2 ＋ ${esc(ctx.answers.sides ?? '側面')} ＝ ？（一共幾個面）`, 3),
        check: ctx => { const v = num(ctx.answers.count), s = num(ctx.answers.sides); if (v === null) return { code: 'count', msg: '把數字填進去。' }; return s !== null && v === s + 2 ? null : { code: 'count', obs: s !== null && v === s ? 'missBases' : s !== null && v === s + 1 ? 'oneBase' : 'other', msg: s !== null && v === s ? '底面還沒加進去。' : s !== null && v === s + 1 ? '底面有 2 個：上面 1 個，下面 1 個。' : '2 個底面加上側面，再算一次。' }; },
        solve: ctx => { ctx.answers.count = String((num(ctx.answers.sides) ?? ctx.problem.n) + 2); }, say: ex => `2 ＋ ${ex.problem.n} ＝ ${ex.problem.n + 2}，一共 ${ex.problem.n + 2} 個面。` },
      { title: '側面的形狀', ids: ['sshape'], hints: ['看一看側面的樣子。', '側面有 4 個直角。', '角柱的側面都是長方形。'],
        think: '老師看側面：有 4 個直角，是長方形。', together: '一起看：側面是什麼形狀？',
        figure: ctx => nFig(ctx.problem, { sides: true }),
        answer: ctx => ctx.choice('sshape', '側面是什麼形狀？', [['rect', '長方形'], ['tri', '三角形'], ['circle', '圓形']]),
        check: ctx => !ctx.answers.sshape ? { code: 'sshape', msg: '先選一個答案。' } : ctx.answers.sshape === 'rect' ? null : { code: 'sshape', obs: 'wrongChoice', msg: '數一數側面有幾個角。' },
        solve: ctx => { ctx.answers.sshape = 'rect'; }, say: () => '側面都是長方形。' }
    ],
    reasons: [['open', '看底面和側面'], ['hint', '看提示']],
    done: ctx => `${PRISM[ctx.problem.n]}有 2 個底面、${ctx.problem.n} 個側面，一共 ${ctx.problem.n + 2} 個面。`,
    chant: '角柱：上下 2 個底面，旁邊一圈是側面。', transfer: '找一找：生活中有什麼東西是角柱？（例如：三角形的巧克力盒、鉛筆）'
  });

  // =============== 5-2 三角柱的表面積 ===============
  const TRI = { easy: [[3, 4, 5, 2], [3, 4, 5, 3]], standard: [[3, 4, 5, 5], [3, 4, 5, 6], [6, 8, 10, 6]], challenge: [[6, 8, 10, 5], [5, 12, 13, 4], [6, 8, 10, 7]] };
  const triP = { base: p => p.a * p.b / 2, perim: p => p.a + p.b + p.c, side: p => (p.a + p.b + p.c) * p.h, total: p => p.a * p.b + (p.a + p.b + p.c) * p.h, net: prismNetSVG };
  const triFig = (p, o = {}) => prismSVG({ base: rightTri(p), h: p.h }, { aria: `三角柱，底面是直角三角形，兩條直角邊 ${p.a} 和 ${p.b} 公分，斜邊 ${p.c} 公分，高 ${p.h} 公分`, ...o,
    rightAngle: true, labels: o.labels ? [{ edge: 0, text: `${p.a}`, dy: 16 }, { edge: 1, text: `${p.c}`, dx: 14 }, { edge: 2, text: `${p.b}`, dx: -12 }] : [], hLabel: o.hLabel ? `高 ${p.h} 公分` : '' });
  A.register('prism', {
    methods, makeProblem: (level, i) => { const [a, b, c, h] = pick(TRI[level] || TRI.standard, i); return { a, b, c, h, dims: [a, b, h], prompt: `三角柱的底面是直角三角形。兩條直角邊是 ${a} 公分和 ${b} 公分。斜邊是 ${c} 公分。柱的高是 ${h} 公分。表面積是多少平方公分？` }; },
    planFigure: ctx => triFig(ctx.problem, { labels: true, hLabel: true }),
    steps: [
      targetStep(triFig, '三角柱'),
      openStep('三角柱', triFig, prismNetSVG, 5, [['5', '5 個'], ['3', '3 個'], ['6', '6 個']]),
      { title: '底面積', ids: ['base'], hints: ['底面是直角三角形，怎麼算面積？', '兩條直角邊相乘，再除以 2。', '三角形面積 ＝ 底 × 高 ÷ 2。'],
        think: '底面是直角三角形：兩條直角邊相乘，再除以 2。', together: '一起算：一個底面多大？',
        figure: ctx => prismNetSVG(ctx.problem, { bases: true, pulseBases: ctx.hint(2) >= 2, nums: ctx.hint(2) >= 3 }),
        answer: ctx => fieldHtml(ctx, 'base', `一個底面：${ctx.problem.a} × ${ctx.problem.b} ÷ 2 ＝ ？`, 2),
        check: ctx => { const v = num(ctx.answers.base), p = ctx.problem; if (v === null) return { code: 'base', msg: '把底面積填進去。' };
          return v === triP.base(p) ? null : { code: 'base', obs: v === p.a * p.b ? 'eqDouble' : 'other', msg: v === p.a * p.b ? '三角形要再除以 2。' : '兩條直角邊相乘，再除以 2。' }; },
        solve: ctx => { ctx.answers.base = String(triP.base(ctx.problem)); }, say: ex => `${ex.problem.a} × ${ex.problem.b} ÷ 2 ＝ ${triP.base(ex.problem)}。` },
      { title: '側面積', ids: ['perim', 'side'], hints: ['三個側面排成一排，合起來是一個大長方形。', '長是底面三條邊加起來。寬是柱體的高。', '側面積 ＝ 底面一圈 × 高。'],
        think: '三個側面合起來是一個大長方形：長是底面一圈，寬是高。', together: '一起看：側面合起來是什麼形狀？',
        figure: ctx => prismNetSVG(ctx.problem, { sides: true, strip: true, pulseSides: ctx.hint(3) >= 2 }),
        answer: ctx => { const p = ctx.problem; return `<p class="notice sf-strip" data-read data-say>橘色框是側面合起來的大長方形。<br>長：底面三條邊加起來。<br>寬：柱體的高 ${p.h} 公分。</p>${fieldHtml(ctx, 'perim', `底面一圈：${p.a} ＋ ${p.c} ＋ ${p.b} ＝ ？`, 3)}${fieldHtml(ctx, 'side', `側面積：${esc(ctx.answers.perim ?? '底面一圈')} × ${p.h} ＝ ？`, 3)}`; },
        check: ctx => { const p = ctx.problem, c = num(ctx.answers.perim), s = num(ctx.answers.side);
          if (c === null) return { code: 'perim', msg: '先算底面一圈多長。' };
          if (c !== triP.perim(p)) return { code: 'perim', obs: c === p.a + p.b ? 'missFace' : 'other', msg: c === p.a + p.b ? '斜邊也要加。一圈有 3 條邊。' : '三條邊加起來，再算一次。' };
          if (s === null) return { code: 'side', msg: '再算側面積。' };
          return s === c * p.h ? null : { code: 'side', obs: 'other', msg: '底面一圈 × 高，再算一次。' }; },
        solve: ctx => { const p = ctx.problem; ctx.answers.perim = String(triP.perim(p)); ctx.answers.side = String(triP.side(p)); }, say: ex => `一圈 ${triP.perim(ex.problem)}，× ${ex.problem.h} ＝ ${triP.side(ex.problem)}。` },
      sumStep(triP, false),
      unitStep
    ],
    reasons: [['open', '打開看'], ['formula', '底面積 × 2 ＋ 側面積'], ['hint', '看提示']],
    done: ctx => `${triP.base(ctx.problem)} × 2 ＋ ${triP.side(ctx.problem)} ＝ ${triP.total(ctx.problem)}，表面積是 ${triP.total(ctx.problem)} 平方公分。`,
    chant: '柱體：底面積乘 2，加上側面積。側面積是底面一圈乘高。', transfer: '想一想：三角形的巧克力盒，包裝紙要多大？'
  });

  // =============== 5-3 圓柱的表面積（圓周率用 3.14） ===============
  const CYL = { easy: [[1, 2], [1, 3]], standard: [[2, 3], [2, 5], [1, 4]], challenge: [[3, 4], [2, 6], [3, 5]] };
  const cylP = { base: p => r2(p.r * p.r * 3.14), circ: p => r2(2 * p.r * 3.14), side: p => r2(2 * p.r * 3.14 * p.h), total: p => r2(2 * r2(p.r * p.r * 3.14) + r2(2 * p.r * 3.14 * p.h)), net: cylNetSVG };
  A.register('cylinder', {
    methods, makeProblem: (level, i) => { const [r, h] = pick(CYL[level] || CYL.standard, i); return { r, h, dims: [r, r, h], prompt: `圓柱的底面半徑是 ${r} 公分，高是 ${h} 公分。表面積是多少平方公分？（圓周率用 3.14）` }; },
    planFigure: ctx => cylSVG(ctx.problem, { labels: true }),
    steps: [
      targetStep((p, o) => cylSVG(p, o), '圓柱'),
      openStep('圓柱', cylSVG, cylNetSVG, 3, [['3', '3 個'], ['2', '2 個'], ['1', '1 個']]),
      { title: '底面積', ids: ['base'], hints: ['底面是圓形，怎麼算面積？', '半徑 × 半徑 × 3.14。', '圓面積 ＝ 半徑 × 半徑 × 圓周率。'],
        think: '底面是圓形：半徑 × 半徑 × 3.14。', together: '一起算：一個底面多大？',
        figure: ctx => cylNetSVG(ctx.problem, { bases: true, pulseBases: ctx.hint(2) >= 2 }),
        answer: ctx => fieldHtml(ctx, 'base', `一個底面：${ctx.problem.r} × ${ctx.problem.r} × 3.14 ＝ ？`, 2),
        check: ctx => { const v = num(ctx.answers.base), p = ctx.problem; if (v === null) return { code: 'base', msg: '把底面積填進去。' };
          return near(v, cylP.base(p)) ? null : { code: 'base', obs: 'other', msg: near(v, cylP.circ(p)) ? '這是圓周長。面積是半徑 × 半徑 × 3.14。' : '半徑 × 半徑 × 3.14，再算一次。' }; },
        solve: ctx => { ctx.answers.base = String(cylP.base(ctx.problem)); }, say: ex => `${ex.problem.r} × ${ex.problem.r} × 3.14 ＝ ${cylP.base(ex.problem)}。` },
      { title: '側面積', ids: ['perim', 'side'], hints: ['側面打開是一個長方形。', '長是底面的圓周長。寬是圓柱的高。', '先算圓周長：半徑 × 2 × 3.14。再算側面積：圓周長 × 高。'],
        think: '側面打開是長方形：長是圓周長，寬是高。', together: '一起看：側面打開是什麼形狀？',
        figure: ctx => cylNetSVG(ctx.problem, { sides: true, strip: true, pulseSides: ctx.hint(3) >= 2 }),
        answer: ctx => { const p = ctx.problem; return `<p class="notice sf-strip" data-read data-say>橘色框是側面打開的長方形。<br>長：底面的圓周長。<br>寬：圓柱的高 ${p.h} 公分。</p>${fieldHtml(ctx, 'perim', `先算圓周長：${p.r} × 2 × 3.14 ＝ ？`, 3)}${fieldHtml(ctx, 'side', `再算側面積：${esc(ctx.answers.perim ?? '圓周長')} × ${p.h} ＝ ？`, 3)}`; },
        check: ctx => { const p = ctx.problem, c = num(ctx.answers.perim), s = num(ctx.answers.side);
          if (c === null) return { code: 'perim', msg: '先算圓周長。' };
          if (!near(c, cylP.circ(p))) return { code: 'perim', obs: near(c, r2(p.r * 3.14)) ? 'halfCirc' : 'other', msg: near(c, r2(p.r * 3.14)) ? '先把半徑乘 2，算出直徑。再乘 3.14。' : '半徑 × 2 × 3.14，再算一次。' };
          if (s === null) return { code: 'side', msg: '再算側面積。' };
          return near(s, r2(c * p.h)) ? null : { code: 'side', obs: 'other', msg: '圓周長 × 高，再算一次。' }; },
        solve: ctx => { const p = ctx.problem; ctx.answers.perim = String(cylP.circ(p)); ctx.answers.side = String(cylP.side(p)); }, say: ex => `圓周長 ${cylP.circ(ex.problem)}，× ${ex.problem.h} ＝ ${cylP.side(ex.problem)}。` },
      sumStep(cylP, true),
      unitStep
    ],
    reasons: [['open', '打開看'], ['formula', '底面積 × 2 ＋ 側面積'], ['hint', '看提示']],
    done: ctx => `${cylP.base(ctx.problem)} × 2 ＋ ${cylP.side(ctx.problem)} ＝ ${cylP.total(ctx.problem)}，表面積是 ${cylP.total(ctx.problem)} 平方公分。`,
    chant: '圓柱：2 個圓形底面，加上一個長方形的側面。', transfer: '想一想：罐頭外面的標籤紙，是圓柱的哪一個部分？'
  });

  window.prismFig = { prismSVG, prismNetSVG, cylSVG, cylNetSVG, regular, rightTri, triP, cylP };

  // 第 28 版：表面積的「問問自己」，不沿用面積的同名步驟（例如「看題目」問的是圖形裡面還是邊）
  const SURF_ASK = {
    '看題目': '我要算盒子外面的哪些面？每個面都算到了嗎？', '比一比': '面對面的兩個面，長和寬一樣嗎？', '想一想': '是包在外面，還是裝在裡面？',
    '算一算': '每一種面要幾個，我都算到了嗎？', '加起來': '每一個面都加進去了嗎？有沒有加兩次？', '寫單位': '表面積的單位是平方公分嗎？'
  };
  (window.lessonPackages?.surface?.activities || []).forEach(a => { const pl = window.areaActs.get(a.id); if (pl) pl.steps.forEach(st => { const t = st.title.trim(); if (!st.ask && SURF_ASK[t]) st.ask = t === '看題目' && /prism|cyl|Prism|Cyl/.test(a.id) ? '我要算柱體外面的哪些面？底面和側面都算到了嗎？' : SURF_ASK[t]; }); });
})();

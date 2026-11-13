'use strict';
// 第 27 版：表面積教材包的活動（content-surface.js）。
// 共用：長方體的立體圖（斜視圖）、展開圖（十字形）、三種面的配色。
// 核心活動 3-1 長方體、3-2 正方體：看題目 → 展開 → 找面配對 → 量邊 → 列式 → 計算與比較 → 單位。
// 計分的連帶規則：面的面積依學生自己量的邊判定，總和依學生自己算的面判定。
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml } = U;
  const genericMethods = [['mark', '📦 先打開盒子看一看'], ['self', '🧠 先自己算，需要時看提示']];

  // ---------- 三種面：上下（長×寬）、前後（長×高）、左右（寬×高） ----------
  const PAIR = { top: 'tb', bottom: 'tb', front: 'fb', back: 'fb', left: 'lr', right: 'lr' };
  const FACE_NAME = { top: '上面', bottom: '下面', front: '前面', back: '後面', left: '左面', right: '右面' };
  const COLOR = { tb: '#bfe0ff', fb: '#ffd59e', lr: '#c8efc0' }, STROKE = '#2b4a7a', PLAIN = '#f4f6fa';
  const faceSize = (p, f) => PAIR[f] === 'tb' ? [p.l, p.w] : PAIR[f] === 'fb' ? [p.l, p.h] : [p.w, p.h];
  const areas = p => ({ tb: p.l * p.w, fb: p.l * p.h, lr: p.w * p.h });
  const total = p => { const a = areas(p); return 2 * (a.tb + a.fb + a.lr); };
  const r1 = n => Math.round(n * 10) / 10;

  // 立體圖：o.faces 要塗色的面（依配對上色）、o.pulse 閃爍的面、o.edges 顯示長度的邊、o.clickEdges 可以點邊
  function boxSVG(p, o = {}) {
    const u = Math.min(40, 230 / (p.l + p.w * 0.6), 170 / (p.h + p.w * 0.45));
    const L = p.l * u, H = p.h * u, dx = p.w * u * 0.6, dy = p.w * u * 0.45, x0 = 30, y0 = 20 + dy;
    const pts = a => a.map(q => q.map(r1).join(',')).join(' ');
    const F = { front: [[x0, y0], [x0 + L, y0], [x0 + L, y0 + H], [x0, y0 + H]], top: [[x0, y0], [x0 + dx, y0 - dy], [x0 + L + dx, y0 - dy], [x0 + L, y0]], right: [[x0 + L, y0], [x0 + L + dx, y0 - dy], [x0 + L + dx, y0 - dy + H], [x0 + L, y0 + H]] };
    const fill = f => (o.faces || []).includes(f) || (o.colorAll) ? COLOR[PAIR[f]] : PLAIN;
    let g = '';
    for (const f of ['front', 'top', 'right']) g += `<polygon points="${pts(F[f])}" fill="${fill(f)}" fill-opacity="0.85" stroke="${STROKE}" stroke-width="2" class="sf-face${(o.pulse || []).includes(f) ? ' ac-pulse' : ''}" data-face3="${f}"/>`;
    // 看不到的三條邊用虛線（畫在面的上面，才看得到盒子後面）
    if (o.hidden !== false) g += `<path d="M${r1(x0 + dx)} ${r1(y0 - dy)}V${r1(y0 - dy + H)}M${r1(x0 + dx)} ${r1(y0 - dy + H)}H${r1(x0 + L + dx)}M${r1(x0 + dx)} ${r1(y0 - dy + H)}L${x0} ${r1(y0 + H)}" fill="none" stroke="#5b6f8f" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    const E = { l: [[x0, y0 + H], [x0 + L, y0 + H]], w: [[x0 + L, y0 + H], [x0 + L + dx, y0 - dy + H]], h: [[x0 + L + dx, y0 - dy], [x0 + L + dx, y0 - dy + H]] };
    const NAME = p.cube ? { l: '邊長', w: '邊長', h: '邊長' } : { l: '長', w: '寬', h: '高' }, LEN = { l: p.l, w: p.w, h: p.h };
    for (const k of o.edgeKeys || ['l', 'w', 'h']) {
      const [a, b] = E[k], on = (o.edges || []).includes(k);
      g += `<path d="M${pts([a])}L${pts([b])}" class="ac-side${on ? ' on' : ''}${(o.pulseEdges || []).includes(k) ? ' ac-pulse' : ''}"/>`;
      if (o.clickEdges) g += `<path d="M${pts([a])}L${pts([b])}" class="ac-side-hit" data-edge="${k}" role="button" aria-label="${NAME[k]}"/>`;
      if (on) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; g += `<text x="${r1(mx + (k === 'h' ? 10 : k === 'w' ? 12 : 0))}" y="${r1(my + (k === 'l' ? 24 : k === 'w' ? 18 : 4))}" text-anchor="${k === 'l' ? 'middle' : 'start'}" class="ac-len">${NAME[k]} ${LEN[k]} 公分</text>`; }
    }
    const W = x0 + L + dx + 110, Ht = y0 + H + 40;
    return `<svg class="ac-svg" viewBox="0 0 ${r1(W)} ${r1(Ht)}" role="img" aria-label="${p.cube ? '正方體' : '長方體'}的盒子${(o.edges || []).map(k => `，${NAME[k]} ${LEN[k]} 公分`).join('')}">${g}</svg>`;
  }

  // 展開圖（十字形）：左 前 右 後 排一列，上面在前面的上方，下面在前面的下方
  // o.colored 已經配好對的組（tb、fb、lr）；o.pick 剛點的面；o.pulse 閃爍的面；o.clickFaces 可以點面；o.labels 面上寫名稱；o.nums 面上寫長×寬
  function netSVG(p, o = {}) {
    const cols = p.w + p.l + p.w + p.l, rows = p.w + p.h + p.w, u = Math.min(30, 420 / cols, 300 / rows), x0 = 6, y0 = 6;
    const R = { left: [0, p.w, p.w, p.h], front: [p.w, p.w, p.l, p.h], right: [p.w + p.l, p.w, p.w, p.h], back: [p.w + p.l + p.w, p.w, p.l, p.h], top: [p.w, 0, p.l, p.w], bottom: [p.w, p.w + p.h, p.l, p.w] };
    let g = '';
    for (const [f, [x, y, w, h]] of Object.entries(R)) {
      const on = (o.colored || []).includes(PAIR[f]) || o.colorAll, picked = o.pick === f;
      g += `<rect x="${r1(x0 + x * u)}" y="${r1(y0 + y * u)}" width="${r1(w * u)}" height="${r1(h * u)}" fill="${on ? COLOR[PAIR[f]] : picked ? '#fff3b0' : PLAIN}" stroke="${picked ? '#c2410c' : STROKE}" stroke-width="${picked ? 4 : 2}" class="sf-net${(o.pulse || []).includes(f) ? ' ac-pulse' : ''}"${o.clickFaces ? ` data-face="${f}" role="button" tabindex="0" aria-label="${FACE_NAME[f]}"` : ''}/>`;
      const cx = x0 + (x + w / 2) * u, cy = y0 + (y + h / 2) * u;
      if (o.labels) g += `<text x="${r1(cx)}" y="${r1(cy + (o.nums ? -2 : 6))}" text-anchor="middle" font-size="${Math.max(11, Math.min(16, u * 0.6))}" fill="#1d2b44" pointer-events="none">${FACE_NAME[f]}</text>`;
      if (o.nums) { const [a, b] = faceSize(p, f); g += `<text x="${r1(cx)}" y="${r1(cy + 16)}" text-anchor="middle" font-size="${Math.max(11, Math.min(15, u * 0.55))}" fill="#1d2b44" pointer-events="none">${a}×${b}</text>`; }
    }
    return `<svg class="ac-svg" viewBox="0 0 ${r1(cols * u + 12)} ${r1(rows * u + 12)}" role="img" aria-label="盒子的展開圖，有六個面">${g}</svg>`;
  }

  // 錯誤的觀察代碼（表面積）：先看答案剛好等於哪一個常見的錯誤數
  function surfObs(v, answer, p, faces) {
    if (v === null || v === undefined || Number.isNaN(v)) return 'blank';
    const a = faces || areas(p), list = [a.tb, a.fb, a.lr];
    if (v === a.tb + a.fb + a.lr && v !== answer) return 'eqHalf';
    if (v === p.l * p.w * p.h && v !== answer) return 'eqVolume';
    if (!p.cube && list.some(x => v === 6 * x) && v !== answer) return 'sixSame';
    if (list.includes(v) && v !== answer) return 'eqOneFace';
    if (list.some(x => v === answer - 2 * x) && v !== answer) return 'missFace';
    if (Math.abs(v - answer) === 1) return 'offByOne';
    return v < answer ? 'countShort' : 'countOver';
  }

  // ---------- 核心活動：長方體（3-1）、正方體（3-2） ----------
  const CUBOID = { easy: [[3, 2, 1], [4, 2, 1], [3, 2, 2]], standard: [[4, 3, 2], [5, 3, 2], [5, 4, 2]], challenge: [[6, 4, 2], [6, 4, 3], [5, 4, 3]] };
  const CUBE = { easy: [2, 3], standard: [3, 4], challenge: [4, 5] };

  function core(cube) {
    const word = cube ? '正方體' : '長方體';
    // 學生在第 4 步量的邊（填錯了，後面依學生的數判定）
    const own = ctx => { const p = ctx.problem; if (cube) { const s = num(ctx.answers.side); return s === null ? null : { l: s, w: s, h: s, cube }; }
      const l = num(ctx.answers.len), w = num(ctx.answers.wid), h = num(ctx.answers.hei); return l === null || w === null || h === null ? null : { l, w, h }; };
    const ownFaces = ctx => { if (cube) { const a = num(ctx.answers.fa); return a === null ? null : { tb: a, fb: a, lr: a }; }
      const a = num(ctx.answers.fa), b = num(ctx.answers.fb), c = num(ctx.answers.fc); return a === null || b === null || c === null ? null : { tb: a, fb: b, lr: c }; };
    const fig = (ctx, o = {}) => ctx.state.open ? netSVG(ctx.problem, o) : boxSVG(ctx.problem, o);
    const pairsDone = ctx => (ctx.state.pairs || []).length === 3;
    const steps = [
      { title: '看題目', ids: ['target'], hints: ['表面積要算哪裡？看一看盒子。', '看閃爍的地方：盒子的外面。', '表面積是包住盒子外面的大小。'],
        think: '老師想：表面積是包住盒子外面的大小。', together: '一起想：表面積要算哪裡？',
        figure: ctx => boxSVG(ctx.problem, { pulse: ctx.hint(0) >= 2 ? ['front', 'top', 'right'] : [], colorAll: ctx.hint(0) >= 2 }),
        answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('target', '表面積要算什麼？', [['outside', '包住盒子外面的大小'], ['inside', '盒子裡面可以裝多少'], ['edges', '盒子的邊加起來多長']])}`,
        check: ctx => !ctx.answers.target ? { code: 'target', msg: '請先選一個答案。' } : ctx.answers.target === 'outside' ? null
          : { code: 'target', obs: ctx.answers.target === 'inside' ? 'choseVolume' : 'wrongChoice', msg: ctx.answers.target === 'inside' ? '裡面可以裝多少，是體積。表面積是包住外面的大小。' : '邊的長度不是表面積。表面積是包住外面的大小。' },
        solve: ctx => { ctx.answers.target = 'outside'; }, say: () => '表面積是包住盒子外面的大小。' },
      { title: '展開', ids: ['count'], hints: ['按按鈕，把盒子打開來看。', '打開以後，數一數有幾個面。', '盒子打開後，可以看到全部的面。'],
        think: '老師把盒子打開，數一數有幾個面。', together: '一起做：把盒子打開，數一數。',
        figure: ctx => ctx.state.open ? netSVG(ctx.problem, { labels: ctx.hint(1) >= 2, pulse: ctx.hint(1) >= 2 ? Object.keys(PAIR) : [] }) : boxSVG(ctx.problem, {}),
        answer: ctx => `<div class="actions"><button type="button" id="sfOpen" class="primary-soft" ${ctx.state.open ? 'disabled' : ''}>📭 把盒子打開</button></div>
          ${ctx.state.open ? ctx.choice('count', '打開以後，有幾個面？', [['6', '6 個'], ['4', '4 個'], ['3', '3 個']], true) : ''}`,
        bind: ctx => { const b = document.getElementById('sfOpen'); if (b) b.onclick = () => { ctx.state.open = true; ctx.log('打開盒子'); ctx.rerender(); }; },
        check: ctx => !ctx.state.open ? { code: 'open', obs: 'unfinished', msg: '先按「把盒子打開」。' } : !ctx.answers.count ? { code: 'count', msg: '數一數，再選一個答案。' }
          : ctx.answers.count === '6' ? null : { code: 'count', obs: 'missFace', msg: ctx.answers.count === '3' ? '盒子上只看得到 3 個面，打開後再數一次。' : '再數一次，上面和下面也要數。' },
        solve: ctx => { ctx.state.open = true; ctx.answers.count = '6'; }, say: () => '打開以後有 6 個面。' },
      cube
        ? { title: '找面配對', ids: ['same'], hints: ['比一比六個面的大小。', '看閃爍的面：每個面都是一樣的正方形。', '正方體的六個面都一樣大。'],
          think: '老師比一比：正方體的每個面都一樣大。', together: '一起比：六個面一樣大嗎？',
          figure: ctx => netSVG(ctx.problem, { labels: true, colorAll: ctx.checked(2) || ctx.hint(2) >= 2, pulse: ctx.hint(2) >= 2 ? Object.keys(PAIR) : [] }),
          answer: ctx => ctx.choice('same', '正方體的六個面怎麼樣？', [['all', '六個面都一樣大'], ['pairs', '只有對面一樣大'], ['none', '每個面都不一樣']]),
          check: ctx => !ctx.answers.same ? { code: 'same', msg: '先選一個答案。' } : ctx.answers.same === 'all' ? null : { code: 'same', obs: 'wrongChoice', msg: '量一量：正方體每一條邊都一樣長，每個面也一樣大。' },
          solve: ctx => { ctx.answers.same = 'all'; }, say: () => '正方體的六個面都一樣大。' }
        : { title: '找面配對', ids: ['pairs'], hints: ['點一個面，再點和它一樣大的面。', '看閃爍的兩個面：它們一樣大。', '對面一樣大：上和下、前和後、左和右。'],
          think: '老師找一樣大的面：上和下、前和後、左和右。', together: '一起找：哪兩個面一樣大？',
          figure: ctx => { const left = ['tb', 'fb', 'lr'].find(k => !(ctx.state.pairs || []).includes(k)); return netSVG(ctx.problem, { clickFaces: true, labels: true, colored: ctx.state.pairs || [], pick: ctx.state.pick, pulse: ctx.hint(2) >= 2 && left ? Object.keys(PAIR).filter(f => PAIR[f] === left) : [] }); },
          answer: ctx => `<p data-read data-say>點一個面，再點和它一樣大的面。一樣大的兩個面會塗上同一個顏色。</p><p class="notice" data-read data-say>找到了 ${(ctx.state.pairs || []).length} 組，共 3 組。</p>`,
          bind: ctx => document.querySelectorAll('#figure2 [data-face]').forEach(el => {
            const go = () => {
              const f = el.dataset.face, st = ctx.state; st.pairs = st.pairs || [];
              if (st.pairs.includes(PAIR[f])) return;
              if (!st.pick || st.pick === f) { st.pick = st.pick === f ? null : f; ctx.refreshFigure(2); return; }
              if (PAIR[st.pick] === PAIR[f]) { st.pairs.push(PAIR[f]); ctx.answers.pairs = String(st.pairs.length); ctx.log('找到一組對面', { pair: PAIR[f] }); }
              else { st.miss = (st.miss || 0) + 1; ctx.log('配對不一樣大', { a: st.pick, b: f }); }
              st.pick = null; ctx.rerender();
            };
            el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
          }),
          check: ctx => pairsDone(ctx) ? null : { code: 'pairs', obs: 'unfinished', msg: `還有 ${3 - (ctx.state.pairs || []).length} 組沒找到。一樣大的兩個面，在盒子上是面對面的。` },
          solve: ctx => { ctx.state.open = true; ctx.state.pairs = ['tb', 'fb', 'lr']; ctx.state.pick = null; ctx.answers.pairs = '3'; }, say: () => '上和下、前和後、左和右，一共 3 組。' },
      cube
        ? { title: '量邊長', ids: ['side'], hints: ['點一下盒子的邊，看它多長。', '正方體每一條邊都一樣長，量一條就好。', '點了邊就會看到長度，把數字填進去。'],
          think: '老師點一條邊，看它多長。', together: '一起量：一條邊多長？',
          figure: ctx => boxSVG(ctx.problem, { clickEdges: true, edgeKeys: ['l'], edges: ctx.checked(3) || (ctx.state.edges || []).length ? ['l'] : [], pulseEdges: ctx.hint(3) >= 2 ? ['l'] : [] }),
          answer: ctx => `<p data-read data-say>點一下盒子下面的邊。</p>${fieldHtml(ctx, 'side', '邊長是幾公分？', 3)}`,
          bind: ctx => document.querySelectorAll('#figure3 [data-edge]').forEach(el => el.onclick = () => { ctx.state.edges = ['l']; ctx.refreshFigure(3); }),
          check: ctx => { const v = num(ctx.answers.side); if (!(ctx.state.edges || []).length) return { code: 'edge', obs: 'unfinished', msg: '先點盒子的邊，看它多長。' }; return v === null ? { code: 'side', msg: '把邊長填進去。' } : v === ctx.problem.l ? null : { code: 'side', obs: Math.abs(v - ctx.problem.l) === 1 ? 'offByOne' : 'other', msg: '看邊旁邊的數字，再填一次。' }; },
          solve: ctx => { ctx.state.edges = ['l']; ctx.answers.side = String(ctx.problem.l); }, say: ex => `邊長 ${ex.problem.l} 公分。` }
        : { title: '量三個邊', ids: ['len', 'wid', 'hei'], hints: ['點盒子的三條邊：長、寬、高。', '看閃爍的邊：一個角上有三條邊。', '點了邊就會看到長度，把三個數字填進去。'],
          think: '老師找一個角上的三條邊：長、寬、高。', together: '一起找：長、寬、高在哪裡？',
          figure: ctx => boxSVG(ctx.problem, { clickEdges: true, edges: ctx.checked(3) ? ['l', 'w', 'h'] : ctx.state.edges || [], pulseEdges: ctx.hint(3) >= 2 ? ['l', 'w', 'h'] : [] }),
          answer: ctx => `<p data-read data-say>點一下盒子的長、寬、高。</p>${fieldHtml(ctx, 'len', '長是幾公分？', 3)}${fieldHtml(ctx, 'wid', '寬是幾公分？', 3)}${fieldHtml(ctx, 'hei', '高是幾公分？', 3)}`,
          bind: ctx => document.querySelectorAll('#figure3 [data-edge]').forEach(el => el.onclick = () => { const l = ctx.state.edges = ctx.state.edges || []; if (!l.includes(el.dataset.edge)) l.push(el.dataset.edge); ctx.refreshFigure(3); }),
          check: ctx => { const p = ctx.problem, v = [num(ctx.answers.len), num(ctx.answers.wid), num(ctx.answers.hei)];
            if ((ctx.state.edges || []).length < 3) return { code: 'edge', obs: 'unfinished', msg: '先點長、寬、高三條邊，看它們多長。' };
            if (v.includes(null)) return { code: 'lwh', msg: '長、寬、高都要填。' };
            if (v[0] === p.l && v[1] === p.w && v[2] === p.h) return null;
            const same = [...v].sort().join() === [p.l, p.w, p.h].sort().join();
            return { code: 'lwh', obs: same ? 'swapped' : 'other', msg: same ? '數字都找到了，看一看哪一個是長、寬、高。' : '看邊旁邊的數字，再填一次。' }; },
          solve: ctx => { const p = ctx.problem; ctx.state.edges = ['l', 'w', 'h']; Object.assign(ctx.answers, { len: String(p.l), wid: String(p.w), hei: String(p.h) }); }, say: ex => `長 ${ex.problem.l}、寬 ${ex.problem.w}、高 ${ex.problem.h} 公分。` },
      cube
        ? { title: '列式', ids: ['formula', 'fa'], hints: ['一個面是正方形，怎麼算？', '一個面的面積 × 面的個數。', '一個面是邊長 × 邊長，有 6 個面。'],
          think: '一個面是邊長 × 邊長，一共有 6 個一樣的面。', together: '一起想：一個面多大？有幾個？',
          figure: ctx => netSVG(ctx.problem, { colorAll: true, nums: true }),
          answer: ctx => `${ctx.choice('formula', '選一個算正方體表面積的算式', [['six', '邊長 × 邊長 × 6'], ['one', '邊長 × 邊長'], ['vol', '邊長 × 邊長 × 邊長'], ['four', '邊長 × 4']])}
            ${fieldHtml(ctx, 'fa', `再算一個面：${esc(ctx.answers.side ?? '邊長')} × ${esc(ctx.answers.side ?? '邊長')} = ？`, 4)}`,
          check: ctx => { const f = ctx.answers.formula; if (!f) return { code: 'formula', msg: '先選一個算式。' };
            if (f !== 'six') return { code: 'formula', obs: f === 'one' ? 'eqOneFace' : f === 'vol' ? 'choseVolume' : 'wrongChoice', msg: f === 'one' ? '這是一個面。正方體有 6 個面。' : f === 'vol' ? '這是算裡面可以裝多少（體積）。' : '邊長 × 4 是一個面的四條邊，不是面積。' };
            const s = own(ctx), v = num(ctx.answers.fa); if (v === null) return { code: 'fa', soft: true, msg: '再算一個面的面積。' };
            return s && v === s.l * s.l ? null : { code: 'fa', obs: 'other', msg: '一個面是邊長 × 邊長，再算一次。' }; },
          solve: ctx => { ctx.answers.formula = 'six'; const s = own(ctx) || ctx.problem; ctx.answers.fa = String(s.l * s.l); }, say: ex => `一個面 ${ex.problem.l} × ${ex.problem.l}，有 6 個。` }
        : { title: '列式', ids: ['formula', 'fa', 'fb', 'fc'], hints: ['三種面，每種是哪兩個邊？', '看顏色：同一個顏色的面一樣大，每種有 2 個。', '三種面加起來，每種有 2 個，所以要乘 2。'],
          think: '三種面：上面是長 × 寬，前面是長 × 高，右面是寬 × 高；每種有 2 個。', together: '一起想：三種面各是哪兩個邊？',
          figure: ctx => netSVG(ctx.problem, { colored: ['tb', 'fb', 'lr'], labels: true, nums: true }),
          answer: ctx => { const a = ctx.answers; return `${ctx.choice('formula', '選一個算長方體表面積的算式', [['pairs', '（長×寬 ＋ 長×高 ＋ 寬×高）× 2'], ['three', '長×寬 ＋ 長×高 ＋ 寬×高'], ['vol', '長 × 寬 × 高'], ['six', '長 × 寬 × 6']])}
            <p data-read data-say>再算三種面的面積：</p>${fieldHtml(ctx, 'fa', `上面：${esc(a.len ?? '長')} × ${esc(a.wid ?? '寬')} = ？`, 4)}${fieldHtml(ctx, 'fb', `前面：${esc(a.len ?? '長')} × ${esc(a.hei ?? '高')} = ？`, 4)}${fieldHtml(ctx, 'fc', `右面：${esc(a.wid ?? '寬')} × ${esc(a.hei ?? '高')} = ？`, 4)}`; },
          check: ctx => { const f = ctx.answers.formula; if (!f) return { code: 'formula', msg: '先選一個算式。' };
            if (f !== 'pairs') return { code: 'formula', obs: { three: 'eqHalf', vol: 'choseVolume', six: 'sixSame' }[f] || 'wrongChoice', msg: { three: '這樣只算了 3 個面。每種面有 2 個。', vol: '這是算裡面可以裝多少（體積）。', six: '長方體的面不是都一樣大。' }[f] };
            const s = own(ctx), fa = num(ctx.answers.fa), fb = num(ctx.answers.fb), fc = num(ctx.answers.fc);
            if ([fa, fb, fc].includes(null)) return { code: 'faces', soft: true, msg: '再算三種面的面積。' };
            if (!s) return { code: 'faces', msg: '先回到上一步，填好長、寬、高。' };
            const bad = [[fa, s.l * s.w, '上面'], [fb, s.l * s.h, '前面'], [fc, s.w * s.h, '右面']].filter(x => x[0] !== x[1]);
            return bad.length ? { code: 'faces', obs: 'other', msg: `${bad.map(x => x[2]).join('、')}再算一次。` } : null; },
          solve: ctx => { ctx.answers.formula = 'pairs'; const s = own(ctx) || ctx.problem; Object.assign(ctx.answers, { fa: String(s.l * s.w), fb: String(s.l * s.h), fc: String(s.w * s.h) }); },
          say: ex => `（${ex.problem.l}×${ex.problem.w} ＋ ${ex.problem.l}×${ex.problem.h} ＋ ${ex.problem.w}×${ex.problem.h}）× 2。` },
      { title: '計算與比較', ids: ['total', 'compare'], hints: cube ? ['把一個面的面積乘 6。', '六個面一個一個加起來，也會一樣。', '一個面的面積 × 6，就是表面積。'] : ['把三種面加起來，再乘 2。', '六個面一個一個加起來，和算式比一比。', '三種面加起來，再乘 2，就是表面積。'],
        think: cube ? '一個面乘 6；六個面一個一個加，也一樣。' : '三種面加起來再乘 2；六個面一個一個加，也一樣。', together: '一起算，再用一個一個加的方法檢查。',
        figure: ctx => netSVG(ctx.problem, { colorAll: true, nums: true }),
        answer: ctx => { const fs = ownFaces(ctx);
          const expr = !fs ? '' : cube ? `${fs.tb} × 6 = ？` : `（${fs.tb} ＋ ${fs.fb} ＋ ${fs.lr}）× 2 = ？`;
          const list = !fs ? '' : cube ? Array(6).fill(fs.tb).join(' ＋ ') : [fs.tb, fs.tb, fs.fb, fs.fb, fs.lr, fs.lr].join(' ＋ ');
          return `<p class="ac-big" data-read data-say>${esc(expr)}</p>${fieldHtml(ctx, 'total', '表面積是多少？', 5)}
            ${fs ? `<p data-read data-say>檢查：六個面一個一個加，${list}</p>${ctx.choice('compare', '一個一個加起來，和你算的一樣嗎？', [['same', '一樣'], ['diff', '不一樣']], true)}` : ''}`; },
        check: ctx => { const fs = ownFaces(ctx), v = num(ctx.answers.total); if (v === null) return { code: 'total', msg: '請填你算出的表面積。' };
          if (!fs) return { code: 'total', msg: '先回到上一步，算好面的面積。' };
          const t = cube ? 6 * fs.tb : 2 * (fs.tb + fs.fb + fs.lr);
          if (v !== t) return { code: 'total', obs: surfObs(v, t, own(ctx) || ctx.problem, fs), msg: v === fs.tb + fs.fb + fs.lr && !cube ? '這是 3 個面。別忘了乘 2。' : '用一個一個加的方法，再算一次。' };
          if (!ctx.answers.compare) return { code: 'compare', soft: true, msg: '比一比：六個面一個一個加，和你算的一樣嗎？' };
          return ctx.answers.compare === 'same' ? null : { code: 'compare', obs: 'wrongChoice', msg: '再一個一個加一次，和你的答案比一比。' }; },
        solve: ctx => { const fs = ownFaces(ctx) || areas(ctx.problem); ctx.answers.total = String(cube ? 6 * fs.tb : 2 * (fs.tb + fs.fb + fs.lr)); ctx.answers.compare = 'same'; },
        say: ex => `表面積是 ${total(ex.problem)}。一個一個加也是 ${total(ex.problem)}。` },
      { title: '寫單位', ids: ['unit'], hints: ['表面積是面積，單位是什麼？', '不是長度的單位，也不是體積的單位。', '表面積要寫平方公分。'],
        think: '表面積是面積，單位是平方公分。', together: '一起想：表面積的單位？',
        answer: ctx => `<p class="notice" data-read data-say>你的答案：${esc(ctx.answers.total ?? '')}</p>${ctx.choice('unit', '表面積用哪個單位？', [['cm2', '平方公分'], ['cm3', '立方公分'], ['cm', '公分']])}`,
        check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === 'cm2' ? null
          : { code: 'unit', obs: ctx.answers.unit === 'cm3' ? 'unitVolume' : 'unitLength', msg: ctx.answers.unit === 'cm3' ? '立方公分是體積的單位。表面積要用平方公分。' : '公分是量長度的。表面積要用平方公分。' },
        solve: ctx => { ctx.answers.unit = 'cm2'; }, say: () => '表面積的單位是平方公分。' }
    ];
    return {
      methods: genericMethods,
      makeProblem(level, i) {
        if (cube) { const s = pick(CUBE[level] || CUBE.standard, i); return { l: s, w: s, h: s, cube: true, prompt: `正方體的盒子，邊長 ${s} 公分。請算出它的表面積是多少平方公分。` }; }
        const [l, w, h] = pick(CUBOID[level] || CUBOID.standard, i); return { l, w, h, prompt: `長方體的盒子，長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分。請算出它的表面積是多少平方公分。` };
      },
      planFigure: ctx => boxSVG(ctx.problem, { edges: cube ? ['l'] : ['l', 'w', 'h'], edgeKeys: cube ? ['l'] : ['l', 'w', 'h'] }),
      steps,
      reasons: [['open', '打開盒子看'], ['pairs', '找一樣大的面'], ['formula', '選對算式'], ['hint', '看提示']],
      done: ctx => cube ? `${ctx.problem.l} × ${ctx.problem.l} × 6 = ${total(ctx.problem)}，表面積是 ${total(ctx.problem)} 平方公分。`
        : `（${ctx.problem.l}×${ctx.problem.w} ＋ ${ctx.problem.l}×${ctx.problem.h} ＋ ${ctx.problem.w}×${ctx.problem.h}）× 2 = ${total(ctx.problem)}，表面積是 ${total(ctx.problem)} 平方公分。`,
      chant: cube ? '正方體：一個面，邊長乘邊長，再乘六。' : '長方體：三種面加起來，再乘二。',
      transfer: `找一找：生活中有什麼東西是${word}？（例如：${cube ? '骰子、魔術方塊' : '面紙盒、牛奶盒'}）`
    };
  }
  A.register('cuboid', core(false));
  A.register('cube', core(true));

  window.surfaceFig = { boxSVG, netSVG, areas, total, surfObs, PAIR, FACE_NAME, COLOR };
})();

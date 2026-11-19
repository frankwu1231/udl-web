'use strict';
// 第 35 版：整數四則運算教材包的共用工具與四個核心活動（content-int.js）。步驟的小工具借用分數包（window.fracFig），九九乘法表借用因數包（window.factorFig）。
// 共用：位值與進退位的計算、直式（位值表格）的畫法、花片／一盒一盒／一排一排的圖、線段圖、位值表（入門、一般可以打開，打開會記錄）。
// 核心活動 1-4（看懂題目四步）：看圖說故事 → 擺一擺 → 寫算式 → 說一說。
// 核心活動 2-2（直式加減五步，減法）：對齊位值 → 從個位開始 → 夠不夠減（退位）→ 一位一位往左算 → 用加法驗算。
// 核心活動 6-2（直式乘除五步，除法）：從最高位看夠不夠分 → 估商 → 乘回去、減 → 下一位拿下來（0 要寫）→ 商 × 除數 ＋ 餘數 驗算。
// 核心活動 9-2（先算哪個四步）：有括號嗎 → 有乘除嗎 → 先算的那一步 → 再算剩下的。
// 課綱備註：一年級 10 以內；N-2-2 加法最多二次進位、減法限一次退位；R-2-4 只用加法驗算減法；N-3-5 被除數二、三位數、須處理商中有 0；R-4-1 併式限整數。
(() => {
  const A = window.areaActs, U = A.util, { esc } = U, R = window.fracFig;
  const { rnd, any, fromLevel, big, cStep, prompt, shown } = R;
  // 整數教材：答案一定是 0 以上的整數，填小數（例如 16.0000000001）不算對
  const notInt = (ctx, ids) => ids.find(id => { const raw = ctx.answers[id]; if (raw == null || String(raw).trim() === '') return false; const v = Number(String(raw).trim()); return Number.isFinite(v) && !Number.isInteger(v); });
  const intOnly = st => { const base = st.check; st.check = ctx => { const bad = notInt(ctx, st.ids); return bad ? { code: bad, obs: 'other', msg: '答案是整數，不會有小數點。' } : base(ctx); }; return st; };
  const nStep = (n, o) => intOnly(R.nStep(n, o)), mStep = (n, o) => intOnly(R.mStep(n, o));
  const timesAid = ctx => window.factorFig ? window.factorFig.timesAid(ctx) : '';

  // ---------- 計算 ----------
  const digits = n => String(n).split('').map(Number);
  // 加法要進位幾次、減法要退位幾次（直式從個位算起）
  function carries(a, b) { let c = 0, n = 0; while (a > 0 || b > 0) { const s = a % 10 + b % 10 + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  function borrows(a, b) { let c = 0, n = 0; while (a > 0 || b > 0) { const d = a % 10 - c - b % 10; c = d < 0 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  // 個位不夠減時「直接用大的減小的」得到的錯答案（例如 52－37 算成 25）
  function bigMinusSmall(a, b) { let r = 0, p = 1; while (a > 0 || b > 0) { r += Math.abs(a % 10 - b % 10) * p; p *= 10; a = Math.floor(a / 10); b = Math.floor(b / 10); } return r; }
  // 加法忘了進位的錯答案（每一位只寫個位數）
  function noCarrySum(a, b) { let r = 0, p = 1; while (a > 0 || b > 0) { r += (a % 10 + b % 10) % 10 * p; p *= 10; a = Math.floor(a / 10); b = Math.floor(b / 10); } return r; }
  const round10 = n => Math.round(n / 10) * 10, round100 = n => Math.round(n / 100) * 100;
  const OPS = { '+': '＋', '-': '－', '*': '×', '/': '÷' };
  const calc = (a, op, b) => op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
  const ex = (a, op, b) => `${a} ${OPS[op]} ${b}`;

  // ---------- 圖 ----------
  // 花片：n 個，每 5 個空一點；o.x：最後幾個打叉（拿走）；o.b：後面再接幾個第二種顏色
  const chips = (n, o = {}) => { const e = o.e || '🔵', e2 = o.e2 || '🟠'; let s = '';
    for (let i = 0; i < n + (o.b || 0); i++) { const gone = o.x && i < n && i >= n - o.x; s += `<span class="in-chip${gone ? ' gone' : ''}">${i < n ? e : e2}</span>${(i + 1) % 5 === 0 ? '<span class="in-gap"></span>' : ''}`; }
    return `<div class="in-chips" role="img" aria-label="${esc(o.aria || `${n} 個${o.b ? `，再加 ${o.b} 個` : ''}${o.x ? `，拿走 ${o.x} 個` : ''}`)}">${s || '（沒有）'}</div>`; };
  // 一盒一盒（每盒 n 個，k 盒）
  const groups = (k, n, o = {}) => `<div class="in-groups" role="img" aria-label="${esc(o.aria || `${k} ${o.u || '盒'}，每${o.u || '盒'} ${n} 個`)}">${Array.from({ length: k }, () => `<span class="fr-group">${(o.e || '🥚').repeat(n)}</span>`).join('')}</div>`;
  // 一排一排（r 排，每排 c 個）
  const rows = (r, c, o = {}) => `<div class="in-rows" role="img" aria-label="${esc(o.aria || `${r} 排，每排 ${c} 個`)}">${Array.from({ length: r }, () => `<div>${(o.e || '🪑').repeat(c)}</div>`).join('')}</div>`;
  // 位值積木：幾個十、幾個一（o.h：幾個百）
  const blocks = (n, o = {}) => { const h = Math.floor(n / 100), t = Math.floor(n % 100 / 10), u = n % 10;
    return `<div class="in-blocks" role="img" aria-label="${esc(o.aria || `${h ? `${h} 個百、` : ''}${t} 個十、${u} 個一`)}">${'<span class="in-h"></span>'.repeat(h)}${'<span class="in-t"></span>'.repeat(t)}<span class="in-ones">${'<span class="in-u"></span>'.repeat(u)}</span></div>`; };
  // 直式：top 和 bot 對齊位值；o.res：答案（字串，可以有「？」）；o.carry：上面的小字（陣列，從個位算起）；o.hl：要發亮的位（0 是個位）；o.shift：bot 往左錯開幾格（錯的對齊）
  function colHtml(top, bot, op, o = {}) {
    const T = String(top), B = String(bot), Rs = o.res == null ? '' : String(o.res), sh = o.shift || 0;
    const W = Math.max(T.length, B.length + sh, Rs.length) + 1;
    const cell = (s, i, cls = '') => `<td class="${cls}${o.hl != null && W - 1 - i === o.hl ? ' hl' : ''}">${s}</td>`;
    const line = (str, pad, lead = '', cls = '', strike) => { const arr = Array.from({ length: W }, (_, i) => { const k = i - (W - pad - str.length); return k >= 0 && k < str.length ? str[k] : ''; }); if (lead) arr[0] = lead; return `<tr>${arr.map((s, i) => cell(s, i, `${cls}${strike && strike.includes(W - 1 - i) ? ' in-x' : ''}`)).join('')}</tr>`; };
    const carry = o.carry ? `<tr class="in-carry">${Array.from({ length: W }, (_, i) => cell(o.carry[W - 1 - i] ?? '', i)).join('')}</tr>` : '';
    const names = ['個', '十', '百', '千', '萬'], head = o.head === false ? '' : `<tr class="in-head">${Array.from({ length: W }, (_, i) => `<th scope="col">${i === 0 ? '' : names[W - 1 - i] || ''}</th>`).join('')}</tr>`;
    return `<table class="in-col" role="img" aria-label="${esc(o.aria || `直式：${T} ${OPS[op]} ${B}${Rs ? `，答案 ${Rs}` : ''}`)}">${head}${carry}${line(T, 0, '', '', o.strike)}${line(B, sh, OPS[op])}<tr class="in-line"><td colspan="${W}"></td></tr>${Rs ? line(Rs, 0, '', 'in-res') : ''}</table>`;
  }
  // 減法退位：每一位借位以後的數（從個位算起；沒有變的是空字串），例如 681－444 → ['11', '7', '']；503－127 → ['13', '9', '4']
  function borrowRow(a, b) { const out = []; let c = 0; while (a > 0) { const d = a % 10 - c, need = d < b % 10, v = d + (need ? 10 : 0); out.push(v !== a % 10 ? String(v) : ''); c = need ? 1 : 0; a = Math.floor(a / 10); b = Math.floor(b / 10); } return out; }
  const borrowFig = (a, b) => { const row = borrowRow(a, b); return { carry: row, strike: row.map((v, k) => v ? k : -1).filter(k => k >= 0) }; };
  // 直式除法：被除數 n、除數 d；o.q：商（字串，可以有「？」）；o.hl：被除數要發亮的位數（從左邊數幾位）
  function divHtml(n, d, o = {}) {
    const N = String(n), end = o.qEnd == null ? N.length - 1 : o.qEnd, Q = o.q == null ? '' : String(o.q).padStart(end + 1, ' ').padEnd(N.length, ' ');   // o.qEnd：商的最後一位寫在被除數第幾位（從左邊 0 算）上面，算到一半時用
    const qRow = Array.from({ length: N.length }, (_, i) => `<td>${(Q[i] || '').trim()}</td>`).join('');
    const nRow = N.split('').map((c, i) => `<td class="${o.hl && i < o.hl ? 'hl' : ''}">${c}</td>`).join('');
    return `<table class="in-col in-div" role="img" aria-label="${esc(o.aria || `直式除法：${N} ÷ ${d}${o.q ? `，商 ${o.q}` : ''}`)}"><tr class="in-res"><td></td>${qRow}</tr><tr><td class="in-d">${d}</td>${nRow}</tr></table>`;
  }
  // 線段圖：parts = [{v, label}]，全部是 total（label）；o.ask：哪一段是「？」
  function tapeSVG(parts, total, o = {}) {
    const sum = parts.reduce((s, p) => s + p.v, 0) || 1, W = 360, x0 = 10, y = 34, H = 34;
    let x = x0, g = '';
    parts.forEach((p, k) => { const w = Math.max(30, W * p.v / sum); g += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${H}" class="in-tape ${k % 2 ? 'b' : ''}"/><text x="${(x + w / 2).toFixed(1)}" y="${y + H / 2 + 6}" text-anchor="middle" class="fm-lab">${esc(p.label)}</text>`; x += w; });
    g += `<path d="M${x0} ${y - 8}V${y - 16}H${x.toFixed(1)}V${y - 8}" class="in-brace"/><text x="${((x0 + x) / 2).toFixed(1)}" y="${y - 20}" text-anchor="middle" class="fm-lab">${esc(total)}</text>`;
    return `<svg class="ac-svg in-svg" viewBox="0 0 ${(x + 10).toFixed(0)} ${y + H + 8}" style="max-width:520px" role="img" aria-label="${esc(o.aria || `線段圖：全部 ${total}，分成 ${parts.map(p => p.label).join('、')}`)}">${g}</svg>`;
  }

  // 位值表（入門、一般可以打開；打開會記一筆）
  let aidCtx = null;
  const placeAid = ctx => {
    if (ctx.level === 'challenge') return '';
    aidCtx = ctx;
    return `<details class="in-place"><summary data-read>🧱 看位值表</summary><table class="fm-ttable"><thead><tr><th scope="col">千</th><th scope="col">百</th><th scope="col">十</th><th scope="col">個</th></tr></thead><tbody><tr><td>1000</td><td>100</td><td>10</td><td>1</td></tr></tbody></table><p data-read>10 個一換 1 個十，10 個十換 1 個百，10 個百換 1 個千。不夠減，就向左邊借 1 個，換成 10 個。</p></details>`;
  };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('toggle', e => { if (e.target?.classList?.contains('in-place') && e.target.open) aidCtx?.log('開位值表'); }, true);

  const opOpts = (a, b, ops) => ops.map(op => [op, ex(a, op, b)]);
  const sayN = (n, u) => `${n} ${u}`;

  // ---------- 核心活動 1-4：看懂題目四步（加還是減，10 以內） ----------
  // 四種故事：多了（添加）、合起來（併加）、拿走、比一比
  const STORY = {
    more: { n: '多了', mk: (a, b, t) => `${t.where}有 ${a} ${t.u}${t.w}，又${t.come} ${b} ${t.u}。現在有幾${t.u}？`, op: '+' },
    join: { n: '合起來', mk: (a, b, t) => `${t.p1}有 ${a} ${t.u}${t.w}，${t.p2}有 ${b} ${t.u}。合起來有幾${t.u}？`, op: '+' },
    take: { n: '拿走了', mk: (a, b, t) => `${t.where}有 ${a} ${t.u}${t.w}，${t.go} ${b} ${t.u}。還剩幾${t.u}？`, op: '-' },
    cmp: { n: '比一比', mk: (a, b, t) => `${t.p1}有 ${a} ${t.u}${t.w}，${t.p2}有 ${b} ${t.u}。${t.p1}比${t.p2}多幾${t.u}？`, op: '-' }
  };
  const THING1 = [{ w: '小鳥', u: '隻', e: '🐦', where: '樹上', come: '飛來', go: '飛走了', p1: '小安', p2: '小明' }, { w: '蘋果', u: '顆', e: '🍎', where: '籃子裡', come: '放進', go: '吃掉了', p1: '哥哥', p2: '妹妹' },
    { w: '貼紙', u: '張', e: '⭐', where: '盒子裡', come: '放進', go: '送出', p1: '小美', p2: '小華' }, { w: '氣球', u: '個', e: '🎈', where: '教室裡', come: '拿來', go: '飛走了', p1: '一班', p2: '二班' }];
  function makeWhich(level, i, rand = Math.random) {
    const kinds = ['more', 'join', 'take', 'cmp'], kind = kinds[(i + rnd(rand, 0, 3)) % 4], t = any(rand, THING1), max = fromLevel({ easy: 6, standard: 10, challenge: 10 }, level);
    let a, b; do { a = rnd(rand, 1, max); b = rnd(rand, kind === 'take' && i % 5 === 4 ? 0 : 1, max); } while (STORY[kind].op === '+' ? a + b > max : kind === 'take' ? b > a : b >= a);
    return { kind, t, a, b, ans: calc(a, STORY[kind].op, b), dims: [a, b], prompt: STORY[kind].mk(a, b, t) };
  }
  const whichFig = ctx => { const p = ctx.problem, e = p.t.e;
    if (p.kind === 'more') return chips(p.a, { e, b: p.b, e2: e, aria: `原來 ${p.a} ${p.t.u}，又來 ${p.b} ${p.t.u}` });
    if (p.kind === 'join') return `<div class="lf-pair"><div><p class="lf-tag">${p.t.p1}</p>${chips(p.a, { e })}</div><div><p class="lf-tag">${p.t.p2}</p>${chips(p.b, { e })}</div></div>`;
    if (p.kind === 'take') return chips(p.a, { e, x: p.b, aria: `原來 ${p.a} ${p.t.u}，打叉的 ${p.b} ${p.t.u}是拿走的` });
    return `<div class="in-cmp"><p class="lf-tag">${p.t.p1}</p>${chips(p.a, { e })}<p class="lf-tag">${p.t.p2}</p>${chips(p.b, { e })}</div>`; };
  const whichSteps = [
    cStep(0, { title: '看圖說故事', ask: '發生了什麼事？', id: 'kind', hints: ['看圖：東西變多了、合起來、被拿走，還是兩邊比一比？', '「又來了、放進」是變多；「有……和……」是合起來；「走了、吃掉」是拿走；「多幾個」是比一比。', '把題目再讀一次，說說看發生什麼事。'],
      think: '老師先看圖、讀題目，說出發生了什麼事。', together: '一起說：發生什麼事？', figure: whichFig, pre: prompt,
      q: () => '這個故事是哪一種？', opts: () => Object.entries(STORY).map(([k, s]) => [k, s.n]), fixed: true, ans: ctx => ctx.problem.kind,
      wrong: (ctx, v) => ({ obs: STORY[v].op !== STORY[ctx.problem.kind].op ? 'opWrong' : 'wrongChoice', msg: '再看一次圖：東西是變多、合起來、被拿走，還是在比？' }), say: ex => `這是「${STORY[ex.problem.kind].n}」的故事。` }),
    nStep(1, { title: '擺一擺', ask: '一開始擺幾個？', id: 'first', hints: ['題目先說的那個數。', '用花片擺出第一個數。', `一開始的數，就是題目裡第一個出現的數。`],
      think: '老師用花片擺出題目先說的數。', together: '一起擺：一開始幾個？', figure: whichFig,
      label: ctx => `一開始（或${ctx.problem.kind === 'join' || ctx.problem.kind === 'cmp' ? ctx.problem.t.p1 : '原來'}）有幾${ctx.problem.t.u}？`, ans: ctx => ctx.problem.a,
      wrong: (ctx, v) => v === ctx.problem.b ? { msg: '這是後面說的數。先擺題目一開始說的。' } : null, say: ex => `先擺 ${ex.problem.a} 個。` }),
    cStep(2, { title: '寫算式', ask: '用加的還是減的？', id: 'op', hints: ['變多、合起來用加的。', '拿走、比一比多幾個用減的。', '想一想答案會比一開始多還是少。'],
      think: '老師想：變多或合起來用加，拿走或比多幾個用減。', together: '一起寫：算式是什麼？', figure: whichFig,
      q: () => '算式是哪一個？', opts: ctx => { const p = ctx.problem; return [['+', ex(p.a, '+', p.b)], ['-', p.a >= p.b ? ex(p.a, '-', p.b) : ex(p.b, '-', p.a)]]; },
      ans: ctx => STORY[ctx.problem.kind].op, wrong: () => ({ obs: 'opWrong', msg: '想一想：故事裡東西是變多，還是變少（或在比多幾個）？' }), say: e => `${ex(e.problem.a, STORY[e.problem.kind].op, e.problem.b)}。` }),
    nStep(3, { title: '說一說', ask: '答案用一句話說出來。', id: 'ans', hints: ['算一算算式。', '可以用花片數一數。', '說出答案的時候，要說是幾個什麼。'],
      think: '老師算出來，再用一句話說答案。', together: '一起算：答案是多少？', figure: whichFig,
      label: ctx => { const p = ctx.problem; return p.kind === 'cmp' ? `${p.t.p1}比${p.t.p2}多幾${p.t.u}？` : p.kind === 'take' ? `還剩幾${p.t.u}？` : `一共有幾${p.t.u}？`; }, ans: ctx => ctx.problem.ans,
      wrong: (ctx, v) => { const p = ctx.problem; return STORY[p.kind].op === '-' && v === p.a + p.b ? { obs: 'opWrong', msg: '這是加起來的數。這個故事要用減的。' } : STORY[p.kind].op === '+' && v === Math.abs(p.a - p.b) ? { obs: 'opWrong', msg: '這是減的。這個故事是變多（合起來）。' } : Math.abs(v - p.ans) === 1 ? { obs: 'offByOne', msg: '差一點點，再數一次。' } : null; },
      say: e => { const p = e.problem; return `${ex(p.a, STORY[p.kind].op, p.b)} ＝ ${p.ans}，${p.kind === 'cmp' ? `多 ${p.ans} ${p.t.u}` : p.kind === 'take' ? `還剩 ${p.ans} ${p.t.u}` : `一共 ${p.ans} ${p.t.u}`}。`; } })
  ];
  A.register('inWhich', {
    methods: [['mark', '🔵 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeWhich, planFigure: whichFig, steps: whichSteps,
    reasons: [['story', '先說故事'], ['chips', '用花片擺'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem; return `${ex(p.a, STORY[p.kind].op, p.b)} ＝ ${p.ans}。`; },
    chant: '看懂題目：說故事、擺一擺、寫算式、說答案。',
    transfer: '想一想：下課時操場有 8 個人，走了 3 個人，要用加的還是減的？'
  });

  // ---------- 核心活動 2-2：直式加減五步（減法，退位） ----------
  // 二年級（N-2-2）：三位數以內、只退位一次；挑戰（N-3-2）：四位數、可以多次退位
  function makeSubCol(level, i, rand = Math.random) {
    const [lo, hi, maxB] = fromLevel({ easy: [30, 99, 1], standard: [100, 999, 1], challenge: [1000, 9999, 3] }, level);
    let a, b; do { a = rnd(rand, lo, hi); b = rnd(rand, 10, a - 1); } while (borrows(a, b) < 1 || borrows(a, b) > maxB || a % 10 >= b % 10 || (level !== 'easy' && b < 100 && i % 2 === 0));
    const t = any(rand, [['摺紙鶴', '隻'], ['圖書館的書', '本'], ['跳繩', '下'], ['收集的瓶蓋', '個']]);
    return { a, b, d: a - b, t, dims: [a, b], prompt: `${t[0]}目標是 ${a} ${t[1]}，已經完成 ${b} ${t[1]}。還差幾${t[1]}？` };
  }
  const subFig = (ctx, o = {}) => { const p = ctx.problem; return colHtml(p.a, p.b, '-', o); };
  const subSteps = [
    cStep(0, { title: '對齊位值', ask: '個位對個位了嗎？', id: 'align', hints: ['數字要靠右邊對齊。', '個位對個位、十位對十位。', '靠右對齊，最右邊都是個位。'],
      think: '老師把兩個數靠右對齊：個位對個位、十位對十位。', together: '一起看：哪一個對齊了？', pre: ctx => `${prompt(ctx)}${placeAid(ctx)}`,
      q: () => '哪一個直式寫對了？', opts: ctx => { const p = ctx.problem; return [['ok', colHtml(p.a, p.b, '-', { head: false, aria: '個位對個位的直式' })], ['bad', colHtml(p.a, p.b, '-', { head: false, shift: 1, aria: '靠左對齊、沒有對好位值的直式' })]]; },
      ans: () => 'ok', wrong: () => ({ obs: 'placeMisalign', msg: '最右邊的數要對齊：個位對個位。' }), say: () => '個位對個位，靠右對齊。' }),
    cStep(1, { title: '從個位開始', ask: '個位夠不夠減？', id: 'enough', fixed: true, hints: ['先看個位：上面的數比下面的數小嗎？', '上面的比較小，就不夠減。', '不夠減，要向十位借 1 個十。'],
      think: '老師從個位開始看：上面的數不夠減下面的數。', together: '一起看：個位夠不夠減？', figure: ctx => subFig(ctx, { hl: 0 }),
      q: ctx => `個位：${ctx.problem.a % 10} 減 ${ctx.problem.b % 10}，夠不夠減？`, opts: () => [['no', '不夠減，要借'], ['yes', '夠減']], ans: () => 'no',
      wrong: () => ({ obs: 'subSmallFromBig', msg: '上面的數比較小，不能倒過來用下面減上面。要向十位借。' }), say: ex => `${ex.problem.a % 10} 不夠減 ${ex.problem.b % 10}，要借。` }),
    mStep(2, { title: '借 1 個十', ask: '借了以後，十位剩幾？個位變幾？', hints: ['十位借走 1 個，十位的數少 1。', '借來的 1 個十換成 10 個一，加到個位。', '個位變成「10 ＋ 原來的數」。'],
      think: '老師向十位借 1 個十：十位少 1，個位多 10。', together: '一起借：十位剩幾？個位變幾？', figure: ctx => subFig(ctx, ctx.checked(2) ? { hl: 1, ...borrowFig(ctx.problem.a, ctx.problem.b) } : { hl: 1 }), pre: placeAid,
      fields: [['tens', () => '十位借走 1 個以後，十位的數是幾？', ctx => tensAfter(ctx.problem.a), (ctx, v) => v === Math.floor(ctx.problem.a / 10) % 10 ? { obs: 'noBorrowDec', msg: '借走了 1 個十，十位要少 1。' } : null],
        ['ones', () => '個位現在是幾？', ctx => ctx.problem.a % 10 + 10, (ctx, v) => v === ctx.problem.a % 10 + 1 ? { msg: '借來的是 1 個十，等於 10 個一，要加 10。' } : null]],
      say: ex => `十位剩 ${tensAfter(ex.problem.a)}，個位變成 ${ex.problem.a % 10 + 10}。` }),
    nStep(3, { title: '一位一位算', ask: '從個位往左，一位一位減。', id: 'd', hints: ['先算個位，再算十位，再往左。', '十位要用借走以後的數。', `每一位都減完，就是答案。`],
      think: '老師從個位開始，一位一位往左減。', together: '一起算：答案是多少？', figure: ctx => subFig(ctx, { ...borrowFig(ctx.problem.a, ctx.problem.b), res: ctx.checked(3) ? ctx.problem.d : null }),
      label: ctx => `${ctx.problem.a} － ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.d,
      wrong: (ctx, v) => { const p = ctx.problem; return v === bigMinusSmall(p.a, p.b) ? { obs: 'subSmallFromBig', msg: '個位不夠減時，不能用大的減小的。要先借。' } : v === p.d + 10 || v === p.d + 100 || v === p.d + 1000 ? { obs: 'noBorrowDec', msg: '借走的那一位要少 1。' } : null; },
      say: ex => `${ex.problem.a} － ${ex.problem.b} ＝ ${ex.problem.d}。` }),
    nStep(4, { title: '用加法驗算', ask: '答案 ＋ 減數，等於被減數嗎？', id: 'chk', hints: ['把答案和減掉的數加起來。', `答案 ＋ ${'減掉的數'} ＝ ？`, '加起來要等於原來的數，答案才對。'],
      think: '老師用加法驗算：答案加上減掉的數，要等於原來的數。', together: '一起驗算：加起來是多少？', figure: ctx => colHtml(ctx.problem.d, ctx.problem.b, '+', { head: false }),
      label: ctx => `${ctx.problem.d} ＋ ${ctx.problem.b} ＝ ？`, ans: ctx => ctx.problem.a, say: ex => `${ex.problem.d} ＋ ${ex.problem.b} ＝ ${ex.problem.a}，答案對了。` })
  ];
  // 個位不夠減，向十位借 1 以後十位的數（十位是 0 時要再向百位借，十位變 9）
  function tensAfter(a) { const t = Math.floor(a / 10) % 10; return t === 0 ? 9 : t - 1; }
  A.register('inSubCol', {
    methods: [['mark', '🧱 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeSubCol, planFigure: ctx => subFig(ctx), steps: subSteps,
    reasons: [['align', '先對齊位值'], ['borrow', '不夠減就借'], ['check', '用加法驗算'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.a} － ${ctx.problem.b} ＝ ${ctx.problem.d}，還差 ${ctx.problem.d} ${ctx.problem.t[1]}。`,
    chant: '直式減法：對齊位值，從個位開始，不夠減向左借，最後用加法驗算。',
    transfer: '想一想：帶 500 元買 268 元的東西，要找多少？怎麼驗算？'
  });

  // ---------- 核心活動 6-2：直式乘除五步（除以一位數） ----------
  // N-3-5：被除數二、三位數；須處理商中有 0（例如 612 ÷ 3 ＝ 204）
  function makeDivCol(level, i, rand = Math.random) {
    const [lo, hi] = fromLevel({ easy: [20, 99], standard: [100, 999], challenge: [100, 999] }, level);
    for (;;) {
      const d = rnd(rand, 2, 9), n = rnd(rand, lo, hi), q = Math.floor(n / d), r = n % d, lead = Number(String(n)[0]);
      if (q < 10) continue;
      if (level === 'easy' && r !== 0 && i % 2 === 0) continue;
      if (level === 'challenge' && !/0/.test(String(q).slice(1, -1))) continue;   // 挑戰：商中間有 0（末尾的 0 不算）
      if (level === 'standard' && i % 3 === 2 && !/0/.test(String(q).slice(1))) continue;
      const startLen = lead >= d ? 1 : 2, q1 = Math.floor(Number(String(n).slice(0, startLen)) / d), r1 = Number(String(n).slice(0, startLen)) % d;
      return { n, d, q, r, startLen, q1, r1, dims: [n, d], prompt: `有 ${n} 片餅乾，每 ${d} 片裝一袋。可以裝幾袋？剩幾片？` };
    }
  }
  const divFig = (ctx, o = {}) => divHtml(ctx.problem.n, ctx.problem.d, o);
  const PLACE = ['個位', '十位', '百位', '千位'];
  const divSteps = [
    cStep(0, { title: '從最高位看', ask: '最左邊的數夠不夠分？', id: 'start', fixed: true, hints: ['先看被除數最左邊的那一位。', `那一位比除數小，就不夠分，要多看一位。`, '夠分的那一位，商就寫在它的上面。'],
      think: '老師從最左邊看：夠不夠分？不夠就多看一位。', together: '一起看：商從哪一位開始寫？', figure: ctx => divFig(ctx, { hl: 1 }), pre: ctx => `${prompt(ctx)}${timesAid(ctx)}`,
      q: ctx => `${ctx.problem.n} ÷ ${ctx.problem.d}，商從哪一位開始寫？`, opts: ctx => { const L = String(ctx.problem.n).length; return [[String(L - 1), `${PLACE[L - 1]}（最左邊）`], [String(L - 2), PLACE[L - 2]]]; },
      ans: ctx => String(String(ctx.problem.n).length - ctx.problem.startLen), wrong: ctx => ctx.problem.startLen === 2 ? { obs: 'startWrong', msg: `最左邊的 ${String(ctx.problem.n)[0]} 比 ${ctx.problem.d} 小，不夠分，要看兩位。` } : { obs: 'startWrong', msg: `最左邊的 ${String(ctx.problem.n)[0]} 已經夠分了。` },
      say: ex => ex.problem.startLen === 1 ? `${String(ex.problem.n)[0]} 夠分，從最左邊開始。` : `${String(ex.problem.n)[0]} 不夠分，看兩位。` }),
    nStep(1, { title: '估商', ask: '用九九乘法找最接近、不超過的。', id: 'q1', hints: ['想：除數 × 幾，最接近又不超過？', '可以打開九九乘法表找。', '超過了就小 1。'],
      think: '老師用九九乘法找：除數乘幾最接近，又不超過。', together: '一起估：第一個商是幾？', figure: ctx => divFig(ctx, { hl: ctx.problem.startLen }), pre: timesAid,
      label: ctx => `${String(ctx.problem.n).slice(0, ctx.problem.startLen)} ÷ ${ctx.problem.d}，商是幾？`, ans: ctx => ctx.problem.q1,
      wrong: (ctx, v) => v === ctx.problem.q1 + 1 ? { obs: 'estTooBig', msg: `${ctx.problem.d} × ${v} 超過了，要小 1。` } : null, say: ex => `${String(ex.problem.n).slice(0, ex.problem.startLen)} ÷ ${ex.problem.d}，商 ${ex.problem.q1}。` }),
    nStep(2, { title: '乘回去、減', ask: '乘回去，再減，剩幾？', id: 'r1', hints: ['商 × 除數，寫在下面。', '上面的數減掉它。', '剩下的要比除數小。'],
      think: '老師把商乘回去，再相減，看剩幾。', together: '一起算：剩幾？', figure: ctx => divFig(ctx, { hl: ctx.problem.startLen, q: String(ctx.problem.q1), qEnd: ctx.problem.startLen - 1 }),
      label: ctx => `${String(ctx.problem.n).slice(0, ctx.problem.startLen)} － ${ctx.problem.d} × ${ctx.problem.q1} ＝ ？`, ans: ctx => ctx.problem.r1,
      wrong: (ctx, v) => v >= ctx.problem.d ? { obs: 'remBig', msg: '剩下的比除數大（或一樣），表示商可以再大一點。' } : null, say: ex => `剩 ${ex.problem.r1}。` }),
    mStep(3, { title: '下一位拿下來', ask: '每一位都要寫商，不夠分寫 0。', hints: ['把下一位拿下來，和剩下的合起來再分。', '不夠分，商要寫 0，不能跳過。', '一直做到個位。'],
      think: '老師把下一位拿下來，繼續分；不夠分的那一位商寫 0。', together: '一起算：商和餘數是多少？', figure: ctx => divFig(ctx, ctx.checked(3) ? { q: String(ctx.problem.q) } : { q: String(ctx.problem.q1), qEnd: ctx.problem.startLen - 1 }), pre: timesAid,
      fields: [['q', () => '商是多少？', ctx => ctx.problem.q, (ctx, v) => String(v) === String(ctx.problem.q).replace(/0/g, '') ? { obs: 'zeroQuotient', msg: '不夠分的那一位，商要寫 0。' } : null],
        ['r', () => '餘數是多少？', ctx => ctx.problem.r, (ctx, v) => v >= ctx.problem.d ? { obs: 'remBig', msg: '餘數要比除數小。' } : null]],
      say: ex => `商 ${ex.problem.q}，餘 ${ex.problem.r}。` }),
    nStep(4, { title: '驗算', ask: '商 × 除數 ＋ 餘數 ＝ 被除數嗎？', id: 'chk', hints: ['先算商 × 除數。', '再加上餘數。', '要等於被除數，答案才對。'],
      think: '老師驗算：商乘除數，再加餘數，要等於被除數。', together: '一起驗算：等於多少？', figure: ctx => divFig(ctx, { q: String(ctx.problem.q) }),
      label: ctx => `${ctx.problem.q} × ${ctx.problem.d} ＋ ${ctx.problem.r} ＝ ？`, ans: ctx => ctx.problem.n, say: ex => `${ex.problem.q} × ${ex.problem.d} ＋ ${ex.problem.r} ＝ ${ex.problem.n}，對了。` })
  ];
  A.register('inDivCol', {
    methods: [['mark', '➗ 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeDivCol, planFigure: ctx => divFig(ctx), steps: divSteps,
    reasons: [['start', '先看夠不夠分'], ['zero', '不夠分寫 0'], ['check', '驗算'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem; return `${p.n} ÷ ${p.d} ＝ ${p.q}${p.r ? ` …… ${p.r}` : ''}，可以裝 ${p.q} 袋${p.r ? `，剩 ${p.r} 片` : '，剛好裝完'}。`; },
    chant: '直式除法：從最高位看，估商、乘回去、減，下一位拿下來，最後驗算。',
    transfer: '想一想：306 個人，每 3 人一組，可以分幾組？商的中間為什麼有 0？'
  });

  // ---------- 核心活動 9-2：先算哪個四步 ----------
  // R-4-1：由左往右、先乘除後加減、括號先算；只用整數，每一步的答案都是整數
  const FORMS = [
    { s: (a, b, c) => `${a} ＋ ${b} × ${c}`, first: (a, b, c) => [`${b} × ${c}`, b * c], v: (a, b, c) => a + b * c, wrong: (a, b, c) => (a + b) * c, par: false, mk: r => [rnd(r, 2, 30), rnd(r, 2, 9), rnd(r, 2, 9)] },
    { s: (a, b, c) => `${a} － ${b} × ${c}`, first: (a, b, c) => [`${b} × ${c}`, b * c], v: (a, b, c) => a - b * c, wrong: (a, b, c) => (a - b) * c, par: false, mk: r => { const b = rnd(r, 2, 9), c = rnd(r, 2, 9); return [b * c + rnd(r, 5, 40), b, c]; } },
    { s: (a, b, c) => `(${a} ＋ ${b}) × ${c}`, first: (a, b) => [`${a} ＋ ${b}`, a + b], v: (a, b, c) => (a + b) * c, wrong: (a, b, c) => a + b * c, par: true, mk: r => [rnd(r, 2, 20), rnd(r, 2, 20), rnd(r, 2, 9)] },
    { s: (a, b, c) => `${a} ＋ ${b} ÷ ${c}`, first: (a, b, c) => [`${b} ÷ ${c}`, b / c], v: (a, b, c) => a + b / c, wrong: (a, b, c) => (a + b) / c, par: false, mk: r => { const c = rnd(r, 2, 9); return [rnd(r, 2, 40), c * rnd(r, 2, 9), c]; } },
    { s: (a, b, c) => `(${a} － ${b}) ÷ ${c}`, first: (a, b) => [`${a} － ${b}`, a - b], v: (a, b, c) => (a - b) / c, wrong: (a, b, c) => a - b / c, par: true, mk: r => { const c = rnd(r, 2, 9), q = rnd(r, 2, 9), b = c * rnd(r, 1, 5); return [c * q + b, b, c]; } },
    { s: (a, b, c) => `${a} × ${b} － ${c}`, first: (a, b) => [`${a} × ${b}`, a * b], v: (a, b, c) => a * b - c, wrong: (a, b, c) => a * (b - c), par: false, mk: r => { const a = rnd(r, 2, 9), b = rnd(r, 3, 9); return [a, b, rnd(r, 1, a * b - 1)]; } }
  ];
  function makeOrder(level, i, rand = Math.random) {
    const pool = fromLevel({ easy: [0, 2, 5], standard: [0, 1, 2, 3, 4, 5], challenge: [1, 3, 4] }, level);
    for (;;) { const k = pool[(i + rnd(rand, 0, pool.length - 1)) % pool.length], F = FORMS[k], [a, b, c] = F.mk(rand), w = F.wrong(a, b, c);
      if (!Number.isInteger(F.v(a, b, c)) || F.v(a, b, c) < 0 || w === F.v(a, b, c)) continue;
      const [fs, fv] = F.first(a, b, c);
      return { k, a, b, c, text: F.s(a, b, c), par: F.par, fs, fv, v: F.v(a, b, c), w, dims: [k, a, b, c], prompt: `算算看：${F.s(a, b, c)} ＝ ？` }; }
  }
  // 「先算的」選項：兩個相鄰的運算（只取前兩個數的那一段，和後兩個數的那一段）
  const firstOpts = p => { const F = FORMS[p.k], parts = F.s(p.a, p.b, p.c).replace(/[()]/g, '').split(' '); const left = parts.slice(0, 3).join(' '), right = parts.slice(2, 5).join(' ');
    return [[left === p.fs ? 'first' : 'left', left], [right === p.fs ? 'first' : 'right', right]]; };
  const orderSteps = [
    cStep(0, { title: '有括號嗎', ask: '算式裡有沒有括號？', id: 'par', fixed: true, hints: ['看看有沒有「(」「)」。', '有括號，括號裡的先算。', '沒有括號，再看有沒有乘除。'],
      think: '老師先找括號：有括號，括號裡先算。', together: '一起找：有括號嗎？', pre: ctx => `${prompt(ctx)}${big(esc(ctx.problem.text))}`,
      q: () => '有沒有括號？', opts: () => [['yes', '有括號'], ['no', '沒有括號']], ans: ctx => ctx.problem.par ? 'yes' : 'no', wrong: () => ({ msg: '再看一次算式，找找看「(」和「)」。' }), say: ex => ex.problem.par ? '有括號。' : '沒有括號。' }),
    cStep(1, { title: '有乘除嗎', ask: '先算哪一段？', id: 'first', fixed: true, hints: ['括號裡的先算。', '沒有括號：先乘除、後加減。', '都一樣的時候，由左往右。'],
      think: '老師想：括號先算；沒有括號就先乘除、後加減。', together: '一起選：先算哪一段？', pre: ctx => big(esc(ctx.problem.text)),
      q: () => '先算哪一段？', opts: ctx => firstOpts(ctx.problem), ans: () => 'first', wrong: () => ({ obs: 'leftToRight', msg: '不是一定由左往右：括號先算，再來是乘除，最後才是加減。' }), say: ex => `先算 ${ex.problem.fs}。` }),
    nStep(2, { title: '先算的那一步', ask: '先算的那一段是多少？', id: 'fv', hints: ['只算剛剛選的那一段。', '乘法可以看九九乘法表。', '算好寫下來，再接著算。'],
      think: '老師先算那一段，寫下來。', together: '一起算：先算的那段是多少？', pre: ctx => `${big(esc(ctx.problem.text))}${timesAid(ctx)}`,
      label: ctx => `${ctx.problem.fs} ＝ ？`, ans: ctx => ctx.problem.fv, say: ex => `${ex.problem.fs} ＝ ${ex.problem.fv}。` }),
    nStep(3, { title: '再算剩下的', ask: '把先算的答案放回去，再算。', id: 'v', hints: ['把先算的那一段換成它的答案。', '剩下的一步再算。', '一步一步寫：算式 ＝ … ＝ 答案。'],
      think: '老師把先算的答案放回去，再算最後一步（逐次減項）。', together: '一起算：答案是多少？', pre: ctx => big(esc(ctx.problem.text)),
      label: ctx => `${ctx.problem.text} ＝ ？`, ans: ctx => ctx.problem.v,
      wrong: (ctx, v) => v === ctx.problem.w ? { obs: 'leftToRight', msg: '這是算錯順序的答案。括號先算，沒有括號就先乘除。' } : null, say: ex => `${ex.problem.text} ＝ ${ex.problem.v}。` })
  ];
  A.register('inOrder', {
    methods: [['mark', '🔢 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeOrder, planFigure: ctx => big(esc(ctx.problem.text)), steps: orderSteps,
    reasons: [['par', '先找括號'], ['md', '先乘除後加減'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.text} ＝ ${ctx.problem.v}。`,
    chant: '先算哪個：括號先算，再算乘除，最後加減；一樣的由左往右。',
    transfer: '想一想：買 3 枝 10 元的筆和 1 本 25 元的簿子，算式怎麼寫？'
  });

  window.intFig = { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, timesAid, placeAid, digits, carries, borrows, bigMinusSmall, noCarrySum, round10, round100, OPS, calc, ex, opOpts, sayN,
    chips, groups, rows, blocks, colHtml, divHtml, borrowRow, borrowFig, tapeSVG, STORY, THING1, tensAfter };
})();

'use strict';
// 第 36 版：錢幣與購物教材包的共用工具（錢幣圖、付款盤）與單元 0～2（content-money.js）。步驟的小工具借用整數包（window.intFig）。
// 錢幣、鈔票是簡化的圖：顏色、大小接近真的新臺幣，只畫面額，不畫真鈔圖案（吳老師 2026-11-19 同意先這樣做）。
// 課綱（教育部數學領綱原文）：N-1-4 1元、5元、10元、50元、100元，以操作為主，數錢、換錢、找錢，容許多元策略，不應視為單純的加減單元；
// N-2-5 100元、500元、1000元，可與估算（N-2-4）連結。課綱沒有 20 元、200 元、2000 元，本包不用。
// 核心活動 1-3（數錢四步）：分一分 → 先數大的 → 接著往下數 → 說出總共多少元。
// 單元 2「錢從哪裡來」是跨領域：社會 Ad-Ⅱ-1（間接對應，國小社會沒有貨幣史條目）、生活課程 2-I-2、A-I-2、2-I-4、F-I-2；2-4 特生E-sP-3、特生2-sA-1。
(() => {
  const A = window.areaActs, I = window.intFig;
  const { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, chips, groups, colHtml, placeAid, borrows, carries } = I;

  // ---------- 錢幣與鈔票 ----------
  const DEN = [1000, 500, 100, 50, 10, 5, 1];          // 由大到小
  const isBill = d => d >= 100;
  const unitOf = d => isBill(d) ? '張' : '個';
  const nameOf = d => `${d} 元${isBill(d) ? '鈔票' : ''}`;
  // 一個錢幣（或一張鈔票）的圖：o.small 小一點（盤子、選項裡）
  const coin = (d, o = {}) => `<span class="mo-${isBill(d) ? 'bill' : 'coin'} d${d}${o.small ? ' sm' : ''}" role="img" aria-label="${d} 元${isBill(d) ? '鈔票' : '硬幣'}"><b>${d}</b>${isBill(d) ? '<i>元</i>' : ''}</span>`;
  const total = c => DEN.reduce((s, d) => s + d * (c[d] || 0), 0);
  const pieces = c => DEN.reduce((s, d) => s + (c[d] || 0), 0);
  const kinds = c => DEN.filter(d => c[d] > 0);
  const countsText = c => kinds(c).map(d => `${d} 元 ${c[d]} ${unitOf(d)}`).join('、') || '沒有錢';
  // 一堆錢的圖：o.order 給排列順序（打亂的錢幣，[d, d, ...]），沒有就由大到小排
  function pile(c, o = {}) {
    const list = o.order || DEN.flatMap(d => Array(c[d] || 0).fill(d));
    return `<div class="mo-pile${o.cls ? ' ' + o.cls : ''}" role="img" aria-label="${esc(o.aria || countsText(c))}">${list.map(d => coin(d)).join('') || '<span class="mo-empty">（沒有錢）</span>'}</div>`;
  }
  // 打亂順序（同一題固定，存在 problem 裡）
  const mixOrder = (c, rand) => { const l = DEN.flatMap(d => Array(c[d] || 0).fill(d)); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  // 用 denoms 裡的錢湊出 n 元、用最少個（每種最多 lim[d] 個）；湊不出來回傳 null
  function greedy(n, denoms = DEN, lim = null) {
    const c = {}; let left = n;
    for (const d of [...denoms].sort((a, b) => b - a)) { const k = Math.min(Math.floor(left / d), lim ? (lim[d] || 0) : Infinity); if (k > 0) { c[d] = k; left -= k * d; } }
    return left === 0 ? c : null;
  }
  // 價目牌
  const tag = (name, price, o = {}) => `<div class="mo-tag"${o.aria ? ` aria-label="${esc(o.aria)}"` : ''}><span class="mo-tag-n">${esc(name)}</span><span class="mo-tag-p">${price} 元</span></div>`;
  const tags = list => `<div class="mo-tags">${list.map(([n, p]) => tag(n, p)).join('')}</div>`;

  // ---------- 付款盤（點錢放進盤子，點盤子裡的錢拿回來） ----------
  // o.denoms：可以用哪幾種錢；o.wallet：錢包裡每種有幾個（有限制時）；o.label：說明
  const payAns = c => pieces(c) ? `付款盤：${countsText(c)}` : '';
  function payHtml(ctx, key, o = {}) {
    const c = ctx.state[key] || {}, denoms = o.denoms || DEN.filter(d => d <= 100);
    const btn = d => { const left = o.wallet ? (o.wallet[d] || 0) - (c[d] || 0) : null;
      return `<button type="button" class="mo-add" data-pay="${key}" data-d="${d}"${left !== null && left <= 0 ? ' disabled' : ''} aria-label="放一${unitOf(d)} ${d} 元進盤子${left !== null ? `（還有 ${left} ${unitOf(d)}）` : ''}">${coin(d, { small: true })}${left !== null ? `<span class="mo-left">還有 ${left}</span>` : ''}</button>`; };
    return `<div class="mo-pay" data-paybox="${key}"><p class="mo-pay-note" data-read>${esc(o.label || '點下面的錢，放進付款盤；點盤子裡的錢，可以拿回來。')}</p>
      <div class="mo-bank" role="group" aria-label="${o.wallet ? '錢包裡的錢' : '可以用的錢'}">${denoms.filter(d => !o.wallet || o.wallet[d]).map(btn).join('')}</div>
      <div class="mo-tray" role="group" aria-label="付款盤" aria-live="polite">${trayInner(c, key)}</div>
      <button type="button" class="mo-clear text-button" data-payclear="${key}">全部拿回來</button></div>`;
  }
  const trayInner = (c, key) => { const list = DEN.flatMap(d => Array(c[d] || 0).fill(d));
    return list.length ? list.map(d => `<button type="button" class="mo-out" data-unpay="${key}" data-d="${d}" aria-label="把一${unitOf(d)} ${d} 元拿回來">${coin(d, { small: true })}</button>`).join('') : '<span class="mo-empty">盤子是空的</span>'; };
  function bindPay(step, key, o = {}) {
    return ctx => {
      const box = () => document.querySelector(`[data-paybox="${key}"]`);
      const set = (c, what, d) => { ctx.state[key] = c; ctx.answers[key] = payAns(c); ctx.log(what, { d, total: total(c), pieces: pieces(c) }); ctx.invalidate(step);
        const b = box(); if (!b) return; const tmp = document.createElement('div'); tmp.innerHTML = payHtml(ctx, key, o); b.replaceWith(tmp.firstElementChild); bindPay(step, key, o)(ctx); };
      document.querySelectorAll(`[data-pay="${key}"]`).forEach(el => { el.onclick = () => { const d = Number(el.dataset.d), c = { ...(ctx.state[key] || {}) }; if (o.wallet && (c[d] || 0) >= (o.wallet[d] || 0)) return; c[d] = (c[d] || 0) + 1; set(c, '放錢', d); }; });
      document.querySelectorAll(`[data-unpay="${key}"]`).forEach(el => { el.onclick = () => { const d = Number(el.dataset.d), c = { ...(ctx.state[key] || {}) }; c[d] = Math.max(0, (c[d] || 0) - 1); if (!c[d]) delete c[d]; set(c, '拿回錢', d); }; });
      document.querySelectorAll(`[data-payclear="${key}"]`).forEach(el => { el.onclick = () => set({}, '盤子清空', 0); });
    };
  }
  // 付款盤的一步：o.target(ctx) 要湊的錢；o.rule：'exact' 剛好、'enough' 夠而且沒有多拿、'fewest' 剛好而且最少個
  // o.opts(ctx) → payHtml 的選項（denoms、wallet）
  function payStep(n, o) {
    const key = o.id, opt = ctx => (o.opts ? o.opts(ctx) : {});
    return { title: o.title, ask: o.ask, ids: [key], hints: o.hints, think: o.think, together: o.together, figure: o.figure,
      answer: ctx => `${o.pre ? o.pre(ctx) : ''}<p data-read data-say>${esc(o.label(ctx))}</p>${payHtml(ctx, key, opt(ctx))}`,
      bind: ctx => bindPay(n, key, opt(ctx))(ctx),
      check: ctx => {
        const c = ctx.state[key] || {}, t = o.target(ctx), s = total(c), op = opt(ctx);
        if (!pieces(c)) return { code: key, obs: 'unfinished', msg: '點錢，放進付款盤。' };
        if (op.denoms && kinds(c).some(d => !op.denoms.includes(d))) return { code: key, obs: 'other', msg: '這一題只能用上面那幾種錢。' };
        if (op.wallet && kinds(c).some(d => c[d] > (op.wallet[d] || 0))) return { code: key, obs: 'other', msg: '錢包裡沒有那麼多。' };
        if (s < t) return { code: key, obs: 'payShort', msg: `盤子裡的錢還不夠。數一數，再加一些。` };
        if (o.rule === 'enough') { const small = Math.min(...kinds(c)); if (s - small >= t) return { code: key, obs: 'payOver', msg: '夠了，可是多拿了：拿掉一個也還夠，就不用給那一個。' }; return null; }
        if (s > t) return { code: key, obs: 'payOver', msg: `盤子裡的錢太多了。拿回來一些，要剛好。` };
        if (o.rule === 'fewest') { const g = greedy(t, op.denoms || DEN); if (g && pieces(c) > pieces(g)) return { code: key, obs: 'notFewest', msg: '錢是對的，可是還可以用更少個：幾個小的可以換成一個大的。' }; }
        return null;
      },
      solve: ctx => { const op = opt(ctx), t = o.target(ctx); let c = o.solveWith ? o.solveWith(ctx) : greedy(t, op.denoms || DEN, op.wallet || null); if (!c) c = {}; ctx.state[key] = c; ctx.answers[key] = payAns(c); },
      say: o.say };
  }

  // ---------- 單元 0：準備好了嗎 ----------
  const THINGS = [['🍬', '顆', '糖果'], ['⭐', '張', '貼紙'], ['🍎', '顆', '蘋果'], ['✏️', '枝', '鉛筆']];
  A.register('moCount', {
    methods: [['mark', '🔢 一個一個數'], ['self', '🧠 先自己數']],
    makeProblem: (level, i, rand = Math.random) => { const n = rnd(rand, ...fromLevel({ easy: [3, 10], standard: [8, 20], challenge: [15, 30] }, level)), t = any(rand, THINGS); return { n, t, dims: [n], prompt: `數一數，有幾${t[1]}${t[2]}？` }; },
    planFigure: ctx => chips(ctx.problem.n, { e: ctx.problem.t[0], aria: `${ctx.problem.n} ${ctx.problem.t[1]}${ctx.problem.t[2]}` }),
    steps: [
      nStep(0, { title: '一個一個數', ask: '一共有幾個？', id: 'n', hints: ['用手指著，一個一個數。', '數過的不要再數；五個五個隔開，比較好數。', '最後數到的數，就是一共有幾個。'], think: '老師用手指著，一個一個數，最後數到的數就是一共幾個。', together: '一起數：一共幾個？',
        pre: prompt, figure: ctx => A.get('moCount').planFigure(ctx), label: ctx => `一共有幾${ctx.problem.t[1]}？`, ans: ctx => ctx.problem.n, say: e => `一共 ${e.problem.n} ${e.problem.t[1]}。` }),
      nStep(1, { title: '再多 1 個', ask: '再多 1 個是幾個？', id: 'm', hints: ['從剛剛數到的數，往下再數 1 個。', '不用從頭數，接著數。', '比剛剛的數多 1。'], think: '老師不從頭數，從剛剛的數接著往下數 1 個。', together: '一起接著數：再多 1 個是幾個？',
        figure: ctx => chips(ctx.problem.n, { e: ctx.problem.t[0], b: 1, e2: ctx.problem.t[0], aria: `${ctx.problem.n} 個，再多 1 個` }), label: ctx => `再放 1 ${ctx.problem.t[1]}，一共幾${ctx.problem.t[1]}？`, ans: ctx => ctx.problem.n + 1, say: e => `接著數，是 ${e.problem.n + 1}。` })
    ],
    reasons: [['count', '一個一個數'], ['hint', '看提示']], done: ctx => `一共 ${ctx.problem.n} 個，再多 1 個是 ${ctx.problem.n + 1} 個。`, chant: '數一數：一個一個數，數過的不再數；接著數，不用從頭數。', transfer: '想一想：數錢的時候，也可以接著數嗎？'
  });

  A.register('moSkip', {
    methods: [['mark', '🧺 一袋一袋數'], ['self', '🧠 先自己數']],
    makeProblem: (level, i, rand = Math.random) => { const per = level === 'easy' ? 10 : any(rand, [5, 10]), k = rnd(rand, 2, per === 10 ? 9 : 9), extra = level === 'challenge' ? rnd(rand, 1, 4) : 0;
      return { per, k, extra, n: per * k + extra, dims: [per, k, extra], prompt: `一袋有 ${per} 顆彈珠，有 ${k} 袋${extra ? `，還有 ${extra} 顆沒裝袋` : ''}。一共幾顆？` }; },
    planFigure: ctx => `${groups(ctx.problem.k, ctx.problem.per, { e: '🔵', u: '袋', aria: `${ctx.problem.k} 袋，每袋 ${ctx.problem.per} 顆` })}${ctx.problem.extra ? chips(ctx.problem.extra, { aria: `還有 ${ctx.problem.extra} 顆` }) : ''}`,
    steps: [
      cStep(0, { title: '一袋幾個', ask: '一袋有幾顆？', id: 'per', fixed: true, hints: ['數一袋就好。', '一袋裡面的彈珠一樣多。', '題目也有寫一袋幾顆。'], think: '老師先數一袋有幾顆。', together: '一起看：一袋幾顆？', pre: prompt, figure: ctx => A.get('moSkip').planFigure(ctx),
        q: () => '一袋有幾顆？', opts: () => [['5', '5 顆'], ['10', '10 顆'], ['1', '1 顆']], ans: ctx => String(ctx.problem.per), say: e => `一袋 ${e.problem.per} 顆。` }),
      nStep(1, { title: '一袋一袋數', ask: '一袋一袋數，一共幾顆？', id: 'n', hints: ['一袋一袋數：5、10、15……或 10、20、30……', '用手指著袋子，數一袋說一次。', '最後還有沒裝袋的，要一顆一顆接著數。'], think: '老師一袋一袋數，最後再接著數沒裝袋的。', together: '一起數：一共幾顆？', figure: ctx => A.get('moSkip').planFigure(ctx),
        label: () => '一共幾顆？', ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === ctx.problem.k + ctx.problem.extra ? { obs: 'coinsAsMoney', msg: '這是有幾袋。一袋有好幾顆，要一袋一袋數。' } : null,
        say: e => `${Array.from({ length: e.problem.k }, (_, j) => (j + 1) * e.problem.per).join('、')}${e.problem.extra ? '，' + Array.from({ length: e.problem.extra }, (_, j) => e.problem.per * e.problem.k + j + 1).join('、') : ''}，一共 ${e.problem.n} 顆。` })
    ],
    reasons: [['skip', '幾個幾個數'], ['hint', '看提示']], done: ctx => `一共 ${ctx.problem.n} 顆。`, chant: '五個五個、十個十個數，數錢也會用到。', transfer: '想一想：3 個 10 元，要怎麼數？'
  });

  // ---------- 單元 1：認識錢幣 ----------
  const COIN_SET = { easy: [1, 5, 10], standard: [1, 5, 10, 50], challenge: [1, 5, 10, 50, 100] };
  const denOpts = level => fromLevel(COIN_SET, level).map(d => [String(d), `${d} 元`]);
  A.register('moKnow', {
    methods: [['mark', '🪙 看數字認一認'], ['self', '🧠 先自己認']],
    makeProblem: (level, i, rand = Math.random) => { const set = fromLevel(COIN_SET, level), d = set[(i + rnd(rand, 0, set.length - 1)) % set.length];
      let a, b; do { a = any(rand, set); b = any(rand, set); } while (a === b);
      let f; do f = any(rand, set); while (f === d);
      return { d, a, b, f, dims: [d, a, b, f], prompt: '看一看錢上面的數字，認一認是幾元。' }; },
    planFigure: ctx => `<div class="mo-show">${coin(ctx.problem.d)}</div>`,
    steps: [
      cStep(0, { title: '看數字', ask: '這是幾元？', id: 'd', hints: ['錢上面有數字。', '看數字，不要只看大小或顏色。', '數字是幾，就是幾元。'], think: '老師看錢上面的數字：數字是幾，就是幾元。', together: '一起看：這是幾元？',
        pre: prompt, figure: ctx => `<div class="mo-show">${coin(ctx.problem.d)}</div>`, q: () => '這是幾元？', opts: ctx => denOpts(ctx.level), fixed: true, ans: ctx => String(ctx.problem.d),
        wrong: () => ({ obs: 'denomConfuse', msg: '再看一次錢上面寫的數字。' }), say: e => `上面寫 ${e.problem.d}，是 ${nameOf(e.problem.d)}。` }),
      cStep(1, { title: '比一比', ask: '哪一個比較多錢？', id: 'cmp', fixed: true, hints: ['看兩個錢上面的數字。', '數字比較大的，比較多錢。', '不是看哪一個比較大塊。'], think: '老師比兩個錢上面的數字，數字大的比較多錢。', together: '一起比：哪一個比較多錢？',
        figure: ctx => `<div class="lf-pair"><div><p class="lf-tag">左邊</p><div class="mo-show">${coin(ctx.problem.a)}</div></div><div><p class="lf-tag">右邊</p><div class="mo-show">${coin(ctx.problem.b)}</div></div></div>`,
        q: () => '哪一個比較多錢？', opts: () => [['l', '左邊'], ['r', '右邊']], ans: ctx => ctx.problem.a > ctx.problem.b ? 'l' : 'r', wrong: () => ({ obs: 'denomConfuse', msg: '看數字：數字比較大的比較多錢。' }),
        say: e => `${Math.max(e.problem.a, e.problem.b)} 元比 ${Math.min(e.problem.a, e.problem.b)} 元多。` }),
      cStep(2, { title: '找一找', ask: '找出指定的錢。', id: 'find', hints: ['先想：要找的是幾元。', '一個一個看錢上面的數字。', '數字一樣的就是。'], think: '老師一個一個看數字，找到一樣的。', together: '一起找：哪一個是？', figure: () => '',
        q: ctx => `哪一個是 ${nameOf(ctx.problem.f)}？`, opts: ctx => fromLevel(COIN_SET, ctx.level).map(d => [String(d), coin(d, { small: true })]), ans: ctx => String(ctx.problem.f),
        wrong: () => ({ obs: 'denomConfuse', msg: '再看一次每個錢上面的數字。' }), say: e => `上面寫 ${e.problem.f} 的就是。` })
    ],
    reasons: [['digit', '看錢上面的數字'], ['hint', '看提示']], done: ctx => `認出 ${nameOf(ctx.problem.d)}，也找到 ${nameOf(ctx.problem.f)}。`, chant: '認錢：看數字，數字是幾就是幾元。', transfer: '想一想：家裡的撲滿裡，有哪幾種錢？'
  });

  A.register('moSame', {
    methods: [['mark', '🪙 幾元幾元數'], ['self', '🧠 先自己數']],
    makeProblem: (level, i, rand = Math.random) => {
      const d = any(rand, fromLevel({ easy: [1, 10], standard: [1, 5, 10], challenge: [5, 10, 50] }, level));
      const max = Math.min(d === 1 ? fromLevel({ easy: 10, standard: 20, challenge: 20 }, level) : 9, Math.floor(100 / d)), k = rnd(rand, 2, Math.max(2, max));
      return { d, k, n: d * k, dims: [d, k], prompt: `撲滿裡倒出 ${k} 個一樣的硬幣。一共幾元？` }; },
    planFigure: ctx => pile({ [ctx.problem.d]: ctx.problem.k }),
    steps: [
      cStep(0, { title: '是幾元的', ask: '這些都是幾元的？', id: 'd', fixed: true, hints: ['看錢上面的數字。', '每一個都一樣。', '看一個就知道。'], think: '老師看一個硬幣上面的數字。', together: '一起看：是幾元的？', pre: prompt, figure: ctx => A.get('moSame').planFigure(ctx),
        q: () => '這些都是幾元的？', opts: () => [1, 5, 10, 50].map(d => [String(d), `${d} 元`]), ans: ctx => String(ctx.problem.d), wrong: () => ({ obs: 'denomConfuse', msg: '看硬幣上面的數字。' }), say: e => `都是 ${e.problem.d} 元。` }),
      nStep(1, { title: '有幾個', ask: '有幾個？', id: 'k', hints: ['一個一個數。', '用手指著，數過的不再數。', '最後數到的數就是幾個。'], think: '老師一個一個數有幾個。', together: '一起數：有幾個？', figure: ctx => A.get('moSame').planFigure(ctx),
        label: () => '有幾個硬幣？', ans: ctx => ctx.problem.k, say: e => `有 ${e.problem.k} 個。` }),
      nStep(2, { title: '一共幾元', ask: `幾元幾元數，一共幾元？`, id: 'n', hints: ['1 元一個一個數；5 元五個五個數；10 元十個十個數。', '每數一個硬幣，就說一次。', '數到最後一個硬幣的數，就是一共幾元。'], think: '老師照硬幣的數字數：數一個硬幣，加一次那麼多。', together: '一起數：一共幾元？',
        figure: ctx => A.get('moSame').planFigure(ctx), label: () => '一共幾元？', ans: ctx => ctx.problem.n,
        wrong: (ctx, v) => v === ctx.problem.k && ctx.problem.d !== 1 ? { obs: 'coinsAsMoney', msg: `這是有幾個。一個是 ${ctx.problem.d} 元，要 ${ctx.problem.d} 元 ${ctx.problem.d} 元數。` } : null,
        say: e => `${Array.from({ length: e.problem.k }, (_, j) => (j + 1) * e.problem.d).join('、')}，一共 ${e.problem.n} 元。` })
    ],
    reasons: [['skip', '幾元幾元數'], ['hint', '看提示']], done: ctx => `${ctx.problem.k} 個 ${ctx.problem.d} 元，一共 ${ctx.problem.n} 元。`, chant: '一樣的錢：看是幾元，就幾元幾元數。', transfer: '想一想：4 個 5 元，一共幾元？'
  });

  // 1-3 數錢四步（核心）
  function makeMixed(level, i, rand = Math.random) {
    const set = fromLevel(MIX_SET, level), max = fromLevel({ easy: 50, standard: 100, challenge: 100 }, level);
    for (;;) { const c = {}; set.forEach(d => { const k = rnd(rand, 0, d === 50 ? 1 : d === 10 ? 5 : 4); if (k) c[d] = k; });
      if (kinds(c).length < 2 || total(c) > max || pieces(c) > 12 || (level !== 'easy' && kinds(c).length < 3 && rand() < 0.6)) continue;
      const ks = kinds(c), part = ks[0] * c[ks[0]] + ks[1] * c[ks[1]];
      return { c, order: mixOrder(c, rand), n: total(c), part, ks, dims: [total(c), pieces(c)], prompt: '錢包裡倒出這些錢。一共幾元？' }; }
  }
  // 分一分：每一種錢一格（依等級有哪幾種；沒有的那一種填 0）
  const MIX_SET = { easy: [10, 1], standard: [50, 10, 5, 1], challenge: [50, 10, 5, 1] };
  function sortStep() {
    const fields = ctx => fromLevel(MIX_SET, ctx.level).map(d => [`k${d}`, () => `${d} 元有幾個？`, c2 => c2.problem.c[d] || 0, (c2, v) => v === c2.problem.c[d] * d && d > 1 ? { obs: 'coinsAsMoney', msg: '這一格要填有幾個，不是幾元。' } : { obs: 'mixCount', msg: '一種一種數：這一種有幾個？' }]);
    const M = ctx => mStep(0, { fields: fields(ctx), pre: prompt });
    return { title: '分一分', ask: '一樣的錢放一起，各有幾個？', ids: ['k50', 'k10', 'k5', 'k1'], hints: ['把一樣的錢排在一起。', '一種一種數：10 元有幾個、1 元有幾個……', '沒有的那一種就填 0。'],
      think: '老師把一樣的錢放在一起，一種一種數有幾個。', together: '一起分：每一種有幾個？', figure: ctx => pile(ctx.problem.c, { order: ctx.problem.order }),
      answer: ctx => M(ctx).answer(ctx), check: ctx => M(ctx).check(ctx), solve: ctx => M(ctx).solve(ctx), say: e => countsText(e.problem.c) + '。' };
  }
  A.register('moMixed', {
    methods: [['mark', '🪙 一步一步數'], ['self', '🧠 先自己數，需要時看提示']], makeProblem: makeMixed, planFigure: ctx => pile(ctx.problem.c, { order: ctx.problem.order }),
    steps: [
      sortStep(),
      cStep(1, { title: '先數大的', ask: '先數哪一種？', id: 'first', fixed: true, hints: ['大的先數，比較好數。', '看哪一種錢的數字最大。', '先數數字最大的那一種。'], think: '老師先數數字最大的錢。', together: '一起想：先數哪一種？',
        figure: ctx => pile(ctx.problem.c, { cls: 'sorted' }), q: () => '先數哪一種錢？', opts: ctx => ctx.problem.ks.map(d => [String(d), `${d} 元`]), ans: ctx => String(ctx.problem.ks[0]),
        wrong: () => ({ obs: 'wrongChoice', msg: '先數數字最大的那一種，比較好數。' }), say: e => `先數 ${e.problem.ks[0]} 元。` }),
      nStep(2, { title: '接著往下數', ask: '數完大的，接著數下一種，數到幾元？', id: 'part', hints: ['先數最大的那一種。', '不要從頭數：接著往下數第二種。', '例如 10、20、30，再接著 35、40。'], think: '老師先數最大的，再接著數第二種，不從頭數。', together: '一起接著數：數到幾元？',
        figure: ctx => pile(ctx.problem.c, { cls: 'sorted' }), label: ctx => `數完 ${ctx.problem.ks[0]} 元和 ${ctx.problem.ks[1]} 元，數到幾元？`, ans: ctx => ctx.problem.part,
        wrong: (ctx, v) => { const p = ctx.problem; return v === p.c[p.ks[0]] + p.c[p.ks[1]] ? { obs: 'coinsAsMoney', msg: '這是有幾個。要照錢上的數字數。' } : { obs: 'mixCount', msg: '換到第二種錢的時候，要改成那一種的數法接著數。' }; },
        say: e => { const p = e.problem; let s = 0; const seq = []; for (const d of [p.ks[0], p.ks[1]]) for (let j = 0; j < p.c[d]; j++) { s += d; seq.push(s); } return `${seq.join('、')}，數到 ${p.part} 元。`; } }),
      nStep(3, { title: '說總數', ask: '全部數完，一共幾元？', id: 'n', hints: ['接著把剩下的錢數完。', '每數一個錢，就加上它的數字。', '數完最後一個，就是一共幾元。'], think: '老師把剩下的錢接著數完，說出一共幾元。', together: '一起數完：一共幾元？',
        figure: ctx => pile(ctx.problem.c, { cls: 'sorted' }), label: () => '一共幾元？', ans: ctx => ctx.problem.n,
        wrong: (ctx, v) => v === pieces(ctx.problem.c) ? { obs: 'coinsAsMoney', msg: '這是有幾個錢。要照錢上的數字數。' } : v === kinds(ctx.problem.c).reduce((s, d) => s + d, 0) ? { obs: 'mixCount', msg: '每一種不只一個，每一個都要數。' } : { obs: 'mixCount', msg: '從大的開始，再數一次。' },
        say: e => `一共 ${e.problem.n} 元。` })
    ],
    reasons: [['sort', '先分一分'], ['big', '先數大的'], ['hint', '看提示']], done: ctx => `${countsText(ctx.problem.c)}，一共 ${ctx.problem.n} 元。`,
    chant: '數錢四步：分一分、先數大的、接著往下數、說出總共多少元。', transfer: '想一想：買東西前，先把錢包裡的錢數一數。'
  });
  // 1-4 換一換
  const TRADE = { easy: [[5, 1], [10, 1], [10, 5]], standard: [[10, 5], [50, 10], [100, 10], [100, 50], [10, 1]], challenge: [[50, 10], [100, 10], [100, 50], [50, 5]] };
  A.register('moTrade', {
    methods: [['mark', '🔁 換一換'], ['self', '🧠 先自己想']],
    makeProblem: (level, i, rand = Math.random) => { const [B, s] = any(rand, fromLevel(TRADE, level)); return { B, s, k: B / s, mix: level === 'challenge', dims: [B, s], prompt: `小安要把 1 ${unitOf(B)} ${B} 元換成零錢。` }; },
    planFigure: ctx => `<div class="mo-show">${coin(ctx.problem.B)}</div>`,
    steps: [
      nStep(0, { title: '換成一種', ask: '可以換幾個？', id: 'k', hints: ['想一想：幾個小的合起來，和大的一樣多？', `用小的錢數一數，數到大的錢就停。`, '數了幾個小的，就是換幾個。'], think: '老師用小的錢數，數到和大的一樣多，看用了幾個。', together: '一起數：換幾個？',
        pre: prompt, figure: ctx => A.get('moTrade').planFigure(ctx), label: ctx => `1 ${unitOf(ctx.problem.B)} ${ctx.problem.B} 元，可以換幾個 ${ctx.problem.s} 元？`, ans: ctx => ctx.problem.k,
        wrong: (ctx, v) => ({ obs: 'tradeWrong', msg: `${ctx.problem.s} 元 ${ctx.problem.s} 元數，數到 ${ctx.problem.B} 用了幾個？` }), say: e => `${Array.from({ length: e.problem.k }, (_, j) => (j + 1) * e.problem.s).join('、')}，換 ${e.problem.k} 個 ${e.problem.s} 元。` }),
      payStep(1, { title: '湊一湊', ask: '用小的錢湊出一樣多。', id: 'pay', hints: ['只能用比較小的錢。', '一邊放一邊數。', '數到和大的錢一樣多就停。'], think: '老師用小的錢，一邊放一邊數，數到一樣多就停。', together: '一起湊：湊出一樣多。',
        figure: ctx => A.get('moTrade').planFigure(ctx), label: ctx => ctx.problem.mix ? `用比 ${ctx.problem.B} 元小的錢，湊出 ${ctx.problem.B} 元（不同的錢可以一起用）。` : `用 ${ctx.problem.s} 元，湊出 ${ctx.problem.B} 元。`,
        opts: ctx => ({ denoms: ctx.problem.mix ? DEN.filter(d => d < ctx.problem.B) : [ctx.problem.s] }), target: ctx => ctx.problem.B, rule: 'exact',
        solveWith: ctx => ctx.problem.mix ? greedy(ctx.problem.B, DEN.filter(d => d < ctx.problem.B)) : { [ctx.problem.s]: ctx.problem.k }, say: e => `湊出 ${e.problem.B} 元了。` }),
      cStep(2, { title: '想一想', ask: '換了以後，錢變多了嗎？', id: 'same', fixed: true, hints: ['換以前是幾元？', '換以後一共幾元？', '個數變多，錢不一定變多。'], think: '老師想：個數變多了，可是一共還是一樣多元。', together: '一起想：錢變多了嗎？', figure: ctx => A.get('moTrade').planFigure(ctx),
        q: () => '換成零錢以後，錢有沒有變多？', opts: () => [['same', '一樣多，只是個數變多'], ['more', '變多了'], ['less', '變少了']], ans: () => 'same', wrong: () => ({ obs: 'coinsAsMoney', msg: '先算一算：換以前一共幾元？換以後一共幾元？再比一比。' }), say: () => '一樣多，只是個數變多。' })
    ],
    reasons: [['count', '用小的錢數一數'], ['hint', '看提示']], done: ctx => `1 ${unitOf(ctx.problem.B)} ${ctx.problem.B} 元 ＝ ${ctx.problem.k} 個 ${ctx.problem.s} 元，一樣多。`, chant: '換錢：換以前、換以後，錢一樣多。', transfer: '想一想：要投 5 元的機器，只有 10 元怎麼辦？'
  });

  // ---------- 單元 2：錢從哪裡來（跨領域） ----------
  const choiceOnly = { methods: [['mark', '💬 一題一題想'], ['self', '🧠 先自己想']], reasons: [['think', '想一想生活中的例子'], ['hint', '看提示']] };
  const BARTER = [
    { a: '漁夫', x: '魚', xe: '🐟', b: '農夫', y: '米', ye: '🌾', z: '蔬菜', ze: '🥬', c: '菜農' },
    { a: '養雞的人', x: '雞蛋', xe: '🥚', b: '織布的人', y: '布', ye: '🧵', z: '鹽', ze: '🧂', c: '賣鹽的人' },
    { a: '做陶的人', x: '碗', xe: '🥣', b: '獵人', y: '肉', ye: '🍖', z: '弓箭', ze: '🏹', c: '做弓的人' }
  ];
  A.register('moBarter', {
    ...choiceOnly,
    makeProblem: (level, i, rand = Math.random) => { const s = BARTER[(i + rnd(rand, 0, 2)) % 3]; return { s, dims: [BARTER.indexOf(s)], prompt: `很久以前沒有錢。${s.a}有${s.x}，想換${s.b}的${s.y}；可是${s.b}想要的是${s.z}。` }; },
    planFigure: ctx => { const s = ctx.problem.s; return `<div class="mo-barter" role="img" aria-label="${esc(`${s.a}有${s.x}想換${s.y}；${s.b}有${s.y}想要${s.z}`)}"><p>${s.a}：有 ${s.xe}，想要 ${s.ye}</p><p>${s.b}：有 ${s.ye}，想要 ${s.ze}</p></div>`; },
    steps: [
      cStep(0, { title: '換得成嗎', ask: `對方要不要你的東西？`, id: 'want', fixed: true, hints: ['看對方想要什麼。', '對方想要的和你有的一樣嗎？', '不一樣就換不成。'], think: '老師看：對方想要的東西，和我有的東西一樣嗎？', together: '一起看：對方要不要？', pre: prompt, figure: ctx => A.get('moBarter').planFigure(ctx),
        q: ctx => `${ctx.problem.s.b}要不要${ctx.problem.s.a}的${ctx.problem.s.x}？`, opts: () => [['no', '不要，他想要的是別的東西'], ['yes', '要']], ans: () => 'no', wrong: ctx => ({ msg: `${ctx.problem.s.b}想要的是${ctx.problem.s.z}。` }), say: e => `不要，${e.problem.s.b}想要${e.problem.s.z}。` }),
      cStep(1, { title: '怎麼換', ask: '沒有錢，要怎麼換到？', id: 'how', hints: ['對方想要的，是你手上的東西嗎？', '想一想：誰有對方想要的東西？', '怎樣才能讓自己手上有對方想要的東西？'], think: '老師想：要先換到對方想要的東西，再去換。', together: '一起想：要怎麼換？', figure: ctx => A.get('moBarter').planFigure(ctx),
        q: ctx => `${ctx.problem.s.a}要怎麼換到${ctx.problem.s.y}？`, opts: ctx => { const s = ctx.problem.s; return [['two', `先找想要${s.x}的${s.c}換到${s.z}，再拿${s.z}去換${s.y}`], ['take', `直接把${s.y}拿走`], ['give', '放棄，不吃了']]; },
        ans: () => 'two', wrong: () => ({ msg: '拿走別人的東西不可以。想一想：要先換到對方想要的東西。' }), say: e => `先換到${e.problem.s.z}，再去換${e.problem.s.y}。` }),
      cStep(2, { title: '麻煩在哪裡', ask: '這樣換來換去，有什麼麻煩？', id: 'trouble', hints: ['剛剛要換幾次，才拿到想要的東西？', '每換一次，都要先做什麼？', '如果一直找不到要跟你換的人，會怎樣？'], think: '老師想：每次都要找到剛好想要我東西的人，很花時間。', together: '一起想：麻煩在哪裡？', figure: ctx => A.get('moBarter').planFigure(ctx),
        q: () => '用東西換東西，有什麼麻煩？', opts: () => [['find', '要找到剛好想要你東西的人，很花時間'], ['none', '一點也不麻煩'], ['more', '東西會越換越多']], ans: () => 'find', wrong: () => ({ msg: '想一想：如果找不到想要你東西的人呢？' }), say: () => '要找到剛好想要你東西的人，很花時間。' }),
      cStep(3, { title: '有錢以後', ask: '大家都用錢以後，可以怎麼做？', id: 'money', hints: ['錢是大家都想要的。', '有了錢，還要找剛好想要你東西的人嗎？', '想一想：錢可以先換到手，再拿來做什麼？'], think: '老師想：先把東西賣掉拿到錢，再用錢買，一次就好。', together: '一起想：有錢以後怎麼做？', figure: ctx => A.get('moBarter').planFigure(ctx),
        q: ctx => `有了錢以後，${ctx.problem.s.a}可以怎麼做？`, opts: ctx => { const s = ctx.problem.s; return [['sell', `把${s.x}賣掉拿到錢，再用錢買${s.y}`], ['still', `還是要找想要${s.x}的人`], ['keep', '錢沒有用']]; }, ans: () => 'sell',
        wrong: () => ({ msg: '想一想：大家都想要錢，那你的東西可以先換成什麼？' }), say: e => `把${e.problem.s.x}賣掉拿到錢，再用錢買${e.problem.s.y}。` })
    ],
    done: ctx => `有了錢，${ctx.problem.s.a}不用換來換去，賣${ctx.problem.s.x}、買${ctx.problem.s.y}就好。`, chant: '為什麼要有錢：用東西換東西很麻煩，用錢比較方便。', transfer: '想一想：如果現在沒有錢，你要怎麼得到午餐？'
  });

  const HIST = [['trade', '用東西換東西', '🐟↔🌾'], ['shell', '貝殼', '🐚'], ['metal', '金屬做的錢幣', '⚪'], ['paper', '紙鈔', '💵'], ['card', '卡片、手機（電子支付）', '💳📱']];
  const histFig = upto => `<ol class="mo-time" aria-label="錢的變化">${HIST.map(([k, n, e], j) => `<li class="${j <= upto ? 'on' : ''}"><span class="mo-te" aria-hidden="true">${j <= upto ? e : '？'}</span><span>${j <= upto ? n : '？'}</span></li>`).join('')}</ol>`;
  A.register('moHistory', {
    ...choiceOnly,
    makeProblem: (level, i, rand = Math.random) => ({ v: rnd(rand, 0, 1), dims: [0], prompt: '錢是怎麼變成現在這個樣子的？不同的地方用過不同的方法，這裡看幾個例子。' }),
    planFigure: () => histFig(-1),
    steps: [
      cStep(0, { title: '還沒有錢', ask: '最早，人們怎麼得到需要的東西？', id: 'h0', hints: ['那時候還沒有錢，也沒有商店。', '想一想上一個活動。', '想一想：漁夫有魚、農夫有米，沒有錢，他們怎麼拿到對方的東西？'], think: '老師想：還沒有錢的時候，人們用東西換東西。', together: '一起想：怎麼得到東西？', pre: prompt, figure: ctx => histFig(shown(ctx, 0) ? 0 : -1),
        q: () => '還沒有錢的時候，人們怎麼得到需要的東西？', opts: () => [['trade', '用東西換東西'], ['card', '刷卡'], ['shop', '去便利商店買']], ans: () => 'trade', wrong: () => ({ msg: '那時候還沒有錢，也沒有商店和卡片。' }), say: () => '用東西換東西。' }),
      cStep(1, { title: '最早的錢', ask: '後來，古時候的人用什麼當作錢？', id: 'h1', hints: ['「買、賣、貨、財」這幾個字裡面，都有同一個部件。', '看「買」這個字，下面是什麼？', '那個部件，是海邊撿得到的東西。'], think: '老師看「買、賣、貨、財」，裡面都有「貝」，古時候用貝殼當錢。', together: '一起找：用什麼當錢？', figure: () => histFig(0),
        q: () => '古時候的中國，有人用什麼當作錢？（提示：「買、賣、貨、財」都有這個字）', opts: () => [['shell', '貝殼（貝）'], ['card', '塑膠卡片'], ['phone', '手機']], ans: () => 'shell', wrong: () => ({ msg: '看「買」這個字，下面的部件是什麼？那是海邊撿得到的東西。' }), say: () => '用貝殼當作錢。' }),
      cStep(2, { title: '先有哪一個', ask: '金屬錢幣和紙鈔，哪一個比較早？', id: 'h2', fixed: true, hints: ['想一想：這兩種錢，哪一種帶很多出門比較不方便？', '很多錢幣放在一起，拿起來會怎樣？', '人們常常是覺得舊方法不方便，才想出新的辦法。'], think: '老師想：先有金屬錢幣；後來為了方便帶著走、方便買賣，才有紙鈔。', together: '一起排：哪一個比較早？', figure: () => histFig(1),
        q: () => '金屬做的錢幣和紙鈔，哪一個比較早出現？', opts: () => [['metal', '金屬做的錢幣'], ['paper', '紙鈔']], ans: () => 'metal', wrong: () => ({ msg: '人們常常是覺得舊方法不方便，才想出新方法。想一想：哪一種是為了更方便才想出來的？' }), say: () => '金屬錢幣比較早，後來才有紙鈔。' }),
      cStep(3, { title: '現在', ask: '現在還可以用什麼付錢？', id: 'h3', hints: ['搭公車時，很多人拿什麼刷一下？', '看看家人結帳時，手上拿的是什麼？', '想一想：不用拿出錢幣和紙鈔，也能付錢的方法。'], think: '老師想：現在除了錢幣和紙鈔，還可以用卡片、手機付錢。', together: '一起想：現在還可以用什麼？', figure: () => histFig(3),
        q: () => '現在除了錢幣、紙鈔，還可以用什麼付錢？', opts: () => [['card', '悠遊卡、手機（電子支付）'], ['shell', '貝殼'], ['stone', '石頭']], ans: () => 'card', wrong: () => ({ msg: '貝殼、石頭是很久以前的事了。' }), say: () => '用悠遊卡、手機。' })
    ],
    done: () => '舉幾個例子：用東西換東西、貝殼、金屬錢幣、紙鈔，到現在也可以用卡片和手機。不同的地方，用過的方法不一樣。', chant: '錢的故事：換東西、貝殼、錢幣、紙鈔、卡片手機。', transfer: '想一想：家裡的人買東西時，都用什麼付錢？'
  });

  const JOBS = [['麵包師傅', '做麵包', '青菜', '菜農'], ['公車司機', '開公車', '米', '農夫'], ['醫生', '看病', '魚', '漁夫'], ['老師', '教書', '衣服', '賣衣服的人']];
  A.register('moWork', {
    ...choiceOnly,
    makeProblem: (level, i, rand = Math.random) => { const j = JOBS[(i + rnd(rand, 0, 3)) % 4]; return { j, dims: [JOBS.indexOf(j)], prompt: `${j[0]}每天${j[1]}。他想要${j[2]}，可是自己不會種（做）。` }; },
    planFigure: ctx => big(`👩‍🍳 → 💰 → 🛒`),
    steps: [
      cStep(0, { title: '錢從哪裡來', ask: '家裡的錢大多是怎麼來的？', id: 'from', hints: ['大人每天去哪裡？', '大人工作以後，會拿到什麼？', '想一想：提款機裡的錢，是誰先存進去的？'], think: '老師想：家裡的錢，通常是家人工作拿到的薪水。', together: '一起想：錢從哪裡來？', pre: prompt, figure: () => big('👩‍💼 工作 → 💰'),
        q: () => '家裡的錢，大多是怎麼來的？', opts: () => [['work', '家人工作賺來的'], ['atm', '提款機自己變出來的'], ['free', '商店送的']], ans: () => 'work', wrong: () => ({ msg: '想一想：提款機和商店會把錢送給你嗎？大人每天出門去做什麼？' }), say: () => '家人工作賺來的。' }),
      cStep(1, { title: '大家分工', ask: '他想要的東西，怎麼拿到？', id: 'trade', hints: ['他不會自己做那樣東西。', '他會做自己的工作，可以賺到錢。', '想一想：他賺到的錢，可以拿來做什麼？'], think: '老師想：每個人做自己的工作賺錢，再用錢向別人買需要的東西。', together: '一起想：怎麼拿到？', figure: () => big('🧑‍🔧 🧑‍🌾 👩‍🍳 大家分工'),
        q: ctx => `${ctx.problem.j[0]}想要${ctx.problem.j[2]}，可以怎麼做？`, opts: ctx => { const j = ctx.problem.j; return [['buy', `${j[1]}賺錢，再用錢向${j[3]}買${j[2]}`], ['self', `不工作了，自己學著種（做）${j[2]}`], ['take', `直接拿${j[3]}的${j[2]}`]]; }, ans: () => 'buy',
        wrong: () => ({ msg: '想一想：他自己會做嗎？直接拿別人的東西可以嗎？他有什麼方法拿到錢？' }), say: e => `${e.problem.j[1]}賺錢，再用錢買${e.problem.j[2]}。` }),
      cStep(2, { title: '提款機的錢', ask: '提款機領出來的錢，是誰的？', id: 'atm', hints: ['提款機會自己做出錢嗎？', '想一想：去銀行、郵局，除了領錢，還可以做什麼？', '想一想：提款機裡的錢，是誰、什麼時候放進去的？'], think: '老師想：提款機領出來的錢，是自己以前存進去的錢，不是送的。', together: '一起想：是誰的錢？', figure: () => big('🏧'),
        q: () => '從提款機領出來的錢，是誰的錢？', opts: () => [['mine', '自己（家人）以前存進去的錢'], ['bank', '銀行送的，領不完'], ['machine', '機器自己做出來的']], ans: () => 'mine', wrong: () => ({ msg: '想一想：銀行會一直送錢給大家嗎？如果從來沒有存錢，領得出來嗎？' }), say: () => '是自己以前存進去的錢。' }),
      cStep(3, { title: '想一想', ask: '所以花錢的時候要想一想，為什麼？', id: 'why', hints: ['想一想前面學的：錢是怎麼來的？', '想一想：錢花掉以後，還會在嗎？', '比一比三個選項，哪一個和前面學的一樣？'], think: '老師想：錢是辛苦工作換來的，也會用完，所以花錢前要想一想。', together: '一起想：為什麼要想一想？', figure: () => '',
        q: () => '花錢的時候要先想一想，因為：', opts: () => [['care', '錢是辛苦工作換來的，也會用完'], ['never', '錢用不完'], ['no', '不用想，喜歡就買']], ans: () => 'care', wrong: () => ({ msg: '想一想前面學的：錢是怎麼來的？會不會用完？' }), say: () => '錢是辛苦工作換來的，也會用完。' })
    ],
    done: () => '錢是工作換來的；大家分工合作，再用錢互相買東西。', chant: '錢從哪裡來：工作賺錢，分工合作，存了才領得到。', transfer: '想一想：你的家人做什麼工作？'
  });

  A.register('moCard', {
    methods: [['mark', '💳 一步一步想'], ['self', '🧠 先自己想']], reasons: [['life', '想一想搭車的經驗'], ['hint', '看提示']],
    makeProblem: (level, i, rand = Math.random) => { const f = any(rand, fromLevel({ easy: [15, 20], standard: [15, 20, 25, 30], challenge: [25, 35, 40, 45] }, level));
      const B = i % 2 === 0 ? f * 2 + rnd(rand, 0, 9) * 5 : f + rnd(rand, 1, f - 1);  // 一半夠搭兩次、一半不夠
      return { f, B, after: B - f, ok2: B - f >= f, dims: [B, f], prompt: `小安的悠遊卡裡有 ${B} 元，搭一次公車要 ${f} 元。` }; },
    planFigure: ctx => big(`💳 ${ctx.problem.B} 元　🚌 ${ctx.problem.f} 元`),
    steps: [
      cStep(0, { title: '用的是誰的錢', ask: '刷卡、用手機付錢，用的是誰的錢？', id: 'whose', hints: ['卡片裡的錢是怎麼來的？', '想一想：新的卡片，裡面一開始有錢嗎？', '想一想：卡片裡的錢，是誰放進去的？'], think: '老師想：卡片裡的錢，是先存進去的自己的錢。', together: '一起想：用的是誰的錢？', pre: prompt, figure: ctx => A.get('moCard').planFigure(ctx),
        q: () => '刷悠遊卡、用手機付錢，用的是誰的錢？', opts: () => [['mine', '自己先存進去的錢'], ['free', '不用錢，免費的'], ['bus', '公車公司的錢']], ans: () => 'mine', wrong: () => ({ msg: '想一想：刷了以後，卡片裡的錢會變少嗎？那些錢是誰的？' }), say: () => '自己先存進去的錢。' }),
      nStep(1, { title: '刷一次', ask: '刷一次以後，卡裡還剩幾元？', id: 'after', hints: ['卡裡的錢會變少。', '用減的。', '卡裡的錢 － 車錢。'], think: '老師算：卡裡的錢減掉車錢。', together: '一起算：還剩幾元？', pre: placeAid, figure: ctx => colHtml(ctx.problem.B, ctx.problem.f, '-', { head: false }),
        label: ctx => `${ctx.problem.B} － ${ctx.problem.f} ＝ ？`, ans: ctx => ctx.problem.after, wrong: (ctx, v) => v === ctx.problem.B + ctx.problem.f ? { obs: 'opWrong', msg: '刷卡以後錢變少，用減的。' } : v === I.bigMinusSmall(ctx.problem.B, ctx.problem.f) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : null, say: e => `還剩 ${e.problem.after} 元。` }),
      cStep(2, { title: '還夠嗎', ask: '回家還要再搭一次，夠不夠？', id: 'ok', fixed: true, hints: ['剩下的錢和車錢比一比。', '剩下的比車錢多（或一樣）就夠。', '比車錢少就不夠。'], think: '老師把剩下的錢和車錢比一比。', together: '一起比：夠不夠？', figure: ctx => big(`💳 ${shown(ctx, 1) || ctx.checked(1) ? ctx.problem.after : '？'} 元　🚌 ${ctx.problem.f} 元`),
        q: ctx => `卡裡剩 ${ctx.problem.after} 元，再搭一次要 ${ctx.problem.f} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.ok2 ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok2 ? '夠。' : '不夠。' }),
      cStep(3, { title: '快用完了', ask: '卡裡的錢快用完了，要怎麼辦？', id: 'fix', hints: ['卡片裡的錢會用完。', '用完了，還可以刷嗎？', '想一想：卡片裡的錢要怎麼變多？'], think: '老師想：卡片的錢快用完，要先加值。', together: '一起想：怎麼辦？', figure: () => big('💳 ＋ 💰'),
        q: () => '卡片裡的錢快用完了，要怎麼辦？', opts: () => [['top', '先去加值（把錢存進卡片）'], ['go', '不管它，直接上車'], ['new', '再拿一張別人的卡']], ans: () => 'top', wrong: (ctx, v) => ({ msg: v === 'new' ? '想一想：別人的卡，裡面是誰的錢？' : '想一想：錢不夠的時候，上車刷得過嗎？卡片的錢要怎麼變多？' }), say: () => '先去加值。' })
    ],
    done: ctx => `刷一次剩 ${ctx.problem.after} 元，${ctx.problem.ok2 ? '還夠再搭一次' : '不夠再搭一次，要先加值'}。`, chant: '電子支付：用的是自己存進去的錢，刷一次少一些，快用完要加值。', transfer: '想一想：家人用手機付錢時，錢是從哪裡扣的？'
  });

  window.moneyFig = { DEN, isBill, unitOf, nameOf, coin, total, pieces, kinds, countsText, pile, mixOrder, greedy, tag, tags, payHtml, bindPay, payStep, payAns, choiceOnly };
})();

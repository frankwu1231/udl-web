'use strict';
// 第 36 版：錢幣與購物教材包單元 7～9（跨領域）。錢幣圖在 act-money.js（window.moneyFig）。
// 單元 7「想要與需要」：社會 Db-Ⅱ-1、Da-Ⅱ-1、3d-Ⅱ-2、1c-Ⅱ-1；特生2-sP-5；生活課程 6-I-5。核心活動 7-1（想要需要三問）：沒有它會怎樣 → 現在一定要嗎 → 是需要還是想要。
// 單元 8「存錢與存提款」：特生E-sP-6 金融機構的認識、特生E-sA-2、特生2-sP-2；社會 Ad-Ⅱ-2。核心活動 8-2（存提款四步）：要存還是要領 → 填單或按鍵 → 數一數錢 → 看存摺。
// 單元 9「錢錢小管家」（生活應用）：社會 Db-Ⅲ-1；特生E-sP-5、E-sA-3、2-sP-5、2-sA-2；綜合 2c-Ⅱ-1、2c-Ⅲ-1、Bc-Ⅲ-3。核心活動 9-1（生活決策五步）。
// 代碼原文：社會、生活課程、綜合活動讀國家教育研究院官方領綱 PDF（2026-11-19）；特殊需求領域沿用 Codex 已查證的原文。
// 記帳、零用錢都用虛構的角色（小安、小美），不請學生寫自己家裡的錢。
(() => {
  const A = window.areaActs, I = window.intFig, M = window.moneyFig;
  const { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, colHtml, placeAid, borrows, timesAid } = I;
  const { coin, total, pieces, kinds, countsText, pile, greedy, tag, tags, DEN } = M;
  const methods = [['mark', '💬 一步一步想'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['life', '想一想生活中怎麼做'], ['check', '算完檢查合不合理'], ['hint', '看提示']];
  const OPN = [['+', '加起來（＋）'], ['-', '減掉（－）'], ['*', '乘（×）'], ['/', '除（÷）']];
  const ledger = rows => `<table class="fm-ttable mo-ledger" aria-label="記帳本"><thead><tr><th scope="col">項目</th><th scope="col">收入</th><th scope="col">支出</th></tr></thead><tbody>${rows.map(([n, inc, out]) => `<tr><th scope="row">${esc(n)}</th><td>${inc ? inc + ' 元' : ''}</td><td>${out ? out + ' 元' : ''}</td></tr>`).join('')}</tbody></table>`;

  // ---------- 單元 7：想要與需要 ----------
  // 同一樣東西，情況不同，答案就不同（例如鉛筆）
  const NEED = [['鉛筆', '✏️', '鉛筆都用完了，明天要寫功課'], ['雨傘', '☂️', '雨傘壞了，這幾天一直下雨'], ['牙刷', '🪥', '牙刷的毛都開花了'], ['外套', '🧥', '天氣變冷了，舊外套太小穿不下'], ['午餐', '🍱', '中午肚子餓，還沒吃午餐'], ['作業簿', '📒', '作業簿寫完了，老師請大家帶新的']];
  const WANT = [['鉛筆', '✏️', '已經有一整盒鉛筆，又看到有香味的鉛筆'], ['玩具車', '🚗', '家裡已經有好幾台玩具車，又看到新的'], ['貼紙', '⭐', '看到新的卡通貼紙很漂亮'], ['外套', '🧥', '外套有好幾件，看到同學穿新款'], ['糖果', '🍬', '剛吃飽，看到糖果還想吃'], ['遊戲點數', '🎮', '想買手機遊戲的點數']];
  A.register('moNeedWant', {
    methods: [['mark', '🤔 用三個問題想'], ['self', '🧠 先自己想，需要時看提示']], reasons,
    makeProblem: (level, i, rand = Math.random) => { const need = (i + rnd(rand, 0, 1)) % 2 === 0, it = any(rand, need ? NEED : WANT); return { need, it, dims: [need ? 1 : 0], prompt: `${it[2]}。要不要買${it[0]}？` }; },
    planFigure: ctx => big(`${ctx.problem.it[1]} ${esc(ctx.problem.it[0])}`),
    steps: [
      cStep(0, { title: '沒有它會怎樣', ask: '沒有它，會怎樣？', id: 'without', fixed: true, hints: ['想一想題目裡的情況。', '沒有它，會不會影響上學、身體或安全？', '只是不開心，還是真的會不方便？'], think: '老師想：沒有它，會不會影響生活或身體？', together: '一起想：沒有它會怎樣？', pre: prompt, figure: ctx => A.get('moNeedWant').planFigure(ctx),
        q: ctx => `沒有${ctx.problem.it[0]}，會怎樣？`, opts: () => [['hard', '會很不方便，影響上學、身體或安全'], ['ok', '沒有也沒關係，只是有一點想要']], ans: ctx => ctx.problem.need ? 'hard' : 'ok', wrong: () => ({ obs: 'needWant', msg: '再讀一次題目裡的情況。' }), say: e => e.problem.need ? '會很不方便。' : '沒有也沒關係。' }),
      cStep(1, { title: '現在一定要嗎', ask: '現在一定要嗎？', id: 'now', fixed: true, hints: ['可以等一等嗎？', '等一等，會不會出問題？', '可以等的，就不是現在一定要。'], think: '老師想：可以等一等，還是現在就要？', together: '一起想：現在一定要嗎？', figure: ctx => A.get('moNeedWant').planFigure(ctx),
        q: () => '現在一定要嗎？', opts: () => [['now', '現在就要'], ['wait', '可以等一等，或不買也可以']], ans: ctx => ctx.problem.need ? 'now' : 'wait', wrong: () => ({ obs: 'needWant', msg: '想一想：等一等會不會出問題？' }), say: e => e.problem.need ? '現在就要。' : '可以等一等。' }),
      cStep(2, { title: '需要還是想要', ask: '是需要還是想要？', id: 'kind', fixed: true, hints: ['沒有會不方便、現在就要：需要。', '沒有也沒關係、可以等：想要。', '同一樣東西，情況不同，答案也會不同。'], think: '老師想：會不方便、現在就要的是需要；可以等的是想要。', together: '一起決定：需要還是想要？', figure: ctx => A.get('moNeedWant').planFigure(ctx),
        q: ctx => `這時候的${ctx.problem.it[0]}，是需要還是想要？`, opts: () => [['need', '需要'], ['want', '想要']], ans: ctx => ctx.problem.need ? 'need' : 'want', wrong: () => ({ obs: 'needWant', msg: '看前面兩個問題的答案。' }), say: e => e.problem.need ? '是需要。' : '是想要。' })
    ],
    done: ctx => `這時候的${ctx.problem.it[0]}是${ctx.problem.need ? '需要' : '想要'}。`, chant: '想要需要三問：沒有會怎樣？現在一定要嗎？是需要還是想要？', transfer: '想一想：你最近想買的東西，是需要還是想要？'
  });

  A.register('moBudgetChoice', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const B = any(rand, fromLevel({ easy: [30, 50], standard: [50, 100], challenge: [100, 200, 300] }, level));
      for (;;) { const n = any(rand, NEED), w = any(rand, WANT); if (n[0] === w[0]) continue; const pn = rnd(rand, Math.floor(B / 5), Math.floor(B * 0.7)), r = B - pn, ok = i % 2 === 0;
        const pw = ok ? rnd(rand, Math.max(2, Math.floor(r / 3)), r) : rnd(rand, r + 1, r + Math.max(5, Math.floor(B / 3))); if (pw < 2 || (level !== 'challenge' && borrows(B, pn) > 1)) continue;
        return { B, n, w, pn, pw, r, ok: pw <= r, dims: [B, pn, pw], prompt: `小安有 ${B} 元。${n[2]}，${n[0]} ${pn} 元；也想買${w[0]} ${pw} 元。` }; } },
    planFigure: ctx => tags([[`${ctx.problem.n[1]} ${ctx.problem.n[0]}（需要）`, ctx.problem.pn], [`${ctx.problem.w[1]} ${ctx.problem.w[0]}（想要）`, ctx.problem.pw]]),
    steps: [
      cStep(0, { title: '先買哪一個', ask: '錢有限，先買哪一個？', id: 'first', fixed: true, hints: ['哪一個是需要？', '需要的先買。', '想要的，有剩錢再想。'], think: '老師想：錢有限，需要的先買。', together: '一起想：先買哪一個？', pre: prompt, figure: ctx => A.get('moBudgetChoice').planFigure(ctx),
        q: () => '先買哪一個？', opts: ctx => [['need', ctx.problem.n[0]], ['want', ctx.problem.w[0]]], ans: () => 'need', wrong: () => ({ obs: 'needWant', msg: '需要的先買，想要的有剩錢再想。' }), say: e => `先買${e.problem.n[0]}。` }),
      nStep(1, { title: '還剩多少', ask: '買了需要的，還剩幾元？', id: 'r', hints: ['用減的。', '帶的錢 － 需要的價錢。', '也可以從價錢往上數到帶的錢。'], think: '老師算：帶的錢減掉需要的價錢。', together: '一起算：還剩幾元？', pre: placeAid, figure: ctx => colHtml(ctx.problem.B, ctx.problem.pn, '-', { head: false }),
        label: ctx => `${ctx.problem.B} － ${ctx.problem.pn} ＝ ？`, ans: ctx => ctx.problem.r, wrong: (ctx, v) => v === I.bigMinusSmall(ctx.problem.B, ctx.problem.pn) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : null, say: e => `還剩 ${e.problem.r} 元。` }),
      cStep(2, { title: '還夠買想要的嗎', ask: '剩下的錢，夠買想要的嗎？', id: 'ok', fixed: true, hints: ['剩下的錢和想要的價錢比一比。', '剩下的比較多（或一樣）：夠。', '剩下的比較少：不夠。'], think: '老師把剩下的錢和想要的價錢比一比。', together: '一起比：夠不夠？', figure: ctx => A.get('moBudgetChoice').planFigure(ctx),
        q: ctx => `剩 ${ctx.problem.r} 元，${ctx.problem.w[0]} ${ctx.problem.pw} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok ? '夠。' : '不夠。' }),
      cStep(3, { title: '做決定', ask: '想要的東西，怎麼辦？', id: 'plan', fixed: true, hints: ['錢夠，可以買，也可以存起來。', '錢不夠，先存起來。', '不可以向別人借錢買想要的東西。'], think: '老師想：夠的話可以買或存；不夠就先存起來。', together: '一起決定：怎麼辦？', figure: () => '',
        q: () => '想要的東西，怎麼辦？', opts: () => [['buy', '錢夠了，可以買，也可以存起來'], ['save', '錢不夠，先存起來，下次再買'], ['borrow', '跟同學借錢買']], ans: ctx => ctx.problem.ok ? 'buy' : 'save',
        wrong: (ctx, v) => ({ obs: v === 'borrow' ? 'needWant' : 'compareWrong', msg: v === 'borrow' ? '想要的東西不用借錢買，可以先存起來。' : '看剩下的錢夠不夠。' }), say: e => e.problem.ok ? '錢夠了，可以買，也可以存起來。' : '錢不夠，先存起來。' })
    ],
    done: ctx => `先買需要的${ctx.problem.n[0]}，剩 ${ctx.problem.r} 元，${ctx.problem.ok ? '夠買' : '不夠買'}${ctx.problem.w[0]}。`, chant: '錢有限：需要的先買，想要的有剩錢再想，不夠就先存。', transfer: '想一想：如果只有 50 元，你會先買什麼？'
  });

  A.register('moWait', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const W = any(rand, fromLevel({ easy: [5, 10], standard: [10, 20], challenge: [20, 50] }, level)), k = rnd(rand, 2, level === 'easy' ? 4 : 6), H = W * rnd(rand, 1, 4), T = H + W * k, ps = rnd(rand, Math.max(2, Math.floor(H / 2)), H);
      const it = any(rand, [['樂高', '🧱'], ['跳繩', '🪢'], ['故事書', '📚'], ['足球', '⚽']]), sm = any(rand, [['扭蛋', '🥚'], ['小貼紙', '⭐'], ['糖果', '🍬']]);
      return { W, k, H, T, ps, it, sm, dims: [H, T, W], prompt: `小美有 ${H} 元，很想要一個${it[0]}（${T} 元）。商店裡的${sm[0]} ${ps} 元，現在就買得起。` }; },
    planFigure: ctx => tags([[`${ctx.problem.sm[1]} ${ctx.problem.sm[0]}`, ctx.problem.ps], [`${ctx.problem.it[1]} ${ctx.problem.it[0]}`, ctx.problem.T]]),
    steps: [
      cStep(0, { title: '現在買小的', ask: '現在買了小的，還能買大的嗎？', id: 'both', fixed: true, hints: ['買了小的，錢就變少了。', '大的比現在的錢還貴。', '錢只能用一次。'], think: '老師想：買了小的，錢變少，離大的更遠了。', together: '一起想：還能買大的嗎？', pre: prompt, figure: ctx => A.get('moWait').planFigure(ctx),
        q: ctx => `現在買了${ctx.problem.sm[0]}，還能馬上買${ctx.problem.it[0]}嗎？`, opts: () => [['no', '不能，錢變少了，要存更久'], ['yes', '可以，兩個都能買']], ans: () => 'no', wrong: () => ({ obs: 'compareWrong', msg: '錢只能用一次：買了小的，錢就變少了。' }), say: () => '不能，錢變少了。' }),
      nStep(1, { title: '存起來要多久', ask: '不買小的，每週存起來，要幾週？', id: 'k', hints: ['先算還差多少錢。', '每週存的錢，一週一週加上去。', '加到和大的價錢一樣多，數一數幾週。'], think: '老師先算還差多少，再一週一週加，看要幾週。', together: '一起算：要幾週？', pre: timesAid, figure: ctx => A.get('moWait').planFigure(ctx),
        label: ctx => `有 ${ctx.problem.H} 元，每週存 ${ctx.problem.W} 元，幾週後可以買${ctx.problem.it[0]}？`, ans: ctx => ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.T - ctx.problem.H ? { obs: 'skipStep', msg: '這是還差的錢。再算要存幾週。' } : null,
        say: e => `還差 ${e.problem.T - e.problem.H} 元，${Array.from({ length: e.problem.k }, (_, j) => e.problem.H + (j + 1) * e.problem.W).join('、')}，要 ${e.problem.k} 週。` }),
      cStep(2, { title: '看到廣告', ask: '看到廣告好想買，先怎麼做？', id: 'ad', fixed: true, hints: ['廣告會讓人很想買。', '先想想要需要三問。', '不吵、不馬上買。'], think: '老師看到廣告，先想三個問題，再決定。', together: '一起想：看到廣告怎麼做？', figure: () => big('📺 🛍️'),
        q: () => '看到廣告，好想馬上買，先怎麼做？', opts: () => [['ask', '先想：需要嗎？現在一定要嗎？錢夠嗎？'], ['buy', '馬上買'], ['cry', '吵著要大人買']], ans: () => 'ask', wrong: () => ({ obs: 'needWant', msg: '先停下來想三個問題，再決定。' }), say: () => '先想三個問題，再決定。' })
    ],
    done: ctx => `不買${ctx.problem.sm[0]}，存 ${ctx.problem.k} 週就可以買${ctx.problem.it[0]}。`, chant: '等一等：想要的先存起來，看到廣告先想三問。', transfer: '想一想：有沒有什麼東西，你願意存錢等一等再買？'
  });

  // ---------- 單元 8：存錢與存提款 ----------
  A.register('moPiggy', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const d = any(rand, fromLevel({ easy: [1, 5], standard: [5, 10], challenge: [10, 50] }, level)), k = rnd(rand, 2, fromLevel({ easy: 5, standard: 7, challenge: 9 }, level)), s = d * k;
      const ok = i % 2 === 0, X = ok ? rnd(rand, Math.max(1, s - 2 * d), s) : rnd(rand, s + 1, s + 2 * d), bk = X < 20 ? any(rand, ['一張貼紙', '一枝鉛筆']) : any(rand, ['一本故事書', '一本圖畫書', '一本著色本']);
      return { d, k, s, X, ok: s >= X, bk, dims: [d, k, X], prompt: `小安每天放 1 個 ${d} 元到存錢筒，存了 ${k} 天。想買${bk}（${X} 元）。` }; },
    planFigure: ctx => `<div class="mo-days">${Array.from({ length: ctx.problem.k }, (_, j) => `<div class="mo-day"><span>第${j + 1}天</span>${coin(ctx.problem.d, { small: true })}</div>`).join('')}</div>`,
    steps: [
      cStep(0, { title: '一天存多少', ask: '一天存幾元？', id: 'd', fixed: true, hints: ['看每天放的錢。', '錢上面的數字是幾？', '每天都一樣。'], think: '老師看每天放的是幾元。', together: '一起看：一天存幾元？', pre: prompt, figure: ctx => A.get('moPiggy').planFigure(ctx),
        q: () => '一天存幾元？', opts: () => [1, 5, 10, 50].map(d => [String(d), `${d} 元`]), ans: ctx => String(ctx.problem.d), wrong: () => ({ obs: 'denomConfuse', msg: '看錢上面的數字。' }), say: e => `一天 ${e.problem.d} 元。` }),
      nStep(1, { title: '存了多少', ask: '一共存了幾元？', id: 's', hints: ['一天一天數。', `每天一樣多，可以幾元幾元數。`, '也可以用乘的：一天的錢 × 天數。'], think: '老師一天一天數，或用乘的。', together: '一起數：存了幾元？', pre: timesAid, figure: ctx => A.get('moPiggy').planFigure(ctx),
        label: () => '存錢筒裡一共幾元？', ans: ctx => ctx.problem.s, wrong: (ctx, v) => v === ctx.problem.k ? { obs: 'coinsAsMoney', msg: '這是天數。每天存的錢要加起來。' } : v === ctx.problem.d + ctx.problem.k ? { obs: 'eqSum', msg: '不是加天數，是每天的錢一直加。' } : null,
        say: e => `${Array.from({ length: e.problem.k }, (_, j) => (j + 1) * e.problem.d).join('、')}，一共 ${e.problem.s} 元。` }),
      cStep(2, { title: '夠買嗎', ask: '存的錢夠買嗎？', id: 'ok', fixed: true, hints: ['存的錢和價錢比一比。', '存的比較多（或一樣）就夠。', '不夠就再存幾天。'], think: '老師把存的錢和價錢比一比。', together: '一起比：夠不夠？', figure: ctx => tag(`📚 ${ctx.problem.bk}`, ctx.problem.X),
        q: ctx => `存了 ${ctx.problem.s} 元，${ctx.problem.bk} ${ctx.problem.X} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠，再存幾天']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok ? '夠。' : '不夠，再存幾天。' })
    ],
    done: ctx => `存了 ${ctx.problem.s} 元，${ctx.problem.ok ? '夠' : '還不夠'}買${ctx.problem.bk}。`, chant: '存錢：每天存一點，一天一天加起來。', transfer: '想一想：你想存錢買什麼？每天可以存多少？'
  });

  // 8-2 存提款四步（核心）
  const BANKS = [['郵局', 'counter'], ['銀行', 'counter'], ['提款機', 'atm']];
  A.register('moBank', {
    methods: [['mark', '🏦 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], reasons,
    makeProblem: (level, i, rand = Math.random) => { const dep = i % 2 === 0, place = dep || level === 'easy' ? any(rand, BANKS.slice(0, 2)) : any(rand, BANKS);   // 提款機只出百元以上的鈔票，入門的小錢到櫃台領
      const [set, maxM, b0r] = fromLevel({ easy: [[100, 50, 10], 100, [100, 500]], standard: [[1000, 500, 100], 1000, [300, 2000]], challenge: [[1000, 500, 100], 3000, [1000, 5000]] }, level);
      for (;;) { const m = rnd(rand, 1, maxM / (level === 'easy' ? 10 : 100)) * (level === 'easy' ? 10 : 100), b0 = rnd(rand, b0r[0] / 10, b0r[1] / 10) * 10, b1 = dep ? b0 + m : b0 - m;
        if (b1 < 0 || (!dep && m > b0) || (level !== 'challenge' && !dep && borrows(b0, m) > 1)) continue; const cash = greedy(m, set); if (!cash || pieces(cash) > 12) continue;
        const who = any(rand, ['小安', '小美', '媽媽']);
        return { dep, place, m, b0, b1, cash, who, dims: [b0, m], prompt: dep ? `${who}把 ${m} 元的紅包錢，拿到${place[0]}存起來。存摺上原來有 ${b0} 元。` : `${who}要從${place[0]}領 ${m} 元繳費。存摺上原來有 ${b0} 元。` }; } },
    planFigure: ctx => big(ctx.problem.place[1] === 'atm' ? '🏧' : '🏦'),
    steps: [
      cStep(0, { title: '存還是領', ask: '要存錢還是領錢？', id: 'kind', fixed: true, hints: ['錢是放進去，還是拿出來？', '放進去叫「存款」。', '拿出來叫「提款」（領錢）。'], think: '老師想：錢是放進去，還是拿出來？', together: '一起想：存還是領？', pre: prompt, figure: ctx => A.get('moBank').planFigure(ctx),
        q: () => '這次要做什麼？', opts: () => [['dep', '存款（把錢放進去）'], ['wd', '提款（把錢領出來）']], ans: ctx => ctx.problem.dep ? 'dep' : 'wd', wrong: () => ({ obs: 'bankWrong', msg: '再讀一次：錢是放進去，還是拿出來？' }), say: e => e.problem.dep ? '要存款。' : '要提款。' }),
      cStep(1, { title: '填單或按鍵', ask: '在櫃台或提款機要怎麼做？', id: 'how', hints: ['先想：這次是要存錢，還是領錢？', '看單子或按鍵上的字，哪一個和你要做的事一樣？', '用提款機時，密碼只有自己知道，要保護好。'], think: '老師想：存錢用存款單，領錢用提款單；提款機的密碼要遮住，不給別人看。', together: '一起選：要怎麼做？', figure: ctx => A.get('moBank').planFigure(ctx),
        q: ctx => ctx.problem.place[1] === 'atm' ? '在提款機要怎麼做？' : `在${ctx.problem.place[0]}櫃台，要填哪一張單子？`,
        opts: ctx => ctx.problem.place[1] === 'atm' ? [['wd', '按「提款」，輸入密碼時用手遮住'], ['tell', '按「提款」，把密碼說給旁邊的人聽'], ['dep', '按「存款」']] : [['dep', '存款單'], ['wd', '提款單']],
        ans: ctx => ctx.problem.dep ? 'dep' : 'wd', wrong: (ctx, v) => ({ obs: v === 'tell' ? 'wrongChoice' : 'bankWrong', msg: v === 'tell' ? '密碼只有自己知道，不能說給別人聽。' : '存錢和領錢用的不一樣。' }), say: e => e.problem.place[1] === 'atm' ? '按「提款」，輸入密碼時用手遮住。' : `填${e.problem.dep ? '存款單' : '提款單'}。` }),
      nStep(2, { title: '數一數錢', ask: '這些錢是幾元？', id: 'm', hints: ['先數大的鈔票。', '再接著數小的。', '要和單子上寫的一樣。'], think: '老師把錢數一數，和單子上寫的一樣多。', together: '一起數：幾元？', figure: ctx => pile(ctx.problem.cash),
        label: ctx => ctx.problem.dep ? '要存進去的錢，一共幾元？' : '領出來的錢，一共幾元？', ans: ctx => ctx.problem.m, wrong: (ctx, v) => v === pieces(ctx.problem.cash) ? { obs: 'coinsAsMoney', msg: '這是有幾張。照錢上的數字數。' } : { obs: 'mixCount', msg: '先數大的，再接著數小的。' }, say: e => `一共 ${e.problem.m} 元。` }),
      nStep(3, { title: '看存摺', ask: '存摺上現在有幾元？', id: 'b1', hints: ['存進去，存摺上的錢變多。', '領出來，存摺上的錢變少。', '原來的錢 ＋ 存的錢，或 原來的錢 － 領的錢。'], think: '老師想：存進去變多用加的，領出來變少用減的。', together: '一起算：存摺上現在有幾元？', pre: placeAid,
        figure: ctx => colHtml(ctx.problem.b0, ctx.problem.m, ctx.problem.dep ? '+' : '-', { head: false }), label: () => '存摺上現在有幾元？', ans: ctx => ctx.problem.b1,
        wrong: (ctx, v) => v === (ctx.problem.dep ? ctx.problem.b0 - ctx.problem.m : ctx.problem.b0 + ctx.problem.m) ? { obs: 'balanceWrong', msg: ctx.problem.dep ? '存進去，錢會變多。' : '領出來，錢會變少。' } : { obs: 'balanceWrong', msg: '再算一次：位數對齊，一位一位算。' }, say: e => `${e.problem.b0} ${e.problem.dep ? '＋' : '－'} ${e.problem.m} ＝ ${e.problem.b1} 元。` })
    ],
    done: ctx => `${ctx.problem.dep ? '存進' : '領出'} ${ctx.problem.m} 元，存摺上現在有 ${ctx.problem.b1} 元。`, chant: '存提款四步：存還是領、填單或按鍵、數一數錢、看存摺。', transfer: '想一想：家附近的郵局或銀行在哪裡？'
  });

  A.register('moPassbook', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const step = level === 'easy' ? 10 : 100, maxB = fromLevel({ easy: 900, standard: 3000, challenge: 9000 }, level);
      for (;;) { const b0 = rnd(rand, 2, maxB / step / 2) * step, d1 = rnd(rand, 1, maxB / step / 4) * step + (level === 'challenge' ? rnd(rand, 0, 9) * 5 : 0), b1 = b0 + d1, w2 = rnd(rand, 1, Math.floor(b1 / step)) * step - (level === 'challenge' ? rnd(rand, 0, 9) * 5 : 0), b2 = b1 - w2;
        if (b1 > maxB || w2 <= 0 || b2 < 0 || (level !== 'challenge' && borrows(b1, w2) > 1)) continue;
        const ins = d1, outs = w2; if (ins === outs) continue;
        return { b0, d1, b1, w2, b2, more: ins > outs ? 'in' : 'out', dims: [b0, d1, w2], prompt: '這是小美的存摺。存入的錢會加上去，提出的錢會減掉。' }; } },
    planFigure: ctx => A.get('moPassbook').book(ctx, false, false),
    book: (ctx, s1, s2) => { const p = ctx.problem; return `<table class="fm-ttable mo-book" aria-label="存摺"><thead><tr><th scope="col">日期</th><th scope="col">摘要</th><th scope="col">存入</th><th scope="col">提出</th><th scope="col">餘額</th></tr></thead><tbody>
      <tr><td>3/1</td><td>上期餘額</td><td></td><td></td><td>${p.b0}</td></tr><tr><td>3/5</td><td>存入</td><td>${p.d1}</td><td></td><td>${s1 ? p.b1 : '？'}</td></tr><tr><td>3/20</td><td>提款</td><td></td><td>${p.w2}</td><td>${s2 ? p.b2 : '？'}</td></tr></tbody></table>`; },
    steps: [
      nStep(0, { title: '存入以後', ask: '3/5 存入以後，餘額是多少？', id: 'b1', hints: ['餘額是存摺裡剩下的錢。', '存入，錢變多。', '上一行的餘額 ＋ 存入的錢。'], think: '老師看：存入會變多，上一行的餘額加存入的錢。', together: '一起算：餘額多少？', pre: ctx => `${prompt(ctx)}${placeAid(ctx)}`, figure: ctx => A.get('moPassbook').book(ctx, false, false),
        label: () => '3/5 的餘額是幾元？', ans: ctx => ctx.problem.b1, wrong: (ctx, v) => v === ctx.problem.b0 - ctx.problem.d1 ? { obs: 'balanceWrong', msg: '存入，錢會變多，用加的。' } : { obs: 'balanceWrong', msg: '再算一次：上一行的餘額加存入的錢。' }, say: e => `${e.problem.b0} ＋ ${e.problem.d1} ＝ ${e.problem.b1}。` }),
      nStep(1, { title: '提款以後', ask: '3/20 提款以後，餘額是多少？', id: 'b2', hints: ['提款，錢變少。', '上一行的餘額 － 提出的錢。', '不夠減要借。'], think: '老師看：提款會變少，上一行的餘額減提出的錢。', together: '一起算：餘額多少？', figure: ctx => A.get('moPassbook').book(ctx, true, false),
        label: () => '3/20 的餘額是幾元？', ans: ctx => ctx.problem.b2, wrong: (ctx, v) => v === ctx.problem.b1 + ctx.problem.w2 ? { obs: 'balanceWrong', msg: '提款，錢會變少，用減的。' } : v === ctx.problem.b0 - ctx.problem.w2 ? { obs: 'skipStep', msg: '要從上一行（3/5）的餘額減。' } : v === I.bigMinusSmall(ctx.problem.b1, ctx.problem.w2) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : { obs: 'balanceWrong', msg: '再算一次：上一行的餘額減提出的錢。' }, say: e => `${e.problem.b1} － ${e.problem.w2} ＝ ${e.problem.b2}。` }),
      cStep(2, { title: '比一比', ask: '這個月，存的多還是領的多？', id: 'more', fixed: true, hints: ['看存入那一欄和提出那一欄。', '比一比兩個數。', '也可以看：最後的餘額比一開始多還是少？'], think: '老師比一比存入和提出的錢。', together: '一起比：存的多還是領的多？', figure: ctx => A.get('moPassbook').book(ctx, true, true),
        q: () => '這個月，存進去的多，還是領出來的多？', opts: () => [['in', '存進去的多'], ['out', '領出來的多']], ans: ctx => ctx.problem.more, wrong: () => ({ obs: 'compareWrong', msg: '比一比存入和提出的數。' }), say: e => e.problem.more === 'in' ? '存進去的多，錢變多了。' : '領出來的多，錢變少了。' })
    ],
    done: ctx => `餘額從 ${ctx.problem.b0} 元變成 ${ctx.problem.b2} 元。`, chant: '看存摺：存入加上去，提出減掉，最後一行是現在的錢。', transfer: '想一想：為什麼存摺要放好，不能隨便給別人？'
  });

  // ---------- 單元 9：錢錢小管家（生活應用） ----------
  const SPEND = [['早餐', 15, 40], ['文具', 10, 35], ['飲料', 10, 30], ['貼紙', 5, 20], ['公車', 15, 15], ['餅乾', 10, 25]];
  // 9-1 我的記帳本（核心：生活決策五步）
  A.register('moLedger', {
    methods: [['mark', '📒 一步一步記'], ['self', '🧠 先自己算，需要時看提示']], reasons,
    makeProblem: (level, i, rand = Math.random) => { const [inc, n] = fromLevel({ easy: [[50, 60], 2], standard: [[100, 150, 200], 3], challenge: [[200, 300, 500], 3] }, level);
      for (;;) { const a = any(rand, inc), sp = [...SPEND].sort(() => rand() - 0.5).slice(0, n).map(([w, lo, hi]) => [w, rnd(rand, lo, hi)]), out = sp.reduce((s, x) => s + x[1], 0), left = a - out;
        if (left <= 0 || (level !== 'challenge' && borrows(a, out) > 1)) continue; const ok = i % 2 === 0, X = ok ? rnd(rand, Math.max(5, Math.floor(left / 2)), left) : rnd(rand, left + 1, left + 30);
        const goal = any(rand, ['橡皮擦', '彩色筆', '小玩具', '書套']);
        return { a, sp, out, left, X, goal, ok: left >= X, dims: [a, out, X], prompt: `小安這週的零用錢是 ${a} 元，記帳本上寫著花了這些錢。下週想買${goal}（${X} 元）。` }; } },
    planFigure: ctx => ledger([['零用錢', ctx.problem.a, 0], ...ctx.problem.sp.map(([w, p]) => [w, 0, p])]),
    steps: [
      cStep(0, { title: '看情境', ask: '我要知道什麼？', id: 'goal', hints: ['讀題目：小安想做什麼？', '想知道錢夠不夠買。', '要先知道還剩多少錢。'], think: '老師先想：要知道剩下的錢夠不夠買。', together: '一起想：要知道什麼？', pre: prompt, figure: ctx => A.get('moLedger').planFigure(ctx),
        q: () => '要知道什麼？', opts: () => [['left', '這週還剩多少錢、夠不夠買'], ['most', '哪一樣最貴'], ['count', '記了幾行']], ans: () => 'left', wrong: () => ({ msg: '題目想知道：剩下的錢夠不夠買。' }), say: () => '要知道還剩多少、夠不夠買。' }),
      cStep(1, { title: '找出要算什麼', ask: '要先算什麼？', id: 'need', hints: ['剩下的錢 ＝ 零用錢 － 花掉的錢。', '花掉的錢有好幾筆。', '先算花掉的一共多少。'], think: '老師想：先算花掉的一共多少，再從零用錢減掉。', together: '一起想：先算什麼？', figure: ctx => A.get('moLedger').planFigure(ctx),
        q: () => '要先算什麼？', opts: () => [['out', '花掉的錢一共多少'], ['one', '早餐多少錢'], ['add', '零用錢加上花掉的錢']], ans: () => 'out', wrong: () => ({ obs: 'opWrong', msg: '零用錢會越花越少，不是加上去。先算花掉的一共多少。' }), say: () => '先算花掉的一共多少。' }),
      cStep(2, { title: '選方法', ask: '花掉的錢一共多少，用什麼算？', id: 'op', fixed: true, hints: ['好幾筆花掉的錢合起來。', '合起來用加的。', '一筆一筆加。'], think: '老師選加法：花掉的錢合起來。', together: '一起選：用什麼算？', figure: ctx => A.get('moLedger').planFigure(ctx),
        q: () => '用什麼算？', opts: () => OPN, ans: () => '+', wrong: () => ({ obs: 'opWrong', msg: '好幾筆合起來，用加的。' }), say: () => '用加的。' }),
      mStep(3, { title: '算出來', ask: '花掉多少？還剩多少？', hints: ['支出一筆一筆加起來。', '零用錢 － 花掉的錢。', '不夠減要借。'], think: '老師先加花掉的，再從零用錢減掉。', together: '一起算：花掉多少、還剩多少？', pre: placeAid, figure: ctx => A.get('moLedger').planFigure(ctx),
        fields: [['out', () => '花掉一共幾元？', ctx => ctx.problem.out], ['left', () => '還剩幾元？', ctx => ctx.problem.left, (ctx, v) => v === ctx.problem.a + ctx.problem.out ? { obs: 'opWrong', msg: '花掉的錢要減掉。' } : v === I.bigMinusSmall(ctx.problem.a, ctx.problem.out) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : null]],
        say: e => `花掉 ${e.problem.sp.map(x => x[1]).join(' ＋ ')} ＝ ${e.problem.out} 元，還剩 ${e.problem.a} － ${e.problem.out} ＝ ${e.problem.left} 元。` }),
      cStep(4, { title: '檢查、做決定', ask: '剩下的錢夠買嗎？', id: 'ok', fixed: true, hints: ['剩下的錢和想買的價錢比一比。', '剩下的比較多（或一樣）就夠。', '不夠的話，可以下週少花一點。'], think: '老師把剩下的錢和想買的價錢比一比，做決定。', together: '一起決定：夠不夠？', figure: ctx => tag(ctx.problem.goal, ctx.problem.X),
        q: ctx => `還剩 ${ctx.problem.left} 元，${ctx.problem.goal} ${ctx.problem.X} 元。夠不夠？`, opts: () => [['yes', '夠，可以買'], ['no', '不夠，下週要少花一點、多存一點']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok ? '夠，可以買。' : '不夠，下週要少花一點。' })
    ],
    done: ctx => `花掉 ${ctx.problem.out} 元，還剩 ${ctx.problem.left} 元，${ctx.problem.ok ? '夠' : '不夠'}買${ctx.problem.goal}。`, chant: '記帳：收入、支出寫下來，算出還剩多少，再做決定。', transfer: '想一想：記帳有什麼好處？'
  });

  A.register('moSavePlan', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const W = any(rand, fromLevel({ easy: [10, 20], standard: [20, 50], challenge: [50, 100] }, level)), k = rnd(rand, 2, 9), extra = i % 2 === 0 ? 0 : rnd(rand, 1, W / 5) * 5;
      const diff = W * (k - 1) + (extra || W), H = rnd(rand, 1, 9) * 10, T = H + diff, it = any(rand, [['足球', '⚽'], ['故事書套書', '📚'], ['直排輪', '🛼'], ['桌遊', '🎲']]);
      return { W, H, T, diff, k: Math.ceil(diff / W), it, dims: [T, H, W], prompt: `小美想買${it[0]}，要 ${T} 元。她已經存了 ${H} 元，每週可以再存 ${W} 元。` }; },
    planFigure: ctx => tag(`${ctx.problem.it[1]} ${ctx.problem.it[0]}`, ctx.problem.T),
    steps: [
      nStep(0, { title: '還差多少', ask: '還差幾元？', id: 'diff', hints: ['目標的錢比存的錢多多少？', '目標 － 已經存的。', '不夠減要借。'], think: '老師先算還差多少：目標減掉已經存的。', together: '一起算：還差幾元？', pre: ctx => `${prompt(ctx)}${placeAid(ctx)}`, figure: ctx => colHtml(ctx.problem.T, ctx.problem.H, '-', { head: false }),
        label: ctx => `${ctx.problem.T} － ${ctx.problem.H} ＝ ？`, ans: ctx => ctx.problem.diff, wrong: (ctx, v) => v === ctx.problem.T + ctx.problem.H ? { obs: 'opWrong', msg: '還差多少用減的。' } : null, say: e => `還差 ${e.problem.diff} 元。` }),
      cStep(1, { title: '選方法', ask: '怎麼知道要存幾週？', id: 'how', fixed: true, hints: ['每週存一樣多。', '一週一週加上去（或用乘的）。', '加到和差的錢一樣多，或超過為止。'], think: '老師想：每週的錢一週一週加，加到夠為止，數幾週。', together: '一起想：怎麼知道？', figure: ctx => tag(`${ctx.problem.it[1]} ${ctx.problem.it[0]}`, ctx.problem.T),
        q: () => '怎麼知道要存幾週？', opts: () => [['skip', '每週的錢一週一週加（或用乘的），加到夠為止'], ['once', '存一週就夠了'], ['sub', '差的錢減掉一週的錢，就是答案']], ans: () => 'skip', wrong: () => ({ obs: 'opWrong', msg: '每週存一樣多，要一週一週加到夠。' }), say: () => '一週一週加，加到夠為止。' }),
      nStep(2, { title: '要幾週', ask: '至少要存幾週？', id: 'k', hints: ['一週一週加：第 1 週、第 2 週……', '加到和差的錢一樣多，或超過。', '還差一點點，也要再存一週。'], think: '老師一週一週加，看第幾週夠了；差一點也要多存一週。', together: '一起數：要幾週？', pre: timesAid, figure: ctx => big(`還差 ${ctx.problem.diff} 元　每週 ${ctx.problem.W} 元`),
        label: () => '至少要存幾週？', ans: ctx => ctx.problem.k, wrong: (ctx, v) => v === ctx.problem.k - 1 && ctx.problem.diff % ctx.problem.W ? { obs: 'roundDown', msg: '這時候還差一點點，要再存一週。' } : null,
        say: e => `${Array.from({ length: e.problem.k }, (_, j) => (j + 1) * e.problem.W).join('、')}，要 ${e.problem.k} 週。` }),
      cStep(3, { title: '想快一點', ask: '想早一點買到，可以怎麼做？', id: 'fast', fixed: true, hints: ['錢是自己存的。', '想一想：每週花的錢和存的錢，哪一個可以調整？', '每週多存一點，要存的週數會怎麼變？'], think: '老師想：少買想要的東西，每週多存一點。', together: '一起想：可以怎麼做？', figure: () => '',
        q: () => '想早一點買到，可以怎麼做？', opts: () => [['more', '少買想要的東西，每週多存一點'], ['borrow', '跟同學借錢'], ['take', '拿家裡的錢，不跟家人說']], ans: () => 'more', wrong: () => ({ msg: '為了買想要的東西去借錢，不是好方法；用家裡的錢，一定要先問家人。' }), say: () => '少買想要的東西，每週多存一點。' })
    ],
    done: ctx => `還差 ${ctx.problem.diff} 元，每週存 ${ctx.problem.W} 元，要 ${ctx.problem.k} 週。`, chant: '存錢計畫：先算還差多少，再一週一週加到夠。', transfer: '想一想：你想存錢買什麼？要存多久？'
  });

  A.register('moSpendSave', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const A0 = any(rand, fromLevel({ easy: [30, 50], standard: [100, 150, 200], challenge: [200, 300, 500] }, level));
      for (;;) { const half = level === 'challenge' && i % 2 === 0, S = half ? A0 / 2 : rnd(rand, 1, Math.floor(A0 / 10 / 2)) * 10, H = rnd(rand, 1, Math.max(1, Math.floor(A0 / 50))) * 5, sp = A0 - S - H; if (sp <= 0) continue;
        return { A0, S, H, sp, half, dims: [A0, S, H], prompt: `小安這個月有 ${A0} 元零用錢。他把錢分成三份：${half ? '一半存起來' : `存起來 ${S} 元`}、分享 ${H} 元（買小禮物送家人或捐出去），剩下的可以花。` }; } },
    planFigure: ctx => `<div class="mo-jars"><div>🏦<br>存起來</div><div>🎁<br>分享</div><div>🛍️<br>花用</div></div>`,
    steps: [
      cStep(0, { title: '為什麼要存', ask: '為什麼要存一些起來？', id: 'why', hints: ['錢花完就沒有了。', '以後可能有需要的時候。', '也可以存起來買更想要的東西。'], think: '老師想：存起來，以後需要的時候才有錢。', together: '一起想：為什麼要存？', pre: prompt, figure: ctx => A.get('moSpendSave').planFigure(ctx),
        q: () => '為什麼要存一些起來？', opts: () => [['future', '留給以後需要的時候，或存起來買更想要的東西'], ['none', '不用存，全部花掉最好'], ['show', '存起來給同學看']], ans: () => 'future', wrong: () => ({ msg: '錢花完就沒有了，存一些，以後需要時才有。' }), say: () => '留給以後需要的時候。' }),
      nStep(1, { title: '存和分享', ask: '存起來和分享的，一共幾元？', id: 'sh', hints: ['先找出存起來的錢。', '一半就是平分成兩份的一份。', '再加上分享的錢。'], think: '老師先找出存的錢，再加分享的錢。', together: '一起算：一共幾元？', figure: ctx => A.get('moSpendSave').planFigure(ctx),
        label: () => '存起來 ＋ 分享 ＝ 幾元？', ans: ctx => ctx.problem.S + ctx.problem.H, wrong: (ctx, v) => ctx.problem.half && v === ctx.problem.A0 + ctx.problem.H ? { obs: 'other', msg: '存的是一半，不是全部。' } : null, say: e => `${e.problem.S} ＋ ${e.problem.H} ＝ ${e.problem.S + e.problem.H} 元。` }),
      nStep(2, { title: '可以花多少', ask: '剩下可以花的有幾元？', id: 'sp', hints: ['全部的零用錢 － 存和分享的。', '用減的。', '算完加回去檢查。'], think: '老師用全部減掉存和分享的，就是可以花的。', together: '一起算：可以花幾元？', pre: placeAid, figure: ctx => colHtml(ctx.problem.A0, ctx.problem.S + ctx.problem.H, '-', { head: false }),
        label: () => '可以花的有幾元？', ans: ctx => ctx.problem.sp, wrong: (ctx, v) => v === ctx.problem.A0 - ctx.problem.S || v === ctx.problem.A0 - ctx.problem.H ? { obs: 'skipStep', msg: '存起來和分享的都要減掉。' } : null, say: e => `${e.problem.A0} － ${e.problem.S + e.problem.H} ＝ ${e.problem.sp} 元。` }),
      cStep(3, { title: '分享', ask: '分享的錢可以怎麼用？', id: 'share', fixed: true, hints: ['分享是想到別人。', '分享的錢，可以讓誰開心？', '分享不一定要花錢，也可以用時間和幫忙。'], think: '老師想：分享的錢，是用來關心別人的；不花錢的時候，也可以幫忙做事、陪伴別人。', together: '一起想：分享的錢怎麼用？', figure: () => big('🎁 ❤️'),
        q: () => '分享的錢可以怎麼用？', opts: () => [['help', '送家人小禮物，或捐給需要幫助的人'], ['self', '買更多零食給自己'], ['lose', '丟掉']], ans: () => 'help', wrong: () => ({ msg: '分享是想到別人，不是給自己。' }), say: () => '送家人小禮物，或捐給需要幫助的人。' })
    ],
    done: ctx => `存 ${ctx.problem.S} 元、分享 ${ctx.problem.H} 元、可以花 ${ctx.problem.sp} 元。`, chant: '零用錢分三份：存起來、分享、花用。', transfer: '想一想：如果你有零用錢，你會怎麼分？'
  });

  A.register('moPlanner', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { for (;;) { const k = rnd(rand, fromLevel({ easy: 5, standard: 20, challenge: 25 }, level), fromLevel({ easy: 9, standard: 30, challenge: 35 }, level)), p = rnd(rand, fromLevel({ easy: 10, standard: 12, challenge: 18 }, level), fromLevel({ easy: 25, standard: 30, challenge: 45 }, level));
        const e = rnd(rand, 5, 30) * 10, d = rnd(rand, 5, 25) * 10, need = k * p + e, all = need + d, ok = i % 2 === 0;
        const B = ok ? Math.ceil(all / 100) * 100 + (all % 100 === 0 ? 0 : 0) : Math.ceil(need / 100) * 100; if (!ok && B >= all) continue; if (B < need) continue;
        return { k, p, e, d, need, all, B, ok: all <= B, left: all <= B ? B - all : B - need, dims: [k, p, e, d, B], prompt: `班上 ${k} 人辦慶生會：每人一杯飲料 ${p} 元，蛋糕和餐具一共 ${e} 元（這些是需要的）；也想買氣球裝飾 ${d} 元（想要的）。班費有 ${B} 元。` }; } },
    planFigure: ctx => `<table class="fm-ttable in-receipt" aria-label="預算表"><tbody><tr><th scope="row">飲料（每人）</th><td>${ctx.problem.p} 元 × ${ctx.problem.k} 人</td><td>需要</td></tr><tr><th scope="row">蛋糕、餐具</th><td>${ctx.problem.e} 元</td><td>需要</td></tr><tr><th scope="row">氣球裝飾</th><td>${ctx.problem.d} 元</td><td>想要</td></tr></tbody></table>`,
    steps: [
      nStep(0, { title: '需要的', ask: '需要的東西一共幾元？', id: 'need', hints: ['飲料：每人的錢 × 人數。', '再加上蛋糕和餐具。', '先乘後加。'], think: '老師先算需要的：飲料錢乘人數，再加蛋糕和餐具。', together: '一起算：需要的一共幾元？', pre: ctx => `${prompt(ctx)}${timesAid(ctx)}`, figure: ctx => A.get('moPlanner').planFigure(ctx),
        label: ctx => `${ctx.problem.p} × ${ctx.problem.k} ＋ ${ctx.problem.e} ＝ ？`, ans: ctx => ctx.problem.need, wrong: (ctx, v) => v === ctx.problem.p * ctx.problem.k ? { obs: 'skipStep', msg: '這是飲料的錢，還要加蛋糕和餐具。' } : v === ctx.problem.p * (ctx.problem.k + ctx.problem.e) ? { obs: 'leftToRight', msg: '先乘後加：飲料錢算好，再加蛋糕和餐具。' } : null, say: e => `${e.problem.p} × ${e.problem.k} ＋ ${e.problem.e} ＝ ${e.problem.need} 元。` }),
      nStep(1, { title: '全部的', ask: '加上想要的，一共幾元？', id: 'all', hints: ['需要的一共 ＋ 想要的。', '用加的。', '個位對個位。'], think: '老師把需要的加上想要的。', together: '一起算：全部幾元？', figure: ctx => A.get('moPlanner').planFigure(ctx),
        label: ctx => `${shown(ctx, 0) || ctx.checked(0) ? ctx.problem.need : '需要的'} ＋ ${ctx.problem.d} ＝ ？`, ans: ctx => ctx.problem.all, say: e => `全部 ${e.problem.all} 元。` }),
      cStep(2, { title: '夠不夠', ask: '班費夠不夠全部買？', id: 'ok', fixed: true, hints: ['全部的錢和班費比一比。', '班費比較多（或一樣）：夠。', '班費比較少：不夠。'], think: '老師把全部的錢和班費比一比。', together: '一起比：夠不夠？', figure: ctx => A.get('moPlanner').planFigure(ctx),
        q: ctx => `全部 ${ctx.problem.all} 元，班費 ${ctx.problem.B} 元。夠不夠全部買？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok ? '夠。' : '不夠。' }),
      cStep(3, { title: '怎麼調整', ask: '要怎麼決定？', id: 'plan', fixed: true, hints: ['夠的話，可以全部買。', '不夠的話，先不買想要的。', '需要的要留著。'], think: '老師想：不夠的時候，先拿掉想要的，需要的留著。', together: '一起決定：怎麼做？', figure: ctx => A.get('moPlanner').planFigure(ctx),
        q: () => '要怎麼決定？', opts: () => [['all', '全部都買'], ['dropWant', '先不買氣球裝飾（想要的）'], ['dropNeed', '先不買飲料（需要的）']], ans: ctx => ctx.problem.ok ? 'all' : 'dropWant', wrong: (ctx, v) => ({ obs: v === 'dropNeed' ? 'needWant' : 'compareWrong', msg: v === 'dropNeed' ? '需要的要留著，先拿掉想要的。' : '看看班費夠不夠。' }), say: e => e.problem.ok ? '全部都買。' : '先不買氣球裝飾。' }),
      nStep(4, { title: '剩多少', ask: '決定好以後，班費還剩幾元？', id: 'left', hints: ['班費 － 決定要買的錢。', '全部買：減全部；不買想要的：減需要的。', '用減的，算完檢查。'], think: '老師用班費減掉決定要買的錢。', together: '一起算：還剩幾元？', pre: placeAid, figure: ctx => colHtml(ctx.problem.B, ctx.problem.ok ? ctx.problem.all : ctx.problem.need, '-', { head: false }),
        label: () => '班費還剩幾元？', ans: ctx => ctx.problem.left, wrong: (ctx, v) => !ctx.problem.ok && v === ctx.problem.B - ctx.problem.all ? { obs: 'compareWrong', msg: '不夠，所以只買需要的。' } : null, say: e => `還剩 ${e.problem.left} 元。` })
    ],
    done: ctx => ctx.problem.ok ? `全部 ${ctx.problem.all} 元，班費夠，剩 ${ctx.problem.left} 元。` : `全部 ${ctx.problem.all} 元，班費不夠；先不買裝飾，買需要的 ${ctx.problem.need} 元，剩 ${ctx.problem.left} 元。`,
    chant: '做預算：需要的先算，加上想要的，和錢比一比；不夠先拿掉想要的。', transfer: '想一想：如果班費不夠，還可以怎麼調整？'
  });
})();

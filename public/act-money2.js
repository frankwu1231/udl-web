'use strict';
// 第 36 版：錢幣與購物教材包單元 3～6（大錢與估算、付錢、找錢、去買東西）。錢幣圖和付款盤在 act-money.js（window.moneyFig）。
// 核心活動 4-1（付錢四步）：看價錢 → 先拿大的 → 放進付款盤湊出剛好 → 數一數。
// 核心活動 5-1（找錢四步）：付了多少 → 從價錢往上數（先數到整十，再數到付的錢）→ 一共要找多少 → 點一點找的錢對不對。
// 核心活動 6-3（購物流程，特生K-sP-5）：列清單 → 算一共多少 → 錢夠不夠 → 付錢、算找多少 → 點找錢、拿發票、收好。
// 課綱：N-1-4（一年級 100 元內，數錢、換錢、找錢）、N-2-5（100、500、1000 元）、N-2-4（以百位數估算為主）。
// 二年級的減法直式依 N-2-2 只退位一次（入門、一般）；挑戰（三年級 N-3-2）才有多次退位。課綱容許多元策略：找錢也可以往上數。
(() => {
  const A = window.areaActs, I = window.intFig, M = window.moneyFig;
  const { rnd, any, fromLevel, big, nStep, cStep, mStep, prompt, shown, esc, colHtml, placeAid, borrows, carries, round100 } = I;
  const { DEN, isBill, unitOf, nameOf, coin, total, pieces, kinds, countsText, pile, greedy, tag, tags, payStep } = M;
  const methods = [['mark', '🛒 一步一步做'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['count', '用錢數一數'], ['check', '算完檢查'], ['hint', '看提示']];
  const OPN = [['+', '加起來（＋）'], ['-', '減掉（－）'], ['*', '乘（×）']];
  const ceil10 = n => Math.ceil(n / 10) * 10;
  const ITEMS = [['鉛筆', '✏️'], ['橡皮擦', '🧽'], ['筆記本', '📒'], ['果汁', '🧃'], ['麵包', '🍞'], ['貼紙', '⭐'], ['尺', '📏'], ['飯糰', '🍙'], ['彩色筆', '🖍️'], ['牛奶', '🥛']];
  const BIGS = [['故事書', '📚'], ['球鞋', '👟'], ['書包', '🎒'], ['玩具車', '🚗'], ['外套', '🧥'], ['水壺', '🥤'], ['雨傘', '☂️'], ['積木', '🧱']];

  // ---------- 單元 3：大錢與估算（二年級） ----------
  const BIGTRADE = { easy: [[100, 10]], standard: [[500, 100], [1000, 100], [1000, 500]], challenge: [[1000, 100], [1000, 500], [500, 100]] };
  A.register('moBig', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const [B, s] = any(rand, fromLevel(BIGTRADE, level)); let f; do f = any(rand, [100, 500, 1000]); while (level === 'easy' && f === 1000); return { B, s, k: B / s, f, mix: level === 'challenge' && B === 1000, dims: [B, s], prompt: `認識大錢：1 張 ${B} 元可以換幾${unitOf(s)} ${s} 元？` }; },
    planFigure: ctx => `<div class="mo-show">${coin(ctx.problem.B)}</div>`,
    steps: [
      cStep(0, { title: '認一認', ask: '找出指定的鈔票。', id: 'find', hints: ['看鈔票上面的數字。', '數字後面有幾個 0？', '100 有兩個 0，1000 有三個 0。'], think: '老師看鈔票上的數字，數一數有幾個 0。', together: '一起找：哪一張是？', pre: prompt, figure: () => '',
        q: ctx => `哪一張是 ${ctx.problem.f} 元？`, opts: () => [100, 500, 1000].map(d => [String(d), coin(d, { small: true })]), ans: ctx => String(ctx.problem.f), wrong: () => ({ obs: 'denomConfuse', msg: '看鈔票上的數字，數一數有幾個 0。' }), say: e => `上面寫 ${e.problem.f} 的就是。` }),
      nStep(1, { title: '換一換', ask: '可以換幾張？', id: 'k', hints: [`用小的鈔票數一數。`, '數到和大的一樣多就停。', '數了幾張，就是換幾張。'], think: '老師用小的鈔票數，數到和大的一樣多。', together: '一起數：換幾張？', figure: ctx => A.get('moBig').planFigure(ctx),
        label: ctx => `1 張 ${ctx.problem.B} 元，可以換幾${unitOf(ctx.problem.s)} ${ctx.problem.s} 元？`, ans: ctx => ctx.problem.k, wrong: () => ({ obs: 'tradeWrong', msg: '用小的錢數一數，數到和大的一樣多。' }),
        say: e => `${Array.from({ length: e.problem.k }, (_, j) => (j + 1) * e.problem.s).join('、')}，換 ${e.problem.k} ${unitOf(e.problem.s)}。` }),
      payStep(2, { title: '湊一湊', ask: '用小的錢湊出一樣多。', id: 'pay', hints: ['只能用比較小的錢。', '一邊放一邊數。', '數到和大的一樣多就停。'], think: '老師一邊放一邊數，湊出一樣多。', together: '一起湊：湊出一樣多。', figure: ctx => A.get('moBig').planFigure(ctx),
        label: ctx => ctx.problem.mix ? `用 500 元和 100 元，湊出 1000 元。` : `用 ${ctx.problem.s} 元，湊出 ${ctx.problem.B} 元。`,
        opts: ctx => ({ denoms: ctx.problem.mix ? [500, 100] : [ctx.problem.s] }), target: ctx => ctx.problem.B, rule: 'exact', solveWith: ctx => ctx.problem.mix ? { 500: 1, 100: 5 } : { [ctx.problem.s]: ctx.problem.k }, say: e => `湊出 ${e.problem.B} 元了。` })
    ],
    done: ctx => `1 張 ${ctx.problem.B} 元 ＝ ${ctx.problem.k} ${unitOf(ctx.problem.s)} ${ctx.problem.s} 元。`, chant: '大錢：看數字有幾個 0；換以前、換以後，錢一樣多。', transfer: '想一想：過年拿到紅包，裡面可能有哪些鈔票？'
  });

  A.register('moCountBig', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const set = fromLevel({ easy: [500, 100, 10], standard: [500, 100, 50, 10, 5, 1], challenge: [500, 100, 50, 10, 5, 1] }, level);
      for (;;) { const c = {}; set.forEach(d => { const k = rnd(rand, 0, d === 500 || d === 50 ? 1 : d === 100 ? 4 : 3); if (k) c[d] = k; });
        const bills = kinds(c).filter(isBill); if (!bills.length || kinds(c).length < (level === 'easy' ? 2 : 3) || total(c) > 1000 || pieces(c) > 12) continue;
        return { c, n: total(c), b: bills.reduce((s, d) => s + d * c[d], 0), top: kinds(c)[0], dims: [total(c)], prompt: '紅包裡有這些錢。一共幾元？' }; } },
    planFigure: ctx => pile(ctx.problem.c),
    steps: [
      cStep(0, { title: '先數大的', ask: '先數哪一種？', id: 'first', fixed: true, hints: ['大的先數。', '鈔票比硬幣大。', '先數數字最大的。'], think: '老師先數數字最大的鈔票。', together: '一起想：先數哪一種？', pre: prompt, figure: ctx => pile(ctx.problem.c),
        q: () => '先數哪一種錢？', opts: ctx => kinds(ctx.problem.c).map(d => [String(d), `${d} 元`]), ans: ctx => String(ctx.problem.top), wrong: () => ({ obs: 'wrongChoice', msg: '先數數字最大的。' }), say: e => `先數 ${e.problem.top} 元。` }),
      nStep(1, { title: '數鈔票', ask: '鈔票一共幾元？', id: 'b', hints: ['只數鈔票。', '500 元以後，100 元 100 元接著數。', '例如 500、600、700。'], think: '老師先數鈔票：大的先數，再接著數。', together: '一起數：鈔票一共幾元？', figure: ctx => pile(ctx.problem.c),
        label: () => '鈔票一共幾元？', ans: ctx => ctx.problem.b, wrong: (ctx, v) => v === kinds(ctx.problem.c).filter(isBill).reduce((s, d) => s + ctx.problem.c[d], 0) ? { obs: 'coinsAsMoney', msg: '這是有幾張。要照鈔票上的數字數。' } : { obs: 'mixCount', msg: '換到 100 元時，要改成 100 元 100 元接著數。' }, say: e => `鈔票一共 ${e.problem.b} 元。` }),
      nStep(2, { title: '接著數完', ask: '再接著數硬幣，一共幾元？', id: 'n', hints: ['從鈔票的錢接著數。', '50 元、10 元、5 元、1 元，一種一種數。', '數完最後一個，就是一共幾元。'], think: '老師從鈔票的錢接著數硬幣。', together: '一起數：一共幾元？', figure: ctx => pile(ctx.problem.c),
        label: () => '一共幾元？', ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === pieces(ctx.problem.c) ? { obs: 'coinsAsMoney', msg: '這是有幾個錢。要照數字數。' } : { obs: 'mixCount', msg: '從大的開始，再數一次。' }, say: e => `一共 ${e.problem.n} 元。` })
    ],
    done: ctx => `${countsText(ctx.problem.c)}，一共 ${ctx.problem.n} 元。`, chant: '數大錢：先數鈔票，再接著數硬幣。', transfer: '想一想：紅包裡的錢，你會怎麼數？'
  });

  // 3-3 大約多少錢（N-2-4 以百位數估算）
  const nearOk = p => { const r = p % 100; return r <= 35 || r >= 65; };   // 不出現接近一半的價錢，估的時候不會兩邊都對
  A.register('moEstimate', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => {
      for (;;) { const [a, b] = [any(rand, BIGS), any(rand, BIGS)]; if (a === b) continue;
        const hi = fromLevel({ easy: 349, standard: 449, challenge: 649 }, level), p1 = rnd(rand, 110, hi), p2 = rnd(rand, 110, hi); if (!nearOk(p1) || !nearOk(p2)) continue;
        const e = round100(p1) + round100(p2), s = p1 + p2, B = any(rand, level === 'challenge' ? [500, 800, 1000] : [500, 600, 700, 800]);
        if (s > 1000 || Math.abs(s - B) < 40 || (e <= B) !== (s <= B)) continue;
        return { a, b, p1, p2, e1: round100(p1), e2: round100(p2), e, s, B, ok: s <= B, dims: [p1, p2, B], prompt: `想買${a[0]} ${p1} 元和${b[0]} ${p2} 元，帶了 ${B} 元。先估一估，夠不夠？` }; } },
    planFigure: ctx => tags([[ctx.problem.a[1] + ' ' + ctx.problem.a[0], ctx.problem.p1], [ctx.problem.b[1] + ' ' + ctx.problem.b[0], ctx.problem.p2]]),
    steps: [
      nStep(0, { title: '估第一樣', ask: '大約是幾百元？', id: 'e1', hints: ['看百位是幾，再看後面兩位。', '後面兩位比較接近 0，還是比較接近 100？', '想成最接近的整百。'], think: '老師看後面兩位比較接近哪一個整百。', together: '一起估：大約幾百元？', pre: prompt, figure: ctx => A.get('moEstimate').planFigure(ctx),
        label: ctx => `${ctx.problem.p1} 元大約是幾百元？`, ans: ctx => ctx.problem.e1, wrong: (ctx, v) => v % 100 ? { obs: 'estWrong', msg: '要估成整百（100、200、300……）。' } : { obs: 'estWrong', msg: '看後面兩位：比較接近 0，還是比較接近 100？' }, say: e => `${e.problem.p1} 大約是 ${e.problem.e1}。` }),
      nStep(1, { title: '估第二樣', ask: '大約是幾百元？', id: 'e2', hints: ['一樣看後面兩位。', '比較接近哪一個整百？', '想成最接近的整百。'], think: '老師一樣估成最接近的整百。', together: '一起估：大約幾百元？', figure: ctx => A.get('moEstimate').planFigure(ctx),
        label: ctx => `${ctx.problem.p2} 元大約是幾百元？`, ans: ctx => ctx.problem.e2, wrong: (ctx, v) => ({ obs: 'estWrong', msg: '想成最接近的整百。' }), say: e => `${e.problem.p2} 大約是 ${e.problem.e2}。` }),
      nStep(2, { title: '合起來估', ask: '兩樣合起來大約幾元？', id: 'e', hints: ['把兩個估好的整百加起來。', '幾百加幾百，很好算。', '這是大約的錢。'], think: '老師把估好的整百加起來。', together: '一起加：大約幾元？', figure: ctx => A.get('moEstimate').planFigure(ctx),
        label: ctx => `${ctx.problem.e1} ＋ ${ctx.problem.e2} ＝ ？`, ans: ctx => ctx.problem.e, say: e => `大約 ${e.problem.e} 元。` }),
      cStep(3, { title: '夠不夠', ask: '帶的錢大概夠不夠？', id: 'ok', fixed: true, hints: ['把大約的錢和帶的錢比一比。', '大約的錢比較少（或一樣）：大概夠。', '大約的錢比較多：大概不夠。'], think: '老師把大約的錢和帶的錢比一比，做決定。', together: '一起決定：夠不夠？', figure: ctx => A.get('moEstimate').planFigure(ctx),
        q: ctx => `大約 ${ctx.problem.e} 元，帶了 ${ctx.problem.B} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok ? '大概夠。' : '大概不夠。' })
    ],
    done: ctx => `大約 ${ctx.problem.e} 元（真的是 ${ctx.problem.s} 元），帶 ${ctx.problem.B} 元${ctx.problem.ok ? '夠' : '不夠'}。`, chant: '估一估：每樣想成最接近的整百，加起來，再和帶的錢比。', transfer: '想一想：去書店前，怎麼很快知道帶的錢夠不夠？'
  });

  // ---------- 單元 4：付錢 ----------
  // 4-1 付錢四步（核心）：錢包裡的錢有限，有一些比價錢還大的
  function makeExact(level, i, rand = Math.random) {
    const [lo, hi, set] = fromLevel({ easy: [6, 30, [10, 5, 1]], standard: [21, 99, [50, 10, 5, 1]], challenge: [120, 480, [100, 50, 10, 5, 1]] }, level);
    for (;;) { const price = rnd(rand, lo, hi), g = greedy(price, set); if (!g || kinds(g).length < 2) continue;
      const wallet = { ...g }; set.forEach(d => { wallet[d] = (wallet[d] || 0) + rnd(rand, 0, 2); });
      const bigger = [...DEN].reverse().find(d => d > price && d <= (level === 'challenge' ? 500 : 100)); if (bigger && rand() < 0.7) wallet[bigger] = (wallet[bigger] || 0) + 1;
      kinds(wallet).forEach(d => { if (!wallet[d]) delete wallet[d]; });
      const t = any(rand, level === 'challenge' ? BIGS : ITEMS), top = kinds(wallet).find(d => d <= price);
      return { price, wallet, t, top, dims: [price], prompt: `${t[0]}賣 ${price} 元。用錢包裡的錢，剛好付 ${price} 元。` }; }
  }
  A.register('moExact', {
    methods: [['mark', '👛 一步一步付'], ['self', '🧠 先自己付，需要時看提示']], reasons, makeProblem: makeExact,
    planFigure: ctx => `${tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.price)}<p class="lf-tag">錢包裡有</p>${pile(ctx.problem.wallet)}`,
    steps: [
      nStep(0, { title: '看價錢', ask: '要付幾元？', id: 'price', hints: ['看價目牌。', '價目牌上的數字就是價錢。', '要付的錢和價錢一樣多。'], think: '老師先看價目牌，知道要付幾元。', together: '一起看：要付幾元？', pre: prompt, figure: ctx => A.get('moExact').planFigure(ctx),
        label: () => '要付幾元？', ans: ctx => ctx.problem.price, say: e => `要付 ${e.problem.price} 元。` }),
      cStep(1, { title: '先拿大的', ask: '錢包裡，先拿哪一種？', id: 'top', fixed: true, hints: ['先拿大的，比較快。', '可是不能比價錢還多。', '找比價錢小、又最大的那一種。'], think: '老師找錢包裡最大、又不超過價錢的錢，先拿它。', together: '一起想：先拿哪一種？', figure: ctx => A.get('moExact').planFigure(ctx),
        q: () => '先拿哪一種錢？', opts: ctx => kinds(ctx.problem.wallet).map(d => [String(d), `${d} 元`]), ans: ctx => String(ctx.problem.top),
        wrong: (ctx, v) => Number(v) > ctx.problem.price ? { obs: 'payOver', msg: '這個比價錢還多，要剛好付的時候先不用它。' } : { obs: 'wrongChoice', msg: '還有比它大、又不超過價錢的錢，先拿大的。' }, say: e => `先拿 ${e.problem.top} 元。` }),
      payStep(2, { title: '湊出剛好', ask: '把錢放進付款盤，湊出剛好。', id: 'pay', hints: ['先放大的，一邊放一邊數。', '快到的時候，換小的錢。', '數到剛好和價錢一樣就停。'], think: '老師先放大的，一邊放一邊數，快到了換小的，剛好就停。', together: '一起放：湊出剛好。',
        figure: ctx => tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.price), label: ctx => `從錢包拿錢，剛好付 ${ctx.problem.price} 元。`, opts: ctx => ({ wallet: ctx.problem.wallet, denoms: kinds(ctx.problem.wallet) }), target: ctx => ctx.problem.price, rule: 'exact',
        say: e => `放了 ${countsText(greedy(e.problem.price, kinds(e.problem.wallet), e.problem.wallet) || {})}。` }),
      nStep(3, { title: '數一數', ask: '盤子裡一共幾元？', id: 'got', hints: ['先數大的，再接著數小的。', '數完和價錢比一比。', '一樣多就是剛好。'], think: '老師再數一次盤子裡的錢，和價錢一樣多。', together: '一起數：盤子裡幾元？', figure: ctx => pile(ctx.state.pay || {}),
        label: () => '盤子裡一共幾元？', ans: ctx => total(ctx.state.pay || {}), wrong: () => ({ obs: 'mixCount', msg: '先數大的，再接著數小的。' }), say: e => `一共 ${e.problem.price} 元，剛好。` })
    ],
    done: ctx => `剛好付了 ${ctx.problem.price} 元。`, chant: '付錢四步：看價錢、先拿大的、湊出剛好、數一數。', transfer: '想一想：在福利社買東西，你會先拿哪一種錢？'
  });

  // 4-2 多付一點：錢包裡沒有零錢，剛好付不出來，多付一張（下一個整數元）
  A.register('moNextUp', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => {
      const [lo, hi, wallet] = fromLevel({ easy: [11, 39, { 10: 5 }], standard: [21, 99, { 50: 1, 10: 5 }], challenge: [110, 480, { 100: 4, 50: 1, 10: 5 }] }, level);
      let price; do price = rnd(rand, lo, hi); while (price % 10 === 0);
      const t = any(rand, level === 'challenge' ? BIGS : ITEMS); return { price, wallet: { ...wallet }, t, dims: [price], prompt: `${t[0]}賣 ${price} 元。錢包裡只有${kinds(wallet).map(d => ` ${d} 元`).join('、')}。` }; },
    planFigure: ctx => `${tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.price)}<p class="lf-tag">錢包裡有</p>${pile(ctx.problem.wallet)}`,
    steps: [
      cStep(0, { title: '付得剛好嗎', ask: '錢包裡的錢，可以剛好付嗎？', id: 'exact', fixed: true, hints: ['看價錢的個位。', '錢包裡有 1 元、5 元嗎？', '沒有零錢，就湊不出個位。'], think: '老師看：價錢的個位不是 0，錢包裡又沒有 1 元、5 元，剛好付不出來。', together: '一起想：可以剛好付嗎？', pre: prompt, figure: ctx => A.get('moNextUp').planFigure(ctx),
        q: ctx => `可以剛好付 ${ctx.problem.price} 元嗎？`, opts: () => [['no', '不行，沒有零錢'], ['yes', '可以']], ans: () => 'no', wrong: () => ({ msg: '錢包裡沒有 1 元和 5 元，個位湊不出來。' }), say: () => '不行，沒有零錢。' }),
      payStep(1, { title: '多付一點', ask: '付夠的錢，可是不要多拿。', id: 'pay', hints: ['比價錢多一點就好。', '想一想：再多一個 10 元就夠了嗎？', '拿掉一個也還夠，就是拿太多了。'], think: '老師付比價錢多一點的錢：拿掉任何一個就不夠，才是剛剛好。', together: '一起付：付夠，不要多拿。',
        figure: ctx => tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.price), label: ctx => `付夠 ${ctx.problem.price} 元，但是不要多拿。`, opts: ctx => ({ wallet: ctx.problem.wallet, denoms: kinds(ctx.problem.wallet) }), target: ctx => ctx.problem.price, rule: 'enough',
        solveWith: ctx => greedy(ceil10(ctx.problem.price), kinds(ctx.problem.wallet), ctx.problem.wallet), say: e => `付 ${ceil10(e.problem.price)} 元。` }),
      nStep(2, { title: '要找多少', ask: '店員要找你幾元？', id: 'ch', hints: ['付的錢比價錢多。', '從價錢往上數到付的錢。', '多出來的就是要找的。'], think: '老師從價錢往上數，數到付的錢。', together: '一起數：要找幾元？', figure: ctx => `${tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.price)}<p class="lf-tag">付了</p>${pile(ctx.state.pay || {})}`,
        label: ctx => `付了 ${total(ctx.state.pay || {})} 元，要找幾元？`, ans: ctx => total(ctx.state.pay || {}) - ctx.problem.price, wrong: () => ({ obs: 'changeWrong', msg: '從價錢往上數，數到付的錢。' }), say: e => `要找 ${ceil10(e.problem.price) - e.problem.price} 元。` })
    ],
    done: ctx => `沒有零錢時，多付一點，再等店員找錢。`, chant: '多付一點：剛好付不出來，就付比價錢多一點，拿掉一個就不夠才對。', transfer: '想一想：只有 50 元，買 37 元的東西怎麼辦？'
  });

  A.register('moFewest', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const [lo, hi, set] = fromLevel({ easy: [12, 49, [10, 5, 1]], standard: [36, 99, [50, 10, 5, 1]], challenge: [160, 990, [500, 100, 50, 10, 5, 1]] }, level);
      for (;;) { const price = rnd(rand, lo, hi), g = greedy(price, set); if (kinds(g).length < 2) continue; const t = any(rand, level === 'challenge' ? BIGS : ITEMS); return { price, set, g, n: pieces(g), t, dims: [price], prompt: `自動販賣機只收剛好的錢。${t[0]} ${price} 元，用最少個錢付。` }; } },
    planFigure: ctx => tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.price),
    steps: [
      cStep(0, { title: '先拿大的', ask: '要用最少個，先拿哪一種？', id: 'top', fixed: true, hints: ['大的錢一個就很多。', '可是不能比價錢多。', '找不超過價錢、最大的那一種。'], think: '老師先拿不超過價錢、最大的錢。', together: '一起想：先拿哪一種？', pre: prompt, figure: ctx => A.get('moFewest').planFigure(ctx),
        q: () => '先拿哪一種錢？', opts: ctx => ctx.problem.set.map(d => [String(d), `${d} 元`]), ans: ctx => String(kinds(ctx.problem.g)[0]), wrong: (ctx, v) => Number(v) > ctx.problem.price ? { obs: 'payOver', msg: '這個比價錢還多。' } : { obs: 'notFewest', msg: '還有更大、又不超過價錢的錢。' }, say: e => `先拿 ${kinds(e.problem.g)[0]} 元。` }),
      payStep(1, { title: '用最少個', ask: '剛好付，而且用最少個。', id: 'pay', hints: ['大的能放就先放大的。', '放不下了才換小一點的。', '幾個小的可以換成一個大的，就換。'], think: '老師大的能放就放，放不下才換小的。', together: '一起放：用最少個。', figure: ctx => A.get('moFewest').planFigure(ctx),
        label: ctx => `剛好付 ${ctx.problem.price} 元，用最少個錢。`, opts: ctx => ({ denoms: ctx.problem.set }), target: ctx => ctx.problem.price, rule: 'fewest', say: e => `${countsText(e.problem.g)}。` }),
      nStep(2, { title: '數一數個數', ask: '用了幾個（張）錢？', id: 'n', hints: ['數盤子裡的錢有幾個。', '這次數的是個數，不是幾元。', '一個一個數。'], think: '老師數盤子裡有幾個錢。', together: '一起數：用了幾個？', figure: ctx => pile(ctx.state.pay || {}),
        label: () => '一共用了幾個（張）錢？', ans: ctx => ctx.problem.n, wrong: (ctx, v) => v === ctx.problem.price ? { obs: 'coinsAsMoney', msg: '這是幾元。這一題問的是有幾個錢。' } : null, say: e => `用了 ${e.problem.n} 個。` })
    ],
    done: ctx => `最少用 ${ctx.problem.n} 個：${countsText(ctx.problem.g)}。`, chant: '最少個：大的能放先放大的，放不下再換小的。', transfer: '想一想：錢包裡零錢太多，付錢時可以怎麼用掉一些？'
  });

  // ---------- 單元 5：找錢 ----------
  // 5-1 找錢四步（核心）：往上數
  function makeCountUp(level, i, rand = Math.random) {
    const [bills, lo] = fromLevel({ easy: [[50], 2], standard: [[50, 100], 12], challenge: [[100, 500], 31] }, level);
    for (;;) { const B = any(rand, bills), p = rnd(rand, lo, B - 2); if (p % 10 === 0 || ceil10(p) >= B) continue;
      const ch = B - p, give = greedy(ch, DEN.filter(d => d < B)), kind = i % 3 === 2 ? 'short' : 'ok';
      let got = { ...give }; if (kind === 'short') { const s = kinds(got).slice(-1)[0]; got[s]--; if (!got[s]) delete got[s]; if (!pieces(got)) continue; }
      const t = any(rand, level === 'challenge' ? BIGS : ITEMS);
      return { B, p, up: ceil10(p), a1: ceil10(p) - p, a2: B - ceil10(p), ch, got, gotN: total(got), kind, t, dims: [B, p], prompt: `買${t[0]} ${p} 元，付了 1 ${unitOf(B)} ${B} 元。要找多少錢？` }; }
  }
  A.register('moCountUp', {
    methods: [['mark', '🔼 一步一步往上數'], ['self', '🧠 先自己算，需要時看提示']], reasons, makeProblem: makeCountUp,
    planFigure: ctx => `${tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.p)}<p class="lf-tag">付了</p><div class="mo-show">${coin(ctx.problem.B)}</div>`,
    steps: [
      nStep(0, { title: '付了多少', ask: '付了幾元？', id: 'paid', hints: ['看付的錢上面的數字。', '是硬幣還是鈔票？', '數字是幾就是幾元。'], think: '老師先看付了幾元。', together: '一起看：付了幾元？', pre: prompt, figure: ctx => A.get('moCountUp').planFigure(ctx),
        label: () => '付了幾元？', ans: ctx => ctx.problem.B, wrong: (ctx, v) => v === ctx.problem.p ? { msg: '這是價錢。看付的錢。' } : { obs: 'denomConfuse', msg: '看付的錢上面的數字。' }, say: e => `付了 ${e.problem.B} 元。` }),
      mStep(1, { title: '往上數', ask: '從價錢往上數到付的錢。', hints: ['先從價錢數到下一個整十。', '再從整十數到付的錢。', '把兩段記下來。'], think: '老師從價錢往上數：先數到整十，再數到付的錢。', together: '一起往上數。',
        figure: ctx => big(`${ctx.problem.p} → ${shown(ctx, 1) ? ctx.problem.up : '？'} → ${ctx.problem.B}`),
        fields: [['a1', ctx => `從 ${ctx.problem.p} 數到 ${ctx.problem.up}，要加幾元？`, ctx => ctx.problem.a1, () => ({ obs: 'countUpErr', msg: '一元一元往上數到整十。' })], ['a2', ctx => `再從 ${ctx.problem.up} 數到 ${ctx.problem.B}，要加幾元？`, ctx => ctx.problem.a2, () => ({ obs: 'countUpErr', msg: '十元十元（或一百一百）往上數。' })]],
        say: e => `${e.problem.p} 數到 ${e.problem.up} 要 ${e.problem.a1} 元，${e.problem.up} 數到 ${e.problem.B} 要 ${e.problem.a2} 元。` }),
      nStep(2, { title: '一共要找', ask: '一共要找幾元？', id: 'ch', hints: ['把往上數的兩段合起來。', '第一段 ＋ 第二段。', '也可以用付的錢減價錢檢查。'], think: '老師把兩段合起來，就是要找的錢。', together: '一起算：一共要找幾元？', figure: ctx => big(`${ctx.problem.p} → ${ctx.problem.up} → ${ctx.problem.B}`),
        label: () => '一共要找幾元？', ans: ctx => ctx.problem.ch, wrong: (ctx, v) => v === ctx.problem.a2 ? { obs: 'skipStep', msg: '第一段也要算進去。' } : v === ctx.problem.B + ctx.problem.p ? { obs: 'opWrong', msg: '找錢不是加起來。' } : { obs: 'changeWrong', msg: '兩段合起來，再算一次。' }, say: e => `${e.problem.a1} ＋ ${e.problem.a2} ＝ ${e.problem.ch}，要找 ${e.problem.ch} 元。` }),
      cStep(3, { title: '點一點', ask: '店員找的錢對不對？', id: 'check', fixed: true, hints: ['數一數店員找的錢。', '和要找的錢比一比。', '少了要說，多了要還給店員。'], think: '老師數一數店員找的錢，和要找的錢比一比。', together: '一起點：對不對？',
        figure: ctx => `<p class="lf-tag">店員找你</p>${pile(ctx.problem.got)}`, q: ctx => `應該找 ${ctx.problem.ch} 元。店員找的對不對？`, opts: () => [['ok', '對'], ['short', '少找了'], ['over', '多找了']], ans: ctx => ctx.problem.kind,
        wrong: () => ({ obs: 'changeWrong', msg: '數一數店員找的錢，再和要找的錢比。' }), say: e => e.problem.kind === 'ok' ? `店員找 ${e.problem.gotN} 元，對。` : `店員只找 ${e.problem.gotN} 元，少找了。` })
    ],
    done: ctx => `從 ${ctx.problem.p} 往上數到 ${ctx.problem.B}，要找 ${ctx.problem.ch} 元。`, chant: '找錢四步：付了多少、往上數、一共要找多少、點一點找的錢。', transfer: '想一想：買東西拿到找錢，要不要點一點？'
  });

  A.register('moChangeSub', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const bills = fromLevel({ easy: [100], standard: [100, 500, 1000], challenge: [500, 1000] }, level);
      for (;;) { const B = any(rand, bills), p = level === 'challenge' ? rnd(rand, Math.floor(B / 4), B - 3) : rnd(rand, 2, B / 10 - 1) * 10;
        if (level !== 'challenge' && borrows(B, p) > 1) continue; if (level === 'challenge' && p % 10 === 0) continue;
        const t = any(rand, BIGS); return { B, p, ch: B - p, t, dims: [B, p], prompt: `買${t[0]} ${p} 元，付了 1 張 ${B} 元。要找多少元？` }; } },
    planFigure: ctx => `${tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.p)}<div class="mo-show">${coin(ctx.problem.B)}</div>`,
    steps: [
      cStep(0, { title: '選方法', ask: '找錢用什麼算？', id: 'op', fixed: true, hints: ['付的錢比價錢多。', '多出來的要找回來。', '付的錢 － 價錢。'], think: '老師想：找錢是付的錢減掉價錢。', together: '一起選：用什麼算？', pre: prompt, figure: ctx => A.get('moChangeSub').planFigure(ctx),
        q: () => '找錢用什麼算？', opts: () => OPN, ans: () => '-', wrong: () => ({ obs: 'opWrong', msg: '找錢：付的錢減掉價錢。' }), say: () => '用減的。' }),
      nStep(1, { title: '算出來', ask: '付的錢 － 價錢。', id: 'ch', hints: ['用直式減，個位對個位。', '不夠減要向左邊借。', '也可以從價錢往上數到付的錢。'], think: '老師用直式減；也可以從價錢往上數。', together: '一起算：要找多少？', pre: placeAid, figure: ctx => colHtml(ctx.problem.B, ctx.problem.p, '-'),
        label: ctx => `${ctx.problem.B} － ${ctx.problem.p} ＝ ？`, ans: ctx => ctx.problem.ch, wrong: (ctx, v) => v === I.bigMinusSmall(ctx.problem.B, ctx.problem.p) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : { obs: 'changeWrong', msg: '再算一次，或從價錢往上數。' }, say: e => `${e.problem.B} － ${e.problem.p} ＝ ${e.problem.ch}。` }),
      nStep(2, { title: '檢查', ask: '找的錢 ＋ 價錢 ＝ 付的錢嗎？', id: 'back', hints: ['用加法驗算。', '找的錢加上價錢。', '要等於付的錢。'], think: '老師驗算：找的錢加價錢，要等於付的錢。', together: '一起驗算：是多少？', figure: ctx => colHtml(ctx.problem.ch, ctx.problem.p, '+', { head: false }),
        label: ctx => `${ctx.problem.ch} ＋ ${ctx.problem.p} ＝ ？`, ans: ctx => ctx.problem.B, say: e => `${e.problem.ch} ＋ ${e.problem.p} ＝ ${e.problem.B}，找對了。` })
    ],
    done: ctx => `要找 ${ctx.problem.ch} 元。`, chant: '算找錢：付的錢減價錢，再用加法驗算。', transfer: '想一想：付 1000 元買 650 元的東西，可以怎麼算找錢？'
  });

  const FIX = [['keep', '收好，說謝謝'], ['tell', '有禮貌地告訴店員：好像少找了'], ['back', '把多找的錢還給店員']];
  A.register('moCheckChange', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const bills = fromLevel({ easy: [50], standard: [50, 100], challenge: [100, 500] }, level);
      for (;;) { const B = any(rand, bills), p = rnd(rand, Math.max(2, Math.floor(B / 5)), B - 3), ch = B - p, kind = ['ok', 'short', 'over'][(i + rnd(rand, 0, 2)) % 3];
        const give = greedy(ch, DEN.filter(d => d < B)); let got = { ...give };
        if (kind === 'short') { const s = kinds(got).slice(-1)[0]; got[s]--; if (!got[s]) delete got[s]; if (!pieces(got)) continue; }
        if (kind === 'over') { const s = ch >= 10 ? 10 : 1; got[s] = (got[s] || 0) + 1; }
        const t = any(rand, ITEMS); return { B, p, ch, got, gotN: total(got), kind, t, dims: [B, p], prompt: `買${t[0]} ${p} 元，付了 ${B} 元。店員找你這些錢。` }; } },
    planFigure: ctx => `<p class="lf-tag">店員找你</p>${pile(ctx.problem.got)}`,
    steps: [
      nStep(0, { title: '應該找多少', ask: '應該找幾元？', id: 'ch', hints: ['付的錢比價錢多多少？', '從價錢往上數到付的錢。', '或是付的錢 － 價錢。'], think: '老師先算應該找多少。', together: '一起算：應該找幾元？', pre: prompt, figure: ctx => tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.p),
        label: () => '應該找幾元？', ans: ctx => ctx.problem.ch, wrong: () => ({ obs: 'changeWrong', msg: '從價錢往上數到付的錢。' }), say: e => `應該找 ${e.problem.ch} 元。` }),
      nStep(1, { title: '數一數', ask: '店員找了幾元？', id: 'got', hints: ['先數大的。', '再接著數小的。', '數完就是店員找的錢。'], think: '老師數一數店員找的錢。', together: '一起數：店員找了幾元？', figure: ctx => A.get('moCheckChange').planFigure(ctx),
        label: () => '店員找了幾元？', ans: ctx => ctx.problem.gotN, wrong: (ctx, v) => v === pieces(ctx.problem.got) ? { obs: 'coinsAsMoney', msg: '這是有幾個。照錢上的數字數。' } : { obs: 'mixCount', msg: '先數大的，再接著數小的。' }, say: e => `店員找了 ${e.problem.gotN} 元。` }),
      cStep(2, { title: '比一比', ask: '店員找的錢對不對？', id: 'cmp', fixed: true, hints: ['應該找的和店員找的比一比。', '一樣就是對。', '少了是少找，多了是多找。'], think: '老師把兩個數比一比。', together: '一起比：對不對？', figure: ctx => A.get('moCheckChange').planFigure(ctx),
        q: ctx => `應該找 ${ctx.problem.ch} 元，店員找 ${ctx.problem.gotN} 元。`, opts: () => [['ok', '對'], ['short', '少找了'], ['over', '多找了']], ans: ctx => ctx.problem.kind, wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => ({ ok: '對。', short: '少找了。', over: '多找了。' })[e.problem.kind] }),
      cStep(3, { title: '怎麼做', ask: '接下來要怎麼做？', id: 'fix', fixed: true, hints: ['找對了就收好。', '少找了，要有禮貌地說。', '多找了，要誠實還給店員。'], think: '老師想：找對就收好；少了有禮貌地說；多了誠實還給店員。', together: '一起決定：怎麼做？', figure: () => '',
        q: () => '接下來要怎麼做？', opts: () => FIX, ans: ctx => ({ ok: 'keep', short: 'tell', over: 'back' })[ctx.problem.kind], wrong: () => ({ obs: 'wrongChoice', msg: '想一想：找的錢是對的、少的，還是多的？' }), say: e => FIX.find(f => f[0] === ({ ok: 'keep', short: 'tell', over: 'back' })[e.problem.kind])[1] + '。' })
    ],
    done: ctx => `應該找 ${ctx.problem.ch} 元，店員找 ${ctx.problem.gotN} 元，${({ ok: '找對了', short: '少找了', over: '多找了' })[ctx.problem.kind]}。`, chant: '點找錢：先算應該找多少，再數店員找的，比一比；少了要說，多了還給店員。', transfer: '想一想：店員多找你錢，為什麼要還給店員？'
  });

  // ---------- 單元 6：去買東西 ----------
  A.register('moEnough', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const [set, maxT] = fromLevel({ easy: [[10, 5, 1], 50], standard: [[50, 10, 5, 1], 100], challenge: [[500, 100, 50, 10], 1000] }, level);
      for (;;) { const c = {}; set.forEach(d => { const k = rnd(rand, 0, d >= 50 ? 1 : 4); if (k) c[d] = k; }); const w = total(c); if (kinds(c).length < 2 || w > maxT || w < 10) continue;
        const enough = i % 2 === 0, p = enough ? rnd(rand, Math.max(2, Math.floor(w / 2)), w) : rnd(rand, w + 1, Math.min(maxT, w + Math.max(5, Math.floor(w / 3)))); if (p === w && rand() < 0.7) continue;
        const t = any(rand, level === 'challenge' ? BIGS : ITEMS); return { c, w, p, t, ok: w >= p, d: Math.abs(w - p), dims: [w, p], prompt: `錢包裡有這些錢，想買${t[0]} ${p} 元。錢夠不夠？` }; } },
    planFigure: ctx => `${tag(ctx.problem.t[1] + ' ' + ctx.problem.t[0], ctx.problem.p)}<p class="lf-tag">錢包裡有</p>${pile(ctx.problem.c)}`,
    steps: [
      nStep(0, { title: '數錢包', ask: '錢包裡一共幾元？', id: 'w', hints: ['先數大的。', '再接著數小的。', '數完就是錢包裡的錢。'], think: '老師先把錢包裡的錢數一數。', together: '一起數：一共幾元？', pre: prompt, figure: ctx => A.get('moEnough').planFigure(ctx),
        label: () => '錢包裡一共幾元？', ans: ctx => ctx.problem.w, wrong: (ctx, v) => v === pieces(ctx.problem.c) ? { obs: 'coinsAsMoney', msg: '這是有幾個。照錢上的數字數。' } : { obs: 'mixCount', msg: '先數大的，再接著數小的。' }, say: e => `一共 ${e.problem.w} 元。` }),
      cStep(1, { title: '夠不夠', ask: '和價錢比一比。', id: 'ok', fixed: true, hints: ['錢包的錢比價錢多（或一樣）：夠。', '錢包的錢比較少：不夠。', '比一比兩個數。'], think: '老師把錢包的錢和價錢比一比。', together: '一起比：夠不夠？', figure: ctx => A.get('moEnough').planFigure(ctx),
        q: ctx => `有 ${ctx.problem.w} 元，價錢 ${ctx.problem.p} 元。夠不夠？`, opts: () => [['yes', '夠'], ['no', '不夠']], ans: ctx => ctx.problem.ok ? 'yes' : 'no', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: e => e.problem.ok ? '夠。' : '不夠。' }),
      nStep(2, { title: '剩多少、差多少', ask: '大的減小的。', id: 'd', hints: ['夠：錢包的錢 － 價錢，是買完剩下的。', '不夠：價錢 － 錢包的錢，是還差的。', '也可以從小的往上數到大的。'], think: '老師用大的減小的，算剩多少或差多少。', together: '一起算：剩（差）多少？', figure: ctx => A.get('moEnough').planFigure(ctx),
        label: ctx => ctx.problem.ok ? '買完還剩幾元？' : '還差幾元？', ans: ctx => ctx.problem.d, say: e => `${e.problem.ok ? '剩' : '差'} ${e.problem.d} 元。` })
    ],
    done: ctx => `有 ${ctx.problem.w} 元，${ctx.problem.ok ? `夠，買完剩 ${ctx.problem.d} 元` : `不夠，差 ${ctx.problem.d} 元`}。`, chant: '錢夠不夠：先數錢包，再和價錢比，算剩多少或差多少。', transfer: '想一想：出門買東西前，為什麼要先數錢包？'
  });

  const PAYS = [50, 100, 500, 1000];
  A.register('moTwo', {
    methods, reasons,
    makeProblem: (level, i, rand = Math.random) => { const [lo, hi, maxT] = fromLevel({ easy: [5, 40, 90], standard: [12, 80, 100], challenge: [60, 480, 1000] }, level);
      for (;;) { const [a, b] = [any(rand, ITEMS), any(rand, level === 'challenge' ? BIGS : ITEMS)]; if (a === b) continue; const p1 = rnd(rand, lo, hi), p2 = rnd(rand, lo, hi), s = p1 + p2;
        if (s > maxT || carries(p1, p2) > 2) continue; const B = PAYS.find(x => x >= s) ; if (!B || B === s) continue; if (level !== 'challenge' && borrows(B, s) > 1) continue;
        return { a, b, p1, p2, s, B, ch: B - s, dims: [p1, p2], prompt: `買${a[0]} ${p1} 元和${b[0]} ${p2} 元。` }; } },
    planFigure: ctx => tags([[ctx.problem.a[1] + ' ' + ctx.problem.a[0], ctx.problem.p1], [ctx.problem.b[1] + ' ' + ctx.problem.b[0], ctx.problem.p2]]),
    steps: [
      nStep(0, { title: '一共多少', ask: '兩樣一共幾元？', id: 's', hints: ['兩樣的錢合起來。', '用加的，個位對個位。', '滿 10 要進位。'], think: '老師把兩樣的錢加起來。', together: '一起加：一共幾元？', pre: ctx => `${prompt(ctx)}${placeAid(ctx)}`, figure: ctx => A.get('moTwo').planFigure(ctx),
        label: ctx => `${ctx.problem.p1} ＋ ${ctx.problem.p2} ＝ ？`, ans: ctx => ctx.problem.s, wrong: (ctx, v) => v === I.noCarrySum(ctx.problem.p1, ctx.problem.p2) ? { obs: 'noCarry', msg: '滿 10 要進位。' } : null, say: e => `一共 ${e.problem.s} 元。` }),
      cStep(1, { title: '付哪一個', ask: '付哪一個最剛好？', id: 'B', fixed: true, hints: ['要付的錢要比一共的錢多（或一樣）。', '太小不夠；太大要找很多。', '選夠用、又最小的那一個。'], think: '老師選夠用、又最小的錢。', together: '一起選：付哪一個？', figure: () => '',
        q: ctx => `一共 ${ctx.problem.s} 元，付哪一個最剛好？`, opts: () => PAYS.map(d => [String(d), coin(d, { small: true })]), ans: ctx => String(ctx.problem.B),
        wrong: (ctx, v) => Number(v) < ctx.problem.s ? { obs: 'payShort', msg: '這個不夠付。' } : { obs: 'payOver', msg: '這個夠，可是還有比較小、也夠的。' }, say: e => `付 ${e.problem.B} 元。` }),
      nStep(2, { title: '找多少', ask: '要找幾元？', id: 'ch', hints: ['付的錢 － 一共的錢。', '也可以從一共的錢往上數到付的錢。', '不夠減要借。'], think: '老師從一共的錢往上數到付的錢，算要找多少。', together: '一起算：找幾元？', figure: ctx => colHtml(ctx.problem.B, ctx.problem.s, '-', { head: false }),
        label: ctx => `付 ${ctx.problem.B} 元，要找幾元？`, ans: ctx => ctx.problem.ch, wrong: (ctx, v) => v === I.bigMinusSmall(ctx.problem.B, ctx.problem.s) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : { obs: 'changeWrong', msg: '從一共的錢往上數到付的錢。' }, say: e => `${e.problem.B} － ${e.problem.s} ＝ ${e.problem.ch}，要找 ${e.problem.ch} 元。` })
    ],
    done: ctx => `一共 ${ctx.problem.s} 元，付 ${ctx.problem.B} 元，找 ${ctx.problem.ch} 元。`, chant: '買兩樣：先加起來，選夠用又最小的錢付，再算找多少。', transfer: '想一想：買兩樣東西，可以先估一估大約多少嗎？'
  });

  // 6-3 購物流程（核心）
  const AFTER = [['ok', '點一點找的錢、拿發票，收進錢包'], ['pocket', '不用看，塞進口袋就走'], ['leave', '找的錢放在櫃台，不拿']];
  A.register('moShopFlow', {
    methods: [['mark', '🧺 一步一步買'], ['self', '🧠 先自己想，需要時看提示']], reasons: [['flow', '照購物的順序'], ['check', '算完檢查'], ['hint', '看提示']],
    makeProblem: (level, i, rand = Math.random) => { const [lo, hi, maxT] = fromLevel({ easy: [5, 40, 90], standard: [12, 80, 100], challenge: [40, 400, 1000] }, level);
      for (;;) { const a = any(rand, ITEMS), b = any(rand, level === 'challenge' ? BIGS : ITEMS); if (a === b) continue; const p1 = rnd(rand, lo, hi), p2 = rnd(rand, lo, hi), s = p1 + p2, B = PAYS.find(x => x >= s);
        if (s > maxT || !B || B === s || carries(p1, p2) > 2 || (level !== 'challenge' && borrows(B, s) > 1)) continue;
        return { a, b, p1, p2, s, B, ch: B - s, dims: [p1, p2, B], prompt: `媽媽請你去超市買${a[0]}和${b[0]}，給你 1 ${unitOf(B)} ${B} 元。` }; } },
    planFigure: ctx => `<div class="mo-list" aria-label="購物清單"><p>📝 購物清單</p><ul><li>${esc(ctx.problem.a[0])}</li><li>${esc(ctx.problem.b[0])}</li></ul></div>`,
    steps: [
      cStep(0, { title: '列清單', ask: '出門前先做什麼？', id: 'list', hints: ['要買的東西很多時，容易忘記。', '先寫下來，就不會忘。', '寫下要買的東西，叫做購物清單。'], think: '老師出門前先把要買的東西寫成清單。', together: '一起想：出門前先做什麼？', pre: prompt, figure: ctx => A.get('moShopFlow').planFigure(ctx),
        q: () => '出門前先做什麼？', opts: () => [['list', '把要買的東西寫成清單，帶好錢'], ['go', '什麼都不用想，直接去'], ['more', '看到喜歡的都買']], ans: () => 'list', wrong: () => ({ msg: '先寫清單、帶好錢，就不會忘記，也不會亂買。' }), say: () => '先寫清單、帶好錢。' }),
      nStep(1, { title: '找東西、看價錢', ask: '清單上的東西一共多少錢？', id: 's', hints: ['在架子上找到清單上的東西。', '看價目牌，兩樣加起來。', '個位對個位，滿 10 要進位。'], think: '老師找到東西、看價目牌，把兩樣的錢加起來。', together: '一起加：一共多少錢？',
        figure: ctx => tags([[ctx.problem.a[1] + ' ' + ctx.problem.a[0], ctx.problem.p1], [ctx.problem.b[1] + ' ' + ctx.problem.b[0], ctx.problem.p2]]), label: () => '一共多少元？', ans: ctx => ctx.problem.s, wrong: (ctx, v) => v === I.noCarrySum(ctx.problem.p1, ctx.problem.p2) ? { obs: 'noCarry', msg: '滿 10 要進位。' } : null, say: e => `一共 ${e.problem.s} 元。` }),
      cStep(2, { title: '錢夠不夠', ask: '帶的錢夠不夠？', id: 'ok', fixed: true, hints: ['帶的錢和一共的錢比一比。', '帶的錢比較多（或一樣）就夠。', '不夠就要少買一樣。'], think: '老師把帶的錢和一共的錢比一比。', together: '一起比：夠不夠？', figure: ctx => `<div class="mo-show">${coin(ctx.problem.B)}</div>`,
        q: ctx => `帶了 ${ctx.problem.B} 元，一共 ${ctx.problem.s} 元。夠不夠？`, opts: () => [['yes', '夠，可以去排隊付錢'], ['no', '不夠']], ans: () => 'yes', wrong: () => ({ obs: 'compareWrong', msg: '再比一次兩個數。' }), say: () => '夠，去排隊付錢。' }),
      nStep(3, { title: '付錢', ask: '付了錢，要找多少？', id: 'ch', hints: ['付的錢 － 一共的錢。', '也可以從一共的錢往上數。', '算好再等店員找錢。'], think: '老師排隊付錢，先算好要找多少。', together: '一起算：要找多少？', figure: ctx => colHtml(ctx.problem.B, ctx.problem.s, '-', { head: false }),
        label: ctx => `付 ${ctx.problem.B} 元，要找幾元？`, ans: ctx => ctx.problem.ch, wrong: (ctx, v) => v === I.bigMinusSmall(ctx.problem.B, ctx.problem.s) ? { obs: 'subSmallFromBig', msg: '不夠減要借，不能倒過來減。' } : { obs: 'changeWrong', msg: '從一共的錢往上數到付的錢。' }, say: e => `要找 ${e.problem.ch} 元。` }),
      cStep(4, { title: '收好', ask: '拿到找錢以後，要做什麼？', id: 'after', fixed: true, hints: ['找的錢要點一點。', '發票（收據）也要拿。', '收進錢包，才不會掉。'], think: '老師點一點找的錢、拿發票，再收進錢包。', together: '一起想：拿到找錢以後做什麼？', figure: () => big('🧾 👛'),
        q: () => '拿到找錢以後，要做什麼？', opts: () => AFTER, ans: () => 'ok', wrong: () => ({ msg: '要點一點、拿發票，收好才不會掉。' }), say: () => '點一點找的錢、拿發票，收進錢包。' })
    ],
    done: ctx => `買${ctx.problem.a[0]}和${ctx.problem.b[0]}，一共 ${ctx.problem.s} 元，付 ${ctx.problem.B} 元，找 ${ctx.problem.ch} 元，收好了。`, chant: '購物流程：列清單、看價錢、錢夠不夠、付錢算找錢、點一點收好。', transfer: '想一想：下次去超市，你會怎麼準備？'
  });
})();

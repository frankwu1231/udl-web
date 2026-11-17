'use strict';
// 第 32 版：時間概念教材包單元 8（8-1 在 act-time.js）與單元 9「時間小管家」的其他活動。圖形和計算在 act-time.js（window.timeFig）。
// 單元 9 跨領域：特殊需求領域生活管理（特生4-sA-1 規劃與管理自己的生活、特生J-sP-3 各類交通工具資訊的辨識與使用、特生3-sP-4 消費場所）、社會領域 Da-Ⅱ-1。
// 時刻表、站名、店名都是虛構的練習資料，不是真實的班次。
(() => {
  const A = window.areaActs, U = A.util, { esc } = U, T = window.timeFig;
  const { rnd, any, toMin, split, hmText, digital, to12, periodOf, say12, durText, base100Diff, clockSVG, digiHtml, clockPair, lineSVG, ttHtml, convAid, nStep, cStep, hmStep, prompt, shown, ql } = T;
  const methods = [['mark', '🧮 一步一步算'], ['self', '🧠 先自己想，需要時看提示']];
  const reasons = [['line', '畫時間線'], ['sixty', '記得 60 進位'], ['hint', '看提示']];
  const hm12 = t => { const [h, m] = split(t); return [to12(h), m]; };

  // =============== 8-2 跨午 ===============
  A.register('tmNoon', {
    methods, makeProblem: (level, i, rand = Math.random) => { const step = level === 'easy' ? 60 : level === 'standard' ? 5 : 1, h1 = rnd(rand, 8, 11), h2 = rnd(rand, 1, 4);
      const m1 = step === 60 ? 0 : step * rnd(rand, 1, Math.floor(59 / step)), m2 = step === 60 ? 0 : step * rnd(rand, 0, Math.floor(59 / step));
      const s = toMin(h1, m1), e = toMin(h2 + 12, m2), c = any(rand, ['校外教學', '園遊會', '參觀博物館', '爬山']);
      return { h1, m1, h2, m2, s, e, total: e - s, c, dims: [h1, m1, h2, m2], prompt: `${c}從上午 ${hmText(h1, m1)}到下午 ${hmText(h2, m2)}，經過多久？` }; },
    planFigure: ctx => clockPair(clockSVG(ctx.problem.h1, ctx.problem.m1, { aria: '開始（上午）' }), clockSVG(ctx.problem.h2, ctx.problem.m2, { aria: '結束（下午）' })),
    steps: [
      nStep(0, { title: '換成 24 時制', ask: '下午的時刻要加 12', id: 'h24', hints: ['上午和下午的數字不能直接比。', '下午的時刻加 12，換成 24 時制。', `例如下午 2 時是 14 時。`], think: '老師先把下午的時刻換成 24 時制：加 12。', together: '一起換：是幾時？', pre: prompt,
        label: ctx => `下午 ${ctx.problem.h2} 時，用 24 時制是幾時？`, ans: ctx => ctx.problem.h2 + 12, wrong: (ctx, v) => v === ctx.problem.h2 ? { obs: 'plus12', msg: '下午的時刻要加 12。' } : null, say: ex => `下午 ${ex.problem.h2} 時是 ${ex.problem.h2 + 12} 時。` }),
      hmStep(1, { title: '先跳到中午 12 時', ask: '到中午 12 時經過多久？', id: 'a', dur: true, hints: ['從開始跳到中午 12 時。', '先跳到下一個整點，再一小時一小時跳。', '1 小時 60 分鐘。'], think: '老師先從上午跳到中午 12 時。', together: '一起跳：到中午經過多久？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.s - 10, p.e + 10, { marks: [p.s, 720, p.e], fmt: say12, jumps: shown(ctx, 1) ? [[p.s, 720, ql(ctx, 1, durText(720 - p.s))]] : [], aria: '時間線：開始、中午 12 時、結束' }); },
        label: ctx => `上午 ${hmText(ctx.problem.h1, ctx.problem.m1)}到中午 12 時，經過幾小時幾分鐘？`, ans: ctx => split(720 - ctx.problem.s), say: ex => `到中午經過 ${durText(720 - ex.problem.s)}。` }),
      hmStep(2, { title: '再跳到結束', ask: '中午 12 時到結束經過多久？', id: 'b', dur: true, hints: ['從中午 12 時跳到結束。', '中午 12 時到下午 1 時是 1 小時。', '下午幾時幾分，就是過了幾小時幾分鐘。'], think: '老師再從中午 12 時跳到結束。', together: '一起跳：中午以後經過多久？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.s - 10, p.e + 10, { marks: [p.s, 720, p.e], fmt: say12, jumps: [[p.s, 720, durText(720 - p.s)], ...(shown(ctx, 2) ? [[720, p.e, ql(ctx, 2, durText(p.e - 720))]] : [])] }); },
        label: ctx => `中午 12 時到下午 ${hmText(ctx.problem.h2, ctx.problem.m2)}，經過幾小時幾分鐘？`, ans: ctx => [ctx.problem.h2, ctx.problem.m2], say: ex => `中午以後經過 ${durText(ex.problem.e - 720)}。` }),
      hmStep(3, { title: '加起來', ask: '兩段加起來', id: 'tot', dur: true, aid: convAid, hints: ['兩段的時間加起來。', '分鐘滿 60 換 1 小時。', '不能直接用下午的數字減上午的數字。'], think: '老師把兩段加起來，分鐘滿 60 換成 1 小時。', together: '一起加：一共多久？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.s - 10, p.e + 10, { marks: [p.s, 720, p.e], fmt: say12, jumps: [[p.s, 720, durText(720 - p.s)], [720, p.e, durText(p.e - 720)]] }); },
        label: () => '一共經過幾小時幾分鐘？', ans: ctx => split(ctx.problem.total),
        wrong: (ctx, [a]) => a === ctx.problem.h1 - ctx.problem.h2 || a === Math.abs(ctx.problem.h2 - ctx.problem.h1) ? { obs: 'noonCross', msg: '跨過中午，不能直接用下午的數字和上午的數字相減。先跳到中午 12 時。' } : { msg: '把兩段加起來。' }, say: ex => `一共 ${durText(ex.problem.total)}。` })
    ],
    reasons, done: ctx => `${ctx.problem.c}經過 ${durText(ctx.problem.total)}。`, chant: '跨午：先跳到中午 12 時，再跳到下午；或下午加 12 再算。', transfer: '想一想：上午 10 時到下午 2 時，經過幾小時？'
  });

  // =============== 8-3 跨日 ===============
  A.register('tmMidnight', {
    methods, makeProblem: (level, i, rand = Math.random) => { const step = level === 'easy' ? 60 : level === 'standard' ? 30 : 5, h1 = rnd(rand, 8, 11), h2 = rnd(rand, 5, 7);
      const m1 = step === 60 ? 0 : step * rnd(rand, 0, Math.floor(59 / step)), m2 = step === 60 ? 0 : step * rnd(rand, 0, Math.floor(59 / step)), s = toMin(h1 + 12, m1), e = 1440 + toMin(h2, m2);
      return { h1, m1, h2, m2, s, e, total: e - s, dims: [h1, m1, h2, m2], prompt: `小明晚上 ${hmText(h1, m1)}睡覺，第二天早上 ${hmText(h2, m2)}起床。小明睡了多久？` }; },
    planFigure: () => '<p class="fm-big">🌙 → ☀️</p>',
    steps: [
      hmStep(0, { title: '跳到半夜 12 時', ask: '晚上到半夜 12 時（0 時）經過多久？', id: 'a', dur: true, hints: ['一天的最後是半夜 12 時，也就是 24 時（0 時）。', '晚上的時刻換成 24 時制：加 12。', '24 時減掉睡覺的時刻。'], think: '老師先從晚上跳到半夜 12 時，那時是新的一天的 0 時。', together: '一起跳：到半夜經過多久？', pre: prompt,
        figure: ctx => { const p = ctx.problem; return lineSVG(p.s - 10, p.e + 10, { marks: [p.s, 1440, p.e], fmt: t => t === 1440 ? '半夜 12 時' : say12(t), jumps: shown(ctx, 0) ? [[p.s, 1440, ql(ctx, 0, durText(1440 - p.s))]] : [], aria: '時間線：睡覺、半夜 12 時、起床' }); },
        label: ctx => `晚上 ${hmText(ctx.problem.h1, ctx.problem.m1)}到半夜 12 時，經過幾小時幾分鐘？`, ans: ctx => split(1440 - ctx.problem.s), say: ex => `到半夜 12 時經過 ${durText(1440 - ex.problem.s)}。` }),
      hmStep(1, { title: '再跳到早上', ask: '0 時到早上經過多久？', id: 'b', dur: true, hints: ['半夜 12 時就是 0 時。', '0 時到早上幾時幾分，就是經過幾小時幾分鐘。', '看起床的時刻。'], think: '老師從 0 時跳到早上起床。', together: '一起跳：0 時以後經過多久？',
        label: ctx => `半夜 12 時（0 時）到早上 ${hmText(ctx.problem.h2, ctx.problem.m2)}，經過幾小時幾分鐘？`, ans: ctx => [ctx.problem.h2, ctx.problem.m2], say: ex => `再經過 ${durText(ex.problem.e - 1440)}。` }),
      hmStep(2, { title: '加起來', ask: '兩段加起來', id: 'tot', dur: true, aid: convAid, hints: ['兩段加起來。', '分鐘滿 60 換 1 小時。', '跨過半夜，不能直接相減。'], think: '老師把兩段加起來。', together: '一起加：睡了多久？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.s - 10, p.e + 10, { marks: [p.s, 1440, p.e], fmt: t => t === 1440 ? '0 時' : say12(t), jumps: [[p.s, 1440, durText(1440 - p.s)], [1440, p.e, durText(p.e - 1440)]] }); },
        label: () => '一共睡了幾小時幾分鐘？', ans: ctx => split(ctx.problem.total),
        wrong: (ctx, [a]) => [ctx.problem.h1 - ctx.problem.h2, ctx.problem.h1 + 12 - ctx.problem.h2].includes(a) ? { obs: 'dayCross', msg: '跨過半夜，要先跳到 0 時，不能直接相減。' } : { msg: '把兩段加起來。' }, say: ex => `一共睡了 ${durText(ex.problem.total)}。` })
    ],
    reasons, done: ctx => `睡了 ${durText(ctx.problem.total)}。`, chant: '跨日：先跳到半夜 12 時（0 時），再跳到第二天。', transfer: '想一想：你昨天晚上睡了幾小時？'
  });

  // =============== 8-4 求開始或結束的時刻 ===============
  const FIND_CTX = [['電影', '演'], ['游泳課', '上'], ['郊遊', '玩'], ['烤蛋糕', '烤'], ['球賽', '比']];
  A.register('tmFind', {
    methods, makeProblem: (level, i, rand = Math.random) => { const kind = i % 2 ? 'start' : 'end', c = any(rand, FIND_CTX), pm = rand() < 0.5;
      let s, d; do { d = level === 'easy' ? 5 * rnd(rand, 4, 10) : level === 'standard' ? rnd(rand, 15, 90) : rnd(rand, 40, 150); s = toMin(rnd(rand, pm ? 13 : 8, pm ? 15 : 10), level === 'easy' ? 5 * rnd(rand, 0, 11) : rnd(rand, 0, 59)); } while ((s % 60) + (d % 60) < 60 && level !== 'easy');
      const e = s + d;
      return { kind, c, s, e, d, dims: [s, d], prompt: kind === 'end' ? `${c[0]}${say12(s)}開始，${c[1]}了 ${durText(d)}。幾時幾分結束？` : `${c[0]}${c[1]}了 ${durText(d)}，${say12(e)}結束。幾時幾分開始？` }; },
    planFigure: () => '<p class="fm-big">⏰ ± ⏳ ＝ ⏰</p>',
    steps: [
      cStep(0, { title: '看題目', ask: '要找開始、結束，還是經過多久？', id: 'find', fixed: true, hints: ['讀最後一句：問什麼？', '經過多久題目已經告訴你了。', '要找的是一個時刻。'], think: '老師讀最後一句：要找的是時刻。', together: '一起讀：找什麼？', pre: prompt,
        q: () => '題目要你找什麼？', opts: () => [['end', '結束的時刻'], ['start', '開始的時刻'], ['dur', '經過多久']], ans: ctx => ctx.problem.kind,
        wrong: (ctx, a) => a === 'dur' ? { obs: 'pointVsDuration', msg: '經過多久題目已經告訴你了，要找的是時刻。' } : { msg: '再讀一次最後一句。' }, say: ex => ex.problem.kind === 'end' ? '要找結束的時刻。' : '要找開始的時刻。' }),
      hmStep(1, { title: '往前或往回跳', ask: '找結束往後跳；找開始往回跳', id: 'ans', aid: convAid, hints: ['找結束：從開始往後跳。找開始：從結束往回跳。', '先跳整小時，再跳分鐘。', '分鐘超過 60 換 1 小時；不夠減，借 1 小時當 60 分鐘。'],
        think: '老師在時間線上跳：先跳整小時，再跳分鐘，記得 60 進位。', together: '一起跳：是幾時幾分？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.s - 10, p.e + 10, { marks: p.kind === 'end' ? [p.s, p.e] : [p.s, p.e], fmt: t => (p.kind === 'end' ? t === p.e : t === p.s) && !shown(ctx, 1) ? '？' : say12(t), jumps: [[p.s, p.e, durText(p.d)]] }); },
        label: ctx => ctx.problem.kind === 'end' ? '幾時幾分結束？（用 12 時制，例如下午 3 時 20 分填 3 和 20）' : '幾時幾分開始？（用 12 時制）', ans: ctx => hm12(ctx.problem.kind === 'end' ? ctx.problem.e : ctx.problem.s),
        wrong: (ctx, [a, b]) => { const p = ctx.problem, other = hm12(p.kind === 'end' ? p.s - p.d : p.e + p.d); return a === other[0] && b === other[1] ? { msg: p.kind === 'end' ? '找結束要往後跳（加）。' : '找開始要往回跳（減）。' } : { msg: '先跳整小時，再跳分鐘。' }; },
        say: ex => ex.problem.kind === 'end' ? `${say12(ex.problem.e)}結束。` : `${say12(ex.problem.s)}開始。` }),
      cStep(2, { title: '上午還是下午', ask: '跳完以後，是上午還是下午？', id: 'pd', fixed: true, hints: ['看跳完的時刻有沒有過中午 12 時。', '12 時以前是上午，以後是下午。', '可以換成 24 時制看看。'], think: '老師看跳完的時刻在中午以前還是以後。', together: '一起看：上午還是下午？',
        q: () => '答案是上午還是下午？', opts: () => [['上午', '上午'], ['下午', '下午']], ans: ctx => periodOf(split(ctx.problem.kind === 'end' ? ctx.problem.e : ctx.problem.s)[0]) === '上午' ? '上午' : '下午', say: ex => `是${periodOf(split(ex.problem.kind === 'end' ? ex.problem.e : ex.problem.s)[0]) === '上午' ? '上午' : '下午'}。` })
    ],
    reasons, done: ctx => ctx.problem.kind === 'end' ? `${ctx.problem.c[0]}${say12(ctx.problem.e)}結束。` : `${ctx.problem.c[0]}${say12(ctx.problem.s)}開始。`, chant: '找結束往後跳，找開始往回跳；先跳整小時，再跳分鐘。', transfer: '想一想：8 時要到學校，走路要 20 分鐘，幾時幾分要出門？'
  });

  // =============== 9-1 估一估，再計時 ===============
  const EST = [['整理書包', 3, 7], ['走到福利社', 4, 9], ['洗碗', 5, 10], ['穿鞋出門', 2, 5], ['寫一頁生字', 8, 15], ['刷牙洗臉', 3, 6]];
  let tick = null, tStart = 0;
  const timerHtml = () => `<div class="tm-timer"><button type="button" id="tmTimer" data-read>⏱️ 開始計時</button> <span id="tmSecs" aria-live="polite">0 秒</span><p class="subtle" data-read>可以真的試一次：按開始，做完再按停。</p></div>`;
  const bindTimer = ctx => { const b = document.getElementById('tmTimer'); if (!b) return; clearInterval(tick); tick = null;
    b.onclick = () => { const out = document.getElementById('tmSecs');
      if (!tick) { tStart = Date.now(); b.textContent = '⏹️ 停止'; tick = setInterval(() => { if (out) out.textContent = `${Math.round((Date.now() - tStart) / 1000)} 秒`; }, 500); ctx.log('開始計時'); }
      else { clearInterval(tick); tick = null; b.textContent = '⏱️ 再計一次'; const secs = Math.round((Date.now() - tStart) / 1000); if (out) out.textContent = `${Math.floor(secs / 60)} 分 ${secs % 60} 秒`; ctx.log('停止計時', { secs }); } }; };
  A.register('tmEstimate', {
    methods, makeProblem: (level, i, rand = Math.random) => { const c = any(rand, EST), a = rnd(rand, c[1], c[2]); let e; do e = rnd(rand, Math.max(1, c[1] - 2), c[2]); while (e === a); if (i % 3 !== 2 && e > a) [e] = [Math.max(1, a - rnd(rand, 1, 3))];
      if (e === a) e = a + 1;
      return { c, e, a, gap: Math.abs(a - e), dims: [e, a], prompt: `小安估「${c[0]}」要 ${e} 分鐘，實際計時是 ${a} 分鐘。` }; },
    planFigure: ctx => clockSVG(12, 0, { sec: 20, aria: '有秒針的時鐘' }),
    steps: [
      nStep(0, { title: '差多少', ask: '估的和實際差幾分鐘？', id: 'gap', hints: ['比一比估的和實際的。', '大的減小的。', '差幾分鐘，就是估錯了多少。'], think: '老師比一比：估的和實際的差幾分鐘。', together: '一起算：差幾分鐘？', pre: ctx => `${prompt(ctx)}${timerHtml()}`, bind: bindTimer,
        label: () => '估的和實際的差幾分鐘？', ans: ctx => ctx.problem.gap, say: ex => `差 ${ex.problem.gap} 分鐘。` }),
      cStep(1, { title: '估多還是估少', ask: '實際比較久，還是比較快？', id: 'way', fixed: true, hints: ['實際的比估的多：估少了。', '實際的比估的少：估多了。', '很多人常常估少了。'], think: '老師看：實際用的時間比估的多，就是估少了。', together: '一起判斷：估多還是估少？',
        q: () => '小安是估多了，還是估少了？', opts: () => [['less', '估少了（實際比較久）'], ['more', '估多了（實際比較快）']], ans: ctx => ctx.problem.a > ctx.problem.e ? 'less' : 'more',
        wrong: ctx => ctx.problem.a > ctx.problem.e ? { obs: 'underEstimate', msg: `實際用了 ${ctx.problem.a} 分鐘，比估的 ${ctx.problem.e} 分鐘久，是估少了。` } : { msg: `實際只用了 ${ctx.problem.a} 分鐘，比估的快。` }, say: ex => ex.problem.a > ex.problem.e ? '估少了。' : '估多了。' }),
      cStep(2, { title: '下次怎麼做', ask: '下次要留幾分鐘？', id: 'next', hints: ['用實際計時的結果來安排。', '估少了，下次要多留一點。', '時間不夠，事情就會來不及。'], think: '老師說：下次照實際的時間來安排，估少了就多留一點。', together: '一起決定：下次留多久？',
        q: () => '下次要留多少時間做這件事？', opts: ctx => { const p = ctx.problem; return [['act', `至少 ${p.a} 分鐘（用實際的時間）`], ['est', `${p.e} 分鐘（照原本估的）`], ['none', '不用留時間']]; }, ans: () => 'act',
        wrong: (ctx, a) => a === 'est' && ctx.problem.e < ctx.problem.a ? { obs: 'underEstimate', msg: '照原本估的會不夠用。' } : { msg: '用實際計時的結果來安排。' }, say: ex => `下次至少留 ${ex.problem.a} 分鐘。` })
    ],
    reasons, done: ctx => `估 ${ctx.problem.e} 分鐘、實際 ${ctx.problem.a} 分鐘，下次至少留 ${ctx.problem.a} 分鐘。`, chant: '先估一估，再計時，下次照實際的時間安排。', transfer: '想一想：明天整理書包，你要留幾分鐘？'
  });

  // =============== 9-3 最晚幾點出門 ===============
  const LEAVE = [['到學校', '上學', 8, 0], ['到補習班', '上課', 17, 0], ['到電影院', '看電影', 14, 30], ['到牙醫診所', '看牙醫', 15, 0], ['到公車站', '搭車', 7, 30]];
  A.register('tmLeave', {
    methods, makeProblem: (level, i, rand = Math.random) => { const c = LEAVE[(i + rnd(rand, 0, 4)) % LEAVE.length], step = level === 'easy' ? 5 : 1, w = step * rnd(rand, Math.ceil(8 / step), Math.floor(25 / step)), p = 5 * rnd(rand, 1, 4), b = level === 'easy' ? 0 : 5;
      const Tm = toMin(c[2], c[3]) + (level === 'challenge' ? 5 * rnd(rand, 1, 5) : 0);
      return { c, w, p, b, T: Tm, leave: Tm - w - b, start: Tm - w - b - p, dims: [w, p, b], prompt: `${say12(Tm)}要${c[0]}${c[1]}。走路要 ${w} 分鐘，出門前準備要 ${p} 分鐘。${b ? `要提早 ${b} 分鐘到。` : ''}最晚幾時幾分要出門？` }; },
    planFigure: ctx => digiHtml(...split(ctx.problem.T), { period: '要到', aria: '要到的時刻' }),
    steps: [
      nStep(0, { title: '路上要多久', ask: '出門到到達要留幾分鐘？', id: 'way', hints: ['走路的時間要算。', '要提早到的時間也要算。', '準備的時間是在出門以前，先不算。'], think: '老師算：出門以後要多久才到，提早的時間也加上。', together: '一起算：路上要留幾分鐘？', pre: prompt,
        label: ctx => ctx.problem.b ? '走路加上提早到，一共幾分鐘？' : '走路要幾分鐘？', ans: ctx => ctx.problem.w + ctx.problem.b,
        wrong: (ctx, v) => ctx.problem.b && v === ctx.problem.w ? { obs: 'noBuffer', msg: '別忘了要提早到。' } : v === ctx.problem.w + ctx.problem.b + ctx.problem.p ? { msg: '準備的時間在出門以前，下一步再算。' } : null, say: ex => `路上要留 ${ex.problem.w + ex.problem.b} 分鐘。` }),
      hmStep(1, { title: '倒推出門時刻', ask: '從要到的時刻往回跳', id: 'lv', aid: convAid, hints: ['從要到的時刻往回跳。', '往回跳就是減。', '不夠減，借 1 小時當 60 分鐘。'], think: '老師從要到的時刻，往回跳路上要留的時間。', together: '一起倒推：最晚幾時幾分出門？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.start - 5, p.T + 5, { marks: [p.leave, p.T], fmt: say12, jumps: shown(ctx, 1) ? [[p.leave, p.T, `${p.w + p.b} 分`]] : [], aria: '時間線：出門到到達' }); },
        label: () => '最晚幾時幾分要出門？', ans: ctx => hm12(ctx.problem.leave),
        wrong: (ctx, [a, b]) => { const p = ctx.problem, eq = t => { const [x, y] = hm12(t); return a === x && b === y; }; return eq(p.T) ? { obs: 'departVsArrive', msg: '這是要到的時刻。出門要更早。' } : p.b && eq(p.T - p.w) ? { obs: 'noBuffer', msg: '還要再提早幾分鐘到。' } : eq(p.T + p.w + p.b) ? { obs: 'departVsArrive', msg: '出門要比到達早，要往回跳（減）。' } : { msg: '從要到的時刻往回跳。' }; },
        say: ex => `最晚${say12(ex.problem.leave)}出門。` }),
      hmStep(2, { title: '倒推開始準備', ask: '出門前還要準備多久？', id: 'st', hints: ['從出門的時刻，再往回跳準備的時間。', '往回跳就是減。', '這是最晚要開始準備的時刻。'], think: '老師從出門的時刻，再往回跳準備的時間。', together: '一起倒推：最晚幾時幾分開始準備？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.start - 5, p.T + 5, { marks: [p.start, p.leave, p.T], fmt: say12, jumps: [[p.leave, p.T, `${p.w + p.b} 分`], ...(shown(ctx, 2) ? [[p.start, p.leave, `${p.p} 分`]] : [])] }); },
        label: () => '最晚幾時幾分要開始準備？', ans: ctx => hm12(ctx.problem.start), say: ex => `最晚${say12(ex.problem.start)}開始準備。` })
    ],
    reasons, done: ctx => `最晚${say12(ctx.problem.start)}開始準備，${say12(ctx.problem.leave)}出門，${say12(ctx.problem.T)}以前到。`, chant: '倒推：從要到的時刻往回跳，先跳路上的時間，再跳準備的時間。', transfer: '想一想：明天上學，你最晚幾時幾分要出門？'
  });

  // =============== 9-4 查公車時刻表 ===============
  const STOPS = [['學校站', '圖書館站'], ['學校站', '公園站'], ['社區站', '游泳池站'], ['學校站', '醫院站']];
  A.register('tmBus', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      const [a, b] = any(rand, STOPS), ride = level === 'easy' ? 5 * rnd(rand, 2, 4) : rnd(rand, 8, 22), gap = level === 'easy' ? 20 : any(rand, [15, 20]);
      const base = level === 'easy' ? toMin(8, 0) : toMin(rnd(rand, 14, 16), 5 * rnd(rand, 0, 3)), deps = [0, 1, 2, 3, 4].map(k => base + k * gap), back = deps.map(t => t + 5 * rnd(rand, 1, 2));
      const pick = rnd(rand, 1, 3), T = deps[pick] + ride + rnd(rand, 1, gap - 1);   // 最晚可以搭第 pick 班（下一班會遲到）
      const now = deps[pick] - 5 * rnd(rand, 1, Math.floor(gap / 5));
      return { a, b, ride, gap, deps, back, pick, T, now, wait: deps[pick] - now, dims: [ride, gap, pick],
        prompt: `現在是 ${digital(...split(now))}。要從${a}坐公車到${b}，${digital(...split(T))} 以前要到。公車從${a}坐到${b}要 ${ride} 分鐘。` };
    },
    planFigure: ctx => `<p class="fm-big">🚌</p>`,
    steps: [
      cStep(0, { title: '看方向', ask: '要看哪一張時刻表？', id: 'dir', fixed: true, hints: ['先想：從哪裡出發，要到哪裡？', '時刻表上面寫著往哪裡。', '方向看錯，就會坐到反方向。'], think: '老師先看方向：從哪一站出發，往哪一站。', together: '一起找：哪一張？', pre: prompt,
        figure: ctx => { const p = ctx.problem, f = t => digital(...split(t)); return `<div class="tm-pair">${ttHtml(`往${p.b}（${p.a}發車）`, ['班次', `${p.a}開`], p.deps.map((t, k) => [`第 ${k + 1} 班`, f(t)]))}${ttHtml(`往${p.a}（${p.b}發車）`, ['班次', `${p.b}開`], p.back.map((t, k) => [`第 ${k + 1} 班`, f(t)]))}</div>`; },
        q: () => '要看哪一張時刻表？', opts: ctx => [['go', `往${ctx.problem.b}`], ['back', `往${ctx.problem.a}`]], ans: () => 'go', wrong: () => ({ obs: 'wrongDirection', msg: '這是反方向的車。要從出發的那一站開往目的地。' }), say: ex => `看「往${ex.problem.b}」那一張。` }),
      cStep(1, { title: '選班次', ask: '哪一班最晚、又不會遲到？', id: 'bus', hints: ['每一班開車的時刻，加上坐車的時間，就是到站的時刻。', '到站的時刻要在期限以前。', '在來得及的班次裡，選最晚的一班。'], think: '老師一班一班算：開車時刻加上坐車時間，看會不會遲到。', together: '一起選：搭哪一班？',
        figure: ctx => { const p = ctx.problem, f = t => digital(...split(t)); return ttHtml(`往${p.b}（坐 ${p.ride} 分鐘）`, ['班次', `${p.a}開`, ...(shown(ctx, 1) ? [`到${p.b}`] : [])], p.deps.map((t, k) => [`第 ${k + 1} 班`, f(t), ...(shown(ctx, 1) ? [f(t + p.ride)] : [])]), { col: shown(ctx, 1) && ctx.hint(1) >= 3 ? 2 : -1 }); },
        q: ctx => `${digital(...split(ctx.problem.T))} 以前要到，最晚可以搭哪一班？`, opts: ctx => ctx.problem.deps.slice(Math.max(0, ctx.problem.pick - 2), ctx.problem.pick + 2).map(t => [String(t), digital(...split(t))]), ans: ctx => String(ctx.problem.deps[ctx.problem.pick]),
        wrong: (ctx, a) => { const p = ctx.problem, t = Number(a); return t + p.ride > p.T ? { obs: 'departVsArrive', msg: `這班 ${digital(...split(t))} 開，${digital(...split(t + p.ride))} 才到，會遲到。要看「到站」的時刻。` } : { msg: '這班也來得及，可是題目問「最晚」的一班。' }; },
        say: ex => `最晚搭 ${digital(...split(ex.problem.deps[ex.problem.pick]))} 那一班，${digital(...split(ex.problem.deps[ex.problem.pick] + ex.problem.ride))} 到。` }),
      nStep(2, { title: '要等多久', ask: '現在到開車，要等幾分鐘？', id: 'wait', hints: ['從現在跳到開車的時刻。', '用減的，或在時間線上跳。', '60 進位，不夠減要借 1 小時。'], think: '老師從現在跳到開車的時刻。', together: '一起算：要等幾分鐘？',
        figure: ctx => { const p = ctx.problem, d = p.deps[p.pick]; return lineSVG(p.now - 3, d + 3, { marks: [p.now, d], jumps: shown(ctx, 2) ? [[p.now, d, ql(ctx, 2, `${p.wait} 分`)]] : [] }); },
        label: ctx => `現在 ${digital(...split(ctx.problem.now))}，到 ${digital(...split(ctx.problem.deps[ctx.problem.pick]))} 要等幾分鐘？`, ans: ctx => ctx.problem.wait,
        wrong: (ctx, v) => v === base100Diff(ctx.problem.now, ctx.problem.deps[ctx.problem.pick]) ? { obs: 'base100', msg: '直接相減是把時間當成 100 進位了。' } : null, say: ex => `要等 ${ex.problem.wait} 分鐘。` }),
      cStep(3, { title: '錯過了怎麼辦', ask: '下一班來得及嗎？', id: 'miss', fixed: true, hints: ['看下一班幾時幾分開。', '加上坐車的時間，看幾時幾分到。', '和期限比一比。'], think: '老師想：如果錯過了，下一班會不會遲到？要怎麼辦？', together: '一起想：錯過了怎麼辦？',
        q: ctx => `如果錯過這一班，搭下一班（${digital(...split(ctx.problem.deps[ctx.problem.pick + 1]))}）會怎樣？`, opts: () => [['late', '會遲到，要先跟老師或家人說'], ['ok', '不會遲到']], ans: () => 'late',
        wrong: ctx => ({ obs: 'departVsArrive', msg: `下一班 ${digital(...split(ctx.problem.deps[ctx.problem.pick + 1] + ctx.problem.ride))} 才到，超過期限了。` }), say: () => '下一班會遲到，要先跟老師或家人說。' })
    ],
    reasons, done: ctx => `搭 ${digital(...split(ctx.problem.deps[ctx.problem.pick]))} 的公車，等 ${ctx.problem.wait} 分鐘；錯過了會遲到。`, chant: '查時刻表：先看方向，再算到站時刻，選來得及的最晚一班。', transfer: '想一想：放學回家要搭幾時幾分的車？'
  });

  // =============== 9-5 放學後的行程 ===============
  const TASKS = [['寫功課', 40], ['洗澡', 20], ['看電視', 30], ['練琴', 30], ['幫忙做家事', 15], ['讀故事書', 20], ['去補習', 90], ['玩遊戲', 60], ['寫評量', 50]];
  A.register('tmPlan', {
    methods, makeProblem: (level, i, rand = Math.random) => {
      const home = toMin(16, level === 'easy' ? 0 : any(rand, [0, 30])), bed = toMin(level === 'easy' ? 21 : any(rand, [20, 21]), any(rand, [0, 30])), dinner = 30, free = bed - home - dinner, want = i % 2 === 0;
      let tasks; for (let k = 0; k < 200; k++) { tasks = [TASKS[0], ...U.shuffle(TASKS.slice(1), rand).slice(0, level === 'challenge' ? 4 : 3)]; const s = tasks.reduce((x, t) => x + t[1], 0); if ((s <= free) === want) break; }
      const sum = tasks.reduce((x, t) => x + t[1], 0);
      return { home, bed, dinner, free, tasks, sum, fits: sum <= free, hwEnd: home + tasks[0][1], dims: [free, sum],
        prompt: `小傑${say12(home)}放學到家，${say12(bed)}要上床睡覺，晚餐要 30 分鐘。放學後想做：${tasks.map(t => `${t[0]} ${t[1]} 分鐘`).join('、')}。排得下嗎？` };
    },
    planFigure: ctx => `<ul class="tm-tasks">${ctx.problem.tasks.map(t => `<li>${esc(t[0])}：${t[1]} 分鐘</li>`).join('')}</ul>`,
    steps: [
      nStep(0, { title: '要做的事一共多久', ask: '想做的事加起來', id: 'sum', hints: ['把每一件事的時間加起來。', '一件一件加，不要漏。', '可以先加成整十的。'], think: '老師把想做的事一件一件加起來。', together: '一起加：一共幾分鐘？', pre: prompt,
        figure: ctx => `<ul class="tm-tasks">${ctx.problem.tasks.map(t => `<li data-read>${esc(t[0])}：${t[1]} 分鐘</li>`).join('')}</ul>`, label: () => '想做的事一共幾分鐘？', ans: ctx => ctx.problem.sum, say: ex => `一共 ${ex.problem.sum} 分鐘。` }),
      nStep(1, { title: '有多少時間', ask: '放學到睡覺，扣掉晚餐，還有幾分鐘？', id: 'free', aid: convAid, hints: ['先算放學到睡覺經過多久。', '換成分鐘：1 小時 60 分鐘。', '再扣掉晚餐 30 分鐘。'], think: '老師先算放學到睡覺有多久，再扣掉晚餐。', together: '一起算：還有幾分鐘？',
        figure: ctx => { const p = ctx.problem; return lineSVG(p.home - 10, p.bed + 10, { marks: [p.home, toMin(18, 0), toMin(18, 30), p.bed], fmt: say12, jumps: shown(ctx, 1) ? [[p.home, p.bed, ql(ctx, 1, durText(p.bed - p.home))]] : [], aria: '時間線：放學、晚餐、睡覺' }); },
        label: () => '扣掉晚餐，還有幾分鐘可以安排？', ans: ctx => ctx.problem.free, wrong: (ctx, v) => v === ctx.problem.free + 30 ? { msg: '別忘了扣掉晚餐 30 分鐘。' } : v === base100Diff(ctx.problem.home, ctx.problem.bed) - 30 ? { obs: 'base100', msg: '1 小時是 60 分鐘，不是 100 分鐘。' } : null, say: ex => `還有 ${ex.problem.free} 分鐘。` }),
      cStep(2, { title: '排得下嗎', ask: '要做的事放得進去嗎？', id: 'fit', fixed: true, hints: ['比一比：要做的事一共多久、有多少時間。', '要做的比較少（或一樣），排得下。', '要做的比較多，就要少做一件或改到別天。'], think: '老師比一比：要做的事，放得進有空的時間嗎？', together: '一起比：排得下嗎？',
        q: () => '排得下嗎？', opts: () => [['yes', '排得下'], ['no', '排不下，要少做一件或改到別天']], ans: ctx => ctx.problem.fits ? 'yes' : 'no', wrong: ctx => ({ msg: `要做 ${ctx.problem.sum} 分鐘，有 ${ctx.problem.free} 分鐘。` }), say: ex => ex.problem.fits ? '排得下。' : '排不下，要少做一件或改到別天。' }),
      hmStep(3, { title: '先寫功課', ask: '回家先寫功課，幾時幾分寫完？', id: 'hw', hints: ['從到家的時刻往後跳。', '寫功課 40 分鐘。', '分鐘滿 60 換 1 小時。'], think: '老師從到家的時刻，往後跳寫功課的時間。', together: '一起算：幾時幾分寫完？',
        label: ctx => `${say12(ctx.problem.home)}開始寫功課，寫 ${ctx.problem.tasks[0][1]} 分鐘，幾時幾分寫完？（12 時制）`, ans: ctx => hm12(ctx.problem.hwEnd), say: ex => `${say12(ex.problem.hwEnd)}寫完。` })
    ],
    reasons, done: ctx => ctx.problem.fits ? `排得下：要做 ${ctx.problem.sum} 分鐘，有 ${ctx.problem.free} 分鐘。` : `排不下：要做 ${ctx.problem.sum} 分鐘，只有 ${ctx.problem.free} 分鐘，要少做一件。`, chant: '排行程：先放固定的事，再算有多少時間，最後檢查放不放得下。', transfer: '想一想：今天放學後，你要先做什麼？'
  });

  // =============== 9-6 店還開著嗎 ===============
  const SHOPS = [['文具店', '買筆記本', 18, 0], ['書店', '買故事書', 21, 0], ['麵包店', '買麵包', 19, 30], ['郵局', '寄信', 17, 0], ['藥局', '買藥', 21, 30]];
  A.register('tmShop', {
    methods, makeProblem: (level, i, rand = Math.random) => { const c = SHOPS[(i + rnd(rand, 0, 4)) % SHOPS.length], close = toMin(c[2], c[3]), w = 5 * rnd(rand, 2, 4), s = 5 * rnd(rand, 2, 4), want = i % 3;
      // want 0：辦得完；1：到得了但辦不完；2：辦不完
      const remain = want === 0 ? w + s + 5 * rnd(rand, 0, 3) : want === 1 ? w + 5 : w - 5, now = close - remain;
      return { c, close, w, s, remain, now, ok: w + s <= remain, need: w + s, dims: [w, s, remain],
        prompt: `現在是${say12(now)}。${c[0]}${say12(close)}關門。走到${c[0]}要 ${w} 分鐘，${c[1]}要 ${s} 分鐘。現在去，辦得完嗎？` }; },
    planFigure: ctx => clockPair(clockSVG(...hm12(ctx.problem.now), { aria: '現在的時鐘' }), digiHtml(...split(ctx.problem.close), { period: '關門', aria: '關門時刻' })),
    steps: [
      nStep(0, { title: '還剩多久', ask: '現在到關門，還剩幾分鐘？', id: 'remain', aid: convAid, hints: ['從現在跳到關門的時刻。', '先跳到整點，再跳剩下的。', '1 小時 60 分鐘。'], think: '老師從現在跳到關門。', together: '一起算：還剩幾分鐘？', pre: prompt,
        figure: ctx => { const p = ctx.problem; return lineSVG(p.now - 3, p.close + 3, { marks: [p.now, p.close], fmt: say12, jumps: shown(ctx, 0) ? [[p.now, p.close, ql(ctx, 0, `${p.remain} 分`)]] : [] }); },
        label: () => '到關門還剩幾分鐘？', ans: ctx => ctx.problem.remain, wrong: (ctx, v) => v === base100Diff(ctx.problem.now, ctx.problem.close) ? { obs: 'base100', msg: '直接相減是把時間當成 100 進位了。' } : null, say: ex => `還剩 ${ex.problem.remain} 分鐘。` }),
      nStep(1, { title: '需要多久', ask: '走過去加上辦事，要幾分鐘？', id: 'need', hints: ['走路的時間要算。', '在店裡辦事的時間也要算。', '店關門以前要辦完。'], think: '老師把走路和辦事的時間加起來。', together: '一起加：要幾分鐘？',
        label: () => '走過去加上辦事，一共幾分鐘？', ans: ctx => ctx.problem.need, wrong: (ctx, v) => v === ctx.problem.w ? { obs: 'arriveOnly', msg: '只算了走過去。到了以後還要辦事。' } : null, say: ex => `要 ${ex.problem.need} 分鐘。` }),
      cStep(2, { title: '辦得完嗎', ask: '到得了，不等於辦得完', id: 'ok', fixed: true, hints: ['比一比：還剩幾分鐘、需要幾分鐘。', '要在關門以前「辦完」，不是只有「走到」。', '需要的比還剩的多，就辦不完。'], think: '老師比一比：關門以前，辦得完嗎？', together: '一起判斷：辦得完嗎？',
        q: () => '現在去，辦得完嗎？', opts: () => [['yes', '辦得完'], ['no', '辦不完']], ans: ctx => ctx.problem.ok ? 'yes' : 'no',
        wrong: ctx => !ctx.problem.ok && ctx.problem.w <= ctx.problem.remain ? { obs: 'arriveOnly', msg: '走得到，可是還沒辦完，店就關門了。' } : { msg: `需要 ${ctx.problem.need} 分鐘，還剩 ${ctx.problem.remain} 分鐘。` }, say: ex => ex.problem.ok ? '辦得完。' : '辦不完。' }),
      cStep(3, { title: '怎麼辦', ask: '要怎麼做比較好？', id: 'act', hints: ['辦得完：現在出發。', '辦不完：改時間，不要冒險。', '不要闖紅燈或在路上亂跑。'], think: '老師想：要怎麼做才安全、又辦得到？', together: '一起想：怎麼辦？',
        q: () => '要怎麼做比較好？', opts: ctx => ctx.problem.ok ? [['go', '現在出發，辦完再回家'], ['run', '用跑的、闖紅燈趕過去'], ['later', '先玩一下再去']] : [['later', '改到明天開門以後再去'], ['run', '用跑的、闖紅燈趕過去'], ['go', '還是現在去，到了再說']],
        ans: ctx => ctx.problem.ok ? 'go' : 'later', wrong: (ctx, a) => a === 'run' ? { obs: 'wrongChoice', msg: '安全最重要，不要闖紅燈或在路上亂跑。' } : { msg: ctx.problem.ok ? '時間夠，現在出發就好；晚一點去就來不及了。' : '時間不夠，改時間比較好。' }, say: ex => ex.problem.ok ? '現在出發。' : '改到明天開門以後再去。' })
    ],
    reasons, done: ctx => ctx.problem.ok ? `辦得完：還剩 ${ctx.problem.remain} 分鐘，需要 ${ctx.problem.need} 分鐘。` : `辦不完：還剩 ${ctx.problem.remain} 分鐘，需要 ${ctx.problem.need} 分鐘，改時間再去。`, chant: '店還開著嗎：到得了，還要辦得完；不夠時間就改時間，安全第一。', transfer: '想一想：家附近的店幾點關門？'
  });
})();

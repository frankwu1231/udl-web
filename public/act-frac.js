'use strict';
// 第 33 版：分數教材包的共用工具與四個核心活動（content-frac.js）。
// 共用：分數的計算（約分、等值、比大小）；長條圖、圓形圖、數線、面積圖、量杯的圖；分子分母的輸入格；分數圖卡（入門、一般可以打開，打開會記錄）。
// 核心活動 2-2（看分數五步）：找整體 → 一樣大嗎 → 數全部幾份（分母）→ 數拿了幾份（分子）→ 寫出來。
// 核心活動 3-2（分數計算五步）：看分母 → 換成幾個 → 數或加減 → 分母不變 → 檢查。
// 核心活動 6-2（一樣多四步）：疊在一起比 → 切細 → 分子分母乘同一個數 → 寫出來。
// 核心活動 7-1（數線四步）：0 到 1 分成幾段（數段不數線）→ 一段是幾分之一 → 數到第幾段 → 寫出來。
// 課綱備註：二年級只用連續量、摺紙只摺半；三年級結果不超過 2、不教帶分數；N-4-8 數線分母不大於 5。
(() => {
  const A = window.areaActs, U = A.util, { esc, num, fieldHtml } = U;
  const rnd = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
  const any = (rand, list) => list[Math.floor(rand() * list.length)];

  // ---------- 計算 ----------
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const lcm = (a, b) => a / gcd(a, b) * b;
  const simp = (n, d) => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const same = (a, b, c, d) => a * d === b * c;   // a/b 和 c/d 一樣大
  // 吳老師 2026-11-18：入門分母 2～4、一般 10 以內、挑戰 12 以內
  const DEN = { easy: [2, 3, 4], standard: [3, 4, 5, 6, 8, 10], challenge: [5, 6, 7, 8, 9, 10, 12] };
  const denOf = (level, rand) => any(rand, DEN[level] || DEN.standard);
  const fromLevel = (o, level) => o[level] || o.standard;
  // 分數的寫法
  const fracHtml = (a, b, w) => `${w ? `<span class="fr-w">${w}</span>` : ''}<span class="fm-frac" aria-label="${w ? `${w} 又 ` : ''}${b} 分之 ${a}"><span>${a}</span><span>${b}</span></span>`;
  const fracText = (a, b, w) => `${w ? `${w} 又 ` : ''}${b} 分之 ${a}`;
  const big = html => `<p class="fm-big">${html}</p>`;

  // ---------- 圖 ----------
  // 長條：每一條是 1 個整體，平分成 den 份，塗 k 份（k 可以超過 den，會畫好幾條）。
  // o.b：接在後面再塗幾份（第二種顏色）；o.x：最後幾份打叉（拿走）；o.sub：每份再切成幾小份（虛線）；o.cuts：不平分的切法（0～1 的位置）
  function barSVG(den, k, o = {}) {
    const wholes = o.wholes || Math.max(1, Math.ceil((k + (o.b || 0)) / den)), W = 360, H = o.h || 46, gap = 18, pad = 6;
    let g = '';
    for (let w = 0; w < wholes; w++) {
      const y = pad + w * (H + gap);
      const cuts = o.cuts || Array.from({ length: den + 1 }, (_, j) => j / den);
      for (let j = 0; j < cuts.length - 1; j++) {
        const idx = w * den + j, x = pad + cuts[j] * W, wd = (cuts[j + 1] - cuts[j]) * W;
        const cls = idx < k ? 'fr-on' : idx < k + (o.b || 0) ? 'fr-on b' : 'fr-off';
        g += `<rect x="${x.toFixed(1)}" y="${y}" width="${wd.toFixed(1)}" height="${H}" class="ac-tile fr-part ${cls}"/>`;
        if (o.x && idx < k && idx >= k - o.x) g += `<path d="M${(x + 6).toFixed(1)} ${y + 6}L${(x + wd - 6).toFixed(1)} ${y + H - 6}M${(x + wd - 6).toFixed(1)} ${y + 6}L${(x + 6).toFixed(1)} ${y + H - 6}" class="fr-x"/>`;
        if (o.sub > 1) for (let s = 1; s < o.sub; s++) g += `<path d="M${(x + wd * s / o.sub).toFixed(1)} ${y}V${y + H}" class="fr-sub"/>`;
        if (o.labels) g += `<text x="${(x + wd / 2).toFixed(1)}" y="${y + H / 2 + 6}" text-anchor="middle" class="fr-lab">${o.labels === true ? `1/${den}` : esc(o.labels)}</text>`;
      }
      g += `<rect x="${pad}" y="${y}" width="${W}" height="${H}" class="fr-whole${o.hlWhole ? ' on' : ''}"/>`;
      if (wholes > 1 || o.name) g += `<text x="${pad + W + 8}" y="${y + H / 2 + 6}" class="fm-lab">${esc(o.name || `第 ${w + 1} 個`)}</text>`;
    }
    const Wt = pad * 2 + W + (wholes > 1 || o.name ? 90 : 0), Ht = pad * 2 + wholes * (H + gap) - gap;
    return `<svg class="ac-svg fr-svg" viewBox="0 0 ${Wt} ${Ht}" style="max-width:${Math.round(Wt * 1.4)}px" role="img" aria-label="${esc(o.aria || `長條平分成 ${den} 份，塗了 ${k} 份`)}">${g}</svg>`;
  }
  // 圓：平分成 den 份，塗 k 份；k 超過 den 就畫好幾個圓。o.angles：不平分的切法（0～1）
  function pieSVG(den, k, o = {}) {
    const wholes = o.wholes || Math.max(1, Math.ceil((k + (o.b || 0)) / den)), R = 70, gap = 22, pad = 6;
    let g = '';
    for (let w = 0; w < wholes; w++) {
      const cx = pad + R + w * (2 * R + gap), cy = pad + R;
      const cuts = o.angles || Array.from({ length: den + 1 }, (_, j) => j / den);
      for (let j = 0; j < cuts.length - 1; j++) {
        const idx = w * den + j, cls = idx < k ? 'fr-on' : idx < k + (o.b || 0) ? 'fr-on b' : 'fr-off';
        const a1 = cuts[j] * 2 * Math.PI, a2 = cuts[j + 1] * 2 * Math.PI, P = a => `${(cx + Math.sin(a) * R).toFixed(1)} ${(cy - Math.cos(a) * R).toFixed(1)}`;
        g += cuts.length === 2 ? `<circle cx="${cx}" cy="${cy}" r="${R}" class="ac-tile fr-part ${cls}"/>` : `<path d="M${cx} ${cy}L${P(a1)}A${R} ${R} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${P(a2)}Z" class="ac-tile fr-part ${cls}"/>`;
        if (o.x && idx < k && idx >= k - o.x) { const am = (a1 + a2) / 2, mx = cx + Math.sin(am) * R * 0.6, my = cy - Math.cos(am) * R * 0.6; g += `<path d="M${(mx - 8).toFixed(1)} ${(my - 8).toFixed(1)}l16 16m0 -16l-16 16" class="fr-x"/>`; }
      }
      g += `<circle cx="${cx}" cy="${cy}" r="${R}" class="fr-whole${o.hlWhole ? ' on' : ''}"/>`;
    }
    const Wt = pad * 2 + wholes * (2 * R + gap) - gap, Ht = pad * 2 + 2 * R;
    return `<svg class="ac-svg fr-svg" viewBox="0 0 ${Wt} ${Ht}" style="max-width:${Math.round(Wt * 1.5)}px" role="img" aria-label="${esc(o.aria || `圓平分成 ${den} 份，塗了 ${k} 份`)}">${g}</svg>`;
  }
  const shapeSVG = (shape, den, k, o) => shape === 'pie' ? pieSVG(den, k, o) : barSVG(den, k, o);
  // 數線：0 到 max，每 1 再分成 den 段。o.marks：[{v, label, cls}]（v 是數值）；o.ask：要問的位置（畫箭頭）；o.labels：'frac' 每個刻度寫分數、'dec' 寫小數、'whole' 只寫整數
  function lineSVG(max, den, o = {}) {
    const L = 30, u = Math.min(440 / max, 300), W = L * 2 + max * u, y = 60;
    let g = `<path d="M${L - 10} ${y}H${L + max * u + 14}" class="ln-axis"/><path d="M${L + max * u + 14} ${y}l-8 -5v10z" class="fr-arrow"/>`;
    for (let t = 0; t <= max * den; t++) {
      const x = L + t * u / den, whole = t % den === 0;
      g += `<path d="M${x.toFixed(1)} ${y - (whole ? 12 : 7)}V${y + (whole ? 12 : 7)}" class="ln-axis${whole ? ' fr-major' : ''}"/>`;
      if (whole) g += `<text x="${x.toFixed(1)}" y="${y + 34}" text-anchor="middle" class="fr-lab big">${t / den}</text>`;
      else if (o.labels === 'frac') g += `<text x="${x.toFixed(1)}" y="${y + 32}" text-anchor="middle" class="fr-lab">${t}/${den}</text>`;
      else if (o.labels === 'dec') g += `<text x="${x.toFixed(1)}" y="${y + 32}" text-anchor="middle" class="fr-lab">${(t / den).toFixed(den === 100 ? 2 : 1)}</text>`;
    }
    if (o.segs) for (let t = 0; t < o.segs; t++) { const x = L + t * u / den; g += `<path d="M${(x + 3).toFixed(1)} ${y - 4}Q${(x + u / den / 2).toFixed(1)} ${y - 26} ${(x + u / den - 3).toFixed(1)} ${y - 4}" class="fm-jump a"/>`; }
    for (const m of o.marks || []) { const x = L + m.v * u; g += `<circle cx="${x.toFixed(1)}" cy="${y}" r="7" class="fr-dot ${m.cls || ''}"/>${m.label ? `<text x="${x.toFixed(1)}" y="${y - 18}" text-anchor="middle" class="fm-lab">${esc(m.label)}</text>` : ''}`; }
    if (o.ask != null) { const x = L + o.ask * u; g += `<path d="M${x.toFixed(1)} ${y - 40}V${y - 12}" class="fr-pointer"/><path d="M${x.toFixed(1)} ${y - 10}l-7 -10h14z" class="fr-arrow ask"/><text x="${x.toFixed(1)}" y="${y - 44}" text-anchor="middle" class="fm-lab">？</text>`; }
    return `<svg class="ac-svg fr-svg" viewBox="0 0 ${W} ${y + 44}" style="max-width:${Math.round(W * 1.4)}px" role="img" aria-label="${esc(o.aria || `數線：0 到 ${max}，每 1 分成 ${den} 段`)}">${g}</svg>`;
  }
  // 面積圖（分數乘分數）：長方形直的分 b 份、塗 a 份（淺色）；橫的分 d 份，在塗色的部分裡再塗 c 份（深色）。o.rows 為 false 時只畫直的
  function areaSVG(a, b, c, d, o = {}) {
    const W = 300, H = 200, pad = 6, cw = W / b, rh = H / d;
    let g = '';
    for (let i = 0; i < b; i++) for (let j = 0; j < (o.rows === false ? 1 : d); j++) {
      const h = o.rows === false ? H : rh, inA = i < a, inC = o.rows !== false && j < c && inA;
      g += `<rect x="${(pad + i * cw).toFixed(1)}" y="${(pad + j * h).toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" class="ac-tile fr-part ${inC ? 'fr-on dark' : inA ? 'fr-on' : 'fr-off'}"/>`;
    }
    g += `<rect x="${pad}" y="${pad}" width="${W}" height="${H}" class="fr-whole"/>`;
    return `<svg class="ac-svg fr-svg" viewBox="0 0 ${W + 2 * pad} ${H + 2 * pad}" style="max-width:420px" role="img" aria-label="${esc(o.aria || `長方形直的分成 ${b} 份，塗了 ${a} 份${o.rows === false ? '' : `；橫的分成 ${d} 份，深色有 ${a * c} 格`}`)}">${g}</svg>`;
  }
  // 量杯：一杯分成 den 格，倒了 k 格（可以超過一杯，會畫好幾杯）
  function cupSVG(den, k, o = {}) {
    const cups = Math.max(1, Math.ceil(k / den)), w = 90, H = 170, gap = 30, pad = 8;
    let g = '';
    for (let c = 0; c < cups; c++) {
      const x = pad + c * (w + gap), fill = Math.min(den, Math.max(0, k - c * den)), fh = H * fill / den;
      g += `<rect x="${x}" y="${pad + H - fh}" width="${w}" height="${fh}" class="fr-water"/>`;
      for (let t = 1; t < den; t++) g += `<path d="M${x} ${pad + H - H * t / den}h${w * 0.35}" class="fr-cupline"/><text x="${x + w * 0.4}" y="${pad + H - H * t / den + 5}" class="fr-lab small">${t}/${den}</text>`;
      g += `<path d="M${x} ${pad}V${pad + H}H${x + w}V${pad}" class="fr-cup"/><text x="${x + w / 2}" y="${pad + H + 22}" text-anchor="middle" class="fm-lab">${esc(o.unit || '1 杯')}</text>`;
    }
    const Wt = pad * 2 + cups * (w + gap) - gap;
    return `<svg class="ac-svg fr-svg" viewBox="0 0 ${Wt} ${H + pad + 30}" style="max-width:${Math.round(Wt * 1.6)}px" role="img" aria-label="${esc(o.aria || `量杯分成 ${den} 格，倒了 ${k} 格`)}">${g}</svg>`;
  }

  // 分數圖卡（入門、一般可以打開；打開會記一筆）：同一個長度，分成 2、3、4、5、6、8、10、12 份
  let aidCtx = null;
  const fracAid = ctx => {
    if (ctx.level === 'challenge') return '';
    aidCtx = ctx;
    const rows = [1, 2, 3, 4, 5, 6, 8, 10, 12].map(d => `<div class="fr-wall-row" aria-label="${d === 1 ? '1 個整體' : `分成 ${d} 份`}">${Array.from({ length: d }, () => `<span>${d === 1 ? '1' : `1/${d}`}</span>`).join('')}</div>`).join('');
    return `<details class="fr-aid"><summary data-read>🧩 看分數圖卡</summary><div class="fr-wall">${rows}</div></details>`;
  };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('toggle', e => { if (e.target?.classList?.contains('fr-aid') && e.target.open) aidCtx?.log('開分數圖卡'); }, true);

  // ---------- 步驟的小工具 ----------
  const nStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? fracAid(ctx) : ''}${fieldHtml(ctx, o.id, o.label(ctx), n)}`,
    check: ctx => { const v = num(ctx.answers[o.id]); if (v === null) return { code: o.id, msg: '把數填進去。' }; if (Math.abs(v - o.ans(ctx)) < 1e-9) return null;
      const w = o.wrong ? o.wrong(ctx, v) : null; return { code: o.id, obs: (w && w.obs) || 'other', msg: (w && w.msg) || o.retry || '再算一次。' }; },
    solve: ctx => { ctx.answers[o.id] = String(o.ans(ctx)); }, say: o.say });
  const cStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? fracAid(ctx) : ''}${ctx.choice(o.id, o.q(ctx), o.opts(ctx), o.fixed)}`,
    check: ctx => { const a = ctx.answers[o.id]; if (!a) return { code: o.id, msg: '先選一個答案。' }; if (a === o.ans(ctx)) return null;
      const w = o.wrong ? o.wrong(ctx, a) : null; return { code: o.id, obs: (w && w.obs) || 'wrongChoice', msg: (w && w.msg) || o.retry || '再想一想。' }; },
    solve: ctx => { ctx.answers[o.id] = o.ans(ctx); }, say: o.say });
  // 好幾格數字的一步：o.fields = [[id, label(ctx), ans(ctx), wrong(ctx, v)?]]
  const mStep = (n, o) => ({ title: o.title, ask: o.ask, ids: o.fields.map(f => f[0]), hints: o.hints, think: o.think, together: o.together, figure: o.figure,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? fracAid(ctx) : ''}${o.fields.map(f => fieldHtml(ctx, f[0], f[1](ctx), n)).join('')}`,
    check: ctx => { for (const f of o.fields) { const v = num(ctx.answers[f[0]]); if (v === null) return { code: f[0], msg: '每一格都要填。' }; }
      for (const f of o.fields) { const v = num(ctx.answers[f[0]]); if (Math.abs(v - f[2](ctx)) > 1e-9) { const w = f[3] ? f[3](ctx, v) : null; return { code: f[0], obs: (w && w.obs) || 'other', msg: (w && w.msg) || o.retry || '再算一次。' }; } }
      return null; },
    solve: ctx => { for (const f of o.fields) ctx.answers[f[0]] = String(f[2](ctx)); }, say: o.say });
  // 分數輸入格：分子在上、分母在下；o.whole 時前面多一格整數（帶分數）
  const fracField = (ctx, id, n, o = {}) => `<div class="fr-fin">${o.whole ? `<div class="fr-fw">${fieldHtml(ctx, id + 'W', '整數', n)}</div>` : ''}<div class="fr-fs">${fieldHtml(ctx, id + 'N', '分子（上面）', n)}<span class="fr-bar" aria-hidden="true"></span>${fieldHtml(ctx, id + 'D', '分母（下面）', n)}</div></div>`;
  // 填分數的一步：o.ans(ctx) → [分子, 分母] 或 [整數, 分子, 分母]（o.whole）
  // o.equiv：一樣大的分數也算對；o.simplest：要約成最簡分數；o.wrong(ctx, [..]) → {obs, msg}
  const fStep = (n, o) => ({ title: o.title, ask: o.ask, ids: (o.whole ? ['W', 'N', 'D'] : ['N', 'D']).map(s => o.id + s), hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? fracAid(ctx) : ''}<p data-read data-say>${o.label(ctx)}</p>${fracField(ctx, o.id, n, o)}`,
    check: ctx => {
      const keys = o.whole ? ['W', 'N', 'D'] : ['N', 'D'], vals = keys.map(s => num(ctx.answers[o.id + s]));
      if (vals.some(v => v === null)) return { code: o.id, msg: o.whole ? '三格都要填（整數沒有就填 0）。' : '分子、分母都要填。' };
      const want = o.ans(ctx), [w, a, b] = o.whole ? vals : [0, ...vals], [ww, wa, wb] = o.whole ? want : [0, ...want];
      if (b === 0) return { code: o.id, obs: 'other', msg: '分母不能是 0：分母是「全部分成幾份」。' };
      if (vals.every((v, k) => v === want[k])) return null;
      const okValue = same(w * b + a, b, ww * wb + wa, wb);
      if (okValue && o.whole && a >= b) return { code: o.id, obs: 'mixedConvert', msg: `分子比分母大，還可以再拼成整個的。` };
      const simplest = typeof o.simplest === 'function' ? o.simplest(ctx) : o.simplest, equiv = typeof o.equiv === 'function' ? o.equiv(ctx) : o.equiv;
      if (okValue && simplest && gcd(a, b) > 1) return { code: o.id, obs: 'notSimplest', msg: `${a} 和 ${b} 都可以再除以 ${gcd(a, b)}，約成最簡分數。` };
      if (okValue && (equiv || simplest)) return null;
      const c = o.wrong ? o.wrong(ctx, vals) : null; if (c) return { code: o.id, obs: c.obs || 'other', msg: c.msg };
      if (okValue) return { code: o.id, obs: 'other', msg: `一樣大，可是這一題要寫成分母是 ${wb} 的分數。` };
      if (!o.whole && a === wb && b === wa && wa !== wb) return { code: o.id, obs: 'numDenSwap', msg: '分子、分母放反了：全部分成幾份寫在下面（分母），拿了幾份寫在上面（分子）。' };
      return { code: o.id, obs: 'other', msg: o.retry || '再算一次。' };
    },
    solve: ctx => { const want = o.ans(ctx), keys = o.whole ? ['W', 'N', 'D'] : ['N', 'D']; keys.forEach((s, k) => { ctx.answers[o.id + s] = String(want[k]); }); }, say: o.say });
  const prompt = ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`;
  const shown = (ctx, n) => ctx.hint(n) >= 2 || ctx.checked(n);
  const YN = [['yes', '是'], ['no', '不是']];
  const cmpOpts = (a, b) => [['gt', `${a} ＞ ${b}`], ['lt', `${a} ＜ ${b}`], ['eq', `${a} ＝ ${b}`]];
  const cmpKey = (x, y) => Math.abs(x - y) < 1e-9 ? 'eq' : x > y ? 'gt' : 'lt';

  // 東西的名字（連續量）
  const THINGS = [{ n: '蛋糕', shape: 'pie' }, { n: '披薩', shape: 'pie' }, { n: '巧克力', shape: 'bar' }, { n: '緞帶', shape: 'bar' }, { n: '吐司', shape: 'bar' }, { n: '鬆餅', shape: 'pie' }];

  // ---------- 核心活動 2-2：看分數五步 ----------
  function makeRead(level, i, rand = Math.random) {
    const t = THINGS[(i + rnd(rand, 0, THINGS.length - 1)) % THINGS.length], den = denOf(level, rand), k = rnd(rand, 1, den - 1);
    return { t, shape: t.shape, den, k, dims: [den, k], prompt: `一個${t.n}平分成好幾塊，塗色的是被吃掉的部分。被吃掉的是一個${t.n}的幾分之幾？` };
  }
  const readFig = (ctx, o = {}) => { const p = ctx.problem; return shapeSVG(p.shape, p.den, p.k, { aria: `一個${p.t.n}平分成 ${p.den} 塊，塗了 ${p.k} 塊`, ...o }); };
  const readSteps = [
    cStep(0, { title: '找整體', ask: '「1 個」是什麼？', id: 'whole', hints: ['看外面的框：整個東西是什麼？', '整體就是一整個，還沒切以前的樣子。', '題目說「一個○○」，整體就是那一整個。'],
      think: '老師先找整體：一整個蛋糕（外框會發亮）。', together: '一起找：整體是什麼？', figure: ctx => readFig(ctx, { hlWhole: true }), pre: prompt,
      q: () => '「1 個整體」是什麼？', opts: ctx => [['whole', `一整個${ctx.problem.t.n}`], ['part', '塗色的那幾塊'], ['one', '其中一小塊']], ans: () => 'whole',
      wrong: () => ({ obs: 'wrongWhole', msg: '整體是還沒切以前的一整個。' }), say: ex => `整體是一整個${ex.problem.t.n}。` }),
    cStep(1, { title: '一樣大嗎', ask: '每一塊一樣大嗎？', id: 'equal', fixed: true, hints: ['看一看每一塊的大小。', '一樣大才是「平分」。', '平分了，才能說幾分之幾。'],
      think: '老師看每一塊：一樣大，是平分，才能用分數說。', together: '一起看：每一塊一樣大嗎？', figure: readFig,
      q: () => '每一塊都一樣大嗎？', opts: () => [['yes', '一樣大，是平分'], ['no', '不一樣大']], ans: () => 'yes', wrong: () => ({ msg: '再看一次：每一塊一樣大。' }), say: () => '每一塊一樣大，是平分。' }),
    nStep(2, { title: '數全部幾份', ask: '全部分成幾份？', id: 'den', aid: true, hints: ['一塊一塊數，全部都要數。', '塗色和沒塗色的都要數。', '全部分成幾份，寫在分數的下面（分母）。'],
      think: '老師數全部：塗色、沒塗色的都要數。', together: '一起數：全部幾份？', figure: readFig,
      label: () => '全部平分成幾份？', ans: ctx => ctx.problem.den,
      wrong: (ctx, v) => v === ctx.problem.k ? { obs: 'partToPart', msg: '這是塗色的塊數。沒塗色的也要數進去。' } : v === ctx.problem.den - ctx.problem.k ? { obs: 'partToPart', msg: '這是沒塗色的塊數。全部都要數。' } : { msg: '一塊一塊數，全部有幾塊？' },
      say: ex => `全部平分成 ${ex.problem.den} 份，${ex.problem.den} 寫在下面。` }),
    nStep(3, { title: '數拿了幾份', ask: '塗色的有幾份？', id: 'num', hints: ['只數塗色的。', '塗色的是被吃掉的。', '拿了幾份，寫在分數的上面（分子）。'],
      think: '老師只數塗色的。', together: '一起數：塗色幾份？', figure: readFig,
      label: () => '塗色的有幾份？', ans: ctx => ctx.problem.k,
      wrong: (ctx, v) => v === ctx.problem.den - ctx.problem.k ? { obs: 'partToPart', msg: '這是沒塗色的。要數塗色的。' } : { msg: '只數塗色的那幾塊。' }, say: ex => `塗色的有 ${ex.problem.k} 份，${ex.problem.k} 寫在上面。` }),
    fStep(4, { title: '寫出來', ask: '上面、下面放對了嗎？', id: 'f', hints: ['全部幾份寫下面，塗色幾份寫上面。', '讀的時候先讀下面：「幾分之幾」。', '下面是全部的份數，上面是塗色的份數。'],
      think: '老師寫：全部幾份寫下面，拿了幾份寫上面，讀成「幾分之幾」。', together: '一起寫：是幾分之幾？', figure: readFig,
      label: ctx => `被吃掉的是一個${ctx.problem.t.n}的幾分之幾？`, ans: ctx => [ctx.problem.k, ctx.problem.den],
      wrong: (ctx, [a, b]) => a === ctx.problem.k && b === ctx.problem.den - ctx.problem.k ? { obs: 'partToPart', msg: '分母要寫「全部」的份數，不是沒塗色的份數。' } : null,
      say: ex => `${fracText(ex.problem.k, ex.problem.den)}。` })
  ];
  A.register('frRead', {
    methods: [['mark', '✏️ 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeRead, planFigure: readFig, steps: readSteps,
    reasons: [['whole', '先找整體'], ['count', '全部和塗色的都數了'], ['hint', '看提示']],
    done: ctx => `被吃掉的是一個${ctx.problem.t.n}的 ${fracText(ctx.problem.k, ctx.problem.den)}。`,
    chant: '看分數：找整體、看平分，全部幾份寫下面，拿了幾份寫上面。',
    transfer: '想一想：一盒 6 個蛋糕吃了 1 個，可以說吃了幾分之幾嗎？'
  });

  // ---------- 核心活動 3-2：分數計算五步 ----------
  const DRINK = [['果汁', '瓶', '喝'], ['牛奶', '瓶', '喝'], ['蛋糕', '個', '吃'], ['披薩', '個', '吃']];
  function makeAdd(level, i, rand = Math.random) {
    const d = denOf(level, rand), [what, u, vb] = any(rand, DRINK), cap = level === 'easy' ? d : 2 * d;   // 三年級：結果不超過 2
    let a, b; do { a = rnd(rand, 1, d - 1); b = rnd(rand, 1, d - 1); } while (a + b > cap || (level !== 'easy' && i % 2 && a + b <= d));
    return { d, a, b, what, u, dims: [d, a, b], prompt: `小安早上${vb}了 ${a}/${d} ${u}${what}，下午又${vb}了 ${b}/${d} ${u}。一共${vb}了幾${u}？` };
  }
  const addFig = (ctx, all) => { const p = ctx.problem; return barSVG(p.d, p.a, { b: all ? p.b : 0, aria: `藍色是早上的 ${p.a} 份${all ? `，橘色是下午的 ${p.b} 份` : ''}，每一條是 1 ${p.u}` }); };
  const addSteps = [
    cStep(0, { title: '看分母', ask: '分母一樣嗎？', id: 'same', fixed: true, hints: ['看兩個分數下面的數。', '分母一樣，表示每一份一樣大。', '每一份一樣大，就可以直接數幾份。'],
      think: '老師看分母：一樣，每一份一樣大，可以直接數。', together: '一起看：分母一樣嗎？', figure: ctx => addFig(ctx, false), pre: ctx => `${prompt(ctx)}${big(`${fracHtml(ctx.problem.a, ctx.problem.d)} ＋ ${fracHtml(ctx.problem.b, ctx.problem.d)}`)}`,
      q: () => '兩個分數的分母一樣嗎？', opts: () => [['yes', '一樣'], ['no', '不一樣']], ans: () => 'yes', wrong: () => ({ msg: '兩個分數下面的數一樣。' }), say: ex => `分母都是 ${ex.problem.d}，每一份一樣大。` }),
    mStep(1, { title: '換成幾個', ask: '各是幾個幾分之一？', aid: true, hints: ['分子是幾，就是幾個「幾分之一」。', `例如 3/5 是 3 個 1/5。`, '上面的數就是個數。'],
      think: '老師把分數換成幾個「幾分之一」。', together: '一起換：各是幾個？', figure: ctx => addFig(ctx, true),
      fields: [['na', ctx => `${ctx.problem.a}/${ctx.problem.d} 是幾個 1/${ctx.problem.d}？`, ctx => ctx.problem.a, (ctx, v) => v === ctx.problem.d ? { obs: 'numDenSwap', msg: '要看上面的數（分子）。' } : null],
        ['nb', ctx => `${ctx.problem.b}/${ctx.problem.d} 是幾個 1/${ctx.problem.d}？`, ctx => ctx.problem.b, (ctx, v) => v === ctx.problem.d ? { obs: 'numDenSwap', msg: '要看上面的數（分子）。' } : null]],
      say: ex => `${ex.problem.a} 個和 ${ex.problem.b} 個 1/${ex.problem.d}。` }),
    nStep(2, { title: '數一數', ask: '合起來是幾個？', id: 'tot', hints: ['把兩個個數加起來。', '藍色的和橘色的一起數。', `幾個 ＋ 幾個 ＝ 一共幾個。`],
      think: '老師把兩個個數加起來。', together: '一起加：一共幾個？', figure: ctx => addFig(ctx, true),
      label: ctx => `一共是幾個 1/${ctx.problem.d}？`, ans: ctx => ctx.problem.a + ctx.problem.b, say: ex => `${ex.problem.a} ＋ ${ex.problem.b} ＝ ${ex.problem.a + ex.problem.b}，一共 ${ex.problem.a + ex.problem.b} 個 1/${ex.problem.d}。` }),
    fStep(3, { title: '分母不變', ask: '分母要不要相加？', id: 'f', hints: ['每一份的大小沒有變。', '分母不用加，還是一樣。', `一共幾個 1/${'□'}，分母還是 □。`],
      think: '老師想：每一份一樣大，分母不變；只有個數（分子）加起來。', together: '一起寫：答案是多少？', figure: ctx => addFig(ctx, true),
      label: () => '一共是多少？寫成分數。', ans: ctx => [ctx.problem.a + ctx.problem.b, ctx.problem.d],
      wrong: (ctx, [a, b]) => b === 2 * ctx.problem.d ? { obs: 'addDen', msg: '分母不用相加：每一份的大小沒變，還是 1/' + ctx.problem.d + '。' } : null,
      say: ex => `${ex.problem.a}/${ex.problem.d} ＋ ${ex.problem.b}/${ex.problem.d} ＝ ${ex.problem.a + ex.problem.b}/${ex.problem.d}。` }),
    cStep(4, { title: '檢查', ask: '比 1 多還是比 1 少？', id: 'one', fixed: true, hints: ['看圖：塗色的有沒有超過一整條？', `${'□'}/${'□'}（分子和分母一樣）就是 1。`, '分子比分母大，就比 1 多。'],
      think: '老師檢查：分子和分母比一比，看有沒有超過 1。', together: '一起檢查：比 1 多嗎？', figure: ctx => addFig(ctx, true),
      q: ctx => `${ctx.problem.a + ctx.problem.b}/${ctx.problem.d} 和 1 比，怎麼樣？`, opts: () => [['lt', '比 1 少'], ['eq', '剛好是 1'], ['gt', '比 1 多']],
      ans: ctx => cmpKey(ctx.problem.a + ctx.problem.b, ctx.problem.d), wrong: () => ({ msg: '分子和分母比一比：一樣就是 1。' }),
      say: ex => { const s = ex.problem.a + ex.problem.b, d = ex.problem.d; return s === d ? '剛好是 1 個。' : s > d ? '比 1 多。' : '比 1 少。'; } })
  ];
  A.register('frAdd', {
    methods: [['mark', '➕ 一步一步做'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeAdd, planFigure: ctx => addFig(ctx, true), steps: addSteps,
    reasons: [['den', '先看分母'], ['count', '數幾個幾分之一'], ['keep', '分母不變'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem; return `一共 ${p.a + p.b}/${p.d} ${p.u}。`; },
    chant: '同分母相加：分母不變，分子相加。',
    transfer: '想一想：一條緞帶用了 2/5，又用了 1/5，一共用了多少？'
  });

  // ---------- 核心活動 6-2：一樣多四步 ----------
  function makeSplit(level, i, rand = Math.random) {
    const top = fromLevel({ easy: 8, standard: 12, challenge: 24 }, level);
    let b, a, m; do { b = any(rand, [2, 3, 4, 5, 6]); a = rnd(rand, 1, b - 1); m = rnd(rand, 2, level === 'challenge' ? 4 : 3); } while (b * m > top || gcd(a, b) > 1);
    const t = any(rand, ['吐司', '巧克力', '海苔']);
    return { a, b, m, t, dims: [a, b, m], prompt: `${a}/${b} 片${t}，每一份再切成 ${m} 小份。現在是幾分之幾？` };
  }
  const splitFig = (ctx, cut) => { const p = ctx.problem; return barSVG(p.b, p.a, { sub: cut ? p.m : 0, aria: cut ? `${p.a}/${p.b}，每一份再切成 ${p.m} 小份` : `${p.a}/${p.b}` }); };
  const splitSteps = [
    cStep(0, { title: '疊在一起比', ask: '切細以後，塗色的變多了嗎？', id: 'more', hints: ['切細只是多切幾刀。', '東西沒有拿走，也沒有加進來。', '塗色的部分一樣大。'],
      think: '老師把切細前、切細後疊在一起比：塗色的一樣多。', together: '一起比：變多、變少，還是一樣？', figure: ctx => `${splitFig(ctx, false)}${splitFig(ctx, true)}`, pre: prompt,
      q: () => '每一份再切細，塗色的部分怎麼樣？', opts: () => [['same', '一樣多'], ['more', '變多了'], ['less', '變少了']], ans: () => 'same',
      wrong: () => ({ obs: 'equivAdd', msg: '只是多切幾刀，東西沒有變多也沒有變少。' }), say: () => '塗色的部分一樣多。' }),
    nStep(1, { title: '切細', ask: '全部變成幾份？', id: 'den', aid: true, hints: ['每一份都切成幾小份。', `原來幾份 × 每份切成幾小份。`, '一份一份數，全部都數。'],
      think: '老師算：原來的每一份都切成幾小份，全部份數要乘。', together: '一起算：全部幾份？', figure: ctx => splitFig(ctx, true),
      label: () => '現在全部有幾份？', ans: ctx => ctx.problem.b * ctx.problem.m,
      wrong: (ctx, v) => v === ctx.problem.b + ctx.problem.m ? { obs: 'equivAdd', msg: `每一份都切成 ${ctx.problem.m} 小份，是乘，不是加。` } : null, say: ex => `${ex.problem.b} × ${ex.problem.m} ＝ ${ex.problem.b * ex.problem.m} 份。` }),
    nStep(2, { title: '分子分母乘同一個數', ask: '塗色的變成幾份？', id: 'num', hints: ['塗色的每一份也切成幾小份。', '分子也要乘同一個數。', `原來塗色幾份 × 每份切成幾小份。`],
      think: '老師算：分母乘幾，分子也乘幾。', together: '一起算：塗色幾份？', figure: ctx => splitFig(ctx, true),
      label: () => '塗色的現在是幾份？', ans: ctx => ctx.problem.a * ctx.problem.m,
      wrong: (ctx, v) => v === ctx.problem.a + ctx.problem.m ? { obs: 'equivAdd', msg: '分子也要乘，不是加。' } : null, say: ex => `${ex.problem.a} × ${ex.problem.m} ＝ ${ex.problem.a * ex.problem.m} 份。` }),
    fStep(3, { title: '寫出來', ask: '兩個分數一樣大嗎？', id: 'f', hints: ['用上兩步算出來的數。', '全部幾份寫下面，塗色幾份寫上面。', `${'□'}/${'□'} 和原來的一樣大。`],
      think: '老師寫出新的分數，和原來的一樣大。', together: '一起寫：一樣大的分數是多少？', figure: ctx => splitFig(ctx, true),
      label: ctx => `${ctx.problem.a}/${ctx.problem.b} ＝ ？`, ans: ctx => [ctx.problem.a * ctx.problem.m, ctx.problem.b * ctx.problem.m],
      wrong: (ctx, [a, b]) => a === ctx.problem.a + ctx.problem.m && b === ctx.problem.b + ctx.problem.m ? { obs: 'equivAdd', msg: '分子、分母都加上一樣的數，大小會變。要乘同一個數。' } : null,
      say: ex => `${ex.problem.a}/${ex.problem.b} ＝ ${ex.problem.a * ex.problem.m}/${ex.problem.b * ex.problem.m}。` })
  ];
  A.register('frSplit', {
    methods: [['mark', '🍞 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeSplit, planFigure: ctx => splitFig(ctx, false), steps: splitSteps,
    reasons: [['same', '切細不會變多'], ['mult', '分子分母乘同一個數'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.a}/${ctx.problem.b} ＝ ${ctx.problem.a * ctx.problem.m}/${ctx.problem.b * ctx.problem.m}，一樣大。`,
    chant: '等值分數：切細一點，分子分母乘同一個數，大小不變。',
    transfer: '想一想：半個披薩，和 4 塊中的 2 塊，哪一個多？'
  });

  // ---------- 核心活動 7-1：數線四步 ----------
  function makeLine(level, i, rand = Math.random) {
    const den = any(rand, fromLevel({ easy: [2, 3, 4], standard: [2, 3, 4, 5], challenge: [3, 4, 5] }, level)), max = level === 'easy' ? 1 : 2;
    let k; do k = rnd(rand, 1, max * den - 1); while (k % den === 0);
    return { den, max, k, dims: [den, k], prompt: `數線上的箭頭指的是多少？寫成分數。` };
  }
  const lineFig = (ctx, o = {}) => { const p = ctx.problem; return lineSVG(p.max, p.den, { ask: p.k / p.den, ...o }); };
  const lineSteps = [
    nStep(0, { title: '0 到 1 分成幾段', ask: '我數的是「段」還是「線」？', id: 'seg', hints: ['看 0 到 1 中間。', '數的是「一段一段」，不是刻度線。', '兩條刻度線中間是一段。'],
      think: '老師數 0 到 1 中間有幾段（數段，不數刻度線）。', together: '一起數：0 到 1 有幾段？', figure: ctx => lineFig(ctx, { segs: shown(ctx, 0) ? ctx.problem.den : 0 }), pre: prompt,
      label: () => '0 到 1 平分成幾段？', ans: ctx => ctx.problem.den,
      wrong: (ctx, v) => v === ctx.problem.den + 1 || v === ctx.problem.den - 1 ? { obs: 'countTicks', msg: '你數的可能是刻度線。要數兩條線中間的「段」。' } : null, say: ex => `0 到 1 平分成 ${ex.problem.den} 段。` }),
    fStep(1, { title: '一段是多少', ask: '一段是幾分之一？', id: 'u', hints: ['0 到 1 是 1 個整體。', '平分成幾段，一段就是幾分之一。', `平分成 □ 段，一段是 1/□。`],
      think: '老師想：0 到 1 平分成幾段，一段就是幾分之一。', together: '一起想：一段是多少？', figure: ctx => lineFig(ctx, { segs: ctx.problem.den }),
      label: () => '一段是幾分之一？', ans: ctx => [1, ctx.problem.den], say: ex => `一段是 1/${ex.problem.den}。` }),
    nStep(2, { title: '數到第幾段', ask: '從 0 開始數，到箭頭是幾段？', id: 'k', hints: ['從 0 出發，一段一段往右跳。', '跳到箭頭的地方停下來。', '過了 1 也要繼續數。'],
      think: '老師從 0 開始一段一段跳，跳到箭頭。', together: '一起跳：跳了幾段？', figure: ctx => lineFig(ctx, { segs: shown(ctx, 2) ? ctx.problem.k : 0 }),
      label: () => '從 0 到箭頭，一共幾段？', ans: ctx => ctx.problem.k,
      wrong: (ctx, v) => v === ctx.problem.k + 1 ? { obs: 'countTicks', msg: '0 那條線不算一段。數的是「跳了幾次」。' } : v === ctx.problem.k % ctx.problem.den ? { msg: '過了 1 以後，要接著數下去，不要重新開始。' } : null,
      say: ex => `跳了 ${ex.problem.k} 段。` }),
    fStep(3, { title: '寫出來', ask: '是幾個幾分之一？', id: 'f', hints: ['跳了幾段，就是幾個 1/□。', '分母是一段的大小，分子是跳了幾段。', '過了 1 也可以寫成分子比分母大的分數。'],
      think: '老師寫：跳了幾段寫上面，一段是幾分之一的分母寫下面。', together: '一起寫：箭頭是多少？', figure: ctx => lineFig(ctx, { segs: ctx.problem.k }),
      label: () => '箭頭指的是多少？', ans: ctx => [ctx.problem.k, ctx.problem.den], equiv: true, say: ex => `箭頭是 ${ex.problem.k}/${ex.problem.den}。` })
  ];
  A.register('frLine', {
    methods: [['mark', '📏 一步一步做'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeLine, planFigure: ctx => lineFig(ctx), steps: lineSteps,
    reasons: [['seg', '數段，不數線'], ['unit', '先找一段是多少'], ['hint', '看提示']],
    done: ctx => `箭頭指的是 ${ctx.problem.k}/${ctx.problem.den}。`,
    chant: '數線上的分數：0 到 1 分幾段，一段一段數，跳幾段寫上面。',
    transfer: '想一想：尺上的 1 公分，平分成 10 小格，一小格是幾分之一公分？'
  });

  window.fracFig = { rnd, any, gcd, lcm, simp, same, DEN, denOf, fromLevel, fracHtml, fracText, big, barSVG, pieSVG, shapeSVG, lineSVG, areaSVG, cupSVG, fracAid, nStep, cStep, mStep, fStep, fracField, prompt, shown, YN, cmpOpts, cmpKey, THINGS };
})();

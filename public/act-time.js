'use strict';
// 第 32 版：時間概念教材包的共用工具與三個核心活動（content-time.js）。
// 共用：時刻、時間量的計算；指針時鐘、電子鐘、可以撥的時鐘、時間線、月曆、時刻表的圖；五分小標、換算卡兩種輔助（打開會記錄）。
// 核心活動 3-2（看鐘六步）：找短針 → 讀幾時 → 找長針 → 五個一數 → 說出來 → 檢查。
// 核心活動 8-1（算時間七步）：看題目 → 寫已知 → 先跳到整點 → 再跳整時 → 跳剩下的 → 加起來 → 回到情境。
// 核心活動 9-2（時間決策五步）：要做什麼 → 期限（還剩多久）→ 需要多久 → 選擇 → 檢查。
// 課綱：N-2-13 備註「同時加強五個一數」、不含秒針；N-3-17 加減不進退位；N-4-13 跨時、跨午、跨日、24 小時制。
(() => {
  const A = window.areaActs, U = A.util, { esc, num, fieldHtml } = U;
  const rnd = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
  const any = (rand, list) => list[Math.floor(rand() * list.length)];

  // ---------- 計算 ----------
  const pad2 = n => String(n).padStart(2, '0');
  const toMin = (h, m) => h * 60 + m;
  const split = t => [Math.floor(((t % 1440) + 1440) % 1440 / 60), ((t % 60) + 60) % 60];
  const hmText = (h, m) => m ? `${h} 時 ${m} 分` : `${h} 時`;
  const digital = (h, m) => `${pad2(h)}:${pad2(m)}`;
  const to12 = h24 => h24 % 12 || 12;
  const periodOf = h24 => h24 < 5 ? '半夜' : h24 < 12 ? '上午' : h24 === 12 ? '中午' : h24 < 18 ? '下午' : '晚上';
  const say12 = t => { const [h, m] = split(t); return `${periodOf(h)} ${hmText(to12(h), m)}`; };   // 例如「下午 3 時 20 分」
  const durText = mins => { const h = Math.floor(mins / 60), m = mins % 60; return h ? (m ? `${h} 小時 ${m} 分鐘` : `${h} 小時`) : `${m} 分鐘`; };
  // 把時間當十進位算（錯誤）：例如 9:20 － 8:45 用 920 － 845
  const base100Diff = (a, b) => { const [ah, am] = split(a), [bh, bm] = split(b); return (bh * 100 + bm) - (ah * 100 + am); };
  const minuteNo = m => Math.floor(m / 5) || 12;   // 分針剛走過的數字

  // ---------- 圖 ----------
  // 指針時鐘：o.labels 數字外面加五分小標；o.hl 'h'／'m' 把時針或分針加亮；o.sec 秒針；o.hideHands 只畫鐘面
  function clockSVG(h, m, o = {}) {
    const R = 96, parts = [`<circle r="${R}" class="tm-face"/>`];
    for (let k = 0; k < 60; k++) { const a = k * 6 * Math.PI / 180, r1 = k % 5 ? R - 7 : R - 13; parts.push(`<path d="M${(Math.sin(a) * r1).toFixed(1)} ${(-Math.cos(a) * r1).toFixed(1)}L${(Math.sin(a) * (R - 2)).toFixed(1)} ${(-Math.cos(a) * (R - 2)).toFixed(1)}" class="tm-tick${k % 5 ? '' : ' big'}"/>`); }
    for (let k = 1; k <= 12; k++) { const a = k * 30 * Math.PI / 180; parts.push(`<text x="${(Math.sin(a) * 74).toFixed(1)}" y="${(-Math.cos(a) * 74 + 7).toFixed(1)}" text-anchor="middle" class="tm-num">${k}</text>`); }
    if (o.labels) for (let k = 1; k <= 12; k++) { const a = k * 30 * Math.PI / 180; parts.push(`<text x="${(Math.sin(a) * 114).toFixed(1)}" y="${(-Math.cos(a) * 114 + 5).toFixed(1)}" text-anchor="middle" class="tm-five">${(k * 5) % 60 || 0}</text>`); }
    if (!o.hideHands) {
      const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
      parts.push(`<path d="M0 0L${(Math.sin(ha) * 50).toFixed(1)} ${(-Math.cos(ha) * 50).toFixed(1)}" class="tm-hh${o.hl === 'h' ? ' on' : ''}"/>`);
      parts.push(`<path d="M0 0L${(Math.sin(ma) * 82).toFixed(1)} ${(-Math.cos(ma) * 82).toFixed(1)}" class="tm-mh${o.hl === 'm' ? ' on' : ''}"/>`);
      if (o.sec != null) { const sa = o.sec * 6 * Math.PI / 180; parts.push(`<path d="M0 0L${(Math.sin(sa) * 86).toFixed(1)} ${(-Math.cos(sa) * 86).toFixed(1)}" class="tm-sh"/>`); }
      parts.push('<circle r="6" class="tm-pin"/>');
    }
    const V = o.labels ? 128 : 104;
    return `<svg class="ac-svg tm-clock" viewBox="${-V} ${-V} ${2 * V} ${2 * V}" role="img" aria-label="${esc(o.aria || '指針時鐘')}">${parts.join('')}</svg>`;
  }
  const digiHtml = (h, m, o = {}) => `<span class="tm-digi" role="img" aria-label="${esc(o.aria || '電子鐘')}">${o.period ? `<small>${esc(o.period)}</small>` : ''}${digital(h, m)}</span>`;
  const clockPair = (a, b) => `<div class="tm-pair">${a}${b}</div>`;
  // 可以撥的時鐘：ctx.state[key] = {h, m}；step 是這一步的編號；o.minStep 分針一次撥幾分（0 表示只能撥時針）
  function setClockHtml(ctx, key, o = {}) {
    const v = ctx.state[key] || { h: o.h0 || 12, m: 0 };
    const btn = (d, t) => `<button type="button" data-clk="${key}" data-d="${d}">${t}</button>`;
    return `<div class="tm-set" data-clkbox="${key}"><div class="tm-setfig">${clockSVG(v.h, v.m, { aria: '你撥的時鐘' })}</div>
      <div class="tm-setbtn" role="group" aria-label="撥時鐘"><span data-read>時針（短針）</span>${btn('h-1', '◀ 往回')}${btn('h1', '往前 ▶')}
      ${o.minStep ? `<span data-read>分針（長針）</span>${btn('m-' + o.minStep, '◀ 往回')}${btn('m' + o.minStep, '往前 ▶')}` : ''}</div></div>`;
  }
  function bindClock(step, key, o = {}) {
    return ctx => document.querySelectorAll(`[data-clk="${key}"]`).forEach(el => {
      el.onclick = () => {
        const v = { ...(ctx.state[key] || { h: o.h0 || 12, m: 0 }) }, d = el.dataset.d, k = Number(d.slice(1));
        if (d[0] === 'h') v.h = ((v.h - 1 + k + 12) % 12) + 1;
        else { let t = v.m + k; if (t >= 60) { t -= 60; v.h = (v.h % 12) + 1; } if (t < 0) { t += 60; v.h = ((v.h + 10) % 12) + 1; } v.m = t; }
        ctx.state[key] = v; ctx.answers[key] = `${v.h}:${v.m}`; ctx.log('撥時鐘', { h: v.h, m: v.m }); ctx.invalidate(step);
        const box = document.querySelector(`[data-clkbox="${key}"] .tm-setfig`); if (box) box.innerHTML = clockSVG(v.h, v.m, { aria: '你撥的時鐘' });
      };
    });
  }
  // 時間線：from、to 是一天裡的分鐘；marks 要標的時刻；jumps [[從, 到, 字]]，只畫前 o.show 段
  function lineSVG(from, to, o = {}) {
    const L = 30, W = 560, span = Math.max(to - from, 1), X = t => L + (t - from) / span * (W - 2 * L), y = 92, parts = [`<path d="M${L - 10} ${y}H${W - L + 10}" class="ln-axis"/>`];
    for (let t = Math.ceil(from / 60) * 60; t <= to; t += 60) parts.push(`<path d="M${X(t).toFixed(1)} ${y - 9}V${y + 9}" class="ln-axis"/>`);
    // 第 32 版修正：兩個時刻很近（例如 60 分和 63 分）時，字會疊在一起 → 估字寬，疊到就換到下一排
    const textW = t => [...String(t)].reduce((w, c) => w + (/[\u2e80-\uffff]/.test(c) ? 14 : 8.4), 0);
    const place = (items, rows) => { const right = rows.map(() => -Infinity); return items.map(it => ({ ...it, w: textW(it.t) })).sort((a, b) => a.x - b.x).map(it => {
      const x = Math.min(Math.max(it.x, it.w / 2 + 2), W - it.w / 2 - 2); let r = right.findIndex(v => x - it.w / 2 > v + 6); if (r < 0) r = right.indexOf(Math.min(...right));
      right[r] = x + it.w / 2; return { ...it, x, y: rows[r] }; }); };
    const marks = o.marks || [], jumps = (o.jumps || []).slice(0, o.show ?? 99);
    marks.forEach((t, i) => parts.push(`<circle cx="${X(t).toFixed(1)}" cy="${y}" r="6" class="tm-mark${i === 0 ? ' s' : i === (marks.length - 1) ? ' e' : ''}"/>`));
    jumps.forEach(([a, b]) => { const xa = X(a), xb = X(b), mid = (xa + xb) / 2; parts.push(`<path d="M${xa.toFixed(1)} ${y}Q${mid.toFixed(1)} ${y - 62} ${xb.toFixed(1)} ${y}" class="tm-jump"/>`); });
    let H = y + 44;
    place(marks.map(t => ({ x: X(t), t: o.fmt ? o.fmt(t) : digital(...split(t)) })), [y + 30, y + 50, y + 70]).forEach(l => (H = Math.max(H, l.y + 14), parts.push(`<text x="${l.x.toFixed(1)}" y="${l.y}" text-anchor="middle" class="tm-lab">${esc(l.t)}</text>`)));
    place(jumps.map(([a, b, t]) => ({ x: (X(a) + X(b)) / 2, t })), [y - 40, y - 60, y - 78]).forEach(l => parts.push(`<text x="${l.x.toFixed(1)}" y="${l.y}" text-anchor="middle" class="tm-lab tm-jl">${esc(l.t)}</text>`));
    // 第 32 版第 2 輪：手機上時間線縮小，字太小；另外用一般字級列出端點和每一段（只在窄螢幕顯示）
    const lab = t => o.fmt ? o.fmt(t) : digital(...split(t)), segs = (o.jumps || []).slice(0, o.show ?? 99).map(j => `${lab(j[0])} → ${lab(j[1])}：${j[2]}`);
    const text = `<ul class="tm-line-text" aria-hidden="true">${(segs.length ? segs : [(o.marks || []).map(lab).join(' → ')]).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<svg class="ac-svg tm-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '時間線')}">${parts.join('')}</svg>${text}`;
  }
  // 月曆：y 年 mo 月；o.mark 圈起來的日；o.hint 提示框起來的日
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const daysIn = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const weekday = (y, mo, d) => new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  function calHtml(y, mo, o = {}) {
    const first = weekday(y, mo, 1), n = daysIn(y, mo), cells = [];
    for (let k = 0; k < first; k++) cells.push('<td></td>');
    for (let d = 1; d <= n; d++) cells.push(`<td class="${[(o.mark || []).includes(d) ? 'on' : '', (o.hint || []).includes(d) ? 'hint' : '', (first + d - 1) % 7 === 0 || (first + d - 1) % 7 === 6 ? 'we' : ''].filter(Boolean).join(' ')}">${d}</td>`);
    while (cells.length % 7) cells.push('<td></td>');
    const rows = []; for (let k = 0; k < cells.length; k += 7) rows.push(`<tr>${cells.slice(k, k + 7).join('')}</tr>`);
    return `<table class="tm-cal" aria-label="${y} 年 ${mo} 月的月曆"><caption>${y} 年 ${mo} 月</caption><thead><tr>${WEEK.map(w => `<th scope="col">${w}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }
  // 時刻表：head 欄名，rows 每一列；o.hint 提示框起來的列
  const ttHtml = (title, head, rows, o = {}) => `<table class="tm-tt"><caption>${esc(title)}</caption><thead><tr>${head.map((h, k) => `<th scope="col"${k === o.col ? ' class="hint"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${(o.hint || []).includes(i) ? 'hint' : ''}">${r.map((c, k) => `<td${k === o.col ? ' class="hint"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // ---------- 輔助（入門、一般可以打開；打開會記一筆） ----------
  let aidCtx = null;
  const fiveAid = ctx => { if (ctx.level === 'challenge') return ''; aidCtx = ctx; return `<details class="fm-times tm-aid" data-aid="五分小標"><summary data-read>🕐 看五分小標</summary>${clockSVG(12, 0, { labels: true, hideHands: true, aria: '五分小標：1 是 5 分、2 是 10 分……' })}</details>`; };
  const convAid = ctx => { if (ctx.level === 'challenge') return ''; aidCtx = ctx; return `<details class="fm-times tm-aid" data-aid="換算卡"><summary data-read>🔁 看換算卡</summary><ul class="tm-conv"><li>1 日 ＝ 24 時</li><li>1 時 ＝ 60 分</li><li>1 分 ＝ 60 秒</li><li>1 星期 ＝ 7 天</li><li>1 年 ＝ 12 個月</li></ul></details>`; };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('toggle', e => { const d = e.target; if (d?.classList?.contains('tm-aid') && d.open) aidCtx?.log('開' + d.dataset.aid); }, true);

  // ---------- 步驟的小工具 ----------
  // 填數字的一步：o.label(ctx)、o.ans(ctx)、o.wrong(ctx, v) → {obs, msg}
  const nStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? o.aid(ctx) : ''}${fieldHtml(ctx, o.id, o.label(ctx), n)}`,
    check: ctx => { const v = num(ctx.answers[o.id]); if (v === null) return { code: o.id, msg: '把數填進去。' }; if (v === o.ans(ctx)) return null;
      const w = o.wrong ? o.wrong(ctx, v) : null; return { code: o.id, obs: (w && w.obs) || 'other', msg: (w && w.msg) || o.retry || '再算一次。' }; },
    solve: ctx => { ctx.answers[o.id] = String(o.ans(ctx)); }, say: o.say });
  // 選一個的一步：o.q(ctx)、o.opts(ctx)、o.ans(ctx)、o.wrong(ctx, a) → {obs, msg}
  const cStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? o.aid(ctx) : ''}${ctx.choice(o.id, o.q(ctx), o.opts(ctx), o.fixed)}`,
    check: ctx => { const a = ctx.answers[o.id]; if (!a) return { code: o.id, msg: '先選一個答案。' }; if (a === o.ans(ctx)) return null;
      const w = o.wrong ? o.wrong(ctx, a) : null; return { code: o.id, obs: (w && w.obs) || 'wrongChoice', msg: (w && w.msg) || o.retry || '再想一想。' }; },
    solve: ctx => { ctx.answers[o.id] = o.ans(ctx); }, say: o.say });
  // 填兩個數（幾時幾分，或幾小時幾分鐘）的一步：o.ans(ctx) → [前, 後]；o.wrong(ctx, [a, b]) → {obs, msg}；o.dur 是時間量
  const hmStep = (n, o) => ({ title: o.title, ask: o.ask, ids: [o.id + 'H', o.id + 'M'], hints: o.hints, think: o.think, together: o.together, figure: o.figure, bind: o.bind,
    answer: ctx => `${o.pre ? o.pre(ctx) : ''}${o.aid ? o.aid(ctx) : ''}<p data-read data-say>${o.label(ctx)}</p><div class="tm-hm">${fieldHtml(ctx, o.id + 'H', (o.names || (o.dur ? ['幾小時', '幾分鐘'] : ['幾時', '幾分']))[0], n)}${fieldHtml(ctx, o.id + 'M', (o.names || (o.dur ? ['幾小時', '幾分鐘'] : ['幾時', '幾分']))[1], n)}</div>`,
    check: ctx => { const a = num(ctx.answers[o.id + 'H']), b = num(ctx.answers[o.id + 'M']); if (a === null || b === null) return { code: o.id, msg: `兩格都要填（沒有就填 0）。` };
      const [x, y] = o.ans(ctx); if (a === x && b === y) return null;
      if (b >= 60) return { code: o.id, obs: 'base100', msg: o.names ? '滿 60 要換成大一級的單位（時間是 60 進位）。' : '分鐘滿 60，要換成 1 小時（時間是 60 進位）。' };
      const w = o.wrong ? o.wrong(ctx, [a, b]) : null; return { code: o.id, obs: (w && w.obs) || 'other', msg: (w && w.msg) || o.retry || '再算一次。' }; },
    solve: ctx => { const [x, y] = o.ans(ctx); ctx.answers[o.id + 'H'] = String(x); ctx.answers[o.id + 'M'] = String(y); }, say: o.say });
  const prompt = ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>`;
  const shown = (ctx, n) => ctx.hint(n) >= 2 || ctx.checked(n);
  // 第 32 版第 2 輪：時間線上這一步要算的那一段，答對以前只畫弧、標「？」，不直接寫出答案
  const ql = (ctx, n, text) => ctx.checked(n) ? text : '？';
  // 讀鐘時常見的錯：時針快到下一個數字就讀成下一時、時針分針看反
  const readWrong = (h, m) => (ctx, v) => v === (h % 12) + 1 && m >= 30 ? { obs: 'hourNext', msg: `時針快到 ${(h % 12) + 1}，可是還沒到，所以還是 ${h} 時。` } : v === minuteNo(m) && v !== h ? { obs: 'handSwap', msg: '這是長針（分針）指的數字。時針是短的那一根。' } : { msg: '看短針（時針）剛走過哪個數字。' };

  // ---------- 核心活動 3-2：看鐘六步 ----------
  function makeRead(level, i, rand = Math.random) {
    const h = rnd(rand, 1, 12);
    let m;
    if (level === 'easy') m = 5 * rnd(rand, 1, 11);
    else if (level === 'challenge') m = rnd(rand, 31, 58);
    else do m = rnd(rand, 6, 58); while (m % 5 === 0);
    if (level !== 'easy' && i % 3 === 2) m = rnd(rand, 35, 58);   // 時針靠近下一個數字的題目多出幾次
    return { h, m, dims: [h, m], prompt: '看時鐘，現在是幾時幾分？' };
  }
  const readSteps = [
    cStep(0, { title: '找短針', ask: '哪一根是時針？', id: 'hand', fixed: true, hints: ['時鐘有兩根針：一根短、一根長。', '短的、粗的是時針；長的、細的是分針。', '先找短針，它告訴我們「幾時」。'],
      think: '老師先找短的那一根：短針是時針。', together: '一起找：哪一根是時針？', figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { hl: shown(ctx, 0) ? 'h' : null }), pre: prompt,
      q: () => '哪一根是時針（告訴我們幾時）？', opts: () => [['short', '短的、粗的那一根'], ['long', '長的、細的那一根']], ans: () => 'short',
      wrong: () => ({ obs: 'handSwap', msg: '長的那一根是分針。時針是短的那一根。' }), say: () => '短的、粗的是時針。' }),
    nStep(1, { title: '讀幾時', ask: '時針剛走過哪個數字？', id: 'hh', hints: ['看短針剛走過哪個數字。', '短針在兩個數字中間時，看它順著時針方向「剛走過」的那一個。', '還沒走到的數字不算：在 12 和 1 中間，還沒走到 1，就是 12 時。'],
      think: '老師看短針：它剛走過的數字就是幾時。', together: '一起讀：幾時？', figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { hl: 'h' }),
      label: () => '時針剛走過哪個數字？是幾時？', ans: ctx => ctx.problem.h, wrong: (ctx, v) => readWrong(ctx.problem.h, ctx.problem.m)(ctx, v), say: ex => `短針剛走過 ${ex.problem.h}，是 ${ex.problem.h} 時。` }),
    nStep(2, { title: '找長針', ask: '分針剛走過哪個數字？', id: 'mn', hints: ['長針是分針。', '看長針剛走過哪個數字。', '還沒走到的數字不算。'],
      think: '老師看長的那一根：它剛走過哪個數字？', together: '一起找：長針在哪裡？', figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { hl: 'm' }),
      label: () => '分針（長針）剛走過哪個數字？', ans: ctx => minuteNo(ctx.problem.m), wrong: (ctx, v) => v === ctx.problem.h ? { obs: 'handSwap', msg: '這是短針（時針）的數字。分針是長的那一根。' } : { msg: '看長針剛走過的數字。' },
      say: ex => `長針剛走過 ${minuteNo(ex.problem.m)}。` }),
    nStep(3, { title: '五個一數', ask: '從 12 開始，五個一數，數到這個數字是幾分？', id: 'five', aid: fiveAid, hints: ['從 12 開始：5、10、15……', '每走到一個數字，就是多 5 分。', '數字 × 5 就是幾分。'],
      think: '老師從 12 開始，五個一數，數到分針剛走過的數字。', together: '一起數：5、10、15……', figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { hl: 'm', labels: shown(ctx, 3) }),
      label: ctx => `從 12 數到 ${minuteNo(ctx.problem.m)}，是幾分？`, ans: ctx => minuteNo(ctx.problem.m) * 5, wrong: (ctx, v) => v === minuteNo(ctx.problem.m) ? { obs: 'minuteAsNumber', msg: `數字 ${v} 不是 ${v} 分。要五個一數：${v} 個 5 是多少？` } : { msg: '從 12 開始，5、10、15……一個數字一個數字數。' },
      say: ex => `五個一數到 ${minuteNo(ex.problem.m)}，是 ${minuteNo(ex.problem.m) * 5} 分。` }),
    hmStep(4, { title: '說出來', ask: '是幾時幾分？', id: 'rd', aid: fiveAid, hints: ['時：看短針；分：看長針。', '五個一數到數字，再一小格一小格往下數。', '一小格是 1 分。'],
      think: '老師先說幾時，再說幾分：五個一數，再一小格一小格數。', together: '一起說：現在是幾時幾分？', figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m, { labels: shown(ctx, 4) }),
      label: () => '現在是幾時幾分？', ans: ctx => [ctx.problem.h, ctx.problem.m],
      wrong: (ctx, [a, b]) => { const p = ctx.problem; if (a !== p.h) return readWrong(p.h, p.m)(ctx, a);
        if (b === minuteNo(p.m)) return { obs: 'minuteAsNumber', msg: '分針指的數字要五個一數，不是直接讀。' };
        if (b === minuteNo(p.m) * 5) return { msg: `${b} 分以後，還要一小格一小格往下數。` };
        return { msg: '再數一次分針：五個一數，再一小格一小格數。' }; },
      say: ex => `現在是 ${hmText(ex.problem.h, ex.problem.m)}。` }),
    cStep(5, { title: '檢查', ask: '電子鐘要怎麼寫？時針的位置對嗎？', id: 'digi', hints: ['分針超過 30，時針會靠近下一個數字，但還沒到。', '電子鐘：前面是時，後面是分。', '對照你說的幾時幾分。'],
      think: '老師檢查：分針過了一半，時針就快到下一個數字，但還沒到；再寫成電子鐘。', together: '一起檢查：電子鐘怎麼寫？', figure: ctx => clockSVG(ctx.problem.h, ctx.problem.m),
      q: () => '這個時刻，電子鐘怎麼寫？', opts: ctx => { const { h, m } = ctx.problem, list = [[digital(h, m), 'ok'], [digital((h % 12) + 1, m), 'next'], [digital(minuteNo(m), h * 5 % 60), 'swap']];
        return list.filter((x, k) => list.findIndex(y => y[0] === x[0]) === k).map(([t, k]) => [k, t]); }, ans: () => 'ok',
      wrong: (ctx, a) => a === 'next' ? { obs: 'hourNext', msg: '時針還沒走到下一個數字。' } : { obs: 'handSwap', msg: '時和分弄反了：短針是時，長針是分。' },
      say: ex => `寫成 ${digital(ex.problem.h, ex.problem.m)}。` })
  ];
  A.register('tmRead1', {
    methods: [['mark', '🕰️ 一步一步看'], ['self', '🧠 先自己讀，需要時看提示']], makeProblem: makeRead, planFigure: ctx => clockSVG(ctx.problem.h, ctx.problem.m), steps: readSteps,
    reasons: [['short', '先找短針'], ['five', '五個一數'], ['check', '檢查時針的位置'], ['hint', '看提示']],
    done: ctx => `現在是 ${hmText(ctx.problem.h, ctx.problem.m)}，電子鐘寫 ${digital(ctx.problem.h, ctx.problem.m)}。`,
    chant: '看鐘：先找短針讀幾時，再找長針五個一數，最後一小格一小格數。',
    transfer: '想一想：教室的時鐘現在是幾時幾分？下課是幾時幾分？'
  });

  // ---------- 核心活動 8-1：算時間七步（跨時） ----------
  const CROSS_CTX = [
    { who: '小美', act: '練琴' }, { who: '小明', act: '看卡通' }, { who: '阿傑', act: '坐公車去外婆家' },
    { who: '小華', act: '打掃教室' }, { who: '小安', act: '寫功課' }, { who: '小玉', act: '在圖書館看書' }
  ];
  function makeCross(level, i, rand = Math.random) {
    let sh, sm, total;
    const half = rand() < 0.5 ? '上午' : '下午';
    for (;;) {
      sh = half === '上午' ? rnd(rand, 6, 9) : rnd(rand, 1, 3);
      if (level === 'easy') { sm = 5 * rnd(rand, 6, 11); total = 5 * rnd(rand, 3, 11); }
      else if (level === 'challenge') { sm = rnd(rand, 11, 58); total = rnd(rand, 75, 170); }
      else { sm = rnd(rand, 11, 58); total = rnd(rand, 20, 110); }
      const e = toMin(sh, sm) + total, [eh, em] = split(e);
      if (eh > sh && eh <= (half === '上午' ? 11 : 5) && em > 0 && sm > 0 && (level === 'easy' ? em < sm && eh === sh + 1 : true)) {
        const c = CROSS_CTX[(i + rnd(rand, 0, 5)) % CROSS_CTX.length];
        return { sh, sm, eh, em, total, c, half, dims: [sh, sm, eh, em],
          prompt: `${c.who}${half} ${hmText(sh, sm)}開始${c.act}，${half} ${hmText(eh, em)}結束。${c.who}${c.act}經過多久？` };
      }
    }
  }
  const crossLine = (ctx, show, ask = -1, n = 0) => { const p = ctx.problem, s = toMin(p.sh, p.sm), e = toMin(p.eh, p.em), mid = [s, toMin(p.sh + 1, 0)];
    if (p.eh > p.sh + 1) mid.push(toMin(p.eh, 0)); mid.push(e);
    const jumps = [[s, toMin(p.sh + 1, 0), `${60 - p.sm} 分`]]; if (p.eh > p.sh + 1) jumps.push([toMin(p.sh + 1, 0), toMin(p.eh, 0), `${p.eh - p.sh - 1} 小時`]); jumps.push([toMin(p.eh, 0), e, `${p.em} 分`]);
    const k = show >= 3 ? jumps.length : show === 2 ? (p.eh > p.sh + 1 ? 2 : 1) : show;
    if (ask >= 0 && jumps[ask] && !ctx.checked(n)) jumps[ask][2] = '？';
    return lineSVG(s - 5, e + 5, { marks: mid, jumps, show: k, aria: '時間線：開始、整點、結束' }); };
  const crossSteps = [
    cStep(0, { title: '看題目', ask: '要找開始、結束，還是經過多久？', id: 'find', fixed: true, hints: ['讀一讀最後一句：問的是什麼？', '「經過多久」問的是時間量（幾小時幾分鐘）。', '「幾時幾分開始、結束」問的是時刻。'],
      think: '老師讀最後一句：問「經過多久」，要找的是時間量。', together: '一起讀：題目問什麼？', pre: prompt,
      q: () => '題目要你找什麼？', opts: () => [['dur', '經過多久（時間量）'], ['end', '幾時幾分結束（時刻）'], ['start', '幾時幾分開始（時刻）']], ans: () => 'dur',
      wrong: () => ({ obs: 'pointVsDuration', msg: '開始和結束的時刻題目都告訴你了，要找的是「經過多久」。' }), say: () => '要找經過多久。' }),
    hmStep(1, { title: '寫已知', ask: '開始的時刻是幾時幾分？', id: 'st', aid: fiveAid, hints: ['看開始的時鐘：短針讀時，長針讀分。', '也可以對照題目寫的開始時刻。', '先寫開始，再找結束。'],
      think: '老師先寫下開始的時刻：看時鐘，短針讀時、長針讀分。', together: '一起讀：幾時幾分開始？', figure: ctx => clockPair(clockSVG(ctx.problem.sh, ctx.problem.sm, { aria: '開始的時鐘' }), digiHtml(ctx.problem.eh, ctx.problem.em, { period: ctx.problem.half + ' 結束', aria: '結束的電子鐘' })),
      label: () => '開始的時刻（看左邊的時鐘）是幾時幾分？', ans: ctx => [ctx.problem.sh, ctx.problem.sm], wrong: (ctx, [a]) => a !== ctx.problem.sh ? readWrong(ctx.problem.sh, ctx.problem.sm)(ctx, a) : { msg: '再看一次長針：五個一數，再一小格一小格數。' },
      say: ex => `${hmText(ex.problem.sh, ex.problem.sm)}開始，${hmText(ex.problem.eh, ex.problem.em)}結束。` }),
    nStep(2, { title: '先跳到整點', ask: '到下一個整點要幾分鐘？', id: 'j1', aid: convAid, hints: ['在時間線上，從開始跳到下一個整點。', '1 小時是 60 分鐘。', '60 － 開始的分 ＝ 跳到整點的分鐘。'],
      think: '老師先從開始跳到下一個整點：60 減掉開始的分。', together: '一起跳：到整點要幾分鐘？', figure: ctx => crossLine(ctx, ctx.checked(2) || ctx.hint(2) >= 2 ? 1 : 0, 0, 2),
      label: ctx => `${hmText(ctx.problem.sh, ctx.problem.sm)} 到 ${ctx.problem.sh + 1} 時，是幾分鐘？`, ans: ctx => 60 - ctx.problem.sm,
      wrong: (ctx, v) => v === 100 - ctx.problem.sm ? { obs: 'base100', msg: '1 小時是 60 分鐘，不是 100 分鐘。' } : v === ctx.problem.sm ? { msg: `${ctx.problem.sm} 是開始的分，還要幾分鐘才到整點？` } : { msg: `60 － ${ctx.problem.sm} ＝ ？` },
      say: ex => `到 ${ex.problem.sh + 1} 時要 ${60 - ex.problem.sm} 分鐘。` }),
    nStep(3, { title: '再跳整時', ask: '中間有幾個整小時？', id: 'j2', hints: ['從第一個整點，一小時一小時跳。', '跳到結束那一時的整點就停。', '沒有整小時就填 0。'],
      think: '老師從整點開始，一小時一小時跳，跳到結束那一時。', together: '一起跳：幾小時？', figure: ctx => crossLine(ctx, ctx.checked(3) || ctx.hint(3) >= 2 ? 2 : 1, ctx.problem.eh > ctx.problem.sh + 1 ? 1 : -1, 3),
      label: ctx => `${ctx.problem.sh + 1} 時到 ${ctx.problem.eh} 時，是幾小時？（沒有就填 0）`, ans: ctx => ctx.problem.eh - ctx.problem.sh - 1, say: ex => `中間有 ${ex.problem.eh - ex.problem.sh - 1} 小時。` }),
    nStep(4, { title: '跳剩下的', ask: '最後一段是幾分鐘？', id: 'j3', hints: ['從結束那一時的整點，跳到結束的時刻。', '整點到幾分，就是幾分鐘。', '看結束時刻的分。'],
      think: '老師跳最後一段：從整點跳到結束的時刻。', together: '一起跳：最後幾分鐘？', figure: ctx => crossLine(ctx, 3, ctx.problem.eh > ctx.problem.sh + 1 ? 2 : 1, 4),
      label: ctx => `${ctx.problem.eh} 時到 ${hmText(ctx.problem.eh, ctx.problem.em)}，是幾分鐘？`, ans: ctx => ctx.problem.em, say: ex => `最後一段 ${ex.problem.em} 分鐘。` }),
    hmStep(5, { title: '加起來', ask: '分鐘加起來滿 60 了嗎？', id: 'tot', dur: true, aid: convAid, hints: ['把三段加起來：分鐘加分鐘，小時加小時。', '分鐘滿 60，換成 1 小時。', '時間是 60 進位，不是 100 進位。'],
      think: '老師把三段加起來；分鐘滿 60 就換成 1 小時。', together: '一起加：一共經過多久？', figure: ctx => crossLine(ctx, 3),
      label: ctx => { const p = ctx.problem; return `${60 - p.sm} 分鐘 ＋ ${p.eh - p.sh - 1} 小時 ＋ ${p.em} 分鐘，一共是幾小時幾分鐘？`; }, ans: ctx => [Math.floor(ctx.problem.total / 60), ctx.problem.total % 60],
      wrong: (ctx, [a, b]) => { const d = base100Diff(toMin(ctx.problem.sh, ctx.problem.sm), toMin(ctx.problem.eh, ctx.problem.em)); return a * 100 + b === d ? { obs: 'base100', msg: '直接用數字相減，是把時間當成 100 進位了。照時間線一段一段加。' } : { msg: '把三段的分鐘先加起來，滿 60 換成 1 小時。' }; },
      say: ex => `一共 ${durText(ex.problem.total)}。` }),
    cStep(6, { title: '回到情境', ask: '答案是時刻，還是時間量？', id: 'back', hints: ['題目問「經過多久」。', '經過多久要說「幾小時幾分鐘」。', '「幾時幾分」是時刻，不是經過多久。'],
      think: '老師把答案放回題目：經過多久，要說幾小時幾分鐘。', together: '一起說：答案怎麼說？',
      q: ctx => `${ctx.problem.c.who}${ctx.problem.c.act}經過多久？`, opts: ctx => { const t = ctx.problem.total, h = Math.floor(t / 60), m = t % 60, list = [['dur', `經過 ${durText(t)}`], ['point', `在 ${hmText(h || 12, m)} 的時候`]];
        if (h) list.push(['base', `經過 ${h - 1} 小時 ${m + 60} 分鐘`]); else list.push(['base', `經過 ${m + 40} 分鐘`]); return list; }, ans: () => 'dur',
      wrong: (ctx, a) => a === 'point' ? { obs: 'pointVsDuration', msg: '「幾時幾分」是時刻；經過多久要說幾小時幾分鐘。' } : { obs: 'base100', msg: '再看一次加起來的答案，時間是 60 進位。' },
      say: ex => `${ex.problem.c.who}${ex.problem.c.act}經過 ${durText(ex.problem.total)}。` })
  ];
  A.register('tmCross', {
    methods: [['mark', '🧮 用時間線跳'], ['self', '🧠 先自己算，需要時看提示']], makeProblem: makeCross, planFigure: ctx => clockPair(clockSVG(ctx.problem.sh, ctx.problem.sm, { aria: '開始的時鐘' }), clockSVG(ctx.problem.eh, ctx.problem.em, { aria: '結束的時鐘' })), steps: crossSteps,
    reasons: [['line', '畫時間線'], ['hour', '先跳到整點'], ['sixty', '記得 60 進位'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.c.who}${ctx.problem.c.act}經過 ${durText(ctx.problem.total)}。`,
    chant: '算經過時間：先跳到整點，再跳整時，最後跳剩下的；分鐘滿 60 換 1 小時。',
    transfer: '想一想：從起床到出門，你經過多久？'
  });

  // ---------- 核心活動 9-2：時間決策五步（來得及嗎） ----------
  const GO_CTX = [
    { goal: '上音樂課', place: '音樂教室', tasks: [['收書包', 5], ['走到音樂教室', 10]] },
    { goal: '搭公車', place: '公車站', tasks: [['穿鞋、拿書包', 5], ['走到公車站', 12]] },
    { goal: '聽說故事', place: '圖書館', tasks: [['收拾桌子', 5], ['走到圖書館', 15]] },
    { goal: '集合', place: '操場', tasks: [['換運動服', 8], ['走到操場', 5]] },
    { goal: '上游泳課', place: '游泳池', tasks: [['整理泳具', 10], ['走到游泳池', 15]] }
  ];
  function makeInTime(level, i, rand = Math.random) {
    const c = GO_CTX[(i + rnd(rand, 0, GO_CTX.length - 1)) % GO_CTX.length], buffer = level === 'challenge' ? 5 : 0;
    const need = c.tasks.reduce((s, t) => s + t[1], 0) + buffer, ok = i % 2 === 0;
    const remain = ok ? need + 5 * rnd(rand, 0, 3) : need - 5 * rnd(rand, 1, 2) + (level === 'easy' ? 0 : rnd(rand, 0, 4));
    let T;
    if (level === 'easy') T = toMin(rnd(rand, 2, 4), 0) + 12 * 60;            // 下午整點
    else T = toMin(rnd(rand, 1, 4), 5 * rnd(rand, 0, 11)) + 12 * 60;
    const now = T - remain;
    return { c, buffer, need, remain, ok: need <= remain, T, now, gap: Math.abs(remain - need), dims: [remain, need],
      prompt: `現在是${say12(now)}。${say12(T)}要在${c.place}${c.goal}。要先${c.tasks.map(t => `${t[0]}（${t[1]} 分鐘）`).join('，再')}。${buffer ? `老師說要提早 ${buffer} 分鐘到。` : ''}來得及嗎？` };
  }
  const nowFig = ctx => { const p = ctx.problem, [nh, nm] = split(p.now), [th, tm] = split(p.T); return clockPair(clockSVG(to12(nh), nm, { aria: '現在的時鐘' }), digiHtml(th, tm, { period: '期限', aria: '期限的電子鐘' })); };
  const inTimeSteps = [
    cStep(0, { title: '要做什麼', ask: '我要去哪裡、幾點前要到？', id: 'goal', hints: ['讀題目：要去哪裡？要做什麼？', '找「幾時幾分」要到的那個時刻。', '那個時刻就是期限。'],
      think: '老師先讀題目：要去哪裡，幾點以前要到。', together: '一起讀：要做什麼？', pre: prompt, figure: nowFig,
      q: () => '題目說的是哪一件事？', opts: ctx => { const p = ctx.problem; return [['ok', `${say12(p.T)}以前要到${p.c.place}`], ['now', `${say12(p.now)}以前要到${p.c.place}`], ['late', `${say12(p.T)}才出門`]]; }, ans: () => 'ok',
      wrong: (ctx, a) => a === 'now' ? { obs: 'departVsArrive', msg: `${say12(ctx.problem.now)}是「現在」，不是期限。` } : { obs: 'departVsArrive', msg: '期限是「要到」的時刻，不是出門的時刻。' }, say: ex => `${say12(ex.problem.T)}以前要到${ex.problem.c.place}。` }),
    nStep(1, { title: '期限：還剩多久', ask: '從現在到期限，還剩幾分鐘？', id: 'remain', aid: convAid, hints: ['從現在跳到期限。', '先跳到整點，再跳剩下的。', '1 小時是 60 分鐘。'],
      think: '老師從現在跳到期限：先跳到整點，再跳剩下的。', together: '一起跳：還剩幾分鐘？', figure: ctx => { const p = ctx.problem; return lineSVG(p.now - 3, p.T + 3, { marks: [p.now, p.T], fmt: say12, jumps: shown(ctx, 1) ? [[p.now, p.T, ql(ctx, 1, `${p.remain} 分`)]] : [], aria: '時間線：現在到期限' }); },
      label: ctx => `${say12(ctx.problem.now)}到${say12(ctx.problem.T)}，還剩幾分鐘？`, ans: ctx => ctx.problem.remain,
      wrong: (ctx, v) => v === base100Diff(ctx.problem.now, ctx.problem.T) ? { obs: 'base100', msg: '直接相減是把時間當成 100 進位了。先跳到整點，再跳剩下的。' } : { msg: '用時間線：先跳到整點，再跳剩下的。' }, say: ex => `還剩 ${ex.problem.remain} 分鐘。` }),
    nStep(2, { title: '需要多久', ask: '要做的事一共要幾分鐘？', id: 'need', hints: ['把每一件事要的時間加起來。', '走路的時間也要算。', '老師說要提早到，提早的分鐘也要加。'],
      think: '老師把每一件事的時間加起來，提早的時間也加進去。', together: '一起加：一共要幾分鐘？',
      pre: ctx => `<ul class="tm-tasks">${ctx.problem.c.tasks.map(t => `<li data-read>${t[0]}：${t[1]} 分鐘</li>`).join('')}${ctx.problem.buffer ? `<li data-read>提早到：${ctx.problem.buffer} 分鐘</li>` : ''}</ul>`,
      label: () => '一共要幾分鐘？', ans: ctx => ctx.problem.need,
      wrong: (ctx, v) => ctx.problem.buffer && v === ctx.problem.need - ctx.problem.buffer ? { obs: 'noBuffer', msg: '別忘了，老師說要提早到。' } : v === ctx.problem.c.tasks[ctx.problem.c.tasks.length - 1][1] ? { obs: 'arriveOnly', msg: '只算了走路。出發前要做的事也要算。' } : { msg: '每一件事都要加進去。' }, say: ex => `一共要 ${ex.problem.need} 分鐘。` }),
    cStep(3, { title: '選擇', ask: '還剩的時間夠不夠？', id: 'ok', fixed: true, hints: ['比一比：還剩幾分鐘、需要幾分鐘。', '需要的比還剩的少（或一樣），就來得及。', '需要的比還剩的多，就來不及。'],
      think: '老師比一比：還剩的時間，夠不夠做完要做的事。', together: '一起比：來得及嗎？',
      pre: ctx => `<p data-read data-say>還剩 ${ctx.problem.remain} 分鐘，需要 ${ctx.problem.need} 分鐘。</p>`,
      q: () => '來得及嗎？', opts: () => [['yes', '來得及'], ['no', '來不及']], ans: ctx => ctx.problem.ok ? 'yes' : 'no',
      wrong: ctx => ({ obs: 'other', msg: ctx.problem.ok ? `需要 ${ctx.problem.need} 分鐘，還剩 ${ctx.problem.remain} 分鐘，夠用。` : `需要 ${ctx.problem.need} 分鐘，可是只剩 ${ctx.problem.remain} 分鐘，不夠。` }), say: ex => ex.problem.ok ? '來得及。' : '來不及。' }),
    nStep(4, { title: '檢查', ask: '還多（或還差）幾分鐘？', id: 'gap', hints: ['兩個數相減。', '大的減小的。', '來得及：還多幾分鐘；來不及：還差幾分鐘。'],
      think: '老師再算一次：還多幾分鐘，或還差幾分鐘。', together: '一起算：差幾分鐘？',
      label: ctx => ctx.problem.ok ? '還多幾分鐘？（剛好就填 0）' : '還差幾分鐘？', ans: ctx => ctx.problem.gap, say: ex => ex.problem.ok ? `還多 ${ex.problem.gap} 分鐘。` : `還差 ${ex.problem.gap} 分鐘，要早一點開始。` })
  ];
  A.register('tmInTime', {
    methods: [['mark', '🏃 一步一步想'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeInTime, planFigure: nowFig, steps: inTimeSteps,
    reasons: [['deadline', '先找期限'], ['need', '把要做的事加起來'], ['compare', '比一比'], ['hint', '看提示']],
    done: ctx => ctx.problem.ok ? `來得及，還多 ${ctx.problem.gap} 分鐘。` : `來不及，還差 ${ctx.problem.gap} 分鐘。下次要提早 ${ctx.problem.gap} 分鐘以上開始。`,
    chant: '來得及嗎：先找期限，算還剩多久，再算需要多久，比一比。',
    transfer: '想一想：明天早上要幾點起床，上學才來得及？'
  });

  window.timeFig = { rnd, any, pad2, toMin, split, hmText, digital, to12, periodOf, say12, durText, base100Diff, minuteNo, clockSVG, digiHtml, clockPair, setClockHtml, bindClock, lineSVG, WEEK, daysIn, weekday, calHtml, ttHtml, fiveAid, convAid, nStep, cStep, hmStep, prompt, shown, ql, readWrong };
})();

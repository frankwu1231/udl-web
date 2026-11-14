'use strict';
// 第 28 版：折線圖教材包的共用工具與兩個核心活動（content-line.js）。
// 共用：折線圖（座標軸、刻度、波浪線、兩條線、導引線、描點連線）、生活情境的資料、數線。
// 核心活動 2-1（讀圖七步）：看題目 → 找零件 → 一格是多少 → 找時間 → 讀數值 → 回答問題 → 說說看。
// 核心活動 5-1（畫圖七步）：看表格 → 排橫軸 → 定刻度 → 描點 → 連線 → 寫標示 → 檢查與說明。
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml } = U;
  const r1 = n => Math.round(n * 10) / 10;
  const COLOR = ['#1f6fd1', '#d9480f'], SHAPE = ['圓點', '方塊'], STROKE = '#2b4a7a';

  // ---------- 生活情境 ----------
  const WEEK = ['一', '二', '三', '四', '五', '六', '日'], MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`), DAYS = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
  const CTX = {
    water: { title: '小安每天喝水的杯數', xName: '星期', xs: WEEK, full: x => '星期' + x, yName: '杯數', unit: '杯', what: '喝水' },
    dog: { title: '小狗每個月的體重', xName: '月份', xs: MONTHS, full: x => x, yName: '體重', unit: '公斤', what: '體重' },
    bean: { title: '豆芽每天的高度', xName: '第幾天', xs: DAYS, full: x => `第${x}天`, yName: '高度', unit: '公分', what: '高度' },
    rain: { title: '一週每天的下雨量', xName: '星期', xs: WEEK, full: x => '星期' + x, yName: '雨量', unit: '毫米', what: '下雨量' },
    jump: { title: '小美每天跳繩的次數', xName: '星期', xs: WEEK, full: x => '星期' + x, yName: '次數', unit: '下', what: '跳繩次數' },
    book: { title: '班上每個月借書的本數', xName: '月份', xs: MONTHS, full: x => x, yName: '本數', unit: '本', what: '借書本數' },
    save: { title: '小華每個月存的錢', xName: '月份', xs: MONTHS, full: x => x, yName: '金額', unit: '元', what: '存的錢' },
    temp: { title: '一週每天的最高氣溫', xName: '星期', xs: WEEK, full: x => '星期' + x, yName: '氣溫', unit: '度', what: '氣溫' },
    height: { title: '小傑每個月的身高', xName: '月份', xs: MONTHS, full: x => x, yName: '身高', unit: '公分', what: '身高' },
    sleep: { title: '小明每天睡覺的時數', xName: '星期', xs: WEEK, full: x => '星期' + x, yName: '時數', unit: '小時', what: '睡覺時數' }
  };
  // 三級難度：入門（3～4 個點、一格是 1、從 0 開始）、一般（5～7 個點、一格是 2、5 或 10）、挑戰（7 個點、點在兩格中間或波浪線）
  const LEVELS = {
    easy: [['water', { step: 1, lo: 1, hi: 8, n: 4 }], ['dog', { step: 1, lo: 2, hi: 9, n: 4 }], ['bean', { step: 1, lo: 1, hi: 9, n: 4, up: true }], ['rain', { step: 1, lo: 0, hi: 8, n: 4 }]],
    standard: [['jump', { step: 10, lo: 10, hi: 70, n: 7, every: 2 }], ['book', { step: 5, lo: 5, hi: 45, n: 6, every: 2 }], ['save', { step: 10, lo: 20, hi: 90, n: 6, every: 2 }], ['bean', { step: 2, lo: 2, hi: 18, n: 6, up: true, every: 2 }], ['temp', { step: 5, lo: 10, hi: 35, n: 7, every: 2 }]],
    challenge: [['save', { step: 10, lo: 20, hi: 90, n: 7, every: 2, half: true }], ['jump', { step: 10, lo: 10, hi: 80, n: 7, every: 2, half: true }], ['temp', { step: 1, lo: 21, hi: 31, n: 7, every: 2, brk: 20 }], ['height', { step: 1, lo: 131, hi: 145, n: 7, every: 5, up: true, brk: 130 }]]
  };
  const rnd = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
  // 一組資料：值都是 step 的倍數（half：可以有半格），相鄰兩個不一樣，最大的只有一個（same：可以有一段不變）
  function series(rand, n, c, o = {}) {
    const unit = c.half && !o.noHalf ? c.step / 2 : c.step, lo = Math.ceil(c.lo / unit), hi = Math.floor(c.hi / unit);
    for (let tries = 0; tries < 200; tries++) {
      let v;
      if (c.up) { v = [rnd(rand, lo, lo + 2)]; for (let i = 1; i < n; i++) v.push(Math.min(hi, v[i - 1] + rnd(rand, o.same && i === 2 ? 0 : 1, 3))); }
      else { v = Array.from({ length: n }, () => rnd(rand, lo, hi)); if (o.same && n > 2) v[2] = v[1]; }
      v = v.map(x => x * unit);
      const max = Math.max(...v), adj = v.every((x, i) => i === 0 || x !== v[i - 1] || (o.same && i === 2));
      if (!adj || v.filter(x => x === max).length !== 1) continue;
      if (c.up && new Set(v).size < n - (o.same ? 1 : 0)) continue;
      if (o.test && !o.test(v)) continue;
      return v;
    }
    return Array.from({ length: n }, (_, i) => (lo + (i * 7) % (hi - lo + 1)) * unit);
  }
  // 出題：level、第幾題、亂數；o.key 指定情境、o.n 點數、o.test 資料要通過的條件
  function makeChart(level, i, rand = Math.random, o = {}) {
    const list = (o.levels || LEVELS)[level] || LEVELS.standard;
    const [key, cfg0] = o.key ? (list.find(x => x[0] === o.key) || LEVELS.standard.find(x => x[0] === o.key) || pick(list, i)) : pick(list, i);
    const cfg = { ...cfg0, ...(o.cfg || {}) }, c = CTX[key], n = o.n || cfg.n || 5;
    const start = c.xs === MONTHS ? (o.startMonth ?? rnd(rand, 0, 12 - n)) : 0;
    const xs = c.xs.slice(start, start + n), v = series(rand, n, cfg, o);
    const every = cfg.every || 1, min = cfg.brk || 0, step = cfg.step;
    const hiV = Math.max(...v), top = Math.ceil((hiV + (o.room ? step : 0) - min) / (step * every)) * step * every + min;
    const rows = Math.max(every * 2, 4, Math.round((top - min) / step));
    return { key, title: c.title, xName: c.xName, yName: c.yName, unit: c.unit, what: c.what, xs, full: xs.map(c.full), series: [{ name: c.title, v }], min, step, rows, every, brk: !!cfg.brk, half: !!cfg.half, dims: [n, step, hiV] };
  }
  const valueOf = (p, i, s = 0) => p.series[s].v[i];
  const maxAt = (p, s = 0) => p.series[s].v.indexOf(Math.max(...p.series[s].v));
  const cellsOf = (p, v) => (v - p.min) / p.step;   // 從最下面一條格線往上數幾格

  // ---------- 折線圖 ----------
  // o.show 要畫的線（預設全部）、o.noLines 只畫點、o.noPoints、o.hideY 不寫縱軸的數、o.noTitle
  // o.clickX 橫軸的字可以點、o.clickPts 點可以點、o.guideX 從橫軸往上的導引線、o.guideY [i, s] 往左到縱軸的導引線
  // o.mark [[i, s]] 圈起來的點、o.seg 閃爍的線段 j（j 到 j+1）、o.legend 圖例、o.pulseY 縱軸的字閃爍、o.pulseX 橫軸閃爍
  // o.plot {s, pts:{i:v}, path:[i…], cells:true（格線交叉點可以點）, link:true（點可以點來連線）}
  function chartSVG(p, o = {}) {
    const n = p.xs.length, rows = p.rows;
    const colW = Math.max(42, Math.min(66, 430 / n)), rowH = Math.max(15, Math.min(32, 250 / rows));
    const L = 70, T = o.noTitle ? 34 : 56, G = p.brk ? 22 : 0;
    const y0 = T + rows * rowH, W = L + colW * n + 24, H = y0 + G + 52 + (o.legend ? 30 : 0);
    const X = i => r1(L + colW * (i + 0.5)), Y = v => r1(y0 - (v - p.min) / p.step * rowH);
    let g = '';
    if (!o.noTitle) g += `<text x="${r1(W / 2)}" y="24" text-anchor="middle" class="ln-title" data-part="title">${esc(p.title)}</text>`;
    // 格線
    for (let k = 0; k <= rows; k++) g += `<path d="M${L} ${r1(y0 - k * rowH)}H${r1(L + colW * n)}" class="ln-grid${k % p.every === 0 ? ' ln-grid-major' : ''}"/>`;
    for (let i = 0; i < n; i++) g += `<path d="M${X(i)} ${T}V${y0}" class="ln-grid ln-grid-v"/>`;
    // 縱軸的數
    if (!o.hideY) for (let k = 0; k <= rows; k += p.every) g += `<text x="${L - 8}" y="${r1(y0 - k * rowH + 5)}" text-anchor="end" class="ln-ytick${o.pulseY ? ' ac-pulse-text' : ''}">${p.min + k * p.step}</text>`;
    // 座標軸（波浪線：0 和第一條格線中間畫折線，表示省略）
    g += `<path d="M${L} ${T - 6}V${y0}" class="ln-axis"/>`;
    if (p.brk) g += `<path d="M${L} ${y0}l-7 4l14 5l-14 5l7 4V${y0 + G}" class="ln-axis ln-break" data-part="break"/><text x="${L - 8}" y="${y0 + G + 5}" text-anchor="end" class="ln-ytick">0</text>`;
    g += `<path d="M${L} ${y0 + G}H${r1(L + colW * n + 10)}" class="ln-axis${o.pulseX ? ' ac-pulse-line' : ''}"/>`;
    g += `<text x="${L - 6}" y="${T - 12}" text-anchor="middle" class="ln-name" data-part="y">${esc(p.yName)}（${esc(p.unit)}）</text>`;
    g += `<text x="${r1(L + colW * n + 12)}" y="${y0 + G + 40}" text-anchor="end" class="ln-name" data-part="x">${esc(p.xName)}</text>`;
    // 橫軸的字
    p.xs.forEach((x, i) => {
      const on = o.pickX === i;
      g += `<text x="${X(i)}" y="${y0 + G + 22}" text-anchor="middle" class="ln-xtick${on ? ' on' : ''}">${esc(x)}</text>`;
      if (o.clickX) g += `<rect x="${r1(X(i) - colW / 2 + 2)}" y="${y0 + G + 4}" width="${r1(colW - 4)}" height="26" rx="6" class="ln-hit${on ? ' on' : ''}" data-x="${i}" role="button" tabindex="0" aria-label="${esc(p.full[i])}"/>`;
    });
    // 導引線
    if (o.guideX != null) { const s = o.guideS || 0, v = valueOf(p, o.guideX, s); g += `<path d="M${X(o.guideX)} ${y0 + G}V${Y(v)}" class="ln-guide"/>`; }
    if (o.guideY) { const [i, s = 0] = o.guideY, v = valueOf(p, i, s); g += `<path d="M${X(i)} ${Y(v)}H${L}" class="ln-guide"/>`; }
    // 資料的線和點
    const show = o.show || p.series.map((_, s) => s);
    for (const s of show) {
      const v = p.series[s].v, pts = v.map((y, i) => `${X(i)},${Y(y)}`);
      if (!o.noLines) g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLOR[s]}" stroke-width="3.5" class="ln-line"/>`;
      if (o.seg != null && o.seg < v.length - 1) g += `<path d="M${pts[o.seg]}L${pts[o.seg + 1]}" stroke="#f59f00" stroke-width="9" stroke-linecap="round" fill="none" class="ac-pulse-line" opacity="0.8"/>`;
      if (!o.noPoints) v.forEach((y, i) => {
        const mk = (o.mark || []).some(m => m[0] === i && (m[1] || 0) === s);
        if (mk) g += `<circle cx="${X(i)}" cy="${Y(y)}" r="14" fill="#fff2b3" stroke="#f59f00" stroke-width="3" class="ac-pulse"/>`;
        g += s === 0 ? `<circle cx="${X(i)}" cy="${Y(y)}" r="6" fill="${COLOR[s]}"/>` : `<rect x="${X(i) - 6}" y="${Y(y) - 6}" width="12" height="12" fill="${COLOR[s]}"/>`;
        if (o.clickPts) g += `<circle cx="${X(i)}" cy="${Y(y)}" r="16" class="ln-hit-pt" data-pt="${s}:${i}" role="button" tabindex="0" aria-label="${esc(p.full[i])}的點"/>`;
      });
    }
    // 學生描的點和連的線
    if (o.plot) {
      const P = o.plot, s = P.s || 0, pts = P.pts || {};
      if (P.cells) for (let i = 0; i < n; i++) for (let k = 0; k <= rows; k++) {
        const v = p.min + k * p.step;
        g += `<circle cx="${X(i)}" cy="${Y(v)}" r="${Math.min(9, rowH / 2 - 1)}" class="ln-cell" data-cell="${i}:${v}" role="button" tabindex="0" aria-label="${esc(p.full[i])}，${v}"/>`;
      }
      const path = P.path || [];
      for (let j = 1; j < path.length; j++) { const a = path[j - 1], b = path[j]; if (pts[a] != null && pts[b] != null) g += `<path d="M${X(a)} ${Y(pts[a])}L${X(b)} ${Y(pts[b])}" stroke="${COLOR[s]}" stroke-width="3.5" fill="none" class="ln-line"/>`; }
      for (const [i, v] of Object.entries(pts)) {
        if (v == null) continue; const x = X(Number(i)), y = Y(v), sel = path.at(-1) === Number(i) && P.link;
        g += s === 0 ? `<circle cx="${x}" cy="${y}" r="${sel ? 9 : 6}" fill="${COLOR[s]}" class="ln-mine${sel ? ' on' : ''}"/>` : `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${COLOR[s]}" class="ln-mine"/>`;
        if (P.link) g += `<circle cx="${x}" cy="${y}" r="16" class="ln-hit-pt" data-link="${i}" role="button" tabindex="0" aria-label="${esc(p.full[i])}的點"/>`;
      }
    }
    if (o.legend) {
      // 圖例放在圖的下面，不會蓋住點
      const names = p.series.map(s => s.name), ly = y0 + G + 64, wEach = 44 + 15 * Math.max(...names.map(x => x.length));
      g += `<rect x="${L}" y="${ly - 18}" width="${wEach * names.length + 8}" height="28" fill="#fff" stroke="#c9d6ea" rx="6" class="ln-legend"/>`;
      names.forEach((nm, s) => { const lx = L + 8 + s * wEach; g += (s === 0 ? `<circle cx="${lx + 8}" cy="${ly - 4}" r="6" fill="${COLOR[s]}"/>` : `<rect x="${lx + 2}" y="${ly - 10}" width="12" height="12" fill="${COLOR[s]}"/>`) + `<path d="M${lx - 2} ${ly - 4}h20" stroke="${COLOR[s]}" stroke-width="3"/><text x="${lx + 24}" y="${ly + 1}" class="ln-legend-t">${esc(nm)}</text>`; });
    }
    const vals = p.series.map(s => `${s.name}：${s.v.map((y, i) => p.full[i] + ' ' + y).join('、')}`).join('；');
    return `<svg class="ac-svg ln-svg" viewBox="0 0 ${r1(W)} ${r1(H)}" style="max-width:${r1(W * 1.35)}px" role="img" aria-label="${esc(o.plot ? '畫折線圖的方格' : '折線圖：' + vals)}">${g}</svg>`;
  }
  // 表格（一維）：第一列是橫軸的時間，第二列是數值；o.hl 要亮的欄；o.rows 多列（兩條線）
  function tableHtml(p, o = {}) {
    const rows = o.series || p.series;
    return `<table class="ln-table"><caption>${esc(p.title)}</caption><thead><tr><th scope="row">${esc(p.xName)}</th>${p.xs.map((x, i) => `<th scope="col" class="${o.hl === i ? 'on' : ''}">${esc(x)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(s => `<tr><th scope="row">${esc(rows.length > 1 ? s.name : p.yName)}（${esc(p.unit)}）</th>${s.v.map((y, i) => `<td class="${o.hl === i ? 'on' : ''}">${y}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  // 數線（0-2）：0 到 end，每一格是 step，只標 0 和每 every 格；o.arrow 箭頭指的數
  function numberLineSVG(o) {
    const cells = Math.round(o.end / o.step), u = Math.min(52, 460 / cells), x0 = 30, y = 50;
    let g = `<path d="M${x0} ${y}H${r1(x0 + cells * u)}" class="ln-axis"/>`;
    for (let k = 0; k <= cells; k++) {
      const x = r1(x0 + k * u), lab = k === 0 || k % o.every === 0 || k === cells;
      g += `<path d="M${x} ${y - (lab ? 12 : 8)}V${y + (lab ? 12 : 8)}" class="ln-axis${o.pulseTicks ? ' ac-pulse-line' : ''}"/>`;
      if (lab) g += `<text x="${x}" y="${y + 34}" text-anchor="middle" class="ln-ytick">${k * o.step}</text>`;
    }
    if (o.arrow != null) { const x = r1(x0 + o.arrow / o.step * u); g += `<path d="M${x} ${y - 40}V${y - 16}" stroke="#d9480f" stroke-width="4" marker-end="url(#lnArrow)"/><text x="${x}" y="${y - 44}" text-anchor="middle" class="ln-name">？</text>`; }
    if (o.braces) g += `<path d="M${x0} ${y + 44}H${r1(x0 + u * o.every)}" stroke="#0b7a43" stroke-width="5"/><text x="${r1(x0 + u * o.every / 2)}" y="${y + 64}" text-anchor="middle" class="ln-name">${o.every} 格</text>`;
    return `<svg class="ac-svg" viewBox="0 0 ${r1(x0 * 2 + cells * u)} ${o.braces ? 124 : 100}" role="img" aria-label="數線，從 0 到 ${o.end}"><defs><marker id="lnArrow" viewBox="0 0 10 10" refX="5" refY="8" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#d9480f" transform="rotate(90 5 5)"/></marker></defs>${g}</svg>`;
  }

  // ---------- 共用的步驟 ----------
  const methods = [['mark', '📈 先看圖，一步一步找'], ['self', '🧠 先自己想，需要時看提示']];
  // 一格是多少：看兩個寫了數的刻度。n 是第幾步、key 是答案的欄位
  const scaleObs = (p, v) => v === 1 && p.step !== 1 ? 'scaleAsOne' : Math.abs(v - p.step) === 1 ? 'offByOne' : 'other';
  function scaleStep(n, o = {}) {
    return { title: '一格是多少', ids: ['scale'], hints: ['看縱軸上兩個寫了數的刻度。', '兩個數差多少？中間分成幾格？', '兩個寫了數的刻度相差的數，除以中間的格數，就是一格。'],
      think: '老師看兩個寫了數的刻度：相差多少、中間有幾格。', together: '一起看：一格代表多少？',
      figure: ctx => chartSVG(ctx.problem, { ...(o.fig ? o.fig(ctx) : {}), pulseY: ctx.hint(n) >= 2 }),
      answer: ctx => { const p = ctx.problem, b = p.min + p.every * p.step; return `<p data-read data-say>縱軸上 ${p.min} 和 ${b} 中間有 ${p.every} 格。</p>${fieldHtml(ctx, 'scale', '一格代表多少？', n)}`; },
      check: ctx => { const v = num(ctx.answers.scale), p = ctx.problem; return v === null ? { code: 'scale', msg: '把一格代表多少填進去。' } : v === p.step ? null
        : { code: 'scale', obs: scaleObs(p, v), msg: v === 1 && p.step !== 1 ? `一格不是 1。看一看：${p.min} 到 ${p.min + p.every * p.step} 中間只有 ${p.every} 格。` : v === p.step * p.every ? '這是兩個寫了數的刻度相差的數。中間還分成好幾格。' : '算一算：兩個刻度相差的數，除以中間的格數。' }; },
      solve: ctx => { ctx.answers.scale = String(ctx.problem.step); }, say: ex => `一格是 ${ex.problem.step}。` };
  }
  // 讀數值：從點往左對到縱軸。o.i 是哪一個點（ctx => i）、o.s 哪一條線
  function readObs(p, v, i, s = 0) {
    const ans = valueOf(p, i, s), other = p.series[1 - s];
    if (v === null) return 'blank';
    if (other && v === other.v[i]) return 'legendMix';
    if ((i > 0 && v === valueOf(p, i - 1, s)) || (i < p.xs.length - 1 && v === valueOf(p, i + 1, s))) return 'misalign';
    if (p.brk && v === cellsOf(p, ans) * p.step) return 'ignoreBreak';
    if (p.step !== 1 && v === p.min + cellsOf(p, ans)) return 'scaleAsOne';
    if (Math.abs(v - ans) === p.step) return 'misalign';
    return Math.abs(v - ans) === 1 ? 'offByOne' : 'other';
  }
  const readMsg = (code, p) => ({ legendMix: '這是另一條線的點。先看圖例，找對顏色。', misalign: '對到隔壁了。從點直直往左，對到縱軸。', ignoreBreak: '縱軸有波浪線，下面的數省略了，不是從 0 開始數。', scaleAsOne: `一格不是 1，一格是 ${p.step}。` }[code] || '從點往左對到縱軸，再看一次。');
  // 單位
  function unitStep(n, o = {}) {
    return { title: o.title || '寫單位', ids: ['unit'], hints: ['看縱軸旁邊的括號。', '縱軸的名稱後面，括號裡寫的就是單位。', '單位寫在縱軸名稱的括號裡。'],
      think: '老師看縱軸旁邊的括號，找單位。', together: '一起找：單位是什麼？',
      answer: ctx => { const p = ctx.problem, opts = [...new Set([p.unit, '公分', '度', '本', '元', '杯'])].slice(0, 3).map(u => [u, u]); return `${o.pre ? o.pre(ctx) : ''}${ctx.choice('unit', '答案的單位是什麼？', opts)}`; },
      check: ctx => !ctx.answers.unit ? { code: 'unit', msg: '選一個單位。' } : ctx.answers.unit === ctx.problem.unit ? null : { code: 'unit', obs: 'wrongChoice', msg: '看縱軸旁邊的括號，那就是單位。' },
      solve: ctx => { ctx.answers.unit = ctx.problem.unit; }, say: ex => `單位是${ex.problem.unit}。` };
  }
  // 點選橫軸的時間（ctx.state.xi），want(ctx) 是要點的時間
  function bindX(n, key = 'xi', after) {
    return ctx => document.querySelectorAll(`#figure${n} [data-x]`).forEach(el => {
      const go = () => { ctx.state[key] = Number(el.dataset.x); ctx.answers[key] = el.dataset.x; ctx.log('點橫軸', { x: Number(el.dataset.x) }); ctx.invalidate(n); after ? after(ctx) : ctx.refreshFigure(n); };
      el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
  }
  // 描點：點格線的交叉點；同一個時間再點一次就換位置
  function bindCells(n, s = 0) {
    return ctx => document.querySelectorAll(`#figure${n} [data-cell]`).forEach(el => {
      const go = () => { const [i, v] = el.dataset.cell.split(':').map(Number), st = ctx.state; st.pts = st.pts || {}; st.pts[i] = st.pts[i] === v ? null : v; if (st.pts[i] == null) delete st.pts[i];
        ctx.answers['pts' + s] = String(Object.keys(st.pts).length); ctx.log('描點', { i, v }); ctx.invalidate(n); ctx.refreshFigure(n); };
      el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
  }
  // 連線：依序點描好的點
  function bindLink(n) {
    return ctx => {
      document.querySelectorAll(`#figure${n} [data-link]`).forEach(el => {
        const go = () => { const i = Number(el.dataset.link), st = ctx.state; st.path = st.path || []; if (st.path.at(-1) === i) return; st.path.push(i); ctx.answers.path = st.path.join(','); ctx.log('連線', { to: i }); ctx.invalidate(n); ctx.refreshFigure(n); };
        el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      });
      const b = document.getElementById('lnUnlink'); if (b) b.onclick = () => { ctx.state.path = []; delete ctx.answers.path; ctx.log('重新連線'); ctx.invalidate(n); ctx.rerender(); };
    };
  }
  // 描點的檢查：每個點都要和表格一樣
  function plotCheck(p, pts, s = 0) {
    const v = p.series[s].v, miss = v.map((y, i) => i).filter(i => pts[i] == null), wrong = v.map((y, i) => i).filter(i => pts[i] != null && pts[i] !== v[i]);
    if (!miss.length && !wrong.length) return null;
    if (miss.length) { const zero = miss.some(i => v[i] === 0); return { code: 'plot', obs: zero ? 'zeroMissing' : 'unfinished', msg: zero ? `${miss.map(i => p.full[i]).join('、')}還沒描。數值是 0 的也要描在最下面。` : `還有 ${miss.map(i => p.full[i]).join('、')}沒有描點。` }; }
    const i = wrong[0], d = pts[i] - v[i];
    return { code: 'plot', obs: Math.abs(d) === p.step ? 'misalign' : (p.step !== 1 && pts[i] === p.min + cellsOf(p, v[i])) ? 'scaleAsOne' : 'other', msg: `${wrong.map(j => p.full[j]).join('、')}的點位置不對。看表格的數，一格是 ${p.step}。` };
  }
  const pathOk = (path, n) => path.length === n && path.every((x, i) => x === i);

  // ---------- 核心活動 2-1：讀圖七步 ----------
  // 題目：某個時間的數值，和前一個時間比，是變多還是變少
  function makeRead(level, i, rand = Math.random) {
    const p = makeChart(level, i, rand);
    const ti = 1 + Math.floor(rand() * (p.xs.length - 1)), v = valueOf(p, ti), b = valueOf(p, ti - 1);
    return { ...p, ti, cmp: v > b ? 'more' : v < b ? 'less' : 'same', prompt: `看「${p.title}」。${p.full[ti]}是多少${p.unit}？和${p.full[ti - 1]}比，變多還是變少？` };
  }
  const readSteps = [
    { title: '看題目', ids: ['ask'], hints: ['讀一讀題目，題目要你找什麼？', '題目說了一個時間，要找它的數。', `題目要找某一個時間的數是多少。`],
      think: '老師讀題目：題目說了一個時間，要找那個時間的數。', together: '一起讀：題目要找什麼？',
      figure: ctx => chartSVG(ctx.problem, {}),
      answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('ask', '題目要你先找什麼？', [['value', `${esc(ctx.problem.full[ctx.problem.ti])}的數是多少`], ['max', '哪一個時間最多'], ['all', '全部加起來是多少']])}`,
      check: ctx => !ctx.answers.ask ? { code: 'ask', msg: '先選一個答案。' } : ctx.answers.ask === 'value' ? null : { code: 'ask', obs: 'wrongChoice', msg: `再讀一次題目：題目問的是${ctx.problem.full[ctx.problem.ti]}。` },
      solve: ctx => { ctx.answers.ask = 'value'; }, say: ex => `題目要找${ex.problem.full[ex.problem.ti]}的數。` },
    { title: '找零件', ids: ['xax', 'yax'], hints: ['看圖的下面和左邊。', '下面那條是橫軸，左邊那條是縱軸。', '橫軸寫時間，縱軸寫數量和單位。'],
      think: '老師看：下面的橫軸寫時間，左邊的縱軸寫數量和單位。', together: '一起找：橫軸和縱軸寫什麼？',
      figure: ctx => chartSVG(ctx.problem, { pulseX: ctx.hint(1) >= 2, pulseY: ctx.hint(1) >= 2 }),
      answer: ctx => { const p = ctx.problem; return `${ctx.choice('xax', '下面的橫軸寫的是什麼？', [['x', esc(p.xName)], ['y', esc(p.yName)], ['t', '圖的名稱']])}${ctx.choice('yax', '左邊的縱軸寫的是什麼？', [['y', `${esc(p.yName)}（${esc(p.unit)}）`], ['x', esc(p.xName)], ['t', '圖的名稱']])}`; },
      check: ctx => { const a = ctx.answers; if (!a.xax || !a.yax) return { code: 'axes', msg: '兩題都要選。' }; if (a.xax === 'x' && a.yax === 'y') return null;
        return { code: 'axes', obs: a.xax === 'y' && a.yax === 'x' ? 'swapped' : 'wrongChoice', msg: a.xax === 'y' && a.yax === 'x' ? '橫軸和縱軸對調了。橫軸是下面那一條。' : '看一看：下面那一條是橫軸，左邊那一條是縱軸。' }; },
      solve: ctx => { ctx.answers.xax = 'x'; ctx.answers.yax = 'y'; }, say: ex => `橫軸是${ex.problem.xName}，縱軸是${ex.problem.yName}。` },
    scaleStep(2),
    { title: '找時間', ids: ['xi'], hints: ['在橫軸上找題目說的時間。', '點一下橫軸上的字。', '點了以後，會出現往上的線。'],
      think: '老師在橫軸上找到題目說的時間，點一下。', together: '一起找：題目說的時間在哪裡？',
      figure: ctx => chartSVG(ctx.problem, { clickX: true, pickX: ctx.state.xi, guideX: ctx.state.xi === ctx.problem.ti ? ctx.problem.ti : null, mark: ctx.hint(3) >= 2 ? [[ctx.problem.ti, 0]] : [] }),
      answer: ctx => `<p data-read data-say>題目問的是${esc(ctx.problem.full[ctx.problem.ti])}。在橫軸上點一下它。</p>${ctx.state.xi != null ? `<p class="notice" data-read data-say>你點了：${esc(ctx.problem.full[ctx.state.xi])}</p>` : ''}`,
      bind: bindX(3),
      check: ctx => { const x = ctx.state.xi, p = ctx.problem; if (x == null) return { code: 'xi', obs: 'unfinished', msg: '在橫軸上點題目說的時間。' };
        return x === p.ti ? null : { code: 'xi', obs: Math.abs(x - p.ti) === 1 ? 'misalign' : 'wrongChoice', msg: `你點的是${p.full[x]}。題目問的是${p.full[p.ti]}。` }; },
      solve: ctx => { ctx.state.xi = ctx.problem.ti; ctx.answers.xi = String(ctx.problem.ti); }, say: ex => `找到${ex.problem.full[ex.problem.ti]}，往上找到點。` },
    { title: '讀數值', ids: ['val'], hints: ['從點往左，對到縱軸。', '看閃爍的線，對到縱軸上的哪裡。', '對到的地方，數一數一格是多少，算出來。'],
      think: '老師從點直直往左，對到縱軸，再看是多少。', together: '一起讀：從點往左對到哪裡？',
      figure: ctx => chartSVG(ctx.problem, { guideX: ctx.problem.ti, guideY: ctx.hint(4) >= 1 || ctx.checked(4) ? [ctx.problem.ti, 0] : null, mark: [[ctx.problem.ti, 0]] }),
      answer: ctx => fieldHtml(ctx, 'val', `${esc(ctx.problem.full[ctx.problem.ti])}是多少？`, 4),
      check: ctx => { const p = ctx.problem, v = num(ctx.answers.val); if (v === null) return { code: 'val', msg: '把讀到的數填進去。' };
        if (v === valueOf(p, p.ti)) return null; const obs = readObs(p, v, p.ti); return { code: 'val', obs, msg: readMsg(obs, p) }; },
      solve: ctx => { ctx.answers.val = String(valueOf(ctx.problem, ctx.problem.ti)); }, say: ex => `${ex.problem.full[ex.problem.ti]}是 ${valueOf(ex.problem, ex.problem.ti)}。` },
    { title: '回答問題', ids: ['cmp'], hints: ['再找前一個時間的點。', '兩個點比一比，哪一個比較高？', '點比較高，數就比較多。'],
      think: '老師比一比兩個點：後面的點比較高，就是變多。', together: '一起比：變多還是變少？',
      figure: ctx => chartSVG(ctx.problem, { mark: [[ctx.problem.ti, 0], [ctx.problem.ti - 1, 0]], seg: ctx.hint(5) >= 2 ? ctx.problem.ti - 1 : null }),
      answer: ctx => { const p = ctx.problem; return `<p data-read data-say>${esc(p.full[p.ti - 1])}是 ${valueOf(p, p.ti - 1)}，${esc(p.full[p.ti])}是 ${esc(ctx.answers.val ?? '？')}。</p>${ctx.choice('cmp', `和${esc(p.full[p.ti - 1])}比，${esc(p.full[p.ti])}怎麼樣？`, [['more', '變多'], ['less', '變少'], ['same', '一樣']], true)}`; },
      check: ctx => !ctx.answers.cmp ? { code: 'cmp', msg: '先選一個答案。' } : ctx.answers.cmp === ctx.problem.cmp ? null : { code: 'cmp', obs: 'wrongChoice', msg: '看兩個點：後面的點比較高還是比較低？' },
      solve: ctx => { ctx.answers.cmp = ctx.problem.cmp; }, say: ex => ({ more: '線往上，變多了。', less: '線往下，變少了。', same: '線平平的，一樣。' })[ex.problem.cmp] },
    { title: '說說看', ids: ['unit', 'why'], hints: ['單位寫在縱軸的括號裡。', '根據要說「圖上看到的」。', '選一句說出點在哪裡的話。'],
      think: '老師說：答案要有單位，還要說出圖上的根據。', together: '一起說：單位和根據。',
      answer: ctx => { const p = ctx.problem, v = valueOf(p, p.ti);
        return `${ctx.choice('unit', '答案的單位是什麼？', [...new Set([p.unit, '公分', '個'])].slice(0, 3).map(u => [u, u]))}${ctx.choice('why', '你是怎麼知道的？', [['see', `因為${esc(p.full[p.ti])}的點，往左對到 ${v}`], ['top', `因為${esc(p.full[p.ti])}的點最高`], ['guess', '我猜的']])}`; },
      check: ctx => { const a = ctx.answers, p = ctx.problem; if (!a.unit || !a.why) return { code: 'tell', msg: '兩題都要選。' }; if (a.unit !== p.unit) return { code: 'tell', obs: 'wrongChoice', msg: '單位寫在縱軸旁邊的括號裡。' };
        return a.why === 'see' ? null : { code: 'tell', obs: 'wrongChoice', msg: '根據要說圖上看到的：點往左對到哪一個數。' }; },
      solve: ctx => { ctx.answers.unit = ctx.problem.unit; ctx.answers.why = 'see'; }, say: ex => `${ex.problem.full[ex.problem.ti]}的點往左對到 ${valueOf(ex.problem, ex.problem.ti)}，是 ${valueOf(ex.problem, ex.problem.ti)} ${ex.problem.unit}。` }
  ];
  A.register('lnRead', {
    methods, makeProblem: makeRead, planFigure: ctx => chartSVG(ctx.problem, {}), steps: readSteps,
    reasons: [['axis', '先看橫軸、縱軸'], ['scale', '算一格是多少'], ['guide', '用導引線對齊'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem, v = valueOf(p, p.ti); return `${p.full[p.ti]}是 ${v} ${p.unit}，和${p.full[p.ti - 1]}比，${{ more: '變多', less: '變少', same: '一樣' }[p.cmp]}。`; },
    chant: '讀折線圖：找時間，往上找點，再往左對到數。',
    transfer: '找一找：報紙或課本裡有沒有折線圖？它記錄的是什麼？'
  });

  // ---------- 核心活動 5-1：畫圖七步 ----------
  function makeDraw(level, i, rand = Math.random) {
    const lv = { easy: [LEVELS.easy[0], LEVELS.easy[3], LEVELS.easy[1], LEVELS.easy[2]], standard: LEVELS.standard.map(([k, c]) => [k, { ...c, every: 1 }]), challenge: LEVELS.standard.map(([k, c]) => [k, { ...c, every: 1, n: 7 }]) };
    // 5-1 有一天是 0 的資料（下雨量）：入門排在第 2 種情境（題號每 3 題輪一次），一定碰得到
    const p = makeChart(level, i, rand, { levels: lv, room: true, test: v => level !== 'easy' || pick(lv.easy, i)[0] !== 'rain' || v.includes(0) });
    const mx = maxAt(p);
    return { ...p, mx, prompt: `把表格「${p.title}」畫成折線圖。縱軸一格是 ${p.step} ${p.unit}。` };
  }
  const shuffled = (n, seed) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = (seed * 7 + i * 3) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.every((x, i) => x === i) ? a.reverse() : a; };
  const drawSteps = [
    { title: '看表格', ids: ['title'], hints: ['看表格上面的標題和第一列。', '表格記的是什麼？在什麼時間？', '圖的名稱就是表格記錄的東西。'],
      think: '老師先看表格：它記錄的是什麼。', together: '一起看：這張表在記錄什麼？',
      figure: ctx => tableHtml(ctx.problem),
      answer: ctx => { const p = ctx.problem, others = Object.values(CTX).filter(c => c.title !== p.title).map(c => c.title); return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('title', '這張圖的名稱要寫什麼？', [['ok', esc(p.title)], ['a', esc(pick(others, p.xs.length))], ['b', esc(pick(others, p.xs.length + 3))]])}`; },
      check: ctx => !ctx.answers.title ? { code: 'title', msg: '先選一個答案。' } : ctx.answers.title === 'ok' ? null : { code: 'title', obs: 'wrongChoice', msg: '看表格上面的標題，再選一次。' },
      solve: ctx => { ctx.answers.title = 'ok'; }, say: ex => `圖的名稱是「${ex.problem.title}」。` },
    { title: '排橫軸', ids: ['order'], hints: ['橫軸要照時間的順序排。', '從最早的開始，一個一個點。', '先點最早的時間，再點下一個。'],
      think: '老師照時間的順序，從最早的開始排。', together: '一起排：哪一個時間最早？',
      figure: ctx => { const p = ctx.problem, o = ctx.state.order || []; return `<div class="ln-slots" aria-label="橫軸">${p.xs.map((x, i) => `<span class="ln-slot${o[i] != null ? ' on' : ''}">${o[i] != null ? esc(p.xs[o[i]]) : '　'}</span>`).join('')}</div><p class="subtle" data-read>${esc(p.xName)}</p>`; },
      answer: ctx => { const p = ctx.problem, o = ctx.state.order || [], mix = shuffled(p.xs.length, p.xs.length + p.step);
        return `<p data-read data-say>照時間的順序，一個一個點，放到橫軸上。</p><div class="actions ln-chips">${mix.map(i => `<button type="button" data-chip="${i}" ${o.includes(i) ? 'disabled' : ''}>${esc(p.xs[i])}</button>`).join('')}<button type="button" id="lnUnorder" class="secondary">重新排</button></div>`; },
      bind: ctx => { document.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { const o = ctx.state.order = ctx.state.order || []; o.push(Number(b.dataset.chip)); ctx.answers.order = o.join(','); ctx.log('排橫軸', { x: Number(b.dataset.chip) }); ctx.invalidate(1); ctx.rerender(); });
        const r = document.getElementById('lnUnorder'); if (r) r.onclick = () => { ctx.state.order = []; delete ctx.answers.order; ctx.invalidate(1); ctx.rerender(); }; },
      check: ctx => { const o = ctx.state.order || [], n = ctx.problem.xs.length; if (o.length < n) return { code: 'order', obs: 'unfinished', msg: `還有 ${n - o.length} 個沒有排。` };
        return o.every((x, i) => x === i) ? null : { code: 'order', obs: 'orderJump', msg: '順序不對。橫軸要從最早的時間排到最晚的。按「重新排」再試一次。' }; },
      solve: ctx => { ctx.state.order = ctx.problem.xs.map((_, i) => i); ctx.answers.order = ctx.state.order.join(','); }, say: ex => `從${ex.problem.full[0]}排到${ex.problem.full.at(-1)}。` },
    { title: '定刻度', ids: ['scale'], hints: ['看縱軸上寫的數。', '相鄰兩條格線差多少？', '相鄰兩個數的差，就是一格。'],
      think: '老師看縱軸：相鄰兩條格線差多少，就是一格。', together: '一起看：一格是多少？',
      figure: ctx => chartSVG({ ...ctx.problem, series: [] }, { pulseY: ctx.hint(2) >= 2 }),
      answer: ctx => { const p = ctx.problem; return ctx.choice('scale', '縱軸一格代表多少？', [...new Set([p.step, 1, p.step * 2, p.step === 1 ? 2 : 5])].slice(0, 3).map(x => [String(x), `${x} ${esc(p.unit)}`])); },
      check: ctx => { const v = Number(ctx.answers.scale), p = ctx.problem; if (!ctx.answers.scale) return { code: 'scale', msg: '先選一個答案。' }; return v === p.step ? null : { code: 'scale', obs: v === 1 ? 'scaleAsOne' : 'wrongChoice', msg: `看相鄰兩條格線上的數：差 ${p.step}。` }; },
      solve: ctx => { ctx.answers.scale = String(ctx.problem.step); }, say: ex => `一格是 ${ex.problem.step}。` },
    { title: '描點', ids: ['pts0'], hints: ['看表格的數，在那個時間的上面點。', '從 0 往上數：一格是多少，要幾格？', '每個時間都要描一個點，0 也要描。'],
      think: '老師看表格，在每個時間的上面，找到那個數的位置點下去。', together: '一起描：這個時間的數在哪裡？',
      figure: ctx => `${tableHtml(ctx.problem)}${chartSVG({ ...ctx.problem, series: [{ ...ctx.problem.series[0], v: [] }] }, { plot: { pts: ctx.state.pts || {}, cells: true }, noTitle: true })}`,
      answer: ctx => `<p data-read data-say>在方格上點，把表格的每一個數描成點。點錯了，再點一次就會拿掉。</p><p class="notice" data-read data-say>描了 ${Object.keys(ctx.state.pts || {}).length} 個點，共 ${ctx.problem.xs.length} 個。</p>`,
      bind: bindCells(3),
      check: ctx => plotCheck(ctx.problem, ctx.state.pts || {}),
      solve: ctx => { const st = ctx.state; st.pts = Object.fromEntries(ctx.problem.series[0].v.map((y, i) => [i, y])); ctx.answers.pts0 = String(ctx.problem.xs.length); }, say: ex => `照表格描了 ${ex.problem.xs.length} 個點。` },
    { title: '連線', ids: ['path'], hints: ['從最早的時間開始，一個一個點過去。', '照時間的順序，點相鄰的下一個點。', '從第一個點連到最後一個點，不要跳過。'],
      think: '老師照時間的順序，把相鄰的點連起來。', together: '一起連：下一個要連哪一個點？',
      figure: ctx => chartSVG({ ...ctx.problem, series: [{ ...ctx.problem.series[0], v: [] }] }, { plot: { pts: ctx.state.pts || Object.fromEntries(ctx.problem.series[0].v.map((y, i) => [i, y])), path: ctx.state.path || [], link: true }, noTitle: true, mark: [] }),
      answer: ctx => `<p data-read data-say>從${esc(ctx.problem.full[0])}開始，照順序點每一個點，就會連成線。</p><div class="actions"><button type="button" id="lnUnlink" class="secondary">重新連</button></div>`,
      bind: bindLink(4),
      check: ctx => { const path = ctx.state.path || [], n = ctx.problem.xs.length; if (path.length < n && path.every((x, i) => x === i)) return { code: 'path', obs: 'unfinished', msg: `還沒連完，連到${ctx.problem.full[n - 1]}。` };
        return pathOk(path, n) ? null : { code: 'path', obs: 'orderJump', msg: '沒有照時間的順序連。按「重新連」，從第一個點開始。' }; },
      solve: ctx => { const p = ctx.problem; ctx.state.pts = ctx.state.pts || Object.fromEntries(p.series[0].v.map((y, i) => [i, y])); ctx.state.path = p.xs.map((_, i) => i); ctx.answers.path = ctx.state.path.join(','); }, say: () => '照順序連起來了。' },
    { title: '寫標示', ids: ['yname', 'unit'], hints: ['縱軸要寫記錄的是什麼。', '縱軸的名稱後面，括號寫單位。', '看表格第二列寫的名稱和單位。'],
      think: '老師在縱軸寫名稱，括號裡寫單位。', together: '一起寫：縱軸的名稱和單位。',
      figure: ctx => tableHtml(ctx.problem),
      answer: ctx => { const p = ctx.problem; return `${ctx.choice('yname', '縱軸要寫什麼？', [['y', esc(p.yName)], ['x', esc(p.xName)], ['t', '星期']].filter((x, i, a) => a.findIndex(z => z[1] === x[1]) === i))}${ctx.choice('unit', '括號裡的單位是什麼？', [...new Set([p.unit, '公分', '個'])].slice(0, 3).map(u => [u, u]))}`; },
      check: ctx => { const a = ctx.answers, p = ctx.problem; if (!a.yname || !a.unit) return { code: 'label', msg: '兩題都要選。' };
        return a.yname === 'y' && a.unit === p.unit ? null : { code: 'label', obs: a.yname === 'x' ? 'swapped' : 'wrongChoice', msg: a.yname !== 'y' ? '縱軸寫的是記錄的數量，不是時間。' : '單位看表格第二列的括號。' }; },
      solve: ctx => { ctx.answers.yname = 'y'; ctx.answers.unit = ctx.problem.unit; }, say: ex => `縱軸寫「${ex.problem.yName}（${ex.problem.unit}）」。` },
    { title: '檢查與說明', ids: ['same', 'max'], hints: ['對照表格，一個點一個點檢查。', '最高的點，就是最多的時間。', '找最高的點，往下看是哪一個時間。'],
      think: '老師對照表格檢查每一點，再找最高的點。', together: '一起看：哪一個時間最多？',
      figure: ctx => chartSVG(ctx.problem, { mark: ctx.hint(6) >= 2 ? [[ctx.problem.mx, 0]] : [] }),
      answer: ctx => { const p = ctx.problem, opts = [p.mx, (p.mx + 1) % p.xs.length, (p.mx + 2) % p.xs.length].map(i => [String(i), esc(p.full[i])]);
        return `${ctx.choice('same', '每個點都和表格一樣嗎？', [['yes', '一樣'], ['no', '不一樣']], true)}${ctx.choice('max', `看圖：哪一個時間的${esc(p.what)}最多？`, opts)}`; },
      check: ctx => { const a = ctx.answers, p = ctx.problem; if (!a.same || !a.max) return { code: 'tell', msg: '兩題都要選。' };
        if (a.same !== 'yes') return { code: 'tell', obs: 'wrongChoice', msg: '再對照一次：圖是照表格畫的，每一點都一樣。' };
        return Number(a.max) === p.mx ? null : { code: 'tell', obs: 'wrongChoice', msg: '找最高的點，往下看是哪一個時間。' }; },
      solve: ctx => { ctx.answers.same = 'yes'; ctx.answers.max = String(ctx.problem.mx); }, say: ex => `最高的點是${ex.problem.full[ex.problem.mx]}，${ex.problem.what}最多。` }
  ];
  A.register('lnDraw', {
    methods: [['mark', '✏️ 照表格一步一步畫'], ['self', '🧠 先自己畫，需要時看提示']], makeProblem: makeDraw, planFigure: ctx => tableHtml(ctx.problem), steps: drawSteps,
    reasons: [['table', '先看表格'], ['scale', '看一格是多少'], ['order', '照順序連線'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem; return `折線圖畫好了。${p.full[p.mx]}的${p.what}最多，是 ${valueOf(p, p.mx)} ${p.unit}。`; },
    chant: '畫折線圖：排時間、定刻度、描點、照順序連線、寫單位。',
    transfer: '想一想：生活中還有什麼會隨著時間改變，適合畫成折線圖？'
  });

  window.lineFig = { CTX, LEVELS, WEEK, MONTHS, makeChart, chartSVG, tableHtml, numberLineSVG, valueOf, maxAt, cellsOf, scaleStep, unitStep, readObs, readMsg, bindX, bindCells, bindLink, plotCheck, pathOk, methods, COLOR, SHAPE, rnd };
})();

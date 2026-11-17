'use strict';
// 第 31 版：因數與倍數教材包的共用工具與兩個核心活動（content-factor.js）。
// 共用：因數、倍數、最大公因數、最小公倍數的計算；方塊排長方形、數字表（可以點選）、跳格數線、分裝袋子、短除的圖。
// 核心活動 1-3（找因數七步）：看題目 → 想成平分 → 從 1 開始試 → 有沒有剩 → 成對記下 → 什麼時候停 → 檢查。
// 核心活動 3-2（找公因數公倍數七步，4-2、5-2 也用）：看情境 → 選工具 → 列第一個數 → 列第二個數 → 圈一樣的 → 選最大或最小 → 回到情境。
// 課綱 N-5-3 備註：五年級以概念認識為主，不用短除法；短除法在六年級的 6-3、7-1。
(() => {
  const A = window.areaActs, U = A.util, { esc, pick, num, fieldHtml } = U;
  const rnd = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
  const any = (rand, list) => list[Math.floor(rand() * list.length)];

  // ---------- 計算 ----------
  const factorsOf = n => { const f = []; for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d); return f; };
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const lcm = (a, b) => a / gcd(a, b) * b;
  const isPrime = n => n > 1 && factorsOf(n).length === 2;
  // 吳老師 2026-11-17：入門 24 以內、一般 50 以內、挑戰 100 以內（題目、答案、數線都不超過）
  const CAP = { easy: 24, standard: 50, challenge: 100 }, capOf = level => CAP[level] || CAP.standard;
  const multiplesTo = (a, top) => { const m = []; for (let x = a; x <= top; x += a) m.push(x); return m; };
  const common = (x, y) => x.filter(v => y.includes(v));
  const sameSet = (a, b) => a.length === b.length && a.every(v => b.includes(v));

  // ---------- 圖 ----------
  // 方塊排成 rows 排、每排 cols 個；left：最後一排只有幾個（排不完的，用橘色）
  function arraySVG(rows, cols, o = {}) {
    const u = Math.max(14, Math.min(34, 420 / Math.max(cols, 1), 230 / Math.max(rows + (o.left ? 1 : 0), 1))), pad = 6;
    let g = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g += `<rect x="${pad + c * u}" y="${pad + r * u}" width="${u - 3}" height="${u - 3}" rx="3" class="ac-tile fm-tile"/>`;
    for (let c = 0; c < (o.left || 0); c++) g += `<rect x="${pad + c * u}" y="${pad + rows * u}" width="${u - 3}" height="${u - 3}" rx="3" class="fm-left"/>`;
    const H = pad * 2 + (rows + (o.left ? 1 : 0)) * u, W = pad * 2 + cols * u;
    const lab = o.label ? `<text x="${W + 8}" y="${pad + u * Math.min(rows, 1) / 2 + 6}" class="fm-lab">${esc(o.label)}</text>` : '';
    return `<svg class="ac-svg fm-svg" viewBox="0 0 ${W + (o.label ? 150 : 0)} ${H}" style="max-width:${Math.round((W + (o.label ? 150 : 0)) * 1.3)}px" role="img" aria-label="${esc(o.aria || `${rows} 排，每排 ${cols} 個${o.left ? `，還剩 ${o.left} 個` : ''}`)}">${g}${lab}</svg>`;
  }
  // 一堆東西（還沒排）：每排 10 個
  const pileSVG = (n, aria) => arraySVG(Math.floor(n / 10), Math.min(10, n), { left: n % 10, aria: aria || `${n} 個方塊` }).replace(/class="fm-left"/g, 'class="ac-tile fm-tile"');
  // 平分：total 個分給 k 份；每份幾個，剩下的放旁邊
  function shareSVG(total, k, o = {}) {
    const each = Math.floor(total / k), left = total % k, bw = Math.max(46, Math.min(90, 520 / k)), u = Math.max(8, Math.min(16, (bw - 10) / 3));
    let g = '';
    for (let j = 0; j < k; j++) {
      const x = 4 + j * (bw + 6), rows = Math.ceil(each / 3);
      g += `<rect x="${x}" y="4" width="${bw}" height="${Math.max(36, rows * (u + 3) + 14)}" rx="10" class="fm-bag"/>`;
      for (let t = 0; t < each; t++) g += `<circle cx="${x + 8 + (t % 3) * (u + 3) + u / 2}" cy="${12 + Math.floor(t / 3) * (u + 3) + u / 2}" r="${u / 2}" class="fm-dot${o.color === 'b' ? ' b' : ''}"/>`;
    }
    const h = Math.max(44, Math.ceil(each / 3) * (u + 3) + 22);
    for (let t = 0; t < left; t++) g += `<circle cx="${10 + t * (u + 4) + u / 2}" cy="${h + 14}" r="${u / 2}" class="fm-dot left"/>`;
    const W = 8 + k * (bw + 6), H = h + (left ? 30 : 4);
    return `<svg class="ac-svg fm-svg" viewBox="0 0 ${W} ${H}" style="max-width:${Math.round(W * 1.3)}px" role="img" aria-label="${esc(o.aria || `${total} 個分成 ${k} 份，每份 ${each} 個${left ? `，剩 ${left} 個` : '，剛好分完'}`)}">${g}</svg>`;
  }
  // 跳格數線：0 到 top，上面一條每次跳 a，下面一條每次跳 b；o.common 把一起跳到的點圈起來
  function jumpSVG(a, b, top, o = {}) {
    const u = Math.min(30, 480 / top), L = 78, W = L + top * u + 20, y1 = 50, y2 = 130;
    let g = '';
    const line = (y, step, cls, name) => {
      let s = `<text x="4" y="${y + 6}" class="fm-lab fm-lab-big">${esc(name)}</text><path d="M${L} ${y}H${L + top * u}" class="ln-axis"/>`;
      for (let k = 0; k <= top; k++) s += `<path d="M${L + k * u} ${y - (k % 5 ? 4 : 7)}V${y + (k % 5 ? 4 : 7)}" class="ln-axis"/>`;
      if (!o.hideJumps) for (let x = step; x <= top; x += step) s += `<path d="M${L + (x - step) * u} ${y}Q${L + (x - step / 2) * u} ${y - 26} ${L + x * u} ${y}" class="fm-jump ${cls}"/><circle cx="${L + x * u}" cy="${y}" r="5" class="fm-dot ${cls}"/>`;
      return s;
    };
    g += line(y1, a, 'a', o.aName || `每 ${a}`) + line(y2, b, 'b', o.bName || `每 ${b}`);
    for (let k = 0; k <= top; k += top > 60 ? 10 : 5) g += `<text x="${L + k * u}" y="${y2 + 26}" text-anchor="middle" class="ln-ytick fm-tick">${k}</text>`;
    if (o.common) for (let x = lcm(a, b); x <= top; x += lcm(a, b)) g += `<path d="M${L + x * u} ${y1 - 12}V${y2 + 10}" class="fm-meet"/><circle cx="${L + x * u}" cy="${y1}" r="10" class="fm-ring"/><circle cx="${L + x * u}" cy="${y2}" r="10" class="fm-ring"/>`;
    if (o.mark != null) g += `<path d="M${L + o.mark * u} ${y1 - 22}V${y2 + 12}" class="fm-ask"/><text x="${L + o.mark * u}" y="${y1 - 26}" text-anchor="middle" class="fm-lab">${o.mark}</text>`;
    return `<svg class="ac-svg fm-svg" viewBox="0 0 ${W} ${y2 + 36}" role="img" aria-label="${esc(o.aria || `兩條數線：上面每次跳 ${a}，下面每次跳 ${b}`)}">${g}</svg>`;
  }
  // 數字表：1 到 max，每排 10 個。sel 選了的；o.a、o.b 要上色的（兩種顏色）；o.hint 提示框起來的；pickKey 有的話可以點
  function numGrid(max, o = {}) {
    const sel = new Set(o.sel || []), a = new Set(o.a || []), b = new Set(o.b || []), hint = new Set(o.hint || []), cells = [];
    for (let n = o.from || 1; n <= max; n++) {
      const cls = ['fm-n', a.has(n) ? 'ca' : '', b.has(n) ? 'cb' : '', hint.has(n) ? 'hint' : ''].filter(Boolean).join(' ');
      cells.push(o.pick ? `<button type="button" class="${cls}" data-num="${n}" aria-pressed="${sel.has(n)}">${n}</button>` : `<span class="${cls}${sel.has(n) ? ' on' : ''}">${n}</span>`);
    }
    return `<div class="fm-grid" ${o.pick ? `data-pick="${o.pick}" role="group" aria-label="${esc(o.aria || '數字表，點一下選、再點一下取消')}"` : `role="img" aria-label="${esc(o.aria || '數字表')}"`}>${cells.join('')}</div>`;
  }
  // 點數字表：選或取消，記在 ctx.state[key]（陣列）；不重畫整頁，只換按鈕的狀態
  function bindPick(n, key, after) {
    return ctx => document.querySelectorAll(`[data-pick="${key}"] [data-num]`).forEach(el => {
      el.onclick = () => {
        const v = Number(el.dataset.num), st = ctx.state, list = st[key] = (st[key] || []).slice(), at = list.indexOf(v);
        if (at >= 0) list.splice(at, 1); else list.push(v);
        list.sort((x, y) => x - y); ctx.answers[key] = list.join(',');
        el.setAttribute('aria-pressed', String(at < 0)); ctx.log('點數字', { n: v, on: at < 0 }); ctx.invalidate(n);
        document.querySelectorAll(`[data-count="${key}"]`).forEach(e => { e.textContent = String(list.length); });
        if (after) after(ctx);
      };
    });
  }
  const countLine = (ctx, key, text = '選了') => `<p class="notice" data-read data-say>${text} <span data-count="${key}">${(ctx.state[key] || []).length}</span> 個數。</p>`;
  // 選的數和答案比：漏了 1 或自己、漏了成對的另一個、多選了不是的
  function pickCheck(sel, want, o = {}) {
    const miss = want.filter(v => !sel.includes(v)), extra = sel.filter(v => !want.includes(v));
    if (!sel.length) return { code: o.code, obs: 'unfinished', msg: o.empty || '在數字表上點一點，把答案選起來。' };
    if (!miss.length && !extra.length) return null;
    if (extra.length) return { code: o.code, obs: o.extraObs || 'remainderOK', msg: o.extraMsg ? o.extraMsg(extra) : `${extra.join('、')} 不對，再檢查一次。` };
    if (o.n && (miss.includes(1) || miss.includes(o.n))) return { code: o.code, obs: 'miss1Self', msg: `1 和 ${o.n} 自己，一定都是 ${o.n} 的因數。` };
    if (o.n && miss.some(v => sel.includes(o.n / v))) { const v = miss.find(x => sel.includes(o.n / x)); return { code: o.code, obs: 'missPair', msg: `你選了 ${o.n / v}，它的好朋友也要選：${o.n / v} × ？ ＝ ${o.n}。` }; }
    return { code: o.code, obs: 'unfinished', msg: o.missMsg || `還有 ${miss.length} 個沒有選到。` };
  }
  // 九九乘法表（入門、一般可以打開；打開會記一筆）
  let aidCtx = null;
  const timesAid = ctx => {
    if (ctx.level === 'challenge') return '';
    aidCtx = ctx;
    let rows = '';
    for (let a = 1; a <= 9; a++) rows += `<tr><th scope="row">${a}</th>${Array.from({ length: 9 }, (_, j) => `<td>${a * (j + 1)}</td>`).join('')}</tr>`;
    return `<details class="fm-times"><summary data-read>📋 看九九乘法表</summary><table class="fm-ttable"><thead><tr><th scope="col">×</th>${Array.from({ length: 9 }, (_, j) => `<th scope="col">${j + 1}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></details>`;
  };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('toggle', e => { if (e.target?.classList?.contains('fm-times') && e.target.open) aidCtx?.log('開九九乘法表'); }, true);
  const yesNo = (ctx, id, title, yes = '剛好分完，沒有剩', no = '有剩') => ctx.choice(id, title, [['zero', yes], ['left', no]], true);
  const fracHtml = (a, b) => `<span class="fm-frac" aria-label="${b} 分之 ${a}"><span>${a}</span><span>${b}</span></span>`;
  // 短除：rows = [[除數, 被除的數…]]，last：最下面一排
  function ladderHtml(rows, last, o = {}) {
    return `<div class="fm-ladder" role="img" aria-label="${esc(o.aria || '短除')}">${rows.map(r => `<div class="fm-lrow"><span class="fm-ld">${r[0]}</span><span class="fm-lnums">${r.slice(1).map(x => `<span>${x}</span>`).join('')}</span></div>`).join('')}<div class="fm-lrow last"><span class="fm-ld"></span><span class="fm-lnums">${last.map(x => `<span>${x}</span>`).join('')}</span></div></div>`;
  }

  // ---------- 核心活動 1-3：找因數七步 ----------
  const FNUMS = { easy: [6, 8, 10, 12, 15, 16, 18, 20, 24], standard: [24, 28, 30, 32, 36, 40, 42, 45, 48], challenge: [54, 56, 60, 64, 72, 80, 84, 90, 96] };
  function makeFactors(level, i, rand = Math.random) {
    const list = FNUMS[level] || FNUMS.standard, n = list[(i * 4 + rnd(rand, 0, list.length - 1)) % list.length], fs = factorsOf(n);
    const small = fs.filter(d => d > 1 && d * d < n), a = any(rand, small);
    const non = any(rand, Array.from({ length: 11 }, (_, k) => k + 2).filter(d => d < n && n % d)), k = fs.find(d => d * d > n);
    return { n, fs, a, non, k, kp: n / k, dims: [n, fs.length], prompt: `找出 ${n} 的全部因數。` };
  }
  const factorSteps = [
    { title: '看題目', ask: '題目要我找什麼？', ids: ['ask'], hints: ['讀一讀題目：要找「全部」還是「一個」？', '題目說「全部的因數」。', '要把每一個因數都找出來。'],
      think: '老師讀題目：要找出全部的因數，一個都不能漏。', together: '一起讀：題目要找什麼？',
      figure: ctx => pileSVG(ctx.problem.n),
      answer: ctx => { const p = ctx.problem; return `<p class="lesson-prompt" data-read data-say>${esc(p.prompt)}</p>${ctx.choice('ask', '題目要你找什麼？', [['all', `${p.n} 的全部因數`], ['one', `${p.n} 的一個因數`], ['mult', `${p.n} 的倍數`]])}`; },
      check: ctx => !ctx.answers.ask ? { code: 'ask', msg: '先選一個答案。' } : ctx.answers.ask === 'all' ? null : { code: 'ask', obs: ctx.answers.ask === 'mult' ? 'swapFM' : 'wrongChoice', msg: ctx.answers.ask === 'mult' ? '題目說的是「因數」，不是倍數。' : '再讀一次：題目要「全部」的因數。' },
      solve: ctx => { ctx.answers.ask = 'all'; }, say: ex => `要找出 ${ex.problem.n} 的全部因數。` },
    { title: '想成平分', ask: '因數就是可以剛好分完的數嗎？', ids: ['think'], hints: ['因數和「平分」有關。', '把這些東西平分，剛好分完、沒有剩。', '能剛好分完的份數，就是因數。'],
      think: '老師想：把這些方塊平分（排成長方形），能剛好分完，就是因數。', together: '一起想：什麼是因數？',
      figure: ctx => pileSVG(ctx.problem.n),
      answer: ctx => { const p = ctx.problem; return ctx.choice('think', `「□ 是 ${p.n} 的因數」是什麼意思？`, [['share', `${p.n} 個平分成 □ 份，剛好分完`], ['add', `□ 一直加，會加到 ${p.n}`], ['big', `□ 比 ${p.n} 大`]]); },
      check: ctx => !ctx.answers.think ? { code: 'think', msg: '先選一個答案。' } : ctx.answers.think === 'share' ? null : { code: 'think', obs: ctx.answers.think === 'add' ? 'swapFM' : 'wrongChoice', msg: ctx.answers.think === 'add' ? '一直加是倍數的想法。因數是「平分，剛好分完」。' : '因數不會比這個數大。因數是平分，剛好分完。' },
      solve: ctx => { ctx.answers.think = 'share'; }, say: ex => `${ex.problem.n} 個平分成幾份，剛好分完，那個份數就是因數。` },
    { title: '從 1 開始試', ask: '1 是不是一定可以？', ids: ['one'], hints: ['先試 1。', `排成 1 排，一排有幾個？`, `1 × ${'□'} ＝ 這個數，□ 就是它自己。`],
      think: '老師從 1 開始試：排成 1 排，一排就是全部。', together: '一起試：1 乘以多少？',
      figure: ctx => ctx.hint(2) >= 2 || ctx.checked(2) ? arraySVG(1, ctx.problem.n, { aria: `1 排，每排 ${ctx.problem.n} 個` }) : pileSVG(ctx.problem.n),
      answer: ctx => `${timesAid(ctx)}${fieldHtml(ctx, 'one', `1 × □ ＝ ${ctx.problem.n}，□ 是多少？`, 2)}`,
      check: ctx => { const v = num(ctx.answers.one), n = ctx.problem.n; if (v === null) return { code: 'one', msg: '把數填進去。' }; return v === n ? null : { code: 'one', obs: v === 1 ? 'miss1Self' : 'other', msg: `1 乘以幾才會等於 ${n}？` }; },
      solve: ctx => { ctx.answers.one = String(ctx.problem.n); }, say: ex => `1 × ${ex.problem.n} ＝ ${ex.problem.n}，所以 1 和 ${ex.problem.n} 都是因數。` },
    { title: '有沒有剩', ask: '分完以後有沒有剩下？', ids: ['ra', 'rb'], hints: ['用除法算一算。', '除完以後，看餘數是不是 0。', '餘數是 0，剛好分完，才是因數。'],
      think: '老師用除法：除完沒有剩，才是因數；有剩，就不是。', together: '一起算：有沒有剩？',
      figure: ctx => { const p = ctx.problem; return ctx.hint(3) >= 2 || ctx.checked(3) ? `${arraySVG(p.a, Math.floor(p.n / p.a), { aria: `排成 ${p.a} 排，剛好排完` })}${arraySVG(p.non, Math.floor(p.n / p.non), { left: p.n % p.non, aria: `排成 ${p.non} 排，剩 ${p.n % p.non} 個` })}` : pileSVG(p.n); },
      answer: ctx => { const p = ctx.problem; return `${timesAid(ctx)}${yesNo(ctx, 'ra', `${p.n} ÷ ${p.a}，有沒有剩？`)}${yesNo(ctx, 'rb', `${p.n} ÷ ${p.non}，有沒有剩？`)}`; },
      check: ctx => { const a = ctx.answers; if (!a.ra || !a.rb) return { code: 'rem', msg: '兩題都要選。' }; if (a.ra === 'zero' && a.rb === 'left') return null;
        const p = ctx.problem; return a.rb === 'zero' ? { code: 'rem', obs: 'remainderOK', msg: `${p.n} ÷ ${p.non} ＝ ${Math.floor(p.n / p.non)} 餘 ${p.n % p.non}，有剩。` } : { code: 'rem', obs: 'wrongChoice', msg: `${p.n} ÷ ${p.a} ＝ ${p.n / p.a}，沒有剩。` }; },
      solve: ctx => { ctx.answers.ra = 'zero'; ctx.answers.rb = 'left'; }, say: ex => `${ex.problem.a} 剛好分完，是因數；${ex.problem.non} 有剩，不是因數。` },
    { title: '成對記下', ask: '找到一個，它的好朋友是誰？', ids: ['pair'], hints: ['因數會兩個兩個一起出現。', `${'□'} × 好朋友 ＝ 這個數。`, '用除法：這個數 ÷ 找到的因數 ＝ 好朋友。'],
      think: '老師找到一個因數，就用除法找出它的好朋友，一起記下來。', together: '一起找：好朋友是幾？',
      figure: ctx => { const p = ctx.problem; return arraySVG(p.a, p.n / p.a, { aria: `${p.a} 排，每排 ${p.n / p.a} 個` }); },
      answer: ctx => { const p = ctx.problem; return `${timesAid(ctx)}${fieldHtml(ctx, 'pair', `${p.a} × □ ＝ ${p.n}，□ 是多少？`, 4)}`; },
      check: ctx => { const p = ctx.problem, v = num(ctx.answers.pair); if (v === null) return { code: 'pair', msg: '把好朋友填進去。' }; return v === p.n / p.a ? null : { code: 'pair', obs: 'other', msg: `算一算：${p.n} ÷ ${p.a}。` }; },
      solve: ctx => { ctx.answers.pair = String(ctx.problem.n / ctx.problem.a); }, say: ex => `${ex.problem.a} × ${ex.problem.n / ex.problem.a} ＝ ${ex.problem.n}，${ex.problem.a} 和 ${ex.problem.n / ex.problem.a} 一起記下來。` },
    { title: '什麼時候停', ask: '數字開始重複了嗎？', ids: ['stop'], hints: ['看一看：這一對是不是出現過？', `${'□'} × ${'△'} 和 ${'△'} × ${'□'} 是同一對。`, '同一對又出現了，就可以停。'],
      think: '老師一直試，試到同一對又出現（只是前後換位置），就停。', together: '一起看：要不要繼續試？',
      answer: ctx => { const p = ctx.problem; return `<p data-read data-say>試到 ${p.k} 的時候：${p.k} × ${p.kp} ＝ ${p.n}。前面已經有 ${p.kp} × ${p.k} 了。</p>${ctx.choice('stop', '還要繼續往下試嗎？', [['stop', '不用了，可以停'], ['go', `要，一直試到 ${p.n}`]], true)}`; },
      check: ctx => !ctx.answers.stop ? { code: 'stop', msg: '先選一個答案。' } : ctx.answers.stop === 'stop' ? null : { code: 'stop', obs: 'noStop', msg: `${ctx.problem.k} × ${ctx.problem.kp} 和 ${ctx.problem.kp} × ${ctx.problem.k} 是同一對，後面的都出現過了。` },
      solve: ctx => { ctx.answers.stop = 'stop'; }, say: ex => `${ex.problem.k} × ${ex.problem.kp} 出現過了，可以停。` },
    { title: '檢查', ask: '1 和它自己都有選嗎？成對的都選了嗎？', ids: ['all'], hints: ['一對一對檢查：1 和自己、2 和…', '1 和這個數自己，一定要選。', '每選一個，它的好朋友也要選。'],
      think: '老師一對一對檢查，由小排到大，1 和它自己都要有。', together: '一起檢查：全部的因數有哪些？',
      answer: ctx => { const p = ctx.problem; return `<p data-read data-say>在數字表上，點出 ${p.n} 的全部因數。</p>${numGrid(p.n, { pick: 'all', sel: ctx.state.all, hint: ctx.hint(6) >= 3 ? p.fs : [] })}${countLine(ctx, 'all')}`; },
      bind: bindPick(6, 'all'),
      check: ctx => pickCheck(ctx.state.all || [], ctx.problem.fs, { code: 'all', n: ctx.problem.n, extraMsg: x => `${x.join('、')} 除 ${ctx.problem.n} 會有剩，不是因數。` }),
      solve: ctx => { ctx.state.all = ctx.problem.fs.slice(); ctx.answers.all = ctx.problem.fs.join(','); }, say: ex => `${ex.problem.n} 的因數有 ${ex.problem.fs.join('、')}。` }
  ];
  A.register('fmFactors', {
    methods: [['mark', '🧱 一步一步找'], ['self', '🧠 先自己找，需要時看提示']], makeProblem: makeFactors, planFigure: ctx => pileSVG(ctx.problem.n), steps: factorSteps,
    reasons: [['one', '從 1 開始試'], ['pair', '一對一對找'], ['stop', '知道什麼時候停'], ['hint', '看提示']],
    done: ctx => `${ctx.problem.n} 的因數有 ${ctx.problem.fs.join('、')}，共 ${ctx.problem.fs.length} 個。`,
    chant: '找因數：從 1 開始試，剛好分完就成對記下，重複了就停。',
    transfer: '想一想：班上的人要分組，每組一樣多，可以分成幾組？'
  });

  // ---------- 核心活動 3-2、4-2、5-2：找公因數公倍數七步 ----------
  const GPAIRS = { easy: [[12, 18], [8, 12], [6, 9], [10, 15], [16, 24], [12, 16], [9, 12], [8, 20]], standard: [[24, 36], [18, 30], [20, 30], [28, 42], [32, 48], [27, 45], [24, 40], [30, 45]], challenge: [[36, 60], [42, 56], [48, 72], [54, 90], [60, 84], [45, 75], [40, 64], [72, 96]] };
  const LPAIRS = { easy: [[2, 3], [3, 4], [4, 6], [2, 5], [3, 5], [6, 8], [4, 10]], standard: [[6, 8], [4, 10], [6, 9], [8, 12], [5, 6], [6, 10], [4, 12], [10, 15]], challenge: [[8, 10], [9, 12], [12, 18], [6, 14], [12, 16], [10, 12], [9, 15], [14, 21]] };
  const GCTX = [
    { a: '糖果', ua: '顆', b: '餅乾', ub: '塊', bag: '袋' }, { a: '鉛筆', ua: '枝', b: '橡皮擦', ub: '個', bag: '份' },
    { a: '紅花', ua: '朵', b: '白花', ub: '朵', bag: '束' }, { a: '貼紙', ua: '張', b: '卡片', ub: '張', bag: '包' }
  ];
  const LCTX = [
    { key: 'bus', text: (x, y) => `甲公車每 ${x} 分鐘開一班，乙公車每 ${y} 分鐘開一班。剛剛兩班車一起開出。最少再過幾分鐘，兩班車又會一起開出？`, unit: '分鐘', aName: '甲公車', bName: '乙公車', each: '到那時候，甲公車又開了幾班？', eu: '班' },
    { key: 'light', text: (x, y) => `紅燈每 ${x} 秒亮一次，綠燈每 ${y} 秒亮一次。剛剛兩盞燈一起亮。最少再過幾秒，兩盞燈又會一起亮？`, unit: '秒', aName: '紅燈', bName: '綠燈', each: '到那時候，紅燈又亮了幾次？', eu: '次' },
    { key: 'block', text: (x, y) => `紅積木一塊高 ${x} 公分，藍積木一塊高 ${y} 公分。紅積木疊一疊，藍積木疊一疊，兩疊要一樣高。最矮是幾公分？`, unit: '公分', aName: '紅積木', bName: '藍積木', each: '那時候，紅積木要疊幾塊？', eu: '塊' }
  ];
  function makeCommon(kind) {
    return (level, i, rand = Math.random) => {
      const k = kind || (i % 2 ? 'lcm' : 'gcd');
      if (k === 'gcd') {
        const [x, y] = any(rand, GPAIRS[level] || GPAIRS.standard), c = GCTX[(i + rnd(rand, 0, 3)) % GCTX.length], g = gcd(x, y);
        return { kind: 'gcd', x, y, g, best: g, c, unit: c.bag, top: Math.max(x, y), listA: factorsOf(x), listB: factorsOf(y), both: common(factorsOf(x), factorsOf(y)),
          each: x / g, eachQ: `每${c.bag}有幾${c.ua}${c.a}？`, eu: c.ua, dims: [x, y, g],
          prompt: `有 ${x} ${c.ua}${c.a}和 ${y} ${c.ub}${c.b}。要分裝成一樣的${c.bag}，每${c.bag}的${c.a}一樣多、${c.b}也一樣多，全部分完。最多可以分成幾${c.bag}？` };
      }
      const [x, y] = any(rand, LPAIRS[level] || LPAIRS.standard), c = LCTX[(i + rnd(rand, 0, 2)) % LCTX.length], L = lcm(x, y), top = Math.max(L, Math.min(capOf(level), 2 * L));
      return { kind: 'lcm', x, y, L, best: L, c, unit: c.unit, top, listA: multiplesTo(x, top), listB: multiplesTo(y, top), both: common(multiplesTo(x, top), multiplesTo(y, top)),
        each: L / x, eachQ: c.each, eu: c.eu, dims: [x, y, L], prompt: c.text(x, y) };
    };
  }
  const KIND_OPTS = [['gcd', '要「平分、全部分完、最多幾份」'], ['lcm', '要「再碰在一起、一樣長、最少多少」']];
  function listStep(n, side) {
    const key = side === 'A' ? 'listA' : 'listB';
    return { title: side === 'A' ? '列第一個數' : '列第二個數', ask: '我有沒有漏掉？', ids: [key],
      hints: [`先看要列因數還是倍數。`, `因數：從 1 開始試，成對記下。倍數：一直加同一個數。`, `把每一個都點出來。`],
      think: side === 'A' ? '老師把第一個數的因數（或倍數）全部列出來。' : '老師再把第二個數的因數（或倍數）也列出來。', together: '一起列：有哪些？',
      figure: ctx => { const p = ctx.problem; return p.kind === 'gcd' ? pileSVG(side === 'A' ? p.x : p.y).replace(/fm-tile/g, `fm-tile${side === 'B' ? ' b' : ''}`) : jumpSVG(p.x, p.y, p.top, { aName: p.c.aName, bName: p.c.bName, hideJumps: true }); },
      answer: ctx => { const p = ctx.problem, v = side === 'A' ? p.x : p.y, list = p[key];
        const q = p.kind === 'gcd' ? `點出 ${v} 的全部因數。` : `點出 ${v} 的倍數（到 ${p.top} 為止）。`;
        return `${timesAid(ctx)}<p data-read data-say>${q}</p>${numGrid(p.kind === 'gcd' ? v : p.top, { pick: key, sel: ctx.state[key], hint: ctx.hint(n) >= 3 ? list : [] })}${countLine(ctx, key)}`; },
      bind: bindPick(n, key),
      check: ctx => { const p = ctx.problem, v = side === 'A' ? p.x : p.y, sel = ctx.state[key] || [];
        if (p.kind === 'gcd') return pickCheck(sel, p[key], { code: key, n: v, extraMsg: x => `${x.join('、')} 除 ${v} 會有剩，不是 ${v} 的因數。` });
        // 倍數選成因數（例如 6 的倍數選了 1、2、3）
        if (sel.length && sel.some(s => s < v)) return { code: key, obs: 'swapFM', msg: `倍數不會比 ${v} 小。${v} 的倍數是 ${v}、${2 * v}、${3 * v}……` };
        return pickCheck(sel, p[key], { code: key, extraObs: 'other', extraMsg: x => `${x.join('、')} 不是 ${v} 的倍數。一直加 ${v}，看會不會加到。`, missMsg: `一直加 ${v}，加到 ${p.top} 為止，還有沒選到的。` }); },
      solve: ctx => { ctx.state[key] = ctx.problem[key].slice(); ctx.answers[key] = ctx.problem[key].join(','); },
      say: ex => `${side === 'A' ? ex.problem.x : ex.problem.y} 的${ex.problem.kind === 'gcd' ? '因數' : '倍數'}：${ex.problem[key].join('、')}。` };
  }
  const commonSteps = [
    { title: '看情境', ask: '是要平分，還是要再碰在一起？', ids: ['kind'], hints: ['讀一讀：東西要「平分、分完」嗎？還是要「再一起」？', '平分、分完、最多 → 公因數；再一起、一樣長、最少 → 公倍數。', '找題目裡的關鍵字：分完、最多，或是再一起、最少。'],
      think: '老師讀題目，找關鍵字：是要平分、分完，還是要再碰在一起？', together: '一起讀：這題在問什麼？',
      figure: ctx => { const p = ctx.problem; return p.kind === 'gcd' ? `${pileSVG(p.x, `${p.x} ${p.c.ua}${p.c.a}`)}${pileSVG(p.y, `${p.y} ${p.c.ub}${p.c.b}`).replace(/fm-tile/g, 'fm-tile b')}` : jumpSVG(p.x, p.y, p.top, { aName: p.c.aName, bName: p.c.bName, hideJumps: true }); },
      answer: ctx => `<p class="lesson-prompt" data-read data-say>${esc(ctx.problem.prompt)}</p>${ctx.choice('kind', '這一題是哪一種？', KIND_OPTS, true)}`,
      check: ctx => !ctx.answers.kind ? { code: 'kind', msg: '先選一個答案。' } : ctx.answers.kind === ctx.problem.kind ? null : { code: 'kind', obs: 'gcdLcmSwap', msg: ctx.problem.kind === 'gcd' ? '題目說「全部分完、最多」，是平分。' : '題目說「又會一起、最少」，是再碰在一起。' },
      solve: ctx => { ctx.answers.kind = ctx.problem.kind; }, say: ex => ex.problem.kind === 'gcd' ? '要平分、全部分完，最多幾份。' : '要等到再碰在一起，最少多少。' },
    { title: '選工具', ask: '要找因數還是倍數？', ids: ['tool'], hints: ['平分 → 找因數；再一起 → 找倍數。', '分成幾份要剛好分完：用因數。一直加、等到一起：用倍數。', '上一步選了哪一種？照著選工具。'],
      think: '老師想：平分要用因數；再一起要用倍數。', together: '一起選：要用因數還是倍數？',
      answer: ctx => ctx.choice('tool', '要列出兩個數的什麼？', [['f', '列出兩個數的因數，找公因數'], ['m', '列出兩個數的倍數，找公倍數']], true),
      check: ctx => { const a = ctx.answers.tool, want = ctx.problem.kind === 'gcd' ? 'f' : 'm'; return !a ? { code: 'tool', msg: '先選一個答案。' } : a === want ? null : { code: 'tool', obs: 'gcdLcmSwap', msg: want === 'f' ? '平分、分完，要用因數。' : '等到再一起，要一直加，用倍數。' }; },
      solve: ctx => { ctx.answers.tool = ctx.problem.kind === 'gcd' ? 'f' : 'm'; }, say: ex => ex.problem.kind === 'gcd' ? '列出因數，找公因數。' : '列出倍數，找公倍數。' },
    listStep(2, 'A'), listStep(3, 'B'),
    { title: '圈一樣的', ask: '兩邊都有的是哪些？', ids: ['both'], hints: ['看藍色和橘色：兩種顏色都有的數。', '一個一個看：這個數，兩個數都有嗎？', '兩邊都有的，才是「公」的。'],
      think: '老師看兩張表，兩邊都有的數圈起來。', together: '一起圈：兩邊都有哪些數？',
      answer: ctx => { const p = ctx.problem; return `<p data-read data-say>藍色是 ${p.x} 的${p.kind === 'gcd' ? '因數' : '倍數'}，橘色是 ${p.y} 的${p.kind === 'gcd' ? '因數' : '倍數'}。點出兩邊都有的數。</p>${numGrid(p.top, { pick: 'both', sel: ctx.state.both, a: p.listA, b: p.listB, hint: ctx.hint(4) >= 3 ? p.both : [] })}${countLine(ctx, 'both')}`; },
      bind: bindPick(4, 'both'),
      check: ctx => pickCheck(ctx.state.both || [], ctx.problem.both, { code: 'both', extraObs: 'other', extraMsg: x => `${x.join('、')} 只有一邊有，不是兩邊都有。`, missMsg: '還有兩邊都有的數沒有選到。' }),
      solve: ctx => { ctx.state.both = ctx.problem.both.slice(); ctx.answers.both = ctx.problem.both.join(','); }, say: ex => `兩邊都有：${ex.problem.both.join('、')}。` },
    { title: '選最大或最小', ask: '題目要最大的，還是最小的？', ids: ['best'], hints: ['再讀一次題目：「最多」還是「最少」？', '公因數要最大的；公倍數要最小的。', '從圈起來的數裡面挑。'],
      think: '老師看題目：最多幾份，選最大的公因數；最少多久，選最小的公倍數。', together: '一起選：答案是哪一個？',
      answer: ctx => { const p = ctx.problem; return `<p data-read data-say>兩邊都有：${p.both.join('、')}。</p>${fieldHtml(ctx, 'best', p.kind === 'gcd' ? '最大的公因數是多少？' : '最小的公倍數是多少？', 5)}`; },
      check: ctx => { const p = ctx.problem, v = num(ctx.answers.best); if (v === null) return { code: 'best', msg: '把答案填進去。' }; if (v === p.best) return null;
        if (p.kind === 'lcm' && v === p.x * p.y) return { code: 'best', obs: 'lcmProduct', msg: `${p.x} × ${p.y} 是公倍數，可是不一定最小。看圈起來的數，最小的是哪一個？` };
        if (p.both.includes(v)) return { code: 'best', obs: 'pickWrongEnd', msg: p.kind === 'gcd' ? '要「最多」幾份，選最大的公因數。' : '要「最少」多久，選最小的公倍數。' };
        return { code: 'best', obs: 'other', msg: '從圈起來的數裡面挑。' }; },
      solve: ctx => { ctx.answers.best = String(ctx.problem.best); }, say: ex => ex.problem.kind === 'gcd' ? `最大的公因數是 ${ex.problem.g}。` : `最小的公倍數是 ${ex.problem.L}。` },
    { title: '回到情境', ask: '答案放回題目，說得通嗎？', ids: ['each', 'unit'], hints: ['把答案放回題目裡想一想。', '用除法算：每一份有幾個（或是幾班、幾次）。', '答案要寫題目的單位。'],
      think: '老師把答案放回題目：每份有幾個？答案的單位是什麼？', together: '一起說：答案說得通嗎？',
      figure: ctx => { const p = ctx.problem; return p.kind === 'gcd' ? shareSVG(p.x, p.g, { aria: `${p.x} 分成 ${p.g} 份` }) : jumpSVG(p.x, p.y, p.top, { aName: p.c.aName, bName: p.c.bName, common: true }); },
      answer: ctx => { const p = ctx.problem, units = [...new Set([p.unit, p.kind === 'gcd' ? '個' : '公尺', p.eu === p.unit ? '個' : p.eu])].slice(0, 3);
        return `${fieldHtml(ctx, 'each', esc(p.eachQ), 6)}${ctx.choice('unit', `答案「${p.best}」的單位是什麼？`, units.map(u => [u, u]))}`; },
      check: ctx => { const p = ctx.problem, v = num(ctx.answers.each); if (v === null || !ctx.answers.unit) return { code: 'ctx', msg: '兩題都要做。' };
        if (v !== p.each) return { code: 'ctx', obs: 'other', msg: p.kind === 'gcd' ? `${p.x} ÷ ${p.g}，每${p.c.bag}有幾${p.c.ua}？` : `${p.L} ÷ ${p.x}，算一算。` };
        return ctx.answers.unit === p.unit ? null : { code: 'ctx', obs: 'wrongChoice', msg: `題目問的是幾${p.unit}。` }; },
      solve: ctx => { ctx.answers.each = String(ctx.problem.each); ctx.answers.unit = ctx.problem.unit; }, say: ex => ex.problem.kind === 'gcd' ? `${ex.problem.g} ${ex.problem.unit}，每${ex.problem.c.bag} ${ex.problem.each} ${ex.problem.c.ua}${ex.problem.c.a}。` : `${ex.problem.L} ${ex.problem.unit}，那時${ex.problem.c.aName} ${ex.problem.each} ${ex.problem.eu}。` }
  ];
  const commonPlugin = kind => ({
    methods: [['mark', '🧩 一步一步找'], ['self', '🧠 先自己想，需要時看提示']], makeProblem: makeCommon(kind), planFigure: ctx => commonSteps[0].figure(ctx), steps: commonSteps,
    reasons: [['kind', '先看是平分還是再一起'], ['list', '把兩個數都列出來'], ['circle', '圈出兩邊都有的'], ['hint', '看提示']],
    done: ctx => { const p = ctx.problem; return p.kind === 'gcd' ? `最多分成 ${p.g} ${p.c.bag}，每${p.c.bag}有 ${p.x / p.g} ${p.c.ua}${p.c.a}、${p.y / p.g} ${p.c.ub}${p.c.b}。` : `最少 ${p.L} ${p.unit}。${p.L} 是 ${p.x} 和 ${p.y} 的最小公倍數。`; },
    chant: '平分、分完、最多：找最大公因數；再一起、一樣長、最少：找最小公倍數。',
    transfer: '想一想：生活中什麼時候要「平分」？什麼時候要等「再碰在一起」？'
  });
  A.register('fmGcd', commonPlugin('gcd'));
  A.register('fmLcm', commonPlugin('lcm'));
  A.register('fmMixed', commonPlugin(null));

  window.factorFig = { CAP, capOf, rnd, any, factorsOf, gcd, lcm, isPrime, multiplesTo, common, sameSet, arraySVG, pileSVG, shareSVG, jumpSVG, numGrid, bindPick, countLine, pickCheck, timesAid, yesNo, fracHtml, ladderHtml, GPAIRS, LPAIRS, GCTX, LCTX, makeCommon, KIND_OPTS };
})();

'use strict';
// 動畫示範（video modeling 的「分步影片提示」）：每一步一段短動畫，手指示範操作、字幕加朗讀，
// 播完停下來讓學生自己做。示範用另一組數字，不會洩漏學生這一題的答案。
// 老師在備課頁上傳了這一步的影片時，改播老師的影片（見 seven.js）。
(() => {
  const C = () => window.lessonContent;
  const grid = t => t === 'rectangle' || t === 'square';
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // 示範用的例題：和學生目前這一題的數字不同
  function example(type, cur = [0, 0, 0]) {
    const pool = type === 'square' ? [[3, 3, 0], [4, 4, 0], [2, 2, 0]]
      : type === 'rectangle' ? [[3, 2, 0], [4, 2, 0], [4, 3, 0]]
      : type === 'triangle' ? [[4, 3, 1], [6, 2, 2], [4, 2, 1]]
      : [[4, 2, 1], [5, 3, 2], [3, 2, 1]];
    const area = d => d[0] * d[1] / (type === 'triangle' ? 2 : 1);
    return pool.find(d => !(d[0] === cur[0] && d[1] === cur[1]) && area(d) !== area(cur) && d[0] !== cur[0] && d[1] !== cur[1]) || pool.find(d => area(d) !== area(cur)) || pool[0];
  }

  function voice() {
    try {
      const all = speechSynthesis.getVoices() || [];
      const zh = all.filter(v => /^zh[-_]TW/i.test(v.lang)).concat(all.filter(v => /^zh/i.test(v.lang)));
      return zh.find(v => /Natural|Online|Neural|Google|Mei-Jia|美佳|Yating|HsiaoChen|曉臻|Hanhan/i.test(v.name)) || zh[0] || null;
    } catch { return null; }
  }

  // ---------- 腳本：每一步有幾個畫面，每個畫面一句話和一個動作 ----------
  function script(type, s, method, ex) {
    const [a, b] = ex, A = a * b / (type === 'triangle' ? 2 : 1), g = grid(type), opts = C().options;
    const sq = type === 'square';
    const formula = opts(type, 'formula').find(x => x[0] === (type === 'triangle' ? 'half' : 'product'))[1];
    if (s === 0) return [
      { say: '先看圖。題目問的是面積。', stage: 'figure+chips', chips: opts(type, 'target').map(x => x[1]), act: async P => { P.pulseFigure(); await P.point('.sd-fig'); } },
      { say: '面積是圖形裡面的大小，所以選這一個。', act: async P => { await P.tapChip(0); } }
    ];
    if (s === 1 && g && method === 'row') return [
      { say: `一次點一排。每點一排，排尾的數字就加上 ${a}。`, stage: 'grid', sum: true, act: async P => { for (let r = 0; r < b; r++) await P.markRow(r); } },
      { say: `最後的數字是 ${A}，一共有 ${A} 格。`, stage: 'keep+input', label: '一共有幾格？', act: async P => { await P.type(A); } }
    ];
    if (s === 1 && g) return [
      { say: '從左上開始，一格一格點。格子裡會出現數字。', stage: 'grid', act: async P => { for (let i = 0; i < A; i++) await P.markCell(i, i + 1); } },
      { say: `最後一格是 ${A}，一共有 ${A} 格。`, stage: 'keep+input', label: '一共有幾格？', act: async P => { await P.type(A); } }
    ];
    if (s === 1 && type === 'triangle') return [
      { say: '按按鈕，拿一片一樣大的三角形。', stage: 'figure', fig: { frame: 0 }, act: async P => { await P.point('.sd-fig'); await P.figure({ frame: 1 }); } },
      { say: '轉過來，拼在一起，變成平行四邊形。', act: async P => { await P.figure({ frame: 2 }); await wait(2600); } },
      { say: '數一數：藍色一片、橘色一片，一共 2 片。', stage: 'keep+chips', chips: ['1 片', '2 片', '3 片'], act: async P => { await P.tapChip(1); } },
      { say: '拼好的是 2 片，所以 1 片是拼好圖形的一半。', stage: 'keep+chips', chips: opts(type, 'relation').map(x => x[1]), act: async P => { await P.tapChip(0); } }
    ];
    if (s === 1) return [
      { say: '沿著有直角記號的高，剪開。', stage: 'figure', fig: { frame: 0 }, act: async P => { await P.point('.sd-fig'); await P.figure({ frame: 1 }); } },
      { say: '把小塊移到右邊，變成長方形。', act: async P => { await P.figure({ frame: 2 }); await wait(2400); } },
      { say: '只是移動，面積一樣大。', stage: 'keep+chips', chips: opts(type, 'relation').map(x => x[1]), act: async P => { await P.tapChip(0); } }
    ];
    if (s === 2 && g) return [
      { say: '看加粗的一排，從左到右數。', stage: 'grid', edge: 'row', act: async P => { for (let i = 0; i < a; i++) await P.countCell(i, i + 1); } },
      { say: `一排有 ${a} 格，這條邊就是 ${a} 公分。`, stage: 'keep+input', label: sq ? '邊長是幾公分？' : '一排有幾格？', act: async P => { await P.type(a); } }
    ];
    if (s === 2) return [
      { say: '底是最下面的那條邊。點一下底。', stage: 'figure', fig: { pulse: 'base' }, act: async P => { await P.point('.base-line'); await P.figure({ showBase: true }); } },
      { say: `底是 ${a} 公分，把它填進去。`, stage: 'keep+input', label: '底是幾公分？', act: async P => { await P.type(a); } }
    ];
    if (s === 3 && g) return [
      { say: '看左邊加粗的格子，從上往下數。', stage: 'grid', edge: 'col', act: async P => { for (let r = 0; r < b; r++) await P.countCell(r * a, r + 1); } },
      { say: `一共有 ${b} 排，這條邊就是 ${b} 公分。`, stage: 'keep+input', label: '一共有幾排？', act: async P => { await P.type(b); } }
    ];
    if (s === 3) return [
      { say: '高要和底成直角。看看哪一條線有直角記號。', stage: 'figure', fig: { lines: true, pulse: 'height', showBase: true }, act: async P => { await P.point('.right-mark'); } },
      { say: '就是這一條，它是高。斜的邊不是高。', act: async P => { await P.pickHeight(); } },
      { say: `高是 ${b} 公分，把它填進去。`, stage: 'keep+input', fig: { showBase: true, showHeight: true }, label: '高是幾公分？', act: async P => { await P.figure({ showBase: true, showHeight: true, lines: false }); await P.type(b); } }
    ];
    if (s === 4) return [
      { say: g ? '一排有幾格、有幾排，要用乘的。' : type === 'triangle' ? '拼好的是底乘高，一片要再除以二。' : '剪移後變成長方形，用底乘高。', stage: 'chips', chips: opts(type, 'formula').map(x => x[1]), correct: formula, act: async P => { await P.tapChip(opts(type, 'formula').findIndex(x => x[1] === formula)); } },
      { say: '把圖上的兩個長度，填進方格。', stage: 'equation', act: async P => { await P.equation(a, b); } }
    ];
    if (s === 5) return [
      { say: type === 'triangle' ? `${a} 乘 ${b} 是 ${a * b}，再除以 2，是 ${A}。` : `${a} 乘 ${b} 是 ${A}。`, stage: 'calc', act: async P => { await P.calc(a, b, type === 'triangle'); } },
      { say: g ? '和點的格數比一比，一樣，答案沒問題。' : type === 'triangle' ? '答案乘 2，和拼好的圖形一樣，答案沒問題。' : '和移好的長方形比一比，一樣，答案沒問題。', stage: 'keep+chips', chips: opts(type, 'verify').map(x => x[1]), act: async P => { await P.tapChip(0); } }
    ];
    return [{ say: '面積的單位是平方公分。', stage: 'chips', chips: opts(type, 'unit').map(x => x[1]), act: async P => { await P.tapChip(0); } }];
  }

  // ---------- 播放器 ----------
  function mount(host, cfg) {
    const { type, step, method = 'mark', dims = [0, 0, 0], rate = 'normal', onEvent = () => {} } = cfg;
    const ex = cfg.scenes ? [0, 0, 0] : example(type, dims), scenes = cfg.scenes || script(type, step, method, ex);
    host.innerHTML = `<div class="sd" role="group" aria-label="示範動畫">
      <div class="sd-stage" aria-hidden="true"><div class="sd-body"></div><span class="sd-finger">👆</span></div>
      <p class="sd-caption" aria-live="polite" data-read>按「▶ 播放」，看一看怎麼做。</p>
      <div class="sd-bar"><button type="button" class="sd-play primary-soft">▶ 播放</button><button type="button" class="sd-slow" aria-pressed="${rate === 'slow'}">🐢 慢一點</button><span class="sd-count">共 ${scenes.length} 段</span></div>
      <p class="sd-end" hidden data-read>👉 換你做做看！</p></div>`;
    const $ = sel => host.querySelector(sel), body = $('.sd-body'), finger = $('.sd-finger');
    let token = 0, slow = rate === 'slow', figOpts = {}, playing = false;
    const k = () => slow ? 1.6 : 1;
    const alive = t => t === token && host.isConnected;
    $('.sd-slow').onclick = () => { slow = !slow; $('.sd-slow').setAttribute('aria-pressed', String(slow)); };

    const P = {
      async point(sel) {
        const el = typeof sel === 'string' ? body.querySelector(sel) : sel; if (!el) return;
        const r = el.getBoundingClientRect(), s = $('.sd-stage').getBoundingClientRect();
        finger.style.left = (r.left - s.left + r.width / 2 - 10) + 'px'; finger.style.top = (r.top - s.top + r.height / 2 - 4) + 'px';
        finger.classList.add('show'); await wait(650 * k());
      },
      async tap(el) { await P.point(el); finger.classList.add('tap'); await wait(260 * k()); finger.classList.remove('tap'); },
      pulseFigure() { body.querySelector('.sd-fig')?.classList.add('sd-pulse'); },
      async tapChip(i) { const c = body.querySelectorAll('.sd-chip')[i]; if (!c) return; await P.tap(c); c.classList.add('on'); await wait(500 * k()); },
      async markCell(i, n) { const c = body.querySelectorAll('.sd-cell')[i]; await P.tap(c); c.classList.add('on'); c.textContent = n; },
      async countCell(i, n) { const c = body.querySelectorAll('.sd-cell')[i]; await P.point(c); c.classList.add('count'); c.textContent = n; await wait(200 * k()); },
      // 第 23 版：一排的格子一格一格亮起來，排尾寫上加到現在的總數，字幕顯示「6 + 6 = 12」
      async markRow(r) {
        const cells = [...body.querySelectorAll('.sd-cell')].slice(r * ex[0], (r + 1) * ex[0]);
        await P.tap(cells[0]);
        for (const c of cells) { c.classList.add('on'); await wait(160 * k()); }
        cells.at(-1).textContent = (r + 1) * ex[0];
        const sum = $('.sd-sum'); if (sum) sum.textContent = r ? `${Array(r + 1).fill(ex[0]).join(' + ')} = ${(r + 1) * ex[0]}` : `第 1 排：${ex[0]} 格`;
        await wait(500 * k());
      },
      els: sel => [...body.querySelectorAll(sel)],
      // 第 23 版：指向一整塊（例如圖形 A 的所有格子），並讓那一塊亮起來，不會指在兩塊中間
      async pointGroup(sel) {
        const list = P.els(sel); if (!list.length) return;
        const rs = list.map(e => e.getBoundingClientRect()), s = $('.sd-stage').getBoundingClientRect();
        const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
        body.querySelectorAll('.sd-focus').forEach(e => e.classList.remove('sd-focus')); list.forEach(e => e.classList.add('sd-focus'));
        finger.style.left = ((l + r) / 2 - s.left - 10) + 'px'; finger.style.top = ((t + b) / 2 - s.top - 4) + 'px';
        finger.classList.add('show'); await wait(900 * k());
      },
      async pointAll(sel) { const list = [...body.querySelectorAll(sel)].slice(0, 4); for (const el of list) await P.tap(el); },
      async type(v) { const box = body.querySelector('.sd-input b'); if (!box) return; await P.tap(box); for (const ch of String(v)) { box.textContent += ch; await wait(220 * k()); } box.classList.add('ok'); },
      async figure(o) { figOpts = { ...figOpts, ...o }; drawFigure(); await wait(700 * k()); },
      async pickHeight() { const l = body.querySelector('[data-line].sd-hl') || body.querySelector('.height-line'); const letter = Object.entries(lineMap()).find(([, v]) => v === 'height')[0]; const tag = [...body.querySelectorAll('.line-tag')].find(g => g.textContent.trim() === letter); await P.tap(tag || l); figOpts = { ...figOpts, selected: letter }; drawFigure(); await wait(500 * k()); },
      async equation(x, y) { const boxes = body.querySelectorAll('.sd-eq b'); for (const [i, v] of [[0, x], [1, y]]) { await P.tap(boxes[i]); boxes[i].textContent = v; await wait(300 * k()); } },
      async calc(x, y, half) { const r = body.querySelector('.sd-calc'); r.innerHTML = `${x} × ${y} = <b>?</b>`; await P.point(r); await wait(500 * k()); r.innerHTML = `${x} × ${y} = <b>${x * y}</b>`; if (half) { await wait(700 * k()); r.innerHTML += ` ÷ 2 = <b>${x * y / 2}</b>`; } await wait(400 * k()); }
    };
    const lineMap = () => ({ A: 'side', B: 'height', C: 'dash' });
    function drawFigure() {
      const f = body.querySelector('.sd-fig'); if (!f) return;
      const o = { frame: figOpts.frame || 0, showBase: !!figOpts.showBase, showHeight: !!figOpts.showHeight, pulse: figOpts.pulse || '', lines: figOpts.lines ? lineMap() : null, selected: figOpts.selected || '' };
      f.innerHTML = window.sevenDiagram(type, ex, o);
    }
    function gridHtml(edge) {
      const [a, b] = ex;
      return `<div class="sd-fig sd-grid" style="--cols:${a}">${Array.from({ length: a * b }, (_, i) => `<span class="sd-cell ${edge === 'row' && i < a || edge === 'col' && i % a === 0 ? 'edge' : ''}"></span>`).join('')}</div>`;
    }
    function render(scene) {
      if (scene.html) {   // 新活動：直接放入示範畫面（拿掉 id 與互動屬性，避免和真的作答區混在一起）
        body.innerHTML = typeof scene.html === 'function' ? scene.html() : scene.html;
        body.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
        body.querySelectorAll('*').forEach(e => [...e.attributes].filter(a => a.name.startsWith('data-')).forEach(a => e.removeAttribute(a.name)));
        body.querySelectorAll('input').forEach(i => { i.readOnly = true; i.tabIndex = -1; if (i.value) i.classList.add('sd-filled'); });
        body.querySelectorAll('button').forEach(b => { b.disabled = true; b.tabIndex = -1; });
        return;
      }
      const st = scene.stage || 'keep';
      const keep = st.startsWith('keep');
      if (!keep) {
        body.innerHTML = '';
        if (st.includes('figure')) { figOpts = { ...(scene.fig || {}) }; body.insertAdjacentHTML('beforeend', '<div class="sd-fig"></div>'); drawFigure(); }
        if (st === 'grid') body.insertAdjacentHTML('beforeend', gridHtml(scene.edge) + (scene.sum ? '<p class="sd-sum" aria-hidden="true"></p>' : ''));
        if (st === 'equation') body.insertAdjacentHTML('beforeend', `<div class="sd-eq"><b></b> ${type === 'triangle' ? '×' : '×'} <b></b>${type === 'triangle' ? ' ÷ 2' : ''}</div>`);
        if (st === 'calc') body.insertAdjacentHTML('beforeend', '<p class="sd-calc"></p>');
      } else if (scene.fig) { figOpts = { ...figOpts, ...scene.fig }; drawFigure(); }
      body.querySelectorAll('.sd-chips,.sd-input').forEach(e => e.remove());
      if (st.includes('chips') && scene.chips) body.insertAdjacentHTML('beforeend', `<div class="sd-chips">${scene.chips.map(c => `<span class="sd-chip">${c}</span>`).join('')}</div>`);
      if (st.includes('input')) body.insertAdjacentHTML('beforeend', `<p class="sd-input">${scene.label || ''} <b></b></p>`);
    }
    function speak(text, t) {
      return new Promise(resolve => {
        const fallback = () => setTimeout(resolve, Math.max(1600, text.length * 230) * k());
        if (!('speechSynthesis' in window)) return fallback();
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; u.rate = slow ? 0.65 : 0.9; const v = voice(); if (v) u.voice = v;
          let done = false; const end = () => { if (!done) { done = true; resolve(); } };
          u.onend = end; u.onerror = end; setTimeout(end, Math.max(2500, text.length * 450) * k());   // 沒有聲音的裝置也會往下播
          if (alive(t)) speechSynthesis.speak(u); else end();
        } catch { fallback(); }
      });
    }
    async function play() {
      const t = ++token; playing = true; $('.sd-end').hidden = true; finger.classList.remove('show');
      $('.sd-play').textContent = '⏹ 停止'; onEvent('play');
      for (let i = 0; i < scenes.length; i++) {
        if (!alive(t)) return;
        const sc = scenes[i]; render(sc);
        const sayText = typeof sc.say === 'function' ? sc.say() : sc.say;
        $('.sd-caption').textContent = sayText; $('.sd-count').textContent = `第 ${i + 1}／${scenes.length} 段`;
        await Promise.all([speak(sayText, t), (async () => { await wait(250); if (alive(t)) await sc.act(P); })()]);
        if (!alive(t)) return;
        await wait(450 * k());
      }
      if (!alive(t)) return;
      playing = false; finger.classList.remove('show');
      $('.sd-play').textContent = '↻ 再看一次'; $('.sd-end').hidden = false; $('.sd-count').textContent = `共 ${scenes.length} 段`;
      onEvent('end');
    }
    function stop() { token++; playing = false; try { speechSynthesis.cancel(); } catch { /* 略過 */ } $('.sd-play').textContent = '▶ 播放'; finger.classList.remove('show'); onEvent('stop'); }
    $('.sd-play').onclick = () => playing ? stop() : play();
    render(scenes[0]);
    return { play, stop, scenes: scenes.length, example: ex };
  }

  window.stepDemo = { mount, example, script };
})();

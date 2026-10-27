'use strict';
// 第 19 版：學習地圖的單元與活動，以及新活動共用的工具。
// 每個新活動（外掛）用 areaActs.register(id, plugin) 註冊，學生頁（seven.js）用同一套
// 「看題選方法 → 動手做 → 檢查回顧」、三層提示、示範影片與紀錄來執行。
(() => {
  // 學習地圖：單元 → 活動。kind: shape（原本的圖形解題）｜plugin（新活動）
  const UNITS = [
    { id: 'u1', title: '面積是什麼', icon: '🔍', code: 'N-2-12、N-3-14' },
    { id: 'u2', title: '周長和面積', icon: '📏', code: 'S-4-3' },
    { id: 'u3', title: '長方形和正方形', icon: '▭', code: 'S-4-3、R-4-3、N-4-11' },
    { id: 'u4', title: '三角形和四邊形', icon: '△', code: 'S-5-2' },
    { id: 'u5', title: '用在生活', icon: '🏠', code: 'R-4-3、N-4-11' }
  ];
  const LIST = [
    { id: 'compare', unit: 'u1', no: '1-1', title: '比一比，哪個比較大', code: 'N-2-12', icon: '⚖️', kind: 'plugin' },
    { id: 'tile', unit: 'u1', no: '1-2', title: '鋪方格', code: 'N-3-14', icon: '🟦', kind: 'plugin' },
    { id: 'conserve', unit: 'u1', no: '1-3', title: '剪開再拼，面積一樣嗎', code: 'N-3-14', icon: '✂️', kind: 'plugin' },
    { id: 'estimate', unit: 'u1', no: '1-4', title: '先估一估，再數一數', code: 'N-3-14', icon: '🤔', kind: 'plugin' },
    { id: 'perimeter', unit: 'u2', no: '2-1', title: '周長：沿著邊走一圈', code: 'S-4-3', icon: '🚶', kind: 'plugin' },
    { id: 'which', unit: 'u2', no: '2-2', title: '要算面積還是周長', code: 'S-4-3', icon: '❓', kind: 'plugin' },
    { id: 'samePerimeter', unit: 'u2', no: '2-3', title: '周長一樣，面積也一樣嗎', code: 'S-4-3', icon: '🟰', kind: 'plugin' },
    { id: 'rectangle', unit: 'u3', no: '3-1', title: '長方形的面積', code: 'S-4-3、R-4-3', icon: '▭', kind: 'shape' },
    { id: 'square', unit: 'u3', no: '3-1', title: '正方形的面積', code: 'S-4-3、R-4-3', icon: '◻️', kind: 'shape' },
    { id: 'inverse', unit: 'u3', no: '3-2', title: '知道面積，找邊長', code: 'S-4-3', icon: '🔁', kind: 'plugin' },
    { id: 'arrange', unit: 'u3', no: '3-3', title: '12 格可以排成哪些長方形', code: 'S-4-3', icon: '🧩', kind: 'plugin' },
    { id: 'composite', unit: 'u3', no: '3-4', title: '複合圖形：切開再加起來', code: 'S-4-3', icon: '⬛', kind: 'plugin' },
    { id: 'squareMeter', unit: 'u3', no: '3-5', title: '平方公尺', code: 'N-4-11', icon: '📰', kind: 'plugin' },
    { id: 'parallelogram', unit: 'u4', no: '4-1', title: '平行四邊形的面積', code: 'S-5-2', icon: '▱', kind: 'shape' },
    { id: 'triangle', unit: 'u4', no: '4-2', title: '三角形的面積', code: 'S-5-2', icon: '△', kind: 'shape' },
    { id: 'trapezoid', unit: 'u4', no: '4-3', title: '梯形的面積', code: 'S-5-2、s-III-1', icon: '⏢', kind: 'plugin' },
    { id: 'word', unit: 'u5', no: '5-1', title: '生活應用題', code: 'R-4-3、N-4-11', icon: '🏠', kind: 'plugin' }
  ];
  const plugins = {};
  const available = () => LIST.filter(a => a.kind === 'shape' || plugins[a.id]);
  // 課綱路徑（老師一鍵套用，再依 IEP 增減）
  const PATHS = {
    g3: { title: '三年級版', ids: ['compare', 'tile', 'conserve', 'estimate', 'rectangle', 'square'] },
    g4: { title: '四年級版', ids: ['compare', 'tile', 'conserve', 'estimate', 'perimeter', 'which', 'samePerimeter', 'rectangle', 'square', 'inverse', 'arrange', 'composite', 'squareMeter', 'word'] },
    g5: { title: '五年級延伸', ids: LIST.map(a => a.id) },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };

  // ---------- 共用工具 ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (list, i) => list[((i % list.length) + list.length) % list.length];
  const shuffle = (a, random = Math.random) => { const l = a.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const rectCells = (w, h, x0 = 0, y0 = 0) => { const c = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.push([x0 + x, y0 + y]); return c; };
  const key = c => c[0] + ',' + c[1];

  // 方格圖：cells = [{x,y,cls,label,half:'tl'|'tr'|'bl'|'br',attrs}]，每格 u 像素
  function gridSVG(o) {
    const { cols, rows, u = 40, cells = [], lines = true, outline = null, extra = '', pad = 26, aria = '方格圖', id = '' } = o;
    const W = cols * u, H = rows * u;
    let g = '';
    if (lines) { for (let x = 0; x <= cols; x++) g += `M${x * u} 0V${H}`; for (let y = 0; y <= rows; y++) g += `M0 ${y * u}H${W}`; }
    const tri = { tl: (x, y) => `${x},${y} ${x + u},${y} ${x},${y + u}`, br: (x, y) => `${x + u},${y} ${x + u},${y + u} ${x},${y + u}`, tr: (x, y) => `${x},${y} ${x + u},${y} ${x + u},${y + u}`, bl: (x, y) => `${x},${y} ${x},${y + u} ${x + u},${y + u}` };
    const body = cells.map(c => {
      const x = c.x * u, y = c.y * u, cls = c.cls || 'ac-fill', at = c.attrs || '';
      const shape = c.half ? `<polygon points="${tri[c.half](x, y)}" class="${cls}" ${at}/>` : `<rect x="${x}" y="${y}" width="${u}" height="${u}" class="${cls}" ${at}/>`;
      const lb = c.label != null && c.label !== '' ? `<text x="${x + u / 2}" y="${y + u / 2 + 6}" text-anchor="middle" class="ac-num">${esc(c.label)}</text>` : '';
      return shape + lb;
    }).join('');
    const ol = outline ? `<path d="${outline}" class="ac-outline"/>` : '';
    return `<svg class="ac-svg" ${id ? `id="${id}"` : ''} viewBox="${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}" role="img" aria-label="${esc(aria)}"><path d="${g}" class="ac-grid"/>${body}${ol}${extra}</svg>`;
  }
  // 由格子集合算出外框路徑（直角多邊形的邊）
  function outlineOf(cells, u = 40) {
    const set = new Set(cells.map(key)); let d = '';
    for (const [x, y] of cells) {
      if (!set.has(key([x, y - 1]))) d += `M${x * u} ${y * u}H${(x + 1) * u}`;
      if (!set.has(key([x, y + 1]))) d += `M${x * u} ${(y + 1) * u}H${(x + 1) * u}`;
      if (!set.has(key([x - 1, y]))) d += `M${x * u} ${y * u}V${(y + 1) * u}`;
      if (!set.has(key([x + 1, y]))) d += `M${(x + 1) * u} ${y * u}V${(y + 1) * u}`;
    }
    return d;
  }
  const bounds = cells => ({ w: Math.max(...cells.map(c => c[0])) + 1, h: Math.max(...cells.map(c => c[1])) + 1 });
  const num = v => { const s = String(v ?? '').trim(); return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
  const fieldHtml = (ctx, id, label, step) => `<label class="field"><span data-read data-say>${label}</span><input id="${id}" data-answer="${id}" data-step="${step}" inputmode="decimal" autocomplete="off" value="${esc(ctx.answers[id] ?? '')}"></label>`;

  // 動畫示範的兩個畫面：先看題（例題），再看做好的樣子。例題每次重新產生，數字和學生的題目不同。
  // current：學生這一題的題目。第 23 版：例題的數字答案一定和學生這一題不同，照抄示範不會矇對。
  function demoScenes(pl, s, level = 'standard', settings = {}, current = null) {
    const st = pl.steps[s];
    const blank = problem => {
      const ex = { answers: {}, state: {}, plugin: pl, settings, method: 'mark', level, hint: () => 0, checked: () => false, invalidate() {}, refreshFigure() {}, rerender() {}, log() {}, problem };
      ex.choice = (id, title, items) => `<fieldset class="choice"><legend>${title}</legend><div class="options">${items.map(x => `<button type="button" aria-pressed="${ex.answers[id] === x[0]}">${x[1]}</button>`).join('')}</div></fieldset>`;
      return ex;
    };
    // 這一步做完時填的數字（選項不算，選項本來就會一樣）
    const numbers = problem => { const e = blank(problem); try { st.solve(e); } catch { return ''; } return Object.values(e.answers).filter(v => /^\d/.test(String(v ?? ''))).join('|'); };
    const target = current ? numbers(current) : '', same = p => current && JSON.stringify(p) === JSON.stringify(current);
    const make = () => {
      let problem = null;
      for (let i = 0; i < 30; i++) {
        problem = pl.makeProblem(level, 1 + Math.floor(Math.random() * 6), Math.random);
        if (!same(problem) && (!target || numbers(problem) !== target)) break;
      }
      return blank(problem);
    };
    let ex = make();
    const view = () => `<div class="sd-plugin">${st.figure ? `<div class="sd-pfig">${st.figure(ex)}</div>` : ''}<div class="sd-ans">${st.answer(ex)}</div></div>`;
    return [
      // 有 A、B 兩個圖形時，手指分別指 A 和 B（第 23 版：不再指在兩個圖形中間）
      { say: st.think || st.hints[0], html: () => { ex = make(); return view(); }, act: async D => { if (D.els('.sd-pfig .ac-a').length && D.els('.sd-pfig .ac-b').length) { await D.pointGroup('.sd-pfig .ac-a'); await D.pointGroup('.sd-pfig .ac-b'); } else await D.point('.sd-pfig svg, .sd-pfig, .sd-ans'); } },
      // 步驟可以自訂示範動作（st.demo），例如 3-2 沿著左邊一排一排往下數
      { say: () => st.say ? st.say(ex) : st.hints[2], html: () => { st.solve(ex); return view(); }, act: async D => { if (st.demo) { await st.demo(D, ex); return; } await D.pointAll('.sd-ans [aria-pressed=true], .sd-ans input.sd-filled, .sd-pfig .ac-mark, .sd-pfig .ac-tile, .sd-pfig .ac-side.on'); } }
    ];
  }

  function register(id, plugin) { plugins[id] = { id, ...LIST.find(a => a.id === id), ...plugin }; }

  window.areaActs = { UNITS, LIST, PATHS, plugins, available, register, demoScenes, get: id => plugins[id] || null, info: id => LIST.find(a => a.id === id) || null,
    util: { esc, pick, shuffle, rectCells, key, gridSVG, outlineOf, bounds, num, fieldHtml } };
})();

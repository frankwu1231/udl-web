'use strict';
// 共用：流程、設定、題組。學生頁與教師頁都會載入。
(() => {
  // 活動編號：0 看題目、1 數格／操作、2 找底（第一個邊長）、3 找高（另一個邊長）、4 列算式、5 計算與比較、6 單位
  const OPTIONAL = [0, 1, 2, 3];
  const defaults = {
    flow: 'seven',          // seven｜three｜custom
    keep: [0, 1, 2, 3],     // 自訂時保留的可省略活動
    support: 'full',        // full：自動顯示第一層提示；faded：需要時才看
    labels: 'reveal',       // reveal：學生找到後才顯示長度；always：一直顯示
    ai: true,               // 是否開放 AI 線索與 AI 反思
    reward: true,           // 答對時的動畫與音效
    grid: false,            // 圖上顯示 1 公分方格線（降低難度）
    sound: true,
    rate: 'normal',         // 朗讀速度：slow｜normal
    hintGate: false,
    difficulty: 'standard',
    // 第 18 版：自我調整（SRL）
    mode: 'self',           // self 自己做｜together 一起做｜demo 老師示範｜probe 小測驗（維持評量，不給提示）
    goalKind: 'hints',      // hints：最多看幾個提示｜firstTry：幾步一次答對
    confidence: true,       // 作答前問「有多少把握」
    selfAsk: true,          // 解題頁顯示「我的自問卡」
    badges: true,           // 集章
    voice: false,           // 回顧頁可以錄音
    rest: 0,                // 每做幾題提醒休息（0＝不提醒）
    handsOn: false,         // 規劃頁提醒先用實物做
    fading: false,          // 第 21 版：例題逐步留空（反向退除）：先看完整例題，再一題一題把最後幾步換學生做
    video: 'hint',
    convert: false,         // 3-5 平方公尺：是否加入換算平方公分（預設關閉）          // 示範影片：off 不用｜hint 老師示範模式與第 3 層提示｜always 每一步都可以看
    methods: ['mark', 'row', 'self'],   // 開放的方法（row 一排一排加，只用在長方形、正方形）
    // 閱讀輔助（學生也可以自己切換）
    zhuyin: false,
    textSize: 'normal',     // normal｜large｜xlarge
    contrast: false
  };
  const METHODS = ['mark', 'row', 'self'];
  const MODES = ['self', 'together', 'demo', 'probe'];

  function settings(section) {
    const s = { ...defaults, ...(section && section.settings) };
    if (!Array.isArray(s.keep)) s.keep = OPTIONAL.slice();
    s.keep = OPTIONAL.filter(n => s.keep.includes(n));
    if (!Array.isArray(s.methods) || !s.methods.some(m => METHODS.includes(m))) s.methods = defaults.methods.slice();
    s.methods = METHODS.filter(m => s.methods.includes(m));
    if (!MODES.includes(s.mode)) s.mode = 'self';
    delete s.breaks;
    return s;
  }

  // 回傳每一頁要出現的活動。3 步：看題（含「要找什麼」）在規劃頁，單位在回顧頁。
  function pages(s) {
    if (s.flow === 'three') return [[4, 5]];
    if (s.flow === 'custom') return [...OPTIONAL.filter(n => s.keep.includes(n)).map(n => [n]), [4], [5], [6]];
    return [[0], [1], [2], [3], [4], [5], [6]];
  }
  const active = s => pages(s).flat();
  const hasActivity = (s, n) => active(s).includes(n);
  // 3 步把「這題要找什麼」放在規劃頁、單位放在回顧頁
  const targetInPlan = s => s.flow === 'three';
  const unitInReflect = s => s.flow === 'three';

  function valid(s) {
    return !!s && ['seven', 'three', 'custom'].includes(s.flow)
      && ['full', 'faded'].includes(s.support)
      && ['reveal', 'always'].includes(s.labels ?? 'reveal')
      && ['ai', 'reward', 'sound', 'hintGate', 'grid'].every(k => s[k] === undefined || typeof s[k] === 'boolean')
      && ['easy', 'standard', 'challenge', 'custom'].includes(s.difficulty)
      && ['slow', 'normal', undefined].includes(s.rate)
      && (s.keep === undefined || (Array.isArray(s.keep) && s.keep.every(v => OPTIONAL.includes(v))))
      && ['confidence', 'selfAsk', 'badges', 'voice', 'handsOn', 'zhuyin', 'contrast', 'convert', 'fading'].every(k => s[k] === undefined || typeof s[k] === 'boolean')
      && [undefined, ...MODES].includes(s.mode) && [undefined, 'hints', 'firstTry'].includes(s.goalKind)
      && [undefined, 'off', 'hint', 'always'].includes(s.video) && [undefined, 'normal', 'large', 'xlarge'].includes(s.textSize) && [undefined, 0, 2, 3].includes(s.rest)
      && (s.methods === undefined || (Array.isArray(s.methods) && s.methods.length > 0 && s.methods.every(v => METHODS.includes(v))));
  }

  // 小測驗用：在難度範圍內隨機出題（每次不同）
  function randomProblem(shape, level = 'standard', random = Math.random) {
    const r = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
    const R = { easy: [2, 5, 2, 4], standard: [3, 7, 2, 5], challenge: [5, 9, 4, 7] }[level] || [3, 7, 2, 5];
    if (shape === 'square') { const a = r(R[0], R[1]); return { a, b: a, offset: 0 }; }
    let a = r(Math.max(3, R[0]), R[1]), b = r(R[2], R[3]);
    if (shape === 'rectangle') { if (a === b) a++; return { a, b, offset: 0 }; }
    if (shape === 'triangle') return { a, b, offset: level === 'easy' ? 0 : r(-1, 1) };
    return { a, b, offset: r(1, Math.min(3, a - 1)) };
  }

  function shuffle(items, random = Math.random) {
    const list = items.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function preset(shape, level) {
    // 長方形不用長寬相等的題目；正方形三題邊長都不同
    const sets = { easy: [[3, 2], [4, 2], [4, 3]], standard: [[4, 3], [5, 3], [6, 4]], challenge: [[7, 5], [8, 6], [9, 7]] };
    const squares = { easy: [2, 3, 4], standard: [3, 4, 5], challenge: [6, 7, 8] };
    return sets[level].map(([a, b], i) => ({
      a: shape === 'square' ? squares[level][i] : a,
      b: shape === 'square' ? squares[level][i] : b,
      offset: ['rectangle', 'square'].includes(shape) ? 0
        : shape === 'triangle' ? (level === 'easy' ? 0 : level === 'challenge' ? -2 : i - 1)
        : level === 'easy' ? 1 : Math.min(a - 1, i + 1)
    }));
  }

  window.learningFlow = { defaults, OPTIONAL, METHODS, MODES, randomProblem, settings, pages, active, hasActivity, targetInPlan, unitInReflect, valid, shuffle, preset };
})();

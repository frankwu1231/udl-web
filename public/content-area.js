'use strict';
// 教材包：面積（第一個教材包）。網站依教材包畫出學習地圖、活動清單與課綱路徑；
// 伺服器在建置時也讀這個檔，取得活動代號與探試題型比例。換教材時，換一個教材包。
// 第 27 版：從 act-core.js 搬出來，內容不變。
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
  // 課綱路徑（老師一鍵套用，再依 IEP 增減）
  const PATHS = {
    g3: { title: '三年級版', ids: ['compare', 'tile', 'conserve', 'estimate', 'rectangle', 'square'] },
    g4: { title: '四年級版', ids: ['compare', 'tile', 'conserve', 'estimate', 'perimeter', 'which', 'samePerimeter', 'rectangle', 'square', 'inverse', 'arrange', 'composite', 'squareMeter', 'word'] },
    g5: { title: '五年級延伸', ids: LIST.map(a => a.id) },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 正式探試題組：一份 10 題的題型比例（伺服器驗證匯入的題組時用）
  const PROBE_TYPES = { count: 2, rectangle: 3, square: 2, inverse: 1, composite: 2 };
  const pkg = { id: 'area', title: '四種圖形面積', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_TYPES };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;   // 目前使用中的教材包
})();

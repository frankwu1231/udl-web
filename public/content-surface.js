'use strict';
// 教材包：表面積（第二個教材包，第二、三年研究用）。格式和 content-area.js 一樣。
// 活動清單依「表面積教材規劃」：5 單元、15 活動，3-1 長方體、3-2 正方體是七步驟的核心活動。
// 單元 5 柱體是六年級的內容（吳老師 2026-11-13 決定加上）。
// 課綱代碼：先填已核對原文的學習表現（十二年國教數學領綱 107 年 6 月：s-III-3、s-III-4）；
// 學習內容代碼（S-5-x、S-6-x）等吳老師查教育部原文後補上。
(() => {
  const UNITS = [
    { id: 's1', title: '認識立體的面', icon: '📦', code: 's-III-3' },
    { id: 's2', title: '展開圖', icon: '🗺️', code: 's-III-3' },
    { id: 's3', title: '長方體和正方體的表面積', icon: '🧊', code: 's-III-4' },
    { id: 's4', title: '用在生活', icon: '🎁', code: 's-III-4' },
    { id: 's5', title: '柱體的表面積（六年級）', icon: '🔺', code: 's-III-3、s-III-4' }
  ];
  const LIST = [
    { id: 'sFaces', unit: 's1', no: '1-1', title: '數一數：長方體有幾個面', code: 's-III-3', icon: '🔢', kind: 'plugin' },
    { id: 'sOpposite', unit: 's1', no: '1-2', title: '對面一樣大', code: 's-III-3', icon: '🪞', kind: 'plugin' },
    { id: 'sWrap', unit: 's1', no: '1-3', title: '包住外面：表面積是什麼', code: 's-III-4', icon: '🎁', kind: 'plugin' },
    { id: 'sNet', unit: 's2', no: '2-1', title: '打開盒子：展開圖', code: 's-III-3', icon: '📭', kind: 'plugin' },
    { id: 'sCubeNet', unit: 's2', no: '2-2', title: '哪些展開圖能摺成正方體', code: 's-III-3', icon: '🧩', kind: 'plugin' },
    { id: 'sNetPairs', unit: 's2', no: '2-3', title: '在展開圖上找對面', code: 's-III-3', icon: '🎨', kind: 'plugin' },
    { id: 'cuboid', unit: 's3', no: '3-1', title: '長方體的表面積', code: 's-III-4', icon: '📦', kind: 'plugin', core: true },
    { id: 'cube', unit: 's3', no: '3-2', title: '正方體的表面積', code: 's-III-4', icon: '🧊', kind: 'plugin', core: true },
    { id: 'sInverse', unit: 's3', no: '3-3', title: '知道表面積，找邊長', code: 's-III-4', icon: '🔁', kind: 'plugin' },
    { id: 'sWhich', unit: 's3', no: '3-4', title: '要算表面積還是體積', code: 's-III-4', icon: '❓', kind: 'plugin' },
    { id: 'sOpenBox', unit: 's4', no: '4-1', title: '沒有蓋子的盒子', code: 's-III-4', icon: '🥡', kind: 'plugin' },
    { id: 'sWord', unit: 's4', no: '4-2', title: '生活應用題：包裝紙、油漆', code: 's-III-4', icon: '🖌️', kind: 'plugin' },
    { id: 'sPrismFaces', unit: 's5', no: '5-1', title: '角柱的面：底面和側面', code: 's-III-3', icon: '🔺', kind: 'plugin' },
    { id: 'prism', unit: 's5', no: '5-2', title: '三角柱的表面積', code: 's-III-4', icon: '🧀', kind: 'plugin' },
    { id: 'cylinder', unit: 's5', no: '5-3', title: '圓柱的表面積', code: 's-III-4', icon: '🥫', kind: 'plugin' }
  ];
  const PATHS = {
    basic: { title: '基礎版（長方體、正方體）', ids: ['sFaces', 'sOpposite', 'sWrap', 'sNet', 'sNetPairs', 'cuboid', 'cube'] },
    grade6: { title: '六年級（長方體、正方體，再加柱體）', ids: ['sFaces', 'sOpposite', 'sWrap', 'sNet', 'sNetPairs', 'cuboid', 'cube', 'sPrismFaces', 'prism', 'cylinder'] },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組一份 10 題的題型比例（2026-11-13 建議版，等吳老師確認）：一個面 1、長方體 3、正方體 2、柱體 2、反推 1、沒有蓋子 1
  const PROBE_TYPES = { face: 1, cuboid: 3, cube: 2, prism: 2, inverse: 1, openBox: 1 };
  const pkg = { id: 'surface', title: '表面積（長方體、正方體、柱體）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_TYPES };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

'use strict';
// 教材包：表面積（第二個教材包，第二、三年研究用）。格式和 content-area.js 一樣。
// 活動清單依「表面積教材規劃」：4 單元、12 活動，3-1 長方體、3-2 正方體是七步驟的核心活動。
// 課綱代碼還沒定（等老師提供），先留空。
(() => {
  const UNITS = [
    { id: 's1', title: '認識立體的面', icon: '📦', code: '' },
    { id: 's2', title: '展開圖', icon: '🗺️', code: '' },
    { id: 's3', title: '長方體和正方體的表面積', icon: '🧊', code: '' },
    { id: 's4', title: '用在生活', icon: '🎁', code: '' }
  ];
  const LIST = [
    { id: 'sFaces', unit: 's1', no: '1-1', title: '數一數：長方體有幾個面', code: '', icon: '🔢', kind: 'plugin' },
    { id: 'sOpposite', unit: 's1', no: '1-2', title: '對面一樣大', code: '', icon: '🪞', kind: 'plugin' },
    { id: 'sWrap', unit: 's1', no: '1-3', title: '包住外面：表面積是什麼', code: '', icon: '🎁', kind: 'plugin' },
    { id: 'sNet', unit: 's2', no: '2-1', title: '打開盒子：展開圖', code: '', icon: '📭', kind: 'plugin' },
    { id: 'sCubeNet', unit: 's2', no: '2-2', title: '哪些展開圖能摺成正方體', code: '', icon: '🧩', kind: 'plugin' },
    { id: 'sNetPairs', unit: 's2', no: '2-3', title: '在展開圖上找對面', code: '', icon: '🎨', kind: 'plugin' },
    { id: 'cuboid', unit: 's3', no: '3-1', title: '長方體的表面積', code: '', icon: '📦', kind: 'plugin', core: true },
    { id: 'cube', unit: 's3', no: '3-2', title: '正方體的表面積', code: '', icon: '🧊', kind: 'plugin', core: true },
    { id: 'sInverse', unit: 's3', no: '3-3', title: '知道表面積，找邊長', code: '', icon: '🔁', kind: 'plugin' },
    { id: 'sWhich', unit: 's3', no: '3-4', title: '要算表面積還是體積', code: '', icon: '❓', kind: 'plugin' },
    { id: 'sOpenBox', unit: 's4', no: '4-1', title: '沒有蓋子的盒子', code: '', icon: '🥡', kind: 'plugin' },
    { id: 'sWord', unit: 's4', no: '4-2', title: '生活應用題：包裝紙、油漆', code: '', icon: '🖌️', kind: 'plugin' }
  ];
  const PATHS = {
    basic: { title: '基礎版（長方體、正方體）', ids: ['sFaces', 'sOpposite', 'sWrap', 'sNet', 'sNetPairs', 'cuboid', 'cube'] },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組一份 10 題的題型比例：一個面 2、長方體 4、正方體 2、反推 1、沒有蓋子 1
  const PROBE_TYPES = { face: 2, cuboid: 4, cube: 2, inverse: 1, openBox: 1 };
  const pkg = { id: 'surface', title: '長方體和正方體的表面積', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_TYPES };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

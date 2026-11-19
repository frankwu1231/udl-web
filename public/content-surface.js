'use strict';
// 教材包：表面積（第二個教材包，第二、三年研究用）。格式和 content-area.js 一樣。
// 活動清單依「表面積教材規劃」：5 單元、15 活動，3-1 長方體、3-2 正方體是七步驟的核心活動。
// 單元 5 柱體是六年級的內容（吳老師 2026-11-13 決定加上）。
// 課綱代碼：先填已核對原文的學習表現（十二年國教數學領綱 107 年 6 月：s-III-3、s-III-4）；
// 學習內容代碼（S-5-x、S-6-x）等吳老師查教育部原文後補上。
// 第 34 版：單元 4 擴充成跨領域單元「包裝小達人」（act-life.js）。跨領域代碼依 Codex 查證：特生E-sA-1 物品再利用（4-3）；
// 綜合 3d-Ⅲ-1、環E17 養成日常生活節約用水、用電、物質的行為（4-5）。其他活動只標數學代碼。
(() => {
  const UNITS = [
    { id: 's1', title: '認識立體的面', icon: '📦', code: 's-III-3' },
    { id: 's2', title: '展開圖', icon: '🗺️', code: 's-III-3' },
    { id: 's3', title: '長方體和正方體的表面積', icon: '🧊', code: 's-III-4' },
    { id: 's4', title: '包裝小達人（生活應用）', icon: '🎁', code: 's-III-4、特生E-sA-1、環E17' },
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
    { id: 'sGift', unit: 's4', no: '4-3', title: '生活決策五步：包禮物要多少紙', code: 's-III-4、特生E-sA-1', icon: '🎁', kind: 'plugin', core: true },
    { id: 'sPaint', unit: 's4', no: '4-4', title: '房間四面牆要漆多少', code: 's-III-4', icon: '🖌️', kind: 'plugin' },
    { id: 'sSave', unit: 's4', no: '4-5', title: '哪一種包法最省紙', code: 's-III-4、綜合3d-Ⅲ-1、環E17', icon: '♻️', kind: 'plugin' },
    { id: 'sLabel', unit: 's4', no: '4-6', title: '罐子的標籤紙', code: 's-III-4', icon: '🏷️', kind: 'plugin' },
    { id: 'sPrismFaces', unit: 's5', no: '5-1', title: '角柱的面：底面和側面', code: 's-III-3', icon: '🔺', kind: 'plugin' },
    { id: 'prism', unit: 's5', no: '5-2', title: '三角柱的表面積', code: 's-III-4', icon: '🧀', kind: 'plugin' },
    { id: 'cylinder', unit: 's5', no: '5-3', title: '圓柱的表面積', code: 's-III-4', icon: '🥫', kind: 'plugin' }
  ];
  const PATHS = {
    basic: { title: '基礎版（長方體、正方體）', ids: ['sFaces', 'sOpposite', 'sWrap', 'sNet', 'sNetPairs', 'cuboid', 'cube'] },
    grade6: { title: '六年級（長方體、正方體，再加柱體）', ids: ['sFaces', 'sOpposite', 'sWrap', 'sNet', 'sNetPairs', 'cuboid', 'cube', 'sPrismFaces', 'prism', 'cylinder'] },
    life: { title: '包裝小達人（生活應用，可當類化探測）', ids: ['sOpenBox', 'sWord', 'sGift', 'sPaint', 'sSave', 'sLabel'] },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組一份 10 題的題型比例（2026-11-13 建議版，等吳老師確認）：一個面 1、長方體 3、正方體 2、柱體 2、反推 1、沒有蓋子 1
  const PROBE_TYPES = { face: 1, cuboid: 3, cube: 2, prism: 2, inverse: 1, openBox: 1 };
  // 第 34 版：生活應用題組（題組 JSON 寫 "variant": "life"）；沒寫 variant 的還是上面的比例
  const PROBE_VARIANTS = { life: { lifeGift: 3, lifePaint: 3, lifeSave: 2, lifeLabel: 2 } };
  const pkg = { id: 'surface', title: '表面積（長方體、正方體、柱體）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_TYPES, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

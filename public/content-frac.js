'use strict';
// 教材包：分數（第六個教材包，第 33 版）。格式和 content-time.js 一樣。
// 依「分數教材包：課綱與單元大綱」（docs/frac/）與吳老師 2026-11-18 的決定：
// 二到六年級都做（單元 0～10），再加跨領域單元 11「分數小幫手」（生活應用，可當類化探測）。
// 核心步驟：2-2「看分數五步」、3-2「分數計算五步」、6-2「一樣多四步」、7-1「數線四步」、8-3「通分五步」、9-2「分數乘除五步」、11-2「生活決策五步」。單元 0 當先測。
// 課綱（已對照教育部數學領綱原文）：N-2-10（n-I-6）；N-3-9、N-4-5、N-4-6（n-II-6）；N-4-8（n-II-8）；N-5-4（n-III-4）；N-5-5、N-5-7、N-6-3（n-III-6）；N-5-6（n-III-5）。
// 課綱備註：二年級只用連續量、摺紙只摺半（長方形 2、4、8，圓 2、4）；三年級結果不超過 2、不教帶分數；N-4-6 異分母限一分母是另一分母的倍數、與小數互換限分母 2、5、10、100；
// N-4-8 數線分母不大於 5；N-5-4 通分不鼓勵分母直接相乘。
// 跨領域（108 年特殊需求領域課綱、107 年綜合活動領綱原文，Codex 查證）：特生1-sA-2、特生A-sA-1、特生A-sP-4、特生A-sP-8、特生A-sP-9、特生3-sP-4、特生K-sP-5；
// 綜合活動 2b-Ⅱ-1、2b-Ⅲ-1、2c-Ⅱ-1、2c-Ⅲ-1、Bc-Ⅱ-3。課綱沒有量杯、量匙或分數的專屬條目，以上是課程對應，分數本身仍連結數學 N 代碼。
(() => {
  const UNITS = [
    { id: 'r0', title: '準備好了嗎（先測）', icon: '🧭', code: 'N-2-9' },
    { id: 'r1', title: '平分與幾分之一', icon: '🍰', code: 'N-2-10' },
    { id: 'r2', title: '幾分之幾', icon: '🍫', code: 'N-3-9' },
    { id: 'r3', title: '同分母比大小與加減', icon: '⚖️', code: 'N-3-9' },
    { id: 'r4', title: '真分數、假分數、帶分數', icon: '🥧', code: 'N-4-5' },
    { id: 'r5', title: '同分母加減與整數倍', icon: '➕', code: 'N-4-5' },
    { id: 'r6', title: '等值分數', icon: '🟰', code: 'N-4-6' },
    { id: 'r7', title: '分數在數線上、分數和小數', icon: '📏', code: 'N-4-8、N-4-6' },
    { id: 'r8', title: '擴分、約分與異分母加減（五年級）', icon: '🔀', code: 'N-5-4' },
    { id: 'r9', title: '分數乘法（五年級）', icon: '✖️', code: 'N-5-5' },
    { id: 'r10', title: '整數相除與分數除法（五、六年級）', icon: '➗', code: 'N-5-6、N-5-7、N-6-3' },
    { id: 'r11', title: '分數小幫手（生活管理、綜合活動）', icon: '🧑‍🍳', code: 'N-4-6、特生1-sA-2、2c-Ⅱ-1' }
  ];
  const LIST = [
    { id: 'frSame', unit: 'r0', no: '0-1', title: '一樣多嗎', code: 'N-2-9', icon: '🍪', kind: 'plugin', pretest: true },
    { id: 'frCut', unit: 'r0', no: '0-2', title: '切成一樣大', code: 'N-2-9', icon: '🔪', kind: 'plugin', pretest: true },
    { id: 'frFair', unit: 'r1', no: '1-1', title: '是不是平分', code: 'N-2-10', icon: '🍕', kind: 'plugin' },
    { id: 'frFold', unit: 'r1', no: '1-2', title: '摺一摺', code: 'N-2-10', icon: '📄', kind: 'plugin' },
    { id: 'frUnit', unit: 'r1', no: '1-3', title: '一格是幾分之一', code: 'N-2-10、n-I-6', icon: '🟦', kind: 'plugin' },
    { id: 'frCount', unit: 'r2', no: '2-1', title: '幾個幾分之一', code: 'N-3-9', icon: '🍫', kind: 'plugin' },
    { id: 'frRead', unit: 'r2', no: '2-2', title: '看圖寫分數', code: 'N-3-9、n-II-6', icon: '✏️', kind: 'plugin', core: true },
    { id: 'frWhole', unit: 'r2', no: '2-3', title: '合起來是 1', code: 'N-3-9', icon: '🎂', kind: 'plugin' },
    { id: 'frCompare', unit: 'r3', no: '3-1', title: '誰比較多', code: 'N-3-9', icon: '⚖️', kind: 'plugin' },
    { id: 'frAdd', unit: 'r3', no: '3-2', title: '合起來是多少', code: 'N-3-9、n-II-6', icon: '➕', kind: 'plugin', core: true },
    { id: 'frSub', unit: 'r3', no: '3-3', title: '還剩多少', code: 'N-3-9', icon: '➖', kind: 'plugin' },
    { id: 'frImproper', unit: 'r4', no: '4-1', title: '比 1 大的分數', code: 'N-4-5', icon: '🥧', kind: 'plugin' },
    { id: 'frMixed', unit: 'r4', no: '4-2', title: '假分數和帶分數', code: 'N-4-5', icon: '🔁', kind: 'plugin' },
    { id: 'frOrder', unit: 'r4', no: '4-3', title: '排排看', code: 'N-4-5', icon: '📶', kind: 'plugin' },
    { id: 'frMixAdd', unit: 'r5', no: '5-1', title: '帶分數加減', code: 'N-4-5', icon: '🧁', kind: 'plugin' },
    { id: 'frTimes', unit: 'r5', no: '5-2', title: '幾個一樣的分數', code: 'N-4-5', icon: '🥤', kind: 'plugin' },
    { id: 'frWord', unit: 'r5', no: '5-3', title: '應用題', code: 'N-4-5、n-II-6', icon: '📝', kind: 'plugin' },
    { id: 'frEquiv', unit: 'r6', no: '6-1', title: '一樣多', code: 'N-4-6', icon: '🟰', kind: 'plugin' },
    { id: 'frSplit', unit: 'r6', no: '6-2', title: '切細一點', code: 'N-4-6、n-II-6', icon: '🍞', kind: 'plugin', core: true },
    { id: 'frEasyDiff', unit: 'r6', no: '6-3', title: '簡單異分母', code: 'N-4-6', icon: '🍕', kind: 'plugin' },
    { id: 'frLine', unit: 'r7', no: '7-1', title: '數線上的分數', code: 'N-4-8、n-II-8', icon: '📏', kind: 'plugin', core: true },
    { id: 'frDecimal', unit: 'r7', no: '7-2', title: '分數變小數', code: 'N-4-6', icon: '🔟', kind: 'plugin' },
    { id: 'frFar', unit: 'r7', no: '7-3', title: '誰走得比較遠', code: 'N-4-8', icon: '🚶', kind: 'plugin' },
    { id: 'frScale', unit: 'r8', no: '8-1', title: '擴分和約分', code: 'N-5-4', icon: '🔍', kind: 'plugin' },
    { id: 'frCommon', unit: 'r8', no: '8-2', title: '通分比大小', code: 'N-5-4', icon: '⚖️', kind: 'plugin' },
    { id: 'frUnlike', unit: 'r8', no: '8-3', title: '異分母加減', code: 'N-5-4、n-III-4', icon: '🔀', kind: 'plugin', core: true },
    { id: 'frOfWhole', unit: 'r9', no: '9-1', title: '整數乘以分數', code: 'N-5-5', icon: '🥚', kind: 'plugin' },
    { id: 'frOfFrac', unit: 'r9', no: '9-2', title: '分數乘以分數', code: 'N-5-5、n-III-6', icon: '🟪', kind: 'plugin', core: true },
    { id: 'frBigger', unit: 'r9', no: '9-3', title: '會變大還是變小', code: 'N-5-5', icon: '📈', kind: 'plugin' },
    { id: 'frShareQ', unit: 'r10', no: '10-1', title: '分不完怎麼辦', code: 'N-5-6、n-III-5', icon: '🥞', kind: 'plugin' },
    { id: 'frDivInt', unit: 'r10', no: '10-2', title: '分數除以整數', code: 'N-5-7', icon: '🧃', kind: 'plugin' },
    { id: 'frHowMany', unit: 'r10', no: '10-3', title: '可以剪幾段', code: 'N-6-3', icon: '🎀', kind: 'plugin' },
    { id: 'frDivFrac', unit: 'r10', no: '10-4', title: '分數除以分數', code: 'N-6-3、n-III-6', icon: '🥄', kind: 'plugin' },
    { id: 'frPizza', unit: 'r11', no: '11-1', title: '分食物', code: 'N-2-10、N-3-9、特生A-sP-8、2b-Ⅱ-1', icon: '🍕', kind: 'plugin' },
    { id: 'frRecipe', unit: 'r11', no: '11-2', title: '照食譜做', code: 'N-4-6、特生1-sA-2、特生A-sA-1、2c-Ⅱ-1', icon: '🥣', kind: 'plugin', core: true },
    { id: 'frLeft', unit: 'r11', no: '11-3', title: '飲料還剩多少', code: 'N-3-9、N-4-5、特生A-sP-4、2c-Ⅱ-1', icon: '🧋', kind: 'plugin' },
    { id: 'frClock', unit: 'r11', no: '11-4', title: '半小時和一刻鐘', code: 'N-5-16、Bc-Ⅱ-3', icon: '⏰', kind: 'plugin' },
    { id: 'frShop', unit: 'r11', no: '11-5', title: '買東西', code: 'N-5-5、特生3-sP-4、特生K-sP-5', icon: '🛒', kind: 'plugin' },
    { id: 'frDouble', unit: 'r11', no: '11-6', title: '食譜加倍或減半', code: 'N-4-5、N-5-5、特生A-sP-9、2c-Ⅲ-1', icon: '👩‍🍳', kind: 'plugin' },
    { id: 'frPour', unit: 'r11', no: '11-7', title: '分裝飲料', code: 'N-5-6、N-6-3、特生A-sP-9、2b-Ⅲ-1', icon: '🫗', kind: 'plugin' }
  ];
  const ids = from => LIST.filter(a => from.includes(a.unit)).map(a => a.id);
  const PATHS = {
    early: { title: '入門版（二、三年級：幾分之一、幾分之幾、同分母加減）', ids: ids(['r0', 'r1', 'r2', 'r3']) },
    g4: { title: '四年級版（複習看圖寫分數，再學假分數、帶分數、等值分數、數線）', ids: ['frRead', ...ids(['r4', 'r5', 'r6', 'r7'])] },
    g56: { title: '五六年級版（複習等值分數，再學通分、分數乘法、分數除法）', ids: ['frSplit', ...ids(['r8', 'r9', 'r10'])] },
    life: { title: '分數小幫手（生活應用，可當類化探測）', ids: ids(['r11']) },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組：入門 early、四年級 g4、五六年級 g56、分數小幫手 life，各 10 題。題組 JSON 寫 "package": "frac"、"variant"
  const PROBE_VARIANTS = {
    early: { unit: 2, read: 2, compare: 2, add: 2, sub: 2 },
    g4: { improper: 2, mixed: 2, times: 1, equiv: 2, line: 2, decimal: 1 },
    g56: { simplify: 2, unlike: 3, mult: 2, divide: 2, bigger: 1 },
    life: { share: 2, recipe: 2, left: 2, clock: 1, shop: 1, pour: 2 }
  };
  const pkg = { id: 'frac', title: '分數（二到六年級＋分數小幫手）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_VARIANTS.early, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

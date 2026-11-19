'use strict';
// 教材包：整數四則運算（第七個教材包，第 35 版）。格式和 content-frac.js 一樣。
// 依「整數四則運算教材包：課綱整理與單元大綱」（/mnt/project-files/integer/）與吳老師 2026-11-19 的決定：
// 一到五年級都做（單元 0～10），再加跨領域單元 11「算數小幫手」（生活應用，可當類化探測）。
// 核心步驟：1-4「看懂題目四步」、2-2「直式加減五步」、6-2「直式乘除五步」、8-1「應用題五步」、9-2「先算哪個四步」、11-1「生活決策五步」。單元 0 當先測。
// 課綱（已對照教育部數學領綱原文擷取檔）：N-1-2、N-1-3（n-I-2）；N-2-2（n-I-2）；N-2-3、R-2-4（n-I-3）；N-2-6、N-2-7、N-2-9（n-I-4）；N-2-8（n-I-5）；
// N-3-2、N-3-3（n-II-2）；N-3-4、N-3-5（n-II-3）；N-3-7、N-4-3（n-II-5）；N-4-2（n-II-2、n-II-3）；R-4-1（r-II-3）；R-4-2（r-II-4）；N-5-2（n-III-2）；R-5-1、R-5-2（r-III-1）。
// 課綱備註：一年級不做未知數題型；N-2-2 加法最多二次進位、減法限一次退位；R-2-4 只用加法驗算減法；N-2-7 不可要求死背九九；N-2-9 不列除式、不用「除」字；
// N-2-8、N-3-7 兩步驟不含併式；N-4-2 乘數與除數限三位、要教估商；R-4-1 併式限整數；R-4-2 不做 a－(b－c) 去括號；R-5-2 不做 a÷(b÷c) 去括號。
// 跨領域（108 年特殊需求領域課綱、107 年綜合活動領綱原文，Codex 2026-11-18 在分數包查證）：特生2-sP-5、特生3-sP-4、特生K-sP-5、特生E-sP-2、特生E-sA-3、特生A-sA-3；
// 綜合活動 2b-Ⅱ-1、Bb-Ⅱ-1、2c-Ⅱ-1、Bc-Ⅱ-3、2c-Ⅲ-1、Bc-Ⅲ-3。活動與代碼的對應是課程設計建議，整數運算本身仍連結數學 N、R 代碼。
(() => {
  const UNITS = [
    { id: 'i0', title: '準備好了嗎（先測）', icon: '🧭', code: 'N-1-1、N-2-1' },
    { id: 'i1', title: '加加減減是什麼（一年級）', icon: '🔵', code: 'N-1-2、N-1-3' },
    { id: 'i2', title: '加減直式（二、三年級）', icon: '🧱', code: 'N-2-2、N-3-2' },
    { id: 'i3', title: '加減應用題（二年級）', icon: '📝', code: 'N-2-3、R-2-4' },
    { id: 'i4', title: '乘法與九九（二年級）', icon: '✖️', code: 'N-2-6、N-2-7' },
    { id: 'i5', title: '分一分：分裝、平分與除法（二、三年級）', icon: '🍬', code: 'N-2-9、N-3-4' },
    { id: 'i6', title: '乘除一位數直式（三年級）', icon: '🧮', code: 'N-3-3、N-3-5' },
    { id: 'i7', title: '多位數乘除直式（四年級）', icon: '🏭', code: 'N-4-2' },
    { id: 'i8', title: '兩步驟應用題（二到四年級）', icon: '🪜', code: 'N-2-8、N-3-7、N-4-3' },
    { id: 'i9', title: '併式與四則混合計算（四年級）', icon: '🔢', code: 'R-4-1、R-4-2' },
    { id: 'i10', title: '三步驟、平均與分配律（五年級）', icon: '📊', code: 'N-5-2、R-5-1、R-5-2' },
    { id: 'i11', title: '算數小幫手（生活管理、綜合活動）', icon: '🛒', code: 'N-2-2、特生2-sP-5、2c-Ⅱ-1' }
  ];
  const LIST = [
    { id: 'inCount', unit: 'i0', no: '0-1', title: '數一數', code: 'N-1-1', icon: '🔢', kind: 'plugin', pretest: true },
    { id: 'inTens', unit: 'i0', no: '0-2', title: '幾個十幾個一', code: 'N-1-1、N-2-1', icon: '🧱', kind: 'plugin', pretest: true },
    { id: 'inJoin', unit: 'i1', no: '1-1', title: '多了、合起來', code: 'N-1-2、R-1-2', icon: '🐦', kind: 'plugin' },
    { id: 'inTake', unit: 'i1', no: '1-2', title: '拿走了', code: 'N-1-2', icon: '🍎', kind: 'plugin' },
    { id: 'inMoreLess', unit: 'i1', no: '1-3', title: '誰比較多', code: 'N-1-2', icon: '⚖️', kind: 'plugin' },
    { id: 'inWhich', unit: 'i1', no: '1-4', title: '加還是減', code: 'N-1-2、N-1-3、R-1-1、n-I-2', icon: '🔵', kind: 'plugin', core: true },
    { id: 'inAddCol', unit: 'i2', no: '2-1', title: '位值表格裡加', code: 'N-2-2', icon: '➕', kind: 'plugin' },
    { id: 'inSubCol', unit: 'i2', no: '2-2', title: '不夠減怎麼辦', code: 'N-2-2、R-2-4、n-I-2', icon: '🧱', kind: 'plugin', core: true },
    { id: 'inMulti', unit: 'i2', no: '2-3', title: '多次進退位', code: 'N-3-2、n-II-2', icon: '📚', kind: 'plugin' },
    { id: 'inCheck', unit: 'i2', no: '2-4', title: '算完檢查', code: 'R-2-4', icon: '✅', kind: 'plugin' },
    { id: 'inMissAdd', unit: 'i3', no: '3-1', title: '誰不見了', code: 'N-2-3、n-I-3', icon: '🃏', kind: 'plugin' },
    { id: 'inMissSub', unit: 'i3', no: '3-2', title: '原來有多少', code: 'N-2-3、R-2-4', icon: '👛', kind: 'plugin' },
    { id: 'inCompare', unit: 'i3', no: '3-3', title: '比一比', code: 'R-2-1、N-2-3', icon: '📏', kind: 'plugin' },
    { id: 'inGroups', unit: 'i4', no: '4-1', title: '幾個一數', code: 'N-2-6、n-I-4', icon: '🥚', kind: 'plugin' },
    { id: 'inTimes', unit: 'i4', no: '4-2', title: '幾倍', code: 'N-2-6', icon: '📗', kind: 'plugin' },
    { id: 'inTable', unit: 'i4', no: '4-3', title: '九九表找一找', code: 'N-2-7', icon: '📋', kind: 'plugin' },
    { id: 'inArray', unit: 'i4', no: '4-4', title: '排成一排排', code: 'R-2-3', icon: '🪑', kind: 'plugin' },
    { id: 'inPack', unit: 'i5', no: '5-1', title: '每袋裝幾個', code: 'N-2-9', icon: '🍬', kind: 'plugin' },
    { id: 'inShare', unit: 'i5', no: '5-2', title: '每人分幾個', code: 'N-2-9', icon: '🍪', kind: 'plugin' },
    { id: 'inDivR', unit: 'i5', no: '5-3', title: '除法算式和餘數', code: 'N-3-4、n-II-3', icon: '➗', kind: 'plugin' },
    { id: 'inMulOrDiv', unit: 'i5', no: '5-4', title: '乘還是除', code: 'N-3-6、R-3-1', icon: '🔁', kind: 'plugin' },
    { id: 'inMul1', unit: 'i6', no: '6-1', title: '乘以一位數', code: 'N-3-3、n-II-2', icon: '✖️', kind: 'plugin' },
    { id: 'inDivCol', unit: 'i6', no: '6-2', title: '除以一位數', code: 'N-3-5、n-II-3', icon: '🧮', kind: 'plugin', core: true },
    { id: 'inVerify', unit: 'i6', no: '6-3', title: '驗算', code: 'R-3-1', icon: '✅', kind: 'plugin' },
    { id: 'inMul2', unit: 'i7', no: '7-1', title: '乘以二位數', code: 'N-4-2', icon: '🥛', kind: 'plugin' },
    { id: 'inEstQ', unit: 'i7', no: '7-2', title: '估商', code: 'N-4-2', icon: '🚌', kind: 'plugin' },
    { id: 'inDiv2', unit: 'i7', no: '7-3', title: '除以二、三位數', code: 'N-4-2、n-II-3', icon: '🏭', kind: 'plugin' },
    { id: 'inTwoStep', unit: 'i8', no: '8-1', title: '加減與乘（二年級）', code: 'N-2-8、n-I-5', icon: '🪜', kind: 'plugin', core: true },
    { id: 'inTwoStep3', unit: 'i8', no: '8-2', title: '連乘、加減與除（三年級）', code: 'N-3-7、n-II-5', icon: '📦', kind: 'plugin' },
    { id: 'inTwoStep4', unit: 'i8', no: '8-3', title: '乘與除、連除（四年級）', code: 'N-4-3、n-II-5', icon: '🚚', kind: 'plugin' },
    { id: 'inMerge', unit: 'i9', no: '9-1', title: '兩步併成一式', code: 'R-4-1、r-II-3', icon: '🔗', kind: 'plugin' },
    { id: 'inOrder', unit: 'i9', no: '9-2', title: '先算哪一個', code: 'R-4-1、r-II-3', icon: '🔢', kind: 'plugin', core: true },
    { id: 'inSwap', unit: 'i9', no: '9-3', title: '換個順序更好算', code: 'R-4-2、r-II-4', icon: '🔀', kind: 'plugin' },
    { id: 'inThree', unit: 'i10', no: '10-1', title: '三步驟併式', code: 'N-5-2、R-5-1、n-III-2', icon: '🎪', kind: 'plugin' },
    { id: 'inAvg', unit: 'i10', no: '10-2', title: '平均', code: 'R-5-1、r-III-1', icon: '📊', kind: 'plugin' },
    { id: 'inDistrib', unit: 'i10', no: '10-3', title: '分配律簡算', code: 'R-5-2、r-III-1', icon: '👕', kind: 'plugin' },
    { id: 'inEnough', unit: 'i11', no: '11-1', title: '錢夠不夠', code: 'N-2-2、N-2-4、特生2-sP-5、特生K-sP-5', icon: '👛', kind: 'plugin', core: true },
    { id: 'inChange', unit: 'i11', no: '11-2', title: '要找多少錢', code: 'N-2-2、N-3-2、特生3-sP-4、特生E-sP-2', icon: '🪙', kind: 'plugin' },
    { id: 'inBuyMany', unit: 'i11', no: '11-3', title: '買好幾個一樣的', code: 'N-2-6、N-3-3、特生K-sP-5', icon: '🛍️', kind: 'plugin' },
    { id: 'inShareSnack', unit: 'i11', no: '11-4', title: '大家分一分', code: 'N-3-4、2b-Ⅱ-1、Bb-Ⅱ-1', icon: '🧁', kind: 'plugin' },
    { id: 'inHowMany', unit: 'i11', no: '11-5', title: '要幾台、要幾盒', code: 'N-3-4、N-4-3、2c-Ⅱ-1、Bc-Ⅱ-3', icon: '🚌', kind: 'plugin' },
    { id: 'inBetter', unit: 'i11', no: '11-6', title: '哪一個比較划算', code: 'N-4-3、R-4-1、特生A-sA-3、特生2-sP-5', icon: '🏷️', kind: 'plugin' },
    { id: 'inBudget', unit: 'i11', no: '11-7', title: '班級活動預算', code: 'N-5-2、R-5-2、2c-Ⅲ-1、Bc-Ⅲ-3、特生E-sA-3', icon: '🍱', kind: 'plugin' }
  ];
  const ids = from => LIST.filter(a => from.includes(a.unit)).map(a => a.id);
  const PATHS = {
    g1: { title: '一年級版（數一數、加加減減是什麼）', ids: ids(['i0', 'i1']) },
    addsub: { title: '加減版（加減的意義、直式、應用題）', ids: ids(['i1', 'i2', 'i3']) },
    muldiv: { title: '乘除版（乘法與九九、除法、乘除直式）', ids: ids(['i4', 'i5', 'i6', 'i7']) },
    word: { title: '應用題版（加減應用題、兩步驟、併式、三步驟）', ids: ids(['i3', 'i8', 'i9', 'i10']) },
    life: { title: '算數小幫手（生活應用，可當類化探測）', ids: ids(['i11']) },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組：加減 addsub、乘除 muldiv、應用題 word、算數小幫手 life，各 10 題。題組 JSON 寫 "package": "int"、"variant"
  const PROBE_VARIANTS = {
    addsub: { meaning: 2, addcol: 2, subcol: 3, missing: 2, compare: 1 },
    muldiv: { mult: 2, divide: 2, mulcol: 2, divcol: 3, estq: 1 },
    word: { two: 4, merge: 2, order: 2, avg: 1, distrib: 1 },
    life: { enough: 2, change: 2, buy: 1, share: 1, howmany: 2, better: 1, budget: 1 }
  };
  const pkg = { id: 'int', title: '整數四則運算（一到五年級＋算數小幫手）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_VARIANTS.addsub, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

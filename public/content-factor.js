'use strict';
// 教材包：因數與倍數（第四個教材包，第 31 版）。格式和 content-line.js 一樣。
// 依「因數倍數教材包：課綱與單元大綱」（docs/factor/）與吳老師 2026-11-17 的決定：
// 五、六年級都做；8 個單元（0～7）、20 個活動；「找因數」「找公因數公倍數」兩套七步驟（1-3、3-2 是核心），六年級另有短除。
// 入門 24 以內、一般 50 以內、挑戰 100 以內；入門和一般可以開九九乘法表；單元 5「分清楚」獨立；單元 0 當先測。
// 課綱（已對照教育部數學領綱原文）：N-5-3（五年級只學意義，不用短除法）、N-6-1、N-6-2；學習表現 n-III-3；先備 N-2-7、N-3-4；後續 N-5-4。
(() => {
  const UNITS = [
    { id: 'f0', title: '準備好了嗎（先測）', icon: '🧭', code: 'N-2-7、N-3-4' },
    { id: 'f1', title: '因數', icon: '🧱', code: 'N-5-3' },
    { id: 'f2', title: '倍數', icon: '🔢', code: 'N-5-3' },
    { id: 'f3', title: '公因數', icon: '🎁', code: 'N-5-3' },
    { id: 'f4', title: '公倍數', icon: '🚌', code: 'N-5-3' },
    { id: 'f5', title: '分清楚：公因數還是公倍數', icon: '🤔', code: 'N-5-3、n-III-3' },
    { id: 'f6', title: '質數與質因數分解（六年級）', icon: '💎', code: 'N-6-1' },
    { id: 'f7', title: '短除法與約分通分（六年級）', icon: '🪜', code: 'N-6-2、N-5-4' }
  ];
  const LIST = [
    { id: 'fmTimes', unit: 'f0', no: '0-1', title: '乘法表找一找', code: 'N-2-7', icon: '✖️', kind: 'plugin', pretest: true },
    { id: 'fmShare', unit: 'f0', no: '0-2', title: '平分有沒有剩', code: 'N-3-4', icon: '🍬', kind: 'plugin', pretest: true },
    { id: 'fmArray', unit: 'f1', no: '1-1', title: '排排看', code: 'N-5-3', icon: '🧱', kind: 'plugin' },
    { id: 'fmIsFactor', unit: 'f1', no: '1-2', title: '剛好分完嗎', code: 'N-5-3', icon: '➗', kind: 'plugin' },
    { id: 'fmFactors', unit: 'f1', no: '1-3', title: '找出全部的因數', code: 'N-5-3、n-III-3', icon: '🔍', kind: 'plugin', core: true },
    { id: 'fmSkip', unit: 'f2', no: '2-1', title: '一直加上去', code: 'N-5-3', icon: '🐸', kind: 'plugin' },
    { id: 'fmIsMult', unit: 'f2', no: '2-2', title: '是不是倍數', code: 'N-5-3', icon: '✅', kind: 'plugin' },
    { id: 'fmPair', unit: 'f2', no: '2-3', title: '因數和倍數是一對', code: 'N-5-3', icon: '🤝', kind: 'plugin' },
    { id: 'fmShareTwo', unit: 'f3', no: '3-1', title: '兩種東西一起分', code: 'N-5-3', icon: '🎁', kind: 'plugin' },
    { id: 'fmGcd', unit: 'f3', no: '3-2', title: '最多可以分幾份', code: 'N-5-3、n-III-3', icon: '🏆', kind: 'plugin', core: true },
    { id: 'fmMeet', unit: 'f4', no: '4-1', title: '什麼時候再一起', code: 'N-5-3', icon: '🚌', kind: 'plugin' },
    { id: 'fmLcm', unit: 'f4', no: '4-2', title: '最少要等多久', code: 'N-5-3、n-III-3', icon: '⏰', kind: 'plugin' },
    { id: 'fmWhich', unit: 'f5', no: '5-1', title: '這題用哪一個', code: 'N-5-3、n-III-3', icon: '🤔', kind: 'plugin' },
    { id: 'fmMixed', unit: 'f5', no: '5-2', title: '混合應用', code: 'N-5-3、n-III-3', icon: '🧩', kind: 'plugin' },
    { id: 'fmPrime', unit: 'f6', no: '6-1', title: '只能排一排', code: 'N-6-1', icon: '💎', kind: 'plugin' },
    { id: 'fmTest235', unit: 'f6', no: '6-2', title: '2、3、5 的倍數判別', code: 'N-6-1', icon: '🔎', kind: 'plugin' },
    { id: 'fmPrimeDiv', unit: 'f6', no: '6-3', title: '短除分解', code: 'N-6-1', icon: '🪜', kind: 'plugin' },
    { id: 'fmShortDiv', unit: 'f7', no: '7-1', title: '短除找最大公因數和最小公倍數', code: 'N-6-2', icon: '🪜', kind: 'plugin' },
    { id: 'fmCoprime', unit: 'f7', no: '7-2', title: '互質', code: 'N-6-2', icon: '🙌', kind: 'plugin' },
    { id: 'fmSimplify', unit: 'f7', no: '7-3', title: '約分與通分', code: 'N-6-2、N-5-4', icon: '🍰', kind: 'plugin' }
  ];
  const g5 = ['fmTimes', 'fmShare', 'fmArray', 'fmIsFactor', 'fmFactors', 'fmSkip', 'fmIsMult', 'fmPair', 'fmShareTwo', 'fmGcd', 'fmMeet', 'fmLcm', 'fmWhich', 'fmMixed'];
  const PATHS = {
    grade5: { title: '五年級版（因數、倍數、公因數、公倍數）', ids: g5 },
    grade6: { title: '六年級版（複習，再學質數和短除）', ids: ['fmFactors', 'fmGcd', 'fmLcm', 'fmWhich', 'fmPrime', 'fmTest235', 'fmPrimeDiv', 'fmShortDiv', 'fmCoprime', 'fmSimplify'] },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組：五年級、六年級各一份，各 10 題。題組 JSON 寫 "package": "factor"、"variant": "g5" 或 "g6"
  const PROBE_VARIANTS = {
    g5: { isFactor: 1, factors: 2, isMult: 1, pairWord: 1, gcd: 1, lcm: 1, which: 2, apply: 1 },
    g6: { prime: 2, test235: 1, primeDiv: 2, gcd: 2, lcm: 2, simplify: 1 }
  };
  const pkg = { id: 'factor', title: '因數與倍數（五、六年級）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_VARIANTS.g5, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

'use strict';
// 教材包：錢幣與購物（第八個教材包，第 36 版）。格式和 content-int.js 一樣。
// 依「錢幣與購物教材包：課綱整理與單元大綱」（/mnt/project-files/money/）與吳老師 2026-11-19 的決定：單元 0～9 全部做。
// 核心在一、二年級（N-1-4、N-2-5、N-2-4）；吳老師特別要求的跨領域：錢幣的由來（單元 2）、想要與需要（單元 7）、存提款（單元 8）、理財觀念（單元 9 錢錢小管家，生活應用）。
// 核心步驟：1-3「數錢四步」、4-1「付錢四步」、5-1「找錢四步」、6-3「購物流程」、7-1「想要需要三問」、8-2「存提款四步」、9-1「生活決策五步」。單元 0 當先測。
// 數學課綱（教育部數學領綱原文擷取檔）：N-1-4（n-I-3）、N-2-5（n-I-3）、N-2-4（n-I-3）；算找錢、存摺時用到 N-2-2、N-3-2（n-I-2、n-II-2）與 N-2-6（n-I-4）。
// 跨領域（2026-11-19 讀國家教育研究院官方領綱 PDF）：社會 Ad-Ⅱ-1（錢幣的由來，間接對應）、Ad-Ⅱ-2、Da-Ⅱ-1、Db-Ⅱ-1、Db-Ⅲ-1、1c-Ⅱ-1、3d-Ⅱ-2；
// 生活課程 2-I-2、2-I-4、A-I-2、F-I-2、6-I-5、E-I-1；綜合活動 2c-Ⅱ-1、2c-Ⅲ-1、Bc-Ⅲ-3。
// 特殊需求領域生活管理（Codex 已查證原文）：特生E-sP-2、E-sP-3、E-sP-4、E-sP-5、E-sP-6、E-sA-2、E-sA-3、2-sP-1、2-sP-2、2-sP-5、2-sA-1、2-sA-2、3-sP-4、K-sP-5。
// 國小社會的學習內容沒有「貨幣、以物易物、銀行」的條目，所以單元 2 只標間接對應；活動與代碼的對應是課程設計建議。
(() => {
  const UNITS = [
    { id: 'm0', title: '準備好了嗎（先測）', icon: '🧭', code: '先備' },
    { id: 'm1', title: '認識錢幣（一年級）', icon: '🪙', code: 'N-1-4、特生E-sP-2' },
    { id: 'm2', title: '錢從哪裡來（社會、生活）', icon: '🐚', code: '社會 Ad-Ⅱ-1（間接）、生活 2-I-2' },
    { id: 'm3', title: '大錢與估算（二年級）', icon: '💵', code: 'N-2-5、N-2-4' },
    { id: 'm4', title: '付錢', icon: '👛', code: 'N-1-4、N-2-5、特生K-sP-5' },
    { id: 'm5', title: '找錢', icon: '🔼', code: 'N-1-4、N-2-5' },
    { id: 'm6', title: '去買東西', icon: '🛒', code: 'N-2-4、特生3-sP-4、特生K-sP-5' },
    { id: 'm7', title: '想要與需要（社會）', icon: '🤔', code: '社會 Db-Ⅱ-1、Da-Ⅱ-1、特生2-sP-5' },
    { id: 'm8', title: '存錢與存提款（社會、生活管理）', icon: '🏦', code: '特生E-sP-6、特生2-sP-2、社會 Ad-Ⅱ-2' },
    { id: 'm9', title: '錢錢小管家（生活應用）', icon: '📒', code: '社會 Db-Ⅲ-1、特生E-sP-5、特生E-sA-3' }
  ];
  const LIST = [
    { id: 'moCount', unit: 'm0', no: '0-1', title: '一個一個數', code: '先備', icon: '🔢', kind: 'plugin', pretest: true },
    { id: 'moSkip', unit: 'm0', no: '0-2', title: '五個五個、十個十個數', code: '先備', icon: '🧺', kind: 'plugin', pretest: true },
    { id: 'moKnow', unit: 'm1', no: '1-1', title: '認一認', code: 'N-1-4、特生E-sP-2', icon: '🪙', kind: 'plugin' },
    { id: 'moSame', unit: 'm1', no: '1-2', title: '同一種數一數', code: 'N-1-4', icon: '🐷', kind: 'plugin' },
    { id: 'moMixed', unit: 'm1', no: '1-3', title: '混在一起數', code: 'N-1-4、n-I-3', icon: '👛', kind: 'plugin', core: true },
    { id: 'moTrade', unit: 'm1', no: '1-4', title: '換一換', code: 'N-1-4', icon: '🔁', kind: 'plugin' },
    { id: 'moBarter', unit: 'm2', no: '2-1', title: '換換看好麻煩', code: '生活 2-I-4、F-I-2；社會 Ad-Ⅱ-1（間接）', icon: '🐟', kind: 'plugin' },
    { id: 'moHistory', unit: 'm2', no: '2-2', title: '從貝殼到紙鈔', code: '生活 2-I-2、A-I-2', icon: '🐚', kind: 'plugin' },
    { id: 'moWork', unit: 'm2', no: '2-3', title: '錢是工作換來的', code: '社會 Ad-Ⅱ-1', icon: '👩‍🍳', kind: 'plugin' },
    { id: 'moCard', unit: 'm2', no: '2-4', title: '不用現金也能付', code: '特生E-sP-3、特生2-sA-1', icon: '💳', kind: 'plugin' },
    { id: 'moBig', unit: 'm3', no: '3-1', title: '認識 500、1000 元', code: 'N-2-5', icon: '💵', kind: 'plugin' },
    { id: 'moCountBig', unit: 'm3', no: '3-2', title: '數大錢', code: 'N-2-5、n-I-3', icon: '🧧', kind: 'plugin' },
    { id: 'moEstimate', unit: 'm3', no: '3-3', title: '大約多少錢', code: 'N-2-4', icon: '🔍', kind: 'plugin' },
    { id: 'moExact', unit: 'm4', no: '4-1', title: '拿出剛好的錢', code: 'N-1-4、N-2-5、特生K-sP-5', icon: '👛', kind: 'plugin', core: true },
    { id: 'moNextUp', unit: 'm4', no: '4-2', title: '多付一點', code: 'N-1-4、N-2-5', icon: '➕', kind: 'plugin' },
    { id: 'moFewest', unit: 'm4', no: '4-3', title: '錢幣用最少', code: 'N-2-5', icon: '🥤', kind: 'plugin' },
    { id: 'moCountUp', unit: 'm5', no: '5-1', title: '往上數找錢', code: 'N-1-4、n-I-3', icon: '🔼', kind: 'plugin', core: true },
    { id: 'moChangeSub', unit: 'm5', no: '5-2', title: '算一算要找多少', code: 'N-2-5、N-2-2', icon: '🧮', kind: 'plugin' },
    { id: 'moCheckChange', unit: 'm5', no: '5-3', title: '找的錢對不對', code: 'N-1-4、特生2-sP-1', icon: '✅', kind: 'plugin' },
    { id: 'moEnough', unit: 'm6', no: '6-1', title: '錢夠不夠', code: 'N-2-5、特生2-sP-5', icon: '⚖️', kind: 'plugin' },
    { id: 'moTwo', unit: 'm6', no: '6-2', title: '買兩樣', code: 'N-2-5、N-2-2', icon: '🛍️', kind: 'plugin' },
    { id: 'moShopFlow', unit: 'm6', no: '6-3', title: '購物五步驟', code: '特生K-sP-5、特生3-sP-4、2c-Ⅱ-1', icon: '🧺', kind: 'plugin', core: true },
    { id: 'moNeedWant', unit: 'm7', no: '7-1', title: '需要還是想要', code: '社會 Db-Ⅱ-1；生活 6-I-5', icon: '🤔', kind: 'plugin', core: true },
    { id: 'moBudgetChoice', unit: 'm7', no: '7-2', title: '錢只有這些', code: '社會 Da-Ⅱ-1、Db-Ⅱ-1、3d-Ⅱ-2；特生2-sP-5', icon: '💰', kind: 'plugin' },
    { id: 'moWait', unit: 'm7', no: '7-3', title: '等一等再買', code: '社會 1c-Ⅱ-1；特生E-sP-4', icon: '⏳', kind: 'plugin' },
    { id: 'moPiggy', unit: 'm8', no: '8-1', title: '存錢筒', code: '特生2-sP-2；生活 E-I-1', icon: '🐷', kind: 'plugin' },
    { id: 'moBank', unit: 'm8', no: '8-2', title: '到郵局、銀行', code: '特生E-sP-6、特生E-sA-2；社會 Ad-Ⅱ-2', icon: '🏦', kind: 'plugin', core: true },
    { id: 'moPassbook', unit: 'm8', no: '8-3', title: '看懂存摺', code: '特生E-sA-2；N-3-2', icon: '📘', kind: 'plugin' },
    { id: 'moLedger', unit: 'm9', no: '9-1', title: '我的記帳本', code: '特生E-sP-5、特生2-sP-5；綜合 2c-Ⅱ-1', icon: '📒', kind: 'plugin', core: true },
    { id: 'moSavePlan', unit: 'm9', no: '9-2', title: '存錢計畫', code: '特生E-sA-3、特生2-sP-2；社會 Db-Ⅲ-1', icon: '🎯', kind: 'plugin' },
    { id: 'moSpendSave', unit: 'm9', no: '9-3', title: '花、存、分享', code: '社會 Db-Ⅱ-1；特生E-sP-4', icon: '🫙', kind: 'plugin' },
    { id: 'moPlanner', unit: 'm9', no: '9-4', title: '小小預算家', code: '社會 Db-Ⅲ-1；特生E-sA-3、2-sA-2；綜合 2c-Ⅲ-1、Bc-Ⅲ-3', icon: '🎈', kind: 'plugin' }
  ];
  const ids = from => LIST.filter(a => from.includes(a.unit)).map(a => a.id);
  const PATHS = {
    g1: { title: '一年級版（認識錢幣、錢從哪裡來、付錢、找錢，100 元內）', ids: ids(['m0', 'm1', 'm2', 'm4', 'm5']) },
    g2: { title: '二年級版（大錢與估算、付錢、找錢、去買東西）', ids: ids(['m3', 'm4', 'm5', 'm6']) },
    shop: { title: '購物版（付錢、找錢、去買東西）', ids: ids(['m4', 'm5', 'm6']) },
    money: { title: '理財版（想要與需要、存提款、錢錢小管家）', ids: ids(['m7', 'm8', 'm9']) },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組：數錢付錢 pay、找錢購物 shop、理財 finance，各 10 題。題組 JSON 寫 "package": "money"、"variant"
  const PROBE_VARIANTS = {
    pay: { count: 3, trade: 1, countbig: 2, estimate: 1, exact: 2, fewest: 1 },
    shop: { countup: 3, change: 2, check: 1, enough: 2, two: 2 },
    finance: { needwant: 2, budget: 2, wait: 1, piggy: 1, passbook: 2, ledger: 1, plan: 1 }
  };
  const pkg = { id: 'money', title: '錢幣與購物（一、二年級＋理財跨領域）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_VARIANTS.pay, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

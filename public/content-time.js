'use strict';
// 教材包：時間概念（第五個教材包，第 32 版）。格式和 content-factor.js 一樣。
// 依「時間概念教材包：課綱與單元大綱」（docs/time/）與吳老師 2026-11-17 的決定：
// 一到四年級（單元 0～8）＋跨領域單元 9「時間小管家」（特殊需求領域生活管理、社會領域）；五年級時間乘除（N-5-16）不做。
// 三套核心步驟：3-2「看鐘六步」、8-1「算時間七步」、9-2「時間決策五步」。單元 0 當先測。
// 課綱（已對照教育部數學領綱原文）：N-1-6、N-2-13、N-2-14（n-I-9）；N-3-17、N-4-13（n-II-10）。
// 跨領域（108 年特殊需求領域課綱原文，Codex 查證）：特生1-sP-26、特生H-sA-1、特生4-sA-1、特生4-sP-4、特生L-sP-3、特生L-sP-4、特生J-sP-3、特生3-sP-4、特生K-sP-5；
// 社會領域：Da-Ⅱ-1、3d-Ⅱ-2。
(() => {
  const UNITS = [
    { id: 't0', title: '準備好了嗎（先測）', icon: '🧭', code: 'N-1-1、N-2-6' },
    { id: 't1', title: '一天的時間', icon: '🌞', code: 'N-1-6' },
    { id: 't2', title: '看鐘：整點和半點', icon: '🕐', code: 'N-1-6' },
    { id: 't3', title: '看鐘：幾時幾分', icon: '🕒', code: 'N-2-13' },
    { id: 't4', title: '看日曆', icon: '📅', code: 'N-2-14' },
    { id: 't5', title: '時間單位和換算', icon: '⏱️', code: 'N-3-17' },
    { id: 't6', title: '幾點和多久', icon: '⏳', code: 'N-3-17' },
    { id: 't7', title: '24 時制', icon: '📟', code: 'N-4-13' },
    { id: 't8', title: '算經過時間：跨時、跨午、跨日', icon: '🧮', code: 'N-4-13' },
    { id: 't9', title: '時間小管家（生活管理、社會）', icon: '🚌', code: 'N-4-13、特生4-sA-1、特生J-sP-3' }
  ];
  const LIST = [
    { id: 'tmCount5', unit: 't0', no: '0-1', title: '五個一數', code: 'N-2-6', icon: '🖐️', kind: 'plugin', pretest: true },
    { id: 'tmTo60', unit: 't0', no: '0-2', title: '數到 60', code: 'N-1-1', icon: '🔢', kind: 'plugin', pretest: true },
    { id: 'tmPeriod', unit: 't1', no: '1-1', title: '上午、中午、下午、晚上', code: 'N-1-6', icon: '🌞', kind: 'plugin' },
    { id: 'tmDay', unit: 't1', no: '1-2', title: '昨天、今天、明天', code: 'N-1-6', icon: '📆', kind: 'plugin' },
    { id: 'tmHour', unit: 't2', no: '2-1', title: '整點', code: 'N-1-6', icon: '🕐', kind: 'plugin' },
    { id: 'tmHalf', unit: 't2', no: '2-2', title: '半點', code: 'N-1-6', icon: '🕜', kind: 'plugin' },
    { id: 'tmRead5', unit: 't3', no: '3-1', title: '五分五分讀', code: 'N-2-13', icon: '🕒', kind: 'plugin' },
    { id: 'tmRead1', unit: 't3', no: '3-2', title: '看鐘六步：一分一分讀', code: 'N-2-13、n-I-9', icon: '🕰️', kind: 'plugin', core: true },
    { id: 'tmHours', unit: 't3', no: '3-3', title: '經過幾小時', code: 'N-2-13', icon: '⏩', kind: 'plugin' },
    { id: 'tmCal', unit: 't4', no: '4-1', title: '幾月幾日星期幾', code: 'N-2-14', icon: '📅', kind: 'plugin' },
    { id: 'tmCalUnits', unit: 't4', no: '4-2', title: '年、月、星期、日', code: 'N-2-14', icon: '🗓️', kind: 'plugin' },
    { id: 'tmDays', unit: 't4', no: '4-3', title: '簡單算天數', code: 'N-2-14', icon: '🏖️', kind: 'plugin' },
    { id: 'tmSense', unit: 't5', no: '5-1', title: '秒、分、時有多長', code: 'N-3-17', icon: '⏱️', kind: 'plugin' },
    { id: 'tmHM', unit: 't5', no: '5-2', title: '時和分', code: 'N-3-17', icon: '🔁', kind: 'plugin' },
    { id: 'tmDS', unit: 't5', no: '5-3', title: '日和時、分和秒', code: 'N-3-17', icon: '🌙', kind: 'plugin' },
    { id: 'tmPointDur', unit: 't6', no: '6-1', title: '時刻還是時間量', code: 'N-3-17', icon: '🤔', kind: 'plugin' },
    { id: 'tmSameUnit', unit: 't6', no: '6-2', title: '同單位加減', code: 'N-3-17', icon: '➕', kind: 'plugin' },
    { id: 'tmHMAdd', unit: 't6', no: '6-3', title: '時分加減（不進退位）', code: 'N-3-17、n-II-10', icon: '🧾', kind: 'plugin' },
    { id: 'tmDigital', unit: 't7', no: '7-1', title: '電子鐘和指針鐘', code: 'N-4-13', icon: '📟', kind: 'plugin' },
    { id: 'tm24', unit: 't7', no: '7-2', title: '12 時制和 24 時制', code: 'N-4-13', icon: '🔄', kind: 'plugin' },
    { id: 'tmCross', unit: 't8', no: '8-1', title: '算時間七步：跨時', code: 'N-4-13、n-II-10', icon: '🧮', kind: 'plugin', core: true },
    { id: 'tmNoon', unit: 't8', no: '8-2', title: '跨午', code: 'N-4-13', icon: '🌤️', kind: 'plugin' },
    { id: 'tmMidnight', unit: 't8', no: '8-3', title: '跨日', code: 'N-4-13', icon: '🌙', kind: 'plugin' },
    { id: 'tmFind', unit: 't8', no: '8-4', title: '求開始或結束的時刻', code: 'N-4-13', icon: '🎯', kind: 'plugin' },
    { id: 'tmEstimate', unit: 't9', no: '9-1', title: '估一估，再計時', code: '特生L-sP-4、特生4-sP-5', icon: '⏲️', kind: 'plugin' },
    { id: 'tmInTime', unit: 't9', no: '9-2', title: '時間決策五步：來得及嗎', code: 'N-4-13、特生4-sP-4、Da-Ⅱ-1', icon: '🏃', kind: 'plugin', core: true },
    { id: 'tmLeave', unit: 't9', no: '9-3', title: '最晚幾點出門', code: '特生4-sA-1、特生L-sA-2', icon: '🚪', kind: 'plugin' },
    { id: 'tmBus', unit: 't9', no: '9-4', title: '查公車時刻表', code: '特生J-sP-3、3d-Ⅱ-2', icon: '🚌', kind: 'plugin' },
    { id: 'tmPlan', unit: 't9', no: '9-5', title: '放學後的行程', code: '特生1-sP-26、特生H-sA-1', icon: '📝', kind: 'plugin' },
    { id: 'tmShop', unit: 't9', no: '9-6', title: '店還開著嗎', code: '特生3-sP-4、特生K-sP-5、特生3-sA-4', icon: '🏪', kind: 'plugin' }
  ];
  const ids = from => LIST.filter(a => from.includes(a.unit)).map(a => a.id);
  const PATHS = {
    clock: { title: '報時版（一、二年級：看鐘、看日曆）', ids: ids(['t0', 't1', 't2', 't3', 't4']) },
    elapsed: { title: '經過時間版（三、四年級：換算、24 時制、經過時間、時間小管家）', ids: ['tmRead5', 'tmRead1', ...ids(['t5', 't6', 't7', 't8', 't9'])] },
    life: { title: '時間小管家（生活應用，可當類化探測）', ids: ids(['t9']) },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組：報時 clock、經過時間 elapsed、時間小管家 life，各 10 題。題組 JSON 寫 "package": "time"、"variant"
  const PROBE_VARIANTS = {
    clock: { hour: 1, half: 1, read5: 2, read1: 2, hours: 1, calDay: 1, monthDays: 1, period: 1 },
    elapsed: { hm: 2, pointDur: 1, to24: 2, cross: 2, noon: 1, midnight: 1, findEnd: 1 },
    life: { inTime: 2, leave: 2, bus: 3, plan: 1, shop: 2 }
  };
  const pkg = { id: 'time', title: '時間概念（一到四年級＋時間小管家）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_VARIANTS.clock, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

'use strict';
// 教材包：折線圖（第三個教材包，第 28 版）。格式和 content-area.js、content-surface.js 一樣。
// 依「折線圖教材包單元大綱」（docs/linegraph/）與吳老師 2026-11-14 的決定：
// 四、五年級都做；7 個單元（0～6）、18 個活動；讀圖、畫圖兩套七步驟（2-1、5-1 是核心）；
// 兩條線與波浪線：四年級「讀」（挑戰級），五年級「畫」；單元 0 當先測，全對就可以往下。
// 課綱（已對照教育部數學領綱原文）：D-4-1、D-5-1；學習表現 d-II-1、d-III-1；先備 D-3-1、N-3-11。
(() => {
  const UNITS = [
    { id: 'l0', title: '準備好了嗎（先測）', icon: '🧭', code: 'D-3-1、N-3-11' },
    { id: 'l1', title: '認識折線圖', icon: '📈', code: 'D-4-1' },
    { id: 'l2', title: '讀出數值', icon: '🔎', code: 'D-4-1、d-II-1' },
    { id: 'l3', title: '看出變化', icon: '↗️', code: 'd-II-1、d-III-1' },
    { id: 'l4', title: '選對圖', icon: '🧩', code: 'D-4-1、D-5-1、D-6-1' },
    { id: 'l5', title: '畫折線圖（五年級）', icon: '✏️', code: 'D-5-1、d-III-1' },
    { id: 'l6', title: '小小調查員（五年級）', icon: '🕵️', code: 'D-5-1、d-III-1' }
  ];
  const LIST = [
    { id: 'lnTable', unit: 'l0', no: '0-1', title: '表格找資料', code: 'D-3-1', icon: '📋', kind: 'plugin', pretest: true },
    { id: 'lnScale', unit: 'l0', no: '0-2', title: '一格是多少', code: 'N-3-11', icon: '📏', kind: 'plugin', pretest: true },
    { id: 'lnParts', unit: 'l1', no: '1-1', title: '折線圖的零件', code: 'D-4-1', icon: '🧷', kind: 'plugin' },
    { id: 'lnMatch', unit: 'l1', no: '1-2', title: '表格和圖配一配', code: 'D-4-1', icon: '🔗', kind: 'plugin' },
    { id: 'lnRead', unit: 'l2', no: '2-1', title: '找時間，讀數值', code: 'D-4-1、d-II-1', icon: '🔎', kind: 'plugin', core: true },
    { id: 'lnFind', unit: 'l2', no: '2-2', title: '反過來找：是哪一天', code: 'D-4-1', icon: '🔁', kind: 'plugin' },
    { id: 'lnBetween', unit: 'l2', no: '2-3', title: '點不在格線上', code: 'D-4-1', icon: '🎯', kind: 'plugin' },
    { id: 'lnTrend', unit: 'l3', no: '3-1', title: '變多、變少、一樣', code: 'd-II-1', icon: '↗️', kind: 'plugin' },
    { id: 'lnMost', unit: 'l3', no: '3-2', title: '哪一段變最多', code: 'd-II-1', icon: '⛰️', kind: 'plugin' },
    { id: 'lnTwo', unit: 'l3', no: '3-3', title: '兩條線比一比', code: 'd-II-1、d-III-1', icon: '🆚', kind: 'plugin' },
    { id: 'lnChoose', unit: 'l4', no: '4-1', title: '長條圖還是折線圖', code: 'D-4-1、D-5-1', icon: '🤔', kind: 'plugin' },
    { id: 'lnThree', unit: 'l4', no: '4-2', title: '三種圖選一種', code: 'D-5-1、D-6-1', icon: '🥧', kind: 'plugin' },
    { id: 'lnDraw', unit: 'l5', no: '5-1', title: '照表格畫折線圖', code: 'D-5-1、d-III-1', icon: '✏️', kind: 'plugin', core: true },
    { id: 'lnSetScale', unit: 'l5', no: '5-2', title: '自己定刻度', code: 'D-5-1', icon: '📐', kind: 'plugin' },
    { id: 'lnBreak', unit: 'l5', no: '5-3', title: '波浪線省略', code: 'D-5-1', icon: '〰️', kind: 'plugin' },
    { id: 'lnDrawTwo', unit: 'l5', no: '5-4', title: '兩條線一起畫', code: 'D-5-1、d-III-1', icon: '🌱', kind: 'plugin' },
    { id: 'lnRecord', unit: 'l6', no: '6-1', title: '記錄一週', code: 'D-5-1', icon: '🗓️', kind: 'plugin' },
    { id: 'lnTell', unit: 'l6', no: '6-2', title: '用圖說話', code: 'd-III-1', icon: '💬', kind: 'plugin' }
  ];
  const PATHS = {
    grade4: { title: '四年級版（讀圖）', ids: ['lnTable', 'lnScale', 'lnParts', 'lnMatch', 'lnRead', 'lnFind', 'lnBetween', 'lnTrend', 'lnMost', 'lnTwo', 'lnChoose'] },
    grade5: { title: '五年級版（複習讀圖，再畫圖）', ids: ['lnRead', 'lnFind', 'lnBetween', 'lnTrend', 'lnMost', 'lnTwo', 'lnChoose', 'lnThree', 'lnDraw', 'lnSetScale', 'lnBreak', 'lnDrawTwo', 'lnRecord', 'lnTell'] },
    all: { title: '全部', ids: LIST.map(a => a.id) }
  };
  // 探試題組：讀圖、畫圖分成兩份，各 10 題（吳老師 2026-11-14 決定）。題組 JSON 寫 "package": "line"、"variant": "read" 或 "draw"
  const PROBE_VARIANTS = {
    read: { read: 4, findTime: 1, change: 2, twoLine: 1, breakRead: 1, chooseChart: 1 },
    draw: { plot: 4, scale: 2, twoLineDraw: 1, breakDraw: 1, chooseChart: 1, explain: 1 }
  };
  const pkg = { id: 'line', title: '折線圖（四、五年級）', units: UNITS, activities: LIST, paths: PATHS, probeTypes: PROBE_VARIANTS.read, probeVariants: PROBE_VARIANTS };
  window.lessonPackages = window.lessonPackages || {};
  window.lessonPackages[pkg.id] = pkg;
  if (!window.lessonPackage) window.lessonPackage = pkg;
})();

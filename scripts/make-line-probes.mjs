// 第 28 版：折線圖的兩份探試題組（讀圖 read、畫圖 draw），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-line-probes.mjs → scenarios/line-read-probe.json、scenarios/line-draw-probe.json
// 題型比例依 public/content-line.js 的 PROBE_VARIANTS；數字用固定種子產生，重新執行結果一樣。
import fs from 'node:fs';
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const WEEK = ['一', '二', '三', '四', '五'], MON = ['1月', '2月', '3月', '4月', '5月', '6月'];
const CTX = [
  { t: '每天喝水的杯數', xs: WEEK, full: x => '星期' + x, xName: '星期', y: '杯數（杯）', unit: '杯', step: 1, lo: 1, hi: 9 },
  { t: '每天跳繩的次數', xs: WEEK, full: x => '星期' + x, xName: '星期', y: '次數（下）', unit: '下', step: 10, lo: 10, hi: 80 },
  { t: '每月借書的本數', xs: MON.slice(0, 5), full: x => x, xName: '月份', y: '本數（本）', unit: '本', step: 5, lo: 5, hi: 45 },
  { t: '每月存的錢', xs: MON.slice(0, 5), full: x => x, xName: '月份', y: '金額（元）', unit: '元', step: 10, lo: 20, hi: 90 },
  { t: '豆芽每天的高度', xs: ['1', '2', '3', '4', '5'], full: x => `第${x}天`, xName: '第幾天', y: '高度（公分）', unit: '公分', step: 2, lo: 2, hi: 18 }
];
const UNITS = ['杯', '下', '本', '元', '公分', '度'];
const unitOpts = u => [u, ...UNITS.filter(x => x !== u).slice(0, 2)];
function data(rand, c, n = 5) {
  for (;;) { const v = Array.from({ length: n }, () => c.step * (Math.ceil(c.lo / c.step) + Math.floor(rand() * (Math.floor(c.hi / c.step) - Math.ceil(c.lo / c.step) + 1))));
    const m = Math.max(...v); if (v.filter(x => x === m).length === 1 && v.every((x, i) => !i || x !== v[i - 1])) return v; }
}
const chart = (c, series, o = {}) => { const hi = Math.max(...series.flatMap(s => s.v.filter(x => x !== null)), c.step * 4), every = o.every ?? (c.step === 1 ? 1 : 2), min = o.min ?? 0;
  const rows = Math.max(every * 2, Math.ceil((hi - min) / (c.step * every)) * every); return { chart: { title: c.t, xs: c.xs, xName: c.xName, yName: c.y, series, min, step: c.step, rows, every, brk: !!o.brk } }; };
const CAT = ['全班最喜歡的水果', '各班的人數', '全班最喜歡的運動'], ORD = ['一週每天的最高氣溫', '小狗每個月的體重', '每天睡覺的時數'], PART = ['零用錢花在哪裡各占多少', '全班喜歡的顏色各占幾分之幾', '一天的時間怎麼分配'];

function readForm(id, rand) {
  const items = [];
  // 讀數值 4 題：兩題一格是 1，兩題一格不是 1
  [0, 0, 1, 2].forEach((k, j) => { const c = k === 0 ? CTX[0] : CTX[k === 1 ? 1 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 2)], v = data(rand, c), i = 1 + Math.floor(rand() * 4);
    items.push({ id: `${id}0${j + 1}`, type: 'read', prompt: `看圖。${c.full(c.xs[i])}是多少${c.unit}？`, figure: chart(c, [{ name: c.t.slice(0, 10), v }]),
      steps: [{ key: 'scale', label: '縱軸一格是多少', role: 'measure', input: 'number', answer: c.step }, { key: 'cells', label: '點比 0 高幾格', role: 'measure', input: 'number', answer: v[i] / c.step },
        { key: 'val', label: `${c.full(c.xs[i])}是多少`, role: 'answer', input: 'number', answer: v[i] }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: unitOpts(c.unit), answer: c.unit }] }); });
  // 給數值找時間 1 題
  { const c = CTX[2 + Math.floor(rand() * 2)], v = data(rand, c), i = Math.floor(rand() * 5);
    items.push({ id: `${id}05`, type: 'findTime', prompt: `看圖。哪一個時間是 ${v[i]} ${c.unit}？`, figure: chart(c, [{ name: c.t.slice(0, 10), v }]),
      steps: [{ key: 'scale', label: '縱軸一格是多少', role: 'measure', input: 'number', answer: c.step }, { key: 'when', label: '是哪一個時間', role: 'answer', input: 'choice', options: c.xs.map(c.full), answer: c.full(c.xs[i]) }] }); }
  // 變化 2 題
  for (const j of [6, 7]) { const c = CTX[j === 6 ? 0 : 4], v = data(rand, c), i = Math.floor(rand() * 4), up = v[i + 1] > v[i];
    items.push({ id: `${id}0${j}`, type: 'change', prompt: `看圖。${c.full(c.xs[i])}到${c.full(c.xs[i + 1])}，${up ? '增加' : '減少'}了多少${c.unit}？`, figure: chart(c, [{ name: c.t.slice(0, 10), v }]),
      steps: [{ key: 'a', label: `${c.full(c.xs[i])}是多少`, role: 'part', input: 'number', answer: v[i] }, { key: 'b', label: `${c.full(c.xs[i + 1])}是多少`, role: 'part', input: 'number', answer: v[i + 1] },
        { key: 'diff', label: `${up ? '增加' : '減少'}了多少`, role: 'answer', input: 'number', answer: Math.abs(v[i + 1] - v[i]) }] }); }
  // 兩條線 1 題
  { const c = CTX[1], a = data(rand, c); let b; do b = data(rand, c); while (b.some((x, i) => x === a[i])); const i = Math.floor(rand() * 5);
    items.push({ id: `${id}08`, type: 'twoLine', prompt: `看圖例。${c.full(c.xs[i])}，小美和小安跳繩相差多少下？`, figure: chart({ ...c, t: '小美和小安跳繩的次數' }, [{ name: '小美', v: a }, { name: '小安', v: b }]),
      steps: [{ key: 'legend', label: '方塊的線是誰', role: 'formula', input: 'choice', options: ['小美', '小安'], answer: '小安' }, { key: 'a', label: '小美是多少下', role: 'part', input: 'number', answer: a[i] }, { key: 'b', label: '小安是多少下', role: 'part', input: 'number', answer: b[i] },
        { key: 'diff', label: '相差多少下', role: 'answer', input: 'number', answer: Math.abs(a[i] - b[i]) }] }); }
  // 波浪線 1 題
  { const c = { t: '小傑每個月的身高', xs: MON.slice(0, 5), full: x => x, xName: '月份', y: '身高（公分）', unit: '公分', step: 1 }, v = [131]; for (let k = 1; k < 5; k++) v.push(v[k - 1] + 1 + Math.floor(rand() * 2)); const i = 1 + Math.floor(rand() * 4);
    items.push({ id: `${id}09`, type: 'breakRead', prompt: `縱軸有波浪線。${c.xs[i]}的身高是多少公分？`, figure: chart(c, [{ name: '小傑', v }], { min: 130, brk: true, every: 2 }),
      steps: [{ key: 'start', label: '波浪線上面從多少開始', role: 'measure', input: 'number', answer: 130 }, { key: 'scale', label: '一格是多少', role: 'measure', input: 'number', answer: 1 }, { key: 'cells', label: '點比起點高幾格', role: 'measure', input: 'number', answer: v[i] - 130 },
        { key: 'val', label: `${c.xs[i]}是多少`, role: 'answer', input: 'number', answer: v[i] }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: ['公分', '公尺', '公斤'], answer: '公分' }] }); }
  // 選對圖 1 題（讀圖份：長條圖或折線圖）
  { const line = rand() < 0.5, t = line ? ORD[Math.floor(rand() * 3)] : CAT[Math.floor(rand() * 3)];
    items.push({ id: `${id}10`, type: 'chooseChart', prompt: `要畫「${t}」，用哪一種圖比較好？`, steps: [{ key: 'kind', label: '用哪一種圖', role: 'answer', input: 'choice', options: ['長條圖', '折線圖'], answer: line ? '折線圖' : '長條圖' }] }); }
  return { id, items };
}

function drawForm(id, rand) {
  const items = [];
  // 描點 4 題：給表格的一個數和一格，問要畫在 0 往上第幾格
  [0, 1, 2, 4].forEach((k, j) => { const c = CTX[k], v = data(rand, c), i = Math.floor(rand() * 5), shown = v.map((x, z) => z < i ? x : null);
    items.push({ id: `${id}0${j + 1}`, type: 'plot', prompt: `表格：${c.xs.map((x, z) => `${c.full(x)} ${v[z]}`).join('、')}（${c.unit}）。圖上已經描了前面幾個點。接下來描${c.full(c.xs[i])}。`, figure: chart(c, [{ name: c.t.slice(0, 10), v: shown }]),
      steps: [{ key: 'val', label: `${c.full(c.xs[i])}是多少`, role: 'measure', input: 'number', answer: v[i] }, { key: 'scale', label: '縱軸一格是多少', role: 'measure', input: 'number', answer: c.step },
        { key: 'cells', label: '要描在 0 往上第幾格', role: 'answer', input: 'number', answer: v[i] / c.step }] }); });
  // 定刻度 2 題
  for (const j of [5, 6]) { const S = [2, 5, 10][Math.floor(rand() * 3)], small = { 2: 1, 5: 2, 10: 5 }[S]; let v; do v = Array.from({ length: 5 }, () => S * (1 + Math.floor(rand() * 10))); while (Math.max(...v) <= 10 * small);
    items.push({ id: `${id}0${j}`, type: 'scale', prompt: `資料：${v.join('、')}。縱軸最多畫 10 格，一格要多少才畫得下、又不會太扁？`,
      steps: [{ key: 'max', label: '最大的數是多少', role: 'measure', input: 'number', answer: Math.max(...v) }, { key: 'scale', label: '一格要多少', role: 'answer', input: 'choice', options: ['1', '2', '5', '10'], answer: String(S) }] }); }
  // 兩條線 1 題
  { const c = CTX[4], a = data(rand, c); let b; do b = data(rand, c); while (b.some((x, i) => x === a[i])); const i = 1 + Math.floor(rand() * 4);
    items.push({ id: `${id}07`, type: 'twoLineDraw', prompt: `A 株已經用圓點畫好。B 株${c.full(c.xs[i])}是 ${b[i]} 公分。`, figure: chart({ ...c, t: '兩株豆芽的高度' }, [{ name: 'A 株', v: a }]),
      steps: [{ key: 'shape', label: 'B 株要用哪一種點', role: 'formula', input: 'choice', options: ['方塊（和 A 株不同）', '圓點（和 A 株相同）'], answer: '方塊（和 A 株不同）' },
        { key: 'cells', label: '要描在 0 往上第幾格', role: 'answer', input: 'number', answer: b[i] / c.step }] }); }
  // 波浪線 1 題
  { const lo = 131 + Math.floor(rand() * 3), v = [lo, lo + 2, lo + 3, lo + 5, lo + 6];
    items.push({ id: `${id}08`, type: 'breakDraw', prompt: `小傑五個月的身高：${v.join('、')} 公分。要畫折線圖。`,
      steps: [{ key: 'way', label: '縱軸要怎麼畫', role: 'formula', input: 'choice', options: ['用波浪線省略下面', '從 0 開始畫'], answer: '用波浪線省略下面' },
        { key: 'start', label: '波浪線上面從多少開始', role: 'answer', input: 'choice', options: ['0', '130', '140'], answer: '130' }] }); }
  // 選對圖 1 題（畫圖份：三種圖）
  { const k = Math.floor(rand() * 3), t = [CAT, ORD, PART][k][Math.floor(rand() * 3)];
    items.push({ id: `${id}09`, type: 'chooseChart', prompt: `要畫「${t}」，用哪一種圖比較好？`, steps: [{ key: 'kind', label: '用哪一種圖', role: 'answer', input: 'choice', options: ['長條圖', '折線圖', '圓形圖'], answer: ['長條圖', '折線圖', '圓形圖'][k] }] }); }
  // 用圖說明 1 題
  { const c = CTX[0], v = data(rand, c), m = v.indexOf(Math.max(...v));
    items.push({ id: `${id}10`, type: 'explain', prompt: '看圖。哪一句是從圖上看到的？', figure: chart(c, [{ name: '喝水', v }]),
      steps: [{ key: 'say', label: '選一句', role: 'answer', input: 'choice', options: [`${c.full(c.xs[m])}喝最多`, `下週${c.full(c.xs[m])}也會最多`, '每天都喝一樣多'], answer: `${c.full(c.xs[m])}喝最多` }] }); }
  return { id, items };
}

const make = (kind, fn, seed) => ({ id: kind === 'read' ? 'lineReadProbe' : 'lineDrawProbe', version: '1', kind: 'probe', package: 'line', variant: kind,
  title: kind === 'read' ? '折線圖小測驗：讀圖' : '折線圖小測驗：畫圖', itemSecs: 120, totalSecs: 1200, forms: ['A', 'B', 'C'].map((f, i) => fn(f, seeded(seed + i))) });
fs.writeFileSync(new URL('../scenarios/line-read-probe.json', import.meta.url), JSON.stringify(make('read', readForm, 2811), null, 1) + '\n');
fs.writeFileSync(new URL('../scenarios/line-draw-probe.json', import.meta.url), JSON.stringify(make('draw', drawForm, 2821), null, 1) + '\n');
console.log('wrote line probes');

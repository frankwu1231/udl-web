// 第 26 版：產生「示範用」探試題組（2 份等值複本）與練習題組。正式題組由研究團隊編製並審查。
// 用法：node scripts/make-demo-probes.mjs probe > scenarios/demo-probe.json；node scripts/make-demo-probes.mjs practice > scenarios/demo-practice.json
const AREA = ['平方公分', '公分', '平方公尺'];
const count = (id, w, h, cols = 10, rows = 7) => ({ id, type: 'count', prompt: '塗色的部分有多大？每一小格是 1 平方公分。', figure: { cols, rows, grid: true, rects: [[1, 1, w, h]] },
  steps: [{ key: 'area', label: '面積是多少', role: 'answer', input: 'number', answer: w * h }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: AREA, answer: '平方公分' }] });
const rect = (id, w, h, ctx) => ({ id, type: 'rectangle', prompt: `${ctx}長 ${w} 公分、寬 ${h} 公分，面積是多少？`, figure: { cols: Math.min(w, 14) + 2, rows: Math.min(h, 9) + 2, grid: false, rects: [[1, 1, Math.min(w, 14), Math.min(h, 9)]], labels: [{ x: 1 + Math.min(w, 14) / 2, y: 0.6, text: `${w} 公分` }, { x: 0.2, y: 1 + Math.min(h, 9) / 2, text: `${h} 公分` }] },
  steps: [{ key: 'len', label: '長是幾公分', role: 'measure', input: 'number', answer: w }, { key: 'wid', label: '寬是幾公分', role: 'measure', input: 'number', answer: h },
    { key: 'formula', label: '要用哪個算式', role: 'formula', input: 'choice', options: ['長×寬', '長+寬', '(長+寬)×2'], answer: '長×寬' },
    { key: 'area', label: '面積是多少', role: 'answer', input: 'number', answer: w * h }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: AREA, answer: '平方公分' }] });
const square = (id, a, ctx) => ({ id, type: 'square', prompt: `${ctx}邊長 ${a} 公分，面積是多少？`, figure: { cols: a + 2, rows: a + 2, grid: false, rects: [[1, 1, a, a]], labels: [{ x: 1 + a / 2, y: 0.6, text: `${a} 公分` }] },
  steps: [{ key: 'side', label: '邊長是幾公分', role: 'measure', input: 'number', answer: a }, { key: 'formula', label: '要用哪個算式', role: 'formula', input: 'choice', options: ['邊長×邊長', '邊長×4', '邊長+邊長'], answer: '邊長×邊長' },
    { key: 'area', label: '面積是多少', role: 'answer', input: 'number', answer: a * a }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: AREA, answer: '平方公分' }] });
const inverse = (id, area, w) => ({ id, type: 'inverse', prompt: `長方形的面積是 ${area} 平方公分，長是 ${w} 公分，寬是幾公分？`,
  steps: [{ key: 'formula', label: '要用哪個算式', role: 'formula', input: 'choice', options: ['面積÷長', '面積×長', '面積−長'], answer: '面積÷長' },
    { key: 'wid', label: '寬是多少', role: 'answer', input: 'number', answer: area / w }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: ['公分', '平方公分'], answer: '公分' }] });
// 複合圖形：上面一塊 a×b，下面一塊 c×d（左邊對齊）
const composite = (id, a, b, c, d) => ({ id, type: 'composite', prompt: '沿著虛線切成兩個長方形。每一小格是 1 平方公分，整個圖形的面積是多少？', figure: { cols: Math.max(a, c) + 2, rows: b + d + 2, grid: true, rects: [[1, 1, a, b], [1, 1 + b, c, d]] },
  steps: [{ key: 'part1', label: '上面一塊的面積', role: 'part', input: 'number', answer: a * b }, { key: 'part2', label: '下面一塊的面積', role: 'part', input: 'number', answer: c * d },
    { key: 'total', label: '整個圖形的面積', role: 'answer', input: 'number', answer: a * b + c * d }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: AREA, answer: '平方公分' }] });
const forms = [
  { id: 'A', items: [count('A01', 4, 3), count('A02', 5, 4), rect('A03', 6, 4, '書籤是長方形，'), rect('A04', 8, 3, '花圃是長方形，'), rect('A05', 7, 5, '桌墊是長方形，'), square('A06', 5, '手帕是正方形，'), square('A07', 7, '磁磚是正方形，'), inverse('A08', 24, 6), composite('A09', 4, 2, 6, 3), composite('A10', 3, 3, 5, 2)] },
  { id: 'B', items: [count('B01', 3, 4), count('B02', 4, 5), rect('B03', 4, 6, '卡片是長方形，'), rect('B04', 3, 8, '菜園是長方形，'), rect('B05', 5, 7, '地墊是長方形，'), square('B06', 6, '杯墊是正方形，'), square('B07', 4, '便條紙是正方形，'), inverse('B08', 30, 5), composite('B09', 5, 2, 3, 4), composite('B10', 2, 3, 6, 2)] }
];
const kind = process.argv[2] || 'probe';
const set = kind === 'practice'
  ? { id: 'demoPractice', version: '1', kind: 'practice', title: '探試操作練習（示範）', forms: [{ id: 'P', items: [count('P01', 2, 2, 6, 5), rect('P02', 3, 2, '貼紙是長方形，'), square('P03', 2, '小方塊是正方形，')] }] }
  : { id: 'demoProbe', version: '1', kind: 'probe', title: '面積探試題組（示範）', itemSecs: 90, totalSecs: 900, forms };
process.stdout.write(JSON.stringify(set, null, 1) + '\n');

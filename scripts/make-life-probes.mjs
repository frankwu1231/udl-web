// 第 34 版：四個教材包的「生活應用」探試題組（可當類化探測），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-life-probes.mjs → scenarios/area-life-probe.json、surface-life-probe.json、line-life-probe.json、factor-life-probe.json
// 題型比例依各教材包 content-*.js 的 PROBE_VARIANTS.life；數字用固定種子產生，重新執行結果一樣。
// 情境和網站上的活動不同（沒教過的新情境），才看得出類化。人名、店名都是虛構的。
import fs from 'node:fs';
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const int = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
const p2 = n => String(n).padStart(2, '0');
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
const factorsOf = n => Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);
const shuffle = (rand, l) => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const num = (key, label, answer, role = 'part') => ({ key, label, role, input: 'number', answer });
const choice = (rand, key, label, answer, others, role = 'answer') => ({ key, label, role, input: 'choice', options: shuffle(rand, [answer, ...others.filter(o => o !== answer)].slice(0, 5)), answer });
const fixedChoice = (key, label, answer, options, role = 'answer') => ({ key, label, role, input: 'choice', options, answer });
const rect = (w, h) => ({ cols: w, rows: h, grid: true, rects: [[0, 0, w, h]], labels: [{ x: w / 2, y: -0.2, text: `${w} 公尺` }, { x: -1.2, y: h / 2 + 0.2, text: `${h} 公尺` }] });
const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

// ---------- 面積：家裡的小設計師 ----------
function areaForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  const MAT = [['樂樂的房間', '木地板'], ['社團教室', '地毯'], ['陽台', '止滑墊']];
  for (const k of [1, 2, 3]) {
    let w, h, pk; do { w = int(rand, 3, 7); h = int(rand, 2, 5); pk = pick(rand, [4, 5, 6]); } while (w === h || (k !== 3 && (w * h) % pk === 0) || (k === 3 && (w * h) % pk !== 0));
    const [where, what] = MAT[(k + k0) % 3], need = w * h;
    items.push({ id: n(k), type: 'lifeMat', prompt: `${where}是長方形，長 ${w} 公尺、寬 ${h} 公尺。要鋪滿${what}，一片是 1 平方公尺，一箱有 ${pk} 片。至少要買幾箱？`, figure: rect(w, h),
      steps: [num('need', '鋪滿要幾片', need, 'measure'), num('box', '至少要買幾箱', Math.ceil(need / pk), 'answer')] });
  }
  for (const k of [4, 5, 6]) {
    let a, b; do { a = int(rand, 3, 8); b = int(rand, 2, 5); } while (a <= b);
    const per = 2 * (a + b), area = a * b, kind = ['per', 'area', 'per'][(k + k0) % 3];
    const where = ['班級的黑板', '門口的地墊', '花圃'][(k + k0) % 3];
    items.push(kind === 'per'
      ? { id: n(k), type: 'lifeBorder', prompt: `${where}是長方形，長 ${a} 公尺、寬 ${b} 公尺。要沿著四周圍一圈花邊，花邊要幾公尺？`, figure: rect(a, b), steps: [fixedChoice('kind', '要算周長還是面積', '周長', ['周長', '面積'], 'part'), num('ans', '花邊要幾公尺', per, 'answer')] }
      : { id: n(k), type: 'lifeBorder', prompt: `${where}是長方形，長 ${a} 公尺、寬 ${b} 公尺。要整面貼滿防水布，要幾平方公尺？`, figure: rect(a, b), steps: [fixedChoice('kind', '要算周長還是面積', '面積', ['周長', '面積'], 'part'), num('ans', '要幾平方公尺', area, 'answer')] });
  }
  for (const k of [7, 8]) {
    let a, b, c, d; do { a = int(rand, 3, 8); b = int(rand, 2, a); c = int(rand, 3, 8); d = int(rand, 2, c); } while (a * b === c * d || ((a * b - c * d) * ((a + b) - (c + d))) >= 0);
    items.push({ id: n(k), type: 'lifeRoom', prompt: `兩間教室要選一間地板比較大的。甲：長 ${a} 公尺、寬 ${b} 公尺；乙：長 ${c} 公尺、寬 ${d} 公尺。`,
      steps: [num('a', '甲是幾平方公尺', a * b, 'measure'), num('b', '乙是幾平方公尺', c * d, 'measure'), fixedChoice('pick', '選哪一間', a * b > c * d ? '甲' : '乙', ['甲', '乙'])] });
  }
  for (const k of [9, 10]) {
    let w, h, g; do { w = int(rand, 4, 9); h = int(rand, 2, 6); g = pick(rand, [2, 3, 4, 6]); } while ((w * h) % g || w * h / g < 2);
    items.push({ id: n(k), type: 'lifeGarden', prompt: `社區花園是長方形，長 ${w} 公尺、寬 ${h} 公尺，要平分給 ${g} 戶人家。每戶分到幾平方公尺？`, figure: rect(w, h),
      steps: [num('all', '整個花園幾平方公尺', w * h, 'measure'), num('each', '每戶幾平方公尺', w * h / g, 'answer')] });
  }
  return { id, items };
}

// ---------- 表面積：包裝小達人 ----------
function surfaceForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2, 3]) {
    let l, w, h; do { l = int(rand, 3, 8); w = int(rand, 2, 6); h = int(rand, 2, 6); } while (l === w && w === h);
    const half = l * w + l * h + w * h, fold = pick(rand, [10, 20]);
    const what = ['一盒拼圖', '一盒蠟筆', '一個玩具盒'][(k + k0) % 3];
    items.push({ id: n(k), type: 'lifeGift', prompt: `要包${what}送朋友。盒子長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分，包的時候多留 ${fold} 平方公分重疊。至少要幾平方公分的紙？`,
      steps: [num('half', '三種面各一個加起來', half, 'part'), num('surf', '盒子的表面積', 2 * half, 'measure'), num('need', '至少要幾平方公分的紙', 2 * half + fold, 'answer')] });
  }
  for (const k of [4, 5, 6]) {
    const l = int(rand, 3, 6), w = int(rand, 3, l), h = 3, door = 2, win = pick(rand, [2, 4]), can = 10, walls = 2 * (l + w) * h, paint = walls - door - win;
    items.push({ id: n(k), type: 'lifePaint', prompt: `儲藏室長 ${l} 公尺、寬 ${w} 公尺、高 ${h} 公尺。只漆四面牆，門 ${door} 平方公尺、窗 ${win} 平方公尺不漆。一桶漆可以漆 ${can} 平方公尺，要買幾桶？`,
      steps: [num('walls', '四面牆幾平方公尺', walls, 'measure'), num('paint', '要漆幾平方公尺', paint, 'part'), num('cans', '至少要買幾桶', Math.ceil(paint / can), 'answer')] });
  }
  const SAVE = [[[4, 1, 1], [2, 2, 1]], [[6, 1, 1], [3, 2, 1]], [[8, 1, 1], [2, 2, 2]]];
  for (const k of [7, 8]) {
    const [x, y] = SAVE[(k + k0) % 3], e = Math.max(1, Math.min(pick(rand, [2, 3]), Math.floor(9 / Math.max(...x, ...y)))), sa = d => 2 * (d[0] * d[1] + d[0] * d[2] + d[1] * d[2]) * e * e, dim = d => d.map(v => v * e).join('、');
    const cnt = x[0] * x[1] * x[2];
    items.push({ id: n(k), type: 'lifeSave', prompt: `${cnt} 個邊長 ${e} 公分的正方體肥皂要包在一起。甲排法長、寬、高是 ${dim(x)} 公分；乙排法是 ${dim(y)} 公分。哪一種比較省紙？`,
      steps: [num('a', '甲的表面積', sa(x), 'measure'), num('b', '乙的表面積', sa(y), 'measure'), fixedChoice('pick', '哪一種比較省紙', sa(x) < sa(y) ? '甲' : '乙', ['甲', '乙'])] });
  }
  for (const k of [9, 10]) {
    const C = pick(rand, [12, 15, 18, 20, 24]), h = pick(rand, [5, 6, 8, 9]);
    items.push({ id: n(k), type: 'lifeLabel', prompt: `茶葉罐是圓柱，用繩子量一圈長 ${C} 公分，罐子高 ${h} 公分。要做一張剛好繞一圈的標籤，標籤紙要幾平方公分？`,
      steps: [fixedChoice('shape', '標籤攤開是什麼形狀', '長方形', ['長方形', '圓形', '三角形'], 'part'), num('area', '標籤紙幾平方公分', C * h, 'answer')] });
  }
  return { id, items };
}

// ---------- 折線圖：生活小觀察家 ----------
const chart = (title, name, yName, unit, xs, v, step, every, brk = false, min = 0) => { const top = Math.max(...v) + step, rows = Math.max(4, Math.ceil((top - min) / (step * every)) * every); return { title, xs, series: [{ name, v }], min, step, rows, every, brk, yName: `${yName}（${unit}）`, xName: xs[0].endsWith('月') ? '月份' : xs[0].endsWith('年') ? '年' : '星期' }; };
function lineForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2, 3]) {
    let v, t; do { v = Array.from({ length: 7 }, () => 2 * int(rand, 6, 15)); t = int(rand, 1, 5); } while (v[t] === 22 || v[t + 1] === v[t]);
    const c = chart('一週每天的最高氣溫', '氣溫', '氣溫', '度', WEEK, v, 2, 5);
    items.push({ id: n(k), type: 'lifeWeather', prompt: `看天氣預報。媽媽說：最高氣溫比 22 度低，要穿長袖。星期${WEEK[t]}要穿長袖嗎？`, figure: { chart: c },
      steps: [num('v', `星期${WEEK[t]}是幾度`, v[t], 'measure'), fixedChoice('wear', '要穿長袖嗎', v[t] < 22 ? '要' : '不用', ['要', '不用'], 'answer'), fixedChoice('next', '隔天變熱還是變冷', v[t + 1] > v[t] ? '變熱' : '變冷', ['變熱', '變冷'], 'part')] });
  }
  for (const k of [4, 5, 6]) {
    const key = ['run', 'read', 'run'][(k + k0) % 3], goal = key === 'run' ? 30 : 20, step = key === 'run' ? 5 : 5;
    let v; do { v = Array.from({ length: 7 }, () => step * int(rand, 2, 8)); } while (!v.some(x => x < goal) || !v.some(x => x >= goal) || v.filter(x => x === Math.min(...v)).length > 1);
    const c = chart(key === 'run' ? '小芳每天運動的分鐘數' : '小宇每天閱讀的分鐘數', key === 'run' ? '運動' : '閱讀', '時間', '分', WEEK, v, step, 2);
    const at = v.indexOf(Math.min(...v));
    items.push({ id: n(k), type: 'lifeHealth', prompt: `目標是每天${key === 'run' ? '運動' : '閱讀'}至少 ${goal} 分鐘。看折線圖回答。`, figure: { chart: c },
      steps: [num('below', '有幾天比目標少', v.filter(x => x < goal).length, 'answer'), choice(rand, 'least', '哪一天最少', `星期${WEEK[at]}`, WEEK.filter((_, i) => i !== at).slice(0, 3).map(x => `星期${x}`), 'part'), num('gap', '那一天差目標幾分鐘', goal - v[at], 'part')] });
  }
  const YEARS = ['1年', '2年', '3年', '4年', '5年'];
  for (const k of [7, 8]) {
    let v, gs; do { v = [5 * int(rand, 22, 24)]; for (let j = 1; j < 5; j++) v.push(v[j - 1] + 5 * int(rand, 1, 2)); gs = v.slice(1).map((x, j) => x - v[j]); } while (gs.filter(g => g === Math.max(...gs)).length > 1);
    const yr = int(rand, 1, 4), c = chart('妹妹每年的身高', '身高', '身高', '公分', YEARS, v, 5, 1, true, 100);
    items.push({ id: n(k), type: 'lifeGrow', prompt: '這是妹妹每年量的身高（縱軸有波浪線）。', figure: { chart: c },
      steps: [num('h', `第 ${yr + 1} 年的身高`, v[yr], 'measure'), num('g', `第 ${yr} 年到第 ${yr + 1} 年長高幾公分`, v[yr] - v[yr - 1], 'answer')] });
  }
  const MON = ['1月', '2月', '3月', '4月', '5月', '6月'];
  for (const k of [9, 10]) {
    let v, down; do { v = [10 * int(rand, 2, 4)]; down = int(rand, 2, 4); for (let j = 1; j < 5; j++) v.push(v[j - 1] + (j === down ? -10 : 10 * int(rand, 1, 2))); } while (Math.max(...v) > 120);
    const s = int(rand, 0, 1), xs = MON.slice(s, s + 5), goal = v[4] + 10 * int(rand, 1, 3), c = chart('阿德撲滿裡的錢', '金額', '金額', '元', xs, v, 10, 2);
    items.push({ id: n(k), type: 'lifeMoney', prompt: `阿德想買一個 ${goal} 元的水壺。看撲滿的折線圖回答。`, figure: { chart: c },
      steps: [num('last', `${xs[4]}有幾元`, v[4], 'measure'), choice(rand, 'down', '哪一個月錢變少', xs[down], xs.slice(1).filter((_, j) => j + 1 !== down), 'part'), num('gap', '還差幾元', goal - v[4], 'answer')] });
  }
  return { id, items };
}

// ---------- 因數與倍數：分組分裝小幫手 ----------
function factorForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) {
    const N = pick(rand, [18, 20, 24, 30, 36]), fs = factorsOf(N), g = pick(rand, fs.filter(d => d > 2 && d < N / 2 + 1 && d < N));
    const bad = pick(rand, [4, 5, 7, 8, 9].filter(d => N % d));
    items.push({ id: n(k), type: 'lifeGroup', prompt: `社團有 ${N} 人要分組，每組人數一樣多，沒有人落單。`,
      steps: [num('cnt', `${N} 有幾個因數`, fs.length, 'part'), num('each', `分成 ${g} 組，每組幾人`, N / g, 'answer'), fixedChoice('bad', `分成 ${bad} 組會怎樣`, '有人落單', ['有人落單', '剛好分完'], 'part')] });
  }
  const PK = [['麵包', '個'], ['果汁', '瓶'], ['原子筆', '枝']];
  for (const k of [3, 4, 5]) {
    let N, pk; do { pk = pick(rand, [4, 5, 6, 8]); N = int(rand, 15, 45); } while (k !== 5 ? N % pk === 0 : N % pk !== 0);
    const [w, u] = PK[(k + k0) % 3];
    items.push({ id: n(k), type: 'lifePack', prompt: `郊遊要準備${w}，${N} 人每人一${u}。一包 ${pk} ${u}，只能整包買。至少要買幾包？`,
      steps: [num('top', `${pk} 的倍數裡，第一個不比 ${N} 少的`, Math.ceil(N / pk) * pk, 'part'), num('packs', '至少要買幾包', Math.ceil(N / pk), 'answer')] });
  }
  const BG = [[12, 18, '鉛筆', '橡皮擦'], [16, 24, '貼紙', '書籤'], [18, 27, '糖果', '巧克力'], [20, 30, '蘋果', '梨子'], [24, 36, '餅乾', '糖果']];
  for (const k of [6, 7]) {
    const [x, y, a, b] = BG[(k + k0 * 2) % BG.length], g = gcd(x, y);
    items.push({ id: n(k), type: 'lifeBags', prompt: `有 ${x} 個${a}、${y} 個${b}，要全部分完裝成禮物袋，每袋一樣。最多可以裝幾袋？`,
      steps: [fixedChoice('kind', '要找公因數還是公倍數', '公因數', ['公因數', '公倍數'], 'part'), num('g', '最多幾袋', g, 'answer'), num('ea', `每袋幾個${a}`, x / g, 'part')] });
  }
  const DT = [[2, 3], [3, 4], [4, 6], [2, 5], [3, 5]];
  for (const k of [8, 9]) {
    const [a, b] = DT[(k + k0) % DT.length], L = lcm(a, b), d = int(rand, 1, 24 - L);
    items.push({ id: n(k), type: 'lifeDuty', prompt: `阿明每 ${a} 天擦一次窗戶，小琪每 ${b} 天倒一次回收。今天是 4 月 ${d} 日，兩人都做了。最少再過幾天又在同一天做？`,
      steps: [fixedChoice('kind', '要找公因數還是公倍數', '公倍數', ['公因數', '公倍數'], 'part'), num('days', '最少再過幾天', L, 'answer'), num('day', '那天是 4 月幾日', d + L, 'part')] });
  }
  { const N = [12, 18, 20][k0], fs = factorsOf(N);
    items.push({ id: n(10), type: 'lifeDesk', prompt: `${N} 張椅子要排成長方形，每排一樣多，至少 2 排、每排至少 2 張（3 排 4 張和 4 排 3 張算兩種）。`,
      steps: [num('cnt', `${N} 有幾個因數`, fs.length, 'part'), num('ways', '可以排成幾種', fs.length - 2, 'answer')] }); }
  return { id, items };
}

const SETS = [
  ['area', 'areaLifeProbe', '面積小測驗：家裡的小設計師（生活應用）', areaForm, 3401],
  ['surface', 'surfaceLifeProbe', '表面積小測驗：包裝小達人（生活應用）', surfaceForm, 3402],
  ['line', 'lineLifeProbe', '折線圖小測驗：生活小觀察家（生活應用）', lineForm, 3403],
  ['factor', 'factorLifeProbe', '因數與倍數小測驗：分組分裝小幫手（生活應用）', factorForm, 3404]
];
for (const [pkg, id, title, make, seed] of SETS) {
  const rand = seeded(seed), set = { id, version: '1', kind: 'probe', package: pkg, variant: 'life', title, itemSecs: 150, totalSecs: 1500, forms: ['A', 'B', 'C'].map((f, k) => make(f, rand, k)) };
  fs.writeFileSync(new URL(`../scenarios/${pkg}-life-probe.json`, import.meta.url), JSON.stringify(set, null, 2) + '\n');
  console.log(`scenarios/${pkg}-life-probe.json`);
}

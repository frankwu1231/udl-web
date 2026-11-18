// 第 33 版：分數的四份探試題組（入門 early、四年級 g4、五六年級 g56、分數小幫手 life），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-frac-probes.mjs → scenarios/frac-early-probe.json、frac-g4-probe.json、frac-g56-probe.json、frac-life-probe.json
// 題型比例依 public/content-frac.js 的 PROBE_VARIANTS；數字用固定種子產生，重新執行結果一樣。
// 最後的分數答案用選項作答（錯誤選項是常見的錯：分子分母放反、分母也相加、部分比部分、沒有約分……），前面的步驟填數字。
import fs from 'node:fs';
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const int = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
const p2 = n => String(n).padStart(2, '0');
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
const simp = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const f = (n, d) => `${n}/${d}`;
const mixed = (w, n, d) => `${w} 又 ${n}/${d}`;
// 選項：答案加上幾個錯誤選項（去掉重複、和答案一樣大的錯誤選項），最多 4 個，順序打亂
// 分數字串的大小（「3/4」「1 又 2/3」「0.5」）；不是數的回傳 null。和答案一樣大的錯誤選項不要（例如 2/4 和 1/2）
const valueOf = t => { const m = String(t).match(/^(?:(\d+) 又 )?(\d+)\/(\d+)$/); if (m) return Number(m[1] || 0) + Number(m[2]) / Number(m[3]); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
function opts(rand, ans, wrong) {
  const list = [ans], va = valueOf(ans);
  for (const w of wrong) { const v = valueOf(w); if (w && !list.includes(w) && list.length < 4 && !(v !== null && va !== null && Math.abs(v - va) < 1e-9) && !/\/0$/.test(w)) list.push(w); }
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
const choice = (rand, key, label, ans, wrong, role = 'answer') => ({ key, label, role, input: 'choice', options: opts(rand, ans, wrong), answer: ans });
const numStep = (key, label, answer, role = 'part') => ({ key, label, role, input: 'number', answer });
const bar = (den, k) => ({ cols: den, rows: Math.max(1, Math.ceil(k / den)), grid: true, rects: k <= den ? [[0, 0, k, 1]] : [[0, 0, den, 1], [0, 1, k - den, 1]] });

function earlyForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) { const d = [[2, 4], [4, 8], [3, 6]][k0][k - 1];
    items.push({ id: n(k), type: 'unit', prompt: `一條吐司平分成 ${d} 塊，塗色的 1 塊是一條吐司的幾分之幾？`, figure: bar(d, 1), steps: [numStep('all', '全部平分成幾塊', d, 'measure'), choice(rand, 'f', '是幾分之幾', f(1, d), [f(d, 1), f(1, d - 1), f(1, d + 1)])] }); }
  for (const k of [3, 4]) { const d = int(rand, 4, 8), a = int(rand, 2, d - 2);
    items.push({ id: n(k), type: 'read', prompt: `一條巧克力平分成 ${d} 格，塗色的是吃掉的。吃掉的是一條的幾分之幾？`, figure: bar(d, a), steps: [numStep('all', '全部幾格', d, 'measure'), numStep('eat', '塗色幾格', a), choice(rand, 'f', '是幾分之幾', f(a, d), [f(d, a), f(a, d - a), f(d - a, d)])] }); }
  { const [x, y] = pick(rand, [[3, 5], [2, 4], [4, 6], [3, 8], [2, 5]]);
    items.push({ id: n(5), type: 'compare', prompt: `哥哥吃了 1/${x} 個披薩，妹妹吃了 1/${y} 個一樣大的披薩。誰吃得比較多？`, steps: [choice(rand, 'who', '誰吃得比較多', '哥哥', ['妹妹', '一樣多'])] }); }
  { const d = int(rand, 5, 9); let a, c; do { a = int(rand, 1, d - 1); c = int(rand, 1, d - 1); } while (a === c);
    items.push({ id: n(6), type: 'compare', prompt: `${a}/${d} 和 ${c}/${d}，哪一個比較大？`, steps: [choice(rand, 'big', '比較大的是', f(Math.max(a, c), d), [f(Math.min(a, c), d), '一樣大'])] }); }
  for (const k of [7, 8]) { const d = int(rand, 4, 9); let a, b; do { a = int(rand, 1, d - 1); b = int(rand, 1, d - 1); } while (k === 7 ? a + b > d : a + b <= d || a + b > 2 * d);
    items.push({ id: n(k), type: 'add', prompt: `早上喝了 ${a}/${d} 瓶果汁，下午又喝了 ${b}/${d} 瓶。一共喝了幾瓶？`, steps: [numStep('cnt', `一共幾個 1/${d}`, a + b), choice(rand, 'f', '一共喝了幾瓶', f(a + b, d), [f(a + b, 2 * d), f(a + b, d + d - 1), f(Math.abs(a - b) || 1, d)])] }); }
  { const d = int(rand, 4, 9), b = int(rand, 1, d - 1);
    items.push({ id: n(9), type: 'sub', prompt: `一條緞帶長 1 公尺，用掉 ${b}/${d} 公尺。還剩幾公尺？`, steps: [numStep('one', `1 公尺是幾個 1/${d}`, d, 'measure'), choice(rand, 'f', '還剩幾公尺', f(d - b, d), [f(b, d), f(d - b, b), f(1, d)])] }); }
  { const d = int(rand, 5, 9); let a, b; do { a = int(rand, 3, d - 1); b = int(rand, 1, a - 1); } while (a - b < 1);
    items.push({ id: n(10), type: 'sub', prompt: `有 ${a}/${d} 個蛋糕，吃掉 ${b}/${d} 個。還剩幾個？`, steps: [numStep('cnt', `還剩幾個 1/${d}`, a - b), choice(rand, 'f', '還剩幾個', f(a - b, d), [f(a - b, 0 + 1), f(a + b, d), f(d, a - b)])] }); }
  return { id, items };
}

function g4Form(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) { const d = pick(rand, [3, 4, 5, 6]), x = d + int(rand, 1, d - 1);
    items.push({ id: n(k), type: 'improper', prompt: `每一條是 1 個整體，平分成 ${d} 格。塗色的一共是多少？`, figure: bar(d, x), steps: [numStep('d', '1 條平分成幾格', d, 'measure'), numStep('cnt', '塗色一共幾格', x), choice(rand, 'f', '一共是多少', f(x, d), [f(x, 2 * d), f(d, x), f(x - d, d)])] }); }
  { const d = pick(rand, [3, 4, 5, 6]), w = int(rand, 1, 3), r = int(rand, 1, d - 1), t = w * d + r;
    items.push({ id: n(3), type: 'mixed', prompt: `把 ${t}/${d} 換成帶分數。`, steps: [numStep('w', '可以拼成幾個整的', w, 'measure'), choice(rand, 'f', '帶分數是', mixed(w, r, d), [mixed(r, w, d), mixed(w + 1, r, d), mixed(w, d - r, d)])] }); }
  { const d = pick(rand, [3, 4, 5, 6, 8]), w = int(rand, 1, 3), r = int(rand, 1, d - 1), t = w * d + r;
    items.push({ id: n(4), type: 'mixed', prompt: `把 ${mixed(w, r, d)} 換成假分數。`, steps: [numStep('wd', `${w} 個整的是幾個 1/${d}`, w * d, 'measure'), choice(rand, 'f', '假分數是', f(t, d), [f(w + r, d), f(w * r, d), f(t, w * d)])] }); }
  { const d = pick(rand, [4, 5, 6, 8]), a = int(rand, 1, d - 1), k = int(rand, 2, 4);
    items.push({ id: n(5), type: 'times', prompt: `每天喝 ${a}/${d} 瓶牛奶，${k} 天一共喝了幾瓶？`, steps: [numStep('cnt', `一共幾個 1/${d}`, a * k), choice(rand, 'f', '一共喝了幾瓶', f(a * k, d), [f(a * k, d * k), f(a + k, d), f(a, d * k)])] }); }
  for (const k of [6, 7]) { let b, a, m; do { b = pick(rand, [2, 3, 4, 5]); a = int(rand, 1, b - 1); m = int(rand, 2, 3); } while (gcd(a, b) > 1);
    items.push({ id: n(k), type: 'equiv', prompt: `${a}/${b} ＝ □/${b * m}，□ 是多少？`, figure: k === 6 ? bar(b, a) : undefined, steps: [numStep('m', `分母乘了多少`, m, 'measure'), numStep('ans', '□ 是多少', a * m, 'answer')] }); }
  for (const k of [8, 9]) { const d = pick(rand, [2, 3, 4, 5]), max = k === 8 ? 1 : 2; let x; do x = int(rand, 1, max * d - 1); while (x % d === 0);
    items.push({ id: n(k), type: 'line', prompt: `數線上，0 到 1 平分成 ${d} 段。從 0 往右跳 ${x} 段，是多少？`, steps: [choice(rand, 'u', '一段是多少', f(1, d), [f(1, d + 1), f(d, 1)], 'measure'), choice(rand, 'f', '跳到的地方是', f(x, d), [f(x, d + 1), f(x + 1, d), f(d, x)])] }); }
  { const [a, d, dec] = pick(rand, [[1, 2, '0.5'], [1, 5, '0.2'], [3, 5, '0.6'], [7, 10, '0.7'], [3, 10, '0.3'], [4, 5, '0.8']]);
    items.push({ id: n(10), type: 'decimal', prompt: `把 ${a}/${d} 寫成小數。`, steps: [numStep('t', `${a}/${d} ＝ □/10，□ 是多少`, Number(dec) * 10, 'measure'), choice(rand, 'dec', '寫成小數是', dec, [`0.${a}`, `0.${d}`, `${a}.${d}`])] }); }
  return { id, items };
}

const G56_PAIRS = [[2, 3], [3, 4], [4, 6], [2, 5], [6, 8], [3, 5], [4, 5], [6, 9]];
function g56Form(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) { let a, b; do { b = int(rand, 3, 9); a = int(rand, 1, b - 1); } while (gcd(a, b) > 1); const m = int(rand, 2, 4);
    items.push({ id: n(k), type: 'simplify', prompt: `把 ${a * m}/${b * m} 約成最簡分數。`, steps: [numStep('g', '分子分母都除以多少', m, 'measure'), choice(rand, 'f', '最簡分數是', f(a, b), [m % 2 === 0 && m > 2 ? f(a * m / 2, b * m / 2) : f(a * m, b), f(b, a), f(a, b * m)])] }); }
  for (const k of [3, 4, 5]) { const add = k !== 5; let b, d, a, c; do { [b, d] = pick(rand, G56_PAIRS); a = int(rand, 1, b - 1); c = int(rand, 1, d - 1); } while (gcd(a, b) > 1 || gcd(c, d) > 1 || (!add && a / b <= c / d));
    const L = lcm(b, d), x = a * L / b + (add ? 1 : -1) * c * L / d, [sn, sd] = simp(x, L);
    items.push({ id: n(k), type: 'unlike', prompt: `${f(a, b)} ${add ? '＋' : '－'} ${f(c, d)} ＝ ？（寫成最簡分數）`, steps: [numStep('den', '通分以後的分母（最小的）', L, 'measure'), choice(rand, 'f', '答案是', f(sn, sd), [f(add ? a + c : Math.abs(a - c) || 1, add ? b + d : Math.abs(b - d) || 1), f(sn, sd) === f(x, L) ? f(x + 1, L) : f(x, L), f(sd, sn)])] }); }
  for (const k of [6, 7]) { const B = [2, 3, 4, 5]; let a, b, c, d; do { b = pick(rand, B); d = pick(rand, B); a = int(rand, 1, b - 1); c = int(rand, 1, d - 1); } while (gcd(a * c, b * d) > 1 && k === 6);
    const [sn, sd] = simp(a * c, b * d);
    items.push({ id: n(k), type: 'mult', prompt: k === 6 ? `${f(a, b)} 個披薩的 ${f(c, d)} 是幾個披薩？` : `${f(a, b)} × ${f(c, d)} ＝ ？（寫成最簡分數）`, steps: [numStep('den', '分母乘分母是多少', b * d, 'measure'), choice(rand, 'f', '答案是', f(sn, sd), [f(a + c, b + d), f(a * d, b * c) === f(sn, sd) ? null : f(a * d, b * c), f(a * c, b), f(sd, sn)].filter(Boolean))] }); }
  { const L = int(rand, 1, 4), m = int(rand, 2, 6); const nn = L % m === 0 ? L + 1 : L;
    items.push({ id: n(8), type: 'divide', prompt: `${nn} 公升果汁平分倒進 ${m} 個瓶子，每瓶幾公升？`, steps: [choice(rand, 'op', '算式', `${nn} ÷ ${m}`, [`${m} ÷ ${nn}`, `${nn} × ${m}`], 'part'), choice(rand, 'f', '每瓶幾公升', f(nn, m), [f(m, nn), `${Math.floor(nn / m)} 餘 ${nn % m}`, f(1, m)])] }); }
  { const B = [2, 3, 4, 5]; let a, b, c, d; do { b = pick(rand, B); d = pick(rand, B); a = int(rand, 1, b - 1); c = int(rand, 1, d - 1); } while (gcd(a, b) > 1 || gcd(c, d) > 1 || f(...simp(a * d, b * c)) === f(...simp(a * c, b * d)));
    const [sn, sd] = simp(a * d, b * c);
    items.push({ id: n(9), type: 'divide', prompt: `${f(a, b)} ÷ ${f(c, d)} ＝ ？（寫成最簡分數）`, steps: [choice(rand, 'inv', '等於乘以多少', f(d, c), [f(c, d), f(b, a)], 'part'), choice(rand, 'f', '答案是', f(sn, sd), [f(...simp(a * c, b * d)), f(...simp(b * d, a * c)), f(sd, sn) === f(sn, sd) ? null : f(sd, sn)].filter(Boolean))] }); }
  { const b = pick(rand, [3, 4, 5]), a = int(rand, 1, b - 1), N = b * int(rand, 2, 5);
    items.push({ id: n(10), type: 'bigger', prompt: `${N} × ${f(a, b)} 的答案，會比 ${N} 大、小，還是一樣？`, steps: [choice(rand, 'p', '預估', '比較小', ['比較大', '一樣']), numStep('ans', `${N} × ${f(a, b)} 是多少`, N * a / b, 'part')] }); }
  // 「會變大還是變小」以預估為主要答案
  items[9].steps[0].role = 'answer'; items[9].steps[1].role = 'part';
  return { id, items };
}

function lifeForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) { let s, p, pz; do { pz = k === 1 ? 1 : 2; s = pick(rand, [4, 6, 8]); p = pick(rand, [2, 3, 4, 6]); } while ((pz * s) % p || p > pz * s); const each = pz * s / p;
    items.push({ id: n(k), type: 'share', prompt: `買了 ${pz} 個披薩，每個切成 ${s} 片，${p} 個人平分。每人分到幾個披薩？`, steps: [numStep('each', '每人分到幾片', each, 'measure'), choice(rand, 'f', '每人分到幾個披薩', f(each, s), [f(each, pz * s), f(s, each), f(each, s + each), f(1, s)])] }); }
  { const a = int(rand, 1, 2), b = int(rand, 1, 3), q = a * 2 + b;
    items.push({ id: n(3), type: 'recipe', prompt: `做鬆餅要 ${a === 1 ? '1/2' : '1'} 杯麵粉和 ${b}/4 杯牛奶。用 1/4 杯的量杯，一共要舀幾次？`, steps: [numStep('flour', '麵粉要舀幾次 1/4 杯', a * 2, 'measure'), numStep('q', '一共要舀幾次', q, 'answer')] }); }
  { const b = int(rand, 1, 3);
    items.push({ id: n(4), type: 'recipe', prompt: `食譜要 1/2 杯糖和 ${b}/4 杯水，一共幾杯？`, steps: [numStep('half', '1/2 杯是幾個 1/4 杯', 2, 'measure'), choice(rand, 'f', '一共幾杯', f(2 + b, 4), [f(1 + b, 6), f(1 + b, 4), f(2 + b, 8)])] }); }
  for (const k of [5, 6]) { const d = pick(rand, [4, 5, 6, 8]); let a, b; do { a = int(rand, 1, d - 2); b = int(rand, 1, d - 2); } while (a + b >= d); const r = d - a - b;
    items.push({ id: n(k), type: 'left', prompt: `一瓶飲料，早上喝了 ${a}/${d} 瓶，下午喝了 ${b}/${d} 瓶。還剩幾瓶？`, steps: [numStep('drink', `一共喝了幾個 1/${d}`, a + b, 'measure'), choice(rand, 'f', '還剩幾瓶', f(r, d), [f(a + b, d), f(r, 2 * d), f(d, r)])] }); }
  { const [a, d] = pick(rand, [[1, 2], [1, 4], [3, 4], [1, 3], [2, 3]]), m = 60 * a / d;
    items.push({ id: n(7), type: 'clock', prompt: `寫功課要 ${a}/${d} 小時，是幾分鐘？`, steps: [numStep('per', `1/${d} 小時是幾分鐘`, 60 / d, 'measure'), numStep('min', '是幾分鐘', m, 'answer')] }); }
  { const [a, d] = pick(rand, [[1, 2], [1, 3], [3, 4], [2, 3], [1, 4]]);
    items.push({ id: n(8), type: 'shop', prompt: `一打鉛筆是 12 枝。買 ${a}/${d} 打鉛筆，是幾枝？`, steps: [numStep('per', `12 枝的 1/${d} 是幾枝`, 12 / d, 'measure'), numStep('ans', '是幾枝', 12 * a / d, 'answer')] }); }
  for (const k of [9, 10]) { let L, m; do { L = int(rand, 1, 5); m = int(rand, 2, 6); } while (L % m === 0 || (k === 10) === (L < m));
    items.push({ id: n(k), type: 'pour', prompt: `${L} 公升果汁平分倒進 ${m} 個瓶子，每瓶幾公升？`, steps: [choice(rand, 'op', '算式', `${L} ÷ ${m}`, [`${m} ÷ ${L}`, `${L} × ${m}`], 'part'), choice(rand, 'f', '每瓶幾公升', f(L, m), [f(m, L), `${Math.floor(L / m)} 餘 ${L % m}`, f(1, m) === f(L, m) ? f(1, L) : f(1, m)])] }); }
  return { id, items };
}

const SETS = [
  ['early', 'fracEarlyProbe', '分數小測驗：入門（二、三年級）', earlyForm, 11],
  ['g4', 'fracG4Probe', '分數小測驗：四年級', g4Form, 21],
  ['g56', 'fracG56Probe', '分數小測驗：五、六年級', g56Form, 31],
  ['life', 'fracLifeProbe', '分數小測驗：分數小幫手（生活應用）', lifeForm, 41]
];
for (const [variant, id, title, make, seed] of SETS) {
  const forms = ['A', 'B', 'C'].map((fid, k) => make(fid, seeded(seed * 100 + k), k));
  for (const fm of forms) for (const it of fm.items) if (!it.figure) delete it.figure;
  const set = { id, version: '1', kind: 'probe', package: 'frac', variant, title, itemSecs: 150, totalSecs: 1500, forms };
  fs.writeFileSync(new URL(`../scenarios/frac-${variant}-probe.json`, import.meta.url), JSON.stringify(set, null, 2) + '\n');
  console.log(`scenarios/frac-${variant}-probe.json`, forms.map(f => f.items.length).join('/'));
}

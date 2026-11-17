// 第 31 版：因數與倍數的兩份探試題組（五年級 g5、六年級 g6），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-factor-probes.mjs → scenarios/factor-g5-probe.json、scenarios/factor-g6-probe.json
// 題型比例依 public/content-factor.js 的 PROBE_VARIANTS；數字用固定種子產生，重新執行結果一樣。數字都在 100 以內。
import fs from 'node:fs';
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const factorsOf = n => { const f = []; for (let d = 1; d <= n; d++) if (n % d === 0) f.push(d); return f; };
const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a / gcd(a, b) * b;
const isPrime = n => n > 1 && factorsOf(n).length === 2;
const primeFactors = n => { const f = []; for (let d = 2; n > 1; d++) while (n % d === 0) { f.push(d); n /= d; } return f; };
const take = (rand, list) => list.splice(Math.floor(rand() * list.length), 1)[0];
const YN = ['是', '不是'];
const GP = [[12, 18], [8, 12], [16, 24], [18, 24], [12, 16], [20, 30], [24, 36], [18, 27]], LP = [[4, 6], [6, 8], [6, 9], [4, 10], [8, 12], [6, 10], [3, 4], [10, 15]];
const GCX = [['糖果', '顆', '餅乾', '塊', '袋'], ['鉛筆', '枝', '橡皮擦', '個', '份'], ['紅花', '朵', '白花', '朵', '束']];
const LCX = [[(x, y) => `甲車每 ${x} 分鐘一班，乙車每 ${y} 分鐘一班。剛剛一起開出，最少再過幾分鐘又一起開出？`, '分鐘', ['分鐘', '班', '公分']],
  [(x, y) => `紅燈每 ${x} 秒亮一次，綠燈每 ${y} 秒亮一次。剛剛一起亮，最少再過幾秒又一起亮？`, '秒', ['秒', '次', '分鐘']]];
const gcdText = (x, y, c) => `有 ${x} ${c[1]}${c[0]}和 ${y} ${c[3]}${c[2]}，要分成一樣的${c[4]}，全部分完。最多可以分成幾${c[4]}？`;

function g5Form(id, rand) {
  const items = [], gp = GP.slice(), lp = LP.slice();
  // 是不是因數 1
  { const n = [24, 30, 36, 40][Math.floor(rand() * 4)], b = [7, 9, 11].find(d => n % d) ;
    items.push({ id: `${id}01`, type: 'isFactor', prompt: `${b} 是不是 ${n} 的因數？`, steps: [{ key: 'rem', label: `${n} ÷ ${b} 的餘數`, role: 'measure', input: 'number', answer: n % b }, { key: 'yes', label: '是不是因數', role: 'answer', input: 'choice', options: YN, answer: '不是' }] }); }
  // 找全部因數 2
  for (const j of [2, 3]) { const n = j === 2 ? [12, 18, 20][Math.floor(rand() * 3)] : [24, 30, 36][Math.floor(rand() * 3)], a = factorsOf(n).filter(d => d > 1 && d * d < n)[0];
    items.push({ id: `${id}0${j}`, type: 'factors', prompt: `找出 ${n} 的全部因數。${n} 有幾個因數？`, steps: [{ key: 'small', label: '最小的因數', role: 'part', input: 'number', answer: 1 }, { key: 'big', label: '最大的因數', role: 'part', input: 'number', answer: n },
      { key: 'pair', label: `${a} × □ ＝ ${n}，□ 是多少`, role: 'measure', input: 'number', answer: n / a }, { key: 'count', label: `${n} 有幾個因數`, role: 'answer', input: 'number', answer: factorsOf(n).length }] }); }
  // 是不是倍數 1
  { const a = [4, 6, 7][Math.floor(rand() * 3)], m = a * (5 + Math.floor(rand() * 5));
    items.push({ id: `${id}04`, type: 'isMult', prompt: `${m} 是不是 ${a} 的倍數？`, steps: [{ key: 'rem', label: `${m} ÷ ${a} 的餘數`, role: 'measure', input: 'number', answer: 0 }, { key: 'yes', label: '是不是倍數', role: 'answer', input: 'choice', options: YN, answer: '是' }] }); }
  // 因數倍數的說法 1
  { const a = 3 + Math.floor(rand() * 3), b = a + 2 + Math.floor(rand() * 3), n = a * b;
    items.push({ id: `${id}05`, type: 'pairWord', prompt: `${a} × ${b} ＝ ${n}。哪一句是對的？`, steps: [{ key: 'say', label: '選一句', role: 'answer', input: 'choice', options: [`${n} 是 ${a} 的倍數`, `${n} 是 ${a} 的因數`, `${a} 是 ${n} 的倍數`], answer: `${n} 是 ${a} 的倍數` }] }); }
  // 最大公因數 1
  { const [x, y] = take(rand, gp), c = GCX[Math.floor(rand() * 3)];
    items.push({ id: `${id}06`, type: 'gcd', prompt: gcdText(x, y, c), steps: [{ key: 'kind', label: '要找什麼', role: 'formula', input: 'choice', options: ['最大公因數', '最小公倍數'], answer: '最大公因數' }, { key: 'g', label: `最多幾${c[4]}`, role: 'answer', input: 'number', answer: gcd(x, y) },
      { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: [c[4], c[1], '個人'].filter((v, i, l) => l.indexOf(v) === i), answer: c[4] }] }); }
  // 最小公倍數 1
  { const [x, y] = take(rand, lp), c = LCX[Math.floor(rand() * 2)];
    items.push({ id: `${id}07`, type: 'lcm', prompt: c[0](x, y), steps: [{ key: 'kind', label: '要找什麼', role: 'formula', input: 'choice', options: ['最大公因數', '最小公倍數'], answer: '最小公倍數' }, { key: 'lcm', label: '最少再過多久', role: 'answer', input: 'number', answer: lcm(x, y) },
      { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: c[2], answer: c[1] }] }); }
  // 用哪一個 2（一題公因數、一題公倍數，順序隨機）
  const order = rand() < 0.5 ? ['g', 'l'] : ['l', 'g'];
  order.forEach((k, j) => { const [x, y] = k === 'g' ? take(rand, gp) : take(rand, lp), p = k === 'g' ? gcdText(x, y, GCX[Math.floor(rand() * 3)]) : LCX[Math.floor(rand() * 2)][0](x, y);
    items.push({ id: `${id}0${8 + j}`, type: 'which', prompt: `${p}（不用算，只要選）`, steps: [{ key: 'kind', label: '要找什麼', role: 'answer', input: 'choice', options: ['最大公因數', '最小公倍數'], answer: k === 'g' ? '最大公因數' : '最小公倍數' }] }); });
  // 應用 1：最多幾袋，每袋幾個
  { const [x, y] = take(rand, gp), c = GCX[Math.floor(rand() * 3)], g = gcd(x, y);
    items.push({ id: `${id}10`, type: 'apply', prompt: `${gcdText(x, y, c)}每${c[4]}有幾${c[1]}${c[0]}？`, steps: [{ key: 'total', label: `${c[0]}有幾${c[1]}`, role: 'measure', input: 'number', answer: x }, { key: 'g', label: `最多幾${c[4]}`, role: 'part', input: 'number', answer: g },
      { key: 'each', label: `每${c[4]}有幾${c[1]}${c[0]}`, role: 'answer', input: 'number', answer: x / g }] }); }
  return { id, items };
}

const KIND = ['質數', '合數', '都不是'];
function g6Form(id, rand) {
  const items = [];
  // 質數 2：一題質數、一題奇數合數（9、15）或 1
  { const n = [11, 13, 17, 19][Math.floor(rand() * 4)], m = [9, 15, 1][Math.floor(rand() * 3)];
    for (const [j, v] of [[1, n], [2, m]]) items.push({ id: `${id}0${j}`, type: 'prime', prompt: `${v} 是質數、合數，還是都不是？`, steps: [{ key: 'cnt', label: `${v} 有幾個因數`, role: 'measure', input: 'number', answer: factorsOf(v).length },
      { key: 'kind', label: '是哪一種', role: 'answer', input: 'choice', options: KIND, answer: v === 1 ? '都不是' : isPrime(v) ? '質數' : '合數' }] }); }
  // 2、3、5 判別 1
  { let n; do n = 20 + Math.floor(rand() * 80); while (n % 10 === 0);
    items.push({ id: `${id}03`, type: 'test235', prompt: `${n} 是不是 3 的倍數？`, steps: [{ key: 'sum', label: '各位數字加起來', role: 'measure', input: 'number', answer: String(n).split('').reduce((s, d) => s + Number(d), 0) },
      { key: 'yes', label: '是不是 3 的倍數', role: 'answer', input: 'choice', options: YN, answer: n % 3 ? '不是' : '是' }] }); }
  // 質因數分解 2
  const PD = [12, 18, 20, 30, 36, 40, 45, 50, 60, 72, 22, 33];
  for (const j of [4, 5]) { const n = take(rand, PD), pf = primeFactors(n), ok = pf.join('×'), w1 = [pf[0] * pf[1], ...pf.slice(2)].join('×'), w2 = `1×${n}`;
    items.push({ id: `${id}0${j}`, type: 'primeDiv', prompt: `用短除法，把 ${n} 分解成質數相乘。`, steps: [{ key: 'first', label: '先除以哪一個質數（最小的）', role: 'measure', input: 'number', answer: pf[0] },
      { key: 'pf', label: '質因數分解', role: 'answer', input: 'choice', options: [ok, w1 === ok ? `2×${n / 2}` : w1, w2], answer: ok }] }); }
  // 最大公因數 2、最小公倍數 2（短除）
  const SP = [[12, 18], [8, 12], [18, 24], [12, 30], [20, 30], [16, 24], [24, 36], [18, 30]];
  for (const j of [6, 7]) { const [a, b] = take(rand, SP);
    items.push({ id: `${id}0${j}`, type: 'gcd', prompt: `用短除法，找 ${a} 和 ${b} 的最大公因數。`, steps: [{ key: 'how', label: '最大公因數怎麼算', role: 'formula', input: 'choice', options: ['左邊的數相乘', '左邊和下面的數相乘'], answer: '左邊的數相乘' },
      { key: 'g', label: '最大公因數', role: 'answer', input: 'number', answer: gcd(a, b) }] }); }
  for (const j of [8, 9]) { const [a, b] = take(rand, SP), g = gcd(a, b);
    items.push({ id: `${id}0${j}`, type: 'lcm', prompt: `用短除法，找 ${a} 和 ${b} 的最小公倍數。`, steps: [{ key: 'g', label: '左邊的數相乘是多少', role: 'measure', input: 'number', answer: g },
      { key: 'ra', label: `除到最下面，${a} 變成多少`, role: 'part', input: 'number', answer: a / g }, { key: 'rb', label: `除到最下面，${b} 變成多少`, role: 'part', input: 'number', answer: b / g },
      { key: 'lcm', label: '最小公倍數', role: 'answer', input: 'number', answer: lcm(a, b) }] }); }
  // 約分 1
  { const [a, b] = [[6, 8], [9, 12], [12, 18], [8, 12], [10, 15]][Math.floor(rand() * 5)], g = gcd(a, b), ok = `${b / g}分之${a / g}`, half = g % 2 === 0 && g > 2 ? `${b / 2}分之${a / 2}` : `${b}分之${a}`;
    items.push({ id: `${id}10`, type: 'simplify', prompt: `把 ${b} 分之 ${a} 約成最簡分數。`, steps: [{ key: 'g', label: `${a} 和 ${b} 的最大公因數`, role: 'measure', input: 'number', answer: g },
      { key: 'frac', label: '最簡分數', role: 'answer', input: 'choice', options: [ok, half, `${b * 2}分之${a * 2}`], answer: ok }] }); }
  return { id, items };
}

const make = (v, fn, seed) => ({ id: v === 'g5' ? 'factorG5Probe' : 'factorG6Probe', version: '1', kind: 'probe', package: 'factor', variant: v,
  title: v === 'g5' ? '因數與倍數小測驗：五年級' : '因數與倍數小測驗：六年級', itemSecs: 120, totalSecs: 1200, forms: ['A', 'B', 'C'].map((f, i) => fn(f, seeded(seed + i))) });
fs.writeFileSync(new URL('../scenarios/factor-g5-probe.json', import.meta.url), JSON.stringify(make('g5', g5Form, 3111), null, 1) + '\n');
fs.writeFileSync(new URL('../scenarios/factor-g6-probe.json', import.meta.url), JSON.stringify(make('g6', g6Form, 3121), null, 1) + '\n');
console.log('wrote factor probes');

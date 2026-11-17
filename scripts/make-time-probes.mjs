// 第 32 版：時間概念的三份探試題組（報時 clock、經過時間 elapsed、時間小管家 life），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-time-probes.mjs → scenarios/time-clock-probe.json、time-elapsed-probe.json、time-life-probe.json
// 題型比例依 public/content-time.js 的 PROBE_VARIANTS；數字用固定種子產生，重新執行結果一樣。
// 時刻都拆成「幾時」「幾分」兩格作答；公車站、商店都是虛構的。
import fs from 'node:fs';
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const int = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
const p2 = n => String(n).padStart(2, '0');
const hm = m => `${Math.floor(m / 60)} 時${m % 60 ? ` ${m % 60} 分` : ''}`; // 12 時制內用
const dg = m => `${Math.floor(m / 60)}:${p2(m % 60)}`;
const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const hrStep = (label, v, role = 'part') => ({ key: 'hr', label, role, input: 'number', answer: v });
const mnStep = (label, v, role = 'answer') => ({ key: 'mn', label, role, input: 'number', answer: v });

function clockForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  { const h = int(rand, 1, 11);
    items.push({ id: n(1), type: 'hour', prompt: '鐘上是幾時？', figure: { clock: { h, m: 0 } }, steps: [{ key: 'long', label: '長針指著數字幾', role: 'measure', input: 'number', answer: 12 }, { key: 'h', label: '是幾時', role: 'answer', input: 'number', answer: h }] }); }
  { const h = int(rand, 1, 11);
    items.push({ id: n(2), type: 'half', prompt: '鐘上是幾時幾分？選一個。', figure: { clock: { h, m: 30 } }, steps: [{ key: 'short', label: '短針剛過數字幾', role: 'measure', input: 'number', answer: h }, { key: 'say', label: '是幾時幾分', role: 'answer', input: 'choice', options: [`${h} 時半`, `${h + 1} 時半`, `${h} 時 6 分`], answer: `${h} 時半` }] }); }
  const fives = [10, 15, 20, 25, 35, 40, 45, 50, 55];
  for (const k of [3, 4]) { const h = int(rand, 1, 11), m = fives.splice(Math.floor(rand() * fives.length), 1)[0];
    items.push({ id: n(k), type: 'read5', prompt: '鐘上是幾時幾分？', figure: { clock: { h, m } }, steps: [hrStep('幾時', h), { key: 'num', label: '長針指著數字幾', role: 'measure', input: 'number', answer: m / 5 }, mnStep('幾分', m)] }); }
  // 一題長針在右半邊，一題在左半邊（短針靠近下一個數字，容易讀成下一時）
  for (const [k, lo, hi] of [[5, 6, 29], [6, 36, 59]]) { const h = int(rand, 1, 11); let m; do m = int(rand, lo, hi); while (m % 5 === 0);
    items.push({ id: n(k), type: 'read1', prompt: '鐘上是幾時幾分？', figure: { clock: { h, m } }, steps: [hrStep('幾時', h), { key: 'past', label: '長針剛過數字幾', role: 'measure', input: 'number', answer: Math.floor(m / 5) }, mnStep('幾分', m)] }); }
  { const half = ['上午', '下午', '上午'][k0], a = half === '上午' ? [7, 0, 8][k0] : int(rand, 1, 3), d = [3, 2, 2][k0] + (rand() < 0.5 ? 0 : 1);
    items.push({ id: n(7), type: 'hours', prompt: `從${half} ${a} 時到${half} ${a + d} 時，經過多久？`, steps: [{ key: 'd', label: '經過幾', role: 'answer', input: 'number', answer: d }, { key: 'unit', label: '單位', role: 'unit', input: 'choice', options: ['小時', '分鐘', '時'], answer: '小時' }] }); }
  { const mo = int(rand, 3, 11), d = int(rand, 1, 12), w = int(rand, 0, 6), gap = pick(rand, [7, 14]), plus = int(rand, 1, 3), ans = WEEK[(w + gap + plus) % 7];
    const opts = [ans, WEEK[(w + gap) % 7], WEEK[(w + gap + plus + 1) % 7], WEEK[(w + gap + plus + 6) % 7]];
    items.push({ id: n(8), type: 'calDay', prompt: `${mo} 月 ${d} 日是${WEEK[w]}。${mo} 月 ${d + gap + plus} 日是星期幾？`, steps: [{ key: 'gap', label: '兩個日子差幾天', role: 'measure', input: 'number', answer: gap + plus }, { key: 'w', label: '是星期幾', role: 'answer', input: 'choice', options: opts, answer: ans }] }); }
  { const mo = [6, 8, 11][k0], big = [1, 3, 5, 7, 8, 10, 12].includes(mo);
    items.push({ id: n(9), type: 'monthDays', prompt: `${mo} 月有幾天？`, steps: [{ key: 'big', label: '大月還是小月', role: 'part', input: 'choice', options: ['大月', '小月'], answer: big ? '大月' : '小月' }, { key: 'days', label: '有幾天', role: 'answer', input: 'number', answer: big ? 31 : 30 }] }); }
  { const [what, t, ans] = pick(rand, [['吃早餐', '7 時', '上午'], ['吃午餐', '12 時', '中午'], ['放學回家', '4 時', '下午'], ['上床睡覺', '9 時', '晚上']]);
    items.push({ id: n(10), type: 'period', prompt: `小安每天 ${t}${what}。這是上午、中午、下午，還是晚上？`, steps: [{ key: 'p', label: '是什麼時候', role: 'answer', input: 'choice', options: ['上午', '中午', '下午', '晚上'], answer: ans }] }); }
  return { id, items };
}

function elapsedForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  { const h = int(rand, 1, 2), m = pick(rand, [10, 15, 20, 25, 40, 45]);
    items.push({ id: n(1), type: 'hm', prompt: `${h} 小時 ${m} 分是幾分鐘？`, steps: [{ key: 'h60', label: `${h} 小時是幾分鐘`, role: 'measure', input: 'number', answer: h * 60 }, { key: 'tot', label: '一共幾分鐘', role: 'answer', input: 'number', answer: h * 60 + m }] }); }
  { const h = int(rand, 1, 2), m = pick(rand, [5, 10, 20, 30, 35, 50]);
    items.push({ id: n(2), type: 'hm', prompt: `${h * 60 + m} 分鐘是幾小時幾分？`, steps: [hrStep('幾小時', h), mnStep('幾分', m)] }); }
  { const [s, ans] = [['「下課有 10 分鐘」的 10 分鐘', '時間量'], ['「8 時 10 分上課」的 8 時 10 分', '時刻'], ['「跑了 5 分鐘」的 5 分鐘', '時間量'], ['「下午 4 時放學」的 4 時', '時刻']][k0];
    items.push({ id: n(3), type: 'pointDur', prompt: `${s}，是時刻，還是時間量？`, steps: [{ key: 'k', label: '是哪一種', role: 'answer', input: 'choice', options: ['時刻', '時間量'], answer: ans }] }); }
  { const h = int(rand, 1, 9), m = pick(rand, [5, 15, 20, 35, 45, 50]);
    items.push({ id: n(4), type: 'to24', prompt: `下午 ${h} 時 ${m} 分，用 24 時制是幾時幾分？`, steps: [{ key: 'add', label: '幾時要加多少', role: 'measure', input: 'number', answer: 12 }, hrStep('幾時', h + 12, 'answer'), { key: 'mn', label: '幾分', role: 'part', input: 'number', answer: m }] }); }
  { const h = int(rand, 13, 22), m = pick(rand, [10, 25, 30, 40, 55]);
    items.push({ id: n(5), type: 'to24', prompt: `電子鐘顯示 ${h}:${p2(m)}，是下午或晚上的幾時幾分？`, steps: [{ key: 'sub', label: '幾時要減多少', role: 'measure', input: 'number', answer: 12 }, hrStep('幾時', h - 12, 'answer'), { key: 'mn', label: '幾分', role: 'part', input: 'number', answer: m }] }); }
  { const h = int(rand, 8, 10), a = pick(rand, [35, 40, 45, 50]), b = pick(rand, [10, 15, 20, 25]), to = 60 - a;
    items.push({ id: n(6), type: 'cross', prompt: `從上午 ${h} 時 ${a} 分到上午 ${h + 1} 時 ${b} 分，經過幾分鐘？`, steps: [{ key: 'toH', label: `到 ${h + 1} 時要幾分鐘`, role: 'measure', input: 'number', answer: to }, { key: 'after', label: `${h + 1} 時以後又過幾分鐘`, role: 'part', input: 'number', answer: b }, { key: 'tot', label: '一共幾分鐘', role: 'answer', input: 'number', answer: to + b }] }); }
  { const h = int(rand, 1, 3), a = pick(rand, [40, 45, 50]), b = pick(rand, [10, 20, 25]), d = 60 - a + b + 60;
    items.push({ id: n(7), type: 'cross', prompt: `從下午 ${h} 時 ${a} 分到下午 ${h + 2} 時 ${b} 分，經過幾小時幾分？`, steps: [{ key: 'all', label: '一共幾分鐘', role: 'measure', input: 'number', answer: d }, hrStep('幾小時', Math.floor(d / 60)), mnStep('幾分', d % 60)] }); }
  { const a = pick(rand, [20, 30, 40]), b = pick(rand, [10, 15, 20, 30]), to = 60 - a;
    items.push({ id: n(8), type: 'noon', prompt: `從上午 11 時 ${a} 分到下午 1 時 ${b} 分，經過幾分鐘？`, steps: [{ key: 'toNoon', label: '到中午 12 時要幾分鐘', role: 'measure', input: 'number', answer: to }, { key: 'after', label: '中午 12 時以後又過幾分鐘', role: 'part', input: 'number', answer: 60 + b }, { key: 'tot', label: '一共幾分鐘', role: 'answer', input: 'number', answer: to + 60 + b }] }); }
  { const s = [9, 10, 9][k0], e = [6, 7, 7][k0];
    items.push({ id: n(9), type: 'midnight', prompt: `晚上 ${s} 時睡覺，第二天早上 ${e} 時起床，睡了幾小時？`, steps: [{ key: 'toMid', label: '到半夜 12 時睡了幾小時', role: 'measure', input: 'number', answer: 12 - s }, { key: 'after', label: '12 時以後又睡幾小時', role: 'part', input: 'number', answer: e }, { key: 'tot', label: '一共睡了幾小時', role: 'answer', input: 'number', answer: 12 - s + e }] }); }
  { const h = int(rand, 1, 3), a = pick(rand, [30, 40, 45]), dh = 1, dm = pick(rand, [25, 35, 40]), sum = a + dm, end = (h + dh) * 60 + sum;
    items.push({ id: n(10), type: 'findEnd', prompt: `電影從下午 ${h} 時 ${a} 分開始，演了 ${dh} 小時 ${dm} 分。下午幾時幾分結束？`, steps: [{ key: 'sum', label: '分和分加起來是幾分', role: 'measure', input: 'number', answer: sum }, hrStep('幾時', Math.floor(end / 60)), mnStep('幾分', end % 60)] }); }
  return { id, items };
}

const STOPS = [['學校站', '圖書館站'], ['公園站', '游泳池站'], ['社區站', '體育館站']];
function lifeForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  // 來得及嗎：一題來得及、一題來不及（順序隨機）
  const ok = rand() < 0.5 ? [true, false] : [false, true];
  ok.forEach((yes, j) => { const [place, due] = pick(rand, [['學校', 8 * 60], ['補習班', 17 * 60 - 12 * 60], ['公園', 9 * 60]]), walk = pick(rand, [15, 20, 25]), left = yes ? walk + pick(rand, [5, 10]) : walk - pick(rand, [5, 10]), now = due - left;
    items.push({ id: n(1 + j), type: 'inTime', prompt: `現在是 ${hm(now)}，走到${place}要 ${walk} 分鐘，${hm(due)}要到。來得及嗎？`, steps: [{ key: 'left', label: `到 ${hm(due)}還有幾分鐘`, role: 'measure', input: 'number', answer: left }, { key: 'yes', label: '來得及嗎', role: 'answer', input: 'choice', options: ['來得及', '來不及'], answer: yes ? '來得及' : '來不及' }] }); });
  // 最晚幾點出門：一題不跨時、一題跨時
  [false, true].forEach((cross, j) => { const walk = pick(rand, [10, 15, 20]), dueM = cross ? walk - pick(rand, [5]) : walk + pick(rand, [10, 20, 30]), dueH = int(rand, 8, 9), due = dueH * 60 + dueM, out = due - walk, place = pick(rand, ['圖書館', '游泳池', '體育館']);
    items.push({ id: n(3 + j), type: 'leave', prompt: `要在 ${hm(due)}到${place}，走路要 ${walk} 分鐘。最晚幾時幾分要出門？`, steps: [{ key: 'way', label: '要往前推還是往後推', role: 'formula', input: 'choice', options: ['往前推（減）', '往後推（加）'], answer: '往前推（減）' }, hrStep('幾時', Math.floor(out / 60)), mnStep('幾分', out % 60)] }); });
  // 公車時刻表 3：下一班、要等多久、最晚坐哪一班
  const [from, to] = pick(rand, STOPS), first = 7 * 60 + pick(rand, [0, 5, 10]), gap = pick(rand, [20, 25]), deps = [0, 1, 2, 3].map(i => first + i * gap), ride = pick(rand, [15, 20]);
  const table = `${from}開往${to}的公車：${deps.map(dg).join('、')}。`;
  { const k = int(rand, 1, 2), now = deps[k] - pick(rand, [5, 10]);
    items.push({ id: n(5), type: 'bus', prompt: `${table}現在是 ${dg(now)}，下一班是幾時幾分？`, steps: [hrStep('幾時', Math.floor(deps[k] / 60)), mnStep('幾分', deps[k] % 60)] }); }
  { const k = int(rand, 1, 3), wait = pick(rand, [5, 10, 15].filter(w => w < gap)), now = deps[k] - wait;
    items.push({ id: n(6), type: 'bus', prompt: `${table}現在是 ${dg(now)}，要等幾分鐘才有車？`, steps: [{ key: 'next', label: '下一班是幾分', role: 'measure', input: 'number', answer: deps[k] % 60 }, { key: 'wait', label: '要等幾分鐘', role: 'answer', input: 'number', answer: wait }] }); }
  { const k = int(rand, 1, 2), due = deps[k] + ride + pick(rand, [5, 10]);
    items.push({ id: n(7), type: 'bus', prompt: `${table}坐車到${to}要 ${ride} 分鐘，${dg(due)} 以前要到。最晚要坐哪一班？`, steps: [{ key: 'way', label: '用到站時刻減什麼', role: 'formula', input: 'choice', options: ['坐車的時間', '等車的時間'], answer: '坐車的時間' }, { key: 'bus', label: '最晚坐哪一班', role: 'answer', input: 'choice', options: deps.map(dg), answer: dg(deps[k]) }] }); }
  { const home = 4 * 60 + pick(rand, [10, 20, 30]), a = pick(rand, [30, 40]), b = pick(rand, [15, 20]), end = home + a + b;
    items.push({ id: n(8), type: 'plan', prompt: `小安下午 ${hm(home)}到家，先寫功課 ${a} 分鐘，再吃點心 ${b} 分鐘。做完是下午幾時幾分？`, steps: [{ key: 'sum', label: '一共要幾分鐘', role: 'measure', input: 'number', answer: a + b }, hrStep('幾時', Math.floor(end / 60)), mnStep('幾分', end % 60)] }); }
  // 店還開著嗎：一題開著（問還有幾分鐘）、一題關了
  const close = pick(rand, [20 * 60 + 30, 21 * 60]), shop = pick(rand, ['社區文具店', '巷口麵包店', '社區書店']), hours = `${shop}營業時間 9:00～${dg(close)}。`;
  { const left = pick(rand, [15, 20, 25]), now = close - left;
    items.push({ id: n(9), type: 'shop', prompt: `${hours}現在是晚上 ${hm(now - 12 * 60)}，還有幾分鐘關門？`, steps: [{ key: 'h24', label: `晚上 ${Math.floor(now / 60) - 12} 時是 24 時制幾時`, role: 'measure', input: 'number', answer: Math.floor(now / 60) }, { key: 'left', label: '還有幾分鐘關門', role: 'answer', input: 'number', answer: left }] }); }
  { const now = close + pick(rand, [10, 20]);
    items.push({ id: n(10), type: 'shop', prompt: `${hours}現在是晚上 ${hm(now - 12 * 60)}，店還開著嗎？`, steps: [{ key: 'h24', label: `晚上 ${Math.floor(now / 60) - 12} 時是 24 時制幾時`, role: 'measure', input: 'number', answer: Math.floor(now / 60) }, { key: 'open', label: '店還開著嗎', role: 'answer', input: 'choice', options: ['開著', '關了'], answer: '關了' }] }); }
  return { id, items };
}

const SETS = [
  ['clock', 'timeClockProbe', '時間概念小測驗：報時（一、二年級）', clockForm, 3201],
  ['elapsed', 'timeElapsedProbe', '時間概念小測驗：經過時間（三、四年級）', elapsedForm, 3202],
  ['life', 'timeLifeProbe', '時間概念小測驗：時間小管家', lifeForm, 3203]
];
for (const [variant, id, title, make, seed] of SETS) {
  const rand = seeded(seed), set = { id, version: '1', kind: 'probe', package: 'time', variant, title, itemSecs: 120, totalSecs: 1200, forms: ['A', 'B', 'C'].map((f, k) => make(f, rand, k)) };
  fs.writeFileSync(new URL(`../scenarios/time-${variant}-probe.json`, import.meta.url), JSON.stringify(set, null, 2) + '\n');
  console.log(`scenarios/time-${variant}-probe.json`);
}

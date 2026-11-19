// 第 35 版：整數四則運算的四份探試題組（加減 addsub、乘除 muldiv、應用題 word、算數小幫手 life），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-int-probes.mjs → scenarios/int-addsub-probe.json、int-muldiv-probe.json、int-word-probe.json、int-life-probe.json
// 題型比例依 public/content-int.js 的 PROBE_VARIANTS；數字用固定種子產生，重新執行結果一樣。
// 數字範圍照課綱：一年級 10 以內；二年級減法只退位一次；直式除法被除數三位數（含商中有 0）；估商的除數二位數；併式只用整數。
// 生活題的情境和網站上的活動不同（沒教過的新情境），才看得出類化。人名、店名都是虛構的。
import fs from 'node:fs';
const seeded = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const int = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
const p2 = n => String(n).padStart(2, '0');
const shuffle = (rand, l) => { l = l.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const num = (key, label, answer, role = 'part') => ({ key, label, role, input: 'number', answer });
const choice = (rand, key, label, answer, others, role = 'answer') => ({ key, label, role, input: 'choice', options: shuffle(rand, [answer, ...[...new Set(others)].filter(o => o !== answer)].slice(0, 4)), answer });
const fixedChoice = (key, label, answer, options, role = 'answer') => ({ key, label, role, input: 'choice', options, answer });
function borrows(a, b) { let c = 0, n = 0; while (a > 0 || b > 0) { const d = a % 10 - c - b % 10; c = d < 0 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
function carries(a, b) { let c = 0, n = 0; while (a > 0 || b > 0) { const s = a % 10 + b % 10 + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
const round10 = n => Math.round(n / 10) * 10;

// ---------- 加減 ----------
function addsubForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  const M = [['籃子裡有 {a} 顆橘子，又放進 {b} 顆。現在有幾顆？', '+'], ['桌上有 {a} 枝筆，拿走 {b} 枝。還剩幾枝？', '-'], ['魚缸有 {a} 條紅魚和 {b} 條黃魚。一共幾條？', '+'], ['小華有 {a} 張卡，小芬有 {b} 張。小華比小芬多幾張？', '-']];
  for (const k of [1, 2]) { const [t, op] = M[(k0 * 2 + k) % 4]; let a, b; do { a = int(rand, 2, 9); b = int(rand, 1, 9); } while (op === '+' ? a + b > 10 : b >= a);
    items.push({ id: n(k), type: 'meaning', prompt: t.replace('{a}', a).replace('{b}', b), steps: [fixedChoice('op', '要用加的還是減的', op === '+' ? '加（＋）' : '減（－）', ['加（＋）', '減（－）'], 'part'), num('ans', '答案是多少', op === '+' ? a + b : a - b, 'answer')] }); }
  for (const k of [3, 4]) { let a, b; do { a = int(rand, 100, 699); b = int(rand, 100, 299); } while (a + b > 999 || carries(a, b) !== (k === 3 ? 1 : 2));
    items.push({ id: n(k), type: 'addcol', prompt: `用直式算：${a} ＋ ${b} ＝ ？`, steps: [num('u', '個位寫幾', (a + b) % 10, 'measure'), num('ans', '答案是多少', a + b, 'answer')] }); }
  for (const k of [5, 6, 7]) { let a, b; do { a = k === 7 ? int(rand, 1000, 9999) : int(rand, 100, 999); b = int(rand, 10, a - 1); } while (k === 7 ? borrows(a, b) < 2 || !/0/.test(String(a).slice(1)) : borrows(a, b) !== 1 || a % 10 >= b % 10);
    items.push({ id: n(k), type: 'subcol', prompt: `用直式算：${a} － ${b} ＝ ？`, steps: [fixedChoice('enough', '個位夠不夠減', a % 10 >= b % 10 ? '夠減' : '不夠減，要借', ['夠減', '不夠減，要借'], 'part'), num('ans', '答案是多少', a - b, 'answer')] }); }
  { let a, b; do { a = int(rand, 20, 80); b = int(rand, 11, 60); } while (a + b > 99 || carries(a, b) > 1); const c = a + b;
    items.push({ id: n(8), type: 'missing', prompt: `小安原本有 ${a} 顆彈珠，又贏了一些，現在有 ${c} 顆。他贏了幾顆？`, steps: [choice(rand, 'op', '算式', `${c} － ${a}`, [`${c} ＋ ${a}`, `${a} － ${c}`], 'part'), num('ans', '贏了幾顆', b, 'answer')] }); }
  { let r, u; do { r = int(rand, 20, 90); u = int(rand, 11, 99); } while (r + u > 200 || borrows(r + u, u) > 1); const c = r + u;
    items.push({ id: n(9), type: 'missing', prompt: `存錢筒原本有一些錢，拿出 ${u} 元，還剩 ${r} 元。原本有幾元？`, steps: [choice(rand, 'op', '算式', `${r} ＋ ${u}`, [`${u} － ${r}`, `${r} － ${u}`].filter(x => !x.startsWith(`${r} －`) || r > u), 'part'), num('ans', '原本有幾元', c, 'answer')] }); }
  { let a, b; do { a = int(rand, 100, 500); b = int(rand, 100, 500); } while (a === b || borrows(Math.max(a, b), Math.min(a, b)) > 1);
    items.push({ id: n(10), type: 'compare', prompt: `紅隊收集 ${a} 個瓶蓋，藍隊收集 ${b} 個。哪一隊多？多幾個？`, steps: [fixedChoice('who', '哪一隊多', a > b ? '紅隊' : '藍隊', ['紅隊', '藍隊'], 'part'), num('ans', '多幾個', Math.abs(a - b), 'answer')] }); }
  return { id, items };
}

// ---------- 乘除 ----------
function muldivForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) { const a = int(rand, 3, 9), b = int(rand, 3, 9), t = k === 1 ? `每盤有 ${a} 個水餃，${b} 盤一共幾個？` : `每排種 ${a} 棵樹，種了 ${b} 排。一共幾棵？`;
    items.push({ id: n(k), type: 'mult', prompt: t, steps: [choice(rand, 'op', '算式', `${a} × ${b}`, [`${a} ＋ ${b}`, `${a * b} ÷ ${b}`], 'part'), num('ans', '一共幾個', a * b, 'answer')] }); }
  for (const k of [3, 4]) { const d = int(rand, 3, 9), q = int(rand, 2, 9), r = k === 3 ? 0 : int(rand, 1, d - 1), t = d * q + r;
    items.push({ id: n(k), type: 'divide', prompt: `${t} 張色紙平分給 ${d} 個人，每人幾張？剩幾張？`, steps: [num('q', '每人幾張', q, 'answer'), num('r', '剩幾張', r, 'part')] }); }
  { let a; do a = int(rand, 102, 489); while (Math.floor(a / 10) % 10 !== 0); const b = int(rand, 2, 9);
    items.push({ id: n(5), type: 'mulcol', prompt: `用直式算：${a} × ${b} ＝ ？`, steps: [num('u', '個位寫幾', (a % 10 * b) % 10, 'measure'), num('ans', '答案是多少', a * b, 'answer')] }); }
  { const a = int(rand, 13, 79), b = int(rand, 12, 39);
    items.push({ id: n(6), type: 'mulcol', prompt: `用直式算：${a} × ${b} ＝ ？`, steps: [num('p2', `${a} × ${Math.floor(b / 10) * 10} 是多少`, a * Math.floor(b / 10) * 10, 'measure'), num('ans', '答案是多少', a * b, 'answer')] }); }
  for (const k of [7, 8, 9]) { let d, nn, q; do { d = int(rand, 2, 9); nn = int(rand, 100, 999); q = Math.floor(nn / d); } while (q < 10 || (k === 8 && !/0/.test(String(q).slice(1))) || (k === 9 && Number(String(nn)[0]) >= d));
    const start = Number(String(nn)[0]) >= d ? '百位' : '十位';
    items.push({ id: n(k), type: 'divcol', prompt: `用直式算：${nn} ÷ ${d} ＝ ？（寫出商和餘數）`, steps: [fixedChoice('start', '商從哪一位開始寫', start, ['百位', '十位'], 'measure'), num('q', '商', q, 'answer'), num('r', '餘數', nn % d, 'part')] }); }
  { let d, q, r, nn; do { d = int(rand, 21, 89); q = int(rand, 2, 9); r = int(rand, 0, d - 1); nn = d * q + r; } while (nn > 999 || Math.abs(Math.floor(nn / round10(d)) - q) > 1);
    items.push({ id: n(10), type: 'estq', prompt: `${nn} 本書，每 ${d} 本裝一箱。可以裝滿幾箱？剩幾本？`, steps: [num('near', `${d} 大約是幾十`, round10(d), 'measure'), num('q', '可以裝滿幾箱', q, 'answer'), num('r', '剩幾本', r, 'part')] }); }
  return { id, items };
}

// ---------- 應用題 ----------
function wordForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  const TWO = [
    () => { const p = int(rand, 4, 9), k = int(rand, 3, 9); return [`一個麵包 ${p} 元，買 ${k} 個，付 100 元。要找回多少元？`, `${k} 個要多少元`, p * k, 100 - p * k]; },
    () => { const a = int(rand, 30, 80), b = int(rand, 5, a - 10), c = int(rand, 5, 40); return [`圖書館有 ${a} 個人，走了 ${b} 個人，又來了 ${c} 個人。現在有幾人？`, '走了以後剩幾人', a - b, a - b + c]; },
    () => { const k = int(rand, 3, 8), each = int(rand, 4, 12), a = int(rand, 5, k * each - 5); return [`哥哥有 ${a} 顆彈珠，弟弟有 ${k * each - a} 顆，合起來平分給 ${k} 個人。每人幾顆？`, '合起來有幾顆', k * each, each]; },
    () => { const a = int(rand, 3, 9), b = int(rand, 3, 9), k = int(rand, 2, 6); return [`一層有 ${a} 個書櫃，一個書櫃放 ${b} 箱書。${k} 層一共幾箱？`, '一層有幾箱', a * b, a * b * k]; },
    () => { const g = int(rand, 2, 6), m = int(rand, 2, 5), each = int(rand, 2, 9), t = g * m * each; return [`${t} 張貼紙平分給 ${g} 班，每班再平分給 ${m} 組。每組幾張？`, '每班幾張', t / g, each]; },
    () => { const per = int(rand, 4, 8), bags = int(rand, 5, 20), p = int(rand, 15, 40); return [`${per * bags} 顆蘋果，每 ${per} 顆裝一袋，每袋賣 ${p} 元。全部可以賣多少元？`, '可以裝幾袋', bags, bags * p]; }
  ];
  const order = shuffle(rand, [0, 1, 2, 3, 4, 5]).slice(0, 4);
  order.forEach((t, k) => { const [pr, l1, v1, ans] = TWO[t]();
    items.push({ id: n(k + 1), type: 'two', prompt: pr, steps: [num('s1', `先算：${l1}`, v1, 'part'), num('ans', '答案是多少', ans, 'answer')] }); });
  { const p = int(rand, 5, 9), k = int(rand, 3, 9), m = 100;
    items.push({ id: n(5), type: 'merge', prompt: `一枝筆 ${p} 元，買 ${k} 枝，付 ${m} 元。找回的錢，併成一個算式是哪一個？`, steps: [choice(rand, 'f', '併式', `${m} － ${p} × ${k}`, [`(${m} － ${p}) × ${k}`, `${m} － ${p} ＋ ${k}`]), num('v', '找回多少元', m - p * k, 'part')] }); }
  { const a = int(rand, 10, 40), b = int(rand, 10, 40), k = int(rand, 2, 6) * 1; const tot = a + b, g = pick(rand, [2, 3, 4, 5].filter(x => (tot * 1) % x === 0)) || 1;
    if (g === 1) { items.push({ id: n(6), type: 'merge', prompt: `男生 ${a} 人、女生 ${b} 人，每人發 ${k} 張紙。一共發幾張？併成一個算式是哪一個？`, steps: [choice(rand, 'f', '併式', `(${a} ＋ ${b}) × ${k}`, [`${a} ＋ ${b} × ${k}`, `${a} × ${b} ＋ ${k}`]), num('v', '一共幾張', tot * k, 'part')] }); }
    else items.push({ id: n(6), type: 'merge', prompt: `男生 ${a} 人、女生 ${b} 人，平均分成 ${g} 隊。每隊幾人？併成一個算式是哪一個？`, steps: [choice(rand, 'f', '併式', `(${a} ＋ ${b}) ÷ ${g}`, [`${a} ＋ ${b} ÷ ${g}`, `${a} ÷ ${g} ＋ ${b}`]), num('v', '每隊幾人', tot / g, 'part')] }); }
  { const a = int(rand, 10, 50), b = int(rand, 2, 9), c = int(rand, 2, 9);
    items.push({ id: n(7), type: 'order', prompt: `算算看：${a} ＋ ${b} × ${c} ＝ ？`, steps: [fixedChoice('first', '先算哪一段', `${b} × ${c}`, [`${a} ＋ ${b}`, `${b} × ${c}`], 'part'), num('v', '答案是多少', a + b * c, 'answer')] }); }
  { const c = int(rand, 2, 9), q = int(rand, 2, 9), b = c * int(rand, 1, 5), a = c * q + b;
    items.push({ id: n(8), type: 'order', prompt: `算算看：(${a} － ${b}) ÷ ${c} ＝ ？`, steps: [fixedChoice('first', '先算哪一段', `${a} － ${b}`, [`${a} － ${b}`, `${b} ÷ ${c}`], 'part'), num('v', '答案是多少', (a - b) / c, 'answer')] }); }
  { let v; do v = Array.from({ length: 4 }, () => int(rand, 20, 60)); while (v.reduce((s, x) => s + x, 0) % 4);
    const s = v.reduce((x, y) => x + y, 0);
    items.push({ id: n(9), type: 'avg', prompt: `小美四天看書的頁數是 ${v.join('、')} 頁。平均每天看幾頁？`, steps: [num('s', '四天一共幾頁', s, 'measure'), num('avg', '平均每天幾頁', s / 4, 'answer')] }); }
  { const near = pick(rand, [99, 98, 101, 199]), k = int(rand, 3, 9), base = Math.round(near / 100) * 100, d = near - base;
    items.push({ id: n(10), type: 'distrib', prompt: `一個玩具 ${near} 元，買 ${k} 個。用比較快的方法算，一共多少元？`, steps: [choice(rand, 'how', '和哪一個一樣大', `${base} × ${k} ${d < 0 ? '－' : '＋'} ${Math.abs(d)} × ${k}`, [`${base} × ${k} ${d < 0 ? '－' : '＋'} ${Math.abs(d)}`], 'part'), num('ans', '一共多少元', near * k, 'answer')] }); }
  return { id, items };
}

// ---------- 算數小幫手（新情境：夜市、書展、市場、運動會……） ----------
function lifeForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  const SH = [[['烤玉米', 35, 60], ['珍珠奶茶', 40, 65], ['雞蛋糕', 30, 50]], [['故事書', 120, 220], ['書套', 15, 35], ['書籤', 10, 25]]];
  for (const k of [1, 2]) { const L = SH[k - 1].map(([w, lo, hi]) => [w, int(rand, lo, hi)]), tot = L.reduce((s, x) => s + x[1], 0), money = k === 1 ? Math.ceil(tot / 50) * 50 + (tot % 50 === 0 ? 0 : 0) : tot - int(rand, 1, 20);
    items.push({ id: n(k), type: 'enough', prompt: `${k === 1 ? '夜市' : '書展'}：想買${L.map(x => `${x[0]} ${x[1]} 元`).join('、')}。帶了 ${money} 元，夠不夠？`, steps: [num('tot', '一共要多少元', tot, 'measure'), fixedChoice('ok', '夠不夠', money >= tot ? '夠' : '不夠', ['夠', '不夠'])] }); }
  for (const k of [3, 4]) { const bill = k === 3 ? 100 : 500, price = int(rand, Math.floor(bill / 4), bill - 3);
    items.push({ id: n(k), type: 'change', prompt: `在${k === 3 ? '市場買一把青菜' : '藥局買一盒OK繃和乳液'}，一共 ${price} 元，付了 ${bill} 元。要找多少元？`, steps: [choice(rand, 'op', '算式', `${bill} － ${price}`, [`${bill} ＋ ${price}`, `${price} － ${bill}`], 'part'), num('ch', '要找多少元', bill - price, 'answer')] }); }
  { const p = int(rand, 12, 45), k = int(rand, 3, 8);
    items.push({ id: n(5), type: 'buy', prompt: `運動會要買 ${k} 瓶運動飲料，一瓶 ${p} 元。一共多少元？`, steps: [choice(rand, 'op', '算式', `${p} × ${k}`, [`${p} ＋ ${k}`, `${p} ÷ ${k}`], 'part'), num('tot', '一共多少元', p * k, 'answer')] }); }
  { const k = int(rand, 4, 9), q = int(rand, 2, 6), r = int(rand, 1, k - 1);
    items.push({ id: n(6), type: 'share', prompt: `${k * q + r} 顆粽子平分給 ${k} 戶鄰居。每戶幾顆？剩幾顆？`, steps: [num('q', '每戶幾顆', q, 'answer'), num('r', '剩幾顆', r, 'part')] }); }
  for (const k of [7, 8]) { const c = k === 7 ? int(rand, 4, 8) : int(rand, 20, 45), q = int(rand, 2, 9), r = int(rand, 1, c - 1), t = c * q + r;
    items.push({ id: n(k), type: 'howmany', prompt: k === 7 ? `${t} 位家長來參觀，一張長椅坐 ${c} 人。至少要幾張長椅？` : `${t} 位同學搭電梯，一次最多 ${c} 人。至少要搭幾趟？`, steps: [num('q', '商是多少', q, 'measure'), num('need', k === 7 ? '至少要幾張長椅' : '至少要搭幾趟', q + 1, 'answer')] }); }
  { let a, b, ua, ub; do { a = int(rand, 2, 5); b = int(rand, 8, 15); ua = int(rand, 10, 25); ub = ua + pick(rand, [-2, -1, 1, 2]); } while (ub < 5);
    items.push({ id: n(9), type: 'better', prompt: `水餃小包 ${a} 盒 ${a * ua} 元，大包 ${b} 盒 ${b * ub} 元。哪一種一盒比較便宜？`, steps: [num('ua', '小包一盒多少元', ua, 'measure'), num('ub', '大包一盒多少元', ub, 'part'), fixedChoice('which', '哪一種一盒比較便宜', ua < ub ? '小包' : '大包', ['小包', '大包'])] }); }
  { const k = int(rand, 20, 30), p = int(rand, 15, 30), e = int(rand, 100, 300), tot = k * p + e, B = Math.ceil(tot / 100) * 100 + (k0 === 1 ? -100 : 0);
    items.push({ id: n(10), type: 'budget', prompt: `班上 ${k} 人去看表演，門票每人 ${p} 元，車費一共 ${e} 元。班費 ${B} 元，夠不夠？`, steps: [num('tot', '一共要多少元', tot, 'measure'), fixedChoice('ok', '夠不夠', B >= tot ? '夠' : '不夠', ['夠', '不夠'])] }); }
  return { id, items };
}

const SETS = [
  ['addsub', 'intAddsubProbe', '整數小測驗：加減（一到三年級）', addsubForm, 51],
  ['muldiv', 'intMuldivProbe', '整數小測驗：乘除（二到四年級）', muldivForm, 61],
  ['word', 'intWordProbe', '整數小測驗：應用題（二到五年級）', wordForm, 71],
  ['life', 'intLifeProbe', '整數小測驗：算數小幫手（生活應用）', lifeForm, 81]
];
for (const [variant, id, title, make, seed] of SETS) {
  const forms = ['A', 'B', 'C'].map((fid, k) => make(fid, seeded(seed * 100 + k), k));
  const set = { id, version: '1', kind: 'probe', package: 'int', variant, title, itemSecs: 150, totalSecs: 1500, forms };
  fs.writeFileSync(new URL(`../scenarios/int-${variant}-probe.json`, import.meta.url), JSON.stringify(set, null, 2) + '\n');
  console.log(`scenarios/int-${variant}-probe.json`, forms.map(f => f.items.length).join('/'));
}

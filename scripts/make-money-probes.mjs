// 第 36 版：錢幣與購物的三份探試題組（數錢付錢 pay、找錢購物 shop、理財 finance），各 3 份等值複本、每份 10 題。
// 用法：node scripts/make-money-probes.mjs → scenarios/money-pay-probe.json、money-shop-probe.json、money-finance-probe.json
// 題型比例依 public/content-money.js 的 PROBE_VARIANTS；數字用固定種子產生，重新執行結果一樣。
// 數字範圍照課綱：一年級錢幣 1、5、10、50、100 元（100 元以內）；二年級加 500、1000 元，估算到百位；找錢的減法只退位一次。
// 情境和網站上的活動不同（沒教過的新情境），才看得出類化。人名、店名都是虛構的。
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
const unit = d => d >= 100 ? '張' : '個';
const say = c => Object.entries(c).filter(([, k]) => k).sort((a, b) => b[0] - a[0]).map(([d, k]) => `${k} ${unit(+d)} ${d} 元`).join('、');
const total = c => Object.entries(c).reduce((s, [d, k]) => s + d * k, 0);
const greedy = (n, den = [1000, 500, 100, 50, 10, 5, 1]) => { const c = {}; for (const d of den) { c[d] = Math.floor(n / d); n %= d; } return c; };
const pieces = c => Object.values(c).reduce((s, k) => s + k, 0);

// ---------- 數錢付錢 ----------
function payForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`, who = ['小晴', '阿哲', '小芸'][k0];
  // 數錢：一年級 100 元以內，第 3 題有 100 元
  { const c = { 10: int(rand, 2, 6), 1: int(rand, 2, 8) };
    items.push({ id: n(1), type: 'count', prompt: `${who}的口袋裡有 ${say(c)}。一共幾元？`, steps: [num('big', '10 元的一共幾元', c[10] * 10, 'measure'), num('ans', '一共幾元', total(c), 'answer')] }); }
  { const c = { 50: 1, 10: int(rand, 1, 3), 5: 1, 1: int(rand, 1, 4) };
    items.push({ id: n(2), type: 'count', prompt: `撲滿倒出來有 ${say(c)}。一共幾元？`, steps: [num('big', '50 元和 10 元一共幾元', 50 + c[10] * 10, 'measure'), num('ans', '一共幾元', total(c), 'answer')] }); }
  { const c = { 100: 1, 50: 1, 10: int(rand, 1, 4), 1: int(rand, 1, 6) };
    items.push({ id: n(3), type: 'count', prompt: `紅包袋裡有 ${say(c)}。一共幾元？`, steps: [num('big', '100 元和 50 元一共幾元', 150, 'measure'), num('ans', '一共幾元', total(c), 'answer')] }); }
  // 換錢
  { const [a, b] = [[50, 10], [100, 10], [10, 5], [50, 5], [100, 50], [10, 1]][(k0 * 2 + int(rand, 0, 1)) % 6];
    items.push({ id: n(4), type: 'trade', prompt: `1 ${unit(a)} ${a} 元，可以換幾個 ${b} 元？`, steps: [num('ans', `可以換幾個 ${b} 元`, a / b, 'answer')] }); }
  // 數大錢（二年級）
  for (const k of [5, 6]) { const c = k === 5 ? { 1000: int(rand, 1, 3), 100: int(rand, 1, 6) } : { 1000: 1, 500: 1, 100: int(rand, 1, 4), 10: int(rand, 1, 5) };
    const big = k === 5 ? c[1000] * 1000 : 1500;
    items.push({ id: n(k), type: 'countbig', prompt: `${k === 5 ? '舅舅的皮夾' : '班級的旅行基金'}裡有 ${say(c)}。一共幾元？`, steps: [num('big', k === 5 ? '1000 元的一共幾元' : '1000 元和 500 元一共幾元', big, 'measure'), num('ans', '一共幾元', total(c), 'answer')] }); }
  // 估算到百位（避開後兩位剛好 50）
  { let p; do p = int(rand, 120, 880); while (Math.abs(p % 100 - 50) < 8 || p % 100 === 0);
    const thing = pick(rand, ['一雙拖鞋', '一個保溫杯', '一盒彩色筆', '一個書包']);
    items.push({ id: n(7), type: 'estimate', prompt: `${thing} ${p} 元。大約是幾百元？`, steps: [num('near', '大約是幾百元', Math.round(p / 100) * 100, 'answer')] }); }
  // 剛好付：先拿 50 元，再拿 10 元和 1 元
  for (const k of [8, 9]) { let p; do p = int(rand, 71, 98); while (p % 10 === 0 || p % 10 === 5);
    const rest = p - 50, t = Math.floor(rest / 10), o = rest % 10;
    items.push({ id: n(k), type: 'exact', prompt: `${k === 8 ? '文具店的膠水' : '早餐店的蛋餅加豆漿'}要 ${p} 元。要剛好付，已經先拿 1 個 50 元。`,
      steps: [num('rest', '還要再付幾元', rest, 'measure'), choice(rand, 'set', '還要再拿哪些錢', `${t} 個 10 元、${o} 個 1 元`, [`${t - 1} 個 10 元、${o} 個 1 元`, `${t} 個 10 元、${o + 1} 個 1 元`, `${o} 個 10 元、${t} 個 1 元`].filter(x => x !== `${t} 個 10 元、${o} 個 1 元`))] }); }
  // 錢幣用最少
  { let p; do p = int(rand, 61, 99); while (p % 5 === 0); const g = greedy(p, [50, 10, 5, 1]);
    items.push({ id: n(10), type: 'fewest', prompt: `要付 ${p} 元，可以用 50 元、10 元、5 元、1 元。錢幣最少要用幾個？`, steps: [fixedChoice('top', '先拿哪一種', '50 元', ['50 元', '10 元', '5 元', '1 元'], 'part'), num('ans', '最少幾個', pieces(g), 'answer')] }); }
  return { id, items };
}

// ---------- 找錢購物 ----------
function shopForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  const BUY = [['一瓶麥茶', 15, 45], ['一包海苔', 21, 46], ['一枝螢光筆', 12, 39], ['一個髮夾', 23, 48], ['一顆飯糰', 25, 42], ['一包衛生紙', 18, 44], ['一個削鉛筆機', 31, 47], ['一盒蠟筆', 52, 89], ['一個便當', 61, 95]];
  // 往上數找錢
  for (const k of [1, 2, 3]) { const [thing, lo, hi] = BUY[(k0 * 3 + k - 1) % BUY.length], bill = hi < 50 ? 50 : 100; let p; do p = int(rand, lo, hi); while (p % 10 === 0);
    const up = Math.ceil(p / 10) * 10;
    items.push({ id: n(k), type: 'countup', prompt: `買${thing} ${p} 元，付 ${bill} 元。店員往上數找錢。要找幾元？`, steps: [num('to', '先往上數到幾元（整十）', up, 'measure'), num('ch', '要找幾元', bill - p, 'answer')] }); }
  // 算找錢（減法只退位一次）
  for (const k of [4, 5]) { const bill = k === 4 ? 500 : 1000; let p; do p = int(rand, bill === 500 ? 12 : 30, bill === 500 ? 48 : 95) * 10; while (borrows(bill, p) > 1 || p >= bill);
    const thing = k === 4 ? pick(rand, ['一雙襪子和手套', '一組桌遊', '一個便當袋']) : pick(rand, ['一台電風扇', '一雙球鞋', '一個行李袋']);
    items.push({ id: n(k), type: 'change', prompt: `買${thing}，一共 ${p} 元，付 1 張 ${bill} 元。要找多少元？`, steps: [choice(rand, 'op', '算式', `${bill} － ${p}`, [`${bill} ＋ ${p}`, `${p} － ${bill}`], 'part'), num('ch', '要找多少元', bill - p, 'answer')] }); }
  // 點找錢
  { let p; do p = int(rand, 52, 88); while (p % 5 === 0); const ch = 100 - p, kind = ['ok', 'short', 'over'][k0], got = ch + (kind === 'ok' ? 0 : kind === 'short' ? -5 : 5);
    items.push({ id: n(6), type: 'check', prompt: `買一份鍋燒麵 ${p} 元，付 100 元。店員找回 ${say(greedy(got, [50, 10, 5, 1]))}。`, steps: [num('should', '應該找幾元', ch, 'measure'), num('got', '店員找了幾元', got, 'part'), fixedChoice('ok', '找得對不對', { ok: '找對了', short: '少找了', over: '多找了' }[kind], ['找對了', '少找了', '多找了'])] }); }
  // 錢夠不夠
  for (const k of [7, 8]) { const c = k === 7 ? { 50: int(rand, 1, 2), 10: int(rand, 2, 5), 1: int(rand, 0, 4) } : { 100: int(rand, 1, 3), 10: int(rand, 2, 8) }; const have = total(c);
    const ok = (k0 + k) % 2 === 0, p = ok ? have - int(rand, 1, 9) : have + int(rand, 1, 9);
    items.push({ id: n(k), type: 'enough', prompt: `錢包裡有 ${say(c)}。想買 ${p} 元的${k === 7 ? '盆栽' : '風箏'}，錢夠不夠？`, steps: [num('have', '錢包裡一共幾元', have, 'measure'), fixedChoice('ok', '錢夠不夠', ok ? '夠' : '不夠', ['夠', '不夠'])] }); }
  // 買兩樣
  { let a, b; do { a = int(rand, 12, 45); b = int(rand, 12, 45); } while (a + b > 95 || (a + b) % 10 === 0);
    items.push({ id: n(9), type: 'two', prompt: `在麵包店買菠蘿麵包 ${a} 元和牛奶 ${b} 元，付 100 元。要找多少元？`, steps: [num('tot', '兩樣一共多少元', a + b, 'measure'), num('ch', '要找多少元', 100 - a - b, 'answer')] }); }
  { const ok = k0 !== 1; let a, b; do { a = int(rand, 120, 380); b = int(rand, 120, 380); } while (a % 10 || b % 10 || (ok ? a + b > 500 : a + b <= 500));
    items.push({ id: n(10), type: 'two', prompt: `帶 1 張 500 元去買一件 T 恤 ${a} 元和一頂帽子 ${b} 元。錢夠不夠？`, steps: [num('tot', '兩樣一共多少元', a + b, 'measure'), fixedChoice('ok', '錢夠不夠', ok ? '夠' : '不夠', ['夠', '不夠'])] }); }
  return { id, items };
}

// ---------- 理財 ----------
// 和網站 7-1 的情境不重複（網站用過鉛筆、雨傘、牙刷、外套、午餐、作業簿、玩具車、貼紙、糖果、遊戲點數）
const NW = [['球鞋破了一個洞，明天體育課要跑步。買新球鞋', 'need'], ['已經有一個水壺，看到新的卡通水壺', 'want'], ['眼鏡摔壞了，看不清楚黑板。修眼鏡', 'need'], ['同學都在玩新的卡牌，也想買一包', 'want'], ['天氣很熱，忘了帶水，口很渴。買一瓶水', 'need'], ['玩具店有會發光的陀螺', 'want']];
function financeForm(id, rand, k0) {
  const items = [], n = k => `${id}${p2(k)}`;
  for (const k of [1, 2]) { const [t, a] = NW[k0 * 2 + k - 1];
    items.push({ id: n(k), type: 'needwant', prompt: `${t}。這是需要還是想要？`, steps: [fixedChoice('life', '沒有它，生活會不會有問題', a === 'need' ? '會' : '不會', ['會', '不會'], 'part'), fixedChoice('ans', '需要還是想要', a === 'need' ? '需要' : '想要', ['需要', '想要'])] }); }
  for (const k of [3, 4]) { const B = k === 3 ? 100 : 200, need = k === 3 ? int(rand, 45, 75) : int(rand, 90, 150), ok = (k0 + k) % 2 === 1, left = B - need, want = ok ? left - int(rand, 1, Math.min(10, left - 1)) : left + int(rand, 1, 15);
    const [nt, wt] = k === 3 ? ['午餐', '鑰匙圈'] : ['作業簿', '漫畫書'];
    items.push({ id: n(k), type: 'budget', prompt: `只有 ${B} 元。先買需要的${nt} ${need} 元，還想買 ${want} 元的${wt}。`, steps: [num('left', `買了${nt}還剩幾元`, left, 'measure'), fixedChoice('can', `還買得起${wt}嗎`, ok ? '買得起' : '買不起', ['買得起', '買不起'])] }); }
  { const per = pick(rand, [10, 20, 30]), have = per * int(rand, 1, 3), w = int(rand, 3, 6), price = have + per * w;
    items.push({ id: n(5), type: 'wait', prompt: `想買 ${price} 元的拼圖，現在有 ${have} 元，每週存 ${per} 元。要再存幾週才買得起？`, steps: [num('need', '還差幾元', price - have, 'measure'), num('wk', '要再存幾週', w, 'answer')] }); }
  { const d = pick(rand, [5, 10]), days = pick(rand, [7, 10, 14]);
    items.push({ id: n(6), type: 'piggy', prompt: `每天放 ${d} 元進存錢筒，放了 ${days} 天。存錢筒裡有幾元？`, steps: [fixedChoice('how', '用什麼方法數', `${d} 元 ${d} 元數`, [`${d} 元 ${d} 元數`, '1 元 1 元數'], 'part'), num('ans', '一共幾元', d * days, 'answer')] }); }
  { const b0 = int(rand, 3, 9) * 100 + pick(rand, [0, 50]), dep = int(rand, 1, 5) * 100;
    items.push({ id: n(7), type: 'passbook', prompt: `存摺最後一行的結存是 ${b0} 元。今天存入 ${dep} 元。`, steps: [fixedChoice('dir', '錢變多還是變少', '變多', ['變多', '變少'], 'part'), num('bal', '新的結存是幾元', b0 + dep, 'answer')] }); }
  { const b0 = int(rand, 8, 15) * 100, out = int(rand, 2, 6) * 100;
    items.push({ id: n(8), type: 'passbook', prompt: `存摺最後一行的結存是 ${b0} 元。今天提出 ${out} 元。`, steps: [fixedChoice('dir', '錢變多還是變少', '變少', ['變多', '變少'], 'part'), num('bal', '新的結存是幾元', b0 - out, 'answer')] }); }
  { const s = int(rand, 10, 20) * 10, a = int(rand, 15, 45), g = pick(rand, [20, 50]), b = int(rand, 10, 30);
    items.push({ id: n(9), type: 'ledger', prompt: `記帳本：本來有 ${s} 元。買文具花 ${a} 元，奶奶給 ${g} 元，買點心花 ${b} 元。`, steps: [num('mid', '買了文具還剩幾元', s - a, 'measure'), num('now', '現在有幾元', s - a + g - b, 'answer')] }); }
  { const pocket = pick(rand, [50, 80, 100]), save = pick(rand, [20, 30, 40].filter(x => x < pocket)), w = int(rand, 4, 8);
    items.push({ id: n(10), type: 'plan', prompt: `每週零用錢 ${pocket} 元，每週存 ${save} 元，想存到 ${save * w} 元買球拍。`, steps: [num('spend', '每週還可以花幾元', pocket - save, 'part'), num('wk', '要存幾週', w, 'answer')] }); }
  return { id, items };
}

const SETS = [
  ['pay', 'moneyPayProbe', '錢幣小測驗：數錢、付錢（一、二年級）', payForm, 91],
  ['shop', 'moneyShopProbe', '錢幣小測驗：找錢、購物（一、二年級）', shopForm, 92],
  ['finance', 'moneyFinanceProbe', '錢幣小測驗：理財（想要需要、存提款、記帳）', financeForm, 93]
];
for (const [variant, id, title, make, seed] of SETS) {
  const forms = ['A', 'B', 'C'].map((fid, k) => make(fid, seeded(seed * 100 + k), k));
  const set = { id, version: '1', kind: 'probe', package: 'money', variant, title, itemSecs: 150, totalSecs: 1500, forms };
  fs.writeFileSync(new URL(`../scenarios/money-${variant}-probe.json`, import.meta.url), JSON.stringify(set, null, 2) + '\n');
  console.log(`scenarios/money-${variant}-probe.json`, forms.map(f => f.items.length).join('/'));
}

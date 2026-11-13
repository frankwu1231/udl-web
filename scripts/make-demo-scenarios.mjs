// 第 26 版：產生「示範用」標準化紀錄情境組（模擬紀錄，依決策規則編製），格式和網站的研究紀錄一樣。
// 正式探試請用第一年去識別化紀錄改編的情境；這一組只用來試網站與前導測試。
// 用法：node scripts/make-demo-scenarios.mjs > scenarios/demo-set.json
const STEPS = ['看題目', '點格子或操作圖形', '找底或第一個邊長', '找高或第二個邊長', '列算式', '計算並比一比', '寫單位'];
const OBS = ['countShort', 'eqPerimeter', 'swapped', 'eqSum', 'unitLength', 'offByOne'];
// 每節：items 完成題數、third 用到第 3 層提示的題數、firstOk 第一次就對的步驟比例（0～1）
function session(no, { items, third, firstOk, obs = OBS }) {
  const events = [], pad = n => String(n).padStart(2, '0');
  let t = 0, k = 0;
  const time = () => { t += 7; return `2026-09-${pad(no)} 10:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`; };
  const row = (cycle, step, event, extra = {}, detail = {}) => events.push({ sheet: '操作紀錄', time: time(), activity: '長方形', actId: 'rectangle', cycle, step, stepTitle: step ? STEPS[step - 1] : '', event, mode: 'self', correct: extra.correct ?? '', hintLevel: extra.hintLevel ?? '', detail: JSON.stringify(detail) });
  const totalSteps = items * STEPS.length, okSteps = Math.round(totalSteps * firstOk);
  for (let q = 1; q <= items; q++) {
    let maxHint = 0, errors = 0;
    const useThird = q <= third;
    for (let s = 1; s <= STEPS.length; s++) {
      const ok = k < okSteps; k++;
      if (ok) { row(q, s, '步驟檢核', { correct: '是', hintLevel: 0 }, { outcome: 'correct', firstTry: true }); continue; }
      const code = obs[(q + s) % obs.length];
      row(q, s, '步驟檢核', { correct: '否', hintLevel: 0 }, { outcome: 'wrong', obs: code, firstTry: true }); errors++;
      row(q, s, '自動提示', { hintLevel: 1 }); maxHint = Math.max(maxHint, 1);
      if (useThird && maxHint < 3) { row(q, s, '請求提示', { hintLevel: 2 }); row(q, s, '請求提示', { hintLevel: 3 }); maxHint = 3; }
      row(q, s, '步驟檢核', { correct: '是', hintLevel: maxHint }, { outcome: 'correct', firstTry: false });
    }
    if (useThird && maxHint < 3) { row(q, 7, '請求提示', { hintLevel: 3 }); maxHint = 3; }
    row(q, 7, '整題完成', { hintLevel: maxHint }, { maxHintLevel: maxHint, errors });
  }
  return { no, events };
}
const seven = list => list.map((p, i) => session(i + 1, p));
const same = (n, p) => Array.from({ length: n }, () => p);
const set = {
  id: 'demo', version: '1', title: '示範情境組（模擬紀錄）',
  scenarios: [
    { id: 'S1', title: '情境 1', act: 'rectangle', settings: { support: 'full', mode: 'together' }, sessions: seven(same(7, { items: 6, third: 3, firstOk: 0.4 })) },
    { id: 'S2', title: '情境 2', act: 'rectangle', settings: { support: 'full', mode: 'together' }, sessions: seven(same(7, { items: 6, third: 0, firstOk: 0.6 })) },
    { id: 'S3', title: '情境 3', act: 'rectangle', settings: { support: 'faded', mode: 'self' }, sessions: seven([...same(2, { items: 6, third: 2, firstOk: 0.7 }), ...same(5, { items: 6, third: 0, firstOk: 0.9 })]) },
    { id: 'S4', title: '情境 4', act: 'rectangle', settings: { support: 'full', mode: 'self' }, sessions: seven([{ items: 6, third: 2, firstOk: 0.7 }, { items: 4, third: 1, firstOk: 0.7 }, ...same(5, { items: 6, third: 2, firstOk: 0.7 })]) },
    { id: 'S5', title: '情境 5', act: 'rectangle', settings: { support: 'faded', mode: 'self' }, sessions: seven([...same(3, { items: 6, third: 2, firstOk: 0.7 }), ...same(4, { items: 6, third: 4, firstOk: 0.4 })]) }
  ]
};
process.stdout.write(JSON.stringify(set) + '\n');

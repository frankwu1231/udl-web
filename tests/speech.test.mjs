// 第 38 版：朗讀的讀音修正與語音選擇（speech.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read('zhuyin.js'), ctx);
vm.runInContext(read('speech.js'), ctx);
const { fix, score } = ctx.window.speech;

test('破音字朗讀前換成同音字，畫面字數不變', () => {
  const cases = {
    '數一數有幾格': '暑一暑有幾格', '量一量教室的長': '良一良教室的長', '從 0 往上數': '從 0 往上暑',
    '一個一個數出來': '一個一個暑出來', '多了要還給店員': '多了要環給店員', '去銀行存錢': '去銀航存錢',
    '我長高了嗎': '我掌高了嗎', '種得下嗎': '眾得下嗎', '空一格': '控一格', '每天睡覺的時數': '每天睡叫的時數',
    '樂高': '勒高', '得到幾張': '德到幾張', '就種不下。': '就眾不下。'
  };
  for (const [a, b] of Object.entries(cases)) { assert.equal(fix(a), b, a); assert.equal(fix(a).length, a.length); }
});

test('預設讀音或名詞的「數、量、長」不亂換', () => {
  for (const s of ['數字', '數學', '糖的數量', '長方形', '排成長方形', '倍數', '重量', '很重', '因數有幾個', '我卡住了', 'Hello 123', '',
    // 第 38 版第 2 輪（Codex 複測）：能力補語「看得到」的得讀輕聲；名詞「3 種不一樣」的種
    '縱軸要畫得到最大的數。', '6 個面都看得到。', '走得到，可是還沒辦完', '又辦得到？', '就找得到公倍數', '一定碰得到', '排出 3 種不一樣的長方形。'])
    assert.equal(fix(s), s, s);
});

test('語音優先台灣國語的自然語音', () => {
  const v = (name, lang) => ({ name, lang });
  const list = [v('Google 普通话（中国大陆）', 'zh-CN'), v('Microsoft Hanhan', 'zh-TW'), v('Microsoft HsiaoChen Online (Natural)', 'zh-TW'), v('Samantha', 'en-US')];
  const best = list.slice().sort((a, b) => score(b) - score(a))[0];
  assert.equal(best.name, 'Microsoft HsiaoChen Online (Natural)');
  assert.ok(score(v('Mei-Jia', 'zh-TW')) > score(v('Google 普通话（中国大陆）', 'zh-CN')));
  assert.equal(score(v('Samantha', 'en-US')), -1);
});

test('所有朗讀都經過共用的讀音修正', () => {
  for (const f of ['seven.js', 'research.js', 'probe.js', 'buddy.js', 'tutor.js', 'step-demo.js'])
    for (const line of read(f).split('\n').filter(l => l.includes('new SpeechSynthesisUtterance(')))
      assert.match(line, /speech|sayFix/, f + ' 有朗讀沒有經過讀音修正');
  for (const p of ['seven.html', 'probe.html']) assert.match(read(p), /zhuyin\.js[^>]*><\/script><script src="speech\.js/, p + ' 要載入 speech.js');
});

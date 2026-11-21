// 第 25 版：學生頁會出現的國字都要有注音（「周」「估」「鋪」曾經沒有）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8');
const files = ['seven.js', 'act-core.js', 'act-unit12.js', 'act-unit3.js', 'act-unit45.js', 'lesson-content.js', 'learning-flow.js', 'buddy.js', 'step-demo.js', 'research.js', 'seven.html', 'tutor.js', 'probe.js', 'act-factor.js', 'act-factor2.js', 'content-factor.js', 'act-time.js', 'act-time2.js', 'act-time3.js', 'content-time.js', 'act-frac.js', 'act-frac2.js', 'act-frac3.js', 'act-frac4.js', 'content-frac.js', 'act-life.js', 'act-life2.js', 'content-area.js', 'content-surface.js', 'content-line.js', 'act-int.js', 'act-int2.js', 'act-int3.js', 'act-int4.js', 'content-int.js', 'act-money.js', 'act-money2.js', 'act-money3.js', 'content-money.js'];

test('學生頁用到的國字，注音讀音表都有', () => {
  const chars = read('zhuyin.js').match(/const CHARS = '([^']*)'/)[1];
  const have = new Set(chars.split(' ').filter(Boolean).map(e => e[0]));
  const missing = new Set();
  for (const f of files) {
    const text = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');   // 不看程式註解
    for (const ch of text.match(/[一-鿿]/g) || []) if (!have.has(ch)) missing.add(ch);
  }
  assert.deepEqual([...missing], [], '沒有注音的字：' + [...missing].join(''));
});

// 第 36 版第 2 輪：字表分段相接時漏了空白，讀音會黏到下一個字（「伴ㄅㄢˋ板ㄅㄢˇ」）
test('注音字表每一筆的讀音都只有注音，沒有黏到國字', () => {
  const src = read('zhuyin.js'), i = src.indexOf('const CHARS'), body = src.slice(i, src.indexOf("';", i) + 2);
  const all = body.replace(/\/\/[^\n]*/g, '').replace(/'\s*\+\s*'/g, '').match(/'([^']*)'/)[1];
  const bad = all.split(' ').filter(Boolean).filter(e => /[一-鿿]/.test(e.slice(1)));
  assert.deepEqual(bad, []);
});

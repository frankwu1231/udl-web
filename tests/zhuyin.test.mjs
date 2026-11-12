// 第 25 版：學生頁會出現的國字都要有注音（「周」「估」「鋪」曾經沒有）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL('../public/' + f, import.meta.url), 'utf8');
const files = ['seven.js', 'act-core.js', 'act-unit12.js', 'act-unit3.js', 'act-unit45.js', 'lesson-content.js', 'learning-flow.js', 'buddy.js', 'step-demo.js', 'research.js', 'seven.html', 'tutor.js', 'probe.js'];

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

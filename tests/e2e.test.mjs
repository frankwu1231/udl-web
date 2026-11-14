// 端對端測試：用真的瀏覽器操作學生頁與教師頁（第 16 版）。
// 需要 Playwright；沒有安裝時自動略過。可用 PLAYWRIGHT_MODULE 指定 playwright 的 index.mjs 路徑。
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

let chromium = null;
try { ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch { /* 略過 */ }
const skip = chromium ? false : '沒有安裝 Playwright，略過瀏覽器測試';
const distReady = fs.existsSync(new URL('../dist/server/index.js', import.meta.url));

let server, base, browser;
const rows = new Map();
async function setup() {
  if (server) return;
  const worker = (await import('../dist/server/index.js')).default;
  const { makeD1 } = await import('../scripts/d1-sqlite.mjs');
  const env = { TEACHER_EMAIL: 'preview@example.test', DB: makeD1(), TEST_SESSION_SECRET: 'e2e-session-secret-for-class-codes', TEST_PASSWORD: 'e2e-pass' };
  server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const headers = new Headers(req.headers); headers.set('oai-authenticated-user-id', 'local'); headers.set('oai-authenticated-user-email', 'preview@example.test');
    const request = new Request(base + req.url, { method: req.method, headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
    const r = await worker.fetch(request, env);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
}
test.after(async () => { await browser?.close(); server?.close(); });

async function publish(settings) {
  const page = await browser.newPage(); await page.goto(base + '/teacher.html');
  const status = await page.evaluate(async s => {
    const r = await (await fetch('/api/teacher/lessons')).json(); const c = r.draft || r.published;
    const map = s.__map || {}; delete s.__map;
    if (s.__research) c.research = s.__research; else delete c.research; delete s.__research;   // 第 22 版：現場試用紀錄只在指定的測試開啟
    for (const k of ['rectangle', 'square', 'triangle', 'parallelogram']) c[k].settings = { ...c[k].settings, ...s };
    for (const k of Object.keys(c.activities || {})) c.activities[k].settings = { ...c.activities[k].settings, ...s };
    c.map = { assigned: window.areaActs.packages[map.pkg || 'area'].activities.map(a => a.id), sequential: false, path: 'all', ...map };
    return (await fetch('/api/teacher/lessons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'published', config: c }) })).status;
  }, { flow: 'seven', keep: [0, 1, 2, 3], support: 'full', labels: 'reveal', ai: true, reward: false, sound: false, hintGate: false, mode: 'self', goalKind: 'hints', confidence: true, selfAsk: true, badges: true, voice: false, rest: 0, handsOn: false, methods: ['mark', 'row', 'self'], zhuyin: false, textSize: 'normal', contrast: false, video: 'hint', difficulty: 'standard', convert: false, srlAsk: 'first', lessonGoal: 0, stepNames: {}, attention: false, ...settings });
  await page.close(); assert.equal(status, 200);
}
async function student(shape, settings = {}, viewport = { width: 820, height: 1180 }, opts = {}) {
  await setup(); await publish(settings);
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  if (opts.clock) await page.clock.install();   // 第 22 版：小幫手要等幾十秒，用假時鐘快轉
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(`${base}/seven.html?shape=${shape}`); await page.waitForSelector('#start');
  const p = {
    page, errors,
    choose: (k, v) => page.click(`[data-choice="${k}"][data-value="${v}"]`),
    check: async () => { await page.click('#check'); await page.waitForTimeout(80); },
    next: async () => { await page.click('#next'); await page.waitForTimeout(80); },
    text: sel => page.evaluate(s => document.querySelector(s)?.innerText ?? '', sel),
    start: async (method = 'mark', goal = 'any') => { if (await page.$('[data-choice="target"]')) await p.choose('target', 'inside'); if (await page.$('[data-choice="goal"]')) await p.choose('goal', goal); if (await page.$('[data-choice="confidence"]')) await p.choose('confidence', 'mid'); await p.choose('method', method); await page.click('#start'); await page.waitForTimeout(80); }
  };
  return p;
}

test('提示一層一層增加：錯誤回饋具體、第 2 層閃爍並出現問 AI、最多 3 層', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle'); await p.start();
  await p.choose('target', 'border'); await p.check();
  assert.match(await p.text('#feedback0'), /量邊有多長/);
  assert.match(await p.text('#hintText0'), /提示 1／3/);
  assert.equal(await p.page.$('#aiHint0'), null);
  await p.choose('target', 'corner'); await p.check();
  assert.match(await p.text('#feedback0'), /數角/);
  assert.match(await p.text('#hintText0'), /提示 2／3/);
  assert.ok(await p.page.$('.pulse-fill')); assert.ok(await p.page.$('#aiHint0'));
  await p.check(); await p.check();
  assert.match(await p.text('#hintText0'), /提示 3／3/);
  assert.ok(await p.page.$eval('#hint0', b => b.disabled));
  assert.ok(await p.page.$eval('#next', b => b.classList.contains('locked')));
  await p.choose('target', 'inside'); await p.check();
  assert.match(await p.text('#feedback0'), /答對了/);
  assert.equal(await p.page.$('.pulse-fill'), null, '答對後停止閃爍');
  assert.deepEqual(p.errors, []);
});

test('選項有 3 個、每次隨機、同一題重畫時位置不變', { skip: skip || !distReady }, async () => {
  const orders = new Set();
  for (let i = 0; i < 8; i++) {
    const p = await student('triangle'); await p.start();
    const order = () => p.page.$$eval('[data-choice="target"]', bs => bs.map(b => b.dataset.value).join());
    const first = await order(); assert.equal(first.split(',').length, 3); orders.add(first);
    await p.choose('target', 'border'); await p.check();
    assert.equal(await order(), first);
    await p.page.context().close();
  }
  assert.ok(orders.size > 1);
});

test('數格子：格子內出現點的順序，不顯示即時總數；答錯時指出沒點到', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle'); await p.start();
  await p.choose('target', 'inside'); await p.check(); await p.next();
  assert.ok(await p.page.$('.tap-here'));
  for (const i of [0, 1, 2]) await p.page.click(`[data-tile="${i}"]`);
  assert.equal(await p.page.$eval('[data-tile="2"]', b => b.textContent), '3');
  assert.doesNotMatch(await p.text('.activity'), /已標記/);
  await p.page.fill('#count', '3'); await p.check();
  assert.match(await p.text('#feedback1'), /還有格子沒點到/);
});

test('三角形：第二片先出現在旁邊；比較題在操作後才出現；說明在答對後才出現；重看動畫不會取消通過', { skip: skip || !distReady }, async () => {
  const p = await student('triangle'); await p.start();
  await p.choose('target', 'inside'); await p.check(); await p.next();
  assert.equal(await p.page.$('[data-choice="relation"]'), null);
  await p.page.click('#transform');
  assert.match(await p.page.$eval('.drag-piece', g => g.getAttribute('transform')), /translate\(\d/);
  await p.page.click('#transform');
  assert.doesNotMatch(await p.text('.activity'), /一片是一半/);
  assert.equal(await p.page.$('[data-choice="relation"]'), null);   // 第 23 版：先數拼好的是幾片
  await p.choose('pieces', '1'); await p.check(); assert.match(await p.text('#feedback1'), /再數一次/);
  await p.choose('pieces', '2');
  await p.choose('relation', 'same'); await p.check();
  assert.match(await p.text('#feedback1'), /一片比較小/);
  await p.choose('relation', 'half'); await p.check();
  assert.match(await p.text('.activity'), /一片是一半/);
  await p.page.click('#replay');
  assert.ok(!(await p.page.$eval('#next', b => b.classList.contains('locked'))));
  await p.next(); assert.match(await p.text('h1'), /找底/);
});

test('長度要找到才顯示：點底才出現底的長度；選對高的線才出現高的長度，候選線不標長度', { skip: skip || !distReady }, async () => {
  const p = await student('parallelogram'); await p.start();
  await p.choose('target', 'inside'); await p.check(); await p.next();
  await p.page.click('#transform'); await p.page.click('#transform'); await p.choose('relation', 'same'); await p.check(); await p.next();
  assert.doesNotMatch(await p.text('#figure2'), /公分/);
  await p.page.fill('#first', '6'); await p.check();
  assert.match(await p.text('#feedback2'), /先點一下/);
  await p.page.click('#revealBase');
  assert.match(await p.page.$eval('#figure2 svg', s => s.textContent), /底 6 公分/);
  await p.check(); await p.next();
  const svgText = await p.page.$eval('#figure3 svg', s => s.textContent);
  assert.doesNotMatch(svgText, /高 \d/);
  const lines = await p.page.$$eval('#figure3 [data-line]', ls => ls.map(l => [l.dataset.line, l.getAttribute('stroke')]));
  assert.equal(lines.length, 3);
  const right = lines.find(l => l[1] === '#c2410c')[0], wrong = lines.find(l => l[1] === '#2157da')[0];
  await p.choose('height', wrong); await p.check();
  assert.match(await p.text('#feedback3'), /斜的邊/);
  await p.page.click(`#figure3 g.line-tag[data-line-hit="${right}"]`); await p.check();
  assert.match(await p.page.$eval('#figure3 svg', s => s.textContent), /高 4 公分/);
  await p.page.fill('#second', '4'); await p.check();
  assert.match(await p.text('#feedback3'), /答對了/);
});

test('列算式與計算：依選錯的算式給不同回饋；三角形忘了除以 2 會提醒；最後一步只選單位', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ flow: 'custom', keep: [] });
  const p = await student('triangle', { flow: 'custom', keep: [] }); await p.start();
  assert.equal(await p.page.$$eval('.step-meter .dot', d => d.length), 3);
  assert.match(await p.text('.progress'), /學習階段/);
  await p.choose('formula', 'product'); await p.page.fill('#a', '6'); await p.page.fill('#b', '4'); await p.check();
  assert.match(await p.text('#feedback4'), /兩片的面積/);
  await p.choose('formula', 'sum'); await p.check();
  assert.match(await p.text('#feedback4'), /用乘的/);
  await p.choose('formula', 'half'); await p.check(); await p.next();
  await p.page.fill('#total', '24'); await p.check();
  assert.match(await p.text('#feedback5'), /÷ 2/);
  await p.page.fill('#total', '12'); await p.check(); await p.next();
  assert.match(await p.text('.activity'), /你的答案：12/);
  assert.equal(await p.page.$('#final'), null);
  await p.choose('unit', 'cm'); await p.check();
  assert.match(await p.text('#feedback6'), /量長度/);
});

test('3 步精簡：規劃頁選要找什麼；第 2 頁是列式與計算、只有一張圖並直接顯示長度；回顧頁寫單位', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { flow: 'three' });
  await p.choose('target', 'border'); await p.choose('goal', 'any'); await p.choose('confidence', 'mid'); await p.choose('method', 'mark'); await p.page.click('#start');
  assert.match(await p.text('#planFeedback'), /量邊有多長/);
  await p.choose('target', 'inside'); await p.page.click('#start');
  assert.equal(await p.text('h1'), '算一算');
  assert.equal(await p.page.$$eval('.figure', f => f.length), 1);
  assert.equal(await p.page.$('[data-tile]'), null);
  assert.match(await p.page.$eval('.figure', f => f.textContent), /4 公分/);
  await p.choose('formula', 'product'); await p.page.fill('#a', '4'); await p.page.fill('#b', '2'); await p.page.fill('#total', '8'); await p.check(); await p.next();
  assert.match(await p.text('h1'), /寫單位/);
  await p.choose('unit', 'cm2'); await p.check();
  assert.match(await p.text('h1'), /完成了/);
});

test('看提示後要按「我看完了」才能作答；減少提示時可用乘法代替點格子', { skip: skip || !distReady }, async () => {
  const p = await student('square', { hintGate: true, support: 'faded' }); await p.start();
  assert.equal(await p.page.$('.cue'), null);
  await p.page.click('#hint0');
  assert.ok(await p.page.$eval('#check', b => b.disabled));
  assert.ok(await p.page.$eval('[data-choice="target"]', b => b.disabled));
  await p.page.click('#ackHint');
  assert.ok(!(await p.page.$eval('#check', b => b.disabled)));
  await p.choose('target', 'inside'); await p.check(); await p.next();
  await p.page.click('#useProduct'); await p.check();
  assert.match(await p.text('#feedback1'), /答對了/);
});

test('朗讀：全部朗讀包含選項；小喇叭只唸那一句並標色', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 } }); const page = await ctx.newPage();
  await page.addInitScript(() => { window.__u = []; Object.defineProperty(window, 'speechSynthesis', { value: { speaking: false, speak(u) { window.__u.push(u); setTimeout(() => u.onstart && u.onstart(), 5); }, cancel() {} } }); });
  await page.goto(`${base}/seven.html?shape=rectangle`); await page.waitForSelector('#start');
  await page.click('[data-choice="goal"][data-value="any"]'); await page.click('[data-choice="confidence"][data-value="mid"]'); await page.click('[data-choice="method"][data-value="mark"]'); await page.click('#start');
  await page.click('#read');
  for (let i = 0; i < 20; i++) { await page.evaluate(() => { const u = __u.at(-1); if (u && !u.done) { u.done = true; u.onend && u.onend(); } }); await page.waitForTimeout(15); }
  const all = await page.evaluate(() => __u.map(u => u.text));
  assert.ok(all.includes('圖形裡面的大小'), '選項要被唸出來');
  await page.evaluate(() => { __u.length = 0; });
  await page.click('.activity .lesson-prompt .say'); await page.waitForTimeout(30);
  assert.deepEqual(await page.evaluate(() => __u.map(u => u.text)), ['請算出這個長方形的面積是多少平方公分。']);
  assert.equal(await page.$$eval('.reading', e => e.length), 1);
});

test('教師觀察：摘要表與 CSV（中文欄位、英數檔名、學生選擇轉成文字）', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle'); await p.start();
  await p.choose('target', 'border'); await p.check();
  await p.page.click('#teacher');
  assert.match(await p.text('.stats'), /看題目\s+1\s+第 1 層/);
  const [d] = await Promise.all([p.page.waitForEvent('download'), p.page.click('#export')]);
  assert.match(d.suggestedFilename(), /^area-record_\d{4}-\d{2}-\d{2}_\d+\.csv$/);
  const csv = fs.readFileSync(await d.path(), 'utf8');
  assert.match(csv, /"時間","圖形","第幾題","步驟","事件","是否答對","錯在哪裡","提示層級","學生的選擇或內容"/);
  assert.match(csv, /"看題目","步驟檢核","否","要找什麼","0","沿著邊走一圈的長度"/);
});

test('教師備課：選難度立即換題、可套用到四種圖形、平行四邊形位移 0 不能儲存', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('#difficulty');
  await page.selectOption('#difficulty', 'easy');
  assert.deepEqual(await page.$$eval('[data-problem][data-key="a"]', i => i.map(x => x.value)), ['3', '4', '4']);
  await page.selectOption('#flow', 'three'); await page.uncheck('#ai'); await page.click('#applyAll');
  await page.selectOption('#shape', 'triangle');
  assert.equal(await page.inputValue('#flow'), 'three'); assert.equal(await page.isChecked('#ai'), false);
  await page.selectOption('#shape', 'parallelogram'); await page.fill('[data-problem="0"][data-key="offset"]', '0');
  await page.click('#saveDraft'); assert.match(await page.textContent('#status'), /位移/);
  await page.close();
});

test('教師可修改第 2、3 層提示，學生看到修改後的文字；列算式答對後出現口訣', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('[data-hint2="0"]');
  await page.fill('[data-hint2="0"]', '看藍色塗滿的地方。'); await page.selectOption('#rate', 'slow');
  await page.click('#publish'); await page.waitForTimeout(150); await page.close();
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 } }); const s = await ctx.newPage();
  await s.goto(`${base}/seven.html?shape=rectangle`); await s.waitForSelector('#start');
  await s.click('[data-choice="goal"][data-value="any"]'); await s.click('[data-choice="confidence"][data-value="mid"]'); await s.click('[data-choice="method"][data-value="mark"]');
  assert.match(await s.textContent('#app'), /沒有對錯/);
  await s.click('#start');
  await s.click('[data-choice="target"][data-value="border"]'); await s.click('#check'); await s.click('#check');
  assert.match(await s.textContent('#hintText0'), /看藍色塗滿的地方/);
  await s.click('[data-choice="target"][data-value="inside"]'); await s.click('#check'); await s.click('#next');
  for (let i = 0; i < 8; i++) await s.click(`[data-tile="${i}"]`);
  await s.fill('#count', '8'); await s.click('#check'); await s.click('#next');
  await s.fill('#first', '4'); await s.click('#check'); await s.click('#next');
  await s.fill('#second', '2'); await s.click('#check'); await s.click('#next');
  await s.click('[data-choice="formula"][data-value="product"]'); await s.fill('#a', '4'); await s.fill('#b', '2'); await s.click('#check');
  assert.match(await s.textContent('.activity'), /口訣：長方形：長乘寬/);
  await ctx.close();
});

test('教師觀察列出本次所有完成的題目', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ flow: 'custom', keep: [] });
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 } }); const s = await ctx.newPage();
  await s.goto(`${base}/seven.html?shape=square`); await s.waitForSelector('#start');
  await s.click('[data-choice="goal"][data-value="g1"]'); await s.click('[data-choice="confidence"][data-value="high"]'); await s.click('[data-choice="method"][data-value="self"]'); await s.click('#start');
  await s.click('[data-choice="formula"][data-value="sum"]'); await s.click('#check');
  await s.click('[data-choice="formula"][data-value="product"]'); await s.fill('#a', '3'); await s.fill('#b', '3'); await s.click('#check'); await s.click('#next');
  await s.fill('#total', '9'); await s.click('#check'); await s.click('#next');
  await s.click('[data-choice="unit"][data-value="cm2"]'); await s.click('#check'); await s.click('#next');
  await s.click('[data-choice="selfMet"][data-value="yes"]'); assert.match(await s.textContent('.goal-vs'), /用了 1 個提示.*達到目標/); await s.click('[data-choice="reason"][data-value="formula"]'); await s.click('[data-choice="nextMethod"][data-value="self"]'); await s.click('#new');
  await s.click('#teacher');
  const t = await s.textContent('#toolBody');
  assert.match(t, /本次所有題目/); assert.match(t, /正方形\s*1\s*自己做\s*1\s*列算式/); assert.match(t, /選對算式/);
  await ctx.close();
});

test('第 17 版修正：答對後提示收起、點完格子提示改變、先自己算可用乘法、比一比不算答錯、AI 回覆保留、換圖形保留紀錄', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle'); await p.start('self');
  await p.choose('target', 'border'); await p.check();
  assert.ok(await p.page.$('#hintText0:not([hidden])'));
  await p.choose('target', 'inside'); await p.check();
  assert.equal(await p.page.$('#hintText0:not([hidden])'), null, '答對後提示框收起');
  assert.equal(await p.page.$('#hint0'), null);
  await p.next();
  assert.ok(await p.page.$('#useProduct'), '選先自己算時可以用乘法');
  for (let i = 0; i < 7; i++) await p.page.click(`[data-tile="${i}"]`);
  await p.check();
  assert.match(await p.text('#hintText1'), /不要漏掉/);
  await p.page.click('[data-tile="7"]'); await p.page.waitForTimeout(80);
  assert.match(await p.text('#hintText1'), /格子都點完了/);
  await p.page.fill('#count', '8'); await p.check(); await p.next();
  await p.page.fill('#first', '4'); await p.check(); await p.next();
  await p.page.fill('#second', '2'); await p.check(); await p.next();
  await p.choose('formula', 'product'); await p.page.fill('#a', '4'); await p.page.fill('#b', '2'); await p.check(); await p.next();
  await p.page.fill('#total', '9'); await p.check(); await p.check();   // 第 23 版：算錯時才看提示
  await p.page.fill('#total', '8'); await p.check();
  assert.match(await p.text('#feedback5'), /答對了/, '第 23 版：算對就自動比對，不用再按比一比');
  assert.equal(await p.page.$('[data-choice="verify"]'), null);
  await p.page.click('#teacher');
  assert.match(await p.text('.stats'), /算一算、比一比\s+2/);
  await p.page.click('#closeTools');
  // AI 回覆在下一個動作後仍在
  await p.page.fill('#total', '9'); await p.check(); await p.check();
  await p.page.click('#aiHint5'); await p.page.waitForTimeout(150);
  assert.match(await p.text('#hintText5'), /AI 現在不能用/);
  await p.page.fill('#total', '8'); await p.page.waitForTimeout(50);
  assert.match(await p.text('#hintText5'), /AI 現在不能用/);
  // 換圖形後紀錄仍在
  const before = await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')).length);
  await p.page.goto(`${base}/seven.html?shape=square`); await p.page.waitForSelector('#start');
  await p.page.click('#teacher');
  // 第 26 版：還沒做完就換頁，會多記一筆「中途離開」
  assert.match(await p.text('#toolBody'), new RegExp(`目前 ${before + 1} 筆紀錄`));
  assert.equal(await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')).at(-1).event), '中途離開');
});

test('入門題組：長方形不出現正方形、正方形三題不重複', { skip: skip || !distReady }, async () => {
  await setup();
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('#difficulty');
  await page.selectOption('#difficulty', 'easy');
  assert.deepEqual(await page.$$eval('[data-problem][data-key="a"]', i => i.map(x => x.value)), ['3', '4', '4']);
  assert.deepEqual(await page.$$eval('[data-problem][data-key="b"]', i => i.map(x => x.value)), ['2', '2', '3']);
  await page.selectOption('#shape', 'square'); await page.selectOption('#difficulty', 'easy');
  assert.deepEqual(await page.$$eval('[data-problem][data-key="a"]', i => i.map(x => x.value)), ['2', '3', '4']);
  await page.close();
});

// ---------- 第 18 版 ----------
async function threeStep(p, side, { wrongFirst = false } = {}) {
  const page = p.page;
  if (wrongFirst) { await p.choose('formula', 'sum'); await p.check(); }
  await p.choose('formula', 'product'); await page.fill('#a', String(side)); await page.fill('#b', String(side));
  await page.fill('#total', String(side * side)); await p.check(); await p.next();
  await p.choose('unit', 'cm2'); await page.click('#check'); await page.waitForTimeout(80);
}

test('自我調整循環：數字目標與把握 → 目標和結果對照 → 自己判斷 → 找原因與建議 → 下一題帶著建議與章、看得到進步', { skip: skip || !distReady }, async () => {
  const p = await student('square', { flow: 'three', srlAsk: 'always' }), page = p.page;
  assert.match(await p.text('.srl-card'), /最多看幾個提示/);
  assert.deepEqual(await page.$$eval('[data-choice="confidence"]', b => b.map(x => x.dataset.value)), ['low', 'mid', 'high'], '把握的表情照順序');
  await p.choose('target', 'inside'); await page.click('#start');
  assert.match(await p.text('#planFeedback'), /目標.*有多少把握.*先怎麼做/);
  await p.start('self', 'g0');
  await threeStep(p, 3, { wrongFirst: true });
  assert.match(await p.text('.goal-vs'), /我的目標：0 個：我自己做；開始時：🙂 有一點把握/);
  await page.click('#new'); await page.waitForTimeout(60);
  assert.match(await p.text('#reflectFeedback'), /有沒有達到目標/);
  await p.choose('selfMet', 'yes'); await page.waitForTimeout(60);
  assert.match(await p.text('.goal-vs'), /用了 1 個提示.*還沒達到.*一起看一下/);   // 第 25 版：同頁空白的那一步不算錯，不自動給提示
  assert.ok(await page.$('[data-choice="cause"]'), '沒達到才問原因');
  await p.choose('cause', 'tooHigh'); await page.waitForTimeout(60);
  assert.match(await p.text('.goal-vs'), /目標定得剛剛好/);
  await p.choose('reason', 'formula'); await p.choose('nextMethod', 'self'); await page.click('#new'); await page.waitForTimeout(80);
  assert.match(await p.text('.carry'), /上一題得到：💡 會用提示、🗣️ 說出想法、⭐ 完成一題/);
  assert.match(await p.text('.carry'), /目標定得剛剛好/);
  assert.ok(await page.$('.progress-panel .bar'), '規劃頁看得到我的進步');
  // 第二題：目標不限 → 不問有沒有達到
  await p.start('self', 'any'); await threeStep(p, 4);
  assert.equal(await page.$('[data-choice="selfMet"]'), null);
  assert.equal(await page.$$eval('.progress-panel .bars li', l => l.length), 1);
  await p.choose('reason', 'alone'); await p.choose('nextMethod', 'self'); await page.click('#new'); await page.waitForTimeout(80);
  assert.equal(await page.$$eval('.progress-panel .bars li', l => l.length), 2);
  await page.click('#teacher');
  const t = await p.text('#toolBody');
  assert.match(t, /進步曲線/); assert.match(t, /達標/); assert.ok(await page.$('#toolBody svg polyline'));
  assert.deepEqual(p.errors, []);
});

test('一排一排加：點一格就加上一整排，排尾顯示累加的數字；可由教師關掉這個方法', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle'), page = p.page;
  assert.ok(await page.$('[data-choice="method"][data-value="row"]'));
  await p.start('row'); await p.choose('target', 'inside'); await p.check(); await p.next();
  await page.click('[data-tile="0"]'); await page.waitForTimeout(40);
  const a = await page.$$eval('.count-grid button.marked', b => b.length);
  assert.equal(a, 4, '一排 4 格都標記');
  assert.equal(await page.$eval('[data-tile="3"]', b => b.textContent.trim()), '4');
  await page.click('[data-tile="5"]'); await page.waitForTimeout(40);
  assert.equal(await page.$eval('[data-tile="7"]', b => b.textContent.trim()), '8', '第 2 排排尾是 4 + 4');
  await page.click('[data-tile="6"]'); await page.waitForTimeout(40);
  assert.equal(await page.$$eval('.count-grid button.marked', b => b.length), 4, '再點一次就拿掉那一排');
  await page.click('[data-tile="6"]'); await page.fill('#count', '8'); await p.check();
  assert.match(await p.text('#feedback1'), /答對了/);
  const q = await student('rectangle', { methods: ['mark', 'self'] });
  assert.equal(await q.page.$('[data-choice="method"][data-value="row"]'), null);
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test('教學階段：老師示範有放聲思考並可代做一步；一起做出現一起想的問題；小測驗沒有提示', { skip: skip || !distReady }, async () => {
  const d = await student('triangle', { mode: 'demo' });
  assert.match(await d.text('.mode-banner'), /老師示範/);
  await d.start(); assert.match(await d.text('.think-aloud'), /老師想/);
  await d.page.click('[data-demo="0"]'); await d.page.waitForTimeout(60);
  assert.match(await d.text('#feedback0'), /老師做好了/);
  assert.ok(!(await d.page.$eval('#next', b => b.classList.contains('locked'))));
  await d.next(); await d.page.click('[data-demo="1"]'); await d.page.waitForTimeout(60); await d.next();
  await d.page.click('[data-demo="2"]'); await d.page.waitForTimeout(60); await d.next();
  await d.page.click('[data-demo="3"]'); await d.page.waitForTimeout(60);
  assert.ok(await d.page.$('.geometry-svg'), '示範找高後圖還在');
  const t = await student('rectangle', { mode: 'together', support: 'faded' });
  await t.start('self'); assert.match(await t.text('.think-aloud'), /一起想/); assert.ok(await t.page.$('.cue'), '一起做也顯示第 1 層提示');
  const q = await student('parallelogram', { mode: 'probe' });
  assert.match(await q.text('.mode-banner'), /小測驗/);
  assert.equal(await q.page.$('[data-choice="goal"]'), null);
  await q.start(); assert.equal(await q.page.$('#hint0'), null);
  await q.choose('target', 'border'); await q.check();
  assert.equal(await q.page.$('#hintText0:not([hidden])'), null, '小測驗答錯也不出現提示');
  assert.deepEqual([...d.errors, ...t.errors, ...q.errors], []);
});

test('閱讀輔助：注音可開關且不影響朗讀與紀錄；字級與高對比；休息一下；自問卡；生活情境', { skip: skip || !distReady }, async () => {
  await setup();
  const page0 = await browser.newPage(); await page0.goto(base + '/teacher.html');
  await page0.evaluate(async () => { const r = await (await fetch('/api/teacher/lessons')).json(); const c = r.draft || r.published; c.rectangle.problems.forEach(p => { p.context = 'desk'; }); await fetch('/api/teacher/lessons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'published', config: c }) }); });
  await page0.close();
  const p = await student('rectangle', { zhuyin: true }), page = p.page;
  assert.match(await page.$eval('.context-card', e => { const c = e.cloneNode(true); c.querySelectorAll('rt').forEach(x => x.remove()); return c.textContent; }), /書桌的桌面/);
  assert.ok(await page.$('#app ruby rt'), '老師預設開注音');
  assert.equal(await page.$eval('#app ruby', r => r.querySelector('rt').textContent.length > 0), true);
  await page.click('#aidZhuyin'); assert.equal(await page.$('#app ruby'), null, '學生可以關掉');
  await page.click('#aidZhuyin'); assert.ok(await page.$('#app ruby'));
  await p.start(); assert.ok(await page.$('.activity ruby'), '換頁後新的文字也有注音');
  await p.choose('target', 'border'); await p.check();
  const rec = await page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')).filter(r => r.event === '步驟檢核').at(-1).choice);
  assert.equal(rec, '沿著邊走一圈的長度', '紀錄裡沒有注音符號');
  await page.click('#aidSize'); assert.equal(await page.evaluate(() => document.documentElement.dataset.size), 'large');
  await page.click('#aidContrast'); assert.ok(await page.evaluate(() => document.documentElement.classList.contains('contrast')));
  assert.ok(await page.$('.self-ask'));
  await page.click('#restBtn'); assert.ok(await page.$eval('#restDialog', d => d.open)); await page.click('#restDone'); assert.ok(!(await page.$eval('#restDialog', d => d.open)));
  assert.deepEqual(p.errors, []);
});

test('教師備課：教學階段、目標、方法、閱讀輔助與情境可以儲存；實物操作卡可以開', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('#mode');
  await page.selectOption('#mode', 'together'); await page.selectOption('#goalKind', 'firstTry'); await page.uncheck('[data-method="row"]');
  await page.check('#zhuyin'); await page.selectOption('#rest', '2'); await page.selectOption('[data-problem="0"][data-key="context"]', 'tile');
  await page.click('#publish'); await page.waitForFunction(() => /已發布/.test(document.querySelector('#status').textContent));
  const saved = await page.evaluate(async () => (await (await fetch('/api/lessons')).json()).config.rectangle);
  assert.equal(saved.settings.mode, 'together'); assert.equal(saved.settings.goalKind, 'firstTry'); assert.deepEqual(saved.settings.methods, ['mark', 'self']);
  assert.equal(saved.settings.zhuyin, true); assert.equal(saved.settings.rest, 2); assert.equal(saved.problems[0].context, 'tile');
  const res = await page.goto(base + '/hands-on.html'); assert.equal(res.status(), 200); assert.match(await page.textContent('h1'), /實物操作卡/);
  await page.close();
});

test('動畫示範：第 3 層提示出現「看示範影片」，播放分步示範（不同數字）並在最後提醒「換你做做看」；也可以每一步都開放', { skip: skip || !distReady }, async () => {
  const p = await student('triangle'), page = p.page;
  await p.start(); await p.choose('target', 'inside'); await p.check(); await p.next();   // 進入「拿一片來拼」
  assert.equal(await page.$('[data-video="1"]'), null, '一開始沒有影片按鈕');
  await p.check(); await p.check(); await p.check();
  assert.match(await p.text('#hintText1'), /提示 3／3/);
  await page.click('[data-video="1"]');
  await page.waitForSelector('#videoSlot1 .sd-stage');
  await page.waitForFunction(() => /拿一片一樣大的三角形/.test(document.querySelector('#videoSlot1 .sd-caption').textContent), null, { timeout: 8000 });
  await page.waitForSelector('#videoSlot1 .sd-end:not([hidden])', { timeout: 30000 });
  assert.ok(await page.$('#videoSlot1 .sd-chip.on'), '示範最後選了答案');
  const rec = await page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')).filter(r => /示範影片/.test(r.event)).map(r => r.event + '/' + r.source));
  assert.deepEqual(rec, ['看示範影片/動畫示範', '看完示範影片/動畫示範']);
  await page.click('[data-close-video="1"]'); assert.equal(await page.$('#videoSlot1'), null);
  // 長方形示範的數字和學生這一題不同
  const q = await student('rectangle', { video: 'always' });
  await q.start(); await q.choose('target', 'inside'); await q.check(); await q.next();
  assert.ok(await q.page.$('[data-video="1"]'), '設定「每一步」時一開始就有按鈕');
  const ex = await q.page.evaluate(() => window.stepDemo.example('rectangle', [4, 2, 0]));
  assert.notDeepEqual(ex.slice(0, 2), [4, 2]);
  const off = await student('rectangle', { video: 'off', mode: 'demo' }); await off.start();
  assert.equal(await off.page.$('[data-video]'), null, '關閉時不出現');
  assert.deepEqual([...p.errors, ...q.errors, ...off.errors], []);
});

test('老師上傳影片取代動畫：學生看到老師的影片；刪除後改回動畫', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ video: 'always' });
  const t = await browser.newPage(); await t.goto(base + '/teacher.html'); await t.waitForSelector('[data-vupload="1"]');
  assert.match(await t.textContent('#vstatus1'), /動畫示範/);
  await t.setInputFiles('[data-vupload="1"]', fileURLToPath(new URL('./fixtures/sample.webm', import.meta.url)));
  await t.waitForFunction(() => /已上傳/.test(document.querySelector('#vstatus1').textContent));
  await t.click('#publish'); await t.waitForFunction(() => /已發布/.test(document.querySelector('#status').textContent));
  const vid = await t.evaluate(async () => (await (await fetch('/api/lessons')).json()).config.rectangle.videos[1]);
  assert.match(vid, /^v_/);
  const p = await student('rectangle', { video: 'always' }), page = p.page;
  await p.start(); await p.choose('target', 'inside'); await p.check(); await p.next();
  await page.click('[data-video="1"]');
  await page.waitForSelector('#videoSlot1 video');
  await page.waitForFunction(() => { const v = document.querySelector('#videoSlot1 video'); return v && v.readyState >= 1; }, null, { timeout: 10000 });
  assert.equal(await page.$('#videoSlot1 .sd-stage'), null, '有老師的影片就不播動畫');
  assert.ok((await page.$eval('#videoSlot1 video', v => v.duration)) > 1);
  // 老師刪除影片 → 改回動畫
  await t.click('[data-vremove="1"]'); await t.click('#publish'); await t.waitForFunction(() => /已發布/.test(document.querySelector('#status').textContent));
  const q = await student('rectangle', { video: 'always' });
  await q.start(); await q.choose('target', 'inside'); await q.check(); await q.next();
  await q.page.click('[data-video="1"]'); await q.page.waitForSelector('#videoSlot1 .sd-stage');
  assert.equal((await t.evaluate(async id => (await fetch('/api/videos/' + id)).status, vid)), 404, '沒有教材在用的影片會從伺服器刪除');
  await t.close();
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test('教師使用手冊：第 19 版內容，備課頁與教師觀察都有連結', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('#mode');
  assert.ok(await page.$('header a[href="seven-guide.html"]'));
  await page.goto(base + '/seven-guide.html');
  const text = await page.textContent('main');
  for (const k of ['第 19 版', '學習地圖', '依序解鎖', 'N-4-11', '梯形', '教學階段', '示範影片', '注音', '進步曲線', '數字目標', '關掉分頁才會清除']) assert.ok(text.includes(k), k);
  const ids = await page.$$eval('.toc a', a => a.map(x => x.getAttribute('href').slice(1)));
  for (const id of ids) assert.ok(await page.$('#' + id), '目錄連結 ' + id);
  await page.close();
  const p = await student('rectangle'); await p.page.click('#teacher');
  assert.ok(await p.page.$('#toolBody a[href="seven-guide.html"]'));
});

// ---------- 第 19 版：學習地圖與新活動 ----------
async function begin(p) { await p.choose('goal', 'any'); await p.choose('confidence', 'mid'); await p.page.click('[data-choice="method"]'); await p.page.click('#start'); await p.page.waitForTimeout(60); }
async function act(id, settings = {}) {
  await setup(); await publish(settings);
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 } }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/seven.html?a=${id}`); await page.waitForSelector('#start');
  const p = { page, errors, choose: (k, v) => page.click(`[data-choice="${k}"][data-value="${v}"]`), check: async () => { await page.click('#check'); await page.waitForTimeout(60); }, next: async () => { await page.click('#next'); await page.waitForTimeout(60); }, text: sel => page.evaluate(s => document.querySelector(s)?.innerText ?? '', sel) };
  await begin(p); return p;
}
const svgCells = (p, sel) => p.page.$$eval(sel, l => l.map(e => e.getAttribute('data-cell') || e.getAttribute('data-tile-at') || e.getAttribute('data-est') || e.getAttribute('data-side')));

test('學習地圖：依單元列出活動；老師指派的才給學生；依序解鎖；完成後得到星星', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ __map: { assigned: ['compare', 'tile', 'rectangle'], sequential: true } });
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/seven.html'); await page.waitForSelector('.map-card');
  const units = await page.$$eval('.map-unit h2', h => h.map(x => x.innerText.trim()));
  assert.ok(units.some(u => /面積是什麼/.test(u)) && units.some(u => /周長和面積/.test(u)), '老師看得到所有單元');
  assert.ok(await page.$('.map-card.off[data-map="perimeter"]'), '沒指派的對老師顯示為灰色');
  assert.ok(await page.$('.map-card.locked[data-map="tile"]'), '依序解鎖：第二個先鎖住');
  // 完成 1-1 一題 → 第二個解鎖
  await page.click('[data-map="compare"]'); await page.waitForSelector('#start');
  const p = { page, choose: (k, v) => page.click(`[data-choice="${k}"][data-value="${v}"]`) };
  await begin(p);
  await p.choose('guess', 'A'); await page.click('#check'); await page.click('#next');
  const nCells = await page.locator('#figure1 [data-cell]').count(); for (let i = 0; i < nCells; i++) await page.locator('#figure1 [data-cell]').nth(i).dispatchEvent('click');
  const counts = await page.evaluate(() => { const l = [...document.querySelectorAll('#figure1 [data-cell]')].map(e => e.getAttribute('data-cell')[0]); return [l.filter(x => x === 'A').length, l.filter(x => x === 'B').length]; });
  await page.fill('#countA', String(counts[0])); await page.fill('#countB', String(counts[1])); await page.click('#check'); await page.click('#next');
  await page.click(`[data-choice="cmp"][data-value="${counts[0] > counts[1] ? 'A' : counts[0] < counts[1] ? 'B' : 'same'}"]`); await page.click('#check'); await page.click('#next');
  assert.match(await page.textContent('h1'), /完成了/);
  await page.click('[data-choice="reason"]'); await page.click('[data-choice="nextMethod"]'); await page.click('#new'); await page.waitForTimeout(80);
  await page.click('.map-link'); await page.waitForSelector('.map-card');
  assert.match(await page.textContent('[data-map="compare"] .map-stars'), /⭐/);
  assert.equal(await page.$('.map-card.locked[data-map="tile"]'), null, '完成後解鎖下一個');
  assert.ok(await page.$('.map-card.locked[data-map="rectangle"]'));
  assert.deepEqual(errs, []);
});

test('1-2 鋪方格：規則、要鋪滿才能過、塊數與面積單位', { skip: skip || !distReady }, async () => {
  const p = await act('tile');
  await p.choose('rule', 'any'); await p.check(); assert.match(await p.text('#feedback0'), /空隙/);
  await p.choose('rule', 'ok'); await p.check(); await p.next();
  const n = await p.page.locator('#figure1 [data-tile-at]').count();
  await p.page.locator('#figure1 [data-tile-at]').nth(0).dispatchEvent('click'); await p.check(); assert.match(await p.text('#feedback1'), /還有 \d+ 個空隙/);
  for (let i = 1; i < n; i++) await p.page.locator('#figure1 [data-tile-at]').nth(i).dispatchEvent('click');
  await p.check(); assert.match(await p.text('#feedback1'), /答對了/); await p.next();
  await p.page.fill('#count', String(n)); await p.check(); await p.next();
  await p.page.fill('#area', String(n)); await p.choose('unit', 'cm'); await p.check(); assert.match(await p.text('#feedback3'), /長度/);
  await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`面積是 ${n} 平方公分`));
  assert.deepEqual(p.errors, []);
});

test('1-3 剪開再拼與 1-4 估一估：操作、數格、半格合起來、估測差距回饋', { skip: skip || !distReady }, async () => {
  const p = await act('conserve');
  await p.choose('guess', 'big'); await p.check(); await p.next();
  await p.check(); assert.match(await p.text('#feedback1'), /剪開/);
  await p.page.click('#cutBtn'); await p.page.click('#moveBtn'); await p.check(); await p.next();
  const n = await p.page.$$eval('.ac-pair .ac-fig:first-child rect.ac-piece0, .ac-pair .ac-fig:first-child rect.ac-piece1', l => l.length);
  await p.page.fill('#before', String(n)); await p.page.fill('#after', String(n)); await p.check(); await p.next();
  await p.choose('concl', 'big'); await p.check(); await p.choose('concl', 'same'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), /面積一樣大/);
  const q = await act('estimate');
  await q.page.fill('#guess', '20'); await q.check(); await q.next();
  const full = (await svgCells(q, '#figure1 [data-est]')).length; await q.page.fill('#full', String(full)); await q.check(); await q.next();
  const half = (await svgCells(q, '#figure2 [data-est]')).length; await q.page.fill('#half', String(half)); await q.check(); await q.next();
  await q.page.fill('#total', String(full + half)); await q.check(); if (half) assert.match(await q.text('#feedback3'), /兩個湊成一格/);
  await q.page.fill('#total', String(full + half / 2)); await q.check(); await q.next();
  assert.match(await q.text('.done-banner'), /你估 20/);
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test('2-1 周長、2-2 面積還是周長、2-3 周長一樣面積一樣嗎', { skip: skip || !distReady }, async () => {
  const p = await act('perimeter');
  await p.choose('what', 'inside'); await p.check(); assert.match(await p.text('#feedback0'), /面積/);
  await p.choose('what', 'edge'); await p.check(); await p.next();
  for (let i = 0; i < 4; i++) await p.page.locator('#figure1 [data-side]').nth(i).dispatchEvent('click');
  await p.check(); assert.match(await p.text('#feedback1'), /答對了/); await p.next();
  const lens = await p.page.$$eval('#figure2 .ac-len', l => l.map(e => parseInt(e.textContent)));
  await p.choose('formula', 'area'); await p.check(); assert.match(await p.text('#feedback2'), /面積/);
  await p.choose('formula', 'sum'); await p.page.fill('#per', String(lens.reduce((x, y) => x + y, 0))); await p.check(); await p.next();
  await p.choose('unit', 'cm2'); await p.check(); assert.match(await p.text('#feedback3'), /面積的單位/);
  await p.choose('unit', 'cm'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), /周長是 \d+ 公分/);
  const w = await act('which');
  for (let i = 0; i < 3; i++) {
    const q = await w.text(`#feedback${i}`);
    await w.choose('sit' + i, 'area'); await w.check();
    if (/周長/.test(await w.text('#feedback' + i))) { await w.choose('sit' + i, 'per'); await w.check(); }
    assert.match(await w.text('#feedback' + i), /答對了/); await w.next();
  }
  assert.match(await w.text('h1'), /完成了/);
  const s = await act('samePerimeter', { difficulty: 'easy' });
  await s.choose('guess', 'same'); await s.check(); await s.next();
  const r = await s.page.$eval('#figure1 svg', e => e.getAttribute('aria-label').match(/\d+/g).map(Number));
  await s.page.fill('#pA', String(2 * (r[0] + r[1]))); await s.page.fill('#pB', String(2 * (r[2] + r[3]))); await s.check(); await s.next();
  await s.page.fill('#aA', String(r[0] * r[1])); await s.page.fill('#aB', String(r[2] * r[3])); await s.check(); await s.next();
  await s.choose('concl', 'notsure'); await s.check(); await s.next();
  assert.match(await s.text('.done-banner'), /周長一樣，面積不一定一樣/);
  assert.deepEqual([...p.errors, ...w.errors, ...s.errors], []);
});

test('新活動也有提示、動畫示範、紀錄與 CSV 的單元欄位', { skip: skip || !distReady }, async () => {
  const p = await act('tile', { video: 'always' });
  await p.choose('rule', 'any'); await p.check(); await p.check(); await p.check();   // 第 25 版：空白按檢查不給提示，要選了才算
  assert.match(await p.text('#hintText0'), /提示 3／3/);
  await p.page.click('[data-video="0"]'); await p.page.waitForSelector('#videoSlot0 .sd-plugin', { timeout: 8000 });
  assert.equal(await p.page.$('#videoSlot0 [data-choice]'), null, '示範畫面不會出現可作答的按鈕');
  await p.page.click('#teacher');
  const csv = await p.page.evaluate(() => { const r = JSON.parse(sessionStorage.getItem('area-records-v16')); return r.filter(x => x.actId === 'tile').length; });
  assert.ok(csv > 3);
  assert.match(await p.text('#toolBody'), /鋪方格的規則/);
  assert.deepEqual(p.errors, []);
});

test('教師備課：課綱路徑、指派、依序解鎖可以儲存；新活動可以個別設定難度與提示', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('[data-path="g3"]');
  await page.click('[data-path="g3"]'); await page.check('#sequential');
  await page.selectOption('#shape', 'tile'); await page.selectOption('#difficulty', 'challenge');
  await page.fill('[data-hint="1"]', '一塊一塊放，不要留空隙。');
  await page.click('#publish'); await page.waitForFunction(() => /已發布/.test(document.querySelector('#status').textContent));
  const c = await page.evaluate(async () => (await (await fetch('/api/lessons')).json()).config);
  assert.deepEqual(c.map.assigned, ['compare', 'tile', 'conserve', 'estimate', 'rectangle', 'square']);
  assert.equal(c.map.sequential, true); assert.equal(c.activities.tile.settings.difficulty, 'challenge');
  assert.equal(c.activities.tile.hints[1], '一塊一塊放，不要留空隙。');
  await page.close();
});

test('3-2 知道面積找邊長、3-3 排長方形', { skip: skip || !distReady }, async () => {
  const p = await act('inverse', { difficulty: 'easy' });
  await p.choose('known', 'two'); await p.check(); assert.match(await p.text('#feedback0'), /面積已經知道/);
  await p.choose('known', 'area'); await p.check(); await p.next();
  const [area, a] = (await p.text('.ac-big')).match(/\d+/g).map(Number).reverse();   // 「現在一共 a 格，要剛好 area 格」
  await p.check(); assert.match(await p.text('#feedback1'), /還差/);
  for (let i = 1; i < area / a; i++) await p.page.click('#moreRow');
  await p.check(); assert.match(await p.text('#feedback1'), /答對了/); await p.next();
  await p.page.fill('#side', String(area)); await p.check(); assert.match(await p.text('#feedback2'), /這是面積/);
  await p.page.fill('#side', String(area / a)); await p.check(); await p.next();
  await p.page.fill('#product', String(area)); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`寬是 ${area / a} 公分`));
  const q = await act('arrange');   // 一般：12 格
  for (let i = 0; i < 3; i++) await q.page.click('#wm0'); for (let i = 0; i < 2; i++) await q.page.click('#hm0');   // 4×3
  await q.check(); assert.match(await q.text('#feedback0'), /答對了/); await q.next();
  await q.check(); assert.match(await q.text('#feedback1'), /一樣/);
  for (let i = 0; i < 2; i++) await q.page.click('#wm1');   // 6×3 = 18
  await q.check(); assert.match(await q.text('#feedback1'), /多了 6 格/);
  await q.page.click('#hl1'); await q.check(); assert.match(await q.text('#feedback1'), /答對了/); await q.next();   // 6×2
  assert.match(await q.text('.activity'), /已經排出 2 種/);   // 小圖列出已排的
  for (let i = 0; i < 4; i++) await q.page.click('#wl2'); for (let i = 0; i < 4; i++) await q.page.click('#hm2');
  assert.ok(await q.page.$('.ac-dup'), '轉過來的會疊在一起給學生看');
  await q.check(); assert.match(await q.text('#feedback2'), /排過了/);
  await q.page.click('#wl2'); for (let i = 0; i < 6; i++) await q.page.click('#hm2');   // 1×12
  await q.check(); assert.match(await q.text('#feedback2'), /答對了/);
  assert.equal(await q.page.$$eval('.ac-found', e => e.length), 3);
  await q.next();
  await q.choose('concl', 'same'); await q.check(); await q.next();
  assert.match(await q.text('.done-banner'), /1×12、2×6、3×4/);
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test('3-4 複合圖形與 3-5 平方公尺（換算預設關閉，老師可開啟）', { skip: skip || !distReady }, async () => {
  const p = await act('composite', { difficulty: 'easy' });   // 5×4 缺 2×2
  await p.choose('cut', 'd'); await p.check(); assert.match(await p.text('#feedback0'), /三角形/);
  await p.page.locator('#figure0 [data-cut="h"]').dispatchEvent('click'); await p.check(); assert.match(await p.text('#feedback0'), /答對了/); await p.next();
  await p.page.fill('#l0', '3'); await p.page.fill('#w0', '2'); await p.page.fill('#a0', '6'); await p.check(); await p.next();   // 上面 3×2
  await p.page.fill('#l1', '5'); await p.page.fill('#w1', '3'); await p.page.fill('#a1', '15'); await p.check(); assert.match(await p.text('#feedback2'), /邊/);   // 下面是 5×2
  await p.page.fill('#w1', '2'); await p.page.fill('#a1', '14'); await p.check(); assert.match(await p.text('#feedback2'), /再算一次/);
  await p.page.fill('#a1', '10'); await p.check(); await p.next();
  await p.page.fill('#total', '16'); await p.check(); await p.next();
  await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), /面積是 16 平方公分/);
  const q = await act('squareMeter', { difficulty: 'easy' });
  assert.equal(await q.page.$$eval('.step-meter .dot', d => d.length), 4, '預設沒有換算步驟');
  await q.choose('what', 'cm'); await q.check(); await q.choose('what', 'm'); await q.check(); await q.next();
  for (let i = 0; i < 3; i++) { const label = await q.page.$eval(`[data-choice-group="u${i}"] legend`, e => e.textContent); await q.choose('u' + i, /教室|籃球|黑板|房間/.test(label) ? 'm2' : 'cm2'); }
  await q.check(); assert.match(await q.text('#feedback1'), /答對了/); await q.next();
  const correct = await q.page.$$eval('[data-choice="est"]', b => b.map(x => x.dataset.value));
  for (const v of correct) { await q.choose('est', v); await q.check(); if (/答對了/.test(await q.text('#feedback2'))) break; }
  await q.next();
  const [a, b] = (await q.text('.ac-big')).match(/\d+/g).map(Number);
  await q.page.fill('#area', String(2 * (a + b))); await q.choose('unit', 'm2'); await q.check(); assert.match(await q.text('#feedback3'), /周長/);
  await q.page.fill('#area', String(a * b)); await q.check(); await q.next();
  assert.match(await q.text('.done-banner'), new RegExp(`${a * b} 平方公尺`));
  const r = await act('squareMeter', { convert: true });
  assert.equal(await r.page.$$eval('.step-meter .dot', d => d.length), 5, '老師開啟後有換算步驟');
  assert.deepEqual([...p.errors, ...q.errors, ...r.errors], []);
});

test('4-3 梯形：兩片拼成平行四邊形、找上底下底與高、要除以 2', { skip: skip || !distReady }, async () => {
  const p = await act('trapezoid', { difficulty: 'easy' });
  await p.choose('target', 'inside'); await p.check(); await p.next();
  await p.check(); assert.match(await p.text('#feedback1'), /先按上面的按鈕/);
  await p.page.click('#trTake'); await p.page.click('#trJoin');
  assert.equal(await p.page.$('[data-choice="relation"]'), null);   // 第 25 版：先數用了幾片
  await p.choose('pieces', '1'); await p.check(); assert.match(await p.text('#feedback1'), /再數一次/);
  await p.choose('pieces', '2');
  await p.choose('relation', 'same'); await p.check(); assert.match(await p.text('#feedback1'), /兩片/);
  await p.choose('relation', 'half'); await p.check(); await p.next();
  await p.check(); assert.match(await p.text('#feedback2'), /先點上面和下面的邊/);
  await p.page.locator('#figure2 [data-edge="top"]').dispatchEvent('click'); await p.page.locator('#figure2 [data-edge="bottom"]').dispatchEvent('click');
  const [t, b] = (await p.text('#figure2')).match(/\d+/g).map(Number);
  await p.page.fill('#top', String(b)); await p.page.fill('#bottom', String(t)); await p.check(); assert.match(await p.text('#feedback2'), /相反/);
  await p.page.fill('#top', String(t)); await p.page.fill('#bottom', String(b)); await p.check(); await p.next();
  await p.choose('line', 'A'); await p.check(); assert.match(await p.text('#feedback3'), /斜的邊/);
  await p.page.locator('#figure3 [data-line="B"]').dispatchEvent('click'); await p.check(); assert.match(await p.text('#feedback3'), /找到高了/);
  const h = Number((await p.text('#figure3')).match(/高 (\d+)/)[1]);
  await p.page.fill('#height', String(h)); await p.check(); await p.next();
  await p.choose('formula', 'full'); await p.check(); assert.match(await p.text('#feedback4'), /兩片/);
  await p.choose('formula', 'half'); await p.page.fill('#ft', String(t)); await p.page.fill('#fb', String(b)); await p.page.fill('#fh', String(h)); await p.check(); await p.next();
  await p.page.fill('#total', String((t + b) * h)); await p.check(); assert.match(await p.text('#feedback5'), /÷ 2/);
  await p.page.fill('#total', String((t + b) * h / 2)); await p.check(); await p.next();
  await p.choose('unit', 'cm'); await p.check(); await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`面積是 ${(t + b) * h / 2} 平方公分`));
  assert.deepEqual(p.errors, []);
});

test('5-1 生活應用題：判斷面積或周長、選算式、計算、單位', { skip: skip || !distReady }, async () => {
  for (const level of ['easy', 'challenge']) {
    const p = await act('word', { difficulty: level });
    const text = await p.text('.lesson-prompt'); const per = /一圈|籬笆|花邊/.test(text);
    await p.choose('kind', per ? 'area' : 'per'); await p.check(); assert.match(await p.text('#feedback0'), per ? /周長/ : /面積/);
    await p.choose('kind', per ? 'per' : 'area'); await p.check(); await p.next();
    for (const v of ['d1', 'ok']) { await p.choose('formula', v); await p.check(); }
    assert.match(await p.text('#feedback1'), /答對了/); await p.next();
    const expr = (await p.text('.ac-big')).replace(/\s*=.*$/, '').replace(/×/g, '*').replace(/÷/g, '/');
    const ans = Function(`return ${expr}`)();
    await p.page.fill('#answer', String(ans + 1)); await p.check(); assert.match(await p.text('#feedback2'), /再算一次/);
    await p.page.fill('#answer', String(ans)); await p.check(); await p.next();
    const m = /公尺/.test(text) ? 'm' : 'cm', right = per ? m : m + '2', wrong = per ? m + '2' : m;
    await p.choose('unit', wrong); await p.check(); assert.match(await p.text('#feedback3'), per ? /不用「平方」/ : /要有「平方」/);
    await p.choose('unit', right); await p.check(); await p.next();
    assert.match(await p.text('.done-banner'), new RegExp(`答案是 ${ans} `));
    assert.deepEqual(p.errors, []);
  }
});

test('新活動也可以問 AI：送出活動與步驟名稱，不送題目數字；AI 不能用時改顯示固定提示', { skip: skip || !distReady }, async () => {
  const p = await act('trapezoid');
  let sent = null;
  await p.page.route('**/api/ai-support', async route => { sent = JSON.parse(route.request().postData()); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: '先找有直角記號的那一條線。' }) }); });
  for (let i = 0; i < 2; i++) { await p.choose('target', 'border'); await p.check(); if (await p.page.$('#ackHint')) await p.page.click('#ackHint'); }
  await p.page.click('#aiHint0'); await p.page.waitForTimeout(150);
  assert.equal(sent.shape, 'trapezoid'); assert.equal(sent.stepTitle, '看題目'); assert.equal(sent.issue, 'target'); assert.ok(!('problem' in sent));
  assert.match(await p.text('#aiMsg0'), /直角記號/);
  await p.page.unroute('**/api/ai-support');
  await p.page.route('**/api/ai-support', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"ai_unavailable"}' }));
  await p.page.click('#aiHint0'); await p.page.waitForTimeout(150);
  assert.match(await p.text('#aiMsg0'), /AI 現在不能用/);
  assert.deepEqual(p.errors, []);
});

// ---------- 第 22 版：學習小幫手 ----------
const buddySays = page => page.evaluate(() => document.querySelector('#buddyBubble:not([hidden])')?.innerText ?? '');
const buddyLog = page => page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16') || '[]').filter(r => r.event === '小幫手').map(r => r.action));

test('小幫手：很久沒動先問要不要幫忙，按「好」打開提示；再等一樣久幫忙打開「我卡住了」；有動作就重新計時', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { buddyWait: 30, buddyVoice: false, support: 'faded' }, undefined, { clock: true });
  await p.start();
  assert.ok(await p.page.$('#buddy'), '解題頁有小幫手');
  await p.page.clock.runFor(20000); assert.equal(await buddySays(p.page), '', '還沒到時間');
  await p.page.click('h1'); await p.page.clock.runFor(20000);
  assert.equal(await buddySays(p.page), '', '學生有動作就重新計時');
  await p.page.clock.runFor(11000);
  assert.match(await buddySays(p.page), /要不要我幫你/);
  await p.page.click('#buddyBubble [data-buddy="0"]');
  assert.match(await p.text('#hintText0'), /提示 1／3/, '按「好」打開第 1 層提示');
  await p.page.clock.runFor(31000); assert.match(await buddySays(p.page), /要不要我幫你/);
  await p.page.clock.runFor(30000);
  assert.ok(await p.page.$('#stuckPanel0'), '再等一樣久就打開「我卡住了」');
  assert.match(await buddySays(p.page), /我卡住了/);
  const log = await buddyLog(p.page);
  for (const a of ['主動問要不要幫忙', '接受提示', '主動打開我卡住了']) assert.ok(log.includes(a), a);
  assert.deepEqual(p.errors, []);
});

test('小幫手：同一步答錯 2 次鼓勵、3 次打開「我卡住了」；答對會稱讚；小測驗只鼓勵不給提示；老師可以關掉', { skip: skip || !distReady }, async () => {
  let p = await student('rectangle', { buddyVoice: false });
  await p.start();
  await p.choose('target', 'border'); await p.check(); assert.equal(await buddySays(p.page), '');
  await p.choose('target', 'corner'); await p.check(); assert.match(await buddySays(p.page), /慢慢來/, '很快又答錯：先看提示');
  await p.check(); assert.ok(await p.page.$('#stuckPanel0'), '答錯 3 次打開我卡住了');
  await p.choose('target', 'inside'); await p.check(); assert.match(await buddySays(p.page), /答對了|做得好|做到了/);
  assert.deepEqual(p.errors, []);

  p = await student('rectangle', { buddyWait: 30, buddyVoice: false, mode: 'probe' }, undefined, { clock: true });
  await p.start(); await p.page.clock.runFor(31000);
  assert.match(await buddySays(p.page), /慢慢想/);
  assert.equal(await p.page.$('#hintText0:not([hidden])'), null, '小測驗不給提示');

  p = await student('rectangle', { buddy: false });
  await p.start(); assert.equal(await p.page.$('#buddy'), null, '老師關掉就沒有小幫手');
  assert.deepEqual(p.errors, []);
});

test('專心提醒：先問學生可不可以用鏡頭；轉頭或看不到臉幾秒後提醒、回來說歡迎；可以關掉鏡頭', { skip: skip || !distReady }, async () => {
  const init = () => { window.__g = { face: true, turn: 0 }; window.areaBuddyTestDetector = { detect: () => window.__g }; };
  const p = await student('rectangle', { attention: true, attentionSec: 3, buddyVoice: false }, undefined, { clock: true, init });
  await p.start();
  assert.match(await buddySays(p.page), /不會存起來/, '先說明並問學生');
  assert.ok(!(await p.page.isVisible('#buddyCam')), '還沒同意，鏡頭不開');
  await p.page.click('#buddyBubble [data-buddy="0"]'); await p.page.clock.runFor(500);
  assert.ok(await p.page.isVisible('#buddyCam'), '同意後顯示「鏡頭開著」');
  await p.page.evaluate(() => { window.__g = { face: true, turn: 0.8 }; });
  await p.page.clock.runFor(2000); assert.doesNotMatch(await buddySays(p.page), /眼睛看這裡/, '轉頭不到 3 秒不提醒');
  await p.page.clock.runFor(1500); assert.match(await buddySays(p.page), /眼睛看這裡/);
  await p.page.evaluate(() => { window.__g = { face: true, turn: 0.1 }; });
  await p.page.clock.runFor(500); assert.match(await buddySays(p.page), /歡迎回來/);
  await p.page.evaluate(() => { window.__g = { face: false, turn: 0 }; });
  await p.page.clock.runFor(5000); assert.doesNotMatch(await buddySays(p.page), /眼睛看這裡/, '兩次提醒至少隔 20 秒');
  await p.page.clock.runFor(20000); assert.match(await buddySays(p.page), /眼睛看這裡/, '看不到臉也提醒');
  // 臉的方向：鼻尖在兩眼中間是正面，偏到一邊是轉頭
  const turn = await p.page.evaluate(() => { const pts = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 })); pts[33] = { x: 0.4 }; pts[263] = { x: 0.6 }; pts[1] = { x: 0.5 }; const a = areaBuddy.gaze(pts); pts[1] = { x: 0.59 }; const b = areaBuddy.gaze(pts); return [areaBuddy.looking(a), areaBuddy.looking(b), areaBuddy.looking(areaBuddy.gaze(undefined))]; });
  assert.deepEqual(turn, [true, false, false]);
  await p.page.click('#buddyCamOff'); assert.ok(!(await p.page.isVisible('#buddyCam')));
  const log = await buddyLog(p.page);
  for (const a of ['同意用鏡頭', '鏡頭開始', '專心提醒', '回來看螢幕', '學生關掉鏡頭']) assert.ok(log.includes(a), a);
  assert.deepEqual(p.errors, []);
});

test('教師備課：學習小幫手與專心提醒的設定可以儲存', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ buddy: true, buddyWait: 60, buddyVoice: true, attention: false, attentionSec: 5 });
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('#buddy');
  assert.ok(await page.$eval('#buddy', e => e.checked), '預設開啟小幫手');
  assert.ok(!(await page.$eval('#attention', e => e.checked)), '鏡頭預設關閉');
  await page.selectOption('#buddyWait', '90'); await page.check('#attention'); await page.selectOption('#attentionSec', '8'); await page.uncheck('#buddyVoice');
  await page.click('#saveDraft'); await page.waitForFunction(() => /儲存|草稿/.test(document.getElementById('status').textContent));
  const s = await page.evaluate(async () => { const r = await (await fetch('/api/teacher/lessons')).json(); return r.draft.rectangle.settings; });
  assert.deepEqual([s.buddy, s.buddyWait, s.buddyVoice, s.attention, s.attentionSec], [true, 90, false, true, 8]);
  await page.close();
});

test('小幫手：學生一直在動但一直答錯——同一個錯答案提醒換想法；在同一步待太久，就算一直在動也問要不要幫忙', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { buddyWait: 30, buddyVoice: false }, undefined, { clock: true });
  await p.start();
  await p.choose('target', 'border'); await p.check(); await p.page.clock.runFor(12000);
  await p.choose('target', 'corner'); await p.check(); assert.match(await buddySays(p.page), /再試一次/, '隔一陣子答錯第 2 次：鼓勵');
  await p.page.clock.runFor(12000); await p.check();
  assert.ok(await p.page.$('#stuckPanel0'), '第 3 次打開我卡住了');
  await p.page.click('[data-stuck-pick="hint"]').catch(() => {});
  await p.page.clock.runFor(12000); await p.check();
  assert.match(await buddySays(p.page), /剛剛試過了/, '同一個錯答案又試一次');
  // 一直點選項（每 10 秒動一次），空閒計時一直歸零，但同一步待了 90 秒就問
  for (let i = 0; i < 6; i++) { await p.choose('target', i % 2 ? 'border' : 'corner'); await p.page.clock.runFor(10000); }
  assert.match(await buddySays(p.page), /做了很久/);
  await p.choose('target', 'border'); assert.match(await buddySays(p.page), /做了很久/, '學生繼續動，問題不會收起');
  await p.page.click('#buddyBubble [data-buddy="0"]');
  assert.ok(await p.page.$('#stuckPanel0'), '按「好，幫我」打開我卡住了');
  const log = await buddyLog(p.page);
  for (const a of ['同一個錯答案', '同一步做很久']) assert.ok(log.includes(a), a);
  assert.deepEqual(p.errors, []);
});

// ---------- 第 22 版：現場試用紀錄（Google 試算表） ----------
const SHEET_URL = 'https://script.google.com/macros/s/TESTdeployment1234/exec';
async function fieldStudent(settings = {}, opts = {}) {
  const posts = [], state = { fail: false };
  const p = await student('rectangle', { buddyVoice: false, __research: { url: SHEET_URL, key: 'field-2026', teachers: 4, students: 6 }, ...settings }, undefined, {
    ...opts,
    init: opts.init
  });
  await p.page.context().route(SHEET_URL, async route => {
    if (state.fail) return route.abort();
    const body = JSON.parse(route.request().postData()); posts.push(body);
    route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body.key === 'field-2026' ? { ok: true, saved: (body.rows || []).map(r => r.rid) } : { ok: false, error: 'bad_key' }) });
  });
  const rows = sheet => posts.flatMap(b => b.rows || []).filter(r => !sheet || r.sheet === sheet);
  return { ...p, posts, rows, state };
}
async function pickWho(page, { teacher = 'T01', num = '03', device = '電腦', camera = 'no', names = '' } = {}) {
  await page.waitForSelector('#researchWho[open]');
  if (names) { assert.equal(await page.$eval('#researchWho .names', d => d.open), true, '還沒填姓名清單時預設展開'); await page.fill('#researchNames', names); }
  for (const [g, v] of [['teacher', teacher], ['num', num], ['device', device], ['camera', camera]]) await page.click(`#researchWho [data-pick="${g}"] [data-v="${v}"]`);
  await page.click('#researchStart');
}

test('現場試用：開始前老師點選代號（不用打字）；沒選齊不能開始；也可以選老師自己試用不記錄', { skip: skip || !distReady }, async () => {
  const p = await fieldStudent();
  await p.page.waitForSelector('#researchWho[open]');
  await p.page.click('#researchStart');
  assert.match(await p.text('#researchWhyNot'), /教師代號.*學生號碼.*鏡頭同意/);
  await p.page.click('#researchWho [data-pick="teacher"] [data-v="T02"]'); await p.page.click('#researchWho [data-pick="num"] [data-v="05"]'); await p.page.click('#researchWho [data-pick="camera"] [data-v="yes"]');
  await p.page.click('#researchStart');
  assert.match(await p.text('#researchBar .who'), /T02-S05/);
  await p.page.click('#researchFlush'); await p.page.waitForTimeout(300);
  const start = p.rows('場次')[0];
  assert.equal(start.teacher, 'T02'); assert.equal(start.student, 'T02-S05'); assert.equal(start.cameraConsent, '是'); assert.equal(start.version, 'v28'); assert.equal(start.sessionNo, 1, '開始本節：第 1 節');
  assert.ok(p.rows('教師設定').some(r => r.actId === 'rectangle' && r.buddy === '開'), '記下老師這次的設定');
  assert.ok(!JSON.stringify(p.posts).match(/姓名/), '不傳姓名欄位');

  const q = await fieldStudent();
  await q.page.waitForSelector('#researchWho[open]'); await q.page.click('#researchSkip');
  assert.equal(await q.page.$('#researchBar'), null, '老師自己試用：沒有試用工具列');
  await q.start(); await q.choose('target', 'border'); await q.check(); await q.page.waitForTimeout(300);
  assert.equal(q.posts.length, 0, '不記錄就不上傳');
  assert.deepEqual([...p.errors, ...q.errors], []);
});

test('現場試用：每筆紀錄帶代號上傳；老師即時按鈕、教師觀察勾選；姓名會被擋下；斷線先存著再補傳', { skip: skip || !distReady }, async () => {
  const p = await fieldStudent();
  await pickWho(p.page, { names: '王小明\n阿華' });
  await p.start(); await p.choose('target', 'border'); await p.check();
  await p.page.click('[data-quick="help"]'); await p.page.click('[data-quick="wrongBuddy"]');
  await p.page.click('#teacher'); await p.page.selectOption('#buddyReact', '覺得煩'); await p.page.fill('#evidence', '王小明一直看窗外'); await p.page.click('#saveObservation');
  assert.match(await p.text('#observed'), /自動上傳/); await p.page.click('#closeTools');
  await p.page.click('#researchFlush'); await p.page.waitForTimeout(300);
  const ops = p.rows('操作紀錄');
  assert.ok(ops.some(r => r.event === '步驟檢核' && r.correct === '否' && r.student === 'T01-S03'));
  const obs = p.rows('教師觀察');
  assert.deepEqual(obs.filter(r => r.kind === '教師即時紀錄').map(r => r.tag), ['老師幫忙了', '小方這次不準']);
  const o = obs.find(r => r.kind === '教師觀察');
  assert.equal(o.buddyReact, '覺得煩'); assert.equal(o.note, '○○一直看窗外', '姓名改成○○');
  assert.ok(!JSON.stringify(p.posts).includes('王小明'), '姓名完全沒有上傳');
  assert.match(await p.text('#researchCount'), /都上傳了/);

  p.state.fail = true;
  await p.page.click('[data-quick="engaged"]'); await p.page.click('#researchFlush'); await p.page.waitForTimeout(300);
  assert.match(await p.text('#researchCount'), /上傳失敗/);
  assert.ok(await p.page.evaluate(() => areaResearch.pending()) > 0, '失敗的留在佇列');
  p.state.fail = false;
  await p.page.click('#researchFlush'); await p.page.waitForTimeout(300);
  assert.equal(await p.page.evaluate(() => areaResearch.pending()), 0);
  assert.ok(p.rows('教師觀察').some(r => r.tag === '很投入'), '補傳成功');

  // 一批不超過 30 KB（離頁時 keepalive 上限 64 KB），中文很多時自動分成好幾批
  const before = p.posts.length;
  await p.page.evaluate(() => { for (let i = 0; i < 60; i++) areaResearch.record({ event: '測試', shape: '長方形', cycle: 1, note: '中文說明'.repeat(300) }); });
  await p.page.click('#researchFlush'); await p.page.waitForTimeout(600);
  const sizes = p.posts.slice(before).map(b => Buffer.byteLength(JSON.stringify(b)));
  assert.ok(sizes.length >= 3 && sizes.every(n => n <= 30000), '每批大小：' + sizes.join(','));
  assert.equal(await p.page.evaluate(() => areaResearch.pending()), 0);
  assert.deepEqual(p.errors, []);
});

test('現場試用：做完一題學生選心情（記在完成的那一題）、每題摘要；換學生先回答問題、關鏡頭、清掉上一位的進度、記住教師代號；這節課結束先收最後一位再填教師短表；沒有家長同意就不開鏡頭', { skip: skip || !distReady }, async () => {
  const init = () => { window.areaBuddyTestDetector = { detect: () => ({ face: true, turn: 0 }) }; };
  const p = await fieldStudent({ attention: true }, { init });
  await pickWho(p.page, { camera: 'no' });
  await p.start();
  assert.doesNotMatch(await buddySays(p.page), /鏡頭/, '沒有家長同意，小方不問鏡頭');
  await p.choose('target', 'border'); await p.check();   // 上一位學生答錯一次
  await p.page.evaluate(() => areaResearch.record({ event: '整題完成', shape: '長方形', shapeKey: 'rectangle', actId: 'rectangle', cycle: 3, activity: 7, secs: 95, errors: 2, hints: 1, firstTry: 5, goalMet: true, badges: ['done'] }));
  await p.page.waitForSelector('#researchMood[open]');
  await p.page.click('[data-mood="great"]');
  await p.page.click('#researchNext');
  await p.page.click('#researchEnd [data-pick="fun"] [data-v="yes"]'); await p.page.click('#researchEnd [data-pick="buddyHelp"] [data-v="soso"]');
  assert.equal(await p.page.$('#researchEnd [data-pick="camFeel"]'), null, '沒用鏡頭就不問鏡頭');
  await p.page.click('#researchEndSave');
  await p.page.waitForSelector('#researchWho[open]');
  assert.equal(await p.page.getAttribute('#researchWho [data-pick="teacher"] [data-v="T01"]', 'aria-checked'), 'true', '記住上一位的教師代號');
  assert.equal(await p.page.getAttribute('#researchWho [data-pick="camera"] [data-v="yes"]', 'aria-checked'), 'false', '鏡頭同意每位學生重選');
  await p.page.click('#researchWho [data-pick="num"] [data-v="04"]'); await p.page.click('#researchWho [data-pick="camera"] [data-v="yes"]'); await p.page.click('#researchStart');
  const kept = await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16') || '[]').map(r => r.studentId || ''));
  assert.ok(kept.every(x => x === 'T01-S04'), '上一位學生的紀錄已清掉：' + kept.join(','));
  assert.match(await p.text('.eyebrow'), /第 1 題/, '從第 1 題開始');
  assert.match(await buddySays(p.page), /鏡頭/, '下一位學生家長同意，小方才問鏡頭');
  await p.page.click('#buddyBubble [data-buddy="0"]'); await p.page.waitForTimeout(500);
  assert.ok(await p.page.isVisible('#buddyCam'), '鏡頭開著');
  await p.page.click('#researchNext'); await p.page.waitForSelector('#researchEnd[open]');
  assert.ok(!(await p.page.isVisible('#buddyCam')), '換學生的視窗一打開就先關鏡頭');
  await p.page.keyboard.press('Escape');
  assert.ok(await p.page.$('#researchEnd[open]'), 'Esc 不會關掉換學生的視窗');
  await p.page.click('#researchEndBack'); await p.page.waitForTimeout(500);
  assert.ok(await p.page.isVisible('#buddyCam'), '按錯了回去：同一位學生不用重新同意，鏡頭自動再開');
  await p.page.click('#researchClass');
  await p.page.waitForSelector('#researchEnd[open]');
  assert.ok(!(await p.page.isVisible('#buddyCam')), '一開始收尾就先關鏡頭');
  assert.ok(await p.page.$('#researchEnd [data-pick="camFeel"]'), '用過鏡頭才問鏡頭感受');
  assert.equal(await p.text('#researchEndSkip'), '跳過問題', '下課時最後一位學生不寫「換下一位」');
  await p.page.click('#researchEndSkip');
  await p.page.waitForSelector('#researchTeacher[open]');
  for (const [g, v] of [['engage', '4'], ['timing', 'late'], ['buddyUseful', '5'], ['camAccurate', 'some'], ['assists', '1-2']]) await p.page.click(`#researchTeacher [data-pick="${g}"] [data-v="${v}"]`);
  await p.page.fill('#researchFix', '小方等太久才出現'); await p.page.click('#researchTeacherSave');
  await p.page.waitForSelector('#researchDone[open]');
  await p.page.click('#researchDoneUpload'); await p.page.waitForTimeout(400);
  assert.match(await p.text('#researchDoneCount'), /都上傳了/);
  const sum = p.rows('每題摘要')[0];
  assert.equal(sum.secs, 95); assert.equal(sum.errors, 2); assert.equal(sum.student, 'T01-S03');
  const fb = p.rows('學生回饋');
  const mood = fb.find(r => r.kind === '學生心情');
  assert.equal(mood.mood, '😀 很好'); assert.equal(mood.cycle, 3, '心情記在完成的那一題');
  assert.ok(fb.some(r => r.kind === '學生回饋' && r.fun === '😀 好玩' && r.buddyHelp === '😐 一點點'));
  assert.ok(p.rows('場次').some(r => r.kind === '結束' && r.student === 'T01-S03'));
  assert.ok(p.rows('場次').some(r => r.kind === '開始' && r.student === 'T01-S04'));
  assert.ok(p.rows('場次').some(r => r.kind === '結束' && r.student === 'T01-S04'), '下課時最後一位學生的場次也結束');
  const t = p.rows('教師回饋')[0];
  assert.deepEqual([t.teacher, t.student, t.engage, t.timing, t.fix], ['T01', '', '4', '太晚', '小方等太久才出現']);
  await p.page.click('#researchDoneNext');
  await p.page.waitForSelector('#researchWho[open]');
  assert.deepEqual(p.errors, []);
});

test('教師備課：現場試用紀錄的網址、通行碼可以儲存；網址不對不能儲存', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const page = await browser.newPage(); await page.goto(base + '/teacher.html'); await page.waitForSelector('#researchUrl');
  await page.fill('#researchUrl', 'https://example.com/hook'); await page.fill('#researchKey', 'field-2026'); await page.click('#saveDraft');
  await page.waitForFunction(() => /Apps Script/.test(document.getElementById('status').textContent));
  await page.fill('#researchUrl', SHEET_URL); await page.fill('#researchTeachers', '4'); await page.click('#saveDraft');
  await page.waitForFunction(() => /草稿已儲存/.test(document.getElementById('status').textContent));
  const r = await page.evaluate(async () => (await (await fetch('/api/teacher/lessons')).json()).draft.research);
  assert.deepEqual(r, { url: SHEET_URL, key: 'field-2026', teachers: 4, students: 6 });
  await page.close();
});

test('第 23 版：目標只在第一題問、這次做幾題、改步驟名稱、反思可複選', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { flow: 'three', lessonGoal: 3, stepNames: { 6: '寫出單位' } });
  assert.match(await p.text('.eyebrow'), /這次：第 1／3 題/);
  await p.choose('target', 'inside'); await p.choose('goal', 'g3'); await p.choose('confidence', 'mid'); await p.choose('method', 'mark'); await p.page.click('#start');
  await p.choose('formula', 'product'); await p.page.fill('#a', '4'); await p.page.fill('#b', '2'); await p.page.fill('#total', '8'); await p.check(); await p.next();
  assert.match(await p.text('.activity h2'), /寫出單位/, '老師改的步驟名稱');
  await p.choose('unit', 'cm2'); await p.check();
  await p.choose('selfMet', 'yes');
  await p.page.click('[data-choice="reason"][data-value="formula"]'); await p.page.click('[data-choice="reason"][data-value="alone"]');
  assert.equal(await p.page.$$eval('[data-choice="reason"][aria-pressed="true"]', e => e.length), 2, '可以複選');
  await p.choose('nextMethod', 'mark'); await p.page.click('#new'); await p.page.waitForTimeout(80);
  assert.equal(await p.page.$('[data-choice="goal"]'), null, '第二題不再問目標');
  assert.equal(await p.page.$('[data-choice="confidence"]'), null);
  assert.match(await p.text('.keep-goal'), /和上一題一樣/);
  assert.match(await p.text('.eyebrow'), /第 2／3 題/);
  assert.match(await p.text('.carry'), /選對算式、我自己想|我自己想、選對算式/);
  await p.choose('target', 'inside'); await p.choose('method', 'mark'); await p.page.click('#start'); await p.page.waitForTimeout(80);
  const goals = await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')).filter(r => r.event === '整題定標').map(r => r.goal));
  assert.deepEqual(goals, ['g3', 'g3'], '沿用的目標要真的存下來，不是變成不限');
  await p.page.reload(); await p.page.waitForSelector('#start');
  assert.match(await p.text('.eyebrow'), /這次：第 1／3 題/, '重新進入活動時重新計數');
  const recs = await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')));
  assert.match(recs.find(r => r.event === '反思與下一輪調整').choice, /幫助我的：.+、/);
  assert.deepEqual(p.errors, []);
});

test('第 23 版：回去看之後可以「回到剛才那一步」；列算式點方格時圖上亮出那條邊', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle'); await p.start('self');
  await p.choose('target', 'inside'); await p.check(); await p.next();
  await p.page.click('#useProduct'); await p.check(); await p.next();
  await p.page.fill('#first', '4'); await p.check(); await p.next();
  await p.page.fill('#second', '2'); await p.check(); await p.next();
  await p.page.focus('#a'); assert.ok(await p.page.$('#figure4 .pulse-line'), '點底的方格，圖上那條邊會亮');
  await p.choose('formula', 'product'); await p.page.fill('#a', '4'); await p.page.fill('#b', '2'); await p.check(); await p.next();
  await p.page.click('#compare summary'); await p.page.click('[data-return="4"]');
  assert.ok(await p.page.$('#resume'));
  await p.page.click('#resume'); await p.page.waitForTimeout(80);
  assert.ok(await p.page.$('#total'), '回到算一算那一頁');
  assert.equal(await p.page.$('#resume'), null);
  assert.deepEqual(p.errors, []);
});

test('第 23 版：示範題就算亂數一直抽到學生的題目，也會換一題答案不同的', { skip: skip || !distReady }, async () => {
  const p = await act('arrange');   // 一般難度每題都是 12 格
  const r = await p.page.evaluate(() => {
    const pl = window.areaActs.get('arrange'), cur = pl.makeProblem('standard', 0, Math.random);
    Math.random = () => 0;   // 固定亂數
    const scenes = window.areaActs.demoScenes(pl, 0, 'standard', {}, cur);
    const host = document.createElement('div'); host.innerHTML = scenes[0].html(); return { cur: cur.n, html: host.textContent };
  });
  assert.equal(r.cur, 12);
  assert.doesNotMatch(r.html, /剛好 12 格/, '示範題不是 12 格');
  assert.deepEqual(p.errors, []);
});

test('第 24 版：老師建立班級代碼，學生掃 QR code 的連結就進入學生頁，不能進教師備課', { skip: skip || !distReady }, async () => {
  await setup(); await publish({});
  const t = await browser.newPage(); const errors = []; t.on('pageerror', e => errors.push(e.message));
  await t.goto(base + '/teacher.html'); await t.waitForSelector('#classCreate');
  await t.fill('#classLabel', '<b>'); await t.click('#classCreate'); assert.match(await t.textContent('#classMsg'), /班級名稱/);
  await t.fill('#classLabel', '三年甲班'); await t.click('#classCreate'); await t.waitForSelector('.class-card');
  const code = (await t.textContent('.class-card .class-code')).trim();
  assert.match(code, /^[2-9A-HJKMNP-Z]{6}$/); assert.ok(await t.$('.class-card .class-qr svg'), '有 QR code');
  await t.click('[data-class-show]'); assert.ok(await t.$('dialog.class-big[open] svg')); await t.click('dialog.class-big button');
  const ctx = await browser.newContext(); const s = await ctx.newPage(); s.on('pageerror', e => errors.push(e.message));
  await s.goto(`${base}/?class=${code.toLowerCase()}`); await s.waitForURL(/seven\.html/); await s.waitForSelector('.map, #start, .map-unit, main');
  const session = await s.evaluate(async () => (await fetch('/api/session')).json());
  assert.equal(session.student, true); assert.equal(session.className, '三年甲班');
  await s.goto(base + '/teacher.html'); assert.match(s.url(), /seven\.html$/, '學生進不了教師備課');
  // 打錯代碼會提示
  const ctx2 = await browser.newContext(); const w = await ctx2.newPage(); await w.goto(base + '/?class=ZZZZZZ'); await w.waitForFunction(() => /找不到這個代碼/.test(document.getElementById('status').textContent));
  // 停用後學生就進不去
  t.once('dialog', d => d.accept()); await t.click('[data-class-off]'); await t.waitForTimeout(150);
  assert.equal((await s.evaluate(async () => (await fetch('/api/session')).json())).student, false);
  assert.deepEqual(errors, []);
  await ctx.close(); await ctx2.close(); await t.close();
});

test('第 25 版：高對比主按鈕看得到字；選錯指出看哪裡（不鎖）；1-2 鋪滿才數數字；第 3 個提示先提醒一次；3-4 長寬寫反會提醒；4-3 拼合動畫與數字；示範數到最後', { skip: skip || !distReady }, async () => {
  const c = await student('rectangle', { contrast: true });
  const col = await c.page.$eval('#start', e => { const s = getComputedStyle(e); return [s.color, s.backgroundColor]; });
  assert.notEqual(col[0], col[1], '主按鈕字和底色不同'); assert.equal(col[0], 'rgb(255, 255, 255)');
  const p = await act('tile');
  // 空白按檢查：不算錯
  await p.check(); assert.equal(await p.page.$('.look-note'), null);
  await p.choose('rule', 'any'); await p.check();
  assert.match(await p.text('#feedback0'), /先看圖再選/);
  assert.ok(await p.page.$('.look-here'), '圖被標出來');
  assert.equal(await p.page.$eval('[data-choice="rule"][data-value="ok"]', b => b.disabled), false, '選項不鎖');
  await p.choose('rule', 'ok'); await p.check(); await p.next();
  // 鋪的時候不出現數字
  await p.page.locator('#figure1 [data-tile-at]').nth(1).dispatchEvent('click'); await p.page.locator('#figure1 [data-tile-at]').nth(0).dispatchEvent('click');
  assert.equal(await p.page.$$eval('#figure1 .ac-num', l => l.length), 0);
  assert.match(await p.text('.ac-tally'), /已經鋪了 2 塊/);
  // 第 3 個提示：先提醒一次，再按就給
  await p.page.click('#hint1'); await p.page.click('#hint1'); await p.page.click('#hint1');
  assert.match(await p.text('#feedback1'), /先照著提示試一次/);
  assert.equal(await p.page.$eval('#hint1', b => b.disabled), false);
  await p.page.click('#hint1');
  await p.page.waitForFunction(() => /提示 3／3/.test(document.getElementById('hintText1')?.textContent || ''), null, { timeout: 5000 });
  await p.page.click('#tileRow'); assert.match(await p.text('.ac-tally'), /還有/);
  while (await p.page.$('#tileRow')) await p.page.click('#tileRow');
  assert.match(await p.text('.ac-tally'), /鋪滿了/);
  const n = await p.page.locator('#figure1 [data-tile-at]').count();
  const nums = await p.page.$$eval('#figure1 .ac-num', l => l.map(x => x.textContent));
  assert.equal(nums.length, n, '鋪滿後每格都有數字'); assert.equal(nums.at(-1), String(n), '右下角是總數');
  // 示範：從 1 數到最後
  const demo = await p.page.evaluate(async () => {
    const host = document.createElement('div'); document.body.prepend(host);
    const A = window.areaActs, pl = A.get('tile'), d = window.stepDemo.mount(host, { scenes: A.demoScenes(pl, 2, 'standard', {}, null), recap: '右下角最後一格的數字，就是一共用了幾塊。' });
    await d.play(); return { nums: host.querySelectorAll('.sd-num').length, tiles: host.querySelectorAll('.ac-tile').length, counting: host.querySelectorAll('.sd-counting').length, cap: host.querySelector('.sd-caption').textContent };
  });
  assert.equal(demo.nums, demo.tiles); assert.ok(demo.nums >= 9, '數到最後一塊'); assert.match(demo.cap, /^記住：/);
  // 示範按停止：數字不再跑
  const stopped = await p.page.evaluate(async () => {
    const host = document.createElement('div'); document.body.prepend(host);
    const A = window.areaActs, pl = A.get('tile'), d = window.stepDemo.mount(host, { scenes: A.demoScenes(pl, 2, 'standard', {}, null) });
    d.play(); await new Promise(r => setTimeout(r, 1500)); d.stop(); const a = host.querySelectorAll('.sd-num').length;
    await new Promise(r => setTimeout(r, 1500)); return [a, host.querySelectorAll('.sd-num').length, host.querySelectorAll('.sd-counting').length];
  });
  assert.equal(stopped[0], stopped[1], '停止後不再數'); assert.equal(stopped[2], 0);
  // 老師可以關掉「先試一次」
  const q = await act('tile', { tryFirst: false });
  await q.choose('rule', 'ok'); await q.check(); await q.next(); await q.page.click('#hint1'); await q.page.click('#hint1'); await q.page.click('#hint1');
  await q.page.waitForFunction(() => /提示 3／3/.test(document.getElementById('hintText1')?.textContent || ''), null, { timeout: 5000 });
  // 3-4：長和寬寫反也對，但會提醒
  const r = await act('composite', { difficulty: 'easy' });
  await r.page.locator('#figure0 [data-cut="h"]').dispatchEvent('click'); await r.check(); await r.next();
  await r.page.fill('#l0', '2'); await r.page.fill('#w0', '3'); await r.page.fill('#a0', '6'); await r.check();
  await r.page.waitForFunction(() => /答對了！小提醒：比較長的邊叫「長」/.test(document.getElementById('feedback1')?.textContent || ''), null, { timeout: 5000 });
  // 4-3：拼合時第二片有動畫；列算式和算一算的圖一直有上底、下底、高
  const t = await act('trapezoid');
  await t.choose('target', 'inside'); await t.check(); await t.next();
  await t.page.click('#trTake'); await t.page.click('#trJoin');
  assert.ok(await t.page.$('#figure1 .ac-join'), '轉過來拼的動畫');
  const fig = await t.page.evaluate(() => window.areaActs.get('trapezoid').steps[5].figure({ problem: { t: 3, b: 7, h: 4, off: 2 }, answers: {}, state: {}, checked: () => false, hint: () => 0 }));
  assert.match(fig, /上底 3/); assert.match(fig, /下底 7/); assert.match(fig, /高 4/);
  // 2-2：兩張小圖一開始就在；看過第 2 個提示後標出關鍵字
  const w = await act('which');
  assert.equal(await w.page.$$eval('#figure0 .ac-sitcard', l => l.length), 2);
  await w.page.click('#hint0'); await w.page.click('#hint0');
  const prompt = await w.page.$eval('.lesson-prompt', e => e.innerHTML); if (/圍一圈|繞著|沿著|一圈|鋪滿|貼滿|刷滿|種滿|蓋滿/.test(prompt)) assert.match(prompt, /<mark>/);
  for (const x of [c, p, q, r, t, w]) assert.deepEqual(x.errors, []);
});

test('第 25 版：學生改網址也跳不過鎖住的活動；反思頁按上面的地圖連結也記成完成', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ __map: { assigned: ['compare', 'tile', 'rectangle'], sequential: true } });
  const t = await browser.newPage(); await t.goto(base + '/teacher.html'); await t.waitForSelector('#classCreate');
  await t.fill('#classLabel', '五年乙班'); await t.click('#classCreate'); await t.waitForSelector('.class-card');
  const code = (await t.textContent('.class-card .class-code')).trim(); await t.close();
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${base}/?class=${code}`); await page.waitForURL(/seven\.html/);
  await page.goto(base + '/seven.html?a=tile'); await page.waitForSelector('.map-card');
  assert.doesNotMatch(page.url(), /a=tile/, '鎖住的活動回到地圖');
  await page.goto(base + '/seven.html?a=perimeter'); await page.waitForSelector('.map-card');
  assert.doesNotMatch(page.url(), /a=perimeter/, '沒指派的活動回到地圖');
  // 做完 1-1，在反思頁按上面的「學習地圖」
  await page.click('[data-map="compare"]'); await page.waitForSelector('#start');
  const p = { page, choose: (k, v) => page.click(`[data-choice="${k}"][data-value="${v}"]`) };
  await begin(p);
  await p.choose('guess', 'A'); await page.click('#check'); await page.click('#next');
  const nCells = await page.locator('#figure1 [data-cell]').count(); for (let i = 0; i < nCells; i++) await page.locator('#figure1 [data-cell]').nth(i).dispatchEvent('click');
  const counts = await page.evaluate(() => { const l = [...document.querySelectorAll('#figure1 [data-cell]')].map(e => e.getAttribute('data-cell')[0]); return [l.filter(x => x === 'A').length, l.filter(x => x === 'B').length]; });
  await page.fill('#countA', String(counts[0])); await page.fill('#countB', String(counts[1])); await page.click('#check'); await page.click('#next');
  await page.click(`[data-choice="cmp"][data-value="${counts[0] > counts[1] ? 'A' : counts[0] < counts[1] ? 'B' : 'same'}"]`); await page.click('#check'); await page.click('#next');
  await page.click('[data-choice="reason"]'); await page.click('[data-choice="nextMethod"]');
  await page.click('.map-link'); await page.waitForSelector('.map-card');
  assert.match(await page.textContent('[data-map="compare"] .map-stars'), /⭐/);
  assert.equal(await page.$('.map-card.locked[data-map="tile"]'), null, '完成後解鎖下一個');
  await page.goto(base + '/seven.html?a=tile'); await page.waitForSelector('#start');
  assert.deepEqual(errs, []);
  await ctx.close();
});

test('第 26 版：研究紀錄存網站資料庫：開始本節編節次、錯誤記觀察代碼、老師調整支持要選理由並存成這位學生的設定', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { buddyVoice: false, __research: { url: '', key: '', teachers: 4, students: 6, server: true } });
  await pickWho(p.page, { teacher: 'T03', num: '02' });
  await p.page.waitForFunction(() => /第 1 節/.test(document.querySelector('#researchBar .who')?.innerText || ''));
  assert.match(await p.text('#researchBar .who'), /T03-S02/);
  await p.start(); await p.choose('target', 'border'); await p.check();
  await p.page.click('[data-quick="undetermined"]');
  await p.page.click('#researchFlush'); await p.page.waitForTimeout(400);
  const events = async () => (await p.page.evaluate(async () => (await (await fetch('/api/teacher/research?student=T03-S02')).json()).events));
  const ev = await events();
  const wrong = ev.find(r => r.event === '步驟檢核' && r.correct === '否');
  assert.ok(wrong, '錯誤存進網站資料庫');
  assert.equal(wrong.sessionNo, 1); assert.equal(wrong.version, 'v28');
  const d = JSON.parse(wrong.detail); assert.equal(d.obs, 'chosePerimeter'); assert.equal(d.outcome, 'wrong'); assert.equal(d.firstTry, true);
  assert.ok(ev.some(r => r.event === '無法判定'), '老師按「這題無法判定」');
  // 老師調整支持：沒選理由不能存；減少支持存成這位學生的設定，記下方向
  await p.page.click('#teacher');
  await p.page.selectOption('#support', 'faded'); await p.page.click('#apply');
  assert.match(await p.text('#applyMsg'), /主要理由/);
  await p.page.selectOption('#reason', 'independent'); await p.page.fill('#reasonNote', '連續兩題自己完成'); await p.page.click('#apply');
  await p.page.waitForFunction(() => !document.querySelector('#tools').open);
  const ch = await p.page.evaluate(async () => (await (await fetch('/api/teacher/research')).json()).changes);
  assert.deepEqual(ch.map(c => [c.student, c.field, c.direction, c.reason, c.sessionNo]), [['T03-S02', 'support', 'decrease', 'independent', 1]]);
  // 重新整理：這位學生的設定還在
  await p.page.reload(); await p.page.waitForSelector('#start');
  await p.page.waitForFunction(() => window.areaResearch.overrides('rectangle')?.support === 'faded');
  await p.page.click('#teacher'); assert.equal(await p.page.$eval('#support', s => s.value), 'faded');
  // 維持原設定也要記下
  await p.page.selectOption('#reason', 'lowAccuracy'); await p.page.click('#decKeep');
  await p.page.waitForFunction(() => /維持/.test(document.querySelector('#decisionMsg')?.innerText || ''));
  assert.deepEqual(p.errors, []);
});

test('第 26 版第二階段：研究管理匯入情境並指派；教師逐節看紀錄、存決策；AI 不能用時改用固定格式摘要', { skip: skip || !distReady }, async () => {
  await setup();
  // 研究人員（主持人帳號）
  const ctx = await browser.newContext({ acceptDownloads: true }), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/study.html'); await page.waitForSelector('#setFile');
  await page.setInputFiles('#setFile', fileURLToPath(new URL('../scenarios/demo-set.json', import.meta.url)));
  await page.waitForFunction(() => document.querySelector('#asgSet option'));
  await page.selectOption('#asgTeacher', 'T03'); await page.fill('#asgProbe', 'P1'); await page.click('#asgSave');
  await page.waitForFunction(() => /已指派/.test(document.querySelector('#asgMsg')?.textContent || ''));
  await page.selectOption('[data-phase-teacher="T03"]', 'intervention');
  await page.waitForFunction(() => /T03 切換到 介入期/.test(document.querySelector('#phaseMsg')?.textContent || ''));
  // 參與教師 T03
  const tctx = await browser.newContext(), tp = await tctx.newPage(); tp.on('pageerror', e => errors.push(e.message));
  await tp.goto(base + '/portal.html');
  assert.equal(await tp.evaluate(async () => (await fetch('/api/test-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'test', password: 'e2e-pass', teacher: 'T03' }) })).status), 200);
  await tp.goto(base + '/scenario.html'); await tp.waitForSelector('[data-scn]');
  assert.equal(await tp.locator('[data-scn]').count(), 5);
  assert.match(await tp.innerText('.scn-panel h2'), /情境 1・3-1 長方形的面積・第 1 節（共 7 節）/);
  assert.equal(await tp.locator('.scn-session .mark').count() > 0, true);
  assert.doesNotMatch(await tp.content(), /應有方向|insufficient/);
  await tp.click('#raw'); await tp.waitForSelector('#rawBox table');
  await tp.click('#aiSummary'); await tp.waitForFunction(() => /第1節：完成 6 題/.test(document.querySelector('#aiText')?.textContent || ''));
  await tp.check('[name=decision][value=keep]'); await tp.click('#save');
  assert.match(await tp.innerText('#msg'), /主要理由/);
  await tp.selectOption('#reason', 'lowAccuracy'); await tp.click('#save');
  await tp.waitForFunction(() => /第 2 節（共 7 節）/.test(document.querySelector('.scn-panel h2')?.textContent || ''));
  await tp.check('[name=decision][value=change]'); await tp.selectOption('[data-set=mode]', 'demo'); await tp.selectOption('#reason', 'lowAccuracy'); await tp.click('#save');
  await tp.waitForFunction(() => /第 3 節/.test(document.querySelector('.scn-panel h2')?.textContent || ''));
  assert.match(await tp.innerText('.scn-settings'), /您目前的設定：教學階段：老師示範/);
  // 研究人員匯出：方向、應有方向、AI 與回查原始紀錄
  const rows = await page.evaluate(async () => (await (await fetch('/api/study/export?type=decisions')).json()).rows);
  assert.deepEqual(rows.map(r => [r.sessionNo, r.direction, r.expected, r.aiOn, r.aiUsed, r.rawViewed]), [[1, 'maintain', 'insufficient', 1, 1, 1], [2, 'increase', 'insufficient', 1, 0, 0]]);
  assert.ok(rows[0].totalMs >= rows[0].activeMs);
  const dl = page.waitForEvent('download'); await page.click('#expScenario'); assert.match((await dl).suggestedFilename(), /^scenario_summary_/);
  assert.deepEqual(errors, []);
  await ctx.close(); await tctx.close();
});

test('第 26 版第三階段：探試模式沒有提示與對錯回饋；按確定才算作答；每題 90 秒到了自動送出；老師可以結束', { skip: skip || !distReady }, async () => {
  await setup();
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/study.html'); await page.waitForSelector('#probeFile');
  await page.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
  await page.waitForFunction(() => /已匯入 demoProbe@1/.test(document.querySelector('#probeMsg')?.textContent || ''));
  const sp = await ctx.newPage(); sp.on('pageerror', e => errors.push(e.message)); sp.on('dialog', d => d.accept());
  await sp.clock.install();
  await sp.addInitScript(() => sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T01', student: 'T01-S02', sessionNo: 4, sessionId: 'x' })));
  await sp.goto(base + '/probe.html'); await sp.waitForSelector('#probeStart'); await sp.click('#probeStart');
  await sp.waitForSelector('[data-step]');
  assert.match(await sp.innerText('.probe'), /第 1 題，共 10 題/);
  assert.equal(await sp.locator('text=提示').count(), 0, '沒有提示');
  // 第 1 題（數格子）：填了沒按確定不算；按確定只顯示「已確定」
  await sp.fill('#in_area', '99'); await sp.fill('#in_area', '12'); await sp.click('[data-ok="area"]');
  assert.equal(await sp.innerText('#done_area'), '已確定');
  await sp.click('[data-step="unit"] [data-opt="平方公分"]'); await sp.click('[data-ok="unit"]');
  // 斷線：送不出去就留在這一題，答案還在，按「再送一次」才送
  const down = r => r.abort(); await sp.route('**/api/probe/*/item', down);
  await sp.click('#submit'); await sp.clock.fastForward(1100); await sp.clock.fastForward(2100); await sp.waitForSelector('#probeRetry');
  assert.match(await sp.innerText('.probe'), /第 1 題/); assert.equal(await sp.inputValue('#in_area'), '12');
  assert.match(await sp.evaluate(() => sessionStorage.getItem('area-probe-run-v26:item')), /"v":12/);
  await sp.unroute('**/api/probe/*/item', down);
  await sp.click('#probeRetry button'); await sp.waitForSelector('.cheer');
  assert.doesNotMatch(await sp.innerText('.cheer'), /對|錯/);
  await sp.clock.fastForward(1500); await sp.waitForFunction(() => /第 2 題/.test(document.querySelector('.probe')?.innerText || ''));
  // 第 2 題：只填不確定，90 秒到了自動送出
  await sp.fill('#in_area', '20');
  await sp.clock.fastForward(91000); await sp.waitForSelector('.cheer'); await sp.clock.fastForward(1500);
  await sp.waitForFunction(() => /第 3 題/.test(document.querySelector('.probe')?.innerText || ''));
  await sp.click('#stopBtn'); await sp.waitForFunction(() => /小測驗做完了/.test(document.querySelector('.probe')?.innerText || ''));
  const runs = await page.evaluate(async () => (await (await fetch('/api/study/export?type=probes')).json()).rows);
  const r = runs.find(x => x.student === 'T01-S02');
  assert.equal(r.status, 'stopped'); assert.equal(r.sessionNo, 4); assert.equal(r.summary.items, 10); assert.equal(r.summary.correct, 1); assert.equal(r.summary.timedOut, 8, '第 2 題逾時加上沒做到的 7 題'); assert.equal(r.summary.unanswered, 9);
  const items = await page.evaluate(async () => (await (await fetch('/api/study/export?type=probeItems')).json()).rows.filter(x => x.student === 'T01-S02'));
  assert.equal(items.length, 3); assert.equal(items[1].result.answered, false, '沒按確定就不算作答'); assert.equal(items[1].result.timedOut, true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('第 26 版第四階段：BC 階段有小老師小方（示範階段先點選小方下一步）、關閉問 AI 與小幫手、教師提示按鈕；A 階段只做小測驗', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { buddyVoice: false, ai: true, buddy: true, __research: { url: '', key: '', teachers: 4, students: 6, server: true } });
  await p.page.evaluate(async () => {
    for (const [participant, phase] of [['T04-S01', 'BC'], ['T04-S02', 'A']]) await fetch('/api/study/phases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'student', participant, phase }) });
  });
  await pickWho(p.page, { teacher: 'T04', num: '01' });
  await p.page.waitForFunction(() => /小老師小方・示範/.test(document.querySelector('#tutor')?.innerText || ''));
  assert.equal(await p.page.evaluate(() => window.areaResearch.phasePatch('rectangle').mode), 'demo');
  await p.start();
  // 示範階段：「看老師做」先鎖住，學生點選小方下一步要做什麼
  await p.page.waitForSelector('#tutorBubble [data-tutor]');
  assert.equal(await p.page.$eval('[data-demo]', b => b.disabled), true);
  const title = await p.page.evaluate(() => { const b = document.querySelector('[data-demo]'); return document.querySelector(`.activity[data-stage="${b.dataset.demo}"] h2, .activity[data-stage="${b.dataset.demo}"] h3`)?.innerText || ''; });
  const options = await p.page.$$eval('#tutorBubble [data-tutor]', bs => bs.map(b => b.innerText));
  assert.ok(options.length >= 2);
  const right = options.find(o => title.includes(o)) || options[0];
  await p.page.click(`#tutorBubble [data-tutor]:text-is("${right}")`);
  assert.equal(await p.page.$eval('[data-demo]', b => b.disabled), false);
  // 示範階段的題末對照：學生猜的下一步和小方做的並列
  await p.page.evaluate(() => { window.__after = 0; window.areaTutor.done([], () => { window.__after++; }); });
  await p.page.waitForSelector('#tutorCompare[open]');
  assert.equal(await p.page.evaluate(() => window.__after), 0, '對照做完以前不離開（例如回學習地圖）');
  assert.match(await p.text('#tutorCompare'), /小方做的[\s\S]*你猜的/);
  assert.match(await p.text('#tutorCompare'), new RegExp(right));
  await p.page.click('#tutorCompareDone');
  assert.equal(await p.page.evaluate(() => window.__after), 1);
  assert.equal(await p.page.$('#buddy'), null, 'BC 階段小方（小幫手）由小老師小方取代');
  assert.equal(await p.page.$('[id^="aiHint"]'), null, '關閉問 AI');
  await p.page.click('[data-tp="gesture"]');
  await p.page.click('#researchFlush'); await p.page.waitForTimeout(500);
  const ev = await p.page.evaluate(async () => (await (await fetch('/api/teacher/research?student=T04-S01')).json()).events);
  const pick = ev.find(r => r.event === '小方示範選擇');
  assert.ok(pick, '記下學生點選小方下一步'); assert.equal(pick.phase, 'BC'); assert.equal(JSON.parse(pick.detail).tutorStage, 'demo');
  assert.ok(ev.some(r => r.event === '教師提示' && JSON.parse(r.detail).level === 'gesture'));
  // 換到 A 階段的學生：只做小測驗
  await p.page.click('#researchNext'); await p.page.click('#researchEndSkip');
  await pickWho(p.page, { teacher: 'T04', num: '02' });
  await p.page.waitForSelector('#researchPhaseOnly[open]');
  assert.match(await p.text('#researchPhaseOnly'), /只做小測驗/);
  assert.deepEqual(p.errors, []);
});

test('第 26 版：平板與手機寬度下，小老師小方不擋按鈕、按鈕夠大、沒有橫向捲動', { skip: skip || !distReady }, async () => {
  const shots = process.env.LAYOUT_SHOTS || '';
  const overlap = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  for (const [name, viewport, num] of [['tablet', { width: 820, height: 1180 }, '07'], ['phone', { width: 390, height: 844 }, '08']]) {
    const p = await student('rectangle', { buddyVoice: false, ai: true, buddy: true, __research: { url: '', key: '', teachers: 4, students: 10, server: true } }, viewport);
    await p.page.evaluate(async n => { await fetch('/api/study/phases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'student', participant: 'T04-S' + n, phase: 'BC' }) }); }, num);
    await pickWho(p.page, { teacher: 'T04', num });
    await p.page.waitForFunction(() => /小老師小方/.test(document.querySelector('#tutor')?.innerText || ''));
    await p.start(); await p.page.waitForSelector('#tutorBubble [data-tutor]');
    const m = await p.page.evaluate(() => {
      const box = el => { if (!el || !el.offsetParent) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
      const tutor = box(document.querySelector('#tutor .tutor-face')), bubble = box(document.querySelector('#tutorBubble'));
      const targets = [...document.querySelectorAll('#check, #next, [data-demo], .teacher-prompts button, #researchBar button')].filter(b => b.offsetParent).map(b => ({ id: b.id || b.dataset.demo || b.dataset.tp || b.innerText.slice(0, 8), ...box(b) }));
      const small = [...document.querySelectorAll('#tutorBubble button, .teacher-prompts button, [data-demo], #check')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 40).map(b => b.innerText.slice(0, 10));
      return { tutor, bubble, targets, small, scroll: document.documentElement.scrollWidth - innerWidth };
    });
    if (shots) await p.page.screenshot({ path: `${shots}/v26-${name}-bc.png`, fullPage: false });
    assert.ok(m.scroll <= 1, `${name}：沒有橫向捲動（多了 ${m.scroll}px）`);
    assert.deepEqual(m.small, [], `${name}：按鈕高度至少 40px`);
    for (const t of m.targets) { assert.ok(!overlap(m.tutor, t), `${name}：小方的頭像擋到 ${t.id}`); }
    // 捲到「看老師做」按鈕時，小方的對話框不能蓋住它
    await p.page.$eval('[data-demo]', b => b.scrollIntoView({ block: 'center' }));
    const demo = await p.page.$eval('[data-demo]', b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const bub = await p.page.$eval('#tutorBubble', b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    assert.ok(!overlap(bub, demo), `${name}：小方的對話框蓋住「看老師做」`);
    // 點小方的頭像可以收起對話框，再點一次打開
    await p.page.click('#tutorFace'); assert.equal(await p.page.$eval('#tutorBubble', b => b.hidden), true);
    await p.page.click('#tutorFace'); assert.equal(await p.page.$eval('#tutorBubble', b => b.hidden), false);
    assert.deepEqual(p.errors, []);
    // 小測驗
    const sp = await p.page.context().newPage();
    await sp.goto(base + '/study.html'); await sp.waitForSelector('#probeFile');
    await sp.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
    await sp.waitForFunction(() => /已匯入 demoProbe@1|匯入過/.test(document.querySelector('#probeMsg')?.textContent || ''));
    await sp.addInitScript(n => sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T04', student: 'T04-S' + n, sessionNo: 1, sessionId: 'x' })), num);
    await sp.goto(base + '/probe.html'); await sp.waitForSelector('#probeStart'); await sp.click('#probeStart'); await sp.waitForSelector('[data-step]');
    const pm = await sp.evaluate(() => ({ scroll: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll('.probe button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 40).map(b => b.innerText.slice(0, 10)) }));
    if (shots) await sp.screenshot({ path: `${shots}/v26-${name}-probe.png`, fullPage: true });
    assert.ok(pm.scroll <= 1, `${name}：小測驗沒有橫向捲動（多了 ${pm.scroll}px）`);
    assert.deepEqual(pm.small, [], `${name}：小測驗按鈕高度至少 40px`);
    await sp.click('#stopBtn').catch(() => {});
    await p.page.context().close();
  }
});

test('第 26 版：小測驗斷線後重新整理，技術缺測與老師結束都會接著送出', { skip: skip || !distReady }, async () => {
  await setup();
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(base + '/study.html'); await page.waitForSelector('#probeFile');
  await page.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
  await page.waitForFunction(() => /已匯入 demoProbe@1|匯入過/.test(document.querySelector('#probeMsg')?.textContent || ''));
  await page.addInitScript(() => { if (!sessionStorage.getItem('area-research-who-v22')) sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T01', student: 'T01-S09', sessionNo: 2, sessionId: 'y' })); });
  await page.goto(base + '/probe.html'); await page.waitForSelector('#probeStart'); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  const down = r => r.abort();
  // 技術問題：送不出去 → 重新整理 → 自動補送，仍然記成技術缺測
  await page.route('**/api/probe/*/item', down);
  await page.click('#techBtn'); await page.waitForSelector('#probeRetry', { timeout: 10000 });
  assert.equal(await page.$eval('#submit', b => b.disabled), true, '交出去之後答案鎖住');
  await page.unroute('**/api/probe/*/item', down);
  await page.reload(); await page.waitForFunction(() => /第 2 題/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  // 老師結束：送不出去 → 重新整理 → 接著送出結束
  await page.route('**/api/probe/*/finish', down);
  await page.click('#stopBtn'); await page.waitForSelector('#probeRetry', { timeout: 10000 });
  await page.unroute('**/api/probe/*/finish', down);
  await page.reload(); await page.waitForFunction(() => /小測驗做完了/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  const run = (await page.evaluate(async () => (await (await fetch('/api/study/export?type=probes')).json()).rows)).find(x => x.student === 'T01-S09');
  assert.equal(run.status, 'stopped');
  const items = await page.evaluate(async () => (await (await fetch('/api/study/export?type=probeItems')).json()).rows.filter(x => x.student === 'T01-S09'));
  assert.equal(items[0].result.tech, true, '重新整理後仍是技術缺測');
  assert.equal(items.length, 2);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('第 26 版：用教師代號或他的班級代碼登入時，只能選這位老師；伺服器拒絕時不開始', { skip: skip || !distReady }, async () => {
  const p = await student('rectangle', { buddyVoice: false, __research: { url: '', key: '', teachers: 4, students: 6, server: true } });
  await p.page.route('**/api/session', async r => { const res = await r.fetch(); r.fulfill({ response: res, json: { ...(await res.json()), workspace: 'T03' } }); });
  await p.page.route('**/api/sessions/start', r => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'not_your_student' }) }));
  await p.page.reload(); await p.page.waitForSelector('#researchWho[open]');
  assert.deepEqual(await p.page.$$eval('#researchWho [data-pick="teacher"] [data-v]', bs => bs.map(b => b.dataset.v)), ['T03']);
  for (const [g, v] of [['num', '01'], ['camera', 'no']]) await p.page.click(`#researchWho [data-pick="${g}"] [data-v="${v}"]`);
  await p.page.click('#researchStart');
  await p.page.waitForFunction(() => /不是這個班級的學生/.test(document.querySelector('#researchWhyNot')?.textContent || ''));
  assert.equal(await p.page.$eval('#researchWho', d => d.open), true, '沒有開始');
  assert.deepEqual(p.errors, []);
  await p.page.context().close();
});

test('第 26 版：上一位學生沒送出去的答案不影響下一位；這台電腦存不了暫存資料時也送得出去', { skip: skip || !distReady }, async () => {
  await setup();
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(base + '/study.html'); await page.waitForSelector('#probeFile');
  await page.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
  await page.waitForFunction(() => /已匯入 demoProbe@1|匯入過/.test(document.querySelector('#probeMsg')?.textContent || ''));
  const as = async student => { await page.evaluate(s => sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T01', student: s, sessionNo: 1, sessionId: 'z' + s })), student); await page.goto(base + '/probe.html'); };
  await as('T01-S11'); await page.waitForSelector('#probeStart'); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  const down = r => r.abort(); await page.route('**/api/probe/*/item', down);
  await page.click('#submit'); await page.waitForSelector('#probeRetry', { timeout: 10000 });
  await page.unroute('**/api/probe/*/item', down);
  // 換下一位：先補送上一位的，再開始這一位的第 1 題
  await as('T01-S12'); await page.waitForSelector('#probeStart'); await page.waitForTimeout(500); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  await page.reload(); await page.waitForSelector('[data-step]');
  assert.match(await page.innerText('.probe'), /第 1 題/, '下一位從第 1 題開始');
  const rows = async s => page.evaluate(async st => (await (await fetch('/api/study/export?type=probeItems')).json()).rows.filter(x => x.student === st), s);
  assert.equal((await rows('T01-S11')).length, 1, '上一位的答案補送了');
  assert.equal((await rows('T01-S12')).length, 0);
  // 存不了暫存資料：記在記憶體裡照樣送出，技術缺測不會不見
  await page.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).includes(':pending')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); }; });
  await page.reload(); await page.waitForSelector('[data-step]');
  await page.click('#techBtn'); await page.waitForFunction(() => /第 2 題/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  assert.equal((await rows('T01-S12'))[0].result.tech, true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('第 26 版：上一位學生的補送回應很慢，也不會讓下一位跳題', { skip: skip || !distReady }, async () => {
  await setup();
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/study.html'); await page.waitForSelector('#probeFile');
  await page.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
  await page.waitForFunction(() => /已匯入 demoProbe@1|匯入過/.test(document.querySelector('#probeMsg')?.textContent || ''));
  const as = async student => { await page.evaluate(s => sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T01', student: s, sessionNo: 1, sessionId: 'w' + s })), student); await page.goto(base + '/probe.html'); };
  await as('T01-S21'); await page.waitForSelector('#probeStart'); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  const old = await page.evaluate(() => JSON.parse(sessionStorage.getItem('area-probe-run-v26')).run);
  const down = r => r.abort(); await page.route('**/api/probe/*/item', down);
  await page.click('#submit'); await page.waitForSelector('#probeRetry', { timeout: 10000 });
  await page.unroute('**/api/probe/*/item', down);
  // 上一位的補送故意慢 3 秒才回來
  await page.route(`**/api/probe/${old}/item`, async r => { await new Promise(x => setTimeout(x, 3000)); await r.continue(); });
  await as('T01-S22'); await page.waitForSelector('#probeStart'); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  await page.waitForTimeout(4000);
  assert.match(await page.innerText('.probe'), /第 1 題/, '舊的回應回來後，下一位還在第 1 題');
  await page.click('#submit'); await page.waitForFunction(() => /第 2 題/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  const rows = async s => page.evaluate(async st => (await (await fetch('/api/study/export?type=probeItems')).json()).rows.filter(x => x.student === st), s);
  assert.equal((await rows('T01-S21')).length, 1); assert.equal((await rows('T01-S22')).length, 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('第 26 版：換好學生、還沒按開始時，上一位的補送回來也不會接回上一位的施測', { skip: skip || !distReady }, async () => {
  await setup();
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/study.html'); await page.waitForSelector('#probeFile');
  await page.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
  await page.waitForFunction(() => /已匯入 demoProbe@1|匯入過/.test(document.querySelector('#probeMsg')?.textContent || ''));
  const as = async student => { await page.evaluate(s => sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T01', student: s, sessionNo: 1, sessionId: 'w' + s })), student); await page.goto(base + '/probe.html'); };
  await as('T01-S31'); await page.waitForSelector('#probeStart'); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  const old = await page.evaluate(() => JSON.parse(sessionStorage.getItem('area-probe-run-v26')).run);
  const down = r => r.abort(); await page.route('**/api/probe/*/item', down);
  await page.click('#submit'); await page.waitForSelector('#probeRetry', { timeout: 10000 });
  await page.unroute('**/api/probe/*/item', down);
  await page.route(`**/api/probe/${old}/item`, async r => { await new Promise(x => setTimeout(x, 1500)); await r.continue(); });
  await as('T01-S32'); await page.waitForSelector('#probeStart');
  await page.waitForTimeout(3000);
  assert.ok(await page.$('#probeStart'), '還停在選題組畫面');
  assert.doesNotMatch(await page.innerText('.probe'), /第 \d 題/);
  await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  await page.click('#submit'); await page.waitForFunction(() => /第 2 題/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  const rows = async s => page.evaluate(async st => (await (await fetch('/api/study/export?type=probeItems')).json()).rows.filter(x => x.student === st), s);
  assert.equal((await rows('T01-S31')).length, 1); assert.equal((await rows('T01-S32')).length, 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('第 26 版：一題確定滿 300 次就鎖住；重新整理後仍鎖住；每一步都確定過就照常交卷', { skip: skip || !distReady }, async () => {
  await setup();
  const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/study.html'); await page.waitForSelector('#probeFile');
  await page.setInputFiles('#probeFile', fileURLToPath(new URL('../scenarios/demo-probe.json', import.meta.url)));
  await page.waitForFunction(() => /已匯入 demoProbe@1|匯入過/.test(document.querySelector('#probeMsg')?.textContent || ''));
  await page.evaluate(() => sessionStorage.setItem('area-research-who-v22', JSON.stringify({ teacher: 'T01', student: 'T01-S41', sessionNo: 1, sessionId: 'wS41' })));
  await page.goto(base + '/probe.html'); await page.waitForSelector('#probeStart'); await page.click('#probeStart'); await page.waitForSelector('[data-step]');
  // 第 1 題：第一步已確定 299 次，其他步驟沒確定；再按一次確定（第 300 次）就鎖住
  const seed = async plan => page.evaluate(plan => {
    const st = JSON.parse(sessionStorage.getItem('area-probe-run-v26')), it = st.items[st.index], saved = JSON.parse(sessionStorage.getItem('area-probe-run-v26:item'));
    const answers = {}; let n = 0;
    it.steps.forEach((s, i) => { const k = plan[i] || 0; if (k) answers[s.key] = { confirms: Array.from({ length: k }, () => ({ v: s.input === 'number' ? 12 : s.options[0], t: 1, n: ++n })) }; });
    sessionStorage.setItem('area-probe-run-v26:item', JSON.stringify({ ...saved, answers }));
    return it.steps.length;
  }, plan);
  await seed([299]); await page.reload(); await page.waitForSelector('[data-step]');
  assert.equal(await page.$('#probeMax'), null, '299 次還沒鎖');
  await page.click('[data-ok]');
  await page.waitForSelector('#probeMax button');
  assert.ok(await page.$eval('#submit', b => b.disabled), '還有步驟沒確定：不能直接交卷');
  await page.reload(); await page.waitForSelector('#probeMax button');
  assert.ok(await page.$eval('[data-ok]', b => b.disabled), '重新整理後仍鎖住');
  await page.click('#probeMax button'); await page.waitForFunction(() => /第 2 題/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  // 第 2 題：每一步都確定過、合計 300 次：鎖住輸入，但可以照常交卷
  const k = await page.evaluate(() => { const st = JSON.parse(sessionStorage.getItem('area-probe-run-v26')); return st.items[st.index].steps.length; });
  await seed([300 - (k - 1), ...Array(k - 1).fill(1)]); await page.reload(); await page.waitForSelector('#probeMax');
  assert.match(await page.innerText('#probeMax'), /記滿/);
  assert.equal(await page.$eval('#submit', b => b.disabled), false);
  await page.click('#submit'); await page.waitForFunction(() => /第 3 題/.test(document.querySelector('.probe')?.innerText || ''), null, { timeout: 10000 });
  const rows = await page.evaluate(async () => (await (await fetch('/api/study/export?type=probeItems')).json()).rows.filter(x => x.student === 'T01-S41'));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.sort((a, b) => a.idx - b.idx).map(r => !!r.result.tech), [true, false], '第 1 題記技術問題，第 2 題照常計分');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------- 第 27 版：表面積教材包 ----------
const SURFACE_MAP = { __map: { pkg: 'surface', assigned: ['sFaces', 'sOpposite', 'sWrap', 'sNet', 'sCubeNet', 'sNetPairs', 'cuboid', 'cube', 'sInverse', 'sWhich', 'sOpenBox', 'sWord', 'sPrismFaces', 'prism', 'cylinder'], path: 'all' } };
test('第 27 版：3-1 長方體的表面積七步驟：打開盒子、配對對面、量三個邊、列式、算一算再比一比、單位', { skip: skip || !distReady }, async () => {
  const p = await act('cuboid', { difficulty: 'standard', ...SURFACE_MAP });
  await p.choose('target', 'inside'); await p.check(); assert.match(await p.text('#feedback0'), /體積/);
  await p.choose('target', 'outside'); await p.check(); await p.next();
  await p.check(); assert.match(await p.text('#feedback1'), /把盒子打開/);
  await p.page.click('#sfOpen'); await p.choose('count', '3'); await p.check(); assert.match(await p.text('#feedback1'), /只看得到 3 個面/);
  await p.choose('count', '6'); await p.check(); await p.next();
  const face = f => p.page.locator(`#figure2 [data-face="${f}"]`).dispatchEvent('click');
  await face('top'); await face('front'); await p.check(); assert.match(await p.text('#feedback2'), /還有 3 組/);
  for (const [a, b] of [['top', 'bottom'], ['front', 'back'], ['left', 'right']]) { await face(a); await face(b); }
  await p.check(); await p.next();
  await p.check(); assert.match(await p.text('#feedback3'), /先點長、寬、高/);
  for (const e of ['l', 'w', 'h']) await p.page.locator(`#figure3 [data-edge="${e}"]`).dispatchEvent('click');
  const fig = await p.text('#figure3');
  const [l, w, h] = ['長', '寬', '高'].map(k => Number(fig.match(new RegExp(k + ' (\\d+)'))[1]));
  await p.page.fill('#len', String(w)); await p.page.fill('#wid', String(l)); await p.page.fill('#hei', String(h)); await p.check(); assert.match(await p.text('#feedback3'), /哪一個是長/);
  await p.page.fill('#len', String(l)); await p.page.fill('#wid', String(w)); await p.check(); await p.next();
  await p.choose('formula', 'three'); await p.check(); assert.match(await p.text('#feedback4'), /只算了 3 個面/);
  // 第一題是「六個面一個一個加」的階段，算式選六個面相加
  assert.doesNotMatch(await p.text('[data-stage="4"] .choice'), /× 2/);
  await p.choose('formula', 'add');
  await p.page.fill('#fa', String(l * w)); await p.page.fill('#fb', String(l * h)); await p.page.fill('#fc', String(w * h + 1)); await p.check(); assert.match(await p.text('#feedback4'), /右面再算一次/);
  await p.page.fill('#fc', String(w * h)); await p.check(); await p.next();
  const half = l * w + l * h + w * h;
  await p.page.fill('#total', String(half)); await p.check(); assert.match(await p.text('#feedback5'), /六個面都要加/);
  await p.page.fill('#total', String(2 * half)); await p.choose('compare', '1'); await p.check(); assert.match(await p.text('#feedback5'), /同一個顏色/);
  await p.choose('compare', '2'); await p.check(); await p.next();
  await p.choose('unit', 'cm3'); await p.check(); assert.match(await p.text('#feedback6'), /體積的單位/);
  await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`表面積是 ${2 * half} 平方公分`));
  // 錯誤的觀察代碼有記下來
  const obs = await p.page.evaluate(() => sessionStorage.getItem('area-records-v16') || '');
  assert.match(obs, /choseVolume|eqHalf|unitVolume/);
  assert.deepEqual(p.errors, []);
});

test('第 27 版：3-2 正方體與教師頁換成表面積教材', { skip: skip || !distReady }, async () => {
  const p = await act('cube', { difficulty: 'easy', ...SURFACE_MAP });
  await p.choose('target', 'outside'); await p.check(); await p.next();
  await p.page.click('#sfOpen'); await p.choose('count', '6'); await p.check(); await p.next();
  await p.choose('same', 'pairs'); await p.check(); assert.match(await p.text('#feedback2'), /一樣大/);
  await p.choose('same', 'all'); await p.check(); await p.next();
  await p.page.locator('#figure3 [data-edge="l"]').dispatchEvent('click');
  const s = Number((await p.text('#figure3')).match(/邊長 (\d+)/)[1]);
  await p.page.fill('#side', String(s)); await p.check(); await p.next();
  await p.choose('formula', 'vol'); await p.check(); assert.match(await p.text('#feedback4'), /體積/);
  await p.choose('formula', 'add'); await p.page.fill('#fa', String(s * s)); await p.check(); await p.next();
  await p.page.fill('#total', String(6 * s * s)); await p.choose('compare', '6'); await p.check(); await p.next();
  await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`表面積是 ${6 * s * s} 平方公分`));
  assert.deepEqual(p.errors, []);
  // 學習地圖只出現表面積的單元
  await p.page.click('.map-link'); await p.page.waitForSelector('.map-card');
  const units = await p.page.$$eval('.map-unit h2', h => h.map(x => x.innerText.trim()).join('|'));
  assert.match(units, /長方體和正方體的表面積/); assert.doesNotMatch(units, /周長和面積/);
  // 教師頁：可以換回面積教材
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/teacher.html'); await page.waitForSelector('[data-pkg="area"]');
  await page.click('[data-pkg="surface"]'); await page.waitForSelector('[data-assign="cuboid"]');
  assert.equal(await page.getAttribute('[data-pkg="surface"]', 'aria-pressed'), 'true');
  assert.match(await page.inputValue('#shape'), /^s|cuboid|cube/);
  await page.click('[data-pkg="area"]'); await page.waitForSelector('[data-assign="rectangle"]');
  assert.equal(await page.$('[data-assign="cuboid"]'), null);
  await page.click('[data-pkg="surface"]'); await page.waitForSelector('[data-assign="cuboid"]');
  assert.deepEqual(errs, []);
  await page.close();
  await publish({});   // 換回面積，免得影響後面的測試
});

test('第 27 版：表面積 15 個活動都能出題、畫圖，照示範做完每一步都對；錯的答案會被擋下', { skip: skip || !distReady }, async () => {
  const p = await act('sOpenBox', { difficulty: 'standard', ...SURFACE_MAP });
  const out = await p.page.evaluate(() => {
    const A = window.areaActs, bad = [];
    const ids = A.packages.surface.activities.map(a => a.id);
    for (const id of ids) {
      const pl = A.get(id); if (!pl) { bad.push(id + ' 沒有註冊'); continue; }
      for (const opt of [{}, { done: 0 }]) for (const level of ['easy', 'standard', 'challenge']) for (let i = 0; i < 6; i++) {
        const problem = pl.makeProblem(level, i, Math.random, opt), answers = {}, state = {};
        const ctx = { answers, state, problem, plugin: pl, settings: {}, method: 'mark', level, hint: () => 2, checked: () => false, invalidate() {}, refreshFigure() {}, rerender() {}, log() {},
          choice: (k, t, items) => items.map(x => x[1]).join('|') };
        try { pl.planFigure && pl.planFigure(ctx); } catch (e) { bad.push(`${id} planFigure ${e.message}`); }
        pl.steps.forEach((st, s) => {
          try { st.figure && st.figure(ctx); st.answer(ctx); } catch (e) { bad.push(`${id} 第${s + 1}步畫面 ${e.message}`); }
          try { st.solve(ctx); const r = st.check(ctx); if (r) bad.push(`${id} ${level} ${i} 第${s + 1}步照示範做卻沒過：${r.msg}`); } catch (e) { bad.push(`${id} 第${s + 1}步 ${e.message}`); }
          try { st.say && (typeof st.say === 'function' ? st.say({ problem }) : 0); } catch (e) { bad.push(`${id} say ${e.message}`); }
        });
        try { pl.done(ctx); } catch (e) { bad.push(`${id} done ${e.message}`); }
      }
    }
    return { bad, n: ids.length };
  });
  assert.equal(out.n, 15); assert.deepEqual(out.bad, []);
  // 4-1 沒有蓋子：實際操作，算成有蓋子的會被擋下
  const q = await p.page.evaluate(() => document.querySelector('.lesson-prompt')?.innerText || '');
  const [l, w, h] = q.match(/\d+/g).map(Number);
  await p.choose('count', '6'); await p.check(); assert.match(await p.text('#feedback0'), /蓋子/);
  await p.choose('count', '5'); await p.check(); await p.next();
  await p.page.fill('#fa', String(l * w)); await p.page.fill('#fb', String(l * h)); await p.page.fill('#fc', String(w * h)); await p.check(); await p.next();
  await p.page.fill('#total', String(2 * (l * w + l * h + w * h))); await p.check(); assert.match(await p.text('#feedback2'), /少算上面/);
  await p.page.fill('#total', String(l * w + 2 * l * h + 2 * w * h)); await p.check(); await p.next();
  await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`${l * w + 2 * l * h + 2 * w * h} 平方公分`));
  assert.deepEqual(p.errors, []);
  // 2-2 正方體展開圖：5 個正方形的會被擋下
  const c = await act('sCubeNet', SURFACE_MAP);
  await c.choose('six', '6'); await c.check(); await c.next();
  const opts = await c.page.evaluate(() => [...document.querySelectorAll('.sf-nets figure')].map(f => [f.querySelector('figcaption').innerText, f.querySelectorAll('rect').length]));
  assert.equal(opts.length, 3);
  const five = opts.find(o => o[1] === 5);
  if (five) { await c.choose('net', five[0]); await c.check(); assert.match(await c.text('#feedback1'), /不是 6 個/); }
  assert.deepEqual(c.errors, []);
});

test('第 27 版第 1 輪修正：換教材再換回保留指派；2-1 依實際大小判斷幾種；4-1 展開圖只有 5 個面；紀錄有版本與尺寸', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ __map: { assigned: ['compare', 'tile', 'rectangle'], path: 'custom' } });
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/teacher.html');   // 草稿也換成同一份（教師頁先讀草稿）
  await page.evaluate(async () => { const r = await (await fetch('/api/teacher/lessons')).json(); await fetch('/api/teacher/lessons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'draft', config: r.published }) }); });
  await page.reload(); await page.waitForSelector('[data-pkg="surface"]');
  await page.click('[data-pkg="surface"]'); await page.waitForSelector('[data-assign="cuboid"]');
  await page.uncheck('[data-assign="sWord"]');
  await page.click('[data-pkg="area"]'); await page.waitForSelector('[data-assign="rectangle"]');
  const on = () => page.$$eval('[data-assign]:checked', l => l.map(x => x.dataset.assign));
  assert.deepEqual(await on(), ['compare', 'tile', 'rectangle'], '切回面積：原本的指派還在');
  await page.click('[data-pkg="surface"]'); await page.waitForSelector('[data-assign="cuboid"]');
  assert.ok(!(await on()).includes('sWord'), '切回表面積：剛剛的勾選也還在');
  await page.click('#saveDraft'); await page.waitForFunction(() => /草稿/.test(document.querySelector('#status')?.textContent || ''));
  assert.deepEqual(errs, []); await page.close();
  // 2-1、4-1 的圖與判斷
  const p = await act('sNet', { difficulty: 'easy', ...SURFACE_MAP });
  const r = await p.page.evaluate(() => { const pl = window.areaActs.get('sNet'), ob = window.areaActs.get('sOpenBox');
    const k = pr => { const c = { answers: {}, state: {}, problem: pr }; pl.steps[2].solve(c); return c.answers.kinds; };
    const net = ob.steps[1].figure({ problem: { l: 4, w: 3, h: 2 }, answers: {}, state: {} });
    const label = pl.steps[1].figure({ problem: { l: 4, w: 3, h: 2, find: 'top' }, answers: {}, state: {}, checked: () => false, hint: () => 0 });
    return { k322: k({ l: 3, w: 2, h: 2 }), k432: k({ l: 4, w: 3, h: 2 }), k222: k({ l: 2, w: 2, h: 2 }), faces: (net.match(/class="sf-net/g) || []).length, none: /沒有上面/.test(net), front: />前面</.test(label) && !/>上面</.test(label) }; });
  assert.deepEqual(r, { k322: '2', k432: '3', k222: '1', faces: 5, none: true, front: true });
  const rec = await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16') || '[]').find(x => x.event === '整題定標'));
  assert.equal(rec.siteVersion, 'v28'); assert.ok(rec.dimensions.every(n => n > 0), '表面積的題目尺寸有記下來');
  assert.match(await p.page.title(), /表面積/); assert.match(await p.text('header .brand'), /表面積/);
  assert.deepEqual(p.errors, []);
  await publish({});
});

test('第 27 版（柱體）：5-2 三角柱打開數面、底面忘了除以 2 會被擋、側面積連帶判定；長方體第 3 題起改用 × 2', { skip: skip || !distReady }, async () => {
  const p = await act('prism', { difficulty: 'easy', ...SURFACE_MAP });
  const [a, b, c, h] = (await p.text('.lesson-prompt')).match(/\d+/g).map(Number);
  await p.choose('target', 'outside'); await p.check(); await p.next();
  await p.page.click('#sfOpen'); await p.choose('count', '3'); await p.check(); assert.match(await p.text('#feedback1'), /底面/);
  await p.choose('count', '5'); await p.check(); await p.next();
  await p.page.fill('#base', String(a * b)); await p.check(); assert.match(await p.text('#feedback2'), /除以 2/);
  await p.page.fill('#base', String(a * b / 2)); await p.check(); await p.next();
  await p.page.fill('#perim', String(a + b)); await p.check(); assert.match(await p.text('#feedback3'), /斜邊/);
  await p.page.fill('#perim', String(a + b + c)); await p.page.fill('#side', String((a + b + c) * h)); await p.check(); await p.next();
  const tb = a * b / 2, side = (a + b + c) * h;
  await p.choose('formula', 'one'); await p.check(); assert.match(await p.text('#feedback4'), /2 個/);
  await p.choose('formula', 'two'); await p.page.fill('#total', String(tb + side)); await p.check(); assert.match(await p.text('#feedback4'), /只加了 1 個底面/);
  await p.page.fill('#total', String(2 * tb + side)); await p.check(); await p.next();
  await p.choose('unit', 'cm2'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`表面積是 ${2 * tb + side} 平方公分`));
  assert.match(await p.page.evaluate(() => sessionStorage.getItem('area-records-v16') || ''), /eqDouble|oneBase/);
  assert.deepEqual(p.errors, []);
  // 第 3 輪：5-1 底面形狀的選項不重複；兩個底面都漏記 missBases、漏一個記 oneBase
  const r3 = await p.page.evaluate(() => { const pl = window.areaActs.get('sPrismFaces'), st = pl.steps;
    const dup = [3, 4, 5, 6].map(n => { const ctx = { problem: { n }, answers: {}, hint: () => 0, choice: (k, t, items) => '#' + items.map(x => x[0]).join('|') + '#' }; const o = st[1].answer(ctx).split('#')[1].split('|'); return o.length - new Set(o).size; });
    const obs = v => st[3].check({ problem: { n: 3 }, answers: { sides: '3', count: String(v) } })?.obs;
    return { dup, a: obs(3), b: obs(4), c: obs(5) }; });
  assert.deepEqual(r3, { dup: [0, 0, 0, 0], a: 'missBases', b: 'oneBase', c: undefined });
  // 5-1、5-3 的畫面可以打開，不會出錯
  for (const id of ['sPrismFaces', 'cylinder']) { const q = await act(id, SURFACE_MAP); assert.ok(await q.page.$('#figure0 svg')); assert.deepEqual(q.errors, []); }
  // 長方體：已經做完 2 題，下一題的算式改成 × 2
  const r0 = await act('cuboid', SURFACE_MAP);
  const stage = await r0.page.evaluate(() => [0, 1, 2, 3].map(done => window.areaActs.get('cuboid').makeProblem('standard', 0, Math.random, { done }).add));
  assert.deepEqual(stage, [true, true, false, false]);
  // 學生頁真的把做完的題數傳給出題：記 2 題完成後重新進來，第 1 步看不出來，但示範例題要用同一個階段
  const pg = await r0.page.context().newPage(), errs2 = []; pg.on('pageerror', e => errs2.push(e.message));
  await pg.addInitScript(() => { if (!sessionStorage.getItem('area-records-v16')) sessionStorage.setItem('area-records-v16', JSON.stringify([1, 2].map(i => ({ event: '整題完成', actId: 'cuboid', cycle: i, t: Date.now() })))); });
  await pg.goto(`${base}/seven.html?a=cuboid`); await pg.waitForSelector('#start');
  const r = { page: pg, errors: errs2, choose: (k, v) => pg.click(`[data-choice="${k}"][data-value="${v}"]`), check: async () => { await pg.click('#check'); await pg.waitForTimeout(60); }, next: async () => { await pg.click('#next'); await pg.waitForTimeout(60); }, text: sel => pg.evaluate(x => document.querySelector(x)?.innerText ?? '', sel) };
  await begin(r);
  await r.choose('target', 'outside'); await r.check(); await r.next(); await r.page.click('#sfOpen'); await r.choose('count', '6'); await r.check(); await r.next();
  for (const [x, y] of [['top', 'bottom'], ['front', 'back'], ['left', 'right']]) { await r.page.locator(`#figure2 [data-face="${x}"]`).dispatchEvent('click'); await r.page.locator(`#figure2 [data-face="${y}"]`).dispatchEvent('click'); }
  await r.check(); await r.next();
  for (const e of ['l', 'w', 'h']) await r.page.locator(`#figure3 [data-edge="${e}"]`).dispatchEvent('click');
  const f3 = await r.text('#figure3'), [L3, W3, H3] = ['長', '寬', '高'].map(k => Number(f3.match(new RegExp(k + ' (\\d+)'))[1]));
  await r.page.fill('#len', String(L3)); await r.page.fill('#wid', String(W3)); await r.page.fill('#hei', String(H3)); await r.check(); await r.next();
  assert.match(await r.text('[data-stage="4"] .choice'), /× 2/, '第 3 題起算式有 × 2');
  assert.deepEqual(r.errors, []);
});

// ---------- 第 28 版：折線圖教材包 ----------
const LINE_IDS = ['lnTable', 'lnScale', 'lnParts', 'lnMatch', 'lnRead', 'lnFind', 'lnBetween', 'lnTrend', 'lnMost', 'lnTwo', 'lnChoose', 'lnThree', 'lnDraw', 'lnSetScale', 'lnBreak', 'lnDrawTwo', 'lnRecord', 'lnTell'];
const LINE_MAP = { __map: { pkg: 'line', assigned: LINE_IDS, path: 'all' } };
test('第 28 版：折線圖 18 個活動都能出題、畫圖，照示範做完每一步都對；空白的不會過', { skip: skip || !distReady }, async () => {
  const p = await act('lnRead', { difficulty: 'standard', ...LINE_MAP });
  const out = await p.page.evaluate(() => {
    const A = window.areaActs, bad = [];
    const ids = A.packages.line.activities.map(a => a.id);
    for (const id of ids) {
      const pl = A.get(id); if (!pl) { bad.push(id + ' 沒有註冊'); continue; }
      for (const level of ['easy', 'standard', 'challenge']) for (let i = 0; i < 6; i++) {
        const problem = pl.makeProblem(level, i, Math.random), answers = {}, state = {};
        const ctx = { answers, state, problem, plugin: pl, settings: {}, method: 'mark', level, hint: () => 2, checked: () => false, invalidate() {}, refreshFigure() {}, rerender() {}, log() {}, choice: (k, t, items) => items.map(x => x[1]).join('|') };
        try { pl.planFigure && pl.planFigure(ctx); } catch (e) { bad.push(`${id} planFigure ${e.message}`); }
        pl.steps.forEach((st, s) => {
          try { const html = (st.figure ? st.figure(ctx) : '') + st.answer(ctx); if (/undefined|NaN/.test(html)) bad.push(`${id} 第${s + 1}步畫面有 undefined/NaN`); } catch (e) { bad.push(`${id} 第${s + 1}步畫面 ${e.message}`); }
          try { if (!st.check(ctx)) bad.push(`${id} 第${s + 1}步沒作答也過`); st.solve(ctx); const r = st.check(ctx); if (r) bad.push(`${id} ${level} ${i} 第${s + 1}步照示範做卻沒過：${r.msg}`); } catch (e) { bad.push(`${id} 第${s + 1}步 ${e.message}`); }
        });
        try { pl.done(ctx); } catch (e) { bad.push(`${id} done ${e.message}`); }
      }
    }
    return { bad, n: ids.length, paths: Object.keys(A.packages.line.paths) };
  });
  assert.equal(out.n, 18); assert.deepEqual(out.bad, []); assert.deepEqual(out.paths, ['grade4', 'grade5', 'all']);
  assert.deepEqual(p.errors, []);
});

test('第 28 版：2-1 讀圖七步：找零件、一格是多少、點橫軸、讀數值（一格當 1 會記 scaleAsOne）、比較、說根據', { skip: skip || !distReady }, async () => {
  const p = await act('lnRead', { difficulty: 'standard', ...LINE_MAP });
  await p.choose('ask', 'max'); await p.check(); assert.match(await p.text('#feedback0'), /再讀一次題目/);
  await p.choose('ask', 'value'); await p.check(); await p.next();
  await p.choose('xax', 'y'); await p.choose('yax', 'x'); await p.check(); assert.match(await p.text('#feedback1'), /對調/);
  await p.choose('xax', 'x'); await p.choose('yax', 'y'); await p.check(); await p.next();
  // 縱軸每 2 格才寫一個數：讀出一格
  const ticks = await p.page.$$eval('#figure2 .ln-ytick', l => l.map(e => Number(e.textContent)));
  const step = (ticks[1] - ticks[0]) / 2, unit = (await p.page.$$eval('#figure2 .ln-name', l => l.map(e => e.textContent).join(' '))).match(/（(.+?)）/)[1];
  await p.page.fill('#scale', '1'); await p.check(); assert.match(await p.text('#feedback2'), /一格不是 1/);
  await p.page.fill('#scale', String(step)); await p.check(); await p.next();
  const day = (await p.text('[data-stage="3"] .answer')).match(/問的是(.+?)。/)[1];
  const xs = await p.page.$$eval('#figure3 [data-x]', l => l.map(e => e.getAttribute('aria-label')));
  const ti = xs.indexOf(day); assert.ok(ti > 0);
  await p.page.locator(`#figure3 [data-x="${ti - 1}"]`).dispatchEvent('click'); await p.check(); assert.match(await p.text('#feedback3'), /題目問的是/);
  await p.page.locator(`#figure3 [data-x="${ti}"]`).dispatchEvent('click'); await p.check(); await p.next();
  const label = await p.page.$eval('#figure4 svg', s => s.getAttribute('aria-label'));
  const v = Number(label.match(new RegExp('[：、]' + day + ' (\\d+)'))[1]);
  await p.page.fill('#val', String(v / step)); await p.check();
  if (step !== 1) assert.match(await p.text('#feedback4'), /一格不是 1|再看一次|隔壁/);
  await p.page.fill('#val', String(v)); await p.check(); await p.next();
  const prev = Number(label.match(new RegExp('[：、]' + xs[ti - 1] + ' (\\d+)'))[1]);
  await p.choose('cmp', v > prev ? 'more' : v < prev ? 'less' : 'same'); await p.check(); await p.next();
  await p.choose('why', 'guess'); await p.page.click('[data-choice="unit"]'); await p.check(); assert.match(await p.text('#feedback6'), /單位|根據/);
  await p.choose('unit', unit); await p.choose('why', 'see'); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), new RegExp(`${v} ${unit}`));
  assert.match(await p.page.evaluate(() => sessionStorage.getItem('area-records-v16') || ''), /scaleAsOne|swapped/);
  assert.deepEqual(p.errors, []);
});

test('第 28 版：5-1 畫圖七步：排橫軸、描點（漏描、位置不對會擋）、照順序連線、寫標示', { skip: skip || !distReady }, async () => {
  const p = await act('lnDraw', { difficulty: 'easy', ...LINE_MAP });
  await p.choose('title', 'a'); await p.check(); assert.match(await p.text('#feedback0'), /標題/);
  await p.choose('title', 'ok'); await p.check(); await p.next();
  const n = await p.page.$$eval('[data-chip]', l => l.length);
  await p.page.click('[data-chip="1"]'); for (let i = 0; i < n; i++) if (i !== 1) await p.page.click(`[data-chip="${i}"]`);
  await p.check(); assert.match(await p.text('#feedback1'), /順序不對/);
  await p.page.click('#lnUnorder'); for (let i = 0; i < n; i++) await p.page.click(`[data-chip="${i}"]`);
  await p.check(); await p.next();
  const t2 = await p.page.$$eval('#figure2 .ln-ytick', l => l.map(e => Number(e.textContent))), step = t2[1] - t2[0];
  await p.choose('scale', String(step === 1 ? 2 : 1)); await p.check(); assert.match(await p.text('#feedback2'), new RegExp(`差 ${step}`));
  await p.choose('scale', String(step)); await p.check(); await p.next();
  const vals = await p.page.$$eval('#figure3 .ln-table tbody td', l => l.map(e => Number(e.textContent)));
  await p.page.locator(`#figure3 [data-cell="0:${vals[0]}"]`).dispatchEvent('click');
  await p.check(); assert.match(await p.text('#feedback3'), /還有|0 的也要描/);
  const off = vals[1] === Math.max(...vals) ? vals[1] - step : vals[1] + step;
  await p.page.locator(`#figure3 [data-cell="1:${off}"]`).dispatchEvent('click');
  for (let i = 2; i < n; i++) await p.page.locator(`#figure3 [data-cell="${i}:${vals[i]}"]`).dispatchEvent('click');
  await p.check(); assert.match(await p.text('#feedback3'), /位置不對/);
  await p.page.locator(`#figure3 [data-cell="1:${off}"]`).dispatchEvent('click');
  await p.page.locator(`#figure3 [data-cell="1:${vals[1]}"]`).dispatchEvent('click');
  await p.check(); await p.next();
  await p.page.locator('#figure4 [data-link="0"]').dispatchEvent('click'); await p.page.locator('#figure4 [data-link="2"]').dispatchEvent('click');
  await p.check(); assert.match(await p.text('#feedback4'), /順序/);
  await p.page.click('#lnUnlink');
  for (let i = 0; i < n; i++) await p.page.locator(`#figure4 [data-link="${i}"]`).dispatchEvent('click');
  assert.equal(await p.page.$$eval('#figure4 path.ln-line', l => l.length), n - 1, '連了 n-1 段');
  await p.check(); await p.next();
  const unit = (await p.text('#figure5')).match(/（(.+?)）/)[1];
  await p.choose('yname', 'y'); await p.choose('unit', unit); await p.check(); await p.next();
  const mx = vals.indexOf(Math.max(...vals));
  await p.choose('same', 'yes'); await p.choose('max', String(mx)); await p.check(); await p.next();
  assert.match(await p.text('.done-banner'), /折線圖畫好了/);
  assert.match(await p.page.evaluate(() => sessionStorage.getItem('area-records-v16') || ''), /orderJump/);
  assert.deepEqual(p.errors, []);
});

test('第 28 版：學習地圖換成折線圖；單元 0 是先測，照順序時全對才打開後面', { skip: skip || !distReady }, async () => {
  await setup(); await publish({ __map: { pkg: 'line', assigned: ['lnTable', 'lnScale', 'lnParts'], sequential: true } });
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  // 0-1 做過一題但有答錯：還沒通過，0-2 打開（0-1 已完成一題）但 1-1 要等 0-1、0-2 都全對
  await page.addInitScript(() => { if (!sessionStorage.getItem('area-records-v16')) sessionStorage.setItem('area-records-v16', JSON.stringify([{ event: '整題完成', actId: 'lnTable', cycle: 1, errors: 2, hints: 1, t: Date.now() }])); });
  await page.goto(base + '/seven.html'); await page.waitForSelector('.map-card');
  const units = await page.$$eval('.map-unit h2', h => h.map(x => x.innerText.trim()).join('|'));
  assert.match(units, /準備好了嗎/); assert.doesNotMatch(units, /周長和面積/);
  assert.match(await page.innerText('[data-map="lnTable"]'), /再練到全對/);
  assert.ok(await page.$('.map-card.locked[data-map="lnScale"]'), '0-1 還沒全對，0-2 鎖住');
  await page.evaluate(() => { const r = JSON.parse(sessionStorage.getItem('area-records-v16')); r.push({ event: '整題完成', actId: 'lnTable', cycle: 2, errors: 0, hints: 0, t: Date.now() }); sessionStorage.setItem('area-records-v16', JSON.stringify(r)); });
  await page.reload(); await page.waitForSelector('.map-card');
  assert.match(await page.innerText('[data-map="lnTable"]'), /先測全對/);
  assert.equal(await page.$('.map-card.locked[data-map="lnScale"]'), null, '0-1 全對，0-2 打開');
  assert.deepEqual(errs, []); await ctx.close();
  await publish({});
});

test('第 28 版第 1 輪複測：6-1 奇數點得上去；答對後改錯要重新檢查；重新整理接著做；6-2 用自己的圖；折線圖有自己的自問句', { skip: skip || !distReady }, async () => {
  const p = await act('lnRecord', { difficulty: 'standard', selfAsk: true, ...LINE_MAP });
  await p.choose('item', 'water'); await p.check(); await p.next();
  const v = [11, 12, 13, 15, 14]; for (let j = 0; j < 5; j++) await p.page.fill('#d' + j, String(v[j]));
  await p.check(); await p.next();
  assert.deepEqual(JSON.parse(await p.page.evaluate(() => sessionStorage.getItem('act-draft-v28'))).problem.dims, [5, 1, 15], '紀錄尺寸用自己的資料');
  for (let j = 0; j < 5; j++) assert.ok(await p.page.$(`#figure2 [data-cell="${j}:${v[j]}"]`), `${v[j]} 點得上去`);
  for (let j = 0; j < 5; j++) await p.page.locator(`#figure2 [data-cell="${j}:${v[j]}"]`).dispatchEvent('click');
  // 重新整理：題目、填的數、描的點都還在，接著在第 3 步
  await p.page.reload(); await p.page.waitForSelector('#figure2 [data-cell]');
  assert.match(await p.text('.ln-table'), /11/, '填的數還在');
  await p.check(); assert.ok(await p.page.$('#next:not(.locked)'), '答對可以往下');
  await p.page.locator('#figure2 [data-cell="0:11"]').dispatchEvent('click'); await p.page.locator('#figure2 [data-cell="0:10"]').dispatchEvent('click');
  assert.ok(await p.page.$('#next.locked'), '改錯後要重新檢查');
  await p.page.locator('#figure2 [data-cell="0:10"]').dispatchEvent('click'); await p.page.locator('#figure2 [data-cell="0:11"]').dispatchEvent('click');
  await p.check(); await p.next();
  assert.match(await p.page.evaluate(() => sessionStorage.getItem('area-records-v16') || ''), /重新整理後接著做/);
  await p.page.goto(`${base}/seven.html?a=lnTell`); await p.page.waitForSelector('#start');
  await begin(p);
  assert.match(await p.text('#app'), /記錄一週/); assert.match(await p.text('#app'), /我每天喝水的杯數/);
  await p.page.goto(`${base}/seven.html?a=lnRead`); await p.page.waitForSelector('#start'); await begin(p);
  const ask = await p.text('.step-ask'); assert.match(ask, /哪個時間/); assert.doesNotMatch(ask, /圖形裡面/);
  assert.deepEqual(p.errors, []);
});

test('第 28 版第 2 輪複測：重新整理後還是同一題（題號、答錯次數接著算）；波浪線題的提示不說半格', { skip: skip || !distReady }, async () => {
  const p = await act('lnChoose', { difficulty: 'standard', ...LINE_MAP });
  const no = async () => (await p.text('.eyebrow')).match(/第 (\d+) 題/)[1];
  const before = await no();
  await p.choose('c0', 'line'); await p.check(); assert.match(await p.text('#feedback0'), /沒有時間的順序/);
  await p.page.reload(); await p.page.waitForSelector('#check');
  assert.equal(await no(), before, '重新整理後題號不變');
  await p.choose('c0', 'bar'); await p.check(); await p.next();
  await p.choose('c1', 'line'); await p.check(); await p.next();
  await p.choose('meaning', 'none'); await p.check(); await p.next();
  const recs = JSON.parse(await p.page.evaluate(() => sessionStorage.getItem('area-records-v16')));
  const wrong = recs.filter(r => r.event === '步驟檢核' && r.actId === 'lnChoose' && !r.correct);
  assert.equal(wrong.length, 1); assert.equal(String(wrong[0].cycle), before, '答錯記在同一題');
  assert.doesNotMatch(await p.text('#app'), /每一步都一次就答對/);
  const h = await p.page.evaluate(() => { const pl = window.areaActs.get('lnBetween'), s = x => pl.forProblem(x).steps.find(t => t.title === '讀數值'); return [s({ brk: true }).hints.join(), s({ brk: false }).hints.join(), pl.forProblem({ brk: true }).chant]; });
  assert.doesNotMatch(h[0] + h[2], /半格/); assert.match(h[1], /半格/);
  assert.deepEqual(p.errors, []);
});

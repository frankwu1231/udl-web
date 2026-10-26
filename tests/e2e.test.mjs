// 端對端測試：用真的瀏覽器操作學生頁與教師頁（第 16 版）。
// 需要 Playwright；沒有安裝時自動略過。可用 PLAYWRIGHT_MODULE 指定 playwright 的 index.mjs 路徑。
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';

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
  const env = { TEACHER_EMAIL: 'preview@example.test', DB: makeD1() };
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
    for (const k of ['rectangle', 'square', 'triangle', 'parallelogram']) c[k].settings = { ...c[k].settings, ...s };
    for (const k of Object.keys(c.activities || {})) c.activities[k].settings = { ...c.activities[k].settings, ...s };
    c.map = { assigned: window.areaActs.LIST.map(a => a.id), sequential: false, path: 'all', ...map };
    return (await fetch('/api/teacher/lessons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'published', config: c }) })).status;
  }, { flow: 'seven', keep: [0, 1, 2, 3], support: 'full', labels: 'reveal', ai: true, reward: false, sound: false, hintGate: false, mode: 'self', goalKind: 'hints', confidence: true, selfAsk: true, badges: true, voice: false, rest: 0, handsOn: false, methods: ['mark', 'row', 'self'], zhuyin: false, textSize: 'normal', contrast: false, video: 'hint', difficulty: 'standard', convert: false, ...settings });
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
  await p.page.fill('#total', '8'); await p.check();
  assert.match(await p.text('#feedback5'), /算對了/);
  assert.equal(await p.page.$('#hintText5:not([hidden])'), null, '只差比一比時不升提示');
  await p.page.click('#teacher');
  assert.match(await p.text('.stats'), /算一算、比一比\s+0/);
  await p.page.click('#closeTools');
  // AI 回覆在下一個動作後仍在
  await p.page.fill('#total', '9'); await p.check(); await p.check();
  await p.page.click('#aiHint5'); await p.page.waitForTimeout(150);
  assert.match(await p.text('#hintText5'), /AI 現在不能用/);
  await p.page.fill('#total', '8'); await p.page.waitForTimeout(50); await p.choose('verify', 'match');
  assert.match(await p.text('#hintText5'), /AI 現在不能用/);
  // 換圖形後紀錄仍在
  const before = await p.page.evaluate(() => JSON.parse(sessionStorage.getItem('area-records-v16')).length);
  await p.page.goto(`${base}/seven.html?shape=square`); await p.page.waitForSelector('#start');
  await p.page.click('#teacher');
  assert.match(await p.text('#toolBody'), new RegExp(`目前 ${before} 筆紀錄`));
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
  const p = await student('square', { flow: 'three' }), page = p.page;
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
  assert.match(await p.text('.goal-vs'), /用了 2 個提示.*還沒達到.*一起看一下/);
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
  await t.setInputFiles('[data-vupload="1"]', new URL('./fixtures/sample.webm', import.meta.url).pathname);
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
  await p.check(); await p.check(); await p.check();
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
  await q.page.fill('#kinds', '6'); await q.check(); assert.match(await q.text('#feedback2'), /轉過來/);
  await q.page.fill('#kinds', '3'); await q.check(); await q.next();
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

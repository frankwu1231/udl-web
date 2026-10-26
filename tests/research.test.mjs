// 第 22 版現場試用紀錄：在 Node 裡用假的 Google 試算表執行 research/試用紀錄.gs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fakeBook() {
  const sheets = new Map();
  const sheet = name => {
    const rows = [];
    const sh = {
      name, rows,
      getLastRow: () => rows.length,
      getRange: (r, c, nr = 1, nc = 1) => ({
        setValues(v) { assert.equal(v.length, nr); v.forEach((row, i) => { assert.equal(row.length, nc); rows[r - 1 + i] = [...(rows[r - 1 + i] || [])]; row.forEach((x, j) => { rows[r - 1 + i][c - 1 + j] = x; }); }); return this; },
        setFontWeight() { return this; }
      }),
      getDataRange: () => ({ getValues: () => rows.map(r => [...r]) }),
      setFrozenRows() {}, clearContents() { rows.length = 0; }
    };
    return sh;
  };
  return {
    sheets,
    getName: () => '試用紀錄',
    getSheetByName: n => sheets.get(n) || null,
    insertSheet: n => { const s = sheet(n); sheets.set(n, s); return s; }
  };
}
function load(passcode = 'field-2026') {
  const book = fakeBook(), cache = new Map();
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ setMimeType: () => JSON.parse(t) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ getAll: keys => Object.fromEntries(keys.filter(k => cache.has(k)).map(k => [k, cache.get(k)])), putAll: m => Object.entries(m).forEach(([k, v]) => cache.set(k, v)) }) }
  };
  const src = fs.readFileSync(new URL('../research/試用紀錄.gs', import.meta.url), 'utf8').replace("const PASSCODE = '請改成你的通行碼';", `const PASSCODE = '${passcode}';`);
  vm.createContext(ctx); vm.runInContext(src + '\nthis.api = { setup, doPost, buildSummaries, summaries, SHEETS };', ctx);
  const post = body => ctx.api.doPost({ postData: { contents: JSON.stringify(body) } });
  return { book, api: ctx.api, post };
}
const row = (sheet, extra = {}) => ({ rid: Math.random().toString(36).slice(2), sheet, time: '2026-10-27 09:00:00', version: 'v22', sessionId: '20261027-T01-S01-ab12', teacher: 'T01', student: 'T01-S01', ...extra });

test('試用紀錄：setup 建立工作表與標題；通行碼不對就拒收；ping 回傳試算表名稱', () => {
  const { book, api, post } = load();
  api.setup();
  for (const n of ['場次', '操作紀錄', '每題摘要', '教師設定', '教師觀察', '學生回饋', '教師回饋', '技術問題', '代號表', '學生摘要', '教師摘要']) assert.ok(book.sheets.has(n), n);
  assert.deepEqual(book.sheets.get('場次').rows[0].slice(0, 6), ['紀錄編號', '時間', '版本', '場次編號', '教師代號', '學生代號']);
  api.setup(); assert.equal(book.sheets.get('場次').rows.length, 1, '重複執行不會再加標題');
  assert.deepEqual(post({ key: 'wrong', rows: [row('場次')] }), { ok: false, error: 'bad_key' });
  assert.equal(book.sheets.get('場次').rows.length, 1);
  assert.deepEqual(post({ key: 'field-2026', ping: true }), { ok: true, spreadsheet: '試用紀錄' });
  assert.equal(load('請改成你').post({ key: '請改成你', ping: true }).ok, true);
  assert.deepEqual(load('abc').post({ key: 'abc', ping: true }), { ok: false, error: 'bad_key' }, '通行碼太短不能用');
});

test('試用紀錄：依工作表分開寫入、欄位對齊標題、多的欄位放進「其他」、重送不重複、公式開頭的文字不會被執行、不認得的工作表不寫', () => {
  const { book, post } = load();
  const a = row('操作紀錄', { activity: '長方形', event: '步驟檢核', correct: '否', detail: '{"x":1}', mystery: 'yes' });
  const b = row('教師觀察', { kind: '教師即時紀錄', tag: '老師幫忙了', note: '=HYPERLINK("x")' });
  const out = post({ key: 'field-2026', rows: [a, b, row('不存在的表'), { sheet: '場次' }] });
  assert.equal(out.ok, true); assert.deepEqual(out.saved, [a.rid, b.rid]);
  const ops = book.sheets.get('操作紀錄').rows, head = ops[0];
  assert.equal(ops.length, 2);
  assert.equal(ops[1][head.indexOf('事件')], '步驟檢核'); assert.equal(ops[1][head.indexOf('學生代號')], 'T01-S01');
  assert.equal(ops[1][head.indexOf('其他')], '{"mystery":"yes"}');
  const obs = book.sheets.get('教師觀察').rows;
  assert.equal(obs[1][obs[0].indexOf('實際行為')], `'=HYPERLINK("x")`);
  assert.ok(!book.sheets.has('不存在的表'));
  assert.deepEqual(post({ key: 'field-2026', rows: [a] }).saved, [a.rid], '重送也回報已存，網站才會從佇列拿掉');
  assert.equal(book.sheets.get('操作紀錄').rows.length, 2, '重送不重複寫');
});

test('試用紀錄：學生摘要與教師摘要（接受率、專心提醒、老師幫忙、代號表的背景與前後測）', () => {
  const { book, api, post } = load();
  api.setup();
  book.sheets.get('代號表').rows.push(['T01-S01', 'T01', '四年級', '輕度智能障礙', '是', 40, 70, '有', '有', '']);
  const q = extra => row('每題摘要', { activity: '長方形', cycle: 1, secs: 100, errors: 2, hints: 1, buddyOffers: 2, buddyAccepted: 1, attentionReminds: 1, teacherHelp: 0, buddyWrong: 0, ...extra });
  post({ key: 'field-2026', rows: [row('場次', { kind: '開始' }), q(), q({ secs: 60, errors: 0, buddyOffers: 2, buddyAccepted: 2, teacherHelp: 1 }), row('學生回饋', { kind: '學生心情', mood: '😀 很好' }),
    row('教師回饋', { engage: '4', buddyUseful: '5 很有幫助', fix: '提醒太快' }), row('每題摘要', { teacher: 'T02', student: 'T02-S01', secs: 30, buddyOffers: 0 })] });
  api.buildSummaries();
  const s = book.sheets.get('學生摘要').rows, h = s[0], s1 = s.find(r => r[0] === 'T01-S01');
  const get = k => s1[h.indexOf(k)];
  assert.equal(get('完成題數'), 2); assert.equal(get('平均秒數'), 80); assert.equal(get('平均答錯'), 1);
  assert.equal(get('小方主動問'), 4); assert.equal(get('接受率'), '75%'); assert.equal(get('專心提醒'), 2); assert.equal(get('老師幫忙'), 1);
  assert.equal(get('障礙類別'), '輕度智能障礙'); assert.equal(get('前測'), 40); assert.equal(get('後測'), 70); assert.equal(get('每題心情'), '😀');
  const t = book.sheets.get('教師摘要').rows, th = t[0], t1 = t.find(r => r[0] === 'T01');
  assert.equal(t1[th.indexOf('學生數')], 1); assert.equal(t1[th.indexOf('平均學生投入')], 4); assert.equal(t1[th.indexOf('平均小方有幫助')], 5); assert.equal(t1[th.indexOf('最需要改的地方')], '提醒太快');
  assert.ok(t.find(r => r[0] === 'T02'), '第二位老師也有摘要');
});

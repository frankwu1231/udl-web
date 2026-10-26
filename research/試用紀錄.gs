/**
 * 圖形面積互動教材（第 22 版）｜現場試用紀錄：接收網站傳來的紀錄，寫進這份 Google 試算表
 * --------------------------------------------------------------
 * 使用方法（詳見「部署說明.md」）：
 *   1. 建立一份新的 Google 試算表 → 選單「擴充功能」→「Apps Script」。
 *   2. 把這個檔案的全部內容貼上，取代原本的程式碼，把下面的 PASSCODE 改成自己的通行碼，按「儲存」。
 *   3. 上方函式選「setup」，按「執行」，第一次會要求授權。完成後試算表會出現各個工作表。
 *   4. 右上角「部署」→「新增部署作業」→ 類型「網頁應用程式」，執行身分「我」，誰可以存取「所有人」→ 部署，複製網址。
 *   5. 到網站「教師備課」→「📋 現場試用紀錄」貼上網址和通行碼，按「測試連線」，再按「發布給學生」。
 * 網站只傳代號（T01、T01-S03），不傳姓名，也不傳任何鏡頭畫面或錄音。
 */

// ======================= 設定 =======================
const PASSCODE = '請改成你的通行碼';   // 4～40 字，和網站「教師備課」裡填的一樣
// ====================================================

const MAX_ROWS = 100;                 // 一次最多收幾筆
const COMMON = [['rid', '紀錄編號'], ['time', '時間'], ['version', '版本'], ['sessionId', '場次編號'], ['teacher', '教師代號'], ['student', '學生代號']];
const ACT = [['activity', '活動'], ['actId', '活動代號']];
const SHEETS = {
  '場次': [...COMMON, ['kind', '開始或結束'], ['device', '裝置'], ['group', '上課形式'], ['cameraConsent', '家長同意鏡頭'], ['hasCamera', '裝置有鏡頭'], ['minutes', '上課分鐘'], ['screen', '螢幕'], ['browser', '瀏覽器']],
  '操作紀錄': [...COMMON, ...ACT, ['cycle', '第幾題'], ['step', '步驟'], ['stepTitle', '步驟名稱'], ['event', '事件'], ['correct', '答對'], ['hintLevel', '提示層級'], ['action', '小方動作'], ['mode', '教學階段'], ['studyPhase', '研究階段'], ['detail', '詳細']],
  '每題摘要': [...COMMON, ...ACT, ['cycle', '第幾題'], ['mode', '教學階段'], ['studyPhase', '研究階段'], ['secs', '秒數'], ['errors', '答錯次數'], ['hints', '提示數'], ['firstTry', '一次答對步數'], ['steps', '步數'],
    ['goal', '目標'], ['goalMet', '達到目標'], ['selfMet', '自己判斷'], ['confidence', '把握'], ['badges', '集章'], ['buddyOffers', '小方主動問'], ['buddyAccepted', '接受小方'], ['buddyStuck', '小方打開我卡住了'],
    ['attentionReminds', '專心提醒'], ['teacherHelp', '老師幫忙'], ['buddyWrong', '小方不準'], ['stuckPressed', '自己按我卡住了']],
  '教師設定': [...COMMON, ...ACT, ['mode', '教學階段'], ['support', '提示程度'], ['flow', '流程'], ['difficulty', '難度'], ['buddy', '小方'], ['buddyWait', '小方等待秒數'], ['buddyVoice', '小方說話'],
    ['attention', '專心提醒'], ['attentionSec', '專心提醒秒數'], ['cameraConsent', '家長同意鏡頭'], ['zhuyin', '注音'], ['textSize', '字級'], ['contrast', '高對比'], ['video', '示範影片'], ['ai', 'AI'], ['fading', '例題逐步留空'], ['selfAsk', '自問卡'], ['rest', '休息提醒']],
  '教師觀察': [...COMMON, ...ACT, ['cycle', '第幾題'], ['step', '步驟'], ['stepTitle', '步驟名稱'], ['kind', '類型'], ['tag', '快速紀錄'], ['phase', '觀察階段'], ['level', '支持程度'], ['buddyReact', '對小方的反應'], ['note', '實際行為']],
  '學生回饋': [...COMMON, ...ACT, ['cycle', '第幾題'], ['kind', '類型'], ['mood', '這題的心情'], ['fun', '好玩嗎'], ['buddyHelp', '小方有幫忙嗎'], ['camFeel', '鏡頭提醒感受']],
  '教師回饋': [...COMMON, ['engage', '學生投入'], ['timing', '小方提醒時機'], ['buddyUseful', '小方有幫助'], ['camAccurate', '鏡頭提醒準確'], ['assists', '老師介入次數'], ['fix', '最需要改的地方']],
  '技術問題': [...COMMON, ['kind', '類型'], ['message', '訊息'], ['page', '頁面'], ['online', '有網路'], ['browser', '瀏覽器']]
};
const CODEBOOK = ['學生代號', '教師代號', '年級', '障礙類別', '需要注音或報讀', '前測分數', '後測分數', '家長同意書', '鏡頭同意', '備註'];
const OTHER = '其他';

// ---------- 建立工作表（可以重複執行，不會刪資料） ----------
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  for (const [name, cols] of Object.entries(SHEETS)) header(book, name, cols.map(c => c[1]).concat(OTHER));
  header(book, '代號表', CODEBOOK);
  header(book, '學生摘要', []); header(book, '教師摘要', []);
  return '完成：' + book.getName();
}
function header(book, name, titles) {
  const sh = book.getSheetByName(name) || book.insertSheet(name);
  if (titles.length && sh.getLastRow() === 0) { sh.getRange(1, 1, 1, titles.length).setValues([titles]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('試用紀錄').addItem('建立或補齊工作表', 'setup').addItem('更新學生與教師摘要', 'buildSummaries').addItem('每小時自動更新摘要', 'installTrigger').addToUi();
}
function installTrigger() {
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction() === 'buildSummaries') ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('buildSummaries').timeBased().everyHours(1).create();
}

// ---------- 接收網站的紀錄 ----------
function reply(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
// 開頭是 = + - @ 的文字會被試算表當成公式，前面加 ' 讓它保持文字
function safe(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  const s = String(v).slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: 'bad_json' }); }
  if (!body || typeof body.key !== 'string' || PASSCODE.length < 4 || body.key !== PASSCODE) return reply({ ok: false, error: 'bad_key' });
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (body.ping) return reply({ ok: true, spreadsheet: book.getName() });
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return reply({ ok: false, error: 'busy' }); }
  try {
    // 同一筆重送（網路不穩時）只寫一次
    const cache = CacheService.getScriptCache(), ids = rows.map(r => r && typeof r.rid === 'string' ? r.rid.slice(0, 40) : '');
    const seen = ids.filter(Boolean).length ? cache.getAll(ids.filter(Boolean).map(id => 'rid:' + id)) : {};
    const bySheet = {}, saved = [];
    rows.forEach((r, i) => {
      const id = ids[i];
      if (!id || !r || !Object.prototype.hasOwnProperty.call(SHEETS, r.sheet)) return;
      saved.push(id);
      if (seen['rid:' + id]) return;
      const cols = SHEETS[r.sheet], known = new Set(cols.map(c => c[0]).concat('sheet'));
      const extra = Object.fromEntries(Object.entries(r).filter(([k]) => !known.has(k)));
      (bySheet[r.sheet] = bySheet[r.sheet] || []).push(cols.map(c => safe(r[c[0]])).concat(safe(Object.keys(extra).length ? JSON.stringify(extra) : '')));
    });
    for (const [name, values] of Object.entries(bySheet)) {
      const sh = header(book, name, SHEETS[name].map(c => c[1]).concat(OTHER));
      sh.getRange(sh.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
    }
    const mark = {}; saved.forEach(id => { mark['rid:' + id] = '1'; }); if (saved.length) cache.putAll(mark, 21600);
    return reply({ ok: true, saved });
  } finally { lock.releaseLock(); }
}

// ---------- 學生摘要、教師摘要（分析用，可以重複執行） ----------
function table(book, name) {
  const sh = book.getSheetByName(name); if (!sh || sh.getLastRow() < 2) return [];
  const [head, ...rows] = sh.getDataRange().getValues(), seen = new Set();
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))).filter(o => { const id = o['紀錄編號']; if (!id) return true; if (seen.has(id)) return false; seen.add(id); return true; });
}
const num = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
const sum = (list, k) => list.reduce((a, o) => a + (num(o[k]) || 0), 0);
const avg = (list, k) => { const v = list.map(o => num(o[k])).filter(x => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : ''; };
const rate = (a, b) => b ? Math.round(a / b * 100) + '%' : '';
const count = (list, k, v) => list.filter(o => o[k] === v).length;
function summaries(book) {
  const items = table(book, '每題摘要'), sessions = table(book, '場次').filter(o => o['開始或結束'] === '開始');
  const fb = table(book, '學生回饋'), obs = table(book, '教師觀察'), tfb = table(book, '教師回饋'), codes = table(book, '代號表');
  const students = [...new Set(items.map(o => o['學生代號']).concat(sessions.map(o => o['學生代號'])).filter(Boolean))].sort();
  const studentRows = students.map(s => {
    const it = items.filter(o => o['學生代號'] === s), f = fb.filter(o => o['學生代號'] === s), c = codes.find(o => o['學生代號'] === s) || {};
    const offers = sum(it, '小方主動問'), acc = sum(it, '接受小方');
    return [s, s.split('-')[0], c['年級'] ?? '', c['障礙類別'] ?? '', sessions.filter(o => o['學生代號'] === s).length, it.length, avg(it, '秒數'), avg(it, '答錯次數'), avg(it, '提示數'),
      offers, acc, rate(acc, offers), sum(it, '小方打開我卡住了'), sum(it, '專心提醒'), sum(it, '老師幫忙'), sum(it, '小方不準'),
      f.filter(o => o['這題的心情']).map(o => String(o['這題的心情']).split(' ')[0]).join(''), count(f, '小方有幫忙嗎', '😀 有'), c['前測分數'] ?? '', c['後測分數'] ?? ''];
  });
  const teachers = [...new Set(students.map(s => s.split('-')[0]).concat(tfb.map(o => o['教師代號'])).filter(Boolean))].sort();
  const teacherRows = teachers.map(t => {
    const it = items.filter(o => o['教師代號'] === t), tf = tfb.filter(o => o['教師代號'] === t);
    const offers = sum(it, '小方主動問'), acc = sum(it, '接受小方'), score = k => avg(tf.map(o => ({ v: String(o[k]).split(' ')[0] })), 'v');
    return [t, new Set(it.map(o => o['學生代號'])).size, sessions.filter(o => o['教師代號'] === t).length, it.length, offers, rate(acc, offers), sum(it, '專心提醒'), sum(it, '老師幫忙'), sum(it, '小方不準'),
      obs.filter(o => o['教師代號'] === t).length, tf.length, score('學生投入'), score('小方有幫助'), tf.map(o => o['最需要改的地方']).filter(Boolean).join('｜')];
  });
  return {
    student: [['學生代號', '教師代號', '年級', '障礙類別', '場次數', '完成題數', '平均秒數', '平均答錯', '平均提示', '小方主動問', '接受小方', '接受率', '小方打開我卡住了', '專心提醒', '老師幫忙', '小方不準', '每題心情', '說小方有幫忙', '前測', '後測'], ...studentRows],
    teacher: [['教師代號', '學生數', '場次數', '完成題數', '小方主動問', '接受率', '專心提醒', '老師幫忙', '小方不準', '觀察筆數', '教師回饋次數', '平均學生投入', '平均小方有幫助', '最需要改的地方'], ...teacherRows]
  };
}
function buildSummaries() {
  const book = SpreadsheetApp.getActiveSpreadsheet(), out = summaries(book);
  for (const [name, values] of [['學生摘要', out.student], ['教師摘要', out.teacher]]) {
    const sh = book.getSheetByName(name) || book.insertSheet(name);
    sh.clearContents(); sh.getRange(1, 1, values.length, values[0].length).setValues(values); sh.getRange(1, 1, 1, values[0].length).setFontWeight('bold'); sh.setFrozenRows(1);
  }
}

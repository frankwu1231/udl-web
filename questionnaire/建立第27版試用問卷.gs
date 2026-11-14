/**
 * 面積與表面積互動教材（第 27 版：表面積教材包）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 第 19 版問卷有老師反映太長（48 題）。這一版只問第 27 版新增的表面積教材，
 * 第 19 版已經問過、而且已經依回饋修改的部分（自我調整流程、示範影片、閱讀輔助、
 * 學習地圖、AI、UDL／SRL 檢視、使用意願以外的整體心得）不再重複問。共 14 題，約 25 分鐘（含操作）。
 *
 * 使用方法：
 *   1. 到 https://script.google.com 按「新專案」。
 *   2. 把這個檔案的全部內容貼上，取代原本的程式碼，按「儲存」。
 *   3. 確認下方「設定」的網址。
 *   4. 上方函式選「createQuestionnaire」，按「執行」。第一次會要求授權，請選自己的 Google 帳號並允許。
 *   5. 執行完成後，按「執行記錄」可看到：填答網址、編輯網址、回應試算表網址。
 * 每執行一次就會建立一份新的表單；不會修改舊表單。
 */

// ======================= 設定 =======================
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（需已部署第 27 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#surface';                // 手冊的表面積章節
const FORM_TITLE = '表面積互動教材（第 27 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版新增「表面積」教材：長方體、正方體，以及六年級的柱體（三角柱、圓柱），共 5 個單元、15 個活動。對象是國小五、六年級、需要學習支持的學生（含輕度智能障礙）。',
    '',
    '上一次問卷（第 19 版）問過的部分，例如目標與回顧、示範影片、注音與朗讀，已經依大家的意見修改，這次不再重複問。本問卷只問表面積教材，約 14 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面按「教材：表面積」，再按「發布給學生」）',
    '● 手冊（表面積章節）：' + GUIDE_URL,
    '● 預計時間：操作約 15～20 分鐘，填答約 5～10 分鐘。',
    '● 表單不收集姓名與 Email。請勿填寫學生姓名或其他可識別資料。'
  ].join('\n'));
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('已收到您的回饋，謝謝您！');

  // ---------------- 第 1 部分：基本資料 ----------------
  single(form, '1. 您的身分為何？', ['特教教師（在職）', '普通班教師', '特教系研究生', '特教系大學部學生'], { other: true, required: true });
  single(form, '2. 本次使用的裝置與瀏覽器？', ['電腦＋Chrome／Edge', '電腦＋其他瀏覽器', 'iPad＋Safari', 'iPad＋Chrome', 'Android 平板', '手機'], { other: true, required: true });
  single(form, '3. 您填過第 19 版（面積）的試用問卷嗎？', ['填過', '沒有填過'], { required: true });

  // ---------------- 第 2 部分：以學生角色操作 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作表面積').setHelpText([
    '請以學生的角度操作，建議順序：',
    '1. 學習地圖選「2-1 打開盒子：展開圖」或「2-3 在展開圖上找對面」，做一題。',
    '2. 選「3-1 長方體的表面積」，連續做 3 題。注意：前 2 題是「六個面一個一個加」，第 3 題起才改用「× 2」。',
    '3. 時間允許，再做「5-2 三角柱的表面積」或「4-1 沒有蓋子的盒子」。',
    '可以故意答錯幾次，看看提示和回饋。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '1-1～1-3 認識立體的面', '2-1～2-3 展開圖', '3-1 長方體的表面積', '3-2 正方體的表面積', '3-3 知道表面積，找邊長', '3-4 要算表面積還是體積',
    '4-1 沒有蓋子的盒子', '4-2 生活應用題', '5-1 角柱的面', '5-2 三角柱的表面積', '5-3 圓柱的表面積'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '立體圖和展開圖清楚，看得出是哪一個面。',
    '「把盒子打開」看展開圖，有助於理解表面積要算幾個面。',
    '在展開圖上點出對面、塗同一個顏色，有助於理解「對面一樣大」。',
    '點盒子的邊看長、寬、高，操作容易。',
    '先「六個面一個一個加」，第 3 題才改用「× 2」，這樣的安排合理。',
    '答錯時的回饋，讓學生知道要改哪裡。',
    '題目和提示的文字長度，適合輕度智能障礙學生。',
    '柱體「側面打開是一個大長方形」的呈現，有助於理解側面積。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫活動編號和步驟，例如「3-1 列式：不知道要選哪個算式」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫活動編號，沒操作的活動不必評論。');
  single(form, '8. 柱體（5-1～5-3）放在這套教材裡，您覺得：', [
    '適合，六年級學生需要', '只保留角柱（5-1、5-2），圓柱太難', '先不用，學生熟練長方體、正方體再說', '沒有操作到柱體'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的兩個按鈕，在「四種圖形面積」和「表面積」之間切換。',
    '2. 在表面積教材按一條路徑（基礎版、六年級、全部），再增減勾選的活動。',
    '3. 按「發布給學生」，到學生頁看學習地圖有沒有換成表面積。'
  ].join('\n'));
  form.addGridItem().setTitle('9. 請評分。').setRows([
    '切換教材的位置容易找到。',
    '切換後，原本勾選的活動有保留。',
    '路徑（基礎版、六年級、全部）的安排合理。',
    '手冊的表面積章節說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('10. 若要教一位五年級、輕度智能障礙學生表面積，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：1-1 → 2-1 → 2-3 → 3-1。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('11. 表面積教材最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('12. 表面積教材最值得保留的設計是什麼？');
  single(form, '13. 您是否願意讓學生試用表面積教材？', [
    '願意，在教師陪同下試用', '修改部分內容後願意', '需要更多資訊再決定', '目前不考慮', '無法判斷'
  ], { required: true });
  form.addParagraphTextItem().setTitle('14. 其他建議。');

  // ---------------- 回應試算表與網址 ----------------
  let sheetUrl = '（未建立）';
  if (MAKE_SPREADSHEET) {
    const ss = SpreadsheetApp.create(FORM_TITLE + '（回應）');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    sheetUrl = ss.getUrl();
  }
  Logger.log('填答網址（發給試用老師）：' + form.getPublishedUrl());
  Logger.log('短網址：' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('編輯網址（只給自己）：' + form.getEditUrl());
  Logger.log('回應試算表：' + sheetUrl);
  Logger.log('題目數：' + form.getItems().filter(i => i.getType() !== FormApp.ItemType.PAGE_BREAK).length);
}

// 單選題（可加「其他」、說明、必填）
function single(form, title, choices, opts) {
  opts = opts || {};
  const item = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(choices);
  if (opts.other) item.showOtherOption(true);
  if (opts.help) item.setHelpText(opts.help);
  if (opts.required) item.setRequired(true);
  return item;
}

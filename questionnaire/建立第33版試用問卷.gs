/**
 * 分數互動教材（第 33 版：分數教材包）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 和第 27、28、31、32 版一樣只問新增的教材（分數），之前問過、已經依回饋修改的部分
 * （自我調整流程、示範影片、閱讀輔助、學習地圖、AI）不再重複問。共 16 題，約 25 分鐘（含操作）。
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
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（已部署第 33 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#frac';                   // 手冊的分數章節
const FORM_TITLE = '分數互動教材（第 33 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版新增「分數」教材：二、三年級學平分、幾分之一、幾分之幾和同分母比大小與加減；四年級學真分數、假分數、帶分數、等值分數、數線和分數小數；五、六年級學擴分約分、異分母加減、分數乘法和分數除法；另有生活應用「分數小幫手」（分食物、照食譜做、飲料還剩多少、半小時、買東西、食譜加倍減半、分裝飲料）。共 12 個單元、40 個活動（單元 0 是先測）。對象是國小二到六年級、需要學習支持的學生（含輕度智能障礙）。',
    '',
    '之前問卷問過的部分，例如目標與回顧、示範影片、注音與朗讀，這次不再重複問。本問卷只問分數教材，約 16 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面按「教材：分數（二到六年級＋分數小幫手）」，再按「發布給學生」）',
    '● 手冊（分數章節）：' + GUIDE_URL,
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
  single(form, '3. 您填過之前（面積、表面積、折線圖、因數與倍數或時間概念）的試用問卷嗎？', ['填過', '沒有填過'], { required: true });

  // ---------------- 第 2 部分：以學生角色操作 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作分數').setHelpText([
    '請以學生的角度操作，建議順序：',
    '1. 學習地圖選「2-2 看圖寫分數」（看分數五步），做 2 題。',
    '2. 選「3-2 合起來是多少」（分數計算五步）1 題，再選「7-1 數線上的分數」1 題。',
    '3. 選「11-2 照食譜做」（生活決策五步）1 題。',
    '4. 時間允許，再做五年級的「8-3 異分母加減」或「9-2 分數乘以分數」。',
    '可以故意答錯幾次，看看提示和回饋；也可以打開「分數圖卡」。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '0-1～0-2 先測（一樣多嗎、切成一樣大）', '1-1～1-3 平分與幾分之一', '2-1、2-3 幾個幾分之一、合起來是 1', '2-2 看分數五步：看圖寫分數',
    '3-1、3-3 誰比較多、還剩多少', '3-2 分數計算五步：合起來是多少', '4-1～4-3 真分數、假分數、帶分數', '5-1～5-3 帶分數加減、整數倍、應用題',
    '6-1～6-3 等值分數、簡單異分母', '7-1 數線四步：數線上的分數', '7-2～7-3 分數和小數', '8-1～8-3 擴分約分、通分、異分母加減',
    '9-1～9-3 分數乘法', '10-1～10-4 整數相除、分數除法', '11-1～11-7 分數小幫手'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '「先找整體、再看是不是平分」的步驟，有助於學生寫出分數。',
    '長條、圓、數線的圖清楚，學生看得出全部幾份、塗了幾份。',
    '「換成幾個 1/□」的說法，有助於學生理解同分母加減（分母不變）。',
    '數線「數段，不數刻度線」的提醒，學生用得上。',
    '分數輸入格（分子在上、分母在下）學生會用。',
    '「分數小幫手」的生活題（食譜、飲料、買東西）和學生的生活有關。',
    '答錯時的回饋，讓學生知道要改哪裡。',
    '題目和提示的文字長度，適合輕度智能障礙學生。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫活動編號和步驟，例如「2-2 數全部幾份：學生只數沒塗色的」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫活動編號，沒操作的活動不必評論。');
  single(form, '8. 入門和一般可以打開「分數圖卡」（1、1/2……1/12 的分數牆，會記錄），挑戰不提供。您覺得：', [
    '合適，照現在的安排', '三種程度都應該可以打開', '應該一直顯示，不用按', '沒有操作到'
  ], { other: true, required: true });
  single(form, '9. 分母的範圍（入門 2～4、一般 10 以內、挑戰 12 以內；等值和異分母題入門到 8），您覺得：', [
    '合適', '入門應該更小', '可以再大一點', '沒有注意到'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的「分數（二到六年級＋分數小幫手）」。',
    '2. 按一條路徑（入門版、四年級版、五六年級版、分數小幫手、全部），再增減勾選的活動。',
    '3. 按「發布給學生」，到學生頁看學習地圖有沒有換成分數。'
  ].join('\n'));
  form.addGridItem().setTitle('10. 請評分。').setRows([
    '切換到分數教材的位置容易找到。',
    '入門版（二、三年級：平分、幾分之幾、同分母加減，11 個活動）的安排合理。',
    '四年級版（假分數、帶分數、等值分數、數線、分數和小數，13 個活動）的安排合理。',
    '五六年級版（通分、異分母加減、分數乘除，11 個活動）的安排合理。',
    '分數小幫手（7 個生活活動）適合特教班的生活管理課。',
    '手冊的分數章節說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('11. 若要教一位四年級、輕度智能障礙學生等值分數，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：2-2 → 6-1 → 6-2 → 6-3 → 11-2。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('12. 分數教材最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('13. 分數教材最值得保留的設計是什麼？');
  form.addParagraphTextItem().setTitle('14. 「分數小幫手」還可以加入哪些學生生活中的情境？')
    .setHelpText('例如：沖泡飲料、分零用錢、量米煮飯。');
  single(form, '15. 您是否願意讓學生試用分數教材？', [
    '願意，在教師陪同下試用', '修改部分內容後願意', '需要更多資訊再決定', '目前不考慮', '無法判斷'
  ], { required: true });
  form.addParagraphTextItem().setTitle('16. 其他建議。');

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

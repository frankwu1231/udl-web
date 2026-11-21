/**
 * 整數四則運算互動教材（第 35 版：整數四則運算教材包）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 和第 27、28、31、32、33 版一樣只問新增的教材（整數四則運算），之前問過、已經依回饋修改的部分
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
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（已部署第 35 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#int';                    // 手冊的整數四則運算章節
const FORM_TITLE = '整數四則運算互動教材（第 35 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版新增「整數四則運算」教材：一年級學加減的意義；二、三年級學直式加減、加減應用題、乘法與九九、分裝與平分、除法和餘數、乘除一位數直式；四年級學多位數乘除、估商、併式與四則混合；五年級學三步驟、平均與分配律；另有生活應用「算數小幫手」（錢夠不夠、找錢、買好幾個、分點心、要幾台車、比划算、班級活動預算）。共 12 個單元、43 個活動（單元 0 是先測）。對象是國小一到五年級、需要學習支持的學生（含輕度智能障礙）。',
    '',
    '之前問卷問過的部分，例如目標與回顧、示範影片、注音與朗讀，這次不再重複問。本問卷只問整數四則運算教材，約 16 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面按「教材：整數四則運算（一到五年級＋算數小幫手）」，再按「發布給學生」）',
    '● 手冊（整數四則運算章節）：' + GUIDE_URL,
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
  single(form, '3. 您填過之前（面積、表面積、折線圖、因數與倍數、時間概念或分數）的試用問卷嗎？', ['填過', '沒有填過'], { required: true });

  // ---------------- 第 2 部分：以學生角色操作 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作整數四則運算').setHelpText([
    '請以學生的角度操作，建議順序：',
    '1. 學習地圖選「1-4 加還是減」（看懂題目四步），做 2 題。',
    '2. 選「2-2 不夠減怎麼辦」（直式加減五步）1 題，再選「6-2 除以一位數」（直式乘除五步）1 題。',
    '3. 選「8-1 加減與乘」（應用題五步）1 題，再選「11-1 錢夠不夠」（生活決策五步）1 題。',
    '4. 時間允許，再做四年級的「9-2 先算哪一個」或五年級的「10-2 平均」。',
    '可以故意答錯幾次，看看提示和回饋；也可以打開「位值表」或「九九乘法表」。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '0-1～0-2 先測（數一數、幾個十幾個一）', '1-1～1-3 多了、拿走了、誰比較多', '1-4 看懂題目四步：加還是減',
    '2-1、2-3、2-4 位值表格裡加、多次進退位、算完檢查', '2-2 直式加減五步：不夠減怎麼辦', '3-1～3-3 加減應用題（未知數、比一比）',
    '4-1～4-4 乘法與九九', '5-1～5-4 分裝、平分、除法和餘數', '6-1、6-3 乘以一位數、驗算', '6-2 直式乘除五步：除以一位數',
    '7-1～7-3 乘以二位數、估商、除以多位數', '8-1～8-3 兩步驟應用題', '9-1～9-3 併式、先算哪一個、換順序', '10-1～10-3 三步驟、平均、分配律',
    '11-1～11-7 算數小幫手'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '「先說發生了什麼事，再決定加或減」的步驟，有助於學生不只看關鍵字。',
    '直式表格（有進位、退位小格，借了會劃掉）清楚，學生看得懂。',
    '直式除法「不夠分寫 0」的提醒，學生用得上。',
    '應用題「先算什麼」的步驟，有助於學生做兩步驟的題目。',
    '花片、積木、一排一排的圖，有助於學生理解加減乘除的意思。',
    '「算數小幫手」的生活題（買東西、找錢、分點心、租車）和學生的生活有關。',
    '答錯時的回饋（含填錯格式的提醒），讓學生知道要改哪裡。',
    '題目和提示的文字長度，適合輕度智能障礙學生。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫活動編號和步驟，例如「2-2 借 1 個十：學生忘了十位要減 1」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫活動編號，沒操作的活動不必評論。');
  single(form, '8. 入門和一般可以打開「位值表」和「九九乘法表」（會記錄），挑戰不提供。您覺得：', [
    '合適，照現在的安排', '三種程度都應該可以打開', '應該一直顯示，不用按', '沒有操作到'
  ], { other: true, required: true });
  single(form, '9. 數字的範圍（依課綱：一年級 10 以內、二年級加法最多兩次進位、減法一次退位、四年級乘數除數不超過三位），您覺得：', [
    '合適', '入門應該更小', '可以再大一點', '沒有注意到'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的「整數四則運算（一到五年級＋算數小幫手）」。',
    '2. 按一條路徑（一年級版、加減版、乘除版、應用題版、算數小幫手、全部），再增減勾選的活動。',
    '3. 按「發布給學生」，到學生頁看學習地圖有沒有換成整數四則運算。'
  ].join('\n'));
  form.addGridItem().setTitle('10. 請評分。').setRows([
    '切換到整數四則運算教材的位置容易找到。',
    '一年級版（數一數、加減的意義，6 個活動）和加減版（11 個活動）的安排合理。',
    '乘除版（乘法、分一分、乘除直式，14 個活動）的安排合理。',
    '應用題版（未知數、兩步驟、併式、三步驟，12 個活動）的安排合理。',
    '算數小幫手（7 個生活活動）適合特教班的生活管理課。',
    '手冊的整數四則運算章節說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('11. 若要教一位三年級、輕度智能障礙學生除法，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：4-1 → 5-1 → 5-2 → 5-3 → 6-2 → 11-4。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('12. 整數四則運算教材最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('13. 整數四則運算教材最值得保留的設計是什麼？');
  form.addParagraphTextItem().setTitle('14. 「算數小幫手」還可以加入哪些學生生活中的情境？')
    .setHelpText('例如：存零用錢、點餐、搭公車的車資。');
  single(form, '15. 您是否願意讓學生試用整數四則運算教材？', [
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

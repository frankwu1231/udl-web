/**
 * 錢幣與購物互動教材（第 36 版：錢幣與購物教材包）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 和第 27、28、31～35 版一樣只問新增的教材（錢幣與購物），之前問過、已經依回饋修改的部分
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
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（已部署第 36 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#money';                  // 手冊的錢幣與購物章節
const FORM_TITLE = '錢幣與購物互動教材（第 36 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版新增「錢幣與購物」教材：一年級認識 1、5、10、50、100 元，數錢、換錢；二年級認識 500、1000 元，數大錢、估算；付錢（付款盤：拿出剛好的錢、多付一點、用最少個）、找錢（往上數、用減的算、點一點找的錢）、去買東西（錢夠不夠、買兩樣、購物五步驟）。另有跨領域的單元：錢從哪裡來（以物易物、錢是工作換來的、電子支付）、想要與需要、存錢與到郵局銀行存提款，以及生活應用「錢錢小管家」（記帳、存錢計畫、花存分享、做預算）。共 10 個單元、32 個活動（單元 0 是先測）。對象是國小一、二年級程度、需要學習支持的學生（含輕度智能障礙）。',
    '',
    '之前問卷問過的部分，例如目標與回顧、示範影片、注音與朗讀，這次不再重複問。本問卷只問錢幣與購物教材，約 16 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面按「教材：錢幣與購物」，再按「發布給學生」）',
    '● 手冊（錢幣與購物章節）：' + GUIDE_URL,
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
  single(form, '3. 您填過之前（面積、表面積、折線圖、因數與倍數、時間概念、分數或整數四則運算）的試用問卷嗎？', ['填過', '沒有填過'], { required: true });

  // ---------------- 第 2 部分：以學生角色操作 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作錢幣與購物').setHelpText([
    '請以學生的角度操作，建議順序：',
    '1. 學習地圖選「1-3 混在一起數」（數錢四步），做 2 題。',
    '2. 選「4-1 拿出剛好的錢」（付錢四步，用付款盤）1 題，再選「5-1 往上數找錢」（找錢四步）1 題。',
    '3. 選「6-3 購物五步驟」1 題，再選「7-1 需要還是想要」（想要需要三問）2 題。',
    '4. 選「8-2 到郵局、銀行」（存提款四步）1 題，再選「9-1 我的記帳本」（生活決策五步）1 題。',
    '5. 時間允許，再做「2-1 換換看好麻煩」或「9-4 小小預算家」。',
    '可以故意答錯幾次，看看提示和回饋；付款盤可以故意多放或少放錢。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '0-1～0-2 先測（一個一個數、五個五個與十個十個數）', '1-1、1-2、1-4 認一認、同一種數一數、換一換', '1-3 數錢四步：混在一起數',
    '2-1～2-4 錢從哪裡來（以物易物、從貝殼到紙鈔、工作賺錢、電子支付）', '3-1～3-3 500、1000 元與估算',
    '4-1 付錢四步：拿出剛好的錢（付款盤）', '4-2、4-3 多付一點、錢幣用最少', '5-1 找錢四步：往上數找錢', '5-2、5-3 算一算要找多少、找的錢對不對',
    '6-1、6-2 錢夠不夠、買兩樣', '6-3 購物五步驟', '7-1 想要需要三問', '7-2、7-3 錢只有這些、等一等再買',
    '8-1、8-3 存錢筒、看懂存摺', '8-2 存提款四步：到郵局、銀行', '9-1～9-4 錢錢小管家（記帳、存錢計畫、花存分享、預算）'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '錢幣和紙鈔的圖（自己畫的簡化圖）清楚，學生分得出面額。',
    '「先數大的，接著往下數」的步驟，有助於學生數混在一起的錢。',
    '付款盤（點錢包的錢放進盤子、點盤子的錢拿回來）容易操作。',
    '「往上數找錢」的方法，適合還不熟減法的學生。',
    '「錢從哪裡來」單元（以物易物、工作賺錢、電子支付）學生看得懂。',
    '「想要需要三問」有助於學生判斷，而不是只背哪些東西是需要。',
    '存提款（填單、提款機、存摺）的情境和學生的生活有關。',
    '答錯時的回饋讓學生知道要改哪裡，而且不會直接說出答案。',
    '題目和提示的文字長度，適合輕度智能障礙學生。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫活動編號和步驟，例如「1-3 接著往下數：學生換到 1 元時又從 1 開始數」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫活動編號，沒操作的活動不必評論。');
  single(form, '8. 網站只用自己畫的簡化錢幣，沒有用真的錢幣、鈔票照片。您覺得：', [
    '合適，照現在的樣子', '應該改用真的錢幣、鈔票照片', '簡化圖和照片都要有，可以切換', '沒有注意到'
  ], { other: true, required: true });
  single(form, '9. 數字的範圍（依課綱：一年級 100 元以內，用 1、5、10、50、100 元；二年級加 500、1000 元，估算到整百；沒有 20、200、2000 元），您覺得：', [
    '合適', '入門應該更小', '可以再大一點', '應該加入 20、200、2000 元', '沒有注意到'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的「錢幣與購物」。',
    '2. 按一條路徑（一年級版、二年級版、購物版、理財版、全部），再增減勾選的活動。',
    '3. 按「發布給學生」，到學生頁看學習地圖有沒有換成錢幣與購物。'
  ].join('\n'));
  form.addGridItem().setTitle('10. 請評分。').setRows([
    '切換到錢幣與購物教材的位置容易找到。',
    '一年級版（認識錢幣、錢從哪裡來、付錢、找錢，16 個活動）的安排合理。',
    '二年級版（大錢與估算、付錢、找錢、去買東西，12 個活動）的安排合理。',
    '購物版（付錢、找錢、去買東西，9 個活動）適合特教班的生活管理課。',
    '理財版（想要與需要、存提款、錢錢小管家，10 個活動）適合特教班的生活管理課。',
    '手冊的錢幣與購物章節說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('11. 若要教一位二年級、輕度智能障礙學生自己去福利社買東西，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：1-3 → 4-1 → 4-2 → 5-1 → 5-3 → 6-1 → 6-3。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('12. 錢幣與購物教材最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('13. 錢幣與購物教材最值得保留的設計是什麼？');
  form.addParagraphTextItem().setTitle('14. 「錢從哪裡來」「想要與需要」「存提款」「錢錢小管家」還可以加入哪些學生生活中的情境？')
    .setHelpText('例如：夜市買東西、用悠遊卡搭公車、壓歲錢怎麼用。');
  single(form, '15. 您是否願意讓學生試用錢幣與購物教材？', [
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

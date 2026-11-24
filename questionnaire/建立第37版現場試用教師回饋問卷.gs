/**
 * 面積互動教材｜第一年現場試用：教師回饋問卷（第 37 版）
 * --------------------------------------------------------------
 * 用在第一年 ADDIE 的「實作」與「評估」：資源班教師帶學生現場試用面積教材後，每位老師填一次（約 10 分鐘）。
 * 和第 19 版形成性評鑑問卷不同，這份問的是「真實學生使用時」的情形；學生自己的回饋由網站內的「🗳️ 學生問卷」收集。
 * 題目依教師手冊第 16 節 UDL 檢核、第 17 節 SRL 循環。
 *
 * 使用方法：
 *   1. 到 https://script.google.com 按「新專案」。
 *   2. 把這個檔案的全部內容貼上，取代原本的程式碼，按「儲存」。
 *   3. 上方函式選「createQuestionnaire」，按「執行」。第一次會要求授權，請選自己的 Google 帳號並允許。
 *   4. 執行完成後，按「執行記錄」可看到：填答網址、編輯網址、回應試算表網址。
 * 每執行一次就會建立一份新的表單；不會修改舊表單。
 */

// ======================= 設定 =======================
const FORM_TITLE = '面積互動教材｜第一年現場試用教師回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有觀察到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您帶學生現場試用面積互動教材。這份問卷請您依「學生實際使用時」的觀察填寫，不是您自己操作的感受。',
    '本問卷的回答會和網站的學習紀錄、教師觀察、學生問卷一起對照，作為修訂教材的依據。',
    '',
    '● 預計時間：約 10 分鐘。',
    '● 表單不收集姓名與 Email。請只寫教師代號（T01～T04）與學生代號，勿填學生姓名或其他可識別資料。'
  ].join('\n'));
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('已收到您的回饋，謝謝您！');

  // ---------------- 第 1 部分：基本資料 ----------------
  single(form, '1. 您的教師代號', ['T01', 'T02', 'T03', 'T04'], { other: true, required: true });
  form.addTextItem().setTitle('2. 本次試用的學生代號（例如 T01-S01、T01-S02）').setHelpText('只寫代號，不寫姓名。').setRequired(true);
  form.addCheckboxItem().setTitle('3. 學生試用了哪些活動？').setChoiceValues([
    '1-1 比一比', '1-2 鋪方格', '1-3 剪開再拼、1-4 估一估', '2-1 周長、2-2 要算面積還是周長', '3-1 長方形的面積', '3-1 正方形的面積', '3-2 以後的單元 3 活動', '單元 4、5'
  ]).showOtherOption(true).setRequired(true);
  single(form, '4. 試用的節數（每位學生平均）', ['1 節', '2 節', '3 節', '4 節以上'], { required: true });
  single(form, '5. 使用的裝置', ['電腦', 'iPad', 'Android 平板', '混合使用'], { other: true, required: true });

  // ---------------- 第 2 部分：學生使用情形 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：學生實際使用的情形').setHelpText('請依您在課堂上看到的情形評分；沒有用到的功能請選「沒有觀察到」。');
  form.addGridItem().setTitle('6. 請依學生實際使用的情形評分。').setRows([
    '學生能自己從學習地圖進入指派的活動。（學習地圖）',
    '朗讀、注音或字級讓學生能自己讀題。（UDL 1.1、1.2、2.2）',
    '三層提示讓學生不需要老師就能繼續。（三層提示）',
    '示範影片看完後，學生能自己做這一步。（示範影片）',
    '小方出現的時機適合，提醒後學生能回到題目。（小老師小方）',
    '學生看得懂目標與回顧頁，不是隨意點選。（SRL 預備與反思）',
    '「我卡住了」讓學生會主動求助。（UDL 求助、情緒調控）',
    '教師觀察與支持建議符合我對學生的判斷。（教學階段與減少支持）',
    '學生在網站上的投入程度比一般紙筆練習高。（UDL 引發興趣）'
  ]).setColumns(AGREE).setRequired(true);

  // ---------------- 第 3 部分：開放題 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：開放題');
  form.addParagraphTextItem().setTitle('7. 學生最常卡住在哪個活動、哪一步？您當時怎麼幫他？')
    .setHelpText('請寫活動編號和步驟，例如「3-1 找第二個長度：學生把周長當成長度，我用手指沿著邊數」。').setRequired(true);
  form.addParagraphTextItem().setTitle('8. 哪些地方仍需要老師提醒、示範或代為操作？');
  form.addParagraphTextItem().setTitle('9. 學生問卷的回答符合您觀察到的嗎？哪一題不符合？')
    .setHelpText('例如「學生選『給我提示有幫助』，但其實看了提示還是亂按」。');
  form.addParagraphTextItem().setTitle('10. 最需要先修改的三件事。').setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  single(form, '11. 您會繼續在資源班使用這個教材嗎？', ['會，照現在的樣子', '修改部分內容後會', '需要更多支持（例如設備、時間）才會', '不會', '無法判斷'], { required: true });
  form.addParagraphTextItem().setTitle('12. 其他建議（例如：需要的條件、設備、時間安排）。');

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

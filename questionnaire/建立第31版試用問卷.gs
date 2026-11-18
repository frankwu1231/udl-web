/**
 * 因數與倍數互動教材（第 31 版：因數與倍數教材包）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 和第 27、28 版一樣只問新增的教材（因數與倍數），之前問過、已經依回饋修改的部分
 * （自我調整流程、示範影片、閱讀輔助、學習地圖、AI）不再重複問。共 15 題，約 25 分鐘（含操作）。
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
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（已部署第 31 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#factor';                 // 手冊的因數與倍數章節
const FORM_TITLE = '因數與倍數互動教材（第 31 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版新增「因數與倍數」教材：五年級學因數、倍數、公因數、公倍數的意義，六年級再學質數、短除和約分通分，共 8 個單元、20 個活動（單元 0 是先測）。對象是國小五、六年級、需要學習支持的學生（含輕度智能障礙）。',
    '',
    '之前問卷問過的部分，例如目標與回顧、示範影片、注音與朗讀，這次不再重複問。本問卷只問因數與倍數教材，約 15 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面按「教材：因數與倍數（五、六年級）」，再按「發布給學生」）',
    '● 手冊（因數與倍數章節）：' + GUIDE_URL,
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
  single(form, '3. 您填過之前（面積、表面積或折線圖）的試用問卷嗎？', ['填過', '沒有填過'], { required: true });

  // ---------------- 第 2 部分：以學生角色操作 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作因數與倍數').setHelpText([
    '請以學生的角度操作，建議順序：',
    '1. 學習地圖選「1-3 找出全部的因數」，做 2 題（找因數的七個步驟）。',
    '2. 選「3-2 最多可以分幾份」，做 1 題（找公因數的七個步驟），再做「4-2 最少要等多久」1 題。',
    '3. 時間允許，再做「5-1 這題用哪一個」，或六年級的「6-3 短除分解」「7-1 短除找最大公因數和最小公倍數」。',
    '可以故意答錯幾次，看看提示和回饋。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '0-1～0-2 先測（乘法表、平分有沒有剩）', '1-1～1-2 排排看、剛好分完嗎', '1-3 找出全部的因數', '2-1～2-3 倍數',
    '3-1 兩種東西一起分', '3-2 最多可以分幾份', '4-1～4-2 什麼時候再一起、最少要等多久', '5-1～5-2 這題用哪一個、混合應用',
    '6-1 只能排一排（質數）', '6-2 2、3、5 的倍數判別', '6-3 短除分解', '7-1 短除找最大公因數和最小公倍數', '7-2～7-3 互質、約分與通分'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '把方塊排成長方形、平分東西的圖，有助於學生理解「因數」。',
    '「成對記下」和「什麼時候停」兩個步驟，有助於學生找齊因數。',
    '在數字表上點選因數、倍數，操作容易。',
    '跳格數線（兩個人一起跳到的地方圈起來），有助於理解「公倍數」。',
    '「平分、最多 → 最大公因數；再一起、最少 → 最小公倍數」的判斷方式，學生用得上。',
    '答錯時的回饋，讓學生知道要改哪裡。',
    '題目和提示的文字長度，適合輕度智能障礙學生。',
    '數字範圍（入門 24、一般 50、挑戰 100 以內）適合學生。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫活動編號和步驟，例如「1-3 成對記下：學生只寫 2，忘了 6」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫活動編號，沒操作的活動不必評論。');
  single(form, '8. 入門和一般可以打開「九九乘法表」（會記錄），挑戰不提供。您覺得：', [
    '合適，照現在的安排', '三種程度都應該可以打開', '都不要提供，要學生自己背', '沒有操作到'
  ], { other: true, required: true });
  single(form, '9. 單元 0 當「先測」（乘法表和平分都全對就往下，沒全對先練），您覺得：', [
    '合適', '應該每個學生都做完單元 0', '不需要先測，直接從單元 1 開始', '沒有操作到'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的「因數與倍數（五、六年級）」。',
    '2. 按一條路徑（五年級版、六年級版、全部），再增減勾選的活動。',
    '3. 按「發布給學生」，到學生頁看學習地圖有沒有換成因數與倍數。'
  ].join('\n'));
  form.addGridItem().setTitle('10. 請評分。').setRows([
    '切換到因數與倍數教材的位置容易找到。',
    '五年級版（因數、倍數、公因數、公倍數，14 個活動）的安排合理。',
    '六年級版（複習後學質數、短除、約分通分，10 個活動）的安排合理。',
    '手冊的因數與倍數章節說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('11. 若要教一位五年級、輕度智能障礙學生因數與倍數，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：0-1 → 1-1 → 1-3 → 2-1 → 3-2。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('12. 因數與倍數教材最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('13. 因數與倍數教材最值得保留的設計是什麼？');
  single(form, '14. 您是否願意讓學生試用因數與倍數教材？', [
    '願意，在教師陪同下試用', '修改部分內容後願意', '需要更多資訊再決定', '目前不考慮', '無法判斷'
  ], { required: true });
  form.addParagraphTextItem().setTitle('15. 其他建議。');

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

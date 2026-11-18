/**
 * 時間概念互動教材（第 32 版：時間概念教材包）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 和第 27、28、31 版一樣只問新增的教材（時間概念），之前問過、已經依回饋修改的部分
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
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（已部署第 32 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#time';                   // 手冊的時間概念章節
const FORM_TITLE = '時間概念互動教材（第 32 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版新增「時間概念」教材：一、二年級學一天的時間、看鐘（整點、半點、幾時幾分）和看日曆；三、四年級學時間單位換算、時刻和時間量、24 時制和經過時間；另有生活應用「時間小管家」（來得及嗎、最晚幾點出門、查公車時刻表、店還開著嗎）。共 10 個單元、30 個活動（單元 0 是先測）。對象是國小一到四年級、需要學習支持的學生（含輕度智能障礙）。',
    '',
    '之前問卷問過的部分，例如目標與回顧、示範影片、注音與朗讀，這次不再重複問。本問卷只問時間概念教材，約 16 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面按「教材：時間概念（一到四年級＋時間小管家）」，再按「發布給學生」）',
    '● 手冊（時間概念章節）：' + GUIDE_URL,
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
  single(form, '3. 您填過之前（面積、表面積、折線圖或因數與倍數）的試用問卷嗎？', ['填過', '沒有填過'], { required: true });

  // ---------------- 第 2 部分：以學生角色操作 ----------------
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作時間概念').setHelpText([
    '請以學生的角度操作，建議順序：',
    '1. 學習地圖選「3-2 看鐘六步：一分一分讀」，做 2 題。',
    '2. 選「8-1 算時間七步：跨時」，做 1 題（時間線跳整點）。',
    '3. 選「9-2 時間決策五步：來得及嗎」1 題，再做「9-4 查公車時刻表」1 題。',
    '4. 時間允許，再做一年級的「2-2 半點」或「4-1 幾月幾日星期幾」。',
    '可以故意答錯幾次，看看提示和回饋。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '0-1～0-2 先測（五個一數、數到 60）', '1-1～1-2 一天的時間、昨天今天明天', '2-1～2-2 整點、半點',
    '3-1 五分五分讀', '3-2 看鐘六步：一分一分讀', '3-3 經過幾小時', '4-1～4-3 看日曆、算天數',
    '5-1～5-3 時間單位和換算', '6-1～6-3 時刻還是時間量、時分加減', '7-1～7-2 電子鐘、24 時制',
    '8-1 算時間七步：跨時', '8-2～8-4 跨午、跨日、求開始或結束', '9-1 估一估，再計時', '9-2 時間決策五步：來得及嗎',
    '9-3～9-6 出門、公車、行程、店還開著嗎'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '可以撥動的時鐘，有助於學生讀出幾時幾分。',
    '「先找短針、再數長針（五個一數）」的步驟，有助於學生讀鐘。',
    '時間線（先跳到整點、再跳整時、再跳剩下的），有助於學生算經過時間。',
    '「時刻（幾時幾分）」和「時間量（幾小時幾分鐘）」的區分，學生用得上。',
    '「來得及嗎」「最晚幾點出門」等生活題，和學生的生活有關。',
    '公車時刻表、月曆的圖示清楚，學生看得懂。',
    '答錯時的回饋，讓學生知道要改哪裡。',
    '題目和提示的文字長度，適合輕度智能障礙學生。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫活動編號和步驟，例如「3-2 讀幾時：短針快到 3，學生讀成 3 時」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫活動編號，沒操作的活動不必評論。');
  single(form, '8. 入門和一般可以打開「🔁 換算卡」（1 時＝60 分等，會記錄），挑戰不提供。您覺得：', [
    '合適，照現在的安排', '三種程度都應該可以打開', '應該一直顯示，不用按', '沒有操作到'
  ], { other: true, required: true });
  single(form, '9. 單元 0 當「先測」（五個一數和數到 60 都全對就往下，沒全對先練），您覺得：', [
    '合適', '應該每個學生都做完單元 0', '不需要先測，直接從單元 1 開始', '沒有操作到'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的「時間概念（一到四年級＋時間小管家）」。',
    '2. 按一條路徑（報時版、經過時間版、時間小管家、全部），再增減勾選的活動。',
    '3. 按「發布給學生」，到學生頁看學習地圖有沒有換成時間概念。'
  ].join('\n'));
  form.addGridItem().setTitle('10. 請評分。').setRows([
    '切換到時間概念教材的位置容易找到。',
    '報時版（一、二年級：看鐘、看日曆，12 個活動）的安排合理。',
    '經過時間版（三、四年級：換算、24 時制、經過時間、時間小管家，20 個活動）的安排合理。',
    '時間小管家（6 個生活活動）適合特教班的生活管理課。',
    '手冊的時間概念章節說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('11. 若要教一位三年級、輕度智能障礙學生算經過時間，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：3-2 → 5-2 → 6-1 → 8-1 → 9-2。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('12. 時間概念教材最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('13. 時間概念教材最值得保留的設計是什麼？');
  form.addParagraphTextItem().setTitle('14. 「時間小管家」還可以加入哪些學生生活中的情境？')
    .setHelpText('例如：搭捷運、看醫生掛號、補習班時間。');
  single(form, '15. 您是否願意讓學生試用時間概念教材？', [
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

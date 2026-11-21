/**
 * 跨領域生活應用單元（第 34 版）｜教師試用回饋問卷（精簡版）
 * --------------------------------------------------------------
 * 和第 27、28、31、32 版一樣只問新增的部分：面積、表面積、折線圖、因數與倍數的生活應用單元（17 個新活動）。
 * 之前問過的部分（自我調整流程、示範影片、閱讀輔助、學習地圖、AI、各教材的數學內容）不再重複問。共 16 題，約 25 分鐘（含操作）。
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
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（已部署第 34 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html#life';                   // 手冊的生活應用單元說明
const FORM_TITLE = '跨領域生活應用單元（第 34 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作到'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。這一版在面積、表面積、折線圖、因數與倍數四套教材的最後，各補上一個跨領域的生活應用單元：家裡的小設計師（面積：鋪地墊、貼邊條、比房間、分菜園）、包裝小達人（表面積：包禮物、漆牆、省紙、標籤紙）、生活小觀察家（折線圖：看氣溫、睡眠和喝水、長高、存錢）、分組分裝小幫手（因數與倍數：分組、買幾包、分裝禮物袋、值日輪流、排桌子）。共 17 個新活動，每單元有一個核心活動用「生活決策五步」：看情境 → 找出要算什麼 → 選方法 → 算出來 → 檢查再決定。',
    '',
    '之前問卷問過的部分，這次不再重複問。本問卷只問生活應用單元，約 16 題。',
    '',
    '● 網址：' + SITE_URL + '（登入後，在「教師備課」最上面的「教材：」選一套教材，按「生活應用」路徑，再按「發布給學生」）',
    '● 手冊（生活應用單元）：' + GUIDE_URL,
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
  form.addPageBreakItem().setTitle('第 2 部分：以學生角色操作生活應用單元').setHelpText([
    '請以學生的角度操作，建議順序（每套教材要先在教師備課切換並發布）：',
    '1. 面積：做「5-2 生活決策五步：鋪地墊要幾包」1 題，再做「5-3 貼邊條還是貼滿」1 題。',
    '2. 表面積：做「4-3 生活決策五步：包禮物要多少紙」1 題。',
    '3. 折線圖：做「6-3 生活決策五步：看氣溫決定穿什麼」1 題。',
    '4. 因數與倍數：做「8-2 生活決策五步：一包幾個要買幾包」1 題。',
    '5. 時間允許，再做其他生活活動。',
    '可以故意答錯幾次（例如鋪地墊算成周長、少買一包），看看提示和回饋。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('4. 您操作了哪些活動？').setChoiceValues([
    '面積 5-2 鋪地墊要幾包', '面積 5-3 貼邊條還是貼滿', '面積 5-4 哪個房間比較大', '面積 5-5 菜園分一分',
    '表面積 4-3 包禮物要多少紙', '表面積 4-4 房間四面牆要漆多少', '表面積 4-5 哪一種包法最省紙', '表面積 4-6 罐子的標籤紙',
    '折線圖 6-3 看氣溫決定穿什麼', '折線圖 6-4 我的睡眠和喝水', '折線圖 6-5 我長高了嗎', '折線圖 6-6 存錢圖',
    '因數 8-1 分組一樣多', '因數 8-2 一包幾個要買幾包', '因數 8-3 分裝禮物袋', '因數 8-4 值日輪流', '因數 8-5 桌子排成長方形'
  ]).setRequired(true);
  form.addGridItem().setTitle('5. 請依操作經驗評分。').setRows([
    '「生活決策五步」的順序清楚，學生跟得上。',
    '「先判斷要算什麼（周長、面積、表面積、因數或倍數）」這一步，對學生有幫助。',
    '最後「檢查再決定」（例如買幾包才夠、要不要帶外套），讓學生把算出來的數用回生活。',
    '情境（地墊、包禮物、氣溫、買文具等）和學生的生活有關。',
    '圖示（房間、盒子、折線圖、數字表）清楚，學生看得懂。',
    '答錯時的回饋，讓學生知道要改哪裡。',
    '第三層提示會引導學生觀察，不會直接說出答案。',
    '題目和提示的文字長度，適合輕度智能障礙學生。'
  ]).setColumns(AGREE).setRequired(true);
  form.addParagraphTextItem().setTitle('6. 哪個地方最容易卡住或誤解？')
    .setHelpText('請寫教材和活動編號，例如「面積 5-2 選方法：學生不知道要用除法」。沒有卡住請填「無」。').setRequired(true);
  form.addParagraphTextItem().setTitle('7. 哪個活動最適合、哪個最不適合輕度智能障礙學生？為什麼？')
    .setHelpText('請寫教材和活動編號，沒操作的活動不必評論。');
  single(form, '8. 生活應用單元放在每套教材的最後（教完數學內容才做），您覺得：', [
    '合適，照現在的安排', '應該穿插在中間的單元', '應該放在最前面，當引起動機', '沒有意見'
  ], { other: true, required: true });
  single(form, '9. 生活應用的跨領域代碼（特殊需求生活管理、綜合活動、自然、健體、社會、環境教育），對您寫 IEP 或教學計畫：', [
    '有幫助', '有一點幫助', '沒有幫助', '沒有注意到'
  ], { other: true, required: true });

  // ---------------- 第 3 部分：教師角色 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：以教師角色檢視').setHelpText([
    '請到「教師備課」最上面的「🗺️ 學習地圖與指派」：',
    '1. 按「教材：」後面的一套教材（面積、表面積、折線圖或因數與倍數）。',
    '2. 按「生活應用」路徑，看勾好的活動，再增減。',
    '3. 按「發布給學生」，到學生頁看學習地圖的最後一個單元。'
  ].join('\n'));
  form.addGridItem().setTitle('10. 請評分。').setRows([
    '「生活應用」路徑容易找到。',
    '四套教材的生活應用單元，難度和該年級相符。',
    '生活應用單元適合特教班的生活管理或綜合活動課一起用。',
    '生活應用小測驗題組可以當類化探測。',
    '手冊的生活應用單元說明清楚。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有操作或閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('11. 若要教一位四年級、輕度智能障礙學生用面積解決生活問題，您會指派哪些活動、什麼順序？')
    .setHelpText('請寫活動編號，例如：2-2 → 3-1 → 5-2 → 5-3。也可以寫會刪掉或延後的活動。');

  // ---------------- 第 4 部分：整體 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：整體');
  form.addParagraphTextItem().setTitle('12. 生活應用單元最需要先修改的三件事是什麼？')
    .setHelpText('請依優先順序填寫；不足三項亦可。').setRequired(true);
  form.addParagraphTextItem().setTitle('13. 生活應用單元最值得保留的設計是什麼？');
  form.addParagraphTextItem().setTitle('14. 還可以加入哪些學生生活中的情境？')
    .setHelpText('例如：買菜、布置教室、班級活動分組、量體重。');
  single(form, '15. 您是否願意讓學生試用生活應用單元？', [
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

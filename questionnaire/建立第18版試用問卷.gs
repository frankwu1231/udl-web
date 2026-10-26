/**
 * 四種圖形面積互動教材（第 18 版）｜教師試用回饋問卷
 * --------------------------------------------------------------
 * 使用方法：
 *   1. 到 https://script.google.com 按「新專案」。
 *   2. 把這個檔案的全部內容貼上，取代原本的程式碼，按「儲存」。
 *   3. 確認下方「設定」的網址（測試網址、手冊網址）。
 *   4. 上方函式選「createQuestionnaire」，按「執行」。第一次會要求授權，請選自己的 Google 帳號並允許。
 *   5. 執行完成後，按「執行記錄」可看到：填答網址、編輯網址、回應試算表網址。
 *      表單與試算表會建立在您的 Google 雲端硬碟「我的雲端硬碟」裡。
 * 每執行一次就會建立一份新的表單；不會修改舊表單。
 */

// ======================= 設定 =======================
const SITE_URL = 'https://rectangle-area-lab.frank1231.chatgpt.site';   // 正式網站（需已部署第 18 版）
const GUIDE_URL = SITE_URL + '/seven-guide.html';                        // 網站上的教師使用手冊
const FORM_TITLE = '四種圖形面積互動教材（第 18 版）｜教師試用回饋問卷';
const MAKE_SPREADSHEET = true;   // true：同時建立回應試算表
// ====================================================

const AGREE = ['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '未使用或無法判斷'];

function createQuestionnaire() {
  const form = FormApp.create(FORM_TITLE);
  form.setDescription([
    '謝謝您協助試用。本網站是四種圖形（長方形、正方形、三角形、平行四邊形）面積的互動教材，對象是國小中年級、需要學習支持的學生。設計參考 UDL（通用學習設計）與 SRL（自我調整學習）。',
    '',
    '第 18 版新增：數字目標與把握程度、目標和結果對照、找原因與建議、我的進步與集章、教學階段（老師示範／一起做／自己做／小測驗）、每一步的示範影片（動畫示範，老師也可上傳自己的影片取代）、注音／字級／高對比、休息一下、自問卡、一排一排加、生活情境、實物操作卡、支持建議與進步曲線。',
    '',
    '以上是設計用意，不代表學習成效已經驗證；實際是否適用，需要您的回饋。本次不是評量您的數學或教學能力，請放心記錄困惑與不順的地方。',
    '',
    '● 測試網址：' + SITE_URL,
    '● 教師使用手冊：' + GUIDE_URL,
    '● 預計時間：完整測試約 45～50 分鐘；只測教師角色約 20～25 分鐘。',
    '● 學生頁的操作紀錄存在瀏覽器分頁裡：換頁、重新整理都會保留，關掉分頁才會清除。需要保留請先在「教師觀察」下載 CSV。',
    '● 表單不收集姓名與 Email。請勿在回答、截圖或上傳的影片中出現學生姓名、臉部、個人 API 金鑰或其他可識別資料。'
  ].join('\n'));
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('已收到您的回饋，謝謝您！您的意見會用來修訂下一版教材。');

  // ---------------- 第 1 部分：基本資料與測試環境 ----------------
  single(form, '1. 您的身分為何？', ['特教教師（在職）', '普通班教師', '特教系研究生', '特教系大學部學生'], { other: true, required: true });
  form.addParagraphTextItem().setTitle('2. 您的相關背景為何？')
    .setHelpText('教師可填任教階段、領域（例如資源班、集中式特教班）與教學年資；學生可填年級與實習／教學經驗。不需填校名。');
  form.addGridItem().setTitle('3. 您對下列概念的熟悉程度？')
    .setRows(['UDL（通用學習設計）', 'SRL（自我調整學習）', '影片示範教學（video modeling）'])
    .setColumns(['未接觸過', '聽過但不熟悉', '理解基本概念', '曾在課程或教學中運用'])
    .setRequired(true);
  single(form, '4. 本次主要使用的裝置？', ['電腦', '平板（iPad）', '平板（Android）', '手機'], { other: true, required: true });
  single(form, '5. 本次使用的瀏覽器？', ['Chrome', 'Edge', 'Safari', 'Firefox', '不確定'], { other: true, required: true });
  single(form, '6. 朗讀與聲音的情況？', ['有開聲音，能正常用中文朗讀', '有開聲音，但沒有中文語音或聲音不自然', '沒有開聲音（環境不方便）', '不確定'], {
    required: true, help: '朗讀、動畫示範的旁白與注音的顯示都和裝置有關，這題用來判斷問題出在網站還是裝置。'
  });
  single(form, '7. 您之前用過這個網站嗎？', ['第一次使用', '試用過第 17 版以前的版本', '試用過，也填過上一份回饋問卷'], { required: true });
  single(form, '8. 操作前，您是否閱讀了教師使用手冊？', ['讀完', '讀了一部分', '沒有讀'], { required: true, help: '手冊網址：' + GUIDE_URL });
  const route1 = form.addMultipleChoiceItem().setTitle('9. 本次您要測試哪些部分？')
    .setHelpText('建議完整測試。時間不夠時，可以只測教師角色。').setRequired(true);

  // ---------------- 第 2 部分：學習者角色 ----------------
  const pLearner = form.addPageBreakItem().setTitle('第 2 部分：以學習者角色操作').setHelpText([
    '請以學生的角度操作，先依畫面自行探索。可以邊操作邊說出想法；需要協助時，請記下在哪一步、得到什麼協助。',
    '',
    '1. 進入學生頁，選「長方形」。在「開始前，先想一想」選一個數字目標（例如「1 個以內」）、有多少把握、想先怎麼做（可以試「一排一排加」）。',
    '2. 完成一題：看題目 → 點格子／操作 → 找第一個長度 → 找第二個長度 → 列算式 → 算一算、比一比 → 寫單位。',
    '3. 在某一步故意答錯，直到看到第 3 層提示，按「🎬 看示範影片」看完動畫，再自己改正。',
    '4. 完成畫面：先判斷「有沒有達到目標」，看系統結果；沒達到時選原因、看建議。選「什麼幫助你」和「下一題怎麼做」。',
    '5. 按「下一題」，看規劃頁是否帶出上一題的建議、章與「📈 我的進步」。再完成一題。',
    '6. 換「三角形」或「平行四邊形」，體驗拼合或剪移、找底和高。時間不夠請記下停在哪一步。',
    '7. 試用上方的「ㄅ 注音」「字：大」「◐ 高對比」「🧘 休息一下」，以及解題頁的「🗣️ 我的自問卡」。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('10. 您本次操作了哪些圖形？')
    .setChoiceValues(['長方形', '正方形', '三角形', '平行四邊形', '尚未能開始操作']).setRequired(true);
  single(form, '11. 您完成到什麼程度？', ['完成兩題以上（看到「我的進步」）', '完成一題（含完成畫面的回顧）', '已開始操作，但未完成一題', '尚未能開始操作'], { required: true });
  form.addGridItem().setTitle('12. 請依實際操作經驗評分（學習者角色）。').setRows([
    '我能找到開始操作的位置。',
    '我能理解每一步要完成的任務。',
    '我能理解圖上的長度、底、高或單位方格標示。',
    '我能順利操作數格、拼合或剪移等活動。',
    '圖形操作有助於我理解面積公式的意義。',
    '填錯答案後，回饋能讓我知道如何修正。',
    '我能返回修改，並理解重新核對的要求。',
    '三層提示（💡 給我提示）能幫助我繼續解題。',
    '朗讀內容清楚，能提供需要的支持。',
    '按鈕、文字大小與畫面配置方便操作。',
    '「一排一排加」的方法容易理解。',
    '注音、字級或高對比讓文字更容易閱讀。',
    '「我的自問卡」能提醒我檢查。'
  ]).setColumns(AGREE).setRequired(true);
  single(form, '13. 操作時是否需要他人協助？', ['不需要協助', '需要一般提醒（例如提醒再看一次畫面）', '需要具體操作或概念提示', '需要示範或代為操作', '尚未能開始操作'], { required: true });
  form.addParagraphTextItem().setTitle('14. 哪個地方最容易卡住或產生誤解？')
    .setHelpText('請描述「圖形／步驟 → 想做什麼 → 實際發生什麼 → 是否解決、需要什麼協助」。若沒有卡住，請填「無」，並指出最順利的一個步驟。').setRequired(true);
  single(form, '15. 提示的份量對您而言如何？', ['太少', '稍少', '剛好', '稍多', '太多', '未使用或無法判斷'], { required: true });
  form.addParagraphTextItem().setTitle('16. 哪個提示、文字或圖示最有幫助，或最需要修改？為什麼？');

  // ---------------- 第 3 部分：自我調整流程 ----------------
  form.addPageBreakItem().setTitle('第 3 部分：目標、結果對照與回顧（自我調整流程）')
    .setHelpText('請回想剛才「開始前，先想一想」與完成畫面「我的目標和我的結果」的操作。');
  form.addGridItem().setTitle('17. 請評估目標、核對與回顧的流程。').setRows([
    '我能理解目標與方法選項的意思。',
    '選擇目標與方法時，我有思考本題要怎麼做。',
    '解題過程中，我知道可以用什麼依據核對答案。',
    '反思選項能表達我本題的實際經驗。',
    '我能理解前一題選的策略如何帶入下一題。',
    '我能理解數字目標的意思（例如「最多看 1 個提示」）。',
    '「有多少把握」的三個表情容易選擇。',
    '「我的目標和我的結果」讓我看出自己有沒有達到目標。',
    '原因選項符合我的實際情況，給的建議對下一題有用。',
    '「我的進步」柱狀圖與集章讓我看到自己的進步。'
  ]).setColumns(AGREE).setRequired(true);
  single(form, '18. 在「你覺得，有沒有達到目標？」這一題，您的判斷和系統顯示的結果：', ['一致', '不一致', '沒有出現這一題（目標選了「不限」）', '未體驗'], { required: true });
  form.addParagraphTextItem().setTitle('19. 哪個環節讓您真正思考？哪個環節容易只照順序點選？')
    .setHelpText('請舉實際操作的例子；尚未體驗的部分可註明「未體驗」。').setRequired(true);

  // ---------------- 第 4 部分：示範影片 ----------------
  form.addPageBreakItem().setTitle('第 4 部分：示範影片（動畫示範）').setHelpText([
    '「🎬 看示範影片」會播放這一步的分步示範：手指示範操作、字幕加朗讀，用另一組數字，播完提醒「換你做做看」。',
    '預設在「老師示範」模式，以及學生看到第 3 層提示時出現。若沒看到按鈕，請在某一步多答錯幾次，或請老師把設定改成「每一步都可以看」。'
  ].join('\n'));
  form.addCheckboxItem().setTitle('20. 您看了哪些步驟的示範？').setChoiceValues([
    '看題目', '點格子／動手操作圖形', '找第一個長度（一排幾格／底）', '找第二個長度（有幾排／高）', '列算式', '算一算、比一比', '寫單位', '沒有看到「看示範影片」按鈕', '未嘗試'
  ]).setRequired(true);
  form.addGridItem().setTitle('21. 請評估動畫示範。').setRows([
    '動畫清楚，看得出手指在做什麼。',
    '速度適中（需要時可以按「🐢 慢一點」）。',
    '字幕與朗讀同步，容易理解。',
    '看完後，我知道接下來要自己做哪一個動作。',
    '示範用不同的數字，不會直接給出這一題的答案。',
    '「停止／再看一次」容易使用。',
    '這樣的示範適合輕度智能障礙或學習困難的學生。'
  ]).setColumns(AGREE).setRequired(true);
  single(form, '22. 您認為示範影片最適合在什麼時候出現？', [
    '老師示範模式，以及看到第 3 層提示時（目前預設）', '每一步一開始就可以看', '只在老師示範模式', '學生答錯一次就出現', '不需要示範影片'
  ], { other: true, required: true });
  form.addParagraphTextItem().setTitle('23. 哪一步的示範最需要修改？請說明（例如：太快、看不懂手指在做什麼、字幕太長）。');
  const route2 = form.addMultipleChoiceItem().setTitle('24. 接下來要測試教師角色嗎？').setRequired(true);

  // ---------------- 第 5 部分：教師角色 ----------------
  const pTeacher = form.addPageBreakItem().setTitle('第 5 部分：以教師角色規劃教學').setHelpText([
    '請選一個下列案例，或以不含身分資料的熟悉案例替代。這些案例是情境假設，不代表任何診斷或群體都有相同需求。',
    '- 案例 A：會基本乘法，但還不理解單位方格、每排格數與排數如何連到面積公式。',
    '- 案例 B：能套公式，但在三角形或平行四邊形容易把斜的邊當作高。',
    '- 案例 C：閱讀較慢，需要簡短指令、注音或朗讀，但能用點選與操作表達理解。',
    '- 案例 D：注意力較短，要先看示範才會做，容易急著亂按。',
    '',
    '請到「教師備課」頁檢視並實際調整：難度、流程、提示程度、教學階段（老師示範→一起做→自己做→小測驗）、目標類型、閱讀輔助預設、可以選的方法、生活情境、示範影片（預覽動畫；可試著上傳一段自己用螢幕錄影錄的短片取代動畫）。按「發布給學生」後到學生頁確認。',
    '再到學生頁右上「教師觀察」：看支持建議、本題摘要、進步曲線（可切換研究階段），記錄一次教師觀察並下載 CSV。',
    '成人體驗與假設案例不能取代真實學生試教。'
  ].join('\n'));
  single(form, '25. 您選擇哪一個教學案例？', ['案例 A：單位方格與乘法連結', '案例 B：底與高的辨識', '案例 C：閱讀與回應支持', '案例 D：注意力與示範需求'], {
    other: true, required: true, help: '選「其他」可填自訂案例，勿填入可識別資料。'
  });
  form.addParagraphTextItem().setTitle('26. 您會如何安排教學？')
    .setHelpText('請簡述：選哪種圖形與起點、用哪個教學階段開始、提供什麼支持（提示、示範影片、閱讀輔助、實物）、何時介入，以及看到什麼表現後會減少支持。').setRequired(true);
  form.addGridItem().setTitle('27. 請依教師角色的檢視經驗評分。').setRows([
    '我能找到需要的教師工具。',
    '我能理解並調整完整引導與減少提示。',
    '網站提供的支持方式適合我選擇的案例。',
    '我能從操作過程觀察學生的困難與使用策略。',
    '教師觀察欄位能記錄我關心的學習行為。',
    '下載的 CSV 內容容易理解。',
    '我能規劃將這個教材放入課堂的方式。',
    '教學階段（老師示範→一起做→自己做→小測驗）符合我的教學順序。',
    '「支持建議」對增加或減少支持的判斷合理。',
    '進步曲線與研究階段標記有助於監控學生進步。',
    '閱讀輔助預設、方法勾選與生活情境的設定容易使用。',
    '實物操作卡可以直接用在課堂。'
  ]).setColumns(AGREE).setRequired(true);
  single(form, '28. 您是否成功記錄教師觀察並下載 CSV？', ['兩者皆完成', '已記錄觀察，但未成功下載', '已下載，但未記錄觀察', '有嘗試，但兩者皆未完成', '未嘗試'], { required: true });
  single(form, '29. 您是否試著上傳示範影片取代動畫？', [
    '上傳成功，學生頁看到我的影片', '上傳成功，但學生頁沒有看到', '上傳失敗', '只預覽了動畫，沒有上傳', '未嘗試'
  ], { required: true, help: '請勿上傳含有學生臉部、姓名或聲音的影片。上傳失敗時，請在第 32 題描述檔案格式、大小與畫面訊息。' });
  single(form, '30. 實際教學時，您會自己錄製示範影片取代動畫嗎？', [
    '會', '可能會，但需要更多時間或範例', '不會：動畫已經足夠', '不會：時間不夠', '不會：不熟悉錄影或剪輯', '不會：隱私或學校規定的考量'
  ], { other: true, required: true });
  form.addParagraphTextItem().setTitle('31. 哪些地方仍需要教師提醒、示範或代為操作？')
    .setHelpText('請指出具體步驟與理由；若目前無法判斷，請說明還需要觀察什麼。').setRequired(true);
  form.addParagraphTextItem().setTitle('32. 若用於真實課堂，最主要的限制或需要補充的支持是什麼？')
    .setHelpText('可考量先備能力、閱讀、操作、注意力、課堂時間、裝置、網路、影片上傳或其他需求。');

  // ---------------- 第 6 部分：UDL 與 SRL 檢視 ----------------
  form.addPageBreakItem().setTitle('第 6 部分：操作後檢視 UDL 與 SRL 設計').setHelpText([
    '完成操作後，再參考以下對照。這是功能與設計用意，不代表學習成效已獲驗證。',
    '- UDL：圖形、文字、朗讀與標色、動畫示範、注音、字級與高對比提供不同理解途徑；點選、輸入、拖曳、錄音，以及教師代輸入口述／指選支持表達；難度、流程、提示程度、教學階段可調整支持；生活情境、實物操作卡與「找一找」支持類化；休息與正向語氣降低干擾。重點是是否降低實際障礙，不只是功能數量。',
    '- SRL：解題前設定數字目標、評估把握、選方法；解題中自問卡、提示、示範、比一比與返回修正；完成後自己判斷是否達標、對照結果、找原因、得到建議並帶入下一題；我的進步與集章呈現累積的進步。完成點選或答對，不等於已具備自我調整能力。'
  ].join('\n'));
  form.addParagraphTextItem().setTitle('33. 請指出一項您認為符合 UDL 設計方向的功能。')
    .setHelpText('說明具體操作、可能支持的需求，以及限制。若沒有明確例子或無法判斷，也請如實填寫。').setRequired(true);
  form.addParagraphTextItem().setTitle('34. 請指出一項您認為能支持 SRL 的功能。')
    .setHelpText('說明它如何促進規劃、監控或反思，以及需要什麼教師引導。若沒有明確例子或無法判斷，也請如實填寫。').setRequired(true);
  form.addParagraphTextItem().setTitle('35. 哪項設計最可能流於形式？您會如何修改？')
    .setHelpText('例如：目標隨意點選、把握程度沒有意義、自評總是選「有達到」、原因與實際不符、集章變成只追求答對、示範影片看完仍不會做等；也可填其他觀察或「目前未發現」。').setRequired(true);
  form.addParagraphTextItem().setTitle('36. 請區分操作事實與對學生的推測。')
    .setHelpText('請分兩行回答：\n1. 我實際操作遇到的情況：＿＿＿＿\n2. 我推測學生可能遇到的情況，以及推測依據：＿＿＿＿').setRequired(true);

  // ---------------- 第 7 部分：AI（選答） ----------------
  form.addPageBreakItem().setTitle('第 7 部分：AI 功能（選答）')
    .setHelpText('AI 不影響本表主要任務，也不需要提供個人 API 金鑰。請依畫面實際顯示回報；AI 無法使用時網站會改顯示固定提示，請不要把固定提示的體驗當作 AI 的效果。');
  form.addCheckboxItem().setTitle('37. 您嘗試了哪些 AI 功能？')
    .setChoiceValues(['🤖 問 AI（看過 2 層提示後出現）', '請 AI 問我一個反思問題', '教師觀察：請 AI 整理本題紀錄', '未嘗試']);
  form.addCheckboxItem().setTitle('38. 畫面實際顯示什麼？')
    .setChoiceValues(['顯示 AI 回應', '顯示「AI 現在不能用」與固定提示', '顯示錯誤或沒有反應', '無法判斷內容來源']);
  form.addParagraphTextItem().setTitle('39. 若有嘗試，內容是否清楚、有助於思考，或有不正確、直接代答的情況？')
    .setHelpText('請註明功能與畫面顯示的來源，並描述例子；勿填入個人金鑰。');

  // ---------------- 第 8 部分：手冊與整體心得 ----------------
  form.addPageBreakItem().setTitle('第 8 部分：使用手冊與整體心得');
  form.addGridItem().setTitle('40. 請評估教師使用手冊。').setRows([
    '手冊說明清楚，能幫我找到需要的功能。',
    '手冊建議的教學順序（示範→一起做→自己做→小測驗）可行。',
    '手冊對示範影片錄製與隱私的說明足夠。',
    '手冊對紀錄保存與 CSV 的說明足夠。'
  ]).setColumns(['1 非常不同意', '2 不同意', '3 普通', '4 同意', '5 非常同意', '沒有閱讀']).setRequired(true);
  form.addParagraphTextItem().setTitle('41. 這個網站最值得保留的設計是什麼？為什麼？').setRequired(true);
  form.addParagraphTextItem().setTitle('42. 如果只能優先修改三件事，您的建議為何？')
    .setHelpText('請依優先順序填寫，並簡述理由；不足三項亦可。').setRequired(true);
  single(form, '43. 您目前對使用這個網站的意願為何？', [
    '願意在教師陪同下讓學生試用', '修改部分內容後，願意在教師陪同下試用', '需要更多資訊或觀察後再決定', '目前不考慮使用', '無法判斷'
  ], { required: true });
  form.addParagraphTextItem().setTitle('44. 其他心得或建議。');

  // ---------------- 分流 ----------------
  const pOverall = form.getItems(FormApp.ItemType.PAGE_BREAK).map(i => i.asPageBreakItem()).find(p => p.getTitle().indexOf('第 6 部分') === 0);
  route1.setChoices([
    route1.createChoice('完整測試：先以學習者角色操作，再以教師角色檢視（約 45～50 分鐘）', pLearner),
    route1.createChoice('只測教師角色（約 20～25 分鐘）', pTeacher)
  ]);
  route2.setChoices([
    route2.createChoice('是，繼續測試教師角色', pTeacher),
    route2.createChoice('否，直接到 UDL 與 SRL 檢視', pOverall)
  ]);

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

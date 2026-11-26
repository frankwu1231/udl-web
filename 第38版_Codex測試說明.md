# 第 38 版：給 Codex 的測試說明（朗讀改善第一步：讀音修正與共用語音）

請 Codex 依這份說明測試第 38 版（分支 `claude/project-thread-gdhsbn`），並提出修改意見。**只在本機測試，不要部署，不要連到正式網站、正式資料庫或正式的 Google 試算表。**

## 一、準備

```bash
git fetch origin claude/project-thread-gdhsbn
git checkout claude/project-thread-gdhsbn
git rev-parse HEAD                        # 確認是本分支最新 commit
npm install
npm run build
npm test                                  # 自動測試（含瀏覽器測試，需要 Playwright），應該 153 項全過
node scripts/preview-feedback.mjs         # 本機預覽：http://127.0.0.1:4173
```

## 二、這一版做了什麼

教材內容沒有改，只改朗讀。

1. **共用語音工具 `public/speech.js`**（`window.speech`）：
   - `voice()`：選語音。優先順序：台灣國語（zh-TW）的 Natural／Neural ＞ Online ＞ Google、美佳、曉臻等 ＞ 任何 zh-TW ＞ 香港 ＞ 其他中文；非中文語音不用。
   - `fix(text)`：朗讀前的讀音修正。依 `zhuyin.js` 判斷的讀音，把「少數讀音」的破音字換成同音字再交給語音引擎，**畫面文字不變**、字數不變。
     - 詞語判斷出的少數讀音：還ㄏㄨㄢˊ→環、行ㄏㄤˊ→航、長ㄓㄤˇ→掌、種ㄓㄨㄥˋ→眾、空ㄎㄨㄥˋ→控、覺ㄐㄧㄠˋ→叫、樂ㄌㄜˋ→勒、得ㄉㄜˊ→德、給ㄐㄧˇ→己、教ㄐㄧㄠ→交、打ㄉㄚˊ→達、著ㄓㄨㄛˊ→酌 等。
     - 動詞的「數ㄕㄨˇ、量ㄌㄧㄤˊ」：只在明確的動詞用法才換（數一數、量一量、往上數、一個一個數、數到、數出、再數、先量……）；「數字、數量、倍數」等不換。
2. **所有朗讀都改用它**：學生頁「全部唸給我聽」與每句 🔊（`seven.js`）、導覽小方（`seven.js`）、動畫示範（`step-demo.js`）、小方（`buddy.js`）、AI 小老師（`tutor.js`）、小測驗（`probe.js`）、學生問卷（`research.js`）。`seven.html`、`probe.html` 在 `zhuyin.js` 後面載入 `speech.js`；`worker/index.js` 的學生可讀檔案加入 `/speech.js`。
3. **注音修正**（`zhuyin.js`）：「排成長方形／變成長方形」的長讀ㄔㄤˊ（原本被「成長」吃掉讀成ㄓㄤˇ）、「糖的數量」的量讀ㄌㄧㄤˋ、「每一種不只」的種讀ㄓㄨㄥˇ。另外匯出 `zhuyin.reading(字)`（預設讀音）。
4. 版本號 v38、快取參數 `20261126-38`、手冊閱讀輔助表的朗讀說明與更新紀錄、README。

## 三、請測試

1. **讀音修正**（瀏覽器主控台，學生頁）：
   - `speech.fix('數一數有幾格')` → `暑一暑有幾格`；`speech.fix('去銀行存錢')` → `去銀航存錢`；`speech.fix('多了要還給店員')` → `多了要環給店員`。
   - 不該換的：`數字`、`數學`、`糖的數量`、`長方形`、`排成長方形`、`倍數`、`重量`、`我卡住了` 都原樣。
   - 抽查各教材包（面積、表面積、折線圖、因數倍數、時間、分數、整數、錢幣、生活單元）的題目，用 `speech.fix(document.querySelector('#app').innerText)` 和原文比較，找出換錯的字。
2. **實際聽**：用 Chrome 和 Edge 各開一次學生頁，按「全部唸給我聽」、每句 🔊、動畫示範、小方、學生問卷、小測驗，確認都有聲音、唸法正確、沒有唸出同音字以外的怪音。Edge 應該選到「Microsoft HsiaoChen Online (Natural)」之類的語音（`speech.voice().name`）。
3. **畫面不變**：開注音時，朗讀不會改到畫面文字或注音；朗讀時的標色正常。
4. **沒有中文語音的裝置**（例如英文 Safari）：仍會出現「這台裝置沒有中文語音」的提醒，不會用英文語音。
5. 手機、平板：朗讀與停止正常。

## 四、回報格式

請列出：問題、重現步驟、預期結果、實際結果、建議修改（含檔案與行號）。換錯的字請附原句和 `speech.fix` 的結果。

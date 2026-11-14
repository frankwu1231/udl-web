'use strict';
// 第 26 版：錯誤的「觀察代碼」。記的是看得到的事實（例如「答案剛好等於周長」），
// 可能的原因另外列成「候選」，不直接當成學生的迷思。原因要老師或確認任務再判斷。
(() => {
  const OBS = {
    blank: ['沒作答', '還沒作答就按檢查（不算答錯）'],
    unfinished: ['操作還沒做完', '格子沒點完、沒鋪滿、還沒拼好，或還沒點圖'],
    countShort: ['數出的數比答案少', '候選：漏數方格；點數程序需要支持'],
    countOver: ['數出的數比答案多', '候選：重複數同一格；點數程序需要支持'],
    offByOne: ['和答案差 1', '候選：漏數或多數一格，或計算失誤'],
    eqPerimeter: ['答案剛好等於周長的數', '候選：把周長當成面積；也可能是計算失誤，需要確認'],
    eqSum: ['答案等於兩個數相加', '候選：用加的，不是乘的'],
    eqDouble: ['答案等於兩片合起來的面積', '候選：三角形或梯形忘了 ÷ 2'],
    eqArea: ['把面積填在邊長的位置', '候選：分不清已知和要找的量'],
    eqAreaValue: ['周長的答案剛好等於面積的數', '候選：把面積當成周長，需要確認'],
    swapped: ['填成另一個邊的數', '候選：一排的格數和排數對調'],
    chosePerimeter: ['選了「沿著邊、一圈」的選項', '候選：把周長當成面積，需要確認'],
    choseArea: ['在周長的題目選了面積的選項', '候選：把面積當成周長，需要確認'],
    unitLength: ['面積選了長度的單位', '候選：忘了「平方」；單位概念'],
    unitArea: ['周長選了面積的單位', '候選：單位概念'],
    unitScale: ['單位的大小選錯', '候選：平方公分和平方公尺的大小'],
    choseSum: ['選了相加的算式', '候選：用加的，不是乘的'],
    choseFull: ['選了兩片合起來的算式', '候選：三角形或梯形忘了 ÷ 2'],
    // 第 27 版：表面積教材包
    eqHalf: ['答案剛好是三種面各算一次的和', '候選：每種面只算一個，忘了 × 2'],
    eqVolume: ['答案剛好等於長 × 寬 × 高', '候選：把體積當成表面積，需要確認'],
    choseVolume: ['選了「裡面可以裝多少」或體積的算式', '候選：把體積當成表面積，需要確認'],
    missFace: ['少算了一種面（兩個面）或數面時漏了面', '候選：漏掉一組對面'],
    eqOneFace: ['答案剛好等於一個面的面積', '候選：只算了一個面'],
    sixSame: ['長方體算成同一個面 × 6', '候選：以為六個面都一樣大'],
    unitVolume: ['表面積選了體積的單位', '候選：分不清平方公分和立方公分'],
    oneBase: ['柱體只算了一個底面', '候選：漏掉被擋住的底面'],
    missBases: ['柱體兩個底面都沒算', '候選：只看到側面，沒有把底面算進去'],
    halfCirc: ['圓周長只算了半徑 × 3.14', '候選：把半徑當成直徑'],
    // 第 28 版：折線圖教材包
    scaleAsOne: ['一格不是 1，答案卻是用一格當 1 算的數', '候選：沒有先看一格代表多少'],
    countTicks: ['答案等於刻度線的條數，不是格數', '候選：數刻度線，不是數間隔'],
    misalign: ['答案是隔壁時間（或隔壁一格、隔壁欄列）的數', '候選：對齊時看錯行或列；可用導引線支持'],
    highVsChange: ['問增加最多的一段，選了走到最高點的那一段', '候選：把「最高」當成「增加最多」'],
    partialTrend: ['只有一部分上升，卻選了「一直變多」（或一直變少）', '候選：只看一段就下整體的結論'],
    legendMix: ['答案是另一條線的數，或圖例選錯', '候選：沒有先看圖例'],
    ignoreBreak: ['縱軸有波浪線，答案卻是從 0 數格子的數', '候選：不懂波浪線是省略下面的數'],
    zeroMissing: ['數值是 0 的點沒有描', '候選：以為 0 不用畫'],
    orderJump: ['橫軸或連線沒有照時間的順序', '候選：不知道折線要依時間先後連'],
    wrongChart: ['沒有時間順序的資料選了折線圖', '候選：分不清分類資料和有順序的變化'],
    overPredict: ['把「以後一定會…」當成圖上的根據', '候選：分不清看到的資料和猜測'],
    wrongChoice: ['選錯選項', '需要老師判斷原因'],
    other: ['其他錯誤', '需要老師判斷原因']
  };
  // 一題的結果：correct 對、wrong 錯、blank 沒作答、undetermined 無法判定、tech 技術中斷
  const OUTCOMES = { correct: '答對', wrong: '答錯', blank: '沒作答', undetermined: '無法判定', tech: '技術中斷' };
  // 數字題：依答案、學生填的數，以及可能混淆的數，找出看得到的事實
  function numeric(v, answer, { perimeter, sum, double, area, other } = {}) {
    if (v === null || v === undefined || Number.isNaN(v)) return 'blank';
    if (perimeter !== undefined && v === perimeter && v !== answer) return 'eqPerimeter';
    if (double !== undefined && v === double && v !== answer) return 'eqDouble';
    if (sum !== undefined && v === sum && v !== answer) return 'eqSum';
    if (area !== undefined && v === area && v !== answer) return 'eqArea';
    if (other !== undefined && v === other && v !== answer) return 'swapped';
    if (Math.abs(v - answer) === 1) return 'offByOne';
    return v < answer ? 'countShort' : 'countOver';
  }
  const label = code => (OBS[code] || OBS.other)[0];
  const candidate = code => (OBS[code] || OBS.other)[1];
  window.areaObs = { OBS, OUTCOMES, numeric, label, candidate };
})();

'use strict';
// 第 38 版：所有朗讀共用的語音工具
// 1. 讀音修正：朗讀前把容易唸錯的破音字換成同音字（只換給語音引擎聽，畫面文字不變）。
//    讀音沿用注音表（zhuyin.js）的判斷，所以「畫面上的注音」和「唸出來的聲音」一致。
// 2. 語音選擇：優先台灣國語的自然語音（Edge 的 Natural／Online、Google 國語（臺灣）、美佳），
//    其次任何台灣國語，最後才用其他中文語音。
(() => {
  // 少數讀音 → 同音字。只在注音表判斷是這個讀音、而且不是該字預設讀音時才換（例如「銀行」→「銀航」）。
  const FIX = {
    '還ㄏㄨㄢˊ': '環', '行ㄏㄤˊ': '航', '長ㄓㄤˇ': '掌', '種ㄓㄨㄥˋ': '眾', '空ㄎㄨㄥˋ': '控', '調ㄊㄧㄠˊ': '條',
    '覺ㄐㄧㄠˋ': '叫', '樂ㄌㄜˋ': '勒', '得ㄉㄜˊ': '德', '給ㄐㄧˇ': '己', '教ㄐㄧㄠ': '交', '更ㄍㄥ': '耕',
    '少ㄕㄠˋ': '紹', '打ㄉㄚˊ': '達', '好ㄏㄠˋ': '號', '著ㄓㄨㄛˊ': '酌', '差ㄔㄚˋ': '岔', '差ㄔㄞ': '拆',
    '應ㄧㄥˋ': '映', '相ㄒㄧㄤˋ': '象', '角ㄐㄩㄝˊ': '決'
  };
  // 預設讀音本身就是語音引擎常唸錯的動詞（數ㄕㄨˇ、量ㄌㄧㄤˊ）：只在明確的動詞用法才換
  const VERB = { '數': '暑', '量': '良' };
  const VERB_AT = /([數量])(?=一\1|\1看|一下|看看|到|完|出|好|對|錯|格|一遍|幾)|(?<=([數量])一)[數量]|(?<=往[上下前後左右]|再|先|來|去|要|會|自己|一起|慢慢|重新|用尺|一個一個|兩個兩個|五個五個|十個十個)[數量]/g;

  function fix(text) {
    text = String(text ?? '');
    const z = window.zhuyin;
    if (!z?.readings || !/[一-鿿]/.test(text)) return text;
    const verbAt = new Set();
    for (const m of text.matchAll(VERB_AT)) verbAt.add(m.index);
    let out = '', i = 0;
    for (const [ch, r] of z.readings(text)) {
      const own = z.reading?.(ch) ?? '';
      if (r && r !== own && FIX[ch + r]) out += FIX[ch + r];
      else if (VERB[ch] && r === own && verbAt.has(i)) out += VERB[ch];
      else out += ch;
      i += ch.length;
    }
    return out;
  }

  const GOOD = /Natural|Online|Neural|Mei-Jia|美佳|Yating|HsiaoChen|曉臻|HsiaoYu|曉雨|YunJhe|雲哲|Hanhan|Google/i;
  function score(v) {
    let s = 0;
    if (/^zh[-_]TW/i.test(v.lang)) s += 100;
    else if (/^zh[-_](HK|Hant)/i.test(v.lang)) s += 20;
    else if (/^zh/i.test(v.lang)) s += 10;
    else return -1;
    if (/Natural|Neural/i.test(v.name)) s += 40;
    else if (/Online/i.test(v.name)) s += 30;
    else if (GOOD.test(v.name)) s += 20;
    return s;
  }
  function voice() {
    try {
      const list = (speechSynthesis.getVoices() || []).map(v => [score(v), v]).filter(x => x[0] >= 0);
      list.sort((a, b) => b[0] - a[0]);
      return list[0]?.[1] || null;
    } catch { return null; }
  }
  // 建立一句朗讀：已修正讀音、已選好語音
  function utter(text, rate = 0.9) {
    const u = new SpeechSynthesisUtterance(fix(text));
    u.lang = 'zh-TW'; u.rate = rate;
    const v = voice(); if (v) u.voice = v;
    return u;
  }
  function say(text, rate) {
    try { if (!('speechSynthesis' in window)) return null; speechSynthesis.cancel(); const u = utter(text, rate); speechSynthesis.speak(u); return u; } catch { return null; }
  }
  try { speechSynthesis.addEventListener?.('voiceschanged', () => {}); } catch { /* 略過 */ }
  window.speech = { fix, voice, utter, say, score };
})();

'use strict';
// 學習小幫手「小方」（第 22 版）：解題時在右下角陪學生。
// 1. 卡住偵測：同一步很久沒有動、或同一步一直答錯，就主動問要不要幫忙，再幫學生打開原本的提示或「我卡住了」。
// 2. 專心提醒（老師開啟、學生按「好」才用）：用鏡頭在這台電腦上判斷臉有沒有朝向螢幕；影像不存、不上傳。
// 學生頁（seven.js）用 areaBuddy.attach() 把狀態和動作交給小幫手；小幫手不直接改解題狀態。
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CONSENT_KEY = 'area-buddy-camera-v22';
  // 鏡頭模型：MediaPipe Face Landmarker（在瀏覽器裡執行）
  const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const LOOK_EVERY = 250;          // 每秒看 4 次就夠，省電
  const REMIND_GAP = 20;           // 兩次專心提醒至少隔 20 秒
  const SAY = {
    offer: '要不要我幫你？',
    offerMax: '提示都看完了。要不要換個方法？',
    stuck: '慢慢來。我幫你打開「我卡住了」，選一個方法。',
    probe: '慢慢想，你可以的。',
    wrong: '沒關係，再試一次。看看上面的提示。',
    same: '這個答案剛剛試過了。換一個想法看看。',
    fast: '慢慢來。先看提示，想一想再按。',
    long: '這一步做了很久了。要不要我幫你？',
    wrongMore: '這一步比較難。我幫你打開「我卡住了」。',
    right: ['答對了！', '做得好！', '你做到了！'],
    look: '眼睛看這裡喔！我們一起做。',
    back: '歡迎回來！我們繼續。',
    restAsk: '好像有點累了。要不要休息一下？',
    ask: '小方可以用鏡頭看你有沒有在看螢幕嗎？畫面只在這台電腦，不會存起來，也不會傳出去。',
    camFail: '鏡頭打不開。沒關係，我們繼續。',
    camOff: '好，鏡頭關掉了。'
  };

  let api = null, root = null, cfg = {}, steps = [], where = '';
  let idle = 0, stage = 0, onStep = 0, wrongs = {}, lastWrong = {}, hideTimer = 0, lastSpoken = '', offering = false, asked = false;
  let cam = null;                  // { stream, video, detector, timer, away, awaySince, lastRemind, reminds:[] }

  // ---------- 畫面 ----------
  const face = () => `<svg viewBox="0 0 64 64" aria-hidden="true"><line x1="32" y1="4" x2="32" y2="12" class="b-ant"/><circle cx="32" cy="4" r="3" class="b-tip"/>
    <rect x="8" y="12" width="48" height="42" rx="12" class="b-head"/><rect x="14" y="20" width="36" height="22" rx="7" class="b-screen"/>
    <g class="b-eyes"><ellipse cx="24" cy="31" rx="4" ry="5"/><ellipse cx="40" cy="31" rx="4" ry="5"/></g><path d="M26 47 Q32 51 38 47" class="b-mouth"/></svg>`;
  function mount() {
    if (root) return;
    root = document.createElement('aside');
    root.id = 'buddy'; root.className = 'buddy'; root.setAttribute('aria-label', '學習小幫手小方');
    root.innerHTML = `<div class="buddy-bubble" id="buddyBubble" role="status" aria-live="polite" hidden></div>
      <button type="button" class="buddy-face" id="buddyFace" aria-label="小方：按我，我來幫你">${face()}</button>
      <p class="buddy-cam" id="buddyCam" hidden><span>📷 鏡頭開著</span><button type="button" id="buddyCamOff">關掉</button></p>`;
    document.body.append(root); document.body.classList.add('has-buddy');
    root.querySelector('#buddyFace').onclick = () => { api?.log('小幫手', { action: '學生按小方' }); offer(true); };
    root.querySelector('#buddyCamOff').onclick = () => { stopCamera('學生關掉鏡頭'); say(SAY.camOff, { mood: 'calm', ttl: 3000 }); };
  }
  function unmount() { stopCamera(); root?.remove(); root = null; document.body.classList.remove('has-buddy'); }
  function mood(m) { if (root) root.dataset.mood = m; }
  // buttons：[[文字, 動作]]，有按鈕時不自動收起
  function say(text, { buttons = [], mood: m = 'talk', ttl = 0, speak = true } = {}) {
    if (!root) return;
    const box = root.querySelector('#buddyBubble');
    box.innerHTML = `<p>${esc(text)}</p>${buttons.length ? `<div class="buddy-actions">${buttons.map(([t], i) => `<button type="button" data-buddy="${i}">${esc(t)}</button>`).join('')}</div>` : ''}`;
    box.hidden = false; box.classList.toggle('interactive', buttons.length > 0);
    box.querySelectorAll('[data-buddy]').forEach(b => b.onclick = () => { hide(); buttons[Number(b.dataset.buddy)][1](); });
    mood(m); clearTimeout(hideTimer);
    if (ttl) hideTimer = setTimeout(hide, ttl);
    if (speak) talk(text);
  }
  function hide() { offering = false; clearTimeout(hideTimer); const box = root?.querySelector('#buddyBubble'); if (box) { box.hidden = true; box.innerHTML = ''; } mood('calm'); }
  function talk(text) {
    lastSpoken = text;
    if (!cfg.buddyVoice || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-TW'; u.rate = cfg.rate === 'slow' ? 0.7 : 0.9; const v = api?.voice?.(); if (v) u.voice = v; speechSynthesis.speak(u); } catch { /* 不能朗讀時只顯示文字 */ }
  }

  // ---------- 卡住偵測 ----------
  const open = () => steps.find(s => !api.passed(s));   // 這一頁還沒過的第一步
  // 老師在旁邊、看提示、看影片、朗讀、對話框開著時，都不算「沒有動」
  const paused = () => document.hidden || !!document.querySelector('dialog[open]') || api.busy() ||
    ('speechSynthesis' in window && speechSynthesis.speaking) || [...document.querySelectorAll('.video-slot video')].some(v => !v.paused);
  function offer(manual) {
    const s = open();
    if (where !== 'solve' || s === undefined) { if (manual) say('我在這裡陪你。', { mood: 'happy', ttl: 3000 }); return; }
    if (api.mode() === 'probe') { say(SAY.probe, { mood: 'happy', ttl: 5000 }); return; }
    if (api.mode() === 'demo') { if (manual) say('先看老師怎麼做。', { ttl: 4000 }); return; }
    api.log('小幫手', { activity: s + 1, action: manual ? '學生按小方' : '主動問要不要幫忙', idle: manual ? undefined : idle });
    const max = api.hintLevel(s) >= 3;
    offering = true;
    say(max ? SAY.offerMax : SAY.offer, { mood: 'worried', buttons: [
      max ? ['😣 好，幫我', () => openStuck(s, '小幫手：接受')] : ['💡 好，給我提示', () => { api.log('小幫手', { activity: s + 1, action: '接受提示' }); api.hint(s); idle = 0; stage = 0; }],
      ['我自己想', () => { api.log('小幫手', { activity: s + 1, action: '自己想' }); idle = 0; stage = 0; say('好，加油！', { mood: 'happy', ttl: 2500 }); }]
    ] });
  }
  function offerLong(s) {
    api.log('小幫手', { activity: s + 1, action: '同一步做很久' });   // 學生一直在動，所以這個問題不因為動了就收起
    say(SAY.long, { mood: 'worried', buttons: [
      ['😣 好，幫我', () => openStuck(s, '小幫手：接受')],
      ['我自己想', () => { api.log('小幫手', { activity: s + 1, action: '自己想' }); say('好，加油！', { mood: 'happy', ttl: 2500 }); }]
    ] });
  }
  function openStuck(s, why) { api.log('小幫手', { activity: s + 1, action: why }); api.stuck(s); idle = 0; stage = 0; }
  function tick() {
    if (!api || !cfg.buddy || where !== 'solve' || open() === undefined || paused()) return;
    idle++; onStep++;
    const wait = cfg.buddyWait || 60;
    // 一直在動、但同一步一直過不了：不看有沒有動，在這一步待了 3 倍等待時間就問（之後每 3 倍再問一次）
    if (onStep >= wait * 3 && !offering && api.mode() !== 'probe' && api.mode() !== 'demo') { onStep = 0; offerLong(open()); return; }
    if (stage === 0 && idle >= wait) { stage = 1; offer(false); }
    else if (stage === 1 && idle >= wait * 2 && api.mode() !== 'probe' && api.mode() !== 'demo') {
      stage = 2; const s = open();
      if (!api.stuckOpen(s)) { say(SAY.stuck, { mood: 'worried', ttl: 8000 }); openStuck(s, '主動打開我卡住了'); stage = 2; }   // 打開後就不再催，等學生自己選
    }
  }
  // 學生自己動了：重新計時，收起還沒回答的「要不要幫忙」
  function active() { idle = 0; stage = 0; if (offering) hide(); }
  ['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'].forEach(e => document.addEventListener(e, ev => { if (!root || !root.contains(ev.target)) active(); }, { passive: true, capture: true }));
  setInterval(tick, 1000);

  // ---------- 鏡頭：臉有沒有朝向螢幕 ----------
  // 用 3 個點估計頭轉向：鼻尖在兩眼外角之間的位置。0.5 是正面，偏太多就是轉頭。低頭寫字不算分心。
  function gaze(points) {
    if (!points || points.length < 264) return { face: false, turn: 0 };
    const l = points[33], r = points[263], n = points[1];
    const w = r.x - l.x; if (Math.abs(w) < 1e-3) return { face: true, turn: 1 };
    return { face: true, turn: Math.abs((n.x - l.x) / w - 0.5) * 2 };   // 0 正面，1 完全側面
  }
  const looking = g => g.face && g.turn < 0.45;

  function askCamera() {
    if (!cfg.attention || cam || asked || where === 'map') return;
    asked = true;   // 這一頁只問一次
    let saved = ''; try { saved = sessionStorage.getItem(CONSENT_KEY) || ''; } catch { /* 略過 */ }
    if (saved === 'no') return;
    if (saved === 'yes') { startCamera(); return; }
    say(SAY.ask, { mood: 'calm', buttons: [
      ['📷 好', () => { try { sessionStorage.setItem(CONSENT_KEY, 'yes'); } catch { /* 略過 */ } api.log('小幫手', { action: '同意用鏡頭' }); startCamera(); }],
      ['不要', () => { try { sessionStorage.setItem(CONSENT_KEY, 'no'); } catch { /* 略過 */ } api.log('小幫手', { action: '不同意用鏡頭' }); say('好，不用鏡頭。', { mood: 'happy', ttl: 2500 }); }]
    ] });
  }
  async function makeDetector(video) {
    if (window.areaBuddyTestDetector) return window.areaBuddyTestDetector;   // 自動測試用的假鏡頭
    const { FaceLandmarker, FilesetResolver } = await import(`${VISION}/vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${VISION}/wasm`);
    const make = delegate => FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1 });
    const lm = await make('GPU').catch(() => make('CPU'));
    return { detect: () => gaze(lm.detectForVideo(video, performance.now()).faceLandmarks?.[0]), close: () => lm.close() };
  }
  async function startCamera() {
    if (cam) return;
    cam = { away: false, awaySince: 0, lastRemind: -Infinity, reminds: [] };
    try {
      if (!window.areaBuddyTestDetector) {
        cam.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
        cam.video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, srcObject: cam.stream });
        await cam.video.play();
      }
      cam.detector = await makeDetector(cam.video);
      if (!cam) return;   // 載入時已經關掉
      root.querySelector('#buddyCam').hidden = false;
      api.log('小幫手', { action: '鏡頭開始' });
      cam.timer = setInterval(look, LOOK_EVERY);
    } catch (e) {
      stopCamera(); api.log('小幫手', { action: '鏡頭打不開', error: String(e && e.name || e) }); say(SAY.camFail, { mood: 'calm', ttl: 4000 });
    }
  }
  function stopCamera(why) {
    if (!cam) return;
    clearInterval(cam.timer); cam.stream?.getTracks().forEach(t => t.stop()); try { cam.detector?.close?.(); } catch { /* 略過 */ }
    cam = null; if (root) root.querySelector('#buddyCam').hidden = true;
    if (why) { api?.log('小幫手', { action: why }); try { sessionStorage.setItem(CONSENT_KEY, 'no'); } catch { /* 略過 */ } }
  }
  function look() {
    if (!cam || !cam.detector || document.hidden || document.querySelector('dialog[open]') || where === 'map') { if (cam) cam.awaySince = 0; return; }
    let g; try { g = cam.detector.detect(); } catch { return; }
    const now = performance.now();
    if (looking(g)) {
      cam.awaySince = 0;
      if (cam.away) { cam.away = false; api.log('小幫手', { activity: api.step(), action: '回來看螢幕' }); say(SAY.back, { mood: 'happy', ttl: 2500 }); }
      return;
    }
    if (!cam.awaySince) cam.awaySince = now;
    if (cam.away || now - cam.awaySince < (cfg.attentionSec || 5) * 1000 || now - cam.lastRemind < REMIND_GAP * 1000) return;
    cam.away = true; cam.lastRemind = now;
    cam.reminds = cam.reminds.filter(t => now - t < 120000).concat(now);
    api.log('小幫手', { activity: api.step(), action: '專心提醒', why: g.face ? '轉頭' : '看不到臉', times: cam.reminds.length });
    root.classList.remove('wave'); void root.offsetWidth; root.classList.add('wave');
    if (cam.reminds.length >= 3) { cam.reminds = []; say(SAY.restAsk, { mood: 'calm', buttons: [['🧘 好，休息', () => api.rest()], ['我可以繼續', () => say('好，加油！', { mood: 'happy', ttl: 2500 })]] }); }
    else say(SAY.look, { mood: 'look', ttl: 6000 });
  }

  // ---------- 給學生頁用的介面 ----------
  window.areaBuddy = {
    // api：settings()、phase()、mode()、steps()、passed(s)、hintLevel(s)、stuckOpen(s)、busy()、step()、hint(s)、stuck(s)、rest()、log(e, x)、voice()
    attach(a) { api = a; },
    // 每次畫面重畫後呼叫：換頁、換步驟就重新計時
    update() {
      if (!api) return;
      cfg = api.settings() || {};
      if (!cfg.buddy && !cfg.attention) { unmount(); return; }
      mount();
      root.classList.toggle('face-only', !cfg.buddy);
      const now = api.phase(), list = now === 'solve' ? api.steps() : [];
      if (now !== where || list.join() !== steps.join()) { idle = 0; stage = 0; onStep = 0; if (now !== where && now !== 'solve') hide(); }
      where = now; steps = list;
      if (cfg.attention && where !== 'map') askCamera(); else stopCamera();
    },
    // tried：這次的錯答案（同一個答案再試，會提醒換個想法）
    wrong(s, tried) {
      if (!root || !cfg.buddy || api.mode() === 'probe') return;
      idle = 0; wrongs[s] = (wrongs[s] || 0) + 1;
      const now = Date.now(), last = lastWrong[s] || {}, same = !!tried && tried === last.tried, fast = now - (last.at || 0) < 10000;
      lastWrong[s] = { tried, at: now };
      if (wrongs[s] >= 3 && !api.stuckOpen(s) && api.mode() !== 'demo') { wrongs[s] = 0; say(SAY.wrongMore, { mood: 'worried', ttl: 6000 }); openStuck(s, '連續答錯，打開我卡住了'); }
      else if (same) { api.log('小幫手', { activity: s + 1, action: '同一個錯答案' }); say(SAY.same, { mood: 'worried', ttl: 5000 }); }
      else if (fast && wrongs[s] >= 2) { api.log('小幫手', { activity: s + 1, action: '很快又答錯' }); say(SAY.fast, { mood: 'worried', ttl: 5000 }); }
      else if (wrongs[s] === 2) say(SAY.wrong, { mood: 'worried', ttl: 5000 });
      else mood('worried');
    },
    right(s) {
      if (!root || !cfg.buddy) return;
      delete wrongs[s];
      say(SAY.right[Math.floor(Math.random() * SAY.right.length)], { mood: 'happy', ttl: 2500 });
    },
    // 換學生：鏡頭同意要重新問這位學生
    newStudent() { stopCamera(); asked = false; try { sessionStorage.removeItem(CONSENT_KEY); } catch { /* 略過 */ } hide(); wrongs = {}; lastWrong = {}; idle = 0; stage = 0; onStep = 0; },
    newQuestion() { wrongs = {}; lastWrong = {}; idle = 0; stage = 0; onStep = 0; },
    // 測試與教師說明用
    gaze, looking, lastSaid: () => lastSpoken, idle: () => idle
  };
})();

'use strict';
// 教師備課頁（第 19 版：學習地圖與指派；每個活動可個別設定）
(() => {
  const $ = id => document.getElementById(id);
  const F = window.learningFlow, C = window.lessonContent, A = window.areaActs;
  const SHAPES = ['rectangle', 'square', 'triangle', 'parallelogram'];
  const names = { rectangle: '長方形', square: '正方形', triangle: '三角形', parallelogram: '平行四邊形' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let config = null, activeShape = 'rectangle', testWorkspace = false, published = null;
  const VIDEO_MAX = 30 * 1000 * 1000;
  const videoSrc = async id => window.areaVideoSrc ? window.areaVideoSrc(id) : '/api/videos/' + id;
  const isP = id => !!(A && A.get(id));
  const titleOf = id => names[id] || (A.info(id) || {}).title || id;
  const sec = id => isP(id) ? (config.activities[id] = config.activities[id] || { settings: F.settings({}) }) : config[id];
  const stepTitles = id => isP(id) ? A.get(id).steps.map(s => s.title) : C.titles(id);

  const guide = `<details class="guide"><summary>📘 第一次上課：教師示範建議</summary><ol>
    <li>先在上方「學習地圖與指派」選課綱路徑，或自己勾選要指派的活動。可以設定「依序完成才解鎖」。</li>
    <li>帶學生完整做一題，邊做邊說：「先看題目 → 動手 → 檢查」。指出底部的「✔ 檢查」「下一步」與每一步的「💡 給我提示」。</li>
    <li>示範答錯一次：讓學生看到提示會一層一層變多（共 3 層），第 2 層會在圖上閃爍。</li>
    <li>建議順序（自我調整策略發展）：「老師示範」→「一起做」→「自己做」→「小測驗」。上課時可在學生頁的「教師觀察」切換。</li>
    <li>完整說明請看 <a href="seven-guide.html" target="_blank" rel="noopener">📘 教師使用手冊</a>。</li></ol></details>`;

  // ---------- 學習地圖與指派 ----------
  function drawMap() {
    const m = config.map, avail = A.available();
    $('mapSection').innerHTML = `<h2>🗺️ 學習地圖與指派</h2>
      <p class="subtle">學生的學習地圖只會出現勾選的活動。可以先選一個課綱路徑，再依 IEP 增減（減量、分解）。</p>
      <div class="path-buttons">${Object.entries(A.PATHS).map(([k, p]) => `<button type="button" data-path="${k}" aria-pressed="${m.path === k}">${p.title}</button>`).join('')}</div>
      <label class="check"><input id="sequential" type="checkbox" ${m.sequential ? 'checked' : ''}>依序完成才解鎖（前一個活動完成一題，下一個才打開）</label>
      ${A.UNITS.map(u => { const acts = avail.filter(a => a.unit === u.id); if (!acts.length) return ''; return `<fieldset class="map-assign"><legend>${u.icon} ${esc(u.title)}　<span class="subtle">${u.code}</span></legend>
        ${acts.map(a => `<div class="assign-row"><label class="check"><input type="checkbox" data-assign="${a.id}" ${m.assigned.includes(a.id) ? 'checked' : ''}><b>${a.no}</b> ${esc(a.title)} <span class="code">${a.code}</span></label><button type="button" class="small" data-edit="${a.id}">⚙ 設定</button></div>`).join('')}</fieldset>`; }).join('')}
      <p id="mapCount" class="subtle"></p>`;
    const count = () => { $('mapCount').textContent = `已指派 ${config.map.assigned.length} 個活動。記得按「儲存草稿」或「發布給學生」。`; };
    count();
    document.querySelectorAll('[data-path]').forEach(b => b.onclick = () => {
      const ids = A.PATHS[b.dataset.path].ids; config.map.path = b.dataset.path;
      config.map.assigned = A.LIST.map(a => a.id).filter(id => ids.includes(id));
      drawMap(); $('status').textContent = `已套用「${A.PATHS[b.dataset.path].title}」，可以再自己增減。`;
    });
    $('sequential').onchange = () => { config.map.sequential = $('sequential').checked; count(); };
    document.querySelectorAll('[data-assign]').forEach(c => c.onchange = () => {
      const id = c.dataset.assign, set = new Set(config.map.assigned);
      if (c.checked) set.add(id); else set.delete(id);
      config.map.assigned = A.LIST.map(a => a.id).filter(x => set.has(x)); config.map.path = 'custom';
      document.querySelectorAll('[data-path]').forEach(b => b.setAttribute('aria-pressed', 'false')); count();
    });
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { collect(); $('shape').value = b.dataset.edit; draw(); $('sec-target').scrollIntoView({ behavior: 'smooth' }); });
  }

  function buildSelect() {
    $('shape').innerHTML = A.UNITS.map(u => { const acts = A.available().filter(a => a.unit === u.id); return acts.length ? `<optgroup label="${esc(u.title)}">${acts.map(a => `<option value="${a.id}">${a.no} ${esc(a.title)}</option>`).join('')}</optgroup>` : ''; }).join('');
  }

  // ---------- 個別活動設定 ----------
  function draw() {
    const id = $('shape').value; activeShape = id;
    const plugin = isP(id), data = sec(id), s = F.settings(data), titles = stepTitles(id);
    const pl = plugin ? A.get(id) : null;
    $('preview').href = plugin ? `seven.html?a=${id}&draft=1` : `seven.html?shape=${id}&draft=1`;
    const hintDefault = (i, t) => plugin ? pl.steps[i].hints[t] : [null, C.tier2, C.tier3][t]?.[id]?.[i];
    const hintsHtml = titles.map((t, i) => `<div class="hint-card"><h3>${i + 1}. ${t}</h3>
        <label>第 1 層（短句）<textarea data-hint="${i}" maxlength="60">${esc(plugin ? ((data.hints || [])[i] || pl.steps[i].hints[0]) : data.hints[i])}</textarea></label><p class="count" data-count="${i}"></p>
        <label class="tier">第 2 層（配合圖上閃爍）<textarea data-hint2="${i}" maxlength="60">${esc((data.hints2 && data.hints2[i]) || hintDefault(i, 1))}</textarea></label>
        <label class="tier">第 3 層（示範做法）<textarea data-hint3="${i}" maxlength="60">${esc((data.hints3 && data.hints3[i]) || hintDefault(i, 2))}</textarea></label></div>`).join('');
    const info = A.info(id) || {};
    $('fields').innerHTML = `${guide}
      <p class="target-info"><b>${info.no || ''} ${esc(titleOf(id))}</b>　課綱：${info.code || ''}${plugin ? '' : '　（圖形解題，7 個步驟）'}</p>
      <h2 id="sec-problems">題目難度</h2>
      <label>難度<select id="difficulty"><option value="easy">入門${plugin ? '：數字小、圖形簡單' : '：數字小，三角形沒有外部高'}</option><option value="standard">一般${plugin ? '：數字中等' : '：數字中等，圖形有變化'}</option><option value="challenge">挑戰${plugin ? '：數字較大、圖形較複雜' : '：數字較大，三角形有外部高'}</option>${plugin ? '' : '<option value="custom">自訂：自己改下面的數字</option>'}</select></label>
      <p class="subtle">${plugin ? '這個活動的題目由系統依難度產生，每次不同。' : '選了就會換成該難度的三道題目（自訂除外）。'}</p>
      ${plugin ? '' : `<h2>解題流程（和難度分開設定）</h2>
      <label>流程<select id="flow"><option value="seven">7 步完整：每個活動一頁</option><option value="three">3 步精簡：看題選方法 → 列式計算 → 寫單位與回顧</option><option value="custom">自訂：選擇要保留的步驟</option></select></label>
      <p class="subtle" id="flowNote"></p>
      <fieldset id="customFlow"><legend>自訂：保留哪些步驟？（「列算式」「算一算」「寫單位」一定保留）</legend>
        ${F.OPTIONAL.map(n => `<label><input type="checkbox" data-keep="${n}" ${s.keep.includes(n) ? 'checked' : ''}>${titles[n]}</label>`).join('')}</fieldset>`}

      <h2 id="sec-support">支持程度（和難度分開設定）</h2>
      <label>提示<select id="lessonSupport"><option value="full">完整引導：自動顯示第一個提示</option><option value="faded">減少提示：學生需要時再按${plugin ? '' : '；可用乘法代替點格子'}</option></select></label>
      ${plugin ? '' : `<p class="subtle">學生在規劃頁選「先自己算」時，不論提示程度，都可以用乘法代替點格子；選「先點格子」則照教師設定。</p>
      <label>圖上的長度<select id="labels"><option value="reveal">學生找到後才顯示（避免直接抄）</option><option value="always">一直顯示（降低難度）</option></select></label>
      <label class="check"><input id="grid" type="checkbox" ${s.grid ? 'checked' : ''}>圖上顯示 1 公分方格線（降低難度）</label>
      <label class="check"><input id="ai" type="checkbox" ${s.ai ? 'checked' : ''}>開放「問 AI」（看過 2 層提示後才出現）與 AI 反思問題</label>`}
      <label>朗讀速度<select id="rate"><option value="normal">一般</option><option value="slow">慢一點</option></select></label>
      <label class="check"><input id="reward" type="checkbox" ${s.reward ? 'checked' : ''}>答對時顯示星星動畫</label>
      <label class="check"><input id="sound" type="checkbox" ${s.sound ? 'checked' : ''}>答對時播放提示音</label>
      <label class="check"><input id="hintGate" type="checkbox" ${s.hintGate ? 'checked' : ''}>看提示後，要按「我看完了」才能繼續作答</label>

      ${id === 'squareMeter' ? `<label class="check"><input id="convert" type="checkbox" ${s.convert ? 'checked' : ''}>加入「1 平方公尺 = 10000 平方公分」換算步驟（預設關閉）</label>` : ''}
      <h2>教學階段</h2>
      <label>階段<select id="mode"><option value="demo">老師示範：每一步有老師的想法，可以按「看老師做」</option><option value="together">一起做：每一步出現一起想的問題，並自動顯示第 1 層提示</option><option value="self">自己做：照上面的支持程度</option><option value="probe">小測驗：沒有提示、${plugin ? '題目隨機' : '數字隨機'}，用來看學到的能不能維持</option></select></label>
      <label class="check"><input id="fading" type="checkbox" ${s.fading ? 'checked' : ''}>例題逐步留空（只在「自己做」「一起做」）：第 1 題全部是做好的例題，之後每題把最後幾步換學生做；答得順就多換一步，卡住兩次以上就退回一步</label>

      <h2>自我調整（目標、把握、回顧）</h2>
      <label>學生要設定的目標<select id="goalKind"><option value="hints">最多看幾個提示（0 個／1 個以內／3 個以內／不限）</option><option value="firstTry">幾步要一次就答對（每一步／最多 1 步再試／做完就好）</option></select></label>
      <label class="check"><input id="confidence" type="checkbox" ${s.confidence ? 'checked' : ''}>作答前問「有多少把握」（3 個表情）</label>
      <label class="check"><input id="selfAsk" type="checkbox" ${s.selfAsk ? 'checked' : ''}>解題時顯示「我的自問卡」（我在找什麼？我用什麼方法？我檢查了嗎？）</label>
      <label class="check"><input id="badges" type="checkbox" ${s.badges ? 'checked' : ''}>集章：達到目標、會用提示、自己檢查、說出想法、完成一題</label>
      <label class="check"><input id="voice" type="checkbox" ${s.voice ? 'checked' : ''}>回顧時可以錄音說給老師聽（錄音只存在該分頁，不會上傳）</label>
      <label>示範影片（分步示範：看一段 → 自己做一步）<select id="video"><option value="hint">老師示範模式，以及看到第 3 層提示時出現</option><option value="always">每一步都可以按「看示範影片」</option><option value="off">不使用</option></select></label>
      <label>休息提醒<select id="rest"><option value="0">不提醒（學生仍可自己按「休息一下」）</option><option value="2">每做 2 題提醒休息 1 分鐘</option><option value="3">每做 3 題提醒休息 1 分鐘</option></select></label>

      <h2>可以選的方法</h2>
      <fieldset id="methods"><legend>學生在「你想先怎麼做？」可以選哪些（至少留一個）</legend>
        <label><input type="checkbox" data-method="mark" ${s.methods.includes('mark') ? 'checked' : ''}>${plugin ? '✋ 先動手做做看' : '一格一格點／動手操作圖形'}</label>
        ${plugin ? '' : `<label><input type="checkbox" data-method="row" ${s.methods.includes('row') ? 'checked' : ''}>一排一排加（只有長方形、正方形）</label>`}
        <label><input type="checkbox" data-method="self" ${s.methods.includes('self') ? 'checked' : ''}>${plugin ? '🧠 先自己想，需要時看提示' : '用乘法、先自己算'}</label></fieldset>
      <label class="check"><input id="handsOn" type="checkbox" ${s.handsOn ? 'checked' : ''}>開始前提醒「先用方格紙或剪紙做做看」</label>
      <p class="subtle"><a href="hands-on.html" target="_blank" rel="noopener">🖨 列印實物操作卡 ↗</a></p>

      <h2 id="sec-buddy">🤖 學習小幫手「小方」</h2>
      <p class="subtle">解題時，右下角有一個小機器人。學生很久沒有動，它會問「要不要我幫你？」，學生按「好」就打開第 1 層提示；再過一樣久，會幫學生打開「我卡住了」。同一步答錯 2 次會鼓勵，答錯 3 次打開「我卡住了」。小測驗只鼓勵、不給提示。</p>
      <label class="check"><input id="buddy" type="checkbox" ${s.buddy ? 'checked' : ''}>使用學習小幫手</label>
      <label>學生同一步沒有動多久，小幫手才問要不要幫忙<select id="buddyWait"><option value="30">30 秒</option><option value="60">60 秒（建議）</option><option value="90">90 秒：給學生多一點思考時間</option></select></label>
      <label class="check"><input id="buddyVoice" type="checkbox" ${s.buddyVoice ? 'checked' : ''}>小幫手把話唸出來</label>
      <label class="check"><input id="attention" type="checkbox" ${s.attention ? 'checked' : ''}>📷 專心提醒：用鏡頭看學生的臉有沒有朝向螢幕，轉頭或離開太久就輕聲提醒</label>
      <label>轉頭或離開幾秒才提醒<select id="attentionSec"><option value="3">3 秒</option><option value="5">5 秒（建議）</option><option value="8">8 秒</option></select></label>
      <p class="subtle">鏡頭影像只在學生的電腦上判斷，不錄影、不存檔、不上傳；紀錄只有「提醒了幾次」。學生會先看到說明並按「好」才開鏡頭，隨時可以按「關掉」。低頭寫字不算分心。使用前請先取得家長同意。第一次使用時會從網路下載約 4 MB 的臉部模型。</p>

      <h2 id="sec-aids">閱讀輔助（預設值，學生上課時也可以自己切換）</h2>
      <label class="check"><input id="zhuyin" type="checkbox" ${s.zhuyin ? 'checked' : ''}>國字加注音</label>
      <label>字的大小<select id="textSize"><option value="normal">一般</option><option value="large">大</option><option value="xlarge">特大</option></select></label>
      <label class="check"><input id="contrast" type="checkbox" ${s.contrast ? 'checked' : ''}>高對比配色</label>
      <button id="applyAll">把以上設定（難度除外）套用到全部活動</button>

      ${plugin ? '' : `<h2>${names[id]}的三道題目</h2>
      ${data.problems.map((p, i) => `<section class="problem"><h3>題目 ${i + 1}</h3><div class="field-grid">
        <label>${id === 'rectangle' ? '長' : id === 'square' ? '邊長' : '底'}（公分）<input data-problem="${i}" data-key="a" type="number" min="2" max="10" step="1" value="${p.a}"></label>
        <label>${id === 'rectangle' ? '寬' : id === 'square' ? '另一邊（同邊長）' : '高'}（公分）<input data-problem="${i}" data-key="b" type="number" min="2" max="8" step="1" value="${p.b}"></label>
        <label>頂點左右位移（長方形、正方形固定 0）<input data-problem="${i}" data-key="offset" type="number" min="${id === 'parallelogram' ? 1 : -4}" max="4" step="1" value="${p.offset}" ${id === 'rectangle' || id === 'square' ? 'disabled' : ''}></label></div>
        <label>題目文字<input data-problem="${i}" data-key="prompt" maxlength="160" value="${esc(p.prompt)}"></label>
        <label>生活情境（學生看到圖示和一句「這是……的形狀」）<select data-problem="${i}" data-key="context">${Object.entries(C.contexts).map(([k, v]) => `<option value="${k}" ${(p.context || 'none') === k ? 'selected' : ''}>${v[0] ? v[0] + ' ' : ''}${v[1]}</option>`).join('')}</select></label></section>`).join('')}`}

      <h2 id="sec-video">示範影片（每一步）</h2>
      <p class="subtle">預設播放網站內建的<b>動畫示範</b>：用另一組數字示範，不會說出學生這一題的答案。若想用自己錄的影片，可以在那一步上傳，<b>上傳後就取代動畫</b>；刪除後改回動畫。建議用平板「螢幕錄影」錄自己操作網站並說明，每段 10–30 秒、用和題目不同的數字，檔案 30 MB 以內（MP4、MOV 或 WebM）。請勿錄到學生。</p>
      <div class="video-list">${titles.map((t, i) => `<div class="video-card" data-vcard="${i}"><h3>${i + 1}. ${t}</h3><p class="vstatus" id="vstatus${i}"></p>
        <div class="vbody" id="vbody${i}"></div>
        <div class="vactions"><button type="button" data-vpreview="${i}">▶ 預覽</button><label class="upload">⬆ 上傳影片取代動畫<input type="file" accept="video/mp4,video/quicktime,video/webm" data-vupload="${i}"></label><button type="button" data-vremove="${i}" hidden>🗑 刪除影片，改回動畫</button></div></div>`).join('')}</div>

      <h2 id="sec-hints">提示（每一步 3 層）</h2>
      <p class="subtle">學生每答錯一次或按一次「給我提示」，就多看一層。三層都可以修改，建議 15 字以內、一次只說一個動作、不說出數字答案。</p>
      <div class="hint-list">${hintsHtml}</div>
      <p class="subtle">口訣（完成畫面出現）：${esc(plugin ? pl.chant : C.chant[id])}</p>
      <button id="resetHints">恢復「${esc(titleOf(id))}」的預設提示</button>`;

    $('difficulty').value = plugin && s.difficulty === 'custom' ? 'standard' : s.difficulty; $('lessonSupport').value = s.support; $('rate').value = s.rate || 'normal';
    if (!plugin) { $('flow').value = s.flow; $('labels').value = s.labels; }
    $('video').value = s.video || 'hint'; drawVideos(id);
    $('buddyWait').value = String(s.buddyWait || 60); $('attentionSec').value = String(s.attentionSec || 5);
    $('mode').value = s.mode; $('goalKind').value = s.goalKind; $('rest').value = String(s.rest || 0); $('textSize').value = s.textSize || 'normal';
    document.querySelectorAll('[data-method]').forEach(e => e.onchange = () => { if (!document.querySelector('[data-method]:checked')) { e.checked = true; $('status').textContent = '至少要留一個方法。'; } });
    if (!plugin) {
      const flowNote = () => {
        const f = $('flow').value;
        $('customFlow').hidden = f !== 'custom';
        $('flowNote').textContent = f === 'three' ? '3 步：規劃頁先選「要找什麼」；第 2 頁選算式、填底和高、算面積（圖上直接顯示長度，不用點格子或操作）；第 3 頁寫單位並回顧。'
          : f === 'seven' ? '7 步：看題目 → 點格子／操作 → 找底 → 找高 → 列算式 → 算一算、比一比 → 寫單位。' : '只保留勾選的步驟。拿掉「找底」「找高」時，圖上會直接顯示長度。';
      };
      flowNote(); $('flow').onchange = flowNote;
      document.querySelectorAll('[data-problem][type=number]').forEach(e => e.oninput = () => { $('difficulty').value = 'custom'; });
    }
    $('difficulty').onchange = () => {
      collect(); const lv = $('difficulty').value;
      if (plugin) { $('status').textContent = '已改難度。記得儲存或發布。'; return; }
      if (lv === 'custom') { $('status').textContent = '自訂：請直接修改下方的數字。'; return; }
      F.preset(id, lv).forEach((v, i) => Object.assign(config[id].problems[i], v));
      config[id].settings.difficulty = lv;
      draw(); $('status').textContent = `已換成「${$('difficulty').selectedOptions[0].textContent.split('：')[0]}」的三道題目。記得儲存或發布。`;
    };
    const counts = () => document.querySelectorAll('[data-hint]').forEach(e => {
      const n = e.value.trim().length, c = document.querySelector(`[data-count="${e.dataset.hint}"]`);
      c.textContent = `${n} 字${n > 20 ? '：有點長，學生可能讀不完' : ''}`; c.classList.toggle('warn', n > 20);
    });
    document.querySelectorAll('[data-hint]').forEach(e => e.oninput = counts); counts();
    $('resetHints').onclick = () => { collect(); const d = sec(id); if (plugin) delete d.hints; else d.hints = C.tier1[id].slice(); delete d.hints2; delete d.hints3; draw(); $('status').textContent = '已恢復預設提示。記得儲存或發布。'; };
    $('applyAll').onclick = () => {
      collect(); const src = sec(id).settings;
      const copy = target => { const keepOwn = { difficulty: target.settings?.difficulty || 'standard' }; if (isP(id) && target.problems) Object.assign(keepOwn, { flow: target.settings.flow, keep: target.settings.keep, labels: target.settings.labels, grid: target.settings.grid, ai: target.settings.ai, methods: target.settings.methods }); target.settings = { ...src, ...keepOwn }; };
      SHAPES.forEach(k => copy(config[k])); A.available().filter(a => isP(a.id)).forEach(a => copy(sec(a.id)));
      $('status').textContent = '已把支持程度、教學階段、自我調整、學習小幫手與閱讀輔助設定套用到全部活動（難度不變）。記得儲存或發布。';
    };
  }

  // ---------- 每一步的示範影片 ----------
  const fmtSize = n => (n / 1000 / 1000).toFixed(1) + ' MB';
  function drawVideos(id) {
    const vids = sec(id).videos || {}, n = stepTitles(id).length;
    for (let i = 0; i < n; i++) {
      const v = vids[i];
      $('vstatus' + i).textContent = v ? '目前：老師上傳的影片' : '目前：動畫示範';
      $('vstatus' + i).className = 'vstatus ' + (v ? 'own' : '');
      document.querySelector(`[data-vremove="${i}"]`).hidden = !v;
      $('vbody' + i).innerHTML = '';
    }
    document.querySelectorAll('[data-vpreview]').forEach(b => b.onclick = () => previewVideo(id, Number(b.dataset.vpreview)));
    document.querySelectorAll('[data-vupload]').forEach(inp => inp.onchange = () => uploadVideo(id, Number(inp.dataset.vupload), inp));
    document.querySelectorAll('[data-vremove]').forEach(b => b.onclick = () => removeVideo(id, Number(b.dataset.vremove)));
  }
  function previewVideo(id, i) {
    const body = $('vbody' + i), vid = (sec(id).videos || {})[i];
    if (vid) {
      body.innerHTML = '<video controls playsinline preload="metadata"></video>';
      const v = body.querySelector('video'); v.onerror = () => { body.innerHTML = '<p class="warn">這段影片不能播放，可能已被刪除或格式不支援。請重新上傳或改回動畫。</p>'; };
      videoSrc(vid).then(src => { v.src = src; v.play().catch(() => {}); });
      return;
    }
    if (isP(id)) { window.stepDemo.mount(body, { type: id, step: i, rate: $('rate').value, scenes: A.demoScenes(A.get(id), i, $('difficulty').value) }).play(); return; }
    const p = config[id].problems[0];
    window.stepDemo.mount(body, { type: id, step: i, method: 'mark', dims: [p.a, p.b, p.offset], rate: $('rate').value }).play();
  }
  async function uploadVideo(id, i, input) {
    const file = input.files[0]; input.value = ''; if (!file) return;
    const st = $('vstatus' + i);
    if (file.size > VIDEO_MAX) { st.textContent = `檔案 ${fmtSize(file.size)}，超過 30 MB。請剪短（10–30 秒）或降低畫質後再上傳。`; st.className = 'vstatus warn'; return; }
    st.textContent = `上傳中……（${fmtSize(file.size)}）`; st.className = 'vstatus';
    try {
      const res = await fetch('/api/teacher/videos', { method: 'POST', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error({ unsupported_type: '只能上傳 MP4、MOV 或 WebM 影片', too_large: '檔案超過 30 MB', video_storage_unavailable: '網站的影片儲存空間暫時不能用' }[data.error] || data.error || '上傳失敗');
      collect(); const d = sec(id), old = (d.videos || {})[i];
      d.videos = { ...(d.videos || {}), [i]: data.id };
      drawVideos(id);
      $('vstatus' + i).textContent = `已上傳（${fmtSize(data.size)}），取代了動畫。記得按「儲存草稿」或「發布給學生」。`; $('vstatus' + i).className = 'vstatus own';
      if (old) cleanup(old);
    } catch (error) { st.textContent = '上傳失敗：' + error.message; st.className = 'vstatus warn'; }
  }
  function removeVideo(id, i) {
    collect(); const d = sec(id), old = (d.videos || {})[i]; if (!old) return;
    delete d.videos[i]; if (!Object.keys(d.videos).length) delete d.videos;
    drawVideos(id); $('vstatus' + i).textContent = '已改回動畫示範。記得儲存或發布。';
    cleanup(old);
  }
  // 沒有任何草稿或已發布的教材在用的影片，才從伺服器刪掉
  const pending = new Set();
  const sectionsOf = c => c ? [...SHAPES.map(k => c[k]), ...Object.values(c.activities || {})].filter(Boolean) : [];
  function cleanup(vid) {
    if (vid) pending.add(vid);
    for (const v of [...pending]) {
      const used = [config, published].some(c => sectionsOf(c).some(sec => Object.values(sec.videos || {}).includes(v)));
      if (!used) { pending.delete(v); fetch('/api/teacher/videos/' + v, { method: 'DELETE' }).catch(() => {}); }
    }
  }

  function collect() {
    const id = activeShape, plugin = isP(id), d = sec(id), pl = plugin ? A.get(id) : null;
    if (!plugin) {
      for (const e of document.querySelectorAll('[data-problem]')) {
        const p = d.problems[Number(e.dataset.problem)];
        if (e.dataset.key === 'context') { if (e.value === 'none') delete p.context; else p.context = e.value; continue; }
        p[e.dataset.key] = e.dataset.key === 'prompt' ? e.value.trim() : Number(e.value);
      }
      for (const e of document.querySelectorAll('[data-hint]')) d.hints[Number(e.dataset.hint)] = e.value.trim();
      d.hintVersion = 3;
    }
    const base = t => plugin ? pl.steps.map(st => st.hints[t]) : [C.tier1, C.tier2, C.tier3][t][id];
    const tier = (attr, t) => { const list = [...document.querySelectorAll(`[${attr}]`)].sort((a, b) => a.getAttribute(attr) - b.getAttribute(attr)).map(e => e.value.trim()); const b = base(t); return list.some((v, i) => v !== b[i]) ? list.map((v, i) => v || b[i]) : undefined; };
    if (plugin) { const h1 = tier('data-hint', 0); if (h1) d.hints = h1; else delete d.hints; }
    const h2 = tier('data-hint2', 1), h3 = tier('data-hint3', 2);
    if (h2) d.hints2 = h2; else delete d.hints2;
    if (h3) d.hints3 = h3; else delete d.hints3;
    const old = F.settings(d), val = (k, f) => $(k) ? f($(k)) : old[k];
    d.settings = {
      ...old,
      flow: val('flow', e => e.value), keep: $('customFlow') ? [...document.querySelectorAll('[data-keep]:checked')].map(e => Number(e.dataset.keep)) : old.keep,
      support: $('lessonSupport').value, labels: val('labels', e => e.value), grid: val('grid', e => e.checked), rate: $('rate').value, ai: val('ai', e => e.checked), reward: $('reward').checked, sound: $('sound').checked,
      hintGate: $('hintGate').checked, difficulty: $('difficulty').value,
      mode: $('mode').value, goalKind: $('goalKind').value, confidence: $('confidence').checked, selfAsk: $('selfAsk').checked, badges: $('badges').checked,
      voice: $('voice').checked, rest: Number($('rest').value), video: $('video').value, handsOn: $('handsOn').checked, fading: val('fading', e => e.checked),
      methods: (() => { const m = [...document.querySelectorAll('[data-method]:checked')].map(e => e.dataset.method); return plugin && old.methods.includes('row') ? [...m, 'row'] : m; })(),
      zhuyin: $('zhuyin').checked, textSize: $('textSize').value, contrast: $('contrast').checked, convert: val('convert', e => e.checked),
      buddy: $('buddy').checked, buddyWait: Number($('buddyWait').value), buddyVoice: $('buddyVoice').checked, attention: $('attention').checked, attentionSec: Number($('attentionSec').value)
    };
    if (!d.settings.methods.length) d.settings.methods = ['mark', 'row', 'self'];
    return config;
  }

  function valid() {
    for (const shape of SHAPES) {
      const section = config[shape];
      for (const p of section.problems) {
        if (!Number.isInteger(p.a) || p.a < 2 || p.a > 10 || !Number.isInteger(p.b) || p.b < 2 || p.b > 8 || !Number.isInteger(p.offset) || Math.abs(p.offset) > 4 || p.prompt.length < 3) return `${names[shape]}的題目數字或文字不完整。`;
        if (shape === 'square' && (p.a !== p.b || p.offset !== 0)) return '正方形兩邊必須一樣長。';
        if (shape === 'rectangle' && p.offset !== 0) return '長方形的位移必須是 0。';
        if (shape === 'parallelogram' && (p.offset < 1 || p.offset >= p.a)) return '平行四邊形的位移要大於 0、小於底（等於 0 會變成長方形）。';
      }
      if (section.hints.some(h => h.length < 3)) return `${names[shape]}的第 1 層提示都要填寫。`;
    }
    if (!config.map.assigned.length) return '請至少指派一個活動。';
    return '';
  }

  async function save(kind) {
    collect(); const issue = valid();
    if (issue) { $('status').textContent = issue; return false; }
    $('status').textContent = kind === 'draft' ? '正在儲存草稿……' : '正在發布……';
    try {
      const res = await fetch('/api/teacher/lessons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, config }), cache: 'no-store' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'save_failed');
      if (kind === 'published') published = JSON.parse(JSON.stringify(config));
      cleanup();
      $('status').textContent = kind === 'draft' ? (testWorkspace ? '測試草稿已儲存。' : '草稿已儲存。') : (testWorkspace ? '已發布至測試工作區，不影響正式教材。' : '已發布。請重新開啟學生頁面查看（試用版只存在這個瀏覽器）。');
      return true;
    } catch (error) { $('status').textContent = `儲存失敗：${error.message}`; return false; }
  }

  async function init() {
    try {
      const session = await (await fetch('/api/session', { cache: 'no-store' })).json();
      if (!session.authenticated) { location.href = 'seven.html'; return; }
      if (!session.teacher) { $('status').textContent = '此頁僅供網站擁有者使用。'; return; }
      const res = await fetch('/api/teacher/lessons', { cache: 'no-store' }); const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'load_failed');
      config = data.draft || data.published; testWorkspace = !!data.testWorkspace; published = data.published;
      for (const k of SHAPES) config[k].settings = F.settings(config[k]);
      config.activities = config.activities || {};
      config.map = config.map || { assigned: A.LIST.map(a => a.id), sequential: false, path: 'all' };
      for (const a of A.available()) if (isP(a.id)) sec(a.id).settings = F.settings(sec(a.id));
      $('editor').hidden = false;
      $('status').textContent = testWorkspace ? '測試工作區：可編修與發布，正式教材不受影響。' : data.draft ? '已載入草稿，可繼續編修。' : '已載入目前發布版本。';
      buildSelect(); $('shape').value = 'rectangle';
      drawMap(); draw();
      $('shape').onchange = () => { collect(); draw(); };
      $('saveDraft').onclick = () => save('draft'); $('publish').onclick = () => save('published');
      $('preview').onclick = async e => { e.preventDefault(); if (await save('draft')) location.href = $('preview').href; };   // 試用版：在同一個畫面預覽
    } catch (error) { $('status').textContent = `無法載入教材：${error.message}`; }
  }
  init();
})();

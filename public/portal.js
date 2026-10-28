'use strict';
// 入口頁：學生用班級代碼（或掃 QR code）進入；老師用測試帳號＋教師代號，或 ChatGPT 帳號登入（第 24 版）
(() => {
  const $ = id => document.getElementById(id), status = $('status');
  for (let i = 1; i <= 12; i++) { const v = 'T' + String(i).padStart(2, '0'), o = document.createElement('option'); o.value = v; o.textContent = v; $('teacherCode').append(o); }
  const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }); const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error || 'failed'); return data; };
  async function refresh() {
    try {
      const data = await (await fetch('/api/session', { cache: 'no-store' })).json();
      $('choices').hidden = !data.authenticated; $('teacherLink').hidden = !data.teacher;
      $('classLogin').hidden = !!data.authenticated; $('teacherArea').hidden = !!data.authenticated;
      $('switchTest').hidden = !data.teacher || data.test; $('logout').hidden = !data.test && !data.student;
      $('logout').textContent = data.student ? '換一個班級' : '登出測試帳號';
      status.textContent = data.student ? `已進入「${data.className}」，按「學生學習」開始。`
        : data.test ? `測試帳號已登入${/^T\d\d$/.test(data.workspace) ? `（教師代號 ${data.workspace}，教材設定只屬於你）` : '（共用工作區）'}，可進行學生學習與教師備課；AI 由後端使用 DeepSeek。`
        : data.teacher ? '教師已登入，請選擇入口。' : '學生請輸入班級代碼；老師請按下方「老師登入」。';
      return data;
    } catch { status.textContent = '暫時無法確認登入狀態，請稍後重新整理。'; return {}; }
  }
  async function enterClass(code) {
    $('classButton').disabled = true; status.textContent = '正在進入……';
    try { await post('/api/class-login', { code }); location.href = 'seven.html'; }
    catch (e) { status.textContent = e.message === 'too_many_attempts' ? '打錯太多次了，請 15 分鐘後再試，或請老師幫忙。' : e.message === 'unknown_code' || e.message === 'invalid_code' ? '找不到這個代碼，請再看一次老師給的代碼。' : '暫時進不去，請稍後再試。'; $('classCode').focus(); }
    finally { $('classButton').disabled = false; }
  }
  $('classLogin').onsubmit = e => { e.preventDefault(); enterClass($('classCode').value); };
  $('switchTest').onclick = () => { $('switchTest').hidden = true; $('teacherArea').hidden = false; $('teacherArea').open = true; $('username').focus(); };
  $('testLogin').onsubmit = async event => {
    event.preventDefault(); const password = $('password').value; $('loginButton').disabled = true; status.textContent = '正在登入……';
    try { await post('/api/test-login', { username: $('username').value.trim(), password, teacher: $('teacherCode').value }); $('password').value = ''; await refresh(); }
    catch (error) { status.textContent = error.message === 'too_many_attempts' ? '嘗試次數過多，請 15 分鐘後再試。' : error.message === 'invalid_credentials' ? '帳號或密碼不正確。' : '登入暫時無法使用，請稍後再試。'; $('password').value = ''; }
    finally { $('loginButton').disabled = false; }
  };
  $('logout').onclick = async () => { await fetch('/api/test-logout', { method: 'POST', cache: 'no-store' }); await refresh(); };
  // QR code 的網址是 /?class=代碼：掃了就直接進去
  const fromLink = new URLSearchParams(location.search).get('class');
  if (fromLink) { history.replaceState(null, '', '/'); $('classCode').value = fromLink; refresh().then(() => enterClass(fromLink)); } else refresh();
})();

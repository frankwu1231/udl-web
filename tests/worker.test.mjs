import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import fs from 'node:fs';

const origin='https://lesson.example';
const owner='owner-1';
const feedbackDefaults=JSON.parse(fs.readFileSync(new URL('../lesson-defaults.json',import.meta.url),'utf8'));
function database(){const lessons=new Map(),attempts=new Map(),usage=new Map();return {prepare(sql){return {bind(...args){return {async first(){if(sql.includes('FROM lesson_documents'))return lessons.get(args[0])||null;if(sql.includes('FROM test_login_attempts'))return attempts.get(args[0])||null;if(sql.includes('INTO test_ai_usage')){const calls=(usage.get(args[0])||0)+1;if(calls>50)return null;usage.set(args[0],calls);return {calls};}return null;},async run(){if(sql.includes('INTO lesson_documents')){const [kind,config_json,revision]=args;lessons.set(kind,{config_json,revision});}else if(sql.includes('INTO test_login_attempts'))attempts.set(args[0],{failures:args[1],reset_at:args[2]});else if(sql.includes('DELETE FROM test_login_attempts'))attempts.delete(args[0]);return {success:true};}};}};}};}
const {makeD1}=await import('../scripts/d1-sqlite.mjs');
const env={DB:makeD1(),TEACHER_EMAIL:'owner@example.test',TEST_PASSWORD:'test-pass',TEST_SESSION_SECRET:'a-long-test-session-secret',TEST_DEEPSEEK_API_KEY:'sk-test-only-example-secret-value'};
function req(path,{method='GET',user,body,cookie}={}){return new Request(origin+path,{method,headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user===owner?'owner@example.test':'other@example.test'}:{}),...(body?{'content-type':'application/json',origin}: {}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});}
const call=async(path,options)=>{const response=await worker.fetch(req(path,options),env);return {status:response.status,data:await response.json(),headers:response.headers};};
async function testCookie(){const login=await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass'}});assert.equal(login.status,200);return login.headers.get('set-cookie').split(';')[0];}

test('owner, tester and other visitor have separate access',async()=>{
  const cookie=await testCookie();
  assert.deepEqual((await call('/api/session',{cookie})).data,{authenticated:true,teacher:true,test:true,student:false,workspace:'test',className:'',classCode:'',aiProvider:'deepseek'});
  assert.deepEqual((await call('/api/session',{user:owner,cookie})).data,{authenticated:true,teacher:true,test:true,student:false,workspace:'test',className:'',classCode:'',aiProvider:'deepseek'});
  assert.deepEqual((await call('/api/session',{user:owner})).data,{authenticated:true,teacher:true,test:false,student:false,workspace:'main',className:'',classCode:'',aiProvider:null});
  assert.equal((await call('/api/session',{user:'other'})).data.authenticated,false);
  assert.equal((await call('/api/teacher/lessons',{cookie})).status,200);
  assert.equal((await call('/api/teacher/lessons')).status,401);
  assert.equal((await worker.fetch(req('/seven.html'),env)).status,302);
  assert.equal((await worker.fetch(req('/teacher.html',{cookie}),env)).status,200);
  assert.equal((await worker.fetch(req('/seven.html',{cookie}),env)).status,200);
});

test('draft stays private until owner publishes it',async()=>{
  const cookie=await testCookie();
  const original=await call('/api/lessons',{cookie});
  assert.equal(original.status,200);
  const config=structuredClone(original.data.config);
  config.rectangle.problems[0].prompt='請觀察方格，再算出長方形面積。';
  config.rectangle.hints[0]='先找出題目想知道的區域。';
  assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie,body:{kind:'published',config}})).status,200);
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,200);
  assert.equal((await call('/api/lessons',{user:owner})).data.config.rectangle.problems[0].prompt,original.data.config.rectangle.problems[0].prompt);
  assert.equal((await call('/api/teacher/lessons',{user:owner})).data.draft.rectangle.hints[0],config.rectangle.hints[0]);
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'published',config}})).status,200);
  assert.equal((await call('/api/lessons',{cookie})).data.config.rectangle.problems[0].prompt,config.rectangle.problems[0].prompt);
});

test('tester draft and publish stay separate from owner materials',async()=>{
  const cookie=await testCookie();
  const ownerOriginal=(await call('/api/lessons',{user:owner})).data.config;
  const config=structuredClone(ownerOriginal);config.triangle.hints[0]='測試工作區專用提示，不會影響正式教材。';
  assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie,body:{kind:'draft',config}})).status,200);
  assert.equal((await call('/api/lessons',{cookie})).data.config.triangle.hints[0],ownerOriginal.triangle.hints[0]);
  assert.equal((await call('/api/teacher/lessons',{cookie})).data.draft.triangle.hints[0],config.triangle.hints[0]);
  assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie,body:{kind:'published',config}})).status,200);
  assert.equal((await call('/api/lessons',{cookie})).data.config.triangle.hints[0],config.triangle.hints[0]);
  assert.equal((await call('/api/lessons',{user:owner})).data.config.triangle.hints[0],ownerOriginal.triangle.hints[0]);
});

test('test login rejects wrong password and uses a secure cookie',async()=>{
  assert.equal((await call('/api/test-login',{method:'POST',body:{username:'test',password:'wrong'}})).status,401);
  const cookie=await testCookie();
  assert.match(cookie,/^__Host-area_test=/);
  assert.equal((await call('/api/session',{cookie:cookie+'tampered'})).data.authenticated,false);
  const logout=await call('/api/test-logout',{method:'POST',cookie});
  assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});

test('tester AI is routed to the server DeepSeek key',async()=>{
  const cookie=await testCookie(),originalFetch=globalThis.fetch;let providerUrl,auth;
  globalThis.fetch=async(url,options)=>{providerUrl=url;auth=options.headers.authorization;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'你可以先觀察圖形。'})}}]}),{status:200,headers:{'content-type':'application/json'}});};
  try{const body={kind:'hint',shape:'rectangle',cycle:1,step:0,method:'mark',goal:'check',hints:0,errors:0,incorrect:false,provider:'openai'};const result=await call('/api/ai-support',{method:'POST',cookie,body});assert.equal(result.status,200);assert.equal(providerUrl,'https://api.deepseek.com/chat/completions');assert.equal(auth,`Bearer ${env.TEST_DEEPSEEK_API_KEY}`);}finally{globalThis.fetch=originalFetch;}
});

test('invalid shapes are rejected',async()=>{
  const config=(await call('/api/lessons',{user:owner})).data.config;
  config.square.problems[0].b=7;
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,400);
});

test('tester can load every script and stylesheet referenced by student and teacher pages',async()=>{
 const cookie=await testCookie();
 for(const path of ['/seven.html','/teacher.html']){
  const page=await worker.fetch(req(path,{cookie}),env);assert.equal(page.status,200);
  const html=await page.text();
  const paths=[...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g)].map(m=>'/'+m[1]);
  assert.ok(paths.includes('/learning-flow.js'));
  for(const asset of paths){const response=await worker.fetch(req(asset,{cookie}),env);assert.equal(response.status,200,asset+' must be available to the tester');assert.match(response.headers.get('content-type'),asset.endsWith('.js')?/javascript/:/css/);assert.match(response.headers.get('cache-control'),/no-cache/);}
 }
 assert.equal((await worker.fetch(req('/learning-flow.js'),env)).status,401);
});

test('learning settings persist, old lessons still load, invalid settings are rejected',async()=>{
  const config=structuredClone(feedbackDefaults);
  config.rectangle.settings={flow:'custom',keep:[1,3],support:'faded',labels:'always',grid:true,rate:'slow',ai:false,reward:true,sound:false,hintGate:true,difficulty:'easy',mode:'demo',goalKind:'firstTry',confidence:false,selfAsk:true,badges:true,voice:true,rest:2,handsOn:true,methods:['row','self'],zhuyin:true,textSize:'large',contrast:true,video:'always'};
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'published',config}})).status,200);
  assert.deepEqual((await call('/api/lessons',{user:owner})).data.config.rectangle.settings,config.rectangle.settings);
  config.rectangle.settings.keep=[5];
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,400);
  for(const bad of [{methods:[]},{methods:['jump']},{mode:'auto'},{goalKind:'time'},{rest:5},{textSize:'huge'},{zhuyin:'yes'},{buddy:'yes'},{buddyWait:45},{attention:1},{attentionSec:10}]){   // 第 18 版設定也要檢查
    config.rectangle.settings={flow:'seven',support:'full',hintGate:false,difficulty:'standard',...bad};
    assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,400,JSON.stringify(bad));
  }
  config.rectangle.settings={flow:'seven',support:'full',hintGate:false,difficulty:'standard'};
  config.rectangle.problems[0].context='garden';
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,200);
  config.rectangle.problems[0].context='<b>';
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,400);
  delete config.rectangle.problems[0].context;
  config.rectangle.settings={flow:'three',breaks:[0,5],support:'full',hintGate:false,difficulty:'standard'};   // 第 15 版的設定格式仍可載入
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'published',config}})).status,200);
  const v15=(await call('/api/lessons',{user:owner})).data.config.rectangle.settings;
  assert.equal(v15.flow,'three');assert.deepEqual(v15.keep,[0,1,2,3]);assert.equal(v15.labels,'reveal');assert.equal('breaks' in v15,false);assert.equal(v15.mode,'self');assert.deepEqual(v15.methods,['mark','row','self']);
  for(const section of Object.values(config)){delete section.settings;delete section.hintVersion;}
  config.rectangle.hints[0]='題目要算裡面的大小，還是邊界的長度？';            // 第 14 版預設
  config.rectangle.hints[2]='看加粗的一排。數這一排有幾格。';                  // 第 15 版預設
  config.rectangle.hints[1]='教師自己寫的提示，請保留。';
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'published',config}})).status,200);
  const loaded=(await call('/api/lessons',{user:owner})).data.config;
  assert.equal(loaded.rectangle.settings.flow,'seven');
  assert.equal(loaded.rectangle.hints[0],feedbackDefaults.rectangle.hints[0]);
  assert.equal(loaded.rectangle.hints[2],feedbackDefaults.rectangle.hints[2]);
  assert.equal(loaded.rectangle.hints[1],'教師自己寫的提示，請保留。');
  config.parallelogram.problems[0].offset=0;   // 位移 0 會變成長方形，不允許儲存
  assert.equal((await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config}})).status,400);
});

test('AI instructions use current operation state and reject arbitrary context',async()=>{
 const cookie=await testCookie(),originalFetch=globalThis.fetch;let sent;
 globalThis.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'把數到的總格數填進空格。'})}}]}));};
 try{const body={kind:'hint',shape:'rectangle',cycle:1,step:1,method:'mark',goal:'check',hints:1,errors:0,incorrect:false,operationComplete:true,comparisonOpened:false,issue:'none'};
 assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,200);
 assert.match(sent.messages[0].content,/操作已完成時，不可叫學生繼續點格子/);assert.match(sent.messages[0].content,/不超過25個字/);assert.match(sent.messages[1].content,/操作已完成=true/);
 body.issue='line';body.hintLevel=2;assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,200);assert.match(sent.messages[1].content,/第2層提示/);assert.match(sent.messages[1].content,/選錯高的線/);
 body.hintLevel=4;assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);body.hintLevel=2;
 body.issue='arbitrary free text';assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);
 }finally{globalThis.fetch=originalFetch;}
});

test('teacher videos: upload, range playback, access control, references in lessons, delete',async()=>{
  const {makeD1}=await import('../scripts/d1-sqlite.mjs');
  const venv={...env,DB:makeD1()};
  const mp4=fs.readFileSync(new URL('./fixtures/sample.mp4',import.meta.url));
  const big=new Uint8Array(2_500_000);big.set(mp4.subarray(0,16));   // 用 mp4 檔頭撐大，測試分段儲存
  const up=async(bytes,headers={})=>worker.fetch(new Request(origin+'/api/teacher/videos',{method:'POST',headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'owner@example.test','content-type':'video/mp4',...headers},body:bytes}),venv);
  const get=(id,headers={},user=owner)=>worker.fetch(new Request(origin+'/api/videos/'+id,{headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user===owner?'owner@example.test':'x@example.test'}:{}),...headers}}),venv);
  assert.equal((await up(new TextEncoder().encode('not a video at all'))).status,415);
  assert.equal((await worker.fetch(new Request(origin+'/api/teacher/videos',{method:'POST',body:mp4}),venv)).status,401);
  const r=await up(big);assert.equal(r.status,200);const {id,size,mime}=await r.json();
  assert.match(id,/^v_[a-z0-9]{20}$/);assert.equal(size,big.length);assert.equal(mime,'video/mp4');
  const full=await get(id);assert.equal(full.status,200);assert.equal((await full.arrayBuffer()).byteLength,big.length);
  const part=await get(id,{range:'bytes=999990-1000009'});assert.equal(part.status,206);
  assert.equal(part.headers.get('content-range'),`bytes 999990-1000009/${big.length}`);assert.deepEqual(new Uint8Array(await part.arrayBuffer()),big.slice(999990,1000010),'跨兩段的資料要接得起來');
  const open=await get(id,{range:'bytes=0-'});assert.equal(open.status,206);assert.equal(Number(open.headers.get('content-length')),2_000_000);
  const head=await get(id,{range:'bytes=0-1'});assert.deepEqual(new Uint8Array(await head.arrayBuffer()),big.slice(0,2));
  assert.equal((await get(id,{range:'bytes=9999999-'})).status,416);
  assert.equal((await get(id,{},null)).status,401,'沒登入不能看');
  assert.equal((await get('v_aaaaaaaaaaaaaaaaaaaa')).status,404);
  // 教材可以指定每一步的影片；格式不對就拒絕
  const config=structuredClone(feedbackDefaults);config.rectangle.videos={1:id};
  const save=c=>worker.fetch(new Request(origin+'/api/teacher/lessons',{method:'POST',headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'owner@example.test','content-type':'application/json'},body:JSON.stringify({kind:'published',config:c})}),venv);
  assert.equal((await save(config)).status,200);
  config.rectangle.videos={9:id};assert.equal((await save(config)).status,400);
  config.rectangle.videos={1:'../etc'};assert.equal((await save(config)).status,400);
  config.rectangle.videos={1:id};config.rectangle.settings={...config.rectangle.settings,video:'sometimes'};assert.equal((await save(config)).status,400);
  // 測試帳號不能刪老師的影片；老師可以刪
  const cookie=(await worker.fetch(new Request(origin+'/api/test-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'test',password:'test-pass'})}),venv)).headers.get('set-cookie')?.split(';')[0];
  if(cookie)assert.equal((await worker.fetch(new Request(origin+'/api/teacher/videos/'+id,{method:'DELETE',headers:{cookie}}),venv)).status,403);
  assert.equal((await worker.fetch(new Request(origin+'/api/teacher/videos/'+id,{method:'DELETE',headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'owner@example.test'}}),venv)).status,200);
  assert.equal((await get(id)).status,404);
});

test('learning map and activity settings: validated, and old four-shape lessons still load with defaults',async()=>{
  const config=structuredClone(feedbackDefaults);
  const save=async c=>(await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'published',config:c}})).status;
  config.map={assigned:['compare','rectangle'],sequential:true,path:'custom'};config.activities.tile.settings={...config.activities.tile.settings,difficulty:'challenge'};config.activities.tile.hints=['a','b','c','d'];
  assert.equal(await save(config),200);
  const got=(await call('/api/lessons',{user:owner})).data.config;
  assert.deepEqual(got.map.assigned,['compare','rectangle']);assert.equal(got.activities.tile.settings.difficulty,'challenge');assert.ok(got.activities.compare,'missing activities are filled from defaults');
  for(const bad of [{map:{assigned:['nope']}},{map:{assigned:['compare','compare']}},{map:{assigned:[],sequential:'yes'}},{activities:{rectangle:{}}},{activities:{tile:{settings:{flow:'x'}}}},{activities:{tile:{videos:{1:'bad'}}}},{extra:1}]){
    const c=structuredClone(feedbackDefaults);Object.assign(c,bad);assert.equal(await save(c),400,JSON.stringify(bad));
  }
  const old=structuredClone(feedbackDefaults);delete old.map;delete old.activities;   // 第 18 版以前的教材格式
  old.rectangle.problems[0].prompt='舊版教材的題目，請保留。';
  assert.equal(await save(old),200);
  const loaded=(await call('/api/lessons',{user:owner})).data.config;
  assert.equal(loaded.rectangle.problems[0].prompt,'舊版教材的題目，請保留。');
  assert.ok(Array.isArray(loaded.map.assigned)&&loaded.map.assigned.includes('compare'));
  assert.ok(loaded.activities.estimate.settings);
});

test('new activities can ask AI with the activity and step name; perimeter is allowed where it is the topic',async()=>{
 const cookie=await testCookie(),originalFetch=globalThis.fetch;let sent;
 globalThis.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'先找有直角記號的線。'})}}]}));};
 try{const body={kind:'hint',shape:'trapezoid',stepTitle:'找高',cycle:1,step:3,method:'mark',goal:'check',hints:1,errors:1,incorrect:true,hintLevel:2,issue:'line'};
 const r=await call('/api/ai-support',{method:'POST',cookie,body});assert.equal(r.status,200);assert.equal(r.data.message,'先找有直角記號的線。');
 assert.equal(sent.model,'deepseek-flash');assert.deepEqual(sent.thinking,{type:'disabled'});assert.match(sent.messages[1].content,/梯形/);assert.match(sent.messages[1].content,/找高/);assert.match(sent.messages[0].content,/不要用這些詞：公式/);
 body.shape='perimeter';body.stepTitle='把四邊加起來';body.step=2;assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,200);assert.doesNotMatch(sent.messages[0].content,/周長、/);
 body.stepTitle='<script>';assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);
 body.stepTitle='找高';body.shape='unknown';assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);
 const teacher={kind:'teacher',shape:'word',stepTitle:'選算式',cycle:1,step:1,method:'mark',goal:'check',hints:1,errors:1,incorrect:false,steps:[1,0,0,0],backtracks:0,completed:1,helpRequests:1};
 assert.equal((await call('/api/ai-support',{method:'POST',cookie,body:teacher})).status,200);
 }finally{globalThis.fetch=originalFetch;}
});

test('field trial logging settings (v22): Apps Script URL and passcode are validated',async()=>{
  const config=structuredClone(feedbackDefaults);
  const save=async research=>(await call('/api/teacher/lessons',{method:'POST',user:owner,body:{kind:'draft',config:{...config,research}}})).status;
  assert.equal(await save({url:'https://script.google.com/macros/s/AKfycbx1234567890/exec',key:'field-2026',teachers:4,students:6}),200);
  assert.equal(await save({url:'',key:''}),200,'empty means not recording');
  for(const bad of [{url:'https://example.com/x',key:'abcd'},{url:'https://script.google.com/macros/s/AKfycbx1234567890/exec',key:'ab'},{url:'',key:'',teachers:40},{url:'',key:'',extra:1},'yes'])assert.equal(await save(bad),400,JSON.stringify(bad));
});

test('第 24 版：每位老師（教師代號）有自己的工作區；班級代碼讓學生不用密碼就能進學生頁',async()=>{
  const login=async teacher=>{const r=await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher}});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
  assert.equal((await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher:'T99'}})).status,400);
  const t1=await login('T01'),t2=await login('T02');
  assert.equal((await call('/api/session',{cookie:t1})).data.workspace,'T01');
  // 兩位老師各自發布，互不覆蓋
  const base=(await call('/api/teacher/lessons',{cookie:t1})).data.published;
  const c1=structuredClone(base);c1.rectangle.hints[0]='T01 老師的提示。';
  assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie:t1,body:{kind:'published',config:c1}})).status,200);
  assert.equal((await call('/api/lessons',{cookie:t1})).data.config.rectangle.hints[0],'T01 老師的提示。');
  assert.notEqual((await call('/api/lessons',{cookie:t2})).data.config.rectangle.hints[0],'T01 老師的提示。');
  // 建立班級代碼
  assert.equal((await call('/api/teacher/classes',{method:'POST',cookie:t1,body:{label:'<b>',days:7}})).status,400);
  assert.equal((await call('/api/teacher/classes',{method:'POST',cookie:t1,body:{label:'三年甲班',days:5}})).status,400);
  const made=await call('/api/teacher/classes',{method:'POST',cookie:t1,body:{label:'三年甲班',days:7}});
  assert.equal(made.status,200);const code=made.data.class.code;assert.match(code,/^[2-9A-HJKMNP-Z]{6}$/);
  assert.deepEqual((await call('/api/teacher/classes',{cookie:t1})).data.classes.map(c=>c.code),[code]);
  assert.deepEqual((await call('/api/teacher/classes',{cookie:t2})).data.classes,[],'別的老師看不到');
  assert.equal((await call('/api/teacher/classes/'+code,{method:'DELETE',cookie:t2})).status,404,'別的老師不能停用');
  assert.equal((await call('/api/teacher/classes')).status,401);
  // 學生用代碼登入（小寫、空格都可以）
  assert.equal((await call('/api/class-login',{method:'POST',body:{code:'ZZZZZ'}})).status,400);
  const s=await call('/api/class-login',{method:'POST',body:{code:' '+code.slice(0,3).toLowerCase()+' '+code.slice(3)}});
  assert.equal(s.status,200);assert.equal(s.data.className,'三年甲班');
  const sc=s.headers.get('set-cookie').split(';')[0];assert.match(s.headers.get('set-cookie'),/HttpOnly; Secure/);
  assert.deepEqual((await call('/api/session',{cookie:sc})).data,{authenticated:true,teacher:false,test:false,student:true,workspace:'T01',className:'三年甲班',classCode:code,aiProvider:'deepseek'});
  assert.equal((await call('/api/lessons',{cookie:sc})).data.config.rectangle.hints[0],'T01 老師的提示。','學生看到自己老師發布的教材');
  assert.equal((await call('/api/teacher/lessons',{cookie:sc})).status,403);
  assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie:sc,body:{kind:'published',config:c1}})).status,403);
  assert.equal((await call('/api/teacher/classes',{cookie:sc})).status,403);
  assert.equal((await worker.fetch(req('/seven.html',{cookie:sc}),env)).status,200);
  const tp=await worker.fetch(req('/teacher.html',{cookie:sc}),env);assert.equal(tp.status,302);assert.match(tp.headers.get('location'),/seven\.html$/);
  assert.equal((await worker.fetch(req('/teacher.js',{cookie:sc}),env)).status,403);
  assert.equal((await worker.fetch(new Request(origin+'/api/teacher/videos',{method:'POST',headers:{cookie:sc,'content-type':'video/mp4'},body:new Uint8Array(20)}),env)).status,403);
  // 偽造的代碼 cookie 不能用
  assert.equal((await call('/api/session',{cookie:sc.replace(code,'ABCDEF')})).data.authenticated,false);
  // 停用後學生就進不去
  assert.equal((await call('/api/teacher/classes/'+code,{method:'DELETE',cookie:t1})).status,200);
  assert.equal((await call('/api/session',{cookie:sc})).data.authenticated,false);
  assert.equal((await call('/api/class-login',{method:'POST',body:{code}})).status,401);
});

test('第 24 版：班級代碼打錯 30 次才暫停；AI 次數每位老師分開算',async()=>{
  const venv={...env,DB:makeD1()},c=async(path,o)=>{const r=await worker.fetch(req(path,o),venv);return {status:r.status,data:await r.json(),headers:r.headers};};
  for(let i=0;i<30;i++)assert.equal((await c('/api/class-login',{method:'POST',body:{code:'ABCDEF'}})).status,401);
  assert.equal((await c('/api/class-login',{method:'POST',body:{code:'ABCDEF'}})).status,429);
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'先看圖形。'})}}]}));
  try{
    const t1=(await c('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher:'T01'}})).headers.get('set-cookie').split(';')[0];
    const t2=(await c('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher:'T02'}})).headers.get('set-cookie').split(';')[0];
    const body={kind:'hint',shape:'rectangle',cycle:1,step:0,method:'mark',goal:'check',hints:0,errors:0,incorrect:false};
    for(let i=0;i<50;i++)assert.equal((await c('/api/ai-support',{method:'POST',cookie:t1,body})).status,200);
    assert.equal((await c('/api/ai-support',{method:'POST',cookie:t1,body})).status,429);
    assert.equal((await c('/api/ai-support',{method:'POST',cookie:t2,body})).status,200,'另一位老師還可以用');
  }finally{globalThis.fetch=originalFetch;}
});

test('第 24 版審查修正：影片只能由同一位老師刪；同時大量猜代碼也會被擋；可設定每位老師自己的密碼',async()=>{
  const venv={...env,DB:makeD1(),TEST_TEACHER_PASSWORDS:'T01:teacher-one-pass,T02:teacher-two-pass'},w=(path,o)=>worker.fetch(req(path,o),venv);
  const login=async(teacher,password)=>{const r=await w('/api/test-login',{method:'POST',body:{username:'test',password,teacher}});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  assert.equal((await login('T01','test-pass')).status,401,'設了個別密碼後，共用密碼不能選教師代號');
  assert.equal((await login('T01','teacher-two-pass')).status,401,'不能用別的老師的密碼');
  assert.equal((await login('T03','test-pass')).status,401,'沒有設定密碼的代號不能用');
  const t1=(await login('T01','teacher-one-pass')).cookie,t2=(await login('T02','teacher-two-pass')).cookie;
  assert.ok(t1&&t2);assert.equal((await login('','test-pass')).status,200,'不選代號仍可用共用密碼');
  const mp4=fs.readFileSync(new URL('./fixtures/sample.mp4',import.meta.url));
  const up=await worker.fetch(new Request(origin+'/api/teacher/videos',{method:'POST',headers:{cookie:t1,'content-type':'video/mp4'},body:mp4}),venv);assert.equal(up.status,200);const {id}=await up.json();
  assert.equal((await w('/api/teacher/videos/'+id,{method:'DELETE',cookie:t2})).status,403,'T02 不能刪 T01 的影片');
  assert.equal((await w('/api/videos/'+id,{cookie:t1})).status,200);assert.equal((await w('/api/videos/'+id,{cookie:t2})).status,404,'第 25 版：T02 也看不到 T01 的影片');
  assert.equal((await w('/api/teacher/videos/'+id,{method:'DELETE',cookie:t1})).status,200);
  const results=await Promise.all(Array.from({length:40},()=>w('/api/class-login',{method:'POST',body:{code:'ABCDEF'}})));
  assert.equal(results.filter(r=>r.status===401).length+results.filter(r=>r.status===429).length,40);
  assert.equal((await w('/api/class-login',{method:'POST',body:{code:'ABCDEF'}})).status,429,'同時送 40 次也都有算到');
});

test('第 25 版：AI 收到這一步的提示與活動在做的事；提示文字只收允許的字；tryFirst 設定要是布林值',async()=>{
 const cookie=await testCookie(),originalFetch=globalThis.fetch;let sent;
 globalThis.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'數一數 A 的格子。'})}}]}));};
 try{const body={kind:'hint',shape:'compare',stepTitle:'數一數',cycle:1,step:1,method:'mark',goal:'check',hints:1,errors:1,incorrect:true,hintLevel:2,issue:'count',stepHints:['數一數 A 有幾格。','一格一格點，不要漏掉。','格子多的比較大。']};
 assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,200);
 assert.match(sent.messages[1].content,/這一步原本的提示：（1）數一數 A 有幾格。/);assert.match(sent.messages[1].content,/沒有三角形/);
 assert.match(sent.messages[0].content,/不可以叫學生用尺量、數三角形/);assert.doesNotMatch(sent.messages[0].content,/三角形是拿兩片/);
 body.kind='reflection';assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,200);assert.match(sent.messages[0].content,/是／不是/);
 body.kind='hint';body.stepHints=['<img src=x>'];assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);
 body.stepHints=['一','二','三','四'];assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);
 body.stepHints='數一數';assert.equal((await call('/api/ai-support',{method:'POST',cookie,body})).status,400);
 }finally{globalThis.fetch=originalFetch;}
 const r=await call('/api/teacher/lessons',{cookie});const config=r.data.draft||r.data.published;
 config.rectangle.settings={flow:'seven',support:'full',hintGate:false,difficulty:'standard',tryFirst:false};
 assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie,body:{kind:'draft',config}})).status,200);
 config.rectangle.settings.tryFirst='yes';assert.equal((await call('/api/teacher/lessons',{method:'POST',cookie,body:{kind:'draft',config}})).status,400);
});

test('第 26 版：研究紀錄存進網站資料庫、開始本節、學生個別設定與變更理由',async()=>{
  const login=async teacher=>(await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher}})).headers.get('set-cookie').split(';')[0];
  const t5=await login('T05'),t6=await login('T06');
  const code=(await call('/api/teacher/classes',{method:'POST',cookie:t5,body:{label:'四年乙班',days:7}})).data.class.code;
  const sc=(await call('/api/class-login',{method:'POST',body:{code}})).headers.get('set-cookie').split(';')[0];
  // 紀錄：只收代號；同一筆重送不會重複
  const row={rid:'abc123-x1',sheet:'操作紀錄',time:'2026-11-12 10:00:00',version:'v26',student:'T05-S01',sessionNo:1,event:'步驟檢核',detail:'{"obs":"eqPerimeter"}'};
  assert.equal((await call('/api/records',{method:'POST',body:{rows:[row]}})).status,401);
  assert.equal((await call('/api/records',{method:'POST',cookie:sc,body:{rows:[{...row,student:'王小明'}]}})).status,400,'不收姓名當代號');
  assert.equal((await call('/api/records',{method:'POST',cookie:sc,body:{rows:[{...row,sheet:'亂寫'}]}})).status,400);
  const saved=await call('/api/records',{method:'POST',cookie:sc,body:{rows:[row,{...row,rid:'abc123-x2',event:'整題完成'}]}});
  assert.equal(saved.status,200);assert.deepEqual(saved.data.saved,['abc123-x1','abc123-x2']);
  assert.equal((await call('/api/records',{method:'POST',cookie:sc,body:{rows:[row]}})).status,200,'重送沒關係');
  // 白名單：學生自己打的文字、不認得的欄位都不存
  assert.equal((await call('/api/records',{method:'POST',cookie:sc,body:{rows:[{...row,rid:'abc123-x3',studentInput:'虛構姓名甲：我不會',detail:JSON.stringify({obs:'blank',studentInput:'虛構姓名甲：我不會',dimensions:{w:3,h:4,studentInput:'虛構姓名甲'}})}]}})).status,200);
  assert.equal((await call('/api/records',{method:'POST',cookie:sc,body:{rows:[{...row,rid:'abc123-x4',student:'T06-S01'}]}})).status,403,'不能寫別班的學生');
  // 開始本節：同一位學生接著往上加；另一位從 1 開始
  const start=async(cookie,student)=>(await call('/api/sessions/start',{method:'POST',cookie,body:{student,device:'平板'}})).data.no;
  assert.equal(await start(sc,'T05-S01'),1);assert.equal(await start(sc,'T05-S01'),2);assert.equal(await start(sc,'T05-S02'),1);
  assert.equal((await call('/api/sessions/start',{method:'POST',cookie:sc,body:{student:'S01'}})).status,400);
  // 教師端：只看得到自己工作區
  const ov=(await call('/api/teacher/research',{cookie:t5})).data;
  assert.deepEqual(ov.students.map(s=>[s.student,s.events,s.sessions]),[['T05-S01',3,2],['T05-S02',0,1]]);
  const x3=(await call('/api/teacher/research?student=T05-S01',{cookie:t5})).data.events.find(e=>e.rid==='abc123-x3');
  assert.equal(JSON.stringify(x3).includes('虛構姓名甲'),false,'自由文字沒有存下來');assert.deepEqual(JSON.parse(x3.detail),{obs:'blank',dimensions:{w:3,h:4}});
  assert.deepEqual((await call('/api/teacher/research',{cookie:t6})).data.students,[],'別的老師看不到');
  assert.equal((await call('/api/teacher/research',{cookie:sc})).status,403,'學生不能看');
  assert.equal((await call('/api/teacher/research?student=T05-S01',{cookie:t5})).data.events[0].detail,'{"obs":"eqPerimeter"}');
  // 學生個別設定：一定要主要理由；方向由網站歸類；減少支持一次一級
  // 學生登入（班級代碼）不能改支持設定；參與教師不能改別班的學生
  assert.equal((await call('/api/student-settings',{method:'POST',cookie:sc,body:{student:'T05-S01',act:'rectangle',changes:{mode:'demo'},reason:'other'}})).data.error,'teacher_required');
  assert.equal((await call('/api/student-settings',{method:'POST',cookie:t6,body:{student:'T05-S01',act:'rectangle',changes:{mode:'demo'},reason:'other'}})).data.error,'not_your_student');
  const set=body=>call('/api/student-settings',{method:'POST',cookie:t5,body:{student:'T05-S01',act:'rectangle',sessionNo:2,...body}});
  assert.equal((await set({changes:{support:'faded'}})).status,400,'沒有理由');
  assert.equal((await set({changes:{support:'faded',video:'off'},reason:'independent',classSettings:{support:'full',video:'hint'}})).data.error,'one_step_only','一次減兩級不行');
  assert.equal((await set({changes:{methods:['self']},reason:'independent',classSettings:{methods:['mark','row','self']}})).data.error,'one_step_only','一次關掉兩種具體方法不行');
  assert.equal((await set({changes:{support:'oops'},reason:'other'})).status,400);
  const down=await set({changes:{support:'faded'},reason:'independent',note:'連續兩節都自己完成',classSettings:{support:'full'}});
  assert.equal(down.status,200);assert.deepEqual(down.data.changes,[{field:'support',before:'"full"',after:'"faded"',direction:'decrease'}]);
  const up=await set({changes:{mode:'demo',lessonGoal:3},reason:'lowAccuracy'});
  assert.deepEqual(up.data.changes.map(c=>[c.field,c.direction]),[['mode','increase'],['lessonGoal','load']]);
  assert.equal((await set({changes:{support:'faded'},reason:'other'})).data.error,'no_change');
  assert.equal((await set({decision:'keep',reason:'lowAccuracy'})).status,200);
  assert.equal((await set({decision:'advance',to:'square',reason:'independent'})).data.changes[0].direction,'advance');
  assert.deepEqual((await call('/api/student-settings?student=T05-S01',{cookie:sc})).data.overrides,{rectangle:{support:'faded',mode:'demo',lessonGoal:3}});
  assert.equal((await call('/api/student-settings?student=T05-S01',{cookie:t6})).status,403,'別班老師讀不到這位學生的設定');
  const changes=(await call('/api/teacher/research',{cookie:t5})).data.changes;
  assert.deepEqual(changes.map(c=>c.direction).sort(),['advance','decrease','increase','load','maintain']);
  assert.ok(changes.every(c=>c.student==='T05-S01'&&c.act==='rectangle'&&c.sessionNo===2&&c.actor==='T05'));
  assert.equal(changes.find(c=>c.direction==='decrease').note,'連續兩節都自己完成');
});

test('第 26 版第二階段：研究階段、標準化情境探試、應有方向（教師看不到）、跨節 AI 摘要',async()=>{
  const login=async teacher=>(await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher}})).headers.get('set-cookie').split(';')[0];
  const t7=await login('T07');
  // 判準：研究人員可以改，參與教師不行
  assert.equal((await call('/api/study/config',{cookie:t7})).status,403);
  assert.equal((await call('/api/study/config',{user:owner})).data.rules.lowAcc,60);
  assert.equal((await call('/api/study/config',{method:'POST',user:owner,body:{rules:{lowAcc:90}}})).status,400,'低標不能高於高標');
  assert.equal((await call('/api/study/config',{method:'POST',user:owner,body:{rules:{summaryChars:350}}})).data.rules.summaryChars,350);
  // 研究階段：每位老師各自切換，保留歷程
  assert.equal((await call('/api/study/phases',{method:'POST',user:owner,body:{kind:'teacher',participant:'T07',phase:'baseline'}})).status,200);
  assert.equal((await call('/api/study/phases',{method:'POST',user:owner,body:{kind:'teacher',participant:'T07',phase:'B'}})).status,400);
  assert.deepEqual((await call('/api/study/me',{cookie:t7})).data,{teacher:'T07',phase:'baseline',summary:false});
  // 匯入情境組；同一版本不能覆蓋
  const set=JSON.parse(fs.readFileSync(new URL('../scenarios/demo-set.json',import.meta.url),'utf8'));
  assert.equal((await call('/api/study/scenarios',{method:'POST',user:owner,body:set})).data.id,'demo@1');
  assert.equal((await call('/api/study/scenarios',{method:'POST',user:owner,body:set})).status,409,'版本鎖定');
  assert.equal((await call('/api/study/scenarios',{method:'POST',user:owner,body:{...set,id:'bad id'}})).status,400);
  const asg=await call('/api/study/assignments',{method:'POST',user:owner,body:{setId:'demo@1',teacher:'T07',probe:'P1'}});
  assert.equal(asg.data.phase,'baseline');
  assert.equal((await call('/api/study/assignments',{method:'POST',user:owner,body:{setId:'demo@1',teacher:'T07',probe:'P2'}})).status,409,'同一位老師不重複用同一組');
  // 教師逐節看；看不到應有方向；基線期沒有 AI 摘要
  const id=asg.data.id;
  assert.deepEqual((await call('/api/scenario',{cookie:t7})).data.assignments.map(a=>[a.id,a.decided,a.total]),[[id,0,35]]);
  const view=await call('/api/scenario/'+id,{cookie:t7});
  assert.equal(view.data.aiOn,false);assert.equal(view.data.scenarios.length,5);assert.ok(view.data.scenarios.every(s=>s.sessions.length===1&&s.next===1));
  assert.doesNotMatch(JSON.stringify(view.data),/expected|insufficient/);
  assert.equal((await call('/api/scenario/'+id,{user:owner})).status,403,'研究人員不從教師端作答');
  assert.equal((await call('/api/scenario/'+id+'/summary',{method:'POST',cookie:t7,body:{scenario:'S1'}})).data.error,'summary_off');
  const decide=(scenario,sessionNo,extra)=>call('/api/scenario/'+id+'/decide',{method:'POST',cookie:t7,body:{scenario,sessionNo,reason:'lowAccuracy',shownAt:Date.now()-5000,activeMs:4000,totalMs:5000,aiWaitMs:0,...extra}});
  assert.equal((await decide('S1',1,{decision:'keep'})).status,200);
  assert.equal((await decide('S1',1,{decision:'keep'})).status,409,'同一節不能再存一次');
  assert.equal((await decide('S1',3,{decision:'keep'})).status,409,'不能跳節');
  assert.equal((await decide('S1',2,{decision:'keep'})).status,200);
  assert.equal((await decide('S1',3,{decision:'change',changes:{mode:'demo'}})).data.direction,'increase');
  assert.equal((await decide('S2',1,{decision:'change',changes:{support:'faded',mode:'self'},reason:'independent'})).data.error,'one_step_only');
  assert.equal((await call('/api/scenario/'+id,{cookie:t7})).data.scenarios[0].sessions.length,4,'存完第 3 節才看到第 4 節');
  // 介入期：AI 摘要打開；AI 寫了輸入裡沒有的數字就改用固定內容
  await call('/api/study/phases',{method:'POST',user:owner,body:{kind:'teacher',participant:'T07',phase:'intervention'}});
  const originalFetch=globalThis.fetch;let reply='第1節：完成 6 題。\n第2節：完成 6 題。\n第3節：完成 6 題。\n第4節：完成 6 題。\n依據：第1～4節',sent;
  globalThis.fetch=async(_u,o)=>{sent=JSON.parse(o.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:reply})}}]}));};
  try{
    const ok=await call('/api/scenario/'+id+'/summary',{method:'POST',cookie:t7,body:{scenario:'S1'}});
    assert.equal(ok.data.source,'ai');assert.deepEqual(ok.data.sessions,[1,2,3,4]);assert.equal(ok.data.promptVersion,'summary-v26.1');
    assert.match(sent.messages[0].content,/不提出任何調整方向/);assert.doesNotMatch(sent.messages[1].content,/T07|expected/);
    reply='第1節：完成 99 題。第2節。第3節。第4節。';
    const bad=await call('/api/scenario/'+id+'/summary',{method:'POST',cookie:t7,body:{scenario:'S1'}});
    assert.equal(bad.data.source,'fallback');assert.match(bad.data.text,/第1節：完成 6 題，支持下答對率 50%/);
    reply='第1節到第4節答對率偏低，建議增加支持。';
    assert.equal((await call('/api/scenario/'+id+'/summary',{method:'POST',cookie:t7,body:{scenario:'S1'}})).data.source,'fallback','不能提建議');
  }finally{globalThis.fetch=originalFetch;}
  // 研究匯出：教師決策附上應有方向；AI 輸出全文與版本
  const rows=(await call('/api/study/export?type=decisions',{user:owner})).data.rows;
  assert.deepEqual(rows.map(r=>[r.scenario,r.sessionNo,r.direction,r.expected]),[['S1',1,'maintain','insufficient'],['S1',2,'maintain','insufficient'],['S1',3,'increase','increase']]);
  assert.equal(rows[0].teacher,'T07');assert.equal(rows[0].totalMs,5000);
  assert.equal((await call('/api/study/export?type=decisions',{cookie:t7})).status,403);
  const ai=(await call('/api/study/export?type=ai',{user:owner})).data.rows;
  assert.deepEqual(ai.filter(r=>r.task==='summary').map(r=>[r.source,r.error]),[['fallback','rejected:advice'],['fallback','rejected:number_not_in_input'],['ai','']]);
  // 真實學生：同一套規則算每一節的應有方向，研究人員才看得到
  const s3=set.scenarios.find(s=>s.id==='S3');
  for(const x of s3.sessions.slice(0,4))for(let i=0;i<x.events.length;i+=40)assert.equal((await call('/api/records',{method:'POST',cookie:t7,body:{rows:x.events.slice(i,i+40).map((e,j)=>({...e,rid:`s3-${x.no}-${i+j}`,student:'T07-S01',sessionNo:x.no}))}})).status,200);
  const dir=await call('/api/study/direction?student=T07-S01&act=rectangle',{user:owner});
  assert.deepEqual(dir.data.timeline.map(t=>[t.no,t.acc,t.expected]),[[1,67,'insufficient'],[2,67,'insufficient'],[3,100,'maintain'],[4,100,'advance']]);
  assert.equal((await call('/api/study/direction?student=T07-S01&act=rectangle',{cookie:t7})).status,403);
  // 主持人工作區（main）存的紀錄也查得到
  for(const x of s3.sessions.slice(0,3))for(let i=0;i<x.events.length;i+=40)assert.equal((await call('/api/records',{method:'POST',user:owner,body:{rows:x.events.slice(i,i+40).map((e,j)=>({...e,rid:`m3-${x.no}-${i+j}`,student:'T09-S01',sessionNo:x.no}))}})).status,200);
  const dm=(await call('/api/study/direction?student=T09-S01&act=rectangle',{user:owner})).data;
  assert.equal(dm.workspace,'main');assert.deepEqual(dm.timeline.map(t=>[t.no,t.expected]),[[1,'insufficient'],[2,'insufficient'],[3,'maintain']]);
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:'第1節：完成 6 題。\n第2節：完成 6 題。\n依據：第1、2節'})}}]}));
  try{const sum=await call('/api/teacher/summary',{method:'POST',cookie:t7,body:{student:'T07-S01',act:'rectangle',upTo:2}});assert.equal(sum.data.source,'ai');assert.deepEqual(sum.data.sessions,[1,2]);}finally{globalThis.fetch=originalFetch;}
});

test('第 26 版第三階段：探試題組匯入鎖版、學生拿不到答案、每步獨立計分（連帶錯誤、自行修正）、逾時算錯',async()=>{
  const login=async teacher=>(await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher}})).headers.get('set-cookie').split(';')[0];
  const t8=await login('T08');
  const set=JSON.parse(fs.readFileSync(new URL('../scenarios/demo-probe.json',import.meta.url),'utf8'));
  assert.equal((await call('/api/study/probe-sets',{method:'POST',cookie:t8,body:set})).status,403,'只有研究人員能匯入');
  const bad=structuredClone(set);bad.forms[0].items.pop();
  assert.equal((await call('/api/study/probe-sets',{method:'POST',user:owner,body:bad})).status,400,'正式探試一份要 10 題、題型比例固定');
  assert.equal((await call('/api/study/probe-sets',{method:'POST',user:owner,body:set})).data.id,'demoProbe@1');
  assert.equal((await call('/api/study/probe-sets',{method:'POST',user:owner,body:set})).status,409);
  assert.deepEqual((await call('/api/probe/sets',{cookie:t8})).data.sets.map(s=>[s.id,s.kind,s.items]),[['demoProbe@1','probe',10]]);
  await call('/api/study/phases',{method:'POST',user:owner,body:{kind:'student',participant:'T08-S01',phase:'B'}});
  const start=await call('/api/probe/start',{method:'POST',cookie:t8,body:{student:'T08-S01',set:'demoProbe@1',sessionNo:3}});
  assert.equal(start.status,200);assert.equal(start.data.formId,'B','01 號從第 2 份複本開始');assert.equal(start.data.itemSecs,90);
  assert.doesNotMatch(JSON.stringify(start.data.items),/"answer":/,'學生拿不到答案');
  assert.equal((await call('/api/probe/start',{method:'POST',cookie:t8,body:{student:'T09-S01',set:'demoProbe@1'}})).status,400,'不能測別位老師的學生');
  const run=start.data.run,item=(id,steps,extra={})=>call(`/api/probe/${run}/item`,{method:'POST',cookie:t8,body:{itemId:id,steps,secs:30,...extra}});
  const c=(...v)=>({confirms:v.map((x,i)=>({v:x,t:i}))});
  // B03：長 4、寬 6；長填錯 5，面積照自己的長算 30 → 面積這一步算對（連帶錯誤），但這題答錯
  assert.equal((await item('B03',{len:c(5),wid:c(6),formula:c('長×寬'),area:c(30),unit:c('平方公分')})).status,200);
  assert.equal((await item('B03',{})).status,409,'一題只送一次');
  // B04：長 3、寬 8；面積先填 11（相加）再改成 24 → 自行修正
  await item('B04',{len:c(3),wid:c(8),formula:c('長+寬','長×寬'),area:c(11,24),unit:c('平方公分')});
  await item('B01',{area:c(12),unit:c('平方公分')});
  await item('B02',{area:c(20),unit:c('公分')},{});   // 單位錯
  await item('B06',{},{timedOut:true});              // 逾時沒作答
  await item('B07',{side:c(4)},{tech:true});         // 技術問題，不計
  assert.equal((await call(`/api/probe/${run}/finish`,{method:'POST',cookie:t8,body:{reason:'done'}})).status,200);
  assert.equal((await call(`/api/probe/${run}/item`,{method:'POST',cookie:t8,body:{itemId:'B05',steps:{}}})).status,409,'結束後不能再送');
  const runs=(await call('/api/study/export?type=probes',{user:owner})).data.rows,sum=runs[0].summary;
  assert.equal(runs[0].phase,'B');assert.equal(runs[0].sessionNo,3);
  assert.equal(sum.items,10);assert.equal(sum.valid,9);assert.equal(sum.correct,2);assert.equal(sum.firstSubmitAccuracy,11.1,'B04 第一次確定的面積是錯的，不算首次正確');assert.equal(sum.finalAccuracy,22.2);assert.equal(sum.dataPoint,true);
  assert.equal(sum.unanswered,5,'沒送的 4 題加上逾時的 1 題');
  const items=(await call('/api/study/export?type=probeItems',{user:owner})).data.rows,r=id=>items.find(x=>x.itemId===id).result;
  assert.equal(r('B03').correct,false);assert.equal(r('B03').measureCorrect,false);assert.deepEqual(r('B03').steps.map(s=>[s.key,s.firstCorrect]),[['len',false],['wid',true],['formula',true],['area',true],['unit',true]]);
  assert.equal(r('B04').correct,true);assert.deepEqual(r('B04').steps.filter(s=>s.selfCorrected).map(s=>s.key),['formula','area']);
  assert.equal(r('B02').unitCorrect,false);assert.equal(r('B07').tech,true);
  assert.equal(sum.errorSteps,4);assert.equal(sum.selfCorrected,2);assert.equal(sum.selfCorrectionRate,50);
  // 連帶錯誤依「當時」已確定的取量判定：長 5、寬 6、面積 30 之後，把長改成 4、面積改成 24，第一次的 30 仍然算對
  const run2=(await call('/api/probe/start',{method:'POST',cookie:t8,body:{student:'T08-S02',set:'demoProbe@1',sessionNo:1}})).data;
  const form2=set.forms.find(f=>f.id===run2.formId),rect=form2.items.find(i=>i.type==='rectangle'&&i.steps.filter(x=>x.role==='measure').length===2);
  const [mL,mW]=rect.steps.filter(x=>x.role==='measure'),ansStep=rect.steps.find(x=>x.role==='answer'),wrongL=mL.answer+1;
  const at=(...p)=>({confirms:p.map(([v,t])=>({v,t}))}),st2={[mL.key]:at([wrongL,1],[mL.answer,4]),[mW.key]:at([mW.answer,2]),[ansStep.key]:at([wrongL*mW.answer,3],[mL.answer*mW.answer,5])};
  for(const x of rect.steps)if(!st2[x.key])st2[x.key]=at([x.answer,2]);
  // 時間都一樣（t 相同）時用序號 n 分先後
  for(const [k,list] of Object.entries(st2))list.confirms.forEach(c=>{c.n=c.t;c.t=1;});
  // 資料庫寫入失敗：回 503（前端會保留答案再送），不能當成「已收件」
  const prep=env.DB.prepare.bind(env.DB);env.DB.prepare=sql=>/^INSERT INTO probe_items/.test(sql)?{bind:()=>({run:async()=>{throw new Error('disk');}})}:prep(sql);
  try{assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:rect.id,steps:st2,secs:20}})).status,503);}finally{env.DB.prepare=prep;}
  assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:rect.id,steps:st2,secs:20}})).status,200);
  assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:rect.id,steps:st2,secs:20}})).data.error,'already_submitted');
  // 確定 31 次：第一次與真正最後一次都要算；超過每題時間才確定的答案不算，記為逾時
  const others=form2.items.filter(i=>i.id!==rect.id),it31=others[0],it90=others[1],a31=it31.steps.find(x=>x.role==='answer');
  const st31={};for(const x of it31.steps)st31[x.key]=x===a31?{confirms:[...Array.from({length:30},(_,i)=>({v:999,t:i+1,n:i+1})),{v:a31.answer,t:40,n:31}]}:at([x.answer,1]);
  assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:it31.id,steps:st31,secs:45}})).status,200);
  const a90=it90.steps.find(x=>x.role==='answer'),st90={};for(const x of it90.steps)st90[x.key]=x===a90?{confirms:[{v:999,t:10,n:1},{v:a90.answer,t:110,n:2}]}:at([x.answer,1]);
  assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:it90.id,steps:st90,secs:114}})).status,200);
  // 第 91 秒才確定（畫面計時還沒停）：一樣不算
  const it91=others[2],a91=it91.steps.find(x=>x.role==='answer'),st91={};for(const x of it91.steps)st91[x.key]=x===a91?{confirms:[{v:a91.answer,t:91,n:1}]}:at([x.answer,1]);
  assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:it91.id,steps:st91,secs:91}})).status,200);
  // 中間夾一次錯的：前 10 次對、第 11 次錯、後 20 次對，仍記曾錯、自行修正
  const it3=others[3],a3=it3.steps.find(x=>x.role==='answer'),st3={};for(const x of it3.steps)st3[x.key]=x===a3?{confirms:[...Array.from({length:10},(_,i)=>({v:a3.answer,t:i+1,n:i+1})),{v:999,t:11,n:11},...Array.from({length:20},(_,i)=>({v:a3.answer,t:12+i,n:12+i}))]}:at([x.answer,1]);
  assert.equal((await call(`/api/probe/${run2.run}/item`,{method:'POST',cookie:t8,body:{itemId:it3.id,steps:st3,secs:40}})).status,200);
  await call(`/api/probe/${run2.run}/finish`,{method:'POST',cookie:t8,body:{reason:'stopped'}});
  const it2=(await call('/api/study/export?type=probeItems',{user:owner})).data.rows.find(r=>r.itemId===rect.id&&r.student==='T08-S02');
  const area2=it2.result.steps.find(x=>x.key===ansStep.key);
  assert.equal(area2.firstCorrect,true,'第一次的面積符合當時的長寬');assert.equal(area2.hadError,false);assert.equal(area2.selfCorrected,false);
  assert.equal(it2.result.firstCorrect,false,'最終答案第一次確定時不是正確答案');assert.equal(it2.result.correct,true);
  const exp2=(await call('/api/study/export?type=probeItems',{user:owner})).data.rows.filter(r=>r.student==='T08-S02');
  const r31=exp2.find(r=>r.itemId===it31.id).result,s31=r31.steps.find(x=>x.key===a31.key);
  assert.equal(s31.final,a31.answer);assert.equal(r31.correct,true);assert.equal(s31.firstCorrect,false);assert.equal(s31.selfCorrected,true);
  const r90=exp2.find(r=>r.itemId===it90.id).result;assert.equal(r90.timedOut,true);assert.equal(r90.correct,false,'時間到了以後改對的不算');
  const r91=exp2.find(r=>r.itemId===it91.id).result;assert.equal(r91.timedOut,true);assert.equal(r91.correct,false,'第 91 秒確定的不算');
  const s3=exp2.find(r=>r.itemId===it3.id).result.steps.find(x=>x.key===a3.key);assert.equal(s3.hadError,true);assert.equal(s3.selfCorrected,true);assert.equal(s3.firstCorrect,true);
  // 面積值相同但取量改了：第二次的面積依當時的取量算對（不能把相同值去掉）
  const run3=(await call('/api/probe/start',{method:'POST',cookie:t8,body:{student:'T08-S03',set:'demoProbe@1',sessionNo:1}})).data;
  const form3=set.forms.find(f=>f.id===run3.formId),r3=form3.items.find(i=>i.type==='rectangle'&&i.steps.filter(x=>x.role==='measure').length===2);
  const [L3,W3]=r3.steps.filter(x=>x.role==='measure'),A3=r3.steps.find(x=>x.role==='answer'),st3b={[L3.key]:{confirms:[{v:L3.answer,t:1,n:1},{v:L3.answer+1,t:3,n:3}]},[W3.key]:{confirms:[{v:W3.answer,t:1,n:2}]},[A3.key]:{confirms:[{v:(L3.answer+1)*W3.answer,t:2,n:2.5},{v:(L3.answer+1)*W3.answer,t:4,n:4}]}};
  for(const x of r3.steps)if(!st3b[x.key])st3b[x.key]={confirms:[{v:x.answer,t:1,n:0.5}]};
  assert.equal((await call(`/api/probe/${run3.run}/item`,{method:'POST',cookie:t8,body:{itemId:r3.id,steps:st3b,secs:20}})).status,200);
  // 太大的紀錄：明確回 too_large，不會截斷存成壞掉的資料
  const r3b=form3.items.find(i=>i.id!==r3.id),big={};for(const x of r3b.steps)big[x.key]={confirms:Array.from({length:9000},(_,i)=>({v:i%2?999:x.answer,t:1,n:i}))};
  const tl=await call(`/api/probe/${run3.run}/item`,{method:'POST',cookie:t8,body:{itemId:r3b.id,steps:big,secs:20}});assert.equal(tl.status,413);assert.equal(tl.data.error,'too_large');
  const a3row=(await call('/api/study/export?type=probeItems',{user:owner})).data.rows.find(r=>r.itemId===r3.id&&r.student==='T08-S03').result.steps.find(x=>x.key===A3.key);
  assert.equal(a3row.finalCorrect,true);assert.equal(a3row.selfCorrected,true);assert.equal(a3row.hadError,true);
  // 同一位學生第二次：換下一份複本
  assert.equal((await call('/api/probe/start',{method:'POST',cookie:t8,body:{student:'T08-S01',set:'demoProbe@1'}})).data.formId,'A');
});

test('第 26 版第四階段：學生研究階段、小老師小方支持階段（前進、退回、實物操作提示）、小方語句不能有數字',async()=>{
  const login=async teacher=>(await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher}})).headers.get('set-cookie').split(';')[0];
  const t10=await login('T10');
  await call('/api/study/phases',{method:'POST',user:owner,body:{kind:'student',participant:'T10-S01',phase:'BC'}});
  assert.deepEqual((await call('/api/study/phase?student=T10-S01',{cookie:t10})).data,{student:'T10-S01',phase:'BC',teacherWait:10,tutorChars:25,showAdvice:1});
  assert.equal((await call('/api/study/phase?student=T10-S01',{cookie:await login('T11')})).status,403,'別班老師讀不到');
  let n=0;const rows=(no,act,stage,list)=>list.map(([event,extra])=>({rid:`tu-${++n}-x`,sheet:'操作紀錄',time:`2026-11-0${no} 10:00:${String(n%60).padStart(2,'0')}`,student:'T10-S01',sessionNo:no,actId:act,mode:stage==='demo'?'demo':'self',detail:JSON.stringify({tutorStage:stage,...extra.detail}),event,...extra.top}));
  const save=async r=>assert.equal((await call('/api/records',{method:'POST',cookie:t10,body:{rows:r}})).status,200);
  const stage=async(act,no)=>(await call(`/api/tutor/stage?student=T10-S01&act=${act}&sessionNo=${no}`,{cookie:t10})).data;
  assert.equal((await stage('rectangle',1)).stage,'demo','每個核心活動從示範開始');
  const pick=ok=>['小方示範選擇',{top:{correct:ok?'是':'否'},detail:{}}];
  for(const no of [1,2])await save(rows(no,'rectangle','demo',[pick(true),pick(true),pick(true),pick(true),pick(false)]));
  assert.equal((await stage('rectangle',3)).stage,'guided','連續兩節 80% 進入陪做');
  assert.equal((await stage('rectangle',3)).stage,'guided','同一節再問一次不會重算');
  const q=(cycle,maxHint,firstOk)=>[['步驟檢核',{top:{correct:firstOk?'是':'否',cycle,step:7},detail:{}}],['整題完成',{top:{cycle,step:7},detail:{maxHintLevel:maxHint}}]];
  for(const no of [3,4])await save(rows(no,'rectangle','guided',[...q(1,3,true),...q(2,1,false),...q(3,0,true)]));   // 只有 1/3 算對
  assert.equal((await stage('rectangle',5)).stage,'demo','連續兩節低於 50% 退回示範');
  // 示範階段連續 5 節低於 50%：提示加入實物操作
  for(const no of [1,2,3,4,5])await save(rows(no,'square','demo',[pick(false),pick(false),pick(true)]));
  await stage('square',1);const hands=await stage('square',6);assert.equal(hands.stage,'demo');assert.equal(hands.handsOn,true);
  const ch=(await call('/api/study/export?type=tutor',{user:owner})).data.rows;
  assert.deepEqual(ch.map(c=>[c.act,c.fromStage,c.toStage,c.reason]),[['rectangle','demo','guided','up'],['rectangle','guided','demo','down'],['square','demo','demo','handsOn']]);
  // 小方語句：AI 有數字就用固定語句
  const originalFetch=globalThis.fetch;let reply='我數到12格。';
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({message:reply})}}]}));
  try{
    const body={event:'wrong',stage:'guided',act:'rectangle',stepTitle:'數一數',obs:'countShort'};
    const a=await call('/api/tutor/line',{method:'POST',cookie:t10,body});assert.equal(a.data.source,'fallback');assert.equal(a.data.text,'再看一次圖，慢慢想。');
    reply='再一格一格點過去看看。';assert.equal((await call('/api/tutor/line',{method:'POST',cookie:t10,body})).data.text,reply);
    assert.equal((await call('/api/tutor/line',{method:'POST',cookie:t10,body:{...body,event:'answer'}})).status,400);
  }finally{globalThis.fetch=originalFetch;}
  // 第三年：教師端 AI 摘要關閉
  assert.equal((await call('/api/teacher/summary',{method:'POST',cookie:t10,body:{student:'T10-S01',act:'rectangle',upTo:4}})).data.error,'summary_off');
});

test('第 27 版：表面積題組依教材包驗證題型；連帶錯誤依學生自己算的面判定',async()=>{
  const login=async teacher=>(await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass',teacher}})).headers.get('set-cookie').split(';')[0];
  const t10=await login('T10');
  const set=JSON.parse(fs.readFileSync(new URL('../scenarios/surface-probe.json',import.meta.url),'utf8'));
  const noPkg=structuredClone(set);delete noPkg.package;
  assert.equal((await call('/api/study/probe-sets',{method:'POST',user:owner,body:noPkg})).status,400,'沒寫教材包就照面積的題型，表面積的題型不收');
  const badPkg=structuredClone(set);badPkg.package='volume';
  assert.equal((await call('/api/study/probe-sets',{method:'POST',user:owner,body:badPkg})).status,400);
  assert.equal((await call('/api/study/probe-sets',{method:'POST',user:owner,body:set})).data.id,'surfaceProbe@2');
  const start=await call('/api/probe/start',{method:'POST',cookie:t10,body:{student:'T10-S01',set:'surfaceProbe@2',sessionNo:1}});
  assert.equal(start.status,200);assert.doesNotMatch(JSON.stringify(start.data.items),/"answer":/);
  const run=start.data.run,item=(id,steps)=>call(`/api/probe/${run}/item`,{method:'POST',cookie:t10,body:{itemId:id,steps,secs:30}});
  const c=(...v)=>({confirms:v.map((x,i)=>({v:x,t:i,n:i+1}))});
  // A04：4×3×2；前面算錯成 9，總和照自己的面算 (12+9+6)×2=54 → 總和這一步算對（連帶），整題答錯
  await item('A04',{top:c(12),front:c(9),right:c(6),formula:c('三種面積加起來再乘2'),area:c(54),unit:c('平方公分')});
  // A07：邊長 2，一個面算成 6，總和 36 → 連帶算對
  await item('A07',{side:c(2),face:c(6),formula:c('一個面的面積×6'),area:c(36),unit:c('平方公分')});
  // A10：沒有蓋子 12、8、6 → 40；先填有蓋子的 52 再改 40 → 自行修正
  await item('A10',{base:c(12),front:c(8),right:c(6),formula:c('底面＋前面×2＋右面×2'),area:c(52,40),unit:c('平方公分')});
  // A09：反推 96 ÷ 6 = 16，單位選立方公分
  await item('A09',{total:c(96),formula:c('表面積÷6'),area:c(16),unit:c('立方公分')});
  // A06：三角柱 6、8、10，高 2 → 24×2＋48＝96；底面算成 48（忘了 ÷2），總和照自己的數 48×2＋48＝144 → 連帶算對
  await item('A06',{base:c(48),side:c(48),formula:c('底面積×2＋側面積'),area:c(144),unit:c('平方公分')});
  await call(`/api/probe/${run}/finish`,{method:'POST',cookie:t10,body:{reason:'done'}});
  const rows=(await call('/api/study/export?type=probeItems',{user:owner})).data.rows.filter(x=>x.run===run),r=id=>rows.find(x=>x.itemId===id).result,st=(id,k)=>r(id).steps.find(s=>s.key===k);
  assert.equal(r('A04').correct,false);assert.equal(st('A04','front').finalCorrect,false);assert.equal(st('A04','area').finalCorrect,true,'總和依學生自己的面判定');
  assert.equal(st('A07','area').finalCorrect,true);assert.equal(r('A07').correct,false);
  assert.equal(r('A10').correct,true);assert.equal(st('A10','area').selfCorrected,true);
  assert.equal(st('A06','base').finalCorrect,false);assert.equal(st('A06','area').finalCorrect,true,'柱體總和依學生自己的底面積判定');assert.equal(r('A06').correct,false);
  assert.equal(r('A09').answerCorrect,true);assert.equal(r('A09').unitCorrect,false);
});

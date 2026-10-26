import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
import fs from 'node:fs';

const origin='https://lesson.example';
const owner='owner-1';
const feedbackDefaults=JSON.parse(fs.readFileSync(new URL('../lesson-defaults.json',import.meta.url),'utf8'));
function database(){const lessons=new Map(),attempts=new Map(),usage=new Map();return {prepare(sql){return {bind(...args){return {async first(){if(sql.includes('FROM lesson_documents'))return lessons.get(args[0])||null;if(sql.includes('FROM test_login_attempts'))return attempts.get(args[0])||null;if(sql.includes('INTO test_ai_usage')){const calls=(usage.get(args[0])||0)+1;if(calls>50)return null;usage.set(args[0],calls);return {calls};}return null;},async run(){if(sql.includes('INTO lesson_documents')){const [kind,config_json,revision]=args;lessons.set(kind,{config_json,revision});}else if(sql.includes('INTO test_login_attempts'))attempts.set(args[0],{failures:args[1],reset_at:args[2]});else if(sql.includes('DELETE FROM test_login_attempts'))attempts.delete(args[0]);return {success:true};}};}};}};}
const env={DB:database(),TEACHER_EMAIL:'owner@example.test',TEST_PASSWORD:'test-pass',TEST_SESSION_SECRET:'a-long-test-session-secret',TEST_DEEPSEEK_API_KEY:'sk-test-only-example-secret-value'};
function req(path,{method='GET',user,body,cookie}={}){return new Request(origin+path,{method,headers:{...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user===owner?'owner@example.test':'other@example.test'}:{}),...(body?{'content-type':'application/json',origin}: {}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});}
const call=async(path,options)=>{const response=await worker.fetch(req(path,options),env);return {status:response.status,data:await response.json(),headers:response.headers};};
async function testCookie(){const login=await call('/api/test-login',{method:'POST',body:{username:'test',password:'test-pass'}});assert.equal(login.status,200);return login.headers.get('set-cookie').split(';')[0];}

test('owner, tester and other visitor have separate access',async()=>{
  const cookie=await testCookie();
  assert.deepEqual((await call('/api/session',{cookie})).data,{authenticated:true,teacher:true,test:true,aiProvider:'deepseek'});
  assert.deepEqual((await call('/api/session',{user:owner,cookie})).data,{authenticated:true,teacher:true,test:true,aiProvider:'deepseek'});
  assert.deepEqual((await call('/api/session',{user:owner})).data,{authenticated:true,teacher:true,test:false,aiProvider:null});
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
  for(const bad of [{methods:[]},{methods:['jump']},{mode:'auto'},{goalKind:'time'},{rest:5},{textSize:'huge'},{zhuyin:'yes'}]){   // 第 18 版設定也要檢查
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

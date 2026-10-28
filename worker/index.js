// Build script replaces this token with the byte-preserving map of the existing lesson assets.
const assets = new Map(__ASSET_MAP__);
const lessonDefaults = __LESSON_DEFAULTS__;
const shapes = new Set(['rectangle','square','triangle','parallelogram']);
// 第 19 版新活動：AI 只知道活動名稱、步驟名稱與答錯情形，不知道題目數字
const actTitles={compare:'比一比，哪個比較大',tile:'用方格鋪滿、數格子',conserve:'剪開再拼，面積不變',estimate:'先估一估，再數整格和半格',perimeter:'周長：沿著邊走一圈',which:'分辨要算面積還是周長',samePerimeter:'周長一樣，面積不一定一樣',inverse:'知道面積，找邊長',arrange:'用固定格數排出不同長方形',composite:'複合圖形切成長方形再加起來',squareMeter:'平方公尺',trapezoid:'梯形：兩片拼成平行四邊形',word:'生活應用題：面積或周長'};
const perimeterActs=new Set(['perimeter','which','samePerimeter','word']);
const modes = new Set(['hint','reflection','teacher']);
const providers = new Set(['openai','deepseek']);
const methods = new Set(['mark','self']);
const goals = new Set(['check','independent']);
const noStore = {'cache-control':'private, no-store','content-type':'application/json; charset=utf-8'};
const json = (value,status=200)=>new Response(JSON.stringify(value),{status,headers:noStore});
const testCookie='__Host-area_test';
const encoder=new TextEncoder();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function hmac(secret,message){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(message))));}
async function equalSecret(a,b){const digest=async x=>new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(String(x))));const [left,right]=await Promise.all([digest(a),digest(b)]);let difference=0;for(let i=0;i<left.length;i++)difference|=left[i]^right[i];return difference===0;}
// 登入身分（第 24 版）：v1 = 舊的共用測試帳號；v2 = 測試帳號＋教師代號（各自的工作區），或學生用班級代碼登入
const TEACHER_CODE=/^T(0[1-9]|1[0-2])$/,CLASS_CODE=/^[2-9A-HJKMNP-Z]{6}$/,CODE_CHARS='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
async function readSession(request,env){if(!env.TEST_SESSION_SECRET)return null;const cookie=request.headers.get('cookie')||'',part=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(testCookie+'='));if(!part)return null;const token=part.slice(testCookie.length+1),pieces=token.split('.');
const v1=pieces.length===4&&pieces[0]==='v1',v2=pieces.length===6&&pieces[0]==='v2';if(!(v1||v2)||!/^\d{10,13}$/.test(pieces[1])||!/^[a-f0-9]{32}$/.test(pieces[2]))return null;const expires=Number(pieces[1]);if(expires<Date.now()||expires>Date.now()+13*60*60*1000)return null;
if(v2&&!((pieces[3]==='t'&&(pieces[4]==='test'||TEACHER_CODE.test(pieces[4])))||(pieces[3]==='s'&&CLASS_CODE.test(pieces[4]))))return null;const signed=pieces.slice(0,-1).join('.');if(!await equalSecret(pieces.at(-1),await hmac(env.TEST_SESSION_SECRET,signed)))return null;
return v1?{kind:'t',ws:'test'}:{kind:pieces[3],ws:pieces[4]};}
async function classRow(env,code){if(!env.DB)return null;try{return await env.DB.prepare('SELECT code, workspace, label, expires_at, revoked FROM class_codes WHERE code = ?').bind(code).first();}catch{return null;}}
async function whoAmI(request,env){const session=await readSession(request,env);if(session&&session.kind==='t')return {role:'test',ws:session.ws};if(session&&session.kind==='s'){const row=await classRow(env,session.ws);if(row&&!row.revoked&&row.expires_at>Date.now())return {role:'student',ws:row.workspace,code:row.code,label:row.label};}if(isTeacher(request,env))return {role:'teacher',ws:'main'};return {role:'none',ws:''};}
async function signedToken(env,expires,kind,ws){const payload=`v2.${expires}.${crypto.randomUUID().replaceAll('-','')}.${kind}.${ws}`;return `${payload}.${await hmac(env.TEST_SESSION_SECRET,payload)}`;}
// 教材存放：正式教師 main → draft／published；共用測試 test → test_draft；教師代號 T01 → test_T01_draft
const lessonKind=(ws,k)=>ws==='main'?k:ws==='test'?'test_'+k:`test_${ws}_${k}`;
function sessionCookie(token,maxAge){return `${testCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;}
function jsonCookie(value,status,cookie){return new Response(JSON.stringify(value),{status,headers:{...noStore,'set-cookie':cookie}});}
const teacherPasswords=env=>Object.fromEntries(String(env.TEST_TEACHER_PASSWORDS||'').split(',').map(x=>x.trim().split(':')).filter(([k,v])=>TEACHER_CODE.test(k||'')&&v&&v.length>=8).map(([k,...v])=>[k,v.join(':')]));
async function testLogin(request,env){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);if(!env.DB||!env.TEST_PASSWORD||!env.TEST_SESSION_SECRET)return json({error:'test_login_unavailable'},503);if(Number(request.headers.get('content-length')||0)>1024)return json({error:'too_large'},413);let body;try{body=await request.json();}catch{return json({error:'invalid_json'},400);}if(!body||typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>40||body.password.length>100||(body.teacher!==undefined&&body.teacher!==''&&!TEACHER_CODE.test(body.teacher)))return json({error:'invalid_input'},400);
const key=(await hmac(env.TEST_SESSION_SECRET,request.headers.get('cf-connecting-ip')||'unknown')).slice(0,48),now=Date.now();try{const prior=await env.DB.prepare('SELECT failures, reset_at FROM test_login_attempts WHERE visitor_key = ?').bind(key).first();if(prior&&prior.reset_at>now&&prior.failures>=5)return json({error:'too_many_attempts'},429);// 有設定 TEST_TEACHER_PASSWORDS（例如 T01:密碼一,T02:密碼二）時，選教師代號要用那位老師自己的密碼，別的老師進不去
const own=teacherPasswords(env)[body.teacher||''],usernameOk=await equalSecret(body.username,'test'),passwordOk=await equalSecret(body.password,own||env.TEST_PASSWORD),codeOk=!body.teacher||!Object.keys(teacherPasswords(env)).length||!!own;if(!usernameOk||!passwordOk||!codeOk){const failures=prior&&prior.reset_at>now?prior.failures+1:1;await env.DB.prepare('INSERT INTO test_login_attempts (visitor_key,failures,reset_at) VALUES (?,?,?) ON CONFLICT(visitor_key) DO UPDATE SET failures=excluded.failures,reset_at=excluded.reset_at').bind(key,failures,now+15*60*1000).run();return json({error:'invalid_credentials'},401);}await env.DB.prepare('DELETE FROM test_login_attempts WHERE visitor_key = ?').bind(key).run();const expires=now+12*60*60*1000,token=await signedToken(env,expires,'t',body.teacher||'test');return jsonCookie({ok:true},200,sessionCookie(token,12*60*60));}catch{return json({error:'test_login_unavailable'},503);}}
// 第 24 版：「問 AI」每天的次數改成每個工作區（每位老師）各 50 次，不再全站共用
async function useTestAiQuota(env,scope){if(!env.DB)return false;try{const day=new Date().toISOString().slice(0,10),row=await env.DB.prepare('INSERT INTO ai_usage (day,scope,calls) VALUES (?,?,1) ON CONFLICT(day,scope) DO UPDATE SET calls=calls+1 WHERE calls<50 RETURNING calls').bind(day,scope).first();return !!row;}catch{return false;}}
const whole = (value,max)=>Number.isInteger(value)&&value>=0&&value<=max;
const safeText = (value,max=80)=>typeof value==='string'&&value.length>0&&value.length<=max;
const schema={type:'object',properties:{message:{type:'string'}},required:['message'],additionalProperties:false};
const stepNames=['看題目','點格子或操作圖形','找底或第一個邊長','找高或第二個邊長','列算式','計算並比一比','寫單位'];
const issueNames={none:'無',target:'選錯要找什麼',count:'格子沒點完或總數不對',relation:'操作後的比較選錯',base:'還沒點底',first:'底或第一個邊長填錯',line:'選錯高的線',height:'選錯高的線',second:'高或第二個邊長填錯',formula:'算式選錯',ab:'算式裡的數字填錯',total:'計算結果不對',verify:'還沒比一比',unit:'單位選錯',final:'答案不對'};
const banned='公式、一致、依據、垂直、全等、周長、對應、驗證、策略、概念、檢核';
const concepts={rectangle:['辨認面積','逐格標記','每排格數','排數','長乘寬的意義','點數與計算對照','平方公分'],square:['辨認面積','逐格標記','邊長','相鄰等長邊','邊長乘邊長的意義','點數與計算對照','平方公分'],triangle:['辨認面積','兩片全等三角形拼合','底','與底垂直的高','兩片面積與一片面積','拼合結果與計算對照','平方公分'],parallelogram:['辨認面積','沿高剪移、面積不變','底','與底垂直的高','底乘高的意義','剪移後面積對照','平方公分']};
function validate(body){const act=body&&typeof body==='object'&&Object.hasOwn(actTitles,body.shape);if(act&&!(typeof body.stepTitle==='string'&&/^[\u4e00-\u9fff0-9A-Za-z ，、（）？]{1,16}$/.test(body.stepTitle)))return false;if(!body||typeof body!=='object'||Array.isArray(body)||!modes.has(body.kind)||!(shapes.has(body.shape)||act)||!whole(body.cycle,50)||!whole(body.step,act?7:6)||!methods.has(body.method)||!goals.has(body.goal)||!whole(body.hints,50)||!whole(body.errors,50)||typeof body.incorrect!=='boolean')return false;
if(Object.hasOwn(body,'operationComplete')&&typeof body.operationComplete!=='boolean'||Object.hasOwn(body,'comparisonOpened')&&typeof body.comparisonOpened!=='boolean')return false;
if(Object.hasOwn(body,'issue')&&!(act&&/^[a-z][A-Za-z0-9]{0,11}$/.test(body.issue))&&!['none','target','count','relation','base','first','line','height','second','formula','ab','total','verify','unit','final'].includes(body.issue))return false;
if(Object.hasOwn(body,'hintLevel')&&!whole(body.hintLevel,3))return false;
if(Object.hasOwn(body,'apiKey')&&!(typeof body.apiKey==='string'&&/^sk-[^\s]{20,400}$/.test(body.apiKey)))return false;
if(Object.hasOwn(body,'provider')&&!providers.has(body.provider))return false;
if(body.kind==='teacher'){return Array.isArray(body.steps)&&(act?body.steps.length>=1&&body.steps.length<=8:body.steps.length===7)&&body.steps.every(x=>whole(x,100))&&whole(body.backtracks,100)&&whole(body.completed,50)&&whole(body.helpRequests,100);}
return true;}
function instruction(data){const base='你是國小面積教材的繁體中文學習支持。對象可能閱讀較慢。只輸出一則短訊息，不用 Markdown。不能給出數值答案、代填算式、假稱已判斷學生錯因，或使用診斷標籤。保留學生思考與選擇。';
const act=Object.hasOwn(actTitles,data.shape),words=act&&perimeterActs.has(data.shape)?banned.replace('周長、',''):banned;
const context=act?`活動=${actTitles[data.shape]}，目前步驟=${data.step+1} ${data.stepTitle}，方法=${data.method}，學生已看到第${data.hintLevel||0}層提示（共3層），本題提示次數=${data.hints}，答錯次數=${data.errors}，剛剛答錯=${data.incorrect}，錯在=${data.issue&&data.issue!=='none'?'這一步的答案（代碼 '+data.issue+'）':'無'}。`:`圖形=${data.shape}，目前步驟=${data.step+1} ${stepNames[data.step]}，概念=${concepts[data.shape][data.step]}，方法=${data.method}，學生已看到第${data.hintLevel||0}層提示（共3層），本題提示次數=${data.hints}，答錯次數=${data.errors}，剛剛答錯=${data.incorrect}，錯在=${issueNames[data.issue||'none']||'無'}，操作已完成=${data.operationComplete===true}，比一比已打開=${data.comparisonOpened===true}。`;
if(data.kind==='hint')return {system:base+`對象是國小三到五年級、可能有學習困難的學生。用國小中年級的口語，一句話，不超過25個字，只說一個動作，例如「看綠色的線，數它有幾格」。不要用這些詞：${words}。不要重複學生已看過的提示，要換一個說法或指出圖上要看的地方。針對「錯在」的地方提示。操作已完成時，不可叫學生繼續點格子或重新拼合。三角形是拿兩片一樣大的拼起來，高不是切開的線。不可說出數字答案，也不可直接說哪個選項對。`,user:context};
if(data.kind==='reflection')return {system:base+`對象是國小三到五年級、可能有學習困難的學生。問一個很簡單、能用一句話回答的問題，不超過30個字，用國小中年級的口語，例如「你是怎麼知道高是哪一條線的？」。不要用這些詞：${words}。只問一件事，不替學生回答。`,user:context};
return {system:base+'面向教師，請用不超過180字整理：觀察事實、待教師確認的可能困難、下一次可觀察什麼。事實與推測須分清；統計只代表點擊與檢核，不代表學生已具備SRL能力。',user:context+`各步檢核未通過次數=${data.steps.join(',')}；返回修正=${data.backtracks}次；整題完成=${data.completed}輪；主動求助=${data.helpRequests}次。`};}
async function ai(request,env,who){const role=who.role,server=role==='test'||role==='student';const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);if(role==='none')return json({error:'signin_required'},401);
const size=Number(request.headers.get('content-length')||0);if(size>4096)return json({error:'too_large'},413);
let body;try{body=await request.json();}catch{return json({error:'invalid_json'},400);}if(!validate(body))return json({error:'invalid_input'},400);if(body.kind==='teacher'&&role==='none')return json({error:'forbidden'},403);
if(body.kind==='teacher'&&role==='student')return json({error:'forbidden'},403);const selected=server?'deepseek':body.provider||'openai',apiKey=server?env.TEST_DEEPSEEK_API_KEY:body.apiKey||(selected==='openai'?env.OPENAI_API_KEY:null);if(!apiKey)return json({error:selected==='deepseek'?'key_required':'ai_unavailable'},503);if(server&&!await useTestAiQuota(env,who.ws))return json({error:'test_ai_limit'},429);
const prompt=instruction(body),deepseek=selected==='deepseek';
// DeepSeek 用 OpenAI 相容的 Chat Completions（https://api-docs.deepseek.com）；OpenAI 用 Responses API
const requestBody=deepseek?{model:env.DEEPSEEK_MODEL||'deepseek-flash',messages:[{role:'system',content:prompt.system+'只輸出 JSON 物件，格式為 {"message":"你的訊息"}。'},{role:'user',content:prompt.user}],response_format:{type:'json_object'},thinking:{type:'disabled'},max_tokens:body.kind==='teacher'?400:200,stream:false}:{model:env.OPENAI_MODEL||'gpt-5-mini',max_output_tokens:body.kind==='teacher'?280:160,input:[{role:'system',content:prompt.system},{role:'user',content:prompt.user}],text:{format:{type:'json_schema',name:'teaching_support',strict:true,schema}},store:false};
let provider;try{provider=await fetch(deepseek?'https://api.deepseek.com/chat/completions':'https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(12000)});}catch{return json({error:'ai_timeout'},503);}
if(!provider.ok){let error;try{error=(await provider.json()).error;}catch{}return json({error:provider.status===401?'invalid_api_key':provider.status===402||error?.code==='credit_balance_exhausted'||error?.type==='insufficient_quota'?'credit_exhausted':'ai_provider_unavailable'},503);}
let result;try{result=await provider.json();}catch{return json({error:'ai_invalid_response'},503);}
const raw=deepseek?String(result.choices?.[0]?.message?.content||''):(result.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('');let parsed;try{parsed=JSON.parse(raw);}catch{return json({error:'ai_invalid_response'},503);}
const message=parsed?.message?.trim();if(!safeText(message,body.kind==='teacher'?200:body.kind==='hint'?40:50)||body.kind==='hint'&&/\d/.test(message))return json({error:'ai_invalid_response'},503);
return json({message,source:'ai'});}
function asset(path){const found=assets.get(path);if(!found)return new Response('Not found',{status:404});const [contentType,data]=found;const bin=atob(data),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new Response(bytes,{headers:{'content-type':contentType,'x-content-type-options':'nosniff','cache-control':'private, no-cache'}});}
const userId=request=>request.headers.get('oai-authenticated-user-id')||'';
const isTeacher=(request,env)=>!!userId(request)&&!!env.TEACHER_EMAIL&&String(request.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase()===String(env.TEACHER_EMAIL).trim().toLowerCase();
const clone=x=>JSON.parse(JSON.stringify(x));
const shapeKeys=['rectangle','square','triangle','parallelogram'];
const ACT_IDS=['compare','tile','conserve','estimate','perimeter','which','samePerimeter','rectangle','square','inverse','arrange','composite','squareMeter','parallelogram','triangle','trapezoid','word'];
const PLUGIN_IDS=ACT_IDS.filter(id=>!shapeKeys.includes(id));
const hintList=v=>Array.isArray(v)&&v.length<=7&&v.every(x=>typeof x==='string'&&x.length<=180);
const videoMap=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,x])=>/^[0-6]$/.test(k)&&typeof x==='string'&&/^v_[a-z0-9]{20}$/.test(x));
function validMap(m){return !!m&&typeof m==='object'&&!Array.isArray(m)&&Array.isArray(m.assigned)&&m.assigned.length<=ACT_IDS.length&&m.assigned.every(x=>ACT_IDS.includes(x))&&new Set(m.assigned).size===m.assigned.length&&(m.sequential===undefined||typeof m.sequential==='boolean')&&(m.path===undefined||['g3','g4','g5','all','custom'].includes(m.path));}
function validActivities(a){if(!a||typeof a!=='object'||Array.isArray(a))return false;for(const [k,v] of Object.entries(a)){if(!PLUGIN_IDS.includes(k)||!v||typeof v!=='object'||Array.isArray(v))return false;if(v.settings!==undefined&&!validSettings(v.settings))return false;for(const h of ['hints','hints2','hints3'])if(v[h]!==undefined&&!hintList(v[h]))return false;if(v.videos!==undefined&&!videoMap(v.videos))return false;}return true;}
function validSettings(s){if(!s||typeof s!=='object'||Array.isArray(s))return false;if(!['seven','three','custom'].includes(s.flow)||!['full','faded'].includes(s.support)||typeof s.hintGate!=='boolean'||!['easy','standard','challenge','custom'].includes(s.difficulty))return false;
if(s.breaks!==undefined&&!(Array.isArray(s.breaks)&&s.breaks.length<=6&&s.breaks.every((v,i)=>Number.isInteger(v)&&v>=0&&v<6&&(i===0||v>s.breaks[i-1]))))return false;
if(s.keep!==undefined&&!(Array.isArray(s.keep)&&s.keep.length<=4&&s.keep.every(v=>[0,1,2,3].includes(v))))return false;
if(s.labels!==undefined&&!['reveal','always'].includes(s.labels))return false;
if(s.rate!==undefined&&!['slow','normal'].includes(s.rate))return false;
for(const k of ['ai','reward','sound','grid','confidence','selfAsk','badges','voice','handsOn','zhuyin','contrast','convert','fading','buddy','buddyVoice','attention'])if(s[k]!==undefined&&typeof s[k]!=='boolean')return false;
if(s.buddyWait!==undefined&&![30,60,90].includes(s.buddyWait))return false;
if(s.attentionSec!==undefined&&![3,5,8].includes(s.attentionSec))return false;
if(s.mode!==undefined&&!['self','together','demo','probe'].includes(s.mode))return false;
if(s.goalKind!==undefined&&!['hints','firstTry'].includes(s.goalKind))return false;
// 第 23 版：目標詢問頻率、這次做幾題、自訂步驟名稱
if(s.srlAsk!==undefined&&!['first','every3','always','off'].includes(s.srlAsk))return false;
if(s.lessonGoal!==undefined&&![0,3,5,8,10].includes(s.lessonGoal))return false;
if(s.stepNames!==undefined&&!(s.stepNames&&typeof s.stepNames==='object'&&!Array.isArray(s.stepNames)&&Object.entries(s.stepNames).every(([k,v])=>/^[0-6]$/.test(k)&&typeof v==='string'&&v.trim().length<=12)))return false;
if(s.textSize!==undefined&&!['normal','large','xlarge'].includes(s.textSize))return false;
if(s.rest!==undefined&&![0,2,3].includes(s.rest))return false;
if(s.video!==undefined&&!['off','hint','always'].includes(s.video))return false;
if(s.methods!==undefined&&!(Array.isArray(s.methods)&&s.methods.length>=1&&s.methods.length<=3&&s.methods.every(v=>['mark','row','self'].includes(v))&&new Set(s.methods).size===s.methods.length))return false;
return true;}
const contextKeys=['desk','tile','garden','flag','card','window','sandwich','paper'];
// 第 22 版：現場試用紀錄（Apps Script 網址、通行碼、教師與學生人數）
function validResearch(r){return !!r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).every(k=>['url','key','teachers','students'].includes(k))&&(r.url===''||(typeof r.url==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/.test(r.url)))&&typeof r.key==='string'&&r.key.length<=40&&(r.key===''||r.key.length>=4)&&(r.teachers===undefined||(Number.isInteger(r.teachers)&&r.teachers>=1&&r.teachers<=12))&&(r.students===undefined||(Number.isInteger(r.students)&&r.students>=1&&r.students<=20));}
function validLesson(value,forSave=false){if(!value||typeof value!=='object'||Array.isArray(value)||!shapeKeys.every(k=>Object.hasOwn(value,k))||Object.keys(value).some(k=>!shapeKeys.includes(k)&&k!=='map'&&k!=='activities'&&k!=='research'))return false;
if(value.research!==undefined&&!validResearch(value.research))return false;
if(value.map!==undefined&&!validMap(value.map))return false;if(value.activities!==undefined&&!validActivities(value.activities))return false;
for(const shape of shapeKeys){const section=value[shape];if(!section||!Array.isArray(section.problems)||section.problems.length!==3||!Array.isArray(section.hints)||section.hints.length!==7)return false;
if(section.settings&&!validSettings(section.settings))return false;
if(!section.hints.every(x=>typeof x==='string'&&x.trim().length>=3&&x.length<=180))return false;
if(section.videos!==undefined&&!(section.videos&&typeof section.videos==='object'&&!Array.isArray(section.videos)&&Object.entries(section.videos).every(([k,v])=>/^[0-6]$/.test(k)&&typeof v==='string'&&/^v_[a-z0-9]{20}$/.test(v))))return false;
for(const k of ['hints2','hints3'])if(section[k]!==undefined&&!(Array.isArray(section[k])&&section[k].length===7&&section[k].every(x=>typeof x==='string'&&x.length<=180)))return false;
for(const p of section.problems){if(!p||!Number.isInteger(p.a)||!Number.isInteger(p.b)||!Number.isInteger(p.offset)||typeof p.prompt!=='string'||p.prompt.trim().length<3||p.prompt.length>160)return false;
if(p.context!==undefined&&!contextKeys.includes(p.context))return false;
if(p.a<2||p.a>10||p.b<2||p.b>8||Math.abs(p.offset)>4)return false;
if(shape==='square'&&(p.a!==p.b||p.offset!==0)||shape==='rectangle'&&p.offset!==0||forSave&&shape==='parallelogram'&&(p.offset<1||p.offset>=p.a))return false;}}
return true;}
const legacyHints={"rectangle": ["題目要算裡面的大小，還是邊界的長度？", "每格都留下標記了嗎？有漏掉的格子嗎？", "數的是格子，不是格線。", "對照排數或相鄰邊長。", "算式的兩個數字對應圖上的哪裡？", "乘法結果和點數總數相同嗎？不同就回去檢查。", "用平方公分表示面積，不是公分。"], "square": ["題目要算裡面的大小，還是邊界的長度？", "每格都留下標記了嗎？有漏掉的格子嗎？", "數的是格子，不是格線。", "對照排數或相鄰邊長。", "算式的兩個數字對應圖上的哪裡？", "乘法結果和點數總數相同嗎？不同就回去檢查。", "用平方公分表示面積，不是公分。"], "triangle": ["題目要算裡面的大小，還是邊界的長度？", "兩片一樣大；原來一片占多少？", "對照底邊的數字。", "高必須與這條底垂直，斜邊不能代替高。", "算的是一片，列式有除以 2 嗎？", "答案乘以 2，應等於拼成圖形的底乘高。", "用平方公分表示面積，不是公分。"], "parallelogram": ["題目要算裡面的大小，還是邊界的長度？", "只有移動，是否增加或拿走任何一塊？", "對照底邊的數字。", "高必須與這條底垂直，斜邊不能代替高。", "算式的兩個數字對應圖上的哪裡？", "答案應等於剪移後長方形的底乘高。", "用平方公分表示面積，不是公分。"]};
const v2Hints={"rectangle": ["面積是圖形裡面的大小。看一看能在裡面鋪多少個小方格。", "請點圖中的小格子。每點一格，就留下一個記號。", "看加粗的一排。數這一排有幾格。", "看左邊加粗的一列。數共有幾排。", "一排有幾格？共有幾排？選能算出全部格數的公式，再填兩個邊長。", "先算出答案，再展開你的點數紀錄，比較兩個結果。", "面積要寫平方公分。檢查你的答案、單位和前面的計算是否一致。"], "square": ["面積是圖形裡面的大小。看一看能在裡面鋪多少個小方格。", "請點圖中的小格子。每點一格，就留下一個記號。", "看加粗的一排。數這一排有幾格。", "看左邊加粗的一列。數共有幾排。", "一排有幾格？共有幾排？選能算出全部格數的公式，再填兩個邊長。", "先算出答案，再展開你的點數紀錄，比較兩個結果。", "面積要寫平方公分。檢查你的答案、單位和前面的計算是否一致。"], "triangle": ["面積是圖形裡面的大小。看一看能在裡面鋪多少個小方格。", "再拿一片一樣大的三角形，轉半圈拼合。比較原來一片和拼成的整個圖形。", "找圖下方加粗的底邊，讀出它的長度。", "找有直角記號的虛線。這條線和底成直角，它是高；斜線不是高。", "兩片拼成的面積是底乘高。這題只算原來的一片，想想還要做什麼。", "先算出答案，再把答案乘以二，和拼成圖形的底乘高比較。", "面積要寫平方公分。檢查你的答案、單位和前面的計算是否一致。"], "parallelogram": ["面積是圖形裡面的大小。看一看能在裡面鋪多少個小方格。", "沿著有直角記號的高剪開。移動小塊後，看看有沒有增加或拿走任何一塊。", "找圖下方加粗的底邊，讀出它的長度。", "找有直角記號的虛線。這條線和底成直角，它是高；斜線不是高。", "剪移後是長方形。用原來的底和垂直高列算式。", "先算出答案，再和剪移後長方形的長乘寬比較。", "面積要寫平方公分。檢查你的答案、單位和前面的計算是否一致。"]};
function normalizeLesson(value){const result=clone(value);if(!result.map)result.map=clone(lessonDefaults.map);result.activities={...clone(lessonDefaults.activities),...(result.activities||{})};for(const shape of shapeKeys){const section=result[shape];
if(section.hintVersion!==3){section.hints=section.hints.map((h,i)=>h===legacyHints[shape][i]||h===v2Hints[shape][i]?lessonDefaults[shape].hints[i]:h);section.hintVersion=3;}
const def=lessonDefaults[shape].settings,old=section.settings||{};const merged={...def,...old};
if(!Array.isArray(old.keep))merged.keep=[0,1,2,3];delete merged.breaks;section.settings=merged;}return result;}
async function lessonRow(env,kind){if(!env.DB)return null;return env.DB.prepare('SELECT config_json, revision FROM lesson_documents WHERE kind = ?').bind(kind).first();}
// 找不到這個工作區的教材時，依序退回：共用測試工作區 → 正式教材
async function publishedRow(env,ws){for(const k of [...new Set([lessonKind(ws,'published'),...(ws==='main'?[]:['test_published']),'published'])]){const row=await lessonRow(env,k);if(row)return row;}return null;}
async function lessonGet(request,env,who){if(who.role==='none')return json({error:'signin_required'},401);let row;try{row=await publishedRow(env,who.ws);}catch{return json({error:'lesson_storage_unavailable'},503);}let config=clone(lessonDefaults);if(row){try{const parsed=JSON.parse(row.config_json);if(validLesson(parsed))config=normalizeLesson(parsed);}catch{}}return json({config,revision:row?.revision||0});}
async function teacherGet(request,env,who){const role=who.role;if(role==='none')return json({error:'signin_required'},401);if(role==='student')return json({error:'forbidden'},403);let draft,published;try{[draft,published]=await Promise.all([lessonRow(env,lessonKind(who.ws,'draft')),publishedRow(env,who.ws)]);}catch{return json({error:'lesson_storage_unavailable'},503);}const parse=row=>{try{const value=JSON.parse(row.config_json);return validLesson(value)?normalizeLesson(value):null;}catch{return null;}};return json({draft:draft?parse(draft):null,published:published?parse(published):clone(lessonDefaults),draftRevision:draft?.revision||0,publishedRevision:published?.revision||0,testWorkspace:role==='test',workspace:who.ws});}
async function teacherSave(request,env,who){const role=who.role;if(role==='none')return json({error:'signin_required'},401);if(role==='student')return json({error:'forbidden'},403);if(!env.DB)return json({error:'lesson_storage_unavailable'},503);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);if(Number(request.headers.get('content-length')||0)>60000)return json({error:'too_large'},413);let body;try{body=await request.json();}catch{return json({error:'invalid_json'},400);}if(!body||!['draft','published'].includes(body.kind)||!validLesson(body.config,true))return json({error:'invalid_input'},400);const config=JSON.stringify(body.config);if(config.length>60000)return json({error:'too_large'},413);const kind=lessonKind(who.ws,body.kind);
try{const existing=await lessonRow(env,kind),revision=(existing?.revision||0)+1;await env.DB.prepare('INSERT INTO lesson_documents (kind,config_json,revision,updated_at) VALUES (?,?,?,?) ON CONFLICT(kind) DO UPDATE SET config_json=excluded.config_json,revision=excluded.revision,updated_at=excluded.updated_at').bind(kind,config,revision,new Date().toISOString()).run();return json({ok:true,revision});}catch{return json({error:'lesson_storage_unavailable'},503);}}
const publicAssets=new Set(['/portal.html','/portal.css','/portal.js','/shapes.css','/favicon.svg']);
const studentAssets=new Set(['/seven.html','/seven.js','/seven.css','/seven-geometry.js','/learning-flow.js','/lesson-content.js','/zhuyin.js','/hands-on.html','/hands-on.pdf','/step-demo.js','/step-demo.css','/seven-guide.html','/act-core.js','/act-unit12.js','/act-unit3.js','/act-unit45.js','/act.css','/buddy.js','/buddy.css','/research.js','/research.css']);
const teacherPages=new Set(['/teacher.html','/teacher.js','/teacher.css','/qrcode.js']);
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/test-login')return request.method==='POST'?testLogin(request,env):json({error:'method'},405);
if(url.pathname==='/api/test-logout'){if(request.method!=='POST')return json({error:'method'},405);const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'origin'},403);return jsonCookie({ok:true},200,sessionCookie('',0));}
if(url.pathname==='/api/class-login')return request.method==='POST'?classLogin(request,env):json({error:'method'},405);
const who=await whoAmI(request,env),role=who.role;
if(url.pathname==='/api/ai-support')return request.method==='POST'?ai(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/session')return request.method==='GET'?json({authenticated:role!=='none',teacher:role==='teacher'||role==='test',test:role==='test',student:role==='student',workspace:who.ws,className:who.label||'',aiProvider:role==='test'||role==='student'?'deepseek':null}):json({error:'method'},405);
if(url.pathname==='/api/lessons')return request.method==='GET'?lessonGet(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/teacher/classes')return request.method==='GET'?classList(request,env,who):request.method==='POST'?classCreate(request,env,who):json({error:'method'},405);
if(url.pathname.startsWith('/api/teacher/classes/'))return request.method==='DELETE'?classRevoke(request,env,who,url.pathname.slice(21)):json({error:'method'},405);
if(url.pathname==='/api/teacher/videos')return request.method==='POST'?videoUpload(request,env,who):json({error:'method'},405);
if(url.pathname.startsWith('/api/teacher/videos/'))return request.method==='DELETE'?videoDelete(request,env,who,url.pathname.slice(20)):json({error:'method'},405);
if(url.pathname.startsWith('/api/videos/'))return request.method==='GET'||request.method==='HEAD'?videoGet(request,env,role,url.pathname.slice(12)):json({error:'method'},405);
if(url.pathname==='/api/teacher/lessons')return request.method==='GET'?teacherGet(request,env,who):request.method==='POST'?teacherSave(request,env,who):json({error:'method'},405);
if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});let path=url.pathname;if(path==='/')path='/portal.html';else if(!path.includes('.'))path+='.html';if(!publicAssets.has(path)){if(role==='none')return path.endsWith('.html')?Response.redirect(url.origin+'/',302):new Response('Sign in required',{status:401});if(role==='student'&&!studentAssets.has(path))return path.endsWith('.html')?Response.redirect(url.origin+'/seven.html',302):new Response('Forbidden',{status:403});if(role==='test'&&!studentAssets.has(path)&&!teacherPages.has(path))return new Response('Forbidden',{status:403});}return asset(path);}};

// ---------- 第 18 版：教師上傳的示範影片（存在 D1，每段 1 MB） ----------
const VIDEO_CHUNK=1000000,VIDEO_MAX=30*1000*1000,videoId=/^v_[a-z0-9]{20}$/;
function videoKind(bytes){if(bytes.length>12&&bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70){const brand=String.fromCharCode(...bytes.slice(8,12));return brand==='qt  '?'video/quicktime':'video/mp4';}if(bytes.length>4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)return 'video/webm';return null;}
// 第 24 版：影片擁有者記到工作區（T01 不能刪 T02 的影片）；舊的共用測試影片仍屬於 'test'
const videoOwner=who=>who.role==='teacher'?'teacher':who.ws==='test'?'test':'test:'+who.ws;
async function videoUpload(request,env,who){const role=who.role;if(role==='none')return json({error:'signin_required'},401);if(role==='student')return json({error:'forbidden'},403);if(!env.DB)return json({error:'video_storage_unavailable'},503);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);
if(Number(request.headers.get('content-length')||0)>VIDEO_MAX)return json({error:'too_large'},413);
let bytes;try{bytes=new Uint8Array(await request.arrayBuffer());}catch{return json({error:'invalid_body'},400);}
if(!bytes.length)return json({error:'empty'},400);if(bytes.length>VIDEO_MAX)return json({error:'too_large'},413);
const mime=videoKind(bytes);if(!mime)return json({error:'unsupported_type'},415);
const id='v_'+[...crypto.getRandomValues(new Uint8Array(20))].map(b=>'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]).join('');
const chunks=Math.ceil(bytes.length/VIDEO_CHUNK),owner=videoOwner(who);
try{const statements=[];for(let i=0;i<chunks;i++)statements.push(env.DB.prepare('INSERT INTO lesson_video_chunks (video_id,idx,data) VALUES (?,?,?)').bind(id,i,bytes.slice(i*VIDEO_CHUNK,(i+1)*VIDEO_CHUNK)));
for(let i=0;i<statements.length;i+=10)await env.DB.batch(statements.slice(i,i+10));
await env.DB.prepare('INSERT INTO lesson_videos (id,owner,mime,size,chunks,created_at) VALUES (?,?,?,?,?,?)').bind(id,owner,mime,bytes.length,chunks,new Date().toISOString()).run();}
catch{try{await env.DB.prepare('DELETE FROM lesson_video_chunks WHERE video_id = ?').bind(id).run();}catch{}return json({error:'video_storage_unavailable'},503);}
return json({id,mime,size:bytes.length});}
async function videoDelete(request,env,who,id){const role=who.role;if(role==='none')return json({error:'signin_required'},401);if(role==='student')return json({error:'forbidden'},403);if(!videoId.test(id))return json({error:'not_found'},404);if(!env.DB)return json({error:'video_storage_unavailable'},503);const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);
const row=await env.DB.prepare('SELECT owner FROM lesson_videos WHERE id = ?').bind(id).first();if(!row)return json({error:'not_found'},404);if(row.owner!==videoOwner(who))return json({error:'forbidden'},403);
await env.DB.batch([env.DB.prepare('DELETE FROM lesson_video_chunks WHERE video_id = ?').bind(id),env.DB.prepare('DELETE FROM lesson_videos WHERE id = ?').bind(id)]);return json({ok:true});}
async function videoGet(request,env,role,id){if(role==='none')return new Response('Sign in required',{status:401});if(!videoId.test(id)||!env.DB)return new Response('Not found',{status:404});
const meta=await env.DB.prepare('SELECT mime, size, chunks FROM lesson_videos WHERE id = ?').bind(id).first();if(!meta)return new Response('Not found',{status:404});
const size=meta.size,head={'content-type':meta.mime,'accept-ranges':'bytes','x-content-type-options':'nosniff','cache-control':'private, max-age=3600'};
let start=0,end=size-1,partial=false;const range=request.headers.get('range');
if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range.trim());if(!m||(m[1]===''&&m[2]==='')||(m[1]!==''&&Number(m[1])>=size))return new Response(null,{status:416,headers:{'content-range':`bytes */${size}`}});
if(m[1]===''){start=Math.max(0,size-Number(m[2]));}else{start=Number(m[1]);if(m[2]!=='')end=Math.min(size-1,Number(m[2]));}partial=true;}
if(partial)end=Math.min(end,start+2*VIDEO_CHUNK-1);   // 分段要求時一次最多傳 2 MB，播放器會再要下一段
if(request.method==='HEAD')return new Response(null,{status:200,headers:{...head,'content-length':String(size)}});
const first=Math.floor(start/VIDEO_CHUNK),last=Math.floor(end/VIDEO_CHUNK);
const rows=(await env.DB.prepare('SELECT idx, data FROM lesson_video_chunks WHERE video_id = ? AND idx >= ? AND idx <= ? ORDER BY idx').bind(id,first,last).all()).results||[];
const parts=rows.map(r=>new Uint8Array(r.data));const joined=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){joined.set(p,o);o+=p.length;}
const body=joined.slice(start-first*VIDEO_CHUNK,end-first*VIDEO_CHUNK+1);
return new Response(body,{status:partial?206:200,headers:{...head,'content-length':String(body.length),...(partial?{'content-range':`bytes ${start}-${end}/${size}`}:{})}});}

// ---------- 第 24 版：班級代碼（學生不用密碼，掃 QR code 或輸入 6 個字就能進學生頁） ----------
const sameOrigin=request=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};
async function readJson(request,limit){if(Number(request.headers.get('content-length')||0)>limit)return null;try{return await request.json();}catch{return null;}}
const classView=r=>({code:r.code,label:r.label,expiresAt:r.expires_at});
const canManage=who=>who.role==='teacher'||who.role==='test';
const notManager=who=>json({error:who.role==='none'?'signin_required':'forbidden'},who.role==='none'?401:403);
async function classList(request,env,who){if(!canManage(who))return notManager(who);if(!env.DB)return json({error:'class_storage_unavailable'},503);
try{const {results}=await env.DB.prepare('SELECT code, label, expires_at FROM class_codes WHERE workspace = ? AND revoked = 0 AND expires_at > ? ORDER BY created_at DESC').bind(who.ws,Date.now()).all();return json({classes:results.map(classView),workspace:who.ws});}catch{return json({error:'class_storage_unavailable'},503);}}
async function classCreate(request,env,who){if(!canManage(who))return notManager(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB||!env.TEST_SESSION_SECRET)return json({error:'class_storage_unavailable'},503);
const body=await readJson(request,1024),label=typeof body?.label==='string'?body.label.trim():'';if(!/^[一-鿿0-9A-Za-z \-（）()]{1,20}$/.test(label)||![1,7,30].includes(body.days))return json({error:'invalid_input'},400);
const now=Date.now(),expiresAt=now+body.days*24*60*60*1000;try{const active=await env.DB.prepare('SELECT COUNT(*) AS n FROM class_codes WHERE workspace = ? AND revoked = 0 AND expires_at > ?').bind(who.ws,now).first();if((active?.n||0)>=20)return json({error:'too_many_classes'},409);
for(let i=0;i<8;i++){const code=[...crypto.getRandomValues(new Uint8Array(6))].map(b=>CODE_CHARS[b%CODE_CHARS.length]).join('');if(await classRow(env,code))continue;
await env.DB.prepare('INSERT INTO class_codes (code,workspace,label,created_at,expires_at,revoked) VALUES (?,?,?,?,?,0)').bind(code,who.ws,label,now,expiresAt).run();return json({class:{code,label,expiresAt}});}
return json({error:'class_storage_unavailable'},503);}catch{return json({error:'class_storage_unavailable'},503);}}
async function classRevoke(request,env,who,code){if(!canManage(who))return notManager(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!CLASS_CODE.test(code))return json({error:'not_found'},404);
const row=await classRow(env,code);if(!row||row.workspace!==who.ws)return json({error:'not_found'},404);try{await env.DB.prepare('UPDATE class_codes SET revoked = 1 WHERE code = ?').bind(code).run();return json({ok:true});}catch{return json({error:'class_storage_unavailable'},503);}}
// 學生登入：代碼有 31 的 6 次方種；同一個網路 15 分鐘內打錯 30 次才暫停（全班共用一個網路也不容易被鎖）
async function classLogin(request,env){if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB||!env.TEST_SESSION_SECRET)return json({error:'class_login_unavailable'},503);const body=await readJson(request,256),code=typeof body?.code==='string'?body.code.toUpperCase().replace(/[\s-]/g,''):'';if(!CLASS_CODE.test(code))return json({error:'invalid_code'},400);
const key='c:'+(await hmac(env.TEST_SESSION_SECRET,request.headers.get('cf-connecting-ip')||'unknown')).slice(0,46),now=Date.now();
try{const prior=await env.DB.prepare('SELECT failures, reset_at FROM test_login_attempts WHERE visitor_key = ?').bind(key).first();if(prior&&prior.reset_at>now&&prior.failures>=30)return json({error:'too_many_attempts'},429);
const row=await classRow(env,code);if(!row||row.revoked||row.expires_at<=now){// 用一句 SQL 累加，同時送很多次也不會少算
await env.DB.prepare('INSERT INTO test_login_attempts (visitor_key,failures,reset_at) VALUES (?,1,?) ON CONFLICT(visitor_key) DO UPDATE SET failures=CASE WHEN test_login_attempts.reset_at>? THEN test_login_attempts.failures+1 ELSE 1 END,reset_at=CASE WHEN test_login_attempts.reset_at>? THEN test_login_attempts.reset_at ELSE excluded.reset_at END').bind(key,now+15*60*1000,now,now).run();return json({error:'unknown_code'},401);}
const expires=Math.min(now+12*60*60*1000,row.expires_at),token=await signedToken(env,expires,'s',code);return jsonCookie({ok:true,className:row.label},200,sessionCookie(token,Math.max(60,Math.floor((expires-now)/1000))));}catch{return json({error:'class_login_unavailable'},503);}}

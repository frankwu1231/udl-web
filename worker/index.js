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
// 第 25 版：每個活動學生實際在做什麼、有哪些工具，AI 的提示不能跳出這些（例如 1-1 沒有三角形、1-2 不用尺量）
const actTools={compare:'看 A、B 兩個圖形裡的方格，一格一格數，格子多的面積比較大。圖上只有方格，沒有三角形，也不用尺量。',tile:'點長方形裡的空位，放 1 平方公分的小方塊，鋪滿後數一共用了幾塊；也可以按「鋪滿下一排」。不用尺量。',conserve:'把圖形剪開、移動、拼成新圖形，再數格子比較面積。',estimate:'數整格，再數半格，兩個半格算一格。',perimeter:'沿著圖形的邊，一格一格數邊有多長，四條邊加起來。',which:'讀情境，判斷是沿著邊走一圈，還是蓋滿裡面；看關鍵字：圍、繞、沿著是一圈，鋪滿、貼滿、刷滿是蓋滿。',samePerimeter:'用長加寬加長加寬算一圈，用長乘寬或數格子算面積，再比較 A 和 B。',inverse:'已經知道面積和一條邊，想幾乘幾會等於面積。',arrange:'用固定的格子數，排出不同形狀的長方形；轉過來的算同一種。',composite:'沿著虛線切成兩個長方形，每一塊長乘寬，再加起來。',squareMeter:'1 平方公尺是邊長 1 公尺的正方形，大約 4 張課桌併起來；小東西用平方公分，大地方用平方公尺。',trapezoid:'拿一片一樣的梯形，轉過來拼成平行四邊形；上底加下底當作底，乘高，再除以 2。',word:'讀題目，判斷要算面積還是周長，找出長和寬再計算。'};
const hintRe=/^[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef0-9A-Za-z +×÷=\-()（）、，。？！：；「」.]{1,60}$/;
const banned='公式、一致、依據、垂直、全等、周長、對應、驗證、策略、概念、檢核';
const concepts={rectangle:['辨認面積','逐格標記','每排格數','排數','長乘寬的意義','點數與計算對照','平方公分'],square:['辨認面積','逐格標記','邊長','相鄰等長邊','邊長乘邊長的意義','點數與計算對照','平方公分'],triangle:['辨認面積','兩片全等三角形拼合','底','與底垂直的高','兩片面積與一片面積','拼合結果與計算對照','平方公分'],parallelogram:['辨認面積','沿高剪移、面積不變','底','與底垂直的高','底乘高的意義','剪移後面積對照','平方公分']};
function validate(body){const act=body&&typeof body==='object'&&Object.hasOwn(actTitles,body.shape);if(act&&!(typeof body.stepTitle==='string'&&/^[\u4e00-\u9fff0-9A-Za-z ，、（）？]{1,16}$/.test(body.stepTitle)))return false;if(!body||typeof body!=='object'||Array.isArray(body)||!modes.has(body.kind)||!(shapes.has(body.shape)||act)||!whole(body.cycle,50)||!whole(body.step,act?7:6)||!methods.has(body.method)||!goals.has(body.goal)||!whole(body.hints,50)||!whole(body.errors,50)||typeof body.incorrect!=='boolean')return false;
if(Object.hasOwn(body,'operationComplete')&&typeof body.operationComplete!=='boolean'||Object.hasOwn(body,'comparisonOpened')&&typeof body.comparisonOpened!=='boolean')return false;
if(Object.hasOwn(body,'issue')&&!(act&&/^[a-z][A-Za-z0-9]{0,11}$/.test(body.issue))&&!['none','target','count','relation','base','first','line','height','second','formula','ab','total','verify','unit','final'].includes(body.issue))return false;
if(Object.hasOwn(body,'hintLevel')&&!whole(body.hintLevel,3))return false;
if(Object.hasOwn(body,'stepHints')&&!(Array.isArray(body.stepHints)&&body.stepHints.length<=3&&body.stepHints.every(h=>typeof h==='string'&&hintRe.test(h))))return false;
if(Object.hasOwn(body,'apiKey')&&!(typeof body.apiKey==='string'&&/^sk-[^\s]{20,400}$/.test(body.apiKey)))return false;
if(Object.hasOwn(body,'provider')&&!providers.has(body.provider))return false;
if(body.kind==='teacher'){return Array.isArray(body.steps)&&(act?body.steps.length>=1&&body.steps.length<=8:body.steps.length===7)&&body.steps.every(x=>whole(x,100))&&whole(body.backtracks,100)&&whole(body.completed,50)&&whole(body.helpRequests,100);}
return true;}
function instruction(data){const base='你是國小面積教材的繁體中文學習支持。對象可能閱讀較慢。只輸出一則短訊息，不用 Markdown。不能給出數值答案、代填算式、假稱已判斷學生錯因，或使用診斷標籤。保留學生思考與選擇。';
const act=Object.hasOwn(actTitles,data.shape),words=act&&perimeterActs.has(data.shape)?banned.replace('周長、',''):banned;
const own=Array.isArray(data.stepHints)&&data.stepHints.length?`這一步原本的提示：${data.stepHints.map((h,i)=>`（${i+1}）${h}`).join(' ')}。`:'';
const context=act?`活動=${actTitles[data.shape]}，學生在這個活動做的事：${actTools[data.shape]}${own}目前步驟=${data.step+1} ${data.stepTitle}，方法=${data.method}，學生已看到第${data.hintLevel||0}層提示（共3層），本題提示次數=${data.hints}，答錯次數=${data.errors}，剛剛答錯=${data.incorrect}，錯在=${data.issue&&data.issue!=='none'?'這一步的答案（代碼 '+data.issue+'）':'無'}。`:`圖形=${data.shape}，目前步驟=${data.step+1} ${stepNames[data.step]}，概念=${concepts[data.shape][data.step]}，方法=${data.method}，學生已看到第${data.hintLevel||0}層提示（共3層），本題提示次數=${data.hints}，答錯次數=${data.errors}，剛剛答錯=${data.incorrect}，錯在=${issueNames[data.issue||'none']||'無'}，操作已完成=${data.operationComplete===true}，比一比已打開=${data.comparisonOpened===true}。${own}`;
if(data.kind==='hint')return {system:base+`對象是國小三到五年級、可能有學習困難的學生。用國小中年級的口語，一句話，不超過25個字，只說一個動作，例如「看綠色的線，數它有幾格」。不要用這些詞：${words}。不要重複學生已看過的提示，要換一個說法或指出圖上要看的地方。提示要和「這一步原本的提示」做同一件事，只能用這個活動裡有的東西和動作，不可以叫學生用尺量、數三角形，或做活動裡沒有的事。針對「錯在」的地方提示。操作已完成時，不可叫學生繼續點格子或重新拼合。${act?'':'三角形是拿兩片一樣大的拼起來，高不是切開的線。'}不可說出數字答案，也不可直接說哪個選項對。`,user:context};
if(data.kind==='reflection')return {system:base+`對象是國小三到五年級、可能有學習困難的學生。問一個很簡單、具體的問題，不超過20個字，學生可以用「是／不是」、選一個或指一指圖來回答，例如「你是數格子找到答案的嗎？」「你看了圖上哪一條線？」。不要問抽象的感想，不要拐彎抹角。不要用這些詞：${words}。只問一件事，不替學生回答。`,user:context};
return {system:base+'面向教師，請用不超過180字整理：觀察事實、待教師確認的可能困難、下一次可觀察什麼。事實與推測須分清；統計只代表點擊與檢核，不代表學生已具備SRL能力。',user:context+`各步檢核未通過次數=${data.steps.join(',')}；返回修正=${data.backtracks}次；整題完成=${data.completed}輪；主動求助=${data.helpRequests}次。`};}
// 第 26 版：學生端與試用老師的 AI 也走統一紀錄（輸入、輸出、模型、提示詞版本）；設定 LOCAL_LLM_URL 就改用本地模型
const HINT_PROMPT_VERSION='hint-v25';
async function ai(request,env,who){const log={},started=Date.now(),res=await aiCore(request,env,who,log);
if(log.input&&env.DB){let text='',error='';try{const out=await res.clone().json();text=out.message||'';error=out.error||'';}catch{}await logAi(env,{task:'student-'+log.input.kind,workspace:who.ws,subject:'',provider:log.provider,model:log.model,promptVersion:HINT_PROMPT_VERSION,input:log.input,text,source:text?'ai':'fallback',error,ms:Date.now()-started});}
return res;}
async function aiCore(request,env,who,log){const role=who.role,server=role==='test'||role==='student';const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin'},403);if(role==='none')return json({error:'signin_required'},401);
const size=Number(request.headers.get('content-length')||0);if(size>4096)return json({error:'too_large'},413);
let body;try{body=await request.json();}catch{return json({error:'invalid_json'},400);}if(!validate(body))return json({error:'invalid_input'},400);if(body.kind==='teacher'&&role==='none')return json({error:'forbidden'},403);
if(body.kind==='teacher'&&role==='student')return json({error:'forbidden'},403);const selected=server?'deepseek':body.provider||'openai',apiKey=server?(env.LOCAL_LLM_URL?'local':env.TEST_DEEPSEEK_API_KEY):body.apiKey||(selected==='openai'?env.OPENAI_API_KEY:null);if(!apiKey)return json({error:selected==='deepseek'?'key_required':'ai_unavailable'},503);if(server&&!await useTestAiQuota(env,who.ws))return json({error:'test_ai_limit'},429);
const prompt=instruction(body),local=server&&!!env.LOCAL_LLM_URL,deepseek=selected==='deepseek'||local,model=local?env.LOCAL_LLM_MODEL||'local-model':deepseek?env.DEEPSEEK_MODEL||'deepseek-flash':env.OPENAI_MODEL||'gpt-5-mini';
if(server){const {apiKey:_k,...input}=body;Object.assign(log,{input,provider:local?'local':selected,model});}
// DeepSeek 用 OpenAI 相容的 Chat Completions（https://api-docs.deepseek.com）；OpenAI 用 Responses API
const requestBody=deepseek?{model,messages:[{role:'system',content:prompt.system+'只輸出 JSON 物件，格式為 {"message":"你的訊息"}。'},{role:'user',content:prompt.user}],response_format:{type:'json_object'},...(local?{}:{thinking:{type:'disabled'}}),max_tokens:body.kind==='teacher'?400:200,stream:false}:{model,max_output_tokens:body.kind==='teacher'?280:160,input:[{role:'system',content:prompt.system},{role:'user',content:prompt.user}],text:{format:{type:'json_schema',name:'teaching_support',strict:true,schema}},store:false};
let provider;try{provider=await fetch(local?env.LOCAL_LLM_URL:deepseek?'https://api.deepseek.com/chat/completions':'https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${local?env.LOCAL_LLM_KEY||'local':apiKey}`,'content-type':'application/json'},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(12000)});}catch{return json({error:'ai_timeout'},503);}
if(!provider.ok){let error;try{error=(await provider.json()).error;}catch{}return json({error:provider.status===401?'invalid_api_key':provider.status===402||error?.code==='credit_balance_exhausted'||error?.type==='insufficient_quota'?'credit_exhausted':'ai_provider_unavailable'},503);}
let result;try{result=await provider.json();}catch{return json({error:'ai_invalid_response'},503);}
const raw=deepseek?String(result.choices?.[0]?.message?.content||''):(result.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('');let parsed;try{parsed=JSON.parse(raw);}catch{return json({error:'ai_invalid_response'},503);}
const message=parsed?.message?.trim();if(!safeText(message,body.kind==='teacher'?200:body.kind==='hint'?40:50)||body.kind==='hint'&&/\d/.test(message))return json({error:'ai_invalid_response'},503);
return json({message,source:'ai',model,promptVersion:HINT_PROMPT_VERSION});}
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
for(const k of ['ai','reward','sound','grid','confidence','selfAsk','badges','voice','handsOn','zhuyin','contrast','convert','fading','buddy','buddyVoice','attention','tryFirst'])if(s[k]!==undefined&&typeof s[k]!=='boolean')return false;
if(s.buddyWait!==undefined&&![30,60,90].includes(s.buddyWait))return false;
if(s.attentionSec!==undefined&&![3,5,8].includes(s.attentionSec))return false;
if(s.mode!==undefined&&!['self','together','demo','probe'].includes(s.mode))return false;
if(s.goalKind!==undefined&&!['hints','firstTry'].includes(s.goalKind))return false;
// 第 23 版：目標詢問頻率、這次做幾題、自訂步驟名稱
if(s.srlAsk!==undefined&&!['first','every3','always','off'].includes(s.srlAsk))return false;
if(s.lessonGoal!==undefined&&![0,3,5,8,10].includes(s.lessonGoal))return false;
if(s.stepNames!==undefined&&!(s.stepNames&&typeof s.stepNames==='object'&&!Array.isArray(s.stepNames)&&Object.entries(s.stepNames).every(([k,v])=>/^[0-6]$/.test(k)&&typeof v==='string'&&v.trim().length<=12&&!/[<>&"'`]/.test(v))))return false;
if(s.textSize!==undefined&&!['normal','large','xlarge'].includes(s.textSize))return false;
if(s.rest!==undefined&&![0,2,3].includes(s.rest))return false;
if(s.video!==undefined&&!['off','hint','always'].includes(s.video))return false;
if(s.methods!==undefined&&!(Array.isArray(s.methods)&&s.methods.length>=1&&s.methods.length<=3&&s.methods.every(v=>['mark','row','self'].includes(v))&&new Set(s.methods).size===s.methods.length))return false;
return true;}
const contextKeys=['desk','tile','garden','flag','card','window','sandwich','paper'];
// 第 22 版：現場試用紀錄（Apps Script 網址、通行碼、教師與學生人數）
function validResearch(r){return !!r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).every(k=>['url','key','teachers','students','server'].includes(k))&&(r.server===undefined||typeof r.server==='boolean')&&(r.url===''||(typeof r.url==='string'&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/.test(r.url)))&&typeof r.key==='string'&&r.key.length<=40&&(r.key===''||r.key.length>=4)&&(r.teachers===undefined||(Number.isInteger(r.teachers)&&r.teachers>=1&&r.teachers<=12))&&(r.students===undefined||(Number.isInteger(r.students)&&r.students>=1&&r.students<=20));}
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
const studentAssets=new Set(['/tutor.js','/tutor.css','/probe.html','/probe.js','/probe.css','/seven.html','/seven.js','/seven.css','/seven-geometry.js','/learning-flow.js','/lesson-content.js','/zhuyin.js','/hands-on.html','/hands-on.pdf','/step-demo.js','/step-demo.css','/seven-guide.html','/act-core.js','/act-unit12.js','/act-unit3.js','/act-unit45.js','/act.css','/buddy.js','/buddy.css','/research.js','/research.css','/observations.js']);
const teacherPages=new Set(['/teacher.html','/teacher.js','/teacher.css','/qrcode.js','/observations.js','/scenario.html','/scenario.js','/study.css','/study-common.js']);
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/test-login')return request.method==='POST'?testLogin(request,env):json({error:'method'},405);
if(url.pathname==='/api/test-logout'){if(request.method!=='POST')return json({error:'method'},405);const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'origin'},403);return jsonCookie({ok:true},200,sessionCookie('',0));}
if(url.pathname==='/api/class-login')return request.method==='POST'?classLogin(request,env):json({error:'method'},405);
const who=await whoAmI(request,env),role=who.role;
if(url.pathname==='/api/ai-support')return request.method==='POST'?ai(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/session')return request.method==='GET'?json({authenticated:role!=='none',teacher:role==='teacher'||role==='test',test:role==='test',student:role==='student',workspace:who.ws,className:who.label||'',classCode:who.code||'',aiProvider:role==='test'||role==='student'?'deepseek':null}):json({error:'method'},405);
if(url.pathname==='/api/lessons')return request.method==='GET'?lessonGet(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/teacher/classes')return request.method==='GET'?classList(request,env,who):request.method==='POST'?classCreate(request,env,who):json({error:'method'},405);
if(url.pathname.startsWith('/api/teacher/classes/'))return request.method==='DELETE'?classRevoke(request,env,who,url.pathname.slice(21)):json({error:'method'},405);
if(url.pathname==='/api/teacher/videos')return request.method==='POST'?videoUpload(request,env,who):json({error:'method'},405);
if(url.pathname.startsWith('/api/teacher/videos/'))return request.method==='DELETE'?videoDelete(request,env,who,url.pathname.slice(20)):json({error:'method'},405);
if(url.pathname.startsWith('/api/videos/'))return request.method==='GET'||request.method==='HEAD'?videoGet(request,env,who,url.pathname.slice(12)):json({error:'method'},405);
if(url.pathname==='/api/records')return request.method==='POST'?recordsSave(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/sessions/start')return request.method==='POST'?sessionStart(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/student-settings')return request.method==='GET'?studentSettingsGet(request,env,who):request.method==='POST'?studentSettingsSave(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/teacher/summary')return request.method==='POST'?teacherSummary(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/me')return request.method==='GET'?studyMe(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/config')return request.method==='GET'||request.method==='POST'?studyConfig(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/phases')return request.method==='GET'||request.method==='POST'?studyPhases(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/direction')return request.method==='GET'?studyDirection(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/export')return request.method==='GET'?studyExport(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/scenarios')return request.method==='GET'||request.method==='POST'?studyScenarios(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/assignments')return request.method==='POST'?studyAssign(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/scenario'||url.pathname.startsWith('/api/scenario/'))return scenarioRoutes(request,env,who,url.pathname.slice(14));
if(url.pathname==='/api/probe/sets')return request.method==='GET'?probeSets(request,env,who):json({error:'method'},405);
if(url.pathname.startsWith('/api/probe/'))return probeRoutes(request,env,who,url.pathname.slice(11));
if(url.pathname==='/api/study/probe-sets')return request.method==='POST'?studyProbeSets(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/study/phase')return request.method==='GET'?studyPhaseOf(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/tutor/stage')return request.method==='GET'?tutorStage(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/tutor/line')return request.method==='POST'?tutorLine(request,env,who):json({error:'method'},405);
if(url.pathname==='/api/teacher/research')return request.method==='GET'?researchOverview(request,env,who):json({error:'method'},405);
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
// 第 25 版：影片只給同一個工作區看（學生看自己班級老師的影片）；正式教師可看全部；舊的共用測試影片 'test' 大家都能看
const videoReadable=(who,owner)=>who.role==='teacher'||owner==='test'||owner===(who.ws==='main'?'teacher':who.ws==='test'?'test':'test:'+who.ws);
async function videoGet(request,env,who,id){const role=who.role;if(role==='none')return new Response('Sign in required',{status:401});if(!videoId.test(id)||!env.DB)return new Response('Not found',{status:404});
const meta=await env.DB.prepare('SELECT owner, mime, size, chunks FROM lesson_videos WHERE id = ?').bind(id).first();if(!meta||!videoReadable(who,meta.owner))return new Response('Not found',{status:404});
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

// ---------- 第 26 版：研究紀錄存進網站資料庫（只存代號）、節次、學生個別設定與變更紀錄 ----------
// 存取都集中在這一段：之後改存研究團隊自己的伺服器，只要換掉這裡。
const STUDENT_CODE=/^T(0[1-9]|1[0-2])-S\d{2}$/,RID=/^[a-z0-9-]{6,40}$/;
const RESEARCH_SHEETS=new Set(['場次','操作紀錄','每題摘要','教師設定','教師觀察','學生回饋','教師回饋','技術問題','設定變更','教師操作']);
const RECORDS_PER_DAY=20000;
// 研究紀錄只收已知欄位（白名單）：學生自己打的文字、不認得的欄位都不存。teacher 寫的備註（note、evidence、fix）照收，姓名在前端已先遮蔽。
const RECORD_KEYS=new Set(('rid sheet time version sessionId teacher student sessionNo classCode phase activity actId cycle step stepTitle event mode studyPhase correct hintLevel action detail '+
'siteVersion shape shapeKey support response method flow difficulty tutorStage teacherId studentId '+
'aid answer attempt attentionReminds badges browser buddyAccepted buddyHelp buddyHelpText buddyOffers buddyReact buddyStuck buddyWrong by camFeel camFeelText cameraConsent carriedFrom cause changes checkGoal checked choice completed confidence corrected decision device different dimensions error errors evidence example fadeLevel fallback finding firstTry frame from fullExample fun funText goal goalKind goalMet group hasCamera helped hints idle index issue judgment kind learnerJudgment level levelText maxHintLevel message minutes model monitors mood moodText nextAction nextMethod nextStep note obs on online operation outcome page part presentation promptVersion provider reason result score screen seconds secs selfMet selfReportedCheck skipped source stage start steps streak stuckPressed studentMarked tag tagText teacherHelp text times to value watched where why wrong cue '+
'wroteWords engage timing buddyUseful camAccurate assists fix buddy buddyWait buddyVoice attention attentionSec zhuyin textSize contrast video ai fading selfAsk rest').split(' '));
// 巢狀物件（例如 dimensions、answer）也只收已知欄位；字串一律截短
const NESTED_KEYS=new Set('w h a b total unit divisor complete correct skipped field before after direction x y'.split(' '));
const LONG_TEXT=new Set(['message','note','evidence','fix','browser']);
function cleanRecordValue(v,depth,max){if(v===null||typeof v==='boolean')return v;if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v==='string')return v.slice(0,depth>1?60:max);if(depth>2)return null;
if(Array.isArray(v))return v.slice(0,40).map(x=>cleanRecordValue(x,depth+1,60));if(typeof v==='object'){const o={};for(const [k,x] of Object.entries(v).slice(0,40))if(NESTED_KEYS.has(k))o[k]=cleanRecordValue(x,depth+1,60);return o;}return null;}
function cleanRecordObject(obj,depth){const o={};for(const [k,v] of Object.entries(obj))if(RECORD_KEYS.has(k))o[k]=cleanRecordValue(v,depth,LONG_TEXT.has(k)?500:300);return o;}
function cleanRecordRow(r){const o=cleanRecordObject(r,1);if(typeof r.detail==='string'){let d=null;try{d=JSON.parse(r.detail);}catch{}o.detail=d&&typeof d==='object'&&!Array.isArray(d)?JSON.stringify(cleanRecordObject(d,1)):'';}else if(r.detail!==undefined)o.detail='';return o;}
const researchRole=who=>who.role==='student'||who.role==='test'||who.role==='teacher';
// 參與教師（T01～T12）與他班級的學生裝置，只能碰自己的學生（代號開頭是自己的教師代號）；主持人與測試工作區不限
const ownsStudent=(who,student)=>!TEACHER_CODE.test(who.ws)||String(student).startsWith(who.ws+'-');
const notYours=()=>json({error:'not_your_student'},403);
const noResearch=who=>json({error:who.role==='none'?'signin_required':'forbidden'},who.role==='none'?401:403);
async function recordQuota(env,ws,n){const day=new Date().toISOString().slice(0,10),scope='rec:'+ws;const row=await env.DB.prepare('INSERT INTO ai_usage (day,scope,calls) VALUES (?,?,?) ON CONFLICT(day,scope) DO UPDATE SET calls=calls+excluded.calls WHERE calls+excluded.calls<=? RETURNING calls').bind(day,scope,n,RECORDS_PER_DAY).first();return !!row;}
async function recordsSave(request,env,who){if(!researchRole(who))return noResearch(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const body=await readJson(request,64000);if(!body||!Array.isArray(body.rows)||!body.rows.length||body.rows.length>40)return json({error:'invalid_input'},400);
const rows=[];for(const r of body.rows){if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.rid!=='string'||!RID.test(r.rid)||!RESEARCH_SHEETS.has(r.sheet)||typeof r.time!=='string'||r.time.length>30)return json({error:'invalid_input'},400);
const student=r.student===''||r.student===undefined?'':r.student;if(student!==''&&!(typeof student==='string'&&STUDENT_CODE.test(student)))return json({error:'invalid_input'},400);if(student!==''&&!ownsStudent(who,student))return notYours();
const no=r.sessionNo===undefined||r.sessionNo===null||r.sessionNo===''?null:r.sessionNo;if(no!==null&&!whole(no,9999))return json({error:'invalid_input'},400);
const data=JSON.stringify(cleanRecordRow(r));if(data.length>6000)return json({error:'too_large'},413);rows.push([r.rid,student,no,r.sheet,r.time,data]);}
try{if(!await recordQuota(env,who.ws,rows.length))return json({error:'record_limit'},429);const now=Date.now();
await env.DB.batch(rows.map(([rid,student,no,sheet,time,data])=>env.DB.prepare('INSERT OR IGNORE INTO research_events (rid,workspace,student,session_no,sheet,time,data_json,received_at) VALUES (?,?,?,?,?,?,?,?)').bind(rid,who.ws,student,no,sheet,time,data,now)));
return json({ok:true,saved:rows.map(r=>r[0])});}catch{return json({error:'research_storage_unavailable'},503);}}
// 「開始本節」：同一位學生的節次往上加 1（換裝置也接著算）
async function sessionStart(request,env,who){if(!researchRole(who))return noResearch(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const body=await readJson(request,512),student=body?.student,device=typeof body?.device==='string'?body.device.slice(0,10):'';if(typeof student!=='string'||!STUDENT_CODE.test(student))return json({error:'invalid_input'},400);if(!ownsStudent(who,student))return notYours();
try{for(let i=0;i<5;i++){const last=await env.DB.prepare('SELECT MAX(no) AS n FROM research_sessions WHERE workspace = ? AND student = ?').bind(who.ws,student).first(),no=(last?.n||0)+1;
try{await env.DB.prepare('INSERT INTO research_sessions (workspace,student,no,started_at,class_code,device) VALUES (?,?,?,?,?,?)').bind(who.ws,student,no,Date.now(),who.code||'',device).run();return json({no});}catch{/* 兩台同時開始：再試下一號 */}}
return json({error:'research_storage_unavailable'},503);}catch{return json({error:'research_storage_unavailable'},503);}}

// 學生個別設定：只存「和班級設定不同」的欄位。欄位與方向依計畫書的歸類表。
const OVERRIDE_KEYS=['support','mode','methods','video','tryFirst','lessonGoal','flow'];
const REASONS=new Set(['lowAccuracy','manyHints','accurateButHints','independent','engagement','taskLoad','other']);
const DECISIONS=new Set(['change','keep','advance','back']);
// 班級沒設定時的預設值（tryFirst、lessonGoal 在教材預設裡沒有，補上，方向歸類才算得出來）
const settingBase=()=>({tryFirst:false,lessonGoal:0,...lessonDefaults.rectangle.settings});
function validOverride(o){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!OVERRIDE_KEYS.includes(k)))return false;return validSettings({...lessonDefaults.rectangle.settings,...o});}
const supportLevel={support:v=>({faded:0,full:1})[v],mode:v=>({self:0,together:1,demo:2})[v],video:v=>({off:0,hint:1,always:2})[v],tryFirst:v=>v===true?0:v===false?1:undefined,methods:v=>Array.isArray(v)?(v.includes('mark')?1:0)+(v.includes('row')?1:0):undefined};
// 回傳 [方向, 幾級]：increase 增加支持、decrease 減少支持、load 任務負荷、other 其他
function changeDirection(field,before,after){if(field==='lessonGoal'||field==='flow')return ['load',0];const f=supportLevel[field];if(!f)return ['other',0];const a=f(before),b=f(after);if(a===undefined||b===undefined)return ['other',0];return b>a?['increase',b-a]:b<a?['decrease',a-b]:['other',0];}
async function overridesFor(env,ws,student){const {results}=await env.DB.prepare('SELECT act, settings_json FROM student_settings WHERE workspace = ? AND student = ?').bind(ws,student).all();const out={};for(const r of results){try{out[r.act]=JSON.parse(r.settings_json);}catch{}}return out;}
async function studentSettingsGet(request,env,who){if(!researchRole(who))return noResearch(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);const student=new URL(request.url).searchParams.get('student')||'';if(!STUDENT_CODE.test(student))return json({error:'invalid_input'},400);if(!ownsStudent(who,student))return notYours();
try{return json({student,overrides:await overridesFor(env,who.ws,student)});}catch{return json({error:'research_storage_unavailable'},503);}}
// 老師在學生的平板上調整（學生頁的「教師觀察」），或在教師備課頁調整；每次都要選主要理由
async function studentSettingsSave(request,env,who){if(!researchRole(who))return noResearch(who);if(who.role==='student')return json({error:'teacher_required'},403);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const b=await readJson(request,4096);if(!b||typeof b.student!=='string'||!STUDENT_CODE.test(b.student)||!ACT_IDS.includes(b.act)||!DECISIONS.has(b.decision||'change')||!REASONS.has(b.reason))return json({error:'invalid_input'},400);if(!ownsStudent(who,b.student))return notYours();
const decision=b.decision||'change',note=typeof b.note==='string'?b.note.trim().slice(0,60):'',no=b.sessionNo===undefined||b.sessionNo===null?null:b.sessionNo;if(no!==null&&!whole(no,9999))return json({error:'invalid_input'},400);
if(decision==='change'&&!validOverride(b.changes))return json({error:'invalid_input'},400);if((decision==='advance'||decision==='back')&&!ACT_IDS.includes(b.to))return json({error:'invalid_input'},400);
try{const all=await overridesFor(env,who.ws,b.student),current={...(all[b.act]||{})},base=settingBase(),rows=[];
const cls=b.classSettings&&typeof b.classSettings==='object'&&!Array.isArray(b.classSettings)?Object.fromEntries(Object.entries(b.classSettings).filter(([k])=>OVERRIDE_KEYS.includes(k))):{},classOk=validOverride(cls)?cls:{};const before=k=>Object.hasOwn(current,k)?current[k]:Object.hasOwn(classOk,k)?classOk[k]:base[k];
if(decision==='change'){let down=0;for(const [k,v] of Object.entries(b.changes)){const was=before(k);if(JSON.stringify(was)===JSON.stringify(v))continue;const [direction,steps]=changeDirection(k,was,v);if(direction==='decrease')down+=steps;rows.push([k,JSON.stringify(was??null),JSON.stringify(v),direction]);current[k]=v;}
if(down>1)return json({error:'one_step_only'},400);if(!rows.length)return json({error:'no_change'},400);}
else rows.push(['_decision','',decision==='keep'?'':JSON.stringify(b.to),decision==='keep'?'maintain':decision==='advance'?'advance':'load']);
const now=Date.now(),actor=who.role==='student'?'student-device':who.ws,st=[];
if(decision==='change')st.push(env.DB.prepare('INSERT INTO student_settings (workspace,student,act,settings_json,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(workspace,student,act) DO UPDATE SET settings_json=excluded.settings_json,updated_at=excluded.updated_at').bind(who.ws,b.student,b.act,JSON.stringify(current),now));
for(const [field,was,next,direction] of rows)st.push(env.DB.prepare('INSERT INTO setting_changes (workspace,student,act,session_no,field,before_value,after_value,direction,reason,note,actor,at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(who.ws,b.student,b.act,no,field,was,next,direction,b.reason,note,actor,now));
await env.DB.batch(st);return json({ok:true,settings:current,changes:rows.map(([field,was,next,direction])=>({field,before:was,after:next,direction}))});}catch{return json({error:'research_storage_unavailable'},503);}}
// 教師端：看這個工作區每位學生的節次、紀錄筆數、設定變更；也可以下載一位學生的全部紀錄
async function researchOverview(request,env,who){if(!canManage(who))return notManager(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);const q=new URL(request.url).searchParams,student=q.get('student');
try{if(student){if(!STUDENT_CODE.test(student))return json({error:'invalid_input'},400);const {results}=await env.DB.prepare('SELECT data_json FROM research_events WHERE workspace = ? AND student = ? ORDER BY time, rid LIMIT 20000').bind(who.ws,student).all();return json({student,events:results.map(r=>{try{return JSON.parse(r.data_json);}catch{return null;}}).filter(Boolean)});}
const ev=(await env.DB.prepare('SELECT student, COUNT(*) AS events, MAX(time) AS last FROM research_events WHERE workspace = ? AND student != ? GROUP BY student').bind(who.ws,'').all()).results;
const ss=(await env.DB.prepare('SELECT student, MAX(no) AS sessions FROM research_sessions WHERE workspace = ? GROUP BY student').bind(who.ws).all()).results;
const changes=(await env.DB.prepare('SELECT student, act, session_no AS sessionNo, field, before_value AS before, after_value AS after, direction, reason, note, actor, at FROM setting_changes WHERE workspace = ? ORDER BY at DESC, id DESC LIMIT 500').bind(who.ws).all()).results;
const map=new Map();for(const r of ev)map.set(r.student,{student:r.student,events:r.events,last:r.last,sessions:0});for(const r of ss){const x=map.get(r.student)||{student:r.student,events:0,last:'',sessions:0};x.sessions=r.sessions;map.set(r.student,x);}
return json({students:[...map.values()].sort((a,b)=>a.student.localeCompare(b.student)),changes});}catch{return json({error:'research_storage_unavailable'},503);}}

// ---------- 第 26 版第二階段：研究管理、應有方向、AI 統一出入口、跨節 AI 摘要、標準化紀錄情境 ----------
// 研究人員＝主持人帳號（工作區 main）；參與教師＝教師代號登入（T01～T12）。
const OBS_LABELS=__OBS_LABELS__;
const isResearcher=who=>who.role==='teacher';
const notResearcher=who=>json({error:who.role==='none'?'signin_required':'forbidden'},who.role==='none'?401:403);
const PHASES={teacher:['baseline','intervention','followup'],student:['A','B','BC','maintain']};
// 判準依計畫書；正式實驗前依前導資料校準，所以都可以在研究管理頁改
const DEFAULT_RULES={lowAcc:60,highAcc:80,indep:80,minItems:5,upN:3,downN:2,maintainN:3,summaryChars:300,stageUp:80,stageDown:50,stageN:2,handsOnN:5,teacherWait:10,tutorChars:25,showAdvice:1};
const RULE_LIMITS={lowAcc:[0,100],highAcc:[0,100],indep:[0,100],minItems:[1,20],upN:[1,10],downN:[1,10],maintainN:[1,10],summaryChars:[100,600],stageUp:[0,100],stageDown:[0,100],stageN:[1,10],handsOnN:[1,20],teacherWait:[3,60],tutorChars:[10,40],showAdvice:[0,1]};
async function studyRules(env){try{const row=await env.DB.prepare('SELECT value_json FROM study_config WHERE key = ?').bind('rules').first();const v=row?JSON.parse(row.value_json):{};return {...DEFAULT_RULES,...v};}catch{return {...DEFAULT_RULES};}}
async function currentPhase(env,kind,participant){try{const row=await env.DB.prepare('SELECT phase, at FROM participant_phases WHERE kind = ? AND participant = ? ORDER BY at DESC, id DESC LIMIT 1').bind(kind,participant).first();return row?row.phase:'';}catch{return '';}}
// AI 摘要的開關依教師個別的研究階段：基線期關、介入期與追蹤期開；還沒設定階段時開著（非研究使用）
const summaryAllowed=phase=>phase!=='baseline';

// ---------- 指標與應有方向（同一份程式給真實學生與標準化情境用） ----------
function rowDetail(r){if(r&&typeof r.detail==='string'){try{const d=JSON.parse(r.detail);return d&&typeof d==='object'?d:{};}catch{return {};}}return r&&r.detail&&typeof r.detail==='object'?r.detail:{};}
const opRows=(rows,act)=>rows.filter(r=>r&&r.sheet==='操作紀錄'&&(!act||r.actId===act)&&r.mode!=='demo'&&r.mode!=='probe');
// 支持下答對率：沒用到第 3 層提示就完成的題數 ÷ 完成題數；無提示步驟比例：第一次嘗試、沒看提示就通過的步驟 ÷ 可評分步驟
function sessionMetrics(rows,act){const ops=opRows(rows,act),done=ops.filter(r=>r.event==='整題完成');
const supported=done.filter(r=>{const m=Number(rowDetail(r).maxHintLevel);return Number.isFinite(m)?m<3:true;}).length;
const first=new Map();for(const r of ops)if(r.event==='步驟檢核'){const k=r.cycle+'|'+r.step;if(!first.has(k))first.set(k,r);}
const steps=first.size,indep=[...first.values()].filter(r=>(r.correct==='是'||r.correct===true)&&rowDetail(r).firstTry===true).length;
return {items:done.length,supported,acc:done.length?Math.round(supported/done.length*100):null,steps,indep,indepRate:steps?Math.round(indep/steps*100):null};}
// sessions：[{no, items, acc, indepRate}]，依節次排好；windowStart：支持設定變更後的第一節
function expectedDirection(sessions,rules,windowStart=1){const valid=sessions.filter(s=>s.no>=windowStart&&s.items>=rules.minItems),last=n=>valid.length>=n?valid.slice(-n):null;
const up=last(rules.upN);if(up&&up.every(s=>s.acc<rules.lowAcc))return 'increase';
const two=last(rules.downN);if(two&&two.every(s=>s.acc>=rules.highAcc)){if(two.every(s=>s.indepRate>=rules.indep))return 'advance';if(two.every(s=>s.indepRate<rules.indep))return 'decrease';}
return valid.length>=rules.maintainN?'maintain':'insufficient';}
// 老師的一次決策歸成一個方向（計分用）
function decisionDirection(decision,changes,before){if(decision==='keep')return ['maintain',0];if(decision==='advance')return ['advance',0];if(decision==='back')return ['load',0];
const dirs=new Set();let down=0;for(const [k,v] of Object.entries(changes||{})){if(JSON.stringify(before[k])===JSON.stringify(v))continue;const [d,n]=changeDirection(k,before[k],v);dirs.add(d);if(d==='decrease')down+=n;}
const dir=dirs.has('increase')&&dirs.has('decrease')?'mixed':dirs.has('increase')?'increase':dirs.has('decrease')?'decrease':dirs.has('load')?'load':dirs.size?'other':'';return [dir,down];}

// ---------- 跨節摘要的內容：由程式算好，AI 只負責把它寫成句子 ----------
const HINT_EVENTS={'請求提示':r=>'第'+(r.hintLevel||'?')+'層提示','自動提示':r=>'第'+(r.hintLevel||'?')+'層提示','請求AI提示':()=>'AI提示','我卡住了':()=>'我卡住了','看示範影片':()=>'示範影片','看示範':()=>'看示範'};
function summaryFacts(sessions,act){return sessions.map(({no,rows})=>{const m=sessionMetrics(rows,act),ops=opRows(rows,act),errors={},hints={},orders=new Map();
for(const r of ops){if(r.event==='步驟檢核'&&(r.correct==='否'||r.correct===false)){const code=rowDetail(r).obs||'other',label=OBS_LABELS[code]||OBS_LABELS.other;errors[label]=(errors[label]||0)+1;}
const h=HINT_EVENTS[r.event];if(h){const t=h(r);hints[t]=(hints[t]||0)+1;const q=orders.get(r.cycle)||[];if(q.at(-1)!==t)q.push(t);orders.set(r.cycle,q);}}
const seq=new Map();for(const q of orders.values()){const k=q.join('→');seq.set(k,(seq.get(k)||0)+1);}const order=[...seq.entries()].sort((a,b)=>b[1]-a[1])[0];
return {session:no,completed:m.items,supportedRate:m.acc,independentStepRate:m.indepRate,hints,hintOrder:order?order[0]:'',hintOrderQuestions:order?order[1]:0,errors};});}
function summaryFallback(facts){return facts.map(f=>{const err=Object.entries(f.errors).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v} 次`).join('、')||'沒有答錯的步驟';const hint=Object.entries(f.hints).map(([k,v])=>`${k} ${v} 次`).join('、')||'沒有用提示';
return `第${f.session}節：完成 ${f.completed} 題，支持下答對率 ${f.supportedRate??'—'}%，無提示步驟比例 ${f.independentStepRate??'—'}%。提示：${hint}${f.hintOrder?`（常見順序：${f.hintOrder}）`:''}。答錯情形：${err}。`;}).join('\n');}
const SUMMARY_PROMPT_VERSION='summary-v26.1';
const SUMMARY_FORBIDDEN=/增加支持|減少支持|進階|建議|應該|可以考慮|下一步|調整|退回|迷思|障礙|診斷/;
function summaryPrompt(facts,limit){return {system:`你為特教老師整理學生的面積學習紀錄。只根據給你的 JSON 寫摘要，不可加入 JSON 沒有的事，不可推測原因。用繁體中文，不用 Markdown。依節次寫，每節一行，開頭寫「第N節：」，說明完成題數、支持下答對率、無提示步驟比例、提示使用與常見順序、答錯情形（照 JSON 的文字，例如「答案剛好等於周長的數」）。最後一行以「依據：第…節」列出用到的節次。不提出任何調整方向或建議，不說要增加或減少支持、進階或退回，不用診斷用語。全部不超過${limit}字。只輸出 JSON 物件 {"message":"摘要"}。`,user:JSON.stringify(facts)};}
// 摘要裡的每個數字都要在輸入裡找得到（防止 AI 自己編數字）
function summaryCheck(text,facts,limit){if(!text||text.length>limit)return 'too_long';if(SUMMARY_FORBIDDEN.test(text))return 'advice';const allowed=new Set(JSON.stringify(facts).match(/\d+/g)||[]);for(const n of text.match(/\d+/g)||[])if(!allowed.has(n))return 'number_not_in_input';
for(const f of facts)if(!text.includes('第'+f.session+'節'))return 'missing_session';return '';}

// ---------- AI 統一出入口：模型可抽換（現在 DeepSeek；設定 LOCAL_LLM_URL 就改用本地模型），每次都留紀錄 ----------
function modelConfig(env){if(env.LOCAL_LLM_URL)return {provider:'local',url:env.LOCAL_LLM_URL,key:env.LOCAL_LLM_KEY||'',model:env.LOCAL_LLM_MODEL||'local-model'};
if(env.TEST_DEEPSEEK_API_KEY)return {provider:'deepseek',url:'https://api.deepseek.com/chat/completions',key:env.TEST_DEEPSEEK_API_KEY,model:env.DEEPSEEK_MODEL||'deepseek-flash'};return null;}
// 兩種都用 OpenAI 相容的 Chat Completions 格式（DeepSeek 文件：https://api-docs.deepseek.com；本地常見的 vLLM、Ollama 也支援）
async function chatMessage(m,system,user,maxTokens){const body={model:m.model,messages:[{role:'system',content:system},{role:'user',content:user}],response_format:{type:'json_object'},max_tokens:maxTokens,stream:false};if(m.provider==='deepseek')body.thinking={type:'disabled'};
let res;try{res=await fetch(m.url,{method:'POST',headers:{...(m.key?{authorization:`Bearer ${m.key}`}:{}),'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});}catch{throw new Error('ai_timeout');}
if(!res.ok)throw new Error('ai_provider_unavailable');let out;try{out=await res.json();}catch{throw new Error('ai_invalid_response');}
let parsed;try{parsed=JSON.parse(String(out.choices?.[0]?.message?.content||''));}catch{throw new Error('ai_invalid_response');}const msg=parsed?.message;if(typeof msg!=='string')throw new Error('ai_invalid_response');return msg.trim();}
async function logAi(env,row){try{const r=await env.DB.prepare('INSERT INTO ai_outputs (task,workspace,subject,provider,model,prompt_version,input_json,output_text,source,error,ms,at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(row.task,row.workspace,row.subject||'',row.provider||'',row.model||'',row.promptVersion,JSON.stringify(row.input).slice(0,20000),row.text,row.source,row.error||'',row.ms||0,Date.now()).first();return r?.id??null;}catch{return null;}}
// check(text) 回傳空字串表示合格；不合格、逾時、沒有額度時改用 fallback（固定內容），並記下原因
async function aiGateway(env,{task,ws,subject,input,promptVersion,system,user,maxTokens,check,fallback,quota=true}){const m=modelConfig(env),started=Date.now();let text='',source='fallback',error='';
if(!m)error='ai_unavailable';else if(quota&&!await useTestAiQuota(env,'gw:'+ws))error='ai_limit';else{try{const t=await chatMessage(m,system,user,maxTokens);const bad=check(t);if(bad)error='rejected:'+bad;else{text=t;source='ai';}}catch(e){error=e.message||'ai_error';}}
if(source!=='ai')text=fallback;const ms=Date.now()-started,id=await logAi(env,{task,workspace:ws,subject,provider:m?.provider,model:m?.model,promptVersion,input,text,source,error,ms});
return {id,text,source,error,model:m?.model||'',provider:m?.provider||'',promptVersion,ms};}
async function summarize(env,ws,subject,sessions,act){const rules=await studyRules(env),facts=summaryFacts(sessions,act),limit=rules.summaryChars,p=summaryPrompt(facts,limit);
return {facts,...await aiGateway(env,{task:'summary',ws,subject,input:facts,promptVersion:SUMMARY_PROMPT_VERSION,system:p.system,user:p.user,maxTokens:900,check:t=>summaryCheck(t,facts,limit),fallback:summaryFallback(facts)})};}
async function eventsBySession(env,ws,student,upTo){const {results}=await env.DB.prepare('SELECT session_no AS no, data_json FROM research_events WHERE workspace = ? AND student = ? AND session_no IS NOT NULL AND session_no <= ? ORDER BY session_no, time, rid').bind(ws,student,upTo).all();
const map=new Map();for(const r of results){let d;try{d=JSON.parse(r.data_json);}catch{continue;}if(!map.has(r.no))map.set(r.no,[]);map.get(r.no).push(d);}return [...map.entries()].map(([no,rows])=>({no,rows}));}

// 教師端：真實學生的跨節摘要（只讀到老師指定、已經看到的節次）
async function teacherSummary(request,env,who){if(!canManage(who))return notManager(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const b=await readJson(request,1024);if(!b||typeof b.student!=='string'||!STUDENT_CODE.test(b.student)||!ACT_IDS.includes(b.act)||!whole(b.upTo,9999)||b.upTo<1)return json({error:'invalid_input'},400);
const phase=who.role==='test'&&TEACHER_CODE.test(who.ws)?await currentPhase(env,'teacher',who.ws):'';if(!summaryAllowed(phase))return json({error:'summary_off',phase},403);
if(await currentPhase(env,'student',b.student))return json({error:'summary_off',phase:'year3'},403);   // 第三年四個階段都關閉教師端 AI 摘要
try{const sessions=(await eventsBySession(env,who.ws,b.student,b.upTo)).slice(-7);if(!sessions.length)return json({error:'no_records'},404);const out=await summarize(env,who.ws,b.student+'|'+b.act,sessions,b.act);
return json({text:out.text,source:out.source,model:out.model,promptVersion:out.promptVersion,sessions:sessions.map(s=>s.no),facts:out.facts,id:out.id});}catch{return json({error:'research_storage_unavailable'},503);}}
// 教師自己的研究階段（決定 AI 摘要有沒有開）
async function studyMe(request,env,who){if(!canManage(who))return notManager(who);const phase=who.role==='test'&&TEACHER_CODE.test(who.ws)&&env.DB?await currentPhase(env,'teacher',who.ws):'';return json({teacher:who.role==='test'?who.ws:'',phase,summary:summaryAllowed(phase)});}

// ---------- 研究人員：判準設定、研究階段、應有方向 ----------
async function studyConfig(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
if(request.method==='GET')return json({rules:await studyRules(env),defaults:DEFAULT_RULES});if(!sameOrigin(request))return json({error:'origin'},403);
const b=await readJson(request,1024),r=b?.rules;if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!RULE_LIMITS[k])||Object.entries(r).some(([k,v])=>!Number.isInteger(v)||v<RULE_LIMITS[k][0]||v>RULE_LIMITS[k][1]))return json({error:'invalid_input'},400);
const rules={...(await studyRules(env)),...r};if(rules.lowAcc>=rules.highAcc||rules.stageDown>=rules.stageUp)return json({error:'invalid_input'},400);
await env.DB.prepare('INSERT INTO study_config (key,value_json,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').bind('rules',JSON.stringify(rules),Date.now()).run();return json({ok:true,rules});}
async function studyPhases(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
if(request.method==='GET'){const {results}=await env.DB.prepare('SELECT kind, participant, phase, actor, at FROM participant_phases ORDER BY at, id').all();const current={};for(const r of results)current[r.kind+'|'+r.participant]=r.phase;
return json({phases:PHASES,current:Object.entries(current).map(([k,phase])=>{const [kind,participant]=k.split('|');return {kind,participant,phase};}),history:results});}
if(!sameOrigin(request))return json({error:'origin'},403);const b=await readJson(request,512);if(!b||!PHASES[b.kind]||!PHASES[b.kind].includes(b.phase)||typeof b.participant!=='string'||!(b.kind==='teacher'?TEACHER_CODE:STUDENT_CODE).test(b.participant))return json({error:'invalid_input'},400);
await env.DB.prepare('INSERT INTO participant_phases (kind,participant,phase,actor,at) VALUES (?,?,?,?,?)').bind(b.kind,b.participant,b.phase,who.ws,Date.now()).run();return json({ok:true});}
// 真實學生每一節的指標、應有方向（研究計分用，教師端看不到），以及老師在那一節的實際決策
async function studyDirection(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const q=new URL(request.url).searchParams,student=q.get('student')||'',act=q.get('act')||'';if(!STUDENT_CODE.test(student)||!ACT_IDS.includes(act))return json({error:'invalid_input'},400);
try{// 這位學生的紀錄存在哪個工作區：可以指定；沒指定時先找教師代號那一區，再找有紀錄的其他區（例如主持人 main）
const {results:wsRows}=await env.DB.prepare('SELECT workspace, COUNT(*) AS n FROM research_events WHERE student = ? GROUP BY workspace ORDER BY n DESC').bind(student).all(),workspaces=wsRows.map(r=>r.workspace),asked=q.get('ws')||'',prefix=student.slice(0,3);
const ws=workspaces.includes(asked)?asked:workspaces.includes(prefix)?prefix:workspaces[0]||prefix;
const rules=await studyRules(env),sessions=(await eventsBySession(env,ws,student,9999)).map(s=>({no:s.no,...sessionMetrics(s.rows,act)})).filter(s=>s.items||s.steps);
const {results:changes}=await env.DB.prepare('SELECT session_no AS sessionNo, field, before_value AS before, after_value AS after, direction, reason, at FROM setting_changes WHERE workspace = ? AND student = ? AND act = ? ORDER BY at, id').bind(ws,student,act).all();
const resets=changes.filter(c=>['increase','decrease','load','advance'].includes(c.direction)&&c.sessionNo!==null);
const timeline=sessions.map((s,i)=>{const start=Math.max(1,...resets.filter(c=>c.sessionNo<s.no).map(c=>c.sessionNo+1));const expected=expectedDirection(sessions.slice(0,i+1),rules,start);
const made=[...new Set(changes.filter(c=>c.sessionNo===s.no).map(c=>c.direction))];return {...s,windowStart:start,expected,decisions:made};});
return json({student,act,workspace:ws,workspaces,rules,timeline});}catch{return json({error:'research_storage_unavailable'},503);}}
// 研究匯出：AI 輸出（核對一致率用）、設定變更（所有工作區）
async function studyExport(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);const type=new URL(request.url).searchParams.get('type');
try{if(type==='ai'){const {results}=await env.DB.prepare('SELECT id, task, workspace, subject, provider, model, prompt_version AS promptVersion, input_json AS input, output_text AS text, source, error, ms, at FROM ai_outputs ORDER BY id DESC LIMIT 5000').all();return json({rows:results});}
if(type==='changes'){const {results}=await env.DB.prepare('SELECT workspace, student, act, session_no AS sessionNo, field, before_value AS before, after_value AS after, direction, reason, note, actor, at FROM setting_changes ORDER BY at, id LIMIT 20000').all();return json({rows:results});}
if(type==='tutor')return json({rows:await tutorExport(env)});
// 研究紀錄依代號、階段、節次篩選匯出（所有工作區）
if(type==='events'){const q=new URL(request.url).searchParams,student=q.get('student')||'',phase=q.get('phase')||'',from=Number(q.get('from')||1),to=Number(q.get('to')||9999);if(student&&!STUDENT_CODE.test(student)||phase&&!PHASES.student.includes(phase)&&!PHASES.teacher.includes(phase)||!whole(from,9999)||!whole(to,9999))return json({error:'invalid_input'},400);
const {results}=await env.DB.prepare(`SELECT data_json FROM research_events WHERE student != '' ${student?'AND student = ?':''} AND (session_no IS NULL OR session_no BETWEEN ? AND ?) ORDER BY student, session_no, time, rid LIMIT 50000`).bind(...(student?[student]:[]),from,to).all();
return json({rows:results.map(r=>{try{return JSON.parse(r.data_json);}catch{return null;}}).filter(r=>r&&(!phase||r.phase===phase))});}
if(type==='probes'||type==='probeItems')return json({rows:await probeExport(env,type)});
if(type==='decisions'){const {results}=await env.DB.prepare('SELECT d.assignment_id AS assignment, a.teacher, a.probe, a.phase, a.set_id AS setId, d.scenario_id AS scenario, d.session_no AS sessionNo, d.decision, d.changes_json AS changes, d.direction, d.expected, d.reason, d.note, d.ai_on AS aiOn, d.ai_used AS aiUsed, d.raw_viewed AS rawViewed, d.shown_at AS shownAt, d.saved_at AS savedAt, d.active_ms AS activeMs, d.total_ms AS totalMs, d.ai_wait_ms AS aiWaitMs FROM scenario_decisions d JOIN scenario_assignments a ON a.id = d.assignment_id ORDER BY a.teacher, d.assignment_id, d.scenario_id, d.session_no').all();return json({rows:results});}
return json({error:'invalid_input'},400);}catch{return json({error:'research_storage_unavailable'},503);}}

// ---------- 標準化紀錄情境（教師探試） ----------
// 格式：{id, version, title, scenarios:[{id, title, act, settings, expected?, sessions:[{no, events:[網站的紀錄列]}]}]}
const SET_ID=/^[A-Za-z0-9_-]{1,30}$/,EXPECTED=new Set(['increase','decrease','advance','maintain','insufficient']);
function validEventRow(e){if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).length>40)return false;return Object.entries(e).every(([k,v])=>k.length<=30&&(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=1500));}
function validScenarioSet(s){if(!s||typeof s!=='object'||Array.isArray(s)||!SET_ID.test(s.id)||typeof s.version!=='string'||!/^[A-Za-z0-9._-]{1,20}$/.test(s.version)||!safeText(s.title,60)||!Array.isArray(s.scenarios)||s.scenarios.length<1||s.scenarios.length>10)return false;
const ids=new Set();for(const c of s.scenarios){if(!c||typeof c!=='object'||!SET_ID.test(c.id)||ids.has(c.id)||!safeText(c.title,40)||!ACT_IDS.includes(c.act)||!Array.isArray(c.sessions)||c.sessions.length<1||c.sessions.length>12)return false;ids.add(c.id);
if(c.settings!==undefined&&!validOverride(c.settings))return false;if(c.expected!==undefined&&!(Array.isArray(c.expected)&&c.expected.length===c.sessions.length&&c.expected.every(x=>EXPECTED.has(x))))return false;
for(const [i,x] of c.sessions.entries())if(!x||x.no!==i+1||!Array.isArray(x.events)||x.events.length>400||!x.events.every(validEventRow))return false;}return true;}
const setKey=s=>s.id+'@'+s.version;
async function setRow(env,id){const row=await env.DB.prepare('SELECT id, version, title, set_json FROM scenario_sets WHERE id = ?').bind(id).first();if(!row)return null;try{return {...row,set:JSON.parse(row.set_json)};}catch{return null;}}
async function studyScenarios(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
if(request.method==='GET'){const sets=(await env.DB.prepare('SELECT id, version, title, created_at AS createdAt FROM scenario_sets ORDER BY created_at').all()).results;
const asg=(await env.DB.prepare('SELECT a.id, a.set_id AS setId, a.teacher, a.probe, a.phase, a.created_at AS createdAt, (SELECT COUNT(*) FROM scenario_decisions d WHERE d.assignment_id = a.id) AS decided FROM scenario_assignments a ORDER BY a.created_at').all()).results;return json({sets,assignments:asg});}
if(!sameOrigin(request))return json({error:'origin'},403);const s=await readJson(request,950000);if(!validScenarioSet(s))return json({error:'invalid_scenario_set'},400);
// 版本鎖定：同一個 id@version 匯入後不能覆蓋，要改內容就換版本號
try{await env.DB.prepare('INSERT INTO scenario_sets (id,version,title,set_json,created_at) VALUES (?,?,?,?,?)').bind(setKey(s),s.version,s.title,JSON.stringify(s),Date.now()).run();}catch{return json({error:'version_locked'},409);}
return json({ok:true,id:setKey(s)});}
async function studyAssign(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const b=await readJson(request,512);if(!b||typeof b.setId!=='string'||!TEACHER_CODE.test(b.teacher)||!safeText(b.probe,20))return json({error:'invalid_input'},400);if(!await setRow(env,b.setId))return json({error:'unknown_set'},404);
// 平衡輪替：同一位老師不重複使用同一組情境
if(await env.DB.prepare('SELECT id FROM scenario_assignments WHERE teacher = ? AND set_id = ?').bind(b.teacher,b.setId).first())return json({error:'set_already_used'},409);
const id='a_'+crypto.randomUUID().replaceAll('-','').slice(0,16),phase=await currentPhase(env,'teacher',b.teacher)||'';
await env.DB.prepare('INSERT INTO scenario_assignments (id,set_id,teacher,probe,phase,created_at) VALUES (?,?,?,?,?,?)').bind(id,b.setId,b.teacher,b.probe,phase,Date.now()).run();return json({ok:true,id,phase});}

// 教師端：只看到已經輪到的節次；看不到應有方向
async function myAssignment(env,who,id){if(!/^a_[a-f0-9]{16}$/.test(id))return null;const a=await env.DB.prepare('SELECT id, set_id AS setId, teacher, probe, phase FROM scenario_assignments WHERE id = ?').bind(id).first();if(!a||a.teacher!==who.ws)return null;const row=await setRow(env,a.setId);return row?{...a,set:row.set,title:row.title}:null;}
async function decisionsOf(env,id){return (await env.DB.prepare('SELECT scenario_id AS scenario, session_no AS sessionNo, decision, changes_json AS changes, reason, note, saved_at AS savedAt FROM scenario_decisions WHERE assignment_id = ? ORDER BY session_no').bind(id).all()).results.map(d=>({...d,changes:JSON.parse(d.changes||'{}')}));}
// 情境裡老師「目前的設定」：原設定加上老師自己做過的調整（後續節次的紀錄不會因此改變）
function teacherSettings(c,decisions){const s={...settingBase(),...(c.settings||{})};for(const d of decisions)if(d.scenario===c.id&&d.decision==='change')Object.assign(s,d.changes);return s;}
function scenarioView(a,decisions){return a.set.scenarios.map(c=>{const mine=decisions.filter(d=>d.scenario===c.id),next=mine.length+1,shown=Math.min(next,c.sessions.length);
return {id:c.id,title:c.title,act:c.act,original:{...settingBase(),...(c.settings||{})},current:teacherSettings(c,decisions),total:c.sessions.length,done:mine.length>=c.sessions.length,next:mine.length>=c.sessions.length?null:next,sessions:c.sessions.slice(0,shown),decisions:mine};});}
async function scenarioRoutes(request,env,who,rest){if(!canManage(who))return notManager(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
if(who.role!=='test')return json({error:'teacher_code_required'},403);
try{if(!rest){if(request.method!=='GET')return json({error:'method'},405);const {results}=await env.DB.prepare('SELECT a.id, a.probe, s.title, (SELECT COUNT(*) FROM scenario_decisions d WHERE d.assignment_id = a.id) AS decided, s.set_json FROM scenario_assignments a JOIN scenario_sets s ON s.id = a.set_id WHERE a.teacher = ? ORDER BY a.created_at').bind(who.ws).all();
return json({assignments:results.map(r=>{let total=0;try{total=JSON.parse(r.set_json).scenarios.reduce((n,c)=>n+c.sessions.length,0);}catch{}return {id:r.id,probe:r.probe,title:r.title,decided:r.decided,total};})});}
const [id,action]=rest.split('/'),a=await myAssignment(env,who,id);if(!a)return json({error:'not_found'},404);const phase=await currentPhase(env,'teacher',who.ws),aiOn=summaryAllowed(phase);
if(!action){if(request.method!=='GET')return json({error:'method'},405);return json({id:a.id,probe:a.probe,title:a.title,aiOn,scenarios:scenarioView(a,await decisionsOf(env,a.id))});}
if(request.method!=='POST')return json({error:'method'},405);if(!sameOrigin(request))return json({error:'origin'},403);
const decisions=await decisionsOf(env,a.id);
if(action==='summary'){const b=await readJson(request,256),c=a.set.scenarios.find(x=>x.id===b?.scenario);if(!c)return json({error:'invalid_input'},400);if(!aiOn)return json({error:'summary_off'},403);
const done=decisions.filter(d=>d.scenario===c.id).length,upTo=Math.min(done+1,c.sessions.length);const out=await summarize(env,who.ws,a.id+'|'+c.id+'|'+upTo,c.sessions.slice(Math.max(0,upTo-7),upTo).map(x=>({no:x.no,rows:x.events})),c.act);
return json({text:out.text,source:out.source,model:out.model,promptVersion:out.promptVersion,sessions:Array.from({length:upTo},(_,i)=>i+1).slice(-7),id:out.id});}
if(action==='decide'){const b=await readJson(request,4096),c=a.set.scenarios.find(x=>x.id===b?.scenario);if(!c||!DECISIONS.has(b.decision)||!REASONS.has(b.reason))return json({error:'invalid_input'},400);
const mine=decisions.filter(d=>d.scenario===c.id);if(b.sessionNo!==mine.length+1||b.sessionNo>c.sessions.length)return json({error:'wrong_session'},409);
const ms=v=>whole(v,3*60*60*1000);if(!ms(b.activeMs)||!ms(b.totalMs)||!ms(b.aiWaitMs)||!Number.isInteger(b.shownAt))return json({error:'invalid_input'},400);
if(b.decision==='change'&&!validOverride(b.changes))return json({error:'invalid_input'},400);if((b.decision==='advance'||b.decision==='back')&&!ACT_IDS.includes(b.to))return json({error:'invalid_input'},400);
const before=teacherSettings(c,decisions),changes=b.decision==='change'?b.changes:b.decision==='keep'?{}:{to:b.to};const [direction,down]=decisionDirection(b.decision,changes,before);
if(b.decision==='change'&&!direction)return json({error:'no_change'},400);if(down>1)return json({error:'one_step_only'},400);
const rules=await studyRules(env),k=b.sessionNo,expected=c.expected?c.expected[k-1]:expectedDirection(c.sessions.slice(0,k).map(x=>({no:x.no,...sessionMetrics(x.events,c.act)})),rules,1);
const note=typeof b.note==='string'?b.note.trim().slice(0,60):'';
try{await env.DB.prepare('INSERT INTO scenario_decisions (assignment_id,scenario_id,session_no,decision,changes_json,direction,expected,reason,note,ai_on,ai_used,raw_viewed,shown_at,saved_at,active_ms,total_ms,ai_wait_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(a.id,c.id,k,b.decision,JSON.stringify(changes),direction,expected,b.reason,note,aiOn?1:0,b.aiUsed===true?1:0,b.rawViewed===true?1:0,b.shownAt,Date.now(),b.activeMs,b.totalMs,b.aiWaitMs).run();}catch{return json({error:'wrong_session'},409);}
return json({ok:true,direction});}
return json({error:'not_found'},404);}catch{return json({error:'research_storage_unavailable'},503);}}

// ---------- 第 26 版第三階段：探試模式 ----------
// 題組由研究團隊編製（每份 10 題：數格子 2、長方形 3、正方形 2、知道面積找邊長 1、複合圖形 2），匯入後鎖定版本。
// 學生端只拿到題目，拿不到答案；每題送出後由伺服器依固定規則計分，學生只看到和對錯無關的鼓勵。
const PROBE_TYPES={count:2,rectangle:3,square:2,inverse:1,composite:2},PROBE_KINDS=new Set(['probe','generalization','practice']),STEP_ROLES=new Set(['measure','formula','part','answer','unit']);
const KEY=/^[a-z][a-zA-Z0-9]{0,11}$/,intIn=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
function validFigure(f){if(f===undefined)return true;if(!f||typeof f!=='object'||Array.isArray(f)||!intIn(f.cols,1,20)||!intIn(f.rows,1,20)||typeof (f.grid??false)!=='boolean')return false;
if(!Array.isArray(f.rects||[])||(f.rects||[]).length>6||!(f.rects||[]).every(r=>Array.isArray(r)&&r.length===4&&r.every(n=>intIn(n,0,20))))return false;
return Array.isArray(f.labels||[])&&(f.labels||[]).length<=8&&(f.labels||[]).every(l=>l&&typeof l.x==='number'&&typeof l.y==='number'&&Math.abs(l.x)<=21&&Math.abs(l.y)<=21&&safeText(l.text,12));}
function validProbeItem(it){if(!it||typeof it!=='object'||!SET_ID.test(it.id)||!Object.hasOwn(PROBE_TYPES,it.type)||!safeText(it.prompt,160)||!validFigure(it.figure)||!Array.isArray(it.steps)||it.steps.length<1||it.steps.length>6)return false;
const keys=new Set();for(const s of it.steps){if(!s||!KEY.test(s.key)||keys.has(s.key)||!safeText(s.label,30)||!STEP_ROLES.has(s.role)||!['number','choice'].includes(s.input))return false;keys.add(s.key);
if(s.input==='number'&&!(typeof s.answer==='number'&&Number.isFinite(s.answer)))return false;if(s.input==='choice'&&!(Array.isArray(s.options)&&s.options.length>=2&&s.options.length<=5&&s.options.every(o=>safeText(o,20))&&s.options.includes(s.answer)))return false;}
return it.steps.filter(s=>s.role==='answer').length===1;}
function validProbeSet(s){if(!s||typeof s!=='object'||Array.isArray(s)||!SET_ID.test(s.id)||typeof s.version!=='string'||!/^[A-Za-z0-9._-]{1,20}$/.test(s.version)||!PROBE_KINDS.has(s.kind)||!safeText(s.title,60)||!Array.isArray(s.forms)||s.forms.length<1||s.forms.length>20)return false;
if(s.itemSecs!==undefined&&!intIn(s.itemSecs,30,300)||s.totalSecs!==undefined&&!intIn(s.totalSecs,300,3600))return false;const ids=new Set();
for(const f of s.forms){if(!f||!SET_ID.test(f.id)||ids.has(f.id)||!Array.isArray(f.items)||f.items.length<1||f.items.length>20||!f.items.every(validProbeItem))return false;ids.add(f.id);
if(new Set(f.items.map(i=>i.id)).size!==f.items.length)return false;
// 正式探試題組：題數與題型比例固定
if(s.kind==='probe'){if(f.items.length!==10)return false;for(const [t,n] of Object.entries(PROBE_TYPES))if(f.items.filter(i=>i.type===t).length!==n)return false;}}return true;}
async function probeSetRow(env,id){const row=await env.DB.prepare('SELECT id, kind, title, set_json FROM probe_sets WHERE id = ?').bind(id).first();if(!row)return null;try{return {...row,set:JSON.parse(row.set_json)};}catch{return null;}}
// 學生拿到的題目：拿掉答案
const publicItem=it=>({id:it.id,type:it.type,prompt:it.prompt,figure:it.figure||null,steps:it.steps.map(s=>({key:s.key,label:s.label,role:s.role,input:s.input,...(s.input==='choice'?{options:s.options}:{})}))});

// ---------- 計分 ----------
const sameAnswer=(v,a)=>v!==null&&v!==undefined&&v!==''&&(typeof a==='number'?Number(v)===a:String(v)===String(a));
function scoreProbeItem(item,resp){const st=resp&&resp.steps&&typeof resp.steps==='object'?resp.steps:{},tech=resp?.tech===true;
// 確定的次數太多時：保留前 10 次與最後 20 次（第一次與真正最後一次一定在）
const confirmsOf=k=>{const c=Array.isArray(st[k]?.confirms)?st[k].confirms.filter(c=>c&&(typeof c.v==='number'||typeof c.v==='string')):[];return c.length>30?[...c.slice(0,10),...c.slice(-20)]:c;};
const finalOf=k=>{const c=confirmsOf(k);return c.length?c.at(-1).v:null;},firstOf=k=>{const c=confirmsOf(k);return c.length?c[0].v:null;};
// 某一步在時間 t（含）以前最後確定的值：連帶錯誤要依「當時」已確定的取量判定，後來改了取量不會回頭改變先前的評分
// 先後順序：有全題共用的遞增序號 n 就用 n（同一個時間按了好幾個確定也分得出先後），舊資料才用時間 t
const seqd=item.steps.some(s=>Array.isArray(st[s.key]?.confirms)&&st[s.key].confirms.some(c=>typeof c?.n==='number'));
const tOf=c=>{const x=seqd?c?.n:c?.t;return typeof x==='number'&&Number.isFinite(x)?x:Infinity;};
const numAt=(k,t)=>{const c=confirmsOf(k).filter(x=>tOf(x)<=t);const v=c.length?c.at(-1).v:null;return v===null||v===''?NaN:Number(v);};
// 前一步錯了：後面的答案依學生自己前一步的結果判定（只用在步驟計分，不用在最終答案的正確率）
function carried(step,v,t){if(step.role!=='answer'||v===null||v==='')return false;const x=Number(v);
if(item.type==='rectangle'){const m=item.steps.filter(s=>s.role==='measure');return m.length===2&&x===numAt(m[0].key,t)*numAt(m[1].key,t);}
if(item.type==='square'){const m=item.steps.find(s=>s.role==='measure');return !!m&&x===numAt(m.key,t)**2;}
if(item.type==='composite'){const p=item.steps.filter(s=>s.role==='part');return p.length>=2&&x===p.reduce((n,s)=>n+numAt(s.key,t),0);}return false;}
const ok=(s,c)=>!!c&&(sameAnswer(c.v,s.answer)||carried(s,c.v,tOf(c)));
const steps=item.steps.map(s=>{const c=confirmsOf(s.key),fin=c.length?c.at(-1).v:null,hadError=c.some(x=>!ok(s,x));
return {key:s.key,role:s.role,answered:c.length>0,firstCorrect:ok(s,c[0]),finalCorrect:ok(s,c.at(-1)),hadError,selfCorrected:hadError&&ok(s,c.at(-1)),final:fin};});
const ans=item.steps.find(s=>s.role==='answer'),unit=item.steps.find(s=>s.role==='unit'),answerCorrect=sameAnswer(finalOf(ans.key),ans.answer),unitCorrect=unit?sameAnswer(finalOf(unit.key),unit.answer):true,
firstCorrect=!tech&&sameAnswer(firstOf(ans.key),ans.answer)&&(unit?sameAnswer(firstOf(unit.key),unit.answer):true);
const group=role=>{const l=steps.filter(s=>s.role===role);return l.length?l.every(s=>s.finalCorrect):null;};
return {itemId:item.id,type:item.type,tech,timedOut:resp?.timedOut===true,answered:steps.some(s=>s.answered),correct:!tech&&answerCorrect&&unitCorrect,firstCorrect,answerCorrect,unitCorrect,measureCorrect:group('measure'),formulaCorrect:group('formula'),steps,secs:intIn(resp?.secs,0,3600)?resp.secs:null};}
function probeSummary(items,results,minValid=8){const byId=new Map(results.map(r=>[r.itemId,r]));const all=items.map(it=>byId.get(it.id)||{...scoreProbeItem(it,{timedOut:true}),missing:true});
const valid=all.filter(r=>!r.tech),steps=valid.flatMap(r=>r.steps),withErr=steps.filter(s=>s.hadError);
return {items:all.length,valid:valid.length,correct:valid.filter(r=>r.correct).length,firstCorrect:valid.filter(r=>r.firstCorrect).length,
// 首次提交正確率：最終答案與單位「第一次確定」就對的題數 ÷ 有效題數；最後答對的題數另列 finalAccuracy
firstSubmitAccuracy:valid.length?Math.round(valid.filter(r=>r.firstCorrect).length/valid.length*1000)/10:null,finalAccuracy:valid.length?Math.round(valid.filter(r=>r.correct).length/valid.length*1000)/10:null,
scorableSteps:steps.length,independentSteps:steps.filter(s=>s.firstCorrect).length,independentStepRate:steps.length?Math.round(steps.filter(s=>s.firstCorrect).length/steps.length*1000)/10:null,
errorSteps:withErr.length,selfCorrected:withErr.filter(s=>s.selfCorrected).length,selfCorrectionRate:withErr.length?Math.round(withErr.filter(s=>s.selfCorrected).length/withErr.length*1000)/10:null,
timedOut:all.filter(r=>r.timedOut).length,unanswered:all.filter(r=>!r.answered).length,tech:all.length-valid.length,dataPoint:valid.length>=minValid};}

// ---------- 路由 ----------
async function probeSets(request,env,who){if(!researchRole(who))return noResearch(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const {results}=await env.DB.prepare('SELECT id, kind, title, set_json FROM probe_sets ORDER BY created_at').all();
return json({sets:results.map(r=>{let s={};try{s=JSON.parse(r.set_json);}catch{}return {id:r.id,kind:r.kind,title:r.title,forms:(s.forms||[]).length,items:(s.forms?.[0]?.items||[]).length,itemSecs:s.itemSecs||90,totalSecs:s.totalSecs||900};})});}
async function studyProbeSets(request,env,who){if(!isResearcher(who))return notResearcher(who);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const s=await readJson(request,950000);if(!validProbeSet(s))return json({error:'invalid_probe_set'},400);
try{await env.DB.prepare('INSERT INTO probe_sets (id,kind,title,set_json,created_at) VALUES (?,?,?,?,?)').bind(setKey(s),s.kind,s.title,JSON.stringify(s),Date.now()).run();}catch{return json({error:'version_locked'},409);}return json({ok:true,id:setKey(s)});}
async function probeRun(env,who,id){if(!/^p_[a-f0-9]{16}$/.test(id))return null;const run=await env.DB.prepare('SELECT * FROM probe_runs WHERE id = ?').bind(id).first();if(!run||run.workspace!==who.ws)return null;const set=await probeSetRow(env,run.set_id);const form=set?.set.forms.find(f=>f.id===run.form_id);return form?{run,set:set.set,form}:null;}
async function probeRoutes(request,env,who,rest){if(!researchRole(who))return noResearch(who);if(request.method!=='POST')return json({error:'method'},405);if(!sameOrigin(request))return json({error:'origin'},403);if(!env.DB)return json({error:'research_storage_unavailable'},503);
try{if(rest==='start'){const b=await readJson(request,512);if(!b||typeof b.student!=='string'||!STUDENT_CODE.test(b.student)||typeof b.set!=='string'||TEACHER_CODE.test(who.ws)&&b.student.slice(0,3)!==who.ws)return json({error:'invalid_input'},400);
const no=b.sessionNo===undefined||b.sessionNo===null?null:b.sessionNo;if(no!==null&&!whole(no,9999))return json({error:'invalid_input'},400);const row=await probeSetRow(env,b.set);if(!row)return json({error:'unknown_set'},404);
// 複本輪替：依學生號碼錯開起點，每做一次換下一份（研究團隊事先排好複本順序）
const used=(await env.DB.prepare('SELECT COUNT(*) AS n FROM probe_runs WHERE workspace = ? AND student = ? AND set_id = ?').bind(who.ws,b.student,b.set).first())?.n||0,forms=row.set.forms,form=forms[(Number(b.student.slice(-2))+used)%forms.length];
const id='p_'+crypto.randomUUID().replaceAll('-','').slice(0,16),phase=await currentPhase(env,'student',b.student);
await env.DB.prepare('INSERT INTO probe_runs (id,workspace,student,set_id,form_id,session_no,phase,started_at,status) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,who.ws,b.student,b.set,form.id,no,phase,Date.now(),'running').run();
return json({run:id,kind:row.set.kind,formId:form.id,itemSecs:row.set.itemSecs||90,totalSecs:row.set.totalSecs||900,items:form.items.map(publicItem)});}
const [id,action]=rest.split('/'),p=await probeRun(env,who,id);if(!p)return json({error:'not_found'},404);if(p.run.status!=='running')return json({error:'already_finished'},409);
if(action==='item'){const b=await readJson(request,16000),idx=p.form.items.findIndex(i=>i.id===b?.itemId);if(idx<0)return json({error:'invalid_input'},400);
// 時間到了之後才確定的答案不算（前端計時停了也一樣）：超過每題時間就記為逾時
const lim=(p.set?.itemSecs||90)+2,late=intIn(b.secs,0,36000)&&b.secs>lim;if(b.steps&&typeof b.steps==='object')for(const v of Object.values(b.steps))if(v&&Array.isArray(v.confirms))v.confirms=v.confirms.filter(c=>!(c&&typeof c.t==='number'&&c.t>lim));
if(late)b.timedOut=true;
const result=scoreProbeItem(p.form.items[idx],b);
try{await env.DB.prepare('INSERT INTO probe_items (run_id,item_id,idx,response_json,result_json,at) VALUES (?,?,?,?,?,?)').bind(id,b.itemId,idx,JSON.stringify({steps:b.steps,timedOut:b.timedOut===true,tech:b.tech===true,secs:b.secs}).slice(0,15000),JSON.stringify(result),Date.now()).run();}catch{// 只有這一題真的已經存過，才回「已收件」；其他寫入失敗回 503，前端會保留答案再送
let had=null;try{had=await env.DB.prepare('SELECT 1 AS x FROM probe_items WHERE run_id = ? AND item_id = ?').bind(id,b.itemId).first();}catch{}
return had?json({error:'already_submitted'},409):json({error:'research_storage_unavailable'},503);}
return json({ok:true});}
if(action==='finish'){const b=await readJson(request,512)||{},status=['done','timeout','stopped'].includes(b.reason)?b.reason:'done';
const {results}=await env.DB.prepare('SELECT result_json FROM probe_items WHERE run_id = ?').bind(id).all(),scored=results.map(r=>JSON.parse(r.result_json));
const now=Date.now(),summary={...probeSummary(p.form.items,scored),minutes:Math.round((now-p.run.started_at)/600)/100};
await env.DB.prepare('UPDATE probe_runs SET ended_at = ?, status = ?, summary_json = ? WHERE id = ?').bind(now,status,JSON.stringify(summary),id).run();return json({ok:true});}
return json({error:'not_found'},404);}catch{return json({error:'research_storage_unavailable'},503);}}
async function probeExport(env,type){if(type==='probes'){const {results}=await env.DB.prepare('SELECT id, workspace, student, set_id AS setId, form_id AS formId, session_no AS sessionNo, phase, started_at AS startedAt, ended_at AS endedAt, status, summary_json AS summary FROM probe_runs ORDER BY started_at LIMIT 20000').all();return results.map(r=>({...r,summary:JSON.parse(r.summary||'{}')}));}
const {results}=await env.DB.prepare('SELECT r.id AS run, r.workspace, r.student, r.set_id AS setId, r.form_id AS formId, r.session_no AS sessionNo, r.phase, i.idx, i.item_id AS itemId, i.result_json AS result, i.at FROM probe_items i JOIN probe_runs r ON r.id = i.run_id ORDER BY r.started_at, i.idx LIMIT 50000').all();return results.map(r=>({...r,result:JSON.parse(r.result)}));}

// ---------- 第 26 版第四階段：第三年學生端（研究階段、小老師小方的支持階段、小方語句） ----------
// 學生頁開始本節時讀這位學生的研究階段：A／維持期只做探試；B 完整網站但關閉 AI；BC 再加上小老師小方
async function studyPhaseOf(request,env,who){if(!researchRole(who))return noResearch(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);const student=new URL(request.url).searchParams.get('student')||'';if(!STUDENT_CODE.test(student))return json({error:'invalid_input'},400);if(!ownsStudent(who,student))return notYours();
const rules=await studyRules(env);return json({student,phase:await currentPhase(env,'student',student),teacherWait:rules.teacherWait,tutorChars:rules.tutorChars,showAdvice:rules.showAdvice});}
const TUTOR_STAGES=['demo','guided','faded'];
// 每一節在「目前支持階段」的正確率：示範＝點選小方下一步的正確率；陪做、撤除＝沒用到第 3 層提示、最後一步第一次就答對的題數 ÷ 完成題數
function tutorAccuracy(rows,act,stage){const ops=rows.filter(r=>r&&r.sheet==='操作紀錄'&&(!act||r.actId===act)&&r.mode!=='probe').filter(r=>rowDetail(r).tutorStage===stage);
if(stage==='demo'){const picks=ops.filter(r=>r.event==='小方示範選擇');return picks.length?{n:picks.length,acc:Math.round(picks.filter(r=>r.correct==='是'||r.correct===true).length/picks.length*100)}:null;}
const done=ops.filter(r=>r.event==='整題完成');if(!done.length)return null;
const ok=done.filter(d=>{const m=Number(rowDetail(d).maxHintLevel);if(Number.isFinite(m)&&m>=3)return false;const checks=ops.filter(r=>r.event==='步驟檢核'&&r.cycle===d.cycle);if(!checks.length)return false;const last=Math.max(...checks.map(r=>Number(r.step)||0)),first=checks.find(r=>Number(r.step)===last);return first.correct==='是'||first.correct===true;}).length;
return {n:done.length,acc:Math.round(ok/done.length*100)};}
// 依規則決定支持階段：連續 N 節達標就前進、連續 N 節低於下限就退回；撤除階段達標就提示進入下一個活動；示範階段連續多節低於下限就提示加入實物操作
function nextTutorStage(stage,accs,rules){const last=n=>accs.length>=n?accs.slice(-n):null,up=last(rules.stageN),down=last(rules.stageN);
if(up&&up.every(a=>a>=rules.stageUp))return stage==='faded'?{stage,reason:'nextActivity'}:{stage:TUTOR_STAGES[TUTOR_STAGES.indexOf(stage)+1],reason:'up'};
if(down&&down.every(a=>a<rules.stageDown)){if(stage==='demo'){const h=last(rules.handsOnN);return h&&h.every(a=>a<rules.stageDown)?{stage,reason:'handsOn'}:{stage,reason:'stay'};}return {stage:TUTOR_STAGES[TUTOR_STAGES.indexOf(stage)-1],reason:'down'};}
return {stage,reason:'stay'};}
async function tutorStage(request,env,who){if(!researchRole(who))return noResearch(who);if(!env.DB)return json({error:'research_storage_unavailable'},503);
const q=new URL(request.url).searchParams,student=q.get('student')||'',act=q.get('act')||'',no=Number(q.get('sessionNo'));if(!STUDENT_CODE.test(student)||!ACT_IDS.includes(act)||!whole(no,9999))return json({error:'invalid_input'},400);if(!ownsStudent(who,student))return notYours();
try{const rules=await studyRules(env),now=Date.now();let row=await env.DB.prepare('SELECT stage, since_session AS since, evaluated_through AS done FROM tutor_stages WHERE workspace = ? AND student = ? AND act = ?').bind(who.ws,student,act).first();
// 每個核心活動都從示範階段開始
if(!row){row={stage:'demo',since:Math.max(0,no-1),done:Math.max(0,no-1)};await env.DB.prepare('INSERT OR IGNORE INTO tutor_stages (workspace,student,act,stage,since_session,evaluated_through,updated_at) VALUES (?,?,?,?,?,?,?)').bind(who.ws,student,act,row.stage,row.since,row.done,now).run();}
let flags={},history=[];
if(row.done<no-1){const sessions=(await eventsBySession(env,who.ws,student,no-1)).filter(s=>s.no>row.since);
history=sessions.map(s=>({no:s.no,...(tutorAccuracy(s.rows,act,row.stage)||{})})).filter(s=>s.n);const out=nextTutorStage(row.stage,history.map(h=>h.acc),rules);
const st=[env.DB.prepare('UPDATE tutor_stages SET stage = ?, since_session = ?, evaluated_through = ?, updated_at = ? WHERE workspace = ? AND student = ? AND act = ?').bind(out.stage,out.stage!==row.stage?no-1:row.since,no-1,now,who.ws,student,act)];
if(out.reason!=='stay')st.push(env.DB.prepare('INSERT INTO tutor_stage_changes (workspace,student,act,from_stage,to_stage,session_no,reason,detail_json,at) VALUES (?,?,?,?,?,?,?,?,?)').bind(who.ws,student,act,row.stage,out.stage,no,out.reason,JSON.stringify({history,rules:{stageUp:rules.stageUp,stageDown:rules.stageDown,stageN:rules.stageN}}),now));
await env.DB.batch(st);if(out.reason==='nextActivity')flags.nextActivity=true;if(out.reason==='handsOn')flags.handsOn=true;row={...row,stage:out.stage};}
return json({student,act,stage:row.stage,...flags,history});}catch{return json({error:'research_storage_unavailable'},503);}}

// 小方的語句：程式決定要說什麼（事件、步驟），AI 只換說法；不能有數字、不超過字數、只說一個動作；不合格就用固定語句
const TUTOR_PROMPT_VERSION='tutor-v26.1',TUTOR_EVENTS=new Set(['right','wrong','idle','predict','compare']);
const TUTOR_FIXED={right:'對了，你做得很仔細。',wrong:'再看一次圖，慢慢想。',idle:'停一下了。想想看：我在找什麼？',predict:'想一想，下一步要做什麼。',compare:'看看我們兩個哪裡一樣。'};
async function tutorQuota(env,ws){if(!env.DB)return false;try{const day=new Date().toISOString().slice(0,10),row=await env.DB.prepare('INSERT INTO ai_usage (day,scope,calls) VALUES (?,?,1) ON CONFLICT(day,scope) DO UPDATE SET calls=calls+1 WHERE calls<600 RETURNING calls').bind(day,'tutor:'+ws).first();return !!row;}catch{return false;}}
async function tutorLine(request,env,who){if(!researchRole(who))return noResearch(who);if(!sameOrigin(request))return json({error:'origin'},403);
const b=await readJson(request,1024);if(!b||!TUTOR_EVENTS.has(b.event)||!ACT_IDS.includes(b.act)||!TUTOR_STAGES.includes(b.stage)||b.stepTitle!==undefined&&!(typeof b.stepTitle==='string'&&/^[一-鿿0-9A-Za-z ，、（）？]{1,16}$/.test(b.stepTitle))||b.obs!==undefined&&!Object.hasOwn(OBS_LABELS,b.obs))return json({error:'invalid_input'},400);
const rules=await studyRules(env),limit=rules.tutorChars,fixed=TUTOR_FIXED[b.event],input={event:b.event,stage:b.stage,act:b.act,stepTitle:b.stepTitle||'',obs:b.obs?OBS_LABELS[b.obs]:''};
const system=`你是國小面積課的小老師「小方」，對象是可能有學習困難的國小學生。程式已經決定這次要說的是：${{right:'肯定學生剛剛這一步做對了',wrong:'學生這一步答錯了，提醒他再看一次，不說答案',idle:'學生停了一陣子，提醒他想一想現在在找什麼',predict:'請學生想一想你下一步要做什麼',compare:'請學生對照你和他的作品'}[b.event]}。只輸出一句話，國小中年級口語，不超過${limit}個字，只說一個動作，不可以有任何數字，不說答案，不用這些詞：${banned}。只輸出 JSON 物件 {"message":"語句"}。`;
const user=`活動：${actTitles[b.act]||b.act}。步驟：${input.stepTitle||'（無）'}。${input.obs?'看到的情形：'+input.obs+'。':''}`;
if(!await tutorQuota(env,who.ws)){await logAi(env,{task:'tutor',workspace:who.ws,promptVersion:TUTOR_PROMPT_VERSION,input,text:fixed,source:'fallback',error:'ai_limit'});return json({text:fixed,source:'fallback',promptVersion:TUTOR_PROMPT_VERSION});}
const out=await aiGateway(env,{task:'tutor',quota:false,ws:who.ws,subject:b.event,input,promptVersion:TUTOR_PROMPT_VERSION,system,user,maxTokens:120,check:t=>!t||t.length>limit?'too_long':/[0-9０-９]/.test(t)?'number':new RegExp(banned.replaceAll('、','|')).test(t)?'banned_word':'',fallback:fixed});
return json({text:out.text,source:out.source,model:out.model,promptVersion:out.promptVersion});}
async function tutorExport(env){const {results}=await env.DB.prepare('SELECT workspace, student, act, from_stage AS fromStage, to_stage AS toStage, session_no AS sessionNo, reason, detail_json AS detail, at FROM tutor_stage_changes ORDER BY at, id LIMIT 20000').all();return results;}

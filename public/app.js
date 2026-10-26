'use strict';
(() => {
const $=id=>document.getElementById(id);
const steps=[['鋪一鋪','把長方形裡面鋪滿','點空格放一片，再點已鋪的格子可以拿起。'],['數一數','每一片都數到','點小正方形做記號，算算一共有幾片。'],['一列一列加','把相同的數量加起來','先點每一列，再把每列的數量填進加法。'],['寫成乘法','把相同的加法寫成乘法','每列幾個 × 有幾列，就能算出全部。'],['長乘寬','沒有格線也能算','找出長和寬，再用乘法計算面積。'],['轉個方向','轉方向後，面積呢？','先轉動長方形，再想想裡面的大小有沒有改變。']];
const checks=['我檢查過沒有空隙','我檢查過每片只數一次','我檢查過沒有漏掉一列','我檢查過每列數量和列數','我檢查過算式和平方公分','我檢查過沒有增加或拿走方塊'];
const hints=['先看裡面還有沒有空格。','點一下還沒有數字的方塊。','先指第一列，看看這一列有幾個。','把「每列幾個」放前面，「有幾列」放後面。','先找圖上方和右方標示的邊長。','轉方向時，有增加或拿走任何一片嗎？'];
const forms=[{name:'A',count:[6,1],add:[2,3],rect:[4,3]},{name:'B',count:[5,2],add:[3,2],rect:[6,2]},{name:'C',count:[4,3],add:[2,2],rect:[4,1]}];
let state={mode:'learn',step:0,w:4,h:2,tiles:new Set(),counted:[],rows:new Set(),choice:null,rotated:false,gridShown:false,hints:0,self:false,passed:false,done:new Set(),records:[],test:null};
let pendingAction=null,dragging=false;
let cycle=null,cycleCounter=0,carry=null,responseMode='自行操作',observations=[];
const goals=['把這一步的面積任務做對','做對任務，並在送出前核對一次'];
const methods={slow:'一步一步做',check:'先做，再對照檢查',help:'先看提示，再自己做'};
const methodActions=[
 ['從第一格開始，一格一格鋪。','鋪完後，從左到右找空格。','按「給我一個提示」，再自己鋪。'],
 ['從第一列開始，按順序點數。','數完後，核對每格記號和總數。','按「給我一個提示」，再自己數。'],
 ['點一列，填一個加數。','填完後，把每個加數對回一列。','按「給我一個提示」，再自己加。'],
 ['先填每列個數，再填列數。','寫完乘法，再把兩個因數對回圖。','按「給我一個提示」，再自己寫。'],
 ['先看兩邊的標示，再寫乘法。','寫完後，核對邊長、乘積和單位。','按「給我一個提示」，再自己算。'],
 ['先旋轉，再看每一片是否還在。','比一比旋轉前後的方塊總數。','按「給我一個提示」，再自己比較。']];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function newCycle(){cycle={id:++cycleCounter,phase:'plan',goal:'',method:'',attempts:0,result:null,monitor:[],source:carry};}
function optionList(items){return '<option value="">請選擇</option>'+items.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');}
function answerSnapshot(){return {fields:Object.fromEntries([...document.querySelectorAll('#task input,#task select')].map(x=>[x.id,x.value])),choice:state.choice,tiles:[...state.tiles],counted:[...state.counted],rows:[...state.rows],rotated:state.rotated};}
function selectField(id,label,items){return `<label class="cycle-field" for="${id}">${label}<select id="${id}">${optionList(items)}</select></label>`;}
function renderCycle(){
 if(presentation==='visual'){renderVisualCycle();return;}
 const panel=$('cyclePanel'),work=document.querySelector('.workgrid');
 work.classList.toggle('hidden',cycle.phase==='plan');work.inert=cycle.phase==='reflect';
 $('reflection').classList.add('hidden');$('reset').classList.toggle('hidden',cycle.phase!=='do');
 const names=['1 選目標與方法','2 操作與核對','3 回顧與再出發'];
 panel.innerHTML=`<ol class="cycle-track" aria-label="本輪學習階段">${names.map((n,i)=>`<li ${['plan','do','reflect'][i]===cycle.phase?'aria-current="step"':''}>${n}</li>`).join('')}</ol><div id="cycleBody"></div>`;
 const body=$('cycleBody');
 if(cycle.phase==='plan'){
  body.innerHTML=`<h2>這一輪，我想怎麼學？</h2><p>任務：${steps[state.step][1]}。${checks[state.step].replace('我檢查過','完成時要確認：')}。</p>${carry?`<p class="carry">上一次的調整：${esc(carry.reason)}；下次用「${methods[carry.method]}」。請決定要沿用或重新選。</p>`:''}<div class="cycle-fields">${selectField('goalSelect','我的目標',goals.map((x,i)=>[i,x]))}${selectField('methodSelect','我準備用的方法',Object.entries(methods))}</div><p id="planPreview" class="strategy-note"></p><button id="startCycle" class="primary">用這個計畫開始</button><p id="planMessage" role="status"></p>`;
  if(carry)$('methodSelect').value=carry.method;
  const preview=()=>{$('planPreview').textContent=$('methodSelect').value?methodActions[state.step][Object.keys(methods).indexOf($('methodSelect').value)]:'';};preview();$('methodSelect').onchange=preview;
  $('startCycle').onclick=()=>{if(!$('goalSelect').value||!$('methodSelect').value){$('planMessage').textContent='先選一個目標和一個方法。可以指給老師，請老師代選。';return;}cycle.goal=Number($('goalSelect').value);cycle.method=$('methodSelect').value;cycle.phase='do';record('SRL定標與計畫',{goal:goals[cycle.goal],method:methods[cycle.method],carriedFrom:carry?.cycle??null,responseMode});renderCycle();drawCurrentBoard();$('title').focus();};
 }else if(cycle.phase==='do'){
  body.innerHTML=`<p><b>我的目標：</b>${goals[cycle.goal]}<br><b>我的方法：</b>${methods[cycle.method]}。${methodActions[state.step][Object.keys(methods).indexOf(cycle.method)]}</p><details id="monitorDetails"><summary>停一下，我要核對</summary><p>${checks[state.step].replace('我檢查過','請核對：')}。先看圖或算式，再記下發現。</p>${selectField('monitorFinding','我核對後發現', [['match','圖和答案對得上'],['change','我發現要修改'],['help','我還不確定，需要幫忙']])}<button id="saveMonitor">記下我的發現</button><p id="monitorMessage" role="status"></p></details><p id="monitorCount">本輪已記下 ${cycle.monitor.length} 次核對。</p>`;
  $('saveMonitor').onclick=()=>{const finding=$('monitorFinding').value;if(!finding){$('monitorMessage').textContent='請先選擇核對後的發現。';return;}cycle.monitor.push(finding);state.self=true;record('SRL核對發現',{finding:$('monitorFinding').selectedOptions[0].text,answer:answerSnapshot(),responseMode});$('monitorMessage').textContent='已記下。需要修改就回到作答區；不確定可以選提示。';$('monitorCount').textContent=`本輪已記下 ${cycle.monitor.length} 次核對。`;};
 }else{
  const supported=state.hints>0?'（使用過教材提示）':'';
  body.innerHTML=`<h2>回顧這一輪，決定下一步</h2><p><b>我原本的目標：</b>${goals[cycle.goal]}<br><b>作答結果：</b>${cycle.result?'本次答案符合任務要求':'本次還需要調整'}${supported}<br><b>核對紀錄：</b>${cycle.monitor.length} 次。這是操作紀錄，仍需確認實際核對情形。</p><p class="result-note">${esc(cycle.feedback)}</p><div class="cycle-fields">${selectField('reflectionResult','我覺得目標達到了嗎？',[['yes','達到了'],['part','做到一部分'],['notyet','還沒做到']])}${selectField('reflectionReason','哪一點影響了結果？',[['按順序做有幫助','按順序做有幫助'],['對照圖和算式有幫助','對照圖和算式有幫助'],['有地方漏看或漏算','有地方漏看或漏算'],['我還不懂，需要示範','我還不懂，需要示範'],['其他原因，已向老師說明','其他原因，向老師說明']])}${selectField('nextMethod','下一輪，我要用',Object.entries(methods))}</div><div class="dialog-actions"><button id="retryCycle" class="primary">調整後再做這一題</button><button id="transferCycle">換一個長方形試試</button>${cycle.result?`<button id="advanceCycle">${state.step===5?'完成六步，開始新例':'帶著計畫進入下一步'}</button>`:''}</div><p id="reflectionMessage" role="status"></p>`;
  $('nextMethod').value=cycle.method;
  const finish=action=>{if(!$('reflectionResult').value||!$('reflectionReason').value||!$('nextMethod').value){$('reflectionMessage').textContent='先選達成情形、原因和下一輪的方法。也可以口述或指選，請老師代記。';return;}carry={cycle:cycle.id,reason:$('reflectionReason').value,method:$('nextMethod').value};record('SRL反思與調整',{goal:goals[cycle.goal],result:cycle.result,learnerJudgment:$('reflectionResult').selectedOptions[0].text,reason:carry.reason,nextMethod:methods[carry.method],nextAction:action,responseMode,monitors:cycle.monitor.length,hints:state.hints});if(cycle.result)state.done.add(state.step);if(action==='advance'&&state.step<5)state.step++;else if(action==='transfer'||action==='advance'){const dims=[[4,2],[3,2],[5,2],[3,3]];let idx=dims.findIndex(x=>x[0]===state.w&&x[1]===state.h);[state.w,state.h]=dims[(idx+1)%dims.length];state.done=new Set();if(action==='advance')state.step=0;}resetStep();render();titleFocus();};
  $('retryCycle').onclick=()=>finish('retry');$('transferCycle').onclick=()=>finish('transfer');if($('advanceCycle'))$('advanceCycle').onclick=()=>finish('advance');
 }
}
function teacherCycleTools(testing){
 const el=$('teacherCycleTools');el.innerHTML=`<h3>SRL 觀察與表達方式</h3><p>依實際觀察填寫；按鈕紀錄不會自動判定「自主」。代輸入只轉錄學生答案，不代答。</p>${selectField('responseMode','本次回應方式',[['自行操作','學生自行操作'],['口述，由教師代輸入','口述，由教師代輸入'],['指選，由教師代輸入','指選，由教師代輸入']])}${!testing?`${selectField('observePhase','觀察項目',[['定標與計畫','定標與計畫'],['執行策略','執行策略'],['核對與修正','核對與修正'],['反思與調整','反思與調整']])}${selectField('observeLevel','支持程度',[['未觀察','未觀察／證據不足'],['自行發起','自行發起'],['一般提醒後','一般提醒後'],['具體提示後','具體提示後'],['示範或協助完成','示範或協助完成']])}<label class="cycle-field">具體行為證據（勿填姓名）<textarea id="observeEvidence" rows="2" maxlength="300" placeholder="例如：未提醒，主動把 4+4 對回兩列，修改漏算。"></textarea></label><button id="saveObservation">記下本輪觀察</button><p id="observationMessage" role="status"></p>`:''}`;
 $('responseMode').value=responseMode;$('responseMode').onchange=()=>{if($('responseMode').value){responseMode=$('responseMode').value;record('回應方式設定',{responseMode});}};
 if(!testing)$('saveObservation').onclick=()=>{const phase=$('observePhase').value,level=$('observeLevel').value,evidence=$('observeEvidence').value.trim();if(!phase||!level||!evidence){$('observationMessage').textContent='請填觀察項目、支持程度和具體證據；未觀察可填「本輪未觀察」。';return;}record('教師SRL觀察',{phase,level,evidence,responseMode});$('observationMessage').textContent='觀察已加入本次紀錄，可下載 CSV。';};
}

let presentation='visual',demoTimer=null,demoFrame=0,demoReturn=null;
const shortGoals=['鋪滿裡面','每片都數到','每列都加到','寫成乘法','算出面積','比較面積'];
const shortDirections=['點格子，鋪滿裡面。','點每一片，再填總數。','點一列，填一個數。','看每列幾個、共有幾列。','看邊長，寫乘法。','轉方向，比面積。'];
function glyph(name){const paths={play:'<path d="M20 12L46 30 20 48Z" fill="currentColor"/>',check:'<path d="M12 31L25 44 49 16"/>',retry:'<path d="M15 20A20 20 0 1 1 10 36M15 9V22H28"/>',inspect:'<circle cx="26" cy="26" r="15"/><path d="M37 37L51 51"/>',next:'<path d="M14 15L29 30 14 45M31 15L46 30 31 45"/>',help:'<path d="M20 20C20 7 44 7 44 22C44 31 31 31 31 40M31 48V49"/>',pause:'<path d="M22 15V45M38 15V45"/>'};return `<svg viewBox="0 0 60 60" aria-hidden="true" class="v-icon" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.check}</svg>`;}
function mathPicture(step=state.step,frame=2){
 let rects='';for(let i=0;i<4;i++){const x=40+i%2*48,y=22+Math.floor(i/2)*48;rects+=`<rect x="${x}" y="${y}" width="48" height="48" fill="${step===0&&i>frame?'white':step===2&&Math.floor(i/2)===Math.min(frame,1)?'#ffd077':'#aac8ff'}" stroke="#244b85" stroke-width="2"/>${step===1&&i<=frame?`<text x="${x+24}" y="${y+32}" text-anchor="middle" font-size="25">${i+1}</text>`:''}`;}
 let extra='';if(step===2)extra=`<text x="180" y="80" font-size="26">${frame===0?'2':frame===1?'2 + 2':'2 + 2 = 4'}</text>`;
 if(step===3)extra=`<text x="180" y="55" font-size="22">2 + 2</text><text x="180" y="98" font-size="26">${frame<2?'2 × 2':'2 × 2 = 4'}</text>`;
 if(step===4){rects=`<rect x="40" y="24" width="96" height="96" fill="#aac8ff" stroke="#244b85" stroke-width="3"/><text x="88" y="18" text-anchor="middle" font-size="16">2 公分</text><text x="145" y="80" font-size="16">2 公分</text>`;extra=frame===0?'':`<text x="40" y="157" font-size="24">2 × 2 ${frame>1?'= 4 平方公分':''}</text>`;}
 if(step===5){rects='<rect x="64" y="16" width="36" height="108" fill="#aac8ff" stroke="#244b85" stroke-width="3"/><path d="M64 52H100M64 88H100" stroke="#244b85" stroke-width="2"/>';rects=`<g transform="translate(88 70) rotate(${frame?90:0}) translate(-88 -70)">${rects}</g>`;extra=`<text x="174" y="75" font-size="24">${frame>1?'3 = 3':'轉 90°'}</text>`;}
 return `<svg class="math-picture" viewBox="0 0 350 180" role="img" aria-label="${['鋪排','點數','累加','乘法','邊長與面積','旋轉'][step]}示意，${step===5?'一乘三':'二乘二'}的示範圖"><g fill="#172b4d" font-family="sans-serif">${rects}${extra}</g></svg>`;
}
function goalPicture(){let cells='';const size=Math.min(44,260/state.w),sx=(350-size*state.w)/2;for(let i=0;i<state.w*state.h;i++)cells+=`<rect x="${sx+(i%state.w)*size}" y="${20+Math.floor(i/state.w)*size}" width="${size}" height="${size}" fill="${state.step===0?'white':'#aac8ff'}" stroke="#244b85" stroke-width="2"/>`;return `<svg class="math-picture" viewBox="0 0 350 180" role="img" aria-label="本題長方形示意">${cells}</svg>`;}
function visualCard(id,label,icon,more=''){return `<button id="${id}" class="v-card">${glyph(icon)}<span>${label}</span>${more}</button>`;}
function visualFocus(){($('cycleBody')?.querySelector('button')||$('title')).focus({preventScroll:true});}
function renderVisualCycle(){
 const work=document.querySelector('.workgrid');work.inert=false;work.classList.toggle('hidden',cycle.phase!=='do');$('reflection').classList.add('hidden');$('reset').classList.add('hidden');
 $('title').textContent=cycle.phase==='plan'?'選一個目標':cycle.phase==='do'?shortGoals[state.step]:'想一想';$('instruction').textContent=cycle.phase==='do'?shortDirections[state.step]:'';$('eyebrow').textContent=`${state.step+1} / 6 · ${steps[state.step][0]}`;
 $('cyclePanel').innerHTML=`<div class="v-progress" aria-label="目前${cycle.phase==='plan'?'準備':cycle.phase==='do'?'操作':'回顧'}階段"><span class="${cycle.phase==='plan'?'on':''}">1 準備</span><span class="${cycle.phase==='do'?'on':''}">2 做一做</span><span class="${cycle.phase==='reflect'?'on':''}">3 想一想</span></div><div id="cycleBody"></div>`;
 const body=$('cycleBody');
 if(cycle.phase==='plan'){
  if(cycle.visualPlan!=='method'){
   body.innerHTML=`<div class="v-goal-picture">${goalPicture()}</div><div class="v-options">${visualCard('visualGoal0',shortGoals[state.step],'check')}${visualCard('visualGoal1',shortGoals[state.step]+'，再檢查','inspect')}</div>`;
   [0,1].forEach(i=>$('visualGoal'+i).onclick=()=>{cycle.goal=i;cycle.visualPlan='method';renderVisualCycle();visualFocus();});
  }else{
   $('title').textContent='我要怎麼開始？';const remembered=carry?.method==='help'?'先看示範':carry?.method==='check'?'自己做，再檢查':'自己試';
   body.innerHTML=`${carry?`<p class="v-carry">上次選：${remembered}</p>`:''}<div class="v-options">${visualCard('visualStart','自己試','check')}${visualCard('visualDemoStart','先看示範','play')}</div><button id="visualBack" class="text-button">重選目標</button>`;
   const start=method=>{cycle.method=method;cycle.phase='do';record('SRL定標與計畫',{goal:goals[cycle.goal],method:method==='help'?'先看示範':'自己試',carriedFrom:carry?.cycle??null,responseMode,presentation});renderVisualCycle();drawCurrentBoard();visualWork();if(method==='help')openDemo();else $('title').focus();};
   $('visualStart').onclick=()=>start(carry?.method==='check'?'check':'slow');$('visualDemoStart').onclick=()=>start('help');$('visualBack').onclick=()=>{cycle.visualPlan='goal';renderVisualCycle();visualFocus();};
  }
 }else if(cycle.phase==='do'){
  body.innerHTML=`<div class="v-tools"><button id="visualMonitor">${glyph('inspect')}我來檢查</button><button id="visualDemo">${glyph('play')}看示範</button></div>`;
  $('visualMonitor').onclick=openVisualMonitor;$('visualDemo').onclick=openDemo;visualWork();
 }else{
  const part=cycle.visualReflection||'judge';
  if(part==='judge'){
   $('title').textContent='我做到目標了嗎？';body.innerHTML=`<p class="v-carry">目標：${shortGoals[state.step]}${cycle.goal===1?'，再檢查':''}</p><p class="v-result">${glyph(cycle.result?'check':'retry')}${cycle.result?'答案對了':'再試一次'}</p>${cycle.result?'':`<p class="v-carry">${['看看裡面有沒有空格。','核對記號和總數。','把加數對回每一列。','核對每列個數和列數。','核對邊長和平方公分。','轉方向，有加減方塊嗎？'][state.step]}</p>`}<div class="v-options">${visualCard('visualYes','我做到了','check')}${visualCard('visualNotYet','還要練習','retry')}</div>`;
   ['Yes','NotYet'].forEach(x=>$('visual'+x).onclick=()=>{cycle.visualJudgment=x==='Yes'?'我做到了':'還要練習';cycle.visualReflection='reason';renderVisualCycle();visualFocus();});
  }else if(part==='reason'){
   $('title').textContent=cycle.visualJudgment==='我做到了'?'什麼幫助了我？':'哪裡需要幫忙？';const good=cycle.visualJudgment==='我做到了';
   body.innerHTML=`<div class="v-options">${visualCard('visualReason0',good?'一步一步做':'有地方漏掉','inspect')}${visualCard('visualReason1',good?'看了示範':'還不懂方法','play')}</div><button id="visualOtherReason" class="text-button">我想告訴老師</button>`;
   const choose=reason=>{cycle.visualReason=reason;cycle.visualReflection='method';renderVisualCycle();visualFocus();};$('visualReason0').onclick=()=>choose(good?'一步一步做有幫助':'有地方漏掉');$('visualReason1').onclick=()=>choose(good?'示範有幫助':'還不懂方法');$('visualOtherReason').onclick=()=>choose('其他原因，待教師記錄口述');
  }else if(part==='method'){
   $('title').textContent='下次，我要……';body.innerHTML=`<div class="v-options">${visualCard('visualNextSelf','自己做，再檢查','inspect')}${visualCard('visualNextDemo','先看示範','play')}</div>`;
   const choose=m=>{cycle.visualNext=m;cycle.visualReflection='route';renderVisualCycle();visualFocus();};$('visualNextSelf').onclick=()=>choose('check');$('visualNextDemo').onclick=()=>choose('help');
  }else{
   $('title').textContent='準備再出發';body.innerHTML=`<div class="v-options">${visualCard('visualRetry','再做這題','retry')}${visualCard('visualContinue',cycle.result?(state.step===5?'換新題':'下一步'):'換新題','next')}</div>`;
   const finish=action=>{carry={cycle:cycle.id,reason:cycle.visualReason,method:cycle.visualNext};record('SRL反思與調整',{goal:goals[cycle.goal],result:cycle.result,learnerJudgment:cycle.visualJudgment,reason:carry.reason,nextMethod:methods[carry.method],nextAction:action,responseMode,monitors:cycle.monitor.length,hints:state.hints,presentation});if(cycle.result)state.done.add(state.step);if(action==='advance'&&state.step<5)state.step++;else if(action==='transfer'||action==='advance'){const dims=[[4,2],[3,2],[5,2],[3,3]],i=dims.findIndex(x=>x[0]===state.w&&x[1]===state.h);[state.w,state.h]=dims[(i+1)%dims.length];state.done=new Set();if(action==='advance')state.step=0;}resetStep();render();visualFocus();};
   $('visualRetry').onclick=()=>finish('retry');$('visualContinue').onclick=()=>finish(cycle.result?'advance':'transfer');
  }
 }
}
function areaChoicePicture(edge){return `<svg viewBox="0 0 110 64" aria-hidden="true"><rect x="12" y="10" width="86" height="44" fill="${edge?'white':'#8db8ff'}" stroke="${edge?'#2157da':'#244b85'}" stroke-width="${edge?8:3}"/></svg>`;}
function visualWork(){
 if(presentation!=='visual'||state.mode!=='learn')return;
 $('check').textContent='我做完了';$('hint').classList.add('hidden');$('task').querySelectorAll('.task-label').forEach(x=>x.classList.add('hidden'));
 const h=$('task').querySelector('h2');if(h)h.textContent=['鋪哪裡？','共有幾片？','一列一個數','每列 × 列數','長 × 寬','面積變了嗎？'][state.step];
 if(state.step===0)document.querySelectorAll('#task [data-choice]').forEach(b=>{b.innerHTML=areaChoicePicture(b.dataset.choice==='edge')+`<span>${b.dataset.choice==='edge'?'外面一圈':'裡面全部'}</span>`;});
}
function openVisualMonitor(){
 const d=$('visualDialog');d.innerHTML=`<h2 id="visualDialogTitle">${checks[state.step].replace('我檢查過','看看：')}</h2>${state.step>=3?`<p class="v-carry">邊長：${state.w} 公分、${state.h} 公分</p>`:''}<div class="v-snapshot">${$('boardFrame').outerHTML.replaceAll(/id="[^"]*"/g,'').replaceAll(/data-cell="[^"]*"/g,'').replaceAll('<button','<span').replaceAll('</button>','</span>')}</div><p class="v-answer">我的答案：${esc([...document.querySelectorAll('#task input,#task select')].map(x=>x.value?(x.tagName==='SELECT'?x.selectedOptions[0].text:x.value):'未填').join('、')|| (state.choice==='inside'?'裡面全部':state.choice==='edge'?'外面一圈':state.choice==='same'?'面積一樣':'還沒選'))}</p><div class="v-options">${visualCard('monitorOK','對好了','check')}${visualCard('monitorChange','要改一改','retry')}</div><button id="monitorClose" class="text-button">回去看看</button>`;
 const finish=finding=>{cycle.monitor.push(finding);state.self=true;record('SRL核對發現',{finding,answer:answerSnapshot(),responseMode,presentation});d.close();$('visualMonitor').focus();};$('monitorOK').onclick=()=>finish('對好了');$('monitorChange').onclick=()=>finish('要改一改');$('monitorClose').onclick=()=>d.close();d.showModal();
}
function stopDemo(){clearInterval(demoTimer);demoTimer=null;}
function openDemo(){
 if(state.mode!=='learn')return;stopDemo();demoFrame=0;state.hints++;record('圖像分步示範',{presentation,example:state.step===5?'1×3':'2×2',responseMode});
 const d=$('visualDialog');d.innerHTML=`<div class="dialog-top"><h2 id="visualDialogTitle">看一次，再試試</h2><button id="closeDemo">回去做</button></div><p class="v-demo-note">示範題：${state.step===5?'1 × 3':'2 × 2'}</p><div id="demoPicture"></div><p id="demoCaption" role="status"></p><div class="v-demo-controls"><button id="playDemo">${glyph('play')}播放</button><button id="stepDemo">下一格</button><button id="replayDemo">重看</button></div>`;
 const captions=[['一格放一片。','接著放下一片。','找到空格。','全部鋪滿。'],['點第一片，記1。','接著記2。','接著記3。','每片都數到，共4片。'],['第一列有2個。','第二列也有2個。','2加2等於4。','一列對應一個加數。'],['每列2個，共2列。','2加2，寫成2乘2。','2乘2等於4。','把因數對回每列和列數。'],['找兩個邊長。','2乘2。','4平方公分。','公分是邊長，平方公分是面積。'],['看原來的3片。','轉90度。','仍然是3片。','沒有增加或拿走。']][state.step];
 const draw=()=>{$('demoPicture').innerHTML=mathPicture(state.step,demoFrame);$('demoCaption').textContent=`${demoFrame+1} / 4　${captions[demoFrame]}`;$('stepDemo').disabled=demoFrame===3;};
 const halt=()=>{stopDemo();$('playDemo').innerHTML=glyph('play')+'播放';};
 const tick=()=>{if(demoFrame<3){demoFrame++;draw();}if(demoFrame===3)halt();};
 $('playDemo').onclick=()=>{if(demoTimer){halt();return;}if(demoFrame===3)demoFrame=0;draw();$('playDemo').innerHTML=glyph('pause')+'暫停';demoTimer=setInterval(tick,1600);};$('stepDemo').onclick=()=>{halt();tick();};$('replayDemo').onclick=()=>{halt();demoFrame=0;draw();};$('closeDemo').onclick=()=>{halt();d.close();$('visualDemo')?.focus();};d.onclose=stopDemo;draw();d.showModal();
}
function presentationSettings(testing){
 if(testing)return;const el=document.createElement('section');el.innerHTML=`<h3>呈現方式與數學難度分開設定</h3><label class="cycle-field">呈現模式<select id="presentationSelect"><option value="visual">圖像引導模式</option><option value="text">文字引導模式（基礎版1流程）</option></select></label><p>切換後從本步的新計畫開始，保留已記錄的歷程。下方長方形尺寸與起點另行設定。</p><button id="applyPresentation">切換模式</button><button id="teacherTestMode">進入獨立練習</button><p><a href="visual-guide.html" target="_blank">圖像模式使用說明</a></p>`;$('teacherBody').prepend(el);$('presentationSelect').value=presentation;$('applyPresentation').onclick=()=>{presentation=$('presentationSelect').value;record('切換呈現模式',{presentation});carry=null;resetStep();$('teacherDialog').close();render();titleFocus();};$('teacherTestMode').onclick=()=>{$('teacherDialog').close();requestMode('test');};
}

function record(type,detail={}){state.records.push({presentation,cycle:cycle?.id??0,w:state.w,h:state.h,time:new Date().toISOString(),mode:state.mode==='learn'?'教學':'獨立練習',step:state.mode==='learn'?steps[state.step][0]:state.test?'題本'+forms[state.test.form].name+' 第'+(state.test.q+1)+'題':'練習',type,...detail});}
function resetStep(){newCycle();state.tiles=new Set();state.counted=[];state.rows=new Set();state.choice=null;state.rotated=false;state.gridShown=false;state.hints=0;state.self=false;state.passed=false;}
function feedback(text,kind=''){ $('feedback').textContent=text;$('feedback').className=kind;}
function number(id,label){return `<input id="${id}" class="number-input" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="3" aria-label="${label}">`;}
function num(id){const v=$(id)?.value.trim();return v&&/^\d+$/.test(v)?Number(v):null;}
function button(id,label,cls=''){return `<button id="${id}" class="${cls}">${label}</button>`;}
function setChoice(value){state.choice=value;document.querySelectorAll('[data-choice]').forEach(b=>{const active=b.dataset.choice===value;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});if(state.mode==='learn')invalidate();}
function choices(values){return values.map(([key,label])=>`<button class="choice${state.choice===key?' selected':''}" data-choice="${key}" aria-pressed="${state.choice===key}">${label}</button>`).join('');}
function bindChoices(){document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>setChoice(b.dataset.choice));}
function invalidate(){state.passed=false;$('next')&&($('next').disabled=true);feedback('');}
function cellSize(cols,rows){const available=Math.max(160,$('boardWrap').clientWidth-108);return Math.max(28,Math.min(62,Math.floor(available/Math.max(cols,rows))));}
function drawBoard(w=state.w,h=state.h,{grid=true,labels=false,action=null,filled=true}={}){
 const board=$('board');board.innerHTML='';board.style.setProperty('--cols',w);board.style.setProperty('--rows',h);board.style.setProperty('--cell',cellSize(w,h)+'px');board.className=grid?'':'no-grid';
 $('lengthLabel').textContent=labels?w+' 公分':'';$('widthLabel').textContent=labels?h+' 公分':'';
 for(let i=0;i<w*h;i++){const cell=document.createElement(action?'button':'div');cell.className='cell';if(!action)cell.classList.add('static');cell.dataset.cell=i;
 const r=Math.floor(i/w),isTile=state.step===0&&state.mode==='learn'?state.tiles.has(i):filled;
 if(isTile)cell.classList.add('tile');
 if(state.mode==='learn'&&state.step===1){let idx=state.counted.indexOf(i);if(idx>=0){cell.classList.add('counted');cell.textContent=idx+1;}}
 if(state.mode==='learn'&&state.step===2&&state.rows.has(r))cell.classList.add('row-active');
 cell.setAttribute('aria-label',`第${r+1}列第${i%w+1}格${action==='place'?(isTile?'，已放方塊':'，空格'):action==='count'?(state.counted.includes(i)?'，已數過':'，尚未數過'):''}`);
 if(action){cell.onclick=()=>{if(action==='place')place(i,true);else if(action==='count'){const old=state.counted.indexOf(i);if(old<0)state.counted.push(i);else state.counted.splice(old,1);invalidate();drawCurrentBoard();$('boardCaption').textContent=`已做記號：${state.counted.length} 片`;focusCell(i);}else if(action==='row')selectRow(r);};}
 board.append(cell);}
}
function focusCell(i){$('board').querySelector(`[data-cell="${i}"]`)?.focus({preventScroll:true});}
function place(i,toggle=false){if(state.mode!=='learn'||state.step!==0)return;if(toggle&&state.tiles.has(i))state.tiles.delete(i);else state.tiles.add(i);invalidate();drawCurrentBoard();$('boardCaption').textContent=state.tiles.size===state.w*state.h?'已經鋪滿了。請檢查，再按「檢查答案」。':'每個位置放一片，讓裡面沒有空隙。';if(toggle)focusCell(i);}
function selectRow(r){state.rows.add(r);invalidate();drawCurrentBoard();document.querySelectorAll('[data-row]').forEach(b=>b.setAttribute('aria-pressed',state.rows.has(Number(b.dataset.row))));$('boardCaption').textContent=`第 ${r+1} 列有 ${state.w} 個。`;}
function drawCurrentBoard(){if(state.mode==='test'){drawTestBoard();return;}let s=state.step;drawBoard(state.rotated?state.h:state.w,state.rotated?state.w:state.h,{grid:s<4||state.gridShown||s===5,labels:s>=3,action:s===0?'place':s===1?'count':s===2?'row':null,filled:true});}
function titleFocus(){ $('title').focus({preventScroll:true}); }
function render(){
 stopDemo();document.body.classList.toggle('visual-mode',presentation==='visual'&&state.mode==='learn');
 $('read').textContent=state.mode==='learn'?'朗讀這一階段':'朗讀題目';$('learnMode').classList.toggle('active',state.mode==='learn');$('testMode').classList.toggle('active',state.mode==='test');$('learnMode').setAttribute('aria-pressed',state.mode==='learn');$('testMode').setAttribute('aria-pressed',state.mode==='test');
 $('steps').classList.toggle('hidden',state.mode==='test');$('reflection').classList.toggle('hidden',state.mode==='test');$('reset').classList.toggle('hidden',state.mode==='test');$('boardTag').textContent=state.mode==='learn'?'操作區':'獨立作答';$('boardActions').innerHTML='';$('boardCaption').textContent='';feedback('');
 $('boardWrap').classList.remove('hidden');$('unitNote').textContent='每個小正方形代表 1 平方公分';
 $('cyclePanel').classList.toggle('hidden',state.mode==='test');document.querySelector('.workgrid').classList.remove('hidden');if(state.mode==='test'){document.querySelector('.workgrid').inert=false;renderTest();return;}
 $('lessonLabel').textContent=`目前教材：每列 ${state.w} 個，共 ${state.h} 列`;
 $('steps').innerHTML=steps.map((s,i)=>`<button class="step ${i===state.step?'current':''} ${state.done.has(i)?'done':''}" data-step="${i}" ${i>0&&!state.done.has(i-1)&&i!==state.step?'disabled':''} ${i===state.step?'aria-current="step"':''}><b>${state.done.has(i)?'✓':i+1}</b>${s[0]}</button>`).join('');
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{state.step=Number(b.dataset.step);resetStep();render();titleFocus();});
 $('eyebrow').textContent=`一起學 / ${state.step+1} 共 6 步`;$('title').textContent=steps[state.step][1];$('instruction').textContent=steps[state.step][2];
 $('selfCheck').textContent=checks[state.step];$('selfCheck').setAttribute('aria-pressed',state.self);$('selfNote').textContent=state.self?'已記下你的自我檢查。':'';
 const s=state.step;
 if(s===0){$('task').innerHTML='<h2>我們要鋪哪裡？</h2>'+choices([['inside','長方形裡面全部'],['edge','沿著外面一圈']]);$('boardActions').innerHTML=button('tileSource','＋ 1 平方公分方塊','tile-source');$('boardCaption').textContent='點格子放方塊，也可以把這片拖到空格。';$('tileSource').setAttribute('aria-label','加入一片方塊，按一下放到第一個空格，或拖曳到空格');$('tileSource').onclick=()=>{for(let i=0;i<state.w*state.h;i++)if(!state.tiles.has(i)){place(i);break;}};bindDrag();}
 if(s===1)$('task').innerHTML=`<h2>一共有幾片？</h2><p class="task-label">每片都做過記號後，填入總數。</p><div class="fieldline">一共有 ${number('total','小正方形總數')} 片</div><div class="fieldline">每片代表 1 平方公分。</div>`;
 if(s===2){$('task').innerHTML=`<h2>每一列都要算進來</h2><p class="task-label">一列對應加法中的一個數。</p><div class="equation small">${Array.from({length:state.h},(_,i)=>number('add'+i,'第'+(i+1)+'列個數')).join('<span>＋</span>')}<span>＝</span>${number('sum','加法總和')}</div>`;$('boardActions').innerHTML='<div class="row-buttons">'+Array.from({length:state.h},(_,i)=>`<button data-row="${i}" aria-pressed="false">第 ${i+1} 列</button>`).join('')+'</div>';document.querySelectorAll('[data-row]').forEach(b=>b.onclick=()=>selectRow(Number(b.dataset.row)));}
 if(s===3)$('task').innerHTML=`<h2>${Array(state.h).fill(state.w).join(' ＋ ')} 可以寫成乘法</h2><div class="fieldline">每列 ${number('perRow','每列個數')} 個</div><div class="fieldline">共有 ${number('rowCount','列數')} 列</div><div class="equation">${number('factor1','乘法第一個數')} × ${number('factor2','乘法第二個數')} ＝ ${number('product','乘積')}</div><p class="task-label">面積的單位是平方公分。</p>`;
 if(s===4){$('task').innerHTML=`<h2>長方形面積 ＝ 長 × 寬</h2><div class="equation">${number('factor1','長或第一個因數')} × ${number('factor2','寬或第二個因數')} ＝ ${number('product','面積數值')}</div><label for="unit">答案的單位</label><div class="fieldline"><select id="unit"><option value="">請選擇</option><option value="cm">公分</option><option value="cm2">平方公分</option></select></div>`;$('unitNote').textContent='依標示的邊長計算，不量螢幕上的圖。';$('boardActions').innerHTML=button('showGrid','顯示方格幫我檢查');$('showGrid').onclick=()=>{state.gridShown=!state.gridShown;if(state.gridShown){state.hints++;record('顯示方格支持',{level:2});}drawCurrentBoard();$('showGrid').textContent=state.gridShown?'收起方格':'顯示方格幫我檢查';};}
 if(s===5){$('task').innerHTML='<h2>裡面的大小改變了嗎？</h2>'+choices([['same','面積一樣'],['different','面積不一樣']])+`<div class="fieldline">面積是 ${number('total','旋轉後面積')} 平方公分</div>`;$('boardActions').innerHTML=button('rotate','轉 90 度');$('rotate').onclick=()=>{state.rotated=!state.rotated;record('旋轉操作');invalidate();drawCurrentBoard();$('boardCaption').textContent='只有轉方向，沒有增加或拿走方塊。';};}
 $('actionBar').innerHTML=button('check','檢查答案','primary')+button('hint','給我一個提示')+`<button id="next" disabled>${s===5?'完成這次學習':'下一步'}</button>`;
 $('check').onclick=checkLearning;$('hint').onclick=()=>{state.hints++;record('短句提示',{level:1});feedback(hints[state.step]);};$('next').onclick=()=>{if(!state.passed)return;if(state.step===5){feedback('六個步驟完成了！換一個長方形練習，或選「自己試試」。','success');$('next').disabled=true;record('教學六步完成');}else{state.step++;resetStep();render();titleFocus();}};
 bindChoices();document.querySelectorAll('#task input,#task select').forEach(el=>el.addEventListener('input',invalidate));drawCurrentBoard();renderCycle();
}
function checkLearning(){
 const total=state.w*state.h,s=state.step;let ok=false,why='再看看這一步，或選「給我一個提示」。';
 if(s===0){ok=state.tiles.size===total&&state.choice==='inside';why=state.choice!=='inside'?'面積要看鋪滿哪裡？請再選一次。':'裡面還有空格，先把它鋪滿。';}
 if(s===1){ok=state.counted.length===total&&num('total')===total;why=state.counted.length!==total?'還有方塊沒有做記號。':'請照著方塊上的記號，再核對總數。';}
 if(s===2){ok=state.rows.size===state.h&&Array.from({length:state.h},(_,i)=>num('add'+i)).every(x=>x===state.w)&&num('sum')===total;why=state.rows.size!==state.h?'先點每一列，確認沒有漏掉。':'請把每個加數，對回圖上的一列。';}
 if(s===3||s===4){const a=num('factor1'),b=num('factor2');ok=((a===state.w&&b===state.h)||(a===state.h&&b===state.w))&&num('product')===total;
 if(s===3){ok=ok&&num('perRow')===state.w&&num('rowCount')===state.h;why='先核對每列個數和列數，再核對乘法。';}
 else{ok=ok&&$('unit').value==='cm2';why='請核對圖上的兩個邊長、乘積和面積單位。';}}
 if(s===5){ok=state.rotated&&state.choice==='same'&&num('total')===total;why=!state.rotated?'請先按「轉 90 度」，再觀察。':'轉方向沒有增加或減少，請再核對面積。';}
 cycle.attempts++;cycle.result=ok;record('教學檢核',{correct:ok,hints:state.hints,selfReportedCheck:state.self,answer:answerSnapshot(),attempt:cycle.attempts});state.passed=ok;if(ok){feedback(s===0?'裡面鋪滿了，而且沒有空隙。請回顧目標，再決定下一步。':s===2?'每一列都算進來了。請回顧這次的方法，再連到乘法。':'這一步完成了。請回顧目標與方法，再決定下一步。','success');$('next').disabled=false;}else feedback(why,'error');cycle.feedback=$('feedback').textContent;cycle.phase='reflect';renderCycle();if(presentation==='visual')visualFocus();else $('reflectionResult').focus();
}
function bindDrag(){const src=$('tileSource');let startX=0,startY=0,moved=false;src.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;moved=false;startX=e.clientX;startY=e.clientY;src.classList.add('dragging');src.setPointerCapture(e.pointerId);});src.addEventListener('pointermove',e=>{if(dragging&&Math.hypot(e.clientX-startX,e.clientY-startY)>8)moved=true;});src.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}},true);src.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;src.classList.remove('dragging');if(moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');if(target)place(Number(target.dataset.cell));}});src.addEventListener('pointercancel',()=>{dragging=false;src.classList.remove('dragging');});}
function enterTest(){state.mode='test';state.test=null;state.choice=null;render();titleFocus();}
function requestMode(mode){if(mode===state.mode)return;const action=()=>{if(state.mode==='test'&&state.test&&!state.test.finished)record('提前結束練習',{completed:state.test.answers.length});state.mode=mode;if(mode==='learn')resetStep();else state.test=null;state.choice=null;render();titleFocus();};if(state.mode==='test'&&state.test&&!state.test.finished){pendingAction=action;$('confirmDialog').showModal();}else action();}
function renderTest(){
 const t=state.test;$('lessonLabel').textContent='作答中不提示答案，全部完成後看結果';$('unitNote').textContent='圖是放大示意。';$('eyebrow').textContent='自己試試';
 if(!t){$('title').textContent='試著自己完成 5 題';$('instruction').textContent='你可以按「朗讀題目」。作答時不會出現提示或對錯回饋。';drawBoard(4,2,{grid:false,labels:false});$('task').innerHTML='<h2>準備好再開始</h2><p class="task-label">先選一份練習。每題作答後按「送出這題」。不用輸入姓名。</p><label for="testForm">練習題本</label><div class="fieldline"><select id="testForm"><option value="0">A</option><option value="1">B</option><option value="2">C</option></select></div>';$('actionBar').innerHTML=button('startTest','開始 5 題練習','primary');$('startTest').onclick=()=>{state.test={form:Number($('testForm').value),q:0,answers:[],started:Date.now(),finished:false};state.choice=null;record('開始練習');render();titleFocus();};return;}
 if(t.finished){showResults();return;}
 const f=forms[t.form],q=t.q;state.choice=null;$('eyebrow').textContent=`自己試試 / 題本 ${f.name} / 第 ${q+1} 題，共 5 題`;
 const titles=['面積要看哪裡？','數出面積','用加法表示','用乘法求面積','轉方向後想一想'];
 const prompts=['要鋪地板，是鋪長方形的哪裡？','每小格代表 1 平方公分。面積是多少？',`每列有 ${f.add[0]} 個小正方形，共有 ${f.add[1]} 列。請用重複加法算出總數。`,`長 ${f.rect[0]} 公分、寬 ${f.rect[1]} 公分的長方形。請用乘法求面積。`,'上一題的長方形轉 90 度，沒有剪掉，也沒有加上。面積會改變嗎？'];
 $('title').textContent=titles[q];$('instruction').textContent=prompts[q];drawTestBoard();
 if(q===0)$('task').innerHTML=choices([['inside','裡面全部'],['edge','外面一圈']]);
 if(q===1)$('task').innerHTML=`<h2>填入答案</h2><div class="fieldline">面積 ${number('testTotal','面積數值')} 平方公分</div>`;
 if(q===2)$('task').innerHTML=`<h2>寫出重複加法</h2><div class="equation small">${Array.from({length:f.add[1]},(_,i)=>number('testAdd'+i,'加數'+(i+1))).join(' ＋ ')} ＝ ${number('testTotal','加法總和')}</div>`;
 if(q===3)$('task').innerHTML=`<h2>算式與單位</h2><div class="equation">${number('testA','第一個因數')} × ${number('testB','第二個因數')} ＝ ${number('testTotal','面積數值')}</div><label for="testUnit">單位</label><div class="fieldline"><select id="testUnit"><option value="">請選擇</option><option value="cm">公分</option><option value="cm2">平方公分</option></select></div>`;
 if(q===4)$('task').innerHTML=choices([['change','會改變'],['same','不會改變']]);
 $('actionBar').innerHTML=button('submitTest','送出這題','primary')+button('skipTest','這題先不作答');bindChoices();$('submitTest').onclick=()=>submitTest(false);$('skipTest').onclick=()=>submitTest(true);
}
function drawTestBoard(){const t=state.test;if(!t||t.finished)return;const f=forms[t.form];$('boardWrap').classList.toggle('hidden',t.q===2);$('boardCaption').textContent=t.q===2?'請依上方的每列個數與列數作答。':'';if(t.q===1)drawBoard(...f.count,{grid:true,labels:false});else if(t.q===3)drawBoard(...f.rect,{grid:false,labels:true});else if(t.q===4){drawBoard(f.rect[1],f.rect[0],{grid:false,labels:true});}else drawBoard(4,2,{grid:false,labels:false});}
function submitTest(skip){const t=state.test,f=forms[t.form],q=t.q;let answer,correct=false,complete=false;
 if(q===0||q===4){answer=state.choice;complete=!!answer;correct=answer===(q===0?'inside':'same');}
 if(q===1){answer=num('testTotal');complete=answer!==null;correct=answer===f.count[0]*f.count[1];}
 if(q===2){answer={add:Array.from({length:f.add[1]},(_,i)=>num('testAdd'+i)),sum:num('testTotal')};complete=answer.sum!==null&&answer.add.every(x=>x!==null);correct=answer.sum===f.add[0]*f.add[1]&&answer.add.every(x=>x===f.add[0]);}
 if(q===3){answer={a:num('testA'),b:num('testB'),total:num('testTotal'),unit:$('testUnit').value};complete=answer.a!==null&&answer.b!==null&&answer.total!==null&&!!answer.unit;correct=((answer.a===f.rect[0]&&answer.b===f.rect[1])||(answer.a===f.rect[1]&&answer.b===f.rect[0]))&&answer.total===f.rect[0]*f.rect[1]&&answer.unit==='cm2';}
 if(!skip&&!complete){feedback('請完成作答，或選「這題先不作答」。');return;}
 t.answers.push({q:q+1,answer:skip?null:answer,correct:skip?false:correct,skipped:skip});record('獨立作答',{answer:skip?null:answer,correct:skip?false:correct,skipped:skip});
 if(q===4){t.finished=true;t.elapsed=Math.round((Date.now()-t.started)/1000);record('完成練習',{score:t.answers.filter(x=>x.correct).length,seconds:t.elapsed});}else t.q++;
 state.choice=null;render();titleFocus();
}
function showResults(){const t=state.test,score=t.answers.filter(x=>x.correct).length;$('title').textContent='這次練習完成了';$('instruction').textContent='和老師一起看看，哪些步驟已經會了。';$('boardWrap').classList.remove('hidden');drawBoard(4,2,{grid:true,labels:false});$('boardCaption').textContent='可以回到「一起學」，再操作需要練習的步驟。';$('task').innerHTML=`<div class="summary"><strong>${score} / 5</strong><p>題本 ${forms[t.form].name} · ${Math.floor(t.elapsed/60)} 分 ${t.elapsed%60} 秒</p><ul>${['面積是內部','單位面積計數','等量累加','長乘寬與單位','旋轉後面積'].map((label,i)=>`<li>${label}：${t.answers[i].skipped?'未作答':t.answers[i].correct?'完成':'再練習'}</li>`).join('')}</ul></div>`;$('actionBar').innerHTML=button('backLearn','回到一起學','primary')+button('anotherTest','換一份練習');$('task').insertAdjacentHTML('beforeend',selectField('reviewStage','看過結果後，我要再練習',steps.map((x,i)=>[i,x[0]])));$('backLearn').onclick=()=>{if(!$('reviewStage').value){feedback('先選你想再練習的步驟。');return;}state.step=Number($('reviewStage').value);record('評量後選擇學習重點',{nextStep:steps[state.step][0],score});carry=null;requestMode('learn');};$('anotherTest').onclick=()=>{state.test=null;render();};$('unitNote').textContent='本次練習結果只供教學參考。';}
function teacher(){const testing=state.mode==='test'&&state.test&&!state.test.finished;
 $('teacherBody').innerHTML=`<p>先鋪滿與累加，理解後才進入乘法。可以使用兩節各 40 分鐘，未熟練就增加操作時間。</p>${testing?'<p class="locked">目前正在獨立作答。教材設定與教學提示已鎖定；請完成或離開練習後再調整。</p>':`<div class="teacher-grid"><div><label for="sizeSelect">教學長方形</label><select id="sizeSelect"><option value="4,2">4 × 2 · 核心示範</option><option value="3,2">3 × 2 · 新例練習</option><option value="3,3">3 × 3 · 等量累加</option><option value="5,2">5 × 2 · 類化練習</option></select></div><div><label for="stageSelect">教師指定起點</label><select id="stageSelect">${steps.map((s,i)=>`<option value="${i}">${i+1} ${s[0]}</option>`).join('')}</select></div></div><div class="dialog-actions">${button('applySettings','套用教材','primary')}</div>`}
 <details><summary>網頁操作如何接續原教案</summary><ul><li>第一節：鋪一鋪、數一數、一列一列加。第二節：寫成乘法，再依表現進入長乘寬與旋轉。</li><li>每格自動吸附，只能放一片；這是操作支持，不能據此判定學生已能自行避免重疊。</li><li>「核對發現」是學生自述與操作快照，是否自發且實際核對仍由教師觀察。接受提示或重試後成功不等於首次獨立成功。</li><li>數字輸入可由教師依學生口述代輸入，從第一次起固定回應方式並自行註記。</li><li>無生成式AI；提示都是固定教學短句。朗讀依裝置可用的中文語音。</li></ul></details>
 <details><summary>獨立練習與研究使用</summary><p>A、B、C各5題，分別檢查面積概念、點數、累加、乘法與旋轉。作答中不給對錯提示，不提供方塊操作或策略卡；結束後才顯示結果。數字輸入、加法空格及朗讀均為本網頁的固定回應條件，與紙本版本不同，不能直接混合解釋分數。</p><p>本版本不設強制10分鐘截止，會記錄實際耗時；若研究要求10分鐘，請由教師計時並到時結束施測。題本未經等值與效度驗證，不能單憑5題結果宣稱精熟或研究成效；完整研究仍需另建題庫與基線。</p></details>
 <div id="teacherCycleTools"></div><p><a href="guide.html" target="_blank">UDL 設計規準、檢核表與 SRL 實施手冊</a></p><h3>本次瀏覽的紀錄 · ${state.records.length} 筆</h3><p>只保留在這次開啟的頁面，重新整理或關閉就清除。不輸入姓名、不上傳學生紀錄。需要保存時，請先下載CSV。</p><div class="dialog-actions">${button('export','下載本次紀錄 CSV')}${button('clearRecords','清除本次紀錄')}</div><div class="records"><table><thead><tr><th>時間</th><th>步驟</th><th>行為</th><th>結果</th></tr></thead><tbody>${state.records.slice(-30).reverse().map(r=>`<tr><td>${r.time}</td><td>${r.step}</td><td>${r.type}</td><td>${r.correct===undefined?'':r.correct?'正確':'再練習'}${r.hints===undefined?'':'／提示'+r.hints+'次'}</td></tr>`).join('')}</tbody></table></div>`;
 if(!testing){$('sizeSelect').value=state.w+','+state.h;$('stageSelect').value=state.step;$('applySettings').onclick=()=>{const [w,h]=$('sizeSelect').value.split(',').map(Number);state.w=w;state.h=h;state.step=Number($('stageSelect').value);state.done=new Set();state.mode='learn';state.test=null;resetStep();record('教師設定教材',{w,h,start:state.step+1});$('teacherDialog').close();render();titleFocus();};}
 presentationSettings(testing);teacherCycleTools(testing);$('export').onclick=exportCSV;$('clearRecords').onclick=()=>{if(state.records.length&&!$('clearRecords').dataset.confirm){$('clearRecords').dataset.confirm='yes';$('clearRecords').textContent='確定清除紀錄';return;}state.records=[];teacher();};if(!$('teacherDialog').open)$('teacherDialog').showModal();}
function exportCSV(){const headers=['時間','模式','步驟','行為','是否正確','提示次數','學生自述檢查','作答內容','其他'];const rows=state.records.map(r=>[r.time,r.mode,r.step,r.type,r.correct??'',r.hints??'',r.selfReportedCheck??'',JSON.stringify(r.answer??''),JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>!['time','mode','step','type','correct','hints','selfReportedCheck','answer'].includes(k))))]);const csv='\uFEFF'+[headers,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='長方形面積_本次教學紀錄.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('learnMode').onclick=()=>requestMode('learn');$('testMode').onclick=()=>requestMode('test');$('teacher').onclick=teacher;$('closeTeacher').onclick=()=>$('teacherDialog').close();$('reset').onclick=()=>{record('重做本步');resetStep();render();};$('selfCheck').onclick=()=>{state.self=!state.self;$('selfCheck').setAttribute('aria-pressed',state.self);$('selfNote').textContent=state.self?'已記下你的自我檢查。':'';record('學生自述檢查',{checked:state.self});};
 $('stay').onclick=()=>{$('confirmDialog').close();pendingAction=null;};$('leave').onclick=()=>{$('confirmDialog').close();pendingAction?.();pendingAction=null;};
 $('read').onclick=()=>{if(!('speechSynthesis' in window)){feedback('這個瀏覽器沒有語音朗讀，請由教師讀題。');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('title').textContent+'。'+$('instruction').textContent+(state.mode==='learn'?'。'+$('cycleBody').textContent:''));u.lang='zh-TW';u.rate=.85;const voice=speechSynthesis.getVoices().find(v=>/zh[-_]TW/i.test(v.lang))||speechSynthesis.getVoices().find(v=>/^zh/i.test(v.lang));if(voice)u.voice=voice;u.onerror=()=>feedback('目前無法朗讀，請由教師讀題。');speechSynthesis.speak(u);record('題目朗讀');};
 $('visualDialog').addEventListener('close',()=>{stopDemo();$('visualDialog').innerHTML='';});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.mode==='learn'||state.test&&!state.test.finished)drawCurrentBoard();},150);});newCycle();render();
})();

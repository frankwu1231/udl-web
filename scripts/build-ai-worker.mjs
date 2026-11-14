import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),publicDir=path.join(root,'public'),dist=path.join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf'};
const files=fs.readdirSync(publicDir,{withFileTypes:true}).filter(x=>x.isFile()&&mime[path.extname(x.name)]);
const map=files.map(f=>['/'+f.name,[mime[path.extname(f.name)],fs.readFileSync(path.join(publicDir,f.name)).toString('base64')]]);
const defaults=JSON.parse(fs.readFileSync(path.join(root,'lesson-defaults.json'),'utf8'));
// 第 26 版：錯誤觀察代碼只寫在 public/observations.js 一個地方，伺服器（AI 摘要）也用同一份
const obsBox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(publicDir,'observations.js'),'utf8'),obsBox);
const obs=Object.fromEntries(Object.entries(obsBox.window.areaObs.OBS).map(([k,v])=>[k,v[0]]));
// 第 27 版：教材包（活動代號、探試題型比例）也只寫在 public/content-*.js，伺服器用同一份
// 好幾個教材包時依檔名順序載入；content-area.js（面積）是第一個，也是沒有指定時的預設
const pkgBox={window:{}};for(const f of fs.readdirSync(publicDir).filter(n=>/^content-[a-z]+\.js$/.test(n)).sort((a,b)=>(a!=='content-area.js')-(b!=='content-area.js')||a.localeCompare(b)))vm.runInNewContext(fs.readFileSync(path.join(publicDir,f),'utf8'),pkgBox);
const pkgInfo=Object.values(pkgBox.window.lessonPackages).map(p=>({id:p.id,actIds:p.activities.map(a=>a.id),paths:Object.keys(p.paths),probeTypes:p.probeTypes,probeVariants:p.probeVariants||null}));
if(new Set(pkgInfo.flatMap(p=>p.actIds)).size!==pkgInfo.flatMap(p=>p.actIds).length)throw new Error('Activity ids repeat across lesson packages');
const source=fs.readFileSync(path.join(root,'worker/index.js'),'utf8').replace('__ASSET_MAP__',JSON.stringify(map)).replace('__LESSON_DEFAULTS__',JSON.stringify(defaults)).replace('__OBS_LABELS__',JSON.stringify(obs)).replace('__LESSON_PACKAGE__',JSON.stringify(pkgInfo));
if(source.includes('__ASSET_MAP__')||source.includes('__LESSON_DEFAULTS__')||source.includes('__OBS_LABELS__')||source.includes('__LESSON_PACKAGE__'))throw new Error('Asset map or lesson defaults replacement failed');
fs.mkdirSync(path.join(dist,'server'),{recursive:true});fs.mkdirSync(path.join(dist,'.openai'),{recursive:true});
fs.writeFileSync(path.join(dist,'server/index.js'),source);fs.copyFileSync(path.join(root,'.openai/hosting.json'),path.join(dist,'.openai/hosting.json'));
fs.cpSync(path.join(root,'drizzle'),path.join(dist,'drizzle'),{recursive:true});
console.log(`Built Worker with ${files.length} lesson assets`);

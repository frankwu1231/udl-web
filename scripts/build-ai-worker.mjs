import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),publicDir=path.join(root,'public'),dist=path.join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf'};
const files=fs.readdirSync(publicDir,{withFileTypes:true}).filter(x=>x.isFile()&&mime[path.extname(x.name)]);
const map=files.map(f=>['/'+f.name,[mime[path.extname(f.name)],fs.readFileSync(path.join(publicDir,f.name)).toString('base64')]]);
const defaults=JSON.parse(fs.readFileSync(path.join(root,'lesson-defaults.json'),'utf8'));
// 第 26 版：錯誤觀察代碼只寫在 public/observations.js 一個地方，伺服器（AI 摘要）也用同一份
const obsBox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(publicDir,'observations.js'),'utf8'),obsBox);
const obs=Object.fromEntries(Object.entries(obsBox.window.areaObs.OBS).map(([k,v])=>[k,v[0]]));
const source=fs.readFileSync(path.join(root,'worker/index.js'),'utf8').replace('__ASSET_MAP__',JSON.stringify(map)).replace('__LESSON_DEFAULTS__',JSON.stringify(defaults)).replace('__OBS_LABELS__',JSON.stringify(obs));
if(source.includes('__ASSET_MAP__')||source.includes('__LESSON_DEFAULTS__')||source.includes('__OBS_LABELS__'))throw new Error('Asset map or lesson defaults replacement failed');
fs.mkdirSync(path.join(dist,'server'),{recursive:true});fs.mkdirSync(path.join(dist,'.openai'),{recursive:true});
fs.writeFileSync(path.join(dist,'server/index.js'),source);fs.copyFileSync(path.join(root,'.openai/hosting.json'),path.join(dist,'.openai/hosting.json'));
fs.cpSync(path.join(root,'drizzle'),path.join(dist,'drizzle'),{recursive:true});
console.log(`Built Worker with ${files.length} lesson assets`);

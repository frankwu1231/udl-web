// Uses the existing approved key in memory. Never prints the key or provider request.
import fs from 'node:fs';
import worker from '../dist/server/index.js';
const text=fs.readFileSync(new URL('../.env.local',import.meta.url),'utf8');
const raw=text.match(/^OPENAI_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim();
const key=raw?.replace(/^['"]|['"]$/g,'');
if(!key)throw new Error('Existing key is not configured');
for(const [shape,step,operationComplete] of [['rectangle',1,true],['triangle',3,true]]){
 const body={kind:'hint',shape,cycle:1,step,method:'mark',goal:'check',hints:1,errors:1,incorrect:true,operationComplete,comparisonOpened:false,issue:shape==='triangle'?'height':'count'};
 const response=await worker.fetch(new Request('https://local-check.example/api/ai-support',{method:'POST',headers:{origin:'https://local-check.example','content-type':'application/json','oai-authenticated-user-id':'approved-local-check','oai-authenticated-user-email':'approved@example.test'},body:JSON.stringify(body)}),{OPENAI_API_KEY:key,TEACHER_EMAIL:'approved@example.test'});
 const result=await response.json();console.log(JSON.stringify({shape,status:response.status,...result}));
}

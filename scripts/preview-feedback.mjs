// Local QA only: in-memory lessons and a fake owner; no production database or keys.
import http from 'node:http';
import worker from '../dist/server/index.js';
import {makeD1} from './d1-sqlite.mjs';
const env={TEACHER_EMAIL:'preview@example.test',DB:makeD1(),TEST_SESSION_SECRET:'local-preview-only-'+Math.random().toString(36).slice(2)};
// 第 24 版：瀏覽器帶 preview_guest=1 的 cookie 時，不假裝是老師（用來看學生入口頁）
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers);if(!/preview_guest=1/.test(req.headers.cookie||'')){headers.set('oai-authenticated-user-id','local-preview');headers.set('oai-authenticated-user-email','preview@example.test');}const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end(error.message);}}).listen(4173,'127.0.0.1',()=>console.log('Local QA: http://127.0.0.1:4173/seven.html'));

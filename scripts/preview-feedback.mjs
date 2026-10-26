// Local QA only: in-memory lessons and a fake owner; no production database or keys.
import http from 'node:http';
import worker from '../dist/server/index.js';
import {makeD1} from './d1-sqlite.mjs';
const env={TEACHER_EMAIL:'preview@example.test',DB:makeD1()};
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview');headers.set('oai-authenticated-user-email','preview@example.test');const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end(error.message);}}).listen(4173,'127.0.0.1',()=>console.log('Local QA: http://127.0.0.1:4173/seven.html'));

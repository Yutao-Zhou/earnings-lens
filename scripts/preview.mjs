import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from '../lib/data.mjs';
const port=Number(process.env.PORT ?? 4173);
const server=createServer(async(request,response)=>{
  if(!['/','/index.html'].includes(new URL(request.url,'http://localhost').pathname)) {response.writeHead(404).end('Not found');return;}
  try {const html=await readFile(path.join(projectRoot,'dist/index.html'));response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);}
  catch {response.writeHead(503).end('Run npm run build first.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));

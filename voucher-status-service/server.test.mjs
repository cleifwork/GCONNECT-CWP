import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';

test('HTTP validation rejects malformed bodies, hostile origins and excess requests', async () => {
  const reservation=net.createServer();
  reservation.listen(0,'127.0.0.1'); await once(reservation,'listening');
  const port=reservation.address().port; await new Promise(r=>reservation.close(r));
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,
    OC200_URL:'https://127.0.0.1:1',OMADA_ID:'test',SITE_ID:'test',CLIENT_ID:'test',CLIENT_SECRET:'test',
    ALLOWED_ORIGINS:'http://portal.example',PORT:String(port),NODE_TLS_REJECT_UNAUTHORIZED:'1'}});
  try {
    await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server failed to start');}),new Promise((_,r)=>setTimeout(()=>r(Error('Startup timeout')),5000).unref())]);
    const url=`http://127.0.0.1:${port}/voucher-status`;
    assert.equal((await fetch(url)).status,405);
    assert.equal((await fetch(url,{method:'POST',headers:{Origin:'http://evil.example'}})).status,403);
    assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'http://portal.example'}})).status,204);
    const post=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
    assert.equal((await post('null')).status,400);
    assert.equal((await post('{')).status,400);
    assert.equal((await post(JSON.stringify({code:'!'}))).status,400);
    assert.equal((await post('x'.repeat(1025))).status,413);
    await post('{}');await post('{}');
    const limited=await post('{}');assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');
  } finally {child.kill();await once(child,'exit');}
});

test('overlapping uploads allow only one controller lookup', async () => {
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {pathToFileURL}=await import('node:url');
  const dir=await mkdtemp(join(tmpdir(),'gconnect-test-'));
  await writeFile(join(dir,'mock.mjs'),`globalThis.fetch=async(url)=>{await new Promise(r=>setTimeout(r,150));return {ok:true,json:async()=>({errorCode:0,result:String(url).includes('authorize')?{accessToken:'mock'}:{data:[],totalRows:0}})}};`);
  const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const port=reservation.address().port;await new Promise(r=>reservation.close(r));
  const child=spawn(process.execPath,['--import',pathToFileURL(join(dir,'mock.mjs')).href,'server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,OC200_URL:'https://controller.example',OMADA_ID:'test',SITE_ID:'test',CLIENT_ID:'test',CLIENT_SECRET:'test',ALLOWED_ORIGINS:'http://portal.example',PORT:String(port),NODE_TLS_REJECT_UNAUTHORIZED:'1'}});
  try{
    await once(child.stdout,'data');
    const {request}=await import('node:http');
    function upload(){let req;const response=new Promise(resolve=>{req=request({hostname:'127.0.0.1',port,path:'/voucher-status',method:'POST',headers:{'Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.write('{"code":');});return {req,response};}
    const a=upload(),b=upload();
    await new Promise(r=>setTimeout(r,30));a.req.end('"12345678"}');b.req.end('"12345678"}');
    assert.deepEqual((await Promise.all([a.response,b.response])).sort(),[200,429]);
  }finally{child.kill();await once(child,'exit');await rm(dir,{recursive:true,force:true});}
});

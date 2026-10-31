import test from 'node:test';
import assert from 'node:assert/strict';
import {detectVoucher} from './autofill.mjs';
const client={ip:'192.168.10.100',mac:'DE-1F-B1-32-5C-BD',ssid:'GCONNECT WIFI',wireless:true,active:true,authStatus:2,blocked:false};
const record={...client,valid:true,authType:3,voucherCode:'12345678'};
function run({clients=[client],current=client,records=[record],last=current,remoteAddress='192.168.10.100'}={}) {
 let calls=0,details=0;
 return {get calls(){return calls;},result:detectVoucher({site:'/site',remoteAddress,api:async path=>{
   calls++;
   if(path.startsWith('/site/clients?'))return {data:clients,totalRows:clients.length};
   if(path.startsWith('/site/hotspot/'))return {data:records,totalRows:records.length};
   return ++details===1?current:last;
 }})};
}
test('matches only the current authorized connection, including mapped IPv4',async()=>{
 assert.equal(await run().result,'12345678');
 assert.equal(await run({remoteAddress:'::ffff:192.168.10.100'}).result,'12345678');
});
test('rejects unauthorized, offline, blocked, and wrong SSID clients',async()=>{
 for(const patch of [{authStatus:1},{active:false},{blocked:true},{ssid:'OTHER'},{wireless:false}])
 assert.equal(await run({current:{...client,...patch}}).result,null);
});
test('rejects ambiguous clients, ambiguous records and historical IP/MAC',async()=>{
 for(const options of [{clients:[client,client]},{records:[record,record]},{records:[{...record,ip:'192.168.10.101'}]},{records:[{...record,mac:'00-11-22-33-44-55'}]},{records:[{...record,valid:false}]},{records:[{...record,authType:5}]}])
 assert.equal(await run(options).result,null);
});
test('rejects identity change during lookup and non-guest source addresses',async()=>{
 assert.equal(await run({last:{...client,ip:'192.168.10.101'}}).result,null);
 const r=run({remoteAddress:'192.168.30.30'});assert.equal(await r.result,null);assert.equal(r.calls,0);
});
test('controller failures do not yield a voucher',async()=>{
 await assert.rejects(detectVoucher({site:'/site',remoteAddress:client.ip,api:async()=>{throw Error('permission denied');}}));
});

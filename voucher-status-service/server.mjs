import http from 'node:http';
import { readFileSync } from 'node:fs';
import { balance } from './balance.mjs';

const required = ['OC200_URL','OMADA_ID','SITE_ID','CLIENT_ID','CLIENT_SECRET','ALLOWED_ORIGINS'];
const balancePage=readFileSync(new URL('./balance.html',import.meta.url),'utf8');
for (const name of required) if (!process.env[name] || process.env[name] === 'replace-me') throw new Error(`Configure ${name} in .env`);
const base = new URL(process.env.OC200_URL);
if (base.protocol !== 'https:') throw new Error('OC200_URL must use HTTPS');
const origins = new Set(process.env.ALLOWED_ORIGINS.split(',').map(x => x.trim()));
let token, tokenUntil = 0, tokenPending;
async function jsonRequest(path, options = {}) {
  const response = await fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(12000), redirect: 'error' });
  if (!response.ok) throw new Error(`Controller HTTP ${response.status}`);
  const body = await response.json();
  if (body.errorCode !== 0) throw new Error(`Controller error ${body.errorCode}`);
  return body.result;
}
async function accessToken() {
  if (token && Date.now() < tokenUntil) return token;
  if (!tokenPending) tokenPending = (async () => {
    const data = await jsonRequest('/openapi/authorize/token?grant_type=client_credentials', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({omadacId:process.env.OMADA_ID,client_id:process.env.CLIENT_ID,client_secret:process.env.CLIENT_SECRET})
    });
    if (!data.accessToken) throw new Error('No access token returned');
    token = data.accessToken; tokenUntil = Date.now() + Math.max(0, Number(data.expiresIn || 7200) - 60) * 1000;
    return token;
  })().finally(() => { tokenPending = null; });
  return tokenPending;
}
async function api(path) {
  for (let attempt=0; attempt<2; attempt++) {
    try { return await jsonRequest(path, {headers:{Authorization:`AccessToken=${await accessToken()}`}}); }
    catch (error) {
      if (attempt===0 && /44112|44113|HTTP 401/.test(error.message)) { token=null; continue; }
      throw error;
    }
  }
}
const root = `/openapi/v1/${encodeURIComponent(process.env.OMADA_ID)}/sites/${encodeURIComponent(process.env.SITE_ID)}/hotspot`;
async function lookup(code) {
  // Bound pagination protects a small hardware controller from expensive unbounded scans.
  for (let page=1; page<=10; page++) {
    const groups = await api(`${root}/voucher-groups?page=${page}&pageSize=100`);
    for (const group of groups.data || []) {
      for (let vp=1; vp<=10; vp++) {
        const result = await api(`${root}/voucher-groups/${encodeURIComponent(group.id)}?page=${vp}&pageSize=100&searchKey=${encodeURIComponent(code)}`);
        const match = (result.data || []).find(v => v.code === code);
        if (match) return balance(match);
        if (vp*100 >= result.totalRows || !result.data?.length) break;
        if (vp===10) throw new Error('Voucher search limit exceeded');
      }
    }
    if (page*100 >= groups.totalRows || !groups.data?.length) return {found:false};
  }
  throw new Error('Group search limit exceeded');
}
const limits = new Map(); let busy=false;
setInterval(() => { for(const [key,value] of limits) if(Date.now()>value.until) limits.delete(key); },60000).unref();
const server = http.createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type','application/json');
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Vary','Origin');
  const origin=req.headers.origin;
  const send=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
  const localOrigin=`http://${req.headers.host}`;
  if(origin && !origins.has(origin) && origin!==localOrigin) return send(403,{error:'Origin not allowed'});
  if(origin) res.setHeader('Access-Control-Allow-Origin',origin);
  if(req.method==='GET' && (req.url==='/' || req.url==='/balance')) {res.setHeader('Content-Type','text/html; charset=utf-8');res.writeHead(200);return res.end(balancePage);}
  if(req.url !== '/voucher-status') return send(404,{error:'Not found'});
  if(req.method==='OPTIONS') {res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type');return send(204,{});}
  if(req.method!=='POST') return send(405,{error:'Use POST'});
  const key=req.socket.remoteAddress, now=Date.now();
  let limit=limits.get(key); if(!limit || now>limit.until) {limit={count:0,until:now+60000};limits.set(key,limit);}
  if(++limit.count>6 || busy) return send(429,{error:'Please wait a moment before checking again.'});
  if(!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'JSON required'});
  try {
    let body=''; for await(const chunk of req) {body+=chunk;if(Buffer.byteLength(body)>1024) return send(413,{error:'Request too large'});}
    let data;try {data=JSON.parse(body);}catch{return send(400,{error:'Invalid request'});}
    const code=typeof data.code==='string'?data.code.trim():'';
    if(!/^[a-zA-Z0-9-]{4,64}$/.test(code)) return send(400,{error:'Enter a valid voucher code.'});
    busy=true;
    try {send(200,await lookup(code));} finally {busy=false;}
  } catch(error) {console.error('Voucher lookup failed:',error.message);send(502,{error:'Unable to read voucher balance. Please try again later.'});}
});
server.requestTimeout=15000;
server.listen(Number(process.env.PORT || 3080),'0.0.0.0',()=>console.log('Voucher status service listening on port',process.env.PORT || 3080));

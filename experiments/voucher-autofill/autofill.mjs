// Never use browser-supplied IP/MAC values or forwarded headers for identification.
const macKey = value => typeof value === 'string' && /^(?:[\da-f]{2}[:-]){5}[\da-f]{2}$/i.test(value) ? value.replace(/[:-]/g,'').toLowerCase() : null;
async function pages(api, path) {
  const rows=[];
  for(let page=1;page<=10;page++) {
    const result=await api(`${path}${path.includes('?')?'&':'?'}page=${page}&pageSize=100`);
    if(!Array.isArray(result?.data)) throw new Error('Unexpected client response');
    rows.push(...result.data);
    if(result.data.length<100 || (Number.isFinite(result.totalRows)&&page*100>=result.totalRows))return rows;
  }
  throw new Error('Client search limit exceeded');
}
export async function detectVoucher({api,site,remoteAddress,ssid='GCONNECT WIFI',subnet='192.168.10',diagnostic=()=>{}}) {
  const miss=reason=>{diagnostic(reason);return null;};
  const ip=remoteAddress?.replace(/^::ffff:/,'');
  const octets=ip?.split('.');
  if(octets?.length!==4 || octets.slice(0,3).join('.')!==subnet || !octets.every(x=>/^\d{1,3}$/.test(x)&&+x<=255) || +octets[3]===0 || +octets[3]===255)return miss('request address outside configured guest subnet');
  const clients=await pages(api,`${site}/clients?searchKey=${encodeURIComponent(ip)}`);
  const matches=clients.filter(c=>c.ip===ip);
  if(matches.length!==1)return miss('exact client IP matches: '+matches.length);
  if(!macKey(matches[0].mac))return miss('client MAC missing or invalid');
  const mac=matches[0].mac;
  const current=await api(`${site}/clients/${encodeURIComponent(mac)}`);
  const eligible=c=>c?.ip===ip&&macKey(c.mac)===macKey(mac)&&c.active===true&&c.authStatus===2&&c.wireless===true&&c.ssid===ssid&&c.blocked===false;
  if(!eligible(current)) {
    const checks={ip:current?.ip===ip,mac:macKey(current?.mac)===macKey(mac),active:current?.active===true,authorized:current?.authStatus===2,wireless:current?.wireless===true,ssid:current?.ssid===ssid,notBlocked:current?.blocked===false};
    return miss('client checks failed: '+Object.keys(checks).filter(k=>!checks[k]).join(', '));
  }
  const records=await pages(api,`${site}/hotspot/authed-records?searchKey=${encodeURIComponent(mac)}`);
  const valid=records.filter(r=>r.valid===true&&r.authType===3&&r.wireless===true&&macKey(r.mac)===macKey(mac)&&r.ssid===ssid&&r.ip===ip);
  if(valid.length!==1)return miss('matching voucher records: '+valid.length+'; records returned: '+records.length);
  if(!/^[a-zA-Z0-9-]{4,64}$/.test(valid[0].voucherCode||''))return miss('voucher code missing or invalid');
  // Recheck identity after reading records to reject an IP reassignment during lookup.
  if(!eligible(await api(`${site}/clients/${encodeURIComponent(mac)}`)))return miss('client changed during lookup');
  diagnostic('matched current voucher');
  return valid[0].voucherCode;
}

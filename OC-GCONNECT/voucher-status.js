/* Set this to the Windows service URL after setup. Use HTTPS if the portal uses HTTPS. */
window.GCONNECT_STATUS_URL = 'http://192.168.30.30:3080/voucher-status';
(function () {
  function formatRemainingTime(seconds) {
  var totalMinutes=Math.floor(seconds/60);
  if(seconds>0&&totalMinutes===0)return 'Less than 1 min';
  var days=Math.floor(totalMinutes/1440), hours=Math.floor(totalMinutes%1440/60), minutes=totalMinutes%60, parts=[];
  if(days)parts.push(days+' '+(days===1?'day':'days'));
  if(hours)parts.push(hours+'h');
  if(minutes)parts.push(minutes+' min');
  return parts.length?parts.join(' '):'0 min';
}

  var form=document.getElementById('voucher-status-form'), result=document.getElementById('status-message');
  var dialog=document.getElementById('voucher-status-dialog'), duration=document.getElementById('status-duration'), badge=document.getElementById('status-badge');
  var opener=document.getElementById('open-voucher-status'), input=document.getElementById('status-voucher-code');
  opener.addEventListener('click',function(){input.value=document.getElementById('voucherCode').value;duration.textContent='';badge.textContent='';result.textContent='';dialog.showModal();input.focus();input.select();});
  document.getElementById('close-voucher-status').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('click',function(event){if(event.target===dialog){var r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',function(){opener.focus();});
  form.addEventListener('submit',async function(event){
    event.preventDefault();
    if(!window.GCONNECT_STATUS_URL){result.textContent='Balance checking is not configured yet.';return;}
    var button=form.querySelector('button'); button.disabled=true;duration.textContent='';badge.textContent='';result.textContent='Checking…';
    try {
      var response=await fetch(window.GCONNECT_STATUS_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:document.getElementById('status-voucher-code').value.trim()}),signal:AbortSignal.timeout(60000)});
      var data=await response.json();if(!response.ok)throw new Error(data.error || 'Unable to check balance.');
      if(data.found){
        badge.dataset.status=['unused','active','expired'].includes(data.status)?data.status:'unknown';
        badge.textContent=data.status==='unused'?'Not Activated':data.status==='active'?'Active':data.status==='expired'?'Expired':'Status unavailable';
      }
      if(!data.found) result.textContent='Voucher not found.';
      else if(data.deviceSpecific) result.textContent='This voucher has a separate balance for each device. Check the connected device’s session status.';
      else if(data.remainingSeconds===null) result.textContent='Status: '+data.status+'. Remaining time is unavailable.';
      else {
        duration.textContent=formatRemainingTime(data.remainingSeconds);
        result.textContent=data.status==='unused'?'Available time. Your timer starts when you connect.':'Remaining WiFi time';
      }
    }catch(error){result.textContent=error.message==='Failed to fetch'?'Cannot reach the balance service. Please try again later.':error.message;}
    finally{button.disabled=false;}
  });
}());

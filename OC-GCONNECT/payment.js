(function(){
  var button=document.getElementById('copy-payment-number');
  button.addEventListener('click',async function(){
    var status=document.getElementById('payment-copy-status');
    var number=document.getElementById('payment-number').textContent.replace(/\s/g,'');
    var copied=false;
    try{
      if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(number);copied=true;}
      else{
        var field=document.createElement('textarea');field.value=number;field.readOnly=true;field.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';document.getElementById('payment-modal').appendChild(field);
        try{field.focus();field.select();field.setSelectionRange(0,number.length);copied=document.execCommand('copy');}finally{field.remove();button.focus();}
      }
    }catch(error){copied=false;}
    status.textContent=copied?'Copied!':'Copy unavailable. Press and hold the number to copy.';
  });
}());

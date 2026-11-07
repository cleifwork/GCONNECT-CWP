(function(){
  var wifiInfoButton = document.getElementById('payment-wifi-info');
  var wifiDetails = document.getElementById('payment-wifi-details');
  wifiInfoButton.addEventListener('click', function () {
    wifiDetails.hidden = !wifiDetails.hidden;
    wifiInfoButton.setAttribute('aria-expanded', String(!wifiDetails.hidden));
  });

  document.getElementById('chat-admin').addEventListener('click', function () {
    window.alert('This button is reserved for a Tawk.to chat link. Add your chat URL to integrate support in this portal, or remove the button if chat is not needed.');
  });

  document.querySelectorAll('.copy-payment-number').forEach(function(button){
  button.addEventListener('click',async function(){
    var status=document.getElementById(button.dataset.status);
    var number=document.getElementById(button.dataset.number).textContent.replace(/\s/g,'');
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
  });
}());

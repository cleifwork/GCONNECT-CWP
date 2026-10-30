(function(){
  var dialog=document.getElementById('timer-info-dialog'), opener=document.getElementById('open-timer-info');
  opener.addEventListener('click',function(){dialog.showModal();});
  document.getElementById('close-timer-info').addEventListener('click',function(){dialog.close();});
  document.getElementById('timer-info-done').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('close',function(){opener.focus();});
  dialog.addEventListener('click',function(event){if(event.target===dialog){var r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}());

(function(){
function attachVoucherClear(input, button) {
  function update() { button.hidden=input.value.length===0; }
  input.addEventListener('input',update);
  input.addEventListener('change',update);
  input.addEventListener('focus',update);
  button.addEventListener('pointerdown',function(event){event.preventDefault();});
  button.addEventListener('click',function(){
    input.value='';input.focus();
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  update();
}
document.querySelectorAll('[data-clear-for]').forEach(function(button){
  attachVoucherClear(document.getElementById(button.dataset.clearFor),button);
});
}());

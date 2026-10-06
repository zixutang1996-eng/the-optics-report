(function(){
 var grid=document.getElementById('grid'); if(!grid) return;
 var cards=[].slice.call(grid.querySelectorAll('.card'));
 var chips=[].slice.call(document.querySelectorAll('.chip[data-cat]'));
 var sale=document.getElementById('onlysale'), sort=document.getElementById('sort'), empty=document.getElementById('empty');
 var cat='all';
 function apply(){
  var n=0;
  cards.forEach(function(c){
   var ok=(cat==='all'||c.dataset.cat===cat)&&(!sale.checked||c.dataset.sale==='1');
   c.style.display=ok?'':'none'; if(ok) n++;
  });
  empty.style.display=n?'none':'block';
  var k=sort.value;
  cards.slice().sort(function(a,b){
   var pa=+a.dataset.price,pb=+b.dataset.price;
   if(k==='asc') return pa-pb; if(k==='desc') return pb-pa;
   return (+a.dataset.order)-(+b.dataset.order);
  }).forEach(function(c){grid.appendChild(c);});
  try{history.replaceState(null,'','#'+[cat,sale.checked?'sale':'',k].join(','));}catch(e){}
 }
 chips.forEach(function(ch){ch.addEventListener('click',function(){
  chips.forEach(function(x){x.classList.remove('on');x.setAttribute('aria-pressed','false');});
  ch.classList.add('on');ch.setAttribute('aria-pressed','true');cat=ch.dataset.cat;apply();});});
 sale.addEventListener('change',apply); sort.addEventListener('change',apply);
 var h=(location.hash||'').slice(1).split(',');
 if(h[0]){var c=chips.filter(function(x){return x.dataset.cat===h[0];})[0]; if(c){chips.forEach(function(x){x.classList.remove('on');});c.classList.add('on');cat=h[0];}}
 if(h[1]==='sale') sale.checked=true; if(h[2]) sort.value=h[2];
 apply();
})();

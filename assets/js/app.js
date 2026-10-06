/* The Optics Report — client runtime: i18n, nav, search, filters/sort, gallery, videos, reviews, counters. No dependencies. */
(function(){
'use strict';
var C=window.TOR||{}, I=window.I18N, T=I.T, ROOT=C.root||'./';
var LANGS=['zh-Hans','zh-Hant','en','fr'];
var LOC={'zh-Hans':'zh-CN','zh-Hant':'zh-TW','en':'en-CA','fr':'fr-CA'};
function autoLang(){
  var a=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||''];
  for(var i=0;i<a.length;i++){var n=String(a[i]||'').toLowerCase();
    if(/^zh-(tw|hk|mo)(?![a-z])|^zh-hant/.test(n))return 'zh-Hant'; if(/^zh/.test(n))return 'zh-Hans'; if(/^fr/.test(n))return 'fr'; if(/^en/.test(n))return 'en';}
  return 'en';
}
function detect(){
  try{var s=localStorage.getItem('tor_lang');if(LANGS.indexOf(s)>=0)return s;}catch(e){}
  var u=document.documentElement.getAttribute('data-ui'); if(LANGS.indexOf(u)>=0)return u;
  return autoLang();
}
var L=detect();
function t(k,a){var e=T[k];var s=e?(e[L]||e.en):k;if(a)for(var x in a)s=s.split('{'+x+'}').join(a[x]);return s;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var nfCur, nfNum, nfCompact;
function mkfmt(){nfCur=new Intl.NumberFormat(LOC[L],{style:'currency',currency:'CAD',currencyDisplay:(L==='en'||L==='fr')?'narrowSymbol':'symbol'});
  nfNum=new Intl.NumberFormat(LOC[L]); try{nfCompact=new Intl.NumberFormat(LOC[L],{notation:'compact',maximumFractionDigits:1});}catch(e){nfCompact=nfNum;}}
function money(v){return v==null||isNaN(v)?t('price_unknown'):nfCur.format(v);}
function fdate(d){if(!d)return '';try{var p=d.split('-');return new Intl.DateTimeFormat(LOC[L],{year:'numeric',month:'short',day:'numeric'}).format(new Date(+p[0],+p[1]-1,+p[2]));}catch(e){return d;}}
function applyI18n(root){
  root=root||document;
  document.documentElement.lang=L; document.documentElement.setAttribute('data-ui',L);
  root.querySelectorAll('[data-i18n]').forEach(function(el){var a=el.getAttribute('data-args');el.textContent=t(el.getAttribute('data-i18n'),a?JSON.parse(a):null);});
  root.querySelectorAll('[data-i18n-ph]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-i18n-ph')));});
  root.querySelectorAll('[data-i18n-aria]').forEach(function(el){el.setAttribute('aria-label',t(el.getAttribute('data-i18n-aria')));});
  root.querySelectorAll('[data-i18n-title]').forEach(function(el){el.setAttribute('title',t(el.getAttribute('data-i18n-title')));});
  root.querySelectorAll('[data-price]').forEach(function(el){var v=el.getAttribute('data-price');el.textContent=v===''?t('price_unknown'):money(+v);});
  root.querySelectorAll('[data-num]').forEach(function(el){el.textContent=nfNum.format(+el.getAttribute('data-num'));});
  root.querySelectorAll('[data-views]').forEach(function(el){el.textContent=t('views',{n:nfCompact.format(+el.getAttribute('data-views'))});});
  root.querySelectorAll('[data-date]').forEach(function(el){el.textContent=fdate(el.getAttribute('data-date'));});
  root.querySelectorAll('[data-updated]').forEach(function(el){el.textContent=t('updated',{d:fdate(el.getAttribute('data-updated'))});});
  var tt=document.querySelector('meta[name=tor-title]'); if(tt){var k=tt.content.split('|');document.title=(k[0]?(T[k[0]]?t(k[0]):k[0])+' · ':'')+'The Optics Report';}
}
function setLang(l){L=l;try{localStorage.setItem('tor_lang',l);}catch(e){}mkfmt();applyI18n();if(window.__rerender)window.__rerender();}
mkfmt();
/* ---------- chrome: language, nav, search ---------- */
function chrome(){
  var sel=document.getElementById('langsel'); if(sel){sel.value=L;sel.addEventListener('change',function(){setLang(sel.value);});}
  var bg=document.getElementById('burger'), nav=document.getElementById('nav');
  if(bg)bg.addEventListener('click',function(){var on=nav.classList.toggle('on');bg.setAttribute('aria-expanded',on);});
  document.querySelectorAll('.nav li.has>.nl').forEach(function(b){b.addEventListener('click',function(e){
    var li=b.parentNode, was=li.classList.contains('open');
    document.querySelectorAll('.nav li.open').forEach(function(x){if(x!==li)x.classList.remove('open');});
    li.classList.toggle('open',!was); b.setAttribute('aria-expanded',!was); e.stopPropagation();});});
  document.addEventListener('click',function(e){if(!e.target.closest('.nav'))document.querySelectorAll('.nav li.open').forEach(function(x){x.classList.remove('open');});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.nav li.open').forEach(function(x){x.classList.remove('open');});});
  var q=new URLSearchParams(location.search).get('q'); var si=document.getElementById('q'); if(si&&q)si.value=q;
}
/* ---------- data ---------- */
var cache={};
function getJSON(u){if(cache[u])return cache[u];cache[u]=fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});return cache[u];}
function fold(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[×]/g,'x').replace(/[–—]/g,'-');}
var CJK=/[\u3400-\u9fff]/;
function catTerms(c){var s=[I.SYN[c]||''];LANGS.forEach(function(l){s.push(T['cat_'+c][l]);});return fold(s.join(' '));}
var CT={}; I.CATS.forEach(function(c){CT[c]=catTerms(c);});
function search(items,q){
  var fq=fold(q).trim(); if(!fq)return items.map(function(p){return {p:p,s:0};});
  var toks=fq.split(/\s+/).filter(Boolean), out=[];
  // CJK queries: also try splitting into known category terms
  items.forEach(function(p){
    var name=fold(p.n), brand=fold(p.b), codes=fold(p.cd||''), cats=CT[p.c]||'', s=0, ok=true;
    var hay=name+' '+brand+' '+codes;
    if(hay.indexOf(fq)>=0){s+=40; if(name.indexOf(fq)===0||brand===fq)s+=25;}
    toks.forEach(function(tk){
      var hit=false;
      if(name.indexOf(tk)>=0){s+=12;hit=true; if(new RegExp('(^|[^a-z0-9])'+tk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])').test(name))s+=6;}
      if(brand.indexOf(tk)>=0){s+=10;hit=true;}
      var tc=tk.replace(/[^a-z0-9]/g,'');if(tc.length>2&&codes.indexOf(tc)>=0){s+=14;hit=true;}
      if(!hit&&cats.indexOf(tk)>=0){s+=7;hit=true;}
      if(!hit&&CJK.test(tk)){ // CJK token: match any category synonym contained in it
        var terms=cats.split(/\s+/).filter(function(w){return CJK.test(w)&&w.length>=2;});
        for(var i=0;i<terms.length;i++){if(tk.indexOf(terms[i])>=0||terms[i].indexOf(tk)>=0){s+=7;hit=true;break;}}
      }
      if(!hit)ok=false;
    });
    if(ok&&s>0){s+=(p.st?3:0)+Math.min(p.o,5)*.4+Math.log10(1+(p.pop||0));out.push({p:p,s:s});}
  });
  return out;
}
/* ---------- listing (category / search / picks / group) ---------- */
var PRICE=[[0,100],[100,250],[250,500],[500,1000],[1000,2500],[2500,1e9]];
function priceLabel(i){var r=PRICE[i];if(i===0)return '< '+money(100).replace(/[.,]00(?=\D*$)/,'');if(r[1]>1e8)return money(r[0]).replace(/[.,]00(?=\D*$)/,'')+' +';return money(r[0]).replace(/[.,]00(?=\D*$)/,'')+' – '+money(r[1]).replace(/[.,]00(?=\D*$)/,'');}
function localPop(id){try{return +(localStorage.getItem('tor_v_'+id)||0);}catch(e){return 0;}}
function popKey(p){return (p.pop||0)+localPop(p.id);}
var STORE_SVG='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></svg>';
function storeLine(p){var n=(p.o||1)-1;return '<div class="store">'+STORE_SVG+'<span class="sn">'+esc(p.sn||'')+'</span>'+(n>0?' <span class="more">'+esc(n===1?t('more_store1'):t('more_stores',{n:n}))+'</span>':'')+'</div>';}
function card(p){
  var b=[]; if(p.sa)b.push('<span class="badge sale">'+esc(t('sale'))+'</span>'); if(p.nw)b.push('<span class="badge new">'+esc(t('badge_new'))+'</span>'); if(p.dr)b.push('<span class="badge drop">'+esc(t('badge_drop'))+'</span>'); if(p.pk)b.push('<span class="badge">'+esc(t('badge_pick'))+'</span>');
  var im=p.t?'<div class="im"><img loading="lazy" decoding="async" src="'+ROOT+'assets/img/'+p.t+'-t.webp" alt="'+esc(p.n)+'"></div>':'<div class="im noimg">'+esc(t('no_image'))+'</div>';
  return '<a class="card" href="'+ROOT+'p/'+p.s+'/">'+(b.length?'<div class="badges">'+b.join('')+'</div>':'')+im+
    '<div class="bd"><div class="br">'+esc(p.b)+'</div><div class="nm">'+esc(p.n)+'</div>'+storeLine(p)+
    '<div class="meta"><span>'+esc(t('cat_'+p.c))+'</span></div>'+
    '<div class="ft"><span class="price">'+money(p.p)+'</span>'+(p.sa&&p.r>p.p?'<span class="was">'+money(p.r)+'</span>':'')+'</div>'+
    '<div class="meta"><span><i class="dot'+(p.st?'':' no')+'"></i>'+esc(t(p.st?'in_stock':'out_stock'))+'</span><span>'+esc(p.o>1?t('n_retailers',{n:p.o}):t('one_retailer'))+'</span></div></div></a>';
}
/* ---------- pagination (shared by product lists and used listings) ---------- */
function pageNums(cur,n){var w=1,out=[1],s=Math.max(2,cur-w),e=Math.min(n-1,cur+w),i;
  if(cur<=3){s=2;e=Math.min(n-1,4);} if(cur>=n-2){s=Math.max(2,n-3);e=n-1;}
  if(s>2)out.push(s===3?2:0); for(i=s;i<=e;i++)out.push(i); if(e<n-1)out.push(e===n-2?n-1:0); if(n>1)out.push(n); return out;}
function pageHref(p){var q=new URLSearchParams(location.search); if(p>1)q.set('page',p); else q.delete('page'); var s=q.toString(); return location.pathname+(s?'?'+s:'');}
function pager(cur,n){if(n<=1)return '';
  var A='<svg class="icon" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>', B='<svg class="icon" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
  var h='<nav class="pager" aria-label="'+esc(t('pg_nav'))+'"><div class="pg-row">';
  h+=cur>1?'<a class="pg pg-dir pg-prev" href="'+esc(pageHref(cur-1))+'" data-pg="'+(cur-1)+'" rel="prev">'+A+'<span>'+esc(t('pg_prev'))+'</span></a>':'<span class="pg pg-dir pg-prev dis" aria-disabled="true">'+A+'<span>'+esc(t('pg_prev'))+'</span></span>';
  h+='<span class="pg-nums">'+pageNums(cur,n).map(function(p){
    if(!p)return '<span class="pg-gap" aria-hidden="true">…</span>';
    var lab=esc(t('pg_page',{n:nfNum.format(p)}));
    return p===cur?'<span class="pg cur" aria-current="page" aria-label="'+lab+'">'+nfNum.format(p)+'</span>':'<a class="pg" href="'+esc(pageHref(p))+'" data-pg="'+p+'" aria-label="'+lab+'">'+nfNum.format(p)+'</a>';}).join('')+'</span>';
  h+=cur<n?'<a class="pg pg-dir pg-next" href="'+esc(pageHref(cur+1))+'" data-pg="'+(cur+1)+'" rel="next"><span>'+esc(t('pg_next'))+'</span>'+B+'</a>':'<span class="pg pg-dir pg-next dis" aria-disabled="true"><span>'+esc(t('pg_next'))+'</span>'+B+'</span>';
  h+='</div><form class="pg-go" novalidate><span class="pg-status">'+esc(t('pg_status',{n:nfNum.format(cur),m:nfNum.format(n)}))+'</span><label><span>'+esc(t('pg_goto_pre'))+'</span><input type="number" inputmode="numeric" min="1" max="'+n+'" step="1" value="'+cur+'" name="pg">'+(t('pg_goto_post')?'<span>'+esc(t('pg_goto_post'))+'</span>':'')+'</label><button class="btn primary" type="submit">'+esc(t('pg_go'))+'</button></form></nav>';
  return h;}
/* wire a list container: get/set page, rerender, keep URL in sync, scroll to list top */
function wirePager(el,api){
  function go(p,push){p=Math.max(1,Math.min(api.pages(),p|0||1)); if(p===api.get()&&push)return; api.set(p); api.sync(push); api.render();
    var top=el.querySelector('.toolbar')||el; var y=top.getBoundingClientRect().top+window.pageYOffset-90; if(window.pageYOffset>y)window.scrollTo(0,Math.max(0,y));}
  el.addEventListener('click',function(e){var a=e.target.closest('a[data-pg]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;e.preventDefault();go(+a.getAttribute('data-pg'),true);});
  el.addEventListener('submit',function(e){var f=e.target.closest('.pg-go');if(!f)return;e.preventDefault();var v=parseInt(f.querySelector('input').value,10);if(isNaN(v))v=api.get();go(v,true);});
  window.addEventListener('popstate',function(){api.read();api.render();});
}
function listing(el){
  var mode=el.getAttribute('data-mode'), cats=(el.getAttribute('data-cats')||'').split(',').filter(Boolean);
  var params=new URLSearchParams(location.search), q=params.get('q')||'';
  var st={b:new Set((params.get('b')||'').split('|').filter(Boolean)),pr:new Set((params.get('pr')||'').split(',').filter(Boolean)),
          c:new Set((params.get('c')||'').split(',').filter(Boolean)),stk:params.get('stk')==='1',sa:params.get('sa')==='1',
          sort:params.get('sort')||(mode==='search'&&q?'rel':'pop_desc'),page:Math.max(1,parseInt(params.get('page'),10)||1),bq:'',bmore:false};
  var PS=48, npages=1;
  function readURL(){var p=new URLSearchParams(location.search);st.b=new Set((p.get('b')||'').split('|').filter(Boolean));st.pr=new Set((p.get('pr')||'').split(',').filter(Boolean));st.c=new Set((p.get('c')||'').split(',').filter(Boolean));st.stk=p.get('stk')==='1';st.sa=p.get('sa')==='1';st.sort=p.get('sort')||(mode==='search'&&q?'rel':'pop_desc');st.page=Math.max(1,parseInt(p.get('page'),10)||1);}
  var all=[], base=[];
  el.innerHTML='<div class="empty">'+esc(t('loading'))+'</div>';
  getJSON(ROOT+'data/index.json').then(function(d){
    all=d.items;
    if(mode==='picks')base=all.filter(function(p){return p.pk;}).map(function(p){return{p:p,s:0};});
    else if(mode==='search')base=search(all,q);
    else base=all.filter(function(p){return cats.indexOf(p.c)>=0;}).map(function(p){return{p:p,s:0};});
    render();
  }).catch(function(){el.innerHTML='<div class="empty">'+esc(t('load_error'))+'</div>';});
  function syncURL(push){
    var p=new URLSearchParams(); if(q)p.set('q',q); if(st.b.size)p.set('b',Array.from(st.b).join('|')); if(st.pr.size)p.set('pr',Array.from(st.pr).join(','));
    if(st.c.size)p.set('c',Array.from(st.c).join(',')); if(st.stk)p.set('stk','1'); if(st.sa)p.set('sa','1'); if(st.sort!==(mode==='search'&&q?'rel':'pop_desc'))p.set('sort',st.sort);
    if(st.page>1)p.set('page',st.page);
    var s=p.toString(); history[push?'pushState':'replaceState'](null,'',location.pathname+(s?'?'+s:''));
  }
  function pass(x,skip){var p=x.p;
    if(skip!=='b'&&st.b.size&&!st.b.has(p.b))return false;
    if(skip!=='c'&&st.c.size&&!st.c.has(p.c))return false;
    if(skip!=='pr'&&st.pr.size){var ok=false;st.pr.forEach(function(i){var r=PRICE[+i];if(p.p>=r[0]&&p.p<r[1])ok=true;});if(!ok)return false;}
    if(skip!=='stk'&&st.stk&&!p.st)return false; if(skip!=='sa'&&st.sa&&!p.sa)return false; return true;}
  function counts(key,fn){var m={};base.forEach(function(x){if(pass(x,key)){var k=fn(x.p);m[k]=(m[k]||0)+1;}});return m;}
  function render(){
    var res=base.filter(function(x){return pass(x);});
    var s=st.sort;
    res.sort(function(a,b){
      if(s==='rel')return b.s-a.s||(b.p.st-a.p.st)||a.p.p-b.p.p;
      if(s==='price_asc')return a.p.p-b.p.p; if(s==='price_desc')return b.p.p-a.p.p;
      var d=popKey(b.p)-popKey(a.p); if(s==='pop_asc')d=-d; if(d)return d;
      var y=(b.p.yv||0)-(a.p.yv||0); if(s==='pop_asc')y=-y; return y||(b.p.st-a.p.st)||(b.p.o-a.p.o);
    });
    var bc=counts('b',function(p){return p.b;}), brands=Object.keys(bc).sort(function(a,b){return bc[b]-bc[a]||a.localeCompare(b);});
    st.b.forEach(function(b){if(brands.indexOf(b)<0)brands.push(b);});
    var bshow=brands.filter(function(b){return !st.bq||fold(b).indexOf(fold(st.bq))>=0;}); var lim=st.bmore||st.bq?bshow.length:10;
    var pc=counts('pr',function(p){for(var i=0;i<PRICE.length;i++)if(p.p>=PRICE[i][0]&&p.p<PRICE[i][1])return i;});
    var cc=counts('c',function(p){return p.c;});
    var sc=counts('stk',function(p){return p.st?1:0;}), sac=counts('sa',function(p){return p.sa?1:0;});
    var h='<div class="listing"><aside class="filters" id="filters"><div class="fclose" style="justify-content:space-between;align-items:center;padding:6px 0 10px;border-bottom:1px solid var(--line)"><span class="label">'+esc(t('filters'))+'</span><button class="btn" data-act="fclose">'+esc(t('close'))+'</button></div>';
    if(mode!=='cat'||cats.length>1){var cks=Object.keys(cc).sort(function(a,b){return I.CATS.indexOf(a)-I.CATS.indexOf(b);});st.c.forEach(function(c){if(cks.indexOf(c)<0)cks.push(c);});
      if(cks.length>1){h+='<div class="fg"><h3 class="label">'+esc(t('f_category'))+'</h3>';cks.forEach(function(c){h+='<label><input type="checkbox" data-f="c" value="'+c+'"'+(st.c.has(c)?' checked':'')+'>'+esc(t('cat_'+c))+'<span class="n">'+(cc[c]||0)+'</span></label>';});h+='</div>';}}
    h+='<div class="fg"><h3 class="label">'+esc(t('f_avail'))+'</h3><label><input type="checkbox" data-f="stk"'+(st.stk?' checked':'')+'>'+esc(t('f_instock'))+'<span class="n">'+(sc[1]||0)+'</span></label></div>';
    h+='<div class="fg"><h3 class="label">'+esc(t('f_deal'))+'</h3><label><input type="checkbox" data-f="sa"'+(st.sa?' checked':'')+'>'+esc(t('f_onsale'))+'<span class="n">'+(sac[1]||0)+'</span></label></div>';
    h+='<div class="fg"><h3 class="label">'+esc(t('f_price'))+'</h3>';PRICE.forEach(function(_,i){if(!pc[i]&&!st.pr.has(''+i))return;h+='<label><input type="checkbox" data-f="pr" value="'+i+'"'+(st.pr.has(''+i)?' checked':'')+'>'+esc(priceLabel(i))+'<span class="n">'+(pc[i]||0)+'</span></label>';});h+='</div>';
    h+='<div class="fg"><h3 class="label">'+esc(t('f_brand'))+'</h3>'+(brands.length>10?'<input class="bfind" data-act="bq" value="'+esc(st.bq)+'" placeholder="'+esc(t('f_brand_find'))+'">':'');
    bshow.slice(0,lim).forEach(function(b){h+='<label><input type="checkbox" data-f="b" value="'+esc(b)+'"'+(st.b.has(b)?' checked':'')+'>'+esc(b)+'<span class="n">'+(bc[b]||0)+'</span></label>';});
    if(!st.bq&&brands.length>10)h+='<button class="more" data-act="bmore">'+esc(t(st.bmore?'f_less':'f_more'))+'</button>';
    h+='</div><div class="fg"><button class="btn" data-act="reset">'+esc(t('f_reset'))+'</button></div>';
    h+='<div class="fdone"><button class="btn" data-act="reset">'+esc(t('f_reset'))+'</button><button class="btn primary" data-act="fclose">'+esc(t('f_done'))+' ('+nfNum.format(res.length)+')</button></div></aside><section>';
    h+='<div class="toolbar"><button class="btn fbtn" data-act="fopen"><svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>'+esc(t('filters'))+(st.b.size+st.pr.size+st.c.size+(st.stk?1:0)+(st.sa?1:0)?' ('+(st.b.size+st.pr.size+st.c.size+(st.stk?1:0)+(st.sa?1:0))+')':'')+'</button><span class="count">'+esc(t('n_items',{n:nfNum.format(res.length)}))+'</span><span class="sp"></span>'+
      '<label class="sr" for="sortsel">'+esc(t('sort'))+'</label><select class="sel" id="sortsel" data-act="sort">'+(mode==='search'&&q?'<option value="rel">'+esc(t('s_relevance'))+'</option>':'')+
      ['pop_desc','pop_asc','price_asc','price_desc'].map(function(k){return '<option value="'+k+'"'+(st.sort===k?' selected':'')+'>'+esc(t('s_'+k))+'</option>';}).join('')+'</select></div>';
    npages=Math.max(1,Math.ceil(res.length/PS)); if(st.page>npages){st.page=npages;syncURL(false);}
    if(!res.length)h+='<div class="empty">'+esc(t('no_results'))+'</div>';
    else h+='<div class="grid">'+res.slice((st.page-1)*PS,st.page*PS).map(function(x){return card(x.p);}).join('')+'</div>'+pager(st.page,npages);
    if(st.sort.indexOf('pop')===0)h+='<p class="note">'+esc(t('pop_note'))+'</p>';
    h+='</section></div>';
    var fo=document.getElementById('filters'), wasOpen=fo&&fo.classList.contains('on'), scr=fo?fo.scrollTop:0, foc=document.activeElement&&document.activeElement.getAttribute('data-act')==='bq';
    el.innerHTML=h; if(wasOpen){var f2=document.getElementById('filters');f2.classList.add('on');f2.scrollTop=scr;}
    if(foc){var bi=el.querySelector('[data-act=bq]');bi.focus();bi.setSelectionRange(bi.value.length,bi.value.length);}
    if(mode==='search'){var u=document.getElementById('usedhits');if(u)usedHits(u,q);}
  }
  window.__rerender=render;
  el.addEventListener('change',function(e){var x=e.target,f=x.getAttribute('data-f');
    if(f==='b'||f==='pr'||f==='c'){x.checked?st[f].add(x.value):st[f].delete(x.value);}
    else if(f==='stk')st.stk=x.checked; else if(f==='sa')st.sa=x.checked;
    else if(x.getAttribute('data-act')==='sort')st.sort=x.value; else return;
    st.page=1; syncURL(); render();});
  el.addEventListener('input',function(e){if(e.target.getAttribute('data-act')==='bq'){st.bq=e.target.value;render();}});
  el.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var a=b.getAttribute('data-act');
    if(a==='bmore'){st.bmore=!st.bmore;render();}
    else if(a==='reset'){st.b.clear();st.pr.clear();st.c.clear();st.stk=false;st.sa=false;st.page=1;syncURL();render();}
    else if(a==='fopen'){document.getElementById('filters').classList.add('on');document.body.style.overflow='hidden';}
    else if(a==='fclose'){document.getElementById('filters').classList.remove('on');document.body.style.overflow='';}});
  wirePager(el,{get:function(){return st.page;},set:function(p){st.page=p;},pages:function(){return npages;},sync:syncURL,render:function(){if(all.length)render();},read:readURL});
}
function usedHits(el,q){
  getJSON(ROOT+'data/used.json').then(function(d){
    var fq=fold(q).trim(); if(!fq){el.innerHTML='';return;}
    var toks=fq.split(/\s+/), hits=d.items.filter(function(u){var h=fold(u.title)+' '+(CT[u.category]||'');return toks.every(function(tk){return h.indexOf(tk)>=0;});}).slice(0,10);
    if(!hits.length){el.innerHTML='';return;}
    el.innerHTML='<div class="sec-h"><h2>'+esc(t('used_title'))+'</h2><a href="'+ROOT+'used/">'+esc(t('see_all'))+'</a></div><div class="ulist">'+hits.map(urow).join('')+'</div>';
  }).catch(function(){});
}
/* ---------- used ---------- */
function urow(u){
  var price=u.price!=null?'<span class="price">'+money(u.price)+'</span>':'<span class="mono" style="color:var(--muted)">'+esc(t(u.price_note==='see_post'?'see_post':'contact_price'))+'</span>';
  var m=[]; if(u.date)m.push(esc(t('posted'))+' '+esc(fdate(u.date))); if(u.location)m.push(esc(u.location)); m.push(esc(t('condition'))+': '+esc(t('cond_'+(u.condition||'unknown'))));
  m.push(esc(t('cat_'+u.category)));
  return '<div class="urow"><div class="src">'+esc(u.source)+'<small>'+esc(t('src_'+u.source_type))+'</small></div><div><a class="t" href="'+esc(u.url)+'" target="_blank" rel="nofollow noopener noreferrer">'+esc(u.title)+'</a><div class="m">'+m.map(function(x){return '<span>'+x+'</span>';}).join('')+'</div>'+(u.snippet?'<div class="sn">'+esc(u.snippet)+'</div>':'')+(u.login_required?'<div class="m"><span>'+esc(t('login_req'))+'</span></div>':'')+'</div><div class="r">'+price+'<div style="margin-top:6px"><a class="btn" href="'+esc(u.url)+'" target="_blank" rel="nofollow noopener noreferrer">'+esc(t('view_listing'))+'</a></div></div></div>';
}
function used(el){
  var params=new URLSearchParams(location.search);
  var st={}, PS=60, npages=1, ready=false;
  function readURL(){var p=new URLSearchParams(location.search);st.c=new Set((p.get('c')||'').split(',').filter(Boolean));st.src=new Set((p.get('src')||'').split('|').filter(Boolean));st.pr=new Set((p.get('pr')||'').split(',').filter(Boolean));st.sort=p.get('sort')||'date_desc';st.page=Math.max(1,parseInt(p.get('page'),10)||1);}
  readURL();
  function syncURL(push){var p=new URLSearchParams();if(st.c.size)p.set('c',Array.from(st.c).join(','));if(st.src.size)p.set('src',Array.from(st.src).join('|'));if(st.pr.size)p.set('pr',Array.from(st.pr).join(','));if(st.sort!=='date_desc')p.set('sort',st.sort);if(st.page>1)p.set('page',st.page);
    var s=p.toString();history[push?'pushState':'replaceState'](null,'',location.pathname+(s?'?'+s:''));}
  var render=function(){};
  wirePager(el,{get:function(){return st.page;},set:function(p){st.page=p;},pages:function(){return npages;},sync:syncURL,render:function(){if(ready)render();},read:readURL});
  getJSON(ROOT+'data/used.json').then(function(d){var all=d.items;
    function pass(u,skip){if(skip!=='c'&&st.c.size&&!st.c.has(u.category))return false;if(skip!=='src'&&st.src.size&&!st.src.has(u.source))return false;
      if(skip!=='pr'&&st.pr.size){if(u.price==null)return false;var ok=false;st.pr.forEach(function(i){var r=PRICE[+i];if(u.price>=r[0]&&u.price<r[1])ok=true;});if(!ok)return false;}return true;}
    function cnt(k,fn){var m={};all.forEach(function(u){if(pass(u,k)){var x=fn(u);m[x]=(m[x]||0)+1;}});return m;}
    render=function(){
      var res=all.filter(function(u){return pass(u);});
      res.sort(function(a,b){if(st.sort==='price_asc')return (a.price==null)-(b.price==null)||a.price-b.price;if(st.sort==='price_desc')return (a.price==null)-(b.price==null)||b.price-a.price;return (b.date||'').localeCompare(a.date||'');});
      var cc=cnt('c',function(u){return u.category;}), sc=cnt('src',function(u){return u.source;}), pc=cnt('pr',function(u){if(u.price==null)return -1;for(var i=0;i<PRICE.length;i++)if(u.price>=PRICE[i][0]&&u.price<PRICE[i][1])return i;});
      var h='<div class="listing"><aside class="filters" id="filters"><div class="fclose" style="justify-content:space-between;align-items:center;padding:6px 0 10px;border-bottom:1px solid var(--line)"><span class="label">'+esc(t('filters'))+'</span><button class="btn" data-act="fclose">'+esc(t('close'))+'</button></div>';
      h+='<div class="fg"><h3 class="label">'+esc(t('f_category'))+'</h3>'+I.CATS.filter(function(c){return cc[c]||st.c.has(c);}).map(function(c){return '<label><input type="checkbox" data-f="c" value="'+c+'"'+(st.c.has(c)?' checked':'')+'>'+esc(t('cat_'+c))+'<span class="n">'+(cc[c]||0)+'</span></label>';}).join('')+'</div>';
      h+='<div class="fg"><h3 class="label">'+esc(t('f_source'))+'</h3>'+Object.keys(sc).sort(function(a,b){return sc[b]-sc[a];}).map(function(s){return '<label><input type="checkbox" data-f="src" value="'+esc(s)+'"'+(st.src.has(s)?' checked':'')+'>'+esc(s)+'<span class="n">'+sc[s]+'</span></label>';}).join('')+'</div>';
      h+='<div class="fg"><h3 class="label">'+esc(t('f_price'))+'</h3>'+PRICE.map(function(_,i){return pc[i]||st.pr.has(''+i)?'<label><input type="checkbox" data-f="pr" value="'+i+'"'+(st.pr.has(''+i)?' checked':'')+'>'+esc(priceLabel(i))+'<span class="n">'+(pc[i]||0)+'</span></label>':'';}).join('')+'</div>';
      h+='<div class="fg"><button class="btn" data-act="reset">'+esc(t('f_reset'))+'</button></div><div class="fdone"><button class="btn primary" data-act="fclose">'+esc(t('f_done'))+' ('+nfNum.format(res.length)+')</button></div></aside><section>';
      h+='<div class="toolbar"><button class="btn fbtn" data-act="fopen">'+esc(t('filters'))+'</button><span class="count">'+esc(t('n_items',{n:nfNum.format(res.length)}))+'</span><span class="sp"></span><select class="sel" data-act="sort">'+['date_desc','price_asc','price_desc'].map(function(k){return '<option value="'+k+'"'+(st.sort===k?' selected':'')+'>'+esc(t('s_'+k))+'</option>';}).join('')+'</select></div>';
      npages=Math.max(1,Math.ceil(res.length/PS)); if(st.page>npages){st.page=npages;syncURL(false);}
      h+=res.length?'<div class="ulist">'+res.slice((st.page-1)*PS,st.page*PS).map(urow).join('')+'</div>'+pager(st.page,npages):'<div class="empty">'+esc(t('no_results'))+'</div>';
      var fo=document.getElementById('filters'),wasOpen=fo&&fo.classList.contains('on');
      el.innerHTML=h+'</section></div>'; if(wasOpen)document.getElementById('filters').classList.add('on');
    };
    ready=true; window.__rerender=render; render();
    el.addEventListener('change',function(e){var x=e.target,f=x.getAttribute('data-f');if(f){x.checked?st[f].add(x.value):st[f].delete(x.value);}else if(x.getAttribute('data-act')==='sort')st.sort=x.value;else return;st.page=1;syncURL();render();});
    el.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var a=b.getAttribute('data-act');
      if(a==='reset'){st.c.clear();st.src.clear();st.pr.clear();st.page=1;syncURL();render();}
      else if(a==='fopen'){document.getElementById('filters').classList.add('on');document.body.style.overflow='hidden';}
      else if(a==='fclose'){document.getElementById('filters').classList.remove('on');document.body.style.overflow='';}});
  }).catch(function(){el.innerHTML='<div class="empty">'+esc(t('load_error'))+'</div>';});
}
/* ---------- product page ---------- */
function gallery(g){
  var track=g.querySelector('.gal-track'), n=track.children.length, i=0, main=g.querySelector('.gal-main');
  var thumbs=g.querySelectorAll('.gal-thumbs button'), idx=g.querySelector('.gal-idx');
  function go(k){i=(k+n)%n;track.style.transform='translateX('+(-100*i)+'%)';thumbs.forEach(function(b,j){b.classList.toggle('on',j===i);});if(idx)idx.textContent=(i+1)+' / '+n;
    var im=track.children[i].querySelector('img');if(im&&im.loading==='lazy')im.loading='eager';if(thumbs[i])thumbs[i].scrollIntoView({block:'nearest',inline:'nearest'});}
  g.querySelectorAll('.gal-nav').forEach(function(b){b.addEventListener('click',function(){go(i+(b.classList.contains('n')?1:-1));});});
  thumbs.forEach(function(b,j){b.addEventListener('click',function(){go(j);});});
  main.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){go(i+1);e.preventDefault();}if(e.key==='ArrowLeft'){go(i-1);e.preventDefault();}if(e.key==='Enter')open();});
  var x0=null,y0=null; main.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  main.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){go(i+(dx<0?1:-1));}x0=null;});
  var lb=document.getElementById('lb'), lbimg=lb.querySelector('img'), stage=lb.querySelector('.lb-stage'), lbi=lb.querySelector('.lb-i');
  function show(){var f=track.children[i];lbimg.src=f.getAttribute('data-full');lbimg.alt=f.querySelector('img').alt;lbi.textContent=(i+1)+' / '+n;stage.classList.remove('zoom');}
  function open(){show();lb.classList.add('on');document.body.style.overflow='hidden';lb.querySelector('.lb-x').focus();}
  function close(){lb.classList.remove('on');document.body.style.overflow='';main.focus();}
  track.querySelectorAll('figure').forEach(function(f){f.addEventListener('click',open);});
  lb.querySelector('.lb-x').addEventListener('click',close);
  lb.querySelector('.lb-p').addEventListener('click',function(){go(i-1);show();});
  lb.querySelector('.lb-n').addEventListener('click',function(){go(i+1);show();});
  lbimg.addEventListener('click',function(e){var z=stage.classList.toggle('zoom');if(z){var r=lbimg.getBoundingClientRect();stage.scrollLeft=(e.clientX/r.width)*lbimg.offsetWidth-stage.clientWidth/2;stage.scrollTop=((e.clientY-r.top)/r.height)*lbimg.offsetHeight-stage.clientHeight/2;}});
  document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;if(e.key==='Escape')close();if(e.key==='ArrowRight'){go(i+1);show();}if(e.key==='ArrowLeft'){go(i-1);show();}});
  var lx=null; stage.addEventListener('touchstart',function(e){if(e.touches.length===1&&!stage.classList.contains('zoom'))lx=e.touches[0].clientX;else lx=null;},{passive:true});
  stage.addEventListener('touchend',function(e){if(lx===null)return;var dx=e.changedTouches[0].clientX-lx;if(Math.abs(dx)>50){go(i+(dx<0?1:-1));show();}lx=null;});
  go(0);
}
function videos(){document.querySelectorAll('.yt').forEach(function(b){b.addEventListener('click',function(){
  var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+b.getAttribute('data-id')+'?autoplay=1&rel=0&playsinline=1';
  f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';f.allowFullscreen=true;f.title=b.getAttribute('aria-label')||'YouTube';
  f.referrerPolicy='strict-origin-when-cross-origin';b.innerHTML='';b.appendChild(f);b.style.cursor='default';},{once:true});});}
function counter(){
  var el=document.getElementById('pv'); if(!el||!C.id)return; var key='tor_s_'+C.id, ns=I.COUNTER_NS, seen=false;
  try{seen=sessionStorage.getItem(key);sessionStorage.setItem(key,'1');if(!seen)localStorage.setItem('tor_v_'+C.id,localPop(C.id)+1);}catch(e){}
  fetch('https://abacus.jasoncameron.dev/'+(seen?'get':'hit')+'/'+ns+'/'+C.id).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j&&j.value!=null){el.setAttribute('data-num',j.value);el.textContent=nfNum.format(j.value);el.parentNode.style.display='';}}).catch(function(){});
}
function stars(n){var s='';for(var i=1;i<=5;i++)s+=i<=Math.round(n)?'★':'☆';return s;}
function reviews(){
  var box=document.getElementById('ureviews'); if(!box||!C.id)return;
  var tag='[review:'+C.id+']', repo=I.REPO, baked=(C.reviews||[]);
  function show(list){
    var seen={}, all=[]; baked.concat(list).forEach(function(r){if(!seen[r.url]){seen[r.url]=1;all.push(r);}});
    var lst=box.querySelector('.rlist'), avg=box.querySelector('.ravg');
    if(!all.length){lst.innerHTML='<p class="sub">'+esc(t('ur_none'))+'</p>';avg.textContent='';return;}
    var sum=0,n=0; all.forEach(function(r){if(r.rating){sum+=r.rating;n++;}});
    avg.innerHTML=n?'<span class="stars">'+stars(sum/n)+'</span> '+esc(t('ur_avg',{r:(sum/n).toFixed(1),n:n})):'';
    lst.innerHTML=all.map(function(r){return '<div class="rev"><div class="h">'+(r.rating?'<span class="stars">'+stars(r.rating)+'</span>':'')+'<span>'+esc(r.user)+'</span><span>'+esc(fdate(r.date))+'</span><a href="'+esc(r.url)+'" target="_blank" rel="noopener">GitHub</a></div><p>'+esc(r.text)+'</p></div>';}).join('');
  }
  function parse(is){return is.filter(function(x){return !x.pull_request&&x.title.indexOf(tag)===0&&!(x.labels||[]).some(function(l){return /hidden|spam/i.test(l.name);});}).map(function(x){
    var b=x.body||'', m=b.match(/Rating:\s*([1-5])\s*\/\s*5/i), txt=b.replace(/Rating:.*\n?/i,'').split(/\n-{3,}\n|\n— Product:/)[0].trim();
    return {rating:m?+m[1]:null,user:x.user&&x.user.login,date:(x.created_at||'').slice(0,10),text:txt.slice(0,2000),url:x.html_url};});}
  var ck='tor_iss', cached=null; try{cached=JSON.parse(sessionStorage.getItem(ck)||'null');}catch(e){}
  if(cached&&Date.now()-cached.t<6e5)show(parse(cached.d));
  else{show([]);fetch('https://api.github.com/repos/'+repo+'/issues?state=open&per_page=100&sort=created&direction=desc',{headers:{Accept:'application/vnd.github+json'}}).then(function(r){return r.ok?r.json():[];}).then(function(d){try{sessionStorage.setItem(ck,JSON.stringify({t:Date.now(),d:d}));}catch(e){}show(parse(d));}).catch(function(){});}
  var pick=0, sp=box.querySelector('.starpick');
  sp.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){pick=+b.value;sp.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',+x.value<=pick);x.setAttribute('aria-pressed',+x.value<=pick);});box.querySelector('.err').textContent='';});});
  box.querySelector('.rsubmit').addEventListener('click',function(){
    if(!pick){box.querySelector('.err').textContent=t('ur_need_star');return;}
    var txt=box.querySelector('textarea').value.trim();
    var body='Rating: '+pick+'/5\n\n'+(txt||'(no text)')+'\n\n— Product: '+location.href.split('?')[0]+'\n';
    var u='https://github.com/'+repo+'/issues/new?title='+encodeURIComponent(tag+' '+C.name)+'&body='+encodeURIComponent(body)+'&labels=review';
    window.open(u,'_blank','noopener');});
}
document.addEventListener('DOMContentLoaded',function(){
  chrome(); applyI18n(); document.documentElement.classList.remove('i18n-wait');
  var l=document.getElementById('listing'); if(l)listing(l);
  var u=document.getElementById('used'); if(u)used(u);
  var g=document.querySelector('.gal'); if(g&&g.querySelector('.gal-track'))gallery(g);
  videos(); counter(); reviews();
});
})();

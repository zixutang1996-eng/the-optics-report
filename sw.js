/* The Optics Report service worker. b4e3dd79 is replaced at build time. */
var V='tor-b4e3dd79',SHELL=V+'-shell',RT=V+'-rt',RT_MAX=60;
var BASE=new URL('./',self.location).pathname;
var PRE=['./','offline.html','manifest.webmanifest','assets/css/site.css?v=b4e3dd79','assets/js/i18n.js?v=b4e3dd79','assets/js/app.js?v=b4e3dd79',
'assets/fonts/barlow-latin-400.woff2','assets/fonts/barlow-semi-condensed-latin-600.woff2','assets/pwa/icon-192.png','assets/pwa/icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(SHELL).then(function(c){return Promise.all(PRE.map(function(u){return c.add(new Request(u,{cache:'reload'})).catch(function(){});}));}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('tor-')===0&&k.indexOf(V+'-')!==0;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
function trim(name){caches.open(name).then(function(c){c.keys().then(function(ks){for(var i=0;i<ks.length-RT_MAX;i++)c.delete(ks[i]);});});}
function put(name,req,res){if(res&&res.ok&&res.type==='basic'){var cl=res.clone();caches.open(name).then(function(c){c.put(req,cl).then(function(){if(name===RT)trim(RT);});});}return res;}
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.indexOf(BASE)!==0)return;
  if(r.mode==='navigate'){ /* network-first so weekly updates show; fall back to cache, then offline page */
    e.respondWith(fetch(r).then(function(res){return put(RT,r,res);}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match(BASE+'offline.html');});}));return;}
  var p=u.pathname.slice(BASE.length);
  if(/^assets\/(css|js|fonts|pwa)\//.test(p)){ /* versioned shell assets: cache-first */
    e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){return put(SHELL,r,res);});}));return;}
  if(/^data\//.test(p)||/\.json$/.test(p)){ /* data: network-first */
    e.respondWith(fetch(r).then(function(res){return put(RT,r,res);}).catch(function(){return caches.match(r);}));return;}
  if(/^assets\/img\//.test(p)){ /* product images: stale-while-revalidate, capped */
    e.respondWith(caches.match(r).then(function(m){var f=fetch(r).then(function(res){return put(RT,r,res);}).catch(function(){return m;});return m||f;}));}
});

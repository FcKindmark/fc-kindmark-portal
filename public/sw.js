// Only the public offline notice is cached. Auth, API responses and member/finance pages always use the network.
const CACHE='kindmark-public-offline-v1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kindmark-public-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html').then(response=>response||Response.error())));
});

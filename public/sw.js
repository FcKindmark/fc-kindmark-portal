// Only the public offline notice is cached. Auth, API responses and member/finance pages always use the network.
const CACHE='kindmark-public-offline-v1';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kindmark-public-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html').then(response=>response||Response.error())));
});

self.addEventListener('push',event=>{
  let payload={};try{payload=event.data?.json()||{};}catch{}
  let url='/';try{const target=new URL(payload.url||'/',self.location.origin);if(target.origin===self.location.origin){if(target.searchParams.has('family'))target.searchParams.set('push','1');url=target.href;}}catch{}
  event.waitUntil(self.registration.showNotification(payload.title||'FC Kindmark',{
    body:payload.body||'Du har ett nytt meddelande i portalen.',icon:'/icons/app-192.png',badge:'/icons/app-192.png',
    tag:payload.tag||'kindmark-message',data:{url,userId:payload.userId},lang:'sv'
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL(event.notification.data?.url||'/',self.location.origin);
    if(target.origin!==self.location.origin)return;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const client=windows.find(c=>new URL(c.url).origin===self.location.origin);
    if(client){await client.navigate(target.href);await client.focus();}else await self.clients.openWindow(target.href);
  })());
});

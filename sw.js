const CACHE_PREFIX='viridian-offline-';
const CACHE_NAME='viridian-offline-v4';
const APP_SHELL=['./','./index.html','./favicon.svg','./manifest.webmanifest','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map(path=>cache.add(path)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin===self.location.origin){
    if(request.mode==='navigate'){
      event.respondWith((async()=>{
        try{
          const response=await fetch(request);
          if(response&&response.ok){const cache=await caches.open(CACHE_NAME);cache.put('./index.html',response.clone());}
          return response;
        }catch(error){
          return (await caches.match('./index.html'))||(await caches.match('./'))||Response.error();
        }
      })());
      return;
    }
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response&&response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
        return response;
      }catch(error){return Response.error();}
    })());
    return;
  }
  if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.includes('supabase-js')){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      try{
        const response=await fetch(request);
        if(response&&(response.ok||response.type==='opaque')){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
        return response;
      }catch(error){return cached||Response.error();}
    })());
  }
});

// Starts the site-tier first-view requests (manifest, first-view packs and page maps) before the page's first WebGL
// context is created, which holds the main thread for about 1.3 s on a fresh profile, and hands each response to the
// first loader request for the same URL. Later requests for a URL go to the network as usual.
export function createEarlyFetch(base,{get=globalThis.fetch.bind(globalThis)}={}){
  const started=new Map(),primed=[];
  function start(url,init){
    if(!started.has(url)){const promise=get(url,init);promise.catch(()=>{});started.set(url,promise);primed.push(url);}
    return started.get(url);
  }
  function fetchOnce(url,init){
    const key=String(url),promise=started.get(key);
    if(promise){started.delete(key);return promise;}
    return get(url,init);
  }
  async function primeFirstView(){
    const manifest=await start(base+'manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.clone().json():null).catch(()=>null);
    if(!manifest)return [];
    const files=[...(manifest.firstView??[]).map(name=>manifest.packs?.[name]?.file),
      ...(manifest.firstViewPages??[]).flatMap(name=>Object.values(manifest.pages?.[name]?.maps??{}).map(map=>map.file))].filter(Boolean);
    for(const file of files)start(base+file);
    return files;
  }
  return {fetch:fetchOnce,primeFirstView,primed:()=>[...primed],unclaimed:()=>[...started.keys()]};
}

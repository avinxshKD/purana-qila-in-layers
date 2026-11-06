import * as THREE from 'three';
import {expandCrop} from './pool-field.js';

// Site pool catalogue (backend contract v1.2): pools[featureId] gains {texture, position, target, angle, hull, ...}
// once its field is fetched. Nothing is fetched up front except the manifest. The site set is 8-bit cropped fields;
// each is expanded to the full projector square (the spot light's map covers the whole cone) as grey RGBA data.
export const SITE_POOL_DIRECTORY='site-pools-m2b/';
export const FILM_POOL_DIRECTORY='film-emphasis-m2b/';
const hex=buffer=>Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');
export function poolTexture(rgba,size){
  const texture=new THREE.DataTexture(rgba,size,size,THREE.RGBAFormat);
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
  return texture;
}
const nextIdle=()=>new Promise(resolve=>globalThis.requestIdleCallback?requestIdleCallback(()=>resolve(),{timeout:1000}):setTimeout(resolve,0));
export async function loadSitePools({baseURL=globalThis.document?.baseURI,fetcher=globalThis.fetch.bind(globalThis),source='site',clock=()=>performance.now(),onTask=()=>{},idle=nextIdle}={}){
  if(!['site','film'].includes(source))throw new Error('Unknown pool source '+source);
  const directory=source==='film'?FILM_POOL_DIRECTORY:SITE_POOL_DIRECTORY,base=new URL(directory,baseURL),start=clock();
  const response=await fetcher(new URL('manifest.json',base),{cache:'no-cache'});if(!response.ok)throw new Error(`Pool manifest: HTTP ${response.status}`);
  const manifest=await response.json();
  if(source==='site'&&manifest.format!=='r8-crop')throw new Error('Pool manifest: unknown format '+manifest.format);
  onTask({name:'pool-manifest',source,durationMs:clock()-start});
  const records={},fieldHashes={},pools={},pending=new Map(),failed={};let bytesFetched=0,disposed=false;
  for(const [id,record] of Object.entries(manifest.fields)){records[id]={...record};fieldHashes[id]=record.sha256;}
  async function fetchPool(id){
    const record=manifest.fields[id],begin=clock(),r=await fetcher(new URL(record.file,base));
    const fail=message=>Object.assign(new Error(`Pool field ${id}: ${message}`),{pool:id,pack:'pool:'+id});
    if(!r.ok)throw fail('HTTP '+r.status);
    const buffer=await r.arrayBuffer();if(hex(await crypto.subtle.digest('SHA-256',buffer))!==record.sha256)throw fail('hash differs');
    let rgba;const expandStart=clock();
    if(source==='site')rgba=expandCrop(new Uint8Array(buffer),record.crop,manifest.size);
    else{if(buffer.byteLength!==manifest.size*manifest.size*4)throw fail('byte count differs');rgba=new Uint8Array(buffer);}
    const {file:_file,sha256:_sha,sourceFile:_sf,sourceSHA256:_ss,crop:_crop,uvTransform:_uv,...pose}=record;
    const pool={...pose,texture:poolTexture(rgba,manifest.size),fieldSHA256:record.sha256};onTask({name:'pool-expand',featureId:id,startTimeMs:expandStart,durationMs:clock()-expandStart});
    if(disposed){pool.texture.dispose();throw fail('catalogue disposed');}
    bytesFetched+=buffer.byteLength;pools[id]=pool;delete failed[id];onTask({name:'pool-field',featureId:id,bytes:buffer.byteLength,startTimeMs:begin,durationMs:clock()-begin});
    return pool;
  }
  function ensure(id){
    if(pools[id])return Promise.resolve(pools[id]);
    if(!manifest.fields[id])return Promise.reject(new Error('Unknown pool '+id));
    if(!pending.has(id)){
      const promise=fetchPool(id).finally(()=>pending.delete(id));promise.catch(error=>{failed[id]=error.message;});pending.set(id,promise);
    }
    return pending.get(id);
  }
  let prefetched=0;
  return {pools,records,fieldHashes,manifest,source,directory,
    has:id=>!!manifest.fields[id],isResident:id=>!!pools[id],get:id=>pools[id]??null,ensure,
    ensureAll:ids=>Promise.all(ids.map(ensure)).then(()=>{}),
    // Background fill in the given order, one field per idle slot; failures stay retryable on demand.
    async prefetch(ids){
      const start=clock();
      for(const id of ids){if(disposed)return;if(pools[id])continue;await idle();if(disposed)return;await ensure(id).then(()=>prefetched++,()=>{});}
      onTask({name:'pool-prefetch',count:prefetched,durationMs:clock()-start});
    },
    metadata:()=>({source,directory,format:manifest.format??'rgba',size:manifest.size,total:Object.keys(manifest.fields).length,loaded:Object.keys(pools),pending:[...pending.keys()],failed:{...failed},bytesFetched,prefetched}),
    dispose(){disposed=true;for(const pool of Object.values(pools))pool.texture.dispose();}
  };
}

export const POOL_FIELD_DIRECTORY='film-emphasis-m2b/';
export async function loadPoolFields({baseURL=globalThis.document?.baseURI,fetcher=globalThis.fetch}={}){
  const base=new URL(POOL_FIELD_DIRECTORY,baseURL),response=await fetcher(new URL('manifest.json',base));if(!response.ok)throw new Error('Missing deterministic pool fields');
  const manifest=await response.json(),pools={},fieldHashes={};
  await Promise.all(Object.entries(manifest.fields).map(async([id,record])=>{
    const response=await fetcher(new URL(record.file,base));if(!response.ok)throw new Error('Missing pool field '+id);const buffer=await response.arrayBuffer();
    if(buffer.byteLength!==manifest.size*manifest.size*4)throw new Error('Pool field byte count differs: '+id);
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),n=>n.toString(16).padStart(2,'0')).join('');
    if(hash!==record.sha256)throw new Error('Pool field hash differs: '+id);
    pools[id]={...record,bytes:new Uint8Array(buffer)};fieldHashes[id]=hash;
  }));
  return {pools,fieldHashes,manifest};
}

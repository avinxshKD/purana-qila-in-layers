import {createOcclusionKernel} from './occlusion-kernel.js';
import {loadSiteTierAssets} from '../site-tier/assets.js';
import thirdPartyLicense from './three-mesh-bvh-LICENSE.txt?raw';
const kernel=createOcclusionKernel();
// Messages run in arrival order; 'load-stack' fetches the boundary grids pack (already in the HTTP cache from the
// page's world build) and inflates it here, so later displaced work waits for it.
let queue=Promise.resolve();
async function handle({id,type,data}){
  try{
    if(type==='load-stack'){const start=performance.now(),grid=await (await loadSiteTierAssets({base:data.base})).grids();kernel.run('stack',{grid});self.postMessage({id,result:{loadMs:performance.now()-start,thirdPartyLicense}});return;}
    self.postMessage({id,result:{...kernel.run(type,data),thirdPartyLicense}});
  }catch(error){self.postMessage({id,error:error.message});}
}
self.onmessage=({data})=>{queue=queue.then(()=>handle(data));};

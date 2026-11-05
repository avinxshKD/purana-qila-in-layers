import {createCalloutEmphasis} from '../film/emphasis.js';

// UI state only. Geometry/pool math is the unchanged shared implementation. With a lazy catalogue a marker's pool
// lights only once its field is resident; until then the marker is not active and nothing stands in for the pool.
export function createActiveMarkerEmphasis(scene,{pools={},catalog=null,onPoolReady=()=>{},powers={},anchorFor,visible=()=>true,strength=0}={}){
  const effect=createCalloutEmphasis(scene,{pools,powers,strength,featureIdFor:c=>c.featureId,idleMapSize:catalog?1:512}),entries=Array.from({length:2},(_,slot)=>({slot,id:null,opacity:0,anchor:null}));
  const known=new Set(Object.keys(pools));
  let active=null,requested=null,disposed=false;
  function adopt(id){const pool=catalog?.get(id);if(pool&&!known.has(id)){effect.addPool(id,pool);known.add(id);}return known.has(id);}
  function setActive(id){
    requested=null;
    if(id&&!adopt(id)&&catalog?.has(id)){
      requested=id;
      catalog.ensure(id).then(()=>{if(disposed)return;adopt(id);if(requested===id)setActive(id);onPoolReady(id);},error=>{if(requested===id)requested=null;console.warn('Pool field unavailable',id,error);});
    }
    active=id&&known.has(id)?id:null;
    if(active&&!entries.some(e=>e.id===active)){const entry=[...entries].sort((a,b)=>a.opacity-b.opacity)[0];entry.id=active;entry.opacity=0;entry.anchor=null;}
  }
  function update(dt=1/60,{immediate=false}={}){
    let moving=false;const anchors={},callouts=[];
    for(const entry of entries){
      if(!entry.id)continue;const anchor=anchorFor(entry.id);if(anchor?.point&&anchor.visible!==false)entry.anchor=anchor;
      const desired=entry.id===active&&anchor?.visible!==false&&anchor?.point&&visible(entry.id)?Math.max(0,Math.min(1,anchor.opacity??1)):0;
      const next=immediate?desired:entry.opacity+(desired-entry.opacity)*(1-Math.exp(-Math.max(0,dt)/.09));entry.opacity=Math.abs(next-desired)<.0005?desired:next;moving ||= entry.opacity!==desired;
      if(entry.anchor)anchors[entry.id]=entry.anchor;callouts.push({id:entry.id,featureId:entry.id,slot:entry.slot,opacity:entry.opacity});
    }
    effect.update(callouts,anchors);return moving;
  }
  return {setActive,update,metadata:()=>({activeFeature:active,pendingPool:requested,entries:entries.map(({id,slot,opacity})=>({id,slot,opacity})),lights:effect.state()}),
    // Catalogue textures belong to the catalogue; only each light's own map is disposed here.
    dispose(){disposed=true;for(const light of effect.lights){scene.remove(light,light.target);light.userData.ownMap.dispose();}}
  };
}

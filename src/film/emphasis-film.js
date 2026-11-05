import * as THREE from 'three';
import {sampleGrid} from '../eras/stack.js';
import {createCalloutEmphasis,featureFootprint,featureMeasurementScene} from './emphasis.js';
import {CALLOUT_POWERS} from './emphasis-powers.js';
import {loadPoolFields} from './emphasis-fields.js';

// Era/film adaptation stays outside the reusable stock-material light implementation.
export async function createFilmEmphasis(world,copy,{prebaked=true,sampleTop}={}){
  const areas=new Map(),site=world.eraSite();
  const topAt=sampleTop||((x,z)=>sampleGrid(site.stack,site.activeTop,x,z)),{pools={},fieldHashes={}}=prebaked?await loadPoolFields():{};
  const items=[...site.items];
  if(!site.items.some(it=>it.featureId==='mauryan-ring-well'))world.scene.traverse(node=>{
    const group=node.userData.group||node.name||'';
    if(node.isMesh&&(node.userData.featureId==='mauryan-ring-well'||group.startsWith('ring-'))){
      items.push({featureId:'mauryan-ring-well',handle:{object:node}});
    }
  });
  function areaFor(id,anchor){
    if(!areas.has(id)){
      // Use all stored courses, not only the first partly revealed draw range.
      const area=featureFootprint(items,id,{fullGeometry:true,clusters:id!=='mauryan-ring-well'})||{target:[...anchor.point],width:2,height:.5,angle:0,measurementRegion:'2m x0.5m front-face soil patch around the returned soil anchor',nativePartCount:0,clusterCount:1,connectedComponentCount:1};
      if(!area.vertices){
        const [x,y,z]=anchor.point;
        Object.defineProperty(area,'vertices',{value:[[x-1,y-.25,z],[x+1,y-.25,z],[x+1,y+.25,z],[x-1,y+.25,z]]});
      }
      area.groundY=topAt(area.target[0],area.target[2]);
      const exposed=area.vertices.filter(p=>!site.soilAt(...p));
      if(exposed.length)Object.defineProperty(area,'visibleVertices',{value:exposed});
      areas.set(id,area);
    }
    return areas.get(id);
  }
  const effect=createCalloutEmphasis(world.scene,{
    powers:CALLOUT_POWERS,pools,
    featureIdFor:c=>copy.sections[c.sectionIndex].callouts[c.slot].featureId,
    featureAreaFor(c,anchor){const area=areaFor(copy.sections[c.sectionIndex].callouts[c.slot].featureId,anchor);area.lightPosition=world.camera.position.toArray();return area;}
  });
  return {...effect,items,fieldHashes,footprint:id=>areas.get(id)||effect.poolFor(id)?.footprint||featureFootprint(items,id,{fullGeometry:true}),
    measurementScene(id,adapter,anchor){
      const result=featureMeasurementScene(world.scene,items,adapter,id);
      if(id==='pre-mauryan-soil'&&anchor?.point){
        // A measurement-only patch on the actual front soil band, not archaeological geometry.
        const material=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}),geometry=new THREE.PlaneGeometry(2,.5),patch=new THREE.Mesh(geometry,material);
        patch.position.set(anchor.point[0],anchor.point[1],8.002);result.scene.add(patch);result.scene.updateMatrixWorld(true);
        const dispose=result.dispose;result.dispose=()=>{dispose();material.dispose();geometry.dispose();};
      }
      return result;
    }
  };
}

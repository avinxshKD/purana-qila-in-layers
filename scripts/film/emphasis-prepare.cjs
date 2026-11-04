'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{root}=require('../browser.cjs');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];},out=path.resolve(get('--out')||path.join(root,'output/film/f2/emphasis-r1')),source=path.join(out,'source');
if(fs.existsSync(source))throw new Error('Preserve existing prototype source');
const baseline=path.join(root,'output/film/f2/preflight-m1-r2/source');
fs.mkdirSync(out,{recursive:true});fs.cpSync(baseline,source,{recursive:true});fs.copyFileSync(path.join(root,'src/film/emphasis.js'),path.join(source,'src/film/emphasis.js'));
const file=path.join(source,'src/film/main.js');let body=fs.readFileSync(file,'utf8');
body="import {createCalloutEmphasis,featureMeasurementScene,featureFootprint} from './emphasis.js';\nimport {sampleGrid} from '../eras/stack.js';\n"+body;
body=body.replace('function visibleMeshes(){',`const featureAreas=new Map();
const emphasis=new URLSearchParams(location.search).get('emphasis')==='absent'?null:createCalloutEmphasis(world.scene,{
  featureIdFor:c=>copy.sections[c.sectionIndex].callouts[c.slot].featureId,
  featureAreaFor(c,anchor){const id=copy.sections[c.sectionIndex].callouts[c.slot].featureId;if(!featureAreas.has(id)){const site=world.eraSite(),area=featureFootprint(site.items,id)||{target:anchor.point,width:.7,height:.7,angle:0};area.groundY=sampleGrid(site.stack,site.activeTop,area.target[0],area.target[2]);if(area.vertices)Object.defineProperty(area,'visibleVertices',{value:area.vertices.filter(p=>!site.soilAt(...p))});featureAreas.set(id,area);}const area=featureAreas.get(id);area.lightPosition=world.camera.position.toArray();return area;}
});
function visibleMeshes(){`);
body=body.replace('  auditGeometry.beginFrame(state.scene);','  emphasis?.update(state.overlays.callouts,applied.featureAnchors);\n  auditGeometry.beginFrame(state.scene);');
body+=`
window.strataEmphasis={
  configure:options=>emphasis?.configure(options),
  state:()=>emphasis?.state()||[],
  prepare(seconds){const d=prepare(seconds,{audit:false});overlays.draw(d.layout,d.state);return d.state;},
  draw(){const gl=world.renderer.getContext(),start=performance.now();world.renderer.info.reset();world.renderer.autoClear=true;world.renderer.render(world.scene,world.camera);world.renderer.autoClear=false;world.renderer.render(overlays.scene,overlays.camera);const submitted=performance.now();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));return {submitMs:submitted-start,synchronizedReadbackMs:performance.now()-start,programs:world.renderer.info.programs.length,drawCalls:world.renderer.info.render.calls};},
  programs:()=>world.renderer.info.programs.map(p=>p.id),
  footprint(featureId){return featureFootprint(world.eraSite().items,featureId);},
  falloffSamples(featureId){
    const area=featureFootprint(world.eraSite().items,featureId),site=world.eraSite(),rows=[];
    if(!area)return rows;
    const c=Math.cos(area.angle),s=Math.sin(area.angle),meshes=visibleMeshes();
    for(const axis of[0,1])for(const side of[-1,1])for(const along of[-.3,0,.3])for(const outside of[.5,1]){
      const uv=axis===0?[side*(area.width/2+outside),along*area.height]:[along*area.width,side*(area.height/2+outside)];
      const x=area.target[0]+uv[0]*c-uv[1]*s,z=area.target[2]+uv[0]*s+uv[1]*c;if(x<-12||x>12||z<-8||z>8)continue;
      const y=sampleGrid(site.stack,site.activeTop,x,z),p=new THREE.Vector3(x,y,z),v=p.clone().project(world.camera),direction=p.clone().sub(world.camera.position),distance=direction.length();
      const ray=new THREE.Raycaster(world.camera.position,direction.normalize(),0,distance+.03),hit=auditGeometry.intersect(ray,meshes)[0];
      let role=hit?.object;while(role&&!role.userData.sectionRole)role=role.parent;
      const visible=role?.userData.sectionRole==='top'&&Math.abs(hit.distance-distance)<.03;
      rows.push({axis,side,along,outsideMetres:outside,world:p.toArray(),pixel:{x:(v.x+1)*width/2,y:(1-v.y)*height/2},visible,firstRole:role?.userData.sectionRole});
    }return rows;
  },
  scenePixels(){world.renderer.autoClear=true;world.renderer.render(world.scene,world.camera);return world.readPixels();},
  mask(featureId){
    const measure=featureMeasurementScene(world.scene,world.eraSite().items,auditGeometry,featureId),target=new THREE.WebGLRenderTarget(width,height,{samples:4}),previous=world.renderer.getRenderTarget(),tone=world.renderer.toneMapping,shadow=world.renderer.shadowMap.enabled;
    const bytes=new Uint8Array(width*height*4);
    try{world.renderer.setRenderTarget(target);world.renderer.autoClear=true;world.renderer.toneMapping=THREE.NoToneMapping;world.renderer.shadowMap.enabled=false;world.renderer.render(measure.scene,world.camera);world.renderer.readRenderTargetPixels(target,0,0,width,height,bytes);}
    finally{world.renderer.setRenderTarget(previous);world.renderer.toneMapping=tone;world.renderer.shadowMap.enabled=shadow;target.dispose();measure.dispose();}
    return bytes;
  },
  readPixels:world.readPixels
};
`;
fs.writeFileSync(file,body);
fs.writeFileSync(path.join(out,'prototype-source.json'),JSON.stringify({baseline,baselineSnapshotSHA256:'1a78f9d0b43228cf6841166ba721d4816df1671aca31212d1b6c0b9bec6dbe48',changes:['Optional emphasis module and measurement API only. Accepted r2 scene, camera, materials, geometry, HUD and timing unchanged.'],controlMode:'?emphasis=absent creates no added lights before first render; prototype has two permanent spots even when disabled.'},null,2)+'\n');
const result=spawnSync(process.execPath,[path.join(__dirname,'snapshot.cjs'),'--source',source,'--out',out,'--frozen-source','--description','Optional neutral callout spotlight prototype on a separate frozen r2 copy'],{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);

// displacedKind(mesh): 'top'/'face' for era-displaced soil the worker displaces itself (calls then pass the applied
// deposits), null for meshes whose positions are copied as they are.
export function createOcclusionClient({worker=new Worker(new URL('./occlusion.worker.js',import.meta.url),{type:'module'}),clock=()=>performance.now(),onTask=()=>{},displacedKind=()=>null}={}){
  const geometries=new WeakMap(),pending=new Map();let sequence=0,nextGeometry=0,stats={builds:0,refits:0,queries:0,workerMs:0},maximumMainTaskMs=0;
  worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);if(data.error)task.reject(new Error(data.error));else{const {silhouette,visible,memory,...rest}=data.result;if('builds' in rest)stats=rest;task.resolve(data.result);}};
  worker.onerror=error=>{for(const task of pending.values())task.reject(new Error(error.message));pending.clear();};
  function request(type,data,transfer=[]){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});try{worker.postMessage({id,type,data},transfer);}catch(error){pending.delete(id);reject(error);}});}
  const requireDeposits=deposits=>{if(!Array.isArray(deposits)||deposits.length!==10)throw new Error('Displaced occluders need the applied deposits');return [...deposits];};
  function revision(geometry){return {position:geometry.attributes.position,positionCount:geometry.attributes.position.count,version:geometry.attributes.position.version,index:geometry.index,indexVersion:geometry.index?.version,groups:JSON.stringify(geometry.groups),start:geometry.drawRange.start,count:geometry.drawRange.count};}
  const same=(a,b)=>a&&Object.keys(b).every(key=>a[key]===b[key]);
  const topologySame=(a,b)=>a&&['index','indexVersion','groups','start','count','positionCount'].every(key=>a[key]===b[key]);
  // An evicted cut step disposes its geometries; the worker then drops its copies and BVHs.
  function recordFor(geometry){
    let record=geometries.get(geometry);if(record)return record;record={id:++nextGeometry};geometries.set(geometry,record);
    geometry.addEventListener?.('dispose',()=>{geometries.delete(geometry);request('release',{geometryId:record.id}).catch(()=>{});});return record;
  }
  async function ensure(geometry){
    const record=recordFor(geometry);
    const current=revision(geometry);if(same(record.revision,current))return record.id;
    if(record.pending){await record.pending;return ensure(geometry);}
    const start=clock(),source=current.position;
    let positions;if(source.isInterleavedBufferAttribute){positions=new Float32Array(source.count*3);for(let i=0;i<source.count;i++)positions.set([source.getX(i),source.getY(i),source.getZ(i)],i*3);}else positions=source.array.slice();
    const type=topologySame(record.revision,current)?'refit':'build',data={geometryId:record.id,positions},transfer=[positions.buffer];
    if(type==='build'){data.index=geometry.index?.array.slice();if(data.index)transfer.push(data.index.buffer);data.groups=geometry.groups.map(group=>({...group}));data.drawRange={...geometry.drawRange};}
    record.pending=request(type,data,transfer).then(()=>{record.revision=current;}).finally(()=>{record.pending=null;});
    const durationMs=clock()-start;maximumMainTaskMs=Math.max(maximumMainTaskMs,durationMs);onTask({name:'occlusion-copy',startTimeMs:start,durationMs});
    await record.pending;return ensure(geometry);
  }
  const DISPLACED_ATTRIBUTES=['position','eraSampleA','eraSampleB','eraBlend'];
  // Registered once per geometry (cut step); the worker keeps the source and displaces it for every state.
  function ensureDisplaced(mesh){
    const geometry=mesh.geometry,record=recordFor(geometry);if(record.registered)return record.registered;
    const start=clock(),attributes={},transfer=[];
    for(const name of DISPLACED_ATTRIBUTES){const a=geometry.attributes[name];if(!a)throw new Error('Displaced occluder lacks '+name);const array=a.array.slice();attributes[name]={array,itemSize:a.itemSize};transfer.push(array.buffer);}
    const index=geometry.index?.array.slice();if(index)transfer.push(index.buffer);
    record.registered=request('register',{geometryId:record.id,kind:displacedKind(mesh),attributes,index,groups:geometry.groups.map(group=>({...group})),drawRange:{...geometry.drawRange}},transfer);
    record.registered.catch(()=>{record.registered=null;});
    const durationMs=clock()-start;maximumMainTaskMs=Math.max(maximumMainTaskMs,durationMs);onTask({name:'occlusion-register',startTimeMs:start,durationMs});
    return record.registered;
  }
  function records(meshes,roleOf,deposits){
    return meshes.map(mesh=>({geometryId:geometries.get(mesh.geometry)?.id,...(displacedKind(mesh)?{deposits:requireDeposits(deposits)}:{}),matrixWorld:mesh.matrixWorld.toArray(),materialArray:Array.isArray(mesh.material),role:roleOf?.(mesh)||'',
      materials:(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(material=>({side:material.side,visible:material.visible,opacity:material.opacity,clipIntersection:!!material.clipIntersection,planes:(material.clippingPlanes||[]).map(p=>[p.normal.x,p.normal.y,p.normal.z,p.constant])})),
      ...(mesh.isInstancedMesh?{instances:mesh.instanceMatrix.array.slice(),count:mesh.count}:{})}));
  }
  return {
    async prepare(meshes){const seen=new Set();for(const mesh of meshes){if(seen.has(mesh.geometry))continue;seen.add(mesh.geometry);if(displacedKind(mesh))await ensureDisplaced(mesh);else await ensure(mesh.geometry);}},
    loadStack:base=>request('load-stack',{base}),
    // Displaces (and builds the BVH of) one registered soil mesh for these deposits, ahead of its first use.
    async warm(mesh,deposits){await ensureDisplaced(mesh);return request('warm',{geometryId:geometries.get(mesh.geometry).id,deposits:requireDeposits(deposits)});},
    memory:()=>request('memory',{}).then(result=>result.memory),
    async query(meshes,rays,{deposits}={}){
      const start=clock(),result=request('query',{meshes:records(meshes,undefined,deposits),rays});const durationMs=clock()-start;maximumMainTaskMs=Math.max(maximumMainTaskMs,durationMs);onTask({name:'occlusion-query-submit',startTimeMs:start,durationMs});
      return (await result).visible;
    },
    // Screen-space block outline rastered off the main thread from the prepared copies.
    async silhouette(meshes,{roleOf,camera,width,height,cell=4,deposits}){
      const start=clock(),result=request('silhouette',{meshes:records(meshes,roleOf,deposits),projectionMatrix:camera.projectionMatrix.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),width,height,cell});
      const durationMs=clock()-start;maximumMainTaskMs=Math.max(maximumMainTaskMs,durationMs);onTask({name:'silhouette-submit',startTimeMs:start,durationMs});
      return (await result).silhouette;
    },
    metadata:()=>({...stats,pendingOperations:pending.size,maximumMainTaskMs}),
    dispose(){worker.terminate();for(const task of pending.values())task.reject(new Error('Occlusion worker disposed'));pending.clear();}
  };
}
// query(valid,preview) may preview a partial result (dot visibility) before its slower part (the label outline).
export function createDeferredOcclusion({query,commit,preview=()=>{},blocked=()=>false,onError=error=>console.error(error),defer=null}){
  let revision=0,committed=-1,running=null,skipped=0,error=null;
  return {
    invalidate(){revision++;error=null;},
    update(){
      if(blocked()){skipped++;return;}
      if(committed===revision||running?.revision===revision)return;
      const ticket={revision};running=ticket;
      const valid=()=>ticket.revision===revision&&!blocked(),partial=result=>{if(valid())preview(result);};
      (defer?new Promise(resolve=>defer(resolve)):Promise.resolve()).then(()=>valid()?query(valid,partial):null).then(result=>{if(result!==null&&valid()){commit(result);committed=ticket.revision;}},failure=>{error=failure.message;onError(failure);}).finally(()=>{if(running===ticket)running=null;});
    },
    metadata:()=>({pending:committed!==revision||!!running,revision,committedRevision:committed,skippedInteractiveUpdates:skipped,error})
  };
}

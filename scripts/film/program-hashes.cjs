'use strict';
// Records every WebGL program the page links: SHA-256 of its vertex and fragment shader source
// (as passed to shaderSource, i.e. after Three's preprocessing). Works on any build, so a frozen
// M2b control build and an F3 build can be compared without changing either bundle.
async function installProgramRecorder(page){
  await page.evaluateOnNewDocument(()=>{
    const sources=new WeakMap(),attached=new WeakMap(),linked=[];
    const hex=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
    for(const proto of [WebGL2RenderingContext.prototype,WebGLRenderingContext.prototype]){
      const shaderSource=proto.shaderSource,attachShader=proto.attachShader,linkProgram=proto.linkProgram;
      proto.shaderSource=function(shader,source){sources.set(shader,source);return shaderSource.call(this,shader,source);};
      proto.attachShader=function(program,shader){(attached.get(program)||attached.set(program,[]).get(program)).push(shader);return attachShader.call(this,program,shader);};
      proto.linkProgram=function(program){
        const shaders=(attached.get(program)||[]).map(s=>({type:this.getShaderParameter(s,this.SHADER_TYPE),source:sources.get(s)||''})).sort((a,b)=>a.type-b.type);
        linked.push(shaders.map(s=>s.type+'\n'+s.source).join('\n----\n'));return linkProgram.call(this,program);
      };
    }
    window.__programRecorder={async hashes(){const list=await Promise.all(linked.map(hex));return {links:list.length,unique:[...new Set(list)].sort()};}};
  });
}
const readProgramHashes=page=>page.evaluate(()=>window.__programRecorder.hashes());
function compareProgramHashes(reference,candidate){
  const a=new Set(reference.unique),b=new Set(candidate.unique);
  return {equal:a.size===b.size&&[...a].every(h=>b.has(h)),onlyReference:[...a].filter(h=>!b.has(h)),onlyCandidate:[...b].filter(h=>!a.has(h)),referenceCount:a.size,candidateCount:b.size};
}
module.exports={installProgramRecorder,readProgramHashes,compareProgramHashes};

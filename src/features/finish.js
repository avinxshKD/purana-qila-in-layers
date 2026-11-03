import * as THREE from 'three';

export function featureFinish(material,paint){
 let texture;
 if(paint){
  texture=new THREE.DataTexture(paint.data,paint.width,paint.height,THREE.RGBAFormat);
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;
 }
 const before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  before(shader);
  if(texture){shader.uniforms.featurePaint={value:texture};shader.uniforms.featurePaintBox={value:new THREE.Vector4(...paint.min,paint.max[0]-paint.min[0],paint.max[1]-paint.min[1])};}
  shader.vertexShader='attribute vec2 featureFinish; varying vec2 vFeatureFinish;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFeatureFinish=featureFinish;');
  shader.fragmentShader='varying vec2 vFeatureFinish;\n'+(texture?'uniform sampler2D featurePaint; uniform vec4 featurePaintBox;\n':'')+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb*=variation;',`diffuseColor.rgb*=variation;
   ${texture?`if((vFeatureFinish.x>.5&&vFeatureFinish.x<1.5)||(vFeatureFinish.x>2.5&&vFeatureFinish.y>.5)){
    vec4 dust=texture2D(featurePaint,(strataPosition.xz-featurePaintBox.xy)/featurePaintBox.zw);
    diffuseColor.rgb=diffuseColor.rgb*(1.0-dust.a)+dust.rgb*variation;
   }`:''}
   if(vFeatureFinish.x>1.5&&vFeatureFinish.x<2.5){
    float mottling=strataOctave(strataPosition+vec3(7,3,1),.035,footprint);
    float low=1.0-smoothstep(.1,.4,(strataPosition.y-vFeatureFinish.y+.065)/.13);
    float fine=strataOctave(strataPosition+vec3(2,8,5),.018,footprint);
    diffuseColor.rgb*=exp(.50*mottling+.14*fine-.42*low);
   }
   if(vFeatureFinish.x>2.5){
    float fleck=strataOctave(strataPosition+vec3(2,8,4),.012,footprint);
    diffuseColor.rgb*=1.0+.12*fleck;
   }`);
 };
 material.customProgramCacheKey=()=>key+'-feature-finish-v1-'+!!texture;
 return()=>texture?.dispose();
}

// Site tier soil material: the M1 era soil look read from baked pages (scripts/site-tier/bake.js) instead of evaluated
// per pixel. Walls, floors, outer faces and the cut-step fronts sample a baked albedo and a baked world normal (atlas uv
// or a world-planar page); the active top keeps era colour, the 6 cm veneer and the slope darkening live and reads only
// its variation multiplier and relief gradient from the top page, baked once with the 2023 state's seed (eraActive 9).
// Lights, shadows, the floor emissive and the wall shade bounce are the film material's, so G4 compares like with like.
import * as THREE from 'three';
import { labToHex } from '../soil-colour.js';
import { SHADE_BOUNCE, KEY_LIGHT_POSITION } from '../strata-surface.js';
import { LOOKS, SEAL, boundsGLSL, TOP_GLSL, DISPLACE_GLSL, DISPLACE_Y } from '../eras/soil-shader.js';

const f = v => Number(v).toFixed(6);
const linear = lab => new THREE.Color(labToHex(lab));
const vec3 = c => `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;
const KEY_HORIZONTAL = (([x, , z]) => [x / Math.hypot(x, z), 0, z / Math.hypot(x, z)])(KEY_LIGHT_POSITION);
const planar = 'vec2(dot(sitePosition,sitePlaneU.xyz)+sitePlaneU.w,dot(sitePosition,sitePlaneV.xyz)+sitePlaneV.w)';

// mode: 'outer' | 'inner' | 'floor' | 'top' (as eraSoilMaterial). mapping: 'uv' (atlas) or { u: [4], v: [4] } (plane).
// pages: { albedo, normal } textures for outer/inner/floor; { top } (r variation, g, b relief gradient x, z) for 'top'.
// top: { albedoMultiplier, slopeDarken, gradientMax } (the bake's encode). uniforms: eraB0-2, eraDeposits, eraActive.
export function siteSoilMaterial({ mode, mapping, pages, grid, uniforms, bottomY, fadeStartY, displaced = false, top = {} }) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true,
    side: mode === 'outer' || mode === 'inner' ? THREE.DoubleSide : THREE.FrontSide,
    shadowSide: mode === 'outer' ? THREE.BackSide : null,
    polygonOffset: mode !== 'inner', polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    ...(mode === 'floor' ? { emissive: 0x705339, emissiveIntensity: .06 } : {}) });
  const planarMap = mapping !== 'uv';
  const own = mode === 'top' ? { siteTop: { value: pages.top } } : { siteAlbedo: { value: pages.albedo }, siteNormal: { value: pages.normal } };
  if (planarMap) Object.assign(own, { sitePlaneU: { value: new THREE.Vector4(...mapping.u) }, sitePlaneV: { value: new THREE.Vector4(...mapping.v) } });
  // Page textures can be swapped (e.g. 4 cm first view, then 2 cm) without a new program.
  material.userData.siteUniforms = own;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms, own);
    shader.vertexShader = `varying vec3 sitePosition; ${planarMap ? '' : 'varying vec2 siteUv;'}
      ${displaced && mode === 'top' ? '#define ERA_TOP_NORMAL' : ''}
      ${displaced ? boundsGLSL(grid) + TOP_GLSL + DISPLACE_GLSL : ''}
      ${shader.vertexShader}`.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      ${displaced ? DISPLACE_Y : ''}`).replace('#include <begin_vertex>', `#include <begin_vertex>
      ${displaced ? 'transformed.y=eraY;' : ''}
      sitePosition=(modelMatrix*vec4(transformed,1.0)).xyz; ${planarMap ? '' : 'siteUv=uv;'}`);
    const head = `varying vec3 sitePosition; ${planarMap ? 'uniform vec4 sitePlaneU; uniform vec4 sitePlaneV;' : 'varying vec2 siteUv;'}
      ${mode === 'top' ? `uniform sampler2D siteTop; uniform int eraActive;
      const vec3 ERA_ALBEDO[11]=vec3[11](${LOOKS.map(l => vec3(linear(l.lab))).join(',')});
      const vec3 SEAL_ALBEDO=${vec3(linear(SEAL.lab))};
      ${boundsGLSL(grid)}` : 'uniform sampler2D siteAlbedo; uniform sampler2D siteNormal;'}`;
    const uvExpr = planarMap ? planar : 'siteUv';
    const colour = mode === 'top' ? `
        vec3 P=sitePosition; float eb[11]; eraBounds(P.xz,eb);
        vec3 flatN=normalize(cross(dFdx(P),dFdy(P))+vec3(0.0,1e-9,0.0));
        int e=eraActive, k=e+1;
        float veneer=e>=0?smoothstep(0.0,.06,P.y-eb[e]):1.0;
        vec3 under=e>=0?(e==2?SEAL_ALBEDO:ERA_ALBEDO[k-1]):ERA_ALBEDO[0];
        vec3 albedo=mix(under,e==1?SEAL_ALBEDO:ERA_ALBEDO[k],veneer)*${f(top.albedoMultiplier)};
        vec4 sitePage=texture(siteTop,${uvExpr});
        diffuseColor.rgb=albedo*(sitePage.r*2.0);
        diffuseColor.rgb*=1.0-${f(top.slopeDarken)}*smoothstep(.995,.8,abs(flatN.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,${vec3(new THREE.Color(0x252522))},smoothstep(${f(fadeStartY)},${f(bottomY)},P.y));
        vec3 siteGradient=vec3(sitePage.g-.5,0.0,sitePage.b-.5)*${f(2 * top.gradientMax)};
        siteGradient*=1.0-smoothstep(${f(fadeStartY + .15)},${f(fadeStartY)},P.y);` : `
        diffuseColor.rgb=texture(siteAlbedo,${uvExpr}).rgb;
        vec3 siteWorldNormal=normalize(texture(siteNormal,${uvExpr}).xyz*2.0-1.0);`;
    const normalMaps = mode === 'top' ? `
        vec3 viewGradient=mat3(viewMatrix)*siteGradient;
        if(dot(viewGradient,viewGradient)<16.0) normal=normalize(normal-(viewGradient-normal*dot(viewGradient,normal)));` : `
        normal=normalize(mat3(viewMatrix)*siteWorldNormal);`;
    shader.fragmentShader = `${head}
      ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>${colour}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>${normalMaps}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${mode === 'inner' ? `{
          vec3 worldNormal=normalize((vec4(normal,0.0)*viewMatrix).xyz);
          totalEmissiveRadiance+=diffuseColor.rgb*${f(SHADE_BOUNCE)}*max(0.0,-dot(worldNormal,vec3(${KEY_HORIZONTAL.map(f).join(',')})));
        }` : ''}`);
  };
  const key = JSON.stringify({ mode, planarMap, displaced, grid: [grid.xmin, grid.zmin, grid.nx, grid.nz, grid.stepMetres], bottomY, fadeStartY, top });
  material.customProgramCacheKey = () => `site-soil-p2-${key}`;
  return material;
}

// One program for every soil surface of a side (top and floor: FrontSide; outer and inner: DoubleSide): mode, mapping
// and displacement become per-material uniforms instead of program variants (G6 program budget). Same terms, same
// constants as siteSoilMaterial; the branches are on uniforms, so derivatives and implicit-lod lookups inside them stay
// in uniform control flow. Meshes without the displacement attributes read eraBlend as 0, hence the siteDisplaced gate.
const MODES = Object.freeze({ top: 0, outer: 1, inner: 2, floor: 3 });
const DISPLACE_Y_GATED = DISPLACE_Y.replace('if(eraBlend>=0.0){', 'if(siteDisplaced==1&&eraBlend>=0.0){')
  .replace('#ifdef ERA_TOP_NORMAL', 'if(siteTopNormal==1){').replace('#endif', '}');
if (DISPLACE_Y_GATED === DISPLACE_Y || /#ifdef|#endif/.test(DISPLACE_Y_GATED)) throw new Error('site soil: DISPLACE_Y changed shape');
export function siteSoilUnifiedMaterial({ mode, mapping, pages, grid, uniforms, bottomY, fadeStartY, displaced = false, top = {} }) {
  if (!(mode in MODES)) throw new Error(`site soil: unknown mode ${mode}`);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true,
    side: mode === 'outer' || mode === 'inner' ? THREE.DoubleSide : THREE.FrontSide,
    shadowSide: mode === 'outer' ? THREE.BackSide : null,
    polygonOffset: mode !== 'inner', polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    ...(mode === 'floor' ? { emissive: 0x705339, emissiveIntensity: .06 } : {}) });
  const planarMap = mapping !== 'uv';
  const own = { siteMode: { value: MODES[mode] }, siteMapping: { value: planarMap ? 1 : 0 }, siteDisplaced: { value: displaced ? 1 : 0 },
    siteTopNormal: { value: displaced && mode === 'top' ? 1 : 0 },
    sitePlaneU: { value: new THREE.Vector4(...(planarMap ? mapping.u : [0, 0, 0, 0])) }, sitePlaneV: { value: new THREE.Vector4(...(planarMap ? mapping.v : [0, 0, 0, 0])) },
    siteTop: { value: pages.top ?? null }, siteAlbedo: { value: pages.albedo ?? null }, siteNormal: { value: pages.normal ?? null } };
  material.userData.siteUniforms = own;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms, own);
    shader.vertexShader = `varying vec3 sitePosition; varying vec2 siteUv; uniform int siteDisplaced; uniform int siteTopNormal;
      ${boundsGLSL(grid) + TOP_GLSL + DISPLACE_GLSL}
      ${shader.vertexShader}`.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      ${DISPLACE_Y_GATED}`).replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.y=eraY;
      sitePosition=(modelMatrix*vec4(transformed,1.0)).xyz; siteUv=uv;`);
    const head = `varying vec3 sitePosition; varying vec2 siteUv; uniform vec4 sitePlaneU; uniform vec4 sitePlaneV;
      uniform int siteMode; uniform int siteMapping;
      uniform sampler2D siteTop; uniform int eraActive;
      const vec3 ERA_ALBEDO[11]=vec3[11](${LOOKS.map(l => vec3(linear(l.lab))).join(',')});
      const vec3 SEAL_ALBEDO=${vec3(linear(SEAL.lab))};
      ${boundsGLSL(grid)}
      uniform sampler2D siteAlbedo; uniform sampler2D siteNormal;`;
    const colour = `
        vec2 sitePageUv=siteMapping==1?${planar}:siteUv;
        vec3 siteGradient=vec3(0.0), siteWorldNormal=vec3(0.0,1.0,0.0);
        if(siteMode==0){
          vec3 P=sitePosition; float eb[11]; eraBounds(P.xz,eb);
          vec3 flatN=normalize(cross(dFdx(P),dFdy(P))+vec3(0.0,1e-9,0.0));
          int e=eraActive, k=e+1;
          float veneer=e>=0?smoothstep(0.0,.06,P.y-eb[e]):1.0;
          vec3 under=e>=0?(e==2?SEAL_ALBEDO:ERA_ALBEDO[k-1]):ERA_ALBEDO[0];
          vec3 albedo=mix(under,e==1?SEAL_ALBEDO:ERA_ALBEDO[k],veneer)*${f(top.albedoMultiplier)};
          vec4 sitePage=texture(siteTop,sitePageUv);
          diffuseColor.rgb=albedo*(sitePage.r*2.0);
          diffuseColor.rgb*=1.0-${f(top.slopeDarken)}*smoothstep(.995,.8,abs(flatN.y));
          diffuseColor.rgb=mix(diffuseColor.rgb,${vec3(new THREE.Color(0x252522))},smoothstep(${f(fadeStartY)},${f(bottomY)},P.y));
          siteGradient=vec3(sitePage.g-.5,0.0,sitePage.b-.5)*${f(2 * top.gradientMax)};
          siteGradient*=1.0-smoothstep(${f(fadeStartY + .15)},${f(fadeStartY)},P.y);
        } else {
          diffuseColor.rgb=texture(siteAlbedo,sitePageUv).rgb;
          siteWorldNormal=normalize(texture(siteNormal,sitePageUv).xyz*2.0-1.0);
        }`;
    const normalMaps = `
        if(siteMode==0){
          vec3 viewGradient=mat3(viewMatrix)*siteGradient;
          if(dot(viewGradient,viewGradient)<16.0) normal=normalize(normal-(viewGradient-normal*dot(viewGradient,normal)));
        } else normal=normalize(mat3(viewMatrix)*siteWorldNormal);`;
    shader.fragmentShader = `${head}
      ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>${colour}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>${normalMaps}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if(siteMode==2){
          vec3 worldNormal=normalize((vec4(normal,0.0)*viewMatrix).xyz);
          totalEmissiveRadiance+=diffuseColor.rgb*${f(SHADE_BOUNCE)}*max(0.0,-dot(worldNormal,vec3(${KEY_HORIZONTAL.map(f).join(',')})));
        }`);
  };
  // Side is already a program parameter; everything per mode lives in uniforms.
  const key = JSON.stringify({ grid: [grid.xmin, grid.zmin, grid.nx, grid.nz, grid.stepMetres], bottomY, fadeStartY, top });
  material.customProgramCacheKey = () => `site-soil-p2u-${key}`;
  return material;
}
// Page textures. Albedo is sRGB (decoded by the GPU), normal and top data are linear; trilinear with anisotropy (M: 8).
// flipY false for ImageBitmaps, which three cannot flip at upload (decode them with imageOrientation 'flipY').
export function pageTexture(source, { srgb = false, anisotropy = 8, flipY = true } = {}) {
  const t = new THREE.Texture(source);
  t.flipY = flipY;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = anisotropy; t.needsUpdate = true;
  return t;
}
// The top page ships as three grey images (lossy WebP subsamples chroma); the GPU gets one RGB texture.
export function composeTop(variation, gradX, gradZ) {
  const { width, height } = variation, canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d', { willReadFrequently: true });
  const read = image => { context.drawImage(image, 0, 0); return context.getImageData(0, 0, width, height).data; };
  const [a, b, c] = [variation, gradX, gradZ].map(read), out = context.createImageData(width, height);
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = a[i]; out.data[i + 1] = b[i]; out.data[i + 2] = c[i]; out.data[i + 3] = 255; }
  context.putImageData(out, 0, 0);
  return canvas;
}
// Fixed outer faces arrive as one mesh over four planes; each plane samples its own page, so split by face normal into
// index subsets sharing the attribute buffers. Plane names as the bake: 'z+', 'z-', 'x+', 'x-'; 'other' collects
// triangles facing up or down (none expected).
export function splitByPlane(geometry) {
  const p = geometry.attributes.position.array, index = geometry.index.array, lists = { 'z+': [], 'z-': [], 'x+': [], 'x-': [], other: [] };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < index.length; t += 3) {
    a.fromArray(p, 3 * index[t]); b.fromArray(p, 3 * index[t + 1]); c.fromArray(p, 3 * index[t + 2]);
    const n = b.sub(a).cross(c.sub(a)), ax = Math.abs(n.x), az = Math.abs(n.z);
    const cx = (p[3 * index[t]] + p[3 * index[t + 1]] + p[3 * index[t + 2]]) / 3, cz = (p[3 * index[t] + 2] + p[3 * index[t + 1] + 2] + p[3 * index[t + 2] + 2]) / 3;
    const name = Math.abs(n.y) > Math.max(ax, az) ? 'other' : az >= ax ? (cz > 0 ? 'z+' : 'z-') : (cx > 0 ? 'x+' : 'x-');
    lists[name].push(index[t], index[t + 1], index[t + 2]);
  }
  return Object.fromEntries(Object.entries(lists).filter(([, l]) => l.length).map(([name, l]) => {
    const g = new THREE.BufferGeometry();
    for (const [k, v] of Object.entries(geometry.attributes)) g.setAttribute(k, v);
    g.setIndex(l); return [name, g];
  }));
}

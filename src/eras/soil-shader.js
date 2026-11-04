// Era soil shader for the composite section (M1): one world-space material family for the outer faces, the dug walls,
// the excavation floors and the active top. The era at a fragment comes from the boundary grids (a float texture of the
// site stack), so a cut at any step shows the right bands without per-band meshes. Noise, octave filtering, relief and
// the shade bounce follow the Round 6 soil shader (src/strata-surface.js); the per-era values are in soil-look.js (M).
import * as THREE from 'three';
import { labToHex } from '../soil-colour.js';
import { inclusionLab, KEY_LIGHT_POSITION, SHADE_BOUNCE } from '../strata-surface.js';
import { PALETTES } from '../palettes.js';
import { mulberry32 } from '../rng.js';
import { ERA_LOOK, SILT_LOOK, SEAM, LARGE_MOTTLE, FACE_TEXTURE } from './soil-look.js';
import { BOUNDARY_COUNT, BOUNDARY_SWELL } from './stack.js';

const f = v => Number(v).toFixed(6);
const linear = lab => new THREE.Color(labToHex(lab));
const vec3 = c => `vec3(${f(c.r)},${f(c.g)},${f(c.b)})`;
const KEY_HORIZONTAL = (([x, , z]) => [x / Math.hypot(x, z), 0, z / Math.hypot(x, z)])(KEY_LIGHT_POSITION);
// Era table index k = era + 1; k = 0 is the silt.
export const LOOKS = Object.freeze([SILT_LOOK, ...ERA_LOOK]);
export const INNER_OCCLUSION = .84;
export const FLOOR_ALBEDO = .9;
export const SEAL = ERA_LOOK[1].seal;

// Procedural inclusions: per era up to two size classes on a 3D cell lattice whose cell is the class's largest diameter,
// so a piece never reaches beyond the 8 cells nearest a point. prob is set so the expected count of pieces a vertical
// cut face crosses matches the band's density: count/m^2 = prob * E[extent along the normal] / cell^3.
export function inclusionClasses(spec) {
  if (!spec || !spec.densityPerSquareMetre) return [];
  const [d0, d1] = spec.diameterMetres, split = d1 / d0 > 3 ? Math.sqrt(d0 * d1) : d1;
  const ranges = split < d1 ? [[d0, split], [split, d1]] : [[d0, d1]];
  return ranges.map(([a, b]) => {
    const share = Math.log(b / a) / Math.log(d1 / d0), meanD = (b - a) / Math.log(b / a), cell = b;
    const wanted = spec.densityPerSquareMetre * share, extent = .85 * meanD;
    const prob = Math.min(1, wanted * cell ** 3 / extent);
    return { cell, prob, d0: a, d1: b, wantedPerSquareMetre: wanted, expectedPerSquareMetre: prob * extent / cell ** 3 };
  });
}
const FLAT_KINDS = ['brickbat', 'sherd', 'lime', 'ash', 'charcoal'];
export function inclusionColours(spec, seed) {
  const random = mulberry32(seed), kinds = spec ? Object.entries(spec.mix) : [['sherd', 1]], out = [];
  for (let i = 0; i < 8; i++) {
    const pick = random(); let kind = kinds[0][0];
    for (let k = 0, sum = 0; k < kinds.length; k++) { sum += kinds[k][1]; if (pick <= sum) { kind = kinds[k][0]; break; } }
    out.push({ kind, lab: inclusionLab(kind, random, PALETTES.photo), flat: FLAT_KINDS.includes(kind) });
  }
  return out;
}
export const ERA_INCLUSIONS = Object.freeze(LOOKS.map((look, k) => ({ id: look.id, classes: inclusionClasses(look.inclusions),
  colours: inclusionColours(look.inclusions, 77101 + k * 131), clusterShare: look.inclusions?.clusterShare ?? 0 })));

function tables() {
  const arr = (type, values) => `${type}[${values.length}](${values.join(',')})`;
  const C = LOOKS.map(l => l.character), num = key => arr('float', C.map(c => f(c[key] ?? 0)));
  const classes = ERA_INCLUSIONS.map(e => [0, 1].map(i => e.classes[i] ?? { cell: 1, prob: 0, d0: .01, d1: .01 }));
  return `
    const vec3 ERA_ALBEDO[11]=${arr('vec3', LOOKS.map(l => vec3(linear(l.lab))))};
    const float ERA_MOTTLE[11]=${num('mottle')}; const float ERA_STREAK[11]=${num('streak')};
    const float ERA_ST[11]=${num('streakThickness')}; const float ERA_SL[11]=${num('streakLength')};
    const float ERA_LUMP[11]=${num('lump')}; const float ERA_LP[11]=${num('lumpPeriod')};
    const float ERA_SPECK[11]=${num('speck')}; const float ERA_PATCH[11]=${num('patches')};
    const float ERA_RELIEF[11]=${num('relief')}; const float ERA_ASH[11]=${num('ash')}; const float ERA_BURNT[11]=${num('burnt')};
    const float ERA_SEED[11]=${arr('float', LOOKS.map((l, k) => f((411 + k * 37) * .001)))};
    const vec4 ERA_INC_A[11]=${arr('vec4', classes.map(([a]) => `vec4(${f(a.cell)},${f(a.prob)},${f(a.d0)},${f(a.d1)})`))};
    const vec4 ERA_INC_B[11]=${arr('vec4', classes.map(([, b]) => `vec4(${f(b.cell)},${f(b.prob)},${f(b.d0)},${f(b.d1)})`))};
    const float ERA_CLUSTER[11]=${arr('float', ERA_INCLUSIONS.map(e => f(e.clusterShare)))};
    const vec4 ERA_INC_COLOUR[88]=${arr('vec4', ERA_INCLUSIONS.flatMap(e => e.colours.map(c => { const l = linear(c.lab); return `vec4(${f(l.r)},${f(l.g)},${f(l.b)},${c.flat ? '1.0' : '0.0'})`; })))};
    const vec3 SEAL_ALBEDO=${vec3(linear(SEAL.lab))};
    const vec3 BED_GREY=${vec3(linear(ERA_LOOK[0].beds.grey))}; const vec3 BED_PALE=${vec3(linear(ERA_LOOK[0].beds.pale))};`;
}

// Shared GLSL: bilinear boundary lookup from three RGBA float textures (boundaries 0-3, 4-7, 8-10).
export function boundsGLSL(grid) {
  return `
    uniform highp sampler2D eraB0; uniform highp sampler2D eraB1; uniform highp sampler2D eraB2;
    void eraBounds(vec2 xz, out float b[11]) {
      vec2 g=clamp((xz-vec2(${f(grid.xmin)},${f(grid.zmin)}))/${f(grid.stepMetres)},vec2(0.0),vec2(${grid.nx - 1}.0,${grid.nz - 1}.0));
      ivec2 i=min(ivec2(floor(g)),ivec2(${grid.nx - 2},${grid.nz - 2})); vec2 u=g-vec2(i);
      ivec2 i10=i+ivec2(1,0), i01=i+ivec2(0,1), i11=i+ivec2(1,1);
      vec4 A=mix(mix(texelFetch(eraB0,i,0),texelFetch(eraB0,i10,0),u.x),mix(texelFetch(eraB0,i01,0),texelFetch(eraB0,i11,0),u.x),u.y);
      vec4 B=mix(mix(texelFetch(eraB1,i,0),texelFetch(eraB1,i10,0),u.x),mix(texelFetch(eraB1,i01,0),texelFetch(eraB1,i11,0),u.x),u.y);
      vec4 C=mix(mix(texelFetch(eraB2,i,0),texelFetch(eraB2,i10,0),u.x),mix(texelFetch(eraB2,i01,0),texelFetch(eraB2,i11,0),u.x),u.y);
      b[0]=A.x;b[1]=A.y;b[2]=A.z;b[3]=A.w;b[4]=B.x;b[5]=B.y;b[6]=B.z;b[7]=B.w;b[8]=C.x;b[9]=C.y;b[10]=C.z;
    }`;
}
// Per-boundary truncation step under the ground, and the half-step of the top normal's central differences.
// soil-displace.js mirrors TOP_GLSL and DISPLACE_Y on the CPU with these same values.
export const TOP_STAGGER_METRES = BOUNDARY_SWELL.truncationMetres, TOP_NORMAL_STEP_METRES = .05;
// Active top from a sample (x, z, exact uncut ground): boundaries below the ground are truncated under it, as in stack.js.
export const TOP_GLSL = `
    uniform float eraDeposits[10];
    float eraTopFrom(float b[11],float g) {
      b[10]=g;
      for(int j=0;j<10;j++) b[j]=min(b[j],g-${TOP_STAGGER_METRES}*float(10-j));
      float y=b[0];
      for(int i=0;i<10;i++) y+=eraDeposits[i]*(b[i+1]-b[i]);
      return y;
    }
    float eraTopAt(vec3 s){float b[11]; eraBounds(s.xy,b); return eraTopFrom(b,s.z);}
    float eraTopGrid(vec2 xz){float b[11]; eraBounds(xz,b); return eraTopFrom(b,b[10]);}`;
export const DISPLACE_GLSL = `
    attribute vec3 eraSampleA; attribute vec3 eraSampleB; attribute float eraBlend;`;
// Vertices with eraBlend >= 0 lie on the active top: y = mix(top(A), top(B), blend), where B != A only on a fine vertex
// along a coarse cell's edge (so it stays on that edge: no T-junction cracks). Top meshes also take the normal of the
// 5 cm grid surface for the shadow normal bias; lighting uses flat derivative normals.
const H = TOP_NORMAL_STEP_METRES;
export const DISPLACE_Y = `
    float eraY=position.y;
    if(eraBlend>=0.0){
      eraY=mix(eraTopAt(eraSampleA),eraTopAt(eraSampleB),eraBlend);
      #ifdef ERA_TOP_NORMAL
      vec2 exz=mix(eraSampleA.xy,eraSampleB.xy,eraBlend);
      float gx=eraTopGrid(exz+vec2(${H},0.0))-eraTopGrid(exz-vec2(${H},0.0)), gz=eraTopGrid(exz+vec2(0.0,${H}))-eraTopGrid(exz-vec2(0.0,${H}));
      objectNormal=normalize(vec3(-gx/${2 * TOP_NORMAL_STEP_METRES},1.0,-gz/${2 * TOP_NORMAL_STEP_METRES}));
      #endif
    }`;

const NOISE_GLSL = `
    vec3 eraHash(vec3 p,float s){vec3 q=fract(p*vec3(.1031,.1030,.0973)+s);q+=dot(q,q.yxz+33.33);return normalize(fract((q.xxy+q.yzz)*q.zyx)*2.0-1.0+vec3(.0001));}
    vec4 eraHash4(vec3 p,float s){vec4 q=fract(vec4(p.xyzx)*vec4(.1031,.1030,.0973,.1099)+s);q+=dot(q,q.wzxy+33.33);return fract((q.xxyz+q.yzzw)*q.zywx);}
    float eraNoiseS(vec3 p,float s){
      vec3 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.0-15.0)+10.0);
      return 1.7*mix(mix(mix(dot(eraHash(i,s),f),dot(eraHash(i+vec3(1,0,0),s),f-vec3(1,0,0)),u.x),
        mix(dot(eraHash(i+vec3(0,1,0),s),f-vec3(0,1,0)),dot(eraHash(i+vec3(1,1,0),s),f-vec3(1,1,0)),u.x),u.y),
        mix(mix(dot(eraHash(i+vec3(0,0,1),s),f-vec3(0,0,1)),dot(eraHash(i+vec3(1,0,1),s),f-vec3(1,0,1)),u.x),
        mix(dot(eraHash(i+vec3(0,1,1),s),f-vec3(0,1,1)),dot(eraHash(i+vec3(1,1,1),s),f-vec3(1,1,1)),u.x),u.y),u.z);
    }
    vec3 eraNoiseGradient(vec3 p,float s){
      vec3 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.0-15.0)+10.0),du=30.0*f*f*(f-1.0)*(f-1.0);
      vec3 g000=eraHash(i,s),g100=eraHash(i+vec3(1,0,0),s),g010=eraHash(i+vec3(0,1,0),s),g110=eraHash(i+vec3(1,1,0),s);
      vec3 g001=eraHash(i+vec3(0,0,1),s),g101=eraHash(i+vec3(1,0,1),s),g011=eraHash(i+vec3(0,1,1),s),g111=eraHash(i+vec3(1,1,1),s);
      float v000=dot(g000,f),v100=dot(g100,f-vec3(1,0,0)),v010=dot(g010,f-vec3(0,1,0)),v110=dot(g110,f-vec3(1,1,0));
      float v001=dot(g001,f-vec3(0,0,1)),v101=dot(g101,f-vec3(1,0,1)),v011=dot(g011,f-vec3(0,1,1)),v111=dot(g111,f-vec3(1,1,1));
      vec3 gradient=mix(mix(mix(g000,g100,u.x),mix(g010,g110,u.x),u.y),mix(mix(g001,g101,u.x),mix(g011,g111,u.x),u.y),u.z);
      gradient.x+=mix(mix(v100-v000,v110-v010,u.y),mix(v101-v001,v111-v011,u.y),u.z)*du.x;
      gradient.y+=mix(mix(v010-v000,v110-v100,u.x),mix(v011-v001,v111-v101,u.x),u.z)*du.y;
      gradient.z+=mix(mix(v001-v000,v101-v100,u.x),mix(v011-v010,v111-v110,u.x),u.y)*du.z;
      return gradient*1.7;
    }
    float eraSeed;
    float eraNoise(vec3 p){return eraNoiseS(p,eraSeed);}
    float eraFilter(float period,float footprint){return smoothstep(3.5,5.0,period/max(footprint,0.000001));}
    float eraFootprint(vec3 s){return max(length(dFdx(eraPosition)*s),length(dFdy(eraPosition)*s))*ERA_OUTPUT_SCALE;}
    float eraOctave(vec3 p,float period,float footprint){float w=eraFilter(period,footprint);return w>0.0?eraNoise(p/period)*w:0.0;}
    vec3 eraNormalOctave(vec3 p,float period,float footprint){float w=eraFilter(period,footprint);return w>0.0?eraNoiseGradient(p/period,eraSeed)*(w/period):vec3(0.0);}
    vec3 eraStretchedGradient(vec3 p,vec3 s,float period,float footprint){float w=eraFilter(period,footprint);return w>0.0?eraNoiseGradient(p*s/period,eraSeed)*s*(w/period):vec3(0.0);}
    const mat3 strataRotation=mat3(.36,.48,-.80,-.80,.60,0.0,.48,.64,.60);
    const mat3 strataYaw=mat3(.8,0.0,-.6,0.0,1.0,0.0,.6,0.0,.8);`;

// Ragged boundary offset (Round 6 look: interlocking tongues 1-5 cm; the finest term is 6 cm, not Round 6's 3.5 cm, which
// printed as saw teeth at 2160); boundary 9 is graded where the grade mask is on.
const RAG_GLSL = `
    float eraRag(int j,vec3 P,float grade){
      if(j>=10) return 0.0;
      float s=float(j)*.0137+.31;
      float o=clamp(.022*eraNoiseS(vec3(P.x/.11,.31,P.z/.11),s)+.008*eraNoiseS(vec3(P.x/.06,.83,P.z/.06),s)
        +.018*max(0.0,eraNoiseS(vec3(P.x/.07,1.7,P.z/.07),s)),-.05,.05);
      return j==9?o*(1.0-grade):o;
    }`;

function inclusionGLSL() {
  return `
    // One lattice class; keeps the most opaque piece in acc (rgb colour, a coverage) and its rim term.
    void eraPieces(vec3 P,vec4 cls,float seed,int k,float fp,vec3 host,inout vec4 acc){
      if(cls.y<=0.0) return;
      float C=cls.x; vec3 g=P/C-.5, base=floor(g);
      for(int c=0;c<8;c++){
        vec3 cell=base+vec3(float(c&1),float((c>>1)&1),float((c>>2)&1));
        vec4 h=eraHash4(cell,seed);
        float cluster=ERA_CLUSTER[k]>0.0?mix(1.0-ERA_CLUSTER[k],1.0+2.0*ERA_CLUSTER[k],smoothstep(.1,.5,eraNoiseS((cell+.5)*C*vec3(1.0/.6,1.0/.08,1.0/.6),seed+.2))):1.0;
        if(h.x>=cls.y*cluster) continue;
        vec4 h2=eraHash4(cell+vec3(17.0,5.0,11.0),seed);
        vec4 colour=ERA_INC_COLOUR[k*8+int(h2.w*7.999)];
        float d=cls.z*pow(cls.w/cls.z,h2.x), r=.5*d;
        if(d<1.0*fp) continue;
        vec3 q=P-(cell+h.yzw)*C;
        float yaw=h2.y*6.2831853, cy=cos(yaw), sy=sin(yaw);
        q=vec3(cy*q.x-sy*q.z,q.y,sy*q.x+cy*q.z);
        float tilt=(h2.z-.5)*(colour.w>.5?.63:1.2), ct=cos(tilt), st=sin(tilt);
        q=vec3(ct*q.x-st*q.y,st*q.x+ct*q.y,q.z);
        float aspect=colour.w>.5?1.5+1.5*fract(h2.z*7.31):1.1+.6*fract(h2.z*7.31);
        q/=vec3(r,r/aspect,r*(.7+.3*fract(h2.x*5.17)));
        float e=length(q);
        if(e>1.3) continue;
        float shape=e;
        for(int j=0;j<6;j++){
          vec4 hp=eraHash4(cell+vec3(float(j)*3.1,1.7,.3),seed+.5);
          shape=max(shape,dot(normalize(hp.xyz*2.0-1.0+vec3(.0001)),q)/(.6+.3*hp.w));
        }
        // Edge width from the analytic gradient bound (|grad shape| <= aspect / r per metre): fwidth is undefined here, in divergent flow.
        float fw=max(fp/ERA_OUTPUT_SCALE*aspect/r,.0001), feather=.0035/r;
        float a=1.0-smoothstep(1.0-feather-.5*fw,1.0+.5*fw,shape);
        a*=smoothstep(1.0,2.0,d/fp);
        if(a<=acc.a) continue;
        vec3 film=mix(colour.rgb*(.9+.2*h.y),host,.12+.13*h.z);
        float dust=(.25+.35*h.w)*clamp((dot(normalize(q.xz+vec2(.0001)),vec2(cos(h2.y*11.0),sin(h2.y*11.0)))+.2)/.9,0.0,1.0);
        film=mix(film,host,dust*.8);
        float up=q.y/max(e,.0001), rim=smoothstep(.72,.98,shape);
        float edgeScale=clamp(abs(log2(max(dot(film,vec3(.2126,.7152,.0722)),.001)/max(dot(host,vec3(.2126,.7152,.0722)),.001)))*1.3,.25,1.0);
        film*=1.0+edgeScale*rim*(.18*max(0.0,up)-.2*max(0.0,-up));
        acc=vec4(film,a);
      }
    }`;
}

// mode: 'outer' (block faces), 'inner' (dug walls), 'floor' (excavation floors), 'top' (active top).
// top: { character, albedoMultiplier, slopeDarken } and floor: { character } come from the look world (museum-scene.js).
// debug 'bands' replaces the albedo with a flat colour per era index, to check the band lookup.
export function eraSoilMaterial({ mode, displaced = false, outputScale = 1, grid, uniforms, bottomY, fadeStartY, top = {}, floor = {}, debug = null }) {
  // Diagnostic term switches (debug 'nolarge,nocoarse,...,norelief'): each named term's weight is set to 0; norelief leaves the
// flat derivative normals unperturbed.
  const off = new Set(String(debug ?? '').split(',')), w = (name, value) => off.has(`no${name}`) ? 0 : value;
  // Diagnostic 'cloudNN': coarse and mid mottle weights scaled to NN percent.
  const cloud = Number([...off].find(t => /^cloud\d+$/.test(t))?.slice(5) ?? 100) / 100;
  const character = mode === 'top' ? top.character : mode === 'floor' ? floor.character : null;
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true,
    side: mode === 'outer' || mode === 'inner' ? THREE.DoubleSide : THREE.FrontSide,
    shadowSide: mode === 'outer' ? THREE.BackSide : null,
    polygonOffset: mode !== 'inner', polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    ...(mode === 'floor' ? { emissive: 0x705339, emissiveIntensity: .06 } : {}) });
  const fixedCharacter = character ? `cMottle=${f(character.mottle)};cStreak=${f(character.streak)};cST=${f(character.streakThickness)};cSL=1.8;
        cLump=${f(character.lump)};cLP=${f(character.lumpPeriod)};cSpeck=${f(character.speck)};cPatch=${f(character.patches ?? 0)};cRelief=${f(character.relief)};cAsh=0.0;cBurnt=0.0;` : '';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 eraPosition;
      ${displaced && mode === 'top' ? '#define ERA_TOP_NORMAL' : ''}
      ${displaced ? boundsGLSL(grid) + TOP_GLSL + DISPLACE_GLSL : ''}
      ${shader.vertexShader}`.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      ${displaced ? DISPLACE_Y : ''}`).replace('#include <begin_vertex>', `#include <begin_vertex>
      ${displaced ? 'transformed.y=eraY;' : ''}
      eraPosition=(modelMatrix*vec4(transformed,1.0)).xyz;`);
    shader.fragmentShader = `varying vec3 eraPosition;
      #define ERA_OUTPUT_SCALE ${f(outputScale)}
      uniform int eraActive; uniform float eraIdPass;
      ${boundsGLSL(grid)}
      ${tables()}
      ${NOISE_GLSL}
      ${RAG_GLSL}
      ${inclusionGLSL()}
      ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 P=eraPosition;
        float eb[11]; eraBounds(P.xz,eb);
        vec3 dPx=dFdx(P), dPy=dFdy(P);
        float footprint=max(length(dPx),length(dPy))*ERA_OUTPUT_SCALE;
        vec3 flatN=normalize(cross(dPx,dPy)+vec3(0.0,1e-9,0.0));
        float horizontal=step(.7,abs(flatN.y));
        float bedFootprint=eraFootprint(vec3(.1,1.0,.1));
        float gradeS=smoothstep(0.0,.3,eraNoiseS(vec3(P.x/1.1,.37,P.z/1.1),.917));
        int e=-1;
        for(int j=0;j<10;j++) if(P.y>=eb[j]) e=j;
        ${mode === 'top' ? 'e=eraActive;' : `
        if(e>=0&&P.y<eb[e]+eraRag(e,P,gradeS)) e-=1;
        else if(e<9&&P.y>=eb[e+1]+eraRag(e+1,P,gradeS)) e+=1;`}
        float dBottom=e>=0?P.y-(eb[e]+eraRag(e,P,gradeS)):1e4;
        float dTop=e<9?(eb[e+1]+eraRag(e+1,P,gradeS))-P.y:1e4;
        int k=e+1;
        eraSeed=ERA_SEED[k];
        vec3 albedo=ERA_ALBEDO[k];
        float cMottle=ERA_MOTTLE[k],cStreak=ERA_STREAK[k],cST=ERA_ST[k],cSL=ERA_SL[k],cLump=ERA_LUMP[k],cLP=ERA_LP[k],cSpeck=ERA_SPECK[k],
          cPatch=ERA_PATCH[k],cRelief=ERA_RELIEF[k],cAsh=ERA_ASH[k],cBurnt=ERA_BURNT[k];
        ${mode === 'top' ? `
        // Thin new deposit over the previous top blends in over its first 6 cm instead of switching colour.
        float veneer=e>=0?smoothstep(0.0,.06,P.y-eb[e]):1.0;
        vec3 under=e>=0?(e==2?SEAL_ALBEDO:ERA_ALBEDO[k-1]):ERA_ALBEDO[0];
        albedo=mix(under,e==1?SEAL_ALBEDO:albedo,veneer);` : `
        if(e==1){
          float sealT=mix(${f(SEAL.thicknessMetres[0])},${f(SEAL.thicknessMetres[1])},.5+.5*eraNoiseS(vec3(P.x/.6,3.7,P.z/.6),.41));
          float inSeal=1.0-smoothstep(sealT-.012,sealT+.012,dTop+.006*eraNoiseS(vec3(P.x/.04,1.3,P.z/.04),.43));
          albedo=mix(albedo,SEAL_ALBEDO,inSeal);
          cMottle=mix(cMottle,${f(SEAL.character.mottle)},inSeal);cStreak=mix(cStreak,${f(SEAL.character.streak)},inSeal);
          cLump=mix(cLump,${f(SEAL.character.lump)},inSeal);cSpeck=mix(cSpeck,${f(SEAL.character.speck)},inSeal);
          cPatch=mix(cPatch,${f(SEAL.character.patches)},inSeal);cRelief=mix(cRelief,${f(SEAL.character.relief)},inSeal);
        }
        if(e==0){
          // Pre-Mauryan beds: short wavy pale-yellow and greyish beds that pinch out, no clean count (Round 6 band 7 code).
          float bedWave=.025*eraNoise(vec3(P.x/.45,3.1,P.z/.45))+.01*eraNoise(vec3(P.x/.12,5.3,P.z/.12));
          float bedNoise=eraNoise(strataYaw*vec3(P.x/1.1,(P.y+bedWave)/.11,P.z/1.1)+vec3(9,2,6));
          float bedBreak=smoothstep(-.15,.25,eraNoise(strataYaw*vec3(P.x/.35,P.y/.2,P.z/.35)+vec3(4,8,2)));
          float bedMix=mix(.5,mix(.5,smoothstep(-.05,.05,bedNoise),bedBreak),eraFilter(.11,bedFootprint)*${f(w('beds', 1))});
          bedMix=clamp(bedMix+.35*eraOctave(strataRotation*strataRotation*strataRotation*P+vec3(2,7,4),.012,footprint),0.0,1.0);
          albedo=mix(BED_GREY,BED_PALE,bedMix);
        }
        if(e==9&&dBottom<.15){
          float gw=mix(.05,.15,.5+.5*eraNoiseS(vec3(P.x/.7,.71,P.z/.7),.917));
          albedo=mix(albedo,ERA_ALBEDO[9],.5*(1.0-smoothstep(0.0,gw,dBottom))*gradeS);
        }
        if(e==8&&dTop<.15){
          float gw=mix(.05,.15,.5+.5*eraNoiseS(vec3(P.x/.7,.71,P.z/.7),.917));
          albedo=mix(albedo,ERA_ALBEDO[10],.5*(1.0-smoothstep(0.0,gw,dTop))*gradeS);
        }
        {
          // Albedo meets halfway at every boundary over 1.2 cm each side, so a boundary is a colour change, not a cut edge;
          // texture character still switches at the boundary.
          vec3 bedMid=mix(BED_GREY,BED_PALE,.5);
          vec3 above=k<10?(k==0?bedMid:ERA_ALBEDO[k+1]):albedo;
          vec3 below=k>0?(k==1?ERA_ALBEDO[0]:k==2?bedMid:k==3?SEAL_ALBEDO:ERA_ALBEDO[k-1]):albedo;
          albedo=mix(albedo,above,.5*(1.0-smoothstep(0.0,${f(SEAM.blendMetres)},dTop))*(e==8?1.0-gradeS:1.0));
          albedo=mix(albedo,below,.5*(1.0-smoothstep(0.0,${f(SEAM.blendMetres)},dBottom))*(e==9?1.0-gradeS:1.0));
        }`}
        ${fixedCharacter}
        ${mode === 'top' ? `albedo*=${f(top.albedoMultiplier)};` : mode === 'inner' ? `albedo*=${f(INNER_OCCLUSION)};` : mode === 'floor' ? `albedo*=${f(FLOOR_ALBEDO)};` : ''}
        vec3 soilPoint=P;
        vec3 p1=strataRotation*soilPoint, p2=strataRotation*p1, p3=strataRotation*p2;
        vec3 stretch=mix(vec3(${f(1 / FACE_TEXTURE.patchStretch)},1.0,${f(1 / FACE_TEXTURE.patchStretch)}),vec3(1.0),horizontal);
        vec3 anisotropic=strataYaw*(soilPoint*stretch);
        float nLarge=eraOctave(p1,2.4,footprint);
        vec3 warp=vec3(eraNoise(soilPoint*vec3(1.2,4.0,1.2)+vec3(3,8,1)),0.0,eraNoise(soilPoint*vec3(1.2,4.0,1.2)+vec3(9,2,5)));
        vec3 bedPoint=strataYaw*(soilPoint+.12*warp);
        vec3 coarseStretch=mix(vec3(${f(1 / FACE_TEXTURE.stretch[0])},1.0,${f(1 / FACE_TEXTURE.stretch[0])}),vec3(1.0),horizontal), fineStretch=mix(vec3(${f(1 / FACE_TEXTURE.stretch[2])},1.0,${f(1 / FACE_TEXTURE.stretch[2])}),vec3(1.0),horizontal);
        vec3 midStretch=mix(vec3(${f(1 / FACE_TEXTURE.stretch[1])},1.0,${f(1 / FACE_TEXTURE.stretch[1])}),vec3(1.0),horizontal);
        float mottle=${f(cloud * w('coarse', FACE_TEXTURE.weights[0]))}*eraOctave(bedPoint*coarseStretch+vec3(7,1,3),.3,eraFootprint(coarseStretch))
          +${f(cloud * w('mid', FACE_TEXTURE.weights[1]))}*eraOctave(bedPoint*midStretch+vec3(2,9,4),.18,eraFootprint(midStretch))
          +${f(w('fine', FACE_TEXTURE.weights[2]))}*eraOctave(bedPoint*fineStretch+vec3(11,5,8),.09,eraFootprint(fineStretch));
        float sharpMask=smoothstep(-.1,.4,eraNoise(soilPoint*vec3(.8,2.5,.8)+vec3(4,4,9)))*eraFilter(.09,eraFootprint(fineStretch));
        mottle=mix(mottle,.55*(smoothstep(-.12,.12,mottle)*2.0-1.0),.3*sharpMask);
        float streakNoise=eraNoise(strataYaw*vec3(soilPoint.x/cSL,soilPoint.y/cST,soilPoint.z/cSL)+vec3(5,3,1));
        float streakFade=smoothstep(-.1,.35,eraNoise(strataYaw*vec3(soilPoint.x/2.6,soilPoint.y/.55,soilPoint.z/2.6)+vec3(1,7,2)));
        float streak=streakNoise*eraFilter(cST,eraFootprint(vec3(cST/cSL,1.0,cST/cSL)))*streakFade*(1.0-horizontal);
        vec3 lumpStretch=mix(vec3(.5,1.0,.5),vec3(1.0),horizontal);
        float lumpRaw=eraOctave(strataYaw*(bedPoint*lumpStretch)+vec3(3,5,9),cLP,eraFootprint(lumpStretch));
        float lump=.7*smoothstep(.45,.85,lumpRaw)-1.1*smoothstep(.3,.75,-lumpRaw);
        float speck=eraOctave(p2+vec3(13,7,5),.03,footprint);
        float patchFootprint=eraFootprint(stretch), patchEdge=clamp(patchFootprint/.18*1.5,.08,.6);
        float patches=(smoothstep(-patchEdge,patchEdge,eraNoise(anisotropic/.18+vec3(6,2,8)))-.5)*eraFilter(.18,patchFootprint);
        float variation=exp(cMottle*mottle+${f(w('streak', 1))}*cStreak*streak+${f(w('lump', 1))}*cLump*lump+${f(w('speck', 1))}*cSpeck*speck+${f(w('patch', 1))}*cPatch*patches+${f(w('large', mode === 'top' || mode === 'floor' ? .05 : LARGE_MOTTLE))}*nLarge);
        diffuseColor.rgb=albedo;
        if(cAsh>0.0){float ashMask=${f(w('ash', 1))}*cAsh*smoothstep(.12,.4,streak);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)))*vec3(1.0,.99,.965),ashMask);}
        if(cBurnt>0.0){float burntPatch=${f(w('burnt', 1))}*cBurnt*smoothstep(.12,.42,eraOctave(anisotropic+vec3(4,4,4),.35,footprint));
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),.5*burntPatch)*(1.0-.4*burntPatch);}
        ${mode === 'top' ? `variation*=1.0-${f(top.character.darkPatches ?? 0)}*smoothstep(.12,.4,eraOctave(p1+vec3(2,2,2),1.1,footprint));` : ''}
        diffuseColor.rgb*=variation;
        ${mode === 'inner' ? `{
          vec3 spallScale=vec3(1.0/.16,1.0/.10,1.0/.16);
          vec3 spallQ=strataYaw*(soilPoint*spallScale)+vec3(8,3,6);
          float spallN=eraNoise(spallQ), spallT=clamp((spallN-.35)/.45,0.0,1.0), spallW=eraFilter(.1,footprint);
          diffuseColor.rgb*=1.0+.07*spallT*spallT*(3.0-2.0*spallT)*spallW;
        }` : ''}
        ${mode === 'top' ? `diffuseColor.rgb*=1.0-${f(top.slopeDarken)}*smoothstep(.995,.8,abs(flatN.y));` : ''}
        float seamMask=0.0;
        ${mode === 'top' ? '' : `{
          // Seams: feathered over 2-4 cm of world height with patchy strength, never a pixel-wide drawn line.
          float bs=float(e)*.0137;
          float seamW=mix(${f(SEAM.widthMetres[0])},${f(SEAM.widthMetres[1])},.5+.5*eraNoiseS(vec3(P.x/.3,1.1,P.z/.3),bs));
          float seamS=${f(SEAM.strength)}*smoothstep(-.3,.5,eraNoiseS(vec3(P.x/.5,2.3,P.z/.5),bs));
          float gradeHere=(e==9||e==8)?gradeS:0.0;
          float seam=max(e<9?1.0-smoothstep(0.0,seamW,dTop):0.0,e>=0?1.0-smoothstep(0.0,seamW,dBottom):0.0)*(1.0-gradeHere);
          diffuseColor.rgb*=1.0-seamS*seam;
          seamMask=.5*seam;
        }
        {
          vec4 piece=vec4(0.0);
          vec3 host=diffuseColor.rgb;
          eraPieces(P,ERA_INC_A[k],ERA_SEED[k]+.11,k,footprint,host,piece);
          eraPieces(P,ERA_INC_B[k],ERA_SEED[k]+.23,k,footprint,host,piece);
          diffuseColor.rgb=mix(diffuseColor.rgb,piece.rgb*(.95+.1*clamp(variation-1.0,-.5,.5)),piece.a);
          seamMask=max(seamMask,.5*piece.a);
        }`}
        {
          float baseFade=smoothstep(${f(fadeStartY)},${f(bottomY)},P.y);
          diffuseColor.rgb=mix(diffuseColor.rgb,${vec3(new THREE.Color(0x252522))},baseFade);
        }
        vec3 strataReliefGradient=.55*(
          .004*eraNormalOctave(p2+vec3(3,11,7),.05,footprint)*strataRotation*strataRotation
          +.002*eraNormalOctave(p3+vec3(13,7,5),.025,footprint)*strataRotation*strataRotation*strataRotation
          +.001*eraNormalOctave(p1+vec3(5,19,13),.01,footprint)*strataRotation);
        strataReliefGradient+=cRelief*(.006*eraStretchedGradient(soilPoint+vec3(1,2,3),stretch,.08,eraFootprint(stretch))
          +.003*eraStretchedGradient(soilPoint+vec3(4,5,6),stretch,.035,eraFootprint(stretch)));
        strataReliefGradient*=(1.0-seamMask)*${f(w('relief', 1))};
        strataReliefGradient*=1.0-smoothstep(${f(fadeStartY + .15)},${f(fadeStartY)},P.y);
        ${debug === 'bands' ? 'diffuseColor.rgb=.15+.7*fract(vec3(.37,.61,.83)*float(k)+vec3(.1,.5,.3));strataReliefGradient=vec3(0.0);' : ''}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 viewGradient=mat3(viewMatrix)*strataReliefGradient;
        if(dot(viewGradient,viewGradient)<16.0) normal=normalize(normal-(viewGradient-normal*dot(viewGradient,normal)));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${mode === 'inner' ? `{
          vec3 worldNormal=normalize((vec4(normal,0.0)*viewMatrix).xyz);
          totalEmissiveRadiance+=diffuseColor.rgb*${f(SHADE_BOUNCE)}*max(0.0,-dot(worldNormal,vec3(${KEY_HORIZONTAL.map(f).join(',')})));
        }` : ''}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if(eraIdPass>.5){
          // Unlit id pass: R era index*20, G 255, B mode*4+orientation (0 horizontal, 1 facing z, 2 facing x).
          float orient=abs(flatN.y)>.7?0.0:abs(flatN.z)>abs(flatN.x)?1.0:2.0;
          gl_FragColor=vec4(float(k)*20.0/255.0,1.0,(${['outer', 'inner', 'floor', 'top'].indexOf(mode)}.0*4.0+orient)/255.0,1.0);
        }`);
  };
  const key = JSON.stringify({ mode, displaced, outputScale, grid: [grid.xmin, grid.zmin, grid.nx, grid.nz, grid.stepMetres], bottomY, fadeStartY, top, floor, debug });
  material.customProgramCacheKey = () => `era-soil-m1-${key}`;
  return material;
}
// Shadow-pass material for meshes whose top vertices are placed on the GPU.
export function eraDepthMaterial({ grid, uniforms }) {
  const material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `${boundsGLSL(grid)}${TOP_GLSL}${DISPLACE_GLSL}
      ${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
      if(eraBlend>=0.0) transformed.y=mix(eraTopAt(eraSampleA),eraTopAt(eraSampleB),eraBlend);`);
  };
  material.customProgramCacheKey = () => 'era-soil-m1-depth';
  return material;
}
export function boundaryTextures(stack) {
  const n = stack.nx * stack.nz, textures = [0, 1, 2].map(t => {
    const data = new Float32Array(n * 4);
    for (let c = 0; c < 4; c++) {
      const j = t * 4 + c;
      if (j >= BOUNDARY_COUNT) continue;
      const g = stack.grids[j];
      for (let i = 0; i < n; i++) data[i * 4 + c] = g[i];
    }
    const texture = new THREE.DataTexture(data, stack.nx, stack.nz, THREE.RGBAFormat, THREE.FloatType);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  });
  return textures;
}

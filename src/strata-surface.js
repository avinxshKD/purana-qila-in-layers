import * as THREE from 'three';
import { geometry } from './geometry.js';
import { validateLayerTable, clipDepthRange, subtractRectangle, cutOnFace, earthPoint } from './layers.js';
import { mulberry32 } from './rng.js';
import { hexToLab, labToHex } from './soil-colour.js';
import { gradientNoise } from './soil-noise.js';

function point([t, depth], face) {
  return earthPoint(face.from[0] + t * (face.to[0] - face.from[0]), -depth,
    face.from[1] + t * (face.to[1] - face.from[1]));
}
function polygon(vertices, poly, face, distances, depths) {
  for (let i = 1; i < poly.length - 1; i++) {
    const triangle = [poly[0], poly[i], poly[i + 1]];
    if (!face.inward) triangle.reverse();
    for (const p of triangle) {
      vertices.push(...point(p, face));
      if (distances) {
        const [top, bottom] = depths(p[0]);
        distances.push(Math.max(0, p[1] - top), Math.max(0, bottom - p[1]));
      }
    }
  }
}
// The dug-wall batter shift kinks at each cut's floor depth, so a fragment that spans that depth is split there into
// separate polygons. Splitting keeps every polygon inside one linear piece of the shift: inserting the kink as an extra
// edge vertex instead (the A2 fix for a T-junction crack) left collinear slivers that flipped once shifted and printed
// a column ripple below trench corners.
function splitAtDepths(poly, depths) {
  const ys = poly.map(p => p[1]), low = Math.min(...ys), high = Math.max(...ys);
  const inside = [...new Set(depths)].filter(d => d > low + 1e-9 && d < high - 1e-9).sort((p, q) => p - q);
  if (!inside.length) return [poly];
  const bounds = [-Infinity, ...inside, Infinity];
  return bounds.slice(0, -1).map((top, i) => clipDepthRange(poly, top, bounds[i + 1])).filter(piece => piece.length >= 3);
}
function interval(a, b, rectangle) {
  let low = 0, high = 1;
  for (const [axis, min, max] of [[0, rectangle.xmin, rectangle.xmax], [1, rectangle.ymin, rectangle.ymax]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-12) { if (a[axis] < min || a[axis] > max) return null; }
    else {
      const x = (min - a[axis]) / delta, y = (max - a[axis]) / delta;
      low = Math.max(low, Math.min(x, y));
      high = Math.min(high, Math.max(x, y));
    }
  }
  return low < high ? [low, high] : null;
}
export function visibleBoundary(a, b, floor, cuts) {
  const kept = interval(a, b, { xmin: -Infinity, xmax: Infinity, ymin: -Infinity, ymax: floor });
  let fragments = kept ? [kept] : [];
  for (const cut of cuts) {
    const removed = interval(a, b, cut);
    if (!removed) continue;
    fragments = fragments.flatMap(([low, high]) => [
      [low, Math.min(high, removed[0])], [Math.max(low, removed[1]), high]
    ].filter(([x, y]) => x < y));
  }
  return fragments.map(pair => pair.map(t => a.map((value, i) => value + (b[i] - value) * t)));
}

const f = value => Number(value).toFixed(6);
export const KEY_LIGHT_POSITION = Object.freeze([20, 34, 44]);
const KEY_HORIZONTAL = (([x, , z]) => [x / Math.hypot(x, z), 0, z / Math.hypot(x, z)])(KEY_LIGHT_POSITION);
// Dug walls facing away from the key get only the weak hemisphere and render near-black (trench 4's far wall read as a
// black sliver beside the end baulk). In a real trench they take skylight and bounce from the sunlit opposite wall; this
// look term adds that as emission proportional to albedo and to how far the wall faces away from the key, horizontally.
export const SHADE_BOUNCE = .6;
const vec = values => `vec3(${values.map(v => Number(v).toFixed(8)).join(',')})`;
const colourVec = hex => vec(new THREE.Color(hex).toArray());
// Shared seeds: these masks must agree across neighbouring band materials (graded boundary, lime horizon).
const GRADE_SEED = .917, LIME_SEED = .533;

export function noiseMaterial(material, configuration = {}) {
  configuration = { seed: 773, amplitude: .05, outputScale: 1, normalStrength: .55, ...configuration };
  const c = configuration, ch = c.character, seams = c.seamTop || c.seamBottom || c.gradeTop || c.gradeBottom;
  const variationCode = ch ? `
        // Mottles are domain-warped so their edges wander, flattened along the beds (5.5:1 coarse, 5:1 mid, 3:1 fine), and
        // sharpened in places so part of each edge is crisp and part graded. Sharpening fades with the pixel footprint.
        vec3 warp=vec3(strataNoise(soilPoint*vec3(1.2,4.0,1.2)+vec3(3,8,1)),0.0,strataNoise(soilPoint*vec3(1.2,4.0,1.2)+vec3(9,2,5)));
        vec3 bedPoint=strataYaw*(soilPoint+.12*warp);
        vec3 coarseStretch=mix(vec3(1.0/5.5,1.0,1.0/5.5),vec3(1.0),horizontal), fineStretch=mix(vec3(1.0/3.0,1.0,1.0/3.0),vec3(1.0),horizontal);
        vec3 midStretch=mix(vec3(.2,1.0,.2),vec3(1.0),horizontal);
        float mottleCoarse=strataOctave(bedPoint*coarseStretch+vec3(7,1,3),.3,strataFootprint(coarseStretch));
        float mottleMid=strataOctave(bedPoint*midStretch+vec3(2,9,4),.18,strataFootprint(midStretch));
        float mottleFine=strataOctave(bedPoint*fineStretch+vec3(11,5,8),.09,strataFootprint(fineStretch));
        float mottle=.55*mottleCoarse+.36*mottleMid+.13*mottleFine;
        float sharpMask=smoothstep(-.1,.4,strataNoise(soilPoint*vec3(.8,2.5,.8)+vec3(4,4,9)))*strataFilter(.09,strataFootprint(fineStretch));
        mottle=mix(mottle,.55*(smoothstep(-.12,.12,mottle)*2.0-1.0),.3*sharpMask);
        float streakNoise=strataNoise(strataYaw*vec3(soilPoint.x/1.8,soilPoint.y/${f(ch.streakThickness)},soilPoint.z/1.8)+vec3(5,3,1));
        float streakFade=smoothstep(-.1,.35,strataNoise(strataYaw*vec3(soilPoint.x/2.6,soilPoint.y/.55,soilPoint.z/2.6)+vec3(1,7,2)));
        float streak=streakNoise*strataFilter(${f(ch.streakThickness)},strataFootprint(vec3(${f(ch.streakThickness / 1.8)},1.0,${f(ch.streakThickness / 1.8)})))*streakFade*(1.0-horizontal);
        vec3 lumpStretch=mix(vec3(.5,1.0,.5),vec3(1.0),horizontal);
        float lumpRaw=strataOctave(strataYaw*(bedPoint*lumpStretch)+vec3(3,5,9),${f(ch.lumpPeriod)},strataFootprint(lumpStretch));
        // Sparse clods (mostly darker, a few paler) instead of a continuous spotted field.
        float lump=.7*smoothstep(.45,.85,lumpRaw)-1.1*smoothstep(.3,.75,-lumpRaw);
        float speck=strataOctave(p2+vec3(13,7,5),.03,footprint);
        // Sharp-edged clod patches; the edge widens with the pixel footprint so it never aliases.
        float patchFootprint=strataFootprint(stretch), patchEdge=clamp(patchFootprint/.18*1.5,.08,.6);
        float patches=(smoothstep(-patchEdge,patchEdge,strataNoise(anisotropic/.18+vec3(6,2,8)))-.5)*strataFilter(.18,patchFootprint);
        float variation=exp(${f(c.amplitude)}*(${f(ch.mottle)}*mottle+${f(ch.streak)}*streak+${f(ch.lump)}*lump+${f(ch.speck)}*speck
          +${f(ch.patches ?? 0)}*patches)+.05*nLarge);
        ${ch.ash ? `float ashMask=${f(ch.ash)}*smoothstep(.12,.4,streak);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)))*vec3(1.0,.99,.965),ashMask);` : ''}
        ${ch.burnt ? `float burntPatch=${f(ch.burnt)}*smoothstep(.12,.42,strataOctave(anisotropic+vec3(4,4,4),.35,footprint));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),.5*burntPatch)*(1.0-.4*burntPatch);` : ''}
        ${ch.darkPatches ? `variation*=1.0-${f(ch.darkPatches)}*smoothstep(.12,.4,strataOctave(p1+vec3(2,2,2),1.1,footprint));` : ''}`
    : `float variation=1.0+${f(c.amplitude)}*(.6*strataOctave(p2,.50,footprint)+.4*strataOctave(p3,.24,footprint))+.03*nLarge
          +.02*strataOctave(p1+vec3(17,3,9),.10,footprint);`;
  const gradeCode = (side, colour, distance) => `{
        float gradeStretch=smoothstep(0.0,.3,strataNoiseS(vec3(strataPosition.x/1.1,.37,strataPosition.z/1.1),${f(GRADE_SEED)}));
        float gradeWidth=mix(.05,.15,.5+.5*strataNoiseS(vec3(strataPosition.x/.7,.71,strataPosition.z/.7),${f(GRADE_SEED)}));
        float gradeNear=1.0-smoothstep(0.0,gradeWidth,${distance});
        diffuseColor.rgb=mix(diffuseColor.rgb,${vec(colour)},.5*gradeNear*gradeStretch);
        grade${side}=gradeStretch;
      }`;
  // Ragged band boundaries (look decision): both materials at a boundary share one offset field along the boundary,
  // so tongues of the neighbouring band interlock 1-5 cm across it; the seam darkening is feathered over 1-3 cm of world
  // width with patchy strength, not a pixel-width drawn line. sign is +1 for a top boundary, -1 for a bottom boundary.
  const boundaryCode = (side, neighbour, boundary, distance, sign) => `{
        float along=strataPosition.x+strataPosition.z, bs=${f(boundary * .0137)};
        float offset=clamp(.022*strataNoiseS(vec3(along/.11,.31,.57),bs)+.012*strataNoiseS(vec3(along/.035,.83,.29),bs)
          +.018*max(0.0,strataNoiseS(vec3(along/.07,1.7,.11),bs)),-.05,.05);
        float depthBelow=${sign > 0 ? distance : `-${distance}`}, aa=max(fwidth(depthBelow),.0004);
        float other=${sign > 0 ? 'step(0.0,offset)*(1.0-smoothstep(offset-aa,offset+aa,depthBelow))' : 'step(offset,0.0)*smoothstep(offset-aa,offset+aa,depthBelow)'};
        other*=1.0-grade${side};
        diffuseColor.rgb=mix(diffuseColor.rgb,${vec(neighbour)}*variation,other);
        float seamWidth=mix(.01,.03,.5+.5*strataNoiseS(vec3(along/.3,1.1,.2),bs));
        float seamStrength=.14*smoothstep(-.3,.5,strataNoiseS(vec3(along/.5,2.3,.7),bs));
        float seam=(1.0-smoothstep(0.0,seamWidth,abs(depthBelow-offset)))*(1.0-grade${side});
        diffuseColor.rgb*=1.0-seamStrength*seam;
        strataSeamMask=max(strataSeamMask,.5*seam);
      }`;
  const lime = c.lime;
  const limeCode = lime ? `{
        vec3 lp=strataPosition;
        float ragged=.010*strataNoiseS(vec3(lp.x/.08,1.3,lp.z/.08),${f(LIME_SEED)})+.005*strataNoiseS(vec3(lp.x/.03,2.1,lp.z/.03),${f(LIME_SEED)});
        float thickness=.075+.018*strataNoiseS(vec3(lp.x/.6,3.7,lp.z/.6),${f(LIME_SEED)})+.006*strataNoiseS(vec3(lp.x/.05,4.3,lp.z/.05),${f(LIME_SEED)});
        float limeTop=${f(-lime.topDepth)}+ragged, aa=max(fwidth(lp.y),.0004);
        float limeIn=smoothstep(-aa,aa,limeTop-lp.y)*smoothstep(-aa,aa,lp.y-(limeTop-thickness));
        float ex=lp.x+.05*strataNoiseS(lp/.025,${f(LIME_SEED + .008)});
        float extent=smoothstep(${f(lime.xmin - .02)},${f(lime.xmin + .02)},ex)*(1.0-smoothstep(${f(lime.xmax - .04)},${f(lime.xmax + .04)},ex))*step(${f(lime.zmin - .01)},lp.z);
        ${lime.breaks.map(([a, b]) => `extent*=1.0-smoothstep(${f(a - .03)},${f(a + .03)},ex)*(1.0-smoothstep(${f(b - .03)},${f(b + .03)},ex));`).join('\n')}
        diffuseColor.rgb=mix(diffuseColor.rgb,${vec(lime.color)}*(1.0+.35*(variation-1.0)),limeIn*extent);
      }` : '';
  material.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 strataPosition; varying vec3 strataNormal;
      ${seams ? 'attribute vec2 strataDistances; varying vec2 strataEdgeDistance;' : ''}
      ${c.lens ? 'attribute float strataLensEdge; varying float strataLensDistance;' : ''}
      ${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
      strataPosition = position; strataNormal = normal;
      ${seams ? 'strataEdgeDistance = strataDistances;' : ''}
      ${c.lens ? 'strataLensDistance = strataLensEdge;' : ''}`);
    shader.fragmentShader = `varying vec3 strataPosition;
      varying vec3 strataNormal;
      ${seams ? 'varying vec2 strataEdgeDistance;' : ''}
      ${c.lens ? 'varying float strataLensDistance;' : ''}
      vec3 strataHash(vec3 p,float s) {
        vec3 q=fract(p*vec3(.1031,.1030,.0973)+s);
        q+=dot(q,q.yxz+33.33);
        vec3 g=fract((q.xxy+q.yzz)*q.zyx)*2.0-1.0;
        return normalize(g+vec3(.0001));
      }
      float strataNoiseS(vec3 p,float s) {
        vec3 i=floor(p), f=fract(p), u=f*f*f*(f*(f*6.0-15.0)+10.0);
        return 1.7*mix(mix(mix(dot(strataHash(i,s),f),dot(strataHash(i+vec3(1,0,0),s),f-vec3(1,0,0)),u.x),
          mix(dot(strataHash(i+vec3(0,1,0),s),f-vec3(0,1,0)),dot(strataHash(i+vec3(1,1,0),s),f-vec3(1,1,0)),u.x),u.y),
          mix(mix(dot(strataHash(i+vec3(0,0,1),s),f-vec3(0,0,1)),dot(strataHash(i+vec3(1,0,1),s),f-vec3(1,0,1)),u.x),
          mix(dot(strataHash(i+vec3(0,1,1),s),f-vec3(0,1,1)),dot(strataHash(i+vec3(1,1,1),s),f-vec3(1,1,1)),u.x),u.y),u.z);
      }
      float strataNoise(vec3 p) { return strataNoiseS(p,${f(c.seed * .001)}); }
      vec3 strataNoiseGradient(vec3 p) {
        float s=${f(c.seed * .001)};
        vec3 i=floor(p), f=fract(p), u=f*f*f*(f*(f*6.0-15.0)+10.0), du=30.0*f*f*(f-1.0)*(f-1.0);
        vec3 g000=strataHash(i,s),g100=strataHash(i+vec3(1,0,0),s),g010=strataHash(i+vec3(0,1,0),s),g110=strataHash(i+vec3(1,1,0),s);
        vec3 g001=strataHash(i+vec3(0,0,1),s),g101=strataHash(i+vec3(1,0,1),s),g011=strataHash(i+vec3(0,1,1),s),g111=strataHash(i+vec3(1,1,1),s);
        float v000=dot(g000,f),v100=dot(g100,f-vec3(1,0,0)),v010=dot(g010,f-vec3(0,1,0)),v110=dot(g110,f-vec3(1,1,0));
        float v001=dot(g001,f-vec3(0,0,1)),v101=dot(g101,f-vec3(1,0,1)),v011=dot(g011,f-vec3(0,1,1)),v111=dot(g111,f-vec3(1,1,1));
        vec3 gradient=mix(mix(mix(g000,g100,u.x),mix(g010,g110,u.x),u.y),mix(mix(g001,g101,u.x),mix(g011,g111,u.x),u.y),u.z);
        gradient.x+=mix(mix(v100-v000,v110-v010,u.y),mix(v101-v001,v111-v011,u.y),u.z)*du.x;
        gradient.y+=mix(mix(v010-v000,v110-v100,u.x),mix(v011-v001,v111-v101,u.x),u.z)*du.y;
        gradient.z+=mix(mix(v001-v000,v101-v100,u.x),mix(v011-v010,v111-v110,u.x),u.y)*du.z;
        return gradient*1.7;
      }
      float strataFilter(float period,float footprint) { return smoothstep(3.5,5.0,period/max(footprint,0.000001)); }
      // Pixel footprint measured in a stretched noise space: a bed-stretched octave only aliases along its short
      // (vertical) axis, so foreshortening along the beds, as on side walls seen obliquely, must not filter it out.
      float strataFootprint(vec3 s) { return max(length(dFdx(strataPosition)*s),length(dFdy(strataPosition)*s))*${f(c.outputScale)}; }
      float strataOctave(vec3 p,float period,float footprint) {
        float weight=strataFilter(period,footprint);
        return weight>0.0 ? strataNoise(p/period)*weight : 0.0;
      }
      vec3 strataNormalOctave(vec3 p,float period,float footprint) {
        float weight=strataFilter(period,footprint);
        return weight>0.0 ? strataNoiseGradient(p/period)*(weight/period) : vec3(0.0);
      }
      vec3 strataStretchedGradient(vec3 p,vec3 s,float period,float footprint) {
        float weight=strataFilter(period,footprint);
        return weight>0.0 ? strataNoiseGradient(p*s/period)*s*(weight/period) : vec3(0.0);
      }
      mat3 strataRotation=mat3(.36,.48,-.80,-.80,.60,0.0,.48,.64,.60);
      mat3 strataYaw=mat3(.8,0.0,-.6,0.0,1.0,0.0,.6,0.0,.8);
      ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 soilPoint=strataPosition;
        float footprint=max(length(dFdx(strataPosition)),length(dFdy(strataPosition)))*${f(c.outputScale)};
        vec3 p1=strataRotation*soilPoint, p2=strataRotation*p1, p3=strataRotation*p2;
        float horizontal=step(.7,abs(normalize(strataNormal).y));
        // Vertical cut faces stretch texture 4:1 horizontally (bedding); horizontal surfaces stay isotropic.
        vec3 stretch=mix(vec3(.25,1.0,.25),vec3(1.0),horizontal);
        vec3 anisotropic=strataYaw*(soilPoint*stretch);
        float nLarge=strataOctave(p1,2.4,footprint);
        float gradeTop=0.0, gradeBottom=0.0;
        ${seams ? 'float strataSeamMask=0.0;' : ''}
        ${c.basal ? `// Thin beds broken along their length: short wavy offsets, gaps where the bed pinches out, and a sandy grain.
        float bedWave=.025*strataNoise(vec3(soilPoint.x/.45,3.1,soilPoint.z/.45))+.01*strataNoise(vec3(soilPoint.x/.12,5.3,soilPoint.z/.12));
        float bedNoise=strataNoise(strataYaw*vec3(soilPoint.x/1.1,(soilPoint.y+bedWave)/.11,soilPoint.z/1.1)+vec3(9,2,6));
        float bedBreak=smoothstep(-.15,.25,strataNoise(strataYaw*vec3(soilPoint.x/.35,soilPoint.y/.2,soilPoint.z/.35)+vec3(4,8,2)));
        float bedMix=mix(.5,mix(.5,smoothstep(-.05,.05,bedNoise),bedBreak),strataFilter(.11,strataFootprint(vec3(.1,1.0,.1))));
        bedMix=clamp(bedMix+.35*strataOctave(p3+vec3(2,7,4),.012,footprint),0.0,1.0);
        diffuseColor.rgb=mix(${vec(c.basal.grey)},${vec(c.basal.pale)},bedMix);` : ''}
        ${variationCode}
        ${c.gradeTop ? gradeCode('Top', c.gradeTop, 'strataEdgeDistance.x') : ''}
        ${c.gradeBottom ? gradeCode('Bottom', c.gradeBottom, 'strataEdgeDistance.y') : ''}
        ${c.ring ? `variation*=1.0-.3*smoothstep(.35,.75,strataNoise(p2/.014+vec3(3,1,2)))*strataFilter(.014,footprint);
        variation*=1.0-.2*smoothstep(.4,.75,strataNoise(p3/.006+vec3(5,2,7)))*strataFilter(.006,footprint);` : ''}
        diffuseColor.rgb*=variation;
        ${c.spalls ? `// Shallow spalls (about 5-20 cm) on dug walls: fresher, slightly paler soil inside a stepped rim.
        vec3 spallScale=vec3(1.0/.16,1.0/.10,1.0/.16);
        vec3 spallQ=strataYaw*(soilPoint*spallScale)+vec3(8,3,6);
        float spallN=strataNoise(spallQ), spallT=clamp((spallN-.35)/.45,0.0,1.0), spallW=strataFilter(.1,footprint);
        diffuseColor.rgb*=1.0+.07*spallT*spallT*(3.0-2.0*spallT)*spallW;` : ''}
        ${c.slopeDarken ? `diffuseColor.rgb*=1.0-${f(c.slopeDarken)}*smoothstep(.995,.8,normalize(strataNormal).y);` : ''}
        ${limeCode}
        ${c.seamTop ? boundaryCode('Top', c.seamTop, c.boundaryTop, 'strataEdgeDistance.x', 1) : ''}
        ${c.seamBottom ? boundaryCode('Bottom', c.seamBottom, c.boundaryBottom, 'strataEdgeDistance.y', -1) : ''}
        ${c.lens ? `{
        float ragged=.6*strataNoiseS(strataPosition/.03,.611)+.4*strataNoiseS(strataPosition/.011,.613);
        float width=max(.02,2.0*footprint);
        diffuseColor.a*=smoothstep(0.0,width,strataLensDistance+.45*width*ragged-.15*width);
        diffuseColor.rgb*=exp(.35*strataOctave(p2,.08,footprint)+.2*strataOctave(p3,.035,footprint));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.022,.02,.018),.85*smoothstep(.42,.62,strataNoise(p1/.02))*strataFilter(.02,footprint));
        }` : ''}
        ${c.fadeStartDepth !== undefined ? `float baseFade=smoothstep(${f(c.fadeStartDepth)},${f(c.baseDepth)},-strataPosition.y);
        diffuseColor.rgb=mix(diffuseColor.rgb,${colourVec(0x252522)},baseFade);` : ''}
        vec3 strataReliefGradient=${f(c.normalStrength)}*(
          .004*strataNormalOctave(p2+vec3(3,11,7),.05,footprint)*strataRotation*strataRotation
          +.002*strataNormalOctave(p3+vec3(13,7,5),.025,footprint)*strataRotation*strataRotation*strataRotation
          +.001*strataNormalOctave(p1+vec3(5,19,13),.01,footprint)*strataRotation);
        ${ch ? `strataReliefGradient+=${f(ch.relief)}*(.006*strataStretchedGradient(soilPoint+vec3(1,2,3),stretch,.08,strataFootprint(stretch))
          +.003*strataStretchedGradient(soilPoint+vec3(4,5,6),stretch,.035,strataFootprint(stretch)));` : ''}
        ${c.ring ? `{
          // Pockmarks (about 1.4 cm) and fine pitting (about 0.6 cm) as depressions the key light picks up; same fields as the darkening above.
          float pitN=strataNoise(p2/.014+vec3(3,1,2)), pitT=clamp((pitN-.35)/.4,0.0,1.0);
          strataReliefGradient-=.0035*6.0*pitT*(1.0-pitT)/.4*(strataNoiseGradient(p2/.014+vec3(3,1,2))/.014)*strataRotation*strataRotation*strataFilter(.014,footprint);
          float fineN=strataNoise(p3/.006+vec3(5,2,7)), fineT=clamp((fineN-.4)/.35,0.0,1.0);
          strataReliefGradient-=.001*6.0*fineT*(1.0-fineT)/.35*(strataNoiseGradient(p3/.006+vec3(5,2,7))/.006)*strataRotation*strataRotation*strataRotation*strataFilter(.006,footprint);
        }` : ''}
        ${c.spalls ? 'strataReliefGradient-=.0015*6.0*spallT*(1.0-spallT)/.45*((strataNoiseGradient(spallQ)*strataYaw)*spallScale)*spallW;' : ''}
        ${seams ? 'strataReliefGradient*=1.0-strataSeamMask;' : ''}
        ${c.fadeStartDepth !== undefined ? `strataReliefGradient*=1.0-smoothstep(${f(c.fadeStartDepth - .15)},${f(c.fadeStartDepth)},-strataPosition.y);` : ''}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 viewGradient=mat3(viewMatrix)*strataReliefGradient;
        if(dot(viewGradient,viewGradient)<16.0)
          normal=normalize(normal-faceDirection*(viewGradient-normal*dot(viewGradient,normal)));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${c.bounce ? `totalEmissiveRadiance+=diffuseColor.rgb*${f(c.bounce)}*max(0.0,-dot(normalize(strataNormal)*faceDirection,${vec(KEY_HORIZONTAL)}));` : ''}`)
;
  };
  material.customProgramCacheKey = () => `round6-structured-${JSON.stringify(configuration)}`;
  return material;
}

export const SOIL_OCTAVES = [
  { periodMetres: 2.4, role: 'large mottle' }, { periodMetres: .3, role: 'band mottle, vertical period (5.5:1 horizontal on faces), domain-warped' },
  { periodMetres: .18, role: 'band mottle (5:1)' }, { periodMetres: .09, role: 'band mottle (3:1), partly sharpened' },
  { periodMetres: .07, role: 'bedding streak thickness, per band 0.07–0.13' }, { periodMetres: .08, role: 'lumps/clods, per band 0.07–0.11' },
  { periodMetres: .03, role: 'specks' }, { periodMetres: .05, role: 'pit normal' },
  { periodMetres: .025, role: 'fine normal' }, { periodMetres: .01, role: 'micro normal' }
];
const INCLUSION_LAB = {
  ash: [[56, .5, 1.5]], lime: [[64, .8, 3.5]], charcoal: [[17, 1, 2], [22, 1.5, 3]], rubble: [[52, 1, 4], [45, .8, 3]],
  mudbrick: [[44, 5, 9]], sherd: [[42, 7, 10], [36, .5, 1.5], [26, .5, 1], [48, .8, 2.5]]
};
// Drawing rules for inclusions (look decisions): flat pieces lie within about 20 degrees of the bedding, a 1 px-wide feathered
// edge at close-up scale, a film of host soil, dust over one side, and a lit upper / shaded lower edge.
export const INCLUSION_DRAW = Object.freeze({ flatKinds: ['brickbat', 'sherd', 'lime', 'ash', 'charcoal'], flatTiltDegrees: 18, roundTiltDegrees: 35,
  piecesPerCluster: 6, clusterLengthMetres: [.3, .8], featherMetres: .0035, hostFilm: [.12, .25], dust: [.25, .6], litEdge: .18, shadowEdge: .2,
  valueSpreadL: 11, sides: [5, 9], angleJitter: .32, radius: [.5, 1], buriedShare: .35, buriedArcDegrees: [50, 110], buriedDepth: [.35, .7],
  limeAspect: [1.1, 2] });
export function inclusionLab(kind, random, palette) {
  const choices = kind === 'brickbat' ? [hexToLab(palette.brick)].map(l => [l.L, l.a, l.b]).flatMap(l => [l, [l[0] - 6, l[1] * .9, l[2] * .85], [l[0] + 4, l[1] * .85, l[2]]])
    : INCLUSION_LAB[kind];
  const lab = choices[Math.floor(random() * choices.length)], s = .8 + random() * .4;
  return [Math.max(8, lab[0] + (random() * 2 - 1) * INCLUSION_DRAW.valueSpreadL), lab[1] * s, lab[2] * s];
}
export function lensColour(hostHex, index) {
  const host = hexToLab(hostHex);
  return labToHex(index === 0 ? [host.L - 6, 1, 3.5] : [host.L - 12, 2.5, 6]);
}
export function limeColour(hostHex) {
  const host = hexToLab(hostHex);
  return labToHex([host.L + 5, host.a * .45, host.b * .45]);
}
export function addStrata(table, add, material, height, scene, palette) {
  validateLayerTable(table);
  const stats = { layers: table.layers.length, faces: table.faces.length, cutFragments: 0, lenses: 0, inclusions: 0, inclusionsByBand: [], inclusionRecords: [], inclusionValues: [],
    octaves: SOIL_OCTAVES, boundaryPixelsAt1080: 2.5, drawnLines: 0, lensAlbedos: [] };
  const limeFeature = table.proportions.features.find(feature => feature.material === 'lime');
  for (const [index, layer] of table.layers.entries()) {
    const vertices = [], innerVertices = [], outerDistances = [], innerDistances = [], lensVertices = [], lensEdges = [], inclusions = [], inclusionColors = [];
    const random = mulberry32(layer.noise.seed), spec = layer.inclusions ?? { densityPerSquareMetre: 0 };
    const band = { index, density: spec.densityPerSquareMetre, diameterMetres: spec.diameterMetres, faceAreaSquareMetres: 0, count: 0, byKind: {} };
    for (const face of table.faces) {
      const samples = layer.faces[face.id], length = Math.hypot(face.to[0] - face.from[0], face.to[1] - face.from[1]);
      const cuts = table.cuts.map(cut => cutOnFace(cut, face)).filter(Boolean), kinkDepths = cuts.flatMap(cut => [cut.ymin, cut.ymax]);
      function emit(target, poly) {
        let fragments = [clipDepthRange(poly, face.topDepth ?? -Infinity, face.floorDepth)];
        for (const cut of cuts) fragments = fragments.flatMap(fragment => subtractRectangle(fragment, cut));
        const distances = target === vertices ? outerDistances : target === innerVertices ? innerDistances : undefined;
        let emitted = 0;
        for (const fragment of fragments) if (fragment.length >= 3) {
          for (const piece of splitAtDepths(fragment, kinkDepths)) polygon(target, piece, face, distances, depths);
          stats.cutFragments++; emitted++;
        }
        return emitted;
      }
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        emit(face.inward ? innerVertices : vertices, [[a.t, a.topDepth], [b.t, b.topDepth], [b.t, b.bottomDepth], [a.t, a.bottomDepth]]);
      }
      function depths(t) {
        const at = Math.min(samples.length - 2, Math.floor(t * (samples.length - 1)));
        const a = samples[at], b = samples[at + 1], f = (t - a.t) / (b.t - a.t);
        return [a.topDepth + (b.topDepth - a.topDepth) * f, a.bottomDepth + (b.bottomDepth - a.bottomDepth) * f];
      }
      for (const lens of layer.lenses.filter(lens => lens.faceId === face.id)) {
        const [top, bottom] = depths(lens.centerT), center = top + (bottom - top) * lens.fraction;
        const radiusT = Math.min(lens.radiusMetres / length, lens.centerT - .001, 1 - lens.centerT - .001);
        // Uneven, gradually thinning envelope; the shader adds the ragged edge, mottling and charcoal flecks.
        const envelope = (u, side) => Math.sin(u * Math.PI) ** 1.15 * (.7 + .3 * gradientNoise(u * 5.3, side, lens.centerT * 9, layer.noise.seed + 3))
          * (.85 + .15 * gradientNoise(u * 17, side + 2, .4, layer.noise.seed + 5));
        const shape = Array.from({ length: 41 }, (_, j) => {
          const u = j / 40;
          return [lens.centerT + (u * 2 - 1) * radiusT, center - Math.max(0, envelope(u, .3)) * lens.halfDepth];
        });
        shape.push(...Array.from({ length: 39 }, (_, j) => {
          const u = 1 - (j + 1) / 40;
          return [lens.centerT + (u * 2 - 1) * radiusT, center + Math.max(0, envelope(u, 1.7)) * lens.halfDepth];
        }));
        // Triangulate around the centre so a world-distance edge attribute can feather the silhouette.
        for (let k = 0; k < shape.length; k++) {
          const a = shape[k], b = shape[(k + 1) % shape.length];
          const denominator = (a[0] - lens.centerT) * (b[1] - center) - (a[1] - center) * (b[0] - lens.centerT);
          if (Math.abs(denominator) < 1e-12) continue;
          let fragments = [clipDepthRange([[lens.centerT, center], shape[k], shape[(k + 1) % shape.length]], face.topDepth ?? -Infinity, face.floorDepth)];
          for (const cut of cuts) fragments = fragments.flatMap(fragment => subtractRectangle(fragment, cut));
          for (const fragment of fragments) for (let j = 1; j < fragment.length - 1; j++) {
            const tri = [fragment[0], fragment[j], fragment[j + 1]];
            if (!face.inward) tri.reverse();
            for (const p of tri) {
              lensVertices.push(...point(p, face));
              const numerator = (a[0] - p[0]) * (b[1] - p[1]) - (a[1] - p[1]) * (b[0] - p[0]);
              lensEdges.push(Math.max(0, lens.halfDepth * numerator / denominator));
            }
          }
        }
        stats.lenses++;
      }
      if (band.density > 0) {
        let area = 0;
        for (let i = 0; i < samples.length - 1; i++) {
          const a = samples[i], b = samples[i + 1], top = Math.max((a.topDepth + b.topDepth) / 2, face.topDepth ?? -Infinity);
          area += (b.t - a.t) * length * Math.max(0, Math.min((a.bottomDepth + b.bottomDepth) / 2, face.floorDepth) - top);
        }
        band.faceAreaSquareMetres += area;
        const count = Math.floor(area * band.density + random()), [d0, d1] = spec.diameterMetres, kinds = Object.entries(spec.mix);
        const host = new THREE.Color(layer.color).multiplyScalar(face.inward ? .84 : 1);
        // Fragment and rubble bands put a share of their pieces in small lenses and lines along a bed.
        const clusterShare = spec.clusterShare ?? 0, clusters = [];
        for (let k = 0; k < Math.round(count * clusterShare / INCLUSION_DRAW.piecesPerCluster); k++) clusters.push({ t: .02 + random() * .96,
          fraction: .15 + random() * .7, spreadT: (INCLUSION_DRAW.clusterLengthMetres[0] + random() * (INCLUSION_DRAW.clusterLengthMetres[1] - INCLUSION_DRAW.clusterLengthMetres[0])) / 2 / length,
          spreadY: .008 + random() * .02 });
        const minimumDepth = face.topDepth ?? -Infinity;
        for (let i = 0; i < count; i++) {
          const cluster = clusters.length && random() < clusterShare ? clusters[Math.floor(random() * clusters.length)] : null;
          const diameter = d0 * (d1 / d0) ** random(), pick = random();
          let kind = kinds[0][0];
          for (let k = 0, sum = 0; k < kinds.length; k++) { sum += kinds[k][1]; if (pick <= sum) { kind = kinds[k][0]; break; } }
          const flat = INCLUSION_DRAW.flatKinds.includes(kind);
          const aspect = kind === 'lime' ? INCLUSION_DRAW.limeAspect[0] + random() * (INCLUSION_DRAW.limeAspect[1] - INCLUSION_DRAW.limeAspect[0])
            : flat ? 1.5 + random() * 1.5 : 1.1 + random() * .6;
          const rotation = (random() * 2 - 1) * (flat ? INCLUSION_DRAW.flatTiltDegrees : INCLUSION_DRAW.roundTiltDegrees) * Math.PI / 180;
          const rx = diameter / 2, ry = rx / aspect;
          let t, y;
          if (cluster) {
            t = cluster.t + (random() * 2 - 1) * cluster.spreadT;
            const [top, bottom] = depths(Math.min(.999, Math.max(.001, t)));
            y = top + cluster.fraction * (bottom - top) + (random() * 2 - 1) * cluster.spreadY;
          } else {
            t = .002 + random() * .996;
            const [top, bottom] = depths(t);
            y = top + ry * 1.2 + random() * Math.max(0, bottom - top - ry * 2.4);
          }
          // Angular fragments: 5-9 vertices with jittered angles and radii. About a third are partly buried: the vertices on
          // one side are pulled in towards a straight chord, and that side's rim fades into the host instead of a lit edge.
          const D = INCLUSION_DRAW, sides = D.sides[0] + Math.floor(random() * (D.sides[1] - D.sides[0] + 1)), phase = random() * Math.PI * 2;
          const angles = Array.from({ length: sides }, (_, j) => phase + (j + (random() * 2 - 1) * D.angleJitter) / sides * Math.PI * 2);
          const radii = Array.from({ length: sides }, () => D.radius[0] + random() * (D.radius[1] - D.radius[0]));
          const buried = random() < D.buriedShare, buriedAngle = random() * Math.PI * 2;
          const buriedArc = (D.buriedArcDegrees[0] + random() * (D.buriedArcDegrees[1] - D.buriedArcDegrees[0])) * Math.PI / 360;
          const buriedDepth = D.buriedDepth[0] + random() * (D.buriedDepth[1] - D.buriedDepth[0]);
          const isBuried = angles.map(a => buried && Math.cos(a - buriedAngle) > Math.cos(buriedArc));
          for (let j = 0; j < sides; j++) if (isBuried[j]) radii[j] = Math.min(radii[j], buriedDepth / Math.max(.2, Math.cos(angles[j] - buriedAngle)));
          const outline = (j, grow) => {
            const angle = angles[j], ox = Math.cos(angle) * (rx * radii[j] + grow), oy = Math.sin(angle) * (ry * radii[j] + grow);
            const dx = ox * Math.cos(rotation) - oy * Math.sin(rotation), dy = ox * Math.sin(rotation) + oy * Math.cos(rotation);
            return { p: [t + dx / length, y + dy], up: -dy / Math.hypot(dx, dy), along: [dx, dy] };
          };
          const feather = INCLUSION_DRAW.featherMetres, outer = Array.from({ length: sides }, (_, j) => outline(j, feather / 2));
          if (t < .001 || t > .999 || outer.some(({ p }) => {
            const tt = Math.min(.999, Math.max(.001, p[0])), [top, bottom] = depths(tt);
            return p[0] < .001 || p[0] > .999 || p[1] < Math.max(top, minimumDepth) + .002 || p[1] > Math.min(bottom, face.floorDepth) - .002
              || cuts.some(cut => p[0] > cut.xmin - .002 && p[0] < cut.xmax + .002 && p[1] > cut.ymin - .01 && p[1] < cut.ymax + .01);
          })) continue;
          const rim = Array.from({ length: sides }, (_, j) => outline(j, -feather / 2)), inner = Array.from({ length: sides }, (_, j) => {
            const o = outline(j, 0); return { ...o, p: [t + (o.p[0] - t) * .6, y + (o.p[1] - y) * .6] };
          });
          const lab = inclusionLab(kind, random, palette);
          const base = new THREE.Color(labToHex(lab)).lerp(host, INCLUSION_DRAW.hostFilm[0] + random() * (INCLUSION_DRAW.hostFilm[1] - INCLUSION_DRAW.hostFilm[0]));
          // Soil dust settles over one side of each piece; the upper edge catches light, the lower edge sits in shadow.
          const dustAngle = random() * Math.PI * 2, dustAmount = INCLUSION_DRAW.dust[0] + random() * (INCLUSION_DRAW.dust[1] - INCLUSION_DRAW.dust[0]);
          const dusted = (along, edge) => {
            const length2 = Math.hypot(along[0], along[1]) || 1, side = (along[0] * Math.cos(dustAngle) + along[1] * Math.sin(dustAngle)) / length2;
            return base.clone().lerp(host, dustAmount * Math.max(0, Math.min(1, (side + .2) / .9)) * (edge ? 1 : .8));
          };
          const centre = { p: [t, y], c: base.clone().lerp(host, dustAmount * .25), a: 1 };
          const innerV = inner.map(o => ({ p: o.p, c: dusted(o.along, false), a: 1 }));
          // Pieces close in value to the host get a weaker edge, otherwise the lit/shaded rim reads as a drawn outline.
          const edgeScale = Math.min(1, Math.max(.25, Math.abs(lab[0] - hexToLab(host.getHex()).L) / 15));
          const rimV = rim.map((o, j) => isBuried[j] ? { p: o.p, c: dusted(o.along, true).lerp(host, .55), a: .55 }
            : { p: o.p, c: dusted(o.along, true).multiplyScalar(1 + edgeScale * (INCLUSION_DRAW.litEdge * Math.max(0, o.up) - INCLUSION_DRAW.shadowEdge * Math.max(0, -o.up))), a: 1 });
          const outerV = outer.map((o, j) => ({ p: o.p, c: rimV[j].c, a: 0 }));
          const local = [], localColours = [];
          const triangle = (...corners) => {
            if (!face.inward) corners.reverse();
            for (const v of corners) { local.push(...point(v.p, face)); localColours.push(v.c.r, v.c.g, v.c.b, v.a); }
          };
          for (let j = 0; j < sides; j++) {
            const k = (j + 1) % sides;
            triangle(centre, innerV[j], innerV[k]);
            triangle(innerV[j], rimV[j], rimV[k]); triangle(innerV[j], rimV[k], innerV[k]);
            triangle(rimV[j], outerV[j], outerV[k]); triangle(rimV[j], outerV[k], rimV[k]);
          }
          // Near face ends and cut corners the face mapping can throw a vertex far from the piece; drop such pieces.
          const centreWorld = point([t, y], face), reach = 1.5 * (rx + feather) + .003;
          let stretched = false;
          for (let q = 0; q < local.length && !stretched; q += 3)
            stretched = Math.hypot(local[q] - centreWorld[0], local[q + 1] - centreWorld[1], local[q + 2] - centreWorld[2]) > reach;
          if (stretched) { stats.inclusionsDropped = (stats.inclusionsDropped || 0) + 1; continue; }
          for (const v of local) inclusions.push(v);
          for (const v of localColours) inclusionColors.push(v);
          band.count++; band.byKind[kind] = (band.byKind[kind] || 0) + 1; band.clustered = (band.clustered || 0) + (cluster ? 1 : 0); band.buried = (band.buried || 0) + (buried ? 1 : 0); stats.inclusions++;
          stats.inclusionValues.push(lab[0]);
          stats.inclusionRecords.push([index, ...point([t, y], face).map(v => Math.round(v * 1e4) / 1e4), Math.round(diameter * 1e4) / 1e4]);
        }
      }
    }
    stats.inclusionsByBand.push(band);
    for (const [v, distances, occlusion, side] of [[vertices, outerDistances, 1, 'outer'], [innerVertices, innerDistances, .84, 'inner']]) {
      const g = geometry(v);
      g.setAttribute('strataDistances', new THREE.Float32BufferAttribute(distances, 2));
      const color = new THREE.Color(layer.color).multiplyScalar(occlusion), cfg = { ...layer.noise, outputScale: height / 1080 };
      const basalHex = palette.basal;
      if (index === 6) cfg.basal = { grey: new THREE.Color(basalHex.grey).multiplyScalar(occlusion).toArray(), pale: new THREE.Color(basalHex.pale).multiplyScalar(occlusion).toArray() };
      for (const [key, neighbour] of [['seamTop', index - 1], ['seamBottom', index + 1]]) if (table.layers[neighbour]) {
        const other = new THREE.Color(neighbour === 6 ? basalHex.grey : table.layers[neighbour].color).multiplyScalar(occlusion);
        cfg[key] = other.toArray();
        cfg[key === 'seamTop' ? 'boundaryTop' : 'boundaryBottom'] = key === 'seamTop' ? index : index + 1;
      }
      if (occlusion !== 1) { cfg.spalls = true; cfg.bounce = SHADE_BOUNCE; }
      if (index === 0) cfg.gradeBottom = new THREE.Color(table.layers[1].color).multiplyScalar(occlusion).toArray();
      if (index === 1) cfg.gradeTop = new THREE.Color(table.layers[0].color).multiplyScalar(occlusion).toArray();
      if (limeFeature) cfg.lime = { topDepth: limeFeature.topDepth, xmin: limeFeature.xmin === -12 ? -12.5 : limeFeature.xmin, xmax: limeFeature.xmax,
        zmin: limeFeature.zmin, breaks: limeFeature.breaks, color: new THREE.Color(limeColour(layer.color)).multiplyScalar(occlusion).toArray() };
      // Outer faces draw only their back sides into the shadow map. Under VSM a lit face drawn into the map shadows
      // itself in thin vertical stripes (bisection: removing each band's outer mesh from the map removed the stripes on
      // that band; castShadow=false does not, because VSM also draws receivers). Back sides keep the block's silhouette.
      add(g, noiseMaterial(material(color, { side: THREE.DoubleSide, shadowSide: side === 'outer' ? THREE.BackSide : null }), cfg),
        { receive: occlusion === 1, group: `band-${index + 1}-${side}` });
    }
    if (lensVertices.length) {
      const host = hexToLab(layer.color), color = lensColour(layer.color, index);
      const g = geometry(lensVertices);
      g.setAttribute('strataLensEdge', new THREE.Float32BufferAttribute(lensEdges, 1));
      add(g, noiseMaterial(material(color, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1,
        polygonOffsetUnits: -1, transparent: true, depthWrite: false }), { seed: layer.noise.seed + 10, outputScale: height / 1080,
        amplitude: .005, lens: true, normalStrength: 0 }), { cast: false, receive: false, group: `lens-${index + 1}` });
      stats.lensAlbedos.push({ host: layer.id, hostL: host.L, lensL: hexToLab(color).L, lensC: hexToLab(color).chroma });
    }
    if (inclusions.length) {
      const g = geometry(inclusions); g.setAttribute('color', new THREE.Float32BufferAttribute(inclusionColors, 4));
      add(g, material(0xffffff, { vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, transparent: true, depthWrite: false,
        polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { cast: false, receive: false, group: `inclusions-${index + 1}` });
    }
  }
  return stats;
}

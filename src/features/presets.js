import plan from '../../reference/purana-qila/fig13-walls.json' with {type:'json'};
import { buildFeature } from './index.js';
import { rectangle, KUSHAN_BRICK_SIZES } from './masonry.js';
export function fig13Specs() {
  return plan.walls.map(w=>({
    id:w.id,kind:w.material==='burnt brick'?'brick-wall':w.material==='mud brick'?'mudbrick-wall':'rubble-wall',
    footprint:w.geometry.coordinates[0],base:0,courses:w.courseCount??(w.material==='stone'?2:3),seed:w.id,
    ...(w.material==='burnt brick'?{brickSizes:KUSHAN_BRICK_SIZES}:{}),
    source:`era-model.json / P1 Fig.13 / ${w.id}`,
    M:[...(w.courseCount===null?['low schematic surviving course count']:[]),'unit packing, joints, surface breakage and dust',...(w.material!=='burnt brick'?['unit dimensions unsourced; schematic']:[])],
  }));
}
export function eraFeatureSpec(id) {
  const common={id,base:0,seed:id};
  const wall=(kind,length,width,extra={})=>({...common,kind,footprint:rectangle(length,width),...extra});
  if(id==='kushan-house')return {...common,kind:'assembly',children:fig13Specs(),M:['Fig.13 is figure-local, not geographic; period association caption-level only']};
  if(id==='kushan-bricks')return wall('brick-wall',2.7,.65,{courses:5,brickSizes:KUSHAN_BRICK_SIZES,M:['2.7 × .65 m gallery remnant and five courses are M; only unit sizes sourced']});
  if(id==='sultanate-corner')return {...common,kind:'assembly',children:[
    {...wall('rubble-wall',3.75,.75,{courses:3}),id:id+'-ew'},
    {...common,id:id+'-south',kind:'rubble-wall',footprint:rectangle(.75,1.05,3, .75),courses:3}
  ],M:['unit dimensions and .66 m total height M; south return 1.8 m includes .75 m junction']};
  if(id==='rajput-wall')return wall('dressed-wall',4.4,1.4,{height:1,M:['Reading 4.40 × 1.40 × 1 m as length,width,height (source axes unlabelled); unit sizes/packing M']});
  if(id==='rajput-rubble')return {...common,kind:'assembly',children:[0,1,2].map(i=>({...wall('rubble-wall',2.7-i*.18,.75,{courses:2,base:i*.45,buriedTop:i<2}),id:id+'-'+i})),M:['3 superposed phases sourced; lengths,widths,course counts,phase height offsets and soil/mud backing of buried phase tops M']};
  if(id==='post-gupta-wall-ns')return wall('brickbat-wall',.4,2.04,{height:.1,M:['Reading axes as length,width,height; fragment dimensions M']});
  if(id==='post-gupta-wall-ew')return wall('brickbat-wall',3.5,.4,{height:.1,M:['.10 m lowest two-course remnant M; height not sourced; bat dimensions M']});
  if(id==='gupta-brickbat-wall')return wall('brickbat-wall',2.2,.45,{height:.11,M:['All remnant dimensions and fragment sizes M; wall material sourced']});
  if(id==='sunga-masonry')return {...common,kind:'assembly',children:[
    {...wall('mudbrick-wall',1.8,.55,{courses:2}),id:id+'-mudbrick'},
    {...wall('rubble-wall',1.5,.7,{courses:2,footprint:rectangle(1.5,.7,1.9,0)}),id:id+'-rubble'}
  ],M:['Mudbrick and rubble remains sourced; all sizes,adjacency,course counts M']};
  const surfaceKinds={'sultanate-lime-floor':'lime-floor','gupta-floor':'brick-jelly-floor','mauryan-drain':'tile-drain','rajput-postholes':'postholes','rajput-sealed-pit':'filled-pit','sunga-kushan-lane':'pottery-lane','sunga-burnt-patches':'burnt-patches'};
  if(surfaceKinds[id])return {...common,kind:surfaceKinds[id],...(id==='rajput-sealed-pit'?{base:-.18}:{}),M:[
   'P1 era-model feature kind sourced; footprint,position,size and surviving thickness M',
   ...(id==='gupta-floor'?['crushed-brick interpretation M; 0.5–3 cm fragments and 30–50% coverage M; two exposures not necessarily separate floors']:[]),
   ...(id==='sultanate-lime-floor'?['.075 m toned body, fine facets, 0.5–1 cm top relief, north/west broken proud stretches and small-patch dust M; look brief, not source measurements']:[]),
   ...(id==='mauryan-drain'?['channel/tile sizes, rounded/chipped arrises and broken ends, continuous mottling/staining, 1–3 degree tilt, 1–2 cm displacement and soil-packed joints M; one schematic Mauryan drain only; no Fig.13 drain']:[]),
   ...(id==='rajput-sealed-pit'?['opening .18 m beneath the unbroken Rajput sealing surface M']:[])
  ]};
  if(id==='rajput-pottery-dump')return {...common,kind:'pottery-lens',width:.8,length:.3,height:.12,count:840,M:['P1 pottery dump sourced; .8 × .3 m lens, .12 m central thickness, packing, matrix and terracotta/grey sherd dimensions M; no brickbat layer']};
  const scatter={'pre-mauryan-sherds':'pgw','mughal-porcelain':'porcelain','mughal-glass':'glass','modern-china-1955':'china'};
  if(scatter[id])return {...common,kind:'sherd-scatter',material:scatter[id],M:['P1 source kind/colour only; size .018–.055 m radius,spacing,thickness,burial and generic pigment patches M; true-size geometry, no readability enlargement']};
  if(id==='modern-brick-1948')return {...common,kind:'modern-brick',M:['P1 object and date sourced; .23 × .11 × .065 m dimensions M; no date modelled on object']};
  if(['pillar-base-as-drawn','top-left-stone-as-drawn'].includes(id)){
   const f=plan.asDrawnFeatures.find(f=>f.id===id);
   return {...common,kind:'traced-stone',footprint:f.geometry.coordinates[0],height:.12,M:['.12 m full height, seven broad facet planes with2.5 cm relief, varying0.5–3 cm chamfer,6–7 upper chips and localized20% low-spot dust M; exact figure-local base and burial retained; function/date not restored']};
  }
  const traced=fig13Specs().find(w=>w.id===id);if(traced)return traced;
  throw new Error(`Unknown era feature ${id}`);
}
export function buildEraFeature(id,overrides={},ctx={}) {return buildFeature({...eraFeatureSpec(id),...overrides},ctx);}

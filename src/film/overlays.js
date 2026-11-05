import * as THREE from 'three';
import copy from '../../reference/film-callouts.json';
import {axisFraction,measureScaleBarLabels,layoutScaleBarLabel,drawScaleBarLabels} from '../labels.js';
import {placeCallouts,convexHull,labelGap,polygonDistance,rectPoints} from './layout.js';
import {projectPoint} from './framing.js';
import {wrapText,auditHud,scaleRectDistance,scaleLineDistance,keepNumberUnitsTogether} from './hud.js';
import {scaleLabelReservations,scaleReservePadding} from './scale-reserve.js';
import {placeFromTrack} from './callout-track.js';
import {BLOCK_KINDS,blockInterior,blockSeparations,separationFailures} from './text-blocks.js';
import {END_CARD,END_CARD_STYLE,COLD_OPEN_ID,endCardLines,wrapUrlLine,urlColumnWidth,taglineLines} from './end-card.js';
export function createFilmOverlays(width,height,camera){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  // Software (CPU) Canvas2D: GPU canvas rasterisation can change with the page's draw history
  // (path caches, acceleration heuristics), which made leader pixels depend on render order.
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),hudCamera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,0,2);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  plane.position.z=-1;scene.add(plane);
  const fonts=new Map(),measurements=new Map();
  function font(cap,family='Strata Sans',weight=600){
    const key=cap+':'+family+':'+weight;if(fonts.has(key))return fonts.get(key);
    ctx.font=`${weight} 100px "${family}"`;const size=cap*100/ctx.measureText('H').actualBoundingBoxAscent;
    const value=`${weight} ${size}px "${family}"`;fonts.set(key,value);return value;
  }
  function measure(text,value,tabular=false){
    const key=value+':'+tabular+':'+text;if(measurements.has(key))return measurements.get(key);
    ctx.font=value;const metrics=ctx.measureText(text);let advance=metrics.width;
    if(tabular){advance=0;for(const char of text){ctx.font=/\d/.test(char)?value.replace('"Strata Sans"','"Strata Sans Numerals"'):value;advance+=ctx.measureText(char).width;}ctx.font=value;}
    const result={width:Math.max(advance,metrics.actualBoundingBoxRight)+2,height:metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent+2,ascent:metrics.actualBoundingBoxAscent+1};
    measurements.set(key,result);return result;
  }
  function wrap(text,value,maxWidth,noSingleLast=false){
    return wrapText(text,maxWidth,line=>measure(line,value).width,{noSingleLast})||[keepNumberUnitsTogether(text)];
  }
  function record(index){
    const s=copy.sections[index];
    if(index===0){const cold=copy.coldOpenOptions.find(c=>c.id===COLD_OPEN_ID);return {title:cold.title,dates:'',tagline:cold.tagline||''};}
    if(index===15)return {title:'',dates:''};
    if(index>=2&&index<=10){const split=s.section.indexOf(', ');return {title:s.section.slice(0,split),dates:s.section.slice(split+2)};}
    return {title:s.section,dates:''};
  }
  function inputs(state,framing,hasOutline=false,anchors={},base=10){
    const text=[],protectedRects=[],silhouette=framing.silhouette;
    function add(value,x,y,face,opacity=1,tabular=false,kind='title',id=kind+':'+text.length){
      if(!value||opacity<=0)return;
      value=keepNumberUnitsTogether(value);
      const size=measure(value,face,tabular),rect={x:x-1,y:y-size.ascent,width:size.width,height:size.height};
      text.push({value,x,y,font:face,opacity,tabular,rect,kind,id});protectedRects.push(rect);
    }
    let coldOpen=null;
    for(const entry of state.overlays.titles){
      const {title,dates,tagline}=record(entry.sectionIndex),face=font(entry.sectionIndex>=12?38:51.84,'Strata Serif');
      const lines=wrap(title,face,500),titleIds=[];lines.forEach((line,i)=>{titleIds.push('title:'+text.length);add(line,60,100+i*70,face,entry.opacity);});
      if(dates)add(dates,60,100+lines.length*64,font(37.8),entry.opacity*.8,true);
      // Cold-open tagline: the end card's body style and headline-to-body spacing, one sentence
      // per line, same opacity as the title (no motion or timing of its own).
      if(tagline&&entry.opacity>0){
        for(const id of titleIds){const t=text.find(x=>x.id===id);if(t)Object.assign(t,{block:'cold-open',paragraph:'title'});}
        const body=font(END_CARD_STYLE.body.cap,END_CARD_STYLE.body.family),sentences=taglineLines(tagline),ids=[];
        let y=100+(lines.length-1)*70+END_CARD_STYLE.headlineToBody;
        for(const sentence of sentences){const id='tagline:'+ids.length;ids.push(id);add(sentence,60,y,body,entry.opacity,false,'tagline',id);Object.assign(text.at(-1),{block:'cold-open',paragraph:'tagline'});y+=END_CARD_STYLE.body.step;}
        coldOpen={tagline,lines:sentences,ids,titleIds,opacity:entry.opacity,font:body,titleFont:face,moved:false};
      }
    }
    let timeline=null,endCard=null;
    if(state.section.index!==15){
      const x=60,y=1012,length=380,face=font(21.6,'Strata Sans',400);
      timeline={x,y,length};protectedRects.push({x:x-2,y:y-6,width:length+4,height:49});
      add('540 BCE',x,y+40,face,.6,true,'timeline','timeline:start');
      add('2023',x+length-measure('2023',face,true).width,y+40,face,.6,true,'timeline','timeline:end');
    }
    if(state.overlays.caption){
      const caption=state.overlays.caption,face=font(28);
      wrap(copy.sections[caption.sectionIndex].callouts[0].label,face,500).forEach((line,i)=>add(line,60,220+i*42,face,caption.opacity,false,'caption',caption.id+':'+i));
    }
    if(state.overlays.endCard.opacity){
      let y=150;
      endCard={sourcesUrl:END_CARD.sourcesUrl,urlPrefix:null,urlLines:[],lines:[],columnWidth:END_CARD.columnWidth,ids:[]};
      endCardLines(copy,hasOutline).forEach((line,i)=>{
        const style=i?END_CARD_STYLE.body:END_CARD_STYLE.headline,face=font(style.cap,style.family),width=line.url?urlColumnWidth(line.prefix,line.url,value=>measure(value,face).width,END_CARD.columnWidth,END_CARD):END_CARD.columnWidth;
        const wrapped=line.url?wrapUrlLine(line.prefix,line.url,width,value=>measure(value,face).width,END_CARD):wrap(line.text,face,END_CARD.columnWidth,true);
        if(!wrapped)throw new Error('End-card URL does not fit its column');
        if(line.url){endCard.urlPrefix=line.prefix;endCard.urlLines=wrapped;endCard.columnWidth=width;}
        for(const value of wrapped){const id='end-card:'+text.length;add(value,60,y,face,state.overlays.endCard.opacity,false,'end-card',id);Object.assign(text.at(-1),{block:'end-card',paragraph:'p'+i});endCard.lines.push(value);endCard.ids.push(id);y+=style.step;}y+=i?END_CARD_STYLE.bodyParagraphGap:END_CARD_STYLE.endCardHeadlineGap;
      });
    }
    // Move every HUD line that fails the real silhouette audit. Prefer a small
    // leftward move, then upward, without changing copy or type size.
    // Block lines (cold open, end card) never move; the HUD audit reports them instead.
    for(const item of text){
      if(item.block||silhouette.distanceRect(item.rect)>=24)continue;
      const original={...item.rect};let found=false;
      for(let delta=1;delta<=500&&!found;delta++)for(const [dx,dy]of [[-delta,0],[0,-delta]]){
        const candidate={...original,x:original.x+dx,y:original.y+dy};
        if(candidate.x<48||candidate.y<24||silhouette.distanceRect(candidate,24.01)<24.01)continue;
        item.x+=dx;item.y+=dy;Object.assign(item.rect,candidate);found=true;break;
      }
    }
    const scaleZones=[];
    if(silhouette.scalePoints.length)scaleZones.push(convexHull(silhouette.scalePoints));
    const scaleMetrics=measureScaleBarLabels(ctx,height);
    const scaleLabels=scaleMetrics.labels.map(label=>({text:label.text,...layoutScaleBarLabel({camera,width,height,baseDepth:base,...label,capHeight:scaleMetrics.capHeight})})).filter(label=>label.visible);
    const scaleReservations=scaleLabelReservations(scaleLabels);
    scaleZones.push(...scaleReservations.map(item=>item.polygon));
    // Lay out the era's pair together from the first label's fade-in, so the first label
    // does not jump when its partner appears. A not-yet-visible partner reserves its place.
    const live=state.overlays.callouts.some(c=>c.opacity>0);
    const items=(live?state.overlays.callouts:[]).filter(c=>c.opacity>0||anchors[copy.sections[c.sectionIndex].callouts[c.slot].featureId]).map(c=>{
      const item=copy.sections[c.sectionIndex].callouts[c.slot],value=item.fallback?.label||item.label,face=font(32);
      const lines=wrap(value,face,340),sizes=lines.map(line=>measure(line,face)),lineHeight=46,em=Number(/ ([\d.]+)px /.exec(face)[1]);
      // Ink-to-ink gap between consecutive lines (baseline step minus descent and next ascent).
      const lineGap=sizes.length>1?Math.max(...sizes.slice(1).map((s,i)=>lineHeight-(sizes[i].height-sizes[i].ascent)-s.ascent)):0;
      return {id:c.id,featureId:item.featureId,era:c.sectionIndex,opacity:c.opacity,reserved:c.opacity<=0,font:face,lines,lineHeight,em,lineGap,ascent:Math.max(...sizes.map(s=>s.ascent)),boxWidth:Math.max(...sizes.map(s=>s.width)),boxHeight:Math.max(...sizes.map(s=>s.height))+(lines.length-1)*lineHeight,anchor:anchors[item.featureId]?projectPoint(anchors[item.featureId],camera,width,height):null};
    });
    if(endCard)endCard.moved=false;
    return {text,timeline,endCard,coldOpen,protectedRects,silhouette,scaleZones,scaleReservations,scaleLabels,items,viewport:{width,height,maxLabelBottom:silhouette.blockLowestY,rectScaleDistance:rect=>scaleRectDistance(rect,scaleZones),lineScaleDistance:(a,b)=>scaleLineDistance(a,b,scaleZones)}};
  }
  // Serializable layout inputs, for solving the pinned callout track off-line.
  function layoutInputs(...args){const i=inputs(...args);return {items:i.items.map(({font,...item})=>item),protectedRects:i.protectedRects,scaleZones:i.scaleZones,blockLowestY:i.silhouette.blockLowestY};}
  // With a pinned track each frame reads its callout boxes and re-checks every gate.
  function plan(state,framing,hasOutline=false,anchors={},base=10,{track=null}={}){
    const {text,timeline,endCard,coldOpen,silhouette,protectedRects,scaleReservations,scaleLabels,items,viewport}=inputs(state,framing,hasOutline,anchors,base);
    const callouts=track?placeFromTrack(items,track,state.frame,silhouette,protectedRects,viewport):placeCallouts(items,silhouette,protectedRects,viewport);
    const labelGaps=[];for(let i=0;i<callouts.placed.length;i++)for(let j=i+1;j<callouts.placed.length;j++){const a=callouts.placed[i],b=callouts.placed[j];labelGaps.push({ids:[a.id,b.id],gap:polygonDistance(rectPoints(a.rect),rectPoints(b.rect)),required:labelGap(a,b),em:Math.max(a.em,b.em),lineGaps:[a.lineGap,b.lineGap]});}
    // Typographic blocks: interior gate inside, full label-gap rule against everything else.
    const emOf=value=>Number(/ ([\d.]+)px /.exec(value)[1]),blocks=[];
    for(const id of BLOCK_KINDS){const lines=text.filter(t=>t.block===id);if(lines.length)blocks.push(blockInterior(id,lines.map(t=>({id:t.id,rect:t.rect,paragraph:t.paragraph,em:emOf(t.font)}))));}
    const blockOpacity=id=>Math.max(...text.filter(t=>t.block===id).map(t=>t.opacity));
    const blockSeparationRows=blocks.flatMap(block=>blockSeparations(block,[
      // A title cross-dissolving out where the block fades in (opacities sum to <= 1) is a
      // dissolve, not two elements on screen together.
      ...text.filter(t=>t.block!==block.id&&!(t.kind==='title'&&t.opacity+blockOpacity(block.id)<=1+1e-9)).map(t=>({id:t.id,kind:t.kind,rect:t.rect,em:emOf(t.font),lineGap:0})),
      ...callouts.placed.filter(c=>c.opacity>0).map(c=>({id:c.id,kind:'callout',rect:c.rect,em:c.em,lineGap:c.lineGap})),
      ...scaleReservations.map(s=>({id:'scale:'+s.text,kind:'scale-label',polygon:s.polygon,em:0,lineGap:0}))]));
    const blockReport=id=>blocks.find(b=>b.id===id)||null;
    const coldOpenReport=coldOpen?{tagline:coldOpen.tagline,lines:coldOpen.lines,opacity:coldOpen.opacity,moved:false,block:blockReport('cold-open'),headlineToBody:END_CARD_STYLE.headlineToBody,bodyStyle:END_CARD_STYLE.body}:null;
    if(endCard)endCard.block=blockReport('end-card');
    const allElements=text.map(t=>({id:t.id,kind:t.kind,text:t.value,opacity:t.opacity,rect:t.rect}));
    if(timeline)allElements.push({id:'timeline:track',kind:'timeline',rect:{x:timeline.x-2,y:timeline.y-6,width:timeline.length+4,height:49}});
    for(const c of callouts.placed)allElements.push({id:c.id,kind:'callout',text:c.lines.join(' '),rect:c.rect});
    const audit=auditHud(allElements,silhouette),textClearances=audit.entries.map(e=>({id:e.id,kind:e.kind,text:e.text,rect:e.rect,clearance:e.clearance}));
    const timelineClearance=timeline?silhouette.distanceRect({x:timeline.x-2,y:timeline.y-6,width:timeline.length+4,height:49}):null;
    const distances=[...textClearances.map(t=>t.clearance),...callouts.placed.map(c=>c.clearance),...(timelineClearance===null?[]:[timelineClearance])];
    return {text,timeline,scaleBase:base,scaleReservations,...callouts,report:{minimumTextClearance:distances.length?Math.min(...distances):null,textClearances,scaleLabels:scaleReservations,scaleLabelLayout:scaleLabels,
      minimumScaleReservePadding:scaleReservations.length?Math.min(...scaleReservations.map(item=>scaleReservePadding(item.reserve,item.actualBox))):null,
      minimumLabelClearance:callouts.placed.length?Math.min(...callouts.placed.map(c=>c.clearance)):null,
      maximumLeaderLength:callouts.placed.length?Math.max(...callouts.placed.map(c=>c.length)):null,
      timelineClearance,
      minimumScaleClearance:callouts.placed.length?Math.min(...callouts.placed.flatMap(c=>[c.scaleLabelClearance,c.scaleLeaderClearance])):null,
      maximumLabelBottom:callouts.placed.length?Math.max(...callouts.placed.map(c=>c.labelBottom)):null,blockLowestY:silhouette.blockLowestY,endCardBoxMaximumWidth:endCard?endCard.columnWidth:END_CARD.columnWidth,endCard,coldOpen:coldOpenReport,textBlocks:blocks,blockSeparations:blockSeparationRows,minimumBlockSeparationSlack:blockSeparationRows.length?Math.min(...blockSeparationRows.map(s=>s.gap-s.required)):null,
      leaders:callouts.placed.map(c=>({id:c.id,featureId:c.featureId,opacity:c.opacity,reserved:c.reserved,labelRect:c.rect,start:c.end,anchor:c.anchor,length:c.length,clearance:c.clearance,scaleLabelClearance:c.scaleLabelClearance,scaleLeaderClearance:c.scaleLeaderClearance,labelBottom:c.labelBottom,maximumAllowedBottom:c.maxLabelBottom,straight:true})),
      labelGaps,minimumLabelGapSlack:labelGaps.length?Math.min(...labelGaps.map(g=>g.gap-g.required)):null,
      failures:[...callouts.failures.map(f=>({...f,kind:'callout'})),...audit.failures,...labelGaps.filter(g=>g.gap<g.required-1e-9).map(g=>({id:g.ids.join('+'),kind:'label-gap',reason:'Labels closer than 1 em / twice the internal line gap',gap:g.gap,required:g.required})),
        ...blocks.flatMap(b=>b.failures),...separationFailures(blockSeparationRows)],search:track?'Pinned callout track (locked side, <=4px anchor-relative step), every gate re-checked':'Shortest combined valid left/right leaders in permitted zones,1px local refinement; real triangle raster, no routed/bent leaders',tracked:!!track}};
  }
  function halo(){ctx.fillStyle='#eee4d2';ctx.shadowBlur=8;ctx.shadowColor='rgba(12,13,13,.95)';ctx.shadowOffsetY=1;}
  function draw(layout,state){
    // Start every frame from the default context state (transform, alpha, composite, dash,
    // caps/joins, shadow, font, path), whatever plan() or an earlier frame left behind.
    if(typeof ctx.reset==='function')ctx.reset();
    else{ctx.setTransform(1,0,0,1,0,0);Object.assign(ctx,{globalAlpha:1,globalCompositeOperation:'source-over',lineWidth:1,lineCap:'butt',lineJoin:'miter',miterLimit:10,lineDashOffset:0,shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,shadowColor:'rgba(0,0,0,0)',filter:'none',textAlign:'start',textBaseline:'alphabetic',direction:'ltr',imageSmoothingEnabled:true});ctx.setLineDash([]);ctx.beginPath();}
    ctx.clearRect(0,0,width,height);ctx.save();
    ctx.globalAlpha=1;
    const scaleLabelsDrawn=drawScaleBarLabels(ctx,{camera,width,height,baseDepth:layout.scaleBase});
    if(scaleLabelsDrawn.length!==layout.scaleReservations.length)throw new Error('Shared scale-label layout/draw count changed');
    const scalePadding=scaleLabelsDrawn.map(label=>scaleReservePadding(layout.scaleReservations.find(item=>item.text===label.text).reserve,label));
    if(scalePadding.some(value=>value<24-1e-6))throw new Error('Drawn scale label escaped its24px reserve');
    layout.report.scaleLabelsDrawn=scaleLabelsDrawn;layout.report.minimumScaleReservePadding=scalePadding.length?Math.min(...scalePadding):null;
    if(layout.timeline){
      const {x,y,length}=layout.timeline,at=year=>x+axisFraction(year)*length;
      ctx.strokeStyle='#9e9b92';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y);
      const years=copy.sections.slice(2,11).map(s=>{const range=s.section.split(', ')[1],start=Number(range.match(/^(\d+)/)[1]);return range.includes('BCE')?-start+1:start;});
      for(const year of [...years,1500,1800,2023]){ctx.moveTo(at(year),y-4);ctx.lineTo(at(year),y+4);}ctx.stroke();
      ctx.save();ctx.beginPath();ctx.rect(at(1500),y-5,at(1600)-at(1500),10);ctx.clip();ctx.beginPath();
      for(let px=at(1500)-10;px<at(1600)+10;px+=5){ctx.moveTo(px,y+5);ctx.lineTo(px+10,y-5);}ctx.stroke();ctx.restore();
      if(state.marker.year!==null){ctx.globalAlpha=state.marker.opacity;ctx.fillStyle='#eee4d2';ctx.beginPath();ctx.arc(at(state.marker.year),y,3,0,Math.PI*2);ctx.fill();}
    }
    for(const item of layout.text){
      ctx.globalAlpha=item.opacity;ctx.font=item.font;halo();
      if(item.tabular){let x=item.x;for(const char of item.value){ctx.font=/\d/.test(char)?item.font.replace('"Strata Sans"','"Strata Sans Numerals"'):item.font;ctx.fillText(char,x,item.y);x+=ctx.measureText(char).width;}}
      else ctx.fillText(item.value,item.x,item.y);
    }
    for(const item of layout.placed){
      if(item.opacity<=0)continue;
      ctx.globalAlpha=item.opacity;ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      // One straight segment, with a1px dark halo on either side of the cream.
      for(const [colour,lineWidth] of [['#101212',3],['#d0c5ae',1]]){
        ctx.strokeStyle=colour;ctx.lineWidth=lineWidth;ctx.beginPath();ctx.moveTo(item.end.x,item.end.y);ctx.lineTo(item.anchor.x,item.anchor.y);ctx.stroke();
      }
      ctx.beginPath();ctx.arc(item.anchor.x,item.anchor.y,3,0,Math.PI*2);ctx.fillStyle='#d0c5ae';ctx.fill();ctx.strokeStyle='#101212';ctx.lineWidth=1;ctx.stroke();
      ctx.font=item.font;halo();item.lines.forEach((line,i)=>ctx.fillText(line,item.rect.x+1,item.rect.y+item.ascent+i*item.lineHeight));
    }
    ctx.restore();texture.needsUpdate=true;
  }
  return {scene,camera:hudCamera,plan,layoutInputs,draw};
}

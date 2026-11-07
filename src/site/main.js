import drawers from '../../reference/site-drawers.json';
import filmCopy from '../../reference/film-callouts.json';
import sourceRegistry from '../../reference/site-sources.json';
import aboutCopy from '../../reference/site-about.json';
import {MIN_YEAR,MAX_YEAR,ERA_BOUNDARIES,EXCAVATION_STOPS,normalizeYear,stepYear,sceneForYear,sectionForYear,formatYear} from '../film/scene-year.js';
import {element,setText,renderFeature,renderFeatureList,renderAbout,safeSourceLink,formatSourceDate} from './content.js';
import {scrubberGeometry,yearToX,snappedYearAtX} from './scrubber.js';
import posterLayout from './poster-layout.json';
import shippedFraming from './framing-reference.json';
import {solvePosterPlacement,edgeFade} from './poster.js';

const params=new URLSearchParams(location.search),domOnly=params.has('dom-only');
const input=document.querySelector('#year'),dialog=document.querySelector('#drawer'),body=document.querySelector('#drawer-body'),title=document.querySelector('#drawer-title');
let year=normalizeYear(Number(params.get('year')??MAX_YEAR)),scene,drawerOpener,sceneStopped=false;
const citationRegistry={...drawers.sources,...Object.fromEntries(sourceRegistry.sources.map(source=>[source.id,source]))};
// Title, tagline and subtitle come from the research-generated drawer data, not site code.
document.title=drawers.siteTitle;document.querySelector('#site-title').textContent=drawers.siteTitle;document.querySelector('#rotate-title').textContent=drawers.siteTitle;document.querySelector('#site-tagline').textContent=drawers.tagline;document.querySelector('#global-note').textContent=drawers.subtitle;
function showPanel(name,content){
  if(!dialog.open)drawerOpener=document.activeElement;
  scene?.setActiveFeature(null);delete dialog.dataset.featureId;
  title.textContent=name;body.replaceChildren(content);if(!dialog.open)dialog.showModal();dialog.querySelector('.close').focus();scene?.invalidate();
}
dialog.addEventListener('close',()=>{if(drawerOpener?.isConnected)drawerOpener.focus();scene?.setActiveFeature(null);scene?.invalidate();});
function openFeature(id){
  const feature=drawers.features.find(feature=>feature.id===id);if(!feature)throw new Error(`Unknown feature ${id}`);
  showPanel(feature.title,renderFeature(feature,citationRegistry,drawers.certaintyLegend));dialog.dataset.featureId=id;scene?.setActiveFeature(id);
}
document.querySelector('#features').addEventListener('click',()=>showPanel('Features',renderFeatureList(drawers.features,openFeature)));
document.querySelectorAll('.close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelector('#film-dialog').addEventListener('close',()=>document.querySelector('#film-video').pause());
// The film poster stays off the network until the scene is ready (a poster attribute fetches even in a closed
// dialog); it is prefetched on idle after ready and set when the dialog opens. data-poster is relative to the page.
const filmVideo=document.querySelector('#film-video'),filmPoster=new URL(filmVideo.dataset.poster,document.baseURI).href;
// Called from click handlers, so play() runs inside the user gesture; the poster shows while the film buffers. If play
// is refused (autoplay policy, unsupported source, closed before it starts), the poster and controls stay up.
function openFilm(){
  if(!filmVideo.getAttribute('poster'))filmVideo.poster=filmPoster;const film=document.querySelector('#film-dialog');if(film.open)return;
  film.showModal();filmVideo.play()?.catch(()=>{});
}
function prefetchFilmPoster(){const run=()=>{new Image().src=filmPoster;};if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:5000});else setTimeout(run,1000);}
for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>{
  const panel=button.dataset.panel;
  if(panel==='film'){openFilm();return;}
  if(panel==='about'){showPanel('About',renderAbout(aboutCopy));return;}
  const content=element('div');
  for(const source of sourceRegistry.sources){
    const paragraph=element('p');paragraph.id=`source-${source.id}`;paragraph.append(safeSourceLink(source.title,source.url));content.append(paragraph);
    content.append(element('p',[source.authors,source.publication,formatSourceDate(source.date)].filter(Boolean).join(' · '),'source-meta'));
  }
  showPanel('Sources',content);
});
// A phone held sideways gets the turn-upright screen (site.css): the HUD does not fit a short landscape screen, while
// the 16:9 film plays well there. Everything under the screen is inert; the 3D view only renders on demand, so it
// idles behind it and reframes when the phone turns back. A feature drawer left open would sit above the screen.
const sideways=matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)'),underRotate=['#viewport','header','.era-panel','.scrubber'].map(s=>document.querySelector(s));
function syncSideways(){const on=sideways.matches;for(const node of underRotate)node.inert=on;if(on&&dialog.open)dialog.close();}
sideways.addEventListener('change',syncSideways);syncSideways();
const readout=document.querySelector('#year-readout'),track=document.querySelector('#timeline');
// Below the scrubber's minimum width (a transient layout while the viewport changes) the last drawing stays until the
// next resize.
const trackDrawable=()=>track.clientWidth>112;
function positionReadout(){
  if(!trackDrawable())return;const width=track.clientWidth,half=readout.getBoundingClientRect().width/2,handle=yearToX(year,width);
  readout.style.left=`${Math.max(half,Math.min(width-half,handle))}px`;
  document.querySelector('#year-handle').style.left=`${handle}px`;
}
const mobile=matchMedia('(max-width:700px)');
const eraPanel=document.querySelector('.era-panel');
function placeGlobalNote(){
  const note=document.querySelector('#global-note');
  if(mobile.matches)document.querySelector('.scrubber').append(note);else document.querySelector('.identity').append(note);
  // Portrait: the era title sits directly above the timeline and its readout. Measured against the panel's containing
  // block, not innerHeight: while a phone turns, innerHeight can lag the layout with no later resize event.
  eraPanel.style.bottom=mobile.matches?`${eraPanel.offsetParent.getBoundingClientRect().bottom-track.getBoundingClientRect().top+36}px`:'';
  positionReadout();
}
mobile.addEventListener('change',placeGlobalNote);window.addEventListener('resize',()=>{drawTimeline();placeGlobalNote();});document.fonts.ready.then(()=>{drawTimeline();positionReadout();});
const svg=document.querySelector('#timeline-svg'),ns='http://www.w3.org/2000/svg';
function line(x,y1,y2){const node=document.createElementNS(ns,'line');Object.entries({x1:x,x2:x,y1,y2,stroke:'#9e9b92','stroke-width':1,'vector-effect':'non-scaling-stroke'}).forEach(([key,value])=>node.setAttribute(key,value));svg.append(node);}
const seasons=document.querySelector('#season-labels');
function drawTimeline(){
  if(!trackDrawable())return;const width=track.clientWidth,g=scrubberGeometry(width),at=value=>(value-MIN_YEAR)/(2013-MIN_YEAR)*g.mainWidth;
  svg.replaceChildren();seasons.replaceChildren();svg.setAttribute('viewBox',`0 0 ${width} 24`);
  const axis=document.createElementNS(ns,'path');axis.setAttribute('d',`M0 12 H${g.mainWidth} M${g.excavationStart} 12 H${width}`);axis.setAttribute('stroke','#9e9b92');svg.append(axis);
  for(const boundary of ERA_BOUNDARIES.filter(year=>year<=2013))line(at(boundary),8,16);
  for(const stop of EXCAVATION_STOPS)line(yearToX(stop,width),6,18);
  const left=at(1500),right=at(1600);
  for(let x=left;x<right;x+=4){const hatch=document.createElementNS(ns,'path');hatch.setAttribute('d',`M${x} 17 L${Math.min(x+5,right)} 7`);hatch.setAttribute('stroke','#9e9b92');hatch.setAttribute('stroke-width','.7');svg.append(hatch);}
  EXCAVATION_STOPS.slice(1).forEach((stop,index)=>{
    const section=filmCopy.sections[12+index],button=element('button',section.section.replace('Excavation season ',''),'season-stop');
    button.style.left=`${yearToX(stop,width)}px`;button.dataset.stop=String(index+1);
    button.setAttribute('aria-label',section.section);button.addEventListener('click',()=>{scene?.pulseInteraction();setYear(stop);});seasons.append(button);
  });
  // Keep one baseline. On narrow screens labels may slide left of their ticks
  // instead of colliding or wrapping; the handle and tick positions never move.
  let rightEdge=width;
  [...seasons.children].reverse().forEach(button=>{
    const box=button.getBoundingClientRect(),center=parseFloat(button.style.left),right=Math.min(center+box.width/2,rightEdge);
    button.style.left=`${right-box.width/2}px`;rightEdge=right-box.width-5;
  });
}
// First-view invitation; gone for the session after the first marker hover, tap or focus.
const hint=document.querySelector('#marker-hint'),coarse=matchMedia('(pointer: coarse)'),HINT_KEY='strata.markerHintSeen';
const hintSeen=()=>{try{return sessionStorage.getItem(HINT_KEY)==='1';}catch{return false;}};
function showHint(){hint.textContent=coarse.matches?'Tap a dot to see what was found.':'Hover a dot to see what was found.';hint.hidden=hintSeen();}
function markerInteracted(){if(hint.hidden)return;try{sessionStorage.setItem(HINT_KEY,'1');}catch{}hint.hidden=true;placeGlobalNote();}
coarse.addEventListener('change',showHint);showHint();
const eraTitle=document.querySelector('#era-title'),eraDates=document.querySelector('#era-dates'),eraCaption=document.querySelector('#era-caption');
// Excavation seasons show the film's season caption under the title, with no leader.
function eraText(sectionIndex){
  const section=filmCopy.sections[sectionIndex],parts=section.section.split(', ');
  return {title:parts[0],dates:parts.slice(1).join(', '),caption:sectionIndex>=12&&sectionIndex<=14?section.callouts[0].label:''};
}
function showEra({title,dates,caption}){setText(eraTitle,title);setText(eraDates,dates);setText(eraCaption,caption);}
function updateUI(){
  input.value=year;const sectionIndex=sectionForYear(year),section=filmCopy.sections[sectionIndex],text=eraText(sectionIndex);showEra(text);
  const stop=EXCAVATION_STOPS.indexOf(year),season=stop>0?section.section.replace('Excavation season ',''):null;
  setText(readout,season||formatYear(year));positionReadout();input.setAttribute('aria-valuetext',`${text.caption||formatYear(year)}, ${section.section}`);
  if(scene&&!sceneStopped)scene.setYear(year);
}
const box=element=>{const r=element.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};};
const union=(a,b)=>{if(!a)return b;const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return {x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};};
// HUD zones the block and labels keep clear of. worstCase measures the era panel with
// every title/caption it can show, so framing does not jump between eras.
function hudRects({worstCase=false}={}){
  let era=box(eraPanel);
  if(worstCase){const saved=eraText(sectionForYear(year));for(let index=2;index<=14;index++){showEra(eraText(index));era=union(era,box(eraPanel));}showEra(saved);}
  const scrubber=box(document.querySelector('.scrubber')),readoutBand=26;
  return [{id:'site-title',rect:box(document.querySelector('#site-title'))},{id:'tagline',rect:box(document.querySelector('#site-tagline'))},{id:'subtitle',rect:box(document.querySelector('#global-note'))},{id:'nav',rect:box(document.querySelector('header nav'))},
    {id:'era-panel',rect:era},{id:'timeline',rect:{x:scrubber.x,y:scrubber.y-readoutBand,width:scrubber.width,height:scrubber.height+readoutBand}}];
}
// Narrow portrait framing may shrink the state title (scene decides how much, at most 20%).
function setTitleScale(scale){eraPanel.style.setProperty('--title-scale',String(scale));placeGlobalNote();}
function setYear(value,{instant=false}={}){
  year=normalizeYear(value);updateUI();if(instant)scene?.setYear(year,true);return sceneForYear(year);
}
input.addEventListener('input',()=>{scene?.pulseInteraction();setYear(Number(input.value));});
// The focus ring is for keyboard use only: pointerdown focuses the input too (so arrow keys work after a click), and
// marks that focus so it shows no ring. Arrow/Home/End keys bring the ring back.
let pointerFocus=false;const showFocus=on=>track.classList.toggle('focused',on);
input.addEventListener('focus',()=>{showFocus(!pointerFocus);pointerFocus=false;});input.addEventListener('blur',()=>{pointerFocus=false;showFocus(false);});
let dragging=false;
function dragAt(event){const rect=track.getBoundingClientRect();setYear(snappedYearAtX(event.clientX-rect.left,rect.width));}
track.addEventListener('pointerdown',event=>{event.preventDefault();showFocus(false);pointerFocus=document.activeElement!==input;input.focus();dragging=true;scene?.beginInteraction('scrub');track.setPointerCapture(event.pointerId);dragAt(event);});
track.addEventListener('pointermove',event=>{if(dragging)dragAt(event);});
track.addEventListener('pointerup',event=>{if(dragging){dragAt(event);dragging=false;track.releasePointerCapture(event.pointerId);scene?.endInteraction('scrub');}});
track.addEventListener('pointercancel',()=>{dragging=false;scene?.endInteraction('scrub');});
track.addEventListener('lostpointercapture',()=>{if(dragging){dragging=false;scene?.endInteraction('scrub');}});
input.addEventListener('keydown',event=>{
  let next;
  if(['ArrowRight','ArrowUp'].includes(event.key))next=stepYear(year,1);
  if(['ArrowLeft','ArrowDown'].includes(event.key))next=stepYear(year,-1);
  if(event.key==='Home')next=MIN_YEAR;if(event.key==='End')next=MAX_YEAR;
  if(next!==undefined){event.preventDefault();showFocus(true);scene?.pulseInteraction();setYear(next);}
});
document.querySelector('#reset').addEventListener('click',()=>scene?.reset());
drawTimeline();updateUI();
placeGlobalNote();
// Without a 3D view (no WebGL2, a failed build, a lost context) the hero still stays up with a short note.
const posterTemplate=document.querySelector('#scene-poster')?.cloneNode(true);let sceneState=domOnly?'dom-only':'loading';
// The hero still is drawn where the 3D view will put the block (poster.js) and stays hidden until placed, so it does
// not move after its first paint. The HUD fonts change the HUD boxes the framing avoids, so placement waits for them
// (briefly: a slow font only costs a small offset at the hand-over). Without a fit the still covers the viewport.
const POSTER_FONT_WAIT_MS=400,hudFonts=['600 36px "Strata Serif"','400 17px "Strata Sans"','600 17px "Strata Sans"'];
let posterMap=null;
function placePoster(){
  const start=performance.now(),viewport=document.querySelector('#viewport'),img=viewport.querySelector('#scene-poster img'),width=viewport.clientWidth,height=viewport.clientHeight;
  const image=posterLayout.images[matchMedia('(orientation: portrait)').matches?'portrait':'landscape'];
  const placed=solvePosterPlacement({layout:posterLayout,shipped:shippedFraming,image,width,height,hudFor:scale=>{setTitleScale(scale);return hudRects({worstCase:true});}});
  setTitleScale(placed.framing?.feasible?placed.framing.titleScale:1);posterMap={...placed.mapping,image,framing:placed.framing};
  if(img){const m=placed.mapping,mask=edgeFade(m,image,width,height);
    Object.assign(img.style,{inset:'auto',left:m.x+'px',top:m.y+'px',width:image.width*m.scale+'px',height:image.height*m.scale+'px',objectFit:'fill',maskImage:mask,webkitMaskImage:mask,maskComposite:'intersect',webkitMaskComposite:'source-in'});
    img.parentNode.classList.add('placed');}
  performance.measure('poster-placement',{start});return posterMap;
}
performance.mark('poster-fonts-wait');const posterReady=Promise.race([Promise.all(hudFonts.map(font=>document.fonts.load(font))),new Promise(resolve=>setTimeout(resolve,POSTER_FONT_WAIT_MS))]).catch(()=>{})
  .then(()=>{if(!sceneStopped&&document.querySelector('#scene-poster'))placePoster();});
window.addEventListener('resize',()=>{if(!sceneStopped&&posterMap&&document.querySelector('#scene-poster:not(.gone)'))placePoster();});
// The note sits over the block's visual centre in the still as drawn, moved along the block until it clears the
// still's scale bar and labels and the HUD.
const overlaps=(a,b,pad)=>a.x<b.x+b.width+pad&&b.x<a.x+a.width+pad&&a.y<b.y+b.height+pad&&b.y<a.y+a.height+pad;
function placeFallbackNote(){
  const note=document.querySelector('.scene-fallback'),viewport=document.querySelector('#viewport');if(!note)return;
  // Measured at the left edge: a shrink-to-fit width depends on the room right of the current position.
  const {image,scale,x:ox,y:oy}=posterMap||placePoster(),vw=viewport.clientWidth,vh=viewport.clientHeight,margin=12;
  const map=r=>({x:ox+r.x*scale,y:oy+r.y*scale,width:r.width*scale,height:r.height*scale}),block=map(image.blockBox);
  Object.assign(note.style,{left:'0px',top:'0px',transform:'none',width:'',maxWidth:`${Math.max(160,Math.min(block.width,vw)-2*margin)}px`});
  // A wrapped note still fills its max width, so hug the widest line box (text and button) instead.
  const range=document.createRange();range.selectNodeContents(note);const lines=[...range.getClientRects()],style=getComputedStyle(note);
  if(lines.length)note.style.width=`${Math.ceil(Math.max(...lines.map(r=>r.right))-Math.min(...lines.map(r=>r.left))+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight))+1}px`;
  const avoid=[...image.keepClear.map(map),...hudRects().filter(h=>h.id!=='timeline').map(h=>h.rect)],width=note.offsetWidth,height=note.offsetHeight;
  const cx=ox+image.blockCentroid[0]*scale,cy=oy+image.blockCentroid[1]*scale,x=Math.max(margin,Math.min(vw-margin-width,cx-width/2));
  const fits=y=>y>=margin&&y+height<=vh-margin&&y+height/2>=block.y&&y+height/2<=block.y+block.height&&!avoid.some(a=>overlaps({x,y,width,height},a,8));
  let y=cy-height/2;for(let d=0;d<=block.height;d+=4){if(fits(cy-height/2-d)){y=cy-height/2-d;break;}if(fits(cy-height/2+d)){y=cy-height/2+d;break;}}
  Object.assign(note.style,{left:`${x}px`,top:`${y}px`,transform:'none',visibility:''});
}
// No-3D portrait: the scene's title fit never ran, so shrink the state title (at most 20%, as the scene may) until it
// is one line; if 80% still wraps, keep full size.
function fitFallbackTitle(){
  if(!mobile.matches){setTitleScale(1);return;}const lineHeight=()=>parseFloat(getComputedStyle(eraTitle).lineHeight),oneLine=()=>eraTitle.getBoundingClientRect().height<lineHeight()*1.5;
  setTitleScale(1);if(oneLine())return;
  for(let percent=99;percent>=80;percent--){setTitleScale(percent/100);if(oneLine())return;}
  setTitleScale(1);
}
function showStill(message,label,action){
  const viewport=document.querySelector('#viewport'),fresh=!sceneStopped;viewport.classList.add('scene-stopped');document.querySelector('#site').classList.add('scene-stopped');
  // The still shows the hero state, so the HUD does too; the timeline, Reset and marker hint only drive the 3D view.
  sceneStopped=true;if(fresh){year=MAX_YEAR;updateUI();}
  if(!viewport.querySelector('#scene-poster')&&posterTemplate)viewport.querySelector('#scene').after(posterTemplate.cloneNode(true));viewport.querySelector('#scene-poster')?.classList.remove('gone');
  viewport.querySelector('.scene-load-status')?.setAttribute('hidden','');viewport.querySelector('.scene-fallback')?.remove();
  const note=element('p',message+' ','scene-fallback'),button=element('button',label);note.setAttribute('role','status');note.style.visibility='hidden';button.addEventListener('click',action);note.append(button);viewport.append(note);
  // The still is placed for the hero HUD, then the fallback title fit and the note; again once the title and note
  // fonts are in (the serif title sets wider than its fallback; fonts.ready can resolve before they start loading)
  // and on resize.
  const refit=()=>{placePoster();if(sceneState!=='context-lost')fitFallbackTitle();placeFallbackNote();};
  posterReady.then(refit);
  if(fresh){window.addEventListener('resize',refit);Promise.all(hudFonts.map(font=>document.fonts.load(font))).then(refit,refit);}
}
const showFilmInstead=()=>showStill("This device can't show the 3D view.",'Watch the film',()=>openFilm());
function hasWebGL2(){try{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
if(!domOnly&&!hasWebGL2()){sceneState='no-webgl2';showFilmInstead();}
else if(!domOnly){
  try{
    const {createSiteScene}=await import('./scene.js');
    scene=await createSiteScene(document.querySelector('#scene'),drawers.features,filmCopy,openFeature,{hudRects,onMarkerInteraction:markerInteracted,setTitleScale,
      onContextLost(){sceneState='context-lost';showStill('The 3D view stopped.',coarse.matches?'Tap to reload.':'Click to reload.',()=>location.reload());}});
    scene.setYear(year,true);if(sceneState==='loading')sceneState='running';
  }catch(error){console.warn('3D view unavailable',error);scene=null;sceneState='failed';showFilmInstead();}
}
prefetchFilmPoster();
window.strataSite={ready:true,domOnly,sceneState:()=>sceneState,setYear,openFeature,sceneForYear,featureIds:drawers.features.map(feature=>feature.id),getYear:()=>year,setActiveFeature:id=>scene?.setActiveFeature(id),
  benchmark:options=>scene?.benchmark(options),verifyFraming:()=>scene?.verifyFraming(),reset:()=>scene?.reset(),metadata:()=>scene?.metadata(),silhouetteStudy:options=>scene?.silhouetteStudy(options),device:()=>scene?.device()??null,gpuMemory:()=>scene?.gpuMemory()??null,markerReport:()=>scene?.markerReport(),hudRects,markerInteracted};

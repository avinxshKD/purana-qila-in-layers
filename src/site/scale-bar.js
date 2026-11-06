// Site scale bar: the film bar's look (bone/grey 1 m segments, bone outline and ticks, "0" / "5 m" in the film
// scale-label style), but standing on the ground plane centred in front of the block, clear of the plinth.
// It stands upright so the hero view shows it at full height; orbits that foreshorten it fade bar and labels together.
import * as THREE from 'three';
// look-stage.js is light (no era kit), so the site shares its SCALE_BAR rather than a copy.
import {SCALE_BAR} from '../look-stage.js';
export {SCALE_BAR};
import {SCALE_LABEL_STYLE} from '../labels.js';
import {convexHull,polygonDistance,rectPoints} from '../film/layout.js';
export const SCALE_BAR_SITE=Object.freeze({lengthMetres:5,plinthClearanceMetres:1.5,groundLiftMetres:.002,fade:Object.freeze([.45,.6]),labelCapMinPx:10,labelGapMinPx:4});
const O=SCALE_BAR.outlineMetres,H=SCALE_BAR.heightMetres;
// World placement from the plinth box and the ground plane.
export function scaleBarPlacement({plinth,groundY}){
  const cx=(plinth.min.x+plinth.max.x)/2,front=plinth.max.z,z=front+SCALE_BAR_SITE.plinthClearanceMetres,half=SCALE_BAR_SITE.lengthMetres/2;
  const bottom=groundY+SCALE_BAR_SITE.groundLiftMetres,centreY=bottom+O+H/2;
  return {centre:new THREE.Vector3(cx,centreY,z),x0:cx-half-O/2,x1:cx+half+O/2,bottom,top:bottom+H+2*O,z,zBack:z-.008,plinthGap:z-.008-front};
}
// Fraction of true length and height the camera sees; < fade[0] hides the bar, >= fade[1] shows it fully.
export function scaleBarVisibility(cameraPosition,placement){
  const v=placement.centre.clone().sub(cameraPosition);
  if(cameraPosition.z<=placement.z+.05)return {length:0,height:0,factor:0,opacity:0};
  v.normalize();const length=Math.sqrt(Math.max(0,1-v.x*v.x)),height=Math.sqrt(Math.max(0,1-v.y*v.y)),factor=Math.min(length,height);
  const [a,b]=SCALE_BAR_SITE.fade,t=Math.min(1,Math.max(0,(factor-a)/(b-a)));
  return {length,height,factor,opacity:t*t*(3-2*t)};
}
// Screen geometry: the bar's outer front-face corners and the label boxes centred under each end.
export function scaleBarScreen({placement,project,viewportHeight,viewportWidth,labelWidths}){
  const scale=Math.min(viewportWidth/1920,viewportHeight/1080),cap=Math.max(SCALE_BAR_SITE.labelCapMinPx,SCALE_LABEL_STYLE.capHeightPx1080*scale),gap=Math.max(SCALE_BAR_SITE.labelGapMinPx,SCALE_LABEL_STYLE.gapPx1080*scale);
  const {x0,x1,bottom,top,z,zBack}=placement,corners=[];
  for(const x of [x0,x1])for(const y of [bottom,top])for(const zz of [z,zBack])corners.push(project(new THREE.Vector3(x,y,zz)));
  const a=project(new THREE.Vector3(x0,bottom,z)),b=project(new THREE.Vector3(x1,bottom,z)),polygon=convexHull(corners);
  // Lowest point of the bar's outline across a label's width: the bar slopes on screen.
  const bottomIn=(left,right)=>{let y=-Infinity;polygon.forEach((p,i)=>{const q=polygon[(i+1)%polygon.length];if(p.x>=left&&p.x<=right)y=Math.max(y,p.y);
    for(const x of [left,right])if((p.x-x)*(q.x-x)<=0&&p.x!==q.x)y=Math.max(y,p.y+(q.y-p.y)*(x-p.x)/(q.x-p.x));});return y;};
  const labels=[['0',a],['5 m',b]].map(([text,end],i)=>{
    const width=labelWidths[i],left=end.x-width/2,under=bottomIn(left,left+width),rect={x:left,y:(Number.isFinite(under)?under:end.y)+gap,width,height:cap};
    // A sloped bar edge can come closer to a label corner than straight down; keep the full gap there too.
    for(let n=0;n<80&&polygonDistance(rectPoints(rect),polygon)<gap;n++)rect.y+=.25;
    return {text,rect,cap};
  });
  return {polygon,labels,cap,gap,lengthPx:Math.hypot(b.x-a.x,b.y-a.y)};
}
export function createSiteScaleBar(scene,host){
  scene.updateMatrixWorld(true);
  const plinth=new THREE.Box3();let groundY=null;
  scene.traverse(object=>{const role=object.userData.sectionRole;if(role==='plinth')plinth.expandByObject(object);if(role==='ground')groundY=object.getWorldPosition(new THREE.Vector3()).y;
    // The film bar sits on the plinth face; the site shows its own bar instead.
    if(role==='scale')object.visible=false;});
  if(plinth.isEmpty()||groundY===null)throw new Error('Scale bar needs the plinth and ground plane');
  const placement=scaleBarPlacement({plinth,groundY}),group=new THREE.Group();group.userData.sectionRole='site-scale';group.name='site-scale-bar';
  const materials=[],mat=color=>{const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1});materials.push(m);return m;};
  const bone=mat(SCALE_BAR.bone),grey=mat(SCALE_BAR.grey),y=placement.bottom+O+H/2,cx=placement.centre.x,z=placement.z;
  const add=(w,h,d,x,yy,zz,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,yy,zz-d/2);mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);};
  for(let i=0;i<5;i++)add(1,H,.012,cx-2+i,y,z-.002,i%2?grey:bone);
  for(let i=0;i<=5;i++)add(O,H+2*O,.014,cx-2.5+i,y,z-.001,bone);
  for(const side of [-1,1])add(5+O,O,.015,cx,y+side*(H+O)/2,z,bone);
  scene.add(group);
  const labels=['0','5 m'].map(text=>{const node=document.createElement('span');node.className='scale-label';node.textContent=text;node.setAttribute('aria-hidden','true');host.append(node);return node;});
  let state={visible:false,opacity:0,labels:[],polygon:null},widths=null,widthKey='';
  return {
    placement,group,
    update(camera,width,height){
      const vis=scaleBarVisibility(camera.position,placement);for(const m of materials)m.opacity=vis.opacity;group.visible=vis.opacity>.001;
      const scale=Math.min(width/1920,height/1080),cap=Math.max(SCALE_BAR_SITE.labelCapMinPx,SCALE_LABEL_STYLE.capHeightPx1080*scale),size=cap/.66;
      if(widthKey!==size.toFixed(2)){widthKey=size.toFixed(2);for(const node of labels){node.style.fontSize=`${size}px`;node.style.textShadow=`0 ${Math.max(1,scale)}px ${SCALE_LABEL_STYLE.haloBlurPx1080*scale}px ${SCALE_LABEL_STYLE.haloColor}`;node.hidden=false;}widths=labels.map(node=>node.getBoundingClientRect().width);}
      const project=p=>{const q=p.clone().project(camera);return {x:(q.x+1)*width/2,y:(1-q.y)*height/2};};
      const screen=scaleBarScreen({placement,project,viewportWidth:width,viewportHeight:height,labelWidths:widths});
      labels.forEach((node,i)=>{const r=screen.labels[i].rect;node.hidden=!group.visible;node.style.opacity=String(vis.opacity);
        // Source Sans 3 with line-height 1em: baseline at .812em, cap height .66em, so cap top is .152em below the line top.
        node.style.left=`${r.x}px`;node.style.top=`${r.y-.152*size}px`;node.style.lineHeight=`${size}px`;});
      state={visible:group.visible,opacity:vis.opacity,visibility:vis,polygon:group.visible?screen.polygon:null,labels:group.visible?screen.labels:[],lengthPx:screen.lengthPx,cap,gap:screen.gap,labelWidths:widths,plinthGapMetres:placement.plinthGap};
      return state;
    },
    metadata:()=>({...state,placement:{centre:placement.centre.toArray(),x0:placement.x0,x1:placement.x1,bottom:placement.bottom,top:placement.top,z:placement.z,plinthGapMetres:placement.plinthGap}}),
    dispose(){scene.remove(group);group.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());labels.forEach(n=>n.remove());}
  };
}

import {HUD_CLEARANCE} from './hud.js';
import {rectPoints} from './layout.js';
// Input is the shared label renderer's actual layout, never a re-projection of
// the bar centre. Keep the raw box for distance audits and its padded reserve
// for containment/provenance. The existing solver applies clearance once.
export function scaleLabelReservations(labels,{clearance=HUD_CLEARANCE}={}){
  return labels.map(label=>{
    const {x,y,width,height}=label;
    if(![x,y,width,height,clearance].every(Number.isFinite)||width<0||height<0||clearance<0)throw new Error('Invalid shared scale-label box');
    const actualBox={x,y,width,height},reserve={x:x-clearance,y:y-clearance,width:width+2*clearance,height:height+2*clearance};
    return {text:label.text,actualBox,reserve,polygon:rectPoints(actualBox),clearance};
  });
}
export function scaleReservePadding(reserve,drawn){
  return Math.min(drawn.x-reserve.x,drawn.y-reserve.y,reserve.x+reserve.width-drawn.x-drawn.width,reserve.y+reserve.height-drawn.y-drawn.height);
}

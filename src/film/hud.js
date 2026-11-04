import {rectPoints,polygonDistance,pointSegmentDistance,segmentsCross,inside} from './layout.js';
export const HUD_CLEARANCE=24;
export function keepNumberUnitsTogether(text){
  // Include date suffixes and common screen/measurement units. Match complete
  // tokens so ordinary following words (for example "18 exposed") stay words.
  return text.replace(/Table[ \u00a0]+1\b/g,'Table\u00a01')
    .replace(/(\d+(?:[.,]\d+)*)[ \t\u00a0]+((?:mm|cm|km|m)(?:[²³]|[23]|\^[23])?|mg|kg|g|mL|ml|L|l|ms|s|min|h|px|Hz|kHz|MHz|dBFS|dB|LUFS|LU|°C|°F|°|%|BCE|CE|millimetres?|centimetres?|kilometres?|metres?|millimeters?|centimeters?|kilometers?|meters?)(?=$|[^\p{L}\p{N}_])/gu,'$1\u00a0$2');
}
export function wrapText(text,maxWidth,measure,{noSingleLast=false}={}){
  const words=keepNumberUnitsTogether(text).split(/ +/),memo=new Map();
  function solve(start){
    if(start===words.length)return {cost:0,lines:[]};if(memo.has(start))return memo.get(start);
    let best=null;
    for(let end=start+1;end<=words.length;end++){
      const line=words.slice(start,end).join(' '),width=measure(line);if(width>maxWidth)break;
      if(noSingleLast&&end===words.length&&line.split(/\s/u).length===1&&start>0)continue;
      const rest=solve(end);if(!rest)continue;
      const cost=(maxWidth-width)**2*(end===words.length?.2:1)+rest.cost;
      if(!best||cost<best.cost)best={cost,lines:[line,...rest.lines]};
    }memo.set(start,best);return best;
  }
  const result=solve(0);return result?result.lines:null;
}
export function auditHud(elements,silhouette){
  const entries=elements.filter(e=>e.opacity===undefined||e.opacity>0).map(e=>({...e,clearance:silhouette.distanceRect(e.rect)}));
  return {entries,failures:entries.filter(e=>e.clearance<HUD_CLEARANCE).map(e=>({id:e.id,kind:e.kind,text:e.text,reason:'HUD text/graphic is less than24px from the true silhouette',clearance:e.clearance,rect:e.rect}))};
}
export const scaleRectDistance=(rect,zones)=>zones.length?Math.min(...zones.map(poly=>polygonDistance(rectPoints(rect),poly))):Infinity;
export function scaleLineDistance(a,b,zones){
  let result=Infinity;
  for(const polygon of zones){
    if(inside(a,polygon)||inside(b,polygon))return 0;
    for(let i=0;i<polygon.length;i++){
    const c=polygon[i],d=polygon[(i+1)%polygon.length];if(segmentsCross(a,b,c,d))return 0;
    result=Math.min(result,pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
    }
  }return result;
}

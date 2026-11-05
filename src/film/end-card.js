import {BLOCK_STYLE} from './text-blocks.js';
// F3 end-card contract. The sources URL is pinned here so every frame renders it once,
// exactly as written: lowercase, no scheme, no trailing slash.
export const END_CARD=Object.freeze({copyId:'end-b',sourcesUrl:'avinxshkd.github.io/purana-qila-in-layers',placeholder:'[SITE URL]',columnWidth:450,
  // "Sources: avinxshkd.github.io/" needs a 524 px line, which reaches the block silhouette on
  // the M2b end-card frames (0 px HUD clearance). The label takes its own line instead.
  labelOwnLine:true});
// One text style for the open and the close: see text-blocks.js.
export const END_CARD_STYLE=BLOCK_STYLE;
export const COLD_OPEN_ID='cold-a';
// One sentence per line.
export const taglineLines=text=>text.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
// Copy lines for the card, with the placeholder line split into its label and the URL.
export function endCardLines(copy,hasOutline=false){
  const option=copy.endCardOptions.find(c=>c.id===END_CARD.copyId);
  return option.lines.filter(line=>hasOutline||!line.startsWith('solid =')).map(line=>{
    const at=line.indexOf(END_CARD.placeholder);
    if(at<0)return {text:line};
    if(line.slice(at+END_CARD.placeholder.length).trim())throw new Error('End-card URL must end its line');
    return {text:line.slice(0,at)+END_CARD.sourcesUrl,prefix:line.slice(0,at).trim(),url:END_CARD.sourcesUrl};
  });
}
// The URL breaks only directly after a "/", never at a hyphen or inside a word. With
// labelOwnLine the label ("Sources:") also stands on its own line; otherwise it stays with the
// URL's first segment. Fewest lines, then the most even. Returns null when an unbreakable piece
// is wider than maxWidth.
export function urlSegments(prefix,url,{labelOwnLine=false}={}){
  const parts=url.split(/(?<=\/)/u);
  if(labelOwnLine&&prefix)return {tokens:[prefix,...parts],forced:[0]};
  return {tokens:[(prefix?prefix+' ':'')+parts[0],...parts.slice(1)],forced:[]};
}
export function wrapUrlLine(prefix,url,maxWidth,measure,options){
  const {tokens,forced}=urlSegments(prefix,url,options),memo=new Map();
  function solve(start){
    if(start===tokens.length)return {count:0,cost:0,lines:[]};if(memo.has(start))return memo.get(start);
    let best=null,line='';
    for(let end=start;end<tokens.length;end++){
      if(end>start&&forced.includes(end-1))break;
      line+=tokens[end];const width=measure(line);if(width>maxWidth)break;
      const rest=solve(end+1);if(!rest)continue;
      const candidate={count:rest.count+1,cost:(maxWidth-width)**2*(end===tokens.length-1?.2:1)+rest.cost,lines:[line,...rest.lines]};
      if(!best||candidate.count<best.count||(candidate.count===best.count&&candidate.cost<best.cost))best=candidate;
    }
    memo.set(start,best);return best;
  }
  return solve(0)?.lines??null;
}
// Column for the URL: the base column, widened only as far as the widest unbreakable piece.
export function urlColumnWidth(prefix,url,measure,base=END_CARD.columnWidth,options){
  return Math.max(base,Math.ceil(Math.max(...urlSegments(prefix,url,options).tokens.map(measure))));
}
// Contract check on a rendered frame's end-card report.
export function checkEndCard(report){
  const failures=[];
  if(!report)return ['End-card report missing'];
  const url=report.urlLines||[],joined=url.join('');
  if(report.sourcesUrl!==END_CARD.sourcesUrl)failures.push('Pinned sources URL differs');
  if(!/^[a-z0-9.\-/]+$/.test(END_CARD.sourcesUrl)||/^https?:/.test(END_CARD.sourcesUrl)||END_CARD.sourcesUrl.endsWith('/'))failures.push('Sources URL form differs');
  const own=url[0]===report.urlPrefix,urlOnly=own?url.slice(1):url;
  if((own?urlOnly.join(''):joined)!==(own?END_CARD.sourcesUrl:`${report.urlPrefix} ${END_CARD.sourcesUrl}`))failures.push('Rendered URL text differs');
  if(urlOnly.slice(0,-1).some(line=>!line.endsWith('/')))failures.push('URL breaks other than after "/"');
  if(report.lines.join('').split(END_CARD.sourcesUrl.split('/')[0]).length!==2)failures.push('URL is not rendered exactly once');
  if(report.moved)failures.push('End-card line moved by the HUD clearance pass');
  return failures;
}

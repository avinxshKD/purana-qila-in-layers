import {labelGap,polygonDistance,rectPoints,MIN_LABEL_GAP,LABEL_GAP_LINE_GAPS} from './layout.js';
// Typographic text blocks: the cold-open title + tagline and the end card (headline, body,
// Sources lines). One style for the open and the close. Inside a block, spacing follows this
// spec and the gate is ink gap >= max(8 px, 2x the internal line gap) between consecutive
// paragraphs. Between a block and every other text element the full label-gap rule applies.
// The HUD clearance pass never moves a block line.
export const BLOCK_STYLE=Object.freeze({
  headline:Object.freeze({cap:36,family:'Strata Serif',step:54}),
  body:Object.freeze({cap:27,family:'Strata Sans',step:43}),
  paragraphGap:12,
  // Between two body paragraphs. 12 px left "report's Table 1." 15 px above the Sources line,
  // under the 20 px the interior gate needs (2x the 10 px line gap of that paragraph); 19 px
  // leaves >= 2 px slack.
  bodyParagraphGap:19,
  // End card only: headline to body. At 12 px (66 px offset) that joint sat at exactly the
  // 20 px the gate needs; 14 px keeps >= 2 px slack. The cold open keeps headlineToBody (66 px).
  endCardHeadlineGap:14,
  // Baseline offset from a headline's last line to the first body line (step + paragraph gap).
  headlineToBody:54+12
});
export const BLOCK_KINDS=Object.freeze(['cold-open','end-card']);
const bottom=r=>r.y+r.height;
// Ink-to-ink gaps between consecutive lines of one paragraph.
export const inkGaps=rects=>rects.slice(1).map((r,i)=>r.y-bottom(rects[i]));
// lines: [{id, rect, paragraph, em}] in reading order. Returns the interior report.
export function blockInterior(id,lines){
  const paragraphs=[];
  for(const line of lines){let p=paragraphs.at(-1);if(!p||p.paragraph!==line.paragraph)paragraphs.push(p={paragraph:line.paragraph,ids:[],rects:[],em:0});p.ids.push(line.id);p.rects.push(line.rect);p.em=Math.max(p.em,line.em||0);}
  for(const p of paragraphs)p.lineGap=Math.max(0,...inkGaps(p.rects));
  const joints=paragraphs.slice(1).map((p,i)=>{
    const q=paragraphs[i],gap=Math.min(...q.rects.flatMap(a=>p.rects.map(b=>polygonDistance(rectPoints(a),rectPoints(b))))),required=Math.max(MIN_LABEL_GAP,LABEL_GAP_LINE_GAPS*Math.max(q.lineGap,p.lineGap));
    return {from:q.paragraph,to:p.paragraph,gap,required,slack:gap-required};
  });
  const rects=lines.map(l=>l.rect);
  return {id,paragraphs:paragraphs.map(({rects,...p})=>p),joints,em:Math.max(0,...lines.map(l=>l.em||0)),lineGap:Math.max(0,...paragraphs.map(p=>p.lineGap)),rects,
    minimumJointSlack:joints.length?Math.min(...joints.map(j=>j.slack)):null,failures:joints.filter(j=>j.gap<j.required-1e-9).map(j=>({id:`${id}:${j.from}+${j.to}`,kind:'block-interior',reason:'Block paragraphs closer than max(8 px, 2x internal line gap)',gap:j.gap,required:j.required}))};
}
// Full label-gap rule between a block and other text elements ({id, kind, rect|polygon, em, lineGap}).
export function blockSeparations(block,others){
  return others.map(other=>{
    const shape=other.polygon||rectPoints(other.rect),gap=Math.min(...block.rects.map(r=>polygonDistance(rectPoints(r),shape)));
    return {ids:[block.id,other.id],kind:other.kind,gap,required:labelGap(block,other)};
  });
}
export const separationFailures=list=>list.filter(s=>s.gap<s.required-1e-9).map(s=>({id:s.ids.join('+'),kind:'label-gap',reason:'Text block closer to another text element than 1 em / twice the internal line gap',gap:s.gap,required:s.required}));

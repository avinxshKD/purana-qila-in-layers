export function element(tag,text,className){
  const node=document.createElement(tag);if(text!==undefined&&text!==null)setText(node,text);if(className)node.className=className;return node;
}
// A number range (2022–23, 1–200 CE, 300 BCE–1 CE) is one unbreakable span: browsers may break a line after an en dash.
const NUMBER_RANGE=/\d[\d,]*(?: (?:BCE|CE))? ?– ?\d[\d,]*(?: (?:BCE|CE))?/g;
export function setText(node,text){
  const value=String(text),parts=[];let last=0;
  for(const match of value.matchAll(NUMBER_RANGE)){
    if(match.index>last)parts.push(document.createTextNode(value.slice(last,match.index)));
    const span=document.createElement('span');span.className='nowrap';span.textContent=match[0];parts.push(span);last=match.index+match[0].length;
  }
  // An empty value leaves no child, as textContent='' does (p:empty hides the empty era lines).
  if(last<value.length)parts.push(document.createTextNode(value.slice(last)));
  node.replaceChildren(...parts);return node;
}
// A missing optional drawer field is left out; the dev server marks it so gaps in the research data stay visible.
const MISSING=import.meta.env?.DEV?'[TBD]':null;
export function safeSourceLink(text,url){
  const parsed=new URL(url);
  if(!['https:','http:'].includes(parsed.protocol))throw new Error('Source links must use HTTP(S)');
  const a=element('a',text);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';return a;
}
// A URL-like link text breaks only after its last slash: the final segment (purana-qila-in-layers) stays whole
// instead of breaking at a hyphen.
function linkText(a){
  const text=a.textContent,cut=text.lastIndexOf('/')+1;if(cut<=0||cut>=text.length)return a;
  const tail=document.createElement('span');tail.className='nowrap';tail.textContent=text.slice(cut);
  a.replaceChildren(document.createTextNode(text.slice(0,cut)),document.createElement('wbr'),tail);return a;
}
// About copy: one paragraph per entry, a newline is a line break, and any text named in copy.links becomes a link.
export function renderAbout(copy){
  const content=element('div'),links=Object.entries(copy.links||{});
  for(const paragraph of copy.paragraphs){
    const p=element('p');
    paragraph.split('\n').forEach((line,index)=>{
      if(index)p.append(document.createElement('br'));
      let rest=line;
      while(rest){
        const next=links.map(([text,url])=>({text,url,at:rest.indexOf(text)})).filter(l=>l.at>=0).sort((a,b)=>a.at-b.at)[0];
        const head=next?rest.slice(0,next.at):rest;if(head)p.append(setText(document.createDocumentFragment(),head));
        if(!next)break;p.append(linkText(safeSourceLink(next.text,next.url)));rest=rest.slice(next.at+next.text.length);
      }
    });
    content.append(p);
  }
  return content;
}
export function formatSourceDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const date=new Date(`${value}T00:00:00Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return value;
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date);
}
export function formatCitation(evidence,source){
  if(!source?.shortCite)return `${evidence.sourceId} · ${evidence.page}`;
  const page=String(evidence.page);
  return `${source.shortCite}, ${/^\d/.test(page)?'p.':''}${page}`;
}
export function renderFeature(feature,registry,certaintyLegend={}){
  const body=element('div');body.append(element('p',feature.period,'period'));
  const tags=element('div',undefined,'tags');
  for(const tag of feature.certaintyTags||[]){
    const legend=certaintyLegend[tag]||MISSING,row=element('div',undefined,'certainty-row'),badge=element('span',tag,'certainty-tag');
    if(legend){const description=element('span',legend,'certainty-legend');badge.setAttribute('role','img');badge.setAttribute('aria-label',legend);description.setAttribute('aria-hidden','true');row.append(badge,description);}
    else row.append(badge);
    tags.append(row);
  }
  body.append(tags);
  const optional=value=>{const text=value||MISSING;if(text)body.append(element('p',text));};
  optional(feature.reportedDimensionsStatus);
  const shown=new Set(),normalized=text=>String(text).trim().replace(/\s+/g,' ');
  function quoteOnce(text,evidence){
    if(shown.has(normalized(text)))return false;shown.add(normalized(text));
    const quote=element('blockquote'),words=element('span',text,'quote-text');quote.append(words);
    if(evidence){
      const source=registry[evidence.sourceId],cite=element('cite');cite.append(safeSourceLink(formatCitation(evidence,source),source?.url||evidence.url));quote.append(cite);
    }
    body.append(quote);return true;
  }
  for(const dimension of feature.reportedDimensions||[]){
    const text=dimension.quoted||MISSING;if(!text)continue;const evidence=dimension.evidence||(feature.evidence||[]).find(item=>normalized(item.text)===normalized(text));
    if(quoteOnce(text,evidence)&&dimension.conversionNote)body.append(element('p',dimension.conversionNote,'conversion'));
  }
  for(const evidence of feature.evidence||[])quoteOnce(evidence.text,evidence);
  if(feature.interpretation)body.append(element('p',feature.interpretation));
  optional(feature.notKnown);optional(feature.drawingMeaning);optional(feature.reconstructionBoundary);
  return body;
}
export function renderFeatureList(features,onOpen){
  const body=element('div'),groups=new Map();
  for(const feature of features){if(!groups.has(feature.period))groups.set(feature.period,[]);groups.get(feature.period).push(feature);}
  for(const [period,items] of groups){
    body.append(element('h3',period));const list=element('ul',undefined,'feature-list');
    for(const feature of items){const row=element('li'),button=element('button',feature.title);button.dataset.featureId=feature.id;button.addEventListener('click',()=>onOpen(feature.id));row.append(button);list.append(row);}
    body.append(list);
  }
  return body;
}

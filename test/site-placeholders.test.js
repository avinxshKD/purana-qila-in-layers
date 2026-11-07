import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{root}=require('../scripts/browser.cjs'),{PATTERNS}=require('../scripts/site/placeholder-audit.cjs');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
// Just enough DOM for content.js: elements with children, attributes and properties; text nodes.
class FakeElement{
  constructor(tagName){this.tagName=tagName;this.childNodes=[];this.attributes={};this.dataset={};this.className='';}
  append(...nodes){this.childNodes.push(...nodes);}replaceChildren(...nodes){this.childNodes=[...nodes];}setAttribute(name,value){this.attributes[name]=String(value);}addEventListener(){}
  get textContent(){return this.childNodes.map(node=>node.textContent).join('');}set textContent(value){this.childNodes=value===''?[]:[{nodeType:3,textContent:String(value)}];}
}
globalThis.document={createElement:tag=>new FakeElement(tag),createTextNode:text=>({nodeType:3,textContent:String(text)})};
const {renderFeature,renderFeatureList,setText}=await import('../src/site/content.js');
function strings(node,out=[]){out.push(node.textContent);if(node.attributes)out.push(...Object.values(node.attributes));for(const key of ['href','title','alt'])if(typeof node[key]==='string')out.push(node[key]);for(const child of node.childNodes||[])strings(child,out);return out;}
const placeholders=values=>values.flatMap(value=>PATTERNS.filter(([,re])=>re.test(String(value))).map(([name])=>`${name}: ${String(value).slice(0,80)}`));
const drawers=read('reference/site-drawers.json'),sources=read('reference/site-sources.json');
const registry={...drawers.sources,...Object.fromEntries(sources.sources.map(source=>[source.id,source]))};
test('no feature drawer renders placeholder or broken text',()=>{
  for(const feature of drawers.features)assert.deepEqual(placeholders(strings(renderFeature(feature,registry,drawers.certaintyLegend))),[],feature.id);
  assert.deepEqual(placeholders(strings(renderFeatureList(drawers.features,()=>{}))),[]);
});
test('a feature missing its optional fields leaves them out instead of rendering a placeholder',()=>{
  const bare={id:'bare',title:'Bare',period:'Kushan, 1–200 CE',certaintyTags:['X'],reportedDimensions:[{}]},body=renderFeature(bare,registry,{});
  assert.deepEqual(placeholders(strings(body)),[]);
  assert.equal(body.textContent,'Kushan, 1–200 CEX');
});
test('number ranges render as one unbreakable span, units included',()=>{
  const cases={'Excavation season 2022–23':['2022–23'],'Kushan, 1–200 CE':['1–200 CE'],'c. 300 BCE–1 CE':['300 BCE–1 CE'],'540 BCE':[],'Seasons 2013–14 and 2017–18':['2013–14','2017–18']};
  for(const [text,ranges] of Object.entries(cases)){
    const node=setText(new FakeElement('p'),text);assert.equal(node.textContent,text);
    assert.deepEqual(node.childNodes.filter(child=>child.className==='nowrap').map(child=>child.textContent),ranges,text);
  }
  assert.equal(setText(new FakeElement('p'),'').childNodes.length,0,'empty text leaves the element :empty');
});
test('site copy and page attributes carry no placeholder text',()=>{
  const film=read('reference/film-callouts.json'),about=read('reference/site-about.json');
  const copy=[drawers.siteTitle,drawers.subtitle,drawers.tagline,...Object.values(drawers.certaintyLegend||{}),...about.paragraphs,
    ...film.sections.flatMap(section=>[section.section,...(section.callouts||[]).map(callout=>callout.label)])];
  assert.deepEqual(placeholders(copy),[]);
  const html=fs.readFileSync(path.join(root,'site.html'),'utf8'),attributes=[...html.matchAll(/\s(?:aria-label|aria-valuetext|alt|title|placeholder)="([^"]*)"/g)].map(match=>match[1]);
  assert.ok(attributes.length>=4);assert.deepEqual(placeholders(attributes),[]);
});

'use strict';
// Placeholder audit of a built site: renders the page DOM-only (fine pointer desktop and touch portrait) through every
// era/season state, the Features list and every feature drawer, About, Sources and the film dialog; the no-WebGL2
// fallback (landscape and portrait); and the turn-upright screen. Collects all text in the document (visible or not)
// plus aria-label, aria-valuetext, aria-description, alt, title and placeholder attributes, and the document title,
// and flags placeholder or broken text. CPU only (no GPU lock). deploy-check.cjs gates on zero hits, and runs
// collectPage on its live 3D page too (marker labels, the context-lost note).
// Usage: node scripts/site/placeholder-audit.cjs --dist output/site/deploy-dry-rc3j --out output/site/placeholder-audit-rc3j
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core'),{root,executable}=require('../browser.cjs');
const PATTERNS=[['[TBD]',/\[TBD\]/i],['TBD',/\bTBD\b/],['TODO',/\bTODO\b/],['FIXME',/\bFIXME\b/],['[SITE URL]',/\[SITE URL\]/i],['lorem',/lorem/i],['undefined',/\bundefined\b/],['null',/\bnull\b/],['NaN',/\bNaN\b/],['[object',/\[object/]];
// Runs in the page.
function collectPage(){
  const attrs=['aria-label','aria-valuetext','aria-description','alt','title','placeholder'],out=[];
  const where=el=>{const p=[];for(let e=el;e&&e!==document.documentElement&&p.length<4;e=e.parentElement)p.unshift(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].join('.'):''));return p.join(' > ');};
  const shown=el=>{if(!el.isConnected)return false;for(let e=el;e&&e.nodeType===1;e=e.parentElement){if(e.tagName==='DIALOG'&&!e.open)return false;if(e.hidden||getComputedStyle(e).display==='none')return false;}return getComputedStyle(el).visibility!=='hidden';};
  out.push({kind:'document.title',text:document.title,where:'head > title',visible:true});
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);for(let n=walker.nextNode();n;n=walker.nextNode()){const p=n.parentElement;if(!p||['SCRIPT','STYLE'].includes(p.tagName)||!n.textContent.trim())continue;out.push({kind:'text',text:n.textContent.trim(),where:where(p),visible:shown(p)});}
  for(const el of document.querySelectorAll('*'))for(const a of attrs)if(el.hasAttribute(a))out.push({kind:'@'+a,text:el.getAttribute(a),where:where(el),visible:shown(el)});
  return out;
}
function flag(entries,scenario){
  const hits=[];for(const e of entries)for(const [name,re] of PATTERNS)if(re.test(e.text))hits.push({pattern:name,scenario,...e,text:e.text.slice(0,200)});
  return hits;
}
function blockWebGL2(){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type==='webgl2'?null:original.call(this,type,...rest);};}
const desktop={width:1440,height:900,deviceScaleFactor:1},phone={width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},sideways={width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true};
async function auditSite(origin,base){
  const browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu']}),scenarios=[],hits=[],errors=[];
  const record=async(page,scenario)=>{const entries=await page.evaluate(collectPage);scenarios.push({scenario,entries:entries.length});hits.push(...flag(entries,scenario));};
  const open=async(viewport,query,{noWebGL2=false}={})=>{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));if(noWebGL2)await page.evaluateOnNewDocument(blockWebGL2);
    await page.setViewport(viewport);await page.goto(origin+base+query,{waitUntil:'load'});await page.waitForFunction(()=>window.strataSite?.ready,{timeout:60000});await page.evaluate(()=>document.fonts.ready);return page;};
  try{
    for(const [name,viewport] of [['desktop',desktop],['phone',phone]]){
      const page=await open(viewport,'?dom-only');await record(page,`${name} first view`);
      // One year per era and every excavation season.
      const years=await page.evaluate(()=>{const seen=new Map();for(let y=-539;y<=2023;y++){const s=window.strataSite.sceneForYear(y),key=JSON.stringify(s?.section??s);if(!seen.has(key))seen.set(key,y);}return [...seen.values(),2014,2018,2023];});
      for(const y of [...new Set(years)]){await page.evaluate(y=>window.strataSite.setYear(y),y);await record(page,`${name} year ${y}`);}
      await page.click('#features');await record(page,`${name} Features list`);
      for(const id of await page.evaluate(()=>window.strataSite.featureIds)){await page.evaluate(id=>window.strataSite.openFeature(id),id);await record(page,`${name} feature drawer ${id}`);}
      await page.evaluate(()=>document.querySelector('#drawer').close());
      for(const panel of ['about','sources']){await page.click(`header [data-panel="${panel}"]`);await record(page,`${name} ${panel}`);await page.evaluate(()=>document.querySelector('#drawer').close());}
      await page.click('header [data-panel="film"]');await page.waitForFunction(()=>document.querySelector('#film-dialog').open);await record(page,`${name} film dialog`);
      await page.close();
      const fallback=await open(viewport,'',{noWebGL2:true});await fallback.waitForFunction(()=>!!document.querySelector('.scene-fallback'),{timeout:60000}).catch(()=>errors.push(name+': no fallback note'));
      await record(fallback,`${name} no-webgl2 fallback`);await fallback.close();
    }
    const rotate=await open(sideways,'?dom-only');await record(rotate,'phone sideways turn-upright screen');await rotate.close();
  }finally{await browser.close();}
  return {patterns:PATTERNS.map(p=>p[0]),scenarios,hits,errors};
}
async function main(){
  const {BASE,serveDist}=require('./deploy-check.cjs');
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/placeholder-audit-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,0);let report;try{report=await auditSite(server.url,BASE);}finally{await server.close();}
  fs.writeFileSync(path.join(out,'placeholder-audit.json'),JSON.stringify({dist:path.relative(root,dist).split(path.sep).join('/'),...report},null,2)+'\n');
  const grouped=new Map();for(const h of report.hits){const k=`${h.pattern} | ${h.kind} | ${h.where} | ${h.text}`;if(!grouped.has(k))grouped.set(k,{...h,scenarios:[]});grouped.get(k).scenarios.push(h.scenario);}
  console.log(`scenarios ${report.scenarios.length}, hits ${report.hits.length} (${grouped.size} distinct), errors ${report.errors.length}`);
  for(const g of grouped.values())console.log(`HIT ${g.pattern} ${g.kind} ${g.visible?'visible':'hidden'} "${g.text}" at ${g.where} in ${g.scenarios.length} scenario(s): ${[...new Set(g.scenarios.map(s=>s.replace(/ (year|feature drawer) .*/,' $1 …')))].join(', ')}`);
  for(const e of report.errors)console.log('ERROR',e);
  if(report.hits.length||report.errors.length)process.exitCode=1;
}
module.exports={PATTERNS,collectPage,flag,auditSite};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});

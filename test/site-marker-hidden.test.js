import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core'),{executable,root}=require('../scripts/browser.cjs');
// The work takes well under a second; the budget covers a browser launch while the suite's other browser tests start
// in parallel, which took over 20 s once.
test('hidden markers have no visible box while eligible markers retain their dot box',{timeout:90000},async()=>{
  const browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu']});
  try{
    const page=await browser.newPage(),css=fs.readFileSync(root+'/src/site/site.css','utf8');
    await page.setContent(`<style>${css}</style><button class="marker" hidden><span>Hidden</span></button><button class="marker"><span>Visible</span></button>`);
    const boxes=await page.$$eval('.marker',nodes=>nodes.map(node=>({hidden:node.hidden,display:getComputedStyle(node).display,width:node.getBoundingClientRect().width})));
    assert.deepEqual(boxes.map(b=>b.display),['none','block']);assert.equal(boxes[0].width,0);assert.ok(boxes[1].width>0);
    await page.$eval('.marker[hidden]',node=>node.hidden=false);assert.equal(await page.$eval('.marker',node=>getComputedStyle(node).display),'block');
  }finally{await browser.close();}
});

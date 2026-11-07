import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
// The fallback note is placed from measurements of the shipped hero stills; a recaptured still needs a new layout
// (node scripts/site/poster-layout.cjs).
const layout=JSON.parse(fs.readFileSync(new URL('../src/site/poster-layout.json',import.meta.url)));
test('poster layout was measured from the shipped hero stills',()=>{
  for(const name of ['landscape','portrait']){
    const image=layout.images[name],bytes=fs.readFileSync(new URL('../'+image.file,import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),image.sha256,`${image.file} changed; rerun scripts/site/poster-layout.cjs`);
    const [x,y]=image.blockCentroid,b=image.blockBox;assert.ok(x>b.x&&x<b.x+b.width&&y>b.y&&y<b.y+b.height,'centroid inside the block box');
    assert.ok(image.keepClear.length>=1,'the scale bar and its labels are found');
  }
});

test('poster layout carries the capture framing, scale-bar box and label metrics the scene uses',async()=>{
  const shipped=JSON.parse(fs.readFileSync(new URL('../src/site/framing-reference.json',import.meta.url)));
  assert.equal(layout.reference.key,shipped.key,'poster layout made for the shipped framing reference');
  const [{SCALE_LABEL_STYLE},{SCALE_BAR_SITE}]=await Promise.all([import('../src/labels.js'),import('../src/site/scale-bar.js')]),s=layout.reference.scaleLabels;
  assert.deepEqual([s.capPx1080,s.gapPx1080,s.capMinPx,s.gapMinPx],[SCALE_LABEL_STYLE.capHeightPx1080,SCALE_LABEL_STYLE.gapPx1080,SCALE_BAR_SITE.labelCapMinPx,SCALE_BAR_SITE.labelGapMinPx]);
  const b=layout.reference.barBox;assert.ok(b.x0>0&&b.x1<shipped.width&&b.y0>0&&b.y1<shipped.height&&b.x1>b.x0&&b.y1>b.y0);
  for(const name of ['landscape','portrait']){const c=layout.images[name].capture;
    assert.ok(Math.abs(c.width*c.deviceScaleFactor-layout.images[name].width)<=1&&Math.abs(c.height*c.deviceScaleFactor-layout.images[name].height)<=1,name+' capture size');}
});
test('the still maps onto the viewport by the framing similarity; at its capture framing it is drawn 1:1',async()=>{
  const {posterMapping,coverMapping,scaleLabelBlock,edgeFade}=await import('../src/site/poster.js');
  for(const name of ['landscape','portrait']){
    const image=layout.images[name],c=image.capture,m=posterMapping(image,{k:c.k,centre:c.centre});
    assert.ok(Math.abs(m.scale-1/c.deviceScaleFactor)<1e-12&&Math.abs(m.x)<1e-9&&Math.abs(m.y)<1e-9,name);
    assert.equal(edgeFade(m,image,c.width,c.height),'','a still that fills its capture viewport is not faded');
    // Half the scale about a moved centre: the capture centre lands on the new centre.
    const h=posterMapping(image,{k:c.k/2,centre:{x:100,y:80}});
    assert.ok(Math.abs(h.x+h.scale*c.centre.x*c.deviceScaleFactor-100)<1e-9&&Math.abs(h.y+h.scale*c.centre.y*c.deviceScaleFactor-80)<1e-9);
    assert.match(edgeFade(h,image,c.width,c.height),/linear-gradient/);
    const cover=coverMapping(image,c.width,c.height);assert.ok(Math.abs(cover.scale-1/c.deviceScaleFactor)<1e-9);
  }
  // Scale-bar label block as scale-bar.js measures it at the landscape capture (1440x900: cap 11.25, gap 5.25).
  const l=scaleLabelBlock(layout.reference.scaleLabels,1440,900);assert.equal(l.cap,11.25);assert.equal(l.gap,5.25);
  assert.ok(Math.abs(l.halfWidth-(26.515625/2+2))<.05,String(l.halfWidth));
});

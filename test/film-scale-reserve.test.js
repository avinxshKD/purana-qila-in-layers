import test from 'node:test';
import assert from 'node:assert/strict';
import {scaleLabelReservations} from '../src/film/scale-reserve.js';
import {scaleRectDistance} from '../src/film/hud.js';
test('scale reserve uses the provided real glyph box and applies24px protection only once',()=>{
  const drawn={text:'0',x:700.25,y:900.75,width:11.66,height:15.4},[item]=scaleLabelReservations([drawn]);
  assert.deepEqual(item.actualBox,{x:drawn.x,y:drawn.y,width:drawn.width,height:drawn.height});
  assert.equal(item.actualBox.x-item.reserve.x,24);assert.equal(item.actualBox.y-item.reserve.y,24);
  assert.ok(Math.abs(item.reserve.x+item.reserve.width-item.actualBox.x-item.actualBox.width-24)<1e-10);
  assert.ok(Math.abs(item.reserve.y+item.reserve.height-item.actualBox.y-item.actualBox.height-24)<1e-10);
  const candidate={x:item.reserve.x-20,y:drawn.y,width:20,height:10};
  assert.equal(scaleRectDistance(candidate,[item.polygon]),24);
  assert.throws(()=>scaleLabelReservations([{...drawn,y:NaN}]),/Invalid shared/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {scrubberGeometry,yearToX,xToYear,snappedYearAtX} from '../src/site/scrubber.js';
import {EXCAVATION_STOPS,stepYear,sceneForYear} from '../src/film/scene-year.js';
test('excavation width clamp and 16px break use CSS pixels',()=>{
  assert.equal(scrubberGeometry(350).excavationWidth,96);assert.equal(scrubberGeometry(1000).excavationWidth,120);assert.equal(scrubberGeometry(1344).excavationWidth,160);
  assert.equal(scrubberGeometry(1344).breakWidth,16);
});
test('piecewise year mapping is monotonic and round-trips, including the excavation stops',()=>{
  for(const width of [350,1000,1344]){
    let previous=-1;
    for(let year=-539;year<=2023;year+=.25){const x=yearToX(year,width);assert.ok(x>=previous);assert.ok(Math.abs(xToYear(x,width)-year)<1e-8);previous=x;}
    for(const year of EXCAVATION_STOPS)assert.ok(Math.abs(xToYear(yearToX(year,width),width)-year)<1e-8);
  }
});
test('excavation uses four evenly spaced snap states and keyboard stops',()=>{
  const width=1344,g=scrubberGeometry(width);
  EXCAVATION_STOPS.forEach((year,index)=>{const x=g.excavationStart+g.excavationWidth*index/3;assert.equal(snappedYearAtX(x,width),year);assert.equal(sceneForYear(year).excavation,index/3);});
  assert.equal(snappedYearAtX(g.excavationStart+g.excavationWidth*.52,width),2018);
  assert.equal(stepYear(1800,1),2013);assert.equal(stepYear(2013,1),2014);assert.equal(stepYear(2014,1),2018);assert.equal(stepYear(2018,1),2023);assert.equal(stepYear(2023,-1),2018);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {filmState,YEAR_RANGES} from '../src/film/timeline.js';
import {sceneForYear,stepYear,normalizeYear,sectionForYear,ERA_BOUNDARIES,formatYear} from '../src/film/scene-year.js';
test('year readout uses astronomical BCE/CE labels without a year zero',()=>{
  assert.equal(formatYear(-539),'540 BCE');assert.equal(formatYear(0),'1 BCE');assert.equal(formatYear(1),'1 CE');assert.equal(formatYear(2023),'2023 CE');
});
test('year scene has exactly the geometry-only film schema',()=>{
  assert.deepEqual(Object.keys(sceneForYear(100)).sort(),Object.keys(filmState(22).scene).sort());
  assert.equal('year' in sceneForYear(100),false);assert.equal('seconds' in sceneForYear(100),false);
});
test('each cultural era interpolates linearly with earlier eras complete',()=>{
  YEAR_RANGES.slice(0,9).forEach(([start,end],index)=>{
    const state=sceneForYear((start+end)/2);assert.equal(state.eraIndex,index);assert.equal(state.deposits[index],.5);assert.equal(state.features[index],.5);
    assert.deepEqual(state.deposits.slice(0,index),Array(index).fill(1));assert.equal(state.excavation,0);
  });
});
test('gap snaps to its endpoints and keyboard steps only to known boundaries',()=>{
  assert.equal(normalizeYear(1549),1500);assert.equal(normalizeYear(1550),1600);
  ERA_BOUNDARIES.forEach((year,index)=>{assert.equal(stepYear(year,1),ERA_BOUNDARIES[Math.min(index+1,ERA_BOUNDARIES.length-1)]);assert.equal(stepYear(year,-1),ERA_BOUNDARIES[Math.max(0,index-1)]);});
});
test('excavation opens from 2013 to 2023 and all deposits remain complete',()=>{
  assert.equal(sceneForYear(2013).excavation,0);assert.equal(sceneForYear(2014).excavation,1/3);assert.equal(sceneForYear(2018).excavation,2/3);assert.equal(sceneForYear(2023).excavation,1);
  assert.deepEqual(sceneForYear(2023).deposits,Array(10).fill(1));assert.equal(sceneForYear(2023).eraIndex,null);
  assert.equal(sectionForYear(100),5);assert.equal(sectionForYear(2023),14);
});
test('year input clamps, rejects nonfinite values and supports arbitrary scrubs',()=>{
  assert.deepEqual(sceneForYear(-1000),sceneForYear(-539));assert.deepEqual(sceneForYear(3000),sceneForYear(2023));assert.throws(()=>sceneForYear(NaN),TypeError);
  const state=sceneForYear(100);sceneForYear(2023);sceneForYear(-539);assert.deepEqual(sceneForYear(100),state);
});

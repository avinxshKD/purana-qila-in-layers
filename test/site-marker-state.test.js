import test from 'node:test';
import assert from 'node:assert/strict';
import {markerStatus} from '../src/site/marker-state.js';
test('marker reasons distinguish native exposure, era reveal, viewport, worker blockage and missing data',()=>{
 const data={anchor:{point:[1,2,3],visible:true,revealed:true},featureOpacity:1,projected:{x:0,y:0,z:0}};
 assert.equal(markerStatus({...data,featureOpacity:0}).reason,'unrevealed');
 assert.equal(markerStatus({...data,anchor:{visible:false}}).reason,'occluded');
 assert.equal(markerStatus({...data,anchor:null}).reason,'missing-native-anchor');
 assert.equal(markerStatus({...data,projected:{x:1,y:0,z:0}}).reason,'off-screen');
 assert.equal(markerStatus(data).reason,'pending-occlusion');
 assert.equal(markerStatus({...data,workerVisible:false}).reason,'occluded');
 assert.equal(markerStatus({...data,workerVisible:true}).reason,'visible');
});

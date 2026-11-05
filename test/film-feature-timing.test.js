import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {audit,assertDugIn,timingViolation,dugInHeight} from '../scripts/film/feature-timing-audit.cjs';
test('feature timing permits cold open and old excavated features, but not early growth or late rewind',()=>{
 assert.equal(timingViolation(1,0),null);assert.equal(timingViolation(1,240),'before-feature-rise');assert.equal(timingViolation(1,375),null);assert.equal(timingViolation(1,236),'after-rewind-exit');assert.equal(timingViolation(1,1799),null);
});
// Open channel: deposit surface (record surfacePlane) tilts gently at y = 1.00 + 0.01x; era base 0.50;
// the channel floor (what the active top reads inside the channel) is 0.12 m below the surface.
const plane={at:(x,z)=>1+.01*x},channel={surfacePlane:plane,baseAt:()=>.5,deposit:1,activeTopAt:(x,z)=>plane.at(x,z)-.12};
const tileTops=[[0,1,0],[1,1.01,.2],[2,1.02,-.3]];
test('flush tiles in an open channel pass against the deposit surface, not the channel floor',()=>{
 const r=dugInHeight(tileTops,channel);assert.ok(Math.abs(r.maximumHeightMetres)<1e-9);assert.equal(r.proud,false);
 assert.equal(dugInHeight(tileTops,{activeTopAt:channel.activeTopAt}).proud,true,'old active-top reference reads the channel as 0.12 m proud');
 // Half-deposited era: the reference follows base + d x (surface - base).
 assert.ok(Math.abs(dugInHeight([[0,.75,0]],{...channel,deposit:.5}).maximumHeightMetres)<1e-9);
});
test('a tile standing proud of the surrounding deposit surface still fails',()=>{
 const r=dugInHeight([...tileTops,[1.5,1.015+.025,0]],channel);assert.ok(r.maximumHeightMetres>.02);assert.equal(r.proud,true);
 assert.equal(dugInHeight([[0,1.02,0]],channel).proud,false,'exactly 2 cm is within the limit');
 assert.equal(dugInHeight([[0,1.0201,0]],channel).proud,true);
});
test('ring well must not stand more than2cm above active top in Pre-Mauryan',{timeout:300000},async()=>{
 const tree=path.resolve(process.env.FEATURE_AUDIT_ROOT??'.'),report=await audit({tree,frames:[240]});
 assertDugIn(report);
 assert.equal(report.flags.some(f=>f.featureId==='mauryan-ring-well'&&f.kind==='before-feature-rise'),false,'Ring well visible before Mauryan feature rise');
});

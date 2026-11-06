import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{_createGpuLock,_keepAwake}=require('../scripts/gpu-lock.cjs');
// Existing tests run as if on AC so they do not depend on the machine's power state.
const onAc=async()=>({ac:true,detail:'fixture AC'});
const fixture=()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'strata-gpu-lock-'));return {directory,file:path.join(directory,'.gpu-lock')};};
test('GPU ownership is exclusive and releases after success or error',async()=>{
  const {directory,file}=fixture(),lock=_createGpuLock(file,{cooldownMs:0,retryMs:5,powerProbe:onAc});let active=0,peak=0;
  try{
    await Promise.all([1,2,3].map(n=>lock(`test-${n}`,async()=>{active++;peak=Math.max(peak,active);const record=JSON.parse(fs.readFileSync(file));assert.equal(record.pid,process.pid);assert.ok(record.startTime);await new Promise(resolve=>setTimeout(resolve,15));active--;})));
    assert.equal(peak,1);assert.equal(fs.existsSync(file),false);
    await assert.rejects(lock('throw',async()=>{throw new Error('fixture');}),/fixture/);
    assert.equal(fs.existsSync(file),false);
  }finally{fs.rmSync(directory,{recursive:true});}
});
test('dead or ten-minute-old ownership is reclaimed',async()=>{
  const {directory,file}=fixture(),lock=_createGpuLock(file,{cooldownMs:0,retryMs:5,powerProbe:onAc});
  try{
    fs.writeFileSync(file,JSON.stringify({owner:'dead',pid:2147483647,startTime:new Date().toISOString()}));
    await lock('replacement',async()=>assert.equal(JSON.parse(fs.readFileSync(file)).owner,'replacement'));
    fs.writeFileSync(file,JSON.stringify({owner:'expired',pid:process.pid,startTime:new Date(Date.now()-600001).toISOString()}));
    await lock('replacement',async()=>assert.equal(JSON.parse(fs.readFileSync(file)).owner,'replacement'));
  }finally{fs.rmSync(directory,{recursive:true});}
});
test('one process yields before its next acquisition',async()=>{
  const {directory,file}=fixture(),lock=_createGpuLock(file,{cooldownMs:40,retryMs:5,powerProbe:onAc});
  try{const start=Date.now();await lock('first',async()=>{});assert.ok(Date.now()-start>=35);await lock('second',async()=>{});}
  finally{fs.rmSync(directory,{recursive:true});}
});
test('GPU work waits for AC, logging once; requireAc:false runs on battery',async()=>{
  const {directory,file}=fixture(),logs=[];let ac=false,probes=0;
  const lock=_createGpuLock(file,{cooldownMs:0,retryMs:5,powerPollMs:10,log:message=>logs.push(message),powerProbe:async()=>{probes++;return {ac,detail:'fixture battery'};}});
  try{
    let ran=false;const pending=lock('gpu-run',async()=>{ran=true;assert.equal(JSON.parse(fs.readFileSync(file)).owner,'gpu-run');});
    await new Promise(resolve=>setTimeout(resolve,60));assert.equal(ran,false);assert.equal(fs.existsSync(file),false);assert.ok(probes>=3);
    assert.equal(logs.length,1);assert.match(logs[0],/gpu-run: waiting for AC \(fixture battery\)/);
    let cpu=false;await lock('cpu-build',async()=>{cpu=true;},{requireAc:false});assert.equal(cpu,true);
    ac=true;await pending;assert.equal(ran,true);assert.equal(logs.length,1);assert.equal(fs.existsSync(file),false);
    const before=probes;await lock('no-probe',async()=>{},{requireAc:false});assert.equal(probes,before);
  }finally{fs.rmSync(directory,{recursive:true});}
});
test('power is probed again after acquiring: AC lost while queued hands the lock back until AC returns',async()=>{
  const {directory,file}=fixture(),logs=[],answers=[true,false];let ac=false,probes=0;
  const lock=_createGpuLock(file,{cooldownMs:0,retryMs:5,powerPollMs:10,log:message=>logs.push(message),
    powerProbe:async()=>{probes++;return {ac:answers.length?answers.shift():ac,detail:'fixture'};}});
  try{
    let ran=false;const pending=lock('gpu-run',async()=>{ran=true;});
    await new Promise(resolve=>setTimeout(resolve,60));
    assert.equal(ran,false);assert.ok(probes>=3,'probed before and after acquire, then polled');assert.equal(fs.existsSync(file),false,'lock handed back on battery');
    assert.equal(logs.length,1);
    let cpu=false;await lock('cpu-build',async()=>{cpu=true;},{requireAc:false});assert.equal(cpu,true);
    ac=true;await pending;assert.equal(ran,true);assert.equal(fs.existsSync(file),false);
  }finally{fs.rmSync(directory,{recursive:true});}
});
test('a queued GPU caller re-checks power while another process holds the lock',async()=>{
  const {directory,file}=fixture();let ac=true,probes=0;
  const lock=_createGpuLock(file,{cooldownMs:0,retryMs:5,powerPollMs:20,powerProbe:async()=>{probes++;return {ac,detail:'fixture'};}});
  try{
    fs.writeFileSync(file,JSON.stringify({owner:'other',pid:process.pid,startTime:new Date().toISOString()}));
    let ran=false;const pending=lock('gpu-run',async()=>{ran=true;});
    await new Promise(resolve=>setTimeout(resolve,30));ac=false;
    fs.unlinkSync(file);await new Promise(resolve=>setTimeout(resolve,80));
    assert.equal(ran,false,'never runs after AC is lost while queued');
    ac=true;await pending;assert.equal(ran,true);assert.ok(probes>=3);
  }finally{fs.rmSync(directory,{recursive:true});}
});
test('a GPU turn holds keep-awake until release, after success or error; CPU turns take none',async()=>{
  const {directory,file}=fixture(),events=[];
  const lock=_createGpuLock(file,{cooldownMs:0,retryMs:5,powerProbe:onAc,keepAwake:()=>{events.push('hold');return {release:()=>events.push('release')};}});
  try{
    await lock('ok',async()=>events.push('run'));
    await assert.rejects(lock('fail',async()=>{events.push('run');throw new Error('fixture');}),/fixture/);
    await lock('cpu',async()=>events.push('cpu'),{requireAc:false});
    assert.deepEqual(events,['hold','run','release','hold','run','release','cpu']);
  }finally{fs.rmSync(directory,{recursive:true});}
});
test('the real keep-awake helper process exits when released',{skip:process.platform!=='win32'&&'Windows only'},async()=>{
  const hold=_keepAwake(),exited=new Promise(resolve=>hold.child.once('exit',resolve));
  await new Promise(resolve=>setTimeout(resolve,1500));assert.equal(hold.child.exitCode,null,'helper alive while held');
  hold.release();await exited;
  assert.throws(()=>process.kill(hold.pid,0),/ESRCH/);
});
test('the default power probe reports a state',async()=>{
  const {directory,file}=fixture(),seen=[];
  try{
    const lock=_createGpuLock(file,{cooldownMs:0,retryMs:5});
    await lock('cpu-only',async()=>seen.push('ran'),{requireAc:false});assert.deepEqual(seen,['ran']);
    const {_powerState}=require('../scripts/gpu-lock.cjs'),state=await _powerState();assert.equal(typeof state.ac,'boolean');assert.ok(state.detail.length>0);
  }finally{fs.rmSync(directory,{recursive:true});}
});

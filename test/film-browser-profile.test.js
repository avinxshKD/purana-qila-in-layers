import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
const source=fs.readFileSync(path.resolve('scripts/browser.cjs'),'utf8');
function harness(){
  const calls=[],directories=[],module={exports:{}},child=new EventEmitter();child.pid=12345;
  const browser=new EventEmitter();browser.process=()=>child;
  const context={module,__dirname:path.resolve('scripts'),process:{env:{}},console,
    require(name){
      if(name==='node:path')return path;
      if(name==='node:fs')return {existsSync:()=>true,mkdirSync:(folder,options)=>directories.push({folder,options})};
      if(name==='puppeteer-core')return {launch:async options=>{calls.push(options);return browser;}};
      throw new Error('Unexpected test import '+name);
    }};
  new vm.Script(source,{filename:'browser.cjs'}).runInContext(vm.createContext(context));
  return {launch:module.exports.launch,calls,directories};
}
test('shared browser default stays a fresh temporary profile and retains launch settings',async()=>{
  const h=harness();await h.launch();
  assert.equal(Object.hasOwn(h.calls[0],'userDataDir'),false);assert.equal(h.directories.length,0);
  assert.equal(h.calls[0].headless,true);assert.equal(h.calls[0].protocolTimeout,300000);assert.equal(h.calls[0].dumpio,false);
  assert.equal(h.calls[0].args.includes('--force-color-profile=srgb'),true);
  assert.equal(h.calls[0].args.includes('--use-angle=swiftshader'),false);
});
test('persistent profiles are opt-in and isolated by tool name',async()=>{
  const h=harness();await h.launch({profile:'museum',software:true});await h.launch({profile:'film'});
  assert.equal(h.calls[0].userDataDir,path.resolve('output/.edge-profiles/museum'));
  assert.equal(h.calls[1].userDataDir,path.resolve('output/.edge-profiles/film'));
  assert.notEqual(h.calls[0].userDataDir,h.calls[1].userDataDir);
  assert.equal(h.directories.length,2);assert.equal(h.directories[0].options.recursive,true);
  assert.equal(h.calls[0].args.includes('--use-angle=swiftshader'),true);
});
test('profile names cannot escape the owned directory or use Windows reserved names',async()=>{
  for(const profile of ['','../other','a/b','a\\b','C:\\other','.','..','UPPER','nul','com1',42,null]){
    const h=harness();await assert.rejects(h.launch({profile}),/safe lowercase tool slug/);
    assert.equal(h.calls.length,0);assert.equal(h.directories.length,0);
  }
});

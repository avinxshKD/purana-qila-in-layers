import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {auditSourceManifest} from '../scripts/film/audit-manifest.cjs';
test('CPU audit provenance tracks geometry/camera but excludes unrelated site and emphasis changes',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-audit-manifest-'));
  function write(file,body){const absolute=path.join(folder,file);fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,body);}
  try{
    for(const file of['src/eras/stack.js','src/film/camera.js','src/film/timeline.js','src/film/audit-geometry.js','src/film/emphasis.js','src/film/main.js','src/site/scene.js','src/museum-scene.js','reference/film-callouts.json'])write(file,'first');
    const original=auditSourceManifest(folder);assert.ok(original['src/eras/stack.js']);assert.ok(original['src/film/camera.js']);
    assert.equal(original['src/film/emphasis.js'],undefined);assert.equal(original['src/site/scene.js'],undefined);
    write('src/film/emphasis.js','second');write('src/site/scene.js','second');assert.deepEqual(auditSourceManifest(folder),original);
    write('src/eras/stack.js','second');assert.notDeepEqual(auditSourceManifest(folder),original);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

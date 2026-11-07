'use strict';
// Serves a frozen review build on 127.0.0.1 only, under the Pages project path, until stopped. With --manifest it
// refuses to start unless every file still matches the manifest (size and SHA-256), so the review sees the frozen build.
// Usage: node scripts/site/serve-review.cjs --dist output/site/deploy-dry-rc2d --manifest output/site/rc2d-manifest.json [--port 5190]
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{root}=require('../browser.cjs'),{serveDist,BASE}=require('./deploy-check.cjs');
const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
const dist=path.resolve(root,arg('--dist')),port=+arg('--port','5190'),manifestPath=arg('--manifest');
if(manifestPath){
  const manifest=JSON.parse(fs.readFileSync(path.resolve(root,manifestPath),'utf8')),bad=[];
  for(const e of manifest.entries){const p=path.join(dist,e.path);if(!fs.existsSync(p)){bad.push('missing '+e.path);continue;}const data=fs.readFileSync(p);if(data.length!==e.bytes||crypto.createHash('sha256').update(data).digest('hex')!==e.sha256)bad.push('changed '+e.path);}
  const count=[];const walk=d=>{for(const x of fs.readdirSync(d,{withFileTypes:true}))x.isDirectory()?walk(path.join(d,x.name)):count.push(x.name);};walk(dist);if(count.length!==manifest.entries.length)bad.push(`file count ${count.length} != ${manifest.entries.length}`);
  if(bad.length){console.error('Build differs from manifest: '+bad.slice(0,10).join('; '));process.exit(1);}
  console.log(`manifest ok: ${manifest.entries.length} files, tree ${manifest.treeSha256}`);
}
serveDist(dist,port).then(server=>console.log(`serving ${dist} at ${server.url}${BASE} (pid ${process.pid})`),e=>{console.error(e);process.exit(1);});

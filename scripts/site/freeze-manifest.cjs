'use strict';
// Manifest of a frozen review build: every file with size and SHA-256, sorted by path. Never overwrites.
// Usage: node scripts/site/freeze-manifest.cjs --dist output/site/deploy-dry-rc2d --out output/site/rc2d-manifest.json
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{root}=require('../browser.cjs');
const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
const dist=path.resolve(root,arg('--dist')),out=path.resolve(root,arg('--out'));
if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
const files=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push(p);}};walk(dist);
const entries=files.map(p=>{const data=fs.readFileSync(p);return {path:path.relative(dist,p).split(path.sep).join('/'),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const tree=crypto.createHash('sha256');for(const e of entries)tree.update(`${e.sha256}  ${e.path}\n`);
const manifest={build:path.relative(root,dist).split(path.sep).join('/'),createdAt:new Date().toISOString(),basePath:'/purana-qila-in-layers/',files:entries.length,totalBytes:entries.reduce((s,e)=>s+e.bytes,0),treeSha256:tree.digest('hex'),treeSha256Of:'sha256 of "<sha256>  <path>\\n" lines in path order',entries};
fs.writeFileSync(out,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({files:manifest.files,totalBytes:manifest.totalBytes,treeSha256:manifest.treeSha256}));

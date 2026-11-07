'use strict';
// Clean-clone check: clone the repository (or, before the first commit, copy exactly what `git add -A` would stage),
// install from package-lock.json with npm ci, build the site, and compare every built file with a frozen review
// manifest (path, size, SHA-256, tree hash). Read-only for the repository; never overwrites a work folder.
// Usage: node scripts/site/clean-clone-check.cjs --manifest output/site/rc3l-manifest.json --work output/site/clean-clone-rc3l
//        [--from git|worktree] [--ref HEAD]
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..','..');
function run(cmd,args,cwd,log){
  const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:1<<28,windowsHide:true});
  fs.appendFileSync(log,`\n$ ${cmd} ${args.join(' ')}\n${r.stdout??''}${r.stderr??''}exit ${r.status}\n`);
  if(r.status!==0)throw new Error(`${path.basename(cmd)} ${args.slice(0,2).join(' ')} failed (exit ${r.status}); see ${log}`);
  return r.stdout;
}
function hashTree(dir){
  const files=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push(p);}};walk(dir);
  const entries=files.map(p=>{const data=fs.readFileSync(p);return {path:path.relative(dir,p).split(path.sep).join('/'),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const tree=crypto.createHash('sha256');for(const e of entries)tree.update(`${e.sha256}  ${e.path}\n`);
  return {entries,treeSha256:tree.digest('hex')};
}
function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const manifestFile=path.resolve(root,arg('--manifest')),work=path.resolve(root,arg('--work')),from=arg('--from','git'),ref=arg('--ref','HEAD');
  if(!fs.existsSync(manifestFile))throw new Error('No manifest '+manifestFile);if(fs.existsSync(work))throw new Error('Preserve '+work);
  const npmCli=path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');if(!fs.existsSync(npmCli))throw new Error('No npm next to '+process.execPath);
  fs.mkdirSync(work,{recursive:true});const clone=path.join(work,'repo'),dist=path.join(work,'dist'),log=path.join(work,'clean-clone.log');fs.writeFileSync(log,'');
  let source;
  if(from==='git'){
    const commit=run('git',['-C',root,'rev-parse','--verify',ref+'^{commit}'],root,log).trim();
    run('git',['clone','--no-local','--no-checkout',root,clone],work,log);run('git',['-C',clone,'checkout','--detach',commit],work,log);
    source={from,ref,commit,files:run('git',['-C',clone,'ls-files'],work,log).split('\n').filter(Boolean).length};
  }else if(from==='worktree'){
    // Pre-commit rehearsal: tracked and untracked, not ignored, still present (what `git add -A` stages).
    const list=run('git',['-C',root,'ls-files','--cached','--others','--exclude-standard','-z'],root,log).split('\0').filter(Boolean).filter(f=>fs.existsSync(path.join(root,f)));
    for(const f of list){const to=path.join(clone,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,f),to);}
    source={from,files:list.length};
  }else throw new Error('--from must be git or worktree');
  run(process.execPath,[npmCli,'ci','--no-audit','--no-fund'],clone,log);
  run(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.site.config.js','--outDir',dist],clone,log);
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),built=hashTree(dist);
  const want=new Map(manifest.entries.map(e=>[e.path,e])),got=new Map(built.entries.map(e=>[e.path,e]));
  const missing=[...want.keys()].filter(p=>!got.has(p)),extra=[...got.keys()].filter(p=>!want.has(p));
  const changed=[...want.keys()].filter(p=>got.has(p)&&(got.get(p).sha256!==want.get(p).sha256||got.get(p).bytes!==want.get(p).bytes)).map(p=>({path:p,manifestBytes:want.get(p).bytes,builtBytes:got.get(p).bytes}));
  const report={manifest:path.relative(root,manifestFile).split(path.sep).join('/'),source,node:process.version,files:built.entries.length,manifestFiles:manifest.entries.length,treeSha256:built.treeSha256,manifestTreeSha256:manifest.treeSha256,missing,extra,changed};
  report.identical=!missing.length&&!extra.length&&!changed.length&&built.treeSha256===manifest.treeSha256;
  fs.writeFileSync(path.join(work,'clean-clone-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({identical:report.identical,source,files:report.files,treeSha256:report.treeSha256,manifestTreeSha256:report.manifestTreeSha256,missing:missing.length,extra:extra.length,changed:changed.slice(0,20)}));
  if(!report.identical)process.exitCode=1;
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}

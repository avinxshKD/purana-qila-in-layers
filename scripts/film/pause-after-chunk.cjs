'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {root}=require('../browser.cjs');
const folder=path.join(root,'output','film','f1','pinned-chunks'),pid=Number(process.argv[2]);
if(!Number.isInteger(pid)||pid<1)throw new Error('Supply this render driver PID');
fs.mkdirSync(folder,{recursive:true});
console.log('Waiting for the current encoded chunk to finish, then pausing only the owned render tree.');
const watch=fs.watch(folder,(_event,file)=>{
  if(!file||!/^part-\d+\.json$/.test(file))return;
  try{JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));}catch{return;}
  watch.close();
  const result=spawnSync('taskkill.exe',['/PID',String(pid),'/T','/F'],{encoding:'utf8'});
  console.log(result.stdout,result.stderr);
  fs.writeFileSync(path.join(root,'output','film','f1','paused.json'),JSON.stringify({at:new Date().toISOString(),afterChunk:file,ownedDriverPID:pid,status:result.status},null,2)+'\n');
  process.exitCode=result.status??1;
});

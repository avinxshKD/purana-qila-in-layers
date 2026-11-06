'use strict';
/**
 * Shared iGPU queue.
 *
 * const { withGpu } = require('./gpu-lock.cjs'); // adjust relative path
 * await withGpu('film:chunk-03', async () => { ...GPU work... });
 * await withGpu('site:build', async () => { ...CPU-only work... }, { requireAc: false });
 *
 * GPU work runs only on AC power (a machine without a battery counts as AC). On battery, withGpu waits before
 * acquiring, polling every 30 s and logging "waiting for AC" once. Power is probed again after the lock is acquired,
 * and the lock is handed back if the machine has gone on battery while queued, so fn never starts on battery.
 * While a GPU turn holds the lock, a helper process keeps the machine out of idle standby; it exits on release. CPU-only callers that hold the lock (builds,
 * test runs) opt out with { requireAc: false }; timing and capture runs keep the requirement.
 *
 * Keep a turn near two minutes. Only launch/close your own browser inside the turn.
 * The exclusive output/.gpu-lock records owner, PID and ISO start time.
 * Dead-owner or >10 minute locks are reclaimed. A process yields for three seconds
 * after release before it can acquire again. Exceptions always release ownership.
 * No lock is needed for DOM-only work or CPU-only encoding.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const LOCK=path.resolve(__dirname,'..','output','.gpu-lock');
const {execFile,spawn}=require('node:child_process');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Resolves {ac, detail}. A probe failure counts as not on AC, so GPU work never starts on an unknown power state.
function powerState(){
  if(process.platform!=='win32')return Promise.resolve({ac:true,detail:'non-Windows host: no power probe'});
  const command='Add-Type -AssemblyName System.Windows.Forms;$p=[System.Windows.Forms.SystemInformation]::PowerStatus;"$($p.PowerLineStatus)|$($p.BatteryChargeStatus)"';
  return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{timeout:20000,windowsHide:true},(error,stdout)=>{
    if(error){resolve({ac:false,detail:'power probe failed: '+error.message});return;}
    const [line='',charge='']=String(stdout).trim().split('|');
    resolve({ac:line==='Online'||/NoSystemBattery/.test(charge),detail:`PowerLineStatus ${line}, BatteryChargeStatus ${charge}`});
  }));
}
// Holds ES_CONTINUOUS|ES_SYSTEM_REQUIRED|ES_DISPLAY_REQUIRED in a helper process for the life of a GPU turn, so idle
// standby cannot kill a capture browser. The helper also exits within 5 s of this process dying. Lid-close still sleeps.
function keepAwake(){
  if(process.platform!=='win32')return {pid:null,release(){}};
  const script='$k=Add-Type -Name ExecutionState -Namespace StrataGpuLock -PassThru -MemberDefinition \'[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);\';'+
    `[void]$k::SetThreadExecutionState([uint32]2147483651);while(Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue){Start-Sleep -Seconds 5}`;
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:'ignore'});
  child.on('error',()=>{});
  return {pid:child.pid,child,release(){if(child.exitCode===null&&child.signalCode===null)child.kill();}};
}
function createGpuLock(file,{keepAwake:awake=keepAwake,cooldownMs=3000,retryMs=250,staleMs=600000,powerProbe=powerState,powerPollMs=30000,log=console.log}={}){
  let releasedAt=0;
  function pidIsAlive(pid){
    if(!Number.isInteger(pid)||pid<1)return false;
    try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}
  }
  function removeIfSame(contents){
    try{if(fs.readFileSync(file,'utf8')===contents)fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  async function waitForAc(owner,status){
    for(;;){const state=await powerProbe();if(state.ac)return;if(!status.logged){log(`[gpu-lock] ${owner}: waiting for AC (${state.detail})`);status.logged=true;}await delay(powerPollMs);}
  }
  async function withGpu(owner,fn,{requireAc=true}={}){
    if(typeof owner!=='string'||!owner.trim()||typeof fn!=='function')throw new TypeError('withGpu requires an owner and callback');
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const token=crypto.randomUUID(),status={logged:false};
    let record,handle;
    // The queue behind other holders can outlast AC, so power is probed again once the lock is held; on battery the
    // lock is handed back and the caller waits for AC again before re-queuing.
    for(;;){
      if(requireAc)await waitForAc(owner,status);
      if(!(await acquire()))continue;
      if(!requireAc)break;
      const state=await powerProbe();if(state.ac)break;
      removeIfSame(record);releasedAt=Date.now();
      if(!status.logged){log(`[gpu-lock] ${owner}: waiting for AC (${state.detail})`);status.logged=true;}
      await delay(powerPollMs);
    }
    const awakeHold=requireAc?awake():null;
    try{return await fn();}
    finally{awakeHold?.release();removeIfSame(record);releasedAt=Date.now();await delay(cooldownMs);}
    // Resolves true once the lock is held; false when a GPU caller has queued for powerPollMs, so power is checked again.
    async function acquire(){
      const queuedAt=Date.now();
      for(;;){
      const cooldown=cooldownMs-(Date.now()-releasedAt);if(cooldown>0)await delay(cooldown);
      record=JSON.stringify({owner,pid:process.pid,startTime:new Date().toISOString(),token});
      try{handle=fs.openSync(file,'wx');fs.writeFileSync(handle,record);fs.closeSync(handle);handle=undefined;return true;}
      catch(error){
        if(handle!==undefined){fs.closeSync(handle);handle=undefined;removeIfSame(record);throw error;}
        if(error.code!=='EEXIST')throw error;
        try{
          const contents=fs.readFileSync(file,'utf8');
          let lock;try{lock=JSON.parse(contents);}catch{}
          const since=lock?.startTime?Date.parse(lock.startTime):fs.statSync(file).mtimeMs;
          if((lock&&!pidIsAlive(lock.pid))||Date.now()-since>staleMs){removeIfSame(contents);continue;}
        }catch(readError){if(readError.code!=='ENOENT')throw readError;}
        await delay(retryMs);
        if(requireAc&&Date.now()-queuedAt>=powerPollMs)return false;
      }
      }
    }
  }
  return withGpu;
}
module.exports={withGpu:createGpuLock(LOCK),_createGpuLock:createGpuLock,_powerState:powerState,_keepAwake:keepAwake};

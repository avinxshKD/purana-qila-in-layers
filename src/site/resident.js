// Residency gate for lazily fetched step packs (backend contract v1.1). A resident state applies
// synchronously in the frame path. A non-resident one holds the previous state while it loads;
// only the latest request may apply. A failure waits for an explicit retry: there is no timer loop.
export const NOTE_DELAY_MS=150;
export function isNotResident(error){return error?.name==='SiteStateNotResident';}
export function createResidencyGate({isResident=()=>true,ensureState=()=>Promise.resolve(),onReady=()=>{},onNote=()=>{},noteDelayMs=NOTE_DELAY_MS,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let token=0,pendingKey=null,failed=null,timer=null,note=null;
  const keyOf=state=>JSON.stringify([state.deposits,state.features,state.excavation,state.eraIndex]);
  function setNote(next){if(next!==note){note=next;onNote(note,failed?.error??null);}}
  function stopTimer(){if(timer!==null){clearTimer(timer);timer=null;}}
  function settle(){stopTimer();pendingKey=null;}
  function check(state){
    if(isResident(state)){if(pendingKey!==null||failed){token++;settle();failed=null;setNote(null);}return true;}
    const key=keyOf(state);
    if(failed?.key===key||pendingKey===key)return false;
    const mine=++token;pendingKey=key;failed=null;
    if(note==='failed')setNote(null);
    if(timer===null&&note!=='loading')timer=setTimer(()=>{timer=null;if(pendingKey!==null)setNote('loading');},noteDelayMs);
    Promise.resolve().then(()=>ensureState(structuredClone(state))).then(()=>{
      if(mine!==token)return;settle();setNote(null);onReady();
    },error=>{
      if(mine!==token)return;settle();failed={key,error};setNote('failed');
    });
    return false;
  }
  return {check,
    retry(){if(!failed)return false;failed=null;setNote(null);onReady();return true;},
    metadata:()=>({pending:pendingKey!==null,note,failed:failed?{pack:failed.error?.pack??null,message:String(failed.error?.message??failed.error)}:null,requests:token})};
}

param([int]$BrowserPID,[switch]$Normalize)
if($Normalize){
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FilmPriorityNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct Power { public uint Version; public uint ControlMask; public uint StateMask; }
  [DllImport("kernel32.dll",SetLastError=true)]
  public static extern bool SetProcessInformation(IntPtr process,int informationClass,ref Power state,uint size);
  [DllImport("kernel32.dll",SetLastError=true)]
  public static extern bool GetProcessInformation(IntPtr process,int informationClass,ref Power state,uint size);
}
'@
}
$rows = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe' AND ParentProcessId=$BrowserPID" | Where-Object { $_.CommandLine -match '--type=renderer' } | ForEach-Object {
  try {
    $process = Get-Process -Id $_.ProcessId -ErrorAction Stop
    $before=[string]$process.PriorityClass
    $ok=$null;$control=$null;$stateMask=$null
    if($Normalize){
      $process.PriorityClass=[Diagnostics.ProcessPriorityClass]::Normal
      $state=New-Object FilmPriorityNative+Power
      $state.Version=1;$state.ControlMask=1;$state.StateMask=0
      $ok=[FilmPriorityNative]::SetProcessInformation($process.Handle,4,[ref]$state,12)
      if(!$ok){throw "SetProcessInformation error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
      $read=New-Object FilmPriorityNative+Power;$read.Version=1
      if(![FilmPriorityNative]::GetProcessInformation($process.Handle,4,[ref]$read,12)){throw 'GetProcessInformation failed'}
      $control=$read.ControlMask;$stateMask=$read.StateMask
    }
    [pscustomobject]@{rendererPID=$_.ProcessId; previousPriority=$before; priorityClass=[string]$process.PriorityClass; basePriority=$process.BasePriority; ecoQoSDisabled=$ok; controlMask=$control; stateMask=$stateMask}
    $process.Dispose()
  } catch { [pscustomobject]@{rendererPID=$_.ProcessId;error=$_.Exception.Message} }
})
ConvertTo-Json -InputObject $rows -Compress

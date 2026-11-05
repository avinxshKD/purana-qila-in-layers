// Film-only calibration. The generic emphasis module has no scene/material imports.
// F3 default: M2b ten-era native-1080 review (output/film/emphasis-m2b-r1, snapshot 09560e3c…),
// paired with the M2b-baked fields (film-emphasis-m2b manifest a5dea642…). All ten eras pass,
// including the ring well and the open drain channel.
export const CALIBRATION_STATUS='m2b-ten-era, ring and drain calibrated';
export const CALLOUT_POWERS=Object.freeze({
  'pre-pgw':7877.684183918016,'pre-soil':8979.895581912164,'maur-rings':3985.876317235875,'maur-drain':4860.732469236813,
  'sunga-wall':5909.603787417596,'sunga-patches':6387.24703278821,'kushan-rooms':6719.413882517055,'kushan-brick':5184.496470667498,
  'gupta-floors':6675.366509675166,'gupta-wall':1170.3947185286065,'post-ns':5989.344998975765,'post-ew':7430.686517234645,
  'rajput-width':7671.1202379319175,'rajput-holes':847.097176594061,'sultanate-corner':3144.4416936725065,'sultanate-floor':5175.710631389879,
  'mughal-porcelain':9631.453960159757,'mughal-glass':10475.404468433448,'modern-1948':5694.696661423665,'modern-1955':14235.070031945937
});
// Earlier review values, kept for provenance: r2b r5 + r6 (ring unlit) and M2a ten-era.
export const R2B_CALLOUT_POWERS=Object.freeze({
  'pre-pgw':7877.684183918016,'pre-soil':8979.895581912164,'maur-rings':0,'maur-drain':5520.237686077203,
  'sunga-wall':5909.603787417596,'sunga-patches':7739.886222325687,'kushan-rooms':6714.589106299321,'kushan-brick':5184.496470667498,
  'gupta-floors':6952.087180481976,'gupta-wall':1204.0251712109468,'post-ns':5989.344998975765,'post-ew':7430.686517234645,
  'rajput-width':7779.633546857067,'rajput-holes':738.8530079417166,'sultanate-corner':2143.0938107854504,'sultanate-floor':6635.297295742721,
  'mughal-porcelain':10340.692416651042,'mughal-glass':10433.198106740001,'modern-1948':5706.377186370766,'modern-1955':14235.070031945937
});
// M2a ten-era native-1080 review (output/film/emphasis-m2a-r1, snapshot de3660cb…, pack-report d8e34ee9…),
// paired with the M2a-baked fields (film-emphasis-m2a manifest a8dd31f5…). Includes the first calibrated ring.
// Superseded by the M2b default above.
export const M2A_CALIBRATION_STATUS='m2a-ten-era, ring calibrated, drain pending M2b';
export const M2A_CALLOUT_POWERS=Object.freeze({
  'pre-pgw':7877.684183918016,'pre-soil':8979.895581912164,'maur-rings':4768.65433947115,'maur-drain':2881.7314040601605,
  'sunga-wall':5909.603787417596,'sunga-patches':6387.24703278821,'kushan-rooms':6719.413882517055,'kushan-brick':5184.496470667498,
  'gupta-floors':6675.366509675166,'gupta-wall':1170.3947185286065,'post-ns':5989.344998975765,'post-ew':7430.686517234645,
  'rajput-width':7671.1202379319175,'rajput-holes':847.097176594061,'sultanate-corner':3144.4416936725065,'sultanate-floor':5175.710631389879,
  'mughal-porcelain':9834.992440450142,'mughal-glass':10669.936836642632,'modern-1948':5694.696661423665,'modern-1955':14235.070031945937
});

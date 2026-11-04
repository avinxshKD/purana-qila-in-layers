'use strict';
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs');
const out=path.resolve(process.argv[2]||path.join(root,'output/film/f2/emphasis-r1')),data=JSON.parse(fs.readFileSync(path.join(out,'results.json'))),report=path.join(out,'review.md');
if(fs.existsSync(report))throw new Error('Preserve completed emphasis review');
const controls=new Map(data.phases.control.cases.map(row=>[row.id,row]));
const f=n=>Number(n).toFixed(2);
const rows=data.phases.prototype.cases;
const areaLights=rows.some(r=>r.lights.some(light=>light.type==='RectAreaLight'));
const mapped=rows.some(r=>r.lights.some(light=>light.mapSize)),quantified=rows.every(r=>r.coverageWithin30Percent!==undefined);
const describe=values=>{if(!values.length)return 'no unobscured soil samples';const a=[...values].sort((a,b)=>a-b);return `${f(a[Math.floor(a.length/2)])} (${f(a[0])}–${f(a.at(-1))}; n=${a.length})`;};
const lines=['# Optional callout emphasis, frozen r2 prototype','',
  'Separate copy only. The accepted r2 and its source are unchanged. This is not a full render or approval to enable the effect in the film.','',
  '## Construction','',
  areaLights?'- Two permanent neutral-white rectangular area lights, present before the first frame, including when intensity is zero. Neither visibility nor scene membership changes.':'- Two permanent neutral-white spotlights, present before the first frame, including when intensity is zero. Neither visibility nor scene membership changes.',
  areaLights?'- One light per callout slot, maximum two. Intensity equals configured luminance × callout opacity. RectAreaLights cast no shadows. LTC uniforms are initialized before the first frame.':'- One light per callout slot, maximum two. Intensity equals configured power × callout opacity. Shadow casting is disabled; penumbra is 0.5.',
  areaLights?'- Field dimensions/orientation follow real revealed geometry, with a 0.35 m emitter margin beyond the oriented footprint. No feature scale, geometry, materials, colour/emissive shader, archaeological outline or post-process glow changes.':mapped?'- Spotlights originate at the film camera for the tested midpoint. Permanent grayscale light cookies cover the actual projected visible-geometry footprint, fading over 0.5 m outside its ground projection. Light and map counts stay constant. This is projected illumination, not a post-process mask, object outline or glow. No feature scale, geometry, material or emissive changes.':'- Lights point at actual M1 feature areas from a fixed local overhead/front offset. No feature scale, geometry, materials, colour/emissive shader, outline or post-process glow changes.',
  '- The zero-added-light control is a separate page mode, selected before its first frame. The prototype also measures two permanent zero-intensity lights, then active lights, without changing light count.','',
  '## Native 1080 brightness','',
  data.measurement,'',
  '| Feature | Midpoint | Visible feature pixels | Mean L*, idle → lit | ΔL* | Gate 8–12 | Power |',
  '|---|---:|---:|---:|---:|---|---:|',
  ...rows.map(r=>`| ${r.id} | ${r.seconds.toFixed(2)}s | ${r.maskPixels} | ${f(r.baselineMeanL)} → ${f(r.emphasisMeanL)} | +${f(r.deltaL)} | ${r.deltaL>=8&&r.deltaL<=12?'PASS':'FAIL'} | ${f(r.powerLuminance??r.powerCandela)} ${areaLights?'cd/m²':'cd'} |`),'',
  'The mean covers the whole visible feature ID mask, not a selected bright pixel. Occluded feature triangles and the HUD are excluded. The independent mask uses the validated CPU displacement, not the original undisplaced soil geometry. It does not alter the presentation scene.','',
  '## Frame cost and shader stability','',
  data.timingMethod+'. Ten measured draws per condition after a warm draw. Separate control/prototype browser turns are not a controlled thermal or GPU-only benchmark.','',
  '| Feature | Original, 0 spots | Prototype, 2 idle spots | Prototype, 2 active spots | Active − original | Programs, original / idle / active | Compile / link on activation |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...rows.map(r=>{const c=controls.get(r.id);return `| ${r.id} | ${f(c.timing.completionMedianMs)}ms | ${f(r.idleTiming.completionMedianMs)}ms | ${f(r.timing.completionMedianMs)}ms | ${f(r.timing.completionMedianMs-c.timing.completionMedianMs)}ms | ${c.timing.programCount} / ${r.idleTiming.programCount} / ${r.timing.programCount} | ${r.shaderStability.compileCalls} / ${r.shaderStability.linkCalls} |`;}),
  '',
  '| Feature | Submit median, original / idle / active | Idle vs original pixels / maximum RGB code delta |',
  '|---|---:|---:|',
  ...rows.map(r=>`| ${r.id} | ${f(controls.get(r.id).timing.submitMedianMs)} / ${f(r.idleTiming.submitMedianMs)} / ${f(r.timing.submitMedianMs)}ms | ${r.idleVsNoSpotlights.changedPixels} / ${r.idleVsNoSpotlights.maxCodeValueDelta} |`),'',
  'Program counts refer to the warmed presentation renderer. Measurement-mask materials are disposed before the activation test. Raw timing samples, light poses/intensities and program ID sets are in `results.json`. Compile/link counters cover idle-to-active switching at fixed geometry, not unrelated first-time era/material warming.','',
  '## Brightness distribution','',
  '| Feature | ΔL* p10 / p50 / p90 / p99 / maximum |',
  '|---|---:|',
  ...rows.map(r=>`| ${r.id} | ${[10,50,90,99,100].map(p=>f(r.deltaLPercentiles['p'+p])).join(' / ')} |`),'',
  ...(quantified?['## Coverage, clipping and metric falloff','',
    '| Feature | Pixels within ±30% of mean, ≥80% | Feature L* p99 / maximum | Pool L* p99 / maximum | Pool pixels with any channel 255 |',
    '|---|---:|---:|---:|---:|',
    ...rows.map(r=>`| ${r.id} | ${f(r.coverageWithin30Percent*100)}% (${r.coverageWithin30Percent>=.8?'PASS':'FAIL'}) | ${f(r.clipping.featureP99L)} / ${f(r.clipping.featureMaximumL)} | ${f(r.clipping.poolP99L)} / ${f(r.clipping.poolMaximumL)} | ${r.clipping.poolClippedPixels} |`),'',
    'Pool means scene-only pixels with ΔL*>0.25. Feature and pool maximum L* must remain below 85, and the pool must contain no channel at 255.','',
    '| Feature | Soil ΔL*, 0.5 m outside edge: median (range; count) | Soil ΔL*, 1 m outside edge: median (range; count) |',
    '|---|---:|---:|',
    ...rows.map(r=>`| ${r.id} | ${describe(r.falloff.filter(s=>s.visible&&s.outsideMetres===.5).map(s=>s.deltaL))} | ${describe(r.falloff.filter(s=>s.visible&&s.outsideMetres===1).map(s=>s.deltaL))} |`),'',
    'Metric samples lie 0.5 m and 1 m beyond each edge of the oriented footprint of the actual visible/revealed kit geometry. Camera rays retain only unobscured soil-top samples; out-of-block or feature-occluded points are excluded, not silently treated as dark. Each value is the median of a native-1080 3×3 pixel patch. Both active callout lights remain enabled, so overlapping fields can affect these measurements. All world/pixel coordinates, rejected samples and values are retained in `results.json` and `falloff-samples.csv`.','']:[]),
  'The narrower first experiment is preserved in `../emphasis-r1/` and visually rejected: its mean concealed clipped white pools. This revision spreads a lower-strength field across each feature footprint; no local bright pixels are selected for calibration.','',
  '## Four stills','',
  ...rows.flatMap(r=>[`### ${r.id}`,`[Without](stills/${r.id}-without.png) · [With](stills/${r.id}-with.png) · [feature mask](${r.id}-feature-mask.png)`,'',`![Without, nearest-neighbour 3× crop](${r.id}-without-crop.png)`,`![With, nearest-neighbour 3× crop](${r.id}-with-crop.png)`,'']),
  '## Scope and validation','',
  `- Snapshot SHA256: \`${data.snapshotSHA256}\`.`,
  `- GPU turns: ${[...data.phases.control.turns||[{id:'control',seconds:data.phases.control.turnSeconds}],...data.phases.prototype.turns||[{id:'prototype',seconds:data.phases.prototype.turnSeconds}]].map(turn=>turn.id+' '+f(turn.seconds)+'s').join('; ')}. Each used the shared GPU lock and closed its own browser.`,
  `- Permanent-light/opacity, non-mutating measurement proxy, oriented-footprint and camera-origin tests: ${mapped?5:4} passed.`,
  '- Camera/audit focused tests: 11 passed, including actual M1 plinth margin across all 1800 frames.',
  '- Earlier complete serial suite: 152 passed, 0 failed, 1 guarded GPU skip. No final film render was run.',
  '- These stills use the r2 geometry with its known anchor failures and geometry streaks. They do not replace corrected-M1 r2b look acceptance, fresh all-frame audits, final render quality review or final persistent-profile pixel proof.',''];
fs.writeFileSync(report,lines.join('\n')+'\n');
if(quantified){const csv=['feature,axis,side,along,outside_metres,world_x,world_y,world_z,pixel_x,pixel_y,visible_soil,first_role,delta_l'];for(const r of rows)for(const s of r.falloff)csv.push([r.id,s.axis,s.side,s.along,s.outsideMetres,...s.world,s.pixel.x,s.pixel.y,s.visible,s.firstRole??'',s.deltaL??''].join(','));fs.writeFileSync(path.join(out,'falloff-samples.csv'),csv.join('\n')+'\n');}
fs.writeFileSync(path.join(out,'review.html'),`<!doctype html><meta charset="utf-8"><title>Optional callout emphasis</title><style>body{background:#191b1c;color:#eee4d2;font:16px sans-serif;margin:24px}section{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%}figure{margin:0}p{max-width:80ch}</style><h1>Optional neutral callout emphasis</h1><p>Separate frozen r2 copy. Two permanent shadowless white spotlights. No scale/geometry/colour/outline/glow changes. <a href="review.md">Measurements and limitations</a> · <a href="results.json">Raw measurements</a>.</p>${rows.map(r=>`<h2>${r.id}, ${r.seconds.toFixed(2)}s, ΔL* +${f(r.deltaL)}</h2><section>${['without','with'].map(mode=>`<figure><a href="stills/${r.id}-${mode}.png"><img src="stills/${r.id}-${mode}.png"></a><figcaption>${mode}</figcaption><img src="${r.id}-${mode}-crop.png"></figure>`).join('')}</section>`).join('')}`);
console.log(report);

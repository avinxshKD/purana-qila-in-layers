# CPU M1 anchor audit

From the repository root:

```powershell
& '.\tools\node-v24.22.1-win-x64\node.exe' scripts/film/anchor-audit.cjs --below-normal --out 'output/film/f2/anchor-audit-m1-working-r1'
```

Uses the **current working tree**, not a frozen browser bundle. Start a new Node process and choose a new output folder for each revision. No browser, renderer, canvas, Vite server, HTTP port or WebGL context is created. `--below-normal` lowers this one process's scheduling priority.

The default checks frames 0–1799 at 30 fps. Every callout with opacity greater than zero gets its actual M1 returned anchor, film camera, visible kit/ring/soil/plinth/scale geometry and validated CPU-displaced soil positions. Rays stop 0.1 mm before the anchor. Materials, clipping planes, inherited visibility and material sides are respected. Nothing in the rendered scene is changed.

Outputs:

- `summary.json`: per-ID sample/occluded/missing/off-frame counts and frame lists, first failure with semantic blocker feature/part/scene path, camera-to-blocker distance and distance before the anchor.
- `samples.json`: all nonzero-opacity samples, with the first blocker and distances for every occluded ray.
- `per-id.csv`: compact per-ID counts and first-failure blocker gap.
- Source hashes and a consistency flag. A source change during the audit fails the command.

A missing anchor is **not** counted as a projected off-frame point. Exit zero means the audit completed, not that all anchors passed. Acceptance still requires every missing/occluded/off-frame count to be zero. The reported plinth margin is not a substitute for the complete r2b scene/HUD/framing audit.

Optional `--root <source-tree>` selects another source tree. `--frames 406,511` is a diagnostic subset, never a full audit. `--compare <frame-metrics.json>` additionally performs strict comparison to a browser preflight, including exact returned points and first-blocker distances.

## Frozen r2 validation

`output/film/f2/cpu-audit-equivalence-r2/` checked all 1800 frames, 1530 active anchor samples. Every per-frame visibility classification matches the frozen r2 browser audit: **561 occluded, 4 missing, 0 provided points outside the frame**. The frozen browser report also flags its four missing anchors as off-frame; this CLI deliberately keeps the categories separate. Plinth margin matches exactly: 3.984331541966052%.

Strict numerical parity is **not** claimed. `gupta-floors` frames 757–758 returned different points in native Node and the frozen browser path. Their first-blocker distances differ by 0.0969186818 m and 0.8588704322 m respectively, although both remain occluded. The other 1528 returned-anchor samples match. The strict comparator correctly returned a failure and preserved all evidence. The source stayed unchanged. The reason for the two selector differences is not established.

The accepted frozen r2 source and outputs are unchanged.

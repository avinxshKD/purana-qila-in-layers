# Dedicated F2 delivery path

F1's `capture.cjs`, `render.cjs` and accepted outputs stay untouched. The F2
engine serves a frozen bundle on5188 with explicit `backend=m1`; mismatched,
provisional or missing backend/CPU-displacement data fails closed. Production
film imports no optional emphasis.

## Authorization and fresh r2b

Wait for corrected M1 delivery. Do not run GPU work until the orchestrator
explicitly authorizes it. A fresh candidate uses a new folder, for example:

```powershell
& '.\tools\node-v24.22.1-win-x64\node.exe' scripts/film/prepare-preflight.cjs --backend m1 --revision r2b --scene-source . --out output/film/f2/preflight-m1-r2b
```

Preparation is CPU-only. The separately authorized `preflight.cjs --backend m1
--revision r2b --out <candidate>` performs17 stills and1800 fresh audits;
`preflight-review.cjs <candidate>` writes a non-overwriting candidate review.
Derived reports normalize frame integers and distinguish missing anchors from
provided-but-off-frame anchors. Raw evidence is not rewritten. Candidate
metadata never grants look acceptance or full-render authorization.

## Prepare, prove and capture

After r2b passes, file-only preparation pins its source and compiled bundle:

```powershell
& '.\tools\node-v24.22.1-win-x64\node.exe' scripts/film/f2-render.cjs --preflight output/film/f2/preflight-m1-r2b --out output/film/f2/rough-r1
```

Only **after acceptance and explicit full-render authorization**, add `--render`.
`--render --proof-only` stops after the two proof turns. The CPU-backed Canvas2D
capture protocol requests `willReadFrequently`, awaits fonts and primes300/1530/0
before recording. Fresh/profile turns record three consecutive300s,1530, reset0,
then repeat300/1530. Exact RGBA hashes must match; no HUD tolerance is used.

Capture uses40×45-frame chunks, each with a110s deadline, native1920×1080 MSAA
readback and RGBA→FFV1 level3/bgra. Vertical orientation changes exactly once.
FFV1 preserves every RGBA byte, including alpha. Failed partial chunks move to
`failed-attempts/`; completed chunks are hash-checked rather than overwritten.
`render-control.json` with `{"paused":true}` pauses between chunks.

Each captured frame rechecks backend, geometry, anchors,4% framing,24px HUD and
scale reservations,6px glyph gap and400px leader limits. Captured and
FFV1-decoded frames300/1530 must also match the proof exactly.

## CPU review and one final encode

The controller CPU-decodes every chunk seam and compares its RGB difference to
the immediate motion neighbours. A seam above1.5× needs an evidence-backed
explanation in `seam-review.json`:

```json
{"snapshotSHA256":"<frozen hash>","reviewed":true,"explanations":{"45":"<specific reviewed evidence>"}}
```

A coincident timeline event is context, not automatic approval. Lossless chunks
join without re-encoding into `picture-lossless.mkv`;1800 frames and60.000s are
verified. `lossless-master.json` reports chunk/master bytes and the14,929,920,000
byte native-RGBA equivalent. File hashing is streamed, including masters over2GB.

`quality/review.html` compares three90-frame CPU candidates: CRF16 baseline,
CRF16/AQ3, and CRF14/AQ3/tune-grain. All use the exact final color/conversion path.
Review decoded6× background crops for retained dither versus contour rings,
considering sizes. Numeric grain retention is supporting evidence, not a visual
acceptance gate. No quality choice is inferred from the encoder unit test.

Resume with `--render --encode-quality grain14` (or another reviewed profile) to
perform the one full H.264 High/BT.709/yuv420p encode and mux the verified locked
score from sample zero. The user deliverable is **`strata-f2.mp4` only**,
1920×1080/30fps,1800 frames,60.000s, AAC-LC48kHz stereo. Other MP4s are internal
quality/picture intermediates. `final-dark-check/` compares source and final
decoded6× crops at0,45,300,1530,1799; inspect these before delivery acceptance.
`delivery-report.json` records settings, sizes, hashes, proof, seams and checks.

The first CRF14 final failed frame0 visual QC despite the frame45 selection.
Keep that evidence. An explicitly authorized replacement uses `f2-reencode.cjs
--out <delivery> --candidate <reviewed-candidate.json>`, a CPU-only path with no
capture/browser calls. It verifies the unchanged master, proof and all chunks,
archives rejected outputs and uses the exact reviewed candidate conversion.
The selected error-diffused zscale path leaves RGB transfer codes unchanged,
converts matrix/range to8-bit yuv420p, and uses High/AQ3/grain with I:P/B:P1.0.
The orchestrator raised the rough-delivery cap to110,000,000bytes; the unchanged
CRF10 zscale final is101,784,097bytes. Inspect an actual probed P-frame, not only frame45
(which is B in the selected clip). Only then create `visual-dark-review.json`
and run `f2-delivery-pack.cjs --out <delivery> --first-attempt <initial-folder>`.

## CPU checks

```powershell
& '.\tools\node-v24.22.1-win-x64\node.exe' --test --test-concurrency=1 test/film-f2-contract.test.js test/film-f2-preparation.test.js test/film-f2-media.test.js test/film-f2-seams.test.js test/film-lossless.test.js test/film-encode.test.js test/film-review-pack.test.js
```

The media integration test uses synthetic native1080p data, no browser or GPU.
It covers FFV1 orientation/concat, decoded seams and pixel proof, all three
quality candidates, actual locked-score mux and final decoded-background crops.
It is guarded when the local locked score artifact is absent.

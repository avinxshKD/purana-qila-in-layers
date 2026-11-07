# Development notes

These are the working notes from the project's early rounds. The public site is described in [README.md](../README.md). The Round 4–6 capture scripts (`scripts/round4*`, `round5*`, `round6*` except `round6-checks.cjs` and `round6-stage-a2.cjs`) are kept out of the repository, so the commands below that use them only run in the original working copy.

Local only:

- `npm run lookdev` reads `output/review/look-stats/` (not tracked) and needs ffmpeg in `tools/ffmpeg/bin/`.
- `npm run tech-test` needs ffmpeg in `tools/ffmpeg/bin/` (`tools/` is not tracked).

The project started as an isolated Three.js test for a scrubbable cut-away diorama. Geometry is schematic, not registered archaeology. Approved period names/date ranges are used only for the current type tests.

## Local tools

PowerShell, from the project directory:

```powershell
$env:PATH="$PWD\tools\node-v24.22.1-win-x64;$env:PATH"
npm install
npm run dev
```

Open the printed localhost URL. The year and seconds sliders independently control the scene. `Play motion` advances only seconds. Geometry is evaluated from year and seconds, never integrated from its previous frame.

```powershell
npm test
npm run build
npm run bench
```

`bench` serves the same page locally without opening a browser. Open it yourself and press `Measure 600 frames` for a headed measurement. The internal canvas is 1920×1080 at device pixel ratio 1. `?live` disables drawing-buffer preservation to match the measured live path. `?aa=off` disables MSAA. The default enables it.

## Reproduce the tech test

```powershell
npm run tech-test
```

The capture script launches headless Edge, never a headed browser, and serves only on loopback. `BROWSER_PATH` overrides its executable. Output goes to `output/tech-test/`, which is ignored by git.

- `overview.png`: the placeholder scene.
- `transition-strip.png`: six placeholder years, left to right in the order recorded in metrics.
- `aa-crops.png`: 1:1 output-pixel crops, no MSAA / MSAA / 2160p downscaled.
- `metrics.json`: configuration, environment, timings, hashes, raw samples, encoded-video probes and failures.
- `RESULTS.md`: interpretation and recommendations.
- `API-FACTS.md` in the repository root: installed-source API references.

Timed capture uses binary loopback HTTP. PNG data is written to individual files then encoded. Raw `gl.readPixels` RGBA goes directly to ffmpeg stdin, with backpressure. Both videos use the same frame sequence and encoder settings. For raw capture ffmpeg flips bottom-up pixels before color conversion. There is no audio.

MSAA and supersampling timing explicitly completes GPU work with `gl.finish`; requestAnimationFrame testing does not stall the GPU. They answer different questions. Headless live numbers are approximate. Repeated instance stress tiers are a deliberately overlapping workload, not a universal scene-complexity limit.

Scene, scripts and tool paths derive from the project root, so renaming the directory does not break them. `tools`, `node_modules`, `output` and `dist` are not tracked, and only the data files under `reference/` that the code reads are tracked.

## Placeholder look development

Open `/?lookdev` on the local server. Round 4 retains the dark museum set, but uses warm unequal soil bands, a near-planar slope, textured cuts and a filled ring stack. No ghost, tray, pit/tunnel or roofs appear. `view=trench` shows the stepped row; `view=cut` shows the sliced stack. `view=turntable` maps seconds to a centred 60-degree, 12-second sine-eased arc. The default page without `lookdev` remains the original tech-test fixture.

Type B is final: Source Serif 4 Semibold title, Source Sans 3 Semibold everything else. Names render without numeral features; only digit runs select the separate tnum/lnum face. `era=pre-mauryan` and `era=sunga` remain title/range tests. Required local OFL font files, licences, pinned URLs and hashes are in `public/fonts/`.

Film has one lower-left era title/timeline and one in-scene callout. Live has a smaller callout of at least 14 CSS-pixel cap height. Clicking **Sample A** opens `demo:layer-01`, still an explicit placeholder, not a claimed find location. Add `capture` for film-sized labels; otherwise the page uses live labels.

```powershell
node scripts/round4.cjs
```

Current outputs are saved incrementally in `output/lookdev/round4/`, preserving Round 3. `--stills-only` skips determinism and film; `--no-film` skips only film; `--film-only` resumes from existing metrics. `--verify-only` checks the current turntable at native MSAA on/off and film 2160p plus live labels; `--contact-only` updates the eight angles. Masters use 2160p without MSAA, Lanczos to 1080p. Film is 360 frames, 12 seconds, 30 fps, H.264/BT.709/yuv420p without audio. Eight angles at 45-degree steps use the same 74 m distance/27° elevation as the limited film arc. The capture server disables HMR to prevent navigation mid-frame. `node scripts/lookdev-results.cjs` verifies the encoded format/framing and writes the numbered notes. The old `scripts/museum.cjs` reproduces an obsolete capture layout and must not be used for current measurements.

The table in `src/layers.js` is exported to `output/lookdev/round4/layer-table.json`: colors, seeded material settings, tapered lenses, inclusion support and boundary samples. Trenches, two brick sections, a 0.09 m lime floor and the filled well construction cut subtract real geometry. All dimensions/placements not explicitly sourced are recorded as modelling assumptions.

The block has a 24×16 m footprint and a nominal 5 m one-way slope, with low relief. Its base extends 1.5 m below the lowest ring and only that extra zone fades into the plinth tone. The exported metrics report the current height. Four 4 m squares, 1 m baulks following the slope and stepped floors are schematic. No wall is traced from a plan; no place name, map or north arrow appears.

The well retains the approved approximate 0.70 m diameter, 18 rings, 0.15 m ring height and 2.20 m span. Nested pitch is `(2.20−0.15)/17`; wall thickness 0.04 m, irregular offsets, tilts, chips, cracks, backfill and placement are modelling assumptions. The source does not give wall thickness. Palette colors are look targets, not calibrated archaeology. The proportional timeline preserves the hatched 1500–1600 gap.

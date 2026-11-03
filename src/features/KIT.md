# Feature kit contract, K0

All geometry is deterministic and in **metres**, `y` up; footprint pairs are `[x,z]`.
The scene integrator owns placement, world transforms, burial by deposit, and camera visibility.
No feature silently changes scale to improve readability.

```js
import { buildFeature, buildEraFeature, fig13Specs } from './features/index.js';
const h = buildFeature({
  id: 'example', kind: 'brick-wall', footprint: [[0,0],[2,0],[2,.5],[0,.5]],
  base: 0, courses: 3, material: 'fired-brick', seed: 41
}, { outputScale: 1 });
scene.add(h.object);                 // THREE.Group; transform this group only
h.setReveal(.5);
h.setCuts({
  keep: [{ normal: [1,0,0], constant: 0 }],
  trenches: [{
    planes: [/* inward half-spaces defining a convex removed volume */],
    finalFloor: -.3
  }]
});
```

## Handle

- `object`: `THREE.Group`, containing at most two opaque merged meshes.
- `courseCount`: number of reveal tiers (wall courses; floor first for composite features).
- `setReveal(f)`: clamps to `[0,1]`; 0 shows nothing, otherwise `ceil(f*courseCount)` whole tiers.
  No random draws, allocation, geometry rebuild, or transforms. Updating draw ranges is cheap every frame.
- `anchors`: object keyed by feature id. Each entry has `point:[x,y,z]`, `normal:[x,y,z]`,
  and `visible:boolean`, all **feature-local**. The point is on an actual currently revealed triangle.
  Transform point by `object.matrixWorld`, normal by its normal matrix. Hidden features have `visible:false`.
- `bounds`: `THREE.Box3` for all surviving geometry after the current cuts, before reveal.
- `stats`: triangles, draw calls (colour pass, not shadow-pass cost), unit count, and per-unit Lab colours.
- `setCuts({keep=[],trenches=[]})`: exact CPU clipping with capped sections; call when the cut step changes,
  **not** every render. Identical inputs are a no-op. Cuts are always rebuilt from immutable originals,
  never from the previous cut state. Calling A, B, A restores A exactly.
  A four-state LRU uses a canonical, stable FNV-1a spec hash with full-signature collision checks;
  a hit swaps cached capped geometry without rebuilding. `stats.cacheBytes` and `cacheStateBytes`
  report exact retained vertex-buffer bytes (JS object overhead and immutable originals excluded).
- `warmCuts(spec)`: computes/stores a capped cut state in that same LRU without changing the
  displayed geometry buffers, draw ranges, bounds, anchors or any `stats` fields. Returns elapsed
  CPU milliseconds. A later `setCuts(spec)` is a cache hit while retained. The displayed cut spec
  is pinned and never evicted; the remaining three slots are LRU. `stats` cache counters refresh
  on `setCuts`, not `warmCuts`, so warming is observationally inert. Display one of the site's
  four canonical excavation states before warming the other three.
- `dispose()`: release owned buffers and materials; caller removes the group from the scene.

`ctx.outputScale` defaults to 1 and is render height / 1080. It only controls the material's
screen-space octave filtering, never positions, unit count, topology, cutting or reveal.
Geometry is byte-identical at every output size. No DOM is needed to build features.
The optional era adapter `buildEraFeature(id, overrides={},ctx={})` supplies documented low schematic
dimensions where the pack is null. `fig13Specs()` returns the 24 exact traced footprints as specs,
mapping page-right x to local x and page-down y to local z; no geographic orientation is implied.

## Specs

Common fields: `id`, `kind`, `footprint` (simple polygon, optional repeated endpoint) **or**
`polyline` plus `width`, `base`, `height` or integer `courses`, `material`, integer/string `seed`.
All unspecified dimensions and course counts below are M (modelling decisions), not excavated measurements.

| Kind | Additional fields / interpretation |
|---|---|
| `brick-wall` | `brickSizes:[[length,width,height],…]`; Kushan uses only .39×.27×.06, .37×.22×.055, .33×.22×.05, mixed within each wall |
| `mudbrick-wall` | `brickSizes`; defaults are M, not borrowed Kushan fired-brick dimensions |
| `rubble-wall` | `unitSize:[min,max]`; angular random-rubble units, soil-coloured mud mortar |
| `dressed-wall` | semi-dressed angular stone; no battlements or conjectural continuation |
| `brickbat-wall` | broken brick fragments, not regular complete bricks |
| `lime-floor` | `height` .05–.10 (brief/M; pack has no thickness), broken irregular patches; `breaks:[[xmin,xmax],…]` |
| `brick-jelly-floor` | thin crushed-brick/earth patches, recorded as M interpretation |
| `tile-drain` | `polyline`, `width` means clear channel; tiles along both sides, no water |
| `postholes` | `centres:[[x,z],[x,z]]`, `radius`, `depth`; broad filled holes, no posts |
| `filled-pit` | `width`,`length`,`depth`; mottled fill with a U-profile, sealed; no skeleton |
| `pottery-lane` | `polyline`,`width`,`height`; pottery-and-earth surface, not paving |
| `burnt-patches` | irregular thin discrete dark patches; no flame, glow or smoke |
| `sherd-scatter` | `count`, `size:[min,max]`, material `pgw`, `porcelain`, `china` or `glass`; true-size angular fragments lying along beds, partly buried |
| `modern-brick` | one brick; dimensions M (pack null); no embossed date |
| `traced-stone` | exact traced `footprint`; low `height` M, no missing shaft or restored outline |
| `pottery-lens` | `width`,`length`,`height`,`count`; closed soil/terracotta/grey-sherd lens, default .8×.3 m, .12 m thick centrally, thinning at edges; dimensions/packing M |
| `assembly` | `children:[spec,…]`; local positions encoded in child footprints/bases; used for corners and superposed phases |

For lime floors, `base` is the host surface. The opaque, matte crust has 0.5–1 cm relief,
smooth shading across actual facets smaller than 10 cm, and a 5–10 cm body.
Most perimeter/break edges taper beneath the host soil. Short irregular north/west stretches
stand 0.5–2 cm proud, never a south/east rim. Random1–5 cm notch widths, detached crumbs, wandering
2–5 mm cracks and one 9 mm plate split supplement the real 25–28 cm breaks.
A soft-edged seeded mask in5–20 cm patches dusts20–40% of the top and the toned body;
K2e actual visible interpolated coverage is27.32%. Clean/dust colour probes are separate.
Clean rendered targets are +10 to +15 L* and at least 4 C* below like-lit soil.
Gupta uses seeded random proposals with 3–6 clumps and bare gaps, never a displaced
grid. Closed 1–3 cm fragments are log-uniform proposals; 0.5–1 cm particles are painted
in one unique, premultiplied mip-filtered matrix texture, not sparkle-producing tiny meshes.
Report union geometry and unobscured speckle coverage separately: together 30–50%,
geometry at least 20%. The warmer matrix and lane edges taper beneath the soil.

Drain tiles use the accepted K1e-r2 brick grain, chipped upper edges, seeded 1–3°
tilt and 1–2 cm displacement, with packed soil joints, rounded 1 cm arrises,
irregular corner/arris fractures and two broken ends, continuous3.5/1.8 cm tonal variation
(no clipped blobs) and a soft lower-third stain. Its slightly darker channel
bed is exposed at the first reveal tier, before the lining tiles.

**Known issue, accepted K2e/K3e freeze:** drain face sd L* is4.539/4.569/5.079;
the0.079 overshoot above5 is explicitly waived. The strongest stain is partly below
soil because it is normalized to the whole tile. Complete visible lower/upper-third
means differ by only2.35–2.61 L* (mottling included), not the requested5–10 L*.
At delivery scale a tile is about4.5px tall in the film and10px at the closest site
zoom, so this is deferred, with no sixth frame or runtime fix in K2e.
For a later kit version, only if M1/F2 close-ups need it: reference the stain to the
visible soil line, put its soft core in the visible lower third, and reduce continuous
mottling amplitude so total face sd L* stays3–5. Revalidate before accepting that version.
The K2e source tree is frozen after this documentation entry; changes require approval.

Traced stones keep the exact base outline and .12 m full height, with seven broad flat
facet planes,2.5 cm main-top relief, variable0.5–3 cm chamfers and6–7 irregular upper chips.
They use the dark end of the accepted grey-buff rubble palette/grain. Local low-spot dust
has20% support, not an all-top coating. Gates on the visible top are absolute delta L* >=4
and delta C* <=-3 against surrounding soil. Base, full height and original burial are unchanged.
The top-left diagonal shoulder is shortened above its buried base; its nearly edge-on
projection caused the apparent dark spike, not a degenerate triangle or A3 shadow sliver.

For `pottery-lens`, `base` is the **upper** level; centre is `base-.06` and the survival
base is `base-.12` by default. Place the pack-only Rajput dump into the soil/cut face,
not as a single loose scatter layer. Cut sherds stand only 1 mm proud of the 3 mm
matrix relief, rather than using masonry's centimetre offsets.
The default 840 thin sherds have 2–6 cm lengths and 5–10 mm thickness; actual capped
union covers about 30% of the lens face. The darker, greyer matrix feathers toward soil
at a fine, irregular interface. These dimensions, density, packing and palette are M.

Finds preserve their full dimensions; `burial:[min,max]` moves each unit down by a seeded
fraction of its actual vertical extent. Defaults are 30–70%, or 30–50% for modern brick.
`base` is the soil surface. `dustCoat` optionally overrides exposed-surface soil dust.

For `postholes` and `filled-pit`, `base` is the cut's opening/sealing level; the actual
survival base is `base-depth`. These are closed filled volumes, not negative-space booleans:
the integrator's soil face intersects them to show the fill boundary. All cap wedges share
one normal/albedo and a continuous local-coordinate mottled material; fill is unbanded.
The `rajput-sealed-pit` adapter has opening `base:-.18` M, beneath a **continuous** Rajput
soil surface at 0. Do not expose its opening on top. If overriding `base`, retain a sealing
band above it. The cut face has the same 3 mm relief as mud and is flush to that tolerance.

## Capped cuts, including batter

A plane keeps `dot(normal,point)+constant >= 0`; normals need not be unit length.
All planes must be supplied in **feature-local coordinates**. Transform world cut planes by the
inverse feature placement before calling. A 2–5° battered wall is just a sloped plane, for example
`[1,tan(3°),0]` with a suitable constant; the integrator supplies its actual boundary.

`keep` intersects all pieces with the outer volume. Each trench is a convex intersection of
half-spaces, including its current floor and top extent. Its `finalFloor` is the final excavation
floor, not the moving cut height. Multiple overlapping trenches are supported.

Rule from modelling brief §3: if the feature base is at or below a trench's final floor, **preserve**
the feature in that trench. Otherwise subtract the trench volume. Geometry outside the trench
stays; anything crossing its wall is sectioned and capped. An entirely removed feature has zero
draws and a hidden anchor. The deposit hides preserved portions outside the trench.

Every unit and mortar patch is a convex polyhedron; concave footprints are triangulated without
filling gaps. Clipping clips polygon faces and inserts an outward-facing cap at every cut plane,
including oblique batter. Subtraction partitions convex pieces against successive planes.
This is not a stencil/transparent face or a renderer clipping-plane trick: a cut brick has a solid
material face, and mortar gaps/courses remain visible in the section. Unit cut planes extend
0.5–2 cm proud of the soil face, deterministically varied by unit id (mortars 0.3 cm), to
avoid coplanar z-fighting and give slight archaeological relief. Coplanar partition faces
are internal and do not generate z-fighting on the exposed boundary.

Cuts retain each piece's original reveal tier and colour. Reveal changes only the prefix draw
range; it cannot expose uncapped geometry or let a hidden course survive a cut. Recutting does not
change the seed or reveal. Dynamic cut-step rebuilds are measured separately from `setReveal`.

## Materials / budgets

The look lights and ACES exposure match `createLookWorld`; no global grading. All surfaces are matte,
with seeded grain/pitting, mud joints, angular broken tops and 0.5–2 cm unit relief (M/look brief).
Top-facing unit surfaces carry irregular soil dust, not a pale bevelled frame. Small features
receive shadows. Masonry, traced stones and the modern brick cast shadows; thin floors and
small finds do not. Shadow-light bias is owned by the scene, following the A3 bisection.

| Material | Look target (rendered Lab, not source measurement) | Triangle budget |
|---|---|---|
| earth / mud brick / stone | a* 2–6, b* 12–22, C* ≤22; value variation, no invented stone hue | 15k per low wall; 50k for 4.4×1.4×1 m Rajput wall |
| fired brick / brickbat / tiles | K1 review supersedes the early sd target: exposed brick hue 64–72°, a* ≤ soil+6, C* ≤ soil+8; per-brick L* span ≤12; ≥60% faces soil-dust coated | 15k per low wall; 180k maximum all 24 Fig.13 remnants |
| lime | clean grey crust +10–15 L* and C* at least 4 below like-lit soil; 20–40% soft-edged top dust | 8k per two-patch feature |
| burnt earth | 8–15 L* below host, C* ≤12 | 4k per feature |
| finds / traced stones | source kind and colour only; unsourced size explicitly M | 5k per cluster; 1.5k per traced stone |
| floor / lane / filled cuts | soil-family fill, with the above material exceptions | 12k per feature |
| Gupta crushed-brick floor only | seeded clumps, gaps, terracotta/orange-red spread; pale/dusty and burnt minorities | 24k allowance; actual K2d 13,256, one draw |

Draw budget: at most two merged meshes per handle, independent of unit count.
Statistics report generated and post-cut triangles, colour-pass draws and actual unit-colour Lab sd.
Rendered pixel means and per-unit sampled means are separate from albedo numbers.
K1 measured-review targets: dust-coated faces within 4 L* / +2 a* of like-lit soil;
mud brick within 6 L* and ΔE76 8 of like-lit soil. Continuous recessed mud bedding,
not dark holes. Soft slumped mudbrick corners and a broken top from missing/lowered units.
Timings include one `setCuts` step for all 24 Fig.13 walls (target ≤50 ms) and one
`setReveal` call. These are measured separately; material output scale never changes geometry.

## Provenance

Only `reference/era-model.json`, its Markdown twin and `fig13-walls.json` supply archaeology and size facts.
The supplied Fig.13 polygons are figure-local colour evidence, not surveyed wall plans; course counts
are used only where non-null. Caption-level Kushan association is not per-wall stratigraphic proof.
Default heights, rubble/mudbrick dimensions, unknown find sizes, packing, breakage, surface grain,
reveal tiering and any placement are recorded M in each delivery. The two as-drawn ring/drain symbols
are never built by this kit. No religious objects, roofs, people, dates on objects, or fire effects.

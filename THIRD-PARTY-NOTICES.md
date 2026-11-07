# Third-party notices

This repository and the published site include the following third-party work. The project's own licences are in
[LICENSE](LICENSE) (MIT, everything outside `public/`) and [LICENSE-CC-BY-4.0.txt](LICENSE-CC-BY-4.0.txt) (CC BY 4.0,
everything in `public/` except `public/fonts/`).

The built site also carries `THIRD-PARTY-LICENSES.md`: Vite generates the three and three-mesh-bvh entries from the
bundled dependencies, and the build appends Vite's own MIT licence for its runtime helpers, copied from the installed
`node_modules/vite/LICENSE.md`.

## Code bundled into the site

| Package | Version | Licence | Copyright |
| --- | --- | --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | 0.187.0 | MIT | Copyright © 2010-2026 three.js authors |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | 0.9.18 | MIT | Copyright (c) 2018 Garrett Johnson |
| [Vite](https://github.com/vitejs/vite) runtime helpers (module preload) | 8.3.5 | MIT | Copyright (c) 2019-present, VoidZero Inc. and Vite contributors |

The full licence texts are in each package's `LICENSE` file under `node_modules/`, and in the site's
`THIRD-PARTY-LICENSES.md`. The occlusion worker also embeds the three-mesh-bvh licence
(`src/site/three-mesh-bvh-LICENSE.txt`).

## Fonts

Unmodified WOFF2 files in `public/fonts/`, each under the SIL Open Font License 1.1. The licence texts sit beside the
fonts, and `public/fonts/PROVENANCE.md` records the source commits and hashes.

| Font | Licence file | Copyright |
| --- | --- | --- |
| Inter SemiBold 4.1 | `public/fonts/LICENSE.txt` | Copyright (c) 2016 The Inter Project Authors |
| Source Serif 4 Semibold | `public/fonts/SourceSerif4-LICENSE.md` | Copyright 2014-2023 Adobe, Reserved Font Name 'Source' |
| Source Sans 3 Regular and Semibold | `public/fonts/SourceSans3-LICENSE.md` | Copyright 2010-2024 Adobe, Reserved Font Name 'Source' |

## Source material

`reference/purana-qila/fig13-walls.json` holds wall outlines measured from Fig. 13 (the Kushan house plan) of
Vasant Kumar Swarnkar and Satarupa Bal, "A Comprehensive Picture of Delhi's Archaeology Through Excavations at Purana
Qila", *Heritage: Journal of Multidisciplinary Studies in Archaeology* 11.1 (2023-24), pp. 351-370. The figure image
itself is not in this repository.

The excavation facts, dates and quotes used on the site and in the film come from the sources listed in `README.md`
and `reference/site-sources.json`.

No other third-party images, audio or video are used. The film's score is synthesised by `scripts/sound/`, and the
textures, posters and film frames are rendered from this repository's code.

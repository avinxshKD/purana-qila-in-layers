# Inter SemiBold 4.1

Unmodified WOFF2 from the font project's own repository, pinned at commit `353b61b9f4430d5f420d56605a6e7993e0941470`.

- Font: https://raw.githubusercontent.com/rsms/inter/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files/Inter-SemiBold.woff2
- Licence: https://raw.githubusercontent.com/rsms/inter/353b61b9f4430d5f420d56605a6e7993e0941470/LICENSE.txt
- Repository and licence were fetched and read on 1 November 2026. SIL Open Font License 1.1 permits embedding and bundling with this application; the full copyright and licence are retained alongside the font.
- Font SHA-256: `5cb7103e4e605989afebc03d989c79201e54b21b5183db33981f70db9178a301`
- Licence SHA-256: `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a`

Type A film and live labels load this one local file. Initialization fails if a required bundled face cannot load. Numerals use equal advances on the canvas path in addition to font-face OpenType settings; no CSS `font-variant-numeric` inheritance is assumed.

## Adobe type comparison B

All files are unmodified WOFF2 from the font projects' own repositories. Both pinned licence files were fetched and read; both are SIL Open Font License 1.1 and are retained beside the fonts.

| Family | Pinned repository commit | Font SHA-256 | Licence SHA-256 |
| --- | --- | --- | --- |
| Source Serif 4 Semibold, 4.005 | `adobe-fonts/source-serif@80d3f8894c09c937bebfa9011247d2e1c79fd6f4` | `7eff2d2fde32c42992e723eb24dcc6dc5b640ef0da97ce373cd38e0604202e30` | `c21d7293d87b6d7ab1d0229a2f55b77f33a7613a6a4e66f6693d68d7d8d09464` |
| Source Sans 3 Semibold, 3.052 | `adobe-fonts/source-sans@87b37a2daaed80fcb8e8ccb0085c4d72ddade12e` | `c248b0a178c362916db7c853ed640db77f184d19a0ed9fa5591fa707d3089635` | `56af9b9c6715597e458284a474dc118a50a4150e9d547c70f7b4a33c3e6a9328` |

- Serif font path at that commit: `WOFF2/OTF/SourceSerif4-Semibold.otf.woff2`; licence: `LICENSE.md`.
- Sans font path at that commit: `WOFF2/OTF/SourceSans3-Semibold.otf.woff2`; licence: `LICENSE.md`.
- Type A uses Inter for all labels. Type B uses Source Serif for the era name and Source Sans for dates/callouts. Film and live use the same locally bundled files.
- Sizes match the measured Canvas `H` cap height, not the nominal font size.
- Round 4 leaves names on normal faces with no feature override. Only digit runs select a separate Source Sans alias with `"tnum" 1, "lnum" 1`. The font bytes are unchanged. Canvas additionally gives digits equal measured advances; metadata records native advances and feature settings.
- Browser API reference: https://developer.mozilla.org/en-US/docs/Web/API/FontFace/featureSettings . No CSS-only `font-variant-numeric` inheritance is assumed for Canvas.

## Source Sans 3 Regular 3.052 (Round 6)

Unmodified WOFF2 from Adobe's official GitHub release, located through the GitHub API (`repos/adobe-fonts/source-sans/releases/tags/3.052R`, "Fonts version 3.052 (OTF, TTF, VF, WOFF, WOFF2)", published 2023-04-04, tag commit `ed1808970eb3c7301c9a523bee26473ba0bb62fa`).

- Release asset: https://github.com/adobe-fonts/source-sans/releases/download/3.052R/WOFF2-source-sans-3.052R.zip (zip SHA-256 `d7f6724027fe5ca0bab44d6121284f1fa8f66dec5f2864aa969aed347041ac95`)
- File in the zip: `WOFF2/OTF/SourceSans3-Regular.otf.woff2`, bundled as `SourceSans3-Regular.woff2`
- Font SHA-256: `63de0da0cc05298e2e9c6e5cef506d8454ca665f6e668a99d94f51174b9256ed` (153,800 bytes). The same bytes are at `WOFF2/OTF/SourceSans3-Regular.otf.woff2` in the pinned commit `87b37a2daaed80fcb8e8ccb0085c4d72ddade12e` used for Semibold, and the release zip's Semibold matches the bundled Semibold (`c248b0a1…9635`).
- Licence: SIL Open Font License 1.1, `LICENSE.md` at commit `87b37a2daaed80fcb8e8ccb0085c4d72ddade12e`, already retained as `SourceSans3-LICENSE.md` (SHA-256 `56af9b9c6715597e458284a474dc118a50a4150e9d547c70f7b4a33c3e6a9328`, re-fetched and byte-identical). It covers every Source Sans 3 weight.
- Use: `Strata Sans` and `Strata Sans Numerals` weight 400 faces in `index.html`; the timeline end labels (`540 BCE`, `2023`) draw at weight 400. Initialization fails if either 400 face does not load as weight 400.

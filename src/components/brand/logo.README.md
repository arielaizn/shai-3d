# שי 3D — logo system

The wordmark uses actual **Rubik Black (900) outlines**, converted from the locally installed Rubik-Black.ttf. Its four glyphs are positioned explicitly: from left to right, `3`, `D`, `י`, `ש`. Read from the right, the name is **שי**, followed by **3D**. No SVG contains live text glyphs, external font references, or raster imagery; the accessible `<title>` remains text. Three separated solid layers form the mark. Their open gaps survive a single-colour reproduction.

## Placement and clear space

Keep at least **one quarter of the mark's square** clear on every side of the visible artwork (16 units for a 64-unit mark). This is external clear space: do not count the SVG's small internal margins as the whole allowance. Keep header navigation and other text outside it. Scale proportionally; set a width and let height follow the viewBox.

Minimum displayed widths: **120px full lockup**, **112px stacked**, **16px standalone mark/favicon**. Use the mark below 120px when a horizontal logo cannot fit. The 272×80 full lockup at 120px gives the Latin capitals approximately 22px of height and the Hebrew approximately 18px. At 16px the standalone mark has a 12.25px-wide silhouette; its layer gaps are approximately 1.75–1.97px and its narrow side bands approximately 1.53px thick. Both small sizes were rasterized and visually checked. Do not shrink further.

## Files and backgrounds

| Asset | Use / background |
| --- | --- |
| `logo-lockup.svg` | Header on cream or white; ink wordmark with red/turquoise/ink layers. |
| `logo-lockup-dark.svg` | Ink background; cream wordmark and bottom layer. |
| `logo-stacked.svg` | Social/share composition on cream or white; transparent square-ish artwork. |
| `logo-mono-ink.svg` | Single ink colour on cream, white, turquoise or yellow. |
| `logo-mono-cream.svg` | Single cream colour on ink or **red-600 #DB1F2B**. |
| `mark.svg` | Compact branding on cream or white. |
| `favicon.svg` | Browser icon, cream rounded-square ground; square viewBox. |
| `apple-touch-icon.svg` | 180×180 coordinate system with cream ground and a centred 128×128 mark box (26-unit safe margins). This requested SVG is a source asset; native Apple touch-icon installation needs a separately exported PNG. |

## React

`import { Logo } from "./Logo";`

- `<Logo className="w-[136px] h-auto" />` renders the default accessible horizontal colour lockup.
- `<Logo variant="stacked" />` or `<Logo variant="mark" />` selects the other layout.
- `<Logo tone="cream" />` and `<Logo tone="ink" />` use `currentColor`, with the named token as the default SVG `color`. A CSS `color` declaration can override it; use only the approved palette.
- `<Logo title="" />` is decorative beside equivalent live brand text: it sets `aria-hidden` and omits the title. Otherwise its default Hebrew title and accessible name are exactly `שי 3D`. A nonempty custom `title` is supported.
- For the **colour lockup on ink**, set `--brand-wordmark: var(--cream, #FFF7EC)` and `--brand-base: var(--cream, #FFF7EC)` on the logo or an ancestor. The red and turquoise layers remain unchanged. Other supported palette properties are `--red`, `--turquoise`, `--ink`, and `--cream`, with exact token fallbacks.

## Forbidden

No stretching, mirroring (including in RTL layouts), rearranging glyphs, live-font replacements, effects, gradients, shadows, outlines, or colours outside the supplied tokens. Never place the colour lockup on red. Never put a cream/light label on flat candy red **#F5333F**; choose **#DB1F2B** for a red surface carrying the cream logo or light text. Keep yellow for occasional delight, not mandatory logo decoration. Do not close the gaps between layers or put labels inside the mark.

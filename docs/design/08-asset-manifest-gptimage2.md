# 08 · מפרט הנכסים החזותיים
**shai3d · Asset Manifest for gpt-image-2 (kie.ai, driven by the Codex plugin)**
Owner: asset production. Every image file that ships in `public/` originates here. If a component needs
a picture and it is not in this manifest, the picture does not exist yet and the manifest gets amended
before anyone opens a generator.

This file is downstream of `01-color-and-tokens.md` (palette, red budget), `03-page-architecture.md`
(where each image lands), `05-3d-viewer.md` (what the 3D stage does and does not need), and
`06-admin-and-convex-schema.md` (which images are Convex-managed and which are repo fallbacks).

---

## 0. Decisions at a glance

| Question | Decision |
|---|---|
| Generator | `gpt-image-2-text-to-image` on kie.ai, called by `scripts/assets/gen.mjs`, driven by the Codex plugin |
| Prompt shape | one verbatim PREAMBLE + up to four override lines. Nothing else |
| Colour control | explicit **percentage weights in every prompt**. Measured: without them the ground collapsed to 11%, with them it recovered to 43% |
| People in AI images | **none, ever.** No faces, no figures, no hands. Every photograph of a person on this site is a real photograph |
| Photographs of Shai | real camera only. Slots stay empty until the shoot. `docs/photo-brief-shai.md` is the shot list |
| Gallery band | real prints only. `GalleryBand` hides itself under 6 published items rather than showing invented prints |
| Hebrew inside an image | **never.** All Hebrew is live DOM text. Every prompt bans text in any language |
| Delivery format | **WebP only.** Vercel's image optimizer emits AVIF at request time from the WebP source |
| Retina | **no `@2x` files.** One source authored at 2× the largest CSS display width, `next/image` builds the rest |
| Compression | `cwebp -q 82`. Measured: a 2K render went 3.3 MB → 142 KB with no visible loss |
| Cutouts | `rembg` + an alpha floor, only for the 9 assets that sit on a coloured panel. Everything else keeps its cream ground |
| OG images | composed in headless Chrome from an AI background plate plus live Hebrew DOM text. Not generated |
| Favicon, app icons, UI glyphs | authored SVG. Not generated |
| Paper grain | deterministic per-pixel noise from a script. Not generated (AI tiles do not tile) |
| Total AI generations | **38 unique assets**, 37 files in `public/` plus 2 composer plates, 60 API calls including variants and rerolls |

---

## 1. The generation runtime

### 1.1 Call path
```
assets/manifest.json  →  scripts/assets/gen.mjs  →  POST https://api.kie.ai/api/v1/jobs/createTask
                                                 →  poll GET /api/v1/jobs/recordInfo?taskId=…  (5s)
                                                 →  download resultUrls[0]  →  assets/_raw/{id}-v{n}.png
```
`assets/_raw/` is **gitignored**. 38 assets at 2-4 MB each is 120 MB of PNG that must never enter the
repo. The raws are archived once to `shai3d-asset-raws-YYYYMMDD.zip` and parked in Drive, because a
reroll six months from now needs the original, not the 142 KB WebP.

`KIE_AI_API_KEY` comes from the environment. It is never written into `manifest.json`.

### 1.2 Hard model constraints (these are rules, not trivia)

1. **A 1:1 aspect ratio cannot use 4K.** The task fails. Every square asset here is 2K or 1K.
2. **`aspect_ratio: "auto"` (or omitting it) supports 1K only.** So `auto` is never used in this manifest;
   every asset names an explicit ratio.
3. **A 2K render takes about 60 seconds.** A 1K render takes about 20-25 seconds. Budget wall time from
   these numbers, not from optimism.
4. **Hebrew is never rendered inside an image.** Not a headline, not a label, not a price, not a word on a
   box. All Hebrew on this site is live DOM text, because live text is selectable, translatable,
   searchable, restyleable, and correct. Generated Hebrew is none of those and is usually malformed.
   The preamble bans text in *any* language, which also stops the model from inventing English filler.
5. **Legal ratios:** `1:1, 5:4, 4:5, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16, 21:9`. This manifest uses five of
   them: `1:1`, `4:5`, `3:2`, `16:9`, `4:3`.
6. **Prompt ceiling is 20,000 characters.** The preamble is ~1,700. There is no reason to compress.
7. `nsfw_checker` stays `true`. Nothing here is near the line and a false positive costs one reroll.

### 1.3 Concurrency
Four parallel workers. Six triggers 429s on this account tier and the retry backoff eats the speedup.
`gen.mjs` retries a 429 once after 30 seconds, then parks the asset and continues.

---

## 2. THE PREAMBLE

Stored at `assets/prompts/_preamble.txt`. `gen.mjs` reads it once and prepends it to every prompt with a
blank line after it. **It is reused verbatim. Nobody edits it per asset.** Editing it invalidates the whole
library's consistency, so a change to this paragraph bumps it to v1.1 and every asset regenerates.

```text
PREAMBLE v1.0
Bright toy-store product photography for a children's 3D-printing brand. Shoot every frame on one
seamless flat cream background, hex #FFF7EC, filling the frame corner to corner, with no horizon line,
no table edge, no wall, no floor, no room, no window, and no props beyond what this brief names.
Colour weights across the whole frame, obey them exactly: cream #FFF7EC 62 percent, pure white #FFFFFF
14 percent, near-black violet ink #1A1420 8 percent, turquoise #12BFB8 8 percent, sunshine yellow
#FFC531 5 percent, candy red #F5333F 3 percent. If a line beginning COLOUR WEIGHTS appears after this
paragraph, that line replaces these six percentages and you obey it instead. Lighting: one large soft
key light from the upper left, about 35 degrees above the object, with the quality of a two-metre
softbox; a white bounce card on the lower right holding the shadows open at about a three-to-one ratio;
one short soft contact shadow directly beneath the object and nothing else; neutral daylight white
balance at 5600 Kelvin. Camera: 50mm-equivalent lens on a full-frame body at f/5.6, three-quarter view
from 25 degrees above the object, subject centred, sharp corner to corner, no shallow depth of field,
no background blur, no bokeh, no vignette, no lens flare. Rendering: clean modern commercial e-commerce
photography, crisp edges, honest matte plastic surfaces with fine visible horizontal 3D-printing layer
lines, colour saturated but never neon, no reflections of a studio or a photographer. Absolutely
forbidden: any text, letters, numbers, words, captions, labels, watermarks, signatures, packaging copy,
screen text or interface text, in any language including Hebrew and English; any brand name, logo,
trademark, machine branding or product badge; any human being, face, figure, hand or body part; golden
hour light, orange wash, amber glow, warm tungsten light, sunset colour; industrial workshop mood,
garage, workbench, hand tools, sawdust, metal shelving, dark or moody background; artisan, handcrafted
or boutique mood, kraft paper, burlap, linen, raw wood grain, ceramic, macrame, dried flowers, twine;
grunge, dust, scratches, film grain, retro filter, HDR look.
```

### 2.1 Why every clause is there
- **The flat cream sweep** is what makes 38 images cut together as one library. A "table", a "wall" or a
  "surface" invites the model to invent a room, and rooms differ from render to render.
- **The percentage weights** are the measured fix. Two real test generations proved that listing hexes
  alone lets one accent run to 40% of the frame while the ground collapses to 11%. Weights moved the
  ground to 43% and pinned the runaway accent to its 8% target. Weights are not optional.
- **The fixed light and lens sentence** is the second consistency lock. Same key direction, same
  softness, same fill ratio, same contact shadow, same focal length, same elevation. When 38 images share
  those five facts they read as one shoot even though the objects differ.
- **The three negation clusters** (golden hour, industrial workshop, artisan craft) are the three moods
  this brand is not, and explicit negation was measured to work: writing "NOT golden hour, no orange
  wash" removed the orange wash entirely. Positive description alone did not.
- **The brand and text ban** is a legal clause, not a taste clause. A test render came back with a real
  third-party printer brand mark on the machine body and a legible dragon icon. Anything with a
  trademark on it is unusable and must be rerolled, so the ban stays absolute and appears in every prompt.
- **The no-humans clause** covers two separate risks at once: the model's hands are unreliable, and the
  subject of this site is a thirteen-year-old boy whose likeness must never be synthesised.

### 2.2 The override grammar
Exactly four override lines are legal, in this order, each on its own line, each optional except the
first two:

```
COLOUR WEIGHTS: <six or fewer "name #hex NN percent" pairs summing to 100>
SUBJECT: <what the object is, its material, its colour, its scale in millimetres>
FRAMING: <how it sits in the frame, what fraction of frame height, any negative space to reserve>
AVOID: <this asset's specific failure modes, on top of the preamble bans>
```

`COLOUR WEIGHTS` and `SUBJECT` are mandatory on every asset. `FRAMING` is mandatory on anything that has
to slot into a fixed layout box. `AVOID` is mandatory whenever a previous render of that asset failed.

Weights must sum to 100 and must never let red exceed 8 percent, because the red budget in
`01-color-and-tokens.md` §0 says red is the identity object and appears once per viewport. A photograph
with a red-heavy frame spends that budget before the CTA gets to.

---

## 3. The three shot grammars

Every asset belongs to one of three grammars. The grammar decides the default weights and the framing
language, so an asset author picks the grammar first and only then writes SUBJECT.

### 3.1 Grammar OBJECT: one thing, catalogue-clean
Used by: print-type tiles, product placeholders, step spots, admin spots, the 404, the plinth.
```
COLOUR WEIGHTS: cream #FFF7EC 66 percent, white #FFFFFF 10 percent, <object accent> 14 percent,
ink #1A1420 7 percent, <second accent> 3 percent.
FRAMING: exactly one object, centred, occupying 68 percent of the frame height, resting on the cream
ground with a single short soft contact shadow, three-quarter view, generous even margin on all four
sides, no cropping of the object.
```
The "68 percent of frame height" number is what makes a grid of seven tiles look like a set. It is the
single most load-bearing framing constant in this document.

### 3.2 Grammar CLUSTER: two to four things, joyful
Used by: the home hero pair, category tiles, OG plates, the about shelf.
```
COLOUR WEIGHTS: cream #FFF7EC 58 percent, white #FFFFFF 12 percent, turquoise #12BFB8 12 percent,
yellow #FFC531 8 percent, ink #1A1420 6 percent, red #F5333F 4 percent.
FRAMING: <n> objects arranged in a loose triangle with clear cream air between them, the largest object
forward and centred, the others stepped back and partly behind it, all sharing one contact shadow plane,
occupying 72 percent of the frame height.
```
Cluster is the grammar that carries the toy-store feeling, so it is also the grammar with the tightest
red ceiling. Four percent of a cluster frame is one small red object, which is exactly the intent.

### 3.3 Grammar MACRO: texture you want to touch
Used by: the about-page atmosphere set, the transform pair, one hero variant.
```
COLOUR WEIGHTS: cream #FFF7EC 52 percent, <material colour> 30 percent, white #FFFFFF 10 percent,
ink #1A1420 6 percent, turquoise #12BFB8 2 percent.
FRAMING: extreme close focus on the object surface, the object filling 85 percent of the frame,
horizontal 3D-printing layer lines clearly resolved and running left to right, cream visible only at the
frame edges, still sharp corner to corner with no depth-of-field falloff.
```
Macro is the only grammar allowed to break the 68 percent rule, and the only one where the object may
touch a frame edge.

---

## 4. The QA gate

Nothing enters `public/` without passing `scripts/assets/palette-check.mjs`.

```
node scripts/assets/palette-check.mjs assets/_raw/B01-lithophane-v1.png \
  --expect cream=66 accent=14 ink=7 --tolerance 10
```

The script downsamples to 128×128, converts every pixel to CIELAB, assigns it to the nearest of the six
brand hexes plus a "none" bucket when ΔE > 22, and prints the percentage per bucket. It exits non-zero
when any of these is true:

| Gate | Threshold | Why |
|---|---|---|
| cream share | **< 45%** | the measured failure mode. The ground must dominate or the toy-store restraint is gone |
| red share | **> 8%** | the red budget. A red-heavy photograph steals the CTA's attention |
| "none" bucket | **> 30%** | the model invented colours outside the palette, usually a beige-boutique drift |
| any single accent | **> 22%** | one accent has run away, the same way the measured failure did |

Two checks stay human and take fifteen seconds each:
1. **Zoom to 200% and read the object.** Any letterform, digit, badge, machine name or icon that could be
   a trademark is an automatic reroll with the offending element named in `AVOID`.
2. **Put the new render next to `B01` on screen.** If the light direction, the shadow softness or the
   object scale differs visibly, it fails the library test regardless of how good it looks alone.

Failed renders are rerolled with the failure named explicitly in `AVOID`, because explicit negation was
measured to work and vague re-prompting was measured not to.

---

## 5. Post-processing

### 5.1 The pipeline, in order
```
raw PNG (2048px or 1024px)
  → [crop, only where the manifest says so]      ImageMagick, explicit pixel geometry
  → [cutout, only where the manifest says so]    rembg + alpha floor
  → resize + encode                              cwebp -q 82
  → blur placeholder                             8×8 WebP → base64 → src/lib/blur.generated.ts
  → size check against the manifest's KB target
```

### 5.2 The one command that does most of it
`cwebp` resizes and encodes in a single pass, so there is no intermediate resample step to lose detail:
```bash
mkweb () {  # mkweb <src.png> <out.webp> <width> <height>
  cwebp -q 82 -m 6 -sharp_yuv -metadata none -resize "$3" "$4" "$1" -o "$2"
}
mkweb assets/_raw/A01-hero-primary-v3.png "public/assets/home/hero-primary.webp" 1400 1400
```
`-m 6` is the slowest, smallest encode and costs a few seconds on 38 files, which is free.
`-sharp_yuv` matters here because these images are large flat colour fields next to hard object edges,
exactly where chroma subsampling shows. `-metadata none` strips the generator's EXIF.

### 5.3 Cutouts (9 assets only)
```bash
rembg i assets/_raw/A04-step-upload-v1.png assets/_raw/A04-cut.png
python3 scripts/assets/alpha_floor.py assets/_raw/A04-cut.png assets/_raw/A04-floor.png --floor 18
cwebp -q 82 -alpha_q 90 -exact -m 6 -metadata none -resize 320 320 \
      assets/_raw/A04-floor.png -o public/assets/home/step-01-upload.webp
```
`alpha_floor.py` zeroes every alpha value below 18/255 and clamps every value above 238 to 255. Without
it, `rembg` leaves a haze of 3-to-12 alpha across the former background, which reads as a grey square
halo the moment the asset sits on turquoise. `-exact` keeps the RGB under fully transparent pixels
instead of letting cwebp fill it with an average colour, which is the other halo source.

### 5.4 Cropping (2 assets only)
ImageMagick 6.9.1 on this machine **cannot crop by ratio**. `-crop 1:1` fails silently and hands back the
untouched image, which then passes every size check and ships wrong. Always give explicit pixels:
```bash
convert assets/_raw/A03-transform-pair-v2.png -crop 1152x1152+96+0   +repage /tmp/before.png
convert assets/_raw/A03-transform-pair-v2.png -crop 1152x1152+800+0  +repage /tmp/after.png
```
`+repage` is mandatory. Without it the crop offset survives in the canvas geometry and `cwebp` encodes
the original dimensions.

### 5.5 No AVIF files
Vercel's image optimizer negotiates AVIF at request time from the WebP source, so shipping a second
encode doubles the repo for nothing. `avifenc` is not installed on this machine either, which settles it.
`next.config.ts` sets `images: { formats: ['image/avif', 'image/webp'] }`.

### 5.6 Blur placeholders
Every asset that renders through `next/image` with `placeholder="blur"` needs a base64 LQIP. One script
emits them all into a typed module so no component hardcodes a data URI:
```bash
node scripts/assets/blur.mjs   # writes src/lib/blur.generated.ts
```
```ts
// src/lib/blur.generated.ts  (generated, do not edit)
export const BLUR = {
  'home/hero-primary': 'data:image/webp;base64,UklGRh…',
  'print-types/lithophane': 'data:image/webp;base64,UklGRg…',
} as const;
export type BlurKey = keyof typeof BLUR;
```
Convex-uploaded images get their `blurDataUrl` from the same routine running in the admin upload handler,
which is why `products.addImage` takes `blurDataUrl` as an argument (`06-admin-and-convex-schema.md`,
`convex/products.ts`).

---

## 6. Naming and layout

```
public/assets/
  home/        hero-primary.webp  hero-secondary.webp
               transform-before.webp  transform-after.webp
               step-01-upload.webp  step-02-colours.webp  step-03-receive.webp
  print-types/ lithophane.webp  relief.webp  glow.webp  standee.webp
               keychain.webp  magnet.webp  framed.webp
  categories/  figures.webp  home.webp  gifts.webp  keychains.webp  lighting.webp  desk.webp
  products/    placeholder-01.webp … placeholder-08.webp
  about/       build-plate.webp  desk.webp  layer-macro.webp  shelf.webp
  admin/       empty-products.webp  empty-leads.webp  empty-gallery.webp
  misc/        not-found.webp  stage-plinth.webp
  textures/    grain-96.png
public/og/     home.png  about.png  generator.png  products.png  contact.png     ← composed, not generated
src/app/       icon.svg  apple-icon.png  opengraph-image.tsx (per route)          ← authored
assets/_raw/                                                                      ← gitignored
assets/og-plates/ bright.png  story.png                                           ← gitignored, composer input
assets/prompts/_preamble.txt  A01.txt … H02.txt                                   ← committed
```

**Rules.**
- Lowercase, hyphenated, no dates, no version numbers in the shipped filename. The version lives in
  `assets/_raw/{id}-v{n}.png` and in git history. `hero-primary-v2.webp` in `public/` means somebody
  shipped without deleting, and the two files drift.
- The folder is the family, so the filename never repeats it. `print-types/lithophane.webp`, never
  `print-types/print-type-lithophane.webp`.
- **Print-type filenames must equal the `printTypes.key` value** in Convex (`lithophane`, `relief`,
  `glow`, `standee`, `keychain`, `magnet`, `framed`) so the fallback resolves by key with no lookup table:
  `` `/assets/print-types/${pt.key}.webp` ``.
- Category filenames must equal the category slug for the same reason.
- Prompt files carry the asset id so a reroll six months out is one `cat` away.

---

## 7. THE MANIFEST

Every entry below is complete. `ratio` and `res` are the literal values passed to
`gpt-image-2-text-to-image`. `delivered` is the pixel size after `cwebp -resize`. `target` is the KB
ceiling the size check enforces. `alt` is the Hebrew alt text that ships with the component; it is part of
the asset, not an afterthought, and it obeys the site's copy law.

Every prompt below is `PREAMBLE v1.0` + a blank line + the block shown. The preamble is never repeated in
this document; `gen.mjs` prepends it.

---

### Family A · HOME

#### A01 · hero-primary  ★ the most important asset on the site
| | |
|---|---|
| path | `public/assets/home/hero-primary.webp` |
| appears | `HomeHero` → `HeroProductCollage`, the primary white-framed card, `rotate(-4deg)`, `priority`, `sizes="(max-width:1023px) 100vw, 46vw"`. Convex `settings.heroImageIds[0]` overrides it |
| ratio / res | `1:1` / `2K` (2048×2048). 1:1 cannot use 4K |
| delivered | 1400×1400 WebP · **target ≤ 180 KB** |
| background | flat cream `#FFF7EC`, kept. No cutout: the image sits inside a white frame on cream, so a hard cream edge is invisible and a cutout would only cost an alpha channel |
| grammar | CLUSTER |
| variants | **generate 4.** This one frame decides whether a visitor wants to touch a print. Four renders at 2K is four minutes and it is the cheapest quality decision in the project |
| post | `mkweb … 1400 1400` · blur key `home/hero-primary` |
| alt | `שלוש הדפסות תלת מימד על רקע קרם: פאנל מואר, פסלון אדום ומחזיק מפתחות` |

```text
COLOUR WEIGHTS: cream #FFF7EC 56 percent, warm white #FFFFFF 16 percent, turquoise #12BFB8 13 percent,
candy red #F5333F 6 percent, sunshine yellow #FFC531 5 percent, near-black violet ink #1A1420 4 percent.

SUBJECT: three finished 3D-printed plastic objects arranged as one group. Front and centre, a thin flat
translucent warm-white printed panel about 100mm tall standing upright in a slim matte white printed
base, lit softly from behind so a gentle grayscale image of a mountain lake glows through the plastic and
the fine horizontal print layers read as delicate stripes across the glow. Stepped back to its right, a
small chunky rounded printed cat figurine in candy red #F5333F, about 70mm tall, matte finish, sitting on
an oval base. Stepped back to its left and lower, a small flat turquoise #12BFB8 printed keychain tag
with a punched hole and a bright steel split ring resting on the cream. A single sunshine yellow #FFC531
printed hexagon coaster lies flat under the group, mostly hidden, showing only a sliver of yellow.

FRAMING: loose triangle with clear cream air between the three objects, the glowing panel forward and
tallest, group occupying 74 percent of the frame height, centred, even cream margin on all four sides,
one shared soft contact shadow plane, nothing cropped by the frame edge.

AVOID: no printer, no machine, no spools of filament, no tools, no packaging, no picture of a person or
animal face inside the glowing panel, no coloured light spill onto the cream, no rainbow of many colours,
no more than three main objects.
```

#### A02 · hero-secondary
| | |
|---|---|
| path | `public/assets/home/hero-secondary.webp` |
| appears | `HeroProductCollage` secondary card, `rotate(6deg)`, 0.62 scale, overlapping the primary's bottom-end corner. **Desktop only** (`HeroProductCollage` drops it under 1024px), so it is not an LCP asset and does not carry `priority` |
| ratio / res | `1:1` / `2K` |
| delivered | 900×900 WebP · **target ≤ 95 KB** |
| background | flat cream, kept |
| grammar | OBJECT |
| variants | 2 |
| post | `mkweb … 900 900` · blur key `home/hero-secondary` |
| alt | `מגנט מקרר מודפס בצורת ענן בצבע צהוב` |

```text
COLOUR WEIGHTS: cream #FFF7EC 64 percent, sunshine yellow #FFC531 20 percent, white #FFFFFF 8 percent,
near-black violet ink #1A1420 6 percent, turquoise #12BFB8 2 percent.

SUBJECT: one chunky 3D-printed fridge magnet in sunshine yellow #FFC531, shaped as a simple rounded
cloud about 60mm wide, matte plastic with clearly visible fine horizontal print layer lines across its
face, lying tilted on the cream so the viewer sees both its rounded front face and a sliver of its back
where two small round black neodymium magnets sit recessed in printed pockets.

FRAMING: one object, centred, occupying 66 percent of the frame height, three-quarter view from above,
single short soft contact shadow, generous even cream margin, nothing cropped.

AVOID: no metal surface, no refrigerator, no fridge door, no shopping list, no paper held under the
magnet, no chrome, no gloss highlights that blow out to white.
```

#### A03 · transform pair  → two files from one render
| | |
|---|---|
| path | `public/assets/home/transform-before.webp` + `public/assets/home/transform-after.webp` |
| appears | `HowItWorksStrip` → `GeneratorInvite`, the turquoise panel's before/after pair, 48% width each on mobile, side by side on desktop |
| ratio / res | `16:9` / `2K` (2048×1152), **rendered as one diptych and cropped into two squares** |
| delivered | 700×700 each · **target ≤ 70 KB each** |
| background | flat cream, kept. The pair sits inside white frames on the turquoise panel |
| grammar | MACRO |
| variants | 2 |
| post | crop with explicit pixel geometry (§5.4), then `mkweb … 700 700` twice · blur keys `home/transform-before`, `home/transform-after` |
| alt | before: `תצלום מודפס על נייר של גור כלבים` · after: `אותו תצלום כפאנל מודפס ומואר מאחור` |

**Why one render and not two.** The two panels must show *the same photograph* or the before/after claim
collapses. `gpt-image-2-text-to-image` has no image input, so two independent renders would produce two
different dogs. Rendering both halves in one frame guarantees the subject matches, and the crop is
deterministic. This is the only place in the manifest where one generation yields two files.

```text
COLOUR WEIGHTS: cream #FFF7EC 54 percent, warm white #FFFFFF 22 percent, soft neutral grey #9A9A9A
12 percent, near-black violet ink #1A1420 7 percent, turquoise #12BFB8 5 percent.

SUBJECT: two objects lying side by side on one seamless cream ground, separated by a clear band of empty
cream down the exact centre of the frame. On the right half, a small glossy printed photograph on paper,
about 90mm square, showing a golden retriever puppy sitting on grass in flat daylight, resting flat on
the cream with one corner very slightly lifted. On the left half, a thin flat translucent warm-white
3D-printed panel of exactly the same size showing exactly the same golden retriever puppy in the same
pose as a grayscale relief, standing upright in a slim matte white printed base and lit softly from
behind so the image glows through the plastic and the fine horizontal print layers read across it.

FRAMING: perfect left-right symmetry, each object centred inside its own half of the frame and occupying
70 percent of that half's height, a wide clean cream gutter of at least 12 percent of the frame width
down the centre, both objects sharing one contact shadow plane, nothing cropped.

AVOID: no arrow between the two, no divider line, no frame around either object, no human hand, no
different dog on the two sides, no colour in the printed panel, no coloured light spill onto the cream.
```

#### A04 · step-01-upload
| | |
|---|---|
| path | `public/assets/home/step-01-upload.webp` |
| appears | `StepCard` spot art, 112px, above the yellow numeral, **≥1024px only**. *Amendment to `03-page-architecture.md` §3.3: `StepCard` gains an optional `spotSrc` prop. Three equal numerals with no object is the one band on the home page that reads like a corporate process diagram, and one small printed object per step fixes it without adding a word of copy.* |
| ratio / res | `1:1` / `1K` |
| delivered | 320×320 WebP **with alpha** · **target ≤ 22 KB** |
| background | **cutout required.** The spot sits directly on cream in the step card and on turquoise in the mobile variant, so a baked cream square would show |
| grammar | OBJECT |
| variants | 1 |
| post | `rembg` → `alpha_floor.py --floor 18` → `cwebp -alpha_q 90 -exact … 320 320` |
| alt | `טלפון עם תמונה על המסך` |

```text
COLOUR WEIGHTS: cream #FFF7EC 62 percent, near-black violet ink #1A1420 18 percent, warm white #FFFFFF
10 percent, turquoise #12BFB8 6 percent, sunshine yellow #FFC531 4 percent.

SUBJECT: one modern smartphone with a plain matte near-black #1A1420 body and no branding of any kind,
lying flat and slightly angled on the cream, screen facing up and switched on, showing a single
full-bleed photograph of a golden retriever puppy on grass with no interface elements, no status bar, no
icons, no buttons and no text anywhere on the screen.

FRAMING: one object, centred, occupying 62 percent of the frame height, seen from 25 degrees above,
single short soft contact shadow, generous even cream margin, nothing cropped.

AVOID: no logo on the phone body or screen, no camera-app interface, no notification, no clock, no
signal or battery icon, no hand holding the phone, no cable, no case.
```

#### A05 · step-02-colours
| | |
|---|---|
| path | `public/assets/home/step-02-colours.webp` |
| appears | `StepCard` spot 2, same rules as A04 |
| ratio / res | `1:1` / `1K` |
| delivered | 320×320 WebP with alpha · **target ≤ 22 KB** |
| background | cutout required |
| grammar | OBJECT |
| variants | 2 (four-colour balance is the thing that goes wrong here) |
| post | as A04 |
| alt | `ארבעה גלילי חוט הדפסה בצבעים שונים` |

```text
COLOUR WEIGHTS: cream #FFF7EC 58 percent, turquoise #12BFB8 12 percent, candy red #F5333F 8 percent,
sunshine yellow #FFC531 8 percent, warm white #FFFFFF 8 percent, near-black violet ink #1A1420 6 percent.

SUBJECT: four short neat coils of 3D-printing filament lying flat on the cream in a fan, each coil about
50mm across and made of smooth round plastic strand, one candy red #F5333F, one turquoise #12BFB8, one
sunshine yellow #FFC531, one warm white #FFFFFF. The four coils are the same size and are spaced evenly
with clean cream between them.

FRAMING: the fan of four centred, occupying 58 percent of the frame height, seen from 25 degrees above,
one shared soft contact shadow, generous even cream margin, nothing cropped.

AVOID: no spool, no reel, no cardboard core, no plastic bag, no desiccant pack, no label, no tangle, no
fifth colour, no gradient or rainbow strand.
```

#### A06 · step-03-receive
| | |
|---|---|
| path | `public/assets/home/step-03-receive.webp` |
| appears | `StepCard` spot 3, same rules as A04 |
| ratio / res | `1:1` / `1K` |
| delivered | 320×320 WebP with alpha · **target ≤ 22 KB** |
| background | cutout required |
| grammar | OBJECT |
| variants | 1 |
| post | as A04 |
| alt | `קופסת משלוח לבנה פתוחה עם הדפסה בפנים` |

```text
COLOUR WEIGHTS: cream #FFF7EC 58 percent, warm white #FFFFFF 24 percent, turquoise #12BFB8 10 percent,
near-black violet ink #1A1420 5 percent, candy red #F5333F 3 percent.

SUBJECT: one small plain white cardboard shipping box about 140mm wide with smooth unprinted white
surfaces, sitting open on the cream with its lid flaps folded back, and a single turquoise #12BFB8
3D-printed rounded cat figurine nested inside it on plain white tissue. A narrow candy red #F5333F paper
band runs across one corner of the closed lower half of the box.

FRAMING: one object group, centred, occupying 64 percent of the frame height, three-quarter view from
25 degrees above so the open interior is visible, single short soft contact shadow, generous even cream
margin, nothing cropped.

AVOID: no printing, no logo, no shipping label, no address, no barcode, no tape with text, no courier
branding, no kraft or brown cardboard, no packing peanuts, no bubble wrap, no hand.
```

---

### Family B · PRINT TYPES  ★ the most important *set* on the site

These seven are what a customer chooses between in the generator's step 2. They are the only place on the
site where the visitor compares images side by side and makes a decision from them, so they carry two
requirements that no other family has:

**Mutual consistency.** Identical camera, identical light, identical ground, identical object scale
(68 percent of frame height, the OBJECT grammar constant), identical contact shadow. If one tile is shot
closer than the others, the customer reads it as "bigger" and picks it for the wrong reason.

**Instant distinguishability.** Every tile differs on **two axes at once**, form and colour, so the set
reads correctly at 300px, at a glance, in a scrolling thumb:

| key | form | colour | the one word that separates it |
|---|---|---|---|
| `lithophane` | thin flat panel in a stand, **backlit** | warm white | glows |
| `relief` | thick flat panel, **opaque**, sculpted surface | turquoise | raised |
| `glow` | thick flat panel, **luminous** material | mint green | dark |
| `standee` | **figurine** on a base | candy red | figure |
| `keychain` | small **tag with a metal ring** | sunshine yellow | tiny |
| `magnet` | flat shape showing **magnets on its back** | turquoise, second form | sticks |
| `framed` | panel **inside a black frame** | ink + white | hangs |

Colour discipline across the set: **exactly one tile is candy red** (`standee`), because the generator
screen already spends its red budget on the price tag and the CTA. Turquoise appears twice but on two
completely different forms, which the eye reads as material, not repetition. Green appears only in `glow`,
which is why `glow` is unmistakable.

Shared per-tile spec unless the entry overrides it:

| | |
|---|---|
| path | `public/assets/print-types/{key}.webp`, where the filename **is** `printTypes.key` |
| appears | generator step 2 tile grid; `PrintTypeCard`; admin print-type editor preview. Convex `printTypes.sampleImageId` overrides the file when Shai uploads a photo of his own |
| ratio / res | `1:1` / `2K` |
| delivered | 720×720 WebP · **target ≤ 75 KB each** |
| background | flat cream, kept (the tile has its own white frame) |
| grammar | OBJECT |
| variants | **2 each.** 14 renders, 14 minutes, and it is the set that sells |
| post | `mkweb … 720 720` · blur key `print-types/{key}` |
| shared AVOID (append to every B prompt) | `no printer, no machine, no filament spool, no tool, no packaging, no second object, no coloured light spill onto the cream, no reflection of a studio, no crop of the object.` |

#### B01 · lithophane
alt: `פאנל תלת מימד דק ומואר מאחור עם תמונת נוף`
```text
COLOUR WEIGHTS: cream #FFF7EC 66 percent, warm white #FFFFFF 20 percent, soft neutral grey #9A9A9A
7 percent, near-black violet ink #1A1420 5 percent, turquoise #12BFB8 2 percent.

SUBJECT: one thin flat translucent warm-white 3D-printed lithophane panel, 120mm tall and 3mm thick,
standing upright in a slim matte white printed base, lit softly from directly behind so a detailed
grayscale image of a mountain lake and pine trees glows through the plastic, dark where the plastic is
thick and bright where it is thin, with fine horizontal print layer lines reading as delicate stripes
across the whole glowing image.

FRAMING: one object, centred, occupying 68 percent of the frame height, three-quarter view from 25
degrees above, single short soft contact shadow, generous even cream margin.

AVOID: no face or animal in the panel image, no colour inside the panel, no visible lamp, LED, bulb or
light box behind it, no glow spilling onto the cream, plus the shared avoid list.
```

#### B02 · relief
alt: `פאנל תלת מימד אטום עם תבליט מורם`
```text
COLOUR WEIGHTS: cream #FFF7EC 62 percent, turquoise #12BFB8 24 percent, white #FFFFFF 7 percent,
near-black violet ink #1A1420 5 percent, sunshine yellow #FFC531 2 percent.

SUBJECT: one thick opaque square 3D-printed panel in turquoise #12BFB8, 120mm across and 12mm deep,
standing upright in a matching printed base, its front face carrying a sculpted raised relief of a
dog's head and shoulders that stands about 5mm proud of the surface. The key light rakes across the
relief from the upper left so the raised areas cast small crisp shadows onto the flat face and the form
reads clearly as sculpture, and fine horizontal print layer lines follow the contours of the relief.

FRAMING: one object, centred, occupying 68 percent of the frame height, three-quarter view from 25
degrees above, single short soft contact shadow, generous even cream margin.

AVOID: no backlight, no glow, no translucency, no light passing through the panel, no frame around it,
no second colour on the panel, plus the shared avoid list.
```

#### B03 · glow
alt: `פאנל תלת מימד מחומר זוהר בירוק`
```text
COLOUR WEIGHTS: cream #FFF7EC 58 percent, pale luminous mint green #A8F0C8 26 percent, white #FFFFFF
8 percent, near-black violet ink #1A1420 5 percent, turquoise #12BFB8 3 percent.

SUBJECT: one thick square 3D-printed panel in pale mint-green glow-in-the-dark plastic, 120mm across,
standing upright in a matching printed base, its front face carrying a sculpted raised relief of a
crescent moon and small stars. The plastic is visibly self-luminous, emitting an even soft green-cyan
light from within the material itself so the relief edges read as bright lines, while the surrounding
cream background stays a clean daylight cream and receives no green cast.

FRAMING: one object, centred, occupying 68 percent of the frame height, three-quarter view from 25
degrees above, single short soft contact shadow, generous even cream margin.

AVOID: no dark room, no night scene, no black background, no green light spilling onto the cream, no
neon rim, no lens glow or bloom, no UV lamp, plus the shared avoid list.
```
> `B03` is the only prompt allowed to introduce a hex outside the locked palette (`#A8F0C8`). Glow-in-the-
> dark filament is a real material with a real colour and faking it in turquoise would misrepresent the
> product a customer is paying for. The palette-check tolerance for `B03` is run with `--allow #A8F0C8`.

#### B04 · standee  (the set's one red object)
alt: `פסלון חתול מודפס בצבע אדום על בסיס`
```text
COLOUR WEIGHTS: cream #FFF7EC 64 percent, candy red #F5333F 22 percent, white #FFFFFF 7 percent,
near-black violet ink #1A1420 5 percent, turquoise #12BFB8 2 percent.

SUBJECT: one chunky rounded 3D-printed cat figurine in candy red #F5333F, 90mm tall, matte plastic with
simple friendly stylised forms and no painted details, sitting upright on a low oval printed base of the
same red, with fine horizontal print layer lines wrapping the curved body.

FRAMING: one object, centred, occupying 68 percent of the frame height, three-quarter view from 25
degrees above, single short soft contact shadow, generous even cream margin.

AVOID: no painted eyes or facial detail beyond simple sculpted forms, no glitter, no gloss varnish, no
second figurine, no pedestal or display box, plus the shared avoid list.
```

#### B05 · keychain
alt: `מחזיק מפתחות מודפס בצהוב עם טבעת מתכת`
```text
COLOUR WEIGHTS: cream #FFF7EC 70 percent, sunshine yellow #FFC531 16 percent, cool steel grey #C9CDD2
6 percent, near-black violet ink #1A1420 5 percent, turquoise #12BFB8 3 percent.

SUBJECT: one small flat 3D-printed keychain tag in sunshine yellow #FFC531, 45mm across, a rounded
squircle about 4mm thick with a clean punched hole near one edge, carrying a simple sculpted raised
star shape on its face, threaded onto a bright polished steel split ring that lies open on the cream
beside it.

FRAMING: one object plus its ring, centred, occupying 52 percent of the frame height because a keychain
is genuinely small and the set must communicate scale honestly, three-quarter view from 25 degrees above,
single short soft contact shadow, generous even cream margin.

AVOID: no keys, no keyring bundle, no lanyard, no chain beyond the single split ring, no engraving, no
initials, plus the shared avoid list.
```
> `B05` is the one deliberate break from the 68 percent constant, down to 52. A keychain shot at the same
> frame height as a 120mm panel reads as a coaster. Scale honesty beats grid consistency exactly once.

#### B06 · magnet
alt: `מגנט מודפס בטורקיז עם מגנטים בגב`
```text
COLOUR WEIGHTS: cream #FFF7EC 66 percent, turquoise #12BFB8 20 percent, near-black violet ink #1A1420
8 percent, white #FFFFFF 4 percent, sunshine yellow #FFC531 2 percent.

SUBJECT: one flat 3D-printed fridge magnet in turquoise #12BFB8, 65mm across, shaped as a simple rounded
cloud about 6mm thick, propped up on the cream and tilted toward the camera at a steep angle so the
viewer sees mostly its back, where two small round black neodymium magnets sit recessed in neat printed
pockets, and only a curved sliver of its front face.

FRAMING: one object, centred, occupying 62 percent of the frame height, tilted three-quarter view from
25 degrees above, single short soft contact shadow, generous even cream margin.

AVOID: no refrigerator, no metal door, no steel sheet, no paper or note held under it, no second magnet
object, no glue or adhesive visible, plus the shared avoid list.
```

#### B07 · framed
alt: `פאנל מודפס בתוך מסגרת שחורה`
```text
COLOUR WEIGHTS: cream #FFF7EC 60 percent, near-black violet ink #1A1420 20 percent, warm white #FFFFFF
14 percent, soft neutral grey #9A9A9A 4 percent, turquoise #12BFB8 2 percent.

SUBJECT: one square wall piece 200mm across: a thick flat matte near-black #1A1420 3D-printed frame with
clean square edges, holding a warm-white printed relief panel of a wave and a rising sun whose sculpted
surface catches the raking key light. The piece leans back very slightly as if resting against nothing,
standing on the cream, and a simple printed keyhole hanger is just visible on its upper back edge.

FRAMING: one object, centred, occupying 72 percent of the frame height because a framed piece is the
largest product in the set, three-quarter view from 25 degrees above, single short soft contact shadow,
generous even cream margin.

AVOID: no wall, no nail, no hook in a wall, no glass or perspex glazing, no reflection in the panel, no
mat board, no photograph inside the frame, no wood grain, plus the shared avoid list.
```

---

### Family C · CATEGORY TILES

Six tiles, one per catalog category. `03-page-architecture.md` §4.2 keeps the desktop filter bar as text
chips, and that stays. These tiles have three consumers:

1. **The mobile filter drawer** (<768px). *Amendment to §4.2: on mobile the category chip row becomes a
   two-up horizontal scroller of 128px tiles with the Hebrew label under each. A row of eight identical
   text pills on a 390px viewport is the least toy-store surface on the site, and it is the surface most
   visitors actually touch.*
2. **The 404 page**, as three "where to go instead" tiles (`H01` sits above them).
3. **The admin category editor** preview thumbnail.

Convex `categories.iconKey` is unrelated (it names an SVG glyph). The tile file resolves by slug:
`` `/assets/categories/${category.slug}.webp` ``, and a missing file falls back to the flat SVG in §9.4.

Shared spec:

| | |
|---|---|
| path | `public/assets/categories/{slug}.webp` |
| ratio / res | `1:1` / `1K` (they render at 128px; 2K is 40 wasted seconds each) |
| delivered | 320×320 WebP · **target ≤ 25 KB each** |
| background | flat cream, kept |
| grammar | CLUSTER, reduced to two or three objects |
| variants | 1 each |
| post | `mkweb … 320 320` · blur key `categories/{slug}` |
| shared FRAMING | `two or three objects in a loose triangle with clear cream air between them, group centred and occupying 64 percent of the frame height, one shared soft contact shadow, generous even cream margin, nothing cropped.` |
| shared AVOID | `no printer, no machine, no filament spool, no tool, no packaging, no text, no fourth object, no coloured light spill onto the cream.` |

| id | slug | Hebrew label | alt |
|---|---|---|---|
| C01 | `figures` | דמויות | `שלושה פסלונים מודפסים` |
| C02 | `home` | לבית | `אביזרים מודפסים לבית` |
| C03 | `gifts` | מתנות | `הדפסות קטנות למתנה` |
| C04 | `keychains` | מחזיקי מפתחות | `שני מחזיקי מפתחות מודפסים` |
| C05 | `lighting` | תאורה | `פאנלים מודפסים מוארים` |
| C06 | `desk` | לשולחן | `אביזרים מודפסים לשולחן עבודה` |

#### C01 · figures
```text
COLOUR WEIGHTS: cream #FFF7EC 62 percent, turquoise #12BFB8 16 percent, sunshine yellow #FFC531
10 percent, candy red #F5333F 6 percent, near-black violet ink #1A1420 6 percent.
SUBJECT: three small chunky 3D-printed animal figurines with simple friendly stylised forms, matte
plastic with visible fine layer lines, about 70mm tall each: a turquoise #12BFB8 sitting cat, a sunshine
yellow #FFC531 standing bear, and a smaller candy red #F5333F owl set slightly behind them.
```

#### C02 · home
```text
COLOUR WEIGHTS: cream #FFF7EC 66 percent, warm white #FFFFFF 14 percent, turquoise #12BFB8 12 percent,
near-black violet ink #1A1420 6 percent, sunshine yellow #FFC531 2 percent.
SUBJECT: three printed household objects in matte plastic: a warm-white #FFFFFF hexagonal plant pot about
90mm tall with a geometric faceted surface, a turquoise #12BFB8 rounded soap dish, and a small white
printed hook. No plant, no soap, no contents of any kind.
```

#### C03 · gifts
```text
COLOUR WEIGHTS: cream #FFF7EC 62 percent, candy red #F5333F 12 percent, sunshine yellow #FFC531
12 percent, turquoise #12BFB8 8 percent, near-black violet ink #1A1420 6 percent.
SUBJECT: three small printed gift objects in matte plastic: a candy red #F5333F heart-shaped desk trinket
about 55mm wide, a sunshine yellow #FFC531 six-sided printed puzzle box, and a small turquoise #12BFB8
printed star ornament with a fine white cord loop.
```

#### C04 · keychains
```text
COLOUR WEIGHTS: cream #FFF7EC 70 percent, turquoise #12BFB8 12 percent, sunshine yellow #FFC531
8 percent, cool steel grey #C9CDD2 6 percent, near-black violet ink #1A1420 4 percent.
SUBJECT: two small flat printed keychain tags lying on the cream, each about 45mm across and 4mm thick
with a clean punched hole and a bright polished steel split ring: one turquoise #12BFB8 squircle with a
sculpted raised wave, one sunshine yellow #FFC531 rounded hexagon with a sculpted raised bolt of
lightning. Group occupies 46 percent of the frame height, because keychains are small.
```

#### C05 · lighting
```text
COLOUR WEIGHTS: cream #FFF7EC 60 percent, warm white #FFFFFF 26 percent, soft neutral grey #9A9A9A
8 percent, near-black violet ink #1A1420 4 percent, turquoise #12BFB8 2 percent.
SUBJECT: two thin translucent warm-white printed lithophane panels standing upright in slim matte white
printed bases, one 120mm tall showing a grayscale forest, one 90mm tall and set slightly behind showing
a grayscale city skyline, both softly lit from behind so the images glow through the plastic with the
fine horizontal layer lines reading across them. No lamp, bulb or light source is visible and no glow
spills onto the cream.
```

#### C06 · desk
```text
COLOUR WEIGHTS: cream #FFF7EC 64 percent, near-black violet ink #1A1420 16 percent, turquoise #12BFB8
12 percent, warm white #FFFFFF 6 percent, sunshine yellow #FFC531 2 percent.
SUBJECT: three printed desk objects in matte plastic: a near-black #1A1420 angled phone stand about 90mm
tall, a turquoise #12BFB8 pen cup, and a small white printed cable clip. The pen cup is empty and holds
no pens.
```

---

### Family D · PRODUCT PLACEHOLDERS

**These are development seed data, and the seed script writes them with `status: 'draft'`.** A placeholder
never reaches a published product page, because a visitor who orders a thing that Shai has not printed is
a problem the site created. They exist so the catalog grid, the filter bar, the sort control, the card
badges and the detail-page layout can be built and reviewed against eight real-looking rows before a
single real photograph exists.

When a published product has no image at all, the component renders `D09`, a flat SVG that is obviously a
placeholder and could never be mistaken for a print (§9.4).

Shared spec:

| | |
|---|---|
| path | `public/assets/products/placeholder-0N.webp` |
| appears | `convex/seed.ts` → `products.heroImageUrl` for the eight draft rows; `ProductCard`, `ProductGrid`, `ProductDetail` gallery during development; admin list rows |
| ratio / res | `1:1` / `2K` (the product detail page shows these at up to 640px, and `ProductCard` is 1:1 by contract) |
| delivered | 700×700 WebP · **target ≤ 70 KB each** |
| background | flat cream, kept. `ProductCard`'s inner image well is cream `#FFF7EC`, so the asset ground and the well are the same colour and the edge disappears |
| grammar | OBJECT |
| variants | 1 each |
| post | `mkweb … 700 700` · blur keys `products/placeholder-0N` |
| shared FRAMING | `one object, centred, occupying 68 percent of the frame height, three-quarter view from 25 degrees above, single short soft contact shadow, generous even cream margin, nothing cropped.` |
| shared AVOID | `no printer, no machine, no filament spool, no tool, no packaging, no second object, no branding, no engraved or embossed letters or numbers of any kind.` |

| id | file | object | dominant | seed `titleHe` | alt |
|---|---|---|---|---|---|
| D01 | `placeholder-01` | angled phone stand | turquoise | `מעמד לטלפון` | `מעמד מודפס לטלפון בצבע טורקיז` |
| D02 | `placeholder-02` | faceted plant pot | warm white | `עציץ גאומטרי` | `עציץ מודפס לבן עם פאות` |
| D03 | `placeholder-03` | desk tray | ink | `מגש לשולחן` | `מגש מודפס שחור לשולחן` |
| D04 | `placeholder-04` | stacking ring toy | white + turquoise | `מגדל טבעות` | `צעצוע טבעות מודפס` |
| D05 | `placeholder-05` | bag clips, set of three | yellow | `קליפסים לשקיות` | `שלושה קליפסים מודפסים בצהוב` |
| D06 | `placeholder-06` | headphone hook | turquoise | `וו לאוזניות` | `וו מודפס לאוזניות` |
| D07 | `placeholder-07` | puzzle box | candy red | `קופסת פאזל` | `קופסת פאזל מודפסת באדום` |
| D08 | `placeholder-08` | hexagon coaster set | mixed | `תחתיות משושה` | `סט תחתיות משושה מודפסות` |

Only **D07** carries candy red, and it is deliberately placed eighth in `sortOrder` so it never lands in
the four-card `ProductsTeaser` on the home page, where the hero's red figurine already owns the budget.

```text
D01  COLOUR WEIGHTS: cream #FFF7EC 66 percent, turquoise #12BFB8 22 percent, near-black violet ink
     #1A1420 6 percent, white #FFFFFF 4 percent, sunshine yellow #FFC531 2 percent.
     SUBJECT: one angled 3D-printed phone stand in turquoise #12BFB8, about 100mm tall, a clean folded
     geometric wedge with a cable channel cut through its base, matte plastic with fine horizontal print
     layer lines, standing empty with no phone in it.

D02  COLOUR WEIGHTS: cream #FFF7EC 62 percent, warm white #FFFFFF 26 percent, soft neutral grey #9A9A9A
     6 percent, near-black violet ink #1A1420 4 percent, turquoise #12BFB8 2 percent.
     SUBJECT: one 3D-printed plant pot in warm white #FFFFFF, 110mm tall, a faceted low-polygon
     hexagonal form with a matching printed saucer, matte plastic with fine horizontal layer lines,
     completely empty with no plant, no soil and no stones.

D03  COLOUR WEIGHTS: cream #FFF7EC 64 percent, near-black violet ink #1A1420 24 percent, white #FFFFFF
     6 percent, turquoise #12BFB8 4 percent, sunshine yellow #FFC531 2 percent.
     SUBJECT: one shallow rectangular 3D-printed desk tray in near-black #1A1420, 180mm wide, with three
     internal dividers and softly rounded inner corners, matte plastic with fine horizontal layer lines,
     completely empty.

D04  COLOUR WEIGHTS: cream #FFF7EC 60 percent, warm white #FFFFFF 18 percent, turquoise #12BFB8
     14 percent, sunshine yellow #FFC531 5 percent, near-black violet ink #1A1420 3 percent.
     SUBJECT: one 3D-printed stacking ring toy, 120mm tall: a warm-white #FFFFFF conical post on a round
     white base, with four rings stacked on it in decreasing size, two turquoise #12BFB8 and two warm
     white, matte plastic with fine horizontal layer lines.

D05  COLOUR WEIGHTS: cream #FFF7EC 70 percent, sunshine yellow #FFC531 20 percent, near-black violet ink
     #1A1420 5 percent, white #FFFFFF 3 percent, turquoise #12BFB8 2 percent.
     SUBJECT: three identical 3D-printed bag clips in sunshine yellow #FFC531, each about 60mm long, a
     simple sprung C-profile with a ridged grip, matte plastic with fine horizontal layer lines, lying
     in a neat fan on the cream. Group occupies 50 percent of the frame height.

D06  COLOUR WEIGHTS: cream #FFF7EC 68 percent, turquoise #12BFB8 20 percent, near-black violet ink
     #1A1420 6 percent, white #FFFFFF 4 percent, sunshine yellow #FFC531 2 percent.
     SUBJECT: one 3D-printed under-desk headphone hook in turquoise #12BFB8, about 90mm long, a smooth
     curved J-shape with a flat mounting plate, matte plastic with fine horizontal layer lines, resting
     on its plate with the hook curving up, holding nothing.

D07  COLOUR WEIGHTS: cream #FFF7EC 64 percent, candy red #F5333F 22 percent, near-black violet ink
     #1A1420 6 percent, white #FFFFFF 5 percent, turquoise #12BFB8 3 percent.
     SUBJECT: one 3D-printed puzzle box in candy red #F5333F, 80mm cube with softly rounded edges and a
     sliding panel set slightly open on one face, matte plastic with fine horizontal layer lines,
     interlocking geometric seams visible across the surfaces.

D08  COLOUR WEIGHTS: cream #FFF7EC 60 percent, turquoise #12BFB8 14 percent, sunshine yellow #FFC531
     12 percent, warm white #FFFFFF 9 percent, near-black violet ink #1A1420 5 percent.
     SUBJECT: four 3D-printed hexagonal coasters, 95mm across and 6mm thick with a fine concentric
     surface pattern, one turquoise #12BFB8, one sunshine yellow #FFC531, two warm white #FFFFFF, three
     stacked in a slightly offset pile and one leaning upright against the stack. Group occupies
     58 percent of the frame height.
```

---

### Family E · ABOUT PAGE ATMOSPHERE

The About page carries Shai's story. Its portrait slots are **empty on purpose** and are filled with real
photographs (§8.1). This family is the atmosphere around those portraits: the objects, the surfaces and
the machine's product, with no person in any frame. That division is the whole point. The photographs
carry the boy, the AI carries the plastic, and nothing in between is invented.

| | |
|---|---|
| appears | `/about` section blocks, resolved from `aboutSections[].imageId` with these as repo fallbacks |
| variants | 1 each |
| background | flat cream, kept |
| grammar | MACRO (E01, E03) and CLUSTER (E02, E04) |

#### E01 · build-plate
| | |
|---|---|
| path | `public/assets/about/build-plate.webp` |
| appears | the About hero band, full-bleed, and as the `og-plate-story` source if `G02` disappoints |
| ratio / res | `3:2` / `2K` |
| delivered | 1800×1200 WebP · **target ≤ 190 KB** |
| post | `mkweb … 1800 1200` · blur key `about/build-plate` |
| alt | `משטח הדפסה עם הדפסה באמצע התהליך` |

```text
COLOUR WEIGHTS: cream #FFF7EC 50 percent, turquoise #12BFB8 26 percent, cool dark grey #3A3F45
12 percent, warm white #FFFFFF 8 percent, near-black violet ink #1A1420 4 percent.

SUBJECT: a close view of a smooth textured dark grey printing bed with a turquoise #12BFB8 object about
half printed on it, the finished lower layers crisp and even, the topmost layer still being laid down as
a fine continuous strand, every horizontal print layer clearly resolved. The bed occupies the lower two
thirds of the frame and the background above it is clean flat cream.

FRAMING: close and low, camera 20 degrees above the bed surface, the half-printed object filling
55 percent of the frame width and placed on the left third, the right third left as clean empty cream.

AVOID: no printer frame, no gantry, no rails, no motors, no wiring, no fans, no nozzle assembly beyond
the single strand of plastic, no brand marking of any kind, no dark or industrial mood, no blue LED, no
enclosure, no lettering on the bed.
```

#### E02 · desk
| | |
|---|---|
| path | `public/assets/about/desk.webp` |
| appears | About page, the "how I work" block, 4:5 portrait card |
| ratio / res | `4:5` / `2K` |
| delivered | 1120×1400 WebP · **target ≤ 150 KB** |
| post | `mkweb … 1120 1400` · blur key `about/desk` |
| alt | `פינת עבודה עם קליפר וקוביות בדיקה מודפסות` |

```text
COLOUR WEIGHTS: cream #FFF7EC 56 percent, cool steel grey #C9CDD2 14 percent, turquoise #12BFB8
12 percent, sunshine yellow #FFC531 8 percent, warm white #FFFFFF 6 percent, near-black violet ink
#1A1420 4 percent.

SUBJECT: a small tidy group of measuring and testing objects laid out on the cream: a pair of polished
steel digital callipers with a blank unlit display and no markings, four small printed test cubes in
turquoise #12BFB8, sunshine yellow #FFC531, warm white #FFFFFF and near-black #1A1420, and a short
printed calibration tower with stepped tiers.

FRAMING: objects arranged in a loose diagonal from the lower right to the upper left with clear cream
air between them, group occupying 62 percent of the frame height, one shared contact shadow plane,
generous cream margin at the top of the portrait frame.

AVOID: no numbers or scale markings on the callipers, no digits on the display, no notebook, no pen, no
paper, no hand, no workbench, no wood surface, no dark tool chest, no clutter.
```

#### E03 · layer-macro
| | |
|---|---|
| path | `public/assets/about/layer-macro.webp` |
| appears | About page pull-quote band background at 18% opacity, and the **fallback for every empty portrait slot** until the real photographs arrive |
| ratio / res | `1:1` / `2K` |
| delivered | 900×900 WebP · **target ≤ 95 KB** |
| post | `mkweb … 900 900` · blur key `about/layer-macro` |
| alt | `תקריב של שכבות ההדפסה על משטח טורקיז` |

```text
COLOUR WEIGHTS: cream #FFF7EC 20 percent, turquoise #12BFB8 62 percent, warm white #FFFFFF 10 percent,
near-black violet ink #1A1420 5 percent, sunshine yellow #FFC531 3 percent.

SUBJECT: an extreme close view of the curved surface of a turquoise #12BFB8 3D-printed object, so close
that the individual horizontal print layers read as a regular field of fine parallel ridges running left
to right across the frame, each ridge catching a thin highlight along its upper edge, the plastic matte
and slightly translucent at the very edge of the form.

FRAMING: the surface fills 88 percent of the frame, the object's edge crossing the upper right corner so
a small triangle of clean cream is visible there, sharp corner to corner with no depth-of-field falloff.

AVOID: no whole object, no recognisable shape, no printer, no dust, no scratches, no fingerprint, no
reflection of a light source, no colour other than the turquoise family.
```

#### E04 · shelf
| | |
|---|---|
| path | `public/assets/about/shelf.webp` |
| appears | About page closing band, and the **`GalleryBand` substitute** on the home page while the real gallery has fewer than 6 published items |
| ratio / res | `3:2` / `2K` |
| delivered | 1600×1067 WebP · **target ≤ 170 KB** |
| post | `mkweb … 1600 1067` · blur key `about/shelf` |
| alt | `שורה של הדפסות מוגמרות עומדות זו לצד זו` |

```text
COLOUR WEIGHTS: cream #FFF7EC 54 percent, turquoise #12BFB8 14 percent, warm white #FFFFFF 12 percent,
sunshine yellow #FFC531 10 percent, near-black violet ink #1A1420 6 percent, candy red #F5333F
4 percent.

SUBJECT: seven finished 3D-printed objects standing in a single loose row on the cream, all at a similar
scale of 70 to 110mm: a warm-white lithophane panel in its stand, a turquoise #12BFB8 cat figurine, a
sunshine yellow #FFC531 hexagonal pot, a near-black #1A1420 phone stand, a turquoise cloud magnet, a
small candy red #F5333F owl, and a warm white stacking ring toy. Their spacing is uneven and natural,
some slightly forward and some slightly back.

FRAMING: the row runs across the full frame width with even cream above and below, group occupying
64 percent of the frame height, all seven sharing one contact shadow plane, the outermost objects fully
inside the frame with a clear margin.

AVOID: no shelf, no shelving unit, no board, no ledge, no wall behind, no bracket, no eighth object, no
overlapping pile, no rainbow ordering of colours.
```

---

### Family F · ADMIN EMPTY STATES

Three spots. An admin panel that greets Shai with grey boxes is a panel he stops opening, and a small
printed object where the emptiness is teaches the panel's own vocabulary. Everything else empty in the
admin (a search with no results, a failed query, a filtered table) is CSS and an SVG glyph, because those
are frequent states and a photograph there becomes noise (§8.4).

| | |
|---|---|
| path | `public/assets/admin/empty-{products,leads,gallery}.webp` |
| appears | `AdminEmptyState` component, rendered at 240px above the Hebrew line and the primary action |
| ratio / res | `1:1` / `1K` |
| delivered | 480×480 WebP **with alpha** · **target ≤ 28 KB each** |
| background | **cutout required.** Admin surfaces are white cards, not cream, so a baked cream square would show as a grey block |
| grammar | OBJECT |
| variants | 1 each |
| post | `rembg` → `alpha_floor.py --floor 18` → `cwebp -alpha_q 90 -exact … 480 480` |

| id | state | Hebrew line (owned by the copy agent, shown here for context) | alt |
|---|---|---|---|
| F01 | no products | `אין כאן דגמים עדיין` | `קופסה לבנה ריקה` |
| F02 | no leads | `עוד לא נכנסו פניות` | `בועת דיבור מודפסת בטורקיז` |
| F03 | no gallery items | `הגלריה ריקה` | `מסגרת מודפסת ריקה` |

```text
F01  COLOUR WEIGHTS: cream #FFF7EC 62 percent, warm white #FFFFFF 28 percent, near-black violet ink
     #1A1420 5 percent, turquoise #12BFB8 3 percent, sunshine yellow #FFC531 2 percent.
     SUBJECT: one small plain white cardboard box, 120mm wide, open and completely empty, its four lid
     flaps folded outward, sitting on the cream. No printing, no label, no tape, no logo.

F02  COLOUR WEIGHTS: cream #FFF7EC 66 percent, turquoise #12BFB8 24 percent, white #FFFFFF 5 percent,
     near-black violet ink #1A1420 3 percent, sunshine yellow #FFC531 2 percent.
     SUBJECT: one flat 3D-printed speech-bubble shape in turquoise #12BFB8, 90mm wide, a rounded
     rectangle with a small tail, 8mm thick, matte plastic with fine horizontal layer lines, standing
     upright in a slim matching printed base. Its face is completely blank with nothing written or
     sculpted on it.

F03  COLOUR WEIGHTS: cream #FFF7EC 60 percent, near-black violet ink #1A1420 22 percent, warm white
     #FFFFFF 12 percent, turquoise #12BFB8 4 percent, sunshine yellow #FFC531 2 percent.
     SUBJECT: one square 3D-printed picture frame in near-black #1A1420, 150mm across with clean square
     edges and a 20mm face, standing on the cream and completely empty so the cream background is
     visible straight through the opening. No glass, no backing board, no image.
```

---

### Family G · OG BACKGROUND PLATES

**The Open Graph images are not generated.** They are composed in headless Chrome from an HTML page at
1200×630 that pairs one of these plates with live Hebrew DOM text (§9.3). The AI produces only the
photographic half. Two reasons, and both are hard: a share card carries a Hebrew headline, and Hebrew
inside a generated image is banned by rule 4 of §1.2; and the headline changes per route while the
photography does not.

**The RTL composition rule.** The Hebrew headline is right-aligned, so the plate must reserve its
**right 45 percent** as clean cream negative space and place every object in the left 55 percent. This is
the single detail that an LTR habit gets wrong, and getting it wrong puts the objects behind the text.

| | |
|---|---|
| path | `assets/og-plates/{bright,story}.png`, **not in `public/`**. Composer input only |
| ratio / res | `16:9` / `2K` (2048×1152) |
| delivered | cropped to 1200×630 PNG for the composer, which outputs `public/og/*.png` |
| variants | 2 for `G01`, 1 for `G02` |
| post | `convert … -crop 2048x1075+0+38 +repage` then `cwebp`-free: keep PNG, the composer needs lossless input |

#### G01 · bright plate
Feeds `og/home.png`, `og/products.png`, `og/generator.png`, `og/contact.png`.
```text
COLOUR WEIGHTS: cream #FFF7EC 62 percent, turquoise #12BFB8 12 percent, warm white #FFFFFF 10 percent,
sunshine yellow #FFC531 8 percent, near-black violet ink #1A1420 5 percent, candy red #F5333F 3 percent.

SUBJECT: four finished 3D-printed objects grouped together: a warm-white backlit lithophane panel in a
slim stand, a turquoise #12BFB8 cat figurine, a sunshine yellow #FFC531 hexagonal coaster leaning
upright, and a small candy red #F5333F keychain tag lying flat.

FRAMING: the entire group sits inside the left 55 percent of the frame, its rightmost edge stopping well
clear of the frame centre. The right 45 percent of the frame is completely empty flat cream with no
object, no shadow and no gradient in it. The group occupies 76 percent of the frame height and shares one
contact shadow plane.

AVOID: no object, shadow, blur or texture anywhere in the right 45 percent of the frame, no vignette, no
gradient background, no centred composition, no fifth object.
```

#### G02 · story plate
Feeds `og/about.png`.
```text
COLOUR WEIGHTS: cream #FFF7EC 56 percent, turquoise #12BFB8 24 percent, cool dark grey #3A3F45
10 percent, warm white #FFFFFF 6 percent, near-black violet ink #1A1420 4 percent.

SUBJECT: a close view of a smooth dark grey printing bed carrying a turquoise #12BFB8 object about half
printed, the finished lower layers crisp and the topmost layer still being laid as a fine continuous
strand, every horizontal print layer clearly resolved.

FRAMING: the bed and the half-printed object sit entirely inside the left 55 percent of the frame and the
right 45 percent is completely empty flat cream. Camera 20 degrees above the bed.

AVOID: no printer frame, gantry, rails, motors, wiring or fans, no brand marking, no object or shadow in
the right 45 percent, no dark or industrial mood, no blue LED.
```

---

### Family H · SINGLES

#### H01 · not-found
| | |
|---|---|
| path | `public/assets/misc/not-found.webp` |
| appears | `src/app/not-found.tsx`, 280px, above the Hebrew line and the three category tiles from family C |
| ratio / res | `1:1` / `1K` |
| delivered | 640×640 WebP **with alpha** · **target ≤ 55 KB** |
| background | cutout required (the 404 page uses a cream card on cream, and the object overlaps the card edge) |
| grammar | OBJECT |
| variants | 2 |
| post | `rembg` → `alpha_floor.py --floor 18` → `cwebp -alpha_q 90 -exact … 640 640` |
| alt | `סבך של חוט הדפסה טורקיז` |

A failed print is the honest, funny, on-brand 404 for a printing site, and every person who has run a
printer recognises it instantly.

```text
COLOUR WEIGHTS: cream #FFF7EC 64 percent, turquoise #12BFB8 26 percent, near-black violet ink #1A1420
5 percent, white #FFFFFF 3 percent, sunshine yellow #FFC531 2 percent.

SUBJECT: one loose tangled nest of thin turquoise #12BFB8 3D-printing plastic strand, about 120mm across,
the strands looping and crossing over each other in a soft messy ball with a few loose ends curling
outward, matte plastic, clearly the result of a print that went wrong, sitting on the cream.

FRAMING: one object, centred, occupying 60 percent of the frame height, seen from 25 degrees above,
single short soft contact shadow, generous even cream margin, nothing cropped.

AVOID: no printer, no bed, no nozzle, no second colour, no neat coil, no spool, no scissors, no bin.
```

#### H02 · stage-plinth
| | |
|---|---|
| path | `public/assets/misc/stage-plinth.webp` |
| appears | the generator's 3D stage **before** a photo is uploaded, as a static poster behind the upload prompt. It is a still image, so the `three` bundle is not requested until the customer actually has something to look at, which protects the generator's first paint (`05-3d-viewer.md` lazy-load contract) |
| ratio / res | `1:1` / `2K` |
| delivered | 720×720 WebP · **target ≤ 70 KB** |
| background | flat cream, kept |
| grammar | OBJECT |
| variants | 1 |
| post | `mkweb … 720 720` · blur key `misc/stage-plinth` |
| alt | `במה עגולה ריקה מוכנה להדפסה` |

```text
COLOUR WEIGHTS: cream #FFF7EC 70 percent, warm white #FFFFFF 18 percent, turquoise #12BFB8 6 percent,
near-black violet ink #1A1420 4 percent, sunshine yellow #FFC531 2 percent.

SUBJECT: one low circular display plinth in warm white #FFFFFF matte plastic, 160mm across and 25mm tall,
with a very slightly bevelled top edge and a thin turquoise #12BFB8 inlay ring running around its
circumference, standing empty on the cream with nothing on top of it.

FRAMING: one object, centred, occupying 40 percent of the frame height and sitting low in the frame so
the empty space above it is clean cream, seen from 25 degrees above, single short soft contact shadow.

AVOID: no object on the plinth, no turntable mechanism, no arrows, no measurement marks, no grid, no
spotlight, no stage lighting, no pedestal shadow other than the single contact shadow.
```

---

## 8. What must NOT be AI-generated

This list is as load-bearing as the manifest. Generating any of these is a defect, not a shortcut.

### 8.1 Every photograph of Shai
| | |
|---|---|
| why | Two independent reasons, either one sufficient. The site's only real asset is that the story is true, and a synthetic boy standing next to a printer turns the whole page into a lie the moment anyone notices. And the subject is a thirteen-year-old minor whose likeness is never synthesised, in any style, for any reason, including "just a placeholder". |
| route | A real camera. Two hours, daylight, a phone shot in `4:5` at the highest resolution the device offers. |
| until then | The slot stays empty and the component falls back to `E03 layer-macro`. `03-page-architecture.md` §3.6 `StoryTeaser` renders `E04 shelf` cropped to 4:5 in the portrait card while `settings.shaiPortraitId` is null, so the home page is complete without a single photo of him. |

**`docs/photo-brief-shai.md`, the five shots.** Daylight near a window, no flash, no filter, plain wall.
1. **Portrait 4:5**, waist up, holding one finished print, looking at the camera. This is `shai-portrait`.
2. **At the printer 3:2**, three-quarter from behind his shoulder, the bed and a part in focus, his face
   partly turned. This is the About hero.
3. **Hands 1:1**, close on his hands holding a print, no face. Runs in the story band and is the shot
   that survives every future redesign.
4. **The shelf 3:2**, him placing a print on a shelf of prints, mid-motion, slightly loose.
5. **Packing 4:5**, closing a box, from above.
Shoot every one of the five in landscape and portrait. Cropping down is free, recomposing is another day.

### 8.2 Gallery band photographs
| | |
|---|---|
| why | `GalleryBand` is the proof section. Every square in it is a claim that Shai printed that object. Generated squares make that claim false fourteen times in a row, in the one band a visitor scrolls slowly. |
| route | Shai photographs his real prints and uploads them through the admin gallery editor. |
| until then | `GalleryBand` returns `null` when `gallery.length < 6`, and the home page renders `E04 shelf` as a single full-bleed still in its place. Six real prints is a low bar and Shai has already passed it. |

### 8.3 Filament colour swatches
| | |
|---|---|
| why | `filamentColors.hex` is the source of truth for both the swatch the customer taps and the material colour in the 3D viewer. A photograph of a spool would drift from that hex and the preview would stop matching the choice. |
| route | A CSS circle: `background: var(--swatch)` from the Convex hex, 2px `ink/12` ring, `box-shadow: inset 0 -3px 6px rgb(0 0 0 / .18)` for a plastic roundness that costs nothing. `filamentColors.swatchImageId` stays in the schema for the day Shai photographs real spools, and the component prefers it when present. |

### 8.4 Every UI glyph
| | |
|---|---|
| why | These are 12 to 24px, they must inherit `currentColor`, they must stay crisp at any zoom, they animate (the cube badge rotates 360° over 6s per `03` §4.4), and several must flip under RTL. A raster cannot do any of that, and gpt-image-2 cannot hold a 2px stroke weight consistent across ten icons. |
| route | Inline SVG in `src/components/glyphs/`, one component each, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `fill="none"`, no hardcoded colour. |
| the set | `SparkleGlyph` (4-point star, hero eyebrow) · `CubeGlyph` (the rotating 3D badge) · `ChevronGlyph` (authored pointing right, flipped with `rtl:-scale-x-100`) · `WhatsappGlyph` (filled, brand shape, the one exception to stroke-only) · `UploadGlyph` · `CloseGlyph` · `CheckGlyph` · `TrashGlyph` · `PlusGlyph` · `OrbitGlyph` (the "spin me" hint on the 3D stage) · `SearchGlyph` · `FilterGlyph` |

### 8.5 Decorative shapes that are already code
The hero's yellow organic blob, the `MarkerHighlight` pen stroke, the dashed turquoise connector between
the how-it-works steps, the card frames, the price tag shape, every loading skeleton and spinner. All of
these are CSS or inline SVG, defined in `01-color-and-tokens.md` and `03-page-architecture.md`. A raster
version would not scale, would not theme, would not animate, and would need a new render every time a
radius changed.

### 8.6 Favicon and app icons
Authored SVG (§9.1). A favicon is a 16px glyph and a generative model has no useful role at 16px.

### 8.7 The paper grain
Generated by script (§9.2). AI output does not tile. A one-pixel seam repeated across a 1440px viewport
is a visible grid, and no amount of prompting fixes it because the model has no concept of a wrap edge.

### 8.8 Open Graph images
Composed in headless Chrome (§9.3). Hebrew must be live text, and the model may not render Hebrew.

### 8.9 The 3D environment map
`05-3d-viewer.md` bakes a lightformer rig to a 64px cube render target: no file, no fetch. A real
`.hdr` is 1.5 to 4 MB, larger than the models it lights. Nothing to generate.

### 8.10 Product `.glb` models
Real prints, sliced and exported by Shai, uploaded through the admin panel and optimised by the
`gltf-transform` pipeline in `05-3d-viewer.md`. A generated mesh of an object Shai cannot print is a
promise the site cannot keep.

### 8.11 Admin charts
The admin dashboard's lead volume and conversion charts are drawn from data with the project's charting
stack. A picture of a chart carries no data and goes stale the day it ships.

---

## 9. The authored assets, in full

### 9.1 The mark, favicon and app icons

The mark is an isometric cube: a turquoise top face and two red faces, which is a printed object and a
brand in one shape, legible at 16px because it is three flat colour areas and nothing else.

`src/app/icon.svg` (Next 16 App Router serves this as the favicon automatically):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="shai3d">
  <path d="M256 70 406 156 256 242 106 156Z" fill="#12BFB8"/>
  <path d="M256 242 406 156 406 306 256 392Z" fill="#F5333F"/>
  <path d="M106 156 256 242 256 392 106 306Z" fill="#B2151F"/>
  <path d="M256 70 406 156 406 306 256 392 106 306 106 156Z" fill="none"
        stroke="#1A1420" stroke-width="26" stroke-linejoin="round"/>
  <path d="M256 242 256 392M256 242 106 156M256 242 406 156" fill="none"
        stroke="#1A1420" stroke-width="20" stroke-linecap="round"/>
</svg>
```

Exports, all from that one file:

| file | size | ground | notes |
|---|---|---|---|
| `src/app/icon.svg` | vector | transparent | the browser tab icon |
| `public/favicon.ico` | 32 + 16 | cream `#FFF7EC` | for the old browsers that still ask for it |
| `src/app/apple-icon.png` | 180×180 | cream, **no rounded corners** | iOS applies its own mask |
| `public/icons/icon-192.png` | 192×192 | cream | webmanifest |
| `public/icons/icon-512.png` | 512×512 | cream | webmanifest |
| `public/icons/maskable-512.png` | 512×512 | cream, **cube scaled to 62%** | the safe zone is a circle of 80% diameter, so an unshrunk cube loses its corners |

```bash
node scripts/assets/icons.mjs   # resvg-js → PNG at every size, then oxipng if present
```
The mark never changes colour per surface. One mark, one palette, everywhere.

### 9.2 The paper grain

```python
# scripts/assets/grain.py  →  public/assets/textures/grain-96.png   (~9 KB)
from PIL import Image
import random
random.seed(3)                                   # deterministic: the file is byte-identical every run
N = 96
img = Image.new("LA", (N, N))
img.putdata([(26, random.randint(0, 30)) for _ in range(N * N)])
img.save("public/assets/textures/grain-96.png", optimize=True)
```

Per-pixel independent noise has no spatial correlation, so it tiles seamlessly by construction with no
wrap trick and no seam. The alpha ceiling of 30/255 keeps it under 12 percent opacity before the CSS
opacity is applied. Do not blur it: a blur introduces correlation across the tile edge and the seam
appears immediately.

```css
body::after {
  content: ""; position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  background-image: url("/assets/textures/grain-96.png");
  background-repeat: repeat; opacity: .5; mix-blend-mode: multiply;
}
@media (prefers-reduced-transparency: reduce) { body::after { display: none } }
```

It sits **above** the images on purpose. Laying the same grain over the AI photography and over the cream
DOM ground is what welds them into one surface: the small residual difference between a rendered cream
and `#FFF7EC` stops being readable once both carry the same noise.

### 9.3 The Open Graph composer

```
scripts/build-og.mjs
  → serves src/og/*.html on a local port
  → headless Chrome, --window-size=1200,630, --screenshot, --hide-scrollbars
  → public/og/{home,about,generator,products,contact}.png
  → sips -s format jpeg -s formatOptions 78   →  ≤160 KB each
```

Each `src/og/{route}.html` is a 1200×630 page: the plate from family G as a `background-image` on the
left, a right-aligned Hebrew headline in the site's display face at 64px/900, the mark at 72px in the
lower right, and nothing else. Hebrew is live DOM text in Chrome, which shapes and orders it correctly,
which is the entire reason this route exists instead of a generated share card.

| file | plate | headline |
|---|---|---|
| `og/home.png` | `G01 bright` | `הופך רעיונות לדברים אמיתיים` |
| `og/about.png` | `G02 story` | `לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם` |
| `og/generator.png` | `G01 bright` | `שולחים תמונה, רואים איך היא נראית מודפסת` |
| `og/products.png` | `G01 bright` | `הדגמים שלי` |
| `og/contact.png` | `G01 bright` | `כותבים לי בוואטסאפ` |

Two Chrome traps that bite here: a background tab does not fire `requestAnimationFrame`, so the page can
screenshot before webfonts paint. Pass `--virtual-time-budget=3000` and make the page set
`document.title = 'ready'` only after `document.fonts.ready`. And `--print-to-pdf` style invocations can
hang without exiting; the script polls for the output file and kills the process after 20 seconds.

Product pages do not use this route. `/products/[slug]` sets its OG image from `heroImageUrl`, per
`03-page-architecture.md` §5.4, because a real photo of the actual product beats any composed card.

### 9.4 D09 · the honest product fallback (authored, not generated)

`public/assets/products/fallback.svg`, used when a **published** product has no image. It is flat, it is
obviously a graphic, and no visitor could mistake it for a photograph of a print, which is the point.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="אין תמונה">
  <rect width="400" height="400" fill="#FFF7EC"/>
  <path d="M200 118 292 171 200 224 108 171Z" fill="none" stroke="#D6BC96" stroke-width="10"
        stroke-linejoin="round"/>
  <path d="M200 224 292 171 292 264 200 317Z" fill="none" stroke="#D6BC96" stroke-width="10"
        stroke-linejoin="round"/>
  <path d="M108 171 200 224 200 317 108 264Z" fill="none" stroke="#D6BC96" stroke-width="10"
        stroke-linejoin="round"/>
</svg>
```

The same shape as the mark, drawn in `cream-500` outline instead of brand colour, so it reads as
"this frame is waiting for something" rather than as a broken image.

---

## 10. Production plan

### 10.1 Generation order

The order is by **what unblocks a developer**, not by what appears first on the page. A component with no
image cannot be laid out, reviewed or approved, so the assets that gate the most components go first.

| wave | assets | renders | why here |
|---|---|---|---|
| **0 · calibration** | `B01` alone, 2 variants | 2 | Prove the preamble on the hardest object in the library before spending anything. Run `palette-check` on both. If cream lands under 45 percent, fix the preamble now, not after 37 renders. |
| **1 · the set that sells** | `B02`–`B07`, 2 variants each (`B01` is already shot in wave 0) | 12 | Seven tiles gate the entire generator step 2, and they are the set that must be internally consistent, so they are shot as one continuous run with no prompt edits between them. |
| **2 · the catalog** | `D01`–`D08` | 8 | Unblocks `ProductCard`, `ProductGrid`, filters, sort, badges, the detail page and the admin list, which is the largest single block of buildable UI on the site. |
| **3 · the home page** | `A01` ×4, `A02` ×2, `A03` ×2 | 8 | The hero is the most important frame, and by wave 3 the preamble is proven, so the four variants are spent on composition rather than on debugging colour. |
| **4 · the small stuff** | `A04`, `A05` ×2, `A06`, `C01`–`C06`, `F01`–`F03`, `H01` ×2, `H02` | 16 | All 1K except `H02`. Fast, cheap, and none of it blocks another component. |
| **5 · story and share** | `E01`–`E04`, `G01` ×2, `G02` | 7 | The About page and the OG composer are the last two surfaces built, and `G01` benefits from having seen every object that exists by now. |
| **6 · rerolls** | whatever failed the gate | ~7 | Budget one reroll per five renders. Below that, expect to ship something that failed the 200 percent zoom. |

Waves 1 and 2 can run in parallel with four workers. Wave 0 runs alone and gates everything.

### 10.2 Time and cost

| wave | 2K renders | 1K renders | total |
|---|---|---|---|
| 0 · calibration | 2 | 0 | 2 |
| 1 · print types | 12 | 0 | 12 |
| 2 · catalog | 8 | 0 | 8 |
| 3 · home | 8 | 0 | 8 |
| 4 · small stuff | 1 | 15 | 16 |
| 5 · story and share | 7 | 0 | 7 |
| 6 · rerolls | 5 | 2 | 7 |
| **total** | **43** | **17** | **60** |

- **API wall time, serial:** 43 × 60s + 17 × 25s = 3,005s = **50 minutes**.
- **API wall time, four workers:** about **14 minutes**, plus polling overhead.
- **Human time:** the QA gate is two checks at fifteen seconds each on 60 renders, so about 30 minutes,
  plus roughly 40 minutes of selection across the 10 assets that have variants. Call it **1.5 hours**.
- **Post-processing:** `cwebp` on 37 files, `rembg` on 9, `blur.mjs` once. Under **6 minutes** total.
- **Cost.** Plan at **$0.08 per 2K render and $0.04 per 1K render**: 43 × 0.08 + 17 × 0.04 = **$4.12**.
  Budget **$6** to cover rerolls beyond the allowance. `gen.mjs` appends every task to
  `assets/cost-log.csv` (`id, variant, ratio, res, taskId, ms`), and the per-render figure is corrected
  from the first kie.ai invoice, at which point this line gets edited to the measured number.

### 10.3 Counts

| | count |
|---|---|
| AI-generated assets | **38** |
| files they deliver into `public/` | **37** (`A03` yields two files, and the two `G` plates stay outside `public/` as composer input) |
| API calls including variants and the reroll allowance | **60** |
| authored SVG glyphs | 12 |
| authored icon and favicon files | 6 |
| scripted assets (grain) | 1 |
| composed OG images | 5 |
| real photographs required before launch | 5 (§8.1), plus 6 gallery prints |

### 10.4 Definition of done, per asset

An asset ships when all seven are true:
1. `palette-check.mjs` exits zero against the asset's declared weights.
2. Zoomed to 200 percent it contains no letterform, digit, badge, logo or machine name.
3. Placed beside `B01` on screen, the key direction, shadow softness and object scale match.
4. It contains no human being, face, figure, hand or body part.
5. The WebP is at or under the KB target in its manifest row.
6. Its Hebrew `alt` string is in `src/content/*.ts` and is not the filename.
7. Its blur key exists in `src/lib/blur.generated.ts`, unless it is a cutout with alpha, which never uses
   `placeholder="blur"` because the blur would fill the transparent area with colour.

### 10.5 The five things that will go wrong

1. **A print-type tile comes back at a different distance from the other six.** The 68 percent constant
   is a number the model approximates. Compare the set as a contact sheet before accepting any of it, and
   reroll the outlier rather than accepting a set that is off by one.
2. **Red creeps past 8 percent somewhere in family D.** The gate catches it. Do not wave it through
   because the object looks good alone; it will land in a grid next to a red CTA.
3. **A machine appears with a brand mark on it.** Already measured once. The preamble bans it, and every
   asset that shows any part of a printer also names the ban in `AVOID`.
4. **`rembg` leaves a halo on a cutout.** Almost always the alpha floor was skipped, or `cwebp` ran
   without `-exact`. Both are in the §5.3 command and both are easy to drop.
5. **A raw PNG gets committed.** `assets/_raw/` must be in `.gitignore` on the first commit that creates
   the folder, because 120 MB of PNG in git history does not come out again.

---

## 11. Files this document creates

```
assets/prompts/_preamble.txt          the paragraph in §2, verbatim
assets/prompts/A01.txt … H02.txt      the 38 override blocks
assets/manifest.json                  id, path, ratio, res, delivered, target, variants, post, alt
assets/cost-log.csv                   appended by gen.mjs
scripts/assets/gen.mjs                kie.ai driver, 4 workers, 429 backoff
scripts/assets/palette-check.mjs      the QA gate in §4
scripts/assets/alpha_floor.py         the cutout cleanup in §5.3
scripts/assets/blur.mjs               writes src/lib/blur.generated.ts
scripts/assets/icons.mjs              icon.svg → every raster size
scripts/assets/grain.py               the tile in §9.2
scripts/build-og.mjs                  the composer in §9.3
docs/photo-brief-shai.md              the five shots in §8.1
```

`manifest.json`, one entry, so the shape is not in question:
```json
{
  "id": "B01",
  "family": "print-types",
  "out": "public/assets/print-types/lithophane.webp",
  "prompt": "assets/prompts/B01.txt",
  "ratio": "1:1",
  "res": "2K",
  "variants": 2,
  "deliver": { "w": 720, "h": 720, "maxKB": 75 },
  "cutout": false,
  "expect": { "cream": 66, "white": 20, "ink": 5 },
  "altHe": "פאנל תלת מימד דק ומואר מאחור עם תמונת נוף"
}
```

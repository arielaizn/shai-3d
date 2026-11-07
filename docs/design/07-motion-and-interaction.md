# 07 · שפת התנועה והאינטראקציה
**shai3d · Motion & Interaction Language**

Owner: motion. This file is the single source of truth for every duration, easing, spring, trigger and
state transition on the site. Where an earlier document states a motion value, that value is quoted here
verbatim and kept, or it is amended here explicitly and the amendment is marked **AMENDS**.

Scope: the public site and the generator. The admin panel uses the same tokens with the ambient and
decorative tiers switched off (§13.4).

---

## 0. Decisions at a glance

| Question | Decision |
|---|---|
| Animation library | `motion/react` v12 through `LazyMotion` + `domAnimation` + `m.*` only. 18 KB, not 34 KB |
| CSS or JS | CSS by default. JS only for drag, springs, FLIP layout moves, and the price sequence |
| Named motions | Ten. Every one has a listed home. Nothing animates that is not on the list |
| Overshoot easing | `--ease-toy` `cubic-bezier(0.34, 1.56, 0.64, 1)`, peaks at **+9.8% at 57% of the duration** |
| Scroll entrance | One entrance only, `layer-rise`, a cover wipe that uncovers bottom to top. No fade-up |
| Re-animate on scroll back | Never. `once: true` everywhere |
| Parallax | None. Reason in §6.5 |
| Scroll-linked animation | None, except two IntersectionObserver sentinels that toggle discrete states |
| The hero moment | **היפוך הקלף**, the hero card you turn over. §7 |
| Price first reveal | Lands hard, does not count up. Updates roll. §9 |
| Confetti | No. §9.4 |
| Sound | No. §9.4 |
| View Transitions | Yes, for exactly one route pair, same-document only. §11 |
| Reduced motion | Three tiers, not a blanket kill. **AMENDS** the global rule in doc 01 §3 |
| Frame budget | 14 ms per frame in the Instagram in-app webview on a Snapdragon 6-series. §13 |

### 0.1 What this file amends

1. **doc 01 §3, the `@theme` motion block.** Replaced by §2.4 below. All three existing easing names and
   both existing keyframes (`pop`, `price-slam`) keep byte-identical values. The block grows.
2. **doc 01 §3, the blanket `prefers-reduced-motion` rule.** Replaced by §12.2. The blanket rule
   destroys progress feedback, which is the one thing a reduced-motion user needs most while the
   generator is building.
3. **doc 03 §0.6 versus doc 03 §4.5, the stagger interval.** §0.6 says 60 ms, §4.5 says 40 ms. Both are
   correct for different objects and §5.2 below states which applies where.
4. **doc 05 §A.6 and §B.5** are quoted, not changed. The 320 ms canvas fade, the 380 ms arrival bounce
   with `easeOutBack(1.2)`, the 900 ms `easeOutCubic` camera swing and the 2,600 ms build floor are all
   load-bearing and this file binds to them.

---

## 1. The one idea behind all of it

A 3D printer is a machine that makes a thing appear from the bottom up, one layer at a time, and the
result is a physical object a person picks up and turns over. Those two facts produce the whole
vocabulary: **things arrive by building upward, and things respond when you touch them.**

Everything on the site that moves is doing one of those two jobs. A motion that does neither gets cut.
That is the entire editorial rule, and it is why there is no parallax, no confetti, no floating blobs
beyond the one 14 s hero drift already specified, and no fade-up.

The discipline that keeps it from becoming a children's game: **at most three elements are animating at
any moment on any screen**, and the amount of overshoot is inversely proportional to the size of the
object. A 44 px chip may bounce 10%. A 720 px sheet may bounce 5.7%. A full page may not bounce at all.

---

## 2. The easing set

### 2.1 The five curves

| Token | Value | Character | Measured |
|---|---|---|---|
| `--ease-toy` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | the toy. Genuine overshoot | peak **1.098** at **57%** of the duration, settles by 100% |
| `--ease-toy-big` | `cubic-bezier(0.22, 1.42, 0.36, 1)` | half the bounce, for large surfaces | peak **1.057** at **63%** |
| `--ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | expo-out. Fast start, long tail, no overshoot | 90% of travel done by 32% of the duration |
| `--ease-in-quick` | `cubic-bezier(0.5, 0, 0.75, 0)` | exits. Accelerates away, never returns | 10% of travel in the first 33% |
| `--ease-inout-flow` | `cubic-bezier(0.65, 0, 0.35, 1)` | symmetric. For things already on screen that move | midpoint at exactly 50% |

`linear` is a sixth curve, used only for continuous loops (§5.10). Any easing on an infinite loop puts a
visible pulse at the seam.

### 2.2 The rule for which curve applies

Classify the motion first, then read the row.

| Class | Definition | Curve | Duration rule |
|---|---|---|---|
| **ENTER** | the element was not on screen and now is | see size gate below | §3.2 |
| **EXIT** | the element was on screen and now is not | `--ease-in-quick` | **enter × 0.6**, rounded to the nearest 10 ms |
| **MOVE** | the element stays on screen and changes position, size or colour | `--ease-inout-flow` | §3.2 |
| **PRESS** | a pointer or key is down on a control | `--ease-toy`, 90 ms down / 160 ms up | fixed |
| **AMBIENT** | continuous, unrequested, decorative | `linear` | §5.10 |

**The ENTER size gate.** Measure the element's largest CSS dimension at the moment it enters.

- ≤ 320 px → `--ease-toy`
- 321 px to 720 px → `--ease-toy-big`
- \> 720 px → `--ease-out-soft`
- any element whose primary content is a paragraph the visitor is about to read → `--ease-out-soft`
  regardless of size, because overshoot makes running text illegible during the settle

**MOVE never overshoots.** The eye is already tracking the object continuously, so an overshoot past its
own destination reads as a bug rather than as personality. Bounce is for arrivals.

**Exits are always faster than entrances.** A leaving element has nothing left to say. The 0.6 factor
gives 320 ms in → 190 ms out, 260 ms in → 160 ms out, 520 ms in → 310 ms out.

### 2.3 Where the overshoot is not allowed

`--ease-toy` is banned on: anything wider than 720 px, anything containing an input the visitor may be
mid-typing into, the 3D canvas or its wrapper, the sticky action bar (it would clip through the safe
area), the header, and any transition that changes a colour with no transform component (a colour cannot
overshoot, and the browser will clamp it, producing a hold at the end that reads as lag).

### 2.4 The `@theme` motion block, complete

**File: `src/app/globals.css`.** This replaces the `/* motion */` section of doc 01 §3.

```css
@theme {
  /* ---------- easing ---------- */
  --ease-toy:        cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-toy-big:    cubic-bezier(0.22, 1.42, 0.36, 1);
  --ease-out-soft:   cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-quick:   cubic-bezier(0.5, 0, 0.75, 0);
  --ease-inout-flow: cubic-bezier(0.65, 0, 0.35, 1);

  /* ---------- duration ladder ---------- */
  --dur-1: 90ms;
  --dur-2: 140ms;
  --dur-3: 260ms;
  --dur-4: 320ms;
  --dur-5: 420ms;
  --dur-6: 520ms;
  --dur-7: 900ms;

  /* ---------- ambient loops ---------- */
  --loop-gallery: 28s;
  --loop-gallery-sm: 22s;
  --loop-blob: 14s;
  --loop-cube: 6s;
  --loop-gitd: 2.8s;
  --loop-head: 1.24s;
  --loop-ants: 700ms;

  /* ---------- stagger ---------- */
  --stagger-editorial: 60ms;
  --stagger-grid: 40ms;

  /* ---------- keyframe shorthands ---------- */
  --animate-pop:        pop 260ms var(--ease-toy) both;
  --animate-price-slam: price-slam 420ms var(--ease-toy) both;
  --animate-gitd-pulse: gitd-pulse var(--loop-gitd) ease-in-out infinite;
  --animate-tag-swing:  tag-swing 900ms var(--ease-out-soft) both;
  --animate-burst:      burst 520ms var(--ease-out-soft) both;
  --animate-ants:       ants var(--loop-ants) linear infinite;
  --animate-head-sweep: head-sweep var(--loop-head) linear infinite alternate;
}

/* direction scalars. every lateral motion multiplies by --flow */
:root, [dir="rtl"] { --flow: 1;  --flow-origin: right; }
[dir="ltr"]        { --flow: -1; --flow-origin: left;  }

@keyframes pop {
  0%   { transform: scale(0.88); opacity: 0; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes price-slam {
  0%   { transform: scale(1.65) rotate(-7deg); opacity: 0; }
  55%  { transform: scale(0.94) rotate(2deg);  opacity: 1; }
  100% { transform: scale(1)    rotate(-3deg); opacity: 1; }
}
@keyframes gitd-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
@keyframes tag-swing {
  0%   { transform: rotate(0deg);   }
  18%  { transform: rotate(-14deg); }
  42%  { transform: rotate(8deg);   }
  66%  { transform: rotate(-3deg);  }
  100% { transform: rotate(0deg);   }
}
@keyframes burst {
  0%   { transform: scale(0.2) rotate(0deg);   opacity: 0; }
  38%  { transform: scale(1.05) rotate(9deg);  opacity: 1; }
  100% { transform: scale(1.35) rotate(14deg); opacity: 0; }
}
@keyframes ants {
  to { stroke-dashoffset: -18; }
}
@keyframes head-sweep {
  from { transform: translateX(calc(var(--flow) * -1 * var(--sweep, 0px))); }
  to   { transform: translateX(calc(var(--flow) * var(--sweep, 0px))); }
}
```

`src/lib/motion/tokens.ts` mirrors the easings and durations as plain arrays and numbers, because
`motion/react` cannot read CSS custom properties inside a transition object. The mirror is generated by
`scripts/gen-motion-mirror.mjs` from the same `@theme` block and CI fails on drift, exactly like the
colour mirror in doc 01 §3.

---

## 3. Duration

### 3.1 The ladder

Seven steps. A duration that is not on the ladder is a bug.

| Token | ms | What lives here |
|---|---|---|
| `--dur-1` | 90 | press down, hold-repeat tick, out-of-stock acknowledgement |
| `--dur-2` | 140 | hover in and out, colour transitions, focus ring fade out, press release (×1.14 to 160) |
| `--dur-3` | 260 | `pop`. Small element enters: chip, badge, pip, toast, breakdown row |
| `--dur-4` | 320 | card hover lift, dropdown, canvas cross-fade, FLIP layout move, digit roll |
| `--dur-5` | 420 | the slam, the marker draw, a generator step change, viewer reset |
| `--dur-6` | 520 | `layer-rise`, sheet enter, the burst |
| `--dur-7` | 900 | camera swing, tag pendulum, the idle flip peek |

Above 900 ms nothing is a transition any more. It is a sequence, and a sequence gets a table of its own
(§9, §10).

### 3.2 Distance to duration

Two formulas, one for travel and one for scale. Compute, then snap to the nearest ladder step. Both live
in `src/lib/motion/duration.ts` and both are pure functions, so a reviewer can check any number in the
codebase against them.

```ts
// travel-dominant motion. d = px of travel along the dominant axis
export function travelDuration(d: number): number {
  return snap(clamp(90 + d * 0.8, 140, 520));
}

// scale-dominant motion. s = absolute change in scale factor
export function scaleDuration(s: number): number {
  return snap(clamp(140 + s * 1000, 140, 520));
}

const LADDER = [140, 260, 320, 420, 520];
const snap = (v: number) => LADDER.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
```

`0.8 ms/px` is the constant, which puts a hand-sized object across a 390 px phone screen in about
400 ms. Faster than that and the eye loses the object, slower and the interface feels like it is thinking.

Worked examples, all of which appear in this document:

| Motion | Input | Computed | Snapped |
|---|---|---|---|
| button hover lift | 2 px | 92 | **140** |
| swatch hover lift | 3 px | 92 | **140** |
| toast enter | 16 px | 103 | **140**, overridden to 260 because it also scales 0.06 (`scaleDuration` wins) |
| digit roller | 24 px | 109 | **140**, overridden to 260 for the enter half (`--ease-toy` needs the room) |
| sticky bar rise | 90 px | 162 | **140**, spring instead (§4) |
| mobile nav sheet | 320 px | 346 | **320** |
| `pop` | Δscale 0.12 | 260 | **260** |
| price slam | Δscale 0.71 | 850 | clamped to **520**, overridden to 420 because the keyframe front-loads the travel |

When the two formulas disagree, the larger wins. When a keyframe front-loads its travel (the slam does
71% of its scale change in the first 55% of the animation) the authored duration wins and the override
is written down in the table above. There are three overrides on the whole site and they are all here.

---

## 4. The springs

Four springs, all `motion/react` `{ type: 'spring' }`. Every characteristic below is computed from the
standard damped-oscillator solution that `motion/react` integrates, so the numbers are checkable.

| Name | stiffness | damping | mass | ζ | first peak | overshoot | settled to 1% | Used by |
|---|---|---|---|---|---|---|---|---|
| `spring.flip` | 260 | 22 | 1.1 | 0.650 | 269 ms | **+6.8%** | 488 ms | the hero card flip (§7) |
| `spring.sheet` | 420 | 26 | 1 | 0.634 | 198 ms | **+7.6%** | 374 ms | mobile nav sheet, sticky action bar, filter sheet, product card hover |
| `spring.nudge` | 700 | 34 | 1 | 0.643 | 155 ms | **+7.2%** | 287 ms | FLIP moves: swatch reorder, toast restack, nav underline |
| `spring.stage` | 200 | 30 | 1.2 | 0.968 | none | **0%** | 480 ms | the 3D stage panel, the generator result sheet, anything over 720 px |

`spring.sheet` is doc 03 §0.6's `{ stiffness: 420, damping: 26 }` unchanged. It is now named and its
behaviour is measured rather than asserted.

`spring.stage` is the one that does not bounce, because a 900 px surface that overshoots by 7% travels
63 px past its mark and the visitor sees a mistake instead of a personality.

**Springs never carry `opacity`.** A spring on opacity overshoots past 1, the browser clamps it, and the
result is a flat hold at the end that looks like a dropped frame. Opacity always uses a bezier, even when
it runs alongside a spring on a transform. In `motion/react` this means a per-property transition:

```ts
transition: {
  default: springs.flip,
  opacity: { duration: 0.2, ease: EASE.outSoft },
}
```

---

## 5. The motion vocabulary

Ten motions. Every one has a home, and nothing on the site animates outside this list.

| # | Name | Hebrew | Class | Properties | Duration / spring | Easing |
|---|---|---|---|---|---|---|
| 1 | `pop` | הקפצה | ENTER | `scale`, `opacity` | 260 ms | `--ease-toy` |
| 2 | `layer-rise` | עלייה בשכבות | ENTER | `translateY` on a cover, `translateY` + `scale` on content | 520 ms | `--ease-out-soft` |
| 3 | `slide-flow` | החלקה לפי כיוון | ENTER / EXIT | `translateX` × `--flow`, `opacity` | `spring.sheet` or 320 ms | `--ease-toy-big` |
| 4 | `press` | לחיצה | PRESS | `translateY`, `scale`, zero-blur `box-shadow` | 90 down / 160 up | `--ease-toy` |
| 5 | `lift` | הרמה | MOVE | `translateY`, `rotate`, shadow swap | 140 ms controls / 320 ms cards | `--ease-toy` |
| 6 | `slam` | חבטה | ENTER | `scale`, `rotate` | 420 ms | `--ease-toy` |
| 7 | `build` | בנייה | AMBIENT + progress | `translateY` on a mask, `translateX` on the head | 108 ms per layer, 620 ms per sweep | `steps(1)` + `linear` |
| 8 | `flip` | היפוך | PRESS → ENTER | `rotateY`, `scale`, `translateY`, `rotateZ` | `spring.flip` | spring |
| 9 | `draw` | משיכת קו | ENTER | `scaleX` from `--flow-origin` | 420 ms | `--ease-out-soft` |
| 10 | `drift` | ריחוף | AMBIENT | `translateX` or `rotate` or `opacity` | 2.8 s to 28 s | `linear` |

### 5.1 `pop` · הקפצה

`scale(0.88) → scale(1)` with `opacity(0 → 1)`, 260 ms, `--ease-toy`. Transform origin is the element's
own centre unless it is anchored to a corner of a parent, in which case the origin is that corner (the
swatch check pip pops from its own corner, not from the middle of the tile).

**Homes.** The check pip on a selected swatch. The `+` surcharge pip. The surcharge banner. Every badge in
`ProductCardBadges`. Toasts. Every price-breakdown row. The empty-state block in `CatalogEmptyState`.
Form error and success lines. The `ClosingCta` block on scroll (it is the one section that uses `pop`
rather than `layer-rise`, see §6.4). The uploaded photo thumbnail after a drop. The generator's
"נסה ברזולוציה נמוכה יותר" button at 15 s.

**Never.** On anything over 320 px, on running text, or twice on the same element in one interaction.

### 5.2 `layer-rise` · עלייה בשכבות

The site's only scroll entrance, and the reason the site does not look like every other site.

A cover element, painted in the section's own ground colour, sits over the block. It translates upward
out of the block, uncovering the content from the bottom edge to the top edge, the way a print bed builds
an object. The content underneath is opaque and fully painted the whole time.

```
Cover:    position absolute, inset 0, background var(--reveal-cover), z-index 2
          transform: translateY(0) → translateY(-101%)
          duration 520ms, --ease-out-soft
Content:  transform: translateY(10px) scale(0.985) → translateY(0) scale(1)
          duration 520ms, --ease-out-soft, same start time
Wrapper:  overflow: clip   (clip, not hidden, so it does not create a scroll container)
```

`--reveal-cover` is set per section: `var(--color-cream-100)` on the cream ground, `var(--color-ink-900)`
inside `StoryTeaser`, `var(--color-stage-800)` on the 3D stage panel.

Both animated properties are transforms, so the whole entrance is composited and costs zero repaints.
That is the reason for the cover instead of a `clip-path` inset, which is not reliably composited in
Android WebView and which repaints the entire block every frame.

**Stagger.** Children stagger by physical reading position, which in RTL means the top row right to left,
then the next row.

- **Editorial blocks** (`HowItWorksStrip` step cards, `StoryTeaser` parts, contact channel cards, FAQ
  rows): `--stagger-editorial` **60 ms**, capped at **6** children. The 7th onward arrive with the 6th.
- **Product grids** (`ProductGrid`, `ProductsTeaser`, `RelatedProducts`): `--stagger-grid` **40 ms**,
  capped at **12** children, per doc 03 §4.5. Cards are small, uniform and read as one block, so a
  quicker interval keeps the grid from feeling like a queue.

A 12-card grid at 40 ms costs 440 ms of arrival. A 12-card grid at 60 ms would cost 660 ms, which is long
enough for a visitor to start scrolling past the cards that have not arrived yet.

**Homes.** Every section band on `/`, `/about`, `/products`, `/contact` except the three exceptions in
§6.4.

**Component.** `src/components/motion/Reveal.tsx`:

```tsx
<Reveal as="section" cover="cream" stagger="editorial">…</Reveal>
```

### 5.3 `slide-flow` · החלקה לפי כיוון

The only motion whose direction depends on the writing direction. `translateX(calc(var(--flow) * Npx))`,
which resolves to a positive (rightward, start-edge) offset in RTL and mirrors automatically in LTR.

| Home | N | Timing |
|---|---|---|
| `MobileNavSheet` panel | 100% of 320 px | `spring.sheet`, rows stagger 90 ms from `x: 24px` (doc 03 §2.4) |
| `FilterSheet` (mobile catalog) | 100% of the sheet height, vertical variant | `spring.sheet` |
| `StickyActionBar` | vertical, `y: 100% → 0` | `spring.sheet` |
| Generator step change | 28 px | 320 ms `--ease-toy-big`, outgoing step exits at 190 ms `--ease-in-quick` in the opposite direction |
| Desktop toast | 24 px from the start edge | 260 ms `--ease-toy` |
| `ProductThumbRail` scroll-to-active | measured delta | 320 ms `--ease-inout-flow` |

### 5.4 `press` · לחיצה

The tactile core of the site, and the motion the visitor will trigger more than any other.

```css
.pressable {
  transform: translateY(0);
  box-shadow: var(--shadow-pop);
  transition: transform var(--dur-2) var(--ease-toy),
              box-shadow var(--dur-2) var(--ease-toy),
              background-color var(--dur-2) linear;
}
@media (hover: hover) and (pointer: fine) {
  .pressable:hover { transform: translateY(-2px); box-shadow: var(--shadow-pop-lg); }
}
.pressable:active {
  transform: translateY(4px) scale(0.985);
  box-shadow: 0 0 0 0 var(--color-ink-900);
  transition-duration: var(--dur-1);
}
```

Press is 90 ms down and 160 ms up. The asymmetry is what makes a button feel sprung under a finger: it
gives instantly and returns with a little reluctance. Symmetric press timing feels like a dialog box.

The button travels exactly 4 px down onto a 4 px hard shadow, so at the bottom of the press the object is
sitting on the page. That is doc 01 §7.1's decision and this file keeps it exactly.

Hover styles are inside `@media (hover: hover) and (pointer: fine)` so a tap on a phone never leaves a
button stuck in its hover state after the finger lifts.

**Homes.** `PillButton` all four variants, `ColorSwatch`, `FilterChip`, `QuantityStepper` buttons,
`ProductCard` (via `TiltCard`), `SortSelect`, every admin table action, the print-type tiles, the size
tiles, the thumbnail rail items.

### 5.5 `lift` · הרמה

The hover counterpart to `press`, and the only motion that also removes rotation.

| Object | Rest | Hover / focus-visible | Timing |
|---|---|---|---|
| `PillButton` | `y 0`, `--shadow-pop` | `y -2px`, `--shadow-pop-lg`, fill one ramp step darker | 140 ms `--ease-toy` |
| `ColorSwatch` | `y 0`, `shadow-xs` | `y -3px`, `shadow-sm` | 140 ms `--ease-toy` |
| `ProductCard` / `TiltCard` | `rotate(±2deg)`, `shadow-card` | `rotate(0deg)`, `y -6px`, `shadow-lift` | `spring.sheet` (doc 03 §4.4) |
| `HeroProductCollage` secondary | `rotate(6deg)` | untouched. It is not interactive | none |
| Gallery item with a `productSlug` | none | 2px turquoise ring, `y -3px` | 140 ms |

The card straightening on hover is the second most important tactile decision after the hard shadow: a
tilted object that squares up when you reach for it reads as an object responding to a hand.
`TiltCard.tsx` applies the identical straightening on `:focus-visible`, so a keyboard user gets the same
affordance rather than a ring on a crooked card.

### 5.6 `slam` · חבטה

`price-slam`, 420 ms, `--ease-toy`, `scale 1.65 → 0.94 → 1` and `rotate -7deg → +2deg → -3deg`. Full
choreography in §9. It appears exactly once per generator session and nowhere else on the site. A second
home would spend it.

### 5.7 `build` · בנייה

The print head and the layer mask. Full specification in §10. Two sizes: the 90 px catalog loader
(doc 05 §A.6) and the full generator panel.

### 5.8 `flip` · היפוך

The hero moment. §7.

### 5.9 `draw` · משיכת קו

`scaleX(0) → scaleX(1)` with `transform-origin: var(--flow-origin)`, so the stroke starts at the right
edge in Hebrew, which is where a pen starts.

| Home | Duration | Delay | Notes |
|---|---|---|---|
| `MarkerHighlight` in the hero H1 | 420 ms | 180 ms after the hero paints | doc 03 §3.1, kept exactly |
| `MarkerHighlight` in `StoryTeaser` H2 | 420 ms | on `layer-rise` completion + 120 ms | yellow on the ink ground |
| `StoryTeaser` link underline | 200 ms | on hover | doc 03 §3.6, kept exactly |
| Nav active underline | `spring.nudge` via `layoutId="nav-underline"` | none | it slides between items rather than redrawing |
| Section heading rule in `SectionHeading` | 420 ms | with `layer-rise` | 3px, `turq-500`, 64 px wide |

### 5.10 `drift` · ריחוף

Ambient loops, all `linear`, all composited, all listed here so the count can be audited.

| Home | Property | Period | Notes |
|---|---|---|---|
| `GalleryBand` marquee | `translateX` | 28 s desktop / 22 s mobile | pauses on `:hover` and `:focus-within` (doc 03 §3.5) |
| Hero yellow blob | `rotate(0 → 3deg → 0)` | 14 s | doc 03 §3.1 |
| `CubeGlyph` on a 3D badge | `rotateY(0 → 360deg)` | 6 s | 12×12 SVG (doc 03 §4.4) |
| Glow-in-the-dark preview rim | `opacity 0.55 ↔ 1` | 2.8 s | `ease-in-out`, the one non-linear loop, because a light pulsing linearly looks electrical rather than phosphorescent |
| Print head sweep | `translateX` | 1.24 s, alternate | §10 |
| Dropzone marching ants | `stroke-dashoffset` | 700 ms | only while a file is dragged over the window |

**Hard cap: at most two ambient loops visible at once.** The gallery marquee and the cube glyphs coexist
because the cubes are 12 px. Anything else waits its turn.

---

## 6. Scroll behaviour

### 6.1 What animates on scroll, exhaustively

| Page | Blocks that animate in | Blocks that do not |
|---|---|---|
| `/` | `HowItWorksStrip`, `ProductsTeaser`, `StoryTeaser`, `ClosingCta` | `HomeHero` (plays its own intro), `TrustRow` (part of the hero), `GalleryBand` (already moving) |
| `/products` | `CatalogHeader`, `ProductGrid` (staggered), `CatalogGeneratorStrip`, catalog closing | `ProductFilterBar` (it is chrome, it must be usable at 0 ms) |
| `/products/[slug]` | `ProductSpecTable`, `ProductDescription`, `RelatedProducts`, `MakerNote` | the media stage and the buy panel, both above the fold |
| `/about` | every story section, one at a time | the portrait, which is above the fold |
| `/contact` | channel cards, form, FAQ | the hero |
| `/generator` | nothing | nothing. The generator is an application and its state is driven by the visitor, never by the scroll position |

That is a maximum of four animated blocks per page, and never more than one in a viewport at a time
except the product grid, whose cards count as one block.

### 6.2 Trigger thresholds

`src/lib/motion/useReveal.ts`, one `IntersectionObserver` per page shared by every `Reveal`:

```ts
const observer = new IntersectionObserver(cb, {
  rootMargin: '0px 0px -12% 0px',
  threshold: viewportShort ? 0.15 : 0.25,
});
// viewportShort = window.innerHeight < 700
```

The block fires when 25% of it has entered a viewport whose bottom 12% is treated as off-screen. The
12% bottom margin means the animation starts while the block is still entering, so by the time the
visitor's eye reaches it, it has already finished. An entrance the visitor watches happen is an
entrance that delayed them.

On viewports under 700 px tall the threshold drops to 15%, because a 520 px card cannot reach 25%
visibility inside a 640 px viewport shortened by 12% until it is nearly centred.

Blocks that are already inside the viewport on first paint do not animate at all. `useReveal` checks
`entry.isIntersecting` on the first observer callback, which fires synchronously after observation, and
sets those blocks straight to their rest state. Without this, a visitor landing on `/products#grid` from
a shared link watches the whole grid animate under their cursor.

### 6.3 Re-animation

**Never.** `once: true`, the observer unobserves the element on its first intersection, and the element
keeps a `data-revealed="true"` attribute so a React remount does not replay it.

The reason is not performance. A visitor scrolls back up to re-read something, and re-running the
entrance interrupts exactly the reading they scrolled back for. The second play of a joke is not funny.

The exceptions are not entrances: ambient loops (§5.10) run continuously, and the header state and the
sticky bar are discrete states driven by sentinels, so they flip in both directions by design.

### 6.4 The three deliberate exceptions to `layer-rise`

A single entrance used on every block produces a page with no shape. Three blocks break it on purpose.

1. **`HomeHero` never animates on scroll.** It is above the fold. It plays a one-time intro instead: the
   H1 is present in the HTML with no animation at all (it is the LCP element and animating it would cost
   real LCP milliseconds), the `MarkerHighlight` draws at 180 ms, the collage cards `pop` at 240 ms and
   300 ms, the CTAs `pop` at 360 ms and 400 ms, `TrustRow` fades at 480 ms. Total 700 ms, and the H1 is
   readable at 0 ms throughout.
2. **`GalleryBand` never animates in.** It is already in motion. A moving band that also arrives is two
   motions competing, and the marquee loses.
3. **`ClosingCta` uses `pop`, not `layer-rise`.** Its ground is red. A cover wipe would need a red cover
   over a red ground, which is invisible, and a cream cover over red reads as a flash. The block scales
   from 0.96 with opacity over 320 ms `--ease-toy-big`, its H2 and CTAs stagger at 60 ms behind it.

### 6.5 No parallax, no scroll-linked transforms

Two reasons, both concrete.

Parallax needs a transform recalculated on every scroll frame. In the Instagram in-app webview, scroll is
already the most expensive thing the main thread does, and adding a per-frame transform to it is how a
site starts dropping frames on exactly the device most of Shai's visitors will use.

Parallax also fights the design. Every photograph on this site sits in a white frame with a warm drop
shadow, which says the object is a physical print resting on a table. A print that slides at a different
speed from the table underneath it is not resting on anything.

The two `IntersectionObserver` sentinels that exist (`ScrollSentinel` for the sticky bar, and the
header's 8 px sentinel) toggle a boolean each. They compute nothing per frame.

### 6.6 The header and the sticky bar

| Element | Trigger | Change | Timing |
|---|---|---|---|
| `SiteHeader` | scroll > 8 px, via a 1 px sentinel at the top of `<main>` | gains `bg-cream/92`, `backdrop-blur(12px)`, `border-b border-ink/8` | 180 ms linear (doc 03 §2.3) |
| `StickyActionBar` | `#hero-end` leaves the viewport | `y: 100% → 0` | `spring.sheet` |
| `StickyActionBar` | footer 60% visible | `y: 0 → 100%` | 190 ms `--ease-in-quick` |

`backdrop-filter` is applied and removed as a discrete state, never transitioned. Transitioning a
backdrop filter forces a full-viewport blur recomposite on every frame of the transition, which is a
guaranteed dropped frame on Android. The blur snaps on at 0 ms and only `background-color` and
`border-color` transition over the 180 ms.

---

## 7. THE HERO MOMENT · היפוך הקלף

### 7.1 What it is

The primary photo card in the hero is a card you turn over. The front is the printed object. The back is
the picture the customer sent, the thing that existed before Shai made it real.

You tap it, or you grab it and drag, and it turns over in your hand with weight.

### 7.2 Why this one

The site has two sentences and this interaction is both of them at once.

`הופך רעיונות לדברים אמיתיים`. The gesture is literally turning something over, and what is on the other
side is the idea that became the thing.

`לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם`. The object on screen is a card. Turning a
card over is the physical form of that sentence, and the site never has to say it out loud in the hero.

It also does the commercial job in one move: a visitor who has never seen a lithophane does not know what
"send me a photo" produces. One flip and they have seen the input and the output of the entire business,
before they have read a word of body copy.

### 7.3 Component and structure

`src/components/home/IdeaFlipCard.tsx`, rendered by `HeroProductCollage.tsx` as its primary card. The
collage keeps everything doc 03 §3.1 specifies: the -4deg base tilt, the 14 px white frame, `radius 20px`,
`--shadow-photo`, the +6deg secondary image behind it, and the yellow blob.

```
.flip-scene              perspective: 1400px; perspective-origin: 50% 45%;
  button.flip-card       transform-style: preserve-3d; transform: rotateZ(-4deg) rotateY(var(--ry));
    .face.face-front     backface-visibility: hidden;
    .face.face-back      backface-visibility: hidden; transform: rotateY(180deg);
  .flip-shadow           absolutely positioned under the card, sibling of the button
```

The `<button>` carries `aria-pressed={flipped}` and `aria-label="להפוך את הקלף"`. Both faces stay in the
accessibility tree with the back face marked `aria-hidden` while it faces away, swapped on flip
completion.

**Images.** Front is `settings.heroImageIds[0]`, `priority`, unchanged from doc 03. Back is
`settings.heroImageIds[2]` when present, otherwise `/public/assets/home/hero-idea-back.webp`, with
`fetchPriority="low"` and a hard budget of **45 KB at cwebp q82, max 640 px on the long edge**, so it
never competes with the LCP image.

**Copy on the back**, in Shai's voice, one line under the picture: `ככה זה הגיע אליי.`

**Visible affordance.** A `ChipBadge` on the card's bottom-start corner, ink fill, cream label, reading
`להפוך`. Motion is never the only affordance.

### 7.4 The flip itself

Triggered by click, `Enter`, `Space`, or a drag release past threshold. `rotateY` runs from 0 to
`180deg * var(--flow)`, so it is +180 in RTL and -180 in LTR (§14).

**The rotation channel**, `spring.flip` `{ stiffness: 260, damping: 22, mass: 1.1 }`:

- ζ = 0.650, first peak at **269 ms** reaching **192.2°** (6.8% past)
- settled to within 1° at **488 ms**
- visually at rest by **560 ms**

**The heft channel**, an independent 560 ms keyframe track with `times: [0, 0.26, 0.40, 0.62, 1]` and
`--ease-toy`, because a card that only rotates reads as a CSS trick and a card that also lifts and
wobbles reads as an object in a hand:

| Property | Keyframe values |
|---|---|
| `y` | `0, -12px, -9px, 3px, 0` |
| `scale` | `1, 1.055, 1.04, 0.995, 1` |
| `rotateZ` | `-4deg, -1deg, 2.5deg, -5deg, -4deg` |

**The shadow channel.** `box-shadow` is not animated. `.flip-shadow` is a separate absolutely positioned
element carrying a baked `radial-gradient(ellipse at 50% 50%, rgba(61,39,22,0.28), transparent 70%)` and
animating only `scale` and `opacity`: `scale 1 → 1.18 → 1` and `opacity 1 → 0.55 → 1` over the same
560 ms. Both composited. Interpolating a blur radius on a 420 px card is the single most expensive thing
this page could do and it is banned outright (§13.2).

### 7.5 Drag, which is the part that makes it a toy

A card that only responds after you let go is a button. A card that moves under your finger is an object.

```ts
<m.button
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.12}
  dragMomentum={false}
  style={{ rotateY: useTransform(x, [-140, 140], [-90, 90]) }}
/>
```

The card tracks the finger at roughly 0.64 degrees per pixel, which puts a full 90° quarter-turn at
140 px of drag, about a third of a phone screen.

**Release.** If `|x| > 52px` or `|velocity| > 420px/s`, the flip completes with `spring.flip` carrying the
release velocity in. Otherwise it springs back to 0 with `spring.nudge`, which is stiffer, so a rejected
flip snaps back decisively instead of drooping.

`dragMomentum={false}` because a card with momentum keeps turning after the finger stops, and the visitor
did not ask for that.

Drag is disabled on `pointerType === 'mouse'`. On desktop the card flips on click, and a mouse drag on an
image in a hero is more likely to be an attempted image-drag than an attempted flip.

### 7.6 The idle invitation

Once, and only once per page load:

- **When.** 1,400 ms after the hero's LCP paint (measured from a `PerformanceObserver` on
  `largest-contentful-paint`, not from a raw timer).
- **Conditions, all required.** The visitor has not scrolled, has not touched the card, `document`
  has focus, `prefers-reduced-motion` is not set, the page was not restored from bfcache, and
  `document.documentElement.dataset.motion !== 'lite'` (§13.5).
- **What.** `rotateY: 0 → 12deg × var(--flow) → 0` over 900 ms `--ease-inout-flow`, plus a 2px turquoise
  edge highlight on the card's leading edge fading in and out with it. Twelve degrees is enough to show a
  sliver of the back face and the fact that the card has depth.
- **Never repeats.** No second nudge, no timer loop, no attention-seeking. The badge label does the rest
  of the work.

### 7.7 What the flip does not do

Completing the flip triggers nothing else. No confetti, no CTA pulse, no scroll hint, no chained
animation anywhere on the page. The moment the flip starts causing other things to move, it stops being
an object and becomes a cutscene.

### 7.8 Reduced motion

The flip survives, the spinning does not. Under `prefers-reduced-motion: reduce` the two faces
cross-fade over 120 ms with no rotation, no drag (tap only), no heft channel, no shadow animation and no
idle peek. The information (there is another side, and here it is) is fully preserved.

### 7.9 Fallback

Browsers without `transform-style: preserve-3d` (feature-detected once with
`CSS.supports('transform-style', 'preserve-3d')`) get the reduced-motion cross-fade. The card still works.

---

## 8. Micro-interaction inventory

Every state, every number. Anything not listed here does not animate.

### 8.1 `PillButton` · `src/components/ui/PillButton.tsx`

Variants: `accent` (red-600 fill), `ink`, `play` (turquoise outline), `ghost`.

| State | Visual | Timing | Easing |
|---|---|---|---|
| rest | `y 0`, `--shadow-pop` (`--shadow-pop-red` under a red fill) | | |
| hover | `y -2px`, `--shadow-pop-lg`, fill one ramp step darker (`#DB1F2B` → `#B2151F`) | 140 ms | `--ease-toy` |
| leave | back to rest | 140 ms | `--ease-toy` |
| active | `y 4px`, `scale 0.985`, shadow to `0 0 0 0` | 90 ms | `--ease-toy` |
| release | back to hover or rest | 160 ms | `--ease-toy` |
| focus-visible | doc 01's 3px ink outline, 2px cream gap, 9px turquoise halo | **0 ms in**, 140 ms out | linear |
| loading | label `opacity → 0` over 120 ms, replaced by a 20 px `PrintHead` glyph sweeping the pill interior, `--loop-head` 1.24 s alternate linear. `aria-busy="true"`, width locked to the measured resting width | 120 ms swap | `--ease-in-quick` |
| disabled | `cream-300` fill, `ink-400` label, no shadow, `cursor: not-allowed`, **`transition: none`** | none | |
| success | fill → `--color-success #0E7A43` (180 ms linear), check draws via `stroke-dashoffset` (220 ms `--ease-out-soft`), whole pill `pop` at `scale 1 → 1.04 → 1` (260 ms `--ease-toy`), holds 1,400 ms, returns over 240 ms | see cell | mixed |

A disabled button does not shake, wobble or flash when pressed. A shake reads as a scolding, and half of
this site's visitors are children. Whatever made the button unavailable is stated in text next to it.

The loading width lock matters: the pill is measured with `getBoundingClientRect` before the label swap
and the width is pinned inline. Without it, `להפוך תמונה להדפסה` collapsing to a 20 px glyph reflows the
sticky bar mid-tap.

### 8.2 Colour swatch picker · `ColorSwatch.tsx` + `SwatchGrid.tsx`

| State | Visual | Timing | Easing |
|---|---|---|---|
| rest | 48 px tile, `radius-sm`, 3px `ink-900` ring, `shadow-xs` | | |
| hover | `y -3px`, `shadow-sm` | 140 ms | `--ease-toy` |
| press | `y 1px`, `scale 0.94` | 90 ms | `--ease-toy` |
| select · tile | `scale 1 → 1.12 → 1` | 260 ms | `--ease-toy` |
| select · ring | turquoise ring swap, **0 ms, no transition** | instant | |
| select · pip | `pop`, 40 ms delay behind the tile | 220 ms | `--ease-toy` |
| deselect · pip | `scale 1 → 0.6`, `opacity → 0` | 120 ms | `--ease-in-quick` |
| deselect · tile | nothing | | |
| 5th colour | tile selects normally, plus a `yellow-400` corner pip with `pop` 80 ms behind it, plus the surcharge banner entering with `pop` 260 ms, plus the price `roll` (§9.5) | | |
| out of stock | tap does nothing visually except `opacity 0.45 → 0.6 → 0.45` over 90 ms each way | 180 ms total | linear |
| reorder | FLIP: measure, transform to the old position, animate to 0 with `spring.nudge` | 287 ms settle | spring |

The ring appears with no transition on purpose. A ring that fades in has an ambiguous middle where the
swatch is neither selected nor unselected, and this control decides what the visitor is charged.

Selection is a celebration and deselection is bookkeeping, which is why the timings are asymmetric: 260 ms
in, 120 ms out.

The out-of-stock acknowledgement exists because a tap that produces literally nothing reads as a broken
site. A brief brightening reads as "heard you, no."

**Keyboard.** §12.4.

### 8.3 Upload drop zone · `src/components/generator/UploadDropzone.tsx`

| State | Visual | Timing | Easing |
|---|---|---|---|
| rest | `cream-200` well, `inset-shadow-well`, 2px dashed `ink-400`, `radius-xl` | | |
| hover | border → `turq-700`, fill → `turq-50` | 140 ms | linear |
| dragover (file over the window) | `scale 1.02`, `y -2px`, `shadow-md`, and the border becomes an SVG rect with `stroke-dasharray: 10 8` running `--animate-ants` (700 ms linear infinite) | 140 ms for the lift, loop for the ants | `--ease-toy` + linear |
| dragleave | reverse | 140 ms | `--ease-in-quick` |
| drop / file chosen | thumbnail enters with `pop` 260 ms while the zone's box animates to the thumb height via a `motion/react` `layout` transition | 320 ms | `--ease-inout-flow` |
| invalid file | border → `--color-danger`, error line enters with `pop` 220 ms, `aria-live="polite"`. Border returns to rest on the next valid interaction | 140 ms | linear |
| uploading (only at handoff, §8.8) | 3 px `turq-500` bar under the thumb, `transform: scaleX()` from real byte progress, `transform-origin: var(--flow-origin)` | 180 ms per update | linear |

The zone never shakes on an invalid file. It changes colour and it says what went wrong.

The progress bar uses `scaleX` rather than `width` so it composites. It also fills from the start edge,
which is the right edge in Hebrew (§14.1).

The marching ants are the one paint-level animation on the site, permitted because they run on a single
SVG stroke inside a 320 px box and only while a file is physically being dragged, which is at most a
couple of seconds and never during scroll.

### 8.4 Stepper · `src/components/ui/QuantityStepper.tsx`

The `-` and `+` buttons use `press` unchanged. The number is a vertical roller inside a fixed-height
`overflow: clip` box.

| Event | Old digit | New digit |
|---|---|---|
| increment | `y 0 → -100%`, `opacity 1 → 0`, 120 ms `--ease-in-quick` | `y 100% → 0`, 260 ms `--ease-toy` |
| decrement | `y 0 → 100%`, same 120 ms | `y -100% → 0`, same 260 ms |

Only digits that actually changed animate. Going from 9 to 10 rolls the units digit and pops the new tens
digit with `pop`; going from 19 to 20 rolls both.

**Hold to repeat.** After 420 ms of holding, repeat every 90 ms, and the roller duration drops to 90 ms in
and 60 ms out so it can keep up. The button stays visually pressed for the whole hold, which is the
feedback that the hold is registered.

At the maximum of 25 the `+` becomes `disabled` with no motion, and the replacement line from doc 03 §5.4
enters with `pop` 260 ms.

The roller **does not mirror in RTL** (§14.2). Up is more.

### 8.5 Form fields

| State | Visual | Timing |
|---|---|---|
| rest | `cream-200` fill, 2px `ink-400` border, `radius-sm` | |
| focus | border → `ink-900`, 140 ms linear, plus the focus ring at 0 ms | 140 ms |
| typing | nothing. No character counters that animate, no live validation motion | |
| valid, after blur | 16 px turquoise check enters at the field's end edge with `pop` 220 ms | 220 ms |
| error, after blur or on submit | border → `--color-danger` 140 ms, message enters with `pop` 220 ms, `aria-live="polite"` | 220 ms |
| textarea growth | `field-sizing: content` where supported, otherwise `block-size` animated 160 ms `--ease-inout-flow` | 160 ms |

**No floating labels.** Two reasons: a label that shrinks into the border animates `font-size`, which is a
layout property and is banned by §13.2, and in Hebrew at the shrunk size the descenders of ק, ן and ף
collide with the border stroke. Labels sit above their fields and stay put.

Validation never fires while the visitor is typing. A field that turns red at the third character of a
phone number is a field that is wrong about the visitor before the visitor has finished.

### 8.6 Toasts · `src/components/ui/Toast.tsx`

| Property | Value |
|---|---|
| Position, mobile | bottom centre, `bottom: calc(68px + env(safe-area-inset-bottom) + 12px)`, clear of `StickyActionBar` |
| Position, desktop | top start (top right in RTL), 24 px inset, below the header |
| Enter | `y 16px → 0`, `scale 0.94 → 1`, `opacity 0 → 1`, 260 ms `--ease-toy` |
| Exit | `y 0 → 8px`, `opacity → 0`, 160 ms `--ease-in-quick` |
| Dwell | 4,000 ms info and success, 7,000 ms error |
| Timer | pauses on `:hover` and on `:focus-within`, resumes on leave. Never pauses on mere page-visibility change |
| Stack | maximum 3. A fourth arrives only after the oldest exits (160 ms), survivors move with `spring.nudge` via `layout` |
| Swipe to dismiss | touch only, downward, threshold 40 px or velocity 300 px/s |

Toasts carry `role="status"` for info and success, `role="alert"` for errors.

### 8.7 The price counter · `src/components/ui/PriceTag.tsx` + `src/lib/motion/useCountUp.ts`

Two distinct behaviours, and the distinction carries meaning.

**First reveal in a session: the number lands. It does not count.** Counting up from an invented starting
number turns a real commitment into a slot machine, and the price is the one thing on this site that
must read as a fact. The full ceremony is §9.

**Every subsequent change: the number rolls.**

| Property | Value |
|---|---|
| Digit motion | the §8.4 roller, per digit, only for digits that changed |
| Direction | price **up** → digits roll upward (new digit enters from below). Price **down** → downward. The motion carries the direction of the change, which is the only thing that justifies motion on a number |
| Interpolation | `easeOutQuint` over 320 ms, values rounded to whole shekels |
| Text update rate | throttled to **30 fps** (33 ms minimum between text writes). Each write invalidates the layer, and 60 fps of text repaint on a 4-character number is pure cost |
| The tag itself | `scale 1 → 1.03 → 1` over 220 ms `--ease-toy`. A breath, never a second slam |
| Delta line | `+12 ש״ח` or `-8 ש״ח` enters with `pop` 220 ms below the price, holds 2,400 ms, exits 160 ms. This is what carries the direction for reduced-motion and screen-reader users |

The currency string and the numeral are one `<span dir="ltr" style="unicode-bidi: isolate">` so `45 ש״ח`
renders correctly inside an RTL paragraph while the digits roll.

### 8.8 The WhatsApp CTA, the handoff

The last interaction on the site. It hands the visitor to a person, and it does real work while it does
so (uploading the photo to Convex storage and writing the draft), so its motion is a progress indicator
rather than decoration.

**The popup-blocker constraint comes first and shapes the whole sequence.** `window.open` called after an
`await` has lost its user-gesture context and is blocked in Safari and in in-app webviews. So the window
is opened synchronously inside the click handler and navigated later:

```ts
const win = window.open('', '_blank');          // synchronous, inside the gesture
try {
  const { photoUrl } = await uploadAndSaveDraft();
  const url = buildWaUrl({ ...spec, photoUrl });
  if (win) win.location.href = url; else location.href = url;
} catch {
  const url = buildWaUrl(spec);                  // spec without the photo link
  if (win) win.location.href = url; else location.href = url;
}
```

| t (ms) | What happens |
|---|---|
| 0 | `press`, 90 ms. The physical acknowledgement, before any network work |
| 0 | `window.open('', '_blank')` fires synchronously |
| 90 | label cross-fades to `פותח וואטסאפ` over 120 ms, `PrintHead` glyph sweeps inside the pill, `aria-busy="true"` |
| upload resolves, minimum **420 ms** enforced | fill → `--color-success` over 180 ms, check draws over 220 ms |
| +120 ms after the check | the opened window is navigated to the `wa.me` URL |
| on failure | pill returns to rest over 240 ms, an error line enters with `pop`, and **the WhatsApp link still opens**, carrying the full spec text without the photo link |

The 420 ms floor exists because an upload that resolves in 180 ms produces a state change the visitor
never sees, and they tap again.

Opening WhatsApp without the photo on failure is a product decision, not a motion one, and it is stated
here because the motion has to express it: losing the photo costs Shai one message asking for it again,
and losing the lead costs him the order.

### 8.9 The 3D viewer chrome

| Control | Motion |
|---|---|
| Orbit hint ring on first render | one `scale 1 → 1.06 → 1` + `opacity 0.9 → 0` over 900 ms, once, dismissed permanently by any pointer or key input |
| Reset button | `press`, then camera returns over 420 ms `--ease-out-soft` |
| Lights-off switch (`LightsOffSwitch.tsx`) | the knob travels with `spring.nudge`; the stage's key light dims over 320 ms `--ease-inout-flow`, which is a uniform change and costs nothing |
| Thumbnail rail selection | active thumb ring at 0 ms, rail scrolls to it over 320 ms `--ease-inout-flow` |
| Context loss recovery (doc 05 §A.6) | the poster fades back in over 260 ms, no bounce. A recovering error state must not look celebratory |

---

## 9. The price reveal

The emotional peak of the site, and the one place where the motion budget is deliberately spent all at
once.

### 9.1 Where it lives

`src/components/generator/PriceReveal.tsx`, orchestrating `PriceTag.tsx`. It fires once per draft, at the
moment the build completes and `metrics` resolve into a price. It never fires again in that session.

Before it fires, the space is held by a `cream-200` placeholder plate at exactly the tag's final
dimensions, carrying the line `תכף יהיה מחיר.` There is no layout shift at any point, because the reveal
happens inside a box that was always that size.

### 9.2 The sequence, exact

Total 1,340 ms. Orchestrated with a single `motion/react` timeline, one `useEffect`, no nested timeouts.

| t (ms) | Element | Motion | Duration | Easing |
|---|---|---|---|---|
| 0 | placeholder plate | `opacity 1 → 0`, `scale 1 → 0.96` | 160 | `--ease-in-quick` |
| 120 | yellow burst, an 8-ray star in `--color-price-burst #FFE49B` behind the tag, one inline SVG | `--animate-burst`: `scale 0.2 → 1.05 → 1.35`, `rotate 0 → 14deg`, `opacity 0 → 1 → 0` | 520 | `--ease-out-soft` |
| 160 | the tag | `--animate-price-slam`: `scale 1.65 → 0.94 → 1`, `rotate -7deg → 2deg → -3deg` | 420 | `--ease-toy` |
| 190 | the `PriceCard` surface under it | `y 0 → 6px → 0` | 220 | `--ease-toy` |
| 260 | the 3D stage panel above it | `scale 1 → 0.992 → 1` | 280 | `--ease-toy-big` |
| 540 | the tag's string, origin at the hole | `--animate-tag-swing`: `rotate 0, -14, 8, -3, 0` | 900 | `--ease-out-soft` |
| 580 | breakdown rows, up to 4 | `pop`, 60 ms stagger | 220 each | `--ease-toy` |
| 900 | the WhatsApp pill | `pop` plus `--shadow-pop-red` growing from `0 0 0 0` to `0 4px 0 0` | 260 | `--ease-toy` |
| 1,340 | all participants | `will-change` cleared | | |

### 9.3 The two details that make it physical

**The impact travels.** At t=190 the surface under the tag takes a 6 px hit, and at t=260 the 3D stage
above it flinches by 0.8%. Something landed hard enough to move the furniture. Without those two rows the
slam is a decoration on top of a static page; with them, the page acknowledges it.

**The tag swings.** The price tag is drawn as a physical tag with a punched hole and a short string
(doc 01's `--color-price-tag-string`). After the slam lands, the string runs a damped pendulum with the
origin at the hole. Four keyframes, decaying amplitude, 900 ms. It is the difference between a graphic
of a price tag and a price tag.

### 9.4 What it deliberately does not do

**No confetti.** Confetti is the generic delight tax: 120 elements, a per-frame physics loop, and it says
nothing about this business. The burst plus the travelling impact costs two elements and says something
specific.

**No sound.** A thirteen year old shows this site to friends in a classroom. Unrequested audio in an
Instagram webview is the fastest possible route to a closed tab.

**No second slam, ever.** Every later price change is a `roll` (§8.7). If the slam happened on every
change it would take four colour taps to become annoying and six to become invisible.

### 9.5 Reduced motion

The peak survives as composition rather than as movement:

- the placeholder cross-fades to the tag over 160 ms
- the yellow burst renders as a **static** star behind the tag and stays there permanently. It is the
  loudest yellow on the site and it does the emphasis work that the animation was doing
- the string hangs at its rest angle
- breakdown rows appear with no stagger
- the delta line on later changes is the only signal of direction, and it is text

The principle, stated once and applied everywhere in §12: **reduce the motion, keep the meaning.**

---

## 10. `PrintBuildAnimation` · the modelling sequence

Referenced by doc 05 §A.6 and §B.5 as PART D. This is PART D.

### 10.1 The idea

The visitor's own photograph is the thing being printed. The `ImageBitmap` is already decoded locally for
the geometry pipeline, so it costs nothing extra, and it turns an abstract wait into a preview of the
answer.

### 10.2 The layout

A `stage-800` panel at `radius-2xl`, the same box the r3f canvas will occupy, so the handoff at the end
involves no layout change.

Four layers, all composited, all transform or opacity only:

1. **The plan.** The photo drawn once to a `<canvas>` at panel size, `filter: saturate(0.12) brightness(0.35)` baked into the draw, never animated.
2. **The built band.** The same photo at full saturation, revealed by an opaque `stage-800` mask that
   translates upward in discrete steps.
3. **The hot line.** A 2 px `--color-turq-400` bar at `opacity 0.9`, sitting exactly on the mask's edge and
   travelling with it.
4. **The print head.** A 44 px SVG nozzle glyph, `ink-900` body with a `turq-500` indicator dot, sweeping
   horizontally. `src/components/motion/PrintHead.tsx`, shared with the button loading state and the
   catalog loader. **No brand marks, no logotype, no legible text anywhere in the glyph.**

### 10.3 The timing, which lands exactly on doc 05's floor

| Quantity | Value |
|---|---|
| Layers | **24** |
| Time per layer | **108 ms** |
| Total | 24 × 108 = **2,592 ms**, against doc 05's 2,600 ms minimum |
| Head sweep | one full traverse per layer, 620 ms each way, `--loop-head` 1.24 s `linear alternate` |
| Layer step | `steps(1)` jump on the mask at each direction change of the head, so the layer completes exactly when the head reaches the far edge |
| Layer height | panel height ÷ 24. On a 320 px panel that is 13.3 px |

Cause and effect is visible: the head crosses, a layer appears, the head reverses. That is what a printer
actually does, and it is why the sweep and the step share one clock instead of running on two timers.

### 10.4 The status line

One line under the panel, `aria-live="polite"`, in Shai's voice.

| t (ms) | Text |
|---|---|
| 0 | `קורא את התמונה.` |
| 900 | `בונה שכבות.` |
| 1,900 | `מחשב כמה חומר צריך.` |
| 9,000 | `זה לוקח יותר זמן. עוד רגע.` |
| 15,000 | `אפשר לנסות ברזולוציה נמוכה יותר.` plus a `play`-variant `PillButton` that re-runs the build at a 128 grid |

The 9,000 ms and 15,000 ms thresholds are doc 05 §B.1 Stage 5, kept exactly.

### 10.5 Honesty rules

- The animation always completes all 24 layers even when the real work finished at 400 ms. Doc 05 gates
  the result on `Promise.all([buildPromise, delay(2600)])` and this animation is the reason that gate
  exists. Work that snaps to a result in 400 ms reads as "nothing happened".
- If the real work is still running when layer 24 completes, the head keeps sweeping the top layer and
  the hot line pulses at `--loop-gitd` 2.8 s. It never shows a finished object it does not have.
- There is no percentage number, because the build has no meaningful percentage until the worker returns.
  Twenty-four layers is an honest visual rhythm; "63%" would be a fiction.

### 10.6 The handoff to the 3D object

The built photo does not fade out and get replaced. It becomes the object.

| t (ms) from build completion | What |
|---|---|
| 0 | the print head exits upward, `y 0 → -140%`, 220 ms `--ease-in-quick` |
| 0 | the 2D canvas cross-fades to the r3f canvas over **320 ms** `cubic-bezier(.2,.8,.2,1)` (doc 05 §A.6, kept exactly) |
| 60 | the mesh's arrival bounce, `scale 0.94 → 1.0`, **380 ms**, `easeOutBack(1.2)` (doc 05 §A.6, kept exactly) |
| 60 | the camera swings `azimuth -34° → +8°` over **900 ms** `easeOutCubic` (doc 05 §B.5, kept exactly) |
| 960 | the price reveal begins (§9) |

The price reveal starts after the camera has settled, not during it. Two peaks at once is one peak.

### 10.7 The 90 px catalog variant

Same `PrintHead` glyph over the product poster, 3 layers instead of 24 at 180 ms each, looping, with the
3 px turquoise `useProgress` bar underneath (doc 05 §A.6). No photo processing, no status line.

### 10.8 Cost

Four composited layers, one 108 ms interval timer, zero per-frame JavaScript. This matters because the
worker is saturating a core while it runs, and anything that needs the main thread during the build will
drop frames on the exact device this is designed for.

---

## 11. Next 16 View Transitions

**Decision: yes, for exactly one route pair, same-document only.**

### 11.1 The one place it earns its cost

`/products` → `/products/[slug]`. The product card's photograph and the detail page's hero media are the
same image of the same object. Flying it from the card into the stage is the visual form of picking the
toy up off the shelf, and it removes the moment of disorientation where a visitor has to re-find the
thing they just tapped.

Everything else on both pages cross-fades at the root.

### 11.2 Exact usage

```ts
// next.config.ts
export default {
  experimental: { viewTransition: true },
};
```

The shared name is applied **imperatively, to the activated card only**, on `pointerdown` (and on
`keydown` for Enter and Space), then cleared on `pagehide` and on transition finish:

```ts
// src/components/products/ProductCard.tsx
const onActivate = () => {
  mediaRef.current?.style.setProperty('view-transition-name', `product-media-${slug}`);
};
```

Naming all 24 cards in the stylesheet would make the browser capture 24 separate snapshot layers on every
navigation out of the catalog, for a transition that involves one of them. Naming only the activated card
captures two.

The detail page sets the same name statically on its primary media, because there is only ever one:

```tsx
// src/components/product/ProductMediaStage.tsx
<div style={{ viewTransitionName: `product-media-${slug}` }} />
```

```css
::view-transition-old(root),
::view-transition-new(root) { animation-duration: 180ms; animation-timing-function: linear; }

::view-transition-group(product-media-*) {
  animation-duration: 320ms;
  animation-timing-function: var(--ease-out-soft);
}

/* fixed chrome must own its own group or it double-renders during the capture */
.site-header  { view-transition-name: site-header; }
.sticky-bar   { view-transition-name: sticky-bar; }
::view-transition-group(site-header),
::view-transition-group(sticky-bar) { animation: none; }
```

320 ms for the media, 180 ms for the root, so the object arrives after the page ground has settled rather
than racing it.

### 11.3 Where it is switched off, and why

- **`/generator`.** The page owns a live WebGL context and a running worker. A view transition snapshots
  the whole document, and snapshotting a WebGL canvas in Android WebView produces either a black
  rectangle or a multi-megabyte texture readback. Neither is acceptable on the flagship page.
- **`/admin/*`.** No aesthetic budget, and the admin does bulk operations where an animated navigation is
  latency the operator did not ask for.
- **Cross-document (MPA) transitions.** `@view-transition { navigation: auto }` is **not** used. Every page
  on this site has the same cream ground, so a full-page cross-fade animates cream into cream and buys
  nothing except a delay equal to its own duration.

### 11.4 Fallback and reduced motion

No polyfill. Browsers without `document.startViewTransition` navigate instantly, which is what they do
today and is never worse than the transition.

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
```

---

## 12. Accessibility

### 12.1 The principle

`prefers-reduced-motion` is a request to stop moving things, and it is not a request to stop
communicating. A blanket `animation-duration: 0.01ms` on everything removes the vestibular problem and
also removes the progress indicator on a 3 second build, the direction of a price change, and the fact
that a card has a back. Those are worse outcomes than the one being avoided.

So: three tiers.

### 12.2 The three tiers

**Tier A, removed entirely.** Unrequested, decorative, or looping motion. Nothing is lost because nothing
was being said.

The gallery marquee (becomes a `scroll-snap` overflow scroller with visible arrow buttons, per doc 03
§3.5), the hero yellow blob drift, the `CubeGlyph` rotation (freezes at a three-quarter view, doc 03
§4.4), the glow-in-the-dark pulse (holds at full opacity), the idle flip peek, the orbit hint ring, the
price burst animation (renders static and stays), the impact travel into the 3D stage, `layer-rise` on
every section, all entrance staggers, `autoRotate`, the arrival bounce, the camera swing (the camera
starts at its final azimuth), and the OrbitControls damping glide (doc 05 §A.6).

**Tier B, kept but re-expressed without movement.** Every state change that carries information keeps a
transition, restricted to `opacity`, `background-color`, `border-color` and `box-shadow`. No transforms.

Press feedback becomes a 90 ms fill darkening with no travel. Hover keeps its colour change and drops its
lift. Toasts fade in place. The stepper digit and the price digits cross-fade instead of rolling, and the
price direction is carried entirely by the `+12 ש״ח` delta line. The flip becomes a 120 ms cross-fade.
Sheets and the sticky bar appear and disappear with a 120 ms opacity change.

**Tier C, kept at full strength, with reduced amplitude.** Motion that is the only available feedback.

The build's layer stepping (24 discrete jumps, unchanged) because a three second wait with no feedback is
a worse accessibility outcome than a stepping mask; the head stops travelling and the hot line stops
pulsing, so the moving parts drop from three to one. Real progress bars (`useProgress`, the upload bar)
keep filling. The 3D viewer stays fully interactive.

**Implementation.** This replaces doc 01 §3's blanket rule:

```css
@media (prefers-reduced-motion: reduce) {
  *:not([data-motion="essential"]):not([data-motion="essential"] *),
  *:not([data-motion="essential"]):not([data-motion="essential"] *)::before,
  *:not([data-motion="essential"]):not([data-motion="essential"] *)::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* tier B: give the information-carrying properties their timing back */
  [data-motion="state"] {
    transition-property: opacity, background-color, border-color, box-shadow !important;
    transition-duration: var(--dur-2) !important;
  }
}
```

`data-motion="essential"` goes on the build mask, the hot line, every real progress bar and the digit
roller when it is the only signal. `data-motion="state"` goes on every interactive control. Components
driven by `motion/react` read `useReducedMotion()` and branch to their Tier B or Tier C variant in JS.

The blanket safety net stays for anything nobody remembered to classify, which is the correct default.

### 12.3 Focus-visible

Doc 01 §3 defines the ring: 3 px `ink-900` outline, `outline-offset: 2px`, a 2 px `cream-50` gap and a
9 px 55% `turq-200` halo, with an `.on-stage` variant in cream and turquoise. This file adds the motion
rules.

- **The ring never animates in. 0 ms.** A ring that fades in over 140 ms is a ring a fast tabbing user
  cannot see. It fades out over 140 ms, which is harmless.
- **`:focus-visible` only, never `:focus`,** so a mouse press on a pill leaves no ring behind.
- **Contrast of the ring against what is under it.** On cream the ink ring is 16.97:1. On the red-600 CTA
  fill the ink ring is 3.64:1, which clears the 3:1 non-text requirement of SC 1.4.11, and the 2 px cream
  gap provides a second boundary at 4.84:1. On the stage the cream ring is 17.76:1.
- **Focus cancels an in-flight entrance.** If focus lands on an element that is mid-`layer-rise` or
  mid-`pop`, that element jumps to its rest state immediately (`animate(el, rest, { duration: 0 })`). A
  focus ring that is itself moving is a focus ring that cannot be found, and this is a real bug in most
  animated sites.
- **The skip link.** `דילוג לתוכן`, `translateY(-120% → 0)` over 140 ms `--ease-out-soft` on focus,
  positioned at the start edge.
- **Focus never moves as a side effect of an animation.** `MobileNavSheet` moves focus in on open and
  restores it to the trigger on close (doc 03 §2.4), and nothing else on the site programmatically moves
  focus at all.

### 12.4 Keyboard operation of the colour picker

`SwatchGrid` is `role="group"` with `aria-label="צבעי פילמנט"`. Each swatch is a
`<button role="checkbox" aria-checked>` with `aria-label={nameHe}`. Roving `tabindex`: exactly one tab
stop for the whole grid.

| Key | Action |
|---|---|
| `ArrowLeft` | focus the next swatch in visual order (see §14.2) |
| `ArrowRight` | focus the previous swatch in visual order |
| `ArrowDown` / `ArrowUp` | ± one row, using the measured column count |
| `Home` / `End` | first / last swatch |
| `Space` / `Enter` | toggle selection |
| Hebrew letter | type-ahead to the first colour whose `nameHe` starts with it, 800 ms buffer |
| `Ctrl` + `ArrowLeft` / `ArrowRight` | move a selected swatch earlier or later in the colour order, announced via `aria-live` |

Focus movement itself has **zero** motion. The ring is the feedback, and animating focus between grid
cells makes fast arrow-key navigation feel like wading.

Selecting a fifth colour is allowed, selects normally, and announces
`צבע חמישי מוסיף 12 ש״ח.` through the `aria-live="polite"` region (the amount comes from
`generatorSettings.extraColorSurcharge`, never hardcoded). An out-of-stock swatch is `aria-disabled` with
the visible label `אזל` and is skipped by arrow navigation.

### 12.5 Keyboard operation of the 3D viewer

Wrapper `role="group" aria-label="תצוגה תלת ממדית"`. The canvas is `tabindex="0"` with `aria-describedby`
pointing at a visually hidden line: `חצים לסיבוב, מקשי פלוס ומינוס לזום, אפס לאיפוס.`

| Key | Action | Motion |
|---|---|---|
| `ArrowLeft` / `ArrowRight` | azimuth ∓6° (∓18° with `Shift`) | 140 ms `--ease-out-soft` per press |
| `ArrowUp` / `ArrowDown` | polar ±5°, clamped to the rig's limits from doc 05 §A.2 | 140 ms `--ease-out-soft` |
| held arrow | continuous rotation at 60°/s after a 300 ms delay | continuous |
| `+` / `-` | dolly ±8%, clamped | 140 ms `--ease-out-soft` |
| `0` | reset to the default framing | 420 ms `--ease-out-soft` |
| `Escape` | blur the canvas, return focus to the page flow | none |

Arrow presses `preventDefault` so the page does not scroll under the viewer, while `Tab`, `PageUp` and
`PageDown` are left alone so a keyboard user is never trapped inside the canvas.

Each press animates over 140 ms rather than jumping, because a 6° jump per keypress is invisible and the
user cannot tell whether the key registered.

The canvas focus ring uses the `.on-stage` variant, cream with a turquoise halo.

The turntable fallback (doc 05 §A.6) takes the same `ArrowLeft` / `ArrowRight` keys, one sprite frame per
press, which keeps the keyboard contract identical across all three render paths.

### 12.6 Other guarantees

- No animation on the site flashes more than 3 times per second. The fastest repeating thing is the
  700 ms marching-ants loop, at 1.4 Hz.
- No animation covers or moves text the visitor is reading. `layer-rise` runs before the block is in
  comfortable reading position (§6.2).
- Every `aria-live` region on the site is `polite`, except the form submit error, which is `assertive`.
- Motion never carries information alone. Selection has a pip, price direction has a delta line, progress
  has a status sentence, disabled has a label.

---

## 13. Performance

### 13.1 Properties that may be animated

`transform` (translate, scale, rotate), `opacity`, and `stroke-dashoffset` on strokes under 400 px of
path length. That is the whole list.

Two narrow additions with their justification:

- **Zero-blur `box-shadow` on objects up to 56 px.** The `press` motion animates
  `0 4px 0 0` → `0 6px 0 0` → `0 0 0 0`. A zero-blur shadow is a solid fill, not a blur pass, and on a
  44 to 56 px pill it costs a rectangle. This is the one exception to §13.2's shadow ban and it is the
  motion the site depends on most.
- **`background-color` and `border-color`** on controls, because they carry state and the alternative is
  an instant colour jump that reads as a rendering glitch.

### 13.2 Properties that must never be animated

`width`, `height`, `top`, `right`, `bottom`, `left`, `margin`, `padding`, `inset`, `font-size`,
`letter-spacing`, `line-height`, `border-width`, `clip-path`, `filter: blur()` on anything above 96 px,
`backdrop-filter` (set and cleared as a discrete state only), `background-position` (the turntable
fallback steps it, which is a discrete jump and not a transition), and **any `box-shadow` whose blur
radius changes**.

**Blur radius is never interpolated.** Where a blurred shadow has to grow (the flip card, `TiltCard`
hover), it is faked with a separate absolutely positioned element carrying a baked blurred gradient,
animating only `opacity` and `scale`. Both composited, both free.

Layout-affecting size changes go through `motion/react`'s `layout` prop, which implements them as
transform corrections rather than as real layout animation.

### 13.3 `will-change`

- **Set** on `pointerenter`, `focusin` or `pointerdown`, whichever precedes the motion, or one frame
  before a programmatic animation starts.
- **Cleared** on `transitionend`, `animationend` or `onAnimationComplete`, and unconditionally by an
  800 ms timer, because `transitionend` does not fire on an interrupted transition and a stuck
  `will-change` is a permanently promoted layer.
- **Never** declared in a stylesheet on a class that is always present. `will-change: transform` in a
  static rule on `.product-card` promotes every card in the grid to its own layer for the life of the
  page.
- **Budget: 6 elements maximum at any moment**, enforced by a module-level counter in
  `src/lib/motion/useWillChange.ts`, which refuses beyond 6 and logs in development. On `/generator` the
  cap drops to **3**, because the r3f canvas already owns a large composited layer and the worker owns a
  core.

### 13.4 Frame budget, mid-range Android, Instagram in-app webview

Reference device: Snapdragon 6-series class, Chrome-based WebView 120+, 390×844 CSS px, DPR clamped to 2
by doc 05's `usePerfGovernor`.

- Target 60 fps, 16.7 ms per frame. The in-app webview's own chrome takes about 2 ms. **Working budget
  14 ms.**

| Situation | Allocation |
|---|---|
| Scrolling any page | **0 ms of JavaScript per scroll frame.** No scroll listeners anywhere. The two sentinels are IntersectionObservers. The gallery marquee is a CSS animation on a composited layer, so it survives a busy main thread |
| `layer-rise` running | ≤ 2 ms. Two composited transforms, no repaint |
| The build animation running | worker owns one core and is off the main thread. Main thread ≤ **4 ms**: four composited layers plus one 108 ms interval |
| Orbiting the 3D preview | r3f draw ≤ 8 ms, rAF overhead ≤ 2 ms, everything else ≤ 4 ms |
| The price reveal | ≤ 6 ms peak, six transforms and one opacity across 1,340 ms, never more than three concurrent |
| Idle | 0 ms except ambient loops, which are composited and cost the compositor thread, not the main thread |

**Two hard ceilings.** At most **3 elements animating simultaneously** above the fold on any screen, and
at most **12 composited layers** on the document at once (checkable in the DevTools Layers panel, and it
is a release gate).

### 13.5 The motion governor

`src/lib/motion/useMotionGovernor.ts` samples `requestAnimationFrame` deltas outside the 3D canvas. If 12
consecutive frames exceed 32 ms, it sets `document.documentElement.dataset.motion = 'lite'` for the
session:

- `layer-rise` drops to opacity only, 260 ms
- the gallery marquee stops and becomes a scroller
- the idle flip peek is cancelled
- ambient loops other than the build's hot line stop
- the flip, the press, the price reveal and the build all keep running, because they are the product

It re-tests once on the next route change, so a device that was briefly busy is not punished for the rest
of the session.

### 13.6 Bundle

```ts
// src/components/motion/MotionProvider.tsx
import { LazyMotion, domAnimation, m } from 'motion/react';
```

`domAnimation` is roughly 18 KB against roughly 34 KB for the full `motion` import, and it covers
everything this site uses except `drag`. The hero flip is the only component that needs `drag`, so it
loads `domMax` through a `next/dynamic` boundary that is only reached on the home page.

An ESLint `no-restricted-imports` rule bans `import { motion } from 'motion/react'` project-wide and
directs to `m` instead, because a single stray `motion.div` re-introduces the full feature bundle.

---

## 14. RTL

### 14.1 Motions that mirror

Every one of these multiplies its lateral offset by `var(--flow)` or uses `var(--flow-origin)`, so the
mirroring is one token and never a duplicated stylesheet.

| Motion | How it mirrors |
|---|---|
| `slide-flow` in all its homes | `translateX(calc(var(--flow) * Npx))`. The nav sheet comes from the end (left) edge because that is where the hamburger is (doc 03 §2.4) |
| `draw`, every instance | `transform-origin: var(--flow-origin)`. The marker starts where a Hebrew pen starts, on the right |
| The gallery marquee | travels start to end, right to left, so new photographs arrive from the direction the eye is already moving |
| Entrance staggers | reading order: top row right to left, then the next row |
| The chevron on the `StoryTeaser` link | `rtl:-scale-x-100` (doc 03 §3.6) |
| Every progress bar fill | `scaleX` with `transform-origin: var(--flow-origin)` |
| The hero flip's `rotateY` sign | `+180deg` in RTL so the leading edge that comes toward the viewer is the left one, the way a page turns in a Hebrew book. `-180deg` in LTR |
| Swatch reorder and toast restack | mirror for free. FLIP measures `getBoundingClientRect`, which is already physical |
| The product-media view transition | mirrors for free, same reason |
| Colour-picker arrow keys | `ArrowLeft` advances, `ArrowRight` retreats, matching visual order |

### 14.2 Motions that must not mirror

| Motion | Why |
|---|---|
| **The 3D viewer, drag and keys** | drag right rotates the object right, `ArrowRight` rotates right. A physical object in a 3D space has no writing direction, and mirroring it would mean the object turns away from the finger pushing it |
| **The stepper's digit roller** | up is more. The axis is vertical and the meaning is quantity |
| **The price roll** | same. Up is a higher price in every language |
| **The build's layer direction** | layers build bottom to top because that is how a printer works |
| **The build's head sweep** | the head starts at whichever edge, sweeps, reverses. It is a machine's geometry |
| **The price slam's rotation** (`-7 → +2 → -3`) and the tag's pendulum | a tag on a string swings by gravity. Mirroring physics is how an interface stops feeling physical |
| **`pop`, `press`, `lift`, `slam` scale components** | centre-origin or vertical. There is nothing to mirror |
| **Numerals** | `<span dir="ltr" style="unicode-bidi: isolate">` around every price and quantity, so `45 ש״ח` renders correctly and the digits roll in a stable box |

### 14.3 The implementation rule

No component contains `left:` or `right:` in an animated property, and no component reads `dir` in
JavaScript to pick a direction. Lateral motion is `calc(var(--flow) * …)` and origins are
`var(--flow-origin)`. A reviewer checking RTL correctness greps for `translateX(` and asserts that every
hit contains `var(--flow)`; the exceptions are the six rows in §14.2 and they are commented in place with
`/* physical, does not mirror: see 07 §14.2 */`.

---

## 15. Implementation map

| Path | Contains |
|---|---|
| `src/app/globals.css` | the `@theme` motion block from §2.4, the `--flow` scalars, all seven keyframes |
| `src/lib/motion/tokens.ts` | generated mirror of the easings and durations for `motion/react` |
| `src/lib/motion/duration.ts` | `travelDuration`, `scaleDuration`, `LADDER`, `snap` |
| `src/lib/motion/springs.ts` | the four springs from §4 with their measured characteristics in comments |
| `src/lib/motion/variants.ts` | shared `motion/react` variants: `pop`, `slideFlow`, `layerRise` |
| `src/lib/motion/useReveal.ts` | the shared IntersectionObserver, thresholds from §6.2 |
| `src/lib/motion/useWillChange.ts` | the 6-element budget, 3 on `/generator` |
| `src/lib/motion/useMotionGovernor.ts` | the `data-motion="lite"` sampler from §13.5 |
| `src/lib/motion/useCountUp.ts` | the 30 fps throttled roll from §8.7 |
| `src/components/motion/MotionProvider.tsx` | `LazyMotion` + `domAnimation`, mounted in `layout.tsx` |
| `src/components/motion/Reveal.tsx` | the `layer-rise` wrapper, `cover` and `stagger` props |
| `src/components/motion/StaggerGroup.tsx` | reading-order stagger with the 6 / 12 caps |
| `src/components/motion/PrintHead.tsx` | the shared nozzle glyph, three sizes: 20, 44, 90 |
| `src/components/home/IdeaFlipCard.tsx` | §7, the only component that loads `domMax` |
| `src/components/generator/PrintBuildAnimation.tsx` | §10 |
| `src/components/generator/PriceReveal.tsx` | §9 |
| `src/components/generator/UploadDropzone.tsx` | §8.3 |
| `scripts/gen-motion-mirror.mjs` | parses `globals.css` into `tokens.ts`, CI fails on drift |
| `scripts/lint-motion.mjs` | the greps in §16 |

---

## 16. Review gates

`scripts/lint-motion.mjs` runs in CI and fails the build on any of the first four. The rest are checked by
a human before release.

1. **Every duration is on the ladder.** Grep every `duration:` and every `Nms` in a `transition` or
   `animation` shorthand. Allowed values: 90, 120, 140, 160, 180, 190, 220, 240, 260, 280, 310, 320, 420,
   520, 900, plus the named loops. Anything else fails with the §3.2 formula in the error message.
2. **No banned property is animated.** Grep `transition-property`, `transition:` shorthands and
   `animate={{ … }}` objects for the §13.2 list.
3. **No `will-change` in a stylesheet.** Zero hits allowed outside `useWillChange.ts`.
4. **Every `translateX(` contains `var(--flow)`** unless the line carries the
   `/* physical, does not mirror */` comment.
5. **Count the animating elements** in a viewport during a scroll pass. More than three is a bug.
6. **Count the composited layers** in the DevTools Layers panel on `/` and on `/generator`. More than
   twelve is a bug.
7. **Tab through every page.** The ring appears instantly, nothing under focus is moving, and no element
   traps focus.
8. **Turn on `prefers-reduced-motion` and run the generator end to end.** The build still shows 24 layer
   steps, the price still arrives with its static burst, the delta line still says which way the price
   moved, and the hero card still turns over.
9. **Throttle to 4× CPU slowdown and scroll `/products` on a 390 px viewport.** No frame over 32 ms
   outside the first paint.
10. **Every motion in the codebase appears in the §5 table.** A motion with no named home gets deleted,
    not documented.

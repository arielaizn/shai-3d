# 01 · מערכת הצבע והטוקנים
**shai3d · Colour & Design Token System**
Owner: design foundation. Everything downstream (components, generator, admin, 3D stage) reads from this file only.

Every contrast number in this document was computed with the WCAG 2.1 relative-luminance formula and is reproducible by running `scripts/check-contrast.mjs`. No ratio here is estimated.

---

## 0. Decisions at a glance

| Question | Decision |
|---|---|
| Page ground | `#FFF7EC` cream, everywhere, one ground only |
| Identity accent | `#F5333F` candy red, one red object per viewport |
| CTA fill | `#DB1F2B` (red-600) with `#FFFCF7` label = **4.84:1**, because `#F5333F` with white is 3.87:1 and fails AA |
| Price tag | `#F5333F` fill with `#1A1420` numerals = **4.66:1**, passes AA at every size |
| Secondary action | turquoise, outlined |
| Delight colour | yellow, never structural |
| Elevation on cream | carried by **shadow + radius**, not by surface lightness |
| Shadow tint | warm espresso `rgba(61,39,22,α)` on cream, violet-ink `rgba(12,8,18,α)` on the stage |
| Radius floor | 6px. Nothing on this site has a square corner except the page itself |
| Dark mode | **No.** One ground, one accent, one attention budget |
| Filament swatches | Convex-managed, never hardcoded |

---

## 1. The colour argument, in four sentences

A toy store is not a colourful room. It is a **clean room with loud objects in it**, and the objects win because the room stays quiet. So the cream holds 70-85% of every screen, red holds under 8%, turquoise under 10%, yellow under 3%.

The single move that separates "toy" from "artisan maker studio" is the cool counterweight: cream + red + yellow alone is a bakery, and adding turquoise flips the whole read to plastic, play, collectible. That is why turquoise is a first-class ramp and not a tint.

---

## 2. Ramps

Every ramp is 10 steps. The brand hex is marked **(brand)** and never moves. The `on cream` column is the measured contrast ratio against the page ground `#FFF7EC`, so you can pick a text colour without opening a checker.

### 2.1 Cream (ground)

| Step | Hex | on cream | Role |
|---|---|---|---|
| cream-50 | `#FFFCF7` | 1.04 | text on red/turquoise/ink fills, top-edge highlight |
| **cream-100 (brand)** | `#FFF7EC` | 1.00 | **the page ground** |
| cream-200 | `#FBEFDE` | 1.07 | sunken wells, input rest fill, alternating rows |
| cream-300 | `#F4E3CB` | 1.18 | sunken hover, disabled fill |
| cream-400 | `#E8D2B3` | 1.38 | decorative hairline, `border-subtle` |
| cream-500 | `#D6BC96` | 1.72 | card outline on cream, `border-default` |
| cream-600 | `#B99C74` | 2.45 | decorative only. **Never text** |
| cream-700 | `#927858` | 3.91 | large text only (≥24px, or ≥19px bold) |
| cream-800 | `#6A563E` | 6.56 | warm secondary text where ink reads too cold |
| cream-900 | `#453728` | 10.80 | warm heavy text, story-page pull quotes |

### 2.2 Red (identity + conversion)

| Step | Hex | on cream | cream-50 on it | ink-900 on it | Role |
|---|---|---|---|---|---|
| red-50 | `#FFF1F1` | 1.03 | - | 16.40 | danger-soft fill |
| red-100 | `#FFDDDE` | 1.19 | - | 14.29 | error field wash |
| red-200 | `#FFB9BC` | 1.53 | - | **11.09** | soft badge |
| red-300 | `#FF8A90` | 2.13 | - | **7.98** | glow rim on stage, chart tint |
| red-400 | `#FB5C65` | 2.90 | 3.01 | 5.86 | on-stage red (5.90 on stage-800) |
| **red-500 (brand)** | `#F5333F` | **3.64** | 3.78 | **4.66** | **identity object: price tag, highlighter, full stop** |
| red-600 | `#DB1F2B` | 4.66 | **4.84** | 3.64 | **CTA fill** |
| red-700 | `#B2151F` | **6.55** | **6.79** | - | red as body text, danger text, CTA hover |
| red-800 | `#8A1018` | **9.12** | **9.46** | - | CTA pressed, danger heavy |
| red-900 | `#5E0B10` | 12.91 | - | - | red on red-50 wells |

### 2.3 Turquoise (the counterweight)

| Step | Hex | on cream | ink-900 on it | Role |
|---|---|---|---|---|
| turq-50 | `#EDFCFB` | 1.01 | 17.10 | secondary-button fill, info-soft |
| turq-100 | `#D0F7F4` | 1.08 | 15.70 | selected chip wash |
| turq-200 | `#9DEDE8` | 1.26 | **13.49** | focus halo, tag fill |
| turq-300 | `#63DED7` | 1.53 | **11.13** | on-stage highlight (11.76 on stage-900) |
| turq-400 | `#2ECCC4` | 1.87 | **9.06** | 3D-viewer chrome, orbit hint ring |
| **turq-500 (brand)** | `#12BFB8` | 2.16 | **7.87** | **interactive fill, selected state, slider track** |
| turq-600 | `#0E9C96` | 3.18 | 5.34 | non-text boundary at exactly ≥3:1, icon on cream |
| turq-700 | `#0B7A75` | **4.87** | - | **turquoise as text and as control border** |
| turq-800 | `#085B57` | **7.48** | - | link colour, secondary-button label |
| turq-900 | `#063E3B` | 11.23 | - | heavy turquoise text on turq-50 |

### 2.4 Yellow (delight, rationed hardest)

| Step | Hex | on cream | ink-900 on it | Role |
|---|---|---|---|---|
| yellow-50 | `#FFFAEB` | 1.02 | 17.28 | warning-soft fill |
| yellow-100 | `#FFF2CC` | 1.05 | **16.16** | warning banner ground |
| yellow-200 | `#FFE49B` | 1.18 | **14.44** | sparkle burst behind the price |
| yellow-300 | `#FFD463` | 1.33 | **12.75** | confetti, hover on yellow fill |
| **yellow-400 (brand)** | `#FFC531` | 1.49 | **11.40** | **sunshine fill: star row, "new" pip, success burst** |
| yellow-500 | `#F0AE0C` | 1.84 | **9.24** | pressed state on yellow fill |
| yellow-600 | `#C98C06` | 2.73 | 6.21 | decorative boundary only. **Never text** |
| yellow-700 | `#9C6A06` | **4.41** | - | large text only (≥24px / ≥19px bold) |
| yellow-800 | `#6F4B06` | **7.36** | - | **warning text** (7.01 on yellow-100) |
| yellow-900 | `#4A3205` | 11.30 | - | heavy amber text |

### 2.5 Ink (type + structure)

| Step | Hex | on cream | Role |
|---|---|---|---|
| ink-50 | `#F5F3F6` | 1.04 | cool wash, admin table stripe |
| ink-100 | `#E6E2EA` | 1.20 | disabled fill |
| ink-200 | `#CFC9D5` | 1.52 | disabled border, skeleton bar |
| ink-300 | `#ADA3B6` | 2.27 | placeholder glyph, decorative only |
| ink-400 | `#8B8095` | **3.52** | **control borders** (clears the 3:1 floor of SC 1.4.11), icon-muted |
| ink-500 | `#665C70` | **5.94** | **text-muted** |
| ink-600 | `#4E4557` | **8.55** | **text-secondary** |
| ink-700 | `#372F3F` | 12.05 | body on photography, admin table text |
| ink-800 | `#26202C` | 14.91 | dark pill fill (softer than ink-900) |
| **ink-900 (brand)** | `#1A1420` | **16.97** | **text-primary, toy outline, focus ring, black pill CTA** |

### 2.6 Stage (the 3D backdrop, and only the 3D backdrop)

Deliberately violet-warm, not neutral charcoal, so it descends from ink-900 rather than arriving from a different system.

| Token | Hex | cream-50 on it | Role |
|---|---|---|---|
| stage-950 | `#0C0812` | 19.37 | vignette floor, canvas clear colour edge |
| stage-900 | `#120E18` | **18.62** | canvas clear colour centre-out base |
| stage-800 | `#191320` | **17.76** | stage panel fill behind the canvas |
| stage-700 | `#221B2C` | 16.27 | control bar inside the stage |
| stage-600 | `#2E2639` | 14.13 | hover on stage controls, hairline separator |

---

## 3. The full `@theme` block

**File: `src/app/globals.css`**

`--color-*: initial` wipes Tailwind's stock palette so `bg-blue-500` becomes a build error rather than a slow leak of off-brand colour into the codebase. Everything the project may use is re-declared below.

```css
@import "tailwindcss";

@theme {
  /* ---------- kill the stock palette ---------- */
  --color-*: initial;

  --color-transparent: transparent;
  --color-current: currentColor;
  --color-white: #FFFFFF;
  --color-black: #000000;

  /* ---------- cream ---------- */
  --color-cream-50:  #FFFCF7;
  --color-cream-100: #FFF7EC;
  --color-cream-200: #FBEFDE;
  --color-cream-300: #F4E3CB;
  --color-cream-400: #E8D2B3;
  --color-cream-500: #D6BC96;
  --color-cream-600: #B99C74;
  --color-cream-700: #927858;
  --color-cream-800: #6A563E;
  --color-cream-900: #453728;

  /* ---------- red ---------- */
  --color-red-50:  #FFF1F1;
  --color-red-100: #FFDDDE;
  --color-red-200: #FFB9BC;
  --color-red-300: #FF8A90;
  --color-red-400: #FB5C65;
  --color-red-500: #F5333F;
  --color-red-600: #DB1F2B;
  --color-red-700: #B2151F;
  --color-red-800: #8A1018;
  --color-red-900: #5E0B10;

  /* ---------- turquoise ---------- */
  --color-turq-50:  #EDFCFB;
  --color-turq-100: #D0F7F4;
  --color-turq-200: #9DEDE8;
  --color-turq-300: #63DED7;
  --color-turq-400: #2ECCC4;
  --color-turq-500: #12BFB8;
  --color-turq-600: #0E9C96;
  --color-turq-700: #0B7A75;
  --color-turq-800: #085B57;
  --color-turq-900: #063E3B;

  /* ---------- yellow ---------- */
  --color-yellow-50:  #FFFAEB;
  --color-yellow-100: #FFF2CC;
  --color-yellow-200: #FFE49B;
  --color-yellow-300: #FFD463;
  --color-yellow-400: #FFC531;
  --color-yellow-500: #F0AE0C;
  --color-yellow-600: #C98C06;
  --color-yellow-700: #9C6A06;
  --color-yellow-800: #6F4B06;
  --color-yellow-900: #4A3205;

  /* ---------- ink ---------- */
  --color-ink-50:  #F5F3F6;
  --color-ink-100: #E6E2EA;
  --color-ink-200: #CFC9D5;
  --color-ink-300: #ADA3B6;
  --color-ink-400: #8B8095;
  --color-ink-500: #665C70;
  --color-ink-600: #4E4557;
  --color-ink-700: #372F3F;
  --color-ink-800: #26202C;
  --color-ink-900: #1A1420;

  /* ---------- stage (3D only) ---------- */
  --color-stage-950: #0C0812;
  --color-stage-900: #120E18;
  --color-stage-800: #191320;
  --color-stage-700: #221B2C;
  --color-stage-600: #2E2639;

  /* ---------- semantic: surfaces ---------- */
  --color-surface:          #FFF7EC;
  --color-surface-raised:   #FFFFFF;
  --color-surface-sunken:   #FBEFDE;
  --color-surface-inverse:  #1A1420;
  --color-surface-stage:    #191320;

  /* ---------- semantic: borders ---------- */
  --color-border-subtle: #E8D2B3;
  --color-border-strong: #8B8095;
  --color-border-toy:    #1A1420;
  --color-border-stage:  #2E2639;

  /* ---------- semantic: text ---------- */
  --color-text-primary:       #1A1420;
  --color-text-secondary:     #4E4557;
  --color-text-muted:         #665C70;
  --color-text-on-red:        #1A1420;
  --color-text-on-accent:     #FFFCF7;
  --color-text-on-turquoise:  #1A1420;
  --color-text-on-yellow:     #1A1420;
  --color-text-on-inverse:    #FFFCF7;
  --color-text-on-stage:      #FFFCF7;
  --color-text-stage-muted:   #ADA3B6;
  --color-text-link:          #085B57;
  --color-text-disabled:      #8B8095;

  /* ---------- semantic: accent (the CTA) ---------- */
  --color-accent:         #DB1F2B;
  --color-accent-hover:   #B2151F;
  --color-accent-pressed: #8A1018;
  --color-accent-soft:    #FFF1F1;

  /* ---------- semantic: play (turquoise actions) ---------- */
  --color-play:         #12BFB8;
  --color-play-hover:   #0E9C96;
  --color-play-pressed: #0B7A75;
  --color-play-soft:    #EDFCFB;
  --color-play-border:  #0B7A75;

  /* ---------- semantic: focus ---------- */
  --color-focus-ring: #1A1420;
  --color-focus-gap:  #FFFCF7;
  --color-focus-halo: #9DEDE8;

  /* ---------- semantic: the price tag ---------- */
  --color-price-tag-bg:      #F5333F;
  --color-price-tag-text:    #1A1420;
  --color-price-tag-sub:     #5E0B10;
  --color-price-tag-string:  #1A1420;
  --color-price-burst:       #FFE49B;

  /* ---------- semantic: status ---------- */
  --color-success:        #0E7A43;
  --color-success-soft:   #E4F5EA;
  --color-success-strong: #0A5B32;
  --color-warning:        #FFC531;
  --color-warning-soft:   #FFF2CC;
  --color-warning-text:   #6F4B06;
  --color-danger:         #B2151F;
  --color-danger-soft:    #FFF1F1;
  --color-danger-strong:  #8A1018;

  /* ---------- radius ---------- */
  --radius-xs:   0.375rem;  /*  6px */
  --radius-sm:   0.625rem;  /* 10px */
  --radius-md:   0.875rem;  /* 14px */
  --radius-lg:   1.25rem;   /* 20px */
  --radius-xl:   1.75rem;   /* 28px */
  --radius-2xl:  2.25rem;   /* 36px */
  --radius-3xl:  3rem;      /* 48px */
  --radius-full: 9999px;

  /* ---------- spacing ---------- */
  --spacing: 0.25rem;

  --spacing-tap:        2.75rem;  /* 44px minimum touch target */
  --spacing-tap-lg:     3.5rem;   /* 56px primary CTA height */
  --spacing-gutter:     1.25rem;  /* 20px page gutter, mobile */
  --spacing-gutter-lg:  2.5rem;   /* 40px page gutter, >=1024px */
  --spacing-section:    4.5rem;   /* 72px vertical section rhythm, mobile */
  --spacing-section-lg: 7.5rem;   /* 120px, >=1024px */
  --spacing-swatch:     3rem;     /* 48px filament chip */
  --spacing-content:    68rem;    /* 1088px max content width */

  /* ---------- shadow (warm-tinted, never neutral grey) ---------- */
  --shadow-xs:    0 1px 2px  rgba(61,39,22,0.08);
  --shadow-sm:    0 2px 4px  rgba(61,39,22,0.10), 0 1px 1px rgba(61,39,22,0.06);
  --shadow-md:    0 6px 14px -2px rgba(61,39,22,0.14), 0 2px 4px rgba(61,39,22,0.08);
  --shadow-lg:    0 14px 30px -6px rgba(61,39,22,0.18), 0 4px 8px rgba(61,39,22,0.10);
  --shadow-xl:    0 28px 56px -12px rgba(61,39,22,0.22), 0 8px 16px rgba(61,39,22,0.10);
  --shadow-photo: 0 18px 40px -10px rgba(61,39,22,0.24), 0 3px 8px rgba(61,39,22,0.10);
  --shadow-pop:     0 4px 0 0 #1A1420;
  --shadow-pop-lg:  0 6px 0 0 #1A1420;
  --shadow-pop-red: 0 4px 0 0 #8A1018;
  --shadow-glow-red:  0 12px 40px -8px rgba(245,51,63,0.45);
  --shadow-glow-play: 0 12px 40px -8px rgba(18,191,184,0.42);
  --shadow-glow-gitd: 0 0 64px 0 rgba(166,255,126,0.42);
  --shadow-stage:  0 32px 70px -16px rgba(12,8,18,0.45), 0 6px 14px rgba(12,8,18,0.22);
  --inset-shadow-well: inset 0 2px 4px rgba(61,39,22,0.10);
  --inset-shadow-stage: inset 0 1px 0 rgba(255,252,247,0.10), inset 0 -40px 80px -40px #0C0812;

  /* ---------- motion ---------- */
  --ease-toy:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-quick: cubic-bezier(0.5, 0, 0.75, 0);

  --animate-pop:        pop 260ms var(--ease-toy) both;
  --animate-price-slam: price-slam 420ms var(--ease-toy) both;
  --animate-gitd-pulse: gitd-pulse 2.8s ease-in-out infinite;
}

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

/* ---------- border widths (v4 has no --border-width-* namespace) ---------- */
@utility border-hair  { border-width: 1px; }
@utility border-toy   { border-width: 3px; }
@utility border-frame { border-width: 6px; }
@utility border-photo { border-width: 12px; }

@layer base {
  :root { color-scheme: only light; }
  html  { -webkit-text-size-adjust: 100%; }
  body {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
  }
  ::selection {
    background-color: var(--color-yellow-200);
    color: var(--color-ink-900);
  }
  :focus-visible {
    outline: 3px solid var(--color-focus-ring);
    outline-offset: 2px;
    box-shadow: 0 0 0 2px var(--color-focus-gap), 0 0 0 9px color-mix(in oklab, var(--color-focus-halo) 55%, transparent);
    border-radius: var(--radius-sm);
  }
  .on-stage :focus-visible {
    outline-color: var(--color-cream-50);
    box-shadow: 0 0 0 2px var(--color-stage-900), 0 0 0 9px color-mix(in oklab, var(--color-turq-400) 45%, transparent);
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

**File: `src/lib/design/colors.ts`** mirrors the same hex values as plain constants, because react-three-fiber materials and the Convex seed script cannot read CSS custom properties. The mirror is generated, not hand-typed: `scripts/gen-color-mirror.mjs` parses the `@theme` block and writes the TS file, and CI fails if the file is stale.

---

## 4. Semantic role tokens: the measured ledger

Every row is a real pairing that will exist in the built site. `AA` = 4.5:1 for text under 24px (or under 19px bold), 3:1 for large text and for non-text boundaries under SC 1.4.11.

### 4.1 Text on the cream ground `#FFF7EC`

| Token | Hex | Ratio | Verdict |
|---|---|---|---|
| text-primary | `#1A1420` | **16.97** | AAA |
| text-secondary | `#4E4557` | **8.55** | AAA |
| text-muted | `#665C70` | **5.94** | AA |
| text-link | `#085B57` | **7.48** | AAA |
| text-disabled | `#8B8095` | 3.52 | exempt (SC 1.4.3 disabled exception). Never use for live content |
| danger text | `#B2151F` | **6.55** | AA |
| warning text | `#6F4B06` | **7.36** | AAA |
| success text | `#0E7A43` | **5.09** | AA |
| warm text | `#6A563E` | **6.56** | AA |

### 4.2 The brand colours as text on cream, and their honest substitutes

This is the section that had to be handled honestly.

| Wanted | Hex | Ratio on cream | Verdict | **Substitute you must use instead** |
|---|---|---|---|---|
| red-500 as body text | `#F5333F` | **3.64** | **FAILS AA** for text under 24px | **`red-700 #B2151F` = 6.55** for any red text |
| red-500 as large display text | `#F5333F` | 3.64 | **passes** large-text AA (≥3:1) at ≥24px regular or ≥19px bold | allowed, size-gated |
| red-500 as a non-text object (highlighter box, full stop, bar, icon glyph) | `#F5333F` | 3.64 | **passes** SC 1.4.11 (≥3:1) | allowed |
| red-500 as a button fill with white/cream label | `#F5333F` | white 3.87, cream-50 3.78 | **FAILS AA** | **`red-600 #DB1F2B` with `cream-50` = 4.84** |
| red-500 as a fill with ink label | `#F5333F` | ink-900 **4.66** | **passes AA at every size** | this is why the price tag keeps the exact brand hex |
| red-600 as body text | `#DB1F2B` | **4.66** | passes AA, but reads muddy at 15px | prefer red-700 for text |
| turq-500 as text | `#12BFB8` | **2.16** | **FAILS badly** | **`turq-700 #0B7A75` = 4.87**, or `turq-800 #085B57` = 7.48 for links |
| turq-500 as a control border on cream | `#12BFB8` | 2.16 | **FAILS** SC 1.4.11 | **`turq-700 #0B7A75` = 4.87** for any border that identifies a control |
| turq-500 as a decorative fill or a selected chip with ink label | `#12BFB8` | ink-900 on it **7.87** | passes | allowed |
| yellow-400 as text | `#FFC531` | **1.49** | **FAILS catastrophically** | **`yellow-800 #6F4B06` = 7.36** |
| yellow-400 as a fill with ink label | `#FFC531` | ink-900 on it **11.40** | AAA | this is the only correct way to use yellow with text |
| yellow-400 as a boundary on cream | `#FFC531` | 1.49 | **FAILS** SC 1.4.11 | a yellow shape on cream must carry a `3px ink-900` outline |
| cream-600 as text | `#B99C74` | 2.45 | **FAILS** | `cream-800 #6A563E` = 6.56 |

**One-line rule a developer can hold in their head:** on cream, a brand colour is a *shape*, and ink is the *text*; the moment a brand colour needs to be text, it drops two steps down its ramp.

### 4.3 Text on coloured fills

| Fill | Label token | Ratio | Verdict |
|---|---|---|---|
| accent `#DB1F2B` | text-on-accent `#FFFCF7` | **4.84** | AA at every size |
| accent-hover `#B2151F` | `#FFFCF7` | **6.79** | AAA |
| accent-pressed `#8A1018` | `#FFFCF7` | **9.46** | AAA |
| price-tag `#F5333F` | text-on-red `#1A1420` | **4.66** | AA at every size |
| play `#12BFB8` | text-on-turquoise `#1A1420` | **7.87** | AAA |
| turq-400 `#2ECCC4` | `#1A1420` | **9.06** | AAA |
| yellow-400 `#FFC531` | text-on-yellow `#1A1420` | **11.40** | AAA |
| yellow-100 `#FFF2CC` | warning-text `#6F4B06` | **7.01** | AAA |
| ink-900 `#1A1420` | text-on-inverse `#FFFCF7` | **17.62** | AAA |
| surface-raised `#FFFFFF` | text-primary `#1A1420` | **18.03** | AAA |
| surface-raised `#FFFFFF` | text-muted `#665C70` | **6.31** | AA |
| success `#0E7A43` | `#FFFCF7` | **5.28** | AA |
| success-soft `#E4F5EA` | success-strong `#0A5B32` | **7.26** | AAA |
| danger `#B2151F` | `#FFFCF7` | **6.79** | AAA |
| danger-soft `#FFF1F1` | danger-strong `#8A1018` | **8.81** | AAA |
| turq-50 `#EDFCFB` | turq-800 `#085B57` | **7.53** | AAA |

### 4.4 Text on the 3D stage `#191320`

| Token | Hex | Ratio | Verdict |
|---|---|---|---|
| text-on-stage | `#FFFCF7` | **17.76** | AAA |
| text-stage-muted | `#ADA3B6` | **7.52** | AAA |
| stage accent (turquoise) | `#2ECCC4` | **9.13** | AAA |
| stage accent (yellow) | `#FFC531` | **11.50** | AAA |
| stage red | `#FB5C65` (red-400) | **5.90** | AA. `red-500` here is 4.70, still AA, but red-400 is the on-dark red |
| glow-in-the-dark preview | `#A6FF7E` | **15.64** on stage-900 | AAA |
| **do not use** ink-500 `#665C70` | | 2.88 | fails. ink-400 `#8B8095` = 4.86 is the floor on stage |

### 4.5 Borders and boundaries

| Token | Hex | Ratio vs its ground | Allowed for |
|---|---|---|---|
| border-subtle `#E8D2B3` | on cream | 1.38 | decorative separators only. Never a control edge |
| cream-500 `#D6BC96` | on cream | 1.72 | card outline where the shadow already defines the object |
| **border-strong `#8B8095`** | on cream | **3.52** | inputs, selects, checkboxes, unselected chips. Clears SC 1.4.11 |
| **border-toy `#1A1420`** | on cream | **16.97** | the signature 3px toy outline on cards, swatches, badges |
| play-border `#0B7A75` | on cream | **4.87** | secondary button, selected chip edge |
| border-stage `#2E2639` | on stage-800 | 1.26 | decorative separator inside the dark stage only |

### 4.6 Focus ring

The ring is `ink-900`, and it is legal against **every** surface the site can put behind it. Measured minimum across the whole system:

| Ring `#1A1420` against | Ratio |
|---|---|
| red-500 `#F5333F` (worst case) | **4.66** |
| turq-500 `#12BFB8` | 7.87 |
| yellow-400 `#FFC531` | 11.40 |
| cream-100 `#FFF7EC` | 16.97 |
| surface-raised `#FFFFFF` | 18.03 |

Worst case 4.66 against a 3:1 requirement, so the ring never needs a per-context override on light ground. Inside `.on-stage` the ring inverts to `cream-50 #FFFCF7`, which measures **17.76** against stage-800. The turquoise halo is decorative and carries no compliance load, so a low-contrast halo is safe by construction.

---

## 5. The red rationing rule

### 5.1 The rule

**One red object per viewport.** Not per page, per *viewport*: if two red objects can be on screen at the same scroll position, one of them is wrong.

"Red object" means any element filled with, outlined in, or lettered in `red-400` through `red-700`. `red-50`/`red-100` washes and `danger` states are exempt because they are semantic, not decorative.

### 5.2 Who wins the red

Priority list. The highest-ranked candidate present in the viewport takes the red; everyone below it steps down.

1. **The price tag.** When a price is revealed on screen, the price is the red object. Nothing else.
2. **The one highlighted headline word** (the marker box, or the coloured full stop after a line).
3. **The primary CTA.**
4. **A single badge or pip** (`חדש`, a count, a star).

### 5.3 What "step down" means, concretely

| Element | Red form | Stepped-down form |
|---|---|---|
| primary CTA | `bg-accent text-on-accent` pill | **ink pill**: `bg-ink-900 text-cream-50`, ratio **17.62**, `shadow-pop` in `turq-700` |
| headline accent | `red-500` marker box | `turq-300` marker box with `ink-900` text (**11.13**), or a `yellow-300` underline swash |
| badge | `red-500` pip | `yellow-400` pip with `ink-900` label (**11.40**) |
| section eyebrow | `red-700` text | `turq-800` text (**7.48**) |

### 5.4 Where this bites in practice

- **Hero.** The marker box behind one word is red. The hero CTA is therefore the **ink pill**, which is exactly the pop.vibeliner move and is the reason that hero works.
- **Generator, step screens.** No price yet, so the "המשך" button is the red CTA and every chip, slider and selected state is turquoise.
- **Generator, price reveal.** The price tag is red. The WhatsApp handoff button on that screen is the **ink pill**. It loses no weight: it is the largest, lowest, highest-contrast object on the screen, and the red tag directly above it is what makes the eye arrive there.
- **Product card grid.** Cards carry zero red. Only the hovered or focused card may raise a red price chip, and only one card can be hovered.

### 5.5 Enforcement

`scripts/lint-red-rationing.mjs` runs in CI. It walks the built DOM of every route at 390px and 1440px with a headless pass, collects elements whose computed `background-color`, `border-color` or `color` resolves to any of the four rationed reds, groups them by intersecting viewport band, and fails the build on any band holding more than one. Every intentional red object carries `data-red-object` so the linter reports a name rather than a selector.

---

## 6. When turquoise carries the action

Turquoise takes an action in exactly these four cases:

1. **Secondary action beside a primary.** Outlined pill: `bg-turq-50` + `3px border-play-border #0B7A75` + `text-turq-800 #085B57`. Label ratio **7.53** on the fill, border ratio **4.87** on cream.
2. **The action is exploratory and reversible.** Rotate the model, change a filament, swap the photo, reset the size, "עוד דוגמאות". These invite fiddling, and fiddling is what a toy store is for. Red on a reversible action teaches the visitor to fear clicking.
3. **Red is already spent on the viewport and the action is not the WhatsApp handoff.** Turquoise fill `#12BFB8` with `ink-900` label, **7.87**.
4. **Every selected, active, checked and in-progress state in the generator.** Selected chip, active step dot, slider track and thumb, the orbit-hint ring on the 3D canvas, the upload dropzone in its armed state.

**Turquoise never carries the WhatsApp handoff.** That button is red or ink, never anything else, on every screen of the site. It is the only conversion event that exists, and its colour must never become a variable.

WhatsApp brand green `#25D366` appears nowhere. The WhatsApp glyph renders in `currentColor` so it inherits the button's label token.

---

## 7. Elevation on cream

Cream cannot carry elevation through lightness: `surface-raised #FFFFFF` measures **1.06** against the ground and `surface-sunken #FBEFDE` measures **1.11**. Those differences are real but invisible at a glance, which is fine, because on this site **elevation is a shadow-and-radius language, not a lightness language**. The white of a raised card is there to feel like the thick white photo frame in the gutzim reference, not to signal depth.

Neutral grey shadows on cream turn the ground grey-green and instantly read "corporate". Every shadow is therefore tinted:

- **On cream:** `rgba(61, 39, 22, α)`, a deep espresso. Ink-derived but pushed warm so it sits under a warm ground.
- **On the stage:** `rgba(12, 8, 18, α)`, the violet-ink direction, matching `stage-950`.

| Level | Token | Value | Used by |
|---|---|---|---|
| 0 | none | | flat on ground: section text, dividers |
| 1 | `shadow-xs` | `0 1px 2px rgba(61,39,22,.08)` | chips at rest, table rows |
| 2 | `shadow-sm` | `0 2px 4px rgba(61,39,22,.10), 0 1px 1px rgba(61,39,22,.06)` | inputs, small badges |
| 3 | `shadow-md` | `0 6px 14px -2px rgba(61,39,22,.14), 0 2px 4px rgba(61,39,22,.08)` | product cards at rest |
| 4 | `shadow-lg` | `0 14px 30px -6px rgba(61,39,22,.18), 0 4px 8px rgba(61,39,22,.10)` | card hover, dropdowns, the sticky mobile CTA bar |
| 5 | `shadow-xl` | `0 28px 56px -12px rgba(61,39,22,.22), 0 8px 16px rgba(61,39,22,.10)` | modals, the generator result sheet |
| photo | `shadow-photo` | `0 18px 40px -10px rgba(61,39,22,.24), 0 3px 8px rgba(61,39,22,.10)` | the tilted hero photo card and every framed product shot |
| stage | `shadow-stage` | `0 32px 70px -16px rgba(12,8,18,.45), 0 6px 14px rgba(12,8,18,.22)` | the 3D stage panel |
| well | `inset-shadow-well` | `inset 0 2px 4px rgba(61,39,22,.10)` | sunken surfaces, the upload dropzone, slider tracks |

### 7.1 The hard shadow, which is the toy

`--shadow-pop: 0 4px 0 0 #1A1420` is a zero-blur offset shadow. It is the single most important tactile decision in the system: it makes every button look like a physical thing sitting a few millimetres above the page, and it gives the press a real destination.

```css
.btn {
  box-shadow: var(--shadow-pop);
  transition: transform 140ms var(--ease-toy), box-shadow 140ms var(--ease-toy);
}
.btn:hover  { transform: translateY(-2px); box-shadow: var(--shadow-pop-lg); }
.btn:active { transform: translateY(4px);  box-shadow: 0 0 0 0 #1A1420; }
```

Hover lifts and grows the shadow, press drops the button exactly onto its own shadow. The hover carries the delight through **motion**, which is why `accent-hover` is free to go *darker* (`#B2151F`, cream label **6.79**) instead of brighter. Under `prefers-reduced-motion` the transform is suppressed and the colour change alone carries the state, and it still passes.

`--shadow-pop-red: 0 4px 0 0 #8A1018` is used when the pop shadow sits under a red fill, so the shadow reads as the button's own darker underside rather than as a black bar.

---

## 8. Radius scale

Toy-store means generous rounding, and the justification is per-step rather than global.

| Token | px | Applied to | Why this number |
|---|---|---|---|
| `radius-xs` | 6 | inline code, tiny pips, table cell corners | the floor. Nothing on this site is square, but 6px is where rounding stops being visible on a 16px object |
| `radius-sm` | 10 | inputs, selects, small chips, filament swatches | on a 48px swatch, 10px is 21% of the side: soft enough to read as a rounded tile, tight enough that 18 of them tile cleanly |
| `radius-md` | 14 | dropdowns, tooltips, admin panels | one step above the input it opens from, so the surface reads as sitting on top |
| `radius-lg` | 20 | small cards, the price-tag body, alert banners | the smallest radius that still reads "toy" at card scale |
| `radius-xl` | 28 | product cards, the generator step panels | on a 320px card this is 8.75% of the width, which is the pillowed-plastic zone |
| `radius-2xl` | 36 | the hero photo frame, the 3D stage panel, the result sheet | matches the corner of a phone in a hand, so the stage reads as a screen you are holding |
| `radius-3xl` | 48 | full-bleed feature blocks, the story-page portrait mask | large enough to be an obvious deliberate shape at 600px+ |
| `radius-full` | 9999 | **every button, every badge, every step dot, every avatar** | a pill is the shape a child reads as "press me". No button on this site is a rounded rectangle |

Rule: a container's radius is always at least one step above the radius of whatever it contains, so nested corners never touch.

---

## 9. Border-width scale

Tailwind v4 has no `--border-width-*` theme namespace, so these ship as `@utility` declarations (already in the block above).

| Utility | px | Used by |
|---|---|---|
| `border-hair` | 1 | table rules, decorative dividers, the stage separator |
| `border-2` (stock) | 2 | input rest state, unselected chip |
| `border-toy` | 3 | **the signature.** Card outlines, filament swatches, badges, the secondary button, every input in its focused or selected state |
| `border-frame` | 6 | the white frame around the 3D stage panel |
| `border-photo` | 12 | the thick white frame around the tilted hero photo card and product photography |

3px is the load-bearing choice. 2px reads as a UI border, 4px reads as a comic outline, and 3px is where an element starts to look like a moulded plastic edge without turning into a sticker.

---

## 10. Spacing scale

Base is Tailwind v4's single `--spacing: 0.25rem`, which generates the whole numeric scale (`p-1` = 4px, `p-2` = 8px, and so on). Named tokens carry the layout rhythm:

| Token | Value | Used by |
|---|---|---|
| `spacing-tap` | 44px | minimum interactive height, anywhere |
| `spacing-tap-lg` | 56px | primary CTA and the WhatsApp handoff, on every breakpoint |
| `spacing-gutter` | 20px | page side padding under 1024px |
| `spacing-gutter-lg` | 40px | page side padding at 1024px and above |
| `spacing-section` | 72px | vertical gap between sections, mobile |
| `spacing-section-lg` | 120px | vertical gap between sections, desktop |
| `spacing-swatch` | 48px | filament chip, which drives the swatch grid to 6 columns at 390px |
| `spacing-content` | 1088px | max content width |

Component-internal rhythm uses the 4px scale directly: `gap-2` inside a chip, `gap-3` between chips, `gap-6` between card and card, `gap-10` between a heading and its block. Anything above 40px of vertical space is a section decision and must use a named token so the rhythm stays auditable.

---

## 11. The 3D stage

The stage is the one dark surface on the site. It exists because a printed object rendered against cream loses its silhouette, and a glow-in-the-dark filament against cream is simply invisible.

### 11.1 Canvas

```ts
// src/components/generator/Stage3D.tsx
<Canvas
  gl={{ antialias: true, alpha: false }}
  onCreated={({ gl, scene }) => {
    gl.setClearColor('#120E18', 1);           // stage-900
    scene.fog = new THREE.Fog('#0C0812', 6, 18); // stage-950
  }}
/>
```

A `<radialGradient>` backdrop plane runs `stage-700 #221B2C` at centre to `stage-950 #0C0812` at the edges, so the object sits in a pool of light rather than on a flat black card. A `turq-400 #2ECCC4` rim light at 0.35 intensity from camera-left and a `yellow-300 #FFD463` fill at 0.18 from camera-right keep the palette present inside the render without tinting the filament colours perceptibly.

### 11.2 Meeting the cream page without looking like a hole

Five things, all required:

1. **A 6px `#FFFFFF` frame** (`border-frame`) around the stage panel, at `radius-2xl` (36px). This is the same white frame as the tilted hero photo. It converts the dark rectangle from an absence into an object.
2. **`shadow-stage`** underneath, so it casts onto the cream. A hole does not cast a shadow, so casting one is what settles the argument perceptually.
3. **`inset-shadow-stage`**: a 10% `cream-50` inner highlight along the top edge, which reads as light catching a physical bezel.
4. **Warm bleed**: the stage never starts at full darkness at its border. The outermost 24px of the backdrop gradient carries `stage-700`, which shares the ink hue family with the page text, so the transition is a value step inside one hue family rather than a jump into a foreign colour.
5. **The stage is never full-bleed.** It always sits inside the content column with at least `spacing-gutter` of cream on both sides. A full-bleed dark band would split the page in two.

### 11.3 Colour of the printed object inside the stage

The mesh colour is the customer's chosen filament hex, unmodified. This is a promise about the physical print, so the render must not stylise it. Environment lighting is neutral (`Environment preset="studio"` at `intensity 0.6`) for exactly this reason.

Glow-in-the-dark uses a two-state toggle in the stage control bar: **day state** shows `#CFF3B8` with normal lighting, **dark state** dims all lights to 0.05, sets `emissive: '#A6FF7E'` with `emissiveIntensity: 1.4`, and applies `--shadow-glow-gitd` to the panel. That toggle is a turquoise action per rule 6.2, and it is the single most shareable moment in the generator.

### 11.4 Stage UI chrome

Controls inside the stage live in a `stage-700 #221B2C` bar at `radius-full`, labels in `cream-50` (**16.27**), icons in `turq-300 #63DED7` (**11.76** on stage-900), the active control filled `turq-500` with an `ink-900` label (**7.87**). Everything inside gets `.on-stage` so the inverted focus ring applies.

---

## 12. Filament swatches

### 12.1 They live in Convex

These are **inventory**, not brand. Shai buys a spool, a colour exists; the spool runs out, the colour goes off the grid the same evening. Hardcoding them would mean a deploy every time a 13-year-old restocks, so nothing below appears in the source tree except as a one-time seed script.

**`convex/schema.ts`**

```ts
filaments: defineTable({
  nameHe:            v.string(),   // "אדום סוכריה"
  hex:               v.string(),   // "#D6202B"
  family:            v.union(      // material family
                       v.literal("PLA"),
                       v.literal("PLA_SILK"),
                       v.literal("PLA_GLOW"),
                       v.literal("PLA_WOOD"),
                       v.literal("PETG"),
                     ),
  finish:            v.union(
                       v.literal("matte"),
                       v.literal("gloss"),
                       v.literal("silk"),
                       v.literal("glow"),
                       v.literal("wood"),
                       v.literal("translucent"),
                     ),
  emissiveHex:       v.optional(v.string()),  // glow only, "#A6FF7E"
  roughness:         v.number(),
  metalness:         v.number(),
  transmission:      v.number(),   // 0 for opaque
  clearcoat:         v.number(),
  swatchRingHex:     v.string(),   // always "#1A1420" unless admin overrides
  surchargeAgorot:   v.number(),   // per-colour premium, 0 for standard stock
  inStock:           v.boolean(),
  isActive:          v.boolean(),  // hidden from the generator without deleting history
  sortOrder:         v.number(),
  spoolNote:         v.optional(v.string()), // admin-only, e.g. "נשאר חצי גליל"
  updatedAt:         v.number(),
})
  .index("by_active_sort", ["isActive", "sortOrder"])
  .index("by_family", ["family"]),
```

Queries: `convex/filaments.ts` exposes `listPublic` (active + inStock, ordered by `sortOrder`) and `listAdmin` (everything). Mutations `upsert`, `toggleStock`, `reorder` are auth-gated behind the admin identity. The generator's colour-count surcharge threshold (currently 4 free colours) is **not** on this table; it lives in the `pricingParams` singleton, because it is a pricing rule and not a property of any one spool.

### 12.2 The seed set: 18 swatches

Seeded once via `convex/seed/filaments.ts`, then owned by admin forever.

| # | `nameHe` | hex | family | finish | notes for the r3f material |
|---|---|---|---|---|---|
| 1 | לבן ענן | `#F4F2ED` | PLA | matte | roughness .88, the default for lithophanes |
| 2 | שחור פחם | `#1B191C` | PLA | matte | roughness .90, needs the rim light to read at all |
| 3 | אפור סלע | `#8B8E92` | PLA | gloss | roughness .40 |
| 4 | אדום סוכריה | `#D6202B` | PLA | gloss | roughness .35, the closest spool to the brand red |
| 5 | כתום גזר | `#F2681C` | PLA | gloss | roughness .35 |
| 6 | צהוב שמש | `#FDC42B` | PLA | gloss | roughness .35 |
| 7 | ירוק תפוח | `#4FB53F` | PLA | gloss | roughness .35 |
| 8 | טורקיז בריכה | `#17BEBB` | PLA | gloss | roughness .35 |
| 9 | כחול רויאל | `#2049CE` | PLA | gloss | roughness .35 |
| 10 | סגול ענבים | `#6B3FA0` | PLA | gloss | roughness .38 |
| 11 | ורוד בועה | `#FF8FC1` | PLA | gloss | roughness .35 |
| 12 | בז' חול | `#D9C5A3` | PLA | matte | roughness .85 |
| 13 | חום שוקולד | `#4C3423` | PLA | matte | roughness .88 |
| 14 | זהב משי | `#C6A02C` | PLA_SILK | silk | roughness .18, metalness .55, clearcoat .80 |
| 15 | כסף משי | `#BFC4C9` | PLA_SILK | silk | roughness .16, metalness .60, clearcoat .80 |
| 16 | זוהר בחושך | `#CFF3B8` | PLA_GLOW | glow | emissive `#A6FF7E`, roughness .75, drives the dark-state toggle |
| 17 | עץ אורן | `#A87B4E` | PLA_WOOD | wood | roughness .95, metalness 0, plus a procedural grain normal map |
| 18 | שקוף חלבי | `#E8F0EC` | PETG | translucent | transmission .55, thickness 2.4, ior 1.5, roughness .28 |

### 12.3 How a swatch renders

A filament swatch is a 48px (`spacing-swatch`) tile, `radius-sm` (10px), with a **3px `border-toy #1A1420` ring on every single swatch without exception**. This is not decoration: `לבן ענן #F4F2ED` measures 1.05 against the cream ground and would otherwise be an invisible control, and `שקוף חלבי` has no solid colour at all. The uniform ink ring makes contrast a property of the component instead of a per-colour calculation, so admin can add any spool tomorrow without anyone checking a ratio.

- **Rest:** 3px `ink-900` ring, `shadow-xs`.
- **Hover:** `translateY(-3px)`, `shadow-sm`, ring stays.
- **Selected:** the ring thickens to 3px `turq-700 #0B7A75` **and** a 3px `cream-100` gap **and** a 3px `ink-900` outer ring, plus a `turq-500` check pip at the corner carrying an `ink-900` glyph (**7.87**). Selection is never signalled by colour alone: the pip is a shape.
- **Out of stock:** 45% opacity, a `ink-400` diagonal strike, `aria-disabled`, and the Hebrew label `אזל`.
- **Surcharge:** a `yellow-400` corner pip with an `ink-900` `+` glyph (**11.40**).
- Every swatch carries `aria-label={nameHe}` and a visible label beneath at 12px `text-muted` (**5.94**), because a colour name is information and a colour tile alone is not accessible.
- The 5th selected colour surfaces the surcharge banner in `warning-soft #FFF2CC` with `warning-text #6F4B06` (**7.01**), never in red. It is a price fact, not an error.

---

## 13. Dark mode

**No.**

One ground, one accent, one attention budget: a second palette would double the surface area of the design and halve the care each screen gets, and the only surface that actually needs darkness is the 3D stage, which is dark in every mode anyway. `color-scheme: only light` is set on `:root` so mobile browsers and in-app webviews cannot auto-invert the cream ground into a muddy grey.

---

## 14. Implementation map

| Path | Contains |
|---|---|
| `src/app/globals.css` | the `@theme` block above, the base layer, the keyframes, the `@utility` border widths. Single source of truth |
| `src/lib/design/colors.ts` | generated hex mirror for r3f, Convex seeds and OG-image generation |
| `src/lib/design/shadows.ts` | the same shadow strings as JS constants for Framer Motion variants |
| `scripts/gen-color-mirror.mjs` | parses `globals.css`, writes `colors.ts`. CI fails on drift |
| `scripts/check-contrast.mjs` | asserts every pairing in section 4 against its stated ratio and threshold. Fails the build on regression |
| `scripts/lint-red-rationing.mjs` | the one-red-per-viewport check from section 5.5 |
| `convex/schema.ts` | the `filaments` table |
| `convex/filaments.ts` | `listPublic`, `listAdmin`, `upsert`, `toggleStock`, `reorder` |
| `convex/seed/filaments.ts` | the 18 seed rows, run once |
| `src/components/ui/Button.tsx` | `variant: 'accent' \| 'ink' \| 'play' \| 'ghost'`, `shadow-pop` press behaviour |
| `src/components/ui/PriceTag.tsx` | `price-tag-*` tokens, `animate-price-slam`, the `yellow-200` burst |
| `src/components/generator/SwatchGrid.tsx` | reads `filaments.listPublic`, renders section 12.3 |
| `src/components/generator/Stage3D.tsx` | the stage from section 11 |

### 14.1 The three rules a reviewer checks first

1. Count the red objects in the viewport. More than one is a bug.
2. Any brand colour carrying text under 24px is a bug. Red drops to `red-700`, turquoise to `turq-700`, yellow to `yellow-800`.
3. Any shadow whose rgb is neutral grey is a bug. On cream it is `rgba(61,39,22,α)`, on the stage it is `rgba(12,8,18,α)`.

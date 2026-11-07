# 03 · ארכיטקטורת עמודים
## Page Architecture: Home, Products, Product Detail, Contact, plus global chrome

Scope of this document: the ordered section architecture of the four pages named above, the global
header/footer/mobile-nav/persistent-CTA, the component tree, the Convex reads, and the exact WhatsApp
payloads. Out of scope and owned elsewhere: `/about` and long-form prose (copy agent), `/generator`
(generator agent), `/admin` (admin agent), the asset generation prompts (assets agent). Where this
document writes Hebrew, the headings, CTA labels and microcopy are **design-locked** because they are
load-bearing for layout; body prose is a placeholder the copy agent owns in `src/content/*.ts`.

---

## 0. Ground rules this architecture is built on

### 0.1 Direction
`<html lang="he" dir="rtl">`. Every wireframe below is drawn **right to left**. In every ASCII diagram
the rightmost column is the *start* edge (where the eye lands first) and the leftmost column is the *end*
edge. Use Tailwind logical properties only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
`text-start`, `text-end`). A literal `left-*`, `right-*`, `ml-*`, `mr-*` in this codebase is a bug.

Glyphs inside the ASCII wireframes (`☰` `✕` `✦` `⚙` `⟲` `●` `▸`) are **wireframe notation for
inline SVG icons**, never characters that ship. No emoji and no icon font appear anywhere on this site.
Each one maps to a component: `☰` `MenuGlyph`, `✕` `CloseGlyph`, `✦` `SparkleGlyph`, `⚙` `FilterGlyph`,
`⟲` `RotateGlyph`, `●` `DotGlyph`, `▸` `ChevronGlyph`, all 16×16 with `currentColor` strokes at 1.75px.

### 0.2 The red budget (the rule that keeps the toy-store feel from turning into noise)
Per viewport, `--red` is allowed on **exactly one filled surface**, which is always the primary CTA,
plus punctuation-scale marks (a full stop, a 4px underline, a tag) totalling under 1% of viewport area.
Everything else that wants to shout uses turquoise or yellow. Consequence that matters:

> **The red price tag is reserved for the two price-reveal moments: the product detail page and the
> generator's result.** Product cards in a grid print their price in `--ink`. Four red price tags in a
> grid would spend the whole red budget and the section's CTA would lose.

### 0.3 Colour choreography down the home page
Hero: turquoise marker · red CTA · red full stop.
How it works: yellow step numerals · turquoise panel · red CTA.
Products teaser: turquoise 3D badges · ink prices · red CTA.
Gallery band: no accent at all, photography and white frames only.
Story teaser: ink panel, cream text, yellow marker on one word, turquoise text link (not a red CTA).
Closing band: red is the ground, so the CTA inverts to cream fill with ink text.

### 0.4 Contrast facts (computed, not guessed) that constrain the components
| Pair | Ratio | Verdict |
|---|---|---|
| ink `#1A1420` on cream `#FFF7EC` | 17.2:1 | body text, anything |
| cream on red `#F5333F` | 3.87:1 | **large text only**, so every red CTA label is `1.1875rem / 800` (19px bold clears the 18.66px large-text threshold) |
| red on cream | 3.64:1 | headline accents at ≥ 1.5rem bold only, never body, never a link |
| ink on turquoise `#12BFB8` | 7.97:1 | fine |
| turquoise on cream | 2.16:1 | **fill and stroke only, never text** |
| ink on yellow `#FFC531` | 11.5:1 | fine |
| yellow on cream | 1.49:1 | **fill only, never text, never a stroke that carries meaning** |

### 0.5 Layout constants
```
container      max-inline-size 1240px; padding-inline 20px (<640) / 32px (640-1023) / 40px (>=1024)
band rhythm    padding-block 72px (mobile) / 112px (>=768) / 128px (>=1280)
radii          --radius-card 24px · --radius-media 20px · --radius-pill 999px · --radius-chip 12px
shadow-card    0 18px 40px -18px rgba(26,20,32,.35)
shadow-lift    0 26px 54px -20px rgba(26,20,32,.42)
header         68px (<1024) / 80px (>=1024)
announce bar   36px
type display   clamp(2.5rem, 7vw, 4.75rem) / line-height .95 / letter-spacing -.02em / weight 800
type h2        clamp(2rem, 4.5vw, 3.25rem) / .98 / -.015em / 800
type h3        1.375rem / 1.2 / 700
type body      1.0625rem / 1.7 / 400
type small     .875rem / 1.5 / 500
grid gutter    12px (<640) / 20px (640-1279) / 24px (>=1280)
```
Fonts via `next/font/google`: **Rubik** (variable 400-900, `subsets: ['hebrew','latin']`) as `--font-display`,
**Assistant** (variable 300-800, same subsets) as `--font-body`. Rubik's rounded terminals at 800 are the
chunky toy-store voice; Assistant keeps long Hebrew paragraphs readable. If the tokens spec names other
families, the numeric scale above still stands.

### 0.6 Motion
`motion/react` (Framer Motion v12+). One spring for everything interactive:
`{ type: 'spring', stiffness: 420, damping: 26 }`. Entrances are `opacity 0 -> 1`, `y 16 -> 0`, stagger
60ms, `viewport={{ once: true, amount: .35 }}`. Hover on cards `scale 1.03 + rotate to 0deg`, tap `scale .97`.
Every animated component reads `useReducedMotion()` and drops to opacity-only.

### 0.7 Data fetching pattern (applies to every page below)
Server component fetches with `preloadQuery` from `convex/nextjs`, passes the `Preloaded<...>` down to a
client island that calls `usePreloadedQuery`. Static shells get `export const revalidate = 60`.
Catalog filtering is **client-side over the full published list** with URL search params as the single
source of truth. The catalog is tens of items, not thousands, so a server round-trip per chip press
would be slower and would lose the bouncy feel. `generateStaticParams` for `/products/[slug]` comes from
`fetchQuery(api.products.listSlugs)`.

---

## 1. Convex tables and queries these pages read

Table names and field names are normative. The admin spec may add fields; it may not rename these.

### `products`
```ts
slug: v.string()                       // indexed by_slug
nameHe: v.string()
shortDescHe: v.string()                // <= 90 chars, one clamped line on the card
longDescHe: v.string()                 // \n separated paragraphs
category: v.union(                     // drives filter dimension 1
  v.literal('figures'), v.literal('home'), v.literal('gifts'),
  v.literal('keychains'), v.literal('lithophane'), v.literal('games'), v.literal('utility'))
tags: v.array(v.string())
priceIls: v.number()
priceIsFrom: v.boolean()               // true renders "החל מ-45 ש״ח"
heroImageId: v.id('_storage')
galleryImageIds: v.array(v.id('_storage'))
modelGlbId: v.optional(v.id('_storage'))   // PRESENCE OF THIS = the 3D badge and the 3D viewer
specs: v.object({
  widthMm: v.number(), heightMm: v.number(), depthMm: v.number(),
  weightG: v.number(), printMinutes: v.number(), layerMm: v.number(),
  material: v.union(v.literal('PLA'), v.literal('PETG'), v.literal('TPU'),
                    v.literal('SILK'), v.literal('GLOW')) })
availableColorSlugs: v.array(v.string())   // -> filaments.slug
isFeatured: v.boolean()                    // home teaser
isGlow: v.boolean()                        // yellow "זוהר בחושך" chip
isCustomisable: v.boolean()                // filter feature "אפשר להתאים אישית"
leadTimeDays: v.number()
relatedSlugs: v.optional(v.array(v.string()))
sortOrder: v.number()
status: v.union(v.literal('draft'), v.literal('published'))
createdAt: v.number()
```
Indexes: `by_slug ['slug']` · `by_status_sort ['status','sortOrder']` · `by_status_category ['status','category','sortOrder']` · `by_status_featured ['status','isFeatured','sortOrder']`.

### `filaments`
`slug, nameHe, hex, finish('standard'|'matte'|'silk'|'glow'|'transparent'), isGlow, inStock, surchargeIls, sortOrder`
Index `by_sort ['inStock','sortOrder']`.

### `galleryItems`
`storageId, altHe, captionHe?, productSlug?, sortOrder, isPublished` · index `by_published ['isPublished','sortOrder']`.

### `siteSettings` (singleton, `key: 'main'`, index `by_key`)
```
brandNameHe, whatsappNumber ('972585845083'),
announcementHe, announcementHref, announcementIsActive, announcementVersion (number, drives dismissal key),
responseTimeHe, hours: [{ labelHe, valueHe }],
pickupCityHe, shippingNoteHe, shippingPriceIls, defaultLeadTimeDays,
instagramUrl, tiktokUrl, emailAddress,
trustStats: [{ valueHe, labelHe }]  // exactly 3, home trust row
heroImageIds: [Id<'_storage'>]      // exactly 2, hero collage
noPaymentNoteHe
```

### `leads`
`nameHe, phone, email?, messageHe, source('contact_form'|'product_page'|'generator'), productSlug?, colorSlug?, quantity?, createdAt, status('new'|'read'|'replied'|'closed'), adminNoteHe?`
Index `by_status_created ['status','createdAt']`.

### Queries and mutations
| Function | Args | Used by |
|---|---|---|
| `api.settings.get` | - | header, footer, sticky bar, contact, home trust row |
| `api.products.listPublished` | `{}` | products catalog (full list, filtered client-side) |
| `api.products.listFeatured` | `{ limit: 4 }` | home products teaser |
| `api.products.getBySlug` | `{ slug }` | product detail |
| `api.products.listRelated` | `{ slug, limit: 4 }` | product detail |
| `api.products.listSlugs` | - | `generateStaticParams` |
| `api.products.facets` | - | filter chip counts |
| `api.filaments.listActive` | - | colour picker, colour filter |
| `api.gallery.listPublished` | `{ limit: 14 }` | home gallery band |
| `api.leads.create` | lead fields | contact form, product enquiry fallback |

Every query that returns a product resolves storage ids to URLs server-side and returns
`heroImageUrl`, `galleryImageUrls`, `modelGlbUrl`. Components never see raw storage ids.

---

## 2. Global chrome

### 2.1 Files
```
src/app/layout.tsx
src/components/layout/AnnouncementBar.tsx
src/components/layout/SiteHeader.tsx
src/components/layout/HeaderNavLinks.tsx
src/components/layout/MobileNavSheet.tsx
src/components/layout/Wordmark.tsx
src/components/layout/SiteFooter.tsx
src/components/layout/StickyActionBar.tsx
src/components/layout/ScrollSentinel.tsx
src/components/ui/PillButton.tsx
src/components/ui/MarkerHighlight.tsx
src/components/ui/TiltCard.tsx
src/components/ui/ChipBadge.tsx
src/components/ui/SectionHeading.tsx
src/components/ui/PriceTag.tsx
src/components/ui/ColorSwatch.tsx
src/components/ui/QuantityStepper.tsx
src/components/ui/SparkleGlyph.tsx
src/components/ui/CubeGlyph.tsx
src/lib/whatsapp.ts
src/lib/format.ts
src/lib/filters.ts
src/content/nav.ts
```

### 2.2 Announcement bar
`AnnouncementBar.tsx` (client). Ink `#1A1420` ground, cream text `.8125rem / 600`, 36px tall, centred,
one word wrapped in turquoise. Dismiss X on the end edge writes
`localStorage['shai.announce.v' + announcementVersion] = '1'`; bumping `announcementVersion` in admin
brings it back for everyone. Reads `api.settings.get` -> `announcementHe`, `announcementHref`,
`announcementIsActive`, `announcementVersion`.
Locked default text: `משלוחים לכל הארץ. איסוף עצמי בתיאום.`
Job: it is the first honest promise on the page and it removes the "how do I even get this" objection
before the visitor reaches the CTA.

### 2.3 Header
```
DESKTOP  >=1024   (read right to left)
┌────────────────────────────────────────────────────────────────────────────┐ 36px ink announcement
├────────────────────────────────────────────────────────────────────────────┤
│ [ להפוך תמונה להדפסה ]   יצירת קשר  הסיפור שלי  המחולל  דגמים    ●שי●      │ 80px
│  red pill 44px h                nav 1rem/600 ink, gap 32px      wordmark    │
└────────────────────────────────────────────────────────────────────────────┘

MOBILE  <1024
┌────────────────────────────────────────────┐ 36px announcement
├────────────────────────────────────────────┤
│  ☰                                  ●שי●   │ 68px
└────────────────────────────────────────────┘
```
`SiteHeader.tsx` is `sticky top-0 z-40`. Above 8px scroll it gains
`bg-cream/92 backdrop-blur-[12px] border-b border-ink/8` with a 180ms transition; at the top it is
transparent so the hero reads full-bleed. The wordmark sits on the **start (right)** edge because that is
where a Hebrew reader's eye lands. The hamburger takes the **end (left)** edge, the mirror of the LTR
convention.

Nav (`src/content/nav.ts`): `דגמים` `/products` · `המחולל` `/generator` · `הסיפור שלי` `/about` · `יצירת קשר` `/contact`.
The active route gets a 3px turquoise underline drawn with `layoutId="nav-underline"` so it slides between items.
Desktop header CTA is the **generator**, not WhatsApp. The generator produces a spec and a price, so a
visitor who arrives there hands over a far better WhatsApp message than one who taps a bare chat link.

`Wordmark.tsx` reads `settings.brandNameHe` (default `שי איזנשטט`). The lockup itself belongs to the
identity spec; this component only reserves a 132×40 box and links to `/`.

### 2.4 Mobile navigation
`MobileNavSheet.tsx`, a full-height sheet that slides in **from the end (left) edge**, the same edge the
hamburger sits on, so the panel visibly comes out from under the finger that opened it.
```
┌──────────────────────────────────┐
│  ✕                               │  56px
│                                  │
│                        דגמים     │  each row 2rem/800 Rubik, right aligned,
│                        המחולל    │  56px tall, 90ms stagger, spring from x:24
│                   הסיפור שלי     │
│                    יצירת קשר     │
│                                  │
│  ┌────────────────────────────┐  │
│  │  להפוך תמונה להדפסה        │  │  red pill, full width, 56px
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │  לכתוב לשי בוואטסאפ        │  │  ink outline pill, 56px
│  └────────────────────────────┘  │
│                                  │
│  אינסטגרם · טיקטוק               │  .875rem, ink/60
└──────────────────────────────────┘
```
Mechanics: `inert` on `<main>` while open, `overflow: hidden` plus `scrollbar-gutter: stable` on `<html>`,
focus trap, `Escape` closes, the trigger regains focus on close. Route change closes it via
`usePathname()` effect.

### 2.5 The persistent WhatsApp affordance: a sticky bar, not a floating bubble

**Decision: `StickyActionBar.tsx`, a sticky bottom bar below 1024px only. No floating bubble anywhere on
the site.** Reasons, in order of weight:

1. A bubble carries an icon and nothing else. The thing that converts here is a *sentence with a number*
   in it (`שולחים לשי · 45 ש״ח`). A bar carries a label, a price and a secondary action; a bubble carries
   a third of that.
2. The canonical WhatsApp bubble is `#25D366`. That is a fifth chroma outside the locked palette and it
   would out-shout the red CTA on every screen, which breaks the red budget in §0.2 permanently.
3. Corner placement is genuinely hostile in RTL. Mirrored to bottom-start (right) it lands on the
   Android gesture strip's dominant zone; moved to bottom-end (left) it sits on the iOS Safari
   back-swipe edge. A full-width bar owns the safe area cleanly with `env(safe-area-inset-bottom)`.
4. On a 2-up mobile product grid a bubble permanently covers one card's price. A bar reserves its own
   space with `padding-block-end` on `<main>` and covers nothing.
5. In RTL a bar states the hierarchy without ambiguity: primary label on the start edge, price or
   secondary on the end edge. A single bubble tells the visitor nothing about which action is primary.

Anatomy:
```
MOBILE <1024, fixed bottom
┌──────────────────────────────────────────────────┐
│  ┌────────────────────────────────┐  ┌────────┐  │  68px + safe-area
│  │   להפוך תמונה להדפסה           │  │  דגמים │  │  red pill flex-1 · ghost 96px
│  └────────────────────────────────┘  └────────┘  │
└──────────────────────────────────────────────────┘
bg cream/96 · backdrop-blur 12px · border-t ink/10 · shadow 0 -8px 30px -18px rgba(26,20,32,.3)
```
Variants (`variant` prop):
| variant | primary (red) | secondary | used on |
|---|---|---|---|
| `generator` | `להפוך תמונה להדפסה` -> `/generator` | `דגמים` -> `/products` | home, about, gallery |
| `product` | `שליחה לשי בוואטסאפ` -> wa.me with the full spec | live price in `PriceTag` mini | `/products/[slug]` |
| `catalog` | `להפוך תמונה להדפסה` -> `/generator` | `וואטסאפ` -> wa.me generic | `/products` |
| `contact` | `פתיחת וואטסאפ` -> wa.me generic | `למלא טופס` -> scrolls to `#contact-form` | `/contact` |

Appearance logic: `ScrollSentinel.tsx` renders a 1px div with `id="hero-end"` at the bottom of each
page's first band. `StickyActionBar` observes it with `IntersectionObserver`; once it leaves the
viewport the bar springs up (`y: 100% -> 0`). A second observer on the footer hides the bar again when
the footer is 60% visible, because the footer carries its own CTA and two competing CTAs on one screen
is exactly the failure mode the red budget exists to prevent.

Desktop needs no equivalent: the header is sticky and carries the red pill at all times, and the product
detail page has its own sticky buy column.

### 2.6 Footer
```
DESKTOP >=1024, ink ground, cream text
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  שעות              משלוח ואיסוף        ניווט            שי איזנשטט         │
│  ראשון-חמישי       איסוף מ{עיר}        דגמים            הופך רעיונות       │
│  16:00-20:00       משלוח 25 ש״ח        המחולל           לדברים אמיתיים.    │
│  שישי 09:00-13:00  מוכן תוך 3 ימים     הסיפור שלי       [ וואטסאפ ] red    │
│                                        יצירת קשר                           │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                            │
│           א ר י א ל   ·   2026          אין תשלום באתר. סוגרים בוואטסאפ.   │
└────────────────────────────────────────────────────────────────────────────┘
MOBILE: same blocks stacked in the order  wordmark+CTA / ניווט / שעות / משלוח / hairline / legal.
```
`SiteFooter.tsx` reads `api.settings.get` for hours, shipping, socials, `noPaymentNoteHe`.
The wordmark column repeats the spine phrase `הופך רעיונות לדברים אמיתיים.` with the red full stop.
The turquoise honesty line `אין תשלום באתר. סוגרים הכול בוואטסאפ.` is not fine print, it is the business
model stated plainly, and it pre-answers the only real objection a visitor has on a site with no cart.
Footer bottom padding on mobile is `calc(96px + env(safe-area-inset-bottom))` so the sticky bar never
covers the legal line during its hide transition.

### 2.7 `src/lib/whatsapp.ts`
```ts
export const WA_NUMBER = '972585845083';           // from settings, this is the fallback
export function waUrl(message: string, number = WA_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function siteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL}${path}`;
}
```
Every outbound WhatsApp link is an `<a target="_blank" rel="noopener">` produced by `WhatsAppLink.tsx`,
which also fires `plausible('wa_click', { props: { source } })` so the admin dashboard can count handoffs
per surface. `source` values: `header`, `sticky_home`, `sticky_product`, `hero`, `closing_home`,
`product_cta`, `product_question`, `contact_channel`, `contact_form_success`, `footer`.

---

## 3. HOME  ·  `src/app/page.tsx`

The whole page has one job: within one screen, prove that a boy turns ideas into real things and that
the visitor's own photo can become a printed object. Everything under the fold is evidence for that
claim and ramps toward the handoff.

Section order: Hero -> Trust row -> How it works (+ generator invite) -> Products teaser -> Gallery band
-> Story teaser -> Closing CTA.

### 3.1 `HomeHero` · `src/components/home/HomeHero.tsx`
```
DESKTOP >=1024  (right to left)
┌──────────────────────────────────────────────────────────────────────────────┐
│                                    │                                         │
│   ┌──────────────────────┐         │  ✦  מדפיס בתלת מימד, בן 13, ומקבל       │
│   │  ┌────────────────┐  │         │     הזמנות                              │
│   │  │                │  │  yellow │                                         │
│   │  │   print photo  │  │  blob   │  הופך רעיונות                           │
│   │  │   tilted -4deg │  │         │  לדברים ▓אמיתיים▓.                      │
│   │  │  white frame   │  │         │      turquoise marker ↑    red stop ↑    │
│   │  └────────────────┘  │         │                                         │
│   │      ┌──────────┐    │         │  שולחים לי תמונה, בוחרים צבעים,         │
│   │      │ 2nd img  │    │         │  ואני מדפיס אותה. אפשר לראות איך         │
│   │      │ +6deg    │    │         │  זה ייראה עוד לפני שמזמינים.            │
│   │      └──────────┘    │         │                                         │
│   └──────────────────────┘         │  [ להפוך תמונה להדפסה ]  ( לראות דגמים )│
│                                    │   red fill 56px           ink outline    │
│         48% column                 │  ────────────────────────────────────    │
│                                    │  ● 40+ הדפסות   ● מוכן ב-3 ימים         │
│                                    │  ● איסוף או משלוח        52% column     │
└──────────────────────────────────────────────────────────────────────────────┘

MOBILE <768  (390x844 budget, numbers are real)
┌────────────────────────────────────┐  y
│ ✦ מדפיס בתלת מימד, בן 13           │  104  (header 68 + announce 36)
│                                    │
│ הופך רעיונות                       │  132
│ לדברים ▓אמיתיים▓.                  │
│                                    │
│ ┌────────────────────────────────┐ │  262   image 16:11 = 390x268, bleeds
│ │      print photo collage       │ │        past the container by 20px
│ └────────────────────────────────┘ │
│                                    │
│ שולחים לי תמונה, בוחרים צבעים,     │  542
│ ואני מדפיס אותה.                   │
│                                    │
│ ┌────────────────────────────────┐ │  614   red, 52px, full width
│ │   להפוך תמונה להדפסה           │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │  674   ink outline, 52px
│ │   לראות דגמים                  │ │
│ └────────────────────────────────┘ │
│  ● 40+ הדפסות  ● 3 ימים  ● משלוח   │  742   fits inside 844
└────────────────────────────────────┘
```
Children: `HeroEyebrow` (inline in file), `MarkerHighlight`, `PillButton` ×2, `HeroProductCollage.tsx`,
`TrustRow.tsx`.

**Locked copy.**
Eyebrow: `מדפיס בתלת מימד, בן 13, ומקבל הזמנות` preceded by `SparkleGlyph` (inline SVG four-point star,
14px, turquoise). Not an emoji.
H1 across two lines: `הופך רעיונות` / `לדברים אמיתיים.` with `אמיתיים` inside `MarkerHighlight` and the
full stop as `<span class="text-red">.</span>` at `1.15em`.
Sub: `שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה. אפשר לראות איך זה ייראה עוד לפני שמזמינים.`
Primary CTA: `להפוך תמונה להדפסה` -> `/generator`.
Secondary CTA: `לראות דגמים` -> `/products`.

**`MarkerHighlight.tsx`.** An `<span class="relative isolate">` with a `::before` absolutely positioned
`inset-inline -.18em`, `inset-block-start .58em`, `block-size .46em`, `background: var(--color-turquoise)`,
`border-radius: .25em .6em .3em .55em`, `transform: rotate(-.8deg)`, `z-index -1`, and a hand-drawn
irregularity from `clip-path: polygon(...)` with 8 slightly jittered points. It animates in with
`scaleX 0 -> 1`, `transform-origin: right` (RTL, the pen starts on the right), 420ms, 180ms delay.
The `color` prop accepts `turquoise | yellow | red`; the hero uses turquoise so red stays on the CTA.

**`HeroProductCollage.tsx`.** Two `next/image` in white frames. Frame = `padding: 14px; background: #fff;
border-radius: 20px; box-shadow: var(--shadow-card)`. Primary image `rotate(-4deg)`, 1:1, `priority`,
`sizes="(max-width:1023px) 100vw, 46vw"`. Secondary image `rotate(6deg)`, 0.62 scale, absolutely
positioned overlapping the primary's bottom-end corner. Behind both, a yellow organic blob
(inline SVG, `--yellow` at 100%, no gradient) at `scale(1.08)` with a very slow 14s `rotate(0->3->0)`
drift. On mobile only the primary image renders, cropped 16:11, and the blob shrinks to a 60% band
behind its lower half. Sources: `settings.heroImageIds[0..1]`, fallbacks
`/public/assets/home/hero-primary.webp` and `hero-secondary.webp`.

**Convex.** `api.settings.get` for `heroImageIds` and `trustStats`. Nothing else. Hero copy is static in
`src/content/home.ts` so the LCP text ships in the HTML with zero client work.

**Job.** Lands the proposition and splits traffic: the visitor who wants their own thing goes to the
generator, the visitor who wants to browse goes to the catalog. Both routes end at WhatsApp.

### 3.2 `TrustRow` · `src/components/home/TrustRow.tsx`
Desktop: a single row inside the hero text column under the CTAs, separated by a 1px `ink/10` hairline
above it, three items with a 6px turquoise dot before each, `.9375rem / 600`.
Mobile: the same three items on one line at `.8125rem`, dots as separators, `overflow-x: auto` with
`scroll-snap-type: inline mandatory` if they overflow.

Reads `settings.trustStats`, exactly three `{ valueHe, labelHe }`. Locked defaults:
`40+ הדפסות שיצאו מהבית` · `מוכן תוך 3 ימים` · `איסוף עצמי או משלוח`.

**No stars and no testimonials here.** Shai is at the beginning and there are no reviews to quote.
Inventing them would poison a site whose entire asset is that the story is true. The gallery band in
§3.5 is the social proof, because real printed objects are more convincing than five drawn stars.
A `testimonials` table may be added later; until it holds real entries this row stays factual.

### 3.3 `HowItWorksStrip` · `src/components/home/HowItWorksStrip.tsx`
Cream ground. Two parts in one band: three numbered steps, then a turquoise generator invite panel.
```
DESKTOP >=1024
┌──────────────────────────────────────────────────────────────────────────────┐
│                                        איך זה עובד                            │  h2, right aligned
│                                                                              │
│   ┌────────────┐      ┌────────────┐      ┌────────────┐                     │
│   │     3      │      │     2      │      │     1      │  yellow numeral      │
│   │  מקבלים    │      │ בוחרים     │      │  שולחים    │  3.5rem/900          │
│   │            │      │  צבעים     │      │  תמונה     │  h3 1.375rem         │
│   │  איסוף או  │      │ עד 4 צבעים │      │ כל תמונה   │  body .9375rem       │
│   │  משלוח     │      │  בהדפסה    │      │  מהטלפון   │                      │
│   └────────────┘      └────────────┘      └────────────┘                      │
│      dashed turquoise connector line running between the three, RTL           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  turquoise #12BFB8 panel, radius 24px, padding 48px                    │  │
│  │                                                                        │  │
│  │  ┌────────────┐   ┌────────────┐        רוצים לראות איך התמונה         │  │
│  │  │ photo in   │ → │ print out  │        שלכם נראית מודפסת?             │  │
│  │  └────────────┘   └────────────┘        h2 ink on turquoise            │  │
│  │                                                                        │  │
│  │                                         [ להפוך תמונה להדפסה ] red     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

MOBILE: h2 · three steps stacked full width with a 2px dashed vertical turquoise
connector on the start edge · the turquoise panel with before/after images side by
side at 48% each · the red CTA full width.
```
Children: `StepCard.tsx`, `GeneratorInvite.tsx`.
Steps are static content in `src/content/home.ts`, no Convex read. The before/after pair is
`/public/assets/home/transform-before.webp` and `transform-after.webp`.

**Locked copy.** H2 `איך זה עובד`. Steps: `שולחים תמונה` / `כל תמונה מהטלפון מתאימה` · `בוחרים צבעים` /
`עד ארבעה צבעים בהדפסה אחת` · `מקבלים` / `איסוף עצמי או משלוח עד הבית`.
Panel H2 `רוצים לראות איך התמונה שלכם נראית מודפסת?` CTA `להפוך תמונה להדפסה`.

**Job.** Removes the process anxiety, then hands the visitor to the generator at the exact moment the
process feels easy. The turquoise panel is the second red CTA on the page and it is far enough from the
hero that the two never share a viewport.

### 3.4 `ProductsTeaser` · `src/components/home/ProductsTeaser.tsx`
```
DESKTOP >=1280                                                    MOBILE
┌────────────────────────────────────────────────┐   ┌────────────────────────┐
│  ( לכל הדגמים )              מה כבר מודפס אצלי  │   │  מה כבר מודפס אצלי     │
│   ink outline pill            h2                │   │  h2                    │
│                                                 │   │ ┌────────┐ ┌────────┐ │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │ │ card   │ │ card   │ │
│  │ card   │ │ card   │ │ card   │ │ card   │    │   │ └────────┘ └────────┘ │
│  │ -2deg  │ │ +2deg  │ │ -2deg  │ │ +2deg  │    │   │ ┌────────┐ ┌────────┐ │
│  └────────┘ └────────┘ └────────┘ └────────┘    │   │ │ card   │ │ card   │ │
│                                                 │   │ └────────┘ └────────┘ │
└────────────────────────────────────────────────┘   │ ( לכל הדגמים ) full w  │
4 cols >=1280 · 3 cols 1024-1279 (drops the 4th)     └────────────────────────┘
```
Reuses `ProductCard.tsx` from §4.3 verbatim, `variant="teaser"` (hides the price-band chip).
Convex: `api.products.listFeatured({ limit: 4 })` reading `by_status_featured`.
**Locked copy.** H2 `מה כבר מודפס אצלי`. CTA `לכל הדגמים` -> `/products`.
**Job.** Turns an abstract claim into four concrete objects with prices, which is what makes a visitor
who came for the story stay as a buyer.

### 3.5 `GalleryBand` · `src/components/home/GalleryBand.tsx`
Edge to edge, breaks the container. Cream ground, no accent colour, photography only.
```
DESKTOP: one row, 14 white-framed square photos, alternating rotation -3/+2/-1.5/+3deg,
height 240px, gap 20px, translating continuously right-to-left at 28s linear infinite
(RTL direction of travel), duplicated once for a seamless loop. Pauses on hover and on
:focus-within. prefers-reduced-motion: the marquee becomes a static overflow-x scroller.

┌─◄──────────────────────────────────────────────────────────────────────────►─┐
│ ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬  ⌐img¬        │
└──────────────────────────────────────────────────────────────────────────────┘
        cream fade masks 80px wide on both edges (mask-image linear-gradient)

MOBILE: identical marquee at 156px height, gap 12px, 22s. No fade masks (they eat too
much of a 390px viewport); the band simply bleeds off both edges.
```
Convex: `api.gallery.listPublished({ limit: 14 })`. Items with a `productSlug` are `<a>` to that product
and get a 2px turquoise ring on hover; the rest are plain `<img>` with `altHe`.
Above the band, a single right-aligned line, `1.125rem / 600`, `ink/70`:
`כל אחד מהדברים האלה יצא מהמדפסת שלי.`
**Job.** This is the proof section. It is where the visitor stops scrolling and starts wanting one.
No CTA here on purpose; the desire has to build for one more section before it is spent.

### 3.6 `StoryTeaser` · `src/components/home/StoryTeaser.tsx`
```
DESKTOP >=1024, ink #1A1420 ground, radius 24px, inset from the container by 0, padding 72px
┌──────────────────────────────────────────────────────────────────────────────┐
│                                        │                                     │
│   ┌──────────────────────────────┐     │   קצת עליי                          │
│   │                              │     │   .8125rem/700 turquoise, tracked   │
│   │   portrait of Shai at the     │     │                                     │
│   │   printer, 4:5, radius 20px,  │     │   לא אלו קלפים החיים               │
│   │   rotate -2deg, white frame   │     │   נותנים לך, אלא מה שאתה           │
│   │                              │     │   בוחר ▓לעשות▓ איתם.                │
│   └──────────────────────────────┘     │   h2 cream, yellow marker           │
│                                        │                                     │
│         42%                            │   שתי שורות של פתיח שהסוכן          │
│                                        │   של הקופי כותב.                    │
│                                        │                                     │
│                                        │   לקרוא את הסיפור המלא  ←           │
│                                        │   turquoise text link + arrow  58%  │
└──────────────────────────────────────────────────────────────────────────────┘
MOBILE: portrait 4:5 full width on top, then eyebrow, h2, two lines, link.
```
This is the only place on the site where a link, not a pill, carries the primary action, because the
destination is a story and not a purchase. Pushing a red pill at `/about` would make the story feel like
a sales asset, which is the exact failure the brief warns against.

Link: `לקרוא את הסיפור המלא` -> `/about`, `1.0625rem / 700`. The label is cream on the ink ground with a
2px turquoise underline that grows from the start (right) edge on hover in 200ms. Turquoise text is
never used here because it fails contrast on cream and reads muddy on ink.
The trailing arrow is `ChevronGlyph` rotated to point toward the **end (left) edge**, which is where a
Hebrew line advances. Author it once pointing right and flip it with `rtl:-scale-x-100` so the same
component serves both directions.

The H2 is the second spine phrase, quoted from the film exactly and never rewritten. Body prose is a
two-line teaser the copy agent supplies in `src/content/home.ts` as `storyTeaserLines: string[]`.
Portrait: `/public/assets/home/shai-portrait.webp`, no Convex read.
**Job.** Converts a browser into someone who wants *this specific boy* to make their thing. That is what
makes the WhatsApp message get sent instead of bookmarked.

### 3.7 `ClosingCta` · `src/components/home/ClosingCta.tsx`
```
FULL BLEED, red #F5333F ground, 128px block padding, centred
┌──────────────────────────────────────────────────────────────────────────────┐
│                        יש לכם רעיון? בואו נדבר.                              │
│                        h2 clamp(2rem,5vw,3.5rem) cream 800                    │
│                                                                              │
│              כותבים לי בוואטסאפ, מספרים מה בא לכם, ואני עונה.                 │
│              1.0625rem cream/85                                              │
│                                                                              │
│        ( לראות דגמים )        [ לכתוב לשי בוואטסאפ ]                          │
│         cream 2px outline      cream fill, ink text, 56px                     │
│                                                                              │
│              בדרך כלל אני חוזר תוך כמה שעות.   .875rem cream/70              │
└──────────────────────────────────────────────────────────────────────────────┘
MOBILE: same, CTAs stacked full width, primary first.
```
Because red is the ground, the CTA inverts: cream fill with ink text (17.2:1, the strongest pair on the
site). Convex: `api.settings.get` for `whatsappNumber` and `responseTimeHe`.
WhatsApp message from here (`source: closing_home`):
```
היי שי, הגעתי מהאתר.
יש לי רעיון להדפסה ואשמח לשמוע אם אפשר.
```
**Job.** The last exit. Everything above it was evidence; this is where the visitor spends it.

### 3.8 Home page assembly
```tsx
// src/app/page.tsx  (server component)
export const revalidate = 60;
const [settings, featured, gallery] = await Promise.all([
  fetchQuery(api.settings.get, {}),
  fetchQuery(api.products.listFeatured, { limit: 4 }),
  fetchQuery(api.gallery.listPublished, { limit: 14 }),
]);
<HomeHero settings={settings} />
<ScrollSentinel id="hero-end" />
<HowItWorksStrip />
<ProductsTeaser products={featured} />
<GalleryBand items={gallery} />
<StoryTeaser />
<ClosingCta settings={settings} />
<StickyActionBar variant="generator" />
```

---

## 4. PRODUCTS CATALOG  ·  `src/app/products/page.tsx`

### 4.1 Section order
Catalog header -> filter bar -> result count -> grid -> empty state (conditional) -> generator invite
strip after row 2 -> closing CTA.

### 4.2 `CatalogHeader` and `ProductFilterBar`
```
DESKTOP >=1024
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                        הדגמים שלי             │  h1 display
│                     כל אחד מהם אפשר להזמין בצבעים שאתם בוחרים.                │  1.125rem ink/70
│                                                                              │
│  ┌── sticky top-20, cream/94 backdrop-blur, border-b ink/8, padding-block 16 ┐│
│  │  [מיון: מומלצים ▾]      ●●●●●● צבע     הכול  דמויות  לבית  מתנות  ...    ││
│  │   end edge, select      swatch row      category chips, start edge         ││
│  │                                                                            ││
│  │  ⌐זוהר בחושך¬  ⌐אפשר לסובב בתלת מימד¬  ⌐אפשר להתאים אישית¬  ⌐עד 30 ש״ח¬  ││
│  │  feature + price chips, second row                                         ││
│  └────────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ( לנקות סינון )                                        12 דגמים             │
└──────────────────────────────────────────────────────────────────────────────┘

MOBILE <1024
┌────────────────────────────────────┐
│  הדגמים שלי                        │
│  כל אחד מהם אפשר להזמין...          │
│ ┌────────────────────────────────┐ │ sticky top-[68px], 56px tall
│ │ ⚙ סינון (2)   │ הכול דמויות ...│ │ button on end edge, chips scroll x
│ └────────────────────────────────┘ │
│  12 דגמים                          │
└────────────────────────────────────┘
Tapping סינון opens FilterSheet.tsx, a bottom sheet at 88svh with all five
dimensions and a sticky red footer button "להציג 12 דגמים".
```

### 4.3 Filter dimensions (five, all reflected in the URL)
| # | Dimension | Control | URL param | Values |
|---|---|---|---|---|
| 1 | קטגוריה | single-select chips | `cat` | `all` `figures` `home` `gifts` `keychains` `lithophane` `games` `utility` |
| 2 | צבע | multi-select swatches | `color` | `filaments.slug`, comma separated |
| 3 | מאפיין | multi-select chips | `feat` | `glow` `3d` `custom` |
| 4 | מחיר | single-select chips | `price` | `0-30` `30-60` `60-120` `120+` |
| 5 | מיון | select | `sort` | `featured` (default) `new` `price-asc` `price-desc` |

Hebrew labels: `הכול` `דמויות ופסלונים` `לבית` `מתנות` `מחזיקי מפתחות` `ליתופן ותמונות` `משחקים` `שימושי`;
features `זוהר בחושך` / `אפשר לסובב בתלת מימד` / `אפשר להתאים אישית`;
price `עד 30 ש״ח` / `30 עד 60` / `60 עד 120` / `מעל 120`;
sort `מומלצים` / `חדש אצלי` / `מחיר: מהנמוך` / `מחיר: מהגבוה`.

`src/lib/filters.ts` exports `parseFilters(searchParams)`, `applyFilters(products, f)`,
`serializeFilters(f)`, `countActive(f)`. Chip presses call `router.replace(url, { scroll: false })` so the
back button walks the filter history. Colour filter matches `product.availableColorSlugs.includes(slug)`
for **any** selected colour (OR), features match **all** selected (AND), because a visitor who taps two
colours wants either and a visitor who taps two features wants both.

Files:
```
src/app/products/page.tsx
src/components/products/CatalogHeader.tsx
src/components/products/ProductFilterBar.tsx     (client, desktop)
src/components/products/FilterSheet.tsx          (client, mobile)
src/components/products/FilterChip.tsx
src/components/products/ColorFilterRow.tsx
src/components/products/SortSelect.tsx
src/components/products/ProductGrid.tsx
src/components/products/ProductCard.tsx
src/components/products/ProductCardBadges.tsx
src/components/products/CatalogEmptyState.tsx
src/components/products/CatalogGeneratorStrip.tsx
```
Convex: `api.products.listPublished` (whole published list, one read) and `api.filaments.listActive`
for the swatch row. `api.products.facets` supplies the per-chip counts rendered as a superscript number.

### 4.4 `ProductCard` anatomy
```
┌─────────────────────────────────┐   white frame: padding 12px, bg #FFFFFF,
│ ┌─────────────────────────────┐ │   radius 24px, shadow-card,
│ │                    ⌐3D¬     │ │   rotate: -2deg on even index, +2deg on odd
│ │                  turquoise  │ │   hover: rotate 0deg, y -6px, shadow-lift
│ │        product image        │ │   spring 420/26
│ │        1:1, cream inner     │ │
│ │        radius 16px          │ │   badges: inset-block-start 12px,
│ │                             │ │           inset-inline-start 12px  (RIGHT in RTL)
│ │  ┌────────────┐             │ │
│ └──┤ מחזיקי מפתחות ├───────────┘ │   ink pill, .75rem/700 cream, height 28px,
│    └────────────┘               │   overlaps the image's bottom edge by 50%,
│                                 │   sits on the start (right) edge
│  מחזיק מפתחות בהתאמה אישית      │   1.0625rem/700 Rubik, 2-line clamp
│  שם, טלפון או כל מילה קצרה       │   .875rem/400 ink/65, 1-line clamp
│                                 │
│  ⟵                    45 ש״ח    │   price ink 1.125rem/800 on the start edge,
│  turquoise 36px circle          │   turquoise circular arrow on the end edge
└─────────────────────────────────┘
```
Card sizing: aspect of the image is always 1:1; card min-inline-size 156px at 2-up on a 390 viewport.

**Badges (`ProductCardBadges.tsx`), maximum two per card, priority order:**
1. `modelGlbUrl` present -> turquoise pill, `CubeGlyph` + the label `3D`. This is how a 3D-inspectable
   product signals itself. The cube glyph runs a 6s linear `rotateY(0 -> 360deg)` at all times (it is a
   12×12 SVG, so the cost is nil) which reads as "this one spins" from across the grid. Under
   `prefers-reduced-motion` the glyph freezes at a 3/4 view. On desktop hover the card also reveals
   `סובבו אותי` in `.75rem/700` ink/60 under the title, which is a promise the detail page keeps.
2. `isGlow` -> yellow pill, `זוהר בחושך`, ink text.
3. `createdAt` within 30 days -> ink pill, `חדש`.

The whole card is one `<Link href={'/products/' + slug}>`. Badges are decorative spans, not buttons, so
there is no nested interactive element. The turquoise arrow circle is `aria-hidden`, the link's accessible
name is `nameHe + ', ' + priceLabel`.

`TiltCard.tsx` is the shared primitive: it takes `rotate`, `frame` (bool), `href`, and handles the
hover spring and the focus-visible ring (`3px var(--color-turquoise)`, offset 2px, and it straightens on
focus exactly like on hover so keyboard users get the same affordance).

### 4.5 `ProductGrid` and empty state
Columns: 2 (<640) · 2 (640-767) · 3 (768-1279) · 4 (>=1280). Gutter per §0.5.
Entrance stagger 40ms capped at 12 items so a full grid does not take 2 seconds to appear.
Filter changes animate with `layout` on each card plus `AnimatePresence` `mode="popLayout"`.

`CatalogEmptyState.tsx` when the filtered set is empty:
```
        אין לי דגם כזה עדיין.
        אפשר לבקש ממני להדפיס בדיוק את מה שחיפשתם.
        [ לכתוב לשי בוואטסאפ ]   ( לנקות סינון )
```
The empty state is a conversion opportunity, so it carries the page's red CTA. The WhatsApp message
includes the active filters, which is genuinely useful to Shai:
```
היי שי, חיפשתי באתר בקטגוריה {categoryHe} ולא מצאתי.
אשמח לדעת אם אפשר להדפיס משהו כזה.
```

### 4.6 `CatalogGeneratorStrip`
Injected into the grid flow after the second row (index 8 on desktop, index 4 on mobile) as a
grid item spanning the full row: turquoise panel, 140px tall, one line
`לא מצאתם בדיוק את מה שרציתם? תעלו תמונה ואני אדפיס אותה.` plus the red `להפוך תמונה להדפסה` pill.
It sits inside the grid rather than after it because a visitor scanning a catalog that is not landing
should be caught mid-scan, not at the bottom.

### 4.7 Catalog closing
The same `ClosingCta` component from §3.7 with `variant="compact"` (96px block padding, no sub-line).
`StickyActionBar variant="catalog"`.

---

## 5. PRODUCT DETAIL  ·  `src/app/products/[slug]/page.tsx`

### 5.1 Section order
Breadcrumb -> media stage + buy panel (two columns) -> spec table -> description -> related products ->
compact closing CTA.

### 5.2 Desktop layout
```
DESKTOP >=1024
┌──────────────────────────────────────────────────────────────────────────────┐
│  דגמים / מחזיקי מפתחות / מחזיק מפתחות בהתאמה אישית      breadcrumb .8125rem  │
│                                                                              │
│  ┌───────────────────────────────┐  │ ┌────────────────────────────────────┐ │
│  │                               │  │ │  מחזיקי מפתחות   eyebrow turquoise │ │
│  │                               │  │ │                                    │ │
│  │      3D VIEWER (r3f)          │  │ │  מחזיק מפתחות                      │ │
│  │      aspect 1:1               │  │ │  בהתאמה אישית        h1 2.75rem    │ │
│  │      cream ground             │  │ │                                    │ │
│  │      radius 20px              │  │ │   ╭──────────╮                     │ │
│  │                               │  │ │   │ 45 ש״ח   │  PriceTag red,      │ │
│  │   ⟲ גררו כדי לסובב            │  │ │   ╰──────────╯  rotate -3deg       │ │
│  └───────────────────────────────┘  │ │                                    │ │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐            │ │  שם, טלפון או כל מילה קצרה.        │ │
│  │3D│ │  │ │  │ │  │ │  │  thumb rail│ │  קטן, חזק, ולא נשבר.               │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘  72px      │ │                                    │ │
│                                      │ │  צבע                               │ │
│         58% column                   │ │  ● ● ● ● ● ● ●   swatches 36px     │ │
│                                      │ │  אדום סוכריה                       │ │
│                                      │ │                                    │ │
│                                      │ │  כמות     [ − ]  2  [ + ]          │ │
│                                      │ │                                    │ │
│                                      │ │  ┌──────────────────────────────┐  │ │
│                                      │ │  │  שליחה לשי בוואטסאפ          │  │ │
│                                      │ │  └──────────────────────────────┘  │ │
│                                      │ │  ( יש לי שאלה על הדגם הזה )        │ │
│                                      │ │                                    │ │
│                                      │ │  ● מוכן תוך 3 ימים                 │ │
│                                      │ │  ● איסוף מ{עיר} או משלוח           │ │
│                                      │ │  ● אין תשלום באתר, סוגרים בוואטסאפ │ │
│                                      │ │                                    │ │
│                                      │ │  שי, בן 13, מדפיס כל הזמנה בעצמו.  │ │
│                                      │ │  קצת עליי ←   link to /about       │ │
│                                      │ │        42%, sticky top-24          │ │
│                                      │ └────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Mobile layout
```
MOBILE <1024
┌────────────────────────────────────┐
│ דגמים / מחזיקי מפתחות              │
│ ┌────────────────────────────────┐ │
│ │   3D VIEWER, aspect 1:1        │ │  full-bleed to the container edges
│ │   ⟲ גררו כדי לסובב             │ │
│ └────────────────────────────────┘ │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐  scroll-x     │  64px thumbs, snap
│ └──┘└──┘└──┘└──┘└──┘               │
│ מחזיקי מפתחות                      │
│ מחזיק מפתחות בהתאמה אישית          │  h1 2rem
│ ╭──────────╮                       │
│ │ 45 ש״ח   │                       │
│ ╰──────────╯                       │
│ שם, טלפון או כל מילה קצרה.          │
│ צבע  ● ● ● ● ● ● ●                 │
│ כמות [−] 2 [+]                     │
│ ( יש לי שאלה על הדגם הזה )          │  the secondary lives inline;
│ ● מוכן תוך 3 ימים                  │  the primary lives in the sticky bar
│ ● איסוף או משלוח                   │
│ ● אין תשלום באתר                   │
│ ┌────────────────────────────────┐ │
│ │ טבלת מפרט                      │ │
│ └────────────────────────────────┘ │
│ תיאור                              │
│ עוד דגמים                          │
│ closing band                       │
├────────────────────────────────────┤
│ [ שליחה לשי בוואטסאפ ]  45 ש״ח    │  StickyActionBar variant="product",
└────────────────────────────────────┘  price updates live with quantity
```

### 5.4 Files and behaviour
```
src/app/products/[slug]/page.tsx        (server, generateStaticParams + generateMetadata)
src/app/products/[slug]/not-found.tsx
src/components/product/ProductBreadcrumb.tsx
src/components/product/ProductMediaStage.tsx     (client, owns which media is active)
src/components/product/ProductViewer3D.tsx       (client, dynamic import, ssr:false)
src/components/product/ProductThumbRail.tsx
src/components/product/ProductBuyPanel.tsx       (client, owns colour + quantity state)
src/components/product/ProductSpecTable.tsx
src/components/product/ColorPicker.tsx
src/components/product/ProductDescription.tsx
src/components/product/RelatedProducts.tsx
src/components/product/MakerNote.tsx
```
`ProductViewer3D` loads the `.glb` with `useGLTF`, wraps it in `<Suspense>` with a cream skeleton and a
turquoise spinning cube, `<OrbitControls enablePan={false} minDistance/maxDistance` clamped to the model
bounds via `Box3`, `autoRotate` at speed 0.6 which stops on first pointer interaction, three-point
lighting (key `intensity 2.2` at `[3,4,3]`, fill `0.7` at `[-3,1,-2]`, `<Environment preset="city">`),
`dpr={[1, 2]}`, `frameloop="demand"` after auto-rotate stops. The chosen filament colour drives
`meshPhysicalMaterial` on every mesh: `color = filament.hex`, `roughness` 0.85 matte / 0.35 silk /
0.6 standard, `clearcoat` 0.4 for silk, `emissive = hex` with `emissiveIntensity 0.35` for glow.
`ProductMediaStage` cross-fades between the viewer and photos in 180ms. If `modelGlbUrl` is absent the
stage renders `heroImageUrl` and the rail omits the 3D thumb; the card badge is likewise absent, so the
promise made in the grid is always kept.

Thumb rail: first thumb is the 3D cube on a turquoise ground labelled `תלת מימד`, remaining thumbs are
`galleryImageUrls`. Active thumb gets a 2px ink ring. Keyboard: `role="tablist"`, arrow keys move,
`Home`/`End` jump, and in RTL `ArrowLeft` advances forward.

`ColorPicker.tsx`: 36px circles (44px hit area via a padded wrapper), `filaments` filtered to
`product.availableColorSlugs`, out-of-stock swatches get a diagonal ink strike and `aria-disabled`.
The selected swatch gets a 2px ink ring at 4px offset. The chosen colour's `nameHe` prints under the row
at `.875rem/600`, and a glow filament adds the yellow `זוהר בחושך` chip beside it.

`QuantityStepper.tsx`: min 1, max 25, above 25 the field is replaced by the line
`לכמות גדולה יותר כתבו לי ואני אבנה מחיר.` which is honest for a one-boy operation.
Price recomputes as `priceIls * qty + (filament.surchargeIls * qty)` and the `PriceTag` runs a 220ms
`scale 1 -> 1.06 -> 1` spring on change, which is the small dopamine hit the price reveal is built on.

`ProductSpecTable.tsx`, full width band on cream with a white card, two columns desktop / one mobile:
| שורה | מקור |
|---|---|
| `מידות` | `specs.widthMm × specs.heightMm × specs.depthMm` מ"מ |
| `חומר` | map: PLA `PLA` · PETG `PETG` · TPU `TPU גמיש` · SILK `PLA משי` · GLOW `PLA זוהר` |
| `זמן הדפסה` | `specs.printMinutes` formatted by `format.ts` as `2 שעות ו-40 דקות` |
| `משקל` | `specs.weightG` גרם |
| `עובי שכבה` | `specs.layerMm` מ"מ |
| `צבעים אפשריים` | swatch row from `availableColorSlugs` |
| `מוכן תוך` | `leadTimeDays` ימים |

`RelatedProducts.tsx`: `api.products.listRelated({ slug, limit: 4 })`, which returns `relatedSlugs` when
set and otherwise same-category published products by `sortOrder`, excluding the current one. Renders
`ProductCard` at 4-up desktop / 2-up mobile under the H2 `עוד דברים שיצאו לי מהמדפסת`.

`MakerNote.tsx`: one line plus a link, `שי, בן 13, מדפיס כל הזמנה בעצמו.` / `קצת עליי` -> `/about`.
This is the detail page's only link into the story, and it sits directly under the CTA because the
identity of the maker is part of what the visitor is deciding to buy.

Convex: `api.products.getBySlug({ slug })` (404 via `notFound()` when null or `status !== 'published'`),
`api.filaments.listActive`, `api.products.listRelated`, `api.settings.get`.
`generateMetadata` builds `title = nameHe + ' | ' + brandNameHe`, `description = shortDescHe`, and an
OG image from `heroImageUrl`.

### 5.5 The WhatsApp message for a catalog product (exact)
Built by `buildProductMessage()` in `src/lib/whatsapp.ts`. Lines are joined with `\n`. Optional lines are
omitted entirely when empty, never printed with a blank value.
```
היי שי, הגעתי מהאתר.
מעניין אותי: מחזיק מפתחות בהתאמה אישית
קוד דגם: custom-keychain
צבע: אדום סוכריה
כמות: 2
מידות: 60x22x4 מ"מ
מחיר באתר: 45 ש״ח ליחידה, סה״כ 90 ש״ח
קישור: https://{SITE}/products/custom-keychain
אשמח לדעת מתי אפשר לקבל.
```
Template:
```ts
[
  'היי שי, הגעתי מהאתר.',
  `מעניין אותי: ${p.nameHe}`,
  `קוד דגם: ${p.slug}`,
  color ? `צבע: ${color.nameHe}` : null,
  `כמות: ${qty}`,
  `מידות: ${w}x${h}x${d} מ"מ`,
  qty > 1
    ? `מחיר באתר: ${unit} ש״ח ליחידה, סה״כ ${unit * qty} ש״ח`
    : `מחיר באתר: ${unit} ש״ח`,
  personalisationText ? `טקסט להדפסה: ${personalisationText}` : null,
  `קישור: ${siteUrl('/products/' + p.slug)}`,
  'אשמח לדעת מתי אפשר לקבל.',
].filter(Boolean).join('\n')
```
The secondary CTA `יש לי שאלה על הדגם הזה` sends a shorter variant:
```
היי שי, ראיתי באתר את "מחזיק מפתחות בהתאמה אישית".
יש לי שאלה לפני שאני מזמין.
קישור: https://{SITE}/products/custom-keychain
```
Both messages carry `slug` and the link, so Shai always knows which object is being discussed even when
the visitor writes nothing else. Copy law check on both: no negative parallelism, no spaced em dash
(the price line uses a comma, the dimension line uses `x`), no closing summary, no emoji.

---

## 6. CONTACT  ·  `src/app/contact/page.tsx`

WhatsApp first, form second. The form exists for the visitor who will not open WhatsApp (a parent at a
work computer, someone without the app), and it writes to Convex so no lead is lost.

### 6.1 Section order and wireframe
```
DESKTOP >=1024
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                    בואו נדבר                  │  h1
│                          הכי מהר זה בוואטסאפ. אני קורא הכול.                   │  1.125rem ink/70
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────────────┐  │
│  │  אינסטגרם    │ │   מייל       │ │  וואטסאפ                             │  │
│  │  לראות עוד   │ │  לכתוב לי    │ │  058-584-5083                        │  │
│  │  הדפסות      │ │              │ │  [ פתיחת וואטסאפ ]  red, 56px        │  │
│  │  turquoise   │ │  white card  │ │  red-tinted card, 2px red border,     │  │
│  │  card        │ │              │ │  spans 2 columns, sits on the START   │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │  מתי אני זמין              │  │  #contact-form   white card, radius 24 │  │
│  │  ראשון-חמישי 16:00-20:00   │  │                                        │  │
│  │  שישי 09:00-13:00          │  │  איך קוראים לכם *   [____________]     │  │
│  │  שבת סגור                  │  │  טלפון *            [____________]     │  │
│  │  ─────────────             │  │  מייל               [____________]     │  │
│  │  בדרך כלל אני חוזר תוך     │  │  מה בא לכם להדפיס * [____________]     │  │
│  │  כמה שעות. בימי לימודים    │  │                     [            ]     │  │
│  │  זה יכול לקחת עד הערב.     │  │                     [____________]     │  │
│  │                            │  │                                        │  │
│  │  משלוח ואיסוף              │  │  [ שליחה ]  red 56px    ( או בוואטסאפ )│  │
│  │  איסוף עצמי מ{עיר}         │  │                                        │  │
│  │  משלוח עד הבית 25 ש״ח      │  │  אני לא שומר את המספר שלכם לשום דבר    │  │
│  │  מוכן תוך 3 ימי עבודה      │  │  חוץ מלחזור אליכם.   .8125rem ink/60   │  │
│  │        38%                 │  │              62%                       │  │
│  └────────────────────────────┘  └────────────────────────────────────────┘  │
│                                                                              │
│                          שאלות שחוזרות   h2                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ▸ כמה זמן לוקחת הדפסה?                                                │  │
│  │  ▸ אפשר לשלם באתר?                                                     │  │
│  │  ▸ איזה תמונות מתאימות להדפסה?                                         │  │
│  │  ▸ כמה צבעים אפשר בהדפסה אחת?                                          │  │
│  │  ▸ מה קורה אם ההדפסה יוצאת לא טוב?                                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│                     compact ClosingCta (red band)                            │
└──────────────────────────────────────────────────────────────────────────────┘

MOBILE: h1 · sub · WhatsApp card full width · Instagram and email as a 2-up row ·
form card · hours card · shipping card · FAQ accordion · closing band ·
StickyActionBar variant="contact".
```

### 6.2 Files
```
src/app/contact/page.tsx
src/components/contact/ContactHero.tsx
src/components/contact/ContactChannels.tsx
src/components/contact/ContactForm.tsx        (client)
src/components/contact/ContactFormSuccess.tsx
src/components/contact/HoursCard.tsx
src/components/contact/ShippingCard.tsx
src/components/contact/ContactFaq.tsx
src/content/faq.ts
```

### 6.3 Form contract
`react-hook-form` + `zod`. Fields, all `dir="rtl"`, labels above inputs, inputs 52px tall, radius 12px,
1.5px `ink/15` border, focus `2px turquoise` ring:
| Field | Name | Rules | Hebrew label |
|---|---|---|---|
| name | `nameHe` | required, 2-60 | `איך קוראים לכם` |
| phone | `phone` | required, `/^0\d{1,2}-?\d{7}$/` normalised to E.164 on submit | `טלפון` |
| email | `email` | optional, email | `מייל (לא חובה)` |
| message | `messageHe` | required, 5-1200 | `מה בא לכם להדפיס` |

Submit calls `useMutation(api.leads.create)` with `source: 'contact_form'`. Errors render under the field
in red at `.8125rem/600` (red text at 13px fails contrast, so error text is `--ink` with a red 3px
inline-start bar on the field instead). The submit button shows a turquoise three-dot pulse while
pending and is disabled to prevent double submits.

`ContactFormSuccess.tsx` replaces the form in place with a turquoise panel:
```
קיבלתי.
אני חוזר אליכם בדרך כלל תוך כמה שעות.
[ לפתוח וואטסאפ עכשיו ]   red pill
```
The success state's WhatsApp button carries the form's own content, so a visitor who does both does not
retype anything (`source: contact_form_success`):
```
היי שי, מילאתי טופס באתר.
שם: {nameHe}
מה בא לי להדפיס: {messageHe}
```
The privacy line under the form is `אני לא שומר את המספר שלכם לשום דבר חוץ מלחזור אליכם.` It is written in
Shai's voice, it is true given the schema above, and it is the kind of sentence a thirteen year old
would actually write.

### 6.4 Hours, response time, shipping
All three read `api.settings.get`. `HoursCard` renders `settings.hours[]`; the closed day is printed as
`שבת סגור` in `ink/50`. `settings.responseTimeHe` default:
`בדרך כלל אני חוזר תוך כמה שעות. בימי לימודים זה יכול לקחת עד הערב.`
`ShippingCard` renders `pickupCityHe`, `shippingPriceIls`, `defaultLeadTimeDays`, `shippingNoteHe`.

### 6.5 FAQ
`ContactFaq.tsx`, native `<details>`/`<summary>` with a custom turquoise chevron that rotates 180deg,
content in `src/content/faq.ts`. Five questions, the second of which is the one that actually matters:
`אפשר לשלם באתר?` -> `לא. באתר רק בוחרים ורואים מחיר. את התשלום סוגרים איתי ישירות בוואטסאפ, במזומן או בהעברה.`
That answer converts the site's biggest structural weakness into a plain statement of how it works.

---

## 7. Cross-page linkage map

| From | To | Mechanism |
|---|---|---|
| every page | `/generator` | header CTA (desktop), sticky bar primary (mobile, home/catalog), mobile nav CTA |
| home hero | `/generator` `/products` | primary and secondary CTA |
| home how-it-works | `/generator` | turquoise panel CTA |
| home teaser | `/products` and 4 `/products/[slug]` | outline CTA and 4 cards |
| home gallery | `/products/[slug]` | items carrying `productSlug` |
| home story teaser | `/about` | turquoise-underlined text link `לקרוא את הסיפור המלא` |
| catalog empty state | WhatsApp | red CTA carrying the active filters |
| catalog strip | `/generator` | red CTA after row two |
| product detail | WhatsApp | primary CTA with the full spec (§5.5) |
| product detail | `/about` | `MakerNote` link `קצת עליי` |
| product detail | `/products/[slug]` ×4 | related grid |
| contact | WhatsApp | channel card, form success, sticky bar |
| footer, every page | `/about` `/products` `/generator` `/contact` + WhatsApp | nav column and red pill |

`/about` is reached from exactly three places: the header nav, the home story teaser, and the product
detail maker note. That is deliberate. The story is the reason to trust, so it sits next to the moment
of decision, and it is never the thing competing with a CTA for the same tap.

---

## 8. Performance and accessibility gates

- LCP element is the hero H1 text on mobile and the hero collage image on desktop. Hero copy is static,
  the collage image is `priority` with explicit `width`/`height` and a `sizes` attribute. Target LCP
  under 2.0s on a Moto G Power over 4G.
- `ProductViewer3D` is `dynamic(() => import(...), { ssr: false })` and is only imported on
  `/products/[slug]`. `three` and `@react-three/*` must not appear in the home or catalog bundle; add a
  `next build` size assertion for this.
- Every image is WebP at cwebp q82 per the asset findings, served through `next/image`.
- Every interactive target is at least 44×44 CSS px including the colour swatches and the thumb rail.
- Focus-visible everywhere: `outline: 3px solid var(--color-turquoise); outline-offset: 2px`.
- One `<h1>` per page. Section headings are `<h2>`. `SectionHeading.tsx` enforces the level via a prop.
- `prefers-reduced-motion: reduce` kills the marquee, the auto-rotate, the marker sweep, the cube spin
  and every entrance transform, leaving opacity fades only.
- Hebrew numerals stay LTR inside RTL text: phone numbers, prices and dimensions are wrapped in
  `<bdi>` by `format.ts` so `058-584-5083` and `60x22x4` never scramble.
- The shekel sign is written as `ש״ח` (with a gershayim) and never as `₪` followed by a digit inside RTL
  text, which reverses in some Android webviews.

---

## 9. Build order checklist

1. `convex/schema.ts` with the five tables in §1, plus seed data for three filaments and two products.
2. Tokens, fonts, `globals.css`, then `PillButton`, `ChipBadge`, `TiltCard`, `MarkerHighlight`, `PriceTag`.
3. Global chrome: `AnnouncementBar`, `SiteHeader`, `MobileNavSheet`, `SiteFooter`, `StickyActionBar`.
4. `src/lib/whatsapp.ts` and `format.ts`, with a unit test asserting the §5.5 message byte-for-byte.
5. Home top to bottom. Ship it and check the mobile fold numbers in §3.1 on a real 390×844 device.
6. `ProductCard` + `ProductGrid`, then the catalog page and `src/lib/filters.ts` with URL round-trip tests.
7. Product detail with the image path first and `ProductViewer3D` second, so the page ships before the glb pipeline is ready.
8. Contact page and `api.leads.create`, then verify a lead lands in the admin table.
9. Accessibility pass against §8, then Lighthouse on `/`, `/products`, `/products/[slug]`, `/contact`.

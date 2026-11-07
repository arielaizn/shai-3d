# 09d · מטא, אישורים ובדיקת קול
## Meta and SEO copy, the family approval list, and the runnable voice regression test

Scope of this document: the title tag, meta description and Open Graph copy for every page; the JSON-LD
graph and the explicit list of things it must never assert; the lines on `/about` that Shai and his
parents sign off before launch; and a shell script that fails a build when a string breaks the voice.

Out of scope and owned elsewhere: the voice law itself (`09`, which governs this document), page
structure (`03`), generator steps and pricing (`04`), the preview honesty block (`05` PART C), admin
strings (`06`).

Governing rule for every Hebrew string below: `09` is law. Where `03`, `04` or `05` contradict it, `09`
wins and this document names the fix.

---

## 0. Six conflicts this document resolves

These were found by running the PART C checks against the copy already written into `03`, `04` and `05`.
Each one is a real string that ships today and breaks `09`.

| # | Where | What ships now | What must ship |
|---|---|---|---|
| 1 | `03` §3.6 `StoryTeaser` H2 | the film quote on the **home** page | `09` §2 allows the quote **once**, at the end of `/about`. Home gets a different H2. See §B.5 |
| 2 | `04` A1 buttons | `בחר תמונה` · `צלם עכשיו` · `החלף תמונה` | direct imperative. `לבחור תמונה` · `לצלם עכשיו` · `להחליף תמונה` |
| 3 | `05` viewer hint and toggle | `גררו כדי לסובב` · `תדליק את האור` | direct imperative. `מסובבים עם האצבע` · `להדליק את האור` |
| 4 | `04` step 5 subtitle | `סובב אותו, ואז תראה כמה זה יוצא.` | `מסובבים אותו, ואז רואים כמה זה יוצא.` |
| 5 | `04` A2 price chip | `מתחיל מ-₪45` | `09` §6 bans `₪` beside a digit in Hebrew. `מתחיל מ-45 ש״ח` |
| 6 | `05` C.4 | `ליטופן עובד מהאור...` | locked spelling is `ליתופן` |

Two more, softer, listed here so nobody re-litigates them during build:

- `03` §6.1 H1 `בואו נדבר` and `03` §3.7 `יש לכם רעיון? בואו נדבר.` contain `בואו`, an imperative form.
  It is an invitation that includes the speaker, not an instruction aimed at the visitor, so it does not
  carry the problem `09` §5 is guarding against. It stays, and it goes on the allowlist in §C.4 by name
  so the grep does not cry wolf. If Ariel wants it gone, the replacement is `אפשר לדבר איתי`.
- `03` §3.3 says `עד ארבעה צבעים בהדפסה אחת` in prose and `עד 4 צבעים` in the wireframe. `09` §6 wants
  digits from 2 up unless the number is part of speech. A step card is a spec, not speech, so both
  become `עד 4 צבעים`. `04` step 3 subtitle `עד ארבעה צבעים כלולים במחיר` becomes
  `עד 4 צבעים כלולים במחיר`.

---

# PART A · מטא ו-SEO

## A.0 The rules this copy obeys

A title tag and a meta description are read by a stranger in a results page before they know anything
about Shai. They are still his voice, so:

1. **No `אנחנו`, no `אנו`, no plural business.** A description that says `אנחנו מדפיסים` sells a company
   that does not exist and burns the only advantage this site has.
2. **No direct imperative.** Instructions use בינוני סתמי (`שולחים`, `בוחרים`, `מעלים`). Page titles may
   use שם פועל (`להפוך תמונה להדפסה`) because a title is a label, the same register as a button.
3. **No claim the site cannot keep.** No `משלוח חינם`, no `הכי זול`, no `תוצאה מושלמת`, no delivery
   promise beyond `מוכן תוך 3 ימים`, which is already stated on the site and is true.
4. **No `!`, no `…`, no emoji, no spaced em dash.** Google strips some of it and readers judge the rest.
5. **Locked spelling:** `תלת ממד` · `ליתופן` · `פילמנט` · `מדפסת`. `ש״ח` and `מ״מ` with U+05F4.
6. **Price appears in the product description only**, and only because it is read live from Convex at
   revalidate time, so it cannot go stale on the page while staying stale in the SERP.
7. **The brand suffix is `שי איזנשטט`** and it always sits at the end after a `|`, with Hebrew on both
   sides of the separator. See §A.11 for why that matters.

**Search reality check.** Israelis type `הדפסת תלת מימד` far more than `הדפסת תלת ממד`. `09` §6 locks the
spelling to `תלת ממד` and this document does not break the lock. Hebrew search normalises מימד and ממד
well enough that the difference is not worth the inconsistency of writing one spelling in the meta and
another on the page. If Ariel later decides SEO wins, the change is one find and replace and it has to
happen everywhere at once, never in the meta alone.

**Length targets.** Google truncates by pixel width, not character count, and Hebrew glyphs are narrower
than Latin capitals. Titles here run 28 to 39 characters, all comfortably inside the roughly 600px title
box. Descriptions run 98 to 116 characters, which shows in full on desktop and survives the mobile cut at
roughly 120. They are deliberately shorter than the 155 ceiling so nothing gets clipped mid sentence.

## A.1 Global metadata · `src/app/layout.tsx`

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: {
    default: 'הדפסת תלת ממד מהתמונה שלכם | שי איזנשטט',
    template: '%s | שי איזנשטט',
  },
  applicationName: 'שי איזנשטט',
  authors: [{ name: 'שי איזנשטט' }],
  creator: 'שי איזנשטט',
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    siteName: 'שי איזנשטט',
    locale: 'he_IL',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },   // overridden per page
};
```

`<html lang="he" dir="rtl">`. `formatDetection.telephone: false` matters here: iOS otherwise linkifies
any digit run that looks like a phone number, and this site prints prices, dimensions and quantities all
over. It also stops Safari turning a stray number into a tel: link that dials a stranger.

Every page below sets `alternates: { canonical: '<its own path>' }`. The `template` means a page that
sets `title: 'הדגמים שלי'` renders `הדגמים שלי | שי איזנשטט`. The pages below write the **full** title
string rather than relying on the template, because two of them need the brand in a different position
and mixing the two mechanisms is how a duplicate suffix ships.

---

## A.2 HOME · `/`

```
title       הדפסת תלת ממד מהתמונה שלכם | שי איזנשטט
            39 characters
```
```
description שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה. אפשר לראות את הדגם מסתובב לפני שמזמינים, ולסגור איתי בוואטסאפ.
            110 characters
```
```
og:title    הופך רעיונות לדברים אמיתיים
            27 characters
```
```
og:description  שי, בן 13, מדפיס בתלת ממד. שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה.
                74 characters
```

The title leads with what he does because nobody searches his name yet. The OG title leads with the spine
phrase because a share card is seen by someone a friend already told about him, and there the phrase does
more work than a keyword. `og:description` is the only place on the site where `בן 13` and the mechanism
sit in the same sentence, which is exactly the pair that makes someone tap.

```tsx
// src/app/page.tsx
export const metadata: Metadata = {
  title: 'הדפסת תלת ממד מהתמונה שלכם | שי איזנשטט',
  description: 'שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה. אפשר לראות את הדגם מסתובב לפני שמזמינים, ולסגור איתי בוואטסאפ.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'הופך רעיונות לדברים אמיתיים',
    description: 'שי, בן 13, מדפיס בתלת ממד. שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה.',
    url: '/',
    type: 'website',
  },
};
```

---

## A.3 ABOUT · `/about`

```
title       הסיפור שלי | שי איזנשטט, מדפיס בתלת ממד
            39 characters
```
```
description אני שי, בן 13. למדתי מוקדם שהחיים שלי מגיעים עם חוקים משלהם, ולמדתי לחשוב צעד אחד קדימה. היום אני מדפיס בתלת ממד.
            113 characters
```
```
og:title    אני בן 13, ואני מדפיס בתלת ממד
            30 characters
```
```
og:description  למדתי מוקדם לחשוב צעד אחד קדימה. היום אני מודד, מדפיס, ומתקן עד שזה יוצא נכון.
                78 characters
```

The description is the one place a search result could turn into a charity poster, so it names nothing
medical, asks for nothing, and ends on the printer. It is first person and it is dry. A reader who wants
the rest has to open the page, which is the correct trade.

`og:title` is locked sentence 1 from `09` §3 with the full stop dropped, because share cards do not take
terminal punctuation well when the next element is a domain.

**This description is on the approval list.** See item 2 in PART B: it narrates a six month old's
experience in first person and Shai gets to say whether that is how he wants to be introduced to
strangers.

```tsx
// src/app/about/page.tsx
export const metadata: Metadata = {
  title: 'הסיפור שלי | שי איזנשטט, מדפיס בתלת ממד',
  description: 'אני שי, בן 13. למדתי מוקדם שהחיים שלי מגיעים עם חוקים משלהם, ולמדתי לחשוב צעד אחד קדימה. היום אני מדפיס בתלת ממד.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'אני בן 13, ואני מדפיס בתלת ממד',
    description: 'למדתי מוקדם לחשוב צעד אחד קדימה. היום אני מודד, מדפיס, ומתקן עד שזה יוצא נכון.',
    url: '/about',
    type: 'profile',
  },
};
```

`type: 'profile'` rather than `article`, because the page is a person and not a post. Do not add
`profile:first_name` / `profile:last_name`: they are machine readable identity fields about a minor and
they buy nothing.

---

## A.4 PRODUCTS · `/products`

```
title       הדגמים שלי | שי איזנשטט, הדפסת תלת ממד
            38 characters
```
```
description מחזיקי מפתחות, ליתופנים, מגנטים, דמויות ותמונות במסגרת. כל דגם בצבעים שבוחרים, עם מחיר שרואים באתר לפני שכותבים לי.
            115 characters
```
```
og:title    הדגמים שלי
            10 characters
```
```
og:description  כל אחד מהם אפשר להזמין בצבעים שאתם בוחרים. המחיר מופיע באתר, וסוגרים בוואטסאפ.
                78 characters
```

The description opens with five product nouns because that is what a catalog result has to match against,
and closes on the two things that separate this site from a marketplace listing: you pick the colour, and
you see the price before you talk to anyone.

`og:title` is short on purpose. A share card for a catalog carries a grid image, and a long title
competes with it.

**Filtered URLs.** `?cat=`, `?color=`, `?feat=`, `?price=` and `?sort=` produce thousands of near
duplicate pages. Every filtered view sets `alternates: { canonical: '/products' }` and adds
`robots: { index: false, follow: true }` when `countActive(filters) > 0`. Crawl the links, index one page.

```tsx
// src/app/products/page.tsx
export async function generateMetadata({ searchParams }): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const filtered = countActive(f) > 0;
  return {
    title: 'הדגמים שלי | שי איזנשטט, הדפסת תלת ממד',
    description: 'מחזיקי מפתחות, ליתופנים, מגנטים, דמויות ותמונות במסגרת. כל דגם בצבעים שבוחרים, עם מחיר שרואים באתר לפני שכותבים לי.',
    alternates: { canonical: '/products' },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: 'הדגמים שלי',
      description: 'כל אחד מהם אפשר להזמין בצבעים שאתם בוחרים. המחיר מופיע באתר, וסוגרים בוואטסאפ.',
      url: '/products',
    },
  };
}
```

---

## A.5 PRODUCT DETAIL · `/products/[slug]`

### Templates

```
title           {nameHe} | שי איזנשטט
description     {nameHe} בהדפסת תלת ממד. {teaserHe} {price} ש״ח בצבע שבוחרים, מוכן תוך {leadDays} ימים.
og:title        {nameHe} · {price} ש״ח
og:description  {teaserHe} בוחרים צבע וכמות, ואני מדפיס כל הזמנה בעצמי.
```

`teaserHe` is the two line product teaser already on the page (`03` §5.2, e.g. `שם, טלפון או כל מילה
קצרה. קטן, חזק, ולא נשבר.`) with its internal full stop turned into a comma so the description reads as
one sentence. Store the meta variant as `products.metaTeaserHe` rather than string surgery at render
time, so Shai can fix an awkward join from `/admin`.

### Worked example 1 · `custom-keychain`

```
title       מחזיק מפתחות בהתאמה אישית | שי איזנשטט
            38 characters
```
```
description מחזיק מפתחות בהתאמה אישית בהדפסת תלת ממד. שם, טלפון או כל מילה קצרה, קטן וחזק. 45 ש״ח בצבע שבוחרים, מוכן תוך 3 ימים.
            116 characters
```
```
og:title    מחזיק מפתחות בהתאמה אישית · 45 ש״ח
            34 characters
```
```
og:description  שם, טלפון או כל מילה קצרה, קטן וחזק. בוחרים צבע וכמות, ואני מדפיס כל הזמנה בעצמי.
                81 characters
```

### Worked example 2 · `glow-lithophane`

```
title       ליתופן זוהר בחושך | שי איזנשטט
            30 characters
```
```
description ליתופן זוהר בחושך בהדפסת תלת ממד. ביום זו תמונה, ובלילה הלוח זוהר. 62 ש״ח בצבע שבוחרים, מוכן תוך 3 ימים.
            104 characters
```
```
og:title    ליתופן זוהר בחושך · 62 ש״ח
            26 characters
```
```
og:description  ביום זו תמונה, ובלילה הלוח זוהר. בוחרים צבע וכמות, ואני מדפיס כל הזמנה בעצמי.
                77 characters
```

### Guards

- **Title overflow.** If `nameHe.length > 34`, drop the brand suffix and ship `{nameHe}` alone. A
  truncated brand looks worse than no brand.
- **Description length.** Assert `description.length <= 155` in `generateMetadata` and fall back to
  `{nameHe} בהדפסת תלת ממד, {price} ש״ח. בוחרים צבע וכמות, ואני מדפיס.` when a long `metaTeaserHe`
  pushes it over. §C.6 has the check that catches this in CI instead of in production.
- **Unpublished or missing slug** calls `notFound()` before metadata is built, so a draft product never
  gets a title.
- **`og:image`** is the product's first photo through `next/og` at 1200x630, not the 3D viewer. The
  viewer is a live canvas and cannot be captured server side.

```tsx
// src/app/products/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchQuery(api.products.getBySlug, { slug });
  if (!p || p.status !== 'published') return {};
  const title = p.nameHe.length > 34 ? p.nameHe : `${p.nameHe} | שי איזנשטט`;
  const description =
    `${p.nameHe} בהדפסת תלת ממד. ${p.metaTeaserHe} ${p.priceIls} ש״ח בצבע שבוחרים, מוכן תוך ${p.leadTimeDays} ימים.`;
  return {
    title,
    description: description.length <= 155
      ? description
      : `${p.nameHe} בהדפסת תלת ממד, ${p.priceIls} ש״ח. בוחרים צבע וכמות, ואני מדפיס.`,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: `${p.nameHe} · ${p.priceIls} ש״ח`,
      description: `${p.metaTeaserHe} בוחרים צבע וכמות, ואני מדפיס כל הזמנה בעצמי.`,
      url: `/products/${slug}`,
      type: 'website',
    },
  };
}
```

`type: 'website'` and not `product`. The OG `product` type expects `product:price:amount` and
`product:availability`, which is the vocabulary of a checkout. There is no checkout.

---

## A.6 GENERATOR · `/generator`

```
title       להפוך תמונה להדפסת תלת ממד | שי איזנשטט
            39 characters
```
```
description מעלים תמונה, בוחרים מה מדפיסים ובאילו צבעים, ורואים את הדגם מסתובב עם המחיר. אין תשלום באתר, סוגרים איתי בוואטסאפ.
            114 characters
```
```
og:title    להפוך תמונה להדפסה
            18 characters
```
```
og:description  מעלים תמונה, בוחרים צבעים, ורואים את הדגם ואת המחיר לפני שמזמינים.
                66 characters
```

The description names the payment truth in the SERP rather than hiding it until step 5. A visitor who
will not order without a credit card should learn it before the click, not after four steps of work. It
costs some traffic and it protects every lead that does arrive.

**Draft URLs.** `/generator?d={draftId}` restores a draft and must never be indexed:
`robots: { index: false, follow: false }` whenever the `d` param is present, plus
`alternates: { canonical: '/generator' }`.

```tsx
// src/app/generator/page.tsx
export async function generateMetadata({ searchParams }): Promise<Metadata> {
  const hasDraft = Boolean((await searchParams).d);
  return {
    title: 'להפוך תמונה להדפסת תלת ממד | שי איזנשטט',
    description: 'מעלים תמונה, בוחרים מה מדפיסים ובאילו צבעים, ורואים את הדגם מסתובב עם המחיר. אין תשלום באתר, סוגרים איתי בוואטסאפ.',
    alternates: { canonical: '/generator' },
    robots: hasDraft ? { index: false, follow: false } : undefined,
    openGraph: {
      title: 'להפוך תמונה להדפסה',
      description: 'מעלים תמונה, בוחרים צבעים, ורואים את הדגם ואת המחיר לפני שמזמינים.',
      url: '/generator',
    },
  };
}
```

---

## A.7 CONTACT · `/contact`

```
title       יצירת קשר | שי איזנשטט, הדפסת תלת ממד
            37 characters
```
```
description הכי מהר זה בוואטסאפ, ואני קורא הכול בעצמי. אפשר גם למלא טופס קצר, ואני חוזר בדרך כלל תוך כמה שעות.
            98 characters
```
```
og:title    הכי מהר זה בוואטסאפ
            19 characters
```
```
og:description  אני עונה בעצמי, בדרך כלל תוך כמה שעות. אפשר גם למלא טופס קצר באתר.
                66 characters
```

`בעצמי` carries this page. A contact description that says `נשמח לעמוד לרשותכם` is what every printing
shop writes and it is the sentence that makes a visitor assume a call centre.

**The phone number is not in the metadata.** It is on the page, composed in JavaScript per `DECISIONS.md`.
Putting it in a meta description hands it to every scraper that reads head tags, which is the cheapest
harvest there is, and it is a minor's personal line.

```tsx
export const metadata: Metadata = {
  title: 'יצירת קשר | שי איזנשטט, הדפסת תלת ממד',
  description: 'הכי מהר זה בוואטסאפ, ואני קורא הכול בעצמי. אפשר גם למלא טופס קצר, ואני חוזר בדרך כלל תוך כמה שעות.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'הכי מהר זה בוואטסאפ',
    description: 'אני עונה בעצמי, בדרך כלל תוך כמה שעות. אפשר גם למלא טופס קצר באתר.',
    url: '/contact',
  },
};
```

---

## A.8 404 · `src/app/not-found.tsx`

```
title       הדף הזה לא נמצא | שי איזנשטט
            28 characters
```
```
description הכתובת הזאת לא קיימת אצלי. הדגמים, המחולל והסיפור נמצאים בתפריט למעלה.
            70 characters
```
```
og:title    הדף הזה לא נמצא
            15 characters
```
```
og:description  הכתובת לא קיימת. אפשר להתחיל מהדגמים או מהמחולל.
                48 characters
```

The route returns HTTP 404, so Google will not index it and no `robots` directive is needed. The title
still matters: it is what a person sees in their tab and in their history.

**On page copy**, which `08` H01 needs and no other document supplies. The illustration is a tangled nest
of turquoise filament, so the line earns the image instead of ignoring it:

```
h1        הדף הזה לא נמצא
line      לפעמים גם אצלי יוצא סבך. אפשר להתחיל מאחד מאלה.
tiles     דגמים  ·  להפוך תמונה להדפסה  ·  הסיפור שלי
```

`אפשר להתחיל` is בינוני סתמי plus שם פועל. There is no `חזור לדף הבית`, which would be an imperative and
would also be the fourth thing on a page that already offers three.

Image alt, from `08`: `סבך של חוט הדפסה טורקיז`.

---

## A.9 OFFER PAGE · `/o/[code]`

This page holds a customer's uploaded photo behind a 10 character code. It is not a marketing surface.

```tsx
export const metadata: Metadata = {
  title: 'הדגם שבניתם באתר | שי איזנשטט',      // 29 characters
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
  openGraph: {
    title: `הזמנה מהאתר, ${price} ש״ח`,        // 20 characters at price 150
    description: 'כאן נמצאים התמונה, הדגם והמחיר שבניתם.',   // 38 characters
  },
};
```

Four rules that are easy to get wrong here:

1. **No meta description.** A description is written to be surfaced. This page is written to be sent to
   one person.
2. **Do not add `/o/` to `robots.txt` Disallow.** A Disallow stops the crawler from fetching the page,
   which means it never reads the `noindex`, and a URL discovered from a shared link can still be indexed
   as a bare URL. Allow the crawl, let the `noindex` do its job, keep the page out of the sitemap, and
   never link to it from anywhere on the site.
3. **`noimageindex`** so the customer's photo cannot land in Google Images even if a link leaks.
4. **No JSON-LD of any kind.** See §A.15.

`04` E1 already specifies the OG image for this page and that it carries no Hebrew. It also carries the
customer's photo, which is the subject of approval item 19 in PART B.

## A.10 ADMIN · `/admin`

Already covered by `06`: `dynamic = 'force-dynamic'`, `robots: { index: false, follow: false }`, and a
`Disallow: /admin` in `robots.ts`. No OG tags, no JSON-LD, no title beyond `ניהול`. Unlike `/o/`, the
Disallow is correct here because `/admin` is behind auth and there is no shareable link to leak.

---

## A.11 Bidi rules for titles, and why the separator is a `|`

A SERP title is rendered by Google, not by the site, in a context whose base direction Google decides.
Neutral characters at a boundary between scripts are exactly where Hebrew titles fall apart.

- **The separator always has Hebrew on both sides.** `הדגמים שלי | שי איזנשטט` resolves cleanly because a
  neutral between two strong RTL runs takes RTL. `Shai 3D | הדגמים שלי` does not, and the pipe can jump.
- **Never end a title with a bare digit or Latin string.** `... 45` at the end of an RTL title can render
  at the visual left of the whole line. `... 45 ש״ח` ends on a Hebrew run and is safe. Every price string
  in this document ends in `ש״ח` for that reason and not for style.
- **Digits inside Hebrew are safe.** `שי, בן 13, מדפיס` is Hebrew on both sides of the number and renders
  in logical order everywhere tested.
- **`·` U+00B7 is used only in OG titles**, never in a title tag. It is a weaker signal than `|` in a
  results page and it is the character most likely to be normalised away by a snippet rewriter.
- **No RLM, LRM or any other invisible mark.** They survive one copy paste and then get stripped by a CMS
  or duplicated by an editor, and the failure is invisible in review.

## A.12 OG images

| Route | Source | Note |
|---|---|---|
| `/` | `public/assets/og/home.webp`, static 1200x630 | the hero collage, no text |
| `/about` | `src/app/about/opengraph-image.tsx`, `next/og` | `09` §7.1 already allows live Hebrew here |
| `/products` | static grid of four products | regenerate when the featured set changes |
| `/products/[slug]` | `next/og` from the product's first photo | Hebrew name rendered as DOM text by Satori |
| `/generator` | static before and after pair | reuses `transform-before` and `transform-after` |
| `/contact` | falls back to `/` | no dedicated card needed |
| `/o/[code]` | `04` E1, no Hebrew, price in digits plus `SHAI 3D` in Latin | |

Where Satori renders Hebrew it needs the font buffer loaded explicitly and the text wrapped in an
element with `direction: rtl`. `04` E1 chose to avoid Hebrew on `/o/` for that reason. On `/about` and
`/products/[slug]` the strings are short and controlled, so live Hebrew is worth the buffer load. Every
one of these images must be eyeballed once at 1200x630 before launch, because a bidi bug in Satori is
silent and produces a card that reads backwards.

## A.13 `robots.ts` and `sitemap.ts`

```ts
// src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchQuery(api.products.listPublished, {});
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  return [
    { url: `${base}/`,          changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/products`,  changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/generator`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`,     changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`,   changeFrequency: 'monthly', priority: 0.6 },
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
```

`/o/` and `/admin` are absent by construction. A CI assertion that the sitemap contains no `/o/` entry is
worth the three lines it costs, because the day someone maps over `leads` instead of `products` the leak
is silent.

---

## A.14 JSON-LD · what to emit

One `Person` node, defined once, referenced everywhere by `@id`. Everything else hangs off it.

The person is a thirteen year old maker with no business registration, no `עוסק פטור`, no invoicing and
no on site payment. The structured data says exactly that much and no more.

### The Person node · `@id: {SITE}/about#shai`

Emitted on `/about` and `/` only. Every other page references the `@id` without redefining it.

```json
{
  "@type": "Person",
  "@id": "{SITE}/about#shai",
  "name": "שי איזנשטט",
  "url": "{SITE}/about",
  "description": "שי, בן 13, מדפיס בתלת ממד ומייצר דגמים לפי הזמנה.",
  "knowsAbout": ["הדפסת תלת ממד", "ליתופן", "מודלים מודפסים"],
  "image": "{SITE}/assets/home/shai-portrait.webp",
  "sameAs": ["{INSTAGRAM_URL}", "{TIKTOK_URL}"]
}
```

`sameAs` entries are emitted only for accounts that actually exist and are read from
`settings.instagramUrl` / `settings.tiktokUrl`, with the whole key omitted when both are empty. An empty
`sameAs` array is worse than no `sameAs`.

### Per page

| Route | Types emitted |
|---|---|
| `/` | `WebSite` + `Person` |
| `/about` | `AboutPage` + `Person` |
| `/products` | `CollectionPage` + `BreadcrumbList` |
| `/products/[slug]` | `Product` + `Offer` + `BreadcrumbList` |
| `/generator` | `WebPage` only |
| `/contact` | `ContactPage` + `FAQPage` |
| `/o/[code]` | nothing |
| 404 | nothing |
| `/admin` | nothing |

### `/` · WebSite

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "{SITE}/#website",
      "url": "{SITE}/",
      "name": "שי איזנשטט",
      "description": "הדפסת תלת ממד מהתמונה שלכם",
      "inLanguage": "he-IL",
      "creator": { "@id": "{SITE}/about#shai" }
    },
    { "@type": "Person", "@id": "{SITE}/about#shai", "...": "as above" }
  ]
}
```

**No `potentialAction` / `SearchAction`.** There is no site search. Declaring one points Google at a
`/search?q=` route that returns 404.

**`creator` and not `publisher`.** `publisher` reads as an organisation role and invites a `logo`
property that belongs to a registered entity.

### `/products/[slug]` · Product and Offer

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "@id": "{SITE}/products/{slug}#product",
      "name": "{nameHe}",
      "description": "{metaTeaserHe}",
      "image": ["{SITE}/{photo1}", "{SITE}/{photo2}"],
      "sku": "{slug}",
      "material": "PLA",
      "inLanguage": "he-IL",
      "offers": {
        "@type": "Offer",
        "@id": "{SITE}/products/{slug}#offer",
        "url": "{SITE}/products/{slug}",
        "price": "{priceIls}",
        "priceCurrency": "ILS",
        "availability": "https://schema.org/MadeToOrder",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": { "@id": "{SITE}/about#shai" },
        "availableDeliveryMethod": [
          "http://purl.org/goodrelations/v1#DeliveryModePickUp",
          "http://purl.org/goodrelations/v1#DeliveryModeMail"
        ]
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "דגמים", "item": "{SITE}/products" },
        { "@type": "ListItem", "position": 2, "name": "{categoryHe}", "item": "{SITE}/products?cat={cat}" },
        { "@type": "ListItem", "position": 3, "name": "{nameHe}" }
      ]
    }
  ]
}
```

Why each field is defensible:

- **`availability: MadeToOrder`** is a real `ItemAvailability` value and it is the truth. `InStock` would
  be a lie: nothing is sitting on a shelf.
- **`seller` is the Person**, not an Organization. An `Offer` is defined as an offer to transfer an item
  for a price, and that is accurate. Where the money changes hands is not part of the claim.
- **`sku` is the slug.** It is Shai's own model code and it appears in the WhatsApp message (`03` §5.5),
  so it is a real identifier and not a manufactured one.
- **`price` is read live from Convex** at revalidate time, so the markup and the visible price cannot
  drift. If they ever do, Google drops the rich result, which is the correct failure.
- **`material: "PLA"`** only where it is true. Drop the key for any product printed in something else
  rather than defaulting it.
- **The breadcrumb matches the visible one** in `03` §5.2, word for word. Markup that does not match
  visible content is a policy violation, not a style preference.

### `/contact` · ContactPage and FAQPage

`FAQPage` mirrors `src/content/faq.ts` **verbatim**, all five questions, including:

```
אפשר לשלם באתר?
לא. באתר רק בוחרים ורואים מחיר. את התשלום סוגרים איתי ישירות בוואטסאפ, במזומן או בהעברה.
```

Google restricted FAQ rich results in 2023 to government and health sites, so this will not draw a rich
result. It is still worth emitting: it is true, it costs nothing, and it is the cleanest way to feed the
payment answer to an AI overview that would otherwise guess.

`ContactPage` carries `name`, `description`, `inLanguage`, `isPartOf` and `about: { "@id": ".../about#shai" }`.
It does not carry `telephone`, `email` or `address`.

### `/about` · AboutPage

```json
{
  "@type": "AboutPage",
  "@id": "{SITE}/about#page",
  "url": "{SITE}/about",
  "name": "הסיפור שלי",
  "inLanguage": "he-IL",
  "mainEntity": { "@id": "{SITE}/about#shai" },
  "isPartOf": { "@id": "{SITE}/#website" }
}
```

## A.15 JSON-LD · never emit, and why

| Never | Reason |
|---|---|
| `Organization`, `LocalBusiness`, `Store`, `HomeAndConstructionBusiness` | asserts a registered business. There is no `עוסק פטור` and no licence. This is the single most likely mistake, because every SEO template starts with it |
| `PostalAddress`, `geo`, `hasMap` | a minor's home address in machine readable form. Never, in any type, on any page |
| `telephone` | the number is on the page for humans and composed in JS on purpose (`DECISIONS.md`). Structured data undoes that in one line |
| `openingHoursSpecification` | the hours card says when a boy is free after school. Marking it as business hours turns a family schedule into a machine readable pattern of when a child is home |
| `aggregateRating`, `review` | there are no reviews. `03` §3.2 already refused to invent testimonials, and inventing them in JSON-LD is the same lie in a format Google penalises |
| `priceValidUntil` with a made up date | it either expires and kills the rich result or it is fiction |
| `gtin`, `mpn`, `brand` | no barcodes, no manufacturer part numbers, and Shai is a person rather than a brand entity |
| `SearchAction` | there is no site search |
| `HowTo` on `/generator` | Google removed HowTo rich results in 2023. It buys nothing and it invites step markup that will drift from the real UI |
| `birthDate`, `birthPlace`, `alumniOf`, `affiliation` on the Person | identifying data about a minor, for no gain |
| anything at all on `/o/[code]` | the page holds a customer's photo behind a secret code |
| `Offer` with `acceptedPaymentMethod` | there is no payment on the site. `04` C4 is explicit |

**`OfferShippingDetails` is optional and allowed.** `settings.shippingPriceIls` of 25 and
`addressCountry: "IL"` are both true, so a shipping node is honest if it is generated from settings and
never hardcoded. It is not required, and shipping a wrong number in markup is worse than shipping none.

## A.16 Where the JSON-LD lives

`src/lib/jsonld.ts` exports one builder per page type and a single `<JsonLd>` component that renders
`<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />` from a
server component. Never build it on the client: a graph that renders after hydration is a graph Google
sometimes misses, and it also means the price can be built from stale client state.

`JSON.stringify` handles the escaping. Do not hand author the JSON as a template string, because a
product name containing a quote will silently break the whole block.

---

# PART B · רשימת האישורים

## B.0 How this conversation runs

`09b-about-page.md` does not exist yet. The lines below are the About page copy as it follows from the
facts in the brief, written to the `09` structure of twelve rows. When `09b` ships, the approval items
carry over by topic even if the wording moved: the allergy row is an approval item because it is about an
allergy, not because of the specific verb it uses.

Three rules for the conversation itself:

1. **Shai answers first, alone, before his parents see the list.** If the parents go first he will agree
   with whatever they said, and the page will be their version of his life.
2. **Every item has a real "no".** Removing a row is always on the table and the timeline survives it. If
   the answer to an item is "I would rather not", the softer alternative is the fallback and not the
   argument.
3. **The output is a signed line by line sheet**, not "he said it's fine". §B.6 is that sheet.

## B.1 The twelve rows as drafted

Numbering matches `about.fallback.ts` order. `[אריאל: ...]` is a placeholder that must be resolved or
deleted before launch, never invented.

```
01  opener      (נעול)
    אני שי, בן 13, ואני מדפיס בתלת ממד.
    הופך רעיונות לדברים אמיתיים.

02  timeline    גיל חצי שנה  ·  h3: החוקים התחילו מוקדם
    בגיל חצי שנה טעמתי קצת קינוח חלבי, ומאז ידעתי שהחיים שלי מגיעים עם חוקים משלהם.
    מה שאצל ילדים אחרים היה סתם אוכל, אצלי היה משהו שדורש תשומת לב.
    לא פחדתי מהחוקים. למדתי אותם, ומצאתי לכל דבר דרך.

03  timeline    הלילות  ·  h3: זה לא נגמר בשולחן
    בלילות הפחות שקטים למדתי לזהות מה מפריע לי.
    התכוננתי מראש, ובניתי לעצמי הגנה.
    בהתחלה זה לקח הרבה זמן. אחר כך זה נהיה משהו שאני יודע לעשות.

04  pullQuote
    למדתי לחשוב צעד אחד קדימה.

05  timeline    חנוכה  ·  h3: הפתק בחנוכייה
    בחנוכה אחת הסתרתי פתק בחנוכייה וביקשתי משאלה.
    שנה אחרי זה נועם הגיע, והבית התמלא באור חדש.
    [אריאל: לוודא איזו שנה]

06  imageFull
    [אריאל: תמונה לבחירת שי]
    alt: [אריאל: לכתוב alt אחרי שהתמונה נבחרת]

07  timeline    בית ספר  ·  h3: הדף שלא תמיד הצלחתי לקרוא
    אחר כך התחיל בית ספר.
    לא תמיד הצלחתי לקרוא את מה שהיה על הדף, אז מצאתי דרך משלי להבין את החומר.
    היו כאלה שהיו בטוחים שלא אצליח. הם לא הכירו אותי.
    יום אחרי יום פירקתי את הקיר הזה. הציונים עלו, והביטחון עלה איתם.

08  twoUp
    [אריאל: שתי תמונות לבחירת שי]

09  timeline    בר מצווה  ·  h3: ההפטרה
    בבר מצווה קראתי הפטרה. מילה אחרי מילה, עד הסוף.
    שם הבנתי שהצלחה מגיעה ממה שמוכנים לעבוד בשבילו.

10  timeline    היום  ·  h3: היום אני מדפיס
    היום אני מתכנן, מודד, מדפיס ומתקן.
    אני לוקח רעיון והופך אותו לחפץ שאפשר להחזיק ביד.
    ההזמנות כבר מגיעות, ויש יותר ויותר.

11  statement   (נעול)
    לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם

12  closing
    אפשר לראות מה כבר יצא לי מהמדפסת.
    [ לראות דגמים ]   ( להפוך תמונה להדפסה )
```

## B.2 האלרגיה · rows 02 and the About meta description

### Item 1 · the allergen is named in public

> `בגיל חצי שנה טעמתי קצת קינוח חלבי, ומאז ידעתי שהחיים שלי מגיעים עם חוקים משלהם.`

**Confirm:** whether a specific food is named at all. `קינוח חלבי` tells a stranger which allergen, and
this page will be indexed permanently and read by people who will hand Shai food. That cuts both ways:
naming it can be protective, and it is also a permanent medical disclosure about a minor made for a
commercial page. The parents decide, and the word `אלרגיה` never appears in the current draft, so also
confirm whether they want it to.

**Softer alternative:**
> `בגיל חצי שנה גיליתי שיש דברים שאני צריך לבדוק לפני שאני אוכל אותם.`

**More explicit alternative, only if the family asks for it:**
> `יש לי אלרגיה למוצרי חלב. גיליתי את זה בגיל חצי שנה, ומאז החיים שלי מגיעים עם חוקים משלהם.`

### Item 2 · a six month old narrating in first person

> `ומאז ידעתי שהחיים שלי מגיעים עם חוקים משלהם`

**Confirm:** Shai cannot remember being six months old. This is family lore told in his voice. It is the
right voice for the page and it is still someone else's memory, so he should agree that this is how he
tells it. The same sentence carries into the About meta description in §A.3, where it is read by strangers
who never open the page.

**Softer alternative:**
> `זה קרה לפני שאני זוכר. מה שאני כן זוכר זה שתמיד היו לי חוקים משלי.`

### Item 3 · the claim of not being afraid

> `לא פחדתי מהחוקים. למדתי אותם, ומצאתי לכל דבר דרך.`

**Confirm:** with the parents, whether this is true or whether it is the version that sounds good. If he
was scared and got past it, that is a better sentence and it is his to give.

**Softer alternative:**
> `בהתחלה החוקים היו הרבה. אחר כך הכרתי אותם, ומצאתי לכל דבר דרך.`

## B.3 הלילות · row 03

### Item 4 · whether the row ships at all

**Confirm, with the parents before Shai:** whether any reference to nights appears on a public commercial
page. This is the row most likely to be read as a medical hint by someone who knows what to look for, and
it is the row that adds the least commercial value. The timeline reads fine as `גיל חצי שנה` to `חנוכה`
to `בית ספר` with row 03 deleted, and the "prepare and build a defence" idea survives inside row 07.

**Alternative:** delete rows 03 entirely and move `למדתי לחשוב צעד אחד קדימה` from the pull quote up into
row 02 as its closing line, then use a different pull quote from row 07.

### Item 5 · the euphemism

> `בלילות הפחות שקטים למדתי לזהות מה מפריע לי.`

**Confirm:** that `הפחות שקטים` is a phrase Shai recognises as his own, and that it does not point at a
specific event a stranger could name. Vague can be worse than plain: a reader who fills the blank
themselves usually fills it with something more dramatic than the truth.

**Softer alternative:**
> `היו לילות שבהם היה לי יותר קשה להירדם.`

**Plainer alternative, if the family prefers plain over vague:**
> `היו לילות שלא היו קלים. למדתי לזהות מה מפריע לי ולהתכונן מראש.`

### Item 6 · what the defence was

> `התכוננתי מראש, ובניתי לעצמי הגנה.`

**Confirm:** what `הגנה` actually was, and whether Shai wants it described. If it was concrete, naming it
makes the line ten times better and stops it sounding like a metaphor. If it was medical, it should
probably go.

**Softer alternative:**
> `למדתי להתכונן מראש.`

## B.4 נועם · row 05

Noam is a child who did not choose to be on a website.

### Item 7 · the name

> `שנה אחרי זה נועם הגיע, והבית התמלא באור חדש.`

**Confirm, with the parents:** whether a second minor's given name is published on a commercial site that
is built to rank in Google, alongside Shai's surname, his city and his personal phone number. Names are
the one thing that cannot be taken back after indexing.

**Softer alternative:**
> `שנה אחרי זה נולד לי אח קטן, והבית התמלא באור חדש.`

### Item 8 · the causal link between the wish and the birth

> `בחנוכה אחת הסתרתי פתק בחנוכייה וביקשתי משאלה.` followed by `שנה אחרי זה נועם הגיע`

**Confirm:** what the wish actually was. The two sentences side by side tell the reader the wish was for a
brother, and nobody has said that. If it was, the line is one of the best on the page and should say so
plainly. If it was not, the juxtaposition is an invention.

**Alternative that claims nothing:**
> `בחנוכה אחת הסתרתי פתק בחנוכייה. שנה אחרי זה נולד לי אח קטן.`

**Alternative if the wish really was for a brother:**
> `בחנוכה אחת הסתרתי פתק בחנוכייה וביקשתי אח. שנה אחרי זה הוא הגיע.`

### Item 9 · characterising Noam

> `והבית התמלא באור חדש.`

**Confirm:** the brief calls Noam "his private miracle". That phrase is not in the draft on purpose, and
it should stay out: describing a sibling as a miracle on a sales page makes him a device in someone
else's story. Confirm that even `אור חדש` is a description Shai is happy to have attached to his brother
permanently, and confirm Noam's parents are the ones approving it.

**Softer alternative:**
> `שנה אחרי זה נולד לי אח קטן.`

## B.5 בית ספר · row 07, and the home page teaser

### Item 10 · whether דיסלקציה is named

> `לא תמיד הצלחתי לקרוא את מה שהיה על הדף`

**Confirm, with Shai first:** this is the one item where his answer may be **more** explicit than the
draft. `09` §1 uses this exact sentence as the model of the right voice, and it deliberately does not name
the condition. Some kids want it named because it helps the next kid. That is his call, not a copy call.

**More explicit alternative, if he wants it:**
> `יש לי דיסלקציה. לא תמיד הצלחתי לקרוא את מה שהיה על הדף.`

Note that naming it changes the About meta description in §A.3 as well, which currently names nothing.

### Item 11 · the method is currently generic

> `מצאתי דרך משלי להבין את החומר.`

**Confirm:** what the way actually was. Listening, drawing, building, recording, someone reading aloud.
This is the weakest sentence on the page precisely because it is the one place a real detail was not
available. A specific answer replaces it and the page gets noticeably better.

**Placeholder until then:**
> `[אריאל: לשאול את שי איך בדיוק הוא למד, ולהחליף את המשפט בעובדה]`

### Item 12 · the doubters

> `היו כאלה שהיו בטוחים שלא אצליח. הם לא הכירו אותי.`

**Confirm:** that no real teacher, therapist or classmate is identifiable. This is a small community, the
page is permanent, and a teacher who recognises themselves has a grievance that lands on a thirteen year
old. Also confirm Shai wants to carry that sentence around after the site is live.

**Softer alternative:** cut both sentences. `יום אחרי יום פירקתי את הקיר הזה` carries the beat without
naming an opponent.

**Middle alternative:**
> `לא כולם היו בטוחים שאני אצליח.`

### Item 13 · the grades

> `הציונים עלו, והביטחון עלה איתם.`

**Confirm:** that it is true, and that Shai is willing to put school performance on a public page. Grades
are private information and they invite a follow up question from every adult who reads it.

**Softer alternative:**
> `לקח זמן, ובסוף קראתי את מה שהייתי צריך לקרוא.`

### Item 14 · the home page story teaser, which is currently the film quote

`03` §3.6 puts the film quote on the home page as the `StoryTeaser` H2. `09` §2 allows that quote **once**,
at the end of `/about`. The home teaser needs a different H2, and it should come from row 07, which is the
part of the story a stranger connects to fastest.

**Recommended replacement H2** with `לפרק` inside the yellow `MarkerHighlight`:
> `למדתי ▓לפרק▓ קירות הרבה לפני שהגיעה המדפסת.`

**Alternative:**
> `יש דברים שלמדתי לפרק הרבה לפני שהתחלתי להדפיס.`

**Confirm:** that Shai likes it, since it is the sentence a visitor meets before the story.

## B.6 בר מצווה, היום, והציטוט

### Item 15 · the aphorism

> `שם הבנתי שהצלחה מגיעה ממה שמוכנים לעבוד בשבילו.`

**Confirm:** that a thirteen year old wants to say a sentence this shaped about himself. It is the one
line on the page that sounds like it was written for him rather than by him, and it is close to the edge
`09` §1 draws.

Note for the build: the underlying fact in the brief is phrased as "success does not depend on what is
easy, it depends on what you are willing to work for". That is negative parallelism and it is banned. The
draft states it positively on purpose. If this line is rewritten, it must not drift back into the
`לא X, זה Y` shape. §C.2 check 6 catches it.

**Softer alternative that shows instead of concludes:**
> `הכנתי אותה חודשים. בשבת קראתי הכול, מילה אחרי מילה.`

### Item 16 · growth as a public claim

> `ההזמנות כבר מגיעות, ויש יותר ויותר.`

**Confirm:** the number behind it, and that Shai wants to state growth rather than just activity. This ties
to `03` §3.2, where the trust row ships `40+ הדפסות שיצאו מהבית` as a locked default. That number has to
be Shai's real count on launch day or it comes out. Confirm both in the same breath.

**Softer alternative:**
> `ההזמנות כבר מגיעות.`

### Item 17 · the film quote

> `לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם`

**Confirm:** which film, the exact Hebrew wording as it appears there, and whether the family wants a
credit. The line is the emotional close of the page and the single licensed exception to the negative
parallelism ban, so it has to be the real quote and not a remembered paraphrase.

`[אריאל: לוודא מאיזה סרט הציטוט ואם רוצים לתת קרדיט]`

If a credit ships, it goes as a `text-overline` line under the quote in `--ink-muted`, never as a
sentence. A sentence after the quote becomes a closing summary paragraph, which `DECISIONS.md` bans.

## B.7 Three approvals that are not lines

These belong on the same sheet even though nobody has to approve a phrasing.

### Item 18 · a minor's personal phone number, published

`DECISIONS.md` records that `+972585845083` is Shai's personal number and that Ariel approved it. The
parents sign this one too. What they are approving: the number is reachable by anyone who finds the site,
forever, including after the site is forgotten. What protects it: it is composed in JavaScript so
scrapers do not harvest it from the HTML, it is absent from every meta tag and from all JSON-LD (§A.7,
§A.15), and `formatDetection.telephone: false` stops iOS auto linking stray digits. What the exit is: it
is one `settings.whatsappNumber` field, so swapping it later is one edit with no rebuild.

### Item 19 · customer photos and the offer page

`/o/{code}` shows a customer's uploaded photo behind a 10 character code and generates an OG image from
it. Confirm three things: that the 7 day auto delete removes the stored image and not only the draft row,
that the OG image is generated from the storage id at request time so it dies with the image, and that
WhatsApp and Facebook cache link previews for a long time after a link is shared. A card that was shared
before deletion can outlive the deletion in someone else's chat, and nobody can recall it.

### Item 20 · what the site says about where Shai is

Surname, city, "after school between 16:00 and 20:00", a personal phone and photos of the house are enough
to locate a child. Individually each one is fine and each one is already planned. Together they are a
profile. Two constraints that cost nothing:

- `settings.pickupCityHe` names a city and never a neighbourhood, a street or a building.
- The hours card describes availability. It does not describe a school timetable, and it does not say
  when the house is empty.

Photos on `/about` and in `HeroProductCollage` are approved individually by the parents, including alt
text, since alt text is indexed and read aloud.

## B.8 The sign off sheet

One row per item, printed and signed before the domain goes live. No item ships on a verbal yes.

```
פריט   שורה                              שי    הורים   החלטה                      תאריך
01     קינוח חלבי / אלרגיה               ☐     ☐       נשאר / מרוכך / הוסר
02     "ומאז ידעתי" בגוף ראשון           ☐     ☐       נשאר / מרוכך / הוסר
03     "לא פחדתי מהחוקים"                ☐     ☐       נשאר / מרוכך / הוסר
04     שורת הלילות בכלל                  ☐     ☐       נשארת / הוסרה
05     "הלילות הפחות שקטים"              ☐     ☐       נשאר / מרוכך / הוסר
06     "בניתי לעצמי הגנה"                ☐     ☐       נשאר / מרוכך / הוסר
07     השם נועם                          ☐     ☐       נשאר / "אח קטן"
08     הקשר בין המשאלה ללידה             ☐     ☐       נשאר / הופרד
09     "והבית התמלא באור חדש"            ☐     ☐       נשאר / הוסר
10     המילה דיסלקציה                    ☐     ☐       לא מופיעה / מופיעה
11     איך בדיוק הוא למד                 ☐     ☐       העובדה שנמסרה: __________
12     "היו כאלה שהיו בטוחים שלא אצליח"  ☐     ☐       נשאר / מרוכך / הוסר
13     "הציונים עלו"                     ☐     ☐       נשאר / מרוכך / הוסר
14     כותרת הטיזר בעמוד הבית            ☐     ☐       הנוסח שנבחר: __________
15     "הצלחה מגיעה ממה שמוכנים לעבוד"   ☐     ☐       נשאר / מרוכך
16     "ויש יותר ויותר" + 40+ הדפסות     ☐     ☐       המספר האמיתי: __________
17     הציטוט מהסרט + קרדיט              ☐     ☐       שם הסרט: __________
18     המספר האישי בוואטסאפ              ☐     ☐       מאושר / מספר אחר
19     תמונות לקוחות ומחיקה אחרי 7 ימים  ☐     ☐       מאושר
20     עיר, שעות ותמונות בית             ☐     ☐       מאושר
```

---

# PART C · בדיקת רגרסיה לקול

## C.0 What it runs over

Half the copy on this site lives in files and half lives in Convex rows that Shai edits from `/admin`. A
check that only reads files passes on the day someone types `אנחנו נשמח לעמוד לרשותכם` into the admin.

The script therefore takes paths as arguments and runs identically over:

```
src/content/  src/components/  src/app/       the files
/tmp/shai-copy.txt                            a dump of every Hebrew string in Convex
```

§C.5 has the dump.

## C.1 `scripts/voice-check.sh`

```bash
#!/usr/bin/env bash
# 09d PART C · voice regression test
# usage: scripts/voice-check.sh [paths...]     default: src/content src/components src/app
set -uo pipefail
export LC_ALL=en_US.UTF-8

if [ $# -gt 0 ]; then TARGETS=("$@"); else TARGETS=(src/content src/components src/app); fi
ALLOW="${ALLOW_FILE:-scripts/voice-allow.txt}"
HARD=0
SOFT=0

# strip comments and blank lines: a blank line in a -F pattern file matches every line
# and would silently swallow the entire report
filter() {
  if [ -s "$ALLOW" ]; then
    grep -v -F -f <(grep -v '^[[:space:]]*#' "$ALLOW" | grep -v '^[[:space:]]*$')
  else
    cat
  fi
}

# %s and not %02d: bash printf reads "08" and "09" as invalid octal
fail() { printf '\n[FAIL %s] %s\n' "$1" "$2"; HARD=$((HARD+1)); }
warn() { printf '\n[WARN %s] %s\n' "$1" "$2"; SOFT=$((SOFT+1)); }

hard() { # n, title, grep-args...
  local n="$1" t="$2"; shift 2
  local out; out=$(grep -rnE "$@" "${TARGETS[@]}" 2>/dev/null | filter)
  [ -n "$out" ] && { fail "$n" "$t"; printf '%s\n' "$out"; }
}
soft() {
  local n="$1" t="$2"; shift 2
  local out; out=$(grep -rnE "$@" "${TARGETS[@]}" 2>/dev/null | filter)
  [ -n "$out" ] && { warn "$n" "$t"; printf '%s\n' "$out"; }
}

echo "voice-check over: ${TARGETS[*]}"

# 01 · "אלא" appears exactly once, and it is the film quote
# hardcoded to src/content, so it is skipped when the script runs over a Convex dump
if [ ! -d src/content ]; then
  echo "[skip 01] src/content not present, skipping the אלא count"
  ALA=1
else
  ALA=$(grep -rho 'אלא' src/content 2>/dev/null | wc -l | tr -d ' ')
fi
if [ "$ALA" != "1" ]; then
  fail 01 "\"אלא\" appears $ALA times in src/content, must be exactly 1 (the film quote)"
  grep -rn 'אלא' src/content
else
  echo "[ok   01] אלא x1"
  grep -rn 'אלא' src/content | sed 's/^/          /'
fi

# 02 · em dash or en dash surrounded by spaces
hard 02 'spaced em dash (DECISIONS §2)' ' (—|–|&mdash;|&ndash;) '
soft 02 'em dash anywhere in Hebrew copy' '[א-ת].*(—|–)'

# 03 · direct imperative (09 §5)
hard 03 'direct imperative' \
  '(^|[^א-ת])(שלח|שלחו|לחץ|לחצו|בחר|בחרו|הזמן|הזמינו|גלה|גלו|קנה|קנו|התקשר|התקשרו|הירשם|הירשמו|נסה|נסו|מלאו|העלה|העלו|סובב|סובבו|גרור|גררו|צלם|צלמו|החלף|החליפו|קבל|קבלו|הצטרף|הצטרפו|חייג|חייגו|מהרו|הזדרזו|השאירו|תלחץ|תשלח|תבחר|תעלה|תכתוב|תדליק|תוריד|תפתח)([^א-ת]|$)'
soft 03 'possible imperative, eyeball it' '(^|[^א-ת])(תראה|תבדוק|קח|שים|כתוב|רשום|בוא|בואי|בואו|הביטו|ראו)([^א-ת]|$)'

# 04 · plural business voice (09 §4.1)
hard 04 'plural "we" about the business' -e 'אנחנו' -e 'אנו ' -e ' לנו' -e 'שלנו' -e 'אצלנו' -e 'הצוות'

# 05 · inflated nouns (09 §4.2)
hard 05 'inflated noun' \
  'חוויה|חווית|חוויית|מקצה לקצה|פתרונות|שירות|מקצועי|מקצועיות|ללא פשרות|פרימיום|יוקרתי|חדשנות|מהפכה|התאמה אישית מלאה|מגוון רחב|איכות בלתי מתפשרת'

# 06 · negative parallelism (DECISIONS §1)
hard 06 'negative parallelism' \
  'לא רק .{0,40}אלא|אלא גם|זה לא [^,.]{2,30}, ?זה |לא [^,.]{2,30}, (זה|הוא|היא|אני|זו|הם) '

# 07 · locked spelling and the shekel sign (09 §6)
hard 07 'locked spelling / ₪ beside a digit' -e 'תלת מימד' -e 'תלת-מימד' -e 'תלת ממדי' -e 'ליטופן' -e 'פילאמנט' -e '₪'

# 08 · gershayim must be U+05F4, not ASCII quote
hard 08 'ASCII quote where gershayim belongs' -e 'ש"ח' -e 'מ"מ' -e 'ס"מ'

# 09 · exclamation mark and ellipsis in Hebrew copy (09 §6)
hard 09 '! or … or ... in Hebrew copy' '[א-ת].*(!|…|\.\.\.)'

# 10 · unresolved placeholders
hard 10 'unresolved placeholder' -e '\[אריאל:' -e '{עיר}' -e 'TODO' -e 'lorem'

# 11 · error copy that blames the visitor (09 §5)
hard 11 'error message blames the visitor' \
  'שגית|טעית|לא הזנת|לא בחרת|לא מילאת|חובה למלא|שדה חובה|אתה חייב|הזנת שגוי|קלט שגוי'

# 12 · sales pressure (09 §4.4)
hard 12 'sales pressure' \
  'לחצו כאן|לחץ כאן|מבצע|אל תפספסו|המלאי אוזל|הזדמנות אחרונה|רק היום|לזמן מוגבל|מחיר מיוחד|הנחה מיוחדת'

# 13 · promises that cannot be kept (09 §4.5)
hard 13 'unkeepable promise' \
  'בדיוק כמו בתמונה|תוצאה מושלמת|מושלם ב|100 אחוז|מאה אחוז|מדויק לחלוטין|מובטח|אחריות מלאה'

# 14 · sympathy bait (09 §4.3)
hard 14 'sympathy bait' \
  'למרות הקשיים|ילד מיוחד|סיפור מרגש|מעורר השראה|התגבר על|גבורה|בגבורה|למרות הכל|נאבק ב'

# 15 · emoji, pictographs and arrows as text
EMO=$(find "${TARGETS[@]}" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.txt' \) -print0 2>/dev/null \
  | xargs -0 perl -CSD -ne 'print "$ARGV:$.: $_" if /[\x{1F000}-\x{1FAFF}\x{2190}-\x{21FF}\x{2300}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]/' 2>/dev/null | filter)
[ -n "$EMO" ] && { fail 15 'emoji, pictograph or text arrow (use an SVG glyph)'; printf '%s\n' "$EMO"; }

# 16 · spelled-out numerals where the digit rule applies (09 §6)
soft 16 'spelled-out numeral in a spec context' \
  '(שתי|שני|שלושה|שלוש|ארבעה|ארבע|חמישה|חמש|ששה|שישה|עשרה|עשר) (צבעים|ימים|ימי|דגמים|שעות|יחידות|שקלים|מילימטר|סנטימטר)'

printf '\n----------------------------------------\n'
printf 'hard failures: %d    warnings: %d\n' "$HARD" "$SOFT"
[ "$HARD" -gt 0 ] && exit 1
exit 0
```

Make it executable once: `chmod +x scripts/voice-check.sh`. Run it: `scripts/voice-check.sh`.

Every grep in this script was run against a fixture containing one deliberate violation of each rule
before it was written down. They match what they are supposed to match and they skip the near misses that
matter: `בחרתם` and `לבחור` do not trigger check 3, and `45 ש״ח` with U+05F4 does not trigger check 8.

## C.2 Notes on the checks that are not obvious

**Check 1** counts the trigram, not the word, and then prints every hit so a human sees that the one
survivor is the quote. Counting is the wrong test on its own: one `אלא` in the wrong place while the quote
was deleted would still count as 1. Printing is the test.

**Check 3** uses `[^א-ת]` on both sides instead of `\b`, because BSD grep does not put a word boundary
between a Hebrew letter and a Hebrew letter. That is why `בחרתם` is skipped and a bare `בחר` is caught.
`מלא` was deliberately left out of the hard list: `בצבע מלא` is legitimate and appears in `04` A1. `מלאו`
stays.

**Check 4** is deliberately loose. `לנו` with a leading space catches `לנו` as a word and will
occasionally catch something innocent. A false positive costs five seconds. A missed `אנחנו` costs the
only thing this site has.

**Check 6** catches three shapes. `לא רק X אלא` and `אלא גם` are the textbook form. `זה לא X, זה Y` is the
Hebrew marketing form. The third pattern, `לא X, {pronoun} Y`, catches the version with no `אלא` at all,
which is the one that gets through review. It fires on
`הצלחה לא תלויה במה שקל, היא תלויה במה שעובדים בשבילו`, which is exactly the sentence PART B item 15 warns
about.

**Check 8** is scoped to the paths passed in, which are the rendered surfaces. WhatsApp message builders
are exempt and belong on the allowlist: `04` E2 requires ASCII separators there, because U+05F4 costs
three bytes per character in a `wa.me` URL that has a hard 600 character ceiling, and `מ"מ` inside a chat
message is what people type anyway.

**Check 9** anchors on a Hebrew letter earlier in the line so that TypeScript's `!` operators, `!==` and
non-null assertions do not fire it. A line of pure code with no Hebrew on it is not copy.

**Check 15** uses `perl` rather than `grep -P`, because macOS ships BSD grep with no PCRE. The arrow range
`U+2190-U+21FF` is included on purpose: `03` §3.6 uses a `ChevronGlyph` SVG for the story link arrow, and
the moment someone types `←` instead, this catches it.

**Check 16 is a warning, not a failure.** `09` §6 wants digits from 2 up unless the number is part of
speech, and only a human can tell `עד 4 צבעים` on a spec card from `שלוש עשרה` in a sentence.

## C.3 `scripts/voice-allow.txt`

Fixed strings, one per line, matched with `grep -F`. Every line needs a reason in a comment above it, and
the file is reviewed whenever it grows.

```
# 09 §2 · the film quote is the single licensed "אלא" on the site
לא אלו קלפים החיים נותנים לך, אלא מה אתה בוחר לעשות איתם

# 09d §0 · "בואו" here includes the speaker and is an invitation, not an instruction
בואו נדבר
יש לכם רעיון? בואו נדבר.

# 04 E2 · WhatsApp URLs use ASCII gershayim and ASCII separators by requirement
src/lib/whatsapp.ts
src/lib/generator/waMessage.ts

# 09 §6 · numbers that are part of speech, not specs
שלוש עשרה
```

The two `src/lib/*` lines allowlist whole files by path, which works because `grep -rn` prints the path at
the start of every line and `filter` removes any line containing an allowlisted string. That is blunt and
it is correct here: those two files build chat messages, not page copy, and nothing else lives in them.

## C.4 Known offenders that must be fixed before the first run is meaningful

Running this script against `03`, `04` and `05` as written produces these hits. Fix them at build time,
not at check time, or the first green run will require an allowlist that swallows the rule.

| Check | String | Where | Replacement |
|---|---|---|---|
| 01 | the film quote as home H2 | `03` §3.6 | `למדתי לפרק קירות הרבה לפני שהגיעה המדפסת.` (PART B item 14) |
| 03 | `בחר תמונה` | `04` A1 | `לבחור תמונה` |
| 03 | `צלם עכשיו` | `04` A1 | `לצלם עכשיו` |
| 03 | `החלף תמונה` | `04` A1 | `להחליף תמונה` |
| 03 | `החלף לתבליט` | `04` A1 | `להחליף לתבליט` |
| 03 | `גררו כדי לסובב` | `03` §5.2, `05` | `מסובבים עם האצבע` |
| 03 | `תדליק את האור` | `05` A2 table | `להדליק את האור` |
| 03 | `סובב אותו, ואז תראה כמה זה יוצא.` | `04` PART A step 5 | `מסובבים אותו, ואז רואים כמה זה יוצא.` |
| 03 | `תכתוב לי בוואטסאפ` | `04` A2 keychain description | `כותבים לי בוואטסאפ` |
| 07 | `מתחיל מ-₪45` | `04` A2 price chip | `מתחיל מ-45 ש״ח` |
| 07 | `ליטופן עובד מהאור שעובר...` | `05` C.4 | `ליתופן עובד מהאור שעובר...` |
| 07 | `תלת מימד` in every doc | `03`, `05`, `08` | `תלת ממד` |
| 08 | `מידות: 60x22x4 מ"מ` | `03` §5.5 | allowlisted, it is a WhatsApp string |
| 16 | `עד ארבעה צבעים בהדפסה אחת` | `03` §3.3 | `עד 4 צבעים בהדפסה אחת` |
| 16 | `עד ארבעה צבעים כלולים במחיר` | `04` step 3 subtitle | `עד 4 צבעים כלולים במחיר` |

## C.5 Running the same checks over Convex rows

```ts
// convex/copyAudit.ts
import { query } from './_generated/server';

export const dumpHebrew = query({
  args: {},
  handler: async (ctx) => {
    const out: string[] = [];
    const push = (table: string, id: string, field: string, v: unknown) => {
      if (typeof v === 'string' && /[֐-׿]/.test(v)) out.push(`${table}/${id}:${field}: ${v}`);
    };
    for (const t of ['about', 'products', 'siteSettings', 'filaments', 'galleryItems', 'printTypes', 'pricingSettings'] as const) {
      for (const row of await ctx.db.query(t).collect()) {
        for (const [k, v] of Object.entries(row)) {
          if (Array.isArray(v)) v.forEach((x, i) => push(t, row._id, `${k}[${i}]`, typeof x === 'object' ? JSON.stringify(x) : x));
          else push(t, row._id, k, v);
        }
      }
    }
    return out.join('\n');
  },
});
```

```bash
npx convex run copyAudit:dumpHebrew --prod \
  | python3 -c 'import sys,json; sys.stdout.write(json.load(sys.stdin))' > /tmp/shai-copy.txt
scripts/voice-check.sh /tmp/shai-copy.txt
```

The dump is a flat text file with `table/id:field: value` on each line, so a failure names the exact row
Shai has to open in `/admin`. Check 1 is skipped for the dump, since it hardcodes `src/content`, and the
quote lives in the `about` table too. Run it once a week and after every admin session that touched copy.

## C.6 Meta length check

```js
// scripts/meta-check.mjs
// node scripts/meta-check.mjs
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LIMITS = { title: 60, description: 158, 'og:title': 60, 'og:description': 200 };
let bad = 0;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(e.name)) yield p;
  }
}

for await (const file of walk('src/app')) {
  const src = await readFile(file, 'utf8');
  for (const m of src.matchAll(/^\s*(title|description):\s*'([^']*)'/gm)) {
    const [, key, val] = m;
    if (!/[֐-׿]/.test(val)) continue;
    const limit = LIMITS[key];
    const tag = val.length > limit ? 'TOO LONG' : 'ok';
    if (val.length > limit) bad++;
    console.log(`${String(val.length).padStart(4)}  ${tag.padEnd(9)} ${key.padEnd(12)} ${file}`);
    if (val.length > limit) console.log(`      ${val}`);
  }
}
process.exit(bad ? 1 : 0);
```

It only reads single quoted literals, which is what §A.1 through §A.9 ship. Template literals in
`generateMetadata` are checked at runtime by the guard in §A.5 instead, and that guard is the one that
actually matters because a long product name is the only realistic overflow.

## C.7 Wiring it in

```json
// package.json
{
  "scripts": {
    "voice": "scripts/voice-check.sh",
    "voice:db": "npx convex run copyAudit:dumpHebrew --prod | python3 -c 'import sys,json; sys.stdout.write(json.load(sys.stdin))' > /tmp/shai-copy.txt && scripts/voice-check.sh /tmp/shai-copy.txt",
    "meta": "node scripts/meta-check.mjs",
    "check": "npm run voice && npm run meta && tsc --noEmit && next lint"
  }
}
```

```bash
# .husky/pre-commit
npm run voice
npm run meta
```

```yaml
# .github/workflows/voice.yml
name: voice
on: [push, pull_request]
jobs:
  voice:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: chmod +x scripts/voice-check.sh
      - run: npm run voice
      - run: npm run meta
```

Ubuntu ships GNU grep and macOS ships BSD grep. Every pattern here uses `-E` with syntax both accept, and
`perl -CSD` is present on both. `LC_ALL=en_US.UTF-8` is set inside the script so the Hebrew character
class `[א-ת]` behaves the same on a runner with a C locale as it does on Ariel's machine.

## C.8 The four line manual pass

The script cannot see tone. Before any new string ships, someone reads it out loud and answers:

1. Would a thirteen year old say this sentence to an adult he has never met?
2. Does it state a fact, a price or a next step, rather than a feeling about Shai?
3. If it is an instruction, is it בינוני סתמי, and if it is a button, is it שם פועל?
4. Could this line appear under a photo in a fundraising campaign? If yes, it is rewritten.

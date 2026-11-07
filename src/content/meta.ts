/**
 * src/content/meta.ts
 *
 * Titles, descriptions and Open Graph copy for every route.
 *
 * Source: docs/design/09d-meta-and-approvals.md PART A, which is the dedicated meta
 * document and carries the measured lengths, the canonical rules and the bidi rules for
 * titles. docs/design/09c-site-copy.md §2.9 sketched an earlier, shorter set; where the
 * two differ, 09d ships, because it is the one that checked the strings against a results
 * page. See the return notes for the exact divergences.
 *
 * Rules these strings obey, from 09d §A.0:
 *   · the brand suffix is `שי איזנשטט` and it sits last, after a `|`, with Hebrew on
 *     both sides of the separator, so the neutral pipe resolves RTL
 *   · a title never ends on a bare digit or a Latin run, which is why every price string
 *     ends on `ש״ח`
 *   · `·` appears in OG titles only, never in a title tag
 *   · no invisible direction marks anywhere in metadata: they survive one copy and paste
 *     and then get stripped or doubled, and the failure is invisible in review
 *   · the phone number is never in metadata, because head tags are the cheapest harvest
 *     there is and this is a minor's personal line
 */

export const META_SITE = {
  brandNameHe: "שי איזנשטט",
  defaultTitle: "הדפסת תלת ממד מהתמונה שלכם | שי איזנשטט",
  titleTemplate: "%s | שי איזנשטט",
  locale: "he_IL",
  siteNameHe: "שי איזנשטט",
} as const;

export const META_HOME = {
  title: "הדפסת תלת ממד מהתמונה שלכם | שי איזנשטט",
  description:
    "שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה. אפשר לראות את הדגם מסתובב לפני שמזמינים, ולסגור איתי בוואטסאפ.",
  canonical: "/",
  og: {
    title: "הופך רעיונות לדברים אמיתיים",
    description: "שי, בן 13, מדפיס בתלת ממד. שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה.",
    type: "website",
  },
} as const;

/**
 * `/about` after 07.09.26.
 *
 * `DECISIONS.md` §הסיפור and `RESOLUTIONS.md` ruling 19 take the personal story off the
 * site, and the description that shipped before this one told strangers, in the first
 * person, about a six month old baby. A results page is the one surface a visitor reads
 * before deciding what kind of page this is, so it now names the work and nothing else:
 * what he does, in what order, and what happens when it comes out wrong.
 *
 * The title is `איך אני עובד` rather than `הסיפור שלי`, because that is what the page
 * is now, and Hebrew sits on both sides of the pipe so the separator resolves RTL.
 */
export const META_ABOUT = {
  title: "איך אני עובד | שי איזנשטט, מדפיס בתלת ממד",
  description:
    "אני שי, בן 13, ומדפיס בתלת ממד בהזמנה. מודד לפני, מדפיס, מנקה ובודק, ואם משהו יוצא עקום אני מדפיס שוב. סוגרים הכול בוואטסאפ.",
  canonical: "/about",
  og: {
    title: "מודד, מדפיס, ומתקן עד שזה יוצא נכון",
    description:
      "אני שי, בן 13. מישהו שולח לי תמונה או רעיון, ואני מדפיס אותו ומחזיר דבר שאפשר להחזיק ביד.",
    /** A person, not a post. No `profile:first_name` fields: identity data about a minor. */
    type: "profile",
  },
} as const;

/**
 * Every filtered view keeps `/products` as its canonical and adds `index: false,
 * follow: true` once a filter is active. Crawl the links, index one page.
 */
export const META_PRODUCTS = {
  title: "הדגמים שלי | שי איזנשטט, הדפסת תלת ממד",
  description:
    "מחזיקי מפתחות, ליתופנים, מגנטים, דמויות ותמונות במסגרת. כל דגם בצבעים שבוחרים, עם מחיר שרואים באתר לפני שכותבים לי.",
  canonical: "/products",
  og: {
    title: "הדגמים שלי",
    description: "כל אחד מהם אפשר להזמין בצבעים שאתם בוחרים. המחיר מופיע באתר, וסוגרים בוואטסאפ.",
    type: "website",
  },
} as const;

/**
 * Templates for `/products/[slug]`. `{nameHe}`, `{teaserHe}`, `{price}` and `{leadDays}`
 * are filled in `generateMetadata`.
 *
 * `titleMaxNameChars`: past 34 characters the brand suffix is dropped and the name ships
 * alone, because a truncated brand looks worse than no brand.
 * `descriptionMaxChars`: over 155, `descriptionFallback` ships instead.
 * `og.type` is `website` and not `product`: the product vocabulary expects
 * `product:price:amount` and `product:availability`, which belong to a checkout, and
 * there is no checkout.
 */
export const META_PRODUCT_DETAIL = {
  title: "{nameHe} | שי איזנשטט",
  titleMaxNameChars: 34,
  description: "{nameHe} בהדפסת תלת ממד. {teaserHe} {price} ש״ח בצבע שבוחרים, מוכן תוך {leadDays} ימים.",
  descriptionFallback: "{nameHe} בהדפסת תלת ממד, {price} ש״ח. בוחרים צבע וכמות, ואני מדפיס.",
  descriptionMaxChars: 155,
  og: {
    title: "{nameHe} · {price} ש״ח",
    description: "{teaserHe} בוחרים צבע וכמות, ואני מדפיס כל הזמנה בעצמי.",
    type: "website",
  },
} as const;

/**
 * The description names the payment truth in the results page instead of hiding it until
 * the last step. A visitor who will not order without a credit card should learn it
 * before the click. `/generator?d={draftId}` restores a draft and is never indexed.
 */
export const META_GENERATOR = {
  title: "להפוך תמונה להדפסת תלת ממד | שי איזנשטט",
  description:
    "מעלים תמונה, בוחרים מה מדפיסים ובאילו צבעים, ורואים את הדגם מסתובב עם המחיר. אין תשלום באתר, סוגרים איתי בוואטסאפ.",
  canonical: "/generator",
  og: {
    title: "להפוך תמונה להדפסה",
    description: "מעלים תמונה, בוחרים צבעים, ורואים את הדגם ואת המחיר לפני שמזמינים.",
    type: "website",
  },
} as const;

export const META_CONTACT = {
  title: "יצירת קשר | שי איזנשטט, הדפסת תלת ממד",
  description:
    "הכי מהר זה בוואטסאפ, ואני קורא הכול בעצמי. אפשר גם למלא טופס קצר, ואני חוזר בדרך כלל תוך כמה שעות.",
  canonical: "/contact",
  og: {
    title: "הכי מהר זה בוואטסאפ",
    description: "אני עונה בעצמי, בדרך כלל תוך כמה שעות. אפשר גם למלא טופס קצר באתר.",
    type: "website",
  },
} as const;

/**
 * The route returns HTTP 404, so no robots directive is needed. The title still matters:
 * it is what a person sees in the tab and in their history.
 * The on page copy for this route lives in `src/content/errors.ts`, from 09c §2.7.
 */
export const META_NOT_FOUND = {
  title: "הדף הזה לא נמצא | שי איזנשטט",
  description: "הכתובת הזאת לא קיימת אצלי. הדגמים, המחולל והסיפור נמצאים בתפריט למעלה.",
  og: {
    title: "הדף הזה לא נמצא",
    description: "הכתובת לא קיימת. אפשר להתחיל מהדגמים או מהמחולל.",
    type: "website",
  },
} as const;

/**
 * `/o/[code]` holds a customer's uploaded photo behind a ten character code. It is not a
 * marketing surface, so it carries no meta description: a description is written to be
 * surfaced and this page is written to be sent to one person.
 *
 * `/o/` must NOT be added to the robots Disallow list. A Disallow stops the crawler from
 * fetching the page, which means it never reads the noindex, and a URL discovered from a
 * shared link can still be indexed as a bare address. Allow the crawl, let the noindex
 * work, keep the page out of the sitemap, and never link to it from the site.
 * `noimageindex` keeps the customer's photo out of image search if a link ever leaks.
 */
export const META_OFFER = {
  title: "הדגם שבניתם באתר | שי איזנשטט",
  og: {
    title: "הזמנה מהאתר, {price} ש״ח",
    description: "כאן נמצאים התמונה, הדגם והמחיר שבניתם.",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
} as const;

/** No OG tags, no JSON-LD, and a `Disallow: /admin` in `robots.ts`. */
export const META_ADMIN = {
  title: "ניהול",
  robots: { index: false, follow: false },
} as const;

/**
 * 09d §A.12. Where an OG card is generated rather than static, and whether Hebrew is
 * rendered into it. Satori needs the font buffer loaded and the text wrapped in a
 * `direction: rtl` element wherever Hebrew appears; a bidi bug there is silent and
 * produces a card that reads backwards, so every card gets looked at once at 1200x630.
 */
export const OG_IMAGE_PLAN: readonly {
  route: string;
  source: string;
  hebrew: boolean;
}[] = [
  { route: "/", source: "public/assets/og/home.webp", hebrew: false },
  { route: "/about", source: "src/app/about/opengraph-image.tsx", hebrew: true },
  { route: "/products", source: "public/assets/og/products.webp", hebrew: false },
  { route: "/products/[slug]", source: "src/app/products/[slug]/opengraph-image.tsx", hebrew: true },
  { route: "/generator", source: "public/assets/og/generator.webp", hebrew: false },
  { route: "/contact", source: "public/assets/og/home.webp", hebrew: false },
  { route: "/o/[code]", source: "src/app/o/[code]/opengraph-image.tsx", hebrew: false },
];

/** The Latin wordmark that stands in for Hebrew on the cards that carry no Hebrew. */
export const OG_LATIN_WORDMARK = "SHAI 3D";

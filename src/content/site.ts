/**
 * src/content/site.ts
 *
 * Global chrome: announcement bar, navigation, header, mobile menu, sticky action bar,
 * footer. Every string is transcribed from docs/design/09c-site-copy.md §2, and the
 * footer story lines from docs/design/09b-about-page.md §15.
 *
 * Nothing here is paraphrased. A value marked `default` is the fallback that renders
 * before the `siteSettings` query returns, because a page that paints before the query
 * lands cannot show an empty field.
 */

import { waNumberDisplay } from "@/lib/whatsapp";

export const SITE = {
  brandNameHe: "שי איזנשטט",
  /** Spine phrase 1. Appears in the hero, the footer and the top of the story page. */
  spineHe: "הופך רעיונות לדברים אמיתיים.",
  /**
   * Sits in the wordmark column, under the spine phrase.
   *
   * Checked against `RESOLUTIONS.md` rulings 19 to 21 on 07.09.26 and left as it stands:
   * it is two sentences about the work and carries nothing the rulings remove. It used to
   * cite `docs/design/09b-about-page.md` §15, which is now a historical document.
   */
  footerStoryHe: [
    "אני שי, בן 13, ואני מדפיס בתלת ממד.",
    "כל הזמנה שיוצאת מהמדפסת עברה קודם דרך הידיים שלי.",
  ],
  /**
   * The number is assembled at call time and never sits in the served HTML.
   * Components read it from a client effect, per DECISIONS.md.
   */
  phoneDisplay: waNumberDisplay,
} as const;

/** 09c §2.1. `text` is the default for `siteSettings.announcementHe`. The turquoise word is `איסוף`. */
export const ANNOUNCEMENT = {
  text: "משלוחים לכל הארץ. איסוף עצמי בתיאום.",
  linkLabel: "לפרטים",
  dismissAria: "לסגור את ההודעה",
  highlightWord: "איסוף",
} as const;

/** 09c §2.2. */
export const NAV = {
  items: [
    { label: "דגמים", href: "/products" },
    { label: "המחולל", href: "/generator" },
    { label: "הסיפור שלי", href: "/about" },
    { label: "יצירת קשר", href: "/contact" },
  ],
} as const;

/** 09c §2.3. */
export const HEADER = {
  cta: "להפוך תמונה להדפסה",
  ctaHref: "/generator",
  wordmarkAria: "שי איזנשטט, לדף הבית",
  menuOpenAria: "לפתוח תפריט",
  menuCloseAria: "לסגור תפריט",
  skipLink: "לדלג לתוכן",
} as const;

/**
 * 09c §2.4.
 * [אריאל: לוודא שיש חשבון אינסטגרם וחשבון טיקטוק פעילים. אם אין, השורה יורדת ולא מוחלפת בפלייסהולדר]
 */
export const MOBILE_NAV = {
  primaryCta: "להפוך תמונה להדפסה",
  secondaryCta: "לכתוב לשי בוואטסאפ",
  socialLine: "אינסטגרם · טיקטוק",
} as const;

/** 09c §2.5. `StickyActionBar`, one entry per surface. */
export const STICKY_BAR = {
  generator: { primary: "להפוך תמונה להדפסה", secondary: "דגמים" },
  product: { primary: "לשלוח לשי בוואטסאפ" },
  catalog: { primary: "להפוך תמונה להדפסה", secondary: "וואטסאפ" },
  contact: { primary: "לפתוח וואטסאפ", secondary: "למלא טופס" },
} as const;

/**
 * 09c §2.6.
 * The full stop in `spine` is red. `noPaymentNote` is the turquoise line and it is not
 * fine print. No city name appears anywhere, per decision 9 in 09c §1.
 * [אריאל: לאשר את השעות ואת מחיר המשלוח מול שי וההורים לפני עלייה לאוויר]
 */
export const FOOTER = {
  spine: "הופך רעיונות לדברים אמיתיים.",
  ctaLabel: "וואטסאפ",
  columns: {
    nav: {
      title: "ניווט",
      items: [
        { label: "דגמים", href: "/products" },
        { label: "המחולל", href: "/generator" },
        { label: "הסיפור שלי", href: "/about" },
        { label: "יצירת קשר", href: "/contact" },
      ],
    },
    hours: {
      title: "שעות",
      lines: ["ראשון עד חמישי 16:00-20:00", "שישי 09:00-13:00", "שבת סגור"],
    },
    shipping: {
      title: "משלוח ואיסוף",
      lines: ["איסוף עצמי בתיאום", "משלוח עד הבית 25 ש״ח", "מוכן תוך 3 ימי עבודה"],
    },
  },
  noPaymentNote: "אין תשלום באתר. סוגרים הכול בוואטסאפ.",
  credit: "אריאל · 2026",
} as const;

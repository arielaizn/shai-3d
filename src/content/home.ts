/**
 * src/content/home.ts
 *
 * The whole home page, transcribed from docs/design/09c-site-copy.md §3.
 *
 * `story` is the exception. It was rewritten on 07.09.26 against `DECISIONS.md`
 * הסיפור and `RESOLUTIONS.md` ruling 19, which cancel the personal story after
 * Ariel saw it rendered. `docs/design/09b-about-page.md`, which the teaser used to be
 * transcribed from, is a historical document and nothing here is built from it.
 *
 * Static on purpose: the hero is the LCP element and it must render with no query.
 */

export const HOME = {
  /**
   * 09c §3.1. `אמיתיים` carries the marker device, in turquoise. The full stop after it
   * is a red span at 1.15em and is not part of the marker.
   */
  hero: {
    eyebrow: "מדפיס בתלת ממד, בן 13, ומקבל הזמנות",
    headline: {
      line1: "הופך רעיונות",
      line2: "לדברים אמיתיים.",
      /** The one word inside `MarkerHighlight` on this page. */
      markedWord: "אמיתיים",
      markerColor: "turquoise",
    },
    subhead:
      "שולחים לי תמונה, בוחרים צבעים, ואני מדפיס אותה. אפשר לראות איך זה ייראה עוד לפני שמזמינים.",
    primaryCta: { label: "להפוך תמונה להדפסה", href: "/generator" },
    secondaryCta: { label: "לראות דגמים", href: "/products" },
  },

  /**
   * 09c §3.2. Default for `siteSettings.trustStats`. Three items, never two and never four.
   * [אריאל: לאמת מול שי כמה הדפסות באמת יצאו עד היום. מספר שאי אפשר להגן עליו מוריד את כל
   * האתר, כי כל הנכס שלו הוא שהסיפור נכון. אם אין ספירה, השורה מוחלפת ב"ההזמנות כבר מגיעות"]
   */
  trust: {
    items: ["40+ הדפסות שיצאו מהבית", "מוכן תוך 3 ימים", "איסוף עצמי או משלוח"],
    /** The replacement for `items[0]` if no defensible count exists. */
    fallbackFirstItem: "ההזמנות כבר מגיעות",
  },

  /** 09c §3.3. The yellow step numbers are graphics, not strings. */
  how: {
    heading: "איך זה עובד",
    steps: [
      { title: "שולחים תמונה", body: "כל תמונה מהטלפון מתאימה." },
      { title: "בוחרים צבעים", body: "עד 4 צבעים בהדפסה אחת." },
      { title: "מקבלים", body: "איסוף עצמי או משלוח עד הבית." },
    ],
    invite: {
      heading: "רוצים לראות איך התמונה שלכם נראית מודפסת?",
      cta: "להפוך תמונה להדפסה",
      href: "/generator",
    },
  },

  /** 09c §3.4 and the empty state from 09c §10. */
  products: {
    heading: "מה כבר מודפס אצלי",
    cta: "לכל הדגמים",
    href: "/products",
    empty: "אני מעלה לכאן דגמים בימים הקרובים",
  },

  /** 09c §3.5. No CTA in this band, on purpose. */
  gallery: {
    heading: "כל אחד מהדברים האלה יצא מהמדפסת שלי.",
    pauseAria: "להשהות את הגלריה",
    empty: "עוד לא העליתי לכאן תמונות",
  },

  /**
   * 09c §3.6, rewritten 07.09.26.
   *
   * Every line of the old teaser named material that `RESOLUTIONS.md` ruling 19 takes
   * off the site, and its last long line promised a part of the story that no longer
   * exists. What replaces it is the one claim that sells the page it links to: he does
   * the whole thing himself, and he does it again when it comes out wrong.
   *
   * The marked word is `בעצמי`, in yellow. It is a whole word and it appears in the
   * heading exactly once, which is what `StoryTeaser` splits on: a marked word that is
   * only part of a longer word gets a highlight that stops mid-word. The full stop
   * stays cream.
   */
  story: {
    eyebrow: "קצת עליי",
    heading: "אני מדפיס הכול בעצמי.",
    markedWord: "בעצמי",
    markerColor: "yellow",
    lines: [
      "מודד, מדפיס, ומתקן עד שזה יוצא נכון.",
      "אם משהו יוצא עקום, אני מדפיס שוב.",
    ],
    link: { label: "לקרוא איך אני עובד", href: "/about" },
    /**
     * The long version of the same block, for the day the panel is given room to hold
     * it. The process end to end, in his voice, with nothing in it that ruling 19
     * removes.
     * [אריאל: להחליט אם הבלוק גדל לגרסה הארוכה או נשאר בשתי שורות]
     */
    longLines: [
      "אני בן 13, ואני מדפיס בתלת ממד מהבית.",
      "מישהו שולח לי תמונה או רעיון, ואני מתחיל מהגודל: למה זה מיועד, איפה זה יעמוד, וכמה סנטימטרים זה צריך להיות.",
      "אחר כך אני מסדר את הקובץ, מדפיס פינה קטנה כדי לבדוק צבע ועובי, ורק אז מריץ את ההדפסה המלאה.",
      "כשזה יורד מהמשטח אני מוריד תמיכות, מנקה קצוות ובודק.",
      "אם משהו יוצא עקום, זה נשאר אצלי ואני מדפיס שוב.",
    ],
  },

  /** 09c §3.7. Full red ground, so the CTA inverts to a cream fill with ink text. */
  closing: {
    heading: "מה בא לכם שאדפיס?",
    sub: "כותבים לי בוואטסאפ, מספרים מה בא לכם, ואני עונה.",
    primaryCta: "לכתוב לשי בוואטסאפ",
    secondaryCta: "לראות דגמים",
    secondaryHref: "/products",
    note: "בדרך כלל אני חוזר תוך כמה שעות.",
    /** The message this block sends, built by `buildWaMessage({ kind: "closing_home" })`. */
    waKind: "closing_home",
    waSource: "closing_home",
  },
} as const;

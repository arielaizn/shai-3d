/**
 * src/content/products.ts
 *
 * Catalogue and product detail. Transcribed from docs/design/09c-site-copy.md §4 and §5,
 * with the empty and missing states from §10.
 *
 * Placeholders written as `{n}`, `{nameHe}`, `{price}` are filled at render time.
 */

/** 09c §4. */
export const PRODUCTS = {
  header: {
    heading: "הדגמים שלי",
    sub: "כל אחד מהם אפשר להזמין בצבעים שאתם בוחרים.",
  },

  filters: {
    trigger: "סינון",
    triggerActive: "סינון ({n})",
    clear: "לנקות סינון",
    sheetTitle: "סינון",
    sheetApply: "להציג {n} דגמים",
    sheetApplyOne: "להציג דגם אחד",
    sheetApplyNone: "אין דגם שמתאים",

    category: {
      label: "קטגוריה",
      all: "הכול",
      figures: "דמויות ופסלונים",
      home: "לבית",
      gifts: "מתנות",
      keychains: "מחזיקי מפתחות",
      lithophane: "ליתופן ותמונות",
      games: "משחקים",
      utility: "שימושי",
    },

    color: { label: "צבע", soldOut: "אזל" },

    feature: {
      label: "מאפיין",
      glow: "זוהר בחושך",
      threeD: "אפשר לסובב בתלת ממד",
      custom: "אפשר להתאים אישית",
    },

    price: {
      label: "מחיר",
      under30: "עד 30 ש״ח",
      from30to60: "30 עד 60",
      from60to120: "60 עד 120",
      over120: "מעל 120",
    },
  },

  sort: {
    label: "מיון",
    featured: "מומלצים",
    new: "חדש אצלי",
    priceAsc: "מחיר: מהנמוך",
    priceDesc: "מחיר: מהגבוה",
  },

  resultCount: "{n} דגמים",
  resultCountOne: "דגם אחד",

  /**
   * `threeD` shows only when `modelGlbUrl` exists. A promise in the grid that the product
   * page does not keep breaks trust faster than a surprise price.
   */
  badges: {
    threeD: "3D",
    threeDAria: "אפשר לסובב בתלת ממד",
    glow: "זוהר בחושך",
    new: "חדש",
  },

  card: {
    /** Desktop hover only. */
    rotateHint: "אפשר לסובב אותו",
    priceSuffix: "ש״ח",
    linkAria: "{nameHe}, {price} ש״ח",
  },

  /** 09c §4.5. A conversion screen, so it carries the red CTA of the page. */
  empty: {
    title: "אין לי דגם כזה עדיין.",
    body: "אפשר לבקש ממני להדפיס בדיוק את מה שחיפשתם.",
    primaryCta: "לכתוב לשי בוואטסאפ",
    secondaryCta: "לנקות סינון",
    waKind: "catalog_empty",
    waSource: "catalog_empty",
  },

  /** 09c §4.6. The generator strip inside the grid. */
  strip: {
    line: "לא מצאתם בדיוק את מה שרציתם? מעלים תמונה ואני מדפיס אותה.",
    cta: "להפוך תמונה להדפסה",
    href: "/generator",
  },
} as const;

/** 09c §5. */
export const PRODUCT = {
  breadcrumb: { root: "דגמים", href: "/products" },

  price: { suffix: "ש״ח", each: "ליחידה" },

  color: { label: "צבע", glowChip: "זוהר בחושך", soldOut: "אזל" },

  quantity: {
    label: "כמות",
    decAria: "פחות אחד",
    incAria: "עוד אחד",
    max: "לכמות גדולה יותר כותבים לי ואני בונה מחיר.",
  },

  cta: {
    primary: "לשלוח לשי בוואטסאפ",
    secondary: "יש לי שאלה על הדגם הזה",
    primaryWaSource: "product_cta",
    secondaryWaSource: "product_question",
  },

  assurances: ["מוכן תוך 3 ימים", "איסוף עצמי או משלוח", "אין תשלום באתר, סוגרים בוואטסאפ"],

  makerNote: {
    line: "שי, בן 13, מדפיס כל הזמנה בעצמו.",
    link: "קצת עליי",
    href: "/about",
  },

  /** 09c §5.2. */
  viewer: {
    dragHint: "לגרור כדי לסובב",
    thumb3d: "תלת ממד",
    reset: "לחזור להתחלה",
    autoRotate: "סיבוב אוטומטי",
    magnetHint: "לסובב ולראות את הגב",
    loading: "בונה את התצוגה",
    loadFailed:
      "התצוגה בתלת ממד לא נטענה. אפשר להזמין גם ככה, ואני שולח צילום של ההדפסה לפני שהיא יוצאת אליכם.",
    noWebgl:
      "הדפדפן הזה לא מציג תלת ממד. יש כאן תמונה שמסתובבת, והמידות והמחיר נשארים מדויקים.",
  },

  /** 09c §5.3. Every value renders inside a `<bdi>`; the Hebrew unit stays outside it. */
  spec: {
    heading: "מפרט",
    rows: {
      dimensions: "מידות",
      material: "חומר",
      printTime: "זמן הדפסה",
      weight: "משקל",
      layer: "עובי שכבה",
      colors: "צבעים אפשריים",
      leadTime: "מוכן תוך",
    },
    units: { mm: "מ״מ", grams: "גרם", days: "ימים" },
    empty: "עוד לא מדדתי את זה",
  },

  description: { heading: "על הדגם" },
  related: { heading: "עוד דברים שיצאו לי מהמדפסת" },

  /** 09c §5.5. */
  notFound: {
    title: "הדגם הזה כבר לא באתר",
    body: "לפעמים אני מוריד דגם כדי לשפר אותו. אפשר לראות מה שיש עכשיו, או לכתוב לי מה חיפשתם.",
    primaryCta: "לראות דגמים",
    primaryHref: "/products",
    secondaryCta: "לכתוב לשי בוואטסאפ",
  },
} as const;

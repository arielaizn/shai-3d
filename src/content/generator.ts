/**
 * src/content/generator.ts
 *
 * The generator, end to end, plus the `/o/{code}` offer page.
 * Transcribed from docs/design/09c-site-copy.md §6, §8 and §12, with the empty states
 * from §10.
 *
 * Step order follows RESOLUTIONS.md §ב.1 and §ב.2, not the order printed in 09c §6.2:
 * `סוג · תמונה · צבעים · גודל · דגם · מחיר`, six steps, print type first and photo
 * second. Every arrival used to open on an upload wall, which asked a visitor who had
 * known the site for nine seconds to hand over a photo of their child before seeing one
 * product or one price.
 *
 * Print type keys are locked to `lithophane | relief | glow | standee | keychain |
 * magnet | framed` by RESOLUTIONS.md §ב.6, and the asset file names are tied to them.
 */

import { waNumberDisplay } from "@/lib/whatsapp";

export type GeneratorStepKey = "type" | "photo" | "colors" | "size" | "model" | "price";

export type GeneratorStep = {
  key: GeneratorStepKey;
  /** The short word on the progress rail. */
  railLabel: string;
  title: string;
  helper: string;
};

/** 09c §6.2, reordered per RESOLUTIONS.md. The price screen is a step with its own URL. */
export const GENERATOR_STEPS: readonly GeneratorStep[] = [
  {
    key: "type",
    railLabel: "סוג",
    title: "מה מדפיסים",
    helper: "7 דרכים להוציא את התמונה מהמסך.",
  },
  {
    key: "photo",
    railLabel: "תמונה",
    title: "התמונה",
    helper: "מעלים תמונה אחת. ממנה נבנה הכל.",
  },
  { key: "colors", railLabel: "צבעים", title: "צבעים", helper: "4 צבעים כלולים במחיר." },
  { key: "size", railLabel: "גודל", title: "גודל וכמות", helper: "כמה גדול, וכמה יחידות." },
  {
    key: "model",
    railLabel: "דגם",
    title: "הדגם שלכם",
    helper: "מסובבים אותו, ואז רואים כמה זה יוצא.",
  },
  { key: "price", railLabel: "מחיר", title: "זה המחיר", helper: "לפי מה שבחרתם" },
];

export type PrintTypeKey =
  | "lithophane"
  | "relief"
  | "glow"
  | "standee"
  | "keychain"
  | "magnet"
  | "framed";

export type PrintTypeCopy = {
  key: PrintTypeKey;
  nameHe: string;
  taglineHe: string;
  descriptionHe: string;
};

/**
 * 09c §6.4. The name, the tagline, and the text of the bottom sheet.
 *
 * `glow` deviates from 09c on purpose. 09c described it as a lithophane in glow filament
 * with a single colour; RESOLUTIONS.md §ב.5 rules that `glow` is a relief printed in glow
 * filament, `maxColors 4`, `backlit false`. The name, tagline and description below were
 * rewritten to match the ruling, in the same voice.
 */
export const PRINT_TYPES: readonly PrintTypeCopy[] = [
  {
    key: "lithophane",
    nameHe: "ליתופן",
    taglineHe: "נדלק כשיש אור מאחור",
    descriptionHe:
      "לוח דק בצבע אחד. איפה שהתמונה כהה אני מדפיס עבה, ואיפה שהיא בהירה אני מדפיס דק, ואז האור שעובר דרכו מצייר את התמונה. בלי אור מאחור הוא נראה כמו לוח לבן חלק. מגיע עם מעמד קטן.",
  },
  {
    key: "relief",
    nameHe: "תבליט מהתמונה",
    taglineHe: "בולט מהלוח, נוגעים בו",
    descriptionHe:
      "לוח שטוח שהתמונה עולה ממנו החוצה, כמו מטבע. אפשר להעביר עליו יד ולהרגיש את הקווים. עובד הכי טוב על פנים גדולות ורקע פשוט.",
  },
  {
    key: "glow",
    nameHe: "תבליט זוהר בחושך",
    taglineHe: "ביום תבליט, בלילה זוהר",
    descriptionHe:
      "אותו תבליט, בפילמנט שסופג אור ומחזיר אותו בחושך. משאירים אותו כמה דקות ליד מנורה והוא זוהר בערך שעה ואז נחלש. הפילמנט הזוהר ירקרק, ושאר הצבעים נבחרים כרגיל.",
  },
  {
    key: "standee",
    nameHe: "דמות עומדת למדף",
    taglineHe: "עומדת לבד על המדף",
    descriptionHe:
      "גזרה של התמונה שעומדת על בסיס משלה. אני מנקה את הרקע, משאיר את מה שחשוב, ומדפיס בעובי של סנטימטר עם רגל מאחור.",
  },
  {
    key: "keychain",
    nameHe: "מחזיק מפתחות",
    taglineHe: "התמונה נוסעת איתכם",
    descriptionHe:
      "קטן, חזק, עם חור לטבעת. אני מדפיס אותו במילוי גבוה כדי שלא יישבר בכיס. שם או תאריך אפשר להוסיף, כותבים לי על זה בוואטסאפ.",
  },
  {
    key: "magnet",
    nameHe: "מגנט למקרר",
    taglineHe: "מחזיק על המקרר באמת",
    descriptionHe:
      "לוח קטן עם שקע מאחור למגנט עגול שאני מדביק בעצמי. נשאר על המקרר גם כשסוגרים חזק.",
  },
  {
    key: "framed",
    nameHe: "תמונה במסגרת לקיר",
    taglineHe: "נתלית כמו תמונה",
    descriptionHe:
      "הלוח הכי גדול שאני מדפיס, עם מסגרת שמודפסת יחד איתו ווו לתלייה מאחור. צבע אחד ללוח וצבע שני למסגרת.",
  },
];

export const GENERATOR = {
  /** 09c §6.1. */
  page: {
    heading: "להפוך תמונה להדפסה",
    sub: "מעלים תמונה, בוחרים איך היא נראית בתלת ממד, ורואים את המחיר לפני שמזמינים.",
  },

  /** 09c §6.2. `stepAria` reads six because the price screen is its own step. */
  nav: {
    back: "אחורה",
    next: "להמשיך",
    stepAria: "שלב {n} מתוך 6",
    editStep: "לפתוח שוב",
  },

  /** 09c §6.4. */
  type: {
    heading: "מה מדפיסים",
    sub: "7 דרכים להוציא את התמונה מהמסך.",
    /** Server computed from the real engine on the cheapest configuration, per RESOLUTIONS.md §ב.8. */
    priceChip: "מתחיל מ-{n} ש״ח",
    whatIs: "מה זה",
    sheetClose: "לסגור",
    selectedAria: "נבחר",
  },

  /** 09c §6.3. */
  upload: {
    idle: {
      title: "גוררים לכאן תמונה",
      sub: "או בוחרים אחת מהמחשב",
      button: "לבחור תמונה",
      formats: "JPG · PNG · WEBP · HEIC · עד 25 מגה",
    },
    mobile: { pick: "לבחור תמונה", camera: "לצלם עכשיו" },
    dragging: "אפשר לשחרר כאן",
    uploading: "התמונה עולה",
    uploadingPct: "{pct}%",
    processing: "מכין את התמונה",
    done: "התמונה מוכנה",
    replace: "להחליף תמונה",
    removeAria: "להסיר את התמונה",

    /**
     * Error lines carry no full stop and a separate help line follows.
     * Each one says what I failed to do, never what the visitor did wrong.
     */
    error: {
      tooBig: "הקובץ כבד מדי, אני מקבל עד 25 מגה",
      tooBigHelp: "תמונה ישר מהגלריה כמעט תמיד נכנסת בגודל הזה.",
      unreadable: "לא הצלחתי לפתוח את הקובץ הזה",
      unreadableHelp: "צילום רגיל מהגלריה כמעט תמיד עובד, וגם צילום חדש מהמצלמה.",
      wrongType: "זה לא קובץ תמונה שאני יודע לפתוח",
      wrongTypeHelp: "JPG, PNG, WEBP ו-HEIC עובדים אצלי.",
      failed: "ההעלאה נעצרה באמצע",
      failedRetry: "לנסות שוב",
      offline: "אין חיבור כרגע, אני אנסה שוב לבד",
    },
  },

  /** 09c §6.3. A yellow chip. Never blocks. */
  quality: {
    small: "התמונה קטנה. בהדפסה זה יוצא מרוח, ותמונה גדולה יותר תצא חדה.",
    dark: "התמונה כהה מאוד. בהדפסה כמעט הכול ייצא שחור.",
    blown: "התמונה שרופה באור. הפרטים הבהירים ייעלמו בהדפסה.",
    alpha: "יש ברקע שקיפות. אני אמלא אותה בצבע מלא.",
    flat: "התמונה שטוחה בגוונים. בליתופן זה כמעט לא ייראה, ותבליט יעבוד עליה יותר טוב.",
    flatAccept: "להחליף לתבליט",
    flatKeep: "בכל זאת ליתופן",
  },

  /**
   * 09c §8. The one place on the site that touches this subject.
   * The photo uploads to Convex the moment it is chosen, per RESOLUTIONS.md §ב.4, and the
   * line says exactly that. Seven days, matching the cron in `convex/crons.ts`.
   * [אריאל: להעביר את הקרון של הטיוטות הנטושות ל-7 ימים לפני שהשורה עולה לאוויר]
   */
  photo: {
    privacy: "התמונה נשמרת רק בשביל ההזמנה הזאת. אם ההזמנה לא נסגרת, היא נמחקת אחרי 7 ימים.",
    privacyMoreLabel: "מה קורה לתמונה",
    privacyMore:
      "הכתובת של התמונה אקראית וארוכה, והיא לא מופיעה בגוגל ולא בשום עמוד באתר. אני רואה אותה כדי לדעת מה להדפיס. הזמנה שלא נסגרה נמחקת עם התמונה אחרי 7 ימים, ואפשר גם לבקש ממני למחוק אותה קודם.",
  },

  /** 09c §6.5. */
  colors: {
    heading: "צבעים",
    sub: "4 צבעים כלולים במחיר.",

    finish: {
      all: "רגיל",
      silk: "משי",
      glow: "זוהר",
      wood: "עץ",
      clear: "שקוף",
    },

    soldOut: "אזל",
    presetsTitle: "הבחירה של שי",
    reorder: "להחליף סדר",

    slot: {
      body: "צבע 1 · הגוף",
      frame: "צבע 2 · המסגרת",
      panel: "צבע 1 · הלוח",
      figure: "צבע 1 · הדמות",
      base: "צבע 2 · הבסיס",
      generic: "צבע {n}",
    },

    /** The running count under the grid, updated on every pick. */
    count: {
      none: "עוד לא בחרתם צבע",
      one: "צבע אחד נבחר. נשארו עוד 3 בלי תוספת מחיר.",
      two: "2 צבעים נבחרו. נשארו עוד 2 בלי תוספת מחיר.",
      three: "3 צבעים נבחרו. נשאר עוד אחד בלי תוספת מחיר.",
      four: "4 צבעים נבחרו. זה הכי הרבה שנכנס במחיר.",
      extra: "{n} צבעים נבחרו. {e} מהם בתוספת של {p} ש״ח כל אחד.",
    },

    /** Shown only while their condition holds. */
    note: {
      one: "בחרתם צבע אחד, אז התמונה יוצאת מהגובה ומהצללים.",
      many: "בחרתם {n} צבעים, אז התמונה מתחלקת ל-{n} שכבות צבע. ככה זה יוצא גם בהדפסה.",
      tooClose:
        "{a} ו{b} קרובים מאוד אחד לשני, ובהדפסה קשה להבחין ביניהם. אפשר להחליף אחד מהם לצבע כהה יותר.",
      single: "בליתופן יש צבע אחד. העובי הוא מה שמצייר את התמונה.",
      glow: "החומר סופג אור ביום ומחזיר אותו בחושך. אחרי כמה שעות ליד חלון הזוהר חזק.",
    },

    empty: "נגמרו לי הצבעים לסוג הזה. כותבים לי ואני אומר מה יש",
  },

  /**
   * 09c §6.6. An upsell, not a wall. The fifth click stays open, opens a sheet, states
   * the price and gives the mechanical reason, which is what turns a surcharge into an
   * offer. Never `הגעתם למקסימום`, `לא ניתן להוסיף`, `שדרוג` or `פרימיום`.
   */
  extraColor: {
    heading: "רוצים צבע חמישי?",
    body: "4 צבעים כלולים במחיר. כל צבע נוסף מוסיף 9 ש״ח, כי באמצע ההדפסה אני עוצר את המדפסת, מחליף פילמנט ומתחיל את השכבה מחדש.",
    value: "על התצוגה רואים מיד מה הצבע החמישי עושה לדגם.",
    accept: "להוסיף את הצבע",
    decline: "להישאר עם 4",
    chip5: "צבע חמישי · 9 ש״ח",
    chip6: "צבע שישי · 9 ש״ח",
    chipN: "צבע {n} · 9 ש״ח",
  },

  /** 09c §6.7. */
  size: {
    heading: "גודל וכמות",
    sub: "כמה גדול, וכמה יחידות.",
    label: "גודל",
    hint: {
      matchbox: "בערך בגודל של קופסת גפרורים.",
      card: "בערך בגודל של כרטיס אשראי.",
      palm: "בערך בגודל של כף יד.",
      a5: "בערך בגודל של דף A5.",
    },
    empty: "עוד לא הגדרתי מידות לסוג הזה. נסגור את זה בוואטסאפ",
  },

  quantity: {
    label: "כמות",
    decAria: "פחות אחד",
    incAria: "עוד אחד",
    discount: "{n} יחידות · {pct}% הנחה",
    max: "מעל 25 יחידות כותבים לי ואני בונה מחיר.",
  },

  /**
   * Rush is opt in and never applied on its own, per RESOLUTIONS.md §ב.7, and the fee is
   * capped by `rushFeeMax`. The site promises three working days as standard.
   */
  rush: {
    toggle: "צריך את זה עד תאריך מסוים",
    dateLabel: "עד מתי",
    note: "דחוף מוסיף 25% ולפחות 15 ש״ח.",
    tooSoon: "התאריך הזה קרוב מדי בשבילי, נדבר עליו בוואטסאפ",
  },

  delivery: {
    label: "מסירה",
    pickup: "איסוף עצמי, נסגור מקום בוואטסאפ",
    shipping: "משלוח לכתובת שלכם · 25 ש״ח",
  },

  /** 09c §6.8. Four lines rotate every 550ms over a 2200ms minimum wait. */
  build: {
    cta: "לבנות את הדגם",
    rebuild: "לבנות מחדש",
    lowRes: "לנסות ברזולוציה נמוכה יותר",
  },

  wait: {
    heading: "בונה את הדגם",
    lines: ["קורא את התמונה", "מודד את הצללים", "בונה שכבות", "מרים את הדגם"],
    aria: "בונה את הדגם, רגע אחד",
  },

  fallback: {
    noWebgl: "המכשיר שלכם לא מציג תלת ממד. הנה איך זה ייצא בערך, וההזמנה ממשיכה רגיל.",
    standee: "הגזרה האמיתית נעשית אצלי ביד. זו הדמיה גסה.",
    worker:
      "הבנייה נתקעה לי כאן. אפשר לנסות שוב, או להמשיך ולסגור את הפרטים איתי בוואטסאפ.",
  },

  /**
   * 09c §6.9. `lightsOff` is the toggle label while the light is on, `lightsOn` is the
   * same toggle after it goes dark. One word, one action, because this is the strongest
   * moment in the generator.
   */
  preview: {
    dragHint: "לגרור כדי לסובב",
    magnetHint: "לסובב ולראות את הגב",
    actions: {
      backlight: "אור מאחור",
      lightsOff: "לכבות את האור",
      lightsOn: "להדליק את האור",
      rotate: "סיבוב אוטומטי",
      shot: "לצלם מסך",
      reset: "לחזור להתחלה",
    },
    shotSaved: "התמונה נשמרה אצלכם",
    realSizeChip: "בגודל אמיתי",
  },

  /** 09c §6.9. The honesty block, always visible. */
  honesty: {
    heading: "מה רואים כאן",
    body: [
      "התצוגה הזאת נבנית מהתמונה שלכם ישר בדפדפן, בלי לחכות לשום שרת.",
      "היא מראה את הגובה, את הצבעים ואת הגודל האמיתי של החתיכה.",
      "את קובץ ההדפסה אני בונה אחר כך בעצמי, ואז אני מתקן ידנית כל מקום שיצא עקום.",
    ],
    texture: [
      "בהדפסה אמיתית מרגישים באצבע את קווי השכבות.",
      "זה החלק שהכי אוהבים כשמקבלים את זה ליד.",
    ],
    maker: [
      "אני שי, בן 13, ואני מדפיס בתלת ממד.",
      "אני מודד, מדפיס, בודק, ואם יצא עקום אני מדפיס שוב.",
      "כל הזמנה עוברת דרך הידיים שלי לפני שהיא יוצאת.",
    ],
    /** 13px, under the canvas in every state, including when the block is folded. */
    short: "זו הדמיה. את הדגם האמיתי אני בונה אצלי אחרי שנסגור פרטים.",
  },

  /** 09c §6.10. */
  price: {
    cta: "כמה זה יוצא",
    heading: "זה המחיר",
    subline: "לפי מה שבחרתם",
    /** Example: `ליתופן · 10x15 ס״מ · צבע אחד · יחידה אחת`. */
    configLine: "{printType} · {size} · {colorsHe} · {qtyHe}",
    changeNote: "אם משנים משהו, המספר משתנה מולכם.",
    breakdownOpen: "מאיפה המחיר מגיע",
    breakdownClose: "לסגור את הפירוט",

    /**
     * `QuoteLine.labelHe`. The engine in `convex/lib/priceEngine.ts` owns the numbers;
     * these are the Hebrew labels it prints. `סה״כ` was written out as `סך הכול` because
     * this row also travels into the WhatsApp message, where whole words survive better.
     */
    lineLabels: {
      unit: "{printTypeNameHe} ×{qty}",
      qtyDiscount: "הנחת כמות {pct}%",
      colors: "{n} צבעים נוספים",
      colorsHint: "החלפת פילמנט באמצע",
      finish: "חומר מיוחד",
      setup: "הכנה וחיתוך",
      rush: "דחוף",
      delivery: "משלוח",
      rounding: "עיגול",
      total: "סך הכול",
    },

    noteLabel: "רוצים להוסיף משהו?",
    notePlaceholder: "אפשר לכתוב לי כאן משהו קצר",
    noteCounter: "{n} מתוך 120",
    noteMaxChars: 120,

    /**
     * Defaults for `pricingSettings.priceNoteHe`, `vatNoteHe` and `ctaNoteHe`.
     * No VAT row, no percentage, no `כולל מע״מ`. The number shown is the whole number.
     * [אריאל: לאשר את הנוסח מול ההורים. זו הצהרה על מעמד עסקי של קטין]
     */
    disclaimer: [
      "הצעת מחיר לפי מה שבחרתם. סוגרים סופית בוואטסאפ.",
      "אני בן 13 ועדיין אין לי עוסק, אז אין חשבונית מס ואין מע״מ מעל המחיר.",
    ],
    underCta: "לא מחייב כלום. אפשר לשאול אותי שאלות לפני שמזמינים.",

    primaryCta: "לשלוח לשי בוואטסאפ",
    secondaryCta: "לשמור את ההצעה",
    savedToast: "הקישור נשמר. אפשר לחזור מתי שרוצים.",
    waSource: "generator_price",
  },

  /** 09c §6.11. The number is assembled at runtime and never sits in the HTML. */
  handoff: {
    heading: "ההודעה מוכנה בוואטסאפ",
    body: "אם היא לא נפתחה, הנה הקישור להזמנה שלכם.",
    linkLabel: "לפתוח את דף ההזמנה",
    again: "לבנות עוד אחד",
    desktop: {
      title: "אין וואטסאפ במחשב?",
      copy: "להעתיק את ההודעה",
      /** Assembled at call time, per DECISIONS.md. Never a raw string in the HTML. */
      number: waNumberDisplay,
    },
    copiedToast: "ההודעה הועתקה",
    blockedToast:
      "נראה שוואטסאפ לא נפתח מכאן. אפשר לפתוח את הדף בדפדפן, או להעתיק את ההודעה.",
  },
} as const;

/**
 * 09c §6.12. `/o/{code}`.
 * `offer.heading` speaks in the singular because this page opens inside the chat with
 * Shai and not on the site. It is the only place on the site that leaves the plural,
 * and it is deliberate.
 */
export const OFFER = {
  heading: "ההזמנה שבנית באתר",
  priceLabel: "מחיר באתר",
  codeLabel: "קוד",
  createdLabel: "נבנתה ב",
  cta: "לשלוח לשי בוואטסאפ",
  viewerHint: "לגרור כדי לסובב",
  waSource: "offer_page",

  expired: {
    title: "הקישור הזה כבר לא פעיל",
    body: "הזמנה שלא נסגרה נמחקת עם התמונה אחרי 7 ימים. אפשר לבנות אותה שוב תוך דקה.",
    cta: "לבנות מחדש",
    href: "/generator",
  },
} as const;

/**
 * src/content/about.ts
 *
 * The About page: Shai the maker.
 *
 * **This file was rewritten on 07.09.26 and the rewrite is the governing version.**
 * The updated `הסיפור` section of `DECISIONS.md` and `RESOLUTIONS.md` §ה rulings 19-21 cancel
 * the personal story after Ariel saw it rendered. Gone from the site and not returning:
 * the Haftarah and the bar mitzvah, Noam and the note in the menorah, the allergy and the
 * dairy dessert at six months, the difficult nights, dyslexia, and every medical, family
 * or religious reference. `docs/design/09b-about-page.md` is now a historical document and
 * nothing here is built from it.
 *
 * Also gone: every photograph and every reserved photo slot of Shai or of a family
 * member. The two image rows below hold **product** photography, which `DECISIONS.md`
 * keeps: prints, filament, the printer, the build plate.
 *
 * What the page is now: how he started, how he actually works, what he does when a print
 * comes out wrong, and what someone can ask him to make. The spine phrase
 * `הופך רעיונות לדברים אמיתיים` stays and opens the page.
 *
 * Every line here is also the Convex fallback. If `about.list` fails, the page still
 * ships. This is the one file on the site where duplicated copy is justified.
 */

export type AboutAccent = "red" | "turquoise" | "yellow" | "ink" | "none";

/**
 * Kept in full parity with the `aboutSections.kind` union in `convex/schema.ts`, including
 * kinds the shipped fallback below does not currently use. Shai can add one from the admin.
 */
export type AboutSection =
  | {
      id: string;
      kind: "opener";
      accent: AboutAccent;
      sortOrder: number;
      headingHe: string;
      bodyHe: string;
    }
  | {
      id: string;
      kind: "timelineItem";
      accent: AboutAccent;
      sortOrder: number;
      labelHe: string;
      headingHe: string;
      bodyHe: string;
    }
  | { id: string; kind: "pullQuote"; accent: AboutAccent; sortOrder: number; quoteHe: string }
  | {
      id: string;
      kind: "twoUp";
      accent: AboutAccent;
      sortOrder: number;
      headingHe: string;
      bodyHe: string;
      imageAltHe: string;
    }
  | {
      id: string;
      kind: "imageFull";
      accent: AboutAccent;
      sortOrder: number;
      bodyHe: string;
      imageAltHe: string;
    }
  | { id: string; kind: "statement"; accent: AboutAccent; sortOrder: number; quoteHe: string };

/**
 * The top of the page. Type only, and no portrait anywhere on the route.
 *
 * The age moved out of the `h1` and into the first six words of the sub: it is stated
 * early, with no apology and no softening clause, without being the headline.
 *
 * `AboutHero.tsx` splits `headingHe` on the literal `מדפיס` to place the turquoise mark,
 * so the heading must contain that word exactly once. It does.
 */
export const ABOUT_HERO = {
  eyebrowHe: "הסיפור שלי",
  headingHe: "אני מדפיס בתלת ממד.",
  subHe: "קוראים לי שי איזנשטט, אני בן 13, ומדפיס בהזמנה מהבית. הנה איך זה עובד אצלי.",
} as const;

/**
 * The two product photographs on the page, keyed by section id.
 *
 * They are real files in `public/assets/about/` and they are the reason no slot on this
 * page is held open any more. `src/components/about/sections.ts` reads this map in
 * `fromFallback` and sets `imageUrl`, so the fallback path renders the picture itself and
 * never a reserved frame.
 */
export const ABOUT_IMAGE_SRC: Record<string, string> = {
  layers: "/assets/about/layer-macro.webp",
  make: "/assets/about/shelf.webp",
};

export const ABOUT_FALLBACK: AboutSection[] = [
  {
    id: "opener",
    kind: "opener",
    accent: "ink",
    sortOrder: 0,
    headingHe: "הופך רעיונות לדברים אמיתיים",
    bodyHe:
      "יש לי מדפסת תלת ממד בבית, ואני מדפיס עליה בהזמנה.\n" +
      "מישהו שולח לי תמונה או רעיון, ואני מחזיר לו דבר שאפשר להחזיק ביד.\n" +
      "הכול עובר דרכי. אני מתכנן, מדפיס, מנקה ובודק לפני שזה יוצא מהבית.",
  },
  {
    id: "start",
    kind: "timelineItem",
    accent: "turquoise",
    sortOrder: 1,
    labelHe: "ההתחלה",
    headingHe: "איך התחלתי",
    // The origin is the one beat on this page nobody can write without Shai. A guess here
    // would be the single most damaging sentence on the site, because the whole asset is
    // that the page is true. The placeholder ships visibly on purpose: it is faster to
    // answer a bracket on a rendered page than to catch an invented fact in review.
    bodyHe:
      "[אריאל: צריך כאן את העובדה האמיתית משי. מאיפה הגיעה המדפסת הראשונה, מה הוא הדפיס בה ראשון, וכמה זמן עבר עד שיצא משהו שהוא הסכים לתת למישהו אחר]",
  },
  {
    id: "plan",
    kind: "timelineItem",
    accent: "turquoise",
    sortOrder: 2,
    labelHe: "תכנון",
    headingHe: "לפני שאני מדפיס",
    bodyHe:
      "אני מתחיל מהגודל. שואל למה זה מיועד ואיפה זה יעמוד, ולפי זה מחליט כמה סנטימטרים.\n" +
      "אחר כך אני מסדר את הקובץ. מנקה רקע ומשאיר את מה שחשוב, ובודק שאין קווים דקים מדי שיישברו ביד.\n" +
      "לפני הדפסה ארוכה אני מדפיס פינה קטנה. זה לוקח כמה דקות וחוסך לילה שלם.",
  },
  {
    id: "layers",
    kind: "imageFull",
    accent: "none",
    sortOrder: 3,
    // A figcaption that describes the picture. It does not claim whose print it is, because
    // the asset was generated and the honest caption is the one about the craft.
    bodyHe: "מקרוב אפשר לראות את השכבות. ככה זה נבנה, אחת על השנייה, מלמטה למעלה.",
    imageAltHe: "תקריב של הדפסת תלת ממד, שכבות דקות זו על גבי זו",
  },
  {
    id: "printing",
    kind: "timelineItem",
    accent: "turquoise",
    sortOrder: 4,
    labelHe: "הדפסה",
    headingHe: "מה קורה במדפסת",
    bodyHe:
      "השכבה הראשונה קובעת הכול. אם היא לא נדבקה טוב למשטח, אני עוצר ומתחיל מהתחלה.\n" +
      "משם זה בעיקר סבלנות. הדפסה גדולה רצה כל הלילה, ואני בודק אותה בבוקר.\n" +
      "כשזה יורד מהמשטח יש עוד עבודה. מוריד תמיכות ומנקה קצוות, ואם זה מגנט אני מדביק אותו בעצמי.",
  },
  {
    id: "reprint",
    kind: "pullQuote",
    accent: "turquoise",
    sortOrder: 5,
    // The strongest sentence available to a maker with no reviews and no business licence.
    // It gets the breath, and the section under it spells out what it covers.
    quoteHe: "אם יצא עקום, אני מדפיס שוב.",
  },
  {
    id: "fix",
    kind: "timelineItem",
    accent: "yellow",
    sortOrder: 6,
    labelHe: "תיקון",
    headingHe: "כשיוצא לא נכון",
    bodyHe:
      "לפעמים הדפסה יוצאת עקומה. פינה מתרוממת, או שמשהו זז באמצע.\n" +
      "מה שיצא ככה נשאר אצלי, ואני מדפיס שוב על חשבוני.\n" +
      "גם אחרי שקיבלתם. אם משהו נשבר בדרך או יצא אחרת ממה שסיכמנו, כותבים לי ואני מדפיס מחדש.",
  },
  {
    id: "make",
    kind: "twoUp",
    accent: "turquoise",
    sortOrder: 7,
    headingHe: "מה אפשר לבקש ממני",
    bodyHe:
      "רוב מה שאני מדפיס מתחיל מתמונה שמישהו שולח לי. מזה יוצא ליתופן, מגנט, מחזיק מפתחות או תמונה במסגרת.\n" +
      "יש גם דברים בלי קטלוג. חלק שנשבר בבית ואי אפשר להשיג, מתנה עם שם עליה, אביזר קטן שמישהו חיפש ולא מצא.\n" +
      "אם יש לכם משהו כזה בראש, שווה לשאול. אם אני לא יודע להדפיס את זה, אני אומר.",
    imageAltHe: "מדף עם הדפסות תלת ממד גמורות בכמה צבעים",
  },
  {
    id: "today",
    kind: "timelineItem",
    accent: "red",
    sortOrder: 8,
    labelHe: "היום",
    headingHe: "איך זה עובד היום",
    bodyHe:
      "ההזמנות מגיעות אליי בוואטסאפ, ואני עונה על כל אחת בעצמי.\n" +
      "אני אומר מראש כמה זה עולה וכמה זמן זה לוקח, ואם משהו לא ריאלי אני אומר את זה לפני שמתחילים.\n" +
      "רוב ההדפסות מוכנות תוך שלושה ימים.",
  },
  {
    id: "offer",
    kind: "statement",
    accent: "ink",
    sortOrder: 9,
    // Ends the page on his own sentence and on the transaction, not on a borrowed line.
    // The film quote that used to sit here is deleted per RESOLUTIONS.md ruling 20. Ruling
    // 20 also names the check: the conjunction that quote turned on now appears nowhere
    // under `src/content/`, which is why this comment does not spell it either.
    // Ships with no full stop.
    quoteHe: "אתם חושבים על משהו, ואני מדפיס אותו",
  },
];

/**
 * A call to action, not a story row, so the story editor cannot reorder or delete it.
 * Ink ground, and the only red on this page.
 * The WhatsApp text comes from `buildWaMessage({ kind: "about_closing" })`, the single
 * builder per RESOLUTIONS.md §א.
 */
export const ABOUT_CLOSING = {
  headingHe: "אם יש לכם רעיון, אני כאן",
  bodyHe: "כותבים לי בוואטסאפ, מספרים מה בא לכם, ואני עונה בעצמי.",
  primaryCtaHe: "לכתוב לשי בוואטסאפ",
  secondaryCtaHe: "לראות דגמים",
  secondaryHref: "/products",
  fallbackResponseTimeHe: "בדרך כלל אני חוזר תוך כמה שעות.",
  noPaymentNoteHe: "אין תשלום באתר. סוגרים הכול בוואטסאפ.",
  waKind: "about_closing",
  waSource: "about_closing",
} as const;

/**
 * `StorySpine.tsx` draws the rail from this; `StoryTimelineItem.tsx` reads `labelHe` into
 * the heading as an overline so a screen reader gets it.
 *
 * The rail is no longer a run of dates. Two of the five stops are moments in time
 * (`ההתחלה`, `היום`) and three are stages of the work, which is what the page is about
 * now. `periodHe` is therefore optional and carried only where a real date exists to be
 * filled in.
 *
 * Marker colours keep the shape of the old rule, two exceptions in a run of turquoise:
 * `תיקון` is yellow because the reprint promise is the moment worth remembering, and
 * `היום` is red because it is where the page arrives.
 */
export type AboutTimelineEvent = {
  id: string;
  labelHe: string;
  periodHe?: string;
  markerAccent: "turquoise" | "yellow" | "red";
};

export const ABOUT_TIMELINE: AboutTimelineEvent[] = [
  {
    id: "start",
    labelHe: "ההתחלה",
    periodHe: "[אריאל: לוודא באיזה גיל הגיעה המדפסת הראשונה]",
    markerAccent: "turquoise",
  },
  { id: "plan", labelHe: "תכנון", markerAccent: "turquoise" },
  { id: "printing", labelHe: "הדפסה", markerAccent: "turquoise" },
  { id: "fix", labelHe: "תיקון", markerAccent: "yellow" },
  { id: "today", labelHe: "היום", periodHe: "היום", markerAccent: "red" },
];

/* ------------------------------------------------------------------- landed
 *
 * The component pass shipped with this file on 07.09.26. For the record, so nothing
 * below reads as still outstanding:
 *
 * · `src/components/about/PhotoPlaceholder.tsx` is deleted, along with its
 *   `[אריאל: ...]` note and the two reserved portrait slots it drew. Ruling 21 removes
 *   reserved slots rather than emptying them, so no component on this route can draw
 *   one any more.
 * · `sections.ts` no longer has `AwaitedPhoto`, `awaited()` or `awaiting`. `fromFallback`
 *   reads `ABOUT_IMAGE_SRC[section.id]` into `imageUrl`, and a row that would paint
 *   nothing is dropped rather than left as an empty child in the column.
 * · `StoryTwoUp` falls back to a single column of text and `StoryImageFull` renders
 *   nothing at all when a row carries no picture.
 * · Both pictures are local `/assets/...` paths, so `next/image` needs no
 *   `remotePatterns` entry for them.
 *
 * The copy that lived in other files and still carried removed material was changed in
 * the same pass: `HOME.story` in `src/content/home.ts`, `META_ABOUT` in
 * `src/content/meta.ts`, and the stale document citations in `src/content/site.ts` and
 * `src/app/about/page.tsx`. `SITE.footerStoryHe` was checked and needed no change.
 */

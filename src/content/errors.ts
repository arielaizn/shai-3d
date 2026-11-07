/**
 * src/content/errors.ts
 *
 * Every error, loading and empty state on the site, in one place, so that no screen ships
 * without a string. Transcribed from docs/design/09c-site-copy.md §2.7, §2.8 and §10.
 *
 * A screen level message is a full sentence with a full stop. A field error is written
 * without one. None of them blames the visitor.
 */

/** 09c §2.7. `src/app/not-found.tsx`. */
export const NOT_FOUND = {
  title: "הדף הזה יצא עקום",
  body: "בהדפסה הייתי מדפיס אותו שוב. כאן אפשר פשוט לחזור אחורה.",
  tilesTitle: "אולי חיפשתם את זה",
  homeLink: "לחזור לדף הבית",
  imageAlt: "סבך של חוט הדפסה טורקיז",
  tiles: [
    { label: "דגמים", href: "/products" },
    { label: "המחולל", href: "/generator" },
    { label: "הסיפור שלי", href: "/about" },
  ],
} as const;

/** 09c §2.8. */
export const ERRORS = {
  boundary: {
    title: "זה נפל לי כאן",
    body: "אני מתקן. בינתיים אפשר לחזור לדף הבית או לכתוב לי בוואטסאפ.",
  },
  retry: "לנסות שוב",
  generic: "משהו נתקע אצלי. שווה לנסות שוב עוד רגע.",
  offline: "אין חיבור לאינטרנט כרגע. ברגע שהוא חוזר אפשר להמשיך מכאן.",
  tooManyRequests: "יותר מדי בקשות ברצף. עוד דקה זה נפתח.",
} as const;

export const LOADING = {
  generic: "רגע אחד",
  aria: "טוען תוכן",
} as const;

/**
 * 09c §10. The index of every empty and failed state, keyed the way the spec keys them,
 * so a reviewer can walk the table and the code side by side. The strings live in their
 * own page modules; these are the same values, gathered for the audit.
 */
export const STATE_INDEX: readonly { key: string; text: string }[] = [
  { key: "products.empty.title", text: "אין לי דגם כזה עדיין." },
  { key: "product.notFound.title", text: "הדגם הזה כבר לא באתר" },
  { key: "global.notFound.title", text: "הדף הזה יצא עקום" },
  { key: "offer.expired.title", text: "הקישור הזה כבר לא פעיל" },
  { key: "home.gallery.empty", text: "עוד לא העליתי לכאן תמונות" },
  { key: "home.products.empty", text: "אני מעלה לכאן דגמים בימים הקרובים" },
  {
    key: "generator.colors.empty",
    text: "נגמרו לי הצבעים לסוג הזה. כותבים לי ואני אומר מה יש",
  },
  {
    key: "generator.size.empty",
    text: "עוד לא הגדרתי מידות לסוג הזה. נסגור את זה בוואטסאפ",
  },
  { key: "generator.upload.error.tooBig", text: "הקובץ כבד מדי, אני מקבל עד 25 מגה" },
  { key: "generator.upload.error.unreadable", text: "לא הצלחתי לפתוח את הקובץ הזה" },
  { key: "generator.upload.error.wrongType", text: "זה לא קובץ תמונה שאני יודע לפתוח" },
  { key: "generator.upload.error.failed", text: "ההעלאה נעצרה באמצע" },
  {
    key: "generator.fallback.worker",
    text: "הבנייה נתקעה לי כאן. אפשר לנסות שוב, או להמשיך ולסגור את הפרטים איתי בוואטסאפ.",
  },
  {
    key: "generator.fallback.noWebgl",
    text: "המכשיר שלכם לא מציג תלת ממד. הנה איך זה ייצא בערך, וההזמנה ממשיכה רגיל.",
  },
  {
    key: "product.viewer.noWebgl",
    text: "הדפדפן הזה לא מציג תלת ממד. יש כאן תמונה שמסתובבת, והמידות והמחיר נשארים מדויקים.",
  },
  {
    key: "product.viewer.loadFailed",
    text: "התצוגה בתלת ממד לא נטענה. אפשר להזמין גם ככה, ואני שולח צילום של ההדפסה לפני שהיא יוצאת אליכם.",
  },
  {
    key: "generator.handoff.blockedToast",
    text: "נראה שוואטסאפ לא נפתח מכאן. אפשר לפתוח את הדף בדפדפן, או להעתיק את ההודעה.",
  },
  {
    key: "contact.form.errors.submit",
    text: "ההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לי בוואטסאפ.",
  },
  { key: "global.error.offline", text: "אין חיבור לאינטרנט כרגע. ברגע שהוא חוזר אפשר להמשיך מכאן." },
  { key: "global.error.boundary.title", text: "זה נפל לי כאן" },
  { key: "global.loading.generic", text: "רגע אחד" },
];

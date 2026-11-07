/**
 * src/content/contact.ts
 *
 * The contact page and the five recurring questions.
 * Transcribed from docs/design/09c-site-copy.md §9.
 *
 * Values marked `default` are the fallbacks for `siteSettings`, so the page can paint
 * before the query returns.
 */

import { waNumberDisplay } from "@/lib/whatsapp";

export const CONTACT = {
  /** 09c §9.1. `בואו נדבר` was replaced because `בואו` is an imperative. */
  hero: {
    heading: "כותבים לי",
    sub: "הכי מהר זה בוואטסאפ. אני קורא הכול.",
  },

  /**
   * 09c §9.2.
   * [אריאל: אם אין כתובת מייל ואין אינסטגרם, הכרטיס יורד. כרטיס ריק גרוע מכרטיס חסר]
   */
  channels: {
    whatsapp: {
      title: "וואטסאפ",
      /** Assembled at call time, per DECISIONS.md. Never a raw string in the HTML. */
      number: waNumberDisplay,
      cta: "לפתוח וואטסאפ",
      waSource: "contact_channel",
    },
    instagram: { title: "אינסטגרם", sub: "לראות עוד הדפסות" },
    email: { title: "מייל", sub: "לכתוב לי" },
  },

  /** 09c §9.3. */
  form: {
    heading: "או ממלאים כאן ואני חוזר",
    fields: {
      name: { label: "איך קוראים לכם", placeholder: "שם פרטי מספיק" },
      phone: { label: "טלפון", placeholder: "050-0000000" },
      email: { label: "מייל (לא חובה)", placeholder: "רק אם נוח לכם ככה" },
      message: { label: "מה בא לכם להדפיס", placeholder: "משפט אחד מספיק לי כדי להתחיל" },
    },
    submit: "לשלוח את ההודעה",
    submitPending: "שולח",
    altCta: "או בוואטסאפ",
    privacy: "אני לא שומר את המספר שלכם לשום דבר חוץ מלחזור אליכם.",

    /** Field errors carry no full stop, and none of them blames the person who typed. */
    errors: {
      name: {
        required: "צריך שם כדי שאדע איך לפנות אליכם",
        short: "השם הזה קצר לי מדי",
        long: "השם הזה ארוך מהמקום שיש לי כאן",
      },
      phone: {
        required: "צריך טלפון כדי שאחזור אליכם",
        invalid: "המספר הזה לא נראה לי שלם",
      },
      email: { invalid: "הכתובת הזאת לא נראית לי שלמה" },
      message: {
        required: "צריך משפט אחד על מה שאתם רוצים",
        short: "עוד כמה מילים יעזרו לי להבין",
        long: "זה ארוך מהמקום שיש לי כאן, אפשר לקצר",
      },
      /** Screen level, so it is a full sentence with a full stop. */
      submit: "ההודעה לא נשלחה. אפשר לנסות שוב, או לכתוב לי בוואטסאפ.",
    },
  },

  /** 09c §9.5. */
  success: {
    heading: "קיבלתי.",
    body: "אני חוזר אליכם בדרך כלל תוך כמה שעות.",
    cta: "לפתוח וואטסאפ עכשיו",
    waSource: "contact_form_success",
  },

  /**
   * 09c §9.6. `שבת סגור` is set in ink at 50 percent and carries no explanation.
   * [אריאל: לאשר את השעות מול ההורים. אלה שעות של ילד אחרי בית ספר, והן חייבות להיות אמיתיות]
   */
  hours: {
    heading: "מתי אני זמין",
    lines: ["ראשון עד חמישי 16:00-20:00", "שישי 09:00-13:00", "שבת סגור"],
    response: "בדרך כלל אני חוזר תוך כמה שעות. בימי לימודים זה יכול לקחת עד הערב.",
  },

  /** `note` renders only when `freeShippingOver` is set. No city name appears anywhere. */
  shipping: {
    heading: "משלוח ואיסוף",
    pickup: "איסוף עצמי בתיאום, נסגור מקום בוואטסאפ",
    delivery: "משלוח עד הבית 25 ש״ח",
    lead: "מוכן תוך 3 ימי עבודה",
    note: "משלוח חינם מ-{n} ש״ח",
  },

  faq: { heading: "שאלות שחוזרות" },
} as const;

/**
 * 09c §9.7. Answer [1] is the important one on the page: it takes the structural weakness
 * of a site with no cart and says it straight, which turns it from an apology into an
 * explanation.
 * [אריאל: לאשר עם ההורים שמזומן והעברה הם באמת האופציות, ומי מקבל את הכסף בפועל]
 */
export const FAQ: readonly { q: string; a: string }[] = [
  {
    q: "כמה זמן לוקחת הדפסה?",
    a: "רוב הדברים מוכנים אצלי תוך 3 ימי עבודה. דגם גדול או כמות גדולה לוקחים יותר, ואת זה אני אומר מראש בוואטסאפ.",
  },
  {
    q: "אפשר לשלם באתר?",
    a: "לא. באתר רק בוחרים ורואים מחיר. את התשלום סוגרים איתי ישירות בוואטסאפ, במזומן או בהעברה.",
  },
  {
    q: "איזה תמונות מתאימות להדפסה?",
    a: "תמונה חדה עם צללים ברורים עובדת הכי טוב. תמונה כהה מאוד או שטוחה בגוונים יוצאת פחות טוב, ואני אומר את זה כשאני רואה אותה.",
  },
  {
    q: "כמה צבעים אפשר בהדפסה אחת?",
    a: "4 צבעים כלולים במחיר. אפשר גם יותר, וכל צבע נוסף מוסיף 9 ש״ח כי אני עוצר את המדפסת ומחליף פילמנט באמצע.",
  },
  {
    q: "מה קורה אם ההדפסה יוצאת לא טוב?",
    a: "אני מדפיס שוב. אני בודק כל הזמנה לפני שהיא יוצאת, ואם משהו יצא עקום זה לא מגיע אליכם.",
  },
];

/**
 * Every sentence the panel says when something is wrong, in one place, so the
 * same failure never has two wordings. 06 §C.21.
 *
 * The rules the copy follows: it says what to do, never what went wrong in
 * English, never a code, never an exclamation mark, and never blames Shai.
 */
export const V = {
  required: "צריך למלא את השדה הזה",
  tooShort: (n: number) => `לפחות ${n} תווים`,
  tooLong: (n: number) => `עד ${n} תווים`,
  numberOnly: "רק מספרים",
  positive: "המספר חייב להיות גדול מאפס",
  rangeIls: (a: string, b: string) => `בין ${a} ל-${b}`,
  phoneIl: "מספר טלפון לא תקין. לדוגמה 0585845083",
  emailBad: "כתובת מייל לא תקינה",
  hexBad: "צבע לא תקין. צריך להיראות כך: #F5333F",
  slugTaken: "הכתובת הזאת כבר תפוסה",
  slugBad: "רק אותיות באנגלית, מספרים ומקפים",
  imageTooBig: "התמונה גדולה מדי. עד 10MB",
  imageBadType: "אפשר להעלות JPG, PNG או WebP",
  glbBadType: "רק קובץ GLB",
  glbTooBig: "הקובץ גדול מדי. עד 25MB",
  glbHeavy: "קובץ כבד. באינטרנט של הטלפון זה ייטען לאט",
  needOneImage: "צריך לפחות תמונה אחת לפני שמפרסמים מוצר",
  needOneMaterial: "צריך לבחור לפחות חומר אחד",
  needOneSize: "צריך לפחות גודל אחד פעיל",
  altRequired: "כתוב מה רואים בתמונה. זה מה שקורא המסך יקריא",
  lastOwner: "אי אפשר לכבות את המנהל האחרון",
  noConsent: "הלקוח לא אישר להציג את התמונה",
  offline: "אין חיבור. השינוי יישמר כשהחיבור יחזור",
  saveFailed: "השמירה נכשלה. נסה שוב",
  saved: "נשמר",
  leaveDirtyTitle: "יש שינויים שלא נשמרו. לצאת בלי לשמור?",
  leaveDirtyGo: "לצאת בלי לשמור",
  leaveDirtyStay: "לחזור לעריכה",
} as const;

/**
 * A Convex `ConvexError` carries `{ code, he }` everywhere in this backend, so a
 * failed mutation already has a Hebrew sentence written by the function that
 * refused. This pulls it out, and falls back to the one generic line rather than
 * printing an English stack trace at a thirteen year old.
 */
export function errorHe(error: unknown): string {
  const data = (error as { data?: unknown })?.data;
  if (data && typeof data === "object" && "he" in data) {
    const he = (data as { he?: unknown }).he;
    if (typeof he === "string" && he.length > 0) return he;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return V.offline;
  return V.saveFailed;
}

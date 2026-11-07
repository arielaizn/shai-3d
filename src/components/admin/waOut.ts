/**
 * WhatsApp in the other direction: Shai writing to a customer.
 *
 * `src/lib/whatsapp.ts` is and stays the single builder for the message a
 * VISITOR sends TO Shai. It owns his number, assembles it digit by digit so a
 * scraper cannot lift it out of the HTML, and every field list and trim rule in
 * it is written for that one direction. It cannot address a customer, because
 * the recipient is baked in.
 *
 * This is the other half: the recipient is the customer's number, taken from a
 * lead or a draft, and the text is the two lines 06 §C.6 and §C.7 specify. It is
 * a separate function, not a second copy of that module.
 */

/** `0585845083` or `+972 58-584-5083` and anything between into `972585845083`. */
export function toE164Digits(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+972")) return digits.slice(1);
  if (digits.startsWith("972")) return digits;
  if (/^0\d{8,9}$/.test(digits)) return `972${digits.slice(1)}`;
  if (/^\d{9,15}$/.test(digits)) return digits;
  return null;
}

export function customerWaUrl(phone: string, textHe: string): string | null {
  const digits = toE164Digits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(textHe)}`;
}

/** 06 §C.7, the softer line for somebody who stopped in the middle. */
export const DRAFT_NUDGE_HE =
  "היי, ראיתי שהתחלת להרכיב משהו באתר. רוצה שאמשיך מאיפה שעצרת?";

/** The opening line for a lead, with the order's short code so the thread has one. */
export function leadOpenerHe(publicCode: string): string {
  return `היי, זה שי. קיבלתי את ההזמנה שלך מהאתר, קוד ${publicCode}.`;
}

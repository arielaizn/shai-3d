/**
 * src/components/contact/validation.ts
 *
 * One validator, called from both sides of the contact form.
 *
 * The client calls it on blur and again on submit, so a mistake is named before the
 * network is touched. The server action calls the same function on the same values,
 * because a form that only validates in the browser is not validated at all.
 *
 * Every message comes from `CONTACT.form.errors`, transcribed in 09c §9.4. None of
 * them is written here and none of them is paraphrased: they are the strings, and
 * they carry no full stop, because a field error is a label and not a sentence.
 *
 * The phone rules mirror `convex/contact.ts`, which normalises to `972…` and then
 * tests the result. That module keeps its normaliser private and it runs inside the
 * Convex runtime, so it cannot be imported into a browser bundle. The two copies are
 * kept identical on purpose: a client that accepts a number the mutation rejects
 * produces the worst failure this form has, which is a visitor who filled everything
 * in correctly, saw no field error, and was told the message did not send.
 */

import { CONTACT } from "@/content/contact";

export type ContactFieldName = "name" | "phone" | "email" | "message";
export type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;
export type ContactValues = Record<ContactFieldName, string>;

/** Doc 03 §6.3. The message ceiling is well under the 2000 the mutation allows. */
export const LIMITS = {
  nameMin: 2,
  nameMax: 60,
  messageMin: 5,
  messageMax: 1200,
} as const;

/** Tab order, and the order the first invalid field is looked for in. */
export const FIELD_ORDER: readonly ContactFieldName[] = ["name", "phone", "email", "message"];

const ERRORS = CONTACT.form.errors;

export function emptyContactValues(): ContactValues {
  return { name: "", phone: "", email: "", message: "" };
}

/**
 * `0585845083` · `058-584-5083` · `+972 58 584 5083` all become `972585845083`.
 * Anything else is returned with its punctuation stripped and nothing else done to
 * it, so the caller sees a value it can reject rather than a value it mangled.
 */
export function normaliseIsraeliPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  const bare = digits.startsWith("+") ? digits.slice(1) : digits;
  if (bare.startsWith("0")) return `972${bare.slice(1)}`;
  if (bare.startsWith("972")) return bare;
  return bare;
}

/** A normalised Israeli mobile (`9725XXXXXXXX`) or landline. */
export function isIsraeliPhone(normalised: string): boolean {
  return /^9725\d{8}$/.test(normalised) || /^972\d{8,9}$/.test(normalised);
}

/**
 * Deliberately loose, and identical to the mutation's test. A stricter pattern
 * rejects real addresses, and the only thing this check has to catch is the typo
 * the visitor can see for themselves once it is pointed at.
 */
export function isEmailAddress(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function validateName(raw: string): string | undefined {
  const value = raw.trim();
  if (value.length === 0) return ERRORS.name.required;
  if (value.length < LIMITS.nameMin) return ERRORS.name.short;
  if (value.length > LIMITS.nameMax) return ERRORS.name.long;
  return undefined;
}

export function validatePhone(raw: string): string | undefined {
  const value = raw.trim();
  if (value.length === 0) return ERRORS.phone.required;
  if (!isIsraeliPhone(normaliseIsraeliPhone(value))) return ERRORS.phone.invalid;
  return undefined;
}

/** Optional. An empty field is a valid field, which is what the label promises. */
export function validateEmail(raw: string): string | undefined {
  const value = raw.trim();
  if (value.length === 0) return undefined;
  if (!isEmailAddress(value)) return ERRORS.email.invalid;
  return undefined;
}

export function validateMessage(raw: string): string | undefined {
  const value = raw.trim();
  if (value.length === 0) return ERRORS.message.required;
  if (value.length < LIMITS.messageMin) return ERRORS.message.short;
  if (value.length > LIMITS.messageMax) return ERRORS.message.long;
  return undefined;
}

export function validateField(field: ContactFieldName, raw: string): string | undefined {
  switch (field) {
    case "name":
      return validateName(raw);
    case "phone":
      return validatePhone(raw);
    case "email":
      return validateEmail(raw);
    case "message":
      return validateMessage(raw);
  }
}

/** Every field at once. An empty object means the form may be sent. */
export function validateContact(values: ContactValues): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values[field]);
    if (message !== undefined) errors[field] = message;
  }
  return errors;
}

export function hasErrors(errors: ContactFieldErrors): boolean {
  return FIELD_ORDER.some((field) => errors[field] !== undefined);
}

/** The first field in tab order that is holding an error, for focus after a failure. */
export function firstInvalidField(errors: ContactFieldErrors): ContactFieldName | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

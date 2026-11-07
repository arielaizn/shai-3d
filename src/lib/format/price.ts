/**
 * Price formatting. Doc 02 §4.4.ב, amended by RESOLUTIONS §15 and §18.
 *
 * Two rules decide everything in this file:
 *
 * 1. The engine works in **integer agorot** (RESOLUTIONS §א), so every function here
 *    takes agorot. Nothing in the codebase multiplies or divides by 100 on its own.
 * 2. The display unit is `ש״ח` with a gershayim, never `₪` followed by a digit,
 *    which reverses in some Android webviews (doc 03 §8).
 *
 * The digits are assembled from `formatToParts` rather than by string concatenation,
 * because the raw `he-IL` output carries directional marks and a symbol position that
 * moves between ICU versions. We decide the shape and lock it.
 */

/** The unit, with a gershayim U+05F4. Never a straight double quote. */
export const SHEKEL_UNIT = "ש״ח";

const digitFormatter = new Intl.NumberFormat("he-IL-u-nu-latn", {
  style: "currency",
  currency: "ILS",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0, // no agorot on screen. The prices are whole.
  useGrouping: true, // 1,240
  numberingSystem: "latn", // western digits, locked
});

/** Whole shekels, rounded. The engine keeps the agorot, the screen never shows them. */
export function agorotToShekels(agorot: number): number {
  return Math.round(agorot / 100);
}

/** Whole shekels to agorot, for the rare literal written in shekels. */
export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * 100);
}

/**
 * The grouped digits of a whole-shekel amount, with no symbol, no unit and no
 * directional marks: `1240` becomes `"1,240"`.
 */
export function formatShekels(shekels: number): string {
  return digitFormatter
    .formatToParts(Math.abs(Math.round(shekels)))
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");
}

/**
 * The digits a `<Price>` renders. Takes agorot, returns the grouped shekel digits
 * with no sign: `45600` becomes `"456"`.
 *
 * The sign is dropped on purpose. A price is never negative, and a breakdown line
 * that is (a quantity discount) renders through `formatAgorotDelta` instead, which
 * makes its direction explicit rather than leaving a bare minus to the bidi algorithm.
 */
export function formatAgorot(agorot: number): string {
  return formatShekels(agorotToShekels(agorot));
}

/**
 * A signed amount for a breakdown or delta line: `+12`, `-45`, `0`.
 * The sign is an ASCII `+` or `-`, which is a neutral character, so the caller still
 * has to isolate the whole run in a `<bdi>`.
 */
export function formatAgorotDelta(agorot: number): string {
  const shekels = agorotToShekels(agorot);
  const digits = formatShekels(shekels);
  if (shekels > 0) return `+${digits}`;
  if (shekels < 0) return `-${digits}`;
  return digits;
}

/**
 * What a screen reader says.
 *
 * RESOLUTIONS §15: `<bdi aria-label>` maps to role `generic`, which is prohibited
 * from carrying an accessible name, so every screen reader ignores it and the price
 * announced as silence on every screen of the site. The name therefore lives on a
 * separate sr-only element, and this function produces its text.
 *
 * Hebrew grammar, which the original `${n} שקלים` template got wrong for 1 and 2:
 * `שקל אחד` for one, `שני שקלים` for two, `{n} שקלים` above that.
 */
export function spokenPrice(agorot: number): string {
  const shekels = agorotToShekels(agorot);
  const magnitude = Math.abs(shekels);
  const words =
    magnitude === 1 ? "שקל אחד" : magnitude === 2 ? "שני שקלים" : `${formatShekels(magnitude)} שקלים`;
  return shekels < 0 ? `מינוס ${words}` : words;
}

/** The visible string, for the places that need it as plain text: `"456 ש״ח"`. */
export function priceLabel(agorot: number): string {
  return `${formatAgorot(agorot)} ${SHEKEL_UNIT}`;
}

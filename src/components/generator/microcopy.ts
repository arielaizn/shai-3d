/**
 * src/components/generator/microcopy.ts
 *
 * The handful of Hebrew strings the generator needs that `src/content/generator.ts`
 * does not carry.
 *
 * Everything a visitor reads is supposed to live in `src/content/`, and everything in
 * this file is a candidate to move there once it has been read out loud and approved.
 * They are kept here, in one place, so the addition is visible rather than scattered
 * through six components as inline literals.
 *
 * All of it obeys the copy law: בינוני סתמי rather than an imperative, no negative
 * parallelism, no em dash, no closing summary, no emoji, `תלת ממד` spelled the locked
 * way.
 *
 * [אריאל: ארבע שורות ההנחיה של כפתור ההמשך ותוויות העזר כאן טרם אושרו. אם משנים אותן,
 * הן עוברות ל-src/content/generator.ts]
 */

import type { StepKey } from "./types";

/** Why the continue button is not available yet. Stated, never left to guess. */
export const BLOCKED_HINT: Partial<Record<StepKey, string>> = {
  type: "בוחרים סוג הדפסה וממשיכים",
  photo: "מעלים תמונה אחת וממשיכים",
  colors: "בוחרים לפחות צבע אחד",
  size: "בוחרים גודל",
  model: "בונים את הדגם ואז רואים את המחיר",
};

export const MICROCOPY = {
  /** The aside on a wide screen, which mirrors the choices made so far. */
  summaryHeading: "מה שנבחר עד עכשיו",
  summaryEmpty: "עוד לא נבחר כלום",
  photoAlt: "התמונה שהעליתם",
  /** The step 5 preview, before the model has been built. */
  previewIdle: "התמונה מחכה לבנייה",
} as const;

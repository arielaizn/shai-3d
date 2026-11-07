/**
 * src/components/three/copy.ts
 *
 * The handful of viewer strings that `src/content/` does not own yet.
 *
 * Everything the content modules already carry is imported from them and used
 * verbatim: `PRODUCT.viewer` for the catalog viewer, `GENERATOR.preview` and
 * `GENERATOR.fallback` for the generator. What is left here is the keyboard help
 * line, the text alternative behind the canvas and the zoom button names, none of
 * which appear in doc 09c and none of which a visitor reads unless they are on a
 * keyboard or a screen reader.
 *
 * [אריאל: כשמעבירים את המחרוזות האלה ל-src/content/products.ts תחת viewer, למחוק את הקובץ הזה]
 *
 * Copy law, same as everywhere: no negative parallelism, no spaced em dash, no
 * closing summary, no emoji, and no direct imperatives. Button names are שם פועל
 * (`להתקרב`), instructions are בינוני סתמי (`החצים מסובבים`).
 */

/** Doc 05 §C.6 plus RESOLUTIONS §16, which moved the canvas from `role="img"` to a group. */
export const VIEWER_COPY = {
  /** `aria-label` on the focusable wrapper. The canvas itself is `aria-hidden`. */
  groupLabel: "תצוגה בתלת ממד",
  /** `{name}` is the product or print type name. */
  groupLabelNamed: "תצוגה בתלת ממד של {name}",

  /**
   * The sibling `sr-only` paragraph. RESOLUTIONS §16: a focusable element may not
   * carry `role="img"`, so the text alternative lives beside the canvas and the
   * wrapper points at it with `aria-describedby`.
   */
  textAlternative: "דגם בתלת ממד שאפשר לסובב.",
  textAlternativeNamed: "דגם בתלת ממד של {name}, ואפשר לסובב אותו.",

  /** The visible help line under the canvas, and the tail of the described-by text. */
  keyboardHelp: "החצים מסובבים, פלוס ומינוס מקרבים ומרחיקים, ו-Home מחזיר להתחלה.",

  zoomIn: "להתקרב",
  zoomOut: "להתרחק",

  /** Doc 05 §A.6. The poster rung offers the turntable, and nothing auto-downloads. */
  turntableUpgrade: "לראות מכל הכיוונים",
  turntableHint: "לגרור כדי לסובב",
  turntableAria: "תמונה שמסתובבת. החצים ימינה ושמאלה מסובבים אותה.",

  /** The one line under a canvas that is still building. */
  loadingAria: "בונה את התצוגה",
} as const;

/** Doc 05 §B.3.3. The lights-off switch, and the line beside it while it is dark. */
export const GLOW_COPY = {
  /** The label above the toy switch. `GENERATOR.preview.actions` owns both states. */
  darkHint: "הזוהר נשאר בערך שעה ואז נחלש.",
} as const;

/** `{name}` style interpolation, so a template never lands in the DOM half filled. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

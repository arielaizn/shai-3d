/**
 * src/lib/whatsapp.ts
 *
 * The single WhatsApp builder for the whole site.
 *
 * RESOLUTIONS.md §א records that five different specs each grew their own builder, with
 * different field lists and the price written three different ways. This module replaces
 * all five. It is pure, it has no React and no Convex imports, and both sides call it:
 *
 *   server  ->  convex `leads.submit` stores the exact text it will hand back
 *   client  ->  `<a href>` prefill on every WhatsApp surface
 *
 * Because both sides call the same function with the same input, the message a visitor
 * sees in the composer and the message stored against the lead can never drift.
 *
 * Copy authority: docs/design/09c-site-copy.md §7 (field list, `150 שקל` wording, trim order).
 * Bidi authority: docs/design/02-typography-and-rtl.md §4.4.ו.
 * Number authority: docs/DECISIONS.md §וואטסאפ.
 */

/* ------------------------------------------------------------------ *
 * 1 · the number
 *
 * DECISIONS.md: the number is Shai's personal line and must never sit in the page as a
 * raw string, so address harvesters cannot lift it out of the served HTML. It is stored
 * here as separate digits and joined at call time. No form of it exists as a contiguous
 * literal anywhere in this file, in code or in a comment, which `whatsapp.test.ts`
 * asserts by reading this module's own source text.
 *
 * Components must call these functions from a client effect, not from server render,
 * or the assembled value lands back in the HTML and the whole exercise is undone.
 * ------------------------------------------------------------------ */

const WA_DIGITS: readonly number[] = [9, 7, 2, 5, 8, 5, 8, 4, 5, 0, 8, 3];

/** The bare international digits: the wa.me path segment and the `phone=` parameter. */
export function waNumberDigits(): string {
  return WA_DIGITS.join("");
}

/** E.164 form, for a `tel:` href. Never rendered as visible text. */
export function waNumberE164(): string {
  return "+" + waNumberDigits();
}

/** The visible Israeli local form, grouped 3-3-4, per 09c §9.2 and §6.11. */
export function waNumberDisplay(): string {
  const local = "0" + waNumberDigits().slice(3);
  return local.slice(0, 3) + "-" + local.slice(3, 6) + "-" + local.slice(6);
}

/* ------------------------------------------------------------------ *
 * 2 · site URL
 * ------------------------------------------------------------------ */

/** Until a domain is bought this is the Vercel address; swapping it is one env var. */
const SITE_URL_FALLBACK = "https://shai-print.vercel.app";

export function siteUrl(path: string, base?: string): string {
  const root = (base ?? process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL_FALLBACK).replace(/\/+$/, "");
  return root + (path.startsWith("/") ? path : "/" + path);
}

/* ------------------------------------------------------------------ *
 * 3 · bidi, per 02 §4.4.ו
 *
 * WhatsApp resolves direction per line, from the first strong character in that line.
 * A line that opens with a digit or with `PLA` renders LTR and the Hebrew inside it
 * breaks apart. Escape sequences, never pasted characters: these are invisible and a
 * pasted one silently disappears when someone copies the file through a tool.
 * ------------------------------------------------------------------ */

export const RLM = "\u200F"; // Right-to-Left Mark
export const LRM = "\u200E"; // Left-to-Right Mark
export const FSI = "\u2068"; // First Strong Isolate
export const PDI = "\u2069"; // Pop Directional Isolate

const HEBREW_RE = /[\u0590-\u05FF]/;
const BIDI_CONTROL_RE = /[\u200E\u200F\u2066-\u2069]/g;

/**
 * Isolate a Latin or numeric run so neighbouring neutrals (`:` `,` `-` `+`) stay put.
 * A value that already carries Hebrew is left alone: FSI would take its direction from
 * the first strong character either way, and wrapping `10x15 ס״מ` would flip it, because
 * its first strong character is the Latin `x`.
 */
export function iso(value: string | number): string {
  const text = String(value);
  if (text.length === 0) return text;
  if (HEBREW_RE.test(text)) return text;
  return FSI + text + PDI;
}

/**
 * One RLM at the head of every line that carries Hebrew. A line with no Hebrew at all,
 * such as the bare offer URL, is left untouched: it is genuinely an LTR line and an RLM
 * on it would push its punctuation to the wrong end.
 */
export function rtlLines(lines: readonly string[]): string {
  return lines
    .map((line) => (line.length > 0 && HEBREW_RE.test(line) ? RLM + line : line))
    .join("\n");
}

/** Length as a human counts it, with the invisible bidi marks discounted. */
export function visibleLength(text: string): number {
  return text.replace(BIDI_CONTROL_RE, "").length;
}

/* ------------------------------------------------------------------ *
 * 4 · limits, per 09c §7.1
 * ------------------------------------------------------------------ */

/** Hard cap on the decoded message, counted without the invisible bidi marks. */
export const MAX_MESSAGE_CHARS = 600;

/**
 * Backstop on the whole encoded URL. Every Hebrew letter costs six characters once
 * `encodeURIComponent` has run, so a message that passes the 600 cap still lands near
 * 4,000 characters in the address. Android chooser intents and a few desktop handlers
 * silently cut a longer one, and a cut message reaches Shai without its price line.
 */
export const MAX_URL_CHARS = 4096;

/** `https://web.whatsapp.com/send?phone=…&text=` is the longer of the two prefixes. */
const URL_OVERHEAD_CHARS = 64;

/**
 * Trim order from 09c §7.1: note first, then delivery, then rush.
 * The greeting, print type, size, colours, quantity, price, link and code never drop.
 * Dropping beats truncating: half a Hebrew sentence arriving in Shai's chat reads as a
 * bug, while a missing optional line reads as a message that simply did not have one.
 */
export type WaDroppableField = "note" | "delivery" | "rush" | "personalisation";

const TRIM_ORDER: Readonly<Record<WaMessageKind, readonly WaDroppableField[]>> = {
  generator: ["note", "delivery", "rush"],
  product: ["personalisation"],
  product_question: [],
  catalog_empty: [],
  closing_home: [],
  about_closing: [],
  contact_form: [],
  generic: [],
};

/* ------------------------------------------------------------------ *
 * 5 · the configuration
 * ------------------------------------------------------------------ */

/** Analytics surface, per 09c §7.4 plus `about_closing` from 09b §13. */
export type WaSource =
  | "header"
  | "footer"
  | "nav"
  | "sticky_home"
  | "sticky_product"
  | "sticky_catalog"
  | "sticky_contact"
  | "hero"
  | "closing_home"
  | "catalog_empty"
  | "product_cta"
  | "product_question"
  | "generator_price"
  | "offer_page"
  | "contact_channel"
  | "contact_form_success"
  | "about_closing";

export const WA_SOURCES: readonly WaSource[] = [
  "header",
  "footer",
  "nav",
  "sticky_home",
  "sticky_product",
  "sticky_catalog",
  "sticky_contact",
  "hero",
  "closing_home",
  "catalog_empty",
  "product_cta",
  "product_question",
  "generator_price",
  "offer_page",
  "contact_channel",
  "contact_form_success",
  "about_closing",
];

export type WaMessageKind =
  | "generator"
  | "product"
  | "product_question"
  | "catalog_empty"
  | "closing_home"
  | "about_closing"
  | "contact_form"
  | "generic";

export type WaDelivery = "pickup" | "shipping";

type WaBase = {
  source?: WaSource;
  /** Overrides `NEXT_PUBLIC_SITE_URL`. Present so tests do not depend on the environment. */
  siteBaseUrl?: string;
};

/** The generator handoff, 09c §7.2. This is the message the whole site is built to produce. */
export type WaGeneratorConfig = WaBase & {
  kind: "generator";
  printTypeNameHe: string;
  sizeLabelHe: string;
  colorNames: readonly string[];
  quantity: number;
  delivery: WaDelivery;
  /** Rush is opt in, per RESOLUTIONS.md §7. When false the `עד מתי` line is not written. */
  rush?: boolean;
  neededByHe?: string;
  /** Whole shekels, the number the price screen showed. Written as `150 שקל`. */
  totalIls: number;
  /** `draft.publicCode`, the short code behind `/o/{code}`. */
  code: string;
  noteHe?: string;
};

/** Catalogue product, 09c §7.3, `source: product_cta`. */
export type WaProductConfig = WaBase & {
  kind: "product";
  nameHe: string;
  slug: string;
  colorNameHe?: string;
  quantity: number;
  dimensionsMm?: { w: number; h: number; d: number };
  unitIls: number;
  totalIls: number;
  personalisationTextHe?: string;
};

export type WaProductQuestionConfig = WaBase & {
  kind: "product_question";
  nameHe: string;
  slug: string;
};

export type WaCatalogEmptyConfig = WaBase & {
  kind: "catalog_empty";
  categoryHe: string;
};

export type WaClosingHomeConfig = WaBase & { kind: "closing_home" };
export type WaAboutClosingConfig = WaBase & { kind: "about_closing" };
export type WaGenericConfig = WaBase & { kind: "generic" };

export type WaContactFormConfig = WaBase & {
  kind: "contact_form";
  nameHe: string;
  messageHe: string;
};

export type WaMessageConfig =
  | WaGeneratorConfig
  | WaProductConfig
  | WaProductQuestionConfig
  | WaCatalogEmptyConfig
  | WaClosingHomeConfig
  | WaAboutClosingConfig
  | WaContactFormConfig
  | WaGenericConfig;

/* ------------------------------------------------------------------ *
 * 6 · rendering
 * ------------------------------------------------------------------ */

const DELIVERY_HE: Readonly<Record<WaDelivery, string>> = {
  pickup: "איסוף עצמי",
  shipping: "משלוח",
};

/** Ascii `x` between dimensions. The multiplication sign flips in some WhatsApp builds. */
function dimensionsAscii(d: { w: number; h: number; d: number }): string {
  return d.w + "x" + d.h + "x" + d.d;
}

type Dropped = ReadonlySet<WaDroppableField>;

function generatorLines(c: WaGeneratorConfig, dropped: Dropped): (string | null)[] {
  const showRush = c.rush === true && typeof c.neededByHe === "string" && c.neededByHe.length > 0;
  const note = typeof c.noteHe === "string" ? c.noteHe.trim() : "";
  const showNote = note.length > 0 && dropped.has("note") === false;
  return [
    "היי שי, בניתי הזמנה באתר.",
    "",
    "מה: " + c.printTypeNameHe,
    "גודל: " + c.sizeLabelHe,
    "צבעים: " + c.colorNames.join(", "),
    "כמות: " + iso(c.quantity),
    dropped.has("delivery") ? null : "מסירה: " + DELIVERY_HE[c.delivery],
    showRush && dropped.has("rush") === false ? "עד מתי: " + iso(c.neededByHe as string) : null,
    "מחיר באתר: " + iso(c.totalIls) + " שקל",
    "",
    "הקישור עם התמונה והדגם:",
    siteUrl("/o/" + c.code, c.siteBaseUrl),
    "קוד: " + iso(c.code),
    showNote ? "" : null,
    showNote ? "הערה: " + note : null,
    "",
    "אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.",
  ];
}

function productLines(c: WaProductConfig, dropped: Dropped): (string | null)[] {
  const priceLine =
    c.quantity === 1
      ? "מחיר באתר: " + iso(c.unitIls) + " שקל"
      : "מחיר באתר: " + iso(c.unitIls) + " שקל ליחידה, " + iso(c.totalIls) + " שקל בסך הכול";
  const personalisation =
    typeof c.personalisationTextHe === "string" ? c.personalisationTextHe.trim() : "";
  return [
    "היי שי, הגעתי מהאתר.",
    "",
    "מעניין אותי: " + c.nameHe,
    "קוד דגם: " + iso(c.slug),
    c.colorNameHe ? "צבע: " + c.colorNameHe : null,
    "כמות: " + iso(c.quantity),
    c.dimensionsMm ? "מידות: " + iso(dimensionsAscii(c.dimensionsMm)) + " מ״מ" : null,
    personalisation.length > 0 && dropped.has("personalisation") === false
      ? "טקסט להדפסה: " + personalisation
      : null,
    priceLine,
    "",
    "קישור: " + siteUrl("/products/" + c.slug, c.siteBaseUrl),
    "",
    "אשמח לדעת מתי אפשר לקבל.",
  ];
}

function renderLines(config: WaMessageConfig, dropped: Dropped): (string | null)[] {
  switch (config.kind) {
    case "generator":
      return generatorLines(config, dropped);
    case "product":
      return productLines(config, dropped);
    case "product_question":
      return [
        "היי שי, ראיתי באתר את " + '"' + config.nameHe + '"' + ".",
        "יש לי שאלה לפני שאני מזמין.",
        "",
        "קישור: " + siteUrl("/products/" + config.slug, config.siteBaseUrl),
      ];
    case "catalog_empty":
      return [
        "היי שי, חיפשתי באתר בקטגוריה " + config.categoryHe + " ולא מצאתי.",
        "אשמח לדעת אם אפשר להדפיס משהו כזה.",
      ];
    case "closing_home":
      return ["היי שי, הגעתי מהאתר.", "יש לי רעיון להדפסה ואשמח לשמוע אם אפשר."];
    case "about_closing":
      return ["היי שי, קראתי את הסיפור שלך באתר.", "יש לי רעיון להדפסה ואשמח לשמוע אם אפשר."];
    case "contact_form":
      return [
        "היי שי, מילאתי טופס באתר.",
        "",
        "שם: " + config.nameHe,
        "מה בא לי להדפיס: " + config.messageHe,
      ];
    case "generic":
      return ["היי שי, הגעתי מהאתר.", "רציתי לשאול על הדפסה."];
  }
}

function compose(config: WaMessageConfig, dropped: Dropped): string {
  const lines = renderLines(config, dropped)
    .filter((line): line is string => line !== null)
    // A visitor's note can carry its own newlines. WhatsApp resolves direction per
    // physical line, so an embedded newline has to become its own array entry or the
    // second half of the note ships without its RLM and renders as an LTR line.
    .flatMap((line) => line.split("\n"));
  return rtlLines(lines);
}

/* ------------------------------------------------------------------ *
 * 7 · the two public builders
 * ------------------------------------------------------------------ */

export type WaBuildResult = {
  text: string;
  /** Fields the length rule removed, in the order they were removed. */
  droppedFields: WaDroppableField[];
  /** Decoded length, bidi marks discounted. */
  visibleLength: number;
  /** Length of the encoded message plus the URL prefix allowance. */
  urlLength: number;
  /** True when every droppable field was already gone and the message is still over. */
  overLimit: boolean;
};

/**
 * Builds the message and reports what the length rule had to do.
 *
 * A note longer than the 120 characters the price screen allows can only arrive from a
 * caller that is not the price screen, so the rule stays defensive rather than trusting
 * the field counter.
 */
export function buildWaMessageDetailed(config: WaMessageConfig): WaBuildResult {
  const order = TRIM_ORDER[config.kind];
  const dropped: WaDroppableField[] = [];

  for (let step = 0; step <= order.length; step += 1) {
    const text = compose(config, new Set(dropped));
    const visible = visibleLength(text);
    const urlLength = encodeURIComponent(text).length + URL_OVERHEAD_CHARS;
    const fits = visible <= MAX_MESSAGE_CHARS && urlLength <= MAX_URL_CHARS;
    if (fits || step === order.length) {
      return {
        text,
        droppedFields: [...dropped],
        visibleLength: visible,
        urlLength,
        overLimit: fits === false,
      };
    }
    dropped.push(order[step]);
  }

  // Unreachable: the loop above always returns on its last pass.
  const text = compose(config, new Set(dropped));
  return {
    text,
    droppedFields: dropped,
    visibleLength: visibleLength(text),
    urlLength: encodeURIComponent(text).length + URL_OVERHEAD_CHARS,
    overLimit: true,
  };
}

/** The plain text Hebrew message, ready for a WhatsApp composer. */
export function buildWaMessage(config: WaMessageConfig): string {
  return buildWaMessageDetailed(config).text;
}

export type WaTarget = "app" | "web";

export type WaUrlOptions = {
  /** Forces a target. Without it the user agent decides. */
  target?: WaTarget;
  /** Server render passes the request header; the browser can leave this out. */
  userAgent?: string;
};

const MOBILE_UA_RE =
  /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Windows Phone|Mobile Safari|BlackBerry/i;

export function isMobileUserAgent(userAgent: string): boolean {
  return MOBILE_UA_RE.test(userAgent);
}

function resolveTarget(opts: WaUrlOptions): WaTarget {
  if (opts.target) return opts.target;
  // `window` is the browser test, not `navigator`. Node 21 and up ship their own
  // `globalThis.navigator` whose `userAgent` reads `Node.js/22`, which is not a mobile
  // string, so trusting `navigator` alone routes every server rendered href to
  // web.whatsapp.com and quietly breaks the handoff for every phone.
  const inBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";
  const ua = opts.userAgent ?? (inBrowser ? navigator.userAgent : undefined);
  // No user agent means a server render with no request header passed in. `wa.me` is the
  // universal link and resolves correctly on both, so it is the safe unknown case.
  if (ua === undefined || ua.length === 0) return "app";
  return isMobileUserAgent(ua) ? "app" : "web";
}

const WA_APP_BASE = "https://wa.me/";
const WA_WEB_BASE = "https://web.whatsapp.com/send";

/**
 * The full URL. `encodeURIComponent` over the whole message, per 09c §7.1: `encodeURI`
 * leaves `#` and `&` alive and `URLSearchParams` turns every space into `+`, which
 * WhatsApp shows literally.
 */
export function buildWaUrl(config: WaMessageConfig, opts: WaUrlOptions = {}): string {
  const digits = waNumberDigits();
  const encoded = encodeURIComponent(buildWaMessage(config));
  return resolveTarget(opts) === "app"
    ? WA_APP_BASE + digits + "?text=" + encoded
    : WA_WEB_BASE + "?phone=" + digits + "&text=" + encoded;
}

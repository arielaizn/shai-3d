/**
 * src/components/about/sections.ts
 *
 * One shape for the story, whatever it arrived in.
 *
 * `/about` reads `api.about.list` and falls back to `ABOUT_FALLBACK` in
 * `src/content/about.ts`, per 09 §7.2. The two sources do not have the same shape: a
 * Convex row carries every text field as optional plus a resolved `imageUrl`, while
 * the fallback is a discriminated union with required fields per kind. Normalising
 * once here means no component has to know which of the two it is rendering, and the
 * page renders identically before a deployment exists.
 *
 * **No row on this page waits for a photograph.** RESOLUTIONS.md ruling 21 removes
 * reserved slots rather than emptying them, so a row either carries a picture or is
 * text alone. The two pictures on the route are product photography, and on the
 * fallback path they come from `ABOUT_IMAGE_SRC` keyed by section id.
 *
 * Layout tokens live here too, because the rail, the markers and the prose column all
 * have to agree on one set of numbers and they are spread across five components.
 */

import {
  ABOUT_FALLBACK,
  ABOUT_IMAGE_SRC,
  ABOUT_TIMELINE,
  type AboutAccent,
  type AboutSection,
} from "@/content/about";

/** The seven kinds `convex/schema.ts` allows on `aboutSections`. */
export type StoryKind =
  | "opener"
  | "paragraph"
  | "pullQuote"
  | "timelineItem"
  | "imageFull"
  | "twoUp"
  | "statement";

const KINDS: readonly StoryKind[] = [
  "opener",
  "paragraph",
  "pullQuote",
  "timelineItem",
  "imageFull",
  "twoUp",
  "statement",
];

export type StoryRow = {
  key: string;
  kind: StoryKind;
  accent: AboutAccent;
  headingHe?: string;
  bodyHe?: string;
  quoteHe?: string;
  labelHe?: string;
  imageUrl?: string;
  imageAltHe?: string;
};

/**
 * The shape a Convex `aboutSections` row arrives in. Written structurally rather than
 * imported from `_generated`, so this module stays buildable with no deployment and
 * carries no dependency on the generated API surface.
 */
export type AboutSectionRow = {
  _id?: string;
  kind: string;
  accent: AboutAccent;
  sortOrder?: number;
  headingHe?: string;
  bodyHe?: string;
  quoteHe?: string;
  labelHe?: string;
  imageAltHe?: string;
  imageUrl?: string | null;
};

/* ------------------------------------------------------------------ layout */

/**
 * The rail geometry, from 09 §8.
 *
 * mobile   line 11px into the column, prose inset 36px
 * >=1024   line 48px into the column, prose inset 96px, prose capped at 34rem
 *
 * A breath (`pullQuote`, `imageFull`, `twoUp`, `statement`) leaves the prose inset and
 * runs wider, but it never enters the rail's gutter. `--breath-x` clears the 2px line at
 * both sizes: 24px over an 11px rail on mobile, 72px over a 48px rail from 1024 up.
 *
 * A breath that took the whole 44rem column would sit under the rail, and the rail is
 * absolutely positioned, so it paints **over** the words rather than behind them. On a
 * wide screen that put a dashed turquoise line straight across the middle of every
 * breath, through `שאני`, `יוצא` and `במסגרת`. The gutter stays empty instead, and a
 * breath is still visibly wider than the prose at both ends: 72px to 704px against the
 * prose's 96px to 640px.
 */
export const SPINE_VARS =
  "[--rail-x:0.6875rem] [--rail-w:2.25rem] [--breath-x:1.5rem] lg:[--rail-x:3rem] lg:[--rail-w:6rem] lg:[--breath-x:4.5rem]";

/** The narrative column. Every band on the page lines up with this one width. */
export const COLUMN_CLASS = "mx-auto w-full max-w-[44rem] [min-inline-size:0]";

/** The prose measure inside a railed row. 34rem at 17px is roughly 60 Hebrew characters. */
export const PROSE_MAX = "34rem";

/** A breath. Wider than the prose and centred, which is what breaks the rail. */
export const BREATH_MAX = "44rem";

/**
 * Extra air above and below a breath, on top of the column's own gap.
 *
 * A run of short paragraphs at one uniform spacing reads as a queue. The four breaths
 * are the only places the page is allowed to slow down, so each one buys itself a
 * little more room than a paragraph gets, and more of it on a wide screen than on a
 * phone where vertical space is the scarce thing.
 */
export const BREATH_PAD = "clamp(0.5rem, 0.14rem + 1.5vw, 1.5rem)";

/* -------------------------------------------------------------- normalising */

function text(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isKind(value: string): value is StoryKind {
  return (KINDS as readonly string[]).includes(value);
}

/**
 * The shipped picture for a section, if it has one.
 *
 * `ABOUT_IMAGE_SRC` is a plain record, so a section id that is not in it reads back as
 * `undefined` at runtime while the index signature types it as `string`. The lookup is
 * widened here rather than trusted, because a row silently claiming an empty `src`
 * would put a broken `next/image` on the page.
 */
function fallbackImage(id: string): string | undefined {
  const src: string | undefined = ABOUT_IMAGE_SRC[id];
  return typeof src === "string" && src.length > 0 ? src : undefined;
}

function fromFallback(section: AboutSection, index: number): StoryRow {
  const headingHe = "headingHe" in section ? text(section.headingHe) : undefined;
  const bodyHe = "bodyHe" in section ? text(section.bodyHe) : undefined;
  const quoteHe = "quoteHe" in section ? text(section.quoteHe) : undefined;
  const labelHe = "labelHe" in section ? text(section.labelHe) : undefined;
  const imageAltHe = "imageAltHe" in section ? text(section.imageAltHe) : undefined;
  // same rule the Convex path applies: no alt text, no picture.
  const imageUrl = imageAltHe ? fallbackImage(section.id) : undefined;

  return {
    key: section.id || `about-${index}`,
    kind: section.kind,
    accent: section.accent,
    headingHe,
    bodyHe,
    quoteHe,
    labelHe,
    imageUrl,
    imageAltHe,
  };
}

function fromConvex(row: AboutSectionRow, index: number): StoryRow | null {
  if (!isKind(row.kind)) return null;
  const imageUrl = typeof row.imageUrl === "string" && row.imageUrl.length > 0 ? row.imageUrl : undefined;
  const imageAltHe = text(row.imageAltHe);
  // 06 C.14 refuses to publish an image with no alt text. If one slips through anyway,
  // the image is dropped rather than served nameless.
  const usable = imageUrl && imageAltHe ? imageUrl : undefined;

  return {
    key: row._id || `about-${index}`,
    kind: row.kind,
    accent: row.accent,
    headingHe: text(row.headingHe),
    bodyHe: text(row.bodyHe),
    quoteHe: text(row.quoteHe),
    labelHe: text(row.labelHe),
    imageUrl: usable,
    imageAltHe,
  };
}

/**
 * Would this row paint anything?
 *
 * An `imageFull` row is its picture: with no usable image there is a caption under
 * nothing. It is dropped here rather than returned and skipped downstream, because the
 * column is a flex stack and an empty child leaves a double gap where a row used to be.
 */
function renders(row: StoryRow): boolean {
  if (row.kind === "imageFull") return Boolean(row.imageUrl && row.imageAltHe);
  if (row.kind === "pullQuote" || row.kind === "statement") return Boolean(row.quoteHe);
  return Boolean(row.headingHe || row.bodyHe || row.imageUrl);
}

/**
 * Convex first, the shipped copy second. An empty table, a cold deployment or a
 * missing env var all land on the same fallback, which is the whole reason
 * `src/content/about.ts` duplicates the text.
 */
export function toStoryRows(rows: readonly AboutSectionRow[] | undefined | null): StoryRow[] {
  const live = (rows ?? [])
    .map((row, index) => fromConvex(row, index))
    .filter((row): row is StoryRow => row !== null)
    .filter(renders);
  if (live.length > 0) return live;
  return ABOUT_FALLBACK.map(fromFallback).filter(renders);
}

/* ----------------------------------------------------------------- markers */

export type MarkerAccent = "turquoise" | "yellow" | "red";

/**
 * 09 §8: two exceptions in a run of turquoise, marking the two stops the page wants
 * remembered. `תיקון` is yellow because the reprint promise is the sentence a stranger
 * is actually deciding on, and `היום` is red because it is where the page arrives.
 *
 * `ABOUT_TIMELINE` is matched on the label rather than on an id, because a Convex row
 * has a generated `_id` and no slug. A label Shai types himself falls through to the
 * row's own accent, so an edit in the admin still produces a legible marker.
 */
export function markerAccent(row: StoryRow): MarkerAccent {
  const event = ABOUT_TIMELINE.find((item) => item.labelHe === row.labelHe);
  if (event) return event.markerAccent;
  if (row.accent === "red") return "red";
  if (row.accent === "yellow") return "yellow";
  return "turquoise";
}

/* ------------------------------------------------------------------ layout */

export type StorySplit = {
  /** Above the rail. The opener, per 09b §16 conflict 6. */
  lead: StoryRow[];
  /** The rail spans exactly this run: the first stop to the last. */
  railed: StoryRow[];
  /** After the rail. The closing statement, with nothing drawn behind it. */
  coda: StoryRow[];
};

export function splitStory(rows: readonly StoryRow[]): StorySplit {
  const first = rows.findIndex((row) => row.kind === "timelineItem");
  if (first === -1) return { lead: [...rows], railed: [], coda: [] };

  let last = first;
  rows.forEach((row, index) => {
    if (row.kind === "timelineItem") last = index;
  });

  return {
    lead: rows.slice(0, first),
    railed: rows.slice(first, last + 1),
    coda: rows.slice(last + 1),
  };
}

/** A body field carries its own line breaks. Each line is its own sentence and its own `<p>`. */
export function bodyLines(bodyHe: string | undefined): string[] {
  if (!bodyHe) return [];
  return bodyHe
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

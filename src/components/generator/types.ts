/**
 * src/components/generator/types.ts
 *
 * The shapes the generator's six steps read, and the one place the catalogue coming
 * out of Convex is joined to the Hebrew copy in `src/content/generator.ts`.
 *
 * The split is deliberate and it follows the ownership table in RESOLUTIONS §א:
 *
 *   Convex owns   ids, sizes, `maxColors`, stock, hex values, and every number that
 *                 is money, including `fromAgorot` (RESOLUTIONS §ב.8: the engine's
 *                 answer on the cheapest configuration, never `printTypes.basePrice`)
 *   content owns  every Hebrew word a visitor reads
 *
 * Nothing in this file computes a price. `convex/pricing.ts` does that, and the
 * generator asks it on every change.
 */

import type { ImageAnalysis } from "@/lib/three/geometry/analyze";
import type { KernelParams, PrintTypeKey } from "@/lib/three/geometry/types";

export type { PrintTypeKey };

/** RESOLUTIONS §ב.1 and §ב.2: six steps, print type first, photo second. */
export type StepKey = "type" | "photo" | "colors" | "size" | "model" | "price";

export const STEP_ORDER: readonly StepKey[] = [
  "type",
  "photo",
  "colors",
  "size",
  "model",
  "price",
];

export const STEP_COUNT = STEP_ORDER.length;

export function stepIndex(step: StepKey): number {
  const index = STEP_ORDER.indexOf(step);
  return index === -1 ? 0 : index;
}

/** 1-based, which is what the URL, the rail and `drafts.step` all speak. */
export function stepNumber(step: StepKey): number {
  return stepIndex(step) + 1;
}

export function stepFromNumber(value: number): StepKey {
  const index = Math.min(Math.max(Math.round(value) - 1, 0), STEP_ORDER.length - 1);
  return STEP_ORDER[index];
}

/* ------------------------------------------------------------------ */
/* the catalogue, as the steps read it                                  */
/* ------------------------------------------------------------------ */

export type SizeOption = {
  key: string;
  labelHe: string;
  longestEdgeMm: number | null;
};

/**
 * One print-type card. `id` is the Convex document id, needed by `drafts.saveDraft`;
 * it is null when the deployment is unreachable, in which case the card still renders
 * from content and simply cannot be saved to a draft.
 */
export type PrintTypeInfo = {
  key: PrintTypeKey;
  id: string | null;
  nameHe: string;
  taglineHe: string;
  descriptionHe: string;
  /** RESOLUTIONS §ב.8. `null` while the deployment is unreachable. */
  fromAgorot: number | null;
  maxColors: number;
  sizes: SizeOption[];
  /** The engine's neutral material is `""`; see `defaultMaterialKey` in `data.tsx`. */
  materialKey: string;
  /**
   * `printTypes.geometry` as Shai has it in the admin, handed to `PreviewStage` so a
   * thickness he changes there reaches the mesh with no deploy. Null falls back to the
   * seed row in `src/lib/three/geometry/printTypeDefaults.ts`.
   */
  geometry: Partial<KernelParams> | null;
  imageSrc: string;
  imageAlt: string;
};

export type FilamentInfo = {
  id: string;
  nameHe: string;
  hex: string;
  familyHe: string;
  finish: "matte" | "glossy" | "silk" | "glow" | "wood" | "transparent";
  isGlow: boolean;
  emissiveHex?: string;
  soldOut: boolean;
};

/** The knobs `pricing.publicConfig` hands the UI. No cost model, by design. */
export type PricingRules = {
  freeColorCount: number;
  maxQuantity: number;
  leadTimeDays: number;
  pickupEnabled: boolean;
  rushEnabled: boolean;
  shippingFlatAgorot: number;
  freeShippingThresholdAgorot: number;
  minOrderAgorot: number;
  quantityTiers: { minQty: number; discountBp: number }[];
};

/** `convex/schema.ts` `priceLine`, as the breakdown list renders it. */
export type QuoteLine = {
  key: string;
  id?: string;
  labelHe: string;
  hintHe?: string;
  amountAgorot: number;
  displayAgorot: number;
};

export type QuoteBreakdown = {
  totalAgorot: number;
  unitAgorot: number;
  quantity: number;
  printTypeNameHe: string;
  sizeKey: string;
  colorCount: number;
  freeColorCount: number;
  lines: QuoteLine[];
};

/** `pricing.quote` answers with one of these three, and never throws at the UI. */
export type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; breakdown: QuoteBreakdown }
  | { status: "invalid"; messageHe: string };

/* ------------------------------------------------------------------ */
/* the photo                                                            */
/* ------------------------------------------------------------------ */

/** Every quality note the upload step can raise, keyed to `GENERATOR.quality`. */
export type PhotoWarning = "small" | "dark" | "blown" | "alpha" | "flat";

export type PhotoUploadStatus = "idle" | "reading" | "uploading" | "done" | "error";

export type PhotoError =
  | "tooBig"
  | "wrongType"
  | "unreadable"
  | "failed"
  | "offline";

/**
 * One row of the print-bed animation: how wide the object is at that height, where it
 * starts, and which of the visitor's filaments prints there. It is measured from the
 * visitor's own photo while the upload is being prepared, so the wait state builds
 * their picture rather than a generic shape.
 */
export type BedRow = {
  /** 0..1 of the bed width. */
  width: number;
  /** 0..1, the left edge inside the bed. */
  offset: number;
  /** 0..1 luminance of that band; the filament is chosen from it at render time. */
  luma: number;
};

export type PhotoState = {
  status: PhotoUploadStatus;
  /** A blob URL for the downscaled copy. Instant, local, and revoked on replace. */
  localUrl: string | null;
  /** The Convex storage URL, once the upload has landed. */
  remoteUrl: string | null;
  width: number;
  height: number;
  bytes: number;
  warnings: PhotoWarning[];
  rows: BedRow[];
  error: PhotoError | null;
  /** 0..100 while uploading. */
  progress: number;
  /**
   * What the file turned out to be. Read once, right after the downscale, and then
   * used to pick the relief depth and to pre-count the filament colours so the
   * customer is not asked to price his own order. Null until the read finishes.
   */
  analysis: ImageAnalysis | null;
};

export const EMPTY_PHOTO: PhotoState = {
  status: "idle",
  localUrl: null,
  remoteUrl: null,
  width: 0,
  height: 0,
  bytes: 0,
  warnings: [],
  rows: [],
  error: null,
  progress: 0,
  analysis: null,
};

/* ------------------------------------------------------------------ */
/* small shared helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * `{n}` style interpolation for the strings in `src/content/generator.ts`.
 * The content is authored with placeholders so the Hebrew stays in one file; this is
 * the only thing that fills them.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Hebrew for a small count of units, used in the configuration line. */
export function unitsHe(quantity: number): string {
  if (quantity === 1) return "יחידה אחת";
  if (quantity === 2) return "שתי יחידות";
  return `${quantity} יחידות`;
}

/** Hebrew for a small count of colours, used in the configuration line. */
export function colorsHe(count: number): string {
  if (count === 0) return "בלי צבע";
  if (count === 1) return "צבע אחד";
  if (count === 2) return "שני צבעים";
  return `${count} צבעים`;
}

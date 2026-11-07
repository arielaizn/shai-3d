/**
 * src/components/generator/catalogue.ts
 *
 * The join between what Convex knows and what the site says.
 *
 * Both the server component (`src/app/generator/page.tsx`, for the first paint) and
 * the client provider (`data.tsx`, for the live one) run these functions on the same
 * query results, so a card cannot say one thing on arrival and another a second later.
 *
 * No React and no Convex imports live here on purpose: the file is called during a
 * server render and inside a browser effect, and the argument types are structural,
 * so the generated query types satisfy them without this module importing them.
 *
 * The numbers all come from Convex. The words all come from `src/content/generator.ts`.
 * `fromAgorot` is the engine's answer on the cheapest configuration, per RESOLUTIONS
 * §ב.8, and never `printTypes.basePrice`.
 */

import { PRINT_TYPES } from "@/content/generator";

import type { KernelParams } from "@/lib/three/geometry/types";

import type { FilamentInfo, PricingRules, PrintTypeInfo, PrintTypeKey, SizeOption } from "./types";

/* ------------------------------------------------------------------ */
/* the shapes this module reads                                         */
/* ------------------------------------------------------------------ */

export type PublicConfigLike = {
  printTypes: readonly {
    key: string;
    maxColors: number;
    forcedFinish: string | null;
    allowedMaterialKeys: readonly string[] | null;
    fromAgorot: number | null;
    sizes: readonly { key: string; labelHe: string; longestEdgeMm: number | null }[];
  }[];
  materials: readonly { key: string; nameHe: string; finish: string | null }[];
  quantityTiers: readonly { minQty: number; discountBp: number }[];
  rules: {
    freeColorCount: number;
    maxQuantity: number;
    leadTimeDays: number;
    pickupEnabled: boolean;
    rushEnabled: boolean;
    shippingFlatAgorot: number;
    freeShippingThresholdAgorot: number;
    minOrderAgorot: number;
  };
};

export type PrintTypeRowLike = {
  _id: string;
  key: string;
  /** `printTypes.geometry`, which the 3D preview merges over its seed defaults. */
  geometry?: unknown;
};

export type FilamentRowLike = {
  _id: string;
  nameHe: string;
  hex: string;
  familyHe: string;
  finish: string;
  isGlow: boolean;
  emissiveHex?: string;
  stock: string;
};

/* ------------------------------------------------------------------ */
/* defaults, for a first paint with no deployment answer yet            */
/* ------------------------------------------------------------------ */

/**
 * The knobs as `convex/seed.ts` seeds them. They are used for one thing only: the
 * quantity stepper's ceiling and the free-colour count before the live config has
 * arrived, so the controls are never disabled while a query resolves. Every number
 * that is money still comes from `pricing.quote`.
 */
export const FALLBACK_RULES: PricingRules = {
  freeColorCount: 4,
  maxQuantity: 25,
  leadTimeDays: 3,
  pickupEnabled: true,
  rushEnabled: true,
  shippingFlatAgorot: 2500,
  freeShippingThresholdAgorot: 25000,
  minOrderAgorot: 3500,
  quantityTiers: [],
};

/**
 * Doc 08 §B01-B07. The file name is the print type key, so the path is derived and
 * cannot drift. The alt text is written out here in the site's locked spelling
 * (`תלת ממד`), which the manifest's own draft did not use.
 */
const IMAGE_ALT: Record<PrintTypeKey, string> = {
  lithophane: "פאנל תלת ממד דק ומואר מאחור עם תמונת נוף",
  relief: "פאנל תלת ממד אטום עם תבליט מורם",
  glow: "פאנל תלת ממד מחומר זוהר בירוק",
  standee: "פסלון חתול מודפס בצבע אדום על בסיס",
  keychain: "מחזיק מפתחות מודפס בצהוב עם טבעת מתכת",
  magnet: "מגנט מודפס בטורקיז עם מגנטים בגב",
  framed: "פאנל מודפס בתוך מסגרת שחורה",
};

/** RESOLUTIONS §ב.5: glow is a relief in glow filament, four colours, not one. */
const FALLBACK_MAX_COLORS: Record<PrintTypeKey, number> = {
  lithophane: 1,
  relief: 6,
  glow: 4,
  standee: 6,
  keychain: 4,
  magnet: 4,
  framed: 4,
};

/**
 * The material the quote is priced with when the visitor has not been asked to choose
 * one, which on this site is always: the generator sells shapes and colours, not
 * spool grades.
 *
 * It mirrors `cheapestMaterialKey` inside the engine, which is what `fromPrice` uses
 * for the `מתחיל מ-` chip. Picking anything else here would let the real quote land
 * *below* the number on the card the visitor tapped. `allowedMaterialKeys` is stored
 * in the admin's own order and the plain `pla` spool is first in the seed, so the
 * first allowed key is the cheapest one in every configuration Shai ships.
 */
export function defaultMaterialKey(
  config: PublicConfigLike | null,
  printTypeKey: string | null,
): string {
  if (!config) return "";
  const pt = printTypeKey
    ? config.printTypes.find((row) => row.key === printTypeKey)
    : undefined;
  const allowed = pt?.allowedMaterialKeys;
  if (allowed && allowed.length > 0) {
    const first = config.materials.find((m) => allowed.includes(m.key));
    if (first) return first.key;
  }
  return config.materials[0]?.key ?? "";
}

/* ------------------------------------------------------------------ */
/* the merges                                                           */
/* ------------------------------------------------------------------ */

/**
 * Seven cards, always seven, in the order `src/content/generator.ts` lists them.
 *
 * A type missing from the deployment keeps its card and loses its price chip and its
 * id, which means it cannot be saved to a draft. That is the honest degradation: the
 * visitor still sees what Shai makes.
 */
export function mergePrintTypes(
  config: PublicConfigLike | null,
  rows: readonly PrintTypeRowLike[] | null,
): PrintTypeInfo[] {
  return PRINT_TYPES.map((copy) => {
    const live = config?.printTypes.find((row) => row.key === copy.key) ?? null;
    const row = rows?.find((r) => r.key === copy.key) ?? null;

    const sizes: SizeOption[] = (live?.sizes ?? []).map((size) => ({
      key: size.key,
      labelHe: size.labelHe,
      longestEdgeMm: size.longestEdgeMm,
    }));

    return {
      key: copy.key,
      id: row?._id ?? null,
      nameHe: copy.nameHe,
      taglineHe: copy.taglineHe,
      descriptionHe: copy.descriptionHe,
      fromAgorot: live?.fromAgorot ?? null,
      maxColors: live?.maxColors ?? FALLBACK_MAX_COLORS[copy.key],
      sizes,
      materialKey: defaultMaterialKey(config, copy.key),
      /* The schema's `geometry` object is `KernelParams` field for field, minus the
         two the kernel derives itself, so the cast is a narrowing and not a lie. */
      geometry: (row?.geometry as Partial<KernelParams> | undefined) ?? null,
      imageSrc: `/assets/print-types/${copy.key}.webp`,
      imageAlt: IMAGE_ALT[copy.key],
    } satisfies PrintTypeInfo;
  });
}

const FINISHES = ["matte", "glossy", "silk", "glow", "wood", "transparent"] as const;

function asFinish(value: string): FilamentInfo["finish"] {
  return (FINISHES as readonly string[]).includes(value)
    ? (value as FilamentInfo["finish"])
    : "matte";
}

/**
 * The palette. An out-of-stock spool stays on the grid with `אזל` on it, per doc 06
 * §A.4: hiding it makes the palette look smaller than it is, and the visitor who
 * wanted that colour learns something instead of never seeing it.
 */
export function mergeFilaments(rows: readonly FilamentRowLike[] | null): FilamentInfo[] {
  if (!rows) return [];
  return rows.map((row) => ({
    id: row._id,
    nameHe: row.nameHe,
    hex: row.hex,
    familyHe: row.familyHe,
    finish: asFinish(row.finish),
    isGlow: row.isGlow,
    emissiveHex: row.emissiveHex,
    soldOut: row.stock === "out",
  }));
}

export function mergeRules(config: PublicConfigLike | null): PricingRules {
  if (!config) return FALLBACK_RULES;
  return {
    ...config.rules,
    quantityTiers: config.quantityTiers.map((tier) => ({
      minQty: tier.minQty,
      discountBp: tier.discountBp,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* derived answers the steps ask for                                    */
/* ------------------------------------------------------------------ */

/** The size a type opens on: the middle one, so the next button is never blocked. */
export function defaultSizeKey(printType: PrintTypeInfo | null): string | null {
  if (!printType || printType.sizes.length === 0) return null;
  return printType.sizes[Math.floor((printType.sizes.length - 1) / 2)].key;
}

/** The best discount that applies at this quantity, in basis points. */
export function discountBpFor(rules: PricingRules, quantity: number): number {
  let best = 0;
  for (const tier of rules.quantityTiers) {
    if (quantity >= tier.minQty && tier.discountBp > best) best = tier.discountBp;
  }
  return best;
}

/** Basis points as the percentage a person reads: 1000 becomes `10`. */
export function bpToPercent(bp: number): string {
  const percent = bp / 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

/**
 * Whole days from today to the requested date, in the visitor's own timezone.
 * `requestedInDays` is what gates the rush surcharge inside the engine, and a date
 * that is further out than the promised lead time is charged nothing extra.
 */
export function daysUntil(iso: string | null): number | undefined {
  if (!iso) return undefined;
  const target = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(target.getTime())) return undefined;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  return Math.max(0, days);
}

/** `YYYY-MM-DD` for a date `days` from today, for the date input's `min`. */
export function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

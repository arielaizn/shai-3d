/**
 * The pricing lab's arithmetic layer.
 *
 * RESOLUTIONS §א: `convex/lib/priceEngine.ts` is the only engine there is. This
 * file computes nothing on its own. It assembles the `PriceEngineConfig` the
 * engine wants out of what the panel can read, and it names the knobs in Hebrew
 * so a guard and a diff can both point at "מחיר לכל צבע נוסף" rather than at
 * `extraColorAgorot`.
 *
 * WHERE EACH PIECE COMES FROM, and why:
 *   print types   `printTypes.listAdmin` — the whole document, so the cost model
 *                 (refGrams, refHours, complexity, volumeExponent) and every size
 *                 with its multiplier are the real ones.
 *   colours       `filaments.listAdmin` — the whole document, so `extraCostAgorot`
 *                 is real. `pricing.publicConfig` deliberately drops it.
 *   materials     `pricing.publicConfig` — key, name and finish. It does NOT
 *                 return `priceMultiplier` or `flatAddAgorot`, so those default to
 *                 a material that changes nothing. Every canonical sample prices
 *                 `pla`, whose real multiplier IS 1.0 and flat addition 0, so the
 *                 six guard samples are exact; a sample on a surcharged material
 *                 would read low, and the panel says so rather than pretending.
 *   knobs         `DEFAULT_PRICING_KNOBS`, overlaid with the live values that
 *                 `publicConfig.rules` does return. The cost knobs are withheld
 *                 from the browser on purpose (they are Shai's margin), so until
 *                 an admin-side pricing query exists the lab starts from the
 *                 seeded defaults, which are the same numbers `seed.ts` wrote.
 */
import {
  DEFAULT_PRICING_KNOBS,
  ROUND_TO_OPTIONS,
  SAMPLE_INPUTS,
  assertConfigSane,
  computePrice,
} from "../../../../convex/lib/priceEngine";
import type {
  ColorLite,
  ConfigReport,
  Issue,
  FinishKey,
  MaterialLite,
  PriceBreakdown,
  PriceEngineConfig,
  PricingKnobs,
  PrintTypeLite,
  RuleLite,
  SampleInput,
  TierLite,
} from "../../../../convex/lib/priceEngine";
import type { Doc } from "./convex";

export {
  DEFAULT_PRICING_KNOBS,
  ROUND_TO_OPTIONS,
  SAMPLE_INPUTS,
  assertConfigSane,
  computePrice,
};
export type { ConfigReport, Issue, PriceBreakdown, PriceEngineConfig, PricingKnobs, SampleInput };

/** Exactly what `convex/pricing.ts` `publicConfig` returns. */
export type PublicPricingConfig = {
  printTypes: {
    key: string;
    maxColors: number;
    forcedFinish: FinishKey | null;
    allowedMaterialKeys: string[] | null;
    fromAgorot: number | null;
    sizes: { key: string; labelHe: string; longestEdgeMm: number | null }[];
  }[];
  materials: { key: string; nameHe: string; finish: FinishKey | null }[];
  colors: { id: string; nameHe: string; finish: FinishKey }[];
  quantityTiers: { minQty: number; discountBp: number }[];
  addonRules: { id: string; labelHe: string; hintHe: string | null }[];
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
  version: number;
};

/** The live values the browser is allowed to know, laid over the seeded defaults. */
export function knobsFromPublic(published: PublicPricingConfig | null): PricingKnobs {
  if (!published) return { ...DEFAULT_PRICING_KNOBS };
  return {
    ...DEFAULT_PRICING_KNOBS,
    freeColorCount: published.rules.freeColorCount,
    maxQuantity: published.rules.maxQuantity,
    leadTimeDays: published.rules.leadTimeDays,
    pickupEnabled: published.rules.pickupEnabled,
    rushEnabled: published.rules.rushEnabled,
    shippingFlatAgorot: published.rules.shippingFlatAgorot,
    freeShippingThresholdAgorot: published.rules.freeShippingThresholdAgorot,
    minOrderAgorot: published.rules.minOrderAgorot,
  };
}

export type EngineSources = {
  knobs: PricingKnobs;
  printTypes: Doc<"printTypes">[];
  colors: Doc<"filamentColors">[];
  published: PublicPricingConfig | null;
  /** base prices being edited in the panel, keyed by print type key */
  basePriceOverrides?: Record<string, number>;
  version?: number;
};

export function buildEngineConfig(sources: EngineSources): PriceEngineConfig {
  const { knobs, printTypes, colors, published } = sources;
  const allowedByKey = new Map<string, string[] | null>(
    (published?.printTypes ?? []).map((pt) => [pt.key, pt.allowedMaterialKeys]),
  );

  const printTypesLite: PrintTypeLite[] = printTypes
    .filter((pt) => pt.deletedAt === undefined)
    .map((pt) => ({
      key: pt.key,
      nameHe: pt.nameHe,
      basePriceAgorot: sources.basePriceOverrides?.[pt.key] ?? pt.basePriceAgorot,
      sizes: pt.sizes.map((size) => ({
        key: size.key,
        labelHe: size.labelHe,
        multiplier: size.multiplier,
        gramsOverride: size.gramsOverride,
        hoursOverride: size.hoursOverride,
        longestEdgeMm: size.longestEdgeMm,
        sortOrder: size.sortOrder,
        active: size.active,
      })),
      maxColors: pt.maxColors,
      refGrams: pt.refGrams,
      refHours: pt.refHours,
      complexity: pt.complexity,
      volumeExponent: pt.volumeExponent,
      forcedFinish: pt.forcedFinish,
      allowedMaterialKeys: allowedByKey.get(pt.key) ?? undefined,
      active: pt.active,
    }));

  const materials: MaterialLite[] = (published?.materials ?? [{ key: "pla", nameHe: "רגיל", finish: null }]).map(
    (material) => ({
      key: material.key,
      nameHe: material.nameHe,
      priceMultiplier: 1,
      flatAddAgorot: 0,
      finish: material.finish ?? undefined,
      active: true,
    }),
  );

  const colorsLite: ColorLite[] = colors
    .filter((color) => color.deletedAt === undefined)
    .map((color) => ({
      id: color._id,
      nameHe: color.nameHe,
      finish: color.finish,
      extraCostAgorot: color.extraCostAgorot,
      active: color.active,
    }));

  const tiers: TierLite[] = (published?.quantityTiers ?? []).map((tier, index) => ({
    id: `tier-${index}`,
    minQty: tier.minQty,
    discountBp: tier.discountBp,
    labelHe: `מ-${tier.minQty} יחידות`,
    active: true,
  }));

  const rules: RuleLite[] = [];

  return {
    version: sources.version ?? published?.version ?? 0,
    config: knobs,
    printTypes: printTypesLite,
    materials,
    colors: colorsLite,
    rules,
    tiers,
  };
}

/* ------------------------------------------------------------------ */
/* pricing one configuration without ever throwing at the screen       */
/* ------------------------------------------------------------------ */

export type SampleResult =
  | { ok: true; breakdown: PriceBreakdown }
  | { ok: false; messageHe: string };

export function priceSample(
  sample: SampleInput,
  config: PriceEngineConfig,
): SampleResult {
  try {
    return { ok: true, breakdown: computePrice(sample, config) };
  } catch (error) {
    return {
      ok: false,
      messageHe:
        error instanceof Error && error.message ? error.message : "אי אפשר לתמחר את הדוגמה הזאת",
    };
  }
}

/** The percentage a total moved. Positive is dearer. */
export function percentDelta(before: number, after: number): number | null {
  if (before <= 0) return null;
  return Math.round(((after - before) / before) * 100);
}

/* ------------------------------------------------------------------ */
/* the knobs, in Hebrew                                                */
/* ------------------------------------------------------------------ */

export const KNOB_HE: Record<string, string> = {
  filamentCostPerGramAgorot: "עלות פילמנט לגרם",
  filamentWasteBp: "פחת פילמנט",
  machineRatePerHourAgorot: "עלות שעת מכונה",
  setupFeeAgorot: "הכנה וחיתוך",
  marginMultiplierBp: "מכפיל הרווח",
  freeColorCount: "כמה צבעים כלולים במחיר",
  extraColorAgorot: "מחיר לכל צבע נוסף",
  maxQuantity: "כמות מקסימלית בהזמנה",
  rushEnabled: "דחוף פעיל",
  rushPercentBp: "תוספת דחוף",
  rushFeeMinAgorot: "מינימום דחוף",
  rushFeeMaxAgorot: "תקרת דחוף",
  leadTimeDays: "ימי עבודה שהאתר מבטיח",
  rushLabelHe: "מה כתוב על הדחוף",
  pickupEnabled: "איסוף עצמי פעיל",
  pickupLabelHe: "מה כתוב על האיסוף",
  shippingFlatAgorot: "מחיר משלוח",
  freeShippingThresholdAgorot: "סף משלוח חינם",
  minOrderAgorot: "הזמנה מינימלית",
  roundToAgorot: "עיגול",
  roundingMode: "כיוון העיגול",
  charmEnding: "לסיים ב-90 אגורות",
  maxPlausibleTotalAgorot: "תקרת סבירות",
  "finishSurchargeAgorot.matte": "תוספת מט",
  "finishSurchargeAgorot.glossy": "תוספת מבריק",
  "finishSurchargeAgorot.silk": "תוספת משי",
  "finishSurchargeAgorot.glow": "תוספת זוהר בחושך",
  "finishSurchargeAgorot.wood": "תוספת עץ",
  "finishSurchargeAgorot.transparent": "תוספת שקוף",
};

const MONEY_KNOBS = new Set([
  "filamentCostPerGramAgorot",
  "machineRatePerHourAgorot",
  "setupFeeAgorot",
  "extraColorAgorot",
  "rushFeeMinAgorot",
  "rushFeeMaxAgorot",
  "shippingFlatAgorot",
  "freeShippingThresholdAgorot",
  "minOrderAgorot",
  "maxPlausibleTotalAgorot",
  "roundToAgorot",
]);

const PERCENT_KNOBS = new Set(["filamentWasteBp", "rushPercentBp"]);

function shekels(agorot: number): string {
  const value = agorot / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** One knob as a person reads it, used by the change list before publishing. */
export function describeKnob(path: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "פעיל" : "כבוי";
  if (path === "marginMultiplierBp" && typeof value === "number") {
    return `×${(value / 10000).toFixed(2)}`;
  }
  if (path === "roundingMode") return value === "up" ? "מעגל למעלה" : "מעגל לקרוב";
  if (typeof value === "number") {
    if (PERCENT_KNOBS.has(path)) return `${value / 100}%`;
    if (MONEY_KNOBS.has(path) || path.startsWith("finishSurchargeAgorot.")) {
      return `${shekels(value)} ש״ח`;
    }
    return String(value);
  }
  return String(value ?? "");
}

export type KnobChange = { path: string; labelHe: string; beforeHe: string; afterHe: string };

/** Every knob that moved, for the review screen 06 §C.12 asks for. */
export function diffKnobs(before: PricingKnobs, after: PricingKnobs): KnobChange[] {
  const changes: KnobChange[] = [];
  const push = (path: string, a: unknown, b: unknown) => {
    if (a === b) return;
    changes.push({
      path,
      labelHe: KNOB_HE[path] ?? path,
      beforeHe: describeKnob(path, a),
      afterHe: describeKnob(path, b),
    });
  };

  for (const key of Object.keys(before) as (keyof PricingKnobs)[]) {
    if (key === "finishSurchargeAgorot") continue;
    push(key, before[key], after[key]);
  }
  for (const finish of Object.keys(before.finishSurchargeAgorot) as FinishKey[]) {
    push(
      `finishSurchargeAgorot.${finish}`,
      before.finishSurchargeAgorot[finish],
      after.finishSurchargeAgorot[finish],
    );
  }
  return changes;
}

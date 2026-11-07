/**
 * convex/lib/priceEngine.types.ts
 *
 * The input and output shapes of the one pricing engine.
 *
 * This file imports nothing. No `convex/values`, no `convex/server`, no `ctx`,
 * no React, no `Id<>` types. Every id is a plain string. That constraint is what
 * lets the identical module load inside the Convex runtime and inside the browser
 * bundle, per 06 §A.6.
 *
 * `convex/schema.ts` is owned by spec 06 and is deliberately NOT imported here, so
 * the two files can be written independently. The types below are structurally
 * compatible with the documents that schema defines: a `Doc<"printTypes">` can be
 * passed where a `PrintTypeLite` is expected, because every field named here exists
 * there with the same name and the same meaning.
 *
 * Money is ALWAYS an integer number of agorot. 1250 === 12.50 ש״ח.
 * Percentages are ALWAYS basis points. 1350 === 13.5%, 13500 === ×1.35.
 * Grams and hours are physical quantities and stay floating point.
 */

/** integer agorot. never a float, never shekels */
export type Agorot = number;

/** basis points, 0..10000 unless stated otherwise. 1500 === 15% */
export type Bp = number;

export type DeliveryMethod = "pickup" | "shipping";

export type RoundingMode = "up" | "nearest";

/**
 * The filament finishes that carry a surcharge (04 §C2).
 * The surcharge is taken as a MAX across everything selected, never as a sum:
 * three glow spools still mean one expensive material, handled once.
 */
export type FinishKey =
  | "matte"
  | "glossy"
  | "silk"
  | "glow"
  | "wood"
  | "transparent";

/** locked by RESOLUTIONS §6. asset file names hang off these */
export type PrintTypeKey =
  | "lithophane"
  | "relief"
  | "glow"
  | "standee"
  | "keychain"
  | "magnet"
  | "framed";

/* ------------------------------------------------------------------ */
/* catalogue slices the engine reads                                    */
/* ------------------------------------------------------------------ */

/**
 * One selectable size inside a print type.
 *
 * `multiplier` is the LINEAR SCALE FACTOR against the print type's reference
 * size (0.8 / 1.0 / 1.3), not a price multiplier. FINDINGS §04-vs-06 rules that
 * the size multiplier and the grams model are "the same number computed two
 * ways, not two prices", so the scale feeds the volume model and nothing else
 * multiplies the base price.
 */
export type SizeLite = {
  key: string;
  labelHe: string;
  /** linear scale against the reference size. 0.2 .. 10 */
  multiplier: number;
  /** if Shai sliced this exact size, the slicer number wins over the formula */
  gramsOverride?: number;
  hoursOverride?: number;
  /** feeds the `autoOversize` surcharge trigger */
  longestEdgeMm?: number;
  sortOrder: number;
  active: boolean;
};

/**
 * A print type as the engine needs it. The cost model fields
 * (`refGrams`, `refHours`, `complexity`, `volumeExponent`) are 04 PART C ported
 * onto the record, per RESOLUTIONS §A.
 */
export type PrintTypeLite = {
  key: string;
  nameHe: string;
  basePriceAgorot: Agorot;
  sizes: SizeLite[];
  /** hard cap the generator UI enforces. the engine does not reject above it */
  maxColors: number;
  /** grams the slicer reported for the reference size */
  refGrams: number;
  /** hours the slicer reported for the reference size */
  refHours: number;
  /** multiplies only the variable part. 1.0 .. 3.0 */
  complexity: number;
  /** 2.0 flat panels, 2.4 keychain, 2.6 standing figure */
  volumeExponent: number;
  /** `glow` is printed in glow filament whatever colour was picked */
  forcedFinish?: FinishKey;
  allowedMaterialKeys?: string[];
  active: boolean;
};

export type MaterialLite = {
  key: string;
  nameHe: string;
  /** 0.5 .. 3. scales the unit core */
  priceMultiplier: number;
  /** flat pass-through per unit, added after the margin */
  flatAddAgorot: Agorot;
  /** participates in the finish MAX */
  finish?: FinishKey;
  active: boolean;
};

export type ColorLite = {
  id: string;
  nameHe: string;
  finish: FinishKey;
  /** per unit. 0 for a normal spool */
  extraCostAgorot: Agorot;
  active: boolean;
};

export type RuleTrigger =
  | {
      kind: "optionalAddon";
      mode: "flat" | "percent" | "perUnit";
      amountAgorot: Agorot;
      percentBp: Bp;
    }
  | { kind: "autoOversize"; minLongestEdgeMm: number; amountAgorot: Agorot }
  | { kind: "autoMaterial"; materialKey: string; amountAgorot: Agorot }
  | { kind: "autoColorCount"; minColors: number; amountAgorot: Agorot };

export type RuleLite = {
  id: string;
  labelHe: string;
  hintHe?: string;
  trigger: RuleTrigger;
  appliesToAll: boolean;
  printTypeKeys: string[];
  sortOrder: number;
  active: boolean;
};

export type TierLite = {
  id: string;
  minQty: number;
  discountBp: Bp;
  labelHe: string;
  active: boolean;
};

/* ------------------------------------------------------------------ */
/* the knobs Shai turns in /admin/pricing                               */
/* ------------------------------------------------------------------ */

export type PricingKnobs = {
  /* --- cost basis, 04 §C2 ported into agorot --- */
  /** agorot per gram of filament. 12 === 0.12 ש״ח */
  filamentCostPerGramAgorot: Agorot;
  /** purge, supports and failed prints. 800 === 8% */
  filamentWasteBp: Bp;
  /** electricity, wear, and his time at the printer */
  machineRatePerHourAgorot: Agorot;
  /** per order, not per unit */
  setupFeeAgorot: Agorot;
  /** the one global knob that lifts every price. 13500 === ×1.35 */
  marginMultiplierBp: Bp;

  /* --- colours --- */
  freeColorCount: number;
  extraColorAgorot: Agorot;
  finishSurchargeAgorot: Record<FinishKey, Agorot>;

  /* --- quantity --- */
  /** the generator stepper tops out here (04 §A4: 1..25) */
  maxQuantity: number;

  /* --- rush, opt in and capped (RESOLUTIONS §7) --- */
  rushEnabled: boolean;
  rushPercentBp: Bp;
  rushFeeMinAgorot: Agorot;
  rushFeeMaxAgorot: Agorot;
  /** the site publicly promises this many working days. 3 */
  leadTimeDays: number;
  rushLabelHe: string;

  /* --- delivery --- */
  pickupEnabled: boolean;
  pickupLabelHe: string;
  shippingFlatAgorot: Agorot;
  freeShippingThresholdAgorot: Agorot;

  /* --- floor, rounding, guard ceiling --- */
  minOrderAgorot: Agorot;
  /** 1 | 10 | 50 | 100 | 500 | 1000 */
  roundToAgorot: number;
  roundingMode: RoundingMode;
  /** take 10 agorot off after rounding. 40 ש״ח becomes 39.90 ש״ח */
  charmEnding: boolean;
  /** anything above this is a configuration mistake, not a price */
  maxPlausibleTotalAgorot: Agorot;
};

export type PriceEngineConfig = {
  version: number;
  config: PricingKnobs;
  printTypes: PrintTypeLite[];
  materials: MaterialLite[];
  colors: ColorLite[];
  rules: RuleLite[];
  tiers: TierLite[];
};

/* ------------------------------------------------------------------ */
/* input                                                                */
/* ------------------------------------------------------------------ */

export type PriceInput = {
  printTypeKey: string;
  materialKey: string;
  sizeKey: string;
  /** order matters to the customer. length is the colour count */
  colorIds: string[];
  quantity: number;
  /** optional surcharge rules the visitor ticked */
  addonRuleIds: string[];
  /** opt in only. never inferred, never defaulted to true */
  rush: boolean;
  deliveryMethod: DeliveryMethod;
  /**
   * whole days from today to the date the visitor asked for.
   * the rush fee only applies when this is inside `leadTimeDays`.
   * left out means "no date chosen", and then the opt in flag alone governs.
   */
  requestedInDays?: number;
  /** real grams from the watertight preview mesh, when the viewer produced one */
  measuredGrams?: number;
};

/** a sample carries a label so a guard can name the configuration it failed on */
export type SampleInput = PriceInput & { labelHe: string };

/* ------------------------------------------------------------------ */
/* output                                                               */
/* ------------------------------------------------------------------ */

export type PriceLineKey =
  | "unit"
  | "colors"
  | "finish"
  | "addon"
  | "qtyDiscount"
  | "setup"
  | "rush"
  | "delivery"
  | "minOrder"
  | "rounding";

/**
 * One row of the expandable breakdown.
 *
 * `amountAgorot` is exact and signed. The exact amounts sum to `totalAgorot`.
 * `displayAgorot` is the same row rounded to whole shekels for the screen, and
 * the `rounding` row absorbs the leftover so the printed column adds up exactly
 * to the printed total (04 §C3).
 */
export type PriceLine = {
  key: PriceLineKey;
  /** rule id, for `addon` rows */
  id?: string;
  labelHe: string;
  hintHe?: string;
  amountAgorot: Agorot;
  displayAgorot: Agorot;
};

export type AppliedAddon = {
  ruleId: string;
  labelHe: string;
  amountAgorot: Agorot;
};

export type PriceBreakdown = {
  /* --- the contract the UI reads --- */
  /** price of one unit, everything per-unit included, before quantity */
  unitAgorot: Agorot;
  lines: PriceLine[];
  /** everything before the final rounding step. subtotal + rounding === total */
  subtotalAgorot: Agorot;
  /** signed. what the final rounding added or removed */
  roundingAgorot: Agorot;
  totalAgorot: Agorot;
  grams: number;
  hours: number;
  configVersion: number;

  /* --- the audit trail, written onto the lead --- */
  currency: "ILS";
  printTypeKey: string;
  printTypeNameHe: string;
  basePriceAgorot: Agorot;
  sizeKey: string;
  sizeMultiplier: number;
  materialKey: string;
  materialMultiplier: number;
  materialFlatAgorot: Agorot;
  /** grams of filament including waste */
  billedGrams: number;
  /** audit only. rounded on its own, so it can sit one agora off the variable part */
  materialCostAgorot: Agorot;
  /** audit only. rounded on its own */
  machineCostAgorot: Agorot;
  /** (material + machine) x complexity, rounded once */
  variableAgorot: Agorot;
  complexity: number;
  unitCoreAgorot: Agorot;
  /** the unit before colours, finish and addons */
  unitBaseAgorot: Agorot;
  colorCount: number;
  freeColorCount: number;
  /** per unit. the charge for colours beyond the included count */
  extraColorsAgorot: Agorot;
  /** per unit. what the chosen spools themselves cost extra */
  colorPremiumAgorot: Agorot;
  finishKey: FinishKey | null;
  /** per unit. the MAX finish surcharge, never a sum */
  finishAgorot: Agorot;
  addons: AppliedAddon[];
  quantity: number;
  lineTotalAgorot: Agorot;
  discountTierId: string | null;
  discountBp: Bp;
  discountAgorot: Agorot;
  setupFeeAgorot: Agorot;
  rushApplied: boolean;
  rushAgorot: Agorot;
  deliveryMethod: DeliveryMethod;
  shippingAgorot: Agorot;
  /** signed. what the minimum order added */
  minOrderBumpAgorot: Agorot;
};

/* ------------------------------------------------------------------ */
/* guards                                                               */
/* ------------------------------------------------------------------ */

export type IssueSeverity = "error" | "warning";

export type Issue = {
  /** machine path, e.g. "config.minOrderAgorot" or "printTypes.keychain.refGrams" */
  field: string;
  /** what Shai calls that field on the pricing screen */
  fieldHe: string;
  messageHe: string;
  severity: IssueSeverity;
};

export type ConfigReport = { errors: Issue[]; warnings: Issue[] };

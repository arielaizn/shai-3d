/**
 * convex/lib/priceEngine.ts
 *
 * THE pricing engine. There is no second one.
 *
 * RESOLUTIONS §A gives this file ownership of pricing: 06 §A.6 is the engine
 * (integer agorot, server authority, version snapshot, guards, golden tests) and
 * 04 PART C is the cost model that was ported into it (grams from the reference
 * size and the scale factor, material cost, machine cost, complexity multiplying
 * only the variable part, the finish surcharge taken as a MAX, quantity tiers,
 * a minimum order, and rounding to numbers a person would say out loud).
 *
 * This file imports nothing but its own types. No `convex/values`, no `ctx`, no
 * React, no `Id<>`. Ids are plain strings. That is what lets the identical module
 * run inside the Convex runtime and inside the browser bundle, so the number the
 * visitor watches change and the number `leads.submit` writes are produced by the
 * same lines of code.
 *
 * ORDER OF OPERATIONS. The order is part of the contract.
 *
 *    1  scale        = size.multiplier                        (linear, vs the reference size)
 *    2  grams        = measuredGrams ?? gramsOverride ?? refGrams * scale ^ volumeExponent
 *       hours        =                  hoursOverride ?? refHours  * scale ^ volumeExponent
 *    3  materialCost = grams * (1 + waste) * filamentCostPerGram
 *       machineCost  = hours * machineRate
 *    4  variable     = round((materialCost + machineCost) * complexity)
 *    5  core         = round((basePrice + variable) * material.priceMultiplier)
 *    6  unitBase     = round(core * margin) + material.flatAdd
 *    7  colours      = max(0, colorCount - freeColorCount) * extraColour
 *       premium      = sum of what the chosen spools cost extra
 *    8  finish       = MAX over the chosen spools, the material and any forced finish
 *    9  auto rules   = oversize / material / colour-count rules that match, per unit
 *   10  addons       = the optional rules the visitor ticked: perUnit and percent per unit,
 *                      flat once per order
 *   11  unitPrice    = 6 + 7 + 8 + 9 + the per-unit part of 10
 *   12  lineTotal    = unitPrice * quantity
 *   13  discount     = round(lineTotal * highest matching tier)
 *   14  subtotal     = lineTotal + flat addons - discount + setupFee
 *   15  rush         = clamp(round(subtotal * rushPercent), rushFeeMin, rushFeeMax),
 *                      opt in only, and only inside leadTimeDays
 *   16  minimum      = the order is lifted to minOrderAgorot, the lift recorded
 *   17  delivery     = shippingFlat, unless pickup or the order cleared the free threshold
 *   18  total        = the sum, rounded per roundToAgorot and roundingMode
 *
 * Everything is an integer number of agorot. Percentages are basis points, so no
 * float ever reaches a stored or returned money value. Grams and hours are
 * physical quantities and stay floating point.
 *
 * The three worked examples of 04 §C5 are the golden tests and live in
 * `__tests__/priceEngine.test.ts`. Example 3 now totals 520 ש״ח rather than the
 * 570 printed in 04, because RESOLUTIONS §7 caps the rush fee at rushFeeMax.
 */

import type {
  Agorot,
  AppliedAddon,
  Bp,
  ColorLite,
  ConfigReport,
  DeliveryMethod,
  FinishKey,
  Issue,
  MaterialLite,
  PriceBreakdown,
  PriceEngineConfig,
  PriceInput,
  PriceLine,
  PricingKnobs,
  PrintTypeLite,
  RoundingMode,
  SampleInput,
  SizeLite,
  TierLite,
} from "./priceEngine.types";

export type {
  Agorot,
  AppliedAddon,
  Bp,
  ColorLite,
  ConfigReport,
  DeliveryMethod,
  FinishKey,
  Issue,
  MaterialLite,
  PriceBreakdown,
  PriceEngineConfig,
  PriceInput,
  PriceLine,
  PriceLineKey,
  PricingKnobs,
  PrintTypeKey,
  PrintTypeLite,
  RoundingMode,
  RuleLite,
  RuleTrigger,
  SampleInput,
  SizeLite,
  TierLite,
} from "./priceEngine.types";

/* ------------------------------------------------------------------ */
/* errors                                                              */
/* ------------------------------------------------------------------ */

/** a visitor configuration the engine cannot price */
export class PriceInputError extends Error {
  readonly field: string;
  readonly fieldHe: string;
  constructor(field: string, fieldHe: string, messageHe: string) {
    super(messageHe);
    this.name = "PriceInputError";
    this.field = field;
    this.fieldHe = fieldHe;
  }
}

/** a pricing configuration Shai must not be allowed to publish */
export class PriceConfigError extends Error {
  readonly issues: Issue[];
  constructor(issues: Issue[]) {
    const first = issues[0];
    super(first ? `${first.fieldHe}: ${first.messageHe}` : "הגדרות המחיר לא תקינות");
    this.name = "PriceConfigError";
    this.issues = issues;
  }
}

/* ------------------------------------------------------------------ */
/* integer helpers. no float ever survives one of these                */
/* ------------------------------------------------------------------ */

const BP = 10000;

/** to whole agorot */
function toAgorot(n: number): Agorot {
  return Math.round(n);
}

/** v * bp / 10000, in agorot */
function mulBp(v: Agorot, bp: Bp): Agorot {
  return Math.round((v * bp) / BP);
}

/** exact integer rounding to a step. no division, so no float drift */
function roundToStep(v: Agorot, step: number, mode: RoundingMode): Agorot {
  if (step <= 1) return v;
  const r = ((v % step) + step) % step;
  if (r === 0) return v;
  if (mode === "nearest") return r * 2 >= step ? v + (step - r) : v - r;
  return v + (step - r);
}

/** the whole shekel a breakdown row is printed at */
function toWholeShekel(a: Agorot): Agorot {
  return roundToStep(a, 100, "nearest");
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export function agorotToIls(a: Agorot): number {
  return Math.round(a) / 100;
}

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n);
}

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** 1000 -> "10", 1050 -> "10.5". the discount percent as a person writes it */
function bpToPercentText(bp: Bp): string {
  const pct = bp / 100;
  return Number.isInteger(pct) ? String(pct) : String(Number(pct.toFixed(2)));
}

/* ------------------------------------------------------------------ */
/* locked line labels. 09c-site-copy.md §6.10                          */
/* ------------------------------------------------------------------ */

const LABEL = {
  colorsHint: "החלפת פילמנט באמצע",
  finish: "חומר מיוחד",
  setup: "הכנה וחיתוך",
  rush: "דחוף",
  delivery: "משלוח",
  rounding: "עיגול",
  /** 06 §C.12, the label on the minimum order field */
  minOrder: "הזמנה מינימלית",
} as const;

/* ------------------------------------------------------------------ */
/* defaults. 04 §C5 locked settings, in agorot                         */
/* ------------------------------------------------------------------ */

export const ROUND_TO_OPTIONS: readonly number[] = [1, 10, 50, 100, 500, 1000];

export const DEFAULT_PRICING_KNOBS: PricingKnobs = {
  filamentCostPerGramAgorot: 12,
  filamentWasteBp: 800,
  machineRatePerHourAgorot: 600,
  setupFeeAgorot: 800,
  marginMultiplierBp: 13500,

  freeColorCount: 4,
  extraColorAgorot: 900,
  finishSurchargeAgorot: {
    matte: 0,
    glossy: 0,
    silk: 600,
    glow: 1200,
    wood: 800,
    transparent: 400,
  },

  maxQuantity: 25,

  rushEnabled: true,
  rushPercentBp: 2500,
  rushFeeMinAgorot: 1500,
  rushFeeMaxAgorot: 6000,
  leadTimeDays: 3,
  rushLabelHe: "דחוף",

  pickupEnabled: true,
  pickupLabelHe: "איסוף עצמי, נסגור מקום בוואטסאפ",
  shippingFlatAgorot: 2500,
  freeShippingThresholdAgorot: 25000,

  minOrderAgorot: 3500,
  roundToAgorot: 500,
  roundingMode: "up",
  charmEnding: false,
  maxPlausibleTotalAgorot: 300000,
};

/* ------------------------------------------------------------------ */
/* resolution                                                          */
/* ------------------------------------------------------------------ */

/** a material that changes nothing, used when a draft has not picked one yet */
const NEUTRAL_MATERIAL: MaterialLite = {
  key: "",
  nameHe: "",
  priceMultiplier: 1,
  flatAddAgorot: 0,
  active: true,
};

function findPrintType(cfg: PriceEngineConfig, key: string): PrintTypeLite {
  const pt = cfg.printTypes.find((p) => p.key === key);
  if (!pt) {
    throw new PriceInputError(
      "input.printTypeKey",
      "סוג ההדפסה",
      "לא מצאתי את סוג ההדפסה הזה",
    );
  }
  return pt;
}

function findSize(pt: PrintTypeLite, key: string): SizeLite {
  const size = pt.sizes.find((s) => s.key === key);
  if (!size) {
    throw new PriceInputError("input.sizeKey", "הגודל", "לא מצאתי את הגודל הזה");
  }
  return size;
}

function findMaterial(cfg: PriceEngineConfig, key: string): MaterialLite {
  if (key === "") return NEUTRAL_MATERIAL;
  const m = cfg.materials.find((x) => x.key === key);
  if (!m) {
    throw new PriceInputError("input.materialKey", "החומר", "לא מצאתי את החומר הזה");
  }
  return m;
}

/**
 * Colours resolve leniently on purpose. A spool Shai retired should not turn an
 * old draft into a crash, and the guard samples carry synthetic ids. An id that
 * does not resolve still counts toward the colour count, costs nothing extra and
 * carries no finish.
 */
function resolveColors(cfg: PriceEngineConfig, ids: string[]): ColorLite[] {
  const out: ColorLite[] = [];
  for (const id of ids) {
    const c = cfg.colors.find((x) => x.id === id);
    if (c) out.push(c);
  }
  return out;
}

function ruleAppliesToType(
  rule: { appliesToAll: boolean; printTypeKeys: string[] },
  printTypeKey: string,
): boolean {
  return rule.appliesToAll || rule.printTypeKeys.includes(printTypeKey);
}

function pickTier(tiers: TierLite[], quantity: number): TierLite | null {
  let best: TierLite | null = null;
  for (const t of tiers) {
    if (!t.active) continue;
    if (quantity < t.minQty) continue;
    if (!best || t.minQty > best.minQty) best = t;
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* the engine                                                          */
/* ------------------------------------------------------------------ */

export function computePrice(
  input: PriceInput,
  cfg: PriceEngineConfig,
): PriceBreakdown {
  const k = cfg.config;

  /* --- 0. the input has to be a real order --- */
  if (!isInt(input.quantity) || input.quantity < 1) {
    throw new PriceInputError("input.quantity", "כמות", "כמות חייבת להיות לפחות יחידה אחת");
  }
  const maxQty = isInt(k.maxQuantity) && k.maxQuantity > 0 ? k.maxQuantity : 25;
  if (input.quantity > maxQty) {
    throw new PriceInputError(
      "input.quantity",
      "כמות",
      `אפשר להזמין עד ${maxQty} יחידות בהזמנה אחת`,
    );
  }
  if (input.deliveryMethod === "pickup" && !k.pickupEnabled) {
    throw new PriceInputError("input.deliveryMethod", "מסירה", "איסוף עצמי לא זמין כרגע");
  }

  const pt = findPrintType(cfg, input.printTypeKey);
  const size = findSize(pt, input.sizeKey);
  const material = findMaterial(cfg, input.materialKey);
  const colors = resolveColors(cfg, input.colorIds);
  const colorCount = input.colorIds.length;
  const quantity = input.quantity;

  /* --- 1..2. how much filament and how much printer time --- */
  const scale = size.multiplier;
  const volumeScale = Math.pow(scale, pt.volumeExponent);
  const rawGrams =
    isFiniteNum(input.measuredGrams) && input.measuredGrams > 0
      ? input.measuredGrams
      : isFiniteNum(size.gramsOverride)
        ? size.gramsOverride
        : pt.refGrams * volumeScale;
  const rawHours = isFiniteNum(size.hoursOverride)
    ? size.hoursOverride
    : pt.refHours * volumeScale;

  /* --- 3. what those two cost --- */
  const billedGrams = rawGrams * (1 + k.filamentWasteBp / BP);
  const materialCostRaw = billedGrams * k.filamentCostPerGramAgorot;
  const machineCostRaw = rawHours * k.machineRatePerHourAgorot;

  /* --- 4. complexity multiplies only the variable part --- */
  const variableAgorot = toAgorot((materialCostRaw + machineCostRaw) * pt.complexity);

  /* --- 5..6. base price, material, margin --- */
  const unitCoreAgorot = toAgorot(
    (pt.basePriceAgorot + variableAgorot) * material.priceMultiplier,
  );
  const unitBaseAgorot =
    mulBp(unitCoreAgorot, k.marginMultiplierBp) + material.flatAddAgorot;

  /* --- 7. colours --- */
  const extraColorCount = Math.max(0, colorCount - k.freeColorCount);
  const extraColorsAgorot = extraColorCount * k.extraColorAgorot;
  let colorPremiumAgorot = 0;
  for (const c of colors) colorPremiumAgorot += c.extraCostAgorot;

  /* --- 8. finish, taken as a MAX and never as a sum --- */
  const finishes: FinishKey[] = [];
  for (const c of colors) finishes.push(c.finish);
  if (material.finish) finishes.push(material.finish);
  if (pt.forcedFinish) finishes.push(pt.forcedFinish);
  let finishAgorot = 0;
  let finishKey: FinishKey | null = null;
  for (const f of finishes) {
    const amount = k.finishSurchargeAgorot[f] ?? 0;
    if (amount > finishAgorot) {
      finishAgorot = amount;
      finishKey = f;
    }
  }

  /* --- 9. automatic surcharge rules --- */
  const addons: AppliedAddon[] = [];
  const perUnitAddonAgorot: { ruleId: string; labelHe: string; hintHe?: string; amount: Agorot }[] =
    [];
  const flatAddonAgorot: { ruleId: string; labelHe: string; hintHe?: string; amount: Agorot }[] = [];

  const activeRules = cfg.rules
    .filter((r) => r.active && ruleAppliesToType(r, pt.key))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let autoRulesAgorot = 0;
  for (const rule of activeRules) {
    const t = rule.trigger;
    let amount = 0;
    if (t.kind === "autoOversize") {
      if (isFiniteNum(size.longestEdgeMm) && size.longestEdgeMm >= t.minLongestEdgeMm) {
        amount = t.amountAgorot;
      }
    } else if (t.kind === "autoMaterial") {
      if (material.key === t.materialKey) amount = t.amountAgorot;
    } else if (t.kind === "autoColorCount") {
      if (colorCount >= t.minColors) amount = t.amountAgorot;
    }
    if (amount !== 0) {
      autoRulesAgorot += amount;
      perUnitAddonAgorot.push({
        ruleId: rule.id,
        labelHe: rule.labelHe,
        hintHe: rule.hintHe,
        amount,
      });
      addons.push({ ruleId: rule.id, labelHe: rule.labelHe, amountAgorot: amount });
    }
  }

  /* --- 10. optional addons the visitor ticked --- */
  const unitBeforeAddons =
    unitBaseAgorot + extraColorsAgorot + colorPremiumAgorot + finishAgorot + autoRulesAgorot;

  let optionalPerUnitAgorot = 0;
  for (const ruleId of input.addonRuleIds) {
    const rule = activeRules.find((r) => r.id === ruleId);
    if (!rule || rule.trigger.kind !== "optionalAddon") continue;
    const t = rule.trigger;
    if (t.mode === "flat") {
      flatAddonAgorot.push({
        ruleId: rule.id,
        labelHe: rule.labelHe,
        hintHe: rule.hintHe,
        amount: t.amountAgorot,
      });
      addons.push({ ruleId: rule.id, labelHe: rule.labelHe, amountAgorot: t.amountAgorot });
      continue;
    }
    const amount =
      t.mode === "percent" ? mulBp(unitBeforeAddons, t.percentBp) : t.amountAgorot;
    if (amount === 0) continue;
    optionalPerUnitAgorot += amount;
    perUnitAddonAgorot.push({
      ruleId: rule.id,
      labelHe: rule.labelHe,
      hintHe: rule.hintHe,
      amount,
    });
    addons.push({ ruleId: rule.id, labelHe: rule.labelHe, amountAgorot: amount });
  }

  /* --- 11..12. the unit, then the line --- */
  const unitAgorot = unitBeforeAddons + optionalPerUnitAgorot;
  const lineTotalAgorot = unitAgorot * quantity;
  let flatAddonsTotal = 0;
  for (const f of flatAddonAgorot) flatAddonsTotal += f.amount;

  /* --- 13. quantity tier --- */
  const tier = pickTier(cfg.tiers, quantity);
  const discountBp = tier ? tier.discountBp : 0;
  const discountAgorot = discountBp > 0 ? mulBp(lineTotalAgorot, discountBp) : 0;

  /* --- 14. subtotal --- */
  const subtotalBeforeRush =
    lineTotalAgorot + flatAddonsTotal - discountAgorot + k.setupFeeAgorot;

  /* --- 15. rush. opt in, gated by the promised lead time, capped --- */
  const insideLeadTime =
    input.requestedInDays === undefined || input.requestedInDays < k.leadTimeDays;
  const rushApplied = input.rush === true && k.rushEnabled && insideLeadTime;
  const rushAgorot = rushApplied
    ? Math.round(
        clamp(
          mulBp(subtotalBeforeRush, k.rushPercentBp),
          k.rushFeeMinAgorot,
          k.rushFeeMaxAgorot,
        ),
      )
    : 0;

  /* --- 16. the floor --- */
  const beforeMinimum = subtotalBeforeRush + rushAgorot;
  const minOrderBumpAgorot = Math.max(0, k.minOrderAgorot - beforeMinimum);
  const afterMinimum = beforeMinimum + minOrderBumpAgorot;

  /* --- 17. delivery --- */
  const shippingAgorot =
    input.deliveryMethod === "pickup"
      ? 0
      : afterMinimum >= k.freeShippingThresholdAgorot
        ? 0
        : k.shippingFlatAgorot;

  /* --- 18. the total, rounded to a number a person would say --- */
  const subtotalAgorot = afterMinimum + shippingAgorot;
  let totalAgorot = roundToStep(subtotalAgorot, k.roundToAgorot, k.roundingMode);
  if (k.charmEnding) {
    const charmed = totalAgorot - 10;
    if (charmed > 0 && charmed >= k.minOrderAgorot) totalAgorot = charmed;
  }
  const roundingAgorot = totalAgorot - subtotalAgorot;

  /* --- the breakdown rows --- */
  const specialMaterialAgorot = colorPremiumAgorot + finishAgorot;
  const rows: Omit<PriceLine, "displayAgorot">[] = [];

  rows.push({
    key: "unit",
    labelHe: `${pt.nameHe} ×${quantity}`,
    amountAgorot: unitBaseAgorot * quantity,
  });

  if (extraColorsAgorot > 0) {
    rows.push({
      key: "colors",
      labelHe: `${extraColorCount} צבעים נוספים`,
      hintHe: LABEL.colorsHint,
      amountAgorot: extraColorsAgorot * quantity,
    });
  }

  if (specialMaterialAgorot > 0) {
    rows.push({
      key: "finish",
      labelHe: LABEL.finish,
      amountAgorot: specialMaterialAgorot * quantity,
    });
  }

  for (const a of perUnitAddonAgorot) {
    rows.push({
      key: "addon",
      id: a.ruleId,
      labelHe: a.labelHe,
      hintHe: a.hintHe,
      amountAgorot: a.amount * quantity,
    });
  }
  for (const a of flatAddonAgorot) {
    rows.push({
      key: "addon",
      id: a.ruleId,
      labelHe: a.labelHe,
      hintHe: a.hintHe,
      amountAgorot: a.amount,
    });
  }

  if (discountAgorot > 0) {
    rows.push({
      key: "qtyDiscount",
      labelHe: `הנחת כמות ${bpToPercentText(discountBp)}%`,
      amountAgorot: -discountAgorot,
    });
  }

  if (k.setupFeeAgorot !== 0) {
    rows.push({ key: "setup", labelHe: LABEL.setup, amountAgorot: k.setupFeeAgorot });
  }

  if (rushAgorot > 0) {
    rows.push({ key: "rush", labelHe: LABEL.rush, amountAgorot: rushAgorot });
  }

  if (minOrderBumpAgorot > 0) {
    rows.push({
      key: "minOrder",
      labelHe: LABEL.minOrder,
      amountAgorot: minOrderBumpAgorot,
    });
  }

  if (shippingAgorot > 0) {
    rows.push({ key: "delivery", labelHe: LABEL.delivery, amountAgorot: shippingAgorot });
  }

  /*
   * Each row is printed at a whole shekel and the rounding row absorbs whatever
   * that costs, so the column on the screen adds up to the printed total exactly
   * (04 §C3). The exact agorot always add up too.
   */
  const lines: PriceLine[] = rows.map((r) => ({
    ...r,
    displayAgorot: toWholeShekel(r.amountAgorot),
  }));
  let displaySum = 0;
  for (const l of lines) displaySum += l.displayAgorot;
  const displayRemainder = totalAgorot - displaySum;
  if (roundingAgorot !== 0 || displayRemainder !== 0) {
    lines.push({
      key: "rounding",
      labelHe: LABEL.rounding,
      amountAgorot: roundingAgorot,
      displayAgorot: displayRemainder,
    });
  }

  return {
    unitAgorot,
    lines,
    subtotalAgorot,
    roundingAgorot,
    totalAgorot,
    grams: Math.round(rawGrams * 100) / 100,
    hours: Math.round(rawHours * 1000) / 1000,
    configVersion: cfg.version,

    currency: "ILS",
    printTypeKey: pt.key,
    printTypeNameHe: pt.nameHe,
    basePriceAgorot: pt.basePriceAgorot,
    sizeKey: size.key,
    sizeMultiplier: size.multiplier,
    materialKey: material.key,
    materialMultiplier: material.priceMultiplier,
    materialFlatAgorot: material.flatAddAgorot,
    billedGrams: Math.round(billedGrams * 100) / 100,
    materialCostAgorot: toAgorot(materialCostRaw),
    machineCostAgorot: toAgorot(machineCostRaw),
    variableAgorot,
    complexity: pt.complexity,
    unitCoreAgorot,
    unitBaseAgorot,
    colorCount,
    freeColorCount: k.freeColorCount,
    extraColorsAgorot,
    colorPremiumAgorot,
    finishKey,
    finishAgorot,
    addons,
    quantity,
    lineTotalAgorot,
    discountTierId: tier ? tier.id : null,
    discountBp,
    discountAgorot,
    setupFeeAgorot: k.setupFeeAgorot,
    rushApplied,
    rushAgorot,
    deliveryMethod: input.deliveryMethod,
    shippingAgorot,
    minOrderBumpAgorot,
  };
}

/* ------------------------------------------------------------------ */
/* the chip on the print type card                                     */
/* ------------------------------------------------------------------ */

export type FromPriceResult = {
  agorot: Agorot;
  /** what goes into `printTypes.fromPriceIls` */
  ils: number;
  sizeKey: string;
  breakdown: PriceBreakdown;
};

function cheapestMaterialKey(cfg: PriceEngineConfig, pt: PrintTypeLite): string {
  const allowed = pt.allowedMaterialKeys;
  const pool = cfg.materials.filter(
    (m) => m.active && (!allowed || allowed.length === 0 || allowed.includes(m.key)),
  );
  let best: MaterialLite | null = null;
  for (const m of pool) {
    if (!best) {
      best = m;
      continue;
    }
    if (
      m.priceMultiplier < best.priceMultiplier ||
      (m.priceMultiplier === best.priceMultiplier && m.flatAddAgorot < best.flatAddAgorot)
    ) {
      best = m;
    }
  }
  return best ? best.key : "";
}

function cheapestColorIds(cfg: PriceEngineConfig, k: PricingKnobs): string[] {
  const pool = cfg.colors.filter((c) => c.active);
  let best: ColorLite | null = null;
  for (const c of pool) {
    const cost = c.extraCostAgorot + (k.finishSurchargeAgorot[c.finish] ?? 0);
    if (!best) {
      best = c;
      continue;
    }
    const bestCost = best.extraCostAgorot + (k.finishSurchargeAgorot[best.finish] ?? 0);
    if (cost < bestCost) best = c;
  }
  /* an id nothing resolves to still counts as one colour and costs nothing */
  return [best ? best.id : "__cheapest__"];
}

/**
 * The number on the print type card: `מתחיל מ-{n} ש״ח`.
 *
 * RESOLUTIONS §8. The chip used to read `basePriceAgorot`, which is not a price
 * but the constant term inside the formula, so the lithophane card said 45 while
 * the engine returned 105. This runs the real engine on the cheapest active size,
 * one unit, collection, one colour, no extras, and returns what that costs.
 */
export function fromPrice(
  printType: string | PrintTypeLite,
  cfg: PriceEngineConfig,
): FromPriceResult | null {
  const key = typeof printType === "string" ? printType : printType.key;
  const pt = cfg.printTypes.find((p) => p.key === key);
  if (!pt) return null;

  const sizes = pt.sizes.filter((s) => s.active);
  if (sizes.length === 0) return null;

  const materialKey = cheapestMaterialKey(cfg, pt);
  const colorIds = cheapestColorIds(cfg, cfg.config);
  const deliveryMethod: DeliveryMethod = cfg.config.pickupEnabled ? "pickup" : "shipping";

  let best: FromPriceResult | null = null;
  for (const size of sizes) {
    const breakdown = computePrice(
      {
        printTypeKey: pt.key,
        materialKey,
        sizeKey: size.key,
        colorIds,
        quantity: 1,
        addonRuleIds: [],
        rush: false,
        deliveryMethod,
      },
      cfg,
    );
    if (!best || breakdown.totalAgorot < best.agorot) {
      best = {
        agorot: breakdown.totalAgorot,
        ils: agorotToIls(breakdown.totalAgorot),
        sizeKey: size.key,
        breakdown,
      };
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* the six canonical configurations the guards price                   */
/* ------------------------------------------------------------------ */

export const SAMPLE_INPUTS: SampleInput[] = [
  {
    labelHe: "מחזיק מפתחות קטן, 2 צבעים, 3 יחידות",
    printTypeKey: "keychain",
    materialKey: "pla",
    sizeKey: "s",
    colorIds: ["sample-c1", "sample-c2"],
    quantity: 3,
    addonRuleIds: [],
    rush: false,
    deliveryMethod: "pickup",
  },
  {
    labelHe: "ליתופן בינוני, צבע אחד",
    printTypeKey: "lithophane",
    materialKey: "pla",
    sizeKey: "m",
    colorIds: ["sample-c1"],
    quantity: 1,
    addonRuleIds: [],
    rush: false,
    deliveryMethod: "shipping",
  },
  {
    labelHe: "תמונה במסגרת גדולה, 6 צבעים, דחוף",
    printTypeKey: "framed",
    materialKey: "pla",
    sizeKey: "l",
    colorIds: [
      "sample-c1",
      "sample-c2",
      "sample-c3",
      "sample-c4",
      "sample-c5",
      "sample-c6",
    ],
    quantity: 1,
    addonRuleIds: [],
    rush: true,
    requestedInDays: 1,
    deliveryMethod: "shipping",
  },
  {
    labelHe: "מגנט בינוני, 10 יחידות",
    printTypeKey: "magnet",
    materialKey: "pla",
    sizeKey: "m",
    colorIds: ["sample-c1", "sample-c2"],
    quantity: 10,
    addonRuleIds: [],
    rush: false,
    deliveryMethod: "pickup",
  },
  {
    labelHe: "דמות עומדת בינונית, 4 צבעים",
    printTypeKey: "standee",
    materialKey: "pla",
    sizeKey: "m",
    colorIds: ["sample-c1", "sample-c2", "sample-c3", "sample-c4"],
    quantity: 1,
    addonRuleIds: [],
    rush: false,
    deliveryMethod: "shipping",
  },
  {
    labelHe: "ליתופן זוהר בינוני",
    printTypeKey: "glow",
    materialKey: "pla",
    sizeKey: "m",
    colorIds: ["sample-c1"],
    quantity: 1,
    addonRuleIds: [],
    rush: false,
    deliveryMethod: "pickup",
  },
];

/* ------------------------------------------------------------------ */
/* guards                                                              */
/* ------------------------------------------------------------------ */

function err(field: string, fieldHe: string, messageHe: string): Issue {
  return { field, fieldHe, messageHe, severity: "error" };
}

function warn(field: string, fieldHe: string, messageHe: string): Issue {
  return { field, fieldHe, messageHe, severity: "warning" };
}

/**
 * Everything that has to be true before Shai can publish a price.
 *
 * Hard errors block the save. Soft warnings need one extra tap. Both name the
 * field they came from, in Hebrew, because a guard that says "invalid config" is
 * a guard nobody can act on.
 */
export function assertConfigSane(cfg: PriceEngineConfig): ConfigReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const k = cfg.config;

  /* --- the cost basis --- */
  const moneyFields: [keyof PricingKnobs, string][] = [
    ["filamentCostPerGramAgorot", "עלות פילמנט לגרם"],
    ["machineRatePerHourAgorot", "עלות שעת מכונה"],
    ["setupFeeAgorot", "הכנה וחיתוך"],
    ["extraColorAgorot", "מחיר לכל צבע נוסף"],
    ["rushFeeMinAgorot", "מינימום דחוף"],
    ["rushFeeMaxAgorot", "תקרת דחוף"],
    ["shippingFlatAgorot", "מחיר משלוח"],
    ["freeShippingThresholdAgorot", "סף משלוח חינם"],
    ["minOrderAgorot", "הזמנה מינימלית"],
    ["maxPlausibleTotalAgorot", "תקרת סבירות"],
  ];
  for (const [field, fieldHe] of moneyFields) {
    const value = k[field];
    if (!isInt(value)) {
      errors.push(
        err(`config.${String(field)}`, fieldHe, "כל סכום חייב להיות מספר שלם באגורות"),
      );
    } else if (value < 0) {
      errors.push(err(`config.${String(field)}`, fieldHe, "סכום לא יכול להיות שלילי"));
    }
  }

  if (isInt(k.filamentCostPerGramAgorot) && k.filamentCostPerGramAgorot <= 0) {
    errors.push(
      err(
        "config.filamentCostPerGramAgorot",
        "עלות פילמנט לגרם",
        "עלות הפילמנט לגרם חייבת להיות גדולה מאפס",
      ),
    );
  }
  if (isInt(k.machineRatePerHourAgorot) && k.machineRatePerHourAgorot <= 0) {
    errors.push(
      err(
        "config.machineRatePerHourAgorot",
        "עלות שעת מכונה",
        "עלות שעת המכונה חייבת להיות גדולה מאפס",
      ),
    );
  }
  if (!isFiniteNum(k.filamentWasteBp) || k.filamentWasteBp < 0 || k.filamentWasteBp > 5000) {
    errors.push(err("config.filamentWasteBp", "פחת", "פחת חייב להיות בין 0% ל-50%"));
  }
  if (!isFiniteNum(k.marginMultiplierBp) || k.marginMultiplierBp < BP) {
    errors.push(
      err("config.marginMultiplierBp", "מכפיל רווח", "מכפיל הרווח לא יכול לרדת מתחת ל-1"),
    );
  } else if (k.marginMultiplierBp > 50000) {
    errors.push(err("config.marginMultiplierBp", "מכפיל רווח", "מכפיל הרווח עד 5"));
  }

  /* --- colours --- */
  if (!isInt(k.freeColorCount) || k.freeColorCount < 0) {
    errors.push(
      err(
        "config.freeColorCount",
        "כמה צבעים כלולים במחיר",
        "מספר הצבעים הכלולים חייב להיות מספר שלם ולא שלילי",
      ),
    );
  }
  if (isInt(k.extraColorAgorot) && k.extraColorAgorot > 20000) {
    errors.push(
      err("config.extraColorAgorot", "מחיר לכל צבע נוסף", "תוספת לצבע עד 200 ש״ח"),
    );
  }
  const finishKeys: FinishKey[] = [
    "matte",
    "glossy",
    "silk",
    "glow",
    "wood",
    "transparent",
  ];
  for (const f of finishKeys) {
    const value = k.finishSurchargeAgorot ? k.finishSurchargeAgorot[f] : undefined;
    if (!isInt(value) || (value as number) < 0) {
      errors.push(
        err(
          `config.finishSurchargeAgorot.${f}`,
          "תוספת חומר מיוחד",
          "תוספת החומר המיוחד חייבת להיות מספר שלם באגורות ולא שלילית",
        ),
      );
    }
  }

  /* --- quantity --- */
  if (!isInt(k.maxQuantity) || k.maxQuantity < 1) {
    errors.push(err("config.maxQuantity", "כמות מרבית", "הכמות המרבית חייבת להיות לפחות 1"));
  }

  /* --- rush --- */
  if (!isFiniteNum(k.rushPercentBp) || k.rushPercentBp < 0) {
    errors.push(err("config.rushPercentBp", "אחוז דחוף", "תוספת דחוף לא יכולה להיות שלילית"));
  } else if (k.rushPercentBp > BP) {
    errors.push(err("config.rushPercentBp", "אחוז דחוף", "תוספת דחוף עד 100%"));
  }
  if (
    isInt(k.rushFeeMinAgorot) &&
    isInt(k.rushFeeMaxAgorot) &&
    k.rushFeeMaxAgorot < k.rushFeeMinAgorot
  ) {
    errors.push(
      err("config.rushFeeMaxAgorot", "תקרת דחוף", "תקרת הדחיפות חייבת להיות גבוהה מהמינימום"),
    );
  }
  if (!isInt(k.leadTimeDays) || k.leadTimeDays < 1) {
    errors.push(err("config.leadTimeDays", "זמן אספקה", "זמן האספקה חייב להיות לפחות יום אחד"));
  }
  if (k.rushEnabled && k.rushPercentBp === 0) {
    warnings.push(warn("config.rushPercentBp", "אחוז דחוף", "דחוף מופעל אבל לא מוסיף כלום."));
  }

  /* --- delivery --- */
  if (
    isInt(k.freeShippingThresholdAgorot) &&
    isInt(k.shippingFlatAgorot) &&
    k.freeShippingThresholdAgorot < k.shippingFlatAgorot
  ) {
    errors.push(
      err(
        "config.freeShippingThresholdAgorot",
        "סף משלוח חינם",
        "סף משלוח חינם חייב להיות גבוה ממחיר המשלוח",
      ),
    );
  }

  /* --- floor and rounding --- */
  if (isInt(k.minOrderAgorot) && k.minOrderAgorot < 1000) {
    errors.push(err("config.minOrderAgorot", "הזמנה מינימלית", "הזמנה מינימלית לפחות 10 ש״ח"));
  }
  if (!ROUND_TO_OPTIONS.includes(k.roundToAgorot)) {
    errors.push(
      err(
        "config.roundToAgorot",
        "עיגול",
        "אפשרות העיגול חייבת להיות אחת מהאפשרויות הקיימות",
      ),
    );
  }
  if (k.roundingMode !== "up" && k.roundingMode !== "nearest") {
    errors.push(
      err(
        "config.roundingMode",
        "עיגול",
        "אפשרות העיגול חייבת להיות אחת מהאפשרויות הקיימות",
      ),
    );
  }

  /* --- print types --- */
  const activeTypes = cfg.printTypes.filter((p) => p.active);
  for (const pt of activeTypes) {
    const at = `printTypes.${pt.key}`;
    if (!isInt(pt.basePriceAgorot) || pt.basePriceAgorot < 500) {
      errors.push(err(`${at}.basePriceAgorot`, "מחיר בסיס", "מחיר בסיס חייב להיות לפחות 5 ש״ח"));
    } else if (pt.basePriceAgorot > 500000) {
      errors.push(err(`${at}.basePriceAgorot`, "מחיר בסיס", "מחיר בסיס עד 5,000 ש״ח"));
    }
    if (!isFiniteNum(pt.refGrams) || pt.refGrams <= 0) {
      errors.push(err(`${at}.refGrams`, "משקל ייחוס", "משקל הייחוס חייב להיות גדול מאפס"));
    }
    if (!isFiniteNum(pt.refHours) || pt.refHours <= 0) {
      errors.push(err(`${at}.refHours`, "זמן ייחוס", "זמן הייחוס חייב להיות גדול מאפס"));
    }
    if (!isFiniteNum(pt.complexity) || pt.complexity < 0.5 || pt.complexity > 3) {
      errors.push(
        err(`${at}.complexity`, "מורכבות", "מקדם המורכבות חייב להיות בין 0.5 ל-3"),
      );
    }
    if (!isFiniteNum(pt.volumeExponent) || pt.volumeExponent < 1 || pt.volumeExponent > 4) {
      errors.push(
        err(`${at}.volumeExponent`, "מעריך נפח", "מעריך הנפח חייב להיות בין 1 ל-4"),
      );
    }
    const activeSizes = pt.sizes.filter((s) => s.active);
    if (activeSizes.length === 0) {
      errors.push(err(`${at}.sizes`, "גדלים", "צריך לפחות גודל אחד פעיל"));
    }
    for (const s of activeSizes) {
      if (!isFiniteNum(s.multiplier) || s.multiplier < 0.2 || s.multiplier > 10) {
        errors.push(
          err(`${at}.sizes.${s.key}.multiplier`, "גדלים", "מכפיל גודל חייב להיות בין 0.2 ל-10"),
        );
      }
    }
  }
  if (activeTypes.length === 0) {
    errors.push(err("printTypes", "סוגי הדפסה", "צריך לפחות סוג הדפסה אחד פעיל"));
  }

  /* --- materials --- */
  for (const m of cfg.materials.filter((x) => x.active)) {
    if (!isFiniteNum(m.priceMultiplier) || m.priceMultiplier < 0.5 || m.priceMultiplier > 3) {
      errors.push(
        err(
          `materials.${m.key}.priceMultiplier`,
          "חומרים",
          "תוספת חומר חייבת להיות בין -50% ל-200%",
        ),
      );
    }
    if (!isInt(m.flatAddAgorot) || m.flatAddAgorot < 0) {
      errors.push(
        err(
          `materials.${m.key}.flatAddAgorot`,
          "חומרים",
          "כל סכום חייב להיות מספר שלם באגורות",
        ),
      );
    }
  }

  /* --- the tier ladder --- */
  const tiers = cfg.tiers.filter((t) => t.active).slice().sort((a, b) => a.minQty - b.minQty);
  let previousQty = -Infinity;
  let previousDiscount = -Infinity;
  for (const t of tiers) {
    if (!isFiniteNum(t.discountBp) || t.discountBp < 0) {
      errors.push(err(`tiers.${t.id}.discountBp`, "הנחות כמות", "הנחה לא יכולה להיות שלילית"));
    } else if (t.discountBp > 4000) {
      errors.push(err(`tiers.${t.id}.discountBp`, "הנחות כמות", "הנחה מקסימלית 40%"));
    }
    if (!isInt(t.minQty) || t.minQty < 1 || t.minQty <= previousQty) {
      errors.push(
        err(`tiers.${t.id}.minQty`, "הנחות כמות", "כל מדרגה חייבת להתחיל בכמות גדולה יותר"),
      );
    }
    if (t.discountBp < previousDiscount) {
      errors.push(
        err(`tiers.${t.id}.discountBp`, "הנחות כמות", "הנחה לא יכולה לרדת כשהכמות עולה"),
      );
    }
    previousQty = t.minQty;
    previousDiscount = t.discountBp;
  }

  /* --- nobody will ever pay for a colour --- */
  if (
    activeTypes.length > 0 &&
    isInt(k.freeColorCount) &&
    activeTypes.every((p) => k.freeColorCount >= p.maxColors)
  ) {
    warnings.push(
      warn(
        "config.freeColorCount",
        "כמה צבעים כלולים במחיר",
        "אף אחד לא ישלם על צבעים נוספים בהגדרה הזאת.",
      ),
    );
  }

  /*
   * The part that actually protects him: price the six canonical configurations
   * with these settings and read the answers. A knob that produces a free order,
   * an order the minimum has to prop up, or a four thousand shekel keychain is
   * caught here and not by a customer.
   *
   * The checks read the order BEFORE the minimum lifted it. 06 §C.12 phrases two
   * of them against the total, and against the total they can never fire, because
   * the engine already floors every order at `minOrderAgorot`. What the guard is
   * really asking is whether the configuration prices these orders below the floor
   * and lets the floor hide it.
   */
  const seen = new Set<string>();
  for (const sample of SAMPLE_INPUTS) {
    let b: PriceBreakdown;
    try {
      b = computePrice(sample, cfg);
    } catch {
      continue;
    }
    const beforeFloor =
      b.totalAgorot - b.roundingAgorot - b.shippingAgorot - b.minOrderBumpAgorot;

    let issue: Issue | null = null;
    if (beforeFloor <= 0) {
      issue = err("samples", "מעבדת מחיר", "עם ההגדרות האלה יש הזמנה שיוצאת בחינם");
    } else if (b.minOrderBumpAgorot > 0) {
      issue = err(
        "samples",
        "מעבדת מחיר",
        `עם ההגדרות האלה הדוגמה «${sample.labelHe}» יוצאת מתחת למינימום`,
      );
    } else if (b.totalAgorot > k.maxPlausibleTotalAgorot) {
      issue = err(
        "samples",
        "מעבדת מחיר",
        `עם ההגדרות האלה הדוגמה «${sample.labelHe}» יוצאת ${agorotToIls(b.totalAgorot)} ש״ח. משהו כאן לא נכון.`,
      );
    }
    if (issue && !seen.has(issue.messageHe)) {
      seen.add(issue.messageHe);
      errors.push(issue);
    }
  }

  return { errors, warnings };
}

/** the same guards, as the throw that `pricing.updateDraft` needs */
export function assertConfigOrThrow(cfg: PriceEngineConfig): ConfigReport {
  const report = assertConfigSane(cfg);
  if (report.errors.length > 0) throw new PriceConfigError(report.errors);
  return report;
}

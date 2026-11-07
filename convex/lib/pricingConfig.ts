/**
 * Assembling the one thing `computePrice` needs.
 *
 * `convex/lib/priceEngine.ts` imports nothing and knows no table, so somebody has
 * to read the live catalogue and hand it over in the shape it expects. That is
 * this file, and it is the ONLY place that translation happens: ids become plain
 * strings, `allowedMaterialIds` becomes `allowedMaterialKeys`, and the pricing
 * row becomes `PricingKnobs`.
 *
 * The channel matters. "live" is what the site charges and what every visitor
 * mutation must use. "draft" is what Shai is editing and is admin-only, so a
 * half-finished price experiment can never reach a customer.
 */
import type {
  ColorLite,
  MaterialLite,
  PriceEngineConfig,
  PricingKnobs,
  PrintTypeLite,
  RuleLite,
  TierLite,
} from "./priceEngine";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { AnyCtx } from "./auth";

export type PricingChannel = "live" | "draft";

function knobsFrom(row: Doc<"pricingConfig">): PricingKnobs {
  return {
    filamentCostPerGramAgorot: row.filamentCostPerGramAgorot,
    filamentWasteBp: row.filamentWasteBp,
    machineRatePerHourAgorot: row.machineRatePerHourAgorot,
    setupFeeAgorot: row.setupFeeAgorot,
    marginMultiplierBp: row.marginMultiplierBp,

    freeColorCount: row.freeColorCount,
    extraColorAgorot: row.extraColorAgorot,
    finishSurchargeAgorot: {
      matte: row.finishSurchargeAgorot.matte,
      glossy: row.finishSurchargeAgorot.glossy,
      silk: row.finishSurchargeAgorot.silk,
      glow: row.finishSurchargeAgorot.glow,
      wood: row.finishSurchargeAgorot.wood,
      transparent: row.finishSurchargeAgorot.transparent,
    },

    maxQuantity: row.maxQuantity,

    rushEnabled: row.rushEnabled,
    rushPercentBp: row.rushPercentBp,
    rushFeeMinAgorot: row.rushFeeMinAgorot,
    rushFeeMaxAgorot: row.rushFeeMaxAgorot,
    leadTimeDays: row.leadTimeDays,
    rushLabelHe: row.rushLabelHe,

    pickupEnabled: row.pickupEnabled,
    pickupLabelHe: row.pickupLabelHe,
    shippingFlatAgorot: row.shippingFlatAgorot,
    freeShippingThresholdAgorot: row.freeShippingThresholdAgorot,

    minOrderAgorot: row.minOrderAgorot,
    roundToAgorot: row.roundToAgorot,
    roundingMode: row.roundingMode,
    charmEnding: row.charmEnding,
    maxPlausibleTotalAgorot: row.maxPlausibleTotalAgorot,
  };
}

export async function getPricingRow(
  ctx: AnyCtx,
  channel: PricingChannel,
): Promise<Doc<"pricingConfig">> {
  const row = await ctx.db
    .query("pricingConfig")
    .withIndex("by_channel", (q) => q.eq("channel", channel))
    .unique();
  if (!row) {
    throw new ConvexError({
      code: "NO_PRICING_CONFIG",
      he: "התמחור עוד לא הוגדר. צריך להריץ את הזריעה",
    });
  }
  return row;
}

/**
 * Reads the whole price surface in one pass and returns it in engine shape.
 * Soft-deleted and inactive rows are dropped here, so no caller has to remember.
 */
export async function loadPriceEngineConfig(
  ctx: AnyCtx,
  channel: PricingChannel = "live",
): Promise<PriceEngineConfig> {
  const row = await getPricingRow(ctx, channel);

  const [printTypeDocs, materialDocs, colorDocs, ruleDocs, tierDocs] = await Promise.all([
    ctx.db
      .query("printTypes")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect(),
    ctx.db
      .query("materials")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect(),
    ctx.db
      .query("filamentColors")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect(),
    ctx.db
      .query("surchargeRules")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect(),
    ctx.db
      .query("quantityDiscountTiers")
      .withIndex("by_active_qty", (q) => q.eq("active", true))
      .collect(),
  ]);

  const live = <T extends { deletedAt?: number }>(rows: T[]) =>
    rows.filter((r) => r.deletedAt === undefined);

  const printTypes = live(printTypeDocs).sort((a, b) => a.sortOrder - b.sortOrder);
  const materials = live(materialDocs).sort((a, b) => a.sortOrder - b.sortOrder);
  const colors = live(colorDocs).sort((a, b) => a.sortOrder - b.sortOrder);
  const rules = live(ruleDocs).sort((a, b) => a.sortOrder - b.sortOrder);
  const tiers = live(tierDocs).sort((a, b) => a.minQty - b.minQty);

  const materialKeyById = new Map<Id<"materials">, string>(
    materials.map((m) => [m._id, m.key]),
  );
  const printTypeKeyById = new Map<Id<"printTypes">, string>(
    printTypes.map((p) => [p._id, p.key]),
  );

  const printTypesLite: PrintTypeLite[] = printTypes.map((pt) => ({
    key: pt.key,
    nameHe: pt.nameHe,
    basePriceAgorot: pt.basePriceAgorot,
    sizes: pt.sizes,
    maxColors: pt.maxColors,
    refGrams: pt.refGrams,
    refHours: pt.refHours,
    complexity: pt.complexity,
    volumeExponent: pt.volumeExponent,
    forcedFinish: pt.forcedFinish,
    allowedMaterialKeys: pt.allowedMaterialIds
      .map((id) => materialKeyById.get(id))
      .filter((key): key is string => key !== undefined),
    active: pt.active,
  }));

  const materialsLite: MaterialLite[] = materials.map((m) => ({
    key: m.key,
    nameHe: m.nameHe,
    priceMultiplier: m.priceMultiplier,
    flatAddAgorot: m.flatAddAgorot,
    finish: m.finish,
    active: m.active,
  }));

  const colorsLite: ColorLite[] = colors.map((c) => ({
    id: c._id,
    nameHe: c.nameHe,
    finish: c.finish,
    extraCostAgorot: c.extraCostAgorot,
    active: c.active,
  }));

  const rulesLite: RuleLite[] = rules.map((r) => ({
    id: r._id,
    labelHe: r.labelHe,
    hintHe: r.descriptionHe,
    trigger:
      r.trigger.kind === "autoMaterial"
        ? {
            kind: "autoMaterial" as const,
            materialKey: materialKeyById.get(r.trigger.materialId) ?? "",
            amountAgorot: r.trigger.amountAgorot,
          }
        : r.trigger,
    appliesToAll: r.appliesToAll,
    printTypeKeys: r.printTypeIds
      .map((id) => printTypeKeyById.get(id))
      .filter((key): key is string => key !== undefined),
    sortOrder: r.sortOrder,
    active: r.active,
  }));

  const tiersLite: TierLite[] = tiers.map((t) => ({
    id: t._id,
    minQty: t.minQty,
    discountBp: t.discountBp,
    labelHe: t.labelHe,
    active: t.active,
  }));

  return {
    version: row.version,
    config: knobsFrom(row),
    printTypes: printTypesLite,
    materials: materialsLite,
    colors: colorsLite,
    rules: rulesLite,
    tiers: tiersLite,
  };
}

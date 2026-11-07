/**
 * convex/pricing.ts — the public price surface.
 *
 * RESOLUTIONS §A: convex/lib/priceEngine.ts is the ONLY pricing engine. Nothing here
 * computes money; it loads the live config and calls computePrice.
 *
 * RESOLUTIONS: "Pricing is computed SERVER-SIDE. A client-supplied price is never
 * trusted or stored." `quote` below is therefore the single source of truth for every
 * number the visitor sees, and the generator calls it on every change rather than
 * mirroring the formula in the browser.
 *
 * `publicConfig` deliberately does NOT return the cost knobs (filament cost per gram,
 * machine rate, margin multiplier, waste). Those are Shai's margin, not the customer's
 * business, and shipping them to the browser would publish his cost structure.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { priceBreakdown } from "./schema";
import { loadPriceEngineConfig } from "./lib/pricingConfig";
import { computePrice, fromPrice, PriceInputError } from "./lib/priceEngine";

/** What the generator needs to render its choices. No cost knobs. */
export const publicConfig = query({
  args: {},
  handler: async (ctx) => {
    const cfg = await loadPriceEngineConfig(ctx, "live");
    const k = cfg.config;

    return {
      printTypes: cfg.printTypes.map((pt) => ({
        key: pt.key,
        maxColors: pt.maxColors,
        forcedFinish: pt.forcedFinish ?? null,
        allowedMaterialKeys: pt.allowedMaterialKeys ?? null,
        // the "from" chip. RESOLUTIONS §8: this is the engine's real answer on the
        // cheapest configuration, never printTypes.basePrice, which is the fixed term
        // inside the formula and understated the lithophane by 60 ש״ח.
        fromAgorot: fromPrice(pt.key, cfg)?.agorot ?? null,
        sizes: pt.sizes
          .filter((s) => s.active)
          .map((s) => ({ key: s.key, labelHe: s.labelHe, longestEdgeMm: s.longestEdgeMm ?? null })),
      })),
      materials: cfg.materials.map((m) => ({ key: m.key, nameHe: m.nameHe, finish: m.finish ?? null })),
      colors: cfg.colors.map((c) => ({ id: c.id, nameHe: c.nameHe, finish: c.finish })),
      quantityTiers: cfg.tiers.map((t) => ({ minQty: t.minQty, discountBp: t.discountBp })),
      addonRules: cfg.rules.map((r) => ({ id: r.id, labelHe: r.labelHe, hintHe: r.hintHe ?? null })),
      rules: {
        freeColorCount: k.freeColorCount,
        maxQuantity: k.maxQuantity,
        leadTimeDays: k.leadTimeDays,
        pickupEnabled: k.pickupEnabled,
        rushEnabled: k.rushEnabled,
        shippingFlatAgorot: k.shippingFlatAgorot,
        freeShippingThresholdAgorot: k.freeShippingThresholdAgorot,
        minOrderAgorot: k.minOrderAgorot,
      },
      version: cfg.version,
    };
  },
});

/**
 * The authoritative quote. The generator calls this on every change; the number it
 * returns is the number shown, stored on the draft, and interpolated into WhatsApp.
 *
 * A bad configuration returns { ok: false } with the engine's Hebrew message rather
 * than throwing, so a mid-typing state does not blank the price panel.
 */
export const quote = query({
  args: {
    printTypeKey: v.string(),
    materialKey: v.string(),
    sizeKey: v.string(),
    colorIds: v.array(v.string()),
    quantity: v.number(),
    addonRuleIds: v.optional(v.array(v.string())),
    rush: v.optional(v.boolean()),
    deliveryMethod: v.union(v.literal("pickup"), v.literal("shipping")),
    requestedInDays: v.optional(v.number()),
    measuredGrams: v.optional(v.number()),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), breakdown: priceBreakdown }),
    v.object({ ok: v.literal(false), field: v.string(), messageHe: v.string() }),
  ),
  handler: async (ctx, args) => {
    const cfg = await loadPriceEngineConfig(ctx, "live");
    try {
      const breakdown = computePrice(
        {
          printTypeKey: args.printTypeKey,
          materialKey: args.materialKey,
          sizeKey: args.sizeKey,
          colorIds: args.colorIds,
          quantity: args.quantity,
          addonRuleIds: args.addonRuleIds ?? [],
          rush: args.rush ?? false, // RESOLUTIONS §7: opt in only, never inferred
          deliveryMethod: args.deliveryMethod,
          requestedInDays: args.requestedInDays,
          measuredGrams: args.measuredGrams,
        },
        cfg,
      );
      return { ok: true as const, breakdown };
    } catch (err) {
      if (err instanceof PriceInputError) {
        return { ok: false as const, field: err.field, messageHe: err.message };
      }
      throw err;
    }
  },
});

/** The seven "starting from" chips for the print-type step, in one round trip. */
export const fromPrices = query({
  args: {},
  handler: async (ctx) => {
    const cfg = await loadPriceEngineConfig(ctx, "live");
    return cfg.printTypes.map((pt) => ({
      key: pt.key,
      fromAgorot: fromPrice(pt.key, cfg)?.agorot ?? null,
    }));
  },
});

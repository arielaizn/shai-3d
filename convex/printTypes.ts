/**
 * The seven ways a photo becomes an object. Step 1 of the generator, and the
 * first thing a visitor from Instagram sees (RESOLUTIONS §1).
 *
 * `key` is locked to seven values (RESOLUTIONS §6) because the tile artwork
 * resolves as `/assets/print-types/${key}.webp` with no lookup table.
 * `fromPriceIls` is written here by running the real engine (RESOLUTIONS §8);
 * `basePriceAgorot` is the constant term inside the formula and is never a price.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { logActivity, requireAdmin, sortBetween } from "./lib/auth";
import { loadPriceEngineConfig } from "./lib/pricingConfig";
import { agorotToIls, fromPrice } from "./lib/priceEngine";
import { accent, finishKey, printTypeKey, sizeOption } from "./schema";

const previewGeometry = v.union(
  v.literal("plane"),
  v.literal("cylinder"),
  v.literal("keychain"),
  v.literal("magnet"),
  v.literal("framed"),
  v.literal("standee"),
);

const geometryBlock = v.object({
  kernel: v.union(
    v.literal("panel"),
    v.literal("panelHole"),
    v.literal("panelFrame"),
    v.literal("panelStand"),
    v.literal("panelPocket"),
    v.literal("panelFrameStand"),
  ),
  gridLong: v.number(),
  invertLuminance: v.boolean(),
  backlit: v.boolean(),
  quantizeToLayer: v.boolean(),
  thicknessMinMm: v.number(),
  thicknessMaxMm: v.number(),
  backPlateMm: v.number(),
  borderMm: v.number(),
  maxLongEdgeMm: v.number(),
  defaultFinish: v.union(v.literal("matte"), v.literal("silk"), v.literal("glow")),
  ringHoleMm: v.optional(v.number()),
  ringBossMm: v.optional(v.number()),
  magnetPocketMm: v.optional(v.object({ dia: v.number(), depth: v.number() })),
  frameWidthMm: v.optional(v.number()),
  frameDepthMm: v.optional(v.number()),
  standAngleDeg: v.optional(v.number()),
  standThicknessMm: v.optional(v.number()),
});

/**
 * The public shape. Built field by field rather than spread, because the row
 * also carries the cost model (`refGrams`, `refHours`, `complexity`) and Shai's
 * margin is nobody's business but his.
 */
async function toPublic(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  doc: Doc<"printTypes">,
) {
  return {
    _id: doc._id,
    key: doc.key,
    nameHe: doc.nameHe,
    shortHe: doc.shortHe,
    descriptionHe: doc.descriptionHe,
    /* RESOLUTIONS §8. The card reads this, never basePriceAgorot */
    fromPriceIls: doc.fromPriceIls,
    sizes: doc.sizes
      .filter((size) => size.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((size) => ({
        key: size.key,
        labelHe: size.labelHe,
        widthMm: size.widthMm,
        heightMm: size.heightMm,
        depthMm: size.depthMm,
        multiplier: size.multiplier,
        longestEdgeMm: size.longestEdgeMm,
      })),
    maxColors: doc.maxColors,
    requiresPhoto: doc.requiresPhoto,
    allowedMaterialIds: doc.allowedMaterialIds,
    previewGeometry: doc.previewGeometry,
    displacementScale: doc.displacementScale,
    invertHeight: doc.invertHeight,
    planeSegments: doc.planeSegments,
    backlitPreview: doc.backlitPreview,
    geometry: doc.geometry,
    accent: doc.accent,
    sortOrder: doc.sortOrder,
    iconImageUrl: doc.iconImageId ? await ctx.storage.getUrl(doc.iconImageId) : null,
    sampleImageUrl: doc.sampleImageId ? await ctx.storage.getUrl(doc.sampleImageId) : null,
  };
}

/* ------------------------------------------------------------------ */
/* public                                                               */
/* ------------------------------------------------------------------ */

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("printTypes")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    const live = rows
      .filter((r) => r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return await Promise.all(live.map((row) => toPublic(ctx, row)));
  },
});

export const getByKey = query({
  args: { key: printTypeKey },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("printTypes")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!row || row.deletedAt !== undefined || !row.active) return null;
    return await toPublic(ctx, row);
  },
});

/* ------------------------------------------------------------------ */
/* admin                                                                */
/* ------------------------------------------------------------------ */

export const listAdmin = query({
  args: { includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, { includeDeleted }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("printTypes").collect();
    return rows
      .filter((r) => includeDeleted === true || r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    key: printTypeKey,
    nameHe: v.string(),
    shortHe: v.string(),
    descriptionHe: v.string(),
    basePriceAgorot: v.number(),
    sizes: v.array(sizeOption),
    maxColors: v.number(),
    requiresPhoto: v.boolean(),
    allowedMaterialIds: v.array(v.id("materials")),
    refGrams: v.number(),
    refHours: v.number(),
    complexity: v.number(),
    volumeExponent: v.number(),
    forcedFinish: v.optional(finishKey),
    previewGeometry,
    displacementScale: v.number(),
    invertHeight: v.boolean(),
    planeSegments: v.number(),
    backlitPreview: v.boolean(),
    geometry: v.optional(geometryBlock),
    accent,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const clash = await ctx.db
      .query("printTypes")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (clash) {
      throw new ConvexError({ code: "KEY_TAKEN", he: "הסוג הזה כבר קיים" });
    }
    const last = (await ctx.db.query("printTypes").collect())
      .map((r) => r.sortOrder)
      .sort((a, b) => a - b)
      .pop();
    const now = Date.now();
    const id = await ctx.db.insert("printTypes", {
      ...args,
      fromPriceIls: 0, // written by recomputeFromPrices, never typed in by hand
      sortOrder: sortBetween(last, undefined),
      active: false,   // a type with no price and no photo is not shown yet
      createdAt: now,
      updatedAt: now,
      updatedBy: admin._id,
    });
    await logActivity(ctx, admin, {
      action: "printTypes.create",
      tableName: "printTypes",
      docId: id,
      summaryHe: `הוסיף סוג הדפסה ${args.nameHe}`,
      after: args,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("printTypes"),
    patch: v.object({
      nameHe: v.optional(v.string()),
      shortHe: v.optional(v.string()),
      descriptionHe: v.optional(v.string()),
      basePriceAgorot: v.optional(v.number()),
      maxColors: v.optional(v.number()),
      requiresPhoto: v.optional(v.boolean()),
      allowedMaterialIds: v.optional(v.array(v.id("materials"))),
      refGrams: v.optional(v.number()),
      refHours: v.optional(v.number()),
      complexity: v.optional(v.number()),
      volumeExponent: v.optional(v.number()),
      forcedFinish: v.optional(finishKey),
      previewGeometry: v.optional(previewGeometry),
      displacementScale: v.optional(v.number()),
      invertHeight: v.optional(v.boolean()),
      planeSegments: v.optional(v.number()),
      backlitPreview: v.optional(v.boolean()),
      geometry: v.optional(geometryBlock),
      iconImageId: v.optional(v.id("_storage")),
      sampleImageId: v.optional(v.id("_storage")),
      accent: v.optional(accent),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    const admin = await requireAdmin(ctx);
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את סוג ההדפסה" });
    if (patch.basePriceAgorot !== undefined && patch.basePriceAgorot < 0) {
      throw new ConvexError({ code: "BAD_PRICE", he: "המספר חייב להיות גדול מאפס" });
    }
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now(), updatedBy: admin._id });
    await logActivity(ctx, admin, {
      action: "printTypes.update",
      tableName: "printTypes",
      docId: id,
      summaryHe: `עדכן את ${before.nameHe}`,
      before,
      after: patch,
    });
    return null;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("printTypes"),
    beforeId: v.optional(v.id("printTypes")),
    afterId: v.optional(v.id("printTypes")),
  },
  handler: async (ctx, { id, beforeId, afterId }) => {
    const admin = await requireAdmin(ctx);
    const before = beforeId ? await ctx.db.get(beforeId) : null;
    const after = afterId ? await ctx.db.get(afterId) : null;
    await ctx.db.patch(id, {
      sortOrder: sortBetween(before?.sortOrder, after?.sortOrder),
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    return null;
  },
});

export const setActive = mutation({
  args: { id: v.id("printTypes"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את סוג ההדפסה" });
    if (active && row.sizes.filter((s) => s.active).length === 0) {
      throw new ConvexError({ code: "NO_SIZE", he: "צריך לפחות גודל אחד פעיל" });
    }
    if (active && row.allowedMaterialIds.length === 0) {
      throw new ConvexError({ code: "NO_MATERIAL", he: "צריך לבחור לפחות חומר אחד" });
    }
    await ctx.db.patch(id, { active, updatedAt: Date.now(), updatedBy: admin._id });
    await logActivity(ctx, admin, {
      action: "printTypes.setActive",
      tableName: "printTypes",
      docId: id,
      summaryHe: active ? `הציג את ${row.nameHe}` : `הסתיר את ${row.nameHe}`,
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("printTypes") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את סוג ההדפסה" });
    await ctx.db.patch(id, {
      deletedAt: Date.now(),
      active: false,
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    await logActivity(ctx, admin, {
      action: "printTypes.softDelete",
      tableName: "printTypes",
      docId: id,
      summaryHe: `העביר לפח את ${row.nameHe}`,
    });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("printTypes") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    await logActivity(ctx, admin, {
      action: "printTypes.restore",
      tableName: "printTypes",
      docId: id,
      summaryHe: "שחזר סוג הדפסה מהפח",
    });
    return null;
  },
});

/* ---- sizes live inside the document, so one edit rewrites one row ---- */

export const upsertSize = mutation({
  args: { printTypeId: v.id("printTypes"), size: sizeOption },
  handler: async (ctx, { printTypeId, size }) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(printTypeId);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את סוג ההדפסה" });
    if (size.multiplier <= 0) {
      throw new ConvexError({ code: "BAD_SIZE", he: "המספר חייב להיות גדול מאפס" });
    }
    const sizes = row.sizes.some((s) => s.key === size.key)
      ? row.sizes.map((s) => (s.key === size.key ? size : s))
      : [...row.sizes, size];
    await ctx.db.patch(printTypeId, {
      sizes: sizes.sort((a, b) => a.sortOrder - b.sortOrder),
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    return null;
  },
});

export const removeSize = mutation({
  args: { printTypeId: v.id("printTypes"), key: v.string() },
  handler: async (ctx, { printTypeId, key }) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(printTypeId);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את סוג ההדפסה" });
    const sizes = row.sizes.filter((s) => s.key !== key);
    if (row.active && sizes.filter((s) => s.active).length === 0) {
      throw new ConvexError({ code: "NO_SIZE", he: "צריך לפחות גודל אחד פעיל" });
    }
    await ctx.db.patch(printTypeId, {
      sizes,
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    return null;
  },
});

export const reorderSizes = mutation({
  args: { printTypeId: v.id("printTypes"), keys: v.array(v.string()) },
  handler: async (ctx, { printTypeId, keys }) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(printTypeId);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את סוג ההדפסה" });
    const sizes = row.sizes
      .map((s) => {
        const index = keys.indexOf(s.key);
        return { ...s, sortOrder: index === -1 ? s.sortOrder : (index + 1) * 100 };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
    await ctx.db.patch(printTypeId, {
      sizes,
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* the `מתחיל מ-{n} ש״ח` chip                                            */
/* ------------------------------------------------------------------ */

/**
 * RESOLUTIONS §8. Runs the real engine on each type's cheapest active
 * configuration and stores the answer. Called after any pricing publish and
 * after any print type edit, never by a browser.
 */
async function recompute(ctx: MutationCtx): Promise<number> {
  const cfg = await loadPriceEngineConfig(ctx, "live");
  const rows = await ctx.db.query("printTypes").collect();
  let written = 0;
  for (const row of rows) {
    if (row.deletedAt !== undefined || !row.active) continue;
    const result = fromPrice(row.key, cfg);
    const ils = result ? result.ils : agorotToIls(row.basePriceAgorot);
    if (row.fromPriceIls !== ils) {
      await ctx.db.patch(row._id, { fromPriceIls: ils, updatedAt: Date.now() });
      written += 1;
    }
  }
  return written;
}

export const recomputeFromPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const written = await recompute(ctx);
    await logActivity(ctx, admin, {
      action: "printTypes.recomputeFromPrices",
      tableName: "printTypes",
      summaryHe: `חישב מחדש את המחיר ההתחלתי ל-${written} סוגים`,
    });
    return { written };
  },
});

export const recomputeFromPricesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return { written: await recompute(ctx) };
  },
});

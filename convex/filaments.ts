/**
 * Filament colours. The table is `filamentColors` (06 owns the name); this module
 * is `filaments` because that is what everyone calls them.
 *
 * These are INVENTORY, not brand. Shai buys a spool and a colour exists; the
 * spool runs out and it goes off the grid the same evening. Nothing here is
 * hardcoded in the source tree, because a restock is not a deploy.
 *
 * An out-of-stock colour stays visible with a strike and the label `אזל`, since
 * hiding it makes the palette look smaller than it is (06 §A.4).
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity, requireAdmin, sortBetween } from "./lib/auth";
import { finishKey, stock } from "./schema";

const HEX = /^#[0-9A-Fa-f]{6}$/;

function assertHex(hex: string) {
  if (!HEX.test(hex)) {
    throw new ConvexError({
      code: "BAD_HEX",
      he: "צבע לא תקין. צריך להיראות כך: #F5333F",
    });
  }
}

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("filamentColors")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    return rows
      .filter((r) => r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({
        _id: r._id,
        nameHe: r.nameHe,
        hex: r.hex,
        familyHe: r.familyHe,
        finish: r.finish,
        isMetallic: r.isMetallic,
        isGlow: r.isGlow,
        isTranslucent: r.isTranslucent,
        emissiveHex: r.emissiveHex,
        roughness: r.roughness,
        metalness: r.metalness,
        clearcoat: r.clearcoat,
        transmission: r.transmission,
        extraCostAgorot: r.extraCostAgorot,
        stock: r.stock,
        sortOrder: r.sortOrder,
      }));
  },
});

export const listAdmin = query({
  args: { includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, { includeDeleted }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("filamentColors").collect();
    return rows
      .filter((r) => includeDeleted === true || r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    nameHe: v.string(),
    hex: v.string(),
    familyHe: v.string(),
    finish: finishKey,
    isMetallic: v.boolean(),
    isGlow: v.boolean(),
    isTranslucent: v.boolean(),
    emissiveHex: v.optional(v.string()),
    roughness: v.optional(v.number()),
    metalness: v.optional(v.number()),
    clearcoat: v.optional(v.number()),
    transmission: v.optional(v.number()),
    extraCostAgorot: v.number(),
    stock,
    spoolNoteHe: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    assertHex(args.hex);
    if (args.emissiveHex) assertHex(args.emissiveHex);
    const last = (await ctx.db.query("filamentColors").collect())
      .map((r) => r.sortOrder)
      .sort((a, b) => a - b)
      .pop();
    const now = Date.now();
    const id = await ctx.db.insert("filamentColors", {
      ...args,
      sortOrder: sortBetween(last, undefined),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, admin, {
      action: "filaments.create",
      tableName: "filamentColors",
      docId: id,
      summaryHe: `הוסיף צבע ${args.nameHe}`,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("filamentColors"),
    patch: v.object({
      nameHe: v.optional(v.string()),
      hex: v.optional(v.string()),
      familyHe: v.optional(v.string()),
      finish: v.optional(finishKey),
      isMetallic: v.optional(v.boolean()),
      isGlow: v.optional(v.boolean()),
      isTranslucent: v.optional(v.boolean()),
      emissiveHex: v.optional(v.string()),
      roughness: v.optional(v.number()),
      metalness: v.optional(v.number()),
      clearcoat: v.optional(v.number()),
      transmission: v.optional(v.number()),
      extraCostAgorot: v.optional(v.number()),
      swatchImageId: v.optional(v.id("_storage")),
      spoolNoteHe: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    const admin = await requireAdmin(ctx);
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את הצבע" });
    if (patch.hex) assertHex(patch.hex);
    if (patch.emissiveHex) assertHex(patch.emissiveHex);
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    await logActivity(ctx, admin, {
      action: "filaments.update",
      tableName: "filamentColors",
      docId: id,
      summaryHe: `עדכן את ${before.nameHe}`,
      before,
      after: patch,
    });
    return null;
  },
});

/** Bulk friendly on purpose: he taps these fast, standing next to the printer. */
export const setStock = mutation({
  args: { id: v.id("filamentColors"), stock },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { stock: args.stock, updatedAt: Date.now() });
    return null;
  },
});

export const setActive = mutation({
  args: { id: v.id("filamentColors"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { active, updatedAt: Date.now() });
    return null;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("filamentColors"),
    beforeId: v.optional(v.id("filamentColors")),
    afterId: v.optional(v.id("filamentColors")),
  },
  handler: async (ctx, { id, beforeId, afterId }) => {
    await requireAdmin(ctx);
    const before = beforeId ? await ctx.db.get(beforeId) : null;
    const after = afterId ? await ctx.db.get(afterId) : null;
    await ctx.db.patch(id, {
      sortOrder: sortBetween(before?.sortOrder, after?.sortOrder),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("filamentColors") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את הצבע" });
    await ctx.db.patch(id, { deletedAt: Date.now(), active: false, updatedAt: Date.now() });
    await logActivity(ctx, admin, {
      action: "filaments.softDelete",
      tableName: "filamentColors",
      docId: id,
      summaryHe: `העביר לפח את ${row.nameHe}`,
    });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("filamentColors") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { deletedAt: undefined, updatedAt: Date.now() });
    return null;
  },
});

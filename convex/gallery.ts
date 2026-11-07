/**
 * The gallery of things Shai actually printed.
 *
 * A customer photo can only enter through a lead whose `photoShareConsent` is
 * true. That check lives in the mutation and not in the admin UI, because the UI
 * is a convenience and the mutation is the rule.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { accent } from "./schema";
import { logActivity, requireAdmin, sortBetween } from "./lib/auth";

async function withImage(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  doc: Doc<"galleryItems">,
) {
  return { ...doc, imageUrl: await ctx.storage.getUrl(doc.imageId) };
}

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("galleryItems")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    const live = rows
      .filter((r) => r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, limit ?? 60);
    return await Promise.all(live.map((row) => withImage(ctx, row)));
  },
});

export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("galleryItems")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    const live = rows
      .filter((r) => r.deletedAt === undefined && r.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, limit ?? 12);
    return await Promise.all(live.map((row) => withImage(ctx, row)));
  },
});

export const listAll = query({
  args: { includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, { includeDeleted }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("galleryItems").collect();
    const visible = rows
      .filter((r) => includeDeleted === true || r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return await Promise.all(visible.map((row) => withImage(ctx, row)));
  },
});

export const create = mutation({
  args: {
    titleHe: v.string(),
    captionHe: v.optional(v.string()),
    imageId: v.id("_storage"),
    imageAltHe: v.string(),
    width: v.number(),
    height: v.number(),
    blurDataUrl: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    tagsHe: v.optional(v.array(v.string())),
    accent,
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!args.imageAltHe.trim()) {
      throw new ConvexError({
        code: "ALT_REQUIRED",
        he: "צריך לכתוב מה רואים בתמונה. זה מה שקורא המסך יקריא",
      });
    }
    const last = (await ctx.db.query("galleryItems").collect())
      .map((r) => r.sortOrder)
      .sort((a, b) => a - b)
      .pop();
    const now = Date.now();
    const id = await ctx.db.insert("galleryItems", {
      titleHe: args.titleHe,
      captionHe: args.captionHe,
      imageId: args.imageId,
      imageAltHe: args.imageAltHe,
      width: args.width,
      height: args.height,
      blurDataUrl: args.blurDataUrl,
      productId: args.productId,
      tagsHe: args.tagsHe ?? [],
      accent: args.accent,
      featured: args.featured ?? false,
      sortOrder: sortBetween(last, undefined),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, admin, {
      action: "gallery.create",
      tableName: "galleryItems",
      docId: id,
      summaryHe: `הוסיף לגלריה את ${args.titleHe}`,
    });
    return id;
  },
});

/**
 * The only path from a customer's photo to the public gallery. Refuses without
 * consent, and copies the file id rather than moving it, so deleting the lead's
 * photo later does not blank a published gallery tile.
 */
export const createFromLead = mutation({
  args: {
    leadId: v.id("leads"),
    titleHe: v.string(),
    captionHe: v.optional(v.string()),
    imageAltHe: v.string(),
    width: v.number(),
    height: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את הפנייה" });
    if (!lead.photoShareConsent) {
      throw new ConvexError({ code: "NO_CONSENT", he: "הלקוח לא אישר להציג את התמונה" });
    }
    const imageId = lead.previewSnapshotId ?? lead.photoId;
    if (!imageId) {
      throw new ConvexError({ code: "NO_IMAGE", he: "אין תמונה בפנייה הזאת" });
    }
    const last = (await ctx.db.query("galleryItems").collect())
      .map((r) => r.sortOrder)
      .sort((a, b) => a - b)
      .pop();
    const now = Date.now();
    const id = await ctx.db.insert("galleryItems", {
      titleHe: args.titleHe,
      captionHe: args.captionHe,
      imageId,
      imageAltHe: args.imageAltHe,
      width: args.width,
      height: args.height,
      sourceLeadId: args.leadId,
      tagsHe: [],
      accent: "none",
      featured: false,
      sortOrder: sortBetween(last, undefined),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, admin, {
      action: "gallery.createFromLead",
      tableName: "galleryItems",
      docId: id,
      summaryHe: `העלה לגלריה תמונה מפנייה ${lead.publicCode}`,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("galleryItems"),
    patch: v.object({
      titleHe: v.optional(v.string()),
      captionHe: v.optional(v.string()),
      imageAltHe: v.optional(v.string()),
      productId: v.optional(v.id("products")),
      tagsHe: v.optional(v.array(v.string())),
      accent: v.optional(accent),
      featured: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("galleryItems"),
    beforeId: v.optional(v.id("galleryItems")),
    afterId: v.optional(v.id("galleryItems")),
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

export const setActive = mutation({
  args: { id: v.id("galleryItems"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { active, updatedAt: Date.now() });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("galleryItems") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { deletedAt: Date.now(), active: false, updatedAt: Date.now() });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("galleryItems") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { deletedAt: undefined, updatedAt: Date.now() });
    return null;
  },
});

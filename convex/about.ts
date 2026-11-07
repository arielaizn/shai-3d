/**
 * The story page. Shai's own words, first person, approved by him and his
 * parents before it goes up (DECISIONS). Sections are ordered blocks rather than
 * one long field, so a paragraph can be moved without retyping the page.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { accent } from "./schema";
import { logActivity, requireAdmin, sortBetween } from "./lib/auth";

const aboutKind = v.union(
  v.literal("opener"),
  v.literal("paragraph"),
  v.literal("pullQuote"),
  v.literal("timelineItem"),
  v.literal("imageFull"),
  v.literal("twoUp"),
  v.literal("statement"),
);

async function withImage(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  doc: Doc<"aboutSections">,
) {
  return { ...doc, imageUrl: doc.imageId ? await ctx.storage.getUrl(doc.imageId) : null };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("aboutSections")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    const live = rows
      .filter((r) => r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return await Promise.all(live.map((row) => withImage(ctx, row)));
  },
});

export const listAll = query({
  args: { includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, { includeDeleted }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("aboutSections").collect();
    const visible = rows
      .filter((r) => includeDeleted === true || r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return await Promise.all(visible.map((row) => withImage(ctx, row)));
  },
});

export const create = mutation({
  args: {
    kind: aboutKind,
    headingHe: v.optional(v.string()),
    bodyHe: v.optional(v.string()),
    quoteHe: v.optional(v.string()),
    labelHe: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    imageAltHe: v.optional(v.string()),
    accent,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.imageId && !args.imageAltHe) {
      throw new ConvexError({
        code: "ALT_REQUIRED",
        he: "צריך לכתוב מה רואים בתמונה. זה מה שקורא המסך יקריא",
      });
    }
    const last = (await ctx.db.query("aboutSections").collect())
      .map((r) => r.sortOrder)
      .sort((a, b) => a - b)
      .pop();
    const now = Date.now();
    const id = await ctx.db.insert("aboutSections", {
      ...args,
      sortOrder: sortBetween(last, undefined),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, admin, {
      action: "about.create",
      tableName: "aboutSections",
      docId: id,
      summaryHe: "הוסיף פסקה לעמוד הסיפור",
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("aboutSections"),
    patch: v.object({
      kind: v.optional(aboutKind),
      headingHe: v.optional(v.string()),
      bodyHe: v.optional(v.string()),
      quoteHe: v.optional(v.string()),
      labelHe: v.optional(v.string()),
      imageId: v.optional(v.id("_storage")),
      imageAltHe: v.optional(v.string()),
      accent: v.optional(accent),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    const admin = await requireAdmin(ctx);
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את הפסקה" });
    const imageId = patch.imageId ?? before.imageId;
    const altHe = patch.imageAltHe ?? before.imageAltHe;
    if (imageId && !altHe) {
      throw new ConvexError({
        code: "ALT_REQUIRED",
        he: "צריך לכתוב מה רואים בתמונה. זה מה שקורא המסך יקריא",
      });
    }
    await ctx.db.patch(id, { ...patch, updatedAt: Date.now() });
    await logActivity(ctx, admin, {
      action: "about.update",
      tableName: "aboutSections",
      docId: id,
      summaryHe: "עדכן פסקה בעמוד הסיפור",
      before,
      after: patch,
    });
    return null;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("aboutSections"),
    beforeId: v.optional(v.id("aboutSections")),
    afterId: v.optional(v.id("aboutSections")),
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
  args: { id: v.id("aboutSections"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { active, updatedAt: Date.now() });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("aboutSections") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { deletedAt: Date.now(), active: false, updatedAt: Date.now() });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("aboutSections") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { deletedAt: undefined, updatedAt: Date.now() });
    return null;
  },
});

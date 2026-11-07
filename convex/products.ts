/**
 * The catalogue. Public queries return built objects with storage URLs already
 * resolved, so no `storageId` ever reaches a browser and `next/image` always
 * gets a real https URL.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { accent } from "./schema";
import { logActivity, requireAdmin, requireOwner, sortBetween, tryRateLimit } from "./lib/auth";

const HOUR = 60 * 60 * 1000;

const priceMode = v.union(v.literal("fixed"), v.literal("from"), v.literal("quote"));

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function heroUrl(ctx: QueryCtx | MutationCtx, product: Doc<"products">) {
  if (product.heroImageId) return await ctx.storage.getUrl(product.heroImageId);
  const image = await ctx.db
    .query("productImages")
    .withIndex("by_product_sort", (q) => q.eq("productId", product._id))
    .first();
  return image ? await ctx.storage.getUrl(image.storageId) : null;
}

async function toCard(ctx: QueryCtx | MutationCtx, product: Doc<"products">) {
  return {
    _id: product._id,
    slug: product.slug,
    titleHe: product.titleHe,
    subtitleHe: product.subtitleHe,
    priceMode: product.priceMode,
    priceAgorot: product.priceAgorot,
    badgeHe: product.badgeHe,
    badgeAccent: product.badgeAccent,
    accent: product.accent,
    leadTimeDaysMin: product.leadTimeDaysMin,
    leadTimeDaysMax: product.leadTimeDaysMax,
    heroImageUrl: await heroUrl(ctx, product),
    featured: product.featured,
    sortOrder: product.sortOrder,
  };
}

/* ------------------------------------------------------------------ */
/* public                                                               */
/* ------------------------------------------------------------------ */

export const list = query({
  args: { categorySlug: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { categorySlug, limit }) => {
    const rows = await ctx.db
      .query("products")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    let live = rows.filter((r) => r.deletedAt === undefined);

    if (categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
        .unique();
      if (!category) return [];
      live = live.filter((r) => r.categoryId === category._id);
    }

    live = live.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit ?? 60);
    return await Promise.all(live.map((row) => toCard(ctx, row)));
  },
});

export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    const live = rows
      .filter((r) => r.deletedAt === undefined && r.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, limit ?? 6);
    return await Promise.all(live.map((row) => toCard(ctx, row)));
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!product || product.deletedAt !== undefined || !product.active) return null;

    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product_sort", (q) => q.eq("productId", product._id))
      .collect();
    const models = await ctx.db
      .query("productModels")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect();
    const printType = product.printTypeId ? await ctx.db.get(product.printTypeId) : null;

    return {
      _id: product._id,
      slug: product.slug,
      titleHe: product.titleHe,
      subtitleHe: product.subtitleHe,
      descriptionHe: product.descriptionHe,
      priceMode: product.priceMode,
      priceAgorot: product.priceAgorot,
      sizeNoteHe: product.sizeNoteHe,
      leadTimeDaysMin: product.leadTimeDaysMin,
      leadTimeDaysMax: product.leadTimeDaysMax,
      badgeHe: product.badgeHe,
      badgeAccent: product.badgeAccent,
      accent: product.accent,
      seoTitleHe: product.seoTitleHe,
      seoDescriptionHe: product.seoDescriptionHe,
      ogImageUrl: product.ogImageId ? await ctx.storage.getUrl(product.ogImageId) : null,
      printTypeKey: printType && printType.deletedAt === undefined ? printType.key : null,
      images: await Promise.all(
        images
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(async (image) => ({
            _id: image._id,
            url: await ctx.storage.getUrl(image.storageId),
            altHe: image.altHe,
            width: image.width,
            height: image.height,
            blurDataUrl: image.blurDataUrl,
            isHero: image.isHero,
          })),
      ),
      models: await Promise.all(
        models
          .filter((model) => model.active)
          .map(async (model) => ({
            _id: model._id,
            url: await ctx.storage.getUrl(model.storageId),
            filename: model.filename,
            sizeBytes: model.sizeBytes,
            triangleCount: model.triangleCount,
            boundingBoxMm: model.boundingBoxMm,
            cameraPreset: model.cameraPreset,
            autoRotate: model.autoRotate,
            defaultColorId: model.defaultColorId,
          })),
      ),
    };
  },
});

/**
 * One counter per slug per session per hour, so a reload loop cannot inflate the
 * only number Shai uses to decide what to print next.
 */
export const trackView = mutation({
  args: { slug: v.string(), sessionKey: v.optional(v.string()) },
  handler: async (ctx, { slug, sessionKey }) => {
    const fresh = await tryRateLimit(
      ctx,
      `products.view:${slug}`,
      sessionKey ?? "anonymous",
      1,
      HOUR,
    );
    if (!fresh) return null;
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!product || product.deletedAt !== undefined) return null;
    await ctx.db.patch(product._id, { viewCount: product.viewCount + 1 });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* admin                                                                */
/* ------------------------------------------------------------------ */

export const listAdmin = query({
  args: { includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, { includeDeleted }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("products").collect();
    return rows
      .filter((r) => includeDeleted === true || r.deletedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) return null;
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_product_sort", (q) => q.eq("productId", id))
      .collect();
    const models = await ctx.db
      .query("productModels")
      .withIndex("by_product", (q) => q.eq("productId", id))
      .collect();
    return {
      product,
      images: await Promise.all(
        images
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(async (image) => ({ ...image, url: await ctx.storage.getUrl(image.storageId) })),
      ),
      models: await Promise.all(
        models.map(async (model) => ({
          ...model,
          url: await ctx.storage.getUrl(model.storageId),
        })),
      ),
    };
  },
});

async function assertSlugFree(ctx: MutationCtx, slug: string, ignore?: Id<"products">) {
  const clash = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (clash && clash._id !== ignore) {
    throw new ConvexError({ code: "SLUG_TAKEN", he: "הכתובת הזאת כבר תפוסה" });
  }
}

export const create = mutation({
  args: {
    titleHe: v.string(),
    slug: v.optional(v.string()),
    subtitleHe: v.optional(v.string()),
    descriptionHe: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    printTypeId: v.optional(v.id("printTypes")),
    priceMode: v.optional(priceMode),
    priceAgorot: v.optional(v.number()),
    accent: v.optional(accent),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const slug = slugify(args.slug ?? args.titleHe);
    if (!slug) throw new ConvexError({ code: "BAD_SLUG", he: "רק אותיות באנגלית, מספרים ומקפים" });
    await assertSlugFree(ctx, slug);

    const last = (await ctx.db.query("products").collect())
      .map((r) => r.sortOrder)
      .sort((a, b) => a - b)
      .pop();
    const now = Date.now();
    const id = await ctx.db.insert("products", {
      slug,
      titleHe: args.titleHe,
      subtitleHe: args.subtitleHe,
      descriptionHe: args.descriptionHe ?? "",
      categoryId: args.categoryId,
      printTypeId: args.printTypeId,
      priceMode: args.priceMode ?? "from",
      priceAgorot: args.priceAgorot ?? 0,
      leadTimeDaysMin: 3,
      leadTimeDaysMax: 3,
      badgeAccent: "none",
      accent: args.accent ?? "none",
      featured: false,
      sortOrder: sortBetween(last, undefined),
      active: false,
      viewCount: 0,
      whatsappClickCount: 0,
      createdAt: now,
      updatedAt: now,
      updatedBy: admin._id,
    });
    await logActivity(ctx, admin, {
      action: "products.create",
      tableName: "products",
      docId: id,
      summaryHe: `הוסיף מוצר ${args.titleHe}`,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    patch: v.object({
      slug: v.optional(v.string()),
      titleHe: v.optional(v.string()),
      subtitleHe: v.optional(v.string()),
      descriptionHe: v.optional(v.string()),
      categoryId: v.optional(v.id("categories")),
      printTypeId: v.optional(v.id("printTypes")),
      priceMode: v.optional(priceMode),
      priceAgorot: v.optional(v.number()),
      sizeNoteHe: v.optional(v.string()),
      leadTimeDaysMin: v.optional(v.number()),
      leadTimeDaysMax: v.optional(v.number()),
      badgeHe: v.optional(v.string()),
      badgeAccent: v.optional(accent),
      accent: v.optional(accent),
      featured: v.optional(v.boolean()),
      seoTitleHe: v.optional(v.string()),
      seoDescriptionHe: v.optional(v.string()),
      ogImageId: v.optional(v.id("_storage")),
    }),
  },
  handler: async (ctx, { id, patch }) => {
    const admin = await requireAdmin(ctx);
    const before = await ctx.db.get(id);
    if (!before) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את המוצר" });

    const next = { ...patch };
    if (patch.slug !== undefined) {
      const slug = slugify(patch.slug);
      if (!slug) throw new ConvexError({ code: "BAD_SLUG", he: "רק אותיות באנגלית, מספרים ומקפים" });
      await assertSlugFree(ctx, slug, id);
      next.slug = slug;
    }
    await ctx.db.patch(id, { ...next, updatedAt: Date.now(), updatedBy: admin._id });
    await logActivity(ctx, admin, {
      action: "products.update",
      tableName: "products",
      docId: id,
      summaryHe: `עדכן את ${before.titleHe}`,
      before,
      after: next,
    });
    return null;
  },
});

export const reorder = mutation({
  args: {
    id: v.id("products"),
    beforeId: v.optional(v.id("products")),
    afterId: v.optional(v.id("products")),
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
  args: { id: v.id("products"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    const admin = await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את המוצר" });
    if (active) {
      const image = await ctx.db
        .query("productImages")
        .withIndex("by_product_sort", (q) => q.eq("productId", id))
        .first();
      if (!image && !product.heroImageId) {
        throw new ConvexError({
          code: "NEED_IMAGE",
          he: "צריך לפחות תמונה אחת לפני שמפרסמים מוצר",
        });
      }
    }
    await ctx.db.patch(id, { active, updatedAt: Date.now(), updatedBy: admin._id });
    await logActivity(ctx, admin, {
      action: "products.setActive",
      tableName: "products",
      docId: id,
      summaryHe: active ? `פרסם את ${product.titleHe}` : `הסתיר את ${product.titleHe}`,
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את המוצר" });
    await ctx.db.patch(id, {
      deletedAt: Date.now(),
      active: false,
      updatedAt: Date.now(),
      updatedBy: admin._id,
    });
    await logActivity(ctx, admin, {
      action: "products.softDelete",
      tableName: "products",
      docId: id,
      summaryHe: `העביר לפח את ${product.titleHe}`,
    });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { deletedAt: undefined, updatedAt: Date.now() });
    return null;
  },
});

/** Owner only, and it takes the files with it. There is no second chance here. */
export const hardDelete = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const admin = await requireOwner(ctx);
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את המוצר" });

    for (const image of await ctx.db
      .query("productImages")
      .withIndex("by_product_sort", (q) => q.eq("productId", id))
      .collect()) {
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }
    for (const model of await ctx.db
      .query("productModels")
      .withIndex("by_product", (q) => q.eq("productId", id))
      .collect()) {
      await ctx.storage.delete(model.storageId);
      await ctx.db.delete(model._id);
    }
    await ctx.db.delete(id);
    await logActivity(ctx, admin, {
      action: "products.hardDelete",
      tableName: "products",
      docId: id,
      summaryHe: `מחק סופית את ${product.titleHe}`,
      before: product,
    });
    return null;
  },
});

/* ---- images ---- */

export const addImage = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
    altHe: v.string(),
    width: v.number(),
    height: v.number(),
    blurDataUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.altHe.trim()) {
      throw new ConvexError({
        code: "ALT_REQUIRED",
        he: "צריך לכתוב מה רואים בתמונה. זה מה שקורא המסך יקריא",
      });
    }
    const existing = await ctx.db
      .query("productImages")
      .withIndex("by_product_sort", (q) => q.eq("productId", args.productId))
      .collect();
    const last = existing.map((r) => r.sortOrder).sort((a, b) => a - b).pop();
    return await ctx.db.insert("productImages", {
      ...args,
      isHero: existing.length === 0,
      sortOrder: sortBetween(last, undefined),
      createdAt: Date.now(),
    });
  },
});

export const removeImage = mutation({
  args: { imageId: v.id("productImages") },
  handler: async (ctx, { imageId }) => {
    await requireAdmin(ctx);
    const image = await ctx.db.get(imageId);
    if (!image) return null;
    const product = await ctx.db.get(image.productId);
    if (product?.heroImageId === image.storageId) {
      await ctx.db.patch(product._id, { heroImageId: undefined, updatedAt: Date.now() });
    }
    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(imageId);
    return null;
  },
});

export const reorderImages = mutation({
  args: {
    imageId: v.id("productImages"),
    beforeId: v.optional(v.id("productImages")),
    afterId: v.optional(v.id("productImages")),
  },
  handler: async (ctx, { imageId, beforeId, afterId }) => {
    await requireAdmin(ctx);
    const before = beforeId ? await ctx.db.get(beforeId) : null;
    const after = afterId ? await ctx.db.get(afterId) : null;
    await ctx.db.patch(imageId, {
      sortOrder: sortBetween(before?.sortOrder, after?.sortOrder),
    });
    return null;
  },
});

export const setHeroImage = mutation({
  args: { productId: v.id("products"), imageId: v.id("productImages") },
  handler: async (ctx, { productId, imageId }) => {
    await requireAdmin(ctx);
    const image = await ctx.db.get(imageId);
    if (!image || image.productId !== productId) {
      throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את התמונה" });
    }
    for (const other of await ctx.db
      .query("productImages")
      .withIndex("by_product_sort", (q) => q.eq("productId", productId))
      .collect()) {
      if (other.isHero !== (other._id === imageId)) {
        await ctx.db.patch(other._id, { isHero: other._id === imageId });
      }
    }
    await ctx.db.patch(productId, { heroImageId: image.storageId, updatedAt: Date.now() });
    return null;
  },
});

/* ---- models ---- */

export const attachModel = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
    filename: v.string(),
    sizeBytes: v.number(),
    triangleCount: v.optional(v.number()),
    boundingBoxMm: v.object({ x: v.number(), y: v.number(), z: v.number() }),
    defaultMaterialId: v.optional(v.id("materials")),
    defaultColorId: v.optional(v.id("filamentColors")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.filename.toLowerCase().endsWith(".glb")) {
      throw new ConvexError({ code: "BAD_TYPE", he: "רק קובץ GLB" });
    }
    if (args.sizeBytes > 25 * 1024 * 1024) {
      throw new ConvexError({ code: "TOO_BIG", he: "הקובץ גדול מדי. עד 25MB" });
    }
    const now = Date.now();
    return await ctx.db.insert("productModels", {
      ...args,
      cameraPreset: { position: [0, 0.35, 1.1], target: [0, 0, 0], fov: 35 },
      autoRotate: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateModel = mutation({
  args: {
    modelId: v.id("productModels"),
    patch: v.object({
      defaultMaterialId: v.optional(v.id("materials")),
      defaultColorId: v.optional(v.id("filamentColors")),
      cameraPreset: v.optional(
        v.object({
          position: v.array(v.number()),
          target: v.array(v.number()),
          fov: v.number(),
        }),
      ),
      autoRotate: v.optional(v.boolean()),
      active: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { modelId, patch }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(modelId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

export const removeModel = mutation({
  args: { modelId: v.id("productModels") },
  handler: async (ctx, { modelId }) => {
    await requireAdmin(ctx);
    const model = await ctx.db.get(modelId);
    if (!model) return null;
    await ctx.storage.delete(model.storageId);
    await ctx.db.delete(modelId);
    return null;
  },
});

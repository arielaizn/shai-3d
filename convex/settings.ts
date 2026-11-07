/**
 * The site settings singleton, and the two nightly housekeeping jobs.
 *
 * `publicSettings` builds a new object field by field. It never returns the
 * document, because the row also carries Shai's notification address and his
 * private notes, and `return doc` is how those end up in a browser.
 */
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { logActivity, requireAdmin, requireOwner } from "./lib/auth";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

async function readSingleton(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"siteSettings"> | null> {
  return await ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q) => q.eq("key", "main"))
    .unique();
}

export const publicSettings = query({
  args: {},
  handler: async (ctx) => {
    const row = await readSingleton(ctx);
    if (!row) return null;
    return {
      businessNameHe: row.businessNameHe,
      taglineHe: row.taglineHe,
      whatsappNumberE164: row.whatsappNumberE164,
      whatsappGreetingHe: row.whatsappGreetingHe,
      contactEmail: row.contactEmail,
      instagramUrl: row.instagramUrl,
      tiktokUrl: row.tiktokUrl,
      announcementEnabled: row.announcementEnabled,
      announcementTextHe: row.announcementTextHe,
      announcementHref: row.announcementHref,
      turnaroundDaysMin: row.turnaroundDaysMin,
      turnaroundDaysMax: row.turnaroundDaysMax,
      pickupCityHe: row.pickupCityHe,
      ogImageUrl: row.ogImageId ? await ctx.storage.getUrl(row.ogImageId) : null,
      faviconUrl: row.faviconId ? await ctx.storage.getUrl(row.faviconId) : null,
      maintenanceMode: row.maintenanceMode,
      maintenanceTextHe: row.maintenanceTextHe,
    };
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await readSingleton(ctx);
  },
});

const settingsPatch = v.object({
  businessNameHe: v.optional(v.string()),
  taglineHe: v.optional(v.string()),
  whatsappNumberE164: v.optional(v.string()),
  whatsappGreetingHe: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  instagramUrl: v.optional(v.string()),
  tiktokUrl: v.optional(v.string()),
  announcementEnabled: v.optional(v.boolean()),
  announcementTextHe: v.optional(v.string()),
  announcementHref: v.optional(v.string()),
  turnaroundDaysMin: v.optional(v.number()),
  turnaroundDaysMax: v.optional(v.number()),
  pickupCityHe: v.optional(v.string()),
  ogImageId: v.optional(v.id("_storage")),
  faviconId: v.optional(v.id("_storage")),
  maintenanceMode: v.optional(v.boolean()),
  maintenanceTextHe: v.optional(v.string()),
  notifyEmail: v.optional(v.string()),
  notifyWhatsapp: v.optional(v.string()),
  internalNotesHe: v.optional(v.string()),
});

export const update = mutation({
  args: { patch: settingsPatch },
  handler: async (ctx, { patch }) => {
    const admin = await requireAdmin(ctx);
    const row = await readSingleton(ctx);
    if (!row) {
      throw new ConvexError({ code: "NOT_FOUND", he: "ההגדרות עוד לא נוצרו" });
    }

    /**
     * The WhatsApp number is the entire business. Changing it silently would
     * send every lead on the site to a stranger, so it is owner only.
     */
    if (
      patch.whatsappNumberE164 !== undefined &&
      patch.whatsappNumberE164 !== row.whatsappNumberE164
    ) {
      await requireOwner(ctx);
      if (!/^\d{9,15}$/.test(patch.whatsappNumberE164)) {
        throw new ConvexError({
          code: "BAD_PHONE",
          he: "מספר טלפון לא תקין. לדוגמה 972585845083",
        });
      }
    }

    await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now(), updatedBy: admin._id });
    await logActivity(ctx, admin, {
      action: "settings.update",
      tableName: "siteSettings",
      docId: row._id,
      summaryHe: "עדכן את הגדרות האתר",
      before: row,
      after: patch,
    });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* housekeeping, called by crons.ts only                                */
/* ------------------------------------------------------------------ */

/**
 * The trash empties itself after 30 days. Soft delete exists because Shai will
 * delete a colour by accident on his phone; 30 days is long enough that he will
 * have noticed, and short enough that a spool he stopped buying leaves.
 *
 * `leads` and `contactMessages` are not in this list on purpose. They are never
 * deleted, only archived: a thirteen year old should not be able to erase the
 * record of a customer.
 */
export const purgeTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - THIRTY_DAYS;
    let removed = 0;

    const sweep = async (rows: Array<{ _id: Id<TableNames>; deletedAt?: number }>) => {
      for (const row of rows) {
        if (row.deletedAt !== undefined && row.deletedAt < cutoff) {
          await ctx.db.delete(row._id);
          removed += 1;
        }
      }
    };

    await sweep(await ctx.db.query("products").collect());
    await sweep(await ctx.db.query("categories").collect());
    await sweep(await ctx.db.query("printTypes").collect());
    await sweep(await ctx.db.query("materials").collect());
    await sweep(await ctx.db.query("filamentColors").collect());
    await sweep(await ctx.db.query("surchargeRules").collect());
    await sweep(await ctx.db.query("quantityDiscountTiers").collect());
    await sweep(await ctx.db.query("aboutSections").collect());
    await sweep(await ctx.db.query("faqItems").collect());

    // gallery items own a file, so they are swept by hand
    for (const item of await ctx.db.query("galleryItems").collect()) {
      if (item.deletedAt !== undefined && item.deletedAt < cutoff) {
        await ctx.storage.delete(item.imageId);
        await ctx.db.delete(item._id);
        removed += 1;
      }
    }

    if (removed > 0) {
      await logActivity(ctx, null, {
        action: "maintenance.purgeTrash",
        tableName: "*",
        summaryHe: `נמחקו סופית ${removed} פריטים מהפח`,
      });
    }
    return null;
  },
});

/** Fixed-window counters are worthless once their window closed. */
export const sweepRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const rows = await ctx.db.query("rateLimits").collect();
    for (const row of rows) {
      if (row.windowStart < cutoff) await ctx.db.delete(row._id);
    }
    return null;
  },
});

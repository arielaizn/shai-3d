/**
 * The handoff. This is where the site stops.
 *
 * RESOLUTIONS §3: there is no form. `submit` takes a session key and an optional
 * note, nothing else. WhatsApp supplies the identity, which is exactly what
 * wa.me delivers, and no customer phone number is stored on a minor's system
 * because a field asked for one.
 *
 * `submit` never receives a price. It reloads the draft, rebuilds the LIVE
 * pricing config inside the mutation, runs the same engine the browser ran, and
 * writes that answer. If Shai published a change mid-session the customer gets
 * the number Shai honours, and the screen says so in one calm line.
 */
import { ConvexError, v } from "convex/values";
import type { Expression, FilterBuilder, NamedTableInfo } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { DataModel, Doc } from "./_generated/dataModel";
import { leadStatus } from "./schema";
import type { PriceBreakdown } from "./lib/priceEngine";
import { agorotToIls } from "./lib/priceEngine";
import { enforceRateLimit, logActivity, randomCode, requireAdmin } from "./lib/auth";
import { findDraft, priceDraft } from "./drafts";

const HOUR = 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* the WhatsApp text                                                    */
/* ------------------------------------------------------------------ */

function formatIls(agorot: number): string {
  const ils = agorotToIls(agorot);
  return Number.isInteger(ils) ? String(ils) : ils.toFixed(2);
}

function formatDay(ms: number): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(ms));
  } catch {
    const d = new Date(ms);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${day}.${month}`;
  }
}

type SnapshotShape = Doc<"leads">["configSnapshot"];

/**
 * 09c §7.2 verbatim, assembled on the server so the stored text and the text the
 * customer sends are the same string.
 *
 * The link block is emitted only when SITE_URL is configured, because a code
 * without a page to open is a line that wastes the reader's attention.
 */
function buildGeneratorMessage(args: {
  greetingHe: string;
  snapshot: NonNullable<SnapshotShape>;
  totalAgorot: number;
  publicCode: string;
}): string {
  const { snapshot } = args;
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const lines: (string | null)[] = [
    args.greetingHe,
    "",
    `מה: ${snapshot.printTypeLabelHe}`,
    `גודל: ${snapshot.sizeLabelHe}`,
    snapshot.colors.length > 0 ? `צבעים: ${snapshot.colors.map((c) => c.nameHe).join(", ")}` : null,
    `כמות: ${snapshot.quantity}`,
    `מסירה: ${snapshot.deliveryLabelHe}`,
    snapshot.neededByHe ? `עד מתי: ${snapshot.neededByHe}` : null,
    `מחיר באתר: ${formatIls(args.totalAgorot)} שקל`,
  ];

  if (siteUrl) {
    lines.push("", "הקישור עם התמונה והדגם:", `${siteUrl}/o/${args.publicCode}`, `קוד: ${args.publicCode}`);
  }
  if (snapshot.noteHe) {
    lines.push("", `הערה: ${snapshot.noteHe}`);
  }
  lines.push("", "אשמח לדעת אם זה מסתדר ומתי אפשר לקבל.");

  return lines.filter((line): line is string => line !== null).join("\n");
}

function buildProductMessage(args: {
  greetingHe: string;
  titleHe: string;
  slug: string;
  quantity: number;
  unitAgorot: number;
  noteHe?: string;
}): string {
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const total = args.unitAgorot * args.quantity;
  const lines: (string | null)[] = [
    args.greetingHe,
    "",
    `מעניין אותי: ${args.titleHe}`,
    `קוד דגם: ${args.slug}`,
    `כמות: ${args.quantity}`,
    args.quantity === 1
      ? `מחיר באתר: ${formatIls(args.unitAgorot)} שקל`
      : `מחיר באתר: ${formatIls(args.unitAgorot)} שקל ליחידה, ${formatIls(total)} שקל בסך הכול`,
    siteUrl ? "" : null,
    siteUrl ? `קישור: ${siteUrl}/products/${args.slug}` : null,
    args.noteHe ? "" : null,
    args.noteHe ? `הערה: ${args.noteHe}` : null,
    "",
    "אשמח לדעת מתי אפשר לקבל.",
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

async function whatsappTarget(ctx: QueryCtx | MutationCtx) {
  const settings = await ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q) => q.eq("key", "main"))
    .unique();
  return {
    number: settings?.whatsappNumberE164 ?? "972585845083",
    greetingHe: settings?.whatsappGreetingHe ?? "היי שי, בניתי הזמנה באתר.",
  };
}

function whatsappUrl(numberE164: string, message: string): string {
  return `https://wa.me/${numberE164}?text=${encodeURIComponent(message)}`;
}

/* ------------------------------------------------------------------ */
/* the frozen labels                                                    */
/* ------------------------------------------------------------------ */

/**
 * The snapshot duplicates the labels on purpose. When Shai renames ליתופן to
 * something else next month, a lead from March still reads correctly.
 */
async function snapshotDraft(
  ctx: MutationCtx,
  draft: Doc<"generatorDrafts">,
  breakdown: PriceBreakdown,
): Promise<NonNullable<SnapshotShape>> {
  const printType = draft.printTypeId ? await ctx.db.get(draft.printTypeId) : null;
  const material = draft.materialId ? await ctx.db.get(draft.materialId) : null;
  const size = printType?.sizes.find((s) => s.key === draft.sizeKey);
  const colors = await Promise.all(draft.colorIds.map((id) => ctx.db.get(id)));
  const addons = await Promise.all(draft.addonRuleIds.map((id) => ctx.db.get(id)));

  return {
    printTypeLabelHe: printType?.nameHe ?? "",
    materialLabelHe: material?.nameHe ?? "",
    sizeLabelHe: size?.labelHe ?? "",
    sizeMm: size ? `${size.widthMm} × ${size.heightMm} × ${size.depthMm} מ״מ` : "",
    colors: colors
      .filter((c): c is Doc<"filamentColors"> => c !== null)
      .map((c) => ({ nameHe: c.nameHe, hex: c.hex })),
    quantity: breakdown.quantity,
    addonLabelsHe: addons
      .filter((a): a is Doc<"surchargeRules"> => a !== null)
      .map((a) => a.labelHe),
    deliveryLabelHe: draft.deliveryMethod === "pickup" ? "איסוף עצמי" : "משלוח",
    neededByHe: draft.neededByDate ? formatDay(draft.neededByDate) : undefined,
    noteHe: draft.noteHe,
  };
}

/* ------------------------------------------------------------------ */
/* public                                                               */
/* ------------------------------------------------------------------ */

export const submit = mutation({
  args: { sessionKey: v.string(), noteHe: v.optional(v.string()) },
  handler: async (ctx, { sessionKey, noteHe }) => {
    await enforceRateLimit(ctx, "leads.submit", sessionKey, 5, HOUR);

    const draft = await findDraft(ctx, sessionKey);
    if (!draft) {
      throw new ConvexError({ code: "NO_DRAFT", he: "משהו השתבש. אפשר לרענן את העמוד" });
    }
    if (noteHe !== undefined) {
      if (noteHe.length > 500) throw new ConvexError({ code: "TOO_LONG", he: "עד 500 תווים" });
      await ctx.db.patch(draft._id, { noteHe });
      draft.noteHe = noteHe;
    }

    const breakdown = await priceDraft(ctx, draft);
    if (!breakdown) {
      throw new ConvexError({
        code: "INCOMPLETE",
        he: "חסרים פרטים בהזמנה. אפשר לחזור צעד אחורה",
      });
    }

    /* an existing lead for this session is updated, not duplicated: a double tap
       on the WhatsApp button must not create two orders */
    const existing = draft.leadId ? await ctx.db.get(draft.leadId) : null;
    const now = Date.now();
    const snapshot = await snapshotDraft(ctx, draft, breakdown);
    const target = await whatsappTarget(ctx);
    const publicCode = existing?.publicCode ?? randomCode();
    const message = buildGeneratorMessage({
      greetingHe: target.greetingHe,
      snapshot,
      totalAgorot: breakdown.totalAgorot,
      publicCode,
    });

    let leadId = existing?._id;
    if (existing) {
      await ctx.db.patch(existing._id, {
        configSnapshot: snapshot,
        breakdown,
        priceAgorot: breakdown.totalAgorot,
        photoId: draft.photoId,
        previewSnapshotId: draft.previewSnapshotId,
        modelFiles: draft.modelFiles,
        photoShareConsent: draft.photoShareConsent,
        whatsappMessage: message,
        updatedAt: now,
      });
    } else {
      leadId = await ctx.db.insert("leads", {
        draftId: draft._id,
        source: "generator",
        publicCode,
        configSnapshot: snapshot,
        breakdown,
        priceAgorot: breakdown.totalAgorot,
        photoId: draft.photoId,
        previewSnapshotId: draft.previewSnapshotId,
        modelFiles: draft.modelFiles,
        photoShareConsent: draft.photoShareConsent,
        whatsappMessage: message,
        status: "new",
        statusHistory: [{ status: "new", at: now }],
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(draft._id, {
      leadId,
      status: "submitted",
      breakdown,
      priceAgorot: breakdown.totalAgorot,
      updatedAt: now,
      lastSeenAt: now,
    });

    return {
      leadId: leadId!,
      whatsappUrl: whatsappUrl(target.number, message),
      breakdown,
    };
  },
});

export const submitFromProduct = mutation({
  args: {
    sessionKey: v.optional(v.string()),
    productSlug: v.string(),
    quantity: v.optional(v.number()),
    noteHe: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await enforceRateLimit(ctx, "leads.product", args.sessionKey ?? "anonymous", 10, HOUR);

    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.productSlug))
      .unique();
    if (!product || product.deletedAt !== undefined || !product.active) {
      throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את המוצר" });
    }

    const quantity = Math.max(1, Math.min(25, Math.round(args.quantity ?? 1)));
    const target = await whatsappTarget(ctx);
    const publicCode = randomCode();
    const message = buildProductMessage({
      greetingHe: "היי שי, הגעתי מהאתר.",
      titleHe: product.titleHe,
      slug: product.slug,
      quantity,
      unitAgorot: product.priceAgorot,
      noteHe: args.noteHe,
    });

    const now = Date.now();
    const leadId = await ctx.db.insert("leads", {
      source: "product",
      publicCode,
      productId: product._id,
      priceAgorot: product.priceAgorot * quantity,
      photoShareConsent: false,
      whatsappMessage: message,
      status: "new",
      statusHistory: [{ status: "new", at: now }],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(product._id, {
      whatsappClickCount: product.whatsappClickCount + 1,
    });

    return { leadId, whatsappUrl: whatsappUrl(target.number, message) };
  },
});

/** One write, repeats ignored. Tells Shai the customer actually left the site. */
export const markWhatsappOpened = mutation({
  args: { leadId: v.id("leads"), sessionKey: v.optional(v.string()) },
  handler: async (ctx, { leadId, sessionKey }) => {
    const lead = await ctx.db.get(leadId);
    if (!lead || lead.whatsappOpenedAt) return null;
    if (sessionKey) {
      const draft = await findDraft(ctx, sessionKey);
      if (!draft || draft.leadId !== leadId) return null;
    }
    await ctx.db.patch(leadId, { whatsappOpenedAt: Date.now() });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* admin                                                                */
/* ------------------------------------------------------------------ */

export const list = query({
  args: {
    status: v.optional(leadStatus),
    archived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, archived, limit }) => {
    await requireAdmin(ctx);
    /* the archive filter runs inside the query rather than after take(), or a
       page of archived rows would come back as an empty inbox */
    const archivedFilter = (
      q: FilterBuilder<NamedTableInfo<DataModel, "leads">>,
    ): Expression<boolean> =>
      archived === true
        ? q.neq(q.field("archivedAt"), undefined)
        : q.eq(q.field("archivedAt"), undefined);

    const rows = status
      ? await ctx.db
          .query("leads")
          .withIndex("by_status_created", (q) => q.eq("status", status))
          .order("desc")
          .filter(archivedFilter)
          .take(limit ?? 50)
      : await ctx.db
          .query("leads")
          .withIndex("by_created")
          .order("desc")
          .filter(archivedFilter)
          .take(limit ?? 50);

    return rows
      .map((lead) => ({
        _id: lead._id,
        publicCode: lead.publicCode,
        source: lead.source,
        titleHe: lead.configSnapshot?.printTypeLabelHe ?? "",
        quantity: lead.configSnapshot?.quantity ?? 1,
        priceAgorot: lead.priceOverrideAgorot ?? lead.priceAgorot,
        status: lead.status,
        pinned: lead.pinned,
        whatsappOpenedAt: lead.whatsappOpenedAt ?? null,
        dueDate: lead.dueDate ?? null,
        createdAt: lead.createdAt,
      }));
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("leads").collect();
    const open = rows.filter((r) => r.archivedAt === undefined);
    return {
      new: open.filter((r) => r.status === "new").length,
      contacted: open.filter((r) => r.status === "contacted").length,
      quoted: open.filter((r) => r.status === "quoted").length,
      printing: open.filter((r) => r.status === "printing").length,
      done: open.filter((r) => r.status === "done").length,
      lost: open.filter((r) => r.status === "lost").length,
    };
  },
});

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(id);
    if (!lead) return null;
    return {
      lead,
      photoUrl: lead.photoId ? await ctx.storage.getUrl(lead.photoId) : null,
      previewSnapshotUrl: lead.previewSnapshotId
        ? await ctx.storage.getUrl(lead.previewSnapshotId)
        : null,
      /**
       * The printable mesh, resolved to a download URL for the panel. Signed URLs are
       * what `_storage` hands out, so the file is never reachable by guessing an id.
       */
      modelFileUrls: await Promise.all(
        (lead.modelFiles ?? []).map(async (file) => ({
          format: file.format,
          bytes: file.bytes,
          triangles: file.triangles,
          boundingMm: file.boundingMm,
          url: await ctx.storage.getUrl(file.storageId),
        })),
      ),
    };
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: leadStatus, noteHe: v.optional(v.string()) },
  handler: async (ctx, { id, status, noteHe }) => {
    const admin = await requireAdmin(ctx);
    const lead = await ctx.db.get(id);
    if (!lead) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את הפנייה" });
    const now = Date.now();
    await ctx.db.patch(id, {
      status,
      statusHistory: [...lead.statusHistory, { status, at: now, byAdminId: admin._id, noteHe }],
      lostReasonHe: status === "lost" ? noteHe : lead.lostReasonHe,
      updatedAt: now,
    });
    return null;
  },
});

export const setNotes = mutation({
  args: { id: v.id("leads"), internalNotesHe: v.string() },
  handler: async (ctx, { id, internalNotesHe }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { internalNotesHe, updatedAt: Date.now() });
    return null;
  },
});

/** What Shai actually charged after talking. The engine price stays untouched. */
export const setOverridePrice = mutation({
  args: {
    id: v.id("leads"),
    priceOverrideAgorot: v.number(),
    overrideReasonHe: v.string(),
  },
  handler: async (ctx, { id, priceOverrideAgorot, overrideReasonHe }) => {
    const admin = await requireAdmin(ctx);
    if (priceOverrideAgorot < 0) {
      throw new ConvexError({ code: "BAD_PRICE", he: "המספר חייב להיות גדול מאפס" });
    }
    await ctx.db.patch(id, { priceOverrideAgorot, overrideReasonHe, updatedAt: Date.now() });
    await logActivity(ctx, admin, {
      action: "leads.setOverridePrice",
      tableName: "leads",
      docId: id,
      summaryHe: `שינה מחיר לפנייה ל-${formatIls(priceOverrideAgorot)} ש״ח`,
    });
    return null;
  },
});

export const setPinned = mutation({
  args: { id: v.id("leads"), pinned: v.boolean() },
  handler: async (ctx, { id, pinned }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { pinned, updatedAt: Date.now() });
    return null;
  },
});

export const setDueDate = mutation({
  args: { id: v.id("leads"), dueDate: v.optional(v.number()) },
  handler: async (ctx, { id, dueDate }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { dueDate, updatedAt: Date.now() });
    return null;
  },
});

/** Never deleted, only archived. The record of a customer is not his to erase. */
export const archive = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { archivedAt: Date.now(), updatedAt: Date.now() });
    return null;
  },
});

export const unarchive = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { archivedAt: undefined, updatedAt: Date.now() });
    return null;
  },
});

/** For the orders that arrive by phone, which is most of them at the start. */
export const createManual = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    priceAgorot: v.number(),
    noteHe: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("leads", {
      source: "manual",
      name: args.name,
      phone: args.phone,
      publicCode: randomCode(),
      priceAgorot: args.priceAgorot,
      photoShareConsent: false,
      whatsappMessage: "",
      status: "new",
      statusHistory: [{ status: "new", at: now, byAdminId: admin._id }],
      internalNotesHe: args.noteHe,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

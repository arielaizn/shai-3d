/**
 * The contact page inbox.
 *
 * This is the one form on the site. It exists for people who want to ask
 * something without building anything, and it is deliberately NOT in the
 * generator: RESOLUTIONS §3 keeps every field out of the path between the price
 * and WhatsApp. A message here is never deleted, only marked, because the record
 * of a customer is not a thirteen year old's to erase.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { contactStatus } from "./schema";
import { enforceRateLimit, logActivity, randomCode, requireAdmin } from "./lib/auth";

const HOUR = 60 * 60 * 1000;

/** 0585845083 · 058-584-5083 · +972585845083 all normalise to 972585845083 */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  const bare = digits.startsWith("+") ? digits.slice(1) : digits;
  if (bare.startsWith("0")) return `972${bare.slice(1)}`;
  if (bare.startsWith("972")) return bare;
  return bare;
}

function isPhone(value: string): boolean {
  return /^9725\d{8}$/.test(value) || /^972\d{8,9}$/.test(value);
}

export const send = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    subjectHe: v.optional(v.string()),
    bodyHe: v.string(),
    sessionKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = args.sessionKey ?? "anonymous";
    await enforceRateLimit(ctx, "contact.send", identity, 3, HOUR);
    await enforceRateLimit(ctx, "contact.send", "global", 60, HOUR);

    const name = args.name.trim();
    const bodyHe = args.bodyHe.trim();
    const phone = normalisePhone(args.phone);

    if (name.length < 2) {
      throw new ConvexError({ code: "BAD_NAME", he: "צריך למלא את השדה הזה" });
    }
    if (!isPhone(phone)) {
      throw new ConvexError({
        code: "BAD_PHONE",
        he: "מספר טלפון לא תקין. לדוגמה 0585845083",
      });
    }
    if (bodyHe.length < 5) {
      throw new ConvexError({ code: "BAD_BODY", he: "צריך למלא את השדה הזה" });
    }
    if (bodyHe.length > 2000) {
      throw new ConvexError({ code: "TOO_LONG", he: "עד 2000 תווים" });
    }
    if (args.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.email)) {
      throw new ConvexError({ code: "BAD_EMAIL", he: "כתובת מייל לא תקינה" });
    }

    const now = Date.now();
    await ctx.db.insert("contactMessages", {
      name,
      phone,
      email: args.email?.trim() || undefined,
      subjectHe: args.subjectHe?.trim() || undefined,
      bodyHe,
      sessionKey: args.sessionKey,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const list = query({
  args: {
    status: v.optional(contactStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db
          .query("contactMessages")
          .withIndex("by_status_created", (q) => q.eq("status", status))
          .order("desc")
          .take(limit ?? 50)
      : await ctx.db
          .query("contactMessages")
          .withIndex("by_created")
          .order("desc")
          .take(limit ?? 50);
    return rows;
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("contactMessages").collect();
    return {
      new: rows.filter((r) => r.status === "new").length,
      read: rows.filter((r) => r.status === "read").length,
      replied: rows.filter((r) => r.status === "replied").length,
      spam: rows.filter((r) => r.status === "spam").length,
    };
  },
});

export const setStatus = mutation({
  args: { id: v.id("contactMessages"), status: contactStatus },
  handler: async (ctx, { id, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
    return null;
  },
});

export const setNotes = mutation({
  args: { id: v.id("contactMessages"), internalNotesHe: v.string() },
  handler: async (ctx, { id, internalNotesHe }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { internalNotesHe, updatedAt: Date.now() });
    return null;
  },
});

/** A question that turned into an order. The message stays where it is. */
export const convertToLead = mutation({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const message = await ctx.db.get(id);
    if (!message) throw new ConvexError({ code: "NOT_FOUND", he: "לא מצאתי את ההודעה" });
    if (message.convertedLeadId) return message.convertedLeadId;

    const now = Date.now();
    const leadId = await ctx.db.insert("leads", {
      source: "contact",
      name: message.name,
      phone: message.phone,
      email: message.email,
      publicCode: randomCode(),
      priceAgorot: 0,
      photoShareConsent: false,
      whatsappMessage: "",
      status: "new",
      statusHistory: [{ status: "new", at: now, byAdminId: admin._id }],
      internalNotesHe: message.bodyHe,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(id, { convertedLeadId: leadId, status: "replied", updatedAt: now });
    await logActivity(ctx, admin, {
      action: "contact.convertToLead",
      tableName: "contactMessages",
      docId: id,
      summaryHe: `הפך הודעה של ${message.name} להזמנה`,
    });
    return leadId;
  },
});

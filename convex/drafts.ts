/**
 * The generator's server side.
 *
 * A visitor has one identity: a uuid v4 they generated and keep in
 * `localStorage`. It is a CAPABILITY, not a login. Knowing it grants access to
 * that one draft, which holds a photo they uploaded themselves and a price they
 * already saw. `getBySession` never accepts a document id, so ids cannot be
 * walked.
 *
 * The money rule, stated once: `DraftPatch` below is the entire list of keys a
 * browser may write. `priceAgorot` and `breakdown` are NOT in it, so a crafted
 * request cannot set a price. Every price on this page is computed here, from
 * the live channel, by the one engine.
 */
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { deliveryMethod, draftStatus } from "./schema";
import { computePrice } from "./lib/priceEngine";
import type { PriceBreakdown, PriceInput } from "./lib/priceEngine";
import { loadPriceEngineConfig } from "./lib/pricingConfig";
import { enforceRateLimit, logActivity, randomToken, requireAdmin } from "./lib/auth";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** RESOLUTIONS §4, and the copy next to the upload button says exactly this */
const DRAFT_RETENTION_MS = 7 * DAY;
/** a tab left open on a bus is not an abandoned order for 45 minutes */
const ABANDON_AFTER_MS = 45 * 60 * 1000;
const UPLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * The allowlist. Anything not named here is rejected by the argument validator
 * before the handler runs.
 *
 * `contactName` and `contactPhone` are deliberately absent (RESOLUTIONS §3):
 * WhatsApp is the identity, and customers' phone numbers do not get stored on a
 * minor's system because a form asked for them.
 */
const draftPatch = v.object({
  printTypeId: v.optional(v.id("printTypes")),
  materialId: v.optional(v.id("materials")),
  sizeKey: v.optional(v.string()),
  colorIds: v.optional(v.array(v.id("filamentColors"))),
  quantity: v.optional(v.number()),
  addonRuleIds: v.optional(v.array(v.id("surchargeRules"))),
  rush: v.optional(v.boolean()),
  neededByDate: v.optional(v.number()),
  deliveryMethod: v.optional(deliveryMethod),
  noteHe: v.optional(v.string()),
  step: v.optional(v.number()),
});

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function assertSessionKey(sessionKey: string) {
  if (!UUID.test(sessionKey)) {
    throw new ConvexError({ code: "BAD_SESSION", he: "משהו השתבש. אפשר לרענן את העמוד" });
  }
}

export async function findDraft(
  ctx: QueryCtx | MutationCtx,
  sessionKey: string,
): Promise<Doc<"generatorDrafts"> | null> {
  return await ctx.db
    .query("generatorDrafts")
    .withIndex("by_session", (q) => q.eq("sessionKey", sessionKey))
    .unique();
}

/**
 * Turns a half-built draft into engine input, or returns null when there is not
 * enough of it to price yet. A null price is a normal state on steps 1 and 2.
 */
export async function priceDraft(
  ctx: QueryCtx | MutationCtx,
  draft: Doc<"generatorDrafts">,
): Promise<PriceBreakdown | null> {
  if (!draft.printTypeId || !draft.sizeKey) return null;
  const printType = await ctx.db.get(draft.printTypeId);
  if (!printType || printType.deletedAt !== undefined) return null;

  const material = draft.materialId ? await ctx.db.get(draft.materialId) : null;
  const cfg = await loadPriceEngineConfig(ctx, "live");

  const input: PriceInput = {
    printTypeKey: printType.key,
    materialKey: material && material.deletedAt === undefined ? material.key : "",
    sizeKey: draft.sizeKey,
    colorIds: draft.colorIds,
    quantity: draft.quantity,
    addonRuleIds: draft.addonRuleIds,
    rush: draft.rush,
    deliveryMethod: draft.deliveryMethod,
    requestedInDays:
      draft.neededByDate === undefined
        ? undefined
        : Math.max(0, Math.round((draft.neededByDate - Date.now()) / DAY)),
  };

  try {
    return computePrice(input, cfg);
  } catch {
    /* an unpriceable configuration is a half-built draft, not an error the
       visitor should see. the price simply stays hidden until it resolves. */
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* public                                                               */
/* ------------------------------------------------------------------ */

export const saveDraft = mutation({
  args: {
    sessionKey: v.string(),
    patch: draftPatch,
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    utm: v.optional(
      v.object({
        source: v.optional(v.string()),
        medium: v.optional(v.string()),
        campaign: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertSessionKey(args.sessionKey);
    await enforceRateLimit(ctx, "drafts.save", args.sessionKey, 240, HOUR);

    const now = Date.now();
    const patch = args.patch;

    if (patch.quantity !== undefined && (patch.quantity < 1 || !Number.isInteger(patch.quantity))) {
      throw new ConvexError({ code: "BAD_QTY", he: "כמות חייבת להיות לפחות יחידה אחת" });
    }
    if (patch.noteHe !== undefined && patch.noteHe.length > 500) {
      throw new ConvexError({ code: "TOO_LONG", he: "עד 500 תווים" });
    }

    let draft = await findDraft(ctx, args.sessionKey);
    if (!draft) {
      const id = await ctx.db.insert("generatorDrafts", {
        sessionKey: args.sessionKey,
        status: "building",
        step: patch.step ?? 1,
        furthestStep: patch.step ?? 1,
        photoShareConsent: false,
        colorIds: patch.colorIds ?? [],
        quantity: patch.quantity ?? 1,
        addonRuleIds: patch.addonRuleIds ?? [],
        rush: patch.rush ?? false,
        neededByDate: patch.neededByDate,
        deliveryMethod: patch.deliveryMethod ?? "pickup",
        noteHe: patch.noteHe,
        printTypeId: patch.printTypeId,
        materialId: patch.materialId,
        sizeKey: patch.sizeKey,
        userAgent: args.userAgent,
        referrer: args.referrer,
        utm: args.utm,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      });
      draft = (await ctx.db.get(id))!;
    } else {
      const step = patch.step ?? draft.step;
      await ctx.db.patch(draft._id, {
        ...patch,
        step,
        furthestStep: Math.max(draft.furthestStep, step),
        status: draft.status === "abandoned" ? "building" : draft.status,
        updatedAt: now,
        lastSeenAt: now,
      });
      draft = (await ctx.db.get(draft._id))!;
    }

    const breakdown = await priceDraft(ctx, draft);
    await ctx.db.patch(draft._id, {
      breakdown: breakdown ?? undefined,
      priceAgorot: breakdown?.totalAgorot,
    });

    return { draftId: draft._id, breakdown };
  },
});

export const getBySession = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, { sessionKey }) => {
    const draft = await findDraft(ctx, sessionKey);
    if (!draft) return null;
    return {
      _id: draft._id,
      status: draft.status,
      step: draft.step,
      furthestStep: draft.furthestStep,
      /* the visitor's own photo, handed back only to the session that uploaded
         it, so a reload can rebuild the preview. it is never listed anywhere. */
      photoUrl: draft.photoId ? await ctx.storage.getUrl(draft.photoId) : null,
      photoMeta: draft.photoMeta,
      photoShareConsent: draft.photoShareConsent,
      previewSnapshotUrl: draft.previewSnapshotId
        ? await ctx.storage.getUrl(draft.previewSnapshotId)
        : null,
      printTypeId: draft.printTypeId,
      materialId: draft.materialId,
      sizeKey: draft.sizeKey,
      colorIds: draft.colorIds,
      quantity: draft.quantity,
      addonRuleIds: draft.addonRuleIds,
      rush: draft.rush,
      neededByDate: draft.neededByDate,
      deliveryMethod: draft.deliveryMethod,
      noteHe: draft.noteHe,
      breakdown: draft.breakdown ?? null,
      priceAgorot: draft.priceAgorot ?? null,
      leadId: draft.leadId ?? null,
    };
  },
});

/**
 * The only public path to `ctx.storage.generateUploadUrl()`. The token is single
 * use and expires in fifteen minutes, so an upload URL that leaks is worth
 * nothing an hour later.
 */
export const requestPhotoUpload = mutation({
  args: {
    sessionKey: v.string(),
    purpose: v.union(
      v.literal("generatorPhoto"),
      v.literal("previewSnapshot"),
      v.literal("modelFile"),
    ),
  },
  handler: async (ctx, { sessionKey, purpose }) => {
    assertSessionKey(sessionKey);
    // Every build now uploads two model files on top of the photo, and a visitor who
    // tries three types in two sizes makes a dozen uploads in ten minutes. The old
    // twelve-an-hour budget was sized for photos alone and silently left the order
    // without a printable file. Forty is generous for a person and nothing for a bot.
    await enforceRateLimit(ctx, "drafts.upload", sessionKey, 40, HOUR);
    await enforceRateLimit(ctx, "drafts.upload", "global", 1500, HOUR);

    const token = randomToken();
    const now = Date.now();
    await ctx.db.insert("pendingUploads", {
      token,
      sessionKey,
      purpose,
      createdAt: now,
      expiresAt: now + UPLOAD_TOKEN_TTL_MS,
    });
    return { uploadUrl: await ctx.storage.generateUploadUrl(), token };
  },
});

async function consumeToken(
  ctx: MutationCtx,
  sessionKey: string,
  token: string,
  purpose: "generatorPhoto" | "previewSnapshot" | "modelFile",
  storageId: Id<"_storage">,
) {
  const row = await ctx.db
    .query("pendingUploads")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (
    !row ||
    row.sessionKey !== sessionKey ||
    row.purpose !== purpose ||
    row.consumedAt !== undefined ||
    row.expiresAt < Date.now()
  ) {
    /* the file was written but nothing may point at it, so it is removed here
       rather than left to sit in storage as an orphan nobody pays attention to */
    await ctx.storage.delete(storageId);
    throw new ConvexError({ code: "BAD_TOKEN", he: "ההעלאה נכשלה. אפשר לנסות שוב" });
  }
  await ctx.db.patch(row._id, { consumedAt: Date.now(), storageId });
}

export const attachPhoto = mutation({
  args: {
    sessionKey: v.string(),
    token: v.string(),
    storageId: v.id("_storage"),
    meta: v.object({
      width: v.number(),
      height: v.number(),
      bytes: v.number(),
      mime: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    assertSessionKey(args.sessionKey);
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowed.includes(args.meta.mime)) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "BAD_TYPE", he: "אפשר להעלות JPG, PNG או WebP" });
    }
    if (args.meta.bytes > 10 * 1024 * 1024) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "TOO_BIG", he: "התמונה גדולה מדי. עד 10MB" });
    }
    await consumeToken(ctx, args.sessionKey, args.token, "generatorPhoto", args.storageId);

    const draft = await findDraft(ctx, args.sessionKey);
    if (!draft) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "NO_DRAFT", he: "משהו השתבש. אפשר לרענן את העמוד" });
    }
    if (draft.photoId) await ctx.storage.delete(draft.photoId);
    await ctx.db.patch(draft._id, {
      photoId: args.storageId,
      photoMeta: args.meta,
      updatedAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    return null;
  },
});

export const attachPreviewSnapshot = mutation({
  args: { sessionKey: v.string(), token: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { sessionKey, token, storageId }) => {
    assertSessionKey(sessionKey);
    await consumeToken(ctx, sessionKey, token, "previewSnapshot", storageId);
    const draft = await findDraft(ctx, sessionKey);
    if (!draft) {
      await ctx.storage.delete(storageId);
      throw new ConvexError({ code: "NO_DRAFT", he: "משהו השתבש. אפשר לרענן את העמוד" });
    }
    if (draft.previewSnapshotId) await ctx.storage.delete(draft.previewSnapshotId);
    await ctx.db.patch(draft._id, {
      previewSnapshotId: storageId,
      status: draft.status === "building" ? "previewed" : draft.status,
      updatedAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    return null;
  },
});

/**
 * The printable mesh, attached to the draft the moment the preview finishes building.
 *
 * WHY IT UPLOADS HERE AND NOT AT CHECKOUT. The mesh exists in the visitor's browser
 * only while the model step is open. He can close the tab from the price screen, and
 * the order that reaches Shai would then describe a model nobody can print. Uploading
 * it as soon as it is built means the file is already on the order before the WhatsApp
 * button is touched.
 *
 * Each format is attached once. A rebuild replaces the previous file of the same
 * format and deletes it from storage, because two meshes for one order is one mesh too
 * many and the older one is always the wrong one.
 */
export const attachModelFile = mutation({
  args: {
    sessionKey: v.string(),
    token: v.string(),
    storageId: v.id("_storage"),
    format: v.union(v.literal("stl"), v.literal("ply")),
    bytes: v.number(),
    triangles: v.number(),
    boundingMm: v.object({ x: v.number(), y: v.number(), z: v.number() }),
  },
  handler: async (ctx, args) => {
    assertSessionKey(args.sessionKey);
    await consumeToken(ctx, args.sessionKey, args.token, "modelFile", args.storageId);

    const draft = await findDraft(ctx, args.sessionKey);
    if (!draft) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError({ code: "NO_DRAFT", he: "משהו השתבש. אפשר לרענן את העמוד" });
    }

    const now = Date.now();
    const kept = (draft.modelFiles ?? []).filter((file) => file.format !== args.format);
    for (const stale of draft.modelFiles ?? []) {
      if (stale.format === args.format) await ctx.storage.delete(stale.storageId);
    }

    await ctx.db.patch(draft._id, {
      modelFiles: [
        ...kept,
        {
          format: args.format,
          storageId: args.storageId,
          bytes: args.bytes,
          triangles: args.triangles,
          boundingMm: args.boundingMm,
          builtAt: now,
        },
      ],
      updatedAt: now,
      lastSeenAt: now,
    });
    return null;
  },
});

export const setConsent = mutation({
  args: { sessionKey: v.string(), photoShareConsent: v.boolean() },
  handler: async (ctx, { sessionKey, photoShareConsent }) => {
    assertSessionKey(sessionKey);
    const draft = await findDraft(ctx, sessionKey);
    if (!draft) return null;
    await ctx.db.patch(draft._id, { photoShareConsent, updatedAt: Date.now() });
    return null;
  },
});

/** Keeps `lastSeenAt` honest without writing anything else. */
export const touch = mutation({
  args: { sessionKey: v.string() },
  handler: async (ctx, { sessionKey }) => {
    const draft = await findDraft(ctx, sessionKey);
    if (!draft) return null;
    await ctx.db.patch(draft._id, { lastSeenAt: Date.now() });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* admin                                                                */
/* ------------------------------------------------------------------ */

export const listAdmin = query({
  args: {
    status: v.optional(draftStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await requireAdmin(ctx);
    const rows = status
      ? await ctx.db
          .query("generatorDrafts")
          .withIndex("by_status_updated", (q) => q.eq("status", status))
          .order("desc")
          .take(limit ?? 50)
      : await ctx.db
          .query("generatorDrafts")
          .withIndex("by_updated")
          .order("desc")
          .take(limit ?? 50);

    return await Promise.all(
      rows.map(async (draft) => {
        const printType = draft.printTypeId ? await ctx.db.get(draft.printTypeId) : null;
        return {
          _id: draft._id,
          status: draft.status,
          furthestStep: draft.furthestStep,
          printTypeNameHe: printType?.nameHe ?? null,
          quantity: draft.quantity,
          priceAgorot: draft.priceAgorot ?? null,
          /* the abandoned inbox shows the render, never the customer's photo */
          previewSnapshotUrl: draft.previewSnapshotId
            ? await ctx.storage.getUrl(draft.previewSnapshotId)
            : null,
          hasPhoto: draft.photoId !== undefined,
          leadId: draft.leadId ?? null,
          updatedAt: draft.updatedAt,
          lastSeenAt: draft.lastSeenAt,
        };
      }),
    );
  },
});

export const getAdmin = query({
  args: { id: v.id("generatorDrafts") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const draft = await ctx.db.get(id);
    if (!draft) return null;
    const printType = draft.printTypeId ? await ctx.db.get(draft.printTypeId) : null;
    const material = draft.materialId ? await ctx.db.get(draft.materialId) : null;
    const colors = await Promise.all(draft.colorIds.map((cid) => ctx.db.get(cid)));
    return {
      draft,
      printTypeNameHe: printType?.nameHe ?? null,
      materialNameHe: material?.nameHe ?? null,
      colorNames: colors.filter((c) => c !== null).map((c) => c.nameHe),
      photoUrl: draft.photoId ? await ctx.storage.getUrl(draft.photoId) : null,
      previewSnapshotUrl: draft.previewSnapshotId
        ? await ctx.storage.getUrl(draft.previewSnapshotId)
        : null,
    };
  },
});

/** Six bars, one per step, so a drop-off is visible instead of guessed at. */
export const funnel = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdmin(ctx);
    const since = Date.now() - (days ?? 30) * DAY;
    const rows = await ctx.db
      .query("generatorDrafts")
      .withIndex("by_updated", (q) => q.gt("updatedAt", since))
      .collect();
    return [1, 2, 3, 4, 5, 6].map((step) => ({
      step,
      reached: rows.filter((r) => r.furthestStep >= step).length,
    }));
  },
});

export const deleteDraft = mutation({
  args: { id: v.id("generatorDrafts") },
  handler: async (ctx, { id }) => {
    const admin = await requireAdmin(ctx);
    const draft = await ctx.db.get(id);
    if (!draft) return null;
    if (draft.photoId) await ctx.storage.delete(draft.photoId);
    if (draft.previewSnapshotId) await ctx.storage.delete(draft.previewSnapshotId);
    await ctx.db.delete(id);
    await logActivity(ctx, admin, {
      action: "drafts.delete",
      tableName: "generatorDrafts",
      docId: id,
      summaryHe: "מחק טיוטה והתמונה שלה",
    });
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* crons                                                                */
/* ------------------------------------------------------------------ */

export const markAbandoned = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ABANDON_AFTER_MS;
    let marked = 0;
    for (const status of ["building", "previewed"] as const) {
      const rows = await ctx.db
        .query("generatorDrafts")
        .withIndex("by_status_updated", (q) => q.eq("status", status).lt("updatedAt", cutoff))
        .collect();
      for (const draft of rows) {
        if (draft.leadId) continue;
        if (draft.lastSeenAt >= cutoff) continue;
        await ctx.db.patch(draft._id, { status: "abandoned" });
        marked += 1;
      }
    }
    return { marked };
  },
});

/**
 * RESOLUTIONS §4. Seven days, not forty five and not ninety, because that is the
 * number written next to the upload button. The photo and the render go with the
 * row, in the same transaction, so nothing survives the sentence that promised
 * it would not.
 *
 * A draft that became a lead is left alone: the order is Shai's record.
 */
export const purgeOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - DRAFT_RETENTION_MS;
    const rows = await ctx.db
      .query("generatorDrafts")
      .withIndex("by_updated", (q) => q.lt("updatedAt", cutoff))
      .take(500);

    let purged = 0;
    for (const draft of rows) {
      if (draft.leadId) continue;
      if (draft.photoId) await ctx.storage.delete(draft.photoId);
      if (draft.previewSnapshotId) await ctx.storage.delete(draft.previewSnapshotId);
      await ctx.db.delete(draft._id);
      purged += 1;
    }

    /* upload tokens outlive nothing, so they go on the same sweep */
    for (const pending of await ctx.db.query("pendingUploads").take(500)) {
      if (pending.createdAt < Date.now() - DAY) await ctx.db.delete(pending._id);
    }

    if (purged > 0) {
      await logActivity(ctx, null, {
        action: "drafts.purgeOld",
        tableName: "generatorDrafts",
        summaryHe: `נמחקו ${purged} טיוטות נטושות מלפני יותר משבוע`,
      });
    }
    return { purged };
  },
});

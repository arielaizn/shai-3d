/**
 * THE AUTHORISATION BOUNDARY (06 §A.5).
 *
 * A visitor with no session may write exactly four things:
 *   1. a row in `generatorDrafts` keyed by a sessionKey they generated
 *   2. a file in `_storage` through a one-shot token from drafts.requestPhotoUpload
 *   3. a row in `leads` through leads.submit, where every money field is server computed
 *   4. a row in `contactMessages` through contact.send
 *
 * Everything else calls `requireAdmin` as its first statement. The Next proxy and
 * the protected layout are user experience; this file is the security.
 *
 * It also holds the two helpers every module shares, so that a fractional index
 * and a rate-limit window are implemented once rather than nine times.
 */
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export type AnyCtx = QueryCtx | MutationCtx;

/** No throw. The admin shell uses this to decide what to render. */
export async function currentAdmin(ctx: AnyCtx): Promise<Doc<"admins"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!admin || admin.disabledAt) return null;
  return admin;
}

export async function requireAdmin(ctx: AnyCtx): Promise<Doc<"admins">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({ code: "UNAUTHENTICATED", he: "צריך להתחבר" });
  }
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!admin || admin.disabledAt) {
    throw new ConvexError({ code: "FORBIDDEN", he: "אין לך הרשאה" });
  }
  return admin;
}

/**
 * The role lives in `admins.role`, never in the JWT: a role in a token stays
 * valid until the token expires, so disabling an admin would take an hour to
 * bite. A database read per call is cheap and takes effect immediately.
 */
export async function requireOwner(ctx: AnyCtx): Promise<Doc<"admins">> {
  const admin = await requireAdmin(ctx);
  if (admin.role !== "owner") {
    throw new ConvexError({
      code: "FORBIDDEN_ROLE",
      he: "רק בעל האתר יכול לעשות את זה",
    });
  }
  return admin;
}

/** 8 KB ceiling on the before/after blobs, so one bad paste cannot bloat the log */
function cap(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  const json = JSON.stringify(value);
  if (json === undefined) return undefined;
  return json.length > 8192 ? { truncated: true, bytes: json.length } : value;
}

export async function logActivity(
  ctx: MutationCtx,
  admin: Doc<"admins"> | null,
  entry: {
    action: string;
    tableName: string;
    docId?: string;
    summaryHe: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await ctx.db.insert("adminActivity", {
    adminId: admin?._id,
    actorLabelHe: admin?.displayNameHe ?? "המערכת",
    action: entry.action,
    tableName: entry.tableName,
    docId: entry.docId,
    summaryHe: entry.summaryHe,
    before: cap(entry.before),
    after: cap(entry.after),
    createdAt: Date.now(),
  });
}

/* ------------------------------------------------------------------ */
/* the public side of the boundary                                      */
/* ------------------------------------------------------------------ */

/**
 * Fixed window counter. `identity` is a sessionKey or the literal "global", so a
 * single visitor cannot exhaust the budget for everyone and a botnet still hits
 * the global ceiling. Throws the Hebrew sentence the UI shows verbatim.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  action: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const key = `${action}:${identity}`;
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!row) {
    await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }
  if (now - row.windowStart >= windowMs) {
    await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    return;
  }
  if (row.count >= limit) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      he: "יותר מדי ניסיונות. אפשר לנסות שוב בעוד דקה",
    });
  }
  await ctx.db.patch(row._id, { count: row.count + 1 });
}

/**
 * The same window, without the throw. Used where being over the limit is not a
 * failure the visitor should ever see, such as a view counter: a page reload is
 * not an error, it just does not count twice.
 */
export async function tryRateLimit(
  ctx: MutationCtx,
  action: string,
  identity: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    await enforceRateLimit(ctx, action, identity, limit, windowMs);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* shared helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fractional index. A drag between two rows rewrites one row instead of twenty,
 * which matters because Shai reorders on a phone next to a running printer.
 */
export function sortBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, no I/1

/**
 * A long random id, never a running number. A sequential id in a photo URL lets
 * anyone walk the whole upload history of a thirteen year old's customers.
 */
export function randomCode(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export function randomToken(): string {
  return `${randomCode(16)}${randomCode(16)}`;
}

/** Every public query filters soft-deleted rows out. This is the one spelling of it. */
export function isVisible(doc: { active?: boolean; deletedAt?: number }): boolean {
  return doc.deletedAt === undefined && doc.active !== false;
}

export type AdminId = Id<"admins">;

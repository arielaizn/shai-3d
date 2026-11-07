/**
 * convex/admins.ts — the admin account itself.
 *
 * Shai signs in with a password and must be able to change it from inside the panel
 * without anyone touching a deployment or an env var. That is what this module is for.
 *
 * `modifyAccountCredentials` comes from @convex-dev/auth and rewrites the stored secret
 * for the Password provider. It is only reachable here after `requireAdmin`, and it can
 * only ever target the CALLER'S OWN account: the email is read from the authenticated
 * admin row, never from the arguments, so a signed-in editor cannot rewrite the owner's
 * password by passing a different address.
 */
import { v, ConvexError } from "convex/values";
import { action, internalAction, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { modifyAccountCredentials, invalidateSessions } from "@convex-dev/auth/server";
import { requireAdmin, requireOwner, currentAdmin } from "./lib/auth";

/** The signed-in admin, for the panel header and the route guard. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const admin = await currentAdmin(ctx);
    if (!admin) return null;
    return {
      id: admin._id,
      email: admin.email,
      displayNameHe: admin.displayNameHe,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt ?? null,
    };
  },
});

/** Everyone with access, owner only. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("admins").collect();
    return rows
      .filter((a) => !a.disabledAt)
      .map((a) => ({
        id: a._id,
        email: a.email,
        displayNameHe: a.displayNameHe,
        role: a.role,
        lastLoginAt: a.lastLoginAt ?? null,
      }));
  },
});

const MIN_LENGTH = 8;

/** Identity lookup for the action below. Actions have no ctx.db of their own. */
export const _self = internalQuery({
  args: {},
  handler: async (ctx) => {
    const admin = await currentAdmin(ctx);
    return admin ? { email: admin.email, userId: admin.userId } : null;
  },
});

/**
 * Change the signed-in admin's own password.
 *
 * This has to be an ACTION: `modifyAccountCredentials` and `invalidateSessions` are
 * action-only APIs in @convex-dev/auth. The account it targets is read from the
 * authenticated row through `_self`, never from the arguments, so a signed-in editor
 * cannot point it at the owner's address.
 *
 * `signOutEverywhere` defaults to true, because ending the old sessions is usually the
 * whole reason somebody changes a password.
 */
export const changePassword = action({
  args: {
    newPassword: v.string(),
    signOutEverywhere: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const self = await ctx.runQuery(internal.admins._self, {});
    if (!self) {
      throw new ConvexError({ code: "UNAUTHENTICATED", he: "צריך להתחבר מחדש" });
    }
    if (args.newPassword.length < MIN_LENGTH) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        he: `הסיסמה צריכה להיות באורך ${MIN_LENGTH} תווים לפחות`,
      });
    }

    try {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: self.email, secret: args.newPassword },
      });
    } catch {
      throw new ConvexError({
        code: "CHANGE_FAILED",
        he: "לא הצלחתי לעדכן את הסיסמה. אפשר לנסות שוב",
      });
    }

    if (args.signOutEverywhere !== false) {
      await invalidateSessions(ctx, { userId: self.userId });
    }
    return { ok: true as const };
  },
});

/**
 * BREAK GLASS. Sets the password on an account from the command line.
 *
 * `auth.ts` promised this function by name and it was never written, which is how the
 * only account on the deployment ended up with a password nobody had. It is an
 * `internalAction`, so no browser can reach it: the only caller is the Convex CLI
 * holding the deployment's admin key, which is the same level of access as reading the
 * database directly.
 *
 *     npx convex run admins:setPassword '{"email":"...","password":"..."}'
 *
 * Every session on the account ends, because the person running this is either locked
 * out or taking the account back, and both cases want the old sessions gone.
 */
export const setPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (args.password.length < MIN_LENGTH) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        he: `הסיסמה צריכה להיות באורך ${MIN_LENGTH} תווים לפחות`,
      });
    }

    const target = await ctx.runQuery(internal.admins._byEmail, { email });
    if (!target) {
      throw new ConvexError({ code: "NO_ADMIN", he: "אין חשבון מנהל לכתובת הזאת" });
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
    });
    await invalidateSessions(ctx, { userId: target.userId });
    return { ok: true as const, email };
  },
});

/** Identity lookup for the break-glass action, which has no `ctx.db` of its own. */
export const _byEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    return admin ? { userId: admin.userId, email: admin.email } : null;
  },
});

/** Rename yourself in the panel header. */
export const updateProfile = mutation({
  args: { displayNameHe: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = args.displayNameHe.trim();
    if (name.length < 2) {
      throw new ConvexError({ code: "BAD_NAME", he: "צריך שם באורך שני תווים לפחות" });
    }
    await ctx.db.patch(admin._id, { displayNameHe: name });
    return { ok: true as const };
  },
});

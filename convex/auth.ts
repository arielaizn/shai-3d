/**
 * ADMIN LOGIN. There is exactly one kind of account on this deployment and it
 * belongs to Shai. Visitors never sign in, never get a row in `users`, and never
 * reach a mutation that is not on the public list in 06 §A.5.
 *
 * `createOrUpdateUser` is defined in this file, so `afterUserCreatedOrUpdated`
 * will NEVER run (06 §B.2). Every side effect of an account appearing lives
 * inside `createOrUpdateUser`. Adding the after-hook creates a user with no
 * admins row, a login that succeeds, and a panel that rejects the only person
 * who can fix it.
 */
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const DAY = 1000 * 60 * 60 * 24;

function normaliseEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = normaliseEmail(params.email);
        if (!email.includes("@")) {
          throw new ConvexError({ code: "BAD_EMAIL", he: "כתובת מייל לא תקינה" });
        }
        return {
          email,
          name: String(params.name ?? "").trim() || undefined,
        };
      },
    }),
  ],

  session: {
    totalDurationMs: 30 * DAY,     // a forced re-login once a month
    inactiveDurationMs: 14 * DAY,  // two weeks of silence ends the session
  },

  callbacks: {
    /**
     * THE ONLY user creation path in this project.
     *
     * Three doors, all narrow:
     *   1. an existing admin signing in again
     *   2. an unconsumed, unexpired row in `adminInvites`
     *   3. BOOTSTRAP_ADMIN_EMAIL while `admins` is still empty, which closes
     *      itself the instant the first admin row exists
     */
    async createOrUpdateUser(ctx, args) {
      // The callback is handed an untyped ctx (AnyDataModel), which carries only
      // the system indexes. This is the one place the real data model is applied.
      const db = ctx.db as unknown as MutationCtx["db"];
      const now = Date.now();

      const email = normaliseEmail(args.profile.email);
      if (!email) {
        throw new ConvexError({ code: "BAD_EMAIL", he: "כתובת מייל לא תקינה" });
      }

      const existingUserId = args.existingUserId as Id<"users"> | null;

      /* ---- door 1: an account that already exists, signing in ---- */
      if (existingUserId) {
        const admin = await db
          .query("admins")
          .withIndex("by_userId", (q) => q.eq("userId", existingUserId))
          .unique();
        if (!admin || admin.disabledAt) {
          throw new ConvexError({ code: "FORBIDDEN", he: "אין לך הרשאה להיכנס" });
        }
        await db.patch(admin._id, { lastLoginAt: now });
        return existingUserId;
      }

      /**
       * RESOLUTIONS §14. The break-glass path used to lock everyone out:
       * `admins.clearPassword` deletes the authAccounts row, the person signs up
       * again, Convex Auth passes `existingUserId: null` because the Password
       * provider does not link by email without verification, and the new-account
       * branch then found `adminCount !== 0` and threw NO_INVITE forever.
       *
       * So: look for the user BEFORE inserting one. A re-signup relinks to the
       * same `users` row and the same `admins` row instead of duplicating both.
       */
      const existingUser: Doc<"users"> | null = await db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique();

      if (existingUser) {
        const admin = await db
          .query("admins")
          .withIndex("by_userId", (q) => q.eq("userId", existingUser._id))
          .unique();
        if (admin && !admin.disabledAt) {
          await db.patch(admin._id, { lastLoginAt: now });
          return existingUser._id;
        }
        if (admin && admin.disabledAt) {
          throw new ConvexError({ code: "FORBIDDEN", he: "אין לך הרשאה להיכנס" });
        }
        // A users row with no admins row: fall through, and attach an admins row
        // to the user that already exists rather than creating a second one.
      }

      /* ---- doors 2 and 3: a genuinely new admin ---- */
      const invite = await db
        .query("adminInvites")
        .withIndex("by_email", (q) => q.eq("email", email))
        .filter((q) => q.eq(q.field("consumedAt"), undefined))
        .first();

      const adminCount = (await db.query("admins").take(1)).length;
      const bootstrapEmail = normaliseEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
      const isBootstrap =
        adminCount === 0 && bootstrapEmail !== "" && email === bootstrapEmail;

      if (!invite && !isBootstrap) {
        throw new ConvexError({ code: "NO_INVITE", he: "אין הרשאה לפתוח משתמש" });
      }
      if (invite && invite.expiresAt < now) {
        throw new ConvexError({ code: "INVITE_EXPIRED", he: "ההזמנה פגה. צריך הזמנה חדשה" });
      }

      const displayNameHe = invite?.displayNameHe ?? "שי";
      const userId =
        existingUser?._id ??
        (await db.insert("users", {
          email,
          name: String(args.profile.name ?? "").trim() || displayNameHe,
          emailVerificationTime: now,
        }));

      const adminId = await db.insert("admins", {
        userId,
        role: isBootstrap ? "owner" : invite!.role,
        displayNameHe,
        email,
        createdAt: now,
        lastLoginAt: now,
      });

      if (invite) {
        await db.patch(invite._id, { consumedAt: now, consumedByUserId: userId });
      }

      await db.insert("adminActivity", {
        actorLabelHe: "המערכת",
        action: "admins.created",
        tableName: "admins",
        docId: adminId,
        summaryHe: `נפתח משתמש מנהל ל-${email}`,
        createdAt: now,
      });

      return userId;
    },
  },
});

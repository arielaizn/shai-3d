// TEMPORARY. Used once to re-bootstrap the single admin account, then deleted.
import { internalMutation } from "./_generated/server";

export const wipeAdmins = internalMutation({
  args: {},
  handler: async (ctx) => {
    let n = 0;
    for (const t of ["admins", "adminInvites"] as const) {
      for (const row of await ctx.db.query(t).collect()) {
        await ctx.db.delete(row._id); n++;
      }
    }
    for (const row of await ctx.db.query("users").collect()) {
      await ctx.db.delete(row._id); n++;
    }
    for (const t of ["authAccounts", "authSessions", "authRefreshTokens"] as const) {
      try {
        for (const row of await (ctx.db.query as never as (x: string) => { collect(): Promise<{ _id: never }[]> })(t).collect()) {
          await ctx.db.delete(row._id); n++;
        }
      } catch { /* table may not exist */ }
    }
    return { deleted: n };
  },
});

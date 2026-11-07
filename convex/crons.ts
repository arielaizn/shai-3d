import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * A tab left open on a bus is not an abandoned order. Forty five minutes of
 * silence is, and only then does the row move out of `building`.
 */
crons.hourly("mark abandoned drafts", { minuteUTC: 7 }, internal.drafts.markAbandoned, {});

/**
 * RESOLUTIONS §4. Seven days, because that is the number printed next to the
 * upload button: `אם ההזמנה לא נסגרת, היא נמחקת אחרי 7 ימים`. The photo goes
 * with the row. Spec 04 said forty five days and 06 said ninety; both were
 * sentences the site would have been breaking every single day.
 */
crons.daily("purge old drafts", { hourUTC: 0, minuteUTC: 35 }, internal.drafts.purgeOld, {});

/** Soft deletes become hard deletes after 30 days, files included. */
crons.daily("purge trash", { hourUTC: 0, minuteUTC: 20 }, internal.settings.purgeTrash, {});

/** Fixed window counters are worthless once their window closed. */
crons.hourly("sweep rate limits", { minuteUTC: 50 }, internal.settings.sweepRateLimits, {});

export default crons;

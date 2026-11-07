/**
 * Numbers, dates and the small Hebrew labels the panel repeats.
 *
 * Money never leaves the database as anything but integer agorot (06 §0), and
 * Shai never sees the word "agorot": the input takes shekels and hands back
 * agorot, and `src/lib/format/price.ts` owns everything that gets printed.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "לפני 12 דקות" · "לפני 3 שעות" · "אתמול" · "לפני 4 ימים" · "לפני 3 שבועות" */
export function relativeHe(timestamp: number, now = Date.now()): string {
  const delta = Math.max(0, now - timestamp);
  if (delta < MINUTE) return "עכשיו";
  if (delta < HOUR) {
    const minutes = Math.floor(delta / MINUTE);
    return minutes === 1 ? "לפני דקה" : `לפני ${minutes} דקות`;
  }
  if (delta < DAY) {
    const hours = Math.floor(delta / HOUR);
    return hours === 1 ? "לפני שעה" : hours === 2 ? "לפני שעתיים" : `לפני ${hours} שעות`;
  }
  const days = Math.floor(delta / DAY);
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "לפני שבוע";
  if (weeks < 5) return `לפני ${weeks} שבועות`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "לפני חודש" : `לפני ${months} חודשים`;
}

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("he-IL", { weekday: "long" });

export function dateHe(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp));
}

export function weekdayHe(timestamp: number): string {
  return dayFormatter.format(new Date(timestamp));
}

/** `<input type="date">` speaks ISO and nothing else. */
export function toDateInput(timestamp: number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return "";
  const d = new Date(timestamp);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function fromDateInput(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(`${value}T12:00:00`);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** 06 §C.5: by the hour, no exclamation marks, no emoji. */
export function greetingHe(nameHe: string, now = new Date()): string {
  const hour = now.getHours();
  const part =
    hour < 5 ? "לילה טוב" : hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
  return `${part} ${nameHe}`;
}

/* ------------------------------------------------------------------ money */

/**
 * Shekels typed by a human into integer agorot. Returns null for anything that
 * is not a number, so the field can say `רק מספרים` instead of storing NaN.
 */
export function parseShekels(input: string): number | null {
  const cleaned = input.replace(/[\s,‎‏]/g, "").replace(/[₪]/g, "");
  if (cleaned === "") return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Agorot back into the text a money field shows: 6800 → "68", 6850 → "68.50". */
export function shekelsInput(agorot: number): string {
  const value = agorot / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Basis points as a percentage a person reads: 1500 → "15". */
export function bpToPercent(bp: number): string {
  const value = bp / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function percentToBp(input: string): number | null {
  const cleaned = input.replace(/[\s%]/g, "");
  if (cleaned === "") return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** A material multiplier as the surcharge Shai understands: 1.25 → "25%". */
export function multiplierAsPercent(multiplier: number): string {
  const delta = Math.round((multiplier - 1) * 100);
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

/* ------------------------------------------------------------------ labels */

export type LeadStatus = "new" | "contacted" | "quoted" | "printing" | "done" | "lost";

export const LEAD_STATUS_HE: Record<LeadStatus, string> = {
  new: "חדש",
  contacted: "דיברתי",
  quoted: "נתתי הצעה",
  printing: "בהדפסה",
  done: "הושלם",
  lost: "לא יצא",
};

/** The stepper's order. `lost` is deliberately outside it. */
export const LEAD_FLOW: LeadStatus[] = ["new", "contacted", "quoted", "printing", "done"];

export function leadStatusTone(status: LeadStatus): "new" | "work" | "done" | "off" {
  if (status === "new") return "new";
  if (status === "done") return "done";
  if (status === "lost") return "off";
  return "work";
}

export type ContactStatus = "new" | "read" | "replied" | "spam";

export const CONTACT_STATUS_HE: Record<ContactStatus, string> = {
  new: "חדש",
  read: "נקרא",
  replied: "עניתי",
  spam: "ספאם",
};

export type DraftStatus = "building" | "previewed" | "submitted" | "abandoned";

export const DRAFT_STATUS_HE: Record<DraftStatus, string> = {
  building: "באמצע בנייה",
  previewed: "ראה תצוגה",
  submitted: "שלח הודעה",
  abandoned: "נעזב",
};

/** RESOLUTIONS §2. Six steps: סוג · תמונה · צבעים · גודל · דגם · מחיר */
export const GENERATOR_STEPS_HE = ["סוג", "תמונה", "צבעים", "גודל", "דגם", "מחיר"] as const;

export const STOCK_HE: Record<"in" | "low" | "out", string> = {
  in: "יש",
  low: "נגמר כמעט",
  out: "אזל",
};

export const FINISH_HE: Record<string, string> = {
  matte: "מט",
  glossy: "מבריק",
  silk: "משי",
  glow: "זוהר בחושך",
  wood: "עץ",
  transparent: "שקוף",
};

export const ACCENT_HE: Record<string, string> = {
  none: "בלי",
  red: "אדום",
  turquoise: "טורקיז",
  yellow: "צהוב",
  ink: "דיו",
};

export const PRICE_MODE_HE: Record<string, string> = {
  fixed: "מחיר קבוע",
  from: "מתחיל מ-",
  quote: "לפי הצעה",
};

export const COLOR_FAMILIES_HE = [
  "אדומים",
  "כחולים",
  "ירוקים",
  "צהובים",
  "לבנים ושחורים",
  "מיוחדים",
] as const;

export const ABOUT_KIND_HE: Record<string, string> = {
  opener: "פתיחה",
  paragraph: "פסקה",
  pullQuote: "משפט מודגש",
  timelineItem: "ציון דרך",
  imageFull: "תמונה",
  twoUp: "שניים בשורה",
  statement: "הצהרה",
};

/** A latin slug out of a Hebrew title, the same shape `convex/products.ts` keeps. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

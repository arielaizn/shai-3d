/**
 * src/components/products/fallback.ts
 *
 * Ariel removed the stand-in catalogue on 07.09.26: a visitor must never see a product
 * that Shai has not actually printed, and a generated photograph presented as his work
 * is a lie the page tells silently.
 *
 * So there are NO fallback products. When Convex has nothing, the catalogue renders its
 * own empty state in Shai's voice, which is honest and is already written in
 * `src/content/products.ts`.
 *
 * The filament list stays, because those are real spools he stocks and the swatch row
 * has to look the same before and after the seed runs.
 */

import type { CatalogProduct, Filament, ProductDetail } from "./model";

/* ------------------------------------------------------------------ *
 * filaments · mirrors convex/seed.ts COLORS
 * ------------------------------------------------------------------ */

export const FALLBACK_FILAMENTS: readonly Filament[] = [
  { key: "cloud-white", nameHe: "לבן ענן", hex: "#F4F2ED", familyHe: "לבנים ואפורים", finish: "matte", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "coal-black", nameHe: "שחור פחם", hex: "#1B191C", familyHe: "לבנים ואפורים", finish: "matte", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "rock-grey", nameHe: "אפור סלע", hex: "#8B8E92", familyHe: "לבנים ואפורים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "candy-red", nameHe: "אדום סוכריה", hex: "#D6202B", familyHe: "אדומים וורודים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "carrot-orange", nameHe: "כתום גזר", hex: "#F2681C", familyHe: "כתומים וצהובים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "sun-yellow", nameHe: "צהוב שמש", hex: "#FDC42B", familyHe: "כתומים וצהובים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "apple-green", nameHe: "ירוק תפוח", hex: "#4FB53F", familyHe: "ירוקים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "pool-turquoise", nameHe: "טורקיז בריכה", hex: "#17BEBB", familyHe: "ירוקים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "royal-blue", nameHe: "כחול רויאל", hex: "#2049CE", familyHe: "כחולים וסגולים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "grape-purple", nameHe: "סגול ענבים", hex: "#6B3FA0", familyHe: "כחולים וסגולים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "bubble-pink", nameHe: "ורוד בועה", hex: "#FF8FC1", familyHe: "אדומים וורודים", finish: "glossy", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "sand-beige", nameHe: "בז' חול", hex: "#D9C5A3", familyHe: "חומים", finish: "matte", isGlow: false, soldOut: false, extraCostAgorot: 0 },
  { key: "chocolate-brown", nameHe: "חום שוקולד", hex: "#4C3423", familyHe: "חומים", finish: "matte", isGlow: false, soldOut: true, extraCostAgorot: 0 },
  { key: "silk-gold", nameHe: "זהב משי", hex: "#C6A02C", familyHe: "מיוחדים", finish: "silk", isGlow: false, soldOut: false, extraCostAgorot: 400 },
  { key: "silk-silver", nameHe: "כסף משי", hex: "#BFC4C9", familyHe: "מיוחדים", finish: "silk", isGlow: false, soldOut: false, extraCostAgorot: 400 },
  { key: "glow", nameHe: "זוהר בחושך", hex: "#CFF3B8", familyHe: "מיוחדים", finish: "glow", isGlow: true, soldOut: false, extraCostAgorot: 600, emissiveHex: "#A6FF7E" },
  { key: "pine-wood", nameHe: "עץ אורן", hex: "#A87B4E", familyHe: "מיוחדים", finish: "wood", isGlow: false, soldOut: false, extraCostAgorot: 600 },
  { key: "milky-clear", nameHe: "שקוף חלבי", hex: "#E8F0EC", familyHe: "מיוחדים", finish: "transparent", isGlow: false, soldOut: false, extraCostAgorot: 400 },
];

/* ------------------------------------------------------------------ *
 * products
 * ------------------------------------------------------------------ */

const NEUTRALS = ["cloud-white", "coal-black", "rock-grey", "sand-beige"] as const;
const BRIGHTS = ["candy-red", "carrot-orange", "sun-yellow", "apple-green", "pool-turquoise", "royal-blue", "grape-purple", "bubble-pink"] as const;

/** Fixed dates so the `חדש` badge and the `חדש אצלי` sort both have something real to read. */
const DAY = 24 * 60 * 60 * 1000;
const MADE = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day, 9, 0, 0);

type Seed = ProductDetail;

export const FALLBACK_PRODUCTS: readonly CatalogProduct[] = [];
export const FALLBACK_DETAILS: Readonly<Record<string, ProductDetail>> = {};
export const FALLBACK_SLUGS: readonly string[] = [];

export function daysSince(timestamp: number, now = Date.now()): number {
  return Math.floor((now - timestamp) / 86_400_000);
}

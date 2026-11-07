/**
 * src/components/products/model.ts
 *
 * The catalogue view model, and the adapter that gets there from Convex.
 *
 * ## Why an adapter exists at all
 *
 * `RESOLUTIONS.md §א` gives `convex/schema.ts` to doc 06 and makes doc 03 a consumer,
 * so the field names doc 03 §4-§5 writes about (`nameHe`, `availableColorSlugs`,
 * `specs.printMinutes`, `modelGlbUrl`) are not the field names that exist. What exists
 * is `titleHe`, `priceMode`, `productModels`, `printTypeId`. Rather than rename the
 * schema, which is not this page's to rename, every read passes through here once and
 * the components downstream see one shape.
 *
 * The same shape is produced by `fallback.ts`, so both pages render identically before
 * a Convex deployment exists.
 *
 * ## What is derived, and what is simply unknown
 *
 * Three of the five filter dimensions have no column of their own:
 *
 *   category  derived from the product's print type (`printTypeKey`), which is the
 *             only classification a product row carries
 *   glow      `printTypeKey === "glow"`, RESOLUTIONS §5: glow is a relief printed in
 *             glow filament, so the print type is what makes an object glow
 *   custom    a product bound to a print type is one the generator can rebuild from
 *             the visitor's own photo, which is exactly what "אפשר להתאים אישית" means
 *
 * Anything still unknown stays `undefined` rather than being guessed, and `filters.ts`
 * treats an unknown dimension as unrestricted. A filter that hides a real product
 * because its metadata was thin is worse than a filter that shows one extra.
 */

import { PRODUCTS } from "@/content/products";

/* ------------------------------------------------------------------ *
 * 1 · the dimensions
 * ------------------------------------------------------------------ */

/** 09c §4.2. The eight category chips, `all` included, in chip order. */
export const CATEGORY_KEYS = [
  "figures",
  "home",
  "gifts",
  "keychains",
  "lithophane",
  "games",
  "utility",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Readonly<Record<CategoryKey, string>> = {
  figures: PRODUCTS.filters.category.figures,
  home: PRODUCTS.filters.category.home,
  gifts: PRODUCTS.filters.category.gifts,
  keychains: PRODUCTS.filters.category.keychains,
  lithophane: PRODUCTS.filters.category.lithophane,
  games: PRODUCTS.filters.category.games,
  utility: PRODUCTS.filters.category.utility,
};

export function isCategoryKey(value: string | null | undefined): value is CategoryKey {
  return typeof value === "string" && (CATEGORY_KEYS as readonly string[]).includes(value);
}

/**
 * Doc 08 §C ships six category tiles and 09c §4.2 asks for seven category chips, and
 * the two lists are not the same list. The four that match resolve to their own tile;
 * `lithophane` borrows `lighting` (doc 08 C05 is literally `פאנלים מודפסים מוארים`)
 * and `utility` borrows `desk`. `games` has no tile and falls back to the voxel glyph,
 * per doc 08 §C: "a missing file falls back to the flat SVG".
 */
export const CATEGORY_TILES: Readonly<
  Partial<Record<CategoryKey, { readonly src: string; readonly altHe: string }>>
> = {
  figures: { src: "/assets/categories/figures.webp", altHe: "שלושה פסלונים מודפסים" },
  home: { src: "/assets/categories/home.webp", altHe: "אביזרים מודפסים לבית" },
  gifts: { src: "/assets/categories/gifts.webp", altHe: "הדפסות קטנות למתנה" },
  keychains: { src: "/assets/categories/keychains.webp", altHe: "שני מחזיקי מפתחות מודפסים" },
  lithophane: { src: "/assets/categories/lighting.webp", altHe: "פאנלים מודפסים מוארים" },
  utility: { src: "/assets/categories/desk.webp", altHe: "אביזרים מודפסים לשולחן עבודה" },
};

/** RESOLUTIONS §6 locks these seven keys; this is the only place they are read. */
export type PrintTypeKey =
  | "lithophane"
  | "relief"
  | "glow"
  | "standee"
  | "keychain"
  | "magnet"
  | "framed";

/**
 * Print type to catalogue category. A magnet and a framed photo are gifts, a standee
 * is a figure, a relief and a lithophane are both "ליתופן ותמונות".
 */
const PRINT_TYPE_CATEGORY: Readonly<Record<PrintTypeKey, CategoryKey>> = {
  lithophane: "lithophane",
  relief: "lithophane",
  glow: "lithophane",
  standee: "figures",
  keychain: "keychains",
  magnet: "gifts",
  framed: "gifts",
};

export const FEATURE_KEYS = ["glow", "3d", "custom"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Readonly<Record<FeatureKey, string>> = {
  glow: PRODUCTS.filters.feature.glow,
  "3d": PRODUCTS.filters.feature.threeD,
  custom: PRODUCTS.filters.feature.custom,
};

export const PRICE_BAND_KEYS = ["0-30", "30-60", "60-120", "120+"] as const;
export type PriceBandKey = (typeof PRICE_BAND_KEYS)[number];

export const PRICE_BAND_LABELS: Readonly<Record<PriceBandKey, string>> = {
  "0-30": PRODUCTS.filters.price.under30,
  "30-60": PRODUCTS.filters.price.from30to60,
  "60-120": PRODUCTS.filters.price.from60to120,
  "120+": PRODUCTS.filters.price.over120,
};

/** Bands in integer agorot, closed at the top: `עד 30 ש״ח` includes 30. */
export const PRICE_BANDS: Readonly<Record<PriceBandKey, { min: number; max: number }>> = {
  "0-30": { min: 0, max: 3000 },
  "30-60": { min: 3001, max: 6000 },
  "60-120": { min: 6001, max: 12000 },
  "120+": { min: 12001, max: Number.MAX_SAFE_INTEGER },
};

export const SORT_KEYS = ["featured", "new", "price-asc", "price-desc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  featured: PRODUCTS.sort.featured,
  new: PRODUCTS.sort.new,
  "price-asc": PRODUCTS.sort.priceAsc,
  "price-desc": PRODUCTS.sort.priceDesc,
};

/* ------------------------------------------------------------------ *
 * 2 · the view model
 * ------------------------------------------------------------------ */

export type PriceMode = "fixed" | "from" | "quote";

export type Filament = {
  /** Stable identity for the URL and for `availableColorKeys`. */
  key: string;
  nameHe: string;
  hex: string;
  familyHe: string;
  finish: "matte" | "glossy" | "silk" | "glow" | "wood" | "transparent";
  isGlow: boolean;
  /** `stock === "out"`. The swatch stays on the grid with a strike, per 06 §A.4. */
  soldOut: boolean;
  /** Per unit, integer agorot. Added to the product price when this colour is picked. */
  extraCostAgorot: number;
  emissiveHex?: string;
};

export type CatalogProduct = {
  slug: string;
  titleHe: string;
  subtitleHe?: string;
  priceMode: PriceMode;
  /** Integer agorot. `0` when `priceMode === "quote"`, and then nothing prints. */
  priceAgorot: number;
  /** Admin authored, e.g. `הכי מבוקש`. Never the same pill as the three system badges. */
  badgeHe?: string;
  categoryKey?: CategoryKey;
  heroImageUrl?: string;
  /** Hebrew alt for the hero. Empty string means decorative, and that is deliberate. */
  heroAltHe: string;
  /** A `.glb` exists, so the detail page really can be orbited. Drives the `3D` badge. */
  hasModel: boolean;
  isGlow: boolean;
  isCustom: boolean;
  /** Printed as the `חדש` badge and used by the `חדש אצלי` sort. */
  createdAt?: number;
  featured: boolean;
  sortOrder: number;
  leadTimeDaysMin: number;
  leadTimeDaysMax: number;
  /** `undefined` means every in-stock colour, which is the normal case. */
  availableColorKeys?: readonly string[];
};

export type ProductImage = { url: string; altHe: string; width?: number; height?: number };

export type ProductSpecs = {
  widthMm?: number;
  heightMm?: number;
  depthMm?: number;
  /** Already Hebrew, e.g. `PLA משי`. */
  materialHe?: string;
  printMinutes?: number;
  weightG?: number;
  layerMm?: number;
};

export type ProductDetail = CatalogProduct & {
  descriptionHe?: string;
  sizeNoteHe?: string;
  images: readonly ProductImage[];
  /** The `.glb`, when one is attached and active. */
  modelUrl?: string;
  modelAutoRotate: boolean;
  specs: ProductSpecs;
  ogImageUrl?: string;
  seoTitleHe?: string;
  seoDescriptionHe?: string;
};

/* ------------------------------------------------------------------ *
 * 3 · Convex shapes
 *
 * Declared structurally rather than imported from `_generated`, so the adapters stay
 * pure functions a unit test can call with a literal. The real query results are
 * assignable to them; a field that disappears from the schema fails at the call site
 * in the page, which is where it should fail.
 * ------------------------------------------------------------------ */

export type ConvexProductCard = {
  slug: string;
  titleHe: string;
  subtitleHe?: string | null;
  priceMode: PriceMode;
  priceAgorot: number;
  badgeHe?: string | null;
  leadTimeDaysMin: number;
  leadTimeDaysMax: number;
  heroImageUrl?: string | null;
  featured: boolean;
  sortOrder: number;
};

export type ConvexProductDoc = ConvexProductCard & {
  descriptionHe?: string | null;
  sizeNoteHe?: string | null;
  printTypeKey?: string | null;
  ogImageUrl?: string | null;
  seoTitleHe?: string | null;
  seoDescriptionHe?: string | null;
  images: readonly {
    url?: string | null;
    altHe: string;
    width?: number;
    height?: number;
    isHero?: boolean;
  }[];
  models: readonly {
    url?: string | null;
    autoRotate?: boolean;
    boundingBoxMm?: { x: number; y: number; z: number };
  }[];
};

export type ConvexFilament = {
  _id: string;
  nameHe: string;
  hex: string;
  familyHe: string;
  finish: Filament["finish"];
  isGlow: boolean;
  stock: "in" | "low" | "out";
  extraCostAgorot: number;
  emissiveHex?: string | null;
};

/* ------------------------------------------------------------------ *
 * 4 · the adapters
 * ------------------------------------------------------------------ */

function clean(value: string | null | undefined): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

function asPrintTypeKey(value: string | null | undefined): PrintTypeKey | undefined {
  return value != null && value in PRINT_TYPE_CATEGORY ? (value as PrintTypeKey) : undefined;
}

export function filamentFromConvex(row: ConvexFilament): Filament {
  return {
    key: row._id,
    nameHe: row.nameHe,
    hex: row.hex,
    familyHe: row.familyHe,
    finish: row.finish,
    isGlow: row.isGlow,
    soldOut: row.stock === "out",
    extraCostAgorot: row.extraCostAgorot,
    emissiveHex: clean(row.emissiveHex),
  };
}

/**
 * A catalogue card. `detail` is the same product read through `products.bySlug`, which
 * is the only public query that reports the print type and whether a `.glb` exists.
 * Without it the card still renders; it just carries no category and no `3D` badge,
 * and 09c §4.4 is explicit that the badge must never promise what the detail page
 * cannot keep.
 */
export function catalogProductFromConvex(
  card: ConvexProductCard,
  detail?: ConvexProductDoc | null,
): CatalogProduct {
  const printType = asPrintTypeKey(detail?.printTypeKey);
  const hero = detail?.images.find((image) => image.isHero) ?? detail?.images[0];

  return {
    slug: card.slug,
    titleHe: card.titleHe,
    subtitleHe: clean(card.subtitleHe),
    priceMode: card.priceMode,
    priceAgorot: card.priceAgorot,
    badgeHe: clean(card.badgeHe),
    categoryKey: printType ? PRINT_TYPE_CATEGORY[printType] : undefined,
    heroImageUrl: clean(card.heroImageUrl) ?? clean(hero?.url),
    heroAltHe: hero?.altHe ?? "",
    hasModel: (detail?.models ?? []).some((model) => clean(model.url) !== undefined),
    isGlow: printType === "glow",
    isCustom: printType !== undefined,
    featured: card.featured,
    sortOrder: card.sortOrder,
    leadTimeDaysMin: card.leadTimeDaysMin,
    leadTimeDaysMax: card.leadTimeDaysMax,
  };
}

export function productDetailFromConvex(doc: ConvexProductDoc): ProductDetail {
  const model = doc.models.find((entry) => clean(entry.url) !== undefined);
  const box = model?.boundingBoxMm;

  return {
    ...catalogProductFromConvex(doc, doc),
    descriptionHe: clean(doc.descriptionHe),
    sizeNoteHe: clean(doc.sizeNoteHe),
    // `flatMap` and not `map().filter()`: a predicate narrowing to `ProductImage` is not
    // assignable to a mapped element whose `url` is still `string | undefined`, and
    // TypeScript rejects it (TS2677). Dropping the row inside the map keeps `url` a
    // `string` at the point it is written, so no predicate is needed.
    images: doc.images.flatMap((image) => {
      const url = clean(image.url);
      if (url === undefined) return [];
      return [{ url, altHe: image.altHe, width: image.width, height: image.height }];
    }),
    modelUrl: clean(model?.url),
    modelAutoRotate: model?.autoRotate ?? true,
    // The bounding box is measured off the uploaded mesh, so it is the truest set of
    // dimensions the site has. Rounded to whole millimetres: a printer that holds
    // 0.1mm does not need to advertise 61.4382mm.
    specs: box
      ? {
          widthMm: Math.round(box.x),
          heightMm: Math.round(box.y),
          depthMm: Math.round(box.z),
        }
      : {},
    ogImageUrl: clean(doc.ogImageUrl),
    seoTitleHe: clean(doc.seoTitleHe),
    seoDescriptionHe: clean(doc.seoDescriptionHe),
  };
}

/* ------------------------------------------------------------------ *
 * 5 · value formatting for the spec table
 *
 * 09c §5.3 gives the shapes. Every one of them returns digits only, because the
 * caller prints `<bdi>{digits}</bdi> {unit}` and RESOLUTIONS §18 isolates the digits
 * alone, never the Hebrew unit with them.
 * ------------------------------------------------------------------ */

/** `60x22x4`. ASCII `x`, which is what the WhatsApp builder writes too. */
export function formatDimensions(specs: ProductSpecs): string | undefined {
  const { widthMm, heightMm, depthMm } = specs;
  if (widthMm === undefined || heightMm === undefined || depthMm === undefined) return undefined;
  return `${widthMm}x${heightMm}x${depthMm}`;
}

/**
 * `45 דקות` · `שעה ו-20 דקות` · `שעתיים ו-40 דקות` · `3 שעות`.
 *
 * 09c §5.3 writes the example as `2 שעות ו-40 דקות`. Hebrew has a dual, and
 * RESOLUTIONS §15 already rejected `1 שקלים` in exactly this position, so one and two
 * are spelled rather than counted. Flagged in the return for the copy owner.
 */
export function formatPrintTime(minutes: number | undefined): string | undefined {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  const hoursHe = hours === 0 ? null : hours === 1 ? "שעה" : hours === 2 ? "שעתיים" : `${hours} שעות`;
  const minutesHe = rest === 0 ? null : rest === 1 ? "דקה" : `${rest} דקות`;

  if (hoursHe && minutesHe) return `${hoursHe} ו-${minutesHe}`;
  return hoursHe ?? minutesHe ?? undefined;
}

/**
 * The digits of the lead time: `3`, or `2 עד 4` when the window is a range.
 *
 * Digits only, like every other formatter here. A one day lead time has no plural to
 * fall into, so the spec table prints `יום אחד` whole instead of calling this.
 */
export function formatLeadTime(min: number, max: number): string {
  return min === max ? `${min}` : `${min} עד ${max}`;
}

/* ------------------------------------------------------------------ *
 * 6 · the palette a single product can be printed in
 * ------------------------------------------------------------------ */

/**
 * `availableColorKeys === undefined` means **every colour**, not none. Shai prints most
 * objects in whatever spool he owns, and `filters.ts` reads an unset list the same way:
 * an unknown restriction is not a restriction.
 *
 * A list that narrows to nothing (every named colour has since been retired from the
 * admin) falls back to the full palette rather than showing an empty picker, because a
 * product with no colours is a product nobody can order.
 */
export function narrowPalette(
  palette: readonly Filament[],
  availableColorKeys: readonly string[] | undefined,
): readonly Filament[] {
  if (!availableColorKeys || availableColorKeys.length === 0) return palette;
  const narrowed = palette.filter((filament) => availableColorKeys.includes(filament.key));
  return narrowed.length > 0 ? narrowed : palette;
}

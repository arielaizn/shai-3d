/**
 * src/components/products/filters.ts
 *
 * Doc 03 §4.3. Five dimensions, all of them in the URL, and one pure function that
 * turns a product list plus a filter state into what the grid renders.
 *
 * It is pure and framework free on purpose: the catalogue filters in the browser with
 * no round trip (the whole published list arrives in one read), and a pure reducer is
 * the only way that stays testable. `filters.test.ts` covers the combining rules.
 *
 * ## The two combining rules, and why they differ
 *
 * Colours are **OR**: a visitor who taps red and yellow wants either.
 * Features are **AND**: a visitor who taps "זוהר בחושך" and "אפשר לסובב בתלת ממד"
 * wants one object that does both.
 *
 * ## Unknown is not "no"
 *
 * A product whose colour list is unknown passes every colour filter, and a product
 * with no category passes only `הכול`. Shai prints most objects in any spool he owns,
 * so an unset colour list means "any", not "none"; a missing category is genuinely
 * missing information and inventing one would put the object under a wrong chip.
 */

import {
  PRICE_BANDS,
  type CatalogProduct,
  type CategoryKey,
  type FeatureKey,
  type PriceBandKey,
  type SortKey,
  isCategoryKey,
} from "./model";
import {
  CATEGORY_LABELS,
  FEATURE_KEYS,
  FEATURE_LABELS,
  PRICE_BAND_KEYS,
  PRICE_BAND_LABELS,
  SORT_KEYS,
} from "./model";

export type Filters = {
  cat: CategoryKey | "all";
  /** Filament keys, OR combined. */
  colors: readonly string[];
  /** AND combined. */
  feats: readonly FeatureKey[];
  price: PriceBandKey | null;
  sort: SortKey;
};

export const DEFAULT_FILTERS: Filters = {
  cat: "all",
  colors: [],
  feats: [],
  price: null,
  sort: "featured",
};

/** Anything with a `get`, so this takes both `URLSearchParams` and Next's readonly one. */
export type ReadableParams = { get(name: string): string | null };

const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * URL
 * ------------------------------------------------------------------ */

function splitList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseFilters(params: ReadableParams): Filters {
  const cat = params.get("cat");
  const price = params.get("price");
  const sort = params.get("sort");

  const feats = splitList(params.get("feat")).filter((value): value is FeatureKey =>
    (FEATURE_KEYS as readonly string[]).includes(value),
  );

  return {
    cat: isCategoryKey(cat) ? cat : "all",
    // deduplicated, because `?color=a,a` from a shared link would otherwise make the
    // active-filter counter read 2 for one swatch
    colors: Array.from(new Set(splitList(params.get("color")))),
    feats: Array.from(new Set(feats)),
    price:
      price != null && (PRICE_BAND_KEYS as readonly string[]).includes(price)
        ? (price as PriceBandKey)
        : null,
    sort: sort != null && (SORT_KEYS as readonly string[]).includes(sort) ? (sort as SortKey) : "featured",
  };
}

/**
 * The query string, with every default omitted so a clean catalogue is `/products`
 * with nothing after it. Keys are written in a fixed order, so the same filter state
 * always produces the same string and the URL does not churn between renders.
 */
export function serializeFilters(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.cat !== "all") params.set("cat", filters.cat);
  if (filters.colors.length > 0) params.set("color", filters.colors.join(","));
  if (filters.feats.length > 0) params.set("feat", filters.feats.join(","));
  if (filters.price) params.set("price", filters.price);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params.toString();
}

/** The number in `סינון ({n})`. Sort is a view, not a filter, so it never counts. */
export function countActive(filters: Filters): number {
  return (
    (filters.cat === "all" ? 0 : 1) +
    filters.colors.length +
    filters.feats.length +
    (filters.price ? 1 : 0)
  );
}

export function sameFilters(a: Filters, b: Filters): boolean {
  return serializeFilters(a) === serializeFilters(b);
}

/* ------------------------------------------------------------------ *
 * matching
 * ------------------------------------------------------------------ */

export function isNewProduct(product: CatalogProduct, now = Date.now()): boolean {
  return product.createdAt !== undefined && now - product.createdAt <= NEW_WINDOW_MS;
}

function matchesFeature(product: CatalogProduct, feature: FeatureKey): boolean {
  if (feature === "glow") return product.isGlow;
  if (feature === "3d") return product.hasModel;
  return product.isCustom;
}

function matchesColors(product: CatalogProduct, colors: readonly string[]): boolean {
  if (colors.length === 0) return true;
  const available = product.availableColorKeys;
  // unknown restriction is not a restriction: see the file header
  if (available === undefined || available.length === 0) return true;
  return colors.some((key) => available.includes(key));
}

function matchesPrice(product: CatalogProduct, band: PriceBandKey | null): boolean {
  if (band === null) return true;
  // a product with no price cannot sit in a price band; it sits outside the question
  if (product.priceMode === "quote") return false;
  const { min, max } = PRICE_BANDS[band];
  return product.priceAgorot >= min && product.priceAgorot <= max;
}

export function matchesFilters(product: CatalogProduct, filters: Filters): boolean {
  if (filters.cat !== "all" && product.categoryKey !== filters.cat) return false;
  if (!matchesColors(product, filters.colors)) return false;
  if (!filters.feats.every((feature) => matchesFeature(product, feature))) return false;
  return matchesPrice(product, filters.price);
}

/* ------------------------------------------------------------------ *
 * sorting
 * ------------------------------------------------------------------ */

/**
 * `מומלצים` puts the featured objects first and then follows Shai's own drag order,
 * which is the order he arranged them in the admin panel and the only editorial
 * signal the catalogue has.
 *
 * `חדש אצלי` needs a creation date. `products.list` does not return one, so a product
 * read from Convex falls back to its sort order and the newest thing Shai dragged to
 * the top still leads. Nothing is invented and nothing is dropped.
 *
 * A `quote` product has no price, so it sorts last in both price directions rather
 * than pretending to cost nothing.
 */
function comparePrice(a: CatalogProduct, b: CatalogProduct, direction: 1 | -1): number {
  const aQuote = a.priceMode === "quote";
  const bQuote = b.priceMode === "quote";
  if (aQuote !== bQuote) return aQuote ? 1 : -1;
  if (aQuote && bQuote) return a.sortOrder - b.sortOrder;
  const delta = (a.priceAgorot - b.priceAgorot) * direction;
  return delta !== 0 ? delta : a.sortOrder - b.sortOrder;
}

export function sortProducts(
  products: readonly CatalogProduct[],
  sort: SortKey,
): CatalogProduct[] {
  const list = [...products];
  switch (sort) {
    case "featured":
      return list.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
    case "new":
      return list.sort((a, b) => {
        const delta = (b.createdAt ?? 0) - (a.createdAt ?? 0);
        return delta !== 0 ? delta : a.sortOrder - b.sortOrder;
      });
    case "price-asc":
      return list.sort((a, b) => comparePrice(a, b, 1));
    case "price-desc":
      return list.sort((a, b) => comparePrice(a, b, -1));
  }
}

/** Filter, then sort. The grid renders exactly what comes out of here. */
export function applyFilters(
  products: readonly CatalogProduct[],
  filters: Filters,
): CatalogProduct[] {
  return sortProducts(
    products.filter((product) => matchesFilters(product, filters)),
    filters.sort,
  );
}

/* ------------------------------------------------------------------ *
 * chip counts
 * ------------------------------------------------------------------ */

/**
 * Doc 03 §4.3 renders a superscript count on each chip. It is computed against the
 * rest of the filter state with this dimension released, which is what makes the
 * number a promise: tapping a chip that reads 4 lands on four objects, every time.
 */
export function countFor(
  products: readonly CatalogProduct[],
  filters: Filters,
  candidate: Partial<Filters>,
): number {
  const next = { ...filters, ...candidate };
  return products.reduce((total, product) => total + (matchesFilters(product, next) ? 1 : 0), 0);
}

/* ------------------------------------------------------------------ *
 * describing the filter, for the WhatsApp message
 * ------------------------------------------------------------------ */

/**
 * 09c §4.5: the message the empty state sends carries the active filter, because
 * "לא מצאתי" is useless to Shai and "חיפשתי מחזיקי מפתחות זוהרים" tells him what to
 * print next. Every word comes from an approved chip label, joined with a comma, so
 * nothing new enters the copy.
 *
 * With nothing filtered at all the catalogue itself is empty, and the phrase falls
 * back to the noun the site already uses for the page.
 */
export function describeActive(
  filters: Filters,
  colorName: (key: string) => string | undefined = () => undefined,
): string {
  const parts: string[] = [];
  if (filters.cat !== "all") parts.push(CATEGORY_LABELS[filters.cat]);
  for (const feature of filters.feats) parts.push(FEATURE_LABELS[feature]);
  for (const key of filters.colors) {
    const name = colorName(key);
    if (name) parts.push(name);
  }
  if (filters.price) parts.push(PRICE_BAND_LABELS[filters.price]);
  return parts.length > 0 ? parts.join(", ") : "דגמים";
}

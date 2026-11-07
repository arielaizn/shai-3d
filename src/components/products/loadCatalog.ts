/**
 * src/components/products/loadCatalog.ts
 *
 * The one server-side read behind both product routes, and the fallback that keeps
 * them rendering when there is no deployment to read from.
 *
 * ## Why one loader for two pages
 *
 * Doc 03 §1 lists `products.listPublished`, `products.getBySlug`, `products.listSlugs`,
 * `products.facets` and `products.listRelated`. `convex/products.ts` is owned by doc 06
 * and ships `list`, `bySlug` and `featured`. The three that do not exist are all views
 * over the same published set, so they are computed here instead of being invented as
 * new Convex functions in a file this page does not own.
 *
 * That means the catalogue and the detail page want the same thing: every published
 * product, with its print type and its `.glb` resolved. `React.cache` collapses that to
 * one fetch per request, so `/products/[slug]` reading the catalogue for its related
 * rail costs nothing extra.
 *
 * ## The cost, stated plainly
 *
 * `products.list` returns cards. A card carries no print type and no model, and those
 * two facts drive the category filter, the `3D` badge and the whole detail page, so a
 * `bySlug` read follows per card. That is N+1 requests to Convex per ISR revalidation,
 * bounded by `CARD_LIMIT`. For a catalogue of tens of objects revalidating once a
 * minute this is cheap and it is honest; if the catalogue ever grows past a few hundred
 * the right fix is a single Convex query that returns the print type key and a model
 * flag on the card, and this file collapses to one read.
 *
 * ## The fallback is not a nicety
 *
 * `convex/seed.ts` seeds settings, materials, filaments, print types and pricing, and
 * seeds **no products**. Without `fallback.ts` the catalogue is an empty grid on the
 * day the site goes up, so an empty answer from Convex is treated exactly like no
 * answer at all.
 */

import { cache } from "react";

import { fetchQuery } from "convex/nextjs";

import { api } from "../../../convex/_generated/api";

import {
  FALLBACK_DETAILS,
  FALLBACK_FILAMENTS,
  FALLBACK_PRODUCTS,
} from "./fallback";
import {
  catalogProductFromConvex,
  filamentFromConvex,
  productDetailFromConvex,
  type CatalogProduct,
  type ConvexProductCard,
  type ConvexProductDoc,
  type Filament,
  type ProductDetail,
} from "./model";

/** `products.list` caps itself at 60. Named here so the N+1 above has a visible bound. */
const CARD_LIMIT = 60;

export type Catalog = {
  products: readonly CatalogProduct[];
  /** Keyed by slug. Every product in `products` has an entry. */
  details: Readonly<Record<string, ProductDetail>>;
  palette: readonly Filament[];
  /** False when the seed content is on screen, which the pages do not announce. */
  live: boolean;
};

function hasConvex(): boolean {
  return typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string"
    && process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;
}

/**
 * One read, one fallback. A cold deployment, a network blip or an unseeded table all
 * land in the same place: the page still renders and nothing on it says "error".
 */
async function read<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasConvex()) return fallback;
  try {
    return await run();
  } catch {
    return fallback;
  }
}

/**
 * `products.bySlug` returns the document without the three card fields, because a
 * detail page has no use for them. `productDetailFromConvex` reads a card and a
 * document as one shape, so the card's own values are folded back in here rather than
 * loosening the type and letting `featured` become a guess.
 */
function mergeDoc(
  doc: Awaited<ReturnType<typeof fetchBySlug>>,
  card?: ConvexProductCard,
): ConvexProductDoc | null {
  if (!doc) return null;
  return {
    ...doc,
    featured: card?.featured ?? false,
    sortOrder: card?.sortOrder ?? 0,
    heroImageUrl: card?.heroImageUrl ?? null,
  };
}

function fetchBySlug(slug: string) {
  return fetchQuery(api.products.bySlug, { slug });
}

export const loadPalette = cache(async function loadPalette(): Promise<readonly Filament[]> {
  const rows = await read(() => fetchQuery(api.filaments.listActive, {}), []);
  return rows.length > 0 ? rows.map(filamentFromConvex) : FALLBACK_FILAMENTS;
});

export const loadCatalog = cache(async function loadCatalog(): Promise<Catalog> {
  const palette = await loadPalette();

  const cards = await read(() => fetchQuery(api.products.list, { limit: CARD_LIMIT }), []);
  if (cards.length === 0) {
    return { products: FALLBACK_PRODUCTS, details: FALLBACK_DETAILS, palette, live: false };
  }

  const docs = await Promise.all(
    cards.map(async (card) => mergeDoc(await read(() => fetchBySlug(card.slug), null), card)),
  );

  const products: CatalogProduct[] = [];
  const details: Record<string, ProductDetail> = {};

  cards.forEach((card, index) => {
    const doc = docs[index];
    products.push(catalogProductFromConvex(card, doc));
    if (doc) details[card.slug] = productDetailFromConvex(doc);
  });

  return { products, details, palette, live: true };
});

/**
 * One product, and the palette it can be printed in.
 *
 * A slug that is not in the catalogue is still looked up directly, because
 * `dynamicParams` lets a page be requested before the catalogue read has caught up
 * with a product Shai published a minute ago.
 */
export const loadProduct = cache(async function loadProduct(
  slug: string,
): Promise<ProductDetail | null> {
  const catalog = await loadCatalog();
  const known = catalog.details[slug];
  if (known) return known;
  if (!catalog.live) return FALLBACK_DETAILS[slug] ?? null;

  const doc = mergeDoc(await read(() => fetchBySlug(slug), null));
  return doc ? productDetailFromConvex(doc) : null;
});

/** `generateStaticParams`. Falls back to the seed slugs when Convex is unreachable. */
export async function loadSlugs(): Promise<readonly string[]> {
  const { products } = await loadCatalog();
  return products.map((product) => product.slug);
}

/**
 * Doc 03 §5.4. `relatedSlugs` when an admin has set them, otherwise same-category
 * published products by sort order, the current one excluded.
 *
 * The schema carries no `relatedSlugs` column, so the same-category branch is the only
 * one that runs today. When the category is unknown the rail falls back to the rest of
 * the catalogue rather than rendering empty: four more objects Shai has made is a
 * better bottom of the page than a gap.
 */
export function relatedProducts(
  all: readonly CatalogProduct[],
  product: CatalogProduct,
  limit = 4,
): CatalogProduct[] {
  const others = all.filter((entry) => entry.slug !== product.slug);
  const byOrder = (a: CatalogProduct, b: CatalogProduct) => a.sortOrder - b.sortOrder;

  const sameCategory = product.categoryKey
    ? others.filter((entry) => entry.categoryKey === product.categoryKey).sort(byOrder)
    : [];
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const rest = others
    .filter((entry) => !sameCategory.includes(entry))
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return byOrder(a, b);
    });

  return [...sameCategory, ...rest].slice(0, limit);
}

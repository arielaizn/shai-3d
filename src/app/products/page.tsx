import * as React from "react";
import type { Metadata } from "next";

import { Container } from "@/components/home/Band";
import { ClosingCta } from "@/components/home/ClosingCta";
import { ScrollSentinel, StickyWhatsApp } from "@/components/layout/StickyWhatsApp";
import { Skeleton } from "@/components/ui/Skeleton";
import { CatalogHeader } from "@/components/products/CatalogHeader";
import { CatalogView } from "@/components/products/CatalogView";
import { loadCatalog } from "@/components/products/loadCatalog";
import { META_PRODUCTS } from "@/content/meta";

/**
 * PRODUCTS CATALOG · doc 03 §4.
 *
 * Section order: header, filter bar, result count, grid with the generator strip cut
 * into it after the second row, empty state when nothing matches, closing band.
 *
 * **The page is a shell and the grid is an island.** Everything Convex knows is read
 * here, on the server, once; the island below owns only the filter state, and that
 * state lives in the URL rather than in React. Doc 03 §0.7: the catalogue is tens of
 * items, so filtering client side over the whole published list beats a round trip per
 * chip, and the URL being the state is what makes the back button walk the filter
 * history and a shared link land on the same grid.
 *
 * **`Suspense` around the island is not optional.** `CatalogView` calls
 * `useSearchParams`, and Next refuses to statically render a page whose client tree
 * reads the query string without a boundary to stream it behind. The fallback is the
 * grid's own skeleton, so the shape of the page never moves.
 *
 * **The read cannot take the page down.** `loadCatalog` swallows a missing
 * `NEXT_PUBLIC_CONVEX_URL`, a cold deployment and a failed query alike, and hands back
 * the seed catalogue. `convex/seed.ts` seeds no products, so on the day the site goes
 * up this is the only reason the grid is not empty.
 *
 * [deviation, flagged: doc 03 §4.7 asks for `ClosingCta variant="compact"`. The
 * component from §3.7 carries no variant and its secondary action is `לראות דגמים`,
 * which on this route points at the page it is already on. It ships as it stands
 * rather than growing a variant in a file this page does not own; the fix is one prop
 * on `src/components/home/ClosingCta.tsx`.]
 */

/**
 * `convex/nextjs` hardcodes `client.setFetchOptions({ cache: "no-store" })`, so the
 * catalogue read can never sit in the static cache. Declared rather than inferred: a
 * build with no `NEXT_PUBLIC_CONVEX_URL` performs no fetch at all, Next would prerender
 * this page as static, and the first background revalidation would then fail with
 * `Page changed from static to dynamic at runtime`. The sibling detail route was
 * observed doing exactly that against a production build.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // absolute: META_PRODUCTS.title already carries the brand, and the root layout's
  // template would otherwise append it a second time
  title: { absolute: META_PRODUCTS.title },
  description: META_PRODUCTS.description,
  alternates: { canonical: META_PRODUCTS.canonical },
  openGraph: {
    title: META_PRODUCTS.og.title,
    description: META_PRODUCTS.og.description,
    type: "website",
    locale: "he_IL",
  },
};

export default async function ProductsPage() {
  const { products, palette } = await loadCatalog();
  // One clock for the whole grid, taken here so the `חדש` window is evaluated once per
  // render instead of once per card, and so it cannot drift between server and client.
  const now = Date.now();

  return (
    <>
      <main id="main-content" tabIndex={-1} className="[min-inline-size:0]">
        {/*
          `clip` on the section, not on the grid: a card at ±2deg grows its bounding box
          and in RTL that overflow leaves to the left and puts a scrollbar on the whole
          document. Clipping at the viewport edge keeps every card's shadow intact,
          and `clip` rather than `hidden` so the two sticky filter bars inside still
          stick.
        */}
        <section className="[overflow-x:clip] pb-16 pt-8 md:pb-24 md:pt-12 [min-inline-size:0]">
          <Container>
            <CatalogHeader />
            <ScrollSentinel />

            <React.Suspense fallback={<CatalogSkeleton />}>
              <CatalogView products={products} palette={palette} now={now} />
            </React.Suspense>
          </Container>
        </section>

        <ClosingCta />
      </main>

      <StickyWhatsApp variant="catalog" />
    </>
  );
}

/** The shape of the grid, held while the island reads the query string. */
function CatalogSkeleton() {
  return (
    <div className="pt-8 [min-inline-size:0]" aria-hidden="true">
      <Skeleton height="3.5rem" radius="var(--radius-full)" className="mb-6" />
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))] [min-inline-size:0]">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <div key={index} className="flex flex-col gap-3 [min-inline-size:0]">
            <Skeleton variant="block" height="10.5rem" radius="var(--radius-xl)" />
            <Skeleton height="1rem" width="80%" />
            <Skeleton height="0.875rem" width="55%" />
          </div>
        ))}
      </div>
    </div>
  );
}

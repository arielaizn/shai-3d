"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { PRODUCTS } from "@/content/products";

import { CatalogEmptyCatalogue } from "./CatalogEmptyCatalogue";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { CatalogMobileBar } from "./CatalogMobileBar";
import { FilterSheet } from "./FilterSheet";
import { ProductFilterBar } from "./ProductFilterBar";
import { ProductGrid } from "./ProductGrid";
import {
  DEFAULT_FILTERS,
  applyFilters,
  countActive,
  parseFilters,
  serializeFilters,
  type Filters,
} from "./filters";
import type { CatalogProduct, Filament } from "./model";

/**
 * The catalogue island, doc 03 §4.
 *
 * **The URL is the state.** There is no `useState` holding a filter anywhere in this
 * tree. `parseFilters(useSearchParams())` runs on every render, a chip press writes
 * `router.replace`, and the render that follows reads the URL back. That is what makes
 * the back button walk the filter history, makes a shared link land on the same grid,
 * and makes a restored scroll position land on the same objects.
 *
 * **Filtering is client side over the whole published list**, per doc 03 §0.7. The
 * catalogue is tens of items, so a server round trip per chip press would be slower
 * than the render and would lose the bounce the chips are built for.
 *
 * `scroll: false` on every write. Without it Next scrolls to the top on each chip,
 * and on a phone that throws away the visitor's place mid-scan.
 */

export type CatalogViewProps = {
  products: readonly CatalogProduct[];
  palette: readonly Filament[];
  /** One clock for the whole grid, taken on the server so `חדש` is stable per render. */
  now: number;
};

export function CatalogView({ products, palette, now }: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const filters = parseFilters(searchParams);
  const visible = applyFilters(products, filters);
  const active = countActive(filters);

  const write = React.useCallback(
    (next: Filters) => {
      const query = serializeFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const patch = React.useCallback(
    (next: Partial<Filters>) => write({ ...filters, ...next }),
    // `filters` is rebuilt from the URL on every render, so it is compared by the one
    // string that identifies it rather than by reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [write, serializeFilters(filters)],
  );

  /** Clearing keeps the sort. A visitor who chose `מחיר: מהנמוך` did not ask to undo it. */
  const clear = React.useCallback(
    () => write({ ...DEFAULT_FILTERS, sort: filters.sort }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [write, filters.sort],
  );

  /**
   * Nothing published yet. `fallback.ts` carries the ruling that made this a real
   * state rather than a theoretical one: there is no stand-in catalogue, because a
   * visitor must never see a product Shai has not actually printed. Filter chips over
   * an empty set are chrome that makes the emptiness look like a broken page, so the
   * whole apparatus is skipped and the page says what is true.
   */
  if (products.length === 0) return <CatalogEmptyCatalogue />;

  const countLabel =
    visible.length === 1
      ? PRODUCTS.resultCountOne
      : PRODUCTS.resultCount.replace("{n}", String(visible.length));

  return (
    <>
      <ProductFilterBar
        products={products}
        palette={palette}
        filters={filters}
        onChange={patch}
      />

      <CatalogMobileBar
        products={products}
        filters={filters}
        onChange={patch}
        onOpenSheet={() => setSheetOpen(true)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 pt-5 [min-inline-size:0]">
        {/*
          RESOLUTIONS §18: only the digits are isolated, never the Hebrew noun with
          them. `role="status"` makes the line a polite live region, so a filter press
          announces how many objects are behind it instead of changing the grid in
          silence.
        */}
        <p
          role="status"
          className="[min-inline-size:0]"
          style={{
            fontFamily: "var(--font-rubik), system-ui, sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "var(--color-text-muted)",
          }}
        >
          {visible.length === 1 ? (
            countLabel
          ) : (
            <>
              <bdi dir="ltr" className="tabular-nums">
                {visible.length}
              </bdi>{" "}
              {PRODUCTS.resultCount.replace("{n} ", "")}
            </>
          )}
        </p>

        {active > 0 ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            {PRODUCTS.filters.clear}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <CatalogEmptyState filters={filters} palette={palette} onClear={clear} />
      ) : (
        <ProductGrid products={visible} now={now} eager={4} aria-label={PRODUCTS.header.heading} />
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setSheetOpen(false);
          write(next);
        }}
        filters={filters}
        products={products}
        palette={palette}
      />
    </>
  );
}

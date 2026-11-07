"use client";

import * as React from "react";

import { PRODUCTS } from "@/content/products";

import { ColorFilterRow } from "./ColorFilterRow";
import { FilterChip } from "./FilterChip";
import { SortSelect } from "./SortSelect";
import { countFor, type Filters } from "./filters";
import { useHeaderOffset } from "./useHeaderOffset";
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  FEATURE_KEYS,
  FEATURE_LABELS,
  PRICE_BAND_KEYS,
  PRICE_BAND_LABELS,
  type CatalogProduct,
  type Filament,
} from "./model";

/**
 * The desktop filter bar, doc 03 §4.2. Sticky under the header at `top-20`, cream at
 * 94% with a blur behind it, one hairline underneath.
 *
 * Two rows, in the order the eye reads them in RTL: categories from the start edge,
 * then the swatch row, then the sort control on the end edge; features and price
 * underneath. Below 1024 the whole thing is replaced by `FilterSheet`.
 *
 * Every chip carries the count it would produce **with its own dimension released**,
 * so the number on the chip is a promise: tap a chip that reads 4 and four objects
 * arrive. That is `countFor` in `filters.ts`.
 */

export type ProductFilterBarProps = {
  products: readonly CatalogProduct[];
  palette: readonly Filament[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
};

export function ProductFilterBar({ products, palette, filters, onChange }: ProductFilterBarProps) {
  // 80px is the desktop navigation row alone, the value that is correct once the
  // announcement bar has been dismissed
  const offset = useHeaderOffset(80);

  function toggleFeature(key: (typeof FEATURE_KEYS)[number]) {
    const next = filters.feats.includes(key)
      ? filters.feats.filter((entry) => entry !== key)
      : [...filters.feats, key];
    onChange({ feats: next });
  }

  function toggleColor(key: string) {
    const next = filters.colors.includes(key)
      ? filters.colors.filter((entry) => entry !== key)
      : [...filters.colors, key];
    onChange({ colors: next });
  }

  return (
    <div
      className="sticky z-30 hidden lg:block [min-inline-size:0]"
      style={{
        insetBlockStart: offset,
        backgroundColor: "color-mix(in oklab, var(--color-cream-100) 94%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBlockEndWidth: "1px",
        borderBlockEndColor: "color-mix(in oklab, var(--color-ink-900) 8%, transparent)",
      }}
    >
      <div className="flex flex-col gap-3 py-4 [min-inline-size:0]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 [min-inline-size:0]">
          <div
            role="group"
            aria-label={PRODUCTS.filters.category.label}
            className="flex flex-wrap items-center gap-2 [min-inline-size:0]"
          >
            <FilterChip
              selected={filters.cat === "all"}
              onToggle={() => onChange({ cat: "all" })}
              count={countFor(products, filters, { cat: "all" })}
            >
              {PRODUCTS.filters.category.all}
            </FilterChip>

            {CATEGORY_KEYS.map((key) => (
              <FilterChip
                key={key}
                selected={filters.cat === key}
                onToggle={() => onChange({ cat: filters.cat === key ? "all" : key })}
                count={countFor(products, filters, { cat: key })}
              >
                {CATEGORY_LABELS[key]}
              </FilterChip>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-4 [min-inline-size:0]">
            <div className="flex items-center gap-2 [min-inline-size:0]">
              <span
                id="catalog-color-label"
                style={{
                  fontFamily: "var(--font-rubik), system-ui, sans-serif",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--color-text-muted)",
                }}
              >
                {PRODUCTS.filters.color.label}
              </span>
              <ColorFilterRow
                palette={palette}
                selected={filters.colors}
                onToggle={toggleColor}
                labelledBy="catalog-color-label"
              />
            </div>

            <SortSelect value={filters.sort} onChange={(sort) => onChange({ sort })} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 [min-inline-size:0]">
          <div
            role="group"
            aria-label={PRODUCTS.filters.feature.label}
            className="flex flex-wrap items-center gap-2 [min-inline-size:0]"
          >
            {FEATURE_KEYS.map((key) => (
              <FilterChip
                key={key}
                selected={filters.feats.includes(key)}
                onToggle={() => toggleFeature(key)}
                count={countFor(products, filters, {
                  feats: filters.feats.includes(key)
                    ? filters.feats.filter((entry) => entry !== key)
                    : [...filters.feats, key],
                })}
              >
                {FEATURE_LABELS[key]}
              </FilterChip>
            ))}
          </div>

          <div
            role="group"
            aria-label={PRODUCTS.filters.price.label}
            className="flex flex-wrap items-center gap-2 [min-inline-size:0]"
          >
            {PRICE_BAND_KEYS.map((key) => (
              <FilterChip
                key={key}
                selected={filters.price === key}
                onToggle={() => onChange({ price: filters.price === key ? null : key })}
                count={countFor(products, filters, { price: key })}
              >
                {PRICE_BAND_LABELS[key]}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

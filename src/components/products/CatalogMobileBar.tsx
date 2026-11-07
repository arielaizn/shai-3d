"use client";

import * as React from "react";

import { PRODUCTS } from "@/content/products";

import { FilterChip } from "./FilterChip";
import { SlidersGlyph } from "./glyphs";
import { countActive, countFor, type Filters } from "./filters";
import { useHeaderOffset } from "./useHeaderOffset";
import { CATEGORY_KEYS, CATEGORY_LABELS, type CatalogProduct } from "./model";

/**
 * The mobile filter bar, doc 03 §4.2. Sticky under the header, 56px of chrome, and
 * exactly two things on it: the sheet trigger on the end edge and the category chips
 * scrolling from the start edge.
 *
 * Why the categories stay out here rather than living only in the sheet: category is
 * the one dimension a visitor uses without being asked, and putting it behind a tap
 * would make the most common action on the page cost two. Everything else, where the
 * visitor has to think first, is inside the sheet.
 *
 * The scroller is `overflow-x-auto` on a strip that bleeds the page gutter, so the
 * first chip starts flush with the grid below it and the last one can still be reached
 * with a thumb. Its own overflow never reaches the document: RESOLUTIONS §12 is about
 * a track that will not shrink, and this one scrolls on purpose inside a `min-inline-size: 0`
 * box.
 */

export type CatalogMobileBarProps = {
  products: readonly CatalogProduct[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onOpenSheet: () => void;
};

export function CatalogMobileBar({
  products,
  filters,
  onChange,
  onOpenSheet,
}: CatalogMobileBarProps) {
  // 68px is the navigation row alone: the value that is correct once the
  // announcement bar has been dismissed, and the one this bar falls back to
  const offset = useHeaderOffset(68);
  const active = countActive(filters);
  const triggerLabel =
    active > 0
      ? PRODUCTS.filters.triggerActive.replace("{n}", String(active))
      : PRODUCTS.filters.trigger;

  return (
    <div
      className="sticky z-30 lg:hidden [min-inline-size:0]"
      style={{
        insetBlockStart: offset,
        backgroundColor: "color-mix(in oklab, var(--color-cream-100) 94%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBlockEndWidth: "1px",
        borderBlockEndColor: "color-mix(in oklab, var(--color-ink-900) 8%, transparent)",
      }}
    >
      <div className="flex items-center gap-3 py-2 [min-inline-size:0]">
        <button
          type="button"
          onClick={onOpenSheet}
          className="inline-flex shrink-0 items-center gap-2 rounded-full ps-3 pe-4 font-[family-name:var(--font-rubik)]"
          style={{
            minBlockSize: "var(--spacing-tap)",
            borderWidth: "3px",
            borderColor: active > 0 ? "var(--color-ink-900)" : "var(--color-cream-400)",
            backgroundColor: active > 0 ? "var(--color-turq-500)" : "var(--color-cream-50)",
            color: "var(--color-ink-900)",
            fontSize: "0.9375rem",
            fontWeight: 700,
          }}
        >
          <SlidersGlyph size={18} />
          <span className="[min-inline-size:0]">{triggerLabel}</span>
        </button>

        <div
          role="group"
          aria-label={PRODUCTS.filters.category.label}
          className="-me-5 flex flex-1 items-center gap-2 overflow-x-auto pe-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [min-inline-size:0]"
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
      </div>
    </div>
  );
}

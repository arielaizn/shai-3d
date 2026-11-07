"use client";

import * as React from "react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { CloseGlyph } from "@/components/layout/Glyphs";
import { Voxel } from "@/components/ui/Voxel";
import { PRODUCTS } from "@/content/products";
import { DURATION, EASE } from "@/lib/design/motion";

import { ColorFilterRow } from "./ColorFilterRow";
import { FilterChip } from "./FilterChip";
import { SortSelect } from "./SortSelect";
import { applyFilters, countActive, type Filters } from "./filters";
import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  CATEGORY_TILES,
  FEATURE_KEYS,
  FEATURE_LABELS,
  PRICE_BAND_KEYS,
  PRICE_BAND_LABELS,
  type CatalogProduct,
  type CategoryKey,
  type Filament,
} from "./model";

/**
 * The mobile filter sheet, doc 03 §4.2. 88svh from the bottom edge, all five
 * dimensions inside it, and a sticky red footer that says how many objects are behind
 * it right now.
 *
 * **It edits a draft.** Tapping a chip updates the count on the footer button and
 * nothing else; the grid behind changes when the button is pressed. On a phone the
 * grid is entirely hidden by the sheet, so live filtering would be invisible work,
 * and `להציג 12 דגמים` is only true if the number is computed on the pending state.
 * Closing without pressing it throws the draft away.
 *
 * Categories are tiles rather than a row of text pills, per the amendment in doc 08
 * §C: eight identical pills is the least toy-store surface on the site, and this is
 * the surface most visitors actually touch. `games` has no delivered tile and falls
 * back to the voxel, exactly as the manifest allows.
 *
 * The mechanics are the ones `MobileNav` already proved: `inert` on `<main>`, scroll
 * lock with a stable scrollbar gutter, a focus trap, Escape, and focus returned to
 * the trigger on close.
 */

/**
 * The dialog needs an accessible name, and 09c gives the panel title but no label for
 * its close button. One noun, flagged in the return for the copy owner.
 */
const CLOSE_LABEL = "לסגור סינון";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  filters: Filters;
  products: readonly CatalogProduct[];
  palette: readonly Filament[];
};

export function FilterSheet({
  open,
  onClose,
  onApply,
  filters,
  products,
  palette,
}: FilterSheetProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const [draft, setDraft] = React.useState<Filters>(filters);
  const [present, setPresent] = React.useState(open);
  const [mounted, setMounted] = React.useState(false);

  /* the draft is seeded from the live filters every time the sheet opens */
  React.useEffect(() => {
    if (open) setDraft(filters);
    // the filters object is rebuilt on every parent render, so it is compared by the
    // one thing that identifies it rather than by reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = window.requestAnimationFrame(() => setMounted(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setMounted(false);
    const timer = window.setTimeout(() => setPresent(false), DURATION.d4);
    return () => window.clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    if (!open || !present) return;
    const html = document.documentElement;
    const main = document.querySelector<HTMLElement>("main");
    const previousOverflow = html.style.overflow;
    const previousGutter = html.style.scrollbarGutter;

    html.style.overflow = "hidden";
    html.style.scrollbarGutter = "stable";
    if (main) main.inert = true;
    closeRef.current?.focus();

    return () => {
      html.style.overflow = previousOverflow;
      html.style.scrollbarGutter = previousGutter;
      if (main) main.inert = false;
    };
  }, [open, present]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!present) return null;

  const matches = applyFilters(products, draft).length;
  const applyLabel =
    matches === 0
      ? PRODUCTS.filters.sheetApplyNone
      : matches === 1
        ? PRODUCTS.filters.sheetApplyOne
        : PRODUCTS.filters.sheetApply.replace("{n}", String(matches));

  function patch(next: Partial<Filters>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function toggleColor(key: string) {
    patch({
      colors: draft.colors.includes(key)
        ? draft.colors.filter((entry) => entry !== key)
        : [...draft.colors, key],
    });
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={PRODUCTS.filters.sheetTitle}>
      <button
        type="button"
        aria-label={CLOSE_LABEL}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-ink-900) 45%, transparent)",
          opacity: mounted ? 1 : 0,
          transition: `opacity ${DURATION.d3}ms ${EASE.outSoft}`,
        }}
      />

      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 flex flex-col [min-inline-size:0]"
        style={{
          blockSize: "88svh",
          backgroundColor: "var(--color-surface)",
          borderStartStartRadius: "var(--radius-2xl)",
          borderStartEndRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-xl)",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${DURATION.d4}ms ${EASE.toyBig}`,
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 [min-inline-size:0]">
          <h2
            className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
            style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--color-ink-900)" }}
          >
            {PRODUCTS.filters.sheetTitle}
          </h2>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={CLOSE_LABEL}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--color-ink-900)" }}
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="flex grow flex-col gap-7 overflow-y-auto px-5 pb-6 pt-5 [overscroll-behavior:contain] [min-inline-size:0]">
          <Section title={PRODUCTS.filters.category.label}>
            <div
              className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [min-inline-size:0]"
            >
              <CategoryTile
                label={PRODUCTS.filters.category.all}
                selected={draft.cat === "all"}
                onSelect={() => patch({ cat: "all" })}
              />
              {CATEGORY_KEYS.map((key) => (
                <CategoryTile
                  key={key}
                  categoryKey={key}
                  label={CATEGORY_LABELS[key]}
                  selected={draft.cat === key}
                  onSelect={() => patch({ cat: draft.cat === key ? "all" : key })}
                />
              ))}
            </div>
          </Section>

          <Section title={PRODUCTS.filters.color.label}>
            <ColorFilterRow palette={palette} selected={draft.colors} onToggle={toggleColor} />
          </Section>

          <Section title={PRODUCTS.filters.feature.label}>
            <div className="flex flex-wrap gap-2 [min-inline-size:0]">
              {FEATURE_KEYS.map((key) => (
                <FilterChip
                  key={key}
                  selected={draft.feats.includes(key)}
                  onToggle={() =>
                    patch({
                      feats: draft.feats.includes(key)
                        ? draft.feats.filter((entry) => entry !== key)
                        : [...draft.feats, key],
                    })
                  }
                >
                  {FEATURE_LABELS[key]}
                </FilterChip>
              ))}
            </div>
          </Section>

          <Section title={PRODUCTS.filters.price.label}>
            <div className="flex flex-wrap gap-2 [min-inline-size:0]">
              {PRICE_BAND_KEYS.map((key) => (
                <FilterChip
                  key={key}
                  selected={draft.price === key}
                  onToggle={() => patch({ price: draft.price === key ? null : key })}
                >
                  {PRICE_BAND_LABELS[key]}
                </FilterChip>
              ))}
            </div>
          </Section>

          <Section title={PRODUCTS.sort.label}>
            <SortSelect
              id="catalog-sort-sheet"
              value={draft.sort}
              onChange={(sort) => patch({ sort })}
            />
          </Section>
        </div>

        <div
          className="flex items-center gap-3 px-5 pt-3 [min-inline-size:0]"
          style={{
            borderBlockStartWidth: "1px",
            borderBlockStartColor: "color-mix(in oklab, var(--color-ink-900) 10%, transparent)",
            paddingBlockEnd: "calc(0.75rem + env(safe-area-inset-bottom))",
            backgroundColor: "var(--color-surface)",
          }}
        >
          {countActive(draft) > 0 ? (
            <Button
              variant="ghost"
              size="lg"
              className="shrink-0"
              onClick={() => setDraft({ ...draft, cat: "all", colors: [], feats: [], price: null })}
            >
              {PRODUCTS.filters.clear}
            </Button>
          ) : null}

          <span className="flex-1 [min-inline-size:0]">
            <Button variant="accent" size="lg" fullWidth onClick={() => onApply(draft)}>
              {applyLabel}
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 [min-inline-size:0]">
      <h3
        className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "var(--color-text-muted)",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function CategoryTile({
  categoryKey,
  label,
  selected,
  onSelect,
}: {
  categoryKey?: CategoryKey;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const tile = categoryKey ? CATEGORY_TILES[categoryKey] : undefined;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex shrink-0 snap-start flex-col items-center gap-2 [inline-size:8rem] [min-inline-size:0]"
    >
      <span
        aria-hidden="true"
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden"
        style={{
          borderRadius: "var(--radius-lg)",
          borderWidth: "3px",
          borderColor: selected ? "var(--color-ink-900)" : "var(--color-cream-400)",
          backgroundColor: selected ? "var(--color-turq-100)" : "var(--color-cream-50)",
        }}
      >
        {tile ? (
          <Image src={tile.src} alt="" fill sizes="128px" style={{ objectFit: "cover" }} />
        ) : (
          <Voxel tone={selected ? "ink" : "turquoise"} size="1.75rem" />
        )}
      </span>

      <span
        className="text-center [min-inline-size:0]"
        style={{
          fontFamily: "var(--font-rubik), system-ui, sans-serif",
          fontSize: "0.8125rem",
          fontWeight: selected ? 800 : 600,
          lineHeight: 1.3,
          color: "var(--color-ink-900)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

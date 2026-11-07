"use client";

import * as React from "react";

import { PRODUCTS } from "@/content/products";

import type { Filament } from "./model";

/**
 * The filament swatch row, doc 03 §4.3 dimension 2.
 *
 * These are spools, not brand colours. A colour exists because Shai bought it and it
 * leaves the row the evening it runs out, which is why an out-of-stock swatch stays
 * visible with a strike and the label `אזל` (06 §A.4): hiding it makes the palette
 * look smaller than it is, and the visitor learns nothing.
 *
 * Each swatch is a 28px circle inside a 44px button, so the target is the size of a
 * thumb while the dot stays the size of a dot. The selected ring is ink at 3px with a
 * cream gap, which reads on a white swatch and on a black one alike.
 */

export type ColorFilterRowProps = {
  palette: readonly Filament[];
  selected: readonly string[];
  onToggle: (key: string) => void;
  /** Names the group for a screen reader; the visible label sits outside. */
  labelledBy?: string;
};

export function ColorFilterRow({ palette, selected, onToggle, labelledBy }: ColorFilterRowProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : PRODUCTS.filters.color.label}
      className="flex flex-wrap items-center gap-0.5 [min-inline-size:0]"
    >
      {palette.map((filament) => {
        const isSelected = selected.includes(filament.key);
        return (
          <button
            key={filament.key}
            type="button"
            aria-pressed={isSelected}
            aria-disabled={filament.soldOut || undefined}
            aria-label={
              filament.soldOut
                ? `${filament.nameHe}, ${PRODUCTS.filters.color.soldOut}`
                : filament.nameHe
            }
            title={filament.nameHe}
            onClick={() => {
              if (filament.soldOut) return;
              onToggle(filament.key);
            }}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full [min-inline-size:0]"
          >
            <span
              aria-hidden="true"
              className="relative block transition-transform duration-140 ease-toy"
              style={{
                inlineSize: "1.75rem",
                blockSize: "1.75rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: filament.hex,
                transform: isSelected ? "scale(1.08)" : undefined,
                boxShadow: isSelected
                  ? "0 0 0 2px var(--color-cream-50), 0 0 0 5px var(--color-ink-900)"
                  : "inset 0 0 0 1px color-mix(in oklab, var(--color-ink-900) 22%, transparent)",
                opacity: filament.soldOut ? 0.55 : 1,
              }}
            >
              {filament.soldOut ? (
                // one diagonal, drawn in ink so it reads on every hue
                <span
                  className="absolute inset-0 block"
                  style={{
                    borderRadius: "var(--radius-full)",
                    backgroundImage:
                      "linear-gradient(to top left, transparent 45%, var(--color-ink-900) 45%, var(--color-ink-900) 55%, transparent 55%)",
                  }}
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

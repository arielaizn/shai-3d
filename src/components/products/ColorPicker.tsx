"use client";

import * as React from "react";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { PRODUCT } from "@/content/products";
import { formatAgorotDelta } from "@/lib/format/price";

import type { Filament } from "./model";

/**
 * The colour picker on the detail page, doc 03 §5.4.
 *
 * It is a **radio group**, not the toggle row the catalogue filter uses: exactly one
 * colour is being ordered, and the two controls look alike on purpose while behaving
 * differently, so they are two components rather than one with a mode flag.
 *
 * Keyboard model is the native radio one, implemented by hand because the swatch is a
 * coloured circle and not an input: one tab stop for the whole group, arrows move the
 * selection, and in RTL `ArrowLeft` advances forward because that is the direction the
 * row runs. `roving tabindex` is what makes the group one stop instead of eighteen.
 *
 * Out of stock stays on the row with a diagonal strike and `aria-disabled`, per 06
 * §A.4: hiding it makes the palette look smaller than it is, and a visitor learns
 * nothing from an absence.
 *
 * A filament that costs extra says so next to its name, because finding out at the
 * price line that the gold cost four shekels more is the kind of surprise this site
 * exists to avoid.
 */

export type ColorPickerProps = {
  palette: readonly Filament[];
  value: string | null;
  onChange: (key: string) => void;
  labelId: string;
};

export function ColorPicker({ palette, value, onChange, labelId }: ColorPickerProps) {
  const selectable = palette.filter((filament) => !filament.soldOut);
  const selected = palette.find((filament) => filament.key === value);

  /** The one tab stop: the chosen swatch, or the first one that can be chosen. */
  const focusKey = selected && !selected.soldOut ? selected.key : selectable[0]?.key;

  function move(delta: number) {
    if (selectable.length === 0) return;
    const current = selectable.findIndex((filament) => filament.key === value);
    const next = (current + delta + selectable.length) % selectable.length;
    onChange(selectable[next].key);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      // RTL: the row advances to the left, so ArrowLeft is "next"
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        if (selectable[0]) onChange(selectable[0].key);
        break;
      case "End":
        event.preventDefault();
        if (selectable.length > 0) onChange(selectable[selectable.length - 1].key);
        break;
      default:
    }
  }

  return (
    <div className="flex flex-col gap-2 [min-inline-size:0]">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="flex flex-wrap items-center gap-0.5 [min-inline-size:0]"
      >
        {palette.map((filament) => {
          const isSelected = filament.key === value;
          return (
            <button
              key={filament.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={filament.soldOut || undefined}
              tabIndex={filament.key === focusKey ? 0 : -1}
              aria-label={
                filament.soldOut
                  ? `${filament.nameHe}, ${PRODUCT.color.soldOut}`
                  : filament.nameHe
              }
              title={filament.nameHe}
              onClick={() => {
                if (filament.soldOut) return;
                onChange(filament.key);
              }}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full [min-inline-size:0]"
            >
              <span
                aria-hidden="true"
                className="relative block transition-transform duration-140 ease-toy"
                style={{
                  inlineSize: "2.25rem",
                  blockSize: "2.25rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: filament.hex,
                  transform: isSelected ? "scale(1.04)" : undefined,
                  // ink ring at a cream offset: it reads on a white filament and on a
                  // black one alike, which a single-colour ring cannot do
                  boxShadow: isSelected
                    ? "0 0 0 2px var(--color-cream-50), 0 0 0 4px var(--color-ink-900)"
                    : "inset 0 0 0 1px color-mix(in oklab, var(--color-ink-900) 22%, transparent)",
                  opacity: filament.soldOut ? 0.55 : 1,
                }}
              >
                {filament.soldOut ? (
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

      {selected ? (
        <p className="flex flex-wrap items-center gap-2 [min-inline-size:0]">
          <span
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            {selected.nameHe}
          </span>

          {selected.extraCostAgorot > 0 ? (
            <span
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text-muted)",
              }}
            >
              <bdi dir="ltr" className="tabular-nums">
                {formatAgorotDelta(selected.extraCostAgorot)}
              </bdi>{" "}
              {PRODUCT.price.suffix}
            </span>
          ) : null}

          {selected.isGlow ? (
            <ChipBadge tone="yellow" size="sm">
              {PRODUCT.color.glowChip}
            </ChipBadge>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

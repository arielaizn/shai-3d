"use client";

/**
 * src/components/generator/PriceBreakdown.tsx
 *
 * `מאיפה המחיר מגיע`. The arithmetic, opened on request.
 *
 * Every row here is written by `convex/lib/priceEngine.ts` and carried through
 * `pricing.quote`. Nothing is recomputed in the browser, and the labels are the
 * engine's own Hebrew, so what Shai reads in the admin and what the customer reads
 * here are the same sentence about the same number.
 *
 * `displayAgorot` is the row rounded to a whole shekel, and the engine's `rounding`
 * row absorbs the remainder, which is what makes the column add up to the printed
 * total exactly. Adding the visible rows up in JavaScript would reintroduce the
 * off-by-one the engine already solved.
 *
 * The expansion is `grid-template-rows: 0fr -> 1fr`, so there is no guessed
 * `max-height` that clips a long breakdown on a narrow phone.
 */

import * as React from "react";

import { GENERATOR } from "@/content/generator";
import { formatAgorotDelta, spokenPrice } from "@/lib/format/price";

import { PriceDigits } from "./Bits";
import type { QuoteLine } from "./types";

export type PriceBreakdownProps = {
  lines: QuoteLine[];
  totalAgorot: number;
};

export function PriceBreakdown({ lines, totalAgorot }: PriceBreakdownProps) {
  const [open, setOpen] = React.useState(false);
  const bodyId = React.useId();

  return (
    <div className="flex flex-col gap-2 [min-inline-size:0]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="self-start rounded-sm"
        style={{
          minBlockSize: "var(--spacing-tap)",
          fontSize: "0.9375rem",
          fontWeight: 700,
          color: "var(--color-text-link)",
          textDecorationLine: "underline",
          textDecorationColor: "var(--color-turq-500)",
          textDecorationThickness: "2px",
          textUnderlineOffset: "4px",
        }}
      >
        {open ? GENERATOR.price.breakdownClose : GENERATOR.price.breakdownOpen}
      </button>

      <div id={bodyId} className="g-disclosure" data-open={open}>
        <div>
          <ul className="flex flex-col gap-1.5 pt-1 [min-inline-size:0]">
            {lines.map((line, index) => (
              <li
                key={`${line.key}-${line.id ?? index}`}
                className="flex items-baseline justify-between gap-3 [min-inline-size:0]"
                style={{ fontSize: "0.9375rem", color: "var(--color-text-secondary)" }}
              >
                <span className="flex flex-col [min-inline-size:0]">
                  <span className="[min-inline-size:0]">{line.labelHe}</span>
                  {line.hintHe ? (
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {line.hintHe}
                    </span>
                  ) : null}
                </span>

                <span className="shrink-0 tabular-nums" style={{ fontWeight: 700 }}>
                  <span aria-hidden="true">
                    <bdi dir="ltr">{formatAgorotDelta(line.displayAgorot)}</bdi>
                  </span>
                  <span className="sr-only">{spokenPrice(line.displayAgorot)}</span>
                </span>
              </li>
            ))}

            <li
              className="mt-1 flex items-baseline justify-between gap-3 pt-2 [min-inline-size:0]"
              style={{
                borderBlockStartWidth: "2px",
                borderBlockStartStyle: "solid",
                borderBlockStartColor: "var(--color-ink-900)",
                fontWeight: 800,
              }}
            >
              <span className="[min-inline-size:0]">{GENERATOR.price.lineLabels.total}</span>
              <span className="shrink-0">
                <PriceDigits agorot={totalAgorot} unitSize="0.8em" />
                <span className="sr-only">{spokenPrice(totalAgorot)}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

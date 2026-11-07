"use client";

/**
 * src/components/generator/StepType.tsx
 *
 * Step 1 · `סוג`. Seven cards, each with a picture of the real thing and the price it
 * starts at.
 *
 * **Why this is first.** RESOLUTIONS §ב.1: every earlier draft opened on an upload
 * wall, which asked a visitor who had known the site for nine seconds to hand over a
 * photo of their child before seeing one product or one price. This step needs no
 * input at all, so a visitor who arrives from Instagram sees seven objects and seven
 * prices before anything is asked of them.
 *
 * **The chip.** RESOLUTIONS §ב.8: `fromAgorot` is the engine's answer on the cheapest
 * configuration of that type, computed on the server by `pricing.fromPrices`. The old
 * chip read `printTypes.basePrice`, which is the constant term inside the formula, and
 * the lithophane card said 45 while the engine returned 105.
 *
 * **Semantics.** The grid is a radio group made of real `<input type="radio">`
 * elements, so arrow keys move between the types and the browser announces
 * `2 מתוך 7` without a line of roving-tabindex code. `מה זה` is a separate button
 * underneath each card, because a button inside a radio is not a thing.
 */

import * as React from "react";
import Image from "next/image";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { GENERATOR } from "@/content/generator";

import { TemplatedPrice } from "./Bits";
import { Sheet } from "./Sheet";
import type { PrintTypeInfo, PrintTypeKey } from "./types";

export type StepTypeProps = {
  printTypes: PrintTypeInfo[];
  selected: PrintTypeKey | null;
  onSelect: (printType: PrintTypeInfo) => void;
};

export function StepType({ printTypes, selected, onSelect }: StepTypeProps) {
  const [sheetKey, setSheetKey] = React.useState<PrintTypeKey | null>(null);
  const sheetType = printTypes.find((row) => row.key === sheetKey) ?? null;

  return (
    <>
      <fieldset className="[min-inline-size:0]">
        <legend className="sr-only">{GENERATOR.type.heading}</legend>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 [min-inline-size:0]">
          {printTypes.map((printType) => {
            const isSelected = printType.key === selected;
            return (
              <li key={printType.key} className="flex flex-col gap-1.5 [min-inline-size:0]">
                <label
                  className="g-focus relative flex cursor-pointer flex-col gap-2 [min-inline-size:0]"
                  style={{
                    backgroundColor: "var(--color-surface-raised)",
                    borderRadius: "var(--radius-lg)",
                    borderWidth: "3px",
                    borderStyle: "solid",
                    borderColor: isSelected ? "var(--color-red-600)" : "var(--color-cream-300)",
                    padding: "0.5rem",
                    boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-xs)",
                    transform: isSelected ? "translateY(-3px)" : "none",
                    transition: "transform 220ms var(--ease-toy), border-color 140ms linear, box-shadow 220ms var(--ease-out-soft)",
                  }}
                >
                  <input
                    type="radio"
                    name="generator-print-type"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onSelect(printType)}
                  />

                  <span
                    className="relative block aspect-square w-full overflow-hidden [min-inline-size:0]"
                    style={{
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--color-cream-100)",
                    }}
                  >
                    <Image
                      src={printType.imageSrc}
                      alt={printType.imageAlt}
                      fill
                      sizes="(max-width: 767px) 44vw, (max-width: 1279px) 28vw, 220px"
                      style={{ objectFit: "cover" }}
                    />

                    {isSelected ? (
                      <span
                        aria-hidden="true"
                        className="absolute top-2 start-2 flex items-center justify-center animate-pop"
                        style={{
                          inlineSize: "1.75rem",
                          blockSize: "1.75rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--color-red-600)",
                          color: "var(--color-cream-50)",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        <svg viewBox="0 0 20 20" width="14" height="14" focusable="false">
                          <path
                            d="M4 10.6 8.2 15 16 5.6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : null}
                  </span>

                  <span className="flex flex-col gap-1 px-1 pb-1 [min-inline-size:0]">
                    <span
                      className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
                      style={{ fontSize: "1.0625rem", fontWeight: 700, lineHeight: 1.25 }}
                    >
                      {printType.nameHe}
                      {isSelected ? (
                        <span className="sr-only"> {GENERATOR.type.selectedAria}</span>
                      ) : null}
                    </span>

                    <span
                      className="[min-inline-size:0]"
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.4,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {printType.taglineHe}
                    </span>

                    {printType.fromAgorot !== null ? (
                      <span className="pt-1">
                        <ChipBadge tone="cream" size="sm">
                          <TemplatedPrice
                            template={GENERATOR.type.priceChip}
                            agorot={printType.fromAgorot}
                            className="tabular-nums"
                          />
                        </ChipBadge>
                      </span>
                    ) : null}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setSheetKey(printType.key)}
                  className="self-start rounded-sm px-1"
                  style={{
                    minBlockSize: "var(--spacing-tap)",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "var(--color-text-link)",
                    textDecorationLine: "underline",
                    textDecorationColor: "var(--color-turq-500)",
                    textDecorationThickness: "2px",
                    textUnderlineOffset: "4px",
                  }}
                >
                  {GENERATOR.type.whatIs}
                  <span className="sr-only"> {printType.nameHe}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <Sheet
        open={sheetType !== null}
        onClose={() => setSheetKey(null)}
        titleHe={sheetType?.nameHe ?? ""}
        closeLabelHe={GENERATOR.type.sheetClose}
      >
        <p>{sheetType?.descriptionHe}</p>
      </Sheet>
    </>
  );
}

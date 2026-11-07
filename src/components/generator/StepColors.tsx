"use client";

/**
 * src/components/generator/StepColors.tsx
 *
 * Step 3 · `צבעים`. Up to four are included, and the fifth is an offer.
 *
 * **The fifth colour is designed as a sale, not as a wall.** 09c §6.6 and RESOLUTIONS:
 * the tap on the fifth swatch is never refused. It opens a sheet that states the
 * price and, more importantly, the mechanical reason for it: Shai stops the printer
 * mid-print, changes the spool and restarts the layer. A surcharge with a reason
 * attached is a product feature. A greyed-out swatch with `הגעתם למקסימום` is a
 * dead end, and the words `מקסימום`, `לא ניתן`, `שדרוג` and `פרימיום` appear nowhere.
 *
 * **Order matters.** The first colour is the body, the second is the frame or the
 * base, and the labels above the grid say which. `להחליף סדר` swaps the first two,
 * which is the only reorder anyone actually wants on a two-part print.
 *
 * **A sold-out spool stays on the grid** with `אזל` on it (doc 06 §A.4). Hiding it
 * makes the palette look smaller than it is.
 */

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { ChipBadge } from "@/components/ui/ChipBadge";
import { GENERATOR } from "@/content/generator";
import { contrastWarning, sortByLuminance } from "@/lib/three/geometry/colorMapping";

import { Sheet } from "./Sheet";
import { StepNote } from "./StepShell";
import { fill, type FilamentInfo, type PrintTypeKey } from "./types";

/**
 * The price of one extra colour, in shekels. The engine owns the real number and the
 * breakdown on the price screen prints whatever it charged; this is the figure the
 * locked copy in `src/content/generator.ts` states in three places, so it is written
 * once here rather than three times in the markup.
 */
const EXTRA_COLOR_ILS = 9;

type FinishTab = "all" | "silk" | "glow" | "wood" | "clear";

const TABS: { key: FinishTab; labelHe: string }[] = [
  { key: "all", labelHe: GENERATOR.colors.finish.all },
  { key: "silk", labelHe: GENERATOR.colors.finish.silk },
  { key: "glow", labelHe: GENERATOR.colors.finish.glow },
  { key: "wood", labelHe: GENERATOR.colors.finish.wood },
  { key: "clear", labelHe: GENERATOR.colors.finish.clear },
];

function inTab(filament: FilamentInfo, tab: FinishTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "silk":
      return filament.finish === "silk";
    case "glow":
      return filament.isGlow || filament.finish === "glow";
    case "wood":
      return filament.finish === "wood";
    case "clear":
      return filament.finish === "transparent";
  }
}

function slotLabel(printTypeKey: PrintTypeKey | null, index: number): string {
  if (index === 0) {
    if (printTypeKey === "framed") return GENERATOR.colors.slot.panel;
    if (printTypeKey === "standee") return GENERATOR.colors.slot.figure;
    return GENERATOR.colors.slot.body;
  }
  if (index === 1) {
    if (printTypeKey === "framed") return GENERATOR.colors.slot.frame;
    if (printTypeKey === "standee") return GENERATOR.colors.slot.base;
  }
  return fill(GENERATOR.colors.slot.generic, { n: index + 1 });
}

function countLine(count: number, freeCount: number): string {
  if (count === 0) return GENERATOR.colors.count.none;
  if (count === 1) return GENERATOR.colors.count.one;
  if (count === 2) return GENERATOR.colors.count.two;
  if (count === 3) return GENERATOR.colors.count.three;
  if (count === freeCount) return GENERATOR.colors.count.four;
  return fill(GENERATOR.colors.count.extra, {
    n: count,
    e: count - freeCount,
    p: EXTRA_COLOR_ILS,
  });
}

export type StepColorsProps = {
  filaments: FilamentInfo[];
  selectedIds: string[];
  printTypeKey: PrintTypeKey | null;
  /** The print type's hard ceiling, from `printTypes.maxColors`. */
  maxColors: number;
  /** `pricingConfig.freeColorCount`, four in every configuration Shai ships. */
  freeColorCount: number;
  extraAccepted: boolean;
  onToggle: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onAcceptExtra: (id: string) => void;
};

export function StepColors({
  filaments,
  selectedIds,
  printTypeKey,
  maxColors,
  freeColorCount,
  extraAccepted,
  onToggle,
  onReorder,
  onAcceptExtra,
}: StepColorsProps) {
  const [tab, setTab] = React.useState<FinishTab>("all");
  const [pending, setPending] = React.useState<string | null>(null);

  const single = maxColors <= 1;
  const included = Math.min(freeColorCount, maxColors);
  const visibleTabs = TABS.filter(
    (entry) => entry.key === "all" || filaments.some((filament) => inTab(filament, entry.key)),
  );
  const shown = filaments.filter((filament) => inTab(filament, tab));

  const selected = selectedIds
    .map((id) => filaments.find((filament) => filament.id === id))
    .filter((filament): filament is FilamentInfo => filament !== undefined);

  const clash = contrastWarning(
    sortByLuminance(selected.map((f) => ({ hex: f.hex, nameHe: f.nameHe }))),
  );

  function request(filament: FilamentInfo) {
    const isSelected = selectedIds.includes(filament.id);
    const wouldExceedIncluded = !isSelected && !single && selectedIds.length >= included;

    if (wouldExceedIncluded && !extraAccepted && maxColors > included) {
      setPending(filament.id);
      return;
    }
    onToggle(filament.id);
  }

  if (filaments.length === 0) {
    return <StepNote tone="play">{GENERATOR.colors.empty}</StepNote>;
  }

  return (
    <div className="flex flex-col gap-4 [min-inline-size:0]">
      {visibleTabs.length > 1 ? (
        /* A group of toggles rather than a tablist: there is one grid below and it is
           filtered, so promising tab semantics would promise arrow-key navigation
           between panels that do not exist. */
        <div
          role="group"
          aria-label={GENERATOR.colors.heading}
          className="flex flex-wrap gap-2 [min-inline-size:0]"
        >
          {visibleTabs.map((entry) => {
            const active = entry.key === tab;
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(entry.key)}
                className="rounded-full px-3"
                style={{
                  minBlockSize: "var(--spacing-tap)",
                  fontSize: "0.9375rem",
                  fontWeight: active ? 800 : 600,
                  backgroundColor: active ? "var(--color-ink-900)" : "var(--color-cream-200)",
                  color: active ? "var(--color-cream-50)" : "var(--color-text-secondary)",
                  transition: "background-color 140ms linear",
                }}
              >
                {entry.labelHe}
              </button>
            );
          })}
        </div>
      ) : null}

      <fieldset className="[min-inline-size:0]">
        <legend className="sr-only">{GENERATOR.colors.heading}</legend>

        <ul
          className="grid gap-3.5 [min-inline-size:0]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(4.5rem, 1fr))" }}
        >
          {shown.map((filament) => {
            const index = selectedIds.indexOf(filament.id);
            const isSelected = index !== -1;
            return (
              <li key={filament.id} className="[min-inline-size:0]">
                <label
                  className="g-focus flex cursor-pointer flex-col items-center gap-1.5 rounded-lg py-1 [min-inline-size:0]"
                  style={{ opacity: filament.soldOut ? 0.45 : 1 }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    disabled={filament.soldOut}
                    onChange={() => request(filament)}
                  />

                  <span
                    aria-hidden="true"
                    className="relative flex items-center justify-center"
                    style={{
                      inlineSize: "var(--spacing-swatch)",
                      blockSize: "var(--spacing-swatch)",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: filament.hex,
                      boxShadow: isSelected
                        ? "0 0 0 3px var(--color-red-600), inset 0 0 0 2px color-mix(in oklab, var(--color-ink-900) 20%, transparent)"
                        : "0 0 0 3px var(--color-cream-200), inset 0 0 0 2px color-mix(in oklab, var(--color-ink-900) 20%, transparent)",
                      transition: "box-shadow 140ms linear, transform 220ms var(--ease-toy)",
                      transform: isSelected ? "scale(1.06)" : "none",
                    }}
                  >
                    {isSelected ? (
                      <span
                        className="flex items-center justify-center tabular-nums"
                        style={{
                          inlineSize: "1.25rem",
                          blockSize: "1.25rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--color-ink-900)",
                          color: "var(--color-cream-50)",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                        }}
                      >
                        {index + 1}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className="text-center [min-inline-size:0]"
                    style={{ fontSize: "0.75rem", lineHeight: 1.3 }}
                  >
                    {filament.nameHe}
                    {filament.soldOut ? (
                      <span
                        style={{
                          display: "block",
                          fontWeight: 800,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {GENERATOR.colors.soldOut}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* What has been chosen, in order, with the slot each one prints. */}
      {selected.length > 0 ? (
        <div className="flex flex-col gap-2 [min-inline-size:0]">
          <ul className="flex flex-wrap gap-2 [min-inline-size:0]">
            {selected.map((filament, index) => (
              <li key={filament.id} className="[min-inline-size:0]">
                <ChipBadge tone="cream" size="md">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      style={{
                        inlineSize: "0.875rem",
                        blockSize: "0.875rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: filament.hex,
                        boxShadow: "inset 0 0 0 2px color-mix(in oklab, var(--color-ink-900) 25%, transparent)",
                      }}
                    />
                    {slotLabel(printTypeKey, index)} · {filament.nameHe}
                  </span>
                </ChipBadge>
              </li>
            ))}

            {selectedIds.length > included
              ? selectedIds.slice(included).map((id, offset) => (
                  <li key={`extra-${id}`} className="[min-inline-size:0]">
                    <ChipBadge tone="yellow" size="md">
                      {offset === 0
                        ? GENERATOR.extraColor.chip5
                        : offset === 1
                          ? GENERATOR.extraColor.chip6
                          : fill(GENERATOR.extraColor.chipN, { n: included + offset + 1 })}
                    </ChipBadge>
                  </li>
                ))
              : null}
          </ul>

          {selected.length > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => {
                const next = [...selectedIds];
                [next[0], next[1]] = [next[1], next[0]];
                onReorder(next);
              }}
            >
              {GENERATOR.colors.reorder}
            </Button>
          ) : null}
        </div>
      ) : null}

      <p
        role="status"
        style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-secondary)" }}
      >
        {single ? GENERATOR.colors.note.single : countLine(selectedIds.length, included)}
      </p>

      {!single && selectedIds.length === 1 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          {GENERATOR.colors.note.one}
        </p>
      ) : null}

      {!single && selectedIds.length > 1 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          {fill(GENERATOR.colors.note.many, { n: selectedIds.length })}
        </p>
      ) : null}

      {printTypeKey === "glow" ? (
        <StepNote tone="play">{GENERATOR.colors.note.glow}</StepNote>
      ) : null}

      {clash ? (
        <StepNote tone="warning">
          {fill(GENERATOR.colors.note.tooClose, { a: clash.a, b: clash.b })}
        </StepNote>
      ) : null}

      {/* 09c §6.6. The offer. */}
      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        titleHe={GENERATOR.extraColor.heading}
        closeLabelHe={GENERATOR.extraColor.decline}
        footer={
          <>
            <Button
              variant="accent"
              size="md"
              fullWidth
              onClick={() => {
                if (pending) onAcceptExtra(pending);
                setPending(null);
              }}
            >
              {GENERATOR.extraColor.accept}
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={() => setPending(null)}>
              {GENERATOR.extraColor.decline}
            </Button>
          </>
        }
      >
        <p>{GENERATOR.extraColor.body}</p>
        <p>{GENERATOR.extraColor.value}</p>
      </Sheet>
    </div>
  );
}

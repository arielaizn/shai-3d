"use client";

/**
 * src/components/generator/ProgressRail.tsx
 *
 * Six segments across the top of the generator: `סוג · תמונה · צבעים · גודל · דגם · מחיר`.
 *
 * It is a navigation list and not a decoration, because a visitor on step 4 who wants
 * to change a colour should not have to press back three times. A step that has been
 * reached is a button; a step ahead of the visitor is inert text, so the rail can
 * never jump someone into a step whose inputs do not exist yet.
 *
 * The current step carries `aria-current="step"`. The label under each segment is the
 * one word from `GENERATOR_STEPS[].railLabel`, which is also what the sr-only name
 * says, so what is heard and what is read are the same word.
 */

import * as React from "react";

import { GENERATOR, GENERATOR_STEPS } from "@/content/generator";

import { fill, stepNumber, type StepKey } from "./types";

export type ProgressRailProps = {
  current: StepKey;
  /** 1-based. Steps beyond it are not reachable yet. */
  furthest: number;
  onSelect: (step: StepKey) => void;
};

export function ProgressRail({ current, furthest, onSelect }: ProgressRailProps) {
  const currentNumber = stepNumber(current);

  return (
    <nav aria-label="שלבי המחולל" className="[min-inline-size:0]">
      <ol className="grid grid-cols-6 gap-1.5 [min-inline-size:0]">
        {GENERATOR_STEPS.map((step, index) => {
          const number = index + 1;
          const reached = number <= furthest;
          const done = number < currentNumber;
          const active = number === currentNumber;
          const name = `${fill(GENERATOR.nav.stepAria, { n: number })} · ${step.railLabel}`;

          const bar = (
            <span
              aria-hidden="true"
              className="block"
              style={{
                blockSize: "0.25rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: active
                  ? "var(--color-red-500)"
                  : done
                    ? "var(--color-turq-500)"
                    : "var(--color-cream-300)",
                transition: "background-color 140ms var(--ease-out-soft)",
              }}
            />
          );

          const label = (
            <span
              aria-hidden="true"
              className="block truncate text-center"
              style={{
                fontSize: "0.6875rem",
                fontWeight: active ? 800 : 600,
                lineHeight: 1.3,
                color: active ? "var(--color-ink-900)" : "var(--color-text-muted)",
              }}
            >
              {step.railLabel}
            </span>
          );

          return (
            <li key={step.key} className="[min-inline-size:0]">
              {reached && !active ? (
                <button
                  type="button"
                  onClick={() => onSelect(step.key)}
                  className="flex w-full flex-col gap-1.5 rounded-sm py-2 [min-inline-size:0]"
                >
                  <span className="sr-only">{name}</span>
                  {bar}
                  {label}
                </button>
              ) : (
                <div
                  aria-current={active ? "step" : undefined}
                  className="flex w-full flex-col gap-1.5 py-2 [min-inline-size:0]"
                >
                  <span className="sr-only">{name}</span>
                  {bar}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

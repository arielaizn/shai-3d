"use client";

/**
 * src/components/generator/StepShell.tsx
 *
 * One step, and the accessibility contract every step obeys.
 *
 * RESOLUTIONS §17 recorded that the generator spec contained zero mentions of `aria`,
 * `role`, `tabIndex` or `focus` for a six-step wizard with a file upload. This
 * component is where that is answered, and it is the only place in the generator that
 * moves focus:
 *
 *   1. the step changes         focus lands on the new step's heading
 *   2. a sheet opens            focus enters the sheet          (`Sheet.tsx`)
 *   3. a sheet closes           focus returns to what opened it (`Sheet.tsx`)
 *   4. an upload fails          focus lands on the retry        (`StepPhoto.tsx`)
 *
 * Nothing else takes focus, ever. A wizard that moves the cursor on a value change
 * is a wizard nobody can fill in.
 *
 * The section is `role="group"` with `aria-labelledby` pointing at the heading, so the
 * step is announced by name when focus enters it. The heading is `tabIndex={-1}`,
 * which makes it focusable programmatically and leaves it out of the tab order.
 */

import * as React from "react";

import { GENERATOR } from "@/content/generator";

import { fill, stepNumber, type StepKey } from "./types";

export type StepShellProps = {
  step: StepKey;
  titleHe: string;
  helperHe?: string;
  /** False on the first paint, so arriving at the page does not steal focus. */
  autoFocus: boolean;
  children: React.ReactNode;
  /** Sits between the helper line and the step's controls. */
  banner?: React.ReactNode;
};

export function StepShell({
  step,
  titleHe,
  helperHe,
  autoFocus,
  children,
  banner,
}: StepShellProps) {
  const headingId = `generator-step-${step}-heading`;
  const helperId = `generator-step-${step}-helper`;
  const headingRef = React.useRef<HTMLHeadingElement | null>(null);

  React.useEffect(() => {
    if (!autoFocus) return;
    // `preventScroll` keeps the sticky header from being scrolled out from under the
    // visitor on iOS the instant the step changes.
    headingRef.current?.focus({ preventScroll: true });
    // one move per step, and the step is the identity of this component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <section
      role="group"
      aria-labelledby={headingId}
      aria-describedby={helperHe ? helperId : undefined}
      className="flex flex-col gap-5 [min-inline-size:0]"
    >
      <header className="flex flex-col gap-2 [min-inline-size:0]">
        <p
          className="font-[family-name:var(--font-rubik)]"
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--color-turq-800)",
          }}
        >
          {fill(GENERATOR.nav.stepAria, { n: stepNumber(step) })}
        </p>

        <h1
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-balance font-[family-name:var(--font-rubik)] outline-none [min-inline-size:0]"
          style={{
            fontSize: "clamp(1.75rem, 1.45rem + 1.5vw, 2.375rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            maxInlineSize: "20ch",
            color: "var(--color-text-primary)",
          }}
        >
          {titleHe}
        </h1>

        {helperHe ? (
          <p
            id={helperId}
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
              maxInlineSize: "42ch",
            }}
          >
            {helperHe}
          </p>
        ) : null}
      </header>

      {banner}

      <div className="flex flex-col gap-5 [min-inline-size:0]">{children}</div>
    </section>
  );
}

/**
 * The yellow note the steps hang warnings on: a small image, a dark photo, a
 * configuration the engine refused. It never blocks anything, which is the whole
 * point of it being a note and not a dialog.
 */
export function StepNote({
  children,
  tone = "warning",
  actions,
}: {
  children: React.ReactNode;
  tone?: "warning" | "danger" | "play";
  actions?: React.ReactNode;
}) {
  const palette =
    tone === "danger"
      ? { bg: "var(--color-danger-soft)", border: "var(--color-danger)", fg: "var(--color-danger-strong)" }
      : tone === "play"
        ? { bg: "var(--color-play-soft)", border: "var(--color-play-border)", fg: "var(--color-turq-800)" }
        : { bg: "var(--color-warning-soft)", border: "var(--color-warning)", fg: "var(--color-warning-text)" };

  return (
    <div
      className="flex flex-col gap-2 [min-inline-size:0]"
      style={{
        backgroundColor: palette.bg,
        borderInlineStartWidth: "4px",
        borderInlineStartStyle: "solid",
        borderInlineStartColor: palette.border,
        borderRadius: "var(--radius-md)",
        padding: "0.75rem 0.875rem",
        color: palette.fg,
        fontSize: "0.9375rem",
        lineHeight: 1.6,
      }}
    >
      <div className="[min-inline-size:0]">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2 [min-inline-size:0]">{actions}</div> : null}
    </div>
  );
}

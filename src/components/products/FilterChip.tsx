"use client";

import * as React from "react";

/**
 * One filter chip. Doc 03 §4.2 and §4.3.
 *
 * A toggle, so it is a `<button aria-pressed>` and not a checkbox with a label, which
 * is what makes it announce its state on every screen reader without any extra text.
 * The single-select dimensions (category, price) wrap their chips in a `role="group"`
 * with a Hebrew name, so the group is understandable before the first chip is read.
 *
 * The border width never changes between states. A chip that grows a border on
 * selection shifts every chip after it on the row, and on a 390px scroller that reads
 * as the row twitching under the finger.
 *
 * Touch target is 44px, doc 01 §10, on desktop too. A row of chips is the surface most
 * visitors actually touch on this page.
 */

export type FilterChipProps = {
  children: React.ReactNode;
  selected: boolean;
  onToggle: () => void;
  /** Superscript match count. It is part of the accessible name, not decoration. */
  count?: number;
  className?: string;
};

export function FilterChip({ children, selected, onToggle, count, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap",
        "font-[family-name:var(--font-rubik)] transition duration-140 ease-toy",
        "hover:-translate-y-0.5 active:translate-y-0 active:duration-90",
        "motion-reduce:hover:translate-y-0 [min-inline-size:0]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        minBlockSize: "var(--spacing-tap)",
        paddingInline: "1rem",
        borderWidth: "3px",
        borderColor: selected ? "var(--color-ink-900)" : "var(--color-cream-400)",
        backgroundColor: selected ? "var(--color-turq-500)" : "var(--color-cream-50)",
        color: "var(--color-ink-900)",
        fontSize: "0.9375rem",
        fontWeight: selected ? 800 : 600,
        lineHeight: 1.2,
      }}
    >
      <span className="[min-inline-size:0]">{children}</span>
      {typeof count === "number" ? (
        <sup
          className="tabular-nums"
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            opacity: count === 0 ? 0.45 : 0.7,
            insetBlockStart: "-0.35em",
          }}
        >
          {count}
        </sup>
      ) : null}
    </button>
  );
}

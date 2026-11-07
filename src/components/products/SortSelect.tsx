"use client";

import * as React from "react";

import { ChevronGlyph } from "@/components/layout/Glyphs";
import { PRODUCTS } from "@/content/products";

import { SORT_KEYS, SORT_LABELS, type SortKey } from "./model";

/**
 * The sort control, doc 03 §4.3 dimension 5.
 *
 * A native `<select>`, deliberately. On the phone this page is designed for it opens
 * the platform wheel, which is one thumb movement, works offline, works in the
 * Instagram webview, and is already localised. A custom listbox would cost a focus
 * trap, a keyboard model and about 4KB to be worse at all four.
 */

export type SortSelectProps = {
  value: SortKey;
  onChange: (value: SortKey) => void;
  id?: string;
  className?: string;
};

export function SortSelect({ value, onChange, id = "catalog-sort", className }: SortSelectProps) {
  return (
    <div className={["flex items-center gap-2 [min-inline-size:0]", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={id}
        className="shrink-0"
        style={{
          fontFamily: "var(--font-rubik), system-ui, sans-serif",
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "var(--color-text-muted)",
        }}
      >
        {PRODUCTS.sort.label}
      </label>

      <div className="relative [min-inline-size:0]">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as SortKey)}
          className="appearance-none rounded-full ps-4 pe-9 [min-inline-size:0]"
          style={{
            minBlockSize: "var(--spacing-tap)",
            borderWidth: "3px",
            borderColor: "var(--color-cream-400)",
            backgroundColor: "var(--color-cream-50)",
            color: "var(--color-ink-900)",
            fontFamily: "var(--font-rubik), system-ui, sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 700,
          }}
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>

        <span
          aria-hidden="true"
          // `inset-block-0` is not a utility Tailwind generates, so the chevron was
          // absolutely positioned with no block offset at all and landed at its static
          // position under the control. `[inset-block:0]` is the arbitrary property
          // that actually emits `inset-block: 0`.
          className="pointer-events-none absolute end-3 flex items-center [inset-block:0]"
          style={{ color: "var(--color-ink-700)" }}
        >
          <ChevronGlyph size={16} />
        </span>
      </div>
    </div>
  );
}

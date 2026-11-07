import * as React from "react";

import { BREATH_MAX, type StoryRow } from "./sections";

/**
 * A breath, 09 §8.
 *
 * Leaves the prose inset and takes 44rem centred in the column, so the rail runs on
 * behind it with no marker. This is the one sentence on the page a stranger is
 * actually deciding on, so it gets more air above and below it than any paragraph
 * does, and it is the only place the reader is asked to stop.
 *
 * `<blockquote>` with no `<cite>`, per 09 §11. The whole page is already in his voice,
 * so an attribution would be quoting him to himself.
 */
export function StoryPullQuote({ row }: { row: StoryRow }) {
  if (!row.quoteHe) return null;

  return (
    <blockquote
      className="mx-auto flex flex-col gap-4 [min-inline-size:0]"
      style={{
        maxInlineSize: BREATH_MAX,
        paddingInlineStart: "var(--breath-x)",
        paddingBlock: "clamp(0.75rem, 0.27rem + 2vw, 2.25rem)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          inlineSize: "2.5rem",
          blockSize: "3px",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-turq-500)",
        }}
      />
      <p
        className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "clamp(1.5rem, 1.24rem + 1.1vw, 2.125rem)",
          fontWeight: 700,
          lineHeight: 1.22,
          letterSpacing: "0em",
          color: "var(--color-text-primary)",
          maxInlineSize: "24ch",
        }}
      >
        {row.quoteHe}
      </p>
    </blockquote>
  );
}

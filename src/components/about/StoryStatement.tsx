import * as React from "react";

import { BREATH_MAX, type StoryRow } from "./sections";

/**
 * The last thing the story says.
 *
 * His own sentence, in his own voice, naming the transaction: someone has an idea and
 * he prints it. It ships with no full stop, per 09 §2 and 06 C.14; the wireframe in
 * 03 §3.6 that prints one loses, per 09b §16 conflict 4.
 *
 * A borrowed line from a film used to sit here. RESOLUTIONS.md ruling 20 deletes it:
 * with the personal story gone from the page there is nothing behind it, and a
 * motivational line with nothing behind it is the one thing the copy law forbids
 * outright. Ending on what he does instead is both truer and a better close, because
 * it hands the reader the next move rather than a feeling.
 *
 * It sits after the rail, centred, with nothing drawn behind it.
 */
export function StoryStatement({ row }: { row: StoryRow }) {
  if (!row.quoteHe) return null;

  return (
    <blockquote
      className="mx-auto flex flex-col items-center gap-6 text-center [min-inline-size:0]"
      style={{
        maxInlineSize: BREATH_MAX,
        paddingBlock: "clamp(1.5rem, 0.9rem + 2.5vw, 3rem)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          inlineSize: "3rem",
          blockSize: "1px",
          backgroundColor: "var(--color-cream-500)",
        }}
      />

      <p
        className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "clamp(1.75rem, 1.31rem + 1.79vw, 2.75rem)",
          fontWeight: 800,
          lineHeight: 1.16,
          letterSpacing: "0em",
          color: "var(--color-text-primary)",
          maxInlineSize: "20ch",
        }}
      >
        {row.quoteHe}
      </p>

      <span
        aria-hidden="true"
        style={{
          display: "block",
          inlineSize: "3rem",
          blockSize: "1px",
          backgroundColor: "var(--color-cream-500)",
        }}
      />
    </blockquote>
  );
}

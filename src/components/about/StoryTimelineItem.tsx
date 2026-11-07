import * as React from "react";

import { StoryBody } from "./StoryBody";
import { SpineMarker } from "./StorySpine";
import { PROSE_MAX, markerAccent, type StoryRow } from "./sections";

/**
 * One stop on the rail.
 *
 * Not all of them are dates any more. `ההתחלה` and `היום` are moments; `תכנון`,
 * `הדפסה` and `תיקון` are stages of the work, which is what the page is about after
 * `RESOLUTIONS.md` ruling 19. The rail carries an order either way, and `periodHe` in
 * `ABOUT_TIMELINE` is optional so a stage is not made to carry an empty date.
 *
 * 09 §8: the label rides **inside** the `h3` as an overline span, before the heading
 * text. A label parked outside the heading is decoration, and a screen reader user
 * loses the only thing on the page that says where in the sequence this sits.
 *
 * There is no `h2` between the hero and these, because there is no real grouping to
 * name. Skipping a level beats inventing a heading to fill the gap.
 *
 * The label is ink-muted and never turquoise: turquoise on cream is 2.16:1 (01 §4.2).
 * The colour lives in the voxel marker, which carries no information a reader needs.
 */
export function StoryTimelineItem({ row }: { row: StoryRow }) {
  return (
    <div
      className="relative [min-inline-size:0]"
      style={{ paddingInlineStart: "var(--rail-w)" }}
    >
      <SpineMarker tone={markerAccent(row)} />

      <div className="flex flex-col gap-3 [min-inline-size:0]">
        <h3
          className="flex flex-col gap-1.5 text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
          style={{
            fontSize: "clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)",
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "0em",
            color: "var(--color-text-primary)",
            maxInlineSize: "20ch",
          }}
        >
          {row.labelHe ? (
            <span
              style={{
                fontSize: "0.75rem",
                lineHeight: 1.4,
                letterSpacing: "0.06em",
                fontWeight: 700,
                color: "var(--color-text-muted)",
              }}
            >
              {row.labelHe}
            </span>
          ) : null}
          {row.headingHe ? <span>{row.headingHe}</span> : null}
        </h3>

        <StoryBody bodyHe={row.bodyHe} maxInlineSize={PROSE_MAX} />
      </div>
    </div>
  );
}

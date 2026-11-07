import * as React from "react";
import Image from "next/image";

import { StoryBody } from "./StoryBody";
import { BREATH_MAX, BREATH_PAD, type StoryRow } from "./sections";

/**
 * One text cell and one picture of the work, side by side.
 *
 * This is the payoff of the section above it: the reader has just been told how the
 * work is done, and here is a row of the things it produces. The text leads in the DOM
 * so a phone reads the sentence before it sees the shelf, and on a wide screen the
 * picture takes the end (left) cell.
 *
 * The picture cell is the slightly wider of the two. The photograph is a lineup, so
 * it loses more from being squeezed than the prose does, and the prose is capped at a
 * 30rem measure long before the cell runs out.
 *
 * **The picture is product photography, and there is no slot when there is none.**
 * RESOLUTIONS.md ruling 21 removes reserved photo slots rather than emptying them, so
 * a row with no picture is a single column of text at the full breath width, and
 * nothing on the page says a photograph is missing.
 *
 * `<figure>` with a picture and a plain block without one, so a row that is text alone
 * is not announced as a figure with nothing in it. No `<figcaption>` either way: the
 * heading and body are the argument, not a label for the photograph.
 */
export function StoryTwoUp({ row }: { row: StoryRow }) {
  const hasImage = Boolean(row.imageUrl && row.imageAltHe);
  const Tag = hasImage ? "figure" : "div";

  return (
    <Tag
      className={[
        "mx-auto grid grid-cols-[minmax(0,1fr)] gap-6 [min-inline-size:0]",
        hasImage
          ? "md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:gap-10"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        maxInlineSize: BREATH_MAX,
        paddingInlineStart: "var(--breath-x)",
        paddingBlock: BREATH_PAD,
      }}
    >
      <div className="flex flex-col gap-3 [min-inline-size:0]">
        {row.headingHe ? (
          <h3
            className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
            style={{
              fontSize: "clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)",
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: "0em",
              color: "var(--color-text-primary)",
              maxInlineSize: "18ch",
            }}
          >
            {row.headingHe}
          </h3>
        ) : null}
        <StoryBody bodyHe={row.bodyHe} maxInlineSize="30rem" />
      </div>

      {row.imageUrl && row.imageAltHe ? (
        <div className="[min-inline-size:0]">
          <div
            className="w-full [min-inline-size:0]"
            style={{
              transform: "rotate(-2deg)",
              backgroundColor: "var(--color-surface-raised)",
              padding: "12px",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-photo)",
            }}
          >
            <span
              className="relative block w-full overflow-hidden [min-inline-size:0]"
              style={{ aspectRatio: "3 / 2", borderRadius: "var(--radius-sm)" }}
            >
              <Image
                src={row.imageUrl}
                alt={row.imageAltHe}
                fill
                sizes="(max-width: 767px) 88vw, 380px"
                style={{ objectFit: "cover" }}
              />
            </span>
          </div>
        </div>
      ) : null}
    </Tag>
  );
}

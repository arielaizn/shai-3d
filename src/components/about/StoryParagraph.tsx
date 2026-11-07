import * as React from "react";

import { SectionHeading } from "@/components/ui/SectionHeading";

import { StoryBody } from "./StoryBody";
import { PROSE_MAX, type StoryRow } from "./sections";

/**
 * `opener` and `paragraph`.
 *
 * The opener sits above the rail (09b §16, conflict 6) and is the one paragraph on
 * the page set at `body-lg`: it opens with the business in a single line so nobody
 * thinks they landed on a charity page, then hands the reader to the story.
 *
 * Its `h2` ends with the terminal voxel rather than a full stop, per 02 §3.2. The red
 * full stop from the footer wordmark is not repeated here: 09b §7 keeps this page
 * clear of red until the closing band.
 */
export function StoryParagraph({ row, lead = false }: { row: StoryRow; lead?: boolean }) {
  return (
    <div
      className="flex flex-col gap-4 [min-inline-size:0]"
      style={{ paddingInlineStart: lead ? undefined : "var(--rail-w)" }}
    >
      {row.headingHe ? (
        <SectionHeading level={2} voxel={lead ? "turquoise" : "none"}>
          {row.headingHe}
        </SectionHeading>
      ) : null}

      <StoryBody
        bodyHe={row.bodyHe}
        size={lead ? "lead" : "body"}
        tone={lead ? "primary" : "secondary"}
        maxInlineSize={PROSE_MAX}
      />
    </div>
  );
}

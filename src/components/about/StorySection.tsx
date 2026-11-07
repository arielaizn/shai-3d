import * as React from "react";

import { Reveal } from "@/components/home/Reveal";

import { StoryImageFull } from "./StoryImageFull";
import { StoryParagraph } from "./StoryParagraph";
import { StoryPullQuote } from "./StoryPullQuote";
import { StoryStatement } from "./StoryStatement";
import { StoryTimelineItem } from "./StoryTimelineItem";
import { StoryTwoUp } from "./StoryTwoUp";
import type { StoryRow } from "./sections";

/**
 * One row of the story, routed by kind and given its entrance.
 *
 * 07 §6.1 puts `/about` down as "every story section, one at a time", and 07 §5.2
 * makes `layer-rise` the only scroll entrance on the site. So each section gets its
 * own `Reveal` with a cream cover and no stagger: a cover in the section's own ground
 * colour lifts out of the block and uncovers the text from the bottom edge upward,
 * the way a print bed builds an object. The text underneath is opaque the whole time,
 * so nothing on this page is ever half readable while it arrives.
 *
 * 09 §11 sketches a softer `opacity + translateY` entrance for this page. 07 owns
 * motion and allows one scroll entrance for the whole site; using a second one here
 * would put two vocabularies on one scroll.
 *
 * [deviation: `Reveal` is imported from `src/components/home/`. Its own header says it
 * belongs in `src/components/motion/` and should move once a second page needs it.
 * This is that second page; the move is left out of this pass because it edits files
 * this assignment does not own.]
 */

/** The four kinds that leave the rail and take the full column. */
const BREATH_KINDS = new Set(["pullQuote", "imageFull", "twoUp", "statement"]);

export function StorySection({ row, lead = false }: { row: StoryRow; lead?: boolean }) {
  const breath = BREATH_KINDS.has(row.kind);

  return (
    <Reveal as={breath ? "div" : "section"} cover="cream" className="[min-inline-size:0]">
      <StoryContent row={row} lead={lead} />
    </Reveal>
  );
}

function StoryContent({ row, lead }: { row: StoryRow; lead: boolean }) {
  switch (row.kind) {
    case "opener":
      return <StoryParagraph row={row} lead />;
    case "paragraph":
      return <StoryParagraph row={row} lead={lead} />;
    case "timelineItem":
      return <StoryTimelineItem row={row} />;
    case "pullQuote":
      return <StoryPullQuote row={row} />;
    case "twoUp":
      return <StoryTwoUp row={row} />;
    case "imageFull":
      return <StoryImageFull row={row} />;
    case "statement":
      return <StoryStatement row={row} />;
  }
}

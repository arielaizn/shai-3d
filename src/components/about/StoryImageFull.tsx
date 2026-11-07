import * as React from "react";
import Image from "next/image";

import { BREATH_MAX, BREATH_PAD, type StoryRow } from "./sections";

/**
 * The visual hinge. Full width of the column, breaking the rail.
 *
 * One picture of the work itself, dropped between two paragraphs about the work, so
 * the page stops being a run of sentences for a beat and shows the thing instead.
 *
 * A wide band rather than a tall frame: 2:1 keeps a texture shot reading as a hinge
 * between two sections instead of a wall of colour, and at 390px it lands around
 * 175px tall, which is a beat and not a scroll.
 *
 * No white photo frame here. The frame is a snapshot device and belongs on an object
 * sitting in a room; a macro of the surface itself is better off bled to its own
 * rounded edge.
 *
 * **The picture is product photography.** RESOLUTIONS.md ruling 21: no photograph of
 * Shai or of anyone in his family appears anywhere on this site, and no slot is held
 * open for one. A row with no usable picture is dropped in `sections.ts` rather than
 * drawn as an empty frame, so this component never renders a placeholder.
 *
 * The line under it ships as a `<figcaption>`: it describes the picture, which is what
 * a caption is for, and it never claims whose print is in the frame.
 */
export function StoryImageFull({ row }: { row: StoryRow }) {
  if (!row.imageUrl || !row.imageAltHe) return null;

  return (
    <figure
      className="mx-auto flex flex-col gap-3 [min-inline-size:0]"
      style={{
        maxInlineSize: BREATH_MAX,
        paddingInlineStart: "var(--breath-x)",
        paddingBlock: BREATH_PAD,
      }}
    >
      <span
        className="relative block w-full overflow-hidden [min-inline-size:0]"
        style={{
          aspectRatio: "2 / 1",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <Image
          src={row.imageUrl}
          alt={row.imageAltHe}
          fill
          sizes="(max-width: 767px) 92vw, 704px"
          style={{ objectFit: "cover" }}
        />
      </span>

      {row.bodyHe ? (
        <figcaption
          className="text-pretty [min-inline-size:0]"
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "0.8125rem",
            lineHeight: 1.55,
            letterSpacing: "0.005em",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            maxInlineSize: "44ch",
          }}
        >
          {row.bodyHe}
        </figcaption>
      ) : null}
    </figure>
  );
}

import * as React from "react";

import { PRODUCTS } from "@/content/products";
import { VoxelTail } from "@/components/ui/Voxel";

/**
 * Doc 03 §4.2. The catalogue's one `<h1>` and the line under it.
 *
 * It is deliberately small: no hero image, no band of its own, no red. The objects are
 * the argument on this page, so the first thing that should reach the eye is the first
 * row of the grid, not a headline occupying half a phone screen. On a 390px viewport
 * the whole header plus the filter bar costs about 150px, which leaves the first two
 * cards above the fold.
 *
 * The second line is the promise the grid then keeps, and it is the reason the colour
 * filter exists at all: every object here can be printed in the colour the visitor
 * picks, so a card is a shape rather than a stock item.
 */

export function CatalogHeader() {
  return (
    <div className="flex flex-col gap-3 [min-inline-size:0]">
      <h1
        className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "clamp(2.25rem, 1.37rem + 3.6vw, 4.25rem)",
          fontWeight: 800,
          lineHeight: 0.96,
          letterSpacing: "0em",
          color: "var(--color-text-primary)",
          maxInlineSize: "18ch",
        }}
      >
        <VoxelTail tone="turquoise">{PRODUCTS.header.heading}</VoxelTail>
      </h1>

      <p
        className="text-pretty [min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "1.125rem",
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
          maxInlineSize: "40ch",
        }}
      >
        {PRODUCTS.header.sub}
      </p>
    </div>
  );
}

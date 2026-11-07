import * as React from "react";

import { Reveal } from "@/components/home/Reveal";

import { CatalogGeneratorStrip } from "./CatalogGeneratorStrip";
import { ProductCard } from "./ProductCard";
import type { CatalogProduct } from "./model";

/**
 * Doc 03 §4.5. Columns: 2 below 768, 3 to 1279, 4 above. Every track is
 * `minmax(0, 1fr)` per RESOLUTIONS §12, because a bare `1fr` carries an implicit
 * `min-width: auto`, refuses to shrink under a long Hebrew title, and in RTL the
 * overflow leaves to the left and puts a scrollbar on the whole document.
 *
 * The generator strip goes in after the **second row**, and a row is a different
 * number of cards at every breakpoint. Rather than measure the viewport in JavaScript,
 * all three insertion points are rendered and CSS shows the one that belongs to the
 * current column count. Nothing to hydrate, nothing to get wrong on first paint.
 *
 * Entrance is the site's one scroll entrance, `layer-rise`, staggered at 40ms and
 * capped at 12 by `STAGGER.gridCap` so a full grid does not take two seconds to land.
 */

/** [insertion index, visibility] per column count: 2 cols, 3 cols, 4 cols. */
const STRIPS: readonly { after: number; className: string }[] = [
  { after: 4, className: "md:hidden" },
  { after: 6, className: "hidden md:block xl:hidden" },
  { after: 8, className: "hidden xl:block" },
];

const SIZES = "(max-width: 767px) 44vw, (max-width: 1279px) 30vw, 260px";

export type ProductGridProps = {
  products: readonly CatalogProduct[];
  /** One clock for the whole grid. */
  now?: number;
  /** Off inside the related rail, which is far below the fold. */
  showStrip?: boolean;
  /** How many leading images skip lazy loading. The first row, and only on the catalog. */
  eager?: number;
  "aria-label"?: string;
};

export function ProductGrid({
  products,
  now,
  showStrip = true,
  eager = 0,
  "aria-label": ariaLabel,
}: ProductGridProps) {
  return (
    <ul
      aria-label={ariaLabel}
      className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))] [min-inline-size:0]"
    >
      {products.map((product, index) => (
        <React.Fragment key={product.slug}>
          <Reveal as="li" cover="cream" stagger="grid" index={index} className="[min-inline-size:0]">
            <ProductCard
              product={product}
              index={index}
              now={now}
              sizes={SIZES}
              priority={index < eager}
            />
          </Reveal>

          {showStrip
            ? STRIPS.filter((strip) => strip.after === index + 1 && products.length > strip.after).map(
                (strip) => (
                  <li
                    key={`strip-${strip.after}`}
                    className={`col-span-full pt-2 ${strip.className} [min-inline-size:0]`}
                  >
                    <CatalogGeneratorStrip />
                  </li>
                ),
              )
            : null}
        </React.Fragment>
      ))}
    </ul>
  );
}

import * as React from "react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { PRODUCT } from "@/content/products";

import { ProductGrid } from "./ProductGrid";
import type { CatalogProduct } from "./model";

/**
 * Doc 03 §5.4. Four more objects under the H2 `עוד דברים שיצאו לי מהמדפסת`.
 *
 * It reuses the catalogue's own `ProductCard` through `ProductGrid`, so a card here
 * behaves exactly like a card there: same tilt, same badges, same accessible name,
 * same ink price. Two card components would drift within a week.
 *
 * The generator strip is off. It belongs mid-scan in a catalogue that is not landing,
 * and this rail sits below a page that has already made its offer.
 */

export type RelatedProductsProps = {
  products: readonly CatalogProduct[];
  now?: number;
};

export function RelatedProducts({ products, now }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 [min-inline-size:0]" aria-labelledby="product-related">
      <SectionHeading level={2} id="product-related" rule>
        {PRODUCT.related.heading}
      </SectionHeading>

      <ProductGrid products={products} now={now} showStrip={false} />
    </section>
  );
}

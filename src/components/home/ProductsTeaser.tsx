import * as React from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HOME } from "@/content/home";

import { Band } from "./Band";
import { ProductTeaserCard, type TeaserProduct } from "./ProductTeaserCard";
import { Reveal } from "./Reveal";

/**
 * Four things Shai has already made, doc 03 §3.4.
 *
 * It turns an abstract claim into concrete objects with prices, which is what makes a
 * visitor who came for the story stay as a buyer.
 *
 * The grid tracks are `minmax(0, 1fr)` per RESOLUTIONS §12, never a bare `1fr`: a
 * `1fr` track carries `min-width: auto`, a long Hebrew title refuses to shrink under
 * it, and in RTL the overflow leaves to the left and takes the whole page with it.
 *
 * Before the catalogue is seeded the band shows its own empty line from 09c §10
 * rather than an empty grid, because an empty grid reads as a broken page.
 */

/**
 * No stand-in photographs. Ariel removed them: a product of Shai's shown with a
 * generated picture of an object he never printed is a lie the card tells silently.
 * A product with no photograph renders its own empty frame instead.
 */

export type ProductsTeaserProps = {
  products: readonly TeaserProduct[];
};

export function ProductsTeaser({ products }: ProductsTeaserProps) {
  const { products: copy } = HOME;

  return (
    <Band ground="cream">
      <div className="flex flex-col gap-8 md:gap-12 [min-inline-size:0]">
        <Reveal as="div" cover="cream">
          <div className="flex flex-wrap items-end justify-between gap-4 [min-inline-size:0]">
            <SectionHeading level={2} rule>
              {copy.heading}
            </SectionHeading>
            <div className="hidden md:block">
              <LinkButton href={copy.href} variant="ghost" size="md">
                {copy.cta}
              </LinkButton>
            </div>
          </div>
        </Reveal>

        {products.length === 0 ? (
          <EmptyState title={copy.empty} tone="onRaised" />
        ) : (
          <ul className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:gap-5 lg:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))] xl:gap-6 [min-inline-size:0]">
            {/* doc 03 §3.4: the 1024-1279 range runs three columns and drops the fourth card */}
            {products.slice(0, 4).map((product, index) => (
              <Reveal
                as="li"
                key={product.slug}
                cover="cream"
                stagger="grid"
                index={index}
                className={index === 3 ? "[min-inline-size:0] lg:max-xl:hidden" : "[min-inline-size:0]"}
              >
                <ProductTeaserCard
                  product={product}
                  index={index}
                />
              </Reveal>
            ))}
          </ul>
        )}

        <div className="md:hidden">
          <LinkButton href={copy.href} variant="ghost" size="lg" fullWidth>
            {copy.cta}
          </LinkButton>
        </div>
      </div>
    </Band>
  );
}

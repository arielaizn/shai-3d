import * as React from "react";
import Image from "next/image";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { Price } from "@/components/ui/Price";
import { TiltCard } from "@/components/ui/TiltCard";
import { PRODUCTS } from "@/content/products";
import { priceLabel } from "@/lib/format/price";

/**
 * A featured product on the home page, doc 03 §3.4 and §4.4.
 *
 * Doc 03 §0.2, the red budget: **a card in a grid prints its price in ink.** The red
 * price tag belongs to the two reveal moments, the product detail page and the
 * generator result. Four red tags in a teaser row would spend the whole budget and
 * the section's own CTA would lose.
 *
 * The whole card is one link, so the badge is a decorative `<span>` and never a
 * button: a nested interactive element inside a link is a keyboard trap waiting to
 * happen. The link's accessible name is `titleHe + ', ' + priceLabel`, so a screen
 * reader user hears the price without having to enter the card.
 *
 * [The catalogue's own `ProductCard` is owned by the products page. This is the
 * teaser variant, kept inside the home page's files so the two can be built in
 * parallel; fold it into the shared card when the catalogue lands.]
 */

export type TeaserProduct = {
  slug: string;
  titleHe: string;
  subtitleHe?: string | null;
  priceMode: "fixed" | "from" | "quote";
  priceAgorot: number;
  badgeHe?: string | null;
  heroImageUrl?: string | null;
};

export type ProductTeaserCardProps = {
  product: TeaserProduct;
  index: number;
  /** Local placeholder used until the catalogue has real photography. */
  fallbackImage?: string;
};

export function ProductTeaserCard({ product, index, fallbackImage }: ProductTeaserCardProps) {
  const image = product.heroImageUrl ?? fallbackImage ?? null;
  const showsPrice = product.priceMode !== "quote";
  const label = showsPrice
    ? PRODUCTS.card.linkAria
        .replace("{nameHe}", product.titleHe)
        .replace("{price} ש״ח", priceLabel(product.priceAgorot))
    : product.titleHe;

  return (
    <TiltCard
      href={`/products/${product.slug}`}
      rotate={index % 2 === 0 ? -2 : 2}
      aria-label={label}
      className="[min-inline-size:0]"
    >
      <div className="flex flex-col gap-3 p-3 [min-inline-size:0]">
        <span
          className="relative block aspect-square w-full overflow-hidden [min-inline-size:0]"
          style={{ borderRadius: "var(--radius-md)", backgroundColor: "var(--color-cream-100)" }}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 767px) 44vw, (max-width: 1279px) 30vw, 280px"
              style={{ objectFit: "cover" }}
            />
          ) : null}

          {product.badgeHe ? (
            <span className="absolute top-3 start-3">
              <ChipBadge tone="turquoise" size="sm">
                {product.badgeHe}
              </ChipBadge>
            </span>
          ) : null}
        </span>

        <div className="flex flex-col gap-1 px-1 pb-1 [min-inline-size:0]">
          <p
            className="line-clamp-2 font-[family-name:var(--font-rubik)] [min-inline-size:0]"
            style={{
              fontSize: "1.0625rem",
              fontWeight: 700,
              lineHeight: 1.25,
              color: "var(--color-text-primary)",
            }}
          >
            {product.titleHe}
          </p>

          {product.subtitleHe ? (
            <p
              className="line-clamp-1 [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "0.875rem",
                lineHeight: 1.5,
                color: "var(--color-text-muted)",
              }}
            >
              {product.subtitleHe}
            </p>
          ) : null}

          {showsPrice ? (
            <p className="pt-1 [min-inline-size:0]">
              {product.priceMode === "from" ? (
                <span
                  style={{
                    fontFamily: "var(--font-assistant), system-ui, sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {"מתחיל מ-"}
                </span>
              ) : null}
              {/* the card is a link with its own name, so the price is not announced
                  a second time from inside it */}
              <Price
                agorot={product.priceAgorot}
                size="sm"
                tone="ink"
                announce={false}
                style={{ fontSize: "1.125rem", fontWeight: 800 }}
              />
            </p>
          ) : null}
        </div>
      </div>
    </TiltCard>
  );
}

import * as React from "react";
import Image from "next/image";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { Price } from "@/components/ui/Price";
import { TiltCard } from "@/components/ui/TiltCard";
import { PRODUCTS } from "@/content/products";
import { priceLabel } from "@/lib/format/price";

import { ProductCardBadges, badgeSpeech } from "./ProductCardBadges";
import { ArrowGlyph } from "./glyphs";
import { CATEGORY_LABELS, type CatalogProduct } from "./model";

/**
 * The catalogue card, doc 03 §4.4.
 *
 * A 12px white frame on a tilted card, which is what turns a rendered object into
 * something printed and pinned to a wall. Rest is ±2deg; hover and focus-visible both
 * straighten it and lift it. All of that lives in `TiltCard`, so this file only
 * decides what goes inside the frame.
 *
 * The whole card is one `<Link>`, so:
 *   · every badge and the arrow are decorative spans, never buttons. A nested
 *     interactive element inside a link is a keyboard trap
 *   · the accessible name is built here, from 09c's `card.linkAria`, plus what the
 *     badges say, because an `aria-label` on a link suppresses everything inside it
 *
 * Red budget, doc 03 §0.2: **a card in a grid prints its price in ink.** The red price
 * tag belongs to the two reveal moments, the detail page and the generator result.
 * Twelve red tags in a grid would spend the page's whole budget on wallpaper.
 */

export type ProductCardProps = {
  product: CatalogProduct;
  /** Position in the grid. Only the parity is used, for the tilt direction. */
  index: number;
  /** One clock for the whole grid, so the `חדש` window is evaluated once. */
  now?: number;
  /** `sizes` for `next/image`, from the grid that knows its own columns. */
  sizes?: string;
  /** Above-the-fold cards skip lazy loading. The first row only. */
  priority?: boolean;
};

export function ProductCard({ product, index, now, sizes, priority = false }: ProductCardProps) {
  const showsPrice = product.priceMode !== "quote";
  const spoken = [
    showsPrice
      ? PRODUCTS.card.linkAria
          .replace("{nameHe}", product.titleHe)
          .replace("{price} ש״ח", priceLabel(product.priceAgorot))
      : product.titleHe,
    ...badgeSpeech(product, now),
  ].join(", ");

  const categoryLabel = product.categoryKey ? CATEGORY_LABELS[product.categoryKey] : undefined;

  return (
    <TiltCard
      href={`/products/${product.slug}`}
      rotate={index % 2 === 0 ? -2 : 2}
      frame
      aria-label={spoken}
      className="group h-full [min-inline-size:0]"
    >
      <div className="flex h-full flex-col [min-inline-size:0]">
        <div className="relative [min-inline-size:0]">
          <span
            className="relative block aspect-square w-full overflow-hidden [min-inline-size:0]"
            style={{ borderRadius: "var(--radius-md)", backgroundColor: "var(--color-cream-100)" }}
          >
            {product.heroImageUrl ? (
              <Image
                src={product.heroImageUrl}
                alt=""
                fill
                sizes={sizes ?? "(max-width: 767px) 44vw, (max-width: 1279px) 30vw, 260px"}
                priority={priority}
                style={{ objectFit: "cover" }}
              />
            ) : null}
          </span>

          <ProductCardBadges product={product} now={now} />

          {categoryLabel ? (
            // sits on the start (right) edge and overlaps the photo's bottom edge by
            // half its height, which is what stops the card reading as a form field
            <span aria-hidden="true" className="absolute bottom-0 start-3 z-10 translate-y-1/2">
              <ChipBadge tone="ink" size="sm">
                {categoryLabel}
              </ChipBadge>
            </span>
          ) : null}
        </div>

        <div className="flex grow flex-col gap-1 px-1 pb-1 pt-5 [min-inline-size:0]">
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

          {/* 09c §4.4: the hover hint is desktop only, and it is only ever shown on a
              card that really can be turned. It is aria-hidden because the same promise
              is already inside the link's accessible name. */}
          {product.hasModel ? (
            <p
              aria-hidden="true"
              className="hidden opacity-0 transition-opacity duration-140 ease-out-soft group-hover:opacity-100 group-focus-visible:opacity-100 lg:block [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-rubik), system-ui, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 700,
                lineHeight: 1.4,
                color: "var(--color-text-muted)",
              }}
            >
              {PRODUCTS.card.rotateHint}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-2 pt-3 [min-inline-size:0]">
            {showsPrice ? (
              <p className="[min-inline-size:0]">
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
                {/* the link already carries the price in its name; announcing it again
                    from inside would read it twice */}
                <Price
                  agorot={product.priceAgorot}
                  size="sm"
                  tone="ink"
                  announce={false}
                  style={{ fontSize: "1.125rem", fontWeight: 800 }}
                />
              </p>
            ) : (
              <span />
            )}

            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-140 ease-toy group-hover:-translate-x-0.5"
              style={{
                backgroundColor: "var(--color-turq-500)",
                color: "var(--color-ink-900)",
              }}
            >
              <ArrowGlyph size={16} />
            </span>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}

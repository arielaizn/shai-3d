import * as React from "react";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { PRODUCTS } from "@/content/products";

import { CubeGlyph } from "./glyphs";
import { isNewProduct } from "./filters";
import type { CatalogProduct } from "./model";

/**
 * Doc 03 §4.4. **Two badges, never three**, in a fixed priority order:
 *
 *   1. `3D`             turquoise, with the turning cube. This is the badge that marks
 *                       a product as 3D-inspectable, and it appears only when a `.glb`
 *                       really is attached (09c §4.4: a promise the grid makes that the
 *                       detail page cannot keep costs more trust than a surprise price)
 *   2. `זוהר בחושך`      yellow, ink label
 *   3. `חדש`            ink, for a product created inside the last 30 days
 *   4. the admin's own `badgeHe`, last, because Shai typed it and the system did not
 *
 * They are decorative `<span>`s inside a link, never buttons. What they mean is folded
 * into the link's own accessible name by `ProductCard`, so nothing is lost by hiding
 * them from the accessibility tree here.
 */

export type ProductCardBadgesProps = {
  product: CatalogProduct;
  /** Injected so a grid renders with one clock rather than one per card. */
  now?: number;
};

export function ProductCardBadges({ product, now }: ProductCardBadgesProps) {
  const badges: React.ReactNode[] = [];

  if (product.hasModel) {
    badges.push(
      <ChipBadge key="3d" tone="turquoise" size="sm" icon={<CubeGlyph size={12} />}>
        {PRODUCTS.badges.threeD}
      </ChipBadge>,
    );
  }
  if (product.isGlow) {
    badges.push(
      <ChipBadge key="glow" tone="yellow" size="sm">
        {PRODUCTS.badges.glow}
      </ChipBadge>,
    );
  }
  if (isNewProduct(product, now)) {
    badges.push(
      <ChipBadge key="new" tone="ink" size="sm">
        {PRODUCTS.badges.new}
      </ChipBadge>,
    );
  }
  if (product.badgeHe) {
    badges.push(
      <ChipBadge key="admin" tone="cream" size="sm">
        {product.badgeHe}
      </ChipBadge>,
    );
  }

  if (badges.length === 0) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-3 start-3 z-10 flex flex-wrap items-start gap-1.5 [max-inline-size:calc(100%-1.5rem)] [min-inline-size:0]"
    >
      {badges.slice(0, 2)}
    </span>
  );
}

/**
 * The same priority list as a sentence, appended to the link's accessible name. A
 * screen reader user learns that this one spins without having to enter the card.
 */
export function badgeSpeech(product: CatalogProduct, now?: number): string[] {
  const spoken: string[] = [];
  if (product.hasModel) spoken.push(PRODUCTS.badges.threeDAria);
  if (product.isGlow) spoken.push(PRODUCTS.badges.glow);
  if (isNewProduct(product, now)) spoken.push(PRODUCTS.badges.new);
  return spoken.slice(0, 2);
}

"use client";

import * as React from "react";

import { StickyWhatsApp } from "@/components/layout/StickyWhatsApp";
import { agorotToShekels } from "@/lib/format/price";
import type { WaMessageConfig } from "@/lib/whatsapp";

import { ProductBuyPanel } from "./ProductBuyPanel";
import { ProductMediaStage } from "./ProductMediaStage";
import { narrowPalette, type Filament, type ProductDetail } from "./model";
import { useHeaderOffset } from "./useHeaderOffset";

/**
 * The interactive half of the detail page: the media stage, the buy panel, and the two
 * pieces of state they share.
 *
 * ## Layout, and why the DOM order is what it is
 *
 * Doc 03 §5.2 draws the buy panel on the **start (right)** edge and the media on the
 * end edge, and doc 03 §5.3 puts the media **first** on a phone. Those two are only
 * compatible if the DOM keeps the media first and the desktop grid places the panel
 * into column 1 explicitly. Reordering with `order` would have been the same picture
 * and a worse page: a keyboard user would tab from the breadcrumb straight into the
 * price, and a screen reader would read the object's description before ever
 * mentioning that there is an object.
 *
 * ## The price, computed in one place
 *
 * `unit = priceAgorot + the chosen filament's surcharge`, `total = unit x quantity`,
 * both in integer agorot because that is the unit the whole codebase works in
 * (RESOLUTIONS §א). The same two numbers feed the tag, the sticky bar and the WhatsApp
 * message, so the number the visitor saw and the number Shai receives cannot drift.
 *
 * ## The quote case
 *
 * A `quote` product has no price to send, and `buildWaMessage({ kind: "product" })`
 * always writes a `מחיר באתר` line. Sending `מחיר באתר: 0 שקל` would be a lie in the
 * one message the whole site exists to produce, so a quote product hands the primary
 * button the shorter `product_question` message instead, which carries the name, the
 * code and the link and asks the question the visitor actually has.
 */

export type ProductDetailViewProps = {
  product: ProductDetail;
  palette: readonly Filament[];
};

export function ProductDetailView({ product, palette }: ProductDetailViewProps) {
  // the buy column sticks under the whole header, announcement row included, with a
  // 24px breath above it. `insetBlockStart` is inert until `lg:sticky` applies.
  const headerOffset = useHeaderOffset(80);

  // `narrowPalette` is shared with the spec table, so the swatch strip down the page
  // and the picker up here can never disagree about what this object comes in.
  const available = React.useMemo(
    () => narrowPalette(palette, product.availableColorKeys),
    [palette, product.availableColorKeys],
  );

  const firstInStock = available.find((filament) => !filament.soldOut) ?? available[0];
  const [colorKey, setColorKey] = React.useState<string | null>(firstInStock?.key ?? null);
  const [quantity, setQuantity] = React.useState(1);

  const color = available.find((filament) => filament.key === colorKey);
  const unitAgorot = product.priceAgorot + (color?.extraCostAgorot ?? 0);
  const totalAgorot = unitAgorot * quantity;

  const dimensions =
    product.specs.widthMm !== undefined
    && product.specs.heightMm !== undefined
    && product.specs.depthMm !== undefined
      ? { w: product.specs.widthMm, h: product.specs.heightMm, d: product.specs.depthMm }
      : undefined;

  const questionConfig: WaMessageConfig = {
    kind: "product_question",
    nameHe: product.titleHe,
    slug: product.slug,
  };

  const primaryConfig: WaMessageConfig =
    product.priceMode === "quote"
      ? questionConfig
      : {
          kind: "product",
          nameHe: product.titleHe,
          slug: product.slug,
          colorNameHe: color?.nameHe,
          quantity,
          dimensionsMm: dimensions,
          unitIls: agorotToShekels(unitAgorot),
          totalIls: agorotToShekels(totalAgorot),
        };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:gap-12 xl:gap-16 [min-inline-size:0]">
        <div className="lg:col-start-2 lg:row-start-1 [min-inline-size:0]">
          <ProductMediaStage product={product} glow={color?.isGlow ?? false} />
        </div>

        <div
          className="lg:col-start-1 lg:row-start-1 lg:sticky lg:self-start [min-inline-size:0]"
          style={{ insetBlockStart: headerOffset + 24 }}
        >
          <ProductBuyPanel
            product={product}
            palette={available}
            colorKey={colorKey}
            onColorChange={setColorKey}
            quantity={quantity}
            onQuantityChange={setQuantity}
            unitAgorot={unitAgorot}
            totalAgorot={totalAgorot}
            primaryConfig={primaryConfig}
            questionConfig={questionConfig}
          />
        </div>
      </div>

      <StickyWhatsApp
        variant="product"
        priceAgorot={product.priceMode === "quote" ? undefined : totalAgorot}
        waConfig={primaryConfig}
        waSource="sticky_product"
      />
    </>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Voxel } from "@/components/ui/Voxel";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { PRODUCT } from "@/content/products";

import { ColorPicker } from "./ColorPicker";
import { ProductPriceTag } from "./ProductPriceTag";
import { QuantityStepper } from "./QuantityStepper";
import { CATEGORY_LABELS, type Filament, type ProductDetail } from "./model";
import type { WaMessageConfig } from "@/lib/whatsapp";

/**
 * The buy column, doc 03 §5.2 and §5.3. Everything a visitor decides lives here, and
 * every decision ends at one WhatsApp link.
 *
 * **Nothing on this page takes money.** Shai is thirteen, with no business licence and
 * no payment processing, so the last thing the visitor touches is an `https://wa.me`
 * href with the whole specification already written into it: name, code, colour,
 * quantity, dimensions, price and the link back. `src/lib/whatsapp.ts` builds it, and
 * it is the only builder on the site.
 *
 * **The price is the peak, so it is the loudest object in the column** and it is the
 * one thing that reacts: `ProductPriceTag` is re-keyed on the amount, so a quantity
 * press slams a new tag in and announces the new total instead of changing a number in
 * silence.
 *
 * **On mobile the primary action is not here.** Doc 03 §5.3 puts it in the sticky bar,
 * which is always in reach and carries the live price beside it, and leaves the
 * secondary `יש לי שאלה` inline. `ProductDetailView` owns that bar because it owns the
 * quantity, which is what the bar's price is computed from.
 */

export type ProductBuyPanelProps = {
  product: ProductDetail;
  /** Already narrowed to the colours this product can be printed in. */
  palette: readonly Filament[];
  colorKey: string | null;
  onColorChange: (key: string) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  unitAgorot: number;
  totalAgorot: number;
  primaryConfig: WaMessageConfig;
  questionConfig: WaMessageConfig;
};

export function ProductBuyPanel({
  product,
  palette,
  colorKey,
  onColorChange,
  quantity,
  onQuantityChange,
  unitAgorot,
  totalAgorot,
  primaryConfig,
  questionConfig,
}: ProductBuyPanelProps) {
  const colorLabelId = React.useId();
  const quantityLabelId = React.useId();
  const category = product.categoryKey ? CATEGORY_LABELS[product.categoryKey] : undefined;
  const showsPrice = product.priceMode !== "quote";

  return (
    <div className="flex flex-col gap-6 [min-inline-size:0]">
      <div className="flex flex-col gap-3 [min-inline-size:0]">
        {category ? <Eyebrow tone="play">{category}</Eyebrow> : null}

        <h1
          className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
          style={{
            fontSize: "clamp(2rem, 1.6rem + 1.7vw, 2.75rem)",
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: "0em",
            color: "var(--color-text-primary)",
            maxInlineSize: "18ch",
          }}
        >
          {product.titleHe}
        </h1>

        {showsPrice ? (
          <ProductPriceTag
            agorot={totalAgorot}
            from={product.priceMode === "from"}
            perUnit={quantity > 1}
            unitAgorot={unitAgorot}
          />
        ) : null}

        {product.subtitleHe ? (
          <p
            className="text-pretty [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color: "var(--color-text-secondary)",
              maxInlineSize: "38ch",
            }}
          >
            {product.subtitleHe}
          </p>
        ) : null}
      </div>

      {palette.length > 0 ? (
        <div className="flex flex-col gap-2 [min-inline-size:0]">
          <FieldLabel id={colorLabelId}>{PRODUCT.color.label}</FieldLabel>
          <ColorPicker
            palette={palette}
            value={colorKey}
            onChange={onColorChange}
            labelId={colorLabelId}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 [min-inline-size:0]">
        <FieldLabel id={quantityLabelId}>{PRODUCT.quantity.label}</FieldLabel>
        <QuantityStepper
          value={quantity}
          onChange={onQuantityChange}
          labelId={quantityLabelId}
        />
      </div>

      <div className="flex flex-col gap-3 [min-inline-size:0]">
        {/* the primary is desktop only: below 1024 it lives in the sticky bar, where a
            thumb can reach it without scrolling back up past the spec table */}
        <span className="hidden lg:block [min-inline-size:0]">
          <WhatsAppLink
            config={primaryConfig}
            source="product_cta"
            variant="accent"
            size="lg"
            fullWidth
            iconStart={<WhatsAppGlyph />}
          >
            {PRODUCT.cta.primary}
          </WhatsAppLink>
        </span>

        <WhatsAppLink
          config={questionConfig}
          source="product_question"
          variant="ghost"
          size="lg"
          fullWidth
        >
          {PRODUCT.cta.secondary}
        </WhatsAppLink>
      </div>

      <ul
        className="flex flex-col gap-2 [min-inline-size:0]"
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          borderBlockStartWidth: "1px",
          borderBlockStartColor: "color-mix(in oklab, var(--color-ink-900) 10%, transparent)",
          paddingBlockStart: "1rem",
        }}
      >
        {PRODUCT.assurances.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.9375rem",
              fontWeight: 600,
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
            }}
          >
            <Voxel tone="turquoise" size="0.375rem" className="mt-2 shrink-0" />
            <span className="[min-inline-size:0]">{line}</span>
          </li>
        ))}
      </ul>

      <MakerNote />
    </div>
  );
}

function FieldLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span
      id={id}
      className="[min-inline-size:0]"
      style={{
        fontFamily: "var(--font-rubik), system-ui, sans-serif",
        fontSize: "0.8125rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: "var(--color-text-muted)",
      }}
    >
      {children}
    </span>
  );
}

/**
 * Doc 03 §5.4. One line and one link, and it sits directly under the CTA because who
 * made the thing is part of what the visitor is deciding to buy. It is the detail
 * page's only door into the story, and it stays a quiet text link rather than a button:
 * the page already has its red object.
 */
export function MakerNote() {
  return (
    <p
      className="[min-inline-size:0]"
      style={{
        fontFamily: "var(--font-assistant), system-ui, sans-serif",
        fontSize: "0.9375rem",
        lineHeight: 1.7,
        color: "var(--color-text-muted)",
      }}
    >
      {PRODUCT.makerNote.line}{" "}
      <Link
        href={PRODUCT.makerNote.href}
        style={{ color: "var(--color-text-link)", fontWeight: 700 }}
      >
        {PRODUCT.makerNote.link}
      </Link>
    </p>
  );
}

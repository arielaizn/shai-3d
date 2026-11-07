import * as React from "react";

import { Price } from "@/components/ui/Price";
import { PRODUCT } from "@/content/products";
import { formatAgorot } from "@/lib/format/price";

/**
 * The price reveal on the detail page, doc 03 §5.2.
 *
 * Doc 03 §0.2 rations red to one filled surface per viewport and then names the two
 * exceptions itself: **the red price tag is reserved for the product detail page and
 * the generator's result.** This is one of the two. Doc 01 already carries the tokens
 * for it (`--color-price-tag-bg`, `--color-price-tag-text`, `--color-price-tag-string`),
 * so the filled tag is the system's own object rather than a new one, and ink on
 * red-500 measures 4.66 which clears AA at every size.
 *
 * The `-3deg` rest angle is where `@keyframes price-slam` lands, so the tag's resting
 * state and the end of its entrance are the same transform and nothing snaps when the
 * animation finishes. The animation is re-keyed on the amount, which is what gives the
 * 220ms hit of doc 03 §5.4 every time the quantity or the colour changes: the tag is
 * remounted, so the `role="status"` inside `Price` fires too and the new total is
 * spoken instead of changing in silence.
 *
 * Under `prefers-reduced-motion` the global rule in `globals.css` collapses the
 * duration to 0.01ms and the `both` fill holds the 100% keyframe, which is the rest
 * state. Nothing has to be special-cased.
 */

export type ProductPriceTagProps = {
  agorot: number;
  /** `priceMode === "from"` prints `מתחיל מ-` before the number. */
  from?: boolean;
  /** `45 ש״ח ליחידה` under the tag, once the quantity is above one. */
  perUnit?: boolean;
  /** The single-unit price the line above refers to. */
  unitAgorot?: number;
};

export function ProductPriceTag({
  agorot,
  from = false,
  perUnit = false,
  unitAgorot,
}: ProductPriceTagProps) {
  // digits isolated, Hebrew unit outside the isolate, per RESOLUTIONS §18
  const unitLine =
    perUnit && typeof unitAgorot === "number" ? (
      <>
        <bdi dir="ltr" className="tabular-nums">
          {formatAgorot(unitAgorot)}
        </bdi>{" "}
        {`${PRODUCT.price.suffix} ${PRODUCT.price.each}`}
      </>
    ) : null;

  return (
    <div className="flex flex-col items-start gap-1.5 [min-inline-size:0]">
      <span
        key={agorot}
        className="animate-price-slam inline-flex items-center gap-2 [min-inline-size:0]"
        style={{
          backgroundColor: "var(--color-price-tag-bg)",
          color: "var(--color-price-tag-text)",
          borderWidth: "3px",
          borderColor: "var(--color-ink-900)",
          borderRadius: "var(--radius-lg)",
          paddingInline: "1.125rem",
          paddingBlock: "0.5rem",
          boxShadow: "var(--shadow-md)",
          transform: "rotate(-3deg)",
        }}
      >
        {/* the punched hole a paper tag hangs from. Decorative, so it is a bare span. */}
        <span
          aria-hidden="true"
          className="shrink-0"
          style={{
            inlineSize: "0.5rem",
            blockSize: "0.5rem",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-price-tag-string)",
            opacity: 0.55,
          }}
        />

        {from ? (
          <span
            style={{
              fontFamily: "var(--font-rubik), system-ui, sans-serif",
              fontSize: "0.9375rem",
              fontWeight: 700,
            }}
          >
            {"מתחיל מ-"}
          </span>
        ) : null}

        <Price agorot={agorot} size="lead" tone="onRed" />
      </span>

      {perUnit ? (
        <span
          className="[min-inline-size:0]"
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--color-text-muted)",
          }}
        >
          {unitLine}
        </span>
      ) : null}
    </div>
  );
}

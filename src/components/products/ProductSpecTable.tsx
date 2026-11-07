import * as React from "react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { PRODUCT } from "@/content/products";

import { formatDimensions, formatLeadTime, formatPrintTime } from "./model";
import type { Filament, ProductDetail } from "./model";

/**
 * Doc 03 §5.4. The measurements, on a white card over the page's cream.
 *
 * Every numeric value renders as `<bdi>{digits}</bdi> {unit}` with the Hebrew unit
 * **outside** the isolate, per RESOLUTIONS §18: `60x22x4 מ״מ` is already correct in an
 * RTL paragraph, and wrapping the whole string in `dir="ltr"` is what breaks it.
 *
 * **A row with no value is not rendered.** `products.bySlug` reports dimensions from
 * the uploaded mesh's bounding box and nothing else, so a Convex product would
 * otherwise print `עוד לא מדדתי את זה` four times in a row, which reads as a broken
 * page rather than as honesty. The string is kept for the case it was written for:
 * a product with nothing measured at all.
 *
 * The colour row is a swatch strip rather than a list of names, because eighteen
 * Hebrew colour names in a table cell is unreadable and the point of the row is the
 * range, not the vocabulary. Each swatch keeps its name as its accessible label.
 */

export type ProductSpecTableProps = {
  product: ProductDetail;
  /** Already narrowed to the colours this product can be printed in. */
  palette: readonly Filament[];
};

type Row = { label: string; value: React.ReactNode };

/** Digits isolated, Hebrew unit left outside. RESOLUTIONS §18. */
function Measure({ digits, unit }: { digits: string; unit?: string }) {
  return (
    <>
      <bdi dir="ltr" className="tabular-nums">
        {digits}
      </bdi>
      {unit ? ` ${unit}` : null}
    </>
  );
}

export function ProductSpecTable({ product, palette }: ProductSpecTableProps) {
  const { specs } = product;
  const rows: Row[] = [];

  const dimensions = formatDimensions(specs);
  if (dimensions) {
    rows.push({
      label: PRODUCT.spec.rows.dimensions,
      value: <Measure digits={dimensions} unit={PRODUCT.spec.units.mm} />,
    });
  }

  if (specs.materialHe) {
    rows.push({ label: PRODUCT.spec.rows.material, value: <bdi>{specs.materialHe}</bdi> });
  }

  const printTime = formatPrintTime(specs.printMinutes);
  if (printTime) {
    rows.push({ label: PRODUCT.spec.rows.printTime, value: printTime });
  }

  if (typeof specs.weightG === "number" && specs.weightG > 0) {
    rows.push({
      label: PRODUCT.spec.rows.weight,
      value: <Measure digits={String(specs.weightG)} unit={PRODUCT.spec.units.grams} />,
    });
  }

  if (typeof specs.layerMm === "number" && specs.layerMm > 0) {
    rows.push({
      label: PRODUCT.spec.rows.layer,
      value: <Measure digits={String(specs.layerMm)} unit={PRODUCT.spec.units.mm} />,
    });
  }

  if (palette.length > 0) {
    rows.push({
      label: PRODUCT.spec.rows.colors,
      value: (
        <span className="flex flex-wrap items-center gap-1.5 [min-inline-size:0]">
          {palette.map((filament) => (
            <span
              key={filament.key}
              title={filament.nameHe}
              aria-label={filament.nameHe}
              role="img"
              className="inline-block shrink-0"
              style={{
                inlineSize: "1.125rem",
                blockSize: "1.125rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: filament.hex,
                boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--color-ink-900) 25%, transparent)",
                opacity: filament.soldOut ? 0.45 : 1,
              }}
            />
          ))}
        </span>
      ),
    });
  }

  rows.push({
    label: PRODUCT.spec.rows.leadTime,
    value:
      product.leadTimeDaysMin === product.leadTimeDaysMax && product.leadTimeDaysMin === 1 ? (
        // one day has no plural to fall into, so it is spelled rather than counted
        "יום אחד"
      ) : (
        <Measure
          digits={formatLeadTime(product.leadTimeDaysMin, product.leadTimeDaysMax)}
          unit={PRODUCT.spec.units.days}
        />
      ),
  });

  return (
    <section className="flex flex-col gap-5 [min-inline-size:0]" aria-labelledby="product-spec">
      <SectionHeading level={2} size={3} id="product-spec" voxel="none">
        {PRODUCT.spec.heading}
      </SectionHeading>

      <div
        className="[min-inline-size:0]"
        style={{
          backgroundColor: "var(--color-surface-raised)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-md)",
          padding: "1.25rem",
        }}
      >
        {rows.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.9375rem",
              color: "var(--color-text-muted)",
            }}
          >
            {PRODUCT.spec.empty}
          </p>
        ) : (
          <dl className="grid gap-x-8 gap-y-0 md:grid-cols-[repeat(2,minmax(0,1fr))] [min-inline-size:0]">
            {rows.map((row, index) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 py-3 [min-inline-size:0]"
                style={{
                  borderBlockEndWidth: index < rows.length - 1 ? "1px" : "0",
                  borderBlockEndColor: "color-mix(in oklab, var(--color-ink-900) 8%, transparent)",
                }}
              >
                <dt
                  className="shrink-0 [min-inline-size:0]"
                  style={{
                    fontFamily: "var(--font-assistant), system-ui, sans-serif",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {row.label}
                </dt>
                <dd
                  className="text-end [min-inline-size:0]"
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-assistant), system-ui, sans-serif",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

import * as React from "react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { PRODUCT } from "@/content/products";

/**
 * Doc 03 §5.1. The long description, one `\n` separated paragraph per line.
 *
 * The measure is capped at 62 characters. Hebrew has no ascenders or descenders to
 * give a line its silhouette, so a long line is harder to re-find here than in Latin
 * and the comfortable measure is shorter, not longer.
 *
 * `sizeNoteHe` follows the description as its own line, because it is the sentence
 * that answers the one question a photograph cannot: how big is this actually.
 */

export type ProductDescriptionProps = {
  descriptionHe?: string;
  sizeNoteHe?: string;
};

export function ProductDescription({ descriptionHe, sizeNoteHe }: ProductDescriptionProps) {
  const paragraphs = (descriptionHe ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (paragraphs.length === 0 && !sizeNoteHe) return null;

  return (
    <section className="flex flex-col gap-5 [min-inline-size:0]" aria-labelledby="product-description">
      <SectionHeading level={2} size={3} id="product-description" voxel="none">
        {PRODUCT.description.heading}
      </SectionHeading>

      <div className="flex flex-col gap-4 [min-inline-size:0]">
        {paragraphs.map((line) => (
          <p
            key={line}
            className="text-pretty [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--color-text-secondary)",
              maxInlineSize: "62ch",
            }}
          >
            {line}
          </p>
        ))}

        {sizeNoteHe ? (
          <p
            className="text-pretty [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.9375rem",
              fontWeight: 600,
              lineHeight: 1.7,
              color: "var(--color-text-muted)",
              maxInlineSize: "62ch",
            }}
          >
            {sizeNoteHe}
          </p>
        ) : null}
      </div>
    </section>
  );
}

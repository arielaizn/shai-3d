import * as React from "react";

import { LinkButton } from "@/components/ui/LinkButton";
import { PRODUCTS } from "@/content/products";

/**
 * Doc 03 §4.6. The generator invitation, injected **into** the grid after the second
 * row rather than under it.
 *
 * A visitor scanning a catalogue that is not landing should be caught mid-scan. By the
 * bottom of the grid they have already decided nothing here is for them, and the one
 * thing the site can still offer is the thing only this site does: their own photo,
 * printed.
 *
 * Turquoise ground with the red pill on it. The red is affordable here because the
 * strip appears only when the grid is full, and a full grid has no other red object.
 */

export type CatalogGeneratorStripProps = { className?: string };

export function CatalogGeneratorStrip({ className }: CatalogGeneratorStripProps) {
  return (
    <div
      className={["col-span-full [min-inline-size:0]", className].filter(Boolean).join(" ")}
    >
      <div
        className="flex flex-col items-center justify-between gap-4 px-6 py-7 text-center sm:flex-row sm:text-start [min-inline-size:0]"
        style={{
          backgroundColor: "var(--color-turq-500)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-md)",
          minBlockSize: "8.75rem",
        }}
      >
        <p
          className="text-balance [min-inline-size:0]"
          style={{
            fontFamily: "var(--font-rubik), system-ui, sans-serif",
            fontSize: "clamp(1.125rem, 1.05rem + 0.35vw, 1.375rem)",
            fontWeight: 700,
            lineHeight: 1.35,
            color: "var(--color-text-on-turquoise)",
            maxInlineSize: "38ch",
          }}
        >
          {PRODUCTS.strip.line}
        </p>

        <LinkButton href={PRODUCTS.strip.href} variant="accent" size="lg" className="shrink-0">
          {PRODUCTS.strip.cta}
        </LinkButton>
      </div>
    </div>
  );
}

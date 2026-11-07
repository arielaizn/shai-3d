"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { PRODUCTS } from "@/content/products";

import { describeActive, type Filters } from "./filters";
import type { Filament } from "./model";

/**
 * Doc 03 §4.5. Nothing matched, and that is a conversion opportunity rather than an
 * apology: the visitor has just told the site exactly what they wanted and could not
 * find, so this screen carries the page's **red** CTA and hands that sentence to Shai.
 *
 * The WhatsApp message is built by `src/lib/whatsapp.ts` with `kind: "catalog_empty"`,
 * and the category line is filled from the active chips (09c §4.5).
 */

export type CatalogEmptyStateProps = {
  filters: Filters;
  palette: readonly Filament[];
  onClear: () => void;
};

export function CatalogEmptyState({ filters, palette, onClear }: CatalogEmptyStateProps) {
  const categoryHe = describeActive(
    filters,
    (key) => palette.find((filament) => filament.key === key)?.nameHe,
  );

  return (
    <EmptyState
      title={PRODUCTS.empty.title}
      body={PRODUCTS.empty.body}
      tone="onRaised"
      actions={
        <>
          <WhatsAppLink
            config={{ kind: "catalog_empty", categoryHe }}
            source="catalog_empty"
            variant="accent"
            size="lg"
            iconStart={<WhatsAppGlyph />}
          >
            {PRODUCTS.empty.primaryCta}
          </WhatsAppLink>

          <Button variant="ghost" size="lg" onClick={onClear}>
            {PRODUCTS.empty.secondaryCta}
          </Button>
        </>
      }
    />
  );
}

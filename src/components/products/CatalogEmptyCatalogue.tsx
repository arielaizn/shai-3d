"use client";

import * as React from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { HOME } from "@/content/home";
import { PRODUCTS } from "@/content/products";

/**
 * The catalogue itself is empty, which is a different situation from a filter that
 * matched nothing and needs different words.
 *
 * `CatalogEmptyState` says `אין לי דגם כזה עדיין`, which is true of a filter miss and
 * wrong here: nothing was searched for, there is simply nothing up yet. 09c §10 already
 * writes the right sentence for this one and the home page's teaser uses it,
 * `אני מעלה לכאן דגמים בימים הקרובים`.
 *
 * `fallback.ts` records the ruling that put this state on the map: no stand-in
 * catalogue, because a visitor must never see a product Shai has not actually printed.
 * That makes an empty grid a state the site can genuinely be in on its first day, so it
 * gets the page's red CTA rather than an apology. The generator is that CTA: with no
 * catalogue to browse, the one thing this site can still do for a visitor is print
 * their own photograph.
 *
 * The filter bar and the result count are not rendered at all above this. Filtering
 * nothing into nothing is chrome that only makes the emptiness look like a bug.
 */

export function CatalogEmptyCatalogue() {
  return (
    <div className="pt-8 [min-inline-size:0]">
      {/*
        Title and actions only. `PRODUCTS.strip.line` opens with
        `לא מצאתם בדיוק את מה שרציתם?`, which is true of a visitor who has been
        scanning a grid and false of one who arrived at an empty page, so it is left
        where it belongs and nothing is written to replace it.
      */}
      <EmptyState
        title={HOME.products.empty}
        tone="onRaised"
        actions={
          <>
            <LinkButton href={PRODUCTS.strip.href} variant="accent" size="lg">
              {PRODUCTS.strip.cta}
            </LinkButton>

            <WhatsAppLink
              config={{ kind: "generic" }}
              source="catalog_empty"
              variant="ghost"
              size="lg"
              iconStart={<WhatsAppGlyph />}
            >
              {PRODUCTS.empty.primaryCta}
            </WhatsAppLink>
          </>
        }
      />
    </div>
  );
}

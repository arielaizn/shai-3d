import * as React from "react";

import { ChipBadge } from "@/components/ui/ChipBadge";
import { CONTACT } from "@/content/contact";

import { Card, CardHeading } from "./Card";

/**
 * Getting the thing, 09c §9.6.
 *
 * **No city.** RESOLUTIONS dropped the pickup city site wide, so the line reads
 * `איסוף עצמי בתיאום, נסגור מקום בוואטסאפ` and the place is agreed in a private
 * conversation between two adults. That is not a copy preference, it is the whole
 * reason the site has no address on it anywhere.
 *
 * The lead time is a badge rather than a third bullet, because `מוכן תוך 3 ימי עבודה`
 * is the promise the whole price engine is built around (RESOLUTIONS §7) and it is
 * the sentence a visitor is looking for when they open this card.
 *
 * `note` renders only when a free shipping threshold exists. There is no public
 * query for `pricingConfig` yet, so nothing passes it today and the line stays out
 * of the page rather than shipping with a placeholder number in it.
 */

export type ShippingCardProps = {
  /** `pricingConfig.freeShippingThresholdAgorot`, in whole shekels. */
  freeShippingOverIls?: number;
};

export function ShippingCard({ freeShippingOverIls }: ShippingCardProps) {
  const showsNote = typeof freeShippingOverIls === "number" && freeShippingOverIls > 0;

  return (
    <Card className="gap-4">
      <CardHeading>{CONTACT.shipping.heading}</CardHeading>

      <ul className="flex flex-col gap-1.5 [min-inline-size:0]">
        {[CONTACT.shipping.pickup, CONTACT.shipping.delivery].map((line) => (
          <li
            key={line}
            className="[min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color: "var(--color-text-primary)",
            }}
          >
            {line}
          </li>
        ))}

        {showsNote ? (
          <li
            className="[min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              color: "var(--color-text-primary)",
            }}
          >
            {CONTACT.shipping.note.replace("{n}", String(freeShippingOverIls))}
          </li>
        ) : null}
      </ul>

      <span className="[min-inline-size:0]">
        <ChipBadge tone="turquoise" size="md">
          {CONTACT.shipping.lead}
        </ChipBadge>
      </span>
    </Card>
  );
}

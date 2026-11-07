"use client";

import * as React from "react";

import { LinkButton } from "@/components/ui/LinkButton";
import { Price } from "@/components/ui/Price";
import { DURATION, EASE } from "@/lib/design/motion";
import { STICKY_BAR } from "@/content/site";
import type { WaMessageConfig, WaSource } from "@/lib/whatsapp";

import { WhatsAppGlyph, WhatsAppLink } from "./WhatsAppLink";

/**
 * The persistent WhatsApp affordance, doc 03 §2.5.
 *
 * A sticky bottom bar below 1024px, and **no floating bubble anywhere on the site**.
 * The reasons, in order of weight: what converts here is a sentence with a number in
 * it and a bubble carries neither; the canonical bubble green is a fifth chroma that
 * would out-shout the red CTA on every screen and break the red budget permanently;
 * a corner in RTL lands either on the Android gesture strip or on the iOS back-swipe
 * edge; and a bubble permanently covers one card's price on a 2-up mobile grid.
 *
 * Appearance is driven by two sentinels, never by a scroll offset: the bar springs up
 * once `#hero-end` has left the viewport, and hides again once the footer is 60%
 * visible, because the footer carries its own CTA and two competing CTAs on one
 * screen is the failure the red budget exists to prevent.
 *
 * Desktop needs no equivalent. The header is sticky and carries the red pill.
 */

export type StickyVariant = "generator" | "product" | "catalog" | "contact";

export type StickyWhatsAppProps = {
  variant: StickyVariant;
  /** `product` only: the live price the bar carries beside the primary action. */
  priceAgorot?: number;
  /** `product` only: the message the primary action prefills. */
  waConfig?: WaMessageConfig;
  waSource?: WaSource;
  /** The sentinel that arms the bar. Rendered by the page with `ScrollSentinel`. */
  sentinelId?: string;
};

/** A 1px marker at the bottom of a page's first band. Doc 03 §2.5. */
export function ScrollSentinel({ id = "hero-end" }: { id?: string }) {
  return <div id={id} aria-hidden="true" className="h-px w-full" />;
}

export function StickyWhatsApp({
  variant,
  priceAgorot,
  waConfig,
  waSource,
  sentinelId = "hero-end",
}: StickyWhatsAppProps) {
  const [armed, setArmed] = React.useState(false);
  const [atFooter, setAtFooter] = React.useState(false);

  React.useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    /**
     * The root is stretched far below the viewport on purpose. A plain observer only
     * fires when the intersection state changes, and a 1px sentinel that goes from
     * "below the fold" to "above the fold" in one jump (an anchor link, a restored
     * scroll position, a programmatic scroll) is never intersecting in either state,
     * so the callback never runs and the bar never arms. With the root extended
     * downward the sentinel is intersecting for the whole page below it, and the only
     * transition left is the one that matters: crossing the top of the viewport.
     */
    const observer = new IntersectionObserver(
      ([entry]) => setArmed(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px 99999px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  React.useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting), {
      threshold: 0.6,
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const visible = armed && !atFooter;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden [min-inline-size:0]"
      style={{
        transform: visible ? "translateY(0)" : "translateY(110%)",
        transition: `transform ${DURATION.d4}ms ${EASE.toyBig}`,
        pointerEvents: visible ? undefined : "none",
      }}
      // the bar is chrome, not content: while it is off screen it is out of the tree
      aria-hidden={visible ? undefined : true}
      inert={!visible}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 [min-inline-size:0]"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-cream-100) 96%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBlockStartWidth: "1px",
          borderBlockStartColor: "color-mix(in oklab, var(--color-ink-900) 10%, transparent)",
          boxShadow: "0 -8px 30px -18px rgba(26,20,32,.3)",
          paddingBlockEnd: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <Bar
          variant={variant}
          priceAgorot={priceAgorot}
          waConfig={waConfig}
          waSource={waSource}
        />
      </div>
    </div>
  );
}

function Bar({ variant, priceAgorot, waConfig, waSource }: Omit<StickyWhatsAppProps, "sentinelId">) {
  if (variant === "product") {
    return (
      <>
        <span className="flex-1 [min-inline-size:0]">
          <WhatsAppLink
            config={waConfig ?? { kind: "generic" }}
            source={waSource ?? "sticky_product"}
            variant="accent"
            size="lg"
            fullWidth
            iconStart={<WhatsAppGlyph />}
          >
            {STICKY_BAR.product.primary}
          </WhatsAppLink>
        </span>
        {typeof priceAgorot === "number" ? (
          <span className="shrink-0 ps-1 [min-inline-size:0]">
            <Price agorot={priceAgorot} size="sm" tone="ink" live={false} />
          </span>
        ) : null}
      </>
    );
  }

  if (variant === "contact") {
    return (
      <>
        <span className="flex-1 [min-inline-size:0]">
          <WhatsAppLink
            config={{ kind: "generic" }}
            source="sticky_contact"
            variant="accent"
            size="lg"
            fullWidth
            iconStart={<WhatsAppGlyph />}
          >
            {STICKY_BAR.contact.primary}
          </WhatsAppLink>
        </span>
        <LinkButton href="#contact-form" variant="ghost" size="lg" className="shrink-0">
          {STICKY_BAR.contact.secondary}
        </LinkButton>
      </>
    );
  }

  if (variant === "catalog") {
    return (
      <>
        <span className="flex-1 [min-inline-size:0]">
          <LinkButton href="/generator" variant="accent" size="lg" fullWidth>
            {STICKY_BAR.catalog.primary}
          </LinkButton>
        </span>
        <WhatsAppLink
          config={{ kind: "generic" }}
          source="sticky_catalog"
          variant="ghost"
          size="lg"
          className="shrink-0"
        >
          {STICKY_BAR.catalog.secondary}
        </WhatsAppLink>
      </>
    );
  }

  return (
    <>
      <span className="flex-1 [min-inline-size:0]">
        <LinkButton href="/generator" variant="accent" size="lg" fullWidth>
          {STICKY_BAR.generator.primary}
        </LinkButton>
      </span>
      <LinkButton href="/products" variant="ghost" size="lg" className="shrink-0">
        {STICKY_BAR.generator.secondary}
      </LinkButton>
    </>
  );
}

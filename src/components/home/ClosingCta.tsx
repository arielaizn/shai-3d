import * as React from "react";
import Link from "next/link";

import { HOME } from "@/content/home";

import { Band } from "./Band";
import { Reveal } from "./Reveal";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";

/**
 * The last exit, doc 03 §3.7. Everything above it was evidence; this is where the
 * visitor spends it.
 *
 * Red is the **ground** here, so the CTA inverts: a cream fill with an ink label,
 * which is 17.2:1 and the strongest pair on the site. A red pill on a red band would
 * be invisible, and cream text on red measures 3.87:1, which is large text only, so
 * the sub-line sits at 1.0625rem in full cream rather than in a tinted cream.
 *
 * The buttons are written out here instead of coming from `buttonPresentation`,
 * because no variant in the system fills with cream: the inversion exists only on
 * this one band and putting it in the shared primitive would invite it elsewhere.
 */

const INVERTED: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  minBlockSize: "var(--spacing-tap-lg)",
  paddingInline: "2rem",
  borderRadius: "var(--radius-full)",
  fontFamily: "var(--font-rubik), system-ui, sans-serif",
  fontSize: "1.1875rem",
  fontWeight: 800,
  lineHeight: 1.15,
  textDecoration: "none",
  minInlineSize: 0,
};

export function ClosingCta() {
  const { closing } = HOME;

  return (
    <Band ground="red">
      <Reveal as="div" cover="red">
        <div className="flex flex-col items-center gap-6 text-center [min-inline-size:0]">
          <h2
            className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
            style={{
              fontSize: "clamp(2rem, 1.5rem + 2.5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.02,
              color: "var(--color-cream-50)",
              maxInlineSize: "18ch",
            }}
          >
            {closing.heading}
          </h2>

          <p
            className="text-balance [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.7,
              // doc 01 §4.3: cream on red-500 is 3.87 and clears large text only, so
              // every run under 24px on this band takes ink, which measures 4.66
              color: "var(--color-text-on-red)",
              maxInlineSize: "44ch",
            }}
          >
            {closing.sub}
          </p>

          <div className="flex w-full flex-col items-center gap-3 pt-2 sm:w-auto sm:flex-row [min-inline-size:0]">
            <WhatsAppLink
              config={{ kind: "closing_home" }}
              source="closing_home"
              className="max-sm:w-full"
              style={{
                ...INVERTED,
                backgroundColor: "var(--color-cream-50)",
                color: "var(--color-ink-900)",
                boxShadow: "0 4px 0 0 var(--color-red-800)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <WhatsAppGlyph />
                {closing.primaryCta}
              </span>
            </WhatsAppLink>

            <Link
              href={closing.secondaryHref}
              className="max-sm:w-full"
              style={{
                ...INVERTED,
                backgroundColor: "transparent",
                color: "var(--color-cream-50)",
                borderWidth: "2px",
                borderColor: "var(--color-cream-50)",
              }}
            >
              {closing.secondaryCta}
            </Link>
          </div>

          <p
            className="[min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "0.875rem",
              color: "var(--color-text-on-red)",
            }}
          >
            {closing.note}
          </p>
        </div>
      </Reveal>
    </Band>
  );
}

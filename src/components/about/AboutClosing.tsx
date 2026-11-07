import * as React from "react";
import Link from "next/link";

import { Band } from "@/components/home/Band";
import { Reveal } from "@/components/home/Reveal";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { ABOUT_CLOSING } from "@/content/about";

/**
 * The one exit, 09b §13.
 *
 * A call to action and not a story row, which is why it is static in
 * `src/content/about.ts` rather than an `aboutSections` row: `kind` has no `closing`
 * member and must not grow one, or the last thing on the page becomes reorderable and
 * deletable from the story editor.
 *
 * Ink ground, full bleed. **This is the first and the only red on the page** (09b §7),
 * arriving one thumb reach under the last sentence of the story, so the feeling has
 * somewhere to go before it cools.
 *
 * [conflict: 09 §10 draws this band on cream with the heading `רוצים שאדפיס לכם משהו?`.
 * 09b §13 is the later document, it owns every Hebrew word on `/about`, and its copy is
 * what `src/content/about.ts` already ships, so the ink ground and
 * `אם יש לכם רעיון, אני כאן` win. Ariel decides if the cream version was intended.]
 *
 * `on-stage` swaps the focus ring for its dark-ground version, per `globals.css`.
 *
 * No form. RESOLUTIONS §3: name and phone are optional everywhere on this site, and a
 * story page is the last place to ask a stranger for a phone number.
 */

const CTA: React.CSSProperties = {
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

export function AboutClosing() {
  return (
    <Band ground="inverse" className="on-stage">
      <Reveal as="div" cover="inverse">
        <div className="mx-auto flex max-w-[44rem] flex-col items-center gap-6 text-center [min-inline-size:0]">
          <h2
            className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
            style={{
              fontSize: "clamp(1.75rem, 1.31rem + 1.79vw, 2.75rem)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "0em",
              color: "var(--color-text-on-inverse)",
              maxInlineSize: "18ch",
            }}
          >
            {ABOUT_CLOSING.headingHe}
          </h2>

          <p
            className="text-balance [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--color-cream-200)",
              maxInlineSize: "40ch",
            }}
          >
            {ABOUT_CLOSING.bodyHe}
          </p>

          <div className="flex w-full flex-col items-center gap-3 pt-1 sm:w-auto sm:flex-row [min-inline-size:0]">
            <WhatsAppLink
              config={{ kind: ABOUT_CLOSING.waKind }}
              source={ABOUT_CLOSING.waSource}
              className="max-sm:w-full"
              style={{
                ...CTA,
                backgroundColor: "var(--color-accent)",
                color: "var(--color-text-on-accent)",
                boxShadow: "var(--shadow-pop-red)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <WhatsAppGlyph />
                {ABOUT_CLOSING.primaryCtaHe}
              </span>
            </WhatsAppLink>

            <Link
              href={ABOUT_CLOSING.secondaryHref}
              className="max-sm:w-full"
              style={{
                ...CTA,
                backgroundColor: "transparent",
                color: "var(--color-cream-50)",
                borderWidth: "2px",
                borderColor: "var(--color-cream-50)",
              }}
            >
              {ABOUT_CLOSING.secondaryCtaHe}
            </Link>
          </div>

          <div className="flex flex-col items-center gap-1 [min-inline-size:0]">
            <p
              className="[min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "0.8125rem",
                lineHeight: 1.55,
                letterSpacing: "0.005em",
                fontWeight: 500,
                color: "var(--color-text-stage-muted)",
              }}
            >
              {ABOUT_CLOSING.fallbackResponseTimeHe}
            </p>
            <p
              className="[min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "0.8125rem",
                lineHeight: 1.55,
                letterSpacing: "0.005em",
                fontWeight: 500,
                color: "var(--color-turq-400)",
              }}
            >
              {ABOUT_CLOSING.noPaymentNoteHe}
            </p>
          </div>
        </div>
      </Reveal>
    </Band>
  );
}

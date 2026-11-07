import * as React from "react";
import Link from "next/link";

import { FOOTER, SITE } from "@/content/site";

import { WhatsAppGlyph, WhatsAppLink } from "./WhatsAppLink";

/**
 * The footer, doc 03 §2.6. Ink ground, cream text.
 *
 * The wordmark column repeats the spine phrase with its red full stop, and the
 * turquoise honesty line is not fine print: `אין תשלום באתר. סוגרים הכול בוואטסאפ.`
 * is the business model stated plainly, and it pre-answers the only real objection a
 * visitor has on a site with no cart.
 *
 * The bottom padding on mobile is `calc(96px + env(safe-area-inset-bottom))` so the
 * sticky bar never covers the legal line during its hide transition.
 *
 * `id="site-footer"` is the sentinel `StickyWhatsApp` observes: the bar hides once
 * the footer is 60% visible, because the footer carries its own CTA and two competing
 * CTAs on one screen is the failure mode the red budget exists to prevent.
 */

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 [min-inline-size:0]">
      <h2
        className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "var(--color-turq-300)",
        }}
      >
        {title}
      </h2>
      <div
        className="flex flex-col gap-2 [min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "0.9375rem",
          lineHeight: 1.7,
          color: "var(--color-cream-200)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer
      id="site-footer"
      className="[min-inline-size:0]"
      style={{ backgroundColor: "var(--color-ink-900)" }}
    >
      <div
        className="mx-auto w-full max-w-[77.5rem] px-5 pt-16 sm:px-8 lg:px-10 [min-inline-size:0]"
        style={{ paddingBlockEnd: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
          <div className="flex flex-col gap-4 [min-inline-size:0]">
            <p
              className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--color-text-on-inverse)",
                maxInlineSize: "16ch",
              }}
            >
              {FOOTER.spine.slice(0, -1)}
              <span style={{ color: "var(--color-red-400)" }}>.</span>
            </p>

            <div
              className="flex flex-col gap-1 [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "var(--color-cream-300)",
                maxInlineSize: "36ch",
              }}
            >
              {SITE.footerStoryHe.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <div className="pt-1">
              <WhatsAppLink
                config={{ kind: "generic" }}
                source="footer"
                variant="accent"
                size="md"
                iconStart={<WhatsAppGlyph />}
              >
                {FOOTER.ctaLabel}
              </WhatsAppLink>
            </div>
          </div>

          <Column title={FOOTER.columns.nav.title}>
            {FOOTER.columns.nav.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="no-underline hover:underline [min-inline-size:0]"
                style={{ color: "var(--color-cream-200)" }}
              >
                {item.label}
              </Link>
            ))}
          </Column>

          <Column title={FOOTER.columns.hours.title}>
            {FOOTER.columns.hours.lines.map((line) => (
              <p key={line} className="[min-inline-size:0]">
                {line}
              </p>
            ))}
          </Column>

          <Column title={FOOTER.columns.shipping.title}>
            {FOOTER.columns.shipping.lines.map((line) => (
              <p key={line} className="[min-inline-size:0]">
                {line}
              </p>
            ))}
          </Column>
        </div>

        <hr
          className="my-10 border-0"
          style={{
            blockSize: "1px",
            backgroundColor: "color-mix(in oklab, var(--color-cream-50) 16%, transparent)",
          }}
        />

        <div
          className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between [min-inline-size:0]"
          style={{
            fontFamily: "var(--font-assistant), system-ui, sans-serif",
            fontSize: "0.875rem",
            color: "var(--color-cream-300)",
          }}
        >
          <p className="[min-inline-size:0]">{FOOTER.credit}</p>
          {/* doc 03 §2.6: the honesty line, not fine print. turq-300 on ink measures
              well past AA; the marker device is never used on a whole sentence. */}
          <p className="[min-inline-size:0]" style={{ color: "var(--color-turq-300)", fontWeight: 600 }}>
            {FOOTER.noPaymentNote}
          </p>
        </div>
      </div>
    </footer>
  );
}

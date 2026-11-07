import * as React from "react";

import { ChevronGlyph } from "@/components/layout/Glyphs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTACT, FAQ } from "@/content/contact";

/**
 * The five questions that keep arriving, 09c §9.7.
 *
 * Native `<details>` and `<summary>`. There is no state, no `aria-expanded` to keep
 * honest and no keyboard handler to write, and it works before the JavaScript
 * arrives, which on a mid-range Android inside the Instagram webview is a real
 * window and not a hypothetical one. The chevron is the only thing JavaScript would
 * have added, and CSS turns it from the `[open]` attribute instead.
 *
 * The second answer is the one that matters. A site with no cart owes the visitor a
 * plain sentence about how money changes hands, and `אפשר לשלם באתר?` answers it in
 * the visitor's own words instead of hiding it in a footer line.
 *
 * [אריאל: לאשר עם ההורים שמזומן והעברה הם באמת האופציות, ומי מקבל את הכסף בפועל]
 */

export function ContactFaq() {
  return (
    <div className="flex flex-col gap-8 [min-inline-size:0]">
      <SectionHeading level={2} rule>
        {CONTACT.faq.heading}
      </SectionHeading>

      <ul className="flex flex-col [min-inline-size:0]">
        {FAQ.map((item, index) => (
          <li
            key={item.q}
            className="[min-inline-size:0]"
            style={{
              borderBlockStartWidth: index === 0 ? "0" : "1px",
              borderBlockStartColor: "var(--color-cream-400)",
            }}
          >
            <details className="group [min-inline-size:0]">
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [min-inline-size:0] [&::-webkit-details-marker]:hidden"
                style={{ minBlockSize: "var(--spacing-tap)" }}
              >
                <span
                  className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {item.q}
                </span>

                <span
                  aria-hidden="true"
                  className="inline-flex shrink-0 rotate-[-90deg] transition-transform duration-200 ease-out-soft group-open:rotate-90"
                  style={{ color: "var(--color-turq-700)" }}
                >
                  <ChevronGlyph size={20} />
                </span>
              </summary>

              <p
                className="pb-5 [min-inline-size:0]"
                style={{
                  fontFamily: "var(--font-assistant), system-ui, sans-serif",
                  fontSize: "1.0625rem",
                  lineHeight: 1.75,
                  color: "var(--color-text-secondary)",
                  maxInlineSize: "62ch",
                }}
              >
                {item.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

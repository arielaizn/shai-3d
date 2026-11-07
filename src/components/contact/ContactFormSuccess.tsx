"use client";

import * as React from "react";

import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { CONTACT } from "@/content/contact";

/**
 * What the form becomes once the message is written, doc 03 §6.3 and 09c §9.5.
 *
 * It replaces the form in place rather than appearing above or below it, because a
 * success message with the filled form still sitting under it reads as "did that
 * send?" and invites a second submission.
 *
 * The heading takes focus. Everything that changed on this screen is below the
 * viewport's reading position and outside the form the visitor just left, so a
 * screen reader user who is not moved lands nowhere: the control they pressed no
 * longer exists. `tabIndex={-1}` makes the heading focusable without adding it to
 * the tab order, and focusing it scrolls it into view for everyone else too.
 *
 * The WhatsApp button carries the visitor's own name and message, built by the one
 * builder in `src/lib/whatsapp.ts` with `kind: "contact_form"`, so a person who
 * decides to open WhatsApp after all does not type anything twice.
 */

export type ContactFormSuccessProps = {
  nameHe: string;
  messageHe: string;
  /** The id the form heading carried, so the panel keeps the section's label. */
  headingId?: string;
};

export function ContactFormSuccess({ nameHe, messageHe, headingId }: ContactFormSuccessProps) {
  const headingRef = React.useRef<HTMLHeadingElement | null>(null);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className="flex flex-col items-start gap-4 [min-inline-size:0]"
      style={{
        backgroundColor: "var(--color-turq-500)",
        borderRadius: "var(--radius-lg)",
        padding: "1.75rem",
        scrollMarginBlockStart: "6rem",
      }}
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: "clamp(1.625rem, 1.24rem + 1.57vw, 2.25rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          color: "var(--color-text-on-turquoise)",
        }}
      >
        {CONTACT.success.heading}
      </h2>

      <p
        className="[min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "1.0625rem",
          lineHeight: 1.7,
          color: "var(--color-text-on-turquoise)",
          maxInlineSize: "36ch",
        }}
      >
        {CONTACT.success.body}
      </p>

      <WhatsAppLink
        config={{ kind: "contact_form", nameHe, messageHe }}
        source={CONTACT.success.waSource}
        variant="accent"
        size="lg"
        iconStart={<WhatsAppGlyph />}
        className="max-sm:w-full"
      >
        {CONTACT.success.cta}
      </WhatsAppLink>
    </div>
  );
}

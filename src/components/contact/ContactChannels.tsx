"use client";

import * as React from "react";

import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { Phone } from "@/components/ui/Bidi";
import { ChevronGlyph } from "@/components/layout/Glyphs";
import { CONTACT } from "@/content/contact";
import { waNumberDisplay, waNumberE164 } from "@/lib/whatsapp";

import { Card, CardHeading } from "./Card";

/**
 * The three ways in, doc 03 §6.1. WhatsApp is not one of three equal options: it is
 * the card that spans two columns, carries the red edge and holds the only filled
 * button in the row.
 *
 * **The number is assembled in the browser.** DECISIONS.md keeps Shai's personal
 * line out of the served HTML, so `waNumberDisplay()` runs in an effect and the
 * server response carries a card with a heading, a button and no address. The line
 * keeps its height while it is empty, so nothing shifts when the number lands.
 *
 * **A missing channel removes its card.** 09c §9.2: `אם אין כתובת מייל ואין
 * אינסטגרם, הכרטיס יורד. כרטיס ריק גרוע מכרטיס חסר`. The values come from
 * `siteSettings`, which is edited by hand in the admin, so both are checked for a
 * shape that can safely become an `href` before anything is rendered.
 */

export type ContactChannelsProps = {
  instagramUrl?: string | null;
  contactEmail?: string | null;
};

function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null;
}

/** A card whose whole surface is one link, with the ring drawn on the label. */
function ChannelCard({ href, title, sub, newTab, className }: {
  href: string;
  title: string;
  sub: string;
  newTab?: boolean;
  className?: string;
}) {
  return (
    <Card className={["relative gap-1", className].filter(Boolean).join(" ")}>
      <CardHeading>
        <a
          href={href}
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer" : undefined}
          className="no-underline after:absolute after:inset-0 after:content-['']"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </a>
      </CardHeading>

      <p
        className="flex items-center gap-1.5 [min-inline-size:0]"
        style={{
          fontFamily: "var(--font-assistant), system-ui, sans-serif",
          fontSize: "1rem",
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
        }}
      >
        <span className="[min-inline-size:0]">{sub}</span>
        <ChevronGlyph size={16} />
      </p>
    </Card>
  );
}

export function ContactChannels({ instagramUrl, contactEmail }: ContactChannelsProps) {
  const [number, setNumber] = React.useState<{ display: string; e164: string } | null>(null);

  React.useEffect(() => {
    setNumber({ display: waNumberDisplay(), e164: waNumberE164() });
  }, []);

  const instagram = safeHttpUrl(instagramUrl);
  const email = safeEmail(contactEmail);

  /**
   * The row has to stay square when a channel is missing. With one secondary card
   * it takes the full mobile width instead of leaving a hole beside it, and with
   * none the WhatsApp card takes the whole desktop row.
   */
  const secondaryCount = (instagram ? 1 : 0) + (email ? 1 : 0);
  const primarySpan = secondaryCount === 0 ? "col-span-2 lg:col-span-3" : "col-span-2";
  const secondarySpan = secondaryCount === 1 ? "col-span-2 lg:col-span-1" : undefined;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] [min-inline-size:0]">
      <Card tone="accent" className={`${primarySpan} gap-3`}>
        <CardHeading>{CONTACT.channels.whatsapp.title}</CardHeading>

        <span
          className="[min-inline-size:0]"
          style={{
            display: "block",
            minBlockSize: "1.75rem",
            fontFamily: "var(--font-rubik), system-ui, sans-serif",
            fontSize: "1.25rem",
            fontWeight: 700,
            lineHeight: 1.4,
            color: "var(--color-text-primary)",
          }}
        >
          {number ? <Phone asText e164={number.e164} display={number.display} /> : null}
        </span>

        <div className="pt-1 [min-inline-size:0]">
          <WhatsAppLink
            config={{ kind: "generic" }}
            source={CONTACT.channels.whatsapp.waSource}
            variant="accent"
            size="lg"
            iconStart={<WhatsAppGlyph />}
            className="max-sm:w-full"
          >
            {CONTACT.channels.whatsapp.cta}
          </WhatsAppLink>
        </div>
      </Card>

      {instagram ? (
        <ChannelCard
          href={instagram}
          className={secondarySpan}
          newTab
          title={CONTACT.channels.instagram.title}
          sub={CONTACT.channels.instagram.sub}
        />
      ) : null}

      {email ? (
        <ChannelCard
          href={`mailto:${email}`}
          className={secondarySpan}
          title={CONTACT.channels.email.title}
          sub={CONTACT.channels.email.sub}
        />
      ) : null}
    </div>
  );
}

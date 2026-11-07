import * as React from "react";
import type { Metadata } from "next";

import { fetchQuery } from "convex/nextjs";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";
import { META_CONTACT } from "@/content/meta";

import { Band } from "@/components/home/Band";
import { ScrollSentinel, StickyWhatsApp } from "@/components/layout/StickyWhatsApp";

import { ContactChannels } from "@/components/contact/ContactChannels";
import { ContactFaq } from "@/components/contact/ContactFaq";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactHero } from "@/components/contact/ContactHero";
import { HoursCard } from "@/components/contact/HoursCard";
import { ShippingCard } from "@/components/contact/ShippingCard";

/**
 * CONTACT · doc 03 §6.
 *
 * WhatsApp first, form second, and the form is never in front of WhatsApp. Both are
 * offered on the same screen, which is the whole difference between this page and
 * the one the earlier specs described: RESOLUTIONS §3 took every required field out
 * of the path to Shai, and what is left here is a courtesy for the visitor who will
 * not open WhatsApp at all.
 *
 * Section order: hero, channels, then the form beside the two cards that answer the
 * questions a person asks before writing (when am I answered, and how does the thing
 * reach me), then the five recurring questions.
 *
 * **The one read.** `settings.publicSettings` supplies the Instagram address and the
 * mail address, and only those. Both are optional in the schema and an absent one
 * removes its card, per 09c §9.2. Everything else on this page is static Hebrew from
 * `src/content/contact.ts`, so the page paints in full with Convex unreachable, on a
 * cold deployment, or before the row is seeded.
 *
 * **No city, anywhere.** Not in the shipping card, not in the metadata, not in a
 * JSON-LD block. Shai is a minor and the site carries no address.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: META_CONTACT.title,
  description: META_CONTACT.description,
  alternates: { canonical: META_CONTACT.canonical },
  openGraph: {
    title: META_CONTACT.og.title,
    description: META_CONTACT.og.description,
    type: "website",
    locale: "he_IL",
  },
};

/** One read, one fallback, with the query's own return type carried through. */
async function read<Q extends FunctionReference<"query">>(
  query: Q,
  args: FunctionArgs<Q>,
  fallback: FunctionReturnType<Q>,
): Promise<FunctionReturnType<Q>> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return fallback;
  try {
    return await fetchQuery(query, args);
  } catch {
    return fallback;
  }
}

export default async function ContactPage() {
  const settings = await read(api.settings.publicSettings, {}, null);

  return (
    <>
      <main id="main-content" tabIndex={-1} className="[min-inline-size:0]">
        <Band ground="cream" tight style={{ paddingBlockStart: "3rem" }}>
          <div className="flex flex-col gap-10 [min-inline-size:0]">
            <ContactHero />
            <ContactChannels
              instagramUrl={settings?.instagramUrl}
              contactEmail={settings?.contactEmail}
            />
          </div>
        </Band>

        {/* The sticky bar arms below the channels, not below the hero: while the
            WhatsApp card is still on screen a second WhatsApp button at the bottom
            of the same screen is two CTAs competing for one tap. */}
        <ScrollSentinel />

        <Band ground="sunken">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:items-start lg:gap-8 [min-inline-size:0]">
            {/* Mobile puts the form first, because it is what the visitor came for
                and the two info cards are what they read while deciding. On desktop
                the cards take the narrow start column and the form takes the wide
                one, per the wireframe in doc 03 §6.1. */}
            <div className="order-1 flex flex-col gap-6 lg:order-2 [min-inline-size:0]">
              <ContactForm />
            </div>

            <div className="order-2 flex flex-col gap-6 lg:order-1 [min-inline-size:0]">
              <HoursCard />
              <ShippingCard />
            </div>
          </div>
        </Band>

        <Band ground="cream">
          <ContactFaq />
        </Band>
      </main>

      <StickyWhatsApp variant="contact" />
    </>
  );
}

import * as React from "react";
import type { Metadata } from "next";

import { fetchQuery } from "convex/nextjs";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

import { api } from "../../convex/_generated/api";
import { META_HOME } from "@/content/meta";

import { ClosingCta } from "@/components/home/ClosingCta";
import { GalleryBand } from "@/components/home/GalleryBand";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProductsTeaser } from "@/components/home/ProductsTeaser";
import { StoryTeaser } from "@/components/home/StoryTeaser";
import { ScrollSentinel, StickyWhatsApp } from "@/components/layout/StickyWhatsApp";

/**
 * HOME · doc 03 §3.
 *
 * Section order: hero (with the trust row inside it) -> how it works and the generator
 * invite -> products teaser -> gallery band -> story teaser -> closing CTA.
 *
 * The whole page has one job: within one screen, prove that a boy turns ideas into real
 * things and that the visitor's own photo can become a printed object. Everything under
 * the fold is evidence for that claim and ramps toward the handoff.
 *
 * **Reads, and why they are guarded.** The catalogue and the gallery come from Convex,
 * and until a deployment exists there is no `NEXT_PUBLIC_CONVEX_URL` to read from. A
 * server component that throws on a missing env var takes the whole page with it, so
 * each read is wrapped and falls back to the empty state that 09c §10 already writes.
 * The hero and every other word on the page are static in `src/content/home.ts`: the
 * `h1` is the LCP element and it must never wait behind a query.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: META_HOME.title,
  description: META_HOME.description,
  alternates: { canonical: META_HOME.canonical },
  openGraph: {
    title: META_HOME.og.title,
    description: META_HOME.og.description,
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
    // a cold deployment, a network blip or an unseeded table. The page still renders,
    // and every band that reads has an empty state written for exactly this case.
    return fallback;
  }
}

export default async function HomePage() {
  const [featured, gallery] = await Promise.all([
    read(api.products.featured, { limit: 4 }, []),
    read(api.gallery.list, { limit: 14 }, []),
  ]);

  return (
    <>
      <main id="main-content" tabIndex={-1} className="[min-inline-size:0]">
        <HomeHero />
        <ScrollSentinel />
        <HowItWorks />
        <ProductsTeaser products={featured} />
        <GalleryBand items={gallery} />
        <StoryTeaser />
        <ClosingCta />
      </main>

      <StickyWhatsApp variant="generator" />
    </>
  );
}

import type { Metadata } from "next";

import { fetchQuery } from "convex/nextjs";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";
import { META_GENERATOR } from "@/content/meta";
import { GeneratorApp } from "@/components/generator/GeneratorApp";

/**
 * GENERATOR · doc 04, as corrected by RESOLUTIONS.md.
 *
 * The flagship. Six steps, `סוג · תמונה · צבעים · גודל · דגם · מחיר`, ending at a price
 * the site computed and a WhatsApp message the server wrote. The site never takes
 * money: Shai is thirteen, he has no business licence and no payment processing, and
 * every path here ends in his chat.
 *
 * **What this server component does, and why it is so small.** It reads the catalogue
 * once so the first paint already carries seven cards with seven real prices, and
 * hands it to the client tree as `initial`. Everything after that is live: the client
 * subscribes to the same queries and takes over the moment they answer.
 *
 * `pricing.fromPrices` is not read here on purpose. `publicConfig` already carries
 * `fromAgorot` per print type from the same engine call, so reading both would be two
 * round trips for one number (RESOLUTIONS §ב.8).
 *
 * **No `<StickyWhatsApp>`.** Every other page ends in that bar; this one ends in a
 * price with its own WhatsApp button, and a second one at the bottom of the same
 * screen is two CTAs competing for one tap.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: META_GENERATOR.title,
  description: META_GENERATOR.description,
  alternates: { canonical: META_GENERATOR.canonical },
  openGraph: {
    title: META_GENERATOR.og.title,
    description: META_GENERATOR.og.description,
    type: "website",
    locale: "he_IL",
  },
};

/** One read, one fallback, with the query's own return type carried through. */
async function read<Q extends FunctionReference<"query">>(
  query: Q,
  args: FunctionArgs<Q>,
  fallback: FunctionReturnType<Q> | null,
): Promise<FunctionReturnType<Q> | null> {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return fallback;
  try {
    return await fetchQuery(query, args);
  } catch {
    /* A cold deployment, an unseeded database or a network blip renders the seven cards
       from `src/content/generator.ts` with no price chips, which is the honest
       degradation: the visitor still sees what Shai makes. */
    return fallback;
  }
}

export default async function GeneratorPage() {
  const [config, printTypeRows, filamentRows] = await Promise.all([
    read(api.pricing.publicConfig, {}, null),
    read(api.printTypes.listActive, {}, null),
    read(api.filaments.listActive, {}, null),
  ]);

  return (
    <GeneratorApp
      initial={{
        config,
        printTypeRows,
        filamentRows,
      }}
    />
  );
}

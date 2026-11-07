import * as React from "react";
import type { Metadata } from "next";

import { fetchQuery } from "convex/nextjs";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";
import { META_ABOUT } from "@/content/meta";

import { Container } from "@/components/home/Band";
import { AboutClosing } from "@/components/about/AboutClosing";
import { AboutHero } from "@/components/about/AboutHero";
import { StorySection } from "@/components/about/StorySection";
import { StorySpine } from "@/components/about/StorySpine";
import { COLUMN_CLASS, SPINE_VARS, splitStory, toStoryRows } from "@/components/about/sections";

/**
 * ABOUT · Shai the maker.
 *
 * This page has one job, and it is the job the rest of the site depends on: turn an
 * anonymous visitor into someone who wants **this particular boy** to make their thing.
 * That is the whole reason a stranger messages a 13 year old instead of ordering from a
 * marketplace.
 *
 * **What the page argues, after 07.09.26.** Craft and care, and nothing else. The
 * personal story was approved, built, rendered, and then cancelled by Ariel on sight;
 * `DECISIONS.md` §הסיפור and `RESOLUTIONS.md` rulings 19 to 21 govern, and
 * `docs/design/09b-about-page.md` is a historical document that nothing here is built
 * from. So the page is how he started, how he plans, what happens in the machine, what
 * he does when a print comes out wrong, and what someone can ask him to make. The spine
 * phrase `הופך רעיונות לדברים אמיתיים` opens it and carries it.
 *
 * **No photograph of Shai or of his family, and no slot held open for one** (ruling
 * 21). The two pictures on the route are product photography: a macro of the layers and
 * a shelf of finished prints. A row with no picture is text alone, and nothing on the
 * page announces a missing image.
 *
 * **Where the text comes from.** Convex `about.list` first, `ABOUT_FALLBACK` in
 * `src/content/about.ts` second. The duplication is deliberate and it is the only
 * duplicated copy on the site: a failed deployment, a dropped query or a row switched
 * off by accident must not be able to take this page off the air.
 *
 * **How it is laid out.** One narrative column, 44rem. A dashed turquoise rail runs
 * down the start edge from the first stop to the last, with a voxel marker per stop.
 * Four blocks leave the rail and take the full column: the pull quote, the two
 * pictures and the closing statement, and each buys itself more air than a paragraph
 * gets. That rhythm, four long breaths inside a run of short paragraphs, is what holds
 * a minute of scrolling on a phone.
 *
 * [deviation: doc 03 §2.5 lists `/about` among the pages carrying the `generator`
 * sticky bar. It is left off here: that bar is a red pill reading
 * `להפוך תמונה להדפסה`, and 09 §7 keeps this page clear of red until its last line.
 * A page whose whole argument is that he takes care would be arguing it underneath a
 * permanent sales pill. Ariel decides; restoring it is two lines.]
 */

export const revalidate = 300;

export const metadata: Metadata = {
  // absolute, because META_ABOUT.title already carries the brand and the root layout
  // would otherwise append it a second time
  title: { absolute: META_ABOUT.title },
  description: META_ABOUT.description,
  alternates: { canonical: META_ABOUT.canonical },
  openGraph: {
    title: META_ABOUT.og.title,
    description: META_ABOUT.og.description,
    type: "profile",
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
    // a cold deployment, a network blip or an unseeded table. `toStoryRows` falls back
    // to the shipped copy, so the story renders either way.
    return fallback;
  }
}

export default async function AboutPage() {
  const rows = await read(api.about.list, {}, []);
  const story = toStoryRows(rows);
  const { lead, railed, coda } = splitStory(story);

  return (
    <main id="main-content" tabIndex={-1} className="[min-inline-size:0]">
      <AboutHero />

      <section className="pt-8 pb-20 md:pt-12 md:pb-28 [overflow-x:clip] [min-inline-size:0]">
        <Container>
          <div className={`flex flex-col gap-12 md:gap-16 ${COLUMN_CLASS} ${SPINE_VARS}`}>
            {lead.map((row) => (
              <StorySection key={row.key} row={row} lead />
            ))}

            {railed.length > 0 ? (
              <StorySpine>
                {railed.map((row) => (
                  <StorySection key={row.key} row={row} />
                ))}
              </StorySpine>
            ) : null}

            {coda.map((row) => (
              <StorySection key={row.key} row={row} />
            ))}
          </div>
        </Container>
      </section>

      <AboutClosing />
    </main>
  );
}

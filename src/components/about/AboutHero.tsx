import * as React from "react";

import { Container } from "@/components/home/Band";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ABOUT_HERO } from "@/content/about";

import { COLUMN_CLASS } from "./sections";
import { HeroMark } from "./HeroMark";

/**
 * The top of the page.
 *
 * Type only. No portrait, no collage, no product. RESOLUTIONS.md ruling 21 keeps every
 * photograph of Shai and of his family off this site, and holds no slot open for one,
 * so the first thing on the page is the sentence rather than a face.
 *
 * The age is not the headline. It arrives in the first six words of the sub, stated
 * plainly, with no apology and no softening clause around it, and the heading is left
 * to say what he does. That split ships verbatim from `ABOUT_HERO`.
 *
 * The marked word is `מדפיס`, in turquoise. 09b §7 forbids red anywhere on this page
 * until the closing band, and the locked spelling `תלת ממד` is two words, so marking
 * it would either split the pair or swallow the full stop.
 */

/** The heading is one locked sentence, so the marked word is found in it rather than stored twice. */
const MARKED_WORD = "מדפיס";

export function AboutHero() {
  const [before, after] = ABOUT_HERO.headingHe.split(MARKED_WORD);

  return (
    <section className="pt-10 pb-4 md:pt-16 md:pb-8 [overflow-x:clip] [min-inline-size:0]">
      <Container>
        <div className={`flex flex-col gap-5 ${COLUMN_CLASS}`}>
          <Eyebrow voxelTone="turquoise">{ABOUT_HERO.eyebrowHe}</Eyebrow>

          <h1
            className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
            style={{
              // 02 §2 `display`. Hebrew sits tighter than Latin, so 0.96 is not a typo.
              fontSize: "clamp(2.25rem, 1.37rem + 3.6vw, 4.25rem)",
              fontWeight: 800,
              lineHeight: "0.96",
              letterSpacing: "0em",
              color: "var(--color-text-primary)",
              maxInlineSize: "16ch",
            }}
          >
            {before}
            <HeroMark tone="turquoise">{MARKED_WORD}</HeroMark>
            {after}
          </h1>

          <p
            className="[min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)",
              lineHeight: 1.7,
              color: "var(--color-text-secondary)",
              maxInlineSize: "38ch",
            }}
          >
            {ABOUT_HERO.subHe}
          </p>

          <span
            aria-hidden="true"
            style={{
              display: "block",
              inlineSize: "4rem",
              blockSize: "3px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-turq-500)",
            }}
          />
        </div>
      </Container>
    </section>
  );
}

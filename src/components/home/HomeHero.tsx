import * as React from "react";

import { LinkButton } from "@/components/ui/LinkButton";
import { Mark } from "@/components/ui/Mark";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TrustRow } from "@/components/ui/TrustRow";
import { HOME } from "@/content/home";

import { Container } from "./Band";
import { HeroProductCollage } from "./HeroProductCollage";

/**
 * The hero, doc 03 §3.1.
 *
 * One job: inside one screen, prove that a boy turns ideas into real things and that
 * the visitor's own photo can become a printed object. It then splits the traffic,
 * the generator for a visitor who wants their own thing and the catalog for a visitor
 * who wants to browse, and both routes end at WhatsApp.
 *
 * The copy is static in `src/content/home.ts` on purpose: the `h1` is the LCP text and
 * it ships inside the HTML with zero client work and no query in front of it.
 *
 * `אמיתיים` is the one marker on this page and one of three on the whole site. The
 * full stop after it is a red span at 1.15em and is deliberately outside the marker,
 * because red inside a turquoise swipe is two accents fighting over one word.
 *
 * Mobile order is eyebrow, headline, image, subhead, CTAs, trust row. The text group
 * is `display: contents` under `lg`, so its children take part in the same flex
 * ordering as the collage and the image can sit between the headline and the subhead
 * without being written into the DOM twice.
 */

const { hero, trust } = HOME;

/** §7.3 and §7.4: the button's name, its visible chip, and the line on the back. */
export const FLIP = {
  label: "להפוך את הקלף",
  chip: "להפוך",
  backCaption: "ככה זה הגיע אליי.",
} as const;

export function HomeHero() {
  const [beforeMark] = hero.headline.line2.split(hero.headline.markedWord);

  return (
    <section className="relative pt-8 pb-14 md:pt-14 md:pb-20 lg:pt-20 lg:pb-24 [overflow-x:clip] [min-inline-size:0]">
      <Container>
        <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)] lg:items-center lg:gap-14">
          <div className="contents lg:flex lg:flex-col lg:gap-7 [min-inline-size:0]">
            <div className="order-1 lg:order-none [min-inline-size:0]">
              <SectionHeading level={1} eyebrow={hero.eyebrow} voxel="none">
                <>
                  {hero.headline.line1}
                  <br />
                  {beforeMark}
                  <Mark tone="turquoise" animate delay={180}>
                    {hero.headline.markedWord}
                  </Mark>
                  <span
                    style={{
                      color: "var(--color-red-500)",
                      fontSize: "1.15em",
                      lineHeight: 0,
                    }}
                  >
                    .
                  </span>
                </>
              </SectionHeading>
            </div>

            <p
              className="order-3 lg:order-none [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "1.0625rem",
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
                maxInlineSize: "42ch",
              }}
            >
              {hero.subhead}
            </p>

            <div className="order-4 flex flex-col gap-3 sm:flex-row sm:items-center lg:order-none [min-inline-size:0]">
              <LinkButton href={hero.primaryCta.href} variant="accent" size="lg" className="max-sm:w-full">
                {hero.primaryCta.label}
              </LinkButton>
              <LinkButton href={hero.secondaryCta.href} variant="play" size="lg" className="max-sm:w-full">
                {hero.secondaryCta.label}
              </LinkButton>
            </div>

            <div className="order-5 lg:order-none [min-inline-size:0]">
              <TrustRow items={trust.items.map((valueHe) => ({ valueHe }))} />
            </div>
          </div>

          {/* mobile: the collage bleeds 20px past the container on both edges */}
          <div className="order-2 -mx-5 sm:mx-0 lg:order-none [min-inline-size:0]">
            <HeroProductCollage
              flipLabel={FLIP.label}
              flipChip={FLIP.chip}
              backCaption={FLIP.backCaption}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

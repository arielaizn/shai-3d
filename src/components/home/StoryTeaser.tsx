import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Mark } from "@/components/ui/Mark";
import { HOME } from "@/content/home";

import { Band } from "./Band";
import { ChevronGlyph } from "@/components/layout/Glyphs";
import { Reveal } from "./Reveal";

/**
 * The story teaser, doc 03 §3.6, rewritten 07.09.26.
 *
 * Its job is to convert a browser into someone who wants *this specific boy* to make
 * their thing, which is what makes the WhatsApp message get sent instead of bookmarked.
 * After `RESOLUTIONS.md` ruling 19 that case is craft rather than biography: he does
 * the whole job himself, and he does it again when it comes out wrong. The heading and
 * both lines come from `HOME.story` and say exactly that.
 *
 * This is the only place on the site where a link, and not a pill, carries the primary
 * action, because the destination is a story and not a purchase. A red pill pointing
 * at `/about` would make the page feel like a sales asset, which is the exact failure
 * the brief warns against.
 *
 * The marked word is `בעצמי` in **yellow**: the panel is ink and turquoise falls apart
 * on it. The full stop stays cream, with no red, because red on ink fails contrast.
 *
 * **The photograph is product photography and it is permanent.** Ruling 21 keeps every
 * picture of Shai and of his family off this site and holds no slot open for one, so
 * this frame is not standing in for a portrait: it is a row of finished prints, which
 * is the subject the teaser is actually about. It ships at the shot's native 3:2. A 4:5
 * crop of a lineup this wide keeps two objects and throws the rest away.
 */

export function StoryTeaser() {
  const { story } = HOME;
  const [beforeMark, afterMark] = story.heading.split(story.markedWord);

  return (
    <Band ground="cream">
      <Reveal as="div" cover="cream">
        <div
          className="flex flex-col gap-8 p-6 sm:p-10 lg:grid lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:items-center lg:gap-14 lg:p-18 [min-inline-size:0]"
          style={{
            backgroundColor: "var(--color-ink-900)",
            borderRadius: "var(--radius-xl)",
          }}
        >
          {/* doc 03 §3.6: the photograph takes the end (left) column at 42% and the
              text the start (right) column at 58%. On mobile the photograph comes
              first, which is why the DOM order is photograph then text and `order`
              does the swap. */}
          <div
            className="w-full lg:order-2 [min-inline-size:0]"
            style={{
              transform: "rotate(-2deg)",
              backgroundColor: "#FFFFFF",
              padding: "12px",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-photo)",
            }}
          >
            <span
              className="relative block aspect-[3/2] w-full overflow-hidden [min-inline-size:0]"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <Image
                src="/assets/about/shelf.webp"
                alt="שורה של הדפסות מוגמרות עומדות זו לצד זו"
                fill
                sizes="(max-width: 1023px) 88vw, 420px"
                style={{ objectFit: "cover" }}
              />
            </span>
          </div>

          <div className="flex flex-col items-start gap-5 lg:order-1 [min-inline-size:0]">
            <Eyebrow tone="onInverse" voxelTone="turquoise">
              {story.eyebrow}
            </Eyebrow>

            <h2
              className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
              style={{
                fontSize: "clamp(1.625rem, 1.24rem + 1.57vw, 2.5rem)",
                fontWeight: 800,
                lineHeight: 1.08,
                color: "var(--color-text-on-inverse)",
                maxInlineSize: "20ch",
              }}
            >
              {beforeMark}
              <Mark tone="yellow">{story.markedWord}</Mark>
              {afterMark}
            </h2>

            <div
              className="flex flex-col gap-2 [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-assistant), system-ui, sans-serif",
                fontSize: "1.0625rem",
                lineHeight: 1.7,
                color: "var(--color-cream-200)",
                maxInlineSize: "44ch",
              }}
            >
              {story.lines.map((line) => (
                <p key={line} className="[min-inline-size:0]">
                  {line}
                </p>
              ))}
            </div>

            <Link
              href={story.link.href}
              className="group inline-flex items-center gap-2 no-underline [min-inline-size:0]"
              style={{
                fontFamily: "var(--font-rubik), system-ui, sans-serif",
                fontSize: "1.0625rem",
                fontWeight: 700,
                color: "var(--color-text-on-inverse)",
              }}
            >
              <span
                className="relative [min-inline-size:0]"
                style={{
                  backgroundImage: "linear-gradient(var(--color-turq-400), var(--color-turq-400))",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "100% 2px",
                  backgroundPosition: "right 100%",
                  paddingBlockEnd: "3px",
                }}
              >
                {story.link.label}
              </span>
              <ChevronGlyph />
            </Link>
          </div>
        </div>
      </Reveal>
    </Band>
  );
}

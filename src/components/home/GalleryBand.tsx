"use client";

import * as React from "react";
import Image from "next/image";

import { EmptyState } from "@/components/ui/EmptyState";
import { LOOP, prefersReducedMotion } from "@/lib/design/motion";
import { HOME } from "@/content/home";

import { PauseGlyph, PlayGlyph } from "@/components/layout/Glyphs";
import { Container } from "./Band";

/**
 * The proof band, doc 03 §3.5. Edge to edge, cream ground, photography only, and
 * deliberately **no accent colour and no CTA**: this is where the visitor stops
 * scrolling and starts wanting one, and the desire has to build for one more section
 * before it is spent.
 *
 * The marquee travels start to end, right to left in RTL, so new photographs arrive
 * from the direction the eye is already moving (doc 07 §14.1). The track is rendered
 * twice and translated by exactly -50%, which is what makes the loop seamless.
 *
 * WCAG 2.2.2: content that moves for more than five seconds needs a pause control, so
 * the band carries a real toggle button and not only a hover pause. Under
 * `prefers-reduced-motion` the marquee never starts and the band becomes a plain
 * horizontal scroller, per doc 07 §13.
 */

export type GalleryItem = {
  _id: string;
  imageUrl?: string | null;
  imageAltHe: string;
  width?: number;
  height?: number;
};

export type GalleryBandProps = {
  items: readonly GalleryItem[];
};

export function GalleryBand({ items }: GalleryBandProps) {
  const [paused, setPaused] = React.useState(false);
  const [still, setStill] = React.useState(true);

  React.useEffect(() => {
    setStill(prefersReducedMotion());
  }, []);

  const usable = items.filter((item) => Boolean(item.imageUrl));

  return (
    <section className="py-14 [overflow-x:clip] md:py-20 [min-inline-size:0]" aria-labelledby="gallery-heading">
      <style href="gallery-marquee" precedence="default">{`
        @keyframes gallery-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .gallery-track {
          animation: gallery-marquee ${LOOP.gallerySm}ms linear infinite;
        }
        .gallery-viewport:hover .gallery-track,
        .gallery-viewport:focus-within .gallery-track { animation-play-state: paused; }
        @media (min-width: 768px) {
          .gallery-track { animation-duration: ${LOOP.gallery}ms; }
          .gallery-viewport {
            -webkit-mask-image: linear-gradient(to right, transparent 0, black 80px, black calc(100% - 80px), transparent 100%);
            mask-image: linear-gradient(to right, transparent 0, black 80px, black calc(100% - 80px), transparent 100%);
          }
        }
      `}</style>

      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 [min-inline-size:0]">
          <h2
            id="gallery-heading"
            className="text-balance [min-inline-size:0]"
            style={{
              fontFamily: "var(--font-assistant), system-ui, sans-serif",
              fontSize: "1.125rem",
              fontWeight: 600,
              lineHeight: 1.5,
              color: "var(--color-text-secondary)",
              maxInlineSize: "40ch",
            }}
          >
            {HOME.gallery.heading}
          </h2>

          {usable.length > 0 && !still ? (
            <button
              type="button"
              aria-pressed={paused}
              aria-label={HOME.gallery.pauseAria}
              onClick={() => setPaused((value) => !value)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{
                color: "var(--color-ink-900)",
                borderWidth: "3px",
                borderColor: "var(--color-ink-200)",
              }}
            >
              {paused ? <PlayGlyph /> : <PauseGlyph />}
            </button>
          ) : null}
        </div>
      </Container>

      {usable.length === 0 ? (
        <Container>
          <EmptyState title={HOME.gallery.empty} tone="onRaised" />
        </Container>
      ) : (
        /* The marquee is a strip of photographs with no text in it, so the track runs
           LTR and travels with translateX(-50%): visually right to left, which is start
           to end in Hebrew (doc 07 §14.1). */
        <div
          className="gallery-viewport relative w-full [overflow-x:clip] [min-inline-size:0]"
          dir="ltr"
        >
          <div
            className={
              still
                ? "flex gap-3 overflow-x-auto pb-2 md:gap-5 [min-inline-size:0]"
                : "gallery-track flex w-max gap-3 md:gap-5 [min-inline-size:0]"
            }
            style={
              still
                ? undefined
                : ({
                    "--marquee-duration": `${LOOP.gallerySm}ms`,
                    animationPlayState: paused ? "paused" : "running",
                    willChange: "transform",
                  } as React.CSSProperties)
            }
          >
            {(still ? usable : [...usable, ...usable]).map((item, index) => (
              <figure
                key={`${item._id}-${index}`}
                className="shrink-0 [min-inline-size:0]"
                style={{
                  backgroundColor: "#FFFFFF",
                  padding: "10px",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-md)",
                  transform: `rotate(${[-3, 2, -1.5, 3][index % 4]}deg)`,
                }}
              >
                <span className="relative block size-[156px] overflow-hidden md:size-[240px]" style={{ borderRadius: "var(--radius-sm)" }}>
                  <Image
                    src={item.imageUrl as string}
                    alt={index < usable.length ? item.imageAltHe : ""}
                    fill
                    sizes="(max-width: 767px) 156px, 240px"
                    style={{ objectFit: "cover" }}
                    aria-hidden={index >= usable.length ? true : undefined}
                  />
                </span>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

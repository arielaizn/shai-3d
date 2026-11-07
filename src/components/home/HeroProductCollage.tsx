import * as React from "react";
import Image from "next/image";

import { LOOP } from "@/lib/design/motion";

import { IdeaFlipCard } from "./IdeaFlipCard";

/**
 * The hero collage, doc 03 §3.1, with the flip card as its primary object (doc 07 §7.3).
 *
 * Two photographs in white frames on a yellow blob. The primary card is tilted -4deg
 * and carries `priority`; the secondary is tilted +6deg at 0.62 scale, overlapping the
 * primary's bottom-end corner, and **desktop only**, so it is never an LCP asset.
 *
 * The blob is one flat yellow shape with no gradient, drifting 0 -> 3 -> 0 degrees over
 * 14 seconds (`LOOP.blob`, doc 07 §5.10). It is one of at most two ambient loops on
 * screen at a time, and it is decorative, so `prefers-reduced-motion` removes it
 * outright through the global rule in `globals.css`.
 */

const ALT = {
  /** Asset A01, doc 08. */
  primary: "שלוש הדפסות תלת ממד על רקע קרם: פאנל מואר, פסלון אדום ומחזיק מפתחות",
  /** Asset A02, doc 08. */
  secondary: "מגנט מקרר מודפס בצורת ענן בצבע צהוב",
  /** Asset A03 before, doc 08. The photograph a customer sent, which is the card's back. */
  back: "תצלום מודפס על נייר של גור כלבים",
} as const;

export type HeroProductCollageProps = {
  primarySrc?: string;
  secondarySrc?: string;
  backSrc?: string;
  flipLabel: string;
  flipChip: string;
  backCaption: string;
};

export function HeroProductCollage({
  primarySrc = "/assets/home/hero-primary.webp",
  secondarySrc = "/assets/home/hero-secondary.webp",
  backSrc = "/assets/home/hero-idea-back.webp",
  flipLabel,
  flipChip,
  backCaption,
}: HeroProductCollageProps) {
  return (
    <div className="relative [min-inline-size:0]">
      <style href="hero-blob" precedence="default">{`
        @keyframes hero-blob-drift {
          0%   { transform: rotate(0deg) scale(1.08); }
          50%  { transform: rotate(3deg) scale(1.08); }
          100% { transform: rotate(0deg) scale(1.08); }
        }
      `}</style>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-11%] bottom-[-4%] top-[2%] block max-md:top-auto max-md:h-[62%]"
        style={{
          animation: `hero-blob-drift ${LOOP.blob}ms linear infinite`,
          willChange: "transform",
        }}
      >
        <svg
          viewBox="0 0 400 400"
          preserveAspectRatio="none"
          className="size-full"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="var(--color-yellow-400)"
            d="M323 78c34 33 51 84 44 130-7 46-39 88-80 113-41 25-91 34-133 20-42-14-76-51-88-95-12-44-2-95 27-131 29-36 77-57 125-59 48-2 96 15 105 22Z"
          />
        </svg>
      </span>

      <div className="relative mx-auto w-[min(100%,30rem)] [min-inline-size:0] lg:w-full">
        <IdeaFlipCard
          frontSrc={primarySrc}
          frontAlt={ALT.primary}
          backSrc={backSrc}
          backAlt={ALT.back}
          backCaption={backCaption}
          label={flipLabel}
          chipLabel={flipChip}
        />

        {/* doc 08 A02: desktop only, so the mobile hero never pays for a second image */}
        <div
          className="absolute bottom-[-8%] end-[-6%] hidden w-[38%] lg:block"
          style={{
            transform: "rotate(6deg)",
            backgroundColor: "#FFFFFF",
            padding: "12px",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-photo)",
          }}
        >
          <span className="relative block aspect-square w-full overflow-hidden [min-inline-size:0]" style={{ borderRadius: "var(--radius-sm)" }}>
            <Image
              src={secondarySrc}
              alt={ALT.secondary}
              fill
              sizes="18vw"
              style={{ objectFit: "cover" }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

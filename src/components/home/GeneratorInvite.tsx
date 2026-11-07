import * as React from "react";
import Image from "next/image";

import { LinkButton } from "@/components/ui/LinkButton";
import { HOME } from "@/content/home";

/**
 * The turquoise invite panel, doc 03 §3.3.
 *
 * It hands the visitor to the generator at the exact moment the process feels easy.
 * This is the second red CTA on the page, and it sits far enough below the hero that
 * the two never share a viewport, which is what keeps the red budget intact.
 *
 * The before/after pair is one render cropped into two files (doc 08 A03), because the
 * two panels have to show the *same* photograph or the claim collapses.
 */

const ALT = {
  before: "תצלום מודפס על נייר של גור כלבים",
  after: "אותו תצלום כפאנל מודפס ומואר מאחור",
} as const;

function Frame({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="w-full [min-inline-size:0]"
      style={{
        backgroundColor: "#FFFFFF",
        padding: "10px",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span
        className="relative block aspect-square w-full overflow-hidden [min-inline-size:0]"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <Image src={src} alt={alt} fill sizes="(max-width: 1023px) 44vw, 220px" style={{ objectFit: "cover" }} />
      </span>
    </div>
  );
}

export function GeneratorInvite() {
  const { invite } = HOME.how;

  return (
    <div
      className="flex flex-col gap-8 p-6 sm:p-10 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-12 lg:p-12 [min-inline-size:0]"
      style={{
        backgroundColor: "var(--color-turq-500)",
        borderRadius: "var(--radius-xl)",
      }}
    >
      <div className="flex flex-col items-start gap-6 lg:max-w-[26rem] [min-inline-size:0]">
        <h3
          className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
          style={{
            fontSize: "clamp(1.625rem, 1.24rem + 1.57vw, 2.5rem)",
            fontWeight: 800,
            lineHeight: 1.08,
            color: "var(--color-text-on-turquoise)",
            maxInlineSize: "20ch",
          }}
        >
          {invite.heading}
        </h3>

        <LinkButton href={invite.href} variant="accent" size="lg" className="max-sm:w-full">
          {invite.cta}
        </LinkButton>
      </div>

      <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 lg:w-[26rem] [min-inline-size:0]">
        <Frame src="/assets/home/transform-before.webp" alt={ALT.before} />
        <Frame src="/assets/home/transform-after.webp" alt={ALT.after} />
      </div>
    </div>
  );
}

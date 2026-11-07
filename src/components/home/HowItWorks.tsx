import * as React from "react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { HOME } from "@/content/home";

import { Band } from "./Band";
import { GeneratorInvite } from "./GeneratorInvite";
import { Reveal } from "./Reveal";
import { StepCard } from "./StepCard";

/**
 * `HowItWorksStrip`, doc 03 §3.3. Cream ground, two parts in one band: three numbered
 * steps, then the turquoise generator invite.
 *
 * It removes the process anxiety and then hands the visitor over while the process
 * still feels easy.
 *
 * The dashed turquoise connector runs between the three cards. It is drawn as a
 * border on a positioned element rather than as an SVG, so it costs nothing and it
 * mirrors for free: in RTL the row reads right to left and the line simply spans it.
 * It is `aria-hidden`, because a connector that a screen reader announces is noise.
 */

const SPOTS = [
  { src: "/assets/home/step-01-upload.webp", alt: "טלפון עם תמונה על המסך" },
  { src: "/assets/home/step-02-colours.webp", alt: "ארבעה גלילי חוט הדפסה בצבעים שונים" },
  { src: "/assets/home/step-03-receive.webp", alt: "קופסת משלוח לבנה פתוחה עם הדפסה בפנים" },
] as const;

export function HowItWorks() {
  const { how } = HOME;

  return (
    <Band ground="cream">
      <div className="flex flex-col gap-10 md:gap-14 [min-inline-size:0]">
        <Reveal as="div" cover="cream">
          <SectionHeading level={2} rule>
            {how.heading}
          </SectionHeading>
        </Reveal>

        <div className="relative [min-inline-size:0]">
          {/* the connector: horizontal across the row on desktop, vertical on the
              start edge on mobile */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute start-6 top-0 bottom-0 block border-s-2 border-dashed md:inset-x-[12%] md:start-auto md:bottom-auto md:top-14 md:border-s-0 md:border-t-2"
            style={{ borderColor: "var(--color-turq-300)" }}
          />

          <ol className="relative grid gap-10 ps-16 md:grid-cols-[repeat(3,minmax(0,1fr))] md:gap-8 md:ps-0 [min-inline-size:0]">
            {how.steps.map((step, index) => (
              <Reveal
                as="li"
                key={step.title}
                cover="cream"
                stagger="editorial"
                index={index + 1}
                className="[min-inline-size:0]"
              >
                <StepCard
                  index={index + 1}
                  title={step.title}
                  body={step.body}
                  spotSrc={SPOTS[index]?.src}
                  spotAlt={SPOTS[index]?.alt}
                />
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal as="div" cover="cream" stagger="editorial" index={4}>
          <GeneratorInvite />
        </Reveal>
      </div>
    </Band>
  );
}

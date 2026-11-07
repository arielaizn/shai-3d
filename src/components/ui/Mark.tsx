"use client";

import * as React from "react";

import { DURATION, EASE, prefersReducedMotion } from "@/lib/design/motion";

/**
 * The marker. Doc 02 §3.1, and one of the two typographic devices the site owns.
 *
 * The reference (pop.vibeliner) uses a mechanical rectangle with a uniform radius.
 * This is a **swipe**: four corners with four different elliptical radii, so the
 * shape reads as something drawn across the word rather than a box emitted by code.
 * The 1.5 degree tilt is the largest angle that does not put a visible step in the
 * surrounding line of text.
 *
 * Two protections keep it intact across a line break, which is where the earlier
 * absolutely-positioned `::before` implementation painted one rectangle straight
 * through the intervening text:
 *
 * 1. `white-space: nowrap`, so a marked word never splits in the middle.
 * 2. `box-decoration-break: clone`, so if a two-word phrase ever does wrap, each
 *    line gets a whole shape with its own rounded corners instead of a cut rectangle.
 *
 * Frequency: one marker per scrolled screen, at most three in a page, never two in
 * one heading, never in body text, never on a link, a button, a number or a price.
 *
 * Colour: doc 01 §4.2. The label is always ink. Ink on red-500 is 4.66, on turq-500
 * is 7.87, on yellow-400 is 11.40. A white label on red-500 is 3.87 and fails AA,
 * which is why the marked word is never white.
 */

export type MarkTone = "red" | "turquoise" | "yellow";

const TONES: Record<MarkTone, string> = {
  red: "var(--color-red-500)",
  turquoise: "var(--color-turq-500)",
  yellow: "var(--color-yellow-400)",
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export type MarkProps = {
  /**
   * A single word. Typed as `string` on purpose, so TypeScript blocks anyone from
   * dropping a paragraph inside the device.
   */
  children: string;
  tone?: MarkTone;
  /** The sweep. Doc 03 gives it to the hero H1 once per load, and nowhere else. */
  animate?: boolean;
  /** Delay before the sweep starts, in ms. Doc 07 §5.9 puts the hero at 180. */
  delay?: number;
  className?: string;
};

export function Mark({
  children,
  tone = "red",
  animate = false,
  delay = 180,
  className,
}: MarkProps) {
  const [phase, setPhase] = React.useState<"idle" | "armed" | "swept">("idle");

  /**
   * Arming happens in a layout effect so the clipped state is painted in the same
   * frame the component mounts, with no flash of the finished word. Server output
   * and a no-JS client both render the finished word, which is the right fallback.
   */
  useIsomorphicLayoutEffect(() => {
    if (!animate) return;
    // Tier A in doc 07 §12.2: an unrequested decorative sweep is removed entirely.
    if (prefersReducedMotion()) return;
    setPhase("armed");
  }, [animate]);

  React.useEffect(() => {
    if (phase !== "armed") return;
    const timer = window.setTimeout(() => setPhase("swept"), delay);
    return () => window.clearTimeout(timer);
  }, [phase, delay]);

  const clipped = phase === "armed";
  const animating = phase !== "idle";

  return (
    <span
      className={className}
      data-motion={animate ? "decorative" : undefined}
      style={{
        display: "inline",
        // one word. It does not break. ever.
        whiteSpace: "nowrap",
        color: "var(--color-ink-900)",
        backgroundColor: TONES[tone],
        paddingInline: "0.22em",
        // asymmetric: ק ן ך ף ץ drop below the baseline and need the room
        paddingBlock: "0.04em 0.12em",
        paddingTop: "0.02em",
        marginInline: "0.04em",
        borderRadius: "0.62em 0.26em 0.55em 0.30em / 0.42em 0.52em 0.36em 0.46em",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        // --flip is -1 in RTL, so the swipe tilts up towards the end of the line.
        // The fallback is the RTL value, because this site has no LTR screen.
        transform: "rotate(calc(var(--flip, -1) * -1.5deg))",
        transformOrigin: "center",
        // RTL: the swipe starts at the right edge, which is where a Hebrew pen starts
        clipPath: animating ? (clipped ? "inset(0 0 0 100%)" : "inset(0 0 0 0)") : undefined,
        transition: animating ? `clip-path ${DURATION.d5}ms ${EASE.outSoft}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

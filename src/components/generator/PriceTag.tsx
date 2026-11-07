"use client";

/**
 * src/components/generator/PriceTag.tsx
 *
 * The number. This is the emotional peak of the site, so it is also the piece with the
 * most rules written down.
 *
 * **The count-up.** 900ms, `easeOutExpo`, in steps of five shekels so no ugly
 * intermediate number is ever readable. Under `prefers-reduced-motion` there is no
 * count, no flash and no landing bounce: the number simply appears.
 *
 * **The announcement.** RESOLUTIONS §15 and the assignment: the digits are
 * `aria-hidden`, and the price is announced **once, after the count-up has settled**,
 * from a sibling `role="status"`. Announcing during the count would read a screen
 * reader user 40 different numbers, and announcing from the `<bdi>` itself announces
 * nothing at all, because `generic` may not carry an accessible name.
 *
 * **The bidi.** RESOLUTIONS §18: only the digits go inside the `<bdi>`. `150 ש״ח` is
 * already correct in an RTL run and isolating the whole string is what breaks it.
 *
 * **The colours.** Ink on `--color-price-tag-bg` measures 4.66:1, which passes AA at
 * every size. Cream on the same red measures 3.64:1 and passes only above 18px bold,
 * so the tokens in `globals.css` put ink on the tag and this component uses them.
 */

import * as React from "react";

import { SHEKEL_UNIT, formatAgorot, spokenPrice } from "@/lib/format/price";

import { useReducedMotion } from "./hooks";

const DURATION_MS = 900;
/** Five shekels. Nothing between the start and the total is a number you could stop on. */
const STEP_AGOROT = 500;

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(target: number, enabled: boolean): { value: number; settled: boolean } {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(enabled ? 0 : target);
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) {
      setValue(target);
      setSettled(false);
      return;
    }
    if (reduced) {
      setValue(target);
      setSettled(true);
      return;
    }

    let frame = 0;
    const start = performance.now();
    setSettled(false);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = easeOutExpo(progress);
      setValue(
        progress === 1 ? target : Math.round((target * eased) / STEP_AGOROT) * STEP_AGOROT,
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setSettled(true);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, reduced]);

  return { value, settled };
}

export type PriceTagProps = {
  /** The total from `pricing.quote`. Integer agorot, server computed. */
  agorot: number;
  /** False while the quote is still loading, which holds the count at zero. */
  ready: boolean;
};

export function PriceTag({ agorot, ready }: PriceTagProps) {
  const reduced = useReducedMotion();
  const { value, settled } = useCountUp(agorot, ready);

  return (
    <div className="relative flex items-center justify-center [min-inline-size:0]">
      {/* The burst behind the tag. Decorative, and removed under reduced motion. */}
      {!reduced && settled ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            inlineSize: "min(22rem, 90%)",
            aspectRatio: "1",
            borderRadius: "var(--radius-full)",
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--color-price-burst) 70%, transparent), transparent 62%)",
            animation: "pop 520ms var(--ease-out-soft) both",
          }}
        />
      ) : null}

      <div
        className="relative flex items-center justify-center"
        style={{
          backgroundColor: "var(--color-price-tag-bg)",
          color: "var(--color-price-tag-text)",
          borderRadius: "var(--radius-lg)",
          padding: "1.25rem 2rem 1.25rem 2.75rem",
          transform: "rotate(-3deg)",
          boxShadow: "var(--shadow-lg)",
          animation: reduced || !ready ? undefined : "var(--animate-price-slam)",
        }}
        data-red-object="price-tag"
      >
        {/* the punch hole, which is what makes the shape read as a tag */}
        <span
          aria-hidden="true"
          className="absolute"
          style={{
            insetInlineEnd: "0.9rem",
            insetBlockStart: "50%",
            marginBlockStart: "-0.45rem",
            inlineSize: "0.9rem",
            blockSize: "0.9rem",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-surface)",
            boxShadow: "inset 0 1px 2px color-mix(in oklab, var(--color-ink-900) 35%, transparent)",
          }}
        />

        <span
          aria-hidden="true"
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-rubik), system-ui, sans-serif",
            fontSize: "clamp(3rem, 1.9rem + 4.49vw, 5.5rem)",
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: "-0.01em",
          }}
        >
          <bdi dir="ltr" className="tabular-nums">
            {formatAgorot(value)}
          </bdi>{" "}
          <span style={{ fontSize: "0.28em", fontWeight: 800, verticalAlign: "0.42em" }}>
            {SHEKEL_UNIT}
          </span>
        </span>
      </div>

      {/* Written once, after the count has settled. */}
      <span className="sr-only" role="status">
        {settled ? spokenPrice(agorot) : ""}
      </span>
    </div>
  );
}

import * as React from "react";

import { SHEKEL_UNIT, formatAgorot, spokenPrice } from "@/lib/format/price";

/**
 * The price. It is the emotional peak of the site, so it is also the one component
 * whose bidi and accessibility behaviour is written down rather than assumed.
 *
 * RESOLUTIONS §18, the bidi rule: `45 ש״ח` is already correct in an RTL paragraph.
 * Wrapping the whole string in `dir="ltr"` is what breaks it. **Only the digits go
 * inside the `<bdi>`, never the Hebrew unit.**
 *
 * RESOLUTIONS §15, the naming rule: `<bdi>` maps to ARIA role `generic`, and
 * `generic` is prohibited from carrying an accessible name, so `aria-label` on it is
 * silently dropped by NVDA, JAWS and VoiceOver alike. With both visible spans
 * `aria-hidden`, the earlier implementation announced the price as **complete
 * silence** on every screen of the site. The name therefore lives on a sibling
 * sr-only element, and it says `שקל אחד` for one and `שני שקלים` for two rather than
 * the ungrammatical `1 שקלים`.
 *
 * Doc 02 §2.4: `tabular-nums` everywhere a number changes in real time, or the
 * number jumps width while it updates and the biggest moment on the site feels rickety.
 */

export type PriceSize = "huge" | "lead" | "inline" | "sm";
export type PriceTone = "ink" | "red" | "onRed" | "onInverse" | "inherit";

type SizeSpec = {
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  unitSize: string;
  unitShift: string;
  display: boolean;
};

/** Doc 02 §2. The huge step is the only place weight 900 appears on the whole site. */
const SIZES: Record<PriceSize, SizeSpec> = {
  huge: {
    fontSize: "clamp(3rem, 1.9rem + 4.49vw, 5.5rem)",
    fontWeight: 900,
    lineHeight: "0.9",
    unitSize: "0.28em",
    unitShift: "0.42em",
    display: true,
  },
  lead: {
    fontSize: "clamp(1.625rem, 1.24rem + 1.57vw, 2.5rem)",
    fontWeight: 800,
    lineHeight: "1.08",
    unitSize: "0.5em",
    unitShift: "0.24em",
    display: true,
  },
  inline: {
    fontSize: "clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)",
    fontWeight: 700,
    lineHeight: "1.25",
    unitSize: "0.62em",
    unitShift: "0.14em",
    display: true,
  },
  sm: {
    fontSize: "0.9375rem",
    fontWeight: 700,
    lineHeight: "1.7",
    unitSize: "0.86em",
    unitShift: "0",
    display: false,
  },
};

/**
 * Doc 01 §4.2: red-500 measures 3.64 on cream, which clears large-text AA at 24px
 * and up and fails it below. So the small step steps down the ramp to red-700
 * (6.55) instead of quietly shipping an illegible price.
 */
function resolveColour(tone: PriceTone, size: PriceSize): string | undefined {
  switch (tone) {
    case "ink":
      return "var(--color-ink-900)";
    case "red":
      return size === "sm" ? "var(--color-red-700)" : "var(--color-red-500)";
    case "onRed":
      return "var(--color-price-tag-text)"; // ink on red-500 = 4.66 at every size
    case "onInverse":
      return "var(--color-text-on-inverse)";
    case "inherit":
      return undefined;
  }
}

export type PriceProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** Integer agorot, straight from `convex/lib/priceEngine.ts`. Never shekels. */
  agorot: number;
  size?: PriceSize;
  tone?: PriceTone;
  /** Hide the unit where a column header already carries it. */
  unit?: boolean;
  /** Render the screen-reader name. Off only where an ancestor already says it. */
  announce?: boolean;
  /**
   * `role="status"` makes the name a polite live region, which is what the generator
   * wants: the price changes under the visitor and they hear the new one. A grid of
   * cards that never changes can pass `live={false}` and keep it a plain name.
   */
  live?: boolean;
};

export function Price({
  agorot,
  size = "inline",
  tone = "ink",
  unit = true,
  announce = true,
  live = true,
  className,
  style,
  ...rest
}: PriceProps) {
  const spec = SIZES[size];
  const digits = formatAgorot(agorot);

  return (
    <span
      {...rest}
      className={["tabular-nums [min-inline-size:0]", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: spec.display
          ? "var(--font-rubik), system-ui, sans-serif"
          : "var(--font-assistant), system-ui, sans-serif",
        fontSize: spec.fontSize,
        fontWeight: spec.fontWeight,
        lineHeight: spec.lineHeight,
        letterSpacing: "0em",
        color: resolveColour(tone, size),
        ...style,
      }}
    >
      <span aria-hidden="true">
        <bdi dir="ltr" className="tabular-nums">
          {digits}
        </bdi>
        {unit ? (
          <>
            {" "}
            <span
              style={{
                fontSize: spec.unitSize,
                fontWeight: spec.display ? 800 : spec.fontWeight,
                verticalAlign: spec.unitShift === "0" ? undefined : spec.unitShift,
              }}
            >
              {SHEKEL_UNIT}
            </span>
          </>
        ) : null}
      </span>

      {announce ? (
        <span className="sr-only" role={live ? "status" : undefined}>
          {spokenPrice(agorot)}
        </span>
      ) : null}
    </span>
  );
}

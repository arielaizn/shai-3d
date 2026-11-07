import * as React from "react";
import Link from "next/link";

/**
 * The tilted card, and the second most important tactile decision after the hard
 * shadow: a crooked object that squares itself up when you reach for it reads as a
 * thing responding to a hand.
 *
 * Doc 07 §5.5: rest is `rotate(±2deg)` with `shadow-md`; hover and focus-visible
 * both straighten to 0deg, lift 6px and swap to `shadow-lg`. Focus gets the identical
 * treatment on purpose, so a keyboard user is not left with a ring drawn around a
 * crooked card.
 *
 * RESOLUTIONS §11 overrides doc 03 §4.4 here: the focus ring is ink with a cream
 * inner ring, not the 3px turquoise that spec asked for. Turquoise on cream measures
 * 2.16:1 against a 3:1 requirement, so that ring was invisible to the people who
 * need it.
 *
 * RESOLUTIONS §12: the card and its content both carry `min-inline-size: 0`, or a
 * long unbroken Hebrew title pushes the grid track wider than its column.
 */

const RING_GAP = "0 0 0 2px var(--color-focus-gap)";
const RING_HALO = "0 0 0 9px color-mix(in oklab, var(--color-focus-halo) 55%, transparent)";

type CssVars = React.CSSProperties & Record<string, string | number>;

export type TiltCardProps = {
  children: React.ReactNode;
  /** Degrees at rest. Doc 03 keeps the catalog within ±2. */
  rotate?: number;
  /** The 12px white photo frame from doc 01 §9. */
  frame?: boolean;
  /** Makes the whole card one link. Internal paths route through Next. */
  href?: string;
  /** Hover and focus behaviour without a link, for a card that opens a dialog. */
  interactive?: boolean;
  /** Accessible name when the card's own content does not supply one. */
  "aria-label"?: string;
  className?: string;
  /** Wrapper element when the card is not a link. */
  as?: "div" | "article" | "li";
};

const SURFACE: React.CSSProperties = {
  backgroundColor: "var(--color-surface-raised)",
  borderRadius: "var(--radius-xl)",
  overflow: "hidden",
};

const REST_CLASSES = [
  "relative block [min-inline-size:0] no-underline",
  "rotate-[var(--tilt)] shadow-[var(--tilt-shadow)]",
].join(" ");

const INTERACTIVE_CLASSES = [
  "transition duration-320 ease-toy",
  "hover:rotate-0 hover:-translate-y-1.5 hover:shadow-[var(--tilt-shadow-hover)]",
  "focus-visible:rotate-0 focus-visible:-translate-y-1.5",
  "focus-visible:shadow-[var(--tilt-shadow-focus)] focus-visible:duration-0",
  // Tier B in doc 07 §12.2: the shadow still answers, the travel does not
  "motion-reduce:hover:rotate-[var(--tilt)] motion-reduce:hover:translate-y-0",
  "motion-reduce:focus-visible:rotate-[var(--tilt)] motion-reduce:focus-visible:translate-y-0",
].join(" ");

function isInternal(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#") || href.startsWith("?");
}

export function TiltCard({
  children,
  rotate = -2,
  frame = false,
  href,
  interactive,
  className,
  as = "div",
  ...rest
}: TiltCardProps) {
  const responds = interactive ?? Boolean(href);

  const style: CssVars = {
    ...SURFACE,
    "--tilt": `${rotate}deg`,
    "--tilt-shadow": frame ? "var(--shadow-photo)" : "var(--shadow-md)",
    "--tilt-shadow-hover": frame ? "var(--shadow-xl)" : "var(--shadow-lg)",
    "--tilt-shadow-focus": `${RING_GAP}, ${RING_HALO}, ${frame ? "var(--shadow-xl)" : "var(--shadow-lg)"}`,
    ...(frame
      ? {
          // the thick white photo frame from doc 01 §9, which is what turns a
          // rendered object into something that looks printed and pinned up
          borderWidth: "12px",
          borderColor: "#FFFFFF",
          borderRadius: "var(--radius-2xl)",
        }
      : null),
  };

  const classNames = [REST_CLASSES, responds ? INTERACTIVE_CLASSES : "", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const shared = {
      ...rest,
      className: classNames,
      style,
      "data-motion": "state" as const,
    };
    return isInternal(href) ? (
      <Link href={href} {...shared}>
        {children}
      </Link>
    ) : (
      <a href={href} {...shared}>
        {children}
      </a>
    );
  }

  const Tag = as;
  return (
    <Tag {...rest} className={classNames} style={style} data-motion={responds ? "state" : undefined}>
      {children}
    </Tag>
  );
}

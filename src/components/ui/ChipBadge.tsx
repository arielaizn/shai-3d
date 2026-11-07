import * as React from "react";

/**
 * The badge. A pill with the signature 3px ink outline from doc 01 §9.
 *
 * 3px is the load-bearing number: 2px reads as a UI border, 4px reads as a comic
 * outline, and 3px is where the edge starts to look moulded.
 *
 * Badges are decorative `<span>`s and never buttons (doc 03 §4.4), because the whole
 * product card is already one link and a nested interactive element inside it is a
 * keyboard trap waiting to happen. Anything a badge says that is not visible from
 * the artwork gets an `aria-label` from the caller.
 *
 * Colour, all measured in doc 01 §4.3: ink on turquoise 7.87, ink on yellow 11.40,
 * ink on red-500 4.66, cream on ink 17.62. The label is ink on every coloured fill.
 */

export type ChipTone =
  | "ink"
  | "turquoise"
  | "yellow"
  | "red"
  | "cream"
  | "success"
  | "warning"
  | "danger";

export type ChipSize = "sm" | "md";

type ChipStyle = { bg: string; fg: string; ring: string | null };

const TONES: Record<ChipTone, ChipStyle> = {
  ink: { bg: "var(--color-ink-900)", fg: "var(--color-cream-50)", ring: null },
  turquoise: { bg: "var(--color-turq-500)", fg: "var(--color-ink-900)", ring: "var(--color-ink-900)" },
  yellow: { bg: "var(--color-yellow-400)", fg: "var(--color-ink-900)", ring: "var(--color-ink-900)" },
  // rationed: doc 01 §5.1 allows one red object per viewport, and a price outranks a badge
  red: { bg: "var(--color-red-500)", fg: "var(--color-text-on-red)", ring: "var(--color-ink-900)" },
  cream: { bg: "var(--color-cream-50)", fg: "var(--color-ink-900)", ring: "var(--color-ink-900)" },
  success: {
    bg: "var(--color-success-soft)",
    fg: "var(--color-success-strong)",
    ring: "var(--color-success)",
  },
  warning: {
    bg: "var(--color-warning-soft)",
    fg: "var(--color-warning-text)",
    ring: "var(--color-yellow-600)",
  },
  danger: {
    bg: "var(--color-danger-soft)",
    fg: "var(--color-danger-strong)",
    ring: "var(--color-danger)",
  },
};

const SIZES: Record<ChipSize, React.CSSProperties> = {
  sm: {
    minBlockSize: "1.5rem",
    paddingInline: "0.625rem",
    fontSize: "0.75rem",
    letterSpacing: "0.06em",
  },
  md: {
    minBlockSize: "1.875rem",
    paddingInline: "0.8125rem",
    fontSize: "0.8125rem",
    letterSpacing: "0.005em",
  },
};

export type ChipBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  /** A glyph before the label. Always decorative, always `aria-hidden`. */
  icon?: React.ReactNode;
  /** Entrance. `pop` is the badge's listed home in doc 07 §5.1. */
  pop?: boolean;
};

export function ChipBadge({
  children,
  tone = "ink",
  size = "sm",
  icon,
  pop = false,
  className,
  style,
  ...rest
}: ChipBadgeProps) {
  const palette = TONES[tone];

  return (
    <span
      {...rest}
      data-red-object={tone === "red" ? "chip-badge" : undefined}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap",
        "font-[family-name:var(--font-rubik)] font-bold [min-inline-size:0]",
        pop ? "animate-pop" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...SIZES[size],
        backgroundColor: palette.bg,
        color: palette.fg,
        lineHeight: 1.4,
        borderWidth: palette.ring ? "3px" : "0",
        borderColor: palette.ring ?? "transparent",
        ...style,
      }}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="[min-inline-size:0] truncate">{children}</span>
    </span>
  );
}

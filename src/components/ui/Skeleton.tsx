import * as React from "react";

import { LOOP } from "@/lib/design/motion";

/**
 * The loading placeholder. `ink-200 #CFC9D5` is the bar colour from doc 01 §2.5.
 *
 * The pulse reuses the theme's one looping keyframe rather than introducing a
 * shimmer sweep, which would be a second ambient loop competing for the two-loop
 * budget in doc 07 §5.10, and a gradient sweep repaints on every frame.
 *
 * Accessibility: the bars are `aria-hidden`, because a screen reader announcing six
 * grey rectangles is worse than silence. Pass `label` to add the one polite status
 * message instead. Doc 09c §2.8 supplies it: `טוען תוכן`.
 */

export type SkeletonVariant = "line" | "block" | "circle" | "chip";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
  /** Number of bars for `line`. The last one is short, the way a paragraph ends. */
  lines?: number;
  width?: string;
  height?: string;
  radius?: string;
  /** Announced once, politely, for the whole block. */
  label?: string;
};

const DEFAULTS: Record<SkeletonVariant, { height: string; radius: string; width: string }> = {
  line: { height: "0.875rem", radius: "var(--radius-xs)", width: "100%" },
  block: { height: "12rem", radius: "var(--radius-xl)", width: "100%" },
  circle: { height: "3rem", radius: "var(--radius-full)", width: "3rem" },
  chip: { height: "1.875rem", radius: "var(--radius-full)", width: "5.5rem" },
};

function Bar({
  width,
  height,
  radius,
  delayIndex,
}: {
  width: string;
  height: string;
  radius: string;
  delayIndex: number;
}) {
  return (
    <span
      className="animate-gitd-pulse block"
      style={{
        inlineSize: width,
        blockSize: height,
        borderRadius: radius,
        backgroundColor: "var(--color-ink-200)",
        // a negative delay offsets the phase inside the loop instead of
        // holding the bar still while it waits its turn
        animationDelay: `${-Math.round(LOOP.gitd / 6) * delayIndex}ms`,
      }}
    />
  );
}

export function Skeleton({
  variant = "line",
  lines = 1,
  width,
  height,
  radius,
  label,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const base = DEFAULTS[variant];
  const resolved = {
    width: width ?? base.width,
    height: height ?? base.height,
    radius: radius ?? base.radius,
  };
  const count = variant === "line" ? Math.max(1, lines) : 1;

  return (
    <div
      {...rest}
      className={["flex flex-col gap-2 [min-inline-size:0]", className].filter(Boolean).join(" ")}
      style={style}
      data-motion="decorative"
    >
      <span aria-hidden="true" className="flex flex-col gap-2 [min-inline-size:0]">
        {Array.from({ length: count }, (_, index) => (
          <Bar
            key={index}
            delayIndex={index}
            height={resolved.height}
            radius={resolved.radius}
            // the closing line of a paragraph is short, so the block reads as text
            width={count > 1 && index === count - 1 ? "62%" : resolved.width}
          />
        ))}
      </span>

      {label ? (
        <span className="sr-only" role="status">
          {label}
        </span>
      ) : null}
    </div>
  );
}

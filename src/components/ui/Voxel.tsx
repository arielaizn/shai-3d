import * as React from "react";

/**
 * The printed voxel. Doc 02 §3.2, the second of the two devices the site owns.
 *
 * The gutzim reference ends a headline with a coloured dot. This is not a dot: it is
 * a small square with a barely-rounded corner, the first layer the printer puts down.
 * The identical shape is the bullet in the overline, so the two elements speak one
 * language.
 *
 * Why an element and not a `.` character: a full stop at the end of a Hebrew line is
 * governed by the bidi algorithm, so if the line happens to end in a Latin run or a
 * number it jumps to the wrong side. An inline element takes its position from the
 * block's flow direction instead, and it also stays out of copied text, out of the
 * screen reader, and out of the WhatsApp message.
 *
 * Frequency: it ends a display line, an h1 or an h2. Never an h3, body text, a
 * button, a form label or a nav item. Turquoise by default, yellow only on the price
 * reveal heading, and never red, because red belongs to the CTA and the price and a
 * red voxel would compete with both.
 */

export type VoxelTone = "turquoise" | "yellow" | "ink";

const TONES: Record<VoxelTone, string> = {
  turquoise: "var(--color-turq-500)",
  yellow: "var(--color-yellow-400)",
  ink: "var(--color-ink-900)",
};

export type VoxelProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: VoxelTone;
  /**
   * Any CSS length. Defaults to `0.26em`, so it scales with the heading it ends
   * instead of needing a variant per type size.
   */
  size?: string;
};

export function Voxel({ tone = "turquoise", size = "0.26em", className, style, ...rest }: VoxelProps) {
  return (
    <span
      {...rest}
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        inlineSize: size,
        blockSize: size,
        borderRadius: "0.07em", // a voxel, not a circle
        backgroundColor: TONES[tone],
        marginInlineStart: "0.09em", // logical: it lands at the left edge in Hebrew
        verticalAlign: "baseline",
        transform: "rotate(-6deg) translateY(0.015em)",
        ...style,
      }}
    />
  );
}

export type VoxelTailProps = {
  /** A heading line. Typed as `string` so the last word can be found reliably. */
  children: string;
  tone?: VoxelTone;
};

/**
 * Binds the voxel to the final word so the two can never be split across a line.
 * A voxel that wraps onto its own line reads as a rendering bug, and at 320px on a
 * long Hebrew heading that is exactly what happens without this.
 */
export function VoxelTail({ children, tone = "turquoise" }: VoxelTailProps) {
  const words = children.trim().split(" ");
  const last = words.pop() ?? "";
  const head = words.length ? `${words.join(" ")} ` : "";

  return (
    <>
      {head}
      <span style={{ whiteSpace: "nowrap" }}>
        {last}
        <Voxel tone={tone} />
      </span>
    </>
  );
}

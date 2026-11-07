import * as React from "react";

import { Voxel, type VoxelTone } from "./Voxel";

/**
 * The overline above a heading. Doc 02 §2 and §3.3.
 *
 * 12px, weight 700, `letter-spacing: 0.06em`. That positive tracking is the only
 * one allowed anywhere on the site outside `caption`: at this size opening the
 * letters up separates short Hebrew words. Negative tracking is banned outright,
 * because it closes ם ס ט ע and glues ר to ד until they read as one letter.
 *
 * The bullet is the printed voxel rather than gutzim's ✦. A sparkle belongs to a
 * gift shop; a voxel belongs to Shai's printer.
 *
 * Colour: `text-muted #665C70` measures 5.94 on cream, which is AA at 12px. The
 * turquoise variant steps down to turq-800 (7.48), never turq-500 (2.16).
 */

export type EyebrowTone = "muted" | "play" | "onInverse";

const TONES: Record<EyebrowTone, string> = {
  muted: "var(--color-text-muted)",
  play: "var(--color-turq-800)",
  onInverse: "var(--color-text-on-inverse)",
};

export type EyebrowProps = React.HTMLAttributes<HTMLParagraphElement> & {
  children: React.ReactNode;
  tone?: EyebrowTone;
  /** The voxel bullet. Off where the eyebrow sits inside a component that has one. */
  voxel?: boolean;
  voxelTone?: VoxelTone;
};

export function Eyebrow({
  children,
  tone = "muted",
  voxel = true,
  voxelTone = "turquoise",
  className,
  style,
  ...rest
}: EyebrowProps) {
  return (
    <p
      {...rest}
      className={[
        "flex items-center gap-2 font-[family-name:var(--font-rubik)] [min-inline-size:0]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        fontSize: "0.75rem",
        lineHeight: 1.4,
        letterSpacing: "0.06em",
        fontWeight: 700,
        color: TONES[tone],
        ...style,
      }}
    >
      {voxel ? <Voxel tone={voxelTone} size="0.5rem" className="shrink-0" /> : null}
      <span className="[min-inline-size:0]">{children}</span>
    </p>
  );
}

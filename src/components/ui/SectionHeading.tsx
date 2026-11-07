import * as React from "react";

import { Eyebrow } from "./Eyebrow";
import { VoxelTail, type VoxelTone } from "./Voxel";

/**
 * A section heading, its optional eyebrow, and the 64px turquoise rule under it.
 *
 * Doc 03 §8: one `<h1>` per page, and it lives in that page's hero. Section
 * headings are `<h2>`, and the level is a prop rather than a guess so a document
 * outline can be checked by reading the JSX. Doc 09 §475 needs `level={3}` where a
 * real sub-grouping exists, and skipping a level is better than inventing a heading
 * to fill the gap.
 *
 * The voxel terminates the line (doc 02 §3.2). It is applied only when the heading
 * is a plain string, because the last word has to be found to keep the two together
 * on one line.
 */

export type HeadingLevel = 1 | 2 | 3 | 4;

type LevelSpec = { fontSize: string; fontWeight: number; lineHeight: string };

/** Doc 02 §2. Hebrew display sits tighter than Latin: 0.96 here is not a typo. */
const LEVELS: Record<HeadingLevel, LevelSpec> = {
  1: { fontSize: "clamp(2.25rem, 1.37rem + 3.6vw, 4.25rem)", fontWeight: 800, lineHeight: "0.96" },
  2: { fontSize: "clamp(1.625rem, 1.24rem + 1.57vw, 2.5rem)", fontWeight: 700, lineHeight: "1.08" },
  3: { fontSize: "clamp(1.375rem, 1.21rem + 0.67vw, 1.75rem)", fontWeight: 700, lineHeight: "1.25" },
  4: { fontSize: "clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)", fontWeight: 600, lineHeight: "1.4" },
};

export type SectionHeadingProps = {
  children: React.ReactNode;
  level?: HeadingLevel;
  /** Type size, when the visual weight has to differ from the outline level. */
  size?: HeadingLevel;
  eyebrow?: React.ReactNode;
  /** The terminal voxel. `none` on any heading that ends in a mark or a price. */
  voxel?: VoxelTone | "none";
  /** The 64px turquoise rule. Doc 07 §5.9 draws it with the section entrance. */
  rule?: boolean;
  align?: "start" | "center";
  tone?: "primary" | "onInverse";
  id?: string;
  className?: string;
};

export function SectionHeading({
  children,
  level = 2,
  size,
  eyebrow,
  voxel = "turquoise",
  rule = false,
  align = "start",
  tone = "primary",
  id,
  className,
}: SectionHeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  const spec = LEVELS[size ?? level];

  const body =
    typeof children === "string" && voxel !== "none" ? (
      <VoxelTail tone={voxel}>{children}</VoxelTail>
    ) : (
      children
    );

  return (
    <div
      className={[
        "flex flex-col gap-3 [min-inline-size:0]",
        align === "center" ? "items-center text-center" : "items-start text-start",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow ? (
        <Eyebrow tone={tone === "onInverse" ? "onInverse" : "muted"}>{eyebrow}</Eyebrow>
      ) : null}

      <Tag
        id={id}
        className="text-balance font-[family-name:var(--font-rubik)] [min-inline-size:0]"
        style={{
          fontSize: spec.fontSize,
          fontWeight: spec.fontWeight,
          lineHeight: spec.lineHeight,
          letterSpacing: "0em",
          maxInlineSize: "24ch",
          color:
            tone === "onInverse" ? "var(--color-text-on-inverse)" : "var(--color-text-primary)",
        }}
      >
        {body}
      </Tag>

      {rule ? (
        <span
          aria-hidden="true"
          style={{
            display: "block",
            inlineSize: "4rem",
            blockSize: "3px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-turq-500)",
          }}
        />
      ) : null}
    </div>
  );
}

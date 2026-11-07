import * as React from "react";

import { bodyLines } from "./sections";

/**
 * Story prose.
 *
 * Every body field on this page is written as separate short sentences on separate
 * lines, and 09b treats that line break as part of the writing: `הם לא הכירו אותי` is
 * four words on their own line and that is the whole effect. So each line becomes its
 * own `<p>` rather than being joined into a block.
 *
 * 02 §2: Hebrew body is 17px at a line height of 1.75. Anything under 1.6 reads as a
 * wall, because the script is rectangular and has almost no internal white.
 */

export type StoryBodyProps = {
  bodyHe: string | undefined;
  /** `lead` is the opener, which is the one paragraph on the page set larger. */
  size?: "body" | "lead";
  tone?: "secondary" | "primary";
  maxInlineSize?: string;
  className?: string;
};

export function StoryBody({
  bodyHe,
  size = "body",
  tone = "secondary",
  maxInlineSize,
  className,
}: StoryBodyProps) {
  const lines = bodyLines(bodyHe);
  if (lines.length === 0) return null;

  return (
    <div
      className={["flex flex-col gap-2 [min-inline-size:0]", className].filter(Boolean).join(" ")}
      style={{
        fontFamily: "var(--font-assistant), system-ui, sans-serif",
        fontSize: size === "lead" ? "clamp(1.125rem, 1.07rem + 0.22vw, 1.25rem)" : "1.0625rem",
        lineHeight: size === "lead" ? 1.7 : 1.75,
        color:
          tone === "primary" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        maxInlineSize,
      }}
    >
      {lines.map((line, index) => (
        <p key={`${index}-${line.slice(0, 12)}`} className="text-pretty [min-inline-size:0]">
          {line}
        </p>
      ))}
    </div>
  );
}

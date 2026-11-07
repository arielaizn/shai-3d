import * as React from "react";

import { Voxel } from "./Voxel";

/**
 * Three facts under the hero. Doc 03 §3.2.
 *
 * No stars and no testimonials. Shai is at the beginning and there are no reviews to
 * quote, and inventing them would poison a site whose entire asset is that the story
 * is true. The gallery band is the social proof, because real printed objects
 * convince better than five drawn stars.
 *
 * The defaults are `siteSettings.trustStats`' locked values from doc 09c §3.2.
 * Doc 09c also flags the first one for Ariel: if the count of finished prints cannot
 * be defended, the line is replaced rather than rounded up.
 *
 * RESOLUTIONS §12: the row is a flex list whose items each carry
 * `min-inline-size: 0`. Without it a long Hebrew item refuses to shrink below its
 * content, the overflow leaves to the left in RTL, and the whole page gains a
 * horizontal scrollbar.
 */

export type TrustItem = { valueHe: string };

export const DEFAULT_TRUST_ITEMS: readonly TrustItem[] = [
  { valueHe: "40+ הדפסות שיצאו מהבית" },
  { valueHe: "מוכן תוך 3 ימים" },
  { valueHe: "איסוף עצמי או משלוח" },
] as const;

export type TrustRowProps = React.HTMLAttributes<HTMLUListElement> & {
  /** Exactly three items. Not two, not four. */
  items?: readonly TrustItem[];
  /** The hairline above the row. Off inside a panel that already has a divider. */
  rule?: boolean;
  tone?: "primary" | "onInverse";
};

export function TrustRow({
  items = DEFAULT_TRUST_ITEMS,
  rule = true,
  tone = "primary",
  className,
  style,
  ...rest
}: TrustRowProps) {
  return (
    <ul
      {...rest}
      className={[
        "flex flex-wrap items-center gap-x-5 gap-y-2 [min-inline-size:0]",
        "max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[scroll-snap-type:inline_mandatory]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        margin: 0,
        padding: 0,
        listStyle: "none",
        borderBlockStartWidth: rule ? "1px" : "0",
        borderBlockStartColor:
          tone === "onInverse"
            ? "color-mix(in oklab, var(--color-cream-50) 22%, transparent)"
            : "color-mix(in oklab, var(--color-ink-900) 10%, transparent)",
        paddingBlockStart: rule ? "0.875rem" : undefined,
        color: tone === "onInverse" ? "var(--color-text-on-inverse)" : "var(--color-text-secondary)",
        fontFamily: "var(--font-assistant), system-ui, sans-serif",
        ...style,
      }}
    >
      {items.map((item) => (
        <li
          key={item.valueHe}
          className="flex items-center gap-2 [min-inline-size:0] [scroll-snap-align:start]"
          style={{ fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.7 }}
        >
          <Voxel tone="turquoise" size="0.375rem" className="shrink-0" />
          <span className="[min-inline-size:0] whitespace-nowrap max-sm:text-[0.8125rem]">
            {item.valueHe}
          </span>
        </li>
      ))}
    </ul>
  );
}

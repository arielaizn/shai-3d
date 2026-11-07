"use client";

import { SHEKEL_UNIT, formatAgorot, formatAgorotDelta, spokenPrice } from "@/lib/format/price";

/**
 * A price inside the panel.
 *
 * The two rules it exists to keep, both from RESOLUTIONS:
 *
 * §18 — `45 ש״ח` is already correct in an RTL line. Only the DIGITS go inside the
 * `<bdi>`; isolating the whole string is what breaks it.
 *
 * §15 — `<bdi>` carries ARIA role `generic`, which is not allowed an accessible
 * name, so `aria-label` on it is dropped by every screen reader. The spoken form
 * therefore lives on a sibling sr-only element, and it says `שקל אחד` rather than
 * `1 שקלים`.
 *
 * `live` makes that element a polite live region, which is what the pricing lab
 * wants and what a static table row does not.
 */
export function Money({
  agorot,
  strong = false,
  big = false,
  announce = true,
  live = false,
  tone,
}: {
  agorot: number;
  strong?: boolean;
  big?: boolean;
  announce?: boolean;
  live?: boolean;
  tone?: "muted" | "red";
}) {
  return (
    <span
      className="a-num"
      style={{
        fontFamily: big ? "var(--font-rubik), system-ui, sans-serif" : undefined,
        fontSize: big ? "1.75rem" : undefined,
        fontWeight: big || strong ? 700 : undefined,
        lineHeight: big ? 1.15 : undefined,
        color:
          tone === "muted"
            ? "var(--admin-muted)"
            : tone === "red"
              ? "var(--admin-red-ink)"
              : undefined,
        minInlineSize: 0,
      }}
    >
      <span aria-hidden="true">
        <bdi dir="ltr">{formatAgorot(agorot)}</bdi> {SHEKEL_UNIT}
      </span>
      {announce ? (
        <span className="a-sr" role={live ? "status" : undefined}>
          {spokenPrice(agorot)}
        </span>
      ) : null}
    </span>
  );
}

/** A signed amount, for a breakdown row that takes money off. */
export function MoneySigned({ agorot }: { agorot: number }) {
  return (
    <span className="a-num" style={{ minInlineSize: 0 }}>
      <span aria-hidden="true">
        <bdi dir="ltr">{formatAgorotDelta(agorot)}</bdi> {SHEKEL_UNIT}
      </span>
      <span className="a-sr">{spokenPrice(agorot)}</span>
    </span>
  );
}

/**
 * The chip beside a changed price. 06 §C.12: turquoise when the price drops, red
 * when it rises, and both are facts rather than warnings, so neither carries an
 * alert role.
 */
export function DeltaChip({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const dir = percent > 0 ? "up" : percent < 0 ? "down" : "flat";
  const spoken =
    percent === 0
      ? "בלי שינוי"
      : percent > 0
        ? `יקר ב-${percent} אחוז`
        : `זול ב-${Math.abs(percent)} אחוז`;
  return (
    <span className="a-delta" data-dir={dir}>
      <span aria-hidden="true">
        <bdi dir="ltr">{`${percent > 0 ? "+" : ""}${percent}%`}</bdi>
      </span>
      <span className="a-sr">{spoken}</span>
    </span>
  );
}

"use client";

/**
 * src/components/generator/Bits.tsx
 *
 * The two price fragments more than one step needs, and the CSS the generator cannot
 * express as an inline style.
 */

import * as React from "react";

import { SHEKEL_UNIT, formatAgorot, spokenPrice } from "@/lib/format/price";

/* ------------------------------------------------------------------ */
/* a price inside a Hebrew sentence                                     */
/* ------------------------------------------------------------------ */

/**
 * A content string with a `{n}` in it, rendered with the price in place.
 *
 * RESOLUTIONS §18: `45 ש״ח` is already correct in an RTL run, and wrapping the whole
 * string in `dir="ltr"` is what breaks it. **Only the digits are isolated**, and the
 * Hebrew unit stays outside the `<bdi>` exactly as the template wrote it.
 *
 * RESOLUTIONS §15: `<bdi>` maps to role `generic`, which may not carry an accessible
 * name, so the spoken form lives on a sibling instead and the visible run is hidden
 * from the accessibility tree. `spokenPrice` says `שקל אחד` for one.
 */
export function TemplatedPrice({
  template,
  agorot,
  className,
  style,
}: {
  template: string;
  agorot: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const marker = "{n}";
  const at = template.indexOf(marker);
  const before = at === -1 ? "" : template.slice(0, at);
  const after = at === -1 ? "" : template.slice(at + marker.length);

  return (
    <span className={className} style={style}>
      <span aria-hidden="true">
        {before}
        <bdi dir="ltr" className="tabular-nums">
          {formatAgorot(agorot)}
        </bdi>
        {after}
      </span>
      <span className="sr-only">{`${before}${spokenPrice(agorot)}`}</span>
    </span>
  );
}

/** Digits plus the unit, with only the digits isolated. Used inside the price tag. */
export function PriceDigits({
  agorot,
  unitSize,
  unitWeight = 800,
}: {
  agorot: number;
  unitSize: string;
  unitWeight?: number;
}) {
  return (
    <span aria-hidden="true" className="tabular-nums">
      <bdi dir="ltr" className="tabular-nums">
        {formatAgorot(agorot)}
      </bdi>{" "}
      <span style={{ fontSize: unitSize, fontWeight: unitWeight }}>{SHEKEL_UNIT}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* the stylesheet                                                       */
/* ------------------------------------------------------------------ */

/**
 * The rules that need a pseudo-class or a keyframe, which an inline style cannot
 * carry. They are scoped to `g-` class names so nothing here can reach the rest of
 * the site, and they use the same focus tokens as `globals.css`.
 *
 * The focus ring is ink with a cream inner ring, per RESOLUTIONS §11. It is drawn on
 * the card rather than on the visually hidden `<input>` inside it, because the input
 * is the accessible control and the card is what a person sees.
 */
export function GeneratorStyles() {
  return (
    <style>{`
.g-focus:has(:focus-visible) {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-focus-gap), 0 0 0 9px color-mix(in oklab, var(--color-focus-halo) 55%, transparent);
}
.g-disclosure {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 260ms var(--ease-out-soft);
}
.g-disclosure[data-open="true"] { grid-template-rows: 1fr; }
.g-disclosure > * { overflow: hidden; min-inline-size: 0; }
@keyframes g-row-in { from { transform: scaleX(0.2); opacity: 0 } to { transform: scaleX(1); opacity: 1 } }
@keyframes g-spark { from { transform: translateY(0) scale(1); opacity: .9 } to { transform: translateY(-6px) scale(0); opacity: 0 } }
@media (prefers-reduced-motion: reduce) {
  .g-disclosure { transition-duration: 0.01ms; }
}
`}</style>
  );
}

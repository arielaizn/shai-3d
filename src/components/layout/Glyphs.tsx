import * as React from "react";

/**
 * The icon set, doc 03 §0.1: inline SVG only, 16x16 by default, `currentColor`
 * strokes at 1.75px. No emoji and no icon font ships anywhere on this site, and the
 * glyphs in the wireframes (☰ ✕ ▸ ●) are notation for these components, never
 * characters that reach the page.
 */

type GlyphProps = { size?: number; className?: string };

function box(size: number) {
  return { width: size, height: size, viewBox: "0 0 16 16" } as const;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function MenuGlyph({ size = 20, className }: GlyphProps) {
  return (
    <svg {...box(size)} aria-hidden="true" focusable="false" className={className}>
      <path {...STROKE} d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}

export function CloseGlyph({ size = 20, className }: GlyphProps) {
  return (
    <svg {...box(size)} aria-hidden="true" focusable="false" className={className}>
      <path {...STROKE} d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/**
 * Authored pointing to the **end** edge of an RTL line, which is where a Hebrew line
 * advances. Doc 03 §3.6 flips it with `rtl:-scale-x-100` where the same component has
 * to serve both directions; this site is RTL only, so it points left as drawn.
 */
export function ChevronGlyph({ size = 18, className }: GlyphProps) {
  return (
    <svg {...box(size)} aria-hidden="true" focusable="false" className={className}>
      <path {...STROKE} d="M10 3.5L5.5 8l4.5 4.5" />
    </svg>
  );
}

/** The pause and play pair for the gallery marquee, doc 03 §3.5 and WCAG 2.2.2. */
export function PauseGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...box(size)} aria-hidden="true" focusable="false" className={className}>
      <path {...STROKE} d="M6 3.5v9M10 3.5v9" />
    </svg>
  );
}

export function PlayGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...box(size)} aria-hidden="true" focusable="false" className={className}>
      <path {...STROKE} d="M5.5 3.5l7 4.5-7 4.5z" />
    </svg>
  );
}

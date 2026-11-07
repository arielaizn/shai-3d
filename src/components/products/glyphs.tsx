import * as React from "react";

import { LOOP } from "@/lib/design/motion";

/**
 * The glyphs the catalogue and the product page need and `layout/Glyphs.tsx` does not
 * carry. Doc 03 §0.1: 16x16 box, `currentColor`, 1.75px strokes, no fills except where
 * the shape is the object.
 */

export type GlyphProps = { size?: number; className?: string };

/**
 * The spinning cube, doc 03 §4.4. It marks a product that can really be orbited, and
 * the rotation is the whole point: a badge that turns reads as "this one spins" from
 * across the grid, before anyone has read the label.
 *
 * `LOOP.cube` is 6000ms and `linear`, because doc 07 §5.10 forbids easing on an
 * infinite loop: any curve pulses at the seam. Under `prefers-reduced-motion` the
 * animation is simply never applied and the cube sits at its three-quarter view,
 * which is the drawn geometry, so nothing has to be frozen at a keyframe.
 *
 * React 19 hoists and deduplicates `<style href precedence>`, so twelve badges in a
 * grid still ship one rule. Same mechanism the gallery marquee already uses.
 */
export function CubeGlyph({ size = 12, className }: GlyphProps) {
  return (
    <>
      <style href="product-cube-spin" precedence="default">{`
        @keyframes product-cube-spin {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
        .product-cube {
          animation: product-cube-spin ${LOOP.cube}ms linear infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .product-cube { animation: none; }
        }
      `}</style>
      <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        className={["product-cube inline-block", className].filter(Boolean).join(" ")}
      >
        {/* an isometric cube: top face, then the two visible sides */}
        <path d="M8 1.6 14 5 8 8.4 2 5Z" fill="currentColor" opacity="0.55" />
        <path d="M2 5v6l6 3.4V8.4Z" fill="currentColor" opacity="0.85" />
        <path d="M14 5v6l-6 3.4V8.4Z" fill="currentColor" />
      </svg>
    </>
  );
}

/** The card's forward arrow. RTL only, so forward is left and the path is drawn left. */
export function ArrowGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M13 8H3.5M7 3.5 3 8l4 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The filter trigger. Three sliders, because a funnel reads as a spreadsheet. */
export function SlidersGlyph({ size = 18, className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M3 6h14M3 10h14M3 14h14" />
      </g>
      <g fill="currentColor">
        <circle cx="7" cy="6" r="2.1" />
        <circle cx="13" cy="10" r="2.1" />
        <circle cx="6" cy="14" r="2.1" />
      </g>
    </svg>
  );
}

export function MinusGlyph({ size = 18, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path d="M5 10h10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusGlyph({ size = 18, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path d="M5 10h10M10 5v10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** `לחזור להתחלה` on the viewer: a circular arrow that closes back on itself. */
export function ResetGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path
        d="M13.2 8a5.2 5.2 0 1 1-1.9-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M13.4 1.6v3h-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The drag hint next to `לגרור כדי לסובב`. */
export function DragGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <ellipse cx="8" cy="8" rx="6.2" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.4 4.2 3.6 5.6l1.9 1.2M10.6 11.8l1.8-1.4-1.9-1.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

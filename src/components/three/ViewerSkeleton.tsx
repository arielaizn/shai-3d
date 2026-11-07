"use client";

/**
 * src/components/three/ViewerSkeleton.tsx
 *
 * Doc 05 §D.6. The small print head, used wherever the 3D layer is being fetched or
 * built.
 *
 * It is pure SVG on purpose. It runs while the three chunk is still downloading and
 * before any canvas has a context, and it has to keep running if the GPU path fails
 * outright, so it can hold no dependency on WebGL, on drei, or on the generator's
 * larger `PrintBuildAnimation`.
 *
 * One loading language across the whole site: a little red print head sweeps and rows
 * stack up under it. The full-size variant with the visitor's own photo in their own
 * filament colours belongs to the generator and is not this component's job.
 *
 * Reduced motion is handled by the global rule in `globals.css`, which collapses every
 * animation to 0.01ms. The rows are still there, the sweep just stops.
 */

import * as React from "react";

import { LOADING } from "@/content/errors";

export type ViewerSkeletonProps = {
  /** The polite status message. Defaults to the site's `טוען תוכן`. */
  label?: string;
  /** `sm` is 90x70 and head-only. `md` adds the bed and a fuller stack. */
  size?: "sm" | "md";
  className?: string;
};

const ROWS = 6;

export function ViewerSkeleton({ label, size = "md", className }: ViewerSkeletonProps) {
  const width = size === "sm" ? 90 : 160;
  const height = size === "sm" ? 70 : 124;

  return (
    <div
      className={["flex flex-col items-center justify-center gap-3 [min-inline-size:0]", className]
        .filter(Boolean)
        .join(" ")}
      data-motion="essential"
    >
      <style>{SWEEP_CSS}</style>

      <svg
        aria-hidden="true"
        viewBox="0 0 160 124"
        width={width}
        height={height}
        role="presentation"
        focusable="false"
      >
        {/* the bed */}
        <rect
          x="12"
          y="104"
          width="136"
          height="10"
          rx="5"
          fill="var(--color-cream-300)"
        />
        <rect x="12" y="116" width="136" height="2" rx="1" fill="var(--color-ink-900)" opacity="0.12" />

        {/* the stack, rising out of the bed */}
        <g>
          {Array.from({ length: ROWS }, (_, index) => (
            <rect
              key={index}
              className="shai-row"
              x={44 + (index % 2) * 3}
              y={98 - index * 7}
              width={72 - (index % 3) * 8}
              height="5"
              rx="2.5"
              fill={index % 2 === 0 ? "var(--color-turq-400)" : "var(--color-red-400)"}
              style={{ animationDelay: `${index * 180}ms` }}
            />
          ))}
        </g>

        {/* the print head, deliberately the one a kid draws */}
        <g className="shai-head">
          <rect
            x="63"
            y="18"
            width="34"
            height="26"
            rx="7"
            fill="var(--color-red-500)"
            stroke="var(--color-ink-900)"
            strokeOpacity="0.18"
            strokeWidth="2"
          />
          <path d="M76 44 L84 44 L80 51 Z" fill="var(--color-turq-500)" />
        </g>
      </svg>

      <p role="status" className="sr-only">
        {label ?? LOADING.aria}
      </p>
    </div>
  );
}

/**
 * Local keyframes. `globals.css` owns the theme's three animations and is not this
 * component's file to edit, and a loader that only ever appears inside the viewer
 * should not add a fourth global name.
 */
const SWEEP_CSS = `
.shai-head { animation: shai-head-sweep 900ms cubic-bezier(0.42,0,0.58,1) infinite alternate; }
.shai-row { transform-origin: center; animation: shai-row-rise 1400ms cubic-bezier(0.22,1,0.36,1) infinite; }
@keyframes shai-head-sweep {
  from { transform: translateX(-34px); }
  to   { transform: translateX(34px); }
}
@keyframes shai-row-rise {
  0%   { opacity: 0; transform: scaleX(0.2); }
  22%  { opacity: 1; transform: scaleX(1); }
  86%  { opacity: 1; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(1); }
}
`;

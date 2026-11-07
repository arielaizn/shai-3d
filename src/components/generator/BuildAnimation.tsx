"use client";

/**
 * src/components/generator/BuildAnimation.tsx
 *
 * The wait state, doc 05 PART D. A spinner says "the computer is busy". This says
 * "a machine is building your thing", and it is the second most emotional beat on the
 * site after the price.
 *
 * **The stack is the visitor's own photo.** The rows are measured in `photo.ts` while
 * the upload is being prepared: how wide the subject is at that height, where it sits,
 * and how light it is. Each row is drawn at that width, at that offset, in whichever
 * of the filaments the visitor chose prints at that brightness. So they watch their
 * picture rise out of a print bed in their own colours, which is the thing the
 * generator is actually selling.
 *
 * **No percentage.** A percentage over a job with a decode, a mesh build and a first
 * frame is a number somebody invented, and the visitor watches it stall at 80. The
 * four lines from `GENERATOR.wait.lines` name real stages instead.
 *
 * It is SVG and CSS, with no WebGL and no animation library, because it runs *before*
 * the canvas has a context and it has to keep running if the GPU path never arrives.
 */

import * as React from "react";

import { GENERATOR } from "@/content/generator";
import { relativeLuminance } from "@/lib/three/geometry/colorMapping";

import { useReducedMotion } from "./hooks";
import { BED_ROWS } from "./photo";
import type { BedRow } from "./types";

/** 09c: four lines, 550ms each, which is also the 2200ms floor the wait state holds. */
const LINE_MS = 550;
/** The same twenty rows `photo.ts` measures out of the visitor's picture. */
const ROWS = BED_ROWS;

const BED_W = 300;
const BED_H = 250;
const MARGIN = 18;
const ROW_H = 8;

export type BuildAnimationProps = {
  rows: BedRow[];
  /** The chosen filaments, in the order they were picked. */
  hexes: string[];
  /** How long the build is expected to take. The rows are paced to fill it. */
  durationMs: number;
};

export function BuildAnimation({ rows, hexes, durationMs }: BuildAnimationProps) {
  const reduced = useReducedMotion();
  const [built, setBuilt] = React.useState(0);
  const [line, setLine] = React.useState(0);

  const perRow = Math.max(60, Math.round(durationMs / ROWS));

  React.useEffect(() => {
    setBuilt(0);
    const timer = window.setInterval(() => {
      setBuilt((count) => (count >= ROWS ? count : count + 1));
    }, perRow);
    return () => window.clearInterval(timer);
  }, [perRow]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setLine((index) => (index + 1) % GENERATOR.wait.lines.length);
    }, LINE_MS);
    return () => window.clearInterval(timer);
  }, []);

  /* Dark filament prints where the picture is dark. Sorting by luminance is what
     `src/lib/three/geometry/colorMapping.ts` does for the real mesh, so the wait
     state and the model agree about which colour lands where. */
  const palette = React.useMemo(() => {
    const usable = hexes.length > 0 ? hexes : ["#E8D2B3"];
    return [...usable].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  }, [hexes]);

  const shape: BedRow[] =
    rows.length === ROWS
      ? rows
      : Array.from({ length: ROWS }, (_, index) => ({
          // a generic rounded silhouette, used until the photo has been measured
          width: 0.55 + 0.3 * Math.sin((index / ROWS) * Math.PI),
          offset: 0,
          luma: 0.5,
        }));

  const headSide = built % 2 === 0 ? 0 : 1;
  const headX = MARGIN + headSide * (BED_W - 2 * MARGIN - 40);
  const stackTop = BED_H - 30 - built * ROW_H;

  return (
    <div className="flex flex-col items-center gap-4 [min-inline-size:0]">
      <p className="sr-only" role="status">
        {GENERATOR.wait.aria}
      </p>

      <svg
        viewBox={`0 0 ${BED_W} ${BED_H}`}
        role="img"
        aria-label={GENERATOR.wait.heading}
        className="w-full"
        style={{ maxInlineSize: "20rem" }}
      >
        {/* the frame line under the bed */}
        <rect
          x={MARGIN - 8}
          y={BED_H - 26}
          width={BED_W - 2 * (MARGIN - 8)}
          height="12"
          rx="6"
          fill="var(--color-cream-300)"
        />
        <rect
          x={MARGIN - 8}
          y={BED_H - 12}
          width={BED_W - 2 * (MARGIN - 8)}
          height="3"
          rx="1.5"
          fill="color-mix(in oklab, var(--color-ink-900) 12%, transparent)"
        />

        {/* the stack */}
        {shape.slice(0, built).map((row, index) => {
          const usableWidth = BED_W - 2 * MARGIN;
          const width = Math.max(10, row.width * usableWidth);
          const x = MARGIN + Math.min(row.offset * usableWidth, usableWidth - width);
          const y = BED_H - 30 - (index + 1) * ROW_H;
          const band = Math.min(
            palette.length - 1,
            Math.floor((1 - row.luma) * palette.length),
          );

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={width}
              height={ROW_H - 1.5}
              rx="2"
              fill={palette[band]}
              style={
                reduced
                  ? undefined
                  : {
                      transformBox: "fill-box",
                      transformOrigin: index % 2 === 0 ? "left center" : "right center",
                      animation: "g-row-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
                    }
              }
            />
          );
        })}

        {/* the gantry and the print head, which reduced motion removes entirely */}
        {reduced ? null : (
          <g style={{ transition: `transform ${perRow}ms cubic-bezier(0.42,0,0.58,1)` }}>
            <line
              x1={MARGIN - 8}
              y1={stackTop - 14}
              x2={BED_W - MARGIN + 8}
              y2={stackTop - 14}
              stroke="color-mix(in oklab, var(--color-ink-900) 22%, transparent)"
              strokeWidth="1"
            />
            <g
              style={{
                transform: `translate(${headX}px, ${stackTop - 40}px)`,
                transition: `transform ${perRow}ms cubic-bezier(0.42,0,0.58,1)`,
              }}
            >
              <path d="M2 0h36l-4 22H6z" fill="var(--color-red-500)" />
              <path d="M17 22h6l-3 6z" fill="var(--color-turq-500)" />
              <circle
                cx="20"
                cy="30"
                r="3"
                fill="var(--color-yellow-400)"
                style={{ animation: "g-spark 200ms ease-out infinite" }}
              />
            </g>
          </g>
        )}
      </svg>

      <div className="flex flex-col items-center gap-1 text-center [min-inline-size:0]">
        <p
          className="font-[family-name:var(--font-rubik)]"
          style={{ fontSize: "1.125rem", fontWeight: 800 }}
        >
          {GENERATOR.wait.heading}
        </p>
        <p
          aria-hidden="true"
          style={{ fontSize: "0.9375rem", color: "var(--color-text-muted)", minBlockSize: "1.5rem" }}
        >
          {GENERATOR.wait.lines[line]}
        </p>
      </div>
    </div>
  );
}

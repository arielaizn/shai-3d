"use client";

/**
 * src/components/three/ViewerChrome.tsx
 *
 * The overlay on the canvas: reset, zoom, the drag hint and the keyboard help line.
 *
 * Doc 05 §A.7. The zoom buttons exist because zoom is gated to two pointers, which is
 * what stops the mouse wheel from swallowing the page scroll. That gate leaves a
 * desktop visitor with no way to get closer, and these two buttons are it. Each press
 * is 12% of the current distance, animated, which is why they are here rather than in
 * the page around the canvas.
 *
 * The hint chip fades out on the first interaction and never comes back. A hint that
 * returns is a hint that was not read.
 *
 * Every control is 44px, which is the site's touch-target floor, and every one of them
 * takes the ink focus ring from `globals.css`. RESOLUTIONS §11: the ring is never
 * turquoise, which measures 2.16:1 on cream against a 3:1 requirement.
 */

import * as React from "react";

import { DURATION, EASE } from "@/lib/design/motion";
import { ORBIT } from "@/lib/three/constants";

import { VIEWER_COPY } from "./copy";
import type { ViewerHandleRef } from "./types";

export type ViewerChromeProps = {
  handleRef: ViewerHandleRef;
  /** False until the scene chunk has mounted and filled the handle. */
  ready: boolean;
  /** `PRODUCT.viewer.dragHint`, or the magnet's own line. */
  hintHe?: string;
  showHint: boolean;
  /** The reset button's label. `לחזור להתחלה` in both content modules. */
  resetLabel: string;
  /** Shown once the wrapper has taken keyboard focus, and never on a touch tap. */
  showKeyboardHelp?: boolean;
  tone?: "onCream" | "onStage";
  /** The lights-off switch slots in here on the generator. */
  children?: React.ReactNode;
  className?: string;
};

export function ViewerChrome({
  handleRef,
  ready,
  hintHe,
  showHint,
  resetLabel,
  showKeyboardHelp = false,
  tone = "onCream",
  children,
  className,
}: ViewerChromeProps) {
  const onStage = tone === "onStage";

  const press = (action: (handle: NonNullable<ViewerHandleRef["current"]>) => void) => () => {
    const handle = handleRef.current;
    if (handle) action(handle);
  };

  return (
    <div
      className={["pointer-events-none absolute inset-0 [min-inline-size:0]", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-auto absolute bottom-3 start-3 flex items-center gap-2">
        <RoundButton
          onStage={onStage}
          disabled={!ready}
          label={resetLabel}
          onClick={press((handle) => handle.reset())}
        >
          <ResetGlyph />
        </RoundButton>
        <RoundButton
          onStage={onStage}
          disabled={!ready}
          label={VIEWER_COPY.zoomIn}
          onClick={press((handle) => handle.dolly(1 - ORBIT.buttonDollyStep))}
        >
          <PlusGlyph />
        </RoundButton>
        <RoundButton
          onStage={onStage}
          disabled={!ready}
          label={VIEWER_COPY.zoomOut}
          onClick={press((handle) => handle.dolly(1 + ORBIT.buttonDollyStep))}
        >
          <MinusGlyph />
        </RoundButton>
      </div>

      {children ? (
        <div className="pointer-events-auto absolute bottom-3 end-3">{children}</div>
      ) : null}

      {hintHe ? (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 start-1/2 m-0 -translate-x-1/2 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold"
          data-motion="decorative"
          style={{
            backgroundColor: "color-mix(in oklab, var(--color-ink-900) 82%, transparent)",
            color: "var(--color-cream-50)",
            opacity: showHint ? 1 : 0,
            transition: `opacity ${DURATION.d5}ms ${EASE.outSoft}`,
            visibility: showHint ? "visible" : "hidden",
          }}
        >
          {hintHe}
        </p>
      ) : null}

      <p
        aria-hidden="true"
        className="pointer-events-none absolute top-3 start-1/2 m-0 -translate-x-1/2 rounded-full px-3 py-1 text-[0.75rem]"
        style={{
          backgroundColor: onStage
            ? "color-mix(in oklab, var(--color-stage-900) 88%, transparent)"
            : "color-mix(in oklab, var(--color-cream-50) 92%, transparent)",
          color: onStage ? "var(--color-text-stage-muted)" : "var(--color-text-muted)",
          opacity: showKeyboardHelp ? 1 : 0,
          transition: `opacity ${DURATION.d2}ms ${EASE.outSoft}`,
          visibility: showKeyboardHelp ? "visible" : "hidden",
        }}
      >
        {VIEWER_COPY.keyboardHelp}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- the buttons */

function RoundButton({
  children,
  label,
  onClick,
  disabled,
  onStage,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  onStage: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-tap place-items-center rounded-full transition-[transform,box-shadow] active:translate-y-1"
      style={{
        backgroundColor: onStage ? "var(--color-stage-700)" : "var(--color-cream-50)",
        color: onStage ? "var(--color-cream-50)" : "var(--color-ink-900)",
        border: `2px solid ${onStage ? "var(--color-stage-600)" : "var(--color-ink-900)"}`,
        boxShadow: onStage ? "none" : "var(--shadow-pop)",
        opacity: disabled ? 0.45 : 1,
        transitionDuration: `${DURATION.d1}ms`,
        transitionTimingFunction: EASE.outSoft,
      }}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- the glyphs */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ResetGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M16 10a6 6 0 1 1-1.8-4.3" />
      <path {...STROKE} d="M16 3v3.4h-3.4" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

function MinusGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path {...STROKE} d="M4.5 10h11" />
    </svg>
  );
}

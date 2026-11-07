"use client";

/**
 * src/components/three/ViewerFallback.tsx
 *
 * Doc 05 §A.6, the two lower rungs of the ladder.
 *
 *   `turntable`  a 24-frame sprite sheet, dragged with a finger or the arrow keys
 *   `poster`     one still, and a button that upgrades to the turntable on demand
 *
 * Neither rung is an error screen. Both keep the page orderable with a live price,
 * which is the whole reason the ladder exists: a viewer that shows a black box costs
 * a lead, and a device that cannot run WebGL is still a customer.
 *
 * The turntable costs zero JavaScript per frame. It is one `background-position` step
 * on one element, which works on any layout engine that can draw a background image,
 * and it still spins, which is the thing the visitor wanted.
 *
 * RESOLUTIONS §16: the wrapper is the focusable element and it is a `group` with a
 * Hebrew name. The image itself is `aria-hidden`, because a focusable `role="img"`
 * collapses in the accessibility tree and takes every keyboard affordance with it.
 */

import Image from "next/image";
import * as React from "react";

import { Button } from "@/components/ui/Button";

import { VIEWER_COPY, fill } from "./copy";

export type ViewerFallbackProps = {
  mode: "turntable" | "poster";
  posterSrc: string;
  /** Hebrew alt text. Doc 08 carries one per asset. */
  altHe: string;
  /** Used in the accessible name so a screen reader hears which piece this is. */
  nameHe?: string;
  /** 2304x1536 WebP, 6 columns by 4 rows of 384px tiles. */
  spriteSrc?: string;
  spriteColumns?: number;
  spriteRows?: number;
  /** The honest line under the frame. `PRODUCT.viewer.noWebgl` and friends. */
  noteHe?: string;
  /** Poster rung only. Without it the poster stands on its own. */
  onUpgrade?: () => void;
  className?: string;
};

/** Doc 05 §A.7. 14px of drag is one frame, which matches the 0.62 orbit speed. */
const PX_PER_FRAME = 14;

export function ViewerFallback({
  mode,
  posterSrc,
  altHe,
  nameHe,
  spriteSrc,
  spriteColumns = 6,
  spriteRows = 4,
  noteHe,
  onUpgrade,
  className,
}: ViewerFallbackProps) {
  const frames = spriteColumns * spriteRows;
  const helpId = React.useId();
  const [frame, setFrame] = React.useState(0);
  const dragRef = React.useRef<{ x: number; frame: number } | null>(null);

  const label = nameHe
    ? fill(VIEWER_COPY.groupLabelNamed, { name: nameHe })
    : VIEWER_COPY.groupLabel;

  const step = React.useCallback(
    (delta: number) => setFrame((current) => (current + delta + frames * 8) % frames),
    [frames],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, frame };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    const moved = Math.round((event.clientX - start.x) / PX_PER_FRAME);
    setFrame(((start.frame - moved) % frames + frames) % frames);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Right and left are mirrored in RTL only for reading order; the model turns the
    // way the key points, which is what a hand expects.
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setFrame(0);
    }
  };

  if (mode === "turntable" && spriteSrc) {
    const column = frame % spriteColumns;
    const row = Math.floor(frame / spriteColumns);
    return (
      <figure className={["m-0 flex flex-col gap-3 [min-inline-size:0]", className].filter(Boolean).join(" ")}>
        <div
          role="group"
          tabIndex={0}
          aria-label={label}
          aria-describedby={helpId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="relative w-full overflow-hidden rounded-[var(--radius-xl)] [min-inline-size:0]"
          style={{
            aspectRatio: "1 / 1",
            // Doc 05 §A.7: the drag owns the horizontal axis, the page keeps the
            // vertical one. A sprite sheet has no vertical gesture to protect.
            touchAction: "pan-y",
            cursor: "ew-resize",
            backgroundImage: `url(${spriteSrc})`,
            backgroundSize: `${spriteColumns * 100}% ${spriteRows * 100}%`,
            backgroundPosition: `${(column / (spriteColumns - 1)) * 100}% ${(row / (spriteRows - 1)) * 100}%`,
            backgroundRepeat: "no-repeat",
            backgroundColor: "var(--color-cream-200)",
          }}
        />
        <p id={helpId} className="sr-only">
          {VIEWER_COPY.turntableAria}
        </p>
        {noteHe ? <Note>{noteHe}</Note> : null}
      </figure>
    );
  }

  return (
    <figure className={["m-0 flex flex-col gap-3 [min-inline-size:0]", className].filter(Boolean).join(" ")}>
      <div
        className="relative w-full overflow-hidden rounded-[var(--radius-xl)] [min-inline-size:0]"
        style={{ aspectRatio: "1 / 1", backgroundColor: "var(--color-cream-200)" }}
      >
        <Image
          src={posterSrc}
          alt={altHe}
          fill
          sizes="(max-width: 767px) 92vw, 560px"
          style={{ objectFit: "contain" }}
        />
      </div>

      {noteHe ? <Note>{noteHe}</Note> : null}

      {onUpgrade && spriteSrc ? (
        <div className="flex justify-center">
          <Button variant="play" size="sm" onClick={onUpgrade}>
            {VIEWER_COPY.turntableUpgrade}
          </Button>
        </div>
      ) : null}
    </figure>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <figcaption
      className="text-[0.8125rem] leading-6 [min-inline-size:0]"
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </figcaption>
  );
}

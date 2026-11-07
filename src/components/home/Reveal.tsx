"use client";

import * as React from "react";

import { DURATION, EASE, STAGGER, prefersReducedMotion } from "@/lib/design/motion";

/**
 * `layer-rise`, doc 07 §5.2. The site's only scroll entrance.
 *
 * A cover painted in the section's own ground colour translates up and out of the
 * block, uncovering the content from the bottom edge upward, the way a print bed
 * builds an object. The content underneath is opaque and fully painted the whole
 * time, so nothing ever fades and nothing is ever unreadable mid-entrance.
 *
 * Both animated properties are transforms, so the entrance is composited and costs
 * zero repaints. That is why it is a cover and not a `clip-path` inset, which is not
 * reliably composited in Android WebView and repaints the block every frame.
 *
 * Thresholds, doc 07 §6.2: `rootMargin: 0px 0px -12% 0px`, threshold 0.25, dropping
 * to 0.15 on viewports under 700px tall. Blocks already on screen at first paint do
 * not animate at all, and doc 07 §6.3 forbids re-animation: the observer unobserves
 * on the first hit and `data-revealed` survives a remount.
 *
 * Doc 07 §12.2 Tier A: under `prefers-reduced-motion` the block is simply present.
 *
 * [deviation, flagged in the return: doc 07 §5.2 files this at
 * `src/components/motion/Reveal.tsx`. It lives here to stay inside the home page's
 * file ownership; move it when a second page needs it.]
 */

export type RevealCover = "cream" | "sunken" | "inverse" | "red" | "none";
export type RevealStagger = "editorial" | "grid" | "none";

const COVERS: Record<RevealCover, string> = {
  cream: "var(--color-cream-100)",
  sunken: "var(--color-surface-sunken)",
  inverse: "var(--color-ink-900)",
  red: "var(--color-red-500)",
  none: "transparent",
};

type CssVars = React.CSSProperties & Record<string, string | number>;

export type RevealProps = {
  children: React.ReactNode;
  as?: "section" | "div" | "li" | "article";
  cover?: RevealCover;
  /** Position in a staggered group. Multiplied by the group's interval. */
  index?: number;
  stagger?: RevealStagger;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
};

function staggerDelay(kind: RevealStagger, index: number): number {
  if (kind === "none") return 0;
  if (kind === "grid") return Math.min(index, STAGGER.gridCap) * STAGGER.grid;
  return Math.min(index, STAGGER.editorialCap) * STAGGER.editorial;
}

export function Reveal({
  children,
  as = "div",
  cover = "cream",
  index = 0,
  stagger = "none",
  className,
  style,
  id,
}: RevealProps) {
  // `as` is always an intrinsic tag, so casting the ref to one element type is
  // sound and keeps the JSX honest without a generic polymorphic component.
  const Tag = as as "div";
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    // doc 07 §6.3: a remount does not replay an entrance the visitor already saw
    if (node.dataset.revealed === "true") {
      setRevealed(true);
      return;
    }

    const short = window.innerHeight < 700;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          node.dataset.revealed = "true";
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: short ? 0.15 : 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const delay = staggerDelay(stagger, index);
  const vars: CssVars = {
    ...style,
    "--reveal-cover": COVERS[cover],
  };

  return (
    <Tag
      ref={ref}
      id={id}
      data-motion="state"
      className={["relative [overflow:clip] [min-inline-size:0]", className]
        .filter(Boolean)
        .join(" ")}
      style={vars}
    >
      <div
        className="[min-inline-size:0]"
        style={{
          transform: revealed ? "translateY(0) scale(1)" : "translateY(10px) scale(0.985)",
          transition: `transform ${DURATION.d6}ms ${EASE.outSoft} ${delay}ms`,
          willChange: revealed ? undefined : "transform",
        }}
      >
        {children}
      </div>

      {cover === "none" ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            backgroundColor: "var(--reveal-cover)",
            transform: revealed ? "translateY(-101%)" : "translateY(0)",
            transition: `transform ${DURATION.d6}ms ${EASE.outSoft} ${delay}ms`,
            visibility: revealed ? "hidden" : "visible",
            transitionProperty: "transform, visibility",
            transitionDelay: `${delay}ms, ${delay + DURATION.d6}ms`,
          }}
        />
      )}
    </Tag>
  );
}

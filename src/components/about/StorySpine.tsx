"use client";

import * as React from "react";

import { prefersReducedMotion } from "@/lib/design/motion";

import { SPINE_VARS } from "./sections";

/**
 * The rail, 09 §8.
 *
 * The only element on the page that says "this happened over time", which is why it
 * stays thin and quiet: a 2px dashed turquoise line at 45% alpha, with the printed
 * voxel as its marker. Dashed and not solid, because a solid rule reads as a CV
 * timeline.
 *
 * **It draws with the scroll.** The line is a repeating gradient painted into a
 * background box whose height is `--spine-progress`. Growing a background box keeps
 * the 6px dashes at 6px; a `scaleY` on a dashed border stretches every dash into a
 * smear, and a `clip-path` inset is not reliably composited in Android WebView, which
 * is where most of this traffic reads the page.
 *
 * **Cost.** One `getBoundingClientRect` and one custom-property write per animation
 * frame, on a 2px-wide element, and only while the story is anywhere near the
 * viewport: an `IntersectionObserver` attaches and detaches the scroll listener, so a
 * reader sitting in the closing band pays nothing.
 *
 * Reduced motion draws it in full immediately, per 09 §11. With no JavaScript at all
 * the `<noscript>` rule does the same, so the rail is never a blank column.
 *
 * The rail is `aria-hidden`. The reading order a screen reader gets is the `h3` of
 * each section in DOM order, and each timeline label rides inside its own `h3` so it
 * is announced rather than lost as decoration.
 */

/** Where on the screen the line is "now". 62% down reads as the eye's reading line. */
const READING_LINE = 0.62;

export function StorySpine({ children }: { children: React.ReactNode }) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const railRef = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    const frame = frameRef.current;
    const rail = railRef.current;
    if (!frame || !rail) return;

    // 09 §11, and 07 §12.2 tier A: an unrequested decorative draw is not performed.
    if (prefersReducedMotion()) {
      rail.style.setProperty("--spine-progress", "100%");
      return;
    }

    let queued = false;
    let alive = true;

    // arrow functions, not declarations: a hoisted `function` does not see the
    // narrowing that just proved `frame` and `rail` are not null
    const measure = () => {
      queued = false;
      if (!alive) return;
      const rect = frame.getBoundingClientRect();
      const anchor = window.innerHeight * READING_LINE;
      const raw = rect.height === 0 ? 1 : (anchor - rect.top) / rect.height;
      const progress = Math.min(1, Math.max(0, raw));
      rail.style.setProperty("--spine-progress", `${(progress * 100).toFixed(2)}%`);
    };

    const request = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(measure);
    };

    let listening = false;
    const attach = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("scroll", request, { passive: true });
      window.addEventListener("resize", request);
    };
    const detach = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") {
      attach();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) attach();
            else detach();
          }
          // one last measurement on the way out, so the line is left full rather than
          // frozen at 96% when the reader scrolls past it in a single flick
          request();
        },
        { rootMargin: "25% 0px 25% 0px" },
      );
      observer.observe(frame);
    }

    request();

    return () => {
      alive = false;
      detach();
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className={`relative flex flex-col gap-12 md:gap-16 [min-inline-size:0] ${SPINE_VARS}`}
    >
      <span
        ref={railRef}
        data-spine="rail"
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          insetBlock: 0,
          insetInlineStart: "var(--rail-x)",
          inlineSize: "2px",
          backgroundImage:
            "repeating-linear-gradient(to bottom, color-mix(in oklab, var(--color-turq-500) 45%, transparent) 0 6px, transparent 6px 12px)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top center",
          backgroundSize: "2px var(--spine-progress, 0%)",
        }}
      />
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: "[data-spine=rail]{--spine-progress:100%}" }} />
      </noscript>
      {children}
    </div>
  );
}

/**
 * The marker. The same voxel as the overline bullet and the heading terminator, so
 * the rail speaks the language the rest of the site already speaks.
 */
export function SpineMarker({ tone }: { tone: "turquoise" | "yellow" | "red" }) {
  const fill =
    tone === "yellow"
      ? "var(--color-yellow-400)"
      : tone === "red"
        ? "var(--color-red-500)"
        : "var(--color-turq-500)";

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        insetInlineStart: "calc(var(--rail-x) - 6px)",
        insetBlockStart: "0.1rem",
        inlineSize: "14px",
        blockSize: "14px",
        borderRadius: "3px",
        backgroundColor: fill,
        transform: "rotate(-6deg)",
      }}
    />
  );
}

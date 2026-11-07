"use client";

/**
 * src/components/three/useViewerShell.ts
 *
 * The three hooks the light shell needs before a single byte of three has been
 * downloaded: which rung of the fallback ladder this device is on, whether the
 * wrapper is on screen, and the touch arbitration between orbiting and scrolling.
 *
 * Every import here is three-free (`capability.ts`, `gestureGuard.ts` and
 * `constants.ts` all are), which is what keeps `three` and `drei` out of the bundle a
 * visitor downloads to read the home page.
 */

import * as React from "react";

import {
  demoteRenderMode,
  detectRenderMode,
  prefersReducedMotion,
  type RenderMode,
} from "@/lib/three/capability";
import { GestureGuard, type ControlsLike } from "@/lib/three/gestureGuard";

/* --------------------------------------------------------------- the ladder */

/**
 * Doc 05 §A.6. `3d` → `turntable` → `poster`, decided once per session and memoised,
 * with `?render=` on top so both lower rungs can be tested on a real phone.
 *
 * The mode is `null` until the first client effect runs. Rendering the poster during
 * that tick instead would paint a poster and then swap it for a canvas, which is the
 * flash the progressive load sequence in §A.6 exists to avoid.
 */
export function useRenderMode(): {
  mode: RenderMode | null;
  /**
   * Moves to a rung and remembers it for the session. Sticky in both directions: a
   * device that just lost a context will lose the next one too, and swapping back and
   * forth is worse than staying on the sprite sheet. The three callers are a failure
   * (down), a restored context (up) and the poster's own upgrade button (up).
   */
  setMode: (to: RenderMode) => void;
} {
  const [mode, setLocal] = React.useState<RenderMode | null>(null);

  React.useEffect(() => {
    setLocal(detectRenderMode());
  }, []);

  const setMode = React.useCallback((to: RenderMode) => {
    demoteRenderMode(to);
    setLocal(to);
  }, []);

  return { mode, setMode };
}

/** Doc 07 §12.1. Live, because a visitor can flip the setting with the page open. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced || prefersReducedMotion();
}

/* ------------------------------------------------------------ the frame loop */

/**
 * Doc 05 §A.8. A visitor who has scrolled past the product spends zero GPU on it, and
 * a visitor who switches tabs spends zero battery. Both are one boolean.
 */
export function useCanvasActive(ref: React.RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver !== "function") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.12, rootMargin: "80px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  React.useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return visible && !hidden;
}

/* ------------------------------------------------------------ the gesture */

/**
 * Doc 05 §A.7. Binds `GestureGuard` to the wrapper.
 *
 * One detail the library cannot do from where it sits: three's `OrbitControls`
 * writes `touch-action: none` onto the canvas the moment it connects, and the canvas
 * is the touch target, so that inline style would override the `pan-y` the guard sets
 * on the wrapper and swallow every vertical swipe. Clearing it here hands the
 * decision back to the wrapper, where the guard can make it.
 */
export function useGestureGuard(options: {
  wrapperRef: React.RefObject<HTMLElement | null>;
  controls: () => ControlsLike | null;
  enabled: boolean;
  onFirstInput?: () => void;
  onDoubleTap?: () => void;
}): void {
  const { wrapperRef, controls, enabled } = options;
  const callbacks = React.useRef(options);
  callbacks.current = options;

  React.useEffect(() => {
    const element = wrapperRef.current;
    if (!element || !enabled) return;

    const guard = new GestureGuard({
      element,
      controls,
      onFirstInput: () => callbacks.current.onFirstInput?.(),
      onDoubleTap: () => callbacks.current.onDoubleTap?.(),
    });

    const canvas = element.querySelector("canvas");
    const release = () => {
      if (canvas && canvas.style.touchAction) canvas.style.touchAction = "";
    };
    release();
    // OrbitControls reconnects on a camera or dom-element change, so the style comes
    // back. A cheap interval beats a MutationObserver on an attribute that changes
    // perhaps twice in the life of the page.
    const timer = window.setInterval(release, 1000);

    return () => {
      window.clearInterval(timer);
      guard.dispose();
      element.style.touchAction = "";
    };
  }, [wrapperRef, controls, enabled]);
}

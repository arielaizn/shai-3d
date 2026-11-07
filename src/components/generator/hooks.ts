"use client";

/**
 * src/components/generator/hooks.ts
 *
 * The three browser facts the generator asks about, each read once and shared.
 *
 * All of them start at their SSR-safe value and correct themselves in an effect, so
 * the server HTML and the first client paint agree. Doc 07 §12.1: reading
 * `prefers-reduced-motion` as false during SSR is the safe default, because the first
 * client paint corrects it before anything has moved.
 */

import * as React from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/design/motion";

/** A media query as reactive state. Returns `false` until the client has answered. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/** Doc 04 §B1: the desktop split, and the one breakpoint the generator branches on. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/**
 * Runs `effect` once the value has stopped changing for `delay`.
 *
 * The generator saves its draft to Convex on every change (doc 04 §B4), and on a 4G
 * connection an unthrottled save per keystroke is both a wasted round trip and a
 * rate limit. The debounce is what turns a slider drag into one write.
 */
export function useDebouncedEffect(
  effect: () => void,
  delay: number,
  deps: React.DependencyList,
): void {
  const saved = React.useRef(effect);
  saved.current = effect;

  React.useEffect(() => {
    const timer = window.setTimeout(() => saved.current(), delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps]);
}

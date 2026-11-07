"use client";

import * as React from "react";

/**
 * How far down the page a second sticky element has to start.
 *
 * The site header is one `sticky top-0` block that contains **two** rows: the
 * announcement bar and the navigation. Doc 03 §0.5 gives them as 36px and 68/80px, so
 * a filter bar written against the navigation height alone (`top-17`, `top-20`) sticks
 * 36px too high and spends the whole page hidden behind the announcement.
 *
 * A constant cannot fix it, because the announcement is dismissible: the same page has
 * a 104px header before the X is pressed and a 68px header after it, and `localStorage`
 * decides which one a returning visitor gets. So the header is measured, and measured
 * again whenever it changes size.
 *
 * `fallbackPx` is what server render and the first client frame use. It is wrong by at
 * most one row for one frame, at the very top of the page, where the sticky offset has
 * no visible effect yet.
 */
export function useHeaderOffset(fallbackPx: number): number {
  const [offset, setOffset] = React.useState(fallbackPx);

  React.useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const measure = () => {
      const height = Math.round(header.getBoundingClientRect().height);
      // a header mid-transition can measure 0 for a frame; keeping the last good
      // value is better than snapping the bar to the top of the viewport and back
      if (height > 0) setOffset(height);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return offset;
}

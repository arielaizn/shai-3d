"use client";

import * as React from "react";

import { Mark, type MarkTone } from "@/components/ui/Mark";

/**
 * The marker on the `/about` H1.
 *
 * 09 §11: it runs once on load, and it does not run when the page was opened on a
 * hash, because a visitor who arrived at `#today` never saw the heading sweep and a
 * sweep that happens off screen is spent for nothing.
 *
 * The hash can only be read in the browser, so this thin client wrapper exists purely
 * to decide the `animate` flag. `Mark` renders the finished word on the server and
 * with no JavaScript, so the heading is complete either way.
 */
export function HeroMark({ children, tone = "turquoise" }: { children: string; tone?: MarkTone }) {
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    if (window.location.hash.length > 1) return;
    setAnimate(true);
  }, []);

  return (
    <Mark tone={tone} animate={animate} delay={180}>
      {children}
    </Mark>
  );
}

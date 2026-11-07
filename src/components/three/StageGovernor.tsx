"use client";

/**
 * src/components/three/StageGovernor.tsx
 *
 * Doc 05 §A.8. Two jobs, both about not spending a phone's battery on nothing.
 *
 * ## The render loop
 *
 * `frameloop="demand"` is the base state, so a frame happens only when something asks
 * for one. This component takes it one step further: when the wrapper leaves the
 * viewport or the tab is hidden, one last frame is rendered synchronously so the
 * canvas is not left mid-damp, and then the loop is switched off entirely. A visitor
 * who scrolls past the product spends zero GPU on it.
 *
 * ## The quality ladder
 *
 *   0  full quality
 *   1  dpr forced to 1.0                       (about 45% of the fragment cost)
 *   2  the contact shadow is dropped, environment resolution halves
 *   3  the layer-line shader strength goes to 0, skipping its `fwidth` branch
 *   4  the canvas unmounts and the sprite-sheet turntable takes over
 *
 * Steps are never reversed inside a session. Oscillating between two quality levels
 * looks far worse than sitting one rung lower than necessary.
 *
 * drei's `<PerformanceMonitor>` is deliberately not used here. It samples every frame
 * and infers a refresh rate, and under a demand loop the frames are sparse and
 * irregular by design, so it reads a stall where there is only stillness. This sampler
 * counts only frames that arrive inside 100ms of the previous one, which is exactly
 * the dense stretch during an orbit, a damping glide or an auto-rotate, and those are
 * the only moments where frame rate is a real measurement.
 */

import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";

import { dprRange } from "@/lib/three/constants";

import type { QualityRung } from "./types";

const WINDOW = 90;
const DECLINE_MS = 26;
const FALLBACK_WINDOW = 120;
const FALLBACK_MS = 34;
/** A gap wider than this is the loop resting, not a slow frame. */
const DENSE_MS = 100;

export type StageGovernorProps = {
  active: boolean;
  quality: QualityRung;
  onQualityRung: (rung: QualityRung) => void;
  /** Rung 4 unmounts the canvas. Off for the generator, which has no sprite sheet. */
  allowFallback?: boolean;
};

export function StageGovernor({
  active,
  quality,
  onQualityRung,
  allowFallback = true,
}: StageGovernorProps) {
  const setFrameloop = useThree((state) => state.setFrameloop);
  const setDpr = useThree((state) => state.setDpr);
  const invalidate = useThree((state) => state.invalidate);
  const advance = useThree((state) => state.advance);

  React.useEffect(() => {
    if (active) {
      setFrameloop("demand");
      invalidate();
      return;
    }
    // One last frame, painted now, so the object is not frozen halfway through a
    // damping glide for as long as the visitor is scrolled away from it.
    setFrameloop("demand");
    advance(performance.now());
    setFrameloop("never");
  }, [active, setFrameloop, invalidate, advance]);

  React.useEffect(() => {
    setDpr(quality >= 1 ? 1 : dprRange());
  }, [quality, setDpr]);

  const samples = React.useRef<number[]>([]);
  const last = React.useRef(0);

  useFrame(() => {
    const now = performance.now();
    const delta = now - last.current;
    last.current = now;
    if (delta <= 0 || delta > DENSE_MS) {
      samples.current.length = 0;
      return;
    }

    samples.current.push(delta);
    const needed = quality >= 3 ? FALLBACK_WINDOW : WINDOW;
    if (samples.current.length < needed) return;

    const average = samples.current.reduce((sum, value) => sum + value, 0) / samples.current.length;
    samples.current.length = 0;

    if (quality >= 3) {
      if (average > FALLBACK_MS && allowFallback) onQualityRung(4);
      return;
    }
    if (average > DECLINE_MS) onQualityRung((quality + 1) as QualityRung);
  });

  return null;
}

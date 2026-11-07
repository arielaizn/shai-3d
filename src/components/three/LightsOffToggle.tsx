"use client";

/**
 * src/components/three/LightsOffToggle.tsx
 *
 * Doc 05 §B.3.3. The glow-in-the-dark switch, specified as a delight moment and built
 * as one.
 *
 * It is a chunky toy light switch, not a checkbox: a turquoise plate with a 4px ink
 * outline and a cream rocker that travels 28px in 140ms on `ease-toy`, so it snaps and
 * overshoots the way a real switch does. The plate drops 2px while pressed and lands
 * on its own hard shadow, which is the tactile signature every control on this site
 * shares.
 *
 * The switch itself only reports state. The darkening lives where it belongs: the
 * card background and the CSS halo are animated by `PreviewStage`, and every scene
 * light plus the emissive ramp are animated inside `PanelMesh`, at frame rate,
 * without a React render.
 *
 * The state is not part of the order and is never sent to WhatsApp. It is a way to
 * look at the object.
 *
 * `aria-pressed` rather than a switch role: the button's label already changes between
 * `לכבות את האור` and `להדליק את האור`, and a screen reader announcing both a changed
 * name and a changed state says the same thing twice.
 */

import * as React from "react";

import { DURATION, EASE, PRESS } from "@/lib/design/motion";
import { GENERATOR } from "@/content/generator";

import { GLOW_COPY } from "./copy";

export type LightsOffToggleProps = {
  /** True once the lights are off and the object is carrying itself. */
  lightsOff: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** The line beside the switch while it is dark. */
  showHint?: boolean;
  className?: string;
};

const TRAVEL = 28;

export function LightsOffToggle({
  lightsOff,
  onChange,
  disabled = false,
  showHint = true,
  className,
}: LightsOffToggleProps) {
  const label = lightsOff
    ? GENERATOR.preview.actions.lightsOn
    : GENERATOR.preview.actions.lightsOff;

  return (
    <div
      className={["flex flex-col items-center gap-2 [min-inline-size:0]", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="text-[0.8125rem] font-semibold"
        style={{ color: lightsOff ? "var(--color-cream-50)" : "var(--color-ink-900)" }}
      >
        {label}
      </span>

      <button
        type="button"
        aria-pressed={lightsOff}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!lightsOff)}
        className="relative grid place-items-start rounded-[14px] active:translate-y-0.5"
        data-motion="essential"
        style={{
          inlineSize: 64,
          blockSize: 96,
          padding: 6,
          backgroundColor: "var(--color-turq-500)",
          border: "4px solid var(--color-ink-900)",
          boxShadow: "var(--shadow-pop)",
          opacity: disabled ? 0.5 : 1,
          transitionProperty: "transform, box-shadow",
          transitionDuration: `${PRESS.up}ms`,
          transitionTimingFunction: EASE.toy,
        }}
      >
        <span
          aria-hidden="true"
          className="block rounded-[9px]"
          style={{
            inlineSize: "100%",
            blockSize: 42,
            backgroundColor: "var(--color-cream-100)",
            border: "2px solid var(--color-ink-900)",
            transform: `translateY(${lightsOff ? TRAVEL : 0}px)`,
            transition: `transform ${DURATION.d2}ms ${EASE.toy}`,
          }}
        />
      </button>

      {showHint && lightsOff ? (
        <span
          className="max-w-[16rem] text-center text-[0.75rem] leading-5"
          style={{ color: "var(--color-text-stage-muted)" }}
        >
          {GLOW_COPY.darkHint}
        </span>
      ) : null}
    </div>
  );
}

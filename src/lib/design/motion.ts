/**
 * TS mirror of the motion vocabulary in doc 07.
 *
 * Why this file exists: a JS animation runtime cannot read CSS custom properties
 * inside a transition object, so the easings and durations live here as plain
 * values. `src/app/globals.css` stays the single source of truth for the CSS side.
 *
 * The editorial rule behind every number (doc 07 §1): things arrive by building
 * upward, and things respond when you touch them. A motion that does neither is cut.
 */

/* -------------------------------------------------------------- easings */

/** Doc 07 §2.1. Five curves, and `linear` for continuous loops. */
export const EASE = {
  /** The toy. Genuine overshoot: peaks at 1.098 at 57% of the duration. */
  toy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  /** Half the bounce, for surfaces between 321px and 720px. Peaks at 1.057 at 63%. */
  toyBig: "cubic-bezier(0.22, 1.42, 0.36, 1)",
  /** Expo-out. 90% of the travel is done by 32% of the duration. No overshoot. */
  outSoft: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Exits. Accelerates away and never returns. */
  inQuick: "cubic-bezier(0.5, 0, 0.75, 0)",
  /** Symmetric, for things already on screen that move. Midpoint at exactly 50%. */
  inoutFlow: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** Continuous loops only. Any easing on an infinite loop pulses at the seam. */
  linear: "linear",
} as const;

export type EaseName = keyof typeof EASE;

/** The same five curves as control points, for JS animation runtimes. */
export const EASE_POINTS = {
  toy: [0.34, 1.56, 0.64, 1],
  toyBig: [0.22, 1.42, 0.36, 1],
  outSoft: [0.22, 1, 0.36, 1],
  inQuick: [0.5, 0, 0.75, 0],
  inoutFlow: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/**
 * Doc 07 §2.2. Enter curves are chosen by the element's largest dimension at the
 * moment it enters. Running text never overshoots, whatever its size, because the
 * settle makes it illegible.
 */
export function enterEase(largestPx: number, isRunningText = false): string {
  if (isRunningText) return EASE.outSoft;
  if (largestPx <= 320) return EASE.toy;
  if (largestPx <= 720) return EASE.toyBig;
  return EASE.outSoft;
}

/* ------------------------------------------------------------ durations */

/** Doc 07 §3.1. Seven steps. A duration that is not on the ladder is a bug. */
export const DURATION = {
  /** press down, hold-repeat tick, out-of-stock acknowledgement */
  d1: 90,
  /** hover in and out, colour transitions, focus ring fade out */
  d2: 140,
  /** `pop`. A small element enters: chip, badge, pip, toast, breakdown row */
  d3: 260,
  /** card hover lift, dropdown, canvas cross-fade, FLIP layout move, digit roll */
  d4: 320,
  /** the slam, the marker draw, a generator step change, viewer reset */
  d5: 420,
  /** `layer-rise`, sheet enter, the burst */
  d6: 520,
  /** camera swing, tag pendulum, the idle flip peek */
  d7: 900,
} as const;

/** The same ladder in seconds, for runtimes that take seconds. */
export const DURATION_S = {
  d1: 0.09,
  d2: 0.14,
  d3: 0.26,
  d4: 0.32,
  d5: 0.42,
  d6: 0.52,
  d7: 0.9,
} as const;

/**
 * Doc 07 §5.4. Press is 90ms down and 160ms up. The asymmetry is what makes a
 * button feel sprung under a finger. Symmetric press timing feels like a dialog box.
 */
export const PRESS = { down: 90, up: 160 } as const;

/** Doc 07 §2.2. A leaving element has nothing left to say. */
export function exitDuration(enterMs: number): number {
  return Math.round((enterMs * 0.6) / 10) * 10;
}

/** Doc 07 §5.2. Reading-order stagger, with the caps that keep a grid from queueing. */
export const STAGGER = {
  /** Step cards, story parts, contact channels, FAQ rows. */
  editorial: 60,
  editorialCap: 6,
  /** Product grids. Cards are small and uniform, so they arrive quicker. */
  grid: 40,
  gridCap: 12,
} as const;

/** Doc 07 §5.10. Ambient loops, in ms. At most two are visible at once. */
export const LOOP = {
  gallery: 28000,
  gallerySm: 22000,
  blob: 14000,
  cube: 6000,
  gitd: 2800,
  head: 1240,
  ants: 700,
} as const;

/* -------------------------------------------------------------- springs */

export type Spring = {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
};

/** Doc 07 §4. Four springs, with their measured characteristics. */
export const SPRING = {
  /** ζ 0.650, first peak 269ms, +6.8%, settled 488ms. The hero card flip. */
  flip: { stiffness: 260, damping: 22, mass: 1.1 },
  /** ζ 0.634, first peak 198ms, +7.6%, settled 374ms. Sheets, sticky bar, cards. */
  sheet: { stiffness: 420, damping: 26, mass: 1 },
  /** ζ 0.643, first peak 155ms, +7.2%, settled 287ms. FLIP moves. */
  nudge: { stiffness: 700, damping: 34, mass: 1 },
  /** ζ 0.968, no overshoot, settled 480ms. Anything over 720px. */
  stage: { stiffness: 200, damping: 30, mass: 1.2 },
} as const satisfies Record<string, Spring>;

/**
 * Doc 07 §4. A spring on opacity overshoots past 1, the browser clamps it, and the
 * result is a flat hold that looks like a dropped frame. Opacity always uses a bezier.
 */
export const OPACITY_TRANSITION = { duration: DURATION_S.d3, ease: EASE.outSoft } as const;

/* ------------------------------------------------- distance to duration */

/** Doc 07 §3.2. The five steps a computed duration may snap to. */
export const LADDER = [140, 260, 320, 420, 520] as const;

function clampTo(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Snap an arbitrary millisecond value to the nearest rung of the ladder. */
export function snapDuration(value: number): number {
  return LADDER.reduce<number>(
    (best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best),
    LADDER[0],
  );
}

/**
 * Travel-dominant motion. 0.8 ms per px puts a hand-sized object across a 390px
 * phone screen in about 400ms. Faster and the eye loses the object, slower and the
 * interface feels like it is thinking.
 */
export function travelDuration(px: number): number {
  return snapDuration(clampTo(90 + px * 0.8, 140, 520));
}

/** Scale-dominant motion. `s` is the absolute change in scale factor. */
export function scaleDuration(deltaScale: number): number {
  return snapDuration(clampTo(140 + deltaScale * 1000, 140, 520));
}

/** When the two formulas disagree, the larger wins. */
export function motionDuration(px: number, deltaScale: number): number {
  return Math.max(travelDuration(px), scaleDuration(deltaScale));
}

/* ------------------------------------------------------ reduced motion */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Doc 07 §12.1. `prefers-reduced-motion` is a request to stop moving things, and it
 * is not a request to stop communicating. Reads false during SSR, which is the safe
 * default: the first client paint corrects it before anything animates.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Doc 07 §12.2. The tier a motion belongs to, written onto the element as
 * `data-motion` so the stylesheet and a reviewer can both see the intent.
 *
 * - `decorative` Tier A: removed entirely under reduced motion.
 * - `state` Tier B: kept, re-expressed with colour and shadow instead of travel.
 * - `essential` Tier C: kept, because it is the only feedback available.
 */
export type MotionTier = "decorative" | "state" | "essential";

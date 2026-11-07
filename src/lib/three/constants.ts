/**
 * src/lib/three/constants.ts
 *
 * Every number the 3D layer treats as a fact. Doc 05 §0.
 *
 * ## World units
 *
 * **1 three.js unit = 1 centimetre.** Pieces run 40mm to 250mm, which is 4 to 25
 * units: comfortably inside float32, sane `near`/`far`, and every mm-based admin
 * parameter is one `/10` away from a scene value. Metres would put a keychain at
 * 0.05 units and force a fiddly near plane. Millimetres would put a wall piece at
 * 250 units and make the lighting-rig distances unreadable.
 *
 * glTF is metres by convention, so an uploaded `.glb` gets `100 * sourceUnitScale`
 * on the root group.
 *
 * ## Vertex ceiling
 *
 * `PREVIEW_VERTEX_CEILING` is the hard limit the generator's kernel is allowed to
 * produce on any device, and it is the number the grid ladder is derived from. It is
 * set at 150,000 vertices, roughly 300,000 triangles, because that is what a 2021
 * mid-range Android (Snapdragon 6-series, Mali-G57 class) uploads and draws inside a
 * 16ms frame with one material and no shadow map. The catalog's own upload budget is
 * stricter (120k triangles) because those files also have to travel over 4G.
 */

/* ---------------------------------------------------------------- units */

/** One scene unit is one centimetre, so millimetres divide by ten. */
export const MM_PER_UNIT = 10;

export const mmToUnits = (mm: number): number => mm / MM_PER_UNIT;
export const unitsToMm = (units: number): number => units * MM_PER_UNIT;

/** glTF ships metres. 100 units per metre gets a `.glb` to centimetres. */
export const GLTF_UNITS_TO_SCENE = 100;

/* ------------------------------------------------------------- renderer */

/**
 * Doc 05 §0.4. `NeutralToneMapping` (Khronos PBR Neutral), never ACES.
 *
 * ACES pulls saturated reds toward orange and desaturates exactly the candy colours
 * this brand is built on, so a `#F5333F` filament renders as dull brick. PBR Neutral
 * was designed for product viewers: it holds hue on saturated albedo and still rolls
 * off highlights. Single most visible renderer setting on the site.
 */
export const CAMERA = {
  /** About a 62mm lens on full frame. Wide enough to feel the depth of a relief panel, narrow enough that a wall piece does not bow at the edges. */
  fov: 35,
  near: 1,
  far: 400,
} as const;

/** Doc 05 §A.1. 18% breathing room so the silhouette never kisses the canvas edge. */
export const FIT_PADDING = 1.18;

/**
 * Doc 05 §A.1. Deliberately off axis, about 17 degrees azimuth and 13 elevation.
 * A dead-on front view reads as a photograph and nobody realises it is draggable.
 */
export const FIT_DIRECTION = { x: 0.28, y: 0.22, z: 0.93 } as const;

/* --------------------------------------------------------- orbit limits */

/**
 * Doc 05 §A.2. `maxPolar` is the important one: it stops the camera orbiting under
 * the contact shadow, which is the single ugliest thing a naive product viewer does,
 * because the object then appears to float over a hole. `minPolar` keeps the key
 * light from ever sitting directly behind the camera, which flattens the print.
 */
export const ORBIT = {
  dampingFactor: 0.075,
  dampingFactorReduced: 0.25,
  rotateSpeed: 0.62,
  zoomSpeed: 0.6,
  minDistanceFactor: 0.55,
  maxDistanceFactor: 2.1,
  minPolar: 0.3,
  maxPolar: 1.92,
  autoRotateSpeed: 0.85,
  /** Arrow key step, radians. 4 degrees per press. */
  keyOrbitStep: (4 * Math.PI) / 180,
  /** Plus and minus dolly one step, as a fraction of the current distance. */
  keyDollyStep: 0.06,
  /** The on-canvas zoom buttons move further than a key press. */
  buttonDollyStep: 0.12,
  /** `Home` and double tap both run this reset. */
  resetMs: 420,
  /** Two pointerups inside this window and this distance count as a double tap. */
  doubleTapMs: 280,
  doubleTapPx: 24,
} as const;

/* ------------------------------------------------------------- lighting */

/**
 * Doc 05 §A.3. The warm-key and cool-fill split is the whole difference between
 * "toy" and "artisan". An all-warm rig with a golden bounce reads as a craft
 * workshop, which DECISIONS.md explicitly rejects. One cool light at 35% of the
 * key's power shifts the read without tinting the plastic.
 */
export const RIG = {
  ambient: { intensity: 0.42, color: "#FFF7EC" },
  key: { pos: [0.62, 0.78, 0.55], intensity: 2.05, color: "#FFFFFF" },
  fill: { pos: [-0.78, 0.26, 0.42], intensity: 0.72, color: "#CFF4F2" },
  rim: { pos: [-0.18, 0.55, -0.85], intensity: 1.35, color: "#FFD36B" },
  hemi: { sky: "#FFFFFF", ground: "#FFF0DC", intensity: 0.3 },
  /** Doc 05 §B.5.3. A lithophane under the full studio key is a flat grey slab. */
  backlitKeyScale: 0.44,
  backlitFillScale: 0.49,
} as const;

/**
 * Doc 05 §A.5. The pad under the object is a CSS radial gradient on the wrapper, not
 * a floor plane in the scene. A real plane would need lighting, would clip on wide
 * models, and would show its own edge the moment the camera drops low.
 */
export const CONTACT = {
  scaleFactor: 3.4,
  resolution: 512,
  blur: 2.6,
  farFactor: 1.4,
  opacity: 0.44,
  color: "#1A1420",
} as const;

/* ---------------------------------------------- 3D-only colour additions */

/**
 * Doc 05 §0.2 asks for `--color-night`, `--color-glow` and `--color-bed` in the
 * `@theme` block. `globals.css` is owned by the design system and ships the stage
 * ramp instead, so the three land here as literals against the nearest token:
 * night is `--color-stage-950`, glow matches `--shadow-glow-gitd`, bed matches
 * `--color-cream-300`.
 */
export const STAGE_3D = {
  night: "#0C0812",
  nightSoft: "#16131C",
  glow: "#A6FF7E",
  bed: "#F0E6D6",
  /** The warm pool the object sits in, painted in CSS behind the canvas. */
  haloLight: "radial-gradient(ellipse 62% 46% at 50% 78%, #F6E9D6 0%, #FFF7EC 72%)",
  haloDark: "radial-gradient(ellipse 62% 46% at 50% 78%, #16131C 0%, #0C0812 72%)",
} as const;

/**
 * Doc 05 §A.4. Applied on top of whatever the glTF carried, never instead of it:
 * Shai may legitimately export two materials for a two-colour print and that intent
 * has to survive.
 */
export type Finish = "matte" | "silk" | "glow";

export const FINISH: Record<
  Finish,
  { roughness: number; metalness: number; envMapIntensity: number; emissive: number }
> = {
  matte: { roughness: 0.72, metalness: 0.0, envMapIntensity: 0.45, emissive: 0.0 },
  silk: { roughness: 0.28, metalness: 0.18, envMapIntensity: 0.95, emissive: 0.0 },
  glow: { roughness: 0.66, metalness: 0.0, envMapIntensity: 0.4, emissive: 0.06 },
};

/** Doc 05 §B.3.3. Strontium-aluminate PLA: pale mint in daylight, greenish cyan charged. */
export const GITD = {
  daylightHex: "#C9F3D8",
  emissiveHex: STAGE_3D.glow,
  emissiveLightsOn: 0.06,
  emissiveLightsOff: 1.9,
  /** Charges past target then settles, so it flares like a real charge. */
  overshoot: 2.3,
  /** Every scene light drops to this multiple when the lights go off. */
  darkLightScale: 0.05,
  haloOpacity: 0.62,
  haloScale: 1.75,
  /** Doc 05 §B.3.3 timings, milliseconds from the flip. */
  timing: { total: 520, emissiveDelay: 180, settleAt: 420, victoryLapMs: 8000 },
} as const;

/** Doc 05 §B.3.1. Beer-Lambert absorption for white PLA, per centimetre. */
export const LITHO_ABSORPTION_PER_CM = 11.0;
export const LITHO_BACKLIGHT_HEX = "#FFF3DC";

/* ------------------------------------------------------- the perf budget */

/**
 * The generator kernel's hard ceiling, and the reason the grid ladder exists.
 * 150k vertices is roughly 300k triangles across the front grid, the back and the
 * skirt. That is what a 2021 mid Android uploads and draws inside one frame with a
 * single material and no shadow map.
 */
export const PREVIEW_VERTEX_CEILING = 150_000;

/**
 * The ladder, longest edge of the working height-map grid. Every rung is a real
 * fallback, taken in order, and each one is roughly half the vertex count of the one
 * above.
 *
 *   320  desktop or a phone reporting 8+ cores
 *   256  the default
 *   224  4 cores or less, or 4GB or less of reported memory
 *   160  offered by hand after 15 seconds of waiting (doc 05 §D.4)
 *   128  last resort after a worker failure, completes on anything
 */
export const GRID_LADDER = [320, 256, 224, 160, 128] as const;

/** Doc 05 §A.8. Capping dpr at 1.75 costs nothing visible on a matte object. */
export function dprRange(): [number, number] {
  if (typeof navigator === "undefined") return [1, 1.5];
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  return mem <= 4 || cores <= 4 ? [1, 1.25] : [1, 1.75];
}

/**
 * Doc 05 §B.1. The grid the device gets before the visitor asks for anything else.
 * `printTypeGridLong` is the type's own preference and always wins downward.
 */
export function gridForDevice(printTypeGridLong: number): number {
  if (typeof navigator === "undefined") return Math.min(printTypeGridLong, 256);
  const cores = navigator.hardwareConcurrency ?? 4;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 4;
  const deviceCap = cores >= 8 && mem > 4 ? 320 : cores <= 4 || mem <= 4 ? 224 : 256;
  return Math.min(printTypeGridLong, deviceCap);
}

/** The next rung down, or `null` when there is nothing left to try. */
export function nextGridDown(current: number): number | null {
  for (const rung of GRID_LADDER) if (rung < current) return rung;
  return null;
}

/* -------------------------------------------------------- wait-state budget */

/**
 * Doc 05 §B.1 stage 5. Work that finishes in 400ms and snaps to a result reads as
 * "nothing happened" and the visitor does not believe a model was built, so the
 * build is gated behind a floor. The ceilings are where the UI changes what it says.
 */
export const BUILD_BUDGET = {
  minimumMs: 2600,
  slowMs: 9000,
  offerLowerResMs: 15000,
  /** Main-thread fallback slice, milliseconds of work between yields. */
  sliceMs: 8,
} as const;

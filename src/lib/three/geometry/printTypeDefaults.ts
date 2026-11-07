/**
 * src/lib/three/geometry/printTypeDefaults.ts
 *
 * Doc 05 §B.3 seed rows, as code.
 *
 * Convex owns these numbers at runtime: `printTypes.geometry` on the row carries the
 * same shape and overrides everything here. This file exists so the engine has a
 * complete, correct configuration before the database has a single row, so the
 * preview can be developed and tested with no backend, and so a row that arrives with
 * a missing optional field cannot produce a kernel with `undefined` in the maths.
 *
 * Keys follow RESOLUTIONS.md §ב.6. Doc 05 calls the standee `shelf`; the ruling calls
 * it `standee`, and the ruling wins.
 */

import type { Finish, GeneratorSettings, KernelParams, PrintTypeKey } from "./types";

/** Doc 05 §B.4. `generatorSettings`, one document, admin owned. */
export const DEFAULT_SETTINGS: GeneratorSettings = {
  layerHeightMm: 0.2,
  nozzleMm: 0.4,
  perimeterMm: 1.2,
  densityGCm3: 1.24,
  infillFactor: 0.22,
  minutesPerGram: 2.4,
  setupMinutes: 12,
  lithoAbsorptionPerCm: 11.0,
  aoStrength: 2.2,
  maxFreeColors: 4,
};

export const PRINT_TYPE_DEFAULTS: Record<PrintTypeKey, KernelParams> = {
  /**
   * Doc 05 §B.3.1. 0.8mm is four layers at 0.2 and the thinnest wall that prints
   * without light leaking through as pinholes. 3.0mm is where the darkest tone stops
   * getting darker in white PLA. `quantizeToLayer` is false: a lithophane is printed
   * in thin walls, the terracing is not the feature, and forcing it in adds banding
   * to a smooth gradient.
   */
  lithophane: {
    kernel: "panel",
    gridLong: 288,
    invertLuminance: true,
    backlit: true,
    quantizeToLayer: false,
    thicknessMinMm: 0.8,
    thicknessMaxMm: 3.0,
    backPlateMm: 0,
    borderMm: 3.0,
    maxLongEdgeMm: 200,
    defaultFinish: "matte",
    maxFilamentColors: 1,
  },

  /**
   * Doc 05 §B.3.2. Bright is tall, front lit, opaque, and this is the type where the
   * four colours earn their money. 4.0mm of relief over a 1.6mm back plate at 0.2mm
   * layers is 20 discrete terraces, which reads clearly at any zoom without looking
   * like a contour map.
   */
  relief: {
    kernel: "panel",
    gridLong: 256,
    invertLuminance: false,
    backlit: false,
    quantizeToLayer: true,
    thicknessMinMm: 1.6,
    thicknessMaxMm: 5.6,
    backPlateMm: 1.6,
    borderMm: 2.5,
    maxLongEdgeMm: 200,
    defaultFinish: "matte",
    maxFilamentColors: 4,
  },

  /**
   * RESOLUTIONS.md §ב.5. Glow is a relief in glow filament, four colours, not a
   * backlit lithophane. Same geometry as `relief`; what changes is the material and
   * the lights-off switch.
   */
  glow: {
    kernel: "panel",
    gridLong: 256,
    invertLuminance: false,
    backlit: false,
    quantizeToLayer: true,
    thicknessMinMm: 1.6,
    thicknessMaxMm: 5.6,
    backPlateMm: 1.6,
    borderMm: 2.5,
    maxLongEdgeMm: 200,
    defaultFinish: "glow",
    maxFilamentColors: 4,
  },

  /**
   * Doc 05 §B.3.4. Panel plus a separate stand, and the stand is where the second
   * colour becomes obvious. Its colour slot sits outside the four image colours,
   * because it is a separate part that Shai prints separately.
   */
  standee: {
    kernel: "panelStand",
    gridLong: 352,
    invertLuminance: false,
    backlit: false,
    quantizeToLayer: true,
    thicknessMinMm: 1.6,
    thicknessMaxMm: 5.6,
    backPlateMm: 1.6,
    borderMm: 2.0,
    maxLongEdgeMm: 130,
    defaultFinish: "matte",
    maxFilamentColors: 4,
    standAngleDeg: 12,
    standThicknessMm: 8,
    accessoryIsSeparateColor: true,
  },

  /**
   * Doc 05 §B.3.5. The piece is small, so more samples are invisible and cost time.
   * The raised boss around the ring hole is the detail that makes a maker nod: a flat
   * 2mm keychain tears at the ring, so you add a doughnut of material around it.
   */
  keychain: {
    kernel: "panelHole",
    gridLong: 200,
    invertLuminance: false,
    backlit: false,
    quantizeToLayer: true,
    thicknessMinMm: 2.4,
    thicknessMaxMm: 4.0,
    backPlateMm: 2.4,
    borderMm: 1.5,
    maxLongEdgeMm: 60,
    defaultFinish: "matte",
    maxFilamentColors: 3,
    ringHoleMm: 5.0,
    ringBossMm: 2.0,
  },

  /**
   * Doc 05 §B.3.6. A blind cavity for a 10x2mm neodymium disc. Orbiting to the back is
   * the payoff for this type, so the polar limits stay open all the way round.
   */
  magnet: {
    kernel: "panelPocket",
    gridLong: 200,
    invertLuminance: false,
    backlit: false,
    quantizeToLayer: true,
    thicknessMinMm: 3.0,
    thicknessMaxMm: 4.6,
    backPlateMm: 3.0,
    borderMm: 1.5,
    maxLongEdgeMm: 70,
    defaultFinish: "matte",
    maxFilamentColors: 3,
    magnetPocketMm: { dia: 10, depth: 2.2 },
  },

  /**
   * Doc 05 §B.3.7. The frame is a separate mesh with its own colour slot. Its bevel is
   * not decoration: an unbevelled extrusion has a razor silhouette that reads as CAD,
   * and one millimetre of bevel is what makes it read as an object.
   */
  framed: {
    kernel: "panelFrame",
    gridLong: 288,
    invertLuminance: false,
    backlit: false,
    quantizeToLayer: true,
    thicknessMinMm: 1.6,
    thicknessMaxMm: 5.6,
    backPlateMm: 1.6,
    borderMm: 0,
    maxLongEdgeMm: 240,
    defaultFinish: "matte",
    maxFilamentColors: 4,
    frameWidthMm: 14,
    frameDepthMm: 8,
    accessoryIsSeparateColor: true,
  },
};

/** Doc 05 §B.3. The size presets each type ships with, long edge in millimetres. */
export const SIZE_PRESETS_MM: Record<PrintTypeKey, number[]> = {
  lithophane: [100, 140, 180],
  relief: [80, 120, 160],
  glow: [80, 120, 160],
  standee: [90, 130],
  keychain: [40, 50, 60],
  magnet: [45, 55, 70],
  framed: [140, 190, 240],
};

/**
 * Merges a Convex `printTypes.geometry` block over the seed row. Every field stays
 * required afterwards, so no kernel can ever be handed an `undefined` to multiply by.
 */
export function resolveKernelParams(
  key: PrintTypeKey,
  override?: Partial<KernelParams> | null,
): KernelParams {
  const base = PRINT_TYPE_DEFAULTS[key];
  if (!override) return { ...base };
  const merged: KernelParams = { ...base };
  for (const [field, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      (merged as Record<string, unknown>)[field] = value;
    }
  }
  return merged;
}

export function defaultFinishFor(key: PrintTypeKey): Finish {
  return PRINT_TYPE_DEFAULTS[key].defaultFinish;
}

/**
 * Doc 05 §C.4. The size line, chosen by the long edge. Hebrew lives in
 * `src/content/generator.ts` under `size.hint`; this returns the key into it.
 */
export function sizeHintKey(longEdgeMm: number): "matchbox" | "card" | "palm" | "a5" {
  if (longEdgeMm <= 50) return "matchbox";
  if (longEdgeMm <= 90) return "card";
  if (longEdgeMm <= 150) return "palm";
  return "a5";
}

/**
 * The floor on relief, in millimetres. A flat graphic still gets a shallow step so it
 * reads as a printed object with a lit edge and a shadow, rather than as a sticker.
 * Below roughly half a millimetre the step disappears into the layer lines and the
 * piece photographs as flat paint.
 */
const MIN_RELIEF_MM = 0.6;

/**
 * Applies what the image analyser found to the thickness range.
 *
 * A photograph carries continuous shading, so it earns the full range and comes out
 * sculpted. A logo, a drawing or a sticker has no shading to sculpt, and running the
 * full range over it invents relief that was never in the picture: flat fills come out
 * domed and outlines come out as trenches. It looks like a printing fault, and the
 * visitor blames the site rather than the file he uploaded.
 *
 * **A backlit type is left alone.** In a lithophane the thickness *is* the image, so
 * compressing the range is not a lighter touch, it is erasing the picture. A two-tone
 * logo printed as a lithophane is supposed to come out as two wall thicknesses, and
 * that is a correct lithophane.
 */
export function applyReliefFactor(params: KernelParams, reliefFactor: number): KernelParams {
  if (params.backlit) return params;

  const factor = Math.min(1, Math.max(0, reliefFactor));
  if (factor >= 1) return params;

  const full = params.thicknessMaxMm - params.thicknessMinMm;
  const scaled = Math.max(MIN_RELIEF_MM, full * factor);
  if (scaled >= full) return params;

  return { ...params, thicknessMaxMm: params.thicknessMinMm + scaled };
}

/**
 * src/lib/three/geometry/types.ts
 *
 * The contract between the photo-to-3D kernel, the worker that runs it, and the r3f
 * component that draws the result. Doc 05 §B.
 *
 * Nothing in this file imports three, and nothing imports `@/content`. The worker
 * bundle has to stay small (about 15 KB of pure arithmetic) because it is downloaded
 * and parsed on a mid-range Android before the visitor sees anything move. Pulling in
 * three, or a content module that itself imports the WhatsApp builder, would multiply
 * that by forty.
 *
 * `PrintTypeKey` is re-declared here rather than imported for that reason, and
 * `previewEngine.ts` carries a compile-time assertion that the two unions are equal,
 * so a divergence is a build error and not a silent one.
 */

/** RESOLUTIONS.md §ב.6. Locked, and the asset file names are tied to it. */
export type PrintTypeKey =
  | "lithophane"
  | "relief"
  | "glow"
  | "standee"
  | "keychain"
  | "magnet"
  | "framed";

export type Finish = "matte" | "silk" | "glow";

/**
 * Six kernels. Adding a size, a thickness range or a new keychain shape is an admin
 * action on a `printTypes` row. Adding a genuinely new kernel is a code change. Doc 05
 * §B.3 draws that line on purpose and states it out loud so nobody promises Shai
 * something the schema cannot do.
 */
export type Kernel =
  | "panel"
  | "panelHole"
  | "panelFrame"
  | "panelStand"
  | "panelPocket"
  | "panelFrameStand";

export type KernelParams = {
  kernel: Kernel;
  /** Height-map samples on the long edge before the device clamp. */
  gridLong: number;
  /** True for lithophane: bright pixel, thin wall, more light through. */
  invertLuminance: boolean;
  /** Enables the Beer-Lambert shader and the light plane behind the panel. */
  backlit: boolean;
  /** True for relief style. A lithophane is a smooth gradient and terracing hurts it. */
  quantizeToLayer: boolean;
  thicknessMinMm: number;
  thicknessMaxMm: number;
  /** Flat solid behind the relief. */
  backPlateMm: number;
  /** Raised rim around the panel. */
  borderMm: number;
  maxLongEdgeMm: number;
  defaultFinish: Finish;
  /** RESOLUTIONS.md §ב.5: 4 for glow, 1 for a lithophane body. */
  maxFilamentColors: number;
  ringHoleMm?: number;
  ringBossMm?: number;
  magnetPocketMm?: { dia: number; depth: number };
  frameWidthMm?: number;
  frameDepthMm?: number;
  standAngleDeg?: number;
  standThicknessMm?: number;
  /** The stand or frame gets a colour slot outside the four, because it is a separate part. */
  accessoryIsSeparateColor?: boolean;
};

/** Doc 05 §B.4. One admin document, and the physical facts all derive from it. */
export type GeneratorSettings = {
  layerHeightMm: number;
  nozzleMm: number;
  perimeterMm: number;
  densityGCm3: number;
  infillFactor: number;
  minutesPerGram: number;
  setupMinutes: number;
  lithoAbsorptionPerCm: number;
  aoStrength: number;
  maxFreeColors: number;
};

/** A filament as the kernel needs it: a hex to render and a name to talk about. */
export type FilamentChoice = {
  hex: string;
  nameHe: string;
  finish?: Finish;
};

export type BuildRequest = {
  printType: PrintTypeKey;
  params: KernelParams;
  /** The long edge of the finished piece, in millimetres. */
  longEdgeMm: number;
  /** In the order the visitor picked them. The engine sorts by luminance itself. */
  filaments: FilamentChoice[];
  /** The stand or frame colour, when the type has one. */
  accessory?: FilamentChoice;
  finish: Finish;
  settings: GeneratorSettings;
  /** Overrides the device grid, used by the lower-resolution retry. */
  gridLong?: number;
};

/** Everything the worker transfers back. Every field is a transferable buffer. */
export type PanelResult = {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  /** Per-vertex filament colour, already linear RGB. */
  color: Float32Array;
  /** Per-vertex thickness in centimetres, read by the lithophane shader. */
  thickness: Float32Array;
  /** Per-vertex finish index: 0 matte, 1 silk, 2 glow. */
  finish: Float32Array;
  index: Uint32Array;
  /** Precomputed so the main thread never runs `computeBoundingSphere`. */
  center: [number, number, number];
  radius: number;
  boundingMm: { x: number; y: number; z: number };
};

export type BandInfo = {
  /** The luminance range this band covers, 0..1. */
  from: number;
  to: number;
  hex: string;
  nameHe: string;
};

/** Doc 05 §B.4. The physical facts. Pricing is spec 04's, and it happens in Convex. */
export type PreviewMetrics = {
  volumeMm3: number;
  shellVolumeMm3: number;
  estimatedGrams: number;
  estimatedPrintMinutes: number;
  boundingMm: { x: number; y: number; z: number };
  triangles: number;
  vertices: number;
  /** Filament colours actually used on the image. */
  bandCount: number;
  /** Every one of these is Shai standing at the printer swapping a spool. */
  colorChangeCount: number;
  layerCount: number;
  lowContrast: boolean;
  bandContrastWarning: { a: string; b: string } | null;
  gridLong: number;
  buildMs: number;
};

export type BuildOutput = {
  panel: PanelResult;
  metrics: PreviewMetrics;
  bands: BandInfo[];
};

/**
 * Doc 05 §D.3. The worker's real messages, which is why the wait state can show three
 * honest ticks instead of a percentage it invented.
 */
export type WorkerProgress =
  | { kind: "read" }
  | {
      kind: "height";
      /** A tiny preview of the height map, so the wait animation can build the real silhouette. */
      thumb: Uint8ClampedArray;
      thumbW: number;
      thumbH: number;
      bandColors: string[];
      silhouette: Uint8Array;
    }
  | { kind: "mesh"; done: number; total: number };

export type WorkerRequest = {
  id: number;
  type: "build";
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  request: BuildRequest;
};

export type WorkerResponse =
  | { id: number; type: "progress"; progress: WorkerProgress }
  | { id: number; type: "done"; output: BuildOutput }
  | { id: number; type: "error"; code: BuildErrorCode; message: string };

/** Every failure the engine can name, so the UI never has to say "something happened". */
export type BuildErrorCode =
  | "IMAGE_UNREADABLE"
  | "IMAGE_TOO_SMALL"
  | "NO_FILAMENT"
  /** The silhouette kernel found no separable subject; the caller falls back to a panel. */
  | "NO_SUBJECT"
  | "WORKER_FAILED"
  | "ABORTED";

export class BuildError extends Error {
  readonly code: BuildErrorCode;
  constructor(code: BuildErrorCode, message: string) {
    super(message);
    this.name = "BuildError";
    this.code = code;
  }
}

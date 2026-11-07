/**
 * src/components/three/types.ts
 *
 * The contract between the light shell (entry component, chrome, fallbacks) and the
 * heavy scene chunk that is loaded with `next/dynamic`. Nothing here imports three,
 * because every module the shell touches ships in the initial bundle.
 */

import type * as React from "react";

import type { RenderMode } from "@/lib/three/capability";
import type {
  BuildOutput,
  FilamentChoice,
  Finish,
  GeneratorSettings,
  KernelParams,
  PrintTypeKey,
} from "@/lib/three/geometry/types";
import type { SnapshotOptions } from "@/lib/three/snapshot";

export type { RenderMode };

/**
 * Doc 05 §A.8. The quality ladder, stepped down by `<PerformanceMonitor>` and never
 * stepped back up inside a session, because oscillation looks worse than one rung of
 * lost quality.
 *
 *   0  full quality
 *   1  dpr forced to 1.0                      (~45% of the fragment cost)
 *   2  contact shadow dropped, environment 32 (~15%)
 *   3  layer-line shader strength 0           (~6%)
 *   4  the canvas unmounts and the turntable takes over
 */
export type QualityRung = 0 | 1 | 2 | 3 | 4;

/**
 * The imperative surface the on-canvas chrome drives. It is filled in by the scene
 * once the dynamic chunk has mounted, so every caller has to tolerate `null`.
 */
export type ViewerHandle = {
  /** `Home`, the reset button and a double tap all land here. */
  reset: () => void;
  /** Multiplies the current distance. Below 1 moves closer. */
  dolly: (factor: number) => void;
  /** Radians. Arrow keys pass `ORBIT.keyOrbitStep`. */
  orbit: (deltaAzimuth: number, deltaPolar: number) => void;
  setAutoRotate: (on: boolean) => void;
  /**
   * RESOLUTIONS §13. Renders explicitly and reads the pixels back in the same task,
   * because the live canvas ships with `preserveDrawingBuffer: false`.
   */
  snapshot: (options?: SnapshotOptions) => Promise<Blob>;
};

export type ViewerHandleRef = { current: ViewerHandle | null };

/** What the entry hands the scene so the scene never reads the DOM itself. */
export type SceneShellProps = {
  /** The wrapper that carries `touch-action`, owned by the entry. */
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  handleRef: ViewerHandleRef;
  /** Called once the scene is interactive, so the chrome can enable its buttons. */
  onReady: () => void;
  /** Doc 05 §A.6. A lost context or a refused model demotes, silently and stickily. */
  onDemote: (to: RenderMode) => void;
  onQualityRung: (rung: QualityRung) => void;
  /** Doc 05 §A.8. False when the wrapper is off screen or the tab is hidden. */
  active: boolean;
  quality: QualityRung;
  reducedMotion: boolean;
};

/* ------------------------------------------------------------ catalog viewer */

export type ModelViewerProps = {
  /** The `.glb` Shai uploaded, served from Convex file storage. */
  src: string;
  /** The 1200px WebP poster. It is the catalog thumbnail, so it is already cached. */
  posterSrc: string;
  /** Hebrew alt text from `docs/design/08-asset-manifest-gptimage2.md`. */
  altHe: string;
  /** Shown in the accessible name, so a screen reader hears which model this is. */
  nameHe?: string;
  /**
   * The 24-frame sprite sheet, 6x4 tiles. Without one the turntable rung falls
   * through to the poster, which is still orderable.
   */
  spriteSrc?: string;
  spriteColumns?: number;
  spriteRows?: number;
  /** Doc 05 §A.4. `glow` gets the emissive treatment and the lights-off switch. */
  finish?: Finish;
  /** Millimetres. Drives the layer-line period. Defaults to the admin's 0.2. */
  layerHeightMm?: number;
  /** Doc 05 §B.3.6. The magnet's payoff is the back, so its hint says so. */
  hintKey?: "drag" | "magnet";
  className?: string;
};

/* ---------------------------------------------------------- generator preview */

/** Anything the generator can hand over as "the photo the visitor chose". */
export type PreviewImageSource =
  | Blob
  | ImageBitmap
  | HTMLImageElement
  | HTMLCanvasElement
  | { pixels: Uint8ClampedArray; width: number; height: number }
  | string;

export type PreviewStageProps = {
  /** The uploaded photo. `null` holds the stage in its skeleton. */
  image: PreviewImageSource | null;
  printType: PrintTypeKey;
  /** `printTypes.geometry` from Convex, merged over the seed row. */
  geometry?: Partial<KernelParams> | null;
  /**
   * What the image analyser found, 0 flat to 1 full relief. A photograph earns the
   * type's whole thickness range; a logo or a drawing gets a shallow step, because
   * inventing relief that the picture never had reads as a printing fault. Defaults
   * to full, so a caller that has not analysed anything is unaffected.
   */
  reliefFactor?: number;
  /** Long edge of the finished piece, millimetres. */
  longEdgeMm: number;
  /** In the order the visitor picked them. The kernel sorts by luminance itself. */
  filaments: FilamentChoice[];
  /** The stand or the frame, which is a separate part with its own colour slot. */
  accessory?: FilamentChoice;
  /** The material. Defaults to the print type's own. */
  finish?: Finish;
  /** `generatorSettings`, one admin document. Defaults to the seed values. */
  settings?: GeneratorSettings;
  /**
   * A build the generator's own engine already produced. When this is present the
   * stage renders it and runs no kernel of its own, which is how a worker-backed
   * engine plugs in later without touching this component.
   */
  build?: BuildOutput | null;
  onBuilt?: (output: BuildOutput) => void;
  onBuildError?: (code: string, message: string) => void;
  /** Doc 05 §B.5.3. The lithophane's light plane, driven from the generator. */
  backlight?: boolean;
  className?: string;
};

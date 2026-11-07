/**
 * src/components/three/index.ts
 *
 * The barrel, and it is deliberately narrow: only the light shell is exported. Every
 * module that imports three, drei or the geometry kernels reaches the browser through
 * `next/dynamic` inside `ModelViewer` and `PreviewStage`, so importing anything from
 * here costs a page nothing beyond the shell itself.
 *
 * `ModelViewerScene`, `PreviewStageScene`, `StudioRig`, `ContactPad`, `CameraRig`,
 * `GlbModel`, `PanelMesh`, `StageCanvas` and `StageGovernor` are intentionally absent.
 * Re-exporting one of them here would put three back in the initial bundle of every
 * route that touches this barrel, which is the one thing the whole split exists to
 * prevent.
 */

export { ModelViewer } from "./ModelViewer";
export { PreviewStage } from "./PreviewStage";
export { LightsOffToggle } from "./LightsOffToggle";
export { ViewerChrome } from "./ViewerChrome";
export { ViewerFallback } from "./ViewerFallback";
export { ViewerSkeleton } from "./ViewerSkeleton";
export { FlatPreview } from "./FlatPreview";

export { VIEWER_COPY, GLOW_COPY } from "./copy";
export {
  useCanvasActive,
  useGestureGuard,
  useReducedMotion,
  useRenderMode,
} from "./useViewerShell";

export type {
  ModelViewerProps,
  PreviewImageSource,
  PreviewStageProps,
  QualityRung,
  RenderMode,
  SceneShellProps,
  ViewerHandle,
  ViewerHandleRef,
} from "./types";
export type { LightsOffToggleProps } from "./LightsOffToggle";
export type { ViewerChromeProps } from "./ViewerChrome";
export type { ViewerFallbackProps } from "./ViewerFallback";
export type { ViewerSkeletonProps } from "./ViewerSkeleton";
export type { FlatPreviewProps } from "./FlatPreview";

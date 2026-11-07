"use client";

/**
 * src/components/three/StageCanvas.tsx
 *
 * Doc 05 §0.3 and §0.4. The one `<Canvas>` configuration both viewers share.
 *
 * ## Tone mapping
 *
 * `NeutralToneMapping` (Khronos PBR Neutral), never ACES. ACES pulls saturated reds
 * toward orange and desaturates exactly the candy colours this brand is built on, so
 * a `#F5333F` filament renders as dull brick. PBR Neutral was designed for product
 * viewers: it holds hue on saturated albedo and still rolls off highlights. It is the
 * single most visible renderer setting on the site.
 *
 * ## `preserveDrawingBuffer` stays false
 *
 * RESOLUTIONS §13. True forces the driver to keep a second copy of every frame and
 * costs roughly a fifth of the fill rate on a phone. Snapshots are taken by rendering
 * explicitly and reading the pixels back in the same task, which is what
 * `src/lib/three/snapshot.ts` does.
 *
 * ## One context per page
 *
 * Mobile Safari drops the oldest WebGL context at about four, Chrome at sixteen. A
 * grid of product cards each with its own canvas is how blank tiles happen on an
 * iPhone. The counter below turns a second live canvas into a development warning
 * rather than a bug report from a phone nobody has.
 */

import { Canvas, type RootState } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { CAMERA, dprRange } from "@/lib/three/constants";

let liveContexts = 0;

export type StageCanvasProps = {
  children: React.ReactNode;
  /** Doc 05 §A.6. In-app webviews kill contexts when the app is backgrounded. */
  onContextLost: () => void;
  onContextRestored: () => void;
  /** Fixed at creation. The quality ladder changes it later through `setDpr`. */
  initialDpr?: [number, number];
  className?: string;
};

export function StageCanvas({
  children,
  onContextLost,
  onContextRestored,
  initialDpr,
  className,
}: StageCanvasProps) {
  const callbacks = React.useRef({ onContextLost, onContextRestored });
  callbacks.current = { onContextLost, onContextRestored };

  React.useEffect(() => {
    liveContexts += 1;
    if (process.env.NODE_ENV !== "production" && liveContexts > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        `[shai/three] ${liveContexts} WebGL canvases are mounted at once. Doc 05 §0.3 allows one per page.`,
      );
    }
    return () => {
      liveContexts -= 1;
    };
  }, []);

  const onCreated = React.useCallback((state: RootState) => {
    const gl = state.gl;
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
    gl.outputColorSpace = THREE.SRGBColorSpace;

    // RESOLUTIONS §16. The canvas carries no accessible name of its own: the wrapper
    // is the focusable `group` and a sibling paragraph is the text alternative. A
    // named canvas here would produce a second, silent node in the tree.
    const element = gl.domElement;
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("tabindex", "-1");

    const lost = (event: Event) => {
      // Without `preventDefault` the browser never fires `webglcontextrestored`.
      event.preventDefault();
      callbacks.current.onContextLost();
    };
    const restored = () => callbacks.current.onContextRestored();
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", restored);
  }, []);

  return (
    <Canvas
      className={className}
      frameloop="demand"
      dpr={initialDpr ?? dprRange()}
      shadows={false}
      // Doc 05 §A.5. There is no floor plane, only `ContactShadows`, so a shadow map
      // would be a depth pass with nothing to catch it.
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: [0, 0, 30] }}
      onCreated={onCreated}
    >
      {children}
    </Canvas>
  );
}

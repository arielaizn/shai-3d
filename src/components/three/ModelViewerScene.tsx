"use client";

/**
 * src/components/three/ModelViewerScene.tsx
 *
 * The heavy half of the catalog viewer. Everything that imports three lives on this
 * side of the `next/dynamic` boundary, so a visitor who only reads the home page
 * downloads none of it.
 *
 * The tree is deliberately shallow: rig, model, pad, camera, governor. Doc 05 §A
 * describes exactly these five things and nothing else, and a product viewer that
 * grows a sixth is a product viewer that has started rendering something the visitor
 * did not ask to see.
 */

import * as React from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import type { BoundingSphere } from "@/lib/three/cameraFit";
import type { Finish } from "@/lib/three/constants";

import { CameraRig } from "./CameraRig";
import { ContactPad } from "./ContactPad";
import { GlbModel, SceneErrorBoundary } from "./GlbModel";
import { StageCanvas } from "./StageCanvas";
import { StageGovernor } from "./StageGovernor";
import { StudioRig } from "./StudioRig";
import type { QualityRung, ViewerHandleRef } from "./types";

/** Something to frame while the bytes are still arriving. 5cm, a small keychain. */
const PLACEHOLDER: BoundingSphere = { center: [0, 0, 0], radius: 5 };

export type ModelViewerSceneProps = {
  src: string;
  finish?: Finish;
  layerHeightMm?: number;
  unitScale?: number;
  handleRef: ViewerHandleRef;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  active: boolean;
  quality: QualityRung;
  reducedMotion: boolean;
  autoRotate: boolean;
  openPoles?: boolean;
  onQualityRung: (rung: QualityRung) => void;
  onLoaded: () => void;
  onFailed: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
};

export default function ModelViewerScene({
  src,
  finish = "matte",
  layerHeightMm = 0.2,
  unitScale = 1,
  handleRef,
  controlsRef,
  active,
  quality,
  reducedMotion,
  autoRotate,
  openPoles = false,
  onQualityRung,
  onLoaded,
  onFailed,
  onContextLost,
  onContextRestored,
}: ModelViewerSceneProps) {
  const [sphere, setSphere] = React.useState<BoundingSphere>(PLACEHOLDER);
  const [floorY, setFloorY] = React.useState(-PLACEHOLDER.radius);

  const onFit = React.useCallback(
    (next: BoundingSphere, nextFloor: number) => {
      setSphere(next);
      setFloorY(nextFloor);
      onLoaded();
    },
    [onLoaded],
  );

  const onOverBudget = React.useCallback(
    (triangles: number) => {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[shai/three] ${triangles} triangles is past the 400,000 hard budget.`);
      }
      onFailed();
    },
    [onFailed],
  );

  const fitDistance = sphere.radius * 3;

  return (
    <StageCanvas onContextLost={onContextLost} onContextRestored={onContextRestored}>
      <StageGovernor active={active} quality={quality} onQualityRung={onQualityRung} />

      <StudioRig distance={fitDistance} quality={quality} />

      <SceneErrorBoundary onError={onFailed}>
        <React.Suspense fallback={null}>
          <GlbModel
            src={src}
            finish={finish}
            layerHeightMm={layerHeightMm}
            unitScale={unitScale}
            reducedMotion={reducedMotion}
            onFit={onFit}
            onOverBudget={onOverBudget}
          />
        </React.Suspense>
      </SceneErrorBoundary>

      {quality < 2 ? <ContactPad radius={sphere.radius} floorY={floorY} /> : null}

      <CameraRig
        sphere={sphere}
        handleRef={handleRef}
        controlsRef={controlsRef}
        reducedMotion={reducedMotion}
        autoRotate={autoRotate}
        openPoles={openPoles}
      />
    </StageCanvas>
  );
}

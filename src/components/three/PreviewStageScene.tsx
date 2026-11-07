"use client";

/**
 * src/components/three/PreviewStageScene.tsx
 *
 * The heavy half of the generator's preview. Doc 05 §B.5: the same renderer, the same
 * tone mapping and the same rig as the catalog, with three differences.
 *
 *   1. The camera swings in from `-34` to `+8` degrees of azimuth over 900ms, so the
 *      visitor sees the object move without touching it. That is the fastest way to
 *      teach somebody a thing is three dimensional.
 *   2. Auto-rotate is off from the start. The visitor just made this; they will reach
 *      for it, and a turntable competing with their finger is friction.
 *   3. For a backlit type the rig dims, because a lithophane under the full studio key
 *      is a flat grey slab, which is what it looks like in daylight and exactly not
 *      what sells it.
 *
 * Rung 4 of the quality ladder is disabled here: there is no sprite sheet of a model
 * that was generated ninety seconds ago, so the ladder bottoms out at rung 3.
 */

import * as React from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import type { BoundingSphere } from "@/lib/three/cameraFit";
import type { Finish } from "@/lib/three/constants";
import type { PanelResult } from "@/lib/three/geometry/types";

import { CameraRig } from "./CameraRig";
import { ContactPad } from "./ContactPad";
import { PanelMesh } from "./PanelMesh";
import { StageCanvas } from "./StageCanvas";
import { StageGovernor } from "./StageGovernor";
import { StudioRig } from "./StudioRig";
import type { QualityRung, ViewerHandleRef } from "./types";

export type PreviewStageSceneProps = {
  panel: PanelResult;
  backlit: boolean;
  backlightOn: boolean;
  lightsOff: boolean;
  hasGlow: boolean;
  finish: Finish;
  layerHeightMm: number;
  /** Doc 05 §B.3.6. The magnet's payoff is its back, so its poles stay open. */
  openPoles?: boolean;
  handleRef: ViewerHandleRef;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  active: boolean;
  quality: QualityRung;
  reducedMotion: boolean;
  onQualityRung: (rung: QualityRung) => void;
  onReady: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
};

export default function PreviewStageScene({
  panel,
  backlit,
  backlightOn,
  lightsOff,
  hasGlow,
  finish,
  layerHeightMm,
  openPoles = false,
  handleRef,
  controlsRef,
  active,
  quality,
  reducedMotion,
  onQualityRung,
  onReady,
  onContextLost,
  onContextRestored,
}: PreviewStageSceneProps) {
  const sphere = React.useMemo<BoundingSphere>(
    () => ({ center: panel.center, radius: panel.radius }),
    [panel],
  );

  // Written by `PanelMesh` every frame of the lights-off ramp and read by `StudioRig`
  // in the same frame, so the room dims without a React render.
  const lightScaleRef = React.useRef(1);

  const floorY = panel.center[1] - panel.boundingMm.y / 20;
  const fitDistance = sphere.radius * 3;

  return (
    <StageCanvas onContextLost={onContextLost} onContextRestored={onContextRestored}>
      <StageGovernor
        active={active}
        quality={quality}
        onQualityRung={onQualityRung}
        allowFallback={false}
      />

      <StudioRig
        distance={fitDistance}
        backlit={backlit && backlightOn}
        lightScaleRef={lightScaleRef}
        quality={quality}
      />

      <PanelMesh
        panel={panel}
        backlit={backlit}
        backlightOn={backlightOn}
        lightsOff={lightsOff}
        hasGlow={hasGlow}
        reducedMotion={reducedMotion}
        finish={finish}
        layerHeightMm={layerHeightMm}
        quality={quality}
        lightScaleRef={lightScaleRef}
      />

      {quality < 2 && !lightsOff ? (
        <ContactPad radius={sphere.radius} floorY={floorY} />
      ) : null}

      <CameraRig
        sphere={sphere}
        handleRef={handleRef}
        controlsRef={controlsRef}
        reducedMotion={reducedMotion}
        autoRotate={false}
        entrance="swing"
        openPoles={openPoles}
        onReady={onReady}
      />
    </StageCanvas>
  );
}

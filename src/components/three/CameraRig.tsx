"use client";

/**
 * src/components/three/CameraRig.tsx
 *
 * Doc 05 §A.1 and §A.2. Framing, orbiting, and the imperative surface the on-canvas
 * chrome and the keyboard drive.
 *
 * The framing maths itself lives in `src/lib/three/cameraFit.ts` and is not repeated
 * here: the poster studio, the catalog and the generator all have to frame an object
 * identically, because a poster rendered at one distance crossfading into a canvas
 * that arrives at another produces a visible jump, and that jump is what makes a load
 * sequence feel cheap.
 *
 * Everything moving in this file writes straight to the camera and calls
 * `invalidate()`. Under `frameloop="demand"` a render only happens when something
 * asks for one, so an animation that forgets to ask simply never plays.
 */

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import {
  clamp,
  easeOutBack,
  easeOutCubic,
  fitPose,
  lerp,
  type BoundingSphere,
  type FitPose,
} from "@/lib/three/cameraFit";
import { ORBIT } from "@/lib/three/constants";
import { captureCanvas, type SnapshotOptions } from "@/lib/three/snapshot";

import type { ViewerHandleRef } from "./types";

/** Doc 05 §B.5.1. The generator opens with a swing so nobody has to be told it is 3D. */
const SWING_FROM = (-34 * Math.PI) / 180;
const SWING_TO = (8 * Math.PI) / 180;
const SWING_MS = 900;

type Animation =
  | { kind: "pose"; t0: number; ms: number; from: FitPose; to: FitPose }
  | { kind: "azimuth"; t0: number; ms: number; from: number; to: number }
  | { kind: "distance"; t0: number; ms: number; from: number; to: number };

export type CameraRigProps = {
  sphere: BoundingSphere;
  handleRef: ViewerHandleRef;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  reducedMotion: boolean;
  /** The catalog turns on its own until touched. The generator never does. */
  autoRotate: boolean;
  /** `swing` is the generator's opening move. */
  entrance?: "swing" | "none";
  /** Doc 05 §B.3.6. The magnet's payoff is the back, so it keeps the poles open. */
  openPoles?: boolean;
  onReady?: () => void;
};

export function CameraRig({
  sphere,
  handleRef,
  controlsRef,
  reducedMotion,
  autoRotate,
  entrance = "none",
  openPoles = false,
  onReady,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  const aspect = size.height > 0 ? size.width / size.height : 1;
  const pose = React.useMemo(() => fitPose(sphere, aspect), [sphere, aspect]);
  const animation = React.useRef<Animation | null>(null);
  const azimuth = React.useRef(0);

  /** Places the camera on a pose without animating, and syncs the controls' target. */
  const apply = React.useCallback(
    (next: FitPose) => {
      camera.position.set(next.position[0], next.position[1], next.position[2]);
      camera.lookAt(next.target[0], next.target[1], next.target[2]);
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(next.target[0], next.target[1], next.target[2]);
        controls.minDistance = next.minDistance;
        controls.maxDistance = next.maxDistance;
        controls.update();
      }
      invalidate();
    },
    [camera, controlsRef, invalidate],
  );

  /* --- arrival ----------------------------------------------------------- */

  React.useEffect(() => {
    azimuth.current = entrance === "swing" && !reducedMotion ? SWING_FROM : 0;
    apply(fitPose(sphere, aspect, azimuth.current));
    if (entrance === "swing" && !reducedMotion) {
      animation.current = {
        kind: "azimuth",
        t0: performance.now(),
        ms: SWING_MS,
        from: SWING_FROM,
        to: SWING_TO,
      };
      invalidate();
    }
    onReady?.();
    // `pose` is derived from these two, and re-running on every resize would yank the
    // camera out of the visitor's hands mid-orbit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sphere]);

  /* --- the frame --------------------------------------------------------- */

  useFrame(() => {
    const anim = animation.current;
    if (!anim) return;
    const elapsed = performance.now() - anim.t0;
    const t = clamp(elapsed / anim.ms, 0, 1);

    if (anim.kind === "pose") {
      // easeOutBack lands the reset with a small overshoot instead of gliding to a
      // stop, which is the same toy-store settle every other surface on the site has.
      const e = reducedMotion ? easeOutCubic(t) : easeOutBack(t, 1.15);
      camera.position.set(
        lerp(anim.from.position[0], anim.to.position[0], e),
        lerp(anim.from.position[1], anim.to.position[1], e),
        lerp(anim.from.position[2], anim.to.position[2], e),
      );
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(
          lerp(anim.from.target[0], anim.to.target[0], e),
          lerp(anim.from.target[1], anim.to.target[1], e),
          lerp(anim.from.target[2], anim.to.target[2], e),
        );
      }
    } else if (anim.kind === "azimuth") {
      const e = easeOutCubic(t);
      azimuth.current = lerp(anim.from, anim.to, e);
      const next = fitPose(sphere, aspect, azimuth.current);
      camera.position.set(next.position[0], next.position[1], next.position[2]);
    } else {
      const e = easeOutCubic(t);
      const controls = controlsRef.current;
      const target = controls ? controls.target : new THREE.Vector3(...sphere.center);
      const offset = camera.position.clone().sub(target);
      const length = offset.length() || 1;
      offset.multiplyScalar(lerp(anim.from, anim.to, e) / length);
      camera.position.copy(target).add(offset);
    }

    controlsRef.current?.update();
    if (t >= 1) animation.current = null;
    else invalidate();
  });

  /* --- the handle -------------------------------------------------------- */

  React.useEffect(() => {
    const controls = controlsRef.current;

    const handle = {
      reset: () => {
        const from: FitPose = {
          ...pose,
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: controls
            ? [controls.target.x, controls.target.y, controls.target.z]
            : pose.target,
        };
        animation.current = {
          kind: "pose",
          t0: performance.now(),
          ms: reducedMotion ? 200 : ORBIT.resetMs,
          from,
          to: pose,
        };
        azimuth.current = 0;
        if (controls) controls.autoRotate = false;
        invalidate();
      },

      dolly: (factor: number) => {
        const target = controls ? controls.target : new THREE.Vector3(...sphere.center);
        const current = camera.position.distanceTo(target);
        const next = clamp(current * factor, pose.minDistance, pose.maxDistance);
        animation.current = {
          kind: "distance",
          t0: performance.now(),
          ms: reducedMotion ? 120 : 260,
          from: current,
          to: next,
        };
        invalidate();
      },

      orbit: (deltaAzimuth: number, deltaPolar: number) => {
        const target = controls ? controls.target : new THREE.Vector3(...sphere.center);
        const offset = camera.position.clone().sub(target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta += deltaAzimuth;
        spherical.phi = clamp(spherical.phi + deltaPolar, ORBIT.minPolar, ORBIT.maxPolar);
        offset.setFromSpherical(spherical);
        camera.position.copy(target).add(offset);
        if (controls) {
          controls.autoRotate = false;
          controls.update();
        }
        invalidate();
      },

      setAutoRotate: (on: boolean) => {
        if (controls) controls.autoRotate = on;
        invalidate();
      },

      /**
       * RESOLUTIONS §13. The render and the read happen in one task, with no `await`
       * between them, because the live canvas ships with `preserveDrawingBuffer: false`
       * and the colour buffer is gone the moment the browser composites.
       */
      snapshot: (options?: SnapshotOptions) =>
        captureCanvas(
          { render: () => gl.render(scene, camera), canvas: gl.domElement },
          options,
        ),
    };

    handleRef.current = handle;
    return () => {
      if (handleRef.current === handle) handleRef.current = null;
    };
  }, [camera, gl, scene, pose, sphere, reducedMotion, controlsRef, handleRef, invalidate]);

  return (
    <OrbitControls
      makeDefault
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={reducedMotion ? ORBIT.dampingFactorReduced : ORBIT.dampingFactor}
      rotateSpeed={ORBIT.rotateSpeed}
      zoomSpeed={ORBIT.zoomSpeed}
      /* Doc 05 §A.7. Zoom starts off and is re-enabled per gesture by GestureGuard,
         which is what makes the mouse wheel scroll the page instead of the model. */
      enableZoom={false}
      minDistance={pose.minDistance}
      maxDistance={pose.maxDistance}
      minPolarAngle={openPoles ? 0.06 : ORBIT.minPolar}
      maxPolarAngle={openPoles ? Math.PI - 0.06 : ORBIT.maxPolar}
      autoRotate={autoRotate && !reducedMotion}
      autoRotateSpeed={ORBIT.autoRotateSpeed}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
      keyPanSpeed={0}
    />
  );
}

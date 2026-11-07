/**
 * src/lib/three/cameraFit.ts
 *
 * Doc 05 §A.1. The framing maths, kept pure so the poster studio, the catalog viewer
 * and the generator all frame an object identically. A poster rendered at one
 * distance and a canvas that arrives at another produces a visible jump on the
 * crossfade, and that jump is what makes a load sequence feel cheap.
 *
 * No three.js import: this is arithmetic over a bounding sphere, and keeping it free
 * of three means it can run in a worker or a test with no WebGL context.
 */

import { CAMERA, FIT_DIRECTION, FIT_PADDING, ORBIT } from "./constants";

export type Vec3 = [number, number, number];

export type BoundingSphere = { center: Vec3; radius: number };

export type FitPose = {
  /** Scene units (centimetres) from the target. */
  distance: number;
  position: Vec3;
  target: Vec3;
  minDistance: number;
  maxDistance: number;
};

/**
 * The distance at which a sphere of `radius` fills the frame with `FIT_PADDING` of
 * air around it. `sin(fov/2)` is the half-angle of the vertical frustum, so
 * `radius / sin(fov/2)` is the distance at which the sphere exactly touches the top
 * and bottom of the frame.
 */
export function fitDistance(radius: number, fovDeg: number = CAMERA.fov): number {
  const safeRadius = Math.max(radius, 1e-4);
  return (safeRadius / Math.sin((fovDeg * Math.PI) / 360)) * FIT_PADDING;
}

/**
 * A portrait phone is much taller than it is wide, so a wide object framed by the
 * vertical fov alone runs off both edges. three's perspective camera derives the
 * horizontal fov from the aspect, so below 1:1 the fit distance has to grow by
 * exactly the aspect deficit.
 */
export function fitDistanceForAspect(radius: number, aspect: number, fovDeg: number = CAMERA.fov): number {
  const base = fitDistance(radius, fovDeg);
  return aspect >= 1 ? base : base / Math.max(aspect, 0.35);
}

/**
 * The hero pose. `azimuth` rotates the start position around the object's vertical
 * axis so the poster studio's chosen `posterAzimuth` and the site's first 3D frame
 * land on the same view.
 */
export function fitPose(sphere: BoundingSphere, aspect = 1, azimuth = 0): FitPose {
  const distance = fitDistanceForAspect(sphere.radius, aspect);
  const dx = FIT_DIRECTION.x;
  const dz = FIT_DIRECTION.z;
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  const position: Vec3 = [
    sphere.center[0] + distance * (dx * cos + dz * sin),
    sphere.center[1] + distance * FIT_DIRECTION.y,
    sphere.center[2] + distance * (dz * cos - dx * sin),
  ];
  return {
    distance,
    position,
    target: [...sphere.center] as Vec3,
    minDistance: distance * ORBIT.minDistanceFactor,
    maxDistance: distance * ORBIT.maxDistanceFactor,
  };
}

/**
 * `easeOutBack` with the overshoot doc 05 §A.2 asks for on the camera reset, so the
 * pose lands with a small bounce instead of gliding to a stop. `c1` is the standard
 * back constant scaled to the requested overshoot.
 */
export function easeOutBack(t: number, overshoot = 1.15): number {
  const c1 = 1.70158 * overshoot;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

export function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * A bounding sphere straight from an axis-aligned box. Used by the generator, where
 * the worker already knows the box and computing a tighter sphere over 130,000
 * vertices to save a few percent of framing would cost more than it returns.
 */
export function sphereFromBox(min: Vec3, max: Vec3): BoundingSphere {
  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const dx = max[0] - min[0];
  const dy = max[1] - min[1];
  const dz = max[2] - min[2];
  return { center, radius: Math.sqrt(dx * dx + dy * dy + dz * dz) / 2 };
}

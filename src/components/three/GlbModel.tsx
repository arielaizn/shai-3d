"use client";

/**
 * src/components/three/GlbModel.tsx
 *
 * Doc 05 §A.4 and §A.6. One uploaded `.glb`, normalised into printed plastic and
 * dropped into the scene.
 *
 * ## Vertex and triangle ceiling, enforced here
 *
 * The upload contract in doc 05 §A.8 targets 120,000 triangles and hard-rejects above
 * 400,000. Validation happens in the admin action, but a model that predates the
 * validator, or one an admin forced through, must not be allowed to lock a phone. So
 * the count is taken again after decode, and a model over `TRIANGLE_HARD` never
 * reaches the GPU: the viewer demotes to the turntable rung and the page stays
 * orderable with a live price, which is the rule the whole fallback ladder exists for.
 *
 * ## Suspense
 *
 * The loader is wrapped in a tiny resource cache so the component can suspend. The
 * poster underneath is a DOM layer, not a three fallback, because it has to be on
 * screen before the canvas has a context at all. `<Suspense fallback={null}>` inside
 * the canvas therefore renders nothing while the bytes arrive and the poster shows
 * through the transparent canvas.
 *
 * The cache holds three models. Anything older with nothing mounted on it is disposed,
 * because a viewer that mounts and unmounts on every product page otherwise leaks the
 * whole catalog into GPU memory inside a minute of browsing.
 */

import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { easeOutBack, sphereFromBox, type BoundingSphere } from "@/lib/three/cameraFit";
import { GLTF_UNITS_TO_SCENE, type Finish } from "@/lib/three/constants";
import { loadGlb, type LoadedModel } from "@/lib/three/loaders";
import { normalisePrintedMaterials } from "@/lib/three/printedMaterial";

/** Doc 05 §A.8, the upload budget, re-checked at runtime. */
export const TRIANGLE_TARGET = 120_000;
export const TRIANGLE_HARD = 400_000;

/** Doc 05 §A.6. The arrival: one small bounce, and the whole motion language in it. */
const ARRIVAL_MS = 380;

/* ------------------------------------------------------------- the cache */

type Entry = {
  key: string;
  /** Never rejects, so throwing it to Suspense cannot produce an unhandled rejection. */
  promise: Promise<void>;
  value?: LoadedModel;
  error?: unknown;
  mounted: number;
};

const CACHE = new Map<string, Entry>();
const CACHE_LIMIT = 3;

function evict(): void {
  if (CACHE.size <= CACHE_LIMIT) return;
  for (const [key, entry] of CACHE) {
    if (CACHE.size <= CACHE_LIMIT) break;
    if (entry.mounted > 0) continue;
    entry.value?.dispose();
    CACHE.delete(key);
  }
}

function resource(url: string, finish: Finish, layerHeightMm: number, unitScale: number): Entry {
  const key = `${url}|${finish}|${layerHeightMm}|${unitScale}`;
  const existing = CACHE.get(key);
  if (existing) return existing;

  const entry: Entry = { key, promise: Promise.resolve(), value: undefined, mounted: 0 };
  entry.promise = loadGlb(url).then(
    (model) => {
      // Normalised once per cache entry, not once per mount: `patchLayerLines` stacks
      // an `onBeforeCompile` each time it is called, and three would recompile the
      // program on every remount.
      normalisePrintedMaterials(model.scene, {
        finish,
        layerHeightCm: layerHeightMm / 10,
        upAxis: "y",
      });
      model.scene.scale.setScalar(GLTF_UNITS_TO_SCENE * unitScale);
      model.scene.updateMatrixWorld(true);
      entry.value = model;
    },
    (error) => {
      entry.error = error;
    },
  );
  CACHE.set(key, entry);
  evict();
  return entry;
}

function useGlb(url: string, finish: Finish, layerHeightMm: number, unitScale: number): LoadedModel {
  const entry = resource(url, finish, layerHeightMm, unitScale);
  React.useEffect(() => {
    entry.mounted += 1;
    return () => {
      entry.mounted -= 1;
      evict();
    };
  }, [entry]);

  if (entry.error) throw entry.error;
  if (!entry.value) throw entry.promise;
  return entry.value;
}

/* ---------------------------------------------------------------- counting */

export function countTriangles(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const index = geometry.getIndex();
    const position = geometry.getAttribute("position");
    triangles += index ? index.count / 3 : position ? position.count / 3 : 0;
  });
  return triangles;
}

/* ---------------------------------------------------------------- component */

export type GlbModelProps = {
  src: string;
  finish?: Finish;
  layerHeightMm?: number;
  /** glTF ships metres and the scene is centimetres, so the default multiplies by 100. */
  unitScale?: number;
  reducedMotion: boolean;
  /** Fired once the bounding sphere is known, so the camera can frame it. */
  onFit: (sphere: BoundingSphere, floorY: number) => void;
  /** Fired when the model is past the hard triangle budget. Demotes the whole viewer. */
  onOverBudget: (triangles: number) => void;
};

export function GlbModel({
  src,
  finish = "matte",
  layerHeightMm = 0.2,
  unitScale = 1,
  reducedMotion,
  onFit,
  onOverBudget,
}: GlbModelProps) {
  const model = useGlb(src, finish, layerHeightMm, unitScale);
  const group = React.useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const arrivedAt = React.useRef<number | null>(null);

  const measurement = React.useMemo(() => {
    const box = new THREE.Box3().setFromObject(model.scene);
    const sphere = sphereFromBox(
      [box.min.x, box.min.y, box.min.z],
      [box.max.x, box.max.y, box.max.z],
    );
    return { sphere, floorY: box.min.y, triangles: countTriangles(model.scene) };
  }, [model]);

  React.useEffect(() => {
    if (measurement.triangles > TRIANGLE_HARD) {
      onOverBudget(measurement.triangles);
      return;
    }
    onFit(measurement.sphere, measurement.floorY);
    arrivedAt.current = reducedMotion ? null : performance.now();
    if (group.current && reducedMotion) group.current.scale.setScalar(1);
    invalidate();
  }, [measurement, onFit, onOverBudget, reducedMotion, invalidate]);

  useFrame(() => {
    const start = arrivedAt.current;
    if (start === null || !group.current) return;
    const t = Math.min(1, (performance.now() - start) / ARRIVAL_MS);
    group.current.scale.setScalar(0.94 + 0.06 * easeOutBack(t, 1.2));
    if (t >= 1) arrivedAt.current = null;
    else invalidate();
  });

  if (measurement.triangles > TRIANGLE_HARD) return null;

  return (
    <group ref={group} scale={reducedMotion ? 1 : 0.94}>
      <primitive object={model.scene} />
    </group>
  );
}

/**
 * An error boundary that lives inside the three reconciler. A load failure or a bad
 * buffer must not blank the page, so it renders nothing and lets the viewer step down
 * a rung, exactly like a lost context does.
 */
export class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: unknown) => void }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Frees everything the cache holds. Worth calling when the last viewer unmounts. */
export function releaseModelCache(): void {
  for (const [key, entry] of CACHE) {
    if (entry.mounted > 0) continue;
    entry.value?.dispose();
    CACHE.delete(key);
  }
}


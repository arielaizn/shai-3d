/**
 * src/lib/three/loaders.ts
 *
 * Doc 05 §A.6. One configured `GLTFLoader`, and no third-party host anywhere in it.
 *
 * ## meshopt first, DRACO as a read-only fallback
 *
 * |                         | meshopt                          | DRACO                     |
 * |-------------------------|----------------------------------|---------------------------|
 * | decoder payload         | 25 KB, plain JS with inline wasm | 190 KB wasm plus glue     |
 * | decode, 150k tris, mid Android | about 35 ms               | about 210 ms              |
 * | where the decoder comes from   | inside our own bundle     | our own origin, vendored  |
 *
 * `meshopt_decoder.module.js` is a real ES module, so the bundler ships it inside our
 * JS and it costs nothing at runtime beyond its own bytes. DRACO needs wasm files on
 * disk, which `scripts/vendor-decoders.mjs` copies into `public/decoders/draco/`.
 * three's own default and drei's `useGLTF` default both point at Google hosts, and
 * those fail or stall behind exactly the restrictive in-app webviews most of this
 * site's traffic arrives in.
 *
 * The DRACO path exists for one case only: a `.glb` Shai downloaded from a model site
 * and uploaded as-is. Our own pipeline always outputs meshopt.
 */

import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export const DRACO_DECODER_PATH = "/decoders/draco/";

let draco: DRACOLoader | null = null;

function dracoLoader(): DRACOLoader {
  if (!draco) {
    draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);
    draco.setDecoderConfig({ type: "wasm" });
  }
  return draco;
}

/**
 * A loader with both decoders attached. `manager` is optional so a caller that wants
 * its own byte counting can pass a private `LoadingManager` instead of sharing the
 * global one with every other loader on the page.
 */
export function createGltfLoader(manager?: THREE.LoadingManager): GLTFLoader {
  const loader = new GLTFLoader(manager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.setDRACOLoader(dracoLoader());
  return loader;
}

export type LoadProgress = {
  /** 0..1, or `null` when the response carried no content length. */
  ratio: number | null;
  loaded: number;
  total: number;
};

export type LoadedModel = {
  scene: THREE.Group;
  /** Everything the loader allocated, so the caller can dispose it on unmount. */
  dispose: () => void;
};

/**
 * Loads one `.glb` and hands back the root group.
 *
 * `signal` matters more than it looks: a visitor who taps a product, sees the wrong
 * thing and goes back has a multi-megabyte download in flight, and on a phone that
 * download is competing with the next page's own model.
 */
export function loadGlb(
  url: string,
  options: { onProgress?: (p: LoadProgress) => void; signal?: AbortSignal } = {},
): Promise<LoadedModel> {
  return new Promise<LoadedModel>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const manager = new THREE.LoadingManager();
    const loader = createGltfLoader(manager);
    let cancelled = false;

    const onAbort = () => {
      cancelled = true;
      reject(new DOMException("aborted", "AbortError"));
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    loader.load(
      url,
      (gltf) => {
        options.signal?.removeEventListener("abort", onAbort);
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }
        resolve({ scene: gltf.scene, dispose: () => disposeObject(gltf.scene) });
      },
      (event) => {
        if (cancelled) return;
        // A cached response has `lengthComputable === false` and `total === 0`. Doc 05
        // §A.6 is explicit that the bar then jumps to done rather than faking a crawl.
        const total = event.total ?? 0;
        options.onProgress?.({
          ratio: total > 0 ? Math.min(1, event.loaded / total) : null,
          loaded: event.loaded ?? 0,
          total,
        });
      },
      (error) => {
        options.signal?.removeEventListener("abort", onAbort);
        if (cancelled) return;
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Frees every geometry, material and texture under a root. three does not do this for
 * you, and a viewer that mounts and unmounts on every product page leaks the whole
 * catalog into GPU memory inside a minute of browsing.
 */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const mat of list) {
      for (const value of Object.values(mat)) {
        if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
      }
      mat.dispose();
    }
  });
}

/** Releases the DRACO worker pool. Worth calling when the last viewer unmounts. */
export function releaseDecoders(): void {
  draco?.dispose();
  draco = null;
}

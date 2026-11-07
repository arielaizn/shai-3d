/**
 * src/lib/three/snapshot.ts
 *
 * RESOLUTIONS.md §13, which was a critical finding.
 *
 * With `preserveDrawingBuffer: false` (which is what the live canvas must ship with,
 * because true forces the driver to keep a second copy of every frame and costs
 * roughly 20% of the fill rate on a phone) the colour buffer is cleared the moment
 * the browser composites. So `toDataURL` or `toBlob` called from a click handler, an
 * effect, or any later task returns a fully transparent PNG. With
 * `frameloop="demand"` it is transparent every single time, deterministically.
 *
 * The fix is not to turn the flag on. It is to render explicitly and read the pixels
 * back **inside the same task**: `gl.render(scene, camera)` and then `toBlob` with no
 * `await` between them. `toBlob` itself is asynchronous, but the browser snapshots the
 * buffer at the call, not at the callback, so the capture is valid.
 *
 * The live canvas never sets `preserveDrawingBuffer`. Nothing in this file needs it.
 */

export type SnapshotTargets = {
  render: () => void;
  canvas: HTMLCanvasElement;
};

export type SnapshotOptions = {
  type?: "image/webp" | "image/png";
  quality?: number;
};

/**
 * Renders once and captures. The `render` callback must call `gl.render(scene, camera)`
 * synchronously; anything that defers (a `requestAnimationFrame`, a promise, an r3f
 * `invalidate`) puts a composite between the draw and the read and hands back an empty
 * image.
 */
export function captureCanvas(
  targets: SnapshotTargets,
  options: SnapshotOptions = {},
): Promise<Blob> {
  const type = options.type ?? "image/webp";
  const quality = options.quality ?? 0.82;

  return new Promise<Blob>((resolve, reject) => {
    try {
      targets.render();
      targets.canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) resolve(blob);
          else reject(new Error("snapshot: the canvas produced an empty blob"));
        },
        type,
        quality,
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * The same capture as a data URL, for the cases where a blob is inconvenient (an
 * `<img>` src in a confirmation card, for instance). Still one synchronous task.
 */
export function captureCanvasDataUrl(
  targets: SnapshotTargets,
  options: SnapshotOptions = {},
): string {
  targets.render();
  return targets.canvas.toDataURL(options.type ?? "image/webp", options.quality ?? 0.82);
}

/**
 * A cheap guard for the failure this file exists to prevent. Reads the four corners
 * and the centre of a captured bitmap; if every one of them is fully transparent the
 * capture was taken after a composite and the caller should retry inside a render.
 */
export async function looksBlank(blob: Blob): Promise<boolean> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
    return false;
  }
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return false;
  }
  ctx.drawImage(bitmap, 0, 0);
  const w = bitmap.width;
  const h = bitmap.height;
  const points: [number, number][] = [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
    [Math.floor(w / 2), Math.floor(h / 2)],
  ];
  bitmap.close();
  return points.every(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] === 0);
}

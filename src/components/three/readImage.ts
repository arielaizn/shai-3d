/**
 * src/components/three/readImage.ts
 *
 * Doc 05 §B.1 stage 1. Whatever the generator hands over becomes one RGBA buffer at
 * the working grid, and nothing else in the 3D layer ever touches a `File`.
 *
 * `createImageBitmap` does the decode and the resample on a browser-internal thread,
 * which is why a 12MP phone JPEG reaches a 320 grid in about 250ms on a mid Android
 * without costing the main thread a frame. `<img>` plus `canvas.drawImage` blocks for
 * the whole decode and downsamples worse.
 *
 * `imageOrientation: "from-image"` is not optional: without it every portrait taken on
 * a phone arrives on its side, and the visitor blames the site.
 */

import { BuildError } from "@/lib/three/geometry/types";

import { gridDimensions } from "./panelKernel";
import type { PreviewImageSource } from "./types";

export type ReadImageResult = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
};

type Drawable = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

function isDrawable(source: unknown): source is Drawable {
  if (typeof source !== "object" || source === null) return false;
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) return true;
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) return true;
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) return true;
  return false;
}

function sourceSize(source: Drawable): { width: number; height: number } {
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

/** A 2D context on whichever canvas this browser has. Never null on a real device. */
function scratch(width: number, height: number): {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) return { ctx };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new BuildError("IMAGE_UNREADABLE", "no 2d context is available");
  return { ctx };
}

async function toBitmapOrElement(source: Blob | Drawable | string): Promise<Drawable> {
  if (isDrawable(source)) return source;

  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) throw new BuildError("IMAGE_UNREADABLE", `the photo returned ${response.status}`);
    return toBitmapOrElement(await response.blob());
  }

  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(source, {
        imageOrientation: "from-image",
        premultiplyAlpha: "none",
        colorSpaceConversion: "default",
        resizeQuality: "high",
      });
    } catch {
      // Older Safari rejects the options bag outright rather than ignoring it.
    }
  }

  const url = URL.createObjectURL(source);
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new BuildError("IMAGE_UNREADABLE", "the browser refused the file"));
      img.src = url;
    });
    return element;
  } finally {
    // Revoking immediately is safe: the decode has already happened by `onload`.
    URL.revokeObjectURL(url);
  }
}

/**
 * Reads a photo down to `gridLong` on its long edge. Returns the buffer the kernel
 * wants, plus the grid it actually used, which is what the metrics report.
 */
export async function readImage(
  source: PreviewImageSource,
  gridLong: number,
): Promise<ReadImageResult> {
  if (typeof source === "object" && source !== null && "pixels" in source) {
    const given = source as { pixels: Uint8ClampedArray; width: number; height: number };
    if (given.pixels.length < given.width * given.height * 4) {
      throw new BuildError("IMAGE_UNREADABLE", "the pixel buffer does not match its dimensions");
    }
    return { pixels: given.pixels, width: given.width, height: given.height };
  }

  const drawable = await toBitmapOrElement(source as Blob | Drawable | string);
  const size = sourceSize(drawable);
  if (size.width < 8 || size.height < 8) {
    throw new BuildError("IMAGE_TOO_SMALL", "the photo is under 8 pixels on an edge");
  }
  const { w, h } = gridDimensions(gridLong, size.width / size.height);
  const { ctx } = scratch(w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(drawable as CanvasImageSource, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  if (typeof ImageBitmap !== "undefined" && drawable instanceof ImageBitmap) drawable.close();
  return { pixels: data.data, width: w, height: h };
}

"use client";

/**
 * src/components/generator/photo.ts
 *
 * The photo, from the file picker to something the server will accept.
 *
 * Three jobs, in one pass over the decoded image, because a mid-range Android on a
 * warm battery decodes a 12MP JPEG once and not three times:
 *
 *   1. a downscaled WebP copy to upload
 *   2. the quality notes the step shows (small, dark, blown, transparent, flat)
 *   3. the rows the print-bed wait state builds, measured from the visitor's own
 *      picture, so what rises out of the bed is their photo and not a stock shape
 *
 * **Why the copy is downscaled before it is uploaded.** The copy beside the control
 * says 25 מגה, which is what a phone photo can weigh, and `drafts.attachPhoto`
 * rejects anything over 10MB. Both are right: the visitor hands over the file their
 * camera made, and what crosses the network is a 1600px WebP that is almost always
 * under 400KB. It costs one canvas and it is the difference between working and not
 * working on 4G.
 *
 * **EXIF.** `createImageBitmap(file, { imageOrientation: "from-image" })` is what
 * keeps a portrait iPhone photo upright. Without it every second upload arrives
 * lying on its side, and the visitor blames the site.
 */

import type { BedRow, PhotoWarning } from "./types";
import { analyzeImage, type ImageAnalysis } from "@/lib/three/geometry/analyze";

/** The formats `drafts.attachPhoto` accepts, plus the two HEIC spellings. */
const ACCEPTED = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** 09c §6.3: `JPG · PNG · WEBP · HEIC · עד 25 מגה`. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** The long edge of the uploaded copy. Enough for Shai to print from. */
const UPLOAD_LONG_EDGE = 1600;

/** The grid every measurement is taken on. Small, and plenty for what it answers. */
const SAMPLE_LONG_EDGE = 64;

/** Doc 05 PART D: twenty rows stack out of the bed. */
export const BED_ROWS = 20;

export type PreparedPhoto = {
  blob: Blob;
  localUrl: string;
  width: number;
  height: number;
  warnings: PhotoWarning[];
  rows: BedRow[];
  /** What the file turned out to be. Drives relief depth and the colour count. */
  analysis: ImageAnalysis;
};

export class PhotoPipelineError extends Error {
  readonly kind: "tooBig" | "wrongType" | "unreadable";
  constructor(kind: "tooBig" | "wrongType" | "unreadable") {
    super(kind);
    this.name = "PhotoPipelineError";
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* decoding                                                             */
/* ------------------------------------------------------------------ */

/**
 * `createImageBitmap` first, an `<img>` second.
 *
 * Safari decodes HEIC natively and Chrome does not, so the second path is not only
 * for old browsers: it is what makes an Android HEIC fail with a sentence instead of
 * a crash. No wasm decoder is shipped for it, because 1.5MB on a phone for one edge
 * case is a worse trade than the camera button beside the picker.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to the <img> path */
    }
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PhotoPipelineError("unreadable"));
    };
    image.src = url;
  });
}

function sizeOf(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function drawTo(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  background: string | null,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new PhotoPipelineError("unreadable");
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PhotoPipelineError("unreadable"))),
      type,
      quality,
    );
  });
}

/* ------------------------------------------------------------------ */
/* measurement                                                          */
/* ------------------------------------------------------------------ */

/** Rec.709 luminance on the raw bytes. Good enough for a warning, cheap enough to run. */
function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

type Measurements = {
  warnings: PhotoWarning[];
  rows: BedRow[];
};

/**
 * One pass over the 64px sample. It answers every quality note the step can show and
 * builds the twenty bed rows at the same time.
 *
 * The silhouette is measured against the corners, which is the honest cheap trick: a
 * photo of a child against a wall has a background that reads the same in all four
 * corners, and a photo with no clear background produces a full-width row, which is
 * exactly what the print bed should show for it.
 */
function measure(pixels: ImageData, longEdge: number, hasAlpha: boolean): Measurements {
  const { width, height, data } = pixels;
  const values = new Float32Array(width * height);
  let sum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = luma(data[i], data[i + 1], data[i + 2]);
    values[p] = value;
    sum += value;
  }

  const mean = sum / values.length;

  const sorted = Float32Array.from(values).sort();
  const at = (percentile: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(percentile * (sorted.length - 1))))];
  const spread = at(0.95) - at(0.05);

  const warnings: PhotoWarning[] = [];
  if (longEdge < 600) warnings.push("small");
  if (mean < 0.16) warnings.push("dark");
  if (mean > 0.84) warnings.push("blown");
  if (hasAlpha) warnings.push("alpha");
  // 09c: the flat note belongs to the lithophane, and the step decides whether to
  // show it. Measuring it here keeps the whole answer in one pass.
  if (spread < 0.24) warnings.push("flat");

  const corners = [
    values[0],
    values[width - 1],
    values[(height - 1) * width],
    values[height * width - 1],
  ];
  const background = corners.reduce((a, b) => a + b, 0) / corners.length;

  const rows: BedRow[] = [];
  for (let r = 0; r < BED_ROWS; r += 1) {
    // the bed builds from the bottom, so row 0 is the bottom of the picture
    const y0 = Math.floor(((BED_ROWS - 1 - r) / BED_ROWS) * height);
    const y1 = Math.max(y0 + 1, Math.floor(((BED_ROWS - r) / BED_ROWS) * height));

    let first = -1;
    let last = -1;
    let rowSum = 0;
    let count = 0;

    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = values[y * width + x];
        rowSum += value;
        count += 1;
        if (Math.abs(value - background) > 0.12) {
          if (first === -1 || x < first) first = x;
          if (x > last) last = x;
        }
      }
    }

    const found = first !== -1 && last > first;
    rows.push({
      width: found ? Math.min(1, (last - first + 1) / width) : 0.86,
      offset: found ? first / width : 0.07,
      luma: count > 0 ? rowSum / count : mean,
    });
  }

  return { warnings, rows };
}

function anyTransparency(pixels: ImageData): boolean {
  const { data } = pixels;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* the one public call                                                  */
/* ------------------------------------------------------------------ */

/**
 * Validates, decodes, measures and re-encodes. Throws `PhotoPipelineError` with the
 * kind the step's copy already has a sentence for, and nothing else.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (file.size > MAX_INPUT_BYTES) throw new PhotoPipelineError("tooBig");
  // an empty type comes from a few Android pickers; the decoder gets to decide
  if (file.type.length > 0 && !ACCEPTED.includes(file.type.toLowerCase())) {
    throw new PhotoPipelineError("wrongType");
  }

  const source = await decode(file);
  const { width, height } = sizeOf(source);
  if (width < 2 || height < 2) throw new PhotoPipelineError("unreadable");

  const longEdge = Math.max(width, height);
  const sampleScale = Math.min(1, SAMPLE_LONG_EDGE / longEdge);
  const sample = drawTo(source, width * sampleScale, height * sampleScale, null);
  const sampleContext = sample.getContext("2d");
  if (!sampleContext) throw new PhotoPipelineError("unreadable");
  const samplePixels = sampleContext.getImageData(0, 0, sample.width, sample.height);

  const hasAlpha = anyTransparency(samplePixels);
  const { warnings, rows } = measure(samplePixels, longEdge, hasAlpha);

  /* The sample is already decoded and already downscaled, so classifying the image
     here is free. It decides two things the customer should not have to: how much
     relief the kernel applies, and how many filament colours the picture actually
     needs, which is what the fifth-colour surcharge is charged on. */
  const analysis = analyzeImage(samplePixels.data, samplePixels.width, samplePixels.height);

  const uploadScale = Math.min(1, UPLOAD_LONG_EDGE / longEdge);
  const canvas = drawTo(source, width * uploadScale, height * uploadScale, "#FFFFFF");

  /* WebP first. Every browser that can run this generator writes it, and the two
     that cannot fall back to JPEG, which `attachPhoto` also accepts. */
  let blob: Blob;
  try {
    blob = await encode(canvas, "image/webp", 0.85);
    if (blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", 0.85);
  } catch {
    blob = await encode(canvas, "image/jpeg", 0.85);
  }

  if (source instanceof ImageBitmap) source.close();

  return {
    blob,
    localUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    warnings,
    rows,
    analysis,
  };
}

/** Blob URLs are documents' memory. Replacing a photo releases the previous one. */
export function releasePhotoUrl(url: string | null): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* already gone */
  }
}

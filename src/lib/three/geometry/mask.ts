/**
 * Foreground isolation, with no network call.
 *
 * A standee is a plastic cut-out of the thing in the photo. To cut it out we have to
 * decide, per pixel, what is the thing and what is the room behind it. There is no
 * segmentation model here on purpose: it would be a download, a licence and a second of
 * latency on a phone, and the four passes below get an honest result on the kind of
 * photo people actually send, which is a subject against a wall, a table or the sky.
 *
 * Four passes, in order, because each one cleans up after the one before:
 *   1. corner keying      the four corners are almost always background. Their average
 *                         becomes the key colour.
 *   2. distance threshold in a luma-chroma space, so a shadow on a white wall stays
 *                         background while a grey shirt against it does not.
 *   3. largest component  a photo keyed this way leaves confetti. Only the biggest
 *                         connected blob survives, which is the subject.
 *   4. morphological close seals the pinholes that step 2 punched through dark hair
 *                         and thin straps.
 */

import { blurGaussian } from "./heightmap";

export type MaskResult = {
  /** 1 inside the subject, 0 outside. width * height. */
  mask: Uint8Array;
  width: number;
  height: number;
  /** Fraction of the frame the subject covers. Used to reject a useless cut-out. */
  coverage: number;
  /** Tight bounds of the subject, in pixels. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

/** Rec. 709 luma plus two chroma differences, which separates hue from brightness. */
function ycc(r: number, g: number, b: number): [number, number, number] {
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [y, b - y, r - y];
}

/** 8-connected flood from every unvisited seed; keeps the biggest region only. */
function largestComponent(mask: Uint8Array, w: number, h: number): void {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let bestStart = -1, bestSize = 0;
  const label = new Int32Array(w * h).fill(-1);
  let current = 0;

  for (let s = 0; s < mask.length; s++) {
    if (mask[s] === 0 || seen[s] === 1) continue;
    let sp = 0, size = 0;
    stack[sp++] = s; seen[s] = 1;
    while (sp > 0) {
      const p = stack[--sp];
      label[p] = current;
      size++;
      const px = p % w, py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (mask[n] === 1 && seen[n] === 0) { seen[n] = 1; stack[sp++] = n; }
        }
      }
    }
    if (size > bestSize) { bestSize = size; bestStart = current; }
    current++;
  }
  if (bestStart < 0) return;
  for (let i = 0; i < mask.length; i++) if (label[i] !== bestStart) mask[i] = 0;
}

/** Dilate then erode with a square structuring element: closes holes, keeps the edge. */
function close(mask: Uint8Array, w: number, h: number, radius: number): void {
  const pass = (src: Uint8Array, want: number) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = 0;
        for (let dy = -radius; dy <= radius && !hit; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (src[ny * w + nx] === want) { hit = 1; break; }
          }
        }
        out[y * w + x] = want === 1 ? (hit ? 1 : 0) : (hit ? 0 : 1);
      }
    }
    return out;
  };
  const dilated = pass(mask, 1);
  const eroded = pass(dilated, 0);
  mask.set(eroded);
}

/**
 * Luma gradient above this blocks the flood. A backdrop is smooth; a white shoe on a
 * white floor still has a sole line, a shadow and laces, and those edges are what keep
 * the flood from swallowing it. Measured on 0..255 luma at the working grid.
 */
const EDGE_STOP = 11;

export function buildForegroundMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { tolerance?: number; closeRadius?: number } = {},
): MaskResult {
  const n = width * height;
  const Y = new Float32Array(n);
  const CB = new Float32Array(n);
  const CR = new Float32Array(n);
  for (let i = 0, q = 0; i < n; i++, q += 4) {
    const [y, cb, cr] = ycc(pixels[q], pixels[q + 1], pixels[q + 2]);
    Y[i] = y; CB[i] = cb; CR[i] = cr;
  }

  /**
   * The backdrop is read off the whole frame edge rather than four corners, and its
   * own scatter sets the tolerance. A studio wall is flat to a few units, so a beige
   * trouser leg twenty units away from it is a different thing; a snapshot against a
   * textured wall scatters more and earns a looser threshold. The old fixed 46 keyed
   * a light-dressed person on a white wall straight into the background.
   */
  const pad = Math.max(1, Math.round(Math.min(width, height) * 0.02));
  let ky = 0, kcb = 0, kcr = 0, count = 0;
  const onBorder = (x: number, y: number) => x < pad || y < pad || x >= width - pad || y >= height - pad;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!onBorder(x, y)) continue;
    const i = y * width + x; ky += Y[i]; kcb += CB[i]; kcr += CR[i]; count++;
  }
  ky /= count; kcb /= count; kcr /= count;
  const dist = (i: number) =>
    Math.sqrt(0.6 * (Y[i] - ky) ** 2 + 1.4 * (CB[i] - kcb) ** 2 + 1.4 * (CR[i] - kcr) ** 2);
  let dm = 0, dv = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (onBorder(x, y)) dm += dist(y * width + x);
  }
  dm /= count;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (onBorder(x, y)) { const d = dist(y * width + x) - dm; dv += d * d; }
  }
  const sd = Math.sqrt(dv / count);
  const tolerance = opts.tolerance ?? Math.min(46, Math.max(9, dm + 3 * sd + 6));

  /**
   * Background is what the frame edge can reach without crossing a colour step or an
   * edge. Flooding inward instead of thresholding each pixel on its own is what keeps
   * a white t-shirt inside an open jacket as part of the subject: it matches the wall,
   * and it is unreachable from the wall.
   */
  const grad = (i: number, x: number, y: number) => {
    const l = Y[i - (x > 0 ? 1 : 0)], r = Y[i + (x < width - 1 ? 1 : 0)];
    const u = Y[i - (y > 0 ? width : 0)], dn = Y[i + (y < height - 1 ? width : 0)];
    return Math.max(Math.abs(r - l), Math.abs(dn - u)) / 2;
  };
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!onBorder(x, y)) continue;
    const i = y * width + x;
    if (dist(i) < tolerance) { bg[i] = 1; queue[tail++] = i; }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width, y = (i / width) | 0;
    const step = (j: number, jx: number, jy: number) => {
      if (bg[j] === 1) return;
      if (dist(j) >= tolerance) return;
      if (grad(j, jx, jy) > EDGE_STOP) return;
      bg[j] = 1; queue[tail++] = j;
    };
    if (x > 0) step(i - 1, x - 1, y);
    if (x < width - 1) step(i + 1, x + 1, y);
    if (y > 0) step(i - width, x, y - 1);
    if (y < height - 1) step(i + width, x, y + 1);
  }
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = bg[i] === 1 ? 0 : 1;

  largestComponent(mask, width, height);
  // radius 1: seals pinholes and nothing wider. At two it also sealed the gap between
  // a standing person's legs, and the cut-out came out as one block from the waist down
  close(mask, width, height, opts.closeRadius ?? 1);

  let cnt = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      if (mask[yy * width + xx] === 0) continue;
      cnt++;
      if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
      if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
    }
  }
  if (maxX < 0) { minX = 0; minY = 0; maxX = width - 1; maxY = height - 1; }

  return {
    mask, width, height,
    coverage: cnt / n,
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * The mask as a soft 0..1 field. A hard mask displaced into a mesh makes a cliff at
 * the subject's edge; this turns the cliff into a bevel a few samples wide, which is
 * what a carved relief actually has.
 */
export function softenMask(mask: Uint8Array, w: number, h: number, sigma: number): Float32Array {
  const soft = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) soft[i] = mask[i];
  return blurGaussian(soft, w, h, sigma);
}

/**
 * Rounds the outline in place. The keying pass works per sample, so the edge of the
 * cut-out is a staircase at grid resolution and every stray sample is a spike on the
 * side wall of the print. Blurring and re-thresholding at one half keeps the shape and
 * removes anything narrower than the blur, which is exactly the junk.
 */
export function smoothOutline(mask: Uint8Array, w: number, h: number, sigma: number): void {
  const soft = softenMask(mask, w, h, sigma);
  for (let i = 0; i < mask.length; i += 1) mask[i] = soft[i] >= 0.5 ? 1 : 0;
}

/**
 * The subject field the relief kernels ask for, or null when the photograph has no
 * usable subject: nearly empty (a texture, a sky) or nearly full (a close crop), in
 * which case a plateau would be either a speck or the whole panel.
 */
export function subjectField(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array | null {
  const found = buildForegroundMask(pixels, width, height);
  if (found.coverage < 0.04 || found.coverage > 0.92) return null;
  const sigma = Math.max(1.5, Math.max(width, height) / 70);
  return softenMask(found.mask, width, height, sigma);
}

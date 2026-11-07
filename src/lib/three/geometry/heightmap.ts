/**
 * src/lib/three/geometry/heightmap.ts
 *
 * Doc 05 §B.1 stage 2. Pixels to a normalised height field, and the histogram that
 * the band finder reuses.
 *
 * Pure arithmetic over typed arrays. The same functions run inside the worker and
 * inside the main-thread fallback, so there is exactly one implementation of the maths
 * that decides what a customer's photo looks like as an object.
 */

export type HeightField = {
  /** 0..1, row major, `w * h` entries. */
  height: Float32Array;
  width: number;
  height_: number;
  /** 256 bins over the post-levels luminance. */
  histogram: Uint32Array;
  /** True when the photo had almost no tonal range to work with. */
  lowContrast: boolean;
};

/**
 * sRGB to linear. Doing luminance on raw sRGB bytes, which is the common shortcut,
 * makes mid-tones about 18% too bright and flattens every relief. Skin tones in
 * particular collapse into the background.
 */
export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** The reverse, for the few places a linear value has to go back out as a hex. */
export function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

/** A 256-entry lookup, because `Math.pow` per channel per pixel is the hot loop. */
const SRGB_LUT = (() => {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) lut[i] = srgbToLinear(i / 255);
  return lut;
})();

/** Rec.709 luma on linearised channels. */
export function luminanceFromPixels(pixels: Uint8ClampedArray, count: number): Float32Array {
  const out = new Float32Array(count);
  for (let i = 0, p = 0; i < count; i += 1, p += 4) {
    const alpha = pixels[p + 3] / 255;
    const r = SRGB_LUT[pixels[p]];
    const g = SRGB_LUT[pixels[p + 1]];
    const b = SRGB_LUT[pixels[p + 2]];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // A transparent pixel is not black, it is nothing. Treating it as black punches a
    // hole through the middle of every PNG sticker anybody uploads, so it goes white,
    // which is the flat background the copy in `quality.alpha` promises.
    out[i] = alpha < 0.02 ? 1 : lum * alpha + (1 - alpha);
  }
  return out;
}

export function histogram256(values: Float32Array): Uint32Array {
  const hist = new Uint32Array(256);
  for (let i = 0; i < values.length; i += 1) {
    const bin = values[i] <= 0 ? 0 : values[i] >= 1 ? 255 : (values[i] * 255) | 0;
    hist[bin] += 1;
  }
  return hist;
}

function percentile(hist: Uint32Array, total: number, fraction: number): number {
  const target = total * fraction;
  let seen = 0;
  for (let bin = 0; bin < 256; bin += 1) {
    seen += hist[bin];
    if (seen >= target) return bin / 255;
  }
  return 1;
}

/**
 * Auto-levels on the 1st and 99th percentiles. This is what rescues an underexposed
 * phone snapshot, which is most of them. A nearly flat image is left alone and flagged
 * instead, so the UI can say something useful rather than stretching noise into ridges.
 */
export function autoLevels(values: Float32Array): { lowContrast: boolean } {
  const hist = histogram256(values);
  const total = values.length;
  const black = percentile(hist, total, 0.01);
  const white = percentile(hist, total, 0.99);
  const span = white - black;
  if (span < 0.08) return { lowContrast: true };
  const scale = 1 / span;
  for (let i = 0; i < total; i += 1) {
    const v = (values[i] - black) * scale;
    values[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return { lowContrast: false };
}

/**
 * Relief and lithophane both read better with the mid-tones opened. Without it faces
 * sit in the bottom third of the thickness range and the print looks like a shadow.
 */
export function midtoneLift(values: Float32Array, gamma = 0.86): void {
  for (let i = 0; i < values.length; i += 1) values[i] = Math.pow(values[i], gamma);
}

/**
 * One separable 3x3 Gaussian at sigma 0.8. JPEG chroma noise and block artefacts turn
 * into visible ridges in a displaced mesh, and they are the single most common reason
 * an unfiltered lithophane comes out looking like sandpaper.
 */
export function blur3x3(values: Float32Array, w: number, h: number): Float32Array {
  // sigma 0.8 normalised: the tails past one sample are under 3% and do not pay for a
  // wider kernel at this resolution.
  const k0 = 0.4382;
  const k1 = 0.2809;
  const tmp = new Float32Array(values.length);
  const out = new Float32Array(values.length);

  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const left = values[row + (x > 0 ? x - 1 : 0)];
      const right = values[row + (x < w - 1 ? x + 1 : w - 1)];
      tmp[row + x] = k1 * left + k0 * values[row + x] + k1 * right;
    }
  }
  for (let y = 0; y < h; y += 1) {
    const up = (y > 0 ? y - 1 : 0) * w;
    const down = (y < h - 1 ? y + 1 : h - 1) * w;
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      out[row + x] = k1 * tmp[up + x] + k0 * tmp[row + x] + k1 * tmp[down + x];
    }
  }
  return out;
}

/**
 * A separable Gaussian at any sigma. `blur3x3` is sigma 0.8 and was sized for JPEG
 * noise; at a 224-sample grid it leaves every pore and every compression block as a
 * ridge, and a displaced mesh turns ridges into a contour map. Relief wants the
 * *forms* of the picture, not its texture, and forms live at two to three samples.
 */
export function blurGaussian(values: Float32Array, w: number, h: number, sigma: number): Float32Array {
  if (sigma <= 0.3) return Float32Array.from(values);
  const radius = Math.max(1, Math.ceil(sigma * 2.5));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;

  const tmp = new Float32Array(values.length);
  const out = new Float32Array(values.length);
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k;
        acc += kernel[k + radius] * values[row + sx];
      }
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k;
        acc += kernel[k + radius] * tmp[sy * w + x];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/**
 * Doc 05 §B.1 stage 2 item 4. Puts the sharp edges back where the image actually had
 * one, so eyes and lettering stay crisp while the flat areas stay smooth. Applied to
 * relief-family types, skipped for a lithophane where the whole point is smoothness.
 */
export function preserveEdges(
  blurred: Float32Array,
  raw: Float32Array,
  w: number,
  h: number,
  mix = 0.35,
  threshold = 0.12,
): void {
  for (let y = 1; y < h - 1; y += 1) {
    const row = y * w;
    for (let x = 1; x < w - 1; x += 1) {
      const i = row + x;
      const gx = raw[i + 1] - raw[i - 1];
      const gy = raw[i + w] - raw[i - w];
      if (Math.hypot(gx, gy) > threshold) {
        blurred[i] = blurred[i] * (1 - mix) + raw[i] * mix;
      }
    }
  }
}

/** Inverts for the lithophane: bright pixel, thin wall, more light through. */
export function invert(values: Float32Array): void {
  for (let i = 0; i < values.length; i += 1) values[i] = 1 - values[i];
}

/**
 * The whole stage 2 pipeline. `edgePreserve` is on for the relief family and off for
 * the lithophane.
 */
export function buildHeightField(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    invertLuminance: boolean;
    edgePreserve: boolean;
    /** Smoothing radius in samples. Defaults to the old 3x3, which suits a lithophane. */
    sigma?: number;
    /**
     * A soft 0..1 field marking the subject of the photograph. When present, the
     * subject stands proud of the background as a plateau and keeps its full tonal
     * detail, while the background is pressed down to a whisper. Without it a relief
     * is a luminance map: a white wall behind a face comes out *higher* than the
     * face, and the piece reads as an embossed line drawing instead of a sculpture.
     */
    subject?: Float32Array | null;
  },
): HeightField {
  const count = width * height;
  const raw = luminanceFromPixels(pixels, count);
  const { lowContrast } = autoLevels(raw);
  midtoneLift(raw);

  const blurred =
    options.sigma !== undefined
      ? blurGaussian(raw, width, height, options.sigma)
      : blur3x3(raw, width, height);
  // With a subject plateau the raw value at the subject's edge belongs to the backdrop,
  // and mixing it back in at full strength draws a halo around the plateau.
  if (options.edgePreserve) preserveEdges(blurred, raw, width, height, options.subject ? 0.12 : undefined);

  if (options.subject) {
    const subject = options.subject;
    for (let i = 0; i < count; i += 1) {
      const s = subject[i];
      const lum = blurred[i];
      // inside the subject: a plateau with the picture's own tones on top of it
      const fg = 0.42 + 0.58 * lum;
      // behind it: flat. A backdrop with tone left in it picks up its own colour bands,
      // and a vignette on a studio wall came out as yellow blobs around the figure.
      const bg = 0;
      blurred[i] = bg + (fg - bg) * s;
    }
  }

  if (options.invertLuminance) invert(blurred);

  return {
    height: blurred,
    width,
    height_: height,
    histogram: histogram256(blurred),
    lowContrast,
  };
}

/**
 * Doc 05 §D.1. A 24x18 thumbnail of the height field plus a per-row silhouette, posted
 * on the `height` stage so the wait animation can build the visitor's own picture out
 * of the print bed instead of a generic shape.
 */
export function thumbnailAndSilhouette(
  field: HeightField,
  thumbW = 24,
  thumbH = 18,
): { thumb: Uint8ClampedArray; thumbW: number; thumbH: number; silhouette: Uint8Array } {
  const thumb = new Uint8ClampedArray(thumbW * thumbH);
  const silhouette = new Uint8Array(thumbH * 2);
  const { height: H, width: w, height_: h } = field;

  for (let ty = 0; ty < thumbH; ty += 1) {
    const sy = Math.min(h - 1, Math.floor((ty / thumbH) * h));
    let first = thumbW;
    let last = 0;
    for (let tx = 0; tx < thumbW; tx += 1) {
      const sx = Math.min(w - 1, Math.floor((tx / thumbW) * w));
      const value = H[sy * w + sx];
      thumb[ty * thumbW + tx] = Math.round(value * 255);
      // Anything above a tenth of the range counts as "there is material here".
      if (value > 0.1) {
        if (tx < first) first = tx;
        if (tx > last) last = tx;
      }
    }
    if (first > last) {
      first = 0;
      last = thumbW - 1;
    }
    silhouette[ty * 2] = first;
    silhouette[ty * 2 + 1] = last;
  }

  return { thumb, thumbW, thumbH, silhouette };
}

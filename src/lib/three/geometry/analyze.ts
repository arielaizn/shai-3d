/**
 * What did the visitor actually upload?
 *
 * The generator used to make the customer decide everything. It should not: the file
 * already answers two questions, and answering them for him is the difference between
 * a tool and a form.
 *
 * QUESTION 1 — is this a photograph of a real thing, or a flat graphic?
 * It decides how the object gets built. A photograph of a face carries continuous
 * shading, so it earns real relief and comes out as a sculpted piece. A logo, a drawing
 * or a sticker is flat by nature, and pushing invented relief into it produces a lumpy
 * surface that reads as a mistake. Four measurements separate them, and no single one
 * is trusted alone:
 *
 *   distinctColors  a photograph carries many; a graphic carries a handful.
 *   colourEntropy   how spread the histogram is. A photograph fills it.
 *   gradientMean    shading is a slow ramp, so a photograph sits in a healthy
 *                   mid-range. A graphic is flat inside its regions and spikes only
 *                   on its outlines.
 *   flatRatio       the share of the frame sitting in large areas of one near-identical
 *                   colour. A logo is mostly flat fills.
 *
 * QUESTION 2 — how many filament colours does this image really want?
 * The price already charges for a fifth colour and beyond. Making the customer count
 * them by eye is asking him to price his own order. We quantise, merge the bins no eye
 * and no printer can separate, drop the specks, and return the honest number, so the
 * surcharge appears because the picture needs it rather than because he ticked a box.
 */

export type ImageKind = "photo" | "flat";

export type ImageAnalysis = {
  kind: ImageKind;
  /** 0..1. Below 0.5 the UI offers the choice instead of asserting it. */
  confidence: number;
  /** Perceptually distinct colours, after merging what a printer cannot separate. */
  distinctColors: number;
  /** Those colours, most used first, as hex. */
  dominantHexes: string[];
  /** What we recommend printing with. */
  suggestedColorCount: number;
  /** How much relief the kernel should apply. 1 full, 0 flat. */
  reliefFactor: number;
  measurements: {
    flatRatio: number;
    gradientMean: number;
    colourEntropy: number;
  };
};

/** Two colours closer than this in RGB are the same spool. */
const MERGE_DISTANCE = 58;

/** A colour under this share of the frame is a speck, an artefact or an edge. */
const SPECK_SHARE = 0.015;

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function analyzeImage(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): ImageAnalysis {
  const n = width * height;

  /* --- coarse histogram, 5 bits per channel -------------------------------- */
  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const hit = bins.get(key);
    if (hit) {
      hit.count++;
      hit.r += r;
      hit.g += g;
      hit.b += b;
    } else {
      bins.set(key, { count: 1, r, g, b });
    }
  }

  let entropy = 0;
  for (const bin of bins.values()) {
    const pr = bin.count / n;
    entropy -= pr * Math.log2(pr);
  }
  const colourEntropy = Math.min(1, entropy / 15);

  /* --- merge what a printer cannot separate -------------------------------- */
  const ordered = [...bins.values()].sort((a, b) => b.count - a.count);
  const merged: Array<{ count: number; r: number; g: number; b: number }> = [];
  for (const bin of ordered) {
    const r = bin.r / bin.count;
    const g = bin.g / bin.count;
    const b = bin.b / bin.count;
    const near = merged.find((m) => Math.hypot(m.r - r, m.g - g, m.b - b) < MERGE_DISTANCE);
    if (near) {
      const total = near.count + bin.count;
      near.r = (near.r * near.count + r * bin.count) / total;
      near.g = (near.g * near.count + g * bin.count) / total;
      near.b = (near.b * near.count + b * bin.count) / total;
      near.count = total;
    } else {
      merged.push({ count: bin.count, r, g, b });
    }
  }

  const significant = merged.filter((m) => m.count / n >= SPECK_SHARE);
  const distinctColors = Math.max(1, significant.length);

  /* --- how much of the frame is genuinely flat fill -------------------------
   * Measured as local uniformity, not as a histogram share. A histogram share
   * saturates near 1 for every image, photographs included, because a handful of
   * merged colours always covers the frame. What actually separates a fill from a
   * photograph is whether a small window is internally uniform: a logo's interior
   * has near-zero variance, a cheek under light never does.
   */
  const WIN = 6;
  let flatWindows = 0;
  let totalWindows = 0;
  const wy = Math.max(WIN, Math.floor(height / 60));
  const wx = Math.max(WIN, Math.floor(width / 60));
  for (let y = 0; y + WIN < height; y += wy) {
    for (let x = 0; x + WIN < width; x += wx) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let dy = 0; dy < WIN; dy++) {
        for (let dx = 0; dx < WIN; dx++) {
          const i = ((y + dy) * width + x + dx) * 4;
          const v = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
          sum += v;
          sumSq += v * v;
          count++;
        }
      }
      const mean = sum / count;
      const sd = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
      // under two levels of 255 is a fill as far as any eye or nozzle is concerned
      if (sd < 2) flatWindows++;
      totalWindows++;
    }
  }
  const flatRatio = totalWindows > 0 ? flatWindows / totalWindows : 1;

  /* --- mean local luminance gradient --------------------------------------- */
  const stepY = Math.max(1, Math.floor(height / 220));
  const stepX = Math.max(1, Math.floor(width / 220));
  let gsum = 0;
  let gcount = 0;
  for (let y = stepY; y < height - stepY; y += stepY) {
    for (let x = stepX; x < width - stepX; x += stepX) {
      const i = (y * width + x) * 4;
      const ir = (y * width + x + stepX) * 4;
      const id = ((y + stepY) * width + x) * 4;
      const c = luma(pixels[i], pixels[i + 1], pixels[i + 2]);
      const dx = Math.abs(luma(pixels[ir], pixels[ir + 1], pixels[ir + 2]) - c);
      const dy = Math.abs(luma(pixels[id], pixels[id + 1], pixels[id + 2]) - c);
      gsum += (dx + dy) / 2;
      gcount++;
    }
  }
  const gradientMean = gcount > 0 ? gsum / gcount / 255 : 0;

  /* --- the verdict ---------------------------------------------------------
   * Weighted rather than a flat vote, because the four signals are not equally
   * trustworthy. Calibrated against the hardest real case available: studio product
   * photographs on a seamless flat ground, which look flatter than any picture a
   * customer will actually send. Measured on that set:
   *
   *   colourEntropy   photos 0.24 - 0.40   flat 0.12 - 0.15   clean gap, weight 0.35
   *   flatRatio       photos 0.08 - 0.68   flat 0.86 - 0.89   clean gap, weight 0.35
   *   distinctColors  photos 4 - 5         flat 2 - 4         overlaps, weight 0.20
   *   gradientMean    photos 0.008 - 0.033 flat 0.004 - 0.010 overlaps, weight 0.10
   *
   * A family snapshot sits far above every photo threshold here, so the thresholds
   * are set where the hard case lives rather than where the easy one does.
   */
  const score =
    0.35 * (colourEntropy > 0.2 ? 1 : 0) +
    0.35 * (flatRatio < 0.8 ? 1 : 0) +
    0.2 * (distinctColors >= 5 ? 1 : 0) +
    0.1 * (gradientMean > 0.007 ? 1 : 0);

  const kind: ImageKind = score >= 0.5 ? "photo" : "flat";
  // distance from the 0.5 fence, normalised. Near the fence the UI offers the choice
  // instead of asserting it, because a wrong assertion is worse than a question.
  const confidence = Math.min(1, Math.abs(score - 0.5) / 0.5);

  return {
    kind,
    confidence,
    distinctColors,
    dominantHexes: significant.slice(0, 8).map((m) => toHex(m.r, m.g, m.b)),
    suggestedColorCount: Math.min(distinctColors, 6),
    // a flat graphic keeps a shallow bevel so it still reads as a printed object
    reliefFactor: kind === "photo" ? 1 : 0.18,
    measurements: { flatRatio, gradientMean, colourEntropy },
  };
}

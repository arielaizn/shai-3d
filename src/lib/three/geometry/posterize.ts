/**
 * src/lib/three/geometry/posterize.ts
 *
 * Doc 05 §B.2. Choosing where the filament bands fall.
 *
 * The whole "up to 4 colours" flow rests on this, so it gets the most exact treatment
 * in the spec and the most careful code here.
 *
 * **Why posterising and not per-region segmentation.** A multi-colour FDM print of a
 * photo *is* a banded colour swap: Shai changes filament at a layer boundary, or
 * prints separate regions and glues them. The bands are an accurate drawing of the
 * product, not a stylisation of it. Region segmentation would need a model, a GPU, and
 * would predict a print he cannot actually make.
 *
 * **Why k-means and not equal steps.** Equal-luminance steps put the boundaries in
 * arbitrary places. On a portrait against a bright wall that gives three bands of
 * background and one band containing the entire face.
 */

/** Lloyd's algorithm over a 256-bin histogram, so cost is independent of image size. */
const MAX_ITERATIONS = 12;
const CONVERGED = 1e-4;

function quantileCentres(hist: Uint32Array, n: number): Float64Array {
  let total = 0;
  for (let bin = 0; bin < 256; bin += 1) total += hist[bin];
  const centres = new Float64Array(n);
  if (total === 0) {
    for (let k = 0; k < n; k += 1) centres[k] = (k + 0.5) / n;
    return centres;
  }
  let seen = 0;
  let k = 0;
  for (let bin = 0; bin < 256 && k < n; bin += 1) {
    seen += hist[bin];
    while (k < n && seen >= (total * (k + 0.5)) / n) {
      centres[k] = bin / 255;
      k += 1;
    }
  }
  for (; k < n; k += 1) centres[k] = 1;
  return centres;
}

function nearestCentre(value: number, centres: Float64Array): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let k = 0; k < centres.length; k += 1) {
    const d = Math.abs(centres[k] - value);
    if (d < bestDistance) {
      bestDistance = d;
      best = k;
    }
  }
  return best;
}

/** How many of the 256 bins actually carry pixels. */
function occupiedBins(hist: Uint32Array): number {
  let count = 0;
  for (let bin = 0; bin < 256; bin += 1) if (hist[bin] > 0) count += 1;
  return count;
}

export type Bands = {
  /** `n - 1` edges in 0..1, ascending. */
  edges: number[];
  /** The k-means centre of each band, used for the band's representative tone. */
  centres: number[];
};

/**
 * The band edges for `n` filaments.
 *
 * Degenerate cases, both from doc 05 §B.2:
 *   - an empty cluster keeps its previous centre and is nudged by `1/256`, so it can
 *     never collapse onto its neighbour and silently reduce the band count
 *   - a histogram living inside 8 bins falls back to equal quantiles, because k-means
 *     on a spike produces `n` identical centres
 */
export function bandEdges(hist: Uint32Array, n: number): Bands {
  if (n <= 1) return { edges: [], centres: [0.5] };

  if (occupiedBins(hist) <= 8) {
    const centres: number[] = [];
    for (let k = 0; k < n; k += 1) centres.push((k + 0.5) / n);
    return { edges: midpoints(centres), centres };
  }

  const centres = quantileCentres(hist, n);
  const sum = new Float64Array(n);
  const count = new Float64Array(n);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    sum.fill(0);
    count.fill(0);
    for (let bin = 0; bin < 256; bin += 1) {
      const weight = hist[bin];
      if (weight === 0) continue;
      const value = bin / 255;
      const k = nearestCentre(value, centres);
      sum[k] += value * weight;
      count[k] += weight;
    }
    let moved = 0;
    for (let k = 0; k < n; k += 1) {
      if (count[k] > 0) {
        const next = sum[k] / count[k];
        moved += Math.abs(next - centres[k]);
        centres[k] = next;
      } else {
        centres[k] = Math.min(1, centres[k] + 1 / 256);
      }
    }
    if (moved < CONVERGED) break;
  }

  const sorted = Array.from(centres).sort((a, b) => a - b);
  // A second pass of nudging after the sort, because two empty clusters on the same
  // side can still land on the same value.
  for (let k = 1; k < sorted.length; k += 1) {
    if (sorted[k] - sorted[k - 1] < 1 / 256) sorted[k] = sorted[k - 1] + 1 / 256;
  }
  return { edges: midpoints(sorted), centres: sorted };
}

export function midpoints(values: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 1) out.push((values[i - 1] + values[i]) / 2);
  return out;
}

/** Which band a luminance falls in. Binary search is not worth it at n <= 6. */
export function bandOf(value: number, edges: readonly number[]): number {
  let band = 0;
  while (band < edges.length && value >= edges[band]) band += 1;
  return band;
}

/** The 0..1 range each band covers, for the legend under the palette. */
export function bandRanges(edges: readonly number[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let from = 0;
  for (const edge of edges) {
    out.push({ from, to: edge });
    from = edge;
  }
  out.push({ from, to: 1 });
  return out;
}

/**
 * src/lib/three/geometry/litho.ts
 *
 * Doc 05 §B.3.1. The thickness map for a lithophane, and only that.
 *
 * Real lithophane transmission is exponential, so a linear thickness map produces a
 * preview whose midtones are far too dark. The `1/2.2` exponent is the inverse of the
 * absorption curve at the thicknesses white PLA actually prints at, and it is what
 * makes a face in the preview look like the face in the print rather than a silhouette.
 *
 * The rendering half of the lithophane (Beer-Lambert in the fragment shader) lives in
 * `../printedMaterial.ts`, because it needs three. This file is pure arithmetic and
 * runs inside the worker.
 */

/**
 * `height` is already inverted by the height-map stage, so 1 is the thickest wall.
 * Both thicknesses are in centimetres.
 */
export function lithoThickness(height: number, minCm: number, maxCm: number): number {
  const h = height < 0 ? 0 : height > 1 ? 1 : height;
  return minCm + (maxCm - minCm) * Math.pow(h, 1 / 2.2);
}

/**
 * Doc 05 §B.3.2. Relief thickness, quantised to whole printed layers before the
 * normals are computed, so the analytic normals produce genuinely flat treads and
 * vertical risers. The layer-line shader then adds bead detail inside each terrace,
 * and the two effects stack: big honest steps from the geometry, fine beads from the
 * shader.
 */
export function reliefThickness(
  height: number,
  baseCm: number,
  reliefCm: number,
  layerCm: number,
  quantize: boolean,
): number {
  const h = height < 0 ? 0 : height > 1 ? 1 : height;
  const raised = reliefCm * h;
  if (!quantize || layerCm <= 0) return baseCm + raised;
  return baseCm + Math.round(raised / layerCm) * layerCm;
}

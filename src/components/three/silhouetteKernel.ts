/**
 * The silhouette kernel — a cut-out of the subject, extruded, standing on a base.
 *
 * WHY THIS EXISTS. Every print type used to resolve to a panel variant, so a visitor
 * who chose "דמות עומדת למדף" and saw a sculpted figurine on the card received a flat
 * photo panel in a slot. The card promised one product and the geometry delivered
 * another. Ariel caught it. This kernel is the fix.
 *
 * WHAT IT ACTUALLY MAKES. `mask.ts` decides which pixels are the subject. Only those
 * cells become geometry, so the outline of the finished object is the outline of the
 * thing in the photo. The front face still carries the relief from the height field,
 * so a face still reads as a face. The back is flat, because a standee leans on a
 * shelf and nobody looks at its back. The two are joined by a real side wall walked
 * along the boundary, which is what makes it a solid rather than two sheets.
 *
 * WHAT IT IS NOT. It is not photogrammetry. A single phone photo does not contain the
 * far side of anything, and any product that claims otherwise is guessing. This is an
 * honest cut-out with relief, which is exactly what a printed standee is.
 */
import {
  BuildError,
  type BuildOutput,
  type BuildRequest,
  type PanelResult,
  type PreviewMetrics,
} from "@/lib/three/geometry/types";
import { buildHeightField } from "@/lib/three/geometry/heightmap";
import { sortByLuminance, bandInfo, hexToLinearRgb, finishIndex as finishIdx } from "@/lib/three/geometry/colorMapping";
import { buildForegroundMask, smoothOutline } from "@/lib/three/geometry/mask";

const MM = 0.1; // one scene unit is one centimetre

/** Below this the cut-out is a speck and the panel kernel is the honest answer. */
export const MIN_COVERAGE = 0.06;

export type SilhouetteInput = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  request: BuildRequest;
};

type Vec = { x: number; y: number; z: number };

/** Printability floor. Nothing thinner than this survives an FDM nozzle. */
const MIN_WALL_MM = 1.2;

export function buildSilhouette(input: SilhouetteInput): BuildOutput {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { pixels, width, height, request } = input;

  if (width < 8 || height < 8) {
    throw new BuildError("IMAGE_TOO_SMALL", "the working grid is smaller than 8 samples");
  }
  if (request.filaments.length === 0) {
    throw new BuildError("NO_FILAMENT", "no filament was chosen");
  }

  const params = request.params;
  const depthMm = Math.max(MIN_WALL_MM, params.thicknessMaxMm ?? 6);
  const reliefMm = Math.max(0, (params.thicknessMaxMm ?? 6) - (params.thicknessMinMm ?? 2));

  const mask = buildForegroundMask(pixels, width, height);
  if (mask.coverage < MIN_COVERAGE) {
    throw new BuildError("NO_SUBJECT", "no separable subject was found in the photograph");
  }
  // the keyed edge is a staircase with stray samples; the print's side wall follows
  // it exactly, so it is rounded here before anything is built on it
  // sigma under one sample: enough to drop single-sample spikes, not enough to seal
  // the gap between two legs, which is three samples wide on a 224 grid
  smoothOutline(mask.mask, width, height, 0.7);

  const field = buildHeightField(pixels, width, height, {
    invertLuminance: false,
    edgePreserve: true,
    sigma: Math.max(1.2, Math.max(width, height) / 110),
  });

  const sorted = sortByLuminance(request.filaments.slice(0, Math.max(1, params.maxFilamentColors)));
  // even ranges across the luminance axis, one band per chosen spool
  const step = 1 / Math.max(1, sorted.length);
  const bands = bandInfo(
    sorted,
    sorted.map((_, i) => ({ from: i * step, to: (i + 1) * step })),
  );
  const bandRgb = bands.map((b) => hexToLinearRgb(b.hex));

  // Crop to the subject so the piece fills the size the customer paid for rather than
  // arriving as a small figure in a large empty bounding box.
  const { minX, minY, maxX, maxY } = mask.bounds;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const longPx = Math.max(cw, ch);
  const scale = (request.longEdgeMm * MM) / longPx;
  const depth = depthMm * MM;
  const relief = reliefMm * MM;

  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cw && y < ch && mask.mask[(y + minY) * width + (x + minX)] === 1;

  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const col: number[] = [];
  const thk: number[] = [];
  const fin: number[] = [];
  const idx: number[] = [];

  const finishValue = finishIdx(request.finish, 0);
  const colourAt = (u: number, v: number): [number, number, number] => {
    const sx = Math.min(width - 1, Math.round(minX + u * (cw - 1)));
    const sy = Math.min(height - 1, Math.round(minY + v * (ch - 1)));
    const l = field.height[sy * width + sx];
    let bi = bands.findIndex((b) => l >= b.from && l <= b.to);
    if (bi < 0) bi = bands.length - 1;
    return bandRgb[bi];
  };

  const push = (p: Vec, n: Vec, u: number, v: number, t: number, rgb?: [number, number, number]) => {
    pos.push(p.x, p.y, p.z);
    nor.push(n.x, n.y, n.z);
    uvs.push(u, v);
    const c = rgb ?? colourAt(u, v);
    col.push(c[0], c[1], c[2]);
    thk.push(t);
    fin.push(finishValue);
    return pos.length / 3 - 1;
  };

  const ox = (cw - 1) / 2;
  const oy = (ch - 1) / 2;
  const px = (x: number) => (x - ox) * scale;
  const py = (y: number) => (oy - y) * scale;

  /* --- front and back faces, one quad per masked cell ---------------------- */
  const frontIdx = new Int32Array(cw * ch).fill(-1);
  const backIdx = new Int32Array(cw * ch).fill(-1);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!inside(x, y)) continue;
      const u = x / Math.max(1, cw - 1);
      const v = y / Math.max(1, ch - 1);
      const at = (yy: number, xx: number) =>
        field.height[Math.min(height - 1, Math.max(0, yy + minY)) * width + Math.min(width - 1, Math.max(0, xx + minX))];
      const l = at(y, x);
      const z = depth / 2 + l * relief;
      // the front normal comes from the relief's slope, so the viewer shades the face
      // as the carved surface it is; a flat +Z normal renders every standee as a slab
      const dzdx = ((at(y, x + 1) - at(y, x - 1)) * relief) / (2 * scale);
      const dzdy = ((at(y - 1, x) - at(y + 1, x)) * relief) / (2 * scale);
      const len = Math.hypot(dzdx, dzdy, 1);
      frontIdx[y * cw + x] = push({ x: px(x), y: py(y), z }, { x: -dzdx / len, y: -dzdy / len, z: 1 / len }, u, v, z + depth / 2);
      backIdx[y * cw + x] = push({ x: px(x), y: py(y), z: -depth / 2 }, { x: 0, y: 0, z: -1 }, u, v, depth);
    }
  }

  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) { idx.push(a, c, b, a, d, c); } else { idx.push(a, b, c, a, c, d); }
  };

  for (let y = 0; y < ch - 1; y++) {
    for (let x = 0; x < cw - 1; x++) {
      const i00 = y * cw + x, i10 = y * cw + x + 1;
      const i01 = (y + 1) * cw + x, i11 = (y + 1) * cw + x + 1;
      quad(frontIdx[i00], frontIdx[i10], frontIdx[i11], frontIdx[i01], false);
      quad(backIdx[i00], backIdx[i10], backIdx[i11], backIdx[i01], true);
    }
  }

  /* --- the side wall: every masked cell edge that faces open space ---------- */
  const wall = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const f0 = frontIdx[y0 * cw + x0], f1 = frontIdx[y1 * cw + x1];
    const b0 = backIdx[y0 * cw + x0], b1 = backIdx[y1 * cw + x1];
    if (f0 < 0 || f1 < 0 || b0 < 0 || b1 < 0) return;
    // duplicate the four corners so the wall gets its own outward normal and the
    // edge stays crisp instead of smearing into the face shading
    const n = { x: nx, y: ny, z: 0 };
    const u0 = x0 / Math.max(1, cw - 1), v0 = y0 / Math.max(1, ch - 1);
    const u1 = x1 / Math.max(1, cw - 1), v1 = y1 / Math.max(1, ch - 1);
    const a = push({ x: pos[f0 * 3], y: pos[f0 * 3 + 1], z: pos[f0 * 3 + 2] }, n, u0, v0, depth);
    const b = push({ x: pos[f1 * 3], y: pos[f1 * 3 + 1], z: pos[f1 * 3 + 2] }, n, u1, v1, depth);
    const c = push({ x: pos[b1 * 3], y: pos[b1 * 3 + 1], z: pos[b1 * 3 + 2] }, n, u1, v1, depth);
    const d = push({ x: pos[b0 * 3], y: pos[b0 * 3 + 1], z: pos[b0 * 3 + 2] }, n, u0, v0, depth);
    idx.push(a, b, c, a, c, d);
  };

  for (let y = 0; y < ch - 1; y++) {
    for (let x = 0; x < cw - 1; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x + 1, y)) wall(x, y, x, y + 1, 1, 0);
      if (!inside(x - 1, y)) wall(x, y + 1, x, y, -1, 0);
      if (!inside(x, y + 1)) wall(x + 1, y + 1, x, y + 1, 0, -1);
      if (!inside(x, y - 1)) wall(x, y, x + 1, y, 0, 1);
    }
  }

  if (idx.length === 0) {
    throw new BuildError("NO_SUBJECT", "the cut-out produced no faces");
  }

  /* --- the base: a cut-out cannot stand on its own edge ---------------------- */
  // Centred under whatever touches the bottom of the cut-out, which is where the feet
  // are, and deep enough front to back that a nudge does not tip it. The darkest spool
  // unless a separate accessory colour was chosen, same rule as the panel stand.
  let footSum = 0, footCount = 0;
  for (let y = Math.max(0, ch - Math.ceil(ch * 0.08)); y < ch; y++) {
    for (let x = 0; x < cw; x++) if (inside(x, y)) { footSum += x; footCount++; }
  }
  const footX = footCount > 0 ? px(footSum / footCount) : 0;
  const baseW = Math.max(4, Math.min(cw * scale, 0.7 * cw * scale));
  const baseD = Math.max(2.5, (depth + relief) * 3);
  const baseH = 0.4;
  const baseTop = py(ch - 1) + 0.05;
  const baseRgb = request.accessory ? hexToLinearRgb(request.accessory.hex) : bandRgb[0];
  const x0 = footX - baseW / 2, x1 = footX + baseW / 2;
  const y0 = baseTop - baseH, y1 = baseTop;
  const z0 = -baseD / 2, z1 = baseD / 2;
  const face = (a: Vec, b: Vec, c: Vec, d: Vec, n: Vec) => {
    const i0 = push(a, n, 0, 0, baseH, baseRgb);
    const i1 = push(b, n, 1, 0, baseH, baseRgb);
    const i2 = push(c, n, 1, 1, baseH, baseRgb);
    const i3 = push(d, n, 0, 1, baseH, baseRgb);
    idx.push(i0, i1, i2, i0, i2, i3);
  };
  const P = (x: number, y: number, z: number): Vec => ({ x, y, z });
  face(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), P(0, 0, 1));   // front
  face(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(0, 0, -1));  // back
  face(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), P(0, 1, 0));   // top
  face(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(0, -1, 0));  // bottom
  face(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(1, 0, 0));   // right
  face(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), P(-1, 0, 0));  // left

  const position = new Float32Array(pos);
  const boundingMm = {
    x: Math.max(cw * scale, baseW) / MM,
    y: (ch * scale + baseH) / MM,
    z: Math.max(depth + relief, baseD) / MM,
  };

  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < position.length; i += 3) { cx += position[i]; cy += position[i + 1]; cz += position[i + 2]; }
  const n = position.length / 3;
  cx /= n; cy /= n; cz /= n;
  let radius = 0;
  for (let i = 0; i < position.length; i += 3) {
    const d = Math.hypot(position[i] - cx, position[i + 1] - cy, position[i + 2] - cz);
    if (d > radius) radius = d;
  }

  const panel: PanelResult = {
    position,
    normal: new Float32Array(nor),
    uv: new Float32Array(uvs),
    color: new Float32Array(col),
    thickness: new Float32Array(thk),
    finish: new Float32Array(fin),
    index: new Uint32Array(idx),
    center: [cx, cy, cz],
    radius,
    boundingMm,
  };

  // Volume from the solid: masked area times the mean thickness. The price is computed
  // in Convex from grams, and grams come from this number, so it is not decoration.
  let cells = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (inside(x, y)) cells++;
  const cellMm2 = (scale / MM) ** 2;
  const volumeMm3 = cells * cellMm2 * (depthMm + reliefMm / 2) + (baseW / MM) * (baseD / MM) * (baseH / MM);

  const metrics: PreviewMetrics = {
    volumeMm3,
    shellVolumeMm3: volumeMm3,
    boundingMm,
    triangles: idx.length / 3,
    buildMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt,
  } as PreviewMetrics;

  return { panel, metrics, bands };
}

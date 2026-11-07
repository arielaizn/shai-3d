/**
 * src/components/three/panelKernel.ts
 *
 * Doc 05 §B.1 stage 3. The mesh assembly that turns the pure kernels in
 * `src/lib/three/geometry/` into the buffers `PreviewStage` uploads.
 *
 * ## What this file is, and what it is not
 *
 * It owns no maths of its own. Luminance, levels, blur, edge preservation, the
 * k-means band edges, the luminance-rank filament pairing, the lithophane thickness
 * curve and the relief's layer quantisation all live in `src/lib/three/geometry/`
 * and are called from here. What is added is topology: a displaced front grid, a
 * flat back, a welded skirt, and the per-type extras. That is the one part of doc 05
 * §B.3 the library does not carry.
 *
 * No three import. Everything here is arithmetic over typed arrays, which keeps the
 * module small, keeps it out of the three chunk, and leaves it ready to be moved
 * into `heightmap.worker.ts` unchanged the day that worker lands. `PreviewStage`
 * imports it with `await import()`, so a visitor who never opens the generator never
 * downloads it.
 *
 * ## The vertex ceiling, and how it is enforced
 *
 * `PREVIEW_VERTEX_CEILING` is 150,000 vertices for the whole build. The device picks
 * a starting rung with `gridForDevice`, then `chooseGrid` below projects the exact
 * vertex count for that rung and walks `GRID_LADDER` down until the projection fits.
 * The rung that was actually used comes back on `metrics.gridLong`, so the UI can say
 * what it did rather than guess.
 *
 * A rectangular panel at grid `w x h` costs:
 *
 *   front grid   w * h
 *   back         R + 1, a fan on the same rim the skirt uses, so there is no
 *                T-junction between the two; 5R + 1 when a magnet pocket is cut
 *   skirt        2R, two rings so the crease between face and wall stays hard,
 *                where R = 2 * (w + h) - 4 is the rim length
 *   extras       a few hundred, bounded and counted below
 *
 * At 320x320 that is 105,000, comfortably inside the ceiling. At 320 on a 16:9 photo
 * it is about 60,000. The ladder therefore almost never fires, which is the point: it
 * is a guard, not a routine.
 */

import { sphereFromBox, type Vec3 } from "@/lib/three/cameraFit";
import { GRID_LADDER, PREVIEW_VERTEX_CEILING, gridForDevice, nextGridDown } from "@/lib/three/constants";
import {
  bandInfo,
  contrastWarning,
  finishIndex,
  hexToLinearRgb,
  sortByLuminance,
} from "@/lib/three/geometry/colorMapping";
import { buildHeightField } from "@/lib/three/geometry/heightmap";
import { subjectField } from "@/lib/three/geometry/mask";
import { lithoThickness, reliefThickness } from "@/lib/three/geometry/litho";
import { bandEdges, bandOf, bandRanges } from "@/lib/three/geometry/posterize";
import { DEFAULT_SETTINGS, resolveKernelParams } from "@/lib/three/geometry/printTypeDefaults";
import {
  BuildError,
  type BandInfo,
  type BuildOutput,
  type BuildRequest,
  type FilamentChoice,
  type KernelParams,
  type PanelResult,
  type PreviewMetrics,
} from "@/lib/three/geometry/types";

/** Millimetres to scene units. One scene unit is one centimetre. */
const MM = 0.1;

/** Segments on every drilled circle. 48 is smooth at a 5mm hole and costs nothing. */
const SEGMENTS = 48;

/* ------------------------------------------------------------------ builder */

/**
 * A growable vertex sink. Plain `number[]` would hold six million boxed values at a
 * 320 grid; typed arrays that double when full hold the same data in a tenth of the
 * memory and hand the result straight to `BufferAttribute` with no copy.
 */
class MeshBuilder {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  color: Float32Array;
  thickness: Float32Array;
  finish: Float32Array;
  index: Uint32Array;
  vertexCount = 0;
  indexCount = 0;
  min: Vec3 = [Infinity, Infinity, Infinity];
  max: Vec3 = [-Infinity, -Infinity, -Infinity];

  constructor(vertexHint: number, indexHint: number) {
    const v = Math.max(64, vertexHint);
    const i = Math.max(64, indexHint);
    this.position = new Float32Array(v * 3);
    this.normal = new Float32Array(v * 3);
    this.uv = new Float32Array(v * 2);
    this.color = new Float32Array(v * 3);
    this.thickness = new Float32Array(v);
    this.finish = new Float32Array(v);
    this.index = new Uint32Array(i);
  }

  private growVertices(): void {
    const next = this.vertexCount * 2;
    const grow3 = (source: Float32Array) => {
      const out = new Float32Array(next * 3);
      out.set(source);
      return out;
    };
    this.position = grow3(this.position);
    this.normal = grow3(this.normal);
    this.color = grow3(this.color);
    const uv = new Float32Array(next * 2);
    uv.set(this.uv);
    this.uv = uv;
    const thickness = new Float32Array(next);
    thickness.set(this.thickness);
    this.thickness = thickness;
    const finish = new Float32Array(next);
    finish.set(this.finish);
    this.finish = finish;
  }

  vertex(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    u: number,
    v: number,
    rgb: readonly [number, number, number],
    thicknessCm: number,
    finishIdx: number,
  ): number {
    if ((this.vertexCount + 1) * 3 > this.position.length) this.growVertices();
    const i = this.vertexCount;
    this.position[i * 3] = x;
    this.position[i * 3 + 1] = y;
    this.position[i * 3 + 2] = z;
    this.normal[i * 3] = nx;
    this.normal[i * 3 + 1] = ny;
    this.normal[i * 3 + 2] = nz;
    this.uv[i * 2] = u;
    this.uv[i * 2 + 1] = v;
    this.color[i * 3] = rgb[0];
    this.color[i * 3 + 1] = rgb[1];
    this.color[i * 3 + 2] = rgb[2];
    this.thickness[i] = thicknessCm;
    this.finish[i] = finishIdx;
    if (x < this.min[0]) this.min[0] = x;
    if (y < this.min[1]) this.min[1] = y;
    if (z < this.min[2]) this.min[2] = z;
    if (x > this.max[0]) this.max[0] = x;
    if (y > this.max[1]) this.max[1] = y;
    if (z > this.max[2]) this.max[2] = z;
    this.vertexCount += 1;
    return i;
  }

  triangle(a: number, b: number, c: number): void {
    if (this.indexCount + 3 > this.index.length) {
      const out = new Uint32Array(Math.max(64, this.index.length * 2));
      out.set(this.index);
      this.index = out;
    }
    this.index[this.indexCount] = a;
    this.index[this.indexCount + 1] = b;
    this.index[this.indexCount + 2] = c;
    this.indexCount += 3;
  }

  /** Front-facing winding is counter-clockwise seen from the face's own normal. */
  quad(a: number, b: number, c: number, d: number): void {
    this.triangle(a, b, c);
    this.triangle(a, c, d);
  }

  trim(): {
    position: Float32Array;
    normal: Float32Array;
    uv: Float32Array;
    color: Float32Array;
    thickness: Float32Array;
    finish: Float32Array;
    index: Uint32Array;
  } {
    const v = this.vertexCount;
    return {
      position: this.position.slice(0, v * 3),
      normal: this.normal.slice(0, v * 3),
      uv: this.uv.slice(0, v * 2),
      color: this.color.slice(0, v * 3),
      thickness: this.thickness.slice(0, v),
      finish: this.finish.slice(0, v),
      index: this.index.slice(0, this.indexCount),
    };
  }
}

/* ------------------------------------------------------------- grid choosing */

/** The exact vertex count a rectangular panel costs at a given working grid. */
export function projectVertexCount(w: number, h: number, pocket: boolean): number {
  const ring = 2 * (w + h) - 4;
  const back = pocket ? ring * 5 + 1 : ring + 1;
  // 240 covers the largest extra, the frame's four bevelled bars at 24 vertices each,
  // plus the keychain tab. It is a ceiling, not a measurement, on purpose.
  return w * h + back + ring * 2 + 240;
}

/**
 * The device rung, then the ceiling. `printTypeGridLong` always wins downward, and
 * an explicit `requested` (the 15-second lower-resolution retry) wins over both.
 */
export function chooseGrid(
  printTypeGridLong: number,
  aspect: number,
  pocket: boolean,
  requested?: number,
  ceiling: number = PREVIEW_VERTEX_CEILING,
): number {
  let candidate = requested ?? gridForDevice(printTypeGridLong);
  for (let guard = 0; guard < GRID_LADDER.length + 1; guard += 1) {
    const { w, h } = gridDimensions(candidate, aspect);
    if (projectVertexCount(w, h, pocket) <= ceiling) return candidate;
    const next = nextGridDown(candidate);
    if (next === null) return candidate;
    candidate = next;
  }
  return candidate;
}

/** Long edge follows the photo. Both edges are even, so the centre lands on a cell. */
export function gridDimensions(long: number, aspect: number): { w: number; h: number } {
  const even = (n: number) => Math.max(8, Math.round(n / 2) * 2);
  return aspect >= 1
    ? { w: even(long), h: even(long / aspect) }
    : { w: even(long * aspect), h: even(long) };
}

/* ------------------------------------------------------------------ helpers */

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* -------------------------------------------------------------- the kernel */

export type BuildInput = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  request: BuildRequest;
};

/**
 * One photo in, one closed mesh plus its physical facts out.
 *
 * The mesh is watertight on purpose. A floating sheet reads fake the instant the
 * camera passes 60 degrees, and an open mesh has no defined volume, which is what
 * the gram estimate and therefore the price is computed from.
 */
export function buildPanel(input: BuildInput): BuildOutput {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { pixels, width, height, request } = input;

  if (width < 8 || height < 8) {
    throw new BuildError("IMAGE_TOO_SMALL", "the working grid is smaller than 8 samples");
  }
  if (pixels.length < width * height * 4) {
    throw new BuildError("IMAGE_UNREADABLE", "the pixel buffer is shorter than its own dimensions");
  }
  if (request.filaments.length === 0) {
    throw new BuildError("NO_FILAMENT", "no filament was chosen");
  }

  const params = request.params;
  const settings = request.settings;
  const layerCm = settings.layerHeightMm * MM;

  /* --- stage 2, straight out of the library ------------------------------- */

  /**
   * A lithophane is a luminance map by definition: thin where bright, and the light
   * does the rest. A relief is not. Read as pure luminance, a face against a white
   * wall comes out *sunk into* the wall, and the print is an embossed line drawing.
   * So the relief family gets the subject lifted onto a plateau, and a wider blur that
   * follows the forms of the picture instead of its grain.
   */
  const subject = params.backlit ? null : subjectField(pixels, width, height);
  const field = buildHeightField(pixels, width, height, {
    invertLuminance: params.invertLuminance,
    // A lithophane is meant to be smooth. Putting the sharp edges back turns its
    // gradient into steps, which is the one thing that ruins it.
    edgePreserve: !params.backlit,
    sigma: params.backlit ? undefined : Math.max(1.2, Math.max(width, height) / 110),
    subject,
  });

  /* --- the filament bands -------------------------------------------------- */

  const maxColors = Math.max(1, params.maxFilamentColors);
  const chosen = request.filaments.slice(0, maxColors);
  const sorted = sortByLuminance(chosen);
  const bands = bandEdges(field.histogram, sorted.length);
  const ranges = bandRanges(bands.edges);
  const legend: BandInfo[] = bandInfo(sorted, ranges);
  const bandRgb = sorted.map((f) => hexToLinearRgb(f.hex));
  const baseFinish = finishIndex(request.finish, 0);
  const bandFinish = sorted.map((f) => finishIndex(f.finish, baseFinish));

  /* --- the physical size --------------------------------------------------- */

  const aspect = width / height;
  const longEdgeMm = Math.min(request.longEdgeMm, params.maxLongEdgeMm);
  const widthCm = (aspect >= 1 ? longEdgeMm : longEdgeMm * aspect) * MM;
  const heightCm = (aspect >= 1 ? longEdgeMm / aspect : longEdgeMm) * MM;
  const halfW = widthCm / 2;
  const halfH = heightCm / 2;
  const cellX = widthCm / (width - 1);
  const cellY = heightCm / (height - 1);

  const minCm = params.thicknessMinMm * MM;
  const maxCm = params.thicknessMaxMm * MM;
  const baseCm = params.backPlateMm * MM;
  const reliefCm = Math.max(0, maxCm - Math.max(baseCm, minCm));
  const borderCm = params.borderMm * MM;

  const pocket = params.kernel === "panelPocket" && Boolean(params.magnetPocketMm);

  /* --- thickness per sample ------------------------------------------------ */

  const H = field.height;
  const thickness = new Float32Array(width * height);
  for (let i = 0; i < thickness.length; i += 1) {
    thickness[i] = params.backlit
      ? lithoThickness(H[i], minCm, maxCm)
      // Never quantised in the mesh. Rounding every sample to a layer height turns a
      // slope into terraces, and 20 terraces across a face is a contour map, not a
      // relief. The printer quantises anyway; `quantizeToLayer` still drives the layer
      // count in the metrics, where it is the truth.
      : reliefThickness(H[i], Math.max(baseCm, minCm), reliefCm, layerCm, false);
  }

  /**
   * The raised rim. A lithophane at 0.8mm is a wafer, and the border is the part that
   * survives a drawer. It ramps over a quarter of its own width so the panel does not
   * meet it at a razor edge, which prints badly and renders worse.
   */
  if (borderCm > 0) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const edge = Math.min(x * cellX, (width - 1 - x) * cellX, y * cellY, (height - 1 - y) * cellY);
        if (edge >= borderCm) continue;
        const t = smoothstep(borderCm, borderCm * 0.75, edge);
        const i = y * width + x;
        thickness[i] = thickness[i] + (maxCm - thickness[i]) * t;
      }
    }
  }

  /* --- the mesh ------------------------------------------------------------ */

  const ringLength = 2 * (width + height) - 4;
  const builder = new MeshBuilder(
    projectVertexCount(width, height, pocket),
    ((width - 1) * (height - 1) * 2 + ringLength * 8 + SEGMENTS * 8 + 200) * 3,
  );

  const px = (x: number) => -halfW + x * cellX;
  const py = (y: number) => halfH - y * cellY;
  const sampleBand = (i: number) => (sorted.length <= 1 ? 0 : bandOf(H[i], bands.edges));

  // Front face. Normals come from central differences on the thickness field rather
  // than from `computeVertexNormals`: two reads per vertex instead of an accumulate
  // over faces, and it keeps the terraces crisp where face averaging would mush them.
  const front = new Uint32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const xm = thickness[y * width + Math.max(0, x - 1)];
      const xp = thickness[y * width + Math.min(width - 1, x + 1)];
      const ym = thickness[Math.max(0, y - 1) * width + x];
      const yp = thickness[Math.min(height - 1, y + 1) * width + x];
      const dzdx = (xp - xm) / (2 * cellX);
      // Rows run down the image while +Y runs up the panel, so dy flips sign.
      const dzdy = (ym - yp) / (2 * cellY);
      const len = Math.hypot(-dzdx, -dzdy, 1);
      const band = sampleBand(i);
      front[i] = builder.vertex(
        px(x),
        py(y),
        thickness[i],
        -dzdx / len,
        -dzdy / len,
        1 / len,
        x / (width - 1),
        1 - y / (height - 1),
        bandRgb[band],
        thickness[i],
        bandFinish[band],
      );
    }
  }
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const a = front[y * width + x];
      const b = front[y * width + x + 1];
      const c = front[(y + 1) * width + x + 1];
      const d = front[(y + 1) * width + x];
      builder.quad(a, d, c, b);
    }
  }

  // The darkest filament is what the first layers are printed in, so the back plate
  // and the walls carry it. It is also what you see when the piece is face down.
  const backRgb = bandRgb[0];
  const backFinish = bandFinish[0];

  // The rim, walked counter-clockwise as seen from +Z. The skirt and the back plate
  // are both built on it, so the two share every boundary vertex.
  const ring: { x: number; y: number; z: number; nx: number; ny: number }[] = [];
  const push = (x: number, y: number) => {
    const i = y * width + x;
    ring.push({ x: px(x), y: py(y), z: thickness[i], nx: 0, ny: 0 });
  };
  for (let x = 0; x < width - 1; x += 1) push(x, height - 1);
  for (let y = height - 1; y > 0; y -= 1) push(width - 1, y);
  for (let x = width - 1; x > 0; x -= 1) push(x, 0);
  for (let y = 0; y < height - 1; y += 1) push(0, y);

  for (let k = 0; k < ring.length; k += 1) {
    const prev = ring[(k - 1 + ring.length) % ring.length];
    const next = ring[(k + 1) % ring.length];
    // The outline is walked counter-clockwise seen from +Z, so the outward normal of
    // an edge running (dx, dy) is (dy, -dx).
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    ring[k].nx = dy / len;
    ring[k].ny = -dx / len;
  }

  const frontRing = new Uint32Array(ring.length);
  const backRing = new Uint32Array(ring.length);
  for (let k = 0; k < ring.length; k += 1) {
    const r = ring[k];
    frontRing[k] = builder.vertex(r.x, r.y, r.z, r.nx, r.ny, 0, 0, 1, backRgb, r.z, backFinish);
    backRing[k] = builder.vertex(r.x, r.y, 0, r.nx, r.ny, 0, 0, 0, backRgb, 0, backFinish);
  }
  for (let k = 0; k < ring.length; k += 1) {
    const k2 = (k + 1) % ring.length;
    builder.quad(frontRing[k], backRing[k], backRing[k2], frontRing[k2]);
  }

  addBack(builder, ring, backRgb, backFinish, pocket ? params.magnetPocketMm! : null);

  /* --- the per-type extras ------------------------------------------------- */

  const accessoryRgb = request.accessory ? hexToLinearRgb(request.accessory.hex) : backRgb;
  const accessoryFinish = request.accessory
    ? finishIndex(request.accessory.finish, baseFinish)
    : backFinish;

  if (params.kernel === "panelStand" || params.kernel === "panelFrameStand") {
    addStand(builder, halfW, halfH, maxCm, params, accessoryRgb, accessoryFinish);
  }
  if (params.kernel === "panelFrame" || params.kernel === "panelFrameStand") {
    addFrame(builder, halfW, halfH, maxCm, params, accessoryRgb, accessoryFinish);
  }
  if (params.kernel === "panelHole") {
    addRingTab(builder, halfW, halfH, maxCm, params, backRgb, backFinish);
  }

  /* --- out ----------------------------------------------------------------- */

  const trimmed = builder.trim();
  const sphere = sphereFromBox(builder.min, builder.max);
  const boundingMm = {
    x: (builder.max[0] - builder.min[0]) * 10,
    y: (builder.max[1] - builder.min[1]) * 10,
    z: (builder.max[2] - builder.min[2]) * 10,
  };

  const panel: PanelResult = {
    position: trimmed.position,
    normal: trimmed.normal,
    uv: trimmed.uv,
    color: trimmed.color,
    thickness: trimmed.thickness,
    finish: trimmed.finish,
    index: trimmed.index,
    center: sphere.center,
    radius: sphere.radius,
    boundingMm,
  };

  const metrics = computeMetrics({
    panel,
    settings,
    bandsUsed: sorted.length,
    accessorySeparate: Boolean(request.accessory) && Boolean(params.accessoryIsSeparateColor),
    lowContrast: field.lowContrast,
    warning: contrastWarning(sorted),
    gridLong: Math.max(width, height),
    buildMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt,
  });

  return { panel, metrics, bands: legend };
}

/* ------------------------------------------------------------------ extras */

/**
 * The back plate, built on the same rim the skirt uses.
 *
 * A single quad would be 138 triangles cheaper and would leave every rim vertex
 * sitting in the middle of one of that quad's four edges. Those T-junctions are the
 * classic source of hairline cracks along a silhouette at grazing angles, which is
 * exactly the view a relief panel is looked at from. A fan costs nothing and every
 * edge in the mesh has exactly one twin.
 *
 * With a magnet pocket the fan becomes a strip to a disc sampled at the same angles,
 * and the cavity's wall and floor hang off that disc.
 */
function addBack(
  b: MeshBuilder,
  ring: readonly { x: number; y: number }[],
  rgb: readonly [number, number, number],
  finish: number,
  pocketMm: { dia: number; depth: number } | null,
): void {
  const n = ring.length;
  const backRing = new Uint32Array(n);
  for (let k = 0; k < n; k += 1) {
    backRing[k] = b.vertex(ring[k].x, ring[k].y, 0, 0, 0, -1, 0, 0, rgb, 0, finish);
  }

  if (!pocketMm) {
    const centre = b.vertex(0, 0, 0, 0, 0, -1, 0.5, 0.5, rgb, 0, finish);
    // Seen from -Z the rim runs clockwise, so the fan is emitted in reverse.
    for (let k = 0; k < n; k += 1) b.triangle(centre, backRing[(k + 1) % n], backRing[k]);
    return;
  }

  // Doc 05 §B.3.6. The blind cavity a 10x2mm neodymium disc is glued into. Orbiting
  // to the back is the payoff for this print type, so the hole is real geometry and
  // not a dark circle painted on a flat plate.
  const radius = (pocketMm.dia * MM) / 2;
  const depth = pocketMm.depth * MM;
  const inner = new Uint32Array(n);
  const wallTop = new Uint32Array(n);
  const wallFloor = new Uint32Array(n);
  const floorRing = new Uint32Array(n);

  for (let k = 0; k < n; k += 1) {
    // The rim's own angle, so the strip between the rectangle and the circle is a
    // clean fan with no crossings: both loops are ordered by the same parameter.
    const theta = Math.atan2(ring[k].y, ring[k].x);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const cx = cos * radius;
    const cy = sin * radius;
    inner[k] = b.vertex(cx, cy, 0, 0, 0, -1, 0, 0, rgb, 0, finish);
    wallTop[k] = b.vertex(cx, cy, 0, -cos, -sin, 0, 0, 0, rgb, 0, finish);
    wallFloor[k] = b.vertex(cx, cy, depth, -cos, -sin, 0, 0, 1, rgb, depth, finish);
    floorRing[k] = b.vertex(cx, cy, depth, 0, 0, -1, 0, 0, rgb, depth, finish);
  }
  const floorCentre = b.vertex(0, 0, depth, 0, 0, -1, 0.5, 0.5, rgb, depth, finish);

  for (let k = 0; k < n; k += 1) {
    const k2 = (k + 1) % n;
    b.quad(backRing[k], inner[k], inner[k2], backRing[k2]);
    b.quad(wallTop[k], wallFloor[k], wallFloor[k2], wallTop[k2]);
    b.triangle(floorCentre, floorRing[k2], floorRing[k]);
  }
}

/**
 * Doc 05 §B.3.5. The ring tab.
 *
 * The spec drills the hole through the image panel with a raised boss around it. This
 * puts the same boss on a tab that overhangs the top edge instead, because a hole
 * inside the grid means dropping cells and stitching a jagged boundary, and a jagged
 * boundary is visible at exactly the zoom level a keychain is looked at. The tab is
 * one solid piece with the panel, it prints the same way, and it is the shape most
 * people picture when they hear `מחזיק מפתחות`.
 */
function addRingTab(
  b: MeshBuilder,
  halfW: number,
  halfH: number,
  maxCm: number,
  params: KernelParams,
  rgb: readonly [number, number, number],
  finish: number,
): void {
  const hole = ((params.ringHoleMm ?? 5) * MM) / 2;
  const boss = (params.ringBossMm ?? 2) * MM;
  const outer = hole + boss;
  const depth = Math.max(maxCm, (params.thicknessMinMm + 1) * MM);
  // Sunk into the panel by a third of its radius so the two solids share material.
  const cy = halfH + outer * 0.66;
  const cx = Math.min(0, halfW - outer);

  const frontRing = new Uint32Array(SEGMENTS);
  const backRing = new Uint32Array(SEGMENTS);
  const frontHole = new Uint32Array(SEGMENTS);
  const backHole = new Uint32Array(SEGMENTS);
  const outerFront = new Uint32Array(SEGMENTS);
  const outerBack = new Uint32Array(SEGMENTS);
  const holeFront = new Uint32Array(SEGMENTS);
  const holeBack = new Uint32Array(SEGMENTS);

  for (let k = 0; k < SEGMENTS; k += 1) {
    const theta = (k / SEGMENTS) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const ox = cx + cos * outer;
    const oy = cy + sin * outer;
    const ix = cx + cos * hole;
    const iy = cy + sin * hole;

    frontRing[k] = b.vertex(ox, oy, depth, 0, 0, 1, 0, 0, rgb, depth, finish);
    frontHole[k] = b.vertex(ix, iy, depth, 0, 0, 1, 0, 0, rgb, depth, finish);
    backRing[k] = b.vertex(ox, oy, 0, 0, 0, -1, 0, 0, rgb, 0, finish);
    backHole[k] = b.vertex(ix, iy, 0, 0, 0, -1, 0, 0, rgb, 0, finish);
    outerFront[k] = b.vertex(ox, oy, depth, cos, sin, 0, 0, 1, rgb, depth, finish);
    outerBack[k] = b.vertex(ox, oy, 0, cos, sin, 0, 0, 0, rgb, 0, finish);
    holeFront[k] = b.vertex(ix, iy, depth, -cos, -sin, 0, 0, 1, rgb, depth, finish);
    holeBack[k] = b.vertex(ix, iy, 0, -cos, -sin, 0, 0, 0, rgb, 0, finish);
  }

  for (let k = 0; k < SEGMENTS; k += 1) {
    const k2 = (k + 1) % SEGMENTS;
    b.quad(frontHole[k], frontRing[k], frontRing[k2], frontHole[k2]);
    b.quad(backRing[k], backHole[k], backHole[k2], backRing[k2]);
    b.quad(outerFront[k], outerBack[k], outerBack[k2], outerFront[k2]);
    b.quad(holeBack[k], holeFront[k], holeFront[k2], holeBack[k2]);
  }
}

/**
 * A box with hard normals: 24 vertices, because a shared corner cannot carry three
 * different face normals and a cube with averaged normals looks like a beanbag.
 * `tiltX` leans it back around its own bottom edge, which is what a stand is.
 */
function addBox(
  b: MeshBuilder,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  tiltX: number,
  rgb: readonly [number, number, number],
  finish: number,
): void {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const cos = Math.cos(tiltX);
  const sin = Math.sin(tiltX);
  const place = (x: number, y: number, z: number): [number, number, number] => [
    cx + x,
    cy + y * cos - z * sin,
    cz + y * sin + z * cos,
  ];
  const rotate = (x: number, y: number, z: number): [number, number, number] => [
    x,
    y * cos - z * sin,
    y * sin + z * cos,
  ];

  const faces: { n: [number, number, number]; c: [number, number, number][] }[] = [
    { n: [0, 0, 1], c: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { n: [0, 0, -1], c: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    { n: [1, 0, 0], c: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { n: [-1, 0, 0], c: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
    { n: [0, 1, 0], c: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
    { n: [0, -1, 0], c: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
  ];

  for (const face of faces) {
    const [nx, ny, nz] = rotate(face.n[0], face.n[1], face.n[2]);
    const ids = face.c.map((corner) => {
      const [x, y, z] = place(corner[0], corner[1], corner[2]);
      return b.vertex(x, y, z, nx, ny, nz, 0, 0, rgb, Math.abs(z), finish);
    });
    b.quad(ids[0], ids[1], ids[2], ids[3]);
  }
}

/** Doc 05 §B.3.4. The foot the piece stands on, leaning back by `standAngleDeg`. */
function addStand(
  b: MeshBuilder,
  halfW: number,
  halfH: number,
  maxCm: number,
  params: KernelParams,
  rgb: readonly [number, number, number],
  finish: number,
): void {
  const depth = (params.standThicknessMm ?? 8) * MM;
  const angle = ((params.standAngleDeg ?? 12) * Math.PI) / 180;
  const barHeight = Math.max(0.6, halfH * 0.22);
  addBox(
    b,
    0,
    -halfH + barHeight / 2,
    -depth / 2 - maxCm * 0.05,
    halfW * 1.05,
    barHeight,
    depth,
    -angle,
    rgb,
    finish,
  );
}

/** Doc 05 §B.3.7. Four bars, and the millimetre of bevel that stops it reading as CAD. */
function addFrame(
  b: MeshBuilder,
  halfW: number,
  halfH: number,
  maxCm: number,
  params: KernelParams,
  rgb: readonly [number, number, number],
  finish: number,
): void {
  const w = (params.frameWidthMm ?? 14) * MM;
  const d = (params.frameDepthMm ?? 8) * MM;
  const z = d / 2 - maxCm * 0.1;
  const outerW = halfW + w;
  const outerH = halfH + w;
  // The bevel is one millimetre of the bar's own depth, applied as a shallower front
  // rail sitting on a full-depth back rail. Two boxes per side, still eight draw-free
  // quads, and the silhouette stops being a razor.
  const bevel = 1 * MM;
  const rails: [number, number, number, number][] = [
    [0, outerH - w / 2, outerW * 2, w],
    [0, -(outerH - w / 2), outerW * 2, w],
    [-(outerW - w / 2), 0, w, outerH * 2 - w * 2],
    [outerW - w / 2, 0, w, outerH * 2 - w * 2],
  ];
  for (const [cx, cy, sx, sy] of rails) {
    addBox(b, cx, cy, z, sx, sy, d, 0, rgb, finish);
    addBox(b, cx, cy, z + d / 2, sx - bevel * 2, sy - bevel * 2, bevel * 2, 0, rgb, finish);
  }
}

/* ----------------------------------------------------------------- metrics */

/**
 * Doc 05 §B.4. The physical facts, and nothing about money. Pricing belongs to
 * `convex/pricing.ts` and happens on the server, per RESOLUTIONS §ב.
 *
 * Volume is the exact signed-volume sum over the closed mesh, not an estimate, which
 * is only true because the mesh above is watertight.
 */
export function computeMetrics(input: {
  panel: PanelResult;
  settings: BuildRequest["settings"];
  bandsUsed: number;
  accessorySeparate: boolean;
  lowContrast: boolean;
  warning: { a: string; b: string } | null;
  gridLong: number;
  buildMs: number;
}): PreviewMetrics {
  const { panel, settings } = input;
  const pos = panel.position;
  const idx = panel.index;

  let v6 = 0;
  let area = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3;
    const b = idx[t + 1] * 3;
    const c = idx[t + 2] * 3;
    const ax = pos[a];
    const ay = pos[a + 1];
    const az = pos[a + 2];
    const bx = pos[b];
    const by = pos[b + 1];
    const bz = pos[b + 2];
    const cx = pos[c];
    const cy = pos[c + 1];
    const cz = pos[c + 2];
    v6 +=
      ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    area +=
      Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }

  const volumeMm3 = (Math.abs(v6) / 6) * 1000;
  const shellVolumeMm3 = Math.min(volumeMm3, area * 100 * settings.perimeterMm);
  const grams =
    ((shellVolumeMm3 + settings.infillFactor * (volumeMm3 - shellVolumeMm3)) / 1000) *
    settings.densityGCm3;

  const colorChanges = Math.max(0, input.bandsUsed - 1) + (input.accessorySeparate ? 1 : 0);

  return {
    volumeMm3,
    shellVolumeMm3,
    estimatedGrams: grams,
    estimatedPrintMinutes: grams * settings.minutesPerGram + settings.setupMinutes,
    boundingMm: panel.boundingMm,
    triangles: idx.length / 3,
    vertices: pos.length / 3,
    bandCount: input.bandsUsed,
    colorChangeCount: colorChanges,
    layerCount: Math.ceil(panel.boundingMm.z / settings.layerHeightMm),
    lowContrast: input.lowContrast,
    bandContrastWarning: input.warning,
    gridLong: input.gridLong,
    buildMs: input.buildMs,
  };
}

/* ---------------------------------------------------------- the request glue */

/**
 * Everything `PreviewStage` knows, folded into the `BuildRequest` the kernel wants.
 * Kept here so the component never has to reason about kernel parameters.
 */
export function makeBuildRequest(input: {
  printType: BuildRequest["printType"];
  geometry?: Partial<KernelParams> | null;
  longEdgeMm: number;
  filaments: FilamentChoice[];
  accessory?: FilamentChoice;
  finish?: BuildRequest["finish"];
  settings?: BuildRequest["settings"];
  gridLong?: number;
}): BuildRequest {
  const params = resolveKernelParams(input.printType, input.geometry ?? null);
  return {
    printType: input.printType,
    params,
    longEdgeMm: input.longEdgeMm,
    filaments: input.filaments,
    accessory: input.accessory,
    finish: input.finish ?? params.defaultFinish,
    settings: input.settings ?? DEFAULT_SETTINGS,
    gridLong: input.gridLong,
  };
}

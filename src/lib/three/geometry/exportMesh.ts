/**
 * The files Shai prints from.
 *
 * Until now the generator ended at a picture. The visitor configured a piece, saw it
 * turning on the screen, pressed through to WhatsApp, and what reached Shai was a
 * description and a photograph. He then had to rebuild the model himself from the
 * customer's picture, which is the one part of this that a computer should be doing.
 * That gap is what made the whole thing read as a demo.
 *
 * So the mesh the browser already built gets written out and travels with the order.
 *
 * TWO FORMATS, ON PURPOSE.
 *
 *   STL  what every slicer on earth opens, and what he actually prints. It carries no
 *        colour, which is correct: colour on this piece is spool changes at layer
 *        heights, and that is a slicer decision, not a mesh property.
 *   PLY  the same mesh with the per-vertex colour kept. It is what he opens to see
 *        which band is which before setting the changes up, and it is the honest place
 *        to preserve information the STL drops.
 *
 * UNITS. One scene unit is one centimetre (`MM = 0.1` in the kernels). Every slicer
 * reads an STL as millimetres, so everything here is multiplied by ten on the way out.
 * Getting this wrong produces a piece one tenth the size, which prints, looks
 * plausible, and wastes a whole evening.
 */

import { linearToSrgb } from "./heightmap";
import type { PanelResult } from "./types";

/** Scene units are centimetres; printing files are millimetres. */
const CM_TO_MM = 10;

export type MeshFormat = "stl" | "ply";

export const MIME: Record<MeshFormat, string> = {
  stl: "model/stl",
  ply: "application/octet-stream",
};

/**
 * Binary STL. 80 bytes of header, a triangle count, then fifty bytes per triangle.
 *
 * The header is not a comment field in any spec, and some tools show it, so it names
 * the site rather than leaving eighty bytes of whatever happened to be in memory.
 * It must not begin with "solid", which is how a reader decides a file is ASCII.
 */
export function toBinaryStl(panel: PanelResult): ArrayBuffer {
  const { position, normal, index } = panel;
  const triangles = index.length / 3;
  const buffer = new ArrayBuffer(84 + triangles * 50);
  const view = new DataView(buffer);

  const header = `shai-3d generator mesh, ${triangles} triangles, millimetres`;
  const bytes = new Uint8Array(buffer, 0, 80);
  for (let i = 0; i < header.length && i < 80; i += 1) bytes[i] = header.charCodeAt(i) & 0x7f;

  view.setUint32(80, triangles, true);

  let at = 84;
  for (let t = 0; t < triangles; t += 1) {
    const a = index[t * 3] * 3;
    const b = index[t * 3 + 1] * 3;
    const c = index[t * 3 + 2] * 3;

    // The facet normal is the average of the three vertex normals. A slicer recomputes
    // winding anyway, and an averaged normal is closer to the truth than picking one.
    view.setFloat32(at, (normal[a] + normal[b] + normal[c]) / 3, true);
    view.setFloat32(at + 4, (normal[a + 1] + normal[b + 1] + normal[c + 1]) / 3, true);
    view.setFloat32(at + 8, (normal[a + 2] + normal[b + 2] + normal[c + 2]) / 3, true);
    at += 12;

    for (const v of [a, b, c]) {
      view.setFloat32(at, position[v] * CM_TO_MM, true);
      view.setFloat32(at + 4, position[v + 1] * CM_TO_MM, true);
      view.setFloat32(at + 8, position[v + 2] * CM_TO_MM, true);
      at += 12;
    }

    view.setUint16(at, 0, true); // attribute byte count, unused
    at += 2;
  }

  return buffer;
}

/**
 * Binary little-endian PLY with per-vertex colour.
 *
 * The kernel's colour attribute is linear RGB, because that is what a shader wants.
 * A file is read by people and by tools that assume sRGB, so it is converted on the
 * way out. Skipping that step is how a mesh arrives looking washed out and nobody can
 * say why.
 */
export function toBinaryPly(panel: PanelResult): ArrayBuffer {
  const { position, color, index } = panel;
  const vertices = position.length / 3;
  const faces = index.length / 3;

  const header =
    "ply\n" +
    "format binary_little_endian 1.0\n" +
    "comment shai-3d generator mesh, millimetres\n" +
    `element vertex ${vertices}\n` +
    "property float x\nproperty float y\nproperty float z\n" +
    "property uchar red\nproperty uchar green\nproperty uchar blue\n" +
    `element face ${faces}\n` +
    "property list uchar uint vertex_indices\n" +
    "end_header\n";

  const headerBytes = new TextEncoder().encode(header);
  const vertexBytes = vertices * 15; // 3 floats + 3 bytes
  const faceBytes = faces * 13; // 1 count byte + 3 uint32
  const buffer = new ArrayBuffer(headerBytes.length + vertexBytes + faceBytes);
  const out = new Uint8Array(buffer);
  out.set(headerBytes, 0);

  const view = new DataView(buffer);
  let at = headerBytes.length;

  for (let v = 0; v < vertices; v += 1) {
    const p = v * 3;
    view.setFloat32(at, position[p] * CM_TO_MM, true);
    view.setFloat32(at + 4, position[p + 1] * CM_TO_MM, true);
    view.setFloat32(at + 8, position[p + 2] * CM_TO_MM, true);
    at += 12;
    for (let ch = 0; ch < 3; ch += 1) {
      const linear = color[p + ch] ?? 1;
      out[at + ch] = Math.max(0, Math.min(255, Math.round(linearToSrgb(linear) * 255)));
    }
    at += 3;
  }

  for (let f = 0; f < faces; f += 1) {
    out[at] = 3;
    at += 1;
    view.setUint32(at, index[f * 3], true);
    view.setUint32(at + 4, index[f * 3 + 1], true);
    view.setUint32(at + 8, index[f * 3 + 2], true);
    at += 12;
  }

  return buffer;
}

export function exportMesh(panel: PanelResult, format: MeshFormat): ArrayBuffer {
  return format === "stl" ? toBinaryStl(panel) : toBinaryPly(panel);
}

/** `shai-3d-A7K2-relief.stl`. The code is what the WhatsApp thread calls the order. */
export function modelFileName(publicCode: string, printTypeKey: string, format: MeshFormat): string {
  const safe = publicCode.replace(/[^A-Za-z0-9-]/g, "") || "order";
  return `shai-3d-${safe}-${printTypeKey}.${format}`;
}

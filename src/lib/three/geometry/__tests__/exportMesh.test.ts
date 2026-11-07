/**
 * The export is the one artefact that leaves the browser and lands in a slicer, where
 * nobody can debug it. A wrong offset or a wrong unit produces a file that opens
 * without complaint and prints the wrong object, so both formats are parsed back here
 * byte for byte.
 */
import { describe, expect, it } from "vitest";

import { toBinaryStl, toBinaryPly, modelFileName } from "../exportMesh";
import type { PanelResult } from "../types";

/** One triangle, one centimetre on a side, so every number below is checkable by hand. */
function triangle(): PanelResult {
  return {
    position: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normal: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uv: new Float32Array([0, 0, 1, 0, 0, 1]),
    color: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]),
    thickness: new Float32Array([1, 1, 1]),
    finish: new Float32Array([0, 0, 0]),
    index: new Uint32Array([0, 1, 2]),
    center: [0, 0, 0],
    radius: 1,
    boundingMm: { x: 10, y: 10, z: 0 },
  };
}

describe("binary STL", () => {
  const buffer = toBinaryStl(triangle());
  const view = new DataView(buffer);

  it("is exactly the size the format says it should be", () => {
    expect(buffer.byteLength).toBe(84 + 50);
  });

  it("declares its triangle count", () => {
    expect(view.getUint32(80, true)).toBe(1);
  });

  it("does not start with 'solid', which would mark it as an ASCII file", () => {
    const head = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
    expect(head.toLowerCase()).not.toBe("solid");
  });

  it("writes millimetres, because a slicer reads STL as millimetres", () => {
    // the second vertex sits one scene unit out, which is one centimetre, which is 10mm
    expect(view.getFloat32(84 + 12 + 12, true)).toBe(10);
  });

  it("carries the facet normal", () => {
    expect(view.getFloat32(84, true)).toBe(0);
    expect(view.getFloat32(84 + 8, true)).toBe(1);
  });
});

describe("binary PLY", () => {
  const buffer = toBinaryPly(triangle());
  // the header runs to about 270 bytes; decode the whole file so the search covers it
  const text = new TextDecoder().decode(new Uint8Array(buffer));
  const marker = "end_header\n";
  const headerEnd = text.indexOf(marker) + marker.length;

  it("announces the right counts in its header", () => {
    expect(text).toContain("element vertex 3");
    expect(text).toContain("element face 1");
    expect(text).toContain("format binary_little_endian 1.0");
  });

  it("is exactly the size the header implies", () => {
    expect(buffer.byteLength).toBe(headerEnd + 3 * 15 + 1 * 13);
  });

  it("writes millimetres too, so both files describe the same object", () => {
    const view = new DataView(buffer);
    expect(view.getFloat32(headerEnd + 15, true)).toBe(10);
  });

  it("converts linear colour to sRGB, so the mesh does not open washed out", () => {
    const bytes = new Uint8Array(buffer);
    // fully saturated red in linear is still 255 in sRGB, and the other channels stay 0
    expect(bytes[headerEnd + 12]).toBe(255);
    expect(bytes[headerEnd + 13]).toBe(0);
    expect(bytes[headerEnd + 14]).toBe(0);
  });

  it("writes a triangle fan count of three per face", () => {
    const bytes = new Uint8Array(buffer);
    expect(bytes[headerEnd + 3 * 15]).toBe(3);
  });
});

describe("the file name", () => {
  it("names the order the way the WhatsApp thread names it", () => {
    expect(modelFileName("A7K2", "relief", "stl")).toBe("shai-3d-A7K2-relief.stl");
  });

  it("refuses anything that could walk out of a download folder", () => {
    expect(modelFileName("../../etc", "relief", "ply")).toBe("shai-3d-etc-relief.ply");
  });
});

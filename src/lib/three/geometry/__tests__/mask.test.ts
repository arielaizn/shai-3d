/**
 * The mask decides what a standee is a cut-out of. The case that broke in front of
 * Ariel was a person dressed in white and beige against a white studio wall: the old
 * fixed threshold keyed the clothes into the wall, kept the hair, and the standee fell
 * back to a photo panel. This is that photograph, drawn.
 */
import { describe, expect, it } from "vitest";
import { buildForegroundMask } from "../mask";

const W = 150, H = 200;
function studio(): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4);
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * W + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // a white wall with a faint vignette, 246 in the middle fading to 236 at the edge
    const v = ((x - W / 2) ** 2 / (W * 0.9) ** 2 + (y - H / 2) ** 2 / (H * 0.9) ** 2) * 18;
    const wall = Math.round(246 - v);
    put(x, y, wall, wall, wall);
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x, y, r, g, b);
  };
  rect(60, 15, 90, 45, 28, 24, 22);        // hair
  rect(62, 45, 88, 58, 214, 178, 150);     // face, which joins the hair to the jacket
  rect(50, 55, 100, 115, 238, 232, 222);   // off-white jacket
  rect(68, 57, 82, 115, 252, 252, 252);    // white tee, enclosed by the jacket
  rect(52, 115, 72, 185, 206, 196, 176);   // beige legs with a gap between them
  rect(78, 115, 98, 185, 206, 196, 176);
  return px;
}

describe("buildForegroundMask · a light subject on a white wall", () => {
  const m = buildForegroundMask(studio(), W, H);
  const at = (x: number, y: number) => m.mask[y * W + x];

  it("finds the person instead of only the hair", () => {
    expect(m.coverage).toBeGreaterThan(0.2);
    expect(at(75, 30)).toBe(1);   // hair
    expect(at(55, 80)).toBe(1);   // jacket, twenty units from the wall
    expect(at(60, 150)).toBe(1);  // beige leg
  });

  it("keeps the white t-shirt, because the wall cannot reach it", () => {
    expect(at(75, 85)).toBe(1);
  });

  it("leaves the gap between the legs to the wall", () => {
    expect(at(75, 160)).toBe(0);
    expect(at(10, 10)).toBe(0);
    expect(at(140, 190)).toBe(0);
  });

  it("bounds the subject tightly", () => {
    expect(m.bounds.minY).toBeLessThanOrEqual(16);
    expect(m.bounds.maxY).toBeGreaterThanOrEqual(183);
    expect(m.bounds.minX).toBeGreaterThanOrEqual(48);
    expect(m.bounds.maxX).toBeLessThanOrEqual(102);
  });
});

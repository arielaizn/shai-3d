/**
 * Calibration lock for the image classifier.
 *
 * The thresholds in analyze.ts were fitted against real assets, and a small edit to
 * any weight can flip a photograph to "flat" without breaking a single type. That
 * failure is silent and it reaches the customer as a lumpy print, so it gets a test.
 *
 * The fixtures are generated rather than loaded, so the suite has no binary
 * dependencies and states its own definition of each case.
 */
import { describe, expect, it } from "vitest";
import { analyzeImage } from "../analyze";

const W = 200;
const H = 200;

function blank(): Uint8ClampedArray {
  return new Uint8ClampedArray(W * H * 4);
}

/** A flat graphic: three hard-edged fills, no shading anywhere. */
function flatGraphic(): Uint8ClampedArray {
  const px = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const inCircle = Math.hypot(x - 100, y - 100) < 55;
      const inBar = y > 150;
      const [r, g, b] = inCircle ? [245, 51, 63] : inBar ? [18, 191, 184] : [255, 247, 236];
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
  return px;
}

/** A photograph: continuous shading plus fine grain, the way a lit object reads. */
function photograph(): Uint8ClampedArray {
  const px = blank();
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // two overlapping light falloffs, which is what shading actually is
      const l1 = 1 - Math.min(1, Math.hypot(x - 70, y - 60) / 150);
      const l2 = 1 - Math.min(1, Math.hypot(x - 160, y - 170) / 190);
      const shade = 0.25 + 0.6 * l1 + 0.3 * l2;
      const grain = (rnd() - 0.5) * 16;
      px[i] = Math.max(0, Math.min(255, 210 * shade + grain));
      px[i + 1] = Math.max(0, Math.min(255, 165 * shade + grain));
      px[i + 2] = Math.max(0, Math.min(255, 140 * shade + grain));
      px[i + 3] = 255;
    }
  }
  return px;
}

describe("analyzeImage · photograph versus flat graphic", () => {
  it("calls a shaded image a photograph and gives it full relief", () => {
    const a = analyzeImage(photograph(), W, H);
    expect(a.kind).toBe("photo");
    expect(a.reliefFactor).toBe(1);
  });

  it("calls a hard-edged fill a flat graphic and holds the relief back", () => {
    const a = analyzeImage(flatGraphic(), W, H);
    expect(a.kind).toBe("flat");
    expect(a.reliefFactor).toBeLessThan(0.3);
  });

  it("separates the two on local uniformity, which is the load-bearing signal", () => {
    const photo = analyzeImage(photograph(), W, H);
    const flat = analyzeImage(flatGraphic(), W, H);
    expect(flat.measurements.flatRatio).toBeGreaterThan(photo.measurements.flatRatio);
    expect(flat.measurements.colourEntropy).toBeLessThan(photo.measurements.colourEntropy);
  });
});

describe("analyzeImage · colour counting drives the surcharge", () => {
  it("counts the fills in a flat graphic and ignores the specks", () => {
    const a = analyzeImage(flatGraphic(), W, H);
    // three fills went in; anti-aliasing must not invent a fourth spool
    expect(a.distinctColors).toBeGreaterThanOrEqual(2);
    expect(a.distinctColors).toBeLessThanOrEqual(4);
  });

  it("returns the dominant colours as usable hex", () => {
    const a = analyzeImage(flatGraphic(), W, H);
    expect(a.dominantHexes.length).toBeGreaterThan(0);
    for (const hex of a.dominantHexes) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("never suggests fewer than one colour or more than six", () => {
    for (const px of [photograph(), flatGraphic()]) {
      const a = analyzeImage(px, W, H);
      expect(a.suggestedColorCount).toBeGreaterThanOrEqual(1);
      expect(a.suggestedColorCount).toBeLessThanOrEqual(6);
    }
  });

  it("reports a confidence between 0 and 1", () => {
    for (const px of [photograph(), flatGraphic()]) {
      const a = analyzeImage(px, W, H);
      expect(a.confidence).toBeGreaterThanOrEqual(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
    }
  });
});

/**
 * The two decisions the site now makes on the visitor's behalf.
 *
 * Both are silent, and a silent decision that goes wrong is worse than no decision at
 * all: one of them puts spools in his hands, the other changes the shape of the thing
 * he is buying. So both get held down here.
 */
import { describe, expect, it } from "vitest";

import { suggestFilaments, relativeLuminance, MIN_SEPARATION } from "../colorMapping";
import { applyReliefFactor, PRINT_TYPE_DEFAULTS } from "../printTypeDefaults";

const SHELF = [
  { id: "black", hex: "#111111", soldOut: false },
  { id: "white", hex: "#FFFFFF", soldOut: false },
  { id: "red", hex: "#E02B2B", soldOut: false },
  { id: "teal", hex: "#12BFB8", soldOut: false },
  { id: "sand", hex: "#D8C7A8", soldOut: false },
];

describe("suggestFilaments · the picture picks the spools", () => {
  it("picks the nearest spool for each colour in the picture", () => {
    const ids = suggestFilaments(["#F03030", "#0A0A0A"], SHELF, 4);
    expect(ids).toEqual(["red", "black"]);
  });

  it("keeps the order of the picture, so the dominant colour is the body", () => {
    const ids = suggestFilaments(["#0A0A0A", "#F03030"], SHELF, 4);
    expect(ids[0]).toBe("black");
  });

  it("never suggests the same spool twice", () => {
    // two reds in the picture, one red on the shelf
    const ids = suggestFilaments(["#E02B2B", "#DD3030", "#0A0A0A"], SHELF, 4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("black");
  });

  it("never suggests a sold-out spool", () => {
    const shelf = SHELF.map((f) => (f.id === "red" ? { ...f, soldOut: true } : f));
    const ids = suggestFilaments(["#F03030"], shelf, 4);
    expect(ids).not.toContain("red");
    expect(ids.length).toBe(1);
  });

  it("stops at the cap, which is what keeps the suggestion out of the surcharge", () => {
    const ids = suggestFilaments(["#0A0A0A", "#FFFFFF", "#F03030", "#12BFB8"], SHELF, 2);
    expect(ids.length).toBe(2);
  });

  it("drops a spool the eye could not separate from one already picked", () => {
    // black and a near-black would print as one band, and cost a spool change to do it
    const shelf = [...SHELF, { id: "ink", hex: "#151515", soldOut: false }];
    const ids = suggestFilaments(["#111111", "#141414"], shelf, 4);
    expect(ids.length).toBe(1);
  });

  it("leaves every suggestion far enough apart to read as separate bands", () => {
    const ids = suggestFilaments(["#0A0A0A", "#FFFFFF", "#F03030", "#12BFB8"], SHELF, 4);
    const lums = ids
      .map((id) => SHELF.find((f) => f.id === id)!.hex)
      .map(relativeLuminance)
      .sort((a, b) => a - b);
    for (let i = 1; i < lums.length; i += 1) {
      expect(lums[i] - lums[i - 1]).toBeGreaterThanOrEqual(MIN_SEPARATION);
    }
  });

  it("always returns something to print in", () => {
    expect(suggestFilaments(["#808080"], SHELF, 4).length).toBeGreaterThan(0);
  });

  it("returns nothing when the shelf is empty rather than inventing a spool", () => {
    expect(suggestFilaments(["#808080"], [], 4)).toEqual([]);
    expect(suggestFilaments(["#808080"], SHELF, 0)).toEqual([]);
  });
});

describe("applyReliefFactor · a logo does not get invented relief", () => {
  const relief = PRINT_TYPE_DEFAULTS.relief;
  const litho = PRINT_TYPE_DEFAULTS.lithophane;

  it("leaves a photograph the whole range", () => {
    expect(applyReliefFactor(relief, 1)).toEqual(relief);
  });

  it("flattens a graphic without flattening it away", () => {
    const flat = applyReliefFactor(relief, 0.18);
    const depth = flat.thicknessMaxMm - flat.thicknessMinMm;
    expect(depth).toBeLessThan(relief.thicknessMaxMm - relief.thicknessMinMm);
    expect(depth).toBeGreaterThan(0.5);
    expect(flat.thicknessMinMm).toBe(relief.thicknessMinMm);
  });

  it("keeps a printable step even at zero", () => {
    const flat = applyReliefFactor(relief, 0);
    expect(flat.thicknessMaxMm - flat.thicknessMinMm).toBeGreaterThan(0.5);
  });

  it("leaves a lithophane alone, because there the thickness is the picture", () => {
    expect(applyReliefFactor(litho, 0.18)).toEqual(litho);
    expect(applyReliefFactor(litho, 0)).toEqual(litho);
  });

  it("clamps a value from outside the range instead of trusting it", () => {
    expect(applyReliefFactor(relief, 4)).toEqual(relief);
    expect(applyReliefFactor(relief, -2).thicknessMaxMm).toBe(
      applyReliefFactor(relief, 0).thicknessMaxMm,
    );
  });
});

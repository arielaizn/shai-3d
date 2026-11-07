/**
 * src/lib/three/geometry/colorMapping.ts
 *
 * Doc 05 §B.2. How a visitor's chosen filaments become something you can read.
 *
 * The rule that does the real work: **sort the chosen filaments by relative luminance
 * and pair rank to rank, darkest filament into the darkest band.** This is not
 * cosmetic. If somebody picks black, red, yellow and white, the only arrangement that
 * reads as a picture is black in the shadows and white in the highlights. Any other
 * order produces a solarised poster, which is a real look but not the one they asked
 * for, and they would blame the print.
 *
 * Reordering by hand is offered as a secondary control (`להחליף סדר` in
 * `src/content/generator.ts`), and it rewrites the colour attribute only, in under
 * 20ms, with no rebuild.
 */

import { srgbToLinear } from "./heightmap";
import type { BandInfo, FilamentChoice } from "./types";

export type LinearRgb = [number, number, number];

export function hexToLinearRgb(hex: string): LinearRgb {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = Number.parseInt(full, 16);
  if (!Number.isFinite(int)) return [1, 1, 1];
  return [
    srgbToLinear(((int >> 16) & 255) / 255),
    srgbToLinear(((int >> 8) & 255) / 255),
    srgbToLinear((int & 255) / 255),
  ];
}

/** Rec.709 relative luminance on linearised channels, which is what WCAG uses too. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Doc 05 §B.2. Two filaments closer than this in relative luminance produce bands
 * that are almost indistinguishable in the print.
 */
export const MIN_SEPARATION = 0.06;

/** Darkest first, which is the order the bands are handed out in. */
export function sortByLuminance(filaments: readonly FilamentChoice[]): FilamentChoice[] {
  return [...filaments].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
}

/**
 * The legibility guard. Information, never an error: the preview still renders exactly
 * what was chosen, honestly flat, and the copy in `generator.colors.note.tooClose`
 * offers a darker alternative.
 */
export function contrastWarning(
  sorted: readonly FilamentChoice[],
): { a: string; b: string } | null {
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = relativeLuminance(sorted[i].hex) - relativeLuminance(sorted[i - 1].hex);
    if (gap < MIN_SEPARATION) {
      return { a: sorted[i - 1].nameHe, b: sorted[i].nameHe };
    }
  }
  return null;
}

/** 0 matte, 1 silk, 2 glow. The per-vertex `aFinish` attribute the material reads. */
export function finishIndex(finish: "matte" | "silk" | "glow" | undefined, fallback: number): number {
  if (finish === "matte") return 0;
  if (finish === "silk") return 1;
  if (finish === "glow") return 2;
  return fallback;
}

export function bandInfo(
  sorted: readonly FilamentChoice[],
  ranges: readonly { from: number; to: number }[],
): BandInfo[] {
  return sorted.map((filament, index) => ({
    from: ranges[index]?.from ?? 0,
    to: ranges[index]?.to ?? 1,
    hex: filament.hex,
    nameHe: filament.nameHe,
  }));
}

/* -------------------------------------------------------------------------- */
/* From the picture to the spools                                             */
/* -------------------------------------------------------------------------- */

/**
 * The image analyser hands back the colours the picture is actually made of. Those are
 * arbitrary RGB values, and Shai owns a finite shelf of spools, so something has to
 * pick the spool nearest each one. Doing it here rather than making the visitor do it
 * by eye is the whole point: he uploaded a picture, and the colour step should open
 * with his picture's colours already on it.
 */

/**
 * Redmean. A cheap approximation of perceptual distance that costs one square root and
 * beats plain RGB distance badly enough to matter here, because plain RGB distance
 * routinely maps a warm skin tone onto a green spool. Full Lab would be better and is
 * not worth the code for a shelf of about forty filaments.
 */
export function perceptualDistance(hexA: string, hexB: string): number {
  const a = hexToBytes(hexA);
  const b = hexToBytes(hexB);
  const rMean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db,
  );
}

function hexToBytes(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = Number.parseInt(full, 16);
  if (!Number.isFinite(int)) return [255, 255, 255];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export type SuggestableFilament = { id: string; hex: string; soldOut: boolean };

/**
 * The spools this picture wants, in the order the picture wants them, capped by what
 * the print type can hold.
 *
 * Two rules beyond nearest-neighbour, and both exist because the naive answer prints
 * badly:
 *
 *   **A spool is never suggested twice.** Two dominant colours can share a nearest
 *   spool, and returning it twice would charge the visitor for a colour change that
 *   changes nothing.
 *
 *   **A suggestion that lands within `MIN_SEPARATION` of one already picked is
 *   dropped.** Those two spools produce bands the eye cannot separate, so the second
 *   one is a spool change the visitor pays for and cannot see. `contrastWarning`
 *   already says this about a hand-made selection; suggesting one ourselves would be
 *   worse than letting him make it.
 *
 * A sold-out spool is never suggested. It stays visible on the grid with `אזל` on it,
 * which is a different question from what we put in his hands unasked.
 */
export function suggestFilaments(
  dominantHexes: readonly string[],
  filaments: readonly SuggestableFilament[],
  cap: number,
): string[] {
  const shelf = filaments.filter((f) => !f.soldOut);
  if (shelf.length === 0 || cap < 1) return [];

  const picked: string[] = [];
  const pickedHexes: string[] = [];

  for (const wanted of dominantHexes) {
    if (picked.length >= cap) break;

    let best: SuggestableFilament | null = null;
    let bestDistance = Infinity;
    for (const filament of shelf) {
      if (picked.includes(filament.id)) continue;
      const distance = perceptualDistance(wanted, filament.hex);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = filament;
      }
    }
    if (!best) break;

    const lum = relativeLuminance(best.hex);
    const collides = pickedHexes.some(
      (hex) => Math.abs(relativeLuminance(hex) - lum) < MIN_SEPARATION,
    );
    if (collides) continue;

    picked.push(best.id);
    pickedHexes.push(best.hex);
  }

  // Every picture gets at least one spool. An image whose colours all collapsed into
  // one luminance band still has to print in something.
  if (picked.length === 0 && shelf.length > 0) {
    let best = shelf[0];
    let bestDistance = Infinity;
    for (const filament of shelf) {
      const distance = perceptualDistance(dominantHexes[0] ?? "#000000", filament.hex);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = filament;
      }
    }
    picked.push(best.id);
  }

  return picked;
}

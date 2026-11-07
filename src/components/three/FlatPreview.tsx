"use client";

/**
 * src/components/three/FlatPreview.tsx
 *
 * Doc 05 §C.5 and `GENERATOR.fallback.noWebgl`. What the generator shows on a device
 * that cannot run WebGL at all.
 *
 * The catalog has a photograph to fall back to. The generator does not: the object was
 * invented ninety seconds ago and nobody has ever photographed it. So the fallback is
 * drawn from the same data the 3D preview would have used. The visitor's photo goes
 * through the identical luminance, levels and k-means band pipeline, and each band is
 * painted in the filament they picked.
 *
 * It is the honest picture of a multi-colour print: banded, flat, in their colours. It
 * loses the height, which is exactly what the copy beside it says it loses. The order
 * carries on with a live price, which is what the ladder is for.
 *
 * The geometry modules are imported at call time so this component costs nothing until
 * a device actually needs it.
 */

import * as React from "react";

import { GENERATOR } from "@/content/generator";
import type { FilamentChoice } from "@/lib/three/geometry/types";

import type { PreviewImageSource } from "./types";

export type FlatPreviewProps = {
  image: PreviewImageSource;
  filaments: FilamentChoice[];
  /** Lithophane is one colour, and the thickness is what draws the picture. */
  invertLuminance?: boolean;
  maxColors?: number;
  noteHe?: string;
  className?: string;
};

const GRID = 320;

export function FlatPreview({
  image,
  filaments,
  invertLuminance = false,
  maxColors = 4,
  noteHe,
  className,
}: FlatPreviewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [{ readImage }, heightmap, posterize, colorMapping] = await Promise.all([
          import("./readImage"),
          import("@/lib/three/geometry/heightmap"),
          import("@/lib/three/geometry/posterize"),
          import("@/lib/three/geometry/colorMapping"),
        ]);
        const { pixels, width, height } = await readImage(image, GRID);
        if (cancelled) return;

        const field = heightmap.buildHeightField(pixels, width, height, {
          invertLuminance,
          edgePreserve: !invertLuminance,
        });
        const chosen = colorMapping.sortByLuminance(filaments.slice(0, Math.max(1, maxColors)));
        const bands = posterize.bandEdges(field.histogram, chosen.length);

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const out = ctx.createImageData(width, height);
        const rgb = chosen.map((filament) => {
          const clean = filament.hex.replace("#", "");
          const full =
            clean.length === 3
              ? clean
                  .split("")
                  .map((c) => c + c)
                  .join("")
              : clean;
          const value = Number.parseInt(full, 16);
          return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
        });

        for (let i = 0; i < width * height; i += 1) {
          const band = chosen.length <= 1 ? 0 : posterize.bandOf(field.height[i], bands.edges);
          const colour = rgb[band] ?? rgb[0];
          out.data[i * 4] = colour[0];
          out.data[i * 4 + 1] = colour[1];
          out.data[i * 4 + 2] = colour[2];
          out.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(out, 0, 0);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [image, filaments, invertLuminance, maxColors]);

  return (
    <figure className={["m-0 flex flex-col gap-3 [min-inline-size:0]", className].filter(Boolean).join(" ")}>
      <div
        className="relative w-full overflow-hidden rounded-[var(--radius-xl)] [min-inline-size:0]"
        style={{ backgroundColor: "var(--color-cream-200)" }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="block w-full"
          style={{ height: "auto", imageRendering: "auto" }}
        />
      </div>
      <figcaption
        className="text-[0.8125rem] leading-6 [min-inline-size:0]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {failed ? GENERATOR.fallback.worker : (noteHe ?? GENERATOR.fallback.noWebgl)}
      </figcaption>
    </figure>
  );
}

"use client";

/**
 * src/components/generator/StepModel.tsx
 *
 * Step 5 · `דגם`. The build, the wait, and the thing the visitor can turn in their hand.
 *
 * ## What this step owns, and what it does not
 *
 * `src/components/three/PreviewStage.tsx` owns everything inside the canvas: the
 * kernel, the vertex ceiling, the camera, the gesture guard, the keyboard orbit, the
 * `role="group"` wrapper with its text alternative, the lights-off switch for glow,
 * the reset chrome, the flat fallback when the device has no usable WebGL, and the
 * lower-resolution escape hatch. None of that is duplicated here.
 *
 * This step owns the moment around it: the button that starts the build, the print-bed
 * animation that covers the wait, the backlight switch for a lithophane, and the
 * honesty block.
 *
 * ## The props this passes, and why
 *
 * ```
 * image        the photo, as the blob URL of the downscaled copy, or the Convex URL
 *              after a reload. `readImage` accepts a string, a Blob or a bitmap.
 * printType    the locked key. It selects the kernel.
 * geometry     `printTypes.geometry` from Convex, so a number Shai changes in the
 *              admin reaches the mesh without a deploy. Absent falls back to the
 *              seed row in `printTypeDefaults.ts`.
 * longEdgeMm   the chosen size's longest edge, which is what makes the preview the
 *              real size rather than a generic panel.
 * filaments    in the order they were picked; the kernel sorts them by luminance.
 * backlight    the lithophane's light plane, driven from the button below.
 * onBuilt      the mesh landed. It is what releases the wait state.
 * onBuildError the build failed, and the step offers a rebuild instead of a dead end.
 * ```
 *
 * ## The wait
 *
 * The floor is 2,200ms even when the mesh is ready sooner, because an instant result
 * reads as a stock picture rather than as something that was made. The ceiling is
 * 6,000ms, after which the stage is shown with whatever it has, since `PreviewStage`
 * carries its own skeleton and its own `לנסות ברזולוציה נמוכה יותר` from there.
 */

import * as React from "react";

import { PreviewStage } from "@/components/three";
import { Button } from "@/components/ui/Button";
import { GENERATOR } from "@/content/generator";
import { detectRenderMode } from "@/lib/three/capability";

import type { BuildOutput } from "@/lib/three/geometry/types";

import { BuildAnimation } from "./BuildAnimation";
import { useGeneratorData } from "./data";
import { MICROCOPY } from "./microcopy";
import { StepNote } from "./StepShell";
import type { FilamentInfo, PhotoState, PrintTypeInfo } from "./types";

export type BuildPhase = "idle" | "building" | "ready" | "failed";

/** Doc 05 PART D §D.2, and the four rotating lines in `GENERATOR.wait.lines`. */
export const MIN_WAIT_MS = 2200;
const MAX_WAIT_MS = 6000;

export type StepModelProps = {
  printType: PrintTypeInfo | null;
  photo: PhotoState;
  filaments: FilamentInfo[];
  longEdgeMm: number;
  phase: BuildPhase;
  onPhaseChange: (phase: BuildPhase) => void;
  onBuilt: () => void;
};

export function StepModel({
  printType,
  photo,
  filaments,
  longEdgeMm,
  phase,
  onPhaseChange,
  onBuilt,
}: StepModelProps) {
  const { uploadModel } = useGeneratorData();
  const [canRender3d, setCanRender3d] = React.useState<boolean | null>(null);
  const [meshReady, setMeshReady] = React.useState(false);
  const [backlight, setBacklight] = React.useState(false);
  const [honestyOpen, setHonestyOpen] = React.useState(false);
  const waited = React.useRef(false);
  /* A ref as well as state: the floor timer reads the value that is current when it
     fires rather than the one that existed when it was scheduled. */
  const meshReadyRef = React.useRef(false);

  React.useEffect(() => {
    setCanRender3d(detectRenderMode() === "3d");
  }, []);

  /**
   * The mesh leaves the browser the moment it exists.
   *
   * This is the step that turns the generator from a picture into an order: the file
   * Shai prints from is written here, out of the geometry the visitor is looking at,
   * and attached to the draft before he has touched the WhatsApp button. He can close
   * the tab on the price screen, and the order still carries a printable model.
   *
   * It runs off the main thread's critical path on purpose. The visitor's model is
   * already on screen; a few hundred kilobytes of STL uploading behind it is not
   * something he should ever wait for, and a failure is silent for the same reason.
   *
   * Keyed by the mesh itself, so the rebuild button does not upload the same geometry
   * twice and a genuinely new mesh always replaces the old one.
   */
  const uploadedKey = React.useRef<string | null>(null);
  const handleBuilt = React.useCallback(
    (output: BuildOutput) => {
      setMeshReady(true);

      const key = `${output.metrics.triangles}|${output.metrics.gridLong}|${output.metrics.estimatedGrams}`;
      if (uploadedKey.current === key) return;
      uploadedKey.current = key;

      void (async () => {
        try {
          const { toBinaryStl, toBinaryPly } = await import("@/lib/three/geometry/exportMesh");
          const shared = {
            triangles: output.metrics.triangles,
            boundingMm: output.metrics.boundingMm,
          };
          await uploadModel({ data: toBinaryStl(output.panel), format: "stl", ...shared });
          await uploadModel({ data: toBinaryPly(output.panel), format: "ply", ...shared });
        } catch {
          /* see the note above: the order is complete without the file */
        }
      })();
    },
    [uploadModel],
  );

  const finish = React.useCallback(() => {
    onPhaseChange("ready");
    onBuilt();
  }, [onPhaseChange, onBuilt]);

  /* The two timers that own the wait: the floor, and the ceiling. */
  React.useEffect(() => {
    if (phase !== "building") return;
    waited.current = false;

    const floor = window.setTimeout(() => {
      waited.current = true;
      if (meshReadyRef.current) finish();
    }, MIN_WAIT_MS);
    const ceiling = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.clearTimeout(floor);
      window.clearTimeout(ceiling);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  React.useEffect(() => {
    meshReadyRef.current = meshReady;
    if (phase === "building" && meshReady && waited.current) finish();
  }, [meshReady, phase, finish]);

  const photoUrl = photo.localUrl ?? photo.remoteUrl;
  const chosen = filaments.map((filament) => ({
    hex: filament.hex,
    nameHe: filament.nameHe,
  }));
  const backlit = printType?.key === "lithophane";

  function startBuild() {
    setMeshReady(false);
    meshReadyRef.current = false;
    onPhaseChange("building");
  }

  return (
    <div className="flex flex-col gap-4 [min-inline-size:0]">
      {phase === "idle" ? (
        <PhotoCard url={photoUrl} />
      ) : (
        <div className="relative [min-inline-size:0]">
          <PreviewStage
            image={photoUrl}
            printType={printType?.key ?? "relief"}
            geometry={printType?.geometry ?? null}
            reliefFactor={photo.analysis?.reliefFactor ?? 1}
            longEdgeMm={longEdgeMm}
            filaments={chosen}
            backlight={backlit && backlight}
            onBuilt={handleBuilt}
            onBuildError={() => onPhaseChange("failed")}
          />

          {/* Doc 05 §D.2: the handoff overlaps. The mesh is built underneath this,
              so there is no gap between the animation ending and the model arriving. */}
          {phase === "building" ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundColor: "var(--color-cream-100)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <BuildAnimation
                rows={photo.rows}
                hexes={chosen.map((filament) => filament.hex)}
                durationMs={MIN_WAIT_MS}
              />
            </div>
          ) : null}
        </div>
      )}

      {phase === "idle" ? (
        <>
          <Button
            variant="accent"
            size="lg"
            fullWidth
            disabled={photoUrl === null || chosen.length === 0}
            onClick={startBuild}
          >
            {GENERATOR.build.cta}
          </Button>
          <p style={{ fontSize: "0.8125rem", lineHeight: 1.6, color: "var(--color-text-muted)" }}>
            {GENERATOR.honesty.short}
          </p>
        </>
      ) : null}

      {phase === "ready" ? (
        <div className="flex flex-wrap items-center gap-2 [min-inline-size:0]">
          {backlit ? (
            <Button
              variant="play"
              size="sm"
              aria-pressed={backlight}
              onClick={() => setBacklight((value) => !value)}
            >
              {GENERATOR.preview.actions.backlight}
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" onClick={startBuild}>
            {GENERATOR.build.rebuild}
          </Button>
        </div>
      ) : null}

      {phase === "failed" ? (
        <StepNote
          tone="warning"
          actions={
            <Button variant="play" size="sm" onClick={startBuild}>
              {GENERATOR.build.rebuild}
            </Button>
          }
        >
          {GENERATOR.fallback.worker}
        </StepNote>
      ) : null}

      {canRender3d === false && phase !== "idle" ? (
        <StepNote tone="warning">{GENERATOR.fallback.noWebgl}</StepNote>
      ) : null}

      {printType?.key === "standee" && phase === "ready" ? (
        <StepNote tone="play">{GENERATOR.fallback.standee}</StepNote>
      ) : null}

      {/* The honesty block, 09c §6.9. `PreviewStage` prints the short line under the
          canvas itself, so this is the long form and it opens on request. */}
      <div className="flex flex-col gap-2 [min-inline-size:0]">
        <button
          type="button"
          aria-expanded={honestyOpen}
          onClick={() => setHonestyOpen((open) => !open)}
          className="self-start rounded-sm"
          style={{
            minBlockSize: "var(--spacing-tap)",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "var(--color-text-link)",
            textDecorationLine: "underline",
            textDecorationColor: "var(--color-turq-500)",
            textDecorationThickness: "2px",
            textUnderlineOffset: "4px",
          }}
        >
          {GENERATOR.honesty.heading}
        </button>

        <div className="g-disclosure" data-open={honestyOpen}>
          <div>
            <div
              className="flex flex-col gap-3 [min-inline-size:0]"
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "var(--color-text-secondary)",
              }}
            >
              <div className="flex flex-col gap-1.5 [min-inline-size:0]">
                {GENERATOR.honesty.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div
                className="flex flex-col gap-1.5 [min-inline-size:0]"
                style={{
                  borderInlineStartWidth: "3px",
                  borderInlineStartStyle: "solid",
                  borderInlineStartColor: "var(--color-turq-500)",
                  paddingInlineStart: "0.75rem",
                }}
              >
                {GENERATOR.honesty.texture.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 [min-inline-size:0]">
                {GENERATOR.honesty.maker.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The photo before the build. Deliberately the photograph itself and not a posterised
 * preview: the posterise is the reveal, and spending it before the visitor presses the
 * button is spending the only surprise this step has.
 */
function PhotoCard({ url }: { url: string | null }) {
  return (
    <div
      className="flex w-full items-center justify-center overflow-hidden [min-inline-size:0]"
      style={{
        aspectRatio: "1 / 1",
        borderRadius: "var(--radius-xl)",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: "var(--color-border-toy)",
        backgroundImage:
          "radial-gradient(circle at 50% 38%, var(--color-cream-50), var(--color-cream-200) 72%)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={MICROCOPY.photoAlt}
          className="block"
          style={{
            maxInlineSize: "78%",
            maxBlockSize: "78%",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-photo)",
            transform: "rotate(-2deg)",
          }}
        />
      ) : (
        <p style={{ fontSize: "0.9375rem", color: "var(--color-text-muted)" }}>
          {MICROCOPY.previewIdle}
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * src/components/three/PreviewStage.tsx
 *
 * The generator's preview, and the light half of it. The photo, the print type, the
 * material and the filament colours go in; a real mesh in the visitor's own colours,
 * at the real size, comes out.
 *
 * ## Where the work happens
 *
 * `panelKernel.ts` and `readImage.ts` are both `await import()`ed, so neither the
 * kernel nor three is in the bundle until the visitor reaches this step, and the
 * kernel download runs in parallel with the three chunk. The kernel itself imports no
 * three and is written to be moved into `heightmap.worker.ts` unchanged.
 *
 * ## The vertex ceiling
 *
 * `PREVIEW_VERTEX_CEILING` is 150,000 vertices for the whole build. `gridForDevice`
 * picks the starting rung of `GRID_LADDER` (320 on a desktop or an eight-core phone,
 * 256 by default, 224 on four cores or less), and `chooseGrid` walks it down until the
 * projected count fits. `lowerResolution()` below drops one more rung by hand, which
 * is the 15-second escape hatch in doc 05 §D.4, and 128 completes on anything.
 *
 * ## What re-runs, and what does not
 *
 * Doc 05 §B.5. A change of print type, photo or size is structural and shows the wait
 * state. A change of colour, order or finish keeps the previous mesh on screen and
 * swaps it when the new one is ready, with no wait state, because a wait state for a
 * colour swatch would kill the whole feature.
 *
 * [אריאל: כשה-worker נכנס, המסלול המהיר של שינוי צבע יכתוב מחדש רק את מאפיין הצבע]
 */

import dynamic from "next/dynamic";
import * as React from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { GENERATOR } from "@/content/generator";
import { DURATION, EASE } from "@/lib/design/motion";
import { markOrbited } from "@/lib/three/capability";
import { ORBIT, PREVIEW_VERTEX_CEILING, STAGE_3D } from "@/lib/three/constants";
import type { BuildOutput } from "@/lib/three/geometry/types";
import { applyReliefFactor, resolveKernelParams } from "@/lib/three/geometry/printTypeDefaults";

import { FlatPreview } from "./FlatPreview";
import { LightsOffToggle } from "./LightsOffToggle";
import { VIEWER_COPY } from "./copy";
import { ViewerChrome } from "./ViewerChrome";
import { ViewerSkeleton } from "./ViewerSkeleton";
import type { PreviewStageProps, QualityRung, ViewerHandle } from "./types";
import { useCanvasActive, useGestureGuard, useReducedMotion, useRenderMode } from "./useViewerShell";

const PreviewStageScene = dynamic(() => import("./PreviewStageScene"), {
  ssr: false,
  loading: () => null,
});

/** Three reads at most. Below 128 the ladder has nothing left to offer. */
const GRID_ATTEMPTS = 3;

export function PreviewStage({
  image,
  printType,
  geometry,
  reliefFactor = 1,
  longEdgeMm,
  filaments,
  accessory,
  finish,
  settings,
  build,
  onBuilt,
  onBuildError,
  backlight = false,
  className,
}: PreviewStageProps) {
  const { mode, setMode } = useRenderMode();
  const reducedMotion = useReducedMotion();

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const handleRef = React.useRef<ViewerHandle | null>(null);
  const controlsRef = React.useRef<OrbitControlsImpl | null>(null);
  const helpId = React.useId();

  const active = useCanvasActive(wrapperRef);
  const [quality, setQuality] = React.useState<QualityRung>(0);
  const [output, setOutput] = React.useState<BuildOutput | null>(build ?? null);
  const [building, setBuilding] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [lightsOff, setLightsOff] = React.useState(false);
  const [hintVisible, setHintVisible] = React.useState(true);
  const [keyboardHelp, setKeyboardHelp] = React.useState(false);
  const [gridOverride, setGridOverride] = React.useState<number | null>(null);

  const params = React.useMemo(
    () => applyReliefFactor(resolveKernelParams(printType, geometry ?? null), reliefFactor),
    [printType, geometry, reliefFactor],
  );
  const resolvedFinish = finish ?? params.defaultFinish;
  const hasGlow = resolvedFinish === "glow" || printType === "glow";
  const layerHeightMm = settings?.layerHeightMm ?? 0.2;

  /* --- the build ---------------------------------------------------------- */

  /**
   * A structural change rebuilds with the wait state. A cosmetic one rebuilds under
   * the visitor's finger and keeps the old mesh visible until the new one lands.
   */
  const structuralKey = `${printType}|${longEdgeMm}|${params.thicknessMaxMm}|${gridOverride ?? "auto"}`;
  const previousStructural = React.useRef<string | null>(null);
  const filamentKey = filaments.map((f) => `${f.hex}:${f.finish ?? ""}`).join(",");

  React.useEffect(() => {
    if (build) {
      setOutput(build);
      setBuilding(false);
    }
  }, [build]);

  React.useEffect(() => {
    if (build || !image || filaments.length === 0) return;

    const structural = previousStructural.current !== structuralKey;
    previousStructural.current = structuralKey;
    if (structural) setBuilding(true);

    let cancelled = false;

    void (async () => {
      try {
        const [kernel, reader] = await Promise.all([import("./panelKernel"), import("./readImage")]);
        if (cancelled) return;

        const request = kernel.makeBuildRequest({
          printType,
          geometry,
          longEdgeMm,
          filaments,
          accessory,
          finish,
          settings,
          gridLong: gridOverride ?? undefined,
        });

        const pocket = request.params.kernel === "panelPocket";
        // A cut-out builds only the cells inside the mask, a third of the frame on a
        // typical standing figure, so the same vertex budget buys it a finer grid. The
        // finer grid is what keeps the gap between two legs open.
        const standee = request.params.kernel === "panelStand";
        const ceiling = standee ? PREVIEW_VERTEX_CEILING * 2.5 : PREVIEW_VERTEX_CEILING;
        // A standee starts from a finer grid than the row asks for, whatever the row
        // says: the admin's number was sized for a full panel, and at 256 the gap
        // between a standing person's legs is three samples, which the outline
        // cleanup closes. The device ladder still caps it.
        const gridLong = standee ? Math.max(request.params.gridLong, 352) : request.params.gridLong;
        // The first read is at the device's rung. If the photo's aspect makes that
        // rung cost more than the ceiling allows, the read repeats one rung lower.
        let grid = kernel.chooseGrid(gridLong, 1, pocket, request.gridLong, ceiling);
        let source = await reader.readImage(image, grid);
        for (let attempt = 0; attempt < GRID_ATTEMPTS; attempt += 1) {
          if (kernel.projectVertexCount(source.width, source.height, pocket) <= ceiling) {
            break;
          }
          const next = kernel.chooseGrid(
            gridLong,
            source.width / source.height,
            pocket,
            grid,
            ceiling,
          );
          if (next >= grid) break;
          grid = next;
          source = await reader.readImage(image, grid);
        }
        if (cancelled) return;

        const input = {
          pixels: source.pixels,
          width: source.width,
          height: source.height,
          request,
        };

        /**
         * A standee is a cut-out of the subject standing on a base. Every type used to
         * resolve to a panel variant, so choosing `דמות עומדת למדף` and pressing build
         * returned a rectangular photo panel with a foot glued to it: the card promised
         * a figure and the geometry delivered a slab. `silhouetteKernel` was written to
         * fix exactly that and was never called from anywhere. This is the call.
         *
         * The fallback is deliberate. `buildForegroundMask` can fail to separate a
         * subject, and on a busy photograph it will. A panel is then the honest answer
         * rather than a refusal, because the visitor still gets a printable object out
         * of the picture he uploaded.
         */
        let result: BuildOutput;
        if (request.params.kernel === "panelStand") {
          const silhouette = await import("./silhouetteKernel");
          if (cancelled) return;
          try {
            result = silhouette.buildSilhouette(input);
          } catch (thrown) {
            const code =
              typeof thrown === "object" && thrown !== null && "code" in thrown
                ? String((thrown as { code: unknown }).code)
                : "";
            if (code !== "NO_SUBJECT") throw thrown;
            result = kernel.buildPanel(input);
          }
        } else {
          result = kernel.buildPanel(input);
        }
        if (cancelled) return;

        setOutput(result);
        setBuilding(false);
        onBuilt?.(result);
      } catch (error) {
        if (cancelled) return;
        setBuilding(false);
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "WORKER_FAILED";
        onBuildError?.(code, error instanceof Error ? error.message : String(error));
      }
    })();

    return () => {
      cancelled = true;
    };
    // `filamentKey` and `structuralKey` stand in for the objects they summarise, so a
    // parent that rebuilds its props array on every render does not rebuild the mesh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, structuralKey, filamentKey, resolvedFinish, accessory?.hex, build]);

  /** Doc 05 §D.4. Offered by hand after fifteen seconds, and it finishes on anything. */
  const lowerResolution = React.useCallback(() => setGridOverride(160), []);

  /**
   * A lost context gets a moment to come back before the stage gives up on it.
   *
   * `StageCanvas` calls `preventDefault` on the loss so the browser will fire
   * `webglcontextrestored`, and it usually does within a second: a backgrounded tab on
   * iOS, a driver hiccup, another tab taking the GPU. Demoting on the loss itself
   * unmounted the canvas, so the restore had nothing to land on and every hiccup
   * became a flat poster for the rest of the visit.
   */
  const lostTimer = React.useRef<number | null>(null);
  const handleContextLost = React.useCallback(() => {
    if (lostTimer.current !== null) return;
    lostTimer.current = window.setTimeout(() => {
      lostTimer.current = null;
      setMode("poster");
    }, 2500);
  }, [setMode]);
  const handleContextRestored = React.useCallback(() => {
    if (lostTimer.current !== null) {
      window.clearTimeout(lostTimer.current);
      lostTimer.current = null;
    }
    setMode("3d");
  }, [setMode]);
  React.useEffect(
    () => () => {
      if (lostTimer.current !== null) window.clearTimeout(lostTimer.current);
    },
    [],
  );

  /* --- gestures and keys --------------------------------------------------- */

  const is3d = mode === "3d" && quality < 4;
  const controls = React.useCallback(() => controlsRef.current, []);

  useGestureGuard({
    wrapperRef,
    controls,
    enabled: is3d && Boolean(output),
    onFirstInput: () => setHintVisible(false),
    onDoubleTap: () => handleRef.current?.reset(),
  });

  const onQualityRung = React.useCallback((rung: QualityRung) => {
    setQuality((current) => (rung > current ? rung : current));
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const handle = handleRef.current;
    if (!handle) return;
    const step = ORBIT.keyOrbitStep;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        handle.orbit(-step, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        handle.orbit(step, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        handle.orbit(0, -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        handle.orbit(0, step);
        break;
      case "+":
      case "=":
        event.preventDefault();
        handle.dolly(1 - ORBIT.keyDollyStep);
        break;
      case "-":
      case "_":
        event.preventDefault();
        handle.dolly(1 + ORBIT.keyDollyStep);
        break;
      case "Home":
        event.preventDefault();
        handle.reset();
        break;
      default:
        return;
    }
    setHintVisible(false);
    markOrbited();
  };

  /* --- the render ---------------------------------------------------------- */

  const hint = printType === "magnet" ? GENERATOR.preview.magnetHint : GENERATOR.preview.dragHint;
  const backlit = params.backlit;

  if (mode !== null && !is3d && image) {
    return (
      <div className={["[min-inline-size:0]", className].filter(Boolean).join(" ")}>
        <div className="px-6 md:px-0">
          <FlatPreview
            image={image}
            filaments={filaments}
            invertLuminance={params.invertLuminance}
            maxColors={params.maxFilamentColors}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={["[min-inline-size:0]", className].filter(Boolean).join(" ")}>
      {/* Doc 05 §A.7. The cream margin on both sides is the page's scroll strip. */}
      <div className="px-6 md:px-0">
        <div
          ref={wrapperRef}
          role="group"
          tabIndex={0}
          aria-label={VIEWER_COPY.groupLabel}
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
          onFocus={(event) => setKeyboardHelp(event.currentTarget.matches(":focus-visible"))}
          onBlur={() => setKeyboardHelp(false)}
          className="relative w-full overflow-hidden rounded-[var(--radius-xl)] [min-inline-size:0]"
          data-motion="state"
          style={{
            aspectRatio: "1 / 1",
            // Doc 05 §B.3.3, t=0: the card goes dark with the scene, in CSS, so the
            // room dims rather than the object merely brightening.
            background: lightsOff ? STAGE_3D.haloDark : STAGE_3D.haloLight,
            transition: `background ${reducedMotion ? 120 : DURATION.d6}ms ${EASE.outSoft}`,
          }}
        >
          {output && mode === "3d" ? (
            <PreviewStageScene
              panel={output.panel}
              backlit={backlit}
              backlightOn={backlit && backlight}
              lightsOff={lightsOff}
              hasGlow={hasGlow}
              finish={resolvedFinish}
              layerHeightMm={layerHeightMm}
              openPoles={printType === "magnet"}
              handleRef={handleRef}
              controlsRef={controlsRef}
              active={active}
              quality={quality}
              reducedMotion={reducedMotion}
              onQualityRung={onQualityRung}
              onReady={() => setReady(true)}
              onContextLost={handleContextLost}
              onContextRestored={handleContextRestored}
            />
          ) : null}

          {building || !output ? (
            <div className="absolute inset-0 grid place-items-center">
              <ViewerSkeleton label={GENERATOR.wait.aria} />
            </div>
          ) : null}

          <ViewerChrome
            handleRef={handleRef}
            ready={ready && Boolean(output)}
            hintHe={hint}
            showHint={hintVisible && Boolean(output) && !building}
            resetLabel={GENERATOR.preview.actions.reset}
            showKeyboardHelp={keyboardHelp}
            tone={lightsOff ? "onStage" : "onCream"}
          >
            {hasGlow && output ? (
              <LightsOffToggle lightsOff={lightsOff} onChange={setLightsOff} />
            ) : null}
          </ViewerChrome>
        </div>

        <p id={helpId} className="sr-only">
          {`${VIEWER_COPY.textAlternative} ${VIEWER_COPY.keyboardHelp}`}
        </p>

        {/* Doc 05 §C.1. The short honesty line sits under the canvas in every state. */}
        <p
          className="mt-3 text-[0.8125rem] leading-6 [min-inline-size:0]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {GENERATOR.honesty.short}
        </p>

        {building ? (
          <button
            type="button"
            onClick={lowerResolution}
            className="mt-2 rounded-full px-3 py-2 text-[0.8125rem] font-semibold"
            style={{
              border: "2px solid var(--color-play-border)",
              color: "var(--color-turq-800)",
              backgroundColor: "var(--color-play-soft)",
            }}
          >
            {GENERATOR.build.lowRes}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default PreviewStage;

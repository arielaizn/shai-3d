"use client";

/**
 * src/components/three/ModelViewer.tsx
 *
 * The catalog viewer's public entry, and the light half of it. Nothing this module
 * imports pulls in three, drei or the geometry kernels: the scene arrives through
 * `next/dynamic` with `ssr: false`, so a visitor who only reads the home page never
 * downloads a byte of it.
 *
 * ## The fallback ladder, implemented here
 *
 *   `3d`         the canvas below
 *   `turntable`  a 24-frame sprite sheet, dragged or arrow-keyed
 *   `poster`     one still, with a button that upgrades to the turntable
 *
 * The rung is chosen once per session by `capability.ts`, forced by `?render=`, and
 * stepped down without a word to the visitor when the WebGL context is lost, when the
 * model refuses to load, when it is past the 400,000 triangle hard budget, or when the
 * quality ladder bottoms out at rung 4. Every rung keeps the page orderable with a
 * live price, which is the entire point: a viewer showing a black box costs a lead.
 *
 * ## Layout
 *
 * Doc 05 §A.7 makes one layout demand and it is not negotiable: the canvas is never
 * full bleed on a phone. It sits inside 24px of cream on both sides so there is always
 * a strip of page to start a scroll from, whatever the gesture guard decides.
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import * as React from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { PRODUCT } from "@/content/products";
import { markOrbited } from "@/lib/three/capability";
import { ORBIT, STAGE_3D } from "@/lib/three/constants";
import { DURATION, EASE } from "@/lib/design/motion";

import { VIEWER_COPY, fill } from "./copy";
import { ViewerChrome } from "./ViewerChrome";
import { ViewerFallback } from "./ViewerFallback";
import { ViewerSkeleton } from "./ViewerSkeleton";
import type { ModelViewerProps, QualityRung, ViewerHandle } from "./types";
import { useCanvasActive, useGestureGuard, useReducedMotion, useRenderMode } from "./useViewerShell";

const ModelViewerScene = dynamic(() => import("./ModelViewerScene"), {
  ssr: false,
  loading: () => null,
});

export function ModelViewer({
  src,
  posterSrc,
  altHe,
  nameHe,
  spriteSrc,
  spriteColumns,
  spriteRows,
  finish = "matte",
  layerHeightMm = 0.2,
  hintKey = "drag",
  className,
}: ModelViewerProps) {
  const { mode, setMode } = useRenderMode();
  const reducedMotion = useReducedMotion();

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const handleRef = React.useRef<ViewerHandle | null>(null);
  const controlsRef = React.useRef<OrbitControlsImpl | null>(null);
  const helpId = React.useId();

  const active = useCanvasActive(wrapperRef);
  const [quality, setQuality] = React.useState<QualityRung>(0);
  const [loaded, setLoaded] = React.useState(false);
  const [hintVisible, setHintVisible] = React.useState(true);
  const [keyboardHelp, setKeyboardHelp] = React.useState(false);
  /**
   * Why the viewer is on a lower rung, which decides what the visitor is told.
   * `capability` gets the honest device line, `failed` gets the load line, and `perf`
   * gets nothing at all: doc 05 §A.8 is explicit that the quality ladder's last step
   * is a silent crossfade. Telling somebody their phone is slow helps nobody.
   */
  const [reason, setReason] = React.useState<"capability" | "failed" | "perf">("capability");

  const is3d = mode === "3d" && quality < 4;

  const controls = React.useCallback(() => controlsRef.current, []);

  useGestureGuard({
    wrapperRef,
    controls,
    enabled: is3d,
    onFirstInput: () => setHintVisible(false),
    onDoubleTap: () => handleRef.current?.reset(),
  });

  const onQualityRung = React.useCallback((rung: QualityRung) => {
    setQuality((current) => {
      if (rung <= current) return current;
      if (rung >= 4) setReason("perf");
      return rung;
    });
  }, []);

  const onFailed = React.useCallback(() => {
    // Doc 05 §A.6. No dialog, no reload prompt. The turntable simply appears where the
    // 3D was, the price is unchanged, and the WhatsApp button is unchanged.
    setReason("failed");
    setMode(spriteSrc ? "turntable" : "poster");
  }, [setMode, spriteSrc]);

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
    // A keyboard orbit is an orbit. The card has earned the gesture for this session.
    markOrbited();
  };

  const label = nameHe ? fill(VIEWER_COPY.groupLabelNamed, { name: nameHe }) : VIEWER_COPY.groupLabel;
  const alternative = nameHe
    ? fill(VIEWER_COPY.textAlternativeNamed, { name: nameHe })
    : VIEWER_COPY.textAlternative;
  const hint = hintKey === "magnet" ? PRODUCT.viewer.magnetHint : PRODUCT.viewer.dragHint;

  if (mode !== null && !is3d) {
    return (
      <div className={["[min-inline-size:0]", className].filter(Boolean).join(" ")}>
        <div className="px-6 md:px-0">
          <ViewerFallback
            mode={mode === "turntable" && spriteSrc ? "turntable" : "poster"}
            posterSrc={posterSrc}
            altHe={altHe}
            nameHe={nameHe}
            spriteSrc={spriteSrc}
            spriteColumns={spriteColumns}
            spriteRows={spriteRows}
            noteHe={
              reason === "perf"
                ? undefined
                : reason === "failed"
                  ? PRODUCT.viewer.loadFailed
                  : PRODUCT.viewer.noWebgl
            }
            onUpgrade={spriteSrc && mode === "poster" ? () => setMode("turntable") : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={["[min-inline-size:0]", className].filter(Boolean).join(" ")}>
      {/* Doc 05 §A.7. The cream margin is the scroll strip. */}
      <div className="px-6 md:px-0">
        <div
          ref={wrapperRef}
          role="group"
          tabIndex={0}
          aria-label={label}
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
          onFocus={(event) => setKeyboardHelp(event.currentTarget.matches(":focus-visible"))}
          onBlur={() => setKeyboardHelp(false)}
          className="relative w-full overflow-hidden rounded-[var(--radius-xl)] [min-inline-size:0]"
          style={{
            aspectRatio: "1 / 1",
            background: STAGE_3D.haloLight,
          }}
        >
          {mode === "3d" ? (
            <ModelViewerScene
              src={src}
              finish={finish}
              layerHeightMm={layerHeightMm}
              handleRef={handleRef}
              controlsRef={controlsRef}
              active={active}
              quality={quality}
              reducedMotion={reducedMotion}
              autoRotate={!reducedMotion}
              openPoles={hintKey === "magnet"}
              onQualityRung={onQualityRung}
              onLoaded={() => setLoaded(true)}
              onFailed={onFailed}
              onContextLost={() => {
                setReason("failed");
                setMode(spriteSrc ? "turntable" : "poster");
              }}
              onContextRestored={() => setMode("3d")}
            />
          ) : null}

          {/*
            Doc 05 §A.6. The poster is already in the HTTP cache because it was the
            catalog thumbnail, so it paints instantly and the canvas fades in over it.
            There is never a frame of empty cream.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            data-motion="state"
            style={{
              opacity: loaded ? 0 : 1,
              filter: "saturate(0.85)",
              transition: `opacity ${DURATION.d3}ms ${EASE.outSoft} ${loaded ? "60ms" : "0ms"}`,
            }}
          >
            <Image
              src={posterSrc}
              alt=""
              fill
              sizes="(max-width: 767px) 92vw, 560px"
              style={{ objectFit: "contain" }}
              priority={false}
            />
            {!loaded ? (
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <ViewerSkeleton size="sm" label={PRODUCT.viewer.loading} />
              </div>
            ) : null}
          </div>

          <ViewerChrome
            handleRef={handleRef}
            ready={loaded}
            hintHe={hint}
            showHint={hintVisible && loaded}
            resetLabel={PRODUCT.viewer.reset}
            showKeyboardHelp={keyboardHelp}
          />
        </div>

        <p id={helpId} className="sr-only">
          {`${alternative} ${VIEWER_COPY.keyboardHelp}`}
        </p>
      </div>
    </div>
  );
}

export default ModelViewer;

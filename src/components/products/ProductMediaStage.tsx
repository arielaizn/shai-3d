"use client";

import * as React from "react";
import Image from "next/image";

import { ModelViewer } from "@/components/three";
import { DURATION, EASE } from "@/lib/design/motion";

import { ProductThumbRail, VIEWER_TAB } from "./ProductThumbRail";
import type { ProductDetail } from "./model";

/**
 * The media column, doc 03 §5.2 to §5.4. It owns which media is active and nothing else.
 *
 * **The 3D viewer is the primary media**, and it is the first thing in the column
 * whenever a `.glb` is attached. That is the whole promise of the site: an object you
 * can turn before you have paid anything, made by someone you have not met.
 *
 * `ModelViewer` owns everything below the surface here: the capability check, the
 * fallback ladder down to a turntable and then a poster, the gesture guard that keeps
 * a one-finger drag on a phone from stealing the page scroll, the keyboard model, the
 * `role="group"` wrapper with the `<canvas>` hidden from the tree and a sibling text
 * alternative. This component passes it a `src`, a poster and Hebrew alt text and gets
 * out of the way.
 *
 * **Both layers stay mounted and cross-fade.** Unmounting the viewer to show a photo
 * would tear down the WebGL context and rebuild it on the way back, which costs a
 * second of black on a mid-range Android. So the inactive layer is taken out of flow,
 * hidden from the accessibility tree and made `inert`, and only its opacity moves.
 * `DURATION.d4` is the ladder's canvas cross-fade step.
 *
 * When there is no model the viewer never mounts, the rail drops its 3D thumb, and the
 * stage is a photograph. Doc 03 §5.4: the promise made in the grid is always kept, in
 * both directions.
 */

export type ProductMediaStageProps = {
  product: ProductDetail;
  /** The chosen filament's finish, so a glow print gets the glow treatment. */
  glow?: boolean;
};

export function ProductMediaStage({ product, glow = false }: ProductMediaStageProps) {
  const panelId = React.useId();
  const images = product.images;
  const poster = product.heroImageUrl ?? images[0]?.url;
  const hasViewer = Boolean(product.modelUrl && poster);

  const [active, setActive] = React.useState<string>(hasViewer ? VIEWER_TAB : "0");
  const showViewer = hasViewer && active === VIEWER_TAB;

  const photoIndex = active === VIEWER_TAB ? 0 : Number(active);
  const photo = images[photoIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-4 [min-inline-size:0]">
      <div id={panelId} className="relative [min-inline-size:0]">
        {hasViewer && poster && product.modelUrl ? (
          <Layer active={showViewer}>
            <ModelViewer
              src={product.modelUrl}
              posterSrc={poster}
              altHe={product.heroAltHe || product.titleHe}
              nameHe={product.titleHe}
              finish={glow ? "glow" : undefined}
            />
          </Layer>
        ) : null}

        <Layer active={!showViewer}>
          {/* the same 24px cream strip the viewer keeps, so the two layers are the
              same size and the cross-fade does not resize the column */}
          <div className="px-6 md:px-0">
            <div
              className="relative w-full overflow-hidden [min-inline-size:0]"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: "var(--radius-xl)",
                backgroundColor: "var(--color-cream-100)",
              }}
            >
              {photo ? (
                <Image
                  src={photo.url}
                  alt={photo.altHe || product.titleHe}
                  fill
                  sizes="(max-width: 767px) 92vw, 560px"
                  priority
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>
          </div>
        </Layer>
      </div>

      <div className="px-6 md:px-0 [min-inline-size:0]">
        <ProductThumbRail
          images={images}
          value={active}
          onChange={setActive}
          hasViewer={hasViewer}
          panelId={panelId}
        />
      </div>
    </div>
  );
}

/**
 * The active layer is in flow and gives the stage its height; the inactive one is
 * absolutely positioned over it, `inert`, and hidden from the accessibility tree, so
 * nothing behind the fade can be tabbed into or read out.
 */
function Layer({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={active ? undefined : true}
      inert={!active}
      className={active ? "relative [min-inline-size:0]" : "pointer-events-none absolute inset-0 [min-inline-size:0]"}
      style={{
        opacity: active ? 1 : 0,
        transition: `opacity ${DURATION.d4}ms ${EASE.outSoft}`,
      }}
    >
      {children}
    </div>
  );
}

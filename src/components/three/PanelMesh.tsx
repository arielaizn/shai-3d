"use client";

/**
 * src/components/three/PanelMesh.tsx
 *
 * Doc 05 §B.1 stage 3 tail, §B.3.1 and §B.3.3. The buffers the kernel produced become
 * one geometry, one material, one draw call, and the glow-in-the-dark ramp runs on it.
 *
 * ## One material, four colours
 *
 * The filament colour is a per-vertex attribute and the finish is a second one
 * (`aFinish`: 0 matte, 1 silk, 2 glow), which is why a four-colour piece with a silk
 * accent is still a single draw call. Splitting by material would mean up to twelve
 * draw calls on a phone for what is physically one printed object.
 *
 * ## Main-thread cost
 *
 * Nothing here loops over vertices. The kernel already computed the bounding sphere,
 * so `computeBoundingSphere` is never called and the whole upload is a handful of
 * `BufferAttribute` constructions.
 */

import { useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { GITD, LITHO_BACKLIGHT_HEX, STAGE_3D, type Finish } from "@/lib/three/constants";
import type { PanelResult } from "@/lib/three/geometry/types";
import {
  filamentColor,
  patchBacklight,
  patchLayerLines,
  patchVertexFinish,
  setBacklightStrength,
  setGlowMix,
} from "@/lib/three/printedMaterial";

import type { QualityRung } from "./types";

export type PanelMeshProps = {
  panel: PanelResult;
  /** Lithophane only. Turns on the Beer-Lambert term and the light plane behind it. */
  backlit: boolean;
  backlightOn: boolean;
  /** True once the visitor flips the switch. Drives the whole ramp below. */
  lightsOff: boolean;
  /** Only the glow print type has anything to charge. */
  hasGlow: boolean;
  reducedMotion: boolean;
  finish: Finish;
  layerHeightMm: number;
  quality: QualityRung;
  /** Written every frame so `StudioRig` can dim without a React render. */
  lightScaleRef: React.RefObject<number>;
};

/* --------------------------------------------------------------- the halo */

/**
 * Doc 05 §B.3.3. Bloom without a post-processing pass: one billboarded sprite behind
 * the mesh, additive, `depthWrite: false`. The `postprocessing` package would add
 * about 48KB and a second render target to produce a soft radial falloff, which is
 * most of what bloom around a glowing object actually is.
 */
function haloTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const glow = new THREE.Color().setStyle(GITD.emissiveHex, THREE.SRGBColorSpace);
  const r = Math.round(glow.r * 255);
  const g = Math.round(glow.g * 255);
  const b = Math.round(glow.b * 255);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const distance = Math.min(1, Math.hypot(dx, dy) * 2);
      const alpha = Math.pow(1 - distance, 2.4);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

/* ------------------------------------------------------------ the component */

export function PanelMesh({
  panel,
  backlit,
  backlightOn,
  lightsOff,
  hasGlow,
  reducedMotion,
  finish,
  layerHeightMm,
  quality,
  lightScaleRef,
}: PanelMeshProps) {
  const invalidate = useThree((state) => state.invalidate);

  const geometry = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(panel.position, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(panel.normal, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(panel.uv, 2));
    g.setAttribute("color", new THREE.BufferAttribute(panel.color, 3));
    g.setAttribute("aThickness", new THREE.BufferAttribute(panel.thickness, 1));
    g.setAttribute("aFinish", new THREE.BufferAttribute(panel.finish, 1));
    g.setIndex(new THREE.BufferAttribute(panel.index, 1));
    // Precomputed in the kernel. Walking 130,000 vertices again to save a few percent
    // of framing accuracy would cost more than it returns.
    g.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(panel.center[0], panel.center[1], panel.center[2]),
      panel.radius,
    );
    return g;
  }, [panel]);

  const material = React.useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0,
      side: THREE.FrontSide,
      // A matte print under a big soft key is exactly the wide low-contrast gradient
      // that bands on a phone panel. Dithering costs nothing and removes it.
      dithering: true,
    });
    patchVertexFinish(m);
    // Rung 3 of the quality ladder zeroes the layer lines, which skips the `fwidth`
    // branch in the fragment shader. It is the last thing to go before the canvas.
    if (quality < 3) {
      patchLayerLines(m, { layerHeightCm: layerHeightMm / 10, upAxis: "z", strength: 0.055 });
    }
    if (backlit) {
      patchBacklight(m, { colorHex: LITHO_BACKLIGHT_HEX, strength: 0 });
    }
    if (finish === "glow") m.emissive = filamentColor(GITD.emissiveHex);
    return m;
  }, [backlit, finish, layerHeightMm, quality]);

  const texture = React.useMemo(haloTexture, []);
  const halo = React.useRef<THREE.Sprite>(null);

  React.useEffect(() => () => geometry.dispose(), [geometry]);
  React.useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);
  React.useEffect(() => () => texture.dispose(), [texture]);

  /* --- the lithophane switch, which is one uniform and no rebuild ---------- */

  React.useEffect(() => {
    if (!backlit) return;
    setBacklightStrength(material, backlightOn ? 1 : 0);
    invalidate();
  }, [backlit, backlightOn, material, invalidate]);

  /* --- the lights-off ramp ------------------------------------------------- */

  const flippedAt = React.useRef<number | null>(null);
  const previous = React.useRef(lightsOff);

  React.useEffect(() => {
    if (previous.current === lightsOff) return;
    previous.current = lightsOff;
    flippedAt.current = performance.now();
    invalidate();
  }, [lightsOff, invalidate]);

  React.useEffect(() => {
    // The resting state, applied whenever the switch is not mid-ramp.
    if (flippedAt.current !== null) return;
    const scale = lightsOff ? GITD.darkLightScale : 1;
    lightScaleRef.current = scale;
    setGlowMix(material, hasGlow && lightsOff ? GITD.emissiveLightsOff : GITD.emissiveLightsOn);
    if (halo.current) halo.current.material.opacity = hasGlow && lightsOff ? GITD.haloOpacity : 0;
    invalidate();
  }, [lightsOff, hasGlow, material, lightScaleRef, invalidate]);

  useFrame(() => {
    const start = flippedAt.current;
    if (start === null) return;
    const total = reducedMotion ? 120 : GITD.timing.total;
    const elapsed = performance.now() - start;
    const t = Math.min(1, elapsed / total);
    const eased = 1 - Math.pow(1 - t, 3);

    // Every light drops together with the card background, which is what makes the
    // room go dark rather than the object go bright.
    lightScaleRef.current = lightsOff
      ? 1 + (GITD.darkLightScale - 1) * eased
      : GITD.darkLightScale + (1 - GITD.darkLightScale) * eased;

    let emissive = GITD.emissiveLightsOn;
    let haloOpacity = 0;
    if (hasGlow) {
      if (!lightsOff) {
        emissive = GITD.emissiveLightsOff + (GITD.emissiveLightsOn - GITD.emissiveLightsOff) * eased;
        haloOpacity = GITD.haloOpacity * (1 - eased);
      } else if (reducedMotion) {
        emissive = GITD.emissiveLightsOn + (GITD.emissiveLightsOff - GITD.emissiveLightsOn) * eased;
        haloOpacity = GITD.haloOpacity * eased;
      } else if (elapsed < GITD.timing.emissiveDelay) {
        emissive = GITD.emissiveLightsOn;
      } else if (elapsed < GITD.timing.settleAt) {
        // The charge: it overshoots on the way up, the way a real one flares.
        const charge =
          (elapsed - GITD.timing.emissiveDelay) /
          (GITD.timing.settleAt - GITD.timing.emissiveDelay);
        emissive = GITD.emissiveLightsOn + (GITD.overshoot - GITD.emissiveLightsOn) * charge;
        haloOpacity = GITD.haloOpacity * charge;
      } else {
        const settle = Math.min(
          1,
          (elapsed - GITD.timing.settleAt) / (GITD.timing.total - GITD.timing.settleAt),
        );
        emissive = GITD.overshoot + (GITD.emissiveLightsOff - GITD.overshoot) * settle;
        haloOpacity = GITD.haloOpacity;
      }
    }

    setGlowMix(material, emissive);
    if (halo.current) halo.current.material.opacity = haloOpacity;

    if (elapsed >= total) flippedAt.current = null;
    invalidate();
  });

  const haloScale = Math.max(1, panel.radius * GITD.haloScale);

  return (
    <group>
      <mesh geometry={geometry} material={material} frustumCulled />

      {hasGlow ? (
        <sprite ref={halo} position={[panel.center[0], panel.center[1], -0.4]} scale={[haloScale, haloScale, 1]}>
          <spriteMaterial
            map={texture}
            color={STAGE_3D.glow}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ) : null}

      {/* Doc 05 §B.3.1. The lit sheet behind a lithophane, which is what the visitor
          is really buying. It is unlit and tone-mapped out so it reads as a source. */}
      {backlit ? (
        <mesh position={[panel.center[0], panel.center[1], -0.25]}>
          <planeGeometry args={[panel.radius * 2.2, panel.radius * 2.2]} />
          <meshBasicMaterial
            color={LITHO_BACKLIGHT_HEX}
            transparent
            opacity={backlightOn ? 0.92 : 0}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}
